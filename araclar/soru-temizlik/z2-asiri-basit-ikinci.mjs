// Zorluk 2 "aşırı basit" şüphelilerinin ikinci incelemesi (claude-opus-5-5). Aday kaynağı: .tmp/z2-tarama/z2.json (z2-tara.mjs),
// basitlik = asiri_basit olup hâlâ aktif z2 olanlar (1011'de kapanan 51 zaten pasif → dışarıda kalır).
//   DENEME: node araclar/soru-temizlik/z2-asiri-basit-ikinci.mjs --adet 50
//   TAM:    node araclar/soru-temizlik/z2-asiri-basit-ikinci.mjs [--butce-usd 15]   → .tmp/z2-tarama/asiri-basit-ikinci.json (kaldığı yerden devam)
//   RAPOR:  node araclar/soru-temizlik/z2-asiri-basit-ikinci.mjs --rapor
//     → z2-asiri-basit-ikinci-rapor.csv (tüm kararlar), z2-dogruluk-sorunlari.csv, migration (UYGULANMAZ), docs/z2-asiri-basit-2-geri-al.sql
// Kapatma: karar KAPAT VE güven ≥ 0,85 VE doğruluk "tamam". Doğruluk sorunu olan kapatılmaz, ayrı CSV'ye yazılır.
// Güvenlik: kapatma sonrası aktif z2 < 2.000 olacaksa rapor migration ÜRETMEZ.
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd, havuz } from './claude-cagri.mjs';

const MODEL = 'claude-opus-5-5';
const ESIK = 0.85;
const TABAN = 2000;
const PARTI = 12;
const ESZAMANLI = 3;
const KAYNAK = path.join(KOK, '.tmp', 'z2-tarama', 'z2.json');
const CIKTI = path.join(KOK, '.tmp', 'z2-tarama', 'asiri-basit-ikinci.json');
const CSV = path.join(KOK, 'araclar', 'soru-temizlik', 'z2-asiri-basit-ikinci-rapor.csv');
const CSV_DOGRULUK = path.join(KOK, 'araclar', 'soru-temizlik', 'z2-dogruluk-sorunlari.csv');
const MIG = path.join(KOK, 'supabase', 'migrations');
const GERI_AL = path.join(KOK, 'docs', 'z2-asiri-basit-2-geri-al.sql');

const arg = (ad, v) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : v; };
const ADET = Number(arg('--adet', 0));
const BUTCE = Number(arg('--butce-usd', 15));
if (!Number.isInteger(ADET) || ADET < 0 || !(BUTCE > 0)) throw new Error('Geçersiz parametre');

const SISTEM = `Bir bilgi yarışması oyununun titiz soru editörüsün. Sorular Zorluk 2 (kolay-orta) havuzunda; oyunun %60'ı bu havuzdan gelir.
Önceki otomatik tarama bu soruları "aşırı basit" diye işaretledi ama bu taramada çok yanlış alarm vardı. Her soruyu tek tek, şıklarıyla birlikte değerlendir.

1) "karar" — soru Zorluk 2'ye uyuyor mu?
- "kapat": AŞIRI BASİT. Cevabı bulmak için hiçbir alan bilgisi/genel kültür gerekmiyor; soru kendi kendini cevaplıyor:
  · cevap sorudaki sözcüğün anlamından ya da sağduyudan belli ("Bir belgeselin amacı nedir?" → Bilgilendirmek; "Toprak analizinin çiftçiye yararı?" → Doğru gübreleme),
  · belirli bir olgu değil genel bir kavramın amacı/işlevi/yararı soruluyor ve doğru şık açıkça en mantıklı/genel şık, çeldiriciler saçma ya da konu dışı,
  · cevap soru metninde geçiyor ya da şıklardan biri açıkça tek ciddi seçenek.
- "tut": GERÇEKTEN Z2. Doğru cevap için gerçek bir bilgi gerekiyor: belirli bir olgu (kişi, yer, sayı, tarih, ad, eser, kural, terim, tanım) soruluyor, ya da çeldiriciler makul ve bilgisi olmayan biri yanılabilir. Çok bilinen ama bilgi gerektiren olgular (ör. "Mona Lisa'yı kim yaptı?") "tut"tur — kolay olması aşırı basit olduğu anlamına gelmez.
  YANLIŞ ALARMA DİKKAT: kısa/kolay görünmesi, doğru cevabın doğru olması, ya da sorunun "nedir" kalıbında olması tek başına kapatma nedeni değildir. Soru bir terimin TANIMINI soruyor ve terimi bilmeyen bilemezse "tut".
- "supheli": iki yöne de savunulabiliyorsa ya da emin değilsen.
"guven": karar'dan ne kadar eminsin (0–1). ≥ 0,85 yalnız gerçekten eminsen.

2) "dogruluk" — işaretli doğru şık gerçekten doğru mu?
- "tamam": işaretli şık doğru ve diğer şıklar yanlış.
- "yanlis": işaretli şık olgusal olarak yanlış.
- "cift": işaretli şık doğru ama başka bir şık da makul biçimde doğru; oyuncu haklı olarak itiraz edebilir.
- "belirsiz": soru belirsiz/eksik ifade edilmiş, tek doğru cevap çıkarılamıyor.
Yalnız gerçekten emin olduğunda "tamam" dışında bir şey de; yaygın kabul gören ders kitabı cevabı ve gerçekten yanlış çeldiriciler → "tamam".

"gerekce": tek kısa Türkçe cümle (doğruluk sorunu varsa sorunu ve gerçek doğru cevabı yaz).
Her soru için verilen "n" ile bir sonuç döndür. Yalnız şemaya uygun JSON.`;

const SEMA = {
  type: 'object',
  properties: {
    sonuclar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          karar: { type: 'string', enum: ['kapat', 'tut', 'supheli'] },
          guven: { type: 'number' },
          dogruluk: { type: 'string', enum: ['tamam', 'yanlis', 'cift', 'belirsiz'] },
          gerekce: { type: 'string' },
        },
        required: ['n', 'karar', 'guven', 'dogruluk', 'gerekce'],
        additionalProperties: false,
      },
    },
  },
  required: ['sonuclar'],
  additionalProperties: false,
};

const harf = (i) => 'ABCD'[i] ?? i;
const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

function adaylar() {
  if (!fs.existsSync(KAYNAK)) throw new Error(`${KAYNAK} yok (önce z2-tara.mjs)`);
  const st = JSON.parse(fs.readFileSync(KAYNAK, 'utf8')).sonuclar;
  const ids = Object.entries(st).filter(([, x]) => x.basitlik === 'asiri_basit').map(([id]) => id);
  if (!ids.length) return [];
  return sorgu(`select id::text id, kategori, soru, secenekler, dogru_cevap from public.questions
     where aktif and zorluk = 2 and id in (${ids.map((i) => `'${i}'`).join(',')})
     order by md5(id::text || 'z2-asiri-basit-2')`);
}

function durumOku() {
  if (!fs.existsSync(CIKTI)) return { sonuclar: {} };
  const st = JSON.parse(fs.readFileSync(CIKTI, 'utf8'));
  for (const [m, h] of Object.entries(st.harcama ?? {})) harcama[m] = { ...h };
  return st;
}
function durumYaz(st) {
  st.harcama = harcama;
  st.guncelleme = new Date().toISOString();
  fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
  fs.writeFileSync(CIKTI + '.tmp', JSON.stringify(st, null, 1));
  fs.renameSync(CIKTI + '.tmp', CIKTI);
}

// Nihai sınıf: doğruluk sorunu kapatmayı engeller.
const sinif = (x) => (x.dogruluk !== 'tamam' ? 'DOGRULUK_SORUNU'
  : x.karar === 'kapat' && x.guven >= ESIK ? 'KAPAT'
  : x.karar === 'tut' ? 'TUT' : 'SUPHELI');

async function incele() {
  const tum = adaylar();
  const st = durumOku();
  const liste = (ADET ? tum.slice(0, ADET) : tum).filter((s) => !st.sonuclar[s.id]);
  const partiler = [];
  for (let i = 0; i < liste.length; i += PARTI) partiler.push(liste.slice(i, i + PARTI));
  console.log(`Aday ${tum.length} · incelenmiş ${Object.keys(st.sonuclar).length} · bu koşu ${liste.length} (${partiler.length} çağrı) · harcanan $${apiUsd().toFixed(3)}`);
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok.');
  let hata = 0, butceDoldu = false;
  await havuz(partiler, ESZAMANLI, async (parca) => {
    if (apiUsd() > BUTCE) { butceDoldu = true; return; }
    try {
      const istem = parca.map((s, j) => `n=${j} [${s.kategori}] ${s.soru}\n   şıklar: ${s.secenekler.map((x, k) => `${harf(k)}) ${x}`).join(' | ')}\n   işaretli doğru: ${harf(s.dogru_cevap)}) ${s.secenekler[s.dogru_cevap]}`).join('\n');
      const y = await claudeCagir(anahtar, { model: MODEL, sistem: SISTEM, sema: SEMA, istem, maxJeton: 12000, effort: 'high' });
      const gelen = new Map((y.sonuclar ?? []).map((r) => [r.n, r]));
      parca.forEach((s, j) => {
        const r = gelen.get(j);
        if (!r) return;
        st.sonuclar[s.id] = { kategori: s.kategori, soru: s.soru, siklar: s.secenekler, dogru: s.secenekler[s.dogru_cevap], karar: r.karar, guven: Math.max(0, Math.min(1, Number(r.guven) || 0)), dogruluk: r.dogruluk, gerekce: String(r.gerekce ?? '').slice(0, 300) };
      });
      durumYaz(st);
      process.stdout.write(`\r  incelenen ${Object.keys(st.sonuclar).length} · $${apiUsd().toFixed(3)}   `);
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi: ${String(e.message).slice(0, 160)}`);
      hata++;
      console.error(`\nParti hatası: ${String(e.message).slice(0, 160)}`);
    }
  });
  durumYaz(st);
  const r = Object.values(st.sonuclar);
  const say = (k) => r.filter((x) => sinif(x) === k).length;
  console.log(`\nBitti · hata ${hata} · $${apiUsd().toFixed(3)}${butceDoldu ? ' — BÜTÇE DOLDU, DURDU' : ''}`);
  console.log(`Toplam ${r.length}: KAPAT ${say('KAPAT')} · TUT ${say('TUT')} · ŞÜPHELİ ${say('SUPHELI')} · DOGRULUK_SORUNU ${say('DOGRULUK_SORUNU')}`);
}

function rapor() {
  const st = durumOku();
  const satir = Object.entries(st.sonuclar).map(([id, x]) => ({ id, ...x, sinif: sinif(x) }))
    .sort((a, b) => a.sinif.localeCompare(b.sinif) || a.kategori.localeCompare(b.kategori));
  fs.writeFileSync(CSV, ['id,kategori,sinif,karar,guven,dogruluk,soru,siklar,isaretli,gerekce',
    ...satir.map((x) => [x.id, x.kategori, x.sinif, x.karar, x.guven.toFixed(2), x.dogruluk, x.soru, x.siklar.join(' | '), x.dogru, x.gerekce].map(csvAlan).join(','))].join('\n') + '\n', 'utf8');
  const dog = satir.filter((x) => x.sinif === 'DOGRULUK_SORUNU');
  fs.writeFileSync(CSV_DOGRULUK, ['id,kategori,dogruluk,soru,siklar,isaretli,gerekce',
    ...dog.map((x) => [x.id, x.kategori, x.dogruluk, x.soru, x.siklar.join(' | '), x.dogru, x.gerekce].map(csvAlan).join(','))].join('\n') + '\n', 'utf8');

  const kap = satir.filter((x) => x.sinif === 'KAPAT');
  const aktif = Number(sorgu(`select count(*)::int n from public.questions where aktif and zorluk = 2`)[0].n);
  const kapAktif = kap.length ? Number(sorgu(`select count(*)::int n from public.questions where aktif and zorluk = 2 and id in (${kap.map((x) => `'${x.id}'`).join(',')})`)[0].n) : 0;
  console.log(`İncelenen ${satir.length} · KAPAT ${kap.length} (aktif ${kapAktif}) · DOGRULUK_SORUNU ${dog.length} · z2 aktif ${aktif} → ${aktif - kapAktif}`);
  if (aktif - kapAktif < TABAN) { console.log(`DUR: z2 aktif ${TABAN} altına inerdi; migration üretilmedi.`); return; }
  if (!kap.length) return;

  const onceki = fs.readdirSync(MIG).find((f) => f.endsWith('_z2_asiri_basit_2_kapat.sql'));
  const no = onceki ? onceki.slice(0, 14) : String(Math.max(...fs.readdirSync(MIG).map((f) => Number(f.slice(0, 14))).filter(Number.isFinite)) + 1);
  const dosya = `${no}_z2_asiri_basit_2_kapat.sql`;
  const idler = kap.map((x) => `  '${x.id}'`).join(',\n');
  fs.writeFileSync(path.join(MIG, dosya), `-- ${no.slice(-3)} — ZORLUK 2: AŞIRI BASİT ŞÜPHELİLERİN OPUS İKİNCİ İNCELEMESİ, KAPAT KARARLILAR PASİFE ALINDI (${new Date().toISOString().slice(0, 10)})
-- z2-tara.mjs'nin açık bıraktığı ${satir.length} "aşırı basit" şüphelisi ${MODEL} ile tek tek incelendi (araclar/soru-temizlik/z2-asiri-basit-ikinci.mjs).
-- Kapanan: karar KAPAT, güven ≥ ${ESIK}, doğruluk sorunu yok → ${kap.length} soru. Silinen yok; yalnız aktif = false.
-- Liste: araclar/soru-temizlik/z2-asiri-basit-ikinci-rapor.csv · Geri alma: docs/z2-asiri-basit-2-geri-al.sql
update public.questions
   set aktif = false
 where aktif and zorluk = 2 and id in (
${idler}
);
`, 'utf8');
  fs.writeFileSync(GERI_AL, `-- ${dosya} geri alma: kapatılan ${kap.length} zorluk 2 soruyu yeniden açar. Yalnız elle çalıştırılır.\nupdate public.questions\n   set aktif = true\n where not aktif and zorluk = 2 and id in (\n${idler}\n);\n`, 'utf8');
  console.log(`Migration ${dosya} (UYGULANMADI) · geri alma ${path.relative(KOK, GERI_AL)}`);
}

(process.argv.includes('--rapor') ? Promise.resolve().then(rapor) : incele()).catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
