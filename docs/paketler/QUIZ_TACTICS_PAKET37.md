# QUIZ TACTICS — PAKET 37: CANLI GEZİNTİDEN ÇIKAN DÜZELTMELER

19 Eyl 2026'da canlı sitede oynanarak bulunan sorunlar. Hepsi küçük ve bağımsız.
**Sırayla yap, her madde ayrı commit + push.**

## Değişmezler
- **SQL değişikliği YOK, migration YOK.** Bu paket tamamen arayüz.
- Mevcut kodu silme. Var olan mantığa dokunma, yalnız belirtilen satırları değiştir.
- Yeni npm paketi yok. localStorage anahtarlarını yeniden adlandırma.
- Tasarım dili: vurgu `--bd-vurgu` (#F4701F), kart gölgesi `0 4px 0`,
  basılınca `translateY(4px)`, WCAG AA, `prefers-reduced-motion` içinde animasyon kapalı.
- Her yeni/değişen düğmenin dört hali tanımlı olacak: normal / basılı / pasif / çalışıyor.

## ÖNEMLİ BAĞLAM — OKUMADAN BAŞLAMA
Şu an bütün hesaplarda **10.000 coin** var. Bu **geçicidir**, yalnız jokerleri test
etmek için verildi, yayından önce silinecek. Bu pakette **ekonomiyle ilgili hiçbir
şeyi değiştirme** — fiyat, ödül miktarı, davet ödülü, coin paketi, reklam ödülü:
hiçbirine dokunma, "az/çok" diye yorum yapma.

---

## A — KİLİTLİ ROZETLER GERÇEK HALİYLE GÖRÜNSÜN

**Sorun:** Profil › Rozetler'de kazanılmamış rozetler düz bir asma kilit ikonu
gösteriyor. Oyuncu ne kazanacağını göremiyor.

**Ölçüldü:** `oyun/pages/ProfilePage.jsx:407`
```jsx
<div className="rozet-ikon">{var_mi ? r.ikon : <Ikon ad="kilit" boyut={18} />}</div>
```
`badges.ikon` bir metin kolonu ve içinde emoji duruyor (`🏅`, `🎖️`, `🔥`, `⚡` —
bkz. `20260612000008_dalga2.sql:187`). Yani kilitli rozetin gerçek ikonu zaten elimizde.

**Yapılacak:**
- İkon **her zaman** `r.ikon` olsun.
- Kilitli olanın ikonu `filter: grayscale(1)` + `opacity: .55` ile solsun.
- İkonun **sağ alt köşesine** küçük bir kilit rozeti otur (12px, beyaz daire zemin,
  `--text-dim` renginde kilit, 1px beyaz kenarlık). `Ikon ad="kilit" boyut={9}`.
- `src/styles.css:467`'deki `.rozet.kilitli { opacity: 0.65; }` **kalsın** —
  açıklama metninin kontrastı için oraya bilerek konmuş (yorumda yazıyor). Sadece
  ikona ek grayscale gelsin, kartın geneline dokunma.
- Kazanılmış rozette kilit rozeti hiç çizilmesin.

**Kabul şartı:** Kilitli "Kusursuz" rozetine bakınca hangi ikonu kazanacağını
görebiliyor olacaksın, ama kazanılmış olanlardan bir bakışta ayırt edilecek.

---

## B — LİG ÇERÇEVELERİ BİRBİRİNDEN AYRILSIN

**Sorun:** Profil'deki "Lig çerçevelerim" bölümünde Gümüş / Altın / Elmas / Efsane
seçenekleri bir bakışta aynı görünüyor.

**Ölçüldü — renkler ASLINDA var**, `oyun/styles/tema.css:5416-5419`:
```
gumus  --lc-ic #A9B8C6 / --lc-dis #6F8296
altin  --lc-ic #FFC53D / --lc-dis #C98A22
elmas  --lc-ic #5BD1F5 / --lc-dis #2A8CC4
efsane --lc-ic #B86BFF / --lc-dis #F4701F
```
Sorun renk değil **okunabilirlik**: `LigCerceveSecici.jsx:63` çerçeveyi 48px'te
çiziyor, halka çok ince kalıyor ve dördünde de aynı avatar tekrar ettiği için
gözle ayrışmıyor.

**Yapılacak:**
- Seçicideki çerçeve boyutu 48 → **56px**.
- Seçicide halka kalınlığı artsın: iç renk 3px → **4px**, dış ton 2px → **3px**.
  **Yalnız seçici içinde** (`.bd-lig-cerceve-secici` altında). Lig tablosundaki,
  maç ekranındaki ve küçük avatarlardaki çerçevelere **dokunma**.
- Her seçeneğin altındaki ad (`Gümüş`, `Altın`…) `font-weight: 800` olsun ve
  o ligin `--lc-dis` renginde yazılsın — ad ile çerçeve aynı rengi taşısın.
- Kilitli olanın "🔒 lig atla" etiketi kalsın; çerçevenin rengi kilitliyken de
  görünmeye devam etsin (zaten öyle, bozma).

**Kabul şartı:** Dört çerçeve yan yanayken hangisinin hangisi olduğu okumadan anlaşılacak.

---

## C — OKUNMUŞ BİLDİRİMLER BİRİKMESİN

**Sorun:** Zile basınca aynı satır üst üste çıkıyor — "sila sana meydan okudu!"
dört kez, hepsi 1 gün önce.

**Ölçüldü — mevcut kod SANDIĞINDAN İYİ.** `oyun/components/BildirimZili.jsx`:
- `grupla()` (satır ~66) tekrarları tek satıra indiriyor, **ama yorumunda da yazdığı
  gibi yalnız OKUNMAMIŞLARI**: satır 71 `if (b.okundu || !TOPLAMA[b.tip]) continue;`
- Satırlar zaten tıklanabilir (`b.yol` ile `navigate`), zilde okunmamış rozeti var,
  `oncelikSirala()` okunmamışları üste alıyor.

Yani eksik olan tek şey: **okunmuş tekrarlar hiç toplanmıyor ve hiç eksilmiyor**,
panel zamanla aynı satırın kopyalarıyla doluyor.

**Yapılacak — mevcut mantığı bozmadan:**
1. `grupla()` içindeki toplamayı okunmuşlara da uygula, **ama okunmuş ve okunmamışı
   ASLA aynı satırda birleştirme.** İki ayrı grup çıkar:
   - okunmamışlar → bugünkü davranış (aynen kalsın)
   - okunmuşlar → kendi aralarında, aynı `tip` için tek satır: metin
     `TOPLAMA[tip].metin(n)`, `okundu: true`, id `toplu-okundu-${tip}`.
2. `TOPLAMA` sözlüğüne bakıp eksik tür var mı kontrol et. Listede
   `mac_daveti · rovans · grup_daveti · hizli_daveti · sira_sende · seri · arkadas_istek`
   var. Canlıda gördüğüm tekrar eden bildirim **meydan okuma**ydı; hangi `tip`
   değeriyle yazıldığını `bildirim_yaz` çağrılarından bul. `TOPLAMA`'da yoksa **ekle**
   (metin: `"{0} meydan okuma"`, yol: `/meydan`). Yeni tür uydurma — koddan doğrula.
3. Paneldeki okunmuş satır sayısını sınırla: **en fazla son 20 okunmuş satır**
   gösterilsin, gerisi çizilmesin. Silme yok, sadece gösterilmiyor.

**Dokunma:** okunmamış gruplama mantığı, `ONCELIK` sıralaması, zil rozeti,
`dmOkunmamis` mesaj satırı, Realtime aboneliği.

**Kabul şartı:** Aynı kişiden dört kez meydan okunmuş ve hepsi okunmuşsa panelde
tek satır görünecek; okunmamış bir davet varsa o ayrı ve üstte duracak.

---

## D — MAÇ SONU: GÜNLÜK GÖREV YÜZEYE, DETAY ÇUBUĞUN ALTINDA KALMASIN

### D.1 — Günlük görev ilerlemesi Detay'dan çıksın
**Sorun:** Maçı kaybedince ekranda hiçbir kazanım görünmüyor; günlük görev
ilerlemesi (`3/3`, `2/5`, `25/25`) Detay'ın içine gömülü. Oyuncu eli boş çıkıyor.

**Yapılacak:** `MacSonuSahnesi`'nde ödül hapları satırının altına, **Detay'ın
üstüne**, günlük görev ilerlemesi gelsin.
- Kaynak: `OdulDokumu`'nun zaten okuduğu döküm. Yeni RPC yazma — `OdulDokumu`'ya
  `onGorevler` gibi bir geri çağırma ekleyip günlük görev kalemlerini sahneye ver
  (Paket 36'da `onDokum`/`onToplam` için aynı desen kullanılmış, onu takip et).
- Görünüm: en fazla **iki** satır (en çok ilerlemiş ikisi). Her satır:
  görev adı (12px) + ince ilerleme çubuğu + `n/m` (12px kalın).
  Çubuk: 4px yükseklik, `border-radius: 999px`, dolu kısım `--bd-vurgu`,
  boş kısım `--bd-vurgu` %15 opaklık.
- Tamamlanmış görevde (`3/3`) çubuk dolu + sonunda küçük onay ikonu.
- Hiç görev ilerlemediyse bu blok **hiç çizilmesin** (boş kutu gösterme).
- Sekansta **5. adımla birlikte** (1.050 ms) girsin, ödül haplarıyla aynı anda.
- Kazanmada da görünsün — yalnız kaybetmeye özel değil.

### D.2 — Detay içeriği eylem çubuğunun altında kalıyor
**Sorun:** "Detay"ı açınca en alttaki kart, yapışkan eylem çubuğunun arkasına giriyor.

**Yapılacak:** Detay gövdesinin altına, eylem çubuğunun yüksekliği kadar boşluk
bırak. Paket 36 zaten `--mss-eylem-alt` değişkeniyle çubuğun konumunu ölçüyor;
aynı ölçüyü `padding-bottom` olarak kullan, sabit sayı yazma.

---

## E — "VAZGEÇ" İKİNCİL DÜĞME OLSUN (İKİ YER)

**Sorun:** Vazgeçme, ekrandaki en dikkat çeken düğme durumunda.

1. `oyun/components/ModSecimPenceresi.jsx` — alttaki "Vazgeç" kocaman dolu turuncu.
2. `oyun/components/JokerSatinAlModal.jsx` — "Vazgeç" ve "Al ve kullan" **ikisi de**
   dolu turuncu; hangisinin asıl eylem olduğu anlaşılmıyor.

**Yapılacak:** İkisinde de "Vazgeç" `btn ikincil` olsun — beyaz zemin, `--bd-vurgu`
kenarlık ve yazı. Asıl eylem ("Al ve kullan") dolu turuncu kalsın.
Joker penceresinde ikisi yan yana ve eşit genişlikte kalsın, sadece stil değişsin.

**Dikkat:** `btn ikincil` sınıfı zaten var ve her yerde kullanılıyor; yeni sınıf yazma.

---

## F — SOHBET EKRANI MASAÜSTÜNDE DÜZGÜN DURSUN

**Karar:** Oyun hem telefonda hem masaüstünde düzgün görünecek.

**Sorun:** `/mesajlar/:kisi` masaüstünde dar bir sütun olarak açılıyor, iki yanından
alttaki sayfa sızıyor — arkada "Qu…", "Mes…", "Ar…" yazıları görünüyor.

**Yapılacak:** `SohbetKutusu` masaüstünde (`min-width: 700px`) sayfayı tam kaplayan
bir katman olsun:
- Arkadaki sayfa görünmesin: katmanın zemini opak, `inset: 0`.
- Sohbet içeriği ortada, `max-width: 620px` (uygulamanın kendi genişliğiyle uyumlu).
- İçeriğin iki yanı uygulamanın normal zemin rengiyle dolsun, beyaz boşluk kalmasın.
- Üstteki geri okundan çıkınca liste görünümüne dönsün (bugünkü davranış korunsun).
- Telefon genişliğinde **hiçbir şey değişmesin** — bugün orada doğru çalışıyor.

---

## G — ÇALIŞMA SAYFASI DÜZENİ

`oyun/pages/CalismaPage.jsx`:

1. **Adet düğmeleri L şekli yapıyor.** "Bankan kadar · 50 / 10 / 20 / 30" üç sütunlu
   ızgarada diziliyor, dördüncü tek başına alt satıra düşüyor. Izgarayı **iki sütun**
   yap — iki satırda ikişer düğme, dengeli dursun.
2. **Kategori şeridi sağdan kesiliyor**, devamı olduğu belli değil. Şeridin sağ
   kenarına 24px genişliğinde bir solma maskesi koy
   (`mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent)`),
   **yalnız kaydırılacak içerik varsa**. Sona gelindiğinde maske kalksın.
   Yeni ok düğmesi ekleme — maske yeterli.

**Dokunma:** "Bankan kadar" düğmesinin koşullu çizimi ve "En kısa tur" metni
(`bankaKat < 5`) bilerek öyle yazılmış.

---

## H — AYARLARDA AVATAR ÖNİZLEMESİ

`oyun/components/ProfilAyarlari.jsx:247` — "Avatarın" satırında "Değiştir" düğmesi
var ama mevcut avatar gösterilmiyor; neyi değiştireceğini göremiyorsun.

**Yapılacak:** Satırın soluna 36px `AvatarCerceve` koy (lig çerçevesi varsa o da
görünsün). Hemen üstündeki "Takma adın" satırının hizasını bozma.

---

## I — YALNIZ RAPOR ET, DÜZELTME

Dükkân › Görünüm'de **Kanat** (2.000 coin) kartının küçük görseli kanada benzemiyor,
gri parçalar gibi duruyor. Bu 3B varlık işi ve şu an askıda — **dokunma.**
Sadece şunu raporla: bu küçük görsel nasıl üretiliyor (canlı 3B render mi, önceden
üretilmiş bir resim mi, hangi dosya), ki görsel çalışma başladığında nereye
bakılacağı belli olsun.

---

## TEST

- `npm run build` her maddeden sonra temiz.
- A: Profil › Rozetler → kilitli rozetlerin ikonu görünüyor ve solgun, köşesinde kilit var.
- B: Profil › Lig çerçevelerim → dört çerçeve bir bakışta ayrışıyor.
- C: Zil → aynı türden okunmuş bildirimler tek satır; okunmamış varsa ayrı ve üstte.
- D: Maçı kaybet → günlük görev ilerlemesi Detay açmadan görünüyor; Detay'ı aç →
  en alttaki kart çubuğun altında kalmıyor.
- E: "Hemen oyna" ve maç içi joker satın alma → Vazgeç beyaz, asıl eylem turuncu.
- F: Masaüstünde sohbet aç → arkada sayfa sızmıyor; telefon genişliğinde eskisi gibi.
- G: Çalışma sayfası → adet düğmeleri iki sütun; kategori şeridinin sağı soluyor.
- H: Profil › Ayarlar → "Avatarın" satırında avatar görünüyor.
- Koyu temada A, B ve D'yi ayrıca kontrol et.
- `prefers-reduced-motion` açıkken D'deki görev çubuğu animasyonsuz görünsün.

## RAPOR

1. Her madde için: hangi dosya, hangi satır, ne yaptın.
2. C.2'de meydan okuma bildiriminin `tip` değeri neydi, `TOPLAMA`'ya eklendi mi.
3. D.1'de günlük görev verisini `OdulDokumu`'dan nasıl aldın.
4. I: Kanat görselinin nasıl üretildiği.
5. Emin olamadığın her şey. **Tahmin etme, yaz ve sor.**
