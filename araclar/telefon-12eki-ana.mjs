// Telefon denetimi 12 Eki 2026 — "ana" ajanı testi (ana sayfa soğuk açılış · lig şeridi · profil noktası · posta kutusu).
// TAMAMEN TAKLİT VERİ: Supabase'e hiç istek gitmez (auth + rest + functions route ile yanıtlanır; realtime soketi
// sessiz tutulur). Oyuncu Altın Ligde, Battle Pass'siz, Sezon açık, Ortak Hazine açık; yanıtlar bilerek GECİKMELİ
// (yavaş ağ) gelir ki ara görünüm yakalanabilsin.
// Kullanım: npx vite --port 5181 --strictPort (başka kabukta) · node araclar/telefon-12eki-ana.mjs [--adres=http://localhost:5181]
// Çıktı: tasarim/telefon-denetimi-12eki/ana-*.png + ana-olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5181").replace(/\/$/, "");
const CIKTI = path.resolve("tasarim/telefon-denetimi-12eki");
fs.mkdirSync(CIKTI, { recursive: true });

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const REF = new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
const ANAHTAR = `sb-${REF}-auth-token`;
const UID = "11111111-2222-4333-8444-555555555555";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const SON = Math.floor(Date.now() / 1000) + 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UID, role: "authenticated", exp: SON, aud: "authenticated" })}.imza`;
const KULLANICI = { id: UID, aud: "authenticated", role: "authenticated", email: "test@ornek.com", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 86400, expires_at: SON, refresh_token: "taklit", user: KULLANICI };

const PROFIL = {
  id: UID, gorunen_ad: "Deniz", gorunen_avatar: "/avatars/pro/ahtapot-k13.svg", level: 14, level_xp: 91, level_gereken: 140, coin: 1240,
  takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul", lig: "altin", puan: 3200, puan_hafta: 420, seri: 4,
};
const hafta = new Date(Date.now() + (6 * 86400 + 3 * 3600) * 1000).toISOString();
const LIG = {
  lig: "altin", ust_lig: "platin", sira: 3, grup_boyu: 25, bolge: "yukselme", yukselen: 5, yukselme_sirasi: 5, dusme_sirasi: 21,
  yukselme_cizgisine_fark: 0, ust_siraya_fark: 12, hafta_bitis: hafta,
  satirlar: [
    { sira: 1, ad: "Ece", avatar: "/avatars/pro/ari-k14.svg", puan: 610, user_id: "a1111111-2222-4333-8444-555555555551" },
    { sira: 2, ad: "Mert", avatar: "/avatars/pro/asci-k23.svg", puan: 432, user_id: "a1111111-2222-4333-8444-555555555552" },
    { sira: 3, ad: "Deniz", avatar: PROFIL.gorunen_avatar, puan: 420, ben: true, user_id: UID },
    { sira: 4, ad: "Selin", avatar: "/avatars/pro/astronot-k17.svg", puan: 401, user_id: "a1111111-2222-4333-8444-555555555554" },
    { sira: 5, ad: "Can", avatar: "/avatars/pro/ayi-k08.svg", puan: 377, user_id: "a1111111-2222-4333-8444-555555555555" },
  ],
};
const KART = (id) => ({ id, ad: id === UID ? "Deniz" : "Oyuncu", avatar: PROFIL.gorunen_avatar, level: 14, lig: "altin",
  cerceve: id === UID ? "lig_altin" : null, cerceve_nadirlik: id === UID ? "efsanevi" : null, vitrin: [], sezon_bp: false, bp_parlama: false });
const SEZON_OZET = { gorunur: true, sezon: 1, seviye: 5, sp: 140, onceki_esik: 100, sonraki_esik: 200, bp: false, alinabilir: 1, seviye_sayisi: 28 };
const SEZON_DURUM = { gorunur: true, acik: true, test: false, seviye_sayisi: 28, sezon: { no: 1, kalan_gun: 12 },
  oduller: [{ seviye: 6, kol: "ucretsiz", tur: "coin", miktar: 100 }] };
const once = (dk) => new Date(Date.now() - dk * 60000).toISOString();
const POSTA = {
  bildirimler: [
    { id: 1, tip: "ustalik", metin: "🎖 Tarih ustalığında Gümüş rozet kazandın!", okundu: false, created_at: once(12), yol: null },
    { id: 2, tip: "hafta_sonuc", metin: "🏆 Hafta bitti: Altın Ligde 3. oldun, +150 coin", okundu: false, created_at: once(90), yol: null },
    { id: 3, tip: "kasa_daveti", metin: "Mert seni Ortak Hazine'ye davet etti", okundu: false, created_at: once(3 * 1440), yol: "/meydan" },
    { id: 4, tip: "duello_daveti", metin: "Ece seni Düello'ya davet etti", okundu: true, created_at: once(2 * 1440), yol: "/duello" },
    { id: 5, tip: "seri", metin: "🔥 4 günlük seri! Yarın da oyna", okundu: true, created_at: once(300), yol: null },
    { id: 6, tip: "arkadas_kabul", metin: "Selin arkadaşlık isteğini kabul etti", okundu: true, created_at: once(1500), yol: null },
  ],
  postalar: [
    { id: 9, baslik_tr: "🎁 Hoş geldin hediyesi", baslik_en: "🎁 Welcome gift", metin_tr: "Teşekkürler!", metin_en: "Thanks!",
      oduller: [{ tur: "coin", miktar: 200 }], alindi: null, okundu: false, olusturuldu: once(40) },
  ],
};
const AYARLAR = [["kasa_modu_acik", 1], ["sezon_yolu_acik", 1], ["coin_turnuva_1", 300], ["coin_turnuva_2", 200], ["coin_turnuva_3", 100], ["turnuva_lobi_acilis_dk", 30]]
  .map(([anahtar, deger]) => ({ anahtar, deger }));

// rpc adı → [yanıt, gecikme ms]
const RPC = {
  profilim: [PROFIL, 500],
  lig_grubum_ozet: [LIG, 1800],
  lig_grubum: [LIG.satirlar.map((r) => ({ ...r, lig: "altin", grup_boyu: 25, yukselen: 5, dusen: 5, sezon_bitis: hafta, gorunen_ad: r.ad, gorunen_avatar: r.avatar })), 1800],
  sezon_ozetim: [SEZON_OZET, 2400],
  sezon_yolu_durumum: [SEZON_DURUM, 600],
  posta_kutusu: [POSTA, 300],
  coin_bakiyem: [1240, 300],
  gorevlerim: [{ gunluk: { gorevler: [{ id: 1, ilerleme: 1, hedef: 3, alindi: false }, { id: 2, ilerleme: 3, hedef: 3, alindi: true }, { id: 3, ilerleme: 0, hedef: 1, alindi: false }] }, haftalik: { gorevler: [] }, yenilenme_sn: 30000 }, 700],
};

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
async function taklitKur(s, dil) {
  const hatalar = [];
  s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 220)); });
  s.on("pageerror", (e) => hatalar.push("pageerror: " + String(e).slice(0, 220)));
  await s.routeWebSocket(/realtime/, () => { /* sessiz soket: bağlanır, yanıt vermez */ });
  await s.route(/supabase\.co\/(auth|rest|functions|storage)\//, async (r) => {
    const u = new URL(r.request().url());
    const yol = u.pathname;
    try {
      if (yol.startsWith("/auth/v1/user")) return r.fulfill({ json: KULLANICI });
      if (yol.startsWith("/auth/v1/token")) return r.fulfill({ json: OTURUM });
      if (yol.startsWith("/auth/v1/")) return r.fulfill({ json: {} });
      if (yol.startsWith("/functions/") || yol.startsWith("/storage/")) return r.fulfill({ json: {} });
      const rpc = yol.match(/\/rest\/v1\/rpc\/([a-z0-9_]+)/)?.[1];
      if (rpc) {
        if (rpc === "oyuncu_kartlari") {
          let idler = [];
          try { idler = JSON.parse(r.request().postData() || "{}").p_idler ?? []; } catch { /* boş */ }
          await bekle(2200);
          return r.fulfill({ json: idler.map(KART) });
        }
        const [veri, ms] = RPC[rpc] ?? [[], 150];
        await bekle(ms);
        return r.fulfill({ json: veri });
      }
      const tablo = yol.match(/\/rest\/v1\/([a-z0-9_]+)/)?.[1];
      if (tablo === "oyun_ayarlari") { await bekle(1500); return r.fulfill({ json: AYARLAR }); }
      return r.fulfill({ json: [], headers: { "content-range": "*/0" } });
    } catch { return r.abort().catch(() => {}); }
  });
  await s.addInitScript(([anahtar, oturum, dil]) => {
    try {
      if (sessionStorage.getItem("qt_test_kur")) return;   // yalnız bağlamın İLK açılışında kurulur (önbellekli yeniden açılış bozulmaz)
      sessionStorage.setItem("qt_test_kur", "1");
      localStorage.setItem(anahtar, JSON.stringify(oturum));
      localStorage.setItem("bildim_dil", dil);
      localStorage.setItem("bildim_tanitim", "1");
      localStorage.setItem("qt:v1:ana-son-mod", "duello");   // "Son oynadığın" çipi görünsün
    } catch { /* yut */ }
  }, [ANAHTAR, OTURUM, dil]);
  return hatalar;
}

// Kare durumu: yanlış ara görünüm ölçütleri
const durumOku = (s) => s.evaluate(() => {
  const q = (x) => document.querySelector(x);
  const ko = q(".as-ko");
  return {
    ko: Boolean(ko), puan: Boolean(q(".as-ko-stat-etiket")), koIskelet: Boolean(q(".as-iskelet--ko")),
    lkBos: Boolean(q(".as-lk--bos")), lk: Boolean(q(".as-lk:not(.as-lk--bos)")), lkIskelet: Boolean(q(".as-iskelet--lig")),
    serit: document.querySelectorAll("button.as-mod-serit").length, seritIskelet: Boolean(q(".as-mod-serit--iskelet")),
    sezon: Boolean(q(".sz-ser")), sezonIskelet: Boolean(q(".as-iskelet--yarim")), gorev: Boolean(q(".as-gs")),
    cerceveli: ko ? /altin|lig_altin|Altın|Gold/i.test(ko.innerHTML) : null,
  };
});
const yanlisMi = (d) => (d.ko && !d.puan) || d.lkBos || (d.serit > 0 && d.serit < 3 && !d.seritIskelet) || (d.gorev && !d.sezon && !d.sezonIskelet);

const sonuc = { tarih: new Date().toISOString(), seriler: {}, ekran: {} };

async function seri(tarayici, ad, onbellekli) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const s = await baglam.newPage();
  const hatalar = await taklitKur(s, "tr");
  if (onbellekli) {   // ısınma: bir kez tam yükle (son bilinen veriler yazılır), sonra soğuk yeniden açılış
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await bekle(5000);
  }
  const kareler = [];
  await s.goto(ADRES + "/", { waitUntil: "commit" });
  const t0 = Date.now();
  for (let i = 0; i < 22; i += 1) {
    const d = await durumOku(s).catch(() => ({}));
    d.ms = Date.now() - t0;
    d.yanlis = yanlisMi(d);
    kareler.push(d);
    await s.screenshot({ path: path.join(CIKTI, `ana-soguk-${ad}-${String(i).padStart(2, "0")}.png`) });
    await bekle(250);
  }
  sonuc.seriler[ad] = { yanlisKare: kareler.filter((k) => k.yanlis).length, kareler, konsolHata: hatalar };
  await baglam.close();
}

async function ekranlar(tarayici, en, boy, dil, ek = "") {
  const baglam = await tarayici.newContext({ viewport: { width: en, height: boy }, deviceScaleFactor: 2 });
  const s = await baglam.newPage();
  const hatalar = await taklitKur(s, dil);
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await bekle(5500);
  const o = await s.evaluate(() => {
    const kisa = document.querySelector(".as-lk-alt-kisa");
    const alt = document.querySelector(".as-lk-alt");
    const gorunen = [kisa, alt].find((e) => e && getComputedStyle(e).display !== "none");
    const kesik = gorunen ? [...gorunen.querySelectorAll("*"), gorunen].some((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible") : null;
    const nokta = document.querySelector(".sz-mini-nokta")?.getBoundingClientRect();
    const etiket = document.querySelector(".sz-mini-etiket")?.getBoundingClientRect();
    const binme = nokta && etiket ? !(nokta.right <= etiket.left || nokta.left >= etiket.right || nokta.bottom <= etiket.top || nokta.top >= etiket.bottom) : null;
    return {
      yatayTasma: document.documentElement.scrollWidth > window.innerWidth,
      ligMetni: gorunen?.innerText ?? null, ligKesik: kesik,
      noktaEtiketeBiniyor: binme,
      sonCip: document.querySelector(".as-mod-son-cip")?.innerText ?? null, eskiSonSatir: Boolean(document.querySelector("p.as-mod-son")),
    };
  });
  await s.screenshot({ path: path.join(CIKTI, `ana-anasayfa${ek}-${en}-${dil}.png`) });
  // Posta kutusu
  await s.getByRole("button", { name: /Posta kutusu|Mailbox|Inbox/i }).first().click();
  await bekle(1200);
  o.posta = await s.evaluate(() => {
    const satirlar = [...document.querySelectorAll(".bz-panel .qt-satir-baslik")].map((e) => e.innerText);
    return { satirlar, emojiVar: satirlar.some((t) => /\p{Extended_Pictographic}/u.test(t)), eskiDavetVar: satirlar.some((t) => /Ortak Hazine|Shared Vault|Düello'ya|Duel/i.test(t)),
      kart: document.querySelectorAll(".bz-panel .bz-kart").length, yatayTasma: document.documentElement.scrollWidth > window.innerWidth };
  });
  await s.screenshot({ path: path.join(CIKTI, `ana-posta${ek}-${en}-${dil}.png`) });
  o.konsolHata = hatalar;
  sonuc.ekran[`${en}x${boy}-${dil}`] = o;
  await baglam.close();
}

(async () => {
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  try {
    await seri(tarayici, "onbelleksiz", false);
    await seri(tarayici, "onbellekli", true);
    await ekranlar(tarayici, 390, 844, "tr");
    await ekranlar(tarayici, 360, 780, "en");
    await ekranlar(tarayici, 390, 664, "tr", "-kisa");   // kısa ekran: lig şeridi başlığa girer (Ida'nın gördüğü kesik metin)
    await ekranlar(tarayici, 360, 640, "en", "-kisa");
  } finally {
    await tarayici.close();
  }
  fs.writeFileSync(path.join(CIKTI, "ana-olcum.json"), JSON.stringify(sonuc, null, 2));
  for (const [ad, v] of Object.entries(sonuc.seriler)) console.log(ad, "yanlış kare:", v.yanlisKare, "konsol hata:", v.konsolHata.length);
  for (const [ad, v] of Object.entries(sonuc.ekran)) console.log(ad, JSON.stringify({ ...v, posta: { ...v.posta, satirlar: v.posta.satirlar.length } }));
})();
