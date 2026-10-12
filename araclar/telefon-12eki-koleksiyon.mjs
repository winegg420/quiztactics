// Telefon denetimi (12 Eki 2026) — Koleksiyon / Dükkân / Profil düzeltmelerinin ekran doğrulaması.
// Sunucuya YAZMAZ: Altın Lig, sahip hesap, şehir kilidi, en iyi turnuva sırası yalnız yanıt taklidiyle.
// Kullanım: npx vite --port 5183 --strictPort (başka kabukta)
//           node araclar/arayuz-denetim.mjs --adres=http://localhost:5183 --oturum=.arayuz-denetim-oturum-koleksiyon.json --sadece-oturum
//           node araclar/telefon-12eki-koleksiyon.mjs
//           node araclar/arayuz-denetim.mjs --oturum=.arayuz-denetim-oturum-koleksiyon.json --hesap-sil   (iş bitince)
// Çıktı: tasarim/telefon-denetimi-12eki/koleksiyon-<ne>-390-tr.png / -360-en.png
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ADRES = "http://localhost:5183";
const OTURUM = path.resolve(".arayuz-denetim-oturum-koleksiyon.json");
const CIKTI = path.resolve("tasarim/telefon-denetimi-12eki");
fs.mkdirSync(CIKTI, { recursive: true });
const kayit = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const depo = (kayit.origins ?? []).flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
if (!depo.length) { console.error("Oturumda auth-token yok"); process.exit(1); }

const json = async (r, degistir) => {
  try {
    const y = await r.fetch();
    const j = await y.json();
    await r.fulfill({ response: y, json: degistir(j) ?? j });
  } catch { await r.continue().catch(() => {}); }
};

async function taklitler(s, dil) {
  await s.route("**/rest/v1/rpc/profilim*", (r) => json(r, (j) => {
    const p = Array.isArray(j) ? j[0] : j;
    if (p) Object.assign(p, { dil, lig: "altin", ulke: "TR", sehir: "İstanbul", puan_hafta: 120, takma_ad_secildi: true });
    return j;
  }));
  // Lig çerçeveleri: üçü de kazanılmış, takılı = şu anki lig (altın)
  await s.route("**/rest/v1/rpc/cerceve_katalogu*", (r) => json(r, (j) => (j ?? []).map((c) =>
    /^lig_(bronz|gumus|altin)$/.test(c.anahtar) ? { ...c, sahip: true, takili: c.anahtar === "lig_altin" } : c)));
  // Sahip hesap gibi davran (idagg durumu): Koleksiyon yine yalnız gerçek sahipliği göstermeli
  await s.route("**/rest/v1/rpc/sahip_mi*", (r) => r.fulfill({ json: true }));
  await s.route("**/rest/v1/rpc/turnuva_en_iyi_siram*", (r) => r.fulfill({ json: 14 }));
  // Kategori başarın: 7 kategori (yalnız en iyi 4 görünmeli)
  await s.route("**/rest/v1/rpc/ustalik_seviyelerim*", (r) => r.fulfill({ json: ["bilim", "tarih", "cografya", "edebiyat", "spor", "sanat", "muzik"]
    .map((k, i) => ({ kategori: k, dogru_sayisi: 40 - i * 5, seviye: null, sonraki_seviye: "Çırak", sonraki_esik: 50 })) }));
  await s.route("**/rest/v1/rpc/oyuncu_kategori_profili*", (r) => json(r, (j) => {
    const p = Array.isArray(j) ? j[0] : j;
    const yuzde = { bilim: 55, tarih: 80, cografya: 62, edebiyat: 47, spor: 90, sanat: 33, muzik: 70 };
    if (p) { p.toplam_mac = 30; p.istatistikli_mac = 30; }
    if (p) p.kategoriler = Object.entries(yuzde).map(([kategori, y]) => ({ kategori, yuzde: y }));
    return j;
  }));
}

const sonuc = {};
(async () => {
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [dil, en, boy] of [["tr", 390, 844], ["en", 360, 780]]) {
      const baglam = await tarayici.newContext({ viewport: { width: en, height: boy }, deviceScaleFactor: 1 });
      const s = await baglam.newPage();
      const hatalar = [];
      s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 200)); });
      s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 200)));
      await s.addInitScript(([depo, dil]) => {
        try {
          for (const k of depo) localStorage.setItem(k.name, k.value);
          localStorage.setItem("bildim_dil", dil);
          localStorage.setItem("bildim_tanitim", "1");
          localStorage.removeItem("qt_profil_onbellek");
        } catch { /* yut */ }
      }, [depo, dil]);
      await taklitler(s, dil);
      const o = (sonuc[dil] = {});
      const ek = `${en}-${dil}`;
      const kare = (ad) => s.screenshot({ path: path.join(CIKTI, `koleksiyon-${ad}-${ek}.png`) });
      const tasma = () => s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const git = async (yol, ms = 4000) => { await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" }); await s.waitForTimeout(ms); };
      const sekme = async (re) => { await s.getByRole("tab", { name: re }).first().click().catch(() => {}); await s.waitForTimeout(900); };
      const TAK = dil === "en" ? /^(Equip|Tak)$/ : /^Tak$/;

      // 1) Koleksiyon › Çerçeve (Altın Lig taklidi)
      await git("/profil?sekme=koleksiyon");
      await sekme(dil === "en" ? /^Frame/ : /^Çerçeve/);
      o.cerceve = await s.evaluate((takKaynak) => {
        const tak = new RegExp(takKaynak);
        return [...document.querySelectorAll(".qt-cs-oge")].map((b) => ({
          ad: b.querySelector(".qt-cs-ad")?.textContent ?? "",
          durum: (b.querySelector(".qt-cs-durum, .qt-cs-kosul")?.textContent ?? "").trim(),
          disabled: b.disabled,
        })).filter((x) => /Lig|League|Level/.test(x.ad)).map((x) => ({ ...x, takVar: tak.test(x.durum) }));
      }, TAK.source);
      await s.locator(".qt-cs-izgara").first().scrollIntoViewIfNeeded().catch(() => {});
      await kare("cerceve");
      o.cerceve_tasma = await tasma();

      // 2) Koleksiyon › Efekt (sahip hesap taklidi): sahip olunmayan kalem "Tak" göstermemeli
      await sekme(dil === "en" ? /^Effect/ : /^Efekt/);
      o.efekt = await s.evaluate((takKaynak) => {
        const tak = new RegExp(takKaynak);
        const ogeler = [...document.querySelectorAll(".qt-ks-kozmetik .qt-cs-oge")];
        return { toplam: ogeler.length, tak: ogeler.filter((b) => tak.test((b.querySelector(".qt-cs-durum")?.textContent ?? "").trim())).map((b) => b.querySelector(".qt-cs-ad")?.textContent) };
      }, TAK.source);
      await kare("efekt");

      // 3) Koleksiyon › Avatar: ad yok
      await sekme(/^Avatar/);
      o.avatar_adlari = await s.evaluate(() => [...document.querySelectorAll(".qt-ks-avatarlar .qt-cs-ad")].length);
      await kare("avatar");

      // 4) Dükkân › Avatar: ızgarada ad yok, üst kart "Avatar"
      await git("/joker?sekme=avatar");
      o.dukkan_avatar = await s.evaluate(() => ({ izgaraAd: document.querySelectorAll(".qt-dc-izgara .qt-dc-ad").length, ust: document.querySelector(".qt-dc-sahne h2")?.textContent }));
      await kare("dukkan-avatar");
      o.dukkan_tasma = await tasma();

      // 5) Profil › İstatistik
      await git("/profil");
      const m5 = await s.evaluate(() => document.body.innerText);
      o.turnuva_zaferi = /Turnuva zaferi|Tournament wins/.test(m5);
      o.kupa_eski = /Kupa · turnuva kazan/.test(m5);
      o.avatar_parantez = /\(avatar\)/.test(m5);
      o.kategori_satir = await s.evaluate(() => document.querySelectorAll(".qt-dk-kprofil--birlesik .qt-dk-kpb").length);
      await s.getByRole("heading", { name: /Sıradaki ödül|Next reward/ }).first().scrollIntoViewIfNeeded().catch(() => {});
      await kare("profil");
      await s.getByRole("heading", { name: /Kategori başarın|Category/ }).first().scrollIntoViewIfNeeded().catch(() => {});
      await kare("kategori");
      o.kategori_tumu_dugme = await s.getByRole("button", { name: /Tümünü gör|See all/ }).count();
      o.profil_tasma = await tasma();
      o.davet_sekmesi = await s.getByRole("tab", { name: /^(Davet|Invite)/ }).count();

      // 6) Rozetler: "İlk 10" anlamlı ilerleme
      await git("/profil?sekme=rozet");
      await s.locator("section.qt-rp-kart", { hasText: /Turnuva|Tournament/ }).locator(".qt-rp-tumu").first().click().catch(() => {});
      await s.waitForTimeout(500);
      o.rozet_ilk10 = await s.evaluate(() => [...document.querySelectorAll(".qt-rp-rozet")]
        .filter((b) => /İlk 10|Top 10|Kürsü|Podium/.test(b.textContent)).map((b) => b.textContent.trim()));
      await s.locator(".qt-rp-rozet", { hasText: /İlk 10|Top 10/ }).first().scrollIntoViewIfNeeded().catch(() => {});
      await kare("rozet");

      // 7) Ayarlar › şehir kilitli: Değiştir pasif
      await git("/profil?sekme=ayarlar");
      const konum = s.locator("section[aria-labelledby=qt-pf-konum]");
      await konum.scrollIntoViewIfNeeded().catch(() => {});
      o.sehir_dugme_pasif = await konum.getByRole("button").first().isDisabled().catch(() => null);
      await kare("ayarlar-sehir");

      // 8) ?sekme=davet → Arkadaşlar
      await git("/profil?sekme=davet", 2500);
      o.davet_yonlendi = new URL(s.url()).pathname;

      o.konsol_hatalari = hatalar;
      await baglam.close();
    }
  } finally {
    await tarayici.close();
  }
  console.log(JSON.stringify(sonuc, null, 1));
})();
