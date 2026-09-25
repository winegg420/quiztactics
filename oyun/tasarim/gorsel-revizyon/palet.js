// ============================================================
// ORTAK PALET — görsel revizyon (tasarim/BRIEF_GORSEL_REVIZYON.md › A6)
// Bütün yeni çizimler (coin, elmas, lig/level/turnuva çerçevesi, amblem, rozet, logo, oyuncu kartı…)
// YALNIZ buradaki renkleri kullanır. Kaynak: profil avatarlarının çizim dili
// (oyun/components/AvatarProIllustrations*.jsx › CIZGI, Sahne), elmas paketi görselleri
// (premium/elmas/ElmasPaketGorseli.jsx) ve Işık Şeritli altın isim (ekranlar/altin-isim.css).
//
// Kurallar: kalın koyu lacivert kontur · düz dolgu + 2–3 ton hücre gölgesi · ışık SOL ÜSTTEN ·
// tek beyaz parlama vuruşu · fotogerçekçi degrade / 3B plastik parlaklık YOK.
// Metal: her metal 3 ton (acik = ışık alan yüz, orta = ana dolgu, koyu = gölge) + kenar (kontura yakın derin ton).
// ============================================================

/** Avatarlarla aynı kontur: 320 birimlik tuvalde 5 birim → boyutun ~%1,6'sı. */
export const KONTUR = "#0b1220";
export const KONTUR_ORAN = 5 / 320;
/** Verilen tuval boyu için kontur kalınlığı (avatarla aynı oran; küçük boyda en az 1,5). */
export const konturKalinligi = (tuval = 320) => Math.max(1.5, tuval * KONTUR_ORAN);
export const CIZGI = { stroke: KONTUR, strokeLinecap: "round", strokeLinejoin: "round" };

/** Tek beyaz parlama vuruşu ve krem (avatarlardaki göz/diş beyazı). */
export const PARLAMA = "#ffffff";
export const KREM = "#fff8ec";

/** Metaller — acik / orta / koyu / kenar. Altın = canlı sarı (altın isim tonu), hardal değil. */
export const METAL = {
  bronz:  { acik: "#ffc38f", orta: "#e0894a", koyu: "#b35d24", kenar: "#7a3a12" },
  gumus:  { acik: "#ffffff", orta: "#d3dcea", koyu: "#95a3ba", kenar: "#5d6b85" },
  altin:  { acik: "#fff3a0", orta: "#ffd23a", koyu: "#f0a018", kenar: "#b86a00" },
  elmas:  { acik: "#dcfcff", orta: "#8ae9ff", koyu: "#3fc4ee", kenar: "#1f7fb8" },
  efsane: { acik: "#ffd6f0", orta: "#ff7ab8", koyu: "#9d74f0", kenar: "#5a2fb0" },
};

/** Taş / vurgu renkleri (avatar sahneleriyle aynı aile). */
export const TAS = {
  yakut: "#ff2a4a", yakutKoyu: "#b8102c",
  zumrut: "#2fbf71", zumrutKoyu: "#1b8a4f",
  safir: "#3b91e8", safirKoyu: "#1f5fb0",
  ametist: "#9d74f0", ametistKoyu: "#6a45c8",
};

/** Avatar sahne zeminleri (Sahne renk) — ikon ve rozet zeminlerinde de bunlar. */
export const SAHNE = {
  sari: "#f2b23c", yesil: "#8cbf3f", mavi: "#4a9dd9", kirmizi: "#e8543f",
  mor: "#8b6fd6", turkuaz: "#3bb6b0", pembe: "#e0729a", lacivert: "#3b4a6b",
};

/** Marka: gök mavisi zemin, turuncu vurgu, lacivert yazı (Güneş Halkası / Şeker Kutusu). */
export const MARKA = {
  gok: "#dff0ff", gokKoyu: "#a9d6ff", turuncu: "#ff7a2e", turuncuKoyu: "#c2410c",
  lacivert: "#1d2152", beyaz: "#ffffff",
};

/** Nadirlik (A7): renk eşyaya değil KART KENARINA ve etikete. */
export const NADIRLIK = {
  siradan:  { ad: "SIRADAN",  renk: "#9aa6b8", koyu: "#5d6b85", acik: "#eef1f6" },
  nadir:    { ad: "NADİR",    renk: "#3b91e8", koyu: "#1f5fb0", acik: "#dcecff" },
  epik:     { ad: "EPİK",     renk: "#9d74f0", koyu: "#5a2fb0", acik: "#efe6ff" },
  efsanevi: { ad: "EFSANEVİ", renk: "#ffd23a", koyu: "#b86a00", acik: "#fff6cc" },
};

/** Lig sırası ve metal eşlemesi (kademe yalnız renkle değil, ŞEKİL + SÜSLE ayrışır — renk yardımcıdır). */
export const LIGLER = [
  { anahtar: "bronz", ad: "Bronz", metal: "bronz" },
  { anahtar: "gumus", ad: "Gümüş", metal: "gumus" },
  { anahtar: "altin", ad: "Altın", metal: "altin" },
  { anahtar: "elmas", ad: "Elmas", metal: "elmas" },
  { anahtar: "efsane", ad: "Efsane", metal: "efsane" },
];

/** EK (Ajan A): pırlanta faset tonları — elmas paketi görselleriyle (premium/elmas/ElmasPaketGorseli.jsx › R)
 *  BİREBİR aynı; elmas ikonu paket ailesinden olsun diye. Bir faseti 4 tonla anlatmak yetmiyor (tabla, taç
 *  yan yüzleri, alt yüzler, derin çizgi + tek pembe faset). METAL.elmas değişmedi. */
export const ELMAS_FASET = {
  en: "#dcfcff", acik: "#8ae9ff", yan: "#5fd8f7", ana: "#2ec4f0", orta: "#1d9ee0", koyu: "#1565b8", derin: "#0d4a8f", pembe: "#ff7ab8",
};

/** Level tonları (Ajan B ekledi, 25 Eyl) — level çerçeveleri metal DEĞİL sahne renkleriyle ayrışır (lig ile karışmasın).
 *  orta/koyu tonlar SAHNE ve TAS'taki mevcut değerler; yalnız açık ve kenar tonları yeni. */
export const LEVEL = {
  turkuaz: { acik: "#8ee8e0", orta: "#3bb6b0", koyu: "#1f7f7a", kenar: "#0f4f4c" },
  safir:   { acik: "#9cc9ff", orta: "#3b91e8", koyu: "#1f5fb0", kenar: "#123a73" },
  ametist: { acik: "#cbb5ff", orta: "#9d74f0", koyu: "#6a45c8", kenar: "#3f2587" },
  yakut:   { acik: "#ff8e9c", orta: "#ff2a4a", koyu: "#b8102c", kenar: "#6e0618" },
};

/** Ek açık tonlar (Ajan B ekledi, 25 Eyl) — unvan kurdelesi (şehir şampiyonu türü) açık turuncu. */
export const EK_ACIK = { turuncu: "#ffd9bf" };

/** Zümrüt defne tonları (Ajan B ekledi, 25 Eyl) — Turnuva Şampiyonu çelengi; orta/koyu TAS.zumrut değerleri. */
export const ZUMRUT_TON = { acik: "#9ee8b8", orta: "#2fbf71", koyu: "#1b8a4f", kenar: "#0f5a33" };

/** EK (Ajan A, 25 Eyl): joker pembesi (İkinci Şans) 4 ton; orta = SAHNE.pembe. Yeşil için ZUMRUT_TON (Ajan B). */
export const PEMBE_TON = { acik: "#ffb3cf", orta: "#e0729a", koyu: "#b0406c", kenar: "#6e1f42" };
