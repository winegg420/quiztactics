# Ekran Turu — canlı site, mobil boyut

- **Adres:** https://quiztactics.vercel.app · **Tarih:** 2026-10-02 15:59 UTC · **Betik:** `araclar/ekran-turu.mjs`
- **Görüntü:** 33 adet (2.93 MB; en büyüğü 99 KB) · **Ölçülen ekran:** 31
- **Süre:** 132 sn (3 koşu: statik 31 sn · dar+duello+klasik+en 62 sn · duello 39 sn) · **İstek:** toplam 1165, Supabase 301 · Supabase hata yanıtı: 400×2 · ses/müzik dosyaları indirilmedi
- **Bölüm başına Supabase isteği:** statik 74 · dar 16 · duello 27 · klasik 47 · en 44 (kalanı kabuğun açılış yüklemeleri)
- **Yöntem:** Chromium, telefon taklidi (dokunmatik, 2× piksel yoğunluğu), tek misafir oturum, yalnız gezme. Kontrast ekran görüntüsünün piksellerinden örneklenir (zemin = metin kutusunda en sık renk; metin = zemine en karşıt %4 piksel) — görsel/geçişli zeminde yaklaşık. Dokunma hedefinde çevredeki görünmez dokunma payı sayılır. Gerçek iOS Safari ölçülmedi.

## En kritik 10 bulgu

Otomatik ölçüm + 33 görüntünün (31 ölçülen ekran) gözle incelemesi birlikte. "Ölçüldü" = betiğin sayısı; "gözle" = görüntüden okundu, piksel ölçümü yok.

1. **Düello oyun içi belgelenemedi — hesapta Düello kilitli; Antrenman penceresi bunu söylemeden Düello'yu sunuyor.** Meydan Okumalar › Antrenman › "Düello" seçilebilir duruyor; dokununca sunucu 400 döner (`duello_davet_et`: "Düello'yu açmak için 5 maç daha oyna"), ileti düğmenin hemen altına yapışık çıkıyor, konsola hata + Sentry kaydı düşüyor (ölçüldü). Ana sayfadaki DÜELLO düğmesi, Modlar ve OYNA penceresindeki Düello kartı da kilidi göstermiyor (gözle). Oturum dosyasındaki 6 misafir hesabın hiçbirinde 5 bitmiş maç yok (veritabanından okundu: en çok 1), bu yüzden ban fazı, "RAKİP BANLADI" anı, soru çerçevesi, tur sonucu ve 5 yuva paneli YAKALANAMADI; yerine giriş ekranındaki kilit ve kurallar penceresinin ban + çerçeve rengi adımları alındı (`32`–`34`). `30-antrenman-duello-reddi`, `31-duello-giris`, `01`, `13`, `15`
2. **Ana sayfada Lig kartı turnuva bandının altında kesiliyor.** 390'da 4. sıranın satırı yarım (`01`), 360×640'ta oyuncunun kendi satırı yarım (`20`), İngilizcede bildirim kartı açıkken Lig kartından yalnız başlığın üst kenarı kalıyor (`70`). Gözle.
3. **Klasik soru ekranı cevaptan sonra yer değiştiriyor.** Cevap verilince joker çubuğu ve "6 joker kullanımın kaldı" satırı kalkıyor, soru kartı uzuyor ve dört şık yaklaşık 75 px aşağı kayıyor (`62` → `63`; iki görüntüde A şıkkı 472 px → 547 px). Gözle; rakibi beklerken parmağın altındaki şık değişiyor.
4. **360×640'ta Dükkân › Joker'in ilk ekranında satın alınabilir hiçbir şey yok.** İlk ürünün düğmesi ("50:50 — 60 coin") 555 px'te, alt menünün altında kalıyor; başlık + sekmeler + kural şeridi + Klasik/Düello seçici + bölüm başlığı ilk ~450 px'i dolduruyor (ölçüldü). `22-tr360-dukkan-joker`
5. **Battle Pass: Ejderha çerçeveli avatar "geri" düğmesinin üstüne biniyor.** Çerçevenin ejderha başı geri düğmesinin alt kenarına biniyor; iki genişlikte de (gözle). Alt düğme ("Battle Pass al · 500") iki boyutta da ilk ekranda (ölçüldü). `05`, `21`
6. **İngilizce ana sayfada "Battle Pass" rozeti sezon kartının başlığını örtüyor.** "Season 1 · Lv 0/28" yazısının "0/28" kısmı rozetin altında; Türkçede rozet "BP" olduğu için sığıyor (gözle). `70-en390-ana-sayfa`
7. **"Maçtan ayrıldın" sahnesi tek ekrana sığmıyor ve eylemleri iki kez gösteriyor.** Sayfa 940 px / ekran 844 px (96 px kaydırma, ölçüldü); kartta "Yeni maç bul · Ana sayfaya dön", alt çubukta "Rövanş · Yeni maç · ev" aynı anda (gözle); skor altındaki "puan" etiketi 1,95:1 kontrast (#46507f / #1d2152, ölçüldü); oyuncu adı "Arayu…" diye kesiliyor (ölçüldü). `65-klasik-mac-sonu-terk`
8. **Arkadaşlar: "Facebook'ta paylaş" düğmesi altındaki notun üstüne biniyor.** "Bu ay ödüllü davet: 0/10…" satırının üst yarısı düğmenin gölgesinin altında; ödül çipleri ile davet kodu kutusu arasında da boşluk yok (gözle). `11-tr390-arkadaslar`
9. **Lig tablosunda unvan şeridi ve sekmeler kesiliyor.** "Samsun Şampiyonu" → "Samsun Şam…", "Ankara Şampiyonu" → "Ankara Şampiy…" (TR 390 ve 360, EN 390; ölçüldü). Dört sekme sığmıyor: 360'ta "Dünya", İngilizce 390'da "World" sağ kenarda yarım (gözle). "Hafta bitimine 2 gün 5 saat" iki satıra kırılıyor; İngilizcesi tek satır. `03`, `23`, `72`
10. **Ana sayfada süren maç iki ayrı yerde gösteriliyor.** Üstte kırmızı "ozan06 ile Klasik Maç sürüyor · Devam et" kartı, altta "ozan06 ile maçın sürüyor" şeridi; ikisi de aynı maça gidiyor ve birlikte ~130 px yer alıyor (gözle). `01-tr390-ana-sayfa`

### Diğer gözlemler (daha düşük öncelik)

- **Düello giriş başlığı:** "Düello" lacivert yazı kırmızı zeminde 2,84:1 (büyük metin eşiği 3:1; ölçüldü). `31`
- **OYNA penceresi:** Düello kartında "En çok ödül" rozeti metni dar sütuna itiyor (açıklama 5 satır), ödül satırı iki satıra kırılıyor; kategori şeridi üçüncü öğede kesik (kaydırılabilir olduğunu gösteriyor). `15`
- **Joker adedi tutarsız:** "Hazır mısın?" kapısında üç jokerde de "×2" yazıyor; soru ekranındaki çubukta Ek Süre ve Soru Değiştir "2" rozeti taşırken 50:50'de rozet yok. `60`, `62`
- **Profil sekmeleri:** yalnız açık sekmenin adı yazıyor; diğer dört sekme etiketsiz ikon. `02`, `14`
- **Klasik 3-2-1:** "Hazır ol!" yazısı karartılmış zeminde zor okunuyor (geçici an, ölçülmedi). `61`
- **"Koleksiyonuna bak" bağlantısı** 125×19 px dokunma hedefi (ölçüldü). `09`, `10`
- **Metin / kural çelişkisi:** Modlar'da Klasik Maç "Hızlı cevap ver…", Saf Bilgi "bilgi, dikkat ve hız"; OYNA penceresinde Saf Bilgi "Sadece bilgi ve hız" — oyunda hız bonusu yok (PROJECT_CONTEXT › Ortak mekanik). `13`, `15`
- **Doğrulanmalı:** Klasik soru ekranının zemini pembe; PROJECT_CONTEXT "maç ekranları gök mavisi" diyor. Bilinçli bir mod rengi olabilir. `62`
- **Temiz çıkanlar (ölçüldü):** 31 ölçülen ekranın hiçbirinde yatay taşma yok; "Koleksiyonuna bak" dışında 44 px altı dokunma hedefi yok; Antrenman reddi dışında konsol hatası yok; Klasik soru ekranında dört şık ve joker çubuğu ilk ekranda, kaydırma yok.
- **Oturum notu:** tur, oturum dosyasındaki ilk misafir hesapla (ArayuzDenetim300) yapıldı; ana sayfadaki "ozan06 ile Klasik Maç sürüyor" kartı bu hesapta o sırada açık duran başka bir maçtı (betik o maça dokunmadı). Betiğin oynadığı tek maç ToyBot ile Antrenman Klasik: 2 soru, sonra "Maçtan çık".

## Otomatik ölçümün sıralaması (ilk 10)

1. **Konsol hatası** — Failed to load resource: the server responded with a status of 400 () (https://zfpnxzybcpkxsotwdsey.supabase.c · Failed to load resource: the server responded with a status of 400 () (https://zfpnxzybcpkxsotwdsey.supabase.co/rest/v1/rpc/duello_davet_et)  
   Ekran: `30-antrenman-duello-reddi`
2. **Konsol hatası** — [Bildim] antrenman maçı: {code: P0001, details: null, hint: null, message: Düello'yu açmak için 5 maç daha oyn · [Bildim] antrenman maçı: {code: P0001, details: null, hint: null, message: Düello'yu açmak için 5 maç daha oyna} (/assets/sentry-CRMtfotw.js)  
   Ekran: `30-antrenman-duello-reddi`
3. **Tek ekran olması gereken sahnede kaydırma** — sayfa 940 px, ekran 844 px · kaydırma 96 px  
   Ekran: `65-klasik-mac-sonu-terk`
4. **Birincil düğme ilk ekranda yok** — 「50:50 — 60 coin」 ilk ekranda görünmüyor · button.qt-dugme.qt-dugme--birincil · üst kenar 555 px, ekran 640 px · üstü örtülü  
   Ekran: `22-tr360-dukkan-joker`
5. **Düşük kontrast** — 1.95:1 — 「puan」 (span.msk-skor-etiket) · 12 px · metin #46507f / zemin #1d2152  
   Ekran: `65-klasik-mac-sonu-terk`
6. **Düşük kontrast** — 2.84:1 — 「Düello」 (h1.qt-baslik-1) · 34 px büyük metin (eşik 3:1) · metin #1d2152 / zemin #c93030  
   Ekran: `31-duello-giris`
7. **Kesilen metin (…)** — 「Samsun Şampiyonu」 (span.qt-unvan-metin) · tek satır · görünen 86 px, gereken 107 px  
   Ekran: `03-tr390-lig`, `23-tr360-lig`
8. **Kesilen metin (…)** — 「Ankara Şampiyonu」 (span.qt-unvan-metin) · tek satır · görünen 95 px, gereken 103 px  
   Ekran: `03-tr390-lig`, `23-tr360-lig`
9. **Kesilen metin (…)** — 「ArayuzDene…」 (span.msk-isim-metin) · tek satır · görünen 56 px, gereken 92 px  
   Ekran: `65-klasik-mac-sonu-terk`
10. **Kesilen metin (…)** — 「Samsun Champion」 (span.qt-unvan-metin) · tek satır · görünen 85 px, gereken 102 px  
   Ekran: `72-en390-lig`

## Yakalanamayanlar

- [klasik] Klasik — galibiyet/mağlubiyet maç sonu sahnesi (Lottie, ödül satırları): 20 soruluk maç sonuna kadar oynanmadı; yalnız "Maçtan ayrıldın" sahnesi alındı
- [duello] Düello: Antrenman maçı başlamadı — ekrandaki ileti: "Düello'yu açmak için 5 maç daha oyna"
- [duello] Düello oyun içi (ban fazı, RAKİP BANLADI anı, soru ekranı durum çerçevesi, tur sonucu, 5 yuva paneli): hesapta Düello KİLİTLİ — yeni oyuncu kilidi 5 bitmiş Klasik/Saf Bilgi maçı ister; tek kısa Klasik maç sınırıyla açılamaz

## Notlar

- [klasik] Klasik: 2 soru cevaplandı, 15 sn

## Ekran ekran bulgu tablosu

Sayılar o ekrandaki bulgu adedidir; `—` ölçülmedi (geçici an: yalnız görüntü).

| # | Ekran | Görüntü | Boyut · dil | Taşma | Kesik metin | <44 px | Kontrast <4,5 | Konsol | Birincil düğme ilk ekranda | Not |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ana sayfa | [01-tr390-ana-sayfa.jpg](01-tr390-ana-sayfa.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (2/2) |  |
| 2 | Profil | [02-tr390-profil.jpg](02-tr390-profil.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok |  |
| 3 | Lig | [03-tr390-lig.jpg](03-tr390-lig.jpg) | 390×844 · TR | 0 | 2 | 0 | 0 | 0 | yok |  |
| 4 | Görevler | [04-tr390-gorevler.jpg](04-tr390-gorevler.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok |  |
| 5 | Battle Pass (Sezon Yolu) | [05-tr390-battle-pass.jpg](05-tr390-battle-pass.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) |  |
| 6 | Dükkân › Joker › Klasik | [06-tr390-dukkan-joker-klasik.jpg](06-tr390-dukkan-joker-klasik.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (2/9) |  |
| 7 | Dükkân › Joker › Düello | [07-tr390-dukkan-joker-duello.jpg](07-tr390-dukkan-joker-duello.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (2/9) |  |
| 8 | Dükkân › Elmas | [08-tr390-dukkan-elmas.jpg](08-tr390-dukkan-elmas.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok |  |
| 9 | Dükkân › Çerçeve | [09-tr390-dukkan-cerceve.jpg](09-tr390-dukkan-cerceve.jpg) | 390×844 · TR | 0 | 0 | 1 | 0 | 0 | evet (1/1) |  |
| 10 | Dükkân › Avatar ve İsim | [10-tr390-dukkan-avatar-isim.jpg](10-tr390-dukkan-avatar-isim.jpg) | 390×844 · TR | 0 | 0 | 1 | 0 | 0 | evet (1/2) |  |
| 11 | Arkadaşlar | [11-tr390-arkadaslar.jpg](11-tr390-arkadaslar.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) |  |
| 12 | Meydan Okumalar | [12-tr390-meydan-okumalar.jpg](12-tr390-meydan-okumalar.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) |  |
| 13 | Modlar (kategori şeridi) | [13-tr390-modlar.jpg](13-tr390-modlar.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok |  |
| 14 | Ayarlar | [14-tr390-ayarlar.jpg](14-tr390-ayarlar.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok |  |
| 15 | OYNA penceresi (mod + kategori şeridi) | [15-tr390-oyna-penceresi.jpg](15-tr390-oyna-penceresi.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok | pencere: Nasıl oynamak istersin? |
| 20 | Ana sayfa | [20-tr360-ana-sayfa.jpg](20-tr360-ana-sayfa.jpg) | 360×640 · TR | 0 | 0 | 0 | 0 | 0 | evet (2/2) |  |
| 21 | Battle Pass (Sezon Yolu) | [21-tr360-battle-pass.jpg](21-tr360-battle-pass.jpg) | 360×640 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) |  |
| 22 | Dükkân › Joker | [22-tr360-dukkan-joker.jpg](22-tr360-dukkan-joker.jpg) | 360×640 · TR | 0 | 0 | 0 | 0 | 0 | **HAYIR** |  |
| 23 | Lig | [23-tr360-lig.jpg](23-tr360-lig.jpg) | 360×640 · TR | 0 | 2 | 0 | 0 | 0 | yok |  |
| 30 | Antrenman › Düello: sunucu reddi ("Düello'yu açmak için 5 maç daha oyna") | [30-antrenman-duello-reddi.jpg](30-antrenman-duello-reddi.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 2 | evet (1/1) | pencere: ToyBot ile antrenman |
| 31 | Düello — giriş ekranı | [31-duello-giris.jpg](31-duello-giris.jpg) | 390×844 · TR | 0 | 0 | 0 | 1 | 0 | evet (1/1) |  |
| 32 | Düello — kurallar penceresi, adım 1: aynı soru, aynı anda | [32-duello-kurallar-adim-1.jpg](32-duello-kurallar-adim-1.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) | pencere: Düello nasıl oynanır |
| 33 | Düello — kurallar penceresi, adım 4: soru ekranında çerçeve rengi | [33-duello-kurallar-adim-4.jpg](33-duello-kurallar-adim-4.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) | pencere: Düello nasıl oynanır |
| 34 | Düello — kurallar penceresi, adım 5: savunma banı | [34-duello-kurallar-adim-5.jpg](34-duello-kurallar-adim-5.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) | pencere: Düello nasıl oynanır |
| 60 | Klasik — "Hazır mısın?" kapısı (joker seti) | [60-klasik-hazir-kapisi.jpg](60-klasik-hazir-kapisi.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | evet (1/1) |  |
| 61 | Klasik — maç başı 3-2-1 | [61-klasik-geri-sayim.png](61-klasik-geri-sayim.png) | 390×844 · TR | — | — | — | — | — | — |  |
| 62 | Klasik — soru ekranı | [62-klasik-soru.jpg](62-klasik-soru.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok |  |
| 63 | Klasik — cevap verildikten sonra (geri bildirim / rakip bekleniyor) | [63-klasik-cevap-sonrasi.jpg](63-klasik-cevap-sonrasi.jpg) | 390×844 · TR | — | — | — | — | — | — |  |
| 64 | Klasik — "Maçtan çık" onay penceresi | [64-klasik-cikis-onayi.jpg](64-klasik-cikis-onayi.jpg) | 390×844 · TR | 0 | 0 | 0 | 0 | 0 | yok | pencere: Maçtan çıkarsan hükmen mağlup sayılırsın. |
| 65 | Klasik — maç sonu: "Maçtan ayrıldın" sahnesi (2 sorudan sonra çıkış) | [65-klasik-mac-sonu-terk.jpg](65-klasik-mac-sonu-terk.jpg) | 390×844 · TR | 0 | 1 | 0 | 1 | 0 | evet (2/2) | kaydırma 96 px |
| 70 | Home (EN) | [70-en390-ana-sayfa.jpg](70-en390-ana-sayfa.jpg) | 390×844 · EN | 0 | 0 | 0 | 0 | 0 | evet (3/3) |  |
| 71 | Shop › Jokers (EN) | [71-en390-dukkan-joker.jpg](71-en390-dukkan-joker.jpg) | 390×844 · EN | 0 | 0 | 0 | 0 | 0 | evet (2/9) |  |
| 72 | League (EN) | [72-en390-lig.jpg](72-en390-lig.jpg) | 390×844 · EN | 0 | 2 | 0 | 0 | 0 | yok |  |

## Ekran ayrıntıları

### 3 · Lig — `03-tr390-lig.jpg`

- Kesilen metin (2): 「Samsun Şampiyonu」 `span.qt-unvan-metin` 86/107 px · 「Ankara Şampiyonu」 `span.qt-unvan-metin` 95/103 px

### 6 · Dükkân › Joker › Klasik — `06-tr390-dukkan-joker-klasik.jpg`

- Birincil düğme ilk ekranın dışında: 「Soru Değiştir — 30 coin」 (üst 924 px) · 「Zaman Baskısı — 30 coin」 (üst 1098 px) · 「İkinci Şans — 60 coin」 (üst 1292 px) · 「Sigorta — 40 coin」 (üst 1557 px)

### 7 · Dükkân › Joker › Düello — `07-tr390-dukkan-joker-duello.jpg`

- Birincil düğme ilk ekranın dışında: 「Soru Değiştir — 30 coin」 (üst 924 px) · 「Zaman Baskısı — 30 coin」 (üst 1098 px) · 「İkinci Şans — 60 coin」 (üst 1292 px) · 「Baskın — 70 coin」 (üst 1557 px)

### 9 · Dükkân › Çerçeve — `09-tr390-dukkan-cerceve.jpg`

- 44 px altı hedef (1): 「Koleksiyonuna bak」 `a` 125×19 satır içi

### 10 · Dükkân › Avatar ve İsim — `10-tr390-dukkan-avatar-isim.jpg`

- Birincil düğme ilk ekranın dışında: 「Altın satın al — 100 elmas」 (üst 2551 px)
- 44 px altı hedef (1): 「Koleksiyonuna bak」 `a` 125×19 satır içi

### 22 · Dükkân › Joker — `22-tr360-dukkan-joker.jpg`

- Birincil düğme ilk ekranın dışında: 「50:50 — 60 coin」 (üst 555 px, örtülü) · 「Ek Süre — 20 coin」 (üst 730 px) · 「Soru Değiştir — 30 coin」 (üst 943 px) · 「Zaman Baskısı — 30 coin」 (üst 1118 px)

### 23 · Lig — `23-tr360-lig.jpg`

- Kesilen metin (2): 「Samsun Şampiyonu」 `span.qt-unvan-metin` 78/107 px · 「Ankara Şampiyonu」 `span.qt-unvan-metin` 87/103 px

### 30 · Antrenman › Düello: sunucu reddi ("Düello'yu açmak için 5 maç daha oyna") — `30-antrenman-duello-reddi.jpg`

- **Konsol:** Failed to load resource: the server responded with a status of 400 () (https://zfpnxzybcpkxsotwdsey.supabase.co/rest/v1/rpc/duello_davet_et)
- **Konsol:** [Bildim] antrenman maçı: {code: P0001, details: null, hint: null, message: Düello'yu açmak için 5 maç daha oyna} (/assets/sentry-CRMtfotw.js)

### 31 · Düello — giriş ekranı — `31-duello-giris.jpg`

- Kontrast < 4,5:1 (1; ölçülen metin 13): 「Düello」 2.84:1 `h1.qt-baslik-1` #1d2152/#c93030 büyük

### 65 · Klasik — maç sonu: "Maçtan ayrıldın" sahnesi (2 sorudan sonra çıkış) — `65-klasik-mac-sonu-terk.jpg`

- **Kaydırma:** sayfa 940 px, ekran 844 px
- Kesilen metin (1): 「ArayuzDene…」 `span.msk-isim-metin` 56/92 px
- Kontrast < 4,5:1 (1; ölçülen metin 15): 「puan」 1.95:1 `span.msk-skor-etiket` #46507f/#1d2152

### 71 · Shop › Jokers (EN) — `71-en390-dukkan-joker.jpg`

- Birincil düğme ilk ekranın dışında: 「Swap Question — 30 coins」 (üst 943 px) · 「Time Pressure — 30 coins」 (üst 1118 px) · 「Second Chance — 60 coins」 (üst 1312 px) · 「Insurance — 40 coins」 (üst 1576 px)

### 72 · League (EN) — `72-en390-lig.jpg`

- Kesilen metin (2): 「Samsun Champion」 `span.qt-unvan-metin` 85/102 px · 「Ankara Champion」 `span.qt-unvan-metin` 96/98 px
