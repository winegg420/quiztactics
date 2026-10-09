// Avatar edinme (1039) ekran ölçümü — 360×640 ve 390×844, TR/EN. SUNUCUYA YAZMAZ (yazma RPC'leri tarayıcıda reddedilir).
// Taklit: profil level'i 12 · avatar_sahiplik_durumu (gerçek yanıt, hepsi sahip DEĞİL) · sezon_yolu_durumum (ücretsiz 10 sahip /
// 24 sahip + alınabilir). Ölçer: kilitli avatar kartı (level · sezon · coin · elmas), köşe edinme işaretleri, Dükkân coin fiyatı +
// kural şeridi, Profil "Sıradaki ödüller", Sezon Yolu "Sahipsin · +200" yuvası, maç sonu level avatarı (önizleme; sahip_mi taklit).
// Her sayfa bir kez açılır; yatay taşma, 44 px altı dokunma hedefi, konsol hatası. Çıktı: tasarim/avatar-edinme/*.png + olcum.json
// Kullanım: npm run dev -- --port 5187 (başka kabukta) · node araclar/avatar-edinme-ekran.mjs --adres=http://localhost:5187 [--dil=tr] [--en=360]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5187";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/avatar-edinme");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }
const LEVEL = 12;

const OLC = () => {
  const yol = (el) => { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : "").trim().split(/\s+/).slice(0, 2).join("."); return el.tagName.toLowerCase() + (c ? "." + c : ""); };
  const tasan = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > window.innerWidth + 1 && !e.closest(".qt-sekmeler, [data-kaydir]"); }).slice(0, 5).map(yol);
  const pencere = [...document.querySelectorAll("[role=dialog]")].pop();
  const kucuk = [...(pencere ?? document).querySelectorAll("button, a[href]")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44) && !e.closest(".qt-sekmeler"); }).map(yol);
  return { yatayTasma: document.documentElement.scrollWidth - window.innerWidth, tasan, kucuk: pencere ? kucuk : [] };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
// Canlı Supabase'i yormamak için REST yanıtları önbelleğe alınır: her istek (yöntem + adres + gövde) canlıya EN ÇOK BİR KEZ
// gider, sonraki görünümler (360/390 × TR/EN) aynı yanıtı kullanır. 5xx yanıtı önbelleğe girmez.
const ONBELLEK = new Map();
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

const DILLER = ARG.dil ? [ARG.dil] : ["tr", "en"];
const EKRANLAR = ARG.en ? [[Number(ARG.en), Number(ARG.en) === 360 ? 640 : 844]] : [[360, 640], [390, 844]];
for (const dil of DILLER) {
  const en = dil === "en";
  for (const [w, h] of EKRANLAR) {
    const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
      localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
    const b = await tarayici.newContext({ storageState: durum, viewport: { width: w, height: h }, hasTouch: true, serviceWorkers: "block" });
    const s = await b.newPage();
    const konsol = [];
    s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
    s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
    let kurulumModu = false;
    let onizlemeModu = false;   // maç sonu önizlemesi sahip kapısının arkasında: yalnız bu adımda sahip_mi tarayıcıda true
    await s.route(/\/rest\/v1\//, async (r) => {
      const u = r.request().url();
      try {
        if (r.request().method() !== "GET" && /\/rpc\/(avatar_onayla|avatar_satin_al|kozmetik_satin_al|kozmetik_tak|bp_)/.test(u)) {
          return r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: "Ölçüm aracı: yazma kapalı" }) });
        }
        if (onizlemeModu && u.includes("/rpc/sahip_mi")) return r.fulfill({ status: 200, contentType: "application/json", body: "true" });
        const anahtar = r.request().method() + " " + u + " " + (r.request().postData() ?? "");
        let y = ONBELLEK.get(anahtar);
        if (!y) {
          const g = await r.fetch();
          const { "content-encoding": _ce, "content-length": _cl, ...baslik } = g.headers();   // gövde çözülmüş metin olarak döner
          y = { status: g.status(), headers: baslik, govde: await g.text() };
          if (g.status() < 500) ONBELLEK.set(anahtar, y);
        }
        let m = y.govde.replace(/"dil":\s*"(tr|en)"/g, `"dil":"${dil}"`);
        if (u.includes("/rest/v1/profiles") || u.includes("/rpc/profilim")) {
          m = m.replace(/"level":\s*\d+/g, `"level":${LEVEL}`);
          if (kurulumModu) m = m.replace(/"avatar_onayli":\s*true/g, '"avatar_onayli":false');
        }
        if (u.includes("/rpc/avatar_sahiplik_durumu")) {
          const d = JSON.parse(m);
          m = JSON.stringify(Array.isArray(d) ? d.map((x) => ({ ...x, sahibim: false })) : d);
        }
        if (u.includes("/rpc/sezon_yolu_durumum")) {
          const d = JSON.parse(m);
          if (Array.isArray(d?.oduller)) d.oduller = d.oduller.map((o) => (o.kol === "ucretsiz" && o.seviye === 10 ? { ...o, sahip: true, alindi: false, alinabilir: false }
            : o.kol === "ucretsiz" && o.seviye === 24 ? { ...o, sahip: true, alindi: false, alinabilir: true } : o));
          m = JSON.stringify(d);
        }
        await r.fulfill({ status: y.status, headers: y.headers, body: m });
      } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
    });
    const etiket = `${w}-${dil}`;
    const ac = async (yol, bekle = 1500) => { await s.goto(ADRES + yol, { waitUntil: "domcontentloaded", timeout: 30000 }); await s.waitForTimeout(bekle); };
    const bekle = async (secici, enAz = 1, sure = 25000) => {
      try { await s.waitForFunction(([q, n]) => document.querySelectorAll(q).length >= n, [secici, enAz], { timeout: sure }); await s.waitForTimeout(500); return true; }
      catch { return false; }
    };
    const kaydet = async (ad, tam = false) => s.screenshot({ path: path.join(CIKTI, `${ad}-${etiket}.png`), fullPage: tam });
    // Kilitli avatar kartını aç → metin ve ölçüm → kapat
    const kart = async (ad, oge, desen) => {
      // "html:<parça>" → resim adresi CerceveliAvatar içinde (sahne adresi) olabilir; öğe HTML içeriğinden bulunur
      if (oge.startsWith("html:")) {
        const [sinif, parca] = oge.slice(5).split("|");
        await s.evaluate(([q, p]) => { document.querySelectorAll("[data-olcum-hedef]").forEach((e) => e.removeAttribute("data-olcum-hedef"));
          const e = [...document.querySelectorAll(q)].find((x) => p.split("/").some((y) => x.textContent.includes(y) || x.outerHTML.includes(y))); e?.setAttribute("data-olcum-hedef", "1"); }, [sinif, parca]);
        oge = "[data-olcum-hedef]";
      }
      const hedef = s.locator(oge).first();
      if (!(await hedef.count())) { ok(`${ad}: öğe bulundu`, false, oge); return; }
      await hedef.evaluate((e) => { e.scrollIntoView({ block: "center" }); e.click(); });
      const acildi = await bekle("[role=dialog] .qt-av-edinme", 1, 6000);
      ok(`${ad}: kilitli avatar kartı açıldı`, acildi);
      if (!acildi) return;
      const metin = (await s.locator("[role=dialog]").last().innerText()).replace(/\s+/g, " ");
      ok(`${ad}: tek satır edinme metni`, desen.test(metin), metin.slice(0, 160));
      const o = await s.evaluate(OLC); sonuc[`${ad}-${etiket}`] = o;
      ok(`${ad}: yatay taşma yok`, o.yatayTasma <= 0, JSON.stringify(o.tasan));
      ok(`${ad}: kartta 44 px altı dokunma hedefi yok`, o.kucuk.length === 0, JSON.stringify(o.kucuk));
      await kaydet(ad);
      await s.keyboard.press("Escape");
      await s.waitForTimeout(400);
    };
    const RX = {
      level: en ? /Unlocks at Lv \d+ · you're Lv 12/ : /Lv \d+'(te|ta|de|da) açılır · sen Lv 12/,
      sezon: en ? /Season Path · Free track · Level (10|24)/ : /Sezon Yolu · Ücretsiz kol · Seviye (10|24)/,
      coin: en ? /750 coins · Buy/ : /750 coin · Al/,
      elmas: en ? /(150|300) gems · Buy/ : /(150|300) elmas · Al/,
      elmasBp: en ? /or Season Path · Level (5|14|19|21|22|23|27)/ : /ya da Sezon Yolu · Seviye (5|14|19|21|22|23|27)/,
    };
    console.log(`\n== ${w}×${h} ${dil}`);
    try {
      await ac("/", 1500);
      await bekle(".as-sayfa, .a-icerik", 1, 40000);

      // 1) Dükkân › Avatar ve İsim
      await ac("/joker?sekme=avatar", 800);
      await bekle(".qt-dc-oge", 60); await bekle(".qt-av-kilit--level", 6);
      const say = await s.evaluate(() => ({
        level: document.querySelectorAll(".qt-dc-oge .qt-av-kilit--level").length,
        sezon: document.querySelectorAll(".qt-dc-oge .qt-av-kilit--sezon").length,
        para: document.querySelectorAll(".qt-dc-oge .qt-av-kilit--para").length,
        coinFiyat: document.querySelectorAll(".qt-dc-oge .qt-dc-fiyat--coin").length,
        kural: document.querySelector(".qt-dk-kural")?.innerText.replace(/\s+/g, " ") ?? "",
      }));
      sonuc[`dukkan-sayim-${etiket}`] = say;
      ok("Dükkân: 6 level işareti · 2 Sezon Yolu işareti", say.level === 6 && say.sezon === 2, JSON.stringify(say));
      ok("Dükkân: 9 coin fiyatlı Nadir avatar", say.coinFiyat === 9, String(say.coinFiyat));
      ok("Dükkân: coin + elmas işaretleri (9 + 30)", say.para === 39, String(say.para));
      ok("Dükkân kural şeridi: Nadir avatarlar coin'le, öteki kozmetikler elmasla", en ? /Rare avatars.*Other cosmetics/i.test(say.kural) : /Nadir avatarlar.*Öteki kozmetikler/.test(say.kural), say.kural);
      let o = await s.evaluate(OLC); sonuc[`dukkan-${etiket}`] = o;
      ok("Dükkân: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      await s.evaluate(() => document.querySelectorAll(".qt-av-bolum")[1]?.scrollIntoView({ block: "start" }));
      await s.waitForTimeout(800);
      await kaydet("dukkan-nadir");
      await kart("kart-dukkan-coin", ".qt-dc-oge:has(.qt-dc-fiyat--coin)", RX.coin);
      await kart("kart-dukkan-level", ".qt-dc-oge:has(.qt-av-kilit--level)", RX.level);
      await kart("kart-dukkan-sezon", ".qt-dc-oge:has(.qt-av-kilit--sezon)", RX.sezon);
      await kart("kart-dukkan-elmas-bp", `html:.qt-dc-oge|Kurt Adam/Werewolf`, RX.elmasBp);
      await kart("kart-dukkan-elmas", `html:.qt-dc-oge|Ateş Büyücüsü/Fire Mage`, RX.elmas);

      // 2) Profil: sıradaki ödüller + avatar seçici
      await ac("/profil", 800);
      const odulVar = await bekle(".qt-dk-level-odul li", 3, 15000);
      const satirlar = odulVar ? await s.locator(".qt-dk-level-odul li").allInnerTexts() : [];
      sonuc[`level-odul-${etiket}`] = satirlar;
      ok("Profil: sıradaki 3 level ödülü", satirlar.length === 3, JSON.stringify(satirlar));
      ok("Profil: Lv 15 Dedektif (avatar) · Lv 20 · Lv 25 rütbe + 100 coin",
        /15/.test(satirlar[0] ?? "") && /\(avatar\)/.test(satirlar[0] ?? "") && /20/.test(satirlar[1] ?? "") && /25/.test(satirlar[2] ?? "") && /100/.test(satirlar[2] ?? ""), JSON.stringify(satirlar));
      o = await s.evaluate(OLC); sonuc[`profil-${etiket}`] = o;
      ok("Profil: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
      await s.locator(".qt-dk-level-odul").scrollIntoViewIfNeeded().catch(() => {});
      await kaydet("profil-level-odul");
      await ac("/profil?sekme=ayarlar", 800);
      await bekle("section[aria-labelledby=qt-pf-avatar-baslik] button");
      await s.locator("section[aria-labelledby=qt-pf-avatar-baslik] button").first().evaluate((e) => e.click());
      await bekle(".qt-pf-avatar-sec", 60);
      await kart("kart-profil-level", ".qt-pf-avatar-sec:has(.qt-av-kilit--level)", RX.level);

      // 3) Koleksiyon
      await ac("/profil?sekme=koleksiyon", 800);
      await bekle(".qt-ks-avatar", 60);
      await kart("kart-koleksiyon-sezon", ".qt-ks-avatar:has(.qt-av-kilit--sezon)", RX.sezon);

      // 4) Kurulum (avatar adımı; profil yanıtı yalnız tarayıcıda değiştirilir)
      kurulumModu = true;
      await ac("/", 800);
      if (await bekle(".g-avatar-sec", 60, 30000)) await kart("kart-kurulum-coin", ".g-avatar-sec:has(.qt-av-kilit--para)", new RegExp(`${RX.coin.source}|${RX.elmas.source}`));
      else { ok("Kurulum: avatar adımı açıldı", false); await kaydet("kurulum-hata"); }
      kurulumModu = false;

      // 5) Sezon Yolu: ücretsiz kol 10 (sahip) / 24 (sahip + alınabilir)
      await ac("/sezon-yolu", 800);
      if (await bekle('[data-yuva="10:ucretsiz"]', 1, 15000)) {
        // sezonun ilk açılış perdesi (1,5 sn) dokununca geçer
        await s.evaluate(() => document.querySelector(".sy-perde")?.click());
        await s.waitForTimeout(1800);
        await s.evaluate(() => document.querySelector('[data-yuva="10:ucretsiz"]')?.scrollIntoView({ block: "center" }));
        await s.waitForTimeout(600);
        const y = await s.evaluate(() => ["10:ucretsiz", "24:ucretsiz"].map((k) => {
          const b = document.querySelector(`[data-yuva="${k}"]`); const alt = b?.querySelector(".sy-kutu-alt");
          const kr = b?.getBoundingClientRect(); const taş = [...(alt?.children ?? [])].some((c) => { const r = c.getBoundingClientRect(); return r.left < kr.left - 0.5 || r.right > kr.right + 0.5; });
          return { k, tur: b?.dataset.tur, alt: alt?.textContent ?? "", tasiyor: taş };
        }));
        sonuc[`sezon-${etiket}`] = y;
        ok("Sezon Yolu ücretsiz 10: avatar yuvası, 'Sahipsin · +200'", y[0].tur === "avatar" && new RegExp(en ? "Owned · \\+200" : "Sahipsin · \\+200").test(y[0].alt), JSON.stringify(y[0]));
        ok("Sezon Yolu ücretsiz 24: alınabilir 'Al · +200'", y[1].tur === "avatar" && /· \+200/.test(y[1].alt), JSON.stringify(y[1]));
        ok("Sezon Yolu yuva yazısı kutudan taşmıyor", y.every((x) => !x.tasiyor), JSON.stringify(y));
        o = await s.evaluate(OLC); sonuc[`sezon-sayfa-${etiket}`] = o;
        ok("Sezon Yolu: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
        await kaydet("sezon-sahip");
        await s.locator('[data-yuva="10:ucretsiz"]').evaluate((e) => e.click());
        if (await bekle(".sy-sayfa-ic", 1, 6000)) {
          const t = await s.locator(".sy-sayfa-ic").last().innerText();
          ok("ödül sayfası 10: 'yerine 200 coin' notu", en ? /200 coins instead/.test(t) : /yerine 200 coin/.test(t), t.replace(/\s+/g, " ").slice(0, 160));
          await kaydet("sezon-odul-10");
          await s.keyboard.press("Escape");
        }
      } else ok("Sezon Yolu açıldı", false);

      // 6) Maç sonu: level atlama anında avatar (önizleme; sahip kapısı yalnız tarayıcıda taklit)
      onizlemeModu = true;
      await ac("/mac-sonu-onizleme?hal=level", 800);
      if (await bekle(".msk-levelup-avatar", 1, 15000)) {
        const t = await s.locator(".msk-levelup-avatar").first().innerText();
        ok("maç sonu: level atlama anında 'Yeni avatar: …'", en ? /New avatar: Kitten Friend/.test(t) : /Yeni avatar: Kedili Kız/.test(t), t);
        o = await s.evaluate(OLC); sonuc[`mac-sonu-${etiket}`] = o;
        ok("maç sonu: yatay taşma yok", o.yatayTasma <= 0, JSON.stringify(o.tasan));
        await s.waitForTimeout(2500);
        await kaydet("mac-sonu-level");
      } else ok("maç sonu önizleme: level avatarı göründü", false);
      onizlemeModu = false;
    } catch (e) {
      kaldi++;
      console.log("  ✗ BEKLENMEYEN HATA:", String(e).slice(0, 300));
      try { await kaydet("hata"); } catch { /* yok */ }
    }
    const gercekKonsol = konsol.filter((k) => !/Ölçüm aracı|favicon|net::ERR_|Failed to load resource/.test(k));
    ok("konsol hatası yok", gercekKonsol.length === 0, JSON.stringify(gercekKonsol.slice(0, 4)));
    sonuc[`konsol-${etiket}`] = konsol;
    await b.close();
  }
}
await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı — sunucuya yazılmadı. Görüntüler: tasarim/avatar-edinme/`);
process.exit(kaldi ? 1 : 0);
