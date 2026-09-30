// Kademeli açılış (701) canlı testi: iki avatara GELECEK acilis_zamani atar, profil avatar ızgarasında görünmediğini
// ve sunucuda seçilemediğini ölçer, try/finally ile GERİ ALIR. Ayrıca bayrak kapalıyken avatarların özgün adresle
// çizildiğini doğrular. Test hesabı: .arayuz-denetim-oturum.json (misafir). Kullanım: node araclar/avatar-kilit-canli-testi.mjs --adres=http://localhost:5181
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const ADRES = (process.argv.find((a) => a.startsWith("--adres=")) ?? "--adres=http://localhost:5181").slice(8);
const durum = JSON.parse(fs.readFileSync(path.resolve(".arayuz-denetim-oturum.json"), "utf8"));
const kaynak = durum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
const origin = new URL(ADRES).origin;
const DIGER = "/avatars/pro/kopek-k02.svg";   // takılı olmayan hazır avatar
const HAZIR = "/avatars/pro/kedi-k01.svg", KAT = "/avatars/pro2/hostes-y39.svg";   // hostes aktif mi? aşağıda ölçülür
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const ok = (ad, k, ek = "") => { if (k) console.log("  ✓", ad); else { hata++; console.log("  ✗", ad, ek); } };
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  const katAktif = await db.tek(`select aktif from avatar_katalogu where url='${KAT}'`);
  const kilitler = [HAZIR, DIGER, ...(katAktif === "t" ? [KAT] : [])];
  console.log("kilitlenecek:", kilitler.join(", "));
  const baglam = await tarayici.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
    storageState: { cookies: [], origins: [{ origin, localStorage: [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: "tr" }] }] },
  });
  const sayfa = await baglam.newPage();
  const hatalar = [];
  sayfa.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
  const izgara = async () => {
    const kilitCevap = sayfa.waitForResponse((r) => r.url().includes("rpc/avatar_kilitli_urller"), { timeout: 60000 });
    const katCevap = sayfa.waitForResponse((r) => r.url().includes("rpc/avatar_katalogu_oyun"), { timeout: 60000 });
    await sayfa.goto(`${ADRES}/profil`, { waitUntil: "domcontentloaded" });
    await sayfa.getByText("Ayarlar", { exact: true }).first().click({ timeout: 60000 });
    await sayfa.locator(".qt-pf-ayar-satir:has(.qt-pf-avatar-onizleme) button").first().click({ timeout: 60000 });
    await sayfa.waitForSelector(".qt-pf-avatar-izgara", { timeout: 30000 });
    await Promise.all([kilitCevap, katCevap]);
    await sayfa.waitForTimeout(1500);
    return sayfa.evaluate(() => [...document.querySelectorAll(".qt-pf-avatar-sec")].map((b) => b.getAttribute("title")));
  };
  console.log("\n— kilitsiz");
  const once = await izgara();
  console.log("  ızgara:", once.length, "avatar");
  ok("Kedi listede", once.includes("Kedi"));
  ok("ana sayfada avatar özgün adresle çiziliyor (bayrak kapalı)", await sayfa.goto(`${ADRES}/`, { waitUntil: "domcontentloaded" }).then(async () => {
    await sayfa.waitForTimeout(2500);
    const src = await sayfa.evaluate(() => [...document.querySelectorAll(".avatar img")].map((i) => i.getAttribute("src")));
    console.log("  avatar img src:", src.slice(0, 2));
    return src.every((s) => !String(s).startsWith("data:"));
  }));

  await db.sorgu(`update avatar_nitelikleri set acilis_zamani = now() + interval '1 day' where url = any(array[${kilitler.map((u) => `'${u}'`).join(",")}])`);
  console.log("\n— kilitli (gelecek tarih)");
  const sonra = await izgara();
  ok("Kedi (hazır) listede YOK", !sonra.includes("Kedi"));
  if (kilitler.includes(KAT)) ok("Hostes (katalog) listede YOK", !sonra.includes("Hostes"));
  ok("kalan avatar sayısı = önceki − kilitli", sonra.length === once.length - kilitler.length, `${once.length} → ${sonra.length}`);
  // sunucu kapısı: oturumdaki hesabın kimliğiyle avatar_onayla (aynı RPC, SQL üzerinden)
  const benId = await sayfa.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); return JSON.parse(localStorage.getItem(k))?.user?.id ?? null; });
  ok("oturum kimliği okundu", Boolean(benId));
  await db.sorgu(`select set_config('request.jwt.claim.sub', '${benId}', false), set_config('request.jwt.claims', '{"sub":"${benId}","role":"authenticated"}', false)`);
  const takili = await db.tek(`select avatar_url from profiles where id='${benId}'`);
  console.log("  takılı avatar:", takili);
  for (const u of kilitler) {
    let mesaj = null;
    try { await db.sorgu(`select avatar_onayla('${u}')`); } catch (e) { mesaj = e.message; }
    if (u === takili) ok(`takılı ${u} yeniden kaydedilir (mevcut avatar bozulmaz)`, mesaj === null, String(mesaj));
    else ok(`sunucu ${u} seçimini reddeder`, /henüz kullanılamıyor/.test(mesaj ?? ""), String(mesaj));
  }
  await db.sorgu("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false)");
  ok("konsol: beklenmeyen hata yok", hatalar.filter((h) => !/favicon|manifest|realtime|websocket|kilitli-gizle/i.test(h)).length === 0, hatalar.slice(0, 3).join(" | "));
  await baglam.close();
} finally {
  await db.sorgu(`update avatar_nitelikleri set acilis_zamani = null where url in ('${HAZIR}', '${DIGER}', '${KAT}')`);
  const kalan = await db.tek(`select count(*) from avatar_nitelikleri where acilis_zamani is not null`);
  console.log(`\ngeri alındı — açılış tarihi dolu satır: ${kalan} (0 olmalı)`);
  if (kalan !== "0") hata++;
  await db.kapat();
  await tarayici.close();
}
console.log(hata ? `\n${hata} KALDI` : "\nHEPSİ GEÇTİ");
process.exit(hata ? 1 : 0);
