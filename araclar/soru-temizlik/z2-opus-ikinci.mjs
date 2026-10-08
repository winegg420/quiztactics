// Zorluk 2 "yanlış/çift cevap" adaylarının ikinci incelemesi (claude-opus-5-5). Aday kaynağı: .tmp/z2-tarama/z2.json (z2-tara.mjs).
//   node araclar/soru-temizlik/z2-opus-ikinci.mjs          → .tmp/z2-tarama/opus.json
//   node araclar/soru-temizlik/z2-opus-ikinci.mjs --rapor  → CSV + migration (UYGULANMAZ) + docs/z2-opus-geri-al.sql
// Kapatma: Opus "yanlis" veya "cift" VE güven ≥ 0,85. Kararsızlar yalnız CSV'de.
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd } from './claude-cagri.mjs';

const MODEL = 'claude-opus-5-5';
const ESIK = 0.85;
const KAYNAK = path.join(KOK, '.tmp', 'z2-tarama', 'z2.json');
const CIKTI = path.join(KOK, '.tmp', 'z2-tarama', 'opus.json');
const CSV = path.join(KOK, 'araclar', 'soru-temizlik', 'z2-opus-ikinci-rapor.csv');
const MIG = path.join(KOK, 'supabase', 'migrations');
const GERI_AL = path.join(KOK, 'docs', 'z2-opus-geri-al.sql');

const SISTEM = `Bir bilgi yarışması oyununun titiz soru denetçisisin. Her soruda "işaretli doğru" şıkkı denetle:
- "dogru": işaretli şık gerçekten doğru ve diğer şıklar yanlış (ya da en doğru/yaygın kabul gören cevap net olarak o).
- "yanlis": işaretli şık olgusal olarak yanlış.
- "cift": işaretli şık doğru AMA başka bir şık da makul biçimde doğru sayılabilir; oyuncu haklı olarak itiraz edebilir.
Yalnız bilginle emin olduğunda yanlis/cift de; sorunun yaygın kabul gören, ders kitabı düzeyinde bir cevabı varsa ve çeldiriciler gerçekten yanlışsa "dogru".
"guven": kararından ne kadar eminsin (0–1). "gerekce": kısa Türkçe cümle (varsa gerçek doğru cevabı ya da ikinci doğru şıkkı yaz).
Her soru için verilen "n" ile bir sonuç döndür. Yalnız şemaya uygun JSON.`;
const SEMA = { type: 'object', properties: { sonuclar: { type: 'array', items: { type: 'object', properties: { n: { type: 'integer' }, karar: { type: 'string', enum: ['dogru', 'yanlis', 'cift'] }, guven: { type: 'number' }, gerekce: { type: 'string' } }, required: ['n', 'karar', 'guven', 'gerekce'], additionalProperties: false } } }, required: ['sonuclar'], additionalProperties: false };

const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const adaylar = () => {
  const st = JSON.parse(fs.readFileSync(KAYNAK, 'utf8')).sonuclar;
  const ids = Object.entries(st).filter(([, x]) => x.cevap !== 'dogru').map(([id]) => id);
  if (!ids.length) return [];
  // yalnız hâlâ aktif z2 olanlar (yanlış alarm olarak yeniden açılanlar dahil); gerçek şıklar DB'den
  return sorgu(`select id::text id, kategori, soru, secenekler, dogru_cevap from public.questions where aktif and zorluk = 2 and id in (${ids.map((i) => `'${i}'`).join(',')}) order by kategori, id`);
};
const harf = (i) => 'ABCD'[i] ?? i;

async function incele() {
  const liste = adaylar();
  // Yanlış alarm olduğu elle doğrulanıp 1012'de açılan 2 soru zaten dahil; aday sayısı: liste.length
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok.');
  const sonuc = {};
  for (let i = 0; i < liste.length; i += 11) {
    const parca = liste.slice(i, i + 11);
    try {
      const istem = parca.map((s, j) => `n=${j} [${s.kategori}] ${s.soru}\n   şıklar: ${s.secenekler.map((x, k) => `${harf(k)}) ${x}`).join(' | ')}\n   işaretli doğru: ${harf(s.dogru_cevap)}) ${s.secenekler[s.dogru_cevap]}`).join('\n');
      const y = await claudeCagir(anahtar, { model: MODEL, sistem: SISTEM, sema: SEMA, istem, maxJeton: 8000, effort: 'high' });
      const gelen = new Map((y.sonuclar ?? []).map((r) => [r.n, r]));
      parca.forEach((s, j) => { const r = gelen.get(j); if (r) sonuc[s.id] = { kategori: s.kategori, soru: s.soru, dogru: s.secenekler[s.dogru_cevap], siklar: s.secenekler, karar: r.karar, guven: Math.max(0, Math.min(1, Number(r.guven) || 0)), gerekce: String(r.gerekce ?? '').slice(0, 300) }; });
    } catch (e) {
      console.error('Parti hatası:', String(e.message).slice(0, 160));
      if (e.kritik) throw e;
    }
  }
  fs.writeFileSync(CIKTI, JSON.stringify({ sonuclar: sonuc, harcama }, null, 1));
  console.log(`İncelenen ${Object.keys(sonuc).length}/${liste.length} · $${apiUsd().toFixed(3)}`);
}

function rapor() {
  const sonuc = JSON.parse(fs.readFileSync(CIKTI, 'utf8')).sonuclar;
  const satir = Object.entries(sonuc).map(([id, x]) => ({ id, ...x, kapat: x.karar !== 'dogru' && x.guven >= ESIK }));
  fs.writeFileSync(CSV, ['id,kategori,opus_karar,guven,kapatildi,soru,isaretli,gerekce', ...satir.map((x) => [x.id, x.kategori, x.karar, x.guven.toFixed(2), x.kapat ? 'evet' : 'hayir', x.soru, x.dogru, x.gerekce].map(csvAlan).join(','))].join('\n') + '\n', 'utf8');
  const kap = satir.filter((x) => x.kapat);
  const onceki = fs.readdirSync(MIG).find((f) => f.endsWith('_z2_opus_kapat.sql'));
  const no = onceki ? onceki.slice(0, 14) : String(Math.max(...fs.readdirSync(MIG).map((f) => Number(f.slice(0, 14))).filter(Number.isFinite)) + 1);
  const dosya = `${no}_z2_opus_kapat.sql`;
  const idler = kap.map((x) => `  '${x.id}'`).join(',\n');
  fs.writeFileSync(path.join(MIG, dosya), `-- ${no.slice(-3)} — ZORLUK 2: OPUS İKİNCİ İNCELEMESİ, YANLIŞ/ÇİFT CEVAPLI SORULAR PASİFE ALINDI (${new Date().toISOString().slice(0, 10)})
-- ${satir.length} aday ${MODEL} ile yeniden incelendi; karar yanlış/çift VE güven ≥ ${ESIK} olan ${kap.length} soru kapatıldı. Silinen yok.
-- Liste: araclar/soru-temizlik/z2-opus-ikinci-rapor.csv · Geri alma: docs/z2-opus-geri-al.sql
update public.questions
   set aktif = false
 where aktif and zorluk = 2 and id in (
${idler}
);
`, 'utf8');
  fs.writeFileSync(GERI_AL, `-- ${dosya} geri alma (elle çalıştırılır)\nupdate public.questions\n   set aktif = true\n where not aktif and zorluk = 2 and id in (\n${idler}\n);\n`, 'utf8');
  console.log(`${satir.length} incelendi · kapanacak ${kap.length} · ${dosya}`);
  for (const x of kap) console.log(`- ${x.soru} → ${x.dogru} | ${x.karar} ${x.guven.toFixed(2)} | ${x.gerekce}`);
}

(process.argv.includes('--rapor') ? Promise.resolve().then(rapor) : incele()).catch((e) => { console.error('HATA:', String(e.message).slice(0, 400)); process.exit(1); });
