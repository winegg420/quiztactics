# Quiz Tactics — Paket 42: KOZMETİK

Denetim raporundaki **53 🔵** maddesi. Oyun bunlarsız da çalışır ama
"profesyonel oyun" hissini bunlar verir.

**Ön koşul: Paket 40 ve 41 bitmiş olmalı.**

## Değişmeyen kurallar
- Mevcut kodu silme. Minimal değişiklik. Dosya silme/yeniden yazma yok.
- Yeni npm paketi yok. Şenlik dilinin dışına çıkma: `--bd-vurgu: #F4701F`,
  Baloo 2 / Nunito, `0 4px 0` kart gölgesi, basınca `translateY(4px)`.
- Yeni renk uydurma, mevcut paletten seç. Her değişiklikten sonra kontrastı ölç.
- Düzeltme **Düello dahil bütün modlara** uygulanır. Sormadan yap.
- `prefers-reduced-motion` korunur (denetimde ✅ çıktı, bozma).

---

## A. Düğme dili — tek kural, her yerde

**Sorun.** Aynı işi yapan düğmeler farklı görünüyor:
- Portal katmanlarında (arama, tanıtım) birincil düğme **beyaz yazılı**, uygulama içinde **koyu yazılı**.
  (Renk düzeltmesi Paket 40 E'de yapıldı — burada **görsel tutarlılığı** bitir.)
- "Hemen oyna" **sarı** (`.bd-ana-eylem`, `tema.css:273`), hemen altındaki "Lobiye katıl" **turuncu**.
  Marka vurgusu turuncu olduğu hâlde ana eylem sarı; hangisinin asıl eylem olduğu belirsiz.
- Ret düğmesi bir yerde **"Sil"**, bir yerde **"Reddet"** (`FriendsPage.jsx:333,388` vs Meydan).
- Meydan davet kartlarında "Reddet" kırmızı dolu + "Kabul" turuncu dolu — **iki dolu düğme yan yana**;
  geri alınamaz eylem birincil kadar ağır.
- "Lobiden Ayrıl" krem düz kutu — ne birincil ne `.btn.ikincil` gibi görünüyor (`TournamentPage.jsx`).
- Profil › Ayarlar'da **iki büyük dolu kırmızı düğme alt alta**: "Hesabımı sil" ve "Çıkış Yap".
  Çıkış geri alınabilir bir eylem, silme kadar ağır görünmemeli; silme de sayfanın en belirgin düğmesi olmamalı.

**Yapılacak — tek kural yaz ve her yere uygula:**
| Tür | Görünüm |
|---|---|
| Birincil | Turuncu dolu (`--bd-vurgu`), koyu yazı. Ekranda **tek tane**. |
| İkincil | Beyaz zemin + turuncu kenar + turuncu yazı (`.btn.ikincil`) |
| Tehlike (geri alınamaz) | Kırmızı **kenarlı**, dolu değil. Yalnız onay penceresinde dolu kırmızı. |
| Sessiz | Düz metin bağlantı |

1. "Hemen oyna"yı turuncu birincil yap, "Lobiye katıl"ı ikincil yap (ya da tersi — ama **ikisi de birincil olmasın**).
2. Ret metnini birleştir: arkadaşlık isteği ve davet → **"Reddet"**; kayıt silme → **"Sil"**.
3. Meydan davet kartlarında "Reddet"i ikincil/tehlike-kenarlı yap, "Kabul"i birincil bırak.
4. "Lobiden Ayrıl"ı `.btn.ikincil` yap.
5. Profil › Ayarlar: "Çıkış Yap"ı ikincil yap, "Hesabımı sil"i tehlike-kenarlı yap ve
   sayfanın en belirgin öğesi olmaktan çıkar.
6. `grep -rn "btn" oyun/pages oyun/components src/pages` ile tara, kurala uymayan düğmeleri listele ve düzelt.

---

## B. Ana sayfa yerleşimi

1. **Mod kartları ızgarası dengesiz** (`Home.jsx` "Başka nasıl oynanır" bloğu, `tema.css:2373`):
   Düello tam genişlik; Saf Bilgi ile Meydan Oku yan yana ama **farklı yükseklikte**
   (Meydan Oku'nun alt satırı yok); Turnuva yarım genişlikte **tek başına**, sağı boş; Hatalarım tam genişlik.
   → Izgarayı düzene sok: yan yana kartlar **eşit yükseklikte** olsun, tek başına kalan kart olmasın.
2. **"Haftalık lig bitimine 1 gün 13 saat" satırı** ayrı, soluk bir kartta; neye ait olduğu belli değil.
   → Lig kartının içine taşı ya da başlık ver.

---

## C. Mod seçim penceresi

1. **İlk kart seçilmiş gibi görünüyor**: pencere açılınca Klasik Maç odak halkasıyla turuncu çerçeveli
   (`ModSecimPenceresi.jsx:51`, `ilkRef.current?.focus()`). Masaüstünde fare hangi kartın üstündeyse
   o da turuncu → **iki kart aynı anda "seçili"**.
   → Odak halkasını yalnız klavye odağında göster (`:focus-visible`), fare odağında gösterme.
2. **Sürükleme tutamacı hareket vaat ediyor ama pencere sürüklenerek kapanmıyor**
   (`ModSecimPenceresi.jsx:110`, dokunma işleyicisi yok).
   → Ya sürüklemeyi çalıştır, ya tutamacı kaldır. **Tercih: sürüklemeyi çalıştır**
   (mobil oyunlarda beklenen davranış) — bütün alttan açılan pencerelerde aynı olsun.
3. **Masaüstünde pencere ekranın altına yapışık**, "Vazgeç"in altında boşluk yok (`tema.css:6725`).

---

## D. Rakip arama ve maç ekranı

1. **Başlık ile kutu çelişiyor**: başlık "Maç hazırlanıyor…" derken kutu hâlâ "Rakip aranıyor" yazıyor.
2. **"+10" puan uçuşu okunmuyor**: sarı (#FFC53D), açık yeşil şıkkın üstünde çıkıyor (`tema.css:2891`, `.bd-puan-ucus`).
   → Koyu renk + hafif gölge ver, anlık da olsa okunsun.
3. **Joker rozetleri karışıyor**: sayı rozetleri ("1", "2") ile fiyat rozetleri ("🪙 40") aynı köşede,
   aynı biçimde; "elinde var" ile "satın alınır" yalnız renk tonundan ayrılıyor.
   → Biçimlerini ayır (farklı köşe, farklı şekil ya da ikon).
4. **Maç hazırlıkta durum dili tutarsız**: "Beklenen: Sıla" derken asıl beklenen oyuncunun kendisi de
   olabiliyor; kendi adının altında "bekleniyor…", rakibin altında "ekranda" — iki farklı durum dili.
   → Tek dil kullan, kimin hazır olduğunu aynı biçimde göster.

---

## E. Maç sonu

1. **390'da yapışkan eylem çubuğu ekranın ~%25'ini kaplıyor**. Detay açılınca yalnız ilk iki satır
   görünüyor, gerisi çubuğun arkasında.
   → Çubuğu inceltin ya da Detay açıkken içeriğe alt boşluk ekle.
2. **Masaüstünde eylem çubuğu içerikten dar**, "Maç bitti ama oturum açık…" kartının alt kenarı
   çubuğun arkasında kalıyor.
3. **Tamamlanmış görev satırında ödül yönlendirmesi yok**: "10 doğru cevap ver · 10/10 ✓"
   → "Ödülünü Günlük Görevler'den al" gibi tek satır ipucu ekle.
4. **Turnuva ve Düello sonuç ekranlarında içerik kısa kalınca eylem çubuğu ekranın ortasında**,
   altında ~120-150 px boş alan kalıyor.
   → Çubuğu ekranın altına sabitle ya da içeriği dikeyde ortala.

---

## F. Düello

1. **Kategori seçim kuralı her turda tekrar okunuyor**: üç satırlık açıklama
   ("En zayıf kategori maç başında sabitlenir; yüzdeler eşitse…").
   → İlk turdan sonra tek satıra indir, "detay" ile açılabilir olsun.

---

## G. Grup maçı

1. **Oyuncu kendi adını üçüncü şahıs gibi okuyor**: "Deneme, Ayşe henüz kabul etmedi."
   (`GroupMatchPage.jsx:373`) → "Sen ve Ayşe" gibi doğal bir dil kullan.
2. **Sohbet/tepki şeridi skor tablosu ile soru kartının arasına sıkışmış**, soru kartını aşağı itiyor.
   → Şeridi alt tarafa al ya da daralt.

---

## H. Meydan okumalar

1. **Sayfa 390'da ~2.000 px uzunluğunda**: davetler, mod seçimi, kategori şeridi, bot listesi,
   Dereceli, arkadaşlar, Grup Maçı Kur, Oyuncular, Gönderdiğin, Bitenler alt alta.
   **Onlarca turuncu "Meydan oku" düğmesi** var; birincil eylem tek ve belirgin değil.
   → Bölümleri katlanabilir yap ya da sekmelere ayır. Listelerdeki "Meydan oku" düğmelerini
   **ikincil** yap, sayfanın tek birincil eylemi belirgin kalsın.
2. **Üstteki açıklama üç satır ve teknik**: "Bu sayfa bota ya da arkadaşına meydan okumak içindir.
   'Hemen oyna' ve 'Dereceli Maç'ın…" — **"Dereceli Maç" diye bir düğme artık yok.**
   → Tek cümleye indir, olmayan düğmeden bahsetme.

---

## I. Arkadaşlar

1. **Boş durumda "Davet linkini paylaş" iki kez** görünüyor (boş durum kartı + hemen altta
   "Arkadaş davet et" kartı) → birini kaldır.

---

## J. Mesajlar

1. **Çelişkili iki cümle**: artık arkadaş olmayan kişiyle boş sohbette üstte "İlk mesajı sen at."
   yazarken altta "Artık arkadaş değilsiniz — yeni mesaj gönderemezsin." yazıyor.
   → Arkadaş değilken "İlk mesajı sen at." hiç çizilmesin.
2. **Sohbette gün ayırıcı yok** ("Dün", "18 Eyl") — yalnız saat yazıyor, eski konuşmalarda
   hangi gün olduğu anlaşılmıyor. → Gün ayırıcı ekle.
3. **Liste ekranında geri/başlık çubuğu yok**; sohbet başlığında kişiye dokunmanın profil
   açtığını gösteren işaret yok. → Küçük bir ipucu (ok ya da alt çizgi) ekle.

---

## K. Profil kartı

1. **İstatistik satırı ile düğmeler arasında ~90 px boşluk** (kategori profili bloğu boşken yer tutuyor)
   → blok boşsa yer tutmasın.
2. **Ülke bayrağı Windows'ta "TR" harfleriyle çiziliyor** (bayrak emojisi yok).
   Telefonda sorun değil — düzeltmek zorunlu değil, ama emoji yerine küçük bir bayrak ikonu
   kullanmak masaüstünde de çalışır. **Karar senin, ne yaptığını rapora yaz.**

---

## L. Lig

1. **Arkadaş sekmesinde oyuncunun kendisi listede yok**, yalnız arkadaşlar var; kendini kıyaslayamıyor.
   → Kendi satırını da listeye ekle ("sen" rozetiyle).
2. **Ligim listesinde her satırda aynı turuncu kılıç düğmesi** (24 tane) — liste gürültülü.
   → Kılıcı ikincil/soluk yap ya da satıra dokununca çıkan menüye taşı.

---

## M. Dükkân

1. **Joker sekmesi envanterle ve kurallar listesiyle açılıyor**; satın alınabilir paketler
   ekranın altında, kaydırmadan görünmüyor. Dükkânda ilk görülen şey "satın al" olmalı.
   → Paketleri yukarı al, envanter ve kurallar alta insin.
2. **Coin azken Joker sekmesinin ilk ekranında bir fark yok**; "yetersiz" durumu ancak
   paketlere inince görülüyor. → Coin yetmiyorsa üstte tek satır uyarı ver.

---

## N. Profil

1. **İstatistik kutularının etiketleri anlaşılmıyor**: "1 — TURNUVAYA KALDI",
   "1 — MAÇ İLE SERİ BAŞLAR" (`ProfilePage.jsx:135,146`). Sayı ile etiket arasındaki ilişki belirsiz.
   → Tam cümle yaz: "Sıradaki turnuvaya 1 saat", "1 maç daha oyna, serin başlasın".

---

## O. Çalışma

1. **Banka boşken üç düğme (10 / 20 / 30) iki sütunlu ızgarada L şekli yapıyor**
   ("Bankan kadar" gizlenince 30 tek başına kalıyor). → Üç düğme varken ızgarayı 3 sütun yap
   ya da 30'u tam genişlik yap.

---

## P. Bildirim zili

1. **"2 yeni meydan okuma · 1 gün önce"** — okunmuş ve bir günlük satırda "yeni" yanıltıcı.
   → Okunmuş gruplarda "yeni" kelimesini kaldır.
2. **"Tümünü okundu say" yok**; 30 bildirimde panel içinde kaydırılıyor ama kaydırılabildiği belli değil
   (alt kenarda solma yok). → "Tümünü okundu say" ekle + alt kenara solma.
3. **Panelde kapatma düğmesi yok**, yalnız dışarı dokununca kapanıyor. → ✕ ekle (≥ 44×44).

---

## R. Gizlilik / Koşullar

1. **İngilizce metinde kalın ile düz metin arasında boşluk düşmüş**:
   "the **city and country**you choose", "We **don't collect**your device's GPS".
   Çeviri anahtarlarının sonundaki boşluk kaybolmuş.
   → Bütün çeviri anahtarlarını bu hata için tara, listesini rapora yaz.
2. **Uzun metinde bölüm atlama/içindekiler yok** → başlıklara bağlantılı kısa bir içindekiler ekle.

---

## S. Giriş sayfası

1. **E-posta alanı ve yer tutucu metni sistem yazı tipinde** (Arial kalın), sayfanın geri kalanı
   Nunito/Baloo. `oyun/styles/tema.css:3703` — `font-family` tanımlı değil, `input` yazı tipini devralmaz.
   → Bütün `input`, `textarea`, `select`, `button` öğelerine `font-family: inherit` ver.
   `grep` ile başka form öğesi kalmadığını doğrula.
2. **Hata kutusu formun en üstünde açılıyor**, bütün sayfayı ~46 px aşağı itiyor; hata,
   basılan düğmeden (Misafir, en altta) uzakta.
   → Hatayı basılan düğmenin yanında göster ya da sayfayı itmeyen bir yerde aç.
3. **İlk ekranda oyunu gösteren hiçbir görsel yok** (maskot, soru kartı, ekran görüntüsü):
   yalnız logo + iki satır + düğmeler. Mağazadan gelen biri ne oynayacağını görmeden hesap açmaya çağrılıyor.
   → Mevcut maskot görselini kullan (yeni görsel üretme, satın alma yok). Ne koyduğunu rapora yaz.

---

## T. 3:1–4,5:1 arası kalan kontrastlar

Paket 40'ta 3:1 altındakiler düzeltildi. Kalanlar:

| Yer | Metin | Ölçülen |
|---|---|---|
| Lig | "↑ YÜKSELME SINIRI" (11,5 px) | 3,02:1 |
| Lig | lig rozeti "Efsane" (11 px) | 3,59:1 |
| Maç ekranı | rakip adı "Sıla" (12,5 px, soluk çiziliyor) | 3,87:1 |
| Profil rozetler | kilitli rozet **adı** (12 px) | 4,26:1 |

Hepsini ≥ 4,5:1 yap, ölçümleri rapora yaz.

---

## U. Masaüstü düzeni — karar gerekiyor

Her ekran 1280'de **600 px'lik telefon sütunu**, alt sekme çubuğu ortada telefon düzeninde,
iki yan boş. Masaüstüne özel gezinme hiç yok.

**Bu bir hata değil** (telefon oyunu). Ama masaüstü oyuncusu için ayrı düzen hiç yok.
**Kendin karar verme.** Ne yapılabileceğini tek paragrafta yaz, bana sor.

---

## Bu pakette YAPILMAYACAKLAR
- Koyu tema (bugün kapalı, `oyun/lib/tema.js:26`) — 20'den fazla kontrast bulgusu var,
  tema açılacağı gün ayrı tur.
- Gardırop ve Meydan 3B haritası — donduruldu.
- Ekonomi, joker fiyatları, başlangıç coin, ücretsiz joker geri alma — yayın aşaması.
- İngilizce soru bankası — ayrı iş.
- "0 kişi lobide", "3 oyuncu hayatta" gibi düşük sayılar — ürün kararı, bana sor.

## Bitince rapor
`PAKET42_RAPOR.md` yaz: madde madde ne değişti (dosya:satır), 390 ve 1280'de
ekran görüntüleri ve ölçümler. Karar sorduğum maddelerde (K.2, U) kendi kararını verme, sor.
