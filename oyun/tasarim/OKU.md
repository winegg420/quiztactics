# Quiz Tactics Tasarım Sistemi (Yön A "Şeker Kutusu") — Faz 2 kılavuzu

Canlı örnek: **`/tasarim-sistemi`** (giriş + yalnız sahip, menüde yok). Her bileşeni orada dene.
Parlak, yuvarlak, kabartmalı: her düğme elle bastırılan bir oyuncak gibi aşağı iner.
Hedef bir web sitesi değil, **mobil oyun** (Play Store'a TWA). TR + EN.

## 1. Dosyalar

| Dosya | İş |
|---|---|
| `tasarim.css` | Tek CSS girişi. `src/main.jsx`'te **bir kez** yüklü: `import "../oyun/tasarim/tasarim.css";` — ekranda ayrıca import etme. |
| `tokenlar.css` | Bütün `--qt-*` değişkenleri (`:root`) + `.qt-sahne-mac` bağlamı |
| `bilesenler.css` | Bileşen stilleri (yalnız `qt-` sınıfları) |
| `hareket.css` | Keyframe'ler (`qt-h-*`), hareket sınıfları, azaltılmış hareket |
| `index.js` | Tek JS girişi: `import { QtDugme, QtIkon, … } from "../tasarim/index.js";` |
| `temel.jsx` · `kabuk.jsx` · `oyun.jsx` | Bileşenler |
| `Ikon.jsx` | İkon seti (`QtIkon`) + Q işareti (`QtQIsareti`) |
| `hareket.js` | Süre sabitleri, `titresim()`, `hareketAzaltildiMi()` |
| `kontrast.js` | Kontrast çiftleri + hesap (sayfa bunu canlı kullanır) |
| `TasarimSistemiPage.jsx`, `ornek.css` | Örnek sayfa (bileşen değildir) |

## 2. Altın kurallar

1. **Eski sınıfı yeni sistemde tekrarlama.** Yeni ekranda `.btn`, `.kart`, `.bd-secenek`, `.bd-mod`, `.topbar`, `.tabbar`, prototip sınıfları (`.play-button`, `.surface-card`…) ve `--bd-*` / `--ink` / `--orange` KULLANILMAZ. Yeniden yazdığın ekranda eski sınıfı `qt-` bileşeniyle değiştir; eski sınıfı `qt-` dosyalarına kopyalama. Bir şey eksikse `oyun/tasarim/`'e yeni bileşen/sınıf ekle (paylaşılan) — ekran CSS'inde benzerini icat etme.
2. **Renk, ölçü, süre yalnız token'dan.** Ekran CSS'inde çıplak `#hex` / `px` gölge / `ms` yazma (düzen ölçüleri — grid, genişlik — serbest).
3. **Eleman seçicili global kural yazma** (`button{}`, `body{}`, `h2{}`). Ekran stilleri o ekranın kök sınıfı altında kalır.
4. **Metin:** her görünür metin `tt("Türkçe metin")`; İngilizcesi şeridinin dosyasına: `oyun/lib/ceviri/{mac,ana,lig,dukkan,giris}.js` (anahtar = Türkçe metnin kendisi). **`oyun/lib/dil.js`'e dokunma.** Bileşenler hazır metin alır (`ad={tt("Düello")}`); kendi iç metinleri (`Kapat`, `Elendi`…) `ceviri/tasarim.js`'te.
5. **Bileşenler durumsuzdur:** RPC, zamanlayıcı, cevap kilidi, sunucu saati EKRANDA kalır; bileşen yalnız verilen durumu çizer. `MatchPage`/`DuelloPage` vb.'de mantığa dokunma, yalnız JSX'i bileşenlerle değiştir (bkz. `docs/TASARIM_HAZIRLIK.md` §5).
6. **Mod paritesi:** maç görünümündeki bir değişiklik Klasik, Düello (v1+v2), Grup, Turnuva, Çalışma'da aynı olmalı — hepsi `QtMacUst` + `QtSoruKarti` + `QtSik` + `QtSkill` kullanır.
7. **Kicker/eyebrow yok** (başlığın üstünde küçük BÜYÜK HARF etiket). Kart iç içe konmaz. Gradyan yazı, cam/bulanıklık süsü, emoji-ikon yok.
8. **`is_bot` asla gösterilmez;** "bot" kelimesi arayüze girmez.

## 3. Token'lar (`tokenlar.css`)

Roller (koyu tema = yalnız bu rolleri yeniden tanımlamak; `:root[data-qt-tema="koyu"]` kancası hazır, şimdilik tanımsız):

| Grup | Token'lar |
|---|---|
| Zemin | `--qt-zemin` #dff0ff · `--qt-zemin-2` #c6e3ff · `--qt-zemin-metin` #1d2152 · `--qt-zemin-soluk` #46507f · `--qt-zemin-desen` (nokta dokusu) |
| Yüzey | `--qt-yuzey` #fff · `--qt-yuzey-2` #f1f6ff · `--qt-yuzey-3` #e3ebfa · `--qt-metin` #1d2152 · `--qt-metin-soluk` #46507f · `--qt-cizgi` #c9d8f2 · `--qt-cizgi-guclu` #b3bde6 · `--qt-ortu` |
| Vurgu | `--qt-vurgu` #ff7a2e (turuncu, birincil eylem) `-yazi` `-dudak` `-acik` · `--qt-ikinci` #6a48f5 (mor: seçim, aktif) `-yazi` `-dudak` `-acik` `-koyu` · `--qt-odak` |
| Durum | `--qt-dogru` · `--qt-yanlis` · `--qt-uyari` · `--qt-bilgi`; her biri `-yazi` (üstündeki yazı) `-dudak` `-acik` (açık zemin) `-koyu` (açık zeminde yazı) |
| Coin | `--qt-coin` #ffc933 `-yazi` `-dudak` `-acik` — **altın yalnız coin/ödül/prestij** |
| Mod | `--qt-mod-{klasik,duello,turnuva,grup,saf}` + `-dudak` + `-acik`; yazı `--qt-mod-yazi` |
| Lig | `--qt-lig-{bronz,gumus,altin,elmas,efsane}` + `-dudak`; yazı `--qt-lig-yazi` |
| Maç | `--qt-mac-zemin` #3b2a93 · `--qt-mac-zemin-2` · `--qt-mac-metin` · `--qt-mac-soluk` |
| Yazı | `--qt-f-baslik` (Baloo 2, 600–800) · `--qt-f-govde` (Nunito, 600–900) · ölçek `--qt-y-xs` 12 · `s` 14 · `m` 16 · `l` 18 · `xl` 21 · `2xl` 26 · `3xl` 34 · `4xl` 44 · ağırlık `--qt-a-normal` 600 / `-kalin` 700 / `-siyah` 800 |
| Boşluk | `--qt-b-1…16` (4 px ızgara: 4 8 12 16 20 24 32 40 48 64) · `--qt-kenar` 16 · `--qt-kabuk` 1180 · `--qt-dokunma` 44 |
| Köşe | `--qt-r-s` 10 · `-m` 14 · `-l` 22 · `-xl` 28 · `-hap` 999 |
| Kabartma | `--qt-dudak-s` 3 · `--qt-dudak` 5 · `--qt-dudak-b` 6 · `--qt-kabartma-kart` · `--qt-golge-yuzen` · `--qt-golge-derin` |
| Hareket | eğri `--qt-egri-cikis` (varsayılan) · `-gecis` · `-cekmece` · `-yay` · `-dusus`; süre `--qt-s-basma` 120 · `-kisa` 160 · `-orta` 240 · `-uzun` 300 · `-an` 420 · `-kirilma` 720 |
| Katman | `--qt-z-yapiskan` 20 · `-menu` 40 · `-ortu` 60 · `-toast` 80 · `--qt-altmenu-yukseklik` 72 |

Yazılar yerel paketli (`public/fonts/`, `index.html`'den); yeni `@font-face` / Google Fonts ekleme.

## 4. Kabuk ve yardımcı sınıflar

`.qt-sayfa` (noktalı açık mavi sayfa, 100dvh) · `.qt-sayfa-ic` (1180 px ortalı, 16 px kenar) · `.qt-altmenu-payi` (sabit alt menü altında içerik payı) · `.qt-sahne-mac` (maç zemini; yalnız ZEMİN rolünü koyulaştırır, kartlar beyaz kalır) · `.qt-baslik-1/2/3` · `.qt-govde` · `.qt-kucuk` · `.qt-soluk` (yüzeyde) · `.qt-soluk-zemin` (sayfa zemininde) · `.qt-sayi` (Baloo + eş genişlikli rakam) · `.qt-gizli` (yalnız ekran okuyucu).

## 5. Bileşenler (hepsi `index.js`'ten)

| Bileşen | Prop'lar | Not |
|---|---|---|
| `QtDugme` | `tur` birincil·ikincil·mor·tehlike·hayalet · `boyut` k(44)·o(52)·b(60) · `ikon` `ikonSag` · `tamGenislik` · `yukleniyor` · `devreDisi` · `as` (ör. `as={Link} to="/joker"`) | Ekranda tek `birincil` |
| `QtIkonDugme` | `ikon` · **`etiket` (zorunlu)** · `rozet` (sayı) · `tur` yuzey·saydam·mor · `boyut` o(44)·b(52) · `as` | |
| `QtKart` | `ton` yuzey·duz·mor·vurgu · `dolgu` yok·k·o·b · `onClick` → düğme olur · `as` | İç içe kart yok |
| `QtModKart` | `mod` klasik·duello·turnuva·grup·saf · `ad` `alt` `ikon` `rozet` · `secili` · `kilitli`+`kilitMetni` · `genis` · `onClick`/`as` | |
| `QtRozet` | `ton` notr·mor·vurgu·dogru·yanlis·uyari·bilgi·coin·koyu·lig-* · `ikon` · `boyut` o·k | Dokunulmaz |
| `QtLigRozeti` | `lig` bronz·gumus·altin·elmas·efsane · `children` (metni ezer) | |
| `QtSayiRozeti` | `sayi` `en`(99) `nokta` | Anlamı ata öğenin etiketinde |
| `QtCip` | `secili` `ikon` `sayi` + button prop'ları | `aria-pressed` |
| `QtSekmeler` | `sekmeler=[{kod,ad,ikon,sayi}]` `aktif` `onSec` `etiket` | Panel id: `qt-panel-${kod}`; ← → tuşları |
| `QtAnahtar` | `acik` `onDegis` `etiket` `aciklama` `devreDisi` | `role="switch"`; "Dereceli" için |
| `QtIlerleme` | `deger` `en` `ton` mor·coin·dogru·vurgu·lig-* · `isaret` (%) · `etiket` · `boyut` o·b | XP, lig çubuğu |
| `QtAvatar` | `src` `ad` `boyut` s36·m44·l64·xl88 · `halka` mor·vurgu·yanlis·dogru·coin·yok · `seviye` · `cevrimici` | src yoksa baş harf |
| `QtCoinHapi` | `miktar` (sayı; dile göre biçimlenir) · `onClick`/`as` · `etiket` | |
| `QtListe` + `QtListeSatiri` | satır: `bas` (node) ya da `ikon`+`ikonTon` · `baslik` `alt` `sag` · `ok` · `vurgulu` · `onClick`/`as` | Tıklanan satırın `sag`'ına düğme koyma |
| `QtBosDurum` | `ikon` `ton` `baslik` `metin` `eylem` | Hata için `ikon="uyari" ton="yanlis"` |
| `QtIskelet` | `tur` metin·satir·kart·daire·dugme · `adet` `genislik` `yukseklik` | Kapsayıcıya `aria-busy="true"` |
| `QtMarka` | `as` `boyut` o·b + bağlantı prop'ları | Q (Logo.jsx'in aynısı) + "QUIZ TACTICS"; yeni logo değil |
| `QtUstCubuk` | `marka` `menu` `sag` (node yuvaları) **ya da** `coin`/`onCoin` `bildirim`/`onBildirim` `avatar`/`onAvatar` · `yapiskan` | |
| `QtUstMenu` | `ogeler=[{kod,ad,to,end,rozet}]` `aktif` `Baglanti` `onSec` `etiket` | Yalnız ≥ 850 px |
| `QtAltMenu` | `sekmeler=[{kod,ad,ikon,to,end,rozet,rozetEtiketi}]` `aktif` `Baglanti` `onSec` · `sabit` · `yalnizMobil` · `etiket` | `rozet: true` = nokta |
| `QtModal` | `acik` `onKapat` `baslik` `aciklama` `altlik` · `tur` modal·altSayfa · `kapatDugmesi` `ortuKapatir` | body'ye portal; Esc; odak tuzağı; ilk odak `data-qt-ilk-odak` |
| `QtToast` + `QtToastYuvasi` | toast: `ton` notr·dogru·yanlis·uyari·bilgi·coin·mor · `ikon` `baslik` `metin` `eylem` `onKapat` · yuva: `konum` ust·alt · `gomulu` | Zamanlama ekranın işi (≈3 sn) |
| `QtMacUst` | `sen`/`rakip` = `{ad, avatar, can, canToplam, kayip, etkiler}` · `skor=[a,b]` · `skorAnahtar` · `rakipBaski` | `can` yoksa kalp yok (Klasik) |
| `QtEtki` | `ikon` ya da `children` ("2X") · `etiket` | `sen.etkiler` içine |
| `QtSoruKarti` | `metin` `sayac` (node) `kategori` `sira` · `cikiyor` · `sevinc` | `key={soruId}` ver → giriş oynar |
| `QtSayac` | `kalan` `toplam` `esik`(5) `boyut` k·o·b · `durdu` · `ekBalon={anahtar, metin}` | Hesap `oyun/lib/zaman.js`'te kalır |
| `QtSikler` + `QtSik` | şık: `harf` `metin` `durum` normal·secili·dogru·dogrusu·yanlis·elendi·kilitli·solgun · `kiriliyor` · `onClick` · grup: `iki` (2×2) | `normal` dışında `disabled` |
| `QtCan` | `dolu` `toplam` `etiket` `boyut` `kayip` `ters` | |
| `QtSkill` + `QtSkillCubugu` | `ikon` `ad` `adet` `fiyat` · `durum` hazir·aktif·kullanildi·kilitli · `kilitMetni` ("Lv 10") · `onClick` | kilitli/kullanıldı `aria-disabled` ama tıklanır → ekran açıklama tostu gösterir |
| `QtSonucBandi` | `ton` notr·dogru·yanlis · `metin` · `anahtar` | Yer ayırır, ekran zıplamaz |

Kısa örnek:

```jsx
import { QtKart, QtDugme, QtModKart } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";

<QtModKart mod="duello" ad={tt("Düello")} alt={tt("Can savaşı · skill'li")} onClick={duelloAc} />
<QtDugme tamGenislik ikon="oyna" yukleniyor={araniyor} onClick={ara}>{tt("Oyna")}</QtDugme>
```

Layout (Şerit A) için:

```jsx
<QtUstCubuk yapiskan
  marka={<QtMarka as={Link} to={y()} aria-label={tt("Quiz Tactics ana sayfa")} />}
  menu={<QtUstMenu Baglanti={NavLink} etiket={tt("Ana menü")} ogeler={[{ kod: "ana", ad: tt("Ana Sayfa"), to: y(), end: true }, …]} />}
  sag={<><BildirimZili /><CoinHapi /><AvatarMenu profile={profile} /></>} />
<main className="qt-altmenu-payi">…</main>
<QtAltMenu sabit yalnizMobil Baglanti={NavLink} etiket={tt("Mobil menü")} sekmeler={[
  { kod: "ana", ad: tt("Ana Sayfa"), ikon: "ev", to: y(), end: true },
  { kod: "arkadas", ad: tt("Arkadaşlar"), ikon: "kisiler", to: y("/arkadaslar"), rozet: bekleyen > 0, rozetEtiketi: tt("bekleyen") },
  { kod: "lig", ad: tt("Lig"), ikon: "lig", to: y("/siralama") },
  { kod: "dukkan", ad: tt("Dükkân"), ikon: "dukkan", to: y("/joker") },
  { kod: "profil", ad: tt("Profil"), ikon: "kisi", to: y("/profil") } ]} />
```

`body.bd-oyun-modu` alt menüyü gizliyorsa yeni menüde de aynı gizleme korunmalı (Şerit A: `.bd-oyun-modu .qt-altmenu { display:none }` gibi — Layout'a ait CSS'te).

## 6. İkonlar (`QtIkon`)

`<QtIkon ad="kupa" boyut={24} />` — süs ikonunda etiket verme (aria-hidden); tek başına anlam taşıyorsa `etiket="…"`.
**Eşleme:** eski `oyun/components/Ikon.jsx`'teki 60 adın hepsi aynı adla var → `<Ikon ad="x" boyut={n} />` yerine `<QtIkon ad="x" boyut={n} />` yaz (`kalinlik` prop'u yok, çizgi 2,4 sabit). Tek fark: eski `cifte` → takma adla `ikiKat`'a gider.
Yeni adlar: `lig` (kalkan+tik), `dukkan`, `klasik`, `duello`, `grup`, `safBilgi`, `kalp`, `bilgi`, `arama`, `kopyala`, `ileri`, `asagi`, skill'ler `yariyari` `ekSure` `degistir` `baski` `sigorta` `ikiKat` `ikinciSans`.
Takma adlar (`IKON_TAKMA_AD`): arkadaslar→kisiler · profil→kisi · tik→onay · kapat→carpi · cifte/ikikat→ikiKat · ikincisans→ikinciSans · eksure→ekSure · turnuva→kupa · ampul→safBilgi · ayarlar→ayar · bildirim→zil.
Alt menü için önerilen: ev · kisiler · lig · dukkan · kisi (eski Layout'taki `grafik`/`yildiz` yerine).

## 7. Hareket

- Basma: dudak kadar `translateY` (120 ms, `--qt-egri-cikis`); dudaksız öğelerde `scale(0.9x)`. Bileşenlerde hazır.
- Arayüz geçişi ≤ 300 ms, girişler ease-out, yalnız `transform`/`opacity` (+`clip-path`). `scale(0)`'dan doğma yok. Sayaç halkası `stroke-dashoffset` tek istisna.
- Oyun anları (nadir, 420–760 ms) bileşenlerde hazır: `QtSik durum="dogru"` (zıplama + parıltı) · `"yanlis"` (sallanma) · `"dogrusu"` (halka) · `kiriliyor` (50:50, iki parça düşer; `QT_KIRILMA_MS` sonra `durum="elendi"`) · `QtSkill durum="kullanildi"` (patlama + altın halka) · `QtSayac` son 5 sn (kırmızı + nabız + tik) · `QtCan kayip` · `QtSoruKarti cikiyor` (`QT_KART_CIKIS_MS` sonra yeni soru) / `sevinc` · `QtMacUst skorAnahtar`/`rakipBaski`.
- Sınıflar: `.qt-h-gir` · `.qt-h-pop-gir` · `.qt-h-salla` · `.qt-h-zipla` · `.qt-h-tik` · `.qt-h-baski` · `.qt-h-sevin` · `.qt-h-skill-an` (::after) · `.qt-h-gerilim` (son 5 sn kenar nabzı, kapsayıcıya; ::after). Yeniden oynatmak için `key` değiştir (ya da `animasyonuYenidenOynat(el, sinif)`).
- Haptik: `titresim("dogru"|"yanlis"|"sayac"|"skill"|"kirilma"|"dokunus")` — ses/titreşim ayarı kapalıysa çağırma.
- `prefers-reduced-motion`: konum/ölçek kalkar, renk + opaklık kalır — `hareket.css` §4'te hazır. Yeni animasyon eklersen oraya sade sürümünü de ekle. (`.app .shell > *` doğrudan çocuğunda `yeni.css` animasyonu tamamen kapatır; sorun değil.)
- **iOS:** `position:fixed` öğede ve atalarında `transform`/`filter`/`perspective` yok. Sabit katman (`QtAltMenu sabit`, `QtModal`, `QtToastYuvasi`) transform'lu kabuğun içine konmaz (modal/toast zaten body'ye portal). Yükseklikte `100dvh`.

## 8. Erişilebilirlik

- Dokunma hedefi ≥ 44 px (bileşenlerde hazır; coin hapı görünmez alanla 44'e uzar).
- Kontrast: küçük yazı ≥ 4,5, büyük ≥ 3 (tablo aşağıda; yeni çift eklersen `kontrast.js`'e ekle). Renkli zeminde soluk yazı griden değil o rengin `-yazi`/`-koyu` token'ından.
- Doğru/yanlış yalnız renkle anlatılmaz: tik/çarpı ikonu + hareket + `aria-label` eki birlikte.
- İkon düğmesi `etiket` alır; sayı rozeti `aria-hidden`, sayı ata etikete yazılır.
- Odak halkası `--qt-odak` (maç sahnesinde altın). Hover yalnız `(hover:hover) and (pointer:fine)`.
- Sayaç `role="timer" aria-live="off"` (her saniye okunmaz); sonuç bandı `aria-live="polite"`; hata tostu `role="alert"`.
- Grid içinde kayan içerik (sekmeler, tablo) varsa grid çocuğuna `min-width: 0` ver (yoksa dar ekranda taşar).

## 9. Kontrast tablosu (WCAG 2.x, hepsi AA geçer)

| Çift | Yazı | Zemin | Oran |
|---|---|---|---|
| Sayfa yazısı / zemin | `zemin-metin` #1d2152 | `zemin` #dff0ff | 12.97 |
| Soluk yazı / zemin | `zemin-soluk` #46507f | `zemin` #dff0ff | 6.65 |
| Soluk yazı / zemin-2 | `zemin-soluk` #46507f | `zemin-2` #c6e3ff | 5.83 |
| Gövde / yüzey | `metin` #1d2152 | `yuzey` #ffffff | 15.09 |
| Soluk / yüzey | `metin-soluk` #46507f | `yuzey` #ffffff | 7.74 |
| Soluk / yüzey-2 | `metin-soluk` #46507f | `yuzey-2` #f1f6ff | 7.13 |
| Soluk / yüzey-3 (devre dışı) | `metin-soluk` #46507f | `yuzey-3` #e3ebfa | 6.46 |
| Birincil düğme | `vurgu-yazi` #1d2152 | `vurgu` #ff7a2e | 5.80 |
| Mor düğme / seçili | `ikinci-yazi` #ffffff | `ikinci` #6a48f5 | 5.44 |
| Mor yazı / yüzey | `ikinci-koyu` #4f2fd6 | `yuzey` #ffffff | 7.75 |
| Mor yazı / mor açık | `ikinci-koyu` #4f2fd6 | `ikinci-acik` #ece6ff | 6.39 |
| Doğru şık | `dogru-yazi` #0d2a1b | `dogru` #2fd27a | 7.79 |
| Yeşil yazı / yüzey | `dogru-koyu` #137a45 | `yuzey` #ffffff | 5.39 |
| Yeşil yazı / yeşil açık | `dogru-koyu` #137a45 | `dogru-acik` #dcf8ea | 4.79 |
| Yanlış şık / tehlike düğmesi | `yanlis-yazi` #2a0710 | `yanlis` #ff5a6a | 6.09 |
| Kırmızı yazı / yüzey | `yanlis-koyu` #b81d31 | `yuzey` #ffffff | 6.45 |
| Kırmızı yazı / kırmızı açık | `yanlis-koyu` #b81d31 | `yanlis-acik` #ffe3e6 | 5.33 |
| Uyarı | `uyari-yazi` #3a2200 | `uyari` #ffb020 | 8.15 |
| Uyarı yazısı / uyarı açık | `uyari-koyu` #8a4b00 | `uyari-acik` #fff1d6 | 6.09 |
| Bilgi | `bilgi-yazi` #0b2447 | `bilgi` #3b91e8 | 4.72 |
| Bilgi yazısı / bilgi açık | `bilgi-koyu` #1a5fae | `bilgi-acik` #e0efff | 5.46 |
| Coin hapı | `coin-yazi` #3a2600 | `coin` #ffc933 | 9.37 |
| Coin yazısı / coin açık | `coin-yazi` #3a2600 | `coin-acik` #fff4cf | 13.10 |
| Gövde / vurgu açık | `metin` #1d2152 | `vurgu-acik` #ffe8da | 12.80 |
| Mod: Klasik | `mod-yazi` #1d2152 | `mod-klasik` #ff8a3d | 6.43 |
| Mod: Düello | `mod-yazi` #1d2152 | `mod-duello` #ff6f91 | 5.70 |
| Mod: Turnuva | `mod-yazi` #1d2152 | `mod-turnuva` #ffc933 | 9.81 |
| Mod: Grup | `mod-yazi` #1d2152 | `mod-grup` #3fd58f | 7.99 |
| Mod: Saf Bilgi | `mod-yazi` #1d2152 | `mod-saf` #5ab8ff | 7.00 |
| Lig: Bronz | `lig-yazi` #1d2152 | `lig-bronz` #e39a5f | 6.51 |
| Lig: Gümüş | `lig-yazi` #1d2152 | `lig-gumus` #cfd8e6 | 10.50 |
| Lig: Altın | `lig-yazi` #1d2152 | `lig-altin` #ffc933 | 9.81 |
| Lig: Elmas | `lig-yazi` #1d2152 | `lig-elmas` #62d6f4 | 8.94 |
| Lig: Efsane | `lig-yazi` #1d2152 | `lig-efsane` #b57bff | 5.20 |
| Maç yazısı / maç zemini | `mac-metin` #ffffff | `mac-zemin` #3b2a93 | 10.83 |
| Maç soluk / maç zemini | `mac-soluk` #d6ccff | `mac-zemin` #3b2a93 | 7.19 |
| Maç soluk / maç zemini 2 | `mac-soluk` #d6ccff | `mac-zemin-2` #2a1d74 | 9.13 |

## 10. Ekran başına önerilen bileşenler

| Şerit / ekran | Bileşenler |
|---|---|
| **A — Kabuk** (`Layout.jsx`) | `QtUstCubuk` + `QtMarka` + `QtUstMenu` + `QtAltMenu sabit yalnizMobil`, `.qt-sayfa`/`.qt-sayfa-ic`, `QtToastYuvasi` (BildirimToast), `QtModal` (Tanıtım, Kurulum) |
| **Ana sayfa / Modlar** | `QtKart` (oyuncu kartı: `QtAvatar` + `QtIlerleme` + `QtRozet`), `QtModKart` ızgarası, `QtAnahtar` (Dereceli), `QtCip` (kategori), `QtListeSatiri` (görevler, bekleyenler), `QtIskelet` |
| **Maç** (Klasik, Düello v1/v2, Grup, Turnuva, Çalışma) | kök `.qt-sahne-mac` (+ `.qt-h-gerilim` son 5 sn), `QtMacUst`, `QtSoruKarti` + `QtSayac`, `QtSikler`/`QtSik`, `QtSonucBandi`, `QtSkillCubugu`/`QtSkill`, `QtEtki`, `QtModal tur="altSayfa"` (skill satın al) |
| **Lig / Sıralama** | `QtSekmeler`, `QtLigRozeti`, `QtIlerleme ton="lig-*" isaret`, `QtListe`/`QtListeSatiri vurgulu`, `QtAvatar`, `QtBosDurum` |
| **Dükkân** | `QtSekmeler` (Skill · Coin · Kıyafet), `QtKart`, `QtSkill` (vitrinde), `QtCoinHapi`, `QtRozet ton="coin"`, `QtModal` (onay), `QtToast ton="coin"` |
| **Arkadaşlar / Mesajlar / Meydan okumalar** | `QtListe` + `QtListeSatiri` (`bas={<QtAvatar cevrimici/>}`), `QtDugme boyut="k"`, `QtCip` (filtre), `QtBosDurum`, `QtIskelet tur="satir"` |
| **Profil / Ayarlar** | `QtAvatar boyut="xl" seviye`, `QtIlerleme`, `QtSekmeler`, `QtAnahtar`, `QtListeSatiri ok` |
| **Giriş / 404 / kapalı mod** | `.qt-sayfa`, `QtMarka boyut="b"`, `QtDugme tamGenislik boyut="b"`, `QtBosDurum` |
| **Maç sonu** | `QtKart`, `QtRozet ton="dogru/yanlis"`, `QtIlerleme` (XP), `QtDugme` (Rövanş birincil), `.qt-h-pop-gir` |
