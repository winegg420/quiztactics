# Kategori dağıtımı — genel_kultur taraması (2 Eki 2026)

Migration: `supabase/migrations/20260612000851_genel_kultur_tarama.sql` · Geri alma: `docs/KATEGORI_DAGITIM_YEDEK.json`

## Özet

- Canlıda `genel_kultur`: **1507** soru (730 aktif, 777 zaten pasif). `genel` ve `karisik`'te soru yok (migration 056).
- Taranan: **730 aktif soru**. Zaten pasif 777 soruya dokunulmadı, tekrar açılmadı.
- **Pasife alınan: 206** — ipucu 110 · basit 43 · kalite 25 · zor 19 · belirsiz 5 · güncellik 3 · yanlış-bilgi 1
- **Taşınan: 5** — spor 2 · tarih 1 · bilim 2
- **genel_kultur'da kalan aktif: 519** (düşük güvenle tutulan: 31)
- Soru metni, şıklar, doğru cevap, zorluk değişmedi.

## Karar kuralları

- **ipucu:** doğru şık açıklama cümlesi olup çeldiricilerden belirgin uzunsa ya da tek çok kelimeli şıksa (şık denge kapısı);
  ayrıca Jev şık ipucu testine (soru metni gizli, > 0,8) takılan açıklama cümlesi şıklı sorular.
  Özel ad, terim ya da sayı olan doğru şıklar uzunluk/ün nedeniyle işaretlense de **tutuldu** (düşük güven).
- **basit:** çocuk düzeyi bilgi ya da çeldiricileri şaka gibi olduğu için bilgisiz bulunan sorular.
- **zor:** yakın yıllar arasında yıl ezberi, uzmanlık terimi, az bilinen kişi adı.
- **kalite:** bozuk/yarım şık ("... yalnızca", "... yok", "... hep"), belirsiz soru cümlesi.
- **belirsiz:** birden çok savunulabilir cevap (ör. Nobel dal sayısı 5/6, Türk damasında taş düz ilerler).
- **güncellik:** en yüksek bina, üretim lideri gibi değişebilen sıralamalar (Jev eskiyebilirlik ≥ 0,7 dahil).
- **hassas:** yok. Jev'in 0,6 dolayında işaretlediği sorular (toplumsal cinsiyet eşitliği, kutsal inek, öşür) kışkırtıcı değil; tutuldu.
- **Kategori:** yalnız Jev ile aynı fikirde olunan, belirgin konulu sorular taşındı. Migration 317 bu havuzu
  zaten bir kez dağıttığı için kalanların çoğu gerçekten genel (para birimi, simge yapı, mitoloji, mutfak, deyim).
  Jev'in tek geçişte başka kategori dediği ama taşınmayan ~145 soru bilinçli olarak yerinde bırakıldı.
  Jev ile ayrışılan iki aday (375 Itri → müzik, 629 öşür → tarih) temkinli davranılıp taşınmadı.
- **Jev çapraz kontrol:** 730 soru, 1.460 çağrı, ≈ 0,05 $. Doğru cevapta tek ciddi ayrışma no 687
  (pul biriktirme → Filateli; Jev "Numismatik" dedi, Jev yanılıyor, soru tutuldu).
- **Dokunulmayan tekrarlar (ayrı iş olabilir):** aynı bilgiyi soran aktif çiftler kaldı —
  6/19 (samba), 14/490 (minber), 54/128 (mihrap), 16/481 (anayasa), 64/526 (gros), 138/599 (deste),
  163/448 (knot), 221/608 (LEGO), 244/255 (Sevgililer Günü), 285/528 (karat), 289/726 (dinamit),
  493/661 (nümismatik), 639/687 (filateli), 593/617 (tavla), 213/626 (Vatikan), 404/646 (Aşil).

## Tam tablo (730 soru)

| No | Soru | Doğru cevap | Değişiklik | Güven |
|---:|---|---|---|---|
| 1 | Gregoryen takvimde 100'e bölünen bir yılın artık yıl olması için ayrıca kaça bölünmesi ge… | ✔ 400 | kalır | yüksek |
| 2 | Bir ürünün garanti süresi neyi ifade eder? | ✔ Ücretsiz onarım süresini | kalır | yüksek |
| 3 | Bir elin kaç parmağı vardır? | ✔ 5 | PASİF · basit | yüksek |
| 4 | İngilizce Scrabble oyununda Q ve Z harflerinin her biri kaç puandır? | ✔ 10 | kalır | yüksek |
| 5 | İtalyan kahvesi 'cappuccino' adını hangi grubun giysisinin renginden alır? | ✔ Kapuçin keşişleri | kalır | yüksek |
| 6 | Samba hangi ülkeyle özdeşleşmiştir? | ✔ Brezilya | kalır | yüksek |
| 7 | Okuryazarlık oranı hangi göstergeye girer? | ✔ Eğitim düzeyi göstergesine | PASİF · basit | yüksek |
| 8 | Türkiye'de mavi bayrak uygulaması neyi belgeler? | ✔ Plaj ve deniz temizliğini | kalır | yüksek |
| 9 | Nestlé hangi ülkenin gıda şirketidir? | ✔ İsviçre | kalır | yüksek |
| 10 | Gini katsayısı neyi ölçer? | ✔ Gelir dağılımındaki eşitsizliği | kalır | yüksek |
| 11 | Yunan mitolojisinde savaş tanrısı kimdir? | ✔ Ares | kalır | yüksek |
| 12 | Gençlik ve Spor Bayramı hangi tarihte kutlanır? | ✔ 19 Mayıs | kalır | yüksek |
| 13 | British Museum hangi şehirdedir? | ✔ Londra | kalır | yüksek |
| 14 | Camide "minber" ne için kullanılır? | ✔ Hutbe okumak | kalır | yüksek |
| 15 | Bir ürünün maliyetinin üzerine eklenen paya ne denir? | ✔ Kâr | kalır | yüksek |
| 16 | Bir ülkenin en temel yasasına ne denir? | ✔ Anayasa | kalır | düşük |
| 17 | Bir yüzeyin düz olup olmadığını ölçen alet hangisidir? | ✔ Su terazisi | kalır | yüksek |
| 18 | Emniyet kemeri hangi koltuklarda zorunludur? | ✔ Tüm koltuklarda | kalır | yüksek |
| 19 | Samba hangi ülkenin dansıdır? | ✔ Brezilya | kalır | yüksek |
| 20 | 30 Ağustos hangi bayram olarak kutlanır? | ✔ Zafer Bayramı | kalır | yüksek |
| 21 | 'Sabreden derviş ...' atasözünün devamı nedir? | ✔ muradına ermiş | kalır | yüksek |
| 22 | Ege mutfağında öne çıkan malzeme nedir? | ✔ Zeytinyağı ve ot yemekleri | kalır | yüksek |
| 23 | Kamu spotunun amacı nedir? | ✔ Toplum yararına bilgilendirmek | PASİF · ipucu | yüksek |
| 24 | NATO fonetik alfabesinde 'Q' harfi hangi kelimeyle söylenir? | ✔ Quebec | kalır | yüksek |
| 25 | Türk lokumu hangi ilçeyle de özdeşleşmiştir? | ✔ Safranbolu | kalır | düşük |
| 26 | Sigortanın atmasının yaygın nedeni nedir? | ✔ Aşırı yüklenme | kalır | yüksek |
| 27 | Trafik ışığında kırmızı ne anlama gelir? | ✔ Dur | PASİF · basit | yüksek |
| 28 | Merkez bankasının temel görevlerinden biri nedir? | ✔ Para politikası | PASİF · basit | yüksek |
| 29 | Ambargo kavramı neyi anlatır? | ✔ Ticaretin kısıtlanması | kalır | yüksek |
| 30 | Sıfır atık yaklaşımının amacı nedir? | ✔ Atığı en aza indirmek | PASİF · ipucu | yüksek |
| 31 | Kızılay'ın uluslararası karşılığı olan kuruluş hangisidir? | ✔ Kızılhaç | kalır | yüksek |
| 32 | 24 ayar altın neyi ifade eder? | ✔ Saf altını | kalır | yüksek |
| 33 | Laiklik ilkesi neyi ifade eder? | ✔ Din ve devlet işlerinin ayrılığı | kalır | yüksek |
| 34 | Bilardoda siyah top kaç numaralıdır? | ✔ 8 | → spor | yüksek |
| 35 | KDV hangi tür vergidir? | ✔ Dolaylı vergi | kalır | yüksek |
| 36 | Espresso hangi ülkenin kahve kültürünün simgesidir? | ✔ İtalya | kalır | yüksek |
| 37 | Dünyada en çok konuşulan ana dil hangisidir? | ✔ Mandarin Çincesi | kalır | düşük |
| 38 | Tacos hangi ülkenin mutfağıyla özdeşleşmiştir? | ✔ Meksika | kalır | yüksek |
| 39 | Macaristan'ın para birimi nedir? | ✔ Forint | kalır | yüksek |
| 40 | Survivor yarışması hangi tür yarışmadır? | ✔ Doğada mücadele | kalır | yüksek |
| 41 | Yunan mitolojisinde sanat ve bilimlere esin veren Müzler kaç kardeştir? | ✔ 9 | kalır | yüksek |
| 42 | Rüzgâr enerjisinde en önemli koşul nedir? | ✔ Sürekli rüzgâr | PASİF · basit | yüksek |
| 43 | Kimyon hangi tür baharattır? | ✔ Tohum | kalır | yüksek |
| 44 | Resmî yazışmalarda kullanılan üslup nasıldır? | ✔ Resmî ve nesnel | PASİF · basit | yüksek |
| 45 | Sandviç adını hangi İngiliz soylusundan almıştır? | ✔ Sandwich Kontu | kalır | yüksek |
| 46 | Türkiye'de tarım sigortasının amacı nedir? | ✔ Doğal afet zararını karşılamak | kalır | yüksek |
| 47 | Gayrisafi yurt içi hasıla neyi ölçer? | ✔ Üretilen mal ve hizmetin değerini | PASİF · ipucu | yüksek |
| 48 | Bütçe açığı ne demektir? | ✔ Giderin gelirden fazla olması | kalır | yüksek |
| 49 | "Göz var nizam var" ne anlatır? | ✔ Ölçülü davranmayı | kalır | yüksek |
| 50 | Bir ABD sıvı galonu yaklaşık kaç litredir? | ✔ 3,79 | kalır | yüksek |
| 51 | Yunan mitolojisinde sonsuza dek bir kayayı tepeye yuvarlamaya mahkûm edilen kimdir? | ✔ Sisifos | kalır | yüksek |
| 52 | Nobel ödülleri hangi ülkede verilir (barış hariç)? | ✔ İsveç | kalır | yüksek |
| 53 | İskandinav mitolojisinde savaşta kahramanca ölenlerin gittiği salonun adı nedir? | ✔ Valhalla | kalır | yüksek |
| 54 | 'Mihrap' camide neyi gösterir? | ✔ Kıble yönünü | kalır | yüksek |
| 55 | Denizaltı depremiyle oluşan dev dalgaya ne denir? | ✔ Tsunami | kalır | yüksek |
| 56 | Aristoteles hangi alanda da çalışmalar yapmıştır? | ✔ Mantık | kalır | düşük |
| 57 | Mickey Mouse'un kız arkadaşının adı nedir? | ✔ Minnie | kalır | düşük |
| 58 | Türk kahvesi kültürü ve geleneği UNESCO Somut Olmayan Kültürel Miras listesine hangi yıl … | ✔ 2013 | PASİF · zor | yüksek |
| 59 | Son kullanma tarihi neyi belirtir? | ✔ Güvenle tüketilebilecek son günü | PASİF · ipucu | yüksek |
| 60 | Yaz saati uygulamasının amacı nedir? | ✔ Gün ışığından çok yararlanmak | kalır | yüksek |
| 61 | 'Kültür varlığı kaçakçılığı' nasıl önlenir? | ✔ Denetim ve uluslararası iş birliğiyle | PASİF · ipucu | yüksek |
| 62 | Kars hangi ürünüyle ünlüdür? | ✔ Kaşar ve bal | PASİF · ipucu | yüksek |
| 63 | 'Peanuts' çizgi dizisinde Charlie Brown'ın köpeğinin adı nedir? | ✔ Snoopy | kalır | yüksek |
| 64 | Bir gros kaç adettir? | ✔ 144 | kalır | yüksek |
| 65 | Üçüncül ekonomik faaliyet hangisidir? | ✔ Hizmet | kalır | yüksek |
| 66 | Lüks saat markası Rolex bugün hangi ülkenin markasıdır? | ✔ İsviçre | kalır | yüksek |
| 67 | Serbest liman uygulaması ne sağlar? | ✔ Gümrük kolaylıklarıyla ticaret çekmeyi | PASİF · ipucu | yüksek |
| 68 | Uluslararası Adalet Divanı hangi şehirde bulunur? | ✔ Lahey | kalır | yüksek |
| 69 | Alkollü araç kullanmanın en temel riski nedir? | ✔ Tepki süresinin uzaması | PASİF · ipucu | yüksek |
| 70 | Arıcılıkta üretilen ürünlerden biri hangisidir? | ✔ Bal mumu | PASİF · basit | yüksek |
| 71 | Efsaneye göre kahvenin uyarıcı etkisini keçilerinin taşkın hâllerinden keşfeden Etiyopyal… | ✔ Kaldi | kalır | yüksek |
| 72 | Fotoğraf makinesinin gelişiminde ilk kalıcı görüntüyü elde eden ülke hangisidir? | ✔ Fransa | kalır | yüksek |
| 73 | "Pabucu dama atılmak" ne anlatır? | ✔ Gözden düşmek | kalır | yüksek |
| 74 | Toplumsal cinsiyet eşitliği kavramı neyi hedefler? | ✔ Fırsat ve haklara eşit erişimi | kalır | düşük |
| 75 | İtalyan mutfağında makarnanın 'al dente' pişirilmesi ne anlama gelir? | ✔ Dişe gelecek kıvamda | kalır | düşük |
| 76 | Japonya'nın geleneksel kıyafeti hangisidir? | ✔ Kimono | kalır | yüksek |
| 77 | 'Merci' hangi dilde 'teşekkürler' anlamına gelir? | ✔ Fransızca | kalır | yüksek |
| 78 | Bir libre (pound) yaklaşık kaç gramdır? | ✔ 454 | kalır | düşük |
| 79 | Türk Lirası'nın ₺ simgesi hangi yıl kullanılmaya başlanmıştır? | ✔ 2012 | PASİF · zor | yüksek |
| 80 | Otomobilde motorun soğutulmasını sağlayan sıvı hangisidir? | ✔ Antifriz | kalır | yüksek |
| 81 | 'Kabotaj Hakkı' neyi düzenler? | ✔ İç sularda taşıma hakkını | PASİF · ipucu | yüksek |
| 82 | Latin alfabesindeki 'J' harfi hangi harfin bir biçiminden türemiştir? | ✔ I | kalır | yüksek |
| 83 | Arjantin'in resmi dili nedir? | ✔ İspanyolca | kalır | düşük |
| 84 | Minecraft oyununun temel etkinliği nedir? | ✔ Blok inşa etmek | PASİF · basit | yüksek |
| 85 | "Etekleri zil çalmak" deyimi ne anlatır? | ✔ Çok sevinmek | kalır | yüksek |
| 86 | 'Kültürel miras listesi' neyi amaçlar? | ✔ Evrensel değerli varlıkları korumayı | PASİF · ipucu | yüksek |
| 87 | Asansörün güvenliğini artıran fren sistemi neyi önler? | ✔ Serbest düşüşü | kalır | yüksek |
| 88 | 'KVKK' hangi konuyu düzenler? | ✔ Kişisel verilerin korunmasını | PASİF · ipucu | yüksek |
| 89 | Bir yetişkin için önerilen günlük adım hedefi yaklaşık kaçtır? | ✔ 10.000 | PASİF · basit | yüksek |
| 90 | Bir gölün suyunun tuzlu olmasının başlıca sebebi nedir? | ✔ Dışarıya gideğeninin olmaması | PASİF · ipucu | yüksek |
| 91 | Uluğ Bey hangi alandaki çalışmalarıyla bilinir? | ✔ Astronomi | kalır | yüksek |
| 92 | İskandinav mitolojisinde tanrıların son büyük savaşına ve dünyanın sonuna ne ad verilir? | ✔ Ragnarök | kalır | yüksek |
| 93 | Ratatuy hangi ülkenin yemeğidir? | ✔ Fransa | kalır | yüksek |
| 94 | Mobilya devi IKEA hangi ülkenin markasıdır? | ✔ İsveç | kalır | yüksek |
| 95 | Monopoly'nin atası sayılan 'The Landlord's Game'i 1904'te tasarlayan kişi kimdir? | ✔ Elizabeth Magie | PASİF · zor | yüksek |
| 96 | Kimchi hangi ülkenin geleneksel yiyeceğidir? | ✔ Kore | kalır | yüksek |
| 97 | İnsan Hakları Evrensel Bildirgesi hangi kuruluş tarafından kabul edilmiştir? | ✔ Birleşmiş Milletler | kalır | yüksek |
| 98 | Sürdürülebilir kalkınma neyi hedefler? | ✔ Gelecek kuşakların hakkını korumayı | PASİF · ipucu | yüksek |
| 99 | Mısır'ın resmi dili nedir? | ✔ Arapça | kalır | yüksek |
| 100 | Go oyunu hangi ülkede doğmuştur? | ✔ Çin | kalır | yüksek |
| 101 | Birleşmiş Milletler Güvenlik Konseyi'nin daimî üye sayısı kaçtır? | ✔ 5 | kalır | yüksek |
| 102 | Paella hangi ülkenin yemeğidir? | ✔ İspanya | kalır | yüksek |
| 103 | Yunan mitolojisinde insanların kaderini ören Moiralar kaç kişidir? | ✔ 3 | kalır | yüksek |
| 104 | Gazetenin ilk sayfasına ne denir? | ✔ Manşet sayfası | PASİF · yanlış-bilgi | yüksek |
| 105 | Kooperatifleşmenin çiftçiye yararı nedir? | ✔ Girdi ve pazarlamada güç birliği | PASİF · ipucu | yüksek |
| 106 | Adrese dayalı nüfus kayıt sistemi neyi kolaylaştırır? | ✔ Güncel nüfus verisine erişimi | PASİF · kalite | yüksek |
| 107 | 'Terim sözlüğü' kime yöneliktir? | ✔ Belirli alan uzmanlarına | PASİF · ipucu | yüksek |
| 108 | 'Yazar hakları' hangi süreyle sınırlıdır? | ✔ Yasayla belirlenen süreyle | PASİF · ipucu | yüksek |
| 109 | Zeytinin acılığını gidermek için ne yapılır? | ✔ Salamurada bekletilir | PASİF · ipucu | yüksek |
| 110 | 'Spider-Man' hangi çizgi roman evreninin kahramanıdır? | ✔ Marvel | kalır | yüksek |
| 111 | Fransa ile özdeşleşen uzun ince ekmek hangisidir? | ✔ Baget | kalır | yüksek |
| 112 | Cam geri dönüşümünde cam kaç kez dönüştürülebilir? | ✔ Defalarca | kalır | yüksek |
| 113 | İngilizcedeki 'baker's dozen' (fırıncı düzinesi) deyimi kaç adedi ifade eder? | ✔ 13 | kalır | yüksek |
| 114 | Köpeklerde aşı takvimi kim tarafından belirlenir? | ✔ Veteriner | PASİF · basit | yüksek |
| 115 | Kumaşın çekmesini önlemek için ne yapılır? | ✔ Uygun sıcaklıkta yıkamak | PASİF · ipucu | yüksek |
| 116 | Bir bisikletin kaç tekerleği vardır? | ✔ 2 | PASİF · basit | yüksek |
| 117 | Geri dönüşüm simgesi kaç oktan oluşur? | ✔ 3 | kalır | yüksek |
| 118 | 'Batman' hangi çizgi roman evreninin kahramanıdır? | ✔ DC | kalır | yüksek |
| 119 | Çiğ ve pişmiş gıdalar neden ayrı tutulur? | ✔ Çapraz bulaşmayı önlemek | kalır | yüksek |
| 120 | 'Kabotaj Kanunu' neyi düzenlemiştir? | ✔ Kıyılarda taşımacılık hakkını | PASİF · ipucu | yüksek |
| 121 | Yapay dil Esperanto adını yaratıcısının takma adından alır; bu sözcük ne anlama gelir? | ✔ Umut eden | kalır | yüksek |
| 122 | Mevlana Müzesi hangi ilimizdedir? | ✔ Konya | kalır | yüksek |
| 123 | Döviz kuru neyi ifade eder? | ✔ İki para biriminin değişim oranı | PASİF · ipucu | yüksek |
| 124 | Özel isimlere gelen ekler nasıl ayrılır? | ✔ Kesme işaretiyle | kalır | yüksek |
| 125 | Hicri takvim neye göre düzenlenmiştir? | ✔ Ay yılına | kalır | yüksek |
| 126 | Acil durumda toplanma alanı ne işe yarar? | ✔ Güvenli buluşma noktası | PASİF · basit | yüksek |
| 127 | Bölgesel kalkınma ajanslarının amacı nedir? | ✔ Bölgeler arası farkı azaltmak | PASİF · ipucu | yüksek |
| 128 | Camide kıble yönünü gösteren öğe hangisidir? | ✔ Mihrap | kalır | yüksek |
| 129 | Kredi kartında "limit" ne anlama gelir? | ✔ Harcanabilecek üst sınır | kalır | yüksek |
| 130 | Nobel Ödülleri kimin vasiyetiyle kurulmuştur? | ✔ Alfred Nobel | kalır | düşük |
| 131 | Japon mutfağında pirinç kullanılmadan ince dilimlenerek sunulan çiğ balığa ne ad verilir? | ✔ Sashimi | kalır | yüksek |
| 132 | 'Bonjour' hangi dilde 'günaydın' anlamına gelir? | ✔ Fransızca | kalır | yüksek |
| 133 | Salep hangi bitkiden elde edilir? | ✔ Orkide kökü | kalır | yüksek |
| 134 | Bir ülkenin bayrağındaki renk ve simgeler neyi temsil eder? | ✔ Ulusal değer ve tarihi | PASİF · ipucu | yüksek |
| 135 | Ansiklopedik bilgi ile uzman bilgisi arasındaki fark nedir? | ✔ Uzman bilginin derinliği | PASİF · kalite | yüksek |
| 136 | Bir dilekçede bulunması gereken bilgi hangisidir? | ✔ Ad, soyad ve imza | kalır | yüksek |
| 137 | Bir kütüphanede kitapların sınıflandırılması neye göre yapılır? | ✔ Konuya göre | PASİF · basit | yüksek |
| 138 | Bir destede kaç oyun kâğıdı bulunur? | ✔ 52 | kalır | yüksek |
| 139 | Kazakistan'ın para birimi nedir? | ✔ Tenge | kalır | yüksek |
| 140 | Kar hangi mevsimde yaygın olarak yağar? | ✔ Kış | PASİF · basit | yüksek |
| 141 | Düzenli fiziksel aktivitenin yararlarından biri nedir? | ✔ Kalp sağlığını desteklemesi | PASİF · basit | yüksek |
| 142 | TSE hangi konuda çalışır? | ✔ Standartlar | kalır | yüksek |
| 143 | Bir satranç takımında kaç taş vardır? | ✔ 16 | PASİF · belirsiz | yüksek |
| 144 | Nike'ın ünlü logosu hangi işarete benzer? | ✔ Tik | kalır | yüksek |
| 145 | Dondurulmuş gıda nasıl çözdürülmelidir? | ✔ Buzdolabında | PASİF · kalite | yüksek |
| 146 | Londra'nın simgesi olan çift katlı otobüsler hangi renktedir? | ✔ Kırmızı | kalır | yüksek |
| 147 | Michelin Rehberi'nde bir restoranın alabileceği en yüksek yıldız sayısı kaçtır? | ✔ 3 | kalır | yüksek |
| 148 | Künefe hangi peynirle yapılır? | ✔ Tuzsuz taze peynir | PASİF · ipucu | yüksek |
| 149 | Ezine neyiyle ünlüdür? | ✔ Peyniri | kalır | yüksek |
| 150 | Hangi ülkenin bayrağında ejderha vardır? | ✔ Butan | kalır | yüksek |
| 151 | 'Nüfus sayımı' devlet için neyi sağlar? | ✔ Planlama verisi | PASİF · kalite | yüksek |
| 152 | Dezenformasyon ne anlama gelir? | ✔ Kasıtlı yanlış bilgi yayma | kalır | yüksek |
| 153 | Çok kültürlülük kavramı neyi savunur? | ✔ Farklı kültürlerin bir arada yaşamasını | PASİF · basit | yüksek |
| 154 | 2007'den bu yana verilen ISBN kitap numaraları kaç hanelidir? | ✔ 13 | kalır | yüksek |
| 155 | Milli marşın işlevi nedir? | ✔ Ulusal birliği simgelemek | PASİF · basit | yüksek |
| 156 | Havalimanlarında uçakları yönlendiren birim hangisidir? | ✔ Kule | kalır | yüksek |
| 157 | Roma rakamlarında "L" hangi sayıyı gösterir? | ✔ 50 | kalır | yüksek |
| 158 | Pamuk Prenses'in yanında kaç cüce yaşar? | ✔ 7 | kalır | yüksek |
| 159 | 'Redaksiyon' yayında ne yapar? | ✔ Metni düzeltip düzenler | PASİF · ipucu | yüksek |
| 160 | Miladi takvim neye göre düzenlenmiştir? | ✔ Güneş yılına | kalır | yüksek |
| 161 | Bir uçağın irtifası genellikle hangi birimle ifade edilir? | ✔ Feet | kalır | yüksek |
| 162 | Bir yılda kaç mevsim bulunur? | ✔ 4 | PASİF · basit | yüksek |
| 163 | Denizcilikte geminin hızı hangi birimle ölçülür? | ✔ Knot | kalır | yüksek |
| 164 | Arz ve talep neyi belirler? | ✔ Fiyatı | kalır | yüksek |
| 165 | Brezilya'nın para birimi nedir? | ✔ Real | kalır | yüksek |
| 166 | Lale anlamındaki İngilizce 'tulip' kelimesi, çiçeğin benzetildiği hangi Türkçe kelimeye d… | ✔ Tülbent | kalır | yüksek |
| 167 | Louis Vuitton ve Chanel hangi ülkenin lüks moda markalarıdır? | ✔ Fransa | kalır | yüksek |
| 168 | Japonya bayrağının ortasındaki kırmızı daire neyi simgeler? | ✔ Güneşi | kalır | yüksek |
| 169 | Organik tarımda neyin kullanımı sınırlıdır? | ✔ Sentetik kimyasallar | PASİF · ipucu | yüksek |
| 170 | Hollywood hangi ABD şehrinde yer alır? | ✔ Los Angeles | kalır | yüksek |
| 171 | Atomium yapısı hangi şehirdedir? | ✔ Brüksel | kalır | yüksek |
| 172 | Bir ülkenin dış ticaret açığı ne demektir? | ✔ İthalatın ihracattan fazla olması | PASİF · ipucu | yüksek |
| 173 | TÜBİTAK hangi alanda çalışır? | ✔ Bilimsel araştırma | kalır | yüksek |
| 174 | Kişisel verilerin korunması neyi amaçlar? | ✔ Bireyin mahremiyetini güvenceye almak | PASİF · ipucu | yüksek |
| 175 | A4 kâğıdın kısa kenarı kaç milimetredir? | ✔ 210 | kalır | yüksek |
| 176 | Bir inç yaklaşık kaç santimetredir? | ✔ 2,54 | kalır | yüksek |
| 177 | Super Mario hangi şirketin oyun karakteridir? | ✔ Nintendo | kalır | yüksek |
| 178 | Geçmiş uygarlıkların kalıntılarını inceleyen bilim hangisidir? | ✔ Arkeoloji | kalır | yüksek |
| 179 | Bir bowling atışında devrilmesi gereken kaç lobut vardır? | ✔ 10 | → spor | yüksek |
| 180 | Coco Chanel'in 1921'de piyasaya sürdüğü efsanevi parfümün adı nedir? | ✔ Chanel No. 5 | kalır | düşük |
| 181 | Mantı hangi şehrimizle özdeşleşmiştir? | ✔ Kayseri | kalır | yüksek |
| 182 | Satranç oyununda hangi taş en değerli sayılır? | ✔ Vezir | kalır | yüksek |
| 183 | Fındıklı kakao kreması Nutella'yı üreten İtalyan şirketi hangisidir? | ✔ Ferrero | kalır | yüksek |
| 184 | 'Halay' hangi bölgede yaygın bir halk oyunudur? | ✔ Doğu ve Güneydoğu | PASİF · ipucu | yüksek |
| 185 | İsveçli mobilya şirketi IKEA'nın kurucusu kimdir? | ✔ Ingvar Kamprad | kalır | yüksek |
| 186 | Türkiye'de trafik ışığında 'geç' anlamına gelen renk hangisidir? | ✔ Yeşil | PASİF · basit | yüksek |
| 187 | Mahkemede iddia makamını kim temsil eder? | ✔ Savcı | kalır | yüksek |
| 188 | Tipografide paragraf başını gösteren '¶' işaretine ne ad verilir? | ✔ Pilcrow | PASİF · zor | yüksek |
| 189 | 'Milliyetçilik ilkesi' neye dayanır? | ✔ Ortak yurt ve kültür birliğine | PASİF · ipucu | yüksek |
| 190 | Yoğurt, su ve tuzla yapılan geleneksel Türk içeceği hangisidir? | ✔ Ayran | kalır | yüksek |
| 191 | Trafik kazasında yaralı ne zaman hareket ettirilmelidir? | ✔ Hayati tehlike varsa | kalır | yüksek |
| 192 | Deprem sonrası binaya girmeden önce ne yapılmalı? | ✔ Yetkili kontrolü beklenmeli | PASİF · ipucu | yüksek |
| 193 | 'Arigato' hangi dilde 'teşekkürler' anlamına gelir? | ✔ Japonca | kalır | yüksek |
| 194 | Yunan mitolojisinde güneş ve sanat tanrısı kimdir? | ✔ Apollon | kalır | yüksek |
| 195 | Kefil ne yapar? | ✔ Borcu garanti eder | kalır | yüksek |
| 196 | 'Danke' hangi dilde 'teşekkürler' anlamına gelir? | ✔ Almanca | kalır | yüksek |
| 197 | Mevlevi sema töreninde dönen kişiye ne denir? | ✔ Semazen | kalır | yüksek |
| 198 | Bir işçinin yıllık izin hakkı neye bağlıdır? | ✔ Çalışma süresine | PASİF · basit | yüksek |
| 199 | 'Ciao' hangi dilde 'merhaba' anlamına gelir? | ✔ İtalyanca | kalır | yüksek |
| 200 | İskandinav mitolojisinde dokuz dünyayı birbirine bağlayan dev ağacın adı nedir? | ✔ Yggdrasil | kalır | yüksek |
| 201 | Pizzanın anavatanı sayılan İtalyan şehri hangisidir? | ✔ Napoli | kalır | yüksek |
| 202 | Bir toplantıda gündem ne işe yarar? | ✔ Konuları sıralar | kalır | yüksek |
| 203 | Papa'nın yaşadığı şehir devleti hangisidir? | ✔ Vatikan | kalır | düşük |
| 204 | Somut olmayan kültürel mirasa örnek nedir? | ✔ Gelenek, el sanatı ve müzik | PASİF · ipucu | yüksek |
| 205 | İnsani Gelişme Endeksi hangi bileşenleri içerir? | ✔ Sağlık, eğitim ve gelir | kalır | yüksek |
| 206 | Pakize Tarzi Türkiye'nin ilk kadın ... olarak bilinir; boşluğa ne gelmeli? | ✔ Jinekoloğu | PASİF · zor | yüksek |
| 207 | Teşvik bölgesi uygulaması neyi hedefler? | ✔ Geri kalmış bölgelere yatırım çekmek | PASİF · ipucu | yüksek |
| 208 | Geleneksel Türk okçuluğunda kirişi çekmek için başparmağa takılan yüzüğe ne ad verilir? | ✔ Zihgir | PASİF · zor | yüksek |
| 209 | Telsizde kullanılan 'Mayday' tehlike çağrısı hangi dildeki bir ifadeden türemiştir? | ✔ Fransızca | kalır | yüksek |
| 210 | ABD bayrağındaki çizgiler neyi temsil eder? | ✔ İlk 13 koloniyi | kalır | yüksek |
| 211 | Emeklilik primi hangi kuruma ödenir? | ✔ Sosyal güvenlik kurumuna | PASİF · ipucu | yüksek |
| 212 | Duvar örerken harç sürmek için kullanılan alet hangisidir? | ✔ Mala | kalır | yüksek |
| 213 | Vatikan hangi dinin merkezidir? | ✔ Katoliklik | kalır | yüksek |
| 214 | Kabotaj Kanunu hangi alanla ilgilidir? | ✔ Denizcilik | kalır | yüksek |
| 215 | Rusya'nın para birimi nedir? | ✔ Ruble | kalır | yüksek |
| 216 | Zafer Bayramı hangi tarihte kutlanır? | ✔ 30 Ağustos | kalır | yüksek |
| 217 | Kısaltmalarda nokta hangi durumda kullanılır? | ✔ Bazı kısaltmalarda | PASİF · kalite | yüksek |
| 218 | Red Kit çizgi romanındaki atın adı nedir? | ✔ Düldül | kalır | yüksek |
| 219 | Hindistan'ın para birimi nedir? | ✔ Rupi | kalır | yüksek |
| 220 | Dünyanın en büyük bira festivali Oktoberfest her yıl hangi şehirde düzenlenir? | ✔ Münih | kalır | yüksek |
| 221 | Oyuncak yapı parçalarıyla ünlü LEGO şirketi hangi ülkede kurulmuştur? | ✔ Danimarka | kalır | yüksek |
| 222 | "Sakla samanı gelir zamanı" ne demektir? | ✔ Gereksiz görüneni saklamak | PASİF · ipucu | yüksek |
| 223 | Geleneksel Türk gölge oyununda Hacivat'ın konuşma biçimi nasıldır? | ✔ Ağdalı ve kitabi | kalır | yüksek |
| 224 | 'Gülü seven ...' atasözünün devamı nedir? | ✔ dikenine katlanır | kalır | yüksek |
| 225 | Pasaportun işlevi nedir? | ✔ Uluslararası kimlik ve seyahat belgesi | PASİF · ipucu | yüksek |
| 226 | Flamenko dansı hangi ülkeye özgüdür? | ✔ İspanya | kalır | yüksek |
| 227 | 'Acele işe ...' atasözünün devamı nedir? | ✔ şeytan karışır | kalır | yüksek |
| 228 | Moai heykelleri hangi adada bulunur? | ✔ Paskalya Adası | kalır | yüksek |
| 229 | 'Sabotaj' kelimesi hangi nesnenin Fransızca adından türemiştir? | ✔ Tahta ayakkabı | kalır | yüksek |
| 230 | "Burnu havada olmak" ne anlatır? | ✔ Kibirli olmak | kalır | yüksek |
| 231 | Tek kişinin yönettiği devlet biçimine ne denir? | ✔ Monarşi | kalır | yüksek |
| 232 | Kahveye batırılmış kedi dili bisküvisi ve mascarpone peyniriyle hazırlanan İtalyan tatlıs… | ✔ Tiramisu | kalır | yüksek |
| 233 | 'Su akar ...' atasözünün devamı nedir? | ✔ yolunu bulur | kalır | yüksek |
| 234 | Lamborghini'nin logosunda hangi hayvan yer alır? | ✔ Boğa | kalır | yüksek |
| 235 | Bir işletmenin gelir ve giderlerini kaydeden dal hangisidir? | ✔ Muhasebe | kalır | yüksek |
| 236 | Enflasyonun alım gücüne etkisi nedir? | ✔ Azaltır | kalır | yüksek |
| 237 | Mors alfabesinde tek bir noktayla gösterilen harf hangisidir? | ✔ E | kalır | yüksek |
| 238 | 'Sütten ağzı yanan ...' atasözünün devamı nedir? | ✔ yoğurdu üfleyerek yer | kalır | yüksek |
| 239 | Beyaz eşyada enerji sınıfı neyi gösterir? | ✔ Enerji verimliliğini | PASİF · ipucu | yüksek |
| 240 | İstanbul'daki tarihi "Kız Kulesi" nerededir? | ✔ Üsküdar açıkları | kalır | düşük |
| 241 | Sivil itaatsizlik kavramı neyi anlatır? | ✔ Haksız yasaya şiddetsiz karşı çıkma | PASİF · ipucu | yüksek |
| 242 | Denizcilikte 'rota' ne anlama gelir? | ✔ İzlenecek yol doğrultusu | PASİF · ipucu | yüksek |
| 243 | Ali Kuşçu hangi alanda çalışmıştır? | ✔ Astronomi | kalır | yüksek |
| 244 | Sevgililer Günü hangi ayda kutlanır? | ✔ Şubat | kalır | yüksek |
| 245 | İngiliz ağırlık birimi bir "stone" kaç libredir? | ✔ 14 | PASİF · zor | yüksek |
| 246 | Karadeniz mutfağında hangi ürün öne çıkar? | ✔ Hamsi ve mısır | kalır | yüksek |
| 247 | Arapça ve İbranice hangi dil grubundandır? | ✔ Sami dilleri | kalır | yüksek |
| 248 | Kayısısıyla ünlü ilimiz hangisidir? | ✔ Malatya | kalır | yüksek |
| 249 | Felsefede "Sorgulanmamış hayat yaşanmaya değmez" sözü kime aittir? | ✔ Sokrates | kalır | yüksek |
| 250 | "Kulak misafiri olmak" ne anlatır? | ✔ İstemeden duymak | kalır | yüksek |
| 251 | Bir suçun cezasının kanunla belirlenmesi ilkesine ne denir? | ✔ Kanunilik | kalır | yüksek |
| 252 | Kompost nedir? | ✔ Organik atıktan gübre | kalır | yüksek |
| 253 | "İpe un sermek" deyimi ne anlatır? | ✔ Bahane bulmak | kalır | yüksek |
| 254 | İshak Paşa Sarayı hangi ilimizdedir? | ✔ Ağrı | kalır | yüksek |
| 255 | Sevgililer Günü her yıl hangi tarihte kutlanır? | ✔ 14 Şubat | kalır | yüksek |
| 256 | 'Sendika' hangi amaçla kurulmuştur? | ✔ İşçi haklarını savunmak | kalır | yüksek |
| 257 | ABD Başkanı'nın resmî konutu olan yapı hangisidir? | ✔ Beyaz Saray | kalır | yüksek |
| 258 | Psikolojideki ünlü "ihtiyaçlar hiyerarşisi" piramidi kime aittir? | ✔ Maslow | kalır | yüksek |
| 259 | Yunan mitolojisinde Pandora'nın kutusu kapatıldığında içinde kalan tek şey nedir? | ✔ Umut | kalır | yüksek |
| 260 | Hermitage Müzesi hangi şehirdedir? | ✔ St. Petersburg | kalır | yüksek |
| 261 | Standart bir Sudoku bulmacasının ızgarası toplam kaç küçük kareden oluşur? | ✔ 81 | kalır | yüksek |
| 262 | Bir ülkenin turizm gelirinin artması dış ticarette neye katkı yapar? | ✔ Döviz gelirine | kalır | yüksek |
| 263 | Nobel ödülleri her yıl, Alfred Nobel'in ölüm yıl dönümü olan hangi tarihte verilir? | ✔ 10 Aralık | kalır | yüksek |
| 264 | 'Kütüphane sınıflandırması' ne sağlar? | ✔ Kitaba erişimi | PASİF · basit | yüksek |
| 265 | Tırnak işareti neyi belirtir? | ✔ Alıntıyı | PASİF · basit | yüksek |
| 266 | Çocuk oto koltuğunun gerekliliği neye dayanır? | ✔ Çocuğun bedenine uygun koruma | PASİF · ipucu | yüksek |
| 267 | ABD'de Şükran Günü sofrasının geleneksel yemeği hangi hayvanın etidir? | ✔ Hindi | kalır | yüksek |
| 268 | Osmanlı sarayında yemeklerin pişirildiği büyük mutfak teşkilatına ne ad verilirdi? | ✔ Matbah-ı Amire | → tarih | yüksek |
| 269 | Volvo hangi ülkenin otomobil markasıdır? | ✔ İsveç | kalır | yüksek |
| 270 | Japonya'nın para birimi hangisidir? | ✔ Yen | kalır | yüksek |
| 271 | Katılımcıların birbirine domates fırlattığı 'La Tomatina' festivali hangi ülkede düzenlen… | ✔ İspanya | kalır | yüksek |
| 272 | İskandinav mitolojisinde gök gürültüsü tanrısı kimdir? | ✔ Thor | kalır | yüksek |
| 273 | Bir toplantının yazılı kaydına ne denir? | ✔ Tutanak | kalır | yüksek |
| 274 | Ansiklopedi ne tür bir kaynaktır? | ✔ Başvuru kaynağı | kalır | yüksek |
| 275 | 'Planlı ekonomi' hangi ilkeye dayanır? | ✔ Merkezî üretim planına | kalır | yüksek |
| 276 | Fırında pişen keklerin ortası neden çöker? | ✔ Erken kapak açma ve ısı düşüşü | PASİF · ipucu | yüksek |
| 277 | Geleneksel Çin bulmacası Tangram kaç geometrik parçadan oluşur? | ✔ 7 | kalır | yüksek |
| 278 | Eski Yunan tanrılarının yaşadığı efsanevi dağ hangisidir? | ✔ Olimpos | kalır | yüksek |
| 279 | Boğaz köprülerinden "15 Temmuz Şehitler Köprüsü"nün eski adı nedir? | ✔ Boğaziçi Köprüsü | kalır | düşük |
| 280 | Bankada vadeli hesabın vadesiz hesaptan farkı nedir? | ✔ Belirli süre bekletilir | PASİF · ipucu | yüksek |
| 281 | Fotoğrafta ışığı ayarlayan bölüm hangisidir? | ✔ Diyafram | kalır | düşük |
| 282 | Sagrada Familia hangi şehirdedir? | ✔ Barselona | kalır | yüksek |
| 283 | Gıda zehirlenmesini önlemenin temel yolu nedir? | ✔ Uygun saklama ve pişirme | kalır | yüksek |
| 284 | Karbon ayak izi neyi ölçer? | ✔ Salınan sera gazını | PASİF · kalite | yüksek |
| 285 | Değerli taşlarda kullanılan 1 karat kaç gramdır? | ✔ 0,2 | kalır | yüksek |
| 286 | Kuvvetler ayrılığı ilkesi neyi ifade eder? | ✔ Yasama, yürütme, yargı ayrılığı | PASİF · ipucu | yüksek |
| 287 | Kabotaj Kanunu neyi düzenler? | ✔ Türk karasularında taşımacılığı | PASİF · ipucu | yüksek |
| 288 | Baharın gelişini kutlayan Hıdırellez her yıl hangi tarihte kutlanır? | ✔ 6 Mayıs | kalır | yüksek |
| 289 | Dinamiti bulan kişi kimdir? | ✔ Alfred Nobel | kalır | yüksek |
| 290 | Üniter devlet yapısının özelliği nedir? | ✔ Tek merkezden yönetim | kalır | yüksek |
| 291 | Patent neyi korur? | ✔ Buluşu | kalır | yüksek |
| 292 | Rubik küpünü 1974'te icat eden Erno Rubik hangi ülkelidir? | ✔ Macaristan | kalır | yüksek |
| 293 | Kalite kontrol ne amaçlar? | ✔ Standartlara uygunluk | kalır | yüksek |
| 294 | Coca-Cola hangi ülkede doğmuş bir içecek markasıdır? | ✔ ABD | kalır | yüksek |
| 295 | Minyatür ağaç yetiştirme sanatının Japonca adı nedir? | ✔ Bonsai | kalır | yüksek |
| 296 | Yunan mitolojisinde bilgelik tanrıçası kimdir? | ✔ Athena | kalır | yüksek |
| 297 | 2005'te Yeni Türk Lirası'na geçilirken paradan kaç sıfır atılmıştır? | ✔ 6 | kalır | yüksek |
| 298 | Kara üzerindeki en hızlı hayvan hangisidir? | ✔ Çita | kalır | yüksek |
| 299 | Boza hangi tahıldan yapılır? | ✔ Darı veya bulgur | PASİF · ipucu | yüksek |
| 300 | Harf taşlarıyla kelime oluşturulan ünlü masa oyunu hangisidir? | ✔ Scrabble | kalır | yüksek |
| 301 | Bayrakların incelendiği bilim dalına ne ad verilir? | ✔ Vexilloloji | kalır | yüksek |
| 302 | "Zeybek" hangi bölgemizin halk oyunudur? | ✔ Ege | kalır | yüksek |
| 303 | Bilgi edinme hakkı neyi sağlar? | ✔ Kamu bilgilerine erişebilmeyi | PASİF · ipucu | yüksek |
| 304 | Bir kurumun logosu neyi temsil eder? | ✔ Kimliğini | kalır | yüksek |
| 305 | Buğday, nohut, kuru fasulye ve kuru meyvelerle yapılıp Muharrem ayında komşulara dağıtıla… | ✔ Aşure | kalır | düşük |
| 306 | Zeytinyağının dumanlanma noktası neyi belirler? | ✔ Pişirmeye uygunluğunu | PASİF · ipucu | yüksek |
| 307 | "Bilgi güçtür" sözü hangi düşünürle anılır? | ✔ Francis Bacon | kalır | yüksek |
| 308 | Oyuncak bebek Barbie'nin üreticisinin açıkladığı tam adı nedir? | ✔ Barbara Millicent Roberts | PASİF · zor | yüksek |
| 309 | Üç nokta hangi anlamda kullanılır? | ✔ Sözün sürdüğünü | PASİF · kalite | yüksek |
| 310 | Gönüllülük çalışmasının topluma katkısı nedir? | ✔ Dayanışma ve hizmet üretimi | PASİF · ipucu | yüksek |
| 311 | Bir giysinin bedenini belirleyen ölçü nedir? | ✔ Vücut ölçüleri | PASİF · basit | yüksek |
| 312 | NATO'nun genel merkezi hangi şehirdedir? | ✔ Brüksel | kalır | yüksek |
| 313 | Kızılay ve Kızılhaç hangi alanda faaliyet gösterir? | ✔ İnsani yardım | kalır | yüksek |
| 314 | Telgrafın icadı hangi alanı değiştirmiştir? | ✔ İletişim | kalır | yüksek |
| 315 | Ekonomi dalındaki Nobel anma ödülü ilk kez hangi yıl verildi? | ✔ 1969 | PASİF · zor | yüksek |
| 316 | Federal devlet yapısının özelliği nedir? | ✔ Eyaletlerin kendi yetkilerinin olması | PASİF · ipucu | yüksek |
| 317 | Bir ülkenin sınırları içindeki yabancı temsilciliğe ne ad verilir? | ✔ Elçilik | kalır | yüksek |
| 318 | Türkiye'de nüfus sayımlarını hangi kurum yapar? | ✔ TÜİK | kalır | yüksek |
| 319 | Pizza Margherita'daki domates, mozzarella ve fesleğenin renklerinin neyi simgelediği anla… | ✔ İtalyan bayrağını | kalır | düşük |
| 320 | İngilizcedeki 'Thursday' (perşembe) adı hangi İskandinav tanrısından gelir? | ✔ Thor | kalır | yüksek |
| 321 | Fransız otomobil markası Peugeot'nun logosunda hangi hayvan yer alır? | ✔ Aslan | kalır | yüksek |
| 322 | Ham madde ihraç edip işlenmiş ürün ithal etmek neye yol açar? | ✔ Dış ticaret açığına | kalır | yüksek |
| 323 | UNESCO hangi alanlarda çalışan bir kuruluştur? | ✔ Eğitim, bilim ve kültür | kalır | yüksek |
| 324 | Kompostun tarımdaki karşılığı nedir? | ✔ Doğal gübre | kalır | yüksek |
| 325 | Sigara ve alkolle mücadele eden Türk kurumu hangisidir? | ✔ Yeşilay | kalır | yüksek |
| 326 | Dünya çapında ünlü döner hangi ülkenin mutfağından çıkmıştır? | ✔ Türkiye | kalır | yüksek |
| 327 | Interpol hangi alanda faaliyet gösterir? | ✔ Uluslararası polis işbirliği | kalır | yüksek |
| 328 | Turşu hangi işlemle yapılır? | ✔ Salamura ve fermantasyon | PASİF · ipucu | yüksek |
| 329 | Türk kahvesi hangi kuruluşun kültür mirası listesindedir? | ✔ UNESCO | kalır | yüksek |
| 330 | "Ağzı kulaklarına varmak" ne demektir? | ✔ Çok sevinmek | kalır | yüksek |
| 331 | Halkın yöneticilerini seçtiği yönetim biçimi hangisidir? | ✔ Demokrasi | kalır | düşük |
| 332 | İsviçre hangi ürünüyle dünyaca ünlüdür? | ✔ Çikolata ve saat | PASİF · ipucu | yüksek |
| 333 | Kot kumaşının bilinen adı nedir? | ✔ Denim | kalır | yüksek |
| 334 | 'Medeni Kanun' hangi alanı düzenledi? | ✔ Aile ve kişi hukukunu | kalır | yüksek |
| 335 | Bir grafikte sütunlar neyi gösterir? | ✔ Miktarları | PASİF · kalite | yüksek |
| 336 | Bir kentin 'trafik yoğunluğu' neyle azaltılabilir? | ✔ Toplu taşıma ve yaya önceliğiyle | PASİF · kalite | yüksek |
| 337 | İtalya bayrağındaki renkler hangileridir? | ✔ Yeşil, beyaz, kırmızı | kalır | yüksek |
| 338 | 1932'de Belçika'da düzenlenen uluslararası güzellik yarışmasında 'Dünya Güzeli' seçilen T… | ✔ Keriman Halis | kalır | yüksek |
| 339 | Burçlar kuşağında ilk sırada yer alan burç hangisidir? | ✔ Koç | kalır | yüksek |
| 340 | Akvaryum balıkları için suyun neyi önemlidir? | ✔ Sıcaklık ve temizlik | PASİF · kalite | yüksek |
| 341 | IBAN ne işe yarar? | ✔ Hesabı uluslararası tanımlar | kalır | yüksek |
| 342 | Çevre örgütü Greenpeace 1971'de hangi şehirde kurulmuştur? | ✔ Vancouver | PASİF · zor | yüksek |
| 343 | İngilizcedeki 'January' ayı adını hangi Roma tanrısından alır? | ✔ Janus | kalır | yüksek |
| 344 | Puzzle (yapboz) neyi geliştirir? | ✔ Görsel algı ve sabır | kalır | yüksek |
| 345 | Toprağın işlenmesine ne denir? | ✔ Sürüm | kalır | yüksek |
| 346 | Turizmde "kültür turizmi" neye dayanır? | ✔ Tarihî ve kültürel değerler | PASİF · ipucu | yüksek |
| 347 | Hava durumunu inceleyen bilim dalı hangisidir? | ✔ Meteoroloji | → bilim | yüksek |
| 348 | 'Horon' hangi bölgenin oyunudur? | ✔ Karadeniz | kalır | yüksek |
| 349 | Bira festivali Oktoberfest hangi ülkede kutlanır? | ✔ Almanya | kalır | yüksek |
| 350 | Doğrulama (fact-checking) neyi amaçlar? | ✔ İddianın kanıtla sınanmasını | kalır | yüksek |
| 351 | New York'taki Wall Street'in simgelerinden olan ünlü bronz heykel hangi hayvanı betimler? | ✔ Boğa | kalır | yüksek |
| 352 | Sultanahmet Camii hangi adla da bilinir? | ✔ Mavi Cami | kalır | düşük |
| 353 | Noterin temel görevi nedir? | ✔ İşlemleri resmen onaylamak | kalır | yüksek |
| 354 | Küresel tedarik zinciri kavramı neyi anlatır? | ✔ Üretimin ülkelere yayılmış olmasını | PASİF · ipucu | yüksek |
| 355 | İrlanda birası Guinness'in logosunda hangi çalgı yer alır? | ✔ Arp | kalır | yüksek |
| 356 | Penguenler hangi kutupta yaşar? | ✔ Güney | kalır | yüksek |
| 357 | Bir markanın sloganı ne işe yarar? | ✔ Akılda kalmayı sağlar | PASİF · basit | yüksek |
| 358 | Kamuoyu kavramı neyi ifade eder? | ✔ Toplumun ortak eğilimini | kalır | yüksek |
| 359 | Bir şirketin ortaklık payına ne denir? | ✔ Hisse | kalır | yüksek |
| 360 | Dünyada en çok konuşulan dil ailelerinden biri hangisidir? | ✔ Hint-Avrupa | PASİF · kalite | yüksek |
| 361 | Sürdürülebilir kalkınma ne demektir? | ✔ Gelecek kuşakları gözeten kalkınma | PASİF · ipucu | yüksek |
| 362 | 'Kopya' ile 'sahte' farkı nedir? | ✔ Sahte aldatma amacı taşır | PASİF · kalite | yüksek |
| 363 | Evlilik yıldönümlerinde 50. yıl geleneksel olarak hangi malzemeyle anılır? | ✔ Altın | kalır | yüksek |
| 364 | Croissant hangi ülkeyle özdeşleşmiştir? | ✔ Fransa | kalır | yüksek |
| 365 | Tarhana hangi yöntemle saklanır? | ✔ Kurutularak | kalır | yüksek |
| 366 | Satrançta atın hareketi hangi harfe benzer? | ✔ L | kalır | yüksek |
| 367 | BMW hangi ülkenin otomobil markasıdır? | ✔ Almanya | kalır | yüksek |
| 368 | Klimada filtre temizliği neyi sağlar? | ✔ Verim ve hava kalitesi | PASİF · kalite | yüksek |
| 369 | Opera Binası simgesiyle bilinen şehir hangisidir? | ✔ Sidney | kalır | yüksek |
| 370 | Meksika ile özdeşleşen geniş kenarlı şapka hangisidir? | ✔ Sombrero | kalır | yüksek |
| 371 | Yunan mitolojisinde yeraltı dünyasının kapısını bekleyen üç başlı köpeğin adı nedir? | ✔ Kerberos | kalır | yüksek |
| 372 | Uluslararası Af Örgütü 1961'de hangi şehirde kurulmuştur? | ✔ Londra | kalır | yüksek |
| 373 | Dünyanın en çok kullanılan alfabesi hangisidir? | ✔ Latin | kalır | yüksek |
| 374 | Bir haberin temel öğelerinden biri nedir? | ✔ Ne, nerede, ne zaman | kalır | yüksek |
| 375 | Itri hangi alanda tanınır? | ✔ Müzik | kalır | düşük |
| 376 | Marka bilinirliği neyi ölçer? | ✔ Tüketicinin markayı tanıma düzeyini | PASİF · ipucu | yüksek |
| 377 | Avrupa Birliği'nin merkezi hangi şehirdedir? | ✔ Brüksel | kalır | yüksek |
| 378 | Ölçü kaşığı ile çay kaşığı farkı nedir? | ✔ Standart hacim | PASİF · ipucu | yüksek |
| 379 | Jelibonlarıyla ünlü Haribo hangi ülkenin şirketidir? | ✔ Almanya | kalır | yüksek |
| 380 | Türkiye'de Medeni Kanun hangi ülkeden alınarak kabul edilmiştir? | ✔ İsviçre | kalır | yüksek |
| 381 | Seracılık ne sağlar? | ✔ Mevsim dışı üretim | PASİF · kalite | yüksek |
| 382 | Bisiklet yollarının kentsel yararı nedir? | ✔ Emisyon ve trafiği azaltması | PASİF · ipucu | yüksek |
| 383 | Atık pillerin ayrı toplanmasının nedeni nedir? | ✔ Ağır metal kirliliğini önlemek | kalır | yüksek |
| 384 | Risk yönetiminde ilk adım nedir? | ✔ Riskleri belirlemek | PASİF · ipucu | yüksek |
| 385 | Asgari ücret nedir? | ✔ Yasal en düşük ücret | kalır | yüksek |
| 386 | Akdamar Kilisesi hangi ilimizdedir? | ✔ Van | kalır | yüksek |
| 387 | Halay hangi bölgemizin halk oyunudur? | ✔ Doğu ve Güneydoğu Anadolu | PASİF · ipucu | yüksek |
| 388 | Üzerinde kıyma ve baharat bulunan ince hamur yemeği hangisidir? | ✔ Lahmacun | kalır | yüksek |
| 389 | Vize ne anlama gelir? | ✔ Bir ülkeye giriş izni | kalır | yüksek |
| 390 | Trafik ışığında 'dur' anlamına gelen renk hangisidir? | ✔ Kırmızı | PASİF · basit | yüksek |
| 391 | Bir belgeselin amacı nedir? | ✔ Bilgilendirmek | PASİF · ipucu | yüksek |
| 392 | 'UTC' neyi ifade eder? | ✔ Eşgüdümlü evrensel zamanı | kalır | düşük |
| 393 | 'Etibank' hangi alanda faaliyet göstermiştir? | ✔ Maden ve enerji | PASİF · ipucu | yüksek |
| 394 | 'Laiklik ilkesi' neyi ayırır? | ✔ Din işleri ile devlet işlerini | PASİF · ipucu | yüksek |
| 395 | Zeugma Mozaik Müzesi hangi ildedir? | ✔ Gaziantep | kalır | yüksek |
| 396 | Kızılhaç örgütünün kurucusu kimdir? | ✔ Henry Dunant | kalır | yüksek |
| 397 | Kanunları uygulama görevi kime aittir? | ✔ Yürütme | kalır | yüksek |
| 398 | Yangın söndürmede en çok kullanılan madde nedir? | ✔ Su | PASİF · basit | yüksek |
| 399 | Notre-Dame Katedrali hangi şehirdedir? | ✔ Paris | kalır | yüksek |
| 400 | Bir gemide "sancak" hangi yönü belirtir? | ✔ Sağ | kalır | yüksek |
| 401 | "Halay" hangi bölgede yaygındır? | ✔ Güneydoğu ve Doğu Anadolu | PASİF · ipucu | yüksek |
| 402 | Bir ürünün üreticiden tüketiciye ulaşmasına ne denir? | ✔ Dağıtım | kalır | yüksek |
| 403 | Dünyada en çok yetiştirilen iki kahve türü arabika ve hangisidir? | ✔ Robusta | kalır | yüksek |
| 404 | Topuğundan vurulan ölümsüz Yunan kahramanı kimdir? | ✔ Aşil | kalır | yüksek |
| 405 | Venüs adını hangi tanrıçadan alır? | ✔ Aşk ve güzellik | PASİF · ipucu | yüksek |
| 406 | Kömürün en çok kullanıldığı alan hangisidir? | ✔ Enerji üretimi | kalır | yüksek |
| 407 | Yoğurt hangi kültürün dünyaya kazandırdığı kabul edilen besindir? | ✔ Türk | kalır | düşük |
| 408 | Fıçıda yaşadığı söylenen kinik filozof kimdir? | ✔ Diyojen | kalır | yüksek |
| 409 | Venedik'in kanallarında kullanılan uzun ve dar geleneksel teknenin adı nedir? | ✔ Gondol | kalır | yüksek |
| 410 | Devlet adlı eserin yazarı olan filozof kimdir? | ✔ Platon | kalır | yüksek |
| 411 | Sigorta ne işe yarar? | ✔ Riski karşılamaya | kalır | yüksek |
| 412 | Bir dönüm yaklaşık kaç metrekaredir? | ✔ 1000 | kalır | yüksek |
| 413 | Enflasyon neyi ifade eder? | ✔ Genel fiyat düzeyinin artması | PASİF · ipucu | yüksek |
| 414 | Artık yılda şubat ayı kaç gün çeker? | ✔ 29 | kalır | yüksek |
| 415 | Kibrit kutusu ve etiketi biriktirme merakına ne ad verilir? | ✔ Filumeni | PASİF · zor | yüksek |
| 416 | Bir tarot destesinde 'Büyük Arkana' kaç karttan oluşur? | ✔ 22 | PASİF · zor | yüksek |
| 417 | Gökkuşağının ilk rengi hangisidir? | ✔ Kırmızı | kalır | yüksek |
| 418 | ISBN numarası neyi tanımlar? | ✔ Bir kitabı benzersiz olarak | PASİF · kalite | yüksek |
| 419 | Gökkuşağında kaç ana renk vardır? | ✔ 7 | kalır | yüksek |
| 420 | Nobel Ödülü'nün verilmediği alan hangisidir? | ✔ Matematik | kalır | yüksek |
| 421 | Zara hangi ülkenin moda markasıdır? | ✔ İspanya | kalır | yüksek |
| 422 | 'Bar' halk oyunu hangi bölgede oynanır? | ✔ Doğu Anadolu | PASİF · ipucu | yüksek |
| 423 | Deniz mili yaklaşık kaç metredir? | ✔ 1852 | kalır | yüksek |
| 424 | Orhun Yazıtları hangi ülkededir? | ✔ Moğolistan | kalır | yüksek |
| 425 | Yankı odası etkisi neyi anlatır? | ✔ Benzer görüşlerle çevrelenmeyi | PASİF · ipucu | yüksek |
| 426 | Bir binada asansör yangında neden kullanılmaz? | ✔ Arıza ve kapanma riski | kalır | yüksek |
| 427 | Standart 3x3 Rubik küpünün her bir yüzünde kaç kare bulunur? | ✔ 9 | kalır | yüksek |
| 428 | Uygulama imar planı neyi ayrıntılandırır? | ✔ Parsel ve yapılaşma koşullarını | PASİF · ipucu | yüksek |
| 429 | Londra'da Parlamento Sarayı'nın saat kulesindeki ünlü çanın lakabı nedir? | ✔ Big Ben | kalır | yüksek |
| 430 | 'Dizin' kitapta ne işe yarar? | ✔ Kavram ve adların yerini bulmaya | kalır | yüksek |
| 431 | Safranbolu hangi özelliğiyle UNESCO listesindedir? | ✔ Geleneksel evleri | PASİF · ipucu | yüksek |
| 432 | Şanlıurfa'nın meşhur lakabı nedir? | ✔ Peygamberler şehri | kalır | yüksek |
| 433 | Yunan mitolojisinde yeraltı dünyasının tanrısı kimdir? | ✔ Hades | kalır | yüksek |
| 434 | Hindistan'da kutsal kabul edilen hayvan hangisidir? | ✔ İnek | kalır | yüksek |
| 435 | Lastik basıncının düşük olması neye yol açar? | ✔ Yakıt tüketiminin artmasına | kalır | yüksek |
| 436 | Nobel Ödülleri kaç dalda verilir? | ✔ 6 | PASİF · belirsiz | yüksek |
| 437 | Kamu yararına dernek statüsü neyi sağlar? | ✔ Belirli hukuki ve mali kolaylıklar | PASİF · kalite | yüksek |
| 438 | Hangi dil Latin kökenli değildir? | ✔ Almanca | kalır | yüksek |
| 439 | Coğrafi işaret tescili neyi korur? | ✔ Ürünün yöresel kimliğini | kalır | yüksek |
| 440 | Bir yılda kaç gün vardır? | ✔ 365 | PASİF · basit | yüksek |
| 441 | 'Rüzgâr eken ...' atasözünün devamı nedir? | ✔ fırtına biçer | kalır | yüksek |
| 442 | Japon içkisi sake hangi tahıldan yapılır? | ✔ Pirinç | kalır | yüksek |
| 443 | Çek ve senet hangi tür belgelerdir? | ✔ Kıymetli evrak | kalır | yüksek |
| 444 | Kruvasanın atası sayılan hilal biçimli 'kipferl' hangi ülkenin mutfağından gelir? | ✔ Avusturya | kalır | yüksek |
| 445 | Monopoly'nin özgün ABD sürümünde en pahalı arsa hangisidir? | ✔ Boardwalk | kalır | yüksek |
| 446 | Güney Kore'nin para birimi nedir? | ✔ Won | kalır | yüksek |
| 447 | Monopoly'de oyuncular neyi alıp satarak zengin olmaya çalışır? | ✔ Mülk | kalır | yüksek |
| 448 | Denizcilikte hız birimi hangisidir? | ✔ Knot | kalır | yüksek |
| 449 | Ağaç dikmenin en uygun mevsimi genellikle hangisidir? | ✔ Sonbahar veya ilkbahar | PASİF · ipucu | yüksek |
| 450 | 'Hola' hangi dilde 'merhaba' anlamına gelir? | ✔ İspanyolca | kalır | yüksek |
| 451 | Şubat ayı normal yıllarda kaç gündür? | ✔ 28 | kalır | yüksek |
| 452 | Denizde yön bulmada yıldızlardan yararlanmaya ne denir? | ✔ Gök seyri | kalır | yüksek |
| 453 | 'Toplum sözleşmesi' düşüncesi neyi tartışır? | ✔ Siyasal iktidarın kaynağını | PASİF · ipucu | yüksek |
| 454 | Hangi ülkenin bayrağı sadece kırmızı ve beyazdan oluşur? | ✔ Polonya | kalır | yüksek |
| 455 | Noel Baba'nın kızağını hangi hayvanlar çeker? | ✔ Geyikler | kalır | yüksek |
| 456 | 'Kuvvetler ayrılığı' neyi önerir? | ✔ Yetkilerin ayrı organlara dağıtılmasını | PASİF · ipucu | yüksek |
| 457 | Süper kahraman Superman hangi gezegenden gelir? | ✔ Kripton | kalır | yüksek |
| 458 | Yapay dil Esperanto'yu 1887'de yayımlayan kişi kimdir? | ✔ Ludwik Zamenhof | kalır | düşük |
| 459 | Çeltik hangi ürünün tarladaki adıdır? | ✔ Pirinç | kalır | yüksek |
| 460 | 'LEGO' adı Danca 'leg godt' ifadesinden gelir; bu ifade ne anlama gelir? | ✔ İyi oyna | kalır | yüksek |
| 461 | Buluş yapan kişiye tanınan yasal korumaya ne ad verilir? | ✔ Patent | kalır | yüksek |
| 462 | İsviçre'nin para birimi nedir? | ✔ Frank | kalır | yüksek |
| 463 | İki parçalı 'bikini' mayoyu 1946'da bu adla tanıtan Fransız tasarımcı kimdir? | ✔ Louis Réard | PASİF · zor | yüksek |
| 464 | Bir ürünün "son tüketim" ile "tavsiye edilen tüketim" tarihi farkı nedir? | ✔ Biri güvenlik, diğeri kalite | PASİF · ipucu | yüksek |
| 465 | Telif hakkı süresi dolan eserler nasıl anılır? | ✔ Kamu malı | kalır | düşük |
| 466 | Çin takvimindeki on iki hayvanlık döngünün ilk hayvanı hangisidir? | ✔ Fare | kalır | yüksek |
| 467 | İlk yardımın temel amacı nedir? | ✔ Yardım gelene dek durumu korumak | PASİF · ipucu | yüksek |
| 468 | Interpol'ün merkezi hangi ülkededir? | ✔ Fransa | kalır | yüksek |
| 469 | Garanti belgesi neyi güvence altına alır? | ✔ Belirli süre onarım ve değişim hakkını | PASİF · ipucu | yüksek |
| 470 | 'Leviathan' adlı siyaset felsefesi eserinin yazarı kimdir? | ✔ Thomas Hobbes | kalır | yüksek |
| 471 | Perçinli kot pantolonun patentini 1873'te Levi Strauss ile birlikte alan terzi kimdir? | ✔ Jacob Davis | PASİF · zor | yüksek |
| 472 | Bir kişinin suçsuz sayılması ilkesine ne denir? | ✔ Masumiyet karinesi | kalır | yüksek |
| 473 | Mizah dergiciliğinde iz bırakan "Gırgır" ne tür bir yayındı? | ✔ Karikatür dergisi | kalır | yüksek |
| 474 | Prado Müzesi hangi şehirdedir? | ✔ Madrid | kalır | yüksek |
| 475 | Bir metre kaç santimetredir? | ✔ 100 | PASİF · basit | yüksek |
| 476 | Romen rakamlarında "C" kaçı ifade eder? | ✔ 100 | kalır | yüksek |
| 477 | Bir yerleşim yerinin en küçük yönetim birimi hangisidir? | ✔ Muhtarlık | kalır | yüksek |
| 478 | Dama oyununda taşlar nasıl ilerler? | ✔ Çapraz | PASİF · belirsiz | yüksek |
| 479 | Bir dominoda en yüksek sayı kaçtır? | ✔ 6 | kalır | yüksek |
| 480 | Mitolojide balmumu kanatlarıyla güneşe fazla yaklaşan kimdir? | ✔ İkarus | kalır | yüksek |
| 481 | Bir ülkenin temel yasalarını içeren belge hangisidir? | ✔ Anayasa | kalır | yüksek |
| 482 | MTA kurumunun görev alanı nedir? | ✔ Maden ve yer bilimleri araştırmaları | PASİF · ipucu | yüksek |
| 483 | Türk simidinin üzerine geleneksel olarak hangi tohum serpilir? | ✔ Susam | kalır | yüksek |
| 484 | Transit ticaret ne anlama gelir? | ✔ Bir ülke üzerinden geçen ticaret | PASİF · ipucu | yüksek |
| 485 | Nobel Barış Ödülü hangi şehirde verilir? | ✔ Oslo | kalır | yüksek |
| 486 | Türk mutfağında "mezelik" ne anlama gelir? | ✔ Ana yemek öncesi küçük tabaklar | PASİF · ipucu | yüksek |
| 487 | 'Manga' ile 'anime' arasındaki fark nedir? | ✔ Manga basılı çizgi romandır | PASİF · ipucu | yüksek |
| 488 | Pulitzer Ödülü ağırlıklı olarak hangi alandadır? | ✔ Gazetecilik | kalır | yüksek |
| 489 | Birleşmiş Milletler'in genel merkezi hangi şehirdedir? | ✔ New York | kalır | yüksek |
| 490 | 'Minber' ne için kullanılır? | ✔ Hutbe için | kalır | yüksek |
| 491 | İngilizcede oyuncak ayıya verilen 'teddy bear' adı hangi ABD başkanından gelir? | ✔ Theodore Roosevelt | kalır | yüksek |
| 492 | Coca-Cola'yı 1886'da Atlanta'da ilk kez hazırlayan eczacı kimdir? | ✔ John Pemberton | kalır | yüksek |
| 493 | Madeni para koleksiyonculuğuna ne denir? | ✔ Nümismatik | kalır | yüksek |
| 494 | Tüketici haklarından biri hangisidir? | ✔ Ayıplı malı iade | PASİF · kalite | yüksek |
| 495 | Gemilerde denge sağlamak için kullanılan ağırlığa ne denir? | ✔ Safra | kalır | yüksek |
| 496 | Elektrik çarpmasında ilk yapılacak nedir? | ✔ Akımı kesmek | kalır | yüksek |
| 497 | Hindistan'da insanların birbirine renkli toz attığı bahar festivali hangisidir? | ✔ Holi | kalır | yüksek |
| 498 | Kırmızı ve sarı renkleri karıştırınca hangi renk oluşur? | ✔ Turuncu | PASİF · basit | yüksek |
| 499 | Adidas'ın ünlü işareti kaç çizgiden oluşur? | ✔ 3 | kalır | yüksek |
| 500 | Mısır mitolojisinde güneş tanrısı kimdir? | ✔ Ra | kalır | yüksek |
| 501 | Sokrates'in idam edilirken içtiği zehir hangi bitkiden elde edilmiştir? | ✔ Baldıran | kalır | yüksek |
| 502 | Japonların çiçekleri belirli kurallara göre düzenleme sanatına ne ad verilir? | ✔ Ikebana | kalır | yüksek |
| 503 | Rio de Janeiro'daki dev İsa heykelinin adı nedir? | ✔ Kurtarıcı İsa | kalır | yüksek |
| 504 | Domates, mozzarella ve fesleğeniyle İtalyan bayrağını andıran pizza hangi kraliçenin adın… | ✔ Margherita | kalır | yüksek |
| 505 | Yangın tüpü kullanırken nereye püskürtülür? | ✔ Alevin dibine | kalır | yüksek |
| 506 | Bir ülkenin sanayi ürünü ihracatının artması neyi gösterir? | ✔ Katma değerin yükseldiğini | PASİF · ipucu | yüksek |
| 507 | Bir gemide "iskele" hangi yönü belirtir? | ✔ Sol | kalır | yüksek |
| 508 | Platon'un öğrencisi olan ünlü filozof kimdir? | ✔ Aristoteles | kalır | yüksek |
| 509 | Dünya dillerinin kaybolmasının başlıca nedeni nedir? | ✔ Baskın dile geçiş ve kuşak kopukluğu | PASİF · ipucu | yüksek |
| 510 | İngiltere'nin para birimi hangisidir? | ✔ Sterlin | kalır | yüksek |
| 511 | Afet lojistiğinde en kritik unsur nedir? | ✔ Hızlı ve doğru dağıtım | PASİF · ipucu | yüksek |
| 512 | Köpüklü şarap 'şampanya' adını nereden alır? | ✔ Bir Fransız bölgesinden | kalır | yüksek |
| 513 | Malatya kayısısı ve Antep baklavası hangi koruma kapsamındadır? | ✔ Coğrafi işaret | PASİF · kalite | yüksek |
| 514 | Sağlıklı beslenmede tabağın en büyük bölümü ne olmalı? | ✔ Sebze | PASİF · basit | yüksek |
| 515 | 'Keçe' nasıl elde edilir? | ✔ Yünü sıkıştırarak | kalır | yüksek |
| 516 | Buharda pişirmenin avantajı nedir? | ✔ Besin değerini korur | PASİF · ipucu | yüksek |
| 517 | Türkiye'de demiryollarını işleten kurum hangisidir? | ✔ TCDD | kalır | yüksek |
| 518 | Barbie bebeğin erkek arkadaşının adı nedir? | ✔ Ken | kalır | yüksek |
| 519 | Atatürk'ü Anma Günü hangi tarihte anılır? | ✔ 10 Kasım | kalır | yüksek |
| 520 | Ana yönler kaç tanedir? | ✔ 4 | PASİF · basit | yüksek |
| 521 | "QWERTY" adı nereden gelmektedir? | ✔ Klavyenin ilk altı harfinden | PASİF · ipucu | yüksek |
| 522 | Biruni hangi alanlarda eser vermiştir? | ✔ Astronomi ve matematik | PASİF · kalite | yüksek |
| 523 | Mavi zeminli yuvarlak trafik levhaları neyi belirtir? | ✔ Mecburiyet | PASİF · kalite | yüksek |
| 524 | Trafikte 'ölü nokta' ne demektir? | ✔ Aynalardan görülemeyen alan | PASİF · ipucu | yüksek |
| 525 | Çini sanatıyla ünlü ilimiz hangisidir? | ✔ Kütahya | kalır | yüksek |
| 526 | Eski bir sayı ölçüsü olan bir 'grosa' kaç adettir? | ✔ 144 | kalır | yüksek |
| 527 | Trafikte kırmızı ışıkta ne yapılır? | ✔ Durulur | PASİF · basit | yüksek |
| 528 | Değerli taşlarda kullanılan bir metrik karat kaç miligramdır? | ✔ 200 | kalır | yüksek |
| 529 | Antropoloji bilimi hangi konuyu araştırır? | ✔ İnsanı ve kültürlerini | PASİF · ipucu | yüksek |
| 530 | Ülkelerin satın alma gücünü bir hamburger fiyatıyla karşılaştıran 'Big Mac Endeksi'ni han… | ✔ The Economist | kalır | yüksek |
| 531 | Güneş hangi yönde batar? | ✔ Batı | PASİF · basit | yüksek |
| 532 | Mors alfabesini geliştiren Samuel Morse asıl olarak hangi meslekle tanınıyordu? | ✔ Ressam | kalır | yüksek |
| 533 | Miras hukuku neyi düzenler? | ✔ Ölen kişinin mal paylaşımını | PASİF · ipucu | yüksek |
| 534 | Safran hangi bitki kısmından elde edilir? | ✔ Çiçek tepeciği | PASİF · ipucu | yüksek |
| 535 | Karbon ticareti sisteminin mantığı nedir? | ✔ Salım hakkının alınıp satılması | PASİF · ipucu | yüksek |
| 536 | Türkiye'de yeni Türk alfabesi hangi alfabeye dayanır? | ✔ Latin | kalır | yüksek |
| 537 | Deprem sırasında araç kullanan kişi ne yapmalıdır? | ✔ Güvenli yerde durmak | PASİF · ipucu | yüksek |
| 538 | Tiyatroda "prömiyer" ne demektir? | ✔ İlk gösterim | kalır | yüksek |
| 539 | Yunan mitolojisinde ölülerin ruhlarını yeraltı ırmağından geçiren kayıkçı kimdir? | ✔ Kharon | kalır | yüksek |
| 540 | Dünyanın en yüksek binası hangisidir? | ✔ Burj Khalifa | PASİF · güncellik | yüksek |
| 541 | Uzay hukuku hangi ilkeyi benimser? | ✔ Uzayın tüm insanlığın ortak alanı olması | PASİF · ipucu | yüksek |
| 542 | Nasreddin Hoca hangi şehrimizle anılır? | ✔ Akşehir | kalır | düşük |
| 543 | Çayıyla ünlü ilimiz hangisidir? | ✔ Rize | kalır | yüksek |
| 544 | İbrani alfabesi kaç temel harften oluşur? | ✔ 22 | PASİF · zor | yüksek |
| 545 | Nadas ne demektir? | ✔ Toprağı dinlendirmek | kalır | yüksek |
| 546 | Sel sırasında ne yapılmamalıdır? | ✔ Su birikintisine girmek | kalır | yüksek |
| 547 | Kentsel dönüşümde 'yerinde dönüşüm' ne demektir? | ✔ Halkın aynı bölgede kalması | kalır | yüksek |
| 548 | Kedilerin tırmalama ihtiyacı nedendir? | ✔ Tırnak bakımı ve işaretleme | PASİF · ipucu | yüksek |
| 549 | İsveç'in para birimi nedir? | ✔ Kron | kalır | yüksek |
| 550 | İbn Sina hangi alandaki eseriyle tanınır? | ✔ Tıp | kalır | yüksek |
| 551 | Sözleşmede "fesih" ne anlama gelir? | ✔ Sona erdirme | kalır | yüksek |
| 552 | Ernő Rubik ünlü küpünü icat ettiğinde hangi alanda öğretim üyesiydi? | ✔ Mimarlık | kalır | yüksek |
| 553 | Kahvenin anavatanı hangi ülke kabul edilir? | ✔ Etiyopya | kalır | yüksek |
| 554 | Yunan mitolojisinde demircilik ve ateş tanrısı kimdir? | ✔ Hephaistos | kalır | yüksek |
| 555 | Kültürel asimilasyon neyi anlatır? | ✔ Bir grubun baskın kültüre karışması | PASİF · ipucu | yüksek |
| 556 | Geri dönüşüm sembolü hangi şekildedir? | ✔ Üçgen oluşturan oklar | kalır | yüksek |
| 557 | Mercedes-Benz'in logosunda hangi şekil bulunur? | ✔ Yıldız | kalır | yüksek |
| 558 | Deprem çantasında bulunması gerekenlerden biri nedir? | ✔ Su ve el feneri | PASİF · basit | yüksek |
| 559 | Romen rakamlarında "X" kaçı ifade eder? | ✔ 10 | kalır | yüksek |
| 560 | Bir sözleşmenin geçerli olması için ne gerekir? | ✔ Tarafların rızası | PASİF · kalite | yüksek |
| 561 | Burçlardan hangisinin simgesi aslandır? | ✔ Aslan | PASİF · basit | yüksek |
| 562 | Gökyüzü genellikle hangi renkte görünür? | ✔ Mavi | PASİF · basit | yüksek |
| 563 | Azerbaycan'ın para birimi nedir? | ✔ Manat | kalır | yüksek |
| 564 | Mavi ve sarı renkleri karıştırınca hangi renk oluşur? | ✔ Yeşil | PASİF · basit | yüksek |
| 565 | Uluslararası Birimler Sistemi'nde (SI) kaç temel birim vardır? | ✔ 7 | → bilim | yüksek |
| 566 | Çiğ köftesiyle ünlü ilimiz hangisidir? | ✔ Şanlıurfa | kalır | yüksek |
| 567 | Nobel ödüllerinin verilmeye başlandığı yıl hangisidir? | ✔ 1901 | kalır | yüksek |
| 568 | Dünya genelinde ünlü Hello Kitty hangi ülkenin karakteridir? | ✔ Japonya | kalır | yüksek |
| 569 | Kırmızı Haç örgütü hangi alanda çalışır? | ✔ Yardım | kalır | yüksek |
| 570 | Reklamın temel amacı nedir? | ✔ Tanıtım | kalır | yüksek |
| 571 | Bolonez sos adını hangi İtalyan şehrinden alır? | ✔ Bologna | kalır | yüksek |
| 572 | Ferrari hangi ülkenin otomobil markasıdır? | ✔ İtalya | kalır | yüksek |
| 573 | Bir çeyrek saat kaç dakikadır? | ✔ 15 | PASİF · basit | yüksek |
| 574 | Bir mil yaklaşık kaç kilometredir? | ✔ 1,6 | kalır | yüksek |
| 575 | Almanya bayrağındaki renkler hangileridir? | ✔ Siyah, kırmızı, sarı | kalır | yüksek |
| 576 | Suşi hangi ülkenin mutfağıyla özdeşleşmiştir? | ✔ Japonya | kalır | yüksek |
| 577 | Esperanto nedir? | ✔ Yapay bir dil | kalır | yüksek |
| 578 | Farabi hangi lakapla anılır? | ✔ Muallim-i Sani | kalır | yüksek |
| 579 | Brandenburg Kapısı hangi şehirdedir? | ✔ Berlin | kalır | düşük |
| 580 | Şintoizm hangi ülkeyle özdeşleşmiştir? | ✔ Japonya | kalır | yüksek |
| 581 | Sushi hangi tahılla hazırlanır? | ✔ Pirinç | kalır | yüksek |
| 582 | İlk yapay uydunun adı nedir? | ✔ Sputnik | kalır | yüksek |
| 583 | Kanunların Ruhu adlı eserde kuvvetler ayrılığını savunan düşünür kimdir? | ✔ Montesquieu | kalır | yüksek |
| 584 | Tedarik zinciri kesintilerinin ekonomik sonucu nedir? | ✔ Üretim gecikmesi ve fiyat artışı | PASİF · ipucu | yüksek |
| 585 | Roma mitolojisinde savaş tanrısı kimdir? | ✔ Mars | kalır | yüksek |
| 586 | Bir galon hangi tür ölçüdür? | ✔ Hacim | kalır | yüksek |
| 587 | Hamurun dinlendirilmesi neyi sağlar? | ✔ Kolay şekil almasını | kalır | yüksek |
| 588 | Göbeklitepe hangi ilimizdedir? | ✔ Şanlıurfa | kalır | yüksek |
| 589 | "Düşünüyorum, öyleyse varım" sözü kime aittir? | ✔ Descartes | kalır | yüksek |
| 590 | Satrançta oyuna hangi taş başlar? | ✔ Beyaz | kalır | yüksek |
| 591 | Ankara keçisinin ürünü nedir? | ✔ Tiftik | kalır | yüksek |
| 592 | Yunan mitolojisinde gök kubbeyi omuzlarında taşımakla cezalandırılan titan kimdir? | ✔ Atlas | kalır | yüksek |
| 593 | Tavla kaç pul ile oynanır (her oyuncu)? | ✔ 15 | kalır | yüksek |
| 594 | New York'un simgesi olan taksiler hangi renktedir? | ✔ Sarı | kalır | yüksek |
| 595 | Bir hektar kaç metrekaredir? | ✔ 10000 | kalır | yüksek |
| 596 | Tango hangi ülkeyle özdeşleşmiştir? | ✔ Arjantin | kalır | yüksek |
| 597 | Bir trafik levhasında üçgen biçim neyi bildirir? | ✔ Tehlike | kalır | yüksek |
| 598 | Dünya Ekonomik Forumu'nun yıllık toplantısı hangi İsviçre kasabasında yapılır? | ✔ Davos | kalır | yüksek |
| 599 | İskambil destesinde kaç kart vardır (jokersiz)? | ✔ 52 | kalır | yüksek |
| 600 | '&' işareti (ampersand) aslen hangi Latince sözcüğün harflerinin birleşmesinden doğmuştur? | ✔ Et | kalır | yüksek |
| 601 | 'Ağaç yaşken ...' atasözünün devamı nedir? | ✔ eğilir | kalır | yüksek |
| 602 | Dairenin 360 dereceye bölünmesi Babil'in hangi sayı sisteminden gelir? | ✔ Altmışlık | kalır | yüksek |
| 603 | Kırtasiyede bir top (ream) kâğıt kaç yapraktan oluşur? | ✔ 500 | kalır | yüksek |
| 604 | Hangi hayvan sesini taklit edebilir? | ✔ Papağan | PASİF · kalite | yüksek |
| 605 | "Ayağını yorganına göre uzat" ne anlatır? | ✔ Ölçülü harcamayı | kalır | yüksek |
| 606 | ABD'nin ulusal simgesi olan kuş hangisidir? | ✔ Kartal | kalır | yüksek |
| 607 | Bir zarın karşılıklı yüzlerinin toplamı kaçtır? | ✔ 7 | kalır | yüksek |
| 608 | Plastik yapı bloklarıyla ünlü LEGO hangi ülkenin markasıdır? | ✔ Danimarka | kalır | yüksek |
| 609 | Mutfakta çapraz bulaşmayı önlemek için ne kullanılır? | ✔ Ayrı kesme tahtaları | PASİF · basit | yüksek |
| 610 | Mutlak monarşi ile meşruti monarşi arasındaki temel fark nedir? | ✔ Anayasa ve meclisin varlığı | PASİF · ipucu | yüksek |
| 611 | Veto yetkisi neyi ifade eder? | ✔ Bir kararı geri çevirme | kalır | yüksek |
| 612 | Hangi gezegen adını Roma savaş tanrısından alır? | ✔ Mars | kalır | yüksek |
| 613 | Yangında dumandan korunmak için nasıl hareket edilir? | ✔ Eğilerek | PASİF · kalite | yüksek |
| 614 | Divriği Ulu Camii hangi ilimizdedir? | ✔ Sivas | kalır | yüksek |
| 615 | Türkiye'nin ilk yerli otomobil markası girişimi hangisidir? | ✔ Devrim | kalır | düşük |
| 616 | 'Namaste' hangi ülkede kullanılan bir selamlaşma sözüdür? | ✔ Hindistan | kalır | yüksek |
| 617 | Bir tavla oyununda kaç pul kullanılır? | ✔ 30 | kalır | yüksek |
| 618 | Hıdrellez hangi mevsimde kutlanır? | ✔ İlkbahar | kalır | yüksek |
| 619 | Uyuşmazlıkları çözen erk hangisidir? | ✔ Yargı | kalır | yüksek |
| 620 | Yılbaşında evlerde süslenen ağaç türü hangisidir? | ✔ Çam | kalır | yüksek |
| 621 | Hangi içecek dünyada sudan sonra en çok tüketilir? | ✔ Çay | PASİF · güncellik | yüksek |
| 622 | İskender kebap hangi şehrimizle özdeşleşmiştir? | ✔ Bursa | kalır | yüksek |
| 623 | Toyota hangi ülkenin otomobil markasıdır? | ✔ Japonya | kalır | yüksek |
| 624 | Tek gözlü dev Tepegöz'ün Yunan mitolojisindeki karşılığı nedir? | ✔ Kiklop | kalır | yüksek |
| 625 | OPEC örgütü hangi alanda etkilidir? | ✔ Petrol üretim ve fiyat politikası | PASİF · ipucu | yüksek |
| 626 | Vatikan neyin merkezidir? | ✔ Katolik Kilisesi | kalır | yüksek |
| 627 | Yangın tüpünde "ABC" ne anlama gelir? | ✔ Yangın sınıfları | kalır | yüksek |
| 628 | Yapışkan not kâğıdı 'Post-it'i geliştiren şirket hangisidir? | ✔ 3M | kalır | yüksek |
| 629 | 'Öşür' hangi üründen alınırdı? | ✔ Tarım ürününden | kalır | düşük |
| 630 | A serisi kâğıt ölçülerinde A0 sayfanın alanı kaç metrekaredir? | ✔ 1 | kalır | yüksek |
| 631 | Avrupa İnsan Hakları Mahkemesi hangi şehirdedir? | ✔ Strazburg | kalır | yüksek |
| 632 | Fındık üretiminde dünya lideri ülke hangisidir? | ✔ Türkiye | PASİF · güncellik | yüksek |
| 633 | Meksika'nın para birimi nedir? | ✔ Peso | kalır | yüksek |
| 634 | Aya İrini kilisesi hangi şehirde bulunur? | ✔ İstanbul | kalır | yüksek |
| 635 | Yunan mitolojisinde denizlerin tanrısı kimdir? | ✔ Poseidon | kalır | yüksek |
| 636 | Aydınlanma Çağı düşünürlerinden Toplum Sözleşmesi'nin yazarı kimdir? | ✔ Jean-Jacques Rousseau | kalır | yüksek |
| 637 | Kültür tarihinde "külliye" ne demektir? | ✔ Yapılar topluluğu | kalır | yüksek |
| 638 | 'Bir fincan kahvenin ...' atasözünün devamı nedir? | ✔ kırk yıl hatırı vardır | kalır | yüksek |
| 639 | Pul koleksiyonculuğuna ne denir? | ✔ Filateli | kalır | yüksek |
| 640 | Romen rakamlarıyla yazılan MCMXC hangi yılı gösterir? | ✔ 1990 | kalır | yüksek |
| 641 | Pastırmanın üzerine sürülen baharatlı karışıma ne denir? | ✔ Çemen | kalır | yüksek |
| 642 | Pulitzer Ödülleri ilk kez hangi yıl verildi? | ✔ 1917 | PASİF · zor | yüksek |
| 643 | McDonald's'ın maskotu olan palyaçonun adı nedir? | ✔ Ronald | kalır | yüksek |
| 644 | Serbest bölgelerin temel amacı nedir? | ✔ Dış ticareti kolaylaştırmak | kalır | yüksek |
| 645 | Mekânları enerji akışına göre düzenlemeyi amaçlayan geleneksel Çin uygulaması hangisidir? | ✔ Feng shui | kalır | yüksek |
| 646 | Mitolojiye göre Aşil'in zayıf noktası neresidir? | ✔ Topuğu | kalır | yüksek |
| 647 | Bir buçuk saat kaç dakikadır? | ✔ 90 | PASİF · basit | yüksek |
| 648 | Çamaşır etiketindeki çarpı işaretli simge ne anlatır? | ✔ Yapılmaması gerekeni | PASİF · ipucu | yüksek |
| 649 | Hatay hangi özelliğiyle "medeniyetler şehri" olarak anılır? | ✔ Farklı din ve kültürlerin birlikteliği | PASİF · ipucu | yüksek |
| 650 | 'Halay' nasıl oynanır? | ✔ El ele halka veya sıra hâlinde | PASİF · ipucu | yüksek |
| 651 | Suudi Arabistan'ın para birimi nedir? | ✔ Riyal | kalır | yüksek |
| 652 | 1950'de restoran hesaplarını ödemek için çıkarılan ilk çok amaçlı ödeme kartı hangisidir? | ✔ Diners Club | kalır | yüksek |
| 653 | Hangi ülkenin bayrağı kare şeklindedir? | ✔ İsviçre | kalır | yüksek |
| 654 | 'Ateş düştüğü yeri ...' atasözünün devamı nedir? | ✔ yakar | kalır | yüksek |
| 655 | Etimoloji hangi konuyla ilgilenir? | ✔ Kelimelerin kökeniyle | kalır | yüksek |
| 656 | Soğuk zincir kavramı neyi ifade eder? | ✔ Ürünün üretimden tüketime soğuk kalması | PASİF · ipucu | yüksek |
| 657 | Standart Braille alfabesinde bir hücre kaç kabartma noktadan oluşur? | ✔ 6 | kalır | yüksek |
| 658 | 'Somut olmayan kültürel miras' neyi kapsar? | ✔ Gelenek ve becerileri | PASİF · ipucu | yüksek |
| 659 | 'Gereksiz yere varsayım çoğaltılmamalıdır' ilkesiyle anılan 14. yüzyıl filozofu kimdir? | ✔ Ockhamlı William | PASİF · zor | yüksek |
| 660 | Bir kara mili kaç fittir? | ✔ 5280 | PASİF · zor | yüksek |
| 661 | Madeni para biriktirmeye ne ad verilir? | ✔ Numismatik | kalır | yüksek |
| 662 | Mısır mitolojisinde ölüler diyarının tanrısı kimdir? | ✔ Osiris | PASİF · belirsiz | yüksek |
| 663 | Kentsel dönüşümün temel amacı nedir? | ✔ Sağlıksız yapı stokunu yenilemek | PASİF · ipucu | yüksek |
| 664 | Girit'te Minotor'un hapsedildiği labirenti tasarlayan usta kimdir? | ✔ Daidalos | kalır | yüksek |
| 665 | Ansiklopedi ile sözlük arasındaki temel fark nedir? | ✔ Ansiklopedinin konuyu açıklaması | kalır | yüksek |
| 666 | UNESCO'nun genel merkezi hangi şehirdedir? | ✔ Paris | kalır | yüksek |
| 667 | Ferrari'nin logosunda hangi hayvan yer alır? | ✔ At | kalır | yüksek |
| 668 | Avustralya'nın simgesi olan, sıçrayarak ilerleyen hayvan hangisidir? | ✔ Kanguru | kalır | yüksek |
| 669 | İki nokta hangi durumda kullanılır? | ✔ Açıklama ve sıralama öncesi | PASİF · kalite | yüksek |
| 670 | Alaaddin'in sihirli lambasını ovalayınca çıkan varlık nedir? | ✔ Cin | kalır | yüksek |
| 671 | 'Sakla samanı ...' atasözünün devamı nedir? | ✔ gelir zamanı | kalır | yüksek |
| 672 | Hacı Bektaş Veli Türbesi hangi ilimizdedir? | ✔ Nevşehir | kalır | yüksek |
| 673 | Tüketici hakları kapsamında 'ayıplı mal' ne demektir? | ✔ Sözleşmeye uygun olmayan ürün | PASİF · ipucu | yüksek |
| 674 | Monopoly'nin özgün ABD sürümündeki sokak adları hangi şehirden alınmıştır? | ✔ Atlantic City | kalır | yüksek |
| 675 | "Eli ayağı dolaşmak" ne demektir? | ✔ Şaşırıp beceremez olmak | PASİF · ipucu | yüksek |
| 676 | Emmy, Grammy, Oscar ve Tony ödüllerinin hepsini kazananlar için kullanılan kısaltma hangi… | ✔ EGOT | kalır | yüksek |
| 677 | Çin'in para birimi nedir? | ✔ Yuan | kalır | yüksek |
| 678 | Diplomaside büyükelçi kimdir? | ✔ Devletin en üst düzey temsilcisi | PASİF · ipucu | yüksek |
| 679 | Düzenli uykunun yetişkin için önerilen süresi nedir? | ✔ 7-8 saat | kalır | yüksek |
| 680 | Bir projede "kilometre taşı" ne demektir? | ✔ Önemli ara hedef | kalır | yüksek |
| 681 | Cam üretiminin temel hammaddesi nedir? | ✔ Kum (silis) | PASİF · kalite | yüksek |
| 682 | Bayrağında ülke haritası bulunan Avrupa ülkesi hangisidir? | ✔ Kosova | kalır | yüksek |
| 683 | 'Aloha' hangi ada eyaletinde kullanılan bir selamlaşma sözüdür? | ✔ Hawaii | kalır | yüksek |
| 684 | Petrolün işlendiği tesise ne denir? | ✔ Rafineri | kalır | yüksek |
| 685 | Starbucks'ın yeşil logosunda hangi efsanevi yaratık yer alır? | ✔ Denizkızı | kalır | yüksek |
| 686 | Bağış ile sponsorluk arasındaki fark nedir? | ✔ Sponsorlukta tanıtım beklenmesi | PASİF · ipucu | yüksek |
| 687 | Pul biriktirme merakına ne ad verilir? | ✔ Filateli | kalır | düşük |
| 688 | Polonya'nın para birimi nedir? | ✔ Zloti | kalır | yüksek |
| 689 | İskoç erkeklerin giydiği ekose desenli geleneksel etek hangisidir? | ✔ Kilt | kalır | yüksek |
| 690 | Vanilya hangi bitkiden elde edilir? | ✔ Orkide | kalır | yüksek |
| 691 | Türk mitolojisinde gök tanrı inancının adı nedir? | ✔ Tengri | kalır | düşük |
| 692 | Meksika içkisi tekila hangi bitkiden elde edilir? | ✔ Mavi agav | kalır | düşük |
| 693 | Halloween'da çocuklar kapıları çalarak ne ister? | ✔ Şeker | kalır | yüksek |
| 694 | Eritilmiş peynire ekmek batırılarak yenen 'fondü' en çok hangi ülkenin ulusal yemeği olar… | ✔ İsviçre | kalır | yüksek |
| 695 | Braille alfabesi kimler için geliştirilmiştir? | ✔ Görme engelliler | kalır | yüksek |
| 696 | 'Kalkınma planı' neyi düzenler? | ✔ Ekonomik hedef ve yatırımları | PASİF · ipucu | yüksek |
| 697 | İngilizcedeki 'Saturday' günü adını hangi tanrıdan alır? | ✔ Satürn | kalır | yüksek |
| 698 | Tarımsal destekleme politikasının amacı nedir? | ✔ Üretimi sürdürülebilir kılmak | PASİF · ipucu | yüksek |
| 699 | Pusulada kuzeyin kısaltması hangisidir? | ✔ K | PASİF · basit | yüksek |
| 700 | 'Müzayede' nasıl işler? | ✔ Artırmayla | kalır | yüksek |
| 701 | İtalyancada 'teşekkürler' anlamına gelen sözcük hangisidir? | ✔ Grazie | kalır | yüksek |
| 702 | İltica hakkı neyi ifade eder? | ✔ Zulümden kaçana sığınma hakkı | PASİF · ipucu | yüksek |
| 703 | Bir karat hangi alanda kullanılır? | ✔ Değerli taş ve altın | PASİF · ipucu | yüksek |
| 704 | 'Think Different' sloganı hangi şirkete aittir? | ✔ Apple | kalır | yüksek |
| 705 | Hollanda hangi çiçekle özdeşleşmiştir? | ✔ Lale | kalır | yüksek |
| 706 | ISO kâğıt boyutlarında A4'ün iki katı büyüklükteki kâğıt hangisidir? | ✔ A3 | kalır | yüksek |
| 707 | Psikanalizin kurucusu kimdir? | ✔ Freud | kalır | yüksek |
| 708 | Silikon en çok nerede kullanılır? | ✔ Su yalıtımında | PASİF · belirsiz | yüksek |
| 709 | Yunan mitolojisinde insanlara ateşi veren kahraman kimdir? | ✔ Prometheus | kalır | yüksek |
| 710 | 'Jumbo' kelimesini 'dev boy' anlamında yaygınlaştıran, 1882'de Londra Hayvanat Bahçesi'nd… | ✔ Bir fil | kalır | yüksek |
| 711 | Yufka, ceviz ve şerbetle yapılan tatlı hangisidir? | ✔ Baklava | kalır | yüksek |
| 712 | Birleşik Arap Emirlikleri'nin para birimi nedir? | ✔ Dirhem | kalır | yüksek |
| 713 | Klasik Yunan alfabesinde kaç harf vardır? | ✔ 24 | kalır | yüksek |
| 714 | Gucci hangi ülkenin lüks moda markasıdır? | ✔ İtalya | kalır | yüksek |
| 715 | Dünyada en çok konuşulan dillerden Mandarin hangi ülkeye aittir? | ✔ Çin | kalır | yüksek |
| 716 | Noel hangi ayda kutlanır? | ✔ Aralık | kalır | yüksek |
| 717 | Denizcilikte derinlik ölçüsü olarak kullanılan bir 'fathom' kaç fittir? | ✔ 6 | PASİF · zor | yüksek |
| 718 | Bir yarda kaç inçtir? | ✔ 36 | kalır | yüksek |
| 719 | Yunan mitolojisinde Medusa'nın başını kesen kahraman kimdir? | ✔ Perseus | kalır | yüksek |
| 720 | Cadılar Bayramı'nda (Halloween) oyulup içine mum konan sebze hangisidir? | ✔ Balkabağı | kalır | yüksek |
| 721 | 'Tatlı dil ...' atasözünün devamı nedir? | ✔ yılanı deliğinden çıkarır | kalır | yüksek |
| 722 | Bir zarın kaç yüzü vardır? | ✔ 6 | PASİF · basit | yüksek |
| 723 | Plastik kasalı renkli saatleriyle 1983'te piyasaya çıkan Swatch hangi ülkenin markasıdır? | ✔ İsviçre | kalır | yüksek |
| 724 | Kuru baklagiller pişirmeden önce neden ıslatılır? | ✔ Pişme süresini kısaltmak | PASİF · ipucu | yüksek |
| 725 | Anka kuşu hangi özelliğiyle bilinir? | ✔ Küllerinden yeniden doğması | kalır | yüksek |
| 726 | Nobel ödüllerine adını veren Alfred Nobel neyi icat etmiştir? | ✔ Dinamit | kalır | yüksek |
| 727 | İnanç turizmi hangi kaynağa dayanır? | ✔ Dinî mekânlara | PASİF · basit | yüksek |
| 728 | Marka tescili neyi korur? | ✔ Ticari işareti | kalır | yüksek |
| 729 | İngilizcedeki 'July' (Temmuz) ayı adını kimden almıştır? | ✔ Jül Sezar | kalır | yüksek |
| 730 | Diyarbakır surları hangi taştan yapılmıştır? | ✔ Bazalt | kalır | yüksek |

## Doğrulama (uygulama sonrası, canlı)

| Kategori | Aktif | Pasif |
|---|---:|---:|
| bilim | 1314 | 306 |
| cografya | 1734 | 337 |
| edebiyat | 1279 | 241 |
| genel_kultur | 519 | 983 |
| muzik | 1333 | 253 |
| sanat | 1263 | 280 |
| sinema | 1311 | 241 |
| spor | 1157 | 351 |
| tarih | 1249 | 230 |
| teknoloji | 1304 | 260 |

genel_kultur: 730 − 206 − 5 = 519 aktif, 777 + 206 = 983 pasif (beklenenle birebir). `genel` / `karisik` satırı yok.

## Tekrar çiftleri (migration 852, 2 Eki 2026)

Aynı bilgiyi soran 16 aktif çiftin her birinde bir soru pasife alındı (neden: `tekrar`), diğeri aktif kaldı.
Seçim: şıkları/çeldiricileri zayıf, metni daha kötü ya da cevabı daha belirsiz olan; eşitse id'si büyük olan.
No = yukarıdaki tam tablodaki sıra. Beklenen: genel_kultur aktif 519 → 503, pasif 983 → 999.

| No | id | Soru → doğru cevap | Karar | Neden |
|---:|---|---|---|---|
| 6 | `018186d8-9912-4eed-b9c2-cc456c8b8fad` | Samba hangi ülkeyle özdeşleşmiştir? → Brezilya | **kaldı** | |
| 19 | `05ce2d35-95f2-46de-97fc-9bb78c2522a3` | Samba hangi ülkenin dansıdır? → Brezilya | PASİF · tekrar | eşit (samba → Brezilya); id'si büyük olan |
| 14 | `0474dad6-4bd5-4ba3-9465-e4db5923c3ad` | Camide "minber" ne için kullanılır? → Hutbe okumak | **kaldı** | |
| 490 | `a42ca8cd-0d9c-4b21-af90-b7d3a6c2cdba` | 'Minber' ne için kullanılır? → Hutbe için | PASİF · tekrar | çeldiricisi zayıf ("Depolama için"), soru bağlamsız |
| 128 | `2a6b1d1e-12b2-4c19-a0bf-c39ebedb4fda` | Camide kıble yönünü gösteren öğe hangisidir? → Mihrap | **kaldı** | |
| 54 | `125a0a66-dbab-48ec-884c-9323fee9c780` | 'Mihrap' camide neyi gösterir? → Kıble yönünü | PASİF · tekrar | çeldiricileri karışık türde (minber, kadınlar bölümü, şadırvan) |
| 16 | `05719bd9-4fea-4aaa-b16f-bf255bf1a2f9` | Bir ülkenin en temel yasasına ne denir? → Anayasa | **kaldı** | |
| 481 | `a10f7bbe-7584-4dcb-b33d-486198851f2b` | Bir ülkenin temel yasalarını içeren belge hangisidir? → Anayasa | PASİF · tekrar | eşit (aynı şıklar); id'si büyük olan |
| 526 | `b2be3aa9-61f1-4b5a-b6b4-c1eb639cc4ef` | Eski bir sayı ölçüsü olan bir 'grosa' kaç adettir? → 144 | **kaldı** | |
| 64 | `179d8bb2-0d44-47c5-8cce-7083a3644af4` | Bir gros kaç adettir? → 144 | PASİF · tekrar | çeldiricisi zayıf ("12"), soru bağlamsız |
| 599 | `cdcac219-6977-4f00-acd1-2bcfd9275f07` | İskambil destesinde kaç kart vardır (jokersiz)? → 52 | **kaldı** | |
| 138 | `2df1a1d9-efa3-455d-a8d1-20ac2bf234a9` | Bir destede kaç oyun kâğıdı bulunur? → 52 | PASİF · tekrar | cevabı daha belirsiz (jokerli deste 54; diğeri "jokersiz" diyor) |
| 448 | `9657afff-9c71-4c91-a060-896c6d17c267` | Denizcilikte hız birimi hangisidir? → Knot | **kaldı** | |
| 163 | `36013dc0-2433-41c4-83a5-2bad6ee60fd7` | Denizcilikte geminin hızı hangi birimle ölçülür? → Knot | PASİF · tekrar | çeldiricileri zayıf (beygir, ton, fersah hız birimi değil) |
| 221 | `47e3dd64-fb8f-4a88-8e7e-cdb363a74cbd` | Oyuncak yapı parçalarıyla ünlü LEGO şirketi hangi ülkede kurulmuştur? → Danimarka | **kaldı** | |
| 608 | `d05e9c19-77a8-4a00-bf4a-22e88c8f8c39` | Plastik yapı bloklarıyla ünlü LEGO hangi ülkenin markasıdır? → Danimarka | PASİF · tekrar | eşit (LEGO → Danimarka); id'si büyük olan |
| 244 | `5053e591-0b3a-48a0-9738-a6c694869f00` | Sevgililer Günü hangi ayda kutlanır? → Şubat | **kaldı** | |
| 255 | `5353e619-e76f-4da2-8c6b-216248bbfb0c` | Sevgililer Günü her yıl hangi tarihte kutlanır? → 14 Şubat | PASİF · tekrar | çeldiricisi biçimce ayrık ("1 Kasım") |
| 285 | `5eb32d6a-c13c-436f-986e-aa663ab7123d` | Değerli taşlarda kullanılan 1 karat kaç gramdır? → 0,2 | **kaldı** | |
| 528 | `b35a1b34-dd62-4216-bfaf-63b4e2bdd250` | Değerli taşlarda kullanılan bir metrik karat kaç miligramdır? → 200 | PASİF · tekrar | eşit (karat = 0,2 g / 200 mg); id'si büyük olan |
| 289 | `601e0277-f2de-4c9a-8ab3-2bcb474021c4` | Dinamiti bulan kişi kimdir? → Alfred Nobel | **kaldı** | |
| 726 | `fe1c9766-317a-47b5-99a0-4cec99657ff1` | Nobel ödüllerine adını veren Alfred Nobel neyi icat etmiştir? → Dinamit | PASİF · tekrar | eşit (Nobel ↔ dinamit); id'si büyük olan |
| 493 | `a6423959-1d66-4a42-a9d3-2c75d408bed4` | Madeni para koleksiyonculuğuna ne denir? → Nümismatik | **kaldı** | |
| 661 | `e471a907-b360-4450-8995-d535a07bd7fb` | Madeni para biriktirmeye ne ad verilir? → Numismatik | PASİF · tekrar | yazım hatalı şık ("Numismatik") |
| 639 | `dd2147c3-d454-4601-881b-75fa85778931` | Pul koleksiyonculuğuna ne denir? → Filateli | **kaldı** | |
| 687 | `ede85aed-0934-4e37-af96-20b2dcf05ebb` | Pul biriktirme merakına ne ad verilir? → Filateli | PASİF · tekrar | yazım hatalı şık ("Numismatik"); Jev bu soruda yanıldı |
| 617 | `d3dc8ec1-f399-4b9a-80cc-6ca890debc7b` | Bir tavla oyununda kaç pul kullanılır? → 30 | **kaldı** | |
| 593 | `ca88e87f-5528-4ac4-b9c1-5a353ab8b374` | Tavla kaç pul ile oynanır (her oyuncu)? → 15 | PASİF · tekrar | metni kötü (parantezli "her oyuncu" eklemesi) |
| 626 | `d8811f98-9af1-4986-b161-659752839581` | Vatikan neyin merkezidir? → Katolik Kilisesi | **kaldı** | |
| 213 | `45eada97-77a9-4790-a13f-512984ff3bd3` | Vatikan hangi dinin merkezidir? → Katoliklik | PASİF · tekrar | metni kusurlu (Katolikliği "din" diye soruyor) |
| 404 | `81e91719-7ab8-419e-8cae-83fc0cc9eda9` | Topuğundan vurulan ölümsüz Yunan kahramanı kimdir? → Aşil | **kaldı** | |
| 646 | `df37de05-3b8d-4806-86b8-c132e242c120` | Mitolojiye göre Aşil'in zayıf noktası neresidir? → Topuğu | PASİF · tekrar | eşit (Aşil ↔ topuk); id'si büyük olan |

## İpucu soruları: şık düzeltmesi ve geri açma (migration 940, 2 Eki 2026)

851’de **ipucu** nedeniyle pasife alınan 110 sorunun yanlış şıkları yeniden yazıldı (doğru şıkla benzer uzunluk, biçim ve ayrıntı; çoğunda çeldiriciler komşu kavramların doğru tanımları). Soru metni, doğru cevap ve doğru şıkkın indeksi değişmedi.

- **Açılan: 93** · **açılmayan: 17** (belirsiz 1 · tekrar 11 · Jev testi 5); açılmayanlar pasif kaldı, dokunulmadı.
- Kapılar: şık denge kuralı (`soru_kural_isaretleri`, ağır işaret 0), Jev “soru gizli” testi (`sikIpucuTesti`, doğru şıkka ≤ 0,8; üç deneme), tek doğru cevap okuması, aktif havuzla benzerlik taraması (`similarity`).
- İngilizce çeviri: 91 satır aynı indekslerle güncellendi; 2 sorunun çeviri satırı yok (deyim/atasözü).
- `sik_ipucu_jev` işareti 35 soruda kaldırıldı (yeni şıklar aynı testten geçti).
- Doğrulama (canlı, uygulama sonrası): 93/93 aktif ve 4 şıklı, doğru şık hiçbirinde tek başına en uzun değil, doğru/çeldirici ortalaması en çok 1,25 (eşik 1,4), en uzun/en kısa şık en çok 1,83, doğru konum dağılımı 20/25/24/24.
- Eski ve yeni şıklar + geri alma: `docs/IPUCU_SIKLARI_YEDEK.json`.

### 15 rastgele örnek (kalın = doğru şık)

| Soru | Önce | Sonra |
|---|---|---|
| 'Kültürel miras listesi' neyi amaçlar? | Turizmi yalnızca · Vergiyi · **Evrensel değerli varlıkları korumayı** · Ticareti | Nesli tehlikedeki türleri korumayı · Temiz su kaynaklarını korumayı · **Evrensel değerli varlıkları korumayı** · Deniz ticaret yollarını güvenceye almayı |
| Kültürel asimilasyon neyi anlatır? | Kültürlerin ayrışması · Göçün durması · Dilin korunması · **Bir grubun baskın kültüre karışması** | İki kültürün birbirinden ayrışması · Bir dilin okullarda korunması · Bir topluluğun başka ülkeye göç etmesi · **Bir grubun baskın kültüre karışması** |
| Safran hangi bitki kısmından elde edilir? | Kabuk · **Çiçek tepeciği** · Tohum · Kök | Ağaç kabuğu · **Çiçek tepeciği** · Kurutulmuş tohum · Kök gövdesi |
| Tarımsal destekleme politikasının amacı nedir? | Üretimi azaltmak · İthalatı artırmak · Fiyatı yükseltmek · **Üretimi sürdürülebilir kılmak** | Sanayi ürünleri ihracatını artırmak · Kent nüfusunu dengelemek · Orman alanlarını genişletmek · **Üretimi sürdürülebilir kılmak** |
| Döviz kuru neyi ifade eder? | Kâr oranı · **İki para biriminin değişim oranı** · Vergi oranı · Faiz oranı | Bir bankanın yıllık kâr oranı · **İki para biriminin değişim oranı** · Devletin gelirden aldığı vergi oranı · Mevduata uygulanan faiz oranı |
| 'KVKK' hangi konuyu düzenler? | **Kişisel verilerin korunmasını** · Vergiyi · Ticareti · Telifi | **Kişisel verilerin korunmasını** · Kamu ihalelerinin denetlenmesini · Kira sözleşmelerinin koşullarını · Katma değer vergisinin oranını |
| Halay hangi bölgemizin halk oyunudur? | Karadeniz · Trakya · **Doğu ve Güneydoğu Anadolu** · Ege | Doğu Karadeniz kıyı şeridi · Trakya ve Güney Marmara · **Doğu ve Güneydoğu Anadolu** · Ege ve Batı Akdeniz |
| 'Toplum sözleşmesi' düşüncesi neyi tartışır? | Ticareti · Savaşı · Dini · **Siyasal iktidarın kaynağını** | Uluslararası ticaretin kurallarını · Dinî inançların kökenini · Sanatın toplumsal işlevini · **Siyasal iktidarın kaynağını** |
| Çocuk oto koltuğunun gerekliliği neye dayanır? | Rahatlık · Görüş açısı · **Çocuğun bedenine uygun koruma** · Estetik | Çocuğun yaşına uygun eğlence · Çocuğun boyuna uygun görüş açısı · **Çocuğun bedenine uygun koruma** · Çocuğun kilosuna uygun konfor |
| Kamu spotunun amacı nedir? | Seçmeni bir partiye yöneltmek · Markaya bağlılık oluşturmak · **Toplum yararına bilgilendirmek** · Dizinin reytingini artırmak | Yeni bir ürünü tanıtmak · Güncel haberleri özetleyip sunmak · **Toplum yararına bilgilendirmek** · Bir sanat etkinliğini duyurmak |
| Tedarik zinciri kesintilerinin ekonomik sonucu nedir? | Fiyat düşüşü · Üretim artışı · Talep artışı · **Üretim gecikmesi ve fiyat artışı** | Üretim artışı ve fiyat düşüşü · Stok fazlası ve talepte hızlı düşüş · İstihdam artışı ve ücret artışı · **Üretim gecikmesi ve fiyat artışı** |
| İlk yardımın temel amacı nedir? | Kesin tedavi uygulamak · **Yardım gelene dek durumu korumak** · İlaç yazmak · Ameliyat yapmak | Hastalığın nedenini kesin olarak belirlemek · **Yardım gelene dek durumu korumak** · Hastalığı ortaya çıkmadan önlemek · Hastayı normal yaşamına döndürmek |
| Antropoloji bilimi hangi konuyu araştırır? | Bitkileri · Denizleri · **İnsanı ve kültürlerini** · Metalleri | Bitkileri ve ortamlarını · Denizleri ve canlılarını · **İnsanı ve kültürlerini** · Metalleri ve alaşımlarını |
| Buharda pişirmenin avantajı nedir? | Yağ ekler · Şeker katar · Tuz artırır · **Besin değerini korur** | Yemeği çıtır yapar · Kabuğu kızartır · Şekeri karamelize eder · **Besin değerini korur** |
| Uzay hukuku hangi ilkeyi benimser? | Uzayın paylaşılması · **Uzayın tüm insanlığın ortak alanı olması** · Uzayın satılması · Uzayın kapatılması | Açık denizlerin tüm devletlere açık olması · **Uzayın tüm insanlığın ortak alanı olması** · Savaşta sivillerin hedef alınmaması · Devletlerin hava sahasında egemen olması |

### Açılmayanlar

| Soru | Doğru şık | Neden |
|---|---|---|
| 'Yazar hakları' hangi süreyle sınırlıdır? | Yasayla belirlenen süreyle | belirsiz: doğru şık 'Yasayla belirlenen süreyle' totolojik; makul çeldirici ('yazarın yaşamı + 70 yıl') ikinci doğru cevap olur |
| "Halay" hangi bölgede yaygındır? | Güneydoğu ve Doğu Anadolu | tekrar: Halay bölgesi (7d292eb4 açıldı) |
| 'Kabotaj Hakkı' neyi düzenler? | İç sularda taşıma hakkını | tekrar: Kabotaj (5f77ae49 açıldı) |
| 'Kabotaj Kanunu' neyi düzenlemiştir? | Kıyılarda taşımacılık hakkını | tekrar: Kabotaj (5f77ae49 açıldı) |
| 'Halay' hangi bölgede yaygın bir halk oyunudur? | Doğu ve Güneydoğu | tekrar: Halay bölgesi (7d292eb4 açıldı) |
| Sürdürülebilir kalkınma neyi hedefler? | Gelecek kuşakların hakkını korumayı | tekrar: sürdürülebilir kalkınma (75fb4ac6 açıldı) |
| 'Kuvvetler ayrılığı' neyi önerir? | Yetkilerin ayrı organlara dağıtılmasını | tekrar: kuvvetler ayrılığı (5f46774e ile aynı bilgi; o da Jev testini geçemedi, ikisi de kapalı) |
| 'Somut olmayan kültürel miras' neyi kapsar? | Gelenek ve becerileri | tekrar: somut olmayan kültürel miras (42658a39 açıldı) |
| 'Manga' ile 'anime' arasındaki fark nedir? | Manga basılı çizgi romandır | Jev şık ipucu testi geçilemiyor: doğru şık soru olmadan da doğru bir önerme ('Manga basılı çizgi romandır'); doğru başka bir önerme ikinci doğru cevap olur |
| Bağış ile sponsorluk arasındaki fark nedir? | Sponsorlukta tanıtım beklenmesi | Jev şık ipucu testi geçilemiyor: doğru şık soru olmadan da doğru bir önerme ('Sponsorlukta tanıtım beklenmesi') |
| Son kullanma tarihi neyi belirtir? | Güvenle tüketilebilecek son günü | Jev şık ipucu testi 3 denemede geçilemedi (p=0,89): 'Güvenle tüketilebilecek son günü' soru olmadan da seçiliyor |
| Kuvvetler ayrılığı ilkesi neyi ifade eder? | Yasama, yürütme, yargı ayrılığı | Jev şık ipucu testi 3 denemede geçilemedi (p=0,94): 'Yasama, yürütme, yargı ayrılığı' soru olmadan da seçiliyor |
| Diplomaside büyükelçi kimdir? | Devletin en üst düzey temsilcisi | Jev şık ipucu testi sınırda (p=0,82; bir koşuda geçti, sonrakinde takıldı): güvenli tarafta kalındı |
| Kişisel verilerin korunması neyi amaçlar? | Bireyin mahremiyetini güvenceye almak | tekrar: AKTİF havuzda aynı soru var ('Kişisel verilerin korunmasının amacı nedir?', teknoloji; prova benzerlik 0,60) |
| 'Bar' halk oyunu hangi bölgede oynanır? | Doğu Anadolu | tekrar: AKTİF havuzda aynı bilgi var ('Bar' oyunu hangi bölgeyle anılır?, muzik) |
| 'Laiklik ilkesi' neyi ayırır? | Din işleri ile devlet işlerini | tekrar: AKTİF havuzda aynı bilgi var (Laiklik ilkesi neyi ifade eder?, genel_kultur) |
| Turizmde "kültür turizmi" neye dayanır? | Tarihî ve kültürel değerler | tekrar: AKTİF havuzda aynı bilgi var (Kültür turizmi hangi kaynağa dayanır?, cografya) |
