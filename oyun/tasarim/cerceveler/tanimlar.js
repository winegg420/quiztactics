/**
 * ÇERÇEVE GÖRSEL TANIMLARI — görünüm kodda, katalog veritabanında (`cerceveler` tablosu).
 *
 * Her çerçeve anahtarının bir görsel tanımı vardır. Tanım anahtardan bağımsız, parametreli:
 *   tur       : "nadirlik" | "lig" | "level"  (renk ailesini ve halka stilini seçer)
 *   malzeme   : nadirlik (siradan|nadir|epik|efsanevi) · lig (gumus|altin|elmas|efsane) ·
 *               level (bronz|gumus|altin|elmas)
 *   desen     : halkanın deseni (duz | nokta | cift | metal | cok | dis) — cerceveler.css
 *   sus       : süs listesi (SUSLER anahtarları) — 40 px altında hiçbiri çizilmez
 *   hareketli : yavaş dönen ışık halkası + kıvılcımlar (efsanevi, Efsane ligi, Level 100)
 *   parilti   : 6 sn'de bir halkadan geçen parıltı (epik)
 *
 * Katalogda olup burada tanımı olmayan anahtar `katalog satırından` (nadirlik/kaynak) üretilir,
 * yani yeni bir dükkân çerçevesi eklemek kod gerektirmez; özel süs isteniyorsa buraya satır eklenir.
 * Süs görselleri: Google Noto Emoji 3D (Apache 2.0) — public/kozmetik/, public/dukkan/.
 * Lisans: docs/VARLIK_LISANSLARI.md
 */

/** Süsler: görsel + yerleşim sınıfı (cerceveler.css › .qt-cerceve-sus--<yer>). */
export const SUSLER = {
  tac: { src: "/dukkan/tac.webp", yer: "ust" },
  tac_buyuk: { src: "/dukkan/tac.webp", yer: "ust-buyuk" },
  kanatlar: { src: "/kozmetik/kanat.webp", yer: "kanat", cift: true },
  kanatlar_altin: { src: "/kozmetik/kanat.webp", yer: "kanat", cift: true, ton: "altin" },
  yildiz_ust: { src: "/kozmetik/yildiz.webp", yer: "ust-kucuk" },
  yildiz_uclu: { src: "/kozmetik/yildiz.webp", yer: "ust-uclu" },
  parlayan_yildiz: { src: "/kozmetik/parlayan-yildiz.webp", yer: "ust" },
  kar_tanesi: { src: "/kozmetik/kar-tanesi.webp", yer: "ust-kucuk" },
  kalkan: { src: "/kozmetik/kalkan.webp", yer: "alt" },
  defne: { src: "/kozmetik/defne.webp", yer: "defne", cift: true, ton: "altin" },
  mucevher_ust: { src: "/dukkan/mucevher.webp", yer: "ust-kucuk" },
  mucevher_alt: { src: "/dukkan/mucevher.webp", yer: "alt-kucuk" },
  alev_mor: { src: "/kozmetik/alev.webp", yer: "ust", ton: "mor" },
  alev_yan: { src: "/kozmetik/alev.webp", yer: "yan-alt", cift: true },
  bronz_madalya: { src: "/kozmetik/bronz-madalya.webp", yer: "alt" },
  // Kodla çizilen süsler (görsel yok)
  tas_ust: { kod: "tas", adet: 1 },
  taslar_4: { kod: "tas", adet: 4 },
  taslar_6: { kod: "tas", adet: 6 },
  taslar_3: { kod: "tas", adet: 3 },
  kristal_uclar: { kod: "kristal", adet: 4 },
  disler: { kod: "disler" },
};

/** Bilinen çerçeveler. Anahtarlar A'nın sözleşmesiyle eşlenir (docs/SOZLESME_ROZET_CERCEVE.md). */
export const CERCEVE_TANIMLARI = {
  // ——— Dükkân: Sıradan (gri-mavi) — kalın tek renk halka, iç gölge, kabartma
  siradan_celik: { tur: "nadirlik", malzeme: "siradan", desen: "duz", ad: "Çelik" },
  siradan_nokta: { tur: "nadirlik", malzeme: "siradan", desen: "nokta", ad: "Perçin" },
  siradan_cift: { tur: "nadirlik", malzeme: "siradan", desen: "cift", ad: "Çift Hat" },
  // ——— Dükkân: Nadir (mavi) — iki tonlu metal, üstte küçük süs
  nadir_safir: { tur: "nadirlik", malzeme: "nadir", desen: "metal", sus: ["tas_ust"], ad: "Safir" },
  nadir_yildiz: { tur: "nadirlik", malzeme: "nadir", desen: "metal", sus: ["yildiz_ust"], ad: "Yıldız" },
  nadir_kutup: { tur: "nadirlik", malzeme: "nadir", desen: "metal", sus: ["kar_tanesi"], ad: "Kutup" },
  // ——— Dükkân: Epik (mor) — çok katmanlı halka, mücevherler, 6 sn'de bir parıltı
  epik_ametist: { tur: "nadirlik", malzeme: "epik", desen: "cok", sus: ["taslar_4"], parilti: true, ad: "Ametist" },
  epik_gece: { tur: "nadirlik", malzeme: "epik", desen: "cok", sus: ["taslar_6"], parilti: true, ad: "Gece Yarısı" },
  epik_hazine: { tur: "nadirlik", malzeme: "epik", desen: "cok", sus: ["taslar_3", "mucevher_ust"], parilti: true, ad: "Hazine" },
  // ——— Dükkân: Efsanevi (altın-turuncu) — dönen ışık halkası, kıvılcım, taç/kanat
  efsanevi_tac: { tur: "nadirlik", malzeme: "efsanevi", desen: "metal", sus: ["tac"], hareketli: true, ad: "Hükümdar" },
  efsanevi_anka: { tur: "nadirlik", malzeme: "efsanevi", desen: "metal", sus: ["kanatlar_altin"], hareketli: true, ad: "Anka" },
  efsanevi_yildiz: { tur: "nadirlik", malzeme: "efsanevi", desen: "metal", sus: ["parlayan_yildiz", "alev_yan"], hareketli: true, ad: "Süpernova" },

  // ——— Lig çerçeveleri (lig atlayınca kazanılır, satılmaz)
  lig_gumus: { tur: "lig", malzeme: "gumus", desen: "metal", sus: ["kalkan"], ad: "Gümüş Lig" },
  lig_altin: { tur: "lig", malzeme: "altin", desen: "metal", sus: ["defne"], ad: "Altın Lig" },
  lig_elmas: { tur: "lig", malzeme: "elmas", desen: "kristal", sus: ["kristal_uclar", "mucevher_ust"], ad: "Elmas Lig" },
  lig_efsane: { tur: "lig", malzeme: "efsane", desen: "metal", sus: ["alev_mor"], hareketli: true, ad: "Efsane Lig" },

  // ——— Level çerçeveleri (Level 25/50/75/100 rozetiyle gelir)
  level_25: { tur: "level", malzeme: "bronz", desen: "dis", sus: ["disler", "bronz_madalya"], ad: "Level 25" },
  level_50: { tur: "level", malzeme: "gumus", desen: "metal", sus: ["yildiz_uclu"], ad: "Level 50" },
  level_75: { tur: "level", malzeme: "altin", desen: "metal", sus: ["kanatlar_altin"], ad: "Level 75" },
  level_100: { tur: "level", malzeme: "elmas", desen: "kristal", sus: ["tac_buyuk", "mucevher_alt"], hareketli: true, ad: "Level 100" },
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
    nadir: { tur: "nadirlik", malzeme: "nadir", desen: "metal", sus: ["tas_ust"] },
    epik: { tur: "nadirlik", malzeme: "epik", desen: "cok", sus: ["taslar_4"], parilti: true },
    efsanevi: { tur: "nadirlik", malzeme: "efsanevi", desen: "metal", sus: ["tac"], hareketli: true },
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

/** Nadirlik adı (arayüz etiketi). */
export const NADIRLIK_ADI = { siradan: "Sıradan", nadir: "Nadir", epik: "Epik", efsanevi: "Efsanevi" };
