# Supabase yük azaltma — 2 Ekim 2026

**Durum (panel, 2 Eki):** "Exceeding usage limits". Önbellekli veri çıkışı (cached egress) 10,4 GB / 5 GB
(günlük pik ~2,7 GB) · normal egress 1,75 / 5 GB · Realtime 134 bin mesaj · DB 112 MB · disk IO bütçesi
bitmek üzere · bellekte swap · sunucu t4g.nano. Kota 12 Ekim'de yenilenir.
**Karar (Ida):** ücretli plan yok; ücretsiz planda akıcı çalışacak şekilde yük azaltılır. Müzik Supabase
Storage'da KALIR (parçalar `/ses-secim` üzerinden dağıtımsız değişecek).

**Bu işte canlıya dokunan her şey:** 1 Storage liste isteği + 3 HEAD isteği · 2 salt-okunur SQL (cron.job,
pg_stat_statements ilk 15) · migration 850 provası (rollback) ve uygulaması. Playwright, ekran ölçümü, test
hesabı, yük testi ÇALIŞTIRILMADI; hiçbir müzik dosyası indirilmedi. Aşağıdaki "tahmini" değerler koddan ve
bu ölçümlerden türetildi, canlıda ölçülmedi.

---

## A. Önbellekli egress — müzik

### Ölçüm

| | |
|---|---|
| `muzik` kovası (kök) | 22 tam parça, **27,3 MB** (459 KB – 3,28 MB; ortalama 1,30 MB), hepsi `audio/aac` |
| `muzik/onizleme/` | 10 önizleme (liste isteği yalnız klasörü döndürdü; boyut ölçülmedi, ~360 KB × 10 tahmin) |
| Kayıtlı önbellek ayarı (liste) | `max-age=31536000` (22 dosyanın hepsi) |
| HEAD cevabı (3 dosya) | 200 · `Cache-Control: no-cache` · `cf-cache-status: MISS` · `accept-ranges: bytes` · ETag var · CORS `*` |

HEAD cevabındaki `no-cache`, kayıtlı `max-age=31536000` ile çelişiyor. GET cevabının başlığı ÖLÇÜLMEDİ (indirme
yasaktı). GET de `no-cache` dönüyorsa tarayıcı önbelleği parçayı hiç "taze" saymıyor demektir; bu, aşağıdaki
yeniden indirmeleri açıklar. Service worker önbelleği bu başlığa bakmadığı için düzeltme bundan bağımsız çalışır.

10,4 GB ÷ 1,30 MB ≈ **8.000 tam parça indirmesi** (müzik 24 Eyl'de eklendi → ~9 günde, günde ~890; pik günde ~2.080).
Oyunda 12 insan hesabı var. Bu sayı gerçek oyuncularla açıklanamaz.

### Statik analiz: ne, ne zaman, kaç kez iniyordu (`oyun/lib/sesArkaPlan.js`)

- **Önyükleme:** çalma listesinin tamamı İNMİYORDU; yalnız çalan parça ve sıradaki (geçiş anında). Ama her
  `<audio>` `preload="auto"` idi: adres verilir verilmez tarayıcı dosyanın tamamını çekiyordu.
- **Oda başına indirme:** üç oda var (menü · maç · turnuva lobisi). Odaya HER girişte rastgele bir parça baştan
  başlıyor; odadan çıkınca oynatıcı bırakılıp indirme kesiliyor. Menü → maç → menü = 2 parça isteği; bir maç
  oturumunda (menü, arama, maç, sonuç, menü) 3–4 istek, artı her parça bitişinde 1.
- **Aynı parça aynı oturumda kaç kez:** sınır yoktu. Tarayıcı HTTP önbelleği tutmazsa (Range isteği + `no-cache`
  olasılığı; iOS Safari medya dosyasını disk önbelleğine güvenilir yazmaz; yarıda kesilen indirme önbelleğe
  girmez) aynı parça her oda girişinde yeniden iner.
- **Gizli sekme:** çalma duruyordu ama gizliyken başlatılan parçanın adresi verildiği için dosya iniyordu.
- **Müzik kapalı / ilk dokunuştan önce:** hiçbir şey inmiyordu (doğru).
- **Otomasyon:** Playwright araçları (`oyuncu-testi`, `arayuz-denetim` 16 sayfa × 7 genişlik, ekran ölçüm
  betikleri) her koşuda BOŞ önbellekle açılıyor ve ilk tıklamadan sonra müzik başlıyor: sayfa yüklemesi başına
  en az 1 parça. PROGRESS'te günde onlarca koşu kayıtlı. **En büyük kaynağın bu olduğu tahmin ediliyor**
  (kanıt: indirme sayısı / insan hesabı oranı; doğrudan ölçülmedi).

### Yapılan (commit `3753501c`)

1. `preload="none"`; adres ancak ÇALMA anında verilir → gizli sekmede başlayan parça görünür olana dek inmez.
   Müzik kapalıyken ve ilk dokunuştan önce yine hiçbir şey inmez. Çalma listesinin kalanı önyüklenmez (eskisi gibi).
2. **Service worker kalıcı önbelleği** (`public/sw.js`, önbellek `qt-muzik-v1`): `…/muzik/<ad>-<10 hane sha>.aac`
   istekleri cihazda saklanır. Parça BİR kez (Range'siz, tam) iner; sonraki her istek — `<audio>`'nun Range
   istekleri dahil — önbellekten 206 dilimiyle cevaplanır. Yarıda bırakılan parça da önbelleğe girer.
   **Anahtar dosya adıdır:** `/ses-secim`'de seçim değişince yeni ad önbellekte yoktur, indirilir; eski parça yeni
   adın yerine çalmaz. Sınır 14 parça (3 oda × 4 + pay), aşılınca en eski silinir. Önbellek sürümü kabuk sürümüyle
   birlikte ARTIRILMAZ. Hata olursa istek olduğu gibi ağa gider (eski davranış).
   Çalma listesi seçimleri eskisi gibi sunucudan okunur (`ses_secimleri_oyun`, sürümlü).
3. **Otomasyon tarayıcısında müzik inmez** (`navigator.webdriver`). Müziği ölçmek isteyen test tanı bayrağıyla
   açar (`?tani=1` / `bd_ses_tani`).
4. Taban adres tek yerde: `oyun/lib/muzikParcalari.js › KOVA` ("ileride Vercel/CDN'e taşınabilir tek satır").
   SW deseni aynı kökenli `/muzik/…` adresini de tanır.
5. Birim testi: `node oyun/_test/sw-muzik-testi.mjs` (11 test, taklit `caches`/`fetch`, ağ yok).

**Bilinen yan etki:** bir parçanın o cihazdaki İLK çalınışında ses, dosyanın tamamı inince başlar (0,5–3,3 MB;
iyi bağlantıda ~1 sn, zayıf bağlantıda daha uzun). Sonraki çalışlar anında. Tek indirme için bilerek seçildi.

**Seçenek kararı:** toplam 27,3 MB ≤ 40 MB olduğundan görev tanımındaki Seçenek 1 (Vercel'e taşıma) uygundu;
Ida Storage'da kalmasını istedi (seçimler dağıtımsız değişecek) → Seçenek 2 uygulandı. Kovadaki dosyalara
dokunulmadı.

### Tahmini etki

| | Önce | Sonra (tahmin) |
|---|---|---|
| Cihaz başına | her oda girişinde 0,5–3,3 MB | parça başına ömür boyu 1 kez; çalma listesi ≤ 12 parça ≈ ≤ 16 MB, seçim değişene dek |
| Otomasyon koşusu | sayfa yüklemesi başına ≥ 1 parça | 0 |
| Günlük cached egress | ort. ~1,15 GB, pik 2,7 GB | **< 0,1 GB/gün** (12 hesap; yeni cihaz/yeni seçim günlerinde biraz fazla) |

### Diğer Storage / Edge çağrıları

- `avatarlar` kovası: istemcide okuma/listeleme yok; yükleme yalnız dondurulmuş iki sayfada. Güncel avatarlar
  yerel SVG. Eski kayıtlarda kovaya işaret eden avatar adresi kalmış mı ÖLÇÜLMEDİ.
- `satin_alma_dogrula`: yalnız Play satın almasında, satış kapalı. `send-push`, `generate-questions`: istemciden
  çağrılmıyor. Sık/gereksiz çağrı bulunmadı; değişiklik yok.

---

## B. İstemci yoklamaları

Tam envanter statik analizle çıkarıldı. İstek/dk değerleri koddan türetilmiş tahmindir (tek görünür sekme).

| Döngü | Aralık | Çağrı | Gizli sekmede durur | Temizlik | Geri çekilme | Karar |
|---|---|---|---|---|---|---|
| `AuthContext` nabız | 60 sn | `kalp_at` | evet | evet | yok | dokunulmadı |
| `RakipAra` kuyruk | ~3 sn (ayar) | `kuyruga_gir` | hayır | evet | zincir | dokunulmadı (eşleşme akışı) |
| `RakipAra` son çare | 1 sn | `quick_match` | hayır | evet | yok | **üst üste binme koruması** |
| Düello araması | 1 sn, ≤ 60 sn | `duello_ara` | hayır | evet | yok | **üst üste binme koruması** |
| Grup araması | 1 sn, sınırsız | `grup_ara` | hayır | evet | yok | **üst üste binme koruması** |
| `useMacNabiz` | 3 sn | `mac_nabiz` / `grup_mac_nabiz` | evet | evet | yok | **bitti/iptal maçta durur**; maç içinde aynen |
| Klasik yedek yoklama | 6 sn (kanal yoksa 2 sn) | `matches` select | hayır | evet | yok | dokunulmadı (maç akışı) |
| Soru çekme | 0,9–3,6 sn, ≤ 5 deneme | `get_*_question` | hayır | evet | var | dokunulmadı |
| Düello yedek yoklama | 4 sn (kanalsız 1 sn) | `duello_durum`, 5 sn `duello_baglanti` | evet | evet | 1→2→4→8 sn | dokunulmadı |
| Düello nabız | 10 sn | `kalp_at` | evet | evet | yok | dokunulmadı |
| Grup ilerletme | 2,5 sn (cevaptan sonra) | `advance_group_match` + select | hayır | evet | yok | dokunulmadı (maç akışı) |
| Turnuva oyuncu tazele | 1,5 sn kısıtlı | `tournaments` + `tournament_players` | hayır | evet | — | dokunulmadı (maç akışı) |
| Ana sayfa turnuva şeridi | 30 sn (yalnız canlıyken) | `tournaments` + sayım | hayır → **evet** | evet | yok | **gizli sekmede durur** |
| Ana sayfa "devam eden maçlar" | olay başına | 4–6 sorgu | hayır → **evet** | evet | — | **3 sn'ye toplandı, turnuvada yalnız kendi satırım** |
| Kanal yeniden kurma (Klasik, Grup, Turnuva) | 2 sn sabit | kanal kapat/aç | — | evet | yok → **2-4-8-16-30 sn** | **geri çekilme eklendi** |
| `LeaderboardPage` 60 sn | — | Supabase çağrısı YOK (yalnız sayaç) | — | — | — | — |
| `cevrimici.js` | — | zamanlayıcı yok, yalnız presence | gizlenince çıkar | evet | — | dokunulmadı |

**Dondurulmuş modüller:** Meydan/harita, gardırop, Hızlı Mod, "Hızlı Olan Kazanır" sayfaları mount OLMUYOR
(rotalar `BulunamadiPage`'e gider, tembel modül inmez). Tek sızıntı: `/meydan` sayfası bayrak kapalıyken de
`hizli_maclar`'ı 2 sorguyla okuyup 1 kanal açıyordu → kapatıldı.

### Yapılan (commit `8577df19`)

| Değişiklik | Tahmini etki |
|---|---|
| Ana sayfa `useDevamEdenMaclar`: Realtime/odak/görünürlük olayları tek okumaya toplanır (en az 3 sn arayla), gizli sekmede okumaz; `tournament_players` yalnız kendi satırım | Canlı turnuvada boşta ana sayfa: (5 × turnuvadaki her cevap) istek/dk → en çok ~100 istek/dk, pratikte ~0 (kendi satırım değişmedikçe). Sekmeye dönüşte 2 okuma → 1 |
| Biten/iptal maçta nabız yok (Klasik, Grup) | Sonuç ekranı açık kaldıkça 20 istek/dk → 0 (Grup'ta her nabız bir satır yazıyordu) |
| Arama yoklamalarında üst üste binme koruması (`quick_match`, `duello_ara`, `grup_ara`) | Sunucu yavaşken istek birikmez; hızlıyken davranış aynı (60 istek/dk) |
| Kanal yeniden kurmada geri çekilme (2→30 sn) | Realtime yokken 30 kur/yık/dk → 2/dk |
| Coin: aynı tikte başlayan okumalar tek istek | Ana sayfa ve dükkânda açılış + her `coinTazele` başına 2 → 1 |
| Görevler: sekme dönüşünde en çok dakikada 1 okuma | `gorevlerim` ölçülen ortalama 598 ms / 647 blok okuma; sekme değiştirme başına 1 çağrı azalır |
| Joker fiyat listesi 10 dk önbellek | Maçta soru başına 4 → 3 RPC (20 soruda 20 istek az) |
| Ana sayfa turnuva şeridi gizli sekmede yoklamaz | Arka planda bırakılan sekme: 4 istek/dk → 0 |
| `/meydan`: dondurulmuş hızlı maç okuması + kanalı kapalı | Sayfa açılışı başına 2 sorgu + 1 kanal az |

Maç içi akış (cevap gönderme, tur/faz geçişi, süreler, Düello 2 sn tiki, 3 sn maç nabzı) DEĞİŞMEDİ.

### Yapılmayan ve nedeni

- **Arama yoklamalarını gizli sekmede durdurmak / seyreltmek:** eşleşme sunucuda her çağrıda ilerliyor; kuyruk
  süresini ve bot devreye girme anını değiştirir (ürün kararı).
- **Düello sonuç ekranı** (`duello_durum` 4 sn + `duello_baglanti` 5 sn + `kalp_at` 10 sn, ~34 istek/dk, süresiz):
  rövanşın sinyalle mi yoklamayla mı geldiği doğrulanamadı.
- **Klasik davet bekleme ekranında** yoklama (10–30 istek/dk): `bekliyor` durumunda hazır kapısı nabza bağlı.
- **Turnuva sayfası 1,5 sn tam liste okuması** ve **Grup 2,5 sn ilerletme:** maç akışı.
- **`JokerCubugu`'nun kalan 3 RPC'si** (envanter, maç durumu, coin): joker kullanımıyla değişir.
- **Uygulama geneli 6 Realtime kanalı** (2'si aynı `bildirimler` INSERT'ini dinliyor) ve **Arkadaşlar sayfasında
  arkadaş başına presence kanalı (≤ 50):** birleştirme riskli; Realtime kotası sorun değil (134 bin mesaj).
- **Ana sayfanın her açılışında önbelleksiz 15–17 istek** (`lig_grubum_ozet`, `yanlis_bankam`, `seri_durumum`…):
  her biri ayrı tazelik kuralı ister; ayrı iş.

---

## C. Sunucu — zamanlanmış işler ve disk IO

### Ölçüm (cron.job, 28 iş; 1'i pasif)

| İş | Zamanlama | Komut | Boşta koşu/gün | Boşta-çık kapısı |
|---|---|---|---|---|
| `duello_tik` | 15 sn (iş varken 2 sn) | `cron_duello_tik()` | 5.760 | var (830) |
| `bildim-bot-oyna` | 15 sn (iş varken 2 sn) | `cron_bot_oyna()` | 5.760 | var (830; **850'de daraltıldı**) |
| `bildim-turnuva-zamanlayici` | dakikada 1 | `cron_turnuva_zamanlayici_tik()` | 1.440 | var (830) |
| `bildim-bot-turnuva-tik` | dakikada 1 | `cron_bot_turnuva_katilim_tik()` | 1.440 | var (830) |
| `bildim-gizli-bot-nabiz` | dakikada 1 | `gizli_bot_nabiz()` → **`cron_gizli_bot_nabiz()`** | 1.440 | **yoktu → 850** |
| `bildim-turnuva-ilerlet` | dakikada 1 | `advance_due_tournaments()` | 1.440 | gövde zaten tek ucuz SELECT |
| `bildim-sezon-tik` | 5 dk | `cron_sezon_tik()` | 288 | var (830) |
| `bildim-bot-puan-tik` | 10 dk | `bot_puan_tik()` | 144 | yok — her koşu iş yapar (aşağıda) |
| `bildim-turnuva-lobi-bot` | 10 dk | `turnuva_lobi_botlari()` | 144 | erken çıkış var |
| saatlik 4 iş (budama, eski davet, yarım maç, bot arkadaşlık) | saatte 1 | — | 96 | yalnız eşleşen satırı yazar |
| günlük/haftalık 13 iş | — | — | ~15 | — |
| `bildim-ikram-zaman-asimi` | dakikada 1 | — | 0 | **pasif** |

Boşta toplam ≈ **17.950 koşu/gün** (830/831 öncesi ~92.600). Zamanlamalara dokunulmadı.

### pg_stat_statements (toplam süreye göre ilk 15)

İstatistik penceresi kısa: `bot_puan_tik` 3 çağrı göründüğüne göre sayaçlar ~25–30 dk önce sıfırlanmış
(çıkarım). Bu pencerede:

| Sorgu | Çağrı | Toplam ms | Ort. ms | Not |
|---|---|---|---|---|
| Realtime WAL okuma (`wal->>…`) | 2.745 | 25.448 | 9,3 | Realtime'ın kendi yoklaması; yayınlanan tablolardaki her yazma buraya yük |
| `gorevlerim` | 20 | 11.968 | 598 | 647 blok diskten okuma |
| panel sorguları (`pg_timezone_names`, eklenti listesi, migration listesi, tip listesi) | 13 | ~15.900 | 370–1.840 | Supabase panelinin açık olmasından; basit sorgular bile 1–2 sn = sunucu boğuluyor |
| `lig_grubum_ozet` | 12 | 3.809 | 317 | |
| `yanlis_bankam` | 13 | 2.875 | 221 | |
| Realtime abonelik kurma | 217 | 2.787 | 12,8 | 273 KB WAL |
| `kalp_at` | 28 | 2.683 | 95,8 | her çağrı yazar: 125 KB WAL (≈ 4,5 KB/çağrı) |
| `coin_bakiyem` | 43 | 2.658 | 61,8 | |
| `bot_puan_tik` | 3 | 2.283 | 761 | 947 blok okuma, 119 kirli blok, 304 KB WAL (≈ 100 KB/koşu) |
| `bekleyen_davetlerim` | 21 | 2.167 | 103 | |
| `cron_bot_turnuva_katilim_tik` | 24 | 1.637 | 68 | 65 KB WAL (lobiye bot ekliyor) |
| `gonderdigim_davetler` | 12 | 1.597 | 133 | |

`cron_duello_tik`, `cron_bot_oyna`, `gizli_bot_nabiz`, `advance_due_tournaments`, `cron_turnuva_zamanlayici_tik`
ilk 15'te YOK: boştayken ucuzlar.

### Yapılan — migration `20260612000850_cron_bosta_cik_ek.sql` (prova + canlıya uygulandı, commit `d6819ae4`)

Asıl fonksiyonlar ve zamanlamalar değişmedi (830'daki sarmalayıcı deseni).

1. **`cron_bot_oyna()` kapısı daraltıldı:** `matches.durum = 'bekliyor'` her bekleyen daveti iş sayıyordu.
   `bot_oyna` bekleyen 1v1 davetle yalnız davet edilen bot ise ilgilenir. İnsana giden yanıtsız bir davet işi
   24 saate kadar 2 sn'de tutuyordu. Etki: böyle bir davet olan günde 43.200 → 5.760 koşu ve 21 KB'lik
   `bot_oyna` gövdesi hiç çalışmaz.
2. **`cron_bot_oyna()` kapısına bot tepki kuyruğu eklendi** (`bot_tepki_bekleyen`, 673): maç bitince kuyrukta
   kalan gecikmeli bot tepkisi/mesajı kapı yüzünden bir sonraki maça kadar gönderilmiyordu (830'dan beri hata).
3. **`cron_gizli_bot_nabiz()`:** gizli botun nabız atacağı hiçbir yer yoksa (nöbet, maç, düello, grup, hızlı maç,
   turnuva lobisi/maçı) çıkar; varsa asıl `gizli_bot_nabiz()` aynen çalışır. Kapı, asıl koşulların üst kümesidir.
   Etki: turnuva lobisinde bot yokken (günde ~14 saat) 155 bot × 6 alt sorguluk tarama yapılmaz. Yazma azaltmaz
   (asıl fonksiyon o saatlerde zaten 0 satır yazıyordu) — CPU/bellek kazancı.

Canlıya uygulandıktan sonra doğrulama sorgusu ÇALIŞTIRILMADI (izinli okumalar tükenmişti); `migration-uygula`
"Uygulandı" döndü. Geri alma SQL'i dosyanın başında.

### Sık çalışan işlerin her seferinde yazdığı yerler (rapor — değiştirilmedi)

| Kaynak | Yazma | Neden dokunulmadı |
|---|---|---|
| pg_cron'un kendisi | her koşu `cron.job_run_details`'e 1 INSERT + 1 UPDATE ve yeni bir bağlantı: boşta ~36.000 yazma/gün | Azaltmanın tek yolu koşu sayısını düşürmek = zamanlama değişikliği (yasak). `cron.log_run` kapatılamıyor (sunucu ayarı) |
| `gizli_bot_nabiz` | lobi açıkken (günde ~10 saat) lobideki her gizli botun `profiles.last_seen`'i dakikada 1 | Davranış: botun "çevrimiçi" görünmesi. Öneri: son X dakikada aktif insan yoksa yazma (ürün kararı) |
| `bot_puan_tik` | 10 dk'da bir ~100 KB WAL: bot lig puanı + kategori istatistiği + tempo satırı | Lig tablosunun "canlı" görünmesi. Öneri: 10 dk → 30 dk (aynı toplam puan, üçte bir koşu) ya da tembel hesap (ürün kararı) |
| `kalp_at` (istemci) | her çağrı ~4,5 KB WAL; oturum başına dakikada 1, Düello'da 10 sn'de 1 | Kopukluk tespiti buna bağlı |
| `grup_mac_nabiz` | her nabızda oyuncu satırı yazar (3 sn) | Maç akışı; biten maçta artık çağrılmıyor (B) |
| `cron_bot_turnuva_katilim_tik` | lobi dolarken bot satırı ekler | Tasarım gereği |
| Realtime | yayınlanan tablolardaki her yazma WAL'dan ayrıca okunur (ilk sıradaki sorgu) | Yayın listesi ölçülmedi; `profiles` yayındaysa yukarıdaki üç yazma iki kez maliyetli |

---

## 12 Ekim'den sonra (kota yenilenince) yapılacak ölçümler

1. Panel: günlük **cached egress** (hedef < 0,1 GB/gün) ve disk IO bütçesi grafiği, 3 gün üst üste.
2. Bir müzik dosyasına tek baytlık `GET` (`Range: bytes=0-0`) ile **GET `Cache-Control`** başlığı;
   `no-cache` ise dosyaların `max-age` ile yeniden yüklenmesi (yazma izni gerekir — Ida'ya sorulur).
3. Gerçek tarayıcıda (Chrome + sahibinin iPhone'u) müzik: ilk çalış, ikinci çalışta ağ isteği 0, oda değişimi,
   `/ses-secim`'de seçim değişince yeni parçanın inmesi, DevTools › Application › Cache Storage › `qt-muzik-v1`.
4. `select jobname, schedule, command from cron.job where jobname in ('bildim-gizli-bot-nabiz','bildim-bot-oyna','duello_tik')`
   → komutlar `cron_*`, boşta aralık 15 sn.
5. `cron.job_run_details`: son 6 saatte iş başına koşu sayısı, hata, "job startup timeout" sayısı.
6. `pg_stat_statements` ilk 15 (24 saatlik pencereyle): `gorevlerim`, `kalp_at`, `bot_puan_tik`, Realtime WAL.
7. `select * from pg_publication_tables where pubname = 'supabase_realtime'` → `profiles` ve sık yazılan tablolar
   yayında mı.
8. `avatarlar` kovasına işaret eden `profiles.avatar_url` var mı (tek sayım sorgusu).
9. `node araclar/arayuz-denetim.mjs` ve `oyuncu-testi.mjs` (Klasik + Düello + Grup): maç akışı, biten maçta
   `mac_nabiz` isteği olmadığı, ana sayfa "devam eden maç" kartının ≤ 3 sn'de gelmesi.
10. Bota karşı maç sonunda bot tepkisinin/mesajının gelmesi (850, madde 2).
