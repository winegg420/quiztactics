// 770 ekran ölçümü: avatar seçim ızgaraları (Profil › Ayarlar, Dükkân › Avatar, Koleksiyon, Kurulum) — 390×700 ve 360×640, TR/EN.
// Ölçer: 62 avatarın Sahne rengi (nadirliğe göre) · bölüm başlıkları ve sırası · yatay taşma · dokunma hedefi ≥ 44 px · konsol hatası.
// Kullanım: npm run dev -- --port 5181 (başka kabukta) · node araclar/avatar-770-ekran.mjs once|sonra [--kurulum]
//   once  → bayrak kapalıyken görüntü (renk/başlık denetimi yapılmaz)   sonra → bayrak açık, tam denetim
//   --kurulum → yeni misafir hesabıyla Kurulum sihirbazı avatar adımı (hesap betiğin sonunda silinir)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const FAZ = process.argv[2] === "once" ? "once" : "sonra";
const KURULUM = process.argv.includes("--kurulum");
const ADRES = process.env.ADRES ?? "http://localhost:5181";
const SEC = (process.argv.find((a) => a.startsWith("--g="))?.slice(4) ?? "").split(",").filter(Boolean);   // --g=360x640tr,390x700en → yalnız bu görünümler (DB'ye hafif koşu)
const secili = (w, h, dil) => !SEC.length || SEC.includes(`${w}x${h}${dil}`);
const CIKTI = path.resolve("tasarim/avatar-nadirlik/canli", FAZ);
fs.mkdirSync(CIKTI, { recursive: true });
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const RENK = { yaygin: "#7d93ad", nadir: "#3fae6a", epik: "#8b2fd6", efsanevi: "#f5c431" };
const BASLIK = { tr: ["Yaygın", "Nadir", "Epik", "Efsanevi"], en: ["Common", "Rare", "Epic", "Legendary"] };

// Beklenen nadirlik: migration 770 listesi; ad → nadirlik (TR ve EN)
const sql = fs.readFileSync("supabase/migrations/20260612000770_avatar_nadirlik_yaz_ve_ac.sql", "utf8");
const liste = new Map([...sql.matchAll(/\('([a-z0-9-]+)','(yaygin|nadir|epik|efsanevi)'\)/g)].map((m) => [m[1], m[2]]));
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const satirlar = await db.sorgu("select anahtar, ad_tr, ad_en from avatar_nitelikleri");
const beklenen = { tr: new Map(), en: new Map() };
for (const r of satirlar.rows ?? satirlar) if (liste.has(r.anahtar)) for (const d of ["tr", "en"]) { beklenen[d].set(r.ad_tr, liste.get(r.anahtar)); beklenen[d].set(r.ad_en, liste.get(r.anahtar)); }   // hazır avatar adları iki dilde de gelebilir
const OTURUM_KULLANICI = JSON.parse(JSON.parse(fs.readFileSync(path.resolve(".arayuz-denetim-oturum.json"), "utf8")).origins.flatMap((o) => o.localStorage).find((x) => x.name.includes("auth-token")).value).user.id;
const ilkDil = await db.tek(`select dil from profiles where id = '${OTURUM_KULLANICI}'`);   // profil dili localStorage'ı ezer → EN ölçümü için geçici; sonda geri

let gecti = 0, kaldi = 0;
let tampon = null;   // deneme başına sonuçlar; dev sunucusu başka pencerenin derlemesiyle yeniden yüklenirse deneme atılır
const ok = (ad, k, ek = "") => { const satir = [k ? "✓" : "✗", ad, k ? "" : ek]; if (tampon) tampon.push(satir); else { k ? gecti++ : kaldi++; console.log("  " + satir.join(" ")); } };
async function dene(ad, is) {
  for (let n = 1; n <= 3; n++) {
    tampon = [];
    try { await is(); } catch (e) { console.log(`  ! ${ad} deneme ${n} düştü: ${String(e.message).split("\n")[0]}`); tampon = null; continue; }
    for (const t of tampon) { t[0] === "✓" ? gecti++ : kaldi++; console.log("  " + t.join(" ")); }
    tampon = null; return;
  }
  kaldi++; console.log("  ✗", ad, "3 denemede de tamamlanmadı");
}
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kaynak = durum.origins.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));

// Sayfa içinde: ızgaradaki avatarların görünen adı + Sahne rengi + bölüm başlıkları + dokunma hedefi
async function olcIzgara(s, tanim) {
  return s.evaluate(({ ogeSecici, adKod, imgSecici }) => {
    const adSecici = new Function("o", adKod);
    const cikti = [];
    for (const o of document.querySelectorAll(ogeSecici)) {
      const img = o.querySelector(imgSecici);
      const ad = (adSecici(o) ?? "").trim();
      const src = img?.getAttribute("src") ?? "";
      let renk = "ozgun";
      if (src.startsWith("data:image/svg+xml")) {
        const t = decodeURIComponent(src.slice(src.indexOf(",") + 1));
        renk = t.match(/<rect[^>]*fill="(#[0-9a-fA-F]+)"/)?.[1]?.toLowerCase() ?? "rect-yok";
      }
      const r = o.getBoundingClientRect();
      cikti.push({ ad, renk, en: Math.min(r.width, r.height) });
    }
    const basliklar = [...document.querySelectorAll(".qt-av-bolum")].map((b) => b.textContent.replace(/\s+/g, " ").trim());
    return { oge: cikti, basliklar };
  }, tanim);
}

function denetle(ad, sonuc, dil, adet = 62) {
  const { oge, basliklar } = sonuc;
  ok(`${ad}: ${adet} avatar`, oge.length === adet, String(oge.length));
  ok(`${ad}: dokunma hedefi ≥ 44 px`, oge.every((o) => o.en >= 44), String(Math.min(...oge.map((o) => o.en))));
  if (FAZ === "once") { ok(`${ad}: bayrak kapalı → başlık yok, özgün renk`, basliklar.length === 0 && oge.every((o) => o.renk === "ozgun")); return; }
  const yanlis = oge.filter((o) => RENK[beklenen[dil].get(o.ad)] !== o.renk).map((o) => `${o.ad}:${o.renk}`);
  ok(`${ad}: ${adet} avatarın Sahne rengi doğru`, yanlis.length === 0, yanlis.slice(0, 5).join(" "));
  const b = BASLIK[dil];
  const bekle = [`${b[0]} · 21`, `${b[1]} · 15`, `${b[2]} · 18`, `${b[3]} · 8`];
  ok(`${ad}: başlıklar Yaygın→Efsanevi sırasıyla`, JSON.stringify(basliklar) === JSON.stringify(bekle), basliklar.join(" | "));
  const sira = { yaygin: 0, nadir: 1, epik: 2, efsanevi: 3 };
  const d = oge.map((o) => sira[beklenen[dil].get(o.ad)]);
  ok(`${ad}: ızgara sırası nadirliğe göre`, d.every((x, i) => i === 0 || x >= d[i - 1]));
}

async function kaydir(s, secici) {
  if (FAZ === "sonra") await s.locator(".qt-av-bolum").first().waitFor({ timeout: 25000 }).catch(() => {});
  for (const b of await s.locator(secici).all()) await b.scrollIntoViewIfNeeded().catch(() => {});
  await s.waitForTimeout(1500);
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [w, h, dil] of [[390, 700, "tr"], [390, 700, "en"], [360, 640, "tr"], [360, 640, "en"]].filter((g) => secili(...g))) {
    console.log(`\n== ${w}×${h} ${dil} (${FAZ})`);
    await dene(`${w}x${h} ${dil}`, async () => {
    const ls = [...kaynak.localStorage.filter((x) => x.name !== "bildim_dil"), { name: "bildim_dil", value: dil }];
    const baglam = await tarayici.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
      storageState: { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: ls }] } });
    const s = await baglam.newPage();
    const hatalar = []; s.on("pageerror", (e) => hatalar.push(e.message)); s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
    await db.sorgu(`update profiles set dil = '${dil}' where id = '${OTURUM_KULLANICI}'`);
    const ad = `${w}-${dil}`;
    const tasma = async (n) => { const t = await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); ok(`${n}: yatay taşma yok`, t <= 0, String(t)); };

    // 1) Profil › Ayarlar › avatar seçici
    await s.goto(ADRES + "/profil?sekme=ayarlar", { waitUntil: "load" }); await s.waitForTimeout(2500);
    await s.locator('.qt-pf-avatar-izgara, section[aria-labelledby="qt-pf-avatar-baslik"] button').first().waitFor({ timeout: 40000 });
    if (!(await s.locator(".qt-pf-avatar-izgara").count())) await s.locator('section[aria-labelledby="qt-pf-avatar-baslik"] button').first().click();
    await s.locator(".qt-pf-avatar-izgara").waitFor({ timeout: 8000 }); await s.waitForTimeout(2500);
    await kaydir(s, ".qt-pf-avatar-sec");
    denetle("profil", await olcIzgara(s, { ogeSecici: ".qt-pf-avatar-sec", adKod: "return o.getAttribute('title')", imgSecici: "img" }), dil);
    await tasma("profil");
    await s.locator('section[aria-labelledby="qt-pf-avatar-baslik"]').screenshot({ path: `${CIKTI}/profil-${ad}.png` });

    // 2) Dükkân › Avatar
    await s.goto(ADRES + "/joker", { waitUntil: "load" }); await s.waitForTimeout(2000);
    await s.locator("button, [role=tab]", { hasText: /^\s*Avatar/ }).first().click().catch(() => {});
    await s.locator(".qt-dc-oge").first().waitFor({ timeout: 40000 }); await s.waitForTimeout(2500);
    await kaydir(s, ".qt-dc-oge");
    denetle("dükkân", await olcIzgara(s, { ogeSecici: ".qt-dc-oge", adKod: "return o.querySelector('.qt-dc-ad')?.textContent", imgSecici: "img" }), dil);
    await tasma("dükkân");
    await s.locator(".qt-dc-izgara").screenshot({ path: `${CIKTI}/dukkan-${ad}.png` });

    // 3) Koleksiyon
    await s.goto(ADRES + "/profil?sekme=koleksiyon", { waitUntil: "load" }); await s.waitForTimeout(2500);
    await s.locator(".qt-ks-avatar").first().waitFor({ timeout: 40000 }); await s.waitForTimeout(1500);
    await kaydir(s, ".qt-ks-avatar");
    denetle("koleksiyon", await olcIzgara(s, { ogeSecici: ".qt-ks-avatar", adKod: "return o.querySelector('.qt-cs-ad')?.textContent", imgSecici: "img" }), dil);
    await tasma("koleksiyon");
    await s.locator(".qt-ks-avatarlar").screenshot({ path: `${CIKTI}/koleksiyon-${ad}.png` });

    ok("konsol/sayfa hatası yok", hatalar.filter((x) => !/favicon|Failed to load resource/.test(x)).length === 0, hatalar.slice(0, 2).join(" | "));
    await baglam.close();
    });
  }

  if (KURULUM) {
    // 4) Kurulum sihirbazı: yeni misafir → takma ad → avatar adımı (hesap sonda silinir)
    for (const [w, h, dil] of [[390, 700, "tr"], [360, 640, "en"]].filter((g) => secili(...g))) {
      console.log(`\n== Kurulum ${w}×${h} ${dil} (${FAZ})`);
      await dene(`kurulum ${w}x${h} ${dil}`, async () => {
      const baglam = await tarayici.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
        storageState: { cookies: [], origins: [{ origin: new URL(ADRES).origin, localStorage: [{ name: "bildim_dil", value: dil }] }] } });
      const s = await baglam.newPage();
      const hatalar = []; s.on("pageerror", (e) => hatalar.push(e.message)); s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });
      await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
      await s.getByRole("button", { name: /Misafir olarak dene|Try as guest|Play as guest/i }).first().click();
      await s.waitForTimeout(3000);
      const alan = s.locator("input").first();
      await alan.fill("Nadirlik" + Math.floor(Math.random() * 9000 + 1000));
      await s.getByRole("button", { name: /^(Devam|Continue)$/ }).first().click();
      await s.locator(".g-avatar-izgara").waitFor({ timeout: 40000 }); await s.waitForTimeout(2500);
      await kaydir(s, ".g-avatar-sec");
      denetle("kurulum", await olcIzgara(s, { ogeSecici: ".g-avatar-sec", adKod: "return o.getAttribute('title')", imgSecici: "img" }), dil);
      const t = await s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok("kurulum: yatay taşma yok", t <= 0, String(t));
      await s.screenshot({ path: `${CIKTI}/kurulum-${w}-${dil}.png` });
      ok("kurulum: konsol/sayfa hatası yok", hatalar.filter((x) => !/favicon|Failed to load resource/.test(x)).length === 0, hatalar.slice(0, 2).join(" | "));
      const kimlik = await s.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.includes("auth-token")) { try { return JSON.parse(localStorage.getItem(k))?.user?.id; } catch { /* yoksay */ } } return null; });
      if (kimlik) { await db.sorgu(`delete from auth.users where id = '${kimlik}'`); console.log("  · test hesabı silindi", kimlik.slice(0, 8)); }
      await baglam.close();
      });
    }
  }
} finally {
  try { await db.sorgu(ilkDil ? `update profiles set dil = '${ilkDil}' where id = '${OTURUM_KULLANICI}'` : `update profiles set dil = null where id = '${OTURUM_KULLANICI}'`); } catch (e) { console.error("dil geri alınamadı", e.message); }
  await tarayici.close(); await db.kapat();
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
