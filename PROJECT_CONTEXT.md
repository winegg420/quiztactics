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

Araçlar: **Jev (TypeSafe)** — toplu soru/çeviri kalite değerlendirmesi
için; kullanım kuralı AGENTS.md'de.

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
(lig puanı yok, coin %50). Arayüzde her yerde aynı iki seçenekli **"Serbest | Dereceli"**
anahtarı (`DereceliAnahtari`) vardır: Düello girişi, ana sayfa OYNA penceresinin en üstü (Saf Bilgi
kısayolu da aynı pencereden geçer — sessiz başlama yok), Meydan okumalar, Modlar. Son tercih
hatırlanır (localStorage + `profiles.dereceli_tercih`).

### Ortak mekanik

- **Hız bonusu yok** — süre içinde doğru cevaplayan herkes aynı puanı alır.
- Normal maçta **berabere olabilir**. Turnuvada **altın soru**: biri
  kazanana kadar, skillsiz, kullanılmamış sorulardan.
- Turnuvada artan zorluk (`questions.zorluk`, sıralamaya göre): 1–5. soru zorluk 1–2 · 6–10 → 3 ·
  11+ → 4–5; altın soru maçta kullanılmamış 4–5. Dilim boşsa alt dilime düşer (en kötü: herhangi
  uygun soru). Sınırlar `oyun_ayarlari.turnuva_zorluk_*` / `turnuva_altin_zorluk_*` (300). Soru
  sırası turnuva başında seçilir (`turnuva_soru_sec`).
- **Şık ipucu filtresi (298):** Jev'in soru metnini görmeden şıklardan doğruyu >0,8 güvenle
  bulduğu sorular `sik_ipucu_jev` (ağırlık 2) ile işaretli — başta 1.310, şık düzeltmesiyle (420–422:
  yalnız yanlış şıklar yeniden yazıldı, doğru şık/indeks aynı; geri alma
  `araclar/soru-temizlik/sik-ipucu-geri-al.mjs`) **1.085** kaldı (300 işlendi, 225 döndü); `soru_sec` / `duello_soru_bul` /
  `turnuva_soru_sec` rekabetçi havuzunda yok; Serbest Klasik'te (`matches.dereceli=false`,
  `soru_sec(..., p_serbest_klasik => true)`, 309) ve Hatalarım'da çıkar.
  Rekabetçi havuz 6.694 → 6.303. İşaret "elle"dir (`soru_elle_isaret_mi`), tetikleyici korur.
  Yeni soru ve denetim düzeltmeleri aynı Jev testinden geçer (`soru_denetim/kapi.mjs › sikIpucuTesti`).
- **Ağırlıklı zorluk (324):** normal maçlarda (Klasik serbest/dereceli, Saf Bilgi, Düello, Grup,
  Soru Değiştir, Hatalarım dolgusu) `soru_sec` her yuva için önce grup seçer — kolay (zorluk 1–2)
  `soru_agirlik_kolay` 70 · orta (3) `soru_agirlik_orta` 25 · zor (4–5) `soru_agirlik_zor` 5
  (test değeri; 350: 55/30/15 → 70/25/5, 200 soruda ölçüm 71/21,5/7,5) — sonra o gruptan mevcut kurallarla soru; grup boşsa komşu gruba düşer.
  `zorluk >= 2` filtresi kalktı. Turnuva kendi kuralında.
- **Soru üretimi: yeni zor soru üretilmez; üretim yalnız kolay ve orta** (Ida, 23 Eyl 2026).
- **Gösterim payı (325/326):** sunucu yeni fazın/sorunun bitişine pay ekler — Düello
  `duello_gosterim_payi_ms` 1500 (kategori + cevap), Klasik/Grup/Turnuva sonraki soru
  `soru_gosterim_payi_ms` 2000. İstemci sayacı pay bitene dek TAM süreyi gösterir, sonra gerçek
  zamanla akar; sayaç yetişmek için hızlanmaz. İki oyuncunun bitişi aynı, geç cevap sunucuda
  reddedilir. Düello `sunucu_zamani` = clock_timestamp(). Ölçüm: `oyuncu-testi` sayaç raporu (⏱).
- Yanlış cevap sonrası bekleme **1 sn**.
- Kategori yüzdesi için asgari örneklem 10 soru; altı "veri yok".

### Düello

- 3 can, en çok 10 tur (çift hamle — eşit hamle kuralı). Saldıran kategoriyi seçer, soru ikisine
  aynı anda açılır (cevap 15 sn); yalnız biri doğruysa öteki 1 can kaybeder. Beraberlik yok: can
  eşitse uzatma (kategori rastgele, ilk fark bitirir).
- **Zayıf nokta (470, Ida kesin):** her oyuncunun en zayıf kategorisi maç başında sabitlenir
  (`duello2_en_zayif`: en az `duello2_zayif_min_cevap` 5 cevaplı kategoriler arasından doğru oranı en
  düşük; yoksa zayıf yok, kural o oyuncuda işlemez; botlarda kendi geçmişi) ve `profil.zayif` ile iki
  tarafa görünür. Saldıran rakibin zayıfını seçer ve savunan bilirse **saldıran** 1 can kaybeder —
  saldıran da bilse bile; ikisi yanlışsa kimse; yalnız saldıran doğruysa savunan. Uzatmada işlemez.
  Kural sunucuda (`duello2_cozumle`); süre dolunca otomatik seçim savunanın zayıfını seçmez.
- **Kategori sınırı (470):** her kategori maçta en çok 3 kez (`duello_kategori_max`, zayıf dahil,
  uzatma sayılmaz); maçtaki bir önceki seçim (hangi oyuncu seçtiyse) hemen tekrar seçilemez. Sunucu
  reddeder (`duello2_kategori_uygun_mu`), istemci soluk gösterir, bot ve otomatik seçim aynı kuraldan
  geçer. Joker (skill) sınırları ayrı: 4 / aynı 2 / soruda 1.
- Botlar kategoriye göre isabetle cevaplar (`bot_kategori_sapma`) —
  profil hem görünen hem gerçektir.
- **Eşleşme (370, bütün modlar):** gerçek oyuncu varsa anında; yoksa gizli bot, sunucuda aramaya
  sabitlenen üçgen dağılımlı süreyle (`eslesme_bot_min_sn` 3 · `_tepe_sn` 6 · `_max_sn` 15). Canlı
  ölçüm (24 Eyl, 10 Klasik arama): 6,9–14,1 sn, medyan 10,5. Eski sabit süre (Düello 8 + 2–5 sn,
  Grup 12 sn) kalktı: `duello_arama_sn` / `grup_arama_sn` **kullanılmıyor** (371'de işaretlendi, silinmedi).
  Gelen maç hedeften ~1 sn geç düşebilir (yoklama aralığı) — bilerek bırakıldı. Arama ekranında "bot ile oyna" yok; açık botlar yalnız Meydan Okumalar › **Antrenman**
  (yarım ödül). Arama ekranı tam ekran `AramaSahnesi` (Klasik, Saf Bilgi, Düello aynı).
- **Loadout süresi + cezasız iptal (410):** Klasik/Saf Bilgi "Hazır mısın?" kapısında `loadout_secim_sn`
  (20) dolunca son kayıtlı set ile başlar; eşleştirmeyle kurulan maçta rakip bağlanmadıysa maç
  cezasız iptal (kazanan/coin/XP/lig yok), bekleyen otomatik yeniden arar. Rakip kapıya hiç gelmediyse
  bekleme `klasik_baglanma_sn` 15 (441); Düello'da `duello_baglanma_sn` 15. Arkadaş maçı/rövanşta iptal yok.
  Antrenman (açık bot) maçları her zaman serbest (440, sunucu zorlar).
- Rövanş bekleme penceresindeki “Vazgeç”, `duello_rovans_iptal` ile sunucu
  isteğini de geri çeker; yalnız pencereyi kapatıp hayalet istek bırakmaz.
- **Düello 1.0 herkese açık (23 Eyl 2026):** `duello_surum` = **2**. Aynı soru
  aynı anda, simetrik can tablosu, uzatma (beraberlik yok), skill 4/2/1, Sigorta/2X
  yok. Sunucu 268, bot 269; arayüz `DuelloV2.jsx`. Test listesi
  (`duello_v2_test_kullanicilari`) ve v1 kodu silinmedi, yalnız kullanılmıyor.
  İstemci tanımadığı bir sürüm görürse maçı çizmez, yenileme ister
  (`DUELLO_EN_YUKSEK_SURUM`).
- **Strateji penceresi (351):** kategori süresi `duello2_kategori_sn` **15 sn**, son 3 sn renk + ses.
  Saldıranın her kartında rakibin ve kendi doğru oranı + kalan hak, rakibin zayıf noktasında ⚠ "Bilirse
  sen can kaybedersin"; savunan "Rakip düşünüyor…" + kendi en güçlü/zayıf 3 kategorisi; iki tarafta da
  iki zayıf nokta bandı, savunanın cevap ekranında "Rakip zayıf noktana saldırdı!". Oranlar maç başında `duello_olustur`'da bir kez
  (`profil1/2.oranlar`; kategori_istatistik = bütün modlar; `duello_oran_min_cevap` 5 altı "—").
  Bot seçimi 3–8 sn (tik 2 sn); %65 rakibin en zayıf iki kategorisinden biri
  (`duello2_bot_zayif_secim_yuzde`), %20 kendi güçlüsü, kalan rastgele.

### Turnuva

- Günde 5 seans, TSİ: **10:00 · 14:00 · 18:00 · 20:00 · 24:00** (24:00 = ertesi gün 00:00)
- Tek kaynak `oyun_ayarlari.turnuva_saatleri`; kod varsayılanı aynı liste
  (`oyun/lib/zaman.js › VARSAYILAN_LISTE`). Eski `turnuva_saat_sabah` /
  `turnuva_saat_aksam` satırları veritabanında DURUR ama okunmaz. Silinmez.
- Dakikalık zamanlayıcı (`turnuva_zamanlayici_tik`) listeyi `turnuva_saatleri_listesi()` ile okur.
  Lobi başlangıçtan `turnuva_lobi_acilis_dk` (120) önce "açık" sayılır: botlar dolar, ana sayfa
  şeridi nabız atar. Hatırlatma push'u 14:00 ve 20:00 seanslarından 45 dk önce (günde 2).
- Turnuva önemli etkinliktir: ana sayfa oyuncuyu katılmaya iter (avatar kartı altındaki şerit).

### Lig

- 5 kademe: Bronz → Gümüş → Altın → Elmas → Efsane.
- 25 kişilik gruplar. Grup = yalnız sıralama tablosu, eşleşmeyle ilgisi yok.
  İlk 5 yükselir, son 5 düşer. Pazartesi 00:00 (TSİ) sıfırlanır.
- Eşleşme kendi ligi ± 1 lig ile sınırlıdır.
- Misafir (anonim) hesap ligde ancak `lig_misafir_min_mac` (5) maçtan sonra
  görünür; oyuncu kendi satırını her zaman görür. Hesap silinmez.
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

### Skill sistemi

Oyuncuya görünen ad **"Joker"** (TR + EN; Ida, 24 Eyl 2026 — "Skill" kalktı). Kodda/DB'de
`skill_*` ve `joker_*` iç adları **bilerek korunur** — yeniden adlandırılmaz. Anahtarı hâlâ
"skill" geçen metinler `dil.js › jokerAdi()` ile çıkışta Joker olur. Tek kayıt kaynağı
`oyun/lib/jokerler.js`. Jokerler **yalnız coin'le** alınır (test fiyatları: Ek Süre 20 · Soru
Değiştir 30 · Zaman Baskısı 30 · Sigorta 40 · 2X 50 · 50:50 60 · İkinci Şans 60).

Aktif yedi maç skill'i vardır:

| id | Ad | Mod | Davranış |
|---|---|---|---|
| `elli` | 50:50 | Klasik · Grup · Turnuva · Düello | iki yanlış şıkkı eler |
| `sure` | Ek Süre | Klasik · Grup · Turnuva · Düello | kişisel cevap süresini uzatır |
| `soru_degistir` | Soru Değiştir | Klasik · Grup · Düello | aynı kategoriden kendi sorusunu değiştirir |
| `zaman_baskisi` | Zaman Baskısı | Klasik · Düello | rakibin süresini kısaltır |
| `sigorta` | Sigorta | yalnız Klasik | yanlışta 5; doğruda normal 10 |
| `cifte_puan` | 2X | yalnız Klasik | doğruda 20; yanlışta 0 |
| `ikinci_sans` | İkinci Şans | Klasik · Düello | ilk yanlışta aynı sayaçla bir ikinci cevap |

- **Loadout: 3 yuva, Klasik ve Düello (327).** `skill_seti_slot` = 3. Set moda göre ayrı:
  Klasik `oyuncu_skill_setleri.skiller`, Düello `skiller_duello` (Düello'da Sigorta/2X seçilemez).
  Klasik seti maç öncesi "Hazır mısın?" kapısında, Düello seti giriş ekranında seçilir; son set
  hatırlanır ("Hazırım"/"Rakip ara" = aynısıyla oyna). Hakkı olmayan skill seçilebilir, "Hakkın
  yok — Dükkân" işaretlenir. Kapı set kontrolünü yalnız Klasik/Düello'da yapar; Grup ve Turnuva'da
  loadout yok. Botlar kapıdan muaf; bot mantığı yalnız Zaman Baskısı + Soru Değiştir kullanır.
  `skill_seti_slot` ≥ aktif skill sayısı olursa loadout kapanır (herkes bütün skill'leri kullanır).
- **Skill kataloğu ve kilit:** `skill_katalogu` (tur, aktif, kilit_fiyati,
  gereken_level). Bugünkü 7 skill fiyat 0 · level 1 (açık). Yeni skill'in kilidi
  coin'le bir kez açılır (`skill_kilidi_ac`); level şartı coinle atlanamaz.
  Kapı (`skill_kullanim_kapisi`) kilitli skill'i reddeder.
- **Kullanım hakkı:** skill envanterdeki haktan düşer. Fiyatlar
  `coin_joker_<tür>` (tek) ve `coin_joker_<tür>_10` (10'lu paket, %15 indirim).
  Maç içinde hak yoksa onaylı "al ve kullan" akışı kalır (karar, 23 Eyl).
- Maç içi sınırlar herkese eşit: Klasik 6 / aynı skill 2 / soruda 1 · Düello
  4 / 2 / 1. Level ödülünden gelen haklar sınırları artırmaz.
- `sis`, `savunma_kilidi`, `saldiri_degistir` **pasiftir** — geçmiş veri için
  kayıtlı, dükkânda gizli, yeniden açılmayacak. Kayıtları silinmez.
- `seri_koruma` maç skill'i değildir; günlük seri mekanizması için ayrı durur.
- **Düello'da saldırı skill'inin teke (Zaman Baskısı) inmesi sahibinin
  kararıdır, hata değildir.** Zamanla yeni skill'ler eklenecektir.

### Ekonomi (bütün rakamlar `oyun_ayarlari` tablosunda)

- Lig = birikimli emek. **Günlük lig tavanı yok.**
- **Coin (test değerleri):** Klasik galibiyet 30 · berabere 12 · mağlubiyet 0
  (`coin_mac_*`); Düello galibiyet 45 · mağlubiyet 0 (`coin_duello_galibiyet`) —
  Düello daha uzun sürdüğü için daha çok verir. Lig puanı ayrı: Klasik 25/10/0.
- **XP ve level (test değerleri):** Klasik 30/15/10, Düello 45/15 (galibiyet/
  mağlubiyet), turnuva katılım 20 + ilk 3'e 50. Serbest ve Saf Bilgi'de XP tam.
  Kaybeden ancak oynadıysa XP alır; kazanansız Düello'da iki tarafa 15 XP.
  Grup maçı XP vermez. Level ligden ayrı,
  kalıcı, sınırsız; herkes Level 1'den başladı (23 Eyl 2026). Gereken XP =
  round(`level_xp_taban` + `level_xp_katsayi` × level^`level_xp_us`) = 60 + 0,5 ×
  L^1,5. Level ödülü 20 coin; her 5 levelde 1 rastgele aktif skill hakkı; rütbe
  atlamada 100 coin (bu coinler günlük tavana sayılmaz). Botların level'i
  seviye puanından tohumlu türetilir, XP almaz.
- **Rütbe level'e bağlı:** Çaylak L1 · Bilge L10 · Üstat L25 · Kahin L50 ·
  **Dâhi** L100 (eski "Efsane" rütbesi; Efsane Lig ile karışmasın). Eski puan
  eşikleri kullanım dışı. Lig (Bronz → Efsane) ayrı rekabet göstergesi.
- Saf Bilgi/skillsiz Klasik, standart ödülün **%50**'sini
  verir. Serbest ayrı kavramdır; iki indirim üst üste çarpılıp %25 olmaz.
- Turnuva lig: 1. 150 · 2. 80 · 3. 40 · 4-10. 20 · diğer katılan 10.
  Coin: 150/75/40 + katılana 10.
- Günlük seri bonusu `least(gün×3, 15)`.
- **Arkadaş daveti (335):** kalıcı kod + `/davet/KOD`. Davet edilen +100 coin ve otomatik arkadaş;
  davet eden 300 coin, davet edilen **Level 5'e** ulaşınca. Aynı cihaz/IP ödülsüz (`gecersiz`), ayda
  en çok 10 ödüllü davet (fazlası `sinir_asildi`). Lig puanı vermez. Eski `arkadas_davet_kodu_ile_ekle`
  aynı iç mantığa bağlı (eski anında 200+200 kalktı).
- İndirimler çarpılmaz: çift koruması / serbest / açık bot → en düşüğü uygulanır.
- Çift koruması (1-5 tam, 6-10 %50, 11+ yok) lig puanına da uygulanır.
- Günlük tavan 400 · başlangıç **10.000 (test; `baslangic_coin`)** · reklam 25
  (günde 5). `coin_baslangic` (500) satırı DB'de durur ama okunmaz.
- Eşya: sıradan 300–600, özel 1.200–2.500.
- **İki para birimi (480, Ida — pay to win yok):** **coin** yalnız oynayarak kazanılır, parayla
  satılmaz (coin paketleri pasif); jokerler coin'le. **Elmas** (`profiles.elmas`, defter
  `elmas_hareketleri`; yazma yalnız sunucu `elmas_ekle`/`elmas_harca`) gerçek parayla + oyunla;
  yalnız kozmetik alır. Elmas paketleri Avuç / Kese / Sandık / Hazine / Define = 100 / 220 / 500 /
  1.100 / 2.400 taban + %0/10/15/20/30 bonus; satın alma kapalı (`elmas_satin_alma_acik = 0`,
  "Yakında"); Play ürünleri `elmas_100…elmas_2400` sonra — `docs/YAYIN_ONCESI.md`. Oyunla elmas
  (test): haftalık lig 1./2./3. 10/6/3 · turnuva birincisi 10 · her 10 level 20 · 7 günlük seri 5 ·
  elmas kademeli rozet 5–20 · günde 1 elmas reklamı 2. Tahmin: düzenli bedava oyuncu ayda ~100–180.
- **Maç sonu sahnesi tek ekran:** açıkken sayfa kaydırılmaz, alt menü gizli (`html.msk-acik`); eylem çubuğu sahnenin son
  satırı; içerik yüksekliğe göre sıkışır; Detay ve ek içerik (sohbet, tepki, ses, hesap önerisi) açılır panelde. Lottie ve
  konfeti maç biterken önceden iner, geç gelse de baştan oynar.
- **Oyuncu adına dokununca profil kartı** (`OyuncuAdiDugmesi`), avatarla aynı; lig tablosu/arkadaş satırı zaten kartı açar.
  Takılı isim efekti de buradan uygulanır. **Altın isim** (`isim_altin`) = "Işık Şeritli Altın" (Ida, 24 Eyl;
  `IsimEfekti.jsx › AltinIsim` + `ekranlar/altin-isim.css`): parlak sarı harf + lacivert kontur + arkada ince yarı saydam
  altın ışık (plaka değil); hareketli yerlerde ışık akar, liste/şeritte durağan. Önizleme aynı bileşeni çizer.
- **Rakip arama ekranı "Güneş Halkası"** (Ida, 24 Eyl; `AramaSahnesi.jsx` → tembel `AramaGunesHalkasi.jsx`): gök mavisi,
  ortada dönen halka + yörüngede avatarlar, süre, mod/Dereceli rozeti, "Biliyor muydun?" (TR/EN), VS `ARAMA_GECIS_MS`
  (2 sn) içinde. Klasik, Saf Bilgi, Düello; Grup'un kendi bekleme satırı (ChallengesPage) eski.
- **Çevrimiçi durumu (590, Ida onaylı güvenlik kuralı) YALNIZ arkadaş listesinde:** Realtime Presence, her oyuncunun
  özel kanalı `cevrimici-<uid>`; yalnız sahibi yazar, yalnız kabul edilmiş arkadaş okur; DB'ye yazım yok. Yeşil
  "Çevrimiçi" / turuncu "Maçta", çevrimiçiler üstte, çevrimdışında gösterge yok. Arka planda kanaldan çıkılır.
  Lig, oyuncu kartı, lobi gibi başka yerde gösterilmez.
- **Turnuva ve Grup çıkış onayı:** çıkış düğmesi ve geri tuşu onay penceresi açar ("Oyunda kal" / "Çık"; Klasik/Düello ile aynı pencere).
- **Terk kuralı (460, Ida):** maçın yarısında çıkan asla ödül almaz — 0 coin / XP / elmas, seri,
  görev ve rozet ilerlemesi sayılmaz; kalan tam galibiyet alır. Bütün modlarda sunucuda: Klasik /
  Saf Bilgi / Antrenman `mac_iptal` (başlamış maç) + kopukluk (insan 45 sn, bot maçı 57 sn nabızsız),
  Düello `duellolar.terk_eden`, Grup `grup_mac_terk`, Turnuva `turnuva_terk` ("Çık ve elen");
  10 dk duran maç ödülsüz iptal.
- **Rozetler (331–333):** 101 rozet (`rozet_tanimlari`: level, Klasik/Düello galibiyet, seri, 10
  kategori × 4 ustalık, turnuva, lig, özel an, sosyal, 5 gizli), kazanma sunucuda olay anında; coin
  bronz 10 · gümüş 25 · altın 50 · elmas 100 (günlük tavana sayılmaz). Geriye dönük verilenler
  coin'siz (`geriye_donuk`). Vitrin `profiles.vitrin_rozetleri` (en çok 3). Level 25/50/75/100
  rozeti level çerçevesini de verir. Sözleşme `docs/SOZLESME_ROZET_CERCEVE.md`.
- **Kozmetik katmanları (481, Ida):** **çerçeve** = kazanılan prestij, **asla satılmaz** (lig, level,
  turnuva şampiyonu, etkinlik — Yılbaşı, Ramazan Bayramı); dükkânda görünmez, Profil › Koleksiyon'da
  (kilitliler "nasıl kazanılır"la). **Aura** = satılık tarz, avatarın arkasındaki tema katmanı; eski 12
  dükkân çerçevesi auraya dönüştü (satırlar pasif durur), elmasla satılır: Sıradan 75 · Nadir 150 ·
  Epik 300 · Efsanevi 600 (`aura_satin_al`, FOR UPDATE; coin yolu yok). Coin'le alınmış dükkân
  çerçeveleri aynı temanın aurası olarak taşındı (1 hesap). Katman sırası aura → avatar → çerçeve,
  hepsi `CerceveliAvatar` içinde (veri `oyuncu_kartlari` / `lig_grubum_ozet`). Sahiplik
  `oyuncu_cerceveleri`, takılı `profiles.takili_cerceve`. Görünüm `oyun/tasarim/cerceveler/`;
  önizleme `/kozmetik-onizleme`.
  **552 (Ida, 24 Eyl): bütün dükkân auraları ve etkinlik çerçeveleri/auraları (Yılbaşı, Ramazan)
  PASİF** (`aktif = false`) — dükkânda, koleksiyonda, oyunda ve botlarda görünmez; satır/sahiplik/takılı
  kayıt silinmez, yeniden açmak için `aktif = true` yeter. Aktif çerçeveler: lig, level, turnuva şampiyonu.
- **Elmas kozmetikleri (520/540–542/550, Ida):** aktif = Ida'nın önizleme seçimi — `kozmetikler.onay`
  / dükkân `auralar.onay` = `'girsin'` (`/kozmetik-onizleme`), çerçeve tarzı `/cerceve-onizleme` seçimi.
  İşaretsiz/`girmesin` her kalem PASİF: dükkânda, koleksiyonda, oyunda (`oyuncu_kartlari`) ve botlarda
  görünmez, alınamaz/takılamaz; kayıt silinmez; kural dinamik (seçim değişince migration gerekmez).
  `kozmetik_satis_acik = true` yalnız aktifleri satar; aura satışı bayraktan bağımsız, yalnız `girsin`
  auralar. Türler: VS kartı (6 tema, 150), isim efekti (6, 100; kontrast ≥ 4,5), zafer efekti (5, 200;
  rakip küçük görür), tepki paketi (2 × 4, 100). **Sahip test modu** yalnız aktif kalemlerde (satın
  almadan takar). Gizli botlar yalnız aktif kalemlerden, bot kimliğinden sabit takar.
  **27 yeni avatar** (`avatar_katalogu`, 13 günlük + 14 kostümlü; çizim `AvatarProIllustrations2.jsx`,
  `public/avatars/pro2/`) herkese ÜCRETSİZ: profil, kurulum, Dükkân › Avatar ve Koleksiyon'da seçilir
  (`avatar_katalogu.aktif` yeter; `/avatar-onizleme` onayı bu karar için bakılmaz).
  (550 dalda `bulut/kozmetik-aktivasyon` — canlıya uygulanınca geçerli; bkz. `docs/KOZMETIK_AKTIVASYON.md`.)
- **Premium kozmetik (560, dal `bulut/premium-aktivasyon` — uygulanınca geçerli):** `kozmetikler` türleri
  `premium_cerceve` (Sonbahar, Galaksi, Sakura; 500 elmas) ve `premium_aura` (yaprak, kar, köz, gece, kuzey, su altı;
  300 elmas; avatarın İÇ zemini) — ayar `elmas_premium_cerceve/aura`, `kozmetik_satis_acik` kuralı, sahip test modu,
  gizli bot takmaz, `kozmetik_ver` (etkinlik ödülü). Çizim `oyun/tasarim/premium/` (tembel), `CerceveliAvatar` karttaki
  `premium_cerceve/premium_aura`'yı çizer (2. tur: pc_alev2/simsek2/kraliyet2 570, pc_ejderha2 580); hareket yalnız profil/lobi/VS/maç sonu, ≤48 px durağan. Lig amblemi
  (`ligAmblemi.jsx`) oyuncu adının yanında her yerde. Eski dükkân auraları pasif.
- **Maç içi tepki (542/551):** oyuncu tepkisi DB'ye yazılmaz; Realtime yayını yalnız o maçın iki
  oyuncusuna açık ÖZEL kanalda (`tepki-mac-<id>` / `tepki-duello-<id>`, `realtime.messages` RLS ile
  oyuncu1/oyuncu2; oyun kanalı ayrı ve değişmedi). 3 sn'de 1, maçta 10 (gönderen + alıcı); bedava
  👏😎😅🤔. Açık modlar `tepki_acik_modlar` (Ida onaylayana dek yalnız `antrenman`; Klasik/Düello'ya
  açılınca DB'ye yazan eski 6 emoji kaldırılacak). Bot tepkisi sunucudan %12 (`tepki_bot_olasilik`),
  yalnız anlamlı anda: doğru serisi (`tepki_bot_seri` 3), maç sonu, rakip hatası. "Rakip tepkilerini
  gizle" cihazda. Tepkinin açık olduğu modda eski DB'ye yazan emojiler gizli.
- **Tasarım seçimleri (530/550):** `sahip_tasarim_secimleri` (konu → seçim, yalnız sahip yazar); ilk konu
  `cerceve_tarzi` (cizgi / mucevher / isik) — seçim oyunda `cerceve_tarzi_aktif()` ile okunur: bugün
  yalnız Altın Lig çerçevesi seçilen tarzda (aura takılıysa bugünkü); bütün çerçeveler ayrı pakette
  yeniden çizilecek. Maç sonu: çerçevede taç varsa sahnenin taç emojisi gizli.
- **Etkinlik eşyaları satılmaz** (Taç, Pelerin, Uzay Kıyafeti) — yalnız
  turnuva ödülüdür. Dükkânda kilitli görünür.
- Dükkândaki her şey yalnız coin ile alınır.
- **Rakamları koda gömme.** Yayından sonra SQL ile değiştirilebilmeli.

- **Satın alma güvenliği (304–306):** coin satın alımları `coin_satin_alma_defteri`'ne yazılır;
  Play jetonu ve orderId hesaptan bağımsız tekil (ilk işleyen hesap sahibi; TWA
  obfuscatedAccountId desteklemiyor). Tüketim sunucuda (`satin_alma_dogrula` →
  `purchases.products.consume`), istemci `tuket()` yalnız yedek. İade taraması
  `satin_alma_iade_tara` (bakiye sıfırın altına inmez, açık `iade_eksik`) `satin_alma_iade_takibi`
  = false ile kapalı. Reklam ödülü yalnız `reklam_jetonu_al()` jetonuyla, en az
  `reklam_min_sure_sn` sonra; kalıcı çözüm reklam ağı SSV. İki Edge Function 23 Eyl'de
  DAĞITILAMADI (CLI 403) — bkz. Açık İşler.

### Botlar

- İki katman: **açık botlar** (adında "Bot" geçer, %50 coin, anında cevaplar)
  ve **gizli botlar** (gerçek oyuncu gibi, tam coin, gerçekçi sürede cevaplar).
- `is_bot` istemciye **ASLA sızmaz** — gizli botun bot olduğu anlaşılmamalı.
- **Gizli botların hepsinde avatar var (610):** avatarı boş olanlara açık avatarlardan (31 + aktif katalog) bot
  adına göre sabit (hashtext) avatar verildi; baş harfli (avatarsız) gizli bot kalmadı.
- Gizli botlar arkadaşlık kabul etmez, lig değiştirmez.
- **Bot rozetleri (352/353):** rozet motoru botları atlar; `bot_rozetleri_uret` deterministik
  (tohum bot id) üretir: level rozetleri level'e göre, Klasik/Düello galibiyet o level için
  gereken toplam XP'den (`bot_rozet_klasik_carpan` / `bot_rozet_duello_carpan`), seri level'den
  (`bot_rozet_seri_carpan`), turnuva en çok 2 (şampiyonluk yok). Elmas kademe, gizli, etkinlik,
  lig, özel, sosyal, ustalık **verilmez**. Vitrin 3 (farklı gruplardan en yüksek kademe).
  Level değişince tetikleyici yeniden üretir. Botlar etkinlik çerçevesi takamaz (tetikleyici).
- Botlar soru zorluğuna göre yanılır (`bot_soru_isabet`, 302): isabet = taban + kategori
  sapması + zorluk farkı (`bot_zorluk_fark_1..5` = +15/+8/0/−8/−15, rekabetçi havuza göre
  `bot_zorluk_ofset` ile normalize — ortalama değişmez, gece 04:25 tazelenir), sınır %5–98.
  Klasik, Düello, Turnuva, Grup, Hızlı aynı fonksiyonu kullanır.

### Kararlar (23 Eyl, test değeri)

Ida "kendin doldur" dedi; hepsi test değeridir, yayından önce yeniden bakılabilir.

- **Başlangıç coin'i 10.000 kalır** (test). **Yayın günü işi:** `baslangic_coin`'i
  gerçek değere düşür ve test sırasında dağıtılan coin'e (şişkin bakiyeler) karar ver.
- **Başlangıç elması tek ayar (610):** `baslangic_elmas` = 10.000 (TEST; **yayında 150**) — yeni hesap ilk
  girişte alır (`handle_new_user`; bot hesabı almaz). Test için mevcut insan hesapların bakiyesi 10.000'e
  tamamlandı (defter `test` / `test_bakiye_baslangic`). Yayın günü: ayarı 150'ye çek, test elmaslarına karar ver.
- **Yeni profil dili (610, D-203):** profil giriş ekranındaki dille doğar (misafir/e-posta kayıt verisi `dil`;
  Google yönlendirmesinde cihazdaki `bildim_giris_dili` yeni hesaba bir kez yazılır). Mevcut profilin kayıtlı
  dili ezilmez. Soru dili `profiles.dil` → `soru_dilinde` (aktif soruların ~12.200'ünün EN çevirisi var).
- **Sigorta 30 · 2X 40 coin; 10'lu paket 255 / 340** (%15 indirim; migration 307,
  `joker_paketleri.skill_sigorta_10` / `skill_cifte_puan_10`). Yalnız Klasik; Düello'ya
  gelmez.
- **Level hızı değişmez:** günde 10 maçla Level 100 ≈ 3,4 ay; katsayılara dokunulmaz.
- **Maç içi "hak yoksa al ve kullan" kalır.**
- **Paket 2 kuralları kabul:** oynamayan kaybedene XP yok · kazanansız Düello'da iki
  tarafa 15 XP · level coini günlük tavanın dışında.
- **Android paket adı `com.quiztactics.app`** (yayından sonra değiştirilemez):
  `public/.well-known/assetlinks.json`; Play Console uygulaması ve `PLAY_PACKAGE_NAME`
  secret'ı bu adla açılır. İmza parmak izi hâlâ yer tutucu.

---

## Arayüz ve Görsel Kararlar

**Görsel dil: Yön A "Şeker Kutusu" (Tasarım Adım 2, 23 Eyl 2026 — canlıda).** Parlak,
yuvarlak, oyuncak gibi kabarık düğmeler. Bütün ekranlar (harita/meydan, gardırop,
karakter, Hızlı Mod hariç — dondurulmuş) bu sistemle yeniden yazıldı.

- **Tek kaynak: `oyun/tasarim/`** — token'lar (`--qt-*`, `tokenlar.css`), bileşenler (`Qt*`:
  düğme, kart, mod kartı, şık, sayaç, can, skill, üst çubuk, alt menü, modal, toast…),
  ikon seti (`Ikon.jsx`), hareket (`hareket.css/js`). Kılavuz `oyun/tasarim/OKU.md`,
  canlı örnek `/tasarim-sistemi` (menüsüz, girişsiz). Ekran stilleri
  `oyun/tasarim/ekranlar/<şerit>-*.css` ve `oyun/pages/*.a.css`; yalnız `qt-`/kendi önekli
  sınıflar. Eski `tema.css`/`yeni.css`/`styles.css`'te yalnız hâlâ kullanılan kurallar kaldı.
- Kontrast ≥ 4,5 (büyük ≥ 3), dokunma ≥ 44 px, etkileşim geri bildirimi ≤ 300 ms, yalnız
  transform/opacity animasyonu. `prefers-reduced-motion` = **yumuşak hareket** (Ida, 24 Eyl): kozmetik
  (çerçeve, aura, altın isim, elmas paketi, maç sonu) durmaz, 0,4 hızda oynar (`oyun/tasarim/yumusakHareket.js`,
  WebGL ×0,4 ≤30 fps); yalnız ani çakma/flaş, sarsıntı, konfeti/patlama kapanır. Oyunun geri kalanında eski sade kural.
- Maç ekranı koyu sahne (`.qt-sahne-mac`); `body.bd-oyun-modu` alt menüyü gizler.
- Arayüz metni TR+EN: anahtar Türkçe metin; EN karşılıkları `oyun/lib/dil.js` +
  şerit ekleri `oyun/lib/ceviri/*.js` (dil.js'e katılır).
- Seçenekler sayfası `/tasarim-yonleri` (A/B/C) duruyor; silinmesine Ida karar verecek.
- **Önizleme sayfaları (menüde yok):** `/kozmetik-onizleme` (çerçeve + rozet), `/mac-sonu-onizleme`
  (maç sonu sahnesinin 6 hâli; aynı sahne `MacSonuKutlama` 24 Eyl'den beri BÜTÜN modlarda canlı —
  veri tek çağrı `mac_sonu_ozet`, sesler yalnız `ses.js › sesMacSonu`, terkte ödülsüz "Maçtan
  ayrıldın" / "Rakip ayrıldı — galibiyet"; Turnuva/Grup'ta kendi derecen; `lottie-web` +
  `canvas-confetti` maç sonunda tembel yüklenir — "yeni paket yok" kuralının Ida onaylı istisnası),
  `/ses-secim` (kalıcı ses aracı, yalnız sahip), `/avatar-onizleme` (üstte 12 yeni avatar onay bekliyor — 595,
  `aktif=false`; altında 27), `/ikon-onizleme` (4 uygulama ikonu adayı, yalnız sahip; hazır dosyalar
  `public/ikon-aday/<ad>/` — oyunun ikonu onaya kadar değişmez),
  `/cerceve-onizleme` (çerçeve tarzı A/B/C), `/kozmetik-onizleme` (kozmetik "satışa girsin" seçimi
  yalnız sahipte), `/premium-onizleme` (8 hareketli premium çerçeve, 6 iç aura, altın isim plakası, lig
  amblemi — yalnız önizleme, oyunda yok; Girsin/Girmesin tarayıcıda, "Seçimlerimi kopyala" ile iletilir)
  — seçim sayfaları yalnız sahip yazar.
- **Skill rozeti (`SkillRozeti`)** her yerde aynı: dükkân, loadout, maç çubuğu, maç içi satın alma,
  maç sonu, envanter, level ödülü. Kabarık parlak rozet, renk token'ı `--qt-skill-<tur>`, sembol
  Phosphor (MIT). Coin paketi görseli `CoinPaketGorseli` (Noto Emoji 3D, Apache 2.0). **Dış
  kaynaklı her varlık `docs/VARLIK_LISANSLARI.md`'ye yazılır; ticari izni olmayan kullanılmaz.**
- **Ana sayfa telefonda HİÇ kaydırılmaz:** `AnaSayfaA` `<html>`e `.as-kaydirmasiz` koyar, kabuk
  100dvh esnek sütun + overflow hidden + overscroll-behavior none; sahne kalan alanı doldurur,
  kısa ekranda avatar küçülür (container query). Diğer sayfalar kaydırılır.
- **Ana sayfa = seçenek A (lobi, kaydırmasız)** — `oyun/pages/anasayfa/AnaSayfaA.jsx`, veri `veri.jsx`,
  parçalar `parcalar.jsx`. Sıra: kompakt oyuncu kartı (çerçeveli avatar, level + XP, lig, seri) → canlı
  lig kartı (`lig_grubum_ozet`: üstümdeki 2 · ben · altımdaki 2, yükselme/düşme çizgisi, fark) → turnuva
  şeridi → OYNA/DÜELLO → kısayollar (Meydan Okumalar · Grup Maçı · Saf Bilgi · Hatalarım) → görev şeridi.
  Sığmazsa önce görev şeridi gizlenir, sonra lig kartı 3 satıra iner. Masaüstü üç sütun. Coin yalnız üst çubukta. Eski `pages/Home.jsx`
  ve B/C/seçim dosyaları duruyor, rotasız. Meydan Okumalar `/meydan`, Grup Maçı `/meydan?bolum=grup`.
- **Tasarım skill'leri (proje içi):** `.claude/skills/impeccable` (pbakaus/impeccable; ikili
  dosyası git'e girmez; otomatik hook YOK — denetim elle, `impeccable.cmd detect`) ve
  `emil-design-eng` + hareket skill'leri (emilkowalski/skills). Ürün bağlamı `PRODUCT.md`.
- Resmi marka işareti Q Logo Lab **03 Forward Pulse** Q'sudur + `QUIZ TACTICS` yazısı
  (`Logo.jsx`); yeni logo ayrı iş, bekliyor.
- Baloo 2 başlık / Nunito gövde — **yerel paketli** (`public/fonts/`). Google Fonts YOK.
- Oyun, bilgi yarışması gibi görünmeli; sakin/nötr "uygulama" estetiğine kaydırma.

### Ses

- Kaynaklar: Kenney (CC0) + **Pixabay** (İçerik Lisansı, efekt + müzik) — Ida kararı, 23 Eyl 2026.
  Eski dosyalar `public/ses/` (lisans `LISANS.txt`), adaylar `public/ses/adaylar/` (kaynaklar `KAYNAKLAR.md`,
  `docs/VARLIK_LISANSLARI.md`). Pixabay'de yapay zekâ üretimi ve Content ID kayıtlı parça alınmaz.
- **Hafif müzik VAR** (Ida kararı, 23 Eyl 2026): üç döngü — menü/lobi · maç (Klasik, Düello, Grup,
  turnuva maçı, Hatalarım çalışma) · turnuva lobisi. Rota tabanlı, 0,8 sn geçiş, soru ekrandayken
  seviye × `muzik_kisik_oran` (0,3), sekme gizliyken durur, ilk dokunuştan sonra başlar, tembel iner.
  Seviye `oyun_ayarlari.muzik_varsayilan_seviye` (0,35, test değeri). Motor `oyun/lib/sesArkaPlan.js`.
- Ayar iki anahtar: **Müzik** (`bildim_muzik`) ve **Efektler** (`bildim_ses`, eski tercih) — avatar
  menüsü + Profil › Ayarlar; maç şeridindeki hoparlör küçük pencere açar — Müzik ve Efektler ayrı anahtar, aynı kaynak.
- `oyun/lib/ses.js`: dosyadan çalar, yüklenemezse osilatör yedeği. 30 anın her biri bir fonksiyon
  (tablo `public/ses/OKU.md`); "mevcut" = eski dosya, "sessiz" = çalmaz.
- **`/ses-secim` kalıcı araçtır** (menüde yok, yalnız sahip — `sahip_mi()`): Ida bir sesi orada
  değiştirince oyun yeni dağıtım olmadan değişir (`ses_secimleri` → `ses_secimleri_oyun(sürüm)`,
  migration 380 + 400; istemci açılışta sürümle doğrular). **Seçilmeyen adaylar silinmez** (ileride
  değiştirmek için). Yeni aday / yeni an ekleme: `public/ses/adaylar/KAYNAKLAR.md` başı.

### Profil avatarları

Profilde yalnız **sabit avatar fotoğrafı seçimi** vardır (karakter
oluşturma ve gardırop dondurulmuştur — bkz. Dondurulanlar).

Resmi çizim dili — tek kaynak `oyun/components/AvatarProIllustrations.jsx`,
statik üretici `oyun/_test/avatar-pro-uret.mjs`, canlı dosyalar
`public/avatars/pro/`. Yeni avatarlar aynı düz/katmanlı SVG dilinde çizilir:
kalın lacivert kontur, sıcak düz renk, güçlü siluet, hafif asimetri, küçük
boyutta net yüz. Plastik 3B render, stok degrade ve jenerik AI avatar
görünümü kullanılmaz.

Canlı profesyonel set **31 avatar + 27 yeni katalog avatarı** (550, ücretsiz; ızgaralar 31'i koddan,
27'yi `avatar_katalogu_oyun`'dan alır). İlk 10 karaktere ek olarak Köpek,
Baykuş, Tilki, Penguen, Kurbağa, Ayı, Maymun, Ejderha, Köpekbalığı, Ahtapot,
Arı, Ninja, Şövalye, Büyücü, Dedektif, Viking, Hayalet, Zombi, Mumya,
Palyaço ve Kral aynı çizim dilinde yeniden yapılmıştır. Eski `k01.svg`…
`k31.svg` dosyaları yalnız tarihsel geri dönüş için dondurulmuş kalır;
seçimde yalnız `/avatars/pro/**` ve `/avatars/pro2/**` kullanılır.

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
| **Meydan (3B harita)** + `/insan-prototip` | `oyun/harita/**`; varlıkları `varliklar-dondurulmus/meydan/` (derleme dışında) | yok (bayrak istemcide) | `oyun/lib/ozellikBayraklari.js` › `MEYDAN_ACIK = true` · varlık klasörlerini `public/meydan/` altına geri taşı (README) |
| **Gardırop / karakter vitrini** | `oyun/vitrin/**`, `oyun/pages/GorunumPage.jsx` | yok (bayrak istemcide) | `oyun/lib/ozellikBayraklari.js` › `GARDIROP_ACIK = true` |
| **Eski 3B gardırop / atölye / yerel meydan** | `oyun/avatar3d/**` | yok (HTML girişleri yönlendiriyor) | Üç HTML'deki `location.replace` satırını kaldır · `/gorunum` ve `/gorunum-3b` rotalarını geri bağla · Dükkân › Görünüm sekmesini geri koy |
| **Eski düşük ayrıntılı profil avatarları** | `public/avatars/k01.svg`…`k31.svg`, `oyun/_test/avatar-uret.mjs` | `avatar_onayla` yalnız profesyonel `/avatars/pro/**` listesini kabul eder | Eski dosyalar geri açılmaz; karakter fikirlerinin 31'i de profesyonel sette yeniden çizildi |

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

## Test kuralı — oyuncu gibi test et (23 Eyl 2026)

Sunucu testleri (`npm test`) CANLI veritabanında işlem açıp geri alır ve Disk IO bütçesini
tüketir: GitHub Actions'ta push'ta da gece de ÇALIŞMAZ (yalnız elle, `workflow_dispatch`);
ayrı test ortamına (yerel `supabase start` — Docker gerekir — ya da ayrı proje) taşınması açık iş.
Yerelde de aynı anda tek koşu; oyuncu testini canlıda tekrar tekrar çalıştırma (her maç DB yükü).
- **Disk IO (23 Eyl 2026):** pg_cron çalışma kayıtları saatlik budanır (`bildim-cron-kayit-budama`,
  6 saat); `duello_kilitle` son görülmeyi 5 sn'de bir yazar; Düello istemcisi Realtime bağlıyken
  4 sn'de bir yedek yoklar, `duello_baglanti` 5 sn'de bir. Oyun cron'ları (bot_oyna, duello_tik 2 sn)
  maç akışını belirler — seyreltmek ürün kararıdır.

Her pakette: `node araclar/oyuncu-testi.mjs [--adres=https://quiztactics.vercel.app]`.

- Oyuncunun cevap vermesi gereken HER soruda şıklar dokunulabilir olmalı;
  değilse test ANINDA başarısız. "Açık şık varsa dokun" yazılmaz — eski betik
  şık kapalıyken sessizce bekledi, soru Yanıtsız kapandı, test geçti.
- Her dokunuştan sonra cevabın sunucuya ulaştığı veritabanından doğrulanır;
  maç sonunda test hesabının yanıtsız kaldığı her soru başarısızdır.
- Düello: en az 3 saldıran + 3 savunan; `--uzatma` ile uzatmaya kadar.
- Her ekran 360 ve 390 px ölçülür; dokunulabilir öğe kutuları kesişirse
  başarısız. Maç öncesi ekran, maç içi skill çubuğu, maç sonu dahil.
- Telefon taklidi (dokunuş), gerçek akış, bota karşı. Klasik ve turnuvada da
  (turnuva yalnız seans açıkken) aynı kontrol.

## Açık İşler

- **Edge Function dağıtımı bekliyor (23 Eyl):** `satin_alma_dogrula` (yeni sürüm) ve
  `satin_alma_iade_tara` depoda hazır, canlıda değil — CLI 403 (makinedeki Supabase belirteci
  başka hesaba ait), Chrome eklentisi bağlı değildi. Migration'lar (304–306) uygulandı; canlıdaki
  eski fonksiyon `coin_satin_alma_isle` üzerinden yeni deftere devreder. Satın alma zaten kapalı.


- **1000 soru partisi + Jev zorluk (270–274) beklemede.** Üretildi ve provadan
  geçti ama Ida "soru üretimini durdur" dedi; uygulanmadı. Dosyalar
  `araclar/soru-parti-1000/bekleyen-migrationlar/` (migrations klasörü
  dışında). Uygulanacaksa önce "yeni zor soru üretilmez" kuralına göre zorluk 4–5 çıkanlar
  ayıklanmalı (324'ten beri zorluk 1 normal maçlarda da çıkar).

- **Asenkron 1v1 maç dalı — karar bekliyor.** `matches` tablosundaki 48
  satırın tamamı `senkron = true`; `senkron = false` olan hiç maç yok. Ama
  dal ölü değil, erişilebilir: `mac_asenkrona_gec()` `senkron = false` yazan
  tek canlı yoldur ve `oyun/pages/MatchPage.jsx:428` üzerinden, rakip maça
  gelmediğinde (rakip bot değilse) oyuncuya düğme olarak sunulur. Dalı
  kaldırmadan önce o düğmenin ne olacağına karar verilmelidir.
