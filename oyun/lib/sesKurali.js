// SES BİTİŞ KURALI (Ida, 17 Eki 2026) — ses.js, ses üreticisi (araclar/ses-duzelt.mjs) ve testlerin (araclar/ses-dosya-sonu.mjs,
// araclar/ses-cikis-olcum.mjs) ORTAK tablosu. Saf modül: tarayıcı/Node ikisinde de içe aktarılır.
//
// Kural (bütün modlar, her anlamlı ses):
//   1. Ses kendi DOĞAL sonuna kadar çalar: kesilmez, erken söndürülmez, pencereye kısaltılmaz.
//   2. Ses doğal sonuna (seviye -45 dBFS altı) inmeden sonraki ekran ya da sonraki anlamlı ses gelmez.
//   3. İki anlamlı ses 50 ms'den fazla üst üste binmez (soru sesi dahil).
//   Süreler / faz zamanları DEĞİŞMEZ: kural, her anın sesinin o anın en dar penceresine DOĞAL hâliyle sığmasıyla sağlanır
//   (SINIR_MS). Sığmayan ses o anda hiç çalmaz (yarım ses yok); iki ses sığmıyorsa yalnız biri çalar.

/** Rol → /ses-secim anı (listede olmayan rol hep kendi dosyasını çalar). */
export const AN = {
  dokunus: "dokunus", sayfa_gecis: "sayfa_gecis", rakip_bulundu: "rakip_bulundu", vs_ani: "vs_ani",
  soru_geldi: "soru_geldi", tik: "geri_sayim_tik", sayim_son: "son_3_saniye", sure_doldu: "sure_doldu",
  dogru: "dogru", yanlis: "yanlis", joker: "skill", can_kaybi: "can_kaybi", kategori_secildi: "kategori_secildi",
  tur_gecis: "tur_gecis", rakip_cevapladi: "rakip_cevapladi", kazandin: "galibiyet", kaybettin: "maglubiyet",
  beraberlik: "beraberlik", coin: "coin", satin_alma: "satin_alma", xp_dolma: "xp_dolma", level: "level",
  rozet: "rozet", rutbe: "lig_atlama", turnuva: "turnuva", bildirim: "bildirim", hata_uyari: "hata_uyari",
  // Ajan K (24 Eyl 2026): her skill'in kendi anı (an adı = rol). Seçim yoksa skill'e özel eski dosya çalar.
  skill_elli: "skill_elli", skill_ek_sure: "skill_ek_sure", skill_soru_degistir: "skill_soru_degistir",
  skill_zaman_baskisi: "skill_zaman_baskisi", skill_ikinci_sans: "skill_ikinci_sans", skill_sigorta: "skill_sigorta",
  skill_2x: "skill_2x",
};

/** Anlam taşıyan roller (kural 1–3; pencereye sığmazsa çalmaz). */
export const ANLAMLI = new Set(["joker", "skill_elli", "skill_ek_sure", "skill_soru_degistir", "skill_zaman_baskisi", "skill_sigorta",
  "skill_2x", "skill_ikinci_sans", "sis", "rakip_bulundu", "vs_ani", "dogru", "yanlis", "sure_doldu", "kategori_secildi", "tur_gecis",
  "kazandin", "kaybettin", "beraberlik", "xp_dolma", "level", "rutbe", "rozet", "coin", "turnuva", "can_kaybi", "rakip_cevapladi"]);
/** Üst üste binme kuralına (kural 3) giren roller: anlamlılar + soru sesi + son saniye uyarıları. Tık sesleri (dokunuş, tik,
 *  sayım tiki; < 25 ms) kapsam dışı. */
export const BINME = new Set([...ANLAMLI, "soru_geldi", "son_saniyeler", "sayim_son"]);
/** Kapsam dışı tık rolleri (dosya sonu denetimi de bakmaz). */
export const TIK_ROLLERI = new Set(["dokunus", "tik", "sayim_tik", "sayfa_gecis"]);

export const ESIK_DB = -45;      // doğal son: 5 ms RMS bu seviyenin altına indiği an
export const BINME_MS = 50;      // izin verilen en çok üst üste binme

/**
 * Rol başına DOĞAL süre üst sınırı (ms) — o rolün çaldığı anların EN DAR penceresinden (sonraki ekran ya da sonraki anlamlı
 * ses), 40–50 ms pay düşülerek. Kaynak: RAPOR.md › envanter (17 Eki 2026). Üretici bu sınırı aşan dosyayı perdeyi koruyarak
 * kısaltır; test (ses-dosya-sonu) aşanı kırmızı yazar.
 *   soru_geldi  450 — soru sesinden sonra ilk anlamlı ses oyuncunun cevabı (dokunuş + RTT ≥ ~500 ms)
 *   dogru       430 — Hazine sonuç: rakip yanlışsa 480 ms'de kısık can kaybı sesi
 *   yanlis      800 — Klasik geri bildirim → sonraki soru en dar ~850 ms (Hazine'de 480 ms'deki can kaybı sesi bu durumda çalmaz)
 *   sure_doldu  300 — Grup/Turnuva: herkes cevaplamışken süre dolunca yeni soru ~2 RTT sonra gelebilir
 *   joker/skill 350 — joker işaretinden (rakibin ya da kendi) sonra hızlı cevap + RTT ~400 ms'de sonuç ekranı getirebilir
 *                     (Hazine taklit sunucu ölçümü, dalgalı ağ: rakip jokeri → sonuç 433 ms)
 *   kategori_secildi 250 — Düello açılış paneli → soru sesi en dar 300 ms (KATEGORI_SES_MIN_MS)
 *   rozet      2600 — Hazine giriş sahnesi (+1300 → soru 4000); AÇ ve DEVAM anı kendi kısa varyantlarını çalar (VARYANT_SINIR_MS)
 */
export const SINIR_MS = {
  soru_geldi: 450, dogru: 430, yanlis: 800, sure_doldu: 300,
  joker: 350, skill_elli: 350, skill_ek_sure: 350, skill_soru_degistir: 350, skill_zaman_baskisi: 350, skill_sigorta: 350,
  skill_2x: 350, skill_ikinci_sans: 350, sis: 420,
  rakip_cevapladi: 250, can_kaybi: 800, tur_gecis: 700, kategori_secildi: 250, sayim_son: 900, son_saniyeler: 700,
  rakip_bulundu: 2300, vs_ani: 2350, rozet: 2600, coin: 1000, xp_dolma: 1500,
  level: 3000, rutbe: 3000, kazandin: 3000, kaybettin: 3000, beraberlik: 3000, turnuva: 4000,
  satin_alma: 3000, bildirim: 3000, hata_uyari: 3000,
};
/**
 * Bir rolün belirli bir anda çalan kısa varyantı (Hazine). AÇ anı: rozet m(340)'ta, soru sesi anın sonunda (en dar ölçekte
 * 367 → 1380 ms) → 920 ms. DEVAM anı: rozet m(60)'ta, soru sesi anın sonunda (en dar 59 → 1380 ms) → 1230 ms.
 */
export const VARYANT_SINIR_MS = { rozet: { ac: 920, devam: 1230 } };

/** Seçim yok / "mevcut" iken çalan varsayılan dosyalar (public/ses) — ses.js › DOSYA ile aynı; listede olmayan rol <rol>.mp3.
 *  Üretici ve dosya sonu testi bu listeye bakar (tık rolleri hariç). */
export const VARSAYILAN_DOSYA = {
  sis: "joker.mp3", kazandin: "kazandin.wav", kaybettin: "kaybettin.wav", soru_geldi: "soru_geldi.wav", tur_gecis: "tur_gecis.wav",
  sayim_son: "sayim_son.wav", son_saniyeler: "son_saniyeler.wav", skill_elli: "skill_elli.wav", skill_ek_sure: "skill_ek_sure.wav",
  skill_soru_degistir: "skill_soru_degistir.wav", skill_zaman_baskisi: "skill_zaman_baskisi.wav", skill_sigorta: "skill_sigorta.wav",
  skill_2x: "skill_2x.wav", skill_ikinci_sans: "skill_ikinci_sans.wav", coin: "coin.wav", level: "level.wav", turnuva: "turnuva.wav",
  dogru: "dogru.mp3", yanlis: "yanlis.mp3", sure_doldu: "sure_doldu.mp3", joker: "joker.mp3", rakip_bulundu: "rakip_bulundu.mp3",
  can_kaybi: "can_kaybi.mp3", rutbe: "rutbe.mp3",
};
/** Çalma hızı (ses.js çağrısı): sis inişte 0.7 → doğal süre / 0.7. */
export const CALMA_HIZI = { sis: 0.7 };
