// ============================================================
// DÜELLO CANLI EKRAN TESTİ — iki MEVCUT misafir hesapla kısa Düello + ekran görüntüleri (2 Eki 2026)
//
// duello-iki-oyuncu-testi.mjs'nin kısa ve kota dostu türevi. Farkları:
//   · yeni hesap AÇMAZ: `.arayuz-denetim-oturum.json` içindeki iki misafir oturumu kullanır (takma adla seçilir)
//   · ağ bozmaz, 16 tur oynatmaz: ilk --tur (vars. 4) tur sonucundan sonra A "Düellodan çık" ile ayrılır
//   · canlıya TEK yazma: oyun_ayarlari.duello_acilis_mac_esigi geçici 0, try/finally ile eski değere döner ve
//     ayrı bir bağlantıyla okunarak doğrulanır (düello satırına elle dokunulmaz)
//   · ses dosyaları indirilmez; istekler sayılır
//   · DUR KURALI: 402 / 429 / gövdede quota|restricted|grace / arka arkaya 3 adet 5xx → test hemen durur
//   · anlar duruma göre yakalanır (sabit gecikme yok): arama, BAN SIRASI SENDE, ban geri sayımı, RAKİP BANLADI,
//     ban sonrası saldırı, soru çerçevesi (kırmızı/mavi/gri) + etiket, tur sonucu, 5 yuva paneli
//   · doğru şık veritabanından OKUNUR (saldıran doğru, savunan yanlış cevaplar → yuvalar dolar, çerçeve renkleri çeşitlenir)
//
// Kullanım:
//   node araclar/duello-canli-ekran-testi.mjs [--adres=https://quiztactics.vercel.app] [--a=ArayuzDenetim648]
//        [--b=ArayuzDenetim327] [--tur=4] [--cikti=docs/ekran-turu]
// Çıktı: <cikti>/duello-*.jpg · duello-olcum.json · (konsol çıktısı çağıran tarafından dosyaya alınır)
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";
import { duelloTanitimAnahtari } from "./duello-tanitim-anahtar.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "https://quiztactics.vercel.app").replace(/\/$/, "");
const KOKEN = new URL(ADRES).origin;
const AD_A = String(ARG.a || "ArayuzDenetim648");
const AD_B = String(ARG.b || "ArayuzDenetim327");
const YASAK_AD = "ArayuzDenetim300";   // başka pencere bu hesapla maç oynuyor olabilir
const TUR_SINIRI = Number(ARG.tur ?? 4);
const CIKTI = path.resolve(String(ARG.cikti || "docs/ekran-turu"));
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const AYAR = "duello_acilis_mac_esigi";
const SURE_SINIRI_MS = 8 * 60 * 1000;
const BOYUT_SINIRI = 250 * 1024;
const SES = /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac)(\?.*)?$/i;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const MAC_YOLU = new RegExp("/duello/(" + UUID.source + ")");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const BAS = Date.now();
const sn = () => ((Date.now() - BAS) / 1000).toFixed(1);

if ([AD_A, AD_B].includes(YASAK_AD)) { console.log(`DUR: ${YASAK_AD} kullanılamaz.`); process.exit(1); }

// ---- veritabanı: her iş kendi kısa bağlantısında (uzun testte boşta kalan bağlantıya güvenilmez)
let dbSorguSayisi = 0;
async function db(sql) {
  const dizgi = await baglantiDizgisi();
  if (!dizgi) throw new Error("veritabanı bağlantı bilgisi yok");
  const istemci = await new PgIstemci(dizgi).baglan();
  try { dbSorguSayisi++; const r = await istemci.sorgu(sql); return Array.isArray(r) ? r : (r?.rows ?? []); }
  finally { await istemci.kapat().catch(() => {}); }
}
const ayarOku = async () => (await db(`select deger from oyun_ayarlari where anahtar = ${alintila(AYAR)}`))[0]?.deger ?? null;

// ---- sayfa içi kayıt (duello-iki-oyuncu-testi ile aynı ölçüm) + oturumun canlı kökene taşınması
const SAYFA_HAZIRLIK = ({ tanitimAnahtari, kayitlar, koken }) => {
  try {
    if (location.origin === koken && !sessionStorage.getItem("__duelloTestiYuklendi")) {
      for (const k of kayitlar) localStorage.setItem(k.name, k.value);
      localStorage.setItem(tanitimAnahtari, "1");   // tanıtım aramayı geciktirmesin
      sessionStorage.setItem("__duelloTestiYuklendi", "1");
    }
  } catch { /* depolama kapalı */ }
  window.__kayit = [];
  let son = "";
  const tik = () => {
    try {
      const mac = document.querySelector(".hk-mac");
      const faz = mac ? (mac.className.match(/hk-mac--(\w+)/) || [])[1] || "?" : "";
      const tur = (document.querySelector(".hk-tur")?.textContent || "").replace(/\s+/g, " ").trim();
      const sayac = (document.querySelector(".hk-sayac .qt-sayac-sayi")?.textContent || "").trim();
      const bant = [...document.querySelectorAll(".m2-bant")].map((e) => e.textContent.replace(/\s+/g, " ").trim()).join(" / ").slice(0, 80);
      const soru = (document.querySelector(".qt-soru-metin")?.textContent || "").trim().slice(0, 30);
      const imza = `${faz}|${tur}|${sayac}|${bant}|${soru}`;
      if (imza !== son) { son = imza; window.__kayit.push({ t: Date.now(), faz, tur, sayac, bant, soru }); }
    } catch { /* yok */ }
    requestAnimationFrame(tik);
  };
  requestAnimationFrame(tik);
};

const DURUM = () => {
  const q = (s) => document.querySelector(s);
  const t = window.__bdTani ?? null;
  const tur = (document.body.innerText.match(/(?:Tur|Round)\s+(\d+)\s*\/\s*\d+/i) ?? [])[1];
  const durumEl = q(".hk-soru--durum");
  const ton = durumEl ? ([...durumEl.classList].find((c) => c.startsWith("hk-durum--")) ?? "").replace("hk-durum--", "") : null;
  const acik = (g) => document.querySelectorAll(`button.hk-kart${g ? ".hk-kart--" + g : ""}:not([disabled]):not(.hk-kart--banli)`).length;
  return {
    yol: location.pathname, faz: t?.mod === "duello" ? t.faz : null, kilitli: Boolean(t?.kilitli), sureBitti: Boolean(t?.sureBitti),
    calisan: t?.calisan ?? null, sureler: t?.sureler ?? null, tur: tur ? Number(tur) : null,
    banGiris: Boolean(q(".hk-banan--giris")), banSec: Boolean(q(".hk-bankonsol--sec")), banTamam: Boolean(q(".hk-bankonsol--tamam")),
    banBekle: Boolean(q(".hk-bankonsol--bekle")), banAcik: Boolean(q(".hk-banan--acik")), banOnay: Boolean(q(".hk-banan--onay")),
    banBilgi: Boolean(q(".hk-banan--bilgi")), banSira: Boolean(q(".hk-bansira")),
    banSayi: (q(".hk-bankonsol-sayi")?.textContent ?? "").trim(),
    savunanCubuk: Boolean(q(".hk-cubuk--savunan")),
    kartAcik: acik(""), kartRakip: acik("rakip"), kartBen: acik("ben"), kartBos: acik("bos"),
    banliKart: document.querySelectorAll(".hk-kart-ban").length,
    secili: Boolean(q(".hk-kart--secili")), cubukDugme: Boolean(q(".hk-cubuk-dugme:not([disabled])")),
    ton, etiket: (q(".hk-durum-etiket")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    sikAcik: document.querySelectorAll(".qt-sik:not([disabled]):not(.qt-sik--elendi)").length,
    sonuc: Boolean(q(".hk-mesaj--sonuc")), mesaj: (q(".hk-mesaj-yazi")?.innerText ?? "").replace(/\s+/g, " ").slice(0, 110),
    tahta: Boolean(q(".hk-mac")),
    yuvalar: [...document.querySelectorAll(".hk-taraf")].map((e) => ({
      taraf: ([...e.classList].find((c) => c.startsWith("hk-taraf--") && c !== "hk-taraf--kritik") ?? "").replace("hk-taraf--", ""),
      yuva: e.querySelectorAll(".hk-yuva").length, dolu: e.querySelectorAll(".hk-yuva--dolu").length,
      say: (e.querySelector(".hk-say")?.innerText ?? "").replace(/\s+/g, " ").trim(),
    })),
    bosEkran: document.body.innerText.trim().length < 5,
  };
};
const TON_RENK = { tehlike: "kirmizi", firsat: "mavi", notr: "gri" };

// ---- kayıt analizi (duello-iki-oyuncu-testi › analiz ile aynı ölçüt)
function analiz(kayit) {
  const sonuc = { yenidenBaslama: [], sifirdaKalma: [], enUzunSifirMs: 0, ilkSayac: {} };
  let sifirBas = null;
  const enDusuk = new Map();
  for (const o of kayit) {
    const anahtar = `${o.tur}|${o.faz}${o.faz === "cevap" ? "|" + (o.soru || "") : ""}`;
    const n = o.sayac === "" ? null : Number(o.sayac);
    if (n != null && Number.isFinite(n) && ["kategori", "cevap", "ban"].includes(o.faz)) {
      const turNo = (o.tur.match(/\d+/) ?? ["?"])[0];
      const a2 = `tur${turNo}-${o.faz}`;
      sonuc.ilkSayac[a2] = Math.max(sonuc.ilkSayac[a2] ?? 0, n);   // fazda görülen en yüksek sayaç = başlangıç süresi
      const dusuk = enDusuk.get(anahtar);
      if (dusuk != null && n >= dusuk + 2) sonuc.yenidenBaslama.push({ s: ((o.t - BAS) / 1000).toFixed(1), anahtar, dusuk, n, bant: o.bant });
      enDusuk.set(anahtar, dusuk == null ? n : Math.min(dusuk, n));
    }
    const sifir = n === 0 && ["kategori", "cevap", "ban"].includes(o.faz);
    if (sifir && !sifirBas) sifirBas = { t: o.t, anahtar, bant: o.bant };
    if (!sifir && sifirBas) {
      const ms = o.t - sifirBas.t;
      if (ms > 3000) sonuc.sifirdaKalma.push({ s: ((sifirBas.t - BAS) / 1000).toFixed(1), ms, anahtar: sifirBas.anahtar, bant: sifirBas.bant });
      if (!sifirBas.bant) sonuc.enUzunSifirMs = Math.max(sonuc.enUzunSifirMs, ms);
      sifirBas = null;
    }
  }
  return sonuc;
}

// ================================================================ hazırlık (canlıya yazmadan önce)
if (!fs.existsSync(OTURUM)) { console.log("DUR: oturum dosyası yok:", OTURUM, "— yeni hesap AÇILMAZ."); process.exit(1); }
const oturumVeri = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kokenler = (oturumVeri.origins ?? []).map((o) => {
  const jeton = o.localStorage?.find((x) => x.name.includes("auth-token"));
  let uid = null;
  try { uid = JSON.parse(jeton.value).user?.id ?? null; } catch { /* çözülemedi */ }
  return { origin: o.origin, uid, kayitlar: o.localStorage ?? [] };
}).filter((k) => k.uid);
const adlar = await db(`select id, takma_ad from profiles where id in (${kokenler.map((k) => alintila(k.uid)).join(",")})`);
for (const k of kokenler) k.ad = adlar.find((a) => a.id === k.uid)?.takma_ad ?? null;
const hesapA = kokenler.find((k) => k.ad === AD_A);
const hesapB = kokenler.find((k) => k.ad === AD_B);
if (!hesapA || !hesapB) { console.log(`DUR: oturum dosyasında ${AD_A} / ${AD_B} yok (bulunan: ${kokenler.map((k) => k.ad).join(", ")}). Yeni hesap AÇILMADI.`); process.exit(1); }

fs.mkdirSync(CIKTI, { recursive: true });
const rapor = { adres: ADRES, tarih: new Date().toISOString(), hesaplar: { A: AD_A, B: AD_B }, ayar: { anahtar: AYAR }, goruntuler: [], yakalanamayan: [], kirilanlar: [], notlar: [] };
const say = { toplam: 0, supabase: 0, sesEngel: 0, ws: 0, hataDurum: {}, yollar: {}, hatalar: [], agHatasi: [] };
const konsol = { A: [], B: [] };
let durduran = null;
let ardisik5xx = 0;
const dur = (m) => { if (!durduran) { durduran = m; console.log(`\n!!! DUR KURALI (+${sn()} sn): ${m}`); } };
const kirildi = (m) => { rapor.kirilanlar.push(m); console.log("  ✗ KIRILAN:", m); };
const notEkle = (m) => { rapor.notlar.push(m); console.log("  ·", m); };

const tarayici = await chromium.launch({ channel: "chrome", headless: true });   // tek tarayıcı, iki bağlam
async function baglamAc(ad, hesap) {
  const b = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "tr-TR", timezoneId: "Europe/Istanbul" });
  await b.addInitScript(SAYFA_HAZIRLIK, { tanitimAnahtari: duelloTanitimAnahtari(), kayitlar: hesap.kayitlar, koken: KOKEN });
  await b.route(SES, (r) => { say.sesEngel++; return r.abort(); });
  b.on("request", (r) => {
    say.toplam++;
    let u;
    try { u = new URL(r.url()); } catch { return; }
    if (!u.hostname.endsWith("supabase.co")) return;
    say.supabase++;
    if (r.resourceType() === "websocket") say.ws++;
    const yol = u.pathname.replace(new RegExp(UUID.source, "g"), ":id");
    say.yollar[yol] = (say.yollar[yol] ?? 0) + 1;
  });
  b.on("requestfailed", (r) => {
    if (SES.test(r.url())) return;
    const h = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED/.test(h)) return;   // gezinme sırasında iptal edilen istek
    say.agHatasi.push(`${ad} +${sn()}s ${h} ${r.url().replace(/\?.*$/, "").slice(0, 110)}`);
  });
  b.on("response", async (r) => {
    const d = r.status();
    if (d >= 500) { ardisik5xx++; if (ardisik5xx >= 3) dur(`arka arkaya ${ardisik5xx} adet 5xx (son: ${d} ${r.url().slice(0, 100)})`); }
    else ardisik5xx = 0;
    if (d === 402 || d === 429) dur(`${d} yanıtı: ${r.url().slice(0, 120)}`);
    if (d < 400) return;
    let u;
    try { u = new URL(r.url()); } catch { return; }
    let govde = "";
    try { govde = (await r.text()).slice(0, 300); } catch { /* gövde okunamadı */ }
    if (/quota|restricted|grace/i.test(govde)) dur(`yanıt gövdesinde kota işareti (${d}): ${govde.slice(0, 120)}`);
    say.hataDurum[d] = (say.hataDurum[d] ?? 0) + 1;
    say.hatalar.push(`${ad} +${sn()}s ${d} ${u.hostname.endsWith("supabase.co") ? u.pathname.replace(new RegExp(UUID.source, "g"), ":id") : u.href.slice(0, 100)} ${govde.replace(/\s+/g, " ").slice(0, 140)}`);
  });
  const s = await b.newPage();
  s.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    const yer = m.location()?.url ?? "";
    if (SES.test(yer) || SES.test(m.text())) return;   // betiğin engellediği ses dosyası
    konsol[ad].push({ t: sn(), tur: m.type(), m: m.text().replace(/\s+/g, " ").slice(0, 200) });
  });
  s.on("pageerror", (e) => konsol[ad].push({ t: sn(), tur: "pageerror", m: String(e).split("\n")[0].slice(0, 200) }));
  return { ad, b, s, hesap };
}

/** Görüntü: JPEG; 250 KB'ı aşarsa kalite düşürülerek yeniden kodlanır (an kaçmasın diye önce çekilir). */
let yardimci = null;
async function kucult(tampon) {
  if (tampon.length <= BOYUT_SINIRI) return tampon;
  for (const [kalite, olcek] of [[0.5, 1], [0.38, 1], [0.5, 0.75], [0.36, 0.75]]) {
    const b64 = await yardimci.evaluate(async ({ veri, kalite, olcek }) => {
      const img = await createImageBitmap(await (await fetch("data:image/jpeg;base64," + veri)).blob());
      const c = new OffscreenCanvas(Math.round(img.width * olcek), Math.round(img.height * olcek));
      const y = c.getContext("2d"); y.imageSmoothingQuality = "high"; y.drawImage(img, 0, 0, c.width, c.height);
      const blob = await c.convertToBlob({ type: "image/jpeg", quality: kalite });
      return new Promise((coz) => { const r = new FileReader(); r.onload = () => coz(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
    }, { veri: tampon.toString("base64"), kalite, olcek });
    const yeni = Buffer.from(b64, "base64");
    if (yeni.length <= BOYUT_SINIRI) return yeni;
    tampon = yeni.length < tampon.length ? yeni : tampon;
  }
  return tampon;
}
const alinan = new Set();
const bekleyenYazma = [];
function yakala(o, anahtar, baslik, { oge = null, ek = null } = {}) {
  if (alinan.has(anahtar)) return Promise.resolve(false);
  alinan.add(anahtar);
  const hedef = oge ? o.s.locator(oge).first() : o.s;
  return hedef.screenshot({ type: "jpeg", quality: 62, timeout: 5000 }).then((tampon) => {
    const kayit = { dosya: `duello-${anahtar}.jpg`, baslik, oyuncu: o.ad, sn: sn(), ...(ek ?? {}) };
    rapor.goruntuler.push(kayit);
    bekleyenYazma.push(kucult(tampon).then((son) => { kayit.kb = Math.round(son.length / 1024); fs.writeFileSync(path.join(CIKTI, kayit.dosya), son); }));
    console.log(`  ✓ +${sn()}s ${kayit.dosya} — ${baslik} [${o.ad}]`);
    return true;
  }).catch((e) => { alinan.delete(anahtar); console.log(`  ! görüntü alınamadı (${anahtar}): ${String(e.message).split("\n")[0]}`); return false; });
}

const dokun = async (l, ms = 2000) => { try { await l.tap({ timeout: ms }); return true; } catch { return false; } };

async function girisKontrol(o) {
  await o.s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const ana = o.s.locator(".as-buyuk-dugme--oyna").first();
  const giris = o.s.getByRole("button", { name: /Misafir olarak dene|Try as guest/i }).first();
  const sonuc = await Promise.race([
    ana.waitFor({ state: "attached", timeout: 30000 }).then(() => "ana").catch(() => null),
    giris.waitFor({ state: "visible", timeout: 30000 }).then(() => "giris").catch(() => null),
  ]);
  if (sonuc !== "ana") throw new Error(`${o.ad} (${o.hesap.ad}): kayıtlı oturum canlıda açılmadı (${sonuc === "giris" ? "giriş ekranı" : "ana sayfa gelmedi"}). Yeni hesap AÇILMADI.`);
  const jeton = await o.s.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes("auth-token")); return k ? { ad: k, deger: localStorage.getItem(k) } : null; });
  const uid = (() => { try { return JSON.parse(jeton.deger).user?.id; } catch { return null; } })();
  if (uid !== o.hesap.uid) throw new Error(`${o.ad}: açılan oturum beklenen hesap değil (${uid})`);
  // Yenilenen jeton oturum dosyasına geri yazılır (eski yenileme jetonu artık geçersiz; diğer araçlar hesabı kaybetmesin).
  try {
    const guncel = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
    const kayit = guncel.origins?.find((x) => x.origin === o.hesap.origin)?.localStorage?.find((x) => x.name === jeton.ad);
    if (kayit && kayit.value !== jeton.deger) { kayit.value = jeton.deger; fs.writeFileSync(OTURUM, JSON.stringify(guncel, null, 2)); }
  } catch (e) { notEkle(`oturum dosyası güncellenemedi (${o.ad}): ${e.message}`); }
  console.log(`· ${o.ad} = ${o.hesap.ad} oturumu açık (+${sn()} sn)`);
}

async function pencereKapat(o) {
  for (let i = 0; i < 4; i++) {
    const d = o.s.getByRole("button", { name: /^(Atla|Anladım|Geç|Skip|Got it)$/ });
    if (!(await d.count())) return;
    await dokun(d.first(), 1500);
    await bekle(300);
  }
}

// ---- doğru şık: tur başına bir kez veritabanından OKUNUR
const dogruOnbellek = new Map();
function dogruSik(macId, tur) {
  if (!dogruOnbellek.has(tur)) {
    dogruOnbellek.set(tur, db(`select q.secenekler ->> q.dogru_cevap::int as dogru, d.saldiran, d.kategori, d.tur
        from duellolar d join questions q on q.id = d.soru_id where d.id = ${alintila(macId)}`)
      .then((r) => r[0] ?? null).catch((e) => { notEkle(`doğru şık okunamadı (tur ${tur}): ${e.message}`); return null; }));
  }
  return dogruOnbellek.get(tur);
}

const olay = { banGoruldu: 0, banYapildi: 0, banKullanilmadi: 0, saldiri: 0, cevap: 0, tonlar: {}, etiketler: {}, sonuclar: [], sureler: null };
let macId = null;
let macDur = false;

async function surucu(o) {
  const banlanan = new Set(), saldirilan = new Set(), cevaplanan = new Set(), sonucGorulen = new Set();
  let sonGorulen = Date.now();
  let bosBas = null;
  while (!macDur && !durduran && Date.now() - BAS < SURE_SINIRI_MS) {
    const d = await o.s.evaluate(DURUM).catch(() => null);
    if (!d) { await bekle(120); continue; }
    if (d.bosEkran) { bosBas ??= Date.now(); if (Date.now() - bosBas > 4000 && !o.bosBildirildi) { o.bosBildirildi = true; kirildi(`${o.ad}: 4 sn'den uzun BOŞ EKRAN (${d.yol})`); await yakala(o, `hata-bos-ekran-${o.ad}`, "boş ekran"); } }
    else bosBas = null;
    if (!MAC_YOLU.test(d.yol)) { notEkle(`${o.ad}: maç adresinden çıkıldı (${d.yol}) +${sn()}s`); break; }
    if (!d.tahta) { await bekle(120); continue; }
    sonGorulen = Date.now();
    o.sonDurum = d;
    if (d.sureler && !olay.sureler) olay.sureler = d.sureler;
    const turA = d.tur ?? 0;
    const banAni = d.banGiris || d.banAcik || d.banOnay || d.banBilgi || d.banSira;

    // ---- ban fazı
    if (d.banGiris) { olay.banGoruldu++; await yakala(o, "03-ban-sirasi-sende", `Ban: savunana "BAN SIRASI SENDE" damgası (tur ${d.tur})`); }
    else if (d.banSec && !d.banTamam) {
      await yakala(o, "04-ban-geri-sayim", `Ban: savunanın durum satırı + geri sayım (${d.banSayi} sn, tur ${d.tur})`, { ek: { sayac: d.banSayi } });
      if (!banlanan.has(turA)) {
        banlanan.add(turA);
        // Boş kategori banlanır: sahipli kartlar saldırana kalsın (kırmızı / gri çerçeve oluşabilsin).
        const kart = o.s.locator(d.kartBos ? "button.hk-kart.hk-kart--bos:not([disabled])" : "button.hk-kart:not([disabled])").first();
        if (await kart.count() && await dokun(kart, 1500)) olay.banYapildi++;
        else kirildi(`${o.ad} tur ${d.tur}: ban sırası bendeyken dokunulabilir kategori kartı yok`);
      }
    }
    if (d.banAcik) await yakala(o, "05-rakip-banladi", `Ban: saldırana "RAKİP BANLADI" açıklaması (tur ${d.tur})`);
    if (d.banBilgi && !o.banBilgiSayildi?.has(turA)) { (o.banBilgiSayildi ??= new Set()).add(turA); olay.banKullanilmadi++; }

    // ---- kategori fazı (saldıran)
    if (d.faz === "kategori" && !banAni && !d.savunanCubuk && d.kartAcik > 0 && d.calisan !== "kategori" && !saldirilan.has(turA)) {
      await yakala(o, "06-ban-sonrasi-saldiri", `Ban sonrası saldırı: saldıran kategori seçiyor (banlı kart: ${d.banliKart}, tur ${d.tur})`, { ek: { banliKart: d.banliKart } });
      if (!d.secili) {
        // Eksik çerçeve rengini üretecek kartı seç: rakibin kategorisi → savunanda kırmızı; kendi kategorim → savunanda gri.
        const tercih = [!olay.tonlar.tehlike && d.kartRakip ? "rakip" : null, !olay.tonlar.notr && d.kartBen ? "ben" : null, d.kartBos ? "bos" : null].find(Boolean);
        await dokun(o.s.locator(`button.hk-kart${tercih ? ".hk-kart--" + tercih : ""}:not([disabled]):not(.hk-kart--banli)`).first(), 1500);
        o.sonTercih = tercih ?? "herhangi";
      } else if (d.cubukDugme) {
        if (await dokun(o.s.locator(".hk-cubuk-dugme:not([disabled])").first(), 1500)) { saldirilan.add(turA); olay.saldiri++; console.log(`  · +${sn()}s tur ${d.tur}: ${o.ad} saldırdı (${o.sonTercih})`); }
      }
    }

    // ---- soru (cevap) fazı
    if (d.faz === "cevap" && d.sikAcik >= 2 && !d.kilitli && !d.sureBitti) {
      if (d.ton) {
        olay.tonlar[d.ton] = (olay.tonlar[d.ton] ?? 0) + (cevaplanan.has(turA) ? 0 : 1);
        if (d.etiket) olay.etiketler[d.etiket] = { ton: TON_RENK[d.ton] ?? d.ton, kelime: d.etiket.split(/\s+/).filter((k) => /\p{L}/u.test(k)).length };
        await yakala(o, `07-soru-cerceve-${TON_RENK[d.ton] ?? d.ton}`, `Soru ekranı: ${TON_RENK[d.ton] ?? d.ton} çerçeve, etiket "${d.etiket}" (tur ${d.tur})`, { ek: { ton: d.ton, etiket: d.etiket } });
      } else await yakala(o, "07-soru-cercevesiz", `Soru ekranı: durum çerçevesi YOK (tur ${d.tur})`);
      if (!cevaplanan.has(turA)) {
        cevaplanan.add(turA);
        const b = await dogruSik(macId, turA);
        const benSaldiran = b ? b.saldiran === o.hesap.uid : false;
        const siklar = o.s.locator(".qt-sik:not([disabled]):not(.qt-sik--elendi)");
        const metinler = await siklar.allInnerTexts().catch(() => []);
        const dogruNo = b?.dogru ? metinler.findIndex((m) => m.replace(/\s+/g, " ").includes(b.dogru)) : -1;
        // Saldıran doğru, savunan yanlış: hamle tutar, yuva dolar.
        let no = benSaldiran ? dogruNo : metinler.findIndex((_, i) => i !== dogruNo);
        if (no < 0) no = 0;
        if (await dokun(siklar.nth(no), 2000)) olay.cevap++;
        if (b && dogruNo < 0) notEkle(`tur ${turA} ${o.ad}: doğru şık ekranda bulunamadı ("${b.dogru}")`);
      }
    }

    // ---- tur sonucu
    if (d.sonuc && d.tur && !sonucGorulen.has(d.tur)) {
      sonucGorulen.add(d.tur);
      if (!olay.sonuclar.some((x) => x.tur === d.tur)) olay.sonuclar.push({ tur: d.tur, mesaj: d.mesaj, yuvalar: d.yuvalar.map((y) => y.say).join(" · "), sn: sn() });
      await yakala(o, "08-tur-sonucu", `Tur sonucu (tur ${d.tur}): "${d.mesaj}"`);
      if (sonucGorulen.size >= TUR_SINIRI) { o.turTamam = true; break; }
    }
    await bekle(60);
    if (Date.now() - sonGorulen > 30000) { kirildi(`${o.ad}: 30 sn boyunca maç tahtası görünmedi`); break; }
  }
}

// ================================================================ çalışma
let eskiDeger = null;
let ayarYazildi = false;
let geriAlindi = null;
async function geriAl(neden) {
  if (!ayarYazildi || geriAlindi === true) return;
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      await db(`update oyun_ayarlari set deger = ${alintila(String(eskiDeger))}::jsonb where anahtar = ${alintila(AYAR)}`);
      const okunan = await ayarOku();   // ayrı bağlantı, ayrı okuma
      rapor.ayar.geriAlinan = okunan;
      if (String(okunan) === String(eskiDeger)) { geriAlindi = true; console.log(`· AYAR GERİ ALINDI ve doğrulandı: ${AYAR} = ${okunan} (${neden}, +${sn()} sn)`); return; }
      console.log(`! geri alma doğrulanamadı (deneme ${deneme}): okunan ${okunan}, beklenen ${eskiDeger}`);
    } catch (e) { console.log(`! geri alma hatası (deneme ${deneme}): ${e.message}`); }
    await bekle(1500);
  }
  geriAlindi = false;
  console.log(`\n################################################################\n### AYAR GERİ ALINAMADI: ${AYAR} HÂLÂ 0 OLABİLİR — ESKİ DEĞER: ${eskiDeger} ###\n################################################################\n`);
}
for (const sinyal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sinyal, async () => { await geriAl(sinyal); process.exit(130); });

let A = null, B = null;
try {
  console.log(`Düello canlı ekran testi — ${ADRES} · A=${AD_A} · B=${AD_B} · ${TUR_SINIRI} tur · 390×844`);
  eskiDeger = await ayarOku();
  if (eskiDeger == null) throw new Error(`${AYAR} canlıda okunamadı`);
  rapor.ayar.onceki = eskiDeger;
  console.log(`· ${AYAR} mevcut canlı değer: ${eskiDeger}`);

  A = await baglamAc("A", hesapA);
  B = await baglamAc("B", hesapB);
  yardimci = await A.b.newPage();   // boş sayfa: görüntü küçültme
  await A.s.bringToFront();
  await girisKontrol(A);
  await girisKontrol(B);
  if (durduran) throw new Error(durduran);

  // ---- TEK canlı yazma: kilit geçici 0
  if (Number(eskiDeger) > 0) {
    ayarYazildi = true;
    await db(`update oyun_ayarlari set deger = '0'::jsonb where anahtar = ${alintila(AYAR)}`);
    const okunan = await ayarOku();
    rapor.ayar.test = okunan;
    if (String(okunan) !== "0") throw new Error(`ayar 0 yapılamadı (okunan ${okunan})`);
    console.log(`· ${AYAR} = 0 yazıldı ve doğrulandı (+${sn()} sn)`);
  } else rapor.ayar.test = eskiDeger;

  // ---- Düello girişi
  for (const o of [A, B]) {
    await o.s.goto(ADRES + "/duello", { waitUntil: "domcontentloaded" });
    await o.s.locator(".m2-giris").first().waitFor({ timeout: 30000 });
    await pencereKapat(o);
    try { await o.s.getByRole("button", { name: /Rakip ara|Find opponent/i }).first().waitFor({ timeout: 20000 }); }
    catch { const kilit = await o.s.locator(".m2-kilit").count(); await yakala(o, `hata-giris-${o.ad}`, "Düello girişi"); throw new Error(`${o.ad}: "Rakip ara" düğmesi gelmedi${kilit ? " — Düello hâlâ KİLİTLİ görünüyor" : ""}`); }
  }
  if (durduran) throw new Error(durduran);

  // ---- arama: A başlar → arama ekranı yakalanır → B başlar (gerçek eşleşme)
  const araDugme = (o) => o.s.getByRole("button", { name: /Rakip ara|Find opponent/i }).first();
  await dokun(araDugme(A), 3000);
  const baslik = A.s.locator("#ara-baslik").first();
  try {
    await baslik.waitFor({ state: "visible", timeout: 8000 });
    await A.s.locator("#ara-baslik.gh-baslik").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => notEkle("arama: Güneş Halkası sahnesi 5 sn'de yüklenmedi, yedek ekran çekildi"));
    await A.s.waitForFunction(() => /aranıyor|Searching|Looking/i.test(document.querySelector("#ara-baslik")?.textContent ?? ""), null, { timeout: 4000 }).catch(() => {});
    const renk = await A.s.evaluate(() => {
      const zemin = (e) => { for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage !== "none") return s.backgroundImage.slice(0, 160); if (!/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) return s.backgroundColor; } return null; };
      const h = document.querySelector("#ara-baslik");
      const kok = h.closest("[role=dialog]") ?? document.body;
      const diger = [...kok.querySelectorAll("*")].filter((e) => e !== h && e.children.length === 0 && (e.textContent ?? "").trim().length > 1 && e.getBoundingClientRect().height > 0)
        .slice(0, 14).map((e) => ({ metin: e.textContent.trim().slice(0, 40), sinif: String(e.className?.baseVal ?? e.className ?? "").slice(0, 50), renk: getComputedStyle(e).color, zemin: zemin(e) }));
      return { baslik: h.textContent.trim(), renk: getComputedStyle(h).color, zemin: zemin(h), kokSinif: String(kok.className).slice(0, 120), kokZemin: zemin(kok), diger };
    });
    rapor.arama = renk;
    console.log(`· arama başlığı "${renk.baslik}": yazı ${renk.renk} · zemin ${String(renk.zemin).slice(0, 90)}`);
    await yakala(A, "01-arama", `Arama ekranı: "${renk.baslik}" (yazı ${renk.renk})`);
  } catch (e) { rapor.yakalanamayan.push(`arama ekranı: ${String(e.message).split("\n")[0]}`); }
  await dokun(araDugme(B), 3000);
  // "Rakip bulundu!" anı (VS)
  const bulundu = (o) => o.s.waitForFunction(() => /bulundu|found/i.test(document.querySelector("#ara-baslik")?.textContent ?? ""), null, { timeout: 30000 }).then(() => o).catch(() => null);
  const ilk = await Promise.race([bulundu(A), bulundu(B)]);
  if (ilk) { await bekle(0); await yakala(ilk, "02-eslesme", "Eşleşme: \"Rakip bulundu!\" (VS anı)"); }
  else rapor.yakalanamayan.push("eşleşme (\"Rakip bulundu!\") anı: 30 sn'de görülmedi");
  const macMi = (o) => MAC_YOLU.test(o.s.url());
  for (let i = 0; i < 90 && !(macMi(A) && macMi(B)) && !durduran; i++) await bekle(500);
  if (durduran) throw new Error(durduran);
  if (!(macMi(A) && macMi(B))) { await yakala(A, "hata-eslesme-A", "eşleşme olmadı (A)"); await yakala(B, "hata-eslesme-B", "eşleşme olmadı (B)"); throw new Error("iki sayfa 45 sn'de maça giremedi"); }
  const idA = A.s.url().match(MAC_YOLU)[1];
  const idB = B.s.url().match(MAC_YOLU)[1];
  if (idA !== idB) throw new Error(`iki hesap farklı düelloya düştü (${idA.slice(0, 8)} / ${idB.slice(0, 8)}) — bot eşleşmesi, test geçersiz`);
  macId = idA; rapor.macId = macId;
  console.log(`· düello ${macId} — gerçek eşleşme (+${sn()} sn)`);

  // ---- maç: iki sayfa aynı anda izlenir (tek tarayıcı), ilk TUR_SINIRI tur
  await Promise.all([surucu(A), surucu(B)].map((p) => p.then(() => { if (A.turTamam || B.turTamam) macDur = true; })));
  macDur = true;
  if (durduran) throw new Error(durduran);

  // ---- 5 yuva paneli + yuva tutarlılığı
  for (const o of [A, B]) await o.s.locator(".hk-mesaj--sonuc").first().waitFor({ state: "visible", timeout: 2500 }).catch(() => {});
  const sonA = await A.s.evaluate(DURUM).catch(() => null);
  const sonB = await B.s.evaluate(DURUM).catch(() => null);
  rapor.yuvaEkran = { A: sonA?.yuvalar ?? null, B: sonB?.yuvalar ?? null };
  if (sonA?.tahta) await yakala(A, "09-yuva-paneli", `5 yuva paneli, ${olay.sonuclar.length} tur sonra: ${sonA.yuvalar.map((y) => y.say).join(" · ")}`, { oge: ".hk-tahta" });
  else if (sonB?.tahta) await yakala(B, "09-yuva-paneli", `5 yuva paneli, ${olay.sonuclar.length} tur sonra: ${sonB.yuvalar.map((y) => y.say).join(" · ")}`, { oge: ".hk-tahta" });
  else rapor.yakalanamayan.push("5 yuva paneli: maç sonunda tahta ekranda değildi");
  const satir = (await db(`select durum, tur, faz, yuva1, yuva2, oyuncu1, sahiplik, kilitler from duellolar where id = ${alintila(macId)}`))[0];
  rapor.macOncesiCikis = satir;

  // ---- maçtan çık (A, arayüzden): "Düellodan çık" → onay
  for (const o of [A, B]) {
    if (!MAC_YOLU.test(o.s.url()) || !(await o.s.locator(".hk-mac").count())) continue;
    const cik = o.s.getByRole("button", { name: /Düellodan çık|Leave the duel|Leave duel/i }).first();
    if (!(await cik.count()) || !(await dokun(cik, 3000))) { notEkle(`${o.ad}: "Düellodan çık" düğmesi bulunamadı`); continue; }
    const pencere = o.s.getByRole("dialog");
    await pencere.first().waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
    const onay = pencere.getByRole("button", { name: /^(Çık|Leave|Exit)$/ }).first();
    if (await onay.count() && await dokun(onay, 3000)) { console.log(`· ${o.ad} düellodan çıktı (+${sn()} sn)`); rapor.cikan = o.ad; break; }
    notEkle(`${o.ad}: çıkış onayında "Çık" düğmesi bulunamadı`);
  }
  // Maçın kapandığı salt okuma ile beklenir (en çok 20 sn).
  for (let i = 0; i < 10; i++) {
    await bekle(2000);
    const [s2] = await db(`select durum, tur, faz, yuva1, yuva2, terk_eden, kazanan from duellolar where id = ${alintila(macId)}`);
    rapor.macSon = s2;
    if (s2?.durum !== "aktif") break;
  }
  if (rapor.macSon?.durum === "aktif") kirildi(`çıkıştan 20 sn sonra düello hâlâ "aktif" (${macId}) — elle kapatılmadı (canlı yazma yasağı)`);
} catch (e) {
  rapor.hata = String(e?.message ?? e).split("\n")[0];
  console.log("\nHATA:", rapor.hata);
} finally {
  await geriAl(durduran ? "dur kuralı" : rapor.hata ? "hata sonrası" : "test bitti");
  await Promise.allSettled(bekleyenYazma);

  // ---- ölçüm ve kabul
  const kA = A ? await A.s.evaluate(() => window.__kayit).catch(() => []) : [];
  const kB = B ? await B.s.evaluate(() => window.__kayit).catch(() => []) : [];
  rapor.A = analiz(kA ?? []); rapor.B = analiz(kB ?? []);
  rapor.olay = olay; rapor.istek = { ...say, dbSorgu: dbSorguSayisi }; rapor.konsol = konsol; rapor.durduran = durduran; rapor.sureSn = Number(sn());
  rapor.ayar.geriAlindi = geriAlindi;

  // Süre sapması: fazın başlangıç sayacı sunucunun bildirdiği süreden (± ilk tur / ilk maç ekleri) 2 sn'den fazla saparsa
  const s = olay.sureler ?? {};
  for (const [ad, r] of [["A", rapor.A], ["B", rapor.B]]) {
    for (const [anahtar, deger] of Object.entries(r.ilkSayac)) {
      const faz = anahtar.split("-")[1];
      const beklenen = Number(s[faz]);
      if (Number.isFinite(beklenen) && beklenen > 0 && deger > beklenen + 5.5) kirildi(`süre sapması ${ad} ${anahtar}: sayaç ${deger} sn'den başladı, sunucu süresi ${beklenen} sn`);
    }
    for (const x of r.yenidenBaslama) kirildi(`${ad}: aynı fazda sayaç yeniden yükseldi (${x.anahtar}: ${x.dusuk}→${x.n}, +${x.s}s)`);
    for (const x of r.sifirdaKalma) kirildi(`${ad}: sayaç 0'da ${(x.ms / 1000).toFixed(1)} sn kaldı (${x.anahtar}${x.bant ? ", bant: " + x.bant : ""})`);
  }
  // Yuva tutarlılığı: ekrandaki sayılar veritabanıyla ve iki ekran birbiriyle aynı mı
  const dbSatir = rapor.macOncesiCikis;
  if (dbSatir && rapor.yuvaEkran?.A?.length === 2 && rapor.yuvaEkran?.B?.length === 2) {
    const sayi = (y) => Number((y.say.match(/(\d+)\s*\/\s*\d+/) ?? [])[1]);
    const esik = (y) => Number((y.say.match(/\d+\s*\/\s*(\d+)/) ?? [])[1]);
    const benA = rapor.yuvaEkran.A.find((y) => y.taraf === "ben") ?? rapor.yuvaEkran.A[0];
    const rakipA = rapor.yuvaEkran.A.find((y) => y !== benA);
    const benB = rapor.yuvaEkran.B.find((y) => y.taraf === "ben") ?? rapor.yuvaEkran.B[0];
    const rakipB = rapor.yuvaEkran.B.find((y) => y !== benB);
    const aDb = dbSatir.oyuncu1 === hesapA.uid ? Number(dbSatir.yuva1) : Number(dbSatir.yuva2);
    const bDb = dbSatir.oyuncu1 === hesapA.uid ? Number(dbSatir.yuva2) : Number(dbSatir.yuva1);
    rapor.yuvaKarsilastirma = { db: { A: aDb, B: bDb }, ekranA: { ben: sayi(benA), rakip: sayi(rakipA) }, ekranB: { ben: sayi(benB), rakip: sayi(rakipB) }, yuvaSayisi: [...rapor.yuvaEkran.A, ...rapor.yuvaEkran.B].map((y) => y.yuva), esik: esik(benA) };
    if (sayi(benA) !== aDb || sayi(rakipA) !== bDb) kirildi(`yanlış yuva (A ekranı): ekranda ${sayi(benA)}-${sayi(rakipA)}, veritabanında ${aDb}-${bDb}`);
    if (sayi(benB) !== bDb || sayi(rakipB) !== aDb) kirildi(`yanlış yuva (B ekranı): ekranda ${sayi(benB)}-${sayi(rakipB)}, veritabanında ${bDb}-${aDb}`);
    for (const y of [...rapor.yuvaEkran.A, ...rapor.yuvaEkran.B]) {
      if (y.yuva !== 5) kirildi(`yuva paneli: bir tarafta ${y.yuva} yuva çizili (5 bekleniyor)`);
      if (y.dolu !== sayi(y)) kirildi(`yuva paneli: dolu yuva sayısı (${y.dolu}) yazan sayıyla (${y.say}) uyuşmuyor`);
    }
  }
  for (const [e, v] of Object.entries(olay.etiketler)) if (v.kelime > 4) kirildi(`soru etiketi 4 kelimeyi aşıyor: "${e}" (${v.kelime} kelime)`);

  const beklenen = { "01-arama": "arama ekranı", "03-ban-sirasi-sende": "\"BAN SIRASI SENDE\" damgası", "04-ban-geri-sayim": "ban geri sayımı", "05-rakip-banladi": "\"RAKİP BANLADI\" anı",
    "07-soru-cerceve-kirmizi": "soru çerçevesi kırmızı", "07-soru-cerceve-mavi": "soru çerçevesi mavi", "07-soru-cerceve-gri": "soru çerçevesi gri", "08-tur-sonucu": "tur sonucu", "09-yuva-paneli": "5 yuva paneli" };
  for (const [a, m] of Object.entries(beklenen)) if (!alinan.has(a)) rapor.yakalanamayan.push(m);

  const kosullar = [
    ["gerçek eşleşme (iki hesap aynı düelloda)", Boolean(macId)],
    ["ban fazı görüldü ve ban yapıldı", olay.banGoruldu > 0 && olay.banYapildi > 0],
    ["ban sonrası saldırı yapıldı", olay.saldiri > 0],
    [`ilk ${TUR_SINIRI} turun sonucu görüldü`, olay.sonuclar.length >= TUR_SINIRI],
    ["5 yuva paneli: iki tarafta 5'er yuva", (rapor.yuvaKarsilastirma?.yuvaSayisi ?? []).length === 4 && rapor.yuvaKarsilastirma.yuvaSayisi.every((n) => n === 5)],
    ["kırılan bir şey yok (takılma / boş ekran / yanlış yuva / süre sapması)", rapor.kirilanlar.length === 0],
    ["sayfa hatası (pageerror) yok", ![...konsol.A, ...konsol.B].some((k) => k.tur === "pageerror")],
    ["dur kuralı tetiklenmedi", !durduran],
    ["ayar eski değerine döndü", geriAlindi === true || !ayarYazildi],
  ];
  rapor.kosullar = kosullar.map(([ad, gecti]) => ({ ad, gecti }));
  rapor.gecti = !rapor.hata && kosullar.every(([, g]) => g);

  console.log(`\n=== SONUÇ ===`);
  console.log(`ayar ${AYAR}: önceki ${rapor.ayar.onceki} → test ${rapor.ayar.test ?? "yazılmadı"} → geri alınan ${rapor.ayar.geriAlinan ?? (ayarYazildi ? "DOĞRULANAMADI" : rapor.ayar.onceki)}`);
  console.log(`maç: ${macId ?? "yok"} · tur sonuçları ${olay.sonuclar.length}/${TUR_SINIRI} · ban görüldü ${olay.banGoruldu} / yapıldı ${olay.banYapildi} / kullanılmadı ${olay.banKullanilmadi} · saldırı ${olay.saldiri} · cevap ${olay.cevap} · son durum ${rapor.macSon?.durum ?? "?"}${rapor.macSon?.terk_eden ? " (terk)" : ""}`);
  for (const x of olay.sonuclar) console.log(`   tur ${x.tur} (+${x.sn}s): "${x.mesaj}" — ${x.yuvalar}`);
  console.log(`çerçeve/etiket: ${Object.entries(olay.etiketler).map(([e, v]) => `${v.ton} "${e}" (${v.kelime} kelime)`).join(" · ") || "yok"}`);
  console.log(`süreler (sunucu): ${JSON.stringify(olay.sureler)} · başlangıç sayaçları A ${JSON.stringify(rapor.A.ilkSayac)} · B ${JSON.stringify(rapor.B.ilkSayac)}`);
  console.log(`yuva: ${JSON.stringify(rapor.yuvaKarsilastirma ?? null)}`);
  console.log(`istek: toplam ${say.toplam} (Supabase ${say.supabase}, bunun ${say.ws} adedi Realtime bağlantısı) · engellenen ses ${say.sesEngel} · test betiğinin DB sorgusu ${dbSorguSayisi} · süre ${sn()} sn`);
  console.log(`hata yanıtı: ${Object.entries(say.hataDurum).map(([a, b]) => `${a}×${b}`).join(", ") || "yok"} · ağ hatası ${say.agHatasi.length}`);
  for (const h of say.hatalar.slice(0, 12)) console.log("   ", h);
  for (const h of say.agHatasi.slice(0, 8)) console.log("    ağ:", h);
  for (const ad of ["A", "B"]) {
    const hata = konsol[ad].filter((k) => k.tur !== "warning");
    console.log(`konsol ${ad}: hata ${hata.length} · uyarı ${konsol[ad].length - hata.length}`);
    for (const k of konsol[ad].slice(0, 10)) console.log(`    [${k.tur} +${k.t}s] ${k.m}`);
  }
  console.log(`görüntü: ${rapor.goruntuler.map((g) => `${g.dosya} ${g.kb} KB`).join(" · ") || "yok"}`);
  console.log(`yakalanamayan: ${rapor.yakalanamayan.join(" · ") || "yok"}`);
  console.log(`kırılanlar: ${rapor.kirilanlar.length ? "" : "yok"}`);
  for (const k of rapor.kirilanlar) console.log("   ✗", k);
  for (const [ad, g] of kosullar) console.log(`  ${g ? "✓" : "✗"} ${ad}`);
  console.log(rapor.gecti ? "KABUL: GEÇTİ" : "KABUL: GEÇMEDİ");
  if (geriAlindi === false) console.log("### AYAR GERİ ALINAMADI — ELLE DÜZELT ###");
  try { fs.writeFileSync(path.join(CIKTI, "duello-olcum.json"), JSON.stringify(rapor, null, 1)); } catch (e) { console.log("ölçüm yazılamadı:", e.message); }
  await tarayici.close().catch(() => {});
  process.exit(rapor.gecti ? 0 : geriAlindi === false ? 3 : 2);
}
