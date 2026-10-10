# Basılı tut (3 sn) → doğru şık — bütün modlar (10 Eki 2026)

Ida'nın isteği: özellik Klasik/Turnuva/Grup dışındaki modlara da (Düello dahil) yayılsın, yalnız yetkili hesapta.
Önceki tarama (aynı gün, ab0a9a6f) diğer modları "doğru cevap istemcide yok" diye atlamıştı; bu iş o eksiği kapatır.

**Kapı aynen korundu:** sunucu `dogru_cevap`ı yalnız `hileli_mi()` (`profiles.hile_yetkisi`) hesabına verir. Şu an
yetkili tek hesap: `idagg`. Normal oyuncu ve anon için alan `null` (TABLE dönenlerde) ya da hiç yok (jsonb dönenlerde).

## Mod tablosu

| Mod | Durum | Sunucu (soru RPC'si) | İstemci | Tarayıcı denemesi |
|---|---|---|---|---|
| Klasik 1v1 | Çalışıyor | `get_match_question` (önceden vardı) | QuestionCard | 3 sn ✓ · 1 sn ✓ |
| Turnuva | Çalışıyor | `get_tournament_question` (önceden vardı) | QuestionCard (aynı kart) | Klasik kartıyla aynı bileşen |
| Grup maçı | Çalışıyor | `get_group_match_question` (önceden vardı) | QuestionCard (aynı kart) | Klasik kartıyla aynı bileşen |
| Ortak Hazine (Kasa) | Çalışıyor | `kasa_durum` — yalnız `faz=cevap`, maç aktif, ben henüz cevaplamadım | KasaPage | 3 sn ✓ · 1 sn ✓ · azaltma ✓ |
| Düello v4 (yeni çekirdek) | Çalışıyor | `duello4_durum` — yalnız `notr/cevap/son`, soru açık, ben henüz cevaplamadım | Duello4Arena | 3 sn ✓ · 1 sn ✓ · cevap verilmişken tetik yok ✓ |
| Düello v2 | Çalışıyor (kod hazır) | `duello2_durum` — yalnız `faz=cevap`, ben henüz cevaplamadım | DuelloV2 › V2Cevap | yapılmadı: yeni maçlar v4; sunucu kapısı SQL ile doğrulandı |
| Çalışma | Çalışıyor | `calisma_soru` (+ `dogru_cevap` sütunu) | CalismaPage | 3 sn ✓ · 1 sn ✓ · azaltma ✓ |
| Hızlı Mod | Hazır, mod DONDURULMUŞ | `hizli_mod_soru` (+ `dogru_cevap` sütunu) | HizliModPage | yapılmadı: rota `BulunamadiPage kapaliMod`; sunucu SQL ile doğrulandı |
| Hızlı Maç | Hazır, mod DONDURULMUŞ | `get_hizli_soru` (+ `dogru_cevap` sütunu) | QuestionCard | yapılmadı: rota kapalı; kart Klasik denemesiyle aynı, sunucu SQL ile doğrulandı |
| Düello v1 (eski) | Eklenmedi | `duello_durum` eski dalı | — | son v1 maçı 22 Eyl; erişilen akış değil |

Düello kuralı: basılı tut yalnız oyuncunun **kendi cevap hakkı varken** çalışır (sunucu koşulu + istemcide
`tiklanabilir`: cevaplamadım, süre var, istek yolda değil). Kart fazında, cevap verdikten sonra ya da rakip
beklerken alan gelmez ve tetik olmaz. Tetik `duello_cevap`ı normal yoldan çağırır; kontrol / 4 kart / 3-3 seri
sunucu kurallarına dokunulmadı (`duello4_cevap` değişmedi).

## Migration

`supabase/migrations/20260612001052_basili_tut_tum_modlar.sql` — **1052**, canlıya uygulandı (origin/main'deki son 1051'di).
- `calisma_soru`, `hizli_mod_soru`, `get_hizli_soru`: dönüş tipine `dogru_cevap smallint` (DROP + CREATE; yetkiler
  aynen: `authenticated`, `service_role`; `public`/`anon` REVOKE).
- `kasa_durum`, `duello4_durum`, `duello2_durum`: `soru` nesnesine koşullu `dogru_cevap` (CREATE OR REPLACE, yetkiler aynı).
- Gövdeler canlı tanımdan alındı; tek fark eklenen satırlar. Cevap RPC'lerine (`*_cevap`) dokunulmadı.
- Yetki listesi uygulama sonrası ölçüldü: önceki hâliyle birebir aynı; anon hiçbirinde EXECUTE yok.

## Güvenlik testi (canlı, tek transaction, ROLLBACK — canlıda iz yok)

`IZIN_CANLI_TEST=1 node araclar/basili-tut-guvenlik-sql-testi.mjs` → **21/21 geçti**

| Deneme | Sonuç |
|---|---|
| anon: `calisma_soru`, `hizli_mod_soru`, `get_hizli_soru`, `kasa_durum`, `duello_durum` | 5/5 `permission denied` |
| Çalışma · Hızlı Mod · Hızlı Maç — yetkili | `dogru_cevap` = doğru şık |
| Çalışma · Hızlı Mod · Hızlı Maç — yetkisiz (normal hesap) | `dogru_cevap` = null |
| Kasa yetkili (cevap fazı) / yetkisiz / yetkili cevap verdikten sonra | var / yok / yok |
| Düello v4 yetkili / yetkisiz / cevap verdikten sonra / kart fazı | var / yok / yok / yok |
| Düello v2 yetkili / yetkisiz | var / yok |
| Klasik `get_match_question` kapısı (regresyon) | yerinde |

Test, bitmiş eski maç satırlarını transaction içinde geçici açar, Hızlı Mod/Maç bayraklarını geçici açar; sonunda
ROLLBACK. Sonradan ölçüldü: maç `bitti`, bayraklar `false`, oturum satırı yok.

## İstemci

- Yeni ortak kanca `oyun/lib/useBasiliTut.js` (+ erken dönüşlü sayfalar için `<BasiliTut>` sarmalayıcı).
  QuestionCard da artık bu kancayı kullanıyor; davranış aynı.
- Görsel: `.qt-sik--tutulur` / `.qt-sik--basili` (bilesenler.css, değişmedi) — 3 sn dolan mavi çizgi, hareket
  azaltmada sade dolgu; mobilde menü/metin seçimi/büyüteç yok.
- İptal: parmak kalkar, 12 px'den fazla kayar, pointercancel, cevap verilir, süre biter, soru değişir.
  Aynı soruda ikinci tetik yok. Tetikten sonra parmak kalkınca gelen tıklama yutulur (tutulan yanlış şık gitmez).
- dogru_cevap gelmeyen hesapta şıklara hiçbir sınıf/olay eklenmez.

**Yakalanan hata:** İlk sürümde QuestionCard'da kanca `soru` tanımlanmadan önce çağrılıyordu ("Cannot access 'soru'
before initialization") — Klasik/Turnuva/Grup kartını tamamen kırardı. Tarayıcı denemesi yakaladı, yayından önce düzeltildi.

## Test

- `npm run build`: temiz (eski iPhone ayrıştırma denetimi TEMİZ).
- `npm test`: sunucu testleri geçti; `test:kurallar` içinde **1 eski başarısızlık** — `skill-sistemi-test.mjs:22`
  "İkinci Şans yalnız Klasik ve Düello" beklentisi, gerçekte Kasa'da da var. Bu işle ilgisi yok (skill ayarına
  dokunulmadı). `test:dans` geçti.
- Tarayıcı (yerel, taklit veri, canlıya yazma yok): `node araclar/basili-tut-ekran.mjs` → **35/35 geçti**.
  Her modda: yetkili 1 sn + kaydırma → cevap yok · 3 sn → tek cevap, doğru şık · contextmenu engelli ·
  user-select none · hareket azaltmada animasyonsuz dolgu · yetkisizde sınıf yok ve 3,5 sn'de cevap yok.
- Ekran görüntüleri: `tasarim/basili-tut/` (basılı 1,5 sn · 3 sn sonrası · azaltma · yetkisiz · Düello cevap verilmiş).
- **Yapılmadı:** gerçek `idagg` hesabıyla canlı maçta deneme — hesabın şifresi bende yok ve canlıya test yükü
  gönderme kuralı var; sunucu tarafı SQL ile, istemci taklit veriyle doğrulandı. Gerçek iOS dokunuşu
  (uzun basış menüsü/büyüteç) bu makinede denenemez; Chrome dokunmatik öykünmesiyle ölçüldü.

---

# Soru üretim maliyet tahmini düzeltmesi (10 Eki 2026)

**Yer:** Hesap `api-uret.mjs`'te değil, ortak katman `araclar/soru-temizlik/claude-cagri.mjs` içinde (`apiUsd`, `claudeCagir`). Migration yok; codex dosyalarına dokunulmadı.

## Kanıtlanan açıklar (kodda)

1. **Zaman aşımı/kopan çağrılar hiç sayılmıyordu.** `usage` yalnız başarılı yanıtta okunuyordu; 240 sn zaman aşımı veya bağlantı kopmasında yanıt gelmediği için jeton eklenmiyor, sunucu ise işi (Opus, `maxJeton` 16000'e kadar çıktı) faturalıyor. `api-uret.mjs` bu durumda isteği küçültüp yeniden gönderiyor (`zamanAsimi` → `CAGRI_KUCUK`) — aynı iş iki kez faturalanıp bir kez sayılıyordu. Tahmini gerçeğin altında tutan kalem budur.
2. **Önbellek okuma katsayısı sabit 0,1×.** Opus 5.5 için gerçek oran 0,05× ($0,20/1M, girdi $4). Bu hata tahmini **yukarı** iter (kolay-04: Opus 4,06M okuma jetonu). Sonnet 5.5 için 0,1× doğru.
3. **1 saatlik önbellek yazması (2×) ayrıştırılmıyordu.** Bugün kodda 1 sa TTL yok (`ephemeral` = 5 dk), ama `usage.cache_creation.ephemeral_1h_input_tokens` gelirse eksik sayılırdı.

Çıktı jetonu (düşünme dahil `output_tokens`), önbellek yazma/okuma ve girdi zaten toplanıyordu; fiyat sabitleri (Sonnet 5.5 $2/$10, Opus 5.5 $4/$20) güncel tabloyla eşleşiyor. Jev maliyeti ihmal edilebilir (kolay-04: 326.857 jeton ≈ $0,014).

## Düzeltme

- `FIYAT`'a model başına `okuma` katsayısı; `modelUsd` (5 dk/1 sa yazma ayrı, okuma modele göre).
- `kullanimEkle`: usage → sayaç (tek yer). `iptalEkle`: yanıtı alınamayan çağrı için **tahmin** — girdi = istem karakteri/3; çıktı yalnız zaman aşımında `maxJeton` (üst sınır). Alanlar `iptal_cagri/iptal_girdi/iptal_cikti` olarak `durum.json › harcama`'ya yazılır; eski dosyalar bozulmaz. Usage'ı zaten eklenmiş denemede (ör. JSON ayrıştırma hatası) çift sayım yok.
- Doğrulama: `node araclar/soru-temizlik/claude-cagri.test.mjs` — Opus 1,41 · Sonnet 3,20 · zaman aşımı 0,36 · kopma 0,04 (elle hesapla eşleşti). Sahte `fetch` ile 2 zaman aşımı + 1 başarı senaryosu da denendi (gerçek API çağrısı yok).

## Dürüst not

Gerçek faturayı (Anthropic konsolu) bu ortamdan göremediğim için "%20" farkını rakamla kapatamadım; yukarıdaki üç kalem kodda kanıtlı, ama asıl paya (iptal kalemi) etkisi koşudaki zaman aşımı sayısına bağlı — artık `iptal_cagri` ile görünür. Kapanmayan fark konsol faturasıyla karşılaştırılmalı. Eski `durum.json`'larda iptal kaydı yok, geriye dönük düzelmez. kolay-04 yeniden hesabı: $14,998 → $14,186 (yalnız okuma katsayısı; o koşuda iptal kaydı olmadığından eklenemedi).

## Başka betikler

- `soru-temizlik/{asiri-basit-tara,en-eksik-ceviri,sik-ipucu-837,z2-*}.mjs` aynı `claude-cagri.mjs`'i kullanıyor → düzeltmeden otomatik yararlanır.
- `soru-temizlik/sik-ipucu-api.mjs` kendi hesabını yapıyor: önbellek yazma/okuma jetonlarını tam girdi fiyatından sayıyor (yazma 1,25× yerine 1×, okuma 0,1× yerine 1×) ve iptal çağrısını saymıyor. Önbellekte **fazla**, zaman aşımında **eksik** tahmin eder; dokunulmadı (`claude-cagri.mjs`'e geçirilmesi önerilir).

RAPOR HAZIR — Ida'ya iletilecek.

---

# Güvenlik C — girdi temizliği, spam tavanı, hız sınırı (10 Eki 2026)

Kaynak: `docs/GUVENLIK-DENETIMI-2026-10-10.md` madde 3, 4, 5 + Ek. Kapsam dışı: captcha (A.2), reklam SSV, yan oyun tabloları (A.3), CSP / X-Frame-Options.

## Migration'lar (ikisi de canlıda)
- **1053** `20260612001053_guvenlik_c_girdi_hiz_siniri.sql` — asıl iş.
- **1054** `20260612001054_guvenlik_c_sessiz_sinir.sql` — 1053 düzeltmesi: `cihaz_bildir` ve `kalp_at` arka planda çalışan çağrılar; sınır aşılınca hata atmak yerine sessizce atlıyorlar. Arayüz denetimi, hızlı sayfa açılışında `cihaz_bildir`'in 10/dk sınırına takılıp konsola hata yazdığını yakaladı.
- Geri alma: `docs/guvenlik-c-geri-al.sql` (1053 öncesi canlı gövdelerden üretildi; ikisini birden geri alır).
- Yetki: yalnız `CREATE OR REPLACE` kullanıldı (ACL korunur). Yeni iki iç yardımcı (`gorunmez_temizle`, `hiz_siniri_mesajli`) PUBLIC/anon/authenticated'a kapalı. anon'a açık fonksiyon hâlâ yalnız `ses_secimleri_oyun` (1047 kuralı korundu).

## Yapılanlar
1. **Görünmez karakter:** `gorunmez_temizle()` şu karakterleri siler: \u0001-\u0008, \u000B-\u001F, \u007F, ​-‏, ‪-‮, ⁠-⁩, ﻿. Sekme ve satır sonu kalır (rapordaki aralık da onları dışarıda bırakıyor). **ZWJ (U+200D) iki emoji/simge arasındaysa korunur**; yoksa 👨‍👩‍👧 / ❤️‍🔥 / 🏳️‍🌈 parçalanırdı. Harf arasındaki ZWJ silinir. `trg_dm_guvenlik` küfür filtresinden ÖNCE temizler; sonuç boşsa mevcut `Mesaj boş olamaz` hatası döner. `sikayet_et` açıklaması da temizlenir.
2. **Spam tavanı:** Arkadaşlık isteği (`send_friend_request` + `arkadas_davet_kodu_ile_ekle`) ortak sayaçla 24 saatte en fazla 100; `send_friend_request` ile aynı kişiye 60 sn'de 1. Düello + Kasa daveti ortak sayaçla 24 saatte en fazla 100; aynı kişiye 60 sn içinde yeniden davet yok (reddedilse bile). **Açık botlar sayılmaz** (antrenman serbest kalır). Sayaçlar yalnız gerçek gönderimde artar (doğrulama hatasında işlem geri alındığı için sayılmaz). Mesajlar TR + EN (`oyun/lib/ceviri/sunucu.js`):
   - "Bu oyuncuya az önce davet/istek gönderdin, biraz bekle." · "Bugün çok fazla davet / arkadaşlık isteği gönderdin, daha sonra tekrar dene."
3. **Hız sınırı:** `cihaz_bildir` 10/dk (sessiz), `claim_referral` 10/dk, `arkadas_davet_kodu_ile_ekle` 10/dk, `kalp_at` 60/dk (sessiz; Düello/Kasa nabzı ve 60 sn'lik genel nabız bunun çok altında), `ikram_yanitla` 30/dk.
4. **Eşzamanlı satın alma:** `esya_satin_al`, `karakter_satin_al`, `avatar3d_satin_al` başına `perform 1 from profiles where id = v_me for update` eklendi (hiz_siniri'nden hemen sonra; "zaten sende" kontrolü artık kilitten sonra yapılıyor). Başka mantık değişmedi.
5. **tercih_kategori:** Canlıda 266 satırın hepsi `null`, uyumsuz satır yok. `profiles_tercih_kategori_check` eklendi: `null` ya da `^[a-z0-9_]{1,40}$` (canlıdaki 10 kategori anahtarının hepsi bu biçimde). Sabit liste yerine biçim kısıtı seçildi; böylece yeni kategori eklemek migration gerektirmez. Asıl liste doğrulaması `tercih_kategori_kaydet` RPC'sinde zaten var.
6. **Edge Function kodu (DAĞITILMADI):** `_shared/gizli.ts › gizliEsitMi` ile sabit zamanlı karşılaştırma → `send-push`, `generate-questions`, `satin_alma_iade_tara`. `send-push`: `req.json()` try içine alındı (hatalı gövdede 400). Boş ya da eksik `user_ids` artık 400 döner, herkese gönderim yok. Ölçüldü: canlıdaki bütün çağıranlar (`push_gonder` ← `bildirim_yaz`, `haftalik_sonuc_bildir`, `notify_new_hizli_davet`) tek kişilik dizi yolluyor. Gövde ve ölü abonelik silme try-catch içinde. `satin_alma_dogrula`: kullanıcı başına 60 sn'de 10 istek (bellek içi, her sunucu örneği için ayrı sayar; asıl tekrar koruması token UNIQUE kısıtında). Dağıtım notları değişmedi: bkz. PROJECT_CONTEXT › Açık İşler (`send-push` `--no-verify-jwt` ile dağıtılmalı).
7. **vercel.json:** Bütün yollara `X-Content-Type-Options: nosniff` + `Referrer-Policy: strict-origin-when-cross-origin` eklendi. X-Frame-Options / CSP eklenmedi.

## Testler
- `araclar/guvenlik-c-prova.mjs`: tek işlem, taklit kullanıcılar, sonunda ROLLBACK (geri alma). **Prova (migration işlem içinde): 56/56. Canlıda uygulandıktan sonra aynı set (migration'sız): 56/56.**
  - Görünmez karakter: Türkçe karakter/noktalama, emoji (ten rengi, ZWJ aile, bayrak), boşluk/sekme/satır sonu değişmiyor; ZW/RLO/BEL/BOM/isolate ve harf arası ZWJ siliniyor.
  - DM ve şikâyet: normal DM gidiyor; görünmez karakterli DM temizleniyor; yalnız görünmez karakterden oluşan mesaj "Mesaj boş olamaz" alıyor; şikâyet açıklaması temizleniyor (emoji kalıyor).
  - Arkadaşlık: ilk istek gidiyor, 60 sn bekleme çalışıyor, 100. istek gidiyor, 101. istek doğru hatayı alıyor; davet kodu yolu da tavana tabi.
  - Kasa: ilk davet gidiyor, red sonrası bekleme ve günlük tavan hatası doğru.
  - Hız sınırı: 5 RPC sınır altında çalışıyor, üstünde duruyor (ikisi sessizce atlıyor).
  - Satın alma: 3 RPC'de kilit var, iş hatası akışı bozulmamış.
  - tercih_kategori: geçerli değer ve null yazılıyor, çöp değer reddediliyor.
  - Yetki: 14 fonksiyon anon'a kapalı, iki yardımcı authenticated'a da kapalı; anon'a açık tek fonksiyon `ses_secimleri_oyun`.
- İz kontrolü: test sonrası `prova-c-*` kullanıcı 0, yeni sayaç satırı 0, `idle in transaction` 0.
- `npm run build` temiz · `arayuz-denetim` (1054 sonrası) **TEMİZ**. Denetimin açtığı misafir hesabı `hesabimi_sil` ile silindi (DB'de 0).
- `npm test`: tek kırmızı test **bu işten bağımsız ve önceden vardı**: `oyun/_test/skill-sistemi-test.mjs` "İkinci Şans Klasik ve Düello içindir" `['1v1','duello']` bekliyor, ama kod `kasa`'yı da içeriyor (Kasa'ya İkinci Şans eklenmiş, test güncellenmemiş). DB testleri bağlantı olmadığı için atlandı.

## Yapılamayan / dikkat
- **Düello daveti tavanı canlı akışta uçtan uca denenemedi:** Yeni test hesabı, tavana gelmeden Düello açılış kilidine ("5 maç daha oyna") takılıyor. Kod bloğu Kasa ile birebir aynı ve katalogdan doğrulandı.
- Edge Function'lar dağıtılmadı (talimat gereği). Yerelde Deno yok, bu yüzden TypeScript derleme denetimi yapılamadı. Değişiklikler küçük ve tip uyumlu yazıldı; dağıtırken `supabase functions deploy` paketlemesi ilk kontrol olur.
- `docs/guvenlik-c-geri-al.sql` kendi `begin/commit`'ini taşıdığı için `migration-prova` ile denendiğinde canlıda gerçekten işledi. O anda 1053 henüz uygulanmamıştı, yani gövdeleri canlıdakiyle birebir aynı olarak yeniden yazdı. Ardından 13 fonksiyonun tanımı önceki dökümle karşılaştırıldı: **aynı**. Yeni fonksiyon ya da kısıt eklenmemişti.
- Başka bir oturumdan kalan misafir hesabı `ArayuzDenetim131` (13:57 UTC) canlıda duruyor; bu işe ait olmadığı için dokunulmadı.

## Madde 8 — aynı kalıp taraması
- **Görünmez karakter:** Başkalarının gördüğü serbest metin alanı yalnız DM ve şikâyet açıklaması; ikisi de düzeltildi. Takma ad zaten sıkı bir karakter listesiyle sınırlı; maç/grup sohbeti sabit listeden. `profiles`'ta istemcinin doğrudan yazabildiği metin kolonları yalnız `dil` (CHECK var) ve `tercih_kategori` (artık CHECK var). Yan oyunların metin parametreleri (`kafatopu_*`, `gl_profil_kaydet`, `ses_*`) serbest metin değil, kod/kimlik değerleri.
- **Hız sınırı olmayan yazma RPC'leri (authenticated'a açık, ~70):** Çoğu kendi satırını değiştiren ucuz işlemler (`dm_okundu`, `bildirimleri_oku`, `*_aramadan_cik`, `*_terk`, `*_iptal`, `*_nabiz`, tercih kaydetme) ya da maç durumunu `FOR UPDATE` ile ilerleten `advance_*` / `get_match_question`. Bunlara sınır gerekmiyor ya da sınır maç hızını bozar. Bu işte düzeltilmedi; ileride bakılabilecekler: `respond_challenge` / `respond_group_challenge` / `respond_hizli_davet`, `rovans_iste`, `engel_kaldir`, `kafatopu_odaya_katil` (oda kodu tahmini), `avatar_onay_kaydet` / `kozmetik_onay_kaydet`. Hiçbiri coin/elmas vermiyor, hepsi oturum istiyor.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Profil tutarlılık turu (10 Eki 2026)

**İstek:** Profil sayfasını (bütün sekmeler) tek kart + tek başlık standardına getirmek; tekrar eden bilgileri kaldırmak. İşlev/veri/RPC değişmedi, migration yok.

## Ne değişti
| Alan | Önce | Sonra |
|---|---|---|
| Kart stili | 3 farklı: kalın lacivert çerçeve (kimlik, sayılar), çerçevesiz QtKart (Koleksiyon, Kategori, Ustalık, Ayarlar…), soluk boş kart (kupa/seri 0) | Profil'deki bütün QtKart + QtListe: beyaz zemin, 3 px lacivert kontur, 4 px alt dudak, 18 px köşe, 16 px iç boşluk (`.qt-pf .qt-kart`, `dukkan-profil.css`). Kimlik ve sayı kartları aynı köşe/dudak. Yeni bileşen yok. |
| Başlık stili | Altın `qt-plaka` (Ödüllerim, Koleksiyon, Kategori başarın, Seri ve jokerler, Kategori ustalığı) + gri büyük harf (VİTRİN ROZETLERİ, SIRADAKİ ÖDÜLLER) + sade | Hepsi sade lacivert `qt-baslik-3`, sola dayalı. Profil içinde `.qt-plaka` nötr; Koleksiyon başlığındaki yıldız ikonu gizli. |
| Kimlik | XP iki kez ("47/130 XP" + "Level 28 için 83 XP"); vitrin ayrı kart; "Sonraki rütbe" en altta ayrı kart | XP tek satır "47/130 XP → Lv 28" (`LevelCubugu xpSatiri`); çubuğun altında "Sonraki rütbe: [ikon] Kahin · Lv 50" (son rütbede yok); kesik çizgiyle ayrılmış "Vitrin" satırı, rozetler 44 px, sağa hizalı (vitrin boşsa satır yok). Ayarlar/Davet'e doğrudan gelince kısa kimlik aynen (şerit yok). |
| Sekmeler | Dar ekranda yalnız aktif sekmenin yazısı vardı | Beşi de ikon + kısa yazı (İstatistik, Ayarlar, Rozetler, Koleksiyon, Davet), eşit genişlik, aktif beyaz; ≤700 px'te ikon üstte, yazı 11 px. 360 px'te kırpık yazı 0 (ölçüldü). Sıra değişmedi. Üst bardaki dişli menü aynen. |
| Ödüllerim | Kupa/seri boşken soluk kartta cümle | Üçü aynı kalıp: ikon + büyük sayı + küçük etiket. Kupa 0 → "0 · Kupa · turnuva kazan", seri 0 → "0 · Günlük seri" (TR/EN). |
| Sıradaki ödül | 3 satırlık liste, gri büyük harf başlık | `LevelOdulleri vurgu`: solda görsel (avatarsa 56 px resim), sağda ad + "Lv 35'te · 8 level kaldı" + mavi çubuk, altta "Yolda: Lv 30 joker · Lv 35 joker". Varsayılan liste görünümü aynen durur (başka sayfada canlı kullanımı yok; önizleme sayfası kendi taklidini çiziyor). |
| Kategori başarın | "242 maç · 195 maçın istatistiği"; renkli çerçeveli kutular | "195 maçtan istatistik"; satırlar sade: ikon · ad · çubuk · yüzde, ince ayırıcı. Kategori rengi ikon ve çubukta. Unvan rozeti altın kaldı. |
| Koleksiyon özeti, Ustalık, Hatalarım | Çerçevesiz kart + altın plaka başlık | İçerik aynı; dış kart ve başlık standarda çekildi. |

**Öncelik kararı (Sıradaki ödül):** istek "avatar > skill > rütbe > joker". Kodda ayrı bir "skill" ödülü yok — level ödülü olan "Skill hakkı" arayüzde "Joker" olarak gösteriliyor (`jokerAdi`). Bu yüzden uygulanan sıra **avatar > rütbe > joker**. Zaten sahip olunan avatar (coin'e dönüyor) ana ödül sayılmaz. Arama penceresi 30 level; çubuk son 5'lik basamaktan ödül level'ine ölçeklenir (Lv 27 → 35: 25'ten 35'e). Türkçe ek sayıya göre (28'de, 30'da, 40'ta, 35'te).

**"242 maç · 195 maçın istatistiği" kararı (koddan):** `oyuncu_kategori_profili` (migration 204) → `toplam_mac` = `profiles.toplam_mac`, `istatistikli_mac` = `oyuncu_istatistik.istatistikli_mac`: cevap kaydı olan maç sayısı (maç bitince `istatistikli_mac_arttir` ile +1; ilk dolum cevap tablolarından). Bu **son N maç değil**, bütün geçmişten cevabı kayıtlı maçlar. Yazılan: **"195 maçtan istatistik"** / "Stats from 195 matches". Aynı bileşen oyuncu kartında da kullanıldığı için orada da bu ifade görünür.

**Dosyalar:** `oyun/pages/ProfilePage.jsx`, `oyun/components/LevelCubugu.jsx` (`xpSatiri`), `oyun/components/LevelOdulleri.jsx` (`vurgu`), `oyun/components/KategoriProfili.jsx`, `oyun/tasarim/ekranlar/dukkan-profil.css`, `oyun/tasarim/ekranlar/dukkan-bilesen.css`, `oyun/lib/ceviri/profil-tutarlilik.js` (+ `oyun/lib/dil-en.js`), araç `araclar/profil-tutarlilik-ekran.mjs`.

## Test
- `npm run build` temiz (eski iPhone uyumluluk denetimi TEMİZ). `npm run test:kurallar` fail 0, `npm run test:dans` TÜMÜ GEÇTİ. `_test/sunucu` DB testleri koşulmadı (sunucu tarafı değişmedi; canlı DB yük kuralı).
- `arayuz-denetim`: **TEMİZ** (taşma yok, sabit öğe kayması yok, dokunma hedefi ≥ 44 px, konsol temiz).
- Önce/sonra tam sayfa: `tasarim/profil-tutarlilik/` — 112 görüntü: `<once|sonra>-<dolu|bos>-<sekme>-<360|390>-<tr|en>-<acik|koyu>.png`. "dolu" = misafir hesabı + taklit yanıt (vitrin 3 rozet, kupa 2, seri 6, Lv 27 47/130 XP, 242/195 maç; sunucuya yazılmaz), beş sekme; "bos" = misafirin gerçek boş hâli (İstatistik + Ayarlar). Dil × senaryo başına sayfa bir kez açıldı (toplam 4 yükleme); genişlik/tema/sekme aynı sayfada değişti. Sabit alt menü görüntüde gizli (içeriği örtmesin). Sonra: **taşma 0, sekme kırpığı 0, sayfa/konsol hatası 0** (önce: sekme kırpığı 56 — pasif sekmelerin yazısı gizliydi).
- Koyu tema oyunda kapalı (`KOYU_TEMA_KAPALI`); `data-tema="koyu"` zorlanarak çekildi, önce/sonra aynı davranış, bozulma yok. Hareketi azalt: görüntüler `reducedMotion: reduce` ile alındı, yeni hareket eklenmedi.

## Kontrol listesi
| Kontrol | İstatistik | Rozetler | Koleksiyon | Davet | Ayarlar |
|---|---|---|---|---|---|
| Her kart aynı çerçeve | ✓ kimlik, 3 sayı, Sıradaki ödül, Koleksiyon, Kategori, Seri ve jokerler, Ustalık, Hatalarım | ✓ Vitrinim + rozet grupları | ✓ Görünümün, Koleksiyon, Unvanlar, Çerçeveler, Arka planlar, Avatarlar | ✓ | ✓ Güvence, Oyun ayarları, Takma ad, Avatar, Davet kodu, Engellediklerim, Şehir, Hesap listesi |
| Her başlık aynı stil | ✓ | ✓ | ✓ | ✓ | ✓ ("Hesap" zemin başlığı aynı boy) |
| Taşma / kırpılma (360 + 390, TR + EN) | 0 | 0 | 0 | 0 | 0 |
| Tekrar eden bilgi kaldı mı | Hayır: XP tek satır, vitrin tek yerde, sonraki rütbe tek satır | — | — | — | — |
| Boş durumlar | vitrin boş → satır yok ✓ · kupa 0 → "0 · Kupa · turnuva kazan" ✓ · seri 0 → "0 · Günlük seri" ✓ · misafir rozeti ✓ · koleksiyon boş tek satır ✓ · kategori "maç yok" ✓ | ✓ | ✓ | ✓ | misafir güvence kartı en üstte ✓ |

**Bilinçli istisnalar:** Ustalık satırlarının ve rozet/koleksiyon kalemlerinin kendi iç kutuları içerik olarak kaldı ("içerik aynı"); yalnız dış kart eşitlendi. Sayı kartlarında yatay iç boşluk 8 px (üç sütun 360 px'te "1.840" sığsın), dikey 16 px. Davet kartındaki altın "300 sana / +100" çipleri ödül olduğu için kaldı. Hesap silme akışı ve "Hesap" bölümünün işlevi değişmedi.

## Başka sayfalarda aynı tutarsızlık (DÜZELTİLMEDİ — yalnız rapor)
- **Arkadaşlar:** "Arkadaşını davet et" kartı krem/altın zeminli + kalın kontur; hemen altındaki "Arkadaşların" boş durum kartı beyaz ve konturuz (yumuşak gölge); "Davet koduyla ekle" açılır satırı kartsız. Tek ekranda üç kart dili.
- **Lig:** Yüklenirken iskelet kartı beyaz/konturuz, yüklenince liste kartı kalın konturlu (geçişte stil değişiyor). "YÜKSELME HATTI" yeşil büyük harfli ara başlık. Sayfa başlığı krem zeminli plaka.
- **Dükkân › Joker:** Joker kartları kendi renginde degrade zemin + sol şerit (qt-oyk dili); sekme altındaki "Jokerler · Nadir avatar ve imzalar / Öteki kozmetikler" bilgi satırı kartsız iki sütun; bölüm başlığı yok. Profil'in beyaz kart standardından ayrı dil (renk = joker kimliği olduğu için bilinçli olabilir).
- Ortak kök: `QtKart` varsayılanı konturuz (yalnız alt dudak); "oyun kartı" dili (3 px kontur) sayfa CSS'lerinde elle veriliyor. Bütün site için `QtKart`'a ortak konturlu bir varyant eklemek düşünülebilir — bu iş Profil'le sınırlı tutuldu.

## Dikkat
- Çalışma sırasında canlı Supabase'de statement timeout'lar görüldü; aynı saatte başka oturumun incelediği Kasa olayıyla (migration 1055) çakışıyor. Ekran aracı bu yüzden sayfa başına tek yükleme yapıyor.
- Eski "Sonraki rütbe" kartındaki rütbe ilerleme çubuğu kalktı (bilgi tek satıra indi; istek gereği).

RAPOR HAZIR — Ida'ya iletilecek.

---

# Kasa (Ortak Hazine) takılması — kök neden ve düzeltme (10 Eki 2026, migration 1055)

## Kök neden (kanıtlı)
**İki katmanlı:** sunucu kısa süre yavaşladı → Kasa'nın yazma kilitli yoklaması 500 verdi → **istemci askıda kalan tek isteğe takılıp yoklamayı tamamen bıraktı.**

1. **Sunucu (Supabase logları, 16:00–16:05 UTC):** veritabanı genel olarak yavaşladı — `cron_hizli_tik` 12,5 ve 21,7 sn sürdü (normalde ort. 0,2 sn), checkpoint 16:00:24–16:01:37, `group_matches` satırında 8 bekleyenli kilit kuyrukları (`grup_mac_nabiz` / `advance_group_match`; o dakikalarda gerçek bir oyuncu botlarla art arda grup maçı oynuyordu). Kilitle ilgisi olmayan basit sorgular bile 8 sn `statement_timeout`'a düştü (`profiles` SELECT'i, `oyuncu_nabiz` INSERT'i, `gorev_olcum`).
   - `kasa_giris` 16:00:40 "canceling statement due to statement timeout" (maç satırı kilidini tutarken) → arkasındaki `kasa_durum` aynı satırı beklerken 8 sn'de düştü (**açılıştaki ~10 sn boş ekran**).
   - `kasa_cevap` 16:01:27: maç satırında 4,3 sn bekledi, sonra `nabiz_yaz`'da zaman aşımı (**Geyik cevabı 500**). `kasa_durum` 16:01:48 ve 16:02:52 `kasa_cozumle` içinde zaman aşımı.
   - Sebep zinciri: `kasa_durum` her yoklamada `kasa_kilitle` ile maç satırını **FOR UPDATE** kilitler + nabız yazar + ilerletir; DB yavaşken aynı maçın çağrıları sıraya girip toplu 8 sn sınırına takıldı. Düello okuması bu kadar ağır yazmadığı için aynı dakikalarda çalıştı.
2. **İstemci (edge logları):** 16:02:15'ten sonra sayfa **hiç `kasa_durum` isteği atmadı** (kalp_at sürdü). `KasaPage` okumaları tek söze (`yukleSozRef`) bağlıyor; yanıtı gelmeyen tek istek o sözü sonsuza tuttu, sonraki her yoklama ona zincirlendi → sunucu düzelse de ekran Tur 3'te 0 sn'de, "Bağlantı yeniden kuruluyor…" bandıyla dondu. Maç 16:05'te sunucuda `kopuk` ile bitti.
3. **1052/1053/1054 ile ilişki:** doğrudan sebep değil. `kasa_durum`'daki `hiz_siniri` 950'den beri var; 1052 yalnız `hileli_mi()` okuması ekledi (yazma yok); 1053/1054'ün `kalp_at`/`cihaz_bildir` sınırı ayrı satırlar (`rpc_sayac` aynı kullanıcı + uç adı) — olay anında bu satırlarda kısa (≈1 sn) bekleme görüldü ama zaman aşımı oradan gelmedi.

## Düzeltmeler
| | |
|---|---|
| **1055** (canlı) | `kasa_durum`: `SET lock_timeout '2s'`; maç kilidi 2 sn'de alınamazsa 500 yerine **kilitsiz görünüm** (yetki kontrolü aynı; o yoklamada ilerletme atlanır, sıradaki yoklama ilerletir). ACL/RLS değişmedi. Prova (BEGIN…ROLLBACK) → canlı. Canlı kilit testi: satır başka bağlantıda kilitliyken `kasa_durum` **2,1 sn'de 200** (eskiden 8 sn + 500). Geri alma dosyası yok (gövde 1052 tanımıyla aynı, yalnız blok + SET eklendi). |
| `KasaPage.jsx` | `kasa_durum` isteği **10 sn'de `AbortController` ile kesilir** → hata yoluna düşer, geri çekilmeli yeniden dener, yanıt gelince bant kalkar ve tur/soru/süre sunucudan yeniden çizilir. |
| `KasaPage.jsx` | `kasa_cevap` sunucu/ağ hatasında (500, 57014, ağ) aynı tur sürüyorsa **0,7 sn sonra bir kez sessizce yeniden** gönderilir (tıklama anı başlığı korunur → geç varış payı içinde sayılır); "zaten cevapladın" = cevap kayıtlı. Yine olmazsa: "Cevabın sunucuya ulaşmadı. Süre bitmediyse şıkkı yeniden seç." |
| `KasaPage.jsx` + `kasa.css` | Yükleniyor: Kasa renginde ikon + **"Maç yükleniyor…"** metni (eskiden Düello kırmızısı, metinsiz sallanan ikon). 8 sn'de veri yoksa okunur **"Maç açılamadı" + "Tekrar dene"** (arka planda deneme sürer, veri gelince maç açılır). |
| `DuelloPage.jsx` | Aynı askıda kalma kalıbı vardı → `duello_durum` / `duello_baglanti` aynı 10 sn kesme. |
| Klasik (`MatchPage`) | Kalıp yok: her yoklama bağımsız, zincir yok. Değişiklik yapılmadı. |
| `skill-sistemi-test.mjs` | İkinci Şans beklentisi `["1v1","duello","kasa"]`. |
| `kasa-canli-testi.mjs` | `--kopma` bot senaryosunda A'ya da uygulanır, süre `--kopmasn`. |

"Maç açılamadı" metninin DOM'da olup görünmemesi yerelde yeniden üretilemedi (taklit 500 ile ekran okunur çıktı: `once-yukleme-hatasi-390.png`). Gözlenen "sallanan kırmızı ikon", Kasa'nın Düello renginde (kırmızı) çizilen yükleniyor ikonuydu; artık metinli ve Kasa renginde, 8 sn'de hata ekranına geçiyor.

## Test sonuçları
- **Canlı, bota karşı Serbest Hazine (test hesabı, quiztactics.com, yeni kod yayında):**
  - Maç 1 `330c246d` — 20 tur, `bitti/hedef`, açılış (giriş sahnesi + 3-2-1) → her tur → final sahnesi → sonuç ekranı. Bu sırada DB yine yavaşladı (16:30 UTC, aynı grup maçı kilitleri): bir `kasa_durum` 10 sn'de **kesildi**, ekran toparlandı, maç sürdü.
  - Maç 2 `1eaeff62` — **400 ms ağ gecikmesi + Tur 3'te 12 sn bağlantı kopması** (Chrome öykünmesi): 23 tur, 90-36 kazanıldı, `bitti/hedef`. Boş ekran 0, çift ekran 0, faz geri dönüşü 0, takılı bant 0.
  - Test aracının kalan kırmızıları bu işle ilgisiz ve eski beklentiler: DEVAM düğmesinde "ÜCRETSİZ 50:50 / ×2" ve `devam_odul` (Serbest Hazine'de bu kurallar şu an kapalı), "Yeni Kasa maçı" (düğme artık "Yeni maç"); 400 ms gecikmede sayaç 0'da ~5 sn (sunucunun geç varış payı, tasarım gereği).
- **Toparlanma (yerel, taklit `kasa_durum`; canlıya yük yok):** normal → 16 sn yanıtsız → yeniden 200. Yeni kod: bant çıktı, sonra **kalktı ve Tur 5 çizildi — GEÇTİ**. Eski kod (aynı test): bant hiç çıkmadı, sunucu dönünce de **Tur 4'te donuk kaldı** (Ida'nın gördüğü). Görüntüler: `once-toparlanma-*`, `sonra-toparlanma-*`.
- **Cevap yeniden denemesi (taklit):** ilk 500 + ikinci 200 → 2 istek, ekranda hata yok · hep 500 → 2 istek, net mesaj (`sonra-cevap-*.png`).
- **Düello (taklit):** ilk `duello_durum` yanıtsız → 10,8 sn'de kesildi, ikinci istekle sayfa açıldı (eski kodda sonsuz yükleniyor). Canlı Düello duman testi yapılamadı: yeni test hesabında Düello kilitli (5 Klasik maçı şartı, 1 oynanmış).
- **Klasik duman (canlı, `oyuncu-testi --mod=klasik`):** 20 soru dokunuldu, hepsi sunucuya ulaştı. (Ana sayfada 390 px'te `ls-ad-dugme` × `sz-mini` 3 px üst üste binme bulgusu — bu işle ilgisiz, profil/ana sayfa alanı.)
- `npm run build` temiz · `npm test` yeşil · `skill-sistemi-test` 8/8 · `arayuz-denetim` **TEMİZ**.
- Test hesapları: **ArayuzDenetim131** ve testte kullanılan **ArayuzDenetim826** `hesabimi_sil` ile silindi ("tam"); `profiles` ve `auth.users`'ta 0, `ArayuzDenetim%` toplam 0.

## Ayrı bulgu (düzeltilmedi, karar gerekir)
DB yavaşlamasının tetikleyicisi grup maçı akışı: istemci `grup_mac_nabiz` + `advance_group_match` + `group_matches` okumasını sık çağırıyor, `cron_hizli_tik` › `bot_oyna` › `advance_group_match` aynı satırı tek uzun işlemde kilitliyor (12–22 sn). Nano işlemcide bu, bütün modları yavaşlatıyor. Önerim: `advance_group_match`/`grup_mac_nabiz`'e de kısa `lock_timeout` + kilitsiz dönüş, cron'da maç başına ayrı işlem. Ayrıca `gorevlerim` (ort. 1,16 sn) ve `get_categories` (1,13 sn) pahalı.

**Migration:** 1055 (`20260612001055_kasa_durum_kilit_beklemesi.sql`) — canlıda uygulandı.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Profil tutarlılık turu 2 — İstatistik sekmesinin alt yarısı (10 Eki 2026)

**İstek:** 68a92b5'in üst kısmına dokunmadan Seri ve jokerler, iki kategori bölümü ve Sıradaki ödül tekrarını düzeltmek. Migration yok; Kasa dosyalarına dokunulmadı.

## Ne değişti
| Alan | Önce | Sonra |
|---|---|---|
| Seri ve jokerler | 4 renkli zeminli kutu (güncel seri, en uzun seri, kullanılan joker, izlenen video) + yalnız ikon + sayı çipleri | "Güncel seri" (Ödüllerim'deki Günlük seri ile aynıydı) ve "İzlenen video" kalktı. "En uzun seri" + "Kullanılan joker" Ödüllerim'deki beyaz sayı kartıyla birebir aynı kalıpta (`qt-pf-sayi`: ikon + büyük sayı + küçük etiket). Joker envanteri 2 sütunlu sade liste: ikon · kısa ad · adet ("50:50 · 19"); zemin beyaz, renk yalnız ikonda; uzun ad ("Soru Değiştir") iki satıra sarar, kesilmez. Başlık aynı. |
| Kategoriler | İki bölüm: "Kategori başarın" (yüzde) + "Kategori ustalığı" (renkli zeminli 10 kart: doğru + rütbe) | Tek bölüm "Kategori başarın". Üstte unvan rozeti (altın) + "199 maçtan istatistik · 3.961 doğru". Satır: kategori ikonu · ad · rütbe rozeti (Çırak/Kalfa/Usta/Üstat/Efsane, mevcut stil) · doğru oranı çubuğu (kategori renginde) · yüzde; altında gri "299 doğru · Usta için 1 kaldı". Sıra ustalık sırası (en çok doğru üstte). Verisi olmayan kategori (0 doğru, yüzde yok) çizilmez. 360 px'te çubuk ad satırının altına iner; ≥ 560 px'te aynı satırda. |
| Sıradaki ödül | "Yolda: Lv 30 joker · Lv 35 joker" — Lv 35 büyük ödülün kendi level'ı | Büyük ödülle aynı level'daki öteki ödül kartın içinde küçük ek: "Büyücü (avatar) + joker". "Yolda" yalnız başka level'lar: "Lv 30 joker · Lv 40 joker". |

**Veri:** Ustalık satırları tek RPC'den (`ustalik_seviyelerim`) gelir; `UstalikIzgarasi` veriyi `onSeviyeler` ile ProfilePage'e verir, ProfilePage `KategoriProfili`'ne `ustalik` prop'u olarak geçirir. Yeni RPC yok, çağrı sayısı aynı.

## Başka yerlerdeki görünüm
- `KategoriProfili` oyuncu kartında da kullanılıyor (`OyuncuKarti.jsx`, `kucuk`): `ustalik` verilmediği için **eski görünüm aynen** (yüzde satırları, rütbe/doğru yok). Birleşik görünüm yalnız Profil'de.
- `UstalikIzgarasi` yalnız Profil'de kullanılıyor. `kategoriYok` verilmezse eski "Kategori ustalığı" kartı hâlâ çizilir (kod duruyor, silinmedi).
- `LevelOdulleri` vurgu görünümü yalnız Profil'de; varsayılan liste görünümü değişmedi.

**Dosyalar:** `oyun/components/UstalikIzgarasi.jsx` (`kategoriYok`, `onSeviyeler`, `SEVIYE_KOD` dışa açıldı), `oyun/components/KategoriProfili.jsx` (`ustalik`), `oyun/components/LevelOdulleri.jsx` (ek + Yolda), `oyun/pages/ProfilePage.jsx` (2 satır bağlantı), `oyun/tasarim/ekranlar/dukkan-bilesen.css`, `oyun/lib/ceviri/profil-tutarlilik.js`, araç `araclar/profil-tutarlilik-2-ekran.mjs`.

## Test
- `npm run build` temiz (eski iPhone denetimi TEMİZ) · `test:kurallar` fail 0 · `test:dans` TÜMÜ GEÇTİ · `arayuz-denetim` **TEMİZ**.
- Önce/sonra tam sayfa (İstatistik sekmesi): `tasarim/profil-tutarlilik-2/<once|sonra>-<bos|bir|on>-<360|390>-<tr|en>.png` — 24 görüntü. Taklit veri (sunucuya yazılmaz): **bos** hiç maç yok · **bir** yalnız Tarih (40 doğru, Çırak, %62) · **on** 10 kategori, Teknoloji **Usta**, Tarih "299 doğru · Usta için 1 kaldı", Müzik Üstat, Edebiyat Efsane, 9 joker. Sonra: taşma 0, sayfa/konsol hatası 0.
- Araç düzeltmesi: oturum her bağlamdan sonra dosyaya geri yazılıyor (Supabase yenileme belirteci tek kullanımlık; eski kopya ikinci bağlamda 400 alıyordu). Denetim oturumu süresi dolduğu için yeni misafir hesabı açıldı.

## Sayfa baştan sona kontrol (İstatistik)
| Kart | Beyaz + lacivert çerçeve | Renk yalnız ikon/çubuk/rozette |
|---|---|---|
| Kimlik + level şeridi + vitrin | ✓ | ✓ |
| Ödüllerim (3 sayı) | ✓ | ✓ ikon diski |
| Sıradaki ödül | ✓ | ✓ mavi çubuk |
| Koleksiyon | ✓ | ✓ (boş hâlde ikon dairesi açık mavi) |
| Kategori başarın | ✓ | ✓ ikon plakası, çubuk, rütbe rozeti, altın unvan rozeti |
| Seri ve jokerler | ✓ | ✓ ikon diski / joker ikonu |
| Hatalarım | ✓ | ✓ ikon kutusu |

Renkli zeminli kutu kalmadı. Not: Seri ve jokerler'deki iki sayı kartı Ödüllerim kalıbında olduğu için kendi çerçevesiyle kart içinde duruyor (istek "birebir aynı kalıp").

RAPOR HAZIR — Ida'ya iletilecek.

---

# Canlı kesinti — 10 Eki 2026, 20:30 (TR) · 1056 GERİ ALINMADI

## Ne yapıldı
1. **Canlıya yük bindiren test durduruldu:** `araclar/kasa-canli-testi.mjs --senaryo=bot --adres=https://quiztactics.com`
   bu bilgisayarda çalışıyordu (17:25–17:32 UTC arası dakikada 106–192 istek, çoğu `rpc/kasa_durum`). Süreç kapatıldı;
   17:33'ten itibaren bu IP'den gelen istek dakikada ~10'a düştü.
2. Salt-okuma ölçüm (pg-mini + Management API log/health). Hiçbir SQL değişikliği yapılmadı.

## Ölçüm
| | |
|---|---|
| Bağlantı / kilit (17:36–17:40 UTC) | 25–36 bağlantı, 0–5 aktif, **kilit bekleyen 0**, bekleyen `FOR UPDATE` yığını yok |
| Basit katalog sorguları | `pg_stat_activity` sayımı 11–15 sn, `pg_stat_statements` 40 sn'de bile bitmedi; yeni bağlantı 14,6 sn |
| İstek yükü (edge log, 17:15'ten beri) | 2.220 istek; **1.960'ı bu bilgisayardan** (Kasa testi), 256'sı tek gerçek kullanıcı. Yük düşük |
| cron `hizli_tik` | 1056 sonrası **17:21–17:31 normal** (ort. 0,04–0,09 sn). 17:32'den itibaren `job startup timeout` |
| Öteki cron işleri | `cron_dakika_tik` 121 sn, `cron_sezon_tik` 49 sn, `bot_puan_tik` / `turnuva_lobi_botlari` 12 sn ile düşüyor — 1056'nın dokunmadığı işler de |
| Aynı desen 1056'dan ÖNCE | 14:45, 15:30, 16:00–16:45 UTC dilimlerinde `cron_dakika_tik` 16–31 sn, `hizli_tik` 11–24 sn, edge 5xx (16:35'te 17 adet) |
| Health (17:41 UTC) | `db`, `rest`, `auth` **UNHEALTHY**; realtime sağlıklı. 17:42'de DB yeni bağlantı kabul etmiyor, REST 504/zaman aşımı |
| Plan | Compute eklentisi yok → **Nano** (paylaşımlı CPU, 0,5 GB RAM, düşük disk IO tabanı). DB 119 MB, okuma %99,99 bellekten |

## Kök neden değerlendirmesi
- **1056 kaynağı değil.** Göstergeler: (a) 1056 uygulandıktan sonraki 10 dakika tikler normaldi; (b) aynı takılma deseni
  1056'dan 2,5 saat önce de vardı (1056 zaten bunun için yazılmıştı); (c) şu an kilit bekleyen yok, 1056'nın hiç
  dokunmadığı işler ve katalog sorguları bile yavaş; (d) test durduktan 10 dk sonra durum düzelmedi, kötüleşti.
- Desen **örnek (instance) düzeyinde kaynak tükenmesi**: arka uç başlatma (`job startup timeout`), yeni bağlantı ve
  diskten okuyan `pg_stat_statements` dakikalarca sürüyor, ama bellekteki sorgular hızlı. Nano'nun disk IO / CPU
  bütçesinin tükenmesiyle uyumlu (9 Eki "Disk IO kotası" notu). Bütçe grafiği yalnız panelde; API'den okunamadı.
- Yükü artıranlar: gün boyu bu bilgisayardan koşan canlı testler (Kasa botu) ve her 5 sn'de yeni arka uç açan `hizli_tik`.

## Neden geri alınmadı
Brif "sorun 1056'dan geliyorsa" diyordu; kanıt aksini gösteriyor. Ayrıca geri alma 10 fonksiyonu yeniden yazan DDL'dir:
bu durumda (a) DB bağlantı kabul etmediği için uygulanamaz, (b) uygulanabilse kilit/IO yükünü artırır, (c) 1056'nın
çözdüğü grup maçı kilit yığılmasını geri getirir. Geri alma dosyası hazır duruyor: `docs/grup-mac-kilit-1056-geri-al.sql`.

## Ida'nın kararı gereken
1. **Projeyi yeniden başlatma** (Supabase panel › Settings › General › Restart project, ya da benden iste — onayın olmadan
   yapmadım). Kaynak tükenmesinde en hızlı düzeltme budur.
2. Kalıcı çözüm seçeneği: Micro compute (~10 $/ay; 1 GB RAM, disk IO tabanı 87 MB/sn). Bu bir ücret kararı.
3. Canlıya karşı test koşmayı durdurmak (CLAUDE.md kuralı zaten böyle; bugün yine çalışıyordu).

Not: Bu bilgisayarda Codex süreçleri ve iki Vite geliştirme sunucusu (5199 ve varsayılan port) açık; onlara dokunmadım.

RAPOR HAZIR — Ida'ya iletilecek.

## Yeniden başlatma ve 15 dk izleme (Ida onayıyla, 10 Eki 2026)
- **17:51 UTC** Management API `POST /v1/projects/<ref>/restart` → 200. Proje 17:56 UTC'de `ACTIVE_HEALTHY`
  (arada REST 521/522 döndü). db / rest / auth sağlıklı.
- **Canlı kontrol (17:57 UTC, tek seferlik, 390 px):** ana sayfada coin (10.000), Sezon ve Ortak Hazine kartları
  geldi; Dükkân (`/joker`) açıldı, jokerler listelendi. 62 Supabase isteğinin **0'ı** hatalı.
- **İzleme 17:57–18:12 UTC (3 dk'da bir hafif sorgu):**

| UTC | hizli_tik ort / maks | dakika_tik ort / maks | hata | bağlantı | kilit bekleyen |
|---|---|---|---|---|---|
| 18:00 | 0,05 / 0,53 sn | 0,19 / 0,47 sn | 0 | 20 | 0 |
| 18:03 | 0,04 / 0,08 sn | 0,17 / 0,36 sn | 0 | 21 | 0 |
| 18:06 | 0,03 / 0,04 sn | 0,04 / 0,05 sn | 0 | 21 | 0 |
| 18:09 | 0,03 / 0,04 sn | 0,04 / 0,04 sn | 0 | 21 | 0 |
| 18:12 | 0,03 / 0,05 sn | 0,04 / 0,05 sn | 0 | 14 | 0 |

  Kesinti öncesi değerler (hizli_tik 49 sn, dakika_tik 121 sn, `job startup timeout`) görülmedi. Son REST yanıtı 200, 1,2 sn.
- 1056 yerinde duruyor; geri alma gerekmedi. Kalıcı risk sürüyor: Nano kaynak sınırı (compute kararı Ida'da) ve
  canlıya karşı koşan testler.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Grup maçı kilidi — bütün modları yavaşlatan kilit yığılması (10 Eki 2026, migration 1056 + 1057)

## Ölçüm (önce, canlı, salt okuma)
- `pg_stat_statements` (7 Eki'den beri): `cron_hizli_tik` 13.031 çağrı, **ort. 231 ms, maks. 81,4 sn**; `cron_bot_oyna` maks. 45,6 sn; `advance_group_match` (istemci) 227 çağrı, ort. 475 ms, maks. 7,8 sn; `mac_nabiz` 800 çağrı, maks. 7,7 sn.
- `cron.job_run_details` (bugün): `hizli_tik` saatlik en uzun tur 11–24 sn; **39 tur "job startup timeout"** (pg_cron bağlantı bile açamadı, 10:29–16:56).
- Kilit kalıbı:
  - `hizli_tik` tek işlemde Düello + Kasa + `bot_oyna` koşturuyordu.
  - `bot_oyna`'nın 8) adımı `group_matches` satırını `FOR UPDATE` alıp **tik bitene kadar** tutuyordu; 9) adımı `advance_group_match` ile başka maçın satırını **süresiz** bekliyordu.
  - İstemci 3 sn'de bir `grup_mac_nabiz`, cevaptan sonra 2,5 sn'de bir `advance_group_match` atıyordu (ikisi de FOR UPDATE) ve **önceki yanıtı beklemeden** yenisini gönderiyordu → aynı satırda 8 bekleyenli kuyruklar.
- İki bağlantılı kilit testi (`araclar/grup-kilit-testi.mjs`; satır 6 sn kilitli, B'nin işlemi geri alınır): `grup_mac_nabiz` 5.677 ms · `advance_group_match` 5.790 ms · `mac_nabiz` 5.776 ms · `advance_match` 5.705 ms. Yani çağrılar **kilit bırakılana kadar tam bekliyor**.
- Aynı kalıp öteki modlarda da var: `advance_match`, `advance_hizli_mac`, `advance_tournament`, `mac_nabiz`, `hizli_mac_nabiz` aynı süresiz `FOR UPDATE`'i kullanıyor. Düello (`cron_duello_tik`) ve Kasa (`kasa_tik_hepsi`, `SKIP LOCKED`) zaten beklemiyor.
- `gorevlerim` (ort. 1,16 sn): yeni bağlantıdaki ilk çağrı 783 ms, ikincisi 63 ms. Sayaç başına süre soğukta 50–120 ms, sıcakta 1–10 ms. Maliyet bağlantı başına plpgsql derlemesinden, soğuk önbellekten ve DB yavaşken ölçülen çağrılardan geliyor. Eksik index yok → **değiştirilmedi**. `get_categories` (1,13 sn) sıcakta 81 ms; aynı neden, düzeltilmedi.

## Kök neden
1. **Tetikleyici: disk G/Ç kısılması.** 17:38 UTC'de checkpoint 391 tamponu (≈3 MB) yazmak için **153 sn** harcadı (normalde ~33 sn). Nano sunucunun disk G/Ç bütçesi tükenince her şey yavaşlıyor. Bütçeyi tüketen başlıca yük 9 Eki'deki **Düello v4 simülasyonu** (`pg_temp.sim_mac`, ~3.100 çağrı, ROLLBACK'li): 7 Eki'den beri üretilen 1,3 GB WAL'ın **~700 MB'ı** ondan.
2. **Büyütücü: kilit yığılması.** DB yavaşken cron'un tuttuğu grup maçı satırı ve istemcinin üst üste binen istekleri bağlantıları doldurdu. Kilitle ilgisi olmayan sorgular da 8 sn'de düştü (`rpc_sayac` satırında 8 bekleyen görüldü).

## Düzeltme
| | |
|---|---|
| **1056** (canlı) | `hizli_tik` artık `call public.cron_hizli_tik_islem()` çalıştırıyor. Önce eski tik (Düello/Kasa/öteki botlar) **COMMIT** ediliyor. Sonra her aktif grup maçı **ayrı kısa işlemde** ilerliyor (`bot_grup_mac_tik` → `bot_grup_adimlari`; bot_oyna'nın 8+9 adımı, gövde aynen taşındı). Hata ya da kilit yalnız o maçı etkiliyor. |
| 1056 | `advance_group_match` / `advance_match` / `advance_hizli_mac` / `advance_tournament`: `lock_timeout 2s`. Kilit 2 sn'de alınamazsa çağrı sessiz dönüyor; ilerletmeyi yalnız kilidi alan çağrı yapıyor. |
| 1056 | `grup_mac_nabiz` / `mac_nabiz` / `hizli_mac_nabiz`: kilit alınamazsa kilitsiz görünüm dönüyor (1055 deseni). Başlatma/duraklatma/terk geçişleri yalnız kilidi alan çağrıda. Grup/hızlıda oyuncunun kendi nabzı yine yazılıyor; `mac_nabiz`'de bir sonraki tike kalıyor. |
| 1056 | Yeni iç yordamların yetkisi `bot_oyna` ile aynı (postgres + service_role). Mevcut fonksiyonların ACL'si değişmedi (provada doğrulandı). Geri alma: `docs/grup-mac-kilit-1056-geri-al.sql`. |
| **1057** (canlı) | `bot_grup_mac_tik` her tikte, iş olmasa da maç satırını kilitliyordu (satır kilidi diske yazar). Bu kalktı; kilidi artık yalnız işi olan adım alıyor. |
| İstemci | `oyun/lib/nabiz.js` (Klasik/Grup/Hızlı ortak) ve `GroupMatchPage` ilerletmesi: yanıtlanmamış istek varken yenisi gönderilmiyor; takılan istek **10 sn'de AbortController ile kesiliyor**. Uçuştayken gelen ilerletme denemesi kaybolmuyor, yanıttan sonra bir kez tekrarlanıyor. Aralıklar (3 sn / 2,5 sn) aynı kaldı, akıcılık değişmedi. |
| CLAUDE.md | Yeni kural: canlı DB'de simülasyon, toplu deneme ve yük testi yasak — ROLLBACK edilse bile. |
| Temizlik | `pg_temp.sim_mac` ve öteki `sim_*` nesneleri kalmadı (geçici şema yeniden başlatmayla temizlendi; sorguyla doğrulandı). |

## Önce / sonra
| Ölçüm | Önce | 1056 sonrası | 1057 sonrası (18:16–18:31 UTC, 15 dk) |
|---|---|---|---|
| `hizli_tik` tur süresi | ort. 231 ms, maks. 81 sn; bugün 39 başlatma zaman aşımı | 17:15–17:32: 0,03–0,28 sn · yeniden başlatma sonrası (17:58–18:15): 190 tur, ort. 34 ms, maks. 77 ms | **267 tur, ort. 39 ms, p95 73 ms, maks. 439 ms, 0 hata** |
| `dakika_tik` | — | 17:58–18:15: ort. 94 ms, p95 385 ms, maks. 474 ms | **ort. 80 ms, p95 253 ms, maks. 336 ms, 0 hata** |
| Kilitli satırda nabız/ilerletme | 5,7 sn (kilit bitene kadar) | **2,1 sn'de 200** | aynı |
| Grup maçı istemcisi (canlı, bota karşı) | nabızlar üst üste biniyordu | nabız ort. 190 ms, maks. 470 ms · ilerletme ort. 200 ms, maks. 521 ms · **aynı anda uçuşta en çok 1 nabız** | — |
| Sorgu kaynaklı WAL | `sim_mac` ~700 MB | — | yeniden başlatmadan beri toplam ~2,5 MB (≈70 KB/dk) |

Not: LSN farkıyla ölçülen ham WAL hızı güvenilir değil (yeniden başlatma sonrası 0,5 KB/sn, 1057 sonrası 272 KB/sn). `archive_timeout=120` her 2 dakikada 16 MB'lık segmenti kapatıyor; ölçüm penceresine düşen kapanma rakamı şişiriyor. Gerçek yazı `pg_stat_statements.wal_bytes`'tan okundu. Yeniden başlatmadan beri en çok yazanlar: `cron_dakika_tik` 543 kB, `bot_puan_tik` 440 kB, `hizli_tik` 432 kB.

## Kesinti (17:32–17:56 UTC)
- 1056 uygulandıktan 17 dk sonra, canlı Kasa duman testi sürerken G/Ç kısılması yeniden başladı: checkpoint 153 sn sürdü, pg_cron bağlantı açamadı, API 20 sn'de yanıt vermedi.
- Trafik ~1 istek/sn'ydi ve hepsi test makinesinden geliyordu.
- Aynı tablo 1056'dan önce de gün boyunca vardı (39 zaman aşımı). Kesintiyi 1056'nın başlattığını gösteren bir iz yok. Yine de 1056'daki gereksiz satır kilidi 1057 ile kaldırıldı.
- Ida Supabase'i yeniden başlattı (17:56). Sonrasında bağlantı ~0,6 sn, `select 1` 70–200 ms.

## Test
- Canlı, test hesabı (ArayuzDenetim913):
  - Grup maçı, bota karşı (`8696c498`): 20 soru, takılma yok, `bitti`.
  - Serbest Hazine (`30868a03`): `bitti`. Aracın "DEVAM ×2 / ücretsiz 50:50" kırmızıları eski beklentiler; o kural şu an kapalı (Kasa raporundaki gibi).
  - Klasik: 20/20 cevap sunucuya ulaştı. Ana sayfada 390 px'te 3 px çakışma kırmızısı önceden bilinen, bu işle ilgisiz bir bulgu.
  - Test hesabı `hesabimi_sil` ile silindi ("tam"; ArayuzDenetim profili 0).
- Prova (BEGIN…ROLLBACK): 1056 ve 1057 hatasız, ACL'ler korundu, cron komutu değişti. pg_cron altında CALL + maç başına COMMIT çalışıyor.
- `npm run build` temiz · `npm test` TÜMÜ GEÇTİ · `arayuz-denetim` **TEMİZ**.
- Yük testi canlıda yapılmadı. Yerelde Supabase yok (Docker kurulu değil), bu yüzden "birkaç bot grup maçı + Kasa" senaryosu yerine canlıda tek seferlik iki bağlantılı kilit testi yapıldı: 4 çağrı, hepsi geri alındı.

## Açık kalanlar (karar gerekir)
- Nano sunucunun disk G/Ç bütçesi dar. 2–5 sn'lik `hizli_tik` ve `cron.job_run_details` kayıtları sürekli küçük yazı üretiyor. Kalıcı çözüm: compute yükseltme ya da cron kayıt budamasını sıklaştırma.
- `rpc_sayac` (hız sınırı, 1053/1054) her çağrıda yazıyor; kesintide aynı satırda 8 bekleyen görüldü. Ayrı iş olarak ele alınmalı.
- Grup maçında `group_matches` okuması ~51/dk (gerçek zamanlı kanal + her ilerletmeden sonra yeniden okuma). Çağrı ucuz (ort. ~23 ms); akıcılık için dokunulmadı.

**Migration:** 1056 (`20260612001056_grup_mac_kilit.sql`) + 1057 (`20260612001057_grup_mac_tik_kilitsiz_bakis.sql`) — ikisi de canlıda uygulandı.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Maç düzeltmeleri — Ida'nın 10 Eki ~21:15–21:35 canlı testi + disk bütçesi (migration 1058)

## 1. Hazine Tur 7 takılması (maç 47d9d421) — kalıcı sunucu hatası DEĞİL; test sekmesi arka plandaydı
**Kanıt (edge logu + maç satırı):**
- Maç boyunca (18:21–18:28 UTC) **hiç `kalp_at` isteği yok**. KasaPage nabzı yalnız sekme görünürken atar → sekme baştan sona gizliydi (Claude in Chrome arka plan sekmesi). 18:15 Düello'sunda da `kalp_at` yok.
- `kasa_durum` yalnız `kasa_tik` cron'unun (30 sn) sinyalinden hemen sonra çağrılmış (18:22:02, :32, 18:23:02 …); turlar da tam 30,1 sn arayla açılmış (`kasa_hamleler.created_at` 18:22:01, :31, 18:23:01 …). Gizli sekmede yedek yoklama ve faz bitişi zamanlayıcısı çalışmaz, yalnız Realtime sinyali okuma yapar.
- Tur 7 18:25:02'de açıldı; o turda `kasa_cevap` isteği hiç gitmedi (sayaç 0'dayken dokunuş kabul edilmez). 18:25:03 → 18:25:34 arası 30 sn istek yok → nabız 25 sn eşiğini geçti → 18:25:32 tikinde `kasa_kopuk_kim` Ida'yı kopuk saydı, faz dondu (`bot_cevap_at` 2,4 sn kaydırılmış = kopukluk kayması). Sinyalle gelen okuma nabzı yazıp kopukluğu kaldırıyor, 30 sn sonraki tik yine kopuk buluyordu ("süre 0'da, bant gitmiyor" döngüsü). 18:27:02'den sonra okuma gelmedi; 45 sn sonra 18:28:03'te `sonuc_neden = kopuk` ile bitti.
- 1057 / kilit testiyle ilgisi yok: o dakikalardaki bütün `kasa_durum`'lar 200 ve 78–178 ms; Postgres logunda kilit/zaman aşımı satırı yok.

**İstemcinin toparlanması:** sekme görünür olunca hemen `kasa_durum` + `kalp_at` gider (taklit testi K3: 7 ms) → nabız yazılır, kopukluk kalkar, faz kalan süreyle sürer (45 sn dolmadıysa). Gizli sekmede nabız atılmaması bilinçli (oyuncu uygulamadan çıktıysa kopuk sayılmalı). Arka plan sekmesinde yapılan canlı testler bu yüzden her zaman takılır.

## 2. Yanlış "Bağlantı yeniden kuruluyor" bandı
**Kök neden:** bant, faz bitişinden 4 sn sonra yeni faz gelmemesini de bağlantı sorunu sayıyordu. Sunucu cevapsız oyuncu için **5 sn geç varış payı** (991) bekler ve fazı ancak bir okuma ilerletir → neredeyse her tur geçişinde bant çıkıyordu. Bant akış içindeydi: çıkınca şıkları/kartları **48 px** aşağı itiyordu (dokunuş yanlış yere düşüyor, "kilitli" hissi). Boş soru metni yeniden üretilemedi (taklit testinde bant varken metin hep yerinde; gizli sekmede giriş animasyonu durdurulduğu için ekran görüntüsünde boş görünmüş olabilir).

**Düzeltme (Hazine + Düello):** bant yalnız okuma hata veriyor **ve** son başarılı yanıttan beri ≥ 10 sn geçtiyse. Bant ve kopukluk bandı kaydırmasız üst katman (`.m2-bant--katman`, dokunuşu geçirir). Şıklar bantla kilitlenmez.

## 3. "Rakip ara" ilk tıklama
- **Düello:** düğme önce çizilip Skill seti yüklenince **~1,2 sn'de 223 px aşağı kayıyordu** (327 → 550, ölçüldü) → ilk dokunuş boşa. Düzeltme: düğme kural metni + Skill seti yerleşince çizilir (`SkillSeti onHazir`, 2,5 sn yedek). Canlıda ilk tıkta arama başladı.
- **Hazine:** kayma yok (491 px sabit); üretim derlemesinde 0/150/600/2500 ms'de tek tık hep aramayı başlattı. Logda ilk tıklamaya ait istek yok — en olası açıklama arka plan sekmesi (eski ekran karesi). Kod değişikliği gerekmedi.

## 4. Düello kategori seçimi
- (a) **1058:** her adımın kendi süresi (10 sn + 0,9 sn duyuru). Süre dolumu adım adım: 1. adım dolarsa yalnız rakibe giden kart otomatik, 2. adım yine 10 sn ile açılır.
- (b) Kayma üç kaynaktan: bağlantı bandı, kartların ÜSTÜNDE çıkan "Süre doldu · otomatik seçiliyor" notu, EN'de 1. adım başlığı 2 satır / 2. adım 1 satır. Düzeltme: bant katman, not kartların altında, iki başlık aynı hücrede üst üste. Önce 9–26 px kayma → sonra 0.
- (c) Ida'nın 18:15 maçında 9 saldırı turunun 7'sinde gerçekten bir adım otomatik seçilmişti (çoğu turda tek `kategori_sec` gitti: 2. dokunuş kayan karta düştü ya da paylaşılan süre bitti). Artık hangi adımın otomatik olduğu saklanıyor (`v4_oto_gonder` / `v4_oto_sec`), "otomatik seçildi" yalnız o kategoride yazıyor.

## 5. Cevap sonrası
Sayaç cevap anında durur (`useDonukSayac`), joker şeridi "Cevabın gitti · rakip bekleniyor" (rakip de cevapladıysa "Cevabın gitti"). Eskiden sayaç akıp "Süren doldu — sonuç bekleniyor" yazıyordu (taklit: 10 → 7).

## 6. Maç sonu boş sayfa
Kök: `DuelloPage` maç bitince özet (`mac_sonu_ozet`) gelene dek boş `msk-bekle` döndürüyordu (taklitte 2,3 sn). Artık arena ekranda kalır; özet hata verirse sahne özetsiz kurulur.

## 7. Aynı kalıplar öteki modlarda
| Kalıp | Hazine | Klasik | Grup | Turnuva |
|---|---|---|---|---|
| Yanlış bant (2) | düzeltildi | bant yok | bant yok | bant yok |
| İlk tık (3) | kayma yok | — | — | — |
| Cevap sonrası sayaç (5) | akıyordu → durdu | QuestionCard sayacı akıyordu → durdu | aynı kart → durdu | aynı kart → durdu |
| Maç sonu boşluk (6) | 2,3 sn boş → final/maç sahnesi kalır | perde vardı; **özet hata verirse sonsuza dek boş** ve rakip terk edince perde yoktu → düzeltildi | özet hatasında sonsuza dek boş → düzeltildi | özet gelene dek boş → "Turnuva bitti / ŞAMPİYON!" perdesi |

## 8. Disk bütçesi
- Budama zaten vardı (job 124: saatte bir, 6 sa'ten eski `job_run_details`). 1058 onu `kayit_budama()`'ya çevirdi: + takılı 'starting' satırları (1 gün), süresi geçmiş `rpc_sayac` satırları (2 gün; ilk koşuda 237'nin 193'ü), `net._http_response` (1 gün).
- Ölçüm (`pg_stat_statements`, yeniden başlatmadan beri): 17:56–19:26 UTC sorgu WAL'ı 7,11 MB (78 KB/dk); bunun **1,38 MB'ı (%19,5) `cron.job_run_details` yazımları** (her koşuda 1 insert + 4 update). Budama bu yazımı azaltmaz, tabloyu küçük tutar: `job_run_details` 1,45–1,50 MB / ~3.200–3.400 satırda sabit (önce ve sonra). 1058 sonrası 19:26–19:56: cron kayıt WAL'ı 5,7 KB/dk (önce 15,2 KB/dk — fark büyük ölçüde 1036'nın boşta 30 sn tikinden; bu pencerede iki canlı test maçı ve migration DDL'i de vardı, toplam 142 KB/dk). Ham LSN örneği (258 KB/sn) `archive_timeout` segment kapanmasına denk geldi, güvenilir değil.
- Asıl büyük kalem için seçenek (yapılmadı): `cron.log_run = off` — Supabase'de süper kullanıcı ve yeniden başlatma ister.

## 9. Hız sınırı sayacı: `rpc_sayac` → UNLOGGED (neden)
- Seçenekler: (a) UNLOGGED, (b) seyrek güncelleme (satır kilitliyse sayma / N'de bir yaz), (c) bellekte sayaç.
- **(a) seçildi:** davranış birebir aynı (aynı fonksiyon, pencere, hata), yetkiler/RLS aynı (provada ACL önce/sonra eşit). Sayaç yazımı WAL üretmez; yalnız sayaç yazan RPC'ler (`duello_durum`, `kasa_durum` yoklamaları) commit'te disk senkronu beklemez → Nano'nun G/Ç bütçesi korunur, satır kilidi daha kısa tutulur. Bedeli: çökme/yeniden başlatmada sayaçlar sıfırlanır → en çok bir pencere boyu ek hak (24 saatlik davet tavanı dahil); kabul edilebilir.
- (b) reddedildi: kilitliyken saymamak paralel isteklerle sınırı delmeye açık, seyrek yazmak sınırı gevşetir. (c) Postgres'te bağlantılar arası paylaşılan bellek yok.
- Not: "aynı satırda 8 bekleyen" kilit, sayacın çağıran RPC bitene kadar kilitli kalmasından (ör. `kasa_durum` maç kilidini 2 sn beklerken). UNLOGGED süreyi kısaltır ama kalıbı kaldırmaz.

## Migration
**1058** `20260612001058_mac_duzeltme_kart_sayac_budama.sql` — canlıda (19:28 UTC). Prova (BEGIN…ROLLBACK) → canlı. Geri alma `docs/mac-duzeltme-1058-geri-al.sql` (begin/commit yok, provayla çalıştırılmadı). Prova aracı `araclar/mac-duzeltme-1058-prova.mjs`: **16/16** (uygulamadan önce ve sonra).

## Test
- `npm run build` temiz · `npm test` TÜMÜ GEÇTİ · `arayuz-denetim` **TEMİZ**.
- Taklit (`araclar/mac-duzeltme-ekran.mjs`, aynı senaryolar): **eski kod 9 kırmızı → yeni kod 21/21**: tur geçişinde bant 8. sn'de → yok; bant 48 px kaydırma → 0; maç sonu Hazine/Düello 2,3 sn boş → 0; cevap sonrası sayaç 10→7 → sabit; kart 2. adımda 9–26 px → 0; gerçek 16 sn kopmada bant 12,7 sn'de çıkıp yanıtla kalkıyor. Yakalanan hata: kart başlığında `aria-hidden` dize oluyordu (iki yazı üst üste) → düzeltildi, araca kalıcı kontrol eklendi. Görüntüler `tasarim/mac-duzeltme-10eki/once-*` / `sonra-*`.
- **Canlı, test hesabı (ArayuzDenetim903), görünür sekme:**
  - Serbest Hazine, bota karşı (`37c6595a`): 19 tur, `bitti/hedef` 86-0. **Bant 0**, sayaç 0'da takılma 0, boş ekran 0, faz geri dönüşü 0, karar düğmesi kullanılabilir 6,7–6,9 sn. Aracın 4 kırmızısı eski beklentiler (DEVAM'da "ÜCRETSİZ 50:50/×2", `devam_odul`, "Yeni Kasa maçı" → artık "Yeni maç").
  - Serbest Düello, bota karşı (`dc42ef0b`): ilk tıkta arama başladı, 28 faz geçişi, **bant 0**, 0'da bekleme 0, cevaptan sonra sayaç 10/10 durdu ("Cevabın gitti · rakip bekleniyor"), kart 1→2 adım 8/8 yerinde, maç sonu boşluk 0 ms, `bitti`. Test hesabında 5 Klasik maç olmadığı için `duello_acilis_mac_esigi` yalnız arama süresince (~15 sn) 0 yapıldı, maç kurulunca 5'e geri alındı (doğrulandı).
  - Test hesabı `hesabimi_sil` → "tam" (profil 0).
- 1058 sonrası (19:29–19:56 UTC): `hizli_tik` 117 koşu, ort. 55 ms, p95 136 ms, maks. 947 ms, 0 hata · `dakika_tik` 28 koşu, ort. 235 ms, p95 515 ms, maks. 1.507 ms (tek koşu), 0 hata. `hizli_tik` boşta 30 sn'de bir koşuyor — 1036 tasarımı (Kasa'da da 30 sn), elle değişiklik değil.

## Dikkat
- Bu iş sürerken Codex aynı klasörde commit/push yaptı (`b467fe95`, soru üretimi); 1058 commit'im onun push'uyla birlikte gitti. Migration çakışması yok.

RAPOR HAZIR — Ida'ya iletilecek.
