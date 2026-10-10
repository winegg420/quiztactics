// ============================================================
// LİG GÖRSEL — Lig sayfası üst kartı + sıra satırları + profil lig sahnesi, 5 lig × boyut × dil (7 Eki 2026).
// SUNUCUYA YAZMAZ: lig_grubum taklit edilir (25 kişilik grup, "ben" 7. sırada); oyuncu_kartlari gerçek cevaptan
// alınır, yalnız `lig` alanı ölçülen lige çevrilir. Ayar/çeviri/oturum gerçek.
//
// Ölçer: yatay taşma · pankart içinde kesilen/taşan öğe · geri sayım tek satır · ödül hapları tek satır ·
//   sıra satırı yükseklikleri sabit · sekmeler taşmıyor · profil kartı taşmıyor · konsol hatası.
//
// Kullanım:  npm run dev -- --port 5199   (başka kabukta)
//            node araclar/lig-gorsel-ekran.mjs [--adres=http://localhost:5199] [--lig=gumus] [--hizli] [--cikti=tasarim/lig-gorsel]
// Oturum: .arayuz-denetim-oturum.json (+ -en.json). Çıktı: tasarim/lig-gorsel/*.png + olcum.json
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const arg = (ad, vars) => (process.argv.find((a) => a.startsWith(`--${ad}=`)) ?? `--${ad}=${vars}`).slice(ad.length + 3);
const ADRES = arg("adres", "http://localhost:5199");
const HIZLI = process.argv.includes("--hizli");
// 7 Eki: --bp = oyuncu kartlarının yarısı sezon_bp (altın plaka) · --azalt = prefers-reduced-motion · --sadece-lig = profil adımı atlanır
const BP = process.argv.includes("--bp"), AZALT = process.argv.includes("--azalt"), SADECE_LIG = process.argv.includes("--sadece-lig");
const CIKTI = path.resolve(arg("cikti", "tasarim/lig-gorsel"));
fs.mkdirSync(CIKTI, { recursive: true });
const origin = new URL(ADRES).origin;

const LIGLER = arg("lig", "") ? [arg("lig", "")] : ["bronz", "gumus", "altin", "elmas", "efsane"];
const BOYUTLAR = HIZLI ? [[390, 844]] : [[390, 844], [390, 664], [360, 640]];

const oturumOku = (dosya) => {
  if (!fs.existsSync(dosya)) return null;
  const k = JSON.parse(fs.readFileSync(dosya, "utf8")).origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
  return k ? k.localStorage : null;
};
const KAYNAK = { tr: oturumOku(path.resolve(".arayuz-denetim-oturum.json")), en: oturumOku(path.resolve(".arayuz-denetim-oturum-en.json")) };
if (!KAYNAK.tr) { console.error("Oturum yok: önce `node araclar/arayuz-denetim.mjs --sadece-oturum`."); process.exit(1); }
const DILLER = HIZLI ? ["tr"] : ["tr", "en"].filter((d) => KAYNAK[d]);
const kimlik = (dil) => {
  try {
    const t = KAYNAK[dil].find((x) => x.name.includes("auth-token"));
    return JSON.parse(t.value).user.id;
  } catch { return null; }
};

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
const ADLAR = ["Deniz", "Kaan", "Elif", "Mert", "Zeynep", "Ayşe Nur Karadeniz", "Burak", "Ece", "Can", "Selin", "Emre", "Defne",
  "Arda", "İpek", "Onur", "Yağmur", "Kerem", "Naz", "Ozan", "Ceren", "Barış", "Melis", "Tolga", "Sude"];

function grup(lig, benId) {
  const bitis = new Date(Date.now() + (5 * 24 + 3) * 3600e3 + 20 * 60e3).toISOString();
  const satirlar = [];
  for (let i = 1; i <= 25; i++) {
    const ben = i === 7;
    satirlar.push({
      sira: i, user_id: ben ? benId : crypto.randomUUID(), gorunen_ad: ben ? "Ben" : ADLAR[(i - 1) % ADLAR.length],
      gorunen_avatar: null, puan: Math.max(0, 640 - i * 23), ben, bot: i % 6 === 0, lig,
      grup_boyu: 25, yukselen: lig === "efsane" ? 0 : 5, dusen: lig === "bronz" ? 0 : 5, sezon_bitis: bitis, gorunum: null,
    });
  }
  return satirlar;
}

async function taklitKur(sayfa, lig, benId) {
  await sayfa.route(/\/rest\/v1\/rpc\/lig_grubum(\?|$)/, (r) => r.request().method() === "OPTIONS"
    ? r.fulfill({ status: 204, headers: CORS })
    : r.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(grup(lig, benId)) }));
  await sayfa.route(/\/rest\/v1\/rpc\/oyuncu_kartlari(\?|$)/, async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: CORS });
    try {
      const yanit = await r.fetch();
      const veri = await yanit.json();
      let idler = []; try { idler = JSON.parse(r.request().postData() ?? "{}").p_idler ?? []; } catch { /* gövde yok */ }
      const gercek = Array.isArray(veri) ? veri : [];
      const var_ = new Set(gercek.map((k) => k.id));
      const taklit = BP ? idler.filter((i) => !var_.has(i)).map((i) => ({ id: i })) : [];
      const yeni = [...gercek, ...taklit].map((k) => ({ ...k, lig, ...(BP ? { sezon_bp: k.id === benId || parseInt(String(k.id).slice(-1), 16) % 2 === 0 } : {}) }));
      return r.fulfill({ response: yanit, body: JSON.stringify(yeni), headers: { ...yanit.headers(), "content-type": "application/json" } });
    } catch (e) {
      // bağlam kapandıktan sonra gelen geç istek: sessizce bırak
      if (!/disposed|closed/i.test(e.message)) console.log("  · oyuncu_kartlari taklidi düştü:", e.message.split("\n")[0]);
      return r.continue().catch(() => {});
    }
  });
}

const OLC_LIG = () => {
  const iw = window.innerWidth;
  const sorun = [];
  const p = document.querySelector(".lg-pankart");
  if (!p) return { sorun: ["pankart yok"] };
  const pr = p.getBoundingClientRect();
  for (const e of p.querySelectorAll("*")) {
    const r = e.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > pr.right + 1 || r.left < pr.left - 1) sorun.push(`taşan: ${e.className?.toString().slice(0, 40)} ${Math.round(r.left)}–${Math.round(r.right)}`);
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible" && e.clientWidth > 0) sorun.push(`kesik: ${e.className?.toString().slice(0, 40)}`);
  }
  const sure = p.querySelector(".lg-sure");
  const sureMetin = sure?.querySelector("span:last-child");
  const satirYuk = sureMetin ? Math.round(sureMetin.getBoundingClientRect().height) : 0;
  const satirBoy = sureMetin ? parseFloat(getComputedStyle(sureMetin).lineHeight) || 20 : 20;
  if (sureMetin && satirYuk > satirBoy * 1.5) sorun.push(`geri sayım iki satır (${satirYuk}px)`);
  const haplar = [...p.querySelectorAll(".lg-oduller > li")].map((e) => e.getBoundingClientRect());
  if (haplar.length && new Set(haplar.map((r) => Math.round(r.top))).size > 1) sorun.push("ödül hapları iki satır");
  const satirlar = [...document.querySelectorAll(".lg-liste .lg-satir-kap")].map((e) => Math.round(e.getBoundingClientRect().height));
  const yuk = [...new Set(satirlar)];
  if (yuk.length > 1) sorun.push(`satır yükseklikleri farklı: ${yuk.join("/")}`);
  for (const e of document.querySelectorAll(".lg-liste .lg-satir-kap *")) {
    const r = e.getBoundingClientRect();
    if (r.width && r.right > iw + 0.5) { sorun.push(`satır taşıyor: ${e.className?.toString().slice(0, 30)}`); break; }
  }
  const dar = [...document.querySelectorAll(".lg-liste .lg-satir-ac")].filter((e) => e.getBoundingClientRect().height < 44).length;
  if (dar) sorun.push(`dokunma alanı <44px: ${dar}`);
  const bpSayi = document.querySelectorAll(".lg-liste .lg-bp").length;
  const sek = document.querySelector(".lg-sekmeler");
  if (sek && sek.getBoundingClientRect().right > iw + 0.5) sorun.push("sekmeler taşıyor");
  if (document.scrollingElement.scrollWidth > iw + 0.5) sorun.push(`yatay taşma ${document.scrollingElement.scrollWidth}>${iw}`);
  return {
    bpSayi, sorun, pankartYuk: Math.round(pr.height), satirYuk: yuk, sure: sure?.textContent ?? "",
    arka: getComputedStyle(p).backgroundColor, cerceve: getComputedStyle(p).borderTopColor,
  };
};

// 10 Eki (Ekran revizyonu Aşama 2): profilde dikey vitrin kartı (.qt-pf-ok[data-lig]) yerine tek satır kimlik
// (.qt-pf-kimlik .qt-pf-kisa). Lig, satırdaki amblemin aria-label'ından ("Gümüş Lig" / "Silver League") okunur.
const PROFIL_SECICI = ".qt-pf-kimlik .qt-pf-kisa";
const OLC_PROFIL = () => {
  const iw = window.innerWidth;
  const sorun = [];
  const k = document.querySelector(".qt-pf-kimlik .qt-pf-kisa");
  if (!k) return { sorun: ["profil kimlik satırı yok"] };
  const kr = k.getBoundingClientRect();
  if (kr.right > iw + 0.5 || kr.left < -0.5) sorun.push("kimlik satırı ekrandan taşıyor");
  if (document.scrollingElement.scrollWidth > iw + 0.5) sorun.push("yatay taşma");
  const etiket = k.querySelector(".qt-ok-lig .pp-amblem")?.getAttribute("aria-label") ?? "";
  const ADLAR = { bronz: /^(Bronz|Bronze)\s/, gumus: /^(Gümüş|Silver)\s/, altin: /^(Altın|Gold|Golden)\s/, elmas: /^(Elmas|Diamond)\s/, efsane: /^(Efsane|Legend)\s/ };
  const lig = Object.keys(ADLAR).find((l) => ADLAR[l].test(etiket)) ?? null;
  const s = getComputedStyle(k);
  return { sorun, lig, etiket, zemin: s.backgroundColor, yuk: Math.round(kr.height) };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const rapor = [];
let hata = 0;
for (const dil of DILLER) {
  const benId = kimlik(dil);
  const yerel = [...KAYNAK[dil].filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
  for (const lig of LIGLER) {
    for (const [w, h] of BOYUTLAR) {
      const baglam = await tarayici.newContext({
        viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: AZALT ? "reduce" : "no-preference",
        storageState: { cookies: [], origins: [{ origin, localStorage: yerel }] },
      });
      const sayfa = await baglam.newPage();
      const konsol = [];
      sayfa.on("console", (m) => { if (m.type() === "error" && !/favicon|chrome-extension/.test(m.text())) konsol.push(m.text().slice(0, 160)); });
      sayfa.on("pageerror", (e) => konsol.push(String(e).slice(0, 160)));
      await taklitKur(sayfa, lig, benId);
      const ad = `${lig}-${w}x${h}-${dil}`;
      try {
        await sayfa.goto(ADRES + "/siralama", { waitUntil: "domcontentloaded" });
        await sayfa.waitForSelector(".lg-pankart", { timeout: 25000 });
        await sayfa.waitForSelector(".lg-liste .lg-satir-kap", { timeout: 15000 });
        if (BP) await sayfa.waitForSelector(".lg-liste .lg-bp", { timeout: 8000 }).catch(() => {});
        await sayfa.waitForTimeout(1500);
        const o =await sayfa.evaluate(OLC_LIG);
        await sayfa.screenshot({ path: path.join(CIKTI, `lig-${ad}.png`) });
        await (await sayfa.$(".lg-pankart")).screenshot({ path: path.join(CIKTI, `pankart-${ad}.png`) });
        // Dünya sekmesi (gerçek veri): satır yükseklikleri sabit, taşma yok — yalnız ilk lig turunda (veri ligden bağımsız)
        if (lig === LIGLER[0]) {
          await sayfa.locator(".lg-sekmeler [role=tab]").nth(3).click();
          await sayfa.waitForSelector(".lg-liste .lg-satir-kap, .lg-podyum", { timeout: 15000 }).catch(() => {});
          await sayfa.waitForTimeout(1200);
          const od = await sayfa.evaluate(() => {
            const iw = window.innerWidth, s = [];
            const y = [...new Set([...document.querySelectorAll(".lg-liste .lg-satir-kap")].map((e) => Math.round(e.getBoundingClientRect().height)))];
            if (y.length > 1) s.push(`dünya satır yükseklikleri farklı: ${y.join("/")}`);
            for (const e of document.querySelectorAll(".lg-panel *")) { const r = e.getBoundingClientRect(); if (r.width && r.right > iw + 0.5) { s.push(`dünya taşan: ${e.className?.toString().slice(0, 30)}`); break; } }
            if (document.scrollingElement.scrollWidth > iw + 0.5) s.push("dünya yatay taşma");
            return s;
          });
          o.sorun.push(...od);
          await sayfa.screenshot({ path: path.join(CIKTI, `dunya-${w}x${h}-${dil}.png`) });
        }
        if (SADECE_LIG) {
          if (BP && !o.bpSayi) o.sorun.push("BP satırı yok");
          const sr = [...o.sorun, ...konsol.map((k) => "konsol: " + k)];
          if (sr.length) { hata++; console.log("✗", ad, sr.join(" | ")); } else console.log("✓", ad, `bp ${o.bpSayi} · satır ${o.satirYuk}`);
          rapor.push({ ad, sorun: sr, lig: o }); await baglam.close(); continue;
        }
        await sayfa.goto(ADRES + "/profil", { waitUntil: "domcontentloaded" });
        await sayfa.waitForSelector(`${PROFIL_SECICI} .qt-ok-lig .pp-amblem`, { timeout: 30000 });
        await sayfa.waitForTimeout(1200);
        const op = await sayfa.evaluate(OLC_PROFIL);
        await (await sayfa.$(".qt-pf-kimlik")).screenshot({ path: path.join(CIKTI, `profil-${ad}.png`) });
        const sorun = [...o.sorun, ...op.sorun.map((s) => "profil: " + s), ...(op.lig !== lig ? [`profil lig ${op.lig}`] : []), ...konsol.map((k) => "konsol: " + k)];
        if (sorun.length) { hata++; console.log("✗", ad, sorun.join(" | ")); } else console.log("✓", ad, `pankart ${o.pankartYuk}px · satır ${o.satirYuk} · "${o.sure}"`);
        rapor.push({ ad, sorun, lig: o, profil: op });
      } catch (e) {
        hata++;
        console.log("✗", ad, "açılamadı:", e.message.split("\n")[0]);
        rapor.push({ ad, sorun: ["açılamadı: " + e.message.split("\n")[0]] });
      }
      await baglam.close();
    }
  }
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(rapor, null, 1));
console.log(`\n${rapor.length - hata}/${rapor.length} temiz`);
process.exit(hata ? 1 : 0);
