// /ses-secim adaylarını Supabase Storage `ses-adaylar` kovasına yükler (migration 1000) ve
// aday id → kova dosya adı eşlemesini oyun/lib/sesAdayKova.js'e ÜRETİR.
//
// Kaynak: araclar/ses-adaylar-kaynak/ (dağıtıma girmez). Dosya adı içerik sürümlü:
// <aday>-<sha256 ilk 10>.<uzantı> → dosya değişirse ad da değişir, tarayıcı/SW önbelleği bayatlamaz.
// Yükleme cacheControl = 1 yıl. Kovada zaten olan dosya (aynı ad = aynı içerik) atlanır.
//
// Kullanım:
//   node araclar/ses-adaylari-yukle.mjs --kuru   # ağa gitmez: listeyi yazar + eşlemeyi üretir
//   node araclar/ses-adaylari-yukle.mjs          # yükler, hepsi başarılıysa eşlemeyi üretir
//
// Anahtar: .env.local › SUPABASE_SERVICE_ROLE_KEY (yalnız bu makinede; ASLA yazdırılmaz/loglanmaz).
// Adres: .env.local ya da .env › VITE_SUPABASE_URL.
// SIRA: önce migration 1000 uygulanır, sonra bu araç çalışır, ANCAK ONDAN SONRA push edilir.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KAYNAK = path.join(KOK, "araclar", "ses-adaylar-kaynak");
const CIKTI = path.join(KOK, "oyun", "lib", "sesAdayKova.js");
const KOVA = "ses-adaylar";
const TUR = { wav: "audio/wav", mp3: "audio/mpeg", aac: "audio/aac" };
const SINIR = 10 * 1024 * 1024;   // kova file_size_limit
const kuru = process.argv.includes("--kuru");

/** .env dosyasını okur (yoksa boş). Değerler yalnız bellekte kalır. */
function envOku(ad) {
  try {
    const sonuc = {};
    for (const satir of fs.readFileSync(path.join(KOK, ad), "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(satir);
      if (m) sonuc[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return sonuc;
  } catch {
    return {};
  }
}

/** Kaynak klasördeki ses dosyaları → [{id, uzanti, ad, boy, tur, yol}] (ada göre sıralı). */
function dosyalariTopla() {
  const liste = [];
  for (const dosya of fs.readdirSync(KAYNAK).sort()) {
    const m = /^([a-z0-9_]+-(?:k\d+|p\d+|\d+))\.(wav|mp3|aac)$/.exec(dosya);
    if (!m) { if (!dosya.startsWith(".")) console.warn(`atlandı (ad kalıbı dışında): ${dosya}`); continue; }
    const yol = path.join(KAYNAK, dosya);
    const icerik = fs.readFileSync(yol);
    if (icerik.length > SINIR) throw new Error(`${dosya}: ${icerik.length} bayt — kova sınırı 10 MB`);
    const sha = crypto.createHash("sha256").update(icerik).digest("hex").slice(0, 10);
    liste.push({ id: m[1], uzanti: m[2], ad: `${m[1]}-${sha}.${m[2]}`, boy: icerik.length, tur: TUR[m[2]], yol });
  }
  return liste;
}

/** Eşleme modülünü yazar (muzikParcalari.js deseni: tek KOVA sabiti). */
function eslemeYaz(liste) {
  const satirlar = liste.map((d) => `  ${JSON.stringify(d.id)}: ${JSON.stringify(d.ad)},`).join("\n");
  const metin = `// ÜRETİLDİ — araclar/ses-adaylari-yukle.mjs. ELLE DÜZENLEME; aracı yeniden çalıştır.
// /ses-secim adayları Supabase Storage \`ses-adaylar\` kovasında (migration 1000, 8 Eki 2026) —
// site dağıtımına (dist/) GİRMEZ. Ad içerik sürümlü (<aday>-<sha10>.<uzantı>), cache 1 yıl.
// Kaynak kopyalar: araclar/ses-adaylar-kaynak/ · lisanslar: docs/ses-kaynaklari.md.
// Cihaz önbelleği: public/sw.js › qt-ses-aday-v1 (yol deseni orada).

/** Aday id → kovadaki dosya adı. */
const DOSYA = {
${satirlar}
};

// SES ADAYLARI TABAN ADRESİ — TEK YER. Adres yoksa (VITE_SUPABASE_URL boş) null döner,
// çağıran yedeğe düşer (efekt: osilatör tonu; müzik önizlemesi: çalmaz).
const KOVA = \`\${String(import.meta.env?.VITE_SUPABASE_URL ?? "").replace(/\\/$/, "")}/storage/v1/object/public/${KOVA}/\`;

/** Adayın herkese açık adresi; bilinmiyorsa ya da adres yoksa null. */
export const sesAdayUrl = (id) => (DOSYA[id] && KOVA.startsWith("http") ? KOVA + DOSYA[id] : null);
`;
  fs.writeFileSync(CIKTI, metin);
  console.log(`eşleme yazıldı: ${path.relative(KOK, CIKTI)} (${liste.length} aday)`);
}

/** Tek dosyayı yükler. true = yüklendi, "var" = kovada zaten var. */
async function yukle(adres, anahtar, d) {
  const cevap = await fetch(`${adres}/storage/v1/object/${KOVA}/${encodeURIComponent(d.ad)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anahtar}`,
      apikey: anahtar,
      "Content-Type": d.tur,
      "cache-control": "max-age=31536000",
      "x-upsert": "false",
    },
    body: fs.readFileSync(d.yol),
  });
  if (cevap.ok) return true;
  const govde = await cevap.text().catch(() => "");
  // Aynı ad = aynı içerik (sha): kovada varsa dokunma.
  if (cevap.status === 409 || /"statusCode"\s*:\s*"409"|Duplicate|already exists/i.test(govde)) return "var";
  throw new Error(`HTTP ${cevap.status} ${govde.slice(0, 200)}`);
}

async function ana() {
  const liste = dosyalariTopla();
  const toplam = liste.reduce((t, d) => t + d.boy, 0);
  console.log(`${liste.length} dosya, ${(toplam / 1024 / 1024).toFixed(1)} MB (${path.relative(KOK, KAYNAK)})`);

  if (kuru) {
    for (const d of liste) console.log(`  ${d.ad}  ${d.tur}  ${d.boy} B`);
    eslemeYaz(liste);
    console.log("--kuru: ağa istek gitmedi.");
    return;
  }

  const env = { ...envOku(".env"), ...envOku(".env.local") };
  const anahtar = env.SUPABASE_SERVICE_ROLE_KEY;
  const adres = String(env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!anahtar) {
    console.error("DUR: .env.local içinde SUPABASE_SERVICE_ROLE_KEY yok. Ida: anahtarı .env.local'e ekle\n"
      + "(Supabase panosu › Project Settings › API › service_role), sonra aracı yeniden çalıştır.");
    process.exit(2);
  }
  if (!/^https:\/\//.test(adres)) { console.error("DUR: VITE_SUPABASE_URL bulunamadı (.env / .env.local)."); process.exit(2); }

  let yeni = 0, var_ = 0;
  const hatalar = [];
  // Sırayla (paralel değil): canlı Supabase'e yük bindirme.
  for (const d of liste) {
    try {
      const s = await yukle(adres, anahtar, d);
      if (s === "var") var_ += 1; else yeni += 1;
      process.stdout.write(s === "var" ? "=" : ".");
    } catch (e) {
      hatalar.push(`${d.ad}: ${e.message}`);
      process.stdout.write("x");
    }
  }
  console.log(`\nyüklendi ${yeni} · zaten vardı ${var_} · hata ${hatalar.length}`);
  if (hatalar.length) {
    for (const h of hatalar) console.error("  " + h);
    console.error("Eşleme YAZILMADI — hataları gider, aracı yeniden çalıştır (yüklenenler atlanır).");
    process.exit(1);
  }
  eslemeYaz(liste);
}

ana().catch((e) => { console.error("ses-adaylari-yukle:", e.message); process.exit(1); });
