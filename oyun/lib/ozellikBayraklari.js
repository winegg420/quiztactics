// ============================================================
// ÖZELLİK BAYRAKLARI
//
// DONDURMA — Arayüz Yenileme, 20 Eylül 2026
// Meydan (3B harita) ve gardırop/karakter sistemi geçici olarak KAPALI.
// Yeni görseller hazırlanınca bayrak `true` yapılarak geri açılır.
// Kod, dosyalar, migration'lar ve veriler SİLİNMEDİ; yalnız arayüzden
// girişleri gizlendi ve rotalar ana sayfaya yönlendiriyor.
//
// Bayrak kapalıyken gizlenenler (hepsi bu dosyayı okur):
//   · Alt/üst menüdeki "Meydan" girişi           → oyun/components/Layout.jsx
//   · Üst çubuktaki "Görünüm" kısayolu           → oyun/components/Layout.jsx
//   · Dükkân › Görünüm (kıyafet) sekmesi         → oyun/pages/JokerDukkani.jsx
//   · Profil › Ayarlar › Görünüm kartı           → oyun/components/ProfilAyarlari.jsx
//   · Profil › "Meydanda ikramlar" ayarı         → oyun/components/ProfilAyarlari.jsx
//   · Meydandan turnuvaya katılma ve +20 coin    → oyun/pages/TournamentPage.jsx
//     (turnuvaya klasik düğmeden giriş AYNEN çalışır)
//   · /harita, /harita-deneme, /gorunum, /gorunum-3b rotaları
//                                                → src/BildimApp.jsx
//
// GERİ AÇMA: aşağıdaki iki değeri `true` yap. Başka hiçbir şey gerekmez.
//
// vite.config.js'e DOKUNULMADI — avatar3d çok girişli derlemesi orada
// duruyor; dondurma yalnız rota ve menü seviyesindedir.
// Veritabanına da dokunulmadı: meydan bot cron işleri çalışmaya devam eder
// (kapatma kararı sahibinin).
// ============================================================

export const MEYDAN_ACIK = false;
export const GARDIROP_ACIK = false;

// DÜKKÂN PREMIUM ÇERÇEVELER DONDURMA — 7 Ekim 2026 (Ida): Kraliyet, Şimşek, Galaksi, Alev, Sonbahar, Sakura
// (pc_*) dükkândan kalktı. Sunucu kapısı migration 990 (kozmetikler.aktif=false: satın alma/takma reddedilir,
// oyuncu kartı premium_cerceve=null → avatar lig çerçevesine düşer). Sahiplik/takılı veri SİLİNMEDİ.
// Bu bayrak yalnız Dükkân › Çerçeve sekmesini gizler. Ejderha (pc_ejderha2) Battle Pass ödülüdür, dükkânda satılmaz.
// GERİ AÇMA: bayrağı true yap + 990'daki geri alma satırını çalıştır.
export const DUKKAN_PREMIUM_CERCEVE_ACIK = false;
