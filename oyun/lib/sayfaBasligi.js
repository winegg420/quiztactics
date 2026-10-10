// Rotaya göre sekme başlığı + canonical adres (10 Eki 2026 denetimi) — TEK yer.
// "Lig — Quiz Tactics" (TR) / "League — Quiz Tactics" (EN). Ana sayfa ve listede olmayan rotalar ana başlığı taşır.
// Canonical her rotada https://quiztactics.com + yol (sorgu dizgisi atılır). index.html'deki varsayılan kök adresle başlar.
// Paylaşım (og/twitter) etiketleri statik ve Türkçe kalır: önizleme botları JS çalıştırmaz.
import { useEffect } from "react";
import { aktifDil, tt } from "./dil.js";

const ANA_ALAN = "https://quiztactics.com";
const MARKA = "Quiz Tactics";

// Yolun ilk parçası → sayfa adı (Türkçe anahtar; EN sözlükten)
const SAYFA_ADI = {
  siralama: "Lig",
  joker: "Dükkân",
  profil: "Profil",
  gorevler: "Görevler",
  "sezon-yolu": "Sezon Yolu",
  turnuva: "Turnuva",
  arkadaslar: "Arkadaşlar",
  mesajlar: "Mesajlar",
  meydan: "Meydan Okumalar",
  modlar: "Modlar",
  duello: "Düello",
  kasa: "Ortak Hazine",
  calisma: "Hatalarım",
  gizlilik: "Gizlilik Politikası",
  kosullar: "Kullanım Koşulları",
};

// Kendi başlığını kendisi koyan geliştirici/önizleme sayfaları: dokunulmaz.
const KENDI_BASLIGI = /^\/(preview\/|tasarim-yonleri|mac-sonu-onizleme|ekran-revizyon-onizleme)/;

const anaBaslik = () => (aktifDil() === "en" ? `${MARKA} — Trivia Game` : `${MARKA} — Bilgi Yarışması`);

/** Yolun sekme başlığı. */
export function sayfaBasligi(yol) {
  const ad = SAYFA_ADI[String(yol ?? "").split("/").filter(Boolean)[0]];
  return ad ? `${tt(ad)} — ${MARKA}` : anaBaslik();
}

/** Rota değişince başlığı ve canonical bağlantıyı günceller (BildimApp'te bir kez çağrılır). */
export function useSayfaBasligi(yol) {
  useEffect(() => {
    try {
      if (!KENDI_BASLIGI.test(yol)) document.title = sayfaBasligi(yol);
      let bag = document.querySelector('link[rel="canonical"]');
      if (!bag) {
        bag = document.createElement("link");
        bag.setAttribute("rel", "canonical");
        document.head.appendChild(bag);
      }
      bag.setAttribute("href", ANA_ALAN + (yol && yol !== "/" ? yol.replace(/\/+$/, "") : "/"));
    } catch (e) {
      console.warn("[Bildim] sayfa başlığı güncellenemedi:", e?.message ?? e);
    }
  }, [yol]);
}
