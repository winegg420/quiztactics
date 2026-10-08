// Zorluk 2 taraması (Claude API, claude-sonnet-5-5). Tarama YAZMAZ; yalnız okur. Altyapı: asiri-basit-tara.mjs ile aynı.
// A) Aşırı basit mi?  B) Doğru cevap gerçekten doğru mu / tek doğru şık mı var?
//   ÖRNEKLEM:  node araclar/soru-temizlik/z2-tara.mjs --orneklem 200   → .tmp/z2-tarama/orneklem.json
//   TAM:       node araclar/soru-temizlik/z2-tara.mjs [--butce-usd 8]  → .tmp/z2-tarama/z2.json (kaldığı yerden devam)
//   RAPOR:     node araclar/soru-temizlik/z2-tara.mjs --rapor [--orneklem-rapor]
//     → araclar/soru-temizlik/z2-tarama-rapor.csv (tüm şüpheliler), migration (UYGULANMAZ), docs/z2-tarama-geri-al.sql
//   Kapatma: asiri_basit VE guven_a ≥ 0,9 · yanlis/cift VE guven_b ≥ 0,9. Diğer şüpheliler yalnız CSV'de.
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd, havuz } from './claude-cagri.mjs';

const MODEL = 'claude-sonnet-5-5';
const ESIK = 0.9;
// Elle doğrulandı: model işaretli cevabı doğru buluyor (gerekçesiyle çelişen yanlış alarm) → kapatılmaz (1012 yeniden açtı).
const YANLIS_ALARM = new Set(['2d74846f-3935-4980-a0d0-d239753ab194','1badd06f-ace5-4cf8-a647-81021955fef7']);
const ESZAMANLI = 4;
const KLASOR = path.join(KOK, '.tmp', 'z2-tarama');
const MIG_KLASOR = path.join(KOK, 'supabase', 'migrations');
const CSV_YOLU = path.join(KOK, 'araclar', 'soru-temizlik', 'z2-tarama-rapor.csv');
const GERI_AL = path.join(KOK, 'docs', 'z2-tarama-geri-al.sql');

const arg = (ad, v) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : v; };
const RAPOR = process.argv.includes('--rapor');
const ORNEKLEM = Number(arg('--orneklem', 0));
const BUTCE = Number(arg('--butce-usd', 8));
const PARTI = Number(arg('--parti-boyut', 20));
if (!Number.isInteger(ORNEKLEM) || !(BUTCE > 0) || !Number.isInteger(PARTI) || PARTI < 1) throw new Error('Geçersiz parametre');
const CIKTI = path.join(KLASOR, ORNEKLEM || process.argv.includes('--orneklem-rapor') ? 'orneklem.json' : 'z2.json');

const SISTEM = `Bir bilgi yarışması oyununun soru editörüsün. Zorluk 2 (kolay-orta) havuzundaki soruları iki açıdan denetliyorsun.

A) "asiri_basit": cevabı bulmak için HİÇBİR BİLGİ gerekmiyor; soru kendi kendini cevaplıyor.
- Cevap mantıkla ya da sorudaki sözcüğün anlamından belli (ör. "Bir belgeselin amacı nedir?" → Bilgilendirmek).
- Belirli bir olgu değil genel bir kavram soruluyor ("X'in amacı/işlevi nedir", "X ne işe yarar").
- Doğru şık açıkça en genel/mantıklı şık, çeldiriciler saçma ya da konu dışı; ya da cevap soru metninde geçiyor.
- Tek net olguyu soran sorular (kişi, yer, sayı, tarih, ad, eser, kural) aşırı basit DEĞİLDİR → "degil". Şüphedeysen "degil".

B) "cevap": işaretli "doğru" şık gerçekten doğru mu, ve şıklar arasında TEK doğru var mı?
- "dogru": işaretli şık doğru ve diğerleri yanlış.
- "yanlis": işaretli şık olgusal olarak yanlış (gerçek doğru cevap başka bir şık ya da hiçbiri).
- "cift": işaretli şık doğru AMA bir başka şık da (makul bir okumayla) doğru; ya da soru belirsiz olduğu için ikisi de savunulabilir.
Yalnız kendi bilginle KESİN emin olduğunda yanlis/cift de. Emin değilsen "dogru" de; sübjektif/tartışmalı ama yaygın kabul gören cevap "dogru"dur.

"guven_a" ve "guven_b": ilgili kararından ne kadar eminsin (0–1). ≥ 0,9 yalnız gerçekten eminsen.
"gerekce": tek kısa Türkçe cümle (sorun yoksa boş bırakabilirsin; sorun varsa nedenini ve gerçek doğru cevabı yaz).
Her soru için verilen "n" numarasıyla bir sonuç döndür. Yalnız şemaya uygun JSON.`;

const SEMA = {
  type: 'object',
  properties: {
    sonuclar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          basitlik: { type: 'string', enum: ['asiri_basit', 'degil'] },
          guven_a: { type: 'number' },
          cevap: { type: 'string', enum: ['dogru', 'yanlis', 'cift'] },
          guven_b: { type: 'number' },
          gerekce: { type: 'string' },
        },
        required: ['n', 'basitlik', 'guven_a', 'cevap', 'guven_b', 'gerekce'],
        additionalProperties: false,
      },
    },
  },
  required: ['sonuclar'],
  additionalProperties: false,
};

function sorulariCek() {
  const sinir = ORNEKLEM ? `limit ${ORNEKLEM}` : '';
  return sorgu(`
    select id::text id, kategori, soru, secenekler, dogru_cevap
      from public.questions
     where aktif and zorluk = 2
     order by md5(id::text || 'z2-tarama') ${sinir};`);
}

const istemYaz = (parca) => parca.map((s, i) => `n=${i} [${s.kategori}] ${s.soru}\n   şıklar: ${s.secenekler.map((x, j) => `${'ABCD'[j] ?? j}) ${x}`).join(' | ')}\n   işaretli doğru: ${'ABCD'[s.dogru_cevap] ?? s.dogru_cevap}) ${s.secenekler[s.dogru_cevap]}`).join('\n');

function durumOku() {
  if (!fs.existsSync(CIKTI)) return { sonuclar: {}, harcama: {} };
  const st = JSON.parse(fs.readFileSync(CIKTI, 'utf8'));
  for (const [m, h] of Object.entries(st.harcama ?? {})) harcama[m] = { ...h };
  return st;
}
function durumYaz(st) {
  st.harcama = harcama;
  st.guncelleme = new Date().toISOString();
  fs.mkdirSync(KLASOR, { recursive: true });
  fs.writeFileSync(CIKTI + '.tmp', JSON.stringify(st, null, 1));
  fs.renameSync(CIKTI + '.tmp', CIKTI);
}

const sinifla = (x) => ({
  basit: x.basitlik === 'asiri_basit',
  cevapSorunu: x.cevap !== 'dogru',
});

async function tara() {
  const sorular = sorulariCek();
  const st = durumOku();
  const bekleyen = sorular.filter((s) => !st.sonuclar[s.id]);
  const partiler = [];
  for (let i = 0; i < bekleyen.length; i += PARTI) partiler.push(bekleyen.slice(i, i + PARTI));
  console.log(`Zorluk 2 · seçilen ${sorular.length} · taranmış ${sorular.length - bekleyen.length} · bekleyen ${bekleyen.length} (${partiler.length} çağrı) · harcanan $${apiUsd().toFixed(3)}`);
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok.');
  let hata = 0;
  await havuz(partiler, ESZAMANLI, async (parca) => {
    if (apiUsd() > BUTCE) return;
    try {
      const y = await claudeCagir(anahtar, { model: MODEL, sistem: SISTEM, sema: SEMA, istem: istemYaz(parca), maxJeton: 14000, effort: 'medium' });
      const gelen = new Map((y.sonuclar ?? []).map((r) => [r.n, r]));
      parca.forEach((s, i) => {
        const r = gelen.get(i);
        if (!r) return;
        const k = (v) => Math.max(0, Math.min(1, Number(v) || 0));
        st.sonuclar[s.id] = { kategori: s.kategori, soru: s.soru, dogru: s.secenekler[s.dogru_cevap], basitlik: r.basitlik, guven_a: k(r.guven_a), cevap: r.cevap, guven_b: k(r.guven_b), gerekce: String(r.gerekce ?? '').slice(0, 300) };
      });
      durumYaz(st);
      process.stdout.write(`\r  taranan ${Object.keys(st.sonuclar).length}/${sorular.length} · $${apiUsd().toFixed(3)}   `);
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi: ${e.message.slice(0, 160)}`);
      hata++;
      console.error(`\nParti hatası: ${String(e.message).slice(0, 160)}`);
    }
  });
  durumYaz(st);
  const kalan = sorular.filter((s) => !st.sonuclar[s.id]).length;
  console.log(`\nBitti · taranan ${sorular.length - kalan}/${sorular.length} · hata ${hata} · $${apiUsd().toFixed(3)}${apiUsd() > BUTCE ? ' — BÜTÇE DOLDU' : ''}`);
  if (kalan) console.log(`Taranmayan ${kalan} soru var — aynı komutla devam et.`);
  const r = Object.values(st.sonuclar);
  const a = r.filter((x) => x.basitlik === 'asiri_basit'), b = r.filter((x) => x.cevap !== 'dogru');
  console.log(`Sonuç ${r.length}: aşırı basit ${a.length} (≥0,9: ${a.filter((x) => x.guven_a >= ESIK).length}) · cevap sorunu ${b.length} (yanlış ${b.filter((x) => x.cevap === 'yanlis').length}, çift ${b.filter((x) => x.cevap === 'cift').length}; ≥0,9: ${b.filter((x) => x.guven_b >= ESIK).length})`);
  const oran = r.length ? r.length : 1;
  console.log(`Ortalama maliyet/soru $${(apiUsd() / oran).toFixed(5)} → tam ${'~'}$${((apiUsd() / oran) * Number(sorgu(`select count(*)::int n from public.questions where aktif and zorluk = 2`)[0].n)).toFixed(2)}`);
}

const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

function rapor() {
  if (!fs.existsSync(CIKTI)) throw new Error(`${CIKTI} yok`);
  const st = durumOku();
  const canli = sorgu(`select id::text id, kategori, zorluk from public.questions where aktif and zorluk = 2`);
  const canliId = new Set(canli.map((r) => r.id));
  const eksik = canli.filter((r) => !st.sonuclar[r.id]).length;
  if (eksik && !process.argv.includes('--orneklem-rapor')) throw new Error(`${eksik} aktif z2 soru taranmamış`);

  const sup = Object.entries(st.sonuclar)
    .filter(([id, x]) => canliId.has(id) && (x.basitlik === 'asiri_basit' || x.cevap !== 'dogru'))
    .map(([id, x]) => {
      const kapatA = x.basitlik === 'asiri_basit' && x.guven_a >= ESIK;
      const kapatB = x.cevap !== 'dogru' && x.guven_b >= ESIK && !YANLIS_ALARM.has(id);
      return { id, ...x, tur: x.cevap !== 'dogru' ? (x.cevap === 'yanlis' ? 'yanlis_cevap' : 'cift_cevap') : 'asiri_basit', kapat: kapatA || kapatB, kapatA, kapatB };
    })
    .sort((a, b) => Number(b.kapat) - Number(a.kapat) || a.tur.localeCompare(b.tur) || a.kategori.localeCompare(b.kategori));
  fs.writeFileSync(CSV_YOLU, ['id,kategori,tur,kapatildi,guven_a,guven_b,soru,dogru,gerekce', ...sup.map((x) => [x.id, x.kategori, x.tur, x.kapat ? 'evet' : 'hayir', x.guven_a.toFixed(2), x.guven_b.toFixed(2), x.soru, x.dogru, x.gerekce].map(csvAlan).join(','))].join('\n') + '\n', 'utf8');

  const kapanan = sup.filter((x) => x.kapat);
  const no = String(Math.max(...fs.readdirSync(MIG_KLASOR).map((f) => Number(f.slice(0, 14))).filter(Number.isFinite)) + 1);
  const onceki = fs.readdirSync(MIG_KLASOR).find((f) => f.endsWith('_z2_tarama_kapat.sql'));
  const dosyaNo = onceki ? onceki.slice(0, 14) : no;
  const dosya = `${dosyaNo}_z2_tarama_kapat.sql`;
  const idler = (liste) => liste.map((x) => `  '${x.id}'`).join(',\n');
  const basit = kapanan.filter((x) => x.tur === 'asiri_basit'), yanlis = kapanan.filter((x) => x.tur !== 'asiri_basit');
  fs.writeFileSync(path.join(MIG_KLASOR, dosya), `-- ============================================================
-- ${dosyaNo.slice(-3)} — ZORLUK 2 TARAMASI: AŞIRI BASİT + YANLIŞ/ÇİFT CEVAP PASİFE ALINDI (${new Date().toISOString().slice(0, 10)})
--
-- Aktif zorluk 2 soruları (${canli.length}) ${MODEL} ile tarandı (araclar/soru-temizlik/z2-tara.mjs).
-- Kapanan: aşırı basit (güven ≥ ${ESIK}) ${basit.length} · yanlış/çift cevap (güven ≥ ${ESIK}) ${yanlis.length}.
-- Liste ve gerekçeler: araclar/soru-temizlik/z2-tarama-rapor.csv. Hiçbiri SİLİNMEDİ; yalnız aktif = false.
-- Geri alma: docs/z2-tarama-geri-al.sql
-- ============================================================

update public.questions
   set aktif = false
 where aktif and zorluk = 2 and id in (
${idler(kapanan)}
);
`, 'utf8');
  fs.writeFileSync(GERI_AL, `-- ${dosya} geri alma: kapatılan ${kapanan.length} zorluk 2 soruyu yeniden açar. Yalnız elle çalıştırılır.
update public.questions
   set aktif = true
 where not aktif and zorluk = 2 and id in (
${idler(kapanan)}
);
`, 'utf8');
  console.log(`Şüpheli ${sup.length} · kapanacak ${kapanan.length} (aşırı basit ${basit.length}, yanlış/çift ${yanlis.length}) · migration ${dosya} (UYGULANMADI)`);
}

(RAPOR ? Promise.resolve().then(rapor) : tara()).catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
