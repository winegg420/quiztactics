# Coin Satın Alma Denetimi

**Tarih:** 23 Eylül 2026 · **Kapsam:** yalnız okuma. Kod, migration ya da veritabanı değişmedi.
**Yöntem:** depo taraması (`src/`, `oyun/`, `public/`, `supabase/functions/`,
`supabase/migrations/`, `vercel.json`, `package.json`, manifest) ve canlı Postgres'e
salt-okunur sorgular (`araclar/pg-mini.mjs`, oturum `transaction read only`). Ek olarak
Edge Function'a yan etkisi olmayan iki istek atıldı ve canlı `assetlinks.json` okundu.

---

## Kısa sonuç

| Soru | Cevap |
|---|---|
| Gerçek parayla coin satın alma var mı? | **Kodu var, çalışmıyor.** Tek yol Google Play Billing (TWA içinde Digital Goods API + Payment Request). Başka ödeme sağlayıcısı yok. |
| Hiç gerçek satın alma yapıldı mı? | **Hayır.** `coin_hareketleri` içinde `tur='satin_alma'` satırı 0, `satin_almalar` tablosu 0 satır. |
| Sunucuda doğrulama var mı? | Var (`satin_alma_dogrula` Edge Function → Play Developer API). Fonksiyon **dağıtılmış** ama **secret'lar eksik** ve canlıda **503** dönüyor. |
| Android/TWA paketi var mı? | **Yok.** Yalnız yer tutucu bir `assetlinks.json` ve PWA manifesti var. |
| İstemciden coin şişirilebilir mi? | Bakiye doğrudan yazılamıyor. Ama satın alma yolunda **3 açık** (aşağıda §3.3) ve reklam ödülünde reklamı izlemeden coin alınabiliyor. |

---

## 1. Gerçek parayla coin satın alma

**Sağlayıcı: yalnız Google Play Billing.** Kanıtlar:

- `oyun/lib/playFatura.js:15` → `PLAY_SERVICE = "https://play.google.com/billing"`
- `oyun/lib/playFatura.js:17-23` → `getDigitalGoodsService` ve `PaymentRequest` var mı kontrolü
- `oyun/lib/playFatura.js:35-58` → `fiyatlariAl`: fiyatlar Play'den `getDetails` ile okunur
- `oyun/lib/playFatura.js:64-89` → `satinAl`: `new PaymentRequest([{supportedMethods: PLAY_SERVICE, data:{sku}}])`, dönüşte `purchaseToken` alınır
- `oyun/lib/playFatura.js:92-99` → `tuket`: `consume(jeton)`. Hata olursa **sessizce yutuluyor**.
- `oyun/pages/JokerDukkani.jsx:195-227` → `paketAl`: satın al → `functions/v1/satin_alma_dogrula`'ya POST → `tuket`
- `oyun/pages/JokerDukkani.jsx:571-606` → Tarayıcıda "Satın alma yalnızca Android uygulamasında yapılabilir" yazıyor, düğme pasif.

**Başka sağlayıcı bulunamadı.** Depoda (node_modules, dist, tasarım prototipi hariç)
Stripe, iyzico, PayPal, Paddle, LemonSqueezy, RevenueCat, Braintree ve `checkout` araması
yapıldı. Tek eşleşme soru metinlerindeki "Stars and Stripes". `package.json`'da
ödemeyle ilgili paket yok.

---

## 2. Coin paketleri ve fiyatlar

### 2.1 Gerçek parayla satılan coin paketleri

Tanım `supabase/migrations/20260612000131_coin_ekonomisi.sql:424-438`, tablo
`public.coin_paketleri`. Canlıdaki hali:

| urun_id | Ad | Coin | Bonus | Toplam |
|---|---|---|---|---|
| `coin_500` | Küçük Kese | 500 | 0 | 500 |
| `coin_1200` | Orta Kese | 1.200 | 100 | 1.300 |
| `coin_3000` | Büyük Kese | 3.000 | 400 | 3.400 |
| `coin_8000` | Hazine | 8.000 | 1.500 | 9.500 |

**TL fiyatı hiçbir yerde yok. Bu bilerek yapılmış:** fiyatı Play Console belirleyecek,
arayüz onu Digital Goods API'den okuyacak. Tablo yalnız "hangi ürün kimliği kaç coin
verir" bilgisini tutuyor. Play Console'da bu 4 ürün henüz tanımlanmamış (Android
uygulaması hiç yüklenmediği için tanımlanamaz da).

Eski **joker paketleri** de Play ürünü olarak tasarlanmıştı (`joker_10`, `joker_30`,
`joker_100`, `seri_koruma_3`). Edge Function, coin paketi olmayan her ürün kimliğini
hâlâ `satin_alma_isle` (joker) yoluna gönderiyor (`supabase/functions/satin_alma_dogrula/index.ts:150-167`).
Bugün bu paketler dükkânda yalnız coin ile satılıyor.

### 2.2 Oyun içinde coin ile satın alınanlar

Hepsi sunucuda, `coin_harca` üzerinden yapılıyor. `coin_harca` bakiyeyi `FOR UPDATE` ile
kilitliyor, yetersiz bakiyede hata veriyor. Fiyatlar `oyun_ayarlari` tablosunda ya da
katalog tablolarında duruyor.

| Ne | Fiyat kaynağı (canlı değer) | RPC |
|---|---|---|
| Tek skill hakkı | `coin_joker_<tür>`: elli 20, sure 20, soru_degistir 30, zaman_baskisi 30, ikinci_sans 30, sigorta 60, cifte_puan 60 | `joker_tek_al`, maç içinde `joker_al_ve_kullan` |
| 10'lu skill paketi | `coin_joker_<tür>_10`: 170 / 170 / 255 / 255 / 255 | `joker_coin_ile_al` (`joker_paketleri.coin_fiyat`) |
| Eski karışık paketler | `joker_paketleri.coin_fiyat`: 400 / 1.000 / 3.000, Seri Kalkanı 400 | `joker_coin_ile_al` |
| Skill kilidi | `skill_katalogu.kilit_fiyati` (bugün 7 skill'in hepsi 0) | `skill_kilidi_ac` |
| Kozmetik eşya | `esya_fiyat_*`: sıradan 300–600, özel 1.200–2.500 | `esya_satin_al`, `karakter_satin_al`, `avatar3d_satin_al` (gardırop dondurulmuş) |
| Meydan ikramı / olta | `coin_ikram` 5, `olta_fiyat` 5 | `ikram_gonder`, olta RPC'si (meydan dondurulmuş) |

---

## 3. Sunucu doğrulaması ve coin'i artıran yollar

### 3.1 Bakiye koruması (sağlam)

- Bakiye `profiles.coin` alanında tutuluyor. `profiles_update_own` politikası oyuncunun kendi
  satırını güncellemesine izin veriyor. Ancak `trg_profiles_coin_koru` tetikleyicisi (canlıda
  etkin, `coin_ekonomisi.sql:98-116`) `coin` değişikliğini reddediyor. Bu tetikleyiciyi
  yalnız işlem içinde `app.coin_izin='1'` ayarlandığında geçmek mümkün. Bu ayarı yalnız
  `coin_ekle` ve `coin_harca` yapıyor.
- `coin_ekle` fonksiyonunda **anon ve authenticated için EXECUTE yok** (canlıda
  `has_function_privilege` ile doğrulandı).
- `coin_hareketleri`, `coin_paketleri`, `oyun_ayarlari`: RLS açık, yalnız SELECT politikası var.

### 3.2 Coin'i artıran bütün fonksiyonlar (canlı `pg_proc` taraması)

**İstemciden çağrılabilenler** (authenticated için EXECUTE var, hepsi `security definer`):

| Fonksiyon | Ne verir | Koruma |
|---|---|---|
| `reklam_odulu_al(p_reklam_ref)` | 25 coin | Günde 5 kez, aynı referans iki kez kullanılamıyor, hız sınırı var. **Reklamın izlendiği sunucuda doğrulanmıyor** (§3.3-D). |
| `claim_quest(p_quest_id)` | 15 coin | Görev sayacını sunucu hesaplıyor, gün+görev için tek kayıt |
| `claim_referral(p_davet_eden)` | 200 + 200 coin | Yalnız hesabın ilk 24 saatinde, bir kez, bota verilmiyor, aynı cihazdan verilmiyor |
| `hizli_mod_bitir` | Tavanı 25 | Hızlı Mod dondurulmuş, tek kayıt indeksi var |
| `balik_yakala` | 1 coin | Günde 20, sunucu zamanlıyor (meydan dondurulmuş) |
| `meydan_turnuva_damgasi` | 20 coin | Sunucuda zaman penceresi kontrolü, turnuva başına bir kez |
| `ikram_gonder` / `ikram_yanitla` | Yalnız iade (`ikram_iade`) | İade, önce düşülen coin'i geri veriyor |

Maç, turnuva, lig, seri ve level ödülleri istemciden çağrılamıyor: `coin_mac_odulu`,
`turnuva_odullerini_dagit`, `lig_haftayi_kapat`, `seri_guncelle`, `xp_ver`,
`handle_new_user` ve `ikram_zaman_asimi` için EXECUTE yok. Bunları sunucu
fonksiyonları ya da tetikleyiciler çağırıyor.

**Yalnız service_role çağırabilenler:** `coin_satin_alma_isle`, `satin_alma_isle` ve
`joker_ekle`. Bunlara anon ve authenticated EXECUTE veremiyor. Yani **istemci
"satın aldım" diyerek doğrudan coin ekleyemiyor**; tek giriş kapısı Edge Function.

Günlük tavan: `coin_ekle` her kazancı `coin_gunluk_tavan` (400) değerine göre kırpıyor.
`satin_alma`, `baslangic`, `ikram_iade`, `davet` ve `seviye` bu tavandan muaf. Yani satın
alınan coin tavana takılmıyor, doğru.

### 3.3 Açıklar ve eksikler (öncelik sırasıyla)

**A — Aynı satın alma jetonu (Play'in verdiği makbuz kodu) iki kez işlenebiliyor. Yüksek.**
`coin_satin_alma_isle` tekrarı yalnız `user_id = p_user and referans = p_token` ile
kontrol ediyor. `coin_hareketleri` tablosunda `tur='satin_alma'` için benzersizlik indeksi
**yok**. Canlıdaki indeksler yalnız `mac`, `baslangic`, `davet`, `seviye` ve `hizli_mod`
türlerini kapsıyor. Bu iki sonuç doğuruyor:
1. Aynı jeton **başka bir hesapla** gönderilirse Play doğrulaması yine geçer ve coin
   ikinci hesaba da yazılır. Edge Function, satın almanın hangi hesaba ait olduğunu
   (`obfuscatedExternalAccountId`) kontrol etmiyor.
2. Aynı hesaptan **eşzamanlı iki istek** gelirse ikisi de `exists` kontrolünü geçebilir.
   Kontrol sırasında kilit ya da benzersizlik kısıtı yok.
Joker yolunda (`satin_alma_isle`) bu sorun yok: orada `satin_almalar.play_token` üzerinde
benzersizlik kısıtı var.

**B — Tüketim (consume) istemciye bırakılmış. Yüksek.**
Sunucu coin'i yazıyor, ürünü ise istemci `tuket()` ile tüketiyor ve bu adımın hatası
yutuluyor (`playFatura.js:92-98`). Edge Function satın almayı ne onaylıyor
(acknowledge) ne de tüketiyor (`index.ts:136-139` boş bir `if`). Google, 3 gün içinde
onaylanmayan satın almayı **otomatik iade eder**. Oyuncu doğrulamadan sonra ağı keserse
ya da uygulamayı kapatırsa parası geri döner ama coin hesabında kalır. Çözüm: Edge
Function'da, coin yazıldıktan sonra `purchases.products.consume` çağrılmalı.

**C — İade ve iptal takibi yok. Orta.**
Real-time developer notifications (RTDN) ya da Voided Purchases API işlenmiyor. Play'den
iade alan oyuncunun coin'i silinmiyor. Kodda `listPurchases`, `voided` ya da `refund`
geçmiyor.

**D — Reklam ödülü, reklam izlenmeden alınabiliyor. Orta.**
`reklam_odulu_al` herhangi bir referans metniyle çağrılabiliyor
(`JokerDukkani.jsx:181` referansı istemcide üretiyor). Konsoldan günde 5 × 25 = 125 coin
bedava alınabilir. Sunucu tarafında reklam doğrulaması (SSV) yok. H5 Games Ads böyle bir
doğrulama sunmuyorsa bu risk bilerek kabul edilmeli ya da tavan düşürülmeli.

**E — Satın alma defteri tutulmuyor. Orta.**
Coin satın alımları yalnız `coin_hareketleri` tablosuna jetonla yazılıyor. Sipariş
numarası (`orderId`), fiyat, para birimi ve ülke saklanmıyor. `satin_almalar` tablosu
yalnız joker yolunda kullanılıyor. Muhasebe, iade eşleştirme ve destek talepleri için
bu bilgiler gerekir.

**F — Test ekonomisi canlıda. Yayın engeli.**
Yeni hesaplar **10.000 coin** ile başlıyor (`handle_new_user` → `baslangic_coin` =
10000, migration 252). `PROJECT_CONTEXT.md` ise "başlangıç 500" diyor; bu satır canlıyla
çelişiyor. Ayrıca `ekonomi_esitleme` türünde 206 hareketle toplam 2.006.202 coin
dağıtılmış. Herkesin elinde 10.000 coin varken en büyük paket (9.500) satın almaya
değmez. Gerçek parayla satıştan önce bakiyelerin ve başlangıç değerinin kararı gerekiyor.

**G — Tablo yetkileri gereğinden geniş. Düşük (ek güvence).**
`coin_hareketleri`, `coin_paketleri` ve `oyun_ayarlari` tablolarında anon ve
authenticated rollerinin INSERT, UPDATE ve DELETE yetkisi var (Supabase'in varsayılan
yetkileri). Bugün RLS'de yazma politikası olmadığı için bu yetkiler kullanılamıyor. Ancak
RLS bir gün kapanırsa ya da gevşek bir politika eklenirse oyuncu, **paketin kaç coin
verdiğini** değiştirebilir. Bu yetkiler geri alınmalı (`revoke`).

**H — Misafir hesap satın alabiliyor. Düşük.**
`JokerDukkani.jsx` içinde anonim hesap kontrolü yok. Misafir hesap oturumu kaybederse
satın aldığı coin de gider. Satın almadan önce hesabın Google ya da e-postaya bağlanması
istenmeli.

---

## 4. TWA / Play Store paketlemesi

| Öğe | Durum | Kanıt |
|---|---|---|
| Android projesi (`twa-manifest.json`, `build.gradle`, `AndroidManifest.xml`, keystore) | **Yok.** Depoda bulunamadı. | Dosya adıyla tüm depo tarandı |
| `assetlinks.json` | **Yer tutucu.** Canlıda HTTP 200, `application/json` dönüyor. | `public/.well-known/assetlinks.json:6-8`: paket `com.quiztactics.app` (23 Eyl 2026 kararı; eski `com.idagg.bildim`), parmak izi `BURAYA_IMZA_ANAHTARININ_SHA256_PARMAK_IZI_YAZILACAK` |
| PWA manifesti | Var ve TWA için yeterli: `display: standalone`, 192 ve 512 ikon, maskable 512 | `public/bildim.webmanifest`, `index.html:34` |
| Service worker | Var | `public/sw.js` |
| Bubblewrap talimatı | Yalnız eski notlarda | `PROGRESS.md:1481-1491`. Adres eski hub'ı (`idagg-game-center.vercel.app`) gösteriyor; güncel değil. |
| `Permissions-Policy: payment=()` | Yalnız `public/_headers` dosyasında. Bu dosya Cloudflare içindir, Vercel onu yok sayıyor. | `public/_headers:7`. Canlı yanıtta bu başlık yok. İleride eklenirse Payment Request'i engeller. |

---

## 5. Yayına çıkmak için eksikler (sırayla)

**Önce karar ve hesap işleri (yalnız Ida yapabilir):**
1. **Ekonomi kararı.** Başlangıç coin'i (bugün 10.000), mevcut şişkin bakiyeler ve paket
   miktarları belirlenmeli. Bu karar verilmeden gerçek parayla satılan coin değersiz kalır (§3.3-F).
2. **Hizmet sağlayıcının kimliği.** Satış şahıs adına mı, şirket adına mı yapılacak?
   Koşullar sayfası bunu taslak olarak boş bırakıyor (`KosullarPage.jsx:9-10`). Play Console
   geliştirici hesabı türü, ödeme profili ve vergi bilgileri buna bağlı.
3. **Play Console geliştirici hesabı ve ödeme profili (merchant).** Uygulama içi ürün
   satmak için ödeme profili zorunlu. Kişisel hesaplarda Google, üretime çıkmadan önce
   kapalı test şartı koyuyor (bugünkü kural 12 test kullanıcısı ve 14 gün; başvuru
   sırasında Play Console'dan doğrulanmalı).
4. **Paket adı — karar verildi (23 Eyl 2026):** `com.quiztactics.app` (eski ad
   `com.idagg.bildim`). `assetlinks.json` ve `satin_alma_dogrula` yorumu güncellendi.
   Paket adı yayından sonra değiştirilemez; Play Console'da uygulama bu adla açılmalı,
   `PLAY_PACKAGE_NAME` secret'ı bu değerle girilmeli.
5. **Vergi.** Play Console'da vergi profili doldurulmalı. Google'ın Türkiye ve diğer
   ülkelerde KDV'yi kendisi tahsil edip etmediği Play'in güncel listesinden kontrol
   edilmeli. Gelirin beyanı için mali müşavire danışılmalı. (Bu rapor vergi durumunu
   doğrulamadı.)

**Teknik işler (sırayla):**
6. **Satın alma RPC'sini sağlamlaştır (§3.3-A, E).** Yeni bir migration'la
   `coin_hareketleri` için `(tur, referans) where tur='satin_alma'` benzersizlik indeksi
   eklenmeli, jeton hesaptan bağımsız tekil olmalı. Ayrıca bir satın alma defteri
   (`orderId`, ürün, fiyat, para birimi, durum) tutulmalı.
7. **Edge Function'ı tamamla (§3.3-A, B).** Satın alma, jetonun ait olduğu hesapla
   eşleştirilmeli (`obfuscatedAccountId`; Digital Goods API'de bunun nasıl
   gönderileceği ayrıca doğrulanmalı). Coin yazıldıktan sonra **sunucuda consume**
   çağrılmalı. `purchaseType` (test satın alması) kaydedilmeli. Başarısız istekler
   loglanmalı.
8. **Yarım kalan satın almaları kurtarma.** Uygulama açılışında `listPurchases()` ile
   tüketilmemiş satın almalar bulunup sunucuya yeniden gönderilmeli. Bugün doğrulama
   sırasında bağlantı koparsa oyuncu öder ama coin alamaz.
9. **İade takibi (§3.3-C).** RTDN (Pub/Sub → Edge Function) ya da günlük Voided Purchases
   cron'u kurulmalı; iade edilen coin geri alınmalı ya da hesap işaretlenmeli.
10. **Tablo yetkilerini daralt (§3.3-G)** ve **satın almadan önce hesap bağlatmayı iste (§3.3-H).**
11. **Reklam ödülü kararı (§3.3-D).** Sunucu tarafı doğrulama ya da daha düşük tavan.
    `VITE_H5_ADS_CLIENT` boş kaldıkça reklam düğmesi zaten pasif.
12. **TWA paketi.** Bubblewrap, canlı adresle (`quiztactics.vercel.app`) ve
    `--enablePlayBilling` bayrağıyla çalıştırılmalı. İmza anahtarı güvenli bir yerde
    saklanmalı. Play App Signing kullanılıyorsa **Play'in** SHA-256 parmak izi
    `assetlinks.json`'a yazılmalı. Yanlış parmak izi uygulamada adres çubuğu çıkmasına
    yol açar.
13. **Secret'lar.** `PLAY_SERVICE_ACCOUNT` (Play Console'a bağlı, "finans" yetkili Google
    Cloud servis hesabı JSON'u) ve `PLAY_PACKAGE_NAME` Supabase'e girilmeli. Bugün
    fonksiyon 503 dönüyor. Fonksiyon kaynağı değişeceği için yeniden dağıtılmalı. Canlıda
    dağıtılmış sürümün depodakiyle aynı olduğu bu denetimde doğrulanmadı.
14. **Play Console'da ürünler.** `coin_500`, `coin_1200`, `coin_3000` ve `coin_8000`,
    tüketilebilir ürün olarak tanımlanıp fiyatlandırılmalı. Eski joker Play ürünleri
    oluşturulmayacaksa Edge Function'daki joker yolu kapatılmalı.
15. **Uçtan uca test.** Lisans test hesaplarıyla dahili test kanalında satın alma →
    doğrulama → coin → consume → iade akışı denenmeli.

**Hukuki ve mağaza metinleri:**
16. **Gizlilik politikası.** Metin taslak (`GizlilikPage.jsx:8-9`). Satın alma verisi
    (Google Play üzerinden işlenen sipariş bilgisi) ve hata izleme için kullanılan Sentry
    (`src/lib/hataIzleme.js`) metinde geçmiyor. "Reklam veya izleme çerezi kullanmıyoruz"
    cümlesi (`GizlilikPage.jsx:102`) AdSense reklamlarıyla çelişiyor. Bu metin Play'deki
    Veri Güvenliği formuyla birebir uyumlu olmalı. KVKK aydınlatma metni gerekip
    gerekmediği hukukçuya sorulmalı.
17. **Kullanım koşulları ve iade.** Satın alma maddesi var: iade Google Play politikasına
    tabi (`KosullarPage.jsx:83`). Ancak "sanal öğeler" listesinde **coin geçmiyor**
    (`KosullarPage.jsx:80`). Türkiye'deki mesafeli satış ve cayma hakkı kurallarının
    anında teslim edilen dijital içeriğe nasıl uygulanacağı ve satın almadan önce onay
    alınması gerekip gerekmediği hukukçuya sorulmalı. (Bu rapor hukuki değerlendirme
    yapmadı.)
18. **Play Console beyanları.** Veri Güvenliği formu (Supabase, Sentry, AdSense, Play
    Billing), içerik derecelendirmesi (IARC), "reklam içerir" ve "uygulama içi satın alma"
    işaretleri, hedef kitle (13+), hesap silme adresi. Uygulamada hesap silme var
    (`hesabimi_sil`), ama Play, uygulama dışından erişilebilen bir silme sayfası da istiyor.
    `/gizlilik` sayfası giriş yapmadan açılıyor; bu şartı karşılayıp karşılamadığı kontrol
    edilmeli.
19. **Loot box yok.** Ürün kararına uygun: paket içerikleri sabit, şans unsuru yok.

---

### Bakılan yerler (bulunamayanlar için)
Tüm depo `*.js, *.jsx, *.ts, *.tsx, *.html, *.json, *.sql, *.mjs` (node_modules, dist ve
tasarım prototipi hariç) · `package.json` · `vercel.json` · `public/` (`_headers`,
`_redirects`, `.well-known/`, manifest, `sw.js`) · `supabase/functions/` (3 fonksiyon) ·
canlı DB'de `pg_proc` (coin ve satın alma fonksiyonları, yetkileri), `pg_policy`,
`information_schema` (tablo ve kolon yetkileri), `pg_indexes`, `pg_trigger`,
`oyun_ayarlari`, `coin_paketleri`, `joker_paketleri`, `coin_hareketleri` tür dağılımı,
`satin_almalar`.
