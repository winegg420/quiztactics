// Açık (Antrenman) botların oyuncuya görünen adı: veritabanında Türkçe (`profiles.gorunen_ad`),
// EN'de İngilizce karşılığı gösterilir. Yalnız bu üç ad birebir eşleşince çevrilir — herhangi bir
// oyuncu adı sözlükten geçmez (tt() gibi genel çeviri KULLANILMAZ). ToyBot zaten İngilizce.
import { aktifDil } from "./dil.js";

const BOT_ADLARI_EN = {
  "ÇaylakBot": "RookieBot",
  "ÜstatBot": "MasterBot",
  "EfsaneBot": "LegendBot",
};

/** Bot adı EN'de çevrilir; başka her metin olduğu gibi döner. */
export function botAdi(ad) {
  return typeof ad === "string" && aktifDil() === "en" && BOT_ADLARI_EN[ad] ? BOT_ADLARI_EN[ad] : ad;
}
