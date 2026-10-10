# Quiz Tactics 🧠⚡

Türkçe bilgi yarışması — 1v1 maçlar, günde 5 turnuva seansı, haftalık lig ve sezonluk Battle Pass. Canlı: https://quiztactics.com

## Oyun

- ⚡ **Klasik** — 1v1 bilgi maçı. Süre içinde doğru cevaplayan herkes aynı puanı alır (hız bonusu yok); jokerlerle desteklenir. **Dereceli** (lig puanı + tam coin) ya da **Serbest** (lig puanı yok, coin %50).
- 🥊 **Düello v4** — Taktik maçı. Kimin doğru bildiği kontrolü belirler; kontrol sahibi rakibe kategori gönderir, ardışık doğrularla seriyi 3/3'e çıkaran kazanır. 20 saldırı turundan sonra jokersiz **Son Düello**.
- 💰 **Ortak Hazine** — İki oyuncu ortak hazineyi büyütür; tek başına bilen **AÇ** (puanı al) ya da **DEVAM** (hazine ×2) der. Hedef 80 puan; DEVAM ile kazanılan Savunma Hakkı.
- 🌙 **Turnuva** — Günde 5 seans, TSİ **10:00 · 14:00 · 18:00 · 20:00 · 24:00**; eleme usulü, eşitlikte Altın Soru.
- 🏅 **Lig** — Bronz → Gümüş → Altın → Elmas → Efsane; 25 kişilik gruplar, ilk 5 yükselir, son 5 düşer, pazartesi 00:00 (TSİ) sıfırlanır.
- 🎟️ **Sezon Yolu (Battle Pass)** — 28 günlük sezon; Sezon Puanı herkese ödül verir, Battle Pass (elmasla) ek ödüller açar.
- 🧑‍🎨 **Avatarlar** — Yaygın avatarlar ücretsiz; Nadir avatarlar level atladıkça, Sezon Yolu'nun ücretsiz kolunda ya da Dükkân'da coinle açılır; Epik ve Efsanevi elmasla (bazıları Battle Pass ödülü).
- ✨ **Cevap İmzası** — doğru cevapta doğru şıkta oynayan, yalnız oyuncunun kendisinin gördüğü kişisel efekt (Dükkân › Efekt; Nadir coinle, Epik/Efsanevi elmasla).
- 👥 Arkadaşlar, meydan okuma, rövanş, grup maçı, saf bilgi, hatalarım, görevler, dükkân ve koleksiyon.
- 🤖 **Claude API ile soru üretimi** — Sorular Edge Function ile üretilir ve veritabanına kaydedilir.
- 🔐 Google / Facebook / X ile giriş, e-posta sihirli bağlantı ve misafir oyun.

## Teknolojiler

React 19 + Vite 7 + React Router 7 · three.js · Supabase (Auth, Realtime, Postgres, Edge Functions, pg_cron) · Vercel · Claude API

## Kurulum

```bash
npm install
cp .env.example .env   # Supabase URL + anon key gir
npm run dev
```

### Supabase

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
- **Turnuva ilerleyişi** dakikalık pg_cron zamanlayıcısıyla (`turnuva_zamanlayici_tik`) yürür; saatler `oyun_ayarlari.turnuva_saatleri` tablosundan okunur.
- **Puanlar** yalnızca sunucu tarafında değişir (kolon bazlı yetkilerle istemci güncellemesi engellidir).
