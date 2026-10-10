// 9 Eki 2026 görsel denetim düzeltmeleri için önce/sonra ekran ölçümü (360 ve 390 px, TR + EN).
// Maddeler: 2 Meydan "Rastgele oyna" düğmesi · 3 OYNA penceresi Düello kartı · 4 Görevler ödül rengi ·
// 5 Düello/Hazine lobisi tek açıklama · 6 Lig sekmeleri. Sunucuya YAZMAZ: gorevlerim taklit; grup araması başlatılmaz.
// Kullanım: npm run dev (başka kabukta) · node araclar/denetim-9eki-ekran.mjs --adres=http://localhost:5189 --etiket=sonra
// "önce" için canlı site: --adres=https://quiztactics.com --etiket=once (oturum yalnız localhost'a yazıldığından
// canlıda oturumsuz giriş sayfası gelir; bu yüzden önce görüntüleri yerel dev + git stash'siz kod için --etiket=once ile
// düzeltmeden ÖNCE alınır). Oturum: .arayuz-denetim-oturum.json (git'e girmez).
// Çıktı: tasarim/denetim-9eki/*.png ve olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5189";
const ETIKET = ARG.etiket || "sonra";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/denetim-9eki");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok"); process.exit(1); }

const BOYUTLAR = [[360, 640], [390, 844]];
const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) gecti++; else kaldi++; console.log(`  ${kosul ? "✓" : "✗"} ${ad}${kosul ? "" : "  → " + ek}`); };

const G = (id, ad, zorluk, sayac, hedef, ilerleme, alindi = false) => ({
  quest_id: id, ad_tr: ad, ad_en: ad, zorluk, sayac, hedef, parametre: {}, ilerleme: Math.min(ilerleme, hedef), alindi,
  alinabilir: ilerleme >= hedef && !alindi, odul: { coin: 15, sp: 10 },
});
const GOREVLER = {
  gunluk: { yenilenme_sn: 22320, gorevler: [G("g1", "3 maç oyna", "kolay", "mac_oyna", 3, 3), G("g2", "2 maç kazan", "orta", "mac_kazan", 2, 2), G("g3", "50 soruyu doğru cevapla", "zor", "dogru_soru", 50, 12)] },
  haftalik: { yenilenme_sn: 367200, gorevler: [G("h1", "15 maç oyna", null, "mac_oyna", 15, 4), G("h2", "3 galibiyet", null, "mac_kazan", 3, 0), G("h3", "100 doğru", null, "dogru_soru", 100, 20)],
    sandik: { tamam: 0, hedef: 3, alindi: false, alinabilir: false, sp: 75, joker: { tur: "soru_degistir", adet: 1 } } },
  alinabilir_sayi: 2,
};

(async () => {
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  for (const [w, h] of BOYUTLAR) for (const dil of DILLER) {
    const et = `${w}x${h}-${dil}`;
    // Kayıtlı profil önbelleği dili ezer (EN koşusu dil değiştirip yeniden yüklüyordu): kasa-savunma testindeki gibi ayıkla
    const oturum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    oturum.origins = (oturum.origins || []).map((o) => ({ ...o, localStorage: (o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim", "qt_profil_onbellek"].includes(x.name)) }));
    const baglam = await tarayici.newContext({ storageState: oturum, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
    await baglam.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_giris_dili", d); } catch { /* yok */ } }, dil);
    const s = await baglam.newPage();
    const konsol = [];
    s.on("console", (m) => { if (m.type() === "error" && !/status of (400|401|403|404)|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 160)); });
    s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 160)));
    await s.route(/\/rest\/v1\//, async (r) => {
      const u = r.request().url();
      try {
        if (/\/rpc\/gorevlerim/.test(u)) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(GOREVLER) });
        if (/\/rpc\/(grup_ara|gorev_al|haftalik_sandik_al)/.test(u)) return r.fulfill({ status: 200, contentType: "application/json", body: "null" });
        const y = await r.fetch();
        await r.fulfill({ response: y, body: (await y.text()).replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`) });
      } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
    });
    const git = async (yol) => {
      await s.goto(`${ADRES}${yol}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await s.waitForTimeout(1500);
      // ilk açılış tanıtımları ("Nasıl oynanır?") sayfanın üstünü örter: Atla/Skip ile kapat
      for (let i = 0; i < 3; i++) {
        const atla = s.getByRole("button", { name: /^(Atla|Skip)$/ }).first();
        if (!(await atla.count())) break;
        await atla.click({ timeout: 3000 }).catch(() => {});
        await s.waitForTimeout(500);
      }
    };
    const foto = (ad) => s.screenshot({ path: path.join(CIKTI, `${ad}-${ETIKET}-${et}.png`) });
    const tasma = async (ad) => { const x = await s.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(`${et} ${ad}: yatay taşma yok (${x})`, x <= 0); };
    console.log(`\n== ${et} (${ETIKET})`);
    try {
      // 2 — Meydan grup düğmesi
      await git("/meydan");
      const bas = s.locator(".a-meydan-panel-bas");
      await bas.waitFor({ timeout: 20000 });
      if ((await bas.getAttribute("aria-expanded")) !== "true") await bas.click();
      const dugme = s.locator("#a-meydan-grup-govde > button").first();
      await dugme.waitFor({ timeout: 8000 });
      await dugme.scrollIntoViewIfNeeded();
      const olc2 = (yaz) => dugme.evaluate((el, yaz) => {
        const yazi = el.querySelector(".qt-dugme-yazi") || el;
        if (yaz) yazi.textContent = yaz;
        return { metin: yazi.textContent, kesik: yazi.scrollWidth > yazi.clientWidth + 1, tasan: el.scrollWidth > el.clientWidth + 1, h: Math.round(el.getBoundingClientRect().height) };
      }, yaz);
      const d1 = await olc2();
      await foto("2-meydan-grup");
      ok(`${et} madde 2: "${d1.metin}" kesik değil`, !d1.kesik && !d1.tasan, JSON.stringify(d1));
      const d2 = await olc2(dil === "en" ? "Stop searching" : "Aramayı durdur");
      ok(`${et} madde 2: "${d2.metin}" kesik değil`, !d2.kesik && !d2.tasan, JSON.stringify(d2));
      await tasma("meydan");
      sonuc[`2-${et}`] = { d1, d2 };

      // 3 — OYNA penceresi
      await git("/");
      const oyna = s.locator(".as-mod-serit--klasik, .mobile-core-mode.klasik").first();
      await oyna.waitFor({ timeout: 20000 });
      await oyna.click();
      await s.waitForSelector(".a-modsecim-liste .qt-mod", { timeout: 8000 });
      await s.waitForTimeout(500);
      const kartlar = await s.evaluate(() => [...document.querySelectorAll(".a-modsecim-liste .qt-mod")].map((k) => {
        const ad = k.querySelector(".qt-mod-ad"), alt = k.querySelector(".a-modsecim-aciklama");
        const satir = (e) => (e ? Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || 20)) : 0);
        const r = k.getBoundingClientRect();
        return { mod: k.className.match(/qt-mod--(\w+)/)?.[1], h: Math.round(r.height), adSatir: satir(ad), aciklamaSatir: satir(alt), rozet: Boolean(k.querySelector(".qt-mod-rozet")),
          tasan: k.scrollWidth > k.clientWidth + 1 };
      }));
      await foto("3-oyna-penceresi");
      const duello = kartlar.find((k) => k.mod === "duello");
      ok(`${et} madde 3: Düello başlığı ≤ 2 satır, kart taşmıyor (${JSON.stringify(duello)})`, duello && duello.adSatir <= 2 && !duello.tasan, JSON.stringify(kartlar));
      sonuc[`3-${et}`] = kartlar;
      await tasma("oyna");

      // 4 — Görevler: tekil Al ve toplu Ödülü al aynı yeşil
      await git("/gorevler");
      await s.waitForSelector(".gv-toplu, .gv-al", { timeout: 15000 }).catch(() => {});
      await s.waitForTimeout(600);
      const renk = await s.evaluate(() => {
        const bg = (e) => (e ? getComputedStyle(e).backgroundColor : null);
        return { al: bg(document.querySelector(".gv-kart .gv-al")), toplu: bg(document.querySelector(".gv-toplu")) };
      });
      await foto("4-gorevler");
      ok(`${et} madde 4: tekil Al = toplu Ödülü al rengi (${renk.al} / ${renk.toplu})`, renk.al && renk.al === renk.toplu, JSON.stringify(renk));
      sonuc[`4-${et}`] = renk;
      await tasma("gorevler");

      // 5 — Düello / Hazine lobisi: serbest açıklaması yalnız anahtarın altında
      for (const yol of ["/duello", "/kasa"]) {
        await git(yol);
        await s.waitForSelector(".a-dereceli, .m2-kilit", { timeout: 12000 }).catch(() => {});
        await s.waitForTimeout(800);
        const kilit = await s.locator(".m2-kilit").count();
        if (kilit) console.log(`  · ${yol}: oyuncu için kilitli (maç sayısı) — serbest açıklaması görünmez`);
        const n = await s.evaluate(() => [...document.querySelectorAll(".a-dereceli-aciklama, .m2-giris-not")].map((e) => e.className + ": " + e.textContent.trim()));
        await foto(`5-${yol.slice(1)}`);
        const tekrar = n.filter((x) => /m2-giris-not/.test(x)).length;
        ok(`${et} madde 5 ${yol}: ikinci açıklama satırı yok (${n.join(" ; ")})`, tekrar === 0, n.join(" ; "));
        sonuc[`5${yol}-${et}`] = n;
      }

      // 6 — Lig sekmeleri: seçili sekme tam görünür
      await git("/siralama");
      await s.waitForSelector(".lg-sekmeler [role=tab]", { timeout: 20000 });
      const kodlar = await s.evaluate(() => [...document.querySelectorAll(".lg-sekmeler [role=tab]")].map((t) => t.getAttribute("data-kod")));
      const olcSekme = (kod) => s.evaluate((kod) => {
        const c = document.querySelector(".lg-sekmeler"), e = c.querySelector(`[data-kod="${kod}"]`);
        const cr = c.getBoundingClientRect(), er = e.getBoundingClientRect();
        return { kod, solPay: Math.round(er.left - cr.left), sagPay: Math.round(cr.right - er.right), sagFade: c.hasAttribute("data-kaydir-sag"), taşar: c.scrollWidth > c.clientWidth + 1 };
      }, kod);
      const sek = [];
      for (const kod of kodlar) {
        // Playwright click() öğeyi kendisi kaydırır ve ölçümü bozar: tıklama sayfa içinden verilir
        await s.evaluate((k) => document.querySelector(`.lg-sekmeler [data-kod="${k}"]`).click(), kod);
        await s.waitForTimeout(700);
        const o = await olcSekme(kod);
        sek.push(o);
        ok(`${et} madde 6 [${kod}]: tam görünür (sol ${o.solPay}, sağ ${o.sagPay})`, o.solPay >= 3 && (o.sagPay >= 40 || !o.sagFade || kod === kodlar.at(-1)), JSON.stringify(o));
        if (kod === kodlar.at(-1)) await foto("6-lig-sekme-son");
      }
      await tasma("lig");
      sonuc[`6-${et}`] = sek;
      ok(`${et}: konsol hatası yok`, konsol.length === 0, konsol.slice(0, 3).join(" | "));
    } catch (e) {
      kaldi++;
      console.log("  ✗ HATA", String(e).split("\n")[0]);
      try { await foto("hata"); } catch { /* sayfa kapandı */ }
    }
    await baglam.close();
  }
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, `olcum-${ETIKET}.json`), JSON.stringify(sonuc, null, 1));
  console.log(`\nSONUÇ (${ETIKET}): ${gecti} geçti, ${kaldi} kaldı`);
})();
