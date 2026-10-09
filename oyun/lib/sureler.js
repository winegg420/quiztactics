// Düello + Ortak Hazine (kod adı Kasa) SUNUM SÜRELERİ — tek merkez (9 Eki 2026).
// Yalnız ekran geçişi / animasyon zamanlaması: oyun kuralı, puan, sunucu süresi (faz, soru, gösterim payı) burada DEĞİL.
// Varsayılanlar bugünkü değerlerdir; oyun kodu süreyi sure(anahtar) ile okur (orijinal sabitler varsayilanSure ile buraya bağlı).
// Gizli /sure-ayar sayfası değeri YALNIZ O TARAYICIDA localStorage'a yazar; erişilemezse varsayılan kullanılır.
// CSS tarafı: değiştirilen her süre için kökte --sr-<anahtar> = yeni / varsayılan oranı yazılır; ilgili animasyonlar
// calc(Nms * var(--sr-<anahtar>, 1)) ile ölçeklenir (değişiklik yoksa değişken yok → 1 → bugünkü süre).

export const SURE_DEPO = "qt-sure-ayar-v1";

// mod: duello | kasa | ortak · oneri: docs/sure-olcum.md önerisi (yalnız /sure-ayar gösterir) · dene: /sure-ayar önizlemesi · not: sunucuya bağlı sınır
export const SURELER = [
  { anahtar: "ortak_arama_gecis", mod: "ortak", baslik: "Rakip bulundu → maç geçişi", aciklama: "VS kartı göründükten sonra maç ekranına geçiş beklemesi (Düello + Hazine).", varsayilan: 2000, oneri: 1500, min: 800, max: 4000, kaynak: "components/AramaSahnesi.jsx › ARAMA_GECIS_MS", dene: "genel" },

  { anahtar: "duello_ban_giris", mod: "duello", baslik: "Ban sırası girişi", aciklama: "Savunana \"BAN SIRASI SENDE\" damgası.", varsayilan: 1000, oneri: 1250, min: 400, max: 2000, kaynak: "components/DuelloBanAni.jsx › GIRIS_MS", not: "Ban fazının gösterim payı içinde kalmalı; uzarsa seçme süresinden yer.", dene: "banGiris" },
  { anahtar: "duello_ban_aciklama", mod: "duello", baslik: "Ban açıklaması (saldıran)", aciklama: "Saldırana \"rakip şunu banladı\" plakası.", varsayilan: 1200, oneri: 1500, min: 500, max: 2500, kaynak: "components/DuelloBanAni.jsx › BAN_ACIKLAMA_MS", not: "Sunucu duello_ban_gosterim_ms 880 ms; uzun değer seçme süresinden yer.", dene: "banAciklama" },
  { anahtar: "duello_ban_onay", mod: "duello", baslik: "\"BANLADIN\" onayı", aciklama: "Savunan banı seçince onay plakası.", varsayilan: 1000, oneri: 1000, min: 400, max: 2000, kaynak: "components/DuelloBanAni.jsx › ONAY_MS", dene: "banOnay" },
  { anahtar: "duello_ban_bilgi", mod: "duello", baslik: "\"BAN KULLANILMADI\" bilgisi", aciklama: "Ban süresi dolunca gri bilgi plakası.", varsayilan: 1700, oneri: 2000, min: 800, max: 3000, kaynak: "components/DuelloBanAni.jsx › BILGI_MS", dene: "banBilgi" },
  { anahtar: "duello_ban_sira", mod: "duello", baslik: "\"SIRA SENDE\" şeridi", aciklama: "Ban sonrası saldırana mavi şerit.", varsayilan: 900, oneri: 1250, min: 400, max: 2000, kaynak: "components/DuelloBanAni.jsx › SIRA_MS", dene: "banSira" },
  { anahtar: "duello_ban_sira_bilgi", mod: "duello", baslik: "\"SIRA SENDE\" + bilgi", aciklama: "Rakip banlamadıysa şerit bilgi satırıyla.", varsayilan: 1500, oneri: 2000, min: 600, max: 3000, kaynak: "components/DuelloBanAni.jsx › SIRA_BILGI_MS", dene: "banSiraBilgi" },
  { anahtar: "duello_secim_oto", mod: "duello", baslik: "Otomatik seçim uyarısı", aciklama: "Seçim süresi dolunca \"otomatik seçildi\" konsolu.", varsayilan: 1800, oneri: 1800, min: 800, max: 3500, kaynak: "components/DuelloSecim.jsx › OTO_MS", dene: "genel" },
  { anahtar: "duello_kart_ucus", mod: "duello", baslik: "Kategori kartı uçuşu", aciklama: "Seçilen kategori kartı yuvaya uçar.", varsayilan: 460, oneri: 400, min: 200, max: 900, kaynak: "components/DuelloSecim.jsx › UCUS_MS", dene: "genel" },
  { anahtar: "duello_hakimiyet_gecis", mod: "duello", baslik: "\"HÂKİMİYET BAŞLIYOR\"", aciklama: "Seçim bitince saldırı turlarına geçiş katmanı.", varsayilan: 2100, oneri: 2000, min: 1000, max: 3500, kaynak: "components/DuelloSecim.jsx › HAKIMIYET_GECIS_MS", not: "Dokunuşu engellemez; ilk turun sayacıyla örtüşür.", dene: "hakimiyet" },
  { anahtar: "duello_calma", mod: "duello", baslik: "Kategori çalma anı", aciklama: "Kategori el değiştirince kartın karşı tarafa kayması (iniş oranla ölçeklenir).", varsayilan: 1800, oneri: 1600, min: 900, max: 3000, kaynak: "components/DuelloTahta.jsx › CALMA_MS (+ CALMA_INIS_MS 820)", not: "Sonuç fazı içinde biter.", dene: "calma" },
  { anahtar: "duello_vurus", mod: "duello", baslik: "Puan vuruşu", aciklama: "Sonuçta tahtadaki +puan vuruşu ve şerit parlaması.", varsayilan: 1500, oneri: 1200, min: 700, max: 2500, kaynak: "pages/DuelloPage.jsx › vurus (1500)", dene: "genel" },
  { anahtar: "duello_skill_efekt", mod: "duello", baslik: "Skill efekti", aciklama: "Skill kullanılınca kısa efekt.", varsayilan: 720, oneri: 600, min: 300, max: 1500, kaynak: "pages/DuelloPage.jsx › skillEfekt (720 / 680)", dene: "genel" },
  { anahtar: "duello4_acilis", mod: "duello", baslik: "v4 · saldırı sorusu açılışı", aciklama: "\"Kim neyi aldı\" paneli; bitince soru ve sayaç görünür.", varsayilan: 1600, oneri: 1600, min: 800, max: 2500, kaynak: "components/duello4/Duello4Arena.jsx › ACILIS_MS", not: "Sunucu gösterim payı (≈1,5–2 sn) içinde; uzun değer soru süresinden yer.", dene: "genel" },
  { anahtar: "duello4_sarsinti", mod: "duello", baslik: "v4 · kontrol el değişti", aciklama: "Kontrol çekirdeği uçuşu + sahne sarsıntısı.", varsayilan: 520, oneri: 520, min: 250, max: 1000, kaynak: "components/duello4/Duello4Arena.jsx › SARSINTI_MS", dene: "genel" },

  { anahtar: "kasa_ac_an", mod: "kasa", baslik: "AÇ anı", aciklama: "Hazine açılır, ışık patlar, altın skora uçar.", varsayilan: 1280, oneri: 1280, min: 800, max: 2200, kaynak: "pages/KasaPage.jsx › AC_AN_MS", not: "Soru gösterim payı 1,5 sn: pay yetmezse an hızlanır (en az \"an tabanı\").", dene: "kasaAc" },
  { anahtar: "kasa_devam_an", mod: "kasa", baslik: "DEVAM anı", aciklama: "Mini sandık sarsılır, çarpan patlar, hazine sayarak yükselir.", varsayilan: 1400, oneri: 1280, min: 800, max: 2200, kaynak: "pages/KasaPage.jsx › DEVAM_AN_MS", not: "Gösterim payı 1,5 sn içinde.", dene: "genel" },
  { anahtar: "kasa_an_taban", mod: "kasa", baslik: "AÇ/DEVAM en kısa hâli", aciklama: "Veri geç gelse de an en az bu kadar görünür.", varsayilan: 1000, oneri: 1000, min: 500, max: 1500, kaynak: "pages/KasaPage.jsx › AN_TABAN_MS", dene: "genel" },
  { anahtar: "kasa_kapali_karar", mod: "kasa", baslik: "Rakip kararı (kapalı kart)", aciklama: "Rakibin AÇ/DEVAM kararı önce ters kart.", varsayilan: 300, oneri: 400, min: 0, max: 900, kaynak: "pages/KasaPage.jsx › KAPALI_KARAR_MS", not: "Gösterim payından yer.", dene: "kasaRakipKarar" },
  { anahtar: "kasa_devam_vurus", mod: "kasa", baslik: "\"DEVAM ETTİ\" vuruşu", aciklama: "Rakibin DEVAM kararı açılınca vuruş.", varsayilan: 650, oneri: 900, min: 300, max: 1500, kaynak: "pages/KasaPage.jsx › DEVAM_VURUS_MS", dene: "kasaRakipKarar" },
  { anahtar: "kasa_sonuc_ucus", mod: "kasa", baslik: "Sonuç: altın hazineye uçar", aciklama: "+2/+6 bandından mini hazineye altın uçuşu, anahtar el değiştirir.", varsayilan: 2600, oneri: 2000, min: 1500, max: 3000, kaynak: "pages/KasaPage.jsx › sonuç anı (950/1180/1900/2600)", not: "Sonuç fazı 3 sn (kasa_sonuc_sn).", dene: "genel" },
  { anahtar: "kasa_final_sahne", mod: "kasa", baslik: "Maç sonu: kazanan sahnesi", aciklama: "Kapı açılır, ışık, altın patlaması — sonra maç sonu ekranı.", varsayilan: 4300, oneri: 3000, min: 2000, max: 6000, kaynak: "pages/KasaPage.jsx › FINAL_SAHNE_MS", dene: "kasaFinal" },
  { anahtar: "kasa_final_kapanis", mod: "kasa", baslik: "Maç sonu: kaybeden sahnesi", aciklama: "Hazine kapanır ve kararır — sonra maç sonu ekranı.", varsayilan: 3200, oneri: 2200, min: 1500, max: 5000, kaynak: "pages/KasaPage.jsx › FINAL_KAPANIS_MS", dene: "kasaKapanis" },
  { anahtar: "kasa_cifte", mod: "kasa", baslik: "\"ÇİFTE!\" bandı", aciklama: "İkisi de bilince patlama bandı.", varsayilan: 1400, oneri: 1400, min: 700, max: 2500, kaynak: "pages/KasaPage.jsx › CIFTE_MS", dene: "kasaCifte" },
  { anahtar: "kasa_savunma", mod: "kasa", baslik: "Savunma Hakkı anı", aciklama: "Tetik / savundu / düştü kalkanı.", varsayilan: 1500, oneri: 1500, min: 800, max: 3000, kaynak: "pages/KasaPage.jsx › SAVUNMA_AN_MS", dene: "kasaSavunma" },
  { anahtar: "kasa_joker_bilgi", mod: "kasa", baslik: "Joker bilgi satırı", aciklama: "\"İkinci Şans: bir kez daha dene!\" vb.", varsayilan: 1800, oneri: 2000, min: 1000, max: 3500, kaynak: "pages/KasaPage.jsx › jokerBilgiGoster (1800)", dene: "genel" },
  { anahtar: "kasa_devam_odul", mod: "kasa", baslik: "DEVAM ödülü bandı", aciklama: "DEVAM'ın açtığı soruda ödül (kaybedince ×0,6).", varsayilan: 2000, oneri: 1800, min: 1000, max: 3500, kaynak: "pages/KasaPage.jsx › devamAn (2000 / 1200)", dene: "genel" },
  { anahtar: "kasa_rakip_joker", mod: "kasa", baslik: "Rakip joker kullandı", aciklama: "Rakip avatarının altında joker ikonu.", varsayilan: 2200, oneri: 1500, min: 1000, max: 3500, kaynak: "pages/KasaPage.jsx › rakipJokerAn (2200)", dene: "genel" },
];

const TABLO = Object.fromEntries(SURELER.map((s) => [s.anahtar, s]));

function depoOku() {
  try {
    const ham = typeof localStorage !== "undefined" ? localStorage.getItem(SURE_DEPO) : null;
    const o = ham ? JSON.parse(ham) : null;
    if (!o || typeof o !== "object") return {};
    const temiz = {};
    for (const [k, v] of Object.entries(o)) {
      const s = TABLO[k];
      const n = Math.round(Number(v));
      if (s && Number.isFinite(n)) temiz[k] = Math.min(s.max, Math.max(s.min, n));
    }
    return temiz;
  } catch {
    return {};   // depo kapalı / bozuk → varsayılan
  }
}

let secimler = depoOku();
const dinleyiciler = new Set();

const cssAdi = (anahtar) => `--sr-${anahtar}`;
function cssUygula() {
  try {
    if (typeof document === "undefined") return;
    const st = document.documentElement.style;
    for (const s of SURELER) {
      if (secimler[s.anahtar] != null && secimler[s.anahtar] !== s.varsayilan) st.setProperty(cssAdi(s.anahtar), String(secimler[s.anahtar] / s.varsayilan));
      else st.removeProperty(cssAdi(s.anahtar));
    }
  } catch { /* yalnız sunum */ }
}
cssUygula();

function degisti() {
  cssUygula();
  dinleyiciler.forEach((f) => { try { f(); } catch { /* dinleyici hatası oyunu durdurmaz */ } });
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === SURE_DEPO) { secimler = depoOku(); degisti(); } });
}

/** Bugünkü (varsayılan) süre — orijinal sabitler bunu okur. */
export function varsayilanSure(anahtar) {
  const s = TABLO[anahtar];
  if (!s) throw new Error(`Bilinmeyen süre anahtarı: ${anahtar}`);
  return s.varsayilan;
}
/** Geçerli süre (ms): bu tarayıcıdaki seçim, yoksa varsayılan. */
export function sure(anahtar) {
  const v = secimler[anahtar];
  return v != null ? v : varsayilanSure(anahtar);
}
/** Geçerli / varsayılan oranı — alt adımlar ve CSS bununla ölçeklenir. */
export function sureOlcek(anahtar) {
  return sure(anahtar) / varsayilanSure(anahtar);
}
/** Değer yaz (null → varsayılana dön). Depo kapalıysa bu oturumda bellekte geçerli kalır. */
export function sureAyarla(anahtar, ms) {
  const s = TABLO[anahtar];
  if (!s) return;
  if (ms == null || Number(ms) === s.varsayilan) delete secimler[anahtar];
  else secimler[anahtar] = Math.min(s.max, Math.max(s.min, Math.round(Number(ms))));
  depoYaz();
  degisti();
}
export function sureleriSifirla() {
  secimler = {};
  depoYaz();
  degisti();
}
function depoYaz() {
  try {
    if (Object.keys(secimler).length) localStorage.setItem(SURE_DEPO, JSON.stringify(secimler));
    else localStorage.removeItem(SURE_DEPO);
    return true;
  } catch {
    return false;
  }
}
/** Depo yazılabilir mi (ayar sayfasında uyarı için). */
export function sureDeposuAcik() {
  try {
    const k = `${SURE_DEPO}-dene`;
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
/** Yalnız değiştirilmiş süreler { anahtar: ms }. */
export function sureSecimleri() {
  return { ...secimler };
}
export function sureDinle(f) {
  dinleyiciler.add(f);
  return () => dinleyiciler.delete(f);
}
