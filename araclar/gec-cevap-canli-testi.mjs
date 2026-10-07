// ============================================================
// 991 GERÇEK İSTEMCİ TESTİ — "sayaç 2 sn gösterirken işaretlenen cevap, 4 sn gecikmeyle varsa da KABUL" (7 Eki 2026)
//
// Ortak Hazine maçı (rakip bot) veritabanında kurulur, test hesabı (ArayuzDenetim890, .arayuz-denetim-oturum.json)
// tarayıcıda /kasa/<id> açar. Her soruda ekrandaki sayaç hedef rakama inince doğru şıkka basılır; kasa_cevap isteği
// tarayıcıdan --gecikme ms BEKLETİLEREK çıkar (yavaş ağ / Supabase takılması). Ölçülen:
//   · istek x-qt-tik başlığını taşıyor mu, sunucu yanıtı (200 / 'Süre doldu'), ekranda hata var mı
//   · cevap veritabanına doğru olarak yazıldı mı (kasa_cevaplari) — sunucu fazı erken kapatmadı mı
//   · sayaç 0'dan sonra şıklar kilitli mi (süre bittikten sonra tıklama gönderilemez)
// Bitince test maçı silinir (kasa_maclari + bağlı satırlar).
// Kullanım: node araclar/gec-cevap-canli-testi.mjs [--adres=http://127.0.0.1:5173] [--gecikme=4000] [--rakam=2] [--soru=2]
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://127.0.0.1:5173").replace(/\/$/, "");
const GECIKME = Number(ARG.gecikme ?? 4000);
const RAKAM = String(ARG.rakam ?? 2);
const SORU = Number(ARG.soru ?? 2);
const AD = String(ARG.hesap || "ArayuzDenetim890");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tek = (s) => db.tek(s);
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

// oturum (localStorage kayıtları)
const veri = JSON.parse(fs.readFileSync(path.resolve(".arayuz-denetim-oturum.json"), "utf8"));
const uid = await tek(`select id::text from profiles where takma_ad = ${alintila(AD)}`);
const koken = veri.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token") && x.value.includes(uid)));
if (!uid || !koken) { console.log(`DUR: ${AD} oturumu yok`); process.exit(1); }
const BOT = await tek(`select id::text from profiles where is_bot order by created_at limit 1`);

let macId = null;
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  await db.sorgu(`update profiles set last_seen = now() where id in (${alintila(uid)}, ${alintila(BOT)})`);
  await db.sorgu(`select set_config('request.jwt.claim.sub', ${alintila(uid)}, false)`);
  macId = await tek(`select kasa_olustur(${alintila(uid)}, ${alintila(BOT)}, false, false)::text`);
  // bot bu testte cevabını sürenin başında verir (A'nın cevabı tek başına bekleniyor)
  console.log("maç:", macId);

  const b = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await b.addInitScript(({ kayitlar }) => {
    try { if (!sessionStorage.getItem("__gc")) { for (const k of kayitlar) localStorage.setItem(k.name, k.value); sessionStorage.setItem("__gc", "1"); } } catch { /* yok */ }
  }, { kayitlar: koken.localStorage });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
  const istekler = [];
  await s.route("**/rest/v1/rpc/kasa_cevap", async (route) => {
    const r = route.request();
    const kayit = { an: Date.now(), tik: r.headers()["x-qt-tik"] ?? null };
    istekler.push(kayit);
    await bekle(GECIKME);                       // yavaş ağ: istek tarayıcıdan GECIKME ms sonra çıkar
    const yanit = await route.fetch();
    kayit.durum = yanit.status(); kayit.govde = (await yanit.text()).slice(0, 160); kayit.bitti = Date.now();
    await route.fulfill({ response: yanit });
  });
  await s.goto(`${ADRES}/kasa/${macId}`, { waitUntil: "domcontentloaded" });

  for (let n = 1; n <= SORU; n++) {
    // soru fazı + ekrandaki sayaç hedef rakamda
    const t0 = Date.now();
    let tur = null;
    while (Date.now() - t0 < 60000) {
      const d = await db.sorgu(`select faz, tur::text from kasa_maclari where id = ${alintila(macId)}`);
      const sayac = (await s.locator(".ks-sayac .qt-sayac-sayi").first().textContent({ timeout: 500 }).catch(() => "")).trim();
      const etkin = await s.locator(".qt-sik:not([disabled])").count().catch(() => 0);
      if (d[0]?.faz === "karar") { await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '10 seconds' where id = ${alintila(macId)}`); }
      if (d[0]?.faz === "cevap" && sayac === RAKAM && etkin >= 2) { tur = d[0].tur; break; }
      await bekle(80);
    }
    if (!tur) { ok(`soru ${n}: sayaç ${RAKAM} görüldü`, false); break; }
    const [dogruS, bitisS] = (await db.sorgu(`select q.dogru_cevap::text d, round(extract(epoch from public.kasa_oyuncu_bitis(k, ${alintila(uid)})) * 1000)::bigint::text b
      from kasa_maclari k join questions q on q.id = k.soru_id where k.id = ${alintila(macId)}`)).map((x) => [x.d, x.b])[0];
    const dogru = Number(dogruS), bitisMs = Number(bitisS);   // bitiş TIKLAMADAN önce (soru çözülünce faz_bitis sonuç fazına geçer)
    const tikAn = Date.now();
    await s.locator(".qt-sik").nth(dogru).click({ timeout: 1500 });
    // yanıt + sonuç
    const t1 = Date.now();
    while (Date.now() - t1 < GECIKME + 15000 && !(istekler.at(-1)?.bitti)) await bekle(100);
    const ist = istekler.at(-1) ?? {};
    let kayit = null;
    for (let i = 0; i < 80 && !kayit; i++) {
      kayit = (await db.sorgu(`select dogru::text, cevap::text from kasa_cevaplari where kasa_id = ${alintila(macId)} and tur = ${tur} and user_id = ${alintila(uid)}`))[0] ?? null;
      if (!kayit) await bekle(250);
    }
    const hataYazi = (await s.locator(".qt-hata, .ks-hata, [role=alert]").allTextContents().catch(() => [])).join(" | ");
    console.log(`  soru ${n}: tık bitişe ${((bitisMs - tikAn) / 1000).toFixed(2)} sn kala · istek bitişten ${((ist.an + GECIKME - bitisMs) / 1000).toFixed(2)} sn sonra çıktı · yanıt ${ist.durum} ${ist.durum === 200 ? "" : ist.govde}`);
    ok(`soru ${n}: istek x-qt-tik taşıyor (tık anı ±1 sn)`, ist.tik && Math.abs(Number(ist.tik) - tikAn) < 1500, String(ist.tik));
    ok(`soru ${n}: istek sunucuya bitişten SONRA vardı (gecikme gerçek)`, ist.an + GECIKME > bitisMs, `${ist.an + GECIKME - bitisMs} ms`);
    ok(`soru ${n}: sunucu KABUL etti (200)`, ist.durum === 200, ist.govde);
    ok(`soru ${n}: cevap doğru olarak kaydedildi`, kayit?.dogru === "true", JSON.stringify(kayit));
    ok(`soru ${n}: ekranda hata yok`, !/Süre doldu|cevap verilemez/i.test(hataYazi), hataYazi);
  }

  // süre bittikten sonra: şıklar kilitli (tık gönderilemez)
  {
    const t0 = Date.now(); let goruldu = false;
    while (Date.now() - t0 < 60000) {
      const d = await db.sorgu(`select faz from kasa_maclari where id = ${alintila(macId)}`);
      if (d[0]?.faz === "karar") await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '10 seconds' where id = ${alintila(macId)}`);
      const sayac = (await s.locator(".ks-sayac .qt-sayac-sayi").first().textContent({ timeout: 500 }).catch(() => "")).trim();
      if (d[0]?.faz === "cevap" && sayac === "0") { goruldu = true; break; }
      await bekle(100);
    }
    const once = istekler.length;
    const etkin = await s.locator(".qt-sik:not([disabled])").count().catch(() => 0);
    await s.locator(".qt-sik").first().click({ timeout: 800, force: true }).catch(() => {});
    await bekle(600);
    ok("sayaç 0: şıklar kilitli, tık istek göndermedi", goruldu && etkin === 0 && istekler.length === once, `goruldu=${goruldu} etkin=${etkin} istek=${istekler.length - once}`);
  }
  ok("konsolda hata yok", konsol.filter((m) => !/favicon|ERR_ABORTED|Failed to load resource/i.test(m)).length === 0, konsol.join(" ¦ "));
} catch (e) {
  kaldi++; console.error("HATA:", e.message);
} finally {
  await tarayici.close().catch(() => {});
  if (macId) {
    try {
      await db.sorgu(`delete from joker_kullanimlari where mac_id = ${alintila(macId)}`);
      await db.sorgu(`delete from kasa_maclari where id = ${alintila(macId)}`);
      console.log("test maçı silindi");
    } catch (e) { console.log("TEMİZLİK HATASI:", e.message); }
  }
  console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
