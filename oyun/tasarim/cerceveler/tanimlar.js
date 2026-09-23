/**
 * ÇERÇEVE GÖRSEL TANIMLARI — görünüm kodda, katalog veritabanında (`cerceveler` tablosu).
 *
 * Her çerçevenin bir TEMASI (hikâyesi) var; silüeti daireyi taşar (üstte taç/boynuz/kristal,
 * yanlarda kanat/alev, altta plaka). Tanım alanları:
 *   tur       : "nadirlik" | "lig" | "level"
 *   malzeme   : renk ailesi — nadirlik (siradan|nadir|epik|efsanevi) · lig/level (bronz|gumus|altin|elmas|efsane)
 *   tema      : halkanın çizimi (cerceveler.css › [data-tema]); yoksa `desen` (eski genel halka)
 *   sus       : süs listesi (SUSLER anahtarları)
 *   plaka     : alt plakadaki yazı (level rakamı)
 *   efekt     : sürekli canlı efekt — "aura" (dönen ışık) · "kozmik" (dönen bulutsu) · "alev" (titreyen alev)
 *   parilti   : 7 sn'de bir halkadan geçen parıltı (epik)
 *   pirilti   : halkada iki küçük ışık (nadir) — hareket hakkı varsa yavaşça yanıp söner
 *   kivilcim  : seyrek kıvılcımlar (efsanevi)
 *   yorunge   : halkayı saran eğik yörünge (Gezegen Halkası)
 *
 * Boyut kademeleri: 56 px ve üstü tam · 40–55 yalnız `ana` süsler · 40 altı yalnız renkli halka.
 * Katalogda olup burada tanımı olmayan anahtar katalog satırından (nadirlik) üretilir.
 * Süs görselleri: Google Noto Emoji 3D (Apache 2.0) — public/kozmetik/, public/dukkan/.
 * Lisans: docs/VARLIK_LISANSLARI.md
 */

const K = "/kozmetik/";

/**
 * Süsler. İki yerleşim:
 *  - serbest: x/y = görselin MERKEZİ, w = genişlik (hepsi dış çapın %'si; 0–100 halkanın kendisi).
 *    cift: sağa aynası da çizilir (x → 100 − x). r: dönüş (derece). ayna: yatay çevir.
 *  - açısal: aci = [derece...] (0 = tepe, saat yönü), d = merkezden uzaklık (%), w = genişlik.
 *    Görselin "üstü" dışarı bakar. dayanak "alt": görselin alt kenarı noktaya oturur (alev).
 * arka: halkanın arkasında · ana: 40–55 px'te de çizilir · ton: CSS süzgeci · anim: "alev"
 */
export const SUSLER = {
  // Sıradan
  bulut_buyuk: { src: `${K}bulut.webp`, x: 12, y: 80, w: 52, ana: true },
  bulut_kucuk: { src: `${K}bulut.webp`, x: 86, y: 16, w: 36, ayna: true },
  sakura_buyuk: { src: `${K}sakura.webp`, x: 8, y: 78, w: 40, ana: true },
  papatya: { src: `${K}papatya.webp`, x: 34, y: 94, w: 27 },
  yaprak: { src: `${K}yaprak.webp`, x: -2, y: 52, w: 32, r: -30, arka: true },
  sakura_kucuk: { src: `${K}sakura.webp`, x: 88, y: 14, w: 26, r: 18 },
  // Nadir
  buz_uclari: { kod: "kristal", aci: [-54, -27, 27, 54], d: 46, w: 16, boy: 30, ton: "buz", arka: true },
  kar_tepe: { src: `${K}kar-tanesi.webp`, x: 50, y: -2, w: 34, ana: true },
  kar_kucuk: { src: `${K}kar-tanesi.webp`, x: 88, y: 84, w: 22, r: 20 },
  dalga: { src: `${K}dalga.webp`, x: 6, y: 70, w: 54, ana: true },
  kabuk: { src: `${K}deniz-kabugu.webp`, x: 86, y: 88, w: 30, r: -14 },
  donen_yildiz: { src: `${K}donen-yildiz.webp`, x: 86, y: 10, w: 42, ana: true },
  parilti_alt: { src: "/dukkan/parilti.webp", x: 8, y: 84, w: 30 },
  // Epik
  ejder_tepe: { src: `${K}ejder.webp`, x: 50, y: -8, w: 50, ana: true },
  simsekler: { src: `${K}simsek.webp`, x: -4, y: 40, w: 40, r: -8, cift: true, arka: true, ana: true },
  gezegen: { src: `${K}gezegen.webp`, x: 88, y: 8, w: 40, ana: true },
  parilti_sol: { src: "/dukkan/parilti.webp", x: 6, y: 14, w: 22 },
  // Efsanevi
  alev_kanatlar: { src: `${K}kanat.webp`, x: -2, y: 40, w: 50, ayna: true, cift: true, arka: true, ton: "alev", ana: true },
  alev_tac: { kod: "alev", aci: [-38, 0, 38], d: 40, w: 34, arka: true, ana: true },
  kraliyet_tac: { src: "/dukkan/tac.webp", x: 50, y: -6, w: 60, ana: true },
  kraliyet_mucevher: { src: "/dukkan/mucevher.webp", x: 50, y: 96, w: 26 },
  kraliyet_taslar: { kod: "tas", aci: [-90, 90], tonlar: ["yakut", "yakut"] },
  kuyruklu_yildiz: { src: `${K}kuyruklu-yildiz.webp`, x: 84, y: 8, w: 46, ana: true },
  parlayan_yildiz_alt: { src: `${K}parlayan-yildiz.webp`, x: 8, y: 84, w: 28 },
  parilti_kozmik: { src: "/dukkan/parilti.webp", x: 4, y: 12, w: 22 },
  // Lig
  kalkan_alt: { src: `${K}kalkan.webp`, x: 50, y: 92, w: 32, ana: true },
  defne_gumus: { src: `${K}defne.webp`, x: 4, y: 66, w: 58, r: 24, ayna: true, cift: true, arka: true, ton: "gumus", ana: true },
  defne_altin: { src: `${K}defne.webp`, x: 4, y: 66, w: 58, r: 24, ayna: true, cift: true, arka: true, ton: "altin", ana: true },
  lig_tac: { src: "/dukkan/tac.webp", x: 50, y: -4, w: 46, ana: true },
  elmas_uclari: { kod: "kristal", aci: [-60, -30, 0, 30, 60], d: 46, w: 17, boy: 34, ton: "elmas", arka: true, ana: true },
  elmas_tas: { src: "/dukkan/mucevher.webp", x: 50, y: 2, w: 28, ana: true },
  mor_alevler: { kod: "alev", aci: [-64, -32, 0, 32, 64], d: 40, w: 30, arka: true, ton: "mor", ana: true },
  efsane_tac: { src: "/dukkan/tac.webp", x: 50, y: -6, w: 46, ana: true },
  // Level
  yildiz_1: { kod: "yildiz", aci: [0], d: 50, w: 26, ana: true },
  yildiz_2: { kod: "yildiz", aci: [-17, 17], d: 50, w: 24, ana: true },
  yildiz_3: { kod: "yildiz", aci: [-30, 0, 30], d: 50, w: 23, ana: true },
  yildiz_4: { kod: "yildiz", aci: [-42, -14, 14, 42], d: 50, w: 22, ana: true },
  altin_kanatlar: { src: `${K}kanat.webp`, x: -2, y: 42, w: 50, ayna: true, cift: true, arka: true, ton: "altin", ana: true },
};

/** Bilinen çerçeveler — anahtarlar sözleşmeden (docs/SOZLESME_ROZET_CERCEVE.md §4). */
export const CERCEVE_TANIMLARI = {
  // ——— Dükkân · Sıradan — sade ama temiz, durağan
  dukkan_gece: { tur: "nadirlik", malzeme: "siradan", tema: "bulut", sus: ["bulut_kucuk", "bulut_buyuk"], ad: "Bulut" },
  dukkan_nane: { tur: "nadirlik", malzeme: "siradan", tema: "cicek", sus: ["yaprak", "sakura_kucuk", "papatya", "sakura_buyuk"], ad: "Çiçek Bahçesi" },
  dukkan_mercan: { tur: "nadirlik", malzeme: "siradan", tema: "neon", ad: "Neon Çizgi" },
  // ——— Dükkân · Nadir — hafif parıltı
  dukkan_yakut: { tur: "nadirlik", malzeme: "nadir", tema: "buz", sus: ["buz_uclari", "kar_kucuk", "kar_tepe"], pirilti: true, ad: "Buz Kristali" },
  dukkan_okyanus: { tur: "nadirlik", malzeme: "nadir", tema: "okyanus", sus: ["kabuk", "dalga"], pirilti: true, ad: "Okyanus Dalgası" },
  dukkan_zumrut: { tur: "nadirlik", malzeme: "nadir", tema: "yildiz", sus: ["parilti_alt", "donen_yildiz"], pirilti: true, ad: "Yıldız Tozu" },
  // ——— Dükkân · Epik — belirgin süs, 7 sn'de bir parıltı
  dukkan_ametist: { tur: "nadirlik", malzeme: "epik", tema: "ejder", sus: ["ejder_tepe"], parilti: true, ad: "Ejder Pulu" },
  dukkan_kutup: { tur: "nadirlik", malzeme: "epik", tema: "simsek", sus: ["simsekler"], parilti: true, ad: "Şimşek" },
  dukkan_nebula: { tur: "nadirlik", malzeme: "epik", tema: "gezegen", sus: ["parilti_sol", "gezegen"], yorunge: true, parilti: true, ad: "Gezegen Halkası" },
  // ——— Dükkân · Efsanevi — sürekli canlı efekt + seyrek kıvılcım
  dukkan_anka: { tur: "nadirlik", malzeme: "efsanevi", tema: "alev", sus: ["alev_kanatlar", "alev_tac"], efekt: "alev", kivilcim: true, ad: "Alev Kanatları" },
  dukkan_gunes: { tur: "nadirlik", malzeme: "efsanevi", tema: "kraliyet", sus: ["kraliyet_taslar", "kraliyet_mucevher", "kraliyet_tac"], efekt: "aura", kivilcim: true, ad: "Kraliyet" },
  dukkan_ejder: { tur: "nadirlik", malzeme: "efsanevi", tema: "kozmik", sus: ["parilti_kozmik", "parlayan_yildiz_alt", "kuyruklu_yildiz"], efekt: "kozmik", kivilcim: true, ad: "Kozmik" },

  // ——— Lig çerçeveleri (lig atlayınca kazanılır, satılmaz)
  lig_gumus: { tur: "lig", malzeme: "gumus", tema: "lig", sus: ["defne_gumus", "kalkan_alt"], ad: "Gümüş Lig" },
  lig_altin: { tur: "lig", malzeme: "altin", tema: "lig", sus: ["defne_altin", "lig_tac"], ad: "Altın Lig" },
  lig_elmas: { tur: "lig", malzeme: "elmas", tema: "prizma", sus: ["elmas_uclari", "elmas_tas"], parilti: true, ad: "Elmas Lig" },
  lig_efsane: { tur: "lig", malzeme: "efsane", tema: "lig", sus: ["mor_alevler", "efsane_tac"], efekt: "alev", kivilcim: true, ad: "Efsane Lig" },

  // ——— Level çerçeveleri (Level 25/50/75/100 rozetiyle gelir) — alt plakada level, yıldız sayısı artar
  level_25: { tur: "level", malzeme: "bronz", tema: "lig", sus: ["yildiz_1"], plaka: "25", ad: "Level 25 Bronz" },
  level_50: { tur: "level", malzeme: "gumus", tema: "lig", sus: ["yildiz_2"], plaka: "50", ad: "Level 50 Gümüş" },
  level_75: { tur: "level", malzeme: "altin", tema: "lig", sus: ["yildiz_3"], plaka: "75", parilti: true, ad: "Level 75 Altın" },
  level_100: { tur: "level", malzeme: "elmas", tema: "prizma", sus: ["altin_kanatlar", "yildiz_4"], plaka: "100", efekt: "aura", kivilcim: true, ad: "Level 100 Altın Kanatlar" },
};

/** Eski/alternatif anahtar adları → tanım (ör. eski lig_cerceveleri 'gumus'). */
const TAKMA_AD = {
  gumus: "lig_gumus", altin: "lig_altin", elmas: "lig_elmas", efsane: "lig_efsane",
  "lig-gumus": "lig_gumus", "lig-altin": "lig_altin", "lig-elmas": "lig_elmas", "lig-efsane": "lig_efsane",
  level25: "level_25", level50: "level_50", level75: "level_75", level100: "level_100",
};

export const NADIRLIKLER = ["siradan", "nadir", "epik", "efsanevi"];

/** Katalog satırından genel görünüm (tanımı olmayan anahtar için). */
function katalogdanUret(satir) {
  const n = NADIRLIKLER.includes(satir?.nadirlik) ? satir.nadirlik : "siradan";
  if (satir?.kaynak === "lig") return null;   // ligler yukarıda tanımlı; bilinmeyen lig → nadirlikten
  return {
    siradan: { tur: "nadirlik", malzeme: "siradan", desen: "duz" },
    nadir: { tur: "nadirlik", malzeme: "nadir", desen: "metal", pirilti: true },
    epik: { tur: "nadirlik", malzeme: "epik", desen: "cok", parilti: true },
    efsanevi: { tur: "nadirlik", malzeme: "efsanevi", desen: "metal", sus: ["lig_tac"], efekt: "aura", kivilcim: true },
  }[n];
}

/**
 * Anahtar (+ isteğe bağlı katalog satırı) → görsel tanım; çerçeve yoksa null.
 * @param {string|null} anahtar
 * @param {{nadirlik?:string,kaynak?:string}} [satir]
 */
export function cerceveTanimiBul(anahtar, satir) {
  if (!anahtar) return null;
  const k = CERCEVE_TANIMLARI[anahtar] ? anahtar : TAKMA_AD[anahtar];
  if (k) return { anahtar: k, ...CERCEVE_TANIMLARI[k] };
  const t = katalogdanUret(satir);
  return t ? { anahtar, ...t } : { anahtar, tur: "nadirlik", malzeme: "siradan", desen: "duz" };
}

/** Tanımın hareket isteyip istemediği (hareket hakkı sırasına girer mi). */
export function hareketIster(tanim) {
  return !!(tanim && (tanim.efekt || tanim.parilti || tanim.pirilti || tanim.kivilcim));
}

/** Nadirlik adı (arayüz etiketi). */
export const NADIRLIK_ADI = { siradan: "Sıradan", nadir: "Nadir", epik: "Epik", efsanevi: "Efsanevi" };
