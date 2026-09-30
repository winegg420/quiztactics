/**
 * ÖZEL SABİT TASARIMLAR (ÖNİZLEME, yeni mod) — Su Altı · Yağan Kar · Düşen Sonbahar Yaprakları · Yıldızlı Gece.
 * Hareketli bileşenin donmuş karesi ya da ekran görüntüsü DEĞİL: hareketli hâlden BAĞIMSIZ, elle yerleştirilmiş kompozisyonlar.
 * Hareketi azalt açıkken, pil düşükken, 3 hareketli kart sınırı aşıldığında, hareketsiz kartta (lig sayfası, sabit kart) gösterilir.
 *
 * İki boyut: `kart` (~100 px yüksekliğinde kart) ve `serit` (lig satırı, 42 px yüksekliğinde geniş şerit).
 * İlkeler: bilinçli yerleşim ve derinlik (yakın büyük/net · orta · uzak küçük/yumuşak/sönük); yazı bölgesinde kalıcı parçacık YOK —
 * kompozisyon üst ve alt bantta, kenarlarda ve avatar çevresinde yoğunlaşır; şeritte ince detay yerine iri, kesilmiş (kenardan taşan) şekiller;
 * düşme/yükselme hissi yerleşimle verilir (kar ve yaprak yukarıdan aşağı eğik dizilim, baloncuklar aşağıdan yukarı kümeler, yıldızlar gökyüzü düzeni).
 * Yalnız mevcut çizimlerin öğeleri (kar tanesi, yaprak, baloncuk, yıldız, ay, tepe); palet aynı.
 *
 * Dört düzen: `ana` / `lig` (oyun içi katman kartları: bölge tabanlı, gerçek yerleşime göre) · `kart` (yatay ~100 px), `serit` (lig satırı 42 px), `dikey` (ortalı kart: avatar üstte, yazı altta; profil ~334×245, maç başı ~150×187 — konumlar yüzde, yazı bandı orta sütunda boş).
 * Öğe: [tip, x, y, s, op, açı, varyant]
 *   x: sayı = soldan px · "rN" = sağ kenardan N px (öğenin sağı; eksi = kesilir) · "pN" = genişliğin %N'i (soldan)
 *   y: üstten px (eksi = üstten kesilir) · "pN" = yüksekliğin %N'i (yalnız dikey) · s: kenar px · açı: derece (kar tanesi/yaprak) · varyant: tane 0-2, yaprak rengi 0-4, yıldız 1 = sarımsı
 * Yer açıklaması (kart 358×100): avatar x 14-86 y 14-86; yazı x ≥ 100, y 22-78; serbest: üst bant y<20, alt bant y>80, sol/sağ şerit, avatar çevresi.
 *             (şerit 358×42): sıra x 10-26, avatar x 36-70, ad x ≥ 80, puan sağda; serbest: üst/alt 9 px bant, kenarlar (10 px).
 */
import { Tane, Yaprak, YAPRAK_RENK } from "./KartArkaPlan.jsx";

export const SABIT_TURLER = ["su", "kar", "yaprak", "gece"];

const PARILTI_YOL = "M0 -5L1.1 -1.1L5 0L1.1 1.1L0 5L-1.1 1.1L-5 0L-1.1 -1.1Z";

const TASARIM = {
  // ------------------------------ YAĞAN KAR: yukarıdan aşağı eğik; üstte iri/yakın, altta daha küçük/uzak ------------------------------
  kar: {
    kart: [
      // uzak (küçük, sönük)
      ["nokta", "p17", 10, 4, .5], ["nokta", "p38", 13, 3.5, .5], ["nokta", "p56", 3, 4, .5], ["nokta", "p71", 12, 3, .5], ["nokta", "p95", 18, 4, .5],
      ["nokta", 3, 72, 4, .5], ["nokta", "p5", 92, 4, .5], ["nokta", "p33", 91, 3, .5], ["nokta", "p52", 93, 4, .45], ["nokta", "p75", 92, 3, .5],
      ["nokta", "p96", 84, 4, .5], ["nokta", "r3", 52, 3, .5], ["nokta", "p88", 94, 3, .45],
      // orta
      ["tane", "p29", 4, 11, .8, 0, 1], ["tane", "p61", 7, 10, .8, 30, 2], ["tane", "p90", 5, 12, .8, -20, 0], ["tane", 3, 12, 10, .8, 15, 2],
      ["tane", "p40", 86, 11, .8, 10, 1], ["tane", "p84", 82, 12, .8, 35, 2], ["tane", "r6", 64, 11, .8, -10, 1],
      // yakın (büyük, net)
      ["tane", "p9", -8, 22, 1, 20, 0], ["tane", "p47", -10, 20, 1, -15, 1], ["tane", "p76", -4, 17, .95, 40, 2],
      ["tane", -8, 40, 20, 1, 10, 1], ["tane", "r-7", 34, 18, 1, 50, 0],
      ["tane", "p22", 83, 18, .95, -30, 2], ["tane", "p63", 85, 16, .95, 15, 0],
    ],
    serit: [
      ["nokta", "p20", 2, 5, .5], ["nokta", "p62", 36, 5, .5],
      ["tane", "p21", 34, 14, .75, 20, 1], ["tane", "p44", 33, 12, .75, 0, 2], ["tane", "p67", 35, 16, .8, -15, 0], ["tane", "p88", 33, 13, .75, 40, 2],
      ["tane", "p30", 0, 8, .7, 0, 1], ["tane", "p72", 1, 8, .7, 20, 2],
      ["tane", "p10", -13, 24, 1, 10, 1], ["tane", "p31", -12, 20, 1, -20, 0], ["tane", "p55", -14, 24, 1, 30, 2], ["tane", "p74", -11, 18, 1, 0, 1], ["tane", "p93", -13, 22, 1, -10, 0],
      ["tane", -9, 13, 20, 1, 15, 2], ["tane", "r-10", 12, 18, 1, -25, 1],
    ],
    dikey: [
      // uzak
      ["nokta", "p30", "p4", 4, .5], ["nokta", "p68", "p7", 3.5, .5], ["nokta", "p50", "p2", 3, .45], ["nokta", "p14", "p30", 4, .5], ["nokta", "p82", "p36", 3.5, .5],
      ["nokta", "p9", "p58", 3.5, .5], ["nokta", "p88", "p64", 4, .5], ["nokta", "p5", "p80", 3.5, .5], ["nokta", "p92", "p84", 3.5, .5],
      ["nokta", "p22", "p95", 4, .5], ["nokta", "p60", "p96", 3.5, .5], ["nokta", "p78", "p94", 3, .45],
      // orta
      ["tane", "p20", "p6", 11, .8, 0, 1], ["tane", "p77", "p4", 10, .8, 30, 2], ["tane", "p3", "p26", 11, .8, -20, 0], ["tane", "p86", "p24", 12, .8, 15, 2],
      ["tane", "p6", "p52", 10, .8, 10, 1], ["tane", "p88", "p56", 11, .8, 35, 2], ["tane", "p36", "p96", 9, .8, -10, 1], ["tane", "p70", "p96", 9, .8, 20, 0],
      // yakın (büyük, net; üstte yoğun)
      ["tane", "p-3", "p1", 20, 1, 20, 0], ["tane", "p88", "p-2", 22, 1, -15, 1], ["tane", "p4", "p11", 17, .95, 40, 2], ["tane", "p90", "p15", 16, .95, -25, 0],
      ["tane", "p-4", "p42", 19, 1, 10, 1], ["tane", "r-6", "p40", 18, 1, 50, 2], ["tane", "p10", "p73", 15, .95, -30, 2], ["tane", "p86", "p77", 16, .95, 15, 0],
      ["tane", "p-2", "p87", 17, 1, 35, 1],
    ],
  },
  // ------------------------------ DÜŞEN SONBAHAR YAPRAKLARI: üstte iri, eğik yatan; altta daha küçük ------------------------------
  yaprak: {
    kart: [
      ["yaprak", "p33", 6, 10, .7, 25, 3], ["yaprak", "p62", 10, 10, .7, -30, 1], ["yaprak", "p95", 12, 10, .7, 50, 4], ["yaprak", 2, 12, 10, .7, -20, 2],
      ["yaprak", "p5", 90, 10, .7, 70, 0], ["yaprak", "p40", 90, 10, .7, -60, 3], ["yaprak", "p76", 92, 9, .7, 40, 1],
      ["yaprak", "p24", 85, 15, .9, 100, 4], ["yaprak", "p57", 84, 15, .9, -70, 2], ["yaprak", "p90", 80, 16, .92, 20, 0],
      ["yaprak", "p7", -4, 22, 1, 35, 0], ["yaprak", "p44", -6, 22, 1, -25, 1], ["yaprak", "p71", 0, 20, 1, 60, 3],
      ["yaprak", -5, 48, 18, 1, 15, 2], ["yaprak", "r-2", 26, 17, 1, -40, 4],
    ],
    serit: [
      ["yaprak", "p20", 35, 17, .85, -70, 3], ["yaprak", "p46", 34, 16, .85, 75, 1], ["yaprak", "p70", 35, 19, .9, 80, 4], ["yaprak", "p92", 34, 14, .85, -75, 2],
      ["yaprak", "p9", -11, 22, 1, 80, 0], ["yaprak", "p33", -12, 20, 1, -75, 2], ["yaprak", "p59", -13, 24, 1, 70, 1], ["yaprak", "p82", -12, 20, 1, -80, 3],
      ["yaprak", -6, 11, 18, 1, 30, 4], ["yaprak", "r-10", 12, 18, 1, -30, 0],
    ],
    dikey: [
      ["yaprak", "p22", "p5", 10, .7, 25, 3], ["yaprak", "p70", "p6", 10, .7, -30, 1], ["yaprak", "p4", "p27", 10, .7, 50, 4], ["yaprak", "p88", "p30", 10, .7, -20, 2],
      ["yaprak", "p6", "p54", 10, .7, 70, 0], ["yaprak", "p90", "p58", 10, .7, -60, 3], ["yaprak", "p38", "p96", 9, .7, 40, 1], ["yaprak", "p66", "p96", 9, .7, -45, 4],
      ["yaprak", "p10", "p12", 15, .9, 100, 4], ["yaprak", "p82", "p16", 15, .9, -70, 2], ["yaprak", "p2", "p74", 15, .9, 20, 0], ["yaprak", "p86", "p70", 16, .92, -25, 1],
      ["yaprak", "p-4", "p2", 22, 1, 35, 0], ["yaprak", "p86", "p-3", 22, 1, -25, 1], ["yaprak", "p-5", "p40", 19, 1, 60, 3], ["yaprak", "r-4", "p42", 18, 1, -40, 2],
      ["yaprak", "p-3", "p86", 18, 1, 15, 4], ["yaprak", "p90", "p86", 18, 1, -35, 3],
    ],
  },
  // ------------------------------ SU ALTI: aşağıdan yukarı kümeler; altta yoğun/büyük, yukarı doğru seyrek/küçük ------------------------------
  su: {
    kart: [
      // uzak
      ["kabarcik", "p26", 6, 4, .4], ["kabarcik", "p60", 14, 3.5, .4], ["kabarcik", "p82", 4, 4, .4], ["kabarcik", 4, 8, 4, .4], ["kabarcik", "r3", 20, 3.5, .4],
      ["kabarcik", "p34", 92, 4, .4], ["kabarcik", "p62", 93, 3.5, .4],
      // orta
      ["kabarcik", "p30", 4, 7, .7], ["kabarcik", "p55", 10, 5, .7], ["kabarcik", "p92", 7, 6, .7], ["kabarcik", "r5", 50, 7, .7], ["kabarcik", 3, 52, 6, .7],
      ["kabarcik", "p19", 90, 6, .72], ["kabarcik", "p47", 91, 6, .72], ["kabarcik", "p84", 90, 7, .72], ["kabarcik", "r4", 36, 5, .7],
      // yakın: alt kümeler + kenar sütunları (yukarı doğru küçülür)
      ["kabarcik", "p10", 88, 8, .95], ["kabarcik", "p15", 80, 12, .95], ["kabarcik", "p42", 84, 10, .95], ["kabarcik", "p52", 82, 14, .95],
      ["kabarcik", "p72", 87, 9, .95], ["kabarcik", "p78", 79, 13, .95], ["kabarcik", "p88", 82, 10, .95],
      ["kabarcik", "r1", 66, 10, .95], ["kabarcik", -2, 66, 9, .95], ["kabarcik", "r0", 34, 12, .95], ["kabarcik", -3, 26, 10, .95],
      ["kabarcik", "p68", 2, 9, .95],
    ],
    serit: [
      ["kabarcik", "p20", 1, 7, .7], ["kabarcik", "p48", 0, 8, .7], ["kabarcik", "p66", 2, 6, .65], ["kabarcik", "p84", 1, 8, .7],
      ["kabarcik", "p12", 31, 14, .95], ["kabarcik", "p25", 35, 10, .95], ["kabarcik", "p43", 30, 13, .95], ["kabarcik", "p58", 36, 8, .95], ["kabarcik", "p72", 30, 14, .95], ["kabarcik", "p90", 34, 10, .95],
      ["kabarcik", -3, 13, 10, .95], ["kabarcik", "r-2", 12, 10, .95],
    ],
    dikey: [
      ["kabarcik", "p24", "p5", 4, .4], ["kabarcik", "p64", "p9", 3.5, .4], ["kabarcik", "p44", "p3", 4, .4], ["kabarcik", "p4", "p20", 4, .4], ["kabarcik", "p92", "p28", 3.5, .4],
      ["kabarcik", "p10", "p45", 4, .4], ["kabarcik", "p88", "p52", 3.5, .4],
      ["kabarcik", "p16", "p14", 7, .7], ["kabarcik", "p76", "p18", 5, .7], ["kabarcik", "p2", "p38", 6, .7], ["kabarcik", "p90", "p40", 7, .7],
      ["kabarcik", "p8", "p58", 6, .7], ["kabarcik", "p88", "p60", 6, .7], ["kabarcik", "p5", "p72", 6, .72], ["kabarcik", "p92", "p74", 5, .72],
      ["kabarcik", "p36", "p96", 5, .7], ["kabarcik", "p68", "p96", 5, .7],
      // yakın: alt köşelerde kümeler, yukarı doğru küçülür
      ["kabarcik", "p2", "p90", 14, .95], ["kabarcik", "p10", "p84", 10, .95], ["kabarcik", "p5", "p78", 8, .95], ["kabarcik", "p17", "p93", 9, .95],
      ["kabarcik", "p86", "p88", 13, .95], ["kabarcik", "p80", "p92", 9, .95], ["kabarcik", "p92", "p80", 9, .95], ["kabarcik", "p-3", "p62", 12, .95], ["kabarcik", "r-3", "p34", 11, .95],
      ["kabarcik", "p-2", "p22", 10, .95], ["kabarcik", "p84", "p8", 9, .95],
    ],
  },
  // ------------------------------ YILDIZLI GECE: gökyüzü düzeni (üstte yıldızlar, sağ üstte ay, altta tepeler) ------------------------------
  gece: {
    kart: [
      ["ay", "r16", 3, 16],
      ["nokta", "p14", 5, 3, .7], ["nokta", "p25", 14, 2.5, .6], ["nokta", "p47", 4, 3, .8], ["nokta", "p66", 12, 2.5, .6], ["nokta", "p80", 2, 3, .85, 0, 1], ["nokta", "p93", 16, 3, .7],
      ["nokta", 4, 6, 3, .8], ["nokta", 6, 90, 2.5, .6], ["nokta", "p28", 79, 2.5, .6], ["nokta", "p52", 78, 3, .7, 0, 1], ["nokta", "p74", 80, 2.5, .6], ["nokta", "r4", 60, 3, .7], ["nokta", 2, 48, 2.5, .7], ["nokta", "r3", 44, 2.5, .6, 0, 1],
      ["parilti", "p8", 2, 11, 1], ["parilti", "p37", 4, 9, .85, 0, 1], ["parilti", "p57", 1, 12, 1], ["parilti", "p74", 6, 8, .8], ["parilti", 1, 30, 9, .9, 0, 1],
      ["parilti", "r4", 34, 10, .95], ["parilti", "p43", 79, 8, .7],
      ["tepe", 0, 0, 20],
    ],
    serit: [
      ["ay", "p64", 13, 14],
      ["parilti", "p9", 0, 9, 1], ["parilti", "p29", 1, 8, .85, 0, 1], ["parilti", "p52", 0, 10, 1], ["parilti", "p79", 1, 8, .85], ["parilti", "p93", 0, 9, .95, 0, 1],
      ["parilti", "p18", 31, 8, .8], ["parilti", "p56", 31, 7, .75, 0, 1], ["parilti", "p84", 32, 8, .85],
      ["nokta", "p38", 5, 4, .8], ["nokta", "p70", 4, 4, .8, 0, 1], ["nokta", 2, 31, 4, .8],
      ["tepe", 0, 0, 10],
    ],
    dikey: [
      ["ay", "r10", "p3", 18],
      ["nokta", "p14", "p3", 3, .7], ["nokta", "p30", "p9", 2.5, .6], ["nokta", "p58", "p2", 3, .8], ["nokta", "p44", "p12", 2.5, .6], ["nokta", "p70", "p20", 3, .85, 0, 1],
      ["nokta", "p5", "p24", 3, .8], ["nokta", "p93", "p30", 2.5, .6], ["nokta", "p10", "p46", 3, .7, 0, 1], ["nokta", "p90", "p48", 2.5, .7], ["nokta", "p4", "p62", 2.5, .6],
      ["nokta", "p95", "p66", 3, .7, 0, 1], ["nokta", "p7", "p80", 2.5, .6],
      ["parilti", "p20", "p5", 11, 1], ["parilti", "p80", "p10", 9, .85, 0, 1], ["parilti", "p8", "p14", 12, 1], ["parilti", "p64", "p8", 8, .8],
      ["parilti", "p2", "p34", 9, .9, 0, 1], ["parilti", "p90", "p38", 10, .95], ["parilti", "p12", "p56", 8, .8], ["parilti", "p88", "p58", 8, .75, 0, 1],
      ["tepe", 0, 0, 30],
    ],
  },
};

// ------------------------------ OYUN İÇİ KARTLAR (katman): gerçek yerleşime göre bölge tabanlı kompozisyon ------------------------------
// Oyundaki ana sayfa kartı (~366×103: ad üstte x 96-251 · rütbe satırı x 96-174 y 59-75 · sağda Puan/Seri x 315-352 · XP çubuğu y 82-93) ve lig satırı
// (~366×56: sıra x 25-35 · ad x 108-254 · Çaylak/şampiyon satırı y 32-48 · puan x 278-306) önizlemedeki örnek kartlardan FARKLI; bu yüzden yazı
// bölgesi DIŞINDaki serbest bölgeler elle belirlenir (x: sayı = öğe merkezi soldan px, [ "r", a, b ] = öğe merkezi sağ kenardan a-b px; y: merkez px,
// kartın dışına taşanlar kesilir). Öğeler sabit tohumla, birbirine çarpmadan yerleştirilir → aynı girdi aynı sahne. n = öğe sayısı.
const BOLGE = {
  ana: [
    { x: [-2, 7], y: [8, 96], n: 3 },             // sol kenar (avatarın solu)
    { x: [100, 270], y: [-12, -6], n: 4, kes: 1 },   // üst kenardan taşan büyükler (yalnız alt kenarları görünür)
    { r: [66, 84], y: [10, 46], n: 4, max: 13 },         // ad ile Puan arasındaki cep
    { x: [190, 262], y: [52, 68], n: 4 },            // rütbe satırının sağı
    { x: [100, 270], y: [100, 105], n: 4, kes: 1 }, // alt kenardan taşan
    { r: [-2, 5], y: [10, 98], n: 3 },             // sağ kenar
  ],
  lig: [
    { x: [-2, 14], y: [6, 50], n: 4 },             // sıra numarasının solu
    { x: [108, 296], y: [-12, -6], n: 3, kes: 1 },  // üst kenardan taşan
    { r: [14, 46], y: [8, 48], n: 6 },             // puanın sağı
    { x: [108, 296], y: [62, 68], n: 3, kes: 1 },  // alt kenardan taşan
  ],
};
const BOLGE_TOHUM = { kar: 311, yaprak: 419, su: 523, gece: 617 };
const ay_ = (r, a, b) => a + r() * (b - a);
function rastgele(tohum) {
  let a = tohum | 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Bir bölgeden tür'e uygun öğe (boyut, opaklık, açı) üretir; kes = kenardan taşan (büyük) öğe. */
function ogeUret(tur, r, kes, lig) {
  const k = lig ? 0.85 : 1;
  if (tur === "kar") {
    const t = kes ? 1 : r();
    if (t < 0.3) return { tip: "nokta", s: ay_(r, 3, 4.5), op: .5 };
    if (t < 0.65) return { tip: "tane", s: ay_(r, 9, 13) * k, op: .8, a: ay_(r, -30, 40), v: Math.floor(r() * 3) };
    return { tip: "tane", s: ay_(r, 15, 21) * k, op: 1, a: ay_(r, -30, 40), v: Math.floor(r() * 3) };
  }
  if (tur === "yaprak") { const s = (kes ? ay_(r, 17, 21) : ay_(r, 11, 20)) * k; return { tip: "yaprak", s, op: +(0.7 + Math.min(1, (s - 11) / 10) * 0.3).toFixed(2), a: ay_(r, -75, 75), v: Math.floor(r() * 5) }; }
  if (tur === "su") { const s = kes ? ay_(r, 10, 14) : ay_(r, 4, 14) * (lig ? 0.85 : 1); return { tip: "kabarcik", s, op: s < 5.5 ? .4 : s < 9 ? .7 : .95 }; }
  const t = r();   // gece
  if (t < 0.55) return { tip: "nokta", s: ay_(r, 2.5, 3.5), op: +ay_(r, .6, .85).toFixed(2), v: r() < 0.3 ? 1 : 0 };
  return { tip: "parilti", s: ay_(r, 8, 12) * k, op: +ay_(r, .75, 1).toFixed(2), v: r() < 0.4 ? 1 : 0 };
}
/** Bölge listesinden [tip, x, y, s, op, açı, varyant] satırları (Oge biçimi). */
function bolgeliTasarim(tur, yer) {
  const lig = yer === "lig";
  const r = rastgele(BOLGE_TOHUM[tur] + (lig ? 7 : 0));
  const yerlesen = []; const liste = [];
  const W = 366;   // kart genişliği tahmini (yalnız çakışma denetimi için; konum sağ/sol kenara bağlı)
  for (const z of BOLGE[yer]) {
    for (let i = 0; i < z.n; i++) {
      let o = null; let cx = 0; let cy = 0;
      for (let deneme = 0; deneme < 40; deneme++) {
        o = ogeUret(tur, r, z.kes, lig);
        if (z.max && o.s > z.max) o.s = z.max;   // dar cepler: öğe boyutu sınırlı
        cy = ay_(r, z.y[0], z.y[1]);
        cx = z.r ? W - ay_(r, z.r[0], z.r[1]) : ay_(r, z.x[0], z.x[1]);
        if (!yerlesen.some((q) => Math.hypot(q.cx - cx, q.cy - cy) < (q.s + o.s) * 0.62)) break;
      }
      yerlesen.push({ cx, cy, s: o.s });
      const x = z.r ? `r${+(W - cx - o.s / 2).toFixed(1)}` : +(cx - o.s / 2).toFixed(1);
      liste.push([o.tip, x, +(cy - o.s / 2).toFixed(1), +o.s.toFixed(1), o.op, o.a ?? 0, o.v ?? 0]);
    }
  }
  if (tur === "gece") { liste.unshift(lig ? ["ay", "r14", 12, 16] : ["ay", "r66", 6, 16]); liste.push(["tepe", 0, 0, lig ? 8 : 11]); }
  return liste;
}
const BOLGELI = {};
function bolgeliListe(tur, yer) { const a = tur + yer; return (BOLGELI[a] ??= bolgeliTasarim(tur, yer)); }

function konum(x) {
  if (typeof x === "number") return { left: x };
  if (x[0] === "r") return { right: Number(x.slice(1)) };
  return { left: `${Number(x.slice(1))}%` };
}
/** y: sayı = üstten px · "pN" = yüksekliğin %N'i (dikey kartlar) */
const yKonum = (y) => (typeof y === "number" ? y : `${Number(y.slice(1))}%`);

function Oge({ o }) {
  const [tip, x, y, s, op = 1, a = 0, v = 0] = o;
  if (tip === "tepe") {
    return (
      <svg className="abp-st-tepe" style={{ height: s }} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 22Q20 8 40 20T76 14T100 18V40H0Z" fill="#232C7A" opacity=".95" />
        <path d="M0 32Q28 22 56 31T100 27V40H0Z" fill="#0A0F30" />
      </svg>
    );
  }
  const stil = { ...konum(x), top: yKonum(y), width: s, height: s, opacity: op };
  const uzak = op < 0.6 && tip !== "parilti";
  let ic;
  if (tip === "tane") ic = <span className="abp-st-ic" style={{ rotate: `${a}deg` }}><span className="abp-hale" /><Tane v={v} /></span>;
  else if (tip === "yaprak") ic = <span className="abp-st-ic" style={{ rotate: `${a}deg` }}><Yaprak renk={YAPRAK_RENK[v % YAPRAK_RENK.length]} /></span>;
  else if (tip === "kabarcik") ic = <span className={`abp-kabarcik${s >= 10 ? " abp-kabarcik--b" : ""}`} />;
  else if (tip === "nokta") ic = <span className="abp-nokta" />;
  else if (tip === "ay") {
    stil.opacity = 1;
    return (
      <span className="abp-st" style={stil} aria-hidden="true">
        <i style={{ position: "absolute", left: "-85%", top: "-85%", width: "270%", height: "270%", borderRadius: "50%", background: "radial-gradient(circle closest-side, rgba(255, 244, 200, .22) 0, rgba(255, 244, 200, 0) 100%)" }} />
        <svg viewBox="0 0 20 20" focusable="false"><path d="M11 1.5a8.6 8.6 0 1 0 7.5 12.6a6.7 6.7 0 1 1 -7.5 -12.6Z" fill="#FFF4C8" /></svg>
      </span>
    );
  } else if (tip === "parilti") {
    const renk = v === 1 ? "#FFF1B8" : "#FFFFFF";
    return (
      <span className="abp-st" style={stil} aria-hidden="true"><svg viewBox="-5 -5 10 10" focusable="false"><path d={PARILTI_YOL} fill={renk} /></svg></span>
    );
  }
  return <span className={`abp-st${uzak ? " abp-st--uzak" : ""}`} style={stil} aria-hidden="true">{ic}</span>;
}

/** Yıldız noktası (Gece): sarımsı/beyaz, mevcut .abp-gece-yildiz--nokta çizimi. */
function GeceNokta({ o }) {
  const [, x, y, s, op = 1, , v = 0] = o;
  const renk = v === 1 ? "#FFF1B8" : "#FFFFFF";
  return <span className="abp-gece-yildiz abp-gece-yildiz--nokta" style={{ ...konum(x), top: yKonum(y), width: s, height: s, opacity: op, "--yr": renk }} aria-hidden="true" />;
}

export default function SabitTasarim({ tur, k, duzen = "yatay", katman = false }) {
  const T = TASARIM[tur];
  if (!T) return null;
  const liste = duzen === "dikey" && T.dikey ? T.dikey : katman ? bolgeliListe(tur, k ? "lig" : "ana") : k ? T.serit : T.kart;
  return (
    <>
      {liste.map((o, i) => (tur === "gece" && o[0] === "nokta" ? <GeceNokta key={i} o={o} /> : <Oge key={i} o={o} />))}
    </>
  );
}
