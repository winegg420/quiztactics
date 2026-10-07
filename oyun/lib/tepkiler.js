import { tt } from "./dil.js";
// Maç içi tepkiler — işletim sistemi emojisi yerine yerel Google Noto Emoji
// 3D görselleri. Sunucuya giden `deger` alanı değişmez.
//
// Neden: 👍😂😮😡🔥😎 her cihazda farklı çiziliyor (Android/iOS/Windows üç
// ayrı görsel dil) ve oyunun çizgi ikon diliyle hiç ilgisi yok. Oyundan
// emojiler zaten temizlenmişti, tepki çubuğunda geri gelmişlerdi.
//
// ÖNEMLİ: sunucuya giden mesaj metni DEĞİŞMEDİ. `deger` alanı eskisi gibi
// emoji karakteri olarak gönderiliyor; yalnız EKRANDA ikon çiziliyor.
// Böylece eski istemcilerle ve kayıtlı mesajlarla uyum bozulmuyor.

//
const emoji = (isim, deger, etiket, dosya = `${isim}.webp`) => ({
  ad: `noto:/kozmetik/tepki/${dosya}`,
  isim,
  deger,
  etiket,
});

export const TEPKILER = [
  emoji("begeni",   "👍", tt("Beğendim"), "begeni.png"),
  emoji("gulen",    "😂", tt("Çok komik")),
  emoji("sasirmis", "😮", tt("Şaşırdım"), "sasirmis.png"),
  emoji("kizgin",   "😡", tt("Sinirlendim"), "kizgin.png"),
  emoji("ates",     "🔥", tt("Harika")),
  emoji("havali",   "😎", tt("Havalı")),
];

/** Mesaj bir tepki emojisiyse ikon adını döndürür, değilse null. */
export function tepkiIkonu(mesaj) {
  return tepkiTanimi(mesaj)?.ad ?? null;
}

/** Mesaj bir tepki emojisiyse erişilebilir tanımını döndürür. */
export function tepkiTanimi(mesaj) {
  return TEPKILER.find((x) => x.deger === mesaj) ?? null;
}
