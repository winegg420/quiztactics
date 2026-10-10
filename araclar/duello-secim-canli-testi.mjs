// ============================================================
// DÜELLO 960 · SEÇİM FAZI CANLI UÇTAN UCA TESTİ (quiztactics.com + canlı DB)
//
// Maç gerçek sunucu fonksiyonuyla açılır (duello_olustur — arama/davet/rövanş hepsi bunu çağırır): seçim fazı, yılan
// sırası, süre dolumu, bot seçimi ve tur 1 geçişi CANLI kodla oynanır. Oyuncu(lar) gerçek tarayıcıda oynar:
//   · --mod=gercek : iki mevcut misafir hesap (A, B) birbirine karşı
//   · --mod=bot    : A ↔ gizli bot (bot cron'la seçer; seçim gecikmesi DB'den ölçülür)
// A seçimlerinden birini BİLEREK yapmaz (süre dolumu → "Otomatik seçildi" ölçülür). Seçim bitince 2 tur oynanır
// (ban, kategori, cevap), sonra A "Düellodan çık" ile ayrılır → maç biter (takılı maç kalmaz; finally'de de güvence).
// Ölçer: tek ekran (kaydırma/taşma yok), 10 kart, sıra göstergesi, uçuş/geri bildirim, DB tutarlılığı (10 seçim yılan
// sırasıyla, 5-5, boş yok, ilk saldıran = ilk seçmeyen, eşik 7 / 20 tur), bot gecikmesi, konsol hatası.
// Yeni hesap AÇILMAZ; ayar yazılmaz. Kullanım:
//   node araclar/duello-secim-canli-testi.mjs --mod=bot|gercek [--dil=tr|en] [--en=390] [--azalt] [--a=ArayuzDenetim648] [--b=ArayuzDenetim934]
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";
import { duelloTanitimAnahtari } from "./duello-tanitim-anahtar.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const MOD = ARG.mod === "gercek" ? "gercek" : "bot";
const DIL = ARG.dil === "en" ? "en" : "tr";
const EN = Number(ARG.en || 390);
const AZALT = Boolean(ARG.azalt);
// 970: --tam → maç sonuna kadar oynanır (A sorulara %60 doğru cevap verir), puan kuralı DB'den denetlenir, maç sonu ekranı ölçülür.
const TAM = Boolean(ARG.tam);
const AD_A = String(ARG.a || "ArayuzDenetim648");
const AD_B = String(ARG.b || "ArayuzDenetim934");
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/duello-secim/canli");
fs.mkdirSync(CIKTI, { recursive: true });
const K = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const bas = Date.now();
const sn = () => ((Date.now() - bas) / 1000).toFixed(1);

const pg = await new PgIstemci(await baglantiDizgisi()).baglan();
await pg.sorgu("set application_name = 'duello-secim-canli-testi'");
await pg.sorgu("set statement_timeout = '20s'");
await pg.sorgu("set lock_timeout = '5s'");
await pg.sorgu("set idle_in_transaction_session_timeout = '30s'");
const db = (s) => pg.sorgu(s);

const oturumVeri = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kokenler = (oturumVeri.origins ?? []).map((o) => {
  const jeton = o.localStorage?.find((x) => x.name.includes("auth-token"));
  let uid = null;
  try { uid = JSON.parse(jeton.value).user?.id ?? null; } catch { /* */ }
  return { origin: o.origin, uid, kayitlar: o.localStorage ?? [] };
}).filter((k) => k.uid);
const adlar = await db(`select id, takma_ad from profiles where id in (${kokenler.map((k) => alintila(k.uid)).join(",")})`);
for (const k of kokenler) k.ad = adlar.find((a) => a.id === k.uid)?.takma_ad ?? null;
const hesapA = kokenler.find((k) => k.ad === AD_A);
const hesapB = MOD === "gercek" ? kokenler.find((k) => k.ad === AD_B) : null;
if (!hesapA || (MOD === "gercek" && !hesapB)) { console.log(`DUR: oturumda ${AD_A}${MOD === "gercek" ? " / " + AD_B : ""} yok (${kokenler.map((k) => k.ad).join(", ")})`); process.exit(1); }
const BOT = MOD === "bot" ? await pg.tek(`select id from profiles p where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true)
   and not exists (select 1 from duellolar d where d.durum = 'aktif' and p.id in (d.oyuncu1, d.oyuncu2)) order by random() limit 1`) : null;
const RAKIP = MOD === "bot" ? BOT : hesapB.uid;
const aktif = await pg.tek(`select count(*)::text from duellolar where durum = 'aktif' and (oyuncu1 in (${alintila(hesapA.uid)}, ${alintila(RAKIP)}) or oyuncu2 in (${alintila(hesapA.uid)}, ${alintila(RAKIP)}))`);
if (aktif !== "0") { console.log("DUR: test hesabının aktif düellosu var"); process.exit(1); }

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const oyuncular = [];
async function ac(ad, hesap) {
  const b = await tarayici.newContext({ viewport: { width: EN, height: 640 }, hasTouch: true, isMobile: true, serviceWorkers: "block",
    reducedMotion: AZALT ? "reduce" : "no-preference", locale: DIL === "en" ? "en-US" : "tr-TR" });
  const kayitlar = [...hesap.kayitlar.filter((x) => !["bildim_dil", "bildim_tanitim", "qt_duello_secim_ipucu"].includes(x.name)),
    { name: "bildim_dil", value: DIL }, { name: "bildim_tanitim", value: "1" }, { name: duelloTanitimAnahtari(), value: "1" }];
  await b.addInitScript(({ kayitlar, koken }) => {
    try { if (location.origin === koken && !sessionStorage.getItem("__secimTesti")) { for (const k of kayitlar) localStorage.setItem(k.name, k.value); sessionStorage.setItem("__secimTesti", "1"); } } catch { /* */ }
  }, { kayitlar, koken: kok });
  const s = await b.newPage();
  const o = { ad, hesap, b, s, konsol: [], uid: hesap.uid };
  s.on("console", (m) => { if (m.type() === "error") o.konsol.push(m.text().slice(0, 200)); });
  // 980: 5xx yanıtların adresi de yazılır ("Failed to load resource: 500" tek başına hangi isteğin düştüğünü söylemiyordu)
  s.on("response", (r) => { if (r.status() >= 500) o.konsol.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, "").slice(0, 120)}`); });
  s.on("pageerror", (e) => o.konsol.push("SAYFA: " + String(e).slice(0, 200)));
  s.on("response", async (r) => { if (r.status() >= 400) { let g = ""; try { g = (await r.text()).slice(0, 160); } catch { /* yok */ } console.log(`     (${o.ad ?? "?"} HTTP ${r.status()} ${r.url().split("/rest/v1/").pop().slice(0, 60)} ${g})`); } });
  oyuncular.push(o);
  return o;
}

const DURUM = () => {
  const q = (x) => document.querySelector(x);
  const mac = q(".hk-mac");
  const faz = mac ? (mac.className.match(/hk-mac--(\w+)/) || [])[1] : null;
  const alt = Math.max(0, ...[...document.querySelectorAll(".hk-mac *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !e.closest(".dsc-ucan, .dsc-basla, .qt-tepki-panel"); }).map((e) => e.getBoundingClientRect().bottom));
  return {
    yol: location.pathname, faz, bitti: Boolean(q(".msk, .mss, [class*=msk]")) && !mac,
    benSirada: Boolean(q(".dsc-konsol--ben")), oto: Boolean(q(".dsc-konsol--oto")), basla: Boolean(q(".dsc-basla")), ucan: Boolean(q(".dsc-ucan")),
    kart: document.querySelectorAll(".dsc-kart").length, acikKart: document.querySelectorAll(".dsc-kart:not([disabled])").length,
    calma: Boolean(q(".hk-calma")), banIz: document.querySelectorAll(".hk-sahne--ban, .hk-kart--banli, .hk-cubuk--ban").length,   // 982/990
    banSec: Boolean(q(".hk-sahne--ban-sec")), kartAcik: document.querySelectorAll("button.hk-kart:not([disabled]):not(.hk-kart--banli)").length,
    cubuk: Boolean(q(".hk-cubuk-dugme:not([disabled])")), sik: document.querySelectorAll(".hk-mac .qt-sik:not([disabled])").length,
    kilitli: Boolean(window.__bdTani?.kilitli),
    puanTahta: Boolean(q(".hk-tahta--puan")), kendiAcik: document.querySelectorAll("button.hk-kart--ben:not([disabled])").length,
    saldiriyor: Boolean(q(".hk-cubuk:not(.hk-cubuk--savunan)")), mesaj: q(".hk-mesaj-yazi")?.innerText.replace(/\s+/g, " ") ?? "",
    konsol: q(".dsc-konsol")?.innerText.replace(/\s+/g, " ") ?? "",
    yatay: document.documentElement.scrollWidth - window.innerWidth,
    dikey: Math.round(document.documentElement.scrollHeight - window.innerHeight), alt: Math.round(alt), ekran: window.innerHeight,
    kucuk: [...document.querySelectorAll(".dsc-kart")].filter((e) => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).length,
  };
};

// --dil=en: arayüz dili profildeki tercihten gelir → test hesabının profil dili test süresince 'en', finally'de eski değer.
let eskiDil = null;
if (DIL === "en") {
  eskiDil = await pg.tek(`select coalesce(dil, 'tr') from profiles where id = ${alintila(hesapA.uid)}`);
  await db(`update profiles set dil = 'en' where id = ${alintila(hesapA.uid)}`);
}
let macId = null;
const zamanlar = [];   // seçim sırası değişim anları (DB yoklaması) — bot gecikmesi
try {
  console.log(`== Düello seçim canlı testi · ${MOD} · ${DIL} · ${EN}×640${AZALT ? " · hareket azaltma" : ""} · ${ADRES}`);
  const A = await ac("A", hesapA);
  const B = hesapB ? await ac("B", hesapB) : null;
  await db(`update profiles set last_seen = now() where id in (${alintila(hesapA.uid)}, ${alintila(RAKIP)})`);
  macId = await pg.tek(`select duello_olustur(${alintila(hesapA.uid)}, ${alintila(RAKIP)}, false, null)::text`);
  const m0 = (await db(`select secim_modu, hakimiyet_esik, max_tur, ilk_secen, oyuncu1, oyuncu2, faz, puan_modu, puan_hedef, kategori_yolu from duellolar where id = ${alintila(macId)}`))[0];
  console.log(`· maç ${macId} (+${sn()} sn) ilk seçen: ${m0.ilk_secen === hesapA.uid ? "A" : "rakip"}`);
  ok("canlı maç seçim moduyla açıldı (faz secim, 20 tur; 970 puan modu: hedef 12, yol 4)", m0.secim_modu === "t" && m0.faz === "secim" && m0.max_tur === "20"
    && (m0.puan_modu === "t" ? m0.puan_hedef === "12" && m0.kategori_yolu === "4" : m0.hakimiyet_esik === "7"), JSON.stringify(m0));
  const PUAN = m0.puan_modu === "t";
  await Promise.all([A, B].filter(Boolean).map((o) => o.s.goto(`${ADRES}/duello/${macId}`, { waitUntil: "domcontentloaded", timeout: 45000 })));
  await Promise.all([A, B].filter(Boolean).map((o) => o.s.waitForSelector(".dsc-kart, .hk-mac--secim", { timeout: 45000 }).catch(() => {})));

  // ---- seçim fazı
  let enGoruldu = false;
  let sonSira = -1, atlanan = false, olcumAlindi = false, otoGoruldu = false, ucusGoruldu = false, baslaGoruldu = false;
  const secimBas = Date.now();
  while (Date.now() - secimBas < 120000) {
    const r = (await db(`select faz, secim_sira, saldiran from duellolar where id = ${alintila(macId)}`))[0];
    if (Number(r.secim_sira) !== sonSira) { zamanlar.push({ sira: Number(r.secim_sira), an: Date.now(), kim: r.saldiran }); sonSira = Number(r.secim_sira); }
    if (r.faz !== "secim") break;
    for (const o of [A, B].filter(Boolean)) {
      const d = await o.s.evaluate(DURUM);
      if (d.oto) otoGoruldu = true;
      if (/YOUR PICK|OPPONENT PICKING|Auto-picked/.test(d.konsol)) enGoruldu = true;
      if (d.ucan) ucusGoruldu = true;
      if (!olcumAlindi && d.kart === 10) {
        olcumAlindi = true;
        ok("seçim ekranı: 10 kart, tek ekran, taşma yok, kart ≥ 44 px", d.kart === 10 && d.yatay <= 0 && d.dikey <= 1 && d.alt <= d.ekran + 1 && d.kucuk === 0, JSON.stringify({ yatay: d.yatay, dikey: d.dikey, alt: d.alt, kucuk: d.kucuk }));
        await o.s.screenshot({ path: path.join(CIKTI, `${MOD}-${DIL}-${EN}${AZALT ? "-azalt" : ""}-01-secim.png`) });
      }
      if (d.benSirada && d.acikKart > 0) {
        // A'nın 2. seçimini bilerek kaçır: süre dolumu → otomatik seçim (sunucu)
        const aSay = (await db(`select count(*)::text n from duellolar d, jsonb_array_elements(d.secimler) x where d.id = ${alintila(macId)} and x->>'u' = ${alintila(A.uid)}`))[0].n;
        if (o === A && aSay === "1" && !atlanan) { atlanan = true; console.log(`  · +${sn()} A ikinci seçimini kaçırıyor (süre dolumu)`); continue; }
        if (o === A && aSay === "1" && atlanan) continue;
        try { await o.s.locator(".dsc-kart:not([disabled])").first().tap({ timeout: 1500 }); } catch { /* sıra geçmiş olabilir */ }
      }
    }
    await new Promise((r2) => setTimeout(r2, 250));
  }
  const m1 = (await db(`select faz, tur, saldiran, oyuncu1, ilk_secen, secimler, sahiplik, yuva1, yuva2 from duellolar where id = ${alintila(macId)}`))[0];
  const secimler = JSON.parse(m1.secimler);
  const beklenen = Array.from({ length: 10 }, (_, i) => (Math.floor((i + 1) / 2) % 2 === 0 ? m1.ilk_secen : (m1.ilk_secen === hesapA.uid ? RAKIP : hesapA.uid)));
  ok("10 seçim yılan sırasıyla (A-B-B-A-A-B-B-A-A-B)", secimler.length === 10 && secimler.every((x, i) => x.u === beklenen[i]), JSON.stringify(secimler.map((x) => (x.u === hesapA.uid ? "A" : "R") + (x.oto ? "*" : ""))));
  ok("5-5, 10 kategorinin hepsi sahipli (boş yok)", m1.yuva1 === "5" && m1.yuva2 === "5" && Object.keys(JSON.parse(m1.sahiplik)).length === 10);
  ok("tur 1 başladı, ilk saldıran = oyuncu1 = ilk SEÇMEYEN", ["ban", "kategori", "cevap"].includes(m1.faz) && m1.tur === "1" && m1.saldiran === m1.oyuncu1 && m1.saldiran !== m1.ilk_secen, JSON.stringify([m1.faz, m1.tur]));
  const aOto = secimler.find((x) => x.u === hesapA.uid && x.oto);
  ok("süre dolunca A için otomatik seçim (en yüksek kendi yüzdesi) + ekranda \"Otomatik seçildi\"", Boolean(aOto) && otoGoruldu, JSON.stringify(aOto));
  if (!AZALT) ok("seçim anı uçuşu görüldü", ucusGoruldu);
  if (MOD === "bot") {
    const gecikme = [];
    for (let i = 1; i < zamanlar.length; i++) if (zamanlar[i - 1].kim === BOT) gecikme.push((zamanlar[i].an - zamanlar[i - 1].an) / 1000);
    const botOto = secimler.filter((x) => x.u === BOT && x.oto).length;
    console.log(`  · bot seçim gecikmeleri (sıra gelişinden; gösterim payı 1,5 sn + ilk seçimde 3 sn dahil): ${gecikme.map((x) => x.toFixed(1)).join(", ")}`);
    ok("bot süre içinde kendisi seçti (oto değil), gecikme ≥ 2,5 sn (anında değil)", botOto === 0 && gecikme.length >= 4 && gecikme.every((x) => x >= 2.3 && x <= 9.6), JSON.stringify(gecikme));
  }

  // ---- geçiş + 2 tur
  for (let i = 0; i < 30 && !baslaGoruldu; i++) {
    const d = await A.s.evaluate(DURUM);
    if (d.basla) { baslaGoruldu = true; await A.s.screenshot({ path: path.join(CIKTI, `${MOD}-${DIL}-${EN}${AZALT ? "-azalt" : ""}-02-basliyor.png`) }); }
    else await new Promise((r2) => setTimeout(r2, 150));
  }
  ok("HÂKİMİYET BAŞLIYOR geçişi görüldü", baslaGoruldu);
  if (DIL === "en") ok("arayüz İngilizce (YOUR PICK / OPPONENT PICKING / DRAFT görüldü)", enGoruldu);
  const turBas = Date.now();
  let tur1Olcum = false;
  let kendiAcikGoruldu = 0, puanTahtaGoruldu = false, sonucMesajlari = new Set();
  let banDb = 0, banEkran = 0, calmaGoruldu = 0;   // 982: ban kapalı maçta ban fazı hiç olmamalı · 990: çalma anı
  while (Date.now() - turBas < (TAM ? 1500000 : 150000)) {
    const r = (await db(`select tur, faz, durum from duellolar where id = ${alintila(macId)}`))[0];
    if (r.durum !== "aktif" || (!TAM && Number(r.tur) > 2)) break;
    if (r.faz === "ban") banDb++;
    for (const o of [A, B].filter(Boolean)) {
      const d = await o.s.evaluate(DURUM);
      if (d.puanTahta) puanTahtaGoruldu = true;
      if (d.banIz > 0 || d.faz === "ban") banEkran++;
      if (d.calma) calmaGoruldu++;
      if (PUAN && d.faz === "kategori" && d.saldiriyor && d.kendiAcik > 0) kendiAcikGoruldu++;
      if (d.faz === "sonuc" && d.mesaj) sonucMesajlari.add(d.mesaj);
      if (!tur1Olcum && d.faz === "kategori" && d.kartAcik > 0) {
        tur1Olcum = true;
        ok(`tur 1 kategori ekranı (${PUAN ? "puan tahtası" : "7 yuvalı tahta"}): tek ekran, taşma yok`, d.yatay <= 0 && d.dikey <= 1 && d.alt <= d.ekran + 1, JSON.stringify({ yatay: d.yatay, dikey: d.dikey, alt: d.alt }));
        await o.s.screenshot({ path: path.join(CIKTI, `${MOD}-${DIL}-${EN}${AZALT ? "-azalt" : ""}-03-kategori.png`) });
      }
      try {
        if (d.faz === "ban" && d.banSec) await o.s.locator("button.hk-kart:not([disabled])").first().tap({ timeout: 1200 });
        else if (d.faz === "kategori" && d.kartAcik > 0 && !d.cubuk) await o.s.locator("button.hk-kart:not([disabled]):not(.hk-kart--banli)").first().tap({ timeout: 1200 });
        else if (d.faz === "kategori" && d.cubuk) await o.s.locator(".hk-cubuk-dugme:not([disabled])").first().tap({ timeout: 1200 });
        else if (d.faz === "cevap" && d.sik > 0 && !d.kilitli) {
          // --tam: %60 doğru (DB'deki doğru şık), kalan ilk açık şık
          const dc = TAM && Math.random() < 0.6 ? Number(await pg.tek(`select q.dogru_cevap::text from duellolar d join questions q on q.id = d.soru_id where d.id = ${alintila(macId)}`)) : null;
          if (dc !== null && Number.isFinite(dc)) await o.s.locator(".hk-mac .qt-sik").nth(dc).tap({ timeout: 1200 });
          else await o.s.locator(".hk-mac .qt-sik:not([disabled])").first().tap({ timeout: 1200 });
        }
      } catch { /* faz geçti */ }
    }
    await new Promise((r2) => setTimeout(r2, 300));
  }
  const banAcikMac = (await db(`select ban_acik::text b from duellolar where id = ${alintila(macId)}`))[0]?.b;
  if (banAcikMac === "false") ok(`982: ban kapalı maç — ban fazı DB'de ${banDb}, ekranda ${banEkran} kez (0 olmalı)`, banDb === 0 && banEkran === 0);
  if (TAM) console.log(`  · 990: çalma anı ${calmaGoruldu} yoklamada görüldü`);
  if (PUAN) {
    ok("puan modu: seçimden sonra puan tahtası görüldü", puanTahtaGoruldu);
    ok("puan modu: saldırırken kendi kartların hiç seçilebilir olmadı", kendiAcikGoruldu === 0, String(kendiAcikGoruldu));
    console.log(`  · tur sonu mesajları (örnek): ${[...sonucMesajlari].slice(0, 4).join(" | ")}`);
    ok("puan modu: tur sonu mesajı kim kaç puan aldı + el değişimini yazıyor", [...sonucMesajlari].some((m) => /Sen \+\d · Rakip \+\d|You \+\d · Opponent \+\d/.test(m)), [...sonucMesajlari].slice(0, 3).join(" | "));
  }
  if (TAM) {
    const son = (await db(`select durum, kazanan, uzatma, terk_eden, puan1, puan2, puan_hedef, kategori_yolu, secimler, sahiplik, oyuncu1, oyuncu2, tur from duellolar where id = ${alintila(macId)}`))[0];
    const hm = await db(`select saldiran, uzatma, puan_saldiran, puan_savunan, altin_kazanan, hakimiyet from duello_hamleler where duello_id = ${alintila(macId)} order by id`);
    const j = (v) => (typeof v === "string" ? JSON.parse(v) : v);
    const bb = (v) => v === true || v === "t";
    ok("tam maç bitti (terksiz)", son.durum === "bitti" && !son.terk_eden, JSON.stringify({ durum: son.durum, tur: son.tur }));
    if (PUAN && son.durum === "bitti") {
      const sec = j(son.secimler) ?? []; const sah = j(son.sahiplik) ?? {};
      const alinan = (u) => sec.filter((x) => x.u !== u && sah[x.k] === u).length;
      const topla = (u) => hm.filter((x) => !bb(x.uzatma)).reduce((t, x) => t + Number(x.saldiran === u ? x.puan_saldiran : x.puan_savunan), 0);
      const ok1 = Number(son.puan1) >= Number(son.puan_hedef) || alinan(son.oyuncu1) >= Number(son.kategori_yolu);
      const ok2 = Number(son.puan2) >= Number(son.puan_hedef) || alinan(son.oyuncu2) >= Number(son.kategori_yolu);
      const bek = ok1 && !ok2 ? son.oyuncu1 : ok2 && !ok1 ? son.oyuncu2 : !ok1 && !ok2 && Number(son.puan1) !== Number(son.puan2)
        ? (Number(son.puan1) > Number(son.puan2) ? son.oyuncu1 : son.oyuncu2) : hm.filter((x) => bb(x.uzatma)).at(-1)?.altin_kazanan;
      console.log(`  · bitiş: tur ${son.tur} · puan ${son.puan1}-${son.puan2} · çalınan ${alinan(son.oyuncu1)}-${alinan(son.oyuncu2)} · Altın Soru ${hm.filter((x) => bb(x.uzatma)).length}`);
      ok("DB: kendi kategorisine hamle yok", hm.every((x) => j(x.hakimiyet)?.sahip_once !== x.saldiran || bb(x.uzatma)));
      ok("DB: puanlar hamle toplamıyla tutarlı", topla(son.oyuncu1) === Number(son.puan1) && topla(son.oyuncu2) === Number(son.puan2), JSON.stringify([son.puan1, son.puan2, topla(son.oyuncu1), topla(son.oyuncu2)]));
      ok("DB: kazanan kurala uygun (12 puan / 4 kategori / tur sonu / Altın Soru)", son.kazanan === bek, JSON.stringify({ kazanan: son.kazanan, bek }));
    }
    await new Promise((r2) => setTimeout(r2, 4000));
    await A.s.screenshot({ path: path.join(CIKTI, `${MOD}-${DIL}-${EN}${AZALT ? "-azalt" : ""}-09-mac-sonu.png`) });
    const metin = await A.s.evaluate(() => document.body.innerText).catch(() => "");
    if (PUAN) ok("maç sonu ekranı skoru puan olarak yazıyor", /puan|points?/i.test(metin), metin.slice(0, 200));
  }
  const h = await db(`select count(*)::text n from duello_hamleler where duello_id = ${alintila(macId)}`);
  ok("seçimden sonra turlar oynandı (≥ 2 hamle; tutma kuralı aynen)", Number(h[0].n) >= 2, h[0].n);
  for (const o of [A, B].filter(Boolean)) {
    const ilgili = o.konsol.filter((k) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*(avatars|ses)|realtime|websocket/i.test(k));
    ok(`konsol hatası yok (${o.ad})`, ilgili.length === 0, ilgili.slice(0, 3).join(" | "));
  }
} catch (e) {
  kaldi++; console.log("  ✗ HATA:", e.message);
} finally {
  // Temizlik: A çıkar (terk) → maç biter; olmazsa sunucuda iptal.
  if (macId) {
    try {
      const A = oyuncular[0];
      await A.s.locator(".mus-cik, [aria-label*='Düellodan çık'], [aria-label*='Leave']").first().tap({ timeout: 3000 }).catch(() => {});
      await A.s.getByRole("button", { name: /^(Çık|Leave)$/ }).first().tap({ timeout: 3000 }).catch(() => {});
      await new Promise((r2) => setTimeout(r2, 2500));
      const d = (await db(`select durum from duellolar where id = ${alintila(macId)}`))[0];
      if (d.durum === "aktif") {
        await db(`update duellolar set durum = 'iptal', bitis = now() where id = ${alintila(macId)} and durum = 'aktif'`);
        console.log("  · maç sunucuda iptal edildi (terk düğmesi bulunamadı)");
      } else console.log(`  · maç kapandı (${d.durum})`);
      const kalan = await pg.tek(`select count(*)::text from duellolar where id = ${alintila(macId)} and durum = 'aktif'`);
      ok("takılı maç kalmadı", kalan === "0");
    } catch (e) { console.log("  ! temizlik:", e.message); }
  }
  if (eskiDil) {
    await db(`update profiles set dil = ${alintila(eskiDil)} where id = ${alintila(hesapA.uid)}`).catch((e) => console.log("  ! dil geri alınamadı:", e.message));
    ok("test hesabının profil dili geri alındı", (await pg.tek(`select dil from profiles where id = ${alintila(hesapA.uid)}`)) === eskiDil);
  }
  for (const o of oyuncular) await o.b.close().catch(() => {});
  await tarayici.close().catch(() => {});
  const artik = await pg.tek(`select count(*)::text from pg_stat_activity where application_name = 'duello-secim-canli-testi' and pid <> pg_backend_pid() and state like 'idle in transaction%'`);
  ok("artık işlem açık oturum yok", artik === "0", artik);
  await pg.kapat();
  console.log(`\nSONUÇ (${MOD} ${DIL} ${EN}${AZALT ? " azalt" : ""}): ${gecti} geçti, ${kaldi} kaldı · ${sn()} sn`);
  process.exit(kaldi ? 1 : 0);
}
