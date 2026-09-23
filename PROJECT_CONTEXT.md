# PROJECT_CONTEXT.md — Quiz Tactics

Bu dosya projenin BUGÜNKÜ gerçeğini tutar, tarihçesini değil.

- Bir karar değişince ESKİ SATIR SİLİNİR, yenisi yazılır. Alta eklenmez.
- Tarihçe PROGRESS.md'nin işidir; buraya "önce şöyleydi, sonra böyle
  oldu" yazılmaz.
- "Açık İşler" bir backlog değildir: yalnız işi bloke eden birkaç madde
  durur. Uzun listeler PROGRESS.md'de ya da ayrı dosyada tutulur.
- Hedef uzunluk 400 satırın altı. Büyüyorsa içerik özetlenir, bölüm
  eklenmez.

---

## Mevcut Ürün

**Quiz Tactics** (GitHub: `winegg420/quiztactics`) — Türkçe bilgi yarışması,
PWA. Tek depo, tek Vercel projesi: quiztactics.vercel.app.

18 Eylül 2026'da `idagggamecenter` hub'ından kendi deposuna ayrıldı.
Supabase **aynı** projedir — veri, anahtarlar ve tablolar taşınmadı.
`VITE_MOD` ve iki-mod ayrımı kalktı; site kimliği `index.html` içinde
statik durur.

Oyun kodu `oyun/` altında, paylaşılan kabuk `src/` altında. Depoda
başka oyun modülleri de (`kafatopu/`, `meyvekes/`, `run/`, `gladius/`,
`patirun/`, `driftgp/`) durur; her biri kabuğa tek lazy route satırıyla
bağlıdır ve hiçbiri diğerinin klasöründen import etmez.

Araçlar: **Jev (TypeSafe)** — toplu soru/çeviri kalite değerlendirmesi
için; kullanım kuralı AGENTS.md'de.

### Dil

- Marka adı her dilde **"Quiz Tactics"**, çevrilmez.
- İlk yayın: Türkçe + İngilizce.
- Dil seçimi: giriş yapmışsa profildeki tercih; yoksa tarayıcı dili `tr`
  ile başlıyorsa Türkçe, başka her şeyde İngilizce. IP/ülkeye bakılmaz.
- Özel isimler asla çevrilmez (şair "Cami" → "Jami", "Mosque" DEĞİL).

---

## Oyun Modları

**İki aktif mod: Klasik Mod (1v1) ve Düello (Taktik Maçı).**
Turnuva bir mod değil, etkinliktir. Grup Maçı ödülsüz arkadaş modudur
(coin/lig/seri yok, rozet var).

Her mod iki girişlidir: **Dereceli** (lig puanı + tam coin) ve **Serbest**
(lig puanı yok, coin %50). Arayüzde tek "Dereceli" anahtarı vardır, son
tercih hatırlanır (localStorage + `profiles.dereceli_tercih`).

### Ortak mekanik

- **Hız bonusu yok** — süre içinde doğru cevaplayan herkes aynı puanı alır.
- Normal maçta **berabere olabilir**. Turnuvada **altın soru**: biri
  kazanana kadar, skillsiz, kullanılmamış sorulardan.
- Turnuvada ilk 5 soru en kolaydan başlar, sonra zorlaşır (`questions.zorluk`).
- Yanlış cevap sonrası bekleme **1 sn**.
- Kategori yüzdesi için asgari örneklem 10 soru; altı "veri yok".

### Düello

- 3 can, en çok 10 tur (çift hamle — eşit hamle kuralı).
- 6 sn Saldırı Hazırlığı; savunan 15 sn (Zaman Baskısı altındaysa 10 sn).
- **Saldırı riski:** savunan kendi EN ZAYIF kategorisinde (maç başında
  sabitlenir) bilirse SALDIRAN can kaybeder.
- Aynı kategori üst üste gelmez, bir maçta en çok 2 kez çıkar.
- Eşitlikte turnuvanın altın soru mekaniği uygulanır.
- Botlar kategoriye göre isabetle cevaplar (`bot_kategori_sapma`) —
  profil hem görünen hem gerçektir.
- Gerçek rakip bulunmazsa fallback, `duello_arama_sn=8` + oyuncuya sabitlenen
  2–5 sn bot gecikmesiyle **10–13 sn** aralığındadır. 21 Eylül 2026 yerel
  uçtan uca ölçümünde arama → bot maçı → maç ekranı **12,56 sn** sürdü.
- Rövanş bekleme penceresindeki “Vazgeç”, `duello_rovans_iptal` ile sunucu
  isteğini de geri çeker; yalnız pencereyi kapatıp hayalet istek bırakmaz.
- **Düello 1.0 herkese açık (23 Eyl 2026):** `duello_surum` = **2**. Aynı soru
  aynı anda, simetrik can tablosu, uzatma (beraberlik yok), skill 4/2/1, Sigorta/2X
  yok. Sunucu 268, bot 269; arayüz `DuelloV2.jsx`. Test listesi
  (`duello_v2_test_kullanicilari`) ve v1 kodu silinmedi, yalnız kullanılmıyor.
  Yukarıdaki "Saldırı riski" / "6 sn Saldırı Hazırlığı" maddeleri v1 içindir.
  İstemci tanımadığı bir sürüm görürse maçı çizmez, yenileme ister
  (`DUELLO_EN_YUKSEK_SURUM`).

### Turnuva

- Günde 7 seans, TSİ: **10:00 · 12:30 · 15:00 · 18:00 · 20:00 · 22:00 · 24:00**
- Tek kaynak `oyun_ayarlari.turnuva_saatleri`; kod varsayılanı aynı liste
  (`oyun/lib/zaman.js › VARSAYILAN_LISTE`). Eski `turnuva_saat_sabah` /
  `turnuva_saat_aksam` satırları veritabanında DURUR ama okunmaz. Silinmez.

### Lig

- 5 kademe: Bronz → Gümüş → Altın → Elmas → Efsane.
- 25 kişilik gruplar. Grup = yalnız sıralama tablosu, eşleşmeyle ilgisi yok.
  İlk 5 yükselir, son 5 düşer. Pazartesi 00:00 (TSİ) sıfırlanır.
- Eşleşme kendi ligi ± 1 lig ile sınırlıdır.
- Misafir (anonim) hesap ligde ancak `lig_misafir_min_mac` (5) maçtan sonra
  görünür; oyuncu kendi satırını her zaman görür. Hesap silinmez.
- **Toplam oyuncu sayısı hiçbir yerde gösterilmez.**

### Sosyal

- **Oyuncular sadece arkadaşlarıyla da oynayabilir** — biri bu oyunu
  yalnızca arkadaşlarıyla maç yapmak için oynuyor olabilir. Arkadaşlar alt
  sekmeden kaldırılmaz, hiçbir limit onu cezalandırmaz.
- "Ezeli rakip" istatistiği yalnız arkadaşlar için tutulur.
- Aynı çift aynı gün: 1-5. maç tam ödül, 6-10. %50, 11+ ödülsüz. Aynı
  cihaz/IP'den iki hesap arasında sıralı maç hiç ödül vermez.

---

## Skill ve Ekonomi

### Skill sistemi

Oyuncuya görünen ad **"Skill"**. Veritabanındaki `joker_*` adları eski
istemci ve geçmiş kayıt uyumluluğu için **bilerek korunur** — yeniden
adlandırılmaz. Tek kayıt kaynağı `oyun/lib/jokerler.js`.

Aktif yedi maç skill'i vardır:

| id | Ad | Mod | Davranış |
|---|---|---|---|
| `elli` | 50:50 | Klasik · Grup · Turnuva · Düello | iki yanlış şıkkı eler |
| `sure` | Ek Süre | Klasik · Grup · Turnuva · Düello | kişisel cevap süresini uzatır |
| `soru_degistir` | Soru Değiştir | Klasik · Grup · Düello | aynı kategoriden kendi sorusunu değiştirir |
| `zaman_baskisi` | Zaman Baskısı | Klasik · Düello | rakibin süresini kısaltır |
| `sigorta` | Sigorta | yalnız Klasik | yanlışta 5; doğruda normal 10 |
| `cifte_puan` | 2X | yalnız Klasik | doğruda 20; yanlışta 0 |
| `ikinci_sans` | İkinci Şans | Klasik · Düello | ilk yanlışta aynı sayaçla bir ikinci cevap |

- **Loadout (skill seti) fiilen kapalı:** `oyun_ayarlari.skill_seti_slot` = 7
  = aktif skill sayısı → seçim ekranı çizilmez, herkes bütün aktif skill'leri
  kullanır; sunucu set kontrolünü atlar. Altyapı (tablo, RPC, kapı) duruyor;
  açmak = `skill_seti_slot`'u aktif skill sayısının altına çekmek. Kataloğa yeni
  aktif skill eklenince bu değer de artırılmalı.
- **Skill kataloğu ve kilit:** `skill_katalogu` (tur, aktif, kilit_fiyati,
  gereken_level). Bugünkü 7 skill fiyat 0 · level 1 (açık). Yeni skill'in kilidi
  coin'le bir kez açılır (`skill_kilidi_ac`); level şartı coinle atlanamaz.
  Kapı (`skill_kullanim_kapisi`) kilitli skill'i reddeder.
- **Kullanım hakkı:** skill envanterdeki haktan düşer. Fiyatlar
  `coin_joker_<tür>` (tek) ve `coin_joker_<tür>_10` (10'lu paket, %15 indirim).
  Maç içinde hak yoksa onaylı "al ve kullan" akışı hâlâ var (karar bekliyor).
- Maç içi sınırlar herkese eşit: Klasik 6 / aynı skill 2 / soruda 1 · Düello
  4 / 2 / 1. Level ödülünden gelen haklar sınırları artırmaz.
- `sis`, `savunma_kilidi`, `saldiri_degistir` **pasiftir** — geçmiş veri için
  kayıtlı, dükkânda gizli, yeniden açılmayacak. Kayıtları silinmez.
- `seri_koruma` maç skill'i değildir; günlük seri mekanizması için ayrı durur.
- **Düello'da saldırı skill'inin teke (Zaman Baskısı) inmesi sahibinin
  kararıdır, hata değildir.** Zamanla yeni skill'ler eklenecektir.

### Ekonomi (bütün rakamlar `oyun_ayarlari` tablosunda)

- Lig = birikimli emek. **Günlük lig tavanı yok.**
- **Coin (test değerleri):** Klasik galibiyet 30 · berabere 12 · mağlubiyet 0
  (`coin_mac_*`); Düello galibiyet 45 · mağlubiyet 0 (`coin_duello_galibiyet`) —
  Düello daha uzun sürdüğü için daha çok verir. Lig puanı ayrı: Klasik 25/10/0.
- **XP ve level (test değerleri):** Klasik 30/15/10, Düello 45/15 (galibiyet/
  mağlubiyet), turnuva katılım 20 + ilk 3'e 50. Serbest ve Saf Bilgi'de XP tam.
  Kaybeden ancak oynadıysa XP alır. Grup maçı XP vermez. Level ligden ayrı,
  kalıcı, sınırsız; herkes Level 1'den başladı (23 Eyl 2026). Gereken XP =
  round(`level_xp_taban` + `level_xp_katsayi` × level^`level_xp_us`) = 60 + 0,5 ×
  L^1,5. Level ödülü 20 coin; her 5 levelde 1 rastgele aktif skill hakkı; rütbe
  atlamada 100 coin (bu coinler günlük tavana sayılmaz). Botların level'i
  seviye puanından tohumlu türetilir, XP almaz.
- **Rütbe level'e bağlı:** Çaylak L1 · Bilge L10 · Üstat L25 · Kahin L50 ·
  **Dâhi** L100 (eski "Efsane" rütbesi; Efsane Lig ile karışmasın). Eski puan
  eşikleri kullanım dışı. Lig (Bronz → Efsane) ayrı rekabet göstergesi.
- Saf Bilgi/skillsiz Klasik, standart ödülün **%50**'sini
  verir. Serbest ayrı kavramdır; iki indirim üst üste çarpılıp %25 olmaz.
- Turnuva lig: 1. 150 · 2. 80 · 3. 40 · 4-10. 20 · diğer katılan 10.
  Coin: 150/75/40 + katılana 10.
- Günlük seri bonusu `least(gün×3, 15)`.
- Arkadaş daveti lig puanı VERMEZ — iki tarafa 200 coin.
- İndirimler çarpılmaz: çift koruması / serbest / açık bot → en düşüğü uygulanır.
- Çift koruması (1-5 tam, 6-10 %50, 11+ yok) lig puanına da uygulanır.
- Günlük tavan 400 · başlangıç 500 · reklam 25 (günde 5).
- Eşya: sıradan 300–600, özel 1.200–2.500.
- **Etkinlik eşyaları satılmaz** (Taç, Pelerin, Uzay Kıyafeti) — yalnız
  turnuva ödülüdür. Dükkânda kilitli görünür.
- Dükkândaki her şey yalnız coin ile alınır.
- **Rakamları koda gömme.** Yayından sonra SQL ile değiştirilebilmeli.

### Botlar

- İki katman: **açık botlar** (adında "Bot" geçer, %50 coin, anında cevaplar)
  ve **gizli botlar** (gerçek oyuncu gibi, tam coin, gerçekçi sürede cevaplar).
- `is_bot` istemciye **ASLA sızmaz** — gizli botun bot olduğu anlaşılmamalı.
- Gizli botlar arkadaşlık kabul etmez, lig değiştirmez.

---

## Arayüz ve Görsel Kararlar

Arayüz yenilemesi **canlıdadır** (20 Eylül 2026). Tek görsel kaynak
`tasarim/home-prototype/` — 24 sayfalık saf HTML/CSS prototip.

**Prototip YALNIZCA görsel tasarım kaynağıdır.** İçindeki örnek metinler,
oyuncu verileri, skill'ler, modlar, fiyatlar, rütbeler, turnuva saatleri ve
oyun mekanikleri **doğru kabul edilmez**. Bütün işlevlerde mevcut kod,
veritabanı ve bu dosyadaki ürün kararları tek doğru kaynaktır.

Canlı uygulanışı: `oyun/styles/yeni.css` — prototipin paleti birebir, üstüne eski
`--bd-*` token'larının yeni palete bağlandığı bir alias katmanı. Eski
sınıflar SİLİNMEDİ; hepsi yeni palete döner. Yükleme sırası
(`src/main.jsx`): styles.css → tema.css → koyu.css → yeni.css.

`mobile-game.css` en son
yüklenir. 560 px ve altında Klasik/Düello eşit ana mod kartları, oyun HUD'ı
alt navigasyonu, azaltılmış panel içi panel görünümü, 44 px dokunma hedefleri,
telefon maç sahnesi ve reduced-motion uyumlu mikroanimasyonlar getirir. Bu
mobil revizyon canlıdadır.

Palet (değiştirme):

```
--ink:#17213c  --muted:#71809f  --line:#dbe4f3  --paper:#fff  --bg:#eef4ff
--orange:#ff6b2c  --orange2:#e95114  --navy:#172549  --gold:#ffca45
--purple:#7c55ec  --green:#20b874  --blue:#3b91e8
--shadow:0 16px 42px rgba(36,58,103,.12)
```

- Kabuk 1180 px (`.shell`); üstte yatay menü, 850 px altında alt menü.
- Resmi marka işareti Q Logo Lab **03 Forward Pulse** Q'sudur: hafif öne
  eğimli, kısa ve gövdeyle bütünleşik turuncu kuyruklu vektör form. Header,
  giriş ve splash aynı `Logo.jsx` kaynağını kullanır; PWA/app ikonunda yalnız
  Q değil tam `QUIZ TACTICS` wordmarkı bulunur. Mobil web ve kurulu PWA üst
  barı da dar ekranda yalnız Q'ya düşmez; tam wordmarkı gösterir.
- Baloo 2 başlık / Nunito gövde — **yerel paketli** (`public/fonts/`,
  `@font-face`). Google Fonts bağlantısı YOK, geri de eklenmez.
- Kabartmalı buton dili korundu (`0 4px 0` + basınca `translateY(4px)`).
- Maç ekranları koyu zemin (`body.bd-oyun-modu`).
- Koyu tema PALETİ YOK; ayardaki düğme mevcut davranışını korur.
- Kontrast WCAG AA: küçük metin ≥ 4.5, 24px+ veya 19px+ kalın metin ≥ 3.0.
- `prefers-reduced-motion` ve `prefers-reduced-transparency` desteklenir.
- Oyun, bilgi yarışması gibi görünmeli; sakin/nötr "uygulama" estetiğine
  kaydırma.

### Profil avatarları

Profilde yalnız **sabit avatar fotoğrafı seçimi** vardır (karakter
oluşturma ve gardırop dondurulmuştur — bkz. Dondurulanlar).

Resmi çizim dili — tek kaynak `oyun/components/AvatarProIllustrations.jsx`,
statik üretici `oyun/_test/avatar-pro-uret.mjs`, canlı dosyalar
`public/avatars/pro/`. Yeni avatarlar aynı düz/katmanlı SVG dilinde çizilir:
kalın lacivert kontur, sıcak düz renk, güçlü siluet, hafif asimetri, küçük
boyutta net yüz. Plastik 3B render, stok degrade ve jenerik AI avatar
görünümü kullanılmaz.

Canlı profesyonel set **31 avatardır**. İlk 10 karaktere ek olarak Köpek,
Baykuş, Tilki, Penguen, Kurbağa, Ayı, Maymun, Ejderha, Köpekbalığı, Ahtapot,
Arı, Ninja, Şövalye, Büyücü, Dedektif, Viking, Hayalet, Zombi, Mumya,
Palyaço ve Kral aynı çizim dilinde yeniden yapılmıştır. Eski `k01.svg`…
`k31.svg` dosyaları yalnız tarihsel geri dönüş için dondurulmuş kalır;
seçimde yalnız `/avatars/pro/**` kullanılır.

### Mod paritesi — KALICI KURAL

Bir moda yapılan kozmetik/arayüz düzeltmesi, aynı sorunun bulunduğu
**bütün modlara** aynen uygulanır. **Düello da diğer modlar gibidir,
ayrı tutulmaz.** Her düzeltmede "düelloda (ve öteki modlarda) da var mı"
diye bak, varsa aynısını orada da yap. Sorma.

---

## Reddedilenler ve Dondurulanlar

### Reddedilmiş fikirler — tekrar önerme

- "Hızlı cevap modu" (herkese aynı anda aynı soru)
- Loot box / şans kutusu
- Nötr gri/mavi palet, düzleşmiş butonlar

### Dondurulanlar — tek liste

**Hiçbiri silinmez.** Dosyalar ve veri yerinde durur; yalnız arayüzden
girişi yoktur. Her dosyanın başında aynı biçimde bir dondurma bloğu vardır
(neden · tarih · paket · dosyalar · geri açma adımları). Dağınık not
bırakma, buraya ekle.

| Modül | Dosyalar | Sunucu kapısı | Geri açma |
|---|---|---|---|
| **Hızlı Mod** | `oyun/pages/HizliModPage.jsx` | `oyun_ayarlari.hizli_mod_acik = false` + tabloda BEFORE INSERT kapısı | Ayarı `true` yap · rotayı, ana sayfa düğmesini ve harita binasını geri koy · skill testindeki TEST 9 yorumunu aç |
| **"Hızlı Olan Kazanır"** | `oyun/pages/HizliMacPage.jsx` | `oyun_ayarlari.hizli_mac_acik = false` + BEFORE INSERT kapısı | Ayarı `true` yap · `/hizli-mac/:id` rotasını geri bağla · davet akışındaki `hizli` türünü aç |
| **Meydan (3B harita)** + `/insan-prototip` | `oyun/harita/**`; varlıkları `varliklar-dondurulmus/meydan/` (derleme dışında) | yok (bayrak istemcide) | `oyun/lib/ozellikBayraklari.js` › `MEYDAN_ACIK = true` · varlık klasörlerini `public/meydan/` altına geri taşı (README) |
| **Gardırop / karakter vitrini** | `oyun/vitrin/**`, `oyun/pages/GorunumPage.jsx` | yok (bayrak istemcide) | `oyun/lib/ozellikBayraklari.js` › `GARDIROP_ACIK = true` |
| **Eski 3B gardırop / atölye / yerel meydan** | `oyun/avatar3d/**` | yok (HTML girişleri yönlendiriyor) | Üç HTML'deki `location.replace` satırını kaldır · `/gorunum` ve `/gorunum-3b` rotalarını geri bağla · Dükkân › Görünüm sekmesini geri koy |
| **Eski düşük ayrıntılı profil avatarları** | `public/avatars/k01.svg`…`k31.svg`, `oyun/_test/avatar-uret.mjs` | `avatar_onayla` yalnız profesyonel `/avatars/pro/**` listesini kabul eder | Eski dosyalar geri açılmaz; karakter fikirlerinin 31'i de profesyonel sette yeniden çizildi |

**Meydan ve gardırop bayrağı** — tek anahtar `oyun/lib/ozellikBayraklari.js`.
Bayrak kapalıyken gizlenenler: alt menüdeki Meydan sekmesi, üst çubuktaki
Görünüm kısayolu, Dükkân › Görünüm sekmesi (varsayılan sekme Skill olur),
Profil › Görünüm kartı, Profil › Ayarlar › "Meydanda ikramlar", ilk
girişteki `/gorunum` yönlendirmesi. Rotalar (`/harita`, `/harita-deneme`,
`/gorunum`, `/gorunum-3b`) SİLİNMEDİ: "Bu bölüm şu an kapalı." notunu
gösterip ana sayfaya dönüyorlar. `vite.config.js`'e ve veritabanına
DOKUNULMADI — meydan bot cron işleri çalışmaya devam ediyor (kapatma
kararı sahibinin).

**Donmuş rotaların davranışı tutarlıdır:** donmuş oyun modları
(`/hizli-mod`, `/hizli-mac/:id`) ve donmuş meydan/gardırop rotaları önce
"Bu mod şu an kapalı." notunu gösterip ana sayfaya `replace` ile gider
(`oyun/pages/BulunamadiPage.jsx` › `kapaliMod`). Bilinmeyen adresler 404
sayfasına düşer. Eski `avatar3d` HTML girişleri `/gorunum`'a yönlendirir;
`/gorunum` de kapalı olduğu için oradan ana sayfaya düşerler — iki adımlı
ama döngüsüz.

**Meydan mimari şartı (geri açılırsa geçerli):** haritanın görseli ve
karakterler ileride baştan değişecek. Meydan özellikleri (kahve/balon
ikramı, emoji, dans, meydan okuma, zıplama) görselden bağımsız yazılır:
mantık + ağ katmanı bir yerde, 3B modeller başka yerde. Yön topuzu sol
altta, eylem düğmeleri sağ altta.

---

## Test kuralı — oyuncu gibi test et (23 Eyl 2026)

Her pakette: `node araclar/oyuncu-testi.mjs [--adres=https://quiztactics.vercel.app]`.

- Oyuncunun cevap vermesi gereken HER soruda şıklar dokunulabilir olmalı;
  değilse test ANINDA başarısız. "Açık şık varsa dokun" yazılmaz — eski betik
  şık kapalıyken sessizce bekledi, soru Yanıtsız kapandı, test geçti.
- Her dokunuştan sonra cevabın sunucuya ulaştığı veritabanından doğrulanır;
  maç sonunda test hesabının yanıtsız kaldığı her soru başarısızdır.
- Düello: en az 3 saldıran + 3 savunan; `--uzatma` ile uzatmaya kadar.
- Her ekran 360 ve 390 px ölçülür; dokunulabilir öğe kutuları kesişirse
  başarısız. Maç öncesi ekran, maç içi skill çubuğu, maç sonu dahil.
- Telefon taklidi (dokunuş), gerçek akış, bota karşı. Klasik ve turnuvada da
  (turnuva yalnız seans açıkken) aynı kontrol.

## Açık İşler


- **1000 soru partisi + Jev zorluk (270–274) beklemede.** Üretildi ve provadan
  geçti ama Ida "soru üretimini durdur" dedi; uygulanmadı. Dosyalar
  `araclar/soru-parti-1000/bekleyen-migrationlar/` (migrations klasörü
  dışında). 274 havuzun en kolay %10'unu zorluk 1 yapar → `soru_sec` onları
  Klasik/Düello/Grup'tan çıkarır; açmadan önce karar gerekir.

- **Kontrast düzeltmesi.** Arayüz yenilemesinde prototipin paleti bilerek
  aynen alındı; ölçülen düşük kontrastlar henüz düzeltilmedi. Ölçüm listesi
  `PROGRESS.md` › Arayüz Yenileme.

- **Asenkron 1v1 maç dalı — karar bekliyor.** `matches` tablosundaki 48
  satırın tamamı `senkron = true`; `senkron = false` olan hiç maç yok. Ama
  dal ölü değil, erişilebilir: `mac_asenkrona_gec()` `senkron = false` yazan
  tek canlı yoldur ve `oyun/pages/MatchPage.jsx:428` üzerinden, rakip maça
  gelmediğinde (rakip bot değilse) oyuncuya düğme olarak sunulur. Dalı
  kaldırmadan önce o düğmenin ne olacağına karar verilmelidir.
