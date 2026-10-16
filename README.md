# Quiz Tactics 🧠⚡

Türkçe bilgi yarışması — 1v1 maçlar, günde 5 turnuva seansı, haftalık lig ve sezonluk Battle Pass. Canlı: https://quiztactics.com

## Oyun

- ⚡ **Klasik** — 1v1 bilgi maçı. Süre içinde doğru cevaplayan herkes aynı puanı alır (hız bonusu yok); jokerlerle desteklenir. **Dereceli** (lig puanı + tam coin) ya da **Serbest** (lig puanı yok, coin %50).
- 🥊 **Düello v4** — Taktik maçı. Kimin doğru bildiği kontrolü belirler; kontrol sahibi rakibe kategori gönderir, ardışık doğrularla seriyi 3/3'e çıkaran kazanır. Toplam 20. soru (nötr ve saldırı birlikte) jokersiz **Son Düello**; en çok 10 soru sürer, kazanan çıkmazsa maç berabere biter ve iki oyuncu ödülün yarısını alır. İlk Düello'da kısa rehber balonları.
- 💰 **Ortak Hazine** — İki oyuncu ortak hazineyi büyütür; tek başına bilen **AÇ** (puanı al) ya da **DEVAM** (hazine ×2) der. Hedef 80 puan; DEVAM ile kazanılan Savunma Hakkı. Karar anında hazine büyüdükçe kalp atışı hızlanır; ilk Hazine maçında kısa rehber balonları.
- 🌙 **Turnuva** — Günde 5 seans, TSİ **10:00 · 14:00 · 18:00 · 20:00 · 24:00**; eleme usulü, eşitlikte Altın Soru.
- 🏅 **Lig** — Bronz → Gümüş → Altın → Elmas → Efsane; 25 kişilik gruplar, ilk 5 yükselir, son 5 düşer, pazartesi 00:00 (TSİ) sıfırlanır.
- 🎟️ **Sezon Yolu (Battle Pass)** — 28 günlük sezon; Sezon Puanı herkese ödül verir, Battle Pass (elmasla) ek ödüller açar.
- 🧑‍🎨 **Avatarlar** — Yaygın avatarlar ücretsiz; Nadir avatarlar level atladıkça, Sezon Yolu'nun ücretsiz kolunda ya da Dükkân'da coinle açılır; Epik ve Efsanevi elmasla (bazıları Battle Pass ödülü).
- ✨ **Battle Pass parlaması** — Sezonun Battle Pass'ine sahipsen avatarının fotoğrafında ara ara beyaz yıldızlar çakar; her ekranda herkes görür. Sezon bitip yeni Battle Pass alınmazsa kalkar. Saf kozmetik, güç vermez.
- 🏅 **Herkes çerçeveli** — Her oyuncunun avatarında en az ligin çerçevesi görünür (yeni oyuncu Bronz'dan başlar); kazanılmış başka çerçeve takılıysa o görünür.
- ✨ **Cevap İmzası** — doğru cevapta doğru şıkta oynayan, yalnız oyuncunun kendisinin gördüğü kişisel efekt (Dükkân › Efekt; Nadir coinle, Epik elmasla): Neon Tik, Yıldız Patlaması, Bilgi Ampulü, Elektrik Akımı. Yanan Kart dondurulmuştur (satılmaz, oynamaz).
- 📶 **Bağlantı koparsa 60 sn** — Klasik, Saf Bilgi, Düello ve Ortak Hazine'de bağlantın koparsa ya da uygulamadan çıkarsan maç 60 saniye bekler: süre/soru kaybetmezsin, dönünce kaldığın yerden sürer; rakibin kalan süreyi görür.
- ⏱️ **Sayaç beklemez** — Süre dolunca (dokunmadıysan) oyun sunucuya hemen "cevabım yok" der: Ortak Hazine, Düello, Grup ve Turnuva'da sonuç ya da sonraki adım beklemeden gelir (eskiden 0'da ~5 sn kalıyordu); arada sayaçta kısa "•••". Sayaç sunucu saatinden düzgün akar, ileri/geri sıçramaz. Oyun kendi zamanlamasını ölçer (sayaç sapması, 0'da kalma, geç geçiş, donma, geç ses) — kişisel veri olmadan.
- 👀 **Rakibin şıkkı ve ortalama cevap süren** — Klasik, Saf Bilgi ve Ortak Hazine'de soru kapanınca rakibin hangi şıkkı seçtiği küçük avatarıyla görünür; maç sonunda "Ort. cevap 6,2 sn · rakip 8,1 sn".
- 👥 Arkadaşlar, meydan okuma, rövanş, grup maçı, saf bilgi, hatalarım, görevler, dükkân ve koleksiyon.
- 🤖 **Claude API ile soru üretimi** — Sorular Edge Function ile üretilir ve veritabanına kaydedilir.
- 📤 **Paylaş** — Maç sonu (Klasik, Saf Bilgi, Düello, Ortak Hazine, Grup, Turnuva — çok oyunculu modlarda kartta derece) ve Arkadaşlar › davet bölümünde sistem paylaşım menüsü (Instagram, TikTok, WhatsApp …): 1080×1920 maç sonucu ya da davet kartı + davet kodu/bağlantısı; paylaşım yoksa bağlantı panoya kopyalanır.
- 📲 **Yalnız uygulama** — Oyun kurulu uygulamada oynanır (iPhone: Safari › Paylaş › Ana Ekrana Ekle · Android/masaüstü Chrome-Edge: Uygulamayı yükle · macOS Safari: Dock'a Ekle). quiztactics.com tarayıcıda tanıtım + kurulum sayfasıdır; Firefox gibi kurulum desteklemeyen tarayıcılara telefon için QR gösterilir. Tarayıcıda açılan davet linki kurulumdan sonra uygulamada "X seni davet etti, doğru mu?" diye sorulur; bildirim izni yalnız uygulamada istenir (iPhone: iOS 16.4+).
- 🔐 Google / Facebook / X ile giriş, e-posta kodu (uygulama içinde girilir) ve misafir oyun.

## Teknolojiler

React 19 + Vite 7 + React Router 7 · three.js · Supabase (Auth, Realtime, Postgres, Edge Functions, pg_cron) · Vercel · Claude API

## Kurulum

```bash
npm install
cp .env.example .env   # Supabase URL + anon key gir
npm run dev
```

### Supabase

Canlı proje: `etezccrifaetzrgfvawl` (13 Eki 2026'dan beri). Eski (hub) proje: `zfpnxzybcpkxsotwdsey`.

```bash
npx supabase login
npx supabase link --project-ref <PROJE_REF>
npx supabase db push                          # şema + migration'lar + cron
npx supabase functions deploy generate-questions
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... CRON_SECRET=<rastgele-gizli>
```

Soru üretimini elle tetiklemek için:

```bash
curl -X POST "https://<PROJE_REF>.supabase.co/functions/v1/generate-questions" \
  -H "x-cron-secret: <CRON_SECRET>"
```

Saatlik otomatik üretim için SQL Editor'da (URL ve secret'ı kendi değerlerinle değiştir):

```sql
select cron.schedule('bildim-soru-uret', '30 * * * *', $$
  select net.http_post(
    url := 'https://<PROJE_REF>.supabase.co/functions/v1/generate-questions',
    headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
  )
$$);
```

### Sosyal giriş (OAuth)

Supabase Dashboard → **Authentication → Providers**:

1. **Google** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials)'dan OAuth Client ID oluştur; redirect URL olarak `https://<PROJE_REF>.supabase.co/auth/v1/callback` gir.
2. **Facebook** — [Meta for Developers](https://developers.facebook.com/)'dan uygulama oluştur, Facebook Login ekle, aynı callback URL'i gir.
3. **Twitter/X** — [X Developer Portal](https://developer.x.com/)'dan uygulama oluştur (OAuth 2.0), aynı callback URL'i gir.

Ayrıca **Authentication → URL Configuration**'da Site URL'i Vercel adresinle güncelle.

> Not: Instagram OAuth Supabase tarafından desteklenmediği için bilinçli olarak yoktur.

### Vercel

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

## Mimari notlar

- **Sorular istemciden okunamaz** (doğru cevap sızmasın diye); soru çekme ve cevap kontrolü tamamen `security definer` RPC'lerle yapılır.
- **Zamanlama sunucu taraflıdır**: cevap süresi ve geç varış payı sunucuda doğrulanır; istemci saat sapması telafi edilir.
- **Maç başı senkronu (tüm modlar)**: ilk soru, bütün oyuncular maç ekranına geldikten sonra "o an + 3 sn sayım + gösterim payı" olarak kurulur (rakip gelene dek "Rakip bağlanıyor…"); herkes 3-2-1'i baştan görür; başlangıç belli olup gösterim payı sürerken rakam yerine canlı "Rakip bekleniyor…" çizilir, rakamlar ancak son 3 sn'de ve her biri 1 sn (Hazine'de 3-2-1 giriş sahnesinin içinde, sahne öncesi aynı bekleme). İstemcide tek sunucu saati (`oyun/lib/sunucuSaati.js`) ve tek sayım (`MacHazirlik › useGeriSayim`). Doğrulama: `araclar/senkron-testi.mjs`.
- **Turnuva ilerleyişi** dakikalık pg_cron zamanlayıcısıyla (`turnuva_zamanlayici_tik`) yürür; saatler `oyun_ayarlari.turnuva_saatleri` tablosundan okunur.
- **Puanlar** yalnızca sunucu tarafında değişir (kolon bazlı yetkilerle istemci güncellemesi engellidir).
