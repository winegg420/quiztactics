# Quiz Tactics — Paket 40: KIRIK OLANLAR

Denetim raporundaki (`DENETIM_RAPORU.md`, Paket 39) **6 🔴 hata** ve oyuncunun
gözüyle "bozuk" görünen her şey. Bu paket bitmeden yayın olmaz.

## Değişmeyen kurallar
- Mevcut kodu silme. Sadece gerekli satırı değiştir, minimal değişiklik yap.
- Dosya silme/yeniden yazma yok; düzenleme yap.
- Yeni npm paketi yok. `vite.config.js › rollupOptions.input` dosyasına dokunma.
- localStorage anahtar adlarını değiştirme. Item id'lerini ve soket adlarını değiştirme.
- Migration'lar append-only. Veri silme yok.
- Kozmetik/UI düzeltmesi yapılan her yerde **Düello dahil bütün modlar** güncellenir. Sormadan uygula.
- Her adımdan sonra kendi kendini test et (`npm run build` + Playwright ile ölçüm), sonucu rapor et.
- Bir hatayı düzeltince aynı hatayı başka dosyalarda da ara.

---

## A. `.bd-geri-sayim` sınıf çakışması — iki ekran birden kırık 🔴

**Sorun.** `oyun/styles/tema.css` içinde `.bd-geri-sayim` **iki kez** tanımlı:

- `tema.css:2143` — eski kural: maç ekranındaki **son 5 saniye büyük sayısı**
  (`position:absolute; transform:translate(-50%,-50%)`, `bd-sayim-vur` animasyonu, sonunda `opacity:0`).
- `tema.css:5099` — yeni kural: maç başındaki **3-2-1 perdesi**
  (`position:fixed; inset:0; z-index:130; place-items:center; backdrop-filter:blur(4px)`).

İkisi birleşince aynı öğede `position:fixed` + `transform` oluyor. Bu, CLAUDE.md'deki
"fixed ile transform aynı öğede olmaz" kuralını çiğniyor ve öğeyi ekran dışına itiyor.

**Ölçüm (denetim):** katman `matrix(0.86,0,0,0.86,-195,-422)`, kutu x=−168 y=−363, opaklık 0.
Son 5 saniye sayısı da x=−160, rengi `rgba(255,255,255,.14)` — açık zeminde zaten görünmez.

**Sonuç.** Ne maç başındaki "Hazır ol! 3-2-1" görünüyor, ne son 5 saniye uyarısı.

**Yapılacak.**
1. İki öğeye **ayrı sınıf adı** ver. Öneri:
   - Maç başı perdesi: `.bd-baslangic-sayimi` (`tema.css:5099` kuralı)
   - Maç içi son 5 saniye: `.bd-son-saniye` (`tema.css:2143` kuralı)
2. JSX tarafında ilgili öğelerin `className`'lerini yeni adlara çevir (hangi bileşenlerin
   kullandığını `grep -rn "bd-geri-sayim" oyun/ src/` ile bul — **hepsini** güncelle,
   Düello/Grup/Turnuva dahil).
3. Son 5 saniye sayısının rengi açık zeminde görünür olsun: `rgba(255,255,255,.14)` yerine
   `--bd-vurgu` renginin düşük opaklıklı hâli gibi, hem açık hem koyu zeminde ayırt edilen bir değer seç.
   Ölçüp yaz: hangi renk, kaç kontrast.
4. Eski sınıf adı hiçbir yerde kalmasın.

**Doğrula.** Playwright ile maç başlat, 3-2-1 perdesinin ekranın ortasında ve opak
olduğunu `getBoundingClientRect()` + `getComputedStyle().opacity` ile ölç. Aynı şeyi
son 5 saniye sayısı için yap. İki ölçümü de rapora yaz.

---

## B. Davet bandında yazı görünmüyor (1,00:1) 🔴

**Nerede.** `oyun/styles/tema.css:566-576` → `.bd-davet-bandi`:
`color:#fff` + `background: var(--bd-yuzey-2)` (açık renk) = beyaz üstüne beyaz.
`tema.css:4516`'da "zemini kendi renkli gradyanı" diye yorum var ama gradyan hiç uygulanmıyor.

**Ölçüm.** "sana meydan okudu!" **1,00:1**, "Bir oyuncu" 1,00:1, "Karışık" 1,00:1.

**Sonuç.** Oyuncu kimin, hangi modda davet ettiğini göremiyor; sadece "Kabul Et" düğmesini görüyor.

**Yapılacak.** Banda Şenlik dilinde belirgin bir zemin ver (turuncu vurgu gradyanı ya da
koyu yüzey) ve yazı rengini o zemine göre seç. Hem açık hem koyu temada **≥ 4,5:1** ölç.
"Reddet" düğmesinin de görünür olduğundan emin ol.

---

## C. Giriş sayfasındaki hata mesajları okunmuyor (1,49:1) 🔴

**Nerede.** `src/styles.css:415` → `.hata-kutu`, yazı rengi `#FCA5A5`, zemin açık pembe.
`tema.css:4431`'deki açık tema düzeltmesi yalnız `.app` ve modal içinde geçerli;
giriş sayfası ikisinin de dışında kalıyor.

**Sonuç.** "Misafir girişi şu an kapalı…" gibi yol gösteren mesaj okunamıyor,
oyuncu neden giremediğini anlamıyor.

**Yapılacak.** `.hata-kutu` için giriş sayfasında da geçerli olan koyu kırmızı yazı rengi ver
(≥ 4,5:1, 13 px). `grep -rn "hata-kutu" src/ oyun/` ile **aynı sınıfı kullanan bütün yerleri**
kontrol et; aynı hata başka sayfada da varsa orada da düzelt.

---

## D. Düello maçında sekme çubuğu jokerleri örtüyor 🔴 + maçta üst çubuk

**Sorun 1 — alt sekme çubuğu.** `DuelloPage.jsx` `useOyunModu(...)` kancasını **hiç çağırmıyor**.
Diğer modlar çağırıyor: `MatchPage.jsx:525`, `GroupMatchPage.jsx:347`,
`HizliMacPage.jsx:266`, `TournamentPage.jsx:379`.
Sonuç: savunma/saldırı jokerleri sekme çubuğunun arkasında kalıyor
(`duello-savunma-son-can-baski-390-acik.png`: "SAVUNMA JOKERLERİ" başlığından sonrası görünmüyor),
maç ortasında yanlışlıkla Ana Sayfa'ya basılabiliyor.

**Yapılacak 1.** `DuelloPage.jsx`'e diğer modlarla **aynı şekilde** `useOyunModu(...)` ekle.
Maç bitince (sonuç ekranı) çubuğun geri geldiğini doğrula.

**Sorun 2 — üst çubuk.** Bütün modlarda maç sırasında üst çubuk (zil, coin, tişört, profil)
açık ve dokunulabilir kalıyor. Soru ortasında zile ya da profile basıp maçtan çıkılabiliyor.
Alt çubuk gizleniyor, üst çubuk gizlenmiyor.

**Yapılacak 2.** `useOyunModu` aktifken üst çubuğun da gizlenmesini sağla —
**tek noktadan**, kancanın kendisinden ya da `Layout.jsx`'ten. Klasik, Saf Bilgi, Düello,
Grup, Turnuva, Hızlı: hepsi aynı davranmalı.
Dikkat: maç ekranındaki **kendi çıkış düğmesi** (X) kalmaya devam etmeli (bkz. Paket 41).

---

## E. Portal katmanlarında birincil düğme okunmuyor (~2,1:1)

**Nerede.** Arama katmanı ve tanıtım pencereleri `.app` dışında çizildiği için Şenlik'in
"turuncu zemin üstüne koyu yazı" kuralı uygulanmıyor; taban `.btn` geçerli oluyor
(`src/styles.css:129-134`, `color:#fff`).

**Etkilenen yerler (en az).**
- "Beklemeden bot ile oyna" — rakip arama, ~**2,1:1** (17 px kalın)
- Düello tanıtım penceresi "İleri" — ~**2,1:1**

**Yapılacak.** `.btn` birincil turuncu düğme rengini **tek kaynaktan** düzelt:
turuncu zemin üzerinde `--bd-vurgu-ustu` (koyu) yazı, portal katmanı dahil her yerde.
`grep -rn "createPortal" oyun/ src/` ile bütün portal katmanlarını tara, hepsinde ölç.
Her portal katmanındaki birincil düğme için kontrast değerini rapora yaz.

---

## F. Dükkânda geliştirici metni oyuncuya görünüyor

**Nerede.** `oyun/pages/JokerDukkani.jsx:352` — Coin sekmesinde:
"Reklam kimliği tanımlı değil (test modu). Sahte ödül verilmez."

**Yapılacak.** Bu metni oyuncu diline çevir ("Reklam izleme şu an kullanılamıyor.")
ya da geliştirici kontrolüne bağla. Kodda başka geliştirici/test metni kalmış mı diye
`grep -rniE "test modu|sahte|TODO|FIXME|debug" oyun/pages oyun/components src/pages` ile tara,
oyuncuya görünenlerin listesini rapora yaz.

---

## G. Turnuva saatleri üç yerde üç farklı

- `oyun/lib/zaman.js:15` (kod varsayılanı): "12:30 · 15:00 · 18:00 · 20:00 · 22:00 · 24:00"
  (bir yerde 10:00 da görüldü)
- `src/pages/Login.jsx:165` (sabit metin): "Her gün 13:00 ve 21:50"
- `CLAUDE.md`: "13:00 ve 21:50, sabit"

**Yapılacak.**
1. Saatleri **tek kaynağa** bağla: `oyun_ayarlari.turnuva_saatleri`.
2. `zaman.js:15`'teki kod varsayılanını CLAUDE.md ile aynı yap (13:00 ve 21:50).
3. `Login.jsx:165`'teki sabit metni kaldır, aynı kaynaktan oku.
4. Canlı `oyun_ayarlari.turnuva_saatleri` değerini oku ve rapora yaz.
   Kodla uyuşmuyorsa **bana söyle, kendin değiştirme.**

---

## H. Lig sekmeleri 390 px'te üst üste biniyor

**Nerede.** `LeaderboardPage.jsx:278` (`.bd-sekme-ust`) — beş sekme sığmıyor,
"DÜNYA" ile "ARKADAŞ" biniyor, ARKADAŞ'ın sonu kesiliyor, kaydırılabilir olduğuna dair ipucu yok.

**Yapılacak.** Sekme şeridini yatay kaydırılabilir yap ve kenarda solma/ok ipucu ver
(Meydan sayfasındaki kategori şeridiyle **aynı desen** — Paket 37'de yapılmıştı, onu tekrar kullan).
Alternatif olarak yazıyı kısalt, ama tercih kaydırma + ipucu.
390'da hiçbir sekmenin kesilmediğini ölçerek doğrula.

---

## I. Çalışma turunda "undefined" yazıyor

**Nerede.** `CalismaPage.jsx:423` — `calisma_baslat` yanıtında `bankadan` / soru sayısı alanı
eksikse ekrana **"Bu turdaki undefined sorunun hepsi bankandan."** yazılıyor. Ayrıca "1/0 · 0 soru kaldı".

**Yapılacak.** Eksik alan koruması ekle: alan yoksa o cümle **hiç çizilmesin**
(boş metin ya da genel bir cümle). Aynı desenin başka yerde de olup olmadığını
`grep -rn '\${[a-zA-Z_.]*}' oyun/pages` benzeri bir taramayla kontrol et;
korumasız şablon değişkenlerini listele.

---

## J. Okunmayan yazılar — 3:1 altındaki bütün kontrastlar

Aşağıdakiler ölçülmüş değerler. Hepsini **≥ 4,5:1**'e çıkar (18,66 px+ kalın yazı için 3:1 yeterli,
ama bu listede öyle bir öğe yok). Renk seçerken Şenlik paletinden çık, yeni renk uydurma.

| Yer | Metin | Ölçülen | Dosya |
|---|---|---|---|
| Turnuva canlı bandı | "CANLI · 3 oyuncu hayatta · Soru 7/15" | **1,94:1** | `TournamentPage.jsx:635` |
| Çalışma tur bandı | "ÇALIŞMA · PUAN VERİLMEZ" | **1,99:1** | `CalismaPage.jsx` tur ekranı |
| Turnuva çipleri | "Sıla (5 doğru)" | **2,17:1** | `TournamentPage.jsx:670` altı |
| Grup davet lobisi | yeşil "Hazır" etiketi | **2,17:1** | `GroupMatchPage.jsx` davet lobisi |
| Meydan kategori | "0 soru · %0 çözüldü" | **2,34:1** (soluk hâlde 1,42:1) | `ChallengesPage.jsx:870` |
| Maç ekranı | "3/10" ilerleme | **2,55:1** | `tema.css:3899` |
| Grup skor tablosu | kendi adın (turuncu/krem) | **2,73:1** | `GroupMatchPage.jsx` skor tablosu |
| Profil rozetler | kilitli rozet açıklaması | **2,73:1** | `ProfilePage.jsx` rozet kartı |
| Turnuva | "Elendin. Kalan oyuncuları…" | **2,75:1** | `TournamentPage.jsx:642` |
| Çalışma | "bankandan · 2 kez yanlış" | **2,82:1** | `CalismaPage.jsx` |
| Çalışma | "Yanlış — Hatalarım'a eklendi" | **2,89:1** | `CalismaPage.jsx` |
| Ana sayfa | aktif sekme etiketi "Ana Sayfa" (9,5 px) | **2,92:1** | `tema.css:881` / `tema.css:4219` |

Ayrıca: bütün alt sekme etiketleri **9,5 px** — telefonda zor okunuyor. En az 11 px yap
(taşma olmadığını 390'da ölç).

**Doğrula.** Her satır için düzeltme sonrası ölçülen değeri rapora yaz.

---

## Bu pakette YAPILMAYACAKLAR
- Koyu tema kontrastları (`oyun/lib/tema.js:26` `KOYU_TEMA_KAPALI = true` — oyuncu ulaşamıyor).
  Ayrı bir tur olacak, şimdi dokunma.
- Gardırop (`/gorunum`) ve Meydan 3B haritası (`/harita`) — donduruldu.
- Ekonomi/coin değerleri, joker fiyatları, başlangıç coin — yayın aşaması, dokunma.
- Eksik özellikler ve boş/hata durumları — **Paket 41**.
- Yerleşim, boşluk, düğme hiyerarşisi gibi kozmetik işler — **Paket 42**.

## Bitince rapor
`PAKET40_RAPOR.md` yaz: her madde için ne değişti (dosya:satır), ölçüm öncesi/sonrası değerler,
dokunulmayan maddeler ve nedeni. Yapamadığın bir şey varsa tahmin etme, sor.
