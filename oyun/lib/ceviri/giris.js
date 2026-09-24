// İngilizce çeviri eki — Tasarım Adım 2, şerit "giris". Anahtar Türkçe metnin kendisidir
// (dil.js ile aynı kural). Şeritler paralel çalıştığı için her biri kendi dosyasına yazar;
// dil.js bu dosyaları SOZLUK.en'e katar (buradaki karşılık önce gelir).
export default {
  // ——— Giriş ekranı (src/pages/Login.jsx) ———
  "Yasal metinler": "Legal",

  // ——— Yedek ekranlar (src/BildimApp.jsx) ———
  "Supabase yapılandırması eksik.": "Supabase configuration is missing.",
  ".env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.":
    "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the .env file.",

  // ——— Kullanım koşulları: "joker" → "skill" adlandırmasından sonra eksik kalan karşılıklar ———
  "6. Sanal öğeler, skiller ve satın almalar": "6. Virtual items, jokers and purchases",
  "Puan, rütbe, rozet ve skiller": "Points, ranks, badges and jokers are",
};
