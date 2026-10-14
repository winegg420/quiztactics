// E-posta KODU canlı duman testi — TEK seferlik, tek geçici hesap; iş bitince hesap silinir.
//
//   IZIN_CANLI_TEST=1 node araclar/eposta-kod-canli-duman.mjs
//
// Ne ölçer: canlı Auth, e-postadaki kodla (verifyOtp type "email") oturum açıyor mu, kodun uzunluğu kaç.
// E-posta GÖNDERİLMEZ: kod admin generate_link ile alınır (aynı OTP). Yetki/güvenlik ayarına dokunmaz.
// Anahtarlar .env.local'dan okunur (araclar/test-oturumu.mjs ile aynı), hiçbir yere yazılmaz.
import fs from "node:fs";
import crypto from "node:crypto";

if (process.env.IZIN_CANLI_TEST !== "1") { console.error("Canlı test: IZIN_CANLI_TEST=1 ile çalıştır."); process.exit(1); }
const E = {};
for (const d of [".env.local", ".env"]) {
  try { for (const m of fs.readFileSync(d, "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) if (!(m[1] in E)) E[m[1]] = m[2].trim(); } catch { /* yok */ }
}
const URL_ = E.SUPABASE_YENI_URL || E.VITE_SUPABASE_URL;
const SERVIS = E.SUPABASE_YENI_SERVICE_ROLE_KEY;
const ANON = E.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !SERVIS || !ANON) { console.error("! .env.local anahtarları eksik"); process.exit(1); }

async function istek(yol, { yontem = "GET", govde, anahtar = SERVIS, belirtec = SERVIS, sessiz = false } = {}) {
  const r = await fetch(`${URL_}${yol}`, { method: yontem, headers: { apikey: anahtar, Authorization: `Bearer ${belirtec}`, "Content-Type": "application/json" },
    body: govde ? JSON.stringify(govde) : undefined });
  const metin = await r.text();
  let veri = null; try { veri = metin ? JSON.parse(metin) : null; } catch { veri = metin; }
  if (!r.ok && !sessiz) throw new Error(`${yontem} ${yol} → ${r.status} ${String(metin).slice(0, 160)}`);
  return { durum: r.status, veri };
}

const eposta = `qt-test-${crypto.randomBytes(5).toString("hex")}@example.com`;
let id = null;
let erisim = null;
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };

try {
  const kul = await istek("/auth/v1/admin/users", { yontem: "POST", govde: { email: eposta, email_confirm: true, user_metadata: { test_hesabi: true } } });
  id = kul.veri.id;
  const link = await istek("/auth/v1/admin/generate_link", { yontem: "POST", govde: { type: "magiclink", email: eposta } });
  const kod = link.veri?.properties?.email_otp ?? link.veri?.email_otp;
  sonuc("kod üretildi", /^\d+$/.test(String(kod ?? "")), `uzunluk=${String(kod ?? "").length}`);

  const yanlis = await istek("/auth/v1/verify", { yontem: "POST", anahtar: ANON, belirtec: ANON, sessiz: true,
    govde: { type: "email", email: eposta, token: String(kod).split("").reverse().join("") } });
  sonuc("yanlış kod reddedildi", yanlis.durum >= 400, `HTTP ${yanlis.durum} ${yanlis.veri?.error_code ?? yanlis.veri?.msg ?? ""}`);

  const dogru = await istek("/auth/v1/verify", { yontem: "POST", anahtar: ANON, belirtec: ANON, sessiz: true,
    govde: { type: "email", email: eposta, token: String(kod) } });
  erisim = dogru.veri?.access_token ?? null;
  sonuc("doğru kod → oturum (type=email)", dogru.durum === 200 && Boolean(erisim), `HTTP ${dogru.durum}`);
} catch (e) {
  hata++;
  console.error("✗ beklenmeyen hata:", e?.message ?? e);
} finally {
  if (id) {
    let uygulama = "atlandı";
    if (erisim) {
      const s = await istek("/rest/v1/rpc/hesabimi_sil", { yontem: "POST", anahtar: ANON, belirtec: erisim, govde: {}, sessiz: true }).catch(() => null);
      uygulama = s && s.durum < 300 ? "hesabimi_sil tamam" : `hesabimi_sil HTTP ${s?.durum}`;
    }
    const var_ = await istek(`/auth/v1/admin/users/${id}`, { sessiz: true });
    let auth = "zaten silinmiş";
    if (var_.durum === 200) {
      const d = await istek(`/auth/v1/admin/users/${id}`, { yontem: "DELETE", sessiz: true });
      auth = d.durum < 300 ? "admin ile silindi" : `SİLİNEMEDİ HTTP ${d.durum}`;
    }
    const son = await istek(`/auth/v1/admin/users/${id}`, { sessiz: true });
    sonuc(`test hesabı temizlendi (${uygulama} · auth ${auth})`, son.durum === 404);
  }
}
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
