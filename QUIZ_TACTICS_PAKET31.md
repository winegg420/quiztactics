# PAKET 31 — Taktik her moda yayılıyor: Klasik Mod jokerleri + üçüncü mod

Klasör: `C:\Users\ida\Desktop\quiztactics` (depo: `winegg420/quiztactics`).

Bu pakette **3B / harita / karakter işi YOK**.

## NEDEN
Oyunun adı **Quiz Tactics**. Taktik bugün yalnız Düello'da var. Ida'nın kararı: taktik
Klasik Mod'a da yayılacak, ve taktik istemeyen oyuncu için jokersiz üçüncü bir mod açılacak.

## MOD YAPISI — kesin
1. **Düello (Taktik Maçı)** — 6 joker (3 savunma + 3 saldırı). **DEĞİŞMİYOR.**
2. **Klasik Mod** — bugün 3 savunma jokeri var; 3 saldırı jokeri EKLENECEK (A bölümü).
3. **Saf Bilgi** (YENİ) — hiç joker yok, düz bilgi yarışması (B bölümü).

Grup Maçı ve Turnuva mod tablosuna dahil değil; ikisi de bu paketten etkilenmeyecek.

## DEĞİŞMEZLER
1. `vite.config.js › rollupOptions.input` dört girişli kalacak.
2. `localStorage` anahtarları değişmeyecek.
3. Migration'lar append-only — mevcut dosya düzenlenmeyecek.
4. Yeni npm paketi YOK.
5. Her RPC çağrısında try-catch.
6. Veri silinmeyecek; joker türü adları (`elli`, `sure`, `soru_degistir`, `zaman_baskisi`,
   `saldiri_degistir`, `savunma_kilidi`, `seri_koruma`) DEĞİŞMEYECEK — envanterde duruyorlar.
7. Düellonun joker davranışına dokunulmayacak.
8. Bütün yeni metinler `dil.js`'e girecek (TR + EN). Sabit Türkçe yazma.

---

# A — KLASİK MODA ÜÇ SALDIRI JOKERİ

## MEVCUT DURUM — ölçüldü
`supabase/migrations/20260612000239_joker_kullanim_ve_mac_ici_satin_alma.sql:134`:
```sql
if p_tur not in ('elli','sure','soru_degistir') then
  raise exception 'Bu joker maç içinde kullanılamaz';
end if;
if p_mac_tur not in ('1v1','grup','hizli','turnuva') then ...
```
Yani `1v1` (Klasik Mod) bugün yalnız üç savunma jokerini kabul ediyor.
Saldırı jokerleri (`zaman_baskisi`, `saldiri_degistir`, `savunma_kilidi`) yalnız `duello`'da.

## TASARIM — [stated] Ida'nın kararı
Klasik mod simetriktir: iki oyuncu **aynı soruyu aynı anda** cevaplar, "saldıran" yoktur.
Üç joker bu yapıya şöyle uyarlanacak:

### A.1 — Soru Değiştir → ORTAK davranış
- Kim basarsa bassın **iki oyuncunun da sorusu değişir.** Aynı yeni soru ikisine de gider.
- Amaç farkı (arayüzde anlatılacak): düelloda bu bir hücum aracıdır (rakibe giden soruyu
  değiştirirsin), klasik modda bir kaçış aracıdır (bilmediğin sorudan kurtulursun) —
  ama rakibe de yeni bir soru vermiş olursun.

**ÖLÇÜLMÜŞ ENGEL:** `mac_soru_degistir` (`20260612000142_soru_degistir_jokeri.sql:85`)
değişimi `soru_degisimleri` tablosuna **kullanıcı bazlı** yazıyor; benzersiz kısıt
`(mac_tur, mac_id, user_id, soru_index)`. Yani bugün yalnız basanın sorusu değişiyor.

**YAPILACAK:** `1v1` için değişim **iki oyuncuya da** yazılacak (aynı `question_id`,
aynı `baslangic`). Tablo şemasına ve benzersiz kısıta DOKUNMA — iki satır yaz, yeter.
Düello ve grup/hızlı davranışı aynen kalacak.

**DİL UYARISI:** fonksiyon yeni soruyu basan oyuncunun diline göre seçiyor
(`select coalesce(pr.dil,'tr')`). İki oyuncunun dili farklıysa aynı `question_id`
ikisine de yazılmalı; metin zaten `soru_dilinde()` üzerinden kişiye göre dönüyor.
Seçim yapılırken **her iki oyuncunun da o soruyu daha önce görmediğinden** emin ol
(`soru_ids` + `soru_degisimleri` birleşimi, ikisi için birden).

### A.2 — Süreyi Kısalt (`zaman_baskisi`)
- **Yalnız rakibin süresi kısalır.** Basanın süresi aynen devam eder.
- Rakip erken biter ve aradaki farkı bekleme ekranında geçirir (bu davranış zaten var:
  klasik modda erken cevaplayan diğerini bekliyor).
- Kısaltma miktarı `oyun_ayarlari`'na yazılacak (öneri anahtar: `klasik_zaman_baskisi_sn`,
  başlangıç değeri düellodaki 15→10 farkıyla uyumlu olsun). Koda sabit yazma.

**ÖNCE ÖLÇ (rapora yaz):** senkron 1v1 maçta soru süresi **tek ve ortak** bir
`matches.soru_baslangic` alanından mı hesaplanıyor, yoksa oyuncu başına
(`oyuncu1_baslangic` / `oyuncu2_baslangic`) mı? `20260612000130_tum_maclar_es_zamanli.sql`
her ikisini de barındırıyor.
- Oyuncu başına alanlar kullanılıyorsa: yalnız rakibin alanını geri kaydır. En az değişiklik.
- Ortak tek alan kullanılıyorsa: kişi bazlı bir "süre kısaltma" kaydı gerekir
  (ör. `joker_kullanimlari` üzerinden hedef oyuncu + saniye). **Yeni tablo açmadan**
  çözülebiliyorsa öyle çöz; çözülemiyorsa neden gerektiğini rapora yaz ve en küçük
  şemayı öner — uygulamadan önce dur.

### A.3 — Savunma Kilidi (`savunma_kilidi`)
- Basıldığında **rakip o soruda joker kullanamaz.** Etki yalnız o soruyla sınırlı.
- Sunucuda `joker_hak_kontrol` içinde kontrol edilecek: o maçta, o soru indeksinde,
  karşı oyuncu tarafından kullanılmış bir `savunma_kilidi` varsa joker reddedilecek.
- Rakibin arayüzünde açık mesaj: **"Rakibin savunma jokerlerini kilitledi."**
  (dil.js, TR + EN). Sessizce çalışmayan düğme OLMAYACAK.

### A.4 — Kullanım anı ve haklar — [stated] karar verildi
- Jokerler **süre işlerken** basılır. Düellodaki gibi ayrı hazırlık penceresi YOK.
- Süre DURMAZ. Mevcut desen korunuyor (Paket 27): joker üstüne bas → küçük onay penceresi
  → joker hemen gelir. Joker basmanın zaman maliyeti dengeyi kendiliğinden kurar.
- Maç başına en çok **4 joker**, **aynı jokerden bir kez** (Paket 27 kuralı aynen geçerli;
  artık 6 tür arasından 4 seçim yapılıyor — taktik burada başlıyor).
- Dereceli Klasik Mod'da ücretsiz joker YOK. Serbest Klasik Mod'daki bir adet ücretsiz
  50:50 kuralı DEĞİŞMİYOR.

### A.5 — Bot simetrisi
Bot da aynı kuralları kullanacak: klasik modda bot da saldırı jokeri basabilmeli, aynı
haklarla ve aynı sınırlarla. Bot hiç joker kullanmazsa oyuncu bunu fark eder ve mekanik
sahte hissettirir. Botun joker kullanma sıklığını `oyun_ayarlari`'na bir anahtarla bağla.

## SINIRLAR
- Bu değişiklikler **yalnız `1v1`** için. `grup`, `hizli`, `turnuva` etkilenmeyecek.
- Turnuvadaki "soru değiştirilemez" kuralı (239:141) aynen kalacak.
- Düellonun joker mantığına hiç dokunulmayacak.

## KABUL
- Klasik modda altı joker de görünüyor ve çalışıyor.
- Soru Değiştir'e basınca **iki ekranda birden** soru değişiyor (iki oturumla test et).
- Süreyi Kısalt'a basınca yalnız rakibin sayacı kısalıyor; basan etkilenmiyor.
- Savunma Kilidi'nden sonra rakip joker basmaya çalışınca açık uyarı görüyor.
- Maç başına 4 joker ve aynı jokerden bir kez sınırları tutuyor.
- Düelloda hiçbir davranış değişmedi (düelloda bir maç oynayıp doğrula).

---

# B — ÜÇÜNCÜ MOD: "SAF BİLGİ"

## NE
Hiç joker olmayan, düz bilgi yarışması. Taktik istemeyen oyuncu için.
- Ad: **Saf Bilgi** (EN: **Pure Knowledge**).
- Joker alanı ekranda **hiç görünmez** — kapalı/soluk değil, yok.
- Diğer her şey Klasik Mod ile aynı: soru sayısı, süre, dereceli/serbest ayrımı.

## YAPILACAK
1. Mevcut Klasik Mod akışının üzerine **yeni bir maç türü** değil, mümkünse bir **bayrak**
   kur: `matches` tablosuna `jokersiz boolean default false` gibi. Böylece eşleştirme,
   puanlama, bot mantığı ve bütün mevcut kod yeniden yazılmaz.
   - Bayrak `true` ise: `joker_hak_kontrol` o maçta her joker isteğini reddeder
     ("Bu modda joker kullanılamaz"), arayüz joker alanını hiç çizmez.
   - Eşleştirme **aynı bayrağa sahip oyuncuları** eşleştirmeli — jokerli oyuncu jokersiz
     maça düşmemeli.
2. Ana sayfadaki mod listesine üçüncü kart eklenecek, kısa açıklamasıyla:
   "Joker yok. Sadece bilgi ve hız."
3. Puan/coin: **Klasik Mod ile aynı** (dereceli galibiyet +25 lig puanı, 25 coin).
   Joker olmaması bir dezavantaj değil, bir tercih — ödülü düşürme.

## ÖNCE ÖLÇ (rapora yaz)
- Eşleştirme kuyruğu bugün hangi alanlara göre çalışıyor (`dereceli`, `kategori`, …)?
  Yeni bayrağı kuyruğa eklemek kaç satır?
- Üçüncü mod kuyruğu böler: canlıda oyuncu az. Bekleme süresi ve bot oranı ne olur,
  ölç ve rapora yaz. (Ida bu riski bilerek kabul etti; yine de ölçülsün.)

## KABUL
- Saf Bilgi maçında hiçbir joker düğmesi görünmüyor, sunucu da reddediyor.
- Jokerli ve jokersiz oyuncular birbirine eşleşmiyor.
- Puan ve coin Klasik Mod ile aynı yazılıyor.
- Mevcut Klasik Mod maçları bozulmadı.

---

# C — ARAYÜZ METİNLERİ

Oyuncu iki modda aynı adı taşıyan jokerin farklı çalıştığını **okuyarak** anlamalı.

1. Klasik moddaki Soru Değiştir'in açıklaması: **"Soru ikinizde de değişir."**
2. Süreyi Kısalt: **"Rakibinin süresi kısalır, seninki aynı kalır."**
3. Savunma Kilidi: **"Rakip bu soruda joker kullanamaz."**
4. Düellodaki karşılıkları DEĞİŞMEYECEK (orada "rakibe giden soru değişir" anlamında).
5. Mod seçim kartlarında (Paket 30 B'de eklenen pencere dahil) her modun joker durumu
   tek satırla yazsın: Düello "6 joker · sıra sende" · Klasik "6 joker · aynı anda" ·
   Saf Bilgi "joker yok".

Hepsi `dil.js`'e TR + EN girecek.

---

# TESLİM
1. Her bölüm ayrı commit (`Paket 31 A: …`).
2. A.2'de ölçüm sonucu yeni tablo gerektiriyorsa **uygulamadan önce dur ve raporla.**
3. `PROGRESS.md`'ye ölçümleri, kararları ve çıkarımları yaz.
4. İki oturumla (iki tarayıcı) gerçek bir klasik maç oynayıp üç jokeri de test et.
5. `npm test` geçmeli.
