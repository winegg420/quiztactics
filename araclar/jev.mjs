// Jev (TypeSafe AI "System One") istemcisi — yalnız Node'un kendi modülleriyle.
//
// Neden var: bu depoda YENİ NPM PAKETİ KURULMAZ (kök CLAUDE.md), bu yüzden
// resmi `@typesafe-ai/sdk` paketi kurulmadı; dokümandaki REST biçimi
// (POST https://api.typesafe.ai/v1/systemone) doğrudan `fetch` ile çağrılıyor.
//
// Jev bir dil modeli DEĞİLDİR: metin üretmez. Bir `state` (veri) ve tipli
// sorular verilir; her soruya tipli bir cevap + güven olasılığı döner.
// Üç soru tipi: noul (evet/hayır), choice (listeden seçim), score (ölçek).
//
// Anahtar: .env içindeki TYPESAFE_API_KEY. Hiçbir yere yazdırılmaz.

import fs from 'node:fs';

const UCNOKTA = 'https://api.typesafe.ai/v1/systemone';
const VARSAYILAN_MODEL = 'jev-latest';

/** .env dosyasını okur (yalnız TYPESAFE_API_KEY için; başka yere yazılmaz). */
function anahtarOku() {
  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY.trim();
  try {
    const url = new URL('../.env', import.meta.url);
    const metin = fs.readFileSync(url, 'utf8');
    const eslesme = metin.match(/^\s*TYPESAFE_API_KEY\s*=\s*(.*)$/m);
    const deger = eslesme?.[1]?.trim().replace(/^["']|["']$/g, '');
    return deger || null;
  } catch {
    return null;
  }
}

/** Tipli soru kurucuları — dokümandaki Question biçimini üretir. */
export function noul(instructions, criteria) {
  return criteria ? { type: 'noul', instructions, criteria } : { type: 'noul', instructions };
}
export function choice(instructions, criteria) {
  return { type: 'choice', instructions, criteria };
}
export function score(instructions, criteria) {
  return { type: 'score', instructions, criteria };
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Jev'e tek çağrı: bir `state` ve tipli soru haritası gönderir.
 *
 * @param {string|object|Array} state      Değerlendirilecek veri.
 * @param {Record<string,object>} questions Tipli sorular (anahtarları sen seçersin).
 * @param {object} [sec]                    { model, zamanAsimiMs, deneme, anahtar }
 * @returns {Promise<{answers:object, model:string, usage:object, sureMs:number}>}
 */
export async function jevSor(state, questions, sec = {}) {
  const model = sec.model || VARSAYILAN_MODEL;
  const zamanAsimiMs = sec.zamanAsimiMs ?? 60000;
  const enFazlaDeneme = sec.deneme ?? 3;
  const anahtar = sec.anahtar || anahtarOku();
  if (!anahtar) throw new Error('TYPESAFE_API_KEY bulunamadı (.env).');

  let sonHata = null;
  for (let deneme = 0; deneme < enFazlaDeneme; deneme++) {
    const kontrol = new AbortController();
    const saat = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const basla = Date.now();
    try {
      const yanit = await fetch(UCNOKTA, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${anahtar}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state, model, questions }),
        signal: kontrol.signal,
      });
      const sureMs = Date.now() - basla;

      if (yanit.ok) {
        const govde = await yanit.json();
        return { ...govde, sureMs };
      }

      // 429 / 5xx / 529 → üstel geri çekilmeyle yeniden dene.
      const yenidenDene = yanit.status === 429 || yanit.status >= 500;
      let metin = '';
      try {
        metin = (await yanit.text()).slice(0, 400);
      } catch { /* gövde okunamadı */ }
      sonHata = new Error(`Jev HTTP ${yanit.status}: ${metin}`);
      if (!yenidenDene) throw sonHata;

      const retryAfter = Number(yanit.headers.get('retry-after'));
      const gecikme = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * 2 ** deneme + Math.floor(Math.random() * 300);
      if (deneme < enFazlaDeneme - 1) await bekle(gecikme);
    } catch (hata) {
      if (hata === sonHata) throw hata;
      sonHata = hata?.name === 'AbortError'
        ? new Error(`Jev zaman aşımı (${zamanAsimiMs} ms)`)
        : hata;
      if (deneme < enFazlaDeneme - 1) await bekle(1000 * 2 ** deneme);
    } finally {
      clearTimeout(saat);
    }
  }
  throw sonHata || new Error('Jev çağrısı başarısız.');
}

/** Jev 1.13 fiyatı: girdi jetonu başına 42 $/Btok (çıktı ücretsiz). */
export const BTOK_USD = 42;
export function maliyetUsd(girdiJetonu) {
  return (girdiJetonu / 1e9) * BTOK_USD;
}
