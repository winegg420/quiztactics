// UNVAN — isim altında kazanılan yazı (A5.6). İki yazı stili:
//  "kurdele": açık tonlu küçük kurdele, kalın lacivert kontur, çatal uçlar, solda tür simgesi.
//  "isik":    kutusuz; tür renginde simge + lacivert küçük büyük harf yazı + altında ince ışık çizgisi.
// Tür rengi yalnız simgede, kurdele kuyruğunda ve çizgide; yazı her zaman lacivert (açıkta) / krem (koyuda): kontrast ≥ 7.
// Uzun unvan tek satır, sığmazsa "…" (taşma yok).
import { KONTUR as K, METAL, TAS, MARKA, KREM, LEVEL, EK_ACIK } from "../../palet.js";

/** Türler: renk (açık, orta, koyu) + simge. */
export const UNVAN_TURLERI = {
  sehir:  { ad: "Şehir şampiyonu", r: { acik: EK_ACIK.turuncu, orta: MARKA.turuncu, koyu: MARKA.turuncuKoyu } },
  lig:    { ad: "Lig",             r: METAL.altin },
  sezon:  { ad: "Sezon",           r: LEVEL.ametist },
  basari: { ad: "Başarı",          r: LEVEL.safir },
};

/** Onaya sunulan örnek unvan listesi (Ida bunu da onaylayacak). */
export const UNVAN_LISTESI = [
  { tur: "sehir", metin: "Afyonkarahisar Şampiyonu", kazanma: "Şehir sıralamasında sezonu 1. bitir" },
  { tur: "sehir", metin: "Balıkesir Şampiyonu", kazanma: "Şehir sıralamasında sezonu 1. bitir" },
  { tur: "sehir", metin: "İstanbul Şampiyonu", kazanma: "Şehir sıralamasında sezonu 1. bitir" },
  { tur: "sehir", metin: "Kahramanmaraş İkincisi", kazanma: "Şehir sıralamasında sezonu 2. bitir" },
  { tur: "lig", metin: "Efsane Lig Şampiyonu", kazanma: "Efsane Lig'de haftayı 1. bitir" },
  { tur: "lig", metin: "Elmas Lig Birincisi", kazanma: "Elmas Lig'de haftayı 1. bitir" },
  { tur: "lig", metin: "Altın Lig Fatihi", kazanma: "Altın Lig'den 3 kez yüksel" },
  { tur: "lig", metin: "5 Kez Lig Birincisi", kazanma: "Herhangi bir ligde 5 hafta 1. ol" },
  { tur: "sezon", metin: "Sezon 1 Efsanesi", kazanma: "Sezon 1'i Efsane Lig'de bitir" },
  { tur: "sezon", metin: "Sezon 1 Kurucusu", kazanma: "Sezon 1'de en az 50 maç oyna" },
  { tur: "sezon", metin: "Sezon 2 İlk 100", kazanma: "Sezon sonunda genel ilk 100" },
  { tur: "sezon", metin: "Sezon Kupası Sahibi", kazanma: "Sezon finali turnuvasını kazan" },
  { tur: "basari", metin: "Tarih Ustası", kazanma: "Tarih ustalık rozetini elmasa çıkar" },
  { tur: "basari", metin: "Coğrafya Kâşifi", kazanma: "Coğrafya ustalık rozetini altına çıkar" },
  { tur: "basari", metin: "Bilim Dehası", kazanma: "Bilim ustalık rozetini elmasa çıkar" },
  { tur: "basari", metin: "Düello Ustası", kazanma: "100 Düello kazan" },
  { tur: "basari", metin: "Turnuva Şampiyonu", kazanma: "Bir turnuvayı 1. bitir" },
  { tur: "basari", metin: "Seri Canavarı", kazanma: "30 gün üst üste oyna" },
  { tur: "basari", metin: "Kusursuz", kazanma: "Bir maçta bütün soruları doğru bil" },
  { tur: "basari", metin: "Bin Galibiyet", kazanma: "1.000 maç kazan" },
  { tur: "basari", metin: "Dâhi", kazanma: "Level 100'e ulaş" },
];

/** Tür simgesi (16 birimlik kutu), düz dolgu + kontur. */
export function UnvanSimge({ tur, boyut = 14 }) {
  const r = UNVAN_TURLERI[tur]?.r ?? METAL.gumus;
  const cz = { stroke: K, strokeWidth: 1.3, strokeLinejoin: "round", strokeLinecap: "round" };
  let ic;
  if (tur === "sehir") {
    // konum iğnesi + küçük taç
    ic = (<>
      <path d="M8 15C5 11.4 3 9 3 6.6A5 5 0 0 1 13 6.6C13 9 11 11.4 8 15Z" fill={r.orta} {...cz} />
      <path d="M5.6 7.8L5.2 4.6L6.9 5.9L8 3.8L9.1 5.9L10.8 4.6L10.4 7.8Z" fill={METAL.altin.acik} {...cz} strokeWidth={0.9} />
    </>);
  } else if (tur === "lig") {
    // defne çelengi içinde yıldız
    ic = (<>
      <path d="M4 3.5C1.4 6 1.4 10.6 5 13.4M12 3.5C14.6 6 14.6 10.6 11 13.4" fill="none" stroke={K} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M4 3.5C1.4 6 1.4 10.6 5 13.4M12 3.5C14.6 6 14.6 10.6 11 13.4" fill="none" stroke={r.orta} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 3.8L9.2 6.6L12 6.8L9.8 8.6L10.5 11.4L8 9.8L5.5 11.4L6.2 8.6L4 6.8L6.8 6.6Z" fill={r.orta} {...cz} strokeWidth={1} />
    </>);
  } else if (tur === "sezon") {
    // bayrak
    ic = (<>
      <path d="M4 15V2" fill="none" stroke={K} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4.6 2.6H13L11 5.6L13 8.6H4.6Z" fill={r.orta} {...cz} />
      <path d="M4.6 2.6H13L12.2 3.8H4.6Z" fill={r.acik} />
    </>);
  } else {
    // madalya
    ic = (<>
      <path d="M5 1.5L8 6L11 1.5" fill="none" stroke={K} strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M5 1.5L8 6L11 1.5" fill="none" stroke={TAS.yakut} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="8" cy="10" r="4.8" fill={r.orta} {...cz} />
      <circle cx="8" cy="10" r="2.2" fill={r.acik} />
    </>);
  }
  return <svg className="grb-unvan-simge" width={boyut} height={boyut} viewBox="0 0 16 16" aria-hidden="true">{ic}</svg>;
}

/** Unvan yazısı. stil: "kurdele" | "isik". koyu: koyu zemin. boy: "k" (liste) | "o" | "b" (profil). */
export function Unvan({ tur = "basari", stil = "kurdele", koyu = false, boy = "o", children }) {
  const r = UNVAN_TURLERI[tur]?.r ?? METAL.gumus;
  return (
    <span className={`grb-unvan grb-unvan--${stil} grb-unvan--${boy}${koyu ? " grb-unvan--koyu" : ""}`}
          style={{ "--u-a": r.acik, "--u-o": r.orta, "--u-k": r.koyu, "--u-krem": KREM }}>
      <UnvanSimge tur={tur} boyut={boy === "k" ? 12 : boy === "b" ? 16 : 14} />
      <span className="grb-unvan-metin">{children}</span>
    </span>
  );
}
