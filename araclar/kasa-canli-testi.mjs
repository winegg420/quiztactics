// ============================================================
// KASA CANLI UÇTAN UCA TESTİ — gerçek test hesaplarıyla (ArayuzDenetim*) canlıda Kasa maçı (4 Eki 2026)
//
// Tarayıcıyı gerçek gibi sürer (playwright, Chrome) ve ÖLÇER:
//   · giriş: Modlar › Kasa kartı, rakip arama, 3-2-1, maç başı sahnesi, soru gelişi
//   · sayaç ↔ sunucu zamanı (kasa_durum.sunucu_zamani; fetch sarmalayıcısı t0/t1 orta noktasıyla saat farkı):
//     saniye kayması, erken/geç bitiş, 0'da takılma, aynı fazda yeniden yükselme
//   · sesler (sessionStorage.bd_ses_tani=1 → window.__sesKayit): aynı sesin iki kez çalması, faza uymayan ses,
//     maç sayfasından çıktıktan sonra çalan ses, sessiz kalan an (soru/sonuç/karar sesi yok)
//   · faz geçişi: boş ekran, çift .ks-mac, faz geri dönmesi (titreme), kutlamanın final sahnesinden önce görünmesi
//   · bitiş: final sahnesi, sonuç ekranı, ödül dökümü, "Yeni Kasa maçı", "Ana sayfa"
//   · isteğe bağlı: maç içinde sayfa yenileme (--yenile=N), geri tuşu (--geri=N), ağ kopması (--kopma=N),
//     yarıda ayrılma (--terk=N), jokerler (--joker), İngilizce (--dil=en), hareket azaltma (--azalt), boyut
//   · 954 DEVAM bırakır + garanti ücretsiz 50:50 (her koşuda ölçülür; --devam ile A daha çok DEVAM der, bot senaryosunda
//     bota kasa bırakır): DEVAM düğmesinde "ÜCRETSİZ 50:50", DEVAM sonrası sahip null + mini kadranda SAHİPSİZ + karar
//     satırı gizli, "ÜCRETSİZ 50:50" kartı + joker sesi, çubukta ÜCRETSİZ 50:50 → kullanım (envanter/joker_kullanimlari/
//     coin değişmez, satın alma penceresi açılmaz), kasa açılana kadar sonraki sorularda yeniden hak, AÇ'tan sonra hak
//     yok, rakip ekranında sızıntı yok (yalnız kullanılınca adı), süre dolumunda hak yok ama sahiplik bırakılır, bot DEVAM'ı
//   · 955/956 tavan + DEVAM çarpanı (956: tavan 60, ×2; 955: 30, ×1,25) + hedef 60 + karar 5 sn: DEVAM düğmesinde "×<çarpan>",
//     DEVAM sonrası kasa = min(ceil(×çarpan), tavan) (bilerek / süre dolumu / bot), ekranda çarpan anı + mini sandıkta "/<tavan>",
//     kasa hiçbir anda tavanı geçmez, hedefle biten
//     maçta kazanan en az 2 AÇ; giriş sahnesi TEK KATMAN (sahne sürerken soru/şık görünmez, 3·2·1 sandığın üstünde)
//
// Senaryolar:
//   --senaryo=gercek : A ve B gerçek eşleşir. Tur planı: 1) A doğru, B yanlış → A sahip · 2) B cevap VERMEZ
//                      (süre dolumu) · 3) ikisi de vermez · sonra ikisi doğru (ÇİFTE); A kasa ≥ 20 ya da
//                      puan+kasa ≥ hedef iken AÇ, ilk karar fazında hiçbir şey seçmez (karar süresi dolumu).
//   --senaryo=bot    : yalnız A; rakip bot. A hep doğru, kasa ≥ 10 iken AÇ (958: alt sınır 0 ise ilk küçük kasa < 10 da AÇ).
//   958: kasa < 10 iken açılan karar fazları (AÇ etkin mi), alt sınır 0 maçında kilitli AÇ görülmemeli, maç sonu hedef.
//
// Kullanım:
//   node araclar/kasa-canli-testi.mjs [--senaryo=gercek] [--a=ArayuzDenetim648] [--b=ArayuzDenetim327]
//        [--adres=https://quiztactics.vercel.app] [--boyut=390x844] [--dil=tr] [--azalt] [--joker]
//        [--yenile=4] [--geri=6] [--kopma=5] [--terk=7] [--etiket=x] [--ss]
// Çıktı: .tmp/kasa-canli-<etiket>.json (+ --ss ile .tmp/kasa-canli-<etiket>-*.jpg)
// Canlıya yazmaz (yalnız oyuncu RPC'leri; veritabanından yalnız doğru şık OKUNUR).
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "https://quiztactics.vercel.app").replace(/\/$/, "");
const KOKEN = new URL(ADRES).origin;
const SENARYO = String(ARG.senaryo || "gercek");
const AD_A = String(ARG.a || "ArayuzDenetim648");
const AD_B = String(ARG.b || "ArayuzDenetim327");
const [GEN, YUK] = String(ARG.boyut || "390x844").split("x").map(Number);
const DIL = String(ARG.dil || "tr");
const AZALT = Boolean(ARG.azalt);
const JOKER = Boolean(ARG.joker);
const DEVAM = Boolean(ARG.devam);
const YENILE = ARG.yenile ? Number(ARG.yenile) : null;
const GERI = ARG.geri ? Number(ARG.geri) : null;
const KOPMA = ARG.kopma ? Number(ARG.kopma) : null;
const TERK = ARG.terk ? Number(ARG.terk) : null;
const SS = Boolean(ARG.ss);
const ETIKET = String(ARG.etiket || `${SENARYO}-${DIL}-${GEN}`);
const OTURUM_DOSYALARI = [".arayuz-denetim-oturum.json", ".arayuz-denetim-oturum-en.json"].map((d) => path.resolve(d));
const CIKTI = path.resolve(".tmp");
const SURE_SINIRI_MS = 9 * 60 * 1000;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const MAC_YOLU = new RegExp("/kasa/(" + UUID.source + ")");
const SES_DOSYA = /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac)(\?.*)?$/i;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const BAS = Date.now();
const sn = () => ((Date.now() - BAS) / 1000).toFixed(1);

async function db(sql) {
  const istemci = await new PgIstemci(await baglantiDizgisi()).baglan();
  try { const r = await istemci.sorgu(sql); return Array.isArray(r) ? r : (r?.rows ?? []); }
  finally { await istemci.kapat().catch(() => {}); }
}

// ---------------------------------------------------------------- sayfa içi kayıt
const SAYFA_HAZIRLIK = ({ kayitlar, koken, dil }) => {
  try {
    if (location.origin === koken && !sessionStorage.getItem("__kasaTestiYuklendi")) {
      for (const k of kayitlar) localStorage.setItem(k.name, k.value);
      localStorage.setItem("bildim_dil", dil);
      sessionStorage.setItem("__kasaTestiYuklendi", "1");
    }
    sessionStorage.setItem("bd_ses_tani", "1");
  } catch { /* depolama kapalı */ }
  // ses kaydı duvar saatiyle: performance.now() Windows headless'ta Date.now()'dan dakikada ~0,5 sn kayıyor
  const sesDizi = [];
  sesDizi.push = function (...x) { for (const o of x) { o.w = Date.now(); o.p = performance.now(); } return Array.prototype.push.apply(this, x); };
  window.__sesKayit = sesDizi;
  // kasa_durum yanıtları: saat farkı ve faz bitişleri için (t0/t1 = istek/yanıt anı, epoch ms)
  window.__kd = [];
  const asil = window.fetch;
  window.fetch = async function (...a) {
    const url = String(a[0]?.url ?? a[0] ?? "");
    const t0 = Date.now();
    const yanit = await asil.apply(this, a);
    if (/\/rpc\/kasa_durum/.test(url)) {
      const t1 = Date.now();
      yanit.clone().json().then((d) => {
        if (!d || typeof d !== "object") return;
        window.__kd.push({ t0, t1, sz: Date.parse(d.sunucu_zamani), durum: d.durum, faz: d.faz, tur: d.tur, altin: d.altin,
          fb: Date.parse(d.faz_bitis), bb: Date.parse(d.sureler?.benim_bitis ?? ""), gb: Date.parse(d.sureler?.gosterim_bas ?? ""),
          fs: Date.parse(d.sureler?.faz_son ?? ""), kopuk: Boolean(d.kopuk), kasa: d.kasa, sahip: d.sahip, ben: d.ben,
          puan: (d.oyuncular ?? []).map((o) => [o.id, o.puan]), cevapladim: Boolean(d.cevap?.ben_cevapladim),
          rakipCevapladi: Boolean(d.cevap?.rakip_cevapladi), karar: d.karar, sonKarar: d.son_karar, sonuc: d.sonuc ? { ben: d.sonuc.ben_dogru, rakip: d.sonuc.rakip_dogru, artis: d.sonuc.artis } : null,
          kazanan: d.kazanan, neden: d.sonuc_neden, joker: d.joker ?? null, rakipJoker: d.rakip_joker ?? null,
          devamOdul: d.devam_odul ?? null, bedava: d.bedava_joker ?? null, devamSans: d.devam_sans ?? null,
          devamElli: Boolean(d.devam_elli), devamBirakir: Boolean(d.devam_birakir),
          hedef: d.hedef, tavan: Number(d.tavan ?? 0), carpan: Number(d.devam_carpan ?? 1), acma: (d.oyuncular ?? []).map((o) => [o.id, o.acma]), acmaMin: Number(d.acma_min ?? 0) });
      }).catch(() => {});
    }
    return yanit;
  };
  window.__kayit = [];
  window.__mut = [];
  // faz sınıfı değişimi (rAF'tan bağımsız): MutationObserver
  try {
    new MutationObserver((l) => {
      for (const m of l) if (m.target.classList?.contains("ks-mac")) window.__mut.push({ w: Date.now(), p: performance.now(), c: (m.target.className.match(/ks-mac--(\w+)/) || [])[1] });
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  } catch { /* yok */ }
  let son = "";
  const tik = () => {
    try {
      const q = (s) => document.querySelector(s);
      const mac = q(".ks-mac");
      const faz = mac ? (mac.className.match(/ks-mac--(\w+)/) || [])[1] || "?" : q(".ks-bitti--final") ? "final" : q(".ks-bitti") ? "bitti" : "";
      const sayac = (q(".ks-sayac .qt-sayac-sayi")?.textContent || "").trim();
      const tur = (q(".m2-gecis")?.textContent || "").trim();
      const ust = [q(".m1-sayim-sayi") && "321:" + q(".m1-sayim-sayi").textContent, q(".ks-giris-sayi") && "321:" + q(".ks-giris-sayi").textContent,
        q(".ks-giris-an") && "giris", q(".ks-carpan-etiket") && "carpan", q(".qt-sik") && "sik", q(".ks-ac-an") && "ac",
        q(".ks-cifte") && "cifte", q(".ks-final") && "final", q(".msk") && "kutlama", q(".msk-bekle") && "bekle",
        q(".ks-rakip-joker-an") && "rjoker", q(".ks-devam-an--kazandi") && "devamKazandi", q(".ks-devam-an--yok") && "devamYok", q(".m2-yukleniyor") && "yukleniyor", q(".ks-karar") && "karar", q(".m2-gecis") && "bant"].filter(Boolean).join(",");
      const bant = [...document.querySelectorAll(".m2-bant")].map((e) => e.textContent.replace(/\s+/g, " ").trim()).join(" / ").slice(0, 60);
      const soru = (q(".qt-soru-metin")?.textContent || "").trim().slice(0, 24);
      const cift = document.querySelectorAll(".ks-mac").length;
      const bos = (document.querySelector("#root")?.innerText ?? "").trim().length < 3;
      const imza = `${location.pathname}|${faz}|${sayac}|${ust}|${bant}|${soru}|${cift}|${bos}|${tur}`;
      if (imza !== son) { son = imza; window.__kayit.push({ t: Date.now(), yol: location.pathname, faz, sayac, ust, bant, soru, cift, bos, tur }); }
    } catch { /* yok */ }
    requestAnimationFrame(tik);
  };
  requestAnimationFrame(tik);
};

// ---------------------------------------------------------------- hesaplar
const kokenler = [];
for (const dosya of OTURUM_DOSYALARI) {
  if (!fs.existsSync(dosya)) continue;
  const veri = JSON.parse(fs.readFileSync(dosya, "utf8"));
  for (const o of veri.origins ?? []) {
    const jeton = o.localStorage?.find((x) => x.name.includes("auth-token"));
    let uid = null;
    try { uid = JSON.parse(jeton.value).user?.id ?? null; } catch { /* yok */ }
    if (uid) kokenler.push({ dosya, origin: o.origin, uid, kayitlar: o.localStorage ?? [] });
  }
}
const adlar = await db(`select id, takma_ad from profiles where id in (${kokenler.map((k) => alintila(k.uid)).join(",")})`);
for (const k of kokenler) k.ad = adlar.find((a) => a.id === k.uid)?.takma_ad ?? null;
const hesapA = kokenler.find((k) => k.ad === AD_A);
const hesapB = SENARYO === "gercek" ? kokenler.find((k) => k.ad === AD_B) : null;
if (!hesapA || (SENARYO === "gercek" && !hesapB)) { console.log(`DUR: oturum yok (bulunan: ${kokenler.map((k) => k.ad).join(", ")})`); process.exit(1); }

// ---------------------------------------------------------------- tarayıcı
fs.mkdirSync(CIKTI, { recursive: true });
const rapor = { adres: ADRES, senaryo: SENARYO, etiket: ETIKET, boyut: `${GEN}x${YUK}`, dil: DIL, azalt: AZALT, tarih: new Date().toISOString(), kirilanlar: [], notlar: [], adimlar: [] };
const konsol = { A: [], B: [] };
const kirildi = (m) => { if (!rapor.kirilanlar.includes(m)) { rapor.kirilanlar.push(m); console.log("  ✗", m); } };
const notEkle = (m) => { rapor.notlar.push(m); console.log("  ·", m); };
const adim = (m) => { rapor.adimlar.push(`+${sn()} ${m}`); console.log(`· +${sn()}s ${m}`); };

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
async function baglamAc(ad, hesap) {
  const b = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: GEN, height: YUK }, deviceScaleFactor: 2,
    locale: DIL === "en" ? "en-US" : "tr-TR", timezoneId: "Europe/Istanbul", reducedMotion: AZALT ? "reduce" : "no-preference" });
  await b.addInitScript(SAYFA_HAZIRLIK, { kayitlar: hesap.kayitlar, koken: KOKEN, dil: DIL });
  const s = await b.newPage();
  s.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    if (SES_DOSYA.test(m.location()?.url ?? "")) return;
    konsol[ad].push({ t: sn(), tur: m.type(), m: m.text().replace(/\s+/g, " ").slice(0, 220) });
  });
  s.on("pageerror", (e) => konsol[ad].push({ t: sn(), tur: "pageerror", m: String(e).split("\n")[0].slice(0, 220) }));
  return { ad, b, s, hesap, sesler: [], kd: [], kayit: [] };
}
let sonDokunHata = "";
const dokun = async (l, ms = 2000) => { try { await l.click({ timeout: ms }); return true; } catch (e) { sonDokunHata = String(e.message).split("\n").filter((x) => /intercept|disabled|not enabled|visible|stable|waiting/i.test(x)).slice(-2).join(" ¦ ").slice(0, 240); return false; } };
const SIK_DURUM = () => ({ siklar: [...document.querySelectorAll(".qt-sik")].map((e) => `${e.disabled ? "D" : "-"}${(e.className.match(/qt-sik--(\w+)/g) || []).join("+")}`),
  ust: [".ks-giris-an", ".ks-ac-an", ".m2-gecis", ".ks-cifte", ".ks-rakip-joker-an", ".ks-joker-bilgi", ".m2-bant"].filter((x) => document.querySelector(x)), faz: document.querySelector(".ks-mac")?.className });
async function goruntu(o, ad) {
  if (!SS) return;
  try { await o.s.screenshot({ path: path.join(CIKTI, `kasa-canli-${ETIKET}-${ad}.jpg`), type: "jpeg", quality: 60 }); } catch { /* yok */ }
}
// Sayfa yenilenince kayıtlar sıfırlanır: önce topla
async function topla(o) {
  try {
    const r = await o.s.evaluate(() => {
      const s = (window.__sesKayit ?? []).map((x) => ({ rol: x.rol, t: x.w ?? Math.round(performance.timeOrigin + x.t) }));
      const out = { kd: window.__kd ?? [], kayit: window.__kayit ?? [], ses: s };
      window.__kd = []; window.__kayit = []; if (window.__sesKayit) window.__sesKayit.length = 0;
      return out;
    });
    o.kd.push(...r.kd); o.kayit.push(...r.kayit); o.sesler.push(...r.ses);
  } catch { /* sayfa geçişte */ }
}

async function oturumAc(o) {
  await o.s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const ana = o.s.locator(".as-buyuk-dugme--oyna, .a-modlar, .tabbar").first();
  await ana.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
  const uid = await o.s.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); try { return JSON.parse(localStorage.getItem(k)).user.id; } catch { return null; } });
  if (uid !== o.hesap.uid) throw new Error(`${o.ad}: oturum açılmadı (${uid})`);
  // yenilenen jeton geri yazılır
  try {
    const jeton = await o.s.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); return { ad: k, deger: localStorage.getItem(k) }; });
    const veri = JSON.parse(fs.readFileSync(o.hesap.dosya, "utf8"));
    const kayit = veri.origins?.find((x) => x.origin === o.hesap.origin)?.localStorage?.find((x) => x.name === jeton.ad);
    if (kayit && kayit.value !== jeton.deger) { kayit.value = jeton.deger; fs.writeFileSync(o.hesap.dosya, JSON.stringify(veri, null, 2)); }
  } catch (e) { notEkle(`oturum dosyası güncellenemedi: ${e.message}`); }
  // Sayfaya bir kez dokun: ses (userActivation) açılsın — gerçek oyuncu da dokunur
  await o.s.mouse.click(5, Math.round(YUK / 2)).catch(() => {});
}
async function pencereKapat(o) {
  for (let i = 0; i < 4; i++) {
    const d = o.s.getByRole("button", { name: /^(Atla|Anladım|Geç|Tamam|Skip|Got it|OK)$/ });
    if (!(await d.count())) return;
    await dokun(d.first(), 1500);
    await bekle(300);
  }
}

// ---------------------------------------------------------------- maç sürücüsü
const dogruOnbellek = new Map();
async function dogruSik(macId, tur, altin) {
  const a = `${tur}-${altin}`;
  if (!dogruOnbellek.has(a)) {
    dogruOnbellek.set(a, db(`select q.dogru_cevap::int as d from kasa_maclari k join questions q on q.id = k.soru_id where k.id = ${alintila(macId)}`)
      .then((r) => (r[0] ? Number(r[0].d) : null)).catch(() => null));
  }
  return dogruOnbellek.get(a);
}
const DURUM = () => {
  const q = (s) => document.querySelector(s);
  const kd = (window.__kd ?? []).at(-1) ?? null;
  return {
    yol: location.pathname, kd,
    faz: (q(".ks-mac")?.className.match(/ks-mac--(\w+)/) || [])[1] ?? null,
    sikAcik: document.querySelectorAll(".qt-sik:not([disabled]):not(.qt-sik--elendi):not(.qt-sik--kilitli)").length,
    sik: document.querySelectorAll(".qt-sik").length,
    karar: Boolean(q(".ks-karar")), acDugme: Boolean(q(".ks-karar button")),
    kilit: document.querySelectorAll(".ks-ac-kilit, .ks-ac-kilitli").length,   // 958: alt sınır 0 iken hiç görünmemeli
    bitti: Boolean(q(".ks-bitti")), kutlama: Boolean(q(".msk")), final: Boolean(q(".ks-final")),
    joker: document.querySelectorAll(".m1-joker-yuva:not(.m1-joker-yuva--pasif) .qt-skill").length,
  };
};

// 953: DEVAM'a bastıktan sonra — sunucunun ödül kaydı, an, çubuk, ücretsiz joker kullanımı (envanter/sınır değişmez)
const devamKayit = [];      // { ad, tur, kazandi, joker, an, bar, kullanildi, s }
const kucukKarar = [];      // 958: { ad, tur, kasa, ac, acEtkin } — kasa < 10 iken açılan karar fazları
const kilitGoruldu = [];    // 958: acma_min 0 maçında kilitli AÇ rozeti/düğmesi görüldü mü
const carpanKayit = [];     // 955: { ad, tur, eski, yeni, bek, sure } — DEVAM çarpanı
const botDevam = [];        // { tur, kazandi, joker }
async function devamOlc(o, tur) {
  const t0 = Date.now();
  let kd = null;
  for (let i = 0; i < 40 && !kd; i++) {
    await bekle(150);
    kd = await o.s.evaluate((t) => (window.__kd ?? []).filter((x) => x.faz === "cevap" && Number(x.tur) === t).at(-1) ?? null, tur).catch(() => null);
  }
  const kayit = { ad: o.ad, tur, kazandi: kd?.devamOdul?.kazandi ?? null, joker: kd?.devamOdul?.joker ?? null, an: false, bar: false, kullanildi: null, s: sn(), t: Date.now(), tKlik: t0 };
  devamKayit.push(kayit);
  if (!kd) { kirildi(o.ad + " tur " + tur + ": DEVAM sonrası 6 sn soru durumu gelmedi"); return; }
  if (!kd.devamOdul) { kirildi(o.ad + " tur " + tur + ": bilerek DEVAM ama sunucu ödül kaydı (devam_odul) yok"); return; }
  const q = kd.devamOdul.kazandi ? ".ks-devam-an--kazandi" : ".ks-devam-an--yok";
  kayit.an = await o.s.locator(q).first().waitFor({ state: "attached", timeout: 3000 }).then(() => true).catch(() => false);
  if (!kayit.an) kirildi(o.ad + " tur " + tur + ": DEVAM ödülü anı (" + q + ") görünmedi");
  if (kayit.an && SS && !o.devamGoruntu?.[q]) { (o.devamGoruntu ??= {})[q] = 1; await goruntu(o, "devam-" + (kd.devamOdul.kazandi ? "kazandi" : "yok") + "-" + o.ad); }
  adim(o.ad + " DEVAM ödülü (tur " + tur + "): " + (kd.devamOdul.kazandi ? "KAZANDI " + kd.devamOdul.joker : "yok") + " · an " + (kayit.an ? "göründü" : "YOK") + " · " + (Date.now() - t0) + " ms");
  // 955/956: DEVAM çarpanı — kasa = min(ceil(eski × çarpan), tavan); ekranda çarpan anı ve "/<tavan>"
  if (kd.carpan > 1 && kd.sonKarar) {
    const eski = Number(kd.sonKarar.deger), bek = Math.min(Math.ceil(eski * kd.carpan), kd.tavan > 0 ? kd.tavan : Infinity);
    carpanKayit.push({ ad: o.ad, tur, eski, yeni: Number(kd.sonKarar.yeni ?? kd.kasa), bek, sure: false });
    if (Number(kd.kasa) !== bek || Number(kd.sonKarar.yeni) !== bek) kirildi(o.ad + " tur " + tur + ": DEVAM ×" + kd.carpan + " " + eski + " → " + kd.kasa + " (beklenen " + bek + ")");
    if (!AZALT && bek !== eski) {
      const an = await o.s.locator(".ks-carpan-etiket").first().waitFor({ state: "attached", timeout: 2500 }).then(() => true).catch(() => false);
      if (!an) kirildi(o.ad + " tur " + tur + ": DEVAM ×" + kd.carpan + " anı (.ks-carpan-etiket) görünmedi");
      else if (SS && !o.devamGoruntu?.carpan) { (o.devamGoruntu ??= {}).carpan = 1; await goruntu(o, "devam-carpan-" + o.ad); }
    }
    await bekle(AZALT ? 300 : 1700);
    const mini = await o.s.locator(".ks-kadran--kucuk").first().innerText().catch(() => "");
    if (kd.tavan > 0 && !mini.includes("/" + kd.tavan)) kirildi(o.ad + " tur " + tur + ": mini sandıkta tavan (/" + kd.tavan + ") yok (" + mini.replace(/\s+/g, " ") + ")");
    if (!new RegExp("\\b" + bek + "\\b").test(mini)) kirildi(o.ad + " tur " + tur + ": mini sandık yeni değeri (" + bek + ") göstermiyor (" + mini.replace(/\s+/g, " ") + ")");
    adim(o.ad + " DEVAM ×" + kd.carpan + " (tur " + tur + "): " + eski + " → " + kd.kasa);
  }
  // 954: garanti 50:50 + sahiplik bırakma (ekranda SAHİPSİZ, karar satırı gizli)
  if (kd.devamElli && (!kd.devamOdul.kazandi || kd.devamOdul.joker !== "elli")) kirildi(o.ad + " tur " + tur + ": 954 DEVAM garanti 50:50 vermedi " + JSON.stringify(kd.devamOdul));
  if (kd.devamBirakir) {
    if (kd.sahip != null) kirildi(o.ad + " tur " + tur + ": DEVAM sonrası sahip null olmalı (" + kd.sahip + ")");
    const rozet = await o.s.locator(".ks-kadran-sahipsiz").first().waitFor({ state: "attached", timeout: 2500 }).then(() => true).catch(() => false);
    if (!rozet) kirildi(o.ad + " tur " + tur + ": DEVAM sonrası mini kadranda SAHİPSİZ rozeti yok");
    if (await o.s.locator(".ks-karar-satir").count()) kirildi(o.ad + " tur " + tur + ": sahipsizken karar satırı göründü");
  }
  if (!kd.devamOdul.kazandi) {
    await bekle(400);
    if (await o.s.locator(".ks-joker-yuva .qt-skill[data-bedava]").count()) kirildi(o.ad + " tur " + tur + ": kazanmadığı halde ÜCRETSİZ joker görünüyor");
    return;
  }
  // çubuk: ücretsiz joker basılabilir olunca (gösterim payı biter) kullan
  const b = o.s.locator(".m1-joker-yuva:not(.m1-joker-yuva--pasif) .qt-skill[data-bedava]").first();
  kayit.bar = await b.waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
  if (!kayit.bar) { kirildi(o.ad + " tur " + tur + ": çubukta ÜCRETSİZ joker görünmedi"); return; }
  const etiket = await b.getAttribute("aria-label").catch(() => "");
  if (SS && !o.devamGoruntu?.bar) { (o.devamGoruntu ??= {}).bar = 1; await goruntu(o, "devam-ucretsiz-cubuk-" + o.ad); }
  const uid = o.hesap.uid;
  const olc = async () => (await db("select (select count(*) from joker_kullanimlari where mac_id = " + alintila(macId) + " and user_id = " + alintila(uid) + ")::int n, " +
    "(select coalesce(sum(adet), 0) from joker_envanter where user_id = " + alintila(uid) + " and tur in ('elli', 'sure'))::int env, " +
    "(select coin from profiles where id = " + alintila(uid) + ")::bigint coin"))[0];
  const once = await olc();
  const basildi = await dokun(b, 2500);
  const pencere = await o.s.getByRole("dialog").first().waitFor({ timeout: 900 }).then(() => true).catch(() => false);
  if (pencere) kirildi(o.ad + " tur " + tur + ": ücretsiz jokerde satın alma penceresi açıldı");
  await bekle(1200);
  const sonra = await olc();
  kayit.kullanildi = basildi && !pencere;
  kayit.dbOnce = once; kayit.dbSonra = sonra;
  if (!basildi) kirildi(o.ad + " tur " + tur + ": ücretsiz joker basılamadı — " + sonDokunHata);
  else if (String(once.n) !== String(sonra.n) || String(once.env) !== String(sonra.env) || String(once.coin) !== String(sonra.coin))
    kirildi(o.ad + " tur " + tur + ": ücretsiz joker envanter/coin/joker_kullanimlari değiştirdi " + JSON.stringify([once, sonra]));
  else adim(o.ad + " tur " + tur + ": ÜCRETSİZ " + kd.devamOdul.joker + " kullandı (" + String(etiket || "").split(" — ")[0] + ") — envanter/coin/sınır aynı");
  if (SS && !o.devamGoruntu?.kul) { (o.devamGoruntu ??= {}).kul = 1; await goruntu(o, "devam-ucretsiz-kullanildi-" + o.ad); }
}

let macId = null;
const plan = { kararSuresiDoldu: false, sureDolumTur: null };
async function sur(o, rol) {
  const cevaplanan = new Set(), kararlanan = new Set(), yapilan = new Set();
  let bosBas = null;
  while (Date.now() - BAS < SURE_SINIRI_MS) {
    const d = await o.s.evaluate(DURUM).catch(() => null);
    if (!d) { await bekle(150); continue; }
    if (!MAC_YOLU.test(d.yol)) { if (!o.geriModu) { notEkle(`${o.ad}: maç adresinden çıkıldı (${d.yol})`); return; } }
    if (d.bitti) { o.bitti = true; return; }
    const k = d.kd;
    if (!k || k.durum !== "aktif") { await bekle(150); continue; }
    const tur = Number(k.tur);
    const anah = `${tur}-${k.altin}`;
    const benSahip = k.sahip && k.sahip === k.ben;
    const benimPuan = Number((k.puan.find((p) => p[0] === k.ben) ?? [0, 0])[1]);
    const hedef = Number(k.hedef ?? 60);   // 955: 60 (maç satırından)
    if (k.acmaMin === 0 && d.kilit > 0 && !kilitGoruldu.some((x) => x.ad === o.ad && x.tur === tur)) {
      kilitGoruldu.push({ ad: o.ad, tur });
      kirildi(o.ad + ": alt sınır 0 maçında kilitli AÇ görüldü (tur " + tur + ", kasa " + k.kasa + ")");
    }

    // ---- isteğe bağlı bozulmalar (A)
    if (rol === "A" && k.faz === "cevap") {
      if (YENILE && tur === YENILE && !yapilan.has("yenile")) {
        yapilan.add("yenile"); await topla(o); const t = Date.now();
        await o.s.reload({ waitUntil: "domcontentloaded" });
        await o.s.locator(".ks-mac, .ks-bitti").first().waitFor({ timeout: 20000 }).catch(() => kirildi(`${o.ad}: yenilemeden sonra 20 sn maç ekranı gelmedi`));
        adim(`${o.ad} maç içinde sayfayı yeniledi (tur ${tur}) → ${((Date.now() - t) / 1000).toFixed(1)} sn'de maç ekranı`);
        await o.s.mouse.click(5, Math.round(YUK / 2)).catch(() => {});
        continue;
      }
      if (GERI && tur === GERI && !yapilan.has("geri")) {
        yapilan.add("geri"); await topla(o); o.geriModu = true;
        await o.s.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        await bekle(1500);
        const yol = new URL(o.s.url()).pathname;
        adim(`${o.ad} geri tuşu (tur ${tur}) → ${yol}`);
        rapor.geri = { yol };
        await goruntu(o, "geri");
        await o.s.goForward({ waitUntil: "domcontentloaded" }).catch(() => {});
        await bekle(800);
        if (!MAC_YOLU.test(new URL(o.s.url()).pathname)) await o.s.goto(ADRES + "/kasa/" + macId, { waitUntil: "domcontentloaded" });
        await o.s.locator(".ks-mac, .ks-bitti").first().waitFor({ timeout: 20000 }).catch(() => kirildi(`${o.ad}: geri+ileri sonrası maç ekranı gelmedi`));
        o.geriModu = false;
        adim(`${o.ad} ileri → ${new URL(o.s.url()).pathname}`);
        continue;
      }
    }
    if (rol === "B" && KOPMA && tur === KOPMA && k.faz === "cevap" && !yapilan.has("kopma")) {
      yapilan.add("kopma");
      await o.b.setOffline(true); adim(`${o.ad} ağ KOPTU (tur ${tur}), 30 sn`);
      await bekle(30000);
      await o.b.setOffline(false); adim(`${o.ad} ağ geri geldi`);
      continue;
    }
    if (rol === "B" && TERK && tur === TERK && !yapilan.has("terk")) {
      yapilan.add("terk");
      await dokun(o.s.getByRole("button", { name: /Maçtan çık|Leave match|Leave the match/i }).first(), 3000);
      const onay = o.s.getByRole("dialog").getByRole("button", { name: /^(Çık|Leave|Exit)$/ }).first();
      if (await dokun(onay, 4000)) adim(`${o.ad} maçtan çıktı (tur ${tur})`); else kirildi(`${o.ad}: maçtan çık onayı bulunamadı`);
      await goruntu(o, "terk-b");
      continue;
    }

    // ---- karar
    if (k.faz === "karar" && d.karar && benSahip && !kararlanan.has(anah)) {
      kararlanan.add(anah);
      const kasa = Number(k.kasa);
      let ac;
      // 958: alt sınır yoksa bot senaryosunda ilk küçük kasa (< 10) AÇ'la sınanır, sonrakiler DEVAM
      const kucukAc = SENARYO === "bot" && k.acmaMin === 0 && kasa < 10 && !kucukKarar.some((x) => x.ac);
      if (SENARYO === "bot") ac = kucukAc || kasa >= (DEVAM ? 24 : 10) || benimPuan + kasa >= hedef;
      else ac = rol === "A" && (kasa >= (DEVAM ? 24 : 20) || benimPuan + kasa >= hedef);
      if (SENARYO === "gercek" && !plan.kararSuresiDoldu && !ac) { plan.kararSuresiDoldu = true; plan.sureDolumTur = { ad: o.ad, tur }; adim(`${o.ad} karar vermiyor (tur ${tur}, kasa ${kasa}) — süre dolumu`); continue; }
      await bekle(700);
      const dugme = o.s.locator(".ks-karar button").nth(ac ? 0 : 1);
      if (kasa < 10) {
        const acEtkin = await o.s.locator(".ks-karar button").nth(0).isEnabled().catch(() => false);
        kucukKarar.push({ ad: o.ad, tur, kasa, ac, acEtkin });
        if (k.acmaMin === 0 && !acEtkin) kirildi(o.ad + ": kasa " + kasa + " iken AÇ düğmesi devre dışı (alt sınır 0)");
      }
      if (!ac) {
        const yazi = await dugme.innerText().catch(() => "");
        if (!/ÜCRETSİZ 50:50|FREE 50:50/.test(yazi)) kirildi(o.ad + ": DEVAM düğmesinde ÜCRETSİZ 50:50 yazmıyor (" + yazi + ")");
        // 955: tavanın altındaysa DEVAM düğmesinde çarpan yazılır
        if (k.carpan > 1 && !(k.tavan > 0 && kasa >= k.tavan) && !yazi.includes("×" + String(k.carpan).replace(".", ",")) && !yazi.includes("×" + k.carpan)) kirildi(o.ad + ": DEVAM düğmesinde ×" + k.carpan + " yazmıyor (" + yazi + ")");
      }
      if (await dokun(dugme, 3000)) adim(`${o.ad} ${ac ? "AÇ" : "DEVAM"} (tur ${tur}, kasa ${kasa})`);
      else { const m = await o.s.locator(".ks-karar button").allInnerTexts().catch(() => []); kirildi(`${o.ad}: karar düğmesi bulunamadı (${m.join(" | ")})`); }
      if (!ac) await devamOlc(o, tur);
      continue;
    }

    // ---- 953: bot DEVAM dedi → sunucudaki ödül kaydı (yalnız okuma)
    if (SENARYO === "bot" && rol === "A" && k.faz === "cevap" && k.sonKarar && k.sonKarar.veren !== k.ben && !k.sonKarar.ac && !k.sonKarar.sure_doldu && !yapilan.has("bot-devam-" + anah)) {
      yapilan.add("bot-devam-" + anah);
      const [x] = await db("select (joker -> bot::text -> 'devam')::text dv from kasa_maclari where id = " + alintila(macId) + " and tur = " + tur).catch(() => []);
      const dv = x?.dv ? JSON.parse(x.dv) : null;
      botDevam.push({ tur, kazandi: dv?.kazandi ?? null, joker: dv?.joker ?? null });
      adim("bot DEVAM (tur " + tur + ") → " + (dv == null ? "ödül kaydı YOK" : dv.kazandi ? "joker " + dv.joker + " (hemen kullandı)" : "kazanamadı"));
    }

    // ---- cevap
    if (k.faz === "cevap" && !k.cevapladim && d.sikAcik >= 2 && !cevaplanan.has(anah)) {
      // giriş sahnesi / gösterim payı: şıklar tıklanabilir olunca
      const dogru = await dogruSik(macId, tur, k.altin);
      if (dogru == null) { await bekle(200); continue; }
      let ne = "dogru";
      if (SENARYO === "gercek") {
        const acSonrasi = Boolean(k.sonKarar?.ac);   // AÇ'ın açtığı soru: tek bilen yeni sahip olsun
        if (tur === 1) ne = rol === "A" ? "dogru" : "yanlis";
        else if (tur === 2) ne = rol === "A" ? "dogru" : "yok";
        else if (tur === 3) ne = "yok";
        else if (k.altin) ne = rol === "A" ? "dogru" : "yanlis";
        // 954: sahipsiz kasada (AÇ ya da DEVAM sonrası) A tek başına bilsin → yeniden sahip olsun
        else ne = acSonrasi || k.sahip == null ? (rol === "A" ? "dogru" : "yanlis") : "dogru";
      } else if (DEVAM && tur % 3 === 0 && !k.altin) ne = "yanlis";   // 953: bota da kasa kalsın (bot DEVAM ölçümü)
      cevaplanan.add(anah);
      if (ne === "yok") { adim(`${o.ad} tur ${tur}: cevap VERMİYOR (süre dolumu)`); continue; }
      // jokerler: tur 4 A 50:50 + B Zaman Baskısı · tur 5 A Ek Süre · tur 6 B İkinci Şans (önce yanlış)
      let ikinciSans = false;
      const jokerPlan = { "4A": 1, "4B": 1, "5A": 1, "6B": 1 }[`${tur}${rol}`];
      if (JOKER && jokerPlan) {
        const kullan = async (desen) => {
          const aktif = o.s.locator(".m1-joker-yuva:not(.m1-joker-yuva--pasif) .qt-skill");
          await aktif.first().waitFor({ timeout: 4000 }).catch(() => {});
          const b = o.s.locator(`.m1-joker-yuva .qt-skill[aria-label*="${desen}"]`).first();
          if (!(await b.count()) || !(await aktif.count())) {
            const bilgi = await o.s.evaluate(() => ({ yuva: document.querySelector(".m1-joker-yuva")?.className ?? "yok",
              etiket: [...document.querySelectorAll(".m1-joker-yuva .qt-skill")].map((e) => e.getAttribute("aria-label")),
              hak: document.querySelector(".m1-skill-hak")?.textContent ?? "" }));
            kirildi(`${o.ad} tur ${tur}: "${desen}" jokeri basılamadı — ${JSON.stringify(bilgi).slice(0, 400)}`); return false;
          }
          let ok = await dokun(b, 2000);
          // stok yoksa Klasik "al ve kullan" penceresi açılır: onayla (coin düşer)
          const al = o.s.getByRole("dialog").getByRole("button", { name: /Al ve kullan|Buy and use/i }).first();
          if (ok && await al.waitFor({ timeout: 1200 }).then(() => true).catch(() => false)) { ok = await dokun(al, 2500); adim(`${o.ad} tur ${tur}: ${desen} satın alındı`); }
          adim(`${o.ad} tur ${tur}: joker ${desen} ${ok ? "kullandı" : "BASILAMADI"}`);
          await bekle(900);
          return ok;
        };
        if (tur === 4 && rol === "A") await kullan(DIL === "en" ? "50:50" : "50:50");
        if (tur === 4 && rol === "B") await kullan(DIL === "en" ? "Time Pressure" : "Zaman Baskısı");
        if (tur === 5 && rol === "A") await kullan(DIL === "en" ? "Extra Time" : "Ek Süre");
        if (tur === 6 && rol === "B") ikinciSans = await kullan(DIL === "en" ? "Second Chance" : "İkinci Şans");
      }
      await bekle(SENARYO === "bot" ? 1200 : rol === "A" ? 900 : 1600);
      const siklar = o.s.locator(".qt-sik");
      // 954: ücretsiz 50:50 sonrası elenen şık basılamaz → elenmemiş ilk yanlış şık
      const elenen = await o.s.evaluate(() => [...document.querySelectorAll(".qt-sik")].map((e) => /elendi/.test(e.className))).catch(() => []);
      const yanlis = [0, 1, 2, 3].find((i) => i !== dogru && !elenen[i]) ?? [0, 1, 2, 3].find((i) => i !== dogru);
      if (ikinciSans) {
        // ilk yanlış (kapalı olmayan) → sonra doğru
        const n = await siklar.count();
        let y = -1;
        for (let i = 0; i < n; i++) if (i !== dogru && !(await siklar.nth(i).evaluate((e) => e.disabled || /elendi/.test(e.className)))) { y = i; break; }
        if (y >= 0) { const ok1 = await dokun(siklar.nth(y), 2500); adim(`${o.ad} tur ${tur}: İkinci Şans — önce yanlış (${y}) ${ok1 ? "basıldı" : "BASILAMADI " + sonDokunHata}`); await bekle(1200); }
        await goruntu(o, `ikinci-sans-${o.ad}`);
        if (await dokun(siklar.nth(dogru), 2500)) adim(`${o.ad} tur ${tur}: İkinci Şans — sonra doğru`);
        else kirildi(`${o.ad} tur ${tur}: İkinci Şans sonrası doğru şıkka basılamadı — ${sonDokunHata} ${JSON.stringify(await o.s.evaluate(SIK_DURUM).catch(() => null))}`);
        continue;
      }
      const hedefSik = ne === "dogru" ? dogru : yanlis;
      if (!(await dokun(siklar.nth(hedefSik), 2500))) {
        const durum = await o.s.evaluate(SIK_DURUM).catch(() => null);
        await goruntu(o, `sik-basilamadi-${o.ad}-${tur}`);
        notEkle(`${o.ad} tur ${tur}: şıkka basılamadı (yeniden denenecek) — ${sonDokunHata} ${JSON.stringify(durum)}`);
        cevaplanan.delete(anah);
      }
      continue;
    }
    await bekle(120);
    if (d.yol && !d.faz && !d.bitti) {
      bosBas ??= Date.now();
      if (Date.now() - bosBas > 6000 && !o.bosBildirildi) { o.bosBildirildi = true; kirildi(`${o.ad}: 6 sn maç ekranı yok (${d.yol})`); await goruntu(o, `bos-${o.ad}`); }
    } else bosBas = null;
  }
  kirildi(`${o.ad}: süre sınırı (${SURE_SINIRI_MS / 60000} dk) doldu, maç bitmedi`);
}

// ---------------------------------------------------------------- analiz
function analiz(o) {
  const kd = o.kd.filter((x) => Number.isFinite(x.sz));
  // saat farkı: sunucu − istemci (orta nokta); en kısa gidiş-dönüşlü 5 örneğin medyanı
  const ornek = kd.map((x) => ({ rtt: x.t1 - x.t0, fark: x.sz - (x.t0 + x.t1) / 2 })).sort((a, b) => a.rtt - b.rtt).slice(0, 5).map((x) => x.fark).sort((a, b) => a - b);
  const fark = ornek.length ? ornek[Math.floor(ornek.length / 2)] : 0;
  const s = { fark: Math.round(fark), rttMedyan: kd.length ? kd.map((x) => x.t1 - x.t0).sort((a, b) => a - b)[Math.floor(kd.length / 2)] : null,
    sayacSapma: [], sifirdaTakilma: [], yenidenYukselme: [], fazGeriDonus: [], cift: 0, bos: [], sesCift: [], sesFazsiz: [], sessiz: [], sesSonra: [], fazlar: [] };
  // her kare için: o andaki son kasa_durum (aynı faz/tur) → beklenen kalan
  const kdBul = (t, faz) => { let son = null; for (const x of kd) { if (x.t1 > t) break; if (x.durum === "aktif" && x.faz === faz) son = x; } return son; };
  let enDusuk = new Map();
  let oncekiFaz = null;
  for (const f of o.kayit) {
    if (f.cift > 1) s.cift++;
    if (!["cevap", "karar"].includes(f.faz) || f.sayac === "" || f.bant) { oncekiFaz = f.faz || oncekiFaz; continue; }
    const n = Number(f.sayac);
    const x = kdBul(f.t, f.faz);
    if (!x) continue;
    const bitis = f.faz === "cevap" && Number.isFinite(x.bb) ? x.bb : x.fb;
    const sunucuSimdi = f.t + fark;
    const kalan = (bitis - Math.max(sunucuSimdi, Number.isFinite(x.gb) ? x.gb : 0)) / 1000;
    const beklenen = Math.max(0, Math.ceil(kalan));
    const anah = `${x.tur}-${x.altin}-${f.faz}`;
    // sayacGoster kesir kaymasını (≤1 sn) yayar → 1 sn fark normal; ≥2 sn sapma hatadır. Cevap verildiyse sayaç durur.
    if (!x.cevapladim && Math.abs(n - beklenen) >= 2) s.sayacSapma.push({ s: ((f.t - BAS) / 1000).toFixed(1), anah, ekran: n, beklenen, kalan: kalan.toFixed(2) });
    const dus = enDusuk.get(anah);
    if (dus != null && n >= dus + 2 && !x.joker?.turler?.includes?.("sure")) s.yenidenYukselme.push({ s: ((f.t - BAS) / 1000).toFixed(1), anah, dus, n });
    enDusuk.set(anah, dus == null ? n : Math.min(dus, n));
  }
  // 0'da takılma: sayaç "0" gösterdikten sonra faz değişene kadar geçen süre
  let sifir = null;
  for (const f of o.kayit) {
    const sifirMi = ["cevap", "karar"].includes(f.faz) && f.sayac === "0" && !f.bant;
    if (sifirMi && !sifir) sifir = f;
    if (sifir && (f.faz !== sifir.faz || f.soru !== sifir.soru || f.bant)) {
      const ms = f.t - sifir.t;
      if (ms > (sifir.faz === "cevap" ? 3500 : 2500)) s.sifirdaTakilma.push({ s: ((sifir.t - BAS) / 1000).toFixed(1), faz: sifir.faz, ms });
      s.fazlar.push({ faz: sifir.faz, sifirdanSonraMs: ms });
      sifir = null;
    }
  }
  // faz geri dönüşü: aynı soruda sonuc → cevap
  for (let i = 1; i < o.kayit.length; i++) {
    const a = o.kayit[i - 1], b = o.kayit[i];
    if (a.faz === "sonuc" && b.faz === "cevap" && a.soru && a.soru === b.soru) s.fazGeriDonus.push({ s: ((b.t - BAS) / 1000).toFixed(1), soru: a.soru });
    if (a.faz === "final" && b.faz === "bitti" && i + 1 < o.kayit.length && o.kayit.slice(i + 1).some((c) => c.faz === "final")) s.fazGeriDonus.push({ s: ((b.t - BAS) / 1000).toFixed(1), final: true });
    if (b.bos && MAC_YOLU.test(b.yol)) {
      const sonraki = o.kayit.slice(i + 1).find((c) => !c.bos);
      const ms = (sonraki?.t ?? Date.now()) - b.t;
      if (ms > 600) s.bos.push({ s: ((b.t - BAS) / 1000).toFixed(1), ms });
    }
  }
  // sesler: aynı rol 500 ms içinde iki kez (tik/dokunus hariç) · maç sayfasından çıktıktan sonra
  const sesler = o.sesler.slice().sort((a, b) => a.t - b.t);
  for (let i = 1; i < sesler.length; i++) {
    const a = sesler[i - 1], b = sesler[i];
    if (a.rol === b.rol && b.t - a.t < 500 && b.t - a.t >= 40 && !["dokunus", "tik", "sayim_son"].includes(a.rol)) s.sesCift.push({ rol: a.rol, s: ((b.t - BAS) / 1000).toFixed(1), araMs: b.t - a.t });
  }
  // tik: aynı faz içinde aynı saniye iki kez
  // faz–ses eşleşmesi: her ekran faz başlangıcı (cevap/sonuc/karar) için ±1.2 sn içinde beklenen ses
  const fazBas = [];
  for (let i = 0; i < o.kayit.length; i++) {
    const f = o.kayit[i], once = o.kayit[i - 1];
    if (!f.faz || f.faz === once?.faz) continue;
    if (["cevap", "sonuc", "karar", "final"].includes(f.faz) && once?.faz && !["", "?"].includes(once.faz)) fazBas.push({ faz: f.faz, t: f.t, ust: f.ust });
  }
  const BEKLENEN_SES = { cevap: ["soru_geldi", "tur_gecis", "rozet", "coin"], sonuc: ["dogru", "yanlis"], karar: ["tur_gecis"], final: ["joker", "tur_gecis", "rozet", "yanlis"] };
  for (const f of fazBas) {
    // 955: ilk soru giriş sahnesi sürerken açılır, sesi sahne bitince (soru görününce) çalar — pencere sahne sonuna kadar
    const ust = f.faz === "cevap" && (f.ust || "").includes("giris") ? 3200 : 1800;
    const var_ = sesler.some((x) => BEKLENEN_SES[f.faz].includes(x.rol) && x.t >= f.t - 1200 && x.t <= f.t + ust);
    if (!var_) s.sessiz.push({ faz: f.faz, s: ((f.t - BAS) / 1000).toFixed(1), ust: f.ust });
  }
  // bir faz başlangıcına iki "soru_geldi" / "dogru|yanlis"
  for (const f of fazBas) {
    const roller = sesler.filter((x) => x.t >= f.t - 1200 && x.t <= f.t + 2500).map((x) => x.rol);
    const say = (r) => roller.filter((x) => x === r).length;
    if (f.faz === "cevap" && say("soru_geldi") > 1) s.sesCift.push({ rol: "soru_geldi", s: ((f.t - BAS) / 1000).toFixed(1), adet: say("soru_geldi") });
    if (f.faz === "sonuc" && say("dogru") + say("yanlis") > 1) s.sesCift.push({ rol: "dogru/yanlis", s: ((f.t - BAS) / 1000).toFixed(1), adet: say("dogru") + say("yanlis") });
  }
  // maçtan çıkış (yol değişimi) sonrası çalan sesler (2 sn tolerans yok — sahne bitince kesilmeli)
  // maç sayfası dışındayken (geri tuşu / maç sonrası gezinme) çalan maç sesleri
  const yolAninda = (t) => { let y = null; for (const f of o.kayit) { if (f.t > t) break; y = f; } return y; };
  for (const x of sesler) {
    const f = yolAninda(x.t - 150);
    if (!f || MAC_YOLU.test(f.yol) || ["dokunus", "sayfa_gecis", "rakip_bulundu", "vs_ani", "bildirim"].includes(x.rol)) continue;
    const cikis = [...o.kayit].reverse().find((c) => c.t <= x.t && !MAC_YOLU.test(c.yol) && o.kayit[o.kayit.indexOf(c) - 1] && MAC_YOLU.test(o.kayit[o.kayit.indexOf(c) - 1].yol));
    if (cikis) s.sesSonra.push({ rol: x.rol, s: ((x.t - BAS) / 1000).toFixed(1), msSonra: x.t - cikis.t });
  }
  s.sesSayim = sesler.reduce((m, x) => ((m[x.rol] = (m[x.rol] ?? 0) + 1), m), {});
  return s;
}

// ================================================================ çalışma
let A = null, B = null;
try {
  console.log(`Kasa canlı testi — ${ADRES} · ${SENARYO} · A=${AD_A}${hesapB ? " · B=" + AD_B : ""} · ${GEN}×${YUK} · ${DIL}${AZALT ? " · hareket azaltılmış" : ""}${JOKER ? " · joker" : ""}`);
  A = await baglamAc("A", hesapA);
  if (hesapB) B = await baglamAc("B", hesapB);
  const oyuncular = [A, B].filter(Boolean);
  for (const o of oyuncular) await oturumAc(o);
  adim("oturumlar açık");

  // ---- giriş: Modlar › Kasa kartı
  for (const o of oyuncular) {
    await o.s.goto(ADRES + "/modlar", { waitUntil: "domcontentloaded" });
    await pencereKapat(o);
    const kart = o.s.locator(".qt-mod--kasa").first();
    const kartVar = await kart.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (!kartVar) {
      const k2 = o.s.getByRole("button", { name: /Kasa/ }).first();
      if (!(await dokun(k2, 5000))) { kirildi(`${o.ad}: Modlar sayfasında Kasa kartı bulunamadı`); await goruntu(o, `modlar-${o.ad}`); await o.s.goto(ADRES + "/kasa"); }
    } else await dokun(kart, 5000);
    await o.s.waitForURL(/\/kasa$/, { timeout: 10000 }).catch(() => kirildi(`${o.ad}: Kasa kartı /kasa'ya götürmedi (${o.s.url()})`));
    await o.s.locator(".ks-giris").first().waitFor({ timeout: 20000 }).catch(() => kirildi(`${o.ad}: Kasa giriş ekranı gelmedi`));
    await pencereKapat(o);
    await goruntu(o, `giris-${o.ad}`);
    // taşma ölçümü
    const tasma = await o.s.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (tasma > 1) kirildi(`${o.ad}: Kasa girişinde yatay taşma ${tasma}px (${innerWidth}px)`);
  }
  adim("Kasa giriş ekranları açık");

  // ---- arama
  const ara = (o) => dokun(o.s.getByRole("button", { name: /Rakip ara|Find opponent|Find an opponent/i }).first(), 5000);
  if (!(await ara(A))) throw new Error("A: Rakip ara düğmesi yok");
  if (B) { await bekle(400); if (!(await ara(B))) throw new Error("B: Rakip ara düğmesi yok"); }
  const macMi = (o) => MAC_YOLU.test(o.s.url());
  for (let i = 0; i < 160 && !oyuncular.every(macMi); i++) await bekle(500);
  if (!oyuncular.every(macMi)) { for (const o of oyuncular) await goruntu(o, `arama-${o.ad}`); throw new Error("maça girilemedi (80 sn)"); }
  macId = A.s.url().match(MAC_YOLU)[1];
  if (B && B.s.url().match(MAC_YOLU)[1] !== macId) throw new Error("A ve B farklı maçlara düştü (bot eşleşmesi) — tekrar çalıştır");
  rapor.macId = macId;
  const [m] = await db(`select k.bot is not null as botlu from kasa_maclari k where k.id = ${alintila(macId)}`);
  adim(`maç ${macId} (${m?.botlu === "t" || m?.botlu === true ? "bot" : "gerçek-gerçek"})`);
  if (SENARYO === "gercek" && (m?.botlu === "t" || m?.botlu === true)) throw new Error("gerçek senaryoda botlu maç");

  // giriş anları (3-2-1, giriş sahnesi): A'da görüntü
  if (SS) {
    await A.s.locator(".ks-giris-an").first().waitFor({ timeout: 8000 }).then(() => goruntu(A, "giris-sahnesi")).catch(() => {});
    await A.s.locator(".ks-giris-sayi").first().waitFor({ timeout: 8000 }).then(() => goruntu(A, "321")).catch(() => {});
  }
  // ara toplama (sayfa yenilemeye karşı) + sürücüler
  const toplayici = setInterval(() => { for (const o of oyuncular) topla(o); }, 4000);
  await Promise.all(oyuncular.map((o) => sur(o, o.ad)));
  clearInterval(toplayici);

  // ---- bitiş: final sahnesi → kutlama
  for (const o of oyuncular) {
    const fin = await o.s.locator(".ks-final").first().isVisible().catch(() => false);
    if (fin) await goruntu(o, `final-${o.ad}`);
    const kutlama = await o.s.locator(".msk").first().waitFor({ timeout: 25000 }).then(() => true).catch(() => false);
    if (!kutlama) { kirildi(`${o.ad}: maç sonu kutlaması 25 sn'de gelmedi`); await goruntu(o, `bitis-yok-${o.ad}`); continue; }
    await bekle(2500);
    await goruntu(o, `sonuc-${o.ad}`);
    const ozet = await o.s.evaluate(() => ({
      metin: (document.querySelector(".msk")?.innerText ?? "").replace(/\s+/g, " ").slice(0, 500),
      tasma: document.documentElement.scrollWidth - window.innerWidth,
      yeni: Boolean([...document.querySelectorAll("button")].find((b) => /Yeni Kasa maçı|New Kasa match|New Vault match/i.test(b.textContent))),
    }));
    o.ozet = ozet;
    if (ozet.tasma > 1) kirildi(`${o.ad}: sonuç ekranında yatay taşma ${ozet.tasma}px`);
    if (!ozet.yeni) kirildi(`${o.ad}: "Yeni Kasa maçı" düğmesi yok`);
  }
  // DB: maç sonu ve ödül
  const [son] = await db(`select durum, kazanan, sonuc_neden, puan1, puan2, tur, oyuncu1, terk_eden, acma_sayisi1, acma_sayisi2, kasa_tavan, devam_carpan, hedef, karar_sn from kasa_maclari where id = ${alintila(macId)}`);
  rapor.macSon = son;
  adim(`maç sonu: ${son?.durum} · neden ${son?.sonuc_neden} · ${son?.puan1}-${son?.puan2} · tur ${son?.tur}`);
  for (const o of oyuncular) {
    const benimPuan = son ? Number(o.hesap.uid === son.oyuncu1 ? son.puan1 : son.puan2) : null;
    if (o.ozet && benimPuan != null && !o.ozet.metin.includes(String(benimPuan))) kirildi(`${o.ad}: sonuç ekranında kendi puanı (${benimPuan}) görünmüyor`);
  }
  // ---- "Yeni Kasa maçı" (A) ve "Ana sayfa" (B)
  await topla(A); if (B) await topla(B);
  if (await dokun(A.s.locator("button").filter({ hasText: /Yeni Kasa maçı|New Kasa match|New Vault match/i }).first(), 4000)) {
    const ok = await A.s.locator(".ks-giris").first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    adim(`A "Yeni Kasa maçı" → ${ok ? "Kasa girişi" : "GİRİŞ GELMEDİ " + A.s.url()}`);
    if (!ok) kirildi("A: Yeni Kasa maçı Kasa girişine götürmedi");
  }
  if (B) {
    const ev = B.s.locator(".msk button[aria-label='Ana sayfa'], .msk button[aria-label='Home']").first();
    if (await dokun(ev, 4000)) { await bekle(1500); adim(`B "Ana sayfa" → ${new URL(B.s.url()).pathname}`); }
    else notEkle("B: Ana sayfa düğmesi bulunamadı");
  }
  await bekle(6000);   // çıkış sonrası çalan ses var mı
  for (const o of oyuncular) await topla(o);
} catch (e) {
  rapor.hata = String(e?.message ?? e).split("\n")[0];
  console.log("\nHATA:", rapor.hata);
} finally {
  for (const o of [A, B].filter(Boolean)) {
    await topla(o);
    rapor[o.ad] = analiz(o);
    rapor[o.ad].konsol = konsol[o.ad];
    rapor[o.ad].ozet = o.ozet ?? null;
    const r = rapor[o.ad];
    for (const x of r.sayacSapma.slice(0, 6)) kirildi(`${o.ad}: sayaç sapması ${x.anah} ekran ${x.ekran} / sunucu ${x.beklenen} (+${x.s}s)`);
    for (const x of r.sifirdaTakilma) kirildi(`${o.ad}: sayaç 0'da ${(x.ms / 1000).toFixed(1)} sn kaldı (${x.faz}, +${x.s}s)`);
    for (const x of r.yenidenYukselme) kirildi(`${o.ad}: sayaç aynı fazda yükseldi ${x.anah} ${x.dus}→${x.n} (+${x.s}s)`);
    for (const x of r.fazGeriDonus) kirildi(`${o.ad}: faz geri döndü (titreme) +${x.s}s ${JSON.stringify(x)}`);
    if (r.cift) kirildi(`${o.ad}: ${r.cift} karede iki .ks-mac (çift çizim)`);
    for (const x of r.bos) kirildi(`${o.ad}: boş ekran ${x.ms} ms (+${x.s}s)`);
    for (const x of r.sesCift) kirildi(`${o.ad}: ses iki kez: ${x.rol} (+${x.s}s ${x.araMs ?? x.adet})`);
    for (const x of r.sessiz) kirildi(`${o.ad}: sessiz an: ${x.faz} başında ses yok (+${x.s}s, ${x.ust})`);
    for (const x of r.sesSonra) kirildi(`${o.ad}: maçtan çıktıktan ${x.msSonra} ms sonra ses: ${x.rol}`);
    for (const k of konsol[o.ad]) if (k.tur === "pageerror" || (k.tur === "error" && !/Failed to fetch|Failed to load resource|net::ERR_INTERNET|ERR_NAME|status of 4/i.test(k.m))) kirildi(`${o.ad}: konsol ${k.tur}: ${k.m.slice(0, 140)}`);
    rapor[o.ad].kayitOrnek = o.kayit.slice(0, 400);
    rapor[o.ad].sesler = o.sesler.map((x) => ({ rol: x.rol, s: ((x.t - BAS) / 1000).toFixed(2) }));
  }
  // ---- 954 DEVAM: sızıntı, kalıcı hak (AÇ'a kadar), süre dolumu, ses, rakibin gördüğü
  rapor.devam = { kayit: devamKayit, bot: botDevam };
  for (const o of [A, B].filter(Boolean)) {
    // Hak zaman çizelgesi: kendi bilerek DEVAM'ım → hak var; herhangi bir AÇ → hak biter
    let hak = false, sizinti = false;
    const hakSorular = new Map();   // tur → bu soruda ücretsiz 50:50 (bedava ya da kullanılmış elli) görüldü mü
    for (const x of o.kd) {
      const sk = x.sonKarar;
      if (x.faz === "cevap" && sk && Number(x.tur) >= 1) {
        if (sk.ac) hak = false;
        else if (sk.veren === x.ben && !sk.sure_doldu && x.devamElli) hak = true;
      }
      if (x.faz === "karar" && x.karar) { /* karar fazı hakkı değiştirmez */ }
      const benimDevam = sk && sk.veren === x.ben && !sk.ac && !sk.sure_doldu;
      if (!sizinti && ((x.devamOdul && !benimDevam) || (x.bedava && !hak && !benimDevam))) {
        kirildi(o.ad + ": hakkı yokken ücretsiz joker bilgisi geldi (sızıntı) tur " + x.tur + " " + JSON.stringify([x.devamOdul, x.bedava, sk]));
        sizinti = true;
      }
      if (hak && x.faz === "cevap" && !x.altin && x.durum === "aktif") {
        const goruldu = x.bedava === "elli" || (x.joker?.turler ?? []).includes("elli");
        hakSorular.set(Number(x.tur), Boolean(hakSorular.get(Number(x.tur))) || goruldu);
      }
    }
    const eksik = [...hakSorular].filter(([, g]) => !g).map(([t]) => t);
    if (eksik.length) kirildi(o.ad + ": kasa açılmadan önceki soruda ücretsiz 50:50 verilmedi, tur " + eksik.join(","));
    rapor[o.ad].hakSorular = [...hakSorular.keys()];
    if (plan.sureDolumTur?.ad === o.ad) {
      const x = o.kd.find((z) => Number(z.tur) === plan.sureDolumTur.tur && z.faz === "cevap");
      if (x?.devamBirakir && x.sahip != null) kirildi(o.ad + ": süre dolumu (tur " + plan.sureDolumTur.tur + ") sahipliği bırakmadı");
    }
    if (plan.sureDolumTur?.ad === o.ad && o.kd.some((x) => Number(x.tur) === plan.sureDolumTur.tur && x.faz === "cevap" && x.devamOdul))
      kirildi(o.ad + ": süre dolumu (tur " + plan.sureDolumTur.tur + ") ödül verdi");
    const dizi = devamKayit.filter((x) => x.ad === o.ad && x.kazandi != null).map((x) => x.kazandi);
    let seri = 0, enUzun = 0;
    for (const z of dizi) { seri = z ? 0 : seri + 1; enUzun = Math.max(enUzun, seri); }
    if (enUzun > 0 && o.kd.some((x) => x.devamElli)) kirildi(o.ad + ": 954'te DEVAM ödülü garanti olmalı (kaçırma " + enUzun + ")");
    const ss = o.sesler.slice().sort((a, b) => a.t - b.t);
    for (const x of devamKayit.filter((y) => y.ad === o.ad && y.an)) {
      const jokerSes = ss.some((z) => z.rol === "joker" && z.t >= x.tKlik - 300 && z.t <= x.t + 1500);
      if (x.kazandi && !jokerSes) kirildi(o.ad + " tur " + x.tur + ": joker kazanınca joker sesi çalmadı");
      if (!x.kazandi && jokerSes) kirildi(o.ad + " tur " + x.tur + ": kazanamayınca ses çaldı (sessiz olmalı)");
    }
    // rakip: kullanılan ücretsiz jokeri yalnız ADIYLA görür
    const diger = [A, B].filter(Boolean).find((z) => z !== o);
    for (const x of devamKayit.filter((y) => y.ad === o.ad && y.kullanildi)) {
      if (diger && !diger.kd.some((z) => Number(z.tur) === x.tur && Array.isArray(z.rakipJoker) && z.rakipJoker.includes(x.joker)))
        kirildi(diger.ad + ": rakibin kullandığı ücretsiz " + x.joker + " (tur " + x.tur + ") rakip_joker'de görünmedi");
    }
  }
  // ---- 955: tavan hiç aşılmaz · süre dolumu / bot DEVAM'ı da çarpar · hedefle biten maçta kazanan ≥ 2 AÇ · giriş tek katman
  rapor.carpan = carpanKayit;
  for (const o of [A, B].filter(Boolean)) {
    const asan = o.kd.find((x) => x.tavan > 0 && Number(x.kasa) > x.tavan);
    if (asan) kirildi(o.ad + ": kasa tavanı aştı " + asan.kasa + "/" + asan.tavan + " (tur " + asan.tur + ")");
    // rakibin / süre dolumunun / botun DEVAM'ı: sonKarar.yeni = min(ceil(deger × çarpan), tavan)
    const gorulen = new Set();
    for (const x of o.kd) {
      const sk = x.sonKarar;
      if (x.faz !== "cevap" || !sk || sk.ac || sk.son || !(x.carpan > 1) || gorulen.has(x.tur)) continue;
      gorulen.add(x.tur);
      const bek = Math.min(Math.ceil(Number(sk.deger) * x.carpan), x.tavan > 0 ? x.tavan : Infinity);
      if (Number(sk.yeni) !== bek) kirildi(o.ad + ": DEVAM (tur " + x.tur + ", " + (sk.sure_doldu ? "süre dolumu" : sk.veren === x.ben ? "ben" : "rakip") + ") " + sk.deger + " → " + sk.yeni + " (beklenen " + bek + ")");
      else if (sk.veren !== x.ben || sk.sure_doldu) carpanKayit.push({ ad: o.ad, tur: x.tur, eski: Number(sk.deger), yeni: Number(sk.yeni), bek, sure: Boolean(sk.sure_doldu), rakip: sk.veren !== x.ben });
    }
    // giriş tek katman: sahne varken şık yok; 3·2·1 sahnenin içinde sırayla
    const girisKare = o.kayit.filter((x) => (x.ust || "").includes("giris"));
    if (girisKare.some((x) => (x.ust || "").includes("sik"))) kirildi(o.ad + ": giriş sahnesi sürerken şıklar çizildi (tek katman değil)");
    if (girisKare.some((x) => /321:/.test(x.ust || "") && !/321:[123]/.test(x.ust))) kirildi(o.ad + ": giriş sayacı 3/2/1 dışında değer gösterdi");
    const sayilar = [...new Set(girisKare.map((x) => ((x.ust || "").match(/321:(\d)/) || [])[1]).filter(Boolean))];
    if (girisKare.length && sayilar.join("") !== "321") kirildi(o.ad + ": giriş sahnesinde 3·2·1 sırası " + (sayilar.join("·") || "yok"));
    if (o.kayit.some((x) => (x.ust || "").includes("321:") && !(x.ust || "").includes("giris"))) kirildi(o.ad + ": 3-2-1 sahne dışında (eski üst üste katman) göründü");
    // sahne boyunca 3-2-1 tiki en çok üç kez; sahne kalkınca soru sesi
    let girisTik = null, girisSoru = null;
    if (girisKare.length) {
      const g0 = girisKare[0].t, g1 = Math.max(...girisKare.map((x) => x.t));
      const son = o.kayit.find((x) => x.t > g1 && !(x.ust || '').includes('giris'))?.t ?? g1 + 500;
      girisTik = o.sesler.filter((x) => ['tik', 'sayim_son'].includes(x.rol) && x.t >= g0 && x.t <= son).length;
      girisSoru = o.sesler.some((x) => x.rol === 'soru_geldi' && x.t >= son - 400 && x.t <= son + 1500);
      if (girisTik > 3) kirildi(o.ad + ': giriş sahnesinde 3-2-1 tiki ' + girisTik + ' kez çaldı');
      if (!girisSoru) kirildi(o.ad + ': giriş sahnesi kalkınca soru sesi çalmadı');
    }
    rapor[o.ad].giris = { kare: girisKare.length, sayilar, tik: girisTik, soruSesi: girisSoru };
  }
  if (rapor.macSon?.durum === "bitti" && rapor.macSon?.sonuc_neden === "hedef") {
    const kazAc = Number(rapor.macSon.kazanan === rapor.macSon.oyuncu1 ? rapor.macSon.acma_sayisi1 : rapor.macSon.acma_sayisi2);
    // 956: tavan ≥ hedef iken tek AÇ maçı bitirebilir (Ida kararı); yalnız tavan < hedef (955) iken en az 2 AÇ
    if (Number(rapor.macSon.kasa_tavan) > 0 && Number(rapor.macSon.kasa_tavan) < Number(rapor.macSon.hedef) && kazAc < 2) kirildi("hedefle biten 955 maçı tek AÇ ile bitti (kazanan AÇ " + kazAc + ")");
    rapor.kazananAc = kazAc;
  }
  // 958: yeni maç alt sınırsız + hedef 80; küçük kasada karar fazı açılmalı
  rapor.kucukKarar = kucukKarar;
  console.log("\n958 KÜÇÜK KARAR — hedef " + rapor.macSon?.hedef + " · " + (kucukKarar.map((x) => x.ad + " t" + x.tur + " K" + x.kasa + (x.ac ? " AÇ" : " DEVAM")).join(" · ") || "yok"));
  if (SENARYO === "bot" && rapor.macSon && kucukKarar.length === 0) notEkle("bu maçta A'ya kasa < 10 iken karar fazı düşmedi (rastlantı)");
  if (SENARYO === "bot" && kucukKarar.length && !kucukKarar.some((x) => x.ac)) kirildi("küçük kasada AÇ sınanamadı");
  console.log("\n955 ÇARPAN — " + carpanKayit.map((x) => x.ad + " t" + x.tur + " " + x.eski + "→" + x.yeni + (x.sure ? " (süre)" : x.rakip ? " (rakip)" : "")).join(" · "));
  for (const x of botDevam) {
    if (x.kazandi == null) kirildi("bot DEVAM (tur " + x.tur + "): sunucuda ödül kaydı yok");
    else if (x.kazandi && !A.kd.some((z) => Number(z.tur) === x.tur && Array.isArray(z.rakipJoker) && z.rakipJoker.includes(x.joker)))
      kirildi("A: botun kazanıp kullandığı " + x.joker + " (tur " + x.tur + ") rakip_joker'de görünmedi");
  }
  const ozetD = (ad) => { const d = devamKayit.filter((x) => x.ad === ad); return ad + ": DEVAM " + d.length + " · kazandı " + d.filter((x) => x.kazandi).length + " · ücretsiz kullanıldı " + d.filter((x) => x.kullanildi).length; };
  console.log("\n954 DEVAM — " + ["A", "B"].filter((a) => rapor[a]).map((a) => a + " hak soruları " + (rapor[a].hakSorular ?? []).length).join(" | ") + " · " + ["A", "B"].filter((a) => rapor[a]).map(ozetD).join(" | ") + (botDevam.length ? " | bot DEVAM " + botDevam.length + " · kazandı " + botDevam.filter((x) => x.kazandi).length : ""));
  fs.writeFileSync(path.join(CIKTI, `kasa-canli-${ETIKET}.json`), JSON.stringify(rapor, null, 1));
  console.log(`\n=== SONUÇ (${ETIKET}) === süre ${sn()} sn · maç ${macId ?? "yok"} · ${rapor.macSon ? `${rapor.macSon.durum}/${rapor.macSon.sonuc_neden} ${rapor.macSon.puan1}-${rapor.macSon.puan2} tur ${rapor.macSon.tur}` : ""}`);
  for (const ad of ["A", "B"]) if (rapor[ad]) console.log(`${ad}: saat farkı ${rapor[ad].fark} ms · rtt ${rapor[ad].rttMedyan} ms · 0→faz ${JSON.stringify(rapor[ad].fazlar.map((f) => f.faz[0] + f.sifirdanSonraMs))} · ses ${JSON.stringify(rapor[ad].sesSayim)}`);
  console.log(`kırılan: ${rapor.kirilanlar.length}`);
  for (const k of rapor.kirilanlar) console.log("  ✗", k);
  console.log(rapor.hata ? `HATA: ${rapor.hata}` : rapor.kirilanlar.length ? "GEÇMEDİ" : "GEÇTİ");
  await tarayici.close().catch(() => {});
  process.exit(rapor.hata || rapor.kirilanlar.length ? 2 : 0);
}
