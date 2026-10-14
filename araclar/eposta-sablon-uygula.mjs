// Supabase Auth e-posta şablonlarını bir JSON dosyasından uygular (Management API PATCH /config/auth).
//
//   ileri:     node araclar/eposta-sablon-uygula.mjs docs/eposta-sablon-kodlu-20261014.json
//   geri alma: node araclar/eposta-sablon-uygula.mjs docs/eposta-sablon-yedek-20261014.json
//
// Belirteç SUPABASE_PAT ortam değişkeninden okunur (Supabase CLI'nin Windows Kimlik Yöneticisi kaydı;
// hiçbir dosyaya/çıktıya yazılmaz). YALNIZ mailer_templates_* ve mailer_subjects_* anahtarları
// gönderilir — dosyada başka alan olsa da (yedekte site_url vb.) dokunulmaz. Uygulamadan sonra
// tekrar okuyup her anahtarın eşleştiğini doğrular.
import fs from "node:fs";

const REF = "etezccrifaetzrgfvawl";
const dosya = process.argv[2];
if (!dosya || !process.env.SUPABASE_PAT) {
  console.error("kullanım: SUPABASE_PAT=… node araclar/eposta-sablon-uygula.mjs <json>");
  process.exit(1);
}
const ham = JSON.parse(fs.readFileSync(dosya, "utf8"));
const govde = Object.fromEntries(
  Object.entries(ham).filter(([k, v]) => /^mailer_(templates|subjects)_/.test(k) && !/custom_contents$/.test(k) && typeof v === "string"),
);
const adres = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const baslik = { Authorization: `Bearer ${process.env.SUPABASE_PAT}`, "Content-Type": "application/json" };

try {
  const r = await fetch(adres, { method: "PATCH", headers: baslik, body: JSON.stringify(govde) });
  if (!r.ok) throw new Error(`PATCH ${r.status}: ${(await r.text()).slice(0, 200)}`);
  // PATCH'ten hemen sonraki okuma eski değeri döndürebiliyor (14 Eki 2026 ölçümü): en çok 3 kez, 4 sn arayla.
  let tamam = 0;
  for (let deneme = 1; deneme <= 3; deneme++) {
    await new Promise((coz) => setTimeout(coz, 4000));
    const t = await (await fetch(adres, { headers: baslik })).json();
    const eksik = Object.entries(govde).filter(([k, v]) => t[k] !== v).map(([k]) => k);
    tamam = Object.keys(govde).length - eksik.length;
    if (!eksik.length) break;
    if (deneme === 3) eksik.forEach((k) => console.log("✗ eşleşmedi:", k));
  }
  console.log(`${tamam}/${Object.keys(govde).length} anahtar uygulandı ve doğrulandı`);
  process.exit(tamam === Object.keys(govde).length ? 0 : 1);
} catch (e) {
  console.error("[eposta-sablon] başarısız:", e?.message ?? e);
  process.exit(1);
}
