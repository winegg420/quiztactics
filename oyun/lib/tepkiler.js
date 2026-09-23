import { tt } from "./dil.js";
import "../tasarim/ekranlar/emoji.css";
// Maç içi tepkiler — işletim sistemi emojisi yerine kendi SVG ikonlarımız.
//
// Neden: 👍😂😮😡🔥😎 her cihazda farklı çiziliyor (Android/iOS/Windows üç
// ayrı görsel dil) ve oyunun çizgi ikon diliyle hiç ilgisi yok. Oyundan
// emojiler zaten temizlenmişti, tepki çubuğunda geri gelmişlerdi.
//
// ÖNEMLİ: sunucuya giden mesaj metni DEĞİŞMEDİ. `deger` alanı eskisi gibi
// emoji karakteri olarak gönderiliyor; yalnız EKRANDA ikon çiziliyor.
// Böylece eski istemcilerle ve kayıtlı mesajlarla uyum bozulmuyor.

//
// 23 Eyl 2026: SVG ikonlar tek renkti; tepkiler yeniden RENKLİ sistem emojisi.
// `ad` = "emoji:<karakter>" → QtIkon renkli emoji çizer (tasarim/ekranlar/emoji.css).
// Eski SVG ikon adı `isim` alanında duruyor; SVG'ye dönmek için `ad: isim` yeterli.
const emoji = (isim, deger, etiket) => ({ ad: `emoji:${deger}`, isim, deger, etiket });

export const TEPKILER = [
  emoji("begeni",   "👍", tt("Beğendim")),
  emoji("gulen",    "😂", tt("Çok komik")),
  emoji("sasirmis", "😮", tt("Şaşırdım")),
  emoji("kizgin",   "😡", tt("Sinirlendim")),
  emoji("ates",     "🔥", tt("Harika")),
  emoji("havali",   "😎", tt("Havalı")),
];

/** Mesaj bir tepki emojisiyse ikon adını döndürür, değilse null. */
export function tepkiIkonu(mesaj) {
  const t = TEPKILER.find((x) => x.deger === mesaj);
  return t ? t.ad : null;
}
