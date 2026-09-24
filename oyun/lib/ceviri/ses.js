// İngilizce çeviri eki — Müzik / Efektler ayarları (Ajan H, 23 Eyl 2026). Anahtar Türkçe metnin kendisidir.
// dil.js'e KATILMAZ: yalnız bu anahtarları kullanan bileşenler `sesMetni()` ile okur
// (dil.js'teki genel "Açık"/"Kapalı" karşılıkları başka bağlamda — tema — kullanılıyor).
import { aktifDil, tt } from "../dil.js";

const EN = {
  "Müzik": "Music",
  "Efektler": "Sound effects",
  "Açık": "On",
  "Kapalı": "Off",
  "Arka plan müziği (menü, maç, turnuva)": "Background music (menus, matches, tournament)",
  "Sayaç, doğru/yanlış ve maç sonu sesleri": "Timer, correct/wrong and match-end sounds",
  "Sesi kapat": "Mute",
  "Sesi aç": "Unmute",
  "Ses ayarları": "Sound settings",
};

/** Bu ekin metni (EN'de karşılığı yoksa genel tt()). */
export function sesMetni(anahtar) {
  try {
    if (aktifDil() === "en" && EN[anahtar]) return EN[anahtar];
  } catch { /* dil okunamadı */ }
  return tt(anahtar);
}
