# Yayın öncesi kalite denetimi — 30 Eylül 2026

**Salt okunur denetim.** Hiçbir kaynak, migration, SVG ya da CSS dosyası değiştirilmedi. Yazılan tek şey bu klasör (rapor + ekran görüntüleri + ham ölçüm JSON'ları `_tara/`).

## Özet

Toplam **0 ENGEL · 7 ÖNEMLİ · 9 KÜÇÜK** bulgu. Yeni ekranların çoğu (ana sayfa düzeni, logo, dişli menü, alt menü, Sezon Yolu, Düello tahtası, maç sonu, kurulum, avatar ızgaraları) 390×844 ve 360×640'ta yatay taşmasız, ≥ 44 px hedefli ve TR/EN çevirisi tam çıktı. En büyük sorun **kart arka planı açıkken sarı yazının açık zeminde kalması** (rütbe çipi ve lig "sen" rozeti 1,19:1; arama ekranında Koleksiyon puanı 1,02:1; Düello joker ipucu ≈1,3:1). İkinci büyük konu **Düello'nun yük altında `57014 statement timeout` vermesi** (3 bot koşusunun üçünde takılma; temiz şartta tekrar ölçülemedi). Üçüncüsü **CPU 6× yavaşken Yağan Kar / Su Altı kartlarının ana sayfada 23 / 33 fps'e düşmesi**.

**Nasıl ölçüldü (önemli):** Canlı siteyi (quiztactics.vercel.app) taramaya başladıktan ~150 istek sonra Vercel *Güvenlik Kontrol Noktası* ("Tarayıcınız doğrulanamadı · Kod 21", 403 / 708) beni engelledi; `curl` bile 403 aldı (bkz. Ö6). Bu yüzden ölçümler **aynı commit'in (HEAD `0290ff80`) üretim derlemesiyle yerel sunucuda, aynı Supabase'e karşı** yapıldı (`vite build` temiz; çalışma ağacındaki 2 commitlenmemiş dosya — `BildimApp.jsx` Düello-tahta önizleme rotası, `ceviri/mac.js` — derlemede var, diğer pencerelerin işi). Gerçek Chromium (Chrome), dokunmatik mobil taklidi, DSF 2. Kontrast: metin piksellerini saydam yapıp parçacık katmanını gizleyerek alınan **taban kareye** karşı, kutudaki piksellerin en kötü %5'i (p5) ve medyan birlikte; p5 tek başına ihlal sayılmadı, medyan da düşükse ya da ekran görüntüsünde doğrulandıysa bulguya girdi.

---

## ÖNEMLİ

### Ö1 — Kart arka planında sarı yazı, açık çip üstünde (4 arka planın hepsi)
- **Sayfa / boyut:** Ana sayfa oyuncu kartı "Çaylak" rütbe çipi; Lig sayfası kendi satırındaki "sen" rozeti. 390×844 ve 360×640.
- **Ölçüm:** `Çaylak` rgb(255,210,63) üstünde rgb(236,230,255) → **1,19:1** (medyan da 1,19; eşik 4,5). `sen` aynı → **1,19:1**. Aynı nedenden `Lv 1` 4,15–4,23:1 (Su Altı/Kar), `Puan` etiketi 4,22–4,41:1 (Su Altı/Sonbahar) — sınırda.
- **Görüntü:** `arkaplan-sualti-ana-390-tr.png` (çip neredeyse görünmez), `lig-satir-gece-390.png`, `lig-satir-{kar,sualti,yaprak}-{390,360}.png`, `arkaplan-{kar,yaprak,gece}-ana-390-tr.png`.
- **Kök sebep:** `oyun/tasarim/arka-plan/arka-plan.css:126` — `.as-ko.abp-sahip` / `.lg-ben.abp-sahip` için `--qt-ikinci-koyu: #FFD23F`; çiplerin zemini açık lavanta kaldığı için sarı yazı yutuluyor. (Düzeltme yapılmadı.)

### Ö2 — Koleksiyon puanı (`#ffd23a`) açık zeminde
- **Sayfa / boyut:** Rakip arama ekranı "Rakip bulundu" VS karesi (AramaSahnesi, ~2 sn), 390×844 ve 360×640. Ayrıca profil vitrin kartı üstünde Yağan Kar ile `Koleksiyon 41` 4,0:1 (mavi zemin, sınırda).
- **Ölçüm:** `Koleksiyon 11` rgb(255,210,58) / rgb(188,215,238) → **1,02:1** (ardışık iki karede, tüm arka planlarda aynı).
- **Görüntü:** `vs-gece-390-2.png`.
- **Kök sebep:** `oyun/tasarim/ekranlar/koleksiyon-puani.css:20` `.qt-ok-kp { color:#ffd23a }` koyu kart varsayımıyla yazılmış; arama ekranındaki küçük vitrin kartı açık gök zeminde çiziliyor (`oyun/components/OyuncuVitrinKarti.jsx`).

### Ö3 — Düello joker çubuğunda sarı ipucu metni
- **Sayfa / boyut:** Düello soru ekranı, alt joker çubuğu — "Şimdi kullanabilirsin." ve kilit notu; 390.
- **Ölçüm:** `--qt-coin #ffc933` açık lavanta-mavi (~#EAF0FB, ekran görüntüsünden) → hesapla **≈1,3:1**. Not: bu karede DOM ölçümü alamadım (maç geçici); değer ekran görüntüsündeki zemine göre hesaplandı.
- **Görüntü:** `duello-soru-1-390.png`.
- **Kök sebep:** `oyun/pages/DuelloPage.a.css:270` `.m2-skill--acik .m2-skill-ipucu { color: var(--qt-coin) }` (açık tema Düello'da).

### Ö4 — Düello yük altında sunucu zaman aşımı, ekran takılması
- **Görülen:** 3 ayrı `oyuncu-testi --mod=duello` koşusunda (B hesabı, yerel derleme) konsolda `500` + `[Bildim] düello yüklenemedi: {code: 57014 … statement timeout}`; sonuçlar: "kategori sırası bende ama seçilebilir kategori yok", "savunan · sonraki tur — şıklar kapalı (UI fazı `kategori`, sunucu `cevap`)", "şıka dokunuldu ama cevap sunucuya ulaşmadı". Bir koşuda Klasik de `mac_nabiz: 10000 ms içinde yanıt gelmedi` verdi.
- **Bağlam:** Aynı saatlerde başka pencere `gorevler-yaris-testi` (DB yarış testi) çalıştırıyordu; ayrıca pg-mini bağlantım 20 sn zaman aşımına uğradı. Yani **yük altında**; temiz, tek başına bir koşuda tekrar ölçemedim. Ama istemci 57014'te takılıp sahneyi güncellemiyor.
- **Kök:** hata `oyun/pages/DuelloPage.jsx:516`'da yakalanıyor (çağrı: durum RPC'si, Düello). Sunucu tarafı RPC süresi ayrıca bakılmalı.
- **Kanıt:** `_tara/` dışında günlük yok; oyuncu-testi çıktıları oturum içinde (kaydetmedim).

### Ö5 — Hareketli kart: CPU 6× yavaşken kare hızı düşüyor
- **Ölçüm** (ana sayfa, 390×844, 4 sn rAF): arka plan yok 59,9 fps · **Sonbahar 56,9** · **Yıldızlı Gece 53,0** · **Su Altı 33,3** (en uzun kare 99 ms) · **Yağan Kar 23,3** (en uzun kare 117 ms). CPU 1×'te hepsi 60 fps.
- **Sayfa başına hareketli kart:** ana 1, profil 1, lig satırı 0 (sabit), maç başı "Hazır" kapısında kendi kartın 1. Sınır (3) aşılmıyor.
- **Kök:** `oyun/tasarim/arka-plan/KartArkaPlan.jsx` (kar/su parçacık sayısı). Maç başı kartında kare hızı **ölçülemedi** (maç zamanlaması).
- **Ham:** `_tara/perf.json`, `_tara/perf2.json`.

### Ö6 — Canlı sitede Vercel Güvenlik Kontrol Noktası
- **Görülen:** Tek IP'den dört paralel başsız tarayıcı (~150 sayfa yüklemesi) sonrası canlı site her sayfa yerine "Tarayıcınız doğrulanamadı · Kod 21" sayfası verdi; `/.well-known/vercel/security/request-challenge` 708; `curl` 403.
- **Görüntü:** yok (engel sayfası görüntüsü yerel koşuyla üzerine yazıldı; metin: "Tarayıcınız doğrulanamadı — Kod 21 — Vercel Güvenlik Kontrol Noktası"). Gerçek kullanıcının (aynı NAT'tan çok oyuncu, yurt/okul Wi-Fi) etkilenip etkilenmediği **ölçülemedi**.
- **Kök:** depo dışı (Vercel Firewall / Bot koruması ayarı). Yayın öncesi bilmek için yazıldı.

### Ö7 — Lig grubu 25 kişi değil, 76
- **Görülen:** Yeni hesap Bronz grup 1'e düştü: ana sayfada **`25/76`**, Lig sayfasında `#25`; DB'de bu haftaki Bronz grup 1 = 76 satır, grup 2 = 25 (`lig_grup_boyu` = 25).
- **Kök:** `lig_uyeligi_kur` (migration `20260612000275_lig_uyelik_ve_misafir_suzgeci.sql`) doluluğu yalnız görünür üyelerle sayıyor; gizli/açık-bot/eksik-kurulum satırları (çoğu test hesabı) gruba yazıldığı için grup 25'i aşıyor. Sonuç: yeni oyuncu doğrudan 25/76 (en dipte, 93 puan) başlıyor ve toplam grup boyu görünüyor.
- **Görüntü:** `ana-390x844-tr.png`, `lig-390-tr.png`.

---

## KÜÇÜK

- **K1 — Olmayan PNG'ler 404:** `/kozmetik/premium/ejderha.png` ve `/kozmetik/premium/kraliyet-tac.png` — Profil › Koleksiyon ve Dükkân › Çerçeve açılınca konsolda 2 × `404`. Tasarım gereği yedek (kod çizimi) devrede, işlev bozuk değil. Kök: `oyun/tasarim/premium/tur2/Cerceve2.jsx:26-27`. **Bilinen "360 px 404 uyarısı" bu**; boyuta bağlı değil.
- **K2 — Dokunma hedefi 42–43 × 44 px:** Turnuva lobisi oyuncu adı düğmeleri (`button.ls-ad-dugme`, kısa adlar: `sena_`, `elifsu`), 390 ve 360. Görüntü `turnuva-390-tr.png`.
- **K3 — Sınırda kontrastlar (4,5 altı, ≥ 3,4):** Meydan `Kolay` rozeti 3,94; Dükkân `1 ×` adet 4,33 (opaklık .8); Hazır kapısı joker `×2` 4,45; Sezon Yolu `?` yer tutucu 3,45. Kök: `.qt-dk-fiyat-adet`, `.sy-soru`, Hazır kapısı adet rengi (`#137a45` açık lavanta üstünde).
- **K4 — 360×640 ana sayfa:** turnuva bandı lig kartının alt kenarına biniyor (ölçüm: `a.as-lk` ∩ `button.as-serit--lobi`). Görüntü `ana-360-tr.png`. 390'da yok.
- **K5 — Kurulum penceresi 360×640:** alt satırdaki hesap şeridi (avatar + ad) pencere kenarında kırpık. Görüntü `kurulum-360-tr-05-avatar-secili.png`.
- **K6 — Söz birliği:** Lig sayfasında "Sezon bitimine 4 gün", ana sayfada "Hafta bitimine 4g" ve ayrı bir "Sezon Yolu" (28 gün) var; "sezon" kelimesi iki şeye gelecek. Görüntü `lig-390-tr.png`.
- **K7 — EN'de kalan Türkçe (yalnız özel isim):** ülke adları (`Champion of İtalya`, `Filipinler`) ve şehir (`İstanbul`). PROJECT_CONTEXT'te "ülke metni tek dil" diye yazılı; şehir için karar Ida'nın.
- **K8 — Test hesapları canlı ligde:** `ArayuzDenetim…` (çok sayıda, 20–30 Eylül), `Test4272` gibi hesaplar Bronz liste ve turnuva lobisinde görünüyor; yayın öncesi temizlik gerekir (benim 7 `Denetim####` hesabım silindi).
- **K9 — Dükkân Arka Plan küçük örnekleri:** Yağan Kar küçük önizlemede kar taneleri `Lv 17` yazısının üstünü örtüyor (sabit örnek). Görüntü `dukkan~Arka_Plan-390-tr.png`.

---

## Bilinen iki konunun kaynağı

- **Avatar nadirlik sayfasındaki 401:** Gerçek hata değil, sunucunun doğru cevabı. `avatar_nitelik_yonetici` RPC'si oturumsuz/süresi dolmuş anahtarla **401** dönüyor (`42501 permission denied`; süresi dolmuş JWT'de `PGRST303`). Sayfa oturumsuz açılamaz (giriş ekranı gelir; ölçümde 0 istek hatası), yani 401 sahip kapısını **taklit eden test düzeneğinin** süresi dolmuş oturumuyla görüldü. Düzeltme gerekmiyor.
- **360 px'teki 404:** K1 (PNG yuvaları). Boyuta bağlı değil, kozmetik sekmelerinde hem 390 hem 360'ta aynı.

## Temiz çıkan sayfalar (390×844 ve 360×640, TR ve EN)
Ana sayfa · Düello lobisi · Arkadaşlar · Mesajlar · Çalışma · Gizlilik · Hızlı Mod (kapalı notu + ana sayfaya dönüş) · 404 · Avatar önizleme · Sezon Yolu (sahip değil → ana sayfaya döner) · Dükkân sekmeleri Arka Plan / Avatar / İsim Efekti / Tepki / Elmas / Coin · Gizlilik (oturumsuz).
Yalnız K-maddeleri olanlar: Turnuva (K2), Profil sekmeleri ve Ayarlar (Ö1/K3 etkisi yok; yalnız nadirlik açıklama şeridi p5 artefaktı), Dükkân Çerçeve (K1), Koleksiyon (K1), Meydan (K3), Koşullar (yalnız EN'de özel isim "Türkiye"), Sezon Yolu sahip (K3).

## Belirtilen kontrol listesi — sonuçlar
- **Yatay taşma:** 0 (tüm sayfa × boyut × dil). **Dokunma hedefi:** yalnız K2. Kesilen metin: yalnız görünmez (`qt-gizli`) etiketler ve tasarım gereği `…` adlar.
- **TR/EN:** çevrilmemiş/ham anahtar yok. (Not: EN ölçümü için hesabın `profiles.dil` değeri geçici `en` yapıldı, sonra `tr`; yalnızca istemci taklidi kozmetik adlarını TR bırakıyordu — sunucu profil dili belirleyici.)
- **Logo / üst çubuk:** tam yatay logo her yerde 144 px, Q'ya inmiyor. **Dişli menü:** Profilim · Ayarlar · Müzik · Efektler · TR/EN · Çıkış Yap, 44 px satır (`ana-disli-menu-*.png`). **OYNA ve DÜELLO** 390×664 ve 360×640'ta alt menünün üstünde, ilk ekranda. **Profil kartı yüksekliği** 103 px (360×640'ta 95). **Alt menü** tek satır (1,0) tüm etiketlerde. Turnuva bandı görünür. Lig sayfasında "Yükselme hattı" kesikli çizgi görünür (`lig-satir-gece-390.png`).
- **Sezon Yolu (taklit sahip):** iki kol (Ücretsiz / Battle Pass'li) alt menünün üstünde, 390×844'te tam görünür (`sezon-yolu-sahip-390-tr.png`); rozet ana sayfa profil kartında (44×44); dişli menüde "Sezon Yolu" satırı yalnız sahipte; sahip değilken satır ve rozet yok, `/sezon-yolu` ana sayfaya dönüyor (TR/EN, iki boyut). Sezon sistemi AÇILMADI.
- **Kart arka planları (Su Altı, Yağan Kar, Sonbahar, Yıldızlı Gece):** parçacıklar yazının arkasında (ana 0/7, profil 0/4 yazı parçacığın önünde kalmadı); "hareketi azalt" açıkken çalışan animasyon 0, iki kare farkı 0,0000 (ana, profil, lig, maç başı Gece); normal modda ana/profil 1 hareketli kart, lig satırı sabit. Başka sayfalarda "azalt" açıkken sonsuz animasyon 0 (ana sayfada normalde yalnız turnuva bandı nabzı ve KATIL zıplaması çalışıyor, azalt'ta duruyor).
- **Avatar / çerçeve:** kurulum ızgarasında 62 avatar, bozuk görsel 0, **Kedili Genç (`kedili-genc-y36`) var, Sporcu yok**; çerçeveler (Sonbahar/Galaksi/Sakura) Dükkân'da taşmadan çiziliyor (`dukkan~Çerçeve-390-tr.png`); ana kart, lig satırı, maç başı, Düello maç sonu avatarlarında kırpık/yay kalıntısı görmedim.
- **Maç başı (Hazır kapısı):** iki oyuncu kartı, kendi kartın kendi arka planıyla (Gece/Kar/Sonbahar/Su Altı), rakip (bot) kartı koyu lacivert — `vs-gece-390-3.png`, `vs-kar-390-3.png`, `vs-gece-390-azalt-3.png` (azalt'ta yıldızlar sabit). Not: arama ekranındaki "Rakip bulundu" VS karesinde kart arka planı yok (`vs-gece-390-2.png`); Ida'nın istediği yer "maç başı" ise bu ikinci ekran farklı çiziliyor.

## Uçtan uca akışlar
- **Yeni kullanıcı kurulumu** (misafir → takma ad → avatar → şehir → ana sayfa): takılma yok; TR 390 ve 360, EN adım 3 görüldü. Misafir girişi bu yükte ~4 sn sürdü (`Signing in…` ≥ 3 sn). Görüntüler `kurulum-*`.
- **Klasik (bota karşı):** 5 maç, her soruda şık dokunulabilir ve sunucuya ulaştı; 20/20 soru; maç sonu tek ekran (`klasik-soru-390.png`, `klasik-mac-sonu-390.png`). Yeni hesabın Düello kilidi 5 maçla açıldı.
- **Düello (bota karşı):** yuva tahtası (4'lü boş yuva, tur noktaları), "Boş kategoriler · al" kartları, alt çubuk ("Sinema tutarsa Sen 0→1"), savunmada "Hazır" işareti ve sırası gelince öncedenseçili kart (çalıştı: 4/5), 390 ve 360'ta kaydırmasız (`duello-tahta-*.png`, `duello-kategori-1-390.png`). **Baskın düğmesi** saldıran soru ekranında görünür (70 coin etiketli, basılmadı, `duello-soru-1-390.png`). **Kalkan** düğmesi savunan turda **görüntülenemedi**. **Maç sonu yuva özeti** görüldü: "Bu sefer olmadı · 0-2 geride, kaybettin", 0–2 yuva, XP/görevler, Rövanş / Yeni düello (`duello-mac-sonu-390.png`). Ö4 nedeniyle oyuncu-testi'nin tam kapsamı (3 saldıran + 3 savunan) geçemedi.
- **Dükkân arka plan / avatar önizleme:** Arka Plan sekmesi örnek kart + "Satın al 300" (basılmadı), Avatar sekmesi. Coin/elmas harcanmadı.
- **Lig kendi satırın:** görünür, arka planla sabit (`lig-satir-*.png`); Ö1 burada.

## Performans (yerel sunucu; ağ süresi ölçülmedi)
İlk yük CPU 1× / 4× (FCP · LCP ms, JS gzip): ana 152·168 / 416·648 (381 KB) · profil 172·240 / 452·620 (402 KB) · lig 144·192 / 436·652 (440 KB) · Düello lobisi 148·196 / 404·604 (400 KB) · Turnuva 140·192 / 412·612 (441–493 KB) · Meydan 144·760 / 424·1592 (432 KB) · **Dükkân 140·876 / 408·1776 (596 KB — en ağır)** · **Arkadaşlar LCP 2028 ms (1×)** (veri bekliyor). Ham: `_tara/perf.json`. Canlı ağdan süre **ölçülemedi** (Ö6).

## ÖLÇÜLEMEYENLER
Gerçek iPhone ve WebKit (bu makinede çalışmıyor) · ses (müzik `.aac` istekleri sayfa geçişinde `ERR_ABORTED` — çalma doğrulanamadı) · gerçek iki kişilik maç · push bildirimi · canlı (Vercel) ağ süreleri ve gerçek cihaz kare hızı · maç başı kartında kare hızı · Kalkan düğmesi görseli · ana sayfa lig kartındaki "yükselme çizgisi" etiketi (test hesabı 25. sıra, çizgiden uzak; Lig sayfasındaki çizgi görüldü) · alt menüde "sessiz rozet" (yeni hesapta rozet çıkmıyor) · Dükkân Arka Plan sekmesinde hareketli kart sayısı (oturum süresi bitti) · Düello temiz (yük dışı) koşu.

## Temizlik ve yan etkiler
- 7 test hesabım (`Denetim1548/7362/6239/8812/2497/7714/8701`) uygulamanın kendi `hesabimi_sil()` mantığıyla silindi (DB'de doğrulandı: profil 0, auth 0). Sezon ayarı (`sezon_yolu_acik`) dokunulmadı; coin/elmas harcanmadı.
- Geçici değişiklikler geri alındı: test hesabına verilen 'hediye' arka plan kozmetikleri ve takılı arka plan silindi; hesabın `dil` değeri `tr`'ye döndü.
- **Önceden var olan** `ArayuzDenetim758` test hesabına, ilk başarısız canlı/yerel oyuncu-testi koşularında 1 Klasik + birkaç Düello maçı eklendi (başka pencereler bu hesabı kullanıyor olabilir).
- Test altyapısı (betikler, geçici derleme, sunucu) depo dışında, oturum scratchpad'inde; depoya eklenen yalnız bu klasör.
