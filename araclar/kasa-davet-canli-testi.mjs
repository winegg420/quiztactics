// ============================================================
// KASA 957 — arkadaşa meydan okuma + rövanş + tepki, gerçek tarayıcıda uçtan uca (iki oturum).
//
// Akış (A ve B iki ayrı tarayıcı bağlamı; oturumlar .arayuz-denetim-oturum*.json'dan):
//   0) Hazırlık (DB, yalnız test hesapları): A-B arkadaş değilse arkadaş yapılır (sonda geri silinir), ikisinin
//      bekleyen Kasa davetleri ve süren Kasa maçları kapatılır.
//   1) Arkadaşlar: A → B satırı "Oyna" → mod penceresinde Kasa kartı → satırda "Kasa daveti gönderildi" şeridi.
//   2) B ana sayfada davet bandı ("Kasa maçına") → Kabul Et → B /kasa/<id>; A kabul bildirimiyle aynı maça girer.
//   3) Maç DB'de bitirilir (kasa_bitir) → iki tarafta maç sonu: Rövanş düğmesi + arkadaş geçmişi (ezeli).
//   4) A Rövanş → bekleme penceresi; B "rövanş istiyor" → Kabul et → ikisi de YENİ maça geçer (onceki_id).
//   5) Meydan: A Kasa modunu seçip B'ye meydan okur → B "Sana gelen davetler"de Kasa kartı → Reddet;
//      A yeniden davet eder → "Gönderdiğin"de Geri al.
//   6) Antrenman: A açık botla Kasa → maç ekranında tepki düğmesi (tepki_acik_modlar: antrenman).
//   Her sayfada yatay taşma ve konsol hatası ölçülür. Açılan maçlar sonda iptal edilir.
//
// Kullanım: node araclar/kasa-davet-canli-testi.mjs [--adres=http://localhost:5188] [--boyut=390x844] [--dil=tr]
//           [--a=ArayuzDenetim648] [--b=ArayuzDenetim327] [--azalt] [--ss]
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5188").replace(/\/$/, "");
const KOKEN = new URL(ADRES).origin;
const AD_A = String(ARG.a || "ArayuzDenetim648");
const AD_B = String(ARG.b || "ArayuzDenetim327");
const [GEN, YUK] = String(ARG.boyut || "390x844").split("x").map(Number);
const DIL = String(ARG.dil || "tr");
const EN = DIL === "en";
const AZALT = Boolean(ARG.azalt);
const SS = Boolean(ARG.ss);
const ETIKET = `${DIL}-${GEN}${AZALT ? "-azalt" : ""}`;
const CIKTI = path.resolve(".tmp");
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const BAS = Date.now();
const sn = () => ((Date.now() - BAS) / 1000).toFixed(1);
// Metin eşleşmeleri iki dilde: profil dili "tr" olan hesap --dil=en ile de Türkçe çizer
const kac = (x) => (x instanceof RegExp ? x.source : x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const M = (tr, en) => new RegExp(`(?:${kac(tr)})|(?:${kac(en)})`);

async function db(sql) {
  const i = await new PgIstemci(await baglantiDizgisi()).baglan();
  try { const r = await i.sorgu(sql); return Array.isArray(r) ? r : (r?.rows ?? []); } finally { await i.kapat().catch(() => {}); }
}

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const adim = (m) => console.log(`· +${sn()}s ${m}`);

// ---------------------------------------------------------------- hesaplar
const kokenler = [];
for (const dosya of [".arayuz-denetim-oturum.json", ".arayuz-denetim-oturum-en.json"].map((d) => path.resolve(d))) {
  if (!fs.existsSync(dosya)) continue;
  for (const o of JSON.parse(fs.readFileSync(dosya, "utf8")).origins ?? []) {
    const j = o.localStorage?.find((x) => x.name.includes("auth-token"));
    let uid = null;
    try { uid = JSON.parse(j.value).user?.id ?? null; } catch { /* yok */ }
    if (uid) kokenler.push({ dosya, origin: o.origin, uid, kayitlar: o.localStorage ?? [] });
  }
}
const adlar = await db(`select id, takma_ad, gorunen_ad from profiles where id in (${kokenler.map((k) => alintila(k.uid)).join(",")})`);
for (const k of kokenler) { const a = adlar.find((x) => x.id === k.uid); k.ad = a?.takma_ad ?? null; k.gorunen = a?.gorunen_ad ?? null; }
const hA = kokenler.find((k) => k.ad === AD_A);
const hB = kokenler.find((k) => k.ad === AD_B);
if (!hA || !hB) { console.log(`DUR: oturum yok (bulunan: ${kokenler.map((k) => k.ad).join(", ")})`); process.exit(1); }
const ACIK_BOT = (await db(`select id, gorunen_ad from profiles where is_bot and coalesce(acik_bot, false) and coalesce(bot_aktif, true) order by id limit 1`))[0];

// ---------------------------------------------------------------- 0) hazırlık (yalnız test hesapları)
const ciftKosul = (t, a, b) => `((${t}.oyuncu1 = ${alintila(a)} and ${t}.oyuncu2 = ${alintila(b)}) or (${t}.oyuncu1 = ${alintila(b)} and ${t}.oyuncu2 = ${alintila(a)}))`;
async function temizle() {
  await db(`update kasa_davetleri set durum = 'iptal', yanit_at = now() where durum = 'bekliyor' and (kuran in (${alintila(hA.uid)}, ${alintila(hB.uid)}) or rakip in (${alintila(hA.uid)}, ${alintila(hB.uid)}))`);
  await db(`update kasa_maclari set durum = 'iptal', bitis = now() where durum = 'aktif' and (oyuncu1 in (${alintila(hA.uid)}, ${alintila(hB.uid)}) or oyuncu2 in (${alintila(hA.uid)}, ${alintila(hB.uid)}))`);
}
const arkadasVardi = (await db(`select 1 from friendships where durum = 'arkadas' and ((requester = ${alintila(hA.uid)} and addressee = ${alintila(hB.uid)}) or (requester = ${alintila(hB.uid)} and addressee = ${alintila(hA.uid)}))`)).length > 0;
await db(`delete from engellemeler where (engelleyen = ${alintila(hA.uid)} and engellenen = ${alintila(hB.uid)}) or (engelleyen = ${alintila(hB.uid)} and engellenen = ${alintila(hA.uid)})`);
if (!arkadasVardi) {
  await db(`delete from friendships where (requester = ${alintila(hA.uid)} and addressee = ${alintila(hB.uid)}) or (requester = ${alintila(hB.uid)} and addressee = ${alintila(hA.uid)})`);
  await db(`insert into friendships (requester, addressee, durum) values (${alintila(hA.uid)}, ${alintila(hB.uid)}, 'arkadas')`);
}
await temizle();
console.log(`A=${hA.ad} (${hA.gorunen}) · B=${hB.ad} (${hB.gorunen}) · ${ADRES} · ${GEN}x${YUK} ${DIL}${AZALT ? " azaltılmış" : ""}${arkadasVardi ? "" : " · arkadaşlık test için kuruldu"}`);

// ---------------------------------------------------------------- tarayıcı
const HAZIRLIK = ({ kayitlar, koken, dil }) => {
  try {
    if (location.origin === koken && !sessionStorage.getItem("__kdTesti")) {
      for (const k of kayitlar) localStorage.setItem(k.name, k.value);
      localStorage.setItem("bildim_dil", dil);
      sessionStorage.setItem("__kdTesti", "1");
    }
  } catch { /* depolama kapalı */ }
};
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const konsol = { A: [], B: [] };
async function bagla(ad, h) {
  const b = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: GEN, height: YUK }, deviceScaleFactor: 2,
    locale: EN ? "en-US" : "tr-TR", timezoneId: "Europe/Istanbul", reducedMotion: AZALT ? "reduce" : "no-preference" });
  await b.addInitScript(HAZIRLIK, { kayitlar: h.kayitlar, koken: KOKEN, dil: DIL });
  const s = await b.newPage();
  s.on("console", (m) => { if (m.type() === "error") konsol[ad].push(m.text().replace(/\s+/g, " ").slice(0, 200)); });
  s.on("pageerror", (e) => konsol[ad].push("SAYFA: " + String(e).split("\n")[0].slice(0, 200)));
  return { ad, b, s, h };
}
const A = await bagla("A", hA);
const B = await bagla("B", hB);
const git = async (o, yol) => { await o.s.goto(ADRES + yol, { waitUntil: "domcontentloaded" }); await o.s.waitForTimeout(1800); };
const kapatPencereler = async (o) => {
  for (let i = 0; i < 4; i++) {
    const d = o.s.getByRole("button", { name: /^(Atla|Anladım|Geç|Tamam|Skip|Got it|OK)$/ });
    if (!(await d.count())) return;
    await d.first().click({ timeout: 1500 }).catch(() => {});
    await bekle(300);
  }
};
const tasma = (o) => o.s.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const yolBekle = async (o, re, ms = 20000) => { try { await o.s.waitForURL(re, { timeout: ms }); return true; } catch { return false; } };
const macId = (o) => (o.s.url().match(new RegExp("/kasa/(" + UUID.source + ")")) || [])[1] ?? null;
const goruntu = async (o, ad) => { if (SS) await o.s.screenshot({ path: path.join(CIKTI, `kasa-davet-${ETIKET}-${ad}.jpg`), type: "jpeg", quality: 60 }).catch(() => {}); };
const acilanMaclar = new Set();

try {
  fs.mkdirSync(CIKTI, { recursive: true });
  // ---------------------------------------------------------------- 1) Arkadaşlar → Oyna → Kasa
  console.log("1) Arkadaşlar sayfasından Kasa daveti");
  await git(A, "/arkadaslar"); await kapatPencereler(A);
  ok("A arkadaşlar: yatay taşma yok", !(await tasma(A)));
  const satir = A.s.locator("li, [role=listitem], .qt-liste-satiri").filter({ hasText: hB.gorunen }).filter({ has: A.s.getByRole("button", { name: M("Oyna", "Play") }) }).first();
  await satir.getByRole("button", { name: M("Oyna", "Play") }).first().click({ timeout: 8000 });
  const kasaKart = A.s.locator(".a-modsecim .qt-mod--kasa");
  ok("mod penceresinde Kasa kartı var", await kasaKart.count() === 1);
  await goruntu(A, "1-mod-penceresi");
  await kasaKart.click();
  const serit = A.s.locator(".ar-bekleyen").filter({ hasText: M("Kasa daveti gönderildi", "Vault invite sent") });
  ok("A: satırda 'Kasa daveti gönderildi · yanıt bekleniyor' şeridi", await serit.first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false));
  const davet1 = (await db(`select id from kasa_davetleri where kuran = ${alintila(hA.uid)} and rakip = ${alintila(hB.uid)} and durum = 'bekliyor'`))[0]?.id;
  ok("DB: kasa_davetleri bekliyor satırı", Boolean(davet1));
  adim("davet gönderildi");

  // ---------------------------------------------------------------- 2) B bant → kabul
  console.log("2) B davet bandından kabul eder");
  await git(B, "/"); await kapatPencereler(B);
  const bant = B.s.locator(".a-davet-kabul");
  ok("B: davet bandı görünür ve 'Kasa maçına' der", await bant.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    && /Kasa maçına|Vault match/.test(await B.s.locator("body").innerText()), "");
  await goruntu(B, "2-bant");
  await bant.click();
  const bGirdi = await yolBekle(B, /\/kasa\/[0-9a-f-]{36}/);
  const mac1 = macId(B);
  if (mac1) acilanMaclar.add(mac1);
  ok("B kabul → /kasa/<maç>", bGirdi && Boolean(mac1), B.s.url());
  const aGirdi = await yolBekle(A, new RegExp(`/kasa/${mac1}`), 20000);
  ok("A kabul bildirimiyle aynı maça girdi", aGirdi, A.s.url());
  const dm = (await db(`select durum, davetli, dereceli from kasa_maclari where id = ${alintila(mac1)}`))[0];
  ok("DB: maç aktif, davetli", dm?.durum === "aktif" && ["true", "t"].includes(String(dm?.davetli)), JSON.stringify(dm));
  adim("maç başladı " + mac1);

  // ---------------------------------------------------------------- 3) bitir → maç sonu
  console.log("3) Maç biter (DB) → maç sonu: rövanş + ezeli");
  await A.s.waitForTimeout(3000);
  await db(`select kasa_bitir(${alintila(mac1)}, ${alintila(hA.uid)}, 'hedef')`);
  await db(`select kasa_sinyal_ver(${alintila(mac1)})`);
  const rovDugme = (o) => o.s.getByRole("button", { name: M(/^Rövanş$/, /^Rematch$/) });
  const aSon = await rovDugme(A).waitFor({ timeout: 25000 }).then(() => true).catch(() => false);
  const bSon = await rovDugme(B).waitFor({ timeout: 25000 }).then(() => true).catch(() => false);
  ok("A ve B maç sonunda Rövanş düğmesi", aSon && bSon);
  await A.s.locator(".bd-duello-ezeli").waitFor({ timeout: 8000 }).catch(() => {});
  ok("arkadaş geçmişi (ezeli) satırı görünür", await A.s.locator(".bd-duello-ezeli").count() === 1
    && /\d+-\d+/.test(await A.s.locator(".bd-duello-ezeli").innerText()), await A.s.locator(".bd-duello-ezeli").innerText().catch(() => "yok"));
  ok("maç sonu: yatay taşma yok (A, B)", !(await tasma(A)) && !(await tasma(B)));
  await goruntu(A, "3-mac-sonu");

  // ---------------------------------------------------------------- 4) rövanş
  console.log("4) Rövanş: A ister, B kabul eder");
  await rovDugme(A).click();
  ok("A: rövanş bekleme penceresi", await A.s.locator(".m2-rovans").waitFor({ timeout: 8000 }).then(() => true).catch(() => false));
  await goruntu(A, "4-rovans-bekle");
  const soru = B.s.locator(".m2-rovans-soru");
  ok("B: 'rövanş istiyor' + Kabul et", await soru.waitFor({ timeout: 12000 }).then(() => true).catch(() => false));
  await goruntu(B, "4-rovans-soru");
  await B.s.getByRole("button", { name: M(/^Kabul et$/, /^Accept$/) }).click();
  const bYeni = await yolBekle(B, (u) => /\/kasa\/[0-9a-f-]{36}/.test(String(u)) && !String(u).includes(mac1), 15000);
  const mac2 = macId(B);
  if (mac2) acilanMaclar.add(mac2);
  const aYeni = await yolBekle(A, new RegExp(`/kasa/${mac2}`), 15000);
  ok("ikisi de yeni rövanş maçına geçti", bYeni && aYeni && mac2 && mac2 !== mac1, `${A.s.url()} | ${B.s.url()}`);
  const dr = (await db(`select onceki_id from kasa_maclari where id = ${alintila(mac2)}`))[0];
  ok("DB: rövanş maçının onceki_id = ilk maç", dr?.onceki_id === mac1, JSON.stringify(dr));
  await db(`update kasa_maclari set durum = 'iptal', bitis = now() where id = ${alintila(mac2)} and durum = 'aktif'`);
  await db(`select kasa_sinyal_ver(${alintila(mac2)})`);

  // ---------------------------------------------------------------- 5) Meydan: davet → red → geri al
  console.log("5) Meydan sayfası: Kasa modu, red, geri al");
  await git(A, "/meydan"); await kapatPencereler(A);
  const kasaCip = A.s.locator(".a-meydan-modlar .qt-mod--kasa");
  ok("Meydan: mod seçiminde Kasa kartı", await kasaCip.count() === 1);
  await kasaCip.click();
  ok("özet çipi 'Kasa'", /Kasa|Vault/.test(await A.s.locator(".a-meydan-ozet").innerText()));
  const kart = A.s.locator(".a-meydan-kisi--arkadas").filter({ hasText: hB.gorunen }).first();
  await kart.getByRole("button", { name: M("Meydan oku", "Challenge") }).click({ timeout: 8000 });
  ok("A: Kasa daveti toastı", await A.s.getByText(M("Kasa daveti gönderildi", "Vault invite sent"), { exact: false }).first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false));
  ok("A: 'Gönderdiğin' listesinde Kasa satırı", await A.s.getByText(M("Kasa · yanıt bekleniyor", "Vault · waiting for reply"), { exact: false }).first().waitFor({ timeout: 8000 }).then(() => true).catch(() => false));
  ok("Meydan: yatay taşma yok", !(await tasma(A)));
  await git(B, "/meydan"); await kapatPencereler(B);
  const gelen = B.s.locator(".qt-oyk--ton-kasa");
  ok("B: 'Sana gelen davetler'de Kasa kartı", await gelen.first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false));
  await goruntu(B, "5-gelen");
  await gelen.first().locator(".a-meydan-ret").click();
  ok("B reddetti → DB durum red", await (async () => { for (let i = 0; i < 20; i++) { const r = await db(`select count(*)::int n from kasa_davetleri where kuran = ${alintila(hA.uid)} and rakip = ${alintila(hB.uid)} and durum = 'red' and yanit_at > now() - interval '1 minute'`); if (Number(r[0]?.n) > 0) return true; await bekle(500); } return false; })());
  const aSatirKalkti = await A.s.getByText(M("Kasa · yanıt bekleniyor", "Vault · waiting for reply")).first().waitFor({ state: "detached", timeout: 10000 }).then(() => true).catch(() => false);
  ok("A: reddedilen davet 'Gönderdiğin'den canlı düştü (Realtime)", aSatirKalkti);
  // yeniden davet → geri al
  await kart.getByRole("button", { name: M("Meydan oku", "Challenge") }).click({ timeout: 8000 });
  await A.s.waitForTimeout(1500);
  await goruntu(A, "5-yeniden-davet");
  const hataMetni = await A.s.locator(".a-meydan-hata").allInnerTexts().catch(() => []);
  if (hataMetni.length) console.log("     sayfa hatası:", hataMetni.join(" | "));
  const satirK = A.s.locator(".qt-liste-satiri, li").filter({ hasText: M("Kasa · yanıt bekleniyor", "Vault · waiting for reply") }).first();
  await satirK.waitFor({ timeout: 8000 }).catch(() => {});
  await A.s.getByRole("button", { name: M(/^Geri al$/, /^(Undo|Withdraw|Take back)$/) }).first().click({ timeout: 5000 }).catch((e) => ok("Geri al düğmesi", false, e.message.split("\n")[0]));
  ok("A geri aldı → DB durum iptal", await (async () => { for (let i = 0; i < 20; i++) { const r = await db(`select count(*)::int n from kasa_davetleri where kuran = ${alintila(hA.uid)} and rakip = ${alintila(hB.uid)} and durum = 'iptal' and yanit_at > now() - interval '1 minute'`); if (Number(r[0]?.n) > 0) return true; await bekle(500); } return false; })());

  // ---------------------------------------------------------------- 6) Antrenman: tepki
  if (ACIK_BOT) {
    console.log("6) Antrenman (açık bot) Kasa: tepki düğmesi");
    await temizle();
    await git(A, "/meydan"); await kapatPencereler(A);
    await A.s.locator(".a-meydan-kisi--bot").first().click({ timeout: 8000 });
    await A.s.locator(".a-meydan-antrenman-modlar").getByRole("button", { name: M(/^Kasa/, /^Vault/) }).click({ timeout: 8000 });
    const girdi = await yolBekle(A, /\/kasa\/[0-9a-f-]{36}/, 15000);
    const mac3 = macId(A);
    if (mac3) acilanMaclar.add(mac3);
    ok("antrenman Kasa maçı açıldı", girdi && Boolean(mac3));
    const tepki = await A.s.locator(".ks-tepki .qt-tepki-dugme").waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    ok("maç ekranında tepki düğmesi (antrenman)", tepki);
    if (tepki) {
      await A.s.locator(".ks-tepki .qt-tepki-dugme").click();
      await A.s.waitForTimeout(400);
      await goruntu(A, "6-tepki-panel");
      const panelTasma = await A.s.evaluate(() => { const p = document.querySelector(".ks-tepki .qt-tepki-panel"); if (!p) return null; const r = p.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; });
      ok("tepki paneli ekrana sığıyor", panelTasma === false, String(panelTasma));
      const ilk = A.s.locator(".ks-tepki .qt-tepki-panel button").first();
      if (await ilk.count()) {
        await ilk.click();
        ok("tepki gönderildi → kendi avatarımda balon", await A.s.locator(".qt-tepki-balon").first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false));
      }
    }
    ok("maç ekranı: yatay taşma yok", !(await tasma(A)));
  }
} catch (e) {
  kaldi++; console.log("  ✗ HATA:", e.message.split("\n")[0]);
} finally {
  for (const id of acilanMaclar) await db(`update kasa_maclari set durum = 'iptal', bitis = now() where id = ${alintila(id)} and durum = 'aktif'`).catch(() => {});
  await temizle().catch(() => {});
  if (!arkadasVardi) await db(`delete from friendships where requester = ${alintila(hA.uid)} and addressee = ${alintila(hB.uid)}`).catch(() => {});
  const ilgili = (l) => l.filter((m) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*(avatars|ses)|Ölçüm aracı|\.(mp3|ogg|webm)/i.test(m));
  ok("konsol hatası yok (A)", ilgili(konsol.A).length === 0, ilgili(konsol.A).slice(0, 3).join(" | "));
  ok("konsol hatası yok (B)", ilgili(konsol.B).length === 0, ilgili(konsol.B).slice(0, 3).join(" | "));
  await tarayici.close().catch(() => {});
  console.log(`\nSonuç (${ETIKET}): ${gecti} geçti, ${kaldi} kaldı${arkadasVardi ? "" : " · test arkadaşlığı silindi"}`);
  if (kaldi) process.exitCode = 1;
}
