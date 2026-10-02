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
