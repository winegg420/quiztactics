# Paket 40 — Kırık olanlar · Rapor

19 Eyl 2026. On madde (A–J) sırayla uygulandı; her madde ayrı commit, `main`'e push edildi
(34421f3 → 65dab5d). Son yayın Vercel'de **success**. SQL, migration ve canlı veri değişikliği **yok**; canlı veritabanından
yalnız bir kez **okuma** yapıldı (G). Her adımdan sonra `npm run build` temiz. Ölçümler Vite dev + Playwright Chromium +
sahte Supabase yanıtlarıyla yapıldı; kanıt görüntüleri `denetim/goruntuler/p40-*.png`.

---

## A — `.bd-geri-sayim` sınıf çakışması 🔴 → düzeldi
**Değişen:**
- `oyun/styles/tema.css:2141-2191`: son-5-sn sayısı artık `.bd-son-saniye`.
- `tema.css:5103-5144`: 3-2-1 perdesi artık `.bd-baslangic-sayimi` (`-kutu`, `-sayi`, `-not`).
- JSX: `oyun/components/MacHazirlik.jsx:99-102` ve `oyun/components/QuestionCard.jsx:296`.
- Başka kullanan yok. Düello, Grup ve Turnuva aynı `QuestionCard`/`MacHazirlik` bileşenlerini kullanıyor.
- Eski sınıf adı depoda hiçbir yerde kalmadı; yorumlar dahil tarandı.

**Son-5-sn rengi:** `rgba(255,255,255,.14)` → `rgba(244,112,31,.45)` (vurgu turuncusu %45).
- Tepe opaklıkta ölçülen kontrast: açık kartta **1,62:1**, koyu kartta **1,98:1**.
- Öğe `aria-hidden` bir filigran; asıl süre bilgisi süre halkasında. Bilinçli olarak düşük tutuldu ki soru metnini örtmesin.
- ❔ **Soru:** daha belirgin olmasını istersen söyle, ama soru metninin üstüne biner.

**Ölçüm:**

| | Önce | Sonra |
|---|---|---|
| 3-2-1 perdesi (açık) | `matrix(0.86,…,-195,-422)`, kutu x=−168 y=−363, opaklık 0 | `position:fixed`, kutu **0,0 · 390×844**, `transform:none`, **opaklık 1**; sayı ortada (161,356) |
| 3-2-1 perdesi (koyu) | — | aynı; 0,0 · 390×844, opaklık 1 |
| Son 5 sn sayısı | x=−160, beyaz %14 | **x=165 y=454** (ekranın ortası), tepe opaklık **0,99**, turuncu |

Görüntüler: p40-baslangic-sayimi-390-{acik,koyu}.png · p40-son-saniye-tepe-390-acik.png

## B — Davet bandında yazı görünmüyordu (1,00:1) 🔴 → düzeldi
**Değişen:** `tema.css` ~4522-4560. Tür başına gerçek zemin ve ona göre yazı rengi; renkler iki temada aynı.

| Tür | Zemin | Yazı | Kontrast |
|---|---|---|---|
| Meydan okuma / rövanş / hızlı | #FFD27A → #F2B23C | #3A1A04 | 8,4–11,1:1 |
| Grup | #0A6FAE → #035B8C | beyaz | 5,4–7,3:1 |
| Düello | #C4530F → #9A2D0B | beyaz | 4,6–7,6:1 |

- Alt satırın `opacity:.8`'i kaldırıldı.
- "Kabul Et": beyaz zemin, koyu yazı, **15,8:1**.
- "Reddet ✕": sarı bantta **10,5:1**, grup bandında **7,7:1**, düello bandında **6,8:1**.
- Otomatik tarama açık ve koyu temada, meydan okuma / düello / grup bantlarında ihlal bulmadı.

**Aynı hata başka yerde de vardı — düzeldi:** üst bildirim şeridi `.bd-ust-toast`.
- Beyaz yazı / beyaz zemin, yaklaşık 1,1:1. `--ts-1/--ts-2` değişkenleri tanımlıydı ama hiç kullanılmıyordu.
- Beş türün beşine de aynı desenle zemin verildi. Ölçüldü: ihlal yok.

Görüntüler: p40-davet-bandi-{mac,duello,grup}-acik.png · -{mac,duello}-koyu.png · p40-toast-hepsi-390-acik.png

## C — Giriş sayfasındaki hata mesajı (1,49:1) 🔴 → düzeldi
**Değişen:** `src/styles.css:415-422`.
- `.hata-kutu` tabanı eski koyu temadan kalmaydı (#FCA5A5).
- Artık Şenlik açık tema değerleri tabanda: yazı **#B62F2F**, zemin **#FFE6E2**. Bunlar `.app` ve modal kuralıyla aynı renkler.

**Ölçüm:** "Misafir girişi şu an kapalı…" **1,49 → 5,14:1** (13 px). Görüntü: p40-giris-hata-390-acik.png

**Tarama:** `hata-kutu` 34 dosyada kullanılıyor.
- `.app` dışında kalan iki yer vardı: `Login.jsx` ve `BildimApp.jsx:88`. İkisi de artık tabandan düzeliyor.
- Aynı açık pembe renk `src/styles.css:2008` (`.bd-joker-not.hata`) kuralında da vardı; #B62F2F yapıldı.

## D — Düello'da sekme çubuğu + maçta üst çubuk 🔴 → düzeldi
**Değişenler:**
- `oyun/pages/DuelloPage.jsx:45,279`: `useOyunModu(d?.durum === "aktif")` eklendi.
- `src/styles.css:~2208`: `body.bd-oyun-modu .bd-ust-blok { display:none }`. Tek nokta: kancanın zaten koyduğu body sınıfı.

**Ölçüm** (maç sürerken `tabbar` / `.bd-ust-blok` / maçın kendi çıkışı):

| Mod | Alt çubuk | Üst çubuk | Kendi çıkışı |
|---|---|---|---|
| Klasik | gizli | gizli | X var |
| Saf Bilgi | gizli | gizli | X var |
| Düello (savunma) | gizli | gizli | "Düellodan çık" var |
| Düello (kategori seçimi) | gizli | gizli | var |
| Grup | gizli | gizli | yok (zaten yoktu → Paket 41) |
| Düello sonuç / Klasik sonuç | **geri geldi** | **geri geldi** | — |

- Turnuva ve dondurulmuş Hızlı Maç zaten aynı kancayı kullanıyor; body sınıfı ortak olduğu için üst çubuk kuralı onlarda da geçerli.
- Düello savunmasında jokerler artık görünüyor. Görüntü: p40-oyunmodu-duello-savunma-390-acik.png

## E — Portal katmanlarında birincil düğme (~2,1:1) → düzeldi
**Değişen:** `src/styles.css:129-139`.
- `.btn` tabanının yazısı turuncu dolgu üstünde artık `var(--bd-vurgu-ustu, #3A1A04)`, `text-shadow: none`.
- Kırmızı `.btn.tehlike` eski beyaz yazısını korudu.
- Yeşil `.btn.basari` koyu yeşil yazı aldı (`--bd-basari-ustu`).
- `.app` içindeki düğmeler zaten bu renkteydi; görünüşleri değişmedi.

**Ölçülen portal katmanları** (turuncu dolgunun iki ucuna göre):

| Katman | Birincil düğme | Kontrast |
|---|---|---|
| Rakip arama | Beklemeden bot ile oyna | **7,51 / 5,40:1** (önce ~2,1) |
| Düello tanıtım | İleri | **7,51 / 5,40:1** (önce ~2,1) |
| Yarım maç penceresi | Kaldığın yerden devam et | 7,51 / 5,40:1 |
| Joker satın alma | Al ve kullan | 7,51 / 5,40:1 |
| Profil kartı | Oyna | 7,51 / 5,40:1 |

- Öteki `createPortal` kullananlarda turuncu `.btn` yok: BildirimZili, Sis, SesliSohbet, SohbetKutusu, MacSonuSahnesi (coin uçuşu).
- MacSonuEklentisi `.app` içindeki eylem çubuğuna basıyor.
- Görüntüler: p40-portal-*.png

## F — Dükkândaki geliştirici metni → düzeldi
**Değişen:**
- `oyun/pages/JokerDukkani.jsx:352`: "Reklam kimliği tanımlı değil (test modu). Sahte ödül verilmez." → **"Şimdilik maç oynayarak ve günlük görevlerle coin kazanabilirsin."**
- İngilizce karşılığı `oyun/lib/dil.js`'te.
- Hemen üstündeki "Reklam şu an kullanılamıyor" düğmesi olduğu gibi duruyor.

**Tarama:** `test modu|sahte|TODO|FIXME|debug` ve çevrilen metinlerde `test|geliştirici|yapılandır|tanımlı değil|undefined|null`.
- Oyuncuya görünen geliştirici metni olarak **yalnız bu bir satır** çıktı.
- Öteki eşleşmeler ya kod yorumu (`JokerDukkani.jsx:133`, `QuestionCard.jsx:44`) ya da bilinçli metin: Gizlilik "sahte hesap", Koşullar "sahte istek".

## G — Turnuva saatleri → giriş metni tek kaynağa bağlandı; **varsayılana dokunulmadı, sana soruyorum**
**Canlı değer** (yalnız SELECT, `araclar/pg-mini.mjs`):

| Anahtar | Değer |
|---|---|
| `oyun_ayarlari.turnuva_saatleri` | `["10:00","12:30","15:00","18:00","20:00","22:00","24:00"]` (7 seans) |
| `turnuva_saat_sabah` | `"13:00"` (eski ayar) |
| `turnuva_saat_aksam` | `"21:50"` (eski ayar) |

**Karşılaştırma:**
- Kod varsayılanı (`oyun/lib/zaman.js:15`) canlı liste ile **birebir aynı**.
- **CLAUDE.md** ("13:00 ve 21:50, sabit") ve giriş sayfasının eski sabit metni canlıyla **uyuşmuyor**.
- Paketteki kural "uyuşmuyorsa söyle, kendin değiştirme" olduğu için:
  - G.2'yi **yapmadım**: varsayılanı 13:00/21:50 yapmak, canlı 7 seansla çelişen bir varsayılan olurdu.
  - Canlı değeri de değiştirmedim.

**Yapılan (G.1 + G.3):**
- `src/pages/Login.jsx:165` artık saatleri `zaman.js › turnuvaSaatleri()`'nden okuyor. Bu, oyunun geri kalanının kullandığı tek liste (`oyun_ayarlari.turnuva_saatleri` → Layout → zaman.js).
- Ölçüldü:
  - TR: "Her gün 7 turnuva: ilki 10:00, sonuncusu 24:00 (Türkiye saati)."
  - EN: "7 tournaments every day: the first at 10:00, the last at 24:00 (Türkiye time)."
- Giriş öncesi ayar okunamadığı için (RLS) giriş sayfası kod varsayılanını gösterir. Varsayılan bugün canlıyla aynı.

**❔ Senin kararın:** doğru olan hangisi?
- **(a)** Günde 7 turnuva (canlıdaki). Bu durumda CLAUDE.md ve AGENTS.md'deki "13:00 ve 21:50" satırları güncellenmeli.
- **(b)** Günde 2 turnuva (13:00 / 21:50). Bu durumda canlı `turnuva_saatleri` ayarı ve kod varsayılanı değişmeli; bu bir veri değişikliği, onayını bekler.

## H — Lig sekmeleri 390'da üst üste → düzeldi
**Değişen:**
- `oyun/pages/LeaderboardPage.jsx`: şerit ref + kaydırma ölçümü, `bd-lig-kapsam` sınıfı.
- `tema.css`: `.bd-lig-kapsam` yatay kayar, sekmeler büzülmez. Solma maskesi Paket 37 G'deki `bd-serit-solma` kuralı; seçici genişletildi, yeni desen yok.

**Ölçüm:**

| Genişlik | Durum |
|---|---|
| 390 | Beş sekme yan yana, **üst üste binen yok**, iç taşma yok; şerit kaydırılabilir, sağda 24 px solma var. Sona kaydırınca maske kalkıyor. Sayfada yatay taşma 0. |
| 360 | Aynı sonuç. |
| 1280 | Kaydırma yok, maske yok, sekmeler genişliği dolduruyor. |

Görüntüler: p40-lig-sekme-{390,360,1280}-acik.png · p40-lig-sekme-390-sonda-acik.png

## I — Çalışma turunda "undefined" → düzeldi
**Değişen:** `oyun/pages/CalismaPage.jsx`.
- `sayiMi()` yardımcısı eklendi.
- Dağılım cümlesi yalnız gerekli alanlar sayıysa çiziliyor.
- "n/m · k soru kaldı" sayacı toplam 0 ya da bilinmiyorsa çizilmiyor.

**Ölçüm:**

| Sunucu yanıtı | Ekranda |
|---|---|
| Alanlar eksik | Dağılım ve sayaç **çizilmedi** (önce: "Bu turdaki undefined sorunun…", "1/0 · 0 soru kaldı") |
| Tam banka | "Bu turdaki 10 sorunun hepsi bankandan." · "1/10 · 9 soru kaldı" |
| Karma | "Bankanda 4 soru var. Turu 6 yeni soruyla tamamladık." |
| Banka boş | "Bankan temiz — pratik turu: 10 yeni soru." |

**Güvenlik ağı:** `oyun/lib/dil.js` `t()` artık `undefined`/`null` değeri boş yazıyor, "undefined" ya da "null" yazmıyor. Birim denendi.

**Korumasız şablon değişkenleri** (sunucu alanı doğrudan `tt(...)` içinde; artık "undefined" yazmazlar ama boş kalabilirler):
- `CalismaPage.jsx:388` `sonucSoru.yeni_seri`
- `ChallengesPage.jsx:1127` `gm.oyuncu_sayisi`
- `DuelloPage.jsx:520` `d.tur`
- `DuelloPage.jsx:561,576,577,700,727` `rakip.gorunen_ad`
- `LeaderboardPage.jsx:218,262,404` `s/p.gorunen_ad`
- `MatchPage.jsx:763,802,805,890,1119` `rakipProfil?.gorunen_ad`
- `MatchPage.jsx:1030-1031` `ciftDurum.sira`
- `DavetBandi.jsx:113` `d.kisi_sayisi`
- `JokerCubugu.jsx:192,289` `durum.sinir / kullanilan`
- `KategoriProfili.jsx:78` `k.yuzde`
- `MacSorulari.jsx:46` `s.tur`
- `ModSecimPenceresi.jsx:71` `o.lig / o.coin`
- `OdulDokumu.jsx:39-40` `k.lig / k.coin`
- `UstalikIzgarasi.jsx:130` `s.sonraki_esik - s.dogru_sayisi` (ikisi eksikse `NaN`)
- `YarimMac.jsx:53` `mac.soru / mac.toplam`

Bunların boş durum/eksik veri davranışı Paket 41'in işi. Tek tek koruma eklemedim.

## J — Okunmayan yazılar → hepsi ≥ 4,5:1
**Değişenler:**
- `tema.css` sonunda "PAKET 40 J" bloğu.
- Satır içi renkler: `TournamentPage.jsx:674`, `GroupMatchPage.jsx:~386`.

| Yer | Metin | Önce | Sonra |
|---|---|---|---|
| Turnuva canlı bandı | "CANLI · 3 oyuncu hayatta · Soru 7/15" | 1,94 | **6,33** (#0F5F34) |
| Çalışma tur bandı | "ÇALIŞMA · PUAN VERİLMEZ" | 1,99 | **4,93** (#177A45) |
| Turnuva çipleri | "Sıla (5 doğru)" | 2,17 | **4,89** |
| Grup davet lobisi | "Hazır" | 2,17 | **4,89** |
| Meydan kategori | "0 soru · %0 çözüldü" | 2,34 | **5,92** (opaklık kaldırıldı) |
| Maç tabelası | "3/10" | 2,55 | **5,43** |
| Grup skor tablosu | kendi adın | 2,73 | **5,57** (#A8450C) |
| Profil rozetler | kilitli rozet açıklaması | 2,73 | **6,63** |
| Turnuva | "Elendin. Kalan oyuncuları…" | 2,75 | **5,20** (#B01F19) |
| Çalışma | "bankandan · 2 kez yanlış" | 2,82 | **6,30** |
| Çalışma | "Yanlış — Hatalarım'a eklendi" | 2,89 | **6,30** |
| Alt sekme | aktif "Ana Sayfa" | 2,92 (9,5 px) | **4,57** (11 px, #C4530F) |
| Alt sekme | pasif ("Arkadaşlar") | — | 4,77 (11 px) |

**Nasıl yapıldı:**
- **Maç tabelası:** geride kalan tarafın tamamı 0,62 opaklıkla soluyordu. Sönüklük artık yalnız avatar ve skorda. Rakip adı 3,87'den 11,91'e çıktı.
- **Kilitli rozet:** kartın opaklığı 0,65'ten **0,8**'e çıkarıldı, açıklama koyu metin yapıldı. Paket 37'deki "kilitli kart 0,65 kalsın" kararını bu madde için değiştirdi.
- **Sekme etiketleri 11 px:** taşma ölçüldü, taşan etiket yok:
  - TR: 320 / 360 / 390 px.
  - EN: 360 / 390 px.
  - 360 px'te "Arkadaşlar" önce taşıyordu; ≤374 px için iç boşluk ve harf aralığı daraltıldı (`tema.css` sonu).

**Aynı hata başka yerde de vardı — düzeldi:** satır içi `var(--success)` / `var(--danger)` yazı renkleri.
- Yerler: Meydan "Kazandın/Kaybettin" çipleri (`ChallengesPage.jsx` 3 yer), ana sayfa görev ödül çipi (`Home.jsx:699`), dondurulmuş `HizliMacPage.jsx:307`.
- Ölçüldü: "Kazandın" 4,89, "Kaybettin" 6,25.
- Paletin metin tonlarına çevrildi: `--bd-basari-metin` #177A45 / `--bd-hata-metin` #B01F19.

---

## Dokunulmayanlar ve nedeni
- **G.2 — kod varsayılanını 13:00/21:50 yapmak:** canlı 7 seansla çelişiyor; yukarıdaki (a)/(b) kararını bekliyor.
- **Meydan kategori kartının soluk hâli** (Düello modunda 1,42:1): kartın tamamı `.bd-sonuk` (0,45) ile pasif gösteriliyor. WCAG pasif öğeleri kontrast şartından muaf tutuyor. Opaklığı yükseltmek "düelloda kullanılmaz" ipucunu zayıflatır. İstersen Paket 42'de pasifliği opaklık yerine gri tonla gösteririz.
- **Son-5-sn filigranı** 1,62–1,98:1 (A'da açıklandı). Dekoratif, `aria-hidden`.
- **Koyu tema kontrastları, Gardırop/Meydan 3B, ekonomi değerleri, boş/hata durumları, kozmetik yerleşim:** paketin "yapılmayacaklar" listesi.
- **Grup ve Turnuva maçında çıkış düğmesi:** D'nin tablosunda "yok" görünüyor; Paket 41 kapsamı.

## Not — düzenekte bulunan ama hata olmayan
- İngilizce tarayıcı + Türkçe profil tercihiyle sayfa sürekli yenileniyor gibi göründü.
- Sebep: test düzeneği her yüklemede `bildim_dil=en` yazıyordu.
- Düzenek bunu yapmayınca ölçüldü: tek yeniden yükleme, sonra sabit (`lang=tr`). Uygulama hatası değil.
- Yan etki: sunucu testlerinden `npm run test:kurallar` bir kez çalıştı. Canlıya bağlanıyor ama her şeyi geri alıyor ("ROLLBACK edildi — canlı veri değişmedi"); 13/13 geçti.

## Senin telefonda bakman gerekenler
- Maç başında 3-2-1 perdesi ve son 5 saniyedeki turuncu sayı.
- Gelen bir davetin bandı (meydan okuma sarı, düello turuncu-kırmızı, grup mavi).
- Düello maçında jokerlerin görünmesi; maçta üst ve alt çubuğun gizlenmesi.
- Lig sekme şeridini kaydırmak.
