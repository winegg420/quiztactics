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

### Skill sistemi (v1, canlıda)

Oyuncuya görünen ad **"Skill"**. Veritabanındaki `joker_*` adları eski
istemci ve geçmiş kayıt uyumluluğu için **bilerek korunur** — yeniden
adlandırılmaz. Tek kayıt kaynağı `oyun/lib/jokerler.js`.

Aktif dört maç skill'i:

| id | Ad | Kategori | Hedef |
|---|---|---|---|
| `elli` | 50:50 | bilgi | kendine |
| `sure` | Ek Süre | destek | kendine |
| `soru_degistir` | Soru Değiştir | taktik | kendine, maç başına 1 kez |
| `zaman_baskisi` | Zaman Baskısı | saldırı | rakibe |

- Oyuncu maç öncesi **3 slotluk** bir set seçer (slot sayısı
  `oyun_ayarlari.skill_seti_slot`'tan okunur). Sunucu kullanımda seti doğrular.
- `sis`, `savunma_kilidi`, `saldiri_degistir` **pasiftir** — geçmiş veri için
  kayıtlı, dükkânda gizli, yeniden açılmayacak. Kayıtları silinmez.
- `seri_koruma` maç skill'i değildir; günlük seri mekanizması için ayrı durur.
- **Düello'da saldırı skill'inin teke (Zaman Baskısı) inmesi sahibinin
  kararıdır, hata değildir.** Zamanla yeni skill'ler eklenecektir.

### Ekonomi (bütün rakamlar `oyun_ayarlari` tablosunda)

- Lig = birikimli emek. **Günlük lig tavanı yok.**
- Klasik Mod: galibiyet 25 · berabere 10 · mağlubiyet 0 (teselli yok) —
  hem lig hem coin.
- Düello: galibiyet +50 lig / 50 coin — en çok veren mod.
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

Uygulanışı: `oyun/styles/yeni.css` — prototipin paleti birebir, üstüne eski
`--bd-*` token'larının yeni palete bağlandığı bir alias katmanı. Eski
sınıflar SİLİNMEDİ; hepsi yeni palete döner. Yükleme sırası
(`src/main.jsx`): styles.css → tema.css → koyu.css → yeni.css.

Palet (değiştirme):

```
--ink:#17213c  --muted:#71809f  --line:#dbe4f3  --paper:#fff  --bg:#eef4ff
--orange:#ff6b2c  --orange2:#e95114  --navy:#172549  --gold:#ffca45
--purple:#7c55ec  --green:#20b874  --blue:#3b91e8
--shadow:0 16px 42px rgba(36,58,103,.12)
```

- Kabuk 1180 px (`.shell`); üstte yatay menü, 850 px altında alt menü.
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
| **Meydan (3B harita)** | `oyun/harita/**` | yok (bayrak istemcide) | `oyun/lib/ozellikBayraklari.js` › `MEYDAN_ACIK = true` |
| **Gardırop / karakter vitrini** | `oyun/vitrin/**`, `oyun/pages/GorunumPage.jsx` | yok (bayrak istemcide) | `oyun/lib/ozellikBayraklari.js` › `GARDIROP_ACIK = true` |
| **Eski 3B gardırop / atölye / yerel meydan** | `oyun/avatar3d/**` | yok (HTML girişleri yönlendiriyor) | Üç HTML'deki `location.replace` satırını kaldır · `/gorunum` ve `/gorunum-3b` rotalarını geri bağla · Dükkân › Görünüm sekmesini geri koy |
| **Eski 31 profil avatarı** | `public/avatars/k01.svg`…`k31.svg`, `oyun/_test/avatar-uret.mjs` | `avatar_onayla` yalnız yeni `/avatars/pro/**` listesini kabul eder | Eski listeyi iki avatar seçiciye geri koy · RPC izin listesini yeni migration ile genişlet |

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

## Açık İşler

- **Kontrast düzeltmesi.** Arayüz yenilemesinde prototipin paleti bilerek
  aynen alındı; ölçülen düşük kontrastlar henüz düzeltilmedi. Ölçüm listesi
  `PROGRESS.md` › Arayüz Yenileme.

- **Asenkron 1v1 maç dalı — karar bekliyor.** `matches` tablosundaki 48
  satırın tamamı `senkron = true`; `senkron = false` olan hiç maç yok. Ama
  dal ölü değil, erişilebilir: `mac_asenkrona_gec()` `senkron = false` yazan
  tek canlı yoldur ve `oyun/pages/MatchPage.jsx:428` üzerinden, rakip maça
  gelmediğinde (rakip bot değilse) oyuncuya düğme olarak sunulur. Dalı
  kaldırmadan önce o düğmenin ne olacağına karar verilmelidir.

- **Migration geçmişi 074-082 arasında tutarsız.** Bu dokuz sürüm canlıda
  KAYITLI ama adları yerel dosya adlarıyla uyuşmuyor (ör. uzak `...076` =
  `basit_soru_temizligi`, yerel dosya `isim_sehir_degistirme`; uzak `...079` =
  `soru_cografya_3`, yerel `yeni_karakter_avatarlari`). Geçmişte dosyalar
  yeniden adlandırılmış. Sonuç: `npx supabase db push` bu dokuzunu her seferinde
  "eklenmemiş" sanıp `--include-all` istiyor ve normal yoldan migration
  uygulanamıyor. Hangi SQL'in gerçekten çalıştığı belirsiz olduğu için
  dokunulmadı. Çözülene kadar yeni migration'lar tek işlemde elle uygulanıp
  `supabase_migrations.schema_migrations`'a yazılmalıdır (20 Eyl 2026'da 256
  böyle uygulandı).
