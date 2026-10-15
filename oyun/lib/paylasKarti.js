// ============================================================
// PAYLAŞIM KARTI — 1080×1920 PNG (canvas; harici kütüphane yok).
// İki çeşit: "sonuc" (oyuncu avatarı, takma ad, skor, "Beni yenebilir misin?") ve
// "davet" (logo, "Quiz Tactics'te bana meydan oku"). İkisinde de davet kodu + bağlantı yazar.
// Renk ve yazı tipleri oyunun kendisinden: gök zemin (--bg), turuncu vurgu (--primary),
// altın (--accent), maç sonu lacivert konturu (--msk-lac), Baloo 2 başlık + Nunito gövde.
// Metinler tt() ile — profil dili (TR/EN) aynen uygulanır.
// ============================================================
import { tt } from "./dil.js";

export const KART_EN = 1080;
export const KART_BOY = 1920;

const RENK = {
  gokUst: "#CDEEFF", gok: "#EAF7FF", kum: "#FFF6E8",
  lac: "#1f2a5c", metin: "#20324A", soluk: "#5A7089",
  turuncu: "#ff7a2e", turuncuKoyu: "#c24a0c", altin: "#FFC53D", yesil: "#2FBF71", beyaz: "#FFFFFF",
};
const BASLIK = '"Baloo 2", "Trebuchet MS", system-ui, sans-serif';
const GOVDE = '"Nunito", system-ui, sans-serif';
const LOGO = "/quiztactics-logo-yatay.svg?v=20260930-r";
const Q_IKON = "/quiztactics-q-icon-512.png";

/** Görseli yükler; CORS/ağ hatasında null (kart görselsiz çizilir, tuval kirlenmez). */
function gorselYukle(src) {
  return new Promise((coz) => {
    if (!src) { coz(null); return; }
    const g = new Image();
    g.crossOrigin = "anonymous";
    g.referrerPolicy = "no-referrer";
    g.onload = () => coz(g);
    g.onerror = () => coz(null);
    g.src = src;
  });
}

async function yaziTipleriHazir() {
  try {
    if (!document.fonts?.load) return;
    await Promise.all([
      document.fonts.load(`800 120px ${BASLIK}`, "Quiz Tactics ğüşıöç"),
      document.fonts.load(`700 60px ${GOVDE}`, "Quiz Tactics ğüşıöç"),
      document.fonts.load(`900 60px ${GOVDE}`, "0123456789"),
    ]);
  } catch { /* sistem yazı tipiyle çizilir */ }
}

function yuvarlakDikdortgen(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Kalın lacivert konturlu dolu kutu (maç sonu kartlarıyla aynı dil: düz renk + alt kalınlık). */
function kutu(c, x, y, w, h, r, dolgu, kontur = RENK.lac, kalinlik = 8, alt = 14) {
  if (alt) {
    yuvarlakDikdortgen(c, x, y + alt, w, h, r);
    c.fillStyle = kontur;
    c.fill();
  }
  yuvarlakDikdortgen(c, x, y, w, h, r);
  c.fillStyle = dolgu;
  c.fill();
  c.lineWidth = kalinlik;
  c.strokeStyle = kontur;
  c.stroke();
}

/** Metni genişliğe sığacak şekilde satırlara böler (en çok maxSatir; taşan son satır "…"). */
function satirla(c, metin, genislik, maxSatir = 3) {
  const kelimeler = String(metin ?? "").split(/\s+/).filter(Boolean);
  const satirlar = [];
  let sat = "";
  for (const k of kelimeler) {
    const aday = sat ? `${sat} ${k}` : k;
    if (c.measureText(aday).width <= genislik || !sat) sat = aday;
    else { satirlar.push(sat); sat = k; }
  }
  if (sat) satirlar.push(sat);
  if (satirlar.length > maxSatir) {
    const kalan = satirlar.slice(0, maxSatir);
    let son = kalan[maxSatir - 1];
    while (son.length > 1 && c.measureText(son + "…").width > genislik) son = son.slice(0, -1);
    kalan[maxSatir - 1] = son + "…";
    return kalan;
  }
  return satirlar;
}

/** Tek satırı genişliğe sığdırır: önce yazı küçülür (en az min), yetmezse kısaltılır. */
function sigdir(c, metin, genislik, boyut, min, agirlik, aile) {
  let b = boyut;
  c.font = `${agirlik} ${b}px ${aile}`;
  while (b > min && c.measureText(metin).width > genislik) { b -= 4; c.font = `${agirlik} ${b}px ${aile}`; }
  let m = String(metin ?? "");
  while (m.length > 1 && c.measureText(m).width > genislik) m = m.slice(0, -1);
  return m === metin ? m : m.replace(/.$/, "…");
}

function zemin(c) {
  const g = c.createLinearGradient(0, 0, 0, KART_BOY);
  g.addColorStop(0, RENK.gokUst);
  g.addColorStop(0.35, RENK.gok);
  g.addColorStop(1, RENK.kum);
  c.fillStyle = g;
  c.fillRect(0, 0, KART_EN, KART_BOY);
  // Maç sonu sahnesindeki ışınların durgun hâli: merkezden yayılan yumuşak beyaz dilimler
  c.save();
  c.translate(KART_EN / 2, 760);
  for (let i = 0; i < 16; i++) {
    c.rotate((Math.PI * 2) / 16);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-90, -1500);
    c.lineTo(90, -1500);
    c.closePath();
    c.fillStyle = i % 2 ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.12)";
    c.fill();
  }
  c.restore();
  const h = c.createRadialGradient(KART_EN / 2, 760, 40, KART_EN / 2, 760, 620);
  h.addColorStop(0, "rgba(255,255,255,0.85)");
  h.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = h;
  c.fillRect(0, 0, KART_EN, KART_BOY);
}

function avatarCiz(c, gorsel, ad, cx, cy, r) {
  c.save();
  c.beginPath();
  c.arc(cx, cy + 12, r, 0, Math.PI * 2);
  c.fillStyle = RENK.lac;
  c.fill();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = RENK.beyaz;
  c.fill();
  c.clip();
  if (gorsel) {
    const o = Math.max((2 * r) / gorsel.width, (2 * r) / gorsel.height);
    const w = gorsel.width * o, h = gorsel.height * o;
    c.drawImage(gorsel, cx - w / 2, cy - h / 2, w, h);
  } else {
    c.fillStyle = RENK.turuncu;
    c.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    c.fillStyle = RENK.beyaz;
    c.font = `800 ${Math.round(r)}px ${BASLIK}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(ad ?? "?").charAt(0).toUpperCase(), cx, cy + r * 0.08);
  }
  c.restore();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.lineWidth = 12;
  c.strokeStyle = RENK.lac;
  c.stroke();
}

function logoCiz(c, logo, y, genislik) {
  if (!logo) {
    c.fillStyle = RENK.lac;
    c.font = `800 110px ${BASLIK}`;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillText("Quiz Tactics", KART_EN / 2, y + 100);
    return 130;
  }
  const h = (genislik * logo.height) / logo.width;
  c.drawImage(logo, (KART_EN - genislik) / 2, y, genislik, h);
  return h;
}

/** Alttaki davet kodu kutusu: "Davet kodu" · KOD · bağlantı. */
function davetKutusu(c, kod, baglanti) {
  const x = 90, w = KART_EN - 180, y = 1500, h = 300;
  kutu(c, x, y, w, h, 44, RENK.beyaz);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = RENK.soluk;
  c.font = `800 44px ${GOVDE}`;
  c.fillText(kod ? tt("Davet kodu") : tt("Hemen oyna"), KART_EN / 2, y + 74);
  if (kod) {
    c.fillStyle = RENK.turuncuKoyu;
    const k = sigdir(c, String(kod).split("").join(" "), w - 80, 112, 64, 800, BASLIK);
    c.fillText(k, KART_EN / 2, y + 186);
  }
  const yalin = String(baglanti ?? "").replace(/^https?:\/\//, "");
  c.fillStyle = RENK.metin;
  c.fillText(sigdir(c, yalin, w - 80, 46, 30, 800, GOVDE), KART_EN / 2, y + (kod ? 258 : 190));
}

/**
 * Kartı çizer, PNG Blob döner.
 * @param {{ tur: "sonuc"|"davet", ad?: string, avatar?: string|null, benSkor?: number, rakipSkor?: number,
 *           durum?: "kazandi"|"kaybetti"|"berabere", rakipAd?: string, skorEtiket?: string, derece?: number|null,
 *           kod?: string|null, baglanti: string }} v
 * @returns {Promise<Blob>}
 */
export async function paylasKartiCiz(v) {
  await yaziTipleriHazir();
  const tuval = document.createElement("canvas");
  tuval.width = KART_EN;
  tuval.height = KART_BOY;
  const c = tuval.getContext("2d");
  const [logo, avatar, qIkon] = await Promise.all([
    gorselYukle(LOGO),
    v.tur === "sonuc" ? gorselYukle(v.avatar) : Promise.resolve(null),
    v.tur === "davet" ? gorselYukle(Q_IKON) : Promise.resolve(null),
  ]);

  // 15 Eki (Codex taraması): çizim bölümler arasında ana iş parçacığını bırakır (metin ölçümü — sigdir/satirla — CPU 6x'te
  // maç sonu sahnesinde 130 ms'lik görevdi). Komutlar ve sıraları aynı → piksel aynı.
  const ara = () => new Promise((r) => setTimeout(r, 0));
  const ciz = async (avatarGorsel) => {
    c.clearRect(0, 0, KART_EN, KART_BOY);
    zemin(c);
    logoCiz(c, logo, 120, 720);
    await ara();
    c.textAlign = "center";
    c.textBaseline = "alphabetic";

    if (v.tur === "sonuc") {
      avatarCiz(c, avatarGorsel, v.ad, KART_EN / 2, 560, 180);
      c.fillStyle = RENK.lac;
      c.fillText(sigdir(c, v.ad ?? "", KART_EN - 160, 92, 56, 800, BASLIK), KART_EN / 2, 845);
      await ara();
      // Skor kutusu: sonuç afişi + "7 – 5" + "doğru · Rakip adına karşı"
      const x = 120, w = KART_EN - 240, y = 885, h = 330;
      const afis = v.durum === "kazandi" ? RENK.altin : v.durum === "berabere" ? "#C9F2DD" : RENK.beyaz;
      kutu(c, x, y, w, h, 48, afis);
      c.fillStyle = RENK.lac;
      c.font = `800 64px ${BASLIK}`;
      const baslik = v.durum === "kazandi" ? tt("Kazandım!") : v.durum === "berabere" ? tt("Berabere!") : tt("Rövanş zamanı!");
      c.fillText(baslik, KART_EN / 2, y + 92);
      c.font = `800 150px ${BASLIK}`;
      // Çok oyunculu modlar (Grup, Turnuva): skor yerine derece ("2.")
      c.fillText(v.derece ? tt("{n}.", { n: v.derece }) : `${Number(v.benSkor ?? 0)} – ${Number(v.rakipSkor ?? 0)}`, KART_EN / 2, y + 236);
      c.fillStyle = RENK.metin;
      const alt = v.rakipAd ? tt("{ad} karşısında", { ad: v.rakipAd }) : (v.skorEtiket ?? "");
      c.fillText(sigdir(c, alt, w - 80, 44, 30, 700, GOVDE), KART_EN / 2, y + 298);
      await ara();
      // Çağrı
      c.fillStyle = RENK.turuncu;
      c.font = `800 104px ${BASLIK}`;
      const satirlar = satirla(c, tt("Beni yenebilir misin?"), KART_EN - 140, 2);
      satirlar.forEach((s, i) => c.fillText(s, KART_EN / 2, 1395 + i * 100 - (satirlar.length - 1) * 50));
    } else {
      // Q simgesi + çağrı başlığı
      if (qIkon) {
        c.save();
        yuvarlakDikdortgen(c, KART_EN / 2 - 230, 400 + 14, 460, 460, 110);
        c.fillStyle = RENK.lac;
        c.fill();
        yuvarlakDikdortgen(c, KART_EN / 2 - 230, 400, 460, 460, 110);
        c.clip();
        c.drawImage(qIkon, KART_EN / 2 - 230, 400, 460, 460);
        c.restore();
        yuvarlakDikdortgen(c, KART_EN / 2 - 230, 400, 460, 460, 110);
        c.lineWidth = 12;
        c.strokeStyle = RENK.lac;
        c.stroke();
      }
      c.fillStyle = RENK.lac;
      c.font = `800 118px ${BASLIK}`;
      const satirlar = satirla(c, tt("Quiz Tactics'te bana meydan oku"), KART_EN - 140, 3);
      satirlar.forEach((s, i) => c.fillText(s, KART_EN / 2, 1040 + i * 118));
      c.fillStyle = RENK.metin;
      if (v.ad) {
        c.fillText(sigdir(c, tt("{ad} seni bekliyor", { ad: v.ad }), KART_EN - 160, 56, 36, 800, GOVDE),
          KART_EN / 2, 1040 + satirlar.length * 118 + 40);
      }
    }
    await ara();
    davetKutusu(c, v.kod, v.baglanti);
  };

  await ciz(avatar);
  try {
    return await tuvaldenPng(tuval);
  } catch {
    // Avatar başka kaynaktan gelip tuvali kirlettiyse: avatarsız (baş harf) yeniden çiz
    await ciz(null);
    return tuvaldenPng(tuval);
  }
}

// 15 Eki (Codex taraması): toBlob'un eşzamanlı geri okuması maç sonu sahnesinde kareyi kesiyordu → PNG kodlama bir
// Worker'da (paylasKartiIsci.js). Destek yoksa / hata olursa (ör. kirli tuval) eski toBlob yolu — sonuç aynı.
let isci = null, isciNo = 0;
const isciBekleyen = new Map();
function isciAl() {
  if (isci === false) return null;
  if (isci) return isci;
  try {
    if (typeof Worker !== "function" || typeof OffscreenCanvas !== "function" || typeof createImageBitmap !== "function") throw new Error("destek yok");
    isci = new Worker(new URL("./paylasKartiIsci.js", import.meta.url), { type: "module" });
    isci.onmessage = (e) => {
      const b = isciBekleyen.get(e.data?.no);
      if (!b) return;
      isciBekleyen.delete(e.data.no);
      if (e.data.blob) b.coz(e.data.blob); else b.at(new Error(e.data.hata || "PNG üretilemedi"));
    };
    isci.onerror = () => { for (const b of isciBekleyen.values()) b.at(new Error("işçi hatası")); isciBekleyen.clear(); isci = false; };
    return isci;
  } catch {
    isci = false;
    return null;
  }
}
async function isciPng(tuval) {
  const w = isciAl();
  if (!w) throw new Error("işçi yok");
  const bitmap = await createImageBitmap(tuval);
  const no = ++isciNo;
  return new Promise((coz, at) => {
    isciBekleyen.set(no, { coz, at });
    w.postMessage({ no, bitmap }, [bitmap]);
  });
}

async function tuvaldenPng(tuval) {
  try { return await isciPng(tuval); } catch { /* eski yol */ }
  return new Promise((coz, at) => {
    try {
      tuval.toBlob((b) => (b ? coz(b) : at(new Error("PNG üretilemedi"))), "image/png");
    } catch (e) {
      at(e);
    }
  });
}
