// ============================================================
// ORTAK HAZİNE — SAVUNMA HAKKI CANLI UÇTAN UCA TESTİ (9 Eki 2026) — iki gerçek test hesabı, canlı site
//
// Akış (A = Kalkan sahibi, B = rakip):
//   1) A doğru, B yanlış → A sahip · 2) A karar ekranı: DEVAM düğmesi "DEVAM → Hazine <ceil(k×çarpan)>" + kalkan → DEVAM
//   3) A yanlış, B tek doğru → tetik bandı (iki tarafta) · 4) Savunma Sorusu: A savunur, B izleme bandında (kalkan, büyük sayaç,
//      şıklar pasif); iki taraftaki sayaçlar karşılaştırılır · 5) A doğru → "Savundun" / "Rakip savundu", hazine sahipsiz
//   6) sonraki tur sahipsiz soru (karar yok) · 7) A maçtan çıkar (temizlik).
// Ölçülür: senkron (sayaç farkı ≤ 1 sn), tek seferlik anların tekrar oynaması (kalkan anı, izleme bandı), aynı sesin
//   üst üste çalması (≤ 250 ms içinde aynı rol), konsol hatası, yatay taşma.
// Yük: veritabanından yalnız soru başına BİR okuma (doğru şık); yoklama yalnız yerel DOM.
// Kullanım: node araclar/kasa-savunma-canli-testi.mjs [--a=ArayuzDenetim934] [--b=ArayuzDenetim758]
//           [--adres=https://quiztactics.com] [--boyut=390x844] [--dil=tr]
// Oturumlar: .arayuz-denetim-oturum.json (her origin bir hesap; git'e girmez).
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const KOKEN = new URL(ADRES).origin;
const AD_A = String(ARG.a || "ArayuzDenetim934"), AD_B = String(ARG.b || "ArayuzDenetim758");
const [GEN, YUK] = String(ARG.boyut || "390x844").split("x").map(Number);
const DIL = String(ARG.dil || "tr");
const CIKTI = path.resolve("tasarim/kasa-savunma/canli");
fs.mkdirSync(CIKTI, { recursive: true });
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const MAC_YOLU = new RegExp("/kasa/(" + UUID.source + ")");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const BAS = Date.now();
const sn = () => ((Date.now() - BAS) / 1000).toFixed(1);
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log(`  ✓ +${sn()}s ${ad}`); } else { kaldi++; console.log(`  ✗ +${sn()}s ${ad}`, ek); } };
const adim = (m) => console.log(`· +${sn()}s ${m}`);

async function db(sql) {
  const istemci = await new PgIstemci(await baglantiDizgisi()).baglan();
  try { await istemci.sorgu("set statement_timeout = '10s'"); const r = await istemci.sorgu(sql); return Array.isArray(r) ? r : (r?.rows ?? []); }
  finally { await istemci.kapat().catch(() => {}); }
}

// ---- oturumlar
const veri = JSON.parse(fs.readFileSync(".arayuz-denetim-oturum.json", "utf8"));
const hesaplar = [];
for (const o of veri.origins ?? []) {
  const j = o.localStorage?.find((x) => x.name.includes("auth-token"));
  try { const uid = JSON.parse(j.value).user.id; hesaplar.push({ uid, kayitlar: o.localStorage, origin: o.origin }); } catch { /* yok */ }
}
const adlar = await db(`select id, takma_ad from profiles where id in (${hesaplar.map((h) => alintila(h.uid)).join(",") || "null"})`);
for (const h of hesaplar) h.ad = adlar.find((a) => a.id === h.uid)?.takma_ad;
const hA = hesaplar.find((h) => h.ad === AD_A), hB = hesaplar.find((h) => h.ad === AD_B);
if (!hA || !hB) { console.log(`DUR: oturum yok (bulunan: ${hesaplar.map((h) => h.ad).join(", ")})`); process.exit(1); }

// ---- sayfa içi kayıt: son kasa_durum, ses, tek seferlik anlar
const HAZIRLIK = ({ kayitlar, koken, dil }) => {
  try {
    if (location.origin === koken && !sessionStorage.getItem("__svTest")) {
      for (const k of kayitlar) localStorage.setItem(k.name, k.value);
      localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1");
      sessionStorage.setItem("__svTest", "1");
    }
    sessionStorage.setItem("bd_ses_tani", "1");
  } catch { /* yok */ }
  const ses = []; ses.push = function (...x) { for (const o of x) o.w = Date.now(); return Array.prototype.push.apply(this, x); };
  window.__sesKayit = ses;
  window.__kd = null;
  const asil = window.fetch;
  window.fetch = async function (...a) {
    const url = String(a[0]?.url ?? a[0] ?? "");
    const y = await asil.apply(this, a);
    if (/\/rpc\/kasa_durum/.test(url)) y.clone().json().then((d) => { if (d && typeof d === "object") window.__kd = d; }).catch(() => {});
    return y;
  };
  window.__an = [];
  try {
    const SINIF = ["ks-savunma-an", "ks-izle-bant", "ks-bant--savunma", "ks-ac-an", "ks-carpan-etiket"];
    new MutationObserver((l) => { for (const m of l) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      for (const s of SINIF) if (n.classList?.contains(s) || n.querySelector?.("." + s)) window.__an.push({ w: Date.now(), s });
    } }).observe(document, { subtree: true, childList: true });
  } catch { /* yok */ }
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
async function ac(ad, h) {
  const b = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: GEN, height: YUK }, deviceScaleFactor: 1,
    locale: DIL === "en" ? "en-US" : "tr-TR", timezoneId: "Europe/Istanbul" });
  await b.addInitScript(HAZIRLIK, { kayitlar: h.kayitlar, koken: KOKEN, dil: DIL });
  const s = await b.newPage();
  const konsol = [];
  s.on("console", (m) => { if (m.type() === "error" && !/\.(mp3|ogg|wav|m4a)|Failed to load resource/.test(m.text() + (m.location()?.url ?? ""))) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  return { ad, h, b, s, konsol };
}
const kd = (o) => o.s.evaluate(() => window.__kd).catch(() => null);
const dokun = async (l, ms = 3000) => { try { await l.click({ timeout: ms }); return true; } catch { return false; } };
const foto = (o, ad) => o.s.screenshot({ path: path.join(CIKTI, `${ad}-${o.ad}.png`) }).catch(() => {});
const dogruOnbellek = new Map();
async function dogruSik(macId, d) {
  const anahtar = `${d.tur}-${d.altin}-${d.savunma?.durum === "soru" ? "s" : "n"}`;
  if (!dogruOnbellek.has(anahtar)) dogruOnbellek.set(anahtar,
    db(`select q.dogru_cevap::int as d from kasa_maclari k join questions q on q.id = k.soru_id where k.id = ${alintila(macId)}`).then((r) => Number(r[0]?.d)));
  return dogruOnbellek.get(anahtar);
}
async function cevapla(o, i) {
  const l = o.s.locator(".qt-sik").nth(i);
  for (let k = 0; k < 30; k++) { if (await l.isEnabled().catch(() => false)) break; await bekle(200); }
  return dokun(l, 4000);
}

let A, B, macId;
const SONUC = { adimlar: [] };
try {
  A = await ac("A", hA); B = await ac("B", hB);
  for (const o of [A, B]) {
    await o.s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await bekle(2500);
    const uid = await o.s.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); try { return JSON.parse(localStorage.getItem(k)).user.id; } catch { return null; } });
    if (uid !== o.h.uid) throw new Error(`${o.ad}: oturum açılmadı`);
    // yenilenen jeton dosyaya geri yazılır (jeton dönüşümü)
    const j = await o.s.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); return { k, v: localStorage.getItem(k) }; });
    const v2 = JSON.parse(fs.readFileSync(".arayuz-denetim-oturum.json", "utf8"));
    const kayit = v2.origins.find((x) => x.origin === o.h.origin)?.localStorage.find((x) => x.name === j.k);
    if (kayit && kayit.value !== j.v) { kayit.value = j.v; fs.writeFileSync(".arayuz-denetim-oturum.json", JSON.stringify(v2, null, 2)); }
    await o.s.mouse.click(5, Math.round(YUK / 2)).catch(() => {});
    await o.s.goto(ADRES + "/kasa", { waitUntil: "domcontentloaded" });
    await o.s.locator(".ks-ozet, .ks-giris").first().waitFor({ timeout: 25000 });
  }
  adim("iki oturum açık, Hazine girişi");
  const ara = (o) => dokun(o.s.getByRole("button", { name: /Rakip ara|Find opponent|Find an opponent/i }).first(), 6000);
  if (!(await ara(A))) throw new Error("A: Rakip ara yok");
  await bekle(300);
  if (!(await ara(B))) throw new Error("B: Rakip ara yok");
  for (let i = 0; i < 120 && !(MAC_YOLU.test(A.s.url()) && MAC_YOLU.test(B.s.url())); i++) await bekle(500);
  macId = A.s.url().match(MAC_YOLU)?.[1];
  if (!macId || B.s.url().match(MAC_YOLU)?.[1] !== macId) throw new Error("iki hesap aynı maça düşmedi (bot eşleşmesi olabilir) — tekrar çalıştır");
  const [m] = await db(`select (bot is not null) as botlu, savunma_acik, hedef, kasa_tavan, devam_carpan from kasa_maclari where id = ${alintila(macId)}`);
  adim(`maç ${macId} · botlu ${m.botlu} · savunma_acik ${m.savunma_acik} · hedef ${m.hedef} · tavan ${m.kasa_tavan} · ×${m.devam_carpan}`);
  ok("gerçek-gerçek maç, Savunma Hakkı açık", (m.botlu === false || m.botlu === "f") && (m.savunma_acik === true || m.savunma_acik === "t"));

  let asama = "sahip";   // sahip → karar → tetik → savunma → sonra → bitir
  let sonIs = "";
  const sayacFark = [];
  const bitis = Date.now() + 7 * 60 * 1000;
  while (Date.now() < bitis && asama !== "bitir") {
    const [da, dbb] = await Promise.all([kd(A), kd(B)]);
    if (!da || !dbb) { await bekle(300); continue; }
    if (da.durum !== "aktif") { ok("maç beklenmedik biçimde bitti", false, da.sonuc_neden); break; }
    const is = `${da.faz}-${da.tur}-${da.savunma?.durum ?? "-"}-${da.karar?.veren ?? "-"}`;
    const yeni = is !== sonIs;
    const ben = da.ben, hakA = (da.savunma_hak ?? []).includes(ben);

    if (da.faz === "cevap" && !da.savunma && yeni) {
      sonIs = is;
      const d = await dogruSik(macId, da);
      await bekle(1200);
      if (asama === "sahip") { await cevapla(A, d); await cevapla(B, (d + 1) % 4); adim(`tur ${da.tur}: A doğru, B yanlış (A sahip olmalı)`); }
      else if (asama === "tetik" && hakA) { await cevapla(A, (d + 1) % 4); await cevapla(B, d); adim(`tur ${da.tur}: A yanlış, B doğru (tetik bekleniyor)`); }
      else if (asama === "sonra") {
        ok("savunma sonrası yeni tur: sahipsiz soru, karar yok", da.sahip === null && da.tur > SONUC.savunmaTur, `sahip ${da.sahip}`);
        await foto(A, "6-sonraki-tur"); asama = "bitir";
      } else { await cevapla(A, (d + 1) % 4); await cevapla(B, (d + 2) % 4); adim(`tur ${da.tur}: ikisi yanlış (bekleme)`); }
    } else if (da.faz === "karar" && yeni) {
      sonIs = is;
      if (da.karar?.veren === ben && asama === "sahip") {
        await A.s.locator(".ks-karar-eylem button").first().waitFor({ timeout: 4000 }).catch(() => {});
        const metin = (await A.s.locator(".ks-karar-eylem button").allInnerTexts()).map((x) => x.replace(/\s+/g, " ").trim());
        const k = Number(da.karar.deger), bek = Math.min(Math.ceil(k * Number(da.devam_carpan || 1)), Number(da.tavan) || Infinity);
        const puanA = Number(da.oyuncular.find((x) => x.id === ben)?.puan);
        ok(`karar: AÇ "→ +${k} · Skor ${puanA + k}/${da.hedef}"`, new RegExp(`(AÇ|OPEN) → \\+${k}.*(Skor|Score) ${puanA + k}/${da.hedef}`).test(metin[0] ?? ""), metin[0]);
        ok(`karar: DEVAM "→ Hazine ${bek}" + sahipsiz`, new RegExp(`(DEVAM → Hazine|KEEP → Treasure) ${bek}.*(sahipsiz|unclaimed)`).test(metin[1] ?? ""), metin[1]);
        ok("karar: DEVAM düğmesinde kalkan", (await A.s.locator(".ks-karar-eylem button").nth(1).locator(".ks-hak").count()) === 1);
        await foto(A, "2-karar");
        const t = await dokun(A.s.locator(".ks-karar-eylem button").nth(1));
        ok("A DEVAM'a bastı", t);
        asama = "tetik";
      } else if (da.karar?.veren === ben) { await dokun(A.s.locator(".ks-karar-eylem button").first()); adim("A AÇ (beklenmedik karar)"); }
      else { await dokun(B.s.locator(".ks-karar-eylem button").first()); adim("B AÇ (beklenmedik karar)"); }
    } else if (da.faz === "sonuc" && da.savunma?.durum === "bekliyor" && yeni) {
      sonIs = is;
      await bekle(400);
      const [bantA, bantB] = await Promise.all([A, B].map((o) => o.s.locator(".ks-bant").first().innerText().catch(() => "")));
      ok("tetik: A'da 'Savunma Hakkı devrede'", /Savunma Hakkı devrede|Defense Right activated/i.test(bantA), bantA);
      ok("tetik: B'de 'Rakip Savunma Hakkı kullanıyor'", /Rakip Savunma Hakkı kullanıyor|Opponent is using/i.test(bantB), bantB);
      await foto(A, "3-tetik"); await foto(B, "3-tetik");
      asama = "savunma";
    } else if (da.faz === "cevap" && da.savunma?.durum === "soru") {
      if (yeni) {
        sonIs = is; SONUC.savunmaTur = da.tur;
        await B.s.locator(".ks-izle-bant").waitFor({ timeout: 6000 }).catch(() => {});
        await bekle(1500);
        const iz = await B.s.evaluate(() => ({
          bant: document.querySelector(".ks-izle-bant")?.innerText ?? "",
          sayac: Number(document.querySelector(".ks-izle-sayac")?.childNodes[0]?.textContent ?? NaN),
          acik: [...document.querySelectorAll(".qt-sik")].filter((e) => !e.disabled && !/kilitli/.test(e.className)).length,
          tasma: document.documentElement.scrollWidth - innerWidth,
        }));
        ok("izleyen (B): kalkan bandı 'Rakip hazinesini savunuyor'", /Rakip hazinesini savunuyor|Opponent is defending/.test(iz.bant), iz.bant);
        ok(`izleyen (B): büyük sayaç işliyor (${iz.sayac})`, iz.sayac >= 1 && iz.sayac <= 15);
        ok(`izleyen (B): şıklar pasif (${iz.acik})`, iz.acik === 0);
        ok("izleyen (B): yatay taşma yok", iz.tasma <= 0);
        const sv = await A.s.evaluate(() => ({ satir: document.querySelector(".ks-savunma-satir")?.innerText ?? "",
          acik: [...document.querySelectorAll(".qt-sik")].filter((e) => !e.disabled).length }));
        ok("savunan (A): Savunma Sorusu satırı + şıklar açık", /SAVUNMA SORUSU|Savunma Sorusu|Defense Question/i.test(sv.satir) && sv.acik >= 2, JSON.stringify(sv));
        for (let i = 0; i < 3; i++) {   // iki taraftaki sayaç aynı anda
          const [sa, sb] = await Promise.all([
            A.s.evaluate(() => Number(document.querySelector(".ks-sayac .qt-sayac-sayi")?.textContent ?? NaN)),
            B.s.evaluate(() => Number(document.querySelector(".ks-izle-sayac")?.childNodes[0]?.textContent ?? NaN))]);
          sayacFark.push([sa, sb]); await bekle(700);
        }
        ok(`senkron: savunan/izleyen sayaç farkı ≤ 1 sn ${JSON.stringify(sayacFark)}`, sayacFark.every(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1));
        await foto(A, "4-savunma-ben"); await foto(B, "4-savunma-izle");
        const d = await dogruSik(macId, da);
        await cevapla(A, d);
        adim("A Savunma Sorusunu doğru cevapladı");
      }
    } else if (da.faz === "sonuc" && da.savunma?.durum === "basarili" && yeni) {
      sonIs = is;
      await bekle(400);
      const [bantA, bantB] = await Promise.all([A, B].map((o) => o.s.locator(".ks-bant").first().innerText().catch(() => "")));
      ok("savundu: A 'Savundun! Hazine sahipsiz kaldı'", /Savundun|Defended/.test(bantA), bantA);
      ok("savundu: B 'Rakip savundu: hazine sahipsiz'", /Rakip savundu|Opponent defended/.test(bantB), bantB);
      ok("savundu: hazine sahipsiz (sunucu)", da.sahip === null);
      await foto(A, "5-savundu"); await foto(B, "5-savundu");
      asama = "sonra";
    } else if (da.faz === "sonuc" && da.savunma?.durum === "basarisiz" && yeni) {
      sonIs = is; ok("savunma başarısız oldu (beklenmedik)", false, da.savunma?.neden); asama = "bitir";
    }
    await bekle(250);
  }
  ok("akış sonuna ulaşıldı", asama === "bitir", asama);

  // tek seferlik anlar + ses
  for (const o of [A, B]) {
    const r = await o.s.evaluate(() => ({ an: window.__an, ses: (window.__sesKayit ?? []).map((x) => ({ rol: x.rol, w: x.w })) }));
    const say = (s) => r.an.filter((x) => x.s === s).length;
    ok(`${o.ad}: kalkan anı en fazla 2 kez (tetik + sonuç) — ${say("ks-savunma-an")}`, say("ks-savunma-an") <= 2);
    if (o === B) ok(`B: izleme bandı tek kez girdi — ${say("ks-izle-bant")}`, say("ks-izle-bant") === 1);
    const cift = r.ses.filter((x, i) => r.ses.some((y, j) => j < i && y.rol === x.rol && x.w - y.w < 250));
    ok(`${o.ad}: aynı ses üst üste çalmadı (${r.ses.length} ses)`, cift.length === 0, JSON.stringify(cift.slice(0, 3)));
    ok(`${o.ad}: konsol hatası yok`, o.konsol.length === 0, o.konsol.slice(0, 3).join(" | "));
  }
} catch (e) {
  kaldi++; console.log("  ✗ HATA", String(e.message ?? e).slice(0, 300));
  for (const o of [A, B].filter(Boolean)) await foto(o, "hata");
} finally {
  // temizlik: A maçtan çıkar (maç açık kalmasın), tarayıcı kapanır
  try {
    if (macId && A) {
      const [d] = await db(`select durum from kasa_maclari where id = ${alintila(macId)}`);
      if (d?.durum === "aktif") {
        await dokun(A.s.getByRole("button", { name: /Maçtan çık|Leave match/i }).first(), 4000);
        await dokun(A.s.getByRole("button", { name: /^(Çık|Leave)$/ }).last(), 4000);
        await bekle(3000);
      }
      const [s2] = await db(`select durum, sonuc_neden from kasa_maclari where id = ${alintila(macId)}`);
      console.log(`· maç sonu durumu: ${s2?.durum} / ${s2?.sonuc_neden}`);
      if (s2?.durum === "aktif") { kaldi++; console.log("  ✗ maç açık kaldı"); }
    }
  } catch (e) { console.log("  · temizlik:", e.message); }
  await tarayici.close().catch(() => {});
  console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
