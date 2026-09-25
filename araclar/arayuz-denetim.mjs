// ============================================================
// ARAYÜZ DENETİMİ — Arayüz Yenileme (20 Eylül 2026)
//
// Ne yapar: sayfaları dört genişlikte (1440 · 850 · 560 · 390) açar ve
// doğrulama listesini ÖLÇER:
//   · yatay taşma var mı (scrollWidth > clientWidth) ve taşıran öğe hangisi
//   · sabit alt menü kaydırınca yerinden oynuyor mu
//   · `position: fixed` ile `transform` AYNI öğede mi (iOS tuzağı)
//   · sabit öğenin ATASINDA transform/filter/perspective var mı (aynı tuzak)
//   · dokunma hedefi < 44 px olan menü/düğme var mı
//   · konsolda hata var mı
//
// Neden: bu makinede WebKit çalışmıyor (kök CLAUDE.md › iOS Safari kontrolü).
// Kontrol listesi Chromium'da iPhone boyutunda hesaplanmış stillerle denetlenir;
// gerçek iOS kontrolü sahibinin telefonunda yapılır.
//
// Kullanım:
//   npm run dev            (başka bir kabukta)
//   node araclar/arayuz-denetim.mjs [--gorsel] [--adres=http://localhost:5173]
//
// NOT: sayfalar "networkidle" ile beklenmez — Supabase Realtime kalıcı bir
// bağlantı açtığı için ağ hiç boşa çıkmıyor ve bekleme takılıyordu (ölçüldü,
// 20 Eyl 2026). "domcontentloaded" + sabit bekleme kullanılıyor.
//
// Oturum: ilk çalıştırmada "Misafir olarak dene" ile bir misafir hesabı açar
// ve oturumu `.arayuz-denetim-oturum.json` dosyasına yazar (git'e girmez).
// Sonraki çalıştırmalar o oturumu kullanır — her seferinde yeni hesap açılmaz.
// ============================================================
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const ADRES = ARG.adres || "http://localhost:5173";
const GORSEL = Boolean(ARG.gorsel);
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const GORSEL_DIZIN = path.resolve("arayuz-denetim-gorseller");

const GENISLIKLER = [
  { ad: "masaustu", w: 1440, h: 900 },
  { ad: "kirilma-850", w: 850, h: 900 },
  { ad: "kirilma-560", w: 560, h: 900 },
  { ad: "telefon-360", w: 360, h: 800 },
  { ad: "telefon-390", w: 390, h: 844 },
  { ad: "telefon-412", w: 412, h: 915 },
  { ad: "telefon-430", w: 430, h: 932 },
];

const SAYFALAR = [
  { ad: "ana", yol: "/" },
  { ad: "modlar", yol: "/modlar" },
  { ad: "lig", yol: "/siralama" },
  { ad: "arkadaslar", yol: "/arkadaslar" },
  { ad: "meydan", yol: "/meydan" },
  { ad: "mesajlar", yol: "/mesajlar" },
  { ad: "dukkan", yol: "/joker" },
  { ad: "coin", yol: "/joker?sekme=coin" },
  { ad: "profil", yol: "/profil" },
  { ad: "ayarlar", yol: "/profil?sekme=ayarlar" },
  { ad: "turnuva", yol: "/turnuva" },
  { ad: "duello", yol: "/duello" },
  { ad: "calisma", yol: "/calisma" },
  { ad: "gizlilik", yol: "/gizlilik" },
  { ad: "kosullar", yol: "/kosullar" },
  { ad: "bulunamadi", yol: "/boyle-bir-sayfa-yok" },
];

/** Sayfada doğrulama listesini ölçer (tarayıcı içinde çalışır). */
const OLCUM = () => {
  const de = document.documentElement;
  const gor = (e) => {
    const s = getComputedStyle(e);
    return s.display !== "none" && s.visibility !== "hidden" && e.getBoundingClientRect().width > 0;
  };
  const ad = (e) =>
    e.tagName.toLowerCase() + (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : "");

  // 1) Yatay taşma
  const tasma = de.scrollWidth - de.clientWidth;
  const tasiran = [];
  if (tasma > 1) {
    for (const e of document.querySelectorAll("body *")) {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) tasiran.push(ad(e));
      if (tasiran.length >= 5) break;
    }
  }

  // 2) Sabit öğelerde transform / transformlu ata
  const sabitSorun = [];
  for (const e of document.querySelectorAll("body *")) {
    const s = getComputedStyle(e);
    if (s.position !== "fixed" && s.position !== "sticky") continue;
    if (!gor(e)) continue;
    if (s.transform !== "none") sabitSorun.push({ oge: ad(e), sorun: "aynı öğede transform" });
    let p = e.parentElement;
    while (p && p !== document.body) {
      const ps = getComputedStyle(p);
      if (ps.transform !== "none" || ps.filter !== "none" || ps.perspective !== "none") {
        sabitSorun.push({ oge: ad(e), sorun: "atada transform/filter: " + ad(p) });
        break;
      }
      p = p.parentElement;
    }
  }

  // 3) Dokunma hedefleri (menü ve düğmeler)
  const kucukHedef = [];
  // Masaüstü menüsü fare hedefidir (850 px altında zaten gizli); dokunma
  // hedefi kuralı dokunmatik genişliklerde aranır.
  const dokunmatik = de.clientWidth <= 850;
  const hedefler = document.querySelectorAll(
    (dokunmatik ? ".mobile-nav a, .desktop-nav a, " : "") +
    ".top-actions button, .top-actions a, .play-button, .mode-card, .catalog-card, .setting"
  );
  for (const e of hedefler) {
    if (!gor(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.height < 44 || r.width < 44) kucukHedef.push({ oge: ad(e), w: Math.round(r.width), h: Math.round(r.height) });
  }

  // 4) Alt menü sabit mi
  const menu = document.querySelector(".mobile-nav");
  const menuBilgi = menu && gor(menu)
    ? { ust: Math.round(menu.getBoundingClientRect().top), konum: getComputedStyle(menu).position }
    : null;

  return { tasma, tasiran, sabitSorun, kucukHedef, menuBilgi, yukseklik: de.scrollHeight };
};

/** Kaydırdıktan sonra sabit menü yerinden oynadı mı. */
const KAYDIR_OLC = () => {
  const menu = document.querySelector(".mobile-nav");
  if (!menu) return null;
  return Math.round(menu.getBoundingClientRect().top);
};

/** Tanıtım perdesi açıksa kapatır (ölçüm modal altında yapılmasın). */
async function tanitimiKapat(sayfa) {
  for (let i = 0; i < 8; i++) {
    const atla = sayfa.getByRole("button", { name: /^Atla$/ });
    if (await atla.count()) { await atla.first().click(); await sayfa.waitForTimeout(500); return; }
    const basla = sayfa.getByRole("button", { name: /Hadi başlayalım/i });
    if (await basla.count()) { await basla.first().click(); await sayfa.waitForTimeout(500); return; }
    await sayfa.waitForTimeout(300);
  }
}

/** Kurulum sihirbazını (takma ad → avatar → şehir) baştan sona doldurur. */
async function kurulumuTamamla(sayfa) {
  await tanitimiKapat(sayfa);
  // 1) Takma ad
  const alan = sayfa.locator(".bd-modal-katman input").first();
  if (await alan.count()) {
    await alan.fill("ArayuzDenetim" + Math.floor(Math.random() * 900 + 100));
    await sayfa.getByRole("button", { name: /^Devam$/ }).first().click();
    await sayfa.waitForTimeout(1800);
  }
  // 2) Avatar — hazır ikonlardan ilki
  const ikon = sayfa.locator(".bd-modal-katman .bd-avatar-secenek, .bd-modal-katman img[src*='/avatars/']").first();
  if (await ikon.count()) { await ikon.click(); await sayfa.waitForTimeout(400); }
  const kullan = sayfa.getByRole("button", { name: /Bu avatarı kullan/i });
  const avatarsiz = sayfa.getByRole("button", { name: /Avatarsız devam et/i });
  if (await kullan.count()) { await kullan.first().click(); await sayfa.waitForTimeout(1800); }
  else if (await avatarsiz.count()) { await avatarsiz.first().click(); await sayfa.waitForTimeout(1800); }
  // 3) Şehir — 641'den beri aranabilir liste (ülke hâlâ select; varsayılan TR kalır)
  const sehir = sayfa.locator(".bd-modal-katman [role=combobox]").first();
  if (await sehir.count()) {
    await sehir.click();
    await sayfa.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
    const secenek = sayfa.locator(".bd-modal-katman [role=option]").first();
    if (await secenek.count()) await secenek.click();
    await sayfa.getByRole("button", { name: /Oyuna başla/i }).first().click();
    await sayfa.waitForTimeout(2500);
  }
  await tanitimiKapat(sayfa);
}

async function misafirGiris(sayfa) {
  await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const dugme = sayfa.getByRole("button", { name: /Misafir olarak dene/i });
  if (!(await dugme.count())) return false;
  await dugme.click();
  await sayfa.waitForTimeout(2500);
  await kurulumuTamamla(sayfa);
  return true;
}

(async () => {
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  const baglam = await tarayici.newContext(
    fs.existsSync(OTURUM) ? { storageState: OTURUM } : {}
  );
  const sayfa = await baglam.newPage();

  const konsolHatalari = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsolHatalari.push(m.text().slice(0, 160)); });
  sayfa.on("pageerror", (e) => konsolHatalari.push("pageerror: " + String(e).slice(0, 160)));

  await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const girisVar = await sayfa.getByRole("button", { name: /Misafir olarak dene/i }).count();
  if (girisVar) {
    console.log("· Oturum yok — misafir hesabı açılıyor…");
    await misafirGiris(sayfa);
    await baglam.storageState({ path: OTURUM });
    console.log("· Oturum kaydedildi:", OTURUM);
  } else {
    // Kayıtlı oturumda kurulum yarım kalmış olabilir: modal açıksa ölçüm
    // onun altında yapılır ve sayfa hiç görünmez. Önce kapat.
    await kurulumuTamamla(sayfa);
  }

  // Ölçümden önce hiçbir tam ekran katman açık olmamalı.
  const katman = await sayfa.locator(".bd-modal-katman, .bd-tanitim-katman").count();
  if (katman) {
    console.log("! UYARI: tam ekran katman hâlâ açık — ölçüm güvenilmez.");
    process.exitCode = 1;
    await tarayici.close();
    return;
  }

  if (GORSEL && !fs.existsSync(GORSEL_DIZIN)) fs.mkdirSync(GORSEL_DIZIN, { recursive: true });

  const bulgular = [];
  for (const g of GENISLIKLER) {
    await sayfa.setViewportSize({ width: g.w, height: g.h });
    for (const s of SAYFALAR) {
      konsolHatalari.length = 0;
      try {
        await sayfa.goto(ADRES + s.yol, { waitUntil: "domcontentloaded", timeout: 20000 });
      } catch {
        bulgular.push({ genislik: g.ad, sayfa: s.ad, tur: "acilmadi" });
        continue;
      }
      await sayfa.waitForTimeout(700);
      const o = await sayfa.evaluate(OLCUM);

      if (o.tasma > 1) bulgular.push({ genislik: g.ad, sayfa: s.ad, tur: "yatay-tasma", tasma: o.tasma, tasiran: o.tasiran });
      for (const x of o.sabitSorun) bulgular.push({ genislik: g.ad, sayfa: s.ad, tur: "sabit-transform", ...x });
      for (const x of o.kucukHedef) bulgular.push({ genislik: g.ad, sayfa: s.ad, tur: "kucuk-hedef", ...x });

      // Kaydırınca sabit menü oynuyor mu
      if (o.menuBilgi && o.yukseklik > g.h + 200) {
        const once = o.menuBilgi.ust;
        await sayfa.evaluate(() => window.scrollBy(0, 400));
        await sayfa.waitForTimeout(350);
        const sonra = await sayfa.evaluate(KAYDIR_OLC);
        if (sonra !== null && Math.abs(sonra - once) > 2) {
          bulgular.push({ genislik: g.ad, sayfa: s.ad, tur: "menu-kaydi", once, sonra });
        }
        await sayfa.evaluate(() => window.scrollTo(0, 0));
      }

      if (konsolHatalari.length) {
        bulgular.push({ genislik: g.ad, sayfa: s.ad, tur: "konsol-hatasi", ilk: konsolHatalari.slice(0, 2) });
      }

      if (GORSEL) {
        await sayfa.screenshot({ path: path.join(GORSEL_DIZIN, `${s.ad}-${g.ad}.png`), fullPage: false });
      }
    }
  }

  await tarayici.close();

  console.log("\n===== ARAYÜZ DENETİMİ =====");
  if (!bulgular.length) {
    console.log("TEMİZ — yatay taşma yok, sabit öğe kayması yok, dokunma hedefleri ≥ 44 px, konsol temiz.");
  } else {
    const grup = {};
    for (const b of bulgular) (grup[b.tur] = grup[b.tur] ?? []).push(b);
    for (const [tur, liste] of Object.entries(grup)) {
      console.log(`\n${tur.toUpperCase()} (${liste.length}):`);
      for (const b of liste.slice(0, 20)) console.log("  ·", JSON.stringify(b));
      if (liste.length > 20) console.log(`  … ve ${liste.length - 20} tane daha`);
    }
  }
  process.exitCode = bulgular.some((b) => b.tur === "yatay-tasma" || b.tur === "sabit-transform" || b.tur === "menu-kaydi" || b.tur === "acilmadi") ? 1 : 0;
})();
