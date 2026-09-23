# TASARIM HAZIRLIK RAPORU — Quiz Tactics arayüzünü baştan tasarlamak için

Hazırlanma: 23 Eylül 2026 · dal `gelistirme` · yalnız okuma ve ölçüm yapıldı, kod değişmedi.
Ölçüm betikleri depoya girmedi; yöntemleri her bölümde yazılı.

## İlk okunacaklar

1. **Ürün gerçeği `PROJECT_CONTEXT.md`'dedir.** `tasarim/home-prototype/` yalnız görsel kaynaktır; prototipteki metin, sayı, mod, skill ve fiyatlar yanlış kabul edilir. Palet sabittir (§7).
2. **Görünüm ile mantık bazı dosyalarda iç içe:** `MatchPage.jsx` (1247 satır), `DuelloPage.jsx` (1286), `ChallengesPage.jsx` (1463), `TournamentPage.jsx`, `GroupMatchPage.jsx`. Bu dosyalarda sayaçlara, kilit ref'lerine, kanallara ve RPC sırasına dokunmayın; yalnız JSX ve className değişsin (§5).
3. **CSS beş katmandır ve sıra önemlidir:** `styles.css` → `tema.css` (352 KB, 8465 satır) → `koyu.css` → `yeni.css` → `mobile-game.css`. 393 seçici aynı bağlamda birden çok kez tanımlı. Yeni tasarım, üstüne bir katman daha eklemek yerine bu yığını sadeleştirmeli (§4).
4. **Metinlerin neredeyse tamamı çeviriden geçiyor** (`tt()` / `ceviri()`, 2239 çağrı). Yeni JSX'e düz Türkçe metin yazmayın; anahtar olarak Türkçe metnin kendisini `tt("…")` içine koyun (§3).
5. **iOS kuralları:** `position: fixed` ile `transform` aynı öğede ya da bir atada kullanılmaz. Yükseklik için `100dvh`, dokunma hedefi en az 44 px. Doğrulama `araclar/arayuz-denetim.mjs` ile yapılır (§7).
6. **Dondurulmuş alanlar tasarım kapsamında değildir:** Meydan (3B), gardırop, avatar3d, Hızlı Mod, "Hızlı Olan Kazanır". Rotaları durur ama "kapalı" notu gösterir. Dikkat: `/meydan` rotası dondurulmuş 3B Meydan DEĞİLDİR, canlı "Meydan okumalar" sayfasıdır (§1, §6).
7. **Mod paritesi kalıcı kuraldır:** Bir modda yapılan görsel düzeltme Klasik, Düello (v1 ve v2), Grup ve Turnuva'ya da aynen uygulanır.
8. **Portal katmanlar** (arama/karşılaşma, tanıtım, modal, maç sonu eylem çubuğu, sesli sohbet) `createPortal` ile `body`'ye çizilir. Bunları `transform` taşıyan bir kabuğun içine almayın (§1.4).

---

## 1. Ekran envanteri

Kaynak: `src/BildimApp.jsx`. Oyun kabuğu `oyun/components/Layout.jsx`'tir: üstte `.topbar`, masaüstünde yatay menü `desktop-nav`, 850 px altında alt menü `.tabbar`. Kabuk ayrıca `Outlet`, `AvatarMenu`, `BildirimZili`, `CoinHapi`, `DavetBandi`, `BildirimToast`, `KurulumSihirbazi`, `Tanitim` ve `RankUpOverlay` taşır.

### 1.1 Oturum öncesi ve bağımsız rotalar (Layout dışı)

| Route | Bileşen | Ne gösterir | Durum |
|---|---|---|---|
| (oturumsuz her yol) | `src/pages/Login.jsx` | Giriş (Google/Facebook/X, misafir) + `AnaEkranaEkle` | canlı |
| `/gizlilik` | `oyun/pages/GizlilikPage.jsx` | Gizlilik metni + `Icindekiler` | canlı, oturumsuz da açılır |
| `/kosullar` | `oyun/pages/KosullarPage.jsx` | Kullanım koşulları | canlı, oturumsuz da açılır |
| `/insan-prototip` | `oyun/harita/aday/HazirInsanPrototipi.jsx` | 3B insan modeli prototipi | **DONDURULMUŞ** (`MEYDAN_ACIK`) |
| `/preview/avatar-lab`, `/preview/avatar-lab-v2`, `/preview/avatar-pro` | `oyun/pages/AvatarLab*Page.jsx`, `AvatarPreviewProPage.jsx` | Avatar çizim laboratuvarı | iç araç, menüde yok |
| `/preview/logo-exploration(-v2/-v4/-v5)`, `/preview/logo-finalists-vnext`, `/preview/q-logo-lab` | `oyun/pages/Logo*Page.jsx`, `QLogoLabPage.jsx` | Logo keşif sayfaları | iç araç, menüde yok |
| (Supabase `.env` eksik) | `BildimApp.jsx` içinde | "Supabase yapılandırması eksik" kutusu | sistem |

### 1.2 Layout içi sayfalar

| Route | Bileşen | Ne gösterir | Durum |
|---|---|---|---|
| `/` | `oyun/pages/Home.jsx` | Ana sayfa: mod kartları (`mode-grid`, mobilde `mobile-core-modes`), lig kartı, turnuva geri sayımı, seri, görevler, yarım maç | canlı |
| `/modlar` | `oyun/pages/ModlarPage.jsx` | Mod kataloğu; var olan rotalara bağlanır, yeni mod eklemez | canlı |
| `/meydan` | `oyun/pages/ChallengesPage.jsx` | **Meydan okumalar:** davetler, süren ve biten maçlar, grup araması, düello davetleri | canlı (3B Meydan ile karıştırmayın) |
| `/mac/:id` | `oyun/pages/MatchPage.jsx` | Klasik 1v1 maçı (§1.3) | canlı |
| `/grup-mac/:id` | `oyun/pages/GroupMatchPage.jsx` | Grup maçı, 3-5 kişi | canlı |
| `/duello`, `/duello/:id` | `oyun/pages/DuelloPage.jsx` (+ `components/DuelloV2.jsx`) | Düello girişi, arama, maç (v1/v2) | canlı; v2 yalnız test hesaplarında |
| `/turnuva` | `oyun/pages/TournamentPage.jsx` | Turnuva lobisi, soru ve sonuç | canlı |
| `/siralama` | `oyun/pages/LeaderboardPage.jsx` (+ `pages/lig.css`) | Lig grubu, şehir sıralaması, podyum | canlı |
| `/arkadaslar` | `oyun/pages/FriendsPage.jsx` | Arkadaşlar, istekler, davet kodu, meydan okuma | canlı |
| `/mesajlar`, `/mesajlar/:kisi` | `oyun/pages/MesajlarPage.jsx` (+ `SohbetKutusu`) | DM listesi ve sohbet | canlı |
| `/davet/:kod` | `oyun/pages/DavetPage.jsx` | Davet linkiyle arkadaş ekleme | canlı |
| `/joker` | `oyun/pages/JokerDukkani.jsx` | Dükkân sekmeleri: Joker (Skill) · Coin · Kıyafet (Kıyafet `GARDIROP_ACIK` ile gizli). `?sekme=coin` | canlı |
| `/calisma` | `oyun/pages/CalismaPage.jsx` | "Hatalarım": puansız çalışma modu | canlı |
| `/profil` | `oyun/pages/ProfilePage.jsx` | Sekmeler: istatistik · ayarlar (`ProfilAyarlari`) · rozet · davet. `?sekme=ayarlar` | canlı |
| `/hizli-mod` | `BulunamadiPage kapaliMod` | "Bu mod şu an kapalı" → ana sayfa | **DONDURULMUŞ** |
| `/hizli-mac/:id` | `BulunamadiPage kapaliMod` | aynı | **DONDURULMUŞ** |
| `/harita`, `/harita-deneme` | `oyun/harita/HaritaSayfasi.jsx`, `harita/deneme/DenemeSayfasi.jsx` | 3B Meydan (bayrak kapalıyken kapalı notu) | **DONDURULMUŞ** |
| `/gorunum`, `/gorunum-3b` | `oyun/vitrin/KarakterVitrini.jsx` | Karakter vitrini (bayrak kapalıyken kapalı notu) | **DONDURULMUŞ** |
| `*` | `oyun/pages/BulunamadiPage.jsx` | 404 | canlı |
| `/oyun/*`, `/bildim/*` | `OnekiAt` | Eski hub önekini atıp köke yönlendirir | yönlendirme |

### 1.3 Maç içi alt ekranlar

Ekran seçimi JSX içindeki `if (…) return` dallarıyla yapılır. **Dal koşullarını değiştirmeyin**, yalnız dalın içindeki görünümü değiştirin.

**Klasik: `MatchPage.jsx`** (`const ekran = (() => {…})()`)
- Yükleniyor: `MacYukleniyor`
- `mac.durum === "bekliyor"`: rakip bekleniyor ya da davet
- `senkronBekliyor`: **Hazır kapısı** (`MacHazirlik`); iki oyuncu da "Hazır" demeden soru çıkmaz
- `reddedildi` / `iptal` bilgi ekranı
- Süre doldu geçişi: `SureDolduGecis` + `PuanSayaci`
- Maç sonu (`bitti && sonucHazir`): `MacSonuSahnesi` + `OdulDokumu`, `MacSonuDokum`, `MacSorulari`, `MacSonuEklentisi` (portal ile eylem çubuğuna çizilir)
- Asenkron "bitirdin, rakip bekleniyor" ekranı (yalnız eski `senkron=false` maçlar); `mac_asenkrona_gec` düğmesi burada
- Soru ekranı: `MacUstSerit` (HUD) + `QuestionCard` (+ `JokerCubugu`, `Sis`, `CevapEfekti`, `Konfeti`) + `SesliSohbet` (bd-ses-yuva portalı) + mesaj balonları

**Düello: `DuelloPage.jsx`**
- Alt bileşenler: `DuelloGiris` (dereceli anahtarı, skill seti), `DuelloArama` (ipuçlarını döndürür), `KarsilasmaSahnesi`, `DuelloTanitim` (v1/v2 adımları), `DuelloMac`, `RovansBekleme`, `AltinSonucu`
- v1 fazları (`d.faz`): `kategori` → `hazirlik` (6 sn Saldırı Hazırlığı) → `cevap` → `sonuc` → `altin` (eşitlikte)
- v2 fazları (`d.surum === 2`, `components/DuelloV2.jsx`): `V2Kategori` (8 sn) → `V2Cevap` (aynı soru aynı anda, cevap kilidi) → `V2Sonuc` (simetrik can tablosu) → `V2UzatmaBandi`, `V2Skill`, `V2Gecmis`, `V2SureCubugu`
- Ortak parçalar: `MacUstSerit`, `Kalpler`, `JokerAlani`, `JokerSatinAlModal`, `SonHamleOzet`
- Maç sonu: `MacSonuSahnesi` + `OdulDokumu` + `DuelloOzet` (yalnız v1) + `HesapGuvenceOnerisi`

**Grup: `GroupMatchPage.jsx`**: `MacYukleniyor` → `bekliyor` (lobi) → `aktif && !basladi` (hazırlık) → `iptal` → `SureDolduGecis` → `MacSonuSahnesi` → soru (`QuestionCard`)

**Turnuva: `TournamentPage.jsx`**
- Turnuva yok, bitmiş ya da iptal: sonraki seans ve `TurnuvaTanitim`
- Katıldığın turnuva bittiyse `MacSonuSahnesi`
- `durum === "lobi"`: lobi listesi (`.bd-lobi-oyuncu`, kılıç düğmesi `.bd-lobi-kilic`)
- Soru ekranı: `QuestionCard`; altın soru bandı `durum-bandi altin-soru`; elenen ya da izleyen için sunucu saatine hizalı sayaç

**Çalışma: `CalismaPage.jsx`**: kategori seçimi → soru (`CevapEfekti`, `Konfeti`) → özet (`MacSorulari`)

### 1.4 Portal ve katmanlar

| Katman | Dosya | Tetik |
|---|---|---|
| Rakip arama / karşılaşma katmanı (`.bd-arama-katman`) | `components/RakipAra.jsx`, `KarsilasmaSahnesi.jsx` | Ana sayfa / Modlar → Klasik |
| Düello tanıtımı (portal, `role=dialog`) | `components/DuelloTanitim.jsx` | ilk Düello girişi |
| Genel tanıtım | `components/Tanitim.jsx` | ilk giriş (Layout) |
| Kurulum sihirbazı (takma ad, avatar, konum) | `components/KurulumSihirbazi.jsx` | profili eksik oyuncu (Layout) |
| Modal (portal) | `components/Modal.jsx` | 15 dosya kullanır |
| Mod seçim penceresi | `components/ModSecimPenceresi.jsx` | Ana sayfa, Arkadaşlar |
| Skill satın alma | `components/JokerSatinAlModal.jsx` (portal) | JokerCubugu, Düello |
| Maç sonu eylem çubuğu | `components/MacSonuEklentisi.jsx`, `MacSonuSahnesi.jsx` (portal) | maç sonu |
| Sis efekti | `components/Sis.jsx` (portal) | QuestionCard |
| Sesli sohbet | `components/SesliSohbet.jsx` (portal, `bd-ses-yuva`) | MatchPage |
| Bildirim paneli | `components/BildirimZili.jsx` (portal) | Layout |
| DM sohbet kutusu | `components/SohbetKutusu.jsx` (portal) | Mesajlar |
| Rütbe atlama | `components/RankUpOverlay.jsx` | Layout |
| Bildirim tostu | `components/BildirimToast.jsx` | Layout |
| Davet bandı | `components/DavetBandi.jsx` | Layout |
| Ana ekrana ekle (PWA) | `components/AnaEkranaEkle.jsx` | BildimApp (oturumlu ve oturumsuz) |
| Bildirim izni | `components/BildirimIzniSor.jsx` | Ana sayfa |
| Yarım maç | `components/YarimMac.jsx` | Ana sayfa |
| Tanı paneli | `components/TaniPaneli.jsx` | yalnız `?tani=1` (geliştirici aracı; tasarlanmaz) |
| Hata sınırı | `src/components/HataSiniri.jsx` | `main.jsx` |

`useOyunModu(aktif)` (`oyun/lib/oyunModu.js`) soru ekranında `body`'ye `bd-oyun-modu` sınıfını ekler. Bu sınıf koyu maç zeminini açar, alt menüyü gizler ve skill çubuğunu alta sabitler.

---

## 2. Paylaşılan bileşenler

Yöntem: `oyun/components/*.jsx` ve `src/components/*.jsx` için `oyun/**` ve `src/**` altında `"…/Ad.jsx"` import satırı arandı (`_test` hariç). Sayı, bileşeni import eden dosya sayısıdır.

| # | Bileşen | Kullanan (özet) |
|---|---|---|
| 59 | `Ikon` | hemen her sayfa ve bileşen: tek SVG ikon kaynağı |
| 16 | `AvatarCerceve` | Home, Lig, Profil, Turnuva, Arkadaşlar, Match, Grup, Mesajlar, OyuncuKarti, MacSonuSahnesi, KarsilasmaSahnesi… |
| 15 | `Modal` | Home, Meydan okumalar, Düello, Arkadaşlar, Grup, Lig, Profil, Turnuva, KurulumSihirbazi… |
| 15 | `src/components/Avatar` | Home, Düello, Lig, Match, Modlar, Profil, Turnuva, AvatarCerceve… |
| 13 | `Maskot` | Login, 404, Çalışma, Arkadaşlar, Lig, Match, Mesajlar, Turnuva, DurumKutusu, MacHazirlik… |
| 12 | `DurumKutusu` | boş, yükleniyor ve hata durumları (çoğu sayfa) |
| 9 | `KategoriIkon` | Düello, DuelloV2, Home, Çalışma, Meydan okumalar, Profil… |
| 6 | `MacSonuSahnesi` | Match, Grup, Düello, Turnuva, Home, HizliMod |
| 6 | `MacSorulari` | Match, Grup, Turnuva, Çalışma, DuelloOzet |
| 6 | `RankBadge` | Home, Lig, Profil, OyuncuKarti, KarsilasmaSahnesi |
| 5 | `Bayrak`, `DereceliAnahtari`, `MacUstSerit`, `OdulDokumu`, `OyuncuKarti`, `SayanSayi`, `SenRozeti` | maç ekranları, lig, profil |
| 4 | `Logo`, `MacYukleniyor`, `QuestionCard`, `SureDolduGecis`, `YanlisSatiri` | Klasik, Grup, Turnuva (QuestionCard Düello'da KULLANILMAZ; Düello kendi soru görünümünü çizer) |
| 3 | `AvatarDugmesi`, `CevapEfekti`, `GeriDugmesi`, `HesapGuvence`, `MacHazirlik`, `SkillSeti` | |
| 2 | `Countdown`, `DavetKodu`, `DuelloV2`, `Icindekiler`, `JokerSatinAlModal`, `KarsilasmaSahnesi`, `KategoriProfili`, `Konfeti`, `KonumSecici`, `MeydanaDonus`, `ModSecimPenceresi`, `RakipAra`, `TurnuvaSaatleri` | |
| 1 | Layout'a özel: `AvatarMenu`, `BildirimToast`, `BildirimZili`, `CoinHapi`, `DavetBandi`, `KurulumSihirbazi`, `RankUpOverlay`, `Tanitim`. Tek sayfaya özel: `AnaEkranaEkle`, `TaniPaneli`, `BildirimIzniSor`, `CoinGorseli`, `DuelloOzet`, `DuelloTanitim`, `EmojiSecici`, `JokerCubugu`, `LigCerceveSecici`, `MacSonuDokum`, `MacSonuEklentisi`, `ProfilAyarlari`, `PuanSayaci`, `SeriRozeti`, `SesDugmesi`, `SesliSohbet`, `Sis`, `SkillGorseli`, `SohbetKutusu`, `SoruBildir`, `TemaDugmesi`, `TurnuvaTanitim`, `UstalikIzgarasi`, `YarimMac`, `HataSiniri` | |
| 1 | Lab ve dondurulmuş: `AvatarLabV2Illustrations`, `AvatarProIllustrations` (resmi avatar çizim kaynağı), `LogoExploration`, `LogoFinalistsVNext`, `LogoWordmarkV2/V4/V5`, `QLogoLab`, `EsyaPortresi`, `KarakterPortresi` | |
| 0 | **Yetim:** `EzeliRakip.jsx`, `GardropVitrini.jsx` | hiçbir dosya import etmiyor |

Toplam 85 bileşen `oyun/components/` altında, 2 bileşen `src/components/` altında.

---

## 3. Arayüz metinleri ve dil

### dil.js yapısı (`oyun/lib/dil.js`, 2435 satır)
- `SOZLUK.en`: yaklaşık 2170 giriş. **Anahtar, Türkçe metnin kendisidir.** Sözlükte olmayan anahtar Türkçe olarak döner, boş ekran üretmez. `"Açık|durum"` biçiminde bağlamlı anahtar desteklenir; `{ad}` yer tutucu kullanılır.
- `t(dil, anahtar, degerler)`: temel çeviri. `tt(anahtar, degerler)`: kancasız, sayfa diliyle (`aktifDil()`) çalışır, modül düzeyinde de kullanılabilir. `tYap(dil)`: dile bağlı bir `t` üretir. `ttSunucu(metin)`: RPC hata mesajlarını `%` kalıbıyla çevirir.
- `oyun/lib/dilKanca.js` › `useDil()` → `{ dil, ceviri, dilDegistir }`. Dil sırası: `profiles.dil` → localStorage `bildim_dil` → tarayıcı dili. Dil değişince sayfa bir kez yenilenir; böylece `tt()` ile kurulan sabitler de doğru dilde olur.
- **Yerel sözlük:** `oyun/components/DuelloV2.jsx` içinde `const EN = {…}` (yaklaşık 70 giriş, Düello 1.0). Çevirici `tt2` / `useV2Ceviri`'dir; sözlükte yoksa ortak `ceviri`ye düşer. `DuelloPage.jsx` ve `DuelloTanitim.jsx` v2 metinleri için bunu kullanır. Tasarım yenilemesinde bu sözlüğün `dil.js`'e taşınması düşünülebilir.
- Dolaylı çeviri: `DuelloPage` › `ARAMA_IPUCLARI`, `DuelloTanitim` › `ADIMLAR`, `SoruBildir` › `SEBEPLER`, `OdulDokumu` › `INDIRIM` Türkçe diziler olarak durur ve çizilirken `tt()`/`c()` ile çevrilir. Bunlar gömülü metin sayılmaz.

### Ölçüm
Yöntem: `@babel/parser` ile her `.jsx`/`.js` dosyası ayrıştırıldı. Sayılanlar: JSXText, `placeholder`/`title`/`aria-label`/`alt` gibi öznitelikler, JSX ifadesi içindeki string'ler ve Türkçe karakter ya da yaygın Türkçe kelime içeren string/template parçaları. Hariç tutulanlar: `tt`/`ceviri`/`t`/`c`/`tt2`/`ttSunucu` argümanları, obje anahtarları, `console`/`throw`/`supabase` çağrıları, sınıf adı ve `var(--…)` benzeri teknik string'ler. Sonra en yüksek çıkan dosyalar elle kontrol edildi.

- **Çeviri çağrısı:** 2239. En çok: ChallengesPage 147, DuelloPage 128, Home 101, GizlilikPage 80, HaritaSayfasi 77, ProfilePage 71.
- **Canlı ekranlarda gerçekten gömülü kalan metin: yaklaşık 10 yer.**

| Dosya | Gömülü metin |
|---|---|
| `src/BildimApp.jsx` | "Supabase yapılandırması eksik…", "Yükleniyor…" ×2 |
| `src/main.jsx` | "Yükleniyor…" (Suspense yedeği) |
| `oyun/components/TaniPaneli.jsx` | "TANI (?tani=0 kapatır)" (geliştirici aracı) |
| `oyun/components/Bayrak.jsx` | "Dünya" (varsayılan etiket) |
| `oyun/components/RankBadge.jsx` | "Çaylak" (varsayılan) |

- **Gömülü metin yoğun, çevrilmemiş dosyalar (kapsam dışı):** Logo ve Avatar lab sayfaları (`LogoExploration*`, `LogoFinalistsVNext`, `QLogoLab`, `AvatarLab*`, `AvatarPreviewPro`, `AvatarProIllustrations`; yaklaşık 90 metin) ve dondurulmuş `harita/deneme/DenemeSayfasi` (21), `harita/aday/HazirInsanPrototipi` (7), `harita/OlcumGostergesi` (6).

**Tasarımcı için kural:** Yeni metni `tt("Türkçe metin")` içinde yazın, İngilizcesini `SOZLUK.en`'e ekleyin. Bileşen içinde dile tepki gerekiyorsa `useDil().ceviri` kullanın.

---

## 4. CSS durumu

### Dosyalar ve yükleme sırası (`src/main.jsx`)

| Sıra | Dosya | KB | Satır | `!important` | `--` değişken tanımı | Not |
|---|---|---|---|---|---|---|
| 1 | `src/styles.css` | 97 | 2687 | 3 | 45 | eski temel + hub kalıntısı (`.gc-root`) |
| 2 | `oyun/styles/tema.css` | 344 | 8465 | 28 | 178 (62 benzersiz `--bd-*`) | "Şenlik" teması; en büyük dosya, üst üste yamalar |
| 3 | `oyun/styles/koyu.css` | 11 | 266 | 0 | 47 | koyu tema (PALETİ YOK; düğme davranışı korunur) |
| 4 | `oyun/styles/yeni.css` | 137 | 1332 | 27 | 66 | A) prototip paleti + `--bd-*` alias katmanı (29 alias), B) prototip CSS'inin küçültülmüş birebir kopyası |
| 5 | `oyun/styles/mobile-game.css` | 12 | 237 | 2 | 3 | yalnız ≤560 px: telefon maç sahnesi, 44 px, eşit mod kartları |

Sayfaya özel dosyalar (bileşen import eder): `oyun/styles/duello-v2.css` (8 KB, DuelloPage), `oyun/pages/lig.css` (LeaderboardPage), `oyun/pages/gorunum.css` (dondurulmuş Görünüm/karakter). Lab'a özel: `avatar-lab*.css`, `avatar-preview-pro.css`, `logo-*.css`, `q-logo-lab.css`. Dondurulmuş: `oyun/avatar3d/*.css`, `oyun/harita/**/*.css`, `oyun/vitrin/vitrin.css`. Fontlar: `public/fonts/yazitipleri.css` (`index.html`'den `<link>` ile).

### Çift tanımlar
Yöntem: `postcss` ile beş global dosya ve `duello-v2.css` ayrıştırıldı. Seçici listeleri virgülle bölündü, boşluklar normalleştirildi, anahtar "seçici + içinde bulunduğu @media" oldu (keyframes hariç).
- 3722 benzersiz seçicinin 865'i birden çok kez tanımlı (farklı medya sorguları dahil).
- **Aynı bağlamda (aynı @media) birden çok tanım: 393 seçici.** Dosya içi: tema.css 256, yeni.css 51, styles.css 26.

| Tanım | Seçici | Nerede |
|---|---|---|
| 9 | `.app .btn` | tema×8, yeni×1 |
| 8 | `.app .kart` | tema×7, yeni×1 |
| 8 | `.app .tabbar a` | tema×8 |
| 7 | `.app` | styles×1, tema×4, yeni×2 |
| 7 | `.bd-secenek` (şık) | styles×1, tema×6 |
| 7 | `.bd-ana-eylem` | styles×2, tema×5 |
| 6 | `.bd-soru-metin` | styles×3, tema×3 |
| 6 | `.bd-mod` | styles×1, tema×5 |
| 6 | `.app .baslik`, `.app .bd-zil-rozet` | tema×6 |
| 6 | `.app .topbar` | tema×5, yeni×1 |
| 6 | `.app .btn.ikincil`, `.app .btn.tehlike` | tema×5, yeni×1 |
| 5 | `.bd-podyum-yer`, `.bd-joker` | styles×1, tema×4 |
| 5 | `.bd-hero-puan-sayi`, `.bd-mod-ad` | styles×2, tema×3 |
| 5 | `.app .puan-chip`, `.app .bd-sen` | tema×5 |
| 4 | `button` | styles×2, yeni×2 |
| 4 | `.tabbar a.aktif` | styles×2, tema×2 |
| 4 | `.bd-sekme` | styles×1, tema×3 |

Farklı medya sorguları dahil sayılınca en çok tanımlananlar: `:root` 16, `body` 12, `.bd-secenek` 12, `.bd-ana-eylem` 11, `.app .topbar` 11, `.app .btn` 11.

### Token katmanları
- **Prototip paleti** (`yeni.css` §A, bkz. §7): `--ink --muted --line --paper --bg --orange --orange2 --navy --gold --purple --green --blue --shadow`, kabuk `--kabuk: 1180px`.
- **`--bd-*` alias'ları** (`yeni.css`): `--bd-zemin*`, `--bd-yuzey-1..3`, `--bd-kenar`, `--bd-vurgu*`, `--bd-odul*`, `--bd-basari*`, `--bd-hata*`, `--bd-bilgi`, `--bd-mor`, `--bd-metin/-2/-3`, `--bd-golge-*`, `--bd-f-baslik`/`--bd-f-govde`. Eski sınıflar bunlar üzerinden yeni palete döner.
- `tema.css` 62 benzersiz `--bd-*` tanımlar; alias'lanmayanlar eski Şenlik değerinde kalır. JSX içinde de satır içi `var(--bd-basari-metin, #177A45)` gibi yedek renkler var (ChallengesPage, GroupMatchPage, TournamentPage, UstalikIzgarasi, `lib/ranks.js`, `lib/botZorluk.js`).
- Kırılımlar: `yeni.css` 850 px (alt menü) ve 560 px (telefon); `tema.css` ek olarak 400/380/700 px; `mobile-game.css` 560 ve 380 px.

### Bilinen tuzaklar
- **iOS `position: fixed` + `transform`** aynı öğede ya da atada kullanılmaz (kök CLAUDE.md). `fixed` sayısı: tema.css 19, styles.css 8, yeni.css 3, duello-v2.css 1. Butonların basınca `translateY(4px)` kabartması fixed öğeye uygulanmamalı.
- **`100dvh`:** `yeni.css` başlığı "100vh → 100dvh yapıldı" diyor, ama prototip kopyasında 8 `min-height:100vh` kaldı (`.checkout-body`, `.duel-body`, `.error-body` ve benzeri prototip gövde sınıfları; `calc(100vh - 74px)` dahil). Uygulamada kullanılıp kullanılmadıkları ayrıca doğrulanmalı. `styles.css:825` `.gc-root` doğru biçimde vh ve ardından dvh yedeği yazıyor.
- **`.bd-geri-sayim`** (PROGRESS.md:6727-6733): iki anlamda kullanılan sınıf (3-2-1 ve son 5 sn) fixed+transform çakışması yüzünden görünmüyordu. `.bd-baslangic-sayimi` + `.bd-son-saniye` olarak ayrıldı; artık kodda hiç geçmiyor. Aynı ad yeniden kullanılmamalı.
- **`.bd-lobi-kilic`** (PROGRESS.md:6836, 7582): tema.css'te üç tanımı birbirini eziyordu. 22 Eylül'de tek tanıma indirildi: `tema.css:8440` `.app .bd-lobi-oyuncu .bd-lobi-kilic`. Eski yerlerde "KALDIRILDI" yorumları durur. Aynı desen `.app .btn`, `.bd-secenek` ve diğerlerinde hâlâ var.
- `body.bd-oyun-modu` maç zeminini koyulaştırır ve alt menüyü gizler. `html, body, #root { height: auto }` düzeltmesi (yeni.css) maç ekranı altındaki gri şeridi giderdi; `height: 100%` geri getirilmemeli.

---

## 5. Oyun durumu kaynakları (mantık ve görünüm)

Yöntem: `oyun/**` ve `src/**` içinde `.rpc("…")`, `.from("…")` ve `.channel("…")` regex'le toplandı.

| Ekran | RPC | Tablo (`from`) | Realtime kanalı |
|---|---|---|---|
| **MatchPage** | `get_match_question` `submit_match_answer` `advance_match` `use_joker` `joker_mac_durumu` `cift_mac_durumu` `mac_soruyu_atla` `mac_asenkrona_gec` `mac_iptal` `mac_odulum` `send_match_message` `create_challenge` | `matches` `match_jokers` | `mac-<id>` |
| **DuelloPage** (+DuelloV2) | `duello_durum` (tek durum kaynağı) `duello_surum_benim` `duello_ara` `duello_aramadan_cik` `duello_baglanti` `duello_cevap` `skill_hazirla` `joker_tek_al` `kalp_at` | — | `duello-<id>` (sinyal) + 1 sn yoklama |
| **GroupMatchPage** | `submit_group_match_answer` `advance_group_match` `use_group_joker` `grup_mac_iptal` `respond_group_challenge` `send_group_match_message` | `group_matches` `group_match_jokers` | `grup-mac-<id>` |
| **TournamentPage** | `join_tournament_lobby` `leave_tournament_lobby` `submit_tournament_answer` `advance_tournament` `turnuva_haftalik_giysi_bilgi` `create_challenge` | `tournaments` `tournament_players` `friendships` `lig_uyelik` | `turnuva` |
| **ChallengesPage** (/meydan) | 16 RPC: `create_challenge` `respond_challenge` `mac_iptal` `duello_davet_*` `create_group_challenge` `grup_ara` `grup_aramadan_cik` `respond_group_challenge` `grup_mac_iptal` `eski_davetleri_temizle` `get_categories` (+ donmuş `hizli_*`) | `profiles` `friendships` `matches` `group_matches` `duello_davetleri` `hizli_maclar` | `maclar` `grup_maclar` `duello_davetleri` `hizli_maclar` |
| **Home** | `get_daily_quests` `claim_quest` `lig_grubum` `join_tournament_lobby` `gonderdigim_davetler` `davet_geri_cek` `yanlis_bankam` `get_categories` `tercih_kategori_kaydet` | `matches` `lig_arsiv` `tournaments` `tournament_players` | `sira-sende` |
| RakipAra (arama katmanı) | `kuyruga_gir` `kuyruktan_cik` `quick_match` `hemen_bot_mac` `hemen_bot_mac_sec` | `matches` `profiles` | — |
| Leaderboard | `lig_grubum` `lig_siralama` `sehir_lig_sirasi` `create_challenge` | `friendships` `profiles` | — |
| Friends | `send_friend_request` `respond_friend_request` `remove_friend` `arkadas_davet_kodu_ile_ekle` `create_challenge` `duello_davet_et` `duello_davet_iptal` `mac_iptal` | `matches` `duello_davetleri` `friendships` | `arkadas-meydan` `dostluklar` |
| JokerDukkani | `envanterim` `joker_coin_ile_al` `joker_tek_al` `reklam_durumum` `reklam_odulu_al` | `joker_paketleri` `coin_paketleri` | — |
| CalismaPage | `calisma_baslat` `calisma_soru` `calisma_cevap` `calisma_bitir` `yanlis_bankam` `get_categories` | — | — |
| ProfilePage (+ProfilAyarlari) | `yanlis_bankam` `hesabimi_sil` `takma_ad_sec` `avatar_onayla` `rahatsiz_etme_ayarla` `tercih_kategori_kaydet` | `badges` `user_badges` | — |
| Mesajlar / SohbetKutusu | `dm_sohbetlerim` `dm_sohbet` `dm_gonder` `dm_okundu` | `friendships` `profiles` | `dm-liste-` `dm-sohbet-` `dm-sayim-` |
| Layout / BildirimZili / Toast / DavetBandi | `bekleyen_sayim` `bildirimleri_oku` `bekleyen_davetlerim` | `bildirimler` | `bildirimler` `bildirimlerim` `bildirim-toast` `davet-bandi` |
| Maç sonu parçaları | `odul_dokumu` (OdulDokumu), `mac_sorulari` (MacSorulari, DuelloOzet), `seri_durumum` + `rovans_iste` (MacSonuEklentisi), `mac_yanlis_sayim` (YanlisSatiri) | `match_answers` `profiles` `joker_islemleri` | — |
| JokerCubugu | `envanterim` `joker_mac_durumu` `joker_fiyatlari` `coin_bakiyem` | — | — |
| SesliSohbet | `sesli_sohbet_izni` | — | `mac-ses-<id>` |
| Ayarlar (`lib/ayarlar.js`) | — | `oyun_ayarlari` (bütün rakamlar buradan gelir) | — |
| AuthContext | `profilim` `claim_referral` `kalp_at` | — | — |

### Görünüm değişirken DOKUNULMAYACAK noktalar
- **Sunucu saatiyle sayaç:** `oyun/lib/zaman.js` › `sunucuOffsetMs()` (soru geldiği an BİR KEZ hesaplanır) ve `kalanSure()`. Kullananlar: `QuestionCard.jsx`, `MatchPage.jsx` (5 yer), `TournamentPage.jsx`, `DuelloPage.jsx` (`hedefBitis = d.cevap.benim_bitis ?? d.faz_bitis`). Sayaç görseli değişebilir; hesap değişmez. `V2SureCubugu` yalnız `kalanSn`/`toplamSn` alır.
- **Cevap kilitleri:** MatchPage `advanceKilidi` ref'i ve `damgaRef` (eski yanıtın yeniyi ezmemesi), Düello v2 `kilitli`/`sureBitti`/`secim`/`calisan` durumları (`window.__bdTani`'ye de yazılır), QuestionCard'ın çift tıklama koruması, Düello'da `onceki?.faz === faz` efekt karşılaştırmaları.
- **Ekran dal koşulları:** MatchPage `ekran` IIFE sırası (`bekliyor` → `senkronBekliyor` → `iptal` → `bitti && sonucHazir && !gecisBitti` → asenkron → soru). Grup ve Turnuva'daki `durum` dalları da aynı şekilde.
- **Portal katmanlar:** `MacSonuEklentisi` eylem çubuğuna, `SesliSohbet` `bd-ses-yuva`'ya portal ile çizilir. Sesli sohbet her dalda fragment'in 2. çocuğu olarak kalmalıdır; yoksa maç bitince görüşme kopar (MatchPage:675 notu).
- **Maç HUD'ı** `MacUstSerit` 5 ekranda ortaktır (Match, Düello, Grup, Turnuva, Çalışma). Değişikliği parite gereği hepsinde doğrulayın.
- **Gizlilik:** Arayüz `is_bot`'u ASLA göstermez; yalnız `acik_bot` kullanılır. Arama ipuçlarında "botla eşleşeceğiz" gibi metin bilerek yok.
- **`useOyunModu`** çağrıları (Match, Grup, Turnuva, Düello `d.durum === "aktif"`) kaldırılmamalı; alt menü joker çubuğunu örter.
- **Kanal kurulum/sökümü** (`CHANNEL_ERROR`/`TIMED_OUT` yeniden bağlanma: Turnuva:195, Grup:189) `useEffect`'lerde durur. JSX'i ayrı bileşene taşırken effect'leri sayfada bırakın.

İç içeliğin en yoğun olduğu dosyalar: `MatchPage.jsx`, `DuelloPage.jsx`, `ChallengesPage.jsx`, `TournamentPage.jsx`, `GroupMatchPage.jsx`, `QuestionCard.jsx`, `JokerCubugu.jsx`, `RakipAra.jsx`. Görece saf görünüm olanlar: `DuelloV2.jsx` (yalnız `duello_durum` şeklini çizer), `MacSonuSahnesi`, `MacUstSerit`, `KarsilasmaSahnesi`, `OyuncuKarti`, `RankBadge`, `DurumKutusu`, `Maskot`, `Ikon`.

---

## 6. Dondurulmuş özellikler

PROJECT_CONTEXT › "Dondurulanlar" ile tutarlıdır. **Hiçbiri silinmez; tasarım kapsamına alınmaz.**

| Özellik | Dosyalar | Kapı | Varlıklar |
|---|---|---|---|
| Meydan (3B harita) | `oyun/harita/**` (HaritaSayfasi, deneme/, aday/, karakter/, muayene/…), `harita/harita.css` | `oyun/lib/ozellikBayraklari.js` › `MEYDAN_ACIK = false`; `/harita`, `/harita-deneme` → `BulunamadiPage kapaliMod kapaliOzellik` | `varliklar-dondurulmus/meydan/deneme/` (GLB, atlas); derleme dışı |
| `/insan-prototip` | `oyun/harita/aday/HazirInsanPrototipi.jsx` + `hazir-insan.css` | aynı bayrak (`MEYDAN_ACIK`) | `varliklar-dondurulmus/meydan/aday-quaternius/` |
| Gardırop / karakter vitrini | `oyun/vitrin/**` (KarakterVitrini, GorunumVitrini, vitrin.css), `oyun/pages/GorunumPage.jsx` + `gorunum.css`, `GardropaGit.jsx`, `oyun/karakter/**` (2B sistem), `components/GardropVitrini`, `KarakterPortresi`, `EsyaPortresi` | `GARDIROP_ACIK = false`; `/gorunum`, `/gorunum-3b` kapalı; Dükkân › Kıyafet sekmesi ve Profil › Görünüm kartı gizli | meydan varlıklarını kullanır |
| Eski 3B gardırop / atölye / yerel meydan | `oyun/avatar3d/**` (Gardrop, Atolye, Meydan, Vitrin + css) | üç HTML girişi `location.replace("/gorunum")` yapar. `vite.config.js` girişleri DOKUNULMAZ (4 giriş kuralı) | — |
| Hızlı Mod | `oyun/pages/HizliModPage.jsx` | `oyun_ayarlari.hizli_mod_acik = false` + BEFORE INSERT; `/hizli-mod` kapalı notu | — |
| "Hızlı Olan Kazanır" | `oyun/pages/HizliMacPage.jsx` | `hizli_mac_acik = false` + BEFORE INSERT; `/hizli-mac/:id` kapalı notu | — |
| Eski profil avatarları | `public/avatars/k01…k31.svg` | `avatar_onayla` yalnız `/avatars/pro/**` kabul eder | canlı set `public/avatars/pro/` (31) |

Bayrak kapalıyken gizlenen girişler `ozellikBayraklari.js` başlığında listelidir (Layout, JokerDukkani, ProfilAyarlari, TournamentPage). `varliklar-dondurulmus/sounds/` DidaGP seslerini tutar; Quiz Tactics ile ilgisi yoktur.

---

## 7. Tasarım kaynağı ve kurallar

- **`tasarim/home-prototype/`**: 24 statik HTML sayfa (`index`, `modes`, `match`, `duel`, `group-match`, `result`, `tournament`, `league`, `friends`, `messages`, `notifications`, `player`, `profile`, `settings`, `shop`, `coins`, `coin-checkout`, `invite`, `practice`, `login`, `privacy`, `terms`, `not-found`), `styles.css` (57 KB), `extra.css` (30 KB), `shop-mobile.css`, `app.js`, `avatars/` (5). PROJECT_CONTEXT'e göre **yalnız görsel kaynaktır**. İçerik, sayı ve mekaniği yanlış kabul edilir. Canlı karşılığı `yeni.css` §B'dir (birebir kopya). Ayrıca kökte `QUIZADOR_TASARIM_REFERANS.html` ve `QUIZADOR_MEYDAN_REFERANS.html` referans dosyaları durur.
- **Palet (değiştirme):** `--ink #17213c` · `--muted #71809f` · `--line #dbe4f3` · `--paper #fff` · `--bg #eef4ff` · `--orange #ff6b2c` · `--orange2 #e95114` · `--navy #172549` · `--gold #ffca45` · `--purple #7c55ec` · `--green #20b874` · `--blue #3b91e8` · `--shadow 0 16px 42px rgba(36,58,103,.12)`. Maç ekranları koyu zemindir (`body.bd-oyun-modu`). Koyu tema paleti yoktur. Reddedilen yönler: nötr gri/mavi palet ve düzleşmiş butonlar.
- **Kontrast:** WCAG AA (küçük metin ≥ 4.5; 24px+ ya da 19px+ kalın ≥ 3.0). Prototip paletindeki düşük kontrastlar henüz düzeltilmedi; ölçüm listesi PROGRESS.md › Arayüz Yenileme'de (Açık İş).
- **Fontlar:** Baloo 2 başlık, Nunito gövde; **yerel paket** `public/fonts/` (`baloo-2-latin(-ext).woff2`, `nunito-latin(-ext).woff2`, ağırlık 600–900), `yazitipleri.css` `index.html`'den yüklenir. Google Fonts bağlantısı YOK, eklenmez. Token: `--bd-f-baslik`, `--bd-f-govde`.
- **Buton dili:** Kabartmalı buton korunur (`box-shadow: 0 4px 0` + basınca `translateY(4px)`). Oyun "bilgi yarışması" gibi görünmeli; sakin, nötr bir uygulama estetiğine kaydırılmamalı.
- **Marka:** Logo kaynağı `oyun/components/Logo.jsx` (Q Logo Lab "03 Forward Pulse"). Dar üst çubukta da tam `QUIZ TACTICS` wordmark'ı görünür.
- **Avatar dili:** `AvatarProIllustrations.jsx` (31 karakter; kalın lacivert kontur, düz sıcak renk). Plastik 3B ya da AI render kullanılmaz.
- **Kabuk ve kırılımlar:** `.shell`/`--kabuk` 1180 px. **850 px** altında yatay menü yerine alt menü gelir. **560 px** altında telefon düzeni (`mobile-game.css`: eşit Klasik/Düello kartları, telefon maç sahnesi).
- **Dokunma hedefi ≥ 44 px** (menü, düğme, şık, soru bildir düğmeleri).
- **Hareket ve saydamlık:** `prefers-reduced-motion` (tema.css'te 46 blok, diğer dosyalarda birer blok) ve `prefers-reduced-transparency` (tema.css 2) desteklenir. Yeni animasyonlar da buna uymalı.
- **Arayüz denetim aracı:** `npm run dev` açıkken `node araclar/arayuz-denetim.mjs [--gorsel]`. 16 sayfayı (`/`, `/modlar`, `/siralama`, `/arkadaslar`, `/meydan`, `/mesajlar`, `/joker`, `/joker?sekme=coin`, `/profil`, `/profil?sekme=ayarlar`, `/turnuva`, `/duello`, `/calisma`, `/gizlilik`, `/kosullar`, 404) açar. Genişlikler 1440 · 850 · 560 · 360 · 390 · 412 · 430 (başlık yorumu 4 genişlik diyor, kod 7 genişlik tanımlıyor). Ölçtükleri: yatay taşma, fixed+transform (öğede ve atada), kaydırınca kayan sabit menü, 44 px altı hedef, konsol hatası. **Maç içi ekranları (Match/Düello fazları/Grup/Turnuva sorusu) KAPSAMAZ**; bunlar için ayrı senaryo gerekir. Bu makinede WebKit çalışmaz; gerçek iOS kontrolünü sahibi telefonunda yapar.

---

## 8. Paket 2 sonrası eklenenler (23 Eyl 2026)

Tasarımcının bilmesi gereken, bu raporun ilk yazımından sonra gelen parçalar:

| Parça | Dosya | Not |
|---|---|---|
| Level çubuğu | `oyun/components/LevelCubugu.jsx` + `level.css` | Profil, ana sayfa hero, maç sonu. Veri: `profilim()` (`level`, `level_xp`, `level_gereken`) |
| Maç sonu level kazancı | `oyun/components/LevelKazanci.jsx` | Veri: `level_kazancim(kaynak)`; level atlama satırı (coin, rütbe, skill hakkı) |
| Rütbe = level | `oyun/lib/ranks.js`, `RankBadge.jsx`, `RankUpOverlay.jsx` | Çaylak L1 · Bilge L10 · Üstat L25 · Kahin L50 · Dâhi L100. Lig (Bronz→Efsane) ayrı |
| Skill dükkânı | `oyun/pages/JokerDukkani.jsx` + `oyun/styles/skill-dukkani.css` | Veri: `skill_dukkani()` (fiyat, 10'lu paket, envanter, kilit, gereken level) |
| Skill seti (loadout) | `oyun/components/SkillSeti.jsx` | `skill_seti_slot` ≥ aktif skill sayısıyken HİÇ çizilmez (şu an kapalı) |
| Güvenli RPC yardımcısı | `oyun/lib/rpcDene.js` | Sonucu önemsiz çağrılar için; `{error}` kontrolü yapar, reddetmez. Yeni kodda `.rpc().catch()` YAZILMAZ |
| Tanı paneli | `oyun/components/TaniPaneli.jsx` | Yalnız `?tani=1`. Dokunma sorunlarında kullanılır; tasarımda kaldırılmamalı |
| Düello 1.0 | `oyun/components/DuelloV2.jsx`, `oyun/styles/duello-v2.css` | Yalnız test hesaplarında; `durum.surum === 2` dalı |

Dokunulmaması gerekenlere ek: maç sonu ödül/XP satırları sunucudan okunur
(`mac_odulum`, `level_kazancim`, `duello_durum.odul`) — rakamlar istemcide
hesaplanmaz, yalnız gösterilir.
