# Quiz Tactics — Paket 41: EKSİKLER

Denetim raporundaki **71 🟡** maddesi + hafızadaki bekleyen iki kod işi.
Buradaki her madde "oyunda olması gereken ama olmayan" şey.

**Ön koşul: Paket 40 bitmiş ve doğrulanmış olmalı.**

## Değişmeyen kurallar
- Mevcut kodu silme. Minimal değişiklik yap. Dosya silme/yeniden yazma yok.
- Yeni npm paketi yok. `vite.config.js › rollupOptions.input` dosyasına dokunma.
- localStorage anahtar adlarını, item id'lerini, soket adlarını değiştirme.
- Migration'lar append-only. Veri silme yok.
- Bütün API çağrılarında try-catch + hata yönetimi.
- Kozmetik/UI düzeltmesi **Düello dahil bütün modlara** uygulanır. Sormadan yap.
- Büyük işleri küçük adımlara böl, her adımı açıkla, her adımdan sonra kendini test et.

---

## A. Ortak hata / yükleme / boş durum sistemi  ← EN BÜYÜK MADDE

**Sorun.** Veri gelmediğinde oyuncu **verisini kaybettiğini sanıyor**. Denetimde ölçülen 12 ekran:

| Ekran | Şu an ne oluyor | Dosya |
|---|---|---|
| Ana sayfa | Sahte profil: "Oyuncu · **0 PUAN** · Çaylak · ? avatar", zil ve coin kayboluyor | `Home.jsx` |
| Ana sayfa (yüklenirken) | Aynı sahte "0 PUAN" görünüp sonra gerçek değere atlıyor | `Home.jsx` |
| Profil | Sonsuza dek "Yükleniyor…" | `ProfilePage.jsx:84` |
| Profil kartı | "0 MAÇ · 0 KUPA · 0 GÜN SERİ" (konsolda "oyuncu karti alinamadi") | `OyuncuKarti` |
| Meydan | Hata ile boş durum **birebir aynı**: "0 arkadaş — Henüz arkadaşın yok." | `ChallengesPage.jsx` |
| Arkadaşlar | Ham sunucu metni + "Henüz arkadaşın yok" aynı anda | `FriendsPage.jsx` |
| Lig | Ham hata + "Bu ligde henüz kimse yarışmıyor" aynı anda | `LeaderboardPage.jsx:355` |
| Çalışma | Ham hata + "Henüz yanlışın yok" aynı anda | `CalismaPage.jsx` |
| Dükkân | Ham hata + bütün jokerler "0" | `JokerDukkani.jsx` |
| Mesajlar listesi | Yalnız ham sunucu metni | `MesajlarPage` |
| Mesaj gönderme | Ham sunucu metni (yazılan metin kutuda kalıyor — bu iyi) | `SohbetKutusu.jsx` |
| Bildirim zili | "Henüz bildirim yok" (kod `catch {}` ile sessiz geçiyor) | `BildirimZili.jsx` |

**Yapılacak.**
1. **Tek bir ortak bileşen** yaz: `oyun/components/DurumKutusu.jsx` (ad sana kalmış),
   üç durumu olan: `yukleniyor` / `hata` / `bos`.
   - `hata`: maskot + "Yüklenemedi." + **"Tekrar dene"** düğmesi (birincil).
     Ham sunucu metni oyuncuya **gösterilmez**, `console.error`'a yazılır.
   - `yukleniyor`: iskelet (skeleton) ya da net bir gösterge. Sahte veri asla çizilmez.
   - `bos`: mevcut boş durum metinleri korunur (Arkadaşlar, Mesajlar, Lig, Çalışma, Zil'inkiler iyi).
2. Yukarıdaki **12 yerin hepsinde** kullan. Kural:
   **hata varken boş durum çizilmez**, **yüklenirken sahte değer çizilmez**.
3. `ProfilePage.jsx:84`'teki `if (!profile) return "Yükleniyor…"` sonsuz döngüsünü kır:
   hata geldiyse hata durumu, hiç veri yoksa yükleniyor + zaman aşımı.
4. `BildirimZili.jsx`'teki `catch {}` sessizliğini kaldır, hata durumunu göster.
5. Ana sayfada "Seni bekleyenler" başlığı altında bekleyen davet yokken boş durum metni +
   "arkadaşına meydan oku" eylemi ekle (`Home.jsx:614-619`).

**Doğrula.** Playwright ile bütün istekleri 400 döndürüp 12 ekranı da çek;
hiçbirinde sahte veri/boş durum kalmadığını göster.

---

## B. Maç sırasında sesi kapatma — tek düğme

**Sorun.** Ses yalnız Profil › Ayarlar'da. Maç, düello, grup ve turnuva sırasında kapatılamıyor.
`Layout.jsx:152-157` yorumu: tema ve ses üst bardan kaldırılmış.

**Not.** `oyun/components/SesDugmesi.jsx` **var ama hiçbir yerde import edilmiyor.** Onu kullan.

**Yapılacak.** Maç ekranlarının kendi üst şeridine **tek bir ses düğmesi** koy
(açık/kapalı iki durum, ikon değişir). Klasik, Saf Bilgi, Düello, Grup, Turnuva, Çalışma:
**hepsinde aynı yerde, aynı görünümde.** Dokunma hedefi ≥ 44×44.
`bildim_ses` localStorage anahtarını **değiştirme**, mevcut değeri kullan;
Profil › Ayarlar'daki anahtar ile aynı değeri paylaşsın (biri değişince diğeri de değişsin).

---

## C. Ayarlara ulaşma — avatara dokununca açılan menü

**Sorun.** Ayarlara ulaşmak 3 adım: Profil sekmesi → ~900 px kaydır → "Ayarlar" sekmesi.
Ses ve dil de orada.

**Yapılacak.**
1. Üst çubuktaki **avatara dokununca** küçük bir menü açılsın. İçinde en az:
   - Profilim
   - Ayarlar (doğrudan Ayarlar sekmesine, kaydırmadan)
   - Ses (açık/kapalı anahtarı, B maddesiyle aynı değeri kullanır)
   - Dil (TR/EN, doğrudan değiştirir — `dilDegistir` şu an yalnız `src/pages/Login.jsx:42,145,154`'te
     kullanılıyor, giriş sonrası hiçbir yerde yok)
   - Çıkış Yap
2. Menü dışarı dokununca kapansın, klavyeyle gezilebilsin, dokunma hedefleri ≥ 44.
3. Profil › Ayarlar sekmesi **kalmaya devam etsin** — menü kısayol, yerine geçen değil.

---

## D. Maç sonu — rakip avatarına dokununca profil kartı

**Hafızadaki bekleyen iş.** Maç sonu ekranında rakibin avatarına dokununca `OyuncuKarti`
(profil kartı) açılsın. **Sadece avatar** dokunulabilir olacak, ad ya da skor değil.

**Uygula:** Klasik, Saf Bilgi, Düello, Grup, Turnuva — hepsinde (`MacSonuSahnesi` ortak bileşen).
Grup maçında podyumdaki ve listedeki her oyuncunun avatarı için de geçerli.

---

## E. Her maçtan çıkış yolu — parite

| Mod | Şu an | Olması gereken |
|---|---|---|
| Klasik | Sol üstte X var ✅ | — |
| Düello | "Düellodan çık" var ✅ | — |
| **Grup** | **Yok** (çıkış yalnız hazır kapısındaki "Vazgeç", `GroupMatchPage.jsx:145`) | Klasik'le aynı X |
| **Turnuva** | **Yok** (`TournamentPage.jsx` soru ekranı) | Klasik'le aynı X |
| **Çalışma turu** | **Yok** (`CalismaPage.jsx` tur ekranı) | X ya da "Turu bitir" |

**Yapılacak.** Klasik maçtaki çıkış düğmesini üç ekrana da ekle, **aynı yerde ve aynı görünümde**.
Onay penceresi davranışı da Klasik ile aynı olsun.
Ayrıca Klasik'teki X düğmesi 36×36 px — 44×44 yap (`MatchPage.jsx:~1001`).

---

## F. Rakip aramada sınırsız bekleme

**Nerede.** `oyun/components/RakipAra.jsx:~193` — ~15 sn sonra "Maç hazırlanıyor…" hâline geçiyor
ve maç kimliği gelene kadar saniyede bir yokluyor, **üst sınır yok**. Sunucu hiç dönmezse
oyuncu sonsuza dek bekler; "Beklemeden bot ile oyna" düğmesi de bu hâlde kayboluyor.

**Yapılacak.**
1. "Maç hazırlanıyor…" hâline **üst sınır** koy (öneri 30 sn). Sınır dolunca:
   "Maç başlatılamadı" + **"Tekrar dene"** + "Bot ile oyna" + "Vazgeç".
2. "Beklemeden bot ile oyna" düğmesi bu hâlde de görünmeye devam etsin.
3. Arama hatası çıkınca ekran aynı anda "Rakip aranıyor…" demeyi ve saniye saymayı bıraksın;
   "Tekrar dene" düğmesi gelsin.
4. Bot maçı açılamazsa ("Maç başlatılamadı…") ekranda yalnız "Vazgeç" kalmasın —
   "Tekrar dene" ve "Bot ile oyna" korunsun.
5. Aynı sorun Düello'nun kendi arama akışında da var mı kontrol et (`DuelloPage.jsx:~175`, `duello_ara`).

---

## G. Düello yükleme hatası — parite

`duello-yukleme-hatasi`: ham sunucu mesajı + yalnız "Düello'ya dön" var.
Klasik'te (`MatchPage.jsx:662-665`) "Tekrar dene" **ve** çıkış yolu var.

**Yapılacak.** Düello'ya da "Tekrar dene" ekle. Ham sunucu metnini gösterme (A maddesi kuralı).
Grup ve Turnuva yükleme hatalarını da aynı kalıba getir.

---

## H. Saf Bilgi olduğu belli olmuyor

Maç ekranında bunun jokersiz maç olduğunu söyleyen hiçbir şey yok — joker çubuğu
sadece kayboluyor. Oyuncu jokerlerin gittiğini "hata" sanabilir.

**Yapılacak.** Skor tabelasına ya da başlığa **mod rozeti** ekle ("Saf Bilgi · jokersiz").
Aynı rozet mantığını bütün modlara uygula (Klasik, Düello, Grup, Turnuva) —
oyuncu hangi modda olduğunu her zaman görsün.

---

## I. 404 sayfası yok

**Nerede.** `src/BildimApp.jsx` — `path="*"` → `/`.
- Oturum açıkken `/asdasd` sessizce ana sayfaya yönleniyor, "bu sayfa yok" denmiyor.
- Oturumsuzken adres `/asdasd` kalıyor, giriş ekranı çiziliyor; giriş yapınca nereye gideceği belirsiz.

**Yapılacak.**
1. Basit bir 404 sayfası: maskot + "Bu sayfa yok." + "Ana sayfaya dön" (birincil).
2. Oturumsuz hâlde geçersiz adrese gelen için: giriş sonrası ana sayfaya gitsin (belirsizlik kalmasın).
3. Hızlı Mod rotaları (`/hizli-mod`, `/hizli-mac/:id`) sessizce yönleniyor —
   "Bu mod şu an kapalı" diye tek satırlık bir not ekle, sonra yönlendir.
4. Var olmayan maç kimliğiyle (`/mac/olmayan-id`) "Yükleniyor…" hâlinde kalıyor.
   Gerçek Supabase `.single()` boş sonuçta hata döndürür; "Maç açılamadı · Tekrar dene"
   ekranının çıktığını **doğrula**, çıkmıyorsa düzelt.

---

## J. Dokunma hedefleri < 44×44

Hepsini **≥ 44×44 px** yap. Görsel boyutu büyütmek zorunda değilsin —
dokunma alanını `padding` ya da görünmez `::after` ile genişletebilirsin.

| Yer | Ölçülen | Dosya |
|---|---|---|
| Üst çubuk Profil (D) ve Görünüm (tişört) | 40×44 | `Layout.jsx` |
| Giriş TR/EN düğmeleri | 44×30 | `src/styles.css:212` |
| Giriş "Gizlilik politikası" / "Kullanım koşulları" | 85×16, 94×16 | `Login.jsx:246-248` |
| Tepki emojileri (maç sonu, grup maçı) | 34×34 | `MacSonuSahnesi`, `GroupMatchPage.jsx` |
| Maçtan çık (X) | 36×36 | `MatchPage.jsx:~1001` |
| Profil kartı kapat (✕) | 30×30 | `OyuncuKarti` |
| Arkadaş çıkar (✕) | 44×36, "Oyna"nın hemen yanında | `FriendsPage.jsx:398` |
| Dükkân sekmeleri | 115×40 | `JokerDukkani.jsx` |
| Mesaj yazma kutusu | 40 px yükseklik | `SohbetKutusu.jsx` |
| Düello "Kurallar nasıl işliyor?" | 32 px yükseklik | `DuelloPage.jsx` |

Arkadaş çıkarma (✕) düğmesini "Oyna"dan **ayır** — yanlış dokunma riski var.

---

## K. Giriş sayfası akış eksikleri

1. **"Bağlantı gönderildi" hâlinde geri dönüş yok** (`src/pages/Login.jsx:201-205`):
   form yerine yalnız bilgi kutusu kalıyor. Adresi düzeltme ya da yeniden gönderme yolu ekle.
2. **Geçersiz e-postada tarayıcının kendi balonu çıkıyor**, dili tarayıcının dilinde
   (Türkçe sayfada İngilizce "Please include an '@'…"). Uygulama içi Türkçe/İngilizce
   hata mesajı göster (`type="email" required` yerine kendi doğrulaman).
3. **Facebook düğmesi her zaman görünüyor**, sağlayıcı kapalıysa basınca hata veriyor
   (`Login.jsx:60-70`). Canlıda Facebook açık mı **kontrol et ve bana söyle**;
   kapalıysa düğmeyi gizle. Kendin karar verme, sor.

---

## L. Sunucudan gelen Türkçe metinler İngilizce'de çevrilmiyor

- **Günlük görev adları**: "10 doğru cevap ver" — maç sonu ekranında İngilizce'de Türkçe kalıyor.
- **Bildirim metinleri**: "Ayşe arkadaşlık isteğini kabul etti", "Tarih kategorisinde Usta oldun!"
  Yalnız bazı türler (meydan okuma) çevriliyor.

**Yapılacak.** İstemci tarafında `tt()` sözlüğüne bu metinlerin karşılıklarını ekle
(sunucudan gelen anahtar/tip ile eşleştirerek). **Sunucu tarafında çeviri üretme,
ANTHROPIC_API_KEY ekleme, otomatik çeviri kurma — yasak.**
Sözlükte karşılığı bulunmayan metin olduğu gibi gösterilsin, boş kalmasın.
Hangi anahtarların eklendiğini rapora yaz.

---

## M. Küçük eksikler

1. **Grup maçı hazır kapısı tutarsızlığı**: liste herkesi "hazır" gösterirken sayaç "0/4 hazır" diyor.
   Liste `group_match_players.hazir`'dan, sayaç nabızdan besleniyor. **İki kaynağı tek kaynağa bağla.**
2. **Turnuvada elenen oyuncu süreyi görmüyor**: "Oyuncular cevaplıyor…" var, sayaç yok.
   İzleyiciye de soru sayacını göster (`TournamentPage.jsx`).
3. **Mod seçim penceresinde ödül satırı kayboluyor**: `oyun_ayarlari` okunamazsa satır
   tamamen yok oluyor (`ModSecimPenceresi.jsx:43,84-89`). Yerine "—" ya da bekleme metni koy.
4. **Maç hazırlıkta davet geri çekilemiyor**: "Cevap bekleniyor — Sıla henüz kabul etmedi."
   (`MatchPage.jsx:677-685`). Daveti geri çekme düğmesi ve kalan süre bilgisi ekle.
5. **Arkadaş çıkarma onayı satır içinde sıkışıyor**: "Oyna | Sil | Vazgeç" üç düğme,
   "437 puan" iki satıra kırılıyor, soru cümlesi yok. Onayı küçük bir pencereye taşı:
   "Mert arkadaşlıktan çıkarılsın mı?" + Vazgeç (ikincil) / Çıkar (tehlike).
6. **Davet kodu gelmezse "–" görünüyor** (Arkadaşlar ve Profil › Ayarlar), paylaş düğmeleri
   soluk ama neden olduğu yazmıyor. Sebebi yaz + "Tekrar dene".
7. **Uzun soruda taşma**: 5 satırlık soruda D şıkkı ve joker çubuğu ekran altına iniyor,
   yazı boyutu küçülmüyor. Uzun soruda yazı boyutunu kademeli küçült, şıklar ve joker çubuğu
   ekrana sığsın (390×844'te ölç).
8. **1280×800'de joker çubuğu ve sohbet düğmesi ekran altında kalıyor**, joker etiketleri kesik.
   15 saniyelik soruda kaydırmak zorunda kalınmasın.
9. **Yasal sayfalarda üstte geri yolu yok** (`GizlilikPage.jsx`, koşullar): tek çıkış 2.700 px
   aşağıdaki "Ana sayfaya dön". Üste geri düğmesi ekle, **geldiği yere** dönsün.
10. **İletişim adresi kişisel Gmail** (`GizlilikPage.jsx` `ILETISIM`). Bunu **değiştirme**,
    bana hangi dosyada hangi satırda olduğunu söyle; adresi ben vereceğim.

---

## Bu pakette YAPILMAYACAKLAR
- Koyu tema (bugün kapalı) — ayrı tur.
- Gardırop ve Meydan 3B haritası — donduruldu.
- Ekonomi/coin/joker fiyatları, başlangıç coin, ücretsiz joker geri alma — yayın aşaması.
- Cloudflare oda sunucusu, harita görselleri — yayın aşaması.
- Yerleşim/boşluk/hiyerarşi gibi kozmetik işler — **Paket 42**.
- İngilizce soru bankası (ayrı iş, bana sor).

## Bitince rapor
`PAKET41_RAPOR.md` yaz: madde madde ne değişti (dosya:satır), hangi ekranları
hangi durumda test ettin, ölçümler. Kendi kendine test et; benden kontrol isteme.
Emin olmadığın yerde tahmin etme, sor.
