// ============================================================
// EKRAN TURU — canlı sitenin mobil ekran belgelemesi + otomatik denetim (2 Ekim 2026)
//
// Ne yapar: canlı siteyi telefon boyutunda gezer, her ekranın görüntüsünü alır ve ÖLÇER:
//   · yatay taşma (taşıran öğe)
//   · "…" ile kesilen metin (text-overflow / satır sınırı; hangi öğe)
//   · 44 px altı dokunma hedefi (çevresindeki görünmez dokunma payı hesaba katılır)
//   · metin / zemin kontrastı < 4,5:1 (ekran görüntüsünün PİKSELLERİNDEN örneklenir)
//   · konsol hatası
//   · ilk ekranda görünmeyen birincil düğme / maç ekranında ekran dışında kalan öğe
// Çıktı: docs/ekran-turu/*.jpg|png + olcum.json + RAPOR.md
//
// YALNIZ GEZER: satın alma, ödül alma, arkadaşlık isteği, ayar değişikliği YOK. Yeni hesap AÇMAZ —
// oturum `.arayuz-denetim-oturum.json` (araclar/arayuz-denetim.mjs yazar); oturum geçersizse durur.
// Veritabanına bağlanmaz. Oyun içi: en çok BİR Antrenman Düello'su (ilk turlardan sonra çıkılır) ve
// BİR Antrenman Klasik maçı (2 sorudan sonra çıkılır) — ikisi de açık bota karşı, serbest.
//
// Supabase'e hafif: tek tarayıcı, sıralı; kabuk bir kez yüklenir, ekranlar uygulama içi geçişle açılır
// (her ekran tek yükleme), ses dosyaları indirilmez. İngilizce için profil yanıtı YALNIZ tarayıcıda
// "en" gösterilir (veritabanına yazılmaz). Canlı site 403 dönerse durur.
//
// Kullanım:
//   node araclar/ekran-turu.mjs [--adres=https://quiztactics.vercel.app] [--oturum=dosya]
//        [--bolum=statik,dar,duello,klasik,en] [--ekle] [--rapor] [--cikti=docs/ekran-turu]
//   --ekle  : olcum.json'daki başka bölümlerin kayıtları korunur (tek bölüm yeniden çekilirken)
//   --rapor : tarayıcı açmaz, olcum.json'dan RAPOR.md'yi yeniden yazar
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "https://quiztactics.vercel.app").replace(/\/$/, "");
const KOKEN = new URL(ADRES).origin;
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum.json");
const CIKTI = path.resolve(typeof ARG.cikti === "string" ? ARG.cikti : "docs/ekran-turu");
const BOLUMLER = String(ARG.bolum || "statik,dar,duello,klasik,en").split(",");
const VERI_DOSYASI = path.join(CIKTI, "olcum.json");
const DPR = 2;
const HEDEF_BAYT = 100 * 1024;   // görüntü başına hedef (toplam ≲ 5 MB)
const SERT_BAYT = 250 * 1024;    // görüntü başına üst sınır
const SURE_SINIRI_MS = 10 * 60 * 1000;
const SES = /\.(mp3|ogg|oga|wav|m4a|aac|opus|flac)(\?.*)?$/i;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const BOLUM_NO = { statik: 1, dar: 20, duello: 30, klasik: 60, en: 70 };

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
// Yarışan beklemelerden kaybedenin zaman aşımı betiği düşürmesin.
process.on("unhandledRejection", (e) => console.log("  (yakalanmamış bekleme hatası yok sayıldı: " + String(e?.message ?? e).split("\n")[0].slice(0, 120) + ")"));
const ilkSatir = (e) => String(e?.message ?? e).split("\n")[0].slice(0, 200);

// ================================================================ sayfa içi ölçüm
/** Açık ekranı ölçer (tarayıcıda çalışır). Açık pencere varsa yalnız pencerenin içi ölçülür. */
const OLCUM = ({ gorunmeli }) => {
  const de = document.documentElement;
  const W = de.clientWidth;
  const H = window.innerHeight;
  const kisa = (s, n = 48) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const sinifAdi = (e) => (typeof e.className === "string" ? e.className : e.className?.baseVal ?? "").trim();
  const ad = (e) => e.tagName.toLowerCase() + (sinifAdi(e) ? "." + sinifAdi(e).split(/\s+/).slice(0, 2).join(".") : "");
  const gorunur = (e) => {
    try { if (!e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; } catch { /* eski tarayıcı */ }
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const icinde = (ust, e) => Boolean(ust) && (ust === e || e.contains(ust));
  const pencereler = [...document.querySelectorAll("[aria-modal=true], dialog[open]")].filter(gorunur);
  const kapsam = pencereler.length ? pencereler[pencereler.length - 1] : document.body;

  // 1) Yatay taşma
  const tasma = Math.max(0, de.scrollWidth - de.clientWidth);
  const tasiran = [];
  if (tasma > 1) {
    for (const e of document.querySelectorAll("body *")) {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.right > W + 1 && gorunur(e) && ![...e.children].some((c) => c.getBoundingClientRect().right > W + 1)) {
        tasiran.push(`${ad(e)} (sağ kenar ${Math.round(r.right)} px)`);
        if (tasiran.length >= 5) break;
      }
    }
  }

  // 2) "…" ile kesilen metin
  const kesik = [];
  for (const e of kapsam.querySelectorAll("*")) {
    if (!e.firstChild || !gorunur(e)) continue;
    const s = getComputedStyle(e);
    const tek = s.textOverflow === "ellipsis" && s.overflowX !== "visible" && e.scrollWidth > e.clientWidth + 1;
    const cok = s.webkitLineClamp && s.webkitLineClamp !== "none" && s.overflowY !== "visible" && e.scrollHeight > e.clientHeight + 2;
    if (!tek && !cok) continue;
    const r = e.getBoundingClientRect();
    kesik.push({ oge: ad(e), metin: kisa(e.textContent, 70), tur: tek ? "tek satır" : "satır sınırı",
      gorunenPx: Math.round(e.clientWidth), gerekenPx: Math.round(e.scrollWidth), ilkEkran: r.top < H && r.bottom > 0 });
    if (kesik.length >= 30) break;
  }

  // 3) Dokunma hedefleri < 44 px (öğenin çevresinde ona giden görünmez dokunma payı varsa küçük sayılmaz)
  const DOKUNULUR = "button, a[href], [role=button], [role=tab], [role=radio], [role=switch], [role=option], [role=checkbox], input:not([type=hidden]), select, textarea, summary";
  const kucuk = [];
  for (const e of kapsam.querySelectorAll(DOKUNULUR)) {
    if (e.disabled || e.getAttribute("aria-disabled") === "true" || !gorunur(e)) continue;
    const s = getComputedStyle(e);
    if (s.pointerEvents === "none") continue;
    const r = e.getBoundingClientRect();
    if (r.width >= 43.5 && r.height >= 43.5) continue;
    const ilkEkran = r.top >= 0 && r.bottom <= H && r.left >= 0 && r.right <= W;
    if (ilkEkran) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (!icinde(document.elementFromPoint(cx, cy), e)) continue;   // üstü örtülü: şu an dokunulamıyor
      const pay = [[-21, 0], [21, 0], [0, -21], [0, 21]].every(([dx, dy]) => icinde(document.elementFromPoint(cx + dx, cy + dy), e));
      if (pay) continue;
    }
    kucuk.push({ oge: ad(e), metin: kisa(e.getAttribute("aria-label") || e.innerText || e.value || e.title, 30),
      w: Math.round(r.width), h: Math.round(r.height), satirIci: s.display === "inline", ilkEkran });
    if (kucuk.length >= 60) break;
  }

  // 4) Kontrast için metin kutuları (ilk ekrandaki, üstü örtülmemiş metin düğümleri)
  const metinler = [];
  const yuruyucu = document.createTreeWalker(kapsam, NodeFilter.SHOW_TEXT);
  for (let n = yuruyucu.nextNode(); n && metinler.length < 240; n = yuruyucu.nextNode()) {
    if (!/[\p{L}\p{N}]/u.test(n.nodeValue)) continue;
    const e = n.parentElement;
    if (!e || !gorunur(e) || e.closest(".qt-gizli, .sr-only, .visually-hidden")) continue;   // yalnız ekran okuyucuya yazılan metin
    const aralik = document.createRange();
    aralik.selectNodeContents(n);
    const r = aralik.getClientRects()[0];
    if (!r || r.width < 6 || r.height < 6 || r.top < 0 || r.bottom > H || r.left < 0 || r.right > W) continue;
    const ust = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!ust || !(ust === e || e.contains(ust) || ust.contains(e))) continue;
    const s = getComputedStyle(e);
    const px = parseFloat(s.fontSize);
    const kalin = Number(s.fontWeight) >= 700;
    metinler.push({ oge: ad(e), metin: kisa(n.nodeValue, 34), x: r.left, y: r.top, w: r.width, h: r.height, px: Math.round(px * 10) / 10,
      buyuk: px >= 24 || (px >= 18.66 && kalin), devreDisi: Boolean(e.closest("[disabled], [aria-disabled=true]")) });
  }

  // 5) Birincil düğmeler: ilk ekranda mı?
  const BIRINCIL = ".qt-dugme--birincil, .as-buyuk-dugme, .play-button, .hk-cubuk-dugme";
  const birincil = [...kapsam.querySelectorAll(BIRINCIL)].filter(gorunur).map((e) => {
    const r = e.getBoundingClientRect();
    const icte = r.top >= 0 && r.bottom <= H + 1 && r.left >= 0 && r.right <= W + 1;
    const ortulu = icte && !icinde(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), e);
    return { oge: ad(e), metin: kisa(e.getAttribute("aria-label") || e.innerText, 30), ust: Math.round(r.top), alt: Math.round(r.bottom), ilkEkran: icte && !ortulu, ortulu,
      devreDisi: Boolean(e.disabled || e.getAttribute("aria-disabled") === "true") };
  }).filter((b) => !b.devreDisi).slice(0, 12);

  // 6) Bu ekranda ilk ekranda OLMASI GEREKEN öğeler (maç ekranları: şıklar, joker çubuğu, alt çubuk)
  const zorunlu = (gorunmeli ?? []).map((secici) => {
    const liste = [...document.querySelectorAll(secici)].filter(gorunur);
    const disarida = liste.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.top < -1 || r.bottom > H + 1 || r.left < -1 || r.right > W + 1;
    });
    return { secici, sayi: liste.length, disarida: disarida.length, enAlt: liste.length ? Math.round(Math.max(...liste.map((e) => e.getBoundingClientRect().bottom))) : null };
  });

  return {
    genislik: W, gorusGenisligi: window.innerWidth, yukseklik: H, sayfaYuksekligi: de.scrollHeight, tasma, tasiran, kesik, kucuk, metinler, birincil, zorunlu,
    pencere: pencereler.length ? kisa(kapsam.querySelector("h1, h2, h3")?.textContent || kapsam.getAttribute("aria-label"), 50) || "(adsız pencere)" : null,
    baslik: kisa(document.querySelector("main h1, h1, main h2")?.textContent, 50),
  };
};

/** Görüntüyü işler (boş yardımcı sayfada çalışır): metin kutularından kontrast + JPEG'e sıkıştırma. */
const GORUNTU_ISLE = async ({ b64, genislik, metinler, hedef, sert }) => {
  const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
  const c = new OffscreenCanvas(img.width, img.height);
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const dpr = img.width / genislik;   // görüntü pikseli / CSS pikseli
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r, g, b) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  const oran = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const onalti = (r) => "#" + r.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const kontrast = metinler.map((m) => {
    // Kutunun 1 piksel içinden örnekle: kenar satırı komşu zeminden (satır kutusunun dışı) renk taşımasın.
    const px = Math.max(0, Math.ceil(m.x * dpr) + 1), py = Math.max(0, Math.ceil(m.y * dpr) + 1);
    const pw = Math.min(img.width - px, Math.floor(Math.min(m.w, 240) * dpr) - 2), ph = Math.min(img.height - py, Math.floor(m.h * dpr) - 2);
    if (pw < 4 || ph < 4) return null;
    const d = x.getImageData(px, py, pw, ph).data;
    const n = d.length / 4;
    // Zemin = kutuda en sık görülen renk kovası (5 bit/kanal)
    const kova = new Map();
    for (let i = 0; i < d.length; i += 4) {
      const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
      let o = kova.get(k);
      if (!o) { o = [0, 0, 0, 0]; kova.set(k, o); }
      o[0]++; o[1] += d[i]; o[2] += d[i + 1]; o[3] += d[i + 2];
    }
    let en = null;
    for (const o of kova.values()) if (!en || o[0] > en[0]) en = o;
    const zemin = [en[1] / en[0], en[2] / en[0], en[3] / en[0]];
    const lz = lum(...zemin);
    // Metin rengi = zemine en çok karşıt düşen piksellerin (%4) ortalaması — saydamlık ve kenar yumuşatma dahil gerçek görünen renk
    const o = new Float32Array(n);
    for (let j = 0; j < n; j++) o[j] = oran(lum(d[j * 4], d[j * 4 + 1], d[j * 4 + 2]), lz);
    const sira = Array.from(o.keys()).sort((a, b) => o[b] - o[a]).slice(0, Math.max(4, Math.round(n * 0.04)));
    const t = [0, 0, 0];
    for (const j of sira) { t[0] += d[j * 4]; t[1] += d[j * 4 + 1]; t[2] += d[j * 4 + 2]; }
    const metin = t.map((v) => v / sira.length);
    return { oran: Math.round(oran(lum(...metin), lz) * 100) / 100, metinRengi: onalti(metin), zeminRengi: onalti(zemin), zeminPayi: Math.round((en[0] / n) * 100) / 100 };
  });
  // Sıkıştırma: PNG küçükse aynen; değilse JPEG kalitesi hedefe inene dek düşer, yetmezse ölçek küçülür.
  const ham = Math.floor(b64.length * 0.75);
  const veriAdresi = (blob) => new Promise((coz, red) => { const r = new FileReader(); r.onload = () => coz(String(r.result).split(",")[1]); r.onerror = red; r.readAsDataURL(blob); });
  if (ham <= hedef) return { kontrast, b64: null, tur: "png", bayt: ham, kalite: null, olcek: 1 };
  let son = null;
  for (const olcek of [1, 0.75]) {
    let tuval = c;
    if (olcek !== 1) {
      tuval = new OffscreenCanvas(Math.round(img.width * olcek), Math.round(img.height * olcek));
      const y = tuval.getContext("2d");
      y.imageSmoothingQuality = "high";
      y.drawImage(img, 0, 0, tuval.width, tuval.height);
    }
    for (const kalite of [0.72, 0.62, 0.52, 0.44, 0.36]) {
      const blob = await tuval.convertToBlob({ type: "image/jpeg", quality: kalite });
      son = { blob, kalite, olcek };
      if (blob.size <= hedef) break;
    }
    if (son.blob.size <= hedef || (olcek === 1 && son.blob.size <= Math.min(sert, hedef * 1.35))) break;
  }
  return { kontrast, b64: await veriAdresi(son.blob), tur: "jpg", bayt: son.blob.size, kalite: son.kalite, olcek: son.olcek };
};

// ================================================================ rapor
const TUR_ADI = { tasma: "Yatay taşma", zorunlu: "Ekran dışında kalan maç öğesi", konsol: "Konsol hatası", birincil: "Birincil düğme ilk ekranda yok",
  kontrast: "Düşük kontrast", kesik: "Kesilen metin (…)", kucuk: "44 px altı dokunma hedefi", kaydirma: "Tek ekran olması gereken sahnede kaydırma" };

/** Kayıtlardan bulguları çıkarır, aynı bulguyu ekranlar arasında birleştirir ve puanlar. */
function bulgulariCikar(kayitlar) {
  const harita = new Map();
  const ekle = (anahtar, b, ekran) => {
    const m = harita.get(anahtar);
    if (m) { if (!m.ekranlar.includes(ekran)) m.ekranlar.push(ekran); if (b.puan > m.puan) { m.puan = b.puan; m.ayrinti = b.ayrinti; } } else harita.set(anahtar, { ...b, ekranlar: [ekran] });
  };
  for (const k of kayitlar) {
    const o = k.olcum;
    for (const h of k.konsol ?? []) ekle("konsol|" + h.slice(0, 70), { tur: "konsol", puan: 90, baslik: h.slice(0, 110), ayrinti: h }, k.ad);
    if (!o || o.hata) continue;
    if (o.tasma > 1) ekle("tasma|" + (o.tasiran[0] ?? "").split(" ")[0], { tur: "tasma", puan: 95 + Math.min(4, o.tasma / 20), baslik: `${o.tasma} px yatay taşma`, ayrinti: o.tasiran.slice(0, 3).join(" · ") || "taşıran öğe bulunamadı" }, k.ad);
    for (const z of o.zorunlu ?? []) if (z.disarida > 0) ekle("zorunlu|" + z.secici, { tur: "zorunlu", puan: 92, baslik: `${z.secici}: ${z.disarida}/${z.sayi} öğe ilk ekranın dışında`, ayrinti: `en alt kenar ${z.enAlt} px, ekran ${o.yukseklik} px` }, k.ad);
    if (k.tekEkran && o.sayfaYuksekligi > o.yukseklik + 1) ekle("kaydirma|" + k.tekEkran, { tur: "kaydirma", puan: 86, baslik: `sayfa ${o.sayfaYuksekligi} px, ekran ${o.yukseklik} px`, ayrinti: `kaydırma ${o.sayfaYuksekligi - o.yukseklik} px` }, k.ad);
    const bir = (o.birincil ?? []).filter((b) => !b.devreDisi);
    if (bir.length && !bir.some((b) => b.ilkEkran)) {
      const b = bir[0];
      ekle("birincil|" + b.oge + "|" + b.metin, { tur: "birincil", puan: 80, baslik: `「${b.metin || b.oge}」 ilk ekranda görünmüyor`, ayrinti: `${b.oge} · üst kenar ${b.ust} px, ekran ${o.yukseklik} px${b.ortulu ? " · üstü örtülü" : ""}` }, k.ad);
    }
    for (const m of o.kontrastDusuk ?? []) {
      let puan = m.buyuk ? (m.oran < 3 ? 60 : 34) : (m.oran < 3 ? 76 : 56);
      puan -= m.oran * 2;
      if (m.devreDisi) puan -= 30;
      if (m.zeminPayi < 0.3) puan -= 12;
      ekle("kontrast|" + m.oge + "|" + m.metinRengi + m.zeminRengi, { tur: "kontrast", puan, baslik: `${m.oran}:1 — 「${m.metin}」 (${m.oge})`,
        ayrinti: `${m.px} px${m.buyuk ? " büyük metin (eşik 3:1)" : ""} · metin ${m.metinRengi} / zemin ${m.zeminRengi}${m.devreDisi ? " · devre dışı öğe" : ""}${m.zeminPayi < 0.3 ? " · zemin karmaşık (görsel/geçiş), ölçüm yaklaşık" : ""}` }, k.ad);
    }
    for (const x of (o.kesik ?? []).filter((y) => y.ilkEkran)) ekle("kesik|" + x.oge + "|" + x.metin.slice(0, 24), { tur: "kesik", puan: /^(button|h\d|a)\b|dugme|baslik/.test(x.oge) ? 62 : 50, baslik: `「${x.metin}」 (${x.oge})`, ayrinti: `${x.tur} · görünen ${x.gorunenPx} px, gereken ${x.gerekenPx} px` }, k.ad);
    for (const x of o.kucuk ?? []) ekle("kucuk|" + x.oge + "|" + x.metin, { tur: "kucuk", puan: 44 + (44 - Math.min(x.w, x.h)) / 2 - (x.satirIci ? 16 : 0), baslik: `${x.w}×${x.h} px — 「${x.metin || "(etiketsiz)"}」 (${x.oge})`, ayrinti: x.satirIci ? "satır içi bağlantı" : "" }, k.ad);
  }
  const liste = [...harita.values()];
  for (const b of liste) b.puan += Math.min(8, (b.ekranlar.length - 1) * 1.5);
  return liste.sort((a, b) => b.puan - a.puan);
}

function raporYaz(veri) {
  const { kayitlar, ozet } = veri;
  const bulgular = bulgulariCikar(kayitlar);
  const kb = (b) => (b / 1024).toFixed(0);
  const toplamBayt = kayitlar.reduce((t, k) => t + (k.bayt || 0), 0);
  const s = [];
  s.push("# Ekran Turu — canlı site, mobil boyut", "");
  s.push(`- **Adres:** ${ozet.adres} · **Tarih:** ${ozet.tarih} · **Betik:** \`araclar/ekran-turu.mjs\``);
  s.push(`- **Görüntü:** ${kayitlar.length} adet (${(toplamBayt / 1048576).toFixed(2)} MB; en büyüğü ${kb(Math.max(0, ...kayitlar.map((k) => k.bayt || 0)))} KB) · **Ölçülen ekran:** ${kayitlar.filter((k) => k.olcum && !k.olcum.hata).length}`);
  const kosular = ozet.kosular?.length ? ozet.kosular : [{ bolumler: "hepsi", sureSn: ozet.sureSn, toplam: ozet.istek.toplam, supabase: ozet.istek.supabase, hataDurum: ozet.istek.hataDurum }];
  const topla = (alan) => kosular.reduce((t, k) => t + (k[alan] ?? 0), 0);
  const hatalar = {};
  for (const k of kosular) for (const [d, n] of Object.entries(k.hataDurum ?? {})) hatalar[d] = (hatalar[d] ?? 0) + n;
  s.push(`- **Süre:** ${topla("sureSn")} sn (${kosular.length} koşu: ${kosular.map((k) => `${k.bolumler} ${k.sureSn} sn`).join(" · ")}) · **İstek:** toplam ${topla("toplam")}, Supabase ${topla("supabase")}${Object.keys(hatalar).length ? ` · Supabase hata yanıtı: ${Object.entries(hatalar).map(([d, n]) => `${d}×${n}`).join(", ")}` : ""} · ses/müzik dosyaları indirilmedi`);
  if (ozet.bolumIstek) s.push(`- **Bölüm başına Supabase isteği:** ${Object.entries(ozet.bolumIstek).map(([b, n]) => `${b} ${n}`).join(" · ")} (kalanı kabuğun açılış yüklemeleri)`);
  s.push("- **Yöntem:** Chromium, telefon taklidi (dokunmatik, 2× piksel yoğunluğu), tek misafir oturum, yalnız gezme. Kontrast ekran görüntüsünün piksellerinden örneklenir (zemin = metin kutusunda en sık renk; metin = zemine en karşıt %4 piksel) — görsel/geçişli zeminde yaklaşık. Dokunma hedefinde çevredeki görünmez dokunma payı sayılır. Gerçek iOS Safari ölçülmedi.", "");

  // Görüntülerin gözle incelemesi (elle yazılır; betik yeniden çalışınca korunur): raporun başına girer.
  const gozlem = path.join(CIKTI, "gozlem.md");
  if (fs.existsSync(gozlem)) s.push(fs.readFileSync(gozlem, "utf8").trim(), "");
  s.push(fs.existsSync(gozlem) ? "## Otomatik ölçümün sıralaması (ilk 10)" : "## En kritik 10 bulgu", "");
  if (!bulgular.length) s.push("Otomatik ölçümde bulgu çıkmadı.", "");
  bulgular.slice(0, 10).forEach((b, i) => {
    s.push(`${i + 1}. **${TUR_ADI[b.tur]}** — ${b.baslik}${b.ayrinti ? ` · ${b.ayrinti}` : ""}  \n   Ekran: ${b.ekranlar.slice(0, 6).map((e) => `\`${e}\``).join(", ")}${b.ekranlar.length > 6 ? ` +${b.ekranlar.length - 6}` : ""}`);
  });
  s.push("");

  if (ozet.yakalanamayan?.length) {
    s.push("## Yakalanamayanlar", "");
    for (const y of ozet.yakalanamayan) s.push(`- ${y}`);
    s.push("");
  }
  if (ozet.notlar?.length) {
    s.push("## Notlar", "");
    for (const y of ozet.notlar) s.push(`- ${y}`);
    s.push("");
  }

  s.push("## Ekran ekran bulgu tablosu", "");
  s.push("Sayılar o ekrandaki bulgu adedidir; `—` ölçülmedi (geçici an: yalnız görüntü).", "");
  s.push("| # | Ekran | Görüntü | Boyut · dil | Taşma | Kesik metin | <44 px | Kontrast <4,5 | Konsol | Birincil düğme ilk ekranda | Not |");
  s.push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const k of kayitlar) {
    const o = k.olcum && !k.olcum.hata ? k.olcum : null;
    const bir = (o?.birincil ?? []).filter((b) => !b.devreDisi);
    const birMetin = !o ? "—" : !bir.length ? "yok" : bir.some((b) => b.ilkEkran) ? `evet (${bir.filter((b) => b.ilkEkran).length}/${bir.length})` : "**HAYIR**";
    const zor = (o?.zorunlu ?? []).filter((z) => z.disarida > 0).map((z) => `${z.secici} dışarıda`).join("; ");
    const kay = o && k.tekEkran && o.sayfaYuksekligi > o.yukseklik + 1 ? `kaydırma ${o.sayfaYuksekligi - o.yukseklik} px` : "";
    s.push(`| ${k.no} | ${k.baslik} | [${k.dosya}](${k.dosya}) | ${k.genislik}×${k.yukseklik} · ${k.dil.toUpperCase()} | ${o ? (o.tasma > 1 ? `**${o.tasma} px**` : "0") : "—"} | ${o ? o.kesik.filter((x) => x.ilkEkran).length : "—"} | ${o ? o.kucuk.length : "—"} | ${o ? (o.kontrastDusuk ?? []).length : "—"} | ${(k.konsol ?? []).length || (o ? "0" : "—")} | ${birMetin} | ${[k.not, zor, kay, o?.pencere ? `pencere: ${o.pencere}` : ""].filter(Boolean).join(" · ")} |`);
  }
  s.push("");

  s.push("## Ekran ayrıntıları", "");
  for (const k of kayitlar) {
    const o = k.olcum && !k.olcum.hata ? k.olcum : null;
    const satir = [];
    if (k.olcum?.hata) satir.push(`- Ölçüm yapılamadı: ${k.olcum.hata}`);
    if (o) {
      if (o.tasma > 1) satir.push(`- **Yatay taşma ${o.tasma} px:** ${o.tasiran.join(" · ") || "taşıran öğe bulunamadı"}`);
      for (const z of (o.zorunlu ?? []).filter((x) => x.disarida > 0)) satir.push(`- **Ekran dışında:** \`${z.secici}\` ${z.disarida}/${z.sayi} (en alt kenar ${z.enAlt} px, ekran ${o.yukseklik} px)`);
      if (k.tekEkran && o.sayfaYuksekligi > o.yukseklik + 1) satir.push(`- **Kaydırma:** sayfa ${o.sayfaYuksekligi} px, ekran ${o.yukseklik} px`);
      const dis = o.birincil.filter((b) => !b.ilkEkran && !b.devreDisi);
      if (dis.length) satir.push(`- Birincil düğme ilk ekranın dışında: ${dis.slice(0, 4).map((b) => `「${b.metin || b.oge}」 (üst ${b.ust} px${b.ortulu ? ", örtülü" : ""})`).join(" · ")}`);
      const ks = o.kesik.filter((x) => x.ilkEkran);
      if (ks.length) satir.push(`- Kesilen metin (${ks.length}): ${ks.slice(0, 6).map((x) => `「${x.metin}」 \`${x.oge}\` ${x.gorunenPx}/${x.gerekenPx} px`).join(" · ")}`);
      const altKesik = o.kesik.length - ks.length;
      if (altKesik > 0) satir.push(`- İlk ekranın altında kesilen metin: ${altKesik}`);
      if (o.kucuk.length) satir.push(`- 44 px altı hedef (${o.kucuk.length}): ${[...o.kucuk].sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h)).slice(0, 6).map((x) => `「${x.metin || "etiketsiz"}」 \`${x.oge}\` ${x.w}×${x.h}${x.satirIci ? " satır içi" : ""}`).join(" · ")}`);
      const kd = o.kontrastDusuk ?? [];
      if (kd.length) satir.push(`- Kontrast < 4,5:1 (${kd.length}; ölçülen metin ${o.kontrastOlculen}): ${kd.slice(0, 7).map((m) => `「${m.metin}」 ${m.oran}:1 \`${m.oge}\` ${m.metinRengi}/${m.zeminRengi}${m.buyuk ? " büyük" : ""}${m.devreDisi ? " devre dışı" : ""}`).join(" · ")}`);
    }
    for (const h of k.konsol ?? []) satir.push(`- **Konsol:** ${h}`);
    if (!satir.length) continue;
    s.push(`### ${k.no} · ${k.baslik} — \`${k.dosya}\``, "", ...satir, "");
  }
  fs.writeFileSync(path.join(CIKTI, "RAPOR.md"), s.join("\n"), "utf8");
  return bulgular;
}

function veriYaz(veri) {
  fs.writeFileSync(VERI_DOSYASI, JSON.stringify(veri, null, 1), "utf8");
}

// ================================================================ --rapor: yalnız raporu yeniden yaz
if (ARG.rapor) {
  const veri = JSON.parse(fs.readFileSync(VERI_DOSYASI, "utf8"));
  const b = raporYaz(veri);
  console.log(`RAPOR.md yeniden yazıldı: ${veri.kayitlar.length} görüntü, ${b.length} bulgu.`);
  process.exit(0);
}

// ================================================================ çalışma
if (!fs.existsSync(OTURUM)) {
  console.error("Oturum dosyası yok:", OTURUM, "— yeni hesap AÇILMAZ; önce yerelde `node araclar/arayuz-denetim.mjs --sadece-oturum` çalıştır.");
  process.exit(1);
}
const durumDosyasi = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const kayitliKoken = durumDosyasi.origins?.find((o) => o.localStorage?.some((x) => x.name.includes("auth-token")));
if (!kayitliKoken) { console.error("Oturumda kullanıcı yok."); process.exit(1); }
const yerel = kayitliKoken.localStorage;

fs.mkdirSync(CIKTI, { recursive: true });
const BAS = Date.now();
const eski = ARG.ekle && fs.existsSync(VERI_DOSYASI) ? JSON.parse(fs.readFileSync(VERI_DOSYASI, "utf8")) : null;
const veri = {
  ozet: { adres: ADRES, tarih: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", sureSn: 0,
    istek: { toplam: 0, supabase: 0, sesEngel: 0, hataDurum: {}, yollar: {} }, bolumIstek: { ...(eski?.ozet?.bolumIstek ?? {}) }, kosular: [...(eski?.ozet?.kosular ?? [])],
    yakalanamayan: [...(eski?.ozet?.yakalanamayan ?? []).filter((y) => !BOLUMLER.some((b) => y.startsWith(`[${b}]`)))],
    notlar: [...(eski?.ozet?.notlar ?? []).filter((y) => !BOLUMLER.some((b) => y.startsWith(`[${b}]`)))] },
  kayitlar: (eski?.kayitlar ?? []).filter((k) => !BOLUMLER.includes(k.bolum)),
};
// Yeniden çekilen bölümün eski görüntüleri silinir (yalnız bu betiğin yazdıkları).
for (const k of (eski?.kayitlar ?? []).filter((x) => BOLUMLER.includes(x.bolum))) fs.rmSync(path.join(CIKTI, k.dosya), { force: true });
const say = veri.ozet.istek;
let bolum = "hazirlik";
let dil = "tr";
let dilZorla = null;
let durduran = null;
const sayac = { ...BOLUM_NO };
const konsol = [];
const ucusta = new Set();
let sonHareket = Date.now();
const yakalanamadi = (m) => { veri.ozet.yakalanamayan.push(`[${bolum}] ${m}`); console.log("  ! yakalanamadı:", m); };
const notEkle = (m) => { veri.ozet.notlar.push(`[${bolum}] ${m}`); console.log("  ·", m); };
const sureDoldu = () => Date.now() - BAS > SURE_SINIRI_MS;

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({
  ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR, locale: "tr-TR", timezoneId: "Europe/Istanbul",
});
// Oturum canlı adrese taşınır: localStorage ilk yüklemeden önce bir kez yazılır (oyuncu-testi ile aynı yöntem).
await baglam.addInitScript(({ kayitlar, koken }) => {
  try {
    if (location.origin !== koken || sessionStorage.getItem("__ekranTuruYuklendi")) return;
    for (const k of kayitlar) localStorage.setItem(k.name, k.value);
    sessionStorage.setItem("__ekranTuruYuklendi", "1");
  } catch { /* depolama kapalı */ }
}, { kayitlar: yerel, koken: KOKEN });
// Ses/müzik indirilmez.
await baglam.route(SES, (r) => { say.sesEngel++; return r.abort(); });
// İngilizce tur: profil yanıtındaki dil YALNIZ tarayıcıda "en" gösterilir (veritabanına yazılmaz).
await baglam.route("**/rest/v1/rpc/profilim*", async (rota) => {
  if (dilZorla !== "en") return rota.continue();
  try {
    const yanit = await rota.fetch();
    let govde = await yanit.text();
    try {
      const j = JSON.parse(govde);
      const p = Array.isArray(j) ? j[0] : j;
      if (p && typeof p === "object") p.dil = "en";
      govde = JSON.stringify(j);
    } catch { /* gövde JSON değil: aynen */ }
    await rota.fulfill({ response: yanit, body: govde });
  } catch { await rota.continue().catch(() => {}); }
});
baglam.on("request", (r) => {
  say.toplam++;
  let u;
  try { u = new URL(r.url()); } catch { return; }
  if (!u.hostname.endsWith("supabase.co")) return;
  say.supabase++;
  const yol = u.pathname.replace(new RegExp(UUID.source, "g"), ":id");
  say.yollar[yol] = (say.yollar[yol] ?? 0) + 1;
  if (["fetch", "xhr"].includes(r.resourceType())) { ucusta.add(r); sonHareket = Date.now(); }
});
for (const olay of ["requestfinished", "requestfailed"]) baglam.on(olay, (r) => { if (ucusta.delete(r)) sonHareket = Date.now(); });
baglam.on("response", (r) => {
  const d = r.status();
  if (d < 400) return;
  let u;
  try { u = new URL(r.url()); } catch { return; }
  if (u.origin === KOKEN && d === 403) durduran = `Canlı site 403 döndü: ${u.pathname}`;
  if (u.hostname.endsWith("supabase.co")) {
    say.hataDurum[d] = (say.hataDurum[d] ?? 0) + 1;
    const kota = (say.hataDurum[429] ?? 0) + (say.hataDurum[402] ?? 0) + (say.hataDurum[503] ?? 0);
    if (kota >= 3) durduran = `Supabase kota/limit yanıtı (${Object.entries(say.hataDurum).map(([a, b]) => `${a}×${b}`).join(", ")})`;
  }
});

const sayfa = await baglam.newPage();
const yardimci = await baglam.newPage();   // boş sayfa: görüntü işleme (uygulamanın güvenlik kurallarından bağımsız)
await sayfa.bringToFront();
sayfa.on("console", (m) => {
  if (m.type() !== "error") return;
  const yer = m.location()?.url ?? "";
  if (SES.test(yer) || SES.test(m.text())) return;   // betiğin engellediği ses dosyası
  konsol.push(m.text().replace(/\s+/g, " ").slice(0, 220) + (yer && !m.text().includes(yer) ? ` (${yer.replace(KOKEN, "").slice(0, 80)})` : ""));
});
sayfa.on("pageerror", (e) => konsol.push("sayfa hatası: " + ilkSatir(e)));

/** Ağ sakinleşene ve iskeletler kalkana dek bekler (Realtime bağlantısı açık kaldığı için "networkidle" kullanılmaz). */
async function sakinBekle({ sessiz = 550, enCok = 9000, sonra = 450 } = {}) {
  const t0 = Date.now();
  await bekle(250);
  while (Date.now() - t0 < enCok) {
    const iskelet = await sayfa.evaluate(() => [...document.querySelectorAll(".qt-iskelet, [aria-busy=true]")].filter((e) => e.getBoundingClientRect().height > 0).length).catch(() => 0);
    if (!ucusta.size && !iskelet && Date.now() - sonHareket > sessiz) break;
    await bekle(120);
  }
  await sayfa.evaluate(() => document.fonts?.ready).catch(() => {});
  await bekle(sonra);
}

/** Uygulama içi geçiş (kabuk yeniden yüklenmez); yönlendirici tepki vermezse tam yükleme. */
async function git(yol) {
  const once = await sayfa.evaluate(() => { window.scrollTo(0, 0); return location.pathname + location.search; }).catch(() => "");
  if (once === yol) return;
  const iz = await sayfa.evaluate(() => (document.querySelector("#root, #app") ?? document.body).innerText.length).catch(() => -1);
  await sayfa.evaluate((y) => { history.pushState({}, "", y); window.dispatchEvent(new PopStateEvent("popstate", { state: {} })); }, yol);
  await bekle(350);
  const sonra = await sayfa.evaluate(() => (document.querySelector("#root, #app") ?? document.body).innerText.length).catch(() => -2);
  if (sonra === iz && !ucusta.size && Date.now() - sonHareket > 600) {
    notEkle(`uygulama içi geçiş tepki vermedi, tam yükleme yapıldı: ${yol}`);
    await sayfa.goto(ADRES + yol, { waitUntil: "domcontentloaded", timeout: 25000 });
  }
}

/** Açık tanıtım / açılış penceresini KAPATIR — yalnız kapatma düğmeleri; "Al", "Ödülleri al" gibi düğmelere dokunmaz. */
async function katmanlariKapat() {
  for (let i = 0; i < 5; i++) {
    const var_ = await sayfa.evaluate(() => [...document.querySelectorAll("[aria-modal=true], .bd-tanitim-katman, .bd-modal-katman")].some((e) => e.getBoundingClientRect().height > 0)).catch(() => false);
    if (!var_) return;
    const kapat = sayfa.getByRole("button", { name: /^(Atla|Geç|Skip|Sonra|Daha sonra|Later|Not now|Kapat|Close|Anladım|Got it)$/ });
    if (await kapat.count()) await kapat.last().tap({ timeout: 1500 }).catch(() => {});
    else await sayfa.keyboard.press("Escape").catch(() => {});
    await bekle(450);
  }
}

const bekleyenler = [];
/** Görüntü al + (isteğe bağlı) ölç. `ertele`: geçici anlarda işleme (sıkıştırma) maçtan sonraya bırakılır. */
async function yakala(ad, baslik, { olc = true, gorunmeli = [], ertele = false, not = "", oge = null, tekEkran = null } = {}) {
  let png;
  try {
    png = oge ? await sayfa.locator(oge).first().screenshot({ type: "png", timeout: 2500 }) : await sayfa.screenshot({ type: "png" });
  } catch (e) { yakalanamadi(`${baslik}: görüntü alınamadı (${ilkSatir(e)})`); return null; }
  let olcum = null;
  if (olc && !oge) olcum = await sayfa.evaluate(OLCUM, { gorunmeli }).catch((e) => ({ hata: ilkSatir(e) }));
  const gp = sayfa.viewportSize();
  const no = sayac[bolum]++;
  const kayit = { no, ad: `${String(no).padStart(2, "0")}-${ad}`, baslik, bolum, dil, genislik: gp.width, yukseklik: gp.height, dosya: null, bayt: 0,
    yol: await sayfa.evaluate(() => location.pathname + location.search).catch(() => ""), not, tekEkran, konsol: konsol.splice(0), olcum };
  veri.kayitlar.push(kayit);
  const isle = async () => {
    const metinler = kayit.olcum?.metinler ?? [];
    let sonuc = null;
    try { sonuc = await yardimci.evaluate(GORUNTU_ISLE, { b64: png.toString("base64"), genislik: kayit.olcum?.gorusGenisligi ?? gp.width, metinler, hedef: HEDEF_BAYT, sert: SERT_BAYT }); }
    catch (e) { notEkle(`${kayit.ad}: görüntü işlenemedi, PNG aynen yazıldı (${ilkSatir(e)})`); }
    const tampon = sonuc?.b64 ? Buffer.from(sonuc.b64, "base64") : png;
    kayit.dosya = `${kayit.ad}.${sonuc?.b64 ? "jpg" : "png"}`;
    kayit.bayt = tampon.length;
    fs.writeFileSync(path.join(CIKTI, kayit.dosya), tampon);
    if (kayit.olcum && !kayit.olcum.hata) {
      const dusuk = [];
      let olculen = 0;
      metinler.forEach((m, i) => {
        const k = sonuc?.kontrast?.[i];
        if (!k) return;
        olculen++;
        if (k.oran < 4.5) dusuk.push({ oge: m.oge, metin: m.metin, px: m.px, buyuk: m.buyuk, devreDisi: m.devreDisi, ...k });
      });
      // Aynı öğe + aynı renk çifti bir kez (en düşük oran)
      const tek = new Map();
      for (const d of dusuk.sort((a, b) => a.oran - b.oran)) { const a = `${d.oge}|${d.metinRengi}|${d.zeminRengi}`; if (!tek.has(a)) tek.set(a, d); }
      kayit.olcum.kontrastDusuk = [...tek.values()];
      kayit.olcum.kontrastOlculen = olculen;
      delete kayit.olcum.metinler;
    }
    console.log(`  ✓ ${kayit.dosya} (${(kayit.bayt / 1024).toFixed(0)} KB)${kayit.olcum && !kayit.olcum.hata ? ` · taşma ${kayit.olcum.tasma} · kesik ${kayit.olcum.kesik.length} · <44 ${kayit.olcum.kucuk.length} · kontrast ${kayit.olcum.kontrastDusuk.length}/${kayit.olcum.kontrastOlculen}` : ""}${kayit.konsol.length ? ` · konsol ${kayit.konsol.length}` : ""}`);
  };
  if (ertele) bekleyenler.push(isle);
  else { await isle(); veriYaz(veri); }
  return kayit;
}
async function bekleyenleriIsle() {
  while (bekleyenler.length) await bekleyenler.shift()();
  veri.kayitlar.sort((a, b) => a.no - b.no);
  veriYaz(veri);
}

/** Dokunuş: önce gerçek dokunuş; öğe hareketli olduğu için "kararlı" sayılmazsa DOM tıklaması. */
async function dokun(konum, sure = 1800) {
  try { await konum.tap({ timeout: sure }); return true; }
  catch {
    try { await konum.evaluate((e) => e.click()); return true; } catch { return false; }
  }
}

async function ekran(ad, baslik, yol, secenek = {}) {
  if (durduran || sureDoldu()) return;
  await git(yol);
  await sakinBekle();
  if (secenek.hazirSecici) await sayfa.locator(secenek.hazirSecici).first().waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
  await katmanlariKapat();
  await yakala(ad, baslik, secenek);
}

// ---------------------------------------------------------------- bölümler
const EKRANLAR = [
  ["ana-sayfa", "Ana sayfa", "/"],
  ["profil", "Profil", "/profil"],
  ["lig", "Lig", "/siralama"],
  ["gorevler", "Görevler", "/gorevler"],
  ["battle-pass", "Battle Pass (Sezon Yolu)", "/sezon-yolu"],
  ["dukkan-joker-klasik", "Dükkân › Joker › Klasik", "/joker?mod=klasik"],
  ["dukkan-joker-duello", "Dükkân › Joker › Düello", "/joker?mod=duello"],
  ["dukkan-elmas", "Dükkân › Elmas", "/joker?sekme=elmas"],
  ["dukkan-cerceve", "Dükkân › Çerçeve", "/joker?sekme=cerceve"],
  ["dukkan-avatar-isim", "Dükkân › Avatar ve İsim", "/joker?sekme=avatar"],
  ["arkadaslar", "Arkadaşlar", "/arkadaslar"],
  ["meydan-okumalar", "Meydan Okumalar", "/meydan"],
  ["modlar", "Modlar (kategori şeridi)", "/modlar"],
  ["ayarlar", "Ayarlar", "/profil?sekme=ayarlar"],
];

async function oynaPenceresi(onek) {
  await git("/");
  await sakinBekle();
  await katmanlariKapat();
  const oyna = sayfa.locator(".as-buyuk-dugme--oyna").first();
  if (!(await oyna.count()) || !(await dokun(oyna))) { yakalanamadi("OYNA penceresi: ana sayfada OYNA düğmesi bulunamadı"); return; }
  try { await sayfa.locator("[aria-modal=true]").first().waitFor({ state: "visible", timeout: 5000 }); }
  catch { yakalanamadi("OYNA penceresi açılmadı"); return; }
  await sayfa.locator("[aria-modal=true] .a-katsec-serit").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => notEkle("OYNA penceresinde kategori şeridi (.a-katsec-serit) görünmedi"));
  await sakinBekle({ enCok: 5000 });
  await yakala(`${onek}oyna-penceresi`, "OYNA penceresi (mod + kategori şeridi)");
  await sayfa.keyboard.press("Escape").catch(() => {});
  await sayfa.locator("[aria-modal=true]").first().waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
}

async function statikBolum() {
  await sayfa.setViewportSize({ width: 390, height: 844 });
  for (const [ad, baslik, yol] of EKRANLAR) await ekran(`tr390-${ad}`, baslik, yol);
  if (!durduran && !sureDoldu()) await oynaPenceresi("tr390-");
}

async function darBolum() {
  await sayfa.setViewportSize({ width: 360, height: 640 });
  await bekle(300);
  for (const [ad, baslik, yol] of [["ana-sayfa", "Ana sayfa", "/"], ["battle-pass", "Battle Pass (Sezon Yolu)", "/sezon-yolu"], ["dukkan-joker", "Dükkân › Joker", "/joker?mod=klasik"], ["lig", "Lig", "/siralama"]]) {
    await ekran(`tr360-${ad}`, baslik, yol);
  }
  await sayfa.setViewportSize({ width: 390, height: 844 });
}

async function ingilizceBolum() {
  await sayfa.setViewportSize({ width: 390, height: 844 });
  dilZorla = "en";
  dil = "en";
  await sayfa.evaluate(() => { try { localStorage.setItem("bildim_dil", "en"); } catch { /* depolama kapalı */ } });
  await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded", timeout: 30000 });   // dil sayfa yüklenirken çözülür: tek tam yükleme
  await sakinBekle();
  const gercek = await sayfa.evaluate(() => document.documentElement.lang).catch(() => "?");
  if (gercek !== "en") notEkle(`İngilizce tur: sayfa dili "${gercek}" kaldı — görüntüler İngilizce olmayabilir`);
  await katmanlariKapat();
  await yakala("en390-ana-sayfa", "Home (EN)");
  await ekran("en390-dukkan-joker", "Shop › Jokers (EN)", "/joker?mod=klasik");
  await ekran("en390-lig", "League (EN)", "/siralama");
  // Dil tercihi yalnız bu tarayıcı bağlamındaydı; bağlam kapanınca kaybolur.
}

/** Meydan Okumalar › Antrenman: açık bota karşı maç hemen başlar (serbest; lig puanı yok). */
async function antrenmanBaslat(modAdi, adresDeseni) {
  await git("/meydan");
  await sakinBekle();
  await katmanlariKapat();
  const kart = sayfa.locator(".a-meydan-antrenman-kart").first();
  try { await kart.waitFor({ state: "visible", timeout: 8000 }); }
  catch { yakalanamadi(`${modAdi}: Meydan Okumalar'da Antrenman botu kartı yok`); return false; }
  await kart.scrollIntoViewIfNeeded().catch(() => {});
  await dokun(kart);
  const mod = sayfa.locator(".a-meydan-antrenman-modlar button", { hasText: modAdi }).first();
  try { await mod.waitFor({ state: "visible", timeout: 5000 }); }
  catch { yakalanamadi(`${modAdi}: Antrenman mod seçim penceresi açılmadı`); return false; }
  await dokun(mod);
  try { await sayfa.waitForURL(adresDeseni, { timeout: 25000 }); return true; }
  catch {
    const hata = await sayfa.locator(".a-meydan-hata").first().innerText().catch(() => "");
    yakalanamadi(`${modAdi}: Antrenman maçı başlamadı${hata ? ` — ekrandaki ileti: "${hata.slice(0, 120)}"` : " (25 sn'de maç adresi gelmedi)"}`);
    if (hata) await yakala(`antrenman-${modAdi.toLowerCase().replace("ü", "u")}-reddi`, `Antrenman › ${modAdi}: sunucu reddi ("${hata.slice(0, 60)}")`, {});
    await sayfa.keyboard.press("Escape").catch(() => {});
    await sayfa.locator("[aria-modal=true]").first().waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
    return false;
  }
}

const DUELLO_DURUM = () => {
  const q = (s) => document.querySelector(s);
  const t = window.__bdTani ?? null;
  const tur = (document.body.innerText.match(/(?:Tur|Round)\s+(\d+)\s*\/\s*\d+/i) ?? [])[1];
  const durumEl = q(".hk-soru--durum");
  const ton = durumEl ? ([...durumEl.classList].find((c) => c.startsWith("hk-durum--")) ?? "").replace("hk-durum--", "") : null;
  return {
    yol: location.pathname, faz: t?.mod === "duello" ? t.faz : null, kilitli: Boolean(t?.kilitli), calisan: t?.calisan ?? null,
    tur: tur ? Number(tur) : null,
    banGiris: Boolean(q(".hk-banan--giris")), banSec: Boolean(q(".hk-bankonsol--sec")), banTamam: Boolean(q(".hk-bankonsol--tamam")),
    banBekle: Boolean(q(".hk-bankonsol--bekle")), banAcik: Boolean(q(".hk-banan--acik")), banOnay: Boolean(q(".hk-banan--onay")),
    banBilgi: Boolean(q(".hk-banan--bilgi")), banSira: Boolean(q(".hk-bansira")),
    savunanCubuk: Boolean(q(".hk-cubuk--savunan")), ipucu: Boolean(q(".hk-cubuk--ipucu")),
    kartAcik: document.querySelectorAll("button.hk-kart:not([disabled])").length, secili: Boolean(q(".hk-kart--secili")),
    cubukDugme: Boolean(q(".hk-cubuk-dugme:not([disabled])")),
    ton, sikAcik: document.querySelectorAll(".qt-sik:not([disabled]):not(.qt-sik--elendi)").length,
    sonuc: Boolean(q(".hk-mesaj--sonuc")), mesaj: (q(".hk-mesaj-yazi")?.innerText ?? "").replace(/\s+/g, " ").slice(0, 90),
    tahta: Boolean(q(".hk-mac")), pencere: Boolean(q("[aria-modal=true]")),
  };
};
const TON_RENK = { tehlike: "kirmizi", firsat: "mavi", notr: "gri" };
const TON_AD = { tehlike: "kırmızı (kategorin tehlikede)", firsat: "mavi (fırsat / saldırı)", notr: "gri (rakip pekiştiriyor)" };

/** Düello bu hesapta kilitliyse (yeni oyuncu kilidi): giriş ekranı + kurallar penceresinin ban ve çerçeve adımları belgelenir. */
async function duelloKilitli() {
  await ekran("duello-giris", "Düello — giriş ekranı", "/duello", { hazirSecici: ".m2-giris" });
  const kilitli = await sayfa.locator(".m2-kilit").count();
  if (!kilitli) { notEkle("Düello giriş ekranında kilit görünmüyor; Antrenman reddinin nedeni başka olabilir"); return; }
  yakalanamadi("Düello oyun içi (ban fazı, RAKİP BANLADI anı, soru ekranı durum çerçevesi, tur sonucu, 5 yuva paneli): hesapta Düello KİLİTLİ — yeni oyuncu kilidi 5 bitmiş Klasik/Saf Bilgi maçı ister; tek kısa Klasik maç sınırıyla açılamaz");
  const kurallar = sayfa.getByRole("button", { name: /Kurallar nasıl işliyor|How do the rules work/i }).first();
  if (!(await kurallar.count()) || !(await dokun(kurallar, 2500))) { notEkle("Düello kurallar penceresi açılamadı"); return; }
  const pencere = sayfa.locator(".m2-tanitim").first();
  try { await pencere.waitFor({ state: "visible", timeout: 4000 }); } catch { notEkle("Düello kurallar penceresi açılmadı"); return; }
  const ADIM = { 1: "aynı soru, aynı anda", 4: "soru ekranında çerçeve rengi", 5: "savunma banı" };
  for (let adim = 1; adim <= 5; adim++) {
    await bekle(450);
    if (ADIM[adim]) await yakala(`duello-kurallar-adim-${adim}`, `Düello — kurallar penceresi, adım ${adim}: ${ADIM[adim]}`, {});
    if (adim === 5) break;
    const ileri = pencere.getByRole("button", { name: /^(İleri|Next)$/ }).first();
    if (!(await ileri.count()) || !(await dokun(ileri, 2000))) break;
  }
  await sayfa.keyboard.press("Escape").catch(() => {});
  await pencere.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
}

async function duelloBolum() {
  await sayfa.setViewportSize({ width: 390, height: 844 });
  if (!(await antrenmanBaslat("Düello", new RegExp("/duello/" + UUID.source)))) { await duelloKilitli(); return; }
  const bas = Date.now();
  const alinan = new Set();
  const tonlar = new Set();
  const sonucTurlari = new Set();
  const cevaplanan = new Set();
  const banlanan = new Set();
  const gorulen = new Set();
  let diger = 0;
  let sonTur = 0;
  let tanitimSayaci = 0;
  const bir = async (anahtar, baslik, secenek) => {
    if (alinan.has(anahtar)) return false;
    alinan.add(anahtar);
    await yakala(`duello-${anahtar}`, baslik, { tekEkran: "duello", ...secenek });
    return true;
  };
  while (Date.now() - bas < 5 * 60 * 1000 && !durduran) {
    const d = await sayfa.evaluate(DUELLO_DURUM).catch(() => null);
    if (!d) { await bekle(200); continue; }
    if (d.tur) sonTur = Math.max(sonTur, d.tur);
    if (!d.tahta) {
      // Tanıtım / VS / yükleme: kapatılabilir tanıtım varsa geç; maç adresinden çıkıldıysa maç bitmiştir.
      if (!new RegExp("/duello/" + UUID.source).test(d.yol)) break;
      if (tanitimSayaci++ % 8 === 0) {
        const gec = sayfa.getByRole("button", { name: /^(Geç|Atla|Skip|Anladım|Got it|Başla|Start)$/ });
        if (await gec.count()) await gec.last().tap({ timeout: 1200 }).catch(() => {});
      }
      if (Date.now() - bas > 1200) await bir("acilis", "Düello — açılış / VS", { olc: false, ertele: true });
      await bekle(150);
      continue;
    }
    const imza = [d.faz, d.banGiris, d.banSec, d.banTamam, d.banBekle, d.banAcik, d.banOnay, d.banBilgi, d.banSira, d.savunanCubuk, d.sonuc, d.ton].join("|");
    let yakalandi = false;
    const turAnahtari = d.tur ?? `s${sonucTurlari.size}`;

    // ---- ban fazı
    if (d.banGiris) yakalandi = await bir("ban-savunan-damga", "Düello — ban: savunana \"BAN SIRASI SENDE\" damgası", { olc: false, ertele: true }) || yakalandi;
    else if (d.banSec && !d.banTamam) {
      yakalandi = await bir("ban-savunan-geri-sayim", "Düello — ban: savunanın durum satırı + geri sayım", {}) || yakalandi;
      if (!banlanan.has(turAnahtari)) {
        banlanan.add(turAnahtari);
        const kart = sayfa.locator("button.hk-kart:not([disabled])").first();
        if (await kart.count()) await dokun(kart, 1500);
        else notEkle(`tur ${d.tur}: ban sırası bendeyken dokunulabilir kategori kartı yok`);
      }
    }
    if (d.banTamam || d.banOnay) yakalandi = await bir("ban-savunan-banladin", "Düello — ban: savunana \"BANLADIN\" onayı", { olc: false, ertele: true }) || yakalandi;
    if (d.banBekle) yakalandi = await bir("ban-saldiran-bekleme", "Düello — ban: saldıran bekliyor (\"Rakip ban seçiyor…\")", {}) || yakalandi;
    if (d.banAcik) yakalandi = await bir("ban-saldiran-rakip-banladi", "Düello — ban: saldırana \"RAKİP BANLADI\" açıklaması", { olc: false, ertele: true }) || yakalandi;
    if (d.banBilgi) yakalandi = await bir("ban-kullanilmadi", "Düello — ban: \"BAN KULLANILMADI\"", { olc: false, ertele: true }) || yakalandi;
    if (d.banSira) yakalandi = await bir("ban-saldiran-sira-sende", "Düello — ban sonrası mavi \"SIRA SENDE\" bandı", { olc: false, ertele: true }) || yakalandi;

    // ---- kategori fazı
    const banAni = d.banGiris || d.banAcik || d.banOnay || d.banBilgi || d.banSira;
    if (d.faz === "kategori" && !banAni) {
      if (d.savunanCubuk) yakalandi = await bir("kategori-savunan-bekleme", `Düello — kategori: savunan bekliyor${d.ipucu ? " (çerçeve rengi ipucu açık)" : ""}`, { gorunmeli: [".hk-cubuk"] }) || yakalandi;
      else if (d.kartAcik > 0 && d.calisan !== "kategori") {
        yakalandi = await bir("kategori-saldiran", "Düello — kategori: saldıran seçiyor (kartlar + yuva paneli)", { gorunmeli: [".hk-kart", ".hk-cubuk"] }) || yakalandi;
        if (!d.secili) {
          const kartlar = sayfa.locator("button.hk-kart:not([disabled])");
          const n = await kartlar.count();
          if (n) await dokun(kartlar.nth((d.tur ?? 0) % n), 1500);
          await bekle(200);
        } else if (d.cubukDugme) {
          yakalandi = await bir("kategori-secili", "Düello — kategori: kart seçili, alt çubukta eylem düğmesi", { gorunmeli: [".hk-cubuk-dugme"] }) || yakalandi;
          await dokun(sayfa.locator(".hk-cubuk-dugme:not([disabled])").first(), 1500);
          await bekle(300);
        }
      }
    }

    // ---- soru (cevap) fazı
    if (d.faz === "cevap" && d.sikAcik >= 2 && !d.kilitli) {
      const rol = /Sen saldır|You('re| are) attack/i.test(d.mesaj) ? "saldiran" : "savunan";
      if (d.ton) {
        tonlar.add(d.ton);
        yakalandi = await bir(`soru-cerceve-${TON_RENK[d.ton] ?? d.ton}`, `Düello — soru ekranı: kategori durum çerçevesi ${TON_AD[d.ton] ?? d.ton}, ${rol === "saldiran" ? "saldıran" : "savunan"}`, { gorunmeli: [".qt-sik", ".bd-d2-skill", ".hk-tahta"] }) || yakalandi;
      } else yakalandi = await bir("soru-cercevesiz", "Düello — soru ekranı (durum çerçevesi yok)", { gorunmeli: [".qt-sik", ".bd-d2-skill", ".hk-tahta"] }) || yakalandi;
      if (!cevaplanan.has(turAnahtari) && await dokun(sayfa.locator(".qt-sik:not([disabled]):not(.qt-sik--elendi)").first(), 2000)) cevaplanan.add(turAnahtari);
    }

    // ---- tur sonucu
    if (d.sonuc) {
      const ilk = !sonucTurlari.has(d.tur ?? d.mesaj);
      sonucTurlari.add(d.tur ?? d.mesaj);
      if (ilk && sonucTurlari.size <= 2) {
        yakalandi = await bir(`tur-sonucu-${sonucTurlari.size}`, `Düello — tur sonucu (tur ${d.tur}): "${d.mesaj}"`, sonucTurlari.size === 1 ? { gorunmeli: [".hk-tahta"] } : { olc: false, ertele: true }) || yakalandi;
        if (sonucTurlari.size === 1) await bir("yuva-paneli", "Düello — 5 yuva paneli (yakın çekim)", { oge: ".hk-tahta", olc: false, ertele: true });
      }
      if (sonucTurlari.size >= 4 || (sonucTurlari.size >= 3 && Date.now() - bas > 170000)) break;
    }

    // ---- tanımadığım bir durum: yine de belgele (en çok 4)
    if (!gorulen.has(imza)) {
      gorulen.add(imza);
      if (!yakalandi && diger < 4 && d.faz && !banAni && !(d.faz === "cevap" && d.kilitli && diger > 0)) {
        diger++;
        await yakala(`duello-diger-${diger}`, `Düello — ${d.faz} fazı (tur ${d.tur ?? "?"}): "${d.mesaj}"`, { olc: false, ertele: true });
      }
    }
    if (Date.now() - bas > 240000) break;
    await bekle(110);
  }
  // 5 yuva panelinin son hâli
  if (await sayfa.locator(".hk-tahta").count()) await yakala("duello-yuva-paneli-son", `Düello — 5 yuva paneli, ${sonucTurlari.size} tur sonra (yakın çekim)`, { oge: ".hk-tahta", olc: false, ertele: true });

  // ---- çıkış: "Düellodan çık" → onay → çık
  const macta = new RegExp("/duello/" + UUID.source).test(sayfa.url()) && await sayfa.locator(".hk-mac").count();
  if (macta) {
    const cik = sayfa.getByRole("button", { name: /Düellodan çık|Leave the duel|Leave duel/i }).first();
    if (await cik.count() && await dokun(cik, 2500)) {
      const pencere = sayfa.getByRole("dialog");
      await pencere.first().waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
      await bekle(350);
      await yakala("duello-cikis-onayi", "Düello — \"Düellodan çık\" onay penceresi", {});
      const onay = pencere.getByRole("button", { name: /^(Çık|Leave|Exit)$/ }).first();
      if (await onay.count()) {
        await dokun(onay, 2500);
        await sayfa.locator(".hk-mesaj-yazi").first().waitFor({ state: "detached", timeout: 12000 }).catch(() => {});
        await sakinBekle({ enCok: 7000 });
        await yakala("duello-cikis-sonrasi", "Düello — çıkış sonrası ekran (hükmen mağlubiyet)", { tekEkran: "duello" });
      } else { yakalanamadi("Düello çıkış onayında \"Çık\" düğmesi bulunamadı — maç açık kalmış olabilir"); await sayfa.keyboard.press("Escape").catch(() => {}); }
    } else yakalanamadi("\"Düellodan çık\" düğmesi bulunamadı — maç açık kalmış olabilir");
  } else {
    await sakinBekle({ enCok: 6000 });
    await yakala("duello-mac-sonu", "Düello — maç sonu ekranı (maç kendiliğinden bitti)", {});
  }
  await bekleyenleriIsle();

  notEkle(`Düello: ${sonucTurlari.size} tur sonucu görüldü (son tur ${sonTur}), ${Math.round((Date.now() - bas) / 1000)} sn; görülen çerçeve rengi: ${[...tonlar].map((t) => TON_RENK[t] ?? t).join(", ") || "yok"}`);
  for (const [t, a] of Object.entries(TON_AD)) if (!tonlar.has(t)) yakalanamadi(`Düello soru ekranı çerçevesi — ${a}: ilk ${sonucTurlari.size} turda bu durum oluşmadı (renk kategorinin sahibine ve kimin saldırdığına bağlı)`);
  const beklenen = { "ban-savunan-damga": "savunanın \"BAN SIRASI SENDE\" damgası", "ban-savunan-geri-sayim": "savunanın ban geri sayımı", "ban-saldiran-bekleme": "saldıranın ban beklemesi",
    "ban-saldiran-rakip-banladi": "\"RAKİP BANLADI\" anı", "kategori-saldiran": "saldıranın kategori seçimi", "tur-sonucu-1": "tur sonucu" };
  for (const [a, m] of Object.entries(beklenen)) if (!alinan.has(a)) yakalanamadi(`Düello — ${m}: maç boyunca bu durum ekranda görülmedi`);
}

async function klasikBolum() {
  await sayfa.setViewportSize({ width: 390, height: 844 });
  if (!(await antrenmanBaslat("Klasik", new RegExp("/mac/" + UUID.source)))) return;
  const bas = Date.now();
  const SIK = ":is(.qt-sik, .bd-secenek):not([disabled]):not(.qt-sik--elendi):not(.elendi)";
  const SORU = ":is(.qt-soru-metin, .bd-soru-metin)";
  // "Hazır mısın?" kapısı ya da doğrudan soru
  const hazir = sayfa.getByRole("button", { name: /Hazırım|I'm ready|Ready/ }).first();
  await Promise.race([hazir.waitFor({ state: "visible", timeout: 20000 }).catch(() => {}), sayfa.locator(SORU).first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {})]);
  if (await hazir.count() && await hazir.isVisible().catch(() => false)) {
    await sakinBekle({ enCok: 4000, sonra: 250 });
    await yakala("klasik-hazir-kapisi", "Klasik — \"Hazır mısın?\" kapısı (joker seti)", { tekEkran: "klasik" });
    await dokun(hazir, 3000);
  } else notEkle("Klasik: \"Hazır mısın?\" kapısı görünmedi (maç doğrudan başladı)");
  // 3-2-1
  const sayim = sayfa.locator(".m1-sayim").first();
  await sayim.waitFor({ state: "visible", timeout: 12000 }).then(() => yakala("klasik-geri-sayim", "Klasik — maç başı 3-2-1", { olc: false, ertele: true })).catch(() => {});
  // Soru: metin görünür, sayım kalkmış, en az iki şık açık
  const soruHazir = async (sure) => sayfa.waitForFunction(({ sik, soru }) => !document.querySelector(".m1-sayim") && document.querySelector(soru) && document.querySelectorAll(sik).length >= 2, { sik: SIK, soru: SORU }, { timeout: sure, polling: 120 }).then(() => true).catch(() => false);
  if (!(await soruHazir(30000))) { yakalanamadi("Klasik: soru ekranı 30 sn'de açılmadı"); await bekleyenleriIsle(); return; }
  await yakala("klasik-soru", "Klasik — soru ekranı", { gorunmeli: [":is(.qt-sik, .bd-secenek)"], tekEkran: "klasik" });
  const ilkMetin = await sayfa.locator(SORU).first().innerText().catch(() => "");
  await dokun(sayfa.locator(SIK).first(), 3000);
  // Geri bildirim: şıklar kilitlenince
  await sayfa.waitForFunction((sik) => document.querySelectorAll(sik).length === 0, SIK, { timeout: 6000, polling: 100 }).then(() => yakala("klasik-cevap-sonrasi", "Klasik — cevap verildikten sonra (geri bildirim / rakip bekleniyor)", { olc: false, ertele: true })).catch(() => {});
  // İkinci soru
  const ikinci = await sayfa.waitForFunction(({ sik, soru, onceki }) => {
    const m = document.querySelector(soru)?.innerText ?? "";
    return m && m !== onceki && !document.querySelector(".m1-sayim") && document.querySelectorAll(sik).length >= 2;
  }, { sik: SIK, soru: SORU, onceki: ilkMetin }, { timeout: 30000, polling: 150 }).then(() => true).catch(() => false);
  if (ikinci) {
    await dokun(sayfa.locator(SIK).first(), 3000);
    await bekle(400);
  } else notEkle("Klasik: ikinci soru 30 sn'de gelmedi; ilk sorudan sonra çıkıldı");
  // Çıkış
  const cik = sayfa.getByRole("button", { name: /^(Maçtan çık|Leave match|Leave the match)$/ }).first();
  if (await cik.count() && await dokun(cik, 2500)) {
    const pencere = sayfa.locator("[aria-modal=true]").first();
    await pencere.waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
    await bekle(350);
    await yakala("klasik-cikis-onayi", "Klasik — \"Maçtan çık\" onay penceresi", {});
    const onay = sayfa.locator("[aria-modal=true] .qt-dugme--tehlike").first();
    if (await onay.count()) {
      await dokun(onay, 2500);
      await pencere.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
      await sayfa.waitForFunction((soru) => !document.querySelector(soru), SORU, { timeout: 12000, polling: 150 }).catch(() => {});
      await sakinBekle({ enCok: 8000 });
      await yakala("klasik-mac-sonu-terk", "Klasik — maç sonu: \"Maçtan ayrıldın\" sahnesi (2 sorudan sonra çıkış)", { tekEkran: "klasik" });
    } else { yakalanamadi("Klasik çıkış onayında düğme bulunamadı — maç açık kalmış olabilir"); await sayfa.keyboard.press("Escape").catch(() => {}); }
  } else yakalanamadi("Klasik: \"Maçtan çık\" düğmesi bulunamadı — maç açık kalmış olabilir");
  await bekleyenleriIsle();
  notEkle(`Klasik: ${ikinci ? 2 : 1} soru cevaplandı, ${Math.round((Date.now() - bas) / 1000)} sn`);
  yakalanamadi("Klasik — galibiyet/mağlubiyet maç sonu sahnesi (Lottie, ödül satırları): 20 soruluk maç sonuna kadar oynanmadı; yalnız \"Maçtan ayrıldın\" sahnesi alındı");
}

// ---------------------------------------------------------------- akış
let cikis = 0;
try {
  console.log(`▶ Ekran turu: ${ADRES} · bölümler: ${BOLUMLER.join(", ")}`);
  const yanit = await sayfa.goto(ADRES + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (!yanit || yanit.status() === 403) durduran = `Canlı site ${yanit?.status() ?? "yanıt vermedi"} (403 kuralı: tur durduruldu)`;
  else if (yanit.status() >= 400) durduran = `Canlı site ${yanit.status()} döndü`;
  if (!durduran) {
    // Oturum geçerli mi: kabuk (alt menü / OYNA) ya da giriş ekranı görünene dek bekle.
    const sonuc = (await Promise.race([
      sayfa.locator(".mobile-nav, .as-buyuk-dugme--oyna").first().waitFor({ state: "visible", timeout: 25000 }).then(() => "icerde").catch(() => null),
      sayfa.getByRole("button", { name: /Misafir olarak dene|Try as guest|Continue as guest/i }).first().waitFor({ state: "visible", timeout: 25000 }).then(() => "giris").catch(() => null),
    ])) ?? "belirsiz";
    if (sonuc === "giris") durduran = "Kayıtlı misafir oturumu canlıda geçersiz (giriş ekranı açıldı). Yeni hesap AÇILMADI.";
    else if (sonuc === "belirsiz") durduran = "Ana sayfa 25 sn'de açılmadı (ne kabuk ne giriş ekranı).";
  }
  if (!durduran) {
    await sakinBekle();
    const acilis = await sayfa.evaluate(() => { const p = [...document.querySelectorAll("[aria-modal=true]")].find((e) => e.getBoundingClientRect().height > 0); return p ? (p.querySelector("h1, h2, h3")?.textContent ?? "adsız pencere").trim() : null; }).catch(() => null);
    if (acilis) { bolum = "statik"; notEkle(`Ana sayfa açılışında pencere çıktı: "${acilis.slice(0, 60)}" — kapatıldı (içindeki ödül/eylem düğmesine dokunulmadı)`); }
    const plan = { statik: statikBolum, dar: darBolum, duello: duelloBolum, klasik: klasikBolum, en: ingilizceBolum };
    for (const b of ["statik", "dar", "duello", "klasik", "en"]) {
      if (!BOLUMLER.includes(b)) continue;
      bolum = b;
      if (durduran) break;
      if (sureDoldu()) { yakalanamadi(`bölüm atlandı: süre sınırı (${SURE_SINIRI_MS / 60000} dk) doldu`); continue; }
      console.log(`\n▶ ${b}`);
      for (const h of konsol.splice(0)) notEkle(`önceki bölümden kalan konsol hatası: ${h}`);
      const once = say.supabase;
      const t0 = Date.now();
      try { await plan[b](); }
      catch (e) { yakalanamadi(`bölüm yarıda kesildi: ${ilkSatir(e)}`); await bekleyenleriIsle().catch(() => {}); }
      veri.ozet.bolumIstek[b] = say.supabase - once;
      console.log(`  (${b}: ${Math.round((Date.now() - t0) / 1000)} sn, Supabase isteği ${say.supabase - once})`);
    }
  }
  if (durduran) { bolum = "durdu"; veri.ozet.notlar.unshift(`**TUR DURDU:** ${durduran}`); console.log("\n■ DURDU:", durduran); cikis = 2; }
} catch (e) {
  console.error("Beklenmeyen hata:", e);
  veri.ozet.notlar.unshift(`**Betik hatası:** ${ilkSatir(e)}`);
  cikis = 1;
} finally {
  await bekleyenleriIsle().catch(() => {});
  await tarayici.close().catch(() => {});
  veri.kayitlar.sort((a, b) => a.no - b.no);
  veri.ozet.sureSn = Math.round((Date.now() - BAS) / 1000);
  veri.ozet.kosular.push({ bolumler: BOLUMLER.join("+"), sureSn: veri.ozet.sureSn, toplam: say.toplam, supabase: say.supabase, hataDurum: { ...say.hataDurum } });
  // En çok çağrılan Supabase yolları (hafiflik denetimi)
  veri.ozet.istek.yollar = Object.fromEntries(Object.entries(say.yollar).sort((a, b) => b[1] - a[1]).slice(0, 25));
  veriYaz(veri);
  const bulgular = raporYaz(veri);
  const toplam = veri.kayitlar.reduce((t, k) => t + (k.bayt || 0), 0);
  console.log(`\n===== EKRAN TURU =====\n${veri.kayitlar.length} görüntü (${(toplam / 1048576).toFixed(2)} MB) · ${bulgular.length} bulgu · ${veri.ozet.sureSn} sn · istek ${say.toplam} (Supabase ${say.supabase})`);
  bulgular.slice(0, 5).forEach((b, i) => console.log(` ${i + 1}. ${TUR_ADI[b.tur]}: ${b.baslik} [${b.ekranlar.slice(0, 3).join(", ")}]`));
  if (veri.ozet.yakalanamayan.length) console.log("Yakalanamayanlar:\n - " + veri.ozet.yakalanamayan.join("\n - "));
}
process.exit(cikis);
