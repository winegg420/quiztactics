# PAKET 30 — Meydan okuma hatası, mod seçimi, rövanş penceresi, eşleşme ekranı

Klasör: `C:\Users\ida\Desktop\quiztactics` (depo: `winegg420/quiztactics`).

Bu pakette **3B / harita / karakter işi YOK**. Hiçbir model, atlas veya `uret.mjs` dosyasına dokunma.

## DEĞİŞMEZLER
1. `vite.config.js › rollupOptions.input` dört girişli kalacak.
2. `localStorage` anahtarları değişmeyecek (`bildim_dil`, `bildim_ses`, `bildim_tanitim`, …).
3. Migration'lar append-only — mevcut dosya düzenlenmeyecek, yeni dosya eklenecek.
4. Yeni npm paketi YOK.
5. Her RPC çağrısında try-catch.
6. Veri silinmeyecek; eşya id'leri ve yuva adları değişmeyecek.
7. `prefers-reduced-motion` her yeni animasyonda desteklenecek; WCAG AA korunacak.

---

# A — ACİL: Meydan okuma hiç çalışmıyor (HTTP 300)

## ÖLÇÜLMÜŞ KANIT
Arkadaşlar sayfasında kılıç düğmesi → "Meydan okuma başlatılamadı."
Ağ isteği yakalandı:

```
POST /rest/v1/rpc/create_challenge  →  HTTP 300 Multiple Choices
```

Bu PostgREST'in PGRST203 hatası: **aynı adda birden fazla fonksiyon var, hangisinin
çağrılacağı seçilemiyor.** Uygulama yalnız `{ p_rakip }` gönderiyor, iki imza da buna uyuyor.

Veritabanında duran iki imza:
- `create_challenge(uuid, text, boolean)`
- `create_challenge(uuid, text)`

İkisi de **aynı migration'da** oluşturulmuş: `supabase/migrations/20260612000235_hiz_siniri_kapsami.sql`
satır **852** (3 parametreli) ve satır **888** (2 parametreli).
`20260612000201_ekonomi_dengesi.sql:852` 2 parametreliyi düşürmüştü; 235 onu geri getirmiş.
İkisinde de `hiz_siniri('create_challenge', 20, interval '60 seconds')` var.

**Etkisi: arkadaşa klasik maç daveti hiçbir oyuncuda çalışmıyor.**

## YAPILACAK
Yeni migration (append-only):

1. **ÖNCE ÖLÇ**: canlı veritabanında `pg_proc` üzerinden `create_challenge`'ın kaç imzası
   olduğunu ve tam parametre listelerini listele, rapora yaz. Migration dosyalarından değil,
   **canlıdan** oku — beklenmeyen üçüncü bir imza olabilir.
2. Fazla imzayı düşür: `drop function if exists public.create_challenge(uuid, text);`
   **Kalacak olan 3 parametreli sürüm** (`p_dereceli` dereceli/serbest ayrımı için gerekli).
3. Düşürmeden önce 3 parametreli sürümün canlıda GERÇEKTEN var olduğunu ve içinde
   `hiz_siniri` çağrısının bulunduğunu doğrula. Yoksa önce onu yeniden oluştur, sonra düşür.
4. Grant'ları kontrol et: `revoke execute ... from public, anon` + `grant execute ... to authenticated`
   kuralı 3 parametreli imza için geçerli olmalı (Paket 26 A'daki güvenlik kuralı korunacak).

## AYNI HATA BAŞKA YERDE
`hizli_mod_baslat` da farklı parametre sayılarıyla tanımlı (migration taramasında bulundu).
Hızlı Mod dondurulmuş olsa da **aynı kontrolü yap**: canlıda kaç imzası var, 300 dönüyor mu.
Dönüyorsa aynı şekilde temizle.

Ayrıca **bütün RPC'leri tara**: canlı `pg_proc`'ta `public` şemasında aynı ada sahip
birden fazla fonksiyon var mı? Varsa listele ve rapora yaz (hepsini düzeltme, önce raporla).

## KABUL
- Arkadaş listesinden meydan okuma çalışıyor, maç açılıyor.
- Aynı kişiye ikinci kez basınca sunucunun kendi mesajı görünüyor
  ("Bu oyuncuyla zaten devam eden bir meydan okuman var") — genel yedek mesaj değil.
- Dereceli/serbest ayrımı bozulmadı.

---

# B — Tek düğme + MOD SEÇİM PENCERESİ

## MEVCUT DURUM
`oyun/pages/FriendsPage.jsx:256-270` — her arkadaş satırında iki ayrı düğme var:
- ⚔️ kılıç → `create_challenge` (Klasik Maç)
- 🛡️ kalkan → `duello_davet_et` (Düello)

Ida bu ayrımı anlamadı: "kalkan ne işe yarıyor anlamadım", "hangi modda oynayacağımızı
soran ekran açılmadı". İkonlar modu anlatmıyor.

## YAPILACAK — [stated] Ida'nın kararı
İki ikon kalkacak, yerine **tek "Oyna" düğmesi** gelecek. Basılınca **mod seçim penceresi** açılacak.

Pencere içeriği:
- Başlık: "{ad} ile nasıl oynamak istersin?"
- İki büyük seçenek kartı:
  - **Klasik Maç** — kısa açıklama: "Sırayla 10 soru, en çok doğru kazanır."
  - **Düello (Taktik Maçı)** — kısa açıklama: "Rakibinin zayıf kategorisini bul, oradan vur.
    3 can, en çok 10 tur."
  - Her kartta o modun kazancı yazsın (Düello daha çok lig puanı ve coin veriyor).
- "Vazgeç" düğmesi.
- Bütün metinler `dil.js`'e girecek (TR + EN). Sabit Türkçe yazma.

Seçim yapılınca ilgili RPC çağrılacak — **mevcut iki fonksiyon aynen kullanılacak**
(`create_challenge` / `duello_davet_et`), yeni sunucu fonksiyonu yazma.

Hata durumunda pencere kapanmayacak, hata pencerenin içinde görünecek (şu an sayfanın
en üstüne düşüyor, mobilde görünmüyor).

## KABUL
- Arkadaş satırında tek oyna düğmesi var, mod penceresi açılıyor.
- İki mod da çalışıyor; düello daveti gerçekten düello açıyor.
- Klavyeyle gezilebiliyor (Esc kapatır), ekran okuyucu etiketleri var.
- Mobilde pencere ekrana sığıyor, kartlar tek sütuna düşüyor.

---

# C — Rövanş isteği gönderilince ekran boşalıyor

## ŞİKÂYET (Ida, canlıda)
Arkadaşla maç bitti, Rövanş'a bastı. "Talep gidiyor ve ekrandan her şey siliniyor."
Rakip belki kabul edecek ama isteği gönderen bunu göremiyor.

## MEVCUT KOD — ölçüldü
`oyun/pages/DuelloPage.jsx:408-430`, rövanş bölümü dört dallı:
- `rov.id` varsa → "Rövanşa git"
- isteği BEN gönderdiysem ve geçerliyse → `<div className="alt-yazi">Rövanş isteği gönderildi, rakip bekleniyor…</div>`
- karşı taraf istediyse → Kabul et / Reddet
- değilse → "Rövanş" düğmesi

Yani gönderen tarafta büyük düğme kayboluyor, yerine **soluk gri tek satır** geliyor.
Geri sayım yok, iptal yok, animasyon yok. Ida'nın "her şey silindi" dediği bu.

Rövanş isteğinin geçerlilik süresi: `duello_rovans_sn = 60` saniye
(`supabase/migrations/20260612000205_duello.sql:45`).

## ÖNCE ÖLÇ (rapora yaz)
1. İstek gönderildikten sonra gönderen tarafta ekranda tam olarak ne kalıyor?
   (Sonuç ekranının tamamı duruyor mu, yoksa bir kısmı mı kayboluyor?)
2. 60 saniye dolduğunda gönderen tarafta ne oluyor — düğme geri geliyor mu, ekran boş mu kalıyor?
3. Rakibe bildirim gidiyor mu? (`bildirim_yaz` çağrılıyor mu, hangi başlıkla?)

## YAPILACAK
Soluk satırın yerine **bekleme penceresi** gelecek — rakip arama ekranıyla aynı dili konuşacak:

1. Rakibin avatarı ve adı görünsün.
2. **Geri sayım**: 60 saniyeden geriye sayan halka veya çubuk. Süre `duello_rovans_sn`
   ayarından okunacak, koda sabit yazılmayacak.
3. "Rövanş isteği gönderildi — {ad} yanıtlıyor…" metni (dil.js, TR + EN).
4. **Vazgeç düğmesi**: isteği geri çeker. Sunucuda karşılığı yoksa yalnız arayüzde
   bekleme durumunu kapat ve düğmeyi geri getir; yeni RPC yazma, raporda belirt.
5. Süre dolunca pencere kapanacak ve **"{ad} yanıt vermedi"** mesajı görünecek,
   "Rövanş" düğmesi geri gelecek. Sessizce kaybolmayacak.
6. Rakip kabul ederse mevcut davranış korunacak (otomatik yeni düelloya geçiş, satır 314).

**Sunucu mantığına, sürelere ve `duello_rovans_iste/yanitla` fonksiyonlarına DOKUNMA.**
Bu madde yalnız arayüz.

## KABUL
- Rövanş'a basınca ekran boşalmıyor; ne olduğu açıkça görünüyor.
- Geri sayım gerçek süreyle eşleşiyor.
- Süre dolunca kullanıcı durumu anlıyor ve tekrar deneyebiliyor.

---

# D — Saldırı Hazırlığı 4 saniye → 6 saniye

## GEREKÇE (Ida, canlıda yaşadı)
"4 saniyede soruyu okuyup Joker hakkımı kullanmalı mıyım diye karar veremiyorum.
Soru Değiştir jokerimi kullanacaktım, yetişemedim."

## YAPILACAK
Saldıran oyuncunun **Saldırı Hazırlığı** penceresi **4 sn → 6 sn**.

1. Süre `oyun_ayarlari` içinde bir anahtarda tutuluyorsa değeri orada güncelle
   (SQL'siz ayarlanabilir kalsın). Koda sabit yazılmışsa ayara taşı.
2. **Savunanın 15 saniyelik cevap süresi DEĞİŞMİYOR.** Zaman Baskısı jokerinin
   15→10 etkisi de aynı kalıyor.
3. Bot tarafı da aynı süreyi kullanmalı — bot saldırırken 4 sn'de hamle yapıp
   insan 6 sn beklerse tempo bozulur. Bot gecikmelerini kontrol et ve rapora yaz.
4. Arayüzdeki geri sayım göstergesi yeni süreyle uyumlu olmalı.

## KABUL
- Saldırı hazırlığı 6 saniye sürüyor, joker basmaya vakit yetiyor.
- Savunan süresi ölçüldü ve 15 sn olarak aynı kaldı.
- Bot maçlarında tur temposu bozulmadı.

---

# E — Eşleşme ekranı A sınıfına çıkacak

## ŞİKÂYET
Ida mevcut rakip arama ekranını "çok yetersiz, çok amatörce" buldu.
Paket 29 B'de canlandırılmıştı (turuncu halka + dönen ipucu metni) — yine yetersiz.

## TEŞHİS
Sorun süsleme eksikliği değil: **ekranda oyuncunun kendisi yok.** Boş bir alanda dönen
bir maskot var, bakacak bir şey yok. Profesyonel oyunlarda bu ekran bir bekleme değil,
bir **karşılaşma kurulumu**dur.

## YAPILACAK — yapı
İlgili yer: `oyun/pages/DuelloPage.jsx:145-156`, `bd-arama-katman` / `bd-arama-kutu`.
Aynı yapı klasik maç eşleşmesinde de kullanılıyorsa **ikisine birden** uygulanacak
(önce kontrol et, hangi ekranların bu bileşeni kullandığını rapora yaz).

1. **İki taraflı düzen.**
   - SOL: oyuncunun kendi kartı — avatar (çerçevesiyle), görünen ad, rütbe/lig,
     kategori unvanı (varsa), günlük seri. Bu veriler zaten istemcide var; yeni sorgu
     gerekiyorsa tek bir hafif sorgu ile al, her saniye yenileme YAPMA.
   - SAĞ: rakip yeri — boş silüet + soru işareti, "Rakip aranıyor" alt yazısı.
   - ORTA: **VS** rozeti.
2. **Rakip bulunma anı.** Silüet yerini gerçek avatara bırakır; iki kart birbirine
   hafifçe yaklaşır, VS bir kez parlar, `sesRakipBulundu()` çalar (ses Paket 29 E'de eklendi).
   Animasyon toplam 800-1200 ms; bitince maç ekranına geçilir.
3. **Ezeli rakip satırı.** Bu oyuncuyla geçmiş varsa VS'in altında görünür:
   "Bu oyuncuyla 7-4 öndesin." Veri zaten tutuluyor (Paket 14 · ezeli rakip kaydı);
   yoksa bu maddeyi ATLA ve raporda neden atladığını yaz.
4. **Arka plan.** Düz beyaz yerine hafif kayan bir ışık/gradyan; marka turuncusunda
   yavaş nabız. Neon değil, "Şenlik" dilinde kalacak.
5. **İpucu metni kalır** ama alt satıra iner, ana unsur olmaz.
6. **Saniye sayacı kalır.**
7. **Vazgeç düğmesi** ilk andan itibaren basılabilir, davranışı değişmez.

## SINIRLAR
- Eşleştirme mantığına, sürelere, RPC'lere **dokunma**. Bu madde tamamen sunum.
- Yeni npm paketi yok; animasyonlar CSS ile.
- `prefers-reduced-motion` açıkken bütün hareket kapanacak, ekran yine iki taraflı görünecek.
- Ekran mobilde ölçülecek: iki kart dar ekranda üst üste değil, yan yana küçülerek sığmalı.

## ÖLÇÜM (rapora yaz)
- Eşleşme süresi öncesi/sonrası (birkaç deneme) — uzamamalı.
- Ekranın ilk çizim süresi ve eklenen CSS/JS boyutu.

## KABUL
- Ekranda 10 saniye beklemek "donmuş" hissi vermiyor.
- Rakip bulunma anı fark ediliyor (görsel + ses).
- Mobilde düzen bozulmuyor.

---

# TESLİM
1. Her bölüm ayrı commit; mesajda bölüm harfi geçsin (`Paket 30 A: …`).
2. **A bölümü ilk sırada** — canlı hata, diğerlerini beklemesin.
3. `PROGRESS.md`'ye ölçümleri, kararları ve çıkarımları yaz.
4. Değiştirdiğin her CSS seçicisinin başka ekranları bozmadığını kontrol et ve
   hangilerini kontrol ettiğini rapora yaz.
5. `npm test` geçmeli.
