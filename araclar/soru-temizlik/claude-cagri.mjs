// Claude Messages API — soru temizlik/üretim betikleri için ortak çağrı katmanı (yeni paket yok, düz fetch).
// Kalıp: sik-ipucu-api.mjs › claudeCagir (o dosya değiştirilmedi). Model başına jeton/harcama tutar.
// Anahtar: .env.local › ANTHROPIC_API_KEY (hiçbir yere yazdırılmaz/loglanmaz).
import fs from 'node:fs';
import path from 'node:path';
import { KOK } from '../soru_denetim/ortak.mjs';

// $ / 1M jeton — claude-api becerisindeki tablo (6 Eki 2026).
export const FIYAT = {
  'claude-sonnet-5-5': { girdi: 2, cikti: 10 },
  'claude-opus-5-5': { girdi: 4, cikti: 20 },
};

export function anahtarOku() {
  const dosya = path.join(KOK, '.env.local');
  if (!fs.existsSync(dosya)) return null;
  const satir = fs.readFileSync(dosya, 'utf8').split(/\r?\n/).find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  return satir?.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^["']|["']$/g, '') || null;
}

/** Model başına {girdi, cikti, cagri}; önceki koşudan devam için dışarıdan doldurulabilir. */
export const harcama = {};
export const apiUsd = () => Object.entries(harcama).reduce((t, [m, h]) => {
  const f = FIYAT[m];
  if (!f) throw new Error(`Fiyat tablosunda yok: ${m}`);
  return t + (h.girdi / 1e6) * f.girdi + (h.cikti / 1e6) * f.cikti;
}, 0);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Tek Messages API çağrısı (yapılandırılmış JSON çıktı); 429/5xx/ağ hatasında en çok 3 deneme.
 * @param {string} anahtar
 * @param {{model:string, sistem:string, sema:object, istem:string, maxJeton?:number, effort?:string}} p
 * @returns {Promise<object>} ayrıştırılmış JSON
 * 401/403 → e.kritik = true (çağıran durmalı).
 */
export async function claudeCagir(anahtar, { model, sistem, sema, istem, maxJeton = 8000, effort = 'medium' }) {
  if (!FIYAT[model]) throw new Error(`Bilinmeyen model: ${model}`);
  let sonHata;
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const yanit = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: maxJeton,
          system: sistem,
          output_config: { effort, format: { type: 'json_schema', schema: sema } },
          messages: [{ role: 'user', content: istem }],
        }),
        signal: AbortSignal.timeout(240000),
      });
      if (yanit.ok) {
        const g = await yanit.json();
        const h = (harcama[model] ??= { girdi: 0, cikti: 0, cagri: 0 });
        h.girdi += (g.usage?.input_tokens ?? 0) + (g.usage?.cache_creation_input_tokens ?? 0) + (g.usage?.cache_read_input_tokens ?? 0);
        h.cikti += g.usage?.output_tokens ?? 0;
        h.cagri += 1;
        if (g.stop_reason === 'refusal') throw Object.assign(new Error('Claude reddetti (refusal)'), { kalici: true });
        if (g.stop_reason === 'max_tokens') throw Object.assign(new Error('max_tokens sınırına takıldı'), { kalici: true });
        const metin = g.content?.find((b) => b.type === 'text')?.text;
        if (!metin) throw Object.assign(new Error(`Metin bloğu yok (stop_reason=${g.stop_reason})`), { kalici: true });
        return JSON.parse(metin);
      }
      const govde = (await yanit.text()).slice(0, 300).replace(anahtar, '***');
      sonHata = new Error(`Claude HTTP ${yanit.status}: ${govde}`);
      if (yanit.status === 401 || yanit.status === 403) { sonHata.kritik = true; throw sonHata; }
      if (yanit.status !== 429 && yanit.status < 500) { sonHata.kalici = true; throw sonHata; }
      const ra = Number(yanit.headers.get('retry-after'));
      if (deneme < 2) await bekle(ra > 0 ? ra * 1000 : 1000 * 2 ** deneme);
    } catch (e) {
      if (e.kritik || e.kalici) throw e;
      sonHata = e;
      if (deneme < 2) await bekle(1000 * 2 ** deneme);
    }
  }
  throw sonHata ?? new Error('Claude çağrısı başarısız');
}

/** Eşzamanlılık sınırlı havuz: ogeler üzerinde fn'i en çok n paralel çalıştırır. */
export async function havuz(ogeler, n, fn) {
  let sira = 0;
  await Promise.all(Array.from({ length: Math.min(n, ogeler.length) }, async () => {
    while (sira < ogeler.length) await fn(ogeler[sira++]);
  }));
}
