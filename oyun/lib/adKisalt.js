// Maç ekranlarında (üst şerit, Hazır/arama, maç sonu, düello) oyuncu adının TEK kesme kuralı.
// Eskiden her ekran CSS üç noktasıyla kendi genişliğinde kesiyordu: aynı 16 harfli ad üç yerde
// üç farklı noktada bitiyordu (D-123). Artık hepsi aynı karakter sayısında keser; CSS üç noktası
// yalnız çok dar kaplarda son savunma olarak kalır. Tam ad ekran okuyucuya ve oyuncu kartına gider
// (OyuncuAdiDugmesi aria-label + kart), yalnız görünen metin kısalır.
export const AD_EN_FAZLA = 10;

/** Ad `en` karakteri aşarsa ilk `en` karakter + "…"; değilse olduğu gibi. Emoji/vekil çiftlere zarar vermez. */
export function adKisalt(ad, en = AD_EN_FAZLA) {
  if (typeof ad !== "string") return ad;
  const harfler = Array.from(ad);
  return harfler.length > en ? harfler.slice(0, en).join("") + "…" : ad;
}
