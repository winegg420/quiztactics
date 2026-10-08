// Aşırı basit soru taraması (Claude API, claude-sonnet-5-5). VERİTABANINA YAZMAZ; yalnız okur.
// "Aşırı basit": cevap hiçbir BİLGİ gerektirmeden mantıkla ya da sözcüğün anlamından belli oluyor;
// belirli bir olgu değil genel bir kavram soruluyor ("X'in amacı nedir", "X ne işe yarar").
// Kolay ama tek net olguyu soran sorular ("Örümceklerin kaç bacağı vardır?") KALIR.
// Önceki iş: migration 265 (9 Eyl 2026, 53 soru, metne bağlı) — bu kez id listesiyle.
//
// TARAMA (zorluk 1, tümü):  node araclar/soru-temizlik/asiri-basit-tara.mjs [--kuru] [--butce-usd 3]
//   Sonuç .tmp/asiri-basit/z1.json'a yazılır; yarıda kalırsa aynı komut kaldığı yerden devam eder.
// DENEME (küçük örnek):     ... --adet 20      → .tmp/asiri-basit/deneme-z1.json (ana sonucu etkilemez)
// ZORLUK 2 ÖRNEKLEM:        ... --zorluk 2 --orneklem 200   → yalnız SAYAR (.tmp/asiri-basit/z2-orneklem.json)
// RAPOR + MİGRATION:        ... --rapor   (API çağrısı yok)
//   karar = asiri_basit VE guven >= 0,8 → araclar/soru-temizlik/asiri-basit-rapor.csv,
//   supabase/migrations/<sıradaki>_asiri_basit_z1_kapat.sql (UYGULANMAZ), docs/asiri-basit-z1-geri-al.sql.
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd, havuz } from './claude-cagri.mjs';

const MODEL = 'claude-sonnet-5-5';
const GUVEN_ESIK = 0.8;
const KATEGORI_UYARI = 30;
const ESZAMANLI = 4;
const KLASOR = path.join(KOK, '.tmp', 'asiri-basit');
const MIGRASYON_KLASOR = path.join(KOK, 'supabase', 'migrations');
const CSV_YOLU = path.join(KOK, 'araclar', 'soru-temizlik', 'asiri-basit-rapor.csv');
const GERI_AL_YOLU = path.join(KOK, 'docs', 'asiri-basit-z1-geri-al.sql');

const arg = (ad, varsayilan) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : varsayilan; };
const KURU = process.argv.includes('--kuru');
const RAPOR = process.argv.includes('--rapor');
const ZORLUK = Number(arg('--zorluk', 1));
const ORNEKLEM = Number(arg('--orneklem', 0));
const ADET = Number(arg('--adet', 0));
const BUTCE = Number(arg('--butce-usd', 3));
const PARTI = Number(arg('--parti-boyut', 20));
if (![1, 2].includes(ZORLUK) || !(BUTCE > 0) || !Number.isInteger(PARTI) || PARTI < 1 || !Number.isInteger(ADET) || !Number.isInteger(ORNEKLEM)) {
  throw new Error('Geçersiz --zorluk (1|2) / --butce-usd / --parti-boyut / --adet / --orneklem');
}
const CIKTI = path.join(KLASOR, ZORLUK === 2 ? 'z2-orneklem.json' : ADET ? 'deneme-z1.json' : 'z1.json');

const SISTEM = `Bir bilgi yarışması oyununun soru editörüsün. Zorluk 1 (en kolay) havuzundaki "aşırı basit" soruları ayıklıyorsun.

"asiri_basit" = cevabı bulmak için HİÇBİR BİLGİ gerekmiyor; soru kendi kendini cevaplıyor:
- Cevap mantıkla ya da sorudaki sözcüğün anlamından belli (ör. "Bir belgeselin amacı nedir?" → Bilgilendirmek; "Reklamın temel amacı nedir?" → Ürünü tanıtmak/satmak).
- Belirli bir olgu değil genel bir kavram soruluyor: "X'in amacı/işlevi nedir", "X ne işe yarar", "X ne anlama gelir", "X'te ne yapılır" kalıpları ("Trafik ışığında kırmızı ne anlama gelir?" → Dur).
- Doğru şık açıkça en genel / en mantıklı / sağduyunun söylediği şık; çeldiriciler saçma ya da konu dışı.
- Cevap soru metninin içinde ya da sözcüğün kendisinde geçiyor (okuduğunu anlama).

"kalsin" = kolay da olsa TEK, NET, BELİRLİ bir olguyu soruyor; bilmeyen bilemez:
- "Kanı vücuda pompalayan organ hangisidir?" (Kalp) — kolay ama bilgi.
- "Örümceklerin kaç bacağı vardır?" (8) — kolay ama sayısal olgu.
- "Kâğıdı kesmeden katlayarak şekil yapma sanatına ne ad verilir?" (Origami) — bir adı bilmek gerekiyor.
- Başkentler, kişiler, eserler, sayılar, adlar, tarihler, yerler, kurallar: hepsi olgu → kalsin.

Kural: ŞÜPHEDEYSEN "kalsin" de. Yanlışlıkla çıkarmak, yanlışlıkla bırakmaktan daha kötüdür.
"guven": kararından ne kadar eminsin (0–1). asiri_basit kararında guven ≥ 0,8 yalnız gerçekten bilgi gerektirmediğinden eminsen.
"gerekce": tek kısa Türkçe cümle.
Her soru için, verilen "n" numarasıyla bir sonuç döndür. Yalnız şemaya uygun JSON.`;

const SEMA = {
  type: 'object',
  properties: {
    sonuclar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          karar: { type: 'string', enum: ['asiri_basit', 'kalsin'] },
          guven: { type: 'number' },
          gerekce: { type: 'string' },
        },
        required: ['n', 'karar', 'guven', 'gerekce'],
        additionalProperties: false,
      },
    },
  },
  required: ['sonuclar'],
  additionalProperties: false,
};

function sorulariCek() {
  const sinir = ZORLUK === 2 ? `limit ${ORNEKLEM || 200}` : ADET ? `limit ${ADET}` : '';
  // md5(id) sırası: rastgele ama tekrarlanabilir (aynı komut aynı örneklemi seçer)
  return sorgu(`
    select id::text id, kategori, soru, secenekler, dogru_cevap
      from public.questions
     where aktif and zorluk = ${ZORLUK}
     order by md5(id::text || 'asiri-basit') ${sinir};`);
}

const istemYaz = (parca) => parca.map((s, i) => `n=${i} [${s.kategori}] ${s.soru}\n   şıklar: ${s.secenekler.join(' | ')}\n   doğru: ${s.secenekler[s.dogru_cevap]}`).join('\n');

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

async function tara() {
  const sorular = sorulariCek();
  console.log(`Zorluk ${ZORLUK} · aktif seçilen ${sorular.length} soru · parti ${PARTI}`);
  const st = durumOku();
  const bekleyen = sorular.filter((s) => !st.sonuclar[s.id]);
  const partiler = [];
  for (let i = 0; i < bekleyen.length; i += PARTI) partiler.push(bekleyen.slice(i, i + PARTI));
  console.log(`Taranmış ${sorular.length - bekleyen.length} · bekleyen ${bekleyen.length} (${partiler.length} çağrı) · harcanan $${apiUsd().toFixed(3)}`);
  if (KURU) {
    for (const s of bekleyen.slice(0, 10)) console.log(`- ${s.id} [${s.kategori}] ${s.soru}`);
    return;
  }
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok — Ida eklemeli.');

  let hata = 0;
  await havuz(partiler, ESZAMANLI, async (parca) => {
    if (apiUsd() > BUTCE) return;
    try {
      const y = await claudeCagir(anahtar, { model: MODEL, sistem: SISTEM, sema: SEMA, istem: istemYaz(parca), maxJeton: 12000, effort: 'medium' });
      const gelen = new Map((y.sonuclar ?? []).map((r) => [r.n, r]));
      parca.forEach((s, i) => {
        const r = gelen.get(i);
        if (!r) return; // eksik dönen soru bir sonraki koşuda yeniden sorulur
        st.sonuclar[s.id] = { kategori: s.kategori, soru: s.soru, dogru: s.secenekler[s.dogru_cevap], karar: r.karar, guven: Math.max(0, Math.min(1, Number(r.guven) || 0)), gerekce: String(r.gerekce ?? '').slice(0, 200) };
      });
      durumYaz(st);
      process.stdout.write(`\r  taranan ${Object.keys(st.sonuclar).length}/${sorular.length} · $${apiUsd().toFixed(3)}   `);
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi, durduruldu: ${e.message.slice(0, 160)}`);
      hata++;
      console.error(`\nParti hatası: ${String(e.message).slice(0, 160)}`);
    }
  });
  durumYaz(st);
  const kalan = sorular.filter((s) => !st.sonuclar[s.id]).length;
  console.log(`\nBitti · taranan ${sorular.length - kalan}/${sorular.length} · hata ${hata} · Claude $${apiUsd().toFixed(3)}${apiUsd() > BUTCE ? ' — BÜTÇE DOLDU' : ''}`);
  if (kalan) console.log(`Taranmayan ${kalan} soru var — aynı komutla devam et.`);
  ozet(st, sorular.length);
}

function ozet(st, toplam) {
  const r = Object.values(st.sonuclar);
  const basit = r.filter((x) => x.karar === 'asiri_basit');
  const yuksek = basit.filter((x) => x.guven >= GUVEN_ESIK);
  console.log(`Sonuç: ${r.length}/${toplam} · asiri_basit ${basit.length} · bunlardan guven ≥ ${GUVEN_ESIK}: ${yuksek.length} (%${r.length ? ((100 * yuksek.length) / r.length).toFixed(1) : 0})`);
  for (const x of yuksek.slice(0, ADET || ZORLUK === 2 ? 50 : 0)) console.log(`  ${x.guven.toFixed(2)} [${x.kategori}] ${x.soru} → ${x.dogru} — ${x.gerekce}`);
}

const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const sonrakiMigrasyonNo = () => String(Math.max(...fs.readdirSync(MIGRASYON_KLASOR).map((f) => Number(f.slice(0, 14))).filter(Number.isFinite)) + 1);

function rapor() {
  if (!fs.existsSync(CIKTI)) throw new Error(`${CIKTI} yok — önce tarama`);
  const st = durumOku();
  // Hâlâ aktif + zorluk 1 olanlar (tarama sonrası değişen olduysa dışarıda kalır)
  const canli = sorgu(`select id::text id, kategori from public.questions where aktif and zorluk = 1`);
  const canliId = new Set(canli.map((r) => r.id));
  const eksik = canli.filter((r) => !st.sonuclar[r.id]).length;
  if (eksik) throw new Error(`${eksik} aktif zorluk 1 soru taranmamış — önce taramayı bitir`);

  const secilen = Object.entries(st.sonuclar)
    .filter(([id, x]) => canliId.has(id) && x.karar === 'asiri_basit' && x.guven >= GUVEN_ESIK)
    .map(([id, x]) => ({ id, ...x }))
    .sort((a, b) => a.kategori.localeCompare(b.kategori) || b.guven - a.guven);

  fs.writeFileSync(CSV_YOLU, ['id,kategori,soru,dogru,guven,gerekce', ...secilen.map((x) => [x.id, x.kategori, x.soru, x.dogru, x.guven.toFixed(2), x.gerekce].map(csvAlan).join(','))].join('\n') + '\n', 'utf8');

  const once = Number(sorgu(`select count(*)::int n from public.questions where aktif`)[0].n);
  const kat = {};
  for (const r of canli) (kat[r.kategori] ??= { once: 0, kapanan: 0 }).once++;
  for (const x of secilen) kat[x.kategori].kapanan++;
  const satirlar = Object.entries(kat).sort().map(([k, v]) => ({ k, ...v, kalan: v.once - v.kapanan }));
  const uyarilar = satirlar.filter((s) => s.kalan < KATEGORI_UYARI);

  const no = sonrakiMigrasyonNo();
  const dosya = `${no}_asiri_basit_z1_kapat.sql`;
  const idListe = secilen.map((x) => `  '${x.id}'`).join(',\n');
  const tablo = satirlar.map((s) => `--   ${s.k.padEnd(13)} ${String(s.kapanan).padStart(3)} kapanır · kalan aktif z1 ${s.kalan}`).join('\n');
  fs.writeFileSync(path.join(MIGRASYON_KLASOR, dosya), `-- ============================================================
-- ${no.slice(-3)} — AŞIRI BASİT ZORLUK 1 SORULARI PASİFE ALINDI (${new Date().toISOString().slice(0, 10)})
--
-- Ida: zorluk 1 havuzunda cevabı hiçbir bilgi gerektirmeden mantıktan ya da sözcüğün
-- anlamından belli olan sorular var ("Bir belgeselin amacı nedir?" → Bilgilendirmek).
-- Aktif zorluk 1 soruların tümü (${canli.length}) ${MODEL} ile tarandı
-- (araclar/soru-temizlik/asiri-basit-tara.mjs); karar = asiri_basit VE güven ≥ ${GUVEN_ESIK}
-- olan ${secilen.length} soru kapatılıyor. Tek net olguyu soran kolay sorular kalır.
-- Liste ve gerekçeler: araclar/soru-temizlik/asiri-basit-rapor.csv
--
-- Kategori kırılımı:
${tablo}
--
-- Hiçbiri SİLİNMEDİ; yalnız aktif = false (id listesiyle, metne bağlı değil).
-- Geri alma: docs/asiri-basit-z1-geri-al.sql
-- ============================================================

update public.questions
   set aktif = false
 where aktif and id in (
${idListe}
);
`, 'utf8');
  fs.writeFileSync(GERI_AL_YOLU, `-- ${dosya} geri alma: kapatılan ${secilen.length} aşırı basit zorluk 1 soruyu yeniden açar.
-- Yalnız elle çalıştırılır (migration değildir).
update public.questions
   set aktif = true
 where not aktif and id in (
${idListe}
);
`, 'utf8');

  console.log(`Kapanacak ${secilen.length} soru · migration supabase/migrations/${dosya} (UYGULANMADI)`);
  console.log(`Aktif toplam: önce ${once} → sonra ${once - secilen.length} · aktif zorluk 1: ${canli.length} → ${canli.length - secilen.length}`);
  for (const s of satirlar) console.log(`  ${s.k.padEnd(13)} kapanan ${String(s.kapanan).padStart(3)} · kalan z1 ${s.kalan}${s.kalan < KATEGORI_UYARI ? '  ⚠ < ' + KATEGORI_UYARI : ''}`);
  if (uyarilar.length) console.log(`UYARI: ${uyarilar.map((s) => s.k).join(', ')} kategorisinde aktif zorluk 1 < ${KATEGORI_UYARI}`);
}

(RAPOR ? Promise.resolve().then(rapor) : tara()).catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
