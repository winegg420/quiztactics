// Hatalarım (Çalışma) soru ekranı + tur sonu (11 Eki 2026) — TAKLİT VERİYLE ölçüm + ekran görüntüsü.
// CANLIYA HİÇ İSTEK GİTMEZ: oturum da taklittir (sahte JWT, süresi uzak → yenileme isteği yok), /auth/v1 ve
// /rest/v1 tamamen tarayıcıda (page.route) yanıtlanır; taklidi olmayan RPC null, tablo okuması [] döner,
// yazmalar kesilir. Realtime ve ses dosyaları kapalı. Misafir hesap AÇILMAZ.
// Taklit: yanlis_bankam · get_categories · calisma_baslat · calisma_soru · calisma_cevap · calisma_bitir (+ profilim).
//
// İki tur, her boyut × dil için:
//   banka (6 soru: 3 bankadan + 3 yeni): S1 doğru 1/2 · S2 öğrenildi · S3 bankadan yanlış · S4 uzun soru, süre dolar ·
//         S5 yeni yanlış · S6 yeni doğru → tur sonu (öğrenilen 1)
//   pratik (1 yeni soru, banka temiz): yanlış → tur sonu (öğrenilen 0)
// Anlar: soru açık · seçili (yanıt 1,5 sn gecikir) · sonuç; 2./3. soru açılışı; uzun soru; tur sonu.
//
// Kullanım:
//   npx vite --port 5188 --strictPort            # ayrı kabukta (5173/5187/5188'den boş olanı)
//   node araclar/calisma-ekran.mjs --adres=http://localhost:5188 [--dil=tr] [--boyut=390x844] [--yalniz=banka|pratik]
// Çıktı: tasarim/calisma-turu/<tur>-<an>-<g>x<y>-<dil>.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5188");
const DILLER = ARG.dil ? [String(ARG.dil)] : ["tr", "en"];
const BOYUTLAR = ARG.boyut ? [String(ARG.boyut).split("x").map(Number)] : [[390, 844], [360, 780]];
const TURLAR = ARG.yalniz ? [String(ARG.yalniz)] : ["banka", "pratik"];
const CIKTI = path.resolve("tasarim/calisma-turu");
fs.mkdirSync(CIKTI, { recursive: true });

const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;

// ---------------------------------------------------------------- taklit oturum
const BEN = "0c1a5100-0000-4000-8000-00000000ca15";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: true })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil) => ({ id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil, puan: 100, coin: 50, xp: 0, level: 1, misafir: true, gorunen_avatar: null, gorunum: null });

// ---------------------------------------------------------------- taklit veri
const U = (n) => `0c1a5100-0000-4000-8000-${String(n).padStart(12, "0")}`;
const OTURUM_ID = U(500);
const kisa = (soru, sec) => ({ soru, secenekler: sec });
// S1–S3 aynı uzunlukta (kart yüksekliği aynı → soru geçişinde kart da 0 px oynamalı)
const BANKA_SORULARI = [
  { ...kisa("Türkiye'nin başkenti hangi şehirdir?", ["İstanbul", "Ankara", "İzmir", "Bursa"]), kategori: "cografya", bankadan: true, onceki_yanlis: 2, dogru_serisi: 0 },
  { ...kisa("Suyun kaynama noktası kaç derecedir?", ["90", "100", "110", "120"]), kategori: "bilim", bankadan: true, onceki_yanlis: 1, dogru_serisi: 1 },
  { ...kisa("İstanbul'un fethi hangi yılda oldu?", ["1071", "1453", "1299", "1923"]), kategori: "tarih", bankadan: true, onceki_yanlis: 2, dogru_serisi: 0 },
  { soru: "Osmanlı İmparatorluğu'nun son dönemlerinde başlayan ve Cumhuriyet'in ilk yıllarında da süren köklü yenilik hareketleri içinde, alfabenin Latin harflerine çevrilmesini ve bu değişikliğin halka öğretilmesini sağlayan kurumun adı aşağıdakilerden hangisidir?",
    secenekler: ["Millet Mektepleri ve Dil Encümeni heyeti", "Türk Tarih Kurumu ve Halkevleri birliği", "Maarif Vekâleti ile Darülfünun kurulu", "Türk Dil Kurumu ve Millet Mektepleri"],
    kategori: "genel_kultur", bankadan: false, onceki_yanlis: 0, dogru_serisi: 0 },
  { ...kisa("Mona Lisa tablosunu kim yapmıştır?", ["Picasso", "Da Vinci", "Van Gogh", "Rembrandt"]), kategori: "sanat", bankadan: false, onceki_yanlis: 0, dogru_serisi: 0 },
  { ...kisa("Bir futbol takımında kaç oyuncu oynar?", ["9", "11", "10", "12"]), kategori: "spor", bankadan: false, onceki_yanlis: 0, dogru_serisi: 0 },
];
// Her sorunun doğru cevabı 1. Senaryo: hangi şıka basılacak (-1 = süre dolsun) ve sunucu yanıtı
const BANKA_CEVAP = [
  { tik: 1, yanit: { dogru: true, bankadan: true, yeni_seri: 1, ogrenildi: false, onceki_yanlis: 2 }, an: "sonuc-dogru12" },
  { tik: 1, yanit: { dogru: true, bankadan: true, yeni_seri: 2, ogrenildi: true, onceki_yanlis: 1 }, an: "sonuc-ogrenildi" },
  { tik: 0, yanit: { dogru: false, bankadan: true, yeni_seri: 0, ogrenildi: false, onceki_yanlis: 3 }, an: "sonuc-yanlis-banka" },
  { tik: -1, yanit: { dogru: false, bankadan: false, yeni_seri: 0, ogrenildi: false, onceki_yanlis: 1 }, an: "sonuc-sure" },
  { tik: 2, yanit: { dogru: false, bankadan: false, yeni_seri: 0, ogrenildi: false, onceki_yanlis: 1 }, an: "sonuc-yanlis-yeni" },
  { tik: 1, yanit: { dogru: true, bankadan: false, yeni_seri: 0, ogrenildi: false, onceki_yanlis: 0 }, an: "sonuc-dogru" },
];
const PRATIK_SORULARI = [{ ...kisa("Dünyanın en büyük okyanusu hangisidir?", ["Atlas", "Pasifik", "Hint", "Arktik"]), kategori: "cografya", bankadan: false, onceki_yanlis: 0, dogru_serisi: 0 }];
const PRATIK_CEVAP = [{ tik: 0, yanit: { dogru: false, bankadan: false, yeni_seri: 0, ogrenildi: false, onceki_yanlis: 1 }, an: "sonuc-yanlis-yeni" }];

const KATEGORILER = ["genel_kultur", "tarih", "cografya", "bilim", "spor", "sanat", "sinema", "muzik", "edebiyat", "teknoloji"].map((k) => ({ kategori: k, adet: 500 }));
const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();

function senaryo(tur) {
  const banka = tur === "banka";
  const sorular = banka ? BANKA_SORULARI : PRATIK_SORULARI;
  const cevaplar = banka ? BANKA_CEVAP : PRATIK_CEVAP;
  return {
    tur, sorular, cevaplar, aktif: 0, bitti: false,
    bankam: banka
      ? [{ toplam: 7, ogrenilen: 2, bekleyen: 5, kategori: "cografya", kategori_adet: 2 }, { toplam: 7, ogrenilen: 2, bekleyen: 5, kategori: "tarih", kategori_adet: 3 }]
      : [{ toplam: 3, ogrenilen: 3, bekleyen: 0, kategori: null, kategori_adet: 0 }],
    baslat: banka ? { oturum_id: OTURUM_ID, soru_sayisi: 6, bankadan: 3, havuzdan: 3, soru_sure_sn: 20 } : { oturum_id: OTURUM_ID, soru_sayisi: 1, bankadan: 0, havuzdan: 1, soru_sure_sn: 20 },
    bitir: banka ? { dogru: 3, yanlis: 3, ogrenilen: 1, bankada_kalan: 6, toplam_ogrenilen: 3 } : { dogru: 0, yanlis: 1, ogrenilen: 0, bankada_kalan: 1, toplam_ogrenilen: 3 },
    cevapGecikme: 0,
  };
}

const json = (r, veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
const kesilenler = new Set(), taklitsiz = new Set(), okumalar = new Set();

async function rest(r, s, dil) {
  const req = r.request();
  const yol = req.url().split("/rest/v1/")[1].split("?")[0];
  const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
  if (yol.startsWith("rpc/")) {
    const fn = yol.slice(4);
    switch (fn) {
      case "profilim": return json(r, PROFIL(dil));
      case "yanlis_bankam": return json(r, s.bankam);
      case "get_categories": return json(r, KATEGORILER);
      case "calisma_baslat": s.aktif = 0; s.bitti = false; return json(r, [s.baslat]);
      case "calisma_soru": {
        const q = s.sorular[s.aktif];
        return json(r, [{ question_id: U(700 + s.aktif), soru: q.soru, secenekler: q.secenekler, kategori: q.kategori, soru_index: s.aktif, toplam: s.sorular.length,
          bankadan: q.bankadan, onceki_yanlis: q.onceki_yanlis, dogru_serisi: q.dogru_serisi, baslangic: iso(-200), sunucu_zamani: iso(0), dogru_cevap: null }]);
      }
      case "calisma_cevap": {
        const c = s.cevaplar[s.aktif];
        if (s.cevapGecikme) await new Promise((x) => setTimeout(x, s.cevapGecikme));
        s.aktif += 1;
        const bitti = s.aktif >= s.sorular.length;
        return json(r, [{ ...c.yanit, dogru_cevap: 1, bitti }]);
      }
      case "calisma_bitir": s.bitti = true; return json(r, [s.bitir]);
      default: taklitsiz.add(fn); return json(r, null);
    }
  }
  if (req.method() !== "GET" && req.method() !== "HEAD") { kesilenler.add(`${req.method()} ${yol}`); return json(r, nesne ? null : []); }
  okumalar.add(yol);
  return json(r, nesne ? null : []);
}

// ---------------------------------------------------------------- sayfa içi ölçüm
const OLC = () => {
  const vh = window.innerHeight;
  const q = (s) => document.querySelector(s);
  const d = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), height: +r.height.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1) }; };
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && +c.opacity > 0; };
  const ad = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`;
  // Kesik metin: tek satırlık etiketlerde yatay taşma (… ile kesilme) ya da çok satıra kırılma
  const kesikAdaylar = [".m1-cal-tur", ".qt-soru-ust > *", ".m1-sonuc-yuva .qt-sonuc", ".m1-cal-son-kutu span", ".m1-cal-son-banka > span", ".m1-cal-son-alt",
    ".qt-sik-metin", ".m1-cal-son-dugmeler button", ".qt-rozet"];
  const kesik = [];
  for (const sec of kesikAdaylar) for (const e of document.querySelectorAll(sec)) {
    if (!gor(e) || !e.textContent.trim()) continue;
    if (e.scrollWidth > e.clientWidth + 1) kesik.push(`${sec}: "${e.textContent.trim().slice(0, 40)}" ${e.scrollWidth}>${e.clientWidth}`);
  }
  const sonuc = q(".m1-sonuc-yuva .qt-sonuc");
  // Satır sayısı: metin düğümünün satır kutuları (farklı üst değerleri)
  const sonucSatir = (() => { if (!sonuc) return 0; const rg = document.createRange(); rg.selectNodeContents(sonuc);
    return new Set([...rg.getClientRects()].map((x) => Math.round(x.top))).size; })();
  const dugmeler = [...document.querySelectorAll("#root button, #root a[href]")].filter(gor);
  const binen = [];
  for (let i = 0; i < dugmeler.length; i++) for (let j = i + 1; j < dugmeler.length; j++) {
    const A = dugmeler[i], B = dugmeler[j];
    if (A.contains(B) || B.contains(A)) continue;
    const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 1 && h > 1) binen.push(`${ad(A)} × ${ad(B)}`);
  }
  const siklar = [...document.querySelectorAll(".m1-soru .qt-sik")];
  const harf = q(".m1-soru .qt-sik-harf");
  const sabitler = ["kart", "siklar", "yuva"];
  // En alttaki görünür öğe (soru ekranında)
  const yuva = q(".m1-sonuc-yuva");
  const tabbar = q(".tabbar");
  const tabbarUst = tabbar && gor(tabbar) ? tabbar.getBoundingClientRect().top : vh;
  return {
    vh, vw: window.innerWidth, sabitler,
    yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    kart: d(q(".m1-soru .qt-soru-kart")),
    siklar: siklar.map((e) => d(e)),
    sikDurum: siklar.map((e) => (String(e.className).match(/qt-sik--([a-z]+)/) || [])[1] || "?"),
    sikFont: siklar[0] ? parseFloat(getComputedStyle(siklar[0]).fontSize) : null,
    harf: harf ? +harf.getBoundingClientRect().width.toFixed(1) : null,
    yuva: d(yuva),
    turSatir: d(q(".m1-cal-tur")), turMetin: q(".m1-cal-tur")?.textContent ?? null,
    sira: q(".qt-soru-ust")?.innerText?.replace(/\s+/g, " ").trim() ?? null,
    altBosluk: yuva ? +(vh - yuva.getBoundingClientRect().bottom).toFixed(1) : null,
    sonucMetin: sonuc?.textContent ?? "", sonucSatir,
    soruKayar: (() => { const s = q(".m1-soru"); return s ? s.scrollHeight > s.clientHeight + 1 : null; })(),
    kesik, binen,
    // tur sonu
    son: q(".m1-cal-son") ? {
      baslik: q(".m1-cal-son-baslik")?.innerText.replace(/\s+/g, " ").trim(),
      kutular: [...document.querySelectorAll(".m1-cal-son-kutu")].map((e) => e.innerText.replace(/\s+/g, " ").trim()),
      banka: q(".m1-cal-son-banka > span")?.textContent ?? null,
      dugmeAlt: Math.max(0, ...[...document.querySelectorAll(".m1-cal-son-dugmeler button")].map((e) => e.getBoundingClientRect().bottom)),
      tabbarUst: +tabbarUst.toFixed(1),
      ilkEkranda: [...document.querySelectorAll(".m1-cal-son-dugmeler button, .m1-cal-son-kutu, .m1-cal-son-baslik")].every((e) => e.getBoundingClientRect().bottom <= tabbarUst + 0.5),
      konfeti: document.querySelectorAll(".m1-cal-son .qt-konfeti *").length,
    } : null,
  };
};

function kayma(olcumler) {
  // Aynı sorunun anları arasında kart + şıklar + yuva; en büyük mutlak fark
  let en = 0, nerede = "";
  const A = olcumler[0];
  for (const B of olcumler.slice(1)) {
    const cift = [["kart", A.kart, B.kart], ["yuva", A.yuva, B.yuva], ["tur", A.turSatir, B.turSatir], ...A.siklar.map((s, i) => [`sik${i + 1}`, s, B.siklar[i]])
      // Seçilmeyen şıkların basılı (kilitli) görünümü ölçüye girmez — eskiden beri olan geri bildirim
      .filter((_, i) => B.sikDurum?.[i] !== "kilitli" && A.sikDurum?.[i] !== "kilitli")];
    for (const [ad, x, y] of cift) {
      if (!x || !y) continue;
      for (const k of ["top", "bottom"]) { const f = Math.abs(x[k] - y[k]); if (f > en) { en = f; nerede = `${ad}.${k}`; } }
    }
  }
  return { px: +en.toFixed(1), nerede };
}

async function turCalistir(ctx, tur, [g, h], dil) {
  const s = senaryo(tur);
  const sayfa = await ctx.newPage();
  const konsol = [];
  sayfa.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 160)); });
  sayfa.on("pageerror", (e) => konsol.push(`pageerror: ${String(e).slice(0, 160)}`));
  await sayfa.setViewportSize({ width: g, height: h });
  await sayfa.addInitScript(({ d, depo, oturum }) => {
    try {
      localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1");
      localStorage.setItem(depo, JSON.stringify(oturum));
    } catch { /* depolama kapalı */ }
  }, { d: dil, depo: DEPO, oturum: OTURUM });
  await sayfa.route(/\/auth\/v1\//, (r) => (/\/user/.test(r.request().url()) ? json(r, KULLANICI) : json(r, OTURUM)));
  await sayfa.route(/\/rest\/v1\//, (r) => rest(r, s, dil).catch(() => r.abort().catch(() => {})));
  await sayfa.route(/\/functions\/v1\//, (r) => json(r, {}));
  await sayfa.route(/\/storage\/v1\//, (r) => r.fulfill({ status: 404, body: "" }));
  await sayfa.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  const kayit = { tur, boyut: `${g}x${h}`, dil, anlar: {}, sorular: [], not: [] };
  const ad = (an) => path.join(CIKTI, `${tur}-${an}-${g}x${h}-${dil}.png`);
  const olc = async (an, foto = true) => { const o = await sayfa.evaluate(OLC); kayit.anlar[an] = o; if (foto) await sayfa.screenshot({ path: ad(an) }); return o; };
  try {
    await sayfa.goto(ADRES + "/calisma", { waitUntil: "domcontentloaded" });
    await sayfa.waitForSelector(".m1-cal-eylem button", { timeout: 30000 });
    await sayfa.waitForTimeout(600);
    await sayfa.locator(".m1-cal-eylem button").click();
    for (let i = 0; i < s.sorular.length; i++) {
      const c = s.cevaplar[i];
      await sayfa.waitForFunction((m) => document.querySelector(".qt-soru-metin")?.textContent?.trim() === m
        && document.querySelectorAll(".m1-soru .qt-sik--normal").length === 4, s.sorular[i].soru, { timeout: 15000 });
      await sayfa.waitForTimeout(900);   // giriş animasyonları otursun
      const no = i + 1;
      const acikAd = i === 3 && tur === "banka" ? "acik-uzun" : `acik-${no}`;
      const anlar = [await olc(acikAd, i < 4 || tur === "pratik")];
      if (c.tik >= 0) {
        s.cevapGecikme = i === 0 ? 1500 : 250;
        await sayfa.locator(".m1-soru .qt-sik").nth(c.tik).click();
        if (i === 0) { await sayfa.waitForTimeout(350); anlar.push(await olc("secili")); }
      } else {
        await sayfa.waitForSelector(".m1-sonuc-yuva .qt-sonuc", { timeout: 26000 });
      }
      await sayfa.waitForFunction(() => document.querySelectorAll(".m1-soru .qt-sik--dogru, .m1-soru .qt-sik--dogrusu").length > 0, null, { timeout: 26000 });
      await sayfa.waitForTimeout(450);
      anlar.push(await olc(c.an));
      kayit.sorular.push({ no, kayma: kayma(anlar), sonuc: anlar.at(-1).sonucMetin, satir: anlar.at(-1).sonucSatir, sira: anlar[0].sira, tur: anlar[0].turMetin });
    }
    await sayfa.waitForSelector(".m1-cal-son", { timeout: 15000 });
    await sayfa.waitForTimeout(700);
    const son = await olc("tursonu");
    // Yeniden çizim: kutlama tekrar etmemeli (konfeti sayısı 0 kalmalı)
    await sayfa.waitForTimeout(1800);
    await sayfa.setViewportSize({ width: g, height: h - 1 }); await sayfa.setViewportSize({ width: g, height: h });
    await sayfa.waitForTimeout(200);
    kayit.konfetiTekrar = await sayfa.evaluate(() => document.querySelectorAll(".m1-cal-son .qt-konfeti *").length);
    await sayfa.screenshot({ path: ad("tursonu-tam"), fullPage: true });
    kayit.sonOzet = son.son;
    // Geçişler: 1→2→3. soru açılışında şıklar + yuva + tur satırı aynı yerde (S1–S3 aynı uzunluk → kart da)
    if (tur === "banka") {
      const a = ["acik-1", "acik-2", "acik-3"].map((k) => kayit.anlar[k]);
      kayit.gecisKayma = kayma(a);
    }
  } catch (e) {
    kayit.hata = String(e.message || e).split("\n")[0].slice(0, 200);
    try { await sayfa.screenshot({ path: ad("HATA") }); } catch { /* kapalı */ }
  }
  kayit.konsolHata = [...new Set(konsol)].filter((m) => !/Failed to load resource|ERR_FAILED|net::/.test(m)).slice(0, 6);
  await sayfa.close();
  return kayit;
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: "block" });
const sonuclar = [];
let cikis = 0;
try {
  for (const tur of TURLAR) for (const boyut of BOYUTLAR) for (const dil of DILLER) {
    const k = await turCalistir(baglam, tur, boyut, dil);
    sonuclar.push(k);
    console.log(`  ${tur} ${k.boyut} ${dil}: ${k.hata ? "HATA " + k.hata : "tamam"}`);
  }
} catch (e) { console.error("Betik hatası:", e); cikis = 1; }
finally { await baglam.close().catch(() => {}); await tarayici.close().catch(() => {}); }

const raporYolu = path.join(CIKTI, "olcum.json");
fs.writeFileSync(raporYolu, JSON.stringify({ uretim: iso(0), adres: ADRES, kesilenYazmalar: [...kesilenler], taklitsizRpc: [...taklitsiz], tabloOkumalari: [...okumalar], turlar: sonuclar }, null, 1));

console.log("\ntur     boyut    dil  soru  kayma  sonuç-metni                      satır  sıra-etiketi       tur-satırı");
for (const k of sonuclar) {
  if (k.hata) { console.log(`${k.tur} ${k.boyut} ${k.dil} HATA ${k.hata}`); continue; }
  for (const s of k.sorular) console.log(`${k.tur.padEnd(7)} ${k.boyut.padEnd(8)} ${k.dil}   ${String(s.no).padEnd(4)}  ${String(s.kayma.px).padEnd(5)}  ${String(s.sonuc).padEnd(32)} ${String(s.satir).padEnd(5)}  ${String(s.sira).padEnd(18)} ${s.tur}`);
  const A = Object.values(k.anlar);
  const kesik = [...new Set(A.flatMap((a) => a.kesik))], binen = [...new Set(A.flatMap((a) => a.binen))];
  const soru = A.filter((a) => a.kart);
  console.log(`   geçiş kayması: ${k.gecisKayma ? k.gecisKayma.px + "px " + k.gecisKayma.nerede : "-"} · yatay taşma: ${Math.max(...A.map((a) => a.yatayTasma))} · soru kayar: ${soru.some((a) => a.soruKayar)}`
    + ` · kart: ${[...new Set(soru.map((a) => a.kart.height))].join("/")} · şık: ${soru[0]?.siklar[0]?.height}px ${soru[0]?.sikFont}px · harf ${soru[0]?.harf} · alt boşluk: ${[...new Set(soru.map((a) => a.altBosluk))].join("/")}`);
  console.log(`   tur sonu: ${JSON.stringify(k.sonOzet)} · konfeti tekrar: ${k.konfetiTekrar}`);
  if (kesik.length) console.log("   KESİK:", kesik.slice(0, 6).join(" | "));
  if (binen.length) console.log("   ÖRTÜŞME:", binen.slice(0, 4).join(" | "));
  if (k.konsolHata.length) console.log("   konsol:", k.konsolHata.join(" | "));
}
if (taklitsiz.size) console.log("\nTaklidi olmayan (null dönen) RPC'ler:", [...taklitsiz].join(", "));
if (kesilenler.size) console.log("Kesilen yazmalar:", [...kesilenler].join(", "));
console.log(`Ölçüm: ${path.relative(".", raporYolu)}`);
process.exit(cikis);
