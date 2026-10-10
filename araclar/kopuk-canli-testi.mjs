// 1059 — bağlantı kopması 60 sn: TEK KISA canlı elle doğrulama (11 Eki 2026). Yük/simülasyon değil: tek Ortak Hazine maçı.
// İki gerçek oturum (misafir) birbirini bulur; ilk soruda B sekmesini ~30 sn gizler (görünürlük "hidden" → nabız ve
// yoklama durur, gerçek arka plan sekmesi gibi). Ölçer: maç donuyor mu (tur/faz değişmez), A "Rakibin bağlantısı koptu,
// bekleniyor" + kalan saniyeyi görüyor mu, B dönünce aynı tur/soruda sürüyor mu. Sonra A maçtan çıkar (B kazanır), maç biter.
// Veritabanından yalnız SALT OKUMA (maç satırı, birkaç kez).
// Kullanım: node araclar/kopuk-canli-testi.mjs --a=.arayuz-denetim-oturum.json --b=.kopuk-b-oturum.json [--adres=https://quiztactics.com] [--gizle=30]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const KOK = new URL(ADRES).origin;
const GIZLE_SN = Number(ARG.gizle || 30);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = "") => { if (k) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const durumDosya = (d) => {
  const s = JSON.parse(fs.readFileSync(path.resolve(d), "utf8"));
  s.origins = (s.origins || []).map((o) => ({ ...o, origin: KOK, localStorage: [...(o.localStorage || []).filter((x) => x.name !== "bildim_tanitim"), { name: "bildim_tanitim", value: "1" }] }));
  return s;
};
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const satir = async (id) => (await db.sorgu(`select faz, tur::text tur, soru_id::text soru, durum, (kopuk_at is not null)::text kopuk,
  extract(epoch from now() - kopuk_at)::int::text gecen, coalesce(kazanan::text, '') kazanan from kasa_maclari where id = '${id}'`))[0];

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const yeni = async (dosya) => {
  const b = await tarayici.newContext({ storageState: durumDosya(dosya), viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  return { b, s };
};
const A = await yeni(ARG.a || ".arayuz-denetim-oturum.json");
const B = await yeni(ARG.b || ".kopuk-b-oturum.json");
let macId = null;
try {
  for (const o of [A, B]) await o.s.goto(`${ADRES}/kasa`, { waitUntil: "domcontentloaded", timeout: 45000 });
  for (const o of [A, B]) await o.s.locator(".ks-giris .m2-giris-eylem .qt-dugme").first().waitFor({ timeout: 45000 });
  await Promise.all([A, B].map((o) => o.s.locator(".ks-giris .m2-giris-eylem .qt-dugme").first().click()));
  await Promise.all([A, B].map((o) => o.s.waitForURL(/\/kasa\/[0-9a-f-]{36}/, { timeout: 60000 })));
  const idA = A.s.url().match(/kasa\/([0-9a-f-]{36})/)[1], idB = B.s.url().match(/kasa\/([0-9a-f-]{36})/)[1];
  ok("iki oturum aynı maçta (gerçek-gerçek)", idA === idB, `${idA} / ${idB}`);
  macId = idA;
  console.log("  maç", macId);
  // ilk cevap fazı
  let m;
  for (let i = 0; i < 40; i++) { m = await satir(macId); if (m.faz === "cevap") break; await bekle(1000); }
  ok("cevap fazı geldi", m.faz === "cevap", JSON.stringify(m));
  await bekle(1500);
  const once = await satir(macId);
  // B sekmesini gizle (nabız + yoklama durur)
  await B.s.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const t0 = Date.now();
  console.log(`  B gizlendi (${GIZLE_SN} sn) — tur ${once.tur}`);
  let bantGoruldu = null, donukGoruldu = false, turDegisti = false;
  while (Date.now() - t0 < GIZLE_SN * 1000) {
    await bekle(3000);
    const r = await satir(macId);
    if (r.kopuk === "true") donukGoruldu = true;
    if (r.tur !== once.tur || r.soru !== once.soru || r.durum !== "aktif") turDegisti = true;
    const bant = await A.s.locator(".m2-bant--katman").allInnerTexts().catch(() => []);
    const k = bant.find((x) => /Rakibin bağlantısı koptu, bekleniyor/.test(x));
    if (k && !bantGoruldu) { bantGoruldu = k.replace(/\s+/g, " ").trim(); console.log(`  A ${Math.round((Date.now() - t0) / 1000)}. sn: "${bantGoruldu}"`); }
  }
  ok("maç dondu (kopuk_at yazıldı)", donukGoruldu);
  ok("gizliyken tur/soru değişmedi, maç sürdü", !turDegisti);
  ok("A bandı gördü: 'Rakibin bağlantısı koptu, bekleniyor' + kalan sn", Boolean(bantGoruldu) && /\d+\s*sn/.test(bantGoruldu), bantGoruldu ?? "");
  const kalanSn = Number((bantGoruldu || "").match(/(\d+)\s*sn/)?.[1] ?? 0);
  ok("bant kalanı 60 sn ölçeğinde (≤ 60, > 20)", kalanSn > 20 && kalanSn <= 60, String(kalanSn));
  // B döner
  await B.s.evaluate(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
  let sonra;
  for (let i = 0; i < 15; i++) { await bekle(1000); sonra = await satir(macId); if (sonra.kopuk === "false") break; }
  ok("B döndü → donma çözüldü", sonra.kopuk === "false", JSON.stringify(sonra));
  ok("aynı tur ve aynı soruda sürüyor", sonra.tur === once.tur && sonra.soru === once.soru && sonra.durum === "aktif", JSON.stringify({ once, sonra }));
  await bekle(2000);
  const bantSonra = await A.s.locator(".m2-bant--katman").allInnerTexts().catch(() => []);
  ok("A'da kopuk bandı kalktı", !bantSonra.some((x) => /koptu/.test(x)), bantSonra.join(" | "));
} catch (e) {
  kaldi++; console.log("  ✗ HATA", String(e.message).split("\n")[0]);
} finally {
  // Maçı kapat: A maçtan çıkar (terk → B kazanır). Arayüzdeki çıkış onayı yerine sunucu RPC'si (kasa_terk) A'nın oturumuyla.
  if (macId) {
    try {
      // .env'den adres + anon anahtar; A'nın erişim belirteci kendi tarayıcı deposundan
      const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((x) => x.includes("=")).map((x) => [x.slice(0, x.indexOf("=")).trim(), x.slice(x.indexOf("=") + 1).trim()]));
      const depo = await A.b.storageState();
      const ls = depo.origins.find((o) => o.origin === KOK)?.localStorage ?? [];
      const tok = JSON.parse(ls.find((x) => /^sb-.*-auth-token$/.test(x.name))?.value || "{}").access_token;
      const y = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/kasa_terk`, { method: "POST",
        headers: { "Content-Type": "application/json", apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${tok}` }, body: JSON.stringify({ p_id: macId }) });
      const r = y.status + " " + (await y.text()).slice(0, 120);
      console.log("  kasa_terk:", r);
    } catch (e) { console.log("  terk çağrısı:", e.message); }
    await bekle(3000);
    console.log("  son durum:", JSON.stringify(await satir(macId)));
  }
  await tarayici.close();
  await db.kapat();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
