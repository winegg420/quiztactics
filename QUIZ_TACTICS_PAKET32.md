# PAKET 32 — Sis jokeri, joker tasarımı, yarım maç uyarısı

Klasör: `C:\Users\ida\Desktop\quiztactics` (depo: `winegg420/quiztactics`).
Bu pakette **3B / harita / karakter işi YOK.**

## DEĞİŞMEZLER
1. `vite.config.js › rollupOptions.input` dört girişli kalacak.
2. `localStorage` anahtarları değişmeyecek.
3. Migration'lar append-only — mevcut dosya düzenlenmeyecek.
4. Yeni npm paketi YOK. Animasyonlar CSS ile.
5. Her RPC çağrısında try-catch.
6. Veri silinmeyecek. **`savunma_kilidi` joker türü SİLİNMEYECEK** — düelloda kullanılmaya
   devam edecek, oyuncuların envanterindeki adetler duracak.
7. **Düellonun joker davranışına HİÇ DOKUNULMAYACAK.**
8. Bütün yeni metinler `dil.js`'e girecek (TR + EN). Sabit Türkçe yazma.
9. `prefers-reduced-motion` her yeni animasyonda desteklenecek; WCAG AA korunacak.

---

# A — SİS JOKERİ (Klasik Mod'da Savunma Kilidi'nin yerine)

## KARAR
[stated] Ida: *"Savunma kalkanı olayı klasik modda pek iyi durmadı."*
Klasik Mod'un beşinci jokeri **Savunma Kilidi → SİS** olarak değişiyor.
Gerekçe: kalkan boşa gidebiliyordu (rakip zaten joker basmayacaksa işe yaramıyor) ve
etkisi görünmüyordu. Sis her zaman etkili ve etkisi anında görülüyor.

[stated] Ida: *"Oyuna hareket katmak için sis güzel yapılırsa çok iyi olur."*
**Önce Klasik Mod'da denenecek.** Beğenilirse düelloya da uygulanabilir — ama bu pakette DEĞİL.

## MEVCUT DURUM — ölçüldü
- `oyun/lib/jokerler.js:62` → `KLASIK_JOKERLER = ["elli","sure","soru_degistir","zaman_baskisi","savunma_kilidi"]`
- `supabase/migrations/20260612000247_klasik_saldiri_jokerleri.sql` — klasikte
  `zaman_baskisi` ve `savunma_kilidi` açık (satır 193, 301, 395).
- `joker_envanter_tur_check` kısıtı `20260612000205_duello.sql:57` — sekiz tür sayıyor,
  **`sis` yok.**
- `baslangic_jokerleri_ver()` (`20260612000238`) yedi tür dağıtıyor, **`sis` yok.**

## A.1 — SUNUCU
Yeni migration (append-only):

1. `joker_envanter_tur_check` kısıtına **`'sis'`** eklenecek (mevcut sekiz tür korunacak).
2. Klasik Mod joker listesinden `savunma_kilidi` çıkarılacak, `sis` eklenecek.
   **Düelloda `savunma_kilidi` aynen kalacak** — yalnız `p_mac_tur = '1v1'` dalı değişecek.
3. Yeni ayarlar `oyun_ayarlari`'na (koda sabit yazma):
   - `klasik_sis_sn` = **3** — sis kaç saniye kalacak
   - `klasik_sis_son_esik_sn` = **6** — sürenin son kaç saniyesinde Sis kullanılamaz
4. **Son 6 saniye kuralı:** soru süresinin son `klasik_sis_son_esik_sn` saniyesinde
   `sis` jokeri REDDEDİLECEK. Hata mesajı açık olacak:
   **"Son 6 saniyede Sis kullanılamaz."** (dil.js, TR + EN)
   [stated] **Bu kural YALNIZ Sis için.** Diğer jokerler sürenin sonuna kadar kullanılabilir.
5. Sis etkisi `joker_kullanimlari` üzerinden okunacak — Paket 31'in `savunma_kilidi`
   için kurduğu desen aynen kullanılacak, yeni tablo AÇMA.
6. **Mevcut oyunculara Sis dağıtımı:** yeni tür olduğu için kimsenin envanterinde yok.
   `baslangic_jokerleri_ver()` listesine `sis` eklenecek (yeni hesaplar alsın) **VE**
   Paket 29 D'deki tek seferlik dağıtım deseniyle mevcut bütün gerçek hesaplara
   `baslangic_joker_adet` (2) adet `sis` verilecek. Botlara verilmeyecek. İdempotent olacak.
7. **Bot simetrisi:** bot da Sis kullanabilmeli. `klasik_bot_joker_yuzde` /
   `bot_klasik_joker_tik` mekanizmasına `sis` eklenecek; son 6 saniye kuralı bota da uygulanacak.

## A.2 — RAKİBİN EKRANI (sis yiyen taraf)
[stated] Ida'nın tarifi, birebir uygulanacak:

1. **Bütün ekranı kaplayan bir sis perdesi İNER, 3 saniye kalır, sonra KALKAR.**
   İniş ve kalkış hareketli bir geçiş olacak — statik bir katman açılıp kapanmayacak.
2. **Rakip şıkları OKUYAMAYACAK.** Perde gerçekten kapatacak; "az çok seçilir" yarı saydam
   bir katman OLMAYACAK. Soru metni de şıklar da okunamaz olacak.
3. **Geri sayım sayacı sisin ÜSTÜNDE görünür kalacak.** Rakip kaç saniyesi kaldığını görebilir.
4. **Sis sırasında şıkka BASILAMAZ** — tıklama kilitli. Göremediği şıkka rastgele basma
   ihtimali olmayacak. Sis kalkınca kilit açılacak.
5. Sisin ortasında kısa bir bilgi satırı: **"Rakibin sis gönderdi"** (dil.js, TR + EN).
6. **Süre akmaya devam eder** — sis süreyi durdurmaz.

## A.3 — GÖNDERENİN EKRANI
[stated] Ida'nın tarifi:
- Gönderen **kendi oyununu oynamaya devam eder.** Sorusu, şıkları ve sayacı **KAPANMAZ.**
- Ekranında da bir sis efekti olacak ama **yalnız yan/kenar taraflardan** gelip geçen,
  hafif bir efekt. Amaç: "rakibim şu an sisin içinde" hissini vermek.
- Bu efekt oyunu engellememeli; şıklara basmak, okumak hiç etkilenmeyecek.

## A.4 — SİS GÖRSELİ (bu madde eksik bırakılamaz)
- Renk: koyu mor–lacivert aralığında, **iki katmanlı** (arkada koyu, önde açık) yumuşak
  bulut dokusu. Düz gri tek renk perde OLMAZ.
- Hareket: yukarıdan aşağı **iniş ~400 ms**, bekleme (ayardan, varsayılan 3 sn),
  **kalkış ~500 ms**. Geçişler yumuşak eğriyle (ease-in-out), ani kesme yok.
- Doku: CSS gradyan + `filter: blur()` ile üst üste iki katman, hafif yatay kayma
  animasyonuyla "canlı sis" hissi. Sabit resim dosyası kullanma.
- Kenarlardan içeri doğru koyulaşan bir vinyet.
- `prefers-reduced-motion` açıkken: hareket yok, sis anında görünüp anında kalkar,
  ama **kapatma işlevi aynen korunur** (şıklar yine okunamaz, tıklama yine kilitli).
- Düşük donanımda takılma olmamalı: `transform` ve `opacity` üzerinden animasyon,
  `width/height/top/left` animasyonu YOK.

## A.5 — SES
Sis inerken ve kalkarken ses çalacak. `public/ses/` klasöründe hazır dosyalardan uygun
olan kullanılabilir (`sure_doldu.mp3` veya `joker.mp3`), ya da `ses.js`'e `sis` rolü
eklenip mevcut bir dosyaya bağlanabilir. **Yeni ses dosyası indirme/üretme.**

## KABUL
- Klasik modda beşinci joker **Sis**; Savunma Kilidi klasik listede YOK.
- Düelloda Savunma Kilidi hâlâ var ve çalışıyor (düelloda bir maç oynayıp doğrula).
- Sis yiyen oyuncu 3 saniye şıkları okuyamıyor, basamıyor; sayacı görüyor.
- Gönderenin ekranı kapanmıyor, kenarlarda efekt görünüyor.
- Son 6 saniyede Sis düğmesi kullanılamıyor ve sebebi yazıyor.
- Mevcut hesaplarda Sis 2 adet görünüyor; dağıtım ikinci çalıştırmada tekrar etmiyor.

---

# B — JOKER GÖRSEL TASARIMI

## ŞİKÂYET
[stated] Ida: *"Klasik maçta jokerler yeteri kadar gösterişli değil."* Bir quiz oyunu
canlılığı isteniyor.

## B.1 — RENK KARARI
[stated] **Bütün jokerler AYNI renk: marka turuncusu (`--bd-vurgu`, #F4701F).**
Ida'nın kararı: *"Jokerler farklı renk olursa kafa karıştıracak, hepsi turuncu olsun."*
Joker başına farklı renk verme. Ayrım **ikon + metin** ile yapılacak.

## B.2 — JOKER DÜĞMESİ — durum tarifi (hepsi tek tek uygulanacak)
Her joker düğmesinin dört durumu olacak ve dördü de gözle ayırt edilebilecek:

1. **Kullanılabilir** — dolu turuncu zemin, beyaz ikon, `0 4px 0` alt gölge (proje deseni),
   sağ üstte adet rozeti. Basılınca `translateY(4px)`.
2. **Kullanıldı** — soluk (opacity ~0.45), üstünde çapraz/onay işareti, basılamaz.
3. **Stoğu yok ama satın alınabilir** — kenarlık turuncu, içi boş; sağ üstte **altın "+"**
   simgesi. Basınca satın alma onay penceresi (mevcut desen, Paket 27).
4. **Şu an kullanılamaz** (ör. Sis son 6 saniyede) — gri, basılamaz, üstüne gelince/basınca
   sebebi yazar: "Son 6 saniyede Sis kullanılamaz."

## B.3 — İKONLAR
Mevcut `Ikon` bileşeni kullanılacak, emoji kullanılmayacak. Her jokerin ikonu tek bakışta
ne olduğunu anlatmalı:
- 50:50 → terazi (mevcut)
- Ek Süre → saat (mevcut)
- Soru Değiştir → ileri atla / yenile (mevcut)
- Süreyi Kısalt → hızlı/şimşek (mevcut)
- **Sis → yeni ikon gerekli**: bulut/dalga katmanı. `Ikon` bileşenine yeni bir SVG
  eklenecek, dış kaynaktan indirme YOK.

## B.4 — KULLANIM ANI ANİMASYONU
Joker basıldığında ne olduğu görülmeli — sessizce çalışmayacak:
- Düğme kısa bir "parlama" (pulse) yapar.
- Ekranın ortasında 700-900 ms kalan bir **bildirim şeridi**: joker ikonu + adı +
  ne yaptığı ("Rakibin süresi 5 saniye kısaldı").
- Şerit `prefers-reduced-motion` açıkken animasyonsuz görünür, süresi aynı kalır.

## B.5 — JOKER ÇUBUĞU
- Beş joker tek satıra sığmalı; dar ekranda ikon küçülür ama **kaydırma çubuğu çıkmaz**.
- Joker çubuğunun üstünde tek satır başlık: kaç joker hakkın kaldığı
  ("Bu maçta 2 joker hakkın kaldı"). Mevcut 4 hak kuralı zaten var, sadece görünür olacak.

## KABUL
- Beş joker de turuncu; renkle değil ikonla ayrılıyor.
- Dört durum gözle ayırt ediliyor (ekran görüntüsüyle rapora koy).
- Joker basınca ekranda ne olduğu yazıyor.
- Dar ekranda (360 px) çubuk taşmıyor, kaydırma çıkmıyor.

---

# C — "5 SANİYE" YAZISI

## ŞİKÂYET
[stated] Ida: *"Süreyi kısalt diye joker var. 'Rakibin süresini 5 saniye kısalt' gibi bir
şey yazsın ki anlaşılsın. Anlaşılmıyor."*

## YAPILACAK
`oyun/lib/jokerler.js` → `KLASIK_BILGI.zaman_baskisi.aciklama` bugün şöyle:
> "Rakibinin süresi kısalır, seninki aynı kalır."

Bunun yerine **sayı içeren** metin:
> **"Rakibin süresini 5 saniye kısaltır. Seninki aynı kalır."**

- Sayı `oyun_ayarlari`'ndaki `klasik_zaman_baskisi_sn` değerinden okunacak,
  metne sabit yazılmayacak. Ayar değişirse yazı da değişecek.
- Aynı kural Sis için de geçerli: **"Rakibin ekranını 3 saniye sise boğar."**
- Bütün joker açıklamaları gözden geçirilecek; muğlak ifade kalmayacak, hepsinde
  sayı/süre/adet olmalı.
- TR + EN.

## KABUL
- Joker çubuğunda ve joker dükkânında açıklamalar sayı içeriyor.
- `oyun_ayarlari`'nda değeri değiştirince ekrandaki yazı da değişiyor.

---

# D — YARIM MAÇ UYARISI

## ÖLÇÜLMÜŞ SORUN
Ida "eşleşme ekranı yapılmamış" dedi; ekran yapılmış ve çalışıyor
(`oyun/components/KarsilasmaSahnesi.jsx` + `RakipAra.jsx`).
**Gerçek sebep:** oyuncunun yarım kalmış bir maçı varsa "Hemen oyna" onu sessizce o maça
sokuyor, eşleşme ekranı hiç açılmıyor. Claude canlıda aynısını yaşadı (17. soruda yarım
maça düştü).

## YAPILACAK
"Hemen oyna"ya basıldığında devam eden bir maç varsa **önce sorulacak**:

- Küçük bir pencere: **"Devam eden maçın var"** + rakibin adı + kaçıncı soruda kaldığı.
- İki seçenek: **"Kaldığın yerden devam et"** · **"Yeni maç"**.
- "Yeni maç" seçilirse mevcut maç ne olacak? **Önce ÖLÇ:** yarım maç terk sayılıyor mu,
  puan kaybı var mı, `mac_kotasi_kontrol()` ne diyor? Ölçüm sonucunu rapora yaz ve
  **oyuncuya sonucu açıkça söyle** ("Devam eden maçın yenilgi sayılır" gibi).
  Eğer terk cezası varsa ve bu karar Ida'ya sorulmalıysa, o seçeneği ŞİMDİLİK kapat
  ve yalnız "devam et" göster; raporda belirt.
- Metinler dil.js (TR + EN).

## KABUL
- Yarım maç varken "Hemen oyna" artık sessizce maça sokmuyor, soruyor.
- Yarım maç yokken akış aynı: doğrudan eşleşme ekranı açılıyor.

---

# TESLİM
1. Her bölüm ayrı commit (`Paket 32 A: …`).
2. **Görsel maddeler (A.4, B) ekran görüntüsüyle raporlanacak** — "yapıldı" yazmak yeterli
   değil, nasıl göründüğü gösterilecek.
3. `PROGRESS.md`'ye ölçümleri, kararları ve çıkarımları yaz.
4. İki oturumla (iki tarayıcı) gerçek bir klasik maç oynayıp Sis'i iki taraftan da test et.
5. Düelloda bir maç oynayıp hiçbir şeyin bozulmadığını doğrula.
6. `npm test` geçmeli.
