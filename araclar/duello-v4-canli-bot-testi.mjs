// Düello v4 · CANLI bot maçı uçtan uca (tek seferlik; döngüyle sunucu yoklamaz — durum ekrandan okunur).
// Test hesabı (hesap1, ArayuzDenetim934, v4 test listesinde) açık bir bota karşı GERÇEK maç oynar; sayfa kendi normal
// akışıyla (Realtime + yedek yoklama) çalışır. Veritabanına yalnız: maçı açmak (duello_olustur), her soruda doğru cevabı
// bir kez okumak (yönlendirme için), ikinci maçta Son Düello'yu hızlandırmak (tek güncelleme: tur = sınır) ve sonda doğrulama.
// Akış: giriş → nötr → KONTROL → kart süresi dolumu (otomatik seçim) → kart: rakibe gönder + kendine seç → 2/3 SON BASKI
// → bilerek yanlış (el değişimi) → kontrolü geri al → 3/3 → maç sonu (ödül) → Rövanş → Son Düello → maç sonu.
// Ekran: 390×844, EN (hesabın dili). Görüntüler: tasarim/duello-v4/canli-*.png
// Kullanım: npm run dev -- --port 5188 · node araclar/duello-v4-canli-bot-testi.mjs [--adres=http://localhost:5188] [--bot=<uuid>] [--tek-mac]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const BOT = ARG.bot || "b0b00000-0000-4000-8000-000000000004";   // ToyBot (açık bot)
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/duello-v4");
const SURE_MS = 16 * 60 * 1000;
fs.mkdirSync(CIKTI, { recursive: true });

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
await db.sorgu("set application_name = 'duello-v4-canli-bot-testi'");
const tek = (s) => db.tek(s);
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

// hesap1 oturumu (tek kök)
const ham = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kok = new URL(ADRES).origin;
const o1 = ham.origins.find((o) => o.origin === "http://hesap1.yerel") ?? ham.origins[0];
const tokenKaydi = o1.localStorage.find((x) => /auth-token/.test(x.name));
const A = JSON.parse(Buffer.from(JSON.parse(tokenKaydi.value).access_token.split(".")[1], "base64url").toString()).sub;
const durumDosya = { cookies: [], origins: [{ origin: kok, localStorage: [...o1.localStorage.filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)),
  { name: "bildim_dil", value: "en" }, { name: "bildim_tanitim", value: "1" }] }] };
console.log(`A=${A} bot=${BOT}`);
ok("A v4 test listesinde", (await tek(`select duello_v2_test_kullanicisi_mi(${alintila(A)})::text`)) === "true");
await db.sorgu(`update duellolar set durum = 'iptal', bitis = now() where durum = 'aktif' and ${alintila(A)} in (oyuncu1, oyuncu2)`);

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
const s = await b.newPage();
const konsol = [];
s.on("console", (m) => { if (m.type() === "error" && !/status of 400|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));

const goruldu = new Set();
// 1034 ölçümleri: duyuru sırasında sayaç (a = başta, b = 450 ms sonra; ikisi aynı olmalı) · onay düğmesi · sunucu/istemci kalan
const duyurular = [], esitlik = [];
let dugmeGoruldu = false;
const duyuruOlc = async () => {
  const yazi = await s.locator(".d4-kartlar--duyuru").count();
  if (!yazi) return null;
  const a = (await s.locator(".d4-sayac").innerText().catch(() => "")).trim();
  await s.waitForTimeout(450);
  if (!(await s.locator(".d4-kartlar--duyuru").count())) return null;
  const b = (await s.locator(".d4-sayac").innerText().catch(() => "")).trim();
  return { a, b, ayni: a === b };
};
const ekran = async (ad) => { if (goruldu.has(ad)) return; goruldu.add(ad); await s.screenshot({ path: path.join(CIKTI, `canli-${ad}-390x844-en.png`) }); console.log("  📷", ad); };
const DOM = () => {
  const a = document.querySelector(".d4-arena");
  const faz = a ? ([...a.classList].find((c) => c.startsWith("d4-arena--") && c !== "d4-arena--sonduello") ?? "").replace("d4-arena--", "") : null;
  return {
    faz, son: Boolean(a?.classList.contains("d4-arena--sonduello")),
    metin: (a?.innerText ?? document.body.innerText).replace(/\s+/g, " ").slice(0, 500),
    benKontrol: Boolean(document.querySelector(".d4-oy--ben.d4-oy--kontrol")), rakipKontrol: Boolean(document.querySelector(".d4-oy--rakip.d4-oy--kontrol")),
    seri: document.querySelectorAll(".d4-oy--kontrol .d4-pip-dolu").length,
    soru: document.querySelector(".d4-soru .qt-soru-metin, .d4-soru [class*=soru-metin], .d4-soru h2, .d4-soru p.qt-soru-kart")?.innerText?.trim() ?? null,
    sikAcik: document.querySelectorAll(".d4-arena .qt-sik:not(:disabled):not([aria-disabled=true])").length,
    kartlar: [...document.querySelectorAll(".d4-kart:not(:disabled)")].length,
    adim: document.querySelector(".d4-adim")?.innerText ?? null,
    sonuc: document.querySelector(".d4-sonuc-baslik")?.innerText ?? null, sonucAlt: document.querySelector(".d4-sonuc-alt")?.innerText ?? "", baski: Boolean(document.querySelector(".d4-baski")),
    macSonu: !a && Boolean(document.querySelector(".msk-avatar")),
    acilis: Boolean(document.querySelector(".d4-acilis")), otoSatir: Boolean(document.querySelector(".d4-oto-etiket")), giris: Boolean(document.querySelector(".d4-giris")),
    url: location.pathname,
  };
};
async function dogruIndeks() {
  const soru = await s.evaluate(() => document.querySelector(".d4-soru .qt-soru-kart")?.innerText?.trim() ?? document.querySelector(".d4-soru")?.innerText ?? "");
  const siklar = await s.evaluate(() => [...document.querySelectorAll(".d4-arena .qt-sik")].map((e) => e.innerText.replace(/^[A-D]\s*/, "").trim()));
  const r = await db.sorgu(`select q.dogru_cevap::text dc, q.secenekler::text s from questions q where ${alintila(soru)} like '%' || q.soru || '%'
     union all select q.dogru_cevap::text, t.secenekler::text from question_translations t join questions q on q.id = t.question_id
      where not t.eskidi and ${alintila(soru)} like '%' || t.soru || '%' limit 1`);
  if (!r.length) return null;
  const sec = JSON.parse(r[0].s); const dogruMetin = String(sec[Number(r[0].dc)]).trim();
  const i = siklar.findIndex((x) => x === dogruMetin);
  return i >= 0 ? i : null;
}
const cevapla = async (dogru) => {
  const i = await dogruIndeks();
  const n = await s.locator(".d4-arena .qt-sik").count();
  const hedef = i == null ? 0 : dogru ? i : (i + 1) % n;
  await s.locator(".d4-arena .qt-sik").nth(hedef).click({ timeout: 3000 }).catch(() => {});
  return i != null;
};

async function macOyna(no, { sonDuelloZorla }) {
  const bas = Date.now();
  let otoDenendi = no > 1, elDegisti = false, baskiGoruldu = false, sonGoruldu = false, kartSecildi = false, sonCevaplanan = null, sonZorlandi = false;
  let sonucSayisi = 0, sonSonuc = null;
  const id = (await s.evaluate(() => location.pathname)).split("/").pop();
  while (Date.now() - bas < SURE_MS) {
    await s.waitForTimeout(350);
    const d = await s.evaluate(DOM);
    if (d.macSonu) { await s.waitForTimeout(2500); await ekran(`m${no}-mac-sonu`); return { id, elDegisti, baskiGoruldu, sonGoruldu, kartSecildi, otoDenendi }; }
    if (!d.faz) continue;
    if (d.giris) await ekran(`m${no}-giris`);
    // aynı başlık arka arkaya gelebilir (iki başarılı saldırı): anahtar = başlık + alt satır (seri) + kontrol
    const sonucAnahtar = `${d.sonuc}|${d.sonucAlt}|${d.benKontrol}`;
    if (d.faz === "sonuc" && d.sonuc && sonucAnahtar !== sonSonuc) {
      sonSonuc = sonucAnahtar; sonucSayisi++;
      await s.waitForTimeout(250);
      const ad = /CONTROL LOST|KONTROL RAK/.test(d.sonuc) ? "el-degisti" : /DUEL (WON|LOST)/.test(d.sonuc) ? "duello-ani"
        : /YOU HAVE CONTROL|KONTROL SENDE|CONTROL TAKEN|YOU TOOK CONTROL/.test(d.sonuc) ? "kontrol-sende" : "sonuc";
      if (ad === "el-degisti") elDegisti = true;
      if (d.baski) { baskiGoruldu = true; await s.waitForTimeout(900); await ekran(`m${no}-son-baski`); }
      await ekran(`m${no}-${ad}`);
      console.log(`  · sonuç ${sonucSayisi}: ${d.sonuc}`);
      continue;
    }
    if (d.faz === "kart") {
      if (sonDuelloZorla && !sonZorlandi) {
        await db.sorgu(`update duellolar set v4_tur = v4_max_tur where id = ${alintila(id)} and faz = 'kart' and durum = 'aktif'`);
        sonZorlandi = true; console.log("  · Son Düello hızlandırıldı (tur = sınır)");
      }
      if (d.benKontrol) {
        if (!otoDenendi) { otoDenendi = true; await ekran(`m${no}-kart-bekle-oto`); console.log("  · kart: süre dolumunu bekliyorum");
          await s.waitForFunction(() => !document.querySelector(".d4-arena--kart"), null, { timeout: 25000 }).catch(() => {}); continue; }
        // 1034: tek dokunuş (onay düğmesi yok); her adımın duyurusunda sayaç durur.
        if (/[12]\/2/.test(d.adim ?? "")) {
          const ikinci = /2\/2/.test(d.adim ?? "");
          const du = await duyuruOlc();
          if (du) { duyurular.push(du); console.log(`  · duyuru (${ikinci ? 2 : 1}/2): sayaç ${du.a} → ${du.b}`); }
          await s.locator(".d4-kart:not(:disabled)").first().click({ timeout: 3000 }).catch(() => {});
          if ((await s.locator(".d4-dugme").count()) > 0) dugmeGoruldu = true;
          if (!ikinci) {
            const t = (await db.sorgu(`select extract(epoch from faz_bitis - greatest(now(), v4_duyuru_bitis))::float8::text k from duellolar where id = ${alintila(id)} and faz = 'kart'`))[0];
            const du2 = await duyuruOlc();
            if (du2) { duyurular.push(du2); console.log(`  · duyuru (2/2): sayaç ${du2.a} → ${du2.b}`); }
            const ist = await s.locator(".d4-sayac").innerText().catch(() => "");
            if (t) { esitlik.push({ sunucu: Number(t.k), istemci: Number((ist.match(/\d+/) ?? [])[0]) }); console.log(`  · kalan: sunucu ${Number(t.k).toFixed(2)} sn · istemci "${ist.trim()}"`); }
          } else kartSecildi = true;
          await ekran(`m${no}-kart-${ikinci ? "sec" : "gonder"}`);
          await s.waitForTimeout(300);
        }
      } else await ekran(`m${no}-bekleyen`);
      continue;
    }
    if (d.acilis) { await ekran(`m${no}-acilis${/automat|auto-picked|otomatik/i.test(d.metin) ? "-oto" : ""}`); continue; }
    if (["notr", "cevap", "son"].includes(d.faz) && d.sikAcik >= 2) {
      const anahtar = `${d.faz}:${d.soru ?? d.metin.slice(0, 80)}`;
      if (anahtar === sonCevaplanan) continue;
      sonCevaplanan = anahtar;
      if (d.son) { sonGoruldu = true; await ekran(`m${no}-son-duello`); }
      else await ekran(`m${no}-${d.faz === "notr" ? "notr" : d.otoSatir ? "soru-oto" : d.benKontrol ? "soru-kontrol-bende" : "soru-rakip-kontrolde"}`);
      // Politika: kontrol bendeyken seri 2'de (SON BASKI görüldükten sonra) el değişimi görülene kadar bilerek yanlış; gerisi doğru.
      const yanlis = d.faz === "cevap" && d.benKontrol && baskiGoruldu && !elDegisti && no === 1;
      await s.waitForTimeout(600 + Math.random() * 600);
      const bulundu = await cevapla(!yanlis);
      if (!bulundu) console.log("  · doğru cevap bulunamadı (ilk şık)");
    }
  }
  return { id, zamanAsimi: true, elDegisti, baskiGoruldu, sonGoruldu, kartSecildi, otoDenendi };
}

let m1 = null, m2 = null;
try {
  const id1 = await tek(`select duello_olustur(${alintila(A)}, ${alintila(BOT)}, false)::text`);
  ok("maç 1 v4 açıldı", (await tek(`select surum::text from duellolar where id = ${alintila(id1)}`)) === "4");
  await s.goto(`${ADRES}/duello/${id1}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await s.waitForSelector(".d4-arena", { timeout: 30000 });
  console.log("== Maç 1");
  m1 = await macOyna(1, { sonDuelloZorla: false });
  const r1 = (await db.sorgu(`select durum, kazanan::text k, v4_seri::text seri, v4_son::text son, v4_tur::text tur,
      (select count(*) from duello_hamleler h where h.duello_id = d.id)::text hamle,
      (select count(*) from duello_hamleler h where h.duello_id = d.id and h.v4 ->> 'sonuc' = 'el_degisti')::text el,
      (select coalesce(sum(c.miktar), 0) from coin_hareketleri c where c.referans = 'duello:' || d.id::text and c.user_id = ${alintila(A)})::text coin
      from duellolar d where id = ${alintila(id1)}`))[0];
  console.log("  maç 1:", JSON.stringify(r1));
  ok("maç 1 bitti (zaman aşımı yok)", !m1.zamanAsimi && r1.durum === "bitti");
  ok("kart süresi dolumu → otomatik seçim (açılışta ya da soru satırında 'otomatik')", goruldu.has("m1-acilis-oto") || goruldu.has("m1-soru-oto"), [...goruldu].join(","));
  ok("kart: rakibe gönder + kendine seç (UI, tek dokunuş)", m1.kartSecildi);
  ok("1034: onay düğmesi yok", !dugmeGoruldu);
  ok("1034: duyuru sırasında sayaç ilerlemiyor", duyurular.length > 0 && duyurular.every((x) => x.ayni), JSON.stringify(duyurular));
  ok("1035: sayaç 10 sn'den başlıyor (duyuruda 10'da duruyor)", duyurular.length > 0 && /^10$/.test(duyurular[0].a), JSON.stringify(duyurular[0]));
  ok("1034: sunucu kalan ≈ istemci sayacı (±1 sn)", esitlik.length > 0 && esitlik.every((x) => Math.abs(x.istemci - Math.ceil(x.sunucu)) <= 1), JSON.stringify(esitlik));
  ok("2/3 SON BASKI görüldü", m1.baskiGoruldu);
  ok("kontrol el değişimi görüldü (ekran + kayıt)", m1.elDegisti && Number(r1.el) >= 1, `el=${r1.el}`);
  ok("maç 1: 3/3 ile bitti, kazanan belli", ["f", "false"].includes(r1.son) && r1.k && Number(r1.seri) >= 3, JSON.stringify(r1));
  ok("ödül: kazanan bensem coin yazıldı", r1.k !== A || Number(r1.coin) > 0, r1.coin);

  // --tek-mac: canlı yükü en aza indirmek için rövanş/Son Düello atlanır (yalnız maç 1).
  if (ARG["tek-mac"]) {
    ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
    throw Object.assign(new Error("tek-mac"), { tekMac: true });
  }
  // Rövanş (bot hemen kabul eder)
  const rov = s.getByRole("button", { name: /^(Rematch|Rövanş)$/ });
  await rov.click({ timeout: 10000 });
  await s.waitForURL((u) => !u.pathname.endsWith(id1), { timeout: 30000 });
  await s.waitForSelector(".d4-arena", { timeout: 30000 });
  const id2 = (await s.evaluate(() => location.pathname)).split("/").pop();
  ok("rövanş: yeni v4 maçı açıldı", (await tek(`select (surum = 4 and onceki_id = ${alintila(id1)})::text from duellolar where id = ${alintila(id2)}`)) === "true");
  console.log("== Maç 2 (rövanş, Son Düello)");
  m2 = await macOyna(2, { sonDuelloZorla: true });
  const r2 = (await db.sorgu(`select durum, kazanan::text k, v4_son::text son, (select count(*) from duello_hamleler h where h.duello_id = d.id and h.v4 ->> 'tip' = 'son')::text sonsoru
      from duellolar d where id = ${alintila(id2)}`))[0];
  console.log("  maç 2:", JSON.stringify(r2));
  ok("Son Düello ekranı görüldü", m2.sonGoruldu);
  ok("maç 2 Son Düello ile bitti", r2.durum === "bitti" && ["t", "true"].includes(r2.son) && Number(r2.sonsoru) >= 1 && r2.k, JSON.stringify(r2));
  ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
} catch (e) {
  if (e.tekMac) { /* tek maç bitti, rövanş atlandı */ } else {
  kaldi++; console.log("  ✗ HATA", e.message.slice(0, 300));
  await s.screenshot({ path: path.join(CIKTI, "canli-hata-390x844-en.png") }).catch(() => {});
  }
} finally {
  await db.sorgu(`update duellolar set durum = 'iptal', bitis = now() where durum = 'aktif' and ${alintila(A)} in (oyuncu1, oyuncu2)`).catch(() => {});
  await b.close(); await tarayici.close(); await db.kapat();
}
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
