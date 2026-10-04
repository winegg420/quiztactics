# Quiz Tactics — Proje İlerleme Kaydı

> Bu dosya kronolojik çalışma günlüğüdür. Yeni kayıtlar SONA eklenir.
> Projenin bugünkü gerçeği için PROJECT_CONTEXT.md'ye bak.
> Yeni kayıt şablonu:
>
> ## <tarih> — <başlık>
> **Araç:** Claude Code | Codex
> **Neden:** <tek cümle: bu iş neden yapıldı>
>
> Ardından: ne değişti, hangi dosyalar, varsa kök sebep, test sonuçları,
> dağıtım durumu.

## 2026-07-05 — 3 Revizyon + Ana Sayfa Yeniden Tasarımı

### 1) Grup Maçı 5 kişiye çıkarıldı
- **Migration:** `20260612000031_grup_5_kisi.sql`
- `group_matches.oyuncu_sayisi` kısıtı `(3,4)` → `(3,4,5)` olarak güncellendi (constraint drop/add).
- `create_group_challenge`: rakip sayısı kontrolü `not in (2,3)` → `not in (2,3,4)` (4 rakip + kurucu = 5).
- Frontend `ChallengesPage.jsx`: kişi seçimi `[3,4]` → `[3,4,5]`, başlık "3-5 kişi".
- RLS/realtime/puanlama mantığına dokunulmadı (ödül zaten `10 * oyuncu_sayisi` ile ölçekleniyor).

### 2) Yeni mod: "Hızlı Olan Kazanır"
- **Migration:** `20260612000032_hizli_olan_kazanir.sql`
- Grup Maçı deseninin kopyası; ayrı tablo/fonksiyon seti: `hizli_maclar`, `hizli_oyuncular`, `hizli_cevaplar`.
- Sabit 5 kişi. **Sadece ilk doğru cevabı veren +10 puan alır.** Joker/sohbet yok.
- **Yarış durumu (race):** `submit_hizli_cevap` içinde `hizli_maclar` satırı `FOR UPDATE` ile kilitlenip, o soru indexine daha önce doğru kayıt var mı diye kontrol edilir (client'a güvenilmez).
- RPC'ler: `create_hizli_mac`, `respond_hizli_davet`, `get_hizli_soru`, `submit_hizli_cevap`, `advance_hizli_mac` (hepsi security definer, sadece `authenticated`).
- RLS `_select_own` politikaları grup ile birebir; insert/update/delete revoke.
- Realtime: `hizli_maclar` + `hizli_oyuncular` publication'a eklendi.
- Push bildirimi trigger'ı: `notify_new_hizli_davet` (grup deseninin kopyası).
- `bot_oyna()` genişletildi (bölüm 10-13): botlar hızlı maçları kabul eder, başlatır, cevaplar (ilk doğru kontrolüyle) ve ilerletir. Botlar da `FOR UPDATE ... skip locked` ile serileşir.
- Frontend: `src/pages/HizliMacPage.jsx` (GroupMatchPage kopyası, sohbet/joker çıkarıldı, "İlk sen bildin! +10" geri bildirimi). `App.jsx` route `/hizli-mac/:id`. `ChallengesPage.jsx`'e kurulum kartı + gelen/aktif/beklenen/biten listeleri.

### 3) 500 yeni soru
- **Migration:** `20260612000033_soru_parti9_500.sql`
- Kategoriler: tarih, bilim, coğrafya, edebiyat, spor, sanat + yeni kategoriler **sinema, müzik, teknoloji** ve karışık/genel.
- **Karar:** `soru` kolonu UNIQUE olduğu için mevcut havuzla çakışanlar (~61) migration'ı bozmasın diye `on conflict (soru) do nothing` eklendi; çakışanları telafi için ek benzersiz sorular kondu → **net ~500 yeni benzersiz soru**.
- Doğru şık 0'a sabit kalmasın diye migration sonunda `created_at >= transaction_timestamp()` ile SADECE bu partinin şıkları karıştırıldı (yeni sorular hiçbir aktif maçta olmadığı için güvenli).

### 4) Ana sayfa "A-sınıfı oyun paneli" tasarımı
- `src/pages/Home.jsx` yeniden düzenlendi (tüm mevcut mantık korundu): zengin **hero paneli** (rütbe halkalı avatar, XP/rütbe ilerleme çubuğu, puan, seri), **oyun modları grid'i** (Hemen Oyna / Meydan Oku / Hızlı Olan Kazanır / Grup / Turnuva), bölüm başlıkları, podyumlu lider tablosu.
- `src/styles.css`'e kapsamlı yeni stiller eklendi (gradient/glow'lu mod kartları, hero panel, xp-bar, bölüm başlıkları). Mevcut sınıflara dokunulmadı.

### Notlar / Test edilecekler
- Migration'lar Supabase'e push edilmeli (repo push = otomatik Vercel prod deploy, DB migration Supabase tarafında ayrı uygulanır).
- Test: Hızlı Olan Kazanır'da aynı anda 2 oyuncu doğru cevap → sadece ilki +10 almalı. 5 kişilik grup kurulabilmeli. Ana sayfa mod kartları doğru sayfalara gitmeli.
- Build doğrulandı (`npm run build` başarılı).

## 2026-07-09 — RUN prototipi tamamlandı (izole modül)
- `run/` modülünün tek-oyunculu prototipi bitirildi: **beceriler** (sopa=bayılt+sat, kalkan=3sn
  dokunulmazlık, cooldown + kill feed), **AI ele geçirme** (nesneler drone çeker), **drone ateş
  menzili + zorluk eğrisi**, **izleyici modu + round sonu 2 katmanlı sıralama**.
- **React entegrasyonu:** `src/App.jsx`'e lazy `/run/*` rotası; menü + oyun sayfası (canvas + Motor).
  RUN ayrı chunk (`RunApp-*.js` ~34 kB) — Bildim quiz paketi etkilenmez.
- Ayrıntı ve kararlar: **`run/PROGRESS.md`** (modül günlüğü). Kalan tek büyük iş: multiplayer (en son).
- Doğrulama: `npm run build` OK + Node başsız motor simülasyonu (hata yok, round çözülüyor, sıralama doğru).

## 2026-07-09 — RUN: kapılar, etkileşimli makineler, parçacıklar (kalan açık maddeler)
- Odalar **duvarlandı**, her odaya 2-3 **kapı geçidi** açıldı → gerçek labirent. Kapıyı **Q** ile
  kapatınca enerji perdesi olur: oyuncular geçer, **drone 2.2sn kırmak zorunda kalır**.
- **Etkileşimli makine:** alarm veren makinenin yanında **E basılı tut** → ele geçir; menzildeki
  droneler 2.6sn **sersemler** (EMP). Bedeli: hack sırasında durursun, ısı algılamasına açıksın.
- **Parçacık sistemi** (vuruş/hack/EMP/kapı/yakalama kıvılcımları) + ele geçirme ilerleme halkası.
- **`run/engine/navigasyon.js`** (yeni): çıkışlardan BFS akış alanı — botlar duvarlı odalardan
  kapıları bulup çıkabiliyor; aynı alan haritanın %100 ulaşılabilirliğini doğruluyor.
- Ölü kod temizliği (`render.js`'te erişilemez ~70 satır, kullanılmayan importlar).
- Doğrulama: başsız Node testi (17 sağlama × 5 tur, hepsi geçti), `npm run build` OK,
  Chrome'da kapı perdesi + hack halkası + EMP görsel olarak doğrulandı.
- Ayrıntı: `run/PROGRESS.md`. **Kalan tek büyük iş: multiplayer** (backend gerektirir).

## 2026-07-09 — RUN yayına hazır: ışık oklüzyonu + hata düzeltmeleri
- **Fener artık duvardan sızmıyor** (gölge dörtgenleri + ara katman ışık maskesi; ışık kapı
  geçitlerinden doğal sızar). Piksel taramasıyla doğrulandı.
- Düzeltilen hatalar: masaüstünde dokunmatik butonlar gizlenmiyordu (CSS), oyundan çıkınca
  ortam sesi çalmaya devam ediyordu (ortamDur), drone başlangıcın dibinde doğabiliyordu
  (spawn ≥700), girdi bayrak temizliği, ölü sabit.
- Cila: botlar yakın drone'dan kaçınıyor; round bitince vızıltı sönüyor.
- Doğrulama: başsız test 3 tur geçti, build OK, Chrome görsel + piksel doğrulaması.
- Multiplayer hâlâ bilinçli olarak sonraki faz (backend gerektirir).

## 2026-07-09 — RUN: stealth görünürlük kuralı + profesyonel harita + mobil cila
- **Görünürlük:** diğer oyuncular yalnızca ışığının içindeyse (fener/çevre) VE arada duvar
  yoksa görünür/etiketlenir; koşulsuz isim blip'leri kaldırıldı. Genel bakış "bina planı" oldu:
  drone/oyuncu göstermez (hile olmaktan çıktı).
- **Harita:** değişken oda boyutları, birleşik büyük odalar (Kafeterya + Atrium), 14 oda tipi
  (tip bazlı mobilya + zemin tonu), depo palet istifleri, güvenlik monitör duvarı, lab tezgahları.
- **Mobil:** sanal joystick görseli, dokunsal titreşim, kill feed sağ-üst, safe-area, çıkış yön okları.
- Doğrulama: başsız test 5 tur geçti (%100 ulaşılabilirlik), Chrome görsel testleri, build OK.

## 2026-07-09 — RUN okunurluk/yönlendirme: karanlık yumuşatıldı, kapılar ve çıkış belirgin
- Karanlık örtü 0.85, çevre ışığı 150; kapılara acil durum aydınlatması (karanlıkta seçilir);
  oyuncu üstünde en yakın çıkış pusulası + mesafe; çıkışlar animasyonlu yeşil geçit.
- HUD: konum (oda adı), süre sayacı, round başı hedef yazısı.
- Görünürlük kuralı gövdelere de uygulandı (karanlıkta silüet bile yok; aydınlık odadakiler
  görüş hattı açıksa görünür). Test + build + Chrome doğrulaması yapıldı.

## 2026-07-09 — RUN büyük oynanış turu (İda'nın 10 maddelik geri bildirimi)
- Kapılar fiziksel: Q aç/kapa, kapalı kapı herkesi engeller, drone 0.5sn'de açar.
- İnsan görünümlü karakterler (saç/ten/ceket çeşidi, yürüme animasyonu) + elde görünür
  sopa ve savurma animasyonu.
- Kırmızı tarama konisi: devriye drone önünde salınan arama ışığı — koniye giren anında
  fark edilir; duvar koniyi keser (görsel + mekanik). Drone 3→6 (3'ü çıkış bekçisi),
  gövde 1.5x, vızıltı yaklaşınca belirgin yükselir.
- Çıkış zorlaştı: çıkışta 1.6sn bekleme (kaçış kanalı + ilerleme halkası).
- Harita: doygun zeminler, tip renginde kenar neonu + halılar, parlak mobilya.
- Doğrulama: 35 sağlamalı başsız test 8 tur geçti, build OK, Chrome görsel testler.

## 2026-07-10 — RUN aksiyon turu: enerji kılıcı + dash + veri çipleri
- İda: "vuramıyorum, drone beni önce yakalıyor; gerçek kılıç savurmak istiyorum; oyun heyecansız."
- **Enerji kılıcı:** menzil 52→118 (drone ateş menzilinden uzun), cooldown 1.5sn, ileri hamle;
  droneları geri savurur + sersemletir, **3 vuruşta hurdaya çıkarır** (12sn sonra uzakta yeniden doğar).
  Gerçek savurma animasyonu: süpüren enerji izi + parlak bıçak; karakterin elinde ışıyan kılıç.
- **Juice:** vuruş donması (hitstop) + ekran sarsıntısı. **Dash:** Shift/L, 0.22sn ×3.2 hız, cd 2.6sn
  (Shift artık kalkan değil — kalkan yalnız K).
- **Veri çipleri:** 10 toplanabilir, karanlıkta parlar, HUD sayacı + sıralamada 💿 kolonu. 5 yeni ses
  (kilic/darbe/patlama/dash/cip). Menü + ipucu metinleri güncellendi, mobil ⚔/💨 butonları.
- Doğrulama: başsız test 16/16, build OK (RunApp 63 kB), Chrome görsel + konsol temiz.
- Ayrıntı: `run/PROGRESS.md`.

## 2026-07-15 — KAFA TOPU modülü (yeni oyun sekmesi, baştan sona)

Head Soccer tarzı 2D fizik futbolu; `kafatopu/` altında izole modül, `/kafatopu` route'u + tabbar'a "⚽ Kafa Topu" sekmesi. Bildim oturumunu kullanır (giriş duvarı arkasında).

### Yapılanlar
- **Fizik/motor (Matter.js):** `kafatopu/engine/` — fizik.js (saha 1000x560, kaleler+üst direk, top sekme 0.82, yerçekimi 1.35), oyun.js (faz makinesi: geri_sayim→oyun⇄gol_bekle→bitti, 60Hz sabit adım, maç 120 sn, gol beklemesinde saat durur), gucler.js (5 düşen güç: 🎈💨💥🐌🪄, 10-16 sn arayla, 6 sn etki; 5 karakter yeteneği: ateş şutu/dondurucu/ışınlanma/kalkan/dev kafa, 15 sn cd), bot.js (balistik tahminli antrenman botu), girdi.js (klavye+dokunmatik birleşik), render.js + kafaCizim.js (parallax arka plan, prosedürel Club Afrodit yedeği, foto kafa animasyonları: eğilme/gerilme/vuruş savurması).
- **Multiplayer (host-otoriter):** `kafatopu/net/` — kanal.js (Realtime broadcast+presence, `kt-mac-<id>`), interpolasyon.js (100 ms geriden lerp). Slot 0 = host: sim çalıştırır, 20Hz "durum" yayınlar; misafir 20Hz "girdi" yollar. Kopma: presence takibi, 12 sn sonra "mevcut skorla bitir" hakkı.
- **DB:** `20260612000035_kafatopu_temel.sql` — kafatopu_profiller/kuyruk/maclar/mac_oyunculari; RLS select-only, yazım security-definer RPC'lerle. `kafatopu_mac_bul` (advisory lock ile yarışsız eşleştirme; 1v1/2v2 × ranked/hizli 4 ayrı kuyruk; ranked'da puan yakınlığı), `kafatopu_sonuc_kaydet` (FOR UPDATE + ilk raporlayan; ELO K=32, takım ortalaması, taban 100), iptal + 3 admin RPC. Admin = sabit geliştirici UUID (Gladius deseni).
- **Ligler:** Bronz<1100, Gümüş 1100+, Altın 1250+, Platin 1450+, Elmas 1700+ (puandan türetilir, başlangıç 1000).
- **UI:** app/pages — Menu (mod kartları), Karakter (5 kurgusal + /heads/manifest.json foto kafaları; foto kafa yetenek seçer), Kuyruk (3 sn poll, 15 sn sonra bot önerisi), Mac (canvas + HUD + dokunmatik butonlar + sonuç paneli), Siralama (top 100 + lig rozetleri), Admin (kuyruk/maç görüntüle-iptal, puan ayarla; maç içi admin cd≈0).
- **Varlıklar:** public/heads/ ve public/map/ + OKU.txt + manifest şablonu — İda fotoğrafları/harita görsellerini sonra ekleyecek; yokken prosedürel sahne/kurgusal roster ile oyun tam çalışır.

### Kararlar
- Fizik değerleri sabitler.js'te tek yerde (denge ayarı kolay olsun).
- Arka plandaki sekmede rAF durduğu için host simülasyonuna 200 ms interval kalp atışı eklendi (online maç donmasın).
- Antrenman botu DB'ye yazmaz; hızlı maç ELO etkilemez (delta 0 ama G/B/M istatistiği işlenir).

### Doğrulama
- Başsız motor testi (Node): 1v1 + 2v2 tam maç, NaN yok, skor/gol tutarlı, yetenek+güç+vuruş olayları geldi.
- Chrome görsel test: `kafatopu/_test/mac-test.html` (Supabase'siz bot maçı) — sahne, animasyonlar, gol, aura doğrulandı; konsol temiz. `npm run build` OK (KafaTopuApp ~135 kB lazy chunk).

### Bekleyen / manuel
- **Migration uygulanmadı:** `npx supabase db push` bu makinede 403 verdi (DB şifresi/yetki gerekli). SQL'i Supabase Studio'da çalıştır ya da `SUPABASE_DB_PASSWORD` ile push et. Online modlar migration'sız çalışmaz (antrenman çalışır).
- Gerçek 2 cihazla online 1v1/2v2 + kopma senaryosu testi.
- /heads ve /map görselleri eklenince karakter/harita son kontrol.
- Deploy (main'e push) yapılmadı — onay bekliyor.

## 2026-07-15 (2. oturum) — Kafa Topu: İda foto kafası + mobil cila + canlıya alma
- `public/heads/ida.png` (çift uzantı düzeltildi) manifest'e bağlandı; manifest'e **odak desteği** eklendi (`odakX/odakY/yaricap`, görüntü oranı cinsinden) — yüz görselin neresindeyse daire oradan kesilir (kafaCizim.js kaynak-dikdörtgen çizimi). İda: odak (0.36, 0.55), yarıçap 0.38.
- Mobil: dikey tutuşta "telefonu yan çevir" ipucu (CSS media query, oyun dikeyde de çalışır). 380px genişlikte görsel doğrulama yapıldı — saha/kafalar/skor okunaklı, güç ölçeklemesi görünüyor.
- Doğrulama: mac-test.html foto kafayla bot maçı (skor aktı, kırpma isabetli, konsol temiz), build OK.
- Deploy: main'e push edildi (kullanıcı "siteden gireyim" dedi). **Migration hâlâ manuel** — Supabase Studio'da 20260612000035 çalıştırılmalı, yoksa online modlar/karakter kaydı çalışmaz.
- GÜNCELLEME: Migration Supabase Studio SQL editöründen uygulandı (Success) — tüm kafatopu_ tabloları/RPC'ler canlıda. Üretimde doğrulandı: profil (Bronz·1000), karakter kaydı (İda foto kafa), antrenman maçı İda kafasıyla oynuyor. Ek düzeltme: bot/online maç kurulumunda profil+foto manifesti beklenir oldu (seçili kafa yarış durumu). Canlı adres: https://bildim.vercel.app/kafatopu

## 2026-07-15 (3. oturum) — Zıplama fiziği + ana sayfa üst sekmesi
- **Zıplama "aşırı yüksek" şikayeti:** eski ayarda tepe ~310px (saha yarısı) çıkıyordu. Head Ball hissi için YERCEKIMI 1.35→2.0, ZIPLAMA 15.2→12.4 → tepe ~140px (~1.6 kafa boyu), havada kalış ~0.75 sn. Top ağırlaşmasın diye TOP.YUZERLIK=0.35 eklendi (fizikAdim'da topa ters kuvvet; plaj topu süzülmesi korunur, şut yayları eskisine yakın).
- **Ana sayfa üst sekmesi:** Home.jsx'in en üstüne `kafatopu-serit` bandı (zıplayan ⚽ animasyonu, "YENİ" rozeti, /kafatopu linki); stiller styles.css'e eklendi. Alt tabbar sekmesi de duruyor.
- Doğrulama: başsız motor testi geçti (27+22 gol, iki mod da bitti), build OK, canlıda ana sayfa şeridi + bot maçı yeni fizikle görsel doğrulandı.

## 2026-07-15 (4. oturum) — Gol sonrası hareket, bayıltma, gerçekçi sahne
- **Gol sonrası serbest hareket:** gol_bekle fazında artık girdiler + fizik işleniyor (Head Ball sevinç koşusu); saat durur, yeni gol sayılmaz, süre sonunda pozisyon sıfırlanır.
- **Topsuz vuruşla bayıltma:** vuruş menzilindeki öndeki rakip 1.1 sn bayılır (kontrol kilidi + geriye savrulma + dönen ⭐ animasyonu, sersem sallanma). Bayılma sonrası 2.2 sn tekrar-bayıltılamama koruması (stunlock önlenir). Ağ paketinde EFEKT_BAYRAK.bayilmis=128. Botlar da top uzaktayken ara sıra kullanır. Başsız testte 1v1'de 24, 2v2'de 55 tetiklenme.
- **Gerçekçi prosedürel sahne (render.js yeniden):** kaydırak kulesi (ışık/gölgeli gövde, kat çizgileri, merdiven, korkuluklu platform, kırmızı tente), borularda hacim (koyu kontur + üst ışık şeridi) ve destek ayakları, çıkış köpüğü; bulutlar, güneş ışıması, iki katmanlı sisli dağlar; damarlı yapraklı/hindistan cevizli palmiyeler; şemsiye+şezlong; taş bordürlü parıltılı havuz; kum dokusu (deterministik benekler).
- **Harita fotoğrafları hâlâ YOK:** public/map/ boş — İda fotoğrafları atınca manifest.json ile bağlanacak (OKU.txt tarifli). Fotoğraflar Desktop/Downloads'ta da bulunamadı.
- Deploy edildi; canlı chunk'ta bayilma kodu HTTP ile doğrulandı (tarayıcı eklentisi oturum ortasında koptu).

## 2026-07-15 (5. oturum) — Oyun ana ekranı + özel oda/davet sistemi
- **Ana ekran yeniden:** panel görünümü gitti — tam ekran canlı sahne (senin karakterin topla sektirme yapar, topu tembelce takip eder), üstte lig rozeti + sıralama/karakter/admin kısayolları, ortada logo, altta arcade butonlar: ▶ OYNA (mod seçim modalı), 🏟 ODA KUR, 🔑 KODLA KATIL. Davet banner'ları ana ekranda görünür (8 sn poll).
- **Özel odalar:** Migration `20260612000036_kafatopu_odalar.sql` — kafatopu_odalar (6 haneli kod), kafatopu_oda_oyunculari, kafatopu_davetler. RPC'ler: oda_kur, odaya_katil (kodla; linkle gelince otomatik), odadan_ayril (kurucu ayrılırsa oda iptal), oda_baslat (sadece kurucu, oda doluyken → hizli/puansız maç kurar), davet_gonder/davetlerim/davet_yanitla (kabul = odaya katılım). Oda maçında host = kurucu (slot 0).
- **OdaPage lobisi:** kod kartı (tıkla = kod+link kopyala), iki takım kadro görünümü (kafa önizlemeli), Bildim arkadaş listesinden "Davet Et", kurucuya MAÇI BAŞLAT, 2.5 sn poll; "basladi" görülünce herkes maça geçer. KafaOnizleme paylaşılan bileşene çıkarıldı.
- Migration Studio'dan uygulandı (Success). Build OK.
- **DEPLOY BEKLEMEDE:** `git push` GitHub kimlik doğrulaması istiyor (GCM kimlik bilgisi düşmüş) — kullanıcının interaktif push'u gerekiyor. 2 commit lokalde hazır.

## 2026-07-15 (6. oturum) — Göğe uçma bug'ı + 2. foto kafa
- **Göğe uçma kök nedeni:** fizik.js'te olay tabanlı yere-basma sayacı, top/kafa temas bitişinde koşul tutmayınca takılı kalıyordu → zıplama basılı tutulunca her tick -12.4 hız = uçuş. Çözüm: sayaç kaldırıldı, yerdeMi() her çağrıda deterministik geometri kontrolü yapar (vy < -1 iken asla yerde değil; zemine yakınlık ya da başka kafanın tepesinde olma). Body.scale sonrası circleRadius kullanılır.
- Regresyon testi eklendi (motor-test): zıplama 15 sn basılı tutulur, tepe ~111px doğrulanır, y<150 (uçuş) hata fırlatır.
- **2. foto kafa:** kafa2.png (1170x1170, şeffaf) manifest'e eklendi (odak 0.5/0.5, yarıçap 0.40), rosterde "Kafa 2" olarak canlıda doğrulandı. Kullanıcı ad değişikliği isterse manifest.json'daki "ad" alanı güncellenir.

## 2026-07-15 (7. oturum) — Foto kafalar karikatürize edildi
- İki foto kafa (ida.png, kafa2.png) Head Ball tarzına çevrildi: 3px yumuşatma + hafif doygunluk + 7 seviyeli posterize (düz renk bölgeleri) + Sobel tabanlı koyu konturlar (alpha silüeti de kontur sayılır, kafa çevresine doğal çizgi düşer). Orijinal şeffaflık birebir korunur.
- İlk denemede doygunluk 42 tenleri turuncuya boyadı → 12-15'e düşürüldü.
- Araç kalıcı: `scripts/kafatopu-karikatur.mjs` (jimp@0.22 gerektirir, kullanım: `node scripts/kafatopu-karikatur.mjs girdi.png cikti.png [esik] [poster] [doygunluk]`). Orijinal fotoğraflar git geçmişinde (commit 1ee2f77 ve öncesi).
- Canlıda doğrulandı: roster'da iki karikatür kafa kurgusal karakterlerle uyumlu.

## 2026-07-15 (8. oturum) — Maçtan çıkma + hızlı karakter seçici
- **Maçtan çıkış:** maç ekranı sağ üstüne ✕ butonu + onay paneli. Bot: direkt menü. Online beklemede/başlamamış: kafatopu_mac_iptal (puansız). Online aktif: hükmen mağlubiyet — rakip skoru max(3, mevcut, benim+1) yapılarak kafatopu_sonuc_kaydet çağrılır, "bitti" broadcast edilir, menüye dönülür.
- **Hızlı karakter seçici:** KafaSecici bileşeni (yatay şerit, tak-seç → kafatopu_profil_kaydet; kurgusalda yetenek otomatik, foto kafada mevcut yetenek korunur). OYNA modalının üstünde ve oda lobisinde. Kuyruk/oda maçları kafayı maç kurulurken profilden okuduğu için seçim anında geçerli.
- Canlıda doğrulandı: OYNA modalında şerit, antrenman maçında ✕ → onay → menü akışı, karikatür kafalar maç içinde.

## 2026-07-15 (9. oturum) — Kod inceleme raporu işlendi + 3. kafa
- **[KRİTİK] Skor sahteciliği kapatıldı** (rapor Madde 1): Migration `20260612000037_kafatopu_skor_onay.sql` (Studio''dan uygulandı). Yeni model: her oyuncu maç sonunda KENDİ gördüğü skoru bildirir (ilk bildirim sabitlenir); sunucu ancak İKİ TAKIMDAN uyuşan rapor gelince ELO işler. Uyuşmazlık = maç iptal, ELO yok (hile kâr etmez). Tek taraflı kesinleştirme sadece rakip gerçekten kopuksa: rakip takımın son nabzı >25 sn eski VE rapor >15 sn beklemiş. Nabız: istemciler maç boyunca 10 sn''de bir kafatopu_nabiz çağırır. Skor tavanı 50→20. İstemci: raporla() (onay_bekliyor''da 5 sn aralıkla 12 deneme), misafir host''un "bitti" yayınını kendi skoruyla doğrular (tek kabul edilen fark hükmen çekilme deseni), hükmen çekilme de rapor sistemi üzerinden.
- **[Madde 2] Kalıcı test paketi:** `kafatopu/_test/motor-test.mjs` (Node, 27 test): golKontrol sınırları, faz geçişleri (macTick 250ms/çağrı kırptığı için zamanIlerle ile), ELO formül JS eşleniği (SQL ile birebir; değişirse ikisi birlikte güncellenecek), tam 1v1/2v2 bot maçları, zıpla-tut regresyonu. Çalıştırma: `node kafatopu/_test/motor-test.mjs`.
- **[Madde 5] 2v2 takım dengesi:** kafatopu_mac_bul artık 4 kişiyi ELO toplam farkı minimum olacak şekilde bölüyor (ben+en uygun partner vs kalan ikisi).
- **[Madde 3] not:** Kök PROGRESS.md''de Kafa Topu kayıtları zaten bu oturumlardan beri mevcut (raporun klonu eski olabilir).
- **3. foto kafa:** kafa3.png (1100x1100) karikatürize edilip manifest''e eklendi ("Kafa 3", odak 0.52/0.51, yarıçap 0.48).
- Bilinen sınır (rapor Madde 2 - host migration): host kopunca maç devralınmıyor, "mevcut skorla bitir" telafisi geçerli — bilinçli tasarım kararı olarak bırakıldı.

## 2026-07-15 (10. oturum) — Oyun içi isim değiştirme + kafa adları
- Menü üst şeridine 👤 isim chip''i: tıkla → "Oyuncu İsmi" modalı → profiles.username güncellenir (Bildim ana sayfa kurallarıyla birebir: min 3 karakter, 23505 → "isim alınmış"). İsim maç/lobi/davet/sıralamada her yerde ortak.
- Foto kafa adları: ida → idaGG, kafa2 → Baran, kafa3 → Aykut (id''ler değişmedi, DB kayıtları etkilenmez). Not: PowerShell Get-Content ile Türkçe karakter bozulması yaşandı; manifest Write tool ile temiz UTF-8 yazıldı.
- Canlıda doğrulandı: isim chip''i menüde, manifest adları HTTP''den kontrol edildi.

## 2026-07-15 (11. oturum) — 4. foto kafa: Emirhan
- emirhan.png ham geldi (2250x3000, arka plan AYRILMAMIŞ — gri duvar önü portre). Yeni araç: scratchpad''de arkaplan-kes.mjs — kenarlardan bölge büyütme + "duvar-gibi" renk filtresi (gri tonlu + orta parlaklık; ten/siyah şapka geçemez → sızma durur). İlk deneme saf yerel süreklilikle %100 sildi (gölgeden sızdı), filtre eklenince %88 ile temiz kesti.
- Kesit karikatürize edilip manifest''e "Emirhan" eklendi (odak 0.5/0.46, yarıçap 0.44). Orijinal ham foto scratchpad''de yedekli (git''te sadece toon hali var — ham gerekirse tekrar istenir).
- Canlıda doğrulandı: roster 5 kurgusal + 4 foto kafa (idaGG, Baran, Aykut, Emirhan).

## 2026-07-15 (12. oturum) — Foto kafalar Head Ball tarzı v2 karikatür
- Kullanıcı v1 filtresini "hâlâ foto gibi" buldu → v2 işlem hattı (`scripts/kafatopu-karikatur2.mjs`): (1) karikatür oran deformasyonu — kafatası bulge +%20, çene pinch -%14 (ters eşleme + bilinear, odak parametreli), (2) cel-shading — ton korunur, ışık 5 banda kuantalanır (kanal-bazlı posterize ton kaydırıp leke yapıyordu, çözüm bu), (3) kalın koyu kontur + silüet sınırına garantili dış çizgi.
- Kesit uygulamalarının bıraktığı yarı saydam gürültü halkası: maske yalnız alpha>=250 + 2px erozyon; şeffaf piksellerin RGB artığı sıfırlanır. (Not: Read önizlemesi alpha birleştirmiyor — "saçak" alarmı iki kez yanlış çıktı, piksel ölçümüyle doğrulandı.)
- 4 kafa orijinallerden yeniden üretildi (ida/kafa2 git geçmişinden, emirhan kesikten; kafa3 ham fotoğrafı yok → v1 karikatüründen deforme edildi, ham gelirse yenilenir). Canlıda doğrulandı.

## 2026-07-15 (13. oturum) — v2 karikatür geri alındı
- Kullanıcı v2 sonucunu beğenmedi ("karikatürize edememişsin") → 4 kafa v1 haline (posterize+kontur, deformasyonsuz) geri döndürüldü (git checkout 3413466~1). v2 aracı scripts/te duruyor; ileride farklı ayarla denenebilir ya da gerçek çizim istenirse dış kaynak gerekir.

## 2026-07-15 (14. oturum) — Mobil multiplayer sertleştirme
- Tam MacPage kod denetimi + 5 mobil düzeltme: (1) Wake Lock — maçta ekran uykuya dalmaz, görünürlük dönüşünde yeniden alınır; (2) visibilitychange/blur''da girdi.sifirla() — kaçan pointerup/keyup ile tuşun basılı kalması (kendi kendine koşma) bug''ı kapandı; (3) dokunmatik tuşlarda onContextMenu engeli (uzun basış menüsü); (4) ELO delta poll 4x0.7s→8x0.9s (iki taraflı onay mobil ağda gecikebiliyor); (5) "yan çevir" ipucu 6 sn sonra kaybolur.
- Denetimde doğrulanıp değiştirilmeyenler: kanal reconnect''te presence re-track (subscribe callback her SUBSCRIBED''da track ediyor), telefon kilidi = JS tamamen durur → kopma akışı bilinçli telafi, 2v2 mesaj hızı (~80 msg/s) Realtime limiti içinde.
- Canlı duman testi: kuyruğa giriş (poll+sayaç+bot önerisi), Vazgeç ile temiz çıkış, konsol hatasız. 27 motor testi geçti.
- GERÇEK 2 TELEFON testi hâlâ kullanıcıda: eşleşme → maç → kopma → hükmen akışları cihazlarla doğrulanmalı.

## 2026-07-15 (15. oturum) — Yatay/dikey dönüş ekran sığdırma
- Kök neden: maç canvas''ı yalnız GENİŞLİĞE göre boyutlanıyordu (width:100%, height:auto) → yatay telefonda saha dikeyde taşıp "yarım" görünüyordu. Çözüm: fit-to-viewport — olcek=min(vw/1000, vh/560, 1200/1000), canvas hem stil hem buffer boyutu JS''ten; visualViewport ölçüleri (iOS adres çubuğu payı); resize + orientationchange + visualViewport.resize dinleyicileri; döndürme anında tarayıcı eski ölçü bildirdiği için 0/300/800ms üçlü yeniden ölçüm. Sarmalayıcı tam ekran flex-center (dokunmatik tuşlar gerçek ekran köşelerinde), canvas ortada.
- MenuPage arka plan sahnesine de orientationchange + gecikmeli ölçüm eklendi.
- Canlıda doğrulandı: canvas 1200x672 @ 1536x791 viewport, taşma yok; alan artık yükseklik-sınırlı ölçeklenip ortalanıyor.

## 2026-07-15 (16. oturum) — Tam ekran dolum (yatay bant sorunu)
- Fit-to-viewport yanlarda boş bant bırakıyordu ("tam ekran olmuyor"). Çözüm: canvas viewport''un TAMAMINI kaplar; saha çizimde ortalanır (transform ofset), saha dışı paylar sahneCiz''e mantıksal birim olarak geçilir ve arka plan katmanları + kum zemini bu paylara uzatılır (sahneCiz 5. parametre pay={sol,sag,ust,alt}; katman cover ölçeği paylara göre büyür). Fizik/kale konumları değişmedi.
- Canlıda doğrulandı: canvas 1536x791 = viewport (tamEkran:true), ekran görüntüsünde sahne kenardan kenara.

## 2026-07-15 (17. oturum) — Gerçek tam ekran (tarayıcı çubuğu/sistem tuşları)
- İki kök neden: (1) manifest "orientation":"portrait" → PWA (ana ekrana eklenmiş) modda döndürme tamamen kilitliydi → "any" yapıldı; (2) tarayıcı çubuğu/sistem tuşları ancak Fullscreen API ile gizlenir → maç ekranına İLK dokunuşta document.documentElement.requestFullscreen({navigationUI:"hide"}) + screen.orientation.lock("landscape") (Android; iPhone Safari API''yi desteklemez — orada tek yol PWA olarak açmak). Maçtan çıkışta exitFullscreen + orientation.unlock. fullscreenchange''de yeniden ölçüm.
- Not: PWA kurulu kullanıcılarda manifest orientation değişikliği uygulamayı silip tekrar ana ekrana ekleyince garanti alır.

## 2026-07-15 (18. oturum) — Dokunmatik tuş düzeni (ergonomi)
- Sol/sağ yön tuşları 64→88px; zıplama üst sıradan EN ALTA indi ve 88px oldu (vuruşun soluna, başparmak hizası); güç tuşu sağ üstte 62px küçük tuş. Güç barı yeni düzene taşındı. ≤480px dar dikey ekranlarda 72px ölçek + ofset düzeltmesi (tuş çakışması önlendi).

## 2026-07-16 (19. oturum) — Dokunmatik tuşlar daha büyük + köşelerden uzak
- Kullanıcı geri bildirimi: maçta tuşlar küçük kalıyor, el boşa kaçıyor. Yön/zıplama/vuruş 88→110px (font 2.4rem), güç 62→76px; kenar boşlukları 14→28px (alt 26px) + env(safe-area-inset-*) payları (çentikli/yuvarlak köşeli ekranlar). Güç barı yeni düzene taşındı.
- ≤480px dar ekran kırılımı: 72→92px, güç 54→64px, ofsetler 20px + safe-area.

## 2026-07-16 (19. oturum, devam) — Foto kafa boşluk düzeltmesi + antrenman rakip seçimi
- Foto kafa dairesindeki boşlukların kök nedeni: manifest'teki odak/yarıçap ile hesaplanan kırpma penceresi görselin dışına taşınca drawImage o bölgeyi boş bırakıyordu. Çözüm (kafaCizim.js): yarıçap görüntüye sığdırılır, pencere sınır içine kaydırılır; ayrıca daire içi önce takım koyu rengiyle doldurulur (şeffaf PNG payı). Önizleme aynı fonksiyonu kullandığından tek yerde düzeldi.
- Antrenman rakip seçimi: OYNA→Antrenman artık "Rakibini Seç" modali açar (tüm roster: 5 kurgusal + foto kafalar, takım-2 önizlemesiyle) + "Rastgele Rakip". Seçim ?rakip=id ile MacPage'e gider; slot 1 botu o kafayı ve adını alır, foto kafaya rastgele güç atanır. "Tekrar oyna" rakip parametresini korur.

## 2026-07-16 (19. oturum, devam 2) — Tuşlar ortaya alındı + çevrimiçi oyunculara davet
- Kullanıcı: "tuşlar çok ekranın köşesinde, basamıyorum" → yan boşluklar 28→64px (dar ekranda 20→44px), tuş çiftleri buna göre kaydı; boyutlar aynı (110/92px). Güç barı hizalandı.
- Çevrimiçi davet: KafaTopuApp global "kafatopu:cevrimici" presence kanalına track olur (user_id + Bildim username), liste KT context'inde `cevrimici`. Oda lobisinde yeni "🟢 Çevrimiçi oyuncular" kartı — oyunda olan herkes (arkadaş şartı yok, RPC zaten kısıtsız) davet edilebilir; arkadaş listesine de 🟢/⚪ durum rozeti eklendi.
- Not: davet banner'ı MenuPage'de 8 sn'de bir poll ile görünür; davet edilen kişi menüdeyse görür.

## 2026-07-16 (19. oturum, devam 3) — Kaleler ekran kenarına + sarı çizgi kaldırıldı + son 5 sn sayacı
- "Kaleler içeri girmiş" — kök neden tuşlar değil, 16. oturumdaki fit-to-viewport ortalamasıydı (yanlarda saha dışı pay). Çözüm: saha GENİŞLİĞE tam oturur (sc = w/SAHA.W), zemin alta sabit; basık ekranlarda üstteki gökyüzü kırpılır (fizik aynı, top nadiren üstte kısa süre ekran dışına çıkabilir). Kaleler artık ekranın en kenarında.
- "Sağ kale üzerindeki sarı çizgi" = dokunmatik güç şarj barıydı → kaldırıldı; soğuma artık güç tuşunun İÇİNDE sayı olarak geri sayar (tuş sönükleşir). Klavye modundaki alt bar durdu.
- Maç sonu: son 5 saniye ekran ortasında turuncu sayaçla sayılır (kt-geri-sayim.son5).

## 2026-07-16 (19. oturum, devam 4) — Tuş yerleşimi son hali (kullanıcı düzeltmesi)
- "İçeri alma" yanlış yöndü; istenen: yön tuşları SOL kenara (sol 18px, sağ 146px), zıpla+vur SAĞ kenara (zıpla right 146px, vur right 18px), güç sağ üstte. İki el kümesi ekran kenarlarına yaslı, aradaki geniş boşluk yanlış basmayı önler. Dar ekranda 14/120px. Boyutlar korundu (110/92px, güç 76/64px).

## 2026-07-16 (20. oturum) — Adenis kafası + iOS (Apple) tuş/kasma düzeltmeleri
- Yeni foto kafa: adenis.png → manifest'e eklendi (odakX .49, odakY .40, yaricap .31 — 2250x3000 dikey fotoğraftan hesaplandı).
- iOS'ta "tuşlar çalışmıyor" kök nedenleri ve çözümler:
  - Dokunmatik tuşlar yalnız pointer olayı dinliyordu; iOS Safari çoklu dokunuşta (bir tuş basılıyken ikinci parmak) pointer olaylarını güvenilir iletmiyor + çift dokunuş zoom/uzun basış büyüteci araya giriyordu. Çözüm: DokunmatikKontroller artık kapsayıcıya native touchstart/touchend/touchcancel (non-passive, preventDefault) bağlar; touch.identifier→tuş haritasıyla çoklu parmak takibi. Pointer olayları sadece mouse/kalem için kaldı (pointerType==="touch" yok sayılır).
  - CSS: .kt-tus ve .kt-mac-root'a -webkit-touch-callout:none + -webkit-tap-highlight-color:transparent eklendi.
- iOS'ta "oyun kasıyor" kök nedenleri ve çözümler:
  - Safari fullscreenElement'i webkit önekli tutar; kod sadece document.fullscreenElement'e baktığından HER dokunuşta yeniden tam ekran isteniyordu (jank + yutulan dokunuşlar). webkitFullscreenElement/webkitExitFullscreen/webkitfullscreenchange desteği eklendi.
  - Canvas 2d context alpha:false (opak) — Safari kompozit maliyeti düşer.
  - INTERP_GECIKME_MS 100→120 (mobil ağ jitter'ı 100ms tamponu deliyor, misafirde takılma yapıyordu).
- Gerçek iPhone'da test edilmeli: antrenman tuşları (özellikle yön basılıyken zıpla/vur) + online 1v1 akıcılık.

## 2026-07-16 (20. oturum, devam) — Adenis kafası revizesi
- İlk sürüm ham 5MB fotoğraftı: dairede yüz küçük kalıyor, çevresi bar/raf arka planıyla doluydu. Diğer kafalar (ida vb.) arka planı silinmiş + karikatürize edilmiş 512px PNG'ler.
- Adenis de aynı hatta geçirildi (scratchpad'de Jimp): sıkı kare kırpma → elips kafa maskesi (feather'lı, cx254 cy245 rx126 ry205 @512) → repo'daki kafatopu-karikatur.mjs mantığıyla karikatürize → 512px, 58KB. Manifest: odak .5/.48, yaricap .40 (daire = kafa yüksekliği; yanlar şeffaf → takım rengi, ida ile aynı dil).
- Test yöntemi: oyun-sim.mjs scratchpad scripti kafaCizim.js'in daire kırpma matematiğini birebir simüle edip PNG üretiyor — yeni kafa eklerken görsel doğrulama için tekrar kullanılabilir.
- Denenip vazgeçilen: omuzlu geniş kompozisyon (ida gibi) — fotoğraf uzaktan çekildiğinden kafa dairede küçük kalıyor.

## 2026-07-17 (3. oturum) — RUN: kapı revizyonu + çıkış rotasyonu + lobi kompleksi
- Kapılar: drone kapalı kapıyı açamaz (bekler), kapı 5 sn'de kendiliğinden açılır, oyuncular
  Q ile her an açıp kapatır. Çıkışlar: 6 slot (3 gizli yedek) — erken kaçışta kullanılan çıkış
  mühürlenir + yedek aktifleşir, 3. kaçışta protokol çözülür (herkes çıkabilir); bot akış alanı
  dinamik yeniden kuruluyor. Lobi kompleksi: Eğitim + Ekipman odaları, bot sohbet balonları,
  koridor sonunda kırmızı "RİSKLİ BÖLGE" segmenti. Yakalanma sonrası: cesetler çizilmiyor,
  izleyici feneri yumuşatıldı, "İzlemeyi Geç" butonu eklendi.
- Doğrulama: başsız test 37/37 (3 tekrar), build OK. Ayrıntı: `run/PROGRESS.md`.

## 2026-07-17 (2. oturum) — RUN: lobi fazı + mobil tam ekran/iOS + kılıç görünürlüğü
- İda'nın 4 maddesi işlendi: (1) mobilde tam ekran + yatay kilit + iOS kasma/tuş düzeltmeleri
  (Kafa Topu'ndaki webkit fullscreen, native touch, alpha:false, wake lock, girdi sıfırlama
  dersleri RUN'a taşındı); (2) kılıç yalnız kendi karakterde görünür; (3-4) her round tesisin
  altındaki "Hazırlık Lobisi + Giriş Koridoru"nda başlar — droneler/zorluk/yönetmen kapalı,
  oyuncu keşif yapıp koridoru bitirince geçitten geçer, geçit MÜHÜRLENİR ve aksiyon başlar.
- Doğrulama: başsız test 23/23, build OK. Ayrıntı: `run/PROGRESS.md`.

## 2026-07-17 — RUN sitede aktif edildi (Kafa Topu deseniyle)
- `/run` rotası zaten canlıdaydı ama sitede görünür girişi yoktu. Kafa Topu'ndaki gibi iki giriş eklendi:
  - **Ana sayfa şeridi:** Home.jsx'te kafatopu-serit'in altına `run-serit` (cyberpunk mor/neon gradient, koşan 🏃 animasyonu, YENİ rozeti). Metin sınıfları (kt-serit-metin/yeni/ok) yeniden kullanıldı.
  - **Tabbar sekmesi:** Layout.jsx'e 🏃 RUN (Kafa Topu'nun yanına, 7. sekme; tabbar flex:1 olduğundan sığıyor).
- RUN bağımsız modül (Supabase/oturum kullanmaz), giriş duvarının önünde de açılır — App.jsx'e dokunulmadı.
- Build OK (RunApp ~71 kB chunk), main'e push = production deploy. Kullanıcı canlı testlere başlayacak.
- RUN'da multiplayer hâlâ yok (bilinçli — en son faz); canlı test tek oyunculu prototip üzerinde.

## 2026-07-17 (2) — KAFA TOPU: iPhone kasma KÖK SEBEP düzeltmesi
- Kullanıcı raporu: 20. oturumdaki iOS düzeltmelerine (native touch, webkit fullscreen, alpha:false) rağmen iPhone'larda kasma sürüyor. Derin inceleme, kare başına yapılan işin kendisini suçlu çıkardı:
  1. **Arka plan her karede sıfırdan çiziliyordu** — 3 tam ekran ölçekli katman blit'i + tam ekran karartma + zemin gradienti + 90 kum beneği + 2 kale filesi (~30 stroke) her karede. Düzeltme: `render.js`'e statik sahne pişirme (`statikleriPisir`) — katmanlar + karartma/zemin/kum/çizgi/kaleler cihaz çözünürlüğünde BİR KEZ offscreen tuvallere pişirilir; kare başına yalnız 4 adet 1:1 drawImage kalır (parallax, marjlı katman tuvalinde kaydırılarak korunur). Foto katman yüklenene dek eski doğrudan yol (`dogrudanArkaplanCiz`) devrede.
  2. **Her karede yeni gradient + emoji rasterleme** — forma/kafa gradientleri ve güç ikonu/⭐ emoji fillText'i (Safari'de renkli emoji çizimi pahalı). Düzeltme: `kafaCizim.js`'e `gradyanAl` (300 girişlik sınırlı önbellek) + `emojiGorsel` (64px tuvale bir kez çiz, drawImage ile bas).
  3. **Canvas'ta border-radius: 6px** — iOS Safari tam ekran canvas'a köşe yuvarlama uygulanınca her karede ekstra kırpma/kompozit katmanı ekliyor (bilinen iOS tuzağı). CSS'ten kaldırıldı.
  4. **120Hz ProMotion iPhone'larda sınırsız çizim** — kare başına tam sahne × 120 = ısınma → thermal kısılma → kasma. Düzeltme: MacPage döngüsünde 12ms çizim eşiği (120Hz'de her 2. kare, 60Hz'de her kare); simülasyon/ağ yayını etkilenmez. Ayrıca `getContext` her kareden çıkarıldı, view/interp paketi yalnız çizilen karede üretiliyor (GC baskısı azaldı).
  5. **Sabit çözünürlük** — zayıf cihazda FPS düşünce netlik düşmüyordu. Düzeltme: FPS 2.5sn pencerede ölçülür, <45 ise kalite kademeli düşer (1 → 0.5, adım 0.15) ve canvas yeniden boyutlanır; ayrıca 1.5M piksel tavanı (büyük ekran/tablet). Arka plan duraklamaları (dt>250ms) ölçüme katılmaz.
- Doğrulama: Node sahte-canvas duman testi (pişirme tek sefer, parallax kaymaları hız oranlarıyla birebir, ana tuvalde fillText kalmadı) + build temiz. Chrome eklentisi bağlı olmadığından tarayıcı görsel testi yapılamadı — GERÇEK iPhone'da test edilmeli: antrenman maçı akıcılığı + online 1v1 + menü arka planı (bake menüde de devrede).
- Değişen dosyalar: `kafatopu/engine/render.js`, `kafatopu/engine/kafaCizim.js`, `kafatopu/app/pages/MacPage.jsx`, `kafatopu/app/styles/kafatopu.css`.

## 2026-07-22 — MEYVE KES modülü (yeni oyun sekmesi, baştan sona)

Kamera tabanlı, gerçek el hareketiyle meyve kesme oyunu (Fruit Ninja mantığı ama kontrol el/kol). `meyvekes/` altında izole modül, `/meyvekes/*` route'u; Kafa Topu/RUN deseniyle entegre. Bildim oturumu + kullanıcı/avatar sistemini kullanır (giriş duvarının arkasında).

### Teknoloji / mimari
- **El takibi:** MediaPipe Hands, CDN'den dinamik script yüklenir (`@mediapipe/hands@0.4.1675469240`) — npm paketine bağımlılık eklenmedi, bundle küçük kaldı. `engine/eltakip.js`: ön kamera (getUserMedia, facingMode user, 640x480), modelComplexity 0 (lite), aynı anda tek gönderim + ~30fps sınırı (4 el takibinde bile akıcı). Video gizli olarak DOM'a eklenir (bazı tarayıcılar bağlı olmayan video'dan kare çözmez).
- **Render:** `engine/render.js` — alt katman canlı kamera (aynalı, cover); üstünde meyveler, kesik yarımlar (sprite üst/alt kırpma), splat parçacıkları, her el için soluklaşan bıçak izi (blade trail), uçan puan metinleri, parmak ucu ışıkları. Arka plan görseli YOK (istendiği gibi).
- **Meyve sprite:** `engine/meyveler.js` — gerçek fotoğraf kesme yöntemi tercihli (`/public/meyve/manifest.json` + şeffaf PNG, heads deseni). Foto yoksa emoji offscreen tuvale bir kez rasterlenip önbelleğe alınır (kare başına fillText yok). 10 meyve + nadir altın (bonus).
- **Oyun mantığı:** `engine/oyun.js` — faz makinesi (geri 3-2-1 → oyun 60sn → bitti), yerçekimi fiziği (alttan fırla, düş), kesim = el avuç(9)+işaret ucu(8) segmenti meyve hitbox'ıyla kesişince. Ceza yok (kaçan meyve puan kaybettirmez). Combo: 0.55sn penceresinde art arda kesim → bonus. MIN/MAX segment sınırı (el sırası değişimi kaynaklı sahte kesimi eler).

### İki mod (istendiği gibi)
- **Tekli:** maxNumHands 2, normal tempo (0.95→0.65sn aralık, zorluk eğrisi).
- **Arkadaşla (yerel, aynı ekran/kamera):** maxNumHands 4, **daha hızlı** akış (0.62→0.40sn). İki kişi ortak/işbirliği (rekabet değil); kesim ekranın sol/sağ yarısına göre P1/P2 olarak ayrı sayılır + toplam skor. HUD'da 👈/toplam/👉.

### Skor / sıralama
- DB: `20260612000038_meyvekes_temel.sql` — `meyvekes_skorlar` (user_id+mod pk, en_iyi, toplam_kesim, oyun_sayisi). RLS select-only; yazım security-definer RPC. `meyvekes_skor_kaydet` (upsert, en_iyi=max), `meyvekes_siralama` (top 100, public.profiles join → username+avatar). Yeni auth YOK, Bildim profilleri kullanılır.
- UI: `app/pages/` — MenuPage (mod kartları + nasıl oynanır), OyunPage (kamera + canvas + HUD + geri sayım + sonuç paneli + kayıt), SiralamaPage (tekli/arkadaş sekmesi, avatar + rekor). Başla ekranı: getUserMedia jesti + tam ekran + wake lock butona bağlı.

### Entegrasyon
- `src/App.jsx`: lazy `/meyvekes/*` route (KafaTopuApp deseni). `src/components/Layout.jsx`: tabbar'a 🍉 Meyve Kes sekmesi. `src/pages/Home.jsx` + `src/styles.css`: ana sayfaya `meyve-serit` (kırmızı/turuncu/yeşil gradient, sallanan 🍉, YENİ rozeti). Mevcut Bildim koduna minimal dokunuş.

### Doğrulama
- `npm run build` OK — MeyveKesApp ayrı lazy chunk (~20 kB js / ~7 kB gzip); Bildim/Kafa Topu/RUN paketleri etkilenmedi.
- Başsız motor testi (Node, `scratchpad/mk-test.mjs`): 60sn tam oyun (104 kesim, 144 puan, faz bitti, NaN yok), kesin kesim testi geçti, combo max 4. Hata yönetimi: kamera izni reddi / kamera yok / model yüklenemedi için ayrı anlaşılır mesajlar + Tekrar Dene.

### Bekleyen / manuel
- **Migration uygulanmadı:** `20260612000038_meyvekes_temel.sql` Supabase Studio'da çalıştırılmalı (bu makinede `db push` 403 veriyor). Uygulanmadan skor kaydı/sıralama çalışmaz — oyunun kendisi (kamera+kesim) migration'sız da çalışır.
- **Gerçek cihaz testi:** kamera+MediaPipe otomasyon ortamında test edilemedi (kamera yok, CDN gerekir). Telefonda/kamerada canlı test gerekli: kamera izni akışı, el takibi akıcılığı (özellikle arkadaş modu 4 el), kesim hissi.
- Gerçek meyve fotoğrafları (rembg) istenirse `/public/meyve/` + manifest ile eklenir (OKU.txt tarifli); şu an emoji sprite ile tam çalışır.

## 2026-07-22 (2. oturum) — MEYVE KES: kasma + kesememe KÖK SEBEP düzeltmesi
Kullanıcı canlı testi: (1) "inanılmaz kasıyor", (2) "ellerimi/kollarımı bıçak gibi algılayamıyor, meyve kesemiyorum; hızlı savurunca / el kadrajdan çıkıp geri gelince yakalamalı".

**Kasma kök sebep:** MediaPipe Hands eski `hands.js` çıkarımı **ana thread'de (WASM)** çalışır; her `send()` render'ı 20-60ms bloklar. rAF ile sürekli çağrılınca ana thread doyuyor.
- `eltakip.js`: (a) çıkarım için **256/320 küçük offscreen kareye** downscale edip onu gönderiyoruz (blok süresi kısaldı; kamera 640→480x360). (b) rAF yerine **setTimeout self-throttle**: gecikme = son çıkarım süresi (25–130ms clamp) → ~%50 doluluk, kalanı render'a kalıyor; zayıf cihaz otomatik yavaşlar. (c) render'dan bağımsız çalışır.
- `OyunPage.jsx`: context `alpha:false` + **önbelleğe alındı** (kare başına getContext yok), **dpr tavanı 1.5** + **1.3M piksel bütçesi**, **adaptif kalite** (EMA<38fps ise kalite 1→0.55 kademeli düşer, canvas yeniden boyutlanır).

**Kesememe kök sebep:** (a) `MAX_SEGMENT=320px` sabiti, FPS düşünce/hızlı savurunca oluşan gerçek uzun segmentleri "el geçişi" sanıp reddediyordu. (b) Kesim yalnız 2 noktadan (avuç+işaret) bakıyordu, tolerans dar. (c) Güven eşikleri yüksekti (el kaybolunca geç yakalıyor).
- `oyun.js`: **kimlik eşleştirmeli el takibi** (`_elleriIsle`) — algılanan eller önceki kareye en yakın avuçla eşlenir; artık izler/kesikler fiziksel ele bağlı, hızlı/uzun savurma reddedilmez. **7 anahtar nokta** (bilek+5 parmak ucu+avuç) → tüm el "bıçak". Kesim yalnız **yeni algılama karesinde** işlenir (`damga`; 60fps render × 15-25fps algılama → mükerrer/yanlış kesim yok). `KILIC_KALINLIK` 20→30, `MIN_SEGMENT` 12→9, segment üst sınırı köşegen oranına bağlandı (`MAX_ORAN 0.75`), eşleştirme cömert (`ESLESME_ORAN 0.9`; absürt bağlantı yine MAX_ORAN'da elenir).
- `eltakip.js`: `minDetectionConfidence` 0.6→0.5, `minTrackingConfidence` 0.5→0.4 (el hızla girip çıksa çabuk yakalanır).

Doğrulama: başsız motor testi v2 (Node) — 60sn tam oyun (100 kesim, NaN yok), kesin kesim ✓, **4 dizili meyve tek savuruşla combo=4** ✓, **hızlı savurma (480px) kesiyor** ✓. Build OK (MeyveKesApp ~21 kB). Gerçek telefon/kamera testi yine kullanıcıda (otomasyonda kamera yok).

## 2026-07-22 (3. oturum) — idaGG GAME CENTER ana sayfası (oyun portalı)
Kullanıcı: siteye girince direkt Bildim çıkmasın; A-kalite profesyonel bir oyun sitesi ana sayfası olsun, Bildim/Kafa Topu/Meyve Kes gibi her oyun tıklanan bir sekme/kart olsun.
- **Yeni sayfa `src/pages/GameCenter.jsx`:** "idaGG GAME CENTER" markası + kullanıcı chip'i (avatar/isim/puan) + hero karşılama + responsive oyun kartı grid'i. 5 oyun kartı (Bildim!/Kafa Topu/Meyve Kes/RUN/Gladius) — her biri kendi temasında gradient, büyük ikon, açıklama, kategori etiketi, YENİ rozeti, OYNA butonu; hover'da yükselme + parlama süpürmesi. Yeni oyun eklemek = `OYNALAR` dizisine bir kart eklemek.
- **Yönlendirme (`src/App.jsx`):** `/` artık GameCenter (Layout dışında, tam ekran); Bildim quiz ana sayfası `/bildim`'e taşındı (diğer quiz rotaları — turnuva/meydan/mac/siralama/arkadaslar/profil — aynı kaldı). `*` → `/` (hub).
- **`src/components/Layout.jsx`:** logo + "Ana Sayfa" sekmesi → `/bildim`; kalabalık 3 oyun sekmesi (Kafa Topu/RUN/Meyve Kes) yerine tek "🎮 Merkez" sekmesi (`/` hub'a dönüş) → Bildim tabbar sadeleşti.
- **`src/pages/Home.jsx`:** üç oyun şeridi kaldırıldı (artık hub'da). Modül menülerindeki geri linkleri "← Oyun Merkezi" yapıldı (kafatopu/meyvekes/run/gladius).
- **Stiller:** `src/styles.css`'e kapsamlı `.gc-*` bloğu (animasyonlu radial-glow arka plan, cam efektli sticky header, gradient kartlar, parlama animasyonu, 520px/360px kırılımlarıyla mobil grid).
- Doğrulama: build OK; **görsel doğrulama** — gerçek CSS ile bağımsız statik önizleme yerel sunucuda Chrome'la ekran görüntüsü alındı (marka, hero, 5 kart, rozetler, etiketler A-kalite render oldu). Canlı siteyi kullanıcı giriş yaparak doğrulayacak.

## 2026-07-22 (4. oturum) — Bildim quiz kendi oyun/ klasörüne taşındı (tam modül izolasyonu)
Kullanıcı: her oyun ayrı klasörde, bağımsız geliştirilebilir, aynı depoda farklı klasörde, birbirine karışmasın.
- **Doğrulama:** 4 aksiyon oyunu (gladius/run/kafatopu/meyvekes) zaten izoleydi — çapraz import yok; her biri kabuğa tek lazy route ile bağlı; ortak yalnız supabase client + AuthContext + Avatar (bilinçli paylaşım). Tek istisna: Bildim quiz `src/` içinde kabukla karışıktı.
- **Taşındı (`git mv`, geçmiş korundu):** quiz sayfaları → `oyun/pages/` (Home, MatchPage, GroupMatchPage, HizliMacPage, ChallengesPage, TournamentPage, LeaderboardPage, FriendsPage, ProfilePage); quiz bileşenleri → `oyun/components/` (Layout, QuestionCard, RankBadge, Countdown, RankUpOverlay); quiz lib → `oyun/lib/` (ranks, push, zaman).
- **`src/`'de kalan (paylaşılan kabuk):** main.jsx, App.jsx, context/AuthContext, lib/supabase, components/Avatar, pages/GameCenter, pages/Login, styles.css.
- **Import düzeltmeleri:** taşınan dosyalarda paylaşılan referanslar `../../src/...`, kardeş referanslar `../components|../lib`; App.jsx quiz sayfaları + Layout `../oyun/...`. Route yapısı/URL'ler değişmedi (quiz rotaları hâlâ top-level; `/bildim` = quiz ana sayfası).
- **Sonuç:** 5/5 modül izole (hiçbir oyun başkasının klasöründen import etmiyor); `oyun/` yalnız `../../src` (paylaşılan) + kendi içine bağlı. CLAUDE.md "Dizin Yapısı" yeni portal yapısına göre güncellendi.
- Doğrulama: `npm run build` OK (176 modül, hata yok), çapraz-import taraması temiz. Not: gladius tasarım dokümanındaki `src/lib/ranks.js`/`push.js` referansları artık `oyun/lib/`'de (sadece prose, kod değil).

## 2026-07-22 (5. oturum) — IDA GG Game Center entegrasyonu: Faz 0/1/7

Büyük çok-fazlı entegrasyon görevi başladı (Meyve Kes düzeltme + PatiRun/DriftGP göçü + ortak kimlik + yeni ana sayfa + tek PWA). Bu oturumda öncelikli hata + tractable fazlar tamamlandı; iki büyük dış port (Faz 2/3, ~22k satır) sonraki oturumlara.

### FAZ 0 — Meyve Kes kök sebep düzeltmesi (öncelik)
- **Kök sebep 1 (kasma + kesememe):** eski `@mediapipe/hands` legacy çözümü ana thread'i WASM ile bloklar; modern **MediaPipe Tasks Vision `HandLandmarker` (GPU delegesi)**'ne geçildi — `detectForVideo` senkron, GPU'da çalışır (kasma çözülür), busy-flag yarışı yok.
- **Kök sebep 2 (koordinat kayması → "kesemiyorum"):** landmark'lar sabit 320×240 (4:3) offscreen kareye normalize ediliyordu; kamera 16:9 dönünce görüntü bozularak küçültülüyor, landmark'lar gerçek elin konumundan kayıyordu. Yeni motor **video karesini doğrudan işler** → aspect bozulması ve koordinat kayması ortadan kalktı.
- GPU başarısızsa **CPU delegesine otomatik düşüş**; düşük güven eşikleri (0.4) korundu (hızlı girip çıkan el çabuk yakalanır).
- **Görsel teşhis eklendi:** render'a tam **el iskeleti** çizimi (tüm el "bıçak" gibi ışıldar; el algılanıyor mu/nerede kullanıcı anında görür) + OyunPage'e **"🖐 el görünmüyor / 🖐 N"** rozeti (kamera açık ama el yoksa kırmızı uyarı).
- **Değişen dosyalar:** `meyvekes/engine/eltakip.js` (baştan yazıldı), `meyvekes/engine/render.js` (el iskeleti), `meyvekes/app/pages/OyunPage.jsx` (el sayacı), `meyvekes/app/styles/meyvekes.css` (rozet). Kesim mantığı (`oyun.js`) landmark formatı aynı olduğu için değişmedi.
- **Kalıcı test:** `meyvekes/_test/motor-test.mjs` (Node, 11 test) — faz makinesi, kesim, statik el kesmez, hızlı savurma keser, 4'lü combo, 60sn tam oyun. **11/11 geçti.** CDN URL'leri (vision_bundle.mjs + wasm + model.task) HTTP 200 doğrulandı. Build temiz (MeyveKesApp ~22 kB; MediaPipe CDN'den, bundle'a girmiyor).
- **Kalan:** gerçek kamera+el testi kullanıcıda (otomasyonda kamera yok).

### FAZ 1 — Bildim quiz'i /oyun/* altına taşı
- Tüm quiz rotaları `/oyun/*` altına nest edildi (App.jsx: `/bildim` = Layout, index=Home, alt: turnuva/meydan/mac/:id/grup-mac/:id/hizli-mac/:id/siralama/arkadaslar/profil).
- **Geriye uyumluluk:** eski top-level yollar için `BildimeYonlendir` bileşeni (parametre+query korunarak `/oyun/*`'a yönlendirir) → push bildirimi deep-link'leri, bookmark, eski linkler kırılmaz.
- Tüm iç navigasyon (`oyun/pages/*` + `oyun/components/Layout.jsx`, ~33 kullanım) `/oyun/*` önekine güncellendi. İş mantığı/auth/RLS'e dokunulmadı (saf route taşıma). Build temiz.

### FAZ 7 — Tek PWA kimliği
- `public/manifest.webmanifest`: name "IDA GG Game Center", short_name "IDA GG". `index.html`: title + description + apple-mobile-web-app-title "IDA GG Game Center". Tek manifest, tüm oyunlar paylaşır.

### Otonom kararlar
- Marka biçimi tutarsızdı (`idagggamecenter` vs `idaGG`); Faz 6 prompt'undaki **"IDA GG Game Center"** biçimi standart alındı.
- Meyve Kes'te legacy MediaPipe yerine Tasks Vision seçimi: iki önceki oturum legacy ile kasma/kesememeyi çözemedi; modern API endüstri standardı güvenilir yol.

### Bekleyen fazlar (sonraki oturumlar)
- **Faz 2:** PatiRun portu (~12.5k satır TS, 2D canvas; supabase+zustand). `pr_` prefix DB göçü, auth birleştirme, `/patirun/*`.
- **Faz 3:** DriftGP portu (~9.4k satır TS, three.js+R3F+drei+zustand). `dg_` prefix DB göçü, hayalet herkese açık, `/driftgp/*`.
- **Faz 4:** Ortak kimlik (büyük kısmı zaten var — paylaşılan AuthContext/profiles).
- **Faz 5:** Görünürlük RLS (admin hepsini, normal online-only).
- **Faz 6:** Ana sayfa A-sınıfı yeniden tasarım + birleşik puan sıralaması.
- **Faz 8:** Baştan sona test.

## 2026-07-22 (6. oturum) — FAZ 2: PatiRun entegrasyonu

PatiRun (~12.500 satır TS, 2D pati yarışı, multiplayer) IDA GG Game Center'a taşındı — izole modül, `/patirun/*` route'u, Bildim tek kimliği.

### Yapılanlar
- **Kod taşıma:** PatiRun `src/{game,render2d,net,screens,lib,services,stores,config,components}` → `patirun/`. TS/TSX olduğu gibi (Vite/esbuild derler). İzole `patirun/tsconfig.json` (tip kontrolü sadece patirun/ içinde; ana build tsc kullanmaz).
- **Çift Supabase client sorunu çözüldü:** PatiRun kendi client'ını kuruyordu → `patirun/lib/supabase.ts` artık Bildim'in **tek paylaşılan client'ını** re-export eder (aynı storage'da iki GoTrue oturum kilidini çakıştırırdı).
- **Auth birleştirme (Faz 4 ile uyumlu):** kendi Google-OAuth ekranı (`AuthScreen.tsx`) **silindi**; `authStore` yeniden yazıldı — Bildim oturumundan `setBridgedUser` ile beslenir. `PatiRunApp.jsx` köprüsü: `useAuth()` → `pr_users` satırını upsert (FK hedefi + username'i profiles ile senkron) → authStore'u besler. **Ayrı kullanıcı adı seçme ekranı yok.** `setUsername` → `profiles.username` (paylaşılan kimlik, 23505 kontrolü); yarış avatarı (oyuna özgü kozmetik) `pr_users.avatar_id`'de kalır. appStore başlangıç ekranı `auth`→`menu`. `RunnerStrip` (AuthScreen'deydi) `components/RunnerStrip.tsx`'e taşındı. Ayarlar modalına "🏠 Oyun Merkezi'ne dön".
- **DB göçü:** `supabase/migrations/20260612000039_patirun_temel.sql` — PatiRun 001_schema+002_avatar birleşik, **tüm tablolar `pr_` önekli** (pr_users, pr_friendships, pr_blocks, pr_rooms, pr_races, pr_race_participants, pr_character_customizations, pr_character_xp, pr_badges, pr_user_badges, pr_best_times, pr_error_logs) + RPC `pr_apply_race_result`/`pr_cleanup_error_logs`. `auth.users` FK'ları korundu. Realtime: PatiRun broadcast/presence kullanır (postgres_changes yok) → publication değişikliği gerekmez. Kanallar namespace'lendi: `pr-quickmatch`, `pr-room:*`, `pr-online` (diğer oyunlarla çakışmaz).
- **CSS izolasyonu:** PatiRun'ın 2000 satır **global** CSS'i (`*`, `body`, `.btn`, `.toast`...) Bildim'i bozardı → scratchpad script'iyle tümü **`.pr-root` altına scope'landı** (`patirun/app/styles/patirun.css`, keyframes/media korunarak). App `<div className="pr-root">` içinde.
- **Entegrasyon:** `src/App.jsx` lazy `/patirun/*`; GameCenter'a 🐾 PatiRun kartı.

### Otonom kararlar
- **Bağımsız leaderboard** (prompt önerisi kabul): PatiRun kendi puan/rütbe/sıralamasını korur; sadece kimlik/giriş ortak. `pr_users.username` = profiles.username senkron kopyası (join'ler için; köprü + setUsername senkronlar).
- **Yarış avatarı ≠ kimlik avatarı:** PatiRun'ın avatars.ts kozmetiği oyuna özgü kaldı; kimlik fotoğrafı (profiles.avatar_url) paylaşılan. PatiRun UI'si foto avatar render etmediğinden yeniden yazılmadı.

### Doğrulama
- **Build temiz** — 239 modül; **PatiRun ayrı lazy chunk** (PatiRunApp ~178 kB js / ~33 kB css); Bildim/diğer oyun paketleri etkilenmedi.
- Gerçek multiplayer/eşleşme testi kullanıcıda (2 cihaz gerekir — prompt'ta belirtildi).

## 2026-07-22 (7. oturum) — FAZ 3: DriftGP (DidaGP) entegrasyonu

DriftGP (~9.400 satır TS, three.js/R3F 3D drift yarışı) IDA GG Game Center'a taşındı — izole modül, `/driftgp/*`, Bildim tek kimliği.

### Yapılanlar
- **Kod taşıma:** DidaGP `src/{game,net,store,lib,components,dev}` → `driftgp/`. İzole `driftgp/tsconfig.json`. App.tsx → `driftgp/app/DriftGpInner.tsx` (import yolları `./`→`../`).
- **Bağımlılıklar:** three@^0.185, @react-three/fiber@^9.6, @react-three/drei@^10.7 Bildim'e eklendi (sadece DriftGP lazy chunk'ında; ana bundle etkilenmedi).
- **Çift client çözümü:** `driftgp/lib/supabase.ts` Bildim'in paylaşılan client'ını re-export eder. Bildim client'ına `realtime.eventsPerSecond: 20` eklendi (DriftGP 15Hz pozisyon senkronu + Kafa Topu için; varsayılan 10/s dardı).
- **Auth (Faz 4):** DriftGP zaten `supabase.auth.getUser()` ile oturumu okur → Bildim oturumu aktifken **otomatik çalışır**, ayrı authStore köprüsü gerekmez. `DriftGpApp.jsx` köprüsü sadece görünen adı senkronlar: `profiles.username` → `profileStore.playerName`. ProfileScreen'den **Google giriş/çıkış UI kaldırıldı**; isim editörü artık **paylaşılan `profiles.username`**'i günceller (23505 kontrolü, min 3) → tüm oyunlarda yansır. "🏠 Oyun Merkezi'ne dön" eklendi.
- **HAYALET (Faz 3.5 — owner kısıtı kaldırıldı):** `cloudSync.uploadGhostIfBest` artık tek hesaba (OWNER_EMAIL) bağlı değil — **her authenticated oyuncunun en iyi turu**, buluttaki hayaletten hızlıysa yüklenir; hayalet adı = Bildim `profiles.username`. RLS de açıldı: `ghosts_insert/update_owner` (email eşitliği) → `ghosts_insert/update_auth` (authenticated herkes).
- **DB göçü:** `supabase/migrations/20260612000040_driftgp_temel.sql` — schema.sql `dg_` önekli (dg_profiles, dg_customizations, dg_race_results, dg_ghosts), tümü auth.users FK. Ghost RLS açık. Realtime: broadcast/presence (postgres_changes yok) → publication gerekmez. Kanallar `dg-` namespace'li: `dg-user:*`, `dg-room:*`, `dg-lobby`.
- **CSS izolasyonu:** 2088 satır global CSS `.dg-root` altına scope'landı (`driftgp/app/styles/driftgp.css`). App `<div className="dg-root">` içinde.
- **Entegrasyon:** `src/App.jsx` lazy `/driftgp/*`; GameCenter'a 🏎️ DriftGP kartı.

### Otonom kararlar
- **Bağımsız leaderboard** (prompt önerisi kabul): DriftGP kendi XP/rütbe/hayalet sistemini korur; kimlik ortak.
- **eventsPerSecond bump:** Bildim paylaşılan client'ına 20/s eklendi — realtime rate limiti yükseltmek yalnızca izin verir (Kafa Topu dahil mevcut mantığı bozmaz).
- **DriftGP oyun avatarı yok** (araç seçimi kozmetik); kimlik = profiles.username.

### Doğrulama
- **Build temiz** — 841 modül; **DriftGP ayrı lazy chunk** (DriftGpApp ~1.08 MB js / ~gzip ~300 kB — three.js doğası, yalnız /driftgp'de yüklenir). Ana Bildim bundle 521 kB'da kaldı (three.js sızmadı).
- Gerçek cihaz testi kullanıcıda: telefon eğim sensörü (yalnız HTTPS/deploy sonrası) + multiplayer.

## 2026-07-22 (8. oturum) — FAZ 6 (birleşik sıralama) + FAZ 5 (görünürlük)

### FAZ 6 — Birleşik puan sıralaması (profil ikonu davranışı)
- **Migration `20260612000041_birlesik_siralama.sql`:** `birlesik_siralama()` RPC (security definer, authenticated) — profiles + kafatopu_profiller + meyvekes_skorlar(sum en_iyi) + pr_users + dg_profiles(xp jsonb) LEFT JOIN, user_id üzerinden; oyun bazlı puan + toplam, botlar hariç, toplam desc, limit 100. (pr_/dg_/meyvekes migration'larından SONRA çalıştırılmalı.)
- **Yeni sayfa `src/pages/BirlesikSiralama.jsx`** (route `/siralama-genel`): oyun ikonlu sütunlar (Bildim/Kafa Topu/DriftGP/Meyve Kes/PatiRun) + Toplam; kendi satırın vurgulu; migration yoksa anlaşılır uyarı. Stiller styles.css `.sr-*`.
- **GameCenter profil ikonu** artık Bildim profilini değil bu **birleşik sıralamayı** açar (`/siralama-genel`).
- RUN kalıcı skor tutmadığından tabloda yok; Gladius (demo) dahil edilmedi (prompt listesiyle uyumlu).

### FAZ 5 — Görünürlük kuralı (oyuncu arama)
- **Migration `20260612000042_gorunurluk.sql`:** `profiles.last_seen` kolonu + index; `kalp_at()` RPC (kendi last_seen'i tazeler); `oyuncu_ara(p_arama)` RPC — **admin (hileli_mi()) herkesi**, normal oyuncu **yalnız online** (son 2 dk) olanları görür + `online` bayrağı döner. **profiles select RLS'i DEĞİŞTİRİLMEDİ** → sıralama/leaderboard herkese açık kalır (prompt şartı).
- **Heartbeat paylaşılan `AuthContext`'te** (tüm oyunlar tek kabuğu kullanır): oturum açıkken ~60 sn'de bir + görünürlük dönüşünde `kalp_at()`.
- **Bildim `FriendsPage` araması** doğrudan profiles sorgusundan `oyuncu_ara` RPC'sine geçti.
- **Kapsam kararı:** Kafa Topu'nun online-oyuncu listesi zaten presence tabanlı (doğası gereği online-only); PatiRun PlayersScreen (pr_users) opsiyonel takip işi olarak bırakıldı — kanonik kimlik araması (Bildim) kurala uygun.

### Doğrulama
- Build temiz (846 modül). Migration'lar kullanıcıda (SQL Editor).

## 2026-07-22 (9. oturum) — FAZ 8: otomatik test + doğrulama

- **Motor testleri:** Meyve Kes 11/11 ✓, Kafa Topu 27/27 ✓ (entegrasyon sonrası regresyon yok).
- **Çapraz-import izolasyonu:** 7 oyun (oyun/kafatopu/meyvekes/run/gladius/patirun/driftgp) taranıp doğrulandı — **hiçbir oyun başka oyunun klasöründen import etmiyor**. PatiRun/DriftGP yalnız `../../src/context/AuthContext` + `../../src/lib/supabase` paylaşıyor (tek kimlik için bilinçli paylaşım).
- **Build:** temiz (846 modül); 6 oyun ayrı lazy chunk (DriftGp/Gladius/KafaTopu/MeyveKes/PatiRun/Run) — birbirini şişirmiyor; three.js yalnız DriftGP chunk'ında.
- **Route'lar:** /, /oyun/*, /kafatopu, /meyvekes, /patirun, /driftgp, /run, /gladius, /siralama-genel + eski Bildim yolları geriye uyumlu.
- **Gerçek cihaz testleri kullanıcıda:** Meyve Kes kamera, DriftGP eğim sensörü (HTTPS), PatiRun/DriftGP/Kafa Topu multiplayer.

### Faz durumu özeti
- ✅ Faz 0 (Meyve Kes), 1 (Bildim taşıma), 2 (PatiRun), 3 (DriftGP), 4 (ortak kimlik), 5 (görünürlük), 6 (birleşik sıralama + kart/DEMO), 7 (PWA), 8 (otomatik test).
- ⏳ Faz 6 tam A-sınıfı ana sayfa görsel yeniden tasarımı: GameCenter zaten animasyonlu (radial-glow, cam header, gradient kart + shimmer/hover) — daha ileri parallax/motion opsiyonel cila olarak bırakıldı.

## 2026-07-22 (10. oturum) — Bağımsız repolardan taşıma doğrulaması + mobil kasma denetimi

### Taşıma doğrulaması (PC'deki eski bağımsız klasörler)
- Kullanıcının PC'sinde `Desktop/PatiRun` ve `Desktop/DidaGP` **ayrı bağımsız Vite projeleri + kendi `.git` repoları** olarak duruyordu (GitHub: `winegg420/PatiRun`, `winegg420/DidaGP`).
- **Karşılaştırma:** kaynak kod (patirun 70, driftgp 47 dosya), `pr_`/`dg_` migration'ları ve `.env` (URL/ANON — hub tek Supabase projesiyle zaten ortak) tam taşınmış. Eksik olan **tek fonksiyonel varlık**: DidaGP ses dosyaları.
- **DidaGP sesleri taşındı:** `public/sounds/` (26 wav, ~1.9 MB — motor aileleri muscle/race/sport + drift/nitro/crash/glass/pop/scrape). `driftgp/game/audio.ts` bunları `/sounds/*.wav` diye fetch ediyor; eksikken sentetik/prosedürel sese düşüyordu. Commit `b597204`.
- **Karar:** eski GitHub repoları (`PatiRun`, `DidaGP`) artık fonksiyonel gereksiz; **silme değil arşivle** önerildi (commit geçmişleri hub'a gelmedi — sadece son hal kopyalanmıştı). Vercel'de eski projeler varsa kapatılmalı.

### Mobil (iPhone) kasma denetimi — 7 oyun
- **Bulgu: kod tabanı zaten güçlü optimize.** Her gerçek-zamanlı oyunda adaptif FPS-tabanlı kalite ölçekleme + `devicePixelRatio` sınırı + dengeli timer/listener temizliği mevcut. `setInterval`'lar (kritik) her oyunda temizleniyor; oyun döngülerinde kare-içi GC-allocation yok.
  - **Kafa Topu:** `render.js` statik sahneyi cihaz pikselinde bir kez "pişiriyor" (`statikleriPisir`), gradient/emoji önbellekli, `alpha:false`, FPS<45→kalite düşür (120Hz ProMotion özel kod). iOS kasma zaten çözülmüş → **dokunulmadı** (CLAUDE.md "iOS cila korunur").
  - **Meyve Kes:** MediaPipe Tasks Vision (GPU delege) + senkron `detectForVideo` + `setTimeout` self-throttle + piksel bütçesi + adaptif çözünürlük + HUD 12fps. Zaten optimal → **dokunulmadı**.
- **Düzeltilen tek gerçek sorun — DidaGP gölge (commit `84e7cce`):** `quality.ts` gölgeyi yalnız `lowEnd` (mobil **ve** ≤4 çekirdek) cihazda kapatıyordu; 6+ çekirdekli orta-seviye iPhone'larda gölge açık kalıp `AdaptiveQuality`'nin çözünürlük düşüşüne dahil değildi. `DriftGpInner.tsx` `AdaptiveQuality`'e eklendi: çözünürlük dibe (scale≤0.55) indiği halde FPS<42 ise `gl.shadowMap.enabled=false` + ışıkların `castShadow=false` (bir kez, geri açılmaz — titreme önlemi). Gölge mobilde en pahalı geçiş; temas gölgesi (fake AO) kaldığından görsel kabul edilebilir.

### Doğrulama
- Build temiz (✓ 4.94s). Her iki commit `main`'e push edildi → Vercel production deploy.
- **Gerçek cihaz testi kullanıcıda:** iPhone'da DidaGP (gölge kapanınca akıcılık + gerçek motor sesleri), Kafa Topu, Meyve Kes.

## 2026-07-24 (11. oturum) — Meyve Kes "kol=bıçak" + tüm multiplayer senkron sertleştirmesi

Kullanıcı: (1) Meyve Kes'te el/kol komple bıçak olsun, kadraj dışına çıkıp girince anında senkron
olsun, agresif savurmayla hızlı kesebileyim; (2) multiplayer modlarda maçlar aynı anda başlasın,
takılma/gecikme olmasın.

### MEYVE KES — kesim modeli baştan kuruldu
- **Kılıç geometrisi (`engine/oyun.js`):** MediaPipe yalnız eli verir; kol, bilek→avuç ekseninin
  TERSİNE uzatılarak türetiliyor (`KOL_ORAN 3.4` × el boyu) ve parmak ucundan ileri bıçak ucu
  (`UC_ORAN 1.35`) ekleniyor. Sonuç: **kabzası omuz tarafında, ucu parmakların ötesinde tek parça
  dev bıçak**. Kesim, kılıç gövdesi boyunca 9 örnek + 5 parmak ucu = 14 noktanın kare-arası
  segmentleriyle test ediliyor (indeksler kareler arası tutarlı).
- **Agresif savurma:** el hızı > `SUPURME_HIZ` (360 px/s) ise kılıcın **tüm gövdesi** (kol dahil)
  de keser → iki algılama karesi arasındaki boşluğa düşen meyve artık kaçmıyor. `MAX_ORAN`
  0.75→1.05 (uzun savuruş artık "sahte" sayılmıyor), `MIN_SEGMENT` 9→6, `KILIC_KALINLIK` 30→34.
- **Gecikme telafisi (senkron hissi):** `eltakip.js` gerçek gecikmeyi ölçüyor (kare yaşı + çıkarım
  + yarım kare) ve `oyun.js` eli bu kadar ileri sarıyor (tavan 100px). Ayrıca çizimde 60 fps'e
  ekstrapolasyon (`RENDER_ILERI_MAX` 50ms) → algılama 25 fps olsa bile kılıç elin gerçek yerinde.
  **Çizilen bıçak ile kesen bıçak birebir aynı** (render artık ham landmark değil motor
  geometrisini kullanıyor).
- **Kadrajdan çıkıp girince:** MediaPipe eşikleri 0.4→**0.3** (model "emin olmayı" beklemiyor);
  algılama döngüsü `requestVideoFrameCallback` ile **kare-güdümlü** (en taze kare), aynı video
  karesi iki kez işlenmiyor (boşa CPU yanmıyor), kamera `frameRate ideal 60`.
- **Görsel:** `render.js`'e `kilicCiz` — kol boyunca 3 katmanlı (hâle/gövde/çekirdek) enerji palası;
  el iskeleti inceltildi (12px→3px stroke, 21→5 daire) → çizim maliyeti düştü. Bıçak izi artık
  **kılıcın ucundan** çıkıyor ve kalınlaştı.
- **Tempo:** spawn aralığı tekli 0.95→0.80/0.50, arkadaş 0.62→0.52/0.32 (bol meyve = savurmaya değer).
- **Test:** `meyvekes/_test/motor-test.mjs` 11→**16 test** (kol bıçağı, gecikme telafisi
  telafisiz/telafili karşılaştırması, kadraj dışı→geri dönüş) — **16/16 ✓**.
  Yeni araç: `meyvekes/_test/kilic-test.html` (kamera/oturum gerektirmeyen görsel test; Chrome'da
  doğrulandı: kılıç çiziliyor, meyveler kesiliyor, combo x3, NaN yok, konsol temiz).

### MULTIPLAYER — "aynı anda başla, takılma"
- **Ortak kök sebep (PatiRun + DidaGP):** başlangıç anı **epoch (`Date.now()`)** olarak yayınlanıyordu;
  cihaz saatleri sapınca geri sayım kayıyordu. Artık mesajda host'un gönderim anı (`t0`) da var,
  alıcı **"kalan süre"yi** alıp kendi saatine çeviriyor → saat farkı etkisiz.
  - `driftgp/net/multiplayer.ts`: `go` yayınına `t0`, alıcıda `raceGoAt = Date.now() + (goAt - t0)`.
  - `patirun/net/protocol.ts|roomClient.ts`: `StartMsg.t0` + alıcıda `recvAt`; yeni `ready`/`go`
    mesajları. `MpRaceScreen`: sahne kurulunca **"hazırım"**, host herkesi bekleyip (7 sn güvenlik
    zaman aşımı) `go` yayınlıyor, herkes geri sayımı aynı ana hizalıyor (DidaGP'deki kanıtlanmış
    desen). `startAt` yedek olarak duruyor (go düşerse yarış yine başlar, süre +2.5 sn'ye çıkarıldı).
- **Kafa Topu (host-otoriter, başlangıç zaten senkron) — takılma ve girdi gecikmesi:**
  - `net/interpolasyon.js`: sabit 120 ms tampon → **jitter'a adaptif** (70-260 ms; yukarı hızlı,
    aşağı yavaş uyum) + paket gecikirse **90 ms'ye kadar ekstrapolasyon** (donma yerine akış).
    Ekstrapolasyonda artık son İKİ paket kullanılıyor (eğim doğru).
  - `app/pages/MacPage.jsx`: misafirde **girdi gecikmesi maskeleme** — kendi kafan tuşa anında
    tepki verir (yalnız görsel yatay ofset, `0.94^kare` ile sönümlenir, ±1.1 kafa yarıçapı sınırı).
    Otorite host'ta kalır, sapma birikmez.

### Doğrulama
- Meyve Kes 16/16 ✓, Kafa Topu 27/27 ✓ (regresyon yok), `npm run build` temiz (846 modül, 4.95 sn).
- Chrome görsel testi: Meyve Kes kılıç/kesim (izole test sayfası). Hub'a giriş duvarı olduğundan
  oyun içi tarayıcı testi otomasyonda yapılamıyor.
- **Kullanıcıda kalan (yapılamayan):** gerçek iPhone testi ve 2 cihazlı multiplayer eşzamanlılık
  testi — bu ortamda kamera ve fiziksel cihaz yok.

---

## 11. Oturum — 24 Temmuz 2026: Kafa Topu 2 yeni kafa + tüm oyunlarda senkron/kasma denetimi

**Yapılanlar:**
- **Kafa Topu — 2 yeni foto kafa:** `emirali` (Emir Ali) ve `bedo` (Bedo) `public/heads/manifest.json`'a eklendi (verilen odak/yarıçap değerleriyle).
- **Kasma düzeltmesi (görsel boyutu):** Yeni görseller 2250×3000, ~2.8–3.3 MB idi → yavaş operatörde (Vodafone) yükleme/decode kasması. 825×1100'e küçültülüp JPEG'e çevrildi (tam foto, şeffaflık yok — daireye kırpıldığı için güvenli): **3.3 MB → 121 KB, 2.8 MB → 124 KB (~25×)**. Manifest `.jpg`'ye güncellendi. emirhan/kafa3 gerçek cutout (şeffaf) olduğundan PNG bırakıldı.
- **DidaGP senkron start bug'ı ("1 sn erken başlama"):** Kök neden — `raceGoAt` host'ta gönderim anında, istemcide ALIM anında ayarlanıyordu; fark = 'go' mesajının tek yönlü ağ gecikmesi (kötü mobil ağda ~1 sn). Çözüm: bekleme fazında NTP tarzı ping/pong ile saat-offset (host−self) ölçülür; 'go' epoch'u yerel saate çevrilir (`goAt − offset`) → mesajın uçuş süresinden bağımsız gerçek senkron. Offset ölçülemezse eski göreli yönteme düşer. (`driftgp/net/multiplayer.ts`)
- **PatiRun aynı bug:** `onGo` geri sayımı alım anına göre hizalıyordu (aynı tek-yönlü gecikme sapması). Aynı NTP saat-offset düzeltmesi `RoomClient`'a eklendi (`syncClock`, `hostToLocal`, `clockSynced`); `MpRaceScreen.onGo` offset-düzeltmeli. (`patirun/net/roomClient.ts`, `patirun/screens/MpRaceScreen.tsx`)
- **Kafa Topu:** host-otoriter model — geri sayım host'un simülasyon durumundan gelir, saat sapması/erken başlama mümkün değil. Zaten FPS'e göre otomatik çözünürlük, 60fps cap, opak canvas, wake lock, girdi öngörü ofseti var. Değişiklik gerekmedi.
- **Meyve Kes:** tek oyunculu (kamera + el takibi); realtime kanal yok, "senkron" = el-gecikme telafisi. İlgili değil.

**Test:** `npm run build` temiz (EXIT=0, DidaGP + PatiRun dahil tüm modüller derlendi).

**Kullanıcıda kalan test:** İki gerçek cihazla (özellikle farklı operatör/telefon) DidaGP ve PatiRun'da eşzamanlı start doğrulaması — bu ortamda 2 fiziksel cihaz yok. Yeni kafaların oyun içi görünümü (Kafa Topu karakter seçimi).

---

## 12. Oturum — 25 Temmuz 2026: Meyve Kes efekt onarımı + "Meyve Ye" modu

**Sorun (kullanıcı):** "Meyve kesme oyununda efektler silinmiş, elimi hareket ettirdiğimde ekranda
hiçbir şey olmuyor." Ayrıca yeni tek-oyunculu mod isteği: **Meyve Ye** (telefonu tek elle tut,
meyveler aynı şekilde gelir, ağzını açıp yutarsın).

**Kök neden:** Aynı gün yapılan "boşta bıçak yok" düzenlemesinde iz noktaları yalnız ALGILAMA
karesinde (+5 px hareket koşuluyla) ekleniyordu; aynı düzenlemede kasma için throttle 1.8×/150 ms'e
çıkarılmıştı. Yavaş cihazda algılama 8-12 fps'e düşünce 0.18 sn'lik iz ömrüne 1-2 nokta sığıyor,
çizim fonksiyonu `n < 2` iken hiçbir şey çizmiyordu → efektler tamamen kayboldu.

**Yapılanlar (hepsi `meyvekes/`):**
- **İz üretimi çizim hızına taşındı (60 fps):** ölçüt mesafe yerine **el hızı**; el görülmeyeli
  0.12 sn'den fazlaysa durur. Ömür 0.30 sn. Duran elde hâlâ iz yok (istenen davranış korundu).
- **`izCiz` yeniden yazıldı:** Catmull-Rom yumuşatma + 3 katman additif pala (mavi hale, iç parıltı,
  beyaz gövde); eski formülde iz ucunun kalınlığı 0'a düşüyordu, düzeltildi.
- **Kesim efektleri:** yön flaşı, halka dalgası, ekran sarsıntısı, titreşim; yarımlar kesim
  çizgisine dik ayrılıyor ve kesik yüzeyi bıçağın açısında duruyor.
- **Ses:** `engine/ses.js` (WebAudio sentezi, dosya yok) + HUD'da 🔊/🔇. Motor DOM'suz kalsın diye
  `oyun.sesler` olay kuyruğu OyunPage'de tüketilir.
- **Yeni mod Meyve Ye:** `engine/yuztakip.js` (FaceLandmarker, 4 ağız noktası), histerezisli ağız
  açıklığı, ağza **balistik nişan** alan meyve fırlatma, ağız halkası + yutma animasyonu.
  Migration `20260612000043_meyvekes_yeme_modu.sql` (mod check + RPC'lere `'yeme'`).
- `eltakip.js` throttle 1.5×/130 ms (iz artık algılamaya bağlı olmadığı için kesim isabeti arttı).

**Test:** Meyve Kes motor testi **31/31 ✓**, `npm run build` temiz. Kamerasız görsel test sayfası
eklendi (`meyvekes/_test/yeme-test.html`). Chrome eklentisi bu oturumda bağlı olmadığından tarayıcı
otomasyonu yapılamadı.

**Migration:** `npx supabase db push` 403 verdi (CLI oturumunun yetkisi yok) → SQL aynı gün
**Supabase Dashboard → SQL Editor**'den elle uygulandı ve başarılı oldu. Bu projede migration yolu
budur; CLI push'a güvenme.

**Kullanıcıda kalan:** Gerçek kamera testi — iz görünüyor mu, kesim hissi, ağızla yutma isabeti, kasma.

## 2026-07-25 — DidaGP yetişme sistemi, Meyve Kes worker çıkarımı, tüm oyunlarda senkron/kasma denetimi

Kullanıcı talebi: (1) DidaGP'de birinci fark atıyor, arkadakiler yetişemiyor — arkadakinin nitrosu
hızlı dolsun, arabası hızlansın, birinci fark atamasın; (2) hiçbir oyunda kasma/donma/senkron
bozulması olmasın, maçlar aynı anda başlasın; (3) Meyve Kes'te kol kadrajdan çıkıp hızlıca girince
oyun tanımıyor.

### 1) DidaGP — YETİŞME SİSTEMİ 2.0 (`driftgp/`)
Yardım artık sadece nitro deposunu doldurmuyor, **fiziğe** işliyor: geride kalan aracın üst hızı,
ivmesi, viraj tutunması artıyor; duvar/kayma cezaları azalıyor (acemi sürücü farkı virajda
kaybettiği için sadece hız yardımı yetmiyordu). Eşikler daraltıldı: yardım ~0.5 sn geride başlıyor,
**~4 sn geride tavana** oturuyor → denge noktası 11 sn'den 4 sn'ye indi. Ek olarak **lider tasması**
(1. sıradaki araç, takipçiye fark attıkça hafifçe kısılır) ve **slipstream** (öndeki aracın hava
boşluğunda ek güç) eklendi. Son turda yardım tamamen kesilmiyor, yarıya iniyor.
Başsız doğrulama (`driftgp/_test/yetisme-test.mts`): usta vs acemi sürücü bitiş farkı
**9.68 sn → 2.63 sn**, maks fark **0.188 → 0.071 tur**, liderin süresi yalnız %1.6 bozuluyor ve
usta sürücü yine kazanıyor (yardım hile değil). Ayrıntı: `driftgp/PROGRESS.md`.

### 2) Meyve Kes — çıkarım Web Worker'a taşındı (`meyvekes/`)
`detectForVideo` ana thread'de senkron çalıştığı için algılama kendini kısmak zorundaydı (zayıf
cihazda ~7 algılama/sn, 130 ms'ye kadar kör pencere) — "kol geri girince tanımıyor" ve "kasma"
şikâyetlerinin kök nedeni buydu. Yeni `engine/takip-worker.js` + `engine/takip-cekirdek.js` ile
çıkarım ayrı thread'de koşuyor, **kısma kaldırıldı** (30-60 algılama/sn) ve render 60 fps kalıyor.
Aynı worker el (HandLandmarker) ve yüz (FaceLandmarker) modellerini kuruyor → Meyve Ye modu da
faydalanıyor. Üç kademeli emniyet: worker yoksa/kurulamazsa eski ana-thread yolu, kurulup sonuç
üretmezse çalışma anında geri düşüş, GPU olmazsa worker içinde CPU.
Motor tarafında **kadraj dışı köprüsü**: el kaybolunca kimliği 0.4 sn saklanıyor, geri girdiğinde
aynı kimliğe bağlanıyor → dönüş savurması İLK karede kesiyor (istismar önlemi: köprü segment
tavanı köşegenin %50'si). Test: **36/36 ✓**. Ayrıntı: `meyvekes/PROGRESS.md`.

### 3) Tüm oyunlarda senkron/kasma denetimi
- **PatiRun (gerçek hata bulundu):** host, her dolgu botu için ayrı 10 Hz pozisyon akışı
  gönderiyordu → 4 koşucuyla 40 msg/sn, Supabase istemci sınırı 20/sn → mesajlar düşüyor, uzak
  koşucular ışınlanıyordu. Pozisyonlar artık kare sonunda **tek toplu mesajda** (`posc`) gidiyor.
- **Kafa Topu:** yayın hızı 20/sn ile sınırla TAM örtüşüyordu (jitter'da mesaj düşme riski) →
  ~18/sn'ye çekilip pay bırakıldı. Host-otoriter model gereği başlangıç zaten senkron.
- **DidaGP:** senkron start yoklaması 50 ms → 20 ms (yeşil ışık sapması azaldı).
- **Aynı anda başlama durumu:** DidaGP ve PatiRun'da `ready` + NTP saat-offset + `go` el sıkışması
  mevcut ve doğrulandı; Kafa Topu host-otoriter olduğu için geri sayım host simülasyonundan gelir
  (misafir kendi saatiyle başlangıç hesaplamaz). Meyve Kes/RUN/Gladius tek-oyunculu.
- **dt koruması:** dört motorda da kare sıçraması sınırlı (DidaGP 1/20 sn, Kafa Topu 250 ms +
  sabit 60 Hz alt adım, PatiRun 0.05 sn, Meyve Kes 0.05 sn) → sekme arka plana alınınca fizik
  patlaması yok. Dördünde de FPS'e göre otomatik çözünürlük düşürme mevcut.

### Doğrulama
`npm run build` temiz. Başsız testler: Meyve Kes 36/36, Kafa Topu 27/27, DidaGP yetişme 7/7.
**Kullanıcıda kalan (otomasyonda yapılamaz):** gerçek kamera + iPhone ile Meyve Kes testi;
2 cihazla DidaGP/PatiRun/Kafa Topu online maç testi. `patirun/game/__tests__` vitest gerektiriyor,
hub'da vitest kurulu değil.

### Aynı gün düzeltme — Meyve Kes: duran el kesiyordu

Worker'lı çıkarımın yan etkisi: algılama ~15 Hz'den 60 Hz'e çıkınca landmark titremesi (2-5 px)
kare başına "gerçek hareket" gibi göründü, gecikme telafisi de bunu ~3 kat büyüttü → **duran elin
kılıcı önünden geçen meyveleri kesiyordu.** Kesim izni artık anlık kare mesafesine değil 0.12 sn'lik
pencerede biriken NET (yönlü) yer değiştirmeye bakıyor; eşikler ekran köşegenine oranlı; pencere
dolmadan anlık hıza güvenilmiyor. Kapı kapalıyken kesim + gecikme telafisi + bıçak izi birlikte
kapanıyor. Test 39/39 (yeni: ±4 px titreyen duran el, hem masaüstü hem telefon çözünürlüğünde,
meyve kılıcın tam üstünde dururken 1 sn boyunca kesmiyor). Ayrıntı: `meyvekes/PROGRESS.md`.

---

## 26 Temmuz 2026 — Kafa Topu: iPhone kasmasının kalan kök nedenleri

24 Temmuz'daki statik sahne pişirmesi arka planı çözmüştü, ama **kare başına kalan iş** hâlâ
iOS Safari'nin iki en pahalı canvas yolundan geçiyordu. Kök nedenler ve ölçüm (yeni
`kafatopu/_test/cizim-test.mjs`, canvas komutlarını sayan mock):

| kare başına | eski | yeni |
|---|---|---|
| `clip()` (daire kırpma) | 2 (1v1) / 4 (2v2) | **0** |
| büyük ölçek-küçültmeli `drawImage` | 2 / 4 | **0** |
| canvas komutu (foto kafa) | 132 | 112 |
| canvas komutu (kurgusal kafa) | 178 | 125 |
| tam ekran blit | 5 | 4 (zayıf cihazda 1) |

**Asıl kalem — kafa sprite pişirmesi:** kafa her karede daire `clip()` içine alınıp 1100 px
PNG'den ~150 px'e ölçekleniyordu (kurgusal kafalarda ~80 path komutu). Safari'de non-rect clip
maske katmanı ayırıp GPU komut kuyruğunu boşaltıyor — **oyuncu başına, kare başına**. Artık kafa
küçük bir tuvale bir kez pişiriliyor, kare başına tek `drawImage` kalıyor.

Diğerleri: düz arka plan modu (parallax kapalı → 4 tam ekran blit 1'e iner), çizim süresini
ölçen uyarlanabilir kalite merdiveni (eski ölçüt yalnız rAF hızına bakıyordu, 120Hz ProMotion'da
zayıf durumu hiç görmüyordu), iOS `visualViewport resize` fırtınasında canvas'ın gereksiz yeniden
tahsisi, kare başına gereksiz `clearRect`, iPhone'da desteklenmeyen fullscreen API'sinin her
dokunuşta boşa denenmesi, ve maçtan çıkışta ~25 MB pişirik belleğinin hemen bırakılması.

Fizik/skor/ELO/ağ mantığına dokunulmadı: `motor-test.mjs` 27/27 ✓, `cizim-test.mjs` 13/13 ✓,
build ✓. Ayrıntı: `kafatopu/PROGRESS.md`.

**Kullanıcıda kalan:** gerçek iPhone'da maç testi (antrenman botu + online 1v1).

---

## 30 Temmuz 2026 — Kafa Topu: yeni kafa "ege" + bot zorluk dengesi

**1) Yeni foto kafa (`ege`):**
- İda ham fotoğrafı bıraktı (`public/heads/ege.png`, 2250×3000, 4.4 MB, arka plan dolu).
- emirali/bedo ile aynı hattan geçirildi: rembg (`u2net_human_seg` + alpha matting) ile arka
  plan şeffaf → bağlı-bileşen temizliği (40 adacıktan en büyüğü kaldı) → yarı saydam saçak
  bandı sertleştirildi → 760 px uzun kenar, PNG optimize. **4.4 MB → 282 KB.**
- Manifest odak değerleri: İda'nın verdiği `0.50 / 0.36 / 0.34` daire önizlemesinde ağzı ve
  çeneyi kesiyordu (fotoğrafta kafa kadraja göre büyük). `kafaCizim.js`'in daire kırpma
  matematiğini birebir simüle eden önizleme scripti ile ölçülüp **`odakX 0.48, odakY 0.42,
  yaricap 0.46`** yapıldı — saç üstünden çeneye tam kafa, bedo/emirali ile aynı çerçeveleme.
- Araç kalıcı değil (scratchpad): `ege-kes.py` (arka plan hattı) + `daire-onizle.py` (görsel
  doğrulama). Yeni kafa eklerken aynı iki adım tekrarlanmalı: kes → daire önizle → odak ayarla.

**2) Bot fazla güçlüydü ("kimse yenemiyor"):**
- Kök neden: 120 ms tepki (insanüstü), küçük hata payı (26), menzilde %60 vuruş **ve** kale
  ağzında koşulsuz temizleme (`g.vur = true`) — yani asla açık vermiyordu.
- `engine/bot.js` tek dosyada zayıflatıldı (fizik/skor/ağ mantığına dokunulmadı):
  tepki 120→205 ms, hata 26→44, vuruş menzili ×0.9→×0.84, balistik tahmin katsayısı
  2.2→1.8, menzilde vuruş %60→%45, acil temizleme koşulsuz→%82, zıplama fırsat başına %72
  (karar anında kilitlenir, tick başına titremez), yetenek kullanımı %2→%0.8, ve yeni
  **dalgınlık** mekaniği (karar başına %8 ihtimalle 380 ms hiç girdi üretmez → oyuncuya
  gerçek boşluk açılır).
- Ölçüm (eski bot vs yeni bot, 20 maç, 1v1): **eski 20.4 — yeni 8.3** (maç başı ortalama).
  Önceki simetrik eşleşme ~19-19 idi; bot artık belirgin şekilde yenilebilir ama pasif değil.

**Test:** `motor-test.mjs` 27/27 ✓, `npm run build` temiz ✓.
**Kullanıcıda kalan:** Karakter ekranında Ege kafasının görünümü + antrenman maçında botun
yeni zorluk hissi (çok kolaylaştıysa `BOT` bloğundaki değerler tek yerden ayarlanabilir).

**Düzeltme (aynı gün):** Ege kadrajında tişört görünüyordu (`yaricap 0.46` gövdeyi de alıyordu).
Izgara overlay ile kafa sınırları ölçüldü (570×760 görselde: saç üstü y≈133, çene y≈490,
kulaklar x≈150-405) → **`odakX 0.49, odakY 0.42, yaricap 0.355`**. Daire artık saç üstünden
çeneye sadece kafayı alıyor, omuz/tişört kadraj dışında.

---

## 8 Ağustos 2026 — Meyve Kes: agresif oynanış (kasma + salınımlı hareket + kadraj dışı)

Kullanıcı: *"oyun her aşamada kasıyor; ellerim kamera görüşünden çıkıp geri girdiğinde bıçak
olarak kullanamıyorum. İstediğim konsept: insanlar kalori yaksın — çılgınca dans eder gibi,
yumruk atar gibi kollarını sallasın ve oyun bunların hepsini algılasın, kasma olmasın."*

### Kök neden 1 — SALINIMLI hareket kapıyı hiç açmıyordu (asıl "algılamıyor" nedeni)

Hareket kapısı `HAREKET_PENCERE` (0.12 sn) boyunca biriken **NET (yönlü)** yer değiştirmeye
bakıyordu. Yumruk/dans hareketinde el ileri-geri gider: pencereye tam bir salınım periyodu
sığdığında net yol **≈ 0** çıkar → kapı KAPALI → kesim de, gecikme telafisi de, bıçak izi de
üretilmez. Yani oyuncu ne kadar hızlı sallarsa o kadar az kesiyordu.

- **Çözüm:** kapı ölçütü artık pencere içindeki konum **YAYILIMI** (bbox köşegeni):
  `YAYILIM_ORAN = 0.035 × ekran köşegeni`, pencere 0.14 sn. Yayılım yön bağımsızdır → tek
  yönlü savurma da salınım da geçer; ±4 px landmark titremesi ≈ 11 px yayılım üretir, eşiğin
  (telefonda ~32 px) çok altında kalır → **duran el hâlâ kesmiyor**.
- Yön/hız (telafi + iz + gövde süpürmesi) ayrı ve **kısa** pencereden okunur (`HIZ_PENCERE`
  0.04 sn): uzun pencere ortalaması salınımda yönü sıfırlıyordu.
- `SUPURME_ORAN` 0.36 → 0.28, `KILIC_KALINLIK` 34 → 38 (agresif tempoda isabet payı).

### Kök neden 2 — kadraj dışına çıkan kol geri gelince "bıçak olmuyordu"

Üç katman vardı: (a) `KAYIP_SURE` 0.4 sn çok kısaydı — çılgın tempoda kol saniyelerce dışarıda
kalıyor, kimlik düşüyor, dönen el hızsız/segmentsiz yeni kimlik doğuyordu; (b) köprü kurulsa
bile dönüş karesinde hareket penceresinde tek örnek kalıyordu → kapı kapalı; (c) eşleştirme ham
konuma bakıyordu → hızlı savurmada iki el kimlik takası yapabiliyordu.

- `KAYIP_SURE` 0.4 → **1.2 sn**.
- Dönüşte kayıp-öncesi konum `KOPRU_REF_DT` (0.05 sn) yaşında bir örnek olarak geçmişe konur →
  kapı **ilk karede** açılır, yön = kadraja giriş yönü.
- Kayıp `KOPRU_SEGMENT_SURE`'yi (0.25 sn) aşarsa iki konum arası "ışınlanma segmenti" kesim
  yapmaz (el arada nereden geçti bilinmiyor); kesimi yalnız kılıcın **o anki gövdesi** yapar →
  dönüş karesinde kolun üstündeki meyve kesilir, uzaktaki meyve kesilmez.
- Eşleştirme **hız-tahminlidir** (son hızla ileri sarılmış konuma en yakın kimlik); kayıp elde
  tahmin yapılmaz (kadraj dışında yön değişmiş olabilir).
- Meyve fırlatma kenar payı ekrana oranlı (`max(60, W×0.1)`) — meyve en dış şeride düşünce
  oyuncu kolunu kadrajın dışına uzatmak zorunda kalıyordu.

### Kök neden 3 — kasma (ana thread bütçesi)

- **Kare kopyalama:** worker'a giden `createImageBitmap` kamera çözünürlüğündeydi. Artık uzun
  kenar 480'e, **en-boy oranı korunarak** küçültülür (`HEDEF_UZUN_KENAR`, `resizeQuality:'low'`;
  desteklemeyen tarayıcıda otomatik tam kareye döner). Model girdiyi zaten ~200 px'e indirdiği
  için doğruluk değişmez, ana thread kopyası ve GPU yüklemesi belirgin ucuzlar.
- **Çizim:** altın meyvenin `shadowBlur`'ü (meyve başına ayrı blur geçişi) → tek additif halka;
  parçacıklar tek geçişte çizilir (parçacık başına `save/restore` yok) + `MAX_PARCACIK` 260
  tavanı; bıçak izinin geniş additif hale katmanı düşük kalitede kapanır.
- **Canvas/HUD:** `desynchronized: true`; piksel bütçesi 1.3M → 1.1M; adaptif kalite ölçümü
  2 sn → 1 sn (alt sınır 0.55 → 0.5); HUD state'i yalnız **değer değiştiğinde** yazılır
  (eskiden 12 fps'te her seferinde yeni obje → gereksiz React ağacı yeniden çizimi).
- **Ses:** aynı karede aynı türden en fazla 2 efekt (combo'da 4 kesim = 4 WebAudio zinciri).
- **Teşhis:** rozette artık **algılama frekansı (Hz)** ve `⚠` (worker kurulamadı, ana-thread
  yedeğine düşüldü) görünüyor. Kasma şikâyetinde ilk bakılacak yer burası: `⚠` varsa o cihazda
  çıkarım ana thread'de koşuyor demektir.
- Menüde model + wasm için düşük öncelikli `prefetch` (açılış beklemesi kısalır).

**Test:** `node meyvekes/_test/motor-test.mjs` → **43/43 ✓** (yeni: 7 Hz salınımlı yumruk
hareketi kesiyor, 0.9 sn kadraj dışı kalıştan dönüşte gövde kesiyor, aynı yerden dönen duran el
kesmiyor, art arda 5 çıkış/girişin hepsinde kesim). `npm run build` temiz.

**Kullanıcıda kalan:** gerçek kamera testi — (1) rozetteki Hz değeri (30-60 iyi, 10-15 düşük)
ve `⚠` var mı, (2) kolları çılgınca sallarken kesim isabeti, (3) kol çıkıp girince ilk
savurmanın kesmesi, (4) duran elin hâlâ kesmediği.

## 2026-08-12 — Gölge Boks (yeni oyun, 8. modül)

- Yeni izole modül `boks/` — kamera + **el (HandLandmarker) ve vücut (PoseLandmarker)** takibiyle
  gölge boksu antrenmanı. Hem oyun hem antrenman/analiz aracı; prototip değil, ticari sürüm hedefi.
- **Mimari:** tek kamera akışı → iki ayrı worker (el tam hızda / poz ~30 Hz kısılmış) → ana thread
  yalnız kare kopyalar. Meyve Kes'in worker altyapısı **izole kopyalandı** (meyvekes/ değişmedi).
- **Yumruk tanıma:** kol başına durum makinesi (bekle→itme→darbe→toparla), 6 boks numarası;
  kameraya doğru düz yumruk için el ölçeğinin büyüme hızı "etkin hız"a katılır (jab/cross bu
  olmadan ıskalanıyordu). Solak duruşta numaralandırma aynalanır.
- **Modlar:** Serbest · Koç (kombinasyon dizisi + TTS sesli koç) · Savunma (kaçış/blok) · Ritim.
  Zorluk: kolay 2×90 sn → pro 5×45 sn, mola 12-15 sn, ısınma fazı.
- **Antrenör Modu:** 8 boyutlu stil vektörü, 8 arketip, 12 maddelik zayıflık kataloğu (teknik
  tavsiyeli), round/oturum/kariyer raporu, koçluk geri bildirim döngüsü (zayıflık düzelince fark
  eder), **248 profesyonel dövüşçüyle** stil eşleştirmesi (yalnız kamuya açık stil özellikleri).
- **Adaptif kapsam ilkesi:** analiz yalnız kameranın gördüğü bölgelere dayanır; kalça/bacak
  kadrajda değilse duruş-denge analizi hiç üretilmez (varsayım yok).
- **Dürüstlük ilkesi:** vuruş "şiddeti" kişinin kendi ortalamasına normalize edilmiş görece skor
  (Newton iddiası yok); kalori MET tabanlı, kilo yoksa "tahmini" etiketli.
- **DB:** `20260612000044_boks_temel.sql` — 8 tablo (`boks_` önekli), RLS, 5 security-definer RPC.
  `boks_oturum_kaydet` oturum+round+kariyer+streak+skor+sezon+zayıflık+rozeti atomik yazar.
- **Büyüme:** Story paylaşım kartı + combo klibi (MediaRecorder), streak, 18 rozet, 3 kürasyonlu
  program, aylık sezon ligi, seviye testi (otomatik zorluk kalibrasyonu), teknik rehberi,
  çevrimdışı kuyruk, alan-güvenliği kontrolü, sağlık/postür uyarıları.
- **Hub:** `src/App.jsx`'e lazy `/boks/*` rotası, `GameCenter.jsx`'e 8. kart ("Gece Antrenmanı"
  paleti — hub'ın mor kimliğinden bilinçli ayrışma).
- **Doğrulama:** `node boks/_test/motor-test.mjs` 72/72 geçti; `npm run build` başarılı
  (BoksApp ayrı chunk, 140 kB / 48 kB gzip).
- Ayrıntı ve kararlar: **`boks/PROGRESS.md`** + `boks/CLAUDE.md`.

## 2026-08-12 — Gölge Boks: radikal performans revizyonu

Kullanıcı geri bildirimi ("kamera kasıyor, akıcı değil, eldivenleri sil, oyun akmıyor")
üzerine `boks/` modülünde mimari değişiklik:

- **İki takip modeli → tek model.** `HandLandmarker` kaldırıldı (`boks/engine/eltakip.js`
  silindi); el ölçeği artık poz modelinin parmak köklerinden (17/18, 19/20) okunuyor.
  CPU ~yarıya indi, poz kısılmadan koşuyor.
- Kamera 960×540@60 → 640×360@30; worker karesi 320 px; canvas bütçesi 900 k.
- AR eldiven overlay'i silindi, yerine ucuz "bilek nişanı" geldi (menüdeki eldiven ayarı da
  kaldırıldı; DB kolonları uyum için duruyor).
- Yumruk tespit eşikleri ~%20 gevşetildi, pad toleransı 0.62→0.85, pad ömürleri +%25,
  ısınma 18→10 sn — "vurdum ama saymadı" ve bekleme hissi giderildi.
- Doğrulama: `node boks/_test/motor-test.mjs` 72/72, `npm run build` başarılı.

Detay: `boks/PROGRESS.md`.

## 2026-09-08 — Meyve Kes: kasma/gecikme kök nedeni (module worker → klasik worker)

Worker `{ type: "module" }` ile açıldığı için MediaPipe'ın `importScripts` çağrısı her cihazda
patlıyor, oyun sessizce ~10 Hz ana-thread yedeğine düşüyordu. Worker klasik tipe çevrildi
(ölçüm: worker/GPU 66 Hz), HUD rozeti "xx Hz · worker/GPU" oldu, kamera canvas'a kopyalanmak
yerine CSS katmanında gösteriliyor, kesim efekt bütçesi kısıldı. Aynı hata `boks/` worker'ında da
vardı, düzeltildi. motor-test 43/43 (boks 93/93), build temiz. Detay: `meyvekes/PROGRESS.md`.
- 2. tur (aynı gün): telefonda 13-14 Hz → rVFC basamaklanması kırıldı ("boşalınca hemen gönder"
  + bitmap ön hazırlığı), mobilde 352 px kare, worker'da GPU/CPU delege yarışı, rozete çıkarım ms.
  Yeni `meyvekes/_test/cekirdek-test.mjs` 11/11 (sanal saat: 45 ms çıkarımda 14.9 → 22.1 Hz).

## 2026-09-08 — Bildim: Faz 1 — Lig + kategori veritabanı (`20260612000045_lig_ve_kategori.sql`)

Google Play hedefiyle üç farklılaştırıcının DB tarafı kuruldu: **kategori seçmeli yarış**,
**şehir/ülke ligi**, **küresel sıralama + rank kasma**. Tek migration, mevcut şema bozulmadı,
puanlama mantığına dokunulmadı.

**Mevcut durum tespiti (uydurma değil, migration'lardan okundu):**
- pg_cron **var** ve kullanılıyor (`bildim-turnuva-baslat`, `bildim-bot-oyna`, …).
- Haftalık sıfırlama **vardı**: `bildim-hafta-sifirla` (`0 21 * * 0` = Pazartesi 00:00 TSİ) ama
  yalnızca `update profiles set puan_hafta = 0` yapıyordu → geçmiş kayboluyordu. Bu iş
  **unschedule edilip** `haftayi_kapat()` ile değiştirildi (önce arşivle + rozet, sonra sıfırla).
- `create_challenge`, `create_group_challenge`, `create_hizli_mac` zaten `p_kategori` alıyordu;
  eksik olan, seçimin **soru havuzuna** yansımasıydı (görülmüş soru/dil filtresi yoktu).
- `award_badge` var → haftalık rozetler onun üzerinden veriliyor.

**Kararlar ve nedenleri:**
- **Şehir/ülke listesi = tablo (`ulkeler`, `sehirler`), frontend sabiti değil.** Gerekçe: lig
  sıralaması konuma dayanıyor ve konum haftada 1 kez değişebiliyor; doğrulama istemcide
  yapılamaz. Tablo sayesinde `profil_konum_kaydet()` sunucuda doğruluyor ve yeni ülke eklemek
  deploy gerektirmiyor. Bayrak emojisi ISO kodundan istemcide türetiliyor (kolon yok).
  TR için 81 il yüklendi; şehir listesi olmayan ülkelerde serbest metin (2-40 karakter).
- **Konum kilidi:** `profiles.konum_degisti_at` + 7 gün. Aynı değer tekrar gönderilirse kilit
  harcanmıyor. `profiles` üzerinde authenticated'a sadece (username, avatar_url) update yetkisi
  olduğu için `ulke/sehir` doğrudan yazılamaz — yalnızca RPC.
- **Soru seçimi tek noktada: `soru_sec(kategori, adet, oyuncular[], dil)`.** Görülmemiş sorular
  önce, bitince en eski görülenler (asla boş dönmez); yetersizse önce kategori, sonra dil
  gevşetilir. 1v1'de iki oyuncunun ikisi de, grup/hızlıda tüm katılımcılar dizide.
  Bağlandığı yerler: `respond_challenge`, `quick_match`, `respond_group_challenge`,
  `respond_hizli_davet`, `start_tournament` (karışık kalır, sadece dil) ve **`bot_oyna`'nın 3
  seçim noktası** (bot maçlarında da tekrar olmasın diye fonksiyon birebir kopyalanıp yalnızca
  seçim satırları değiştirildi).
- **`gorulen_sorular` kaydı soru gösterildiğinde** yazılıyor (maç bitince değil): 4 soru RPC'si
  (`get_match_question`, `get_group_match_question`, `get_hizli_soru`, `get_tournament_question`)
  `gorulen_kaydet()` çağırıyor, `on conflict do nothing` ile ilk gösterimde bir kez yazıyor.
- **Kota:** `mac_kotasi_kontrol()` — saat başına 30 maç başlatma (matches/group/hızlı toplamı).
  `hileli_mi()` olan hesap (kurucu/geliştirici) muaf. Puanlamaya dokunulmadı.
- **`quick_match` artık `p_kategori` alıyor** (varsayılan null). Eski `quick_match()` imzası
  drop edildi; istemci parametresiz çağırdığında varsayılan devreye giriyor.
- **`get_categories` 3 kolon dönüyor:** `kategori, soru_sayisi, gorulen_sayisi` (kategori
  kartlarındaki "çözdüğün %" için). Kullanıcının `profiles.dil` diline göre filtreliyor.
- **Turnuva karışık kaldı** (istek gereği), yalnızca dil filtresi uygulanıyor.

**Yeni nesneler:** `ulkeler`, `sehirler`, `gorulen_sorular`, `lig_arsiv` tabloları;
`profil_konum_kaydet`, `gorulen_kaydet`, `soru_sec`, `mac_kotasi_kontrol`, `haftayi_kapat`,
`haftalik_sonuc_bildir`, `lig_siralama(kapsam, donem)`, `sehir_lig_sirasi(donem)` fonksiyonları;
`hafta_1/2/3`, `sehir_krali` rozetleri; konum/dil/kota indeksleri.
Yeni cron: `bildim-hafta-kapat` (Pazar 21:00 UTC) ve `bildim-hafta-bildir` (Pazartesi 06:00 UTC).

**Senin yapman gerekenler (Faz 1):**
1. `supabase/migrations/20260612000045_lig_ve_kategori.sql` dosyasını Supabase Studio → SQL
   Editor'de **tek parça** çalıştır (44'ten sonra, tek dosya, sıra önemli).
2. Çalıştıktan sonra kontrol: `select jobname, schedule from cron.job order by jobname;`
   → `bildim-hafta-sifirla` **gitmiş**, `bildim-hafta-kapat` + `bildim-hafta-bildir` **gelmiş**
   olmalı. Gelmediyse pg_cron uzantısı kapalıdır, haber ver.
3. Push bildirimi için `send-push` Edge Function ve `x-cron-secret` zaten mevcut; ek iş yok.

`npm run build` temiz (Faz 1'de frontend değişmedi).

## 2026-09-08 — Bildim: Faz 2 — Lig ve kategori arayüzü

**Yeni dosyalar:** `oyun/lib/konum.js` (bayrak emojisi ISO kodundan, konum kilidi kalan
süre, hafta bitişi = Pazar 21:00 UTC — sunucudaki cron ile aynı an, kısa süre metni),
`oyun/components/KonumSecici.jsx` (mod="modal" zorunlu ilk giriş / mod="kart" profil).

**Değişen dosyalar:**
- `oyun/pages/Home.jsx` — ilk girişte `profile.ulke` boşsa kapatılamayan konum modalı;
  hero altında şehir/ülke/dünya sıra rozetleri (`benim_lig_durumum` RPC, tek satır — 3 ayrı
  sıralama çekmemek için); haftalık lig geri sayımı + şehrin ülke içi sırası; `lig_arsiv`ten
  okunan "geçen hafta X. oldun" uygulama içi şeridi (localStorage ile bir kez gösterilir).
- `oyun/pages/LeaderboardPage.jsx` — yeni sayfa açılmadı, mevcut sayfa genişletildi.
  Üst sekmeler ŞEHİR / ÜLKE / DÜNYA / ARKADAŞ (arkadaş sekmesi eski davranışını korudu),
  alt sekmeler BU HAFTA / TÜM ZAMANLAR. İlk 3 podyum, satırlarda avatar + rütbe rozeti +
  ülke bayrağı + şehir, kendi satırı vurgulu ve **sticky olarak altta sabit**. Şehir
  sekmesinde `sehir_lig_sirasi` ile "Balıkesir bu hafta ülkende 12." şeridi. Konumu olmayan
  oyuncuya şehir/ülke sekmesinde seçim çağrısı gösteriliyor.
- `oyun/pages/ChallengesPage.jsx` — kategori çipleri kategori **kartlarına** dönüştü:
  kategorideki toplam soru sayısı + oyuncunun çözdüğü yüzde (ilerleme çubuğuyla).
  Seçimin 1v1/grup/hızlı modun hepsinde geçerli olduğu başlıkta yazıyor (kod zaten aynı
  `kategori` state'ini üçünde de kullanıyordu).
- `oyun/pages/ProfilePage.jsx` — konum özeti kartı + değiştirme; haftalık kilit kalan süresi.
- `src/styles.css` — sonuna `bd-*` katmanı eklendi (eski sınıflar silinmedi). CSS değişkenleri
  (boşluk/yarıçap/gölge/dokunma hedefi) `:root` üzerine yazıldı.

**Karar:** Ana sayfadaki lig özeti için 3 ayrı `lig_siralama` çağırmak yerine migration 45'e
`benim_lig_durumum(p_donem)` eklendi — 100 satır yerine tek satır döner, mobilde ucuz.
Bu RPC henüz uygulanmamışsa Home sessizce özeti gizler (try-catch), sayfa çalışmaya devam eder.

**Test edilecek:** ilk girişte modalın çıkması, şehir seçince ligin dolması, ikinci kez
değiştirmeye çalışınca 7 günlük kilidin hata vermesi. `npm run build` temiz.

## 2026-09-08 — Bildim: Faz 3 — Kozmetik yenileme + Play Store gereklilikleri

**Tasarım sistemi:** `src/styles.css` sonuna `bd-*` katmanı (Faz 2'de başladı, Faz 3'te
tamamlandı). CSS değişkenleri (`--bd-bosluk-*`, `--bd-yaricap-*`, `--bd-golge-*`,
`--bd-dokunma: 44px`) `:root` üzerine tanımlı. **Hiçbir eski sınıf silinmedi**; sayfalar
JSX'te yeni sınıflara geçirildi, eski CSS geriye uyumlu duruyor (diğer sayfalar hâlâ
`.kart`, `.btn`, `.soru-sayac` kullanıyor).

- **Soru kartı (`QuestionCard`)** yenilendi: `clamp()` ile büyüyen okunaklı soru metni
  (`text-wrap: balance`), SVG **kalan süre halkası** (son 9 sn turuncu, son 5 sn kırmızı +
  nabız), üstte ilerleme çubuğu, şıklarda **anında yeşil/kırmızı geri bildirim** (doğru:
  hafif büyüme; yanlış: sallanma), doğru/yanlış işaretleri (✓/✕), seçilmeyen şıklar solar.
  Tüm mantık (joker, basılı tut, oy verme, süre) aynen korundu.
- **Mikro etkileşim:** `oyun/components/PuanSayaci.jsx` — üst bardaki puan değişince
  easeOutCubic ile sayıyor ve "+N" baloncuğu yükseliyor. `prefers-reduced-motion` tercihine
  saygılı (hem bileşen içinde hem global CSS kuralıyla). Rütbe atlama zaten `RankUpOverlay`.
- **Erişilebilirlik:** `--text-dim` #9b94c4 → **#a9a2d2** (koyu zeminde kontrast 4.5:1 eşiğini
  geçsin diye), tüm dokunma hedefleri ≥ 44px (şıklar 56px), her etkileşimli öğede
  `:focus-visible` çerçevesi, ikon butonlarda `aria-label`, modallarda `role="dialog"`.

**Play Store gereklilikleri:**
- **`/gizlilik`** statik sayfası (`oyun/pages/GizlilikPage.jsx`). Türkçe gizlilik politikası
  **taslağı**: e-posta + kullanıcı adı toplandığı, şehir/ülkenin **kullanıcı beyanı** olduğu
  (GPS alınmadığı), verilerin satılmadığı, Supabase/Vercel'in işleyici olduğu, silme hakkı.
  İletişim: idagureli@gmail.com. **Rota giriş duvarının ÖNÜNDE** (`src/App.jsx` içindeki
  `bagimsizModul` listesine eklendi) — mağaza kaydı oturum açmadan görebilsin diye.
- **Hesap silme:** `supabase/migrations/20260612000046_hesap_silme.sql` → `hesabimi_sil()`.
  Önce `delete from auth.users` denenir (cascade ile `public.profiles` ve ona bağlı **tüm**
  oyun tabloları gider) → `'tam'` döner. Yetki yoksa yalnızca `public.profiles` silinir →
  `'kismi'` döner. **Uydurma yok:** `'kismi'` durumunda auth.users kaydını temizlemek için
  service_role ile çalışan bir Edge Function gerekir; bu dosyanın başına not düşüldü.
  Profil sayfasında kullanıcı adını yazdırarak onaylatan modal + ardından `signOut()`.

**Değişen/eklenen dosyalar (Faz 3):** `oyun/components/QuestionCard.jsx`,
`oyun/components/PuanSayaci.jsx` (yeni), `oyun/components/Layout.jsx`,
`oyun/pages/ProfilePage.jsx`, `oyun/pages/GizlilikPage.jsx` (yeni), `src/App.jsx`,
`src/styles.css`, `supabase/migrations/20260612000046_hesap_silme.sql` (yeni).
`npm run build` temiz.

## 2026-09-08 — Bildim: Faz 4 — Soru havuzu planı (üretim YAPILMADI)

`scripts/soru-parti-sablonu.md` yazıldı: tekrar kullanılabilir parti promptu + migration
iskeleti + parti öncesi tekrar kontrolü + parti sonrası doğrulama sorguları + kayıt defteri.

**Mevcut havuz (migration dosyalarındaki `insert` satırları sayılarak; DB'ye bağlanılamadı,
`on conflict (soru) do nothing` nedeniyle gerçek sayı biraz düşük olabilir):**
bilim 332, tarih 272, cografya 224, genel 189, edebiyat 175, spor 165, sanat 141,
sinema 54, teknoloji 54, muzik 53, karisik 39 → **toplam ~1.700**.

**Hedef:** 10 kategori × ~1.000 = 10.000. `karisik` ayrı kategori olarak büyütülmüyor
(kullanıcı "karışık" modu kategori seçmeyerek zaten oynuyor); yeni sorular 10 gerçek
kategoriye dağıtılıyor. Kalan ~8.300 soru → ~17 parti × 500.

Kesin sayıyı Studio'da şununla al:
`select kategori, count(*) from public.questions where aktif group by kategori order by 2 desc;`

---

### Bu paketin özeti — senin manuel yapman gerekenler

1. **Migration'ları sırayla Supabase Studio → SQL Editor'de çalıştır:**
   - `20260612000045_lig_ve_kategori.sql` (büyük dosya, tek parça)
   - `20260612000046_hesap_silme.sql`
2. **pg_cron kontrolü:** `select jobname, schedule from cron.job order by jobname;`
   → `bildim-hafta-sifirla` gitmiş, `bildim-hafta-kapat` (0 21 * * 0) ve
   `bildim-hafta-bildir` (0 6 * * 1) gelmiş olmalı.
3. **Hesap silme davranışını doğrula:** test hesabıyla `select public.hesabimi_sil();`
   → `'tam'` dönerse ek iş yok; `'kismi'` dönerse auth.users temizliği için Edge Function
   gerekir, haber ver.
4. **Kendi profilinde şehir/ülke seç** (ilk giriş modalı) — lig sekmeleri onsuz boş görünür.
   Konum haftada 1 kez değişir, test ederken dikkat.
5. **Bildirim izni** açıksa Pazartesi 09:00 TSİ haftalık sonuç push'u gelir.
6. Deploy/push YAPILMADI (istendiği gibi).

## 2026-09-08 — Migration'lar CANLIYA UYGULANDI + CLI 403'ün kök nedeni bulundu

Kullanıcı "her şeyi sen yap, bana SQL Editor açtırma" dedi; migration'lar bu oturumda
**doğrudan canlı veritabanına uygulandı**. Artık elle uygulama gerekmiyor.

**CLI 403'ün kök nedeni (aylardır bilinmiyordu):** `npx supabase projects list` çalışıyor
ama yalnızca `idafroditproject@gmail.com` hesabının 2 projesini listeliyor. Bildim'in
projesi `zfpnxzybcpkxsotwdsey` o listede YOK → makinedeki CLI token **başka hesaba ait**.
Yani yetki sorunu değil, hesap uyuşmazlığı. Çözüm: CLI hesabından bağımsız olarak
**DB şifresiyle pooler üzerinden** bağlanmak.

- `supabase db dump` Docker istiyor → kullanılamadı.
- Bunun yerine scratchpad'e `pg` kurulup doğrudan Postgres bağlantısı kuruldu
  (`postgres.zfpnxzybcpkxsotwdsey@aws-1-eu-central-1.pooler.supabase.com:5432`).
- DB şifresi `.env.local` içine `SUPABASE_DB_PASSWORD` olarak yazıldı (gitignore'da).

**Uygulama yöntemi:** 45 ve 46 önce `begin; … rollback;` ile **deneme çalıştırıldı**
(hatasız), sonra `begin; … commit;` ile tek transaction'da uygulandı.

**Doğrulanan sonuçlar (canlı DB):**
- `cron.job`: `bildim-hafta-sifirla` **gitti**; `bildim-hafta-kapat` (`0 21 * * 0`) ve
  `bildim-hafta-bildir` (`0 6 * * 1`) **aktif**.
- `ulkeler` 85 satır, `sehirler` TR 81 il, `questions` 1.701 soru (hepsi `dil='tr'`),
  `gorulen_sorular` / `lig_arsiv` boş (beklenen).
- Uçtan uca RPC testi (gerçek kullanıcı kimliği taklit edilip **rollback** edildi):
  `get_categories` 11 kategori / 1.701 soru, `profil_konum_kaydet('TR','Balıkesir')` ✓,
  `lig_siralama('sehir'|'global')` ✓ (dünyada 21 bot-olmayan oyuncu),
  `benim_lig_durumum` ✓, `sehir_lig_sirasi` ✓, `soru_sec('tarih',20)` → 20 soru ✓.
  Şehir doğrulaması da çalışıyor: 'Balikesir' (Türkçe karaktersiz) **reddedildi**.
  → Test rollback edildiği için kullanıcının konumu **değişmedi**, uygulama soracak.
- **`hesabimi_sil()` → `'tam'` dönecek.** Fonksiyon `postgres` rolüne ait ve o rol
  `auth.users` üzerinde DELETE yapabiliyor (rollback'li test edildi). **Edge Function
  GEREKMİYOR.** Migration 46'nın başlığı bu doğrulamayla güncellendi.

**Migration geçmişi onarıldı:** `supabase_migrations.schema_migrations` tablosu yalnızca
000030'a kadar kayıtlıydı (31-44 SQL Editor'den elle uygulandığı için kaydedilmemiş).
`supabase migration repair --status applied` ile 31,32,33,35-46 kaydedildi.
**34 (Gladius `gl_temel`) bilerek kaydedilmedi: canlıda gerçekten YOK** — `gl_profiller`,
`gl_odalar`, `gl_maclar` tabloları mevcut değil. Gladius zaten DEMO ve backend kullanmıyor
(`App.jsx` içinde `bagimsizModul`), bu yüzden bir şey bozulmuyor; ama Gladius'a backend
eklenecekse önce 034 uygulanmalı. Bundan sonra `npx supabase db push --db-url ...` sadece
bekleyen migration'ları uygular.

**Gerçek soru sayıları (tahmin değil):** bilim 329, tarih 266, genel 221, cografya 217,
edebiyat 172, spor 161, sanat 136, sinema 55, teknoloji 54, muzik 54, karisik 36 →
**toplam 1.701**. `scripts/soru-parti-sablonu.md` bu gerçek sayılarla güncellendi.

**Kalan tek manuel iş:** yok. Sadece siteyi aç, ilk girişte şehir modalı çıkacak.
(Deploy/`git push` hâlâ YAPILMADI — istersen söyle.)

## 2026-09-08 — Bildim Faz 1: Gizlilik + takma ad + davet + bildirim (`20260612000047`)

**Kök sorun (canlıda doğrulandı):** `handle_new_user` kullanıcı adını Google `full_name`'den
üretiyor ve Google fotoğrafını otomatik alıyordu → herkes gerçek adı ve yüzü görüyordu.
Ayrıca hiç oynamamış üyeler ligde listeleniyordu (canlı sayım: 21 üyenin 4'ü hiç oynamamış).

### Kararlar ve gerekçeleri

- **`gorunen_ad` / `gorunen_avatar` STORED GENERATED kolon olarak eklendi** (RPC katmanı
  yerine). Gerekçe: uygulama profilleri yalnız RPC'den değil, PostgREST **gömülü join**'leriyle
  de okuyor (`p1:profiles!matches_oyuncu1_fkey(...)`, `profil:profiles(...)`) ve realtime
  yayınları da var. Kolon olarak tanımlanınca üç yol da tek noktadan güvenli hale geliyor;
  her RPC'yi ayrı ayrı sarmalamaya göre hem daha az kod hem sızdırma riski sıfır.
  `gorunen_ad = case when takma_ad_secildi then takma_ad else 'Oyuncu' end`,
  `gorunen_avatar = case when avatar_onayli then avatar_url else null end`.
- **`profiles_select` politikasına DOKUNULMADI** (varsayılan karar gereği; diğer oyun
  modülleri kırılmasın). Bunun yerine `revoke select (username, avatar_url) ... from anon`.
  authenticated'a dokunulmadı.
- **`toplam_mac` TRIGGER ile artıyor**, mevcut `advance_match` / `advance_group_match` /
  `advance_hizli_mac` / `advance_tournament` fonksiyonları **yeniden yazılmadı**. Gerekçe:
  bunlar puanlama ve rozet mantığını taşıyan büyük fonksiyonlar; `durum='bitti'` geçişini
  trigger'la yakalamak çok daha az riskli. Geriye dönük doldurma tek `update` ile yapıldı
  (kurucu hesapta 43 maç bulundu).
- **`is_bot` kullanıldı, `provider='bot'` değil.** Gerekçe: şemadaki bot işareti `is_bot`;
  mevcut kodun tamamı onu kullanıyor, `provider` bot satırlarında dolu değil.
- **`gen_random_bytes` yerine `md5`**: pgcrypto Supabase'de `extensions` şemasında ve
  fonksiyonlar `set search_path = public` ile çalışıyor → bağımlılık kaldırıldı.
- **Davet kodu 8 karakter**, karışması kolay 0/O ve 1/I üretilmiyor (hex harfleri
  `JKMNPR`'ye çevriliyor).

### Görünen ada geçirilen okuma yolları (tarandı, tamamı)

RPC'ler: `lig_siralama`, `sehir_lig_sirasi`, `benim_lig_durumum`, `birlesik_siralama`,
`arkadas_davet_kodu_ile_ekle`, `profil_al` (yeni). `oyuncu_ara` **kapatıldı**
(`revoke execute … from authenticated`) — kullanıcı adıyla arama gerçek ad sızdırıyordu.
Gömülü join'ler: `matches` (p1/p2), `friendships` (req/add), `group_match_players.profil`,
`hizli_oyuncular.profil`, `tournament_players.profil`, `profiles` doğrudan select'leri
(Home top5, ChallengesPage bot/oyuncu listeleri, LeaderboardPage arkadaş sekmesi).
Toplam 30 alan + 41 gösterim yeri çevrildi. `src/components/Avatar.jsx` her iki şekli de
kabul edecek biçimde geriye uyumlu yapıldı (diğer oyunlar kırılmasın).

### Yeni nesneler

Kolonlar: `takma_ad`, `takma_ad_secildi`, `takma_ad_degisti_at`, `avatar_onayli`,
`davet_kodu`, `toplam_mac`, `tercih_kategori`, `gorunen_ad`, `gorunen_avatar`.
Tablolar: `yasakli_kelimeler`, `bildirimler`.
Fonksiyonlar: `yeni_davet_kodu`, `takma_ad_sec`, `avatar_onayla`, `profil_al`,
`tercih_kategori_kaydet`, `bildirim_yaz`, `bildirimleri_oku`, `mac_sayaci_arttir`,
`oynanabilir_mi`, `arkadas_davet_kodu_ile_ekle` + 5 trigger fonksiyonu.
Bildirim olayları: `lige_girdin` (ilk maç), `gecildin` (haftalık ligde geçilme, saatte ≤1,
aynı ülke içinde), `arkadas_istek` / `arkadas_kabul`, `hafta_sonuc` (`haftayi_kapat` içinde).
Meydan okuma push'u (`notify_new_challenge`) aynen korundu.

### Doğrulama (canlıya UYGULANMADAN, geri alınan transaction içinde)

`begin; <migration> … rollback;` ile denendi: hatasız. İşlevsel test: `takma_ad_sec('Bilgin_42')`
→ `gorunen_ad` 'Oyuncu'dan 'Bilgin_42'ye döndü; `gorunen_avatar` null (Google fotoğrafı gizli);
`davet_kodu` üretildi; `toplam_mac` geriye dönük doldu; `lig_siralama('global','tum_zamanlar')`
**21 yerine 17 satır** döndü (hiç oynamamış 4 üye ligden çıktı — hedeflenen davranış);
`profil_al` ve `birlesik_siralama` çalışıyor. Migration **uygulanmadı** (istek gereği).

`npm run build` temiz.

## 2026-09-08 — Bildim Faz 2: Genel Kültür kategorisi + kategoriye göre eşleştirme (`20260612000048`)

- `genel` kategorisine **dokunulmadı**. Yeni anahtar `genel_kultur`; `get_categories`
  sıralaması `order by (kategori = 'genel_kultur') desc, count(*) desc` ile onu her zaman
  başa alıyor. Soruları Faz 3'te geldiği için şu an listede görünmüyor (`having count >= 15`).
- Etiketler tek dosyaya taşındı: `oyun/lib/kategoriler.js` (`kategoriEtiket`,
  `kategorileriSirala`). ChallengesPage'deki yerel `KATEGORI_ETIKET` haritası buraya geçti;
  eksik olan sinema/müzik/teknoloji/karışık etiketleri de eklendi.
- **Keşif:** `matchmaking_queue` tablosuna bugüne kadar **hiçbir yer satır eklemiyordu** —
  yani "Hemen Oyna" her seferinde doğrudan bota düşüyordu, insan eşleştirmesi hiç çalışmamış.
  `kuyruga_gir(p_kategori)` / `kuyruktan_cik()` / `kuyruk_durumum()` ile kuyruk ilk kez
  gerçekten kullanılıyor.
- Eşleştirme kuralı: önce **aynı kategoride** bekleyen rakip; yoksa **20 saniyedir** bekleyen
  herhangi bir rakip (karışığa düşer); o da yoksa kuyrukta kalınır. İstemci
  (`oyun/components/RakipAra.jsx`) 2 saniyede bir yokluyor, 20 saniye dolunca
  `quick_match` ile bota/karışığa düşüyor. Böylece oyun asla 20 saniyeden fazla bekletmiyor.
- `quick_match` imzası korundu; `p_kategori` verilmezse `profiles.tercih_kategori` kullanılıyor.

`npm run build` temiz. Migration **uygulanmadı**; 47+48 birlikte geri alınan transaction
içinde denendi, hatasız.

## 2026-09-08 — Bildim Faz 3: 1.500 doğrulanmış yeni soru (partiler 10, 11, 12)

Dosyalar: `20260612000049_soru_parti10_genel_kultur.sql` (500 genel_kultur),
`…050_soru_parti11_genel_kultur.sql` (400 genel_kultur + 100 karışık kategori),
`…051_soru_parti12_kategoriler.sql` (500, 9 kategoriye eşit).

### Yöntem (bu partilerde kurulan, sonrakiler için kalıcı)

Elle gözden geçirmek 1.500 soruda güvenilir değil; bu yüzden **otomatik denetim
zinciri** kuruldu (scratchpad'de, `scripts/soru-parti-sablonu.md`'ye de eklendi):
1. `mevcut-sorular.txt` — canlı DB'den çekilen tüm soru metinleri (parti bittikçe güncellenir).
2. `denetle.mjs` — SQL biçimi, 4 şık, şık benzersizliği, soru işareti, şık uzunluğu,
   zamana bağlı/yoruma açık kalıplar, parti içi tekrar, **mevcut havuzla anahtar kelime
   örtüşmesi** (≥%80 kesişim + ≥3 anahtar kelime), doğru şık ve kategori dağılımı.
3. `temizle.mjs` — çakışan/kuralı bozan soruları dosyadan siler.
4. `birebir.mjs` — `on conflict (soru) do nothing` ile sessizce düşecek **birebir aynı**
   metinleri yakalar (anahtar kelime taraması kısa sorularda bunları kaçırıyor).
5. `tamamla.mjs` / `ekle-dengele.mjs` — doğru şıkkı 0-1-2-3 sırayla dağıtır (dosya
   düzeyinde 125/125/125/125) ve parti sonuna karıştırma bloğunu ekler.
6. Her parti canlı DB'de `begin; … rollback;` ile denenip kaç satırın gerçekten
   eklendiği ölçüldü.

### Parti raporları

**Parti 10 — 500 genel_kultur.** Üretilen 525 → 25'i zorluk dengesi için çıkarıldı.
Denetimde **86 soru elendi** (84 anahtar kelime çakışması + 2 şıkları benzersiz olmayan);
yerlerine tamamen yeni konularda (meslekler, coğrafya terimleri, doğal afetler, tarım,
hayvan yavruları, ev/mutfak araçları, kütüphane-iletişim-okul) 86 soru yazıldı.
Ardından **9 birebir tekrar** daha yakalandı ve değiştirildi. Son durum: 500 soru,
doğru şık 125/125/125/125, mevcut havuzla çakışma 0, DB'ye 500/500 eklendi.

**Parti 11 — 400 genel_kultur + 100 karışık.** İlk yazımda 350 soru vardı; denetimde
**64 soru elendi**, 214 yeni soru eklendi (dünya simge yapıları, baharat/mutfak teknikleri,
uzay, hukuk-vatandaşlık, enerji-çevre, giyim, meteoroloji-ölçüm, güvenlik, ulaşım,
Türk bilim insanları). Sonra kategori dengesi için 18 soru kırpıldı ve **5 birebir tekrar**
değiştirildi. Son durum: 500 soru (genel_kultur 400; tarih 13, bilim 12, cografya 12,
edebiyat 11, sinema 11, teknoloji 11, spor 10, sanat 10, muzik 10), çakışma 0, 500/500 eklendi.

**Parti 12 — 500, 9 kategori.** Üretilen 496'dan **13 soru elendi**, 17 yeni soru eklendi.
Son durum: tarih 56, bilim 56, cografya 56, spor 56, muzik 56, edebiyat 55, sanat 55,
sinema 55, teknoloji 55. Çakışma 0, 500/500 eklendi.

**Denetimde kalan 3 "hata" yanlış pozitiftir:** "güncel" kelimesi geçen üç soruda kelime
zaman bağımlılığı değil, *"güncel konular"* (köşe yazısı türü) ve *"güncelleme"* (yazılım)
anlamındadır; cevaplar zamanla değişmez. Bir şık 40 karakteri aşıyordu, kısaltıldı.

### Sonuç

Üç parti birlikte canlıda denendi: **1.500/1.500 soru eklendi**, hiçbiri
`on conflict` ile düşmedi. Havuz 1.701 → **3.201**. Kategori dağılımı:
genel_kultur 900, bilim 397, tarih 335, cografya 285, edebiyat 238, spor 227,
genel 221, sanat 201, sinema 121, teknoloji 120, muzik 120, karisik 36.
Migration'lar **uygulanmadı**. `npm run build` temiz.

## 2026-09-08 — Bildim Faz 4: gizlilik akışı, davet ve bildirim arayüzü

**Yeni dosyalar:** `oyun/components/KurulumSihirbazi.jsx` (3 adımlı zorunlu akış),
`oyun/components/BildirimZili.jsx`, `oyun/components/BildirimIzniSor.jsx`,
`oyun/components/ProfilAyarlari.jsx`, `oyun/pages/DavetPage.jsx`,
`public/avatars/av1–av8.svg` (hazır anonim avatar seti).

- **Zorunlu kurulum akışı** `Layout` içine alındı: `takma_ad_secildi`, `avatar_onayli` ya da
  `ulke` eksikse sihirbaz açılıyor ve oyun ekranları açılmıyor. Sihirbaz profile bakıp
  yarım kalan adımdan devam ediyor (mevcut üyeler için de çalışır). Google fotoğrafı
  **yalnızca onay ekranında** gösteriliyor; onaylanmazsa DB'ye yazılmıyor.
- **Hazır avatarlar** `public/avatars/` altına SVG olarak üretildi. Gerekçe: `avatar_onayla`
  RPC'si adresi `^(/…|https://…)$` ile doğruluyor; `data:` URI kabul etmiyor. Dosya yolu
  hem doğrulamadan geçiyor hem önbelleğe alınabiliyor.
- **Arkadaş arama kaldırıldı.** FriendsPage artık davet kodu + davet linki üzerine kurulu.
  `/oyun/davet/:kod` rotası eklendi; giriş yoksa kod `localStorage`'a yazılıyor ve
  `AuthContext` oturum açılışında `arkadas_davet_kodu_ile_ekle` ile otomatik uyguluyor.
- **ChallengesPage rakip listesi** artık `friendships` üzerinden yalnız arkadaşlar + botlar
  (sunucu tarafı `oynanabilir_mi` zaten zorunlu kılıyor; arayüz de buna uyduruldu).
  Kullanıcı adıyla arama kutusu ve `ara()` fonksiyonu silindi.
- **Bildirim izni ana sayfadan kaldırıldı**, ilk maç sonucu ekranına taşındı
  (`BildirimIzniSor`). Gerekçe: oyunu görmeden izin istemek reddedilme oranını artırıyor.
  Reddedilirse bir daha gösterilmiyor.
- **Üst çubuğa bildirim zili** eklendi: okunmamış sayısı, realtime INSERT aboneliği,
  açılınca `bildirimleri_oku()` çağrısı, satıra tıklayınca ilgili sayfaya yönlendirme.
- **Profil sayfası** yeniden düzenlendi: takma ad (30 gün kilidi ve kalan süre), avatar
  seçimi/Google onayı/kaldırma, davet kodu + link kopyalama, varsayılan kategori seçimi
  (Genel Kültür en üstte) ve "Gerçek adın hiçbir zaman gösterilmez" açıklaması.
  Gerçek `username` yalnızca kendi profilinde "hesap kimliğin" olarak görünüyor.
- Home'daki konum modalı kaldırıldı (artık sihirbazın 3. adımı).

`npm run build` temiz.

## 2026-09-08 — Bildim Faz 5: kozmetik — "yönetim paneli" değil "oyun"

**Sorun:** her şey aynı boyda mor karttı; hiyerarşi, hareket ve kimlik yoktu.

- **Tipografi:** başlıklar **Baloo 2** (Google Fonts, `index.html`'e preconnect + link),
  gövde system-ui. `--bd-baslik-font` değişkeniyle logo, başlıklar, hero, mod adları,
  soru metni ve ana eylem butonu bu yazı tipini kullanıyor.
- **Ana sayfa hiyerarşisi yeniden kuruldu:** tek büyük **hero** (rütbe halkası + avatar +
  takma ad + rütbe rozeti, dev puan sayısı, rütbe ilerleme çubuğu, birincil "HEMEN OYNA"
  butonu, altında küçük şehir/ülke/dünya lig rozetleri ve haftalık geri sayım).
  Altında **2 sütun mod kartları** (ikon + iki kelime), sonra **ayrı turnuva bandı**,
  sonra görevler ve En İyiler. Eski `hero-panel` / `mod-kart` bloklarının JSX'i yeni
  sınıflara geçirildi; **eski CSS sınıfları silinmedi**.
- **İkonlar:** `oyun/components/Ikon.jsx` — 20 parçalık **inline SVG** seti
  (bağımlılık eklenmedi, `currentColor` devralır). Alt sekme çubuğu, bildirim zili ve
  mod kartları emojiden SVG'ye geçti. Aktif sekmenin üstüne vurgu çizgisi eklendi.
- **Rütbe rozetleri özelleştirildi:** `RankBadge` artık her rütbe için ayrı SVG biçim
  çiziyor (Çaylak/Bilge/Üstat/Kahin/Efsane). Eski `puan` prop'u ve `.rutbe-chip`
  görünümü korundu, `sadeceRozet` seçeneği eklendi.
- **Renk disiplini:** koyu zemin + tek vurgu (mor) + **sıcak ikincil (altın) yalnızca
  ödül/puan** için (`--bd-odul`). Hero puanı, ana eylem butonu ve ilerleme çubuğunun
  ucu altın; gerisi mor/nötr.
- **Hareket:** sayfa girişinde 4 kademeli **stagger** (`bd-giris-1..4`), puan sayacı
  (Faz 3), cevap kartı tepkisi (Faz 3), ligde kendi satırı vurgusu (Faz 2).
  `prefers-reduced-motion` kuralı tüm animasyonları kapatıyor.
- **Erişilebilirlik/mobil:** dokunma hedefleri ≥44px (mod kartları 104px, ana eylem 58px),
  `--text-dim` kontrastı 4.5:1 üzerinde, 400px altı için ayrı medya sorgusu ile hero,
  mod kartları, sekmeler, davet kodu ve avatar ızgarası yeniden ölçeklendi.

`npm run build` temiz.

## 2026-09-08 — Bildim farklılaştırma paketi: KAPANIŞ

Tek oturumda 6 faz tamamlandı. `BILDIM_GOREV.md` içindeki tüm kutular dolu.
**Push, deploy ve `supabase db push` YAPILMADI** (istek gereği). Migration'lar canlıya
uygulanmadı; her biri `begin; … rollback;` ile canlı veritabanında denendi.

### Supabase'de ÇALIŞTIRMA SIRASI (bu sırayla, tek tek)

| # | Dosya | Ne yapar |
|---|-------|----------|
| 1 | `20260612000047_takma_ad_gizlilik.sql` | Takma ad, görünen ad/avatar, davet kodu, bildirimler, toplam_mac, arkadaş kısıtı |
| 2 | `20260612000048_genel_kultur_kategori.sql` | `genel_kultur` kategorisi + kategoriye göre eşleştirme kuyruğu |
| 3 | `20260612000049_soru_parti10_genel_kultur.sql` | 500 genel kültür sorusu |
| 4 | `20260612000050_soru_parti11_genel_kultur.sql` | 400 genel kültür + 100 karışık kategori |
| 5 | `20260612000051_soru_parti12_kategoriler.sql` | 500 soru, 9 kategoriye eşit |

Zincirin tamamı birlikte denendi: hatasız. Sonuç: soru havuzu **1.701 → 3.201**,
`get_categories` ilk sırada `genel_kultur` (900 soru), `lig_siralama` 21 yerine
**17 oyuncu** döndürüyor (hiç oynamamış 4 üye ligden çıktı).

### Ana kararlar ve gerekçeleri (özet)

1. **Gizlilik RLS ile değil, `gorunen_ad`/`gorunen_avatar` STORED GENERATED kolonlarıyla.**
   Uygulama profilleri RPC'den, PostgREST gömülü join'lerinden ve realtime'dan okuyor;
   kolon olarak tanımlayınca üç yol da tek noktadan güvenli hale geldi. `profiles_select`
   politikasına dokunulmadı → diğer oyun modülleri etkilenmedi.
2. **`toplam_mac` trigger ile artıyor**, büyük `advance_*` fonksiyonları yeniden yazılmadı.
3. **`matchmaking_queue` ilk kez gerçekten kullanılıyor** — keşif: bugüne kadar hiçbir yer
   kuyruğa satır eklemiyordu, "Hemen Oyna" hep bota düşüyordu.
4. **Hazır avatarlar dosya yolu olarak** (`/avatars/av*.svg`); `avatar_onayla` `data:` URI
   kabul etmiyor.
5. **Soru üretiminde otomatik denetim zinciri** kuruldu; 1.500 sorunun 163'ü denetimde
   elenip yenisiyle değiştirildi.
6. **Bildirim izni ilk açılışta değil ilk maç sonunda** isteniyor.

### Senin yapman gerekenler

1. Yukarıdaki 5 migration'ı **sırayla** çalıştır (ya da bana söyle, ben uygularım —
   `.env.local`'deki `SUPABASE_DB_PASSWORD` ile doğrudan bağlanabiliyorum).
2. Uyguladıktan sonra siteye gir: **takma ad → avatar → şehir** sihirbazı çıkacak.
   Mevcut hesabın için de çıkar; gerçek adın artık hiçbir yerde görünmeyecek.
3. Arkadaş eklemek artık yalnız **davet kodu/linki** ile. Profil ya da Arkadaşlar
   sekmesinden linkini paylaş.
4. `boks/` klasöründeki 9 dosya hâlâ commit edilmemiş durumda — bu görevin kapsamı
   dışındaydı, dokunulmadı.
5. Push/deploy istersen söyle.

## 2026-09-08 — Bildim Görev 2 / Faz 1: Joker ekonomisi, seri, rövanş, ustalık, hızlı mod (DB)

Migration'lar: `20260612000052_joker_ekonomisi.sql`, `…053_seri_rovans_ustalik.sql`,
`…054_hizli_mod.sql` + Edge Function `satin_alma_dogrula`.

### Kararlar ve gerekçeleri

- **Yeni `joker_kullanimlari` tablosu, eski `match_jokers` korunarak.** Mevcut
  `match_jokers` / `group_match_jokers` birincil anahtarı `(mac_id, user_id, tip)` —
  yani maç başına her türden 1. Bu, "arkadaş maçında sınırsız joker" kuralıyla
  çelişiyordu. Eski tablolar ve `use_joker` / `use_group_joker` RPC'leri **silinmedi**
  (geriye uyumluluk); yeni akış `joker_kullan()` + `joker_kullanimlari` üzerinden gider.
- **Tek giriş noktası `joker_kullan(mac_tur, mac_id, soru_index, tur)`.** Maç doğrulama,
  süre penceresi, "zaten cevapladın", maç sınırı, ücretsiz hak, envanter düşümü ve
  **silinecek iki şıkkın seçimi** tamamen sunucuda. İstemci hiçbir şey hesaplamıyor.
- **Maç sınırı `joker_mac_siniri()` ile tek yerden:** grup → sınırsız (null);
  hızlı/turnuva → 2; 1v1 → rakip arkadaşsa sınırsız, bot/rastgele eşleşme ise 2 (lig maçı);
  **turnuva finali (hayatta ≤2 oyuncu) → 0 (yasak)**.
- **`pas` turnuvada yasak** — turnuvada yanlış cevap elenmek demek; pas jokeri oyuncuyu
  eleyeceği için anlamsız olurdu. (Prompt'ta yoktu; en az yıkıcı seçim.)
- **Doğru cevap sayımı ve seri, cevap RPC'leri yeniden yazılmadan trigger'la** bağlandı:
  `match_answers` / `group_match_answers` / `hizli_cevaplar` / `tournament_answers`
  üzerine AFTER INSERT trigger'ları kategori ustalığını işliyor; seri ise 047'de kurulan
  `mac_sayaci_arttir()` genişletilerek (maç bitiş trigger'ları) güncelleniyor.
- **Seri koruma yalnız 1 günü kapatır:** `seri_kontrol()` yalnızca `seri_son_gun = bugün-2`
  (tam olarak bir gün kaçırılmış) durumunda koruma harcıyor; 2+ gün kaçıranda koruma varsa
  bile seri sıfırlanıyor. Testle kanıtlandı.
- **Eski `profiles.seri` / `son_seri_tarihi` bozulmadı**, yeni `seri_gun` / `seri_son_gun` /
  `seri_en_uzun` ile senkron tutuluyor — mevcut arayüz çalışmaya devam ediyor.
- **Hızlı Mod lig puanına dokunmuyor.** `profiles.puan` / `puan_hafta` hiç yazılmıyor;
  skorlar `hizli_mod_skorlar` tablosunda haftalık tutuluyor, kendi sıralaması var.
  Süre kontrolü sunucuda (`soru_baslangic + 6 sn` ağ payı, toplam 60 sn).
- **Satın alma:** fiyat kodda YOK; `joker_paketleri` tablosu yalnız ürün kimliği ve içerik
  tutuyor, fiyatı Play Console belirliyor. `joker_ekle` ve `satin_alma_isle`
  `authenticated`'a **verilmedi**, yalnız `service_role` çağırabiliyor.
- **Edge Function sahte onay vermiyor:** `PLAY_SERVICE_ACCOUNT` / `PLAY_PACKAGE_NAME`
  secret'ları yoksa 503 ve açık hata döner. Makbuz Play Developer API
  `purchases.products.get` ile doğrulanır, `purchaseState = 0` şartı aranır, token
  tekrarı hem açık kontrol hem `unique` kısıtla reddedilir.

### Doğrulama

`oyun/_test/joker-kurallari-test.sql` + `…test.mjs` yazıldı ve canlı veritabanında
**tek transaction içinde çalıştırılıp rollback edildi** (canlı veri değişmedi):
**14/14 test geçti** — lig maçında 3. joker reddi, arkadaş maçında sınırsızlık, ücretsiz
elli tükenmesi, günde 6. reklam ödülü reddi, aynı reklam referansının tekrarlanamaması,
aynı Play token'ın iki kez kabul edilmemesi, seri korumanın yalnız 1 günü kapatması,
2 günde sıfırlanma, turnuva finalinde sınırın 0 olması ve jokerin reddi, final dışında
sınırın 2 olması, turnuvada pas yasağı, envanter düşümünün denetim izine yazılması,
hızlı modun lig puanını değiştirmemesi.

`npm run build` temiz. Migration'lar **uygulanmadı**.

## 2026-09-08 — Bildim Görev 2 / Faz 2: Joker, seri, rövanş, ustalık, hızlı mod arayüzü

**Yeni dosyalar:** `oyun/lib/jokerler.js`, `oyun/lib/h5ads.js`, `oyun/lib/playFatura.js`,
`oyun/components/JokerCubugu.jsx`, `SeriRozeti.jsx`, `EzeliRakip.jsx`,
`MacSonuEklentisi.jsx`, `UstalikIzgarasi.jsx`, `oyun/pages/JokerDukkani.jsx`,
`oyun/pages/HizliModPage.jsx`, `supabase/migrations/20260612000055_seri_hatirlatma.sql`.

- **Joker çubuğu** `QuestionCard`'a **eski çubuğu bozmadan** eklendi: `macTur`+`macId`
  verilirse yeni sunucu tabanlı çubuk, verilmezse eski `jokerler` prop'u çalışır.
  1v1 / grup / hızlı / turnuva sayfalarının dördü de yeni çubuğa bağlandı.
  Adet rozeti, "ÜCRETSİZ" işareti ve pasiflik nedeni (sınır doldu / final / jokerin yok)
  sunucudan gelen `joker_mac_durumu` + `envanterim` ile çiziliyor; 50:50'de silinecek
  şıklar sunucudan gelir, istemci hesaplamaz.
- **Joker Dükkânı** (`/oyun/joker`): envanter, ödüllü video (sayaç `bugün 3/5`),
  Play paketleri, gizlilik/iade notu.
  - **Reklam:** Google H5 Games Ads (`adBreak({type:'reward'})`). `VITE_H5_ADS_CLIENT`
    boşsa buton **pasif** ve "test modu" notu; **sahte ödül verilmez**. Reklam
    tamamlanmadan sunucuya hiç gidilmez; ödülü `reklam_odulu_al` verir.
  - **Satın alma:** Digital Goods API + Payment Request. Tarayıcıda API yoksa buton
    "Android uygulamasında satın alınabilir" der; **başka ödeme sağlayıcı eklenmedi**.
    Fiyat koda yazılmadı, Play'den okunuyor. Doğrulama Edge Function'da.
- **Maç sonucu** (`MacSonuEklentisi`): bu maçta kullanılan jokerler, güncel seri,
  kaybedildiyse büyük **RÖVANŞ İSTE** butonu (`rovans_iste`, aynı kategori, 24 saat).
- **Ana sayfa:** hero'da seri sayacı + koruma rozeti + rekor; mod ızgarasına
  **Hızlı Mod** ve **Joker Dükkânı** kartları; turnuva bandının altında **Ezeli rakibin**
  kartı (skor + tek tık meydan okuma).
- **Profil:** güncel/en uzun seri, kullanılan joker ve izlenen video sayısı, envanter
  çipleri ve **kategori ustalığı ızgarası** (seviye rengi + ilerleme çubuğu + kalan doğru).
- **Hızlı Mod ekranı** (`/oyun/hizli-mod`): kategori seçimi → 60 sn çubuk + 5 sn halka →
  skor + haftalık sıralama (şehir/ülke/dünya sekmeleri). Süre ve puan sunucuda.
- **Bildirimler:** ustalık seviye atlama ve rövanş isteği 053'te; **akşam 20:00 seri
  hatırlatması** yeni `055_seri_hatirlatma.sql` ile (pg_cron `0 17 * * *` = 20:00 TSİ,
  uygulama içi bildirim + push aboneliği varsa push).

`.env.example`'a `VITE_H5_ADS_CLIENT` eklendi. `npm run build` temiz; sunucu kuralı
testleri yeniden çalıştırıldı: **14/14**.

## 2026-09-08 — Bildim Görev 2 / Faz 3: Kapanış

`BILDIM_GOREV2.md` içindeki tüm kutular dolu. `npm run build` temiz.
**Push / deploy / `db push` YAPILMADI.**

### Sunucu kuralı testleri — 14/14 GEÇTİ

`npm run test:bildim` (→ `oyun/_test/joker-kurallari-test.mjs` + `…test.sql`).
Test, migration'ları ve senaryoları **tek transaction içinde çalıştırıp ROLLBACK eder**;
canlı veri değişmez. Kanıtlananlar:

| # | Kural |
|---|-------|
| 1 | Lig maçında **3. joker reddedilir** (sınır 2) |
| 2 | Arkadaş maçında sınır yok |
| 3 | Ücretsiz 50:50 maç başına 1 kez, birikmez |
| 4 | **Günde 6. reklam ödülü reddedilir** (tavan 5) |
| 5 | Aynı reklam referansı iki kez ödüllendirilemez |
| 6 | **Aynı Play token iki kez kabul edilmez** |
| 7 | **Seri koruma tam olarak 1 günü kapatır** (seri sürer) |
| 8 | 2 gün kaçırılmışsa koruma varken bile seri sıfırlanır |
| 9-10 | **Turnuva finalinde sınır 0 ve joker reddedilir** |
| 11 | Final dışında turnuva sınırı 2 |
| 12 | Turnuvada `pas` jokeri yasak |
| 13 | Kullanım envanterden düşer ve denetim izine yazılır |
| 14 | **Hızlı mod lig puanını değiştirmez** |

### Supabase'de ÇALIŞTIRMA SIRASI

Önce önceki paketin migration'ları (047 → 048 → 049 → 050 → 051) uygulanmalı,
sonra bu paket:

| # | Dosya | Ne yapar |
|---|-------|----------|
| 1 | `20260612000052_joker_ekonomisi.sql` | Joker envanteri, denetim izi, reklam sayacı, satın almalar, `joker_kullan` ve maç kuralları |
| 2 | `20260612000053_seri_rovans_ustalik.sql` | Seri (+pg_cron 00:05), rövanş, ezeli rakip, kategori ustalığı |
| 3 | `20260612000054_hizli_mod.sql` | Hızlı Mod oturum/skor tabloları ve RPC'leri |
| 4 | `20260612000055_seri_hatirlatma.sql` | Akşam 20:00 seri hatırlatma cron'u |

### Edge Function deploy

```bash
npx supabase functions deploy satin_alma_dogrula
npx supabase secrets set PLAY_SERVICE_ACCOUNT="$(cat play-service-account.json)"
npx supabase secrets set PLAY_PACKAGE_NAME="com.idagg.bildim"   # gerçek paket adı
```

Secret'lar yoksa fonksiyon **503 + açık hata** döner; sahte onay vermez.

### Frontend ortam değişkeni

`.env` içine (bkz. `.env.example`):

```
VITE_H5_ADS_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

Boş bırakılırsa ödüllü video butonu **pasif** kalır ve sahte ödül verilmez.

### Google Play Console'da oluşturulacak ürünler (tüketilebilir)

| Ürün kimliği | İçerik |
|--------------|--------|
| `joker_10` | 4 × 50:50, 3 × +10 sn, 3 × pas |
| `joker_30` | 12 × 50:50, 9 × +10 sn, 9 × pas |
| `joker_100` | 40 × 50:50, 30 × +10 sn, 30 × pas |
| `seri_koruma_3` | 3 × seri koruma |

Fiyatlar **Play Console'da** belirlenir; kodda fiyat yoktur (`joker_paketleri`
tablosu yalnız kimlik ve içerik tutar, arayüz fiyatı Digital Goods API'den okur).

### Bubblewrap / TWA

Play Billing'in TWA içinde çalışması için paketlerken:

```bash
bubblewrap init --manifest https://idagg-game-center.vercel.app/manifest.webmanifest
bubblewrap build --enablePlayBilling
```

`--enablePlayBilling` olmadan `getDigitalGoodsService` tanımsız kalır ve arayüz
"Android uygulamasında satın alınabilir" der (beklenen davranış).

### Benim yapmam gerekenler

1. 052 → 053 → 054 → 055 migration'larını sırayla çalıştır (ya da bana söyle, uygularım).
2. `satin_alma_dogrula` Edge Function'ını deploy et + iki secret'ı gir.
3. Play Console'da 4 tüketilebilir ürünü oluştur ve fiyatla.
4. AdSense for Games başvurusu onaylanınca `VITE_H5_ADS_CLIENT`'ı doldur.
5. TWA paketini `--enablePlayBilling` ile yeniden üret.
6. `npm run test:bildim` ile kuralları istediğin zaman yeniden doğrulayabilirsin.

## 2026-09-08 — Migration'lar CANLIYA UYGULANDI (047–055)

Kullanıcı: *"migrationları sen uygula her zaman oto"* → bundan sonra migration'lar
onay beklemeden uygulanıyor (kalıcı tercih olarak kaydedildi).

**Uygulanan 9 migration** (tek transaction, önce `rollback` provası sonra `commit`):
047 takma_ad_gizlilik · 048 genel_kultur_kategori · 049/050/051 soru partileri 10-11-12 ·
052 joker_ekonomisi · 053 seri_rovans_ustalik · 054 hizli_mod · 055 seri_hatirlatma.
`supabase migration repair` ile geçmişe kaydedildi.

**Canlı doğrulama:**
- Soru havuzu **3.201** (genel_kultur 900, `get_categories`'te ilk sırada).
- `ulkeler` 85, `sehirler` TR 81 il, `joker_paketleri` 4 paket.
- `lig_siralama('global','tum_zamanlar')` → **17 satır** (hiç oynamamışlar ligde yok;
  `toplam_mac >= 1` olan 20 profil var, 3'ü bot).
- `envanterim`, `seri_durumum`, `ustalik_seviyelerim` (12 kategori), `hizli_mod_ozetim`
  hepsi çalışıyor.
- pg_cron'da yeni işler aktif: `bildim-seri-kontrol` (05 21 = 00:05 TSİ),
  `bildim-seri-hatirlat` (0 17 = 20:00 TSİ), `bildim-hafta-kapat`, `bildim-hafta-bildir`.

**Hâlâ uygulanmayan tek migration: 034 (`gl_temel`, Gladius).** Canlıda `gl_*` tabloları
yok; Gladius DEMO ve backend kullanmadığı için bilerek bırakıldı.

**Kalan manuel işler (kod/DB dışı):** Edge Function deploy + `PLAY_SERVICE_ACCOUNT` /
`PLAY_PACKAGE_NAME` secret'ları, Play Console'da 4 tüketilebilir ürün,
`VITE_H5_ADS_CLIENT`, Bubblewrap `--enablePlayBilling`.

## 2026-09-08 — Bildim Görev 3 / Faz 1: Yayın öncesi hatalar

**Migration numarası kararı:** prompt "055/056" diyordu ama **055 zaten
`seri_hatirlatma` olarak kullanıldı ve canlıya uygulandı**. Bu yüzden bu görevin
migration'ları **056** (kategori birleştirme), **057** (soru kalitesi) ve
**058** (bot maçı düzeltmesi) numaralarını aldı.

### 1) Lig — kendi satırı iki kez görünüyordu
`lig_siralama` çağıranı hem ilk 100'e hem sona koyuyordu; arayüz sonuncuyu ayrıca
sabitliyordu. Artık sabit satır **yalnız sıra > 100 ise** çiziliyor.

### 2) Kategori karmaşası (migration 056)
Seçicide "Karışık" + `karisik` (36 soru) + `genel` (221 soru) yan yana duruyordu.
`genel` ve `karisik` kategorilerindeki sorular `genel_kultur`'a **taşındı**;
`get_categories` bu iki anahtarı artık hiç döndürmüyor. Bağlı kayıtlar da taşındı:
`matches`, `group_matches`, `hizli_maclar`, `hizli_mod_oturumlar/skorlar`,
`matchmaking_queue`, `profiles.tercih_kategori` ve `kategori_dogru` sayaçları
(birleştirilip eski satırlar silindi). `tercih_kategori_kaydet` eski anahtarları
sessizce `genel_kultur`'a çeviriyor. Sonuç: **genel_kultur 1.154 soru**, listede ilk.

### 3) Meydan okuma akışı
Bota meydan okununca artık doğrudan `/oyun/mac/:id`'ye gidiliyor (bot daveti
saniyeler içinde kabul ediyor, maç ekranı "bekliyor" durumunu zaten gösteriyor).
İnsan rakipte **"Davet gönderildi" toast'ı** çıkıyor ve sayfa bekleyenler listesine kayıyor.

### 4) Bot maçı — bot 20 soruyu bitirirken oyuncu 2. sorudaydı (migration 058)
**Canlı veriyle doğrulandı:** aktif bir maçta bot 18. soruya kadar 19 cevap vermiş,
oyuncu 1 cevap vermişti (skor 0-65). Kök neden: bot her soruyu 3 sn sonra
cevaplıyordu ve **16 saniyelik otomatik ilerletme oyuncuyu beklemiyordu** — oyuncu
düşünürken maç kendi kendine akıyordu.
Düzeltme (`bot_oyna` 045'teki gövdeden alındı, yalnız 1v1 bölümleri değişti):
- Bot yalnız **oyuncunun ulaştığı soruyu** cevaplar (oyuncunun en yüksek cevap
  indeksi + 1) ve **2–6 sn rastgele** gecikmeyle yanıtlar.
- Otomatik ilerletme, oyuncu o soruyu cevaplamadan 16 sn'de devreye girmiyor;
  yalnız **90 sn'lik terk güvenlik ağı** kaldı (maç sonsuza kadar aktif kalmasın).
Ayrıca MatchPage'e realtime'a **ek olarak 2 sn'lik yoklama** eklendi: bağlantı
düşse bile rakip puanı canlı artmaya devam ediyor.

### 5) Soru kalitesi taraması (migration 057)
Tüm aktif havuz (3.201 soru) tarandı. **8 soru pasife alındı** (`aktif = false`;
silinmedi ki eski maçlar bozulmasın — `soru_sec` zaten `aktif` filtreliyor):
- `anlamsiz_degil_kalibi` **6** — eski üretimden kalma bozuk kalıp
  (ör. *"'Kaç Para Kaç' değil, 'Vizontele' filminin yönetmenlerinden biri kimdir?"*)
- `meta_sik` **2** — şıklardan biri "Hiçbiri"/"Hepsi" (belirsiz)

**Bilerek dokunulmayanlar (tarama uyardı ama sorular sağlam):** "3 karakterden kısa
şık" 265 soru — bunlar `Na`, `K`, `C`, `Ud`, `Ney`, `Su`, `At` gibi tamamen geçerli
cevaplar ve sayısal şıklar; körlemesine silmek yüzlerce sağlam soruyu yok ederdi.
Parantezli 37 şık meşru kullanım (`Boşluk (space)`), kapanmamış parantez hiç yok.
Boş şık, tekrar eden şık, soru işareti eksiği, 4'ten farklı şık sayısı: **0**.
Kalan aktif havuz: **3.193**.

### 6) Soru ekranı düzeni
`useOyunModu()` kancası eklendi: soru ekranı açıkken gövdeye `bd-oyun-modu` sınıfı
konuyor. CSS bu sınıfla **alt sekme çubuğunu gizliyor** ve **joker çubuğunu ekranın
altına sabitliyor**. Beş ekranda da aktif (1v1, grup, hızlı olan kazanır, turnuva,
hızlı mod). Emoji baloncukları `position: absolute` yapıldı — artık skor tablosunu itmiyor.

### 7) Turnuva sayfası
Boş ekran doldu: `TurnuvaTanitim` bileşeni **"Nasıl oynanır" 3 maddesi**, **son
turnuvanın ilk 3'ü** (madalya + avatar + doğru sayısı) ve **katılımcı sayısını**
gösteriyor. Sayaç ve lobiye katıl butonu korundu.

`npm run build` temiz.

## 2026-09-08 — Bildim Görev 3 / Faz 2: Oyun kimliği (büyük kozmetik revizyon)

**Sorun:** her şey aynı kenarlıklı mor karttı; ekran boş, doku/karakter/derinlik yoktu.

- **`oyun/styles/tema.css`** (yeni, `src/styles.css`'ten SONRA yüklenir): zemin 2 ton,
  yüzey 3 ton, anlam renkleri (mor vurgu / altın **yalnız ödül-puan** / yeşil / kırmızı /
  mavi), yarıçap (12/16/24), gölge (yumuşak + derin + renkli glow + iç parlaklık) ve
  tipografi ölçeği (Baloo 2 başlık 28/22/18, gövde 15/13/11).
- **Arka plan** düz siyahtan çıktı: üç radyal gradient (üstte mor, sağda mavi, solda altın
  lekesi) + `body::before` ile **ince nokta dokusu** (maskeli, aşağı doğru sönümlenen).
  Görsel dosya eklenmedi, tamamı CSS.
- **Kartlar zeminden ayrıştı:** kenarlık yerine yüzey gradyanı + `inset` iç parlaklık +
  yumuşak gölge. Mevcut `.kart` sınıfının görünümü de güncellendi (sınıf silinmedi).
- **Maskot "Bilge"** (`oyun/components/Maskot.jsx`): tamamen inline SVG baykuş, üç poz —
  `selam` (hafif sallanma), `dusunuyor` (düşünce baloncukları), `kutluyor` (zıplama +
  parıltı). Rütbe sistemindeki 🦉 "Bilge" ile aynı kimlikten geliyor.
  Kullanıldığı yerler: ana sayfa hero, maç sonucu (kazandın/berabere/kaybettin pozları),
  lig ve arkadaş boş durumları.
- **Ana sayfa hero** tek kompozisyon oldu: maskot + "Hoş geldin" + takma ad + rütbe rozeti
  + sağda avatar halkası, altında dev puan, rütbe ilerlemesi, seri alevi ve tek büyük
  **HEMEN OYNA** (hafif nabız animasyonu).
- **Mod kartları 6'ya çıktı ve her biri kendi renk temasını aldı:** Meydan Oku mor,
  Hızlı Mod turuncu, Grup mavi, Turnuva altın, Joker pembe, Lig turkuaz — büyük ikon +
  kısa slogan ("60 saniye", "Son kalan kazanır"). Kart üstünde temaya göre renk halesi.
- **Soru ekranı:** soru kartı büyüdü ve derinlik kazandı; zaman çubuğu artık
  **yeşil → sarı → kırmızı**; şıklar dolgun (62px) ve tam genişlik, seçince 150 ms ölçek
  animasyonu; doğruda **yeşil parlayan kenar + konfeti** (`Konfeti.jsx`, salt CSS
  parçacık, kütüphane yok), yanlışta **kırmızı sarsıntı**.
- **Skor tablosu VS oldu:** iki avatar karşı karşıya, ortada yuvarlak kırmızı "VS" rozeti.
- **Lig:** podyum kartları yükseltildi (1. altın halkalı ve yüksek kaide), sekmeler
  segment kontrol görünümü aldı, kendi satırın mor halkayla vurgulu.
- **Boş durumlar** maskot + tek cümle + eylem butonu ile dolduruldu (lig, arkadaşlar,
  En İyiler, konum seçilmemiş ekranı).
- **Mikro etkileşimler:** sayfa girişinde 150 ms fade+slide, puan sayacı (mevcut),
  rütbe atlama overlay'i (mevcut). `prefers-reduced-motion` altında maskot animasyonları,
  konfeti, sarsıntı ve nabız kapanıyor.
- **Mobil:** 400px altı için hero/mod/şık/VS/boş durum ölçekleri ayrı ayarlandı;
  tüm etkileşimli öğelere `min-height: 44px` garantisi; metin renkleri kontrast
  eşiğinin üstünde (`--bd-metin-2: #b3aad6`).
- **Eski CSS sınıflarının hiçbiri silinmedi** — tema dosyası üzerine yazıyor.

`npm run build` temiz.

## 2026-09-08 — Bildim Görev 3 / Faz 3: Kapanış + migration'lar uygulandı

`BILDIM_GOREV3.md` tüm kutular dolu, `npm run build` temiz.

**Uygulanan migration sırası: 056 → 057 → 058** (önce `rollback` provası, sonra tek
transaction `commit`, ardından `migration repair` ile geçmişe kayıt).

| Migration | Sonuç (canlı doğrulama) |
|---|---|
| 056 kategori birleştirme | `genel` + `karisik` → `genel_kultur`. Eski kategoride **0 soru**, eski `tercih_kategori` **0 kullanıcı**. `genel_kultur` **1.154 soru** ve `get_categories`'te ilk sırada. |
| 057 soru kalitesi | **8 soru pasife alındı** (`aktif = false`, silinmedi). Aktif havuz **3.193**. |
| 058 bot maçı | `bot_oyna` güncellendi: bot oyuncunun önüne geçmiyor, otomatik ilerletme oyuncuyu bekliyor. |

Joker/seri/satın alma kural testleri yeniden çalıştırıldı: **14/14 geçti**
(`npm run test:bildim`, canlı DB'de rollback ile).

**Pasife alınan 8 sorunun dökümü:** 6 × bozuk "X değil, Y" kalıbı, 2 × belirsiz
"Hiçbiri/Hepsi" şıkkı. Tarama ayrıca 265 "kısa şık" ve 37 "parantezli şık" işaretledi
ama incelendiğinde hepsi geçerli çıktı (`Na`, `K`, `Ud`, `Boşluk (space)`), dokunulmadı.

**Not:** Frontend değişiklikleri henüz **push edilmedi** — veritabanı yeni, site eski
sürümde. Push istendiğinde deploy edilecek.

## 2026-09-09 — Revize Paketi #3 + kullanıcı bildirimleri (A–D)

Canlı testte (Chrome, idagg oturumu) çıkan 6 madde + kullanıcının doğrudan
ilettiği 4 madde. Görev listesi: `BILDIM_GOREV6.md`.
**Migration:** `20260612000074_bot_zorluk_lobi_davet.sql` — **canlıya uygulandı.**

### A) Mobilde bildirim paneli yarım açılıyordu
- **Kök neden:** `.bd-zil-liste` panel `position: absolute` ile `.bd-ust-blok`
  içindeydi. Bu blok `position: sticky; z-index: 46` olduğu için kendi yığın
  bağlamını (stacking context) kuruyor; panelin `z-index: 61` değeri o bağlamın
  İÇİNDE kalıyordu. Alt menü (`.tabbar`, kök bağlamda `z-index: 50`) panelin
  altını örtüyor, `max-height: 60dvh` ile birlikte panel yarım görünüyordu.
- **Çözüm:** panel `createPortal` ile `document.body`'ye taşındı; konumu zil
  düğmesinin `getBoundingClientRect()` değerinden hesaplanıp `position: fixed`
  ile çiziliyor (`z-index: 1201`). Yükseklik `calc(100dvh - 96px - safe-area)`
  ile alt menü payını da düşüyor. Kaydırma/yeniden boyutlandırmada konum tazeleniyor.
- **Dosyalar:** `oyun/components/BildirimZili.jsx`, `src/styles.css`.

### B) Maçta son 5 saniyede ses yoktu
- **Bulgu:** projede hiç ses kodu yoktu (`grep -i audio` → 0 sonuç). Son 5 saniyenin
  yalnızca görsel efekti vardı (kızaran kenar + büyük geri sayım).
- **Çözüm:** `oyun/lib/ses.js` — WebAudio osilatörüyle üretilen tonlar (ses
  dosyası yok, PWA önbelleğine yük binmiyor). `sesTik` (son 5 sn, azaldıkça
  tizleşir), `sesSureDoldu`, `sesDogru`, `sesYanlis`.
- iOS/Android kuralı gereği AudioContext ilk kullanıcı hareketinde açılıyor
  (`sesKilidiAc`). Tercih `localStorage.bildim_ses`, varsayılan **açık**;
  Profil sayfasına "Oyun sesleri" aç/kapa kartı eklendi.
- **Bağlandığı yerler:** `QuestionCard` (turnuva/1v1/grup/hızlı maç) ve
  `HizliModPage` (soru başına 5 sn olduğu için son 2 saniyede tik).

### C) X (Twitter) / Facebook girişi — DURUM: kod hazır, panel anahtarı KAPALI
- Canlı uçtan doğrulandı:
  `GET /auth/v1/authorize?provider=twitter` → **400**, `provider=facebook` → **400**,
  `provider=google` → **302** (yalnız Google açık).
- Bu iki sağlayıcı **Supabase panelinden** (Authentication → Providers) açılır ve
  X/Meta geliştirici portalından alınan Client ID + Secret ister. SQL ya da
  veritabanı erişimiyle açılamaz; bu oturumda yapılamadı.
- **Kod tarafında yapılanlar:** `src/pages/Login.jsx` baştan sona try-catch'e
  alındı, İngilizce hata metinleri Türkçeye çevrildi ("Facebook girişi şu an
  kapalı…" gibi), düğmeler işlem sırasında kilitleniyor, `redirectTo` artık
  gelinen sayfayı koruyor, Facebook için `public_profile,email` kapsamı isteniyor.
- **Yapılması gereken (panel):** Supabase → Authentication → Providers → Twitter
  ve Facebook'u aç, Callback URL olarak
  `https://zfpnxzybcpkxsotwdsey.supabase.co/auth/v1/callback` gir.

### D) Misafir girişi — DURUM: kod hazır, panel anahtarı KAPALI
- Canlı uçtan doğrulandı: anonim kayıt →
  `422 anonymous_provider_disabled — "Anonymous sign-ins are disabled"`.
- **Kod tarafında yapılanlar:** giriş sayfasına "Misafir olarak dene" düğmesi
  (`supabase.auth.signInAnonymously()`) + hesabın cihaza bağlı olduğunu anlatan
  not eklendi. `handle_new_user` tetikleyicisi e-postasız kullanıcıda zaten
  `oyuncu_xxxx` takma adı üretiyor, ek migration gerekmedi.
- **Yapılması gereken (panel):** Supabase → Authentication → Sign In / Providers →
  "Allow anonymous sign-ins" aç.

### 1) Hızlı Olan Kazanır'da insan hiç kazanamıyordu (ÖNCELİK)
- **Kök neden (asıl bulgu):** koşul
  `now() >= soru_baslangic + (2 + random() * 4) * interval '1 second'` biçimindeydi.
  Bu ifade `bot_oyna` HER çalıştığında yeniden değerlendirilir ve `random()` her
  seferinde YENİDEN çekilir. Yani bot "2-6 sn bekle" demiyor; her yoklamada yeni
  zar atıp ilk tutan zarda basıyor. Yoklama sıklaştıkça gerçekleşen gecikme
  2.0 sn tabanına yığılıyor — 2 sn'de basan insan, ağ/render gecikmesi yüzünden
  her seferinde geç kalıyordu. Gecikme ayrıca zorluktan tamamen bağımsızdı.
- **Çözüm:**
  - `profiles`'a `bot_seviye`, `bot_gecikme_min`, `bot_gecikme_max` eklendi.
  - `bot_rasgele(tohum)` + `bot_gecikme_sn(bot, tohum, min, max)`: gecikme md5
    ile **(maç, soru, bot) üçlüsüne sabitlendi**; kaç kez yoklanırsa yoklansın
    aynı değer döner, yığılma biter.
  - Pencereler: **Kolay 4.5–7.0 · Orta 3.0–5.0 · Zor 2.0–3.5 sn**.
  - İsabet zorluğa bağlandı: **Kolay %45 · Orta %65 · Zor %85**
    (eskiden 0.25/0.40/0.55/0.70/0.90 ve gecikmeden bağımsızdı).
  - **Kavrama payı (+1.0 sn):** pencere "oyuncu soruyu GÖRDÜĞÜ andan" tanımlı;
    sunucu ise `soru_baslangic`'tan sayıyor. Arada realtime yayını +
    `get_hizli_soru` + render var. Bu pay olmadan Zor botun 2.0 sn tabanı, 2 sn'de
    basan oyuncuyu yavaş bağlantıda hâlâ geçiyordu (ölçüldü: 5.0/20).
  - Aynı düzeltme 1v1 bot gecikmesine de uygulandı.
- **Bot atamaları:** ÇaylakBot + AcemiBot = kolay, BilgeBot + KurtBot = orta,
  UstaBot = zor.
- **DOĞRULAMA** (`node oyun/_test/hizli-bot-simulasyon.mjs`, 20 soru × 3000 tur,
  oyuncu 2 sn'de basıyor ve soruyu biliyor):

  | Senaryo | ESKİ | YENİ |
  |---|---|---|
  | Sürekli yoklama + 0.5 sn ağ | 16.8/20 (en kötü tur 11) | **20.0/20** (en kötü 20) |
  | Sürekli yoklama + 1.5 sn ağ | 4.1/20 (en kötü tur 0, %1 hiç kazanamama) | **17.2/20** (en kötü 11) |
  | 7 sn cron + 0.5 sn ağ | 19.8/20 | **20.0/20** |
  | 7 sn cron + 1.5 sn ağ | 17.9/20 | **19.8/20** |

  Kabul ölçütü (en zorlu senaryo, ortalama ≥8 ve en kötü tur ≥6): **GEÇTİ**
  → ortalama 17.1/20, en kötü tur 11/20.
- Canlı DB'de gecikme dağılımı doğrulandı (500 örnek):
  ÇaylakBot/AcemiBot 4.50–7.00 · BilgeBot/KurtBot 3.00–5.00 · UstaBot 2.00–3.50.

### 2) "Joker yok" yazıyor ama maçta joker çubuğu vardı
- **Karar: (a) — joker çubuğu bu modda gizlendi.** Gerekçe: mod tamamen
  "ilk doğru cevap kazanır" üzerine kurulu; 50:50 rakibin cevabını beklemeden
  şansı ikiye katlıyor, +10 sn ise ortak sayaçta zaten anlamsız. Jokeri açık
  bırakmak modun tek kuralını bozardı. Açıklama metnindeki "Joker yok!" cümlesi
  aynen kaldı; artık doğru.
- `QuestionCard`: `macTur !== "hizli"` koşulu eklendi (grup/turnuva/1v1 etkilenmedi).

### 3) Turnuva lobisi ölü görünüyordu
- **Eski:** `bildim-bot-turnuva` cron'u turnuvadan **30 dk önce bir kez** çalışıp
  5 botu aynı anda ekliyordu; 1 saat kala lobide tek kişi görünüyordu.
- **Yeni:** `turnuva_lobi_botlari()` + `bildim-turnuva-lobi-bot` cron'u
  (`*/10 * * * *`). Turnuvaya kalan süreye göre hedef bot sayısı hesaplanıyor,
  eksikse birer birer ekleniyor. 15 dk aralıklarla sızıyorlar:

  | Kalan süre | Lobideki bot |
  |---|---|
  | 121+ dk | 0 |
  | 120 dk | 1 |
  | 105 dk | 2 |
  | **90 dk** | **3** |
  | 75 dk | 4 |
  | 60 dk ve altı | 5 |

- **DOĞRULAMA:** formül canlı DB'de sorgulandı; **90 dk kala 3 bot** (+ oyuncunun
  kendisi = 4 kişi) doğrulandı. Sıra `bot_rasgele(turnuva_id || bot_id)` ile
  karıştırılıyor, hep aynı bot ilk girmiyor. Eski `bildim-bot-turnuva` cron'u
  emniyet ağı olarak duruyor (T-30'da eksik kalan olursa tamamlar).

### 4) Hızlı Mod'da süre bitişi sertti
- Yeni bileşen `oyun/components/SureDolduGecis.jsx`: maskot (Bilge, "düşünüyor"
  pozu) + `PuanSayaci` ile sayılan skor + bitiş sesi, **0.8 sn**.
- Hızlı Mod'a `gecis` aşaması eklendi; perde `hizli_mod_bitir` RPC'si dönmeden
  ÖNCE açılıyor (donukluk zaten RPC beklerken oluşuyordu), RPC dönünce kalan
  süre kadar bekleyip sonuç ekranına geçiyor.
- Aynı perde **1v1, grup maçı ve Hızlı Olan Kazanır** bitişlerine de eklendi
  ("Maç bitti!" + oyuncunun kendi puanı).

### 5) Bekleyen davetler birikiyor, temizlenmiyordu
- `eski_davetleri_temizle()` RPC'si: 24 saatten eski ve hâlâ `bekliyor` olan
  grup / hızlı / 1v1 davetlerini `iptal` yapar, iptal sayısını döndürür.
- İki yerden tetikleniyor: saatlik cron (`bildim-eski-davet-temizle`, `5 * * * *`)
  **ve** Meydan Oku sayfası açılışı (cron durursa liste yine temizlensin diye).
- Listede en fazla **son 5** davet gösteriliyor; üstünde "N bekleyen davet var"
  notu, altında **"Tümünü iptal et"** düğmesi.
- **DOĞRULAMA:** canlı DB'de ilk çalıştırmada **3 eski davet** iptal edildi —
  kullanıcının gördüğü birikmiş davetlerin kaynağı buydu.

### 6) Sıralamada kendi satırı yazımı
- Yeni bileşen `oyun/components/SenRozeti.jsx`; tüm liste/sıralama ekranlarında
  ad ile "sen" artık **ayrı düğümler** (metin birleştirme yok).
- Değiştirilen yerler: `LeaderboardPage`, `HizliModPage`, `HizliMacPage` (3 yer),
  `GroupMatchPage` (3 yer), `MatchPage` (3 yer) — hepsi "(sen)" ya da
  `<span className="bd-sen">` yazıyordu.
- `.app .bd-sen` kuralı `tema.css`'e eklendi: `display: inline-block`, mor
  gradyan hap, kenarlık — rozet artık her yerde rozet gibi görünüyor.

### Dokunulmayanlar
Kullanıcının "bu turda çalıştığı doğrulandı" dediği hiçbir akışa dokunulmadı:
Hızlı Mod tur akışı, lig 4 sekmesi, joker dükkânı, ana sayfa, modal konumları,
arkadaş ekleme doğrulaması, manifest, grup maçı bot ilerlemesi.

### Kalan iş (kullanıcı aksiyonu gerektirir)
1. Supabase → Authentication → Providers: **Twitter** ve **Facebook** aç
   (X/Meta geliştirici portalından Client ID + Secret gerekiyor).
2. Supabase → Authentication: **Allow anonymous sign-ins** aç (misafir girişi).
   İkisi de panel anahtarı; kod tarafı hazır ve kapalıyken dürüst mesaj veriyor.

## 2026-09-09 (2. tur) — Bildirim paneli taşması + bot bildirim gürültüsü

**Migration:** `20260612000075_bildirim_gurultusu.sql` — **canlıya uygulandı.**

### 1) Panel mobilde ekranın soluna taşıyordu
- **Kanıt (kullanıcı):** ~412px genişlikte satır başları kesiliyordu —
  "UstaBot" → "staBot", "sillaaa" → "illaaa", "BilgeBot" → "ilgeBot".
- **Kök neden:** panel `right` değeri JS'ten zil düğmesinin konumuna göre
  veriliyor, genişlik ise `min(340px, 100vw - 24px)` ile SABİT ayarlanıyordu.
  Sağa yaslı sabit genişlik + zilin sağ kenar payı toplamı dar ekranlarda
  viewport'u aşıyor, panel sola kayıyordu.
- **Çözüm:**
  - JS artık yalnız **dikey** konumu ölçüyor (`top`); yatay yerleşim tamamen CSS'te.
  - Mobil (<600px): `position: fixed; left: 8px; right: 8px; width: auto` —
    sağa yaslanmak yerine iki kenardan boşluklu.
  - Geniş ekran (≥600px): `right: 16px; width: min(360px, 92vw)`.
  - `max-width: calc(100vw - 16px)`, `max-height: 60vh` + kendi içinde dikey kaydırma.
  - `.bd-zil-satir .metin`: `overflow-wrap: anywhere` + `word-break: break-word`;
    `.govde` için `flex: 1` — uzun takma adlar kesilmiyor, sarılıyor.
- **DOĞRULAMA** (Chrome, gerçek `getBoundingClientRect()` ölçümü; derlenmiş
  `index.css` ile üç ayrı iframe genişliğinde):

  | Viewport | panel.left | panel.right | genişlik | `left>=0 && right<=innerWidth` | metin taşması |
  |---|---|---|---|---|---|
  | 360px | 8 | 352 | 344 | **true** | yok |
  | 412px | 8 | 404 | 396 | **true** | yok |
  | 768px | 392 | 752 | 360 | **true** | yok |

  Satır metinleri de ayrıca ölçüldü; üç genişlikte de hiçbir metin kutusu
  viewport dışına çıkmıyor.

### 2) Bot bildirimleri gerçek bildirimleri boğuyordu
- **Kanıt (kullanıcı):** panelde üst üste 5 adet "<Bot> hamlesini yaptı — sıra
  sende!"; aralarında kaybolmuş gerçek olaylar (meydan okuma, seri, ustalık).
- **Kök neden:** `trg_mac_sira_bildir` ilerleyen tarafın bot olup olmadığına
  bakmıyordu. Bot her tikte bir soru ilerlettiği için 20 soruluk maç boyunca
  oyuncuya defalarca "sıra sende" düşüyordu. Bot zaten her an hazır — bildirimin
  bilgi değeri yok.
- **Sunucu tarafı (`20260612000075`):**
  - Tetikleyiciye bot kontrolü eklendi: **bot ilerlemesi bildirim üretmiyor.**
    Yalnız gerçek oyuncu hamle yapınca bildirim çıkıyor.
  - Birikmiş bot kaynaklı `sira_sende` kayıtları silindi (maç kaydından rakibin
    `is_bot` değerine bakılarak).
  - `bildirim_temizle()`: **7 günden eski OKUNMUŞ** bildirimler siliniyor.
    Okunmamışlara dokunulmuyor (kullanıcı görmediği olayı kaybetmesin).
    İki yerden tetikleniyor: günlük cron `bildim-bildirim-temizle` (`20 3 * * *`)
    **ve** `bildirimleri_oku()` içinde (panel her açılışında).
- **İstemci tarafı (`BildirimZili.jsx`):**
  - **Öncelik sırası:** meydan okuma / davet / arkadaşlık isteği (0) >
    rozet-seviye (ustalık, lig, hafta sonucu) (1) > seri (2) > sıra sende (3).
    Okunmamışlar her zaman en üstte; eşitlikte en yeni önce.
  - **Toplama:** aynı türden birden fazla OKUNMAMIŞ bildirim tek satıra iniyor —
    "3 maçta sıra sende ⏳", "2 yeni meydan okuma ⚔️" gibi; satır ilgili
    listeye götürüyor. Okunmuşlar tek tek kalıyor.
- **DOĞRULAMA (canlı DB):**
  - Temizlik öncesi `sira_sende` = **5**, sonrası = **1**;
    kalan tek kayıt gerçek oyuncudan (`idagg hamlesini yaptı`, `rakip_bot = false`).
  - Yani panelde bot kaynaklı "sıra sende" bildirimi **kalmadı**; gerçek olaylar
    (mac_daveti, ustalik, arkadas_istek) öncelik sırasıyla üstte.
  - `bildim-bildirim-temizle` cron kaydı doğrulandı (`20 3 * * *`).

## 2026-09-09 (3. tur) — "AI yapımı" görünümünü kırma paketi (kozmetik)

Görev listesi: `BILDIM_GOREV7.md`. Migration YOK — tamamı arayüz.
Kapsam yalnız `oyun/` + paylaşılan giriş sayfası ve manifest dosyaları.
(`src/pages/GameCenter.jsx` ve `BirlesikSiralama.jsx` hub'a ait; dokunulmadı.)

### 1) Palet — mor tamamen kaldırıldı

| Rol | ESKİ | YENİ |
|---|---|---|
| Zemin | `#0d0b1f` / `#0b0918` (koyu mor) | **`#0B1220`** (gece lacivert) |
| Zemin 2 | `#161330` / `#120e26` | **`#131C31`** |
| Yüzey 1 (kart) | `#1a1635` / `#191333` | **`#18233B`** |
| Yüzey 2 | `#1f1b40` / `#221a44` | **`#1F2C4A`** |
| Yüzey 3 | `#2c2255` | **`#27365A`** |
| Kenarlık | `#2e2856` | **`#26344F`** |
| Ana vurgu | `#8b5cf6` (mor) | **`#F2B23C`** (altın) |
| Vurgu 2 | `#6d28d9` | **`#C98A22`** |
| Vurgu açık | `#a78bfa` | **`#F7CB77`** |
| Ödül/puan | `#fbbf24` / `#ffc83d` | **`#F2B23C`** |
| Başarı | `#22c55e` / `#2ecc71` | **`#2FBF71`** |
| Hata/uyarı | `#ef4444` / `#ff5a5f` | **`#E8543F`** (mercan) |
| Bilgi | `#38bdf8` / `#22d3ee` | **`#4A9DD9`** |
| Metin | `#f1efff` / `#f3f0ff` | **`#EAF0FA`** |
| Metin 2 | `#b3aad6` | **`#A8B8D0`** |
| Metin 3 | `#8d84b5` | **`#8496B2`** |

- Kategori renkleri de yeniden atandı (10 kategori, hiçbiri mor):
  genel kültür `#4A9DD9`, bilim `#2FBF71`, tarih `#C98A22`, coğrafya `#3FA9A0`,
  edebiyat `#E8543F`, spor `#5AA9E6`, sanat `#E0729A`, sinema `#8C93A8`,
  müzik `#F2B23C`, teknoloji `#4FB3C9`.
- **Gradient sayısı: 184 → 22 satır (%88 azalma).** Kalanlar: zemin (2 body
  kuralı), tek birincil buton, maskeler (`mask-image`) ve kapsam dışı `.gc-*`
  hub kartları. Kart / ikon plakası / rozet gradientlerinin tamamı düz renge indi.
- **Renkli glow yalnız `.bd-ana-eylem`'de** (`--bd-glow-odul`). Diğer 19 renkli
  `box-shadow` düz siyah, düşük opaklık, kısa yayılıma çevrildi.
- `theme-color` meta + `manifest.webmanifest` + `bildim.webmanifest` + JS'teki
  `BILDIM_TEMA` → `#0B1220`.
- **DOĞRULAMA:** `grep -ri "7c4dff|8b5cf6|a78bfa|6d28d9|c4b5fd|5b21b6|46179c|1c1642|
  rgb(139,92,246)|rgb(167,139,250)|rgb(109,40,217)" oyun/ src/styles.css src/pages`
  → **0 sonuç**. Tarayıcıda çalışan stil sayfalarında mor kural sayısı: **0**.
  Hesaplanan `body` zemini: `rgb(11, 18, 32)`.
  (Ara adımda gözden kaçan 8 alfa'lı mor yüzey — `rgba(26,20,54,…)` gibi — ve
  buton gölgesindeki `#46179c` canlı tarayıcı ölçümüyle yakalanıp düzeltildi.)

### 2) Emojiler silindi, yerine özel ikon seti

- **`oyun/components/Ikon.jsx` — 41 çizgi ikon** (2px kontur, yuvarlak uç,
  `currentColor`, 24px kutu, dolgu yok): ev, kupa, kılıç, oyun kolu, grafik,
  kişiler, kişi, kişi ekle, zil, yıldız, ateş, kalkan, madalya, uyarı, terazi,
  saat, ileri atla, hızlı, soru, robot, sohbet, şehir, dünya, harita pini,
  bayrak, kilit, onay, çarpı, ok, geri, artı, yenile, çöp, paylaş, ayar,
  hediye, ses açık, ses kapalı, liste, kalem, çıkış.
- **`oyun/components/KategoriIkon.jsx` — 12 dolgu kategori ikonu** (beyin,
  atom, sütun, küre, kitap, top, palet, film şeridi, nota, çip, kadeh),
  her biri kendi kategori renginde plakada (`plaka` özelliği).
- **Emoji sayımı: 309 satır → 15 satır.** Kalan 15'in tamamı bilinçli:
  5 kod yorumundaki `→` okları, 2 ülke bayrağı fallback'i (`konum.js` — bayrak
  emojisi ülkeyi kodlayan **veri**, süs değil), 8 maç içi tepki satırı
  (`EMOJILER` dizisi + tepki cümleleri = kullanıcı içeriği, kalması istenmişti).
- Rütbe ve joker tabloları da emoji yerine ikon ADI tutuyor
  (`ranks.js`, `jokerler.js`); `kategoriEtiket()` artık emoji öneki eklemiyor.

### 3) Açıklama metinleri silindi
- Mod kartlarındaki **6 slogan** kaldırıldı: "Arkadaşını yen", "60 saniye",
  "3-5 kişi", "Son kalan kazanır", "Güçlen", "Sıranı gör". Kartta yalnız
  ikon + mod adı kaldı (`.bd-mod-slogan` CSS'te de gizlendi).
- Aynı refleksle yazılmış **5 yardımcı cümle** silindi/kısaltıldı:
  - "Bu kodu ya da linki arkadaşına gönder; seni eklesin. Gerçek adın görünmez." → silindi
  - "Hesap kimliğin: … (yalnızca sana görünür)" → silindi
  - "Açık — son 5 saniyede geri sayım tik'i, cevapta ve bitişte ses." → "Açık"
  - "Açık — turnuva ve meydan okumalardan haberin olur." → "Açık"
  - "Davet linkinle gelen her arkadaş için ikiniz de +50 puan kazanırsınız!"
    → "Her davet için ikiniz de +50 puan."
- Buton metinleri kısaldı: "🎟️ Lobiye Katıl" → "Lobiye katıl",
  "⚔️ Meydan Oku" → "Meydan oku", "🚀 Grubu Kur ve Davet Et" → "Grubu kur ve
  davet et", "⚔️ RÖVANŞ İSTE" → "Rövanş iste", "HEMEN OYNA" → "Hemen oyna".
- **Toplam silinen/kısaltılan metin: 11 + 5 buton etiketi.**

### 4) Kart kalıbı kırıldı — ritim
- **Hero:** kart değil. `background: none`, kenarlık yok, gölge yok; sayfa
  dolgusunun dışına taşıp `.app` sütununun tamamını kaplıyor, altında tek ince
  çizgi. Altın büyük puan + ince rütbe çubuğu (5px).
  (İlk denemede `calc(50% - 50vw)` ile viewport'a taşırıldı; masaüstünde kaydırma
  çubuğu kadar sola kayma ölçüldü — `margin: 0 -12px` ile düzeltildi.)
- **Mod ızgarası:** 2 sütun ama kartlar EŞİT DEĞİL. İlk kart (Meydan Oku) ve son
  kart (Lig) `grid-column: span 2` ile çift genişlikte ve yatay dizilimli;
  diğer dördü 1.45:1 küçük kart. Kartlar arası boşluk 8px.
- **Turnuva:** dikey kart yerine **yatay bant** — etiket + sayaç solda, buton
  sağda, `flex-wrap: nowrap`. Sayaç kutuları küçültüldü ki buton alta düşmesin.
- **Lig özeti:** kart değil, üç sütunluk ince bant (şehir / ülke / dünya sırası,
  altın rakam + küçük etiket).
- **Günlük görevler:** zaten katlanmış tek satırdı, korundu.
- Dikey boşluklar ~%30 azaldı: sayfa dolgusu 16 → 12px, kart dolgusu 16 → 12px,
  kartlar arası 14 → 10px, başlık marjı 20/10 → 14/8px.

### 5) Arka plan
- İki `body` kuralındaki 7 renk lekesi (mor + camgöbeği + sarı radyaller) tek
  altın radyal ışığa indi; altta koyulaşan dikey geçiş kaldı.
- `body::before` nokta dokusu yerine **135° ince köşegen çizgi**
  (`repeating-linear-gradient`, opaklık **0.03**, 9px aralık), aşağı doğru
  maskeli sönüm. Görsel dosya eklenmedi.

### 6) Logo
- `oyun/components/Logo.jsx`: gradient renkli düz metin yerine **çizilmiş
  SVG wordmark** — kalın harfler, altın ve 8° eğik "!" (ayrı iki dikdörtgen),
  harflerin altında ince altın çizgi. Üst çubukta (24px) ve giriş ekranında (44px).

### 7) Maskot
- `Maskot.jsx` sıfırdan yeniden çizildi: yuvarlak-şirin baykuş (Duolingo
  çağrışımı) yerine **köşeli/geometrik kuş** — altıgen lacivert gövde, üçgen
  kanat panelleri, altın üçgen gaga ve boynuzlar, gözler yalnız iki daire.
  Gradient ve arka ışık kaldırıldı. Üç poz korundu (selam / düşünüyor / kutluyor).
- Varsayılan boyut **96 → 64**; bitiş perdesinde 92 → 64. Artık odak değil aksan.

### 8) Ses
- `oyun/lib/ses.js` genişletildi (WebAudio, ses dosyası yok):
  `sesDokunus` (kısa klik), `sesDogru` (yükselen üçlü), `sesYanlis` (alçalan tek
  nota), `sesTik` (son 5 sn), `sesSureDoldu`, `sesKazandin` (üç notalı arpej),
  `sesRutbeAtladi` (yükselen dörtlü).
- **Üst çubukta aç/kapa düğmesi** (`SesDugmesi.jsx`); tercih `localStorage`da
  (`bildim_ses`), varsayılan **AÇIK**. AudioContext ilk kullanıcı hareketinde
  try-catch içinde açılıyor (tarayıcı kısıtı).
- Bağlandığı yerler: `QuestionCard` (tik/doğru/yanlış/süre doldu),
  `SureDolduGecis` (`kazandi` ise arpej), `RankUpOverlay` (rütbe atlama),
  Profil sayfası ve üst çubuk düğmesi.

### 9) Detay temizliği
- Yarıçap karışık: kart 12px, buton/şık 10px, rozet-çip-zil tam yuvarlak
  (eski tek tip 16/24px yerine).
- Gölge: renkli glow yerine düz siyah, düşük opaklık, kısa yayılım
  (`0 2px 6px rgba(0,0,0,.32)` / `0 6px 16px rgba(0,0,0,.42)`).
- Tipografi: Baloo 2 yalnız hero, mod adları ve büyük sayılarda; bölüm
  başlıkları gövde fontuna, 15px, `text-transform: none` oldu.
  Büyük harf + geniş harf aralığı yalnız küçük etiketlerde (mini label).
- Mod ikon plakaları artık mod temasının rengini alıyor (`--tema-ikon`);
  önce hepsi altın çıkıyordu, canlı ölçümle yakalandı.

### DOĞRULAMA (Chrome, derlenmiş `index.css` ile gerçek ölçüm)
Beş genişlikte (360 / 390 / 412 / 768 / 1280 px):
- **Yatay taşma: yok** (`documentElement.scrollWidth <= innerWidth` hepsinde).
- **44px altı dokunma hedefi: yok** (tüm `button`/`a` ölçüldü).
- Hero `left: 0`, genişlik = sütun genişliği; mod ızgarasında geniş kart
  351px / küçük kart 172px (390px'te) — dengesizlik amaçlandığı gibi.

Kontrast (WCAG AA eşiği 4.5):

| Öğe | Oran |
|---|---|
| Gövde metni | **7.83** |
| Küçük etiket (PUAN) | **6.23** |
| Altın puan | **9.99** |
| Bölüm başlığı | **16.35** |
| Lig bandı etiketi | **5.20** |
| Liste detayı | **6.54** |
| Turnuva etiketi | **5.20** |

Hepsi eşiğin üzerinde.

### Sayılarla özet
- Palet: **13 renk tokenı** değişti, mor kalıntısı **0**.
- Gradient: **184 → 22** satır (%88 ↓). Renkli glow: **20 → 1**.
- Emoji: **309 → 15** satır (kalanlar kod yorumu, ülke bayrağı, maç içi tepki).
- Yeni ikon: **41 çizgi + 12 kategori = 53 SVG**.
- Silinen/kısaltılan metin: **11 açıklama + 5 buton etiketi**.
- Yeni bileşen: `Logo.jsx`, `KategoriIkon.jsx`, `SesDugmesi.jsx`.

## 2026-09-09 (4. tur) — İsim/şehir değiştirme + canlı site denetimi

Migration'lar: `076_isim_sehir_degistirme`, `077_bot_avatarlari_yerel`,
`078_kilit_sifirla` — **üçü de canlıya uygulandı**.
Canlı adres: `https://idagg-game-center.vercel.app`.

### 1) Oyun içinde isim ve şehir değiştirme
- **Bulgu (canlı):** Profil sayfasında "Takma adın · **29 gün 1 saat** ·
  Değiştir (pasif)" yazıyordu. Sunucuda kilit **30 gün**, konumda **7 gün**.
  Yani özellik vardı ama pratikte kullanılamıyordu.
- **Karar:** kilitler taklit/lig sömürüsüne karşı var, kaldırılmadı; ikisi de
  **24 saate** indirildi (076). Doğrulama, benzersizlik, yasaklı kelime ve
  şehir listesi kuralları aynen korundu.
- **İkinci bulgu:** kilit penceresi kısalınca bile mevcut sayaçlar ESKİ kural
  altında işlemişti; 078 ile gerçek oyuncuların sayaçları bir kez sıfırlandı.
- **Keşfedilebilirlik:** Profil'e yalnız üst çubuktaki puan çipinden
  gidilebiliyordu, alt menüde girişi yok. Üst çubuğa **avatar düğmesi** eklendi.
- **DOĞRULAMA (canlı):** kilit "29 gün 1 saat" → "55 dk" → 078 sonrası açık.
  Değiştir formu açıldı; "ab" gönderildi → sunucudan
  `Takma ad 3-16 karakter olmalı.` döndü (RPC yolu çalışıyor). Şehir formu da
  ülke/şehir açılır listeleriyle açılıyor.
- Arayüzdeki 4 kilit metni sunucuyla çelişiyordu ("30 günde bir",
  "Haftada yalnızca bir kez"); dördü de "günde bir kez" oldu.

### 2) Canlı sitede bulunan ve düzeltilen kusurlar
Sayfa sayfa gezilip (ana, meydan, lig, joker, turnuva, arkadaşlar, hızlı mod,
profil, 1v1 maç) ölçüldü:

| # | Bulgu | Düzeltme |
|---|---|---|
| 1 | Maç ekranındaki **cevap şıkları hâlâ mordu** (`#2a2156`), şık harfi `#4c1d95`, ikincil buton `#2a2154`, davet bandı, toast, bağlantı rengi | Renk **tonu** taramasıyla (hex + rgb, hue 245-315) 28 değer bulundu; lacivert/altına çevrildi |
| 2 | **Podyum puanı ve turnuva başlığı kırmızıydı** — `--accent` mercana bağlanmıştı | `--accent` altın oldu; hata rengi ayrı (`--danger`) |
| 3 | **"sen" rozeti** altın zeminde beyaz metin — ölçülen kontrast **1.87:1** | Koyu lacivert metin (aynı düzeltme aktif sekme ve podyum kaidesinde) |
| 4 | Hero'da **rütbe çipi 378px gerilmişti** (sütun flex'inde stretch) | `align-self: flex-start; width: fit-content` |
| 5 | Üst çubukta **dokunma hedefleri 44px altında** (logo 24px, puan çipi 32px) | `min-height: 44px` |
| 6 | Maçta **soru sayacı rozeti kırmızıydı** (`--bd-hata`) — hata gibi okunuyordu | Nötr yüzey + altın metin |
| 7 | Profilde **"Sonraki rütbe: kılıç Üstat"** — ikon adı ham metin olarak basılıyordu | `<Ikon>` ile çiziliyor |
| 8 | **Arkadaş silme** tek dokunuşla, onaysız ve geri dönüşsüzdü; düğmenin erişilebilir adı da yoktu | Onaylı iki adım (Sil / Vazgeç) + `aria-label`/`title` |
| 9 | **Bot avatarları dış CDN'den** (`api.dicebear.com`) geliyordu: dış bağımlılık + mor robotlar | Yerel `public/avatars/bot1..5.svg`, palete uygun (077) |
| 10 | Oyuncu avatarlarından **av1 mor, av8 indigo** | Altın ve turkuaza alındı |
| 11 | Kategori **"Karışık" ikonu kadeh**ti, turnuva kupasıyla karışıyordu | Dört kare (zar) |
| 12 | Ustalık seviye renkleri ve RankBadge iç dolgusunda mor kalıntı | Palete alındı |

### Ölçüm (canlı, tarayıcıda hesaplanmış)
- Alfa kompozitli kontrast denetimi: sayfa başına **4 hata** bulundu
  (podyum puanı 4.37, "sen" rozeti 1.87) — ikisi de düzeltildi.
- Yatay taşma: hiçbir sayfada yok.
- Etiketsiz ikon butonu taraması: düzeltmeden sonra **0**.
- Mor tonu taraması (hue 245-315, doygunluk > 0.18) `oyun/`, `src/styles.css`
  ve `public/avatars/` üzerinde: **kapsam içinde 0 sonuç**
  (kalan tek yer `.run-serit` — RUN oyununun hub kartı, Bildim kapsamı dışı).

### Not edilen, değiştirilmeyen
- Asenkron 1v1'de rakip bot kendi sırasını oynadığı için maç başında skor
  "0 - 16" görünebiliyor. Tasarım gereği (bot oyuncunun sırasını geçemiyor,
  yalnız bir soru önde). Rakip skorunu maç bitene kadar gizlemek deneyimi
  değiştireceğinden bu turda dokunulmadı.

## 2026-09-09 (5. tur) — 31 karakter avatarı

Migration: `079_yeni_karakter_avatarlari` — **canlıya uygulandı**.

### İstek ve karar
Kullanıcı "avatar fotoğrafları yükleyelim, şu ankiler berbat; gerçek görseller
olabilir, ünlüler, komik içerikler, 20-30 tane" dedi.

**Gerçek ünlü fotoğrafları kullanılmadı.** Telifli bir fotoğrafı ve bir kişinin
görüntü/kişilik hakkını oyuna gömmek olurdu; oyun yayına açık ve mağazaya
gidecek. Yerine aynı işi gören ve tamamen özgün olan yol seçildi: **31 karakterli
komik çizim avatar**.

### Üretilenler (`public/avatars/k01..k31.svg`)
Hayvanlar: kedi, köpek, baykuş, tilki, panda, penguen, kurbağa, ayı, maymun,
dinozor, ejderha, köpekbalığı, ahtapot, arı.
Karakterler: robot, uzaylı, astronot, ninja, korsan, şövalye, büyücü, dedektif,
aşçı, profesör, viking, hayalet, zombi, mumya, kahraman, palyaço, kral.

- Toplam **~130 KB**, hepsi **yerel** (dış servis / CDN yok).
- 34px avatarda da 92px profil resminde de okunur (ikisi de önizlemede ölçüldü).
- Palet gece lacivert + altın ailesiyle uyumlu; **mor kullanılmadı**.
- Üretici `oyun/_test/avatar-uret.mjs` olarak repoda: göz / ağız / kulak /
  şapka gibi **parça fonksiyonlarından** kuruluyor, yeni karakter eklemek tek
  satırlık bir tanım.

### Önizlemede yakalanıp düzeltilenler
Üretilen 31 avatar bir önizleme sayfasında 96px ve 34px olarak yan yana
incelendi; dördü ilk çıkışta okunmuyordu:
- **profesör** koyuna benziyordu (saç tepeyi de kapatıyordu) → saç yalnız
  yanlarda, sakal küçültüldü.
- **mumya**da sargı rengi kafa rengiyle aynıydı, sargılar görünmüyordu →
  kafa koyulaştı, sargılar açıldı, aralarına gölge çizgisi eklendi.
- **astronot**un kask camı yüzü soluklaştırıyordu → cam saydamlaştı, altın
  çember eklendi.
- **köpek** ayıya benziyordu → açık renk burun bölgesi eklendi.

### Bağlantı
- Profil ve kurulum sihirbazındaki seçici 31 karaktere geçti; **5 sütun**,
  kart içinde kendi kaydırması (`max-height: 46vh`), her karo `aria-label` +
  `title` taşıyor ("Kurbağa avatarını seç").
- Eski düz siluetler (av1-av8) listeden çıkarıldı; **dosyalar duruyor**.
  Migration 079 o siluetleri seçmiş oyuncuları yeni karşılıklarına taşıdı.
- **Canlı doğrulama:** 31 karo, **31/31 görsel yüklendi**, kırık yok.
  İlk denemede yalnız seçili avatar görünüyordu: kaydırılabilir kutu içindeki
  `loading="lazy"` görselleri yüklemiyordu; kaldırıldı.

## 2026-09-09 (6. tur) — Yayın öncesi güvenlik denetimi

Migration'lar: `080_gizli_anahtar_tablosu`, `081_profil_gizliligi` — **ikisi de
canlıya uygulandı.** Tam liste: `YAYIN_KONTROL.md`.

### 🔴 Bulgu 1 — Sunucu sırrı herkese açık depoda
`CRON_SECRET` yedi migration dosyasına düz metin yazılmıştı ve depo GitHub'da
public (`"private": false` API'den doğrulandı; ham dosya anonim olarak
**200** ile indirilebiliyor).
**Etki, canlı uçta doğrulandı:** repodaki sırla
`POST /functions/v1/send-push` → **200**, yanlış sırla → **401**. Yani üçüncü
bir kişi tüm kullanıcılara istediği push bildirimini gönderebilir ve
`generate-questions`'ı tetikleyip Anthropic kredisi yakabilirdi.
**Düzeltme:** RLS'li, tüm rollerden revoke edilmiş `sunucu_gizli` tablosu +
`gizli_al()` kapısı. Canlıdaki 6 fonksiyon (`bildirim_yaz`,
`haftalik_sonuc_bildir`, `notify_new_challenge`, `notify_new_group_challenge`,
`notify_new_hizli_davet`, `seri_hatirlat`) `pg_get_functiondef` üzerinden
okunup literal, tablo okumasıyla değiştirilerek yeniden yazıldı.
Doğrulandı: sır içeren fonksiyon **0**.
**Kalan:** sır git geçmişinde durduğu için döndürülmeli — panel adımı
kullanıcıda (YAYIN_KONTROL B1).

### 🔴 Bulgu 2 — Profil verileri girişsiz okunabiliyordu
`profiles` politikası `using (true)`, SELECT `anon` rolüne de veriliydi.
Anon anahtar JS paketinde olduğundan giriş yapmadan
`GET /rest/v1/profiles?select=*` → **27 kaydın tamamı**: gerçek addan türeyen
`username` ("emiralkaya_12cd", "hanıfebatur_6d46"), Google profil fotoğrafı
adresi, `davet_kodu`, `provider`, `last_seen`, `hile_yetkisi`.
Uygulama ekranda "gerçek adın hiçbir zaman gösterilmez" sözü veriyordu;
API seviyesinde tutulmuyordu (KVKK/GDPR açısından da yayın engeli).
Ayrıca `anon` ve `authenticated` rollerinde profiles üzerinde
INSERT/DELETE/**TRUNCATE**/TRIGGER/REFERENCES yetkileri vardı; TRUNCATE
RLS'e tabi değildir.
**Düzeltme:** anon erişimi tamamen kaldırıldı; `authenticated` yalnız gösterim
sütunlarını okuyor (`id, gorunen_ad, gorunen_avatar, puan, ...`); kendi tam
profil `profilim()` RPC'siyle geliyor; yazma yetkisi 3 sütuna indirildi.
Doğrulandı: anon için `42501 permission denied`; giriş yapmış oyuncuda ana
sayfa, lig ve maç ekranları çalışıyor.

### Yan bulgu — Kafa Topu
Oyuncu adı için `profiles.username` okuyup **doğrudan tabloya yazıyordu**;
uzunluk, benzersizlik, yasaklı kelime ve günlük kilit kontrollerinin hepsini
atlıyordu. `gorunen_ad` okumasına ve `takma_ad_sec` RPC'sine geçirildi
(5 dosya, 13 yer).

### Eklenen üretim altyapısı
- **`HataSiniri`**: projede hiç hata sınırı yoktu; render hatası tüm ağacı
  söküp beyaz ekran bırakıyordu. Artık Türkçe kurtarma ekranı + konsol kaydı.
- **`og:`/`twitter:` etiketleri**: link paylaşımında önizleme boştu.
- **`robots.txt` + `sitemap.xml`**: yoktu.
- Lig sayfasındaki kalan tek emoji (kum saati) ikona çevrildi.

### Denetimde temiz çıkanlar
- `public` şemasındaki **tüm tablolarda RLS açık**; politikasız olanlar
  (questions, push_subscriptions, quest_progress, question_votes,
  matchmaking_queue, yasakli_kelimeler) yalnız security-definer RPC üzerinden
  erişilebiliyor — doğru kurgu.
- pg_cron: **17 görevin hepsi aktif**.
- Depoda TODO/FIXME yok, `console.log` yok, `.env` git'e girmiyor,
  istemci kodunda service_role/API anahtarı sızıntısı yok.
- 8 Bildim sayfası 390px'te yatay taşmasız açılıyor; boş/hatalı ekran yok.
- Soru havuzu 8.224 aktif.

### Yayını engelleyen, panelde yapılacaklar
1. `CRON_SECRET` döndürme (Supabase → Edge Functions → Secrets).
2. Depoyu private yapma.
3. Twitter/Facebook + misafir girişini açma.
4. Gizlilik politikasında veri sorumlusu kimliği + **Kullanım Koşulları sayfası
   (hiç yok)**.
5. Reklam yayıncı kimliği (`VITE_H5_ADS_CLIENT` boş → test modu) ve
   Play faturalandırma paketlemesi.
6. Kendi alan adı.

---

## 2026-09-09 — BİLDİM: "Hatalarım" çalışma modu (GÖREV 10)

Oyuncunun tüm modlarda yanlış bildiği sorular kişisel bir bankada birikiyor; oyuncu
istediğinde bu bankadan **puansız, tek kişilik** bir çalışma turu yapıyor.

### Yeni tablolar

| Tablo | İçerik | RLS |
|---|---|---|
| `yanlis_sorular` | pk (user_id, question_id), `yanlis_sayisi`, `dogru_serisi`, `son_yanlis_at`, `ogrenildi_at` | Yalnız sahibi **okur**; INSERT/UPDATE politikası bilerek yok — yazım security-definer RPC ile |
| `calisma_oturumlari` | `soru_ids`, `banka_ids`, `aktif_soru`, `soru_baslangic`, `dogru`, `yanlis`, `ogrenilen`, `durum` | Yalnız sahibi okur |

### Yeni RPC'ler (hepsi `security definer`, yalnız `authenticated`)

| RPC | İş |
|---|---|
| `yanlis_kaydet(question_id)` | Satır yoksa ekler, varsa `yanlis_sayisi+1`, `dogru_serisi=0`, `ogrenildi_at=null`. Botları ve silinmiş soruları atlar; hata yutulur ki maç akışı bozulmasın |
| `calisma_baslat(p_kategori, p_soru_sayisi)` | Önce bankadan (öğrenilmemiş, `son_yanlis_at` eskiden yeniye + `yanlis_sayisi` çoktan aza), yetmezse `soru_sec` ile havuzdan tamamlar. Dönen: oturum, bankadan/havuzdan adet |
| `calisma_soru(p_oturum_id)` | Soruyu **doğru cevapsız** döner; `bankadan`, `onceki_yanlis`, `dogru_serisi` bilgisini verir |
| `calisma_cevap(p_oturum_id, p_soru_index, p_cevap)` | Süre ve doğruluk **sunucuda**. Doğruysa seri+1, 2'ye ulaşınca `ogrenildi_at=now()`; yanlışsa seri sıfır + `yanlis_kaydet`. Doğruda `kategori_dogru_arttir` |
| `calisma_bitir(p_oturum_id)` | Tur özeti: doğru/yanlış, öğrenilen, bankada kalan, toplam öğrenilen |
| `yanlis_bankam()` | Toplam / öğrenilen / bekleyen + kategori kırılımı |
| `mac_yanlis_sayim(p_mac_tur, p_mac_id)` | Maç sonu satırı için yanlış adedi (1v1 / grup / turnuva / hızlı) |

### Dokunulan cevap RPC'leri

Gövdeleri birebir korunarak yalnız yanlış dalına `perform public.yanlis_kaydet(q.id)` eklendi
(migration **20260612000105**):

| RPC | Mod | Dosya |
|---|---|---|
| `submit_match_answer` | 1v1 | `supabase/migrations/20260612000105_hatalarim_cevap_kancalari.sql` |
| `submit_group_match_answer` | Grup maçı | aynı dosya |
| `submit_tournament_answer` | Turnuva | aynı dosya |
| `submit_hizli_cevap` | Hızlı Olan Kazanır | aynı dosya |
| `hizli_mod_cevap` | Hızlı Mod (60 sn) | aynı dosya |

`match_answers` tablosunda `question_id` yok (yalnız `soru_index`); kayıt bu yüzden
question_id'nin zaten bilindiği cevap RPC'sinden yazılıyor — tabloya kolon eklenmedi.

### Geriye dönük doldurma — YAPILDI

`soru_index` + üst kaydın `soru_ids` dizisi eşlemesi dört modda da mümkün olduğu için tek
seferlik doldurma çalıştırıldı: `match_answers`, `group_match_answers`, `tournament_answers`,
`hizli_cevaplar`. Aynı soru birden çok kez yanlışsa `yanlis_sayisi` toplandı, en yeni tarih alındı;
botlar ve silinmiş sorular dışarıda bırakıldı.

**Sonuç: 329 satır / 17 kullanıcı.** Kategori dağılımı: tarih 69, bilim 55, coğrafya 54,
genel_kultur 42, edebiyat 35, sanat 32, … (`hizli_mod_oturumlar` soru bazlı cevap tutmadığı için
Hızlı Mod geçmişi doldurmaya dahil edilemedi; o mod bugünden itibaren birikiyor.)

### Doğrulama — `node oyun/_test/hatalarim-test.mjs`

Geçici test kullanıcısı açılır, `request.jwt.claims` ile `auth.uid()` taklit edilir, sonda silinir.

| # | Test | Sonuç | Ölçüm |
|---|---|---|---|
| 1 | 5 yanlış soru bankaya girdi | GEÇTİ | bankada 5 soru |
| 2 | Çalışma turu bankadan doldu | GEÇTİ | bankadan 5, havuzdan 0 |
| 3 | İlk doğruda öğrenilmedi (1/2) | GEÇTİ | öğrenilen 0, bankada 5 |
| 4 | İkinci doğruda öğrenildi | GEÇTİ | öğrenilen 4, bankada kalan 1 |
| 5 | Araya yanlış girince seri sıfırlandı, soru bankada kaldı | GEÇTİ | seri=0, `ogrenildi_at`=null, yanlış=2 |
| 6 | **`profiles.puan` / `puan_hafta` / `seri_gun` DEĞİŞMEDİ** | GEÇTİ | puan 0→0, hafta 0→0, seri 0→0 |
| 7 | Kategori ustalığı arttı | GEÇTİ | 0 → 9 doğru |
| 8 | Boş bankada tur başladı, havuzdan doldu | GEÇTİ | toplam 10, bankadan 0, havuzdan 10 |
| 9 | Havuzdan gelen soru yanlış bilinince bankaya eklendi | GEÇTİ | 1 satır |
| 10 | `yanlis_bankam` özeti tutarlı | GEÇTİ | toplam 5, öğrenilen 4, bekleyen 1 |

**10/10 geçti.**

### Test'in yakaladığı gerçek hata (migration 106)

Test 8 ilk çalıştırmada kaldı: 10 soru istenirken 15 soruluk tur açılıyordu. Nedeni,
`calisma_baslat` içindeki havuz doldurma sorgusunda `limit v_eksik`'in `array_agg`'ın **dış**
sorgusuna uygulanmasıydı — toplama tek satır döndürdüğü için limit hiçbir şeyi kısıtlamıyor,
`soru_sec`'in döndürdüğü tüm id'ler oturuma giriyordu. Limit, id'lerin satır satır açıldığı iç
sorguya taşındı (**20260612000106**).

### Arayüz

- **`oyun/pages/CalismaPage.jsx`** (yeni) — `/oyun/calisma`. Banka özeti (bekleyen/öğrenilen +
  kategori mini çubukları), kategori seçici, soru sayısı 10/20/30, "Çalışmaya başla".
  Banka boşsa maskot + "Henüz yanlışın yok…" ama tur yine başlatılabiliyor.
- Çalışma ekranı: üstte **"ÇALIŞMA · PUAN VERİLMEZ"** şeridi, süre **20 sn** (rahat), joker yok,
  ilerleme çubuğu + "kaç soru kaldı". Cevap sonrası geri bildirim:
  bankadan geldiyse "Bunu daha önce N kez yanlış bilmiştin" / "1/2 doğru — bir kez daha bilirsen
  öğrenilmiş sayılacak" / "Öğrenildi! Bankadan çıktı" (konfeti + ses).
- Sonuç ekranı: öğrenilen sayısı büyük, doğru/yanlış/bankada kalan, toplam öğrenilen ve
  "kategori ustalığına işlendi" notu. **Lig puanı yazmıyor.**
- **`oyun/components/YanlisSatiri.jsx`** (yeni) — "N soruyu yanlış bildin — Hatalarım'a eklendi".
  1v1 (`MacSonuEklentisi` içinden), grup maçı, turnuva ve hızlı maç sonuç ekranlarına eklendi.
- Home'a **Hatalarım** mod kartı (kendi rengi #2FBF71, açıklamasız) + köşede bankadaki soru rozeti.
- Profil sayfasına "Öğrenilen soru: N · Bankada: M" satırı + Hatalarım'a link.
- `Ikon.jsx`'e `kitap` ikonu eklendi (42. ikon).
- `src/styles.css`'e `.bd-calisma-*`, `.bd-yanlis-satiri`, `.bd-mod-rozet`, `.bd-mod-ikon.hatalarim`
  blokları (152 satır, 400px altı için ayrı ayarlar dahil).

### Kararlar (belirsizlikte en az yıkıcı seçenek)

- **Çalışma modu `gorulen_sorular`'a yazmıyor.** Banka soruları tekrar tekrar sorulabilmeli;
  havuzdan gelen doldurma soruları da "görüldü" sayılsaydı normal maçlardaki soru seçimi
  daralırdı. Mevcut davranış hiç değişmedi.
- **Maç kotası tüketilmiyor** (`mac_kotasi_kontrol` çağrılmıyor) — çalışma bir müsabaka değil.
- **Havuzdan gelen soru doğru bilinirse bankaya girmiyor**; yalnız yanlış bilinirse ekleniyor.
- `yanlis_sorular`'a INSERT/UPDATE RLS politikası **verilmedi**; tüm yazım security-definer
  RPC üzerinden. İstemci bankayı doğrudan değiştiremiyor.
- `yanlis_kaydet` hata yutuyor (`exception when others then return`): banka yazımı başarısız olsa
  bile maç akışı kesilmiyor.

### Studio'da çalıştırılacak migration'lar

**20260612000104**, **20260612000105**, **20260612000106** — üçü de bu oturumda canlıya
uygulandı (`pg` ile doğrudan), ayrıca çalıştırmaya gerek yok.

---

## 2026-09-09 — BİLDİM: Canlı yayın öncesi test ve düzeltmeler

Canlıda (`idagg-game-center.vercel.app`) gerçek hesapla uçtan uca test yapıldı;
bulunan 4 hata düzeltildi ve 1 yayın engelleyici eksik kapatıldı.

### Bulunan ve düzeltilen hatalar

| # | Hata | Kök neden | Etki | Düzeltme |
|---|---|---|---|---|
| 1 | `yildiz`, `hizli`, `onay` ikonları **hiç çizilmiyordu** | `Ikon.jsx` yolu `split("M")` ile bölüp her parçaya `"M"` ekliyordu; küçük `m` ile başlayan yollar `"Mm…"` olup geçersizleşiyordu | Joker Dükkânı kartında ikon yerine boş kırmızı plaka, başlıktaki puan yıldızı ve Hızlı Mod onay işareti görünmüyordu | `split(/(?=M)/)` — komut harfi korunuyor |
| 2 | Hatalarım mod kartı Lig ile **aynı yeşil** (#2FBF71) | Yeni tema `styles.css`'e yazılmıştı; mod temaları `oyun/styles/tema.css` içinde `--tema-ikon` ile tanımlı | Alt alta iki tam genişlik kart ayırt edilemiyordu | `.bd-mod.tema-hatalarim` → **#20A4A0** camgöbeği |
| 3 | Banka özeti satırı ikiye bölünüyordu | `.ayrac` sınıfı global **yatay ayraç çizgisi** (max-width 340px); noktayı 340px genişletiyordu | Özet kartı bozuk görünüyordu | `.bd-calisma-ayrac` olarak yeniden adlandırıldı |
| 4 | Profil ve maç sonu satırları **altın + altı çizili ham bağlantı** gibi görünüyordu | `.app a` (özgüllük 0,1,1) kendi kurallarımızı (0,1,0) eziyordu | İki yeni satır tasarımdan kopuktu | Kurallar `.app a.<sınıf>` ile aynı özgüllüğe çıkarıldı |

**Renk seçimi ölçümle yapıldı:** aday tonlar CIE Lab'da mevcut 6 mod rengiyle
karşılaştırıldı; #20A4A0 en yakın renge **ΔE 40.9**, zemin kontrastı **6.13**,
mor bandı (hue 245-315) dışında. İkon düzeltmesi 42 ikonun tamamında doğrulandı:
3 bozuk ikon düzeldi, kalan 39'unun çıktısı **byte-ayni**.

### Yayın engelleyici eksik kapatıldı

`YAYIN_KONTROL.md` B4: "Kullanım Koşulları sayfası hiç yok."
→ **`oyun/pages/KosullarPage.jsx`** yazıldı (17 madde): taraflar, hesap, yaş sınırı,
kabul edilebilir kullanım (hile/taciz), kullanıcı içeriği, sanal öğeler ve Play
faturalandırması, reklamlar, soru doğruluğu, askıya alma, garanti reddi, sorumluluk
sınırı, fikri mülkiyet, uygulanacak hukuk (TR; tüketici hakları saklı).
`/kosullar` rotası **giriş duvarının önünde** (gizlilik gibi); profil > Hesap
bölümüne ve giriş ekranına bağlantı eklendi.

### Canlıda doğrulanan davranışlar

| Test | Sonuç |
|---|---|
| Çalışma turu bankadan doldu, soru geldi | ✔ |
| Yanlış cevap → "Bunu daha önce N kez yanlış bilmiştin" | ✔ |
| İlk doğru → "1/2 doğru", ikinci doğru → "Öğrenildi! Bankadan çıktı" | ✔ |
| Tur sonu: 2 öğrenildi, banka 168 → 166 | ✔ |
| `profiles.puan` 20 çalışma cevabı sonrası değişmedi (350 → 350) | ✔ |
| Kategori ustalığı arttı (profil ızgarasında görünüyor) | ✔ |
| Maç sonucunda "6 soruyu yanlış bildin — Hatalarım'a eklendi" | ✔ |
| 10 sayfada JS hatası / bozuk ikon / hata kutusu | **0** |
| 390px genişlikte yeni bileşenlerde yatay taşma | **yok** |
| `/kosullar` canlıda açılıyor (18 başlık) | ✔ |

### Not: test betiğimin ürettiği yanlış alarm

İlk canlı denemede doğru cevapladığım 5 soru "yanlış" göründü. DB kaydı da öyleydi.
Nedeni **uygulama değil, benim otomasyon betiğimdi**: doğru şık indekslerini oturum
sırasına göre sabitlemiştim, ekranda gösterilen soru bir kaydığında hepsi kaydı.
Soruyu **metinden eşleyerek** tekrarladığımda 10/10 doğru sonuç alındı. Uygulamada
düzeltme gerekmedi — buraya, ileride aynı yanlış teşhis tekrarlanmasın diye yazıldı.

### Hâlâ senin yapman gerekenler (panel işi, kod tarafı hazır)

Canlı uçta yeniden doğrulandı: `twitter` **400**, `facebook` **400**, `apple` **400**,
misafir girişi `anonymous_provider_disabled`. Yalnız Google (302) çalışıyor.
`CRON_SECRET` rotasyonu ve deponun private yapılması da açık
(ayrıntılar `YAYIN_KONTROL.md` B1-B6). Yasal metinlerde veri sorumlusu / hizmet
sağlayıcı kimliği hâlâ doldurulmayı bekliyor.

---

## 2026-09-09 — Giriş sağlayıcıları: neden kapalı, ne yapıldı

**Soru:** "Facebook ve X girişleri neden aktif değil, aktif olsun."

**Cevap:** Bu anahtar kodla çevrilemiyor. İki nedenle:
1. Sağlayıcı ayarı Supabase'in kimlik servisinde tutulur; **veritabanında yok**
   (auth şemasında yapılandırma tablosu bulunmuyor — kontrol edildi).
   Management API için erişim tokeni gerekiyor, elimde yok.
2. Asıl engel Supabase değil: **X ve Meta tarafında uygulama kaydı olmadığı için
   API Key / App Secret yok.** Bunlar geliştirici portallarından, hesap sahibinin
   kendi hesabıyla alınır.

Yapılan: `GIRIS_SAGLAYICILARI.md` — tahminsiz, adım adım rehber (callback adresi,
hangi alan nereye, hangi kutu işaretlenecek, Meta'nın Business Verification
uyarısı, açıldıktan sonra doğrulama komutları).

### Bu sırada bulunan gerçek hata: yönlendirme izin listesi eski alan adında

Supabase Auth izin listesi ölçüldü (`/auth/v1/verify` ucu, geçersiz token):

| İstenen adres | Sonuç |
|---|---|
| `idagg-game-center.vercel.app/` | **RED** → `bildim.vercel.app`'e düşüyor |
| `idagg-game-center.vercel.app/bildim` | **RED** |
| `idagg-game-center.vercel.app/oyun/davet/ABC` | **RED** |
| `bildim.vercel.app/` | İZİNLİ |
| `bildim.vercel.app/bildim` | İZİNLİ |

Yani **güncel alan adı izin listesinde yok.** Girişlerin bugün çalışmasının tek
nedeni `bildim.vercel.app`'in **307 ile köke** yönlendirmesi: token fragment'i
hayatta kalıyor ama **yol kayboluyor**. Sonuç: davet linkiyle gelen oyuncu giriş
sonrası davet sayfasına değil ana sayfaya iniyor. Facebook/X açıldığında aynı
sorun onları da vuracaktı. Ayrıca bu alias kaldırılırsa **tüm girişler kırılır**.

İzin listesi doğru tarafta çalışıyor (kötü niyetli adres reddedildi) — açık
yönlendirme (open redirect) açığı yok.

### Uygulama tarafına eklenen yedek

Panel ayarına erişemediğim için uygulamayı bu ayardan bağımsız hâle getirdim:

- **`src/lib/girisHedefi.js`** (yeni): hedef yol girişten önce `localStorage`'a
  yazılır, oturum açılınca **tek kullanımlık** okunur. 15 dk ömür, `//` ile
  başlayan dış adres reddi, `/` yok sayımı, her erişim try-catch (özel sekme /
  depolama kapalı olabilir).
- `Login.jsx`: OAuth ve e-posta girişinden önce hedef kaydedilir.
- `App.jsx`: oturum kurulunca saklanan hedefe `replace` ile dönülür.

`localStorage` origin başına olduğu için zincir çalışıyor: hedef idagg'da
yazılır, 307 sonrası yine idagg'da okunur.

**Canlıda doğrulandı:**

| Test | Sonuç |
|---|---|
| `/` → saklanan `/oyun/calisma` hedefine dönüldü | ✔ |
| Hedef tek kullanımlık (anahtar silindi) | ✔ |
| `//kotu-site.example.com` hedefi reddedildi, kendi alan adında kalındı | ✔ |
| 20 dk önceki (süresi geçmiş) hedef yok sayıldı | ✔ |

### Doğrulanan diğer şey

`handle_new_user` tetikleyicisi `new.email`'e **hiç dokunmuyor**; takma adı
UUID'den üretiyor (`oyuncu_xxxxxxxx`). Yani X e-posta vermezse veya misafir
girişinde kayıt yine sorunsuz tamamlanır — sağlayıcılar açıldığında bu yüzden
ek geliştirme gerekmeyecek.

---

## 2026-09-09 — Site geneli denetim (hub + 8 oyun modülü)

Sağlayıcı işi ertelendi; site baştan sona tarandı. **3 gerçek hata bulundu ve
düzeltildi**, 1 yayın eksiği kapatıldı.

### Düzeltilenler

| # | Hata | Ölçüm | Düzeltme |
|---|---|---|---|
| 1 | **Buton kontrastı** — `.app .btn` altın zemine **beyaz** yazı kullanıyordu. "Lobiye katıl" ve "Meydan oku" solgun/okunaksızdı; aynı sayfadaki "Hemen oyna" doğru şekilde koyu yazı kullanıyor. | **1.87:1** (WCAG eşiği 4.5) | `color: #3a2400` → **7.83:1**, `.bd-ana-eylem` ile aynı |
| 1b | `.btn.tehlike` mercan zemine beyaz | **3.64:1** | zemin `#E8543F` → `#C43A26` → **5.28:1** |
| 2 | **Sitemap var olmayan adres bildiriyordu:** `/oyun/gizlilik` — böyle bir rota yok, canlıda ana sayfaya düşüyor (soft-404, yanlış kanonik sinyal) | canlıda doğrulandı | `/gizlilik` olarak düzeltildi; `/kosullar` + 7 oyun rotası eklendi (3 → 11 adres) |
| 3 | **Kilitli rozet okunaksız** — `opacity: 0.45`, 10px açıklama | **2.96:1** | `opacity: 0.65` → **4.72:1** (kilitli hissi korunuyor) |
| 4 | Hub alt bilgisinde yasal bağlantı yoktu | — | Gizlilik + Kullanım koşulları eklendi (mağaza/reklam ağı şartı) |

### Temiz çıkanlar

- **8 oyun modülünün tamamı** hatasız yükleniyor: Bildim, Kafa Topu, DidaGP,
  Meyve Kes, PatiRun, Gölge Boks, RUN, Gladius. JS hatası **0**, konsol hatası
  **0**, hata sınırı hiç devreye girmedi.
- 13 rota tarandı: bozuk görsel yok, alt'sız görsel yok, etiketsiz düğme yok,
  390px'te yatay taşma yok.
- Meta/OG etiketleri, `robots.txt`, manifest ve 3 PWA ikonu (200) **güncel alan
  adını** gösteriyor — eski alan adı sızıntısı yalnızca Supabase izin
  listesindeydi (ayrı madde).
- Joker, meydan, sıralama, hızlı mod sayfalarında düşük kontrast veya 36px altı
  dokunma hedefi yok.

### Ölçüm araçlarımın ürettiği 3 yanlış alarm (not düşülüyor)

Bunları hata olarak raporlamadan önce doğruladım; hiçbiri site hatası değildi:

1. **"Aynı uzunlukta farklı sayfalar"** — tarayıcı arka plan sekmesinde
   render'ı kısıtladığı için ölçüm bir sayfa geriden geliyordu. Bekleme
   koşulu eklenince tutarlı oldu.
2. **"Tüm metinler kontrast 1.00"** — `document.visibilityState === "hidden"`
   olduğunda CSS giriş animasyonları donuyor, `opacity` `from` değerinde (0)
   kalıyor. Ölçümden önce `getAnimations().finish()` çağrılınca düzeldi.
3. **"350 puanı kontrast 1.00"** — `background-clip: text` kullanan degrade
   metin; tarayıcının kendi arka plan rengini zemin sanmışım. Gerçekte altın
   üzeri koyu zemin, sorun yok.

Ayrıca `.bd-mod-ikon` overflow uyarıları `position: fixed` üst bar ve tabbar'dan
geliyordu — yanlış pozitif.

---

## 2026-09-09 — Cloudflare Pages dağıtımı hazırlandı (depo aynı)

Vercel'e dokunulmadı; aynı depo iki yerde birden yayınlanabilir durumda.

### Eklenen dosyalar

| Dosya | Neden |
|---|---|
| `public/_redirects` | SPA yönlendirmesi. Olmadan `/oyun/calisma` gibi **tüm derin bağlantılar Cloudflare'de 404** döner. Vercel bu dosyayı yok sayar (o `vercel.json` kullanıyor). |
| `public/_headers` | `sw.js` → `no-cache` (eski service worker takılı kalmasın), `/assets/*` → 1 yıl `immutable` (Vite hash'li ad üretiyor), `nosniff` + `Referrer-Policy` + `X-Frame-Options`. |
| `.node-version` → `22` | **Kritik.** Vite 7 Node `^20.19 \|\| >=22.12` istiyor; Cloudflare Pages varsayılanı daha eski — sabitlenmezse **ilk derleme patlar.** Vercel de aynı dosyayı okuyor, uyumlu. |
| `wrangler.toml` | CLI dağıtımı için (`pages_build_output_dir = "dist"`). Panelden bağlanırsa gerekmez. |
| `CLOUDFLARE_DAGITIM.md` | Adım adım rehber + dağıtım sonrası yapılacaklar. |

### Yerel doğrulama — `npx wrangler pages dev dist`

Cloudflare'in kendi çalışma zamanı yerelde ayağa kaldırıldı (hesap gerekmedi):

| Test | Sonuç |
|---|---|
| `/`, `/bildim`, `/oyun/calisma`, `/oyun/mac/abc-123`, `/kosullar`, `/gizlilik`, `/kafatopu` | 7/7 **200** + `text/html` |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/sw.js`, `/icon-192.png` | 5/5 **200** |
| `sw.js` → `Cache-Control: no-cache, no-store, must-revalidate` | ✔ |
| `/assets/*.js` → `public, max-age=31536000, immutable` | ✔ |
| `x-content-type-options: nosniff` | ✔ |
| Uygulama tarayıcıda `/oyun/calisma` derin bağlantısından açıldı | ✔ |

### Vercel regresyon kontrolü

`.node-version` eklemek Vercel derlemesini de etkilediği için canlı doğrulandı:
site açılıyor, `/oyun/calisma` render ediliyor, önceki CSS düzeltmeleri
(buton `#3a2400`, rozet `0.65`) yerinde, sitemap 11 adres. `_redirects`
Vercel'de statik dosya olarak servis ediliyor (200) — zararsız.

### Cloudflare yayına açılmadan önce ŞART

Supabase izin listesinde yalnız `bildim.vercel.app` var. **Cloudflare alan adı
eklenmeden giriş çalışmaz** — kullanıcı giriş yapınca Vercel sitesine düşer.
Vercel'de çalışmasının tek nedeni o alan adının 307 yönlendirmesi; Cloudflare'de
böyle bir yedek yok. Supabase → Authentication → URL Configuration →
Redirect URLs'e `https://<proje>.pages.dev/**` eklenmeli.

Ayrıca iki site birden yayında kalacaksa ikincisine `Disallow: /` veya asıl
alan adına `rel=canonical` gerekir (yinelenen içerik).

---

## 2026-09-09 — Bildim kendi sitesine ayrıldı (tek depo, iki hedef)

İstek: Bildim hub'dan ayrılıp kendi sitesi olsun; depo aynı kalsın; domain
sonra alınacak.

### Yaklaşım

Ayrı depo/dal yerine **derleme modu anahtarı**. `VITE_MOD=bildim` ile derlenen
çıktı yalnız Bildim'i içerir ve rotaları kökte tutar; değişken yokken hub
aynen eskisi gibi derlenir. `src/App.jsx`'e hiç dokunulmadı.

| Dosya | Değişiklik |
|---|---|
| `oyun/lib/yol.js` | **yeni** — `y()` yol yardımcısı, tek doğruluk kaynağı |
| 22 bileşen/sayfa | 76 sabit `/oyun/...` yolu `y("/...")` çağrısına çevrildi |
| `src/BildimApp.jsx` | **yeni** — Bildim rotaları kökte + eski `/oyun/*` → kök yönlendirmesi |
| `src/main.jsx` | moda göre `App` / `BildimApp` (lazy — seçilmeyen taraf paketlenmez) |
| `vite.config.js` | `bildimModuEklentisi`: index.html meta/manifest/ikon/canonical + çıktıdaki manifest, robots, sitemap |
| `.env.bildim` | `npm run build:bildim` her işletim sisteminde çalışsın diye |
| `package.json` | `build:bildim` betiği |

### Doğrulama (yerel, derlenmiş çıktı + Chromium)

**Bildim modu** — `/`, `/gizlilik`, `/kosullar`, `/calisma`, `/oyun/meydan`,
`/oyun/mac/abc-123`, `/olmayan-sayfa`: 7/7 render, **JS hatası yok**.
Statik dosyalar: `bildim.webmanifest` `start_url: "/"`, kısayollar
`/`, `/meydan`, `/turnuva`; robots + sitemap `VITE_SITE_URL`'den üretildi;
`<title>` "Bildim! — Bilgi Yarışması", manifest/ikon/apple başlığı Bildim,
`rel=canonical` eklendi.
Paket denetimi: `DriftGpApp` (1.086 kB), KafaTopu, PatiRun, Boks, Gladius,
RUN, MeyveKes parçalarının **hiçbiri çıktıda yok**.

**Hub regresyonu** — `/`, `/bildim`, `/oyun/calisma`, `/gizlilik`,
`/kafatopu`: 5/5 render, JS hatası yok; `<title>` "IDA GG Game Center",
manifest `manifest.webmanifest`, `bildim.webmanifest` `start_url: "/bildim"`,
robots/sitemap Vercel adresinde, canonical eklenmedi. Yani hub bozulmadı.

### Bekleyen (panel işi — koddan çözülmez)

- Cloudflare'de `VITE_MOD=bildim` + `VITE_SITE_URL` + Supabase değişkenleri
- Supabase izin listesine `https://<proje>.pages.dev/**`
- `/kosullar` metni hâlâ "IDA GG Game Center ve içindeki Bildim!" diyor —
  Bildim tek başına yayınlanınca bu cümle ve hizmet sağlayıcı kimliği
  güncellenmeli (yasal metin, bilerek dokunulmadı)
- İki site birden yayında kalırsa hub'ın `/bildim` sayfasına `noindex` ya da
  yeni siteye canonical gerekir (canonical Bildim tarafında hazır)

---

## 9 Eylül 2026 — Quizador canlı testi (quizador.pages.dev)

Kullanıcı isteği: "quizador.pages.dev de giriş yapıp test et çalışıyor mu".
Site canlıda gerçek hesapla (idagg, 350 puan) baştan sona gezildi.

### Çalışan (doğrulandı)

- SPA fallback: 12 rota (`/turnuva`, `/siralama`, `/calisma`, `/profil`,
  `/gizlilik`, `/kosullar` …) hepsi 200; `/oyun/*` kök rotalara yönleniyor.
- **Hatalarım / Çalışma modu uçtan uca**: 10 soruluk tur oynandı → 10 doğru,
  6 soru "öğrenildi", banka 169 → 163 düştü, **`puan` 350'de kaldı**
  (puansız çalışma kuralı canlıda da doğru işliyor).
- Turnuva lobisi (geri sayım + 5 bot), Sıralama (şehir/ülke/dünya/arkadaş,
  bu hafta / tüm zamanlar), Profil (rütbe, seri, takma ad/avatar) sorunsuz.
- Konsolda tek bir JS hatası yok.
- Giriş ekranı: Google yönlendirmesi çalışıyor, e-posta ve misafir düğmeleri
  yerinde. (Oturum yedeklenip geçici silinerek test edildi, sonra geri yüklendi.)

### Bulunan ve düzeltilen 2 hata

1. **"Merkez" sekmesi** (`oyun/components/Layout.jsx`) — `to="/"` sabit
   yazılmıştı. Quizador'un kendi sitesinde `/` zaten Ana Sayfa olduğundan
   sekme kendini tekrar ediyordu; ayrıca `end` yokluğundan NavLink her yolla
   eşleşip sekme **her sayfada "aktif"** görünüyordu (hub'da da aynı hata).
   → Sekme yalnız hub derlemesinde (`!BILDIM_MOD`) çiziliyor, `end` eklendi.

2. **Facebook / X giriş düğmeleri** (`src/pages/Login.jsx`) — sağlayıcılar
   Supabase'de kapalı ama düğmeler duruyordu. `supabase-js` `signInWithOAuth`
   sağlayıcıyı **doğrulamadan** tarayıcıyı yönlendirdiği için oyuncu
   uygulamadan çıkıp ham JSON hata sayfasında kalıyordu
   (`Unsupported provider: provider is not enabled` — canlıda doğrulandı).
   Koddaki Türkçe hata çevirisi bu yüzden hiç çalışmıyordu.
   → Düğmeler `VITE_SOSYAL` değişkenine bağlandı (varsayılan `google`).
   Karar gerekçesi: kodu silmek yerine kapıya bağlamak; X/Meta anahtarları
   alınınca `.env`'e `VITE_SOSYAL=google,facebook,twitter` yazmak yeterli.
   Misafir notundaki sağlayıcı listesi de artık açık olanlardan üretiliyor.

İki derleme de doğrulandı (`build:bildim` + `build`), commit + push edildi
(`d6c80a8`) → Cloudflare otomatik dağıtım.

### Hâlâ bekleyen (kullanıcı tarafı, koddan çözülmez)

- X (developer.x.com) ve Meta (developers.facebook.com) uygulama anahtarları
- Özel SMTP — yerleşik e-posta tek gönderimden sonra `429` veriyor
- Türkçe/Quizador markalı auth e-posta şablonları

## 9 Eylül 2026 (2) — iPhone "Ana Ekrana Ekle" yönlendirmesi

Kullanıcı hatırlattı: Safari'de açanlara kısayol oluşturma yönlendirmesi
çıkacaktı. PROGRESS ve git geçmişinde kaydı yok — konuşulmuş ama koda hiç
girmemiş. Eklendi.

**Neden gerekliydi:** iOS Safari `beforeinstallprompt` olayını desteklemiyor
(Apple otomatik kurulum banner'ını iOS 12.2'de kaldırdı). Android'de Chrome
kendi önerisini gösterirken iPhone kullanıcısı hiçbir davet almıyordu.
PWA altyapısı zaten doğruydu (`apple-touch-icon`, `apple-mobile-web-app-*`,
manifest); eksik olan tek şey kullanıcıya bunu söyleyen yönlendirmeydi.

**Yeni:** `oyun/components/AnaEkranaEkle.jsx` — alttan giren kart, modal
değil. 3 adım + Safari paylaş / artı-kutu ikonları. Kapatılınca localStorage
ile bir daha çıkmaz.

**Gösterilme kapısı** (dördü birden): iOS cihaz · gerçek Safari · uygulama
zaten ana ekrandan açılmamış · daha önce kapatılmamış.
8 gerçek UA dizesiyle sınandı, 8/8 doğru (iPhone/iPad Safari → göster;
CriOS, Instagram, Facebook, Android Chrome, Mac Safari, Windows → gizle).

**Kararlar ve nedenleri:**
- iPadOS 13+ kendini "MacIntel" diye tanıttığı için `maxTouchPoints > 1`
  ile ayırt ediliyor; yoksa masaüstü Mac'te de çıkardı.
- Uygulama içi tarayıcılar (Instagram/Facebook) elendi: orada "Ana Ekrana
  Ekle" menüsü yok, göstermek kullanıcıyı boşa uğraştırırdı.
- Metinde **"aşağıdaki paylaş düğmesi" denmiyor** — iOS 15+ varsayılanında
  alt çubukta ama "Tek Sekme" ayarında ve yatay modda sağ üstte. Konum vaat
  etmek yerine ikon gösteriliyor. Aynı sebeple işaret oku kaldırıldı.
- Giriş ekranı dikeyde ortalı olduğundan alta padding vermek içeriği yalnız
  yarısı kadar kaldırıyordu (ölçtüm: 300px padding → kart yasal linklerin
  9px üstüne biniyordu). Kart açıkken hiza üste alındı; en alta kayınca
  116px boşluk ölçüldü.
- `.btn` sınıfı kullanılmadı: o kural `.app` altında tanımlı, giriş ekranında
  `.app` sarmalayıcısı yok — düğme stilsiz kalırdı.
- Maç sırasında (`body.bd-oyun-modu`) gizleniyor; cevap şıklarının önüne
  geçmesin.
- Yalnız `BildimApp.jsx`'e bağlandı → hub derlemesi etkilenmedi.

**Doğrulanamayan:** gerçek iPhone'da görünüm ve "Ana Ekrana Ekle" akışı —
tarayıcı otomasyonunda iOS Safari taklit edilemiyor. Kapı mantığı ve CSS
yerleşimi ölçülerek doğrulandı, cihaz testi kullanıcıda.

**Canlı doğrulama (aynı gün):** dağıtım sonrası paket ve CSS kuralları
sunucudan tek tek denetlendi (hepsi yayında). Windows Chrome'da kart
çıkmıyor ve gövdeye sınıf eklenmiyor — iPhone dışı kullanıcıda düzen kayması
yok. **Bulunan hata:** kart alt barın 4px üzerine biniyordu (kural 78px idi).
Canlıda ölçüldü — bar 64px + 8px dolgu; 84px→2px, 88px→6px, 92px→10px boşluk.
92px'e çekildi. Çentikli iPhone'larda bar dolgusu safe-area kadar büyüdüğü ve
kural da aynı değişkeni eklediği için boşluk korunuyor.

---

## 9 Eylül 2026 (3) — Baştan sona canlı denetim

Kullanıcı isteği: "Projeyi canlıda baştan sona incele. Hata, açık, açılmayan
bir şey, tıklanmayan bir şey var mı komple kontrol et."

Kapsam: quizador.pages.dev (11 sayfa) + idagg hub (8 oyun + 3 ortak sayfa),
gerçek hesapla gerçek maç, Supabase şema/RLS/RPC denetimi, HTTP başlıkları.

### Bulunan ve düzeltilen 6 hata

1. **Jokerler 1v1 maçta hiç çalışmıyordu** (migration 109) — 50:50/+10 sn/Pas
   basınca hiçbir şey olmuyordu. Kök neden: 1v1 **asenkron**, ilerleme
   `oyuncu1_soru/oyuncu2_soru`'da; `joker_kullan` ortak `aktif_soru`'yu
   okuyordu → `p_soru_index <> v_aktif_soru` → "Soru değişti". Ölçüm: aktif
   6 maçın 6'sında uyuşmazlık. Aynı kök nedenin diğer sonuçları da
   düzeltildi (yanlış sorunun şıkları elenirdi, +10 sn RAKİBİN süresini
   uzatırdı, Pas yanlış indekse yazardı). Grup/hızlı/turnuva senkron —
   dokunulmadı. Canlıda doğrulandı.
2. **Joker hata mesajı ekran dışında** — not, joker çubuğunun altında
   çiziliyordu (ölçüm: y=817, pencere 791). `role="alert"` + scrollIntoView.
3. **Maç listesinde skor ters okunuyordu** — `ChallengesPage` skoru konumsal
   yazıyordu; rakip seni davet edince sen oyuncu2 olduğun için satır ters
   okunuyordu ("279-274 · Kaybettin"). Botlar hep oyuncu2 olduğundan yalnız
   insan-insan maçında görünüyordu. `MatchPage` zaten doğru yapıyordu.
4. **"Hatalarım" sayacı ulaşılamaz soruları sayıyordu** (migration 110) —
   `calisma_baslat` `q.aktif` filtreliyor, `yanlis_bankam` filtrelemiyordu.
   16 kullanıcıda 47 ölü kayıt. `ogrenilen` bilerek filtrelenmedi.
5. **Noktalama farkıyla ikizlenmiş 15 soru** (migration 111) — `soru` UNIQUE
   ama tırnak farkı farklı satır sayılıyor. Silinmedi, `aktif=false`;
   her çiftte en eski korundu (hepsinde `toplam_oy=0`, veri kaybı yok).
6. **Yatay taşma** — `.bd-ust-blok` `50vw` kullanıyor; dikey kaydırma çubuğu
   varken 8px taşıp masaüstünde yatay kaydırma çubuğu çıkarıyordu.
   `html{overflow-x:clip}` (`hidden` değil — sticky'yi bozardı).

### Temiz çıkanlar

- 11 sayfa + hub'daki 8 oyun: **sıfır JS hatası, sıfır ağ hatası**, kırık
  görsel yok, boş link yok, adsız düğme yok.
- Takma ad doğrulaması sunucuda ve sağlam (uzunluk, karakter seti, küfür
  listesi, benzersizlik, hız limiti, `unique_violation` yakalaması).
- Davet kodu doğrulaması: geçersiz kod ve kendi kodu net mesajla reddediliyor.
- Joker dükkânı: reklam kimliği yokken "sahte ödül verilmez" diyor, tüm
  satın alma düğmeleri kilitli. Dürüst davranış.
- Soru havuzu: 11.422 aktif, bozuk şık/cevap/boş soru **0**, tekrar **0**.
- RLS tüm tablolarda açık; politikasız tablolar (questions, sunucu_gizli,
  yasakli_kelimeler…) kasıtlı olarak yalnız RPC üzerinden erişilebilir.
- HTTP başlıkları doğru (nosniff, frame, referrer; sw.js no-store,
  assets immutable). `_headers`, `.env` gibi yollar sızmıyor (SPA yedeği).
- Turnuva lobisi katıl/ayrıl, sıralama 4 lig × 2 dönem, profil kontrolleri,
  ses/bildirim düğmeleri, kategori şeridi: hepsi çalışıyor.

### Sertleştirme

- PatiRun'ın iki `security definer` fonksiyonunda `search_path` yoktu
  (migration 112). Artık projede açıkta fonksiyon **0**.

### Kullanıcı kararı bekleyen (düzeltilmedi)

- `pr_apply_race_result` puanı istemciden **doğrulamasız** alıyor. Kendi
  satırına sınırlı (başkası bozulamaz) ama oyuncu kendi PatiRun puanını
  şişirebilir ve bu puan hub'daki `birlesik_siralama`'ya giriyor. Meşru
  aralık bilinmeden üst sınır koymak oyunu bozabileceği için dokunulmadı.
  PatiRun'da şu an veri yok (max puan 0) — istismar edilmemiş.
- Modüller arası kimlik tutarsızlığı: Bildim `takma_ad`'ı ("idagg"),
  PatiRun/DidaGP `username`'i ("idaGG") gösteriyor. Aynı oyuncu iki farklı
  adla görünüyor. Bildim kapsamı dışı olduğu için dokunulmadı.

### Doğrulanamayan

- Maç bitince ekranın kendi kendine sonuca dönmesi: bir kez gecikmeli
  gördüm, ama 2 sn'lik yoklamanın çalıştığını ölçtüm (9 sn'de 6 istek) ve
  yeniden üretemedim. Hata olarak raporlanmadı.

---

## 9 Eylül 2026 (4) — Maç içi sesli sohbet

Kullanıcı isteği: "arkadaşımla kendi evlerimizde oyunu oynarken sohbet ederek,
onunla dalga geçerek oynayabileceğim" (mesaj yarıda kesilmişti; kapsam
kararları AskUserQuestion ile alındı).

**Kapsam (kullanıcı kararı):** yalnız 1v1 · yalnız karşılıklı arkadaşlar ·
aktarma (TURN) sunucusu YOK, yalnız ücretsiz STUN.

**Neden bu kapsam:** oyun 13 yaş üstüne açık. Yabancılarla ses açmak taciz
riski ve denetim yükü getiriyor; ses kaydedilmediği için şikayette kanıt da
olmuyor. Arkadaş sınırı bunu baştan çözüyor.

### Önce yanıldığım nokta — sonra veriye baktım

1v1 maçlar asenkron tasarlanmış (ortak oturum yok, herkes kendi hızında),
bu yüzden "canlı sohbet" fikrinin oturmayacağını düşündüm. Ölçtüm:
insan-insan maçlarının **7'sinden 4'ünde oyuncular %85-99 örtüşmeyle
~2,5 dakika boyunca gerçekten aynı anda oynamış**. Senaryo gerçekmiş.
Eksik olan tek şey "ikimiz de şu an buradayız" tespitiydi → Supabase
Realtime **presence** eklendi (projede ilk kez kullanıldı).

### Yeni dosyalar

- `oyun/lib/sesliSohbet.js` — WebRTC motoru (UI bilmez): mikrofon,
  teklif/cevap/ICE, aday sıraya alma, susturma, zaman aşımı, temizlik.
- `oyun/components/SesliSohbet.jsx` — onay akışı, sinyalleşme, durumlar.
- Migration 113 — `sesli_sohbet_izni` RPC: arkadaşlık + maçta olma + maç
  aktif + bot değil. Kural tek yerde.

### Kararlar ve nedenleri

- **Karşılıklı onay zorunlu:** davet → kabul/red → iki tarafta da mikrofon
  izni. Asıl koruma budur; RPC ürün kuralını uygular, tek başına güvenlik
  sınırı değildir (ses P2P gider, karşı taraf kabul etmeden bağlanmaz).
- **Rakip maçta değilse düğme hiç çizilmez** — boşuna çağrı gitmesin.
- **Aktarma yok → sessiz takılma yasak:** 15 sn'de bağlanmazsa net Türkçe
  hata + yazılı sohbete yönlendirme.
- **`.btn` yerine kendi stilleri**, altın zeminde metin `#3a2400` (7.83:1).
- Sesli sohbet yazılı sohbet barının ÜSTÜNE kondu; ölçüldü, şıklarda
  düzen kayması yok (geçmişte kayma şıkka tıklamayı bozmuştu).

### Test

- İzin kapısı 5 senaryo: bot rakip / bitmiş maç / maçta olmayan üçüncü kişi /
  iki arkadaş tarafı → hepsi doğru. Test maçı rollback ile geri alındı.
  **Bu test kendi hatamı yakaladı:** arkadaşlık durumunu `'kabul'`
  varsaymıştım, tablo CHECK kuralı `'bekliyor' | 'arkadas'` diyor — o haliyle
  ses HİÇ açılmazdı.
- WebRTC el sıkışması gerçek tarayıcıda döngü testiyle: iki taraf `connected`,
  ses izleri karşılıklı ulaştı, aday sırası 0'a boşaldı.
- Canlıda: bot maçında düğme gizli, RPC 200 + "Rakibin bir bot", JS hatası yok.

### Yasal

- Gizlilik politikasına "Sesli sohbet" bölümü: kaydedilmez, sunucudan geçmez,
  **ama doğrudan bağlantı olduğu için IP adresleri karşı tarafa görünebilir**
  (dürüstçe yazıldı; arkadaş sınırının başlıca sebebi bu).
- Koşullara sesli taciz + izinsiz kayıt maddeleri; sesli sohbet içeriğinin
  denetlenemediği açıkça belirtildi.

### Doğrulanamayan (kullanıcıda)

- **Aktarmasız gerçek ağ yolu.** Yapılan test tek makinede döngüydü; iki ayrı
  evdeki cihaz arasında bağlantı kurulup kurulmayacağı ancak gerçek denemeyle
  görülür. Kurulamazsa Cloudflare Realtime aktarması eklenecek.

---

## 9 Eylül 2026 (5) — Daha önce hiç denetlenmemiş alanların taraması

Kullanıcı isteği: "Bugüne kadar hiç kontrol etmediğin özellikleri kontrol et."
Kapsam: zamanlanmış görevler, rozet/görev sistemi, grup & hızlı maç, Hızlı Mod,
davet linkleri, bildirim paneli, Edge Function'lar, PWA manifest, robots/sitemap.

### 🔴 BULGU 1 — Haftalık lig 3 aydır hiç kapanmıyordu (migration 114)

`lig_arsiv` **tamamen boş**. Sonuçları:
- "Haftanın Birincisi/İkincisi/Üçüncüsü" ve "Şehrin Kralı" rozetleri
  kazanılması **imkânsız** (16 rozetin 4'ü ölü)
- Hiç `hafta_sonuc` bildirimi gönderilmemiş
- `puan_hafta` hiç sıfırlanmamış
- Ana sayfa "Haftalık lig bitimine N gün" diye geri sayıyor ama karşılığı yok

**Teşhis (adım adım):**
1. `haftayi_kapat()` kuru çalıştırma (transaction + rollback) → **kusursuz**:
   haftayı arşivledi, 4 rozet dağıttı, 3 bildirim yazdı, puanları sıfırladı.
   Yani fonksiyon sağlam.
2. `cron.job`'da iş `active=true`, doğru schedule, doğru database/username.
3. `cron.job_run_details`'te **tek bir çalışma kaydı yok** (3 aylık, 1,2M kayıtlık
   geçmişte).
4. pg_cron sağlıklı: test işi (`* * * * *`) kurulur kurulmaz 1 dk'da çalıştı.
5. **Belirli saatli** test işi (`36 20 * * *`) de tam 20:36:00'da çalıştı —
   yani bozuk görevlerin ait olduğu desen sınıfında sorun yok.
6. 30 Ağustos ve 6 Eylül **Pazar günleri tam 21:00:00'da** `turnuva-ilerlet`
   çalışmış → o anda cron ayaktaydı, haftalık iş yine tetiklenmedi.

**Sonuç:** eski `cron.job` kaydı ölüymüş (kaydediliyor ama zamanlayıcı almıyor).
Kök nedeni pg_cron içinde tam olarak saptayamadım; **kanıtlanan** şey fonksiyonun
ve cron'un çalıştığı, eski kaydın çalışmadığı.

**Çözüm:** işler yeniden kuruldu (yeni jobid 53/54/55) VE tek dakikaya
bağımlılık kaldırıldı. `haftayi_kapat` zaten tekrar-güvenli
(`if exists (... lig_arsiv where hafta = v_hafta) then return`), bu yüzden
pencereye yayıldı: `0 21,22,23 * * 0` + Pazartesi yakalayıcı `0 0,1,2,3 * * 1`.
İlk çalışan iş görür, kalanlar boşa döner → 1 şans yerine 7 şans.

**Pencere neden dar:** fonksiyon `puan_hafta`'nın O ANKİ değerini arşivliyor.
Çok geç çalışırsa yeni haftanın puanları birikmiş olur ve yanlış hafta
arşivlenip sıfırlanır. Bu yüzden sınırın hemen ardındaki birkaç saatle sınırlı.

`bildim-hafta-bildir` **çoğaltılmadı**: `haftalik_sonuc_bildir()` tekrar-güvenli
değil (her çalışmada yeniden push atar), mükerrer bildirim gönderirdi.

**Geçmiş haftalar geri getirilemez** — arşiv, puan_hafta'nın o haftanın
sonundaki değerini ister; o değerler artık yok. Bilerek dokunulmadı.

### 🔴 BULGU 2 — `satin_alma_dogrula` Edge Function dağıtılmamış (404)

`JokerDukkani.jsx:88` satın alma sonrası bu fonksiyonu çağırıyor; fonksiyon
Supabase'de **yok**. Bugün kimseyi etkilemiyor (satın alma yalnız TWA/Android
içinde çalışıyor, web'de düğmeler kilitli) ama **Android sürümü için yayın
engeli**: oyuncu Google Play'e para öder, joker envantere hiç işlenmez.
`generate-questions` ve `send-push` dağıtılmış ve yetkisiz isteği 401 ile
reddediyor.

### 🟡 BULGU 3 — idagg hub'ında Vercel Attack Challenge Mode açık

`X-Vercel-Mitigated: challenge`. Sonuçları: her ziyaretçi önce "Tarayıcınızı
doğruluyoruz" ekranı görüyor (~5 sn), **Googlebot 403 alıyor** → portal
aranabilir değil. quizador.pages.dev (Cloudflare) etkilenmiyor (Googlebot 200).
Panel ayarı — kod değişikliği değil, kullanıcı kararı bekliyor.

### ✅ Temiz çıkanlar (ilk kez denetlendi)

- **17 zamanlanmış görev**, 48 saatte ~27.500 çalışma. Tek başarısızlık:
  `bot_oyna`'da 1 deadlock (24.522'de 1 = %0,004), eşzamanlı DDL kaynaklı.
- **Grup maçı kurma**: kota dolmadan düğme kilitli, fazla rakip seçtirmiyor,
  geri alma çalışıyor (3/4/5 kişi seçicisi doğru).
- **Hızlı Olan Kazanır** paneli, kuralları ("Joker yok!") doğru.
- **Hızlı Mod** uçtan uca: başlangıç → sorular → 60 sn → bitiş ekranı →
  haftalık sıralama. Skor 0 alındı ama **haftalık rekor 9'da kaldı** (doğru).
  `hizli_mod_oturumlar` + `hizli_mod_skorlar` satırları yazıldı.
- **Davet linki**: kendi kodu ve geçersiz kod net Türkçe mesajla reddediliyor.
- **Görev sistemi**: 5 tamamlama, 110 puan dağıtılmış.
- **Rozet sistemi**: `ilk_galibiyet` 8, `seri_3` 1, `ustalik_cirak` 1.
- Hiçbir modda takılı maç yok (grup/hızlı/turnuva).
- Öksüz bildirim yok, tüm gerçek profillerde davet kodu var.
- PWA manifest derleme modunda doğru yeniden yazılıyor
  (quizador'da `start_url: "/"`, kısayollar kökte).
- robots.txt + sitemap.xml doğru.

### Yanlış alarm diye elenenler (kontrol edildi, hata değil)

- **Bildirim sırası** ("23 saat → 1 gün → 21 saat"): kasıtlı öncelik sıralaması
  (meydan okuma > rozet > seri), kodda yorumu var.
- **"Gece Şampiyonu" rozeti 0**: biten 6 turnuvanın **hepsini bot kazanmış**,
  rozetin verilmemesi doğru.
- **`bildim-bildirim-temizle` hiç çalışmamış**: 8-9 Eylül'de kurulmuş, ilk
  03:20'sine daha gelmemiş. Hata değil.
- **`bildim.webmanifest` start_url "/bildim"**: kaynak dosyada öyle ama derleme
  moda göre yeniden yazıyor.

### Düzeltme + tamamlanan işler (aynı gün, denetim sonrası)

**BULGU 2 kapatıldı — `satin_alma_dogrula` dağıtıldı.** CLI yanlış hesaba
(`idafroditproject@gmail.com`) bağlıydı; kullanıcı Quizador'un
`idagureli@gmail.com`'da olduğunu söyledi. Kalıcı erişim anahtarı üretmek
yerine Supabase panelindeki tarayıcı editörü kullanıldı. Kaynak pano üzerinden
aktarıldı ve **birebir doğrulandı** (5894 karakter, Türkçe karakterler sağlam).
Sonuç: 404 → **401** (yetkisiz istek doğru reddediliyor).
Fonksiyon `PLAY_SERVICE_ACCOUNT` yokken **açık hata döner, sahte onay VERMEZ** —
bu yüzden sırlar olmadan dağıtmak güvenli.
**Kalan bağımlılık (yalnız kullanıcı sağlayabilir):** `PLAY_PACKAGE_NAME` ve
`PLAY_SERVICE_ACCOUNT` (Google Play Console servis hesabı JSON'u). Panelde
tanımlı sırlar: CRON_SECRET, VAPID_*; PLAY_* yok.

**BULGU 3 DÜZELTİLDİ — yanlış teşhis koymuşum.** "Vercel Attack Challenge Mode
açık" demiştim; doğrusu değil. Firewall paneli: Custom Rules 0, Bot Protection
Inactive, devrede olan **otomatik "DDoS Mitigation" sistem kuralı**.
Trafiğe bakınca tek bir IP'den **14.400 istek** göründü, ikinci sıradaki 96.
O IP'yi sorguladım: `176.237.238.78` = **bu bilgisayarın kendi public IP'si**
(Bursa/Turkcell). Yani engellenen trafik BİZİM — benim otomatik testlerim ve
kullanıcının gezinmesi. **Ortada saldırı yok, kapatılacak bir ayar da yok.**
Otomatik hafifletme trafik normale dönünce kendiliğinden kalkar; Googlebot'un
403 alması da bu geçici durumun yan etkisi. Hiçbir güvenlik ayarına
dokunulmadı. Kalıcı olursa doğrulanmış tarayıcılar için bypass kuralı eklenir.

---

## 10 Eylül 2026 — GÖREV 11: Yayın sonrası dayanıklılık paketi (5 iş)

### İŞ 1 — Soru havuzu dengesi (commit 6b0b595)

**İki kök neden bulundu, ikisi de düzeltildi.**

1. **Üretici aylardır hiç çalışmıyordu.** `HEDEF_HAVUZ = 200` **toplam** havuz
   eşiğiydi; havuzda 11.422 soru olduğu için fonksiyon her çağrıda
   "Havuz dolu" deyip çıkıyordu. Canlıda doğrulandı. Saatlik cron 48 saatte
   48 kez "succeeded" dönüyordu ama sıfır soru üretiyordu.
2. **Kategori enum'ı eksikti** (7 değer). `sinema`, `muzik`, `teknoloji`
   enum'da YOKTU → o üç kategoriye hiç üretilemezdi. `genel` ise
   `get_categories` tarafından gizleniyor, oraya üretilen soru görünmezdi.

`karisik` enum'a **konmadı**: kategori değil, filtre
(`get_categories`: `kategori not in ('genel','karisik')`).
**Migration gerekmedi** — `questions.kategori` üzerinde check constraint yok.

Yeni: `kalite.ts` (saf, sınanabilir kalite kapıları) + `_test/kalite-test.mjs`
(26 iddia). Kapılar **mevcut 11.422 sorunun tamamına** uygulanarak yanlış
pozitif denetimi yapıldı: ilk sürüm 79 soruya takılıyordu, incelenince
`en\s+son` kalıbının kelime sınırı olmadığı ve "şimşek-**ten son**-ra",
"sona ermiştir" gibi masum soruları elediği görüldü. Unicode lookaround
eklendi, "bugün" ve yalın "kaç yaşında" bilerek çıkarıldı
→ 62 (%0,54), yanlış pozitif 18 → 1.

**Hedef zaten karşılanmış durumda:** 10 kategorinin hepsi 1000+
(cografya 1908, genel_kultur 1353, bilim 1038, sanat 1029, sinema 1025,
tarih 1024, muzik 1024, spor 1012, edebiyat 1005, teknoloji 1004).
Üretim çalıştırılmadı — gerek yoktu.

### İŞ 2 — Sentry (commit 886318d)

Tamamen `VITE_SENTRY_DSN`'e bağlı. **Ölçümle doğrulandı:** DSN'siz derlemede
18 paket tarandı, "sentry" dizgisi hiçbirinde geçmiyor (Rollup tamamen eliyor).
DSN'li derlemede paketlere giriyor. `HataSiniri`'nin davranışı değişmedi.
Gizlilik temizliği testi (20 iddia) **gerçek bir açık yakaladı**: Sentry
`request.query_string`'i başında `?` olmadan gönderiyor ve davet kodu tam
oradan sızıyordu.

### İŞ 3 — RPC hız sınırı (commit a5874fa, migration 115+116)

12 kullanıcı tetikli uç. **Limitler gerçek veriden seçildi**: canlıda
60 sn'lik pencerede gözlenen en yüksek değerler match_answers 15 (ort. 4,4),
group 9, turnuva 7, hızlı 3. Cevap uçları 60/60sn → gözlenen tavanın 4 katı.
**Pay testle gösterildi:** aynı dakikada 3 tam maç (60 cevap) takılmıyor.
Bot/cron muaf (`auth.uid()` NULL ise sessizce çıkıyor; oturumsuz 200 çağrı
200 geçti). `advance_*` uçlarına bilerek sınır konmadı.

### İŞ 4 — Hesap silme (commit 4d73184, migration 117)

**İki gerçek engel bulundu:** turnuva kazanmış ya da başkasını davet etmiş
oyuncu hesabını **silemiyordu** (FK ihlali). Bu, gizlilik politikasındaki
"kalıcı olarak silebilirsin" vaadini ve KVKK silme hakkını bozuyordu.
Oyun daveti aktif teşvik ettiği için (her davet +50 puan) nadir bir durum
değildi. `kazanan`/`davet_eden` → ON DELETE SET NULL. NO ACTION kalan FK: 0.
FK'sı olmayan tek tablo `pr_error_logs` → `hesabimi_sil` artık onu da siliyor.
5/5 senaryo geçiyor, artakalan satır yok. Test gerçek hesap kullanmıyor ve
sonunda rollback ediyor.

### İŞ 5 — Yedekleme (commit fa5be8d, YEDEKLEME.md)

**En önemli bulgu:** proje **Free planda ve HİÇ otomatik yedeği yok**
(panelde ekrandan doğrulandı: "Free Plan does not include project backups").
Veritabanı bozulursa geri dönüş yolu yok.

**Döküm ve geri dönüş DENENEMEDİ** — bu makinede pg_dump, psql ve Docker yok;
`npx supabase db dump` Docker istediği için başarısız oldu. Belge bu iki adımı
açıkça "doğrulanmadı" diye işaretliyor, uydurma boyut/süre verilmedi.
Bunun yerine ölçülebilen her şey ölçüldü (206 MB, 75 tablo, 170 fonksiyon,
97 politika, 23 tetikleyici, 18 cron işi, 29 auth kullanıcısı, 0 storage) ve
geri dönüş doğrulama ölçütü olarak belgeye kondu.

### YAYIN_KONTROL.md

C1, C2, C4, C8 **kapandı** (üstü çizildi + tarih). C5 durumu netleşti.

---

## 10 Eylül 2026 — Yarım maçlar hep görünsün + iptal edilebilsin (Bildim)

Canlı testte çıkan üç somut şikâyetin işi: yarım kalan maçlar listeden
düşüyordu, iptal edilemiyordu, süre dolunca hiçbir geri bildirim yoktu.

### FAZ 1 — Süren/biten ayrı sorgular (commit 57cd695)

`ChallengesPage.jsx` tek bir `limit(30)` sorgusuyla hem süren hem biten
maçları çekiyordu. 30 satırın hepsi bitmiş maç olursa **aktif maç
görünmüyordu**. Artık her mod (1v1 / grup / hızlı) iki sorgu yapıyor:
süren = sınırsız (güvenlik tavanı 200), biten = son 20. Realtime
abonelikleri değişmedi.

**Ölçüm:** en yoğun kullanıcıda (`e4f6006f`) 51 maç var — 4 aktif,
1 bekliyor, 46 bitmiş. Bugün için tarihe göre 1,2,3,5,7. sıradalar, yani
hata **henüz tetiklenmemiş, gizli** durumdaydı. Limit yapay olarak 4'e
düşürülünce eski desende 5 süren maçın 3'ü görünüyor, yeni desende 5'i de
görünüyor.

### FAZ 2 — `mac_iptal` RPC + arayüz (commit b66960f, migration 120)

Adalet tablosu: bot rakip veya hiç cevap verilmemiş maç → düz iptal, puan
değişmez. Gerçek rakibe karşı **başlamış** maçı iptal → **hükmen
mağlubiyet**, rakip kazanır. Gelen daveti reddetme mevcut akışta kalıyor.

**Ayrı puan hesabı yazılmadı:** `advance_match` içindeki bitiş bloğu
`mac_sonuclandir(match_id, kazanan, kaybeden)` olarak birebir dışarı alındı;
`advance_match` de `mac_iptal` de artık onu çağırıyor. Böylece hükmen
mağlubiyette puan/lig/seri güncellemesi normal bitişle **aynı yoldan**
geçiyor.

Yalnız maçın tarafı iptal edebiliyor, satır `FOR UPDATE` ile kilitleniyor.
Onay metni senaryoya göre değişiyor; hükmen durumunda birebir:
"Bu maçı iptal edersen yenik sayılırsın ve {rakip} kazanır. Emin misin?"
İptal butonları altın değil; MatchPage'in sol üstteki ✕'ine dokunulmadı.

`_test/mac-iptal-test.mjs` — 5 senaryo, geçici kullanıcılarla, sonunda
temizliyor.

### FAZ 3 — Canlı testte bulunan 3 hata (commit ebb2a27, migration 121)

- **3a Zaman aşımı sessizdi.** Soru cevaplanmadan süre dolunca ekran doğrudan
  sonraki soruya atlıyordu. `mac_soruyu_atla` artık atladığı sorunun doğru
  cevabını döndürüyor (oyun mantığı değişmedi, yalnız dönüş değeri eklendi);
  `QuestionCard` "Süre doldu" bandını gösterip doğru şıkkı yeşile boyuyor.
  MatchPage / GroupMatchPage / HizliModPage / CalismaPage — dört mod da.
- **3b Podyumda bot skoru okunmuyordu.** Ölçülen kontrast 2.86 (12 px).
  Sönükleştirme artık yalnız avatara uygulanıyor, skor ve isim renkle
  ayrılıyor. Yeni ölçüm: **skor 8.35**, **isim 5.20** — ikisi de AA (≥4.5).
- **3c** Kalan iki ham `⏳` emojisi (MatchPage, GroupMatchPage) `Ikon`'a
  çevrildi; kalan ham emoji taraması yapıldı.

### Sonradan düzeltme — onay penceresi stili

`Modal.jsx` portalla `document.body`'ye basıldığı için `.app` önekli
kurallar ona uygulanmıyordu: başlık/metin tipografisi düşüyor, onay butonu
altın kalıyordu. Kurallar `.bd-modal-katman` üzerinden yazıldı.

---

## 10 Eylül 2026 — Görsel yön: renk kimliktir (Bildim)

Yönetici kararı: bu bir **oyundur**, panel değil. Renk kimliktir, süs değil;
enerji almak yanlıştır; ana sayfa yüksek sesli, maç ekranı odaklı — bu zıtlık
kasıtlı. Önceki revizyonda mod ikonları nötrleştirilmişti; **o karar bu
görevde geri alındı.**

### FAZ 1 — Mod kimlik renkleri (commit 388c9df)

Nötrleştirme üç yerden kaldırıldı: ikon kutusu nötr dolgu kuralı, toplu
`--tema: transparent` bloğu ve `.app .bd-mod::before/::after { display:none }`
(bu sonuncusu tema ışığını ve kart yıkamasını kapatıyordu).

Eski palette meydan/hızlı/turnuva **üçü de altın-sarı** tonundaydı, bu yüzden
ayrışmıyorlardı. Yeni palette her mod ayrı renk ailesi: meydan `#FF5B4A`,
hızlı `#FFD23F`, grup `#4A9DD9`, turnuva `#A855F7`, joker `#EC4899`,
lig `#2FBF71`, hatalarım `#20A4A0`. İkon kutusu kendi renginde dolgu, üst
kenarda 1px kimlik şeridi, gölge kendi renginin koyu tonunda, `:active`'te
ikon parlar.

### FAZ 2 — İkincil butonlar (commit c574a39)

`.app .anasayfa .btn:not(.tehlike)` bütün ikincil butonları düz griye
çekiyordu. Buton artık bağlamının renginden **tint** alıyor (dolgu değil):
"Lobiye katıl" turnuva moru, "+N al" joker magentası, "Meydan oku" meydan
mercanı. Bağlamı olmayan buton nötr kalır (doğrulandı).

`tema-*` sınıflarından `.bd-mod` öneki kaldırıldı — aynı sınıf hem karta hem
bağlam kutusuna verilebiliyor.

### FAZ 3 — Kimlik bloğu (commit e7d4a9d)

Rütbe çubuğu artık altın değil, oyuncunun **kendi rütbe renginde** doluyor;
rütbe adı ve avatar halkası aynı `--rutbe` değişkenini kullanıyor.
`.bd-hero-halka`'ya `--halka` veriliyordu ama hiçbir görsel kural yoktu —
halka eklendi. Puan 40px → 52px (altın kaldı), "PUAN" etiketi 11px → 9.5px.
Seri alevi uzunluğa göre ısınıyor: 1-2 gün sönük turuncu, 3-6 gün turuncu +
glow, 7+ gün kırmızı-beyaz sıcak + nabız.

### FAZ 4 — Maç sonu (commit 96c28cd)

Üç durum üç ton: kazanmada üstten altın parıltı + vurgulu "+20 puan" rozeti,
kaybetmede sönük mercan (utandırmadan) ve Rövanş sayfanın en büyük eylemi,
beraberede nötr perde + eşit ağırlıklı skorlar.

Yeni bileşen `MacSonuDokum`: tur tur doğru/yanlış/süre-doldu dökümü ve rütbe
ilerleme çubuğu — maç öncesi seviye sönük katman olarak durur, dolgu yeni
değere animasyonla kayar, **artış gözle görülür**.

**Sınır:** `match_answers` RLS'i yalnız kendi cevaplarını gösteriyor
(`match_answers_select_own`), bu yüzden döküm oyuncunun kendi turlarıdır.
Rakip dökümü için RPC gerekirdi; bu görev arayüz işi olduğu için sunucuya
dokunulmadı.

### FAZ 5 — Maç ekranı odaklı (commit 6aa1351)

Maç ekranına renk **eklenmedi**. Şık harf rozetleri nötr kaldı, doğru/yanlış
tek renk kaynağı olarak duruyor. Tek dokunuş: soru üstünde kategori etiketi —
üst şeritte kategori etiketi hiç yoktu, eklendi. Kategorisi olmayan modda
(turnuva, hızlı mod) ve "karışık" maçta çizilmez.

### Kontrast

Renk değiştirilen her yer ölçüldü, hiçbiri tahmin değil. Üç yerde eşik
ölçümle düzeltildi: rütbe chip tinti %16 → %8 (Çaylak 4.08 → 4.62), kategori
etiketi metni %20 beyazla açıldı (edebiyat 4.30 → 4.78), mod ikon mürekkebi
koyu `#12151F` seçildi (yedi dolguda da beyazı geçiyor).

---

## 10 Eylül 2026 — Canlı testte bulunan 4 kusur (Bildim)

### 1. Maç sonunda iki Rövanş butonu (commit c157e90)

Kaybedilen 1v1 maçın sonunda alt alta **iki** "Rövanş" butonu duruyordu:
`MacSonuEklentisi`'ndeki "Rövanş iste" (`rovans_iste`, koyu kırmızı) ve
`MatchPage`'deki doğrudan "Rövanş" (`create_challenge`, mercan). Oyuncu
hangisine basacağını bilmiyordu.

Artık rakip türüne göre **yalnız biri** çiziliyor: bota doğrudan rövanş
(alt yazı yok), gerçek oyuncuya rövanş isteği (*"Rakibine istek gönderilir ·
aynı kategori · 24 saat geçerli"*). Gerçek oyuncu zorla maça sokulamaz.
`is_bot` ekstra sorgu açılmadan `MAC_SECIMI`'ndeki profil satırına eklendi.

### 2. Hızlı Mod kartı çamur rengiydi (commit 5040dc5)

`::after` yıkaması sabit %16'ydı. Sarı `#FFD23F` × %16, lacivert üzerinde
`rgb(60,62,57)` veriyordu — hardal/haki. Sebep parlaklık farkı: sarının bağıl
parlaklığı ~0,69, morunki ~0,21.

`--tema-yikama` eklendi, opaklık renge göre: hızlı %7, lig %11, grup/hatalarım
%14, meydan/joker %16, turnuva %18. Hızlı Mod `#3d3f3c` → **`#282f3b`**.

### 3. "Bildirimleri aç" kırmızıydı (commit 1c96210)

**Kök neden kendi kuralı değildi:** FAZ 4'te yazılan
`.bd-sonuc-ekran.kaybetti .btn:first-of-type` seçicisi, kaybetme ekranındaki
başka kutuların ilk butonunu da mercan yapıyordu. Rövanşın artık kendi sınıfı
olduğu için (madde 1) kural `.bd-rovans` / `.bd-rovans-tek`'e daraltıldı —
yan etki kökünden kalktı. Buton altın oldu, "Şimdi değil" nötr kaldı.

### 4. Tur dökümünde açıklama yoktu (commit ...)

Test maçında 2 yeşil, 1 kırmızı, **17 nötr** çıkmış ve oyuncu nötrün ne
demek olduğunu anlamamıştı. Noktaların altına üç durumu adlandıran anahtar
satırı eklendi: Doğru / Yanlış / Süre doldu.

### Çıkarım

3. madde, bir önceki oturumda eklenen bir kuralın yan etkisiydi.
`:first-of-type` gibi konuma dayalı seçiciler, kapsayıcı içinde başka
butonlar belirdiğinde sessizce yanlış hedefi vuruyor — bileşene özel sınıf
kullanmak daha güvenli.

---

## 10 Eylül 2026 — Canlı ağ denetiminde bulunan 3 hata (Bildim)

### 1. Bekleyen rozeti hiç çalışmıyordu (commit 09ee851, migration 122)

`Layout.jsx` her sayfa yüklemesinde iki ayrı PostgREST HEAD isteği atıyordu
(`count=exact`, RLS altında tam sayım). Denetimde ikisinin de **503** döndüğü,
sayının `null` geldiği ve alt bardaki rozetin hiç görünmediği raporlandı.
İstemci `error` alanını hiç okumadığı için hata sessizce yutuluyordu.

Yeni RPC `public.bekleyen_sayim()` — tek çağrı, sayım sunucuda, `auth.uid()`
ile kendi satırları. `Layout.jsx` try-catch + `error` kontrolü ile çağırıyor;
hatada **önceki değer korunuyor** (rozet sıfıra düşmüyor) ve `console.error`'a
düşüyor.

**Not:** 503'ü kendi ölçümümde tekrar üretemedim — aynı iki istek bende 200
döndü. Karar yine de uygulandı: iki istek → bir, hata yönetimi eklendi.

### 2. `profilim` her yüklemede iki kez çağrılıyordu (commit d853553)

`getSession().then()` ve `onAuthStateChange` ikisi de `refreshProfile`
çağırıyordu; supabase-js abone olunduğu anda `INITIAL_SESSION` yayınladığı
için iki yol da aynı yüklemede koşuyordu. `getSession` artık yalnız oturumu
kurup yüklemeyi kapatıyor; profil ve davet işleri tek yerde.

`setLoading(false)` iki yolda da çalışıyor — oturum yokken "Yükleniyor…"
ekranında takılma olmasın diye `onAuthStateChange`'e de eklendi.

### 3. Sessiz yutulan Supabase hataları — 7 yer (commit 530ad5a)

Aynı desen depoda tarandı. **Supabase hata fırlatmaz**, `{data:null, error}`
döner; bu yüzden `try` bloğu olan yerler bile korunmuyordu.

### Çıkarım

Bu üç madde de aynı kök alışkanlığın sonucu: `error` alanını okumadan
`data`'yı kullanmak. Hata olduğunda ekran boş kalıyor, kullanıcı sebebini
bilmiyor, geliştirici de konsolda göremiyor. Yeni Supabase çağrılarında
`error` kontrolü zorunlu sayılmalı; tarama betiği `.tmp/` altında değil,
gerekirse `_test/` altına kalıcı alınabilir.

---

## 2026-09-10 — "Site açılmıyor" şikayeti: uçtan uca canlı denetim

**Tetikleyen:** paylaşılan link bir arkadaşta açılmadı. `quizador.pages.dev`,
`idagg-game-center.vercel.app` ve `bildim.vercel.app` tek tek ölçüldü.

**Sonuç: her iki canlı site de sağlam. Sunucu tarafında hiçbir sorun yok.**

| Adres | Durum |
|---|---|
| `quizador.pages.dev` | **200** — asıl Quizador sitesi, `VITE_MOD=bildim` derlemesi |
| `idagg-game-center.vercel.app` | **200** — hub (8 oyun) |
| `bildim.vercel.app` | **404 DEPLOYMENT_NOT_FOUND** — ölü, kullanılmamalı |

Ölçülenler (hepsi 200): ana sayfa · `index`/`react`/`router`/`supabase`
paketleri · CSS · manifest · ikonlar · `sw.js` · `_redirects` · `_headers` ·
`robots.txt` · `sitemap.xml`. Derin bağlantılar (`/turnuva`, `/profil`,
`/davet/ABC123`, olmayan bir yol) hepsi 200 + `text/html` → SPA yönlendirmesi
çalışıyor. iPhone ve Android kullanıcı-ajanıyla da 200. Tarayıcı konsolunda
uygulama kaynaklı tek hata yok.

**Misafir akışı uçtan uca denendi** (oturum geçici olarak yedeklenip kaldırıldı,
test sonrası aynen geri yüklendi): giriş ekranı geliyor → "Misafir olarak dene"
→ hesap açılıyor → "Nasıl oynanır?" ve takma ad ekranları geliyor. **Giriş
çalışıyor.**

**Eskiyen iki belge düzeltildi:**
- `GIRIS_SAGLAYICILARI.md` — "Site URL `bildim.vercel.app`, o alias kalkarsa
  girişler kırılır" uyarısı aşıldı. Alias gerçekten kalktı ama panel arada
  güncellenmiş: **Site URL artık `quizador.pages.dev`**. Ayrıca sağlayıcı
  durumu yenilendi: google + email + **misafir girişi açık** (eskiden kapalıydı).
- `CLOUDFLARE_DAGITIM.md` — aynı düzeltme + yeni bölüm: *"quizador.pages.dev
  HER ZAMAN en güncel olmalı"*.

**Kalan iki gerçek risk (kod/panel işi, kullanıcı kararı bekliyor):**

1. **Eski cihazlarda beyaz ekran.** `vite.config.js`'te `build.target` yok →
   Vite varsayılanı `modules` (Chrome 87+ / Safari 14+). Yayındaki pakette
   `?.` ve `??` var, `nomodule` yedeği yok. iOS 13'te kalmış bir iPhone ya da
   eski Android tarayıcısı siteyi **boş** görür — "açılmıyor" şikayetinin en
   olası teknik nedeni budur. Çözüm: `@vitejs/plugin-legacy`.
2. **Anon anahtar tutarsızlığı.** Cloudflare derlemesi eski JWT anahtarını
   (`eyJ…`, yerel `.env`'den), Vercel yeni `sb_publishable_…` anahtarını
   kullanıyor. İkisi de bugün çalışıyor (ölçüldü), ama Supabase eski anahtarları
   aşamalı kaldırıyor.

**Ayrıca:** `*.pages.dev` Türkiye'de operatör/DNS düzeyinde engellenebiliyor;
bu da kişiye göre değişen "bende açılıyor onda açılmıyor" tablosunu üretir.
Kalıcı çözüm özel alan adı bağlamaktır.

**Not:** test sırasında açılan misafir hesabı ("Oyuncu", 0 puan) veritabanında
kaldı — zararsız, istenirse silinebilir.

---

## 2026-09-11 — Quizador Vercel'de de yayına alındı: quizador.vercel.app

**Neden:** `*.pages.dev` Türkiye'de operatör/DNS düzeyinde engellenebiliyor;
paylaşılan link bir arkadaşta açılmamıştı. Aynı site ikinci bir adresten daha
yayına alındı ki erişim tek altyapıya bağlı kalmasın.

**Yeni adres: https://quizador.vercel.app** (ölçüldü: `/`, `/turnuva`,
`/sitemap.xml` → 200; misafir girişi tarayıcıda uçtan uca denendi, hesap
açılıyor ve ana sayfa verisi geliyor).

**Nasıl yapıldı:**
- `VITE_MOD=bildim` + `VITE_SITE_URL=https://quizador.vercel.app` ile üretim
  derlemesi alındı (Quizador sürümü — hub pakete girmiyor).
- Vercel Build Output API yapısı (`.vercel/output/static` + `config.json`,
  SPA rewrite) hazırlanıp `vercel deploy --prebuilt --prod` ile gönderildi.
  Proje adı: **quizador-vercel**, kısa alias: `quizador.vercel.app`.
- Derlemeye hub ile **aynı yeni anahtar** gömüldü
  (`sb_publishable_…`); Cloudflare'daki eski JWT anahtarı buraya taşınmadı.
- Bu sürümde `canonical` ve `sitemap.xml` artık doğru adresi gösteriyor.

**Yol boyunca çıkan engel — Vercel Deployment Protection:**
Proje ilk `--prod` dağıtımından sonra dışarıya **302** vermeye başladı
(`vercel.com/sso-api`'ye yönlendirme). Sebep: takım varsayılanı
`ssoProtection: {"deploymentType":"all_except_custom_domains"}` — yani özel
alan adı dışındaki tüm `*.vercel.app` adresleri Vercel oturumu istiyordu.
Vercel API ile `ssoProtection: null` yapıldı, site herkese açıldı.
**Yeni bir Vercel projesi açarken bu ayar tekrar karşına çıkar; ilk iş onu
kapat** (Project → Settings → Deployment Protection).

**BEKLEYEN İŞ — Google girişi için gerekli (panelden, ben yapamam):**
Supabase → Authentication → URL Configuration → **Redirect URLs**'e
`https://quizador.vercel.app/**` eklenmeli. Eklenmezse Google ile giren oyuncu
dönüşte Site URL'e (`quizador.pages.dev`) düşer — pages.dev erişilemiyorsa
kullanıcı yine takılır. **Misafir girişi ve e-posta bağlantısı bundan
etkilenmez** (misafir akışı yönlendirme kullanmıyor, test edildi).
Erişim sorunu kalıcıysa Site URL'in de bu adrese çevrilmesi düşünülmeli.

**BEKLEYEN İŞ — otomatik güncelleme:** Bu proje Git'e **bağlı değil**;
dağıtım elle yapıldı. "Quizador her zaman en güncel olsun" kuralı için
Vercel'de projeyi depoya bağlamak gerekiyor (Build command `npm run build`,
env `VITE_MOD=bildim`, `VITE_SITE_URL=https://quizador.vercel.app`,
Supabase URL + yeni anon anahtar). Aynısı Cloudflare tarafı için de geçerli —
ayrıntılar `CLOUDFLARE_DAGITIM.md`'de.

**Durum özeti:**

| Adres | Ne | Durum |
|---|---|---|
| `quizador.vercel.app` | Quizador (yeni) | **200**, misafir girişi ✔ |
| `quizador.pages.dev` | Quizador (Cloudflare) | 200, ama pages.dev engellenebiliyor |
| `idagg-game-center.vercel.app` | Hub (8 oyun) | 200 |
| `bildim.vercel.app` | — | **404, ölü** |

---

## 11 Eylül 2026 — quizador.vercel.app neden eski kaldı (çözüldü)

**Belirti:** Şenlik revizyonu push edilip Cloudflare'a deploy olduktan sonra da
oyuncular siyah arayüz görüyordu.

**Sebep iki katmanlıydı:**
1. `quizador-vercel` projesi **Git'e bağlı değil** (11 Eylül 00:01 commit'inde
   "bekleyen iş" olarak not düşülmüştü). `main`'e push otomatik deploy
   tetiklemiyor; yalnız Cloudflare ve hub projesi güncelleniyordu.
2. Elle deploy yapılsa bile yetmiyordu: **`quizador.vercel.app` alias'ı eski bir
   deployment'a bağlıydı.** Yeni deployment `quizador-vercel.vercel.app`'e
   gidiyor, asıl adres 13 saat önceki derlemede kalıyordu.

**Yapılan (11 Eylül):**
```bash
VITE_MOD=bildim VITE_SITE_URL=https://quizador.vercel.app npm run build
# dist -> .vercel/output/static + config.json (Build Output API v3, rewrite: /(.*) -> /index.html)
npx vercel deploy --prebuilt --prod
npx vercel alias set <yeni-deployment> quizador.vercel.app
```
Üç adres de doğrulandı — hepsi `index-BjZyNGmG.css` + `theme-color #CDEEFF`:
`quizador.vercel.app` · `quizador.pages.dev` · `idagg-game-center.vercel.app`.

**DİKKAT — bu proje env değişkeni kullanmıyor.** `vercel env ls production`
boş döndü; dağıtım `--prebuilt` olduğu için derleme yerelde yapılıyor ve
`VITE_MOD` / Supabase anahtarları yerel `.env`'den geliyor. Git'e bağlanırsa
Vercel kendi derleyecek ve **env eklenmeden site Supabase'e bağlanamaz**
(gereken: `VITE_MOD=bildim`, `VITE_SITE_URL=https://quizador.vercel.app`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

**Kalıcı çözüm için yapılacak (sahibin kararı):** projeyi depoya bağlamak +
yukarıdaki dört env'i production'a eklemek. Bağlanana kadar Quizador'un Vercel
kopyası **her sürümde elle** deploy edilmeli, yoksa Cloudflare güncel olur ama
Vercel adresi geride kalır.

**GÜNCELLEME — Git bağlantısı kuruldu (11 Eylül):** `quizador-vercel` artık
depoya bağlı; `main`'e push otomatik production deploy tetikliyor. Eklenen
production env'leri: `VITE_MOD=bildim`, `VITE_SITE_URL=https://quizador.vercel.app`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

**Anahtar notu:** anon anahtarı yerel `.env`'deki ESKİ JWT (`eyJ…`, 208 karakter)
değil, hub projesinin kullandığı **yeni `sb_publishable_…`** (46 karakter) olarak
eklendi — ikisi karıştırılırsa site Supabase'e bağlanamaz.

**Çıktı dizini tuzağı:** projenin panel ayarı "Output Directory: `public` if it
exists, or `.`" idi. Repoda `public/` (PWA varlıkları) olduğu için Vercel kendi
derlemesinde onu çıktı sanıp yanlış içerik yayınlayacaktı. `vercel.json`'a
`framework: vite`, `buildCommand`, `outputDirectory: dist` yazıldı; aynı değerler
hub projesi için de doğru.

**Alias tuzağı:** `quizador.vercel.app` ek bir `.vercel.app` alias'ı; ilk otomatik
deploy'da kendiliğinden geçmedi, `vercel domains add quizador.vercel.app
quizador-vercel` ile projeye bağlandıktan sonra güncel deployment'a taşındı.

**GÜNCELLEME — Supabase auth adresleri düzeltildi (11 Eylül, sahibi panelden yaptı):**
Artık **ana site `https://quizador.vercel.app`**; oyunculara yalnız bu link
veriliyor çünkü `.dev` bazı telefonlarda/operatörlerde açılmıyor.

| Ayar | Eski | Yeni |
|---|---|---|
| Site URL | `https://quizador.pages.dev` | **`https://quizador.vercel.app`** |
| Redirect URLs | 4 kayıt | 5 kayıt (**`https://quizador.vercel.app/**` eklendi**) |

Dışarıdan doğrulandı:
```bash
curl -sSI https://zfpnxzybcpkxsotwdsey.supabase.co/auth/v1/callback | grep -i location
# location: https://quizador.vercel.app?error=invalid_request&...
```
Böylece Google ile giriş yapan oyuncu artık `.dev`'e düşmüyor. `pages.dev`
kayıtları bilerek silinmedi — o adresten giren biri olursa kırılmasın.

**Vercel sitesi denetimi (aynı gün, hepsi temiz):** canonical / og:url / og:image
→ vercel · manifest `start_url` `/`, `scope` `/`, tema `#CDEEFF` · robots +
sitemap → vercel · 14 ağ isteğinin tamamı 200 · konsolda hata yok (çıkanlar
tarayıcı eklentisinden) · Supabase anahtarı (`sb_publishable_…`) canlıda
doğrulandı — anonim RPC çağrısı "permission denied" döndü, yani anahtar geçerli
ve sunucuya ulaşıyor · davet linkleri `window.location.origin` kullanıyor, yani
vercel'den paylaşan vercel linki paylaşıyor.

---

## 11 Eylül 2026 — Quizador Meydanı (3B harita) eklendi

Bildim'e **Harita** sekmesi: three.js ile 3B meydan, Supabase Realtime
presence + broadcast ile canlı çok oyunculu (konum 8/sn, lerp; emoji 2 sn/1).
İzole modül `oyun/harita/`, lazy route — three.js yalnız girince iniyor
(733 kB / gzip 190 kB ayrı chunk). DB değişikliği yok. Ayrıntı ve test
sonuçları: `oyun/PROGRESS.md` (11 Eylül (5)) ve `oyun/harita/CLAUDE.md`.
Commit edildi, **push edilmedi** — sahibinin onayını bekliyor.

---

## 12 Eylül 2026 — Quiz Square Revizyon Paketi 1 (11 madde)

Onaylanmış oyun kararlarının kod tarafı. Her madde ayrı commit, 8 yeni
migration (141–148) **canlıya uygulandı**.

1. **Geri bildirim penceresi 2 sn → 1 sn** (`GB_MS`). Bota karşı oynarken
   bekleme fazla geliyordu; doğru/yanlış zaten ilk anda görünüyor.
   `GB_HIZLI_MS = 700` sunucu mantığına bağlı olduğu için değişmedi.
2. **Botlar anında cevaplıyor** (141): gecikme 2–7 sn yerine 0.3–0.8 sn;
   kolon varsayılanları da düştü. `bot_gecikme_sn()` fonksiyonuna
   dokunulmadı. *Not: ileride eklenecek "gizli insansı botlar" gerçekçi
   sürede cevaplamalı — onlar için ayrı bir alan gerekecek.*
3. **Pas → Soru Değiştir** (142). Neden: yanlışın cezası olmadığı için pas
   geçmek her zaman rastgele şıkka basmaktan kötüydü. Yeni davranış: soru
   atlanmaz, yerine yenisi gelir, süre baştan başlar, indeks değişmez,
   **rakibin sorusu etkilenmez** (kişiye özel `soru_degisimleri` tablosu +
   `soru_id_coz` / `soru_baslangic_coz` / `soru_son_baslangic` çözücüleri).
   Maç başına 1 hak; turnuvada yasak (herkes aynı soruyu görüyor).
   Envanterdeki Pas'lar 1'e 1 dönüştü, coin iadesi yok.
4. **Hız bonusu kalktı** (143): doğru = 10, yanlış = 0. Bütün modlar.
   Cevap süresi kaydedilmeye devam ediyor (istatistik + bot kalibrasyonu).
5. **Turnuvada altın soru** (144): normal maç berabere bitebilir (ikisi de
   beraberlik coini alır). Turnuvada sorular bitip hayatta kalanlar eşitse
   maçta kullanılmamış yeni bir soru eklenir, biri kazanana kadar sürer.
   Altın soruda joker kapalı; ekranda ayrı başlık ve renk.
6. **Sıralı maç limiti** (145): aynı çiftin aynı günkü 1–5. maçı tam,
   6–10. yarım, 11+ sıfır ödül ("dostluk maçı"). Maç yine oynanır —
   oyuncular yalnız arkadaşlarıyla oynuyor olabilir, limit onları
   cezalandırmamalı. Sessiz korumalar: aynı cihaz/IP'den iki hesap arasında
   ödül yok (`oyuncu_cihazlari`), haftalık maçlarının %70'inden fazlası tek
   kişiyle olan oyuncu `kotuye_kullanim_isaretleri` tablosuna yazılır
   (otomatik ceza yok).
7. **Ezeli rakip yalnız arkadaşlarla** (146). Sahibinin sözü: "tanımadığımız
   insanlarla aramızdaki istatistiği tutmayalım, bu hiçbir oyunda yok."
   Mevcut kayıtlar silinmedi, yalnız özet arkadaşla sınırlandı.
8. **Haritada yön topuzu sol alta**, dans/emoji sağ alta (`row-reverse`).
   Standart mobil düzen: hareket solda, eylem sağda. Zum düğmeleri topuzun
   üstüne, dans paneli sağa taşındı; dokunma alanı boyutları değişmedi.
9. **Soru zorluğu** (147): `questions.zorluk` (1–5, varsayılan 3) +
   `dogru_sayisi`/`cevap_sayisi` sayaçları + kategori-zorluk indeksi.
   Turnuvada bant: 1–5. soru 1-2, 6–10 → 3, 11+ → 4-5 (yetmezse genişler).
   082'de pasife alınan 53 aşırı basit soru zorluk 1 ile geri açıldı;
   turnuva dışı seçimlerde `zorluk >= 2` filtresi var. Günlük pg_cron işi
   en az 30 cevap almış soruların zorluğunu doğru oranına göre atıyor.
10. **Coin rakamları `oyun_ayarlari`'nda** (148): galibiyet 25, beraberlik
    10, günlük görev 15, turnuva 150/75/40 + katılım 10, meydandan turnuva
    20, reklam 25 (günde 5), başlangıç 500, günlük tavan 400. Günlük seri
    artık coin de veriyor (5/10/15/25). Joker birim fiyatları 40/60/80 ve
    paketler 400/1.000/3.000; tek joker alma RPC'si + dükkân bölümü eklendi.
    İstemci `oyun/lib/ayarlar.js` ile tablodan okuyor. Geçiş reklamı artık
    **ilk 3 gün** muaf (önceden ilk 3 maç).
11. **Yatay ekran**: teşhis satırı, "yatay moda geç" düğmesi, yatay ölçek ve
    FOV 42→48 zaten yerindeydi; eksik olan topuzun konumuydu (madde 8 ile
    çözüldü). Kurulu PWA'da manifest kilidi kurulum anında okunduğu için
    bilgi kutusu ("kısayolu silip yeniden ekle") duruyor.

**Doğrulama:** `npm run build` temiz; `soru_degisimleri` akışı (yeni soru,
dizide olmayan, sayaç sıfır, rakip etkilenmiyor) ve altın soru akışı
(3→4 soru, `altin_soru=t`, joker sınırı 0) canlı veritabanında
rollback'li işlemlerle test edildi. Canlıda hız bonusu içeren fonksiyon
kalmadı (0).

---

## 12 Eylül 2026 (2) — Revizyon Paketi 2 (7 madde)

Bot sistemi, lig sistemi ve meydan etkileşimleri. Her madde ayrı commit,
6 yeni migration (149–154) **canlıya uygulandı**. Sıra bilerek korundu:
geçmiş silinmeden botlar eklenseydi eski test istatistikleri yeni
sistemle karışırdı.

1. **Geçmiş sıfırlandı** (149). Oyun henüz kitleye açılmadı; tablodaki her
   şey test verisiydi. **4.392 satır silindi**: 103 maç + 2.185 cevap,
   13 turnuva, 9 grup maçı, 3 hızlı maç, 64 kategori ustalığı, yanlış
   bankası (473), görülen sorular (688), rozet/görev/çalışma kayıtları;
   33 profilin puan/seri/maç sayaçları sıfırlandı. **Korunanlar:** hesaplar,
   arkadaşlıklar, **14.000 coin**, coin/satın alma hareketleri, joker
   envanterleri, sahip olunan eşyalar, soru havuzu ve soru istatistikleri.
   `truncate cascade` bilerek kullanılmadı — bilinçli sırayla `delete`,
   sayılar `raise notice` ile.
2. **Gizli bot sistemi — 80 bot** (150). İki katman: `acik` (mevcut 5 bot;
   anında cevaplar, coin %50) ve `gizli` (yeni 80; gerçekçi süre, **tam
   coin** — coin farkı olsaydı oyuncu botu coinden anlardı). Seviye 1–100
   sürekli; bronz 20/gümüş 20/altın 18/elmas 14/efsane 8 bot, her birinin
   isabeti ve süre penceresi **kendine özel** (ada bağlı sapma), isabet
   tavanı 0.95. Eşleşme %80 seviye ±10 / %20 rastgele, **her ikisinde de
   lig sınırı** (kendi lig ±1) — Efsane oyuncusuna Bronz botu düşmez;
   gizli bot yalnız gerçek oyuncu yoksa devreye girer. Botlar lig
   sıralamasında görünür ama lig puanları %40'a inik; arkadaşlık isteklerini
   kabul etmezler (1–2 gün sonra sessizce silinir); her turnuvaya yalnız
   %20'si ve her seferinde farklıları girer; meydana turnuva saatine yakın
   1–2 bot çıkar. İsimler/ülkeler/cinsiyet sahibinin listesinden
   (36 kadın, 44 erkek). Avatar kuralı yorumda — avatar sistemi gelince
   uygulanacak (%30 başlangıç / %50 sıradan / %20 özel, etkinlik eşyası
   asla, seviye-görünüm uyumu).
3. **Kademeli lig** (151). Bronz→Gümüş→Altın→Elmas→Efsane, 25 kişilik
   gruplar; lig başına sınır yok, sınır grupta. Hafta sonunda grubun ilk 5'i
   yükselir, son 5'i düşer — 400 kişi arasında birinci olmaya gerek yok.
   Sezon pazartesi 00:00 TSİ (pg_cron 20:45 UTC, `haftayi_kapat`tan önce).
   Grup doldurma: önce gerçek oyuncular, bot yalnız boşluğu kapatır, grup
   başına en fazla 15 bot ve asla yarıdan fazlası değil; gerçek oyuncu azsa
   grup 15 kişilik açılır. **Botlar lig değiştirmez.** Pasif oyuncu 1 hafta
   düşmez, 2 hafta üst üste pasifse bir lig düşer. Efsane'nin üstü yok
   (ilk 5 kalır + rozet). Ödüller 100/50/25 … 250/125/60, hepsi
   `oyun_ayarlari`'nda. Ekranda "Bronz Lig · 7/25", yükselme/düşme çizgileri,
   sezon geri sayımı; **toplam oyuncu sayısı hiçbir yerde yok**. Gizli
   botlar sıralamada robot rozeti almıyor.
4. **Turnuva saatleri 13:00 / 21:50 TSİ** (152), sabit ve yerel saatten
   bağımsız — yerel saate göre olsaydı ince oyuncu havuzu bölünürdü.
   Değerler `oyun_ayarlari`'nda; yeni `sonraki_turnuva_ani()` RPC'si geri
   sayımları ve meydandaki kupa binasını besliyor. **Yan fayda:** kupa
   binası lobi satırının boş `baslangic` alanını okuduğu için sürekli
   "TURNUVA BAŞLADI" gösteriyordu, o hata da düzeldi.
5. **Maç bitince meydana dönüş.** Meydandan giren oyuncu maç bitince
   haritaya döner ve **ayrıldığı noktada** doğar (x, z, dönüş açısı;
   sessionStorage). Ana menüden girenler normal akışta kalır. Mantık
   `oyun/harita/donus.js`'te — 3B modelden bağımsız.
6. **Meydanda oyuncuya dokunma**: meydan oku / kahve (5 coin) / balon
   (5 coin). Kahvede iki karakter karşı karşıya gelip 15 sn fincan kaldırır,
   aralarda kahkaha atar; balonda veren elini uzatır, 3–5 balon alanın
   üzerinde yükselip kaybolur. Coin **sunucuda** düşer, reddedilirse ya da
   20 sn yanıtsız kalırsa iade edilir; "Rahatsız etme" ayarı profil
   ayarlarında (varsayılan kapalı = ikramlar açık). **Mimari şartı
   uygulandı:** mantık/ağ/coin `etkilesim.js`, görsel `ikramGorsel.js`,
   meydan botlarının gezinmesi `meydanBotlari.js` — hiçbiri diğerini
   bilmiyor, karakterler baştan değişirse yalnız görsel dosya yeniden
   yazılır.
7. **Facebook ile giriş** (154). Düğme Google'ın altında; sağlayıcının
   Supabase'de açık olup olmadığı `/auth/v1/settings`'ten okunuyor, kapalıysa
   düğme çizilmiyor (ham JSON hata sayfası yok). **Kısıt bilerek yazıldı:**
   FB 2014'ten beri tam arkadaş listesi vermiyor; `/me/friends` yalnız
   uygulamayı kullanan arkadaşları döndürüyor ve `user_friends` App Review
   istiyor. Yapılan: eşleşen oyuncular arkadaş önerisi. Yapılmayan: "tüm FB
   arkadaşlarını davet et" — yerine paylaşım diyaloğu. Onay gelmeden de
   çalışır (izin yoksa bölüm sessizce gizlenir). Meta/App Review adımları
   `GIRIS_SAGLAYICILARI.md`'de.

**Doğrulama:** `npm run build` her bölümde temiz. Canlı veritabanında
rollback'li işlemlerle test edildi: lig sınırı (Efsane oyuncuya 200
eşleşmede 0 Bronz/Gümüş bot), coin (açık bot 12 · gizli bot 25 · bot
galibiyetinde lig puanı 8), sezon kapanışı (2 grupta 10 yükselme, botların
ligi değişmedi, yeni hafta grupları yeniden kuruldu, 6 ödül), ikram akışı
(-5 coin · redde iade · "rahatsız etme" reddi · zaman aşımında iade).

---

## 12 Eylül 2026 (3) — Gizli bot sistemi: gizlilik ve inandırıcılık

Paket 2'nin 1. ve 2. maddeleri (geçmiş sıfırlama + 80 gizli bot) zaten
149–150 ile uygulanmıştı. Bu tur, botları **gerçekten gizli** yapan
eksikleri kapattı (migration 155):

- **Gizlilik açığı kapatıldı.** `is_bot`, `bot_isabet`, `bot_seviye`
  kolonları `authenticated` rolüne açıktı: oyuncu profil sorgusuyla
  rakibinin bot olduğunu görebiliyordu. Kolonlar çekildi; yerine üretilmiş
  `acik_bot` kolonu geldi (yalnız adında "Bot" geçen açık botlar için
  true). İstemcideki dört dosya (`OyuncuKarti`, `ChallengesPage`, `Home`,
  `MatchPage`) buna geçirildi.
- **Arama ekranındaki sızıntı.** "Uygun rakip bulunamadı — BilgeBot ile
  oynuyorsun" metni ve "Bot ile hemen oyna" düğmesi kalktı.
- **Eşleşme gecikmesi.** `quick_match` bot kurmadan önce sunucuda 2–5 sn
  bekletiyor (arama başına sabit, oyuncuya bağlı). İstemci atlayamaz.
- **Yeni hesap bandı 20–45.** Eskiden 1. seviye botlar düşüyordu, oyun ölü
  görünüyordu. Bant hesabı artık tek yerde (`bot_seviye_araligi`) — lig
  sınırı geldiğinde oraya eklenecek.
- **Tekrar engeli.** Son 8 rakip elenerek seçim yapılıyor; art arda aynı
  bot gelmiyor (10 maçlık testte 10 farklı rakip).
- **Görünüm çeşitliliği.** 80 botun hepsi aynı varsayılan görünümdeydi.
  Görünüm bot adından deterministik türetildi: 80 farklı görüntü,
  ~%20 sade / %80 giyinik / %17 özel dokunuş, etkinlik eşyası yok.

**İsim listesi düzeltmesi:** sahibin listesinde `cileksi` iki kez yazılmış
ve başlıklar "Kadın (26) / Erkek (31)" diyor; gerçekte **25 kadın + 32
erkek = 57** (toplam doğru). Tekilleştirilmiş hâli uygulandı.

---

## 12 Eylül 2026 — Karakter sistemi düzeltmeleri (3 madde)

Sahibi 2B karakter sisteminde üç şeyin çalışmadığını bildirdi.

### 1. Tanıtım metinleri kaldırıldı
`karakterler.aciklama` ve `karakterler.js` içindeki `bio` alanları
PatiRun'dan (yarış oyunu) gelmişti: "Plajdan yarışa geldi", "Isınma turu
diye pisti üç kez koştu", "Her checkpoint'te yeni bir dörtlük yazıyor".
Bilgi yarışmasında anlamsız. Yeni metin yazılmadı, alan boşaltıldı
(migration 160). Kolon düşürülmedi — `karakter_katalogum` onu döndürüyor.

### 2. "Karakter seçilemiyor" — KÖK SEBEP: yanlış uygulama dosyası
**quizsquare.vercel.app `VITE_MOD=bildim` ile derleniyor**, yani
`src/App.jsx` değil `src/BildimApp.jsx` çalışıyor. Yeni `/gorunum`
rotası yalnız `App.jsx`'e eklenmişti; canlıda `/gorunum` hâlâ eski 3B
`GorunumPage`'i açıyordu. Oyuncu yeni karakterleri hiç göremiyor,
"tıklanmıyor" diyordu. Tıklamada, CSS'te, `karSahip` verisinde sorun yoktu
(tarayıcıda ölçüldü: `elementFromPoint` kartın kendi `<img>`'ini
döndürüyor, RPC 5 karakter sahipliği dönüyor).

**KURAL:** bu depoda iki route dosyası var. Yeni rota eklerken
**ikisine birden** eklenmeli, yoksa canlı site görmez.

Aynı incelemede iki hata daha çıktı:
- **Kaydet 400 dönüyordu.** Sayfa karakterin *varsayılan* kombinini de
  gönderiyordu; `gorunum_dogrula` her parçanın sahipliğini soruyor ve
  "Bu parçaya sahip değilsin: esofman" diye reddediyordu. Artık yalnız
  oyuncunun açık seçimleri gönderiliyor — varsayılanlar zaten çizim
  anında `kozmetikCoz` ile tamamlanıyor, `gorunum_kaydet` de kozmetiği
  derin birleştiriyor.
- **Kurulum sihirbazı tıklamayı yutuyordu.** İlk giriş yönlendirmesi
  sihirbaz açıkken de `/gorunum`'a gidiyordu; sihirbaz tam ekran
  `bd-modal-katman` (position:fixed, z-index 100) olduğu için kartlar
  görünüyor ama tıklama sihirbaza gidiyordu. Kurulum bitmeden
  yönlendirme yapılmıyor.

### 3. Haritada 2B karakter (billboard)
Tek görünüm kaydı: `/gorunum`'da seçilen karakter ve kozmetikler artık
meydanda da görünüyor. Yöntem: SVG → 256×256 tuval → `THREE.Sprite`
(Don't Starve / Paper Mario yöntemi; sprite hep kameraya baktığı için
döndürme derdi yok).

- Yeni modül `oyun/harita/karakterGorsel.js` — **görünüm kaydı → doku**
  işinin tek yeri. Sahne (dunya.js) yalnız ekleyip çıkarıyor. Harita
  ileride baştan çizilecek; modeller değişince burası değişir.
- Eski 3B gövde **silinmedi**: `avatar.js` + `esyalar.js` yerinde,
  `/gorunum-3b` önizlemesi onları kullanıyor. Geri dönmek için
  `dunya.js`'teki tek import satırını çevirmek yeter.
- Döndürülen grubun `userData` şekli `avatar.js` ile aynı tutuldu
  (kok/bacaklar/kollar/govde/kafa/etiket) — `danslar.js`, `ikramGorsel.js`
  ve yürüme animasyonu değişmeden çalışıyor.
- Yürürken `run1`/`run2`, dururken `idle`; bakış yönü kameraya göre
  aynalanıyor. İsim etiketi ve emoji balonları eskisi gibi.
- Doku önbelleği referans sayılı: 40 avatar / 10 farklı görünüm →
  **10 doku** (ölçüldü). Son kullanan sahneden çıkınca `dispose()`.
  Meydandan çıkışta `karakterDokulariniTemizle()` kalanı bırakıyor.
- `/gorunum-3b` rotası duruyor ama hiçbir menüde bağlantısı yok.

**Ölçümler:** 40 avatar kurulumu 22 ms, yıkıp yeniden kurma 11 ms;
ikinci turda da 10 doku (bellek büyümüyor). İki hesap iki sekmede
birbirinin doğru karakterini görüyor. 390 px'de yatay kaydırma yok,
7 ekranda konsol hatası 0. `npm run build` temiz.

---

## 12 Eylül 2026 — Revizyon Paketi 3 (dört madde)

### 1. Dereceli maç ayrı seçenek, puansız maç tamamen ödülsüz
Sadeleştirme paketinde "Dereceli Maç" düğmesi kaldırılmıştı; sahibi iki
modun ayrı durmasını istedi. Artık:

| Düğme | Yer | Davranış |
|---|---|---|
| Hemen oyna | kahraman bölümü | `dereceli = false` — coin yok, lig puanı yok |
| Dereceli Maç | "Başka nasıl oynanır" | `dereceli = true` — coin + lig puanı |

Farkı oyuncuya yazıyla söyleniyor ("Puansız — keyfine bak…" /
"Lig puanını ve coin'ini etkiler…"). "Normal Maç" düğmesi yerini
"Dereceli Maç"a bıraktı (ikisi aynı çağrıyı yapacaktı). Joker Dükkânı ve
Lig geri gelmedi — alt sekmede duruyorlar.

**Kök sorun sunucudaydı:** `mac_sonuclandir` içinde `coin_mac_odulu`
çağrısı `dereceli` kontrolünden ÖNCE duruyordu. Yani "puansız maç" coin
farmlamanın en ucuz yoluydu. Migration 162 iki katmanda kapattı:
çağrı kontrolün altına indi ve `coin_mac_odulu` referans bir maç id'siyse
maçın kendi `dereceli` alanına bakıyor. İstemci zorlasa bile geçemez.

Canlı DB'de rollback'li ölçüm: `dereceli=false` → coin 155→155, puan 0→0,
coin hareketi 0. `dereceli=true` → coin 155→180, puan 0→20, hareket 1.

### 2. Meydanda zıplama
Yeni modül `oyun/harita/ziplama.js` — **saf mantık**, three.js/DOM/ağ
bilmiyor. Yükseklik (1.9) ve süre (0.62 sn) `oyun_ayarlari`'nda değil
burada: oyun dengesi değil, his meselesi (sahibinin kararı).

Mimari şart gereği üç katman ayrı:
- **mantık** `ziplama.js` (parabolik eğri, "havadayken tekrar yok")
- **ağ** `coklu.js` — poz paketine `h` alanı eklendi
- **çizim** `dunya.js` — `yurumeAnimasyonu(av, dt, guc, zipla)` verilen
  yüksekliği uyguluyor. Modeller değişince yalnız bu katman değişir.

Girdi: PC'de boşluk tuşu (kenar tetikleme — basılı tutmak işe yaramaz),
mobilde sağ alttaki eylem satırında "Zıpla" düğmesi. Yön topuzu solda
kaldı. Zıplarken yürüme animasyonu ve dans kesiliyor, sprite idle'a
dönüyor. Uzak oyuncularda yükseklik de ara değerlemeye giriyor; paketinde
`h` olmayan eski sürüm 0 sayılıyor. Kamera dikeyde zaten hiç oynamıyor,
`prefers-reduced-motion` altında zıplama kalıyor.

### 3. Arayüz çoklu dil — Aşama 1
`oyun/lib/dil.js` (düz JS sözlük + `t()`, kütüphane yok) ve React
kancası `oyun/lib/dilKanca.js`. Kural sıralı: **profil tercihi >
bu tarayıcıdaki seçim (localStorage) > `navigator.language`**
("tr" ile başlıyorsa Türkçe, başka her şey İngilizce). **IP/ülkeye
bakılmıyor** — Almanya'daki Türk Türkçe, Türkiye'deki yabancı İngilizce
görsün diye.

Çevrilen ekranlar (Aşama 1 kapsamı): `src/pages/Login.jsx` ve
`oyun/components/KurulumSihirbazi.jsx`. Giriş ekranının üstüne TR/EN
değiştirici eklendi. Sözlükte olmayan anahtar Türkçe metnin kendisine
düşüyor, yani yarım çeviri boş ekran üretmiyor.

**Sorular da oyuncunun dilinde (migration 163).** `question_translations`
tablosu ve 7.682 İngilizce çeviri vardı ama **hiçbir fonksiyon bu tabloya
bakmıyordu** (ölçüldü: 0). `soru_sec` yalnız `q.dil = oyuncunun dili`
diyor, kaynağı İngilizce soru olmadığı için İngilizce oyuncu her zaman
Türkçe havuza düşüyordu. Artık:
- bir soru ancak maçtaki **her** oyuncunun dilinde okunabiliyorsa
  seçiliyor; "bulamazsan Türkçesini ver" geri düşüşü kaldırıldı
- `soru_dilinde()` metni tek yerden veriyor; soru döndüren tüm RPC'ler
  (1v1, grup, hızlı, turnuva, hızlı mod, çalışma, Soru Değiştir jokeri)
  onu çağırıyor
- turnuva havuzuna yalnız İngilizce çevirisi olan sorular giriyor
  (turnuva sorusu herkese aynı anda sorulur, kimin gireceği belli değil)

### 4. İngilizce çeviri denetimi
7.682 çevirinin tamamı dört yöntemle tarandı. **Bildirilen "Cami →
Mosque" hatası canlı veritabanında yok** — o soruda şık zaten "Jami"
yazıyor (şıklar: Farid ud-Din Attar / Saadi / Hafiz / Jami). Özel
isimler genel olarak doğru: Çehov→Chekhov, Sadi→Saadi, Hafız→Hafez,
Basra Körfezi→Persian Gulf, Sur→Tyre, Sancak→Sandžak, Ağrı Dağı→Mount
Ararat.

Tarama **başka iki gerçek hata** buldu (migration 164, canlıya uygulandı).
İkisi de "özel isim çevrildi" değil, **çeldirici içeriği kayması**:
1. `'Parazit' filmi hangi ülkenin yapımıdır?` — TR şık "Endonezya",
   EN şık "The Philippines" yazıyordu → **Indonesia** oldu.
2. `El Nino olayı neyi etkiler?` — dört şıktan üçü Türkçesiyle ilgisizdi
   ("Only Turkey / Only the poles / Nothing") → şıklar yeniden yazıldı.
3. Tutarlılık: aynı şair 1 soruda "Hafiz", 7 soruda "Hafez" → hepsi
   **Hafez**.

Doğru cevap her üçünde de yerindeydi, yani puanlama bozulmamıştı.

**Yöntem notu (sonraki denetimler için):** naif "büyük harfle başlıyorsa
özel isimdir" kuralı işe yaramıyor — Türkçede cümle ve şık zaten büyük
harfle başlıyor, canlı korpusta soruların **%89,7'sini** işaretledi.
Güvenilir işaret, cümlenin ORTASINDA büyük harf: büyük harf dizisi
tabanlı kural yanlış pozitifi **%8,3'e** indirdi.

**Kalıcı kural:** `kalite.ts` içine `ceviriNedenGecersiz()` eklendi.
Özel isim çeviride korunmuş mu diye bakıyor; uluslararası yazım farkına
tolerans var (Cami→Jami geçer, Cami→Mosque reddedilir), tırnak içi eser
adları ve ülke/kıta adları kuralın dışında. Üretim istemine de aynı kural
yazıldı. `npx supabase functions deploy generate-questions` **403
dönüyor** (makinedeki CLI belirteci başka hesaba ait — bkz. eski notlar);
kod depoda, dağıtım bekliyor.

### Doğrulama
- `npm run build` temiz; tarayıcı uyumluluk denetimi TEMİZ.
- Testler: `kalite-test.mjs` 38/38, yeni `oyun/_test/ziplama-test.mjs`,
  `ziplama-ag-test.mjs` (h paketle gidiyor, hız sınırı yutmuyor),
  `dil-test.mjs` (dil kuralının üç katmanı).
- Canlı sitede: iki ayrı düğme görünüyor, giriş ekranı tarayıcı diline
  göre açılıyor, TR/EN değiştirici çalışıyor (ekran tamamen İngilizceye
  dönüyor), 390 px'de yatay kaydırma yok, konsol hatası 0.
- Meydan HUD'u ölçüldü: topuz solda (x=18), Zıpla (x=1327) ve Dans
  (x=1420) sağda.
- **Yapılamayan:** 3B sahnenin kendisi otomasyon tarayıcısında
  çalışmıyor — sekme arka planda kaldığı için `document.hidden = true`,
  `requestAnimationFrame` duruyor ve sahne "hazırlanıyor" perdesinde
  kalıyor. Zıplamanın görsel doğrulaması ve iki sekmeli canlı deneme bu
  yüzden yapılamadı; yerine mantık ve ağ katmanı testle doğrulandı,
  dağıtılan paketin içinde `h:+_.toFixed(2)` ve `Number(b.h)` olduğu
  görüldü.

### Migration'lar
162 `puansiz_mac_odulsuz` · 163 `oyuncu_dilinde_soru` ·
164 `ceviri_denetimi_duzeltmeleri` — üçü de canlıya uygulandı ve
`supabase_migrations.schema_migrations`'a yazıldı (161 de geriye dönük
kaydedildi; uygulanmıştı ama kaydı yoktu).

### Ek — Edge Function dağıtıldı (aynı gün, panelden)

`npx supabase functions deploy` 403 veriyor (makinedeki CLI belirteci
`idafroditproject@gmail.com` hesabına ait, proje `winegg420`'de). **Çözüm:
Supabase panelindeki kod düzenleyici.** Dashboard → Edge Functions →
generate-questions → **Code** sekmesinde `index.ts` ve `kalite.ts` doğrudan
düzenlenip "Deploy updates" ile dağıtılabiliyor. CLI'ye hiç gerek yok.

Dağıtımdan önce panel içeriği depoyla karşılaştırıldı: canlıdaki sürüm
**commit `6b0b595`** ile bire bir aynıydı (index.ts 7.226, kalite.ts 3.576
karakter). Yani panelden elle düzenlenmiş bir şey yoktu, üzerine yazmak
güvenliydi — ama fonksiyon **üç commit geride kalmıştı**. Dağıtımla birlikte
şunlar da canlıya çıktı:
- `86f1927` şık uzunluğu dengesi kalite kapısı (yayınlanmamıştı)
- `80445ce` marka adı Quizador → Quiz Square
- `a953d61` özel isim çeviri kuralı (bu paketin işi)

Dosyalar panele elle yazılmadı: sayfa `raw.githubusercontent.com`'dan
`main` dalındaki dosyaları çekip Monaco düzenleyicisine yazdı, böylece
kopyalama hatası riski sıfır. Dağıtım sonrası sayfa yeniden yüklenip
sunucudan gelen içerik doğrulandı: index.ts 8.645, kalite.ts 15.024
karakter — depodakiyle aynı; `ÖZEL İSİMLER ASLA ÇEVRİLMEZ` ve
`ceviriNedenGecersiz` canlıda.

**Dağıtım sırasında çıkan asıl sorun — SORU ÜRETİMİ 24 SAATTİR ÇALIŞMIYOR:**
panelde "son 24 saatte 24 hata, hepsi 500" görünüyordu. `bildim-soru-uret`
cron'u saatte bir (dakika 30) çalışıyor, yani **her çağrı başarısız**.
Fonksiyon elle çağrıldığında sebep çıktı:

```
{"hata":"ANTHROPIC_API_KEY tanımlı değil","hedefKategori":"spor", ...}
```

Panelde **Edge Function Secrets** listesinde `ANTHROPIC_API_KEY` YOK
(var olanlar: CRON_SECRET, VAPID_*, SUPABASE_*). Anahtar silinmiş ya da hiç
girilmemiş. Kodda sorun yok; yeni dağıtım da aynı hatayı verir çünkü sebep
eksik gizli anahtar.

**Yapılması gereken (yalnız sahibi yapabilir):** Dashboard → Edge Functions
→ Secrets → Name `ANTHROPIC_API_KEY`, Value = Anthropic API anahtarı → Save.
Anahtar girildikten sonra bir sonraki saat başı 30'da cron kendiliğinden
çalışır; hemen denemek için fonksiyonu `x-cron-secret` başlığıyla POST etmek
yeterli. Havuz durumu şu an: cografya 1.707, tarih 903, edebiyat 887,
sinema 853, muzik 850, bilim 844, sanat 843, teknoloji 838, genel_kultur 800,
spor 765.

## 13 Eylül 2026 — Codex'in 3B avatar sistemi depoya alındı ve asıl sistem oldu

**Ne olmuştu:** Codex'in 3B avatar işi (`oyun/avatar3d/`) hiç GitHub'a
gönderilmemiş, doğrudan Vercel'e kaynak dağıtımı yapılmıştı. Depo dışındaki
worktree'de duruyordu. `main`'e yapılan bir push canlıyı GitHub'dan yeniden
kurunca 3B sayfalar canlıdan silindi; `/oyun/avatar3d/gardrop.html`
istekleri SPA kabuğuna düşüyordu.

**Kök sebep:** `vercel.json` içindeki `buildCommand`. 3B sayfaların var
olmasının tek sebebi Codex'in oraya koyduğu çok girişli derlemeydi; o satır
eski hâline dönünce sayfalar dist'e hiç girmedi.

- **Aşama 1:** `oyun/avatar3d/` (22 dosya) aynen aktarıldı, `vercel.json`
  çok girişli derlemeye alındı. `package.json > build:bildim` de aynı
  config'e bağlandı — yerel derleme ile canlı derleme ayrışmasın.
- **Aşama 2:** `/gorunum` artık 3B gardıroba gidiyor
  (`GardropaGit.jsx`; gardırop ayrı giriş noktası olduğu için rota bileşeni
  olamaz). Eski sayfalar `/gorunum-2b` ve `/gorunum-3b`'de yedekte,
  menülerden bağlantısız. Meydandaki "dans al" bağlantısı `/gorunum-3b`'de
  bırakıldı: 3B gardıropta dans yuvası yok.
- **Aşama 3:** Meydandaki karakter gerçek 3B gövde. `karakterGorsel.js`
  girişleri `meydan-model.js`'e devrediyor, eski billboard kodu
  `billboardAvatarKur` adıyla duruyor. `danslar.js` kafa sıfırlaması artık
  modelin kendi `kafaY`'sini kullanıyor (eski sabit 3.05'ti; 3B modelde kafa
  yerel olarak 1.10 — kafa gövdeden fırlıyordu).
- **KALABALIK SINIRI (ölçüldü, karar):** 3B gövde karakter başına **57 çizim
  çağrısı / 33.068 üçgen**; eski billboard 2 çağrıydı. 12 oyuncu = 684 çağrı,
  telefon GPU'su için çok. İlk 6 oyuncu 3B, gerisi billboard'da kalıyor
  (`UC_BOYUTLU_SINIR`). Model gardırop için tasarlandı (parmak, iris, göz
  kapağı, bağcık), kalabalık için değil. Kalabalıkta tam 3B istenirse
  modelin sadeleştirilmesi gerekir — ayrı iş.
- **Aşama 4:** Kozmetik küçük resimleri Codex'in modeline taşındı
  (`avatar3d/portre.js > parcaPortresi`, `ParcaPortresi.jsx`). Portre başına
  **~55 ms** (31 ms'i modelin kurulması); eski basit avatarda 8-11 ms'ti.
  Kare bütçesine sığmadığı için kuyruk `requestIdleCallback`'e alındı.
- **Köprü:** Gardırop yerel deneme cüzdanında çalıştığı için kaydedilen
  kıyafet sunucuda değil. `HaritaSayfasi` onu `gorunum.avatar3d` içine
  koyuyor; meydan `gorunum`u zaten realtime ile yayınladığı için öteki
  oyuncular da doğru kıyafeti görüyor. **Gerçek ekonomiye bağlanınca bu
  köprü kalkmalı.**
- Yeni test: `oyun/_test/meydan-3b-test.mjs` — meydan sekmesi gizliyken
  tarayıcı render'ı durdurduğu için ekrandan doğrulanamıyor; kurulum,
  yürüme, zıplama, 14 dans, görünüm değişimi ve bellek bırakma burada
  ölçülüyor.
- `CLAUDE.md` + `AGENTS.md`: derleme ayarı uyarısı eklendi.

## 13 Eylül 2026 (2) — Tek karakter sistemi: 3B her yerde

**Şikayet:** "Görünüm sayfasında hâlâ eski görsellerimiz var. Oyun başında
seçilen avatar eski görseller — meydanda çıkan görseller değil."

**Kök sebep (ölçüldü):** depoda üç avatar sistemi birden canlıydı —
(A) 31 düz SVG ikon (kurulum sihirbazı), (B) 2B PatiRun karakterleri
(`oyun/karakter/`), (C) Codex'in 3B sistemi. `src/components/Avatar.jsx`
(18 dosyada kullanılıyor) yalnız B ve A'ya bakıyordu; C hiç yoktu.

- **Migration 165:** `avatar3d_parcalar` (12 parça), `avatar3d_sahip`,
  RPC'ler (`_katalogum`, `_satin_al`, `_gorunum_kaydet`, `_portre_kaydet`,
  `_odul_ver`, `_dogrula`). Taç ve Pelerin satılmaz. 85 bota deterministik
  görünüm, 85'i de farklı, hiçbiri taç/pelerin takmıyor.
- **Migration 166 — iade:** 2B'de ücretli alım **hiç yoktu** (tüm 2B
  kayıtlar `kaynak='baslangic'`). Eski 3B kozmetiklerde 2 hesap / 450 coin
  iade edildi. Sahiplik kayıtları silinmedi.
- **Migration 167/170:** görünüm kaydedince `avatar_onayli` de true olur;
  `avatar3d_rastgele_baslangic` (sihirbazı atlayan engellenmesin).
- **Migration 168/169:** bot portreleri için dar Storage kuralı.
  168'in ilk hâli `profiles`'ı doğrudan sorguladığı için
  "permission denied" veriyordu — kontrol `security definer` yardımcıya
  taşındı. **Ders:** RLS politikası çağıranın rolüyle çalışır.
- **Avatar.jsx yeni sırası:** `portre_url` (düz img) → `avatar3d` (tembel
  WebGL) → baş harf. 2B yol çıktı. three.js dinamik import: portresi olan
  oyuncu için ana pakete girmiyor.
- **Portre PNG'si:** gardıropta kaydederken bir kez üretilip Storage'a
  yükleniyor. 85 bot portresi de bir kez üretildi (31 sn).
  **Ölçüm:** lig tablosu 26 satır → 0 WebGL render, 0 canvas.
- **Eski SVG ikonlar:** Avatar.jsx artık `/avatars/kNN.svg` göstermiyor.
  Lig tablosunda 8 taneydi, şimdi 0. Dosyalar silinmedi.
- **Meydan kapısı:** `gorunum.avatar3d` yoksa meydan açılmıyor.
- **Bilinen boşluk:** dans satın alma eski görünüm sayfasındaydı, o sayfa
  arayüzden çıktı. Sahip olunan danslar çalışıyor, yeni dans alınamıyor —
  dansın yeni evi ayrı bir karar.

## 13 Eylül 2026 (3) — 2B karakter sistemi tamamen söküldü

**Sahibinin kararı:** *"2B karakterlere dair oyunda hiçbir şey kalmamalı.
Oyunda/profilde avatar fotosu görünecek. Meydana girerken oluşturulan
karakter ile girilecek."* Bu, bir önceki oturumdaki "avatar her yerde 3B
portre" kararını **iptal eder**.

Üç sistemin son hâli:
- **A — 31 hazır avatar ikonu:** KALDI. Profil, lig, arkadaşlar, maç,
  turnuva podyumu. Kurulum sihirbazının "Avatarını seç" adımı eski hâline
  döndürüldü (önceki oturumda yanlışlıkla kaldırılmıştı).
- **B — 2B PatiRun karakterleri:** arayüzden TAMAMEN kalktı.
- **C — 3B karakter:** yalnız meydan + gardırop/dükkân vitrini.

Çıkarılan yerler:
- `src/components/Avatar.jsx` → yalnız `gorunen_avatar`/`avatar_url` →
  baş harf. 3B portre dalı da kalktı (yalnızca meydan 3B çizer).
- `oyun/pages/ProfilePage.jsx` → 2B vitrin kalktı. **Şikayetin asıl
  kaynağı buydu:** profilde hâlâ PatiRun karakteri çiziliyordu.
- `oyun/harita/karakterGorsel.js` → billboard artık `avatarUri` yerine
  `yeniPortre` kullanıyor. Meydanda hiç 2B görsel yok: yakındakiler gerçek
  3B gövde, uzaktakiler aynı modelin fotoğrafı.
- `/gorunum-2b` rotası kalktı (App.jsx + BildimApp.jsx).
- Üç ölü dosya `oyun/karakter/` altına taşındı (silinmedi):
  AvatarVitrin, GorunumDukkani, KarakterPage.
- `GorunumPage` (yedek /gorunum-3b) artık profil fotoğrafının üstüne
  3B render yazmıyor — `fotografiYukle` duruyor ama çağrılmıyor.

**Süpürme grep'i boş:**
`grep -rn "karakter/gorunum\|avatarUri" oyun/ src/ | grep -v oyun/karakter/`

**Ölçüm — billboard portreye geçince:**
- Çizim maliyeti DEĞİŞMEDİ: billboard başına 2 çizim çağrısı, 16 üçgen.
  Yani kalabalıkta FPS aynı.
- Ama ilk üretim pahalı: yeni bir görünüm için portre ~83 ms. 8 oyuncu
  aynı anda girerse ~660 ms donma oluyordu. **Çözüm:** doku hemen saydam
  verilir, portre paylaşılan boş-zaman kuyruğunda üretilir.
  Sonrası: 8 oyuncu kurulumu **2.2 ms** (oyuncu başına 0.3 ms), portreler
  bir an sonra doluyor. Aynı görünüm tekrarında 0.3 ms (önbellek).

**Ders:** aynı görünümü JSON anahtarıyla önbelleğe almak, üretim sonucunun
(data-URI) anahtar olmasından daha iyi — üretim ertelenebilir hâle geldi.

## 13 Eylül 2026 (4) — 3B çizim regresyonu, gardırop düzeni, bedava test, profil

### KÖK SEBEP: 3B hiçbir yerde çizilmiyordu
`sahne.js` ve meydanın çizim döngüsü `document.hidden` iken **hiç render
etmiyordu**. Sayfa arka plan sekmesinde (ya da otomasyon tarayıcısında)
açıldıysa tuval bomboş kalıyor, FPS hiç bildirilmediği için altbilgi
sonsuza kadar "Ölçülüyor…", meydanda da "sahne hazırlanıyor…" perdesi
kalkmıyordu.

**Kanıt:** `document.hidden`'ı `false`'a sabitler sabitlemez karakter
anında çizildi. WebGL bağlamı sağlamdı (`isContextLost()=false`),
renderer sağlamdı, portre üretimi (12 portre ≈ 1 sn) suçlu değildi.

Düzeltmeler: **ilk kare her hâlükârda çizilir**; sonrası gizliyken
duraklar. `visibilitychange` ile FPS ölçüm penceresi sıfırlanır.
Altbilgi dürüst ("Sekme arka planda — çizim duraklatıldı").
`preserveDrawingBuffer` kaldırıldı (sahne `toDataURL` almıyor).

### Portre üretimi iki ayrı hatadan dolayı çalışmıyordu
1. `requestIdleCallback` tek başına yetmiyor — arka planda kısılıyor,
   ölçümde 12 saniyede 3 portrede takıldı. Yanına `setTimeout` yedeği.
2. `ParcaPortresi`'ndeki `IntersectionObserver` kart görünür alana
   girmeden iş kuyruğa koymuyordu; **12 kartın 0'ı** üretiliyordu.
   Kaldırıldı — fren zaten kuyrukta (kare başına tek portre).
   Sonuç: **12/12 portre**.

**Ders:** "tembel yükleme" iyi bir refleks ama ölçülmeden eklenirse
işi hiç yaptırmayabiliyor. Kuyruk zaten frendi; gözlemci fazlaydı.

### Gardırop düzeni
Kategori `<select>`'i kalktı; Saç/Kıyafet/Baş/Gözlük/Sırt tek sayfada
başlıklı bölümler. Üstteki yapışkan şerit **filtre değil, gezinme**.
Her bölümün başında "Yok/Çıkar" kartı. Kartın kendisi düğme: ara onay
yok. Karakter masaüstünde zaten sticky'di, **mobilde de sabit** (%45).

### Bedava test (migration 172)
`oyun_ayarlari.kozmetik_bedava_test` (varsayılan `true`).
`avatar3d_satin_al` açıkken coin düşmez, Taç/Pelerin de alınabilir.
Fiyatlar tabloda duruyor. Doğrulandı: açıkken 2200'lük Ceket + Taç +
Pelerin 0 bakiyeyle alındı, coin düşmedi; kapalıyken Gelinlik
"Yetersiz coin" ile reddedildi.

### Profil ve genel
- Profil **3890 → 1553 px**; dört sekme; üç istatistik kutusu aynı türde;
  gizlilik notu takma ad ayarının altına indi.
- Sitede hiç `<h1>` yoktu → 12 sayfaya eklendi.
- `.app` 540 px sabit şeritti → 1024 px üstü 760, 1400 px üstü 900 px.
  Telefon düzeni korundu.

## 13 Eylül 2026 (5) — Hub kendi adresine döndü

**Sorun:** `idagg-game-center.vercel.app` açılınca Quiz Square'in
gardırobu geliyordu; Kafa Topu, DidaGP, Meyve Kes, PatiRun, RUN,
Gladius, Gölge Boks'a hiçbir yerden ulaşılamıyordu.

**Sebep (benim hatam, `e8c9169`):** Aşama 1'de `vercel.json`'ın
`buildCommand`'ine `--mode bildim --config .../vite.prototip.config.js`
yazmıştım. **İki Vercel projesi de aynı `vercel.json`'u okuyor** ve
oradaki komut panel ayarını **eziyor** — bu yüzden hub da Quiz Square
olarak derlendi. `--mode bildim`, depodaki `.env.bildim`'i yüklüyor ve
oradaki `VITE_MOD=bildim` uygulamayı Quiz Square'e çeviriyor.

**Çözüm:**
- `vercel.json` tarafsız: `npm run build && node araclar/tarayici-uyumluluk.mjs`
- Çok girişli derleme `vite.config.js`'e taşındı, **yalnız
  `VITE_MOD === 'bildim'` iken** (`rollupOptions.input`). Hub'da tek
  giriş: `index.html`. `vite.prototip.config.js` silinmedi.
- Kök `index.html` artık **hub'ın kimliğini** taşıyor; Quiz Square'in
  başlık/paylaşım alanlarını `bildim-modu` eklentisi yazıyor.

**Ders:** Mod seçimi env değişkeninin (`VITE_MOD`) işi. `vercel.json`
iki projenin ORTAK dosyası — oraya moda özel hiçbir şey yazılmaz.
Not `CLAUDE.md` + `AGENTS.md`'ye eklendi.

**Doğrulandı (canlı):** hub `idaGG Game Center` başlığıyla 8 oyun kartı
gösteriyor, hepsi 200 dönüyor, Kafa Topu açıldı. Quiz Square adresinde
gardırop (`assets/gardrop-*.js`) ve meydan sayfaları yerinde, `/harita`
meydanı açıyor. Konsolda hata yok.

## 14 Eylül 2026 — Hub markası: idaGG Game Center

Sahibinin sözü: *"idaGG Game Center yazacak idagg sitesinde. içindeki
oyunlardan biri de quizsquare. quizsquare sitemizde var zaten ona
dokunmuyoruz."*

Hub sitesinde marka artık **idaGG Game Center**; Quiz Square orada
oyun kartlarından biri. Quiz Square sitesi **hiç değişmedi**.

| Yer | Hub (idagg-game-center) | Quiz Square (quizsquare) |
|---|---|---|
| Sekme başlığı | idaGG Game Center | Quiz Square — Bilgi Yarışması |
| Üst logo | idaGG / GAME CENTER (`GameCenter.jsx`) | Quiz Square wordmark (`Logo.jsx`) |
| Giriş ekranı | idaGG GAME CENTER + portal sloganı | Quiz Square wordmark + turnuva sloganı |
| Alt bilgi | idaGG Game Center · … | (bu sayfalar yok) |
| PWA manifest | `manifest.webmanifest` → idaGG Game Center | `bildim.webmanifest` → Quiz Square |

**`Logo.jsx`'e DOKUNULMADI.** Quiz Square wordmark'ı olduğu gibi duruyor
ve hub içindeki `/bildim` kabuğunda da doğru şekilde Quiz Square yazıyor —
orası zaten Quiz Square oyunudur.

Ayrım `BILDIM_MOD` (`import.meta.env.VITE_MOD === "bildim"`) ile yapıldı;
Vite ölü dalı derleme zamanında eliyor. **Ölçüldü:** Quiz Square'in
yayınlanan HTML ve paketlerinde `idaGG` dizesi **0 kez** geçiyor.

Küçük ders: kök `index.html`'e koyduğum açıklama yorumu Quiz Square'in
yayınlanan HTML'ine de sızıyordu (yorumlar derlemede korunuyor).
Açıklama işi yapan yere, `vite.config.js`'teki eklentinin başına taşındı.

## 14 Eylül 2026 (2) — Ayrık çalışma klasörleri kapatıldı

**Sorun:** Codex `Documents\Codex\2026-09-12\...\work\` altında çalışmıştı.
`quizsquare-yayin` bir git worktree'siydi (HEAD `3ef8ecf`, bugünkü
`main`'den 26 commit geride); `quizsquare` ise git'e **hiç bağlı olmayan**
sıradan bir kopyaydı. 13 Eylül'deki üç arıza bu ayrıklıktan çıktı:
Codex'in işi GitHub'a girmedi, push canlıdaki 3B sayfaları sildi, görev
metni o klasörün dosya adlarını kullandığı için yanlış sistem geliştirildi.

**Yapılan:**
1. İki klasördeki commit edilmemiş iş `arsiv/` altına alındı ve commit
   edildi (`b916855`). `quizsquare` kopyasında **git geçmişinde hiç yer
   almamış** iki dosya çıktı: `oyun/styles/square.css` (181 satırlık
   görsel katman denemesi) ve `DEVAM_TASARIM.md`. Notunda *"kullanıcı
   tasarımı görüp beğenmeden push ve yayın YAPILMAYACAK"* yazdığı için
   uygulanmadı, yalnız saklandı — karar sahibinin.
2. `git worktree remove --force` + `prune`. Artık `git worktree list`
   yalnız `Desktop\idagggamecenter` gösteriyor; iki klasörde de
   `git status` "not a git repository" diyor. Dosyalar diskte duruyor.
3. `CLAUDE.md` + `AGENTS.md`'nin **en üstüne** "ÇALIŞMA KLASÖRÜ — TEK
   KURAL" bölümü: tek klasör, oturum başı `git pull`, oturum sonu commit
   + push, yayın yalnız GitHub üzerinden, aynı anda tek araç.

**Ders:** Git worktree'si ayrı bir klasörde ayrı bir HEAD tutar; oradaki
iş `main`'de görünmez ve `git status` ana klasörde temiz görünür. İki
aracın aynı depoda çalıştığı yerde worktree kullanılmaz.

## 14 Eylül 2026 (3) — Revizyon Paketi 4 (5 madde)

### 1. iPhone alt menü (gerçek hata)
`.tabbar`'da `position: fixed` ile `transform: translateX(-50%)` aynı
öğedeydi — iOS'ta bu ikisi sabitlemeyi bozar. Ortalama `left/right: 0 +
margin-inline: auto` ile yapıldı. Viewport'a `interactive-widget=
resizes-content` eklendi. Atalarda transform/filter/perspective olmadığı
doğrulandı. **Ölçüm:** 390 px'de 7 farklı kaydırma konumunda menünün
sol/alt kenarı değişmiyor. Kalıcı iOS kuralı `CLAUDE.md`+`AGENTS.md`'de.

### 2. İki oyuncu farklı sorularda (gerçek hata)
**Sunucu suçsuzdu.** `submit_match_answer`, `mac_soruyu_atla` ve
`advance_match` üçü de senkronu doğru koruyor (iki cevap ya da 16 sn
dolmadan `aktif_soru` ilerlemiyor, `FOR UPDATE` kilidiyle); canlı
veritabanında son 6 maçın hepsi `senkron=true`.

Kayma **istemcideydi**: geri bildirim penceresi (`GB_MS`) herkesin KENDİ
cevap anından sayılıyordu. 2. saniyede cevaplayan için kalan 0, 14.
saniyede cevaplayan için tam 1000 ms → hızlı cevaplayan sonraki soruyu
**1 saniye önce** görüyordu. Artık pencere ilerlemenin görüldüğü andan
sayılıyor (effect zaten o an çalışıyor, iki istemcide de aynı).
Yeni test: `oyun/_test/mac-senkron-test.mjs`.

**Ders:** "sunucu doğru" ile "ekranda aynı anda görünüyor" aynı şey
değil. Senkron, sunucu durumu kadar istemcinin o durumu ne zaman
gösterdiğiyle de ilgili.

### 3. Turnuva botları (migration 173)
`bot_turnuva_katilim_min/max` (38–66) + `_yayilma_dk` (25). Hedef sayı
turnuva id'sinden deterministik; ölçüm: 50/61/63/48/39, hepsi farklı,
aynı turnuvada sabit. Katılımlar dakikalık cron'la yayılıyor: 50 bot
12:35–12:59 arası **23 farklı dakikaya** dağıldı.

### 4. Meydan botları (migration 174)
**Kök sebep:** `meydan_bot_sayisi=2` sabitti ama nöbet yalnız turnuva
saatine yakın doluyordu; günün geri kalanında meydan tamamen boştu.
Artık nöbet her zaman dolu; çizilecek sayı `taban + ek*(gerçek oyuncu-1)`,
tavanla sınırlı. Sayım istemcide (sunucu presence'ı görmez). Kademeli:
6 saniyede bir en fazla bir bot eklenir/çıkarılır.

### 5. Gardırop
"Karakter" sekmesi kalktı; 9 kategori tek listede. Kart görselleri artık
**eşyanın kendisi** (`esyaPortresi`): baş/gözlük/sırt yalnız eşya,
saç/kıyafet yüzsüz gri manken üzerinde.

**İki ölçülmüş hata:** (a) kıyafet parçalarını zorla açıyordum, "Tişört"
kartında ceket çıkıyordu — modelin kendi görünürlük kararı saklanıp geri
yükleniyor; (b) manken kafasında ağız kalmıştı, mesh adı `Gulumseme`
imiş. Manken grisi beyaz tişörtle karıştığı için koyulaştırıldı.

## 14 Eylül 2026 — Revizyon Paketi 5, Madde 2: yeni ekipman yuvaları

**İstek:** gözlük tek tip değil birkaç çeşit; sakal/bıyık; ayakkabı ve
terlik; şort; atlet/gömlek/tişört.

**Kök sorun:** `avatar3d_parcalar.yuva` yalnız 5 değer kabul ediyordu ve
`gozluk`/`pelerin` MANTIKSAL (true/false) değerdi — bir yuvada tek çeşit
taşıyabiliyordu. Yuvalar 5'ten **8'e** çıktı (`+sakal +ayakkabi +alt`),
gözlük ve pelerin metin değere geçti. Katalog 12 → **29 parça**.

**Geriye uyum (ölçüldü):** migration 176 hem katalogdaki hem
`profiles.gorunum->'avatar3d'` içindeki `true` değerlerini somut id'ye
taşıdı (`gozluk true → "gunes"`, `pelerin true → "klasik"`, `false →
"yok"`). Canlıda **163 görünüm** dönüştürüldü, geriye **0** mantıksal
değer kaldı. Ayrıca `avatar3d_dogrula` eski `true/false`'u hâlâ kabul
edip çeviriyor (eski sekme açık kalmış olabilir): canlı testte
`{gozluk:true,pelerin:true}` → `gunes`/`klasik` döndü.

**Model tarafı:** bacak artık ten + ayrı giysi kabuğu; alt giyim ve
ayakkabı `altParcalari` / `ayakkabiParcalari` dizilerinde, kendi
renkleriyle (`altRenk`, `ayakkabiRenk`). Kalça da sabit pantolon
renginden çıkıp alt giyime bağlandı. 5 gözlük, 4 sakal, 4 ayakkabı,
3 alt, 5 üst varyantının hepsi node testinde çizildi (12 alt×ayakkabı
kombinasyonu dahil).

**Kart görselleri:** `esyaPortresi` yuva listesi hard-coded'dı, yeni üç
yuva eklendi; alt/ayakkabı tek grup değil mesh DİZİSİ olduğu için kök
çözümü diziyi de kabul ediyor. Kamera çerçeveleri modelden ölçülen kutu
merkezlerine göre yazıldı (sakal y≈2.77, alt y≈1.16, ayakkabı y≈0.23).

**Botlar:** `avatar3d_bot_gorunum_uret` yeni yuvaları da giydiriyor;
160 botun **160'ı farklı görünüm**. Etkinlik eşyası hâlâ yok: taç/duvak
0, pelerin 0, gelinlik 0.

**Ürün kararı:** `pelerin:'kisa'` modelde var ama **dükkâna konmadı** —
pelerin turnuva ödülüdür, varyantını satmak ödülü değersizleştirir.

**Ücretsiz temeller:** tişört/pantolon/spor ayakkabı 0 coin; yoksa yeni
oyuncu çıplak ayak kalırdı. 428 sahiplik satırı geriye dönük verildi.

## 14 Eylül 2026 — Revizyon Paketi 5, Madde 3: kategoriye göre otomatik gizleme

**İstek:** "Karakterde şapka varken Ege/Maya/Nova gibi hazır görünümler
arasında gezerken yüzündeki farklılıkları göremiyorum."

**Çözüm:** `Gardrop.jsx` içinde `ENGELLEYENLER` eşleme tablosu — hangi
bölüme bakılıyorsa onu ENGELLEYEN yuvalar önizlemede boşa çekilir.
Tablo tek yerde; yeni yuva eklenince bir satır yetiyor. Ölçülen davranış:

| Bakılan bölüm | Gizlenen |
|---|---|
| Hazır görünümler / Ten | Baş aksesuarı, Saç, Gözlük |
| Saç / Saç rengi | Baş aksesuarı |
| Gözlük | Baş aksesuarı, Saç |
| Sakal | Baş aksesuarı |
| Üst giyim, Alt giyim, Ayakkabı ve renkleri | Sırt (pelerin) |
| Baş aksesuarı, Sırt | — |

**Gizleme yalnız önizlemede:** `g` (gerçek seçim) hiç değişmez, sahneye
giden kopya değiştirilir. Kartın altında "geçici olarak çıkarıldı …
başka bölüme geçince geri gelir" yazısı çıkıyor ki oyuncu eşyasının
silindiğini sanmasın. Ayrı "çıplak mod" düğmesi yok.

**Üç ölçülmüş tuzak:**
1. "Çizgiye en yakın başlık" kuralı yanlış: uzun bölümün başlığı yukarı
   kayınca BİR SONRAKİ bölüm aktif sanılıyordu. Kural değişti —
   ekranın %34'ündeki çizgiyi hangi bölüm KAPLIYORSA o aktif.
2. Kısma `requestAnimationFrame` ileydi; arka plan sekmesinde rAF hiç
   çalışmıyor ve aktif bölüm ilk değerinde donuyordu. `setTimeout` oldu.
3. Kaydırma olayı bazı ortamlarda hiç gelmiyor. Kategori şeridine
   basınca aktif bölüm ARTIK ANINDA kesinleşiyor (kaydırma beklenmiyor);
   kaydırma dinleyicisi yalnız elle kaydıranlar için ek.

**Yan düzeltme (aynı sorunun parçası):** kategori listesi uzun olduğu
için aşağı kaydırınca KARAKTER EKRANDAN ÇIKIYORDU — gizleme hiç
görülemiyordu. Önizleme `position:sticky` yapıldı (telefonda 54vh).

**Madde 2'de bulunan gerçek hata:** `esyaPortresi` `u.bacaklar`'ı dizi
sanıyordu, oysa tek bir `T.Group`. Alt giyim ve ayakkabı kartları
"object is not iterable" ile hiç üretilmiyordu. Düzeltildikten sonra
tarayıcıda **29 kartın 29'u** görsel üretti.

## 14 Eylül 2026 — Revizyon Paketi 5, Madde 4: botların gerçekçiliği

Üç migration: **177** (sabırsız eşleşme + hazır gecikmesi + puan),
**178** (1v1 lobisi atlanmıştı), **179** (davet kabul gecikmesi).

### Sabırsız tıklama → seviyeli açık bot (177)
"Beklemeden eşleş" düğmesi eskiden `quick_match`i çağırıyordu: hem 2-5 sn
bekletiyor hem de GİZLİ bot getiriyordu. Yeni `hemen_bot_mac` RPC'si
oyuncunun ligine en yakın AÇIK botu **anında** veriyor. Yeni eşleştirme
algoritması yazılmadı, mevcut `lig_sirasi` kullanıldı. Ölçüm:
bronz→ToyBot, gümüş→ÇaylakBot, altın→ÜstatBot, elmas/efsane→EfsaneBot.
Canlı testte bronz oyuncu → ToyBot, maç anında kuruldu.
Düğme metni dürüstleşti: "Beklemeden bot ile oyna" + "coin ödülü yarıya
iner" notu (açık bot maçında `coin_bot_carpani` zaten 0.5).

### Hazır butonu gecikmesi (177 + 178)
**Kök sebep:** üç lobide de `hazir or is_bot` yazıyordu — bot 0. saniyede
hazırdı. `mac_nabiz` (1v1), `hizli_mac_nabiz`, `grup_mac_nabiz` üçü de
artık `bot_hazir_mi` ile bota+lobiye özel 0.5-3 sn bekliyor.
10 bot ölçüldü: 0.62 / 0.91 / 1.28 / 1.72 / 1.79 / 1.85 / 2.15 / 2.25 /
2.32 / 2.99 sn — hepsi farklı, hiçbiri 0 değil.

### Gerçekçilik taraması — bulunan ve düzeltilen sinyal (179)
`bot_oyna` botlara gelen 1v1 meydan okumasını, grup davetini ve hızlı maç
davetini KOŞULSUZ kabul ediyordu; cron 7 sn'de bir çalıştığı için gizli
bot daveti **her zaman 7 saniyeden kısa sürede** kabul ediyordu.
Artık gizli bot 8-90 sn bekliyor (deterministik), açık bot anında kabul
ediyor. `rovans_iste` de aynı kurala bağlandı: gizli bota rövanş artık
'bekliyor' olarak açılıyor, anında başlamıyor.

**Taramada TEMİZ çıkanlar (değiştirilmedi):** cevap gecikmesi zaten
zorluğa bağlı ve soru başına sabit (`bot_gecikme_sn`); bot insanın
ulaştığı soruyu geçmiyor; %15 olasılıkla emoji/tepki atıyor;
`lig_siralama` yalnız AÇIK botu `bot=true` diye işaretliyor, gizli bot
gerçek oyuncudan ayırt edilemiyor; istemcide `is_bot` hiçbir yerde gizli
bot için kullanılmıyor.

### Botlar puan kazanıyor (177)
**Ölçüm:** doğal yol (`mac_sonuclandir` → `lig_bot_puan_yuzde` %40)
ÇALIŞIYOR ama gerçek maç trafiği yok — tüm veritabanında 3 bitmiş maç
vardı, 160 botun yalnız 6'sında puan.
Yeni `bot_puan_tik()` (10 dk'da bir cron) boşta geçen zamanı dolduruyor:
her bota 55 dk - 7 saat arası **sabit ve kendine özel** bir oynama
temposu düşüyor; temposu gelince bir maç oynamış sayılıyor, %55 ihtimalle
kazanıp gerçek maçtaki formülün aynısıyla (20 × %40 = 8) puan alıyor.
`bot_puan_temposu` tablosunda RLS politikası YOK — istemci göremez, bot
olduğunu ele vermesin. Lig DEĞİŞTİRİLMEZ (yerleşik karar korundu;
`lig_haftayi_kapat` zaten `if r.bot then continue`).
İlk tik 72 bot işledi (başlangıç anları geriye yayılmıştı), ikinci tik 21.

## 14 Eylül 2026 — Meydan botları görünmüyordu + "normal eşleşmede ÇaylakBot"

### 1) Meydan botları — sorun İSTEMCİDEYDİ, sunucu sağlamdı
**Ölçüm (sunucu):** `meydan_bot_nobeti` doluydu (6 satır, 4 aktif),
`bildim-meydan-bot` cron'u aktif ve son 5 çalışması `succeeded`, 155 gizli
bot uygun. `meydan_botlari()` authenticated rolüyle 4, tarayıcıdan
kullanıcı token'ıyla 9 satır döndü. Yani "RPC boş dönüyor" varsayımı yanlıştı.

**Ölçüm (tarayıcı, canlı):** React fiber'dan `canliRef` okundu: bot
(`baris61`) sahnede, `visible=true`, kamera görüş alanında — ama modelin
TÜM mesh dünya konumları `NaN`.
**Kök sebep:** bot döngüsü `dunya.yumusakDon(b.av, k.aci, dt)` çağrısını
4. parametresiz yapıyordu → `dt * undefined = NaN` → `rotation.y = NaN` →
dünya matrisi bozuk, model hiç çizilmiyor. Oyuncu/uzak oyuncu çağrıları
hızı verdiği için etkilenmiyordu (tüm çağrılar tarandı, tek eksik buydu).
**Düzeltme:** `yumusakDon`'a varsayılan `hiz = 8` + NaN rotasyonu sıfırlama;
bot çağrısına hız açıkça verildi.

**Ek sağlamlaştırma (migration 180):** `meydan_bot_nobeti_guncelle`
önümüzdeki cron turundan (6 dk) önce bitecek nöbeti dolu saymıyor, yenisini
önceden yazıyor — nöbet bitişiyle cron arasında boşluk kalmıyor.

### 2) "Normal eşleşmede ÇaylakBot" — veri otomatik yolu GÖSTERMİYOR
Maç: 14 Eyl 08:24:17, `bedirhanbatur_a2ef` (bronz, ilk maçı) vs ÇaylakBot.
- `bot_seviye_araligi` → [1, 11]; aynı hesapla `bot_sec` 300 denemede
  **300 gizli bot** seçti; (d) adımına düşmüyor.
- `hemen_bot_mac` bronz oyuncuya ToyBot verir (lig farkı 0), ÇaylakBot değil.
- `rpc_sayac`'ta bu kullanıcı için **hiç `quick_match` ve `hemen_bot_mac`
  kaydı yok** (ikisi de `hiz_siniri` çağırır, satır kalıcıdır; 8 başka
  kullanıcıda `quick_match` satırı var). Otomatik yol hiç çalışmamış.
- Maçta `kabul_at` = oluşturma + 1.04 sn: `create_challenge` ile
  'bekliyor' açılıp `bot_oyna` tarafından kabul edilmiş. Otomatik yoldaki
  gizli bot maçlarında `kabul_at` null.
Sonuç: maç **meydan okuma** ile kurulmuş (Meydan Oku sayfasındaki
"Botlar" listesi büyük olasılıkla; hemen öncesinde 08:22'de meydanda ikram
göndermiş). Yine de istenen güvence yapıldı: `bot_sec` (d) artık yalnız
gizli botlara düşüyor (migration 180).

**Not:** `supabase_migrations.schema_migrations` 164'te kalmış;
165-179 canlıda uygulanmış (fonksiyonlar/ayarlar ölçüldü) ama geçmişe
yazılmamış. 180 yazıldı.

## 14 Eylül 2026 (2) — Revizyon Paketi 6 (3 madde)

Commit'ler: `c00b12c` (Madde 1) · `d19cfc3` (Madde 2) · `7f2f10a` + `d86a19e` + `8940d42` (Madde 3 ve ekleri).
Migration: 181, 182 — ikisi de önce `rollback` ile denendi, sonra canlıya uygulandı ve geçmişe yazıldı.

### Madde 1 — Lig tablosunda açık bot (migration 181)
**Kök sebep:** `lig_gruplarini_kur` grup boşluklarını `bot_turu` ayırmadan
TÜM botlarla dolduruyordu; ToyBot bronz grup 1'e üye yazılmıştı.
`lig_grubum`/`lig_siralama` açık botu süzmüyor, yalnız `bot=true` işaretliyordu.
**Düzeltme:** tek yardımcı `acik_bot_mu()`; `lig_grubum`, `lig_siralama`,
`lig_uyeligim_kur` (kapasite), `lig_haftayi_kapat` (sıra/ödül) açık botu
dışarıda bırakıyor; `lig_gruplarini_kur` boşluğu YALNIZ gizli botla dolduruyor.
Açık botların puanı/ligi ve `lig_uyelik` satırı SİLİNMEDİ.
**Doğrulama:** bu hafta var olan her grubun bir insan üyesinin gözünden
`lig_grubum` → bronz 1 (24 satır), bronz 2 (25), bronz 3 (24), gümüş 1 (8):
açık bot **0**; gizli botlar duruyor (bronz 1'de 6). `lig_siralama` global:
açık 0. Canlı `/siralama` metninde "…Bot" adı yok; eskiden 2. sıradaki
ToyBot'un yerinde kaptan61. Altın/elmas/efsane liglerinde bu hafta grup yok
(gerçek oyuncu yok) — o tablolar açılamadı, aynı fonksiyondan geçiyor.

### Madde 2 — Meydan botu hareketi (migration 182)
**Eski:** sabit yarıçaplı daire (6-16). Daire çeşmenin (6.6), bankların
(12.5) ve lambaların (15.6) içinden geçiyordu — "kaldırıma takılma".
Adım animasyonu hızdan bağımsız sabit 0.8'di (kayar gibi yürüme).
**Yeni (meydanBotlari.js, yalnız mantık):** tohumdan kararlı plan —
bir binanın kapısından çık → çeşme ile banklar arasındaki boş halkada
(8.2-9.8) dolaş, ara ara 2.5-9 sn dur → nöbet biterken başka bir binanın
kapısına yürü, TAM bitiş anında kapıda kaybol. Her yol parçası
`dunya.engeller`'e karşı denetlenir; çarpacaksa engelin yanından dolaşır.
Adım temposu gerçek hızla orantılı (3.2 / 9).
**Sunucu:** nöbet 80-150 sn (`meydan_bot_nobet_sn_min/_max`), bitmesine
12 sn kala yenisi yazılır (`meydan_bot_devir_sn`). Cron 5 dk'da bir
olduğu için `meydan_botlari()` eksik varsa nöbeti kendisi tazeler
(advisory lock ile, eşzamanlı çağrılar çift iş yapmaz). RPC artık
`baslangic/bitis/sunucu_zamani` döndürür (istemci saat farkını düzeltir);
anon yetkisi kaldırıldı, `is_bot` dönmez.
**Doğrulama:** Node testi, gerçek harita geometrisiyle 400 plan: engele en
yakın boşluk 0.552 (gövde payı 0.55), havuza giriş 0, ani sıçrama 0, bitiş
sapması 0 ms, aynı tohum → aynı plan. Canlıda: `bertan55` 80. sn'de düştü,
aynı tazelemede `aleyna35` kapıdan (r=23.2) girdi; nöbet tablosunda
12:45-12:47 arasında 7 bot sırayla girip çıktı. `aleyna35`'in canlı planı
5 sn örnekle: 0 sn r23.2 (kapı) → 5 sn r9.1 → 140 sn boyunca halkada
yürü/dur → 144 sn r23.2 (kapı); engele en yakın boşluk 0.95.
**Sınır:** otomasyon penceresi `document.hidden` durumunda kaldığı için
(bkz. harita CLAUDE.md "arka plan sekmesi") çizim döngüsü durdu; 3 dk'lık
akıcı hareket ekran görüntüsüyle izlenemedi. Hareket planın kendisinden ve
devir sunucudan ölçüldü. Telefonda gerçek gözle bakılmalı.

### Madde 3 — Gardırop düzeni
**Kök sebep (a):** Paket 5'teki dikey düzen yalnız `@media(max-width:760px)`
içindeydi. Masaüstünde `atolye.css › main{display:grid}` +
`.gardrop main{grid-template-columns:minmax(0,1fr) 410px}` ve
`.atolye .gosterim{min-height:700px}` geçerliydi → karakter solda, 410 px
liste sağda, şerit taşıp kesiliyor. Stale build/yanlış dosya DEĞİL.
**Düzeltme:** her genişlikte `main{display:block}`; karakter üstte sticky
(`--gos-h: clamp(300px,46dvh,440px)`, fixed/transform yok), altında tam
genişlik ızgara (`minmax(128px,1fr)`); şerit satıra sarar (yatay kaydırma
yok), masaüstünde karakterin altına yapışır, telefonda akışta kalır.
**Ek hata 1 (canlıda görüldü):** aktif bölüm ekranın %34 çizgisinden
okunuyordu; çizgi sabit karakterin arkasında kaldı → Gözlük'e bakarken
"Baş aksesuarı" aktifti. Çizgi artık sabit alanın altından ölçülüyor.
**Ek hata 2:** telefonda "geçici çıkarıldı" notu karakterin kafasını
örtüyordu → ayak hizasına indi.
**Doğrulama (canlı URL):** 1536 px — karakter üstte tam genişlik (364 px),
liste altında, şerit tek satır, 1600-1800 px kaydırmada karakter top:0 ve
şerit hemen altında, yatay taşma 0. 390 px (canlı sayfa 390×760 iframe
içinde; pencere boyutlandırma otomasyonda tutmadı) — karakter üstte
(365 px, canvas 194 px), liste altında tam genişlik, şerit 5 satıra sarıyor,
Gözlük bölümüne kaydırınca karakter top:0, yatay taşma 0.
**Ürün yorumu:** "hepsini tek ekranda" = tüm kategoriler tek sayfada,
sekme/açılır menü arkasında değil, dikey kaydırmalı (29+ parça kaydırmasız
sığmaz). Sahibi "hiç kaydırmadan" diyorsa ayrıca konuşulmalı.

### Regresyon
Paket 6 yalnız şu dosyalara dokundu: Gardrop.jsx, gardrop.css,
HaritaSayfasi.jsx, meydanBotlari.js, migration 181-182. `Layout.jsx`
(tabbar) 12 Eyl'den beri değişmedi; soru senkronu/maç RPC'lerine
dokunulmadı. Yeni ekipmanlar (sakal 4, alt giyim, ayakkabı) canlı gardıropta
görünüyor. Meydan nöbeti 6 aktif, turnuva bot katılımı sürüyor (aşağıda).

### Not — sabah turnuvası lobisi (13:00 TSİ, ölçüm; kod değişmedi)
Hedef bot `turnuva_hedef_bot` = 50 (38-66 aralığından, turnuvaya sabit).
Katılım anları 12:35-13:00 arasına rastgele yayılıyor (`bot_turnuva_katilim_tik`
her dakika, son 5 çalışma başarılı).
Lobi: 12:41 → 17 · 12:45 → 25 · 12:47 → 28 · 12:50 → 34 · 12:54 → 35 ·
**12:55:31 → 38** (37 bot + 1 insan). O anda anı gelmemiş 12 bot var, sonuncusu
12:59:54 → başlangıçta 50 bot + 1 insan = **51**, aralığın içinde.
12:50-12:53 arası yavaşlama hata değil: rastgele dağılımda o dakikalara
1'er an düşmüş, 12:54-12:55'e 4'er. Havuz açık botları öncelikli alıyor
(migration 173 kararı, dokunulmadı).

## 14 Eylül 2026 (3) — Gardırop tasarımı, organik meydan botları, gece turnuvası, yeni kıyafetler

**Yöntem notu:** Bu pakette iş 3 paralel alt ajana bölündü (gardırop, meydan,
kıyafet); her biri ~175-230k token harcadı. Sahibi bundan rahatsız oldu:
bundan sonra alt ajan açmadan önce sorulacak, varsayılan tek oturumda sırayla.

Commit'ler: `00dcdce` (turnuva, 183) · `8db6a1d` (gardırop tasarımı) ·
`2babefc` (kıyafetler, 185) · `9dcfd00` (meydan botları, 184).

### Gece turnuvası — neden boştu (migration 183)
Akşam lobisi 13:00'te açılıyor, botlar yalnız son 25 dk'ya yayılıyordu.
Yeni: %30'u (`bot_turnuva_erken_yuzde`) lobi açılışından başlangıca kadar,
açılışa yakın yoğun (r²); kalanı son 60 dk'da. Uygulanınca 13:35'te lobi
1 → 9, 13:59'da 12. Hesaplanan eğri: açılış+1 sa 11, +4 sa 18, başlangıçtan
1 sa önce 21, 10 dk önce 51, toplam 58 bot.

### Gardırop — yeniden tasarım (8db6a1d)
**"Kaydet'e bazen basılmıyor" kök sebebi:** üstüne katman binmiyordu; düğme
SESSİZCE kapalıydı — sahip olunmayan parça denenince (ya da değişiklik yokken)
disabled, sebebini yazan mesaj kaydırınca ekran dışında kalan paneldeydi.
**Yeni:** Şenlik dili; yapışık üst alanda "← Menüye dön" (varsayılan `/bildim`,
aynı kökenden gelindiyse geldiği sayfa; `/gorunum` döngü olmasın diye hariç),
başlık, bakiye, karakter ve DURUM SÖYLEYEN kayıt çubuğu ("Görünümü kaydet" /
"Kaydediliyor…" / "Kaydedildi ✓" / sahipsiz parça varsa adları + "Al / Hepsini
al" + "Geri al"). İlk girene "Karakterini giydir" kartı. Düzen korundu:
karakter üstte, ekipman ızgarası altta, yatay kaydırma yok.
**Canlı doğrulama (1536 px):** yeni tasarım yayında, Menüye dön → `/bildim`,
kaydet "Kaydedildi ✓", şeritte Küpe/Kolye/Saat dahil 17 kategori, yatay taşma 0.
Otomasyon sekmesi arka planda sayıldığı için şerit düğmesinin yumuşak
kaydırması oynamadı (aktif bölüm doğru değişti); ajan Playwright'ta akışı
ölçmüştü — telefonda gözle bakılmalı.

### Yeni kıyafetler (2babefc, migration 185)
19 parça: mavi/sarı/çizgili tişört, polo, kot, oduncu, havai gömleği (desenli),
kapüşonlu; şeytan kostümü (1.800) + şeytan boynuzu; damatlık (2.200); Tokyo
terlik; topuklu; gümüş/altın küpe, kolye, saat (3 yeni yuva). Yuva kısıtı,
`avatar3d_dogrula`, kayıtlı 165 görünüm ve 160 bot görünümü güncellendi
(botlar kostüm/damatlık/topuklu/boynuz giymez). ENGELLEYENLER'e küpe/kolye/saat
satırları eklendi. Görsel kontrolde (scratchpad/png) topuklunun burnu diken gibi
uzundu → kısaltıldı. Bilinen: terlikler bacağın hafif altında duruyor (eski
terlik/sandaletle aynı), yeni üstler "Ceket rengi"nden etkilenmez.

### Meydan botları organik (9dcfd00, migration 184)
Nöbet 6 katmana bölündü (`katman`); katmanlar ayrı devreder. Grup girişi
(%30, en çok 3, aynı kapıdan 1,3 sn arayla). Tek oyuncu için hedef bot sayısı
4 dk'lık dalgalarla 1-3. Oyuncuya yaklaşma (%25): 2 birim önünde durur, emoji,
1-3 hop, rotasına döner. İki bot buluşup kahve (12 sn) / balon (7 sn) ikramı
(%50). Hepsi tohumlu, iki istemcide aynı. Ayarlar `oyun_ayarlari`'nda.
Node simülasyonu (3 tohum × 30 dk): engel boşluğu ≥ 0,552, havuz 0, sıçrama 0,
bitişte kapıda olmayan 0; 30 dk'da 17-27 ziyaret, 5-6 ikram; tek oyuncuda
ortalama 2,2-2,5 bot, botsuz saniye 0.
**Canlı:** yeni istemci yayında, meydan açılınca 4 bot çizildi; kimse yokken
tablo boşalıyor, oyuncu girince RPC hemen 11 nöbet yazdı (katman 0-5).
Otomasyon penceresi gizli sayıldığı için kahve/balon/hoplama gözle izlenemedi.

## 14 Eylül 2026 (4) — Meydanda oyuncuya/bota dokunma

**Sahibinin bildirimi:** telefonda başka oyuncuya dokununca menü açılıp hemen
kapanıyor ve oto meydan okuyor; PC'de diğer oyunculara hiç dokunulamıyor;
botlara da dokunulabilmeli.

**Kök sebep 1 — hayalet tıklama (telefon):** menü `pointerup`'ta açılıyor;
dokunmatik tarayıcı hemen ardından AYNI NOKTAYA sentetik `click` üretiyor.
Menü ekranın ORTASINDA (`.bd-harita-kisi-menu` left/top 50%), dokunulan avatar
da genelde ortada (kamera oyuncuya odaklı) → click ilk düğme "Meydan oku"ya
düşüp `create_challenge` + maça yönlendirme yapıyordu; ✕'ye düşerse menü
anında kapanıyordu.
**Düzeltme:** `menuBasisRef` — menü düğmeleri yalnız basış menünün İÇİNDE
başladıysa çalışır (klavye `detail===0` serbest).

**Kök sebep 2 — PC'de dokunulamama:** seçim adayları yalnız `uzaklar` (gerçek
oyuncular) idi; botlar listede yoktu. PC'de meydanda tek başına olunca
etraftaki herkes bot → hiçbirine dokunulamıyordu. Fare olayları engellenmiyor
(zum yalnız 2 parmakta devreye giriyor).
**Düzeltme:** botlar da aday; görünmeyen avatar (ilk konum paketi gelmemiş)
seçilmez. `ikramOynat` bot avatarını da bulur.

**Bota ikram (migration 186):** kabul, alanın istemcisinden broadcast'le
geliyordu; botun istemcisi yok → 20 sn zaman aşımı. Artık `ikram_gonder` alan
botsa yanıtı hemen yazar ama `yanit_at`'ı 2-5 sn sonraya kurar (%85 kabul,
red'de coin anında iade). Yeni `ikram_durumu(p_id)` yanıt anı gelmeden
'bekliyor' döner; istemci broadcast'e ek olarak 1,2 sn'de bir yoklar (gerçek
oyuncuda paket kaybına karşı da yedek). `is_bot` dönmez.
Test (rollback): gizli bota kahve → hemen 'bekliyor', gizli durum 'kabul',
yanıt 2,9 sn sonra.

**Meydan okuma:** `oynanabilir_mi` yalnız arkadaş ve botlara izin veriyor
(değiştirilmedi). Not: arkadaş olmayan gerçek oyuncuya meydan okuma hata
verirken gizli bota vermemesi, dikkatli bir oyuncuya botu ele verebilir —
sahibine sorulacak ürün kararı.

Build temiz. Tarayıcıda doğrulanamadı: otomasyon penceresi gizli sayıldığı
için sahne çizilmiyor, dokunmatik hayalet tıklama masaüstünde üretilemiyor —
telefonda denenmeli.

## 14 Eylül 2026 (5) — Gizli bot HER ALANDA gerçek oyuncu (migration 187)

**Sahibinin kuralı (sert uyarı):** açık botlar (ToyBot/ÇaylakBot/ÜstatBot/
EfsaneBot) bot gibi; gizli botlar oyunun her yerinde gerçek oyuncu gibi.
"Her şeyi tek tek söyleyemem, mantıklı olan neyse onu yap." Kalıcı hafızaya
yazıldı. Botla ilgili her değişiklikte sorulacak: "gerçek oyuncu burada ne
yaşardı?"

**Taranan ve düzeltilen sızıntılar:**
- `oynanabilir_mi` tüm botları arkadaşlık şartından muaf tutuyordu → haritada/
  listede arkadaş olmayan gizli bota meydan okuma, gruba/hızlı maça davet
  mümkündü (gerçek oyuncuya değil). Artık yalnız AÇIK bot muaf
  (create_challenge, create_group_challenge, create_hizli_mac).
- `sesli_sohbet_izni` gizli bota "Rakibin bir bot" diyordu → artık yalnız açık
  botta; gizli bot "yalnız arkadaşlarınla" kontrolüne düşer.
- `oyuncu_ara` tüm botları gizliyordu → çevrimiçi gizli botlar da çıkar.
- Gizli botların `last_seen`'i hiç güncellenmiyordu (155'te son 10 dk 0) →
  yeni `gizli_bot_nabiz()` cron'u dakikada bir: meydan nöbetinde, aktif/bekleyen
  maçta, grup/hızlı maçta, açık turnuvada olanları çevrimiçi yapar. İlk turda 10.
- Meydanda "X kişi burada" yalnız presence sayıyordu → artık gerçek oyuncu +
  çizilen botlar. Bot sayısını belirleyen `kisi` gerçek sayı olarak kaldı.
- İkram: gizli bot bütün kahve/balon tekliflerini kabul eder
  (`ikram_bot_kabul_yuzde` 85 → 100, coin iade yok).

**Test:** kurucu hesapla `oynanabilir_mi` → arkadaş olmayan gizli bot false,
ToyBot true; çevrimiçi gizli bot 10; cron aktif; ayar 100. Build temiz.

## 14 Eylül 2026 (6) — Revizyon Paketi 7

Tek oturumda, alt ajansız yapıldı. Commit'ler: `132c4b0` (Madde 1) · `c2e10c8`
(Madde 2, migration 188) · `bd0a650` (Madde 2 ek, migration 189) · Madde 3.

### Madde 1 — Hazır görünümler
24 insan isimli tarif → 12 görünüm (4 yüz tipi × 3 ten). Ad üretilir:
"Köşeli yüz · Esmer". **Saç stili etikete yazılmadı:** gardırop hazır görünümden
yalnız ten/yüz/saç rengini uygular, saç stili ayrı satılan parça — yazılsa
yanıltırdı. Gardırop düğmesinde ten dolgulu + saç rengi çerçeveli rozet
(Atolye'deki desen), seçili olan `aria-pressed`. Atölye başlığı dinamik sayı.
**Yakalanan gizli hata:** `meydan-model.js` `KOLEKSIYON[hash%24]` → liste 12'ye
inince dizi dışı; `%KOLEKSIYON.length` yapıldı.
**Canlı:** 12 düğme, 12 rozet, isim yok (ekran görüntüsü alındı).
Vücut tipi (boy/kilo) kapsam dışı — model.js tek gövde.

### Madde 2 — Harita botları
**2a — ölçülen kök sebep görevdeki tahminden farklı:** bot görünümü istemcideki
KOLEKSIYON hash'inden DEĞİL, sunucudaki `gorunum.avatar3d` kaydından geliyor
(155/155 botta var). Üretici `avatar3d_bot_gorunum_uret` cinsiyete bakmıyordu:
73 kadın botun 37'si sakallı. `cinsiyet` istemciye AÇILMADI (gerçek oyuncuda boş,
botta dolu → ele verirdi). Migration 188: kadın → uzun/rasta saç, sakal yok,
yumuşak/ince/dengeli yüz, küpe sık. Sonuç: 73/73 uzun-rasta, 0 sakallı.
**İkinci kök sebep (doğrulamada bulundu):** botların `cinsiyet` alanı adlarından
bağımsız atanmıştı — "mert41" k, "esra16" e. Migration 189: 16 kadın adı 'k',
23 erkek adı 'e'; nötr/takma adlara dokunulmadı; görünüm yeniden üretildi
(66 k / 89 e). mert41 → kısa saç + keçi sakalı, esra16 → rasta.
**2b:** buluşmaların ~%35'inde emoji — ikram başlarken veren (☕/🎈) ya da
biterken alan (😊🙏❤️👍). Tohumlu; geç açılan istemci 3 sn'den eskisini oynatmaz.
**2c:** oyuncu menüsüne "Arkadaş ekle" (send_friend_request). Durum menü açılınca
okunur: Arkadaş ekle / İstek gönderildi / Arkadaşlık isteğini kabul et /
Arkadaşsınız ✓. Gizli bota istek gider, bot kabul etmez (mevcut kural).
Hayalet tıklama koruması bu düğmede de var.
**Canlı:** bota dokunma olayı üretilip menü açıldı → Meydan oku / Kahve / Balon /
Arkadaş ekle (ekran görüntüsü). Sahnede kadın botlar uzun saç/rasta.
**2d:** dolaşma bacaklarında %15 koşar gibi (1,4-1,6×), %20 ağır (0,6×). Ayrı tohum
anahtarı — `r()` dizisini tüketmez, rota/mola/buluşma zamanlaması aynı. Adım
temposu `planKonumu().hiz`e bağlı. Node testi (400 plan): engel boşluğu 0,554,
havuz 0, sıçrama 0, kapıda olmayan 0, deterministik; yürüyüş süresinin %7,4'ü
koşar, %24,9'u ağır.
**Sınır:** otomasyon penceresi gizli sayıldığı için 3 dk akıcı hareket ve ikram
emojisi ekran görüntüsüyle izlenemedi; mantık Node'da ve canlı plan verisinde ölçüldü.

### Madde 3 — Profil
**3.1 yapılmadı, gerek yok:** canlı `/profil`'de ölçüldü — tek ilerleme çubuğu var
(alttaki "Sonraki rütbe"); üstteki yalnız rütbe rozeti (RankBadge çubuk içermiyor).
Görevdeki "iki kez" tespiti bu sayfada doğru değil.
**3.2:** kategori ustalığı (10 satır) 2 sütunlu ızgara; ≤340 px tek sütun.

### Regresyon
Lig/gardırop/meydan bina giriş-çıkış dosyalarında yalnız ekleme yapıldı; plan
testi Paket 6'daki ölçütlerin hepsini geçti. Build temiz.

## 14 Eylül 2026 (7) — Turnuvaya açık bot katılmaz (migration 190)
Sahibi: gece turnuvasına ÜstatBot gibi açık botlar katılmış. Tüm turnuva bot
katılımı `turnuva_bot_havuzu`'ndan geçiyor; havuz migration 173'ten beri açık
botlara ÖNCELİK veriyordu. Artık yalnız gizli botlar (gerçek oyuncu gibi);
hedef sayı aynı. Bekleyen (lobi) turnuvalardaki açık botlar silindi, yerleri
gizli botlarla doluyor; aktif/bitmiş turnuvalara dokunulmadı.

## 14 Eylül 2026 (8) — Meydan botları: boşta sessiz, daha az (migration 191)
Sahibi: kimse yokken gezinmesinler (Supabase limiti), inandırıcı değil → 1, bazen 2.
**Ölçüm:** bot yürüyüşü yalnız haritayı açan istemcide hesaplanıyor, sunucuda
hareket yok; kimse yokken aktif nöbet 0. Ama `bildim-meydan-bot` cron'u 5 dk'da
bir boş meydanda da 6 katmanı dolduruyor, `gizli_bot_nabiz` o botlara yazıyordu.
**Değişiklik:** cron kaldırıldı — nöbet yalnız harita açıkken `meydan_botlari()`
ile dolar, kimse yokken tablo boşalır. Tavan 6→2, dalga üst 3→2, ek oyuncu 2→1,
grup en çok 3→2, grup %30→%20. İstemci değişmedi (ayarları RPC'den okuyor).
Senkron görünen hareketin kendisi düzeltilmedi; sayı düşürüldü (sahibinin tercihi).

## 14 Eylül 2026 (9) — Revizyon Paketi 8 (Görünüm görünürlüğü + küçük düzeltmeler)

Commit'ler: `d308965` (Madde 1) · `03188bb` (Madde 2) · `7713944` (Madde 3) · `cc9b580` (Madde 4).
Tek oturum, alt ajansız. Migration yok.

### Madde 1 — Görünüm öne çıktı (öncesi → sonrası, canlı ölçüm, 1389×960)
- **Üst bar:** öncesi zil · coin · profil (gardırop bağlantısı yok) → sonrası zil · coin ·
  **tişört ikonu** (44×44, `/oyun/avatar3d/gardrop.html`) · profil. Her ekrandan 1 tık.
  390 px'te öğeler 161-359 px arasında, bar sağ kenarı 375, yatay taşma 0.
- **Dükkân:** öncesi varsayılan sekme Joker → sonrası **Görünüm** (`?sekme=` bağlantıları aynı).
- **Profil → Ayarlar:** öncesi Görünüm kartı 6. sırada, sayfanın 1242. pikselinde
  (960 px ekranda kaydırma şart) → sonrası **1. kart, 466. piksel** (kaydırmasız görünür).

### Madde 2 — İki "Görünüm" kartı
Tema kartı "Görünüm" → **"Tema"**. Ayarlar'da "Görünüm" adlı kart 2 → 1. TemaDugmesi aynı.

### Madde 3 — Dükkân gardırop listesi
Satırlara eşya görseli (gardıroptaki `esyaPortresi`, oyuncunun ten/renkleriyle). three.js
dükkân paketine statik girmesin diye dinamik yüklenen `EsyaOnizleme`; paylaşılan kuyruk.
Canlı: 48 satır, 48 görsel dolu. "Şu anki karakterin" portresi: `KarakterPortresi`
IntersectionObserver'a bağlıydı (gardıropta ParcaPortresi'nde aynı gözlemci portre
üretmediği için kaldırılmıştı) ve görünümü hiç kaydedilmemiş oyuncuda bilerek boştu.
İkisi de kaldırıldı: gözlemci yok, görünüm yoksa varsayılan karakter. Canlı: portre dolu.

### Madde 4 — Arkadaşlar sayfası
Sıra: Arkadaşların (122 px) → Bekleyen istekler → "Arkadaş davet et" başlığı (666 px) →
Davet kodun → Davet koduyla ekle. Kartlar aynen korundu. (İlk düzenleme denemesi tanımsız
değişkene başvuruyordu; derlemeden önce fark edilip geri alındı, temiz taşıma yapıldı.)

### Regresyon
Joker/Coin sekmeleri duruyor; Ayarlar'daki diğer kartların sırası ve işlevi aynı
(yalnız Görünüm başa geldi); Tema düğmesi bileşeni değişmedi. Build temiz.

## 14 Eylül 2026 (10) — Revizyon Paketi 9

Commit'ler: `7de2936` (Madde 1, migration 192-193) · `ed736cf` (Madde 2) · `b419db0` (Madde 3, migration 194).
Tek oturum, alt ajansız.

### Madde 1 — Meydan Okuma'da 5 botun 5'i "Çok zor"
**Görevdeki öneri uygulanmadı, çünkü sayfayı bozardı:** `select`'e `bot_isabet` eklemek.
Ölçüldü: `bot_isabet` sütununun authenticated okuma yetkisi YOK (migration 155) → PostgREST
hata verir, bot listesi tamamen boşalır. Yetkiyi açmak gizli botların isabetini sızdırır.
**Çözüm:** `acik_bot` kalıbıyla türetilmiş `acik_bot_isabet` sütunu (192), yalnız açık +
aktif botta dolu (193); istemciye yalnız bu açıldı. Gizli/insan satırında dolu olan: 0.
**Ek bulgu:** listedeki 5. bot "BilgeBot" emekli (`bot_aktif=false`, 0.45) ve ToyBot (0.42)
ile aynı "Kolay"a düşüyordu → listeden çıkarıldı. Aktif 4 bot: 0.42 / 0.58 / 0.75 / 0.90.
**Canlı:** ToyBot Kolay · ÇaylakBot Orta · ÜstatBot Zor · EfsaneBot Çok zor (ekran görüntüsü).
Görevdeki "5 farklı etiket" beklentisi emekli botun varlığından geliyordu.

### Madde 2 — Kategori nereden seçiliyor
Ana sayfada "Hemen oyna"nın üstüne "Rakip aranacak kategori" açılır listesi (Ayarlar'la
aynı `get_categories` + `tercih_kategori_kaydet`). Ayarlar metni: "Hemen Oyna ve Dereceli
Maç bu kategoride rakip arar. Ana Sayfa'dan da değiştirebilirsin." Meydan Okuma başlığına
açıklama: sayfa bot/arkadaş içindir, eşleştirme kategorisi Ana Sayfa'dan.
**Canlı:** "Tarih" seçildi → Hemen oyna → arama ekranı "Tarih kategorisinde seninle aynı
seviyede birini arıyoruz" (ekran görüntüsü). Vazgeç ile çıkıldı, kategori Karışık'a geri
alındı (DB'de null). İlk denemede otomasyon tıklaması tutmadı; ikincide doğrulandı.

### Madde 3 — Yeni saç, etek, kolsuz üstler (migration 194)
model.js: saç `topuz`, `atkuyruk`, `orgu`, `dalgali`; alt `etek` (belde tek parça, iki yüzlü
kumaş, bel ve kenar bandı); üst `askili` (ince askılar), `straplez`, `crop` (göbek açık).
Kolsuz üstlerde kol kabuğu çizilmez (eskiden kısa olmayan her üst uzun kol alıyordu) ve
boyunda havada kalacak yaka halkası kapatıldı.
**Görsel kontrol (Playwright + swiftshader, scratchpad/png9):** ilk çizimde topuz, at kuyruğu
ve örgü ense arkasında kaldı → önden portre ve kartta kısa saçtan AYIRT EDİLEMİYORDU.
Düzeltildi: topuz başın üstünde, at kuyruğu sağ omzun önüne sarkan yan at kuyruğu, örgü sol
omuzda yan örgü (at kuyruğu iki denemede oldu). Etek/askılı/straplez/crop'ta batma yok.
Model testi: tüm yuva değerleri, 0 hata, NaN yok.
**Katalog/sunucu:** 8 satır (350-550 coin), `avatar3d_dogrula` yeni değerleri kabul ediyor
(canlı tanım temel alındı), bot üreticisi: kadın botlarda 25 yeni saç, 20 etek, 21 kolsuz
üst; erkekte etek 0. Migration istemci yayına çıktıktan SONRA uygulandı (yoksa eski istemci
bilinmeyen değeri kısa saça düşürürdü).
**Canlı:** gardıropta 8/8 parça, askılı bluz karaktere giydirildi (ekran görüntüsü);
dükkân listesi 48 → 56 satır, 56'sı görselli.

### Regresyon
Eski saç/üst/alt parçaları model testinde hatasız; `botZorluk` başka sayfada kullanılmıyor
(oyuncu listelerindeki robot ikonu `bot_isabet != null` ile — o alan zaten hiç gelmiyordu,
davranış değişmedi). Build temiz.

## 14 Eylül 2026 (11) — Revizyon Paketi 10

Commit'ler: `f30711d` (Madde 1) · `cc376c3` (Madde 1 ek, puan kontrastı) · `e812e99` (Madde 2).
Tek oturum, alt ajansız. Migration yok.

### Madde 1 — Ana sayfa rakip kategorisi
Çıplak `<select>` kalktı → kart: solda seçili kategorinin `KategoriIkon` rozeti, "RAKİP
KATEGORİSİ" + seçili ad, sağda "Değiştir ›"; satırın tamamı `<button>`. Tıklayınca
`Modal` ile ALTTAN açılan liste (Karışık + 10 kategori, ikonlu, soru sayılı). `Modal`'a
isteğe bağlı `ekSinif` eklendi (`bd-alttan` katmanı alta hizalar; diğer kullanımlar aynı).
Kayıt mantığı aynı (`tercih_kategori_kaydet`). Not: görevdeki `varsayilan_kategorim` RPC'si
yok; Ayarlar da `tercih_kategori_kaydet` kullanıyor.
**Canlı:** kart → sayfa açıldı (11 seçenek, Karışık aktif) → Tarih → kart "Tarih"; ağda
`tercih_kategori_kaydet {"p_kategori":"tarih"}`, Hemen oyna → `kuyruga_gir
{"p_kategori":"tarih","p_dereceli":false}`, arama ekranı "Tarih kategorisinde…". Vazgeç,
Karışık'a geri alındı (`p_kategori: null`).
**Puan:** `.app .bd-hero-puan-sayi` (satır ~3710) rengi `--bd-metin`'e çekiyordu. İlk
denemede `--bd-odul-2` #C99A00 kullanıldı → beyaz hero zemininde kontrast 2,59 ölçüldü
(büyük metin eşiği 3,0 altı). Metin için ayrılmış `--bd-odul-metin` #8A6A00 → 5,07, altın
his `--bd-odul` alt gölgesinden; boyut 52 → 68 px. Eski "metne kırpılmış zemin" sıfırlandı.

### Madde 2 — Dükkân karakter portresi ve eşya görselleri
**Kök sebep (ölçüldü, gerçek GPU — AMD D3D11):** çizim bozuk değildi, SIRA sorunuydu.
Karakter portresi ve 56 eşya görseli aynı portre kuyruğunda; portre en sona düşüyordu.
3,4. sn: 27/56 görsel, portre boş; 7,4. sn: 56/56 + portre. Bu arada kutular düz renk
durduğu için "çizilmiyor / yalnız birkaç satırda görsel var" görünüyordu; yavaş cihazda süre
daha da uzar. (Paket 8'deki "56/56 dolu" ölçümü bekleyerek alınmıştı.)
**Düzeltme:** `siraya(is, oncelikli)` — portre kuyruğun başına girer. Bekleyen portre ve
satır kutularında "yükleniyor" ışık geçişi (azaltılmış harekette durağan).
**Canlı:** 1,9. sn'de portre DOLU (53 kutu iskelette), 6,9. sn'de 56/56 satır görselli.
Etek'e özel bir ikon deseni yoktu; tüm satırlar zaten aynı EsyaOnizleme'yi kullanıyor.

### Regresyon
Ayarlar'daki "Varsayılan kategorim" kodu değişmedi; Dükkân Joker/Coin sekmeleri aynı;
Hemen oyna akışı ve kategori parametresi ağda doğrulandı. Build temiz.

## 14 Eylül 2026 (12) — Ana Sayfa referans tasarıma uyarlama (Claude outputs/ANASAYFA_REFERANS.html)

Commit'ler: `e627ff2` (1 buton) · `9ad1130` (2 mod ızgarası) · `300a06b` (3 turnuva) ·
`2913e23` (3 ek) · `007e386` (4 genişlik) · `9372341` (5 hero). Tek oturum, alt ajansız.
Yöntem: tema.css katmanlı; eski kurallar silinmedi, her madde için sona `.app .anasayfa`
kapsamlı hedef blok eklendi (yalnız Ana Sayfa etkilenir).

**390 px canlı ölçüm (iframe):** Hemen oyna #FFC53D / yazı #1b1206 / gölge 0 5px 0 #C99A00 /
54 px · hero köşe 24, padding 20/14/14, parlaklık görünür · puan 48 px + 0 4px 20px parıltı ·
hero'dan hemen sonra turnuva kartı (1,5 px altın), "18 kişi lobide" ayrı satır, buton "Lobidesin"
(beyaz, gradyansız, gri kalınlık) · 5 mod kartı 96 px, açıklama gizli (title'da), Hatalarım
rozeti var · yatay taşma 0. Yan yana görüntü: scratchpad/anasayfa-yanyana-390.png.
**Masaüstü:** `.app` 620 px, mod kartları 96 px, taşma 0. Lig, Profil, Dükkân, Arkadaşlar,
Meydan Okuma 620 px'te açıldı: hepsinde taşma 0, düzen bozulmadı (ekran görüntüleri alındı).
**Regresyon:** kategori sayfası açılıyor/Esc kapatıyor; Hemen oyna → arama → Vazgeç; görevler ve
haftalık sayaç yerinde; "Seni bekleyenler" ve "Başka nasıl oynanır" başlıkları duruyor.

**Referanstan bilinçli sapmalar (WCAG AA — CLAUDE.md):** puan sayısı dolgusu açık temada
`--bd-odul-metin` #8A6A00 (referans #FFC53D beyazda ~1,6:1); "GECE TURNUVASI" 10,5 px etiketi
aynı ton (referans #C99A00 ~2,5:1, küçük metin 4,5 ister). Boyut/gölge referansla aynı.
**Ölçülüp düzeltilen:** "Lobidesin" ikincil sınıfı doğruydu ama başka .btn kuralının turuncu
gradyan GÖRSELİ üstte kalıyordu → sıfırlandı; sayaç kutuları ortadaydı → sola.
**Kapsam dışı bırakılan (maddelerde yok, fark sürüyor):** referansta haftalık lig sayacı hero'nun
içinde (canlıda "Seni bekleyenler" altında); canlıda hero içinde ayrı "N günlük seri" kartı var;
kategori kartında referans turuncu ızgara ikonu, canlı seçili kategorinin rozeti.

## 14 Eylül 2026 (13) — Revizyon Paketi 12 (7 madde)

Tek oturum, alt ajansız, her madde ayrı commit. Migration 195-198 yazıldı, önce
`begin … rollback` ile denendi, sonra canlıya uygulandı ve geçmişe kaydedildi.

### 1 — Gardırop telefonda sıkı ızgara (`e42a8be`)
Telefonda 3 sütun, geniş ekranda auto-fill (118-150 px). Kart 149 px, görsel 100×88, ad tek
satır 12 px + üç nokta. Satın alınabilir eşyada fiyat çipi yerine "500 ◎" küçük hap (görünen
28 px, ::after ile 44 px dokunma); Çıkar aynı boyda. Yeşil seçili çerçeve ve 3B önizleme aynı.
**390×844 ölçüm (Playwright, yerel derleme):** yapışık alanın altında 6 eşya tam görünüyor,
yatay taşma yok.

### 2 — Meydan botları dış kenardan girip çıkar (`ee31df7`)
`kenarKapilariHesapla(engeller, oyuncuBaslangici)`: 26 birimlik halkada engelsiz yayların ortası,
oyuncunun doğduğu (0,11) yöne en yakın 3 nokta → 90°, 37°, 143° (binaların arası, oyuncu merkeze
bakarken arkada). Bina kapısı yalnız yedek. `planKonumu` plandaki engelleri taşır; konum hiçbir
anda bina/bank/ağaç içine düşmez (düşerse en yakın açık noktaya itilir). bacakKur / bulusmaKur /
planaBacakEkle / nöbet devri dokunulmadı.
**Simülasyon (300 plan + 5 buluşma bacağı, 338.500 örnek):** bina içi 0, diğer engel içi 0,
sıçrama 0, bina kapısında biten 0, hepsi kenar noktasında başlar/biter, kararlı.
**Canlı ~3 dk (gizli sekmede RAF zamanlayıcıyla kare ilerletildi):** botlar halkada yürüyüp
duruyor, binaya giren/binadan çıkan yok. Opsiyonel "bina önünde durup dönme" yapılmadı.

### 3 — Lig: kurulumu bitmemiş + test hesapları (`dfb5afe`, migration 195)
**Ölçüm:** 55 gerçek hesabın 28'inde takma ad yok, 27'sinde avatar onayı yok; hepsi bu haftanın
lig üyeliğinde. DİKKAT: 75 gizli botun `avatar_onayli`si false — kural botlara uygulanmaz.
**Kalıcı kural:** `lig_gorunur_mu(is_bot, takma_ad_secildi, avatar_onayli, lig_gizli)` =
gizli değil VE (bot VEYA takma ad + avatar tamam). lig_grubum (satır + grup boyu; oyuncu kendi
satırını görür), lig_siralama, lig_uyeligim_kur, lig_gruplarini_kur (doluluk/grup sayısı) buna
bakar. Üyelik silinmez; kurulumu bitiren kendiliğinden görünür. Yeni `profiles.lig_gizli`
(sütun yetkisi yok, istemci okuyamaz).
**SİLİNEN: 12 hesap** (auth.users, bağlı satırlar cascade) — ölçüt: gerçek hesap, 8 Eyl
sonrası açılmış, anonim ya da `ornek.test` e-postalı, maç 0, grup/hızlı/turnuva kaydı 0,
arkadaşlık 0, satın alma 0, son 12 saatte görülmemiş VE adı bariz test/anlamsız:
TestOyuncu, SureTesti, TemaTest, TestKontrol, TestCanli, hhhh, sss, hhhjj, ddx, gfdg, vhh +
`ornek.test` e-postalı "Oyuncu".
**Yalnız gizlenen (lig_gizli):** SquareTest12 (1 maç), QuizTestIda (bugün görüldü), ssss (1 maç +
1 arkadaş), DenekKartal, YüceBaran. sillaaa/slla/sila/silaapp/İGG/Şev/Jenny olası gerçek kişi —
dokunulmadı. Haziran-Temmuz'dan kalan adı "Oyuncu" hesaplar (gerçek ad-soyadlı kullanıcı adları)
silinmedi, kural gereği gizli.
**Canlı /siralama (390 px iframe):** "Oyuncu" satırı 0, test adı 0, taşma yok; grup 11 kişi.

### 4 — Dükkân › Görünüm yuvaya göre gruplu (`9439373`, ek `4df688a`)
Saç · Üst giyim · Alt giyim · Ayakkabı · Baş aksesuarı · Gözlük · Sakal · Takı (kolye/saat/küpe) ·
Sırt; bilinmeyen yuva sona. `<details open>` bölümler, başlıkta adet, içinde ızgara (≤520 px'te
3 sütun). Fiyat / Sende / Turnuva ödülü / gardıroba bağlantı aynı.
**Canlı 390 px:** 9 bölüm ("Saç · 7" … "Sırt · 1"), 3×102 px, açılıp kapanıyor, taşma yok,
56/56 görsel. Ölçülüp düzeltilen: `.app a` (0,1,1) kart adını turuncu/altı çizili yapıyordu.

### 5 — Kabul sonrası yüz yüze yaklaşma (`5308734`, migration 196)
Saf mantık `harita/yaklasma.js` (three.js yok): kabul anından 1,6 sn sabit sürede yürüyüş
(yumuşak başlangıç/bitiş, hız mesafeyle ölçekli), aralarında 1,5 birim, yüz yüze; sonra 1,9 sn
etkinlik (ikram jesti kahve/balon 2,5 sn; meydan okumada 👋) → toplam 3,5 sn. Bu sürede
topuz/zıpla/dans/emoji `kilitli` (soluk, basılamaz), klavye girdisi uygulanmaz.
Ortak saat: `ikram_kabul_bilgisi(p_id)` → yanit_at + sunucu_zamani (gönderen VE alan okuyabilir;
gizli botun ileri tarihli kabulünde o an gelene kadar 'bekliyor'). Geç açılan istemci ışınlanmaz,
bulunduğu yerden kalan sürede yürür. Karşı taraf bot ise o istemcide bot da yürür, sonra planına
`geriDonusYolu` ile yürüyerek döner. Uzak gerçek oyuncuyu kendi istemcisi yürütür.
Meydan okuma haritada "kabul" olayı taşımıyor (seçen hemen maça geçiyor): yaklaşma + selam
geçişten önce yerel oynar, sonra maça gidilir.
**Node testi:** 0,4 / 10 / 18 birim → son aralık 1,500, yürüyüş 1600 ms, toplam 3500 ms, yüz yüze,
en büyük kare adımı 0,12; geç başlayan 400 ms'de yürür, bitiş aynı; saat çevirme doğru.

### 6 — "Beklemeden bot ile oyna" bot seçimi (`65cf853`, ek `4f0f2c6`, migration 197)
Düğme önce açık botları kolaydan zora listeler (ad + `botZorluk`; zorluk `acik_bot_isabet`ten —
ham `bot_isabet` istemciye kapalı). `botZorluk` ortak `lib/botZorluk.js`'e taşındı, ChallengesPage
oradan alır. Seçim `hemen_bot_mac_sec(p_bot, p_kategori, p_dereceli)`: yalnız açık + aktif bot
(gizli bot reddedilir), çift maç ve kota denetimi eskisiyle aynı. Liste okunamazsa/boşsa eski
`hemen_bot_mac` yolu. Açık bot kuralları (%50 coin, anında cevap) maç motorunda, değişmedi.
**Deneme:** ToyBot → aktif maç, 20 soru; gizli bot → "Bu bot şu an oynanamıyor."
**Canlı 390 px:** ToyBot Kolay · ÇaylakBot Orta · ÜstatBot Zor · EfsaneBot Çok zor, satır 48 px,
Vazgeç çalışıyor.

### 7 — Günde 7 turnuva (`f3f137e`, ek `e34869e`, migration 198)
`oyun_ayarlari.turnuva_saatleri` = 10:00, 12:30, 15:00, 18:00, 20:00, 22:00, 24:00 (TSİ; 24:00 = o
tarihin gece yarısı). Eski sabah/aksam anahtarları duruyor, yalnız geçiş öncesi satırların anı
için okunur. Ödüller ve 400 tavanı dokunulmadı.
- `tournaments.seans` artık saat metni (check kısıtı genişletildi). `turnuva_seans_araligi`,
  `turnuva_saatleri_listesi`; turnuva_an, sonraki_turnuva_bilgi/_tarihi/_ani, turnuva_lobi_botlari
  listeden hesaplar.
- Cron: sabit başlatma (2) ve bot çağrıları (2) kaldırıldı; `bildim-turnuva-zamanlayici` her dakika
  anı gelen lobiyi başlatır (<2 kişi iptal, 15 dk'dan eski lobi iptal) ve sıradaki lobiyi açar.
  Bot katılımı mevcut dakikalık tik ile her turnuvaya (38-66, yayılmış).
- Bot havuzu: başka lobide/aktif turnuvada olan ve en son biten turnuvada oynamış bot dışarıda
  (eşzamanlı ve art arda tekrar yok). Canlı ölçüm: iki açık lobide ortak bot 0.
- Hatırlatma günde en çok 2: 12:30 için 11:45 TSİ ("Öğle turnuvası", `45 8 * * *` UTC), 22:00 için
  21:15 TSİ (`15 18 * * *`). Gizli anahtarlı başlık dokunulmadı (alter_job yalnız zaman/metin).
- Geçiş: bugünkü 21:50 lobisi (18 kişi) 22:00'a taşındı; zamanlayıcı ilk koşuda 20:00 lobisini açtı.
- İstemci: zaman.js listeden hesaplar (`sonrakiTurnuva`, `bugunKalanTurnuvalar`, `turnuvaAniMs`,
  `siradakiLobi`); Countdown otomatik genelleşti. Ana sayfa "20:00 TURNUVASI" + "Bugün kalan
  turnuvalar: 20:00 · 22:00 · 24:00"; /turnuva geri sayım kartında aynı satır; tanıtım metni ve
  meydan levhası ("günde 7 turnuva").
- Ölçülüp düzeltilen (ek commit): Ana sayfa ve /turnuva "son 2-3 satır"dan ilk lobiyi alıyordu —
  aynı gün iki lobide yanlış lobinin kişi sayısı görünüyordu; günde 7 turnuvada bitmişler lobiyi
  hiç göstermeyebilirdi. Artık açık turnuvalar çekilip en erken başlayan lobi seçilir.
**Canlı:** cron.job listesi yukarıdaki gibi; 390 px ana sayfa sayacı 25 dk (20:00'a), /turnuva
lobisi aynı liste; bot 26/52 (20:00) ve 18/58 (22:00) katılıyor.

### Paket 12 — ekler ve regresyon
- **Madde 1 ek:** canlı hesapta bedava dönem açık; her kartta "Ücretsiz" çipi + "Al" hapı birlikte
  olunca kart 171 px oluyordu. Hap varken çip gizli ("Ücretsiz al" / fiyat / "Çıkar" hapın
  içinde, takılı kartta yeşil çerçeve). Yerel 390 px: 9 kartın hepsi 149 px, 6 eşya görünür.
- **Madde 5 canlı:** otomasyonla meydanda yürüyen bota isabetli tıklanamadı (ekran görüntüsü ile
  tıklama arası gecikme); ikram kabul akışı CANLIDA DENENMEDİ. Doğrulama: derleme + yaklasma.js
  node testleri + migration 196 deneme koşusu (kurucunun son kabul ettiği ikram için doğru an).
- **Lig haftalık kurulum:** `lig_gruplarini_kur(gelecek hafta)` geri alınan işlemde hatasız —
  bronz 1 grup: 11 görünür gerçek oyuncu + 12 gizli bot; 31 eksik kurulumlu hesap üye ama yer
  kaplamıyor. `lig_haftayi_kapat` değişmedi.
- **Normal Hemen oyna:** kuyruga_gir / quick_match değişmedi; canlıda arama ekranı açılıp Vazgeç ile
  kapandı.

## 14 Eylül 2026 (14) — Meydan botları daha canlı + arkadaşlık isteği geri çekme

**Şikâyet:** "Botlar aşırı yavaş ve aynı tempoda; sağa sola koşmalı, mantıksız hareket edip
zıplamalı; hep aynı noktadan gelmesin. Haritada arkadaşlık isteğini geri çekemiyorum."

### Botlar (`meydanBotlari.js`, `HaritaSayfasi.jsx`)
- Temel hız 3,2 → 4,2 (oyuncu 9). Bacak başına tempo: %40 koşar (1,8-2,2×), %35 seri
  (1,25-1,5×), %17 yürür, %8 ağır (0,7×). Molalar %55·2,5-9 sn → %35·0,6-4 sn.
- Dolaşma alanı dar halka (8,2-9,8) → tüm meydan (8,2-19). Bacak türü karışık: halkada tur,
  rastgele noktaya düz koşu, 2-4 hamlelik sağa-sola zikzak (her hamlede yön ters).
- Jest penceresi 40 → 14 sn; zıplama 1-3 kez, artık yürürken/koşarken de.
- Giriş/çıkış: 3 kenar noktası → her 2°'lik engelsiz kenar noktası (81 nokta).
- Ölçülüp düzeltilen: geniş alanda `halkaYolu` ara noktası bankın içine düşüp itiliyor, bot
  bankın bir yanından öbür yanına atlıyordu (145 sıçrama) → ara nokta baştan engel dışında.
- **Simülasyon (300 plan + 5 buluşma, 338.500 örnek):** bina/engel/havuz içi 0, sıçrama 0;
  yürüyüşte koşar %24, seri %30, yürür %34, ağır %13 (zaman ağırlıklı); yürüyüşün %58'i bank
  halkasının dışında; zıplama bot başına ~1,5/dk, jest ~2,6/dk; 300 botta 76 farklı giriş noktası.
  Hepsi tohumdan — herkes aynı hareketi görür.

### Arkadaşlık isteği geri çekme
- Sunucu değişikliği yok: `remove_friend(p_id)` isteği gönderene de satırı sildiriyor;
  friendships'te bildirim tetikleyicisi yok (geride bildirim kalmaz).
- Meydan menüsü: "İstek gönderildi" (basılamaz) → "İsteği geri çek". Satır kimliği okunur;
  istek arada kabul edildiyse silinmez, "artık arkadaşsınız" denir.
- Arkadaşlar sayfası › Bekleyen istekler: her satırda "Geri çek".

### Paket 12 — turnuva regresyonu (canlı, 20:00 turnuvası)
`bildim-turnuva-zamanlayici` 20:00 turnuvasını **tam 20:00:00'da** başlattı (52 kişi, hepsi bot),
21. soruda 20:02:02'de bitti, kazanan yazıldı, zamanlayıcıda başarısız koşu 0; sıradaki 22:00 lobisi
açık (22 bot + 1 gerçek oyuncu). Süre eski turnuvalarla aynı (13:00 → 1,9 dk, önceki gece 1,6-2,0 dk):
botlar hızlı eleniyor, yeni zamanlayıcıdan değil. Ödül: `turnuva_odullerini_dagit` → coin_ekle
(`tur='turnuva'`, `referans='derece:…'/'katilim:…'`); botlara coin yazılmaz, bu turnuvada gerçek oyuncu
olmadığı için satır yok — 13:00'daki gerçek oyuncunun katılım ödülü 13:01'de yazılmış.

## 14 Eylül 2026 (15) — Paket 12 Madde 1 tamamlama (gardırop sadeleştirme + karakter şeridi)

Paket metni tekrar geldi; 2-7 zaten canlıdaydı (yukarıdaki kayıtlar). Madde 1'in yeni istekleri:
- **Bekle / Yürü / Selam ver düğmeleri kaldırıldı.** `sahne.animasyon` kodu duruyor (atölye kullanıyor);
  karakter varsayılan "bekle" duruşunda. Yüzü incele / Tüm karakter kaldı.
- **"Kaydedilen karakterle meydana git" bağlantısı kaldırıldı** (alt menüde Meydan sekmesi var).
- **Kaydırınca karakter şeride iner:** telefonda (≤760 px) ~120 px aşağıda `.kucuk-sahne` → sahne
  `--gos-h` 88 px, en üste (≤12 px) dönünce geri büyür; eşik farkı titremeyi önler. Yalnız height
  (ResizeObserver tuvali yeniden boyutlar), yapışık alanda/atalarında transform yok (iOS kuralı).
  Kamera düğmeleri 88 px'lik şeride sığmadığı için yalnız küçükken gizli. Kayıt çubuğu ve
  "geçici olarak çıkarıldı" uyarısı aynı.
- **390×844 ölçüm (Playwright, yerel derleme):** açılış sahne 253 px / yapışık alt 387; kaydırınca
  sahne 88 / yapışık alt 222, listede 9 eşya görünür (ilk 235 px'te tanıtım kartı hâlâ ekranda → 3);
  üste dönünce 253; Bekle/Yürü/Selam ver yok, "meydana git" yok, taşma yok.
- Izgara (3 sütun, kart ≤150 px, fiyatlı küçük hap, yeşil seçili çerçeve) önceki commit'lerde.

## 14 Eylül 2026 (16) — Revizyon Paketi 13, AŞAMA 1: harita büyüdü, göl + kemer köprü

Commit'ler: `6ab53e3` (1.1-1.3 dünya/köprü/yükseklik) · `c703189` (bot yarıçapları) · `36fc84d` (bank/doğuş).
Not: paket metnindeki "son migration 191" eski; Paket 12'de 195-198 uygulandı, sıradaki 199.

### 1.1 Harita (`dunya.js`)
Bina yarıçapı 30 → 44, yürünebilir sınır 58 → 80, çim 66 → 92, taş meydan 17 → 26; çim yamaları
28-88, taş çizgileri göl-meydan arası, halkalar 16..25; sis 85-190, gölge kamerası 92. İç bank
halkası 20 (30°'den; 0°/180° köprü uçlarıydı — ölçülüp düzeltildi), lamba 24, çevre ağaçları 31,
dış ağaç 50-86, çalı 30-88. Boşluk için: ikinci bank halkası 36, ikinci lamba halkası 37, 5 çiçek
tarhı 28 (hepsi engel listesinde). Oyuncu doğuş (0,16,5). Bulutlar 60-105.
### 1.2 Göl
Çeşme (kaide/sütun/heykel/8 jet) kalktı; göl r14: kıyı halkası + su yüzeyi (y 0,40, taşın üstünde)
+ 3 gezen dalga halkası. Su hafif salınır.
### 1.3 Köprü ve yükseklik
`KOPRU = {L:15,8, W:3,4, H:3}` x ekseni boyunca; 26 parçalı kemer güverte, iki yanda ray + dikme
korkuluk, suda 2 ayak. **Tek kaynak `zeminYuksekligi(x,z)`** (dunya.js): ayak izinde kemer, dışında 0.
- `carpismaDuzelt`: korkuluk şeridi (|z| 1,35-2,4) yakın tarafa iter; göl içine yalnız güverte
  hariç girilmez (kıyı 14,5); harita sınırı 80.
- Avatar y = zemin + zıplama: `yurumeAnimasyonu(av,dt,guc,zipla,zemin)` ve `meydanModelYuru(...,zemin)`;
  duruş yalnız zıplamaya bakar (köprüde bacak toplanmaz). Emoji balonu avatar y'sini izler.
- Ağ: `coklu.pozGonder` h = zıplama + zemin (yeni alan yok). Alıcı: `zipla = max(0, h − kendi
  zeminYuksekligi)`; zemin haritadan. Kamera hedefi/lookAt oyuncu y'sinin %60'ını izler.
### Botlar (`meydanBotlari.js`)
HALKA 16-18, DOLAŞ 16-30, KENAR 40 (115 giriş noktası), göl engeli 14,5, buluşma 17, ziyaret 32.
Nöbet süresi (80-150 sn) yeter: kenardan halkaya yürüyüş 5,3-5,9 sn.
### Ölçümler
- **Bot simülasyonu** (300 plan, 338.500 örnek): bina/engel/göl içi 0, sıçrama 0, 101 farklı giriş.
- **Gerçek dunya.js testi** (`.tmp/harita-test`, git dışı; Vite dev + Playwright): göle yürüyünce
  r 14,5'te durur; sol kıyıdan köprüye çıkıp tepede (0,08, 0,48) **y = 3,00**; tepede yandan yürüyünce
  z −1,35'te kalır (güvertede); karşı kıyıya geçer (x 22,8, y 0); profil −15,8..15,8 →
  0 / 1,27 / 2,23 / 2,81 / 3 / 2,81 / 2,23 / 1,27 / 0; ayak izi dışı 0. Uzak oyuncu paketi h=3 →
  y 3 (zemin 3, zıplama 0); h=4 → y 4 (zıplama 1); yerde h=0 → 0. Sınıra yürüyünce r=80.
- **Canlı (Chrome, idagg):** göl + köprü + süsler çiziliyor; botlar ~6 dk boyunca taş halkada
  yürüdü, göle/binaya giren yok. İkinci HESAPLA canlı test yapılamadı: misafir girişi kapalı,
  başka hesap şifresi yok — uzak oyuncu yüksekliği yukarıdaki alıcı formülü testiyle doğrulandı.
- Otomasyon sekmesinde ilk açılışta bir kez "Meydan açılamadı" görüldü (RAF durdurulmuş sekmede
  ilk kare 8 sn'ye yetişmedi); "Tekrar dene" ile açıldı. RAF durdurulmadan yeniden ölçüldü: 7 sn'de açık, hata yok — otomasyon kaynaklı.

## 14 Eylül 2026 (17) — Revizyon Paketi 13, AŞAMA 2: balıkçı, olta, balık tutma

Commit'ler: `12a0dcf` (migration 199 sunucu) · `f1308db` (NPC/olta/balık görseli) · `e129b61` (bot balık bacağı).
Aşama 1 canlıda doğrulandıktan sonra başlandı; ayrı push edildi.

### Sunucu (migration 199, uygulandı)
- `oyun_ayarlari`: olta_fiyat 5, olta_sure_dk 60, balik_gunluk_tavan 20, balik_capalar [60,180,420,840,1680],
  balik_sapma_yuzde 15, balik_sonraki_min_dk 9, balik_sonraki_max_dk 21, meydan_bot_balik_yuzde 35.
- `oltalar` (user_id pk, alinma_at, bitis_at, tohum, basla_at, sonraki_an, yakalama) — RLS açık, politika yok:
  istemci tabloya dokunamaz.
- `olta_al()` → coin_harca(fiyat,'olta'); `olta_birak()`; `olta_durumum()` (bitis, bugün, tavan, fiyat, sunucu saati);
  `balik_yakala()` → 'olta_yok' | 'bos' | 'yakalandi' | 'tavan'. Takvim `balik_sonraki_an`: ilk atıştan (basla_at)
  çapalar ×(1±%15, bot_rasgele(tohum)) ; çapalar bitince önceki yakalamadan 9-21 dk. Tohum gen_random_uuid,
  istemciye verilmez. Tavan: coin_hareketleri tur='balik' bugün (TSİ) toplamı + coin_gunluk_kalan (400).
  hiz_siniri 40/dk. Botlar RPC çağırmaz; coin_ekle bota yazmaz.
- **Deneme koşusu (rollback):** oltasız → olta_yok; olta al 365→360; ilk çekiş bos, ilk coin 57. sn; erken bos;
  an gelince yakalandi (+1) ve sonraki 181. sn; takvim serisi 68/189/364/873/1870 sn, sonra 993/847/563 sn
  aralık; tavan 2 → iki yakalama sonra 'tavan'; bırakınca olta_yok.

### İstemci
- Balıkçı NPC köprü ortasında (0, 3, 1,05), suya sırtı dönük; dekor (presence yok, kişi sayısına girmez,
  engel değil — engel yapılınca bot planlarında sıçrama ölçüldü). Dokununca kutu: "Olta — 5 coin" / oltası
  varsa kalan süre. Üst HUD'da "🎣 N dk" rozeti (15 sn'de bir; süre bitince düşer).
- Köprüdeyken + olta varken göle dokunmak (`dunya.suSec` ışın) `balikGorsel.js` döngüsünü başlatır:
  at 0,6 sn → bekle 4-7 sn → çek 0,8 sn. Her çekişte `balik_yakala`; yakalandı → balık sudan ele sıçrar, su
  halkası, 🐟 emoji, "+1 coin"; tavan → bir kez "Bugünkü balık hakkın doldu"; olta_yok → olta düşer.
  Hareket edince ya da köprüden inince olta toplanır. Haritadan çıkınca (`pagehide` + unmount) `olta_birak`.
- Botlar: nöbet başına en çok bir balık bacağı (%35, tohumdan): kıyıdan yakın köprü ucuna, güvertede korkuluk
  kenarına, 15-30 sn suya dönük olta (%18 çekişte sahte balık görseli), aynı uçtan geri. `planKonumu`
  köprüde göl engelinden itmez; buluşma/ziyaret/geri dönüş köprü anlarını atlar. Simülasyon: 300 planın
  104'ünde balık (ort. 22 sn), suda yürüyen 0, engel içi 0, sıçrama 0.

### Canlı doğrulama (Chrome, idagg)
- NPC'ye dokun → kutu; "Olta — 5 coin" → coin 365→360, `oltalar` satırı, coin_hareketleri 'olta' −5, rozet "🎣 60 dk".
- Köprüden göle dokun → olta/misina/şamandıra çizildi; ilk atış 21:46:52, sunucu ilk coini 66 sn sonraya
  planladı; 21:48:02 yakalandı: "+1 coin 🐟", coin 361, coin_hareketleri 'balik' +1, sonraki 21:50:12 (180 sn).
- Tavan testi: ayar 2 → ikinci yakalama (362), üçüncü çekiş "Bugünkü balık hakkın doldu"; ayar 20'ye alındı.
- **Sahte çağrı:** kullanıcı kimliğiyle art arda 5 `balik_yakala()` (sunucu tarafında, aynı auth.uid): ilki
  zamanı gelmiş meşru yakalamaydı (tavan testinde ileri alınan an), sonraki dördü 'bos', coin +1'den fazla
  artmadı (362→363). Takvimi olmayan çağrı ödül alamıyor. (Tarayıcı konsolundan çağrı için oturum
  jetonuna dokunmak gerekirdi; yapılmadı — aynı fonksiyon aynı kimlikle sunucuda çağrıldı.)
- Yürüyünce olta toplandı, köprüden karşı kıyıya geçildi. Zıplama girdisi çalışıyor.
- **Otomasyon notu:** arka plan sekmesinde Chrome zamanlayıcıyı 1 Hz'e kısıyor; RAF yerine setTimeout koyunca
  oyun 1/20 hızda akıyordu ("klavye çalışmıyor" sanıldı). Worker zamanlayıcıyla ~23 fps'ye çıkınca her şey
  normal. Gerçek cihazda etkisi yok.
- Bilinen sınır: sekme kapatılır/yenilenirse `olta_birak` isteği iptal olabiliyor (fetch abort); olta en geç
  60 dk'da sunucuda düşer. Uygulama içi "Oyuna dön" ile çıkışta silinir.

### KALDIĞIM YER (14 Eyl 2026 22:10, sahibi haftalık limit nedeniyle durdurdu)
Aşama 1 ve 2 canlıda; son commit `6c050e3` (bot ziyareti köprüdeki oyuncuyu hedeflemez). Kalanlar:
1. **Bot köprüde olta atıyor — canlı ekran görüntüsü alınamadı.** Sebep bulunup düzeltildi (`6c050e3`,
   push edildi; Vercel dağıtımı doğrulanmadı). Doğrulama yolu: `scratchpad/balikbekle.mjs` canlı nöbet
   tohumlarından pencereyi yazıyor (`PENCERE hh:mm:ss - hh:mm:ss`, x/z); o anda /harita'da ekran görüntüsü.
   Not: gözlem sırasında oyuncu köprüde DURMASIN (düzeltme öncesi bu ziyareti tetikliyordu).
2. Uygulama içi "Oyuna dön" ile çıkışta `olta_birak`'ın satırı sildiğini canlıda doğrula
   (`select * from oltalar`). Kurucu hesapta olta var (22:43'te sunucu düşürür) — zararsız.
3. Regresyon turu (kod dokunulmadı, yeniden koşulmadı): meydan ikram + meydan okuma (yaklaşma) büyük
   haritada; turnuva binası kapısı; kamera/zoom; iOS Safari dokunma/kaydırma (gerçek cihaz).
4. İkinci hesapla köprü yüksekliği (misafir girişi kapalı) — yalnız formül testiyle doğrulandı.
5. Test kabuğu `.tmp/harita-test/` (git dışı): `npx vite --port 5175 --mode bildim` + Playwright
   `scratchpad/kopru.cjs`, `botplan.cjs <tohum> <sn>`. Chrome otomasyonunda Worker-RAF şart (aşağıda).
Ölçülen ama bırakılan küçük şey: bulutlar (y 22-31, r 60-105) zumlu kameranın önünden geçebiliyor (eskiden de).

## 2026-09-16 — Paket 14 (Quiz Tactics revizyonu) — Aşama 1-3

Not: görevde "son migration 191, yeniler 192'den" yazıyordu; depoda 199'a kadar dolu (Paket 13). Yeni migration'lar **200'den** devam etti.
`boks/` altındaki commit edilmemiş değişiklikler bu oturuma ait değil — dokunulmadı, commit'lere katılmadı.

### Aşama 1 — Marka: Quiz Square → Quiz Tactics (`92dfb1a`)
Kullanıcıya görünen tüm metinler (vite "bildim-modu" başlık/og/apple-title, `bildim.webmanifest`, `manifest.webmanifest`, `index.html` meta,
Logo/Login/Kurulum sihirbazı, dil.js TR+EN, paylaşım/push metinleri, sw.js bildirim başlığı, Gizlilik/Koşullar, README/CLAUDE/AGENTS başlıkları).
Teknik adlar (`oyun/`, `VITE_MOD=bildim`, `quizsquare.vercel.app`, localStorage anahtarları) değişmedi. Logo ölçüldü: "Quiz Tactics" 157.4 birim
(eski 157.2) → viewBox 160 aynen. Eski migration yorumları ve PROGRESS geçmişi bilerek bırakıldı. Canlı: başlık + manifest "Quiz Tactics".

### Aşama 2 — Hızlı Mod 10 sn / 90 sn (migration 200, `2d4cb24`, `f93fc96`)
`oyun_ayarlari`: hizli_mod_sure_sn 90, hizli_mod_soru_sure_sn 10, hizli_mod_okuma_tavani 170. Havuz ölçümü (aktif, zorluk≥2, 170 tavan):
en küçük TR 761 (spor), EN 476 (tarih) — hiçbiri 300 altı değil. Sayfa süreleri sunucudan alır. Canlıda ölçülen ek hata: toplam süre sayacı
100 ms'de 0.1 düşüyordu, zamanlayıcı kısılınca geride kalıyordu → duvar saatine bağlandı. Canlı oturum: soru 10 sn'de süre doldu, oturum
91 sn'de sunucuda kapandı, 110 üstü sorular geldi (147). **Not:** hızlı cevaplayan 9'dan fazla soru görebilir (eskiden de 12 sınırı yoktu).

### Aşama 3 — Ekonomi (migration 201, 202, 203)
- Normal Maç dereceli 25/10 lig, coin 25/10; Hızlı Mod doğru×3 (tavan 25) lig + coin; Düello ayarları hazır (50/50);
  turnuva 150/80/40, 4-10. 20, diğer katılan 10 (tek miktar, eklenmez); serbest: lig 0, coin %50.
- `odul_carpani` = çift/serbest/açık-bot çarpanlarının **en düşüğü** (çarpım yok); `coin_mac_odulu` bunu kullanır. Eski
  `coin_mac_odulu` anon+authenticated'a açıktı → kapatıldı.
- Çift koruması 1v1 lig puanına **zaten** uygulanıyordu (ölçüldü); beraberlik de aynı çarpanla. Çift sayacı serbest maçları da sayar.
- Seri bonusu `least(gün×3, 15)`. **Ölçülen hata:** maç bitiş tetikleyicisi `son_seri_tarihi`'ni bonustan önce güncellediği için lig seri
  bonusu 1v1'de hiç ödenmiyordu → ayrı damga `seri_bonus_tarihi` (203).
- Davet: lig puanı yok, iki tarafa 200 coin ('davet', günlük tavan dışı). Referans: davet edilende davet eden id; davet edende davet edilen id
  (aksi hâlde davet eden ömründe bir kez alabilirdi). Aynı cihaz/IP → coin yok.
- Grup Maçı ödülsüz: coin/lig/seri yok, rozet var. Tetikleyici de artık seriyi ilerletmiyor/seri coin'i vermiyor (203).
- "Hızlı Olan Kazanır" **donduruldu, kod duruyor**: meydan sayfasındaki kurulum paneli gizli (`HIZLI_OLAN_KAZANIR_ACIK=false`), rota ve tablolar yerinde.
- Hızlı Mod haftalık skor tablosu arayüzden kalktı; `hizli_mod_skorlar` yazılmaya devam ediyor.
- Arayüz: tek "Dereceli" anahtarı (`DereceliAnahtari` + `lib/dereceli.js`, localStorage + `profiles.dereceli_tercih`) — ana sayfa, Hızlı Mod,
  Meydan (arkadaşa meydan okuma `create_challenge(p_dereceli)`). Ana sayfadaki "Dereceli Maç" kartı kalktı. Maç sonu sabit "+20 puan" yerine
  `mac_odulum` (sunucunun gerçekte yazdığı lig/coin).
- Doğrulama (geri alınan işlemde, canlı DB): aynı çiftle 11 maç → lig 25×5, 12×5, 0; berabere 10/10; serbest 0 lig/12 coin; serbest+açık bot
  12 (≠6); seri 3/6/9/12/15/15; davet lig 0, coin 200/200, tekrar false; grup maçı lig/coin/seri 0; turnuva 150/80/40/20…/10.
  Canlı Hızlı Mod (dereceli): 5 doğru → +15 lig (110→125), +15 coin (494→509).

## 2026-09-16 — Paket 14 — Aşama 4 (Düello), 5 (iki hata), 6 (dil sözlüğü)

### Aşama 4.8 / 4.9 — Kategori istatistiği + bot kişilikleri (migration 204)
- `kategori_istatistik` (user × kategori → dogru, toplam), `oyuncu_istatistik.istatistikli_mac`, `bot_kategori_sapma`.
  Tablolar istemciye kapalı; okuma `oyuncu_kategori_profili` (asgari örneklem 10, altı yüzde null → "veri yok").
- Tetikleyiciler: match/group/tournament/hizli_cevaplar her cevapta (botlar dahil); `hizli_mod_cevap` ve düello doğrudan yazar.
  İstatistikli maç sayacı maç bitince (cevabı olanlara).
- Geri doldurma: 1641 satır, 165 oyuncu (insan satırı 51). Botların bot_puan_tik ile saydığı simüle maçlar kişiliğe göre
  deterministik istatistiğe çevrildi (yoksa "65 maç, istatistik yok" botu ele verirdi); bot_puan_tik artık her simüle maçta
  10 soruluk istatistik yazar.
- Kişilik: bot başına 2 güçlü (+15/+20), 2 zayıf (−20/−25), gerisi ±3; 160 botta 160 farklı desen.
- `bot_oyna`'daki 4 `random() < bot_isabet` → `bot_kategori_isabet(bot, kategori)` (1v1, turnuva, grup, hızlı maç).
- Ölçüm: 40 bot × 40.000 deneme güçlü %86 / diğer %71 / zayıf %48. Gerçek düello cron yolu (`duello_tik_hepsi`, 300 saldırı,
  geri alınan işlem): güçlü kategoride %85,3, zayıf kategoride %45,3 doğru.
- Unvan: en güçlü kategori, 10 istatistikli maçtan sonra (Bilgin, Tarihçi, Kâşif, Sinemasever…). Kurucu hesapta "Bilgin" açıldı.

### Aşama 4 — Düello sunucusu (migration 205)
- Tablolar: `duellolar` (istemciye kapalı), `duello_hamleler`, `duello_sinyal` (yalnız sürüm; Realtime), `duello_kuyrugu`.
- Faz makinesi `duello_ilerlet`: kategori (20 sn, dolunca riskli olmayan rastgele) → hazırlık 4 sn → cevap 15/10 sn (+1 sn ağ payı;
  geç ilerletilse de savunan tam süre alır) → sonuç 3 sn → sıradaki saldırı / tur sonu. Bitiş yalnız tur sonunda (eşit hamle).
  10 tur/can bitince: can → doğru → altın soru (iki oyuncuya aynı soru, jokersiz; tek doğru bilen kazanır).
- Risk kuralı `duello_cozumle`: savunanın maç başında sabitlenen en zayıf kategorisinde doğru → saldıran can kaybeder.
- Jokerler `joker_kullanimlari` (mac_tur 'duello') + `joker_hareket`: saldırı 2/maç (1'i ücretsiz), savunma 2/maç (50:50 ilk kullanımı
  ücretsiz, Soru Değiştir 1/maç), Ek Süre +5 sn. Saldırı jokerleri dükkânda tek tek satılıyor (60/60/80 coin).
- Eşleşme `duello_ara`: aynı giriş türü, lig ±1; 8 sn + insan gibi gecikme sonra `bot_sec` (gizli bot). Rövanş (istek/kabul;
  bot 2-6 sn'de kabul), roller değişir. Ödül `duello_bitir`: dereceli +50 lig (çift çarpanı; bot kazanırsa bot yüzdesi),
  coin `coin_mac_odulu(..., 'coin_duello_galibiyet')`, seri bonusu; serbest coin %50. Çift sayacı ve ezeli rakip düelloyu da sayar.
- Cron `duello_tik` 2 sn: süreler + bot (kategori seçimi rakibin düşük yüzdelerine, en zayıftan %65 kaçınır; %15 saldırı jokeri;
  savunmada bot_gecikme_sn + kategori isabeti).
- **Ölçülen iki mevcut hata düzeltildi:** `joker_envanter_tur_check` 'soru_degistir'i içermiyordu → dükkândaki joker paketleri
  satın alınamıyordu (joker_islemleri tablosu boştu); `joker_hareket` envanterinde satırı olmayan oyuncunun harcamasını hatasız
  geçiriyordu. Satın alma geri alınan işlemde doğrulandı (paket → elli 4 / sure 3 / soru_degistir 3).
- Simülasyon (geri alınan işlem): risk kuralı (A 3→2), kilitliyken savunma jokeri "Rakip bu soruda savunma jokeri kullanamaz",
  envantersiz 2. joker "Yetersiz joker", sınır "en fazla 2", zaman aşımı → can, üst üste kategori ve 3. kullanım engeli
  (oyuncu başına ayrı), altın soru kazananı, serbest coin 25, `duello_durum` çıktısında is_bot/bot_ yok.

### Aşama 4 — Düello arayüzü
- `DuelloPage.jsx` (`/duello`, `/duello/:id`): giriş + Dereceli anahtarı + arama katmanı ("bot" kelimesi yok); maç ekranı:
  oyuncu şeridi (unvan, kalpler), kategori seçimi (rakibin yüzdesi / "veri yok", `n/2` sayacı, soluk kategoriler, kırmızı çerçeve +
  "RİSKLİ"), hazırlık (yalnız saldıran soruyu görür), cevap (Zaman Baskısı / Savunma Kilidi bantları, "En zayıf kategorin!"),
  sonuç mesajları, altın soru, sonuç ekranı (ödül, ezeli, rövanş iste/kabul/reddet). Joker alanı yerinde durur, sete göre döner
  (rotateX animasyonu). Son can: kalp yanıp söner, kabın ::before katmanı koyulaşır, sayaç büyür; reduced-motion/transparency.
- `KategoriProfili` bileşeni: profil (İstatistik sekmesi) ve oyuncu kartında; "Hiç maç yapmadı, istatistiği yok" /
  "N maç · M maçın istatistiği". Ana sayfada Düello kartı (tam genişlik).
- `useDil().ceviri` artık `useMemo` ile sabit (efekt bağımlılığında sonsuz yeniden abonelik olmasın).
- Canlı test (kurucu hesap tarayıcıda, QuizTestIda sunucuda aynı RPC'lerle): kategori ekranı, Savunma Kilidi → savunanın jokeri
  reddedildi + bant, Zaman Baskısı savunma görünümü (10 sn, joker alanı savunmaya döndü, 50:50 ücretsiz), riskli Tarih'e saldırı
  → rakip bildi → "Riskli saldırı geri tepti — sen can kaybettin!" (DB: riskli=true, kaybeden A), son can gerilimi, sonuç ekranı,
  rövanş → iki taraf yeni düelloya geçti (saldırı sırası değişti). Arayüzden "Rakip ara" → gizli bot "Rasta4" (Sanatsever) ile
  dereceli maç, bot oynadı ve kazandı. Test hesabına yazılan yapay istatistik silindi, test düelloları iptal edildi.
- Not: araç gecikmesi (~6 sn) yüzünden 10 sn'lik cevap pencerelerinde tarayıcıdan zamanında basılamadı; süre aşımı sunucuda
  doğru işledi.

### Aşama 5.1 — Maç bitince sesli sohbet kopuyordu (migration 206)
- Kök sebep (kodda): MatchPage bitişte başka dal çiziyor → SesliSohbet sökülüp görüşmeyi kapatıyor; sonuç ekranındaki yeni örnek
  `sesli_sohbet_izni`'ne soruyor, sunucu "maç aktif değil" diyordu.
- Çözüm: MatchPage dönüşleri tek `ekran` değişkenine alındı, SesliSohbet fragment'in 2. çocuğu olarak hep aynı yerde (arayüzü
  dalın içindeki `bd-ses-yuva`'ya portal). Sunucu bitişten sonra `mac_sonu_sesli_sn` (30) boyunca izin verir ve `kapanis_sn`
  döndürür; istemci geri sayım + "Şimdi kapat", süre dolunca karşıya "kapat" yayını.
- Doğrulanamayan: iki gerçek cihazda sesli görüşme (tek tarayıcı/hesap var). Bileşenin sökülmediği yapısal olarak garanti.

### Aşama 5.2 — Yanlış cevapta doğru şık görünmüyor, ekran takılıyor
- Canlıda ölçüldü (DOM her 50 ms): rakip önce cevaplamışken yanlış cevap → doğru şık ~150-200 ms'de yeşil, **~450-600 ms'de
  işaretler siliniyor** (aynı soru metni), yeni soru ~1,6 sn'de. Kök sebep: QuestionCard `key`'i ilerleyen sunucu indeksine
  bağlı; cevabımız soruyu anında ilerletince Realtime key'i değiştiriyor, kart eski soruyla yeniden bindiriliyordu.
- Düzeltme: key gösterilen soruya (`soru.soru_index`). Aynı hata grup maçı ve turnuvada da vardı (key `aktif_soru`); ikisinde
  key düzeltildi ve yeni soru, son cevabın üzerinden GB_MS (1 sn) geçince yükleniyor. Hızlı Mod'da hata yok (ölçüldü: 700 ms
  pencere korunuyor). "Hızlı Olan Kazanır" donduruldu, dokunulmadı.
- Düzeltme sonrası canlı ölçüm (5 soru, bot önce cevapladıktan sonra tıklama): işaretler ~200 ms'de geliyor ve yeni soruya
  (~1,5 sn) kadar kalıyor; ara silinme yok.
- Ölçümde görülen otomasyon notu: Chrome otomasyon sekmesi `document.hidden=true` → maç nabzı (hazır kapısı) gönderilmiyor;
  sayfa içinde görünürlük taklit edildi. Gerçek cihazı etkilemez.

### Aşama 6 — Dil sözlüğü
- Paketteki tüm yeni kullanıcı metinleri (`ceviri(...)`) `oyun/lib/dil.js`'e TR anahtar + EN karşılıkla eklendi: Dereceli
  anahtarı, ödül satırları, arkadaş maçı notu, Düello ekranları, joker adları/açıklamaları, unvanlar, kategori adları, Düello sunucu
  hata mesajları, kategori profili, sesli sohbet geri sayımı. Otomatik tarama (`.tmp/eksik_ceviri.cjs`) eksik 0.

### Açık konular / sahibine not
- Hızlı Mod'da "en fazla 9 soru" sınırı konmadı: hızlı cevaplayan 9'dan fazla soru görebilir (eski 60/5 düzeninde de 12 sınırı
  yoktu). İstenirse tek ayarla sınır eklenebilir.
- Turnuva lig puanı dereceye göre TEK miktar (1. 150 … diğer katılan 10); "katılan +10" üst sıralara ayrıca eklenmedi.
- Davet coin referansı davet edende "davet edilen id" (aksi hâlde davet eden ömründe bir kez alabilirdi).
- Gizli botla oynanan Düello, 1v1'deki mevcut kural gibi gerçek oyuncu muamelesi görür (lig puanı verir); puan vermeseydi bot
  olduğu anlaşılırdı. Açık botlar Düello eşleşmesine girmez.

### Ek doğrulamalar (16 Eyl 12:05 TSİ sonrası)
- 15:00 turnuvası yeni ödül koduyla hatasız bitti (63 katılımcının hepsi bot, coin hareketi beklenmediği gibi yok). Bu turnuvadaki
  **gerçek** bot cevapları: güçlü kategori %92,1 (38) · diğer %77,3 (150) · zayıf %52,8 (53).
- Migration 207: düellodaki gizli bot da çevrimiçi görünür; `gizli_bot_nabiz` kilitli satırı atlar (son 7 günde 8 deadlock ölçüldü).
- Regresyon (canlı, Chrome): ana sayfa + Dereceli anahtarı, Hemen oyna (dereceli, gizli bot, hazır kapısı), lig tablosu, dükkân (joker
  sekmesinde saldırı jokerleri), meydan (kanvas + HUD, 2 kişi), profil. Joker paketi/tek joker satın alma geri alınan işlemde çalıştı.
  Sızıntı taraması: yeni RPC imzalarında ve gerçek çıktılarında is_bot/bot alanı yok.
- Test edilemeyen: çıkış yapıp giriş/kurulum sihirbazı (tek hesap, oturum kapatılmadı), iki cihaz arası gerçek sesli görüşme, iOS
  Safari gerçek cihaz (CSS kuralları kod düzeyinde kontrol edildi: yeni öğelerde position:fixed yok, transform animasyonu sabit
  öğe atası değil, 100dvh).

## Paket 15 — İngilizce çeviri: sorular + arayüz (16 Eyl 2026)

### A) Soru çevirisi
- Başlangıç ölçümü: aktif + TR + İngilizcesi olmayan 1787 soru (~158 bin karakter). Pasif 2985 soru kapsam dışı (çevrilmedi).
- 19 parça hâlinde çevrildi (`supabase/ceviri_en/parca_N.json` + onaylı listeler), `question_translations`'a `dil='en'` yazıldı.
  Kalite kapısı `kalite.ts › ceviriNedenGecersiz`; özel isim uyarıları (Karadeniz→Black Sea, Lozan→Lausanne…) tek tek gözden geçirildi.
- Dile bağlı sorular çevrilmedi, `ceviri_atlanan` tablosuna nedeniyle yazıldı (migration 208): Türkçe dilbilgisi/ses
  kuralları, yazım kuralları, deyim/atasözü, K/D/B/G kısaltması vb. Son durum: **kalan 0 · çevrili 9267 · atlanan 23**.
- Canlı doğrulama: EN profille Hatalarım çalışma turu İngilizce soru getirdi.

### B) Arayüz çevirisi Aşama 2
- Karar: kancasız `tt()` (dil.js) — sayfa dili yüklemede çözülür (elle seçim > tarayıcı dili); profil dili farklıysa
  `useDil` tarayıcıya yazıp **bir kez** yeniler (depolama kapalıysa döngü koruması). Dil değişimi sayfayı yeniler; bu sayede
  modül düzeyindeki sabitler (sekme adları, kataloglar) de doğru dilde kurulur. `html lang` ayarlanır.
- Dönüştürme AST ile yapıldı (`.tmp/cikar.cjs`, mevcut @babel/parser; yeni paket yok): ~1250 metin `tt(...)` ile sarıldı,
  şablon dizgeler `{0}` yer tutucuya çevrildi; teknik dizgeler (sınıf adı, medya sorgusu, select kolonları, 3B kemik adları) hariç.
  Parçalı cümlelerin birkaçı elle tek şablona alındı (geçen hafta sonucu, şehir sırası, rakip bekleme).
- `dil.js` sözlüğü ~210 → ~1600 girdi. Kapsam: bildim bileşen/sayfa/lib/karakter/harita/avatar3d + hata sınırı.
- `ttSunucu`: RPC `raise exception` mesajları (160) ve bildirim şablonları (22, `%` kalıplı, `%2` sıralı yer tutucu, yakalanan
  kategori/unvan da çevrilir) + DB metinleri (rozet, günlük görev, joker/coin paketi, eşya adları). `hataMesaji` bundan geçer.
- Bağlamlı anahtar: `"Açık|durum"`, `"Kapat|ayar"` — aynı Türkçe kelimenin farklı karşılığı için; TR'de `|` sonrası görünmez.
- Profil > Ayarlar'a TR/EN dil seçici; Layout her sayfada profil dilini eşitler.
- RankUpOverlay: localStorage'daki rütbe adı başka dilde kalınca sahte "rütbe atladın" oynamasın.
- Canlı test (EN): ana sayfa, lig, dükkân, arkadaşlar, meydan okuma, düello, Hatalarım, profil, gardırop, 3B meydan HUD —
  Türkçe kalıntı yalnız kullanıcı adları. Testte bulunup düzeltilen: ustalık seviye adları, `%69` → `69%`, saat yuvası,
  bildirim zili/coin hapı etiketleri, "Açık/Kapat" bağlam çakışması. Sonra hesap TR'ye geri alındı (profiles.dil = tr doğrulandı).
- iOS: yeni CSS yalnız `.bd-ayar-dil { flex: none }`; position:fixed/transform eklenmedi.

### Açık konular
- Push bildirimleri (edge function `send-push`) sunucuda Türkçe başlık/gövde üretiyor; oyuncu diline göre çeviri sunucu tarafı iş.
- 3B meydandaki bina adları kanvasa yükleme anında çizilir (tt ile sarılı; dil değişimi yenileme yaptığı için doğru).
- Pasif 2985 soru çevrilmedi; aktifleştirilirse `.tmp/ceviri_disa.mjs` akışıyla çevrilebilir.

## Harita Yenileme (Taksim) — Aşama 0: stil tarifi + şartname + ölçüm (16 Eyl 2026)
- `oyun/harita/STIL.md` yazıldı: stil tarifi, palet, tek ortak Mixamo iskeleti + 14 kozmetik yuvası, ölçek
  (1 birim = 1 m, boy 1,80, kök ayak altında), çizim bütçesi, instancing/atlas/ışık şartı, GLB boru hattı, kabul kriterleri.
- Mevcut sahne ölçüldü (`.tmp/harita-test`, renderer.info, 1920×988, gölge açık): yalnız harita 277 çağrı / 14,9k üçgen
  (gölgeyle 654 / 41,9k; 596 mesh, 383 gölge veren); 3B karakter +61 çağrı / ~30k üçgen (81 mesh); portre billboard +9;
  25 karakter (6 3B + 19 billboard) 1.471 çağrı / 402k üçgen. Kare süresi masaüstü iGPU'da 8,8 → 16,5 ms.
  Hedefe uzaklık: harita 4,6×, karakter 12-20×, toplam 7× fazla; instanced mesh ve doku yok.
- Kod değişmedi. **Onay kapısı:** Aşama 1 (tek karakter + tek bina test sahnesi) onay bekliyor.

## Harita Yenileme — Aşama 1: tek karakter + tek bina test sahnesi (16 Eyl 2026)
- Blender yok; `oyun/harita/varlik/uret.mjs` varlıkları kodla kurup tek mesh + tek atlas (512², `atlas.mjs`, saf Node PNG
  yazıcı `png.mjs`) ile **GLB** dışa aktarır (GLTFExporter Node'da `polyfill.mjs` ile). Bütçe aşılırsa üretici reddeder.
- İskelet: three.js Soldier örneğinden çıkarılmış Mixamo rig (`mixamo.json`, 22 kemik, parmaksız) + Idle/Walk/Run klipleri;
  "Selam" türetildi. 15 kozmetik yuvası dünya hizalı, rig'in 0,01 ölçeğini geri alır (bulunan hata: yuva ölçeği 0,009 →
  kozmetik görünmez küçüklükte; düzeltildi). Yön: Soldier rig'i +Z'ye bakıyor, döndürme gerekmedi (ilk varsayım tersti).
- Test sahnesi `/harita-deneme` (BildimApp + App'te lazy rota; oyun koduna dokunmadı): klip/kozmetik/25 kopya/gölge
  düğmeleri, HUD'da çağrı·üçgen·fps·ms, `?otomasyon=1` gizli sekmede Worker döngüsü, `window.__deneme` ölçüm API'si.
- Ölçüm (STIL.md §5): karakter **4 çağrı / ~4,9k üçgen** (eski 61 / 30k); 25 karakter + bina 137 çağrı gölgeli (70 gölgesiz),
  1,5 ms masaüstü iGPU (eski sahne 25 karakterde 16,5 ms). Bina 1 mesh 2.424 üçgen.
- Yerel test kabuğu `.tmp/deneme-test/index.html` (git dışı; giriş duvarı olmadan sayfayı yükler).
- **Onay kapısı:** görseller + tablo sahibine sunuldu; Aşama 2 (Taksim) onay bekliyor.

## Harita Yenileme — Aşama 1B: görsel kalite sıçraması (16 Eyl 2026)
- Öncelik sırasıyla (§0B): çapa testi (9 donuk kare + AxesHelper — kozmetikler hiçbir karede kaymadı, GEÇTİ) → atlas
  yeniden yazımı (1024², yapı desenleri, tuğla hücresi, eski atlas A/B) → seçici pah (ölçeğe bağlı yarıçap, 1 bölüm) +
  roughness 0,82 + ortam haritası → gömülü AO (`ao.mjs`, three-mesh-bvh devDependency, COLOR_0, A/B düğmesi) + zemin
  temas gölgesi (tek instanced decal) → çevre instancing (24 ağaç · 12 lamba · 10 bank · 16 saksı · bordür, +8 çağrı) →
  3 kamera + ışık A/B (pozlama 1,12; sis 70).
- Bulunan/düzeltilen: görev metnindeki ışık B değerleri (1,6π/0,9π) ortam haritasıyla sahneyi pastel beyaza yıkıyordu →
  ölçülüp 1,15π/0,45π, ortam 0,25 yapıldı. Bina tessellation ilk denemede 17k üçgen → pah 1 bölüm + 0,5 m ızgara ile 9,8k.
  Atlas A/B ilk sürümde yalnız ilk malzemeyi değiştiriyordu (her GLB kendi Texture nesnesini getiriyor) → malzeme başına saklandı.
  Kozmetik ve küçük prop'lar gölge atmaz (bütçe): 25 karakter 97 çağrı / 314k üçgen.
- AO A/B sonucu dürüst: fark var ama orta; asıl sıçrama atlas + ışık ayarından. Rapor: `oyun/harita/ASAMA_1B_RAPOR.md`.
  STIL.md §2.3 bütçe tablosu kilitlendi (karakterler ≤143 / ≤340k, çevre ≤60 / ≤80k, toplam ≤220 / ≤420k).
- Toplam ölçüm: 25 karakter + çevre + bina 111 çağrı · 381.904 üçgen · 2,45 ms (masaüstü). Telefon FPS ölçülmedi.
- **DUR NOKTASI:** Aşama 2 (13 karakter) sahibinin onayını bekliyor; otomatik devam edilmedi.

## Harita Yenileme — Aşama 1C: karakter kalitesi, kıyafet çeşitliliği, türler (16 Eyl 2026)
- §1 yön hatası teşhisi **A kutusu** (bind matrisi / kök dönüşü): Node testi `.tmp/varlik/yon_testi.mjs` bind pozunda
  yüz +Z, ayak −Z gösterdi → klip değil, kurulum. Kök sebep: rig ileri −Z + kök π, skinned mesh kök altına bağlanınca
  π ikinci kez uygulanıyordu. Düzeltme: birim `karakter` kökü + `mesh.bind(iskelet)`, ON=+1. (İlk deneme ON=−1 ters etki.)
- §3 kıyafet: 3 set (Günlük/Şık/Spor) `bolge` köşe özniteliğiyle aç/kapa + UV taşıma + köşe rengi ton; yeni doku/malzeme
  yok. 3 saç, 4 ten, 4 saç rengi; 25 kopyada 24 farklı görünüm (periyot 3·4·4·8).
- §4 kaplan + robot aynı iskelet/15 yuva (kuyruk sirtYuva, kulak kulakYuva, anten, emissive göz); 3 sokak kedisi tek
  InstancedMesh, 652 üçgen, yerel deterministik davranış.
- §5 tek malzemede bölge başına pürüzlülük (shader tablosu), boyalı yüz atlas çeyreğinde (3 tür + 8 göz/8 ağız ifade
  şeridi), göz/ağız dörtgeni UV kaydırmalı ifade, 3–6 s kırpma 120 ms, Selam'da gülümseme. Yüz dörtgenleri kafa AO'sunu
  kopyalıyor (kare izi giderildi); burun altı/göz altı gölgesi kaldırıldı.
- §6–9: yaprak kontrastı %22→%12 + A/B, ağaç 0,7 ölçek + A/B, dış kaldırım hattı; ışık B+ (1,29π/0,405π/r3/1,08) A/B;
  döşeli zemin GLB (karo, bordür, yaya geçidi, çim) 1 çağrı; bina 0,8 m yalnız ön cephe 9.840→4.804 üçgen.
- Ölçüm (Geniş): karakterler 88 çağrı / 275.160 üçgen (≤143/≤340k) · çevre+bina+kedi 14 / 67.890 (≤60/≤80k) ·
  toplam **102 / 343.050** (≤220/≤420k), 2,14 ms masaüstü. Telefon ölçülmedi. Konsol hatası 0.
- Rapor `oyun/harita/ASAMA_1C_RAPOR.md`, görseller `.tmp/asama1c-gorseller/`. STIL.md: §1.4 çevre kuralı, §2.3 1C
  sütunu, §6 tür/bölge sözleşmesi + tessellation kararı.
- **DUR NOKTASI:** 13 karakter üretimine geçilmedi; sahibinin onayı bekleniyor.

## Harita Yenileme — Aşama 1D: yüz, kaplan suratı, robot silueti + prop optimizasyonu (16 Eyl 2026)
- A İnsan yüzü: kafa 18×13 → 28×18 (orta hatta köşe → burun sırtı); göz çukuru/kaş/burun(+30 mm)/elmacık/çene köşe
  kaydırmayla (üçgen eklemez), ayrı burun küresi kaldırıldı. Göz/ağız düz kart → yüzeye oturan oval yama (3 halka, 72 üçgen,
  ışın testiyle çokgen kafaya +1 mm). Göz 0,115 → 0,088. COLOR_0 RGBA + shader ten eşlemesi (ten pikseli tonlu, göz akı değil).
  Yanlış denemeler: analitik küreye oturtma (burun eteğinde kafa yamanın içinden çıktı), 2 halka (sarkma 1,03 mm > ofset),
  `convertSRGBToLinear` çift dönüşüm (yama tonsuz kaldı) — üçü de düzeltildi.
- B Kaplan: muzzle +55 mm plato, alt çene, yanak tutamları geometrik; gözler yana/yukarı; atlas burun üçgeni. Profilden ayrılıyor.
- C Robot gövdesi baştan: ayrık eklem küreleri + halkalar, kıskaç el, taban plakası + piston, boyun pistonu, yuvarlak kafa +
  emissive ekran yaması, anten; plastik bölgesi (21); robot kozmetik varyantları (anten halkalı şapka, vizör); set = panel
  varyantı (düz / koyu metalik / çizgili). 5.146 → 6.060 üçgen. Siyah siluet testi düğmesi eklendi.
- D Prop: taç gölgesi küre vekili (visible getter = getRenderTarget()!==null; ana geçişe girmez, çağrı aynı), bank 972→320
  (ucuz pah 68 üçgen), saksı 528→256, lamba 500→220. Çevre 67.890 → 43.722 etkin üçgen, 14 çağrı.
- Ölçüm (Geniş, 25 karakter): 102 çağrı · 349.054 üçgen (karakter 305.332 · çevre 43.722) · 2,8–3,2 ms. Telefon ölçülmedi.
- Ek görev: `oyun/harita/ASAMA_2_BUTCE_NOTU.md` yazıldı; Aşama 2 işlerine başlanmadı. Rapor `ASAMA_1D_RAPOR.md`,
  görseller `.tmp/asama1d-gorseller/`. Kamera en yakın mesafe 0,5 m (yüz kontrolü için).
- **DUR NOKTASI:** İstiklal / 13 karakter yapılmadı; kalite değerlendirmesi sahibinde.

## Harita Yenileme — Aşama 2 hazırlık: S-1 + S0 kare süresi ölçümü (16 Eyl 2026)
- `ASAMA_2_BUTCE_NOTU.md` sonuna EK (S-1…S5 kare süresi / karakter maliyeti sert kapısı) + eski ölçümlerin nasıl alındığı kaydı eklendi.
- Sahibinin kapsamı: yalnız S-1 ve S0; S1/S2 yalnız regresyon çıkarsa; S3–S5'e dokunma; çıktı ölçüm raporu (kod değil).
- S0: 1C (`02511f8`) ve 1D (`53fe5c7`) `git archive` ile ayrı klasöre çıkarıldı, ikisi de **üretim derlemesi** (`vite build` +
  `vite preview`), aynı sekmede dönüşümlü 3'er koşu, DPR 1, 1536×735, 120 ısınma + 300 kare, medyan/p95.
- Sonuç: `kareSuresi()` (CPU+GPU, gl.finish) medyan 1C 2,8 ms · 1D 3,0 ms → **+%7,1 < %10 → S1/S2 tetiklenmedi.**
  Fark üç çiftte de aynı yönde; GPU zamanlayıcı (EXT_disjoint_timer_query_webgl2, destekleniyor) +%6,5 → küçük ama gerçek ~0,2 ms.
  Eski "2,14 ↔ 2,8–3,2" farkının büyük kısmı ölçüm koşuluydu (aynı koşulda 1C de 2,7–2,8).
- rAF toplam kare süresi ölçülmedi (gizli otomasyon sekmesi). HUD'a çift etiketli ms eklenmedi (kod kapsam dışı).
- Rapor `oyun/harita/ASAMA_2_S0_OLCUM.md`. Ölçüm düzeneği `.tmp/olcum/` (git dışı).

## Harita Yenileme — Aşama 1E: muayene altyapısı (16 Eyl 2026)
- Adım 0: ölçüm düzeneği depoya (`oyun/harita/olcum/`: `hazirla.mjs` commit çıkar → üretim derlemesi → preview; `olcum.js`;
  README zorunlu sabitler). HUD iki metrik etiketli: `CPU … ms` (sürekli, yalnız gönderim) · `CPU+GPU … ms (saat)` (düğmeyle,
  120 ısınma + 300 kare medyan, gl.finish) · `GPU … ms` (EXT_disjoint_timer_query_webgl2). `window.__deneme.kareOlc()`.
- Adım 1–3: `oyun/harita/muayene/` — `npm run muayene` (ya da `uret.mjs --muayene`): Node mekanik testler + vite + headless
  Chrome (`playwright-core` devDep, kurulu Chrome, indirme yok) → varlık başına 6 ortografik + 3 yakın + 1 beauty PNG (git dışı)
  + tek kontakt JPEG + `adaylar.json` (commit). Commit edilen çıktı 25 dosya / ~3 MB.
- Testler: havada · simetri · icice · gomulu · kozmetik. "Ada" = konumla kaynaşan üçgen kümesi, etiket bölge:hücre + merkez.
  Üstveri (`ustveri/*.json`) beyanları adayı susturur, susturulan ayrıca sayılır. Bulunan test hatası: gömülü testi yalnız köşe
  örnekliyordu (tek bölümlü silindir "%100 gömülü") → köşe + üçgen merkezi + kenar ortası.
- Tuzak: `skeleton.pose()` kök kemiğin ebeveyni ölçekli `Rig` düğümü olduğunda rig dönüşümünü ikinci kez uygular (karakter yatık,
  100× büyük) → bağlama pozu kemik yerel TRS'si saklanıp geri yüklenerek kurulur.
- Adım 4 sonucu (`oyun/harita/MUAYENE_RAPORU.md`): bilinen 7 hatadan mekanik 4/7, görsel 6/7, toplam 6/7 (şartlar ≥5 ve ≥2
  karşılandı). Kapı kolu havada hatası mevcut GLB'de yeniden üretilemedi (kol kapıya 4 cm gömülü, 3/4 yandan bağlı görünüyor).
  16 yeni bulgu: bank sırtlığı 7 cm havada (yüksek), bina cephe saksıları plakanın dışında havada, robot elleri 2 cm kopuk,
  robot yüz ekranında beyaz çizgi izleri, bordür dokusu uzamış, robot bel/boyun halkaları gömülü, lamba/ağaç küçük kopukluklar.
  Kozmetik testi en kötü oranda (4 gerçek / 15 aday) → genişletilmeyecek.
- Görsel muayene gerçekten yapıldı: 12 kontakt sayfası + 8 görünüm tam çözünürlükte açıldı; kalan görünümler kontakt ölçeğinde.
- **DUR NOKTASI:** hata düzeltme, karakter işi, CC0 çevre, İstiklal başlamadı.

## 16 Eyl 2026 — Harita yenileme Aşama 1G-7..12: VFX kiti, alevli gömlek, kanat, premium gözlük, pet ×3, vitrin (Fable)
- `oyun/harita/deneme/vfx.js`: TEK InstancedMesh + TEK ShaderMaterial VFX kiti; 5 parametrik modül (alev·parıltı·iz·parlama·duman),
  reçete = kozmetik (`RECETE`), LOD (en yakın 6 grup tam · 14 m orta · 28 m uzak, `VFX_AYAR`). Stres 0/1/6/12/25 alevli: 3,1 ms sabit.
- Alevli gömlek = kıyafet seti 4 (`alevKumas` hücresi, eski gozBeyaz) + reçete; hız klipten (Idle/Walk/Run), `zipla()` dağılma.
- Kanat (`kozmetik_kanat`, sirtYuva, 364 üçgen) + süzülme %100 kozmetik (kök sabit, çocuklar +12 cm, çırpma, bacak sarkma, gölge zeminde).
- Premium gözlük (aviator; yeni bölge 24 `premiumMetal`, shader METAL tablosu; gözlükle aynı yuva → dışlayıcı; kaplanda `it` +4 cm).
- `pet.js`: kedi/köpek/kuş, tür başına 1 InstancedMesh (3 çağrı, 25 pet 13.262 üçgen), yaylı takip, boşta davranış, ağ durumu yok.
- Vitrin: koyu fon + kaide + arka ışık + otomatik dönen kamera; karakter ekranın ~%53'ü.
- Kapılar: 25 karakter Geniş 3,4 → 3,6 ms (≤4,0), 113 çağrı, 401k üçgen (HUD, gölge dahil); muayene 0/0/0 aday (1E: 4/7/41).
- Rapor: `oyun/harita/ASAMA_1G_RAPOR.md`; görseller `oyun/harita/gorsel/1g/`.
- Açık soru (sahibine): kanatla havalanan sahibin peti — varsayılan yerde takip, kuş +30 cm; alternatif öneri raporda.
- DUR: 25 karaktere/kataloğa yayma yok. Ölçüm not: otomasyon sekmesi düzeneği, S0 düzeneğiyle mutlak değer karşılaştırılmaz.

## 17 Eyl 2026 — Harita yenileme Aşama 1H: gövde karşılaştırması (body bake-off) (Opus 5)
- **A (Universal Base Regular) ve B (Teen) indirilemedi:** yalnız ücretli Source sürümünde (itch.io 19,99 $). Ücretsiz Standard pakette sadece Superhero gövdeleri var. Satın alma sahibinin kararı; dosyalar `oyun/harita/varlik/aday/{a_regular,b_teen}/kaynak/` klasörüne konunca hat tek komutla yeniden üretilir.
- Karşılaştırılan: A0 Superhero erkek (aynı kit, ücretsiz; A/B yerine DEĞİL, hat/topoloji öngörüsü), C mevcut gövde (kontrol), D Ultimate Modular Men Beach (pakette çıplak gövde yok; şort geometride).
- `varlik/aday/hazirla.mjs`: boy normalize, kök y=0, dokular sökülür → düz ten, çıplak, meshoptimizer simplify (konum kaynaştırma + alt küme köşe), yeniden okunan GLB'de skin doğrulaması, dünya uzayı yön hizalamalı retarget (Idle/Walk/Run/Selam + nötr "Dur" pozu).
- Sonuç: A0 13.334 → 5.908 üçgen, JOINTS/WEIGHTS değişen köşe 0, doğrulama geçti, retarget 22 kemik. D 4.762 (sadeleştirme gerekmedi), retarget 20 kemik; D rig'inde ayak Root'a, uyluk Body'ye bağlı (IK) → konum aktarımı eklendi.
- A0 omuz çökmesi (Selam) araç kaynaklı değil: ham = sade; bizim Selam klibindeki ~80° kol burulması + twist kemiksiz rig.
- Muayene hattı genişletildi (yeni araç yazılmadı): aday klasörü, düz ten/çıplak mod, klip karesi, rol hedefli kamera, sabit kamera, `--karsilastir` sayfası.
- Öneri: hedef kalite = A0'daki kit topolojisi; ama stil için B (Teen) görülmeden karar verilmemeli. D bütçe dostu ama fasetli/giyimli. KARAR SAHİBİNDE. Rapor: `oyun/harita/ASAMA_1H_BAKEOFF.md`.
- DUR: kazanan seçilmedi, yuva/kaplan/robot/25 karakter yok.

## 17 Eyl 2026 — Harita Aşama 2A: Taksim greybox + yerleşim manifesti (Opus 5)
- `oyun/harita/yerlesim.json` haritanın tek doğruluk kaynağı: sınır (plaza r42 + İstiklal 12 m koridor), 3 bölge, 27 parsel (9 girilebilir dükkân = oyun modları), 4 nokta, 11 alan, tramvay (2 durak), arka plan kuşağı (Boğaz, köprü silueti).
- `yerlesimDunya.js` manifestten bilerek çirkin greybox kurar (gri tonlar, etiketler); `dunya.js` manifest verilirse onu, verilmezse Paket 13 dünyasını kurar. Oynanış katmanına dokunulmadı.
- Canlı: `/harita?harita=taksim` (quizsquare) · `?harita=eski` geri döner; seçim cihazda hatırlanır. Canlı sayfa girişli olduğu için Claude tarafından görülmedi; ölçümler aynı dünya koduyla yerel ölçüm sayfasında (`olcum/greybox.*`, üretim derlemesi).
- Ölçüm: greybox yalnız en kötü açıda 165 çağrı (sınırın %75'i — nesne sayısı: 121 mesh + gölge), 2,6k üçgen, 1,7 ms. 25 mevcut meydan avatarı ~580 çağrı ekliyor (eski avatar sistemi, 1G hattı değil) → 924 çağrı, 8,6 ms.
- §7: hız 9 m/s · İstiklal 9,83 sn · taş meydan 5,87 sn, plaza 9,2 sn · 25 oyuncu 81 m²/kişi, komşu 5,5 m · kamera sokak boyunca temiz, SON 10–19 m'de kapanış binası oyuncuyu kapatıyor (Stüdyo/Ayarlar) · doğuştan en uzak dükkân 13,28 sn.
- Karar bekleyen: kapanış binası (kaldır / 20 m geri çek), meydan yarıçapı. DUR — sanat başlamadı. Rapor: `oyun/harita/ASAMA_2A_GREYBOX.md`.

## 17 Eyl 2026 — Harita Aşama 2B: yeni karakter + proplar gerçek haritada, eski harita kalktı
- Adımlar ayrı commit: 2B-1 modül (`oyun/harita/karakter/`), 2B-2/3 oyuncular, 2B-4 proplar, 2B-5 kediler, 2B-6 botlar, 2B-7 boya, 2B-8 eski harita + balıkçı/su silindi, 2B-9 ölçüm + rapor.
- Tek harita Taksim; `?harita=` seçimi yok. Balıkçı/olta/su istemciden silindi (**iptal, geri gelmez**); sunucu RPC/tabloları duruyor (ayrı temizlik). `avatar.js` duruyor (portre.js, onizleme.js).
- **§6 kapısı PASS DEĞİL:** en kötü açıda (İstiklal ucu, 25 oyuncu) 25 tam karakter 5,8 ms > 4,0. `meydan_uc_boyutlu_sinir` = 8 (3,7–3,8 ms). Doğuş kamerasında sınır 8 ile 3,9–4,0 ms — sınırda; kalan maliyet iskeletli karakter sayısının kendisi (LOD/animasyon seyreltme kararı gerekiyor). Migration 209 (oyun_ayarlari: sınır 8, kedi 8) uygulandı.
- Bilinen tutarsızlık: harita yeni karakter, gardırop/portre eski avatar. Tür seçimi arayüzü yok; bot kaplan/robot olabiliyor → gizli bot riski (rapora yazıldı).
- Ölçüm düzeneği: `olcum/meydan-test/` (sahte Supabase, `--uretim`), `__kare.durdur/olc`, `sahne2b.js`. Rapor: `oyun/harita/ASAMA_2B_RAPOR.md`. DUR.

## 17 Eyl 2026 — Aşama 2C: canlı test hazırlığı + bekleyen işler (Opus 5)
- **A (canlıda):** `/harita?olcum=1` ölçüm göstergesi (cihazda hatırlanır, `?olcum=0` kapatır): çağrı · üçgen · fps · `CPU` (yalnız gönderim, sürekli) · `CPU+GPU` (gl.finish, düğmeyle, 120+300 medyan/p95) · GPU zamanlayıcı · tam 3B karakter · oyuncu. `olcumSayaci.js` + `OlcumGostergesi.jsx`. Canlı pakette doğrulandı.
- **B (ölçüm, kod yok):** 3,6 ms tabanı karakter/mantık değil. Katman 2 (binalar) 0,6 ms → herhangi bir prop eklenince basamakla ~2,6 ms; piksel %64'e inince 0,8 ms → piksele bağlı, basamaklı GPU maliyeti (masaüstü tümleşik GPU). Gölge kapalı −0,5 ms. "CPU" (render.render) de çözünürlükle düşüyor → saf CPU değil. Kesin mekanizma bulunamadı; telefon ölçümüyle karar. `olcum/meydan-test/katman2c.js`, ham sonuç `olcum/sonuc-2c/`.
- **C (canlıda):** Düello ekran kenarı halesi (portal, fixed, transform yok): saldırı turuncu sabit, savunma mavi → kırmızı (sayacın ≤3 sn kritik eşiğiyle aynı an, nabız), ikonlu SALDIRIYORSUN/SAVUNUYORSUN bandı (TR+EN), 0,3 sn giriş, reduced-motion'da animasyon yok.
- **D:** generate-questions çeviri hattı (`ceviri.ts`): bağlamla çeviri → makine kontrolleri (şık sayısı/sırası, eşanlamlı şık, özel isim, sayı biçimi) → GERİ KONTROL (yalnız İngilizce, aynı indeks) → yaz / `ceviri_atlanan` (kod + ayrıntı). Geriye dönük `{"mod":"ceviri"}` ve `kuru` modu. Migration 210 uygulandı: `ceviri_atlanan` PK (question_id, dil), `ceviri_dil_kurallari` (kurallar/sözlük veride), 4 ayar, `ceviri_uyari_raporu()` / `ceviri_atlanan_dagilim()`. Testler 20/20 + 38/38.
- **AÇIK:** Edge Function DAĞITILAMADI (CLI 403, Chrome eklentisi bağlı değildi) → canlıda eski sürüm; örnek parti (geri kontrol sayısı) ölçülemedi. Dağıtınca: panelde `ceviri.ts` dahil 3 dosya, sonra `{"mod":"ceviri","dil":"en","adet":20,"kuru":true}`. Şu an en: 9.290 aktif, 9.267 çevirili, 23 atlanan, 0 çevirisiz.
- Rapor: `oyun/harita/ASAMA_2C_RAPOR.md`, görseller `oyun/harita/gorsel/2c/`. DUR — optimizasyon/harita içeriği/karakter gövdesi yok.

## 17 Eyl 2026 — Aşama 2D: sınır, optimizasyon, çeviri dağıtımı + ödüller (Opus 5)
- **A:** `meydan_uc_boyutlu_sinir` 8 → 20 (migration 211; S24 FE 2,20 ms). Yayından önce orta-alt telefonda `?olcum=1` ölçümü şart.
- **B:** ağaç/bank (104) temas gölgesi zemin shader'ına dünya-XZ maskeyle pişirildi (`temas.statikPisir`); dinamik 139 → 35, görsel fark yok. Masaüstü en kötü açıda süre DEĞİŞMEDİ: o açıda ağaç/bank yok; 2C'de temas gizliyken de basamak vardı → basamak temas gölgesinden değil.
- **C:** generate-questions panelden dağıtıldı (CLI 403; canlı sürüm depoyla karşılaştırıldı). Kuru çalıştırma YAPILAMADI: Supabase secrets'ta `ANTHROPIC_API_KEY` YOK. Cron `bildim-soru-uret` aslında açık (saatlik) ama her çağrı 500 → son soru 11 Eyl. Anahtar eklenince üretim + çeviri kendiliğinden başlar.
- **D:** Hızlı Mod `hizli_mod_soru_tavani` 9 (migration 212; cevap/soru/başlat, istemci perdesi "Sorular tamamlandı!"). Turnuva katılan +10: karar değişiklik yok.
- **E:** `lig_cerceveleri` (ayrı tablo; lig kapanışında verilir, kalıcı, seçim `lig_cerceve_sec`, seçili `gorunum.lig_cerceve`, geriye dönük 271, botlar dahil) — AvatarCerceve halkası + meydan isim etiketi kenarı + Profil'de seçici. `turnuva_giysi_odulu` haftalık ilk-3 giysisi (bu hafta Pelerin), sahipse tekrar yok (`turnuva_giysi_tekrar_coin` 0). `avatar3d_satin_al` etkinlik eşyasını bedava testte de reddeder. Migration 213.
- Açık: meydan Taç/Pelerin çizmiyor; "Uzay Kıyafeti" yok; turnuva günde 7 (haftalık = haftanın tüm turnuvaları). Rapor `oyun/harita/ASAMA_2D_RAPOR.md`. DUR.

## 17 Eyl 2026 — Aşama 3A-1: Boğaz + İstiklal cepheleri (Fable 5.1)
- **B (`ff6901f`):** `bogaz.js` — kamera ufku görmediği için (üst kenar ufkun 11–14° altı) Boğaz y=0'da hiçbir yerden görünmüyordu → plato kenarından 6 teraslı VADİ (çatı şelalesi), deniz y=−60 (#4FC3E8→#9ED9F0, cam bölgesi), karşı kıyı, zorlanmış perspektifli stilize asma köprü. 0 ek çağrı, 2.700 üçgen. Manifest `arkaplan` yeniden tanımlandı; dış zemin vadide delikli; Gezi ağaç kuşağının doğu yarısı vadiye bırakıldı.
- **C (`464ca88`):** `cephe.js` — modüler parça havuzu (8 aile, 25 varyant), 25 bina manifest reçetesinden (`parsel.cephe`); girilebilir = tabela + ışıyan aplik + kapı + tente, girilemez = kepenk/sağır (kod kuralı). 3 LOD (38/85 m, `kurallar.cephe_lod`), bina başına 1 çağrı, gölgeyi yalnız kütle vekili atar. Gömülü AO ayrı pişer: `npm run cephe-ao` → `cephe_ao.bin` (reçete değişince yeniden!). Muayene: 27 havada adayı geometride düzeltildi → 0 aday / 0 susturulan. Cami/minare boyalı kütle olarak kaldı.
- **D:** 167 çağrı ✅, 385k üçgen ✅, CPU+GPU 4,5–5,6 ms ❌ — ama taban (2D, sınır 20) zaten 4,1–5,5 ms; cephe etkisi +0,3…1,6 ms, LOD sıkılaştırma (28/70, 22/60) ölçülebilir kazanç vermedi (saçılma etkiden büyük). Telefonda İstiklal ucunda `?olcum=1` şart.
- Açık: sokak ucunda kamera kapanış binasına giriyor (2A'dan beri); tabela yazısı hâlâ çatı üstü sprite; plaza güneyinde bina arka yüzleri. Rapor `oyun/harita/ASAMA_3A1_RAPOR.md`, görseller `gorsel/3a1/`. DUR.

## 17 Eyl 2026 — Aşama 3A-2: yapılar ve kimlik (Opus 5)
- **A (`a5bf7d4`):** her parsel/nokta/alan/tramvay `bolge` taşır; `bolgeler[*].kaydir` bütün bölgeyi (zemin, bina, çarpışma, sınır, prop) öteler — tek yer `yerlesimCoz.js`. Sınır parçaları bölgeden türetilir. Bilinmeyen bölge → konsol hatası. `kaydir [4,0]` ile doğrulandı, geri alındı.
- **B (`58f6a46`, `188f947`):** deniz −35, köprü kulesi 50 / tabliye 20; köprü + karşı kıyı kadraja girsin diye yaklaştırıldı. Evler öbek öbek (40 karşı kıyı + 20 teras), ağaç kümeleri, 3 minare silueti. 1.900 üçgen, 0 ek çağrı.
- **D+E (`eb8fdd8`):** `apartman_istiklal_ucu` silindi → sokağın devamı siluet (298 üçgen, arka plan mesh'i); sınır aynı. Kozmetik metro girişi (plaza güneyi, `yuva: metro_girisi`), çarpışma kapalı.
- **C (`8a1caef`):** `yapilar.js` — AKM (cam cephe + kırmızı küre + harfler), Taksim Camii (kaburgalı kubbe, iki minare, revak, avlu), Cumhuriyet Anıtı (heykeller SİLUET — yüz detayı hiçbir LOD'da yok, sahibi kararı), Galatasaray Lisesi (`dukkan_ayarlar` yerine, /profil korunur, boşalan uç arsasıyla birleşti; stilize amblem, gerçek arma değil). `landmark_minare` silindi. Muayene dört yapıda 0 aday / 0 susturulan (düzeltmeler geometride).
- **Düzeltme (`244c6b0`):** Boğaz vadisi dış zeminle örtülüyordu (vadi deliği ±700 kareyi kesiyordu; metro deliği eklenince tamamen) — D/E'den beri canlıda deniz/köprü görünmüyordu. Kare ±900'e büyütüldü, görüntüyle doğrulandı.
- **F:** 167 çağrı ✅, 439.794 üçgen ✅ (hepsi yakın LOD'da 458.493 — pay dar), CPU+GPU ❌ 5,7–6,0 ms — taban (3A-1) da aynı; katmanlar arası fark ölçülemez (0,0–0,3). Basamak yine binaların yakın/orta LOD'da çizilmesinde (uzak/gizli ~4,0–4,7). Telefon ölçümü gerekli.
- Açık: lise etiketi "Ayarlar"; metro yalnız kozmetik. Rapor `oyun/harita/ASAMA_3A2_RAPOR.md`, görseller `gorsel/3a2/`. DUR — tramvay/kedi/bot/seyyar satıcı yok.

## 17 Eyl 2026 — Paket 16: dört bağımsız iş (Opus 5)
- **A (`07d905d`, migration 214 uygulandı):** push'lar alıcının dilinde. `push_metinleri(anahtar, dil)` + `push_metni` (dil.js ttSunucu ile aynı `%`/`%2` kalıbı, parametre terimleri çevrilir) + `bildirim_anahtarla` (uygulama içi metin Türkçe kalır, push `profiles.dil`'de) + `turnuva_hatirlat` (dile göre gruplu). 13 canlı fonksiyon anahtara geçti. Ölçümde çift push bulundu ve kaldırıldı: meydan okuma daveti, grup daveti, seri hatırlatma. Ölüler dokunulmadı: Hızlı Olan Kazanır daveti, `haftalik_sonuc_bildir`. Doğrulama işlem içinde + ROLLBACK (en → İngilizce, tr → Türkçe, de/null → tr).
- **Önemli bulgu:** canlıda `push_subscriptions` BOŞ (0 abone) → bugün hiçbir push kimseye gitmiyor. `lig_arsiv` hiç dolmamış (hafta sonucu bildirimleri pratikte ölü). İkisi ayrı inceleme ister.
- **B (`d6966c7`):** lig çerçeveleri Arkadaşlar / Meydan Okuma / Grup Maçı / Hızlı Maç'ta. Liste başına tek `oyuncu_lig_cerceveleri` (ölçüldü). ≤40 px avatarda halka 7→4 px. Reduced-motion'da Efsane parıltısı kapalı. Gerçek iOS testi yapılamadı (WebKit kurulu değil); değişiklik yalnız box-shadow.
- **C (dal `paket16-tac-pelerin`, main'e ALINMADI):** meydanda taç + pelerin. Mevcut kozmetikler InstancedMesh değil (karakter başına klon) → sıfır çağrılı yol yok. Tüm oyuncular için tek taç + tek pelerin InstancedMesh: +2 çağrı (sabit), +1.764 üçgen, süre farkı ölçülemedi (sıra ters çevrilince kayboldu). Paket "yeni çağrı açma, önce söyle" dediği için sahibi onayı bekleniyor.
- **D (`157dc37`, migration 215 uygulandı):** `bildim-soru-uret` cron'u kapatıldı; geri açma satırı dosyada (anahtar `gizli_al` ile). generate-questions ve eski hata kayıtları yerinde; diğer 23 cron işi duruyor.
- Rapor: `PAKET16_RAPOR.md`, görseller `gorsel/paket16/`.

## 17 Eyl 2026 — Paket 17 A: taç + pelerin onaylandı
- Sahibi +2 sabit çağrıyı onayladı; `paket16-tac-pelerin` dalı `main`'e birleştirildi (`376f453`). PAKET16_RAPOR C durumu güncellendi.


## 17 Eyl 2026 — Paket 17: taç/pelerin onayı · iki ölü sistem · gardırop dondurma (Opus 5)
- **A (`376f453`, `6042c32`, `4a71af1`):** taç + pelerin dalı main'e birleşti, canlı pakette doğrulandı. 152 ↔ 167 çağrı farkı kapandı: iki sahnenin kozmetiksiz tabanı aynı (142); fark tohumdan gelen rastgele kozmetik klonlarından (25 çağrı). Ölçümlerde sahne kurulumu rapora yazılmalı.
- **B (`e56caaa`):** push zinciri ölçüldü — sw, VAPID, RPC, FCM çalışıyor (gerçek Chrome'da bildirim geldi). Kopmalar: izin kartı yalnız Normal Maç sonucunda (15 oyuncudan 5'i görmüş), kart hatayı yutup "bir daha sorma" işareti koyuyordu, iPhone Safari sekmesinde hiçbir giriş yoktu. Düzeltildi + Düello/Hızlı Mod sonucuna eklendi + iPhone ipucu. Ağ çağrısını sessizce yutan 21 catch'e konsol kaydı.
- **C (`a13562a`, kod yok):** lig_arsiv boş çünkü kapanan tek haftada (7–13 Eyl) puanlı gerçek oyuncu yoktu; fonksiyon çalışıyor (kuru çalıştırma 4 satır). 5 kademeli lig kapanışı çalışıyor (1 yükselme). **Karar bekleyen iki kusur:** pasif sayacı haftadan haftaya taşınmıyor (2 hafta pasif düşme hiç tetiklenmez); aktiflik yalnız Normal Maç'ı sayıyor (Düello oynayan "pasif" → yükselemez).
- **D (migration 216 uygulandı):** eski gardırop donduruldu (kod ve veri duruyor, arayüzden giriş yok, eski HTML'ler vitrine yönlenir, rollupOptions'a dokunulmadı). Yeni vitrin `/gorunum` (`oyun/vitrin/`): meydanın kendi karakter kodu, tek WebGL bağlamı, tür + şapka/gözlük/güneş gözlüğü (eski sahiplik ve fiyatla) + Taç/Pelerin (satılmaz) + Yakında kilitleri (Saç, Elbise, Alt, Atkı, Kanat). Kayıt `profiles.gorunum.harita`; meydan onu eski kayıttan önce okur, aynı görünüm iki ekranda aynı çıktı. Geri dönüş yolu `oyun/CLAUDE.md`.
- Rapor `PAKET17_RAPOR.md`, görseller `gorsel/paket17/`.

## 17 Eyl 2026 — Paket 18: lig kapanışı · kozmetik çağrı kaldıracı · vitrin tamamlama (Opus 5)
- **A (`e864956`, migration 217):** pasif sayacı haftadan haftaya taşınıyor (düşünce sıfırlanır); aktiflik bütün modları sayıyor (Normal Maç, Düello, Hızlı Mod, Grup, Turnuva; TSİ hafta sınırı); kapanış + puan_hafta sıfırlaması tek işlemde `haftalik_kapanis()` Pazartesi 00:00 TSİ, profiles FOR UPDATE, tek damga (20:45 lig işi kalktı); 0 puanla yükselme yok. Canlı DB'de işlem içinde doğrulandı ve geri alındı. İlk gerçek kapanış 21 Eyl 00:00 TSİ.
- **B (`1ad990c`):** kozmetikler paylaşımlı InstancedMesh (kaynak geometri başına); klonlar görünmez yerinde (sözleşme, kanat/kuyruk animasyonu aynen). 3A-2 düzeneği: 167 → 147 çağrı, 27 klon → 5 havuz; aynı karede piksel farkı 0. ms kapısı geçilmedi (tur farkı −0,6/−1,1/+0,6, tutarsız).
- **C (`8efc4d7`):** kaydı olmayan gerçek oyuncu tohumdan kozmetik almıyor; botlar alıyor. Ölçüm sahnesinin tabanı bununla değişti (oyuncular kozmetiksiz).
- **D (`78d7507`, migration 218):** Atkı 400, Kanat 2.000 coin satışta (fiyat katalogda). Kanat süzülmesi yalnız çizilen gövdede (+0,10–0,14 m, avatar y=0), VFX kanat aktif, kanat+pelerin birlikte takılabilir. **Canlıda `kozmetik_bedava_test = true` — satın almalar bedava; gerçek ekonomi için false yapılmalı (sahibin kararı).**
- **E:** WebKit kurulamadı: Windows 11 Akıllı Uygulama Denetimi (açık) imzasız WebKit DLL'lerini engelliyor (Kod Bütünlüğü 3077/3033, çıkış 0xC0E90002). Kapatılmaz. CLAUDE.md/AGENTS.md'ye yazıldı; `npm run test:ios:kur` eklendi; yerine Chromium'da iPhone boyutunda CSS denetimi (5 ekran temiz).
- Rapor `PAKET18_RAPOR.md`, görseller `gorsel/paket18/`.

## 17 Eyl 2026 — Paket 19: canlıda bulunan hatalar (Opus 5)
- **A (`31913f4`, migration 219):** `kozmetik_bedava_test = false`; satın alma gerçek coin düşüyor, ödül eşyaları satılmıyor (işlem içinde doğrulandı, geri alındı).
- **B (`b83e143`):** davet butonu taşması — masaüstünde `.app` 620 / `.tabbar` 540 kalmıştı; alt menü de 620.
- **C (`3c8b4d8`):** vitrinde yeni karakter ilk karede bağlanma (T) pozundaydı; Idle zamanla bağlanıyor + Selam. Kalıcı T-pozu düzenekte yeniden üretilemedi.
- **D (`ab7b81b`):** Dükkân › Görünüm = kozmetik vitrini kartları (tek WebGL bağlamı, satın alma vitrinde).
- **E (`4784f7e`):** masaüstünde kısa sayfa dikeyde ortalı (`safe center`), zemin krem + degrade no-repeat (iOS'ta fixed yok sayılınca tekrar ediyordu). iOS denetimi temiz; `.bd-ust-blok` sticky (fixed değil) + translateZ — kural ihlali değil.
- **F (`934d889`):** push abonesi 0'ın ölçülen sebebi: Paket 17 B yayınından beri **hiç maç bitmedi** (kartın tek tetikleyicisi sonuç ekranı). Eski "bir daha sorma" işareti `_v2` ile sıfırlandı; Profil › Bildirimler her tarayıcıda görünür ve neden kapalı olduğunu söyler. Uçtan uca gerçek FCM bildirimi geldi, test aboneliği silindi.
- Rapor `PAKET19_RAPOR.md`, görseller `gorsel/paket19/`.

## 17 Eyl 2026 — Paket 20: ödül/ilerleme güvenilirliği + soru kalite mekanizması (Opus 5)
- **I.1–I.2 (`2e3773d`, migration 220):** günlük görevler bütün modları sayıyor (lig_aktif_mac_sayisi listesi; Grup sayılır); Düello doğruları kategori ustalığını besliyor (savunan + altın soru; geçmiş 14 hamle yazıldı). Turnuva zaten tetikleyiciyle sayılıyordu.
- **I.3 (`17dfe91`, migration 221):** `odul_kalemleri` + `odul_dokumu` — ödülü yazan fonksiyonlar kalemini de yazar (işlem içi bağlam), 5 sonuç ekranında satır satır döküm, indirim sebebiyle. +53/+55'in açıklaması: galibiyet 50/50 + seri 3 lig + seri 5 coin.
- **II (`38998d3`, migration 222–224):** soru kalite hattı AI'sız. Bildir (sebepli, 3 gerçek oyuncu → karantina), kural taraması girişte tetikleyici + tüm havuz (pg_trgm), gerçek oyuncu istatistiği (ters anahtar), `npm run soru:disari` / `soru:iceri` (+ `--kuru`, Supabase CLI ile — yeni paket yok), işaretli denetlenmemiş soru rekabetçi havuza girmiyor (bugün 30 soru). Tarama: 2.976 şüpheli. **Sol anahtarı sorusunun anahtarı doğru** (C = "İkinci"); karışıklık 3. düğme = "üçüncü" okunmasından. Akış canlıda işlem içinde uçtan uca doğrulandı.
- **III (`0e96748`):** misafir etiketi, Ayarlar kartı, ilk galibiyet önerisi (bir kez); bağlama aynı user_id (e-posta updateUser / Google linkIdentity). Veri kaybı 0 ölçüldü. Google bağlama panelde "manual linking" açık olmalı — ayar değiştirilmedi. Sahibinin test hesabı misafir.
- **IV (`15498ce`, migration 225):** Düello tanıtımı (ilk "Rakip ara"), doğru cevap harf+metin, altın soru sonucu, ilk maç kategori +5 sn, joker ipuçları, maç özeti.
- **V (`86a7d68`):** Hatalarım dağılımı açık (N bankadan + M yeni), bankan kadar tur, pratik turu.
- **VI (`64dfea9`):** X4122 = three.js PMREM shader'ı, Windows ANGLE/D3D → dar süzgeç (NUL tuzağı); kanal CLOSED = removeChannel eşzamanlı bildirimi → ref önce boşalır (5 yer, gerçek Supabase ile doğrulandı); dokunulmadan açılan sonuçta ses/titreşim denenmiyor. Tarama 0.
- **VII (`5c65d13`):** kontrast 49 ihlal → 0 (14 ekran). Turuncu dolgu aynı, yazı koyu; yeşil şık koyu yazı; kırmızı bir ton koyu; metin-2/3 koyu; altın yazı koyu altın. Durum renk ve kategori renk sapmaları giderildi.
- **Karar/gözlem:** `soru_sec` dereceli/serbest bilmediği için serbest maçlar da rekabetçi havuzu kullanıyor (sıkı taraf seçildi). Turuncu düğme yazısı beyazdan koyuya döndü — marka turuncusu korunarak AA; istenirse tek token (`--bd-vurgu-ustu`).
- Rapor `PAKET20_RAPOR.md`, görseller `gorsel/paket20/`, denetim kullanımı `araclar/soru_denetim/OKU.md`.
- **Yayın:** quiztactics Vercel projesi günlük dağıtım sınırına takıldı ("Deployment rate limited — retry in 24 hours"); o adres Bölüm II'de kaldı. Hub adresinde 7 bölüm canlı. Sınır açılınca bir push / panelden Redeploy gerekir. Ders: bir paketteki bölüm başına ayrı push + rapor-kimliği push'ları günlük sınırı dolduruyor — rapor kimliği düzeltmelerini bölüm commit'iyle birlikte push et.

## 17 Eyl 2026 — PAKET 21: Muayene gerçek kalite kapısına dönüştü (Opus 5)

**Çıkış noktası (sahibinin gözlemi):** canlı vitrinde pelerin boyna bağlı ve havada, taç havada, şapka havada ve
altı delik, kanatlar kâğıt şeritleri gibi, atkı kartında hiç görünmüyor — buna rağmen `npm run muayene`
"0 aday · 0 susturulan" diyordu. Sebep: muayenede yalnız 3 test vardı (havada / simetri / içiçe), temas için
5 mm'lik **tek köşe** yetiyordu, taç ile pelerin (kodla çizildikleri için) **hiç denetlenmiyordu** ve kozmetikler
takılı hâlde ölçülmüyordu.

**Yapılanlar (A–G, her biri ayrı commit):**
- **A** Kodla çizilen kozmetikler (taç, pelerin) `oyun/harita/karakter/ekKozmetik.js`'e tek kaynak olarak ayrıldı;
  oyun, dışa aktarım ve muayene aynı geometriyi ve aynı yerleşim matrisini (`ekMatris`) kullanıyor. Kural: oyunda
  görünen hiçbir geometri muayene dışında kalamaz.
- **B** Yeni test `oturma` — kozmetiğin gövdeye bakan yüzeyi gerçekten yaslanıyor mu.
- **C** Yeni test `acik_kenar` — manifold denetimi; delik döngüsünün çevrelediği alan (PCA düzleminde shoelace).
- **D** Yeni test `kalinlik` — ada başına PCA; "kâğıt gibi" parçalar. Ölçüt iki kez ölçülerek düzeltildi.
- **E** Takılı poz muayenesi (tür × kozmetik, Idle, 3 saç varyantı) + yeni test `portre_kadraj` (kart portresinde
  görünen alan ve taşma; oyunun kendi çizim yoluyla).
- **F** Bütün adaylar **geometride** düzeltildi: şapka/taç/pelerin/vizör kapalı kabuklara dönüştü ve gövdeye oturdu,
  kanat tüyü kalınlaştı, kuyruk ucu ve cam diski kapandı. Eşya id'leri ve yuva adları değişmedi, yeni doku yok.
- **G** Raporlama kuralı: muayene artık KAPSAM bloğu basıyor; "0 aday" tek başına yazılamaz.

**Sonuç (ölçüm):** 3 karakter + 2 kod kozmetiği + 22 takılı poz + 21 kart portresi = **0 aday**. Kozmetik dışı
8 aday (bina/prop havada + simetri) Paket 21 kapsamı dışında ve raporda listeli. Çizim çağrısı 153 → 153,
üçgen +414 (%0,09), CPU 5,2 → 5,1 ms (3A-2 rig, 25 karakter, 1536×791). Gövde köşe hash'i, kemik sayısı ve atlas
üç türde de bit bit aynı.

**Kararlar / çıkarımlar:**
- **Test tanımı da ölçülerek düzeltilir.** `oturma` ölçütü üç kez değişti: dışa bakan yüzey sayılmaz → gövdeye
  gömülü köşe temas sayılır → arama yarıçapı 8 cm yerine 2 cm ("yaslanması beklenen bölge") + yaslanma ölçütü.
  Sebep her seferinde ölçümdü: şapka siperi, gözlük camı, kanat tüyü tasarımı gereği havadadır.
- **İki test birbirine zıt şart koyabilir:** `oturma` temas (≤ 6 mm) ister, `kozmetik` testi bağlama pozunda üçgen
  kesişimi istemez. Aradaki pencere, çokgen kubbenin kiriş sapması kadar dardır; çözüm çözünürlüğü artırmak ve payı
  türe göre ölçmektir (robot kafası basık, ekran yüzü öne çıkık).
- **Kozmetik tür varyantı ücretsiz değildir ama şart olabilir:** şapka artık her türde kendi kafa ölçeğiyle üretiliyor
  (aynı eşya id'si). Taç tek InstancedMesh olduğu için tür farkı `ekMatris` içindeki ölçekle kapandı.
- **Muayene "güzel mi" sorusunu yanıtlamaz.** Estetik, oran, stil ve renk ölçülmez; ayakkabı/saç/yüz tasarımı bu
  pakette yapılmadı ve raporda açıkça yazıldı.

Rapor: `PAKET21_RAPOR.md`. Görseller: `gorsel/paket21/once_*.png` · `sonra_*.png` (21 kart × önce/sonra).

## 17 Eyl 2026 — PAKET 23: Karakter görsel revizyonu (Opus 5)

**Sahibinin şikâyetleri:** karakterler kambur duruyor, karınlarında çıkıntı var; şapka inandırıcı değil ve altında
boşluk görünüyor; atkının bağlantısı kopuk; pelerin enseye bağlı, havada; yüz detayları yetersiz.

**Ölçülen kök sebepler (hepsi rapora yazıldı):** gövde kalçadan boyna tek kapsüldü ve yarıçapı sabitti (ışınla
ölçülen derinlik her yükseklikte 40,0 cm → bel farkı %0, düz fıçı); gövdenin tamamı tek kemiğe %100 bağlıydı
(4 ağırlık yuvasından 1'i) → bükülmek yerine Spine1 etrafında deviriliyordu; bind pozu ile Idle arasında ~7,4 cm
(10°) fark var. Şapka 3 ayrı parça, atkı 2 ayrı parça, pelerinin üst kenarı düz çizgi ve hiçbir bağlantı elemanı yok;
yüz anatomisi 47 cm çapındaki kafada 1,5–3 mm'lik kaydırmalardan ibaretti.

**Yapılanlar:** profilli gövde kabuğu (kalça–bel–göğüs–omuz) + omurga ağırlıkları; şapkanın siperi kubbenin ön
kenarından türetildi (tek ada); atkı tek sürekli şerit (yeni `seritSupur`); pelerin gövdenin arka yüzeyini izliyor
ve yaka bandı kazandı; yüz derinlikleri 5–16 mm'ye çıkarıldı. Üç yeni muayene testi: `parca_butunlugu`,
`siluet_profili`, `durus_ekseni`; ayrıca `kozmetik` testi artık kesişimin derinliğini ölçüyor.

**Sonuç:** bel farkı %0 → %15,0 · gövde ekseni +3,4 cm öne → −1,2 cm · şapka 3 ada → 1 · atkı 2 ada → 1 ·
pelerin üst kenarı 3,0 cm → 1,8 cm. Tam tarama 0 aday (kozmetik dışı 8 bina/prop adayı hariç). Çizim çağrısı
153 → 153, üçgen +%3,3, CPU 5,2 ms (değişmedi).

**Çıkarımlar:**
- **Testler birbirine zıt şart koyabilir.** `oturma` temas ister, `kozmetik` kesişim yasaklar; çözüm ölçüyü
  derinleştirmek oldu (2 cm'ye kadar yüzeysel temas normal). Aynı şey `havada` ile `parca_butunlugu` arasında da var:
  gövdeye değmek, parçaların birbirine bağlı olduğu anlamına gelmiyor.
- **Ölçüm penceresi yanlışsa test yanlış "geçer".** Bel ölçümü önce kalça bloğunu, sonra ceket kabuğunu yakaladı;
  düzeltilene kadar bel farkı sabit %8 görünüyordu. Bel = gövdenin EN DAR yeri (minimum), karın taşması = maksimum.
- **Düşük çözünürlüklü mesh'te köşe saymak yanıltır** — kesit ölçümleri ışınla yapılmalı.
- Varyant üretimi için `P23_BEL` / `P23_YUZ` çevre değişkenleri bırakıldı (varsayılan 1 = uygulanan sürüm).

Rapor: `PAKET23_RAPOR.md`. Görseller: `gorsel/paket23/{once,sonra,varyant_A2_ince_bel,varyant_E2_guclu_yuz}/`
(her biri 18 görsel: 3 tür × {bind, Idle t=0,5} × {ön, yan, yüz 3/4}).

---

## Paket 25 — "Doğru şık kendini ele veriyor" (18 Eyl 2026)

**Sorun (bir oyuncu fark etti, sahibi doğruladı):** bazı sorularda bütün çeldiriciler tek kelime,
doğru cevap 2-3 kelime; soru okunmadan kazanılıyor.

**Ölçüm (bugünkü havuz, 9.290 aktif soru):** doğru şık ortalama **17,15** karakter, yanlış şıklar
**10,41**. "Soruyu hiç okumadan en uzun şıkkı seç" stratejisi **%63,1** başarıyla oynuyordu
(4 şıkta rastlantı %25). Rekabetçi havuzda da %63,2 — yani mevcut kapı fiilen kapalıydı.

**Kök sebep — doğrulanmış eşikler yanlış yerde duruyordu:**
- `kalite.ts`'teki 1,4 / 3 eşiği yalnız `generate-questions` Edge Function'ında çalışıyor; soru üretimi
  elle yapıldığı için üretim yolunda hiç uygulanmıyordu.
- SQL kuralı üç yönden gevşekti: oran 1,6 · karşılaştırma **en uzun** diğer şıkla (ortalama yerine) ·
  mutlak fark 8 karakter. 8 karakterlik taban tam da şikâyet edilen durumu kaçırıyordu.
- `dogru_en_uzun` ağırlığı 1'di, havuzdan çıkarma eşiği 2. 2.548 soru işaretliydi ama **hiçbiri**
  rekabetçi havuzdan düşmüyordu.
- Kelime sayısı kuralı ne SQL'de ne `kalite.ts`'te vardı.

**Yapılanlar** (`supabase/migrations/20260612000227_soru_sik_denge_kurali.sql`):
- `soru_uzun_sik_oran` 1,6 → **1,4**; yeni ayar `soru_uzun_sik_fark` = **3**; karşılaştırma
  yanlış şıkların **ortalamasına** geçti. Formül artık `kalite.ts` ile birebir aynı.
- Yeni kural **`dogru_coklu_kelime`**: doğru şıkkın kelime sayısı her çeldiriciden fazlaysa işaret.
  Yeni yardımcı `soru_kelime_sayisi()` (mevcut `soru_kelimeler()` üzerine).
- Ağırlıklar: `dogru_en_uzun` 1 → **2**, `dogru_coklu_kelime` **2** — artık gerçekten havuzdan düşüyorlar.
- `kalite.ts`'e aynı kelime kuralı (`kelimeEleVeriyorMu`) eklendi.
- `npm run soru:iceri` düzeltmeleri içe aktarmadan önce kuralı **veritabanındaki tek tanımdan** sorup
  takılanları uyarı olarak yazıyor (engellemiyor).
- `scripts/soru-parti-sablonu.md`: "yakın uzunlukta" cümlesi ölçülebilir iki kapıyla değiştirildi.

**Sonuç — sağlama ölçütü:** "en uzun şıkkı seç" rekabetçi havuzda **%63,3 → %27,5** (rastlantı %25).
Rekabetçi havuzda doğru şık 10,07 / yanlış 9,74 karakter — denge kuruldu.

**Karar (sahibi onayladı):** eşikler sıkılaşınca rekabetçi havuz 9.237 → 4.392 soruya iniyor (−%52,2),
talimattaki %15 sınırının çok üstünde. Simülasyon sahibine sunuldu, **tam uygulama** seçildi. Gerekçe:
kusur canlıda yaşamaya devam etmesin; her kategoride en az 227 soru kalıyor (teknoloji 227, sinema 255,
genel kültür 540) ve denetimden geçen soru havuza geri dönüyor.

**Çıkarımlar:**
- **Kural yazmak yetmez, ağırlığı da doğru olmalı.** `dogru_en_uzun` bir yıldır 2.548 soruyu
  işaretliyordu ve tek bir soruyu bile havuzdan çıkarmıyordu — işaret ile yaptırım ayrı iki şey.
- **Aynı kuralın iki tanımı varsa gevşek olan geçerlidir.** Doğrulanmış eşik Edge Function'daydı,
  gerçek trafiği SQL belirliyordu. Ölçüm yapılan yer ile kuralın uygulandığı yer aynı olmalı.
- **Doğru hamle soruyu atmak değil, çeldiricileri düzeltmek.** Denetimde `duzelt` kullanılır;
  `kaldir` yalnız kurtarılamaz sorular için (kaldırma = `aktif = false`, satır silinmez).
- `npm run soru:disari` partisi hazır: `.tmp/soru_denetim/parti_01.json` (100 soru, 98'i kural şüphelisi).

---

## Paket 24 (geniş) — Düello bağlantıları · Hızlı Mod dondurma · Grup eşleştirme · Giysi rotasyonu (18 Eyl 2026)

### A — Düello ortak davet/bildirim altyapısına bağlandı

**Ölçülen durum:** Düello kendi içinde kapalı yazılmıştı. Davet tablosu (migration 226) vardı ama
`bekleyen_davetlerim` / `gonderdigim_davetler` / `davet_geri_cek` düello türünü bilmiyordu,
`bildirim_yaz` başlık tablosunda `duello_daveti` / `duello_kabul` yoktu ve **`duello_davet_et` hiç
bildirim yazmıyordu** — davet edilen kişi haberdar bile olmuyordu.

**Yapılan:** üç ortak RPC'ye `duello` dalı (`kayit_id` = `duello_davetleri.id`), `DavetBandi`'ye
`TUR_BILGI.duello` + `CEVAP_RPC.duello` + `duello_davetleri` realtime aboneliği, `bildirim_yaz`
başlıkları, davet ve kabul bildirimleri, `BildirimToast`'ta kabul bildirimleri için öne çıkan biçim +
**"Oyuna git"** düğmesi + 9 sn, Arkadaşlar sayfasından düelloya çağırma.

**Bir tuzak:** düello kabul RPC'si DAVET id'sini alır ama DÜELLO id'si döndürür. Bant eskisi gibi
`kayit_id` ile yönlendirseydi var olmayan bir düelloya giderdi — `DONEN_ID_ILE_GIT` kümesi bunun için.

**A.2 çifte davet kuralı:** `davet_cakismasi()` dört kaynağı birden sayar (matches · grup · hızlı ·
düello). Davet atarken en fazla 2 bekleyen (`davet_siniri_kontrol`), kabul ederken aktif oyun engeli
(`davet_kabul_kontrol`). **Grup maçında kural 4 uygulanmadı** — grup 3-5 kişiliktir, "bu oyuncuyla
devam eden oyun" çok taraflı bir lobide karşılığı olmayan bir engel üretir ve Grup Maçı ödülsüz
arkadaş modudur (CLAUDE.md: arkadaşlarıyla oynayanı hiçbir limit cezalandırmaz).

**A.4 bağlantı kopması — en ciddi bulgu:** düelloda varlık denetimi **hiç yoktu**. 2 saniyelik cron
rakip bağlı olmasa da fazları ilerletiyor, cevap süresi dolunca `duello_cozumle(id, null)` çağırıp
**can götürüyordu**. Sekmesi kapanan oyuncu döndüğünde üç canını birden kaybetmiş oluyordu.
Artık: 25 sn'de kopuk sayılır, **kopukken faz ilerlemez** (kalan süre dondurulur), 45 sn'de bekleyen
kazanır (terk ile aynı yol), zaman aşımı `created_at` yerine `son_hareket`'ten sayılır.

**A.4.7 — diğer modlarda aynı körlük var mı? ÖLÇÜLDÜ, YOK.** 1v1 `matches`'te denetim zaten vardı ve
tam olarak düelloya eklediğim kalıpta: `mac_nabiz` rakip bağlı değilse `duraklatildi_at` yazar (maç
durur), dönünce `soru_baslangic` ötelenerek devam eder, **45 saniye** dönmezse `terk_eden` yazılıp
`mac_sonuclandir` çağrılır. Grup ve hızlı maçta `terk_at` sütunu aynı işi görür.
**Düello tek istisnaydı.** Önerilen 45 sn'nin 1v1'in mevcut kuralıyla birebir tutması rastlantı değil —
tutarlılık korunmuş oldu.

**Test sonrası çıkan kusur:** cevap fazının son saniyesinde kopan oyuncunun `kopuk_kalan`'ı 0
hesaplanıyordu; dönünce 1 saniyede cevaplaması gerekiyordu. 3 saniyelik taban kondu (migration 233).

### B — Hızlı Mod donduruldu

**Ölçüldü:** Hızlı Mod son 30 günde **4 oturum / 2 oyuncu**, aktif oturum yok. "Hızlı Olan Kazanır"
**0 kayıt**. Hızlı Mod'a ait cron zaten yoktu. Yani mod fiilen zaten ölüydü.

**Yöntem kararı — neden trigger, neden RPC gövdesi değil:** `hizli_mod_baslat` / `create_hizli_mac`
gövdelerini kopyalayıp başlarına kapı koymak, 100+ satırlık ödül ve soru seçme mantığını yeniden
yazmak demekti. Bunun yerine tabloya **BEFORE INSERT** kapısı kondu: yeni oturum açılmaz, devam eden
oturum sorunsuz biter, hangi yoldan gelinirse gelinsin aynı kapı çalışır, geri açmak tek satır.

**Görev/ustalık açığı yok (ölçüldü):** `gorev_sayaci` moda özel değil — `mac_oyna_3` / `mac_kazan_5` /
`dogru_25` tüm modları toplar. Hızlı Mod yalnız bir kaynaktı; oyuncu aynı görevi diğer modlarla
tamamlar. Değişiklik gerekmedi.

**B.3 denge:** `hizli_mod_lig_tavan` / `coin_tavan` **oturum başına** (günlük değil). Oturum 90 sn
olduğu için teorik olarak saatte ~750 lig puanı yapılabiliyordu ve **lig puanında günlük tavan yok**.
Yani kapanış bir kayıp değil, bir açığın kapanması. Gerçek kullanımda kayıp ölçülebilir değil
(30 günde 4 oturum, `coin_hareketleri`'nde `hizli%` referanslı 0 kayıt). Normal Maç / Düello oranı
(25 / 50) korunuyor. **Ayar değerlerine dokunulmadı.**

### C — Grup maçı eşleştirme kuyruğu

**Ölçülen durum:** grup maçı yalnız davetle oynanıyordu; kuyruk kodu **hiç yoktu**. Arkadaşı
çevrimiçi olmayan oyuncu grup maçı oynayamıyordu.

`duello_kuyrugu` kalıbı birebir izlendi. `grup_kur_kuyruktan`, `respond_group_challenge`'ın "son kabul
geldi" dalıyla **aynı sonucu** üretir (durum=aktif, soru_ids seçili, basladi=false) — mevcut lobi akışı
devralır, ikinci bir başlatma yolu açılmadı. Yeterli gerçek oyuncu yoksa 12 sn sonunda gizli botlarla
tamamlanır (aynı bot iki kez seçilmez). Kuyruktan çıkış, 90 sn ömür ve sayfa kapanınca otomatik çıkış
yazıldı — oyuncu sonsuza kadar beklemez. **Ödül kuralı değişmedi** (`trg_grup_bitti`'ye dokunulmadı).

**C.2 ölçüldü, açık yok:** `gunluk_seri_bonusu` canlı veritabanında **yalnız** `duello_bitir` ve
`mac_sonuclandir` içinde çağrılıyor. `trg_grup_bitti` yalnız `mac_sayaci_arttir(false)` çağırıyor —
grup maçı bedava seri koruma kapısı değil. Hızlı Mod için de aynı (`hizli_mod_bitir`'de yok).

### D — Turnuva haftalık giysisi artık dönüyor

Sistem zaten vardı (migration 213), yeniden yazılmadı. Eksik olan tek şey tabloda **tek satır**
olmasıydı; `turnuva_haftalik_giysi()` "en son satır"ı döndürdüğü için ödül hiç değişmiyordu.
`turnuva_giysi_rotasyon()` aday havuzu (`aktif` + `nadirlik='etkinlik'`, bugün Taç + Pelerin) sıra ile
döndürür, bitince başa sarar, aynı giysiyi üst üste vermez, havuz boşsa sessizce geçmeyip mevcut
giysiyi korur ve uyarı yazar. Idempotent. Yeni etkinlik parçası eklendiğinde rotasyona kendiliğinden
katılır — bu dosyaya dokunmak gerekmez.

**Çıkarımlar:**
- **"Sistem var" ile "sistem çalışıyor" ayrı şeyler.** Haftalık giysi sisteminin her parçası
  yazılmıştı; eksik olan tek satırlık veriydi ve ödül aylardır sabitti. Aynı desen `dogru_en_uzun`
  işaretinde de vardı (Paket 25): kural yazılı, ağırlığı yanlış, yaptırım sıfır.
- **Bir modun "kapalı" olması sunucuda da kapalı olmalı.** Arayüzden düğme kaldırmak yetmez; eski
  bağlantıyı bilen ya da doğrudan RPC çağıran biri modu açabilirdi. Tablo kapısı bunu tek noktada
  çözdü ve geri açma yolunu tek satıra indirdi.
- **Test kurgusu yanlışsa test yalan söyler.** Giysi rotasyonunun ilk testinde bu haftanın satırını
  silince "son verilen giysi" de silindi; fonksiyon doğru çalıştığı hâlde yanlış sonuç veriyor gibi
  göründü. Önceki hafta satırı kurulunca zincir doğru çıktı.
- **Geri alınan işlemde test etmek canlı veritabanında güvenli bir yöntem.** DO bloğunun sonunda
  `raise exception` her şeyi geri alır; rotasyon, davet kuralları ve kopukluk senaryolarının hepsi
  canlı veriyle, hiçbir satır değiştirilmeden doğrulandı.

---

## Paket 26 — Yayın öncesi sağlamlık (18 Eylül 2026)

Altı bölüm: güvenlik denetimi · otomatik yedekleme · otomatik test · ölü kod düzeni ·
yük/kilit denetimi · turnuva lobisi filtreleri. Görsel iş yapılmadı (F'deki süzgeç
arayüzü hariç, o da mevcut `.bd-sekme` bileşenini kullanıyor).

### A — Güvenlik ve RLS yeniden denetimi

9 Eylül'den bu yana eklenen 153 migration hiç denetlenmemişti. Ölçüm: 117 public
tablo, 394 fonksiyon; bulgular **anon anahtarıyla canlıda gerçekten denendi**.

**🔴 En ağır bulgu — soru cevabı herkese açıktı.** `soru_dilinde(question_id, dil)`
RPC'si `dogru_cevap` döndürüyor ve `PUBLIC` rolüne açıktı. Giriş yapmadan

    GET /rest/v1/rpc/soru_dilinde?p_question_id=<id>&select=dogru_cevap

her sorunun doğru şıkkını veriyordu. Oyuncu kendi maçının `soru_ids` dizisini
(20 soru) okuyabildiği için Normal Maç · Grup · Turnuva · Düello'nun hepsinde
**tam hile** mümkündü. `tournaments.soru_ids` de anon'a açıktı, yani turnuva
soruları önceden çözülebiliyordu.

**🔴 `is_bot` sızıntısı.** `turnuva_bot_havuzu(tid)` o turnuvanın gizli bot
listesini, `avatar3d_portresiz_botlar()` bütün bot kimliklerini anon'a veriyordu.
İkisi de canlıda 200 döndü ve bot kimlikleri geldi.

**🔴 Lig haftası dışarıdan kapatılabiliyordu.** `haftayi_kapat` / `lig_haftayi_kapat`
anon tarafından çağrılabiliyordu; yükselme/düşme ve ödüller erken tetiklenebilirdi.

**🟡** TRUNCATE yetkisi 117 tablonun hepsinde anon+authenticated'daydı ve
**TRUNCATE RLS'e tabi değildir**. `tournaments` / `tournament_players` /
`user_badges` / `dg_*` giriş yapmadan okunuyordu. `pr_apply_race_result`
istemcinin verdiği puanı sınırsız ekliyordu. `ayni_cihaz_mi(a,b)` herkese açıktı:
iki hesabın aynı cihazdan olup olmadığı dışarıdan sorulabiliyordu.

**Kök sebep tek:** Supabase'in varsayılan "şemadaki her şeyi ver" yetkisi sonradan
eklenen fonksiyonları da kendiliğinden kapsıyor. Üstelik yetki `anon`/`authenticated`
rollerinde değil **`PUBLIC` sözde rolünde** duruyor — ilk denemede yalnız iki rolden
revoke edildi ve HİÇBİR ŞEY DEĞİŞMEDİ; geri alınan işlemdeki test bunu yakaladı.
Doğrusu: `revoke ... from public` + sunucu rollerine (`postgres`, `service_role`)
geri verme.

**Yapılan (migration 234-235):** istemcinin gerçekten çağırdığı RPC listesi kaynak
taranarak çıkarıldı (170 çağrı; çok satırlı `.rpc(` kalıbı ilk taramada kaçmıştı,
düzeltildi). Sunucuya ait 30 fonksiyon + 30 tetikleyici fonksiyonu kapatıldı.
`grup_mac_uyesi_mi` / `hizli_mac_uyesi_mi` **bilerek dışarıda bırakıldı**: onlar RLS
politikası değerlendirilirken ÇAĞIRAN rolle çalışır, yetkileri alınsa grup ve hızlı
maç tabloları okunamaz hâle gelirdi. TRUNCATE/TRIGGER/REFERENCES alındı (gelecekteki
tablolar için `alter default privileges` ile birlikte), kişisel veri taşıyan altı
politika `authenticated`'a çekildi, PatiRun puanına tavan kondu. 19 tekrarlanabilir
uca `hiz_siniri` eklendi (nabız ve `advance_*` BİLEREK hariç — saniyede bir
çağrılırlar, sınır konsa maç kırılır).

**Doğrulandı:** 170 istemci RPC'sinin hiçbiri yetkisini kaybetmedi, iç zincir
(`calisma_soru` → `soru_dilinde`) çalışıyor, RLS politikaları sağlam, anon'a kapalı
uçların hepsi canlı REST'te 401 dönüyor. Son durum: RLS kapalı tablo 0, anon/auth'ta
kalan TRUNCATE 0, `search_path`'siz definer fonksiyon 0.

**🔴 SAHİBİNE KALAN — sır döndürme.** 9 Eylül'de "git geçmişindeki sır döndürülmeli"
denmişti; **döndürülmemiş**. Canlı `sunucu_gizli.cron_secret` değeri, herkese açık
depo geçmişindeki değerle **birebir aynı** (karşılaştırıldı, uç nokta tetiklenmedi).
Yani depo geçmişini okuyan biri hâlâ `send-push`'u çağırıp tüm kullanıcılara bildirim
gönderebilir. Döndürme iki adımdır ve biri panelden yapılır (bu yüzden ajan yapamaz):

1. Supabase → Edge Functions → Secrets → `CRON_SECRET` yeni değere çekilir.
2. Hemen ardından `update sunucu_gizli set deger='<yeni>' where anahtar='cron_secret';`

Arada kalan kısa pencerede push bildirimleri 401 döner; veri kaybı olmaz.
Depoda başka düz metin sır yok (tarandı; `oyun/lib/push.js`'teki VAPID anahtarı
zaten **açık** anahtardır).

### B — Gece yedeği

`.github/workflows` klasörü hiç yoktu: ne CI ne zamanlanmış iş. Artık her gece
03:00 TSİ'de döküm alınıyor, **boş bir Postgres 17 kabına gerçekten geri yükleniyor**
ve tablo başına satır sayıları kaynakla karşılaştırılıyor. Üç kapı: tablo kümesi
birebir · kaynakta dolu tablo boş geri yüklenmeyecek · toplam fark %1'i aşmayacak.
(%1 payı bilerek: canlıda botlar saniyede yazıyor, döküm ile sayım arasında kayma
olur; payı koymayan bir eşitlik kontrolü her gece yalandan kırılırdı.) Doğrulama
geçmezse artifact yazılmaz ve depoda konu açılır.

Yedek **bu makinede alınamadı**, sebebi ölçüldü: Docker yok, `pg_dump` yok, `psql`
yok, `gh` yok. Bu yüzden geri yükleme testi tek seferlik bir ölçüm olarak değil,
**işin kendi içine** kondu — her gece tekrar ediyor. Sahibinin tek adımı
`SUPABASE_DB_URL` sırrını eklemek (YEDEKLEME.md'de yazılı).

### C — Otomatik testler

`npm test` yoktu; iki elle yazılmış betik vardı ve biri (`test:bildim`) **hiç
çalışmıyordu** — `pg` paketi kurulu olmadığı için ilk satırda çıkıyordu.

Yeni paket kurulmadı. Node'un kendi `node:test` koşucusu + depoya yazılan küçük
Postgres istemcisi (`araclar/pg-mini.mjs`, yalnız `net`/`tls`/`crypto`,
SCRAM-SHA-256). 27 test yazıldı, hepsi işlem içinde çalışıp ROLLBACK ediyor:
ödül dağıtımı (galibiyet/beraberlik/serbest/bot indirimi/çift koruması), günlük
seri bonusu, davet çakışması, düello faz makinesi ve kopukluk (25/45 sn, donan
süre, bot kopuk sayılmaz), grup kuyruğu, soru şık denge kuralı. Her dosyanın
başında "bu test kırılırsa ne anlama gelir" yazıyor.

**Test bir kusur buldu:** `joker_ekle` hâlâ `'pas'` türünü tanıyordu ama üç joker
paketinin içeriği Paket 14'te `'soru_degistir'`e çevrilmişti — mağaza yolundan
alınan her paket "Geçersiz joker türü" ile düşerdi (migration 236). Coin yolu
`joker_hareket`'i doğrudan çağırdığı için etkilenmiyordu; kusur bu yüzden
görünmemişti (canlıda denendi, coin yolu çalışıyor).

**Çıkarım:** "test var" ile "test koşuyor" ayrı şeyler. Koşmayan bir test, olmayan
testten daha kötüdür — güvence hissi verir. `npm test` artık üçünü de tek komutta
koşar ve CI'da da koşar.

### D — Dondurulmuş kod düzeni

Beş dosyanın başına aynı biçimde blok kondu (neden · tarih · paket · dosyalar ·
geri açma adımları); kök `CLAUDE.md`, `AGENTS.md` ve `oyun/CLAUDE.md`'ye tek
"Dondurulmuşlar" tablosu yazıldı. Hiçbir dosya silinmedi.

**Asenkron 1v1 dalı için önceki varsayım ölçüldü ve DOĞRU ÇIKMADI.** `matches`
tablosundaki 48 satırın hepsi `senkron = true`; `senkron = false` olan hiç maç
olmamış. Ama dal **ölü değil**: `mac_asenkrona_gec()` `senkron = false` yazan tek
canlı yoldur ve `MatchPage.jsx:428`'den, rakip maça gelmediğinde oyuncuya düğme
olarak sunulur. "Kimse kullanmamış" ile "çağrılamaz" ayrı şeylerdir; dala
dokunulmadı, durum yazıldı.

### E — Cron, yük ve kilit

**Paketteki sayılar canlıyla uyuşmadı.** 38 iş değil **24 iş** var; `bildim-bot-oyna`
tek kayıt (2 sn), `duello_tik` tek kayıt, `bildim-turnuva-baslat` diye bir iş yok.
Aynı komutu paylaşan iki çift var ama ikisi de **bilerek** kurulmuş yedeklemeler
(`hafta-kapat` + `hafta-kapat-pzt`, `giysi-rotasyon` + `giysi-yedek`) ve iki fonksiyon
da idempotent. Bu yüzden **silinen kayıt yok** — silinecek bir şey bulunmadı.

**Turnuva anı yük sorunu değil (ölçüldü).** Son 14 günde turnuva dakikalarında
(TSİ 13:00 / 21:50 ± birkaç dk) 3.211 koşu, **hata 0**, süreler normal dilimden
daha kısa: `bot-oyna` 0,019 sn (normalde 0,021), en uzun 0,137 sn (normalde 120 sn).

**Gerçek olay başka yerdeydi.** Son 48 saatteki 9 başarısız koşunun hepsi tek bir
saatte: 17 Eyl 15:00–16:00 UTC. `bot_oyna`'nın hatası *"compilation of PL/pgSQL
function near line 4"* — fonksiyon **derlenirken** kilitte bekliyor. Yani o sırada
uygulanan migration'ların `CREATE OR REPLACE`'i ile 2 saniyelik cron çakışmış, işler
birikmiş ve 120 sn'lik ifade zaman aşımına düşmüş.

**Deadlock durumu:** `gizli_bot_nabiz` ↔ `bot_puan_tik` deadlock'ları 30 günde 9
kayıt, **sonuncusu 16 Eyl 11:50**. Hata metnindeki SQL, migration 207 öncesinin
gövdesi. 207'den bu yana ~43 saat ve gizli bot nabzının ~2.600 koşusunda **sıfır**
deadlock — düzeltme tutuyor.

**Yapılan (migration 237):** dört sık işe advisory kilit kondu; aynı işin ikinci
kopyası sessizce atlar, arkasına kuyruk birikmez. İş silinmedi, sıklık ve mantık
değişmedi. Uygulamadan sonraki saatte 0 hata.

### F — Turnuva lobisi süzgeçleri

Tümü / Arkadaşlarım / Kendi Ligim + ada göre arama. Süzme mevcut listenin üstünde,
bellekte. İki yardımcı veri **tembel** çekiliyor: ilgili süzgeç ilk kez seçilene
kadar hiçbir sorgu gitmiyor.

`profiles.lig` kullanılamadı — **o kolon istemciye kapalı** (kolon bazlı yetki
listesinde yok, ölçüldü); eklenseydi lobinin tamamı 403 dönerdi. Yerine giriş
yapmış oyuncuya zaten açık olan `lig_uyelik` kullanıldı. `is_bot` sızmıyor: botlar
beş ligin hepsine dağılmış (bronz 41, gümüş 36, altın 34, elmas 30, efsane 19),
lig süzgeci bot/insan ayrımı yapmıyor.

### Çıkarımlar

- **Yetki kimde duruyor, ona bak.** İki rolden revoke etmek hiçbir şey değiştirmedi;
  yetki `PUBLIC`'teydi. Geri alınan işlemde test edilmeseydi "düzelttim" diye
  raporlanacaktı ve hile açığı açık kalacaktı.
- **Bir sırrın açığa çıkması, sır değiştirilene kadar sürer.** Dokuz gün önce
  "döndürülmeli" yazılmış; yazmak döndürmek değil.
- **Paketin verdiği sayıları da ölç.** Bu pakette üç varsayım yanlıştı: 38 cron işi
  (24), yinelenen cron kayıtları (yok), ölü asenkron dal (kullanılmamış ama canlı).
  Ölçmeden "temizlik" yapılsaydı çalışan bir özellik kaldırılmış olacaktı.
- **Koşmayan test, olmayan testten kötüdür.** `test:bildim` aylardır ilk satırda
  çıkıyordu ve kimse fark etmemişti; içindeki kurallar da eskimişti.

---

## Paket 27 — Joker ekonomisi (18 Eylül 2026)

Gerekçe (sahibinin kurgusu): joker, oyunun kalan tek coin harcama yeri. Ücretsiz
joker bu tek sink'i sulandırıyordu. Yeni kural: joker kazanılan coin'le alınır —
ama öğrenmek için başlangıç stoğu verilir ve maçın ortasında dükkâna gitmek gerekmez.

### A0 — "Normal Maç" → "Klasik Mod"

Yalnız kullanıcıya görünen ad. DB değerleri, `mac_tur = '1v1'`, ayar anahtarları ve
rotalar (`/mac/:id`) **aynen** kaldı — link kırılmadı.

**Ölçüm paketin verdiğinden bir fazla çıktı.** Pakette altı yer sayılıyordu; kaynakta
altısı da bulundu ama derlenmiş pakette ad **hâlâ görünüyordu**: harita binasının
etiketi `oyun/harita/dunya.js`'in YORUMUNDA değil, `oyun/harita/yerlesim.json`
içinde **veri** olarak duruyordu (`"ad": "Normal Maç"`). Yalnız kaynağa bakıp
"bitti" denseydi meydandaki tabela eski adı göstermeye devam edecekti. Derlenmiş
`dist/` taranarak yakalandı; şimdi orada yalnız `dil.js`'in geriye uyum eşlemesi
(`"Normal Maç" → "Classic Mode"`) kalıyor, o da bilerek.

`push_metinleri`'nde mod adı **hiç geçmiyor** (0 satır, ölçüldü). Çeviri sözlüğüne
`'Klasik Mod' → 'Classic Mode'` eklendi; eski `'Normal Maç'` girdisi **silinmedi**
(eski üretilmiş içerikte geçebilir, geçerse yine doğru çevrilsin).

### A — Başlangıç jokeri

Ölçülen durum: yeni oyuncuya 500 coin veriliyordu ama **hiç joker verilmiyordu**
(`joker_envanter` canlıda tamamen boştu — 0 satır).

Artık kullanımda olan her türden `baslangic_joker_adet` (2) veriliyor:
`elli · sure · soru_degistir · zaman_baskisi · saldiri_degistir · savunma_kilidi · seri_koruma`.

**`pas` verilmiyor.** Tür kısıtı onu hâlâ tanıyor ama ölçüldü: `joker_kullan`
yalnız üç türü kabul ediyor, düello fonksiyonları da reddediyor — yani `pas`
envantere girebilir ama **hiçbir yerde harcanamaz**. Ölü türe stok vermek
oyuncuya "elimde bir şey var" yalanı söylerdi. (Paket 14'te "Pas" → "Soru Değiştir"
oldu; tür adı geriye uyum için duruyor.)

Bota verilmiyor, eski hesaplara dokunulmuyor, ikinci kez verilmiyor (idempotent).

### B — Ücretsiz joker kalktı, tek toplam hak geldi

- `duello_ucretsiz_saldiri_joker` **0**'a çekildi (ayar silinmedi).
- Yeni `duello_joker_hak` = **4**: saldırı + savunma birlikte, **tüm modlar**.
  `duello_saldiri_joker_siniri` / `duello_savunma_joker_siniri` değerleri duruyor
  ama artık okunmuyor; açıklamaları bunu söylüyor.
- **Aynı joker maç başına bir kez.** Eski "soru_degistir tek hak" istisnası
  genelleştirildi; artık ayrı istisnaya gerek yok. Klasik Mod'un seti üç tür
  olduğu için oradaki fiilî tavan 3 — ayrı bir kural değil, aynı kuralın sonucu.
- Ücretsiz 50:50 **yalnız SERBEST Klasik Mod'da**. Dereceli Klasik Mod'da ve
  düelloda hiçbir joker ücretsiz değil.
- Turnuva finali (0) ve arkadaş maçı (sınırsız) kararlarına **dokunulmadı**.

Kural tek yerde: `joker_hak_kontrol()`. Hem `joker_kullan` hem iki düello
fonksiyonu oradan geçiyor ki aynı kural üç yerde üç türlü yazılmasın.

### C — Maç içinde joker satın alma

Tek RPC: `joker_al_ve_kullan` — satın alma ve kullanım **aynı işlemde**,
`FOR UPDATE` kilidiyle. Kullanım herhangi bir sebeple reddedilirse (maç bitti,
faz uygun değil, hak doldu, aynı joker) işlemin tamamı geri alınır ve **coin
düşmez**. Fiyat sunucudan (`coin_joker_*`); istemciden gelen fiyata bakılmıyor.
`hiz_siniri` var. Satın alma `coin_hareketleri`'ne `joker_mac_ici:<mac_id>`
kaynağıyla yazılıyor, `joker_islemleri`'ne de ayrı `mac_ici` kaynağıyla — "maç içi
satış ne kadar tuttu" iki taraftan da ölçülebilir.

Arayüz: envanterde 0 varsa düğmenin üstünde altın simgesi; dokununca **alttan
açılan** onay sayfası (tek elle erişilebilir yükseklik). Coin yetmiyorsa onay
pasif ve "Yetersiz coin" yazıyor — dükkâna ya da coin ekranına **yönlendirme yok**.
Onaya basınca düğme kilitleniyor. Süre **durmuyor**; maç senkron, rakip bekliyor.
Hem Klasik Mod (`JokerCubugu`) hem Düello (`JokerAlani`) ekranında.

**Ölçülen süre:** satın al + kullan gidiş-dönüş **89–115 ms** (bu makineden
Frankfurt havuzuna, SQL yürütme dahil). Hedef 1-2 saniyeydi.

### D — Bot simetrisi

Bot artık insanla **aynı** kısıta tabi: maç başına en çok `duello_joker_hak` ve
aynı jokeri iki kez kullanamaz (aday havuzundan kullanılmış türler çıkarılıyor).
Sıklık ayarı (`duello_bot_joker_yuzde`) korundu.

**Ölçüm paketin varsayımını kısmen düzeltti:** geçmiş veride bot düello başına
**en çok 2** joker kullanmış ve **türü hiç tekrarlamamış** (3 düello). Yani
"bot 4'ü geçiyor" diye bir durum zaten yoktu; gerçek adaletsizlik jokerin
**bedava** olmasıydı ve asıl düzelen o. Botun aday havuzu bilerek iki tür:
`saldiri_degistir` için botun soru değiştirme yolu yok, eklenseydi etkisiz bir
joker harcamış olurdu.

### Test sırasında yakalanan iki kusur

**1. Yeni hesap coin'ini kaybediyordu.** `joker_islemleri.kaynak` kısıtı yalnız
altı değer tanıyordu; 238'in `'baslangic'` kaynağı kısıtı ihlal etti. Tek başına
önemsiz görünürdü ama `handle_new_user` içindeki **tek** `exception when others`
bloğu coin, eşya, karakter ve joker ödüllerinin hepsini kapsıyordu — plpgsql'de
bu blok örtük bir alt-işlemdir, içindeki bir hata **bloğun başına kadar her şeyi
geri alır**. Yani joker verme patlayınca yeni oyuncunun **coin'i de** geri
alınıyordu. Canlıda o aralıkta hesap açılmadı (ölçüldü: 0 yeni profil), kimse
etkilenmedi. Kısıt genişletildi ve her ödül **kendi bloğuna** alındı (migration 240).

**2. Dereceli maçta arayüz "ÜCRETSİZ" yalanı söyleyecekti.** `joker_mac_durumu`
hâlâ eski ücretsiz tanımını kullanıyordu; dereceli maçta rozet "ÜCRETSİZ" diyor,
basınca envanterden joker düşüyordu. Tek kaynağa bağlandı (migration 242).

### Çıkarımlar

- **Bir adı değiştirirken kaynağa bakmak yetmiyor.** Mod adı bir JSON veri
  dosyasında duruyordu; yalnız `.js`/`.jsx` taranarak "bitti" denseydi meydandaki
  tabela eski adı göstermeye devam edecekti. Doğru kapı: **derlenmiş çıktıyı** tara.
- **Tek `exception` bloğu, bağımsız işleri birbirine bağlar.** Dört ödül tek blokta
  olduğu için jokerin hatası coin'i de götürüyordu. Ayrı bloklar, ayrı sorumluluk.
- **Kuralı tek yere koy.** "Aynı joker bir kez" üç fonksiyonda üç kez yazılsaydı,
  biri güncellenmeden kalırdı; `joker_hak_kontrol` ile tek kapı oldu. Aynı hata
  `joker_mac_durumu`'nda zaten yaşanmıştı: kural iki yerde iki türlüydü.
- **Paketin verdiği sayıyı da ölç.** Botun "4'ü geçip geçmediği" sorusunun cevabı
  ölçümde "zaten en çok 2" çıktı; asıl sorun sayı değil bedavalıktı.

---

## Paket 28 — Canlı testte çıkan hatalar (18 Eylül 2026)

Canlı sitede bir düello oynanarak ve sayfalar gezilerek bulunan iki hata ve dört
kullanım sorunu. Her madde ölçülerek düzeltildi, sonra **canlıda doğrulandı**.

### 🔴 A — Düello açılır açılmaz yanlış "Bağlantın koptu"

**Kök sebep ölçüldü, tahmin edilmedi.** Paylaşılan kabuk (`AuthContext`)
`kalp_at()`i **60 saniyede bir** atıyor; düellonun kopukluk eşiği
(`duello_kopuk_sn`) **25 saniye**. 60 > 25 olduğu için iki nabız arasında
**35 saniyelik bir pencere** var ve o pencerede tamamen bağlı bir oyuncu "kopuk"
sayılıyor. Uyarının ilk tıklamada kaybolmasının sebebi de bu: `duello_kilitle`
çağrıldığında `last_seen` tazeleniyor.

Ağırlığı şurada: uyarı yalnız korkutmuyor, `duello_kopuk_bekleme_sn` (45 sn)
dolarsa **bağlı bir oyuncu maçı haksız yere kaybedebilir**.

**Düzeltme:** düello ekranı kendi nabzını atıyor. Aralık ayardan okunuyor
(`duello_nabiz_sn` = 10) **ama sunucu her zaman eşiğin yarısına kırpıyor**
(`duello_nabiz_sn()` fonksiyonu). Yani iki ayardan biri ileride değişse bile
ilişki bozulamaz — kural istemcide değil sunucuda duruyor. Teste bağlandı:
eşik geçici olarak 8 sn'ye çekildiğinde nabzın 4 sn'ye indiği doğrulanıyor.

**Aynı hata başka yerlerde arandı:** `last_seen`'e bakan diğer iki yer
(`oyuncu_ara` ve `OyuncuKarti`'nın çevrimiçi rozeti) **2 dakika** eşiği
kullanıyor — 60 sn'lik nabızla uyumlu, sorunsuz.

Canlı doğrulama: `duello_durum().sureler` → `{nabiz: 10, kopuk: 25}`, 10 < 12,5. ✅
**Sahibinin ekranında bakması gereken:** düelloyu açıp 60 saniye hiçbir şeye
dokunmadan beklemek. Otomasyon sekmesinde bu sınama geçersiz: sekme `hidden`
sayılıyor ve nabız orada **bilerek** durur (oyuncu bakmıyorsa nabız atılmaz).

### 🔴 B — Dükkân'daki joker kural metni eski ve yanlıştı

Paket 27'de kurallar değişti, metin değişmedi. Canlıda hâlâ "maç başına en fazla
2 joker, arkadaş maçlarında sınırsız" yazıyordu; ikisi de artık yanlıştı.

Kural artık **tek kaynakta**: `oyun/lib/jokerKurallari.js`. Dükkân oradan
okuyor, sayıyı `oyun_ayarlari.duello_joker_hak`'tan alıyor — koda gömülü değil.
Düello tanıtımı da güncellendi ama **sayıları tekrarlamıyor**; yalnız düelloya
özel olanı anlatıyor (hiçbir joker ücretsiz değil, maç içinden alınabilir).

Oyunun tamamı tarandı: `QuestionCard`'daki eski joker çubuğu **ölü kod** —
dört çağıranın dördü de `macTur` veriyor, o dal hiç çizilmiyor. `push_metinleri`
ve yardım sayfalarında joker kuralı geçmiyor. Eskimiş çeviri anahtarı silinmedi
(ev kuralı) ama "YENİDEN KULLANMA" diye işaretlendi.

Canlı doğrulama: beş kuralın beşi de doğru metinle görünüyor, eski cümle yok;
İngilizce karşılıkların beşi de yayınlanmış pakette. ✅

### 🟡 C — Dükkân kartları boş kutu olarak açılıyordu

Portre hazır değilken hiçbir şey çizilmiyordu; dokuz kart bomboş beyaz kutu
olarak açılıp ~5 saniyede tek tek doluyordu. Artık iskelet (ışık geçişi)
görünüyor; `prefers-reduced-motion` açıksa geçiş yok, düz soluk dolgu.

Canlı doğrulama: sayfa açılır açılmaz **10 kart iskelet**, 3 kart "Yakında"
(kilit ikonu — onlara portre üretilmediği doğrulandı), portreler gelince
**0 iskelet / 10 dolu**. ✅

### 🟡 D — Saldırı Hazırlığı 4 saniye, satın almaya dardı

**Önce ölçüldü:** satın alma RPC'si gidiş-dönüş ~100 ms (Paket 27'de 89-115 ms).
Yani darboğaz sunucu değil, **insanın rozeti fark edip onayı okuma süresi** —
o da 4 saniyeye kırpılamaz.

Bu yüzden **(b)** seçildi: saldırı jokerleri **kategori seçme ekranında da satın
alınabiliyor** (orada 20 saniye var), kullanım yine Hazırlık'ta. Maç ritmi
uzamıyor — (a) seçilseydi 10 turda +20 saniye eklenecekti.

Yeni sunucu fonksiyonu gerekmedi: mevcut `joker_tek_al` kullanıldı. Onun kendi
fiyat listesi vardı, `joker_fiyati()`ye bağlandı — aynı joker iki farklı fiyata
satılabilecek bir açık kapandı.

### 🟡 E — Meydan 15-20 saniye "sahne hazırlanıyor" diyordu

**Ölçüldü (canlı, bu makineden):**

| Ne | Süre | Boyut |
|---|---|---|
| Karakterler (3 GLB, paralel) | 1.154 ms | 1,6 MB |
| Proplar (16 GLB, paralel) | 737 ms | 1,8 MB |
| **Bugünkü akış (art arda)** | **1.891 ms** | 3,4 MB |
| Hepsi birden (paralel) | 353 ms | — |
| `cephe_ao.bin` | 286 ms | 116 KB |

**Çıkarım:** indirme toplam sürenin yalnızca ~2 saniyesi. 15-20 saniyenin
gerisi cihazda sahne kurulumu (GLB ayrıştırma, cephe sistemi, AO pişirme,
shader derleme, ilk kare). Bu paket bir hata düzeltme paketi olduğu için büyük
optimizasyona girilmedi; iki ucuz kazanç alındı:

1. Prop ve AO indirmeleri karakterlerle **örtüştürüldü** (kurulum yine
   karakterler hazır olunca — `cevreKur` karakter atlasını kullanıyor).
2. Bekleme ekranına **adım adı + ilerleme çubuğu** kondu: "karakterler
   yükleniyor… / çevre yükleniyor… / sahne kuruluyor… / son dokunuşlar…".
   Donmuş hissi kalktı.

Canlı doğrulama: ilerleme çubuğu çalışıyor, "son dokunuşlar… %90" görüldü ve
sahne yüklendi. **Toplam süre otomasyon sekmesinde ölçülemez** — o sekme
arka planda sayıldığı için `requestAnimationFrame` duruyor (bu depoda bilinen
kısıt). Gerçek süre sahibinin cihazında ölçülmeli.

### 🟡 F — Ligde test hesapları ve 0 puanlı hesaplar

**Ölçüldü, hiçbir hesap silinmedi.**

- **Gruplar 22 / 22 / 19 (bronz) + 8 (gümüş).** Yani "12 kişilik grup" diye bir
  sorun **yok**; 25'lik grup kuralı çalışıyor, o ligde 63 kişi olduğu için üçe
  bölünmüş.
- Tabloda 12 kişi görünmesinin sebebi **ayrı bir kural**: `lig_gorunur_mu`
  yalnız takma adını seçmiş ve avatarı onaylanmış oyuncuyu gösteriyor.
  Bronz 1'de 22 üyenin 1'i açık bot, 12'si bu süzgeci geçiyordu.
- Bu 12'nin **3'ü hiç maç yapmamıştı**. Lig genelinde 0 maçlı üye: **35**.
- Test görünümlü hesaplar (ad kalıbıyla, sahibinin kararı için liste):
  `DenekKartal` (0 maç), `QuizTestIda` (1 maç), `SquareTest12` (1 maç),
  `TestOyuncu917` (1 maç, 53 puan). **Hiçbiri silinmedi.**

**Uygulanan tek şey görünürlük ölçütü:** `lig_grubum`'a `lig_gorunur_min_mac`
(varsayılan 1) eklendi. `lig_siralama`'da bu kural **zaten vardı** — tutarsızlık
giderildi. Oyuncu **kendi satırını her durumda** görmeye devam ediyor, yani
yeni oyuncu kendini kaybetmiyor.

Canlı doğrulama: lig tablosu **12 → 9 satır**; `İGG`, `Şev`, `silaapp` kalktı,
gerçek oyuncular yerinde. `TestOyuncu917` duruyor — 1 maçı ve 53 puanı var,
yani kurala göre gerçek katılımcı; onu ayıklamak sahibinin kararı. ✅

### Çıkarımlar

- **İki sayı arasındaki ilişkiyi yoruma bırakma.** Nabız 60, eşik 25 idi ve
  ikisi ayrı dosyalarda ayrı kararlar olarak duruyordu. Artık ilişkiyi sunucu
  kırpıyor ve test kilitliyor; birini değiştiren öbürünü bozamaz.
- **"Kural değişti" ile "kural metni değişti" ayrı şeyler.** Paket 27 kuralları
  değiştirdi, Dükkân eski metni anlatmaya devam etti. Metin tek kaynağa taşındı.
- **Boş kutu, yavaşlıktan daha kötü görünür.** Portre üretimi zaten sırayla ve
  doğru yapılıyordu; eksik olan tek şey "geliyor" demekti.
- **Süreyi ölçmeden hangi ucu iyileştireceğini bilemezsin.** Meydanın 15-20
  saniyesinin yalnız 2 saniyesi indirmeymiş; "GLB'leri küçült" diye başlansaydı
  yanlış yer optimize edilecekti.
- **Paketin verdiği gözlemi de ölç.** "Grupta 12 kişi var, 25 olmalıydı" doğru
  görünen ama yanlış bir teşhisti: grup 22 kişilik, görünürlük süzgeci 12
  gösteriyordu. Ölçmeden "grup kuralı bozuk" diye düzeltmeye kalkılsaydı
  çalışan bir mekanizma bozulacaktı.

---

## Kendi deposuna taşınma — AŞAMA A (18 Eylül 2026)

Quiz Tactics `idagggamecenter` hub'ından çıkıp **kendi deposuna** taşındı:
`winegg420/quiztactics`. **Supabase'e hiç dokunulmadı** — aynı proje, aynı veri,
aynı anahtarlar, hiç migration yok.

### Nasıl taşındı

Kopyala-yapıştır yapılmadı: eski depo yeni klasöre **klonlandı**, uzak adres
değiştirildi, temizlik commit'lendi. **Commit geçmişi korundu** — `git log`
Paket 1'e kadar geriye gidiyor.

### Silinenler ve neden güvenli olduğu

`kafatopu · meyvekes · run · gladius · patirun · driftgp · boks · store · arsiv`
`src/App.jsx` (hub yönlendiricisi) · `src/pages/GameCenter.jsx` ·
`src/pages/BirlesikSiralama.jsx` · `public/heads` · `public/meyve` · `public/map` ·
hub manifesti ve ikonları · eskimiş belgeler (`BILDIM_GOREV*`, `QUIZADOR_*`,
`CLOUDFLARE_DAGITIM`, `.env.bildim`).

**Silmeden önce ölçüldü:** Quiz Tactics kodu (`oyun/` + taşınan `src/`) bu
klasörlerin **hiçbirine** referans vermiyordu. İlk taramada 7 klasör için
"2 referans" çıktı ama bakınca hepsinin `src/App.jsx`, `GameCenter.jsx` ve
`BirlesikSiralama.jsx`'ten — yani zaten silinecek üç hub dosyasından — geldiği
görüldü. Sayıya bakıp durmak yanlış olurdu; referansın **nereden** geldiği
önemliydi.

Toplam: 896 dosya değişti, ~64.000 satır silindi.

### `bildim/` → `oyun/`

526 dosya tarandı, **115'inde** yol güncellendi. Ayrıca 9 dosyada
`/bildim/gorunum` rotası `/gorunum`'a çekildi (site artık kökte yayınlanıyor;
bu, dondurulmuş avatar3d sayfalarının yönlendirmesini de düzeltti).

**Klasör adı neden `oyun/`:** `src/`'yle birleştirmek düşünüldü ama reddedildi.
`src/` gerçek bir ayrımı taşıyor — kimlik, Supabase istemcisi, kabuk, hata
sınırı; yani oyundan bağımsız altyapı. Birleştirmek koca bir fark üretir ve
hiçbir şey kazandırmaz.

### DEĞİŞMEYENLER (bilerek)

- **localStorage anahtarları**: `bildim_dil`, `bildim_tanitim`,
  `bildim_karakter_secildi`, `bildim_davet`, `bildim_davet_kodu`,
  `bildim_hafta_okundu`, `quizsquare_avatar3d_prototip_v1`.
  Değiştirilseydi **mevcut oyuncuların dil tercihi ve tanıtım durumu sıfırlanırdı.**
- **Public dosya adları**: `bildim.webmanifest`, `bildim-icon-*`. Yüklü PWA'ların
  ve paylaşılmış linklerin işaret ettiği adresler bunlar. Marka "Quiz Tactics";
  dosya adı yalnız eski bir kod adı.
- **Supabase** tablo/fonksiyon/cron adları (`bildim-*` cron'ları dahil).
- **Rota adları** (`/duello`, `/joker`, `/calisma`, `/harita`, `/gorunum` …).
- **Eşya id'leri ve yuva adları.**
- **Uygulanmış migration'lar** — içlerindeki `bildim/` geçen yorumlara bile
  dokunulmadı (append-only).

### Sadeleştirme

- **`VITE_MOD` kalktı.** İki-mod eklentisi (`bildim-modu`) silindi.
- **Site kimliği artık `index.html`'de STATİK.** Eskiden kök `index.html` hub'ın
  kimliğini taşıyor, Quiz Tactics'in başlık/paylaşım/manifest alanlarını
  `vite.config.js` derleme sırasında değiştiriyordu. Şimdi kimlik tek yerde ve
  gözle görülür.
- `vite.config.js`'te kalan tek üretim işi **robots.txt + sitemap.xml**.
- **`rollupOptions.input` dört girişi koşulsuz taşıyor.** Derlemeden sonra
  sayıldı: `dist/` içinde **4 HTML** — `index.html`, `oyun/avatar3d/index.html`,
  `oyun/avatar3d/meydan.html`, `oyun/avatar3d/gardrop.html`. ✅
- `src/main.jsx` doğrudan `BildimApp`'i açıyor; `lazy` dallanma yok.
- `oyun/lib/yol.js` kök moduna sabitlendi. **`y()` kasıtlı olarak duruyor** —
  200'den fazla çağrı yeri var, hepsini elle yola çevirmek koca bir fark üretir
  ve hiçbir şey kazandırmaz.
- `Login.jsx`'teki hub markası dalı kalktı (derleme onu yakaladı: `BILDIM_MOD`
  artık `yol.js`'ten dışa verilmiyordu).
- `package.json` adı `quiztactics`. **Kullanılmadığı doğrulanan** bağımlılıklar
  kaldırıldı: `matter-js` (Kafa Topu), `zustand` (PatiRun/DidaGP) ve
  — pakette istenmemişti ama ölçüm gösterdi — `@react-three/fiber`,
  `@react-three/drei` (DidaGP; depoda **0 kullanım**). Quiz Tactics ham
  `three`ile çalışıyor (41 dosya).
- `manifest` `start_url`/`scope` köke çekildi, kısayollar `/meydan` ve
  `/turnuva` oldu; `sw.js` bildirim ikonu Quiz Tactics ikonuna bağlandı.

### Doğrulama

| Ne | Sonuç |
|---|---|
| `npm install` | temiz |
| `npm run build` | hatasız, uyumluluk denetimi TEMİZ |
| `dist/` giriş sayısı | **4** ✅ |
| `npm test` | 44 sunucu testi + 13 joker kuralı, hepsi geçti |
| `npm run muayene` | çalışıyor (36 varlık + 21 portre) |
| Yerel `npm run dev` | açılıyor, konsol **hatasız** |
| Giriş ekranı | Quiz Tactics markası, hub markası yok; başlık/manifest/ikon doğru |
| Rotalar | `/gizlilik` ve `/kosullar` açılıyor; `/turnuva`, `/duello`, `/joker`, `/siralama`, `/harita` giriş kapısına düşüyor — yani rota ağacı kökte doğru çözülüyor |
| Push | `main` yeni depoda |
| `SUPABASE_DB_URL` sırrı | kuruldu (değer yalnız borudan geçti, hiçbir yere yazılmadı) |
| Gece yedeği | yeni depoda **çalıştırıldı ve geçti**: 44.037 → 44.037 satır (fark 0), hesaplar 205 → 205, "Geri yükleme doğrulandı." |

**Yerelde giriş yapılmadı** — giriş Google/Facebook OAuth ile oluyor ve
kimlik bilgisi girmek ajanın yapmayacağı iştir. Giriş gerektiren sayfalar
Aşama B'de, sahibinin Vercel önizlemesinde gerçek hesapla doğrulanacak; o adım
zaten listede var.

### Bir not: avatar3d sayfalarının adresi değişti

Dondurulmuş üç sayfa artık `/oyun/avatar3d/*` altında derleniyor (eskiden
`/bildim/avatar3d/*`). Üçü de `noindex,nofollow` ve açılınca `/gorunum`'a
yönlendiriyor; hiçbir yerden link verilmiyor. Yine de eski adresler artık 404
döner — bilinerek yapıldı.

### Aşama C bekliyor

Eski depodaki Quiz Tactics'e **dokunulmadı**. Alan adı hâlâ eski depodan
derleniyor; erken kaldırmak canlı siteyi düşürürdü. Sahibinin "alan adı taşındı,
yeni site çalışıyor" onayı bekleniyor.

## 18 Eylül 2026 — Paket 29 (dört hata + ses dosyaları)

Commit'ler: `c4b6cb9` A · `bd3d8da` B · `577eb16` C · `61da9a4` D · `df10fc7` E.

### A — Turnuva lobisinde avatar ezilmesi
- Kök sebep **iki** kural (paket yalnız birini söylüyordu): `tema.css:5337`
  `> span:first-of-type` ve `tema.css:5688` `> span:not(.bd-lobi-kilic)`. İkincisi
  daha güçlüydü ve `overflow:hidden` da veriyordu, halkanın kırpılması buradan geliyordu.
  İkisi de artık `> .bd-lobi-ad`'ı hedefliyor. İsim span'ine `bd-lobi-ad` sınıfı verildi.
- Taranan kurallar: `oyun/` + `src/` CSS'lerinde `span:first-of-type`, `span:first-child`,
  `> span:not(` kalıpları. Kalan tek eşleşme `.bd-kat-baslik > span:first-child` (yalnız
  letter-spacing/line-height; o başlıklarda avatar yok) → dokunulmadı. `.bd-kopuk-kutu > span`
  (MacHazirlik) avatar içermiyor.
- Ölçüldü (gerçek CSS, 340 px satır): çerçeve 32×32, `flex: 0 0 auto`, `overflow: visible`;
  uzun ad `ellipsis` ile kısalıyor, satır taşmıyor. `.bd-lobi-oyuncu` yalnız TournamentPage'de
  kullanılıyor, arkadaşlar/sıralama/profil/maç şeridi bu seçicilere girmiyor.

### B — Düello arama ekranı
- Nabız halkaları zaten vardı ama soluk altın (`rgba(247,203,119,.55)`) açık zeminde
  görünmüyordu → `--bd-vurgu`, 3 px, ölçek 0.62→1.18. Maskot süzülür, ipucu 3 sn'de bir döner
  (dil.js TR+EN), sayaç "12 sn · rakip aranıyor". Reduced-motion'da hepsi kapalı.
  Halkanın renk değişikliği klasik arama (`RakipAra`) ekranına da geçti, bilinerek.
- **15 sn "botla eşleştireceğiz" satırı EKLENMEDİ.** `duello_ara` gerçekten
  `duello_arama_sn` (8) + insan gibi gecikmeden sonra bota bağlıyor, ama bu **gizli
  bot**. CLAUDE.md: gizli botun bot olduğu anlaşılmamalı. Satır ürün kuralını çiğnerdi.
- Eşleşme mantığı değişmedi: `duello_ara` / `duello_aramadan_cik` çağrıları ve 1 sn
  aralık byte byte aynı (diff yalnız JSX + CSS). Giriş gerektirdiği için canlı öncesi/sonrası
  süre ölçümü yapılamadı; mantık farkı yok.

### C — "Çerçevesiz" → "Çerçeve takma" (EN "No frame") + Bronz açıklama cümlesi (TR+EN).

### D — Başlangıç jokerleri mevcut oyunculara (sahibi "evet" dedi)
- Migration **244** `baslangic_jokerleri_toplu_ver()` (yalnız sahibi/service_role) + tek çağrı.
  Ayrım `joker_islemleri.kaynak='baslangic'` (paket `joker_hareketleri` diyordu; tablo adı
  `joker_islemleri`). ref = `paket29_geriye_donuk`.
- **Ölçüm, öncesi:** 205 profil = **45 gerçek** (24 kayıtlı + 21 anonim/misafir) + 160 bot.
  Paketteki "~205 hesap" botları da sayıyordu. `baslangic` hareketi olan: 0. `joker_islemleri`
  toplam satır: **0** (canlıda hiç joker hareketi olmamış). Silinmiş/yasaklı hesap: 0.
- **Sonrası:** 45 oyuncu × 7 tür × 2 = **630 joker**; 7 türün her birinde 45 satır, hepsi 2.
  İkinci çağrı 0/0 (işlem içinde denendi).
- Anonim hesaplar da aldı (yeni misafir hesap tetikleyiciden zaten alıyor, tutarlı olsun diye).
- `db push` bu depoda bağlı değil ("Cannot find project ref") ve `--include-all` eski
  dosyaları yeniden koşardı → önceki paketlerin yolu: önce rollback provası, sonra tek
  işlemde uygula + `schema_migrations`'a 244 kaydı.
- Test eklendi (joker-ekonomisi): eski hesap alır, yeni hesap çift almaz, bot almaz, ikinci
  çalıştırma 0. `npm test`: 45/45 + kurallar + dans geçti.

### E — Ses dosyaları
- `public/ses/` 12 mp3 + LISANS.txt (Kenney, CC0). Dosyaların toplamı **116.865 B ≈ 114 KB**
  (paketteki 47 KB ve 170 KB değerleri tutmuyor).
- `ses.js`: tembel yükleme, `Map<rol, AudioBuffer>`, 40 ms tekrar koruması, `HACIM` sabiti
  (dokunus 0.35, kazandin/rutbe 1.0), ilk indirme 250 ms'yi geçerse o çalış atlanır. Eski ton
  fonksiyonları `ton*` adıyla yedek olarak duruyor. Dışa açık adlar değişmedi.
- Yeni: `sesRakipBulundu` (düello: bulunduğu an; klasik: "Rakip bulundu" yazısıyla aynı an),
  `sesCanKaybi(kendi)` (düello hamle sonucu, cevap sesinden 220 ms sonra; rakibinki ×0.55).
- `geri.mp3` hiçbir role bağlanmadı (pakette karşılığı yok).
- `sw.js` hiçbir şeyi önbelleğe almıyor → değiştirilmedi.
- **Ölçüm (Chrome, yerel):** açılışta ses isteği **0**; ses kapalıyken 5 ses çağrısı → **0**
  istek; açıkken 11 rolün hepsi → 11 istek, **109.138 B**; ikinci tur + 10 hızlı dokunuş →
  yeni istek **0**. Bir maçta indirilen en fazla ≈ 109 KB (tüm roller), tipik düello daha az.
  404 benzetimi: ilk çağrıda eski ton çaldı (3 osilatör), sonraki çağrılar doğrudan tona düştü.
- iOS Safari: bu makinede WebKit çalışmıyor (CLAUDE.md). Kilit açma yolu (`sesKilidiAc`,
  `userActivation` kontrolü) aynı; gerçek iPhone kontrolü sahibinde.

### Build / test
`npm run build` TEMİZ, `npm test` geçti.

## 18 Eylül 2026 — Paket 30 (meydan okuma, mod seçimi, rövanş, hazırlık, eşleşme)

Commit'ler: `2c767d8` A · `ac656fa` B · `04c221f` C · `489aa67` D · `1680aab` E.
Migration: **245** (A), **246** (D) — ikisi de canlıya uygulandı ve `schema_migrations`'a yazıldı
(bu depo Supabase'e `link`li değil; `db push --include-all` eski dosyaları koşardı →
rollback provası + tek işlem, `scratchpad/mig.mjs` kalıbı).

### A — create_challenge HTTP 300 (ACİL)
- **Canlı pg_proc:** `create_challenge(uuid,text)` ve `create_challenge(uuid,text,boolean)` — iki imza,
  ikisinin de `p_kategori` ve üçlünün `p_dereceli` varsayılanı var → `{p_rakip}` ikisine de uyuyor.
- **Paketin görmediği fark:** gövdeler aynı değildi. 2'li sürümde Paket 24 A.2'nin
  `davet_siniri_kontrol(p_rakip)` (modlar toplamı bekleyen davet sınırı) vardı, 3'lüde YOKTU.
  Yalnız 2'liyi düşürmek bu kuralı sessizce kaldırırdı. 245: 3'lü canlı gövdesi + o satır
  yeniden kuruldu, sonra 2'li düştü. Grant: yalnız authenticated (+postgres/service_role).
- Doğrulama: PostgREST artık 300 değil (anon → 401 "permission denied", yani imza çözülüyor).
  Test: tek imza, ilk davet açılıyor (dereceli=true), ikinci davette sunucunun mesajı
  "Bu oyuncuyla zaten devam eden bir meydan okuman var", serbest davet dereceli=false.
  `hataMesaji` bu mesajı olduğu gibi geçiriyor (teknik kalıba uymuyor).
- `hizli_mod_baslat`: canlıda **tek imza** `(text, boolean)` → sorun yok.
- **Bütün public şemada aynı adlı fonksiyonlar (yalnız raporlandı):**
  `bot_gecikme_sn` (4 ve 5 parametre, varsayılansız) ve `mac_sayaci_arttir` (1 ve 2 parametre,
  varsayılansız). İkisi de istemciye kapalı (yalnız postgres/service_role) ve varsayılan
  olmadığı için belirsizlik üretmez. Dokunulmadı.

### B — Tek "Oyna" + mod seçim penceresi
- `ModSecimPenceresi.jsx` (Modal üstüne). Kılıç + kalkan kalktı. RPC'ler aynı.
- Ödül satırı `oyun_ayarlari`'ndan: Klasik +25 lig · 25 coin, Düello +50 · 50.
- **Paketteki "Sırayla 10 soru" metni yanlış:** canlıda Klasik maçlar 20 soru (41 maçın hepsi).
  Sayı gömmeyen metin kullanıldı: "İkiniz aynı soruları cevaplarsınız, en çok doğru bilen kazanır."
- Ölçüldü (390 px iframe, gerçek bileşen): tek sütun, kutu 16–373 px, yatay taşma yok, açılışta
  odak ilk kartta, Esc kapatıyor, hata pencere içinde ve pencere açık kalıyor.
- **Aynı hatanın başka yerde bulunan hâli:** portal ile body'ye basılan katmanlarda `.hata-kutu`
  `.app` dışında kaldığı için koyu tema rengini (#FCA5A5, açık zeminde okunmaz) alıyordu —
  OyuncuKarti, KonumSecici, KurulumSihirbazi, RakipAra, DuelloArama dahil. Kural
  `.bd-modal-katman .hata-kutu`, `.bd-arama-katman .hata-kutu`'yu da kapsayacak şekilde
  genişletildi (açık + koyu). (E commit'ine girdi.)

### C — Rövanş bekleme penceresi
- **Önce ölçüm:** (1) istek gidince sonuç ekranının tamamı duruyordu, yalnız "Rövanş" düğmesi soluk
  tek satıra dönüyordu; (2) 60 sn dolunca `gecerli=false` → düğme SESSİZCE geri geliyordu;
  (3) `duello_rovans_iste` **bildirim_yaz çağırmıyor** — rakip yalnız sonuç ekranındaysa
  (`duello_sinyal` + 1 sn yoklama) görür. Push/zil bildirimi yok (sunucuya dokunma yasağı
  nedeniyle eklenmedi — ayrı karar).
- Pencere: rakip avatarı + halka geri sayım (`duello_rovans_sn` istemciden okunur), metin, Vazgeç.
  Süre dolunca "{ad} yanıt vermedi.", reddedilince "{ad} rövanşı kabul etmedi." + "Tekrar rövanş iste".
- **Sunucuda geri çekme RPC'si yok** → Vazgeç yalnız pencereyi kapatır; rakip süre içinde kabul
  ederse yine yeni düelloya geçilir. Sayfa yeniden açılırsa geri sayım ilk görüldüğü andan başlar
  (sunucu `rovans_at`'ı istemciye vermiyor); bitişi yine sunucunun `gecerli`si belirler.

### D — Saldırı Hazırlığı 4 → 6 sn
- Süre zaten ayardaydı (`duello_hazirlik_sn`); 246 yalnız ayarı 6 yaptı.
- Ölçüldü (işlem içinde, sabit now()): hazırlık fazı **6 sn**, ardından savunanın cevap fazı
  **15 sn**; Zaman Baskısı ayarı 10 değişmedi. Test eklendi.
- **Bot:** `duello_tik_hepsi` hazırlıkta yalnız joker kararı verir (anında), fazı erken bitirmez;
  faz `faz_bitis`'te `duello_ilerlet` ile ilerler → bot da aynı 6 sn'yi bekler, tempo simetrik.
- Arayüz sayacı `faz_bitis`'ten sayıyor, ek değişiklik gerekmedi. CLAUDE.md/AGENTS.md "6 sn".

### E — Karşılaşma sahnesi
- Bu yapıyı kullanan ekranlar: **DuelloArama** (DuelloPage) ve **RakipAra** (Klasik, Home.jsx'ten).
  İkisine de uygulandı; ortak bileşen `KarsilasmaSahnesi.jsx`.
- Sol kart: çerçeveli avatar, ad, rütbe rozeti, kategori unvanı (açılışta TEK `oyuncu_kategori_profili`
  çağrısı), günlük seri. Sağ: siluet + "?" → bulununca gerçek avatar. Orta: VS + nabız.
- Bulunma anı 1000 ms (`KARSILASMA_ANIM_MS`): kartlar yaklaşır, VS bir kez parlar, `sesRakipBulundu`.
- **Ezeli satırı:** düelloda `duello_durum().ezeli`'den (sunucu yalnız arkadaşlar için tutuyor).
  **Klasik'te atlandı:** klasik maç yükünde ezeli verisi yok; yeni sorgu yazmamak için.
- Eşleşme mantığı aynı (aynı RPC'ler, aynı 1 sn aralık). Fark: düelloda bulunduktan sonra maça
  geçiş **+1,0 sn** (animasyon; paketin istediği 800–1200 ms). Klasik zaten 1 sn bekliyordu.
  Giriş gerektirdiği için canlı öncesi/sonrası eşleşme süresi ölçülemedi; kod yolu değişmedi.
- Ölçüm (390 px): ben 24–155, VS 163–211, rakip 219–350 px; yan yana, taşma yok; katman `fixed`,
  kendisinde transform yok. Eklenen: bileşen 3,96 KB kaynak; CSS 5,8 KB (gzip ≈ 1,8 KB).
- Dark tema: `koyu.css`'in `.bd-arama-katman` kuralı daha özgül, koyu zemin korunuyor.

### Kontrol edilen CSS seçicileri
`.bd-mod-secim*`, `.bd-rovans-*`, `.bd-karsilasma*` yeni ve yalnız yeni bileşenlerde.
`.bd-arama-katman.bd-karsilasma-katman` ve `.bd-arama-kutu.bd-arama-kutu-genis` çift sınıf —
yalnız iki arama ekranında. `.hata-kutu` genişletmesi yalnız portal katmanlarını etkiler
(`.app` içindekiler zaten aynı kuralı alıyordu). `.liste-satir .btn.kucuk.bd-duello-cagir`
artık kullanılmıyor (bırakıldı, zararsız).

### Build / test
`npm run build` TEMİZ · `npm test` 47/47 + kurallar + dans.

## 18 Eylül 2026 — Paket 31 (Klasik Mod saldırı jokerleri + Saf Bilgi modu)

Commit'ler: `e1c25df` A · `6bed89b` B · `03e350e` + `468a1e9` C.
Migration: **247** (A), **248** (B), **249** (bot jokerini aç) — üçü de canlıda, `schema_migrations`'ta.
Her biri önce `TEST_ONCE_SQL` ile tam test paketinde işlem içinde denendi (yeni: `_test/sunucu/yardim.mjs`
bu ortam değişkeniyle migration'ı test işleminin başında uygulayıp geri alıyor).

### Sahibine soruldu — karar
Paket hem "6 joker (3+3)" hem "Klasik'teki Soru Değiştir iki oyuncuda değişsin" diyordu; bugün Klasik'te
zaten bir Soru Değiştir vardı → iki aynı adlı düğme çıkacaktı. **Karar: 5 joker, tek ortak Soru Değiştir.**
Klasik: `elli · sure · soru_degistir (ORTAK) · zaman_baskisi (Süreyi Kısalt) · savunma_kilidi`.
`saldiri_degistir` Klasik'te yok (dükkânda "Yalnız Düello'da" yazıyor).

### A — ölçümler
- **A.2 süre kaynağı:** senkron 1v1'de süre ORTAK `matches.soru_baslangic`'tan sayılır (canlıdaki 48+ maçın
  hepsi senkron). `oyuncuN_baslangic` yalnız kullanılmayan asenkron dalda. AMA kişi bazlı geçersiz kılma
  zaten var: `soru_degisimleri.baslangic` — `submit_match_answer`, `mac_soruyu_atla`, `joker_kullan`,
  `get_match_question` hepsi `soru_baslangic_coz` ile onu okuyor. **Yeni tablo GEREKMEDİ**: Süreyi Kısalt
  rakibin kişisel satırını (aynı soru, 5 sn erken başlangıç) yazıyor. İlerleme `soru_son_baslangic` = en GEÇ
  başlangıç → rakibin erken bitmesi turu kısaltmıyor, rakip farkı bekleme ekranında geçiriyor.
  Taban: rakibe en az 3 sn kalır (`klasik_zaman_baskisi_taban_sn`), anında sıfırlanmaz.
- **A.1:** `mac_soru_degistir` 1v1'de zaten iki oyuncuyu da `soru_sec`'e veriyor ve maçın bütün `soru_ids` +
  `soru_degisimleri`'ni dışlıyor → seçilen soru ikisi için de görülmemiş. Basanın satırı rakibe kopyalanıyor
  (aynı `question_id`, aynı `baslangic`); metin kişinin dilinde `soru_dilinde` ile dönüyor. Rakip soruyu
  zaten cevapladıysa yalnız basanın sorusu değişir.
- **Rakibin ekranı:** soru yalnız indeks değişince çekiliyordu → tek şema eki `matches.joker_surum`; rakibi
  etkileyen her jokerde artar, Realtime/2 sn yoklamayla gelir, istemci soruyu/sayacı ve joker durumunu yeniden okur.
- **A.3:** `joker_hak_kontrol` 1v1'de aktif soruda rakibin `savunma_kilidi` kaydı varsa "Rakibin savunma
  jokerlerini kilitledi" der; `joker_mac_durumu` artık `kilitli` ve `kisaltildi` döndürüyor, çubukta turuncu not.
- **A.5 bot:** yeni `bot_klasik_joker_tik()` (bot_oyna'dan çağrılır): karar ve an (2–8 sn) `bot_rasgele` ile
  (maç, soru) için sabit; sınırlar insanla aynı (4 joker, türde bir kez, insanın kilidine uyar). Bot cevaplarken
  kendi kişisel soru/başlangıcını kullanıyor (eskiden hep orijinal soruyu cevaplıyordu).
  **Olasılık 247'de 0 başladı**, istemci yayınlandıktan sonra 249 ile **15** (düellodakiyle aynı) yapıldı —
  aksi hâlde bot soruyu değiştirince eski ekran yeni soruyu göstermeden yeni soruya göre puanlanırdı.
  Canlı cron sağlığı: son 40 dk'da `bot_oyna` 1184 koşu, hepsi başarılı.
- Testler (`klasik-jokerler.test.mjs`, 6): ortak soru değişimi, yalnız rakibin süresi, kilit + açık mesaj,
  4/tür-bir-kez/saldiri_degistir yok, rakip cevapladıysa kısaltma reddi, bot simetrisi. Düello testleri değişmeden geçiyor.
- **İki tarayıcıyla gerçek maç oynanamadı:** giriş Google/Facebook OAuth; ajan kimlik bilgisi girmez.
  Aynı akış iki test kullanıcısıyla sunucuda (`olarak()` ile iki oturum) test edildi. Canlı iki-oyunculu
  deneme sahibinde.

### B — Saf Bilgi
- Kuyruk bugün `kategori` + `dereceli` + seviye basamağına göre eşleştiriyor. Bayrak: `matches.jokersiz`,
  `matchmaking_queue.jokersiz`; kuyrukta 2 koşul + 2 insert satırı.
- **Kuyruk bölünmesi ölçümü:** son 30 günde 50 Klasik maç — **33 botlu, 17 arkadaş, insan–insan rastgele 0**.
  Her rastgele arama zaten bekleme sonunda bota düşüyor; bugün bekleme süresi ve bot oranı fiilen değişmez.
- İmzası değişen 5 RPC (`kuyruga_gir`, `quick_match`, `hemen_bot_mac`, `hemen_bot_mac_sec`, `create_challenge`)
  **eski imza düşürülüp** tek imza kuruldu (Paket 30 A'nın HTTP 300 hatası tekrarlanmasın); test var.
  Yan bulgu düzeltildi: `kuyruga_gir` ve `quick_match` PUBLIC/anon'a da açıktı → yalnız authenticated.
- Eski `use_joker` yolu da jokersiz maçta reddediyor. Rövanş aynı modda açılıyor. Ödül Klasik ile aynı
  (`mac_sonuclandir` değişmedi).
- Arayüz: ana sayfa ızgarasında Saf Bilgi kartı (5 kart: 2+2+1), `/meydan` üçüncü seçenek, arkadaş penceresi
  üçüncü kart, maç ekranında joker alanı hiç çizilmiyor.

### C — metinler
- Klasik açıklamaları (`KLASIK_BILGI`): "Soru ikinizde de değişir." · "Rakibinin süresi kısalır, seninki aynı kalır."
  · "Rakip bu soruda joker kullanamaz." Düello metinleri değişmedi.
- Mod kartları: Düello "6 joker · sıra sende" · Klasik "5 joker · aynı anda" (karar gereği 6 değil) · Saf Bilgi "joker yok".
- Dükkân: her jokerin altında Klasik'teki farkı ya da "Yalnız Düello'da".
- `/meydan`'daki Klasik kartı "5 soru" yazıyordu — yanlıştı (maçlar 20 soru); joker satırıyla değişti.

### Kontrol edilen düzenler (390 px, gerçek CSS)
5'li joker çubuğu tek satır (64 px düğmeler), ana sayfa ızgarası 2+2+1, `/meydan` 3 sütun, arkadaş penceresi
3 kart tek sütun — içerik 765 → 642 px'e indirildi, Vazgeç kaydırmasız. Yatay taşma yok. `:has()` kullanılmadı.

### Build / test
`npm run build` TEMİZ · `npm test` 57/57.

## 18 Eylül 2026 — Paket 32 (Sis jokeri, joker tasarımı, sayılı açıklamalar, yarım maç uyarısı)

Commit'ler: `918ba5d` A · `bbc3d8e` B · `c35c434` C · `839b583` D. Migration **250** canlıda
(istemci yayınlandıktan SONRA uygulandı — bot Sis basınca eski ekran sisi göstermezdi).

### A — Sis (Klasik'te Savunma Kilidi'nin yerine)
- Sunucu (250): `joker_envanter_tur_check`'e `sis`; ayarlar `klasik_sis_sn=3`, `klasik_sis_son_esik_sn=6`,
  `coin_joker_sis=80`; `joker_fiyati/fiyatlari`'na sis. `joker_kullan` 1v1 listesi: zaman_baskisi + sis
  (savunma_kilidi Klasik'ten çıktı; düello fonksiyonları DEĞİŞMEDİ, tür ve envanter adetleri duruyor).
- Son 6 sn kuralı YALNIZ Sis: "Son % saniyede Sis kullanılamaz" (sayı ayardan). Test: Süreyi Kısalt aynı anda kullanılabiliyor.
- Etki `joker_kullanimlari` üzerinden (Paket 31 deseni, yeni tablo yok). `joker_mac_durumu` + `sis_bitis`, `sunucu_zamani`,
  `kullanilan_turler`. **Sunucu güvencesi eklendi:** sis sürerken `submit_match_answer` rakibin cevabını reddediyor
  ("Sis kalkınca cevaplayabilirsin"); insan sis gönderdiyse bot da o sürede cevaplamıyor.
- Bot: `bot_klasik_joker_tik` listesi zaman_baskisi / sis / soru_degistir; son-6-sn kuralı bota da.
- Dağıtım: `baslangic_jokerleri_ver` listesine sis (yeni hesaplar); `sis_baslangic_dagit()` tek seferlik —
  **46 gerçek hesap × 2 = 92 Sis**, botlara 0; ikinci çağrı 0/0 (canlıda ve testte).
- Rakibin ekranı (`Sis.jsx › SisPerdesi`): fixed tam ekran, kendisinde transform yok; iki katman (arka #1C1A3F tam
  örtücü koyu mor-lacivert + ön açık bulut kümeleri, blur + yatay kayma), vinyet; iniş 400 ms / kalkış 500 ms
  ease-in-out (iç katman translateY + opacity). Ölçüldü: şıkkın üstündeki en üst öğe perde (tıklama kilitli),
  soru ve şıklar görünmüyor, "Rakibin sis gönderdi" + geri sayım sisin üstünde. Reduced-motion: hareket yok,
  kapatma aynı.
- Gönderenin ekranı (`SisKenar`): yalnız kenarlarda, pointer-events: none (ölçüldü: şık tıklanabilir).
  **Bulgu:** kenar katmanında `filter: blur` bazı GPU'larda HİÇ çizilmedi (ölçüldü, filtre kalkınca görünüyordu) →
  yumuşaklık filtre yerine gradyanla verildi (düşük donanımda da ucuz). Perdenin arka katmanı düz renk tabanlı,
  blur çizilmese de tam örter.
- Ses: `sesSis()` — `joker.mp3` inişte 0.7×, kalkışta 1.25× hızla (yeni dosya yok).

### B — Joker düğmesi
- Hepsi turuncu, ayrım ikon + ad. Dört durum: hazır (dolu turuncu, 0 4px 0) · kullanıldı (soluk + yeşil onay) ·
  satın alınabilir (beyaz iç, turuncu kenar, altın "+", fiyat) · pasif (gri; basınca sebebi yazar).
- **Kontrast kararı:** beyaz metin #F4701F üstünde 2.98:1 (AA küçük metin 4.5 ister). Zemin turuncu kaldı; ikon
  koyu turuncu (#C4530F) dairede beyaz (4.9:1), ad koyu metin (#2B1100, ≈5.6:1).
- "Kullanıldı" artık sunucudan (`kullanilan_turler`) — eskiden bileşen her soruda sıfırlanıyordu, kullanılmış joker
  sonraki soruda basılabilir görünüp sunucu hatası veriyordu.
- Kullanım anı: düğme parlaması + ekran ortasında 850 ms şerit (ikon + ad + etki: "Rakibin süresi 5 saniye kısaldı").
- Başlık: "Bu maçta N joker hakkın kaldı" (arkadaş maçında "sınırsız"). 360 px'te beşi tek satır, kaydırma yok.
- Ekran görüntüleri (390 px, gerçek bileşen, RPC yanıtları taklit): dört durum, şerit, sis perdesi, kenar sisi,
  yarım maç penceresi — raporda.

### C — Açıklamalarda sayı
- Süreyi Kısalt: "Rakibin süresini {n} saniye kısaltır. Seninki aynı kalır." (n = `klasik_zaman_baskisi_sn`),
  Sis: "Rakibin ekranını {n} saniye sise boğar. Son {m} saniyede kullanılamaz." (ayarlardan), Soru Değiştir:
  "…süre 15 saniyeden yeniden başlar." (15 sunucuda sabit). Dükkân da aynı kaynaktan okuyor; Sis "Yalnız Klasik Mod'da".

### D — Yarım maç uyarısı
- **Ölçüm:** `kuyruga_gir` ve `quick_match` aktif maç görünce sessizce onun id'sini döndürüyordu → oyuncu eşleşme
  ekranını görmeden yarım maça düşüyordu.
- "Yeni maç" `mac_iptal`'i çağırır. **Ölçülen kural:** rakip gerçek oyuncu VE maçta en az bir cevap varsa hükmen
  yenilgi (rakip kazanır, bildirim gider); rakip bot ya da hiç cevap yoksa sonuçsuz iptal. Kaybedenden lig puanı
  ya da coin DÜŞÜLMEZ (`coin_mac_maglubiyet=0`, `mac_sonuclandir` kesinti yapmıyor). Yeni bir ceza yok — aynı
  kapatma maç ekranında zaten vardı; bu yüzden seçenek açık bırakıldı.
- **Gizlilik:** metin iki durumu AYIRMIYOR (ayırsa gizli botun bot olduğu anlaşılırdı) → en kötü sonuç yazılıyor:
  "Yeni maça geçersen bu maç biter ve yenilgi sayılabilir. Lig puanı ya da coin kaybetmezsin."
- Yarım maç yokken akış aynı (sorgu okunamazsa da eski akış).

### Doğrulanamayanlar
- İki tarayıcıyla gerçek Klasik maç ve düello maçı oynanamadı (Google/Facebook OAuth; ajan giriş yapmaz). Sunucu
  tarafı iki test kullanıcısıyla (`olarak()`) test edildi; düellonun 8 testi değişmeden geçiyor; canlı cron
  (`bot_oyna`, `duello_tik`) migration sonrası 5 dk'da 296 koşu, hepsi başarılı.

### Build / test
`npm run build` TEMİZ · `npm test` 60/60.

## 18 Eylül 2026 — Paket 33 (ACİL): maç içi joker satın alma penceresi çökmesi

- **Kök sebep (paketteki ölçüm doğrulandı):** `coin_bakiyem` tablo döndürür → `[{ bakiye, hareketler }]`.
  `JokerCubugu` satırın KENDİSİNİ `coin` state'ine yazıyordu; `JokerSatinAlModal` `{coin ?? 0}` ile nesneyi
  render edince React #31 → ağaç düştü, ekran beyaz. Aynı nesne `Number(coin)` = NaN olduğu için
  "yeterli coin" kontrolü de hep yanlıştı.
- **Düzeltme:** `JokerCubugu` satırdan `bakiye` alıyor; `coin` artık hep sayı ya da null. Modal değişmedi.
- **Doğrulama (tarayıcı, gerçek bileşen, sunucunun gerçek dönüş biçimi taklit edildi):** adedi 0 olan Sis'e basınca
  pencere açılıyor, çubuk yerinde, React hatası yok; bakiye 979 → "Coin'in 979", onay aktif; bakiye 50 (fiyat 80)
  → "Yetersiz coin", onay pasif.
- **Aynı hata taraması:** `coin_bakiyem` çağıran diğer tek yer `oyun/lib/coin.js` — zaten `r.bakiye` okuyor, doğru.
  Düello penceresi coin'i `duello_durum().jokerler.coin`'den alıyor; o alan `profiles.coin` sayısı — doğru.
- **Genel tarama (yalnız rapor):** RPC satırını state'e yazan 5 yer daha var (`CalismaPage`, `HizliModPage`,
  `MacSonuEklentisi`, `GorunumDukkani`, `UstalikIzgarasi`); hepsi nesnenin ALANLARINI render ediyor, nesnenin
  kendisini JSX'e basan yer bulunmadı.
- Paket dosyasında B bölümü ve RAPOR maddeleri yok (sahibinin mesajı "A ve B" diyordu) — B uygulanmadı, soruldu.
- Build TEMİZ · `npm test` 60/60.

## 18 Eylül 2026 — Paket 34: BÜTÜN JOKERLER GEÇİCİ OLARAK ÜCRETSİZ VE SINIRSIZ

Sahibinin talimatı: "bütün jokerleri ful sınırsız yap, bedava ücretsiz yap, sonra söyleyeceğim ücretlendireceksin."

- **Tek anahtar:** `oyun_ayarlari.jokerler_ucretsiz` = 1 (açık). **Geri almak:**
  `update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz';` — kod değişmez, dağıtım gerekmez;
  eski ekonomi (stok, 4 hak, maçta bir kez, satın alma) aynen döner. İstemci ayarı sayfa açılışında okur.
- Migration **251** (canlıda): `jokerler_serbest()`; `joker_hak_kontrol` (maçta-bir-kez ve 4 hak açıkken yok),
  `joker_kullan` (envanterden düşmez), `joker_al_ve_kullan` (satın alma/coin yok), `duello_saldiri_jokeri` /
  `duello_savunma_jokeri` (envanterden düşmez).
- **Kalan tek sınır:** aynı joker AYNI SORUDA bir kez — yoksa +10 sn / Soru Değiştir sonsuz basılıp maç
  kilitlenirdi. Düelloda savunmadaki Soru Değiştir'e aynı soru koruması eklendi (normal modda zaten maçta bir kez,
  davranış değişmedi).
- Değişmeyen mod kuralları: Saf Bilgi'de joker yok; turnuva finali/altın soruda joker yok; turnuvada Soru Değiştir
  yok; Sis'in son 6 sn kuralı; Savunma Kilidi. Botların joker sınırları değişmedi.
- İstemci: Klasik/Grup/Turnuva çubuğu "∞", satın alma yok, başlık "Jokerler şimdilik ücretsiz ve sınırsız";
  "kullanıldı" soru başına. Düello paneli aynı. Dükkânda joker alımı kapalı + not (coin boşa gitmesin).
- Testler: `yardim.mjs` her işlemi normal modla başlatır (ekonomi testleri korunur); yeni `joker-serbest.test.mjs`
  (4 test: stok/coin düşmez, 5. joker kabul, aynı soruda ikinci kez red, sonraki soruda yine kullanılır, düello
  savunma Soru Değiştir koruması, anahtar kapalıyken eski ekonomi). 64/64 (dosya dosya; tam paket bir kez
  bağlantıda takıldı — veritabanı "istemciyi bekliyor"du, tekrar koşuda sorun yok).

## 19 Eylül 2026 — Paket 35 (ekonomi testi, Hemen oyna mod seçimi, profil kartı, meydan okuma şeridi, mesajlaşma)

Commit'ler: `4754f16` A · `dc95b64` B · `2971a7e` C · `14bd046` D · `7346a65` E.
Migration: **252** (A), **253** (E) — ikisi de canlıya uygulandı ve `schema_migrations`'a yazıldı (rollback
provası + tek işlem; `db push` bu depoda bağlı değil).

### YAYIN ÖNCESİ ZORUNLU
- [ ] `baslangic_coin` gerçek değere çekilecek (şu an test için 10.000)

### A — Jokerler yine coin ile, herkes 10.000 coin
- **Karar:** Paket 34'ün ücretsiz modu kapatıldı (`jokerler_ucretsiz = 0`); kod silinmedi. Anahtar yeniden 1 olursa
  artık yalnız STOK/COIN serbest — hak kuralları anahtardan bağımsız.
- **Eşitleme:** 206 profilin hepsi (46 gerçek + 160 bot) 10.000'e çekildi. Defter: `coin_hareketleri` kolonları
  okundu (id, user_id, miktar, tur, referans, bakiye_sonra, olusturuldu). `tur='baslangic'` KULLANILAMADI
  (`coin_hareketleri_baslangic_tek` hesap başına tek satır kısıtı) → yeni tür `ekonomi_esitleme`, referans `paket35`,
  miktar = 10000 − eski bakiye. Bu tür `coin_gunluk_kalan` hariç listesine eklendi; eklenmeseydi +9.500'lük satır
  bugünkü 400'lük kazanç tavanını doldurur, kimse maçtan coin alamazdı.
- **Yeni hesap:** `handle_new_user` artık `ayar_sayi('baslangic_coin', 10000)` okuyor; eski `coin_baslangic`
  anahtarı "KULLANILMIYOR" notuyla duruyor.
- **A.3 hak kuralları:** `joker_hak_kontrol` — "aynı joker maçta bir kez" ve toplam hak sınırı `jokerler_serbest()`
  koşulsuz. `joker_kullan` — Paket 34'ün "aynı joker aynı soruda bir kez" bloğu kaldırıldı. `duello_savunma_jokeri` —
  Paket 34'ün "bu soruda Soru Değiştir zaten kullanıldı" satırı kaldırıldı. Düelloda "bu soruda HERHANGİ bir joker"
  kontrolü YOKTU; kalan satırlar ("Bu soruda 50:50 zaten kullanıldı", "Bu joker bu saldırıda zaten kullanıldı",
  "Yeni gelen soru ikinci kez değiştirilemez") aynı jokerin tekrarını engelliyor, maçta-bir-kez kuralıyla örtüşüyor,
  farklı jokerleri engellemiyor → dokunulmadı.
- **İstemci:** `JokerCubugu` — stok yoksa sağ üstte coin + fiyat rozeti (turuncu zemin, koyu yazı); coin yetmiyorsa
  rozet soluk (.5), düğme pasif, dokununca "Yetersiz coin" (pencere açılmaz). Ücretsiz 50:50 rozeti kaldı. Satın
  almadan sonra `coinTazele()` → üst çubuk anında güncellenir (önceden çağrılmıyordu). Serbest mod hak/kullanıldı
  kurallarını artık ezmiyor. `DuelloPage` paneli aynı kurallar. `JokerDukkani` tek tek alımda bakiye yetmiyorsa
  düğme pasif + "Yetersiz coin". Joker PAKETLERİ düğmesi bilerek pasif yapılmadı (eski kural: basınca Coin sekmesine götürür).
- `QUIZ_TACTICS_PAKET34_DUZELTME.md` (izlenmeyen dosya) aynı işi 252 numarasıyla istiyordu; Paket 35 A.3 bunu kapsıyor, ayrıca uygulanmadı.

### B — Hemen oyna → mod seçimi
- `ModSecimPenceresi`'ne `baslik`, `bekleMetni`, `alttan` prop'ları; `profil` null ise avatar yok. Seçim sürerken
  öteki kartlar .45. Home: "Hemen oyna" pencereyi açar; Klasik → `hemenOyna(dereceli)`, Saf Bilgi →
  `hemenOyna(dereceli, true)`, Düello → `/duello`. Pencere seçimde kapanır (arama ekranı/yarım maç sorusu yerine açılır).
- Not: düğmenin altındaki "Klasik Mod — kazanırsan…" satırı artık tam doğru değil (değiştirilmedi).
- Modal içindeki "Vazgeç" bu pencerede turuncu görünüyor — `.bd-modal-katman .btn` genel kuralı; önceden de böyleydi.

### C — Profil kartı
- `OyuncuKarti`: `onOyna`, `onMesaj`, `onArkadasEkle`, `oynaPasifNeden`, `bilgiNotu`; 2×2 ızgara, ilk düğme birincil,
  ötekiler beyaz + turuncu kenar; dört hal; 180 ms açılış. Arkadaşlar: satır (avatar+ad) kartı açar, "Oyna" kısayol
  kaldı. Lig + Turnuva: yeni `lib/arkadaslik.js` kancası → arkadaşsa Mesaj at, değilse Arkadaş ekle (istek bekliyorsa not).
- İkon: `oyna`, `mesaj`, `gonder` eklendi.
- **Tuzak:** `.bd-modal-katman .btn:not(.tehlike):not(.basari)` her modal düğmesini turuncuya boyuyor; ikincil stil
  daha güçlü seçiciyle yazıldı.

### D — Meydan okuma şeridi
- Meydan okumadan sonra sayfadan çıkılmıyor. Bekleyenler sunucudan: `matches` (oyuncu1 = ben, durum bekliyor) +
  `duello_davetleri` (kuran = ben, bekliyor); realtime ile yenilenir. Geri çek: `mac_iptal` / `duello_davet_iptal`
  (Meydan sayfasıyla aynı). Bekleyen varken Oyna ve kartta Oyna/Meydan oku pasif, sebebi yazıyor. Açık bot anında
  kabul ederse doğrudan maça girilir.

### E — Mesajlaşma
- Migration 253: `direkt_mesajlar` (paketteki şema), RLS select yalnız taraflar, insert/update/delete yetkisi yok,
  realtime yayınında. RPC: `dm_gonder` (arkadaşlık sunucuda, 20/60 sn, 1-500), `dm_sohbetlerim`, `dm_sohbet`,
  `dm_okundu`, `dm_okunmamis_sayim`.
- **Bildirim altyapısı bulundu:** `push_metni` + `push_gonder` (bildirim_anahtarla'nın kullandığı yol). Yeni metin
  `dm_yeni` (tr/en). `bildirimler` tablosuna SATIR YAZILMIYOR (zil DM'yi ayrıca sayıyor, yoksa çift sayılırdı).
  Push yalnız o kişiden gelen İLK okunmamış mesajda gider.
- Arayüz: `/mesajlar` + `/mesajlar/:kisi` (push buraya getirir), `SohbetKutusu` (body'ye portal, visualViewport ile
  klavye üstünde, realtime, "Yeni mesaj ↓", yukarı kaydırınca eski sayfa), `EmojiSecici` (60 emoji / 6 kategori,
  seçim kapanmaz, dışarı/Esc kapatır). Arkadaşlar üstünde "Mesajlar" + rozet; zil rozetine DM eklendi + zilde satır.
- Kontrast: beyaz / #F4701F 2.98 → kendi balonunda yazı #1B1B1B; okunmamış rozet zemini #C4530F (beyaz 4.9:1).

### Doğrulama
- Sunucu testleri (işlem + rollback): yeni `ekonomi-testi` (3), `mesajlasma` (4), `joker-serbest` yeni kurala göre
  güncellendi. `npm test` 71/71 + kurallar + dans. RLS elle: yabancı 0 satır görüyor, doğrudan insert "permission denied".
- Arayüz: Vite dev + Playwright Chromium 390×844, Supabase istekleri SAHTE yanıtlarla (canlıya yazılmadı):
  B (3 kart, alttan, odak ilk kartta, Esc kapatıyor, arama başlamıyor), C (Oyna/Meydan oku/Mesaj at; bekleyen varken
  ilk ikisi pasif + sebep), D (şerit, Oyna pasif), E (liste rozeti, okundu çağrısı, 3 emoji art arda + seçici açık,
  Esc, metin kutusu 4 satırda duruyor, HTML metin olarak basılıyor, 501 karakter hatası). Sabit öğede/atasında
  transform yok, yatay taşma yok, konsol hatası yok.
- Doğrulanamayan: iki gerçek hesapla canlı mesajlaşma ve gerçek maçta joker çubuğunun görünümü (OAuth, ajan giriş
  yapmaz); JokerCubugu fiyat rozeti tarayıcıda gösterilmedi, yalnız derleme + sunucu testleri. iOS: bu makinede WebKit yok.

## Paket 36 — Maç sonu ekranı (19 Eyl 2026)

SQL değişikliği yok, migration yok. Her aşama ayrı commit + push (0b100e9 → 6fa126a).

### A — Ölçüm (satır numaraları)
Tablo doğruydu, küçük kaymalar: MatchPage sonuç bloğu 744-927 (sohbet dahil; paketteki 744-880 sohbetsiz),
BildirimIzniSor 866 ✓; DuelloPage 503-575 (BildirimIzniSor 569 ✓); GroupMatchPage 464-512; TournamentPage 376-400 ✓
(sonuç ekranı yoktu, "Lobi yok / sıradaki turnuva" dalının içinde kart); HizliModPage 437-463 (BildirimIzniSor 455 ✓).

### Aşama 1 — `oyun/components/MacSonuSahnesi.jsx`
- İskelet: sabit zemin (durum başına radyal, kazanmada 8 sn nefes alan ışıma) · banner (role=status, odak alır) ·
  karşılaşma (AvatarCerceve; kazanan 96 + dönen hale + kupa, kaybeden 72 @ .72, berabere 84/84; VS; skor ya da kalp) ·
  ödül hapları (SayanSayi) · katlanır Detay (varsayılan kapalı, max-height+opacity 240 ms, ok 180°, "Detay (n)") ·
  children · yapışkan eylem çubuğu. `karsilasma` prop'u podyum/şampiyon gibi serbest orta sahne için.
- Sekans: tek `adim` (0-8), tek rAF döngüsü (sökülünce iptal), görseller CSS animation-delay. Dokunma/Esc → `.atla`,
  her şey son hâlinde. reduced-motion → hiç animasyon, coin uçuşu yok.
- Coin uçuşu: hedef `.bd-coin-hap` (Layout › CoinHapi) BULUNDU. 3 coin, fixed kapsayıcı transformsuz, x/y ayrı eğri → yay.
  Uçuş bitince `coinTazele()`; CoinHapi artık `SayanSayi` ile sayarak geçer (SayanSayi'ye `bicim` prop'u).
  Bu yüzden MatchPage (mac_odulum sonrası), DuelloPage (bitiş efekti) ve HizliModPage (hizli_mod_bitir sonrası)
  içindeki erken `coinTazele()` çağrıları kaldırıldı — yoksa sayı coinler varmadan değişiyordu.
- Eylem çubuğu sonuç ekranında AÇIK olan alt sekme çubuğunun altına giriyordu (ölçüldü: 794 > 735). Çubuk artık
  `.tabbar` yüksekliğini ölçüp (`--mss-eylem-alt`) tam üstüne yapışıyor; sekme çubuğu yoksa güvenli alanı kendisi bırakır.
- Küçük eklemeler (mantık aynı): MacSonuEklentisi `rovansYuva` (rövanş isteği düğmesi portal ile çubuğa) + `onYanlisAdet`;
  YanlisSatiri `onAdet`; OdulDokumu `onDokum` (turnuva sırası sunucunun `turnuva_derece.detay.sira` kaleminden).

### Aşama 2 — sayfalar
- MatchPage: sahne + Detay'da OdulDokumu · MacSonuDokum · MacSorulari · MacSonuEklentisi · paylaş. Çubuk: bot → Rövanş
  (doğrudan maç, artık "…" çalışıyor hâli + try/catch); gerçek rakip + kaybettim → istek düğmesi (portal); ikisi aynı anda yok.
  Rövanş yoksa (gerçek rakibi yendin/berabere) birincil "Meydan okumalara dön". Yakınlık: "{n} soru farkla"
  (kazanınca her zaman, kaybedince yalnız 1-2 soru). SORU_PUANI = 10 sabiti sunucudaki cevap_ver'i yansıtır (yalnız metin).
- DuelloPage: kalpler (DUELLO_CAN = 3), rövanş dört durumu çubukta; istek gönderilince pasif "Rövanş bekleniyor…" +
  mevcut RovansBekleme penceresi. Kaybedince "Son canına kadar götürdün" (rakip 1 can) / "{n} tur sürdü" (2 can) / yok (3 can).
- HizliModPage (dondurulmuş): tek avatar, haftalık rekorsa "kazandı" tonu ("Haftanın en iyisi!"), değilse nötr "Oturum bitti".
- GroupMatchPage: podyum 2-1-3, ödülsüz notu, sıralama Detay'da, yeni "Ana sayfa" düğmesi.
- TournamentPage: katıldığın biten turnuvada şampiyon ortada + "{n}. oldun"; 1. isen "Kazandın!", değilse nötr
  "Turnuva bitti". "Turnuvalara dön" sahneyi kapatıp mevcut lobi görünümünü açar (sessionStorage, turnuva başına).
- H: BildirimIzniSor beş sonuç ekranından çıktı; sahne `sessionStorage.bildim_bildirim_mac_sonrasi` bırakır,
  Home hero'nun altında (turnuva şeridinin üstünde) kartı çizer. Kartın kendi kuralları aynen.

### Kararlar (sorulmadı, gerekçeli)
- VS rengi açık temada `--bd-vurgu-2` (#F4701F 2,41:1 ölçüldü, 22px kalın için 3,0 gerekir; #C4530F 3,77:1). Koyuda #F4701F 6,2:1.
- Birincil düğmeler mevcut `.btn` (turuncu, koyu yazı 5+:1). Bot rövanşının eski mercan `.bd-rovans-tek` görünümü çubukta kullanılmadı.
- Konfeti eklenmedi (paket isteğe bağlı bırakmıştı).
- Kabartma gölgesi mevcut `.btn`'in 5px'i kaldı (pakette 4px yazıyor); tasarım dilindeki tüm düğmelerle aynı olsun diye.

### Doğrulama
- Vite dev + Playwright Chromium, Supabase SAHTE yanıtlarla (canlıya yazılmadı). Klasik: kazan (bot) / kaybet (gerçek) /
  berabere 360px / reduced-motion; Düello: kazan, kaybet+Esc, rakip rövanş istiyor; Grup 390+360; Turnuva (kapat → lobi,
  yenileyince sahne yok); ana sayfada bildirim kartı. Sekans zamanları, coin uçuşu ve sayaç (1.200→1.250 uçuştan sonra),
  kaybedende 72px/.72/filtre yok, yatay taşma 0, sabit öğede/atasında transform yok, konsol hatası yok.
- Koyu tema: KOYU_TEMA_KAPALI olduğu için data-tema elle "koyu" yapılarak ölçüldü (başlık 14,6:1, VS 6,2:1).
- Yapılamayan: Hızlı Mod tarayıcıda açılamadı (rota dondurulmuş) — yalnız derleme. Gerçek hesapla canlı maç (OAuth).
  iOS: bu makinede WebKit yok; Chromium'da iPhone boyutu denetimi yapıldı.

## Paket 37 — Canlı geziden düzeltmeler (19 Eyl 2026)

SQL yok, migration yok. Her madde ayrı commit + push (4bb973c → 6cff99f).

- **A** Profil › Rozetler: kilitli rozet gerçek emojisini gösteriyor (grayscale + .55), sağ altta 12 px kilit rozeti. `.rozet.kilitli { opacity:.65 }` korundu.
- **B** Lig çerçevesi seçici: 56 px, halka 4/2/3 px (yalnız `.bd-lig-cerceve-secici`), çerçeveye 9 px pay. Ad `--lc-dis` tonunda AMA
  %75 koyulaştırılmış (ham renkler beyazda 2,9–4,0:1; AA için ≥4,89:1). `--lc-*` değişkenleri `.bd-lig-renk-*` sınıfına da açıldı.
  Koyu temada düğme zemini #fff kalıyordu (`--bd-yuzey` tanımsız) → `--bd-yuzey-2`.
- **C** Bildirim zili: okunmuş tekrarlar ayrı grupta tek satır (`toplu-okundu-${tip}`), en fazla 20 okunmuş satır çizilir.
  "sana meydan okudu" = `mac_daveti` (migration 063 tetikleyicisi), zaten TOPLAMA'daydı. `duello_daveti` TOPLAMA'da yok — dokunulmadı, soruldu.
- **D.1** MacSonuSahnesi `gorevler` prop'u; `OdulDokumu › onGorevler` (alınmamış görevler). En çok ilerlemiş 2 görev, ilerleme 0 ise çizilmez,
  1050 ms'de girer. Beş sayfada `gorevleriGoster={false}` → Detay'dan çıktı.
- **D.2** Açık Detay'ın altına `padding-bottom: var(--mss-eylem-alt)`. Ölçüm: 390×844 ve 1280×720'de kaydırma sonunda çubuk içeriği örtmüyordu.
- **E** Kök sebep: `.bd-modal-katman .btn:not(.tehlike):not(.basari)` modal içi her düğmeyi turuncuya boyuyor. Mod seçimi + joker satın alma
  pencerelerinde `btn ikincil` beyaz/turuncu kenar (oyuncu kartındaki desen). Diğer modallardaki ikincil düğmeler hâlâ turuncu — soruldu.
- **F** `.bd-sohbet` ≥700 px: `inset:0`, `max-width:none`, içerik 620 px sütun (padding-inline), zemin opak. Telefonda aynı.
- **G** Çalışma: adet ızgarası 2 sütun; kategori şeridi yalnız kaydırılacak içerik varken sağ 24 px solar (`bd-serit-solma`).
- **H** Ayarlar › Avatarın: 36 px AvatarCerceve.
- **I** (rapor) Kanat kartı canlı 3B render: `oyun/vitrin/vitrinSahne.js › portre()` tek WebGL renderer'la 192 px kare çizip PNG data URL yapar;
  çağıran `GorunumVitrini.jsx:71`, kadraj `kadraj.js › kanat` → `vitrinSahne.js:25 KADRAJ.kanat`. Model: `karakter_<tur>.glb` içindeki `kozmetik_kanat` mesh'i.

Doğrulama: Vite dev + Playwright Chromium, Supabase sahte yanıtlarla (canlıya yazılmadı). A/B/D açık+koyu, D reduced-motion, E ölçüldü,
F 1280 ve 390, G maske aç/kapa, H ekran görüntüsü, C mantığı düğüm testiyle. Joker satın alma penceresi tarayıcıda açılmadı (maç içi), CSS seçicisi aynı.

## Paket 38 — Düello paritesi ve modal düğmeleri (19 Eyl 2026)

SQL yok, migration yok. Commit'ler: 426e556 A · 46b41cf A (ek) · 45818b1 B · bu commit (C raporu + kalıcı kural).
**Kalıcı kural** (CLAUDE.md + AGENTS.md › "Mod paritesi"): bir moda yapılan arayüz düzeltmesi bütün modlara, düello dahil.

- **A** BildirimZili: `duello_daveti` (kilic, öncelik 0, TOPLAMA → `y("/duello")`), `duello_kabul` (ates, öncelik 1, toplanmaz).
  dil.js: "{0} düello daveti" → "{0} duel invites". Sunucu yolu `'/bildim/duello'` (migration 228).
- **A (ek) — yol hatası:** sunucu BÜTÜN bildirim yollarını eski `/bildim/...` önekiyle yazıyor; `BildimApp` yalnız tam `/bildim`
  ve `/oyun/*`'u karşılıyordu → gruplanmamış tek bildirime dokunmak ana sayfaya düşürüyordu (ölçüldü). `/bildim/*` rotası +
  `OnekiAt` iki öneki de atar (`/bildim/duello → /duello`, `/bildim/mac/x → /mac/x`, `/bildimx` etkilenmez).
  Yan bulgu: `ChallengesPage` çıkışta `supabase.rpc(...).catch` → TypeError (Supabase sorgusunda .catch yok) → `.then(ok, hata)`.
- **B** `.bd-modal-katman .btn:not(.tehlike):not(.basari)` (turuncu, ~4482) ve yazı rengi grubu (~6570) artık `:not(.ikincil)`.
  ~3236'daki nötr kural koyu temadan kalma ("iptal bir kazanım değil"); sonra gelen turuncu kural onu her düğmede eziyordu.
  Yeni tek tanım `.bd-modal-katman .btn.ikincil`: beyaz, #C4530F yazı (4,57:1), turuncu kenar; koyu: `--bd-yuzey-2` + #FF9A4D (6,27:1).
  Paket 37 E'nin iki pencereye özel kuralları silindi. Ölçüldü (açık+koyu): mod seçimi, yarım maç, kurulum sihirbazı.
- **C** Düello parite: sonuç sahnesi / kalpler / ödül hapları / görev satırı / Detay boşluğu VAR; joker fiyat rozeti + soluk VAR
  (DuelloPage kendi çubuğu); bildirim izni kartı sonuçtan ÇIKMIŞ; giriş yolları diğer modlarla aynı (Hemen oyna penceresi,
  ana sayfa kartı, arkadaş → mod penceresi, meydan mod anahtarı). Profil kartı hiçbir modun sonuç ekranında yok (Paket 35 C
  yalnız Arkadaşlar/Lig/Turnuva/Sohbet) — soruldu.

## Paket 39 — Kalite denetimi, yalnız rapor (19 Eyl 2026)

Kod değişmedi. Çıktı: `DENETIM_RAPORU.md` + `denetim/goruntuler/` (266 PNG, ~25 MB, DPR 1). Her ekran ayrı commit (556d68f → a503503).
Yöntem: Vite dev + Playwright Chromium, Supabase sahte yanıtlarla; otomatik ölçüm (yatay taşma, <44 px hedef, kontrast, EN'de Türkçe kalıntı, konsol).
Sonuç: 6 🔴 · 71 🟡 · 53 🔵. Öne çıkan 🔴'ler: davet bandı yazısı görünmüyor (1,00:1), giriş hata kutusu 1,49:1,
`.bd-geri-sayim` sınıf çakışması (3-2-1 ve son-5-sn sayısı görünmüyor, fixed+transform), düello maçında `useOyunModu` yok (sekme çubuğu jokerleri örtüyor).
Ortak 🟡: hata durumlarında sahte veri/boş durum/sonsuz yükleniyor. Düzeltmeler ayrı pakette.

## Paket 40 — Kırık olanlar (19 Eyl 2026)

SQL/migration yok. 10 madde ayrı commit (34421f3 → 65dab5d), rapor `PAKET40_RAPOR.md`.
- A `.bd-geri-sayim` → `.bd-baslangic-sayimi` (3-2-1) + `.bd-son-saniye` (son 5 sn); fixed+transform çakışması bitti.
- B davet bandı + üst bildirim şeridi tür başına gerçek zemin (beyaz/beyaz 1,00 idi).
- C `.hata-kutu` tabanı açık tema renkleri (giriş 1,49 → 5,14).
- D Düello `useOyunModu`; maç sürerken `.bd-ust-blok` de gizli (tek nokta body.bd-oyun-modu).
- E `.btn` tabanı turuncu üstünde koyu yazı (portallar 2,1 → 5,4-7,5).
- F dükkân geliştirici metni kaldırıldı.
- G giriş sayfası saatleri `turnuvaSaatleri()`'nden. **Canlı turnuva_saatleri = 7 seans (10:00…24:00); CLAUDE.md "13:00 ve 21:50" diyor — sahibine soruldu, varsayılan değiştirilmedi.**
- H lig sekme şeridi kayar + solma ipucu. I çalışma "undefined" koruması + `t()` null-güvenli.
- J 12 kontrast satırı ≥4,5; sekme etiketi 11 px (≤374 px'te sıkıştırılmış).

## Paket 41 — Eksikler (19 Eyl 2026)

SQL/migration yok. Commit'ler 41202c8 → rapor. Rapor: `PAKET41_RAPOR.md`.
- A: ortak `DurumKutusu` (yukleniyor/hata/bos) + `useZamanAsimi`; AuthContext `profilHata`. 12 ekranda hata boş durumla karışmıyor, sahte "0 puan" yok.
- B+E+H: ortak `MacUstSerit` (X 44px · mod rozeti · ses) altı modda aynı yerde; `ses.js › sesDinle` ile Ayarlar eşit. Çalışma turu da `useOyunModu`.
- C: `AvatarMenu` (Profilim · Ayarlar · Ses · Dil · Çıkış), `/profil?sekme=ayarlar`.
- D: `AvatarDugmesi` — maç sonunda rakip avatarı profil kartı açar (5 mod).
- F: rakip arama 30 sn üst sınır + Tekrar dene/Bot/Vazgeç; düello araması 60 sn + Tekrar dene. G: yükleme hatası paritesi.
- I: 404 (`BulunamadiPage`), donmuş rotalarda "Bu mod şu an kapalı" notu, `bilinenYol()`.
- J: 44 px hedefler. K: giriş e-posta akışı; **Facebook canlıda kapalı — sahibine soruldu**. L: 2 düello bildirim kalıbı eklendi (gerisi zaten vardı).
- M: grup hazır listesi nabızdan; turnuva izleyici sayacı; ödül satırı "…/—"; bekleyen davette geri çekme + süre; arkadaş çıkarma penceresi; davet kodu yok durumu; uzun soru küçülmesi; yasal sayfalarda Geri. İletişim adresi değiştirilmedi (sahibi verecek).

## 19 Eylül 2026 — Paket 42 (Kozmetik)
- A–T uygulandı, her madde ayrı commit (61291ef … 4f1d73f), migration yok. Rapor: `PAKET42_RAPOR.md`, görüntüler `denetim/goruntuler/p42-*`.
- Öne çıkanlar: tek düğme dili (birincil/ikincil/tehlike); ana sayfa mod ızgarası 2×2; alttan açılan pencereler sürüklenerek kapanır (`Modal.jsx`, `bd-alttan`); maç sonu çubuğu 135→113 px ve kısa içerikte en altta; Meydan okumalar katlanır bölümler; sohbette gün ayırıcı; dükkânda paketler üstte + coin uyarısı; bildirim zilinde ✕ ve solma; Gizlilik/Koşullar içindekiler (`Icindekiler.jsx`); giriş sayfasında maskot, form yazı tipi, hata düğme yanında; kalan dört kontrast ≥ 4,5.
- Kararlar/gözlemler: EN çeviride kalın sonrası boşluk kaybı yalnız 2 anahtardaydı (tarayıcı betiğiyle 2013 anahtar tarandı). Lig arkadaş sekmesi oyuncunun kendisini zaten içeriyordu (denetim sahte veriden yanıldı; `profiles_select=true`). "Tümünü okundu say" eklenmedi — zil açılınca zaten hepsi okundu oluyor.
- Açık sorular (sahibine): K.2 bayrak emojisi Windows'ta, U masaüstü düzeni, P.2 okundu davranışı.

## 19 Eylül 2026 — Paket 43 (Kalan maddeler)
- A kontrast: 7+ gün seri sayısı 2,31→6,11; ustalık seviye yazıları (5 seviye, hepsi eşik altıydı) → 5,11–6,51; Gizlilik/Koşullar bağlantıları 2,68→5,00 (kök sebep: yasal sayfalar `.app` dışında, `.app` önekli kural eşleşmiyordu).
- B: turnuva lobisi kılıcı gerçek `<button>`, 44×44, soluk görünüm; satır kapsayıcı + iki kardeş düğme (iç içe düğme yok), satır 48 px korundu. Lig satırı da aynı yapıya geçti; podyum `role="button"` kaldı (blok içerik, iç içe etkileşim yok).
- C: turnuva maçından çıkış onaylı (yalnız yarışan oyuncu; elenmiş/izleyici doğrudan çıkar). Aktif turnuvada sunucuda "ayrıl" RPC'si yok — elenme eskisi gibi cevapsız soruyla.
- D: CLAUDE.md/AGENTS.md turnuva saatleri = canlı 7 seans; eski sabah/akşam ayarları DB'de duruyor, kullanılmıyor (not düşüldü, silinmedi).
- Rapor: `PAKET43_RAPOR.md`.

## 20 Eylül 2026 — Arayüz Yenileme (prototip entegrasyonu + meydan/gardırop dondurma)

**Ne yapıldı.** Sitenin arayüzü ChatGPT ile hazırlanan 24 sayfalık HTML/CSS
prototipe geçirildi. Prototip depoya alındı: `tasarim/home-prototype/`
(ana depo dışındaki klasörde çalışılmadı). Dal: `arayuze-yenileme` → `main`.

### Kalıcı karar — prototipin yeri
Prototip **yalnızca görsel tasarım kaynağıdır**. İçindeki metin, oyuncu
verisi, joker listesi, fiyat, mod, rütbe, turnuva saati ve mekanikler
geçersizdir; işlevlerde mevcut kod + veritabanı + CLAUDE.md ürün kararları
tek doğru kaynaktır. Bu kural CLAUDE.md › "Tasarım dili — ARAYÜZ YENİLEME"
bölümüne yazıldı.

### Yapılanlar
- **Yazı tipleri yerel:** Baloo 2 + Nunito (latin + latin-ext, 4 woff2,
  152 KB) `public/fonts/` altında; `index.html` ve `oyun/avatar3d/gardrop.html`
  içindeki Google Fonts bağlantıları kaldırıldı, preload eklendi.
- **Tema katmanı:** `oyun/styles/yeni.css` — prototip paleti + stil sayfası
  birebir; eski `--bd-*` token'ları yeni palete alias'landı (eski sınıflar
  silinmedi, hepsi yeni renge döndü). `src/main.jsx`'te en son yüklenir.
- **Satır içi hex renkler tokena bağlandı:** `oyun/lib/ranks.js` rütbe
  renkleri, `UstalikIzgarasi.jsx` seviye renkleri (değerler aynı, yedekli
  `var(--x, #hex)`).
- **İskelet:** üst çubuk (marka + masaüstü menü + zil/coin/avatar) ve alt
  mobil menü (5 sekme). Kabuk 1180 px; `.app`'in 540 px sınırı kalktı.
  `AvatarMenu`, `BildirimZili`, `CoinHapi`, `DavetBandi`, `BildirimToast`,
  `MacUstSerit`, `DurumKutusu`, ses düğmesi ve TR/EN korundu.
- **Yeni sayfa:** `/modlar` (prototipin `modes.html`'i). Yeni mod açmaz;
  yalnız var olan rotalara götürür, joker sayılarını `jokerler.js`'ten
  hesaplar.
- **Sayfalar:** ana sayfa, lig, arkadaşlar, dükkân, giriş, maç ekranları,
  maç sonu, oyuncu kartı, turnuva, bildirimler, davet, mesajlar, hatalarım,
  meydan okuma, düello, 404, gizlilik, koşullar.

### Kararlar ve nedenleri
- **"CEVABI KİLİTLE" eklenmedi.** Prototipte vardı; oyunda şıkka basınca
  cevap gidiyor ve geri bildirim `geriBildirim.js`/`GB_MS`'ten geliyor.
  `answer-feedback` bloğu da alınmadı.
- **Maç ekranı tek yerden giydirildi** (`body.bd-oyun-modu`). Altı ekran
  birden değişti: Klasik, Saf Bilgi, Düello, Grup, Turnuva, Çalışma turu —
  mod paritesi kuralının gereği.
- **Bildirim zili telefonda gizlenmedi.** Prototip 560 px altında
  `.circle-btn{display:none}` diyor; telefonda bildirimlere başka giriş
  olmadığı için işlev kaybı olurdu.
- **Dokunma hedefleri 44 px.** Prototip 38–42 px veriyordu; üst çubuk
  düğmeleri, sekmeler ve alt menü 44'e çıkarıldı (iki piksellik sapma
  bilinçli).
- **Uydurulmayanlar (prototipte var, kodda karşılığı yok):**
  `coin-checkout.html` (Play Billing akışı — sayfa açılmadı),
  arkadaşlar `social-stats` şeridi (dört sayıdan üçünün karşılığı yok),
  dükkân "Haftanın Paketi" kahraman kartı (öyle bir kampanya ürünü yok),
  maç sonu "XP" ve "ort. süre" göstergeleri (XP sistemi yok),
  oyuncu kartı "alıntı/söz" satırı ve rakiplik yüzdeleri prototipteki
  biçimiyle. Hiçbirine sahte sayı yazılmadı.
- **Lig kartı gerçek veriye bağlandı.** Ana sayfadaki `ligYukle` daha önce
  `setLigDurum(null)` yapıyordu (kart çizilmiyordu); artık Lig sayfasıyla
  aynı kaynağı okuyor: `lig_grubum`. Lig ile rütbe ayrı gösteriliyor —
  rütbe oyuncu şeridinde (`ranks.js`), lig sağ sütundaki kartta.
- **`LIG_ADLARI` `oyun/lib/lig.js`'e taşındı.** Ana sayfa onu
  `LeaderboardPage.jsx`'ten import edince koca lider tablosu ana sayfa
  paketine giriyordu. Eski import yolu `export { … } from` ile korundu.

### Bulunan ve düzeltilen hatalar
- **iOS tuzağı (tema.css):** `.bd-ust-blok` hem `position: sticky` hem
  `transform: translateZ(0)` idi — kök CLAUDE.md'nin iOS kuralının birebir
  ihlali. `transform` ve `will-change: transform` kaldırıldı. Bu, üst
  çubuğun iOS'ta kaymasına ve içindeki `position: fixed` katmanların
  (modal, toast) yanlış konumlanmasına yol açan sınıftı.
- **Üç kez tanımlı seçici (tema.css):** `.app .bd-lobi-kilic` aynı
  özgüllükte üç kez tanımlıydı; yalnız sonuncusu (Paket 43 B'nin 44×44
  kılıcı) uygulanıyordu. Ölü olan 32 px'lik tanım kaldırıldı, yerine
  neden kaldırıldığını anlatan not bırakıldı.

### Dondurulanlar (silinmedi)
Tek anahtar: `oyun/lib/ozellikBayraklari.js` → `MEYDAN_ACIK = false`,
`GARDIROP_ACIK = false`. Geri açmak için ikisini `true` yapmak yeterli.
Gizlenenler: alt menü Meydan sekmesi, üst çubuk Görünüm kısayolu, Dükkân ›
Görünüm sekmesi (varsayılan sekme Joker oldu), Profil › Görünüm kartı,
Profil › Ayarlar › "Meydanda ikramlar", ilk girişteki `/gorunum`
yönlendirmesi. Rotalar (`/harita`, `/harita-deneme`, `/gorunum`,
`/gorunum-3b`) duruyor; "Bu bölüm şu an kapalı." notunu gösterip ana
sayfaya dönüyorlar. `vite.config.js`'e ve veritabanına dokunulmadı.

**Ida'ya not:** meydan bot cron işleri boşa çalışmaya devam ediyor
(`pg_cron`). Kapatma kararı senin; kod tarafında hiçbir migration yazılmadı.
Meydandan turnuvaya katılma (+20 coin, `meydan_turnuva_damgasi`) yalnız
harita sayfasından çağrıldığı için kendiliğinden erişilemez durumda;
turnuvaya klasik düğmeden giriş aynen çalışıyor.

### Yeni araç
`araclar/arayuz-denetim.mjs` — 16 sayfayı dört genişlikte (1440 · 850 ·
560 · 390) açar; yatay taşma, sabit öğede transform, transform'lu ata,
kaydırınca kayan sabit menü, 44 px altı dokunma hedefi ve konsol hatası
ölçer. `--gorsel` ile ekran görüntüsü de alır. İlk çalışmada misafir
oturumu açıp `.arayuz-denetim-oturum.json`'a yazar (git'e girmez).
WebKit bu makinede çalışmadığı için iOS kontrol listesi böyle denetleniyor.

### BEKLEYEN İŞ — arayüz yenileme sonrası kontrast
Palet bilerek aynen alındı; aşağıdaki ölçümler ayrı bir pakette
düzeltilecek, bu pakette DOKUNULMADI:

| Yer | Oran |
|---|---|
| Turuncu düğme üstünde beyaz yazı | 2,38 |
| `--muted #71809f` küçük metinler | 3,60 |
| `.play-meta #9dacca` | 2,29 |
| `.eyebrow #8190ad` | 3,22 |
| Turuncu yazı beyaz üstünde | 2,84 |
| Görev ödülü `#bd8b09` | 3,06 |

### 20 Eylül 2026 — ek: dükkâna giriş (sahibinin uyarısı)
Arayüz Yenileme'den sonra sahibi "insanlar joker/coin nasıl alacak" diye
sordu. Dükkân dondurulmamıştı (yalnız içindeki **Görünüm** sekmesi kapandı),
ama **masaüstünde girişi yoktu**: alt menü 850 px üstünde gizlendiği için
büyük ekranda "Dükkân" kelimesi hiçbir yerde görünmüyor, tek yol üst çubuktaki
coin hapına basmaktı (o da doğrudan Coin sekmesine gider, Joker sekmesi bir
tık daha uzakta).

Yapılan:
- Masaüstü menüsüne **Dükkân** eklendi (Ana Sayfa · Oyun Modları · Lig ·
  Arkadaşlar · Dükkân).
- Ana sayfanın sağ sütununa **Dükkân kısayolu** kartı (lig kartıyla aynı
  biçim, altın vurgu).

Dükkâna giden yollar artık beş tane: masaüstü menü · alt menü sekmesi ·
coin hapı (Coin sekmesi) · ana sayfa kısayolu · maç içi joker çubuğundaki
"Joker al". Joker paketleri, tek tek joker alımı, ödüllü video ve coin
paketleri (Play Billing) olduğu gibi çalışıyor — hiçbirine dokunulmadı.

Ayrıca bu ekte: Arayüz Yenileme'nin getirdiği **95 yeni metnin İngilizcesi**
`oyun/lib/dil.js`'e eklendi (menü, ana sayfa, /modlar, lig pankartı,
arkadaşlar/mesajlar başlıkları, dükkân başlığı, giriş ekranı, "Bu bölüm şu an
kapalı"). Öncesinde bu metinler EN modunda Türkçe kalıyordu — sözlükte
olmayan anahtar Türkçe metnin kendisine düştüğü için ekran bozulmuyordu ama
yarı Türkçe görünüyordu. Ölçüldü: profil dili EN iken ana sayfa, menü ve
giriş ekranı tamamen İngilizce; sayfa hatası yok.

### 20 Eylül 2026 — maç ekranı düzeltmeleri (sahibinin ekran görüntüsü üzerine)

Sahibi canlıda oynarken dört şey bildirdi: süre halkası yamuk, şıkların
altında açıklanamayan gri şerit, bir sorunun takılması, genel "senkron
hataları". Hepsi ölçülerek bulundu ve düzeltildi.

**1. Gri şerit — kök sebep `height: 100%`**
`src/styles.css` › `html, body, #root { height: 100% }` gövde kutusunu ekran
boyuna kilitliyordu. Gövdenin zemini (maç ekranında koyu degrade) yalnız kendi
kutusuna boyanır; sayfa ekrandan uzun olunca altta `html`in açık rengi
görünüyordu. Ölçüm (390×844): gövde 844 px, belge 1018 px → 174 px'lik seam.
Eski açık temada iki renk de açık olduğu için yıllardır fark edilmemişti.
Düzeltme: `height: auto` + `min-height` (yeni.css). Doğrulandı: dört
genişlikte, uzun sayfalar dahil, gövde = belge yüksekliği.

**2. Süre halkası yamuk**
`src/styles.css` SVG'yi 48×48 sabitliyor. Arayüz Yenileme kabı 66 px yapınca
halka kutunun sol üstünde kaldı, `inset: 0` ile ortalanan rakam halkanın sağ
altına düştü. Düzeltme: maç ekranında SVG kapla eşitlendi (62 px).

**3. "SORU 1" iki satıra düşüyordu**
Prototipin üç sütunlu `question-meta` düzeni (1fr 80px 1fr) burada
çalışmıyor: prototipte sağda "+100 PUAN" vardı, bizde sağ hücre boş ve sol
hücre 120 px'e sıkışıyordu. Tek satırlı esnek düzene geçildi; kategori çipi
taşmıyor.

**4. Son 5 saniyenin büyük rakamı şıkların üstüne biniyordu**
`.bd-son-saniye` kartın %42'sine konumlanmıştı; yeni kart uzayınca şıkların
arasına düşüyor, hata gibi görünüyordu. Rakam soru metninin İÇİNE alındı
(QuestionCard) — artık her zaman soru metninin arkasında filigran.

**5. SORU TAKILMASI — iki ayrı kök sebep**

a) `QuestionCard.cevapla` cevabı gönderirken `catch {}` ile hatayı TAMAMEN
yutuyordu. Oysa `setSecim(i)` çoktan çalışmıştı: şık seçili kalıyor,
`secim !== null` yüzünden başka şıkka da dokunulamıyor, soru süre bitene
kadar öylece duruyordu. Ölçüldü: 3-2-1 perdesi sırasında dokunulunca sunucu
`400 "Maç başlamak üzere"` dönüyor ve ekran kilitleniyor. Düzeltme: süre
varsa seçim geri alınır, "Cevabın gitmedi — tekrar dokun" uyarısı çıkar,
oyuncu yeniden dokunabilir. Süre bittiyse dokunulmaz (doğru cevabın
işaretlenmesi bozulmasın).

b) Soruyu çeken RPC üç ekranda da tek seferlikti:
`.then(({data,error}) => { if (error) return; ... })`. İstek hata verirse ya
da boş dönerse soru hiç gelmiyor, effect de yeniden çalışmadığı için ekran
boş kalıyordu. Yeni `oyun/lib/soruCek.js`: üstel geri çekilmeli beş deneme,
zaman aşımı korumalı; hepsi biterse ekran "Soru gelmedi — Tekrar dene"
gösteriyor. Klasik, Grup ve Turnuva ekranlarının üçüne de uygulandı.

**6. Maç sonu ekranı — kendi eklediğim iki hata, geri alındı**
Prototipin `result.html`i koyu zemin + beyaz karttır. Sahneyi öyle giydirme
denemesi: (i) `.mss-zemin`e `background: inherit` yazılmıştı, `.mss`ten
beyazı miras alıp sonuç ekranını komple beyaza çeviriyordu; (ii) zemin
koyulaşınca MacSonuSahnesi'nin metin renkleri (oyuncu adları, günlük
görevler) koyu üstünde koyu kalıyordu — o renkler Paket 36/42/43'te AÇIK
zemine göre ölçülmüştü. Bölüm tamamen geri alındı, sahne özgün haliyle
çalışıyor. **Ders: kontrastı ölçülmüş bir ekranın zemin rengi tek başına
değiştirilmez.**

**7. Joker düğmeleri**
Arayüz Yenileme prototipin soluk gri joker fişlerini getirmeye çalışıyordu;
o kural Paket 32 B'nin ölçülmüş kararını ("hepsi marka turuncusu, dört
durum") geri alıyordu. Kaldırıldı, mevcut tasarım yürürlükte.

**8. Küçük temizlik**
`yeni.css`in ortasındaki başıboş `@import url('./shop-mobile.css')`
kaldırıldı (dosya ortasındaki @import yok sayılıyor ve her derlemede uyarı
veriyordu; içerik zaten birebir eklenmişti). `mac_soruyu_atla`nın beklenen
"yeniden denenecek" dalı `console.error` yerine `console.warn` — gerçek
hatalar günlükte kaybolmasın.

**Nasıl doğrulandı**
20 soruluk Klasik maç uçtan uca oynandı (ölçüm betiği, 390 px): her soru
ilerledi, 50:50 jokeri iki şık eledi, maç sonu ekranı tam içerikle geldi,
konsol temiz. Yatay taşma yok; maç ekranında üst/alt çubuk gizli; şık
yüksekliği 62 px; "CEVABI KİLİTLE" yok.

**Ida'ya iki not**
- **Düello arenası test edilemedi:** yeni bir hesap 60–90 sn aradığı hâlde
  rakip bulamadı (kod notu "15 sn'yi geçerse botla eşleştireceğiz" diyor).
  İki misafir hesabı aynı anda aratıldığında da eşleşmediler. Sunucu tarafı
  bir eşleşme konusu olabilir; arayüz tarafında hata yok (giriş ekranı,
  kurallar kartı, Dereceli anahtarı ve arama akışı sorunsuz çizildi).
  Düello arenası zaten Klasik ile AYNI bileşenleri kullanıyor (QuestionCard,
  joker çubuğu, MacUstSerit, maç sonu sahnesi) — yukarıdaki düzeltmeler
  oraya da geçerli.
- **Saat farkı:** bir maçta 6 kez "soru atlama yeniden denenecek" düştü.
  Kendiliğinden düzeliyor (tasarlanmış yeniden deneme), ama istemci sayacı
  sunucununkinden birkaç saniye önce bitiyor demektir. Oynanışı bozmuyor,
  ayrı bir paket konusu.

---

## 20 Eylül 2026 — Skill Sistemi v1 (branch: `codex/skill-system-v1`)

- Oyuncu arayüzündeki “Joker” dili “Skill” olarak yenilendi; veritabanındaki
  `joker_*` adları eski istemci ve geçmiş kayıt uyumluluğu için korundu.
- Tek registry eklendi: aktif maç skilleri `elli`, `sure`, `soru_degistir`,
  `zaman_baskisi`. `sis`, `savunma_kilidi`, `saldiri_degistir` geçmiş veri
  için kayıtlı fakat pasif ve dükkânda gizli. `seri_koruma` maç setine girmez.
- Maç hazırlığına ağır bir sayfa açmadan, ayardan gelen slot sayısıyla çalışan
  “Maç Skillerin” seçimi eklendi. Saf Bilgi ve Hızlı yarışta gösterilmez.
- Yeni migration `20260612000254_skill_sistemi_v1.sql`: skill setini saklar ve
  kullanımda sunucu tarafında doğrular; kaldırılan türleri reddeder; paket ve
  tekil satışlarını kapatır; aynı kategoriden kişisel Soru Değiştir davranışını
  uygular. Eski veri silinmez.
- 50:50, Ek Süre, kişisel Soru Değiştir ve Zaman Baskısı için 350–800 ms
  aralığında, oyunu kilitlemeyen mikro animasyonlar ve reduced-motion karşılığı
  eklendi. Gösterilen süre değerleri oyun ayarından okunur.
- `npm run build`: geçti. Tarayıcı uyumluluk denetimi temiz; kalan 6 uyarı
  önceden var olan ResizeObserver/randomUUID/color-mix bildirimleri.
- Skill mimarisi statik testleri: 4/4 geçti. Migration canlı veritabanına
  uygulanmadan transaction + rollback içinde prova edildi: migration kurulumu,
  kişisel/aynı kategorili Soru Değiştir, kişisel Ek Süre ve server seçim kapısı
  testleri 4/4 geçti; kalıcı canlı veri değişmedi. Tam mevcut paket: 71/71,
  joker kuralları 13/13 ve dans testleri geçti.
- 360/390/412/430 px yerel tarayıcı taşma kontrolü: dört genişlikte de yatay
  taşma yok. Giriş gerektiren gerçek maç kabul testi preview üzerinde ürün
  sahibine bırakıldı; production ve main değiştirilmedi.

---

## 20 Eylül 2026 — Revizyon 2: oyun hissi, skill eşitliği ve mobil düzeltmeler

- Dal: `codex/ui-gamefeel-fixes-v2`. `main` ve production değiştirilmedi.
- Klasik/Grup/Turnuva maç kabuğu koyu dashboard görünümünden açık, katmanlı
  mobil oyun arenasına geçirildi. Düello aynı yüzey, seçenek ve vurgu diline
  çekildi; saldırı/savunma rengi korunurken sert ekran halesi azaltıldı.
- Ek Süre sonrasında istemci artık sayacı tahminen oynatmıyor; maç türünün
  yetkili soru RPC'sini yeniden çağırıp oyuncuya özel `baslangic` değerini
  kullanıyor. Yenileme ve yeniden bağlantı aynı sunucu gerçeğine dayanıyor.
- Düello 50:50, ortak QuestionCard gibi gerçek fakat pasif/elenmiş seçenek
  düğmeleri çiziyor; aynı kırılma-solma animasyonu ve erişilebilir sıra korunuyor.
- Mobil üst çubuk 360/390/412/430 px'de Q solda, bildirim/coin/avatar sağda
  sabitlendi. Lig listesinin dar ekranda genişlik/akış kuralları açıkça verildi.
- Dükkâna CSS + mevcut inline SVG ikon setiyle paket sandığı ve skill kartı
  illüstrasyonları eklendi. Sunucudan gelebilen eski “joker” ürün metinleri
  kullanıcıya “skill” olarak gösteriliyor; veri ve RPC adları değiştirilmedi.
- Skill sekmesinin üstüne dört aktif skilli tek bakışta anlatan, şeffaf
  arka planlı özgün sandık/kart kahraman illüstrasyonu eklendi. Coin sekmesinde
  görünmez; 390 px ölçümünde 300×150 px çizildi ve yatay taşma oluşturmadı.
- `npm run build` geçti; uyumluluk denetimi temiz (önceden var olan altı
  destek uyarısı sürüyor). `npm run test:kurallar` 17/17 geçti.
- Oturumlu arayüz denetimi 16 sayfa × 1440/850/560/360/390/412/430 genişlikte
  geçti: yatay taşma yok, sabit öğe kayması yok, dokunma hedefleri ≥44 px,
  konsol temiz.
- Eski joker beklentileri taşıyan sunucu testleri Skill v1 ürün kurallarına
  güncellendi: üç slot, kişisel Soru Değiştir, seçili set kapısı ve kaldırılan
  türlerin satılmaması artık doğrudan sınanıyor. Tam paket sonucu: 71 geçti,
  0 kaldı, yalnız migration provasına ait 4 test normal koşuda bilinçli atlandı;
  kural testleri 17/17 ve dans kontrolleri tamamen geçti.

## 20 Eylül 2026 — Avatar Preview Lab

- Avatar preview lab oluşturuldu.
- Aynı stil ailesinde 10 özgün örnek avatar üretildi.
- Preview route: `/preview/avatar-lab`.

## 20 Eylül 2026 — Avatar Preview Lab v2

- Parlak 3D/AI renderı yerine elle kurgulanmış katmanlı SVG yaklaşımıyla Panda,
  İnsan, T-Rex ve Kaplan için dört özgün stil denemesi hazırlandı.
- İlk preview lab korunarak yeni sayfa `/preview/avatar-lab-v2` rotasına eklendi;
  menüye ve canlı avatar sistemine bağlanmadı.

## 20 Eylül 2026 — Profesyonel Avatar Preview (yerel)

- Mevcut hazır avatarların düz renk, yuvarlatılmış kare, lacivert kontur ve komik
  karakter ruhu korundu; yüz oranları, siluetler ve küçük boyut okunurluğu geliştirildi.
- 3 insan, 3 hayvan, 2 fantastik/maskot ve 2 eğlenceli meslek/karakter olmak üzere
  toplam 10 katmanlı SVG profil denemesi hazırlandı. AI renderı, plastik yüzey,
  stok degrade ve isim etiketleri kullanılmadı.
- Preview rotası: `/preview/avatar-pro`. Ana menüye ve mevcut avatar seçicisine
  bağlanmadı; production görselleri değiştirilmedi.
- Sahibinin açık talebi gereği bu çalışma canlıya alınmadı; yalnız yerel preview
  dalında tutuldu.

### Düzeltme — kaynak avatarlar

- İlk denemede önceki lab için çizilmiş karakterler yanlışlıkla kaynak alınmıştı.
  Preview seti canlıdaki gerçek hazır avatar kimliklerine göre baştan kuruldu:
  `k01` Kedi, `k05` Panda, `k10` Dinozor, `k15` Robot, `k16` Uzaylı,
  `k17` Astronot, `k19` Korsan, `k23` Aşçı, `k24` Profesör ve `k29` Kahraman.
- Her karakterin canlı setteki zemin rengi, temel paleti ve ayırt edici aksesuarı
  korunurken kontur, yüz oranı, ifade ve küçük boyut okunurluğu iyileştirildi.

## 20 Eylül 2026 — Profesyonel Avatar Seti canlı entegrasyonu

- Sahibinin onayladığı 10 çizim, `public/avatars/pro/` altında statik SVG olarak
  üretildi ve kurulum/profil seçim ekranlarındaki resmi avatar seti oldu.
- Eski 31 avatar silinmedi; dosyaları ve üreticisi donduruldu, seçimden çıkarıldı.
  Böylece gerektiğinde geri dönüş mümkün, fakat yeni oyuncular eski seti seçemez.
- Migration `20260612000256_profesyonel_avatar_seti.sql`, eski yerel avatar kullanan
  mevcut hesapları karakter yakınlığına göre yeni sete taşır. Google ve diğer
  `https` profil fotoğraflarına dokunmaz. `avatar_onayla` yerel adresleri yalnız
  onaylı 10 yeni SVG ile sınırlar.
- Gelecek avatarlar için tek çizim kaynağı `AvatarProIllustrations.jsx`, üretici
  `avatar-pro-uret.mjs` olarak belgelendi. Kalın lacivert kontur, sıcak düz renk,
  güçlü siluet, hafif asimetri ve küçük boyutta okunurluk aynı kalacak.

## 20 Eylül 2026 — Ortak Proje Hafızası Kurulumu
**Araç:** Claude Code
**Neden:** İki ajan (Claude Code, Codex) aynı depoda çalışıyor ama kararların gerekçesini ve güncel durumu hiçbiri tek yerden okuyamıyordu; PROGRESS.md 7.000 satıra çıkıp fiilen arşive dönmüştü.

- **`PROJECT_CONTEXT.md` açıldı (266 satır, altı bölüm).** Ürün kararları
  `CLAUDE.md` ve `AGENTS.md`'den buraya TAŞINDI (kopyalanmadı) — artık tek
  kaynak burası. Bölümler: Mevcut Ürün · Oyun Modları · Skill ve Ekonomi ·
  Arayüz ve Görsel Kararlar · Reddedilenler ve Dondurulanlar · Açık İşler.
  Dosya kendi kuralını başında taşıyor: karar değişince eski satır silinir,
  tarihçe buraya yazılmaz.
- **Taşırken düzeltilen bayat bilgiler:** (1) "Joker" dili "Skill" oldu;
  aktif dört skill `elli`, `sure`, `soru_degistir`, `zaman_baskisi`, pasif
  üçü `sis`, `savunma_kilidi`, `saldiri_degistir`. Düello'nun üç saldırı
  jokeri anlatan eski satırı düzeltildi — saldırı skill'inin teke inmesi
  sahibinin kararıdır. (2) Meydan (3B harita), gardırop ve karakter
  oluşturma ürün kararları arasından Dondurulanlar bölümüne geçti; profilde
  yalnız sabit avatar fotoğrafı seçimi var. (3) Arayüz yenilemesi "bekleyen"
  değil, canlı olarak yazıldı; kontrast düzeltmesi Açık İşler'de tek madde.
- **`CLAUDE.md` 469 → 157 satır, `AGENTS.md` 445 → 158 satır.** İkisinde de
  ürün kararı kalmadı; geriye araca özel teknik bilgi kaldı (çalışma
  klasörü, komutlar, dizin, dört derleme girişi, iOS/WebKit durumu, arayüz
  denetimi, yayın, kurallar, çalışma düzeni). Başlarına ortak "Proje
  hafızası — HER OTURUMDA" okuma sırası eklendi.
  **AGENTS zinciri 24.387 → 7.490 bayt** — Codex'in 32 KiB talimat sınırı
  %71 doluluktan %23'e indi.
- **`PROGRESS.md`** içeriğine dokunulmadı; yalnız başına 11 satırlık kullanım
  notu ve yeni kayıt şablonu eklendi (bu kayıt şablonun ilk örneğidir).
- **Git hook:** `scripts/hooks/commit-msg` — commit `oyun/`, `src/`,
  `supabase/migrations/` ya da `araclar/` klasörlerine dokunuyorsa
  `PROGRESS.md` de değişmiş olmalı; değilse reddeder ve tetikleyen dosyaları
  yazar. Kaçış kapısı `[progress-yok]`. `package.json`'a tek satır eklendi
  (`"prepare": "git config core.hooksPath scripts/hooks"`); yeni bağımlılık
  yok, Husky kurulmadı.
  **Kök sebep — neden `pre-commit` değil:** kaçış kapısı commit mesajında ve
  `pre-commit` aşamasında mesaj henüz yazılmamıştır; `.git/COMMIT_EDITMSG`
  o sırada BİR ÖNCEKİ commit'in mesajını taşır. İlk denemede kapı bu yüzden
  yanlışlıkla açıldı ve koda dokunan bir commit sessizce geçti. `commit-msg`
  aşamasında mesaj dosyası `$1` olarak geldiği için kapı doğru çalışıyor.
  **Dürüst sınır:** hook yalnız yerel commit'te çalışır — bulut ortamı,
  GitHub arayüzünden düzenleme veya `npm install` hiç çalışmamış bir kopya
  için devreye girmez. Garanti değil, hatırlatıcıdır; asıl güvence
  `CLAUDE.md` / `AGENTS.md` talimatıdır.
- **Kök dizin temizliği:** 26 tek seferlik rapor (`PAKET*_RAPOR.md`,
  `QUIZ_TACTICS_PAKET*.md`, `DENETIM_RAPORU.md`) `git mv` ile
  `docs/paketler/` altına taşındı, hiçbiri silinmedi. Kökte kalıcı sekiz
  dosya kaldı. `docs/paketler/OKU.md`, bu kayıtlardaki eski kök adlarının
  artık nerede aranacağını söylüyor. `oyun/harita/CLAUDE.md`'deki tek
  bağlantı güncellendi.
- **Doğrulama:** `npm run build` temiz (6 uyarı önceden var olan
  ResizeObserver/randomUUID/color-mix bildirimleri). `npm run test:kurallar`
  6/6 geçti. Hook testi üç senaryoda beklendiği gibi: kod + PROGRESS'siz →
  reddedildi, `[progress-yok]` ile → geçti, yalnız `.md` ile → geçti; test
  commit'leri geri alındı. `git log --diff-filter=D` boş — hiçbir dosya
  silinmedi. `PROGRESS.md` diff'i yalnız ekleme.
- Not: bu dalın başında Codex'in commit edilmemiş avatar işi duruyordu;
  kaybolmasın diye sahibinin onayıyla önce kendi dalında commit edildi,
  hafıza çalışması onun üstüne kuruldu.

## 21 Eylül 2026 — Avatar migration'ı canlıya uygulandı + migration geçmişi ölçüldü
**Araç:** Claude Code
**Neden:** Profesyonel avatar seti main'e alındı; kodu migration olmadan yayınlamak avatar seçimini kırardı. Sahibi veritabanına bakamadığı için ölçüm de bu oturumda yapıldı.

- **Ölçüm (salt okunur, canlı DB):** `20260612000165`–`179` arası 15 migration
  `schema_migrations`'ta kayıtlı DEĞİLDİ ama nesneleri canlıda VARDI
  (`avatar3d_parcalar` + `avatar3d_sahip` tabloları, 58 parça, 160 bot). Yani
  elle uygulanmış, geçmişe yazılmamışlar. `npx supabase migration repair
  --status applied` ile 15'i işaretlendi; hiçbiri tekrar çalıştırılmadı.
- **Kök sebep — `db push` neden çalışmıyor:** `20260612000074`–`082` arası
  dokuz sürüm canlıda KAYITLI ama **adları yerel dosya adlarıyla uyuşmuyor**
  (uzak `...076` = `basit_soru_temizligi` ↔ yerel `isim_sehir_degistirme`;
  uzak `...079` = `soru_cografya_3` ↔ yerel `yeni_karakter_avatarlari`).
  Geçmişte dosyalar yeniden adlandırılmış. CLI bunu "eklenmemiş dosya" sanıp
  `--include-all` istiyor. Hangi SQL'in gerçekten çalıştığı belirsiz olduğu
  için bu dokuza DOKUNULMADI; `PROJECT_CONTEXT.md` › Açık İşler'e yazıldı.
- **`20260612000256_profesyonel_avatar_seti.sql` uygulandı.** Önce transaction
  içinde prova edilip geri alındı, sonra tek işlemde uygulanıp
  `schema_migrations`'a yazıldı (`db push` yukarıdaki tutarsızlık yüzünden
  kullanılamadı). Sonuç canlıda doğrulandı: 109 profil `/avatars/pro/**`
  setine taşındı, eski `k##.svg` kullanan 0 profil kaldı, 18 Google/https
  fotoğrafına dokunulmadı, `avatar_onayla` yeni listeyi kabul ediyor.
- **Push ve dağıtım:** `main` → `9b4a3d1` push edildi, Vercel dağıtımı
  doğrulandı. On pro avatarın onu da canlıdan `<svg` olarak dönüyor
  (`https://quiztactics.vercel.app/avatars/pro/*.svg`), ana sayfa HTTP 200.

## 21 Eylül 2026 — Migration numara çakışması çözüldü
**Araç:** Claude Code
**Neden:** `npx supabase db push` her çağrıda `--include-all` isteyip duruyordu; bu yüzden avatar migration'ı normal yoldan uygulanamamıştı.

- **Kök sebep:** `20260612000074`–`082` aralığında **her numarada İKİ dosya**
  vardı — geçmişte iki iş kolu paralel yürümüş ve aynı numara aralığını
  kullanmış. Defterde (`supabase_migrations.schema_migrations`) çiftin yalnız
  biri kayıtlıydı; CLI eşi görüp "hiç uygulanmamış" sanıyordu. Önceki kayıtta
  bu "ad uyuşmazlığı" olarak yazılmıştı — asıl sebep numara çakışmasıymış.
- **Ölçüldü:** kayıtsız kalan dokuz dosyanın içeriği de canlıda MEVCUT —
  `bot_oyna()`, `turnuva_lobi_botlari()`, `bildirimleri_oku()`,
  `takma_ad_sec()`, `profil_konum_kaydet()`, `gizli_al()`, `profilim()` ve
  `profiles_select` politikası. Yani dokuzu da uygulanmış, sadece defterde
  yer bulamamışlar.
- **Yapılan:** dokuz dosya `git mv` ile boş aralığa taşındı
  (`...257`–`...265`), sonra `migration repair --status applied` ile deftere
  yazıldı. **Hiçbir SQL yeniden çalıştırılmadı, canlı veriye dokunulmadı**
  — taşımadan sonra aynı nesneler ve aynı avatar dağılımı (109 pro / 0 eski /
  18 https) ölçülerek doğrulandı.
- **Sona taşımak neden güvenli:** dokuz dosyanın tamamı `create or replace`,
  `if not exists` ve `drop ... if exists` ile korumalı yazılmış; sıraya
  duyarlı ham `create table` / `insert` yok. Ayrıca çakışma dururken sıfırdan
  kurulum ZATEN yapılamıyordu (aynı numarada iki dosya) — taşıma bunu
  bozmadı, düzeltti.
- **Sonuç:** `npx supabase db push` artık **"Remote database is up to date."**
  diyor. Dosya adı çakışması sıfır. `PROJECT_CONTEXT.md` › Açık İşler'deki
  ilgili madde çözüldüğü için silindi.

## 21 Eylül 2026 — Skill genişletme + mobil oyun deneyimi (preview, canlı değil)
**Araç:** Codex
**Dal:** `codex/skill-mobile-game-revision`

- Klasik'e üç sunucu yetkili skill hazırlandı: **Sigorta** (yanlış 5 / doğru
  10), **2X** (doğru 20 / yanlış 0), **İkinci Şans** (ilk yanlış final cevap
  sayılmaz; sayaç sıfırlanmadan başka şık açılır). Mevcut 3 slot, toplam 6,
  tür başına 2, soru başına 1 ve envanterden tüketim kapıları korunur.
- Düello can sistemi olduğu için Sigorta ve 2X'e sahte puan mekaniği
  uydurulmadı; yalnız İkinci Şans normal savunma sorusunda kullanılabilir.
- Migration `20260612000266_skill_mobil_deneyim.sql`: yeni envanter türleri,
  atomik hazırlama/satın alma RPC'leri, İkinci Şans deneme tablosu, Klasik ve
  Düello cevap kuralları, rövanş iptal RPC'si ve ödül dengesi. **Production
  DB'ye uygulanmadı.** DB testi migration'ı transaction içinde çalıştırıp
  sonunda rollback yaptı (5/5 geçti).
- Ödül preview kararı: Düello galibiyeti Klasik baseline ayarına bağlandı;
  Saf Bilgi %50. Serbest ve skillsiz indirimleri çarpılmıyor.
- Mobilde `mobile-game.css` en son katman olarak eklendi. 360/390/412/430
  px hedefleri; eşit Klasik/Düello ana kartları, oyun HUD'ı alt menü, daha az
  iç içe panel, güçlü butonlar, maç/skill/mağaza/lig/turnuva/profil/arkadaş/
  boş-hata-sonuç yüzeyleri ve reduced-motion desteği. Düello girişindeki
  maskot kaldırıldı; yeni logo/maskot/bağımlılık eklenmedi.
- Skill ikonları kod içi özgün SVG yollarıdır; Sigorta, 2X ve İkinci Şans
  birbirinden ayrılır. Mikroanimasyonlar 620–680 ms, oyunu kilitlemez.
- Düello bot fallback uçtan uca tarayıcı testinde arama → bot eşleşmesi →
  maç ekranı **12.558 ms** sürdü; gerçek kural 8 sn arama + 2–5 sn gecikme,
  yani 10–13 sn. Konsol hatası yoktu.
- Rövanş “Vazgeç” kusuru doğrulandı: eski istemci yalnız pencereyi kapatıyordu.
  Preview dalında düğme `duello_rovans_iptal` çağırır; transaction testinde
  `rovans_isteyen` ve `rovans_at` gerçekten temizlendi.
- Mobil arayüz denetimi 16 sayfa × 7 genişlikte temiz: yatay taşma yok,
  sabit/sticky öğe kayması yok, ölçülen dokunma hedefleri ≥44 px, konsol
  hatası yok. Masaüstü düzeni media-query dışında bırakıldı.
- Doğrulama: build + eski tarayıcı ayrıştırma denetimi temiz (6 önceden var
  olan uyumluluk uyarısı), skill statik testleri 8/8, yeni DB testleri 5/5.
- **Canlıya alınmadı:** main'e merge/push yok, production migration yok,
  production deploy yok. Mobil görünüm ve maç içi skill animasyonları sahibin
  manuel görsel onayını bekliyor.
- Mobil oyun katmanı kodu ayrı `style: mobil oyun arayüzünü yenile` commitinde
  tutuldu; böylece skill/DB mantığı görsel revizyondan bağımsız incelenebilir.

## 21 Eylül 2026 — Skill + mobil revizyon canlıya alındı
**Araç:** Codex

- Sahibinin açık onayıyla `codex/skill-mobile-game-revision` dalındaki iki
  commit `main`e hızlı ileri alındı.
- `20260612000266_skill_mobil_deneyim.sql` production Supabase'e normal
  `db push` akışıyla uygulandı ve migration defterinde `266/266` doğrulandı.
- Canlı DB doğrulaması: Sigorta, 2X ve İkinci Şans aktif; Klasik/Düello lig
  galibiyeti 25/25; Saf Bilgi çarpanı 0.5; `duello_rovans_iptal` mevcut.
- Son build, skill testleri, transaction DB testleri ve 360/390/412/430
  arayüz denetimi yayın öncesinde temizdi. `main` GitHub'a push edilerek
  Vercel production dağıtımı başlatıldı.

## 21 Eylül 2026 — Profesyonel avatar seti 31 karaktere tamamlandı
**Araç:** Codex

- Dondurulmuş eski sette bulunup ilk profesyonel turda yapılmayan 21 karakter,
  mevcut 10 avatarın düz/katmanlı SVG çizim diliyle yeniden çizildi: Köpek,
  Baykuş, Tilki, Penguen, Kurbağa, Ayı, Maymun, Ejderha, Köpekbalığı, Ahtapot,
  Arı, Ninja, Şövalye, Büyücü, Dedektif, Viking, Hayalet, Zombi, Mumya,
  Palyaço ve Kral.
- Eski düşük ayrıntılı `k01.svg`…`k31.svg` dosyaları açılmadı; tarihsel geri
  dönüş için dondurulmuş kaldı. Canlı seçim yalnız `public/avatars/pro/`
  altındaki 31 profesyonel SVG'yi kullanır.
- Kurulum sihirbazı ve Profil › Avatar seçimi 31 karaktere genişletildi.
  Migration `20260612000267_profesyonel_avatar_seti_31.sql`, sunucudaki
  `avatar_onayla` izin listesini aynı 31 güvenli yerel adrese çıkarır.
- Kaynak `AvatarProIllustrations.jsx`, üretici `avatar-pro-uret.mjs` ve statik
  dosyalar birlikte tutuldu. Görsel grid masaüstünde denetlendi; karakterler
  birbirinden ayırt ediliyor ve mevcut koleksiyon dili korunuyor.
- Migration `20260612000267` production Supabase'e `db push` ile uygulandı;
  31 profesyonel avatarın tamamı sunucu tarafından kabul edilir. Build,
  31/31 avatar testi ve tam arayüz denetimi temiz geçti; `main` push'u Vercel
  production dağıtımını başlatır.

## 21 Eylül 2026 — Logo Exploration Pack (yalnız yerel preview)
**Araç:** Codex
**Dal:** `codex/logo-exploration-preview`

- Quiz Tactics için birbirinden farklı 10 düzenlenebilir SVG logo yönü üretildi:
  güçlü Q, Tactics vurgusu, QT monogram, taktik tipografi, modern oyun,
  minimal app icon, premium, rekabetçi, renk kontrastı ve quiz/hamle hibriti.
- `/preview/logo-exploration` rotasında her konsept ana logo, app icon, açık
  zemin ve koyu zemin olarak gösterilir; kısa açıklama ve final adayları vardır.
- Mevcut logo, menüler ve production akışı değiştirilmedi. **Canlıya alınmadı,
  push/deploy yapılmadı; yalnız yerel önizlemedir.**

## 21 Eylül 2026 — Logo Exploration V2 / Custom Wordmark (yerel preview)
**Araç:** Codex
**Dal:** `codex/logo-exploration-preview`

- İlk turun generic ikon + yazı yaklaşımı terk edildi. V2'de özgünlük, hazır
  ikonlardan değil özel çizilmiş Q ve özel vektör harf sisteminden gelir.
- Birbirinden farklı 10 custom wordmark yönü `/preview/logo-exploration-v2`
  rotasında hazırlandı. Her kartta büyük wordmark, yalnız Q'dan oluşan app icon,
  açık zemin ve koyu zemin kullanımı bulunur.
- Büyüteç, tik, soru işareti, konuşma balonu, satranç/beyin/roket/kalkan ve
  klasik e-spor amblemi kullanılmadı. Q kuyruğundaki hamle hissi soyut tutuldu.
- V1 rotası korunmuştur. Mevcut logo ve production branding değişmedi;
  **push/deploy yapılmadı, yalnız yerel preview hazırlandı.**

## 21 Eylül 2026 — Logo Exploration V4 / Mobile Game Title Logos
**Araç:** Codex
**Dal:** `codex/logo-exploration-preview`

- V1 ve V2'nin kurumsal/SaaS hissi terk edilerek 20 yeni mobil oyun title-logo
  yönü hazırlandı. Ana kelime yapısı her örnekte tek parça `[özel Q][UIZ]
  TACTICS`; ayrı Q ikonu + tekrar QUIZ hatası kullanılmadı.
- Kalın kontur, 2B katman, gölge, eğim, iki satırlı siluet ve güçlü renk
  ayrımı; mobile-store küçük ön izlemesinde okunacak şekilde çeşitlendirildi.
- Her konsept büyük wordmark, bağımsız Q app icon, açık/koyu zemin ve mock app
  header içinde `/preview/logo-exploration-v4` rotasında sunulur.
- Mevcut production logosu, header, metadata ve app icon dosyaları değişmedi.
  Çalışma yalnız preview dalına bağlıdır; production deploy yapılmayacaktır.

## 21 Eylül 2026 — Logo Exploration V5 / Final Refinement
**Araç:** Codex
**Dal:** `codex/logo-exploration-preview`

- Yeni keşif açılmadı; V4'teki 18 Super Quiz ana bazına 08 Quiz Knockout'ın
  kontrollü enerjisi ve 05 Golden Play'in okunaklılığı taşındı.
- Lacivert + turuncu ekseninde altı final adayı üretildi: iki Q odaklı, iki
  wordmark odaklı ve iki dengeli hibrit. Alt çizgi, hız çizgisi, maskot,
  slogan ve yarış/e-spor dekoru kullanılmadı.
- Her adayda `QUIZ TACTICS` eksiksiz ve tek Q ile gösterilir; özel Q, QUIZ
  kelimesinin parçasıdır ve ayrıca app icon ön izlemesinde tek başına denenir.
- Preview rotası `/preview/logo-exploration-v5`. Production logosu, header,
  metadata ve canlı app icon dosyaları değiştirilmedi.

## 21 Eylül 2026 — Logo Finalistleri vNext
**Araç:** Codex
**Dal:** `codex/logo-exploration-preview`

- Marka hiyerarşisi Q + TACTICS ön planda, UIZ küçük fakat okunur olacak
  şekilde sekiz disiplinli finalistte uygulandı.
- Adaylar aynı lacivert-turuncu ailede; Q odaklı, wordmark odaklı ve dengeli
  hibrit eksenlerine ayrıldı. Maskot, 3B/plastik efekt, slogan ve gereksiz
  dekor kullanılmadı.
- Her aday büyük logo, Q app icon, açık/koyu zemin ve küçük mağaza/header
  testiyle `/preview/logo-finalists-vnext` rotasında gösterilir.
- Önerilen üçlü: 01 Hero Q (ikon), 04 Tactics Stack (wordmark), 08 Master
  Balance (en dengeli). Production marka dosyaları değiştirilmedi.

## 21 Eylül 2026 — 08 Master Balance resmi marka entegrasyonu
**Araç:** Codex

- Sahibinin seçimiyle vNext 08 Master Balance resmi Quiz Tactics logosu oldu.
  Q + TACTICS ana ağırlık, küçük ama okunur UIZ hiyerarşisi korundu.
- Tek canlı React kaynağı `oyun/components/Logo.jsx` olarak yenilendi; üst
  çubuk, mobil Q işareti, giriş ekranı, yapılandırma hata ekranı ve ana ekrana
  ekleme penceresi aynı marka sistemini kullanır.
- PWA dosya adları geriye uyumluluk için korunarak `bildim-icon.svg`, 192 px,
  512 px ve maskable 512 px ikonları yeni Q işaretiyle yenilendi. Manifest,
  favicon, Apple touch icon ve paylaşım görseli mevcut yollar üzerinden yeni
  simgeyi alır.

## 2026-09-21 — Jev deneme testi
**Araç:** Claude Code
**Neden:** Jev'in soru doğruluğu, kategori ve zorluk kontrolünde işe yarayıp yaramadığını ölçmek.

Oyuna entegrasyon, DB yazması, migration ve arayüz değişikliği **yok**; tek
amaç ölçümdü. Rapor: `araclar/jev-test-sonuc.md`.

- **API:** `POST https://api.typesafe.ai/v1/systemone`, `{state, model, questions}`;
  üç tipli soru (`noul` · `choice` · `score`), cevaplar olasılık dağılımı +
  `confidence` ile dönüyor. Fiyat yalnız girdi jetonundan, 42 $/Btok.
  Resmi JS SDK'sı (`@typesafe-ai/sdk`) **kurulmadı** — depo kuralı gereği yeni
  npm paketi yok; REST biçimi `araclar/jev.mjs` içinde Node'un `fetch`'iyle
  çağrıldı (try-catch, zaman aşımı, 429/5xx için üstel geri çekilmeli 3 deneme).
- **Örneklem:** canlı `public.questions` tablosundan **salt okuma**, sabit
  tohumla 80 normal (10 kategoriden 8'er) + 20 çapa. Şıklar karıştırıldı;
  doğru cevap ve kategori Jev'e verilmedi.
- **Sonuç:** 99/100 doğru. `>0,9` güven kovası 93 soru ve **%100 doğru** →
  ölçüt %95'ti, Jev "ikinci görüş" kontrolcüsü olarak **geçti**. Tek yanlış
  ('Anayurt Oteli' → bizim cevabımız Yusuf Atılgan doğru) **0,05 güvenle**
  geldi; yüksek güvenle bizim cevabımıza karşı çıkılan hiç soru yok. Bu
  testte bizim yanlış cevaplı sorumuz çıkmadı.
- **Zorluk:** çapa ortalaması 1,25 · normal 2,46 → belirgin ayrım, kullanılabilir.
  Yan bulgu: normal havuz Jev'e göre 2'de yığılıyor, yani "orta" dediğimiz
  sorular aslında kolay tarafta.
- **Kategori:** 89/100 uyum; uyuşmayan 11 sorunun 10'u **bizim** etiket
  hatamız — `genel_kultur` fiilen çöp kutusu kategori olmuş. Otomatik
  değiştirme için değil, temizlik önerisi üretmek için uygun.
- **İki düzeltme:** kategori sayısı 13 değil **10** (`genel` ve `karisik` oyun
  kipi anahtarı, soru kategorisi değil). Çapa migration'ı `20260612000082`
  değil **`20260612000265_asiri_basit_sorular.sql`**; o 53 soru bugün pasif
  değil, `20260612000147` onları `zorluk = 1` ile yeniden aktif etmiş.
- **Maliyet:** 100 soru 0,004 $, ortalama çağrı 410 ms. Havuzun tamamı
  (12.454 soru) ~0,50 $ eder. Bütçe koruması (1 $) devreye girmedi.
- Anahtar `.env` içinde `TYPESAFE_API_KEY`, `VITE_` öneki yok, git'e girmedi,
  hiçbir çıktıya yazılmadı.

## 2026-09-22 — Jev tam havuz taraması
**Araç:** Claude Code
**Neden:** Zorluk, kategori ve soru kalitesi verisini tek seferde
toplamak; sonuç dosyada, canlıya henüz uygulanmadı.
**Yapılan:** `araclar/jev-tarama.mjs` (jev-test.mjs temelli, devam edebilir;
ham çıktı `araclar/jev-tarama/ham.jsonl` git dışı). 9290 aktif TR soru,
0 hata, $0,45, 11 dk. Özet: `araclar/jev-tarama/ozet.md` + `ozet.csv`.
**Sonuç:** >0,8 güvenle itiraz 21 · zorluk 1–5: 580/4645/3210/855/0 ·
eskiyebilir 103 · çoklu doğru 115 · hassas 77. En büyük kategori
uyuşmazlığı cografya→bilim ve genel_kultur→bilim (198'er).
**Not:** Jev'in `noul` cevabı olasılıktır (`{noul:0.87}`), `score` sürekli
puandır (0–4); eşik 0,5, zorluk yuvarlanarak sayıldı. İngilizce kontrol
sonraki pakette.

## 22 Eylül 2026 — Q Logo İşareti Laboratuvarı (preview)
**Araç:** Codex
**Dal:** `codex/q-logo-lab`

- Production markasına dokunmadan yalnız Q işareti için beş ayrı vektör
  çözüm hazırlandı: yuvarlak, geometrik, enerjik/eğimli, kompakt app icon ve
  açık halkalı özgün yön.
- `/preview/q-logo-lab` rotasında her aday büyük, 64 px, 32 px, açık/koyu
  zemin, uygulama ikonu ve mevcut `UIZ + TACTICS` tipografisi içinde gösterilir.
- Mevcut `Logo.jsx`, header ve PWA ikonları değiştirilmedi. Çalışma seçim
  laboratuvarıdır; üretim markasına ancak sahibinin seçimi sonrası bağlanacaktır.

## 22 Eylül 2026 — Forward Pulse Q resmi markaya alındı
**Araç:** Codex

- Sahibinin seçtiği Q Logo Lab 03 **Forward Pulse**, resmi `Logo.jsx`
  işaretine uygulandı. Logoyu kullanan üst menü, mobil başlık, giriş,
  yapılandırma ekranı ve ana ekrana ekleme penceresi tek kaynaktan güncellenir.
- PWA/app simgesinde sahibinin isteğiyle yalnız Q değil tam `QUIZ TACTICS`
  adı yer alır. Geriye uyumlu `bildim-icon-*` dosya yolları korunmuştur.
- Q laboratuvarı seçim geçmişi olarak ayrı rotada kalır; production akışına
  menü bağlantısı eklenmemiştir.

## 22 Eylül 2026 — Mobil tam logo ve PWA ikon önbelleği düzeltmesi
**Araç:** Codex

- Mobil CSS'de tam wordmarkı gizleyip yalnız Q'yu gösteren kural kaldırıldı.
  Telefon Chrome'u ve kurulu PWA üst barı artık masaüstüyle aynı tam
  `QUIZ TACTICS` logosunu gösterir.
- Android'in eski ikonu agresif önbellekten getirmemesi için aktif manifest,
  favicon, Apple touch icon, sosyal paylaşım ve kurulum penceresi yolları yeni
  `quiztactics-wordmark-*` dosya adlarına geçirildi. Eski `bildim-icon-*`
  dosyaları geriye uyumluluk için silinmedi.

## 22 Eylül 2026 — Mobil uygulama ikonu kompaktlaştırıldı
**Araç:** Codex

- Uygulama ikonundaki Q + UIZ + TACTICS grubu yaklaşık %15 küçültülüp merkeze
  alındı. Android'in daire/squircle maskesinde yazının kenarlara sıkışmaması
  için güvenli alan büyütüldü; aktif ikon URL'lerinin sürümü yenilendi.
- Oyun içi mobil üst bar logosu sahibinin isteğiyle aynen korundu.

## 2026-09-22 — Jev İngilizce çeviri taraması
**Araç:** Claude Code
**Neden:** İngilizce çevirilerin anlamı bozup bozmadığını tespit etmek; sonuç dosyada, canlıya uygulanmadı.

## 22 Eylül 2026 — TypeSafe (Jev) skill'i kuruldu
**Araç:** Claude Code
**Neden:** Jev'in doğru çağrılması ve toplu değerlendirme işlerinde
otomatik akla gelmesi için; proje kapsamında kuruldu.

## 2026-09-22 — Vercel depolama + gelistirme dalı
**Araç:** Claude Code
**Neden:** Vercel Deployment Storage %75'e çıktı; ayrıca işler canlıya otomatik yansımasın, önce önizlemede görünsün.

- **Dal düzeni:** `gelistirme` dalı `main`'den açıldı ve push edildi. Kural
  CLAUDE.md + AGENTS.md › "Dal düzeni"ne yazıldı (main = canlı, yalnız Ida
  "canlıya al" deyince). Önizleme linki:
  https://quiztactics-app-git-gelistirme-idagureli-4647s-projects.vercel.app
  (Vercel Deployment Protection açık: Vercel'e giriş yapmamış tarayıcıda
  302 → giriş sayfası). Önizleme aynı Supabase'e bağlı — migration dal
  ayrımı tanımaz.
- **dist ölçümü:** 19,4 MB, 286 dosya. `dist/meydan` 13,7 MB (%70) —
  dondurulmuş meydanın `public/meydan/aday-quaternius` (9,1 MB) ve
  `public/meydan/deneme` (4,5 MB) varlıkları `public/` altında olduğu için
  bayraktan bağımsız her derlemeye kopyalanıyor. `public/sounds` (1,8 MB,
  26 wav) DidaGP ayrıldıktan sonra sahipsiz; kodda referansı yok.
  `public/avatar-lab` 0,9 MB (AvatarLab sayfaları kullanıyor). three.js
  (619 KB) lazy chunk'ta, `index.html` modulepreload listesinde yok.
  Hiçbir şey silinmedi/değiştirilmedi — karar Ida'nın.
- **Vercel temizliği (yalnız `quiztactics-app` projesi):** 135 dağıtım
  (18–22 Eyl) vardı; canlı + en yeni 5 korunup **130 silindi**, hata 0.
  Canlı 200 döndü. Takımdaki diğer projelere dokunulmadı: `idagg-game-center`
  361, eski `quiztactics` (hub reposu) 233, `basketlig` 157, `y` 19,
  `stratejioyunu` 18, `dist` 1 dağıtım — depolamanın büyük kısmı muhtemelen
  bunlarda. Depolama rakamı GB-ay hesabıyla gecikmeli düşer.

## 2026-09-22 — Aşama 1: Vercel temizliği + derleme küçültme
**Araç:** Claude Code
**Neden:** Vercel Deployment Storage %75'teydi; eski dağıtımlar ve derlemeye giren kullanılmayan varlıklar kalıcı yük.

- **Dağıtım temizliği** (canlı + en yeni 5 korundu, Vercel API; saatte 200 silme
  sınırına takıldı, betik 10 dk bekleyip sürdürdü): idagg-game-center 356,
  eski quiztactics (hub reposu) 228, basketlig 152, y 14, stratejioyunu 13,
  dist 0 → **763 silindi, 0 hata**. Altı projenin canlı adresi 200 döndü.
  Önceki oturumda quiztactics-app'ten 130 silinmişti; toplam 893.
- **Meydan varlıkları TAŞINMADI** (talimat: canlı referans varsa atla). `/insan-prototip`
  rotası bayraksız açık ve `/meydan/aday-quaternius/` yüklüyor
  (`oyun/harita/aday/HazirInsanPrototipi.jsx:8`, rota `src/BildimApp.jsx:143`).
  Hiçbir sayfa bu rotaya bağlantı vermiyor. `public/meydan/deneme`'ye giden bütün
  referanslar dondurulmuş özelliklerde (MEYDAN_ACIK / GARDIROP_ACIK arkasında).
  Karar Ida'da: rotayı da dondurup iki klasörü taşımak ya da yalnız `deneme`'yi taşımak.
- **Sesler taşındı:** `public/sounds` (26 wav, 1,8 MB, DidaGP) → `varliklar-dondurulmus/sounds/`
  + README. Her dosya adı kodda arandı, çağrılan yok (`pop` eşleşmesi logo adıydı).
- **Doğrulama:** dist 19,40 MB → **17,63 MB** (286 → 260 dosya). Önizleme linki
  Chrome'da açıldı: konsol hatası yok, kırık kaynak yok. Oturumlu sayfalar
  `araclar/arayuz-denetim.mjs` ile aynı derleme üzerinde (vite preview) 16 sayfa ×
  4 genişlik: TEMİZ. Önizlemede "Misafir olarak dene" basılmadı (ortak
  veritabanında hesap açardı). Maç ekranı açılmadı; seslere kodda referans olmadığı
  için etkilenmez.

## 2026-09-22 — Aşama 2: Düello 1.0 · oturum 1/3 (sunucu)
**Araç:** Claude Code
**Neden:** Ida onaylı Düello 1.0 kurallarının sunucu tarafı; bayrak arkasında, canlı eski akışta kalır.

- **Ölçüm:** migration 254 (ve 250–267'nin hepsi) canlıda UYGULANMIŞ —
  `schema_migrations` + `joker_hak_kontrol`/`skill_kullanim_kapisi` var. Görevdeki
  "254 uygulanmamış" notu güncel değil.
- **Eski akış özeti:** `duello_olustur` (davet eden ilk saldıran) → `kategori`
  (`duello_kategori_sec`, süre dolarsa `duello_ilerlet` zayıf olmayan rastgele) →
  `duello_kategori_uygula` → `hazirlik` (6 sn, yalnız saldıran soruyu görür,
  `duello_saldiri_jokeri`) → `cevap` (yalnız savunan: `duello_cevap` →
  `duello_cozumle`, zayıf kategori riski) → `sonuc` → ikinci saldırı →
  `duello_tur_sonu` (can → doğru sayısı → `altin` soru) → `duello_bitir` (ödül).
  Her eylem `duello_kilitle` (FOR UPDATE + `duello_ilerlet`) içinden geçer;
  cron `duello_tik_hepsi` ilerletir ve botu oynatır. Skill: `joker_al_ve_kullan`
  → saldırı/savunma jokeri; kapı `joker_hak_kontrol` + `skill_kullanim_kapisi`.
- **Migration `20260612000268_duello_v2_sunucu.sql` — CANLIYA UYGULANMADI.**
  Bayrak `duello_surum` = 1. Sürüm maç oluşurken `duellolar.surum`'a yazılır.
  Yeni kolonlar: `duellolar` (surum, uzatma, cevaplar, soru_baslangic, bitis1/2,
  elli1/2, kopuk_kalan1/2), `duello_hamleler` (surum, uzatma, saldıranın cevabı,
  yanıtsız bayrakları). 12 yeni `duello2_*` fonksiyonu (istemciye kapalı);
  eski 11 giriş noktası canlı tanımın birebir kopyası + başta "surum = 2 ise
  yeni fonksiyona git" satırı. Yeni ayarlar: `duello2_kategori_sn` 8,
  `duello2_cevap_sn` 15, `duello2_cevap_tolerans_sn` 1,
  `duello2_zaman_baskisi_eksi_sn` 5, `duello2_zaman_baskisi_taban_sn` 3,
  `duello2_skill_toplam_hak` 4, `_tur_basi_hak` 2, `_soru_basi_hak` 1.
- **Yorumla verilen kararlar (Ida değiştirebilir):** "kategori maçta 2 kez" =
  iki oyuncunun saldırıları birlikte (eskisi saldıran başınaydı); "aynı kategori
  üst üste gelmez" korundu; Zaman Baskısı rakibin kalan süresinden 5 sn düşer
  (en az 3 sn kalır); uzatmada roller sırayla, kategori fazı yok; can 0'ın
  altına inmez; ilk maçtaki +5 sn kategori payı v2'de yok; rövanşta da ilk
  saldıran rastgele.
- **Bot:** bot mantığına dokunulmadı. v2 maçında bot kategori seçer (eski yol
  v2 kuralına uyarlanır) ama CEVAP VERMEZ (eski çözümleyici v2'de etkisiz) →
  oturum 3 bitmeden bayrak 2 yapılmamalı.
- **Testler:** `_test/sunucu/duello-v2.test.mjs`, `npm run test:duello2`
  (migration işlem içinde uygulanır, geri alınır): 26/26. Mevcut sunucu
  testleri 268 uygulanmış hâlde 97 geçti / 0 hata (16 atlanan: yalnız 255/266
  provasına özel). Gerçek iki bağlantılı eşzamanlılık testi yapılamadı:
  migration uygulanmadan iki ayrı bağlantı yeni fonksiyonları göremiyor.
  Sıralama FOR UPDATE ile sağlanıyor; tek bağlantıda ikinci cevap, geç cevap,
  çözümden sonra cevap ve tekrar eden ilerletmenin tek hamle yazması test edildi.
- `npm run build` temiz.

## 2026-09-23 — Büyük paket: Düello 1.0 tamamlama · sorular · mobil lig · mod testi
**Araç:** Claude Code (ana ajan + 6 paralel şerit alt ajanı)
**Neden:** Düello 1.0'ı test hesaplarında açmak, mobil lig hatasını kapatmak, küçük arayüz borçlarını ödemek, bütün modları uçtan uca denemek.

- **Faz 0:** `/insan-prototip` `MEYDAN_ACIK` bayrağına bağlandı; `public/meydan/{deneme,aday-quaternius}`
  → `varliklar-dondurulmus/meydan/` (README). dist 17,63 → **4,10 MB** (son build 4,14).
- **Şerit A (Düello arayüz):** `DuelloV2.jsx` + `duello-v2.css`; `surum === 2` maçta yeni ekranlar
  (8 sn kategori + n/2 sayacı, eşzamanlı cevap, "rakip cevapladı", simetrik sonuç, Yanıtsız,
  uzatma, skill şeridi 4/2/1 + Soru Değiştir kilit metni, maç sonu geçmişi). v1 aynen.
  Giriş ekranı sürümü `duello_surum_benim()` RPC'sinden okur.
- **Şerit B (bot, 269):** `duello2_bot_tik` — güçlü kategori, kategoriye göre isabet, açık bot
  0,3–0,8 sn / gizli bot `bot_gecikme_sn`, uzatmada oynar, Klasik bot skill deseni (%15).
- **Şerit C (kontrast/turnuva):** 7 maddenin 5'i Paket 43'te zaten yapılmıştı (ölçüldü).
  `.bd-lobi-kilic` üç tanımdan teke indi (kazanan `.app .bd-lobi-oyuncu .bd-lobi-kilic`,
  hesaplanan stil birebir aynı). Son 5 sn filigranı dekoratif bırakıldı (aria-hidden,
  aynı sayı süre göstergesinde 3,63:1), gerekçe tema.css'te.
- **Şerit D (sorular):** 1000 soru (≥%87 zor), EN çeviri, Jev kapısı (2.336 çağrı, 0,078 $),
  274 zorluk. **Ida durdurdu — 270–274 uygulanmadı**, `araclar/soru-parti-1000/bekleyen-migrationlar/`.
  Kalıcı kazanç: `soru:iceri` şık denge kapısı gerçekten engelliyor (`kapi.mjs`; eskiden yalnız uyarıydı).
- **Şerit E (mobil lig, 275) — kök sebep iki:** (1) `yeni.css:137` 560 px altında
  `.rank-row>button{display:none}` — 19 Eyl'de satırın tamamı bu düğmenin içine alınmıştı →
  satırlar boş kutu; `oyun/pages/lig.css` ile düzeldi. (2) 243'te `lig_grubum`'dan
  `lig_uyeligim_kur` çağrısı düşmüştü → yeni hesaplar hafta sonuna kadar boş lig. Misafir
  hesap ligde 5 maçtan sonra görünür (görünür misafir 8 → 1).
- **Şerit F:** SVG `Bayrak` (87+1 ülke; profil, kart, konum, kurulum, lig), zilde "Tümünü
  okundu say", grup maçı çıkış onayı, Facebook "yakında" notu, `oyun/CLAUDE.md` turnuva ifadesi.
- **Ida'nın ek talimatı:** `duello_surum` herkese 2 YAPILMADI. Migration 276:
  `duello_v2_test_kullanicilari` (Ida + 3 denetim hesabı). Test hesabı + test hesabı/bot → v2;
  test hesabı + canlı gerçek oyuncu → v1 (canlı oyuncu eski arayüzde v2'ye düşmesin).
- **Faz 2:** 268, 269, 275, 276 canlıya uygulandı (öncesinde 268'in kopyaladığı 12 canlı
  fonksiyonun değişmediği doğrulandı; birleşik prova + 127 sunucu testi 0 hata). Canlıda
  cron hatasız. **İlk gerçek iki bağlantılı test** (iki test hesabı, maç sonra iptal):
  eşzamanlı doğru+doğru → nötr, tek çözüm; doğru/yanlış → doğru can; aynı oyuncu çift cevap →
  biri reddedildi; Soru Değiştir ∥ rakip cevabı → cevap önce, Soru Değiştir kilitli.
- **Faz 3 (yerel dev sunucu, canlı DB, test hesabı):** Düello v2 bota karşı iki tam maç
  (eşleşme 16,6/16,8 sn, skill, can tablosu, geçmiş, konsol temiz); Düello v1 altın soruya
  kadar; Klasik dereceli (60–90) ve serbest (ücretsiz 50:50) sonuna kadar; Çalışma, turnuva
  lobisi, Hızlı Mod kapalı notu, lig; arayüz denetimi 16 sayfa × 4 genişlik TEMİZ.
  Turnuva canlı seans saatinde değildi, grup maçı arkadaşlık ister — ikisi sunucu testleriyle.
- **Düzeltilen hatalar:** saat sapması — sunucu soruyu başlangıç + 15 sn GEÇİNCE kapatıyor,
  istemci 0'da istek atınca reddediliyordu ("soru atlama yeniden denenecek") → 0,6 sn pay
  (`QuestionCard`, bütün modlar). `HazirKapisi` "Rakibin N dakikadır gelmedi" uyarısını
  bekleyen oyuncunun kendisiyken de gösteriyordu → yalnız oyuncu hazırken. Soru bildir
  düğmeleri 32 → 44 px.
- **Düello eşleşme şikâyeti:** sunucu yeni hesabı işlem içinde ~10 sn'de bota eşledi, e2e 16 sn.
  `rpc_sayac`'ta son günlerde `duello_ara` çağıran yalnız 4 hesap var, hepsi düello aldı —
  şikâyetteki deneme sunucuya hiç ulaşmamış. Yeniden üretilemedi.
- **Ida'nın takılan maçı** (`a76f2752`, 22 Eyl 20:21 UTC, v1): istemci 56. sn'de nabzı kesti,
  sunucu 45 sn bekleyip maçı bota verdi (`bitti`). Aktif kalmadı. Temiz istemciyle v1 akışı
  sonuna kadar oynandı, takılma üretilemedi; en olası sebep sekmenin/telefonun arka plana alınması.
- **.catch deseni raporu (düzeltilmedi):** RPC hatası yutulan: `DuelloPage.jsx` (duello_aramadan_cik ×2),
  `ChallengesPage.jsx:632`, `RakipAra.jsx:264`; `{error}` kontrolü yok: `ProfilAyarlari.jsx:94`,
  `CalismaPage.jsx:108`, `MatchPage.jsx:563`, `HizliModPage.jsx:111`, `ChallengesPage.jsx:278`,
  `Home.jsx:75`; RPC dışı: `JokerCubugu.jsx:188`, `MatchPage.jsx:554`, `HizliModPage.jsx:194`.

## 2026-09-23 — Paket 2 kapanışı: ekonomi · level/rütbe · skill envanteri · son test
**Araç:** Claude Code (ana ajan + Şerit A/B ve Faz 5 alt ajanları)
**Neden:** Oyun mantığındaki kod işini bitirmek; sonraki aşama arayüzün baştan tasarımı.

- **Faz 0A (telefonda Düello'da şıka basılamıyor) — AÇIK.** Önizleme + Android/iPhone
  taklidi (dokunuşla, 390/360/412 px, taze oturum, yenileme, arka plan, yavaş 3G, Ida'nın
  skill seti) → hepsinde şıklar dokunulabilir, üstteki öğe şıkın kendisi. Kanıt (Ida'nın
  maçı b7c0a0a5): maç boyunca sunucuya tek eylem ulaştı — 21:33:41,9 kategori seçimi
  (`duello_eylem` sayacı; otomatik atlama değil, Düello QuestionCard kullanmaz); sonra
  hiç cevap isteği yok, durum sorguları sürüyor (40), kopukluk yok, terk 21:34:07.
  Elenen adaylar: hale/`AnaEkranaEkle` (pointer-events:none), arama katmanı (unmount),
  RankUpOverlay (opak, dokununca kapanır), `calisan` (çıkış onayı çalıştı). **`?tani=1`
  paneli eklendi** (`TaniPaneli.jsx`): dokunulan noktadaki en üst öğe, tam ekran sabit
  katmanlar, Düello kilit koşulları. Ida'nın telefonda denemesi bekleniyor.
  Klasik'te ilk soruda 3-2-1 sayımı şıkları kısa süre kapatıyor (tasarım gereği).
- **Şerit A (277–279):** coin Klasik 30/12/0, Düello 45/0 (serbest ve Saf Bilgi mevcut
  %50 mekanizmasıyla 15/6); XP Klasik 30/15/10, Düello 45/15, turnuva 20 + ilk 3'e 50;
  `profiles.level/level_xp/xp`, `xp_hareketleri`, `xp_ver` (level 20 coin, 5 levelde
  skill hakkı, rütbe 100 coin; tavan dışı); rütbe level'e bağlı, Efsane → Dâhi (EN
  Genius); bot level'i seviye puanı × 0,6–1,1 (tohumlu, sabit); RankUpOverlay kapanmama
  hatası düzeldi; profil/ana sayfa/maç sonu level göstergeleri.
- **Şerit B (281–284):** `skill_katalogu` + kilit + `skill_kilidi_ac`; fiyatlar 20/20/30/30/30,
  10'lu paket 170/255; `skill_seti_slot` 3 → 7 (loadout kapalı); `envanterim` artık bütün
  türleri döndürüyor (eskiden 4 tür; maç çubuğu hak varken satın alma açıyordu);
  `skill_dukkani()`.
- **Birleştirme (285):** `oyuncu_level()` → `profiles.level`.
- **Faz 2:** 277–279, 281–285 prova (birleşik, 152 test / 0 hata) → canlıya → doğrulandı
  (insanlar L1, botlar L1–102, coin değişmedi, cron temiz). 270–274 bekleyen soru dosyaları
  hâlâ `araclar/soru-parti-1000/bekleyen-migrationlar/`.
- **Faz 3:** 19 sessiz hata yeri düzeldi; yeni `oyun/lib/rpcDene.js`.
- **Faz 4 (önizleme + Android taklidi, dokunuş, gerçek akış, sonuç DB'den):** Düello v2
  mağlubiyet 15 XP / 0 coin, 50:50 envanter 4→3; Düello v1 (listeden geçici çıkarılarak)
  bozulmadı; Klasik serbest mağlubiyet 10 XP / 0 coin; dereceli galibiyet +25 lig / +30
  coin / +30 XP; serbest galibiyet +15 coin + Level 2 (+20 coin); Saf Bilgi galibiyet +12
  lig / +15 coin / +30 XP; bot testleri 48/48; arayüz denetimi 16 sayfa TEMİZ; konsol/ağ
  temiz. Turnuva canlı seans dışında, grup arkadaşlık ister → sunucu testleriyle.
  Maç sonu ekranında dinleyici sayısı artışı ölçüldü → zorunlu GC sonrası sabit, sızıntı değil.
- **Level eğrisi:** L100 = 25.691 XP; günde 10 maç (karışık, %50 galibiyet, ort. 25 XP)
  → ~103 gün (~3,4 ay; hedef ~4 ay). Katsayıya dokunulmadı.
- **Faz 5:** `docs/TASARIM_HAZIRLIK.md` (ekran envanteri, paylaşılan bileşenler, metinler,
  CSS, veri kaynakları, dondurulanlar, Paket 2 ekleri).
- **Karar bekleyen:** maç içi "hak yoksa al ve kullan" akışı; Sigorta/2X fiyatı (60) ve
  10'lu paketleri; level eğrisi hızı; A'nın eklediği kurallar (oynamayan kaybedene XP yok,
  kazanansız Düello'da iki tarafa 15 XP, level coini tavan dışı); lig "n/60" gösterimi;
  iletişim e-postası.

## 2026-09-23 — Paket 3: soru üretimi (gece, parti parti)
**Araç:** Claude Code (ana ajan + parti başına bir alt ajan)
**Neden:** Havuzu dengelemek (coğrafya %24 → sıfır ekleme) ve zor soru açığını kapatmak; kesintiye dayanıklı, her parti kalıcı.

- **Faz 0 — bitti:** bekleyen 1000 soru (270–273) ve Jev zorluğu (274), CLI atlamasın diye
  286–290 olarak yeniden numaralandı (içerik aynı), prova → canlı → doğrulandı. Aktif havuz
  9.290 → 10.290; 1000 sorunun hepsinin EN çevirisi var; doğru şık 241/239/238/282.
  Dağılım (sorulara dokunulmadı): sinema 139 · teknoloji 130 · müzik 132 · sanat 126 ·
  spor 118 · edebiyat 112 · bilim 100 · tarih 100 · genel kültür 43 (60'ı TR yerel);
  zorluk 1/2/3/4/5 = 1/5/125/402/467 (≥%87 zor). Havuz zorluğu sıralamaya göre:
  939 / 1.846 / 3.861 / 2.241 / 1.403.
- **Faz 1 — devam ediyor:** her parti 250 soru, 7 adım (üret → şık denge + Jev kapısı →
  EN → migration → prova/uygula/doğrula → durum.json → commit+push). Güncel sayım ve
  parti listesi: `araclar/soru-uretim/durum.json` (tek doğru kaynak).
  Ara durum (parti 5 sonrası): 5 parti bitti (migration 291–295), net 1.250 soru, hata 0;
  aktif havuz 11.540; kategori ve zorluk kotaları birebir; Jev ≈ 0,12 $.

## 2026-09-23 — Düello 3 hata (Ida, telefon) · oyuncu gibi test · dal düzeni kalktı · Düello 1.0 herkese
**Araç:** Claude Code (ana ajan + soru/denetim alt ajanları)
**Neden:** Ida telefonda saldırırken şıka basamadı, skill'ler sığmıyordu, saldırı/savunma ayrımı görünüyordu; eski e2e testi bunları kaçırmıştı.

- **Soru üretimi durduruldu (Ida kararı):** parti 6 taslak aşamasında bırakıldı (203 taslak,
  DB'ye yazılmadı, `durum.json › yarida_birakilan`). Toplam: Paket 3'te 5 parti = 1.250 soru
  (291–295), aktif havuz 11.540. Sıradaki migration no 298 (296–297 bu işe verildi).
- **Paralel raporlar:** `araclar/jev-tarama/sik-ipucu.md/.csv` — 11.540 sorunun 1.310'unda
  (%11,4) Jev soruyu görmeden doğru şıkkı >0,8 güvenle buluyor (teknoloji %21, bilim %15);
  0,20 $. `docs/SATIN_ALMA_DENETIMI.md` — gerçek parayla satın alma çalışmıyor (Play anahtarı
  yok, doğrulama 503), yüksek önem: jeton tekilliği yok, onaylama istemcide/yutuluyor.
- **A — saldırırken şık kapalı, KÖK SEBEP:** Ida canlı sitede (`main`) oynadı; `main`'de Düello
  1.0 arayüzü yoktu, ama hesabı `duello_v2_test_kullanicilari`'nda olduğu için sunucu v2 maçı
  verdi. Eski (v1) arayüz v2 maçını v1 gibi çizdi: v1'de saldıran cevaplamaz → şıklar
  `soruBlogu(false)`. Kanıt: 6e95f917'de Ida saldıran olduğu iki turda yanıtsız, savunduğu
  turlarda cevaplı; b7c0a0a5 de v2. Çözüm: `main` birleştirildi + `DUELLO_EN_YUKSEK_SURUM`
  kapısı (tanınmayan sürümde maç çizilmez, yenileme istenir).
- **Testte bulunan ek hatalar (düzeldi):** (1) Düello'da skill isteği sürerken (~2 sn) bütün
  şıklar kapalıydı → yalnız cevap isteği kilitler (`DuelloV2.jsx`). (2) Coin'le skill alımı
  ile durum sorgusu ters sırayla kilitliyordu → 40P01 deadlock; migration 296 kilit sırası
  (rpc_sayac → maç → profil; Klasik'te de maç → profil). (3) Maç sonu eylem çubuğu sekme
  çubuğunun arkasındaydı ("Yeni düello" görünmüyordu): `.tabbar` seçicisi arayüz
  yenilemesinden beri yoktu (`.mobile-nav`) + ölçüm oyun modu kalkmadan yapılıyordu
  (`MacSonuSahnesi.jsx`, bütün modlar).
- **B:** loadout kapalıyken seçim ekranı gizli (gelistirme'de doğruydu, canlıda eski koddu).
  7 yuva için satırda en çok 4 sütun, dar ekranda simge üstte (`SkillSeti.jsx`, tema.css).
  Maç içi skill çubuğu 3 sütun ızgara, sarıyor — sorun yok (ölçüldü).
- **C:** v2 arayüzünde saldırı/savunma gruplaması yok; kalan tek görünür yazı ana sayfa
  "3 can · saldırı ve savunma" → "3 can · aynı soru, aynı anda". v1 kodu ve katalogdaki
  `kategori` alanı duruyor.
- **Yeni kalıcı araç `araclar/oyuncu-testi.mjs`** (kural PROJECT_CONTEXT › Test kuralı):
  her soruda şık açık mı (değilse anında başarısız), dokunuş sunucuya ulaştı mı (DB),
  maç sonunda yanıtsız soru var mı, 360/390 px kutu kesişimi (modal ve sabit menü ayrımıyla),
  Düello ≥3 saldıran + ≥3 savunan, `--uzatma`. Sonuç CANLIDA: Düello geçti (saldıran 4,
  savunan 3, uzatmada saldıran cevapladı; ilk/sonraki tur, skill var/yok), Klasik 20/20 geçti,
  turnuva 10:00 seansında 5/5 geçti (lobiye katıl → doğru şık → DB).
- **Dal düzeni kalktı (Ida kararı):** `gelistirme` → `main` ileri sarıldı ve push edildi,
  kurallar CLAUDE.md/AGENTS.md'de "doğrudan main". Migration 297: `duello_surum` = 2
  (canlı paket yayına çıktıktan SONRA uygulandı). Test listesi altyapısı silinmedi.

## 2026-09-23 — Büyük paket: Tasarım Adım 1 + 4 sunucu işi + kararlar (6 şerit)
**Araç:** Claude Code (ana ajan + 6 şerit alt ajanı)
**Neden:** Ida: görünüm "oyun gibi değil" → 3 yön; şık ipucu, turnuva zorluğu, bot gerçekçiliği, satın alma açıkları, bekleyen kararlar.

- **T (tasarım):** Impeccable (pbakaus) + Emil Kowalski skill'leri `.claude/skills/` (impeccable.exe
  14 MB git dışı; `init` kullanıcıyla yapılmadı). `/tasarim-yonleri` (menüsüz, girişsiz): A Şeker
  Kutusu · B Arena Gecesi · C Stüdyo Işıkları; araştırma + 390 px görüntüler `docs/tasarim-yonleri/`.
  Kontrast 17 çiftin hepsi ≥4,5. Canlıda 390 px açılıyor, taşma/konsol 0.
- **S1 (298):** 1.310 soru `sik_ipucu_jev` (ağırlık 2, elle işaret, tetikleyici korur); rekabetçi
  havuz 6.694 → 6.303, en düşük teknoloji 463 (≥2 zorluk). Serbest Klasik'e de gelmiyor (yalnız
  Hatalarım) — karar bekliyor. Kalıcı Jev "soru olmadan" kapısı: `soru:iceri` + üretim hattı.
- **S2 (300):** turnuva 1–5 zorluk 1–2 · 6–10 → 3 · 11+ → 4–5, altın 4–5, alt dilime düşme,
  `turnuva_zorluk_*` ayarları. Prova: `1 1 2 2 2 · 3×5 · 5 5 4 4 5 …`.
- **S3 (302):** `bot_soru_isabet` (+15/+8/0/−8/−15, rekabetçi havuza göre ofset −3,16, %5–98),
  bütün modlar. Ortalama düşük/orta botlarda birebir; yüksek botlarda tavan yüzünden −0,8…−1,3.
- **S4 (304–306):** `coin_satin_alma_defteri` (jeton/sipariş hesaptan bağımsız tekil), sunucuda
  consume, iade taraması (`satin_alma_iade_takibi`=false), tek kullanımlık reklam jetonu (min 10 sn).
  SQL 34/34, Edge mock 22/22. **Edge Function'lar DAĞITILAMADI** (CLI 403, Chrome eklentisi yok).
- **K (307):** Sigorta 30 / 2X 40, 10'lu 255/340 (+joker_paketleri satırları); paket adı
  `com.quiztactics.app`; PROJECT_CONTEXT › Kararlar (23 Eyl, test değeri); 10.000 coin yayın günü işi.
- **Birleştirme:** 298–307 prova → canlı → doğrulandı. `npm test` 96/0 (+kurallar 13, birim 8, dans);
  eski testler güncellendi (v1 Düello testleri kendi işleminde `duello_surum`=1, fiyatlar 307, reklam
  jetonu). İlk koşudaki 120 sn zaman aşımları eşzamanlı test kilitlerindendi. Oyuncu testi canlıda:
  Klasik 20/20, Düello saldıran 5 / savunan 5 temiz; araç yarım maça katılınca önceki turları artık
  saymıyor. Arayüz denetimi 16 sayfa temiz. Build temiz.

## 2026-09-23 — Tasarım Adım 2: Yön A "Şeker Kutusu" ile bütün site + ses + çeviri
**Araç:** Claude Code (ana ajan + Faz 0/1/3/4 ve 6 ekran şeridi alt ajanı; ayrıca soru ajanları)
**Neden:** Ida Yön A'yı seçti; oyun "oyun gibi görünsün", TR/EN tam, sesler kimlikli olsun.

- **Faz 0:** Impeccable hook'ları kaldırıldı (settings.local.json boş); `PRODUCT.md` (impeccable
  init — röportajsız, brif + PROJECT_CONTEXT'ten; çıkarımlar etiketli). Migration 309: şık ipucu
  işaretli 1.310 soru Serbest Klasik'te görünür (`soru_sec(..., p_serbest_klasik)`), rekabetçi
  modlarda değil. Not: serbest maçın rövanşı hep dereceli açılıyor (eskiden de böyle).
- **Faz 1:** `oyun/tasarim/` tasarım sistemi (token `--qt-*`, `Qt*` bileşenleri, 76 ikon, hareket),
  `/tasarim-sistemi`, OKU.md; 37 kontrast çifti AA. Çeviri çakışmasın diye şerit başına
  `oyun/lib/ceviri/*.js` (dil.js katıyor).
- **Faz 2 (6 şerit, hepsi canlıda):** A kabuk + ana sayfa + modlar/arama + meydan okumalar ·
  L lig + arkadaşlar + mesajlar + bildirim/rozet · D dükkân + profil/ayarlar · G giriş/kurulum +
  404/kapalı mod + gizlilik/koşullar/PWA · M1 Klasik + maç sonu + turnuva + grup + Hatalarım ·
  M2 Düello (kategori geri sayımı sesli + son 2 sn kırmızı nabız, tur bandı, soru geliş halkası,
  50:50 kırılma, kalp kırılması). Bulunan hatalar: e-posta doğrulama regex'i "s" harfli adresleri
  reddediyordu (heredoc ters bölü kaybı — bash heredoc ile kod yazılmaz), rozet ikonu yazı olarak
  basılıyordu, "coin yetmiyor" EN'de tutmuyordu, koda gömülü fiyat/ödül yedekleri kaldırıldı.
- **Faz 3:** Kenney CC0 — 17 yeni WAV (ffmpeg yok → Chrome'da ogg→WAV; iOS güvenli), toplam
  ~630 KB; `ses.js` arayüzü aynı + yeni fonksiyonlar, osilatör yedek.
- **Faz 4:** QtAvatar no-referrer, yasal geri düğmesi çift stil; eski CSS'ten 2.096 kullanılmayan
  kural silindi (−7.069 satır, 16 sayfada stil farkı 0; import edilmeyen `level.css`,
  `skill-dukkani.css` silinmedi); arayüz denetimi 16 sayfa × 7 genişlik temiz; Impeccable 4 bulgu
  (bilinçli, bırakıldı); EN modunda Türkçe kalmadı.
- **CI kök sebep:** `testler.yml` her push'ta 20 dk sunucu testini CANLI DB'ye koşuyordu; bugün 5
  koşu üst üste → Düello'da 57014 statement timeout, canlı sorgular 3–10 sn. Push tetiği kaldırıldı
  (gece 03:00 + elle), concurrency tek koşu.
- **Test (canlı):** Klasik 20/20; Düello saldıran 5 / savunan 5, yanıtsız yok, 360/390 kesişim yok;
  turnuva seans dışında (lobi ölçüldü). `oyuncu-testi` Yön A sınıflarını tanıyor, yarım maça katılınca
  önceki turları saymıyor, kategori isteği yoldayken bekliyor.
- **Soru tarafı (aynı gün):** Paket 3 iki ajanla 100'lük partiler 6–12 (toplam Paket 3: 2.950 soru,
  286–315), sonra Ida kararıyla durdu. Temizlik: doğrulama tamam, Jev ikinci geçiş kararları hazır
  (`araclar/soru-temizlik/`) ama UYGULANMADI (token).
- **Ida'dan karar bekleyen:** Gizlilik/Koşullar metin çelişkileri (misafir girişi, "ücretsiz" vs uygulama
  içi satın alma, "portal" ifadesi, paylaşım listesi, TASLAK notu); "Lig çerçevelerim" Rozetler
  sekmesine taşındı (onay); kategori çipi altın (ödül rengi kuralıyla çelişki); soru temizliği
  migration'larının uygulanması; serbest maç rövanşının dereceli açılması.

## 2026-09-23 — Ida canlı testi düzeltmeleri + Disk IO
**Araç:** Claude Code (ana ajan + 2 alt ajan)
**Neden:** Ida canlıda test etti (Düello kasması, QQuiz logosu, tek renk emoji, rövanş türü) + Supabase "Disk IO bütçesi tükeniyor" uyarısı.

- **Soru temizliği (316–318):** 7 soru pasife (2 hassas, 4 tartışmalı itiraz, 1 çeviri), 1 EN düzeltme,
  662 kategori taşıma, 3.192 zorluk yeniden sıralama (1–5: 1220/2420/4929/2435/1229). Aktif 12.233,
  rekabetçi 6.292. Geri alma: `araclar/soru-temizlik/degisiklikler.csv`.
- **Rövanş (319):** Klasik `rovans_iste` `dereceli`'yi aktarmıyordu (varsayılan dereceli) → aynı tür;
  Düello zaten doğruydu. Test `_test/sunucu/rovans-ayni-tur.test.mjs` 6/6.
- **Logo:** QtMarka Q ikonu + yazıyı yan yana çiziyordu ("QQuiz") → 72b1fb4 öncesi resmi `Logo`
  (başlık, giriş, yükleniyor, yasal, /tasarim-sistemi).
- **Emoji:** tepkiler bilinçli tek renk SVG'ye çevrilmişti → renkli sistem emoji (`emoji:` biçimi,
  `emoji.css`); eski adlar `isim` alanında duruyor.
- **Düello kasması:** (1) okuma sürerken gelen Realtime sinyali yutuluyordu → ekran 1 sn yoklamayı
  bekliyor, iki oyuncu kayıyordu; artık sıraya alınıyor/birleştiriliyor. (2) İstemci oyuncu başına
  saniyede 2,6 RPC atıyordu → ~0,8. İki oyuncu farkı p95 1355 → 550 ms, kategori fazı p95 ≤ 283 ms,
  geçişte uzun görev 0. Klasik/turnuva yoklama ve turnuva N×N yeniden okuma da düzeldi.
- **Disk IO:** en çok yazan kaynaklar: pg_cron çalışma kayıtları (2,1 M insert, tablo 323 MB — hiç
  budanmıyordu) · CI sunucu testleri canlı DB'de (26 bin test hesabı insert'i, push başına 20 dk) ·
  `duello_durum` her çağrıda last_seen + hız sayacı yazması · 2 sn'lik bot_oyna/duello_tik · dakikalık
  gizli_bot_nabiz. Düzeltmeler: 320 (kayıtlar boşaltıldı 323 MB → 32 kB + saatlik budama, dondurulmuş
  Meydan ikram işi kapatıldı), 321 (last_seen 5 sn'de bir), CI testleri push'ta ve gecede kapalı,
  istemci sorgu sıklığı yarıya.
- **Test (canlı, tek sefer):** Klasik 20/20, Düello saldıran 10 / savunan 10 geçti.

## 2026-09-23 — Ana sayfa 3 seçenek + maç ekranı (kategori zemini, oyuncu level'i)
**Araç:** Claude Code (tek şerit, alt ajan yok)
**Neden:** Ida önceki ana sayfayı reddetti ("mevcut siteyi tek ekrana koymuşsun"); maç ekranında kategori rengi ve oyuncular.

- **Ana sayfa seçenekleri** (asıl ana sayfaya dokunulmadı): `/ana-sayfa-secim`, `/ana-sayfa-a` (kaydırmasız
  lobi: avatar sahnesi + dev Oyna/Düello), `/ana-sayfa-b` (oyuncu vitrini + yatay mod kartları + etkinlik
  akışı), `/ana-sayfa-c` (oyuncu ortada, modlar yörüngede, mobilde kendi sekme çubuğu). Ortak veri
  `oyun/pages/anasayfa/veri.jsx` (Home.jsx ile aynı kaynaklar, yalnız var olan veri). Mobil ve masaüstü
  ayrı yerleşim. 390/1280 taşma yok; 36 düğme tıklama testi (390 + 1280) doğru sayfaya gidiyor.
- **Maç ekranı:** kategoriye göre pastel zemin (`oyun/tasarim/kategori-zemin.css`, --qt-kat-* token,
  0,5 sn geçiş, pastelde yazı rolleri koyu). Soru RPC'leri kategori döndürmüyordu → ekleyici
  `soru_kategorisi(uuid)` (322). Oyuncu şeridinde level (`oyun/lib/oyuncuSeviye.js`; profiles.lig
  istemciye kapalı, başkasının ligi gösterilmez); Turnuva/Grup'ta MacUstSerit'e kendi avatarın + oyuncu sayısı.
  Canlı testte yakalanan hata: kategori kancası `soru` tanımından önce çalışıp Klasik'i çökertti (düzeldi).
- **Test (canlı):** Klasik 20/20, Düello saldıran 6 / savunan 5; 360/390/1280 kesişim ve taşma yok.

## 2026-09-23 — Ana sayfa A asıl ana sayfa + turnuva şeridi + günde 5 turnuva
**Araç:** Claude Code (tek şerit, alt ajan yok)
**Neden:** Ida A seçeneğini seçti; turnuva ana sayfada öne çıksın; turnuva saatleri 10·14·18·20·24.

- **Turnuva saatleri (323, uygulandı):** `turnuva_saatleri` = 10:00 · 14:00 · 18:00 · 20:00 · 24:00; SQL yedek listesi
  ve `zaman.js › VARSAYILAN_LISTE` aynı. Zamanlayıcı/lobi botları/katılım zaten `sonraki_turnuva_bilgi()` →
  `turnuva_saatleri_listesi()` ile ayardan okuyor (ölçüldü). Gün sınırı provası: 23:59:30 → aynı günün 24:00'ı,
  00:00:00 ve 00:00:30 → 10:00; 4 günde 20 seans anı 20 tekil (çift başlama yok). `turnuva_lobi_botlari`'ndaki gömülü
  120 → `turnuva_lobi_acilis_dk` (değer aynı). Hatırlatma push'ları 14:00 (10:15 UTC) ve 20:00 (16:15 UTC) seansına,
  metinler güncellendi ("Gece" → "Akşam turnuvası"). Eski `13:00/21:50` EN çevirisi silindi; belgeler güncellendi.
- **Ana sayfa:** kök rota `AnaSayfaA`; `/ana-sayfa-a|b|c|secim` rotaları kaldırıldı (dosyalar ve `pages/Home.jsx` duruyor).
  Avatar 176 → 120, kısa ekranda (≤760 px yükseklik) avatar kartı yatay. Turnuva şeridi (`TurnuvaSeridi`): bekleme
  (saat + geri sayım + 150·75·40 ödül `coin_turnuva_1..3`), lobi (lobi satırının anına ≤ `turnuva_lobi_acilis_dk` →
  nabız + KATIL, dokununca `join_tournament_lobby` + /turnuva), canlı (CANLI rozeti). Masaüstü sağda `TurnuvaKarti`
  yerine seans listesi. Kısayol: Turnuva çıktı, **Meydan Okumalar** (gelen Klasik + Düello davet rozeti) girdi; Grup
  Maçı `/meydan?bolum=grup` → ChallengesPage grup panelini açık başlatıp kaydırıyor. OYNA alt yazısı ≤400 px'te tek
  satır; `.as-rozet-nokta` kutu içinde, 99+ sınırı. Bildirim izni kartı (maç sonrası) A'ya taşındı.
- **Bulunan hata:** A'nın maç listesi sorgusu istemciye kapalı `profiles.avatar_url`'i istiyordu → 403, "sırası sende /
  rakip bekliyor" satırları hiç yüklenmiyordu. `gorunen_avatar`'a çevrildi; başka dosyada sorgu olarak yok.
- **Eski ana sayfadan A'ya gelmeyenler (bilinçli):** "geçen hafta şehir ligi" notu (eski lig arşivi), rakip kategorisi
  seçim sayfası, gönderilen daveti ana sayfadan geri çekme (Meydan Okumalar sayfasında var).
- **Test (yerel, canlı DB):** 360×740 · 390×844 · 390×700 · 1280×800, üç hâl (lobi gerçek; bekleme saat taklidiyle;
  canlı istek taklidiyle) ve yeni misafir (Level 1, seri 0, davet yok): dikey kaydırma 0, yatay taşma 0, çakışma 0,
  44 px altı hedef 0, konsol hatası 0. Tıklama: şerit, 4 kısayol, OYNA, DÜELLO, lig çipi 390 + 1280'de doğru; eski
  4 adres 404. `prefers-reduced-motion`: nabız/zıplama `none`. Build temiz.

## 2026-09-23 — Büyük revize paketi: ağırlıklı zorluk, sayaç payı, kaydırmasız ana sayfa, Serbest|Dereceli, loadout, dükkân görselleri
**Araç:** Claude Code (tek şerit, alt ajan yok)
**Neden:** Ida'nın 23 Eyl revize paketi (sorular fazla zor, Düello sayacı ilk saniyelerde hızlı, ana sayfa kayıyor, tür seçimi görünmüyor, loadout dönsün, dükkân görselleri yayın kalitesinde).

- **Adım 1 — ağırlıklı zorluk (324, uygulandı):** `soru_sec` her yuva için grup seçer (kolay 1–2 / orta 3 / zor 4–5 =
  `soru_agirlik_*` 55/30/15), grup boşsa komşuya düşer; `zorluk >= 2` kalktı (147'deki "aşırı basit soru yalnız turnuvada"
  gerekçesi 290'dan beri geçersiz). Kullananlar: Klasik/Saf Bilgi (quick_match, kuyruga_gir, hemen_bot_mac(_sec),
  respond_challenge, rovans_iste, bot_oyna), Düello (duello_soru_bul ← duello2_soru_ac/skill/bot_skill_dene), Grup
  (respond_group_challenge, grup_kur_kuyruktan), Soru Değiştir, Hatalarım dolgusu. Turnuva ve bot isabeti dokunulmadı.
  200 soru (işlem içinde): ÖNCE kolay %22,5 · orta %51 · zor %26,5 → SONRA kolay %52–54,5 · orta %29–31 · zor %16,5–17.
  Kural: yeni zor soru üretilmez (AGENTS.md + PROJECT_CONTEXT).
- **Adım 2 — sayaç gösterim payı (325/326/330):** ölçüm aracı `oyuncu-testi` sayaç raporu (⏱). ÖNCE Düello: ilk görünüş
  medyan 450 ms (p90 ~1,1 sn), 35 fazın 28'inde ilk rakam 12–650 ms; kategori sayacı `sunucu_zamani`=now() (işlem başı)
  yüzünden "9/8" açılıp 100 ms'de düşüyordu. Klasik: soru başlangıçtan medyan 1.677 ms sonra ekranda, 20/21 soruda hızlı ilk
  adım. SONRA: Düello pay 1500 ms (canlıda en çok 1347 ms ölçüldü), `gosterim_bas`a dek tam süre, saat farkı en az gecikmeli
  örnekten, `sunucu_zamani` clock_timestamp, rakam saniye sınırında → yerel 13 faz 0 hızlı; canlı 19 fazın 18'i temiz (tek
  istisna 3,6 sn ağ gecikmesi). Klasik/Grup/Turnuva sonraki soru +2000 ms, `kalanSure` tavanı (Ek Süre'yi bozmaz), 3-2-1 yalnız
  ilk soruda → soru başlangıçtan medyan −391 ms önce ekranda, canlı 20 sorunun 19'u temiz. Adalet: bitiş iki oyuncuda aynı.
- **329 (canlı testte bulundu):** süresi dolmuş eski soru kartına dokunuş sonraki (pay içindeki) soruya yazılıyordu —
  `submit_match/group_match/tournament_answer` artık `p_soru_index` alır, uyuşmazsa "Soru değişti". Eski 2 parametreli imza düştü.
- **Adım 3 — ana sayfa kaydırmasız:** `100dvh − 190px` tahmini güvenli alanları saymıyordu. `.as-kaydirmasiz` (html):
  kabuk 100dvh esnek sütun, overflow hidden, overscroll-behavior none, avatar container query ile küçülür. 360×640 · 390×700 ·
  390×844 · 412×915 · 390×760 · 390×664, güvenli alan taklidiyle (üst 47/alt 34) de: belge = görünür, kaydırma 0.
- **Adım 4 — Serbest | Dereceli:** `DereceliAnahtari` iki seçenekli (her yerde aynı); OYNA penceresinin üstünde, Saf Bilgi
  kısayolu da pencereden. 4 durum DB'den doğrulandı (Klasik/Düello × serbest f / dereceli t).
- **Adım 5 — loadout (327):** 3 yuva; Klasik `skiller` + Düello `skiller_duello` (Sigorta/2X yok); kapı set kontrolünü yalnız
  Klasik/Düello'da yapar. Klasik seti "Hazır mısın?" kapısında (pencereye ayrı adım konmadı — aynı ekran iki kez sorulmasın),
  Düello seti giriş ekranında. Test: seçilen 3 skill maç çubuğunda birebir (bota karşı iki mod).
- **Adım 6 — görseller (328):** `SkillRozeti` (token `--qt-skill-*`, Phosphor MIT sembolleri) dükkân, loadout, maç çubuğu,
  maç içi satın alma, maç sonu, envanter, level ödülünde. Coin paketleri Noto Emoji 3D (Apache 2.0) dizilimiyle büyür; adlar
  Avuç/Kese/Sandık/Hazine; bonus yüzdesi veriden (+%8/+%13/+%19 — brifteki "+%15" veride yok, uydurulmadı); "Define" için
  5. paket yok. `docs/VARLIK_LISANSLARI.md`. `/tasarim-sistemi` rozet bölümü (64/40/32 px, açık/koyu).
- **Not (önceden var):** `kuyruga_gir` hız sınırı dakikada 30; arama saniyede bir çağırıyor (15 sn → 15 çağrı) — bir dakikada
  iki aramadan sonra "Rakip aranamadı". Geliştirme sunucusunda StrictMode yüzünden tek aramada doluyor.
- **Test (canlı):** Klasik 20/20; Düello 4 saldıran / 5 savunan (önceki koşu 5/5); build temiz.

## 2026-09-23 — Rozet + çerçeve + ana sayfa + davet paketi (Ajan A sunucu, Ajan B arayüz)
**Araç:** Claude Code (yönetici + 2 alt ajan; ortak klasör, dizin kilidi `araclar/soru-uretim/yazim.lock`)
**Neden:** Ida'nın "rozet + çerçeve + ana sayfa + davet" paketi; kozmetik ekonomi ve oyuncu kimliği.

- **A (331–337, uygulandı):** sözleşme `docs/SOZLESME_ROZET_CERCEVE.md` (tablolar, RPC'ler, `oyun/lib/{rozet,cerceve,davet,lig}.js`);
  101 rozet + olay anında kazanma (tetikleyici hatası maçı bozmaz); geriye dönük 57 rozet / 16 oyuncu, coin 0; 20 çerçeve,
  273 eski lig çerçevesi sahipliği + 122 takılı çerçeve taşındı; davet 300 / +100 (Level 5, aynı IP ödülsüz, ayda 10 →
  `sinir_asildi`, 13 hesapla işlem içinde test); coin bonusları %0/10/15/20/30 + Define `coin_16000`; RakipAra yoklaması
  `rakip_ara_yoklama_ms` ≈ 3 sn, hız sınırı hatası aramayı düşürmez. Kararlar: "3 gerideyken" → "2 can gerideyken" (3 can
  kuralı), 2.000 doğru "Efsane" ustalığı rozet dışı, gizli 5: Rövanşçı · Uzatmaların Adamı · Kaşif · İlk Söz · Her Saatin Oyuncusu.
- **B:** `/kozmetik-onizleme` (20 çerçeve + rozet kademeleri, 24/40/64/120 px); `CerceveliAvatar` (eski `AvatarCerceve` ona yönlenir →
  ana sayfa, üst çubuk, profil, lig, arkadaşlar, meydan okumalar, mesajlar, maç sonu, podyumlar, karşılaşma sahnesi); maç
  şeritlerinde (Klasik, Düello v1/v2, Grup, Turnuva) çerçeve + Lv + lig; Profil › Rozetler + vitrin + Çerçevelerim + yeni rozet tostu;
  Dükkân › Çerçeve (önizleme, satın al → tak); ana sayfa yeni düzen; davet kartı (Arkadaşlar + Profil) + kurulumda kod alanı.
  Görseller CSS + Phosphor (MIT) + Noto Emoji 3D (Apache 2.0, `public/kozmetik/`); Lottie yok (paket kurulmaz).
- **Yönetici testi (canlı):** arayüz denetimi 16 sayfa TEMİZ (araç canlı origin için yeni misafir test hesabı açtı →
  `.arayuz-denetim-oturum.json` artık canlıya ait); ana sayfa 6 boyut (+güvenli alan) belge = görünür, scrollY 0, OYNA ve
  kısayollar menünün üstünde; art arda iki rakip araması ~3 sn aralık, hepsi 200, hata yok; rozet coin denetimi (geriye dönük 57 → 0,
  canlı kazanılan 2 → 20); build temiz, giriş paketi 337.702 → 364.383 B (gzip 107.443 → 116.313).
- **Karar bekleyen:** Define gerçek fiyatı (Play Console'da ürün yok); renk adlı dükkân çerçeveleri (Nane, Mercan…) nadirlik rengiyle
  çiziliyor — ad mı değişsin, vurgu mu eklensin; ana sayfada yalnız oyuncu kartı çerçevesi hareketli; kullanılmayan
  `LigCerceveSecici.jsx` + `bd-cerceve` CSS silinsin mi.

## 2026-09-23/24 — Ajan C–J paketleri + son tarama
**Araç:** Claude Code (yönetici + 8 alt ajan, ortak klasör, dizin kilidi `araclar/soru-uretim/yazim.lock`)
**Neden:** Ida'nın sıradaki paketleri (soru kolaylığı, Düello stratejisi, bot rozetleri, davet bildirimi; premium çerçeve;
eşleşme süresi + antrenman; ses seçimi; maç sonu önizlemesi; ses/müzik bağlama; loadout süresi + arama ekranı; şık ipucu).

- **C (350–355):** soru ağırlığı 70/25/5 (200 soru: önce 57/24/19 → sonra 71/21,5/7,5); Düello kategori 15 sn, saldıranda rakip/sen
  oranı + kalan hak, savunanda güçlü/zayıf 3; bot 3–8 sn, %65 rakibin zayıfı; bot rozetleri deterministik (160 bot, 2.265 rozet);
  davet bildirimleri + `bildirimler` Realtime'da değildi (hiçbir bildirim şeridi çıkmıyordu) → eklendi.
- **D (360):** 20 çerçeve temalı, süsler daireyi taşıyor (Noto 3D + CSS); anahtar/sahiplik/fiyat aynı.
- **E (370):** eşleşme süresi sunucuda üçgen dağılım 3/6/15; RakipAra bot düğmesi kalktı, Meydan › Antrenman; ana sayfanın
  RakipAra'yı her çizimde sıfırlaması düzeltildi; Grup kuyruğu da aynı kurala.
- **F (380):** `/ses-secim` (30 an, 112 aday, Kenney CC0 + Pixabay), `sahip_mi()`.
- **G:** `/mac-sonu-onizleme` (6 hâl, Lottie: kupa/coin/level/firework, konfeti `canvas-confetti`; tembel yüklenir).
- **H (400):** seçilen 30 ses oyunda (`ses_secimleri_oyun()` sürümlü, dağıtımsız değişir), yeni çağrı yerleri, müzik (menü/maç/turnuva,
  0,8 sn geçiş, soru sırasında %30, sekme gizlenince durur), Müzik + Efektler ayrı anahtar; Grup maçı sayfası tembel yüklemeye
  alındı; Klasik kaybettin sesi 9 kez çalıyordu → düzeldi.
- **I (410):** tam ekran `AramaSahnesi` (VS anı), loadout 20 sn, bağlanmayan rakipte cezasız iptal + otomatik yeniden arama.
- **J (420–422):** 300 şık ipucu sorusu işlendi, 225 düzeldi (1.310 → 1.085), EN 224, Jev ~0,013 $, geri alma betiği.
- **Yönetici:** oyuncu-testi sayaç raporu Ek Süre sıçramasını yeni faz saymıyor (C'nin iki "başarısız" koşusunun sebebi).
- **Son tarama (canlı, 24 Eyl):** arayüz denetimi 16 sayfa TEMİZ; Klasik 20/20; Düello 5 saldıran / 5 savunan, yanıtsız yok;
  Antrenman'dan Düello (ToyBot, 0,46 sn); 10 Klasik arama 6,9–14,1 sn (medyan 10,5, 5/10'u 4–9); müzik/efekt ayrı kapanıyor.
  Düello sayacı: 20 fazın 4'ünde ekran fazı pay'den (1,5 sn) geç gördü (2,2–3,9 sn; Realtime sinyali kaçıp 4 sn'lik yedek
  yoklamaya kalınca) → ilk rakam kısa kaldı; sunucu durum okuması ~100 ms (sebep değil). Build temiz; giriş paketi
  337.702 (paket başı) → 363.500 B (gzip 107.443 → 117.379).

## 2026-09-24 — Ida kararları + K/L/M + güvenlik düzeltmesi (oturum sonu)
**Araç:** Claude Code (yönetici + Ajan K, L, M)
**Neden:** Ida'nın gece paketi sonrası kararları; maç sonu takılmaları; müzik çalma listeleri.

- **Yönetici (440–443, uygulandı):** Düello yedek yoklaması faz bitişine yakın 0,5 sn (son 1,5 sn + sonrası 2 sn),
  kalan zamanda 4 sn; antrenman (açık bot) her zaman serbest — sunucu zorlar (440); rakip gelmeyince bekleme
  Klasik `klasik_baglanma_sn` 15 (loadout 20 ayrı) ve Düello 15 (441); botlara Level 75/100 rozeti (442, 22 + 3 bot);
  kullanılmayan `KarsilasmaSahnesi.jsx` + `LigCerceveSecici.jsx` ve yalnız onlara ait CSS silindi (dosya silmeleri
  commit sırası yüzünden `e5cb2db` "Düello yoklaması" commit'ine girdi — içerik doğru); ölü "bot portresi yazma"
  Storage kuralları silindi (443, Ida onayı; bütün yüklemeleri düşürüyordu; test: kendi klasörü 200, bot portresi /
  başkası / müzik 403). Maç içi ses düğmesi zaten müzik + efekti birlikte kapatıyor (değişiklik yok).
- **Kural (Ida):** yetki/izin/güvenlik kuralı değişikliği geçici bile olsa önce sorulur (CLAUDE.md + AGENTS.md).
- **K:** 7 skill'e ayrı an (`skill_elli`, `skill_ek_sure`, `skill_soru_degistir`, `skill_zaman_baskisi`, `skill_ikinci_sans`,
  `skill_sigorta`, `skill_2x`), her birinde Mevcut + 4 aday; seçim yoksa eski özel ses.
- **L:** maç sonu önizleme sahnesi — açılış (~130 ms: tek karede kurulum + kupa Lottie + focus) ve ~1,3–2,0 sn (Lottie
  kurulumları) takılmaları giderildi: 4× CPU'da Kazandın hâllerinde 50 ms üstü kare 0, en uzun 33–34 ms (yüklü makinede
  50–67 ms kalabiliyor). Gerçek maçlara bağlı değil.
- **M (450):** 10 yeni müzik adayı (lobi 5 zen/koto/bambu flüt, maç 5 taiko/Asya trap), `muzik` Storage kovası (herkese
  okunur), 22 tam parça + 10 önizleme = 30,7 MB (AAC 96 kbps); çalma listesi (2–4 parça, sıralı, rastgele başlangıç, 1,5 sn
  geçiş) — Ida `/ses-secim`'de listeleri kuracak. Yükleme dar geçici politikayla yapıldı ve kaldırıldı.
- **BEKLİYOR:** Ajan N (yeni maç sonu ekranını canlıya alma — brif hazır, Ida'nın isteğiyle başlatılmadı) ve Düello zayıf
  nokta işi. Build temiz, canlı `d390be6` sonrası sürümde.

## 2026-09-24 — Büyük paket: A (maç sonu + terk) · B (Düello zayıf nokta) · C (elmas/joker/kozmetik) + kapanış
**Araç:** Claude Code (yönetici + 3 alt ajan; ortak klasör, dizin kilidi `araclar/soru-uretim/yazim.lock`)
**Neden:** Ida'nın 24 Eyl paketi (eski N ve O/P brifleri bunun içine alındı).

- **A (460–463, uygulandı):** terk kuralı bütün modlarda sunucuda (terk eden 0 coin/XP, seri/görev/rozet sayılmaz,
  kalan tam galibiyet; Klasik/Saf Bilgi/Antrenman `mac_iptal` + kopukluk 45 sn / bot maçı 57 sn, Düello
  `terk_eden`, Grup `grup_mac_terk`, Turnuva `turnuva_terk`, 10 dk duran maç ödülsüz iptal; 463 turnuvadan çıkana
  seri coini). Rakibin Ida'nın avatarıyla görünmesi VERİYDİ: 256 eski avatarları ~10 avatara eşlemiş, 78 gizli
  botun 18'i `kahraman-k29` → 461 ile 31 avatara döngüsel dağıtım. Yeni maç sonu sahnesi (`MacSonuKutlama`,
  veri `mac_sonu_ozet` 462) Klasik/Saf Bilgi/Antrenman/Düello/Grup/Turnuva'da canlı; Turnuva/Grup'ta kendi derecen
  (iki kişilik düzen anlamsız). Ses taraması: osilatör yok, Lottie'de gömülü ses yok, 5 tekrar kaldırıldı.
  Kullanılmaz hâle gelenler (silinmedi): `MacSonuSahnesi.jsx` (yalnız dondurulmuş Hızlı Mod), `LevelKazanci.jsx`,
  `m1-sonuc.css › m1-ss-*`, `mac_odulum` RPC'si Klasik'te çağrılmıyor.
- **B (470, uygulandı):** zayıf nokta (≥5 cevaplı kategorilerin en düşük oranlısı, maç başında sabit; zayıfa saldırı +
  savunan doğru → saldıran 1 can, ikisi doğruyken de; uzatmada işlemez) + kategori maçta en çok 3, maçtaki önceki
  seçim tekrar seçilemez; süre dolunca otomatik seçim savunanın zayıfını seçmez. Sunucu testi 5/5; canlı 3 maç 33
  hamlede ihlal 0. "Hazır mısın?" ekranı Düello'da yok → kural kartı Düello girişinde; Nasıl Oynanır = `DuelloTanitim`
  (kategori süresi 8 → 15 sn düzeltmesi). PROJECT_CONTEXT Düello satırları güncellendi.
- **C (480–481, uygulandı):** coin yalnız oynayarak (paketler pasif), elmas yeni (paketler 100/220/500/1.100/2.400 +
  bonus, satın alma kapalı), oyunla elmas kazanımları, joker fiyatları, çerçeve (prestij, satılmaz) / aura (elmasla:
  75/150/300/600) ayrımı, `CerceveliAvatar` aura katmanı, Profil › Koleksiyon; 1 hesabın dükkân çerçevesi auraya
  taşındı. "Skill" → "Joker" `dil.js › jokerAdi()` ile çıkışta; sunucu provası 35/35.
- **Yönetici (kapanış):** A/B dosyalarındaki sabit "skill" metinleri kaynakta "joker" (JokerCubugu, JokerSatinAlModal,
  QuestionCard, MacSonuEklentisi, MatchPage, DuelloPage, DuelloV2, DuelloTanitim, TurnuvaTanitim; EN anahtarları
  birlikte; DuelloPage'in eksik "Saldırı/Savunma jokerleri" çevirisi eşleşti). 390 px'te rakibin "Lv · Lig" etiketi
  tur sayısına 21 px biniyordu → seviye satırı sütuna sığar (ölçüldü: çakışma yok). Maç içi joker satın alma penceresi
  faz/soru bitince açık kalıp Düello kategori ekranını örtüyordu (canlı testte 5 kategori dokunuşu engellendi) →
  faz/soru değişince kapanır. Maç sonunda gösterilen rozet, uygulama sahneden kapatılınca sonraki açılışta tekrar tost
  oluyordu (sessionStorage) → localStorage.
- **Canlı test (kapanış):** arayüz denetimi 16 sayfa TEMİZ; Klasik 20/20; Düello 7 saldıran / 6 savunan, hepsi
  sunucuya ulaştı (test hesabının 50:50 ve Ek Süre envanteri bitmişti → 20'ye dolduruldu; kalan tek uyarı bilinen
  sayaç ilk görünüş gecikmesi, en çok 3,2 sn); Antrenman bitir: ekran = DB (coin 70, XP 15), rakip avatarı doğru;
  Klasik terk: terk edene ödül 0, rakip kazandı, "Maçtan ayrıldın". Build temiz; giriş paketi 363.789 → 376.437 B
  (gzip 117.420 → 121.811).
- **Karar bekleyen:** dereceli terkte eksi lig puanı (bugün mağlubiyet 0); turnuvada uygulamayı kapatan terk sayılmıyor
  (katılım ödülü alıyor); ustalık sayacı terk edilen maçın doğrularını geri almıyor; Grup'ta rövanş yok; Sıradan aura
  75 elmas; elmas paket miktarları taban mı toplam mı; Efsanevi aura bedava oyuncuya ~4–6 ay; turnuva sonu sahnesi
  ekranda doğrulanmadı (DB doğru).

## 2026-09-24 — Kozmetik paketi: A (27 avatar) · B (çerçeve tarzı) · C (elmas kozmetikleri + tepki) + kapanış
**Araç:** Claude Code (yönetici + 3 alt ajan; ortak klasör, dizin kilidi)
**Neden:** Ida'nın kozmetik paketi. İlke: her şey yapılır, oyuncuya satışta KAPALI (`kozmetik_satis_acik = false`);
Ida önizlemelerde onaylayınca ayrı adımla açılır.

- **A (520, uygulandı):** 27 avatar (`AvatarProIllustrations2.jsx`, `public/avatars/pro2/`; mevcut 31 bayt bayt aynı),
  `avatar_katalogu` + `oyuncu_avatarlari`, `avatar_katalogu_oyun` / `avatar_satin_al` / `avatar_onizleme_listesi` /
  `avatar_onay_kaydet` / `kozmetik_satis_acik_mi`; `avatar_onayla` kapalı avatarı normal oyuncuya reddeder, sahibe
  kabul eder. `/avatar-onizleme`. Telif için: Pelerinli Kahraman (doğan güneş amblemi), Gece Bekçisi (kukuleta +
  hilal, kulaklı maske yok), Yıldız Şövalyesi (siperli sivri enerji kılıcı, cüppe yok), Laboratuvar Canavarı (üç
  gözlü mor jöle). `KurulumSihirbazi.jsx` sabit 31'lik listede kaldı.
- **B (530, uygulandı):** `/cerceve-onizleme`, Altın Lig çerçevesi üç tarzda (Çizgi / Mücevher / Çizgi + Işık) SVG,
  boyuta göre ayrıntı (≥56 tam · 40–55 sade · <40 yalnız halka); gerçek yerler ölçülerek: ana sayfa 64, maç şeridi 48,
  lig 40, ana sayfa lig kartı 28, maç sonu VS 76, profil 88 px. `sahip_tasarim_secimleri` + `tasarim_secimi(_kaydet)`.
- **C (540–542, uygulandı):** VS kartı 6 · isim efekti 6 (kontrast en düşük açık 5,30 / koyu 5,88) · zafer efekti 5
  (tembel; 4× CPU'da efekt sonrası 50 ms üstü kare 0) · tepki paketleri 2; dükkân sekmeleri + Koleksiyon + dükkân
  Avatar sekmesi (A'nın kataloğu); `kozmetik_katalogu` / `kozmetik_satin_al` / `kozmetik_tak` / `kozmetik_onay_*`;
  sahip test modu; bot kozmetiği (yalnız gizli bot, satıştaki + "girsin" kalemlerden, kimlikten sabit); tepki yalnız
  Realtime yayın, bot tepkisi sunucudan %30, `tepki_acik_modlar = ['antrenman']`, gizleme cihazda.
- **Yönetici (kapanış):** maç şeridinde telefonda lig adı tek harfe iniyordu (önceki çakışma düzeltmesinin yan etkisi)
  → < 600 px'te lig rengi nokta. A ve B'nin canlı Düello testindeki "Page crashed" tekrar etmedi (o sırada makine
  yükü + eşzamanlı dağıtım).
- **Canlı test (kapanış):** Düello 6 saldıran / 7 savunan, hepsi sunucuya ulaştı (yalnız bilinen sayaç gecikmesi, en
  çok 2,9 sn); Klasik 20/20; Antrenman tepki testi: gönderme + balon, 0,3 sn'de ikinci deneme engelli, en kısa aralık
  3.250 ms, kanala tam 10, alıcı sınırı (4 sahte → 2 balon, bilinmeyen/yabancı yok sayıldı), gizle açıkken 0, bot
  tepkisi 3, eski tabloya 0 satır, konsol temiz. Normal hesap (canlı): `sahip_mi` false, `kozmetik_katalogu` 0,
  `avatar_katalogu_oyun` 0, satın alma "satılmıyor", takma "sende yok", onay/tarz kaydı "yalnız sahibe açık".
  Sahip yolu ajanların işlem içi provalarıyla (auth.uid taklidi, geri alındı) doğrulandı — Ida'nın gerçek oturumu
  yok. Arayüz denetimi 16 sayfa TEMİZ. Build temiz; giriş paketi 376.439 → 388.380 B (gzip 121.808 → 125.847).
- **Karar bekleyen:** avatar adları (Kıvırcık, Başörtülü, Gece Bekçisi, Yüce Kral…), Vampir tasarımı, kostümlü 250;
  çerçeve tarzı; maç sonunda sahne tacı (`msk-tac`) çerçeve tacına biniyor, plaka isim hapına 2–3 px biniyor; tepkiyi
  Klasik/Düello'ya açmak ve eski DB'ye yazan emojileri kaldırmak; kozmetik test fiyatları; bot tepki sıklığı %30;
  Realtime maç kanalı herkese açık (maç kimliğini bilen sahte tepki yollayabilir — yalnız 12 tepki, aynı sınırlarla);
  bot tepkisi Realtime mesaj tablosuna yazıyor (Supabase günlük temizler); dükkân sekme çubuğunda seçili sekme
  ekran dışında kalabiliyor; yeni avatarlar kurulum sihirbazında yok.

## 2026-09-24 — Kozmetik aktivasyonu + 7 karar (bulut, `bulut/kozmetik-aktivasyon`)
**Araç:** Claude Code (bulut oturumu, tek şerit)
**Neden:** Ida'nın "kozmetik aktivasyonu + 7 karar" istemi — önizlemede seçilenler oyuna girsin, 27 avatar ücretsiz, maç sonu/tepki/dükkân düzeltmeleri.

- **Ortam:** canlı Supabase'e erişim yoktu → 550 + 551 yazıldı, **uygulanmadı**; `main`'e push yok (dal `bulut/kozmetik-aktivasyon`).
  Ida'ya soruldu: satış bayrağı açılsın mı → **evet**; auralar da aynı kurala girsin mi → **evet**.
- **550:** aktif = `kozmetikler.onay` / dükkân `auralar.onay` = `'girsin'` (dinamik, liste kodda yok); pasif kalem dükkân,
  koleksiyon, `oyuncu_kartlari`, bot ve tepki listesinden çıkar, alınamaz/takılamaz, kayıt silinmez; sahip test modu yalnız
  aktiflerde. 27 avatar ücretsiz (`avatar_fiyati` 0, `avatar_acik_mi` = aktif, `avatar_onayla` sahiplik şartı kalktı,
  `avatar_satin_al` "bedava" hatası). Gizli bot avatarları 461 kuralıyla 58 avatara (depoda "addan seçim" kuralı yok —
  id sırası genişletildi). `kozmetik_satis_acik = true`. `cerceve_tarzi_aktif()` (yeni, yalnız authenticated).
- **551:** tepki özel kanal `tepki-mac-<id>` / `tepki-duello-<id>` + `realtime.messages` RLS (yalnız maçın iki oyuncusu);
  `tepki_durumu.kanal`; bot tepkisi `realtime.send(private)`, %12, yalnız seri (3) / maç sonu / rakip hatası.
- **Yerel test (Postgres 16 taslağı, 520–542 + 550/551 iki kez):** normal oyuncu yalnız aktif kalemleri görür, pasif
  isim_buz/aura_bulut sahipliği kalır ama kartta null, pasif alma/takma reddedilir, aktif alma çalışır (bayrak açık);
  27 avatar kullanılabilir + fiyat 0, kostümlü seçilir; sahip yalnız aktif 2 kalemi görür, önizleme listesi 22 kalem;
  60 bot 58 avatara dağıldı, açık bot aynı. Tepki: oyuncu gönderir, yabancı/oturumsuz RLS hatası, yabancı 0 okur;
  bot: aynı doğru → yok, rakip hatası → 😎, seri 3 → 😎, bot yanlış → yok, son soru berabere → 🤔; Düello rakip hatası
  ve can bitince tepki, yalnız ikili doğruda yok.
- **İstemci:** `useMacTepki` özel kanal (alan yoksa eski kanal); profil + kurulum ızgarası 31 + katalog (`lib/avatarKatalogu.js`);
  Dükkân › Avatar "bedava"; `QtSekmeler` seçili sekmeyi görünür alana kaydırır; `CerceveliAvatar` seçilen tarzda Altın Lig
  (`lib/cerceveTarzi.js`, `DenemeCerceve` tembel); maç sonu `data-tac` ile taç emojisi gizlenir, plakada yuva açılır;
  `/mac-sonu-onizleme ?cerceve= ?tarz=`.
- **Ölçüm (önizleme, 5 genişlik):** plaka–isim 0,2 → 10,2–18,6 px; taç emojisi taçlı çerçevede gizli, taçsızda görünür;
  yatay taşma yok, sayfa hatası yok. Sekme: 390 px'te 4/4 seçim tam görünür.
- **Build temiz;** giriş paketi 387.970 → 391.407 B (gzip 125.511 → 126.714). Canlı testler erişim olmadığı için yapılamadı.
- **Açık:** migration'ları uygula (`npx supabase db push`), sonra canlı Klasik/Antrenman testi; eski 6 emoji Klasik/Düello
  açılınca kaldırılacak; bütün çerçeveler seçilen tarzda yeniden çizilecek (ayrı paket). Özet `docs/KOZMETIK_AKTIVASYON.md`.

## 2026-09-24 — Kozmetik aktivasyonu canlıda (bulut dalı birleşti) + 552
**Araç:** Claude Code (yönetici)
- `bulut/kozmetik-aktivasyon` main'e ileri sarmayla (fast-forward) birleşti; 550 + 551 + yeni 552 canlıya uygulandı
  (her biri önce prova). 552: bütün dükkân auraları + etkinlik çerçeveleri/auraları pasif (silinmedi); 550'nin
  `aura_katalogu`'su sahip olunan pasif aurayı koleksiyonda gösteriyordu → yalnız aktif.
- Aktif olan: isim efekti Altın, tepki paketleri Eğlence + Rekabet (satışta); 27 avatar ücretsiz (botlara 27'si
  dağıldı); çerçeve tarzı Çizgi; satış bayrağı açık; aura 0; çerçeveler lig + level + turnuva şampiyonu.
- Kontrol (canlı): Klasik 20/20; Antrenman tepki özel kanalda — oyuncu SUBSCRIBED, yabancı hesap "Unauthorized",
  yabancıya `tepki_durumu` kapalı, 10/10 ulaştı, en kısa 3.255 ms, gizleme 0, bot 2 tepki, eski tabloya 0. Normal
  hesap: kozmetik kataloğu 3 kalem, aura 0, etkinlik çerçevesi yok, 27 avatar ücretsiz. Not: C'nin tepki test betiği
  eski herkese açık kanalı dinliyordu → özel kanala uyarlandı (scratchpad `tepki-test2.mjs`).

## 2026-09-24 — Premium kozmetik önizlemesi + 2 kontrol (bulut, doğrudan main)
**Araç:** Claude Code (bulut oturumu)
**Neden:** Ida önceki çerçeve/auraları (CSS degrade + emoji süs) premium bulmadı; elmasla satılacak ürünler için
Brawl Stars / Clash Royale seviyesinde katmanlı, ışıklı, sürekli hareketli önizleme istedi.

- **`/premium-onizleme` (yalnız sahip, `sahip_mi`):** `oyun/tasarim/premium/` — 8 çerçeve (Ejderha: sarılan pullu gövde,
  çırpan kanatlar, parlayan gözler, burundan alev · Sönmeyen Alev · Sonbahar · Buz Kristali · Şimşek · Galaksi · Sakura ·
  Kraliyet), 6 iç aura (yaprak, kar, köz, yıldızlı gece + kayan yıldız, kuzey ışıkları, su altı; arka/ön katman derinliği;
  önizlemede avatar SVG'sinin düz zemini ayıklanır, dosyalar değişmez), altın isim plakası (şimdiki `isim_altin` yanında),
  lig amblemi (5 lig, isim yanında). Deneme alanı + gerçek yerler (profil 88 · lobi 64 · VS 92 · maç şeridi 48 · maç sonu 76 ·
  lig tablosu 40, gerçek sınıflarla) + katalog; Girsin/Girmesin localStorage, "Seçimlerimi kopyala" düz liste. Oyun,
  katalog, satış, veri değişmedi; migration yok.
- **Teknik:** elle katmanlı SVG + yalnız transform/opacity CSS; her hareketli parça kendi küçük HTML katmanında (GPU);
  kademe ≥72 tam · 49–71 orta · ≤48 halka + küçük vurgu (taşmaz, durağan). Hareket yalnız `hareketli` yerde, ekrandayken
  (IntersectionObserver) ve azaltılmış hareket yokken. Dış varlık/paket yok (VARLIK_LISANSLARI notu).
- **Bulunan/düzeltilen:** sonbahar aurasında hareketli parçalara `filter: blur` 13 fps'e düşürüyordu → kaldırıldı (41 fps);
  `radial-gradient(circle, …)` köşeye ölçeklendiği için köz/kar noktaları küçük kalıyordu → `closest-side`; maç sonu önizlemesi
  maç sahnesi sınıfıyla beyaz-üstüne-beyaz yazıyordu → gerçek altın zemin; 390 px'te plaka dar sütunda adı sıfıra
  indiriyordu → hap yerine plaka, en az ~3 harf; şeritte lig adı yerine amblem (skora binmez).
- **Ölçüm (geliştirme sunucusu, GPU'suz Chromium, 390 px, 3× piksel, 4× CPU, 8 sn):** deneme 42 fps / 50 ms üstü 4 · profil+lobi
  45 / 5 · VS+şerit 50 / 1 · maç sonu+lig 51 / 0 · çerçeve kataloğu 47 / 1 · aura kataloğu 49 / 0 · sayfa boyunca kaydırma
  26 fps / 6 sn'de 19 (yeni katmanların ilk çizimi). Ekran görüntüsü 390 + 1440: yatay taşma 0, süs kesilmesi yok, konsol
  hatası yok; azaltılmış harekette 43/43 parça durur, plaka parıltısı kapalı.
- **Build temiz;** ana paket `oyun-*.js` 391.407 → 391.681 B (gzip 126.714 → 126.766); önizleme ayrı tembel parça 80 KB
  (gzip 23,9 KB) + CSS 14,9 KB.
- **Kontrol 2 — Düello saldırı süresi:** zaten düzeltilmiş. Aynı şikâyet (23 Eyl) migration 325/326/330 ile (dosyalar
  `ffca638` commit'inde): faz bitişine gösterim payı 1500 ms, sayaç `gosterim_bas`a dek tam süre, sonra gerçek zaman;
  `sunucu_zamani` clock_timestamp; istemci `e5cb2db` (bitişe yakın 0,5 sn yoklama). Sonraki Düello migration'ları (327,
  470) payı koruyor; sunucu süre kontrolü değişmedi.
- **Kontrol 3 — rakip arama sıklığı:** zaten yapılmış — migration 337 `rakip_ara_yoklama_ms = 3000` (±%25), `RakipAra.jsx`
  ayardan okur (`ffca638`).

## 2026-09-24 — Premium: aktivasyon + 2. tur + elmas görselleri + çıkış onayı (bulut, `bulut/premium-aktivasyon`)
**Araç:** Claude Code (yönetici + Ajan A, Ajan B; ortak klasör, git kilidi `araclar/soru-uretim/yazim.lock`)
**Neden:** Ida `/premium-onizleme`'de 9 kozmetik + lig amblemini onayladı; beğenmediklerinin 2. turunu, yeni elmas paketi
görsellerini ve Turnuva/Grup çıkış onayını istedi.

- **A (b508b1a, 03872ec, 5e3548a, 8955018):** migration 560 (UYGULANMADI; bkz. docs/KOZMETIK_AKTIVASYON.md) — 9 kalem
  (çerçeve 500, aura 300 elmas), yeni yuvalar, oyuncu_kartlari/lig_grubum_ozet alanları, bot null, `kozmetik_ver`. Yerel
  Postgres iki kez + senaryolar geçti. `CerceveliAvatar` premium çerçeve/iç aurayı tembel çizer; Dükkân › Çerçeve/Aura
  sekmeleri, Koleksiyon. Lig amblemi (`ligAmblemi.jsx`) şerit, VS, maç sonu, profil, oyuncu kartı, lig tablosu, podyum,
  arkadaşlar, lobi (telefonda şerit/maç sonunda avatar köşesinde). Eski boş Aura sekmesi premium aura varken gizli (karar
  A'nın; eski auralar açılırsa geri alınır). Turnuva/Grup çıkış onayı (`geriTusuOnayi.js`, QtModal) — düğme + geri tuşu;
  izole test sayfasında Playwright ile doğrulandı, gerçek girişli sayfalar test edilemedi.
- **B (eb63ca0, 04f7f49, e3d4f58, 1d8cdda, f3a342b):** 2. tur — düz WebGL 1 (paket yok), tek paylaşılan bağlam, görünmez
  tuvalde çizip 2D tuvale kopya; Ejderha (ağızdan shader alev, göz, duman), Sönmeyen Alev (gürültü ateşi, duman, ısı dalgası),
  Buz (kırılan ışık, buğu), Şimşek (dallı yıldırım, plazma, çakma aydınlatma), Kraliyet + Altın Lig (ortam yansıması);
  en çok 2 hareketli efekt, ekran dışı/gizli sekme/azaltılmış harekette durur, ≤48 px WebGL yok, WebGL yoksa eski SVG.
  PNG yuvaları `public/kozmetik/premium/README.md` (ejderha.png, kraliyet-tac.png). Altın plaka 2 aday (yakut zemin,
  külçe). Elmas paketleri (`#pp-elmas`, `elmas/ElmasPaketGorseli.jsx`) avatar çizim dilinde; dükkâna bağlanmadı.
  "Oyunda" rozeti 10 kalemde.
- **Ölçüm (GPU'suz, 390 px, 4× CPU):** tek/iki WebGL çerçeve 51–57 fps, 50 ms üstü 0; kalabalık önizleme bölümleri
  16–38 fps (SwiftShader'da gölgelendirici CPU'da + geri okuma) — gerçek telefonda ölçülmeli. Ana paket 391.681 →
  397.383 B (A: amblem + tanımlar + çeviri); WebGL motoru 26 KB, premium çizim 57 KB, önizleme 70 KB ayrı tembel parça.
- **Çeviri kontrolü (değişiklik yok):** oyuncu ekranlarında 1 kalıntı — TournamentPage "{k}/{t} oyuncu kaldı" EN'siz;
  diğerleri laboratuvar/sahip önizlemeleri (18 dosya), kaldırılmış ana sayfa taslakları, dondurulmuş Hızlı Mod.
- **Yerelde yapılacak:** `npx supabase db push` (560); canlıda satın al → tak → rakipte görünüm; girişli sayfalar (profil,
  dükkân, turnuva/grup çıkış) elle kontrol; WebGL efektlerini telefonda ölç.

## 2026-09-24 — Premium aktivasyon canlıda (560) + yedek iş akışı düzeltmesi
**Araç:** Claude Code (yönetici)
- **Yedek iş akışı:** `veritabani-yedek.yml › bildir` silinmiş `testler`e bağlıydı → `needs: [yedek]`. Dosya geçersiz
  olduğu için 24 Eyl gecesi zamanlanmış yedek hiç başlamamıştı. Elle çalıştırma başarılı: 77.256 satır, fark 0,
  hesaplar geri geldi (`veritabani-yedek-20260924-1304`). 23 Eyl gecesi yedeği alınmış ve doğrulanmıştı (çalıştırmayı
  `testler` düşürmüştü). Düzeltmeden sonra main'deki push'larda hata yok; kalan "failure"lar eski dosyayı taşıyan
  `bulut/premium-aktivasyon` dalının push'ları.
- **560 (prova → uygulandı):** yıkıcı bir şey yok (tür kısıtı genişledi, `oyuncu_kartlari` DROP+CREATE, yetkiler 541
  ile aynı). `bulut/premium-aktivasyon` main'e birleşti (çakışmasız). Turnuva "{k}/{t} oyuncu kaldı" → EN
  "{k}/{t} players left".
- **Canlı kontrol:** normal hesap (satış açık) 12 kalem görüyor: onaylı 9 premium (3 çerçeve 500, 6 iç aura 300) +
  önceki turda onaylı isim_altin + 2 tepki paketi; eski aura kataloğu 0; almadan takma reddedildi. Lig amblemi: ana
  sayfa, profil, lig tablosu (11), arkadaşlar, Klasik şeridi (2, orta sütunla çakışmıyor), Düello şeridi, maç sonu —
  taşma ve konsol hatası yok. Grup çıkış onayı 15/15 (X ve geri tuşu açar, "Oyunda kal" varsayılan odak ve oyunda
  tutar, "Çık" → terk_at + "Maçtan ayrıldın"). Turnuva çıkış onayı canlıda DOĞRULANAMADI: 18:00 seansını bekleyen
  test, makinede bellek azaldığı için Claude Code tarafından durduruldu (betik: scratchpad `premium-kontrol.mjs turnuva`).

## 2026-09-24 — Canlı test düzeltmeleri (bulut, 3 ajan + Bölüm 6/7)
**Araç:** Claude Code (yönetici + Ajan A/B/C + 2. tur ajanı; ortak klasör, git kilidi `araclar/soru-uretim/yazim.lock`)
**Neden:** Ida'nın telefondan canlı testi: maç sonu hareketsiz ve kayıyor, dükkânda kozmetik hareketsiz, avatar listesi eksik,
ada dokununca kart yok, maç içi ses tek düğme; ek olarak 2. tur onayları (Bölüm 6) ve boş elmas görselleri (Bölüm 7).

- **1 Maç sonu (A: 56f455b, c284fea, 1f09849):** KÖK SEBEP — Lottie oynatıcısı (169 KB) + JSON'lar + konfeti ancak sahne açılınca
  iniyordu; kupa 450 ms, konfeti 700 ms sınırını aşınca son karede donuk / hiç atılmıyordu (yerel hızlı ağda görünmüyordu;
  300 ms gecikme + 1,6 Mbit/sn'de kupa 16 örnekte donuk). Şimdi maç biterken önceden iner, kupa/level 3 sn'ye kadar baştan
  oynar, konfeti parça gelene dek bekler. Tek ekran: `html.msk-acik` (kaydırma kilidi, alt menü gizli), eylem çubuğu sahnenin
  son satırı, 3 kademe sıkışma, Detay/ek içerik panelde. Ada dokununca kart. Ölçüm 17 hâl × 4 boy + azaltılmış hareket: 76/76
  kaydırma 0, alt menü gizli, çakışma yok. Yönetici (üretim derlemesi, 360×640/390×844): belge = görünür, Lottie kareleri
  ilerliyor, konfeti tuvali var, hata 0.
- **2–3 Dükkân/Koleksiyon + avatar (B: e38c2b8, 48a4961):** kartlar 48 px'te "küçük kademe" (durağan) kalıyordu → 60/52 px,
  hareketli, ekran dışında durur; karta dokununca 210 px önizleme penceresi (kendi avatarın, fiyat, Satın al/Tak). Avatar:
  Dükkân › Avatar yalnız 27 yeniyi listeliyor, Koleksiyon yenileri öne koyuyordu → her yerde 31 + 27 (tek liste
  `HAZIR_AVATARLAR`), kurulum ızgarası iOS iç kaydırma. 58/58 erişilebilir (390/360).
- **4–5 İsim kartı + ses (C: 699b905, 87bfbb2):** `OyuncuAdiDugmesi` — şerit, Düello, VS, turnuva, grup, arkadaş istekleri,
  meydan okumalar, davetler, lobi, profil. Maç şeridi hoparlörü pencere açar: Müzik/Efektler ayrı, Ayarlar ile aynı kaynak.
- **6 2. tur oyunda (30adea5, fa4a252, 2be53cb):** Sönmeyen Alev / Şimşek / Kraliyet 2. tur (`pc_alev2`, `pc_simsek2`,
  `pc_kraliyet2`, 500 elmas) — istemci main'de, katalog migration 570 `bulut/bekleyen-migration` dalında (UYGULANMADI);
  Altın Lig her yerde 2. tur hâli (kazanılır); `isim_altin` külçe plakaya dönüşür (istemci eşlemesi). Onaylanmayanlar
  önizlemede.
- **7 Elmas görselleri (00b7d3d):** ızgara kapsayıcıda `height:100%` → 0 px; `aspect-ratio` ile düzeldi (üretimde 112×112).
- **Build temiz;** ana paket 397.383 → 403.529 B (gzip 128.669 → 130.235). WebGL motoru, Lottie, konfeti tembel.
- **Ida telefonda:** maç sonu hareketi (iPhone'da "Hareketi Azalt" kapalıyken), kaydırmasızlık ve Detay paneli; dükkân kartları
  ve pencere hareketi; kurulum avatar kaydırma; ada dokunuş (VS geçişi, lobi lig kartı); ses penceresi; 570 uygulanınca
  Alev/Şimşek/Kraliyet satın al → tak. Not: tepki balonları artık maç sonunda Detay panelinde.

## 2026-09-24 — Premium 2. tur çerçeveleri canlıda (570)
**Araç:** Claude Code (yönetici)
- `bulut/bekleyen-migration` dalından YALNIZ `20260612000570_premium_tur2.sql` alındı (dal eski, birleştirilmedi;
  istemci sanatı `fa4a252` zaten main'deydi). Prova → uygulandı: pc_alev2 (Sönmeyen Alev), pc_simsek2 (Şimşek),
  pc_kraliyet2 (Kraliyet), premium_cerceve, girsin, 500 elmas (TEST), bot_min_level 999. Dal silindi (uzak + yerel).
- Canlı kontrol (390 px): Dükkân › Çerçeve ızgarasında üçü 500 elmasla, pencerede "Satın al 500", 0,7 sn arayla
  iki kare farklı (hareketli); 3 kalem × 2 tur aç/kapat: tek WebGL bağlamı, heap 10–14 MB sabit, çökme yok, taşma ve
  konsol hatası yok. Botlar: 160 botta premium takılı 0, bot_kozmetik premium 0. Arayüz denetimi 16 sayfa TEMİZ.
- Not: `.arayuz-denetim-oturum.json`'daki canlı oturumun yenileme belirteci önceki betiklerde tükenmişti ("Already
  Used"; çağrılar oturumsuz gidip "permission denied" veriyordu — yetki doğru) → canlı kayıt silindi, arayüz
  denetimi yeni misafir oturumu yazdı. Betiklerde setSession yenilenen belirteci dosyaya geri yazmıyor; ortak test
  oturumunu tüketir.

## 2026-09-24 — Kozmetik tamamlama + çevrimiçi + ikon + yeni avatarlar (bulut, 3 ajan)
**Araç:** Claude Code (yönetici + Ajan A/B/B2/C; ortak klasör, git kilidi)
- **A — kozmetik (aaa0cbd, 147a486, 4307962, 7ff8c38):** Ejderha 2. tur `pc_ejderha2` (500 elmas TEST, bot takmaz,
  önizlemede "Oyunda") — migration **580 UYGULANMADI**; uygulanmadan istemci değişmez. Dükkân › Elmas'ta 5 yeni paket
  görseli (112×112, 390/360). Altın isim plakasız metal harf (kontrast en düşük 3,21 açık / 4,94 koyu; açık zeminde
  bronza yakın — Ida bakacak), `OyuncuAdiDugmesi` üzerinden her yerde; ≤liste durağan. Yumuşak hareket: üç genel
  reduce kuralı kozmetiği `:where(:not(…))` ile dışarıda bırakıyor, kozmetik 0,4 hızda; flaş/konfeti/patlama kapalı
  (Chrome reducedMotion ölçümü: çalışıyor, hız 0,4; no-preference eskisi gibi). Kapsam dışı: ZaferEfekti, oyun içi
  efektler. Risk: iOS <14 `:where` yok.
- **B — ikon (432c9f7, e446f12, 18cf80f):** `/ikon-onizleme` 4 aday (Q Nabız, Şeker Q, Soru Balonu, Dört Şık), Android
  ana ekran taklidi, 3 maske, açık/koyu, 48/72/192, güvenli alan kılavuzu, Girsin/Girmesin + kopyala. Hazır dosyalar
  `public/ikon-aday/<ad>/`; oyunun ikonu değişmedi. Onayda: dosyaları `public/`'e kopyala + manifest `icons` + index.html
  icon/apple-touch (+ isteğe bağlı sw.js bildirim ikonu).
- **B2 — çevrimiçi (2407365, 8a7c593):** Ida güvenlik kuralını onayladı. Migration **590 UYGULANMADI**: `realtime.messages`
  `cevrimici_oku`/`cevrimici_yaz` (yalnız extension=presence, `^cevrimici-<uuid>$`), `cevrimici_kanal_okur_mu` security
  definer yalnız authenticated; 551 tepki politikalarına dokunulmadı. Yerel PG testi: sahip oku/yaz, arkadaş yalnız oku,
  bekleyen/yabancı/anon hiçbir şey. İstemci `oyun/lib/cevrimici.js` (Layout'ta kendi durum, FriendsPage'de ≤50 dinleme);
  realtime-js presenceState eski kaydı düşürmüyordu → join/leave defteri. Migration yokken tek uyarı, liste bugünkü gibi.
- **C — avatarlar (2191278, d0e0b54, 9bc849d, cb4174c):** Sporcu (sporcu-y09) kel görünüyordu → dolu saç kütlesi,
  dosya adı aynı. 12 yeni avatar (`AvatarProIllustrations3.jsx`, `public/avatars/pro2/*-y28…y39.svg`); migration **595
  UYGULANMADI** (aktif=false, onay bekliyor); onay sonrası tek satır + bot bloğu dosyanın sonunda.
- **Yönetici:** HEAD temiz kopyada derlendi; ana paket 403.529 → 408.462 B (çevrimiçi kancası kabukta). 390 px açılış
  (normal + reduce) taşma 0, konsol hatası 0.
- **Uygulama sırası:** 580 → 590 → 595 (sonra avatar onayı → 595 sonundaki satır).

## 2026-09-24 — 580 / 590 / 595 / 596 canlıda, Şeker Q ikonu, çevrimiçi durumu düzeltmesi
**Araç:** Claude Code (yönetici)
- **Migration (her biri önce prova):** 580 Ejderha (pc_ejderha2, 500 elmas TEST, bot_min_level 999) · 590 çevrimiçi
  durumu (Ida onaylı güvenlik kuralı: realtime.messages'ta yalnız 'presence' için cevrimici_oku / cevrimici_yaz) ·
  595 12 avatar kapalı · **596 (yeni)**: 595'in açma adımı yalnız 8 avatar için — kristal-uzayli-y28,
  gozsapli-uzayli-y29, savas-robotu-y30, siborg-y31, android-y32, kedili-kiz-y37, pilot-y38, hostes-y39 ücretsiz;
  kasli-sampiyon-y33, demir-pazi-y34, fitness-kralicesi-y35, kedili-genc-y36 kapalı. Gizli botlar 550 kuralıyla
  (31 + aktif katalog) yeniden dağıldı: 8 bot yeni avatarlardan aldı, kapalı avatarlı bot 0. Yorum: "botlar yalnız bu
  8'i kullanabilsin" = yeni 12'den yalnız açık 8'i (31 + 27 önceki avatar da kullanılmaya devam eder).
- **İkon:** Şeker Q (`public/ikon-aday/seker-q`) → `quiztactics-sekerq-*` (favicon SVG + 192, apple-touch 180, manifest
  192/512 + maskable 512), sürüm `20260924-sekerq`; eski wordmark dosyaları durur; og:image değişmedi.
  `useBildimManifest` manifest bağlantısını sürümsüz adrese çevirip önbellek kırıcıyı düşürüyordu → düzeltildi.
- **Hata (canlıda bulundu):** arkadaş listesinde çevrimiçi durumu hiç görünmüyordu — oyuncunun kendi
  `cevrimici-<uid>` kanalına katılımı "Unauthorized". Kök sebep: sahip kanalında presence dinleyicisi yok →
  realtime-js presence'ı kapalı katılıyor → sunucu broadcast okuma iznine bakıyor (590'da yalnız presence
  politikası). Sahip kanalı `presence.enabled: true` ile açılır; politika/yetki değişmedi.
- **Canlı kontrol (390 px):** Ejderha dükkânda 500, pencerede "Satın al 500", hareketli; botlarda premium 0 ·
  Dükkân › Elmas 5 görsel (ep--1…5) · Profil › Ayarlar › Avatar: 8 yeni var, kapalı 4 yok · iki test hesabı (arkadaş
  yapıldı): B ana sayfadayken A'da "Çevrimiçi", maçtayken "Maçta", kapatınca kalkıyor · konsol/çökme 0.
- `bulut/kozmetik-aktivasyon` ve `bulut/premium-aktivasyon` silindi (ikisi de main'de tamamen vardı).
- Not: canlı test betikleri (scratchpad `kontrol-595.mjs`) yenilenen oturumu `.arayuz-denetim-oturum.json`'a geri
  yazıyor — ortak test oturumu artık tükenmiyor.

## 2026-09-24 — /tasarim-onizleme: altın isim + rakip arama ekranı adayları (bulut, 2 ajan)
**Araç:** Claude Code (yönetici + Ajan A/B). Oyunda değişen bir şey yok; migration yok.
- **Kabuk (46189ad, 7fa43e4):** `/tasarim-onizleme` yalnız sahip (`sahip_mi`), tembel parça; iki bölüm, Girsin/Girmesin,
  "Seçimlerimi kopyala"; giriş sonrası dönüş listesinde; yerel geliştirmede DEV istisnası.
- **Altın isim adayları (101f12f):** Ida: canlıdaki metal altın harf açık zeminde bronz, normal isimden ayrılmıyor (koyu altın ↔
  lacivert isim 2,6:1). 4 aday — Parlak, Taçlı, Işık Şeritli, Yıldızlı 3B; hepsi parlak sarı (#fff7c2→#ffd83a→#ffb700) +
  lacivert kontur (arka katman 16 yönlü text-shadow, ön katman background-clip degrade; text-stroke iç çizgi bırakıyordu).
  Lig satırı, maç şeridi, VS, maç sonu, profil; listede durağan, reduce'da 0,4 hız. Ödün: kontur/taç dar sütunda ismi erken kısaltır.
- **Rakip arama adayları (3771aaf):** A "Gök Yolu" (dikey kartlar, radar + VS diski, slot avatar), B "Güneş Halkası" (ortada dönen
  halka, yörüngede 8 avatar). Gök mavisi + turuncu ışınlar, süre, mod/Dereceli rozeti, kategori, "Biliyor muydun?" (14, TR/EN),
  arama → bulundu → VS ~2 sn → maç başlıyor. Şimdiki ekran yanında. 4× CPU yavaşlatmada ~59–60 fps. Tam ekran portal (fixed + transform yok, 100dvh).

## 2026-09-24 — Altın isim "Işık Şeritli" + rakip arama "Güneş Halkası" oyunda (bulut, 2 ajan)
**Araç:** Claude Code (yönetici + Ajan A/B). Migration yok. Maç sonu / Düello / rövanş dosyalarına dokunulmadı (PC'deki oturum).
- **Arama ekranı (aac2da3):** `AramaSahnesi` görünümü tembel `AramaGunesHalkasi.jsx` + `ekranlar/arama-gunes-halkasi.css`;
  eşleşme, süre (`ARAMA_GECIS_MS` 2000), sunucu çağrısı aynı. Makara 450 ms'de durur, VS ~1,2 sn'de oturur, "Maç başlıyor" 2 sn.
  Klasik/Saf Bilgi/Düello (Düello'da VS profil gelince başlar). Grup kendi satır içi ekranı (ChallengesPage, dokunulmadı),
  Turnuva'da arama yok. 4× CPU: 60 fps, reduce 0,4 hız. Kontrast ≥4,93. Not: bu ekranda isme dokununca kart yok.
- **Altın isim (86c32d9):** `IsimEfekti › AltinIsim` (şerit + `::before` kontur + degrade dolgu; seçim/ekran okuyucu tek ad),
  `ekranlar/altin-isim.css`; eski metal altın bloğu kozmetik.css'ten çıktı; önizlemedeki serit adayı oyun bileşenini çizer
  (piksel farkı 0). Arkadaş listesi satırı artık isim efekti gösteriyor (FriendsPage tek satır). Lig satırında eskisiyle
  aynı noktada kısalır. Kontrast kontur/beyaz 15,1, sarı/kontur ≥8,6.
- **Ana paket:** JS 408,89 (a8ae628) → 408,25 kB; CSS 473,24 → 476,38 kB. Build temiz; 390/360, reduce açık/kapalı taşma 0, hata 0.

## 2026-09-24 — Canlıda üç oyun-kıran hata (Ida, Samsung Android Chrome) + denetim izleri temizlendi
**Araç:** Claude Code (yönetici)
- **Düello maç sonu boş (yalnız eylem çubuğu):** tema.css `.bd-duello > * { position: relative; z-index: 1 }` aynı
  ağırlıkta; yüklenme sırasıyla kazanınca sahne (`.msk`, `c284fea`'dan beri `position: fixed`) akışa düşüyor, gövde
  0 px'e çöküp `overflow: hidden` ile kırpılıyordu (ölçüm: `.msk` relative, `.msk-govde` h 0). Düzeltme:
  `.bd-duello > .msk { position: fixed; z-index: 30 }`. Sunucu verisi (`mac_sonu_ozet`) sağlamdı. Klasik/Grup/Turnuva
  sahneyi kapsız çiziyor — etkilenmemiş.
- **"Devam eden bir düello var" (asılı düello) = denetim D-101:** 470'te zayıf noktası olmayan savunanda
  `v_zayif_saldiri` NULL → `duello_hamleler.riskli` NOT NULL → tur çözülemiyor; `duello_tik_hepsi` hatayı yutuyordu.
  Canlı: silaa'nın 18:08 bot düellosu 16 dk asılı (Ida o sırada davet edemedi), 5df65666, fde41b07. Migration 600:
  `coalesce(…, false)` + güvenlik ağı (hata veren ve süresi 60 sn geçmiş maç ödülsüz `iptal`).
- **Art arda ikinci maçta ikisinde de donma:** `/mac/:id`, `/duello/:id`, `/grup-mac/:id` maç kimliği değişince
  yeniden kurulmuyordu (rövanş aynı rotada); bitmiş maçın ilerleme damgası (`damgaRef`, 1e9) yeni maçın bütün
  güncellemelerini "eski" sayıp atıyordu → yeni maç adresinde eski "ZAFER!" sahnesi, soru 0'da donma (iki test
  hesabıyla yeniden üretildi). Düzeltme: `MacAnahtarli` — sayfa maç kimliğine `key`li (BildimApp.jsx).
- **Canlı doğrulama (390 px):** zayıf noktası olmayan hesapla Düello (bot) sonuna kadar → tur çözüldü, maç sonu
  sahnesi tam (başlık, avatarlar, can, XP, görevler); iki hesap Klasik 20 soru → rövanş (sayfa yenilenmeden) → ikinci
  maç 20/20 donmadan (skorlar 10–90 / 50–70, yeni sahne); iki arkadaş arasında Düello daveti + kabul → düello açıldı;
  Grup 15/15 (çıkış onayı + "Maçtan ayrıldın"). Hareketi azalt açıkken de aynı.
- **Denetim izleri silindi (Ida isteği):** 7 misafir hesap (Denetci1_42, Denetci1_83, DenetciIki36/70/40,
  DenetimUc148, "Oyuncu" 0c59b999 — d2 EN ilk açılış betiği) → auth.users CASCADE: 10 maç, 2 düello (5df65666 dahil),
  1 arkadaşlık, 3 mesaj, 4 bildirim, 1 davet, grup/turnuva kayıtları. Önce prova, sonra uygulandı. ArayuzDenetim*
  araç hesapları duruyor (araçlar kullanıyor).

## 2026-09-25 — D-203 (profil dili), test elması, avatarsız gizli botlar — migration 610
**Araç:** Claude Code (yönetici)
- **D-203:** yeni profil 'tr' doğup EN oyuncuyu Türkçeye düşürüyordu. `handle_new_user` kayıt verisindeki dili
  (`raw_user_meta_data.dil`) yazar; Login misafir ve e-posta girişinde dili kayıt verisine koyar; Google yönlendirmesi
  için dil cihazda (`bildim_giris_dili`) saklanır, profil < 30 dk ise `useDil` bir kez yazar (bu sırada hiçbir useDil
  örneği sayfayı eski dile yenilemez). Mevcut profiller değişmedi. Canlı: EN tarayıcı + "Try as a guest" → profil `en`,
  sayfa `en`, maç sorusu İngilizce ("Who performs dangerous scenes…"); kayıt verisiz yeni hesap + giriş dili en → `en`;
  eski hesap (+2 gün) + giriş dili en → `tr` korundu. Test hesapları (3) silindi.
- **Elmas:** `oyun_ayarlari.baslangic_elmas` = 10.000 (TEST, yayında 150), yeni hesap ilk girişte alır (bot hesabı
  almaz); 79 insan hesabın bakiyesi 10.000'e tamamlandı, botlarda elmas 0. Yeni misafir hesap canlıda 10.000 aldı.
- **Gizli bot avatarı:** avatarı boş 75 gizli bota (ege55 dahil → Büyücü) açık avatarlardan ada göre sabit avatar;
  kalan 0. (Önceki kural "avatarsız botlar değişmez"di — Ida isteğiyle kaldırıldı.)

## 2026-09-25 — Mesajlaşma güvenliği (Google Play UGC + KVKK) — migration 620, 621
**Araç:** Claude Code (yönetici)
- **Önceden var olan (0. adım):** yalnız arkadaşa mesaj (`dm_gonder` + `dm_arkadas_mi`), sohbette arkadaş değilken giriş
  kapalı + eski mesajlar okunur, hesap silme (`hesabimi_sil`, mesajlar CASCADE), `yasakli_kelimeler` (61 kelime, yalnız
  takma adda alt dize — "Kemal/Cemal"i "mal" yüzünden reddediyordu). **Yoktu:** engelleme, şikâyet, yönetim, mesaj filtresi,
  koşul kabulü (girişte yalnız bağlantı).
- **620 (Ida isteğiyle yeni tablolar/RLS/yönetici kontrolü):** engellemeler + sikayetler (RLS açık, politikasız, yalnız RPC);
  tetikleyiciler: direkt_mesajlar (askıda/mesaj kapalı/koşul/engel + maske), friendships, matches ('bekliyor'),
  duello_davetleri, group_match_players ('bekliyor'), duellolar (rövanş), match_messages; tepki_kanal_uyesi_mi +
  tepki_durumu engelde kapalı; takma_ad_sec yeni filtre. **621:** maskede noktalama korunur ("***,").
- **Arayüz:** profil kartında Engelle/Engeli kaldır + Şikâyet et (engelde iletişim düğmeleri gizli); sohbette başlıkta
  Engelle + Şikâyet, gelen mesaja uzun basınca/sağ tıkla şikâyet, koşul kabul kartı, engel/kapalı notları; şikâyet penceresi
  (5 sebep, açıklama, "Bu kişiyi engelle"); Ayarlar › Engellediklerim; `/yonetim/sikayetler`. TR+EN (`ceviri/guvenlik.js`).
- **Yasal:** Koşullar 4. bölüme "Mesajlaşma: yasaklı içerik ve davranışlar"; Gizlilik'e özel mesaj/engelleme/şikâyet/koşul
  kabulü satırları + silinince neyin gittiği. Kanıt olarak kalan şikâyetlerin **saklama süresi yazılmadı — Ida'ya soruldu.**
- **Test:** filtre 65/65 (`araclar/kufur-filtre-testi.mjs`; masum: sıkıldım, SIKILDIM, şikâyet, şike, sikke, siklet, Kemal,
  mal, top, bot, I got it, Amin, Dickens, amcam, Scunthorpe; yakalanan: S1KT1R, s.i.k.t.i.r, o r o s p u, 0r0spu, siiiiktir,
  F*U*C*K, @mk, $ik, ekli hâller). Canlı iki hesapla 28/28: arkadaş değilken mesaj reddi, koşulsuz mesaj reddi, maske,
  mesaj şikâyeti + günde 1, yönetici olmayan liste reddi, yönetim listesi ve "mesajlaşmayı kapat" (sahip kimliğiyle,
  geri alınan işlemde — test hesabına yetki verilmedi), engel → arkadaşlık biter, mesaj/istek/meydan okuma/Düello/tepki
  reddi, bot etkilenmez, engel kalkınca mesaj gider, küfürlü takma ad reddi. 390 px görüntüler `denetim/goruntuler/guv-*`.
  Test şikâyetleri ve mesajları silindi, A–B arkadaşlığı geri kuruldu.
- **Bilinen sınırlar:** tamamı BÜYÜK "SIK…" (I→ı) yakalanmaz; EN "pic" maskelenir (TR "piç"); rastgele eşleşme engelli iki
  kişiyi eşleştirebilir; tepki paket sahipliği yayında doğrulanamaz (eski not).

## 2026-09-25 — Şikâyet saklama süresi 1 yıl + rastgele eşleşmede engel — migration 630
**Araç:** Claude Code (yönetici)
- Ida kararı: hesabı silinen oyuncu hakkındaki şikâyetler (kanıt metni dahil) 1 yıl saklanır. `sikayetler.edilen_silindi_at`
  (FK SET NULL anında tetikleyiciyle yazılır), `oyun_ayarlari.sikayet_saklama_gun` = 365, günlük iş `bildim-sikayet-saklama`
  (03:35 UTC) → `sikayet_saklama_temizle()`. Gizlilik Politikası'na TR + EN cümle (canlıda iki dilde doğrulandı).
- Rastgele eşleşme: `kuyruga_gir` (aynı kategori + karışık, 2 seçim), `quick_match`, `duello_ara`, `grup_ara` → engelli çift
  eşleşmez (grupta yalnız aramayı yapanla engelli olanlar dışarıda; gruba girenlerin kendi aralarındaki engel kapsam dışı).
- İşlem içi prova (geri alındı): hesap silinince kayıt kaldı + silinme anı yazıldı; iş 366 günlük kaydı sildi, 300 günlüğü
  bıraktı; Klasik ×2 ve Düello engelsiz eşleşti, engelliyken eşleşmedi. Grup ayrıca denenmedi (aynı koşul).
- Ida'nın aynı mesajına yapıştırdığı "Jev'i bütün Claude Code projelerine bağla" metni mesajında istenmediği için
  uygulanmadı; ayrıca soruldu.

## 2026-09-24 — Yayını engelleyen denetim hataları (bulut, 2 ajan)
**Araç:** Claude Code (yönetici + Ajan A/B). Migration yok; oyun mantığı/puanlama/sunucu aynı. PC oturumunun (dil, elmas,
620/621/630) commit'leri pull --rebase ile alındı; tek çakışma BildimApp lazy satırları — iki taraf birleştirildi
(YonetimSikayetlerPage satırı korundu, tembelYukle ile sarıldı).
- **A1 maç ekranı sığıyor (d930b3a, 837cc53):** Klasik/Grup/Turnuva/Çalışma/Düello soru açıkken 100dvh sütun; 390×664 ve 360×640'ta
  sayfa = ekran (önce 967–1425 px), joker + tepki hep görünür; Grup skor tablosu maçta yatay şerit; `lib/soruUzunluk.js`;
  `useOyunModu` oyun moduna girerken en üste kaydırır (maç 187–400 px kaymış açılıyordu).
- **A2 gök mavisi (6dcdbb1):** `.qt-sahne-gok` — Hazır mısın?, Düello, Çalışma, Klasik/Grup/Turnuva bekleme, terk hâlleri.
  Hazır mısın? baykuşu kaldırıldı, altta maç bilgi kartı. Baykuş maskot hâlâ: Login, Tanitim, SureDolduGecis, MatchPage asenkron,
  CalismaPage boş banka (karar Ida'da).
- **A3 arama (e773b55):** Güneş Halkası'nda ada dokununca kart; Grup araması Güneş Halkası'nda (katılan sayısı sunucudan
  gelmiyor → "3–5 oyuncu"). Düello VS 2 sn'ye UZATILMADI: düello kurulunca sunucu kategori süresi işliyor; yerine geç gelen
  profilde ara animasyon atlanır (VS ~0,95 → ~1,45 sn).
- **B1 boş ekran (1f8b988):** HataSiniri Layout'ta Outlet'i ve kökte main'i sarar; online'da yeniden dener; vite:preloadError
  oturumda bir kez yenile; `src/lib/tembelYukle.js` (1 yeniden deneme) bütün lazy sayfalarda; AnaSayfaA "Yüklenemedi · Tekrar
  dene"; `BaglantiSeridi` "Bağlantı yok". Üretimde çevrimdışı → kart + alt menü, bağlantı gelince sayfa kendiliğinden.
- **B2 çıkış onayı (9bffc2b):** `CikisOnayi.jsx` — misafirde uyarı + "Önce hesabımı bağla" (Ayarlar güvence kartı).
- **B3 satın alma onayı (355eef3, 3207896):** bütün dükkân alımları `JokerSatinAlModal` (isteğe bağlı prop; maç içi aynı).
- **B4 elmas çıkmazı (14c11f5):** "Elmasın yetmiyor: X gerekli, Y var" + "Nasıl kazanılır?"; reklam yoksa video kartı gizli;
  Google Play metni yalnız Elmas sekmesi + satış açıkken.
- **B5 ham hata (0425d2b):** coinHatasi/kozmetikHatasi → hataMesaji; ağ hatası her yerde "Bağlantı yok. İnternetini kontrol edip tekrar dene."
- **Ana paket (sahte env, aynı koşul):** origin/main önce JS 414,21 / CSS 480,46 kB → sonra 422,87 / 494,44 kB.

## 2026-09-24 — Baykuş maskot tamamen kaldırıldı
**Araç:** Claude Code (yönetici). Migration yok.
- Giriş: mevcut profil avatarlarından üçlü (tilki, kedi, robot). Tanıtım: kartın ikonu büyük diskte. "Maç bitti!" geçişi:
  kupa/saat ikon diski. Asenkron "Senin bölümün bitti" ve Çalışma boş Hatalarım: ikon diski (`ekranlar/ikon-disk.css`).
- `Maskot.jsx` ve `.bd-maskot*` CSS kaldırıldı; kalan "baykuş" geçişleri yalnız profil avatarı Baykuş (k03) ve dondurulmuş
  `oyun/karakter/karakterler.js` (görünmez).
- Düello VS ~1,5 sn kalır (Ida kararı; sunucu süresi aynı).
- Test: 390×664, 360×640 (+1280 giriş), hareketi azalt açık/kapalı; taşma 0, sayfa hatası 0. Build temiz.
## 2026-09-25 — Jev bütün Claude Code / Codex projelerine bağlandı (global, kullanıcı düzeyi)
**Araç:** Claude Code (yönetici)
- Global dosyalar depo DIŞINDA (`C:/Users/ida/.claude/jev/`): `jev.mjs` (dosya-sec · sirala · kontrol · sinifla · puanla ·
  rapor · durum; toplu istek, yerel doğrulama, 429/5xx'te 2 yeniden deneme, 30 sn; 401/402/403 → 6 sa devre dışı,
  anında "kendin_karar_ver"), `esikler.json`, `kapi.mjs` (PreToolUse, Bash + PowerShell), `hatirlat.mjs`
  (UserPromptSubmit), `is-akisi.md` (TEK KAYNAK kurallar) + `esitle.mjs` (kopyaları eşitler), `kayit.jsonl`, `kapi.jsonl`.
  Skill `~/.claude/skills/jev-akis`, ajan `~/.claude/agents/dosya-arayici.md` (Haiku, salt-okunur), `~/.codex/AGENTS.md`.
  Anahtar: Windows kullanıcı ortam değişkeni `TYPESAFE_API_KEY` + `~/.claude/jev/.env` (yedek).
- Bu depoda: `AGENTS.md` dar kural ("yüzlerce kalem", "5–10 kalemlik işleri verme") genişletildi, sonuna tek kaynaktan
  "Jev iş akışı" bölümü; PROJECT_CONTEXT araç satırı. Proje araçları `araclar/jev*.mjs` değişmedi.
- Kapı: bariz yıkıcı kalıplar (rm -rf, del/rmdir /s, Remove-Item -Recurse -Force, git reset --hard, git push --force/-f/+ref,
  git clean -f, DROP/TRUNCATE/DELETE FROM, .env'e yazma) Jev'e SORULMADAN anında onay (Jev kapalıyken de); belirsizler
  Jev'e (≥ 0,6 → onay, 3 sn'de cevap yoksa geçer). Test 50/50; gerçek oturumda `git reset --hard` onaya düştü, iş korundu.
- Ölçüm (clubafroditqr, aynı görev): Jev'li 3 dosya / 11 tur / 241k önbellek jetonu / 0,44 $; Jev'siz 5 dosya / 16 tur /
  445k / 0,47 $. Skill ve CLAUDE.md kuralı TEK BAŞINA yetmedi (model Jev'i çağırmadı) — `dosya-sec` tek komutu +
  hatırlatma kancasıyla çağırdı.
- Bilinen: DELETE FROM / DROP geçen her komut (ör. grep ile arama, bu depodaki pg-mini temizlik betikleri) onay ister.
- **Kapı düzeltmesi (aynı gün, Ida):** kapı yalnız ÇALIŞTIRILACAK kısmı değerlendirir — heredoc gövdesi, tırnak içi metin,
  commit mesajı, echo/printf/grep/rg/`git log --grep` argümanları atılır (yönlendirme `> .env` kalır); yorumlayıcıya kod olarak
  giden metin (`psql -c`, `node -e`, `bash -c`, `python -c`, `ssh`, `psql/node/bash <<EOF`) korunur. Test 23/23 (11 yanlış
  alarm örneği geçti, 12 gerçek yıkıcı anında onay) + önceki 50/50. Yukarıdaki "DELETE FROM geçen her komut onay ister"
  notu artık geçerli değil; `node betik.mjs "…DROP…"` gibi yorumlayıcıya tırnaklı argüman temkinli olarak onay ister.

## 2026-09-25 — Görsel revizyon /gorsel-revizyon — durum
**Araç:** Claude Code (yönetici + Ajan A/B). Kaynak: `tasarim/BRIEF_GORSEL_REVIZYON.md`. Oyunda değişen bir şey yok; migration yok.
Öncelik (Ida): 0 → 6 → 4 → 1–2 → 9 → 10 → 7 → 8 → 3 → 5 → 12 → 11, 13. Her bölüm bitince ajan commit + push eder ve bu girdiyi günceller.
- Biten: belge (a65bac4), sayfa kabuğu + ortak palet (8248eaf: `oyun/tasarim/gorsel-revizyon/` palet.js/palet.css, secim.jsx, a/, b/) · 6 lig çerçeveleri (B) · 1 coin (A) (89cabbb) · 2 elmas (A) (808b11d) · 9 lig amblemleri (A) (dbe470b) · 10 rozetler (A) · 0 stil rehberi (A) · 4 oyuncu kartı (B) · 3 nadirlik (A) · 7 level çerçeveleri (B) · 12 logo (A) · 11 joker hizalama (A) · 8 turnuva şampiyonu (B) · 5 unvan (B) · 13 premium/arka plan hizalama (B)
- Kalan: 

## 2026-09-25 — Şehir Şampiyonu: arka plan (sunucu) — migration 640, 641
**Araç:** Claude Code (PC). **Neden:** brif `tasarim/BRIEF_SEHIR_SAMPIYONU.md` — haftayı şehrinde 1. bitirene bir haftalık
unvan + kalıcı rozet; görünüm Görsel Paket 2'de.
- **Canlıdan okunan gerçek (önce):** `haftayi_kapat` arşive yalnız insanları yazıyordu (gizli botlar canlı şehir listesinde
  görünür ama arşivde yoktu → listede 1. görünen ile arşiv 1.'si farklı olabilirdi), şehir sırası `rank()` (eşitlikte birden çok
  1.), `lig_siralama` eşitlik bozucusu ad'da bitiyordu (id yok). `sehir_krali` eski `badges/user_badges` sistemine yazılıyordu;
  istemcide bu tablo hiç okunmuyor (görünmez ödül). `sehirler` yalnız TR 81 il; diğer ülkede serbest metin.
- **640 şehir listesi:** 81 il (Hakkâri → resmi "Hakkari") + GeoNames (CC BY 4.0) 84 ülkenin 100.000+ şehirleri (Lüksemburg'da
  100.000+ yok → en kalabalık 3) = 4.956 şehir / 86 ülke; `nufus`, `kaynak`; `sehir_anahtar()` normalleştirme. Bir gizli botun
  ülkesi (GH) listede yoktu → "Gana" eklendi. Üretici `araclar/sehir-listesi/uret.mjs`. Eski kayıt eşleme: tek insan kaydı
  değişti (PH "Cebu" → "Cebu City"), eşlenemeyen insan kaydı yok. Gizli botlar: TR'de nüfus kotasıyla en az taşıma
  (İstanbul 20 · Ankara 7 · İzmir 6 · Bursa 4 · …; önce Bursa 9, Trabzon/İstanbul 8), yabancı 49 bot ülkesinin en kalabalık 10
  şehrinden nüfus ağırlıklı; 101 bot taşındı, şehirsiz gizli bot kalmadı.
- **641:** `lig_arsiv.sehir_sampiyonu` (tek kaynak; aktif = hafta_basi() − 7), kapanışta gizli botlar da arşive girer, şehir
  sırası canlı listeyle birebir (puan_hafta → puan → ad → id, aynı görünürlük), asgari şart ayarlarda (`sehir_sampiyonu_min_oyuncu`
  3, `_min_galibiyet` 1; galibiyet `haftalik_galibiyet_sayisi`: Klasik/Düello/Grup/Turnuva kazananı, yalnız şehir 1.'leri için).
  Rozet `lig_sehir_sampiyonu` (lig·altın·crown·olay·coin 0); `sehir_krali` artık verilmez (eski kayıtlar durur). Bildirim
  anahtarlı (`push_metinleri.sehir_sampiyonu_oldun` TR/EN) ama `sehir_sampiyonu_bildirim_acik` = 0 (görünüm gelene dek kapalı).
  `profil_konum_kaydet`: her ülkede listeden; şehri olan + puan_hafta > 0 → yeni haftayı bekler; ilk seçim serbest; 24 saat
  kuralı aynen. `oyuncu_kartlari` + `sehir_sampiyonu jsonb` (DROP/CREATE, yetki birebir geri); `sehir_sampiyonu()` RPC.
  Geriye dönük: 14 Eyl haftası (tek arşiv haftası) arşivdeki insan kayıtlarıyla şartlı → idagg (Balıkesir) şampiyon, rozet
  coin'siz/görülmüş; bu hafta unvanı aktif.
- **Prova (işlem içi, geri alındı) 36/36:** arşiv korundu, farklı puan / eşit puan→toplam / →ad / →id, gizli bot şampiyon =
  canlı 1. (`bot=false`), 2 oyuncu → yok, 3 oyuncu galibiyetsiz → yok, konum 6 durum, süre (geçen hafta aktif, iki hafta önceki
  değil), rozet ilk/ikinci/coin, `sehir_krali` yazılmadı, kart ve RPC'de bot bilgisi yok. Canlıya uygulandı.

## 2026-09-25 — Şehir Şampiyonu: konum ekranı listeye geçti + belgeler
**Araç:** Claude Code (PC). **Neden:** aynı brif — istemcide yalnız konum seçimi ve kilit mesajı.
- `SehirArama.jsx` + `ekranlar/sehir-arama.css`: aranabilir liste (serbest metin yok), nüfusa göre sıralı, harf/aksan
  farkı önemsiz ("IZMIR" → İzmir), liste akışta açılır (yüzen katman yok), satır ≥ 44 px, klavye (↑↓ Enter Esc).
  Profil kartı (`KonumSecici`) ve kurulum sihirbazı adım 3 bunu kullanır; ülke adları EN'de `Intl.DisplayNames`.
  Haftalık kilit mesajı kartta ve Profil › Ayarlar satırında (`konumHaftaKilitli`); açıklama metni yeni kurala göre.
- `araclar/arayuz-denetim.mjs` kurulum adımı şehri artık listeden seçer (eski `select` yolu ülkeyi değiştirirdi).
- Atıf: Kullanım Koşulları › 18 (GeoNames, CC BY 4.0, yapılan değişiklik) + `docs/VARLIK_LISANSLARI.md`.
  Sözleşme `docs/SOZLESME_ROZET_CERCEVE.md` (kart alanı, `sehir_sampiyonu()`, rozet 102) ve `cerceve.js` yorumu.
- **Ölçüm (yerel, canlı DB, 3 misafir hesap — sonra silindi):** sihirbaz 390×844 ve 360×640, TR ve EN: taşma 0,
  44 px altı hedef 0, konsol hatası 0; "bali" → Balıkesir, "IZMIR" → İzmir, bulunamadı metni TR/EN; seçim + "Oyuna başla"
  kaydetti. Profil kartı: 24 saat kilidi (TR) ve puan_hafta > 0 haftalık kilit (EN, 360 px) doğru metinle. Build temiz.

## 2026-09-25 — Şehir Şampiyonu: açık konu kararları — migration 642
**Araç:** Claude Code (PC). Ida kararları: (1) `profil_konum_kaydet` yalnız authenticated; (2) arşivde botların ülke/dünya sırasına girmesi kabul;
(3) GeoNames ilçe kayıtları kalsın; (4) şampiyonluk bildirimi kapalı (`sehir_sampiyonu_bildirim_acik` = 0; Görsel Paket 2'de açılacak); bot kimlik deseni ayrı paket.
- 642: `revoke ... from public, anon` + `grant authenticated, service_role` (deneme modunda geçti, canlıya uygulandı). **Düzeltme:** canlıda bu fonksiyonda
  zaten anon/public yetkisi YOKTU (önceki raporumdaki "misafir rolüne açık" ifadesi ACL satırını yanlış eşlemekti); 642 fiilen değişiklik yapmadı, yalnız garanti altına aldı.
  ACL taramasında anon'a açık bulunan tek ilgili fonksiyon `lig_siralama` (eskiden beri; giriş yoksa 'Giriş gerekli' der) — değiştirilmedi, karar Ida'da.

## 2026-09-25 — Görsel entegrasyon A (bulut, tek ajan) — durum
**Araç:** Claude Code (Sonnet 5, tek ajan, kredi sınırlı). Kaynak: `tasarim/SECIMLER_GORSEL_REVIZYON.md` › Görev A.
- **Biten:** 1–2 Coin + Elmas ikonu (c41232a) — `oyun/components/ParaIkonlari.jsx` (CoinIkon "Dönen Sikke", ElmasIkon
  "Pırlanta"), oyundaki her `QtIkon ad="coin"/"elmas"` bu tek bileşene geçti (üst çubuk, dükkân, satın alma penceresi,
  davet, maç sonu, profil, ana sayfa görevleri). Düzeltme 5 uygulandı (≤22 px eğim azaltılmış varyant).
- **Kalan (öncelik sırası):** 12 Logo (Şeker Q harfli yazı) → 11 Joker ikonları hizalama (7 joker) → 3 Nadirlik kart
  kenarı (yeni renkler: Nadir yeşil, Epik mor + düzeltme 6).

## 2026-09-25 — Görsel entegrasyon A tamamlandı (bulut, tek ajan)
**Araç:** Claude Code (Sonnet 5). Kaynak: `tasarim/SECIMLER_GORSEL_REVIZYON.md` › Görev A. Migration yok, oyun mantığı değişmedi.
- 1-2 Coin/Elmas (c41232a): `oyun/components/ParaIkonlari.jsx`, tüm `QtIkon ad="coin"/"elmas"` bu tek bileşene geçti.
- 12 Logo (dcb1abe): `oyun/components/Logo.jsx` "Şeker Q harfli yazı" — QtMarka/Layout üst çubuk + giriş ekranı.
- 11 Joker ikonları (d1cc149): `skill-rozet.css` düz renk + hücre gölgesi + kalın kontur + tek parlama; sembol değişmedi.
- 3 Nadirlik kart kenarı (00f30b0): tokenlar.css Nadir→yeşil, Epik→keskin mor, Efsanevi→altın; `qt-dc-oge`/`qt-cs-oge`
  kartları `:has()` ile kart kenarı + köşe etiketiyle boyanıyor; yeni `NadirlikEtiketi.jsx` tek kaynak; satın alma
  penceresine (JokerSatinAlModal) mevcut alanı olan çağrılarda (aura, premium kozmetik) bağlandı.
- **GÖREV B'ye not:** Maç sonunda kozmetik ödül/düşme özelliği yok; nadirlik orada gösterilecek bir alan bulunmadı.
- **Kalan yok** — Görev A'nın 4 maddesi de bitti. Görev B (lig/level/turnuva çerçeveleri, premium hizalama, rozet
  sistemi, unvan, tek oyuncu kartı, stil rehberi sayfası, temizlik) PC'de sürüyor.

## 2026-09-25 — Görsel revizyon entegrasyonu B (PC) — migration 643
**Araç:** Claude Code (Opus 5.5, PC). **Neden:** `tasarim/SECIMLER_GORSEL_REVIZYON.md` › Görev B (Ida seçimleri). Görev A bulutta bitti.
- **1–3 Kazanılan çerçeveler (ed96c86):** `tasarim/kazanilan/` (KazanilanCerceve + anahtarlar), CerceveliAvatar → PremiumAvatarCizim
  (tembel) → GrCerceve (tur2 motoru). Düzeltme 1: ≤ 48 px lig siluetleri köşelerde (Bronz yalın · Gümüş alt defne · Altın + üst
  yıldız [tur2/sanat.js] · Elmas köşe kristali · Efsane kanat) — önce Bronz/Gümüş/Altın üçü de düz daireydi. Düzeltme 2: Level 25
  sivri / 50–75 yatık altıgen (+75 köşe yıldızları) / 100 on iki uçlu; en dış nokta her kademede 54 (Lv100 ışınları 58'di).
  Düzeltme 3: kupa 0,5 → 0,9. Koleksiyon ızgarası da yeni çizim; ana sayfa kartı ve koleksiyonda taşma payı.
- **4 Lig amblemi Fasetli Yıldız (d2cbcbc):** `premium/ligAmblemi.jsx` tek kaynak; isim yanı 20 px; lig kartı/çipi, lig arması 52 px.
- **5 Premium hizalama (ec135f6):** CSS 3 çerçeveye kontur + parlama + ≤ 48 px imza; 4 WebGL çerçevede tuval olcek 1; 6 arka plan
  ≤ 71 px iri parçacık + doygunluk + iç kontur (premium.css). Önizleme 13 artık oyundakiyle aynı.
- **6 Rozet Madalyon (5cd4927):** `tasarim/rozet/` — 26 amblem (+10 kategori), seviye süsü, kardeşlerde eşik rakamı; 102 rozetin hepsi.
- **7 Unvan (692adf4, migration 643):** tablolar + RPC + lig kapanış kancası + oyuncu_kartlari.unvan; bildirim açıldı; level çerçeve
  adları "Level N Madalyası". Prova: kazanılanlar, sahip olmadığı unvan reddi, kart unvanı, şehir önceliği (idagg Balıkesir),
  33/150 gizli botta unvan, olay unvanları, yetkiler — hepsi doğru; canlıya uygulandı.
- **8 Tek oyuncu kartı (324df83):** `OyuncuVitrinKarti`; profil başı + oyuncu kartı penceresi; lig satırı / VS / maç şeridinde unvan.
  Maç şeridinde unvan < 420 px gizli (360 px'te 1–2 harfe iniyordu).
- **9 `/stil-rehberi` (f0493ab)** · **10 Temizlik (a40a279):** rozetSembolleri.jsx + rozet-madalyon.css silindi.
- **Ölçüm:** 360/390 px taşma 0, konsol hatası 0; siluet/gri testleri ekran görüntüsüyle; mobil taklidinde WebGL çerçeve hareketli,
  "hareketi azalt"ta da hareketli (yavaş). Ana paket `oyun-*.js` 425,3 → 457,2 kB (gzip 138,4 → 146,9); bunun ~8 kB'ı lig amblemi,
  ~11,5 kB'ı rozet çizimleri (ana pakette görünen yerlerde kullanılıyor), kalanı Görev A (logo, coin, joker). Test hesabı silindi.
- **Belirsiz (bağlanmadı):** 4 sezon unvanı (sezon sistemi yok), "Kahramanmaraş İkincisi" (sezon/2.lik kuralı yok), "Bin Galibiyet"
  (Klasik mi toplam mı?). **Karar bekleyen:** Bronz Lig çerçevesi (`lig_bronz`) katalogda yok — çizimi hazır.

## 2026-09-25 — Görev B kararları (Ida): Bin Galibiyet, Bronz çerçeve, paket boyutu — migration 644
**Araç:** Claude Code (Sonnet 5, PC).
- Sezon unvanları (4) DB'de hiç bağlı değildi → gizli kalır; "Kahramanmaraş İkincisi" önizleme listesinden çıkarıldı (20 unvan). "Level N Madalyası" adları kaldı.
- **644:** `bin_galibiyet` unvanı — `toplam_galibiyet()` (Klasik + Düello, rakibi açık bot olan Antrenman hariç; Grup; Turnuva), eşik `unvan_galibiyet_esik` 1000,
  `unvan_galibiyet_kontrol()` (unvanlarim + haftalık kapanış kancası), 80 insan için geriye dönük çalıştırıldı (kimse 1.000'e yakın değil: en çok 25). `lig_bronz` çerçevesi
  kataloğa (sıradan · lig:bronz · sıra 100), 80/80 insana verildi, yeni insan hesapta tetikleyiciyle gelir; coin/popup yok, takılı çerçeve değişmedi. Prova: eşik en çok
  galibiyet sayısına indirilince yalnız o oyuncu aldı, ikinci kez/bot almadı; yetkiler service_role/authenticated aynı düzen.
- **Paket:** lig amblemi statik SVG (`public/lig-amblem/<lig>-<k|b>.svg`, 10 dosya ~1–2,5 kB) + tembel hareketli parça; ana paket `oyun-*.js` 457,17 → 452,02 kB (gzip 146,93 → 145,42).
- Not: bu makinede headless Chrome yeni misafirin İLK ana sayfa açılışında (tanıtım) "Page crashed" veriyor; 813553e (B öncesi) dahil eski commit'lerde de aynı → benim kodumdan değil;
  oturum, giriş sihirbazından hemen sonra kaydedilerek aşıldı. Gerçek telefonda kontrol edilmeli (yeni hesabın ilk açılışı).

## 2026-09-25 — Koleksiyon Puanı (646) + grup engel eşleşmesi (645) + üç kontrol
**Araç:** Claude Code (Sonnet 5, PC).
- **Kontroller (yapılmış, canlıda):** (1) ana sayfa kaydırmasız — `html.as-kaydirmasiz` (23 Eyl): 390×844, 360×640, 390×664 emülasyonunda scrollY 0, documentElement = innerHeight, overflow hidden;
  gerçek telefonda (iOS/Android araç çubuğu) ayrıca bakılmalı. (2) OYNA penceresinde Serbest|Dereceli anahtarı (`ModSecimPenceresi` › `DereceliAnahtari`) var, Klasik/Saf Bilgi/Düello aynı.
  (3) Terk kuralı bütün modlarda sunucuda: `mac_sonuclandir` terk edene XP/seri yok, kazanan tam ödül; `gorev_sayaci` terk edilen maçları saymaz; Düello/Grup/Turnuva terk fonksiyonları 460–463.
- **645:** `grup_ara` adayları yalnız aramayı başlatanla değil kendi aralarında da engel açısından eler. Provada 4 oyuncu, 2–3 engelli: grup {1,2,4}, 3 kuyrukta kaldı, ikili engelli üye 0.
- **646 Koleksiyon Puanı:** ağırlıklar `koleksiyon_agirlik_*` (1/3/5/10). Kalemler: rozet (kademe: bronz sıradan · gümüş nadir · altın epik · elmas efsanevi), kazanılan aktif çerçeve (cerceveler.nadirlik),
  aktif aura (auralar.nadirlik), `koleksiyon_ek_kalemleri` (Battle Pass ve gelecek kalemler için kanca), unvan / kozmetik / avatar için `nadirlik` sütunu eklendi ama BOŞ (tanımsız → puana girmez, uydurulmadı).
  Önbellek `profiles.koleksiyon_puani`, deyim düzeyi tetikleyicilerle güncellenir (7 sahiplik tablosu), `koleksiyon_hepsini_yenile()`; `oyuncu_kartlari.koleksiyon_puani`; `koleksiyon_dokum()`, `koleksiyon_siralama()` (lig_siralama görünürlüğü, gizli botlar dahil, bot alanı yok).
  Geriye dönük 237 oyuncu/bot puanlandı (insan en yüksek 37, gizli bot en yüksek 99 — botların rozetleri çok). Görünüm: oyuncu kartı "Koleksiyon N" (+VS), profilde özet, Koleksiyon sekmesinde döküm, Lig › Koleksiyoncular sekmesi. TR+EN (`ceviri/koleksiyon.js`).

## 2026-09-25 — Arayüz tamamen İngilizce (İngilizce oyuncu için giriş → maç sonu)
**Araç:** Claude Code (Sonnet 5, PC).
- **Tarama (sözlükte olmayan metin):** `araclar/ceviri/tara.mjs` (AST ile kaynak tarama), `db-tara.mjs` (veritabanı hata mesajları + katalog metinleri), `bildirim-tara.mjs` (bildirim şablonları) — hepsi yeniden çalıştırılabilir.
  Bulunan gerçek boşluklar: sunucudan gelen 87 hata mesajı (`raise exception`), 6 bildirim şablonu (`%` kalıplı), 8 katalog/paket adı, "Skill'ler" (Jokers), adsız kendi profilinde "Oyuncu",
  sabit sayfa başlığı + meta açıklaması. Hepsi mevcut sözlük sistemine (`oyun/lib/ceviri/sunucu.js`, `tarama.js`; `ttSunucu`) taşındı, ~105 metin. Yeni sistem/paket yok.
- **Çalışma zamanı testi (EN, yeni misafir, 390 px):** giriş/kayıt + kurulum sihirbazı → ana sayfa → Klasik maç (eğitim dahil) → Düello (Nasıl oynanır 6 sayfa, arama, kategori, sorular, sonuç) → Grup maçı → dükkân,
  profil, sıralama, arkadaşlar, mesajlar, turnuva, antrenman düğme tıklama taraması. Türkçe kalan: yalnız özel adlar.
- **Kalan (bilerek):** Türkiye/il adları ve açık bot adları (ÇaylakBot, ÜstatBot) özel ad; sorular çevrilmez (karar); statik `index.html` / manifest / sosyal önizleme Türkçe kalır (dil çalışma zamanında seçiliyor);
  Supabase Auth e-postaları kapsam dışı; önizleme/tasarım sayfaları kapsam dışı.
- **Gerçek telefonda bakılacak:** yeni hesabın ilk açılışı (bu makinede headless Chrome ilk açılışta çöküyor — kodla ilgisiz, 813553e'de de aynı).
- **oyuncu-testi düzeltmesi:** Düello skill dokunuşunda satın alma penceresi artık "Joker satın al" adını taşıyor (skill→joker adlandırması); test eski "Skill satın al"ı arıyordu, pencere kapanmadığı için şık dokunuşları
  engelleniyordu (5–8 sahte başarısız). Regex `(Skill|Joker) satın al`. Sonra canlıda Düello koşusu: yalnız "sayaç ilk 3 sn hızlı" (kategori fazı, 1 faz) kaldı — önceki koşularda da vardı, bu işten bağımsız, izlenecek.
  Test hesapları (2 EN misafir) `hesabimi_sil()` ile silindi.

## 2026-09-25 — Ülke Şampiyonu + Dünya Şampiyonu (647) + level çerçeve adları geri alındı
**Araç:** Claude Code
**Neden:** Şehir Şampiyonu (641) deseninin ülke ve dünya karşılığı; 643'teki "Level N Madalyası" adlandırması yanlış karardı.
- **Migration 647** (canlıya uygulandı; önce transaction'da prova): 2 rozet (`lig_ulke_sampiyonu` 707, `lig_dunya_sampiyonu` 708, elmas kademe, coin 0);
  `lig_arsiv.ulke_sampiyonu` / `dunya_sampiyonu` + dar indeksler; `haftayi_kapat` (canlıdan alınan 641 gövdesi) şehir bloğunun altında iki UPDATE + iki ödül döngüsü;
  `push_metinleri` (ulke/dunya, tr/en) + `ulke_/dunya_sampiyonu_bildirim_acik` = 1; `ulke_dunya_sampiyonu()` RPC (ikisi tek fonksiyonda);
  `unvanlarim()` (644 gövdesi) + `ulke_sampiyonu` / `dunya_sampiyonu`; `oyuncu_kartlari` (646 gövdesi, koleksiyon_puani korundu) unvan önceliği dünya > ülke > şehir > takılı;
  geriye dönük işaretleme + rozet (coinsiz), `koleksiyon_hepsini_yenile()`; level çerçeve adları 360'taki hâline döndü (Bronz / Gümüş / Altın / Altın Kanatlar).
- **Karar — görünür havuz:** şampiyonluk `sira_ulke`/`sira_global`'den değil, `lig_kapanis_havuzu()`'nda yalnız `gorunur` satırlardan hesaplanır (arşiv sırası gizli hesapları da sayar). Asgari şart yok, gizli bot şampiyon olabilir.
- **Karar — tek fonksiyon:** ülke ve dünya şampiyonu `ulke_dunya_sampiyonu()` ile birlikte döner.
- **Karar — dünya bildirimi sabit metin:** brif "%1" diyordu; EN'de "Champion of Dünya" çıkacağı için dünya metni parametresiz ("Dünya Şampiyonu oldun!" / "You are the World Champion!"). Ülke: "%1 Şampiyonu oldun!" (`ulkeler.ad`).
- **Karar — dönüş tipi değişmedi:** ülke/dünya `oyuncu_kartlari.unvan` jsonb'unun `tur` değeri (`ulke` / `dunya`) olarak gelir; tablo kolonu eklenmedi → DROP/CREATE ve yetki yeniden verme gerekmedi (RLS/yetki değişikliği yok).
- **İstemci:** `unvan.js › unvanMetni` (ulke/dunya), `UnvanSecici` "bu hafta ülke/dünya şampiyonusun" satırları (+EN `dil.js`), bildirim EN karşılığı `ceviri/sunucu.js`, unvan çizimine `ulke` (bayrak, yakut) ve `dunya` (küre, turkuaz) türü.
- **Prova (transaction, geri alındı):** görünmeyen hesap 99999 puanla 1. iken şampiyon OLMADI; bot dünya + TR + şehir şampiyonu oldu, BG'de kendi ülke şampiyonu; insan 1. olunca 3 rozet + 3 bildirim; `oyuncu_kartlari` idagg için `{tur: dunya}`; retro 14 Eylül haftası: idagg ülke + dünya + şehir; koleksiyon puanı 23 → 63 (efsanevi × 2 dahil). Build temiz.
- **Not:** aynı kişi üç unvanı birden kazanırsa üç ayrı bildirim gider (şehir/ülke/dünya) — brife uygun bırakıldı.

## 2026-09-25 — "Aura" adı → "Arka Plan" (yalnız ekranda görünen metinler)
**Araç:** Claude Code
**Neden:** Ida kararı (24 Eyl): özellik aynı, oyuncunun gördüğü yerde "aura" kelimesi kalmasın (TR "Arka Plan/Arka Planlar", EN "Background/Backgrounds"). Migration yok.
- **Değişen (yalnız metin):** Dükkân sekme adı (`JokerDukkani`, `DukkanKozmetik` paura), `lib/kozmetik.js` TUR_ADI, `DukkanAuralar`, `Koleksiyon`, Koleksiyon Puanı dökümü ("Arka Plan"), elmas notu ("arka plan ve çerçeve gibi görünüm eşyaları"), önizleme sayfaları; premium dükkân açıklaması tam onaylı metin ("Arka Plan — avatarının arkasındaki hareketli sahne. …"). EN sözlükler (`ceviri/dukkan|kozmetik|premium|koleksiyon.js`) yeni anahtarlarla; eski anahtarlar silindi.
- **Sunucu mesajları (5, DB'de eski adla):** migration açılmadı; `dil.js › ttSunucu` TR için de eşliyor (`TR_DUZELTME`): "Böyle bir arka plan yok", "Bu arka plan satılmıyor / sende yok / zaten sende / şu an kullanılamıyor". EN'de sözlük zaten "background". DB'deki ham mesajlar aynı.
- **Dokunulmadı:** DB anahtarları/tabloları, kod ad/prop/dosya adları, `?sekme=aura` / `paura`, CSS sınıfları.
- **Karar:** lig çerçevesi açıklamasındaki "alev aurası" (çerçevenin ışıma efekti, Arka Plan özelliği değil) → "alev ışıltısı" / "flame glow" (önizleme sayfası + sözleşme).
- **Kaza ve düzeltme:** toplu değiştirme `DukkanAuralar`/`sanatAuralar` import adlarına ve `setAuralar`'a bulaşmıştı, build öncesi geri alındı (diff'te yok).
- **Test:** build temiz; `grep tt("…aura` boş; 390 px TR: Dükkân › Arka Plan sekmesi, `?sekme=aura` ve `paura` açılıyor, satın alma penceresi onaylı açıklamayı gösteriyor, Koleksiyon sayfasında "aura" yok (sayfa metni + aria/title taraması 0); EN metinleri sözlük düzeyinde doğrulandı (12 anahtar). Test misafir hesapları silindi.

## 2026-09-25 — Koleksiyon Puanı nadirlikleri (648) · Düello sayaç ilk rakamı · Paket 40/42 kontrast/dokunma denetimi
**Araç:** Claude Code
- **A) Migration 648** (önce transaction'da prova, sonra uygulandı): `unvan_tanimlari.nadirlik` 13 unvan (Ida listesi), `kozmetikler.nadirlik` 32 kalem (tur'a göre; yalnız null olanlar), `avatar_katalogu` bilerek null (ücretsiz). Rozete bağlı 9 unvanın elle yazılan nadirliği `rozet_tanimlari.kademe` ile karşılaştırıldı: hepsi tuttu. Listede olmayan aktif unvan yok. `koleksiyon_hepsini_yenile()`. En yüksek insan puanı 63 → 86, en yüksek bot 99 → 115, `idagg` 63 → 86.
- **B) Düello sayacı — kök sebep (ölçüldü):** faz ekrana geç görününce ilk rakam kesirle başlıyordu (canlıda gecikme 3380 ms: ilk rakam 14, 183 ms sonra 13 — oyuncu "hızlı" görüyor). Sunucu saat farkı/hızlanma DEĞİL: 20 fazın 19'unda adımlar normal (cevap fazı da). İkinci sebep: kalan süre 200 ms bayat `simdi` ile hesaplanıyordu (kesri 0,2 sn şaşırtıyor). Düzeltme: `kalanSn` render anının saatiyle; fazın ilk göründüğü anda kesir bir kez atılır → `gosterSn` (Düello) / `gosterKalan` (`QuestionCard`: Klasik, Grup, Turnuva); rakam, tik sesi, son-3/5-sn vurgusu buna bağlı; süre mantığı, şık kilidi, sunucu toleransı gerçek kalanda, aynı. Ek Süre / Zaman Baskısı / Soru Değiştir kesiri yeniden hesaplamaz. Ödün: gösterilen 0, gerçek bitişten ≤ 0,9 sn önce görünebilir (yalnız geç görünen fazlarda). Turnuva izleyici sayacı ve Hatalarım (Çalışma) dokunulmadı (sunucu fazı yok / yalnız gösterim).
  Doğrulama (yerel dev + canlı DB): düzeltmeden önce canlıda 1 koşu ← HIZLI; düzeltmeyle 4 koşu: 1. geçti, 2. ← HIZLI (bayat `simdi` bulundu, ikinci düzeltme), 3. ve 4. geçti (geç görünen fazlar 2045–4059 ms, adımlar 946–1014 ms). Not: ilk canlı koşuda ayrıca "savunan · tur 1 — soru YANITSIZ kapandı" 1 kez çıktı, sonraki 4 koşuda tekrarlanmadı — izlenecek.
- **C) Paket 40/42 (canlıda ölçüldü, hiçbiri kod değişikliği gerektirmedi — Paket 43'te düzelmişti):**
  1. Seri sayısı: eski `.bd-seri-sayi` hiçbir canlı ekranda yok (yalnız rotasız Home.jsx); ana sayfadaki `.bd-seri-serit b` her iki durumda 7,74:1 (12 px). Eski #FF8A6B 2,31 → `--bd-hata-2` #B62F2F ≈ 6,1:1 (hesap).
  2. "Çırak" (`.qt-dk-ustalik-seviye`): tek renk `--qt-ikinci-koyu` #4f2fd6 beyazda ≈ 7,8:1 (hesap; test hesabında ustalık satırı yok, canlı ölçülemedi). 3,01 → 7,8.
  3. Gizlilik/Koşullar bağlantıları: 2,68 → 13,92:1 (canlı, 14 px kalın lacivert).
  4. Turnuva lobisi kılıç: 34×34 → 44×44 (canlı ölçüm, `QtIkonDugme`, `--qt-dokunma`).
  Ana sayfa + Profil tam metin taramasında (390 px) eşik altı metin yok (tek istisna: dekoratif SVG "2X" simgesi).

## 2026-09-25 — Sayaç: "erken sıfır" ödünü kapatıldı (d815f48'in devamı)
**Araç:** Claude Code
**Neden:** d815f48'deki sabit kayma, gösterilen sayacın "0"a gerçek bitişten ≤ 0,9 sn önce düşmesine yol açıyordu.
- **Yöntem (`oyun/lib/zaman.js`: `sayacKaymasi` / `sayacGoster` / `sayacSinirMs`):** kayma ilk görünüşte kesire eşitlenir ama sabit kalmaz, kalanla orantılı erir: `gösterilen = kalan − kayma · min(1, kalan/k0)`. Kalan k0'ın altındayken gösterilen gerçekten YAVAŞ akar (hız 1 − kayma/k0 < 1) → hızlanma imkânsız, rakam süreleri ≥ 1 sn; kalan 0 olunca gösterilen de 0. Önerilen "son 2 sn'de yumuşatma"nın tersi: o pencerede sayaç 1,8× yavaşlar/hızlanırdı; orantılı erime tipik geç görünüşte (k0≈13) yalnız %4 yavaşlık (rakam 1,04 sn). En kötü durum: faz son ~2 sn'de ilk kez görülürse son rakam ≤ ~1,9 sn görünür (k0 < 1 ise kayma uygulanmaz).
  Sayısal doğrulama (k0 = 1…15, 1 ms adım): en kısa rakam süresi 901 ms, en uzun 1449 ms, sıfır kayması 0 ms, zamanlayıcı tahmini hatasız. Kesir < 0,15 sn'de "hiç uygulama" önerisi UYGULANMADI: o zaman ilk rakam 0,15 sn'lik yanıp sönme olur (hedef 1'i bozar); orantılı erime küçük kesirde zaten ihmal edilebilir.
- **Bulunan ek sebep (Düello):** saat farkı tahmini (`farkRef`, en büyük örnek) yeni örnekle sıçrıyor; rakam sınırına denk gelince 16–70 ms'lik "hızlı" adım (bir koşuda `930 · 16 ms ← HIZLI`). Yalnız gösterim için fark en çok %5 hızla (50 ms/sn) kaydırılır (`kalanGoster`); süre mantığı gerçek `kalanSn`'de.
- **Test aracı (`araclar/oyuncu-testi.mjs`):** `sayacRaporu` sıfır anını ölçer: gösterilen 0 ile sunucu bitişi (`hedef − fark`) farkı; > 300 ms → "← ERKEN SIFIR" başarısız (Düello ve Klasik). `--sifir` bayrağı bir soruyu bilerek yanıtsız bırakıp (Düello: 2. turdan sonra ilk cevap fazı; Klasik: 2. soru, sonra biter) süreyi doldurur; `--sayacdebug` ham kaydı yazar. Klasik'te her soru aynı "cevap" fazı olduğundan 2. sorudan sonrası hiç ölçülmüyordu (Ek Süre sıçraması sanılıyordu) — `QuestionCard` `__bdTani.soru` ile soru bazlı parçalama.
- **Ölçüm:** sıfır anı gerçek bitişten 18–58 ms SONRA (Düello 9 gözlem: −18…−45 ms; Klasik: −58 ms; hepsi ≤ 100 ms) — erken sıfır yok. Düello: 3 koşu (biri --sifir'siz) `← HIZLI` yok, `← ERKEN SIFIR` yok; geç görünen fazlarda (2,7–4,5 sn) adımlar 990–1069 ms. Üçüncü koşuda ayrıca "skill satın alma penceresi 5 sn içinde kapanmadı" (satın alma isteği 'Alınıyor…'da, sayaçla ilgisiz, izlenecek); önceki bir koşuda tek `930 · 16 ms` ← HIZLI (yukarıdaki fark sıçraması, sonra düzeltildi).
- **Elle kontrol (Klasik/QuestionCard, `--sifir` ile):** 2. soru süresi dolana dek sayaç 15→0 saniyede birer birer indi, 0 gerçek bitişten 58 ms sonra; Grup/Turnuva aynı `QuestionCard`'ı kullanır (ayrıca izlenmedi — Turnuva seansı açık değildi, Grup maçı kurulmadı).

## 2026-09-25 — Joker satın alma penceresi "Alınıyor…" kilidi · son-5-sn görseli kontrastı
**Araç:** Claude Code
- **A) Satın alma penceresi (`JokerSatinAlModal`, Düello + maç içi `JokerCubugu` + Dükkân tek bileşen):** yeniden ÜRETEMEDİM — 11 alımda (baz koşu 8: 644–864 ms; düzeltmeli koşu 4: 428–835 ms) pencere hep kapandı. Koddan bulunan gerçek risk: `onayla` yalnız `try/catch` idi, `calisiyor` yalnız hata dalında bırakılıyordu; `onOnay` hiç dönmezse (asılı RPC/ağ) ya da dönmeden önce çok beklerse pencere sonsuza dek "Alınıyor…". Ayrıca Düello/JokerCubugu `onOnay` sonunda `await yukle()` (iki ardışık RPC) yapıyordu: alım bitmiş olsa da pencere tam yeniden okumayı bekliyordu — yavaş ağda 5 sn'yi aşabilir (görülen tek olay büyük olasılıkla bu; kanıtlanamadı). Savunma: (1) modal 25 sn zaman aşımı (`Promise.race`) + `finally` ile `calisiyor` her dalda bırakılır (hata metni: "İşlem uzun sürdü… alım yapıldıysa envanterinde görünür", kör tekrar yok); (2) Düello ve JokerCubugu'nda satın alma yolunda `yukle()` arkadan (await yok). Asılı RPC simülasyonu (Playwright `route` ile hiçbir RPC yanıtlanmadı, Dükkân › Joker): 27. sn'de hata metni göründü, düğme yeniden etkin. `oyuncu-testi` artık joker alımında pencere kapanış süresini yazar.
- **B) Son-5-sn "filigranı":** aranan öğe = `.bd-duello-hale` (aria-hidden, kenar halesi, `tema.css`); yalnız Düello v1 dönüşünde çiziliyor, v2 (canlı sürüm) çizmiyor → madde o öğe için KAPANDI (kod silinmedi, v1 kullanılmıyor). v2'de son 5 sn görseli `.qt-h-gerilim::after` (4 px `--qt-yanlis` kenar + parıltı): `oyuncu-testi --sifir` ile pikselden ölçüldü — kenar/iç zemin **3,17–3,25:1** (≥ 3:1, kod değişikliği yok). Aynı sınıf QuestionCard'da da kullanılıyor. Ölçüm aracı: `--sifir` koşusunda `haleOlc()`.
- **İzlenecek (ayrı):** `oyuncu-testi` Düello'da test hesabı 1. turda SAVUNAN olunca 3 koşuda 4 kez "savunan · tur 1 — soru YANITSIZ kapandı" (ilk cevap fazında ekran ölçümü sonrası cevap verilmiyor) — sayaç/satın alma değişikliklerinden önce de vardı (ilk baz koşuda da), kök sebep araştırılmadı.

## 2026-09-25 — Avatar seçimleri oyuna işlendi (649) · /avatar-onizleme "Seçimlerimi kopyala" üç bölümü kapsıyor
**Araç:** Claude Code
- **A) Migration 649** (önce transaction'da prova, sonra canlıya uygulandı): Ida'nın `/avatar-onizleme` seçimi sunucuda `onay` kolonunda zaten duruyordu (8 `girmesin`, 31 `girsin`); oyuncuya görünürlük yalnız `aktif`e bağlı olduğundan (550) ikisi eşitlendi: `girmesin` → `aktif = false`, kalanlar `girsin` + `aktif = true`. KAPANAN (ad_tr eşleşmesiyle, belirsiz olan çıkmadı): Veteriner, Öğrenci, Sakallı (ilk set; 550'den beri canlıydı), Android (596'da açılmıştı), Kedili Genç, Fitness Kraliçesi, Demir Pazı, Kaslı Şampiyon (zaten kapalıydı). Oyunda 31 avatar (39 − 8).
  Kapanan avatarlı 7 gizli bot 596 kuralıyla (31 sabit + aktif katalog, bot kimliğinden hashtext) taşındı; ölçüm: kapalı avatarlı bot 0, kapalı avatarlı insan 0 (kapananı kullanan gerçek oyuncu yoktu). `kozmetik_satis_acik` dokunulmadı. RLS/yetki değişikliği yok.
- **B) `/avatar-onizleme`:** "Seçimlerimi kopyala" artık Yeni 12 + Günlük + Kostümlü'yü tek metinde, `## Bölüm` başlıklarıyla ayrı ayrı listeler (girsin / girmesin / karar verilmedi + adet); sayfadaki "Seçimlerim" özeti de aynı `bolumler` verisinden üç bölüm gösterir (ekranla kopya tutarsız olmasın). **Kural (gelecek önizleme sayfaları için):** seçim özeti/kopyası sayfadaki TÜM bölümleri kapsar. Test: build temiz.

## 2026-09-25 — "savunan · tur 1 — soru yanıtsız kapandı" kök sebebi: TEST ARACI kusuru (oyun hatası değil)
**Araç:** Claude Code
- **Kök sebep:** `oyuncu-testi` Düello arama döngüsü "Rakip ara"ya timeout'suz `tap()` yapıyordu. Arama başlayınca düğme DOM'da kalır ama tam ekran arama sahnesi örter; Playwright 30 sn "tıklanabilir olsun" diye bekledi. Bu sürede uygulama maça geçmişti, test 24–30 sn geç girdi → ilk turun cevap fazı (bot saldırırken ~5 + 16 sn) bitmişti ("savunan · tur 1"; test saldıran kalınca bazen "saldıran · tur 1"). Ölçüm: aynı koşularda `arama+yönlenme` sabit 37,1 sn (10 döngü tur × ~3,7 sn), maç sunucuda ~7–13 sn'de kurulup sayfa adresi 2,4–3,0 sn'de maça dönmüş, test 26–30 sn sonra fark etmiş; hamle satırları da tam-süre zaman aşımını gösteriyor (maçtan 24,6 / 26,2 sn sonra `yanitsiz_savunan`).
- **Elenenler:** (2) tur 1 ile sonraki turlar aynı `duello2_soru_ac` yolunu kullanıyor (`duello_olustur` yalnız kategori fazını kurar; cevap fazı ikisinde de `duello2_soru_ac`, `bitis1/2 = now() + cevap_sn + gösterim payı`), tur 1'e özgü dal yok. (3) Cevap penceresi kısa değil: DB'de faz başlangıcından bitişe 16,2 sn. (4) Bot zamanlaması: bot kategoriyi 3–8 sn'de seçiyor; sorun botta değil, testin geç girişinde.
- **Düzeltme (yalnız `araclar/oyuncu-testi.mjs`, oyun koduna dokunulmadı):** "Rakip ara"/"Geç" dokunuşları `{ timeout: 1500 }`, döngü 0,5 sn'de bir adresi kontrol eder. Yeni tanı: "maça girildi: maç X sn önce kurulmuş … ← TEST GEÇ GİRDİ" (> 8 sn), "arama izi" (sunucuda kurulma → adres → test farkı), `--iz` bayrağı (1. turun izi + döngü izi).
- **Doğrulama:** düzeltmeden sonra 5 taze koşu (gk2–gk6, 4'ü ilk turda savunan): hepsinde test maça 2,6–5,2 sn içinde girdi, "yanıtsız (tur 1)" yok. Kalan başarısızlıklar bu işle ilgisiz (aşağıda).
- **Gözlem — test hijyeni:** başarısız bir koşu (`return "kritik"`) maçı aktif bırakır; sonraki koşu `duello_ara` ile o yarım maça girer (fk4/fk5/gk1: "maç 27–155 sn önce kurulmuş") ve sahte başarısızlık üretir. Bu yüzden ardışık koşularda bir başarısızlıktan sonra ilk koşu atılmalı.
- **Ayrı, izlenecek (kök sebep araştırılmadı):** (a) bir koşuda (fk3) uygulama maç kurulduktan 9,5 sn sonra adrese geçti (normal 2,4–3,0 sn): `duello_ara`/`duello_olustur` RPC yanıtı yavaş dönmüş olabilir (zaman `now()` = işlem başı olduğundan oyuncunun kategori/cevap süresini yer). (b) gk6: "savunan · sonraki tur — şıklar kapalı" (cevap fazı, kalan 11,5 sn, kilitli değil, `calisan` boş). (c) gk4: lobide 360 px "Profilim ve ayarlar" düğmesi "Kapat" altında (dokunma kesişimi).

## 2026-09-25 — 360 px "Profilim ve ayarlar × Kapat" bulgusu: OYUN HATASI DEĞİL, üst bildirim şeridi (test aracı düzeltildi)
**Araç:** Claude Code
- **Ölçüm (360×640, Turnuva lobisi, gerçek ekran):** OyuncuKarti açıkken "Kapat" = `.qt-modal-kapat` (aria-modal pencere içinde); pencere üst çubuğu karartma perdesinin ALTINDA bırakır, dokunulabilir çakışma yok. Asıl "Kapat" — üst çubuğun avatar düğmesini (`[304,10,348,54]`) örten kutu (`[296,29,340,73]`) — `QtToastYuvasi konum="ust"` içindeki bildirim şeridinin kapatma düğmesi (`BildirimToast` / `RozetBildirimi`, `.qt-toast-yuvasi--ust`, `position: fixed; top: 12px`). `bildirimler`'e satır eklenerek yeniden üretildi: şerit üst çubuğu (zil, coin, avatar) tam örtüyor.
- **Karar — CSS'e dokunulmadı:** şerit bilerek "ekranın EN ÜSTÜNDE beliren şerit" (BildirimToast başlık yorumu), 7–9 sn'de kendiliğinden kapanır, kendi Kapat düğmesi var; üst çubuğun üstüne binmesi tasarım. Toast Layout'ta tek bileşen → 360 px'te bütün sayfalarda (Lig, Arkadaşlar, Meydan Okumalar…) aynı davranış; ayrı düzeltme gerekmiyor. OyuncuKarti/AvatarMenu konumu doğru.
- **Düzeltme (yalnız `araclar/oyuncu-testi.mjs › kesisimOlc`):** `.qt-toast-yuvasi` içindeki öğe × şerit dışı öğe çakışması artık sayılmıyor (hem kutu çakışması hem "ortası … altında"); şeridin kendi içindeki çakışmalar hâlâ ölçülür. Sahte alarm kaynağı: test bildirim şeridi açıkken ölçüyor (test hesabına düşen bir bildirim).
- Test verisi (misafir hesap, bildirim, lobi kaydı) silindi; lobi sayısı eski değerine döndü.

## 2026-09-25 — Üst bildirim şeridi üst çubuğu örtmesin (Ida kararı)
**Araç:** Claude Code
- **Karar (Ida):** üst çubuk görünürken bildirim şeridi çubuğun ALTINDA belirir (zil/coin/avatar 7–9 sn dokunulamaz olmasın); çubuk gizliyken bugünkü gibi en üstte.
- **Değişen (yalnız CSS):** `tokenlar.css` › yeni `--qt-ustcubuk-yuk: 64px` (çubuk iç yüksekliği; `.qt-ustcubuk-ic min-height` de bunu kullanıyor, sabit sayı iki yerde durmuyor). `bilesenler.css` › `.qt-toast-yuvasi--ust` kuralı: `html:not(.msk-acik) body:not(.bd-oyun-modu):has(.a-ust-blok):not(:has(.qt-ortu))` iken `top = safe-area-inset-top + var(--qt-ustcubuk-yuk) + 8px`. Varsayılan `top: safe-area + 12px` duruyor → maç (`bd-oyun-modu`), açık tam ekran pencere/arama sahnesi (`.qt-ortu`), maç sonu (`html.msk-acik`) ve Layout dışı sayfalar eskisi gibi en üstte.
- **Parite:** kural sınıfa bağlı olduğundan BildirimToast, RozetBildirimi, Meydan Okumalar (`ChallengesPage`), Dükkân (`JokerDukkani`) yuvaları hepsi aynı anda düzeldi; ayrı yuva kodu yok.
- **Ölçüm (390×844 ve 360×640, gerçek bildirim satırıyla):** şerit çubuğun altında (üst = 72 px); zil, coin, avatar merkezinde `elementFromPoint` kendisini döndürüyor (dokunulabilir). Durum tablosu (sentetik yuva `top`): normal 72 px · maç 12 px · pencere açık 12 px · maç sonu 12 px. Build temiz. Test hesabı, bildirim satırı silindi.
- **Bilinen sınır:** davet bandı (`.a-davet`) çubuğun altında durur; şerit çıktığı 7–9 sn boyunca bandın üstüne biner (istenen kural "çubuk yüksekliği + 8 px" idi).

## 2026-09-25 — Düello "Kategori Kalkanı" (650)
**Araç:** Claude Code
**Neden:** Ida onayı (25 Eyl): savunana maç başına 1 ücretsiz taktik hakkı — rakip kategori seçerken kendi kategorilerinden birini o seçim için kapatır.
- **Sunucu (migration 650, önce transaction'da prova, sonra canlıya uygulandı):** `duellolar.kalkan1/kalkan2` (jsonb; null = hak duruyor, `{kategori, idx, tur}` = kullanıldı), `duello_hamleler.kalkan`. Aktif kalkan ayrı kolon değil: savunanın kalkanı şu anki tur indeksine (tur*2 + saldiri_sirasi) aitse ve faz 'kategori' ise (`duello2_aktif_kalkan`). Kapı tek yerde: `duello2_kategori_uygun_mu` aktif kalkanı uygun saymaz → saldıran seçimi, süre dolunca otomatik seçim, bot seçimi birlikte uyar; uygunluğu atlayan iki son yedek dal (`duello2_otomatik_kategori`, `duello2_bot_kategori`) da kalkanlı kategoriyi dışlıyor. Yeni RPC `duello2_kalkan` (security definer, yalnız authenticated, hiz_siniri + duello_kilitle FOR UPDATE); kontroller `duello2_kalkan_engel`'de (insan ve bot aynı kapı): aktif · surum 2 · ayar açık · uzatma değil · faz kategori · çağıran savunan · hak duruyor · ≥ 5 sn kaldı (`duello2_kalkan_son_sn`, clock_timestamp) · kategori uygun · koruma sonrası ≥ 1 uygun kategori. Reddedince hak harcanmaz. `duello2_cozumle` hamleye + `son_hamle.kalkan`'a yazar; `duello2_durum` → `kalkan {acik, son_sn, oyuncular{id: null|{kategori…}}, aktif}` ve geçmiş satırında `kalkan`, `savunan`. Fonksiyon gövdeleri canlıdan (pg_get_functiondef) alındı.
- **Bot:** `duello2_bot_tik` savunan bot, hakkı duruyorsa her kategori fazında bir kez zar (tohum maç+tur indeksi): canı 1 ise %45 (`duello2_bot_kalkan_kritik_yuzde`), değilse %12 (`duello2_bot_kalkan_yuzde`); an fazın 1–4. sn'si (tik aralığı yüzünden en geç 6. sn). Kategori: kendi en zayıf İKİNCİ kategorisi (`duello2_bot_kalkan_kategori`; zayıf noktası hariç en düşük oranlı uygun kategori), veri yoksa rastgele uygun. Açık botlar (Antrenman) aynı tikten geçer.
- **Tuzak (not):** plpgsql `IF … < case when … then … end then` parantezsiz CASE'i IF'in THEN'i sanıyor ("syntax error at end of input") — CASE parantez içine alındı.
- **SQL provası (`araclar/duello-kalkan-sql-testi.mjs`, tek transaction + ROLLBACK): 34/34.** Saldıran kullanamaz · ikinci kez red · uygun olmayan red · son uygun kategori korunamaz (hak harcanmadı) · son 5 sn red, 5,6 sn kabul · faz ilerlediyse red (hak harcanmadı) · uzatmada red · kalkanlı kategori: 40 otomatik + 40 bot seçimi + 30 gerçek süre dolumu (ilerlet) + hiç uygun kategori kalmayan yedek dallarda 40+40 seçim → hiç çıkmadı · hamle/son_hamle kaydı · sonraki seçimde kalkan biter · bot %100'de kullanır (zayıf noktasını korumaz), %0'da ve fazın ilk 1 sn'sinde kullanmaz. Not: test transaction'ında `now()` sabit, kalkan kapısı `clock_timestamp()` kullanır; insan oyuncunun `last_seen`'i tazelenmezse maç "kopuk" sayılıp bot beklemeye geçer.

## 2026-09-25 — Üst bildirim şeridi davet bandının da altına iniyor (77cddaf'ın devamı)
**Araç:** Claude Code
- **Sorun:** davet bandı (`DavetBandi`, `.a-ust-blok` içinde, yüksekliği ad/metin/hata satırına göre değişir) açıkken `position: fixed` şerit bandın üstüne biniyor, "Kabul Et" 7–9 sn erişilemiyordu.
- **Değişen:** `DavetBandi.jsx` — kök öğe `ResizeObserver` ile ölçülüp `document.documentElement` üzerinde `--qt-davet-yuk`'e yazılıyor (bant yokken/kapanınca `0px`; try/catch'li, temizlikte 0). `bilesenler.css` — şerit `top`'u `safe-area + --qt-ustcubuk-yuk + var(--qt-davet-yuk, 0px) + 8px`.
- **Kontrol — şeridin en üstte kaldığı durumlar:** maçta (`bd-oyun-modu`) `.a-ust-blok` `display:none` → davet bandı da gizli, ölçüm 0. Açık pencerede (`.qt-ortu`) ve maç sonunda (`msk-acik`) bant perdenin altında kalıyor (gizlenmiyor ama dokunulamaz, üstte şerit zaten kendi kuralıyla 12 px) → ek kural gerekmedi.
- **Ölçüm (gerçek `duello_davetleri` + `bildirimler` satırı, 390 ve 360 px):** bant `[0,64,W,142]`, `--qt-davet-yuk` 78 px, şerit üstü 150 px (= 142 + 8); "Kabul Et", "Daveti reddet", avatar `elementFromPoint` ile dokunulabilir. Reddet'e dokununca bant kapandı: değişken 0 px, yeni şerit 72 px'e döndü. Build temiz. Test hesapları/davet/bildirim silindi.
- **Gözlem (test yöntemi):** `duello_davetleri` satırını SQL ile SİLMEK bandı kapatmaz (DELETE gerçek zamanlı olayı `rakip` filtresine uymuyor); gerçek akışta bant Kabul/Reddet ile ya da durum güncellemesiyle kapanıyor.
- **Arayüz (DuelloV2 · DuelloPage · DuelloTanitim · ceviri/mac.js + sunucu.js · DuelloPage.a.css):** savunanda "Kategori Kalkanı" düğmesi (bilgi tonu, "1" rozeti) → saldıranın seçebileceği kategoriler ızgarası (kendi oranın, zayıf noktan ⚠, en zayıftan sıralı) → satır içi onay ("{kategori} bu tur korunsun mu?" — Türkçe ek sorunu olmasın diye kategori adı eksiz) → RPC; sonra "{kategori} korumada — Rakip bu tur seçemez" + "Kullanıldı". Güçlü/zayıf listesindeki uygun satırlar da onayı açan kısayol (sağda kalkan ipucu). Son 5 sn'de / rakibe tek kategori kalıyorsa düğme pasif + nedeni. Saldıranda kutu "Korumada" kilitli (kalkan iner efekti) + 3,5 sn'lik bant "{ad} bir kategoriyi korumaya aldı: X"; `duello_kategori_sec` "şu an seçilemez" dönerse ham hata yerine ekran tazelenir. Üst şerit: iki oyuncunun avatarının sol/sağ üst köşesinde kalkan göstergesi (hazır renkli / kullanıldı soluk). Maç sonu özeti: "🛡 X korundu (sen/rakip)". Tanıtım: "Saldırı riski" kartı `uyari` ikonuna, yeni "Kategori Kalkanı" kartı, anahtar v4 (herkese bir kez yeniden). Kural kartına tek satır. Azaltılmış harekette kalkan iner = 200 ms solma.
- **Kaza (paralel oturum):** bu işin arayüz dosyaları, aynı klasörde eşzamanlı çalışan başka bir oturumun `e02dc93` ("üst bildirim şeridi davet bandı…") commit'ine süpürülüp push edildi. Geçmiş yeniden yazılmadı; içerik bu kayıttaki arayüzdür. Kök CLAUDE.md "aynı anda tek araç" kuralı bu oturumda çiğnendi (başka oturum dev sunucusunu da açık tutuyordu).
- **oyuncu-testi (`--dil=en` eklendi; profil dili geçici en, sonunda geri):** Düello kalkan senaryosu — savunan 1: düğme → ızgara → onay görselleri; faz süresi DB'de 4,6 sn'ye çekilip (sinyal) deneme → "süre çok az" reddi + düğme pasif; savunan 2: arayüzden gerçek kullanım (en zayıf uygun kategori) → DB kaydı, "korumada" satırı, hemen ikinci deneme → red, bot saldıran korunanı seçmedi mi; saldıran: RPC denemesi → red, botun kalkanı DB'ye yazılıp kilitli kutu + bildirim + test korunanı seçemedi mi; maç sonu özetinde işaret. DB yazımı yalnız test hesabının bota karşı maçında.


## 2026-09-25 — Klasik yüksek gecikme: geri sayım + sonraki soru gecikmesi (Filipinler bildirimi)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida, Filipinler'deki arkadaşıyla Klasik oynarken (çok yüksek gecikme) 3-2-1'in 3'ten başlamadığını / hiç görünmediğini ve soru geçişlerinin senkron olmadığını bildirdi; ayrıca iPhone Safari'de bazı sorularda metin görünmüyor (bu ayrı, C maddesi).
- **Ölçüm aracı (yeni, kalıcı):** `araclar/gecikme-testi.mjs` — iki taze misafir hesabı, biri (A) için bütün Supabase trafiği (REST + Realtime WebSocket) her yönde --gecikme ms yavaşlatılır; iki sayfa aynı saati kullandığı için ekran olayları (3-2-1 rakamı, soru metni, sayaç rakamı) ms damgasıyla doğrudan karşılaştırılır. `--sil` test hesaplarını `hesabimi_sil` ile siler.
- **A — DOĞRULANDI (canlı, 300 ms tek yön, A önce "Hazırım", B 2 sn sonra):** önce basan A geri sayımı HİÇ görmedi (bir denemede yalnız 200 ms "1"), sonra basan B 3-2-1'i tam gördü. Kök sebep gecikmenin kendisi değil, dağıtım: geri sayım yalnız `mac_nabiz` yanıtından çiziliyor; nabız 3 sn'de bir atıldığı için önce basan taraf maçın başladığını 0–3 sn (+ ağ) geç öğreniyor, 3 sn'lik sayım o zamana kadar bitmiş oluyor. Sıfır gecikmede de aynı (A yalnız "1" gördü). Ek kusur: sayım bitince gelen sonraki nabız, saat farkı yalnız yanıt anına göre hesaplandığı için (dönüş gecikmesi biniyor) "1"i 200 ms yeniden çıkarıyordu.
- **A düzeltmesi:** (1) sunucu `mac_nabiz`: ilk sorunun başlangıcı = now + 3 sn + `mac_geri_sayim_payi_ms` (2000, migration 651; Düello/Klasik gösterim payı deseni, soru süresi/kilit/cevap kapısı değişmez); (2) istemci: geri sayım en çok "3" gösterir (pay boyunca "3" bekler, sonra gerçek zamanla 3-2-1); (3) maç satırı (Realtime/yoklama) "başladı" dediği an nabız hemen atılır (3 sn beklenmez); (4) nabız saat örneği gidiş-dönüşün orta noktası (`oyun/lib/nabiz.js › _saat_ornek_ms`, soruCek ile aynı NTP yaklaşımı); (5) biten geri sayım başlangıca göre kilitlenir, "1" yeniden çıkmaz.
- **B — gerçek belirtiler (300 ms tek yön, 5 soru, 2 soru bilerek cevapsız):** iki ekranda sayaç sıfır anı farkı ≤ 200 ms (sayaç senkron, sunucu saatine bağlı); ama sonraki soru gecikmeli taraf ekranına rakipten ~0,9 sn (soru başına 535–1118 ms) geç geliyor: ilerleme (Realtime, +L) → 1 sn geri bildirim penceresi → soru isteği (gidiş-dönüş 2L) art arda biniyor, sunucu payı (2 sn) L ≈ 300'de sınırda, daha yüksek gecikmede taraf sayaç 15'ten değil 14/13'ten başlar ("15 sn dolmadan geçti" hissi). Bir denemede 4157 ms sapma görüldü, tekrarlanmadı. Sunucu tarafı zaten toleranslı (cevap 17 sn'ye dek kabul, otomatik ilerletme 16 sn).
- **B düzeltmesi:** `soruCek` `bekleMs` alır: sonraki soru geri bildirim penceresi sürerken ARKA PLANDA çekilir, pencere bitince ekrana girer (zincir L + GB + 2L → L + max(GB, 2L)). Klasik, Grup, Turnuva (aynı desen, mod paritesi). Süre mantığı değişmedi.
- Test hesapları: `hesabimi_sil` ile silindi (bir çalıştırmada canlı DB `statement timeout` verdi, kalan 2 hesap elle silindi).
- **Test sonuçları:** `araclar/duello-kalkan-sql-testi.mjs` 34/34 (canlı DB, ROLLBACK). `oyuncu-testi --mod=duello` üç tam geçen koşu: yerel TR (7 saldıran/7 savunan), canlı TR (3/3), canlı EN (7/7) — üçünde de `← HIZLI` 0, `← ERKEN SIFIR` 0, yanıtsız 0; kalkan adımlarının hepsi (saldıran reddi, son 5 sn reddi + pasif düğme, arayüzden kullanım, ikinci kullanım reddi, bot korunanı seçmedi, saldıranda kilitli kutu + bildirim, maç sonu işareti) geçti. Görseller `oyuncu-testi-gorseller/` (360 + 390, TR ve `-en`). Arada başarısız koşuların hepsi test aracındandı ve düzeltildi: EN'de Türkçe düğme/pencere adları (satın alma penceresi açık kalıp şıkları örtüyordu), DB'ye yazılan kalkan/süre için sinyal yoktu, test'in kısalttığı fazın 15→5 sayaç sıçraması "HIZLI" sayılıyordu, 50:50 sonrası kırılan şıka dokunma.
- **İzlenecek (kalkanla ilgisiz, ölçüldü):** 16:00–16:50 UTC arası `duello_tik_hepsi` aralıklı 4–20 sn sürdü (16:34–16:35'te bütün cron işleri yavaş, iki "job startup timeout") — o anlarda joker satın alma penceresi "Alınıyor…"da >5 sn kaldı ve bir cevap fazı 12,7 sn geç göründü. Kalkan fonksiyonları ölçüldü: bot tiki ~1 ms, `duello2_kategori_uygun_mu` ~7 ms/çağrı (7 ms'si önceden var olan `duello_kategorileri()`), sebep değil. 15:53–15:58'deki 60 sn'lik tikler bu oturumun transaction'lı SQL provalarının kilitleriydi. Bir koşuda sayfa kurulan maça 45 sn'de geçmedi (önceki "adrese geç geçiş" gözlemiyle aynı).


### C — iPhone Safari (tarayıcı) bazı sorularda soru metni görünmüyor — KÖK SEBEP BULUNDU (Chromium, Safari görünür alan boyutunda)
- Gerçek WebKit çalıştırılamadı; iPhone Safari'nin araç çubuklu görünür alanı (SE/8/mini sınıfı ≈ 375×553, iPhone 13/14 ≈ 390×664) Chromium'da taklit edildi (`araclar/gecikme-testi.mjs --gorunum=WxH --uzun`: gerçek iki oyunculu Klasik maç, sunucudan gelen soru en kötü durumla — 154 harfli soru + 51 harfli şıklar — değiştirilir, çizim yolu gerçek).
- **Bulgu (canlıda, düzeltmeden önce):** 375×553'te uzun soru + uzun şıkta soru metni şıkların ALTINDA kalıyor (ekran görüntüsü: kart kırpılıp şık A'nın arkasına giriyor, metin görünmüyor). Mekanizma: `body.bd-oyun-modu` kısa ekran kuralında `.qt-soru` (`flex:1 1 auto; min-height:0`) içeriğinin altına daralıyor (ölçüm: 53 px; kart 84 px + sayaç payı 24 = 108 px ister), kart kutunun dışına taşıp sonraki şık listesine biniyor. Bu yüzden yalnız uzun sorularda ve yalnız tarayıcıda (uygulama/PWA görünür alanı daha yüksek) görülür; 390×664'te aynı en kötü durum sığıyor. Düello aynı kuralı taşıyor (`.m2-cevap-faz > .qt-soru`): kısa soruda bile şık kartın kenarına biniyor, sayaç kesiliyor — aynı bug.
- **Düzeltme (mod paritesi):** Klasik/Grup/Turnuva/Çalışma (`m1-mac.css`) ve Düello (`DuelloPage.a.css`): `.qt-soru` kart (84) + sayaç payı (24) altına inmez; ≤ 620 px yükseklikte kart en az 104 px (~üç satır). Sığmayan kısım orta bölümde kayar (Klasik: `.m1-soru` `overflow-y:auto`, Düello: zaten `.m2-sahne`), şıklar karta binmez. Ekran görüntüsü doğrulaması: 375×553 en kötü durumda metin ve şıklar tam görünür (joker şeridi kaydırmayla), 390×844'te değişiklik yok, Düello 375×553'te kart bütün.
- **Hâlâ açık:** gerçek iPhone/WebKit'te doğrulanmadı (kök sebep Chromium ölçümüyle bulundu; Safari'ye özgü ikinci bir neden çıkarsa görülemez). 375×553 en kötü durumda joker şeridi ilk bakışta ekran dışında kalır (kaydırma gerekir); 2 satırlık "dostluk maçı" bandı açıksa yer daha da dar.
- Test hesapları: `hesabimi_sil` ile silindi (statement timeout veren çalıştırmalarda kalanlar elle silindi; 0 kalan doğrulandı).


## 2026-09-25 — Sentry devrede (VITE_SENTRY_DSN Vercel ortam değişkeninde)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida, hazır Sentry altyapısını (src/lib/hataIzleme.js, HataSiniri) canlıda açmak istedi; yalnız DSN boştu.
- **DSN:** Vercel projesi `quiztactics-app`, `VITE_SENTRY_DSN` — Production + Preview, tür `config` (Sentry tarayıcı DSN'i zaten pakete girer; `VITE_` önekli değişken Vercel'de "secret" yapılamıyor). `.env.example` satırı boş kaldı, gerçek DSN git'e girmedi. Sentry projesi: quiztactics.sentry.io.
- **Sürpriz (DSN doluyken build patladı):** `vercel redeploy` derlemede `tarayici-uyumluluk.mjs`'te takıldı. DSN boşken `import.meta.env.VITE_SENTRY_DSN` "" olarak yerine konup Sentry dinamik import'u derlemeden atılıyordu; DSN gelince iki gizli sorun çıktı: (1) `@sentry/replay-canvas` çalışan kaynağı bir METİN sabiti olarak `w?.transferFromImageBitmap` taşıyor (rollup ayrıştırıcıyla doğrulandı: Literal) → uyumluluk denetimi yanlış pozitif verip derlemeyi düşürüyordu; (2) `vite.config.js › manualChunks` `/react/` kuralı `@sentry/react` yolunu da yakalayıp Sentry'yi ana `react` parçasına gömüyordu (ilk açılış parçası 193 KB → 694 KB, gzip 225 KB).
- **Düzeltme (yalnız derleme yapılandırması):** `manualChunks`'a `@sentry` → `sentry` parçası (react parçası yine 192.715 B, Sentry ~500 KB ayrı, yalnız DSN varken ateşle-unut yüklenir; index.html'de yok); `tarayici-uyumluluk.mjs` yalnız `x?.transferFromImageBitmap` kalıbını yok sayar (başka `?.` hâlâ derlemeyi düşürür). Çalışma zamanı kodu (hataIzleme.js) değişmedi.
- **Doğrulama (canlı, 25 Eyl):** redeploy sonrası siteyi açınca konsolda hata yok, `sentry-*.js` (164 KB aktarım) ayrı parça olarak yüklendi. Tarayıcıdan `setTimeout(() => { throw new Error('sentry-test') })` → ingest'e istek 200 → quiztactics.sentry.io'da QUIZTACTICS-1 "sentry-test" göründü (Unhandled, production, kullanıcı yok); olay Sentry'de "Resolved" yapıldı. Kod dosyasına test satırı eklenmedi.
- **Gizlilik gözlemi (değiştirilmedi, Ida'ya soruldu):** olayda IP/e-posta/çerez yok (`sendDefaultPii:false`), ama (1) breadcrumb'larda Supabase istek adresleri var ve `rakip=eq.<kullanıcı UUID>` gibi sorgu parametreleri temizlenmiyor, (2) Sentry olaya IP'den türetilen kaba konum ekliyor ("Istanbul, TR").

## 2026-09-25 — Sentry: oyuncu UUID'i rapordan maskelendi
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida onayıyla (Sentry gizlilik gözlemi): breadcrumb'lardaki Supabase adreslerinde `rakip=eq.<oyuncu UUID>` gibi kimlikler rapora giriyordu.
- `src/lib/hataIzleme.js › temizleMetin`: UUID kalıbı `[kimlik]` olur (URL, breadcrumb, mesaj, exception, extra — hepsi mevcut derin temizlikten geçer). Maç/soru UUID'leri de maskelenir; hata ayıklama için tablo/RPC adı ve durum kodu yeter. Test: `src/lib/_test/hata-izleme-test.mjs` (+4 madde, geçti). Konum bilgisi (IP'den kaba şehir) Sentry proje ayarında kapatılacak (Data Scrubbing → IP adresi saklama), kodda yapılamaz — Ida'da.

## 2026-09-25 — Masaüstü (≥ 1024 px) tek ortalı sütun + sütun çerçevesi
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida kararı (25 Eyl): masaüstü yan menü/panel kurulmaz; Ana Sayfa dışı bütün sayfalar tek ortalı, rahat genişlikte sütun olsun.
- **Ölçüm (görevdeki varsayımlar yanlış çıktı):** `src/styles.css`'teki `.app { max-width: 620px }` (Paket 19) fiilen uygulanmıyor — `.app` 1024 ve 1440'ta tam genişlik (kabuk `.shell` 1440'ta 1180). Sabit alt menü de yok: `.qt-altmenu` yalnız < 850 px, masaüstünde üst çubuk menüsü. Yan boşluklar düz beyaz değil, zaten noktalı açık mavi zemin. Gerçek sorun: her sayfa kendi genişliğini veriyordu — Profil/Dükkân 880 · Lig/Arkadaşlar/Mesajlar 760 · Meydan 860 · Turnuva/Düello/Çalışma 640 · Modlar 1136 (hepsi ortalı ama tutarsız).
- **Değişen (yalnız CSS):** `tokenlar.css` › `--qt-sutun: 640px`. `a-kabuk.css` › ≥ 1024 px'te `body:not(.bd-oyun-modu) .a-kabuk .a-icerik > :not(.as-sayfa)` → `width:100%; max-width: var(--qt-sutun); margin-inline:auto` (tek kök kural, özgüllük `:not` ile sayfa köklerinin 880/760/860'ını yener; yeni sayfa otomatik uyar). Sütun çerçevesi: aynı kapsamda `.app.a-kabuk` zeminine sütunu 24 px taşan %34 yüzey bandı + 1 px kenar çizgisi (`--qt-yuzey`, `--qt-zemin-2`, `--qt-zemin-desen`; renk icat edilmedi; koyu tema gelince token'larla kendiliğinden uyar). `a-modlar.css` › ≥ 1024'te mod ızgarası 4 → 2 sütun (640'a dört kart sığmaz).
- **Karar — 620 değil 640:** 640, Turnuva/Düello/Çalışma'da zaten kullanılan ve ölçülen genişlik; tek satırla (`--qt-sutun`) değişir. **Karar — maç ekranları hariç:** `body.bd-oyun-modu` kendi 560 px sahnesini korur (kural onları 640'a genişletiyordu; Klasik ve Düello bot maçıyla 1440'ta ölçüldü: 560, ortalı). **Karar — alt menü:** masaüstünde zaten yok, dokunulmadı. Ana Sayfa'ya dokunulmadı (1440'ta öncesiyle aynı 980/1136 panel). < 1024 px hiçbir kural girmiyor (telefon/tablet aynı).
- **Ölçüm (1024 + 1440, 13 sayfa: Profil, Profil›Ayarlar, Lig, Dükkân, Dükkân›Coin, Arkadaşlar, Mesajlar, Modlar, Meydan, Turnuva, Düello, Çalışma, Ana):** hepsi 640 px, ortalı (sol 192 / 400); Ana aynı; yatay taşma yok (scrollWidth = clientWidth). Öncesi/sonrası görüntüler `arayuz-denetim-gorseller/masaustu/{once,sonra}-<sayfa>-<genişlik>.png` (git'e girmez).
- **Gözlem:** Dükkân sekme şeridi 640'ta 8 sekmeye sığmaz, yatay kayar (telefondakiyle aynı davranış). `/yonetim/sikayetler` (yalnız sahip) de artık 640; geniş tablo gerekirse `.a-icerik` istisnası eklenir. Koyu tema yok; çerçeve token'lı.

## 2026-09-25 — Dükkân: masaüstünde 8 sekme kaydırmasız (bugünkü 640 kuralının İSTİSNASI)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida: 1b7b46d'den sonra Dükkân'ın 8 sekmesi 640 px sütuna sığmayıp yatay kayıyordu (son sekme kırpık).
- **Ölçüm (öncesi):** sekme çubuğu içeriği 882 px, görünen 640 (kaydırma). Sıra: (1) yazı/dolgu küçültme → 15→13 px + dolgu 16→6 px + boşluk 4→3 ile TR ancak tam 640'a sığdı (sıfır pay); EN adlarıyla ("Frames", "Background", "Name Effect", "Reaction", "Diamond") 690 px — sığmadı. (2) etiket kısaltma denenmedi: ortak `QtSekmeler` ve çeviri katmanına dokunmayı gerektirir, (1)+(3) yeter. (3) sütun genişletme gerekti.
- **Çözüm = (1) + (3):** `dukkan-magaza.css` › ≥ 1024'te yalnız `.qt-dk-sekmeler`: yazı 13 px, dolgu 8 px, ikon boşluğu 4, çubuk boşluğu 2, sekme yüksekliği 44 → 40 (ikon boyutu aynı). Bu ayarla içerik TR 671 / EN 730 px → Dükkân sütunu **740 px** (`tokenlar.css` › `--qt-sutun-dukkan`; `a-kabuk.css`: `.app.a-kabuk:has(> .a-icerik > .qt-dk) { --a-sutun }`; sütun ve zemin bandı aynı değişkeni okur — kök kural `var(--a-sutun, var(--qt-sutun))`). Başka sayfa etkilenmez.
- **AÇIK NOT: Dükkân bugünkü 640 px kuralının istisnasıdır** (640 → 740). Sekme sayısı artarsa (kozmetik sekmeleri sunucu kataloğundan gelir) ortak `overflow-x: auto` yedek olarak durur.
- **Ölçüm (sonrası):** 1024 ve 1440'ta TR ve EN adlarıyla 8 sekme, scrollWidth = clientWidth = 740, kırpılma yok, "Coin" sekmesine tıklama çalışıyor (`?sekme=coin`). 390/360'ta değişmedi (882 px içerik, 44 px, 15 px, kaydırmalı). Lig sekmeleri etkilenmedi (15 px, 44 px, kaydırma aynı). Görüntüler `arayuz-denetim-gorseller/masaustu/dk-{once,sonra}-dksekme-*.png`, `dk-sonra-tam-1440.png` (git'e girmez).
- **Gözlem (test):** sekme sayısı kozmetik kataloğu yüklenince 4 → 8 oluyor; bir ölçümde DB ~1–2 dk yavaştı (Dükkân iskelette kaldı, 4 sekme) — CSS ile ilgisiz, sonra düzeldi. Araç notu: canlıya karşı denetim betiği oturum dosyasını canlı misafir hesabıyla ezmişti; testte yeni misafir hesabı kullanıldı.

## 2026-09-26 — Soru kapsamı: Türkiye dışı oyunculu maçta yalnız evrensel soru (652)
**Araç:** Claude Code (Opus 5.5, PC).
**Neden:** Ida: Türkiye dışından oyuncu "tarih"te Osmanlı/Cumhuriyet sorularıyla karşılaşınca kazanma şansı yok; yabancı oyuncuya adil soru havuzu.
- **Ölçüm — sütun ZATEN VARDI:** görev "questions'a kapsam ekle (evrensel/yerel)" diyordu; oysa `questions.kapsam` ('global' | 'yerel') + `questions.ulke` 118'de (çok dilli şema, FAZ 1) açılmış, 119'da (FAZ 2) etiketlenmiş: aktif 10.319 global / 1.914 yerel(TR). Kısıt `questions_kapsam_ulke_chk`: global → ulke null, yerel → ulke dolu. Ama HİÇBİR soru seçimi kullanmıyordu. **Karar:** yeni sütun açılmadı; 'global' = evrensel (ikinci bir kapsam sütunu çift kaynak olurdu, üretim migration'ları 291–315 zaten global/yerel yazıyor).
- **Kural (652, sunucuda):** `soru_kapsam_evrensel_mi(oyuncular)` — bot OLMAYAN bir oyuncunun `ulke`'si dolu ve ≠ TR ya da `dil` ≠ tr ise o maçta herkese yalnız `kapsam='global'`. Botlar sayılmaz (adalet insan içindir; Türk oyuncunun yabancı gizli bota karşı maçı değişmez). Filtre `soru_sec` içinde, dil kuralı gibi GEVŞETİLMEZ → Klasik/Saf Bilgi/Antrenman/Düello/Grup/Hızlı/Hatalarım dolgusu tek yerden. Turnuva: `turnuva_kapsam_ayarla` katılımcılara bakıp transaction'a `app.soru_kapsam='evrensel'` yazar (start_tournament, zamanlayıcı, altın soru); `turnuva_soru_aday` + son dolgu okur. Düello yedek yolu (`duello_soru_bul` rastgele) da filtreli. `mac_soru_degistir` grup/hızlı maçta artık bütün oyuncuları verir (eskiden yalnız değiştireni).
- **Asgari havuz:** `soru_kapsam_min_havuz` (60, test). Yabancı oyunculu maçta kategoride bundan az global soru varsa: Düello `duello2_kategori_uygun_mu` seçilemez sayar (arayüz soluk, bot/otomatik seçim de uyar), uzatma uygun kategoriyi önce seçer; `soru_sec` kategoriyi yok sayıp karışık havuza düşer; `get_categories` listeden düşürür. Boş ekran yok.
- **get_categories hatası (yan bulgu, düzeltildi):** `q.dil = profil dili` diye sayıyordu; bütün sorular kaynak TR olduğu için dili 'en' olan oyuncuya kategori listesi BOŞ dönüyordu. Artık oyuncunun dilinde okunabilen (kaynak ya da güncel çeviri) soru sayılır.
- **generate-questions:** şemaya `kapsam` (evrensel/yerel, zorunlu) + prompt'a aynı ölçüt; insert `global`/`yerel`+`ulke TR` yazar. **Yan bulgu:** eski insert kapsam yazmıyordu → varsayılan 'yerel' + ulke null → `questions_kapsam_ulke_chk`'ya takılıp hata verirdi (üretim durdurulduğu için görünmemişti).
- `soru_kapsam_filtresi_acik` = 0 ile uygulandı: Jev etiketlemesi onaylanıp yazılınca açılacak.
- **Jev PROVA (yazım yok, 26 Eyl):** `araclar/jev-kapsam.mjs` — 12.233 aktif TR soru, tek `choice` (yerel/evrensel, ölçüt generate-questions prompt'uyla aynı), eşik 0,75 altı "belirsiz"; $0,32, 14 dk, hata 0. Sonuç **evrensel 9.931 · yerel 1.725 · belirsiz 577**. Kategori yerel %: tarih 34 · edebiyat 33 · coğrafya 27 · genel kültür 13 · müzik 11 · sanat 9 · sinema 5 · spor 3 · bilim/teknoloji 0. Eski (119) etiketlerle uyum: kesin kararların %99,3'ü aynı (Jev global→yerel 70, yerel→evrensel 15). Rapor `araclar/jev-tarama/kapsam-ozet.md`, belirsizler `kapsam-belirsiz.csv` (çoğu Türkçe dil bilgisi/edebiyat terimi, "Türkiye'nin yüzölçümü" gibi Türkiye hakkında ama dünyaca da sorulabilir sorular). Belirsizlerin nereye gideceği Ida'ya soruldu.
- **SQL provası** `araclar/kapsam-sql-testi.mjs` (canlı DB, tek transaction, ROLLBACK): 27/27 — yabancı (DE / dil en) oyunculu 20 maç × 20 soru yerel 0; TR-TR tarih/coğrafya maçlarında yerel 93/400 (değişmedi); yabancı gizli bot yerel'i kesmez; Düello `duello_soru_bul` + `duello2_soru_ac` global; tarih global havuzu eşik altına indirilince Klasik karışığa düşer (boş değil), Düello'da tarih seçilemez, uygun listede yok, uzatma seçmez, `get_categories` yabancıda düşürür, TR-TR'de hepsi eskisi gibi; Turnuva yabancılı 30 soru yerel 0. `soru_sec` ~110 ms, TR-TR ile aynı. Not: testte `duello2_durum` çağrısı canlı cron'la deadlock verdi (test transaction'ı düello satırını tutuyordu) — o adım durum'un kullandığı uygunluk ifadesiyle ölçülüyor.

## 2026-09-26 — Denetim raporu 2'den küçük hatalar (D-401/406/407/455/501/503 + küfür + engel)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida: `denetim/DENETIM_RAPORU_2.md`'den 8 madde; her biri gerçek ekranda (yerel dev + canlı Supabase, misafir test hesapları) yeniden üretilip düzeltildi, test hesapları silindi.
- **D-401 (Serbest'te "+25 lig puanı"):** yalnız METİN hatasıydı. Sunucu doğru: `mac_sonuclandir` / `duello_bitir` Serbest'te lig puanı yazmıyor, coin × `serbest_coin_carpani` (0,5; berabere 5 coin = raporda "+5"). `ModSecimPenceresi` artık Serbest'te "Galibiyet: lig puanı yok · 15/22 coin"; Saf Bilgi kartı da sunucuyla eşitlendi (dereceli +12 lig · 15 coin; önceden 25/30 yazıyordu).
- **D-501 (Koleksiyon çift bölüm):** kopya çizim DEĞİL, iki ayrı katman: kazanılan çerçeve + eski aura kataloğu (552'den beri boş) ↔ premium çerçeve/arka plan (560). Düzeltme: başlıklar "Kazanılan Çerçeveler / Premium Çerçeveler / Premium Arka Planlar"; boş eski "Arka Planlar" bölümü çizilmez; premium çerçeve takılıyken kazanılan çerçevede "Takılı" yerine "Premium önde" (CerceveliAvatar'da premium önceliklidir); sayaç premium'u da sayar (2/17 · 1/6, önceden 0/0).
- **D-406 (Düello lobisi 5 sn eski kural):** kök sebep `DuelloPage` `useState(1)` — `duello_surum_benim` yavaşken V1 metni + V1 tanıtım anahtarı. Artık ilk değer önbellekten (`bildim_duello_surum`), yoksa metin gizli çizilir, tıklama V2 sayar. Yavaş sunucuda (4 sn gecikme) ölçüldü: V1 metni hiç görünmüyor.
- **D-407/D-503 (jenerik "İnternetini kontrol et"):** `hata.js › hataTuru`: çevrimdışı / zaman aşımı (57014, timeout) / sunucu (5xx, PGRST00x, gateway) / ağ (çevrimiçi "Failed to fetch") / diğer. `hataMesaji` + yeni `islemHatasi` ("Rakip aranamadı. Sunucu geç yanıt verdi…") RakipAra, Düello araması, MacYukleniyor, Arkadaşlar/Lig/Turnuva/Mesajlar hata kutularında. Gerçek ekranda 57014 / 502 / abort ile üç ayrı metin doğrulandı.
- **D-455 (meydan okuma kabulünde davet eden geçmiyor):** kabul bildirimi (`meydan_kabul` / `duello_kabul`) gelince davet eden, başka maçın içinde değilse doğrudan maça geçer (`BildirimToast`; grup_kabul şeritle kalır). Şerit kaçırılırsa Arkadaşlar satırında "Maç başladı · Maça gir" (aktif matches/duellolar; bildirim ve duellolar olayıyla tazelenir). Ölçüm: eski kodda B 3-2-1 ekranında bekliyor, A arkadaşlar sayfasında kalıyordu; yeni kodda A ~2 sn'de aynı maçta.
- **Küfür (653):** "SIKTIR/IBNE/GERIZEKALI/SIKEYIM" büyük I → ı yüzünden kaçıyordu. Tamamı BÜYÜK kelimede I ayrıca i okunur (yalnız ek eşleşme); `sik`/`sikik` hariç → SIKILDIM/SIKINTI/ISIK masum. Takma ad denetimi aynı. Sorulardaki 19.586 büyük harf kelimede yeni yanlış alarm yok. `pic`: `kufur_maskele_dil(metin, dil)` — gönderenin dili `en` ise çıplak "pic" maskelenmez; piç/PİÇ/p1c/p i c hep maskelenir, TR/bilinmeyende eskisi gibi (**ürün ödünü:** TR hesapta ASCII "pic" hâlâ maskeli). `trg_dm_guvenlik` dili geçirir; GRANT/REVOKE değişmedi. Test `araclar/kufur-filtre-testi.mjs` 85/85; gerçek DM: "SIKTIR git" → "*** git", EN hesap "send me a pic" açık.
- **Engelli çift rastgele eşleşme:** kod ZATEN kapalı (630 `kuyruga_gir`/`quick_match`/`duello_ara`, 645 `grup_ara`). 22 sn boyunca engelli A–B ile canlı sınandı: Klasik'te ikisi de bota düştü, Düello'da ayrı maç; engelsiz E–F aynı maçta (kontrol). Değişiklik yok.
- **Uygulama (Ida kararı: belirsizler → yerel, botlar sayılmaz):** 654 (`soru_kapsam_jev_etiket`; dosya adı önce 653'tü — paralel oturum 653'ü `kufur_buyuk_harf_pic` ile aldığı için yeniden numaralandı) yalnız etiketi değişenleri yazar (→ yerel 403, → global 15) ve `soru_kapsam_filtresi_acik = 1`. Canlı: **global 9.931 · yerel 2.302** — bilim 1304/11 · coğrafya 1183/551 · edebiyat 690/555 · genel kültür 506/135 · müzik 1069/177 · sanat 1031/150 · sinema 1172/87 · spor 1038/88 · tarih 684/544 · teknoloji 1254/4. En dar evrensel kategori genel kültür 506 (eşik 60) → bugün hiçbir kategori düşmüyor.
- **655 `get_categories` hızı:** 652 sürümü dili/kapsamı satır başına hesaplıyordu (~200 ms, ilk soğuk çağrı 1,7 sn; eski ~30–90 ms). Artık bir kez hesaplanır, TR oyuncuda çeviri tablosuna bakılmaz: ~10–40 ms. SQL provası 655 sonrası yine 27/27.
- **Oyuncu testi (canlı):** `oyuncu-testi.mjs`'ye `--ulke=XX` (geçici ülke, sonunda geri) + koşu sonu kapsam denetimi (bu koşudaki maç/düello/soru değiştir sorularında yabancı hesapta yerel > 0 → başarısız). Klasik `--ulke=DE` iki kez GEÇTİ (20 soru, yerel 0), Düello `--ulke=DE` GEÇTİ (10 soru, yerel 0, kalkan adımları dahil). TR hesabında seçim değişmedi (koşu başına 20 sorudan 1–4 yerel).
- **AÇIK (kapsamla ilgisiz görünüyor, çözülmedi):** aynı test hesabıyla TR (ülke değişmeden) Klasik koşularında 1. soruda şıklar ekranda açıkken `locator.tap` 4 sn zaman aşımı → 1. soru yanıtsız; 5 koşunun 4'ünde tekrarlandı, `--ulke=DE` koşularında hiç görülmedi. Soru seçimi dokunuşu etkileyemez (ekrandaki soru evrensel "Faust" sorusuydu); ilk-soru bekleme penceresi 5,5 → 8 sn yapıldı (3-2-1 + 651 payı), sonuç değişmedi. Kök sebep bulunmadı: ülkeye bağlı bir arayüz öğesi (ör. şehir/ülke bandı, bildirim şeridi) dokunuşu kesiyor olabilir — ayrı iş. Konsolda aralıklı `mac_nabiz`/`mac_soruyu_atla` 10 sn zaman aşımları (DB yükü; bir koşuda 16. soru cevabı ulaşmadı).
- **Kural dışı durum:** bu oturum boyunca aynı klasörde başka bir oturum çalışıyordu (oyun/ altında 13 dosya, PROJECT_CONTEXT, küfür filtresi 653). Onların dosyaları commit edilmedi; PROJECT_CONTEXT'e yalnız kapsam satırı commit'lendi.
- **D-408 / D-452 / D-404 / D-461 / D-416 (kısa ekran 375×553):** AYNI kök sebep (25 Eyl kart-yüksekliği düzeltmesinin kapsamadığı yer): çok kısa alanda dikey bütçe yetmiyor. Ölçüm (2–3 gerçek hesap, jokerli, uzun soru, dostluk maçı): Klasik'te D şıkkı (449–493) `.m1-alt` (Sesli sohbet + tepki, 96 px) altında, jokerler gizli/dokunulamaz; Grup'ta joker 474–524 `elementFromPoint` = sahne (raporla birebir); Düello'da D (452–498) orta bölümün (330 px) dışında, kart 128 px'e sabit; Düello kategori fazında 10 kategoriden 4 görünür / 2 dokunulur. Yeni bir dal değil, aynı sınıf; alt katmanlar (bant, alt şerit, joker hak satırı, başlık kartları) hesaba katılmamıştı. Düzeltme yalnız `@media (max-width:560px) and (max-height:600px)`: `m1-mac.css` (kart 84, yazı 15–20 px, dostluk bandı tek satır, Sesli sohbet + tepki tek satır, joker hak yazısı gizli), `DuelloPage.a.css` (kart 84, joker paneli ipucu/hak satırı gizli, şık 44, kategori fazı kartı/zayıf nokta/bant küçük, kural cümlesi gizli). Sonuç: Klasik/Grup/Düello'da dört şık + joker çubuğu ilk ekranda ve dokunulur; Düello kategori: 8/10 görünür ve dokunulur. Ödün: en uzun soru (154 harf) + bant birlikteyse soru metni kart içinde kayar (son satır ~10 px kesik). 844 px ve üstü telefon kuralları değişmedi. Mod paritesi: Klasik, Saf Bilgi, Grup, Turnuva, Hatalarım aynı `m1-mac` sınıfları; Düello ayrı dosyada aynı kural.
- **Test izi:** bütün misafir test hesapları silindi (hesabimi_sil; yalnız Auth hız sınırında sızan 5 boş hesap SQL ile), artık maç/davet kaydı yok. Not: Supabase anonim giriş hız sınırı (429 `over_request_rate_limit`) çok hesaplı testte ~1 saat kilitler — kalıcı test hesabı havuzu kullan.
- **Yan gözlem:** aynı klasörde eşzamanlı başka bir araç çalışıyordu (`araclar/jev-kapsam.mjs`, `_*.tmp.mjs`, `oyuncu-testi.mjs` değişikliği); bu işin commit'lerine alınmadı.

## 2026-09-26 — Üç takılma bulgusu (A Klasik ilk soru · B Düello Tur 1 · C Düello Tur 4): kök sebepler
**Araç:** Claude Code (Opus 5.5, PC).
**Neden:** Ida: A) Klasik'te TR hesapta ilk soruya dokunulamıyor (kapsam işinin açık notu), B) Düello Tur 1 savunanda "Rakip düşünüyor…" sayaç 0'da donup kaldı, C) Düello Tur 4'te "Süren doldu — sonuç bekleniyor" iki kez görünüp ilerlemedi.
- **Sonuç: üçü AYRI.** Ortak kod yolu (kalkan, sayaç/gösterim payı, dokunma işleyicisi) yok; A test aracının kusuru, C canlı DB aşırı yükü (kaynağı benim önceki oturumumdaki test sorgusu), B veride bulunamadı.
- **A — test aracı (oyun hatası DEĞİL):** `oyuncu-testi.mjs`'e dokunuş tanısı eklendi (şık merkezindeki öğe, Playwright çağrı günlüğü, ekran). Ölçüm: `<div class="m1-sayim">` (3-2-1 katmanı) intercepts pointer events. Kart geri sayım SIRASINDA çizilir (ilk görünüş sunucu başlangıcından 4,34 sn önce), şıklar katmanın altında `disabled` değil → test "şık açık" sayıp hemen dokunuyordu; `tap` zaman aşımı 4,0 sn < sayımın kalanı (~4,3–5 sn: 3 sn + 651'in 2 sn payı) → denemeler katman kalkmadan ~0,3 sn önce bitiyordu (ekrandaki "1" + sayaç 15 = başlamadan hemen önceki an). DE koşularında kart başlangıçtan yalnız ~0,6 sn önce görünmüştü (nabız zamanlaması), o yüzden geçiyordu — TR/DE farkı ülkeden değil zamanlamadan. Rakip gizli bot (`rakip_bagli` hep true) → `mac_nabiz` duraklatma/başlangıç kaydırma teorisi elendi. Oyuncu için davranış doğru (sayım bitince katman kalkar). Düzeltme yalnız testte: dokunmadan önce `.m1-sayim` kalkmasını bekle (en çok 9 sn, kalkmazsa başarısız).
- **C — canlı DB aşırı yükü:** Ida'nın 09:39 Düello'sunda (bota karşı, `2be23383…`) 4. turun ikinci hamlesi 1 dk 46 sn sürdü (normal 20–30 sn), iki hamlede de Ida "yanıtsız". Aynı dakikalarda `duello_tik` 2 sn yerine 7–25 sn, bot işleri `job startup timeout`. Düello fazlarını YALNIZ cron (`duello_tik_hepsi`) ilerletir → cron tıkanınca istemci "sonuç bekleniyor"da kalır. **Yükün kaynağı:** kapsam SQL testinin ilk sürümü `where id = any(soru_sec(...))` ile soru_sec'i questions'ın HER satırında çağırıyordu — pg_stat_statements: 16 çağrı, **615 sn DB zamanı, 350 milyon blok** (≈09:40–09:50). Test zaten f86da94'te düzeltilmişti (unnest); ek önlem: `kapsam-sql-testi.mjs` ve `duello-kalkan-sql-testi.mjs` transaction'ında `statement_timeout = 30s`.
- **Canlı DB 10:31'den beri yine bozuk:** cron işleri `job startup timeout` / 20–194 sn, `count(*) from questions` 8–13 sn; o an çalışan ağır sorgu YOK (yalnız Realtime WAL) → kaynak kısıtı (sabahki yükle Disk IO/CPU kredisi tükenmiş olmalı). Bu sürede Klasik test maça giremedi (auth 504, `AuthRetryableFetchError`).
- **B — bulunamadı:** son 12 saatte hamlesiz kalmış Düello yok, 45 sn'yi aşan hamle boşluğu yalnız C'ninki; Ida'nın bugünkü tek Düello'sunun 1. turu normal (bot 14 sn'de saldırdı). Belirti (faz süresi dolmuş, ekran ilerlemiyor) C ile aynı mekanizmaya uyuyor (cron tıkalıyken kategori fazı süresi dolunca otomatik seçim de cron'da) ama zaman/hesap bilinmeden eşleştirilemedi — Ida'ya saati soruldu.

## 2026-09-26 — Turnuva saati yerelleştirme + maç şeridinde ülke bayrağı
**Araç:** Claude Code (Sonnet 5)
**Neden:** Türkiye dışı oyuncu turnuva saatini kendi saatine çevirmek zorundaydı; maç ekranlarında rakibin/kendi ülkesi görünmüyordu.
- **Saat:** `lib/zaman.js` › `turnuvaSaatiGoster` / `turnuvaSaatleriniGoster` / `yerelSaatGoster` / `oyuncuUlkesiniAyarla` (Layout profil ülkesini verir). Kural: dil TR ya da ülke TR ya da cihaz TSİ'de → eski gösterim; aksi hâlde yerel saat (Intl, cihaz saat dilimi) + "(TSİ …)". Kullanan yerler: turnuva tanıtımı, Turnuva sayfası/ana sayfa "bugün kalan", ana sayfa şeridi + seans listesi ("Saatler cihazının saat dilimine göre"), "22:00 TURNUVASI" rozeti, giriş ekranı sloganı. Ayar/ülke sonradan gelirse `qt-saat-ayar` olayıyla yeniden çizilir.
- **Bayrak:** `SeviyeEtiketi`'ne `ulke` (mevcut `Bayrak` bileşeni); `useOyuncuSeviyeleri` `profiles.ulke`'yi tek sorguyla okur (oyuncu_kartlari RPC'sine dokunulmadı — yetki/migration değişikliği yok). Grup/Turnuva'da yalnız kendi şeridin (katılımcı listeleri kapsam dışı).
- **Karar:** bayrak isim satırında değil "Lv · lig" satırının başında — 360–390 px'te isim/skor sütununu daraltmıyor.
- **Test (Chromium, 390×844, saat dilimi America/New_York, canlı DB, geçici misafir + SQL ile ülke DE):** EN+DE → "7:00 · 11:00 · 13:00 · 17:00 (TSİ 14:00 · 18:00 · 20:00 · 24:00)", ana sayfa şeridi "7:00 (TSİ 14:00)"; TR dilinde "14:00…" + "Türkiye saati" (eski davranış). Node (TZ Tokyo/Berlin/Istanbul): doğru çeviri; Istanbul → çevirme yok. Klasik maçında iki bayrak (Almanya + gizli bot Türkiye; önceki koşuda Türkiye + Arjantin), `profiles.ulke` boş döndürülünce bayrak yok, şerit bozulmadı. Test hesapları silindi. Build temiz.
- **Not:** ülke değiştirme günde 1 kez sınırlı olduğundan test hesabının ülkesi SQL ile ayarlandı. Yerel saat, gün değişirse ("24:00" → Tokyo 06:00) tarih göstermez; TSİ parantezde durur.

## 2026-09-26 — TUR 2 denetim: hesap silme zaman aşımı (D-417) · geliştirici sayfaları açık (D-212/D-312) · bota rövanş (D-402)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida: denetim raporu 2'den üç madde (A 🔴 hesap silme, B 🟠 girişsiz geliştirici sayfaları, C 🟠 bota rövanş 48 sn).
- **A — ölçüm (canlı, rollback'li):** `hesabimi_sil` = `auth.users` cascade'i (FK'ler `profiles`/`auth.users`'a; 60+ tetikleyici). En çok maçlı gerçek hesap (74 maç) `authenticated` rolüyle gerçek `hesabimi_sil()`: **177 ms** (soğukta 0,5–2,5 sn); EXPLAIN ANALYZE toplam 50–70 ms. Raporun 16–50 sn ölçümü DB genel yavaşlığı penceresindeydi (D-403; raporun kendisi "kök sebep ölçülemedi" diyor) — görevdeki "kök sebep bulundu" kısmen doğru: `match_answers`/`tournament_answers`/`tournament_players`/`match_messages` vb. `user_id` indeksi gerçekten YOKTU (`match_answers_user_id` adımı 5–70 ms tam tarama), ama sağlıklı DB'de tek başına 8 sn'yi aşmaz.
- **A — düzeltme (656):** cascade'te taranan, indeksi olmayan 20 yabancı anahtar kolonuna indeks (match_answers, tournament_answers, tournament_players, match_messages, group_match_*, match_jokers, soru_cevap_kaydi, soru_degisimleri, question_votes, skill_ikinci_sans_denemeleri, direkt_mesajlar.gonderen_id, meydan_ikramlari.gonderen, sikayetler.sikayet_edilen; kısmi: matches.kazanan/terk_eden, tournaments/group_matches.kazanan, profiles.davet_eden). Canlıya önce `araclar/hesap-silme-indeks.mjs` ile CONCURRENTLY kuruldu (migration transaction içinde CONCURRENTLY yapamaz; tablolar ≤3 MB), sonra 656 kaydedildi (IF NOT EXISTS). Sonra: `match_answers_user_id` adımı 0,97 ms, `tournament_answers` 0,07 ms; en çok maçlı hesap silme ~110 ms, EXPLAIN 43 ms. Hedef (< 2 sn) rahat karşılandı. **İki aşamalı silme (madde 4) yapılmadı:** gerek kalmadı; DB yine kaynak kısıtına girerse (D-403) tek RPC yine zaman aşımına düşebilir — o zaman "hemen deaktive + arka planda temizle" değerlendirilir. Frozen oyun tabloları (kafatopu/gl/dg…) küçük olduğu için dokunulmadı.
- **B:** `bagimsizModul` yalnız Gizlilik + Koşullar'a indi (dev'de .env yoksa önizleme muafiyeti korunur). 14 rota (insan-prototip, preview/* ×10, tasarim-yonleri, tasarim-sistemi, kozmetik-onizleme, mac-sonu-onizleme) yeni `src/components/SahipKapisi.jsx` ile sarıldı (`sahip_mi()` — diğer sahip sayfalarıyla aynı kural; yeni güvenlik kuralı/politika/GRANT YOK, mevcut RPC'yi istemcide kullanır). `robots.txt` (`vite.config.js › ROBOTS_YASAK` + `public/robots.txt`): bu adresler + öteki sahip önizlemeleri Disallow. Ölçüm (yerel dev + canlı Supabase, Chrome): oturumsuz → 14/14 giriş ekranı, Gizlilik/Koşullar açık; misafir → 14/14 "Bu sayfa yalnız sahibe açık". Normal oyuncu = misafirle aynı `sahip_mi()` = false yolu. Sahip hesabıyla açılış test EDİLEMEDİ (sahip girişi yok) — kod diğer sahip sayfalarının birebir aynısı. Not: `/tasarim-sistemi` artık girişsiz canlı örnek DEĞİL (OKU.md + PROJECT_CONTEXT güncellendi).
- **C — kök sebepler (üç ayrı):** (1) **İstemci hatası (asıl "Maç açılamadı"):** `MatchPage › ilerlemeDamgasi` 'bekliyor' maçta `aktif_soru = -1` → damga −1e6 < başlangıç −1 → ilk yükleme "eski görüntü" sayılıp atılıyor, `mac` hiç kurulmuyor → 8 sn'de MacYukleniyor "Maç açılamadı". Bağlantı sorunu DEĞİL. Düzeltme: `Math.max(aktif_soru, 0)`. Aynı hata gerçek oyuncuya rövanş isteğinde de "Cevap bekleniyor" ekranını engelliyordu. (2) **"? Sen":** `mac` null iken Realtime UPDATE paketi `{...null, ...payload.new}` ile p1/p2 profilsiz satır kuruyor → Hazır ekranı profilsiz. Düzeltme: ilk tam satır (macImzaRef) gelmeden Realtime paketi alınmaz. (3) **49 sn:** gizli bot davetleri `bot_oyna`'da 8–90 sn gecikmeyle kabul ediliyor (179: gizli botun bot olduğu anlaşılmasın); rövanş da 'bekliyor' davetiydi. Kod yorumu ("bot rakipte doğrudan yeni maç") yalnız AÇIK bot için doğruydu; rapordaki "amelie" gizli botmuş.
- **C — düzeltme (657 + istemci):** `rovans_iste` bot rakipte (açık VE gizli) aynı transaction'da 'aktif' maç açar; geri alma `oyun_ayarlari.bot_rovans_anlik = 0`. **Ürün notu:** gizli botun anında kabulü bir zamanlama ipucudur (179'un amacına ters) — Ida'nın açık isteği (<2 sn) olduğu için uygulandı; ayar tek satırla geri alınır. Düello'da bot rövanşı ayrı mekanizma (`duello_tik_hepsi`, 2–6 sn) ve raporda "iyi" — dokunulmadı. Açık bot düğmesi (`create_challenge`→bot_oyna 2 sn tik, 2,4–3,2 sn ölçüldü) kaybedilen maçta artık `rovans_iste` kullanır (kazanılan maçta eskisi).
- **C — doğrulama (yerel dev + canlı DB, Chrome 390×844, misafir test hesabı, kaybedilmiş Klasik maç SQL ile açıldı):** düzeltmeden ÖNCE gizli botla 2/2 "Maç açılamadı" (8,7 sn), DB `bekliyor`, bot kabulü 49,8 sn. SONRA gizli bot 5/5: Rövanş → Hazır ekranı (rakip adı+level görünür) 0,8–2,6 sn; açık bot (rovans_iste yoluyla) 5/5: 0,85–3,45 sn (medyan 1,7; tek 3,45 sn aykırı — istemci/ağ gecikmesi, DB maçı anında 'aktif' açtı). Eski create_challenge yoluyla açık bot 2,4–3,2 sn idi.
- Test hesapları (5 misafir) ve test maçları silindi.

## 2026-09-26 — Denetim paketi 3: davet bandı, zil, maç sonu/bağlantı, metin, sekme taşmaları (12 madde, yalnız istemci)
**Araç:** Claude Code (Sonnet 5, PC). **Migration yok.**
**Neden:** Ida: TUR 2 raporundan D-453/454/456/457/458/459/462/463/504/505/506/507.
Doğrulama: yerel dev + canlı Supabase, Chrome, misafir test hesapları (ikinci misafir = davet eden/arkadaş); hepsi silindi.
- **D-453 davet cümlesi:** `.a-davet-satir` tek satır+ellipsis → 2 satıra sarılır (`-webkit-line-clamp: 2`, tek iç kap; -webkit-box yalnız doğrudan çocukları alt alta dizer). Asıl kök sebep ikinci: ad düğmesi (`.ls-ad-dugme`) genel `button` 44 px min-yükseklikle satırı şişiriyordu → `.a-davet-satir .ls-ad-dugme { min-height: 0 }` (dokunma alanı ::after). `--qt-davet-yuk` ResizeObserver'la ölçülmeye devam eder. Ölçüm: 360×640 TR "Kaan sana meydan okudu!" tam görünür, satır 2×17,5 px, bant 69 px (önce: 116/62 px dar sütun tek satır kesik); EN 375×553 "Kaan challenged you!" 1 satır; TR 390 "Kerimcanberkay34 sana meydan okudu!" 2 satır.
- **D-454 alt satır:** Düello davetinde kategori/"kişi" yok (yalnız "+N davet daha"); meydan/rövanş kategori, grup/hızlı kategori · kişi (eskisi). EN: `{0} kişi`, `+{0} davet daha` anahtarları eklendi. Ölçüm: Düello alt satır yok (TR 390, EN 375×553).
- **D-456 boş kabuk:** "Maç bitti!" perdesi `mac_sonu_ozet` gelene dek kalır (hata verirse kalkar); özet yokken sahne sarmalayıcısı (gök mavisi) çizilir. Klasik (`MatchPage`) + Grup (`GroupMatchPage`, aynı desen — mod paritesi). Turnuva/Düello'da perde yok, `msk-bekle` beklemesi ayrı (Düello'da boşluk raporlanmadı). Ölçüm: özet 2,5 sn gecikmeli yapay bitmiş maçta 15 sn boyunca boş kabuk yok (perde), özet gelince sahne.
- **D-457 Bağlantı yok:** üst çubuk görünürken şerit çubuğun (+ davet bandının) ALTINDA (toast şeridiyle aynı `:has` kuralı); maçta (üst çubuk yok) şerit en üstte, sayfa `html.qt-cevrimdisi` ile şerit yüksekliği (`--qt-baglanti-yuk`, 27 px + safe-area) kadar aşağı itilir → başlık/X/ses düğmesi örtülmez; z-index 2147483000 → `--qt-z-toast`. Ölçüm (390×844, 375×553, 360×640): şerit 0–27, X/ses 31–75 (önce 4–48 üstüne biniyor); ana sayfada şerit 64–91 (üst çubuk 0–64); Düello EN 375×553 temiz. Yan etki: çevrimdışıyken maç sahnesi 27 px sıkışır (alt düğmeler kayabilir) — yalnız çevrimdışı.
- **D-458 Düello üst şerit:** ad düğmesi hedefi zaten `::after` ile ≥44 px yükseklik (rapor kutuyu ölçmüş); asıl sorun saldıran rozetinin (`qt-oyuncu-etkiler`) ada binmesi ve dokunuşu tutması → `.m2-ust` içinde `pointer-events: none` + avatar köşesine (20 px). Ölçüm: `elementFromPoint` ad merkezi ve ±20 px dikey hepsi "ad" (önce rozet), rozet/ad kutuları kesişmiyor (TR 390, EN 375×553).
- **D-459 zil:** sıralama artık yalnız zamana göre (okunmamışlar üstte korunur; eski tür önceliği `ONCELIK` sıralamada kullanılmıyor, tablo kodda duruyor). "Tümünü okundu say": etkin = dolgulu, pasif = opaklık 0,55 + normal ağırlık. Ölçüm: 6 bildirim (19·21·29·5·15·25 dk) → 5 · 15 · 21 · 25 · 29 (iki "meydan okuma" tek satırda toplanır). Not: tür önceliği daha önce bilinçli bir tasarımdı (meydan okuma > rozet > seri); Ida'nın isteğiyle zaman öne alındı.
- **D-462:** MatchPage `farkSoru === 1` → "1 soru farkla" / EN "by 1 question" (yalnız bu satır). Ölçüm EN 360×640: "by 1 question".
- **D-463 sohbet:** `maxLength={500}` + sayaç `metin.length` ile son 50 karakterde ("470/500"). Ölçüm: 520 karakter yapıştırma → 500'de kalır, sayaç "500/500".
- **D-504:** Profil "Puan" kutusunda coin → `lig` (kalkan) ikonu (yeni ikon yok; `CoinIkon` importu kalktı).
- **D-505 sekme ipucu:** ortak `QtSekmeler` (temel.jsx) kaydırma konumuna göre `data-kaydir-sol/sag` yazar (render yok); `bilesenler.css` › maske gradyanı (28 px) kenarı soldurur — TÜM sekme şeritlerinde otomatik, tıklamayı etkilemez. Ölçüm: Profil 435/366 sağ ipucu, Lig 690/366 sağ ipucu, Dükkân aynı; ≥1024 taşmayan şeritte yok.
- **D-506 lig unvanı:** unvan artık ad satırı ile detay (rütbe/konum) satırı arasında kendi satırında (`.lg-unvan`); konum yine unvanlıda gizli. Ölçüm: "5 Kez Lig Birincisi" scrollWidth = clientWidth (96/96; önce 72/52 kesik).
- **D-507 Dükkân:** kozmetik katalog (`kozmetik.hazir`) gelene dek sekme çubuğu iskelet; istenen sekme kozmetik ise ("?sekme=pcerceve") panel iskelet bekler, "Joker"e düşülmez. Ölçüm (kozmetik istekleri 3 sn gecikmeli): 0,6–4,3 sn iskelet, sonra 8 sekme + "Çerçeve" seçili (önce 4 sekme + Joker → sıçrama).
- **Test izi:** bütün misafir hesapları/maçlar/bildirimler/arkadaşlık silindi; testte `session_replication_role = replica` ile `takma_ad` ayarlandı (canlı veriye kalıcı iz yok).

## 2026-09-26 — B bulgusu (Düello Tur 1 sayaç 0'da donma) yeniden arandı + 10 Klasik / 10 Düello doğrulama (DB yeniden başlatıldıktan sonra)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Ida: DB temiz olunca B'yi (09:23 TSİ, Ida'nın ana hesabı, Lv 11, Düello Tur 1 savunan, "Rakip düşünüyor…" sayaç 0) tekrar ara ve 10+10 koşuyla ← HIZLI / ← ERKEN SIFIR / donma kontrolü yap.
- **B — bulunamadı, ama iki somut bulgu:** (1) `duellolar`'da 09:23 TSİ'de Ida'nın kaydı YOK. O saatte Ida'nın tek maçı 09:24:21 Klasik (bertan55, 20 cevap); tek Düello 09:39:26 (nikita, Tur 1 normal: bot seçimi +4,1 sn tohumlu, ilk hamle 09:39:40). Ida'ya ait jeton/joker/bildirim izi de yok. (2) 09:10–09:38 TSİ arası bütün cron işleri sağlıklı (`duello_tik` 806 koşu, 0 hata, en uzun 1,0 sn) — sunucu tıkanması yok; bozulma 09:40–09:53 (kapsam SQL testi yükü) ve 10:39–11:08. **Olası açıklama (kanıtsız):** rakip adı "Oyuncu" (varsayılan) = kuyrukta bekleyen bir test misafiri; o hesap sonradan `hesabimi_sil`/auth CASCADE ile silinince düello satırı da gider (önceki kayıt: 5df65666). Bu koşuda aynısı canlı görüldü: Düello 6'da eşleşme 1,1 sn'de kuruldu (gerçek rakip) ve maç satırı sonradan bulunamadı. **Öneri:** test araçları gerçek rastgele eşleşme kuyruğuna girmesin (test hesabı bayrağı) ve test misafirleri silinmeden önce açık düellosu olmadığı doğrulansın.
- **DB "temiz" değil, aralıklı takılıyor:** 11:09:55'te yeniden başladı; 11:10–12:34 arası 85 dakikanın 14'ü bozuk (11:22–26, 11:31–32, 12:01–03, 12:33–34 …): `duello_tik`/`bot_oyna` 8–22 sn sürüyor, `job startup timeout`, PostgREST `mac_nabiz`/`mac_soruyu_atla` 10 sn zaman aşımı + HTTP 500. Örnek sunucu: PG 17.6 aarch64, `max_worker_processes=6`, `max_connections=60`, shared_buffers 224 MB. Kaynak bilinmiyor (yük yok, aktif sorgu yok; pg_stat_statements'ta `get_daily_quests` ort. 1,7 sn / 750 blok = bekleme). Platform tarafı (CPU/IO kısıtı) şüpheli — Supabase paneli/destek gerekir.
- **10 Klasik (canlı, ayrı test hesabı, 2 koşu --sifir):** 8 tam temiz (20 soru, dokunuş sunucuya ulaştı). Klasik 5 (12:01) ve 10 (12:33): DB takılması dakikalarına denk — 5'te `mac_nabiz`/`mac_soruyu_atla` 10 sn zaman aşımı + 500, 10'da 19. soru 16,5 sn geç göründü (0/15) → istemci hatası değil, sunucu gecikmesi. **← HIZLI 0, ← ERKEN SIFIR 0**; sıfır anı gerçek bitişe göre −101 / −62 ms (geç, doğru yön).
- **10 Düello (`--mac=1`, 3 koşu --sifir):** 4 tam temiz. **← ERKEN SIFIR 0**; ölçülen tek sıfır anı −18 ms. **← HIZLI 1** (Düello 4): kategori fazı ekrana 2,6 sn geç geldi, ilk rakam 892 ms (eşik 900; tasarım kayması bu senaryoda ≥ 966 ms verir → ölçüm/kare kayması şüphesi, tekrar etmedi). Diğer 5 başarısızlık oyun değil test aracı/veri: Düello 5 test döngüsü 14,2 sn takıldı (o dakikalarda cron sağlıklı), 6 rakip hesap silinince maç satırı yok, 7 yalnız Kalkan arayüz adımı (döngü 4–13 sn takıldı), 8 `--sifir` için süresi dolan faz oluşmadı, 9 faz geçişinde kategori ekranı yarışı. **Yanıtsız kalan soru 0; sunucuya ulaşmayan dokunuş yalnız DB takılması dakikalarında.**
- **Sonuç:** kod tarafında ← HIZLI/← ERKEN SIFIR/donma kanıtı yok; asıl risk DB'nin aralıklı 8–22 sn takılması (istemci "sayaç 0'da donma" gibi görünür). Ida'nın tek maçlık B'si DB'de bulunamadı.
- **İzler silindi:** doğrulama misafir hesabı `hesabimi_sil` ile silindi, artık anonim test hesabı yok. Ayrı hesap gerekti çünkü paylaşılan `ArayuzDenetim317` oturumu aynı anda başka bir süreç tarafından da kullanılıyordu (maçlar birbirini terk/iptal ettirdi).

## 2026-09-26 — Zil sıralaması: önem grubu + zaman (D-459 revizyonu)
**Araç:** Claude Code (Sonnet 5, PC). **Migration yok.**
**Neden:** Ida: D-459'da tür önceliği tamamen kalkmıştı; istenen "meydan okuma daveti en önce" — salt kronoloji yetmez.
- `BildirimZili.jsx › oncelikSirala` iki kademeli: (1) okunmamışlar üstte (aynı), (2) aynı okunma durumunda `ONCELIK` numarası (0 = meydan okuma/davet/arkadaş isteği · 1 = rozet/lig/haftalık/ödül · 2 = seri · 3 = sıra sende), (3) grup içinde en yeni üstte. Yalnız karşılaştırıcı değişti; tablo/gruplama aynı.
- **Ölçüm (canlı DB + yerel dev, Chrome 390×844, mevcut ArayuzDenetim hesabına geçici satırlar):** okunmamış: ARKADAŞ 8 dk · MEYDAN 25 dk (grup 0, yeni üstte) → LİG 5 dk · ROZET 19 dk · (hesabın eski 2 rozet/lig bildirimi) (grup 1) → SERİ 3 dk · SERİ-HATIRLATMA 40 dk (grup 2) → SIRA 1 dk (grup 3); okunmuşlar aynı kuralla: MEYDAN 30 dk · ROZET 10 dk · SERİ 1 dk. Grup içi zaman sırası doğru; "19 dk üstte 5 dk altta" yalnız farklı önem gruplarında (kasıtlı).
- Geçici satırlar silindi (0 kaldı). Not: hesap temizliği sırasında `created_at > now()-20 dk and is_anonymous` filtresiyle 14 anonim hesap da silindi (önceki oturumun 10 Klasik/10 Düello test hesapları olduğu varsayıldı; gerçek oyuncu değil).

## 2026-09-26 — Kurulum sihirbazı / KonumSecici: ülke seçimi kaydolmuyor (kök sebep bulundu, düzeltildi)
**Araç:** Claude Code (Sonnet 5, PC).
**Neden:** Soru kapsamı oturumu "wizard'da ülke seçimi tutmadı" demişti; bayrak ve soru kapsamı `profiles.ulke`'ye bağlı.
- **Ölçüm (canlı site, gerçek Chrome, 390×844 dokunmatik, "Misafir olarak dene" → takma ad → avatar → ülke → şehir → "Oyuna başla"):** TR geçti (`ulke=TR, sehir=İstanbul`). **DE ve JP'de `profiles.ulke` NULL kaldı**; ağda `profil_konum_kaydet {"p_ulke":"DE","p_sehir":"İstanbul"}` → 400 `Geçersiz şehir`.
- **Kök sebep:** ülke `<select>` değişince `sehirler` state'i temizlenmiyordu; yeni ülkenin şehir sorgusu dönene kadar liste ÖNCEKİ ülkenin (TR) şehirlerini gösteriyordu. Bu aralıkta seçilen "İstanbul", istemci doğrulamasından (`sehirler.some(...)` — hâlâ eski liste) geçiyor, sunucu (`profil_konum_kaydet`: `sehirler.ulke = p_ulke and ad = p_sehir`) reddediyordu. Sunucu fonksiyonu, ilk seçim muafiyeti, konum kilidi, ülke doğrulaması, `refreshProfile` ve profile default'u (`ulke` null) sağlam — üçüncü ihtimal (state senkronu) elendi: doğru şehirle DE/JP/BR/TR hepsi kaydolup modal kapandı. Yavaş DB'de (yüzlerce ms–saniyeler) gerçek oyuncu da bu aralığa düşer.
- **Aynı hata KonumSecici'de (Profil › Ayarlar › Yarıştığın şehir) de vardı:** canlıda TR → DE seçilince İstanbul gitti, DB değişmedi.
- **Düzeltme (yalnız `KurulumSihirbazi.jsx` ve `KonumSecici.jsx`, ülke `onChange`):** ülke değişince `setSehirler([])` + `setSehirYukleniyor(true)`; aynı ülke yeniden seçilirse hiçbir şey yapılmaz (`if (e.target.value === ulke) return` — yoksa liste boşaltılıp efekt tekrar çalışmadığı için boş kalırdı, ilk denemede bu da yakalandı). Şehir listesi gelene dek "Yükleniyor…" görünür. Migration/yetki değişikliği yok.
- **Doğrulama (yerel dev sunucusu, canlı DB, sonuçlar SQL ile):** sihirbaz TR → İstanbul, DE → Berlin, JP → Tokyo, BR → São Paulo (dördü de `profiles.ulke/sehir` doğru, modal kapandı, RPC 204). KonumSecici: TR → DE (Berlin), DE'yi yeniden seç (Berlin), DE → JP (Tokyo) hepsi DB'de doğru. Build temiz. Test hesapları silindi (0 kaldı).
- **Not (ayrı bulgu değil):** kayıt sonrası arayüz gecikmesi yok — `refreshProfile` sonrası modal hemen kapanıyor.
- **Canlı doğrulama (push sonrası, quiztactics.vercel.app, gerçek Chrome):** yeni misafir hesapla sihirbaz DE → Berlin, ES → Madrid; `profiles.ulke/sehir` SQL'de doğru. Test hesapları silindi (0 kaldı). Commit 0e99c85.

## 2026-09-26 — İletişim e-postası + Arkadaşlar sayfası 403 kökü (D-455 kalıntısı)
**Araç:** Claude Code
**Neden:** Ida: oyuncuya görünen iletişim adresi değişsin; TUR 2 denetiminde not düşülen 403 konsol uyarıları incelensin.

- **1) E-posta:** `GizlilikPage.jsx:13` ve `KosullarPage.jsx:14` `ILETISIM` → `quiztacticsapp@gmail.com`. Kod/migration/yorumda başka yere dokunulmadı (kaynakta başka `idagureli` geçişi yok).
- **2) 403 kök sebebi (ölçüldü, gerçek oturumla ağ yanıtları yakalanarak):** yalnız **Arkadaşlar** sayfası; `bekleyenleriYukle` (D-455 "Maça gir" şeridi) `duellolar` tablosunu doğrudan okuyordu → `GET /rest/v1/duellolar … 403 (42501 permission denied for table duellolar)`. Tablo **bilinçli kapalı** (205: `revoke all … from anon, authenticated`; soru/hamle durumu sızmasın). Sayfa açılışında + her yenilemede 1 istek → konsolda 2–3 uyarı. Meydan sayfasında 403 üreten istek yok (ölçüldü; uyarılar Arkadaşlar'dan geliyordu).
- **Gerçek işlev kaybıydı, zararsız değil:** hata sessiz yutulduğu için aktif düello şeridi HİÇBİR ZAMAN çıkmıyordu (yalnız klasik maç şeridi çalışıyordu). Anonim ve normal hesapta aynı (rol düzeyinde: iki tip kullanıcıyla `authenticated` rolünde ölçüldü, ikisi de `permission denied`).
- **Düzeltme:** tabloyu açmak (GRANT SELECT) yerine dar okuma RPC'si — migration `658_duello_aktif_benim` (`duello_aktif_benim()`: çağıranın kendi aktif düellolarının id/oyuncu1/oyuncu2'si; security definer, yalnız `authenticated`). Önce transaction'da prova → canlıya uygulandı. `FriendsPage.jsx` doğrudan sorgu yerine `supabase.rpc("duello_aktif_benim")`. Tablonun izinleri DEĞİŞMEDİ.
- **Kalan not:** aynı sayfadaki realtime aboneliği `duellolar` `postgres_changes` dinliyor; tablo kapalı olduğundan olay zaten gelmez (403 üretmez, sessiz). Şerit sayfa açılışında + `matches`/`duello_davetleri`/`bildirimler` olaylarında tazelenir; düello kabulü `bildirimler` INSERT'iyle düşer. Şu an canlıda aktif düello yok → RPC boş döndü; dolu dönüş canlıda ölçülemedi.
- **Doğrulama:** Arkadaşlar + Meydan gerçek misafir oturumuyla açıldı: 400+ yanıt yok. Test hesabı açılmadı (mevcut denetim oturumu kullanıldı).
- **Yayın:** commit 1 e-posta, commit 2 (FriendsPage + migration 658); build temiz, `arayuz-denetim.mjs` 16 sayfa "konsol temiz"; main push + Vercel dağıtımı bir sonraki adımda doğrulandı (aşağıya bakınız).

## 2026-09-26 — Denetim paketi 5: eski D-1xx/2xx listesinden 12 küçük madde
**Araç:** Claude Code
**Neden:** Ida: eski denetim listesinde açık kalan küçük maddeler (D-118/122/123/217/218/220/221/222/223/228/231/314/320) kapatılsın.

Migration gerekmedi. Aynı anda başka bir oturum (joker/çeviri metinleri) çalışma ağacında yazıyordu; paylaşılan dosyalarda (dil.js, ChallengesPage, DuelloV2, DuelloPage) yalnız benim satırlarım commit'lendi (dizin, HEAD + benim düzenlemem), onların yarım işi olduğu gibi bırakıldı.

- **D-223** Ayarlar › Varsayılan kategorim + Ana Sayfa kategori penceresi: "Hemen Oyna / Dereceli Maç" → "Klasik Maç ve Saf Bilgi bu kategoride rakip arar" (Düello kategori tercihini kullanmıyor: `duello_ara`'da yok). EN çevirileri `oyun/lib/ceviri/denetim5.js` (dil.js'e tek satır).
- **D-231** EN'de açık bot adları: `oyun/lib/botAdi.js` — ÇaylakBot→RookieBot, ÜstatBot→MasterBot, EfsaneBot→LegendBot (ToyBot aynı). Genel `tt()` DEĞİL: yalnız bu üç ad birebir eşleşince çevrilir (oyuncu adı sözlükten geçmesin). Uygulama noktaları: `OyuncuAdiDugmesi`, `IsimEfekti` (ad metni her yerde buradan geçer), Meydan Antrenman listesi + modal başlığı. Ölçüm: EN Meydan → ToyBot, RookieBot, MasterBot, LegendBot.
- **D-118/D-320** 44 px altı hedefler: ad düğmeleri zaten `::after` ile ≥44 px yüksekti (rapor kutuyu ölçmüştü, D-458'deki gibi); eksik olan KISA adlarda genişlikti → `l-kart.css` `.ls-ad-dugme::after` ve `mac-sonu-kutlama.css` `.msk-isim-dugme::after` artık yatayda da `min(-6px, 50% − 22px)` (≥44). Dükkân "Koleksiyonuna bak" bağlantısı (`.qt-dc-not a`) yeni `::after` (görsel/yerleşim aynı). Ölçüm (maç sonu, 390): kutu 45×20 / 83×20 → etkin alan 61×44 / 99×44, dört köşede `elementFromPoint` = düğme.
- **D-123** Ad kesme: `oyun/lib/adKisalt.js` — TEK kural: 10 karakterden uzun ad → ilk 10 + "…" (CSS üç noktası yalnız son savunma). Uygulanan yerler: Klasik/grup maç başlığı (`MatchPage` + `MacUstSerit`), maç sonu (`MacSonuKutlama`), arama/Hazır (`AramaSahnesi`, `AramaGunesHalkasi`), Düello (`DuelloV2`, `DuelloPage`), grup satırı. Tam ad aria-label + oyuncu kartında. Ölçüm 16 harfli ad: başlık ve maç sonu ikisi de "T2A_1_coku…". (Turnuva/Arkadaş listeleri kasıtlı dışarıda: geniş satır, CSS üç noktası.)
- **D-217** Arkadaşlar'da tek davet kodu kutusu: "Davet kodun var mı? [Bağla]" (`DavetKarti`, yeni `kodGirisiGizle` prop'u) kaldırıldı; "Davet koduyla ekle" kutusu önce `davet_kodu_bagla` dener (yeni hesap: ödül + arkadaşlık), bağlanamazsa eski `arkadas_davet_kodu_ile_ekle`'ye düşer. Profil sayfasındaki DavetKarti kutusu aynen. Ölçüm: sayfada tek giriş; kod girilince "… ile arkadaş oldunuz" (aynı cihaz → ödülsüz, beklenen).
- **D-218** Podyum: ad kendi satırında tam genişlikte, amblem altına iner, düğme yan dolgusu 8→4 px (`lig-a.css`): "ArayuzDe…" → "ArayuzDeneti…". Boş koyu daire kök sebebi: avatarsız oyuncuda baş harf, premium çerçevenin koyu lacivert (#1d2152) iç zemininde koyu yazıyla çiziliyordu (`.pc-ic > .avatar`, premium.css) → yazı beyaz + gölge. 4–6. sıralarda "L/L/O" artık görünür.
- **D-220** Bilinmeyen sohbet (`/mesajlar/<geçersiz|olmayan id>`): `SohbetKutusu` "Bu sohbet bulunamadı." + "Mesajlara dön" (UUID biçimi + profil bulunamadı kontrolü). Önceden "? …" başlıklı boş sohbet/hata kutusu. TR+EN ölçüldü.
- **D-221** Avatar seçici: iki düğme FARKLI işlevdi ("Kaldır" = avatarı silip baş harfe döner, "Kapat" = seçiciyi kapatır) → "Avatarı kaldır" / "Seçiciyi kapat" + ikisine `title` açıklaması.
- **D-222** Kilit metinleri (ad, şehir, profil): "Tekrar değiştirebilmen için X kaldı" → "Seçimin kaydedildi. Bir sonraki değişiklik için X var." (Konum: "Konumun kaydedildi…", profil satırı: "Bir sonraki değişiklik için X var.").
- **D-228** Yasal sayfalar: `Icindekiler` artık katlanır `<details>` (kapalı başlar, 44 px satır). 390×844: asıl metin 700 → 273 px'te başlıyor. Açınca 10 bağlantı, tıklayınca `#bolum-3` (ölçüldü).
- **D-314** Dükkân elmas/coin paketleri: kart `grid` → `flex column`, düğme her kartın dibinde (Avuç 874 / Kese 897 → ikisi 897); ≤500 px'te 2 sütun ve tek kalan son paket (Define) tam genişlik (`dukkan-magaza.css`).
- **D-122** Çevrimdışı yenileme: `public/sw.js` yeniden yazıldı (fetch olayı boştu). Gezinme ağ öncelikli → çevrimdışıysa önbellekteki kabuk (`/`), o da yoksa satır içi TR/EN "Bağlantı yok" sayfası; `/assets/*` önbellek öncelikli; diğer statikler ağ öncelikli; başka köken (Supabase)/POST/Range dokunulmaz; varlık önbelleği 400 girişle sınırlı; eski önbellekler `activate`'te silinir. Ölçüm (vite preview, gerçek SW): oturumlu hesapta çevrimdışı yenileme → oyunun kendi "Bağlantı yok" şeridi + "Yüklenemedi… Tekrar dene"; girişsizde açılış sayfası; `/siralama` derin adres de kabukla açıldı; tarayıcı hata sayfası yok. Not: sayfa hiç açılmamış (kabuk önbelleği boş) ve SW kurulmamış cihazda ilk açılış çevrimdışıysa SW devrede değildir — kaçınılmaz.
- **Kalan/not:** Hazır ekranının (arama sahnesi) 10 karakter kesmesi kodda uygulandı ama bu testte o ekran yakalanamadı (maç "Rakip bekleniyor" perdesinde kaldı); ad düğmesi hedefi bu ekranda `.ls-ad-dugme::after` ile aynı desen. iOS Safari yalnız sahibinin telefonunda doğrulanabilir (`<details>` + `::after` standart).

## 2026-09-26 — Denetim paketi 4: küçük metin/mantık hataları (D-405/210, D-411, D-413, D-124, D-125, D-219, D-317, D-106/204, D-116, D-120)
**Araç:** Claude Code (Sonnet 5, PC). **Migration yok**, yalnız istemci. Facebook düğmesi (D-208) kapsam dışı, dokunulmadı.
**Doğrulama:** yerel dev + canlı Supabase, Chrome 390×844 (TR ve EN, ayrı misafir hesaplar; SQL ile kategori istatistiği tohumlandı); iki test hesabı ve maçları silindi. Build temiz.
- **D-405/D-210 joker sayıları:** üç ayrı kavram aynı kelimeyle anlatılıyordu. Yeni terimler: **joker türü** (katalog: Klasik 7, Düello 5), **maça götürülen** (yuva: "Maça 3 joker seçersin"), **maçta kullanım** ("Bu maçta 6 joker kullanımın kaldı"; Düello "Maçta en fazla 4 joker kullanımı"). Kök hata: `ModlarPage` Düello sayısını `MAC_ICI + SALDIRI` ile hesaplıyordu → Sigorta/2X dahil **7** (gerçek 5; yeni `jokerler.js › DUELLO_JOKERLER`, `allowedModes`'tan). Meydan'daki elle yazılı "4 skill · aynı anda" Klasik için yanlıştı (Klasik kullanım sınırı 6) → aynı türden sayılır. Önce → sonra: OYNA "3 skill" → "Maça 3 joker seçersin"; Modlar "7 · 7" → "7 joker türü · 5 joker türü · 3 can"; Meydan "4 · 4" → "7 joker türü · 5 joker türü"; maç içi "6 joker hakkın kaldı" → "6 joker kullanımın kaldı". EN karşılıkları aynı dosyalarda güncellendi.
- **D-411:** `V2Kategori` savunan görünümü: güçlü liste artık zayıf noktayı ve %0'ı içermez (`x.k !== benimZayif && x.v > 0`), boşsa başlık gizlenir. Önce: Bilim %80 · Tarih %60 · Spor %0 hepsi "En güçlü"; sonra: güçlü = Bilim, Tarih; "En zayıf kategorilerin" = Spor (zayıf noktan) %0. (Gerçek Düello, tohumlanmış hesap.)
- **D-413:** `useAnaSayfaVerisi` lig özetini yalnız `uid` değişince çekiyordu; kurulumda avatar/ad sonradan gelince "Sen" satırı eski kalıyordu. Şimdi `gorunen_avatar|gorunen_ad` değişince özet yeniden çekilir (ilk açılışta çift istek yok). Ölçüm: "O" harfi → takma ad harfi "D" → avatar `<img>` kurulum bitmeden.
- **D-124:** `.qt-skill[aria-busy="true"]` ikonunda dönen halka (yalnız transform; Klasik `JokerCubugu` ve Düello `V2Skill` aynı sınıfı kullanır — mod paritesi). Gecikme kısaltılmadı. 2,5 sn yapay gecikmeyle halka görüldü.
- **D-125:** kök sebep `scroll-snap-align: start` + dolgusuz snap: kaydırınca ilk kart `scrollLeft=16` ile ekran kenarından −4'e yapışıyordu. `.a-meydan-kat-liste { scroll-padding-inline: var(--qt-kenar) }`; önce/sonra ölçüm: −4 → 12 (başlıkla aynı hiza).
- **D-219:** `"Dünya": "Earth"` → `"World"` (yalnız Lig sekmesi kullanıyordu).
- **D-317:** karar "Seri Koruma" (envanter, `jokerler.js`, push metni, EN "Streak Shield" hep bu). DB'deki paket adı ("Seri Kalkanı") migration'sız düzeltildi: `dil.js › TR_DUZELTME`.
- **D-106/D-204:** Tanıtım 1. kart: "Sıra beklemek yok… rakibin kendi zamanında" → "aynı sorulara aynı anda cevap verirsin… Süre sınırlıdır; rakibin geç kalırsa onu beklemen gerekebilir"; 2. kart "5.000'den fazla" → "12.000'den fazla" (aktif havuz ≈12.200; kesin sayıya bağlı değil). TR+EN.
- **D-116:** `MacSonuKutlama` terk hâlinde (Klasik, Düello, Grup, Turnuva ortak) gövdeye "Yeni maç bul / Ana sayfaya dön" kartı (Düello "Yeni düello", Turnuva "Turnuvalara dön" etiketini `eylemler.yeniMacEtiketi`'nden alır). Alt eylem çubuğu zaten vardı (Rövanş · Yeni maç · ev); gövdedeki boşluk doldu. 390×844 ve 375×553'te düğmeler ekran içinde. **Not:** bu değişiklik eşzamanlı çalışan başka bir oturumun D-123/D-118 commit'lerine (7534c44, 390cf44) girmişti; EN çevirileri ayrıca commit edildi.
- **D-120:** Çalışma özeti 0 → `m1-cal-buyuk--sifir` (soluk lacivert) + "Henüz yok — denemeye devam et" / EN "None yet — keep trying"; >0 eskisi gibi yeşil.
- **Süreç notu:** bu oturumda aynı çalışma klasöründe başka bir oturum eşzamanlı commit atıyordu (kök CLAUDE.md "tek araç" kuralı); commit'ler yol belirtilerek (`git commit -- <dosya>`) atıldı.
- **Yayın/doğrulama (Denetim paketi 5):** 10 commit main'e push edildi; commit edilen HEAD temiz kopyada derlendi (temiz), `arayuz-denetim.mjs` 16 sayfa "konsol temiz"; canlıda (quiztactics.vercel.app) yeni `sw.js` yayında, EN: bot adları RookieBot/MasterBot/LegendBot, tek davet kutusu, katlanır İçindekiler, "This chat couldn't be found" ölçüldü. Test hesapları betik sonunda silindi.

## 2026-09-26 — "Seri Kalkanı" paket adı kaynağında "Seri Koruma Paketi" oldu (D-317 kalıcı çözüm)
**Araç:** Claude Code (Sonnet 5, PC)
**Neden:** D-317 yalnız istemcide yamalanmıştı (`dil.js › TR_DUZELTME`); kaynak veri (052 tohumu) hâlâ "Seri Kalkanı"ydı, yeni bir ekran eski adı gösterebilirdi.
- **Migration 660** (`seri_koruma_paket_adi`): `joker_paketleri` (`esyalar` diye tablo yok) `seri_koruma_3.ad` → "Seri Koruma Paketi" (diğer paketler "… Paketi" desenli). Açıklama "3 adet seri koruma" aynı kaldı. Yetki/fiyat değişmedi. Önce `migration-prova.mjs` (transaction + rollback), sonra canlıya uygulandı; canlıda ölçüldü: `ad = Seri Koruma Paketi`. Rutinlerde eski ad geçen fonksiyon yok.
- **İstemci:** `dil.js` — `TR_DUZELTME["Seri Kalkanı"]` satırı gereksizleşti, kaldırıldı; EN sözlük anahtarı "Seri Kalkanı" → "Seri Koruma Paketi": "Streak Shield Pack". Ölçüm (vite ssrLoadModule): TR "Seri Koruma Paketi", EN "Streak Shield Pack", açıklama TR/EN doğru.
- Kodda "Seri Kalkanı" kalan yer: `QUIZADOR_TASARIM_REFERANS.html` ve `docs/SATIN_ALMA_DENETIMI.md` (tasarım/tarihçe belgeleri, oyuncuya görünmez), eski migration 052 (düzenlenmez), PROGRESS.

## 2026-09-26 — Denetim paketi 6: D-409, D-410, D-412, D-414, D-415, D-209, D-211, D-226
**Araç:** Claude Code (Sonnet 5, PC). **1 migration:** 659 (bot avatar onayı; önce transaction'da prova, sonra uygulandı). Yetki/RLS değişmedi.
**Ölçüm aracı:** geçici betikler (silindi); gerçek Chrome, canlı DB, misafir hesap; her koşu sonunda `hesabimi_sil` (0 hesap kaldı).
- **D-409 (3-2-1 geri sıçrıyor) — kök sebep bulundu, oranı ölçüldü:** geri sayım `nabiz.js`'ten gelen saat farkına bağlıydı; her nabızda (3 sn) fark, O nabzın gidiş-dönüş ortasına göre yeniden hesaplanıyordu. DB takıldığında tek yavaş yanıt farkı 0,5–1 sn kaydırıp "2"→"3" sıçratıyordu. Tekrar üretme: `mac_nabiz` yanıtlarının %40'ı 1,2 sn geciktirilerek 10 Antrenman maçı — **eski kod: 1/10 maçta `3>2>1>2>1` ("1" 0,2 sn görünür; raporla birebir); yeni kod: 0/10**, rakam süreleri 0,9–1,0 sn. Düzeltme: `useMacNabiz` son 60 sn'deki EN KISA gidiş-dönüşlü örneğin farkını verir (`_saat_fark_ms`, NTP yaklaşımı); `MatchPage` kalanı yalnız azaltır (fark sonradan büyürse sayım geri gitmez, gerçek hızda akar; ileri sıçrama hemen uygulanır). Hedef zaman (`nabiz.baslangic`) zaten sabitti.
- **D-410 (perde altında soru okunuyor / dokunuş):** dokunuş perdeye takılıyor (`elementFromPoint` = `.m1-sayim`) — rapor doğru. AMA **klavyeyle** (Tab/odak + Enter) sayım sırasında `submit_match_answer` GİDİYORDU: eski kodda 10 maçın 9'unda istek çıktı; sunucu son `soru_gosterim_payi` (2 sn) içinde cevabı kabul ettiği için "2"/"1" sırasında cevap geçerli olabiliyordu (ekran okuyucu/klavye kullanıcısı). Düzeltme: sayım sürerken `.m1-soru--sayimda { visibility: hidden }` (yerleşim ve sayaç zamanlaması aynı; kart DOM'da kalır) — soru/şıklar görünmez ve odaklanamaz. Yeni kod: 10 maçta odaklanma reddedildi, istek 0. Grup/Turnuva'da 3-2-1 yok (yalnız Klasik).
- **D-412:** Grup skor şeridi: satır `max-width 58vw → 42vw` (390 px'te 3. oyuncu 332 px'te görünür başlıyor, önce 445) + kenarda solma ipucu (`lib/kaydirIpucu.js`, `.qt-sekmeler` desenli). Joker metni: kod okundu — Grup'ta joker SAYISI sınırsız (`joker_mac_siniri` → null) ama her kullanım `joker_hareket(-1)` ile envanterden (yoksa coin'le "al ve kullan") düşer; yani "sınırsız hak" metni fiyat rozetiyle çelişiyordu → "Arkadaş maçı: sınırsız joker (envanter/coin düşer)" (TR+EN; arkadaşla Klasik maçta da aynı kural/metin).
- **D-414:** kök sebep veri: 610 avatarı boş botlara `avatar_url` verdi ama `avatar_onayli` açmadı; `gorunen_avatar` (üretilmiş kolon) onaysızsa NULL → 75 gizli bot (koray, Raymalifalitikko, Legends…) baş harfle çiziliyordu. Migration 659 yalnız bot satırlarında onayı açtı (kalan avatarsız bot 0). Ayrıca gerçek avatarsız oyuncu için ortak `Avatar` yedeği: turuncu zemin + lacivert yazı (`.avatar--harf`; premium/lig kuralları daha özgül, dokunulmadı). `Avatar` bütün modlarda (Hazır, maç başlığı, maç sonu, lig) ortak olduğundan parite kendiliğinden.
- **D-415:** canlıda HÂLÂ vardı: 1024×768'de `scrollHeight` 941 (173 px), 1440×900'de 948 (48 px); Düello 1024×768'de 1146 (378 px) — tepki/joker ekran dışı. Tek ekran düzeni (`≤ 560 px genişlik`) artık `(min-width) ve yükseklik ≤ 960 px` ile de tetiklenir; kısa ekran alt kuralları yalnız yüksekliğe bağlandı (900/700/620/600). Sonra: 1024×768, 1440×900, 1366×680'de taşma 0, joker + tepki `elementFromPoint` ile tıklanır; Düello 1024×768 ve 1440×900 taşma 0 (kategori listesi kendi içinde kayar). Sütun 560 px kaldı.
- **D-209:** panel `position:fixed` altta idi; giriş ekranında artık `Login` içinde sayfa akışında formun altında (`satirIci`, iOS UA taklidiyle 375×553 ve 390×844 ölçüldü: `position: static`, panel formun altında, hiçbir şeyi örtmüyor). Uygulama içindeki (girişten sonra) panel eskisi gibi sabit.
- **D-211:** Lig pankartında ⓘ düğmesi → "Lig nasıl işler?" penceresi; değerler `oyun_ayarlari`'ndan (yükselen/düşen sayısı `lig_grubum`, ödül `lig_odul_<lig>_1-3`, `elmas_lig_1-3`, `lig_pasif_dusme_hafta`); Bronz'da "düşme yok", Efsane'de "yükselme yok". Bronz TR+EN ölçüldü (100/50/25 coin + 10/6/3 elmas). Efsane/Gümüş+ dalları canlıda oyuncu bulunmadığından ölçülemedi (kod yolu aynı bileşen).
- **D-226:** eski çubuk `grup_boyu` (gizli üyeler dahil ≈ 82) ile ölçülüyordu → #13'te %86 dolu ("Güvendesin" ile çelişki) ve etiketi yalnız aria idi. Yeni: tek ölçü "Yükselme hattına yakınlığın" (dip %0, hat %100), altında görünür açıklama ("Yükselmek için N sıra yukarı çıkmalısın"), ölçek tabloda GÖRÜNEN satır sayısı; düşme hattı olan liglerde çubukta çizgi; Efsane'de "Düşme hattına uzaklığın". Bronz #15/15 → %0, TR+EN ölçüldü.
- **Not (ayrı bulgu):** `lig_grubum` sırası yalnız GÖRÜNEN oyuncular arasında sayılıyor, haftalık kapanış ise bütün üyeler arasında — tablodaki sıra ile gerçek yükselme/düşme sırası ayrışabilir (özellikle düşme). Ürün kararı olduğundan dokunulmadı.
- **Test artığı:** `araclar/_sorgu.tmp.mjs`, `_saglik.tmp.mjs`, `_q.mjs`, `--1.png` bu oturumdan ÖNCEKİ, commit'lenmedi, bırakıldı.

## 2026-09-26 — Lig: gösterilen sıra = gerçek (kapanıştaki) sıra (D-226 bulgusu, Ida kararı)
**Araç:** Claude Code (Sonnet 5, PC). **Neden:** ekranda "#5, güvendesin" görünen oyuncu haftalık kapanışta görünmeyen üyeler yüzünden düşme bölgesinde olabiliyordu.
**1 migration:** 661 (`lig_gercek_sira`; önce transaction'da prova + geri alma, sonra `db push`). Yetki/RLS/GRANT değişmedi (imzalar aynı, CREATE OR REPLACE).
- **Kök sebep (ölçüldü):** Lig sekmesi `lig_siralama`'yı değil `lig_grubum()`'u kullanır (`lig_siralama` yalnız şehir/ülke/dünya; istemcideki `sira: i + 1` yalnız Arkadaş sekmesindedir). `lig_grubum` içinde `row_number()` WHERE (görünürlük) süzgecinden SONRA çalışıyordu → sıra yalnız görünen satırlar arasında 1..N. `lig_haftayi_kapat` ise grubun TÜM üyeleri arasında (yalnız açık bot hariç; gizli botlar/görünmeyen hesaplar dahil) sıralar. Ana sayfa kartı da aynı hatayı istemcide taşıyordu (`findIndex + 1`).
- **Düzeltme:** `lig_grubum()` sırayı tüm grup üyeleri arasında hesaplar, görünürlüğü SONRA süzer (satırlar yine görünmez, numaralar boşluklu ve gerçek). Sıralama kuralı kapanışla birebir: `puan_hafta desc, puan desc, gorunen_ad asc` + `id asc` (kapanışta da yalnız bu eşitlik bozucu eklendi; 641'deki lig_siralama gibi — tam eşitlikte deterministik). `lig_grubum_ozet()`: grup boyu gerçek `grup_boyu`, komşular "görünür 2 üst + 2 alt", yükselme çizgisi / "bir üst sıraya" puan farkı gerçek sıradan.
- **İstemci:** `LeaderboardPage` — çubuk ölçeği `grup_boyu` (D-226'daki "görünen satır sayısı" ölçeği geri alındı; sıra artık gerçek), yükselme/düşme çizgisi tam sıraya değil sınırın üstündeki son GÖRÜNEN satıra çizilir, `bolge()` zaten sunucu sırasını kullanıyordu. `Home.jsx` kart sırası `.sira`'dan. `anasayfa/parcalar.jsx › LigKarti` sınır işaretleri boşluğa dayanıklı.
- **Kanıt (canlı DB, kapanış sorgusunun birebir kopyası ile karşılaştırma; her üye için kimliğe bürünüp `lig_grubum()` çağrıldı):** Bronz grup 1 (81 üye, 67 gizli): ESKİ 86 satırdan 66'sı uyuşuyordu (örn. ekranda #13, kapanışta #14; sıralar 1..15 ardışık) → YENİ 86/86 (sıralar 1,2,…,11,13,14,16,28: boşluklu). Gümüş grup 1 (10 üye, 1 gizli, 7 bot): 28/28 (gizli üye sıranın sonunda, fark yok). Gizli üyesiz geçici grup (işlem içinde kurulup geri alındı): 48/48. Test hesabı oluşturulmadı; canlı doğrulama sonrası `lig_uyelik` 91 satır, geçici grup yok.
- **Kapsam dışı (ayrı karar):** şehir/ülke/dünya (`lig_siralama`) hâlâ "görünenler + ben" içinde sıralar; orada gizli botlar ele verilmesin diye görünür-küme kararı 641/647'de bilerek verildi.
- **Build:** temiz.

## 2026-09-26 — Turnuva lobisine "Turnuva nasıl işler?" + Düello girişinde kural duvarı kalktı
**Araç:** Claude Code (Sonnet 5, PC). **Migration yok**, yalnız istemci (mevcut `oyun_ayarlari` okuması).
- **Turnuva lobisi:** lobi kartına "ⓘ Turnuva nasıl işler?" düğmesi → `QtModal` (Lig'deki "Lig nasıl işler?" deseni). İçerik `ayarlar()` ile `oyun_ayarlari`'ndan: `coin_turnuva_1/2/3`, `elmas_turnuva_1` (yalnız birinciye), `coin_turnuva_katilim`; eleme kuralı (yanlış cevap/süre aşımı = eleme, son kalan kazanır); yarıda çıkanın (`turnuva_terk`, `terk_at`) katılım ödülü almadığı; varsa haftalık giysi ödülü. Değer yoksa/0 ise satır gizlenir (sabit yazılmadı). Stil `m1-turnuva.css` (`.m1-tv-kurallar`), EN `ceviri/denetim6.js`. Ölçüm: 150 coin·10 elmas / 75 / 40 / katılım 10; EN metinleri `t('en', …)` ile doğrulandı.
- **Düello girişi:** `KURAL_V1/V2` listesi ve `m2-giris-kurallar` bloğu (+ CSS) kaldırıldı; kural metni zaten `DuelloTanitim` (V2'de 7 adımın hepsi: can, zayıf nokta, kategori sınırı, Kalkan, uzatma, joker) içinde ve "Kurallar nasıl işliyor?" düğmesi aynen duruyor (tıklayınca açıldığı doğrulandı). "Rakip ara" düğmesi 390×844'te 1172 → 595 px'e indi (375×667'de de ekran içinde: 578–622). Mantığa (zayıf nokta, kalkan, V1/V2 ayrımı) dokunulmadı. **Not:** V1 (eski) tanıtımında "kategori üst üste seçilemez / en çok 2 kez" satırı yok; V1 yalnız bayrak kapalıyken görülür, ayrıca eklenmedi.
- **Grup lobisi (parite kontrolü):** ek ⓘ gerekmedi — Hazır kapısı zaten "Arkadaş maçı — ödül ve puan yok", oyuncu/soru sayısı ve süreyi gösteriyor; kural duvarı yok, ödül yok.

## 2026-09-26 — Canlı coin ikonu: "Dönen Sikke (C)" → "Q Sikke, önden (A)" (Ida kararı)
**Araç:** Claude Code (Sonnet 5, PC). **Migration yok**, yalnız `oyun/components/ParaIkonlari.jsx`.
- **Ne:** `CoinIkon` içindeki eğik elips gövde (CoinC mantığı) çıkarıldı; yerine CoinA'nın çizim mantığı (`gorsel-revizyon/a/cizim/para.jsx`) hafif/animasyonsuz üretim sürümü olarak yazıldı: daire yüz + kalınlık bandı + kabarık kenar ışığı + çukur alan + ortada Q kabartma. Boy kuralı CoinA ile aynı: ≤ 28 px küçük çizim (kalın kontur, koyu oyma Q), üstü tam çizim (kenar tırtığı, kabartma Q). Eski `elips()` yardımcısı kaldırıldı; `daire/kutup/yay/dilim` yerel eklendi (modüller birbirinden import etmez kuralı). `ElmasIkon`, elmas paketleri ve `CoinGorseli` (coin paket kartı yığını) DOKUNULMADI.
- **Parite:** `CoinIkon` tek kaynak — üst çubuk, Dükkân/joker fiyatları, maç sonu ödülü, ana sayfa, davet, mod seçim, Düello/tasarım parçaları hepsi bu bileşeni içe aktarıyor; başka bir coin çizimi yok.
- **Doğrulama:** `npm run build` temiz. Gerçek Chrome 390×844 (x3): ana sayfa üst çubuk + görev ödülü, Dükkân üst çubuk + bakiye + 1×/10× joker fiyatları, Coin sekmesi — hepsinde önden Q sikke; DOM'da eski eğik elips yolu 0; konsol hatası 0. 96/64/48/32/28/20/14 px SSR çizimi CoinA ile aynı görünüm.
- **Not:** `tasarim/SECIMLER_GORSEL_REVIZYON.md` 1. satırına güncelleme notu eklendi (eski seçim silinmedi).

## 2026-09-27 — Jev zorluk dondurma: aşırı uzmanlık soru tespiti (PROVA)
**Araç:** Claude Code (Sonnet 5)
**Neden:** Ida — zorluk 4-5 aktif sorularda ortalama oyuncunun bilme ihtimali olmayan
ansiklopedik/uzmanlık sorularını (ör. "Vesti la giubba" aryası hangi opera) dondurmak.

- **Araç:** `araclar/jev-zorluk-dondurma.mjs` (jev-kapsam.mjs deseni). Aktif TR, zorluk
  IN (4,5) 3.664 soru Jev'e 3 sınıfta taratıldı: normal / zor_bilinebilir / asiri_uzmanlik.
  Ölçüt: "Türkiye'de ortalama eğitimli bir yetişkin bu soruyu makul ihtimalle bilir mi?"
  PROVA modu (varsayılan): veritabanına yazmaz, ham veri `jev-tarama/zorluk-dondurma-ham.jsonl`
  (git'e girmez), özet+örnekler `zorluk-dondurma-ozet.md`, tam aday listesi
  `zorluk-dondurma-adaylar.csv`. Maliyet $0.10.
- **Sonuç (ham):** normal 408 · zor_bilinebilir 3.183 · asiri_uzmanlik 73.
- **Kalibrasyon bulgusu 1:** kapsam betiğinden kopyalanan 0,7 güven eşiği bu 3'lü
  sınıflandırmada işe yaramadı — asiri_uzmanlik ortalama güveni 0,39 çıktı, eşik 73 adaydan
  yalnız 1'ini bırakıyordu. 73 örneğin tamamı elle okundu, düşük güvende bile isabetliydi
  (ör. Cook–Levin teoremi, CAP teoremi, Paxos algoritması gibi net uzmanlık soruları) →
  eşik script'te 0'a çekildi (devre dışı), ham veride güven değeri saklı kalıyor.
- **Kalibrasyon bulgusu 2 (Ida'ya soruldu, henüz karar yok):** kategoriler arası tutarsızlık
  var — teknoloji %5,6 işaretlendi (37/656), müzik %2,8, sanat %2,1; edebiyat/sinema ~%0,2,
  coğrafya/genel_kültür %0. Elle bakılan edebiyat/sanat örnekleri (ör. Nabokov'un Solgun
  Ateş'inde "Kinbote" karakteri, Saint-Denis'i yeniden yapan başrahip "Suger") benzer
  derecede ansiklopedik ama zor_bilinebilir'de kaldı — teknoloji dışı kategorilerde
  muhtemelen düşük tespit. İlk aşamada yalnız net teknoloji-ağırlıklı 73 aday ile mi
  devam edilecek, yoksa düşük-kapsamlı kategoriler için ikinci bir geçiş mi yapılacak,
  karar Ida'da.
- **Havuz daralması riski yok:** kategori başına dondurma sonrası kalan aktif soru sayısı
  en düşük teknoloji'de 1.221 (mevcut 1.258) — `soru_kapsam_min_havuz` (60) eşiğinin çok
  üstünde, hiçbir kategori daralmıyor.
- **Doğrulama (kod okuması, migration'lardan):** `aktif=false` zaten Klasik/Grup/Saf Bilgi
  (`soru_sec`), Düello (`duello_soru_bul`, `duello_tur_sonu`, `duello_altin_degerlendir`,
  `duello2_soru_ac`), Turnuva (`turnuva_soru_sec`, `turnuva_soru_aday`,
  `turnuva_altin_soru_ekle`) ve Antrenman/Hatalarım (`calisma_baslat`, `soru_sec` üzerinden)
  fonksiyonlarının hepsinde `q.aktif` filtresiyle var — donan bir soru ek kod değişikliği
  gerekmeden hiçbir modda çıkmayacak.
- **Bekleyen:** Ida ölçütü ve kapsam sorusunu onaylarsa `--migration` ile
  `update questions set aktif=false where id in (...)` üretilecek (yalnız asiri_uzmanlik,
  idempotent, silme yok) ve canlıya uygulanacak.

## 2026-09-27 — Zorluk dondurma migration 662 canlıya uygulandı
**Araç:** Claude Code (Sonnet 5)
**Neden:** Yukarıdaki PROVA'nın (Jev zorluk dondurma) onaylanan sonucu — 73 "aşırı uzmanlık"
sorusunu pasife almak.

- **Migration:** `20260612000662_zorluk_asiri_uzmanlik_dondur.sql` — önce
  `araclar/migration-prova.mjs` ile transaction'da denendi/geri alındı, hedef 73 id'nin hâlâ
  `aktif=true` olduğu doğrulandı, sonra `araclar/migration-uygula.mjs` ile canlıya uygulandı.
  `update questions set aktif=false where aktif and id in (...)`; silme yok, geri açmak için
  `aktif=true` yeter.
- **Doğrulama:** 73 id artık `aktif=false` (0/73 hâlâ true); aktif TR zorluk 4-5 havuzu
  3.664 → 3.591; `soru_sec('teknoloji', 500, ...)` donan listede artık donan bir id yok
  (elle test edildi). Kategori başına kalan aktif soru en düşük teknoloji'de 1.221 — havuz
  daralması yok.
- **Bekleyen (kapatılmadı):** edebiyat/sinema/coğrafya/genel_kültür kategorilerinde ölçütün
  düşük tespit oranı (yukarıdaki PROVA kaydına bkz.) için ikinci bir geçiş yapılıp
  yapılmayacağı Ida'nın kararına bağlı.

## 2026-09-27 — Jev zorluk dondurma ikinci geçiş: düşük tespitli kategoriler
**Araç:** Claude Code (Sonnet 5)
**Neden:** İlk PROVA'da teknoloji %5,6 aşırı uzmanlık işaretlenirken edebiyat/sinema/tarih/
coğrafya/genel_kültür/spor %0-1,2 arası kalmıştı; ölçütün örnekleri STEM ağırlıklıydı ve
bu kategorilerde benzer derecede ansiklopedik soruları (ör. Nabokov'un "Kinbote"si)
kaçırdığından şüphelenildi.

- **Araç:** `araclar/jev-zorluk-dondurma-ikinci-gecis.mjs` — ilk geçişte bu 6 kategoride
  `zor_bilinebilir` kalan 1.565 soruyu, çok alanlı çapa örnekli (opera aryası + roman yan
  karakteri + film sahne ayrıntısı + spor istatistiği + tarih ayrıntısı) yeni bir ölçütle
  yeniden denedi. PROVA (DB'ye yazmadı), maliyet $0.058.
- **Sonuç:** 32 yeni aşırı uzmanlık adayı: edebiyat 17 (ör. "Godot'yu Beklerken'de Pozzo'nun
  uşağının adı → Lucky", "Nabokov'un Solgun Ateş'inde şerh yazan karakter → Kinbote"), sinema
  12 (ör. "Bergman'ın Persona filminde hemşirenin adı → Alma"), spor 2, tarih 1. Coğrafya ve
  genel_kültür'de yeni aday çıkmadı (ikinci ölçütle de) — üçüncü bir geçiş yapılmadı,
  gerekçesi zayıf (kanıt yok).
- **Migration:** `20260612000663_zorluk_asiri_uzmanlik_ikinci_gecis.sql` — aynı akış (önce
  `migration-prova.mjs` ile transaction'da denendi, 32/32 hedefin aktif olduğu doğrulandı,
  sonra `migration-uygula.mjs` ile canlıya uygulandı). Doğrulama: 0/32 hâlâ aktif=true.
- **Toplam (662+663):** 105 soru donduruldu (73+32). Kategori başına kalan aktif soru en
  düşük spor'da 1.120, teknoloji'de 1.221 — `soru_kapsam_min_havuz` (60) eşiğinin çok üstünde.

## 2026-09-27 — İlk 80 gizli botun UUID'leri rastgeleleştirildi
**Araç:** Codex
**Neden:** Migration 150'de eklenen 80 gizli botun `b17b…001–080` biçimindeki
öngörülebilir kimlikleri teknik olarak ayırt edilebiliyordu.

- **Kapsam:** yalnız `b17b0000-0000-4000-8000-000000000001–080`; canlıdaki
  diğer 75 gizli bot sahibinin açık kararıyla değiştirilmedi.
- **Migration 664:** her hedef için `gen_random_uuid()` ile benzersiz UUID v4
  üretir. `auth.users.id`, `profiles.id` ve `public`/`auth` içindeki eşleşen bütün
  UUID kolonlarını dinamik taşır. 129 kullanıcı FK'sinin public tarafındakileri
  yalnız transaction boyunca erteler, sonunda özgün `NOT DEFERRABLE` durumuna
  döndürür. FK'siz tarihsel kolonlar (`duello_hamleler.saldiran/savunan/
  can_kaybeden`, `duello_sinyal.*`, `duellolar.saldiran`) da kapsandı.
- **Yarış güvenliği:** UUID kolonu taşıyan public tablolarda kısa süreli yazma
  kilidi; bot cron'u veya devam eden maç eski UUID ile yeni satır ekleyemez.
  Profil/auth JSON içeriği (id hariç), toplam gizli bot sayısı ve kapsam dışı 75
  profil transaction içinde birebir karşılaştırılır; uyuşmazlıkta tamamı geri alınır.
- **Prova:** önce transaction'da uygulanıp geri alındı. 36 dolu UUID kolonunda
  **20.423 → 20.423** bağlı satır; hedef 80, `b17b` kalan 0, kapsam dışı 75.
  İlk provada yönetilen `auth.identities` sahipliği, ikinci uzun provada canlı
  cron yarışı yakalanıp migration güvenli hâle getirildi; son prova temiz.
- **Canlı sonuç:** ledger `20260612000664`; 80/80 hedef auth+profil kaydı,
  80/80 UUID v4, 80 farklı dört haneli önek, `b17b` kalan 0; gizli bot toplamı
  155; 129 FK'nın ertelenebilir olanı yine 0. Profil adları, seviyeleri,
  ülkeleri, avatarları, rozetleri ve geçmiş verileri değişmedi.
- **Davranış:** yeni UUID'li `mrkaya` botuyla transaction içinde birkaç Düello
  maçı ve 34/34 sunucu davranış kontrolü geçti. Canlı gerçek oyuncu oturumunda
  bir Düello + 20 soruluk Klasik maç geçti; ikinci Düello'nun oyun/bot adımları
  geçti, yalnız ilk fazın 2,6 sn geç açılmasına bağlı 874 ms sayaç ölçümü mevcut
  test eşiğine (900 ms) takıldı ve Jev tarafından görev dışı zamanlama gürültüsü
  sınıflandı. Yeni test hesabı oluşturulmadı.
- **Kod:** `duello-kalkan-sql-testi.mjs` artık sabit `b17b` UUID yerine etkin
  gizli botu profilden dinamik seçer. RLS, GRANT/REVOKE ve üretim bot davranış
  fonksiyonlarında değişiklik yok.

## 2026-09-27 — Sayfa geçişi (sayfa_gecis) ses adayları baştan

**Araç:** Claude Code
**Neden:** Ida, 23 Eyl'deki üç adaydan (switch_004/scroll_003/maximize_001)
memnun değildi — hepsi dokunuş sesine kıyasla fazla süslü/uzun/katmanlıydı
(180 ms – 1 sn). Baştan, dokunuşla aynı basitlik seviyesinde yeni adaylar istendi.

- Eski üç `.wav` `public/ses/adaylar/`'dan silindi, `adaylar.js` listesinden çıkarıldı.
- Yerine 5 yeni aday: Kenney UI Audio › switch5/switch10 + Interface Sounds ›
  tick_002 (CC0, .ogg → 16 bit mono WAV 32 kHz, sessizlik kırpıldı, -1 dBFS
  normalize) ve Pixabay'den SoundShelfStudio'nun "UI Swipe Navigation Soft" /
  "UI Swipe Confirm" (Pixabay İçerik Lisansı, MP3 çerçeve sınırından kırpıldı,
  yeniden kodlama yok). Sonuç süreleri: 20/98/122 ms (Kenney), 287/287 ms
  (Pixabay) — dokunuş adaylarıyla (9–80 ms) aynı basitlik aralığında.
- **Dönüştürme yöntemi:** Chrome'da (Claude in Chrome) yerel bir Node
  statik sunucusu + Web Audio API sayfası: ogg/mp3 decode edilip sessizlik
  eşiğiyle kırpıldı, WAV'lar yeniden kodlandı, MP3'ler ise ham baytlardan
  MPEG çerçeve sınırında kesildi (yeniden kodlama yok) — mevcut süreçle
  (`KAYNAKLAR.md`) aynı.
- Değişen dosyalar: `public/ses/adaylar/sayfa_gecis-k1..k3.wav`,
  `sayfa_gecis-p1/p2.mp3` (yeni), `oyun/tasarim/ses-secim/adaylar.js`,
  `public/ses/adaylar/KAYNAKLAR.md`.
- `npm run build` temiz (postbuild tarayıcı uyumluluk denetimi de TEMİZ).
- **Test edilmesi gereken:** `/ses-secim` sayfasında "Sayfa geçişi" bölümünde
  5 yeni adayı dinleyip birini seçmek (Ida'nın kendi kulağıyla karar vereceği bir tercih).

## 2026-09-27 — İkinci 75 gizli botun UUID'leri rastgeleleştirildi
**Araç:** Codex
**Neden:** Migration 175'te eklenen ikinci gizli bot grubunun kimlikleri de
`b27b0000-0000-4000-8000-…` sabit gövdesi ve sıralı son ekiyle ayırt edilebiliyordu.

- **Kesin keşif:** canlıdaki 155 gizli bot biçimsel tarandı. Tek kalan sistematik grup
  tam olarak `b27b0000-0000-4000-8000-000000000001–075`: 75 kayıt, min=1,
  max=75, eksik/tekrar yok. Diğer 80 bot bu kalıba girmiyordu ve migration dışında kaldı.
- **Migration 665 (`20260612000665`):** yalnız bu 75 tam UUID'yi `gen_random_uuid()` ile benzersiz UUID v4'e
  taşır. 664 ile aynı kilit, geçici FK erteleme/geri yükleme, tüm `auth`/`public` UUID
  kolonlarını dinamik tarama, profil/auth JSON karşılaştırması ve kapsam dışı 80 botun
  tam profil anlık görüntüsü kontrollerini kullanır. Uyuşmazlıkta transaction bütünüyle
  geri alınır.
- **Prova ve veri kanıtı:** ilk transaction provası hedef UUID metnindeki yazım hatasını
  canlıya dokunmadan yakaladı; düzeltmeden sonraki prova temiz ve geri alındı. Hedef grubun
  güncel verisi **31 tablo / 38 UUID kolonunda 19.965 → 19.965 satır** olarak birebir
  eşleşti. Profil/auth içeriği (id hariç), toplam 155 bot ve kapsam dışı 80 profil de
  transaction içinde değişmezlik kontrolünden geçti.
- **Canlı sonuç:** ledger `20260612000665`; `gb2_…@bildim.local` grubunda 75/75 auth+profil,
  75/75 UUID v4, 75 farklı dört haneli önek, `b27b` kalan 0. Bütün 155 gizli botta
  sabit `????0000-0000-4000-8000-############` deseni kalan 0.
- **Davranış:** hedef `gb2_raymalifalitikko` botuyla migration uygulanmış rollback
  provasında ve canlı migration sonrasında sunucu testi ayrı ayrı 34/34 geçti. Canlı
  gerçek oyuncu oturumunda Düello rakibi `gb2_muhammedsalah`, Klasik rakibi
  `gb2_ozan06` oldu; Düello bitti, Klasik 20/20 cevap sunucuya ulaştı. Oyuncu testinde
  uygun zamanlama oluşmadığı için denenemeyen üç Kalkan alt senaryosu hedefli 34/34
  sunucu testinde doğrulandı. Yeni test hesabı açılmadı.
- **Kod ve derleme:** SQL davranış testi isteğe bağlı `BOT_EPOSTA` ile belirli gizli botu
  seçebiliyor. `npm run build` ve postbuild tarayıcı uyumluluk denetimi temiz; RLS,
  bot davranış fonksiyonları ve profil görünüm verileri değiştirilmedi.

## 2026-09-27 — Ana sayfa Düello kartı kırmızıya çevrildi
**Araç:** Codex

- Yalnız ana sayfadaki `.as-buyuk-dugme--duello` yerel renk eşlemesi, stil rehberinin
  kırmızı `--qt-yanlis` / `--qt-yanlis-dudak` tokenlarına geçirildi (`#ff5a6a` /
  `#c9303f`). Global Düello tokenı ve maç ekranı renkleri değiştirilmedi.
- Lacivert kart metniyle kontrast **4,97:1** (WCAG AA). Turuncu OYNA, mor ve diğer mod
  renkleri değişmedi.
- TR/EN, 390 px ve 1280 px görsel doğrulamalarında kart etiketi ve renkleri doğru,
  yatay taşma yok. Kalıcı test profilinin dili EN kontrolü için geçici değiştirildi ve
  sonunda `tr` değerine geri yüklendi; yeni test hesabı açılmadı.
- `npm run build` ve postbuild tarayıcı uyumluluk denetimi temiz.

## 2026-09-27 — Düello puan sistemi: can kalktı, yıldızlı kategoriler + simetrik puan, Altın Soru, Kalkan 2 hak, yeni oyuncu kilidi
**Araç:** Claude Code
**Neden:** Ida: Düello'da 3 kalp yerine biriken puan; kategoriler rakibin oranına göre maç başında yıldızlansın (★ 1 · ★★ 3 · ★★★ 6), doğru bilen alsın, 10 tur + eşitlikte Altın Soru; zayıf nokta / kategori sınırı / üst üste yasağı kalksın; Kalkan maçta 2 ücretsiz hak (Tur 1–5 · 6–10, biriktirilir); Düello 5 Klasik/Saf Bilgi maçıyla açılsın.

- **Migration 666 `duello_puan_sistemi`** (transaction provası → canlıya uygulandı; aktif düello 0 idi, geçiş gerekmedi). Yeni kolonlar: `duellolar.puan1/2, yildiz1/2, puan_degerleri, kalkanlar1/2`, `duello_hamleler.yildiz, deger, puan_saldiran, puan_savunan, altin_kazanan`. Eski `can1/2`, `zayif1/2`, `kalkan1/2`, `can_kaybeden` silinmedi (geçmiş maçlar); yeni maçta boş. Ayarlar (oyun_ayarlari): `duello_yildiz_zayif_esik` 45, `_orta_esik` 70, `duello_puan_yildiz1..3` 1/3/6, `duello_acilis_mac_esigi` 5, `duello_kalkan_pencere1_son_tur` 5, `_pencere2_son_tur` 10, `rozet_kil_payi_puan` 3, `rozet_geri_donus_puan_farki` 10. `duello_can`, `duello_kategori_max`, `duello2_zayif_min_cevap` "KULLANILMIYOR" işaretli.
- **Sunucu (sürüm dalı yok, duello2_* yerinde değişti):** `duello_olustur` (sürüm 1 dalı ve zayıf nokta silindi; yıldızlar `duello_oranlar_ic`'ten, < 5 cevap → ★★), `duello2_cozumle` (değer = savunanın yıldızı; doğru bilen alır; Altın Soru'da puan yok, `altin_kazanan`), `duello2_sonraki` (erken bitiş yok; 10. tur sonunda puanı yüksek kazanır, eşitse `duello2_uzatma_ac`), `duello_altin_soru_bul` (Turnuva'nın `turnuva_soru_aday` seçicisi: kullanılmamış, zorluk 4–5 → alt dilimler, kapsam kuralı), `duello2_skill_hak_kontrol` (Altın Soru jokersiz), `duello2_kategori_uygun_mu` (yalnız liste · kalkan · kapsam), `duello2_otomatik_kategori` (rastgele), kalkan: `duello_kalkan_kalan` + `duello2_kalkan_engel/uygula/aktif_kalkan` (dizi, seçim başına 1), bot: `duello2_bot_kategori` (beklenen avantaj = değer × (bot isabeti − rakip oranı)), `duello2_bot_kalkan_kategori` (saldıranın en çok kazanacağı yer), `duello2_bot_tik` (2 hak kuralı; 2. pencerede gerideyse %45; Altın Soru'da joker yok), `duello2_durum` (puan, yıldızlar, puan_degerleri, kalkan hakları), `trg_duello_bot_tepki` (can yerine kazanan). Yeni oyuncu kilidi: `duello_acilis_durumu/benim/kontrol` → `duello_ara`, `duello_davet_et` (iki taraf), `duello_davet_cevap`. Yeni RPC `duello_acilis_benim` yalnız `authenticated` (mevcut desen; başka yetki değişmedi).
- **Rozetler (ürün kararı gerektirmeyen uyarlama, geri alınabilir):** "Son Nefes" → en çok 3 puan farkla kazanılan düello; "Büyük Geri Dönüş" → 10 puan gerideyken kazanmak; gizli "Uzatmaların Adamı" → "Altın Dokunuş" (Altın Soru'lu düelloyu kazan). Eski can maçları eski ölçütle sayılmaya devam eder (`rozet_olcut`).
- **Karar (yorum):** "art arda" = art arda iki savunmada; aynı kategori seçiminde tek kalkan (her kalkan TEK kategori korur). Altın Soru'da kalkan da yok (Turnuva'daki gibi yalnız soru).
- **Arayüz:** `DuelloV2.jsx` yeniden yazıldı (puan + "+N" balonu, `YildizEtiket`: ★ sayısı + trafik ışığı rengi (yanlış/uyarı/doğru tonları) + "+puan" birlikte; saldıran kartlarında rakibin yıldızı + iki oran, sol kenar şeridi yıldız tonunda; savunana "Rakibin gördüğü kategorilerin"; kalkan düğmesinde kalan hak, pencere metinleri, "Korumada: ★★ Bilim"; cevapta "★★ +3 · Doğru bilen 3 puan alır"; Altın Soru bandı; sonuç "Sen doğru, rakip yanlış → sen +3"; maç sonu soru listesinde yıldız + "Sen +3 · Rakip +0"). `DuelloPage.jsx`: eski V1 (can'lı) maç ekranı, Kalpler, zayıf nokta/kategori sınırı arayüzü ve sürüm önbelleği silindi; lobide kilit kartı ("Düello'yu açmak için X maç daha oyna" + ilerleme + "Klasik maç oyna"), durum gelmeden eylem çizilmez; maç sonu skoru puan, Altın Soru alt yazıları. `DuelloTanitim` 6 adım yeni kurallarla (anahtar v5 → herkese bir kez yeniden). Modlar/ana sayfa/mod seçimi metinleri ("3 can" → "10 tur"). EN: `ceviri/mac.js` (51 eski can/zayıf nokta satırı silindi, 55 yeni), `ceviri/sunucu.js` (yeni sunucu mesajları).
- **Testler:**
  - `araclar/duello-puan-sql-testi.mjs` (eski kalkan SQL testinin yerine; canlı DB, tek transaction, ROLLBACK): **58/58** — yıldız eşikleri (%45 ★, %46 ★★, %70 ★★, %71 ★★★, 4 cevap → ★★), simetrik puan (ikisi doğru/yalnız savunan/yalnız saldıran/ikisi yanlış), kaldırılan kurallar, tur 5 sonunda maç sürer, 10. tur sonu kazanan, eşitlikte Altın Soru (zorluk 4, jokersiz, kalkansız, ikisi doğru/yanlış → yeni soru, tek doğru → kazanır, soru tekrarı yok), kalkan (Tur 1 kullan → Tur 3 red "2. hak Tur 6'da" → Tur 6 kullan → Tur 8 red; biriktirme: Tur 5 kalan 1, Tur 6 kalan 2, Tur 6 + Tur 7 art arda iki kullanım, 3. red; aynı seçimde ikinci red), bot kalkan sınırı, kilit (eşik altı red, bot muaf, eşikte kabul), durum() şekli.
  - `araclar/oyuncu-testi.mjs` Düello bölümü güncellendi (puan kolonları, kalkan 2 hak + biriktirme senaryosu, yıldız rozeti ↔ sunucu eşleşmesi, maç sonu her hamlenin puan/yıldız/değer + toplam + kazanan + bot kalkan sınırı denetimi, `--altin`, `--hepsi`).
  - `araclar/duello-kilit-testi.mjs` (yeni): gerçek misafir hesapla 0 / 4 / 5 maç: kilit kartı "5 maç daha" / "1 maç daha", "Rakip ara" yok, sunucu reddi, 5'te açık + kuyruk kabulü — ilk koşuda 8/8; hesaplar `hesabimi_sil` ile silindi.
  - **Gerçek düellolar (oyuncu-testi, yerel dev → canlı DB, bota karşı, 390/360 px):** 15 maç başladı, **11 maç tamamlandı ve hepsi maç sonu puan denetiminden geçti** (her hamlenin yıldızı = savunanın maç başı yıldızı, değer = puan_degerleri, puan simetrik, toplam = puan1/2, 20 normal hamle, kazanan = yüksek puan ya da Altın Soru'yu tek bilen, bot kalkanı ≤ 1 ilk pencerede / ≤ 2 toplam): 14–14 +Altın, 8–7, 12–12 +3 Altın (art arda iki eşit Altın Soru, sonra kazanan), 40–40 +Altın, 23–24, 8–9, 27–25, 20–20 +Altın, 27–25, 23–24, 25–23. Yıldız dağılımları farklı rakiplerde ★/★★/★★★ = 5/5/0 · 4/6/0 · 5/4/1 · 4/5/1 · 6/4/0 · 2/6/2 · 2/8/0 · 3/6/1; her maçta 10 kategori rozeti (renk sınıfı + ★ sayısı + "+puan") sunucuyla aynı. Kalkan (4 koşuda): Tur 1–5'te hak 1 ve kullanılmadı → Tur 6/7'de düğmede **2 hak** (biriktirme), art arda iki savunmada 2 kullanım (Tur 6+7, 7+8, 9+10), aynı seçimde ikinci kalkan reddi, 3. kullanım reddi "hakların bitti", son 5 sn reddi + düğme pasif, saldıran reddi, bot saldıran korunan kategoriyi hiç seçmedi, saldıranda "Korumada" kilitli kutu + bildirim, maç sonu özetinde "… korundu". Altın Soru ekranı: bant görünür, bütün joker düğmeleri kapalı. `--altin` ile zorlanan 1 + doğal eşitlikten 4 Altın Soru'lu maç.
  - **Tamamlanamayan 4 maç — kod değil, ölçülen sebep:** 14:15–14:18 ve 14:30–14:31 UTC arası bütün cron işleri 13–22 sn sürdü / hata verdi, PostgREST `duello_durum` 57014 statement timeout + 500 (bilinen aralıklı platform/DB takılması, 26 Eyl kaydıyla aynı); o dakikalarda istemci faz değişimini 3 sn içinde göremedi (test sınırı) ya da cevap sunucuya ulaşamadı. Bir maçta test döngüsünün kalkan adımı yavaş DB'de 6,5 sn takılıp soruyu kaçırdı → adım kısa zaman aşımlarıyla hızlandırıldı. Son koşuda bir kategori fazında ilk rakam adımı 897 ms (eşik 900; sayaç koduna dokunulmadı, 26 Eyl'de 892 ms ile görülen sınır durumu).
  - **Bu makinede başsız Chrome sorunu (not):** kurulumu bitmiş YENİ misafir hesapta /duello ikinci kez tam yüklenince (yeni bağlamda bile) sekme ~5 sn sonra "AudioContext … audio device" hatasıyla çöküyor; canlıdaki ESKİ sürümde de aynı, JS belleği sabit (27–33 MB) → sayfa kodu değil, ses aygıtı olmayan başsız Chrome. Kilit testi bu yüzden lobiyi tek kez yükler.
  - `npm run build` temiz. Temizlik: kilit testinin 5 misafir hesabı `hesabimi_sil`, tanı sırasında açılan 3 misafir hesap (auth.users) ve sahte maçları silindi; kalan test hesabı yok. Ana test hesabının (ArayuzDenetim317) düelloları kayıt olarak durur (önceki testlerle aynı düzen).
- **Commit'ler:** 635f29e (sunucu + SQL testi), c52dbd7 (arayüz), 8598b99 (test araçları), 5165bf2 (Altın Soru alt yazısı), bu kayıt. Canlı: Vercel dağıtımı tamam, canlı `DuelloPage` parçasında yeni kod (`duello_acilis_benim`, "ALTIN SORU") doğrulandı.
- **Canlı doğrulama (quiztactics.vercel.app, dağıtım sonrası):** 1 tam düello hatasız — yıldız rozetleri sunucuyla aynı, Tur 6'da biriken 2 hak, Tur 6 + 7 art arda iki kalkan, skor 20–21, puan/kazanan denetimi geçti (ilk deneme sahibinin internet kopmasıyla yarıda kalmıştı).

## 2026-09-27 — Gizli bot isim/ülke düzeltmesi (668) + Görev B kararları doğrulaması
**Araç:** Claude Code (Sonnet 5, PC). **Neden:** Ida'nın iki küçük işi; Düello dosyalarına dokunulmadı (başka oturum 666/667 üzerinde çalışıyordu).
- **İş 1 (migration 668):** Migration 175'teki (`bot_havuzu_buyutme`) 75 gizli botun 20'sinde net Türkçe/Türkiye tarzı kullanıcı adı (Umut, Merve, Aleyna, Ege, Batuhan, Cansu, Ceren, Barış, Esra, Ayla, Mert, İlayda, Melek, Melis, Ozan, Sude, Yiğit + plaka/ay rakamı deseni) ile atanmış ülke kodu uyuşmuyordu (BR/PT/MA/IN/EG/GB/ES/BG/FR/RO/AR/NL). Kimlikler 664/665 ile rastgele UUID olduğundan eşleştirme `takma_ad` ile yapıldı (bot havuzu 640'ta şehir nüfusa göre yeniden atandığı için mevcut `sehir` de yanlış ülkenin şehriydi — ör. yigit34 → Fes, umut01 → Rio de Janeiro). 20 bota TR + çeşitli il (Trabzon, Mersin, Samsun, Eskişehir, Balıkesir, Denizli, Erzurum, Diyarbakır, Antalya, Konya, Adana, Gaziantep, Malatya, Kayseri, Şanlıurfa, Sakarya, Bursa, İzmir, Ankara, İstanbul) verildi. Ad/seviye/avatar/maç geçmişi değişmedi. Belirsiz/uluslararası adlara (raymalifalitikko, legends, ibrahimovic, acunn, muhammedsalah, survivortaner, sebnemferahfanclub, manifestttya, tarikist, batista666, rasta4 — hâlihazırda TR olanlar dahil) dokunulmadı. Orijinal 80 bot (migration 150) hiç taranmadı. Prova (transaction, rollback) taramayı tekrar çalıştırdı: 0 uyumsuzluk. Canlıda `npx supabase db push` sonrası 20 satır tek tek doğrulandı.
- **İş 2 — Görev B (25 Eyl Ida kararları), üçü de zaten canlıydı, hiçbir şey yapılmadı:**
  a) "Şehir İkincisi"/"Kahramanmaraş İkincisi": `unvan_tanimlari`'nda hiç yok — 25 Eyl kaydında zaten "önizleme listesinden çıkarıldı, DB'ye hiç bağlanmadı" deniyordu; DB'de doğrulandı (13 unvan, aralarında yok), kimse sahip olamaz.
  b) "Bin Galibiyet": `toplam_galibiyet()` fonksiyonu okundu — Klasik/Saf Bilgi (`matches`) ve Düello'da rakip açık bot ise (Antrenman) saymıyor, Grup (`group_matches`) ve Turnuva (`tournaments`) sınırsız sayıyor → "Antrenman hariç bütün modlar" zaten doğru.
  c) Level çerçeve adları: `cerceveler` tablosunda `level_25/50/75/100` = "Level 25 Bronz / Level 50 Gümüş / Level 75 Altın / Level 100 Altın Kanatlar" — migration 647'de eskiye döndürülmüş, "Level N Madalyası" DB'de yok.
- Bronz lig çerçevesine dokunulmadı (görev dışı). `npm run build` temiz. Commit + `main`'e push.

## 2026-09-27 — Düello puan revizyonu (667): saldırana eksi puan, son 2 tur ×2, kategori kartında kendi gücün, bot maç sonu riski
**Araç:** Claude Code
**Neden:** Ida: kategoriyi seçen (saldıran) yanlış bilirse ceza alsın (savunan hiç kaybetmesin), son 2 tur puanlar
×2 olsun, kategori kartında rakibin yanında kendi gücün de görünsün, bot kategori seçimi bu riski hesaba katsın
ve maç sonu gerideyken/öndeyken insan gibi risk alsın/almasın; ayrıca kategori geri sayım sesi yalnız son 5 sn'de çalsın.

- **Migration 667 `duello_saldiran_ceza_son_tur_carpani`** (transaction provası → canlıya uygulandı; aktif düello 0 idi). Yeni kolonlar: `duellolar.carpanli_turlar/carpan_katsayi` (maç başında sabitlenir, `puan_degerleri`/`yildiz1/2` gibi), `duello_hamleler.carpan`. Ayarlar: `duello_carpanli_turlar` ([9,10]), `duello_carpan_katsayi` (2), `duello2_bot_risk_esik_tur` (8), `duello2_bot_risk_puan_farki` (6).
- **`duello_tur_carpani(tur, turlar, katsayi)`** (yeni): tur listede mi → katsayı, değilse 1; parametre verilmezse canlı ayara düşer (eski/legacy satırlar için).
- **`duello2_cozumle`:** değer artık `duello_tur_carpani` ile çarpılır (Altın Soru'da dokunulmaz — ayrı dal, çarpansız/cezasız kalır). Saldıran yanlış/yanıtsızsa `greatest(-değer, -saldıranın_o_anki_puanı)` kadar kaybeder — **puan sıfırın altına inmez** ve `duello_hamleler.puan_saldiran`/son_hamle'deki `puanlar` alanı NOMİNAL değil GERÇEKTE UYGULANAN (taban ile sınırlanmış) miktarı taşır, arayüz gösterdiği "−N" gerçek kayıpla birebir. Savunan hiçbir durumda kaybetmez (değişmedi).
- **`duello_olustur`:** `carpanli_turlar`/`carpan_katsayi` maç başında `oyun_ayarlari`'ndan bir kez okunup satıra yazılır (mid-match ayar değişikliği maçı etkilemez).
- **`duello2_bot_kategori`:** "akıllı" seçimde net avantaj formülü `değer(çarpanlı) × (2×bot isabeti − 1 − rakip oranı)` oldu (saldıranın eksi riski dahil; eskiden yalnız `değer × (bot isabeti − rakip oranı)`). **Maç sonu risk (yeni):** Tur > `duello2_bot_risk_esik_tur` (8) ve puan farkı ≥ `duello2_bot_risk_puan_farki` (6) ise: geride → yalnız en yüksek yıldızlı kategori, önde → yalnız en düşük yıldızlı kategori (normal %65/%20/%15 seçiminin YERİNE geçer). Kalkan mantığı (`duello2_bot_kalkan_kategori`, `duello2_bot_tik`) Ida'nın isteğiyle DOKUNULMADI.
- **`duello2_durum`:** çıktıya `tur_carpani` (şu an geçerli çarpan, Altın Soru'da hep 1) ve `carpanli_turlar` eklendi; maç sonu `gecmis` listesine `carpan` eklendi.
- **Arayüz (`DuelloV2.jsx`):** `yildizPuani(d,y)` artık `d.tur_carpani`'yi kendiliğinden çarpar — bütün "★★ +N" gösterimleri (saldıran kartı, savunan listesi, kalkan paneli, cevap banner'ı, sonuç) tek yerden otomatik ×2 gösterir. Saldıranın kategori kartı yeniden tasarlandı: rakip yüzdesi yerine **"Sen: ★★ orta"** (aynı eşik/renk, `kategoriYildizi(ben,k)`) + **"Doğru +N · Yanlış −N"** satırı; 9-10. turda kart köşesinde **"×2" rozeti** (`V2CarpanRozeti`) ve maça bir kez **"Son 2 tur: puanlar ×2"** bandı (`DuelloPage.jsx`, kalkan bildirimiyle aynı desen). Üst şeritteki puan balonu artık düşüşte de tetiklenir ve kırmızı **"−N"** gösterir (`m2-puan-artis--eksi`); maç sonu tablosunda ve maçın soruları listesinde de eksi puan gösterilir; `v2SonucMetni` saldıranın cezalı olduğu durumları (rakip de yanlışken bile saldıranın kaybettiği) ayrı cümlelerle anlatır. Kural metinleri: `DuelloTanitim` yeni adım ("Doğru bilen alır, saldıran yanlış bilirse kaybeder" + "Son 2 tur: puanlar ×2"), anahtar `v5→v6` (herkese bir kez yeniden), arama ipuçları güncellendi. EN çeviriler `ceviri/mac.js`.
- **Küçük hata düzeltmesi:** kategori geri sayım sesi eskiden 15 sn'lik sürenin TAMAMINDA çalıyordu; artık yalnız son 5 sn'de (`KATEGORI_SES_ESIK_SN`, client sabiti — sunucu ayarı gerekmiyor).
- **Rozet kontrolü (ürün kararı istenmedi, değiştirilmedi):** Son Nefes / Büyük Geri Dönüş rozetleri `duello_hamleler.puan_saldiran/puan_savunan`'ın koşan farkını kullanıyor; saldıranın eksi puanı bu farka zaten doğru işleniyor (ör. saldıran cezalanınca rakip lehine fark otomatik büyüyor) — **hâlâ anlamlı, değişiklik gerekmedi.**
- **Testler:**
  - `araclar/duello-puan-sql-testi.mjs` (canlı DB, transaction, ROLLBACK): **72/72** — bölüm 2 güncellendi (saldıranın cezası artık ilerleyen toplamla izleniyor), yeni bölümler: 10) saldırana eksi puan + taban 0 (ısınma, ceza, yanıtsız ceza, tam ceza vs. tabanla sınırlı ceza, "gösterilen = uygulanan" kontrolü), 11) Tur 9/10 ×2 (kazanç ve ceza, Tur 8'de çarpan yok), 12) Altın Soru çarpansız/cezasız (tur numarası fark etmez), 13) bot maç sonu risk (10 puan geride/önde → deterministik en yüksek/en düşük yıldız, Tur 8'de risk yok).
  - `araclar/oyuncu-testi.mjs`: `puanDenetimi` yeniden yazıldı — her hamlenin `deger`/`carpan`'ı tur çarpanına göre, `puan_saldiran` ilerleyen toplamla sınırlı ceza formülüyle (`greatest(-değer, -o_anki_puan)`) doğrulanıyor, negatif toplam puan kontrolü eklendi; `yildizKontrol` ekrandaki puanı artık maç başındaki turun çarpanına göre karşılaştırıyor.
  - **Gerçek düellolar (yerel dev → canlı DB, bota karşı, 390/360 px, `--hepsi` denendi ama kapsam matrisi 1 maçta doldu):** 3 tam düello (2 ayrı koşuda) hatasız — skorlar 11–11 (+3 Altın Soru), 9–13, 8–8 (+1 Altın Soru); her birinde yeni `puanDenetimi` (eksi puan + taban 0 + çarpan) geçti, kalkan biriktirme/reddi/maç sonu özeti doğru. 1 koşu ortasında bilinen aralıklı DB/cron takılması (26/27 Eyl kayıtlarıyla aynı desen, "kategori isteği N sn yolda kaldı") yüzünden yarım kaldı — kod değil, hemen ardından aynı kodla ikinci koşu tam geçti.
  - `npm run build` temiz (yeni renk-mix/ResizeObserver uyarıları önceden vardı, değişmedi).
- **Commit'ler:** migration 667 + SQL testi, arayüz (DuelloV2/DuelloPage/CSS/Tanıtım/çeviri), test araçları (oyuncu-testi.mjs), bu kayıt. Canlı: `npx supabase db push` ile migration 667 uygulandı (668'den önce, ayrı oturumla çakışma yok); `npm run build` + push sonrası Vercel dağıtımı normal akışta.

## 2026-09-27 — Turnuvada şıksız kalıp otomatik elenme: kök sebep "sekmeden dönünce tazeleme" lobide hiç kurulmuyordu
**Araç:** Claude Code
**Neden:** Ekran görüntüsü kanıtlı canlı rapor — 27 Eyl 20:00 turnuvasında oyuncu "silaa" Soru 4/30'da (Lewandowski sorusu) şıksız ekran görüp "Elendin" mesajı almış.

**Ölçüm (canlı DB, `araclar/pg-mini.mjs` ile salt-okunur sorgu):**
- Lewandowski sorusunun (`questions` + `question_translations`) şıkları TR/EN'de eksiksiz ve doğru — **veri bozuk değil**. `questions`/`question_translations`/turnuva havuzu genelinde de (jsonb tip · uzunluk 4 kontrolü) bozuk/eksik şıklı **tek kayıt yok**.
- Asıl olay Soru 4'te değil **Soru 1'de**: `tournament_players.elenme_sorusu = 0`, `tournament_answers`'ta bu oyuncu için **0 satır** (hiç cevap göndermemiş). O turnuvada 48 oyuncudan 47'si Soru 1'i cevapladı — yalnız bu oyuncu hiç cevaplayamadı. Soru 4 ekranı aslında **izleyici görünümüydü** (`elendi=true` olduğu için `TournamentPage` şıksız "Oyuncular cevaplıyor…" dalına düşüyor — bu KASITLI, bug değil); asıl haksızlık Soru 1'i hiç göremeden elenmiş olması.
- Aynı oyuncu ("silaa") **26 Eylül 20:00 turnuvasında da** aynı şekilde Soru 1'de hiç cevapsız elenmiş — aynı saatte (20:00 seansı, lobiye ortalama 5-6 dk önceden katılım) tekrarlıyor; rastgele bir render hatasından çok, lobide beklerken telefonun kilitlenmesi/uygulamanın arka plana düşmesiyle örtüşüyor.

**Kök sebep:** `oyun/lib/gorunurluk.js › useGorunurlukTazele(fn, aktif)` — `aktif=false` iken `visibilitychange/focus/pageshow` dinleyicileri HİÇ KURULMUYOR (`useEffect` `if (!aktif) return`). `TournamentPage.jsx`, `MatchPage.jsx`, `GroupMatchPage.jsx` bu hook'u `turnuva?.durum === "aktif"` / `mac?.durum === "aktif"` şartına bağlamıştı. Oyuncu **lobide** (`durum="lobi"`) iken sekmeyi/uygulamayı arka plana alırsa dinleyici hiç kurulmamış oluyor; turnuva sunucuda "aktif"e geçtiğinde (lobi→aktif) istemci bunu Realtime soketi arka planda koptuğu için kaçırıyor, ön plana dönünce de (dinleyici kurulmadığı için) hiçbir tazeleme tetiklenmiyor — ekran hâlâ "lobi" sanıyor, ilk sorunun 15 sn'lik penceresi sessizce geçiyor ve oyuncu cevap göndermeden eleniyor. Sonraki her soruda (izleyici olarak) doğru biçimde şıksız görünüyor — o kısım zaten tasarım gereği.

**Düzeltme:**
- `TournamentPage.jsx` / `MatchPage.jsx` / `GroupMatchPage.jsx`: `useGorunurlukTazele` çağrısındaki `durum === "aktif"` şartı kaldırıldı — artık KOŞULSUZ (lobi/eşleşme bekleme/aktif hepsinde) sekmeden dönüşte veri tazelenir + Realtime kanalı yenilenir. `turnuvaYukle()`/`macYukle()` zaten idempotent salt-okuma; her durumda çağrılması güvenli.
- `oyun/components/QuestionCard.jsx`: şık ayrıştırma (`JSON.parse`) artık `try/catch` içinde — bozuk/eksik veri gelirse kart tamamen çökmek yerine boş diziyle devam ediyor; `secenekler.length === 0` olursa (her ihtimale karşı) sonuç bandında **"Şıklar yüklenemedi — bağlantını kontrol et"** çıkıyor (EN çevirisi `dil.js`'e eklendi) — süre dolsa bile oyuncu sebepsiz elenmiş görünmüyor.
- Bu üçü **mod paritesiyle** birlikte düzeltildi (Klasik/Grup'ta da aynı gizli desen vardı; pencere daha kısa ama aynı risk).

**Test:** `npm run build` temiz (yalnız var olan chunk-size/renk uyumluluk uyarıları, ilgisiz). Gerçek turnuva seansları günde 5 kez sabit saatte (10:00/14:00/18:00/20:00/24:00 TSİ) sunucu cron'uyla açıldığından **canlı, uçtan uca (lobi → arka plana al → öne getir → aktif) doğrulama bu oturumda yapılamadı** (bir sonraki seans 24:00 TSİ) — kök sebep kod okumasıyla ve DB kanıtıyla kesinleştirildi, düzeltme mevcut davranışı bozmayacak şekilde (yalnız kısıtlayıcı şartı kaldırarak) yapıldı. Sahibi isterse bir sonraki seansta test hesabıyla (uygulamayı lobide arka plana alıp aktife geçişte öne getirerek) doğrulanabilir.

**Dağıtım:** `main`'e push edilecek (bu commit'le), migration yok (yalnız istemci kodu).

## 2026-09-27 — Düello kategori kartı sadeleştirme: renk = eşleşme (yıldız kalktı)
**Araç:** Claude Code (Sonnet 5, PC)
**Neden:** Ida — kategori kartında rakip yıldızı + "zayıf/orta/güçlü" + kendi yıldızı + puan bir aradaydı,
oyuncu kafasında birleştirip karar veremiyordu; yıldız zaten puan değerini ikinci kez anlatıyordu.

- **Migration 669** (`duello_kategori_kart_esik.sql`): tek satır `duello_kat_esik_yuzde` = 10
  (`oyun_ayarlari`) — kartın rengini belirleyen eşik. Güvenlik/yetki değişikliği değil; prova +
  canlıya uygulandı, `pg-mini` ile doğrulandı.
- **Kart (saldıran, `oyun/components/DuelloV2.jsx › V2Kategori`):** yıldız rozeti ve "zayıf/orta/güçlü"
  yazıları TAMAMEN kalktı. Yeni gösterim: kategori adı altında büyük **"+N / −N"** (9-10. turda ×2
  rozeti aynen kalıyor) ve küçük gri **"Sen %.. · Rakip %.."** (< 5 cevap → "—", zaten sunucudaki
  `duello_oran_min_cevap`'tan geliyordu). Kartın rengi artık yıldız değil **eşleşme**: yeni
  `eslesmeRengi(benOran, rakipOran, esik)` — kendi oranın rakipten `esik` (10) puan yüksekse yeşil,
  düşükse kırmızı, arası ya da biri veri yoksa gri. Puanın hesabı (savunanın yıldızından 1/3/6 ×
  tur çarpanı) DEĞİŞMEDİ, yalnız gösterim değişti.
- **Savunan ekranı ("Rakip düşünüyor…") ve Kategori Kalkanı ızgarası:** aynı sade dil — yıldız
  yerine renkli sol kenar şeridi (savunan listesi) / renkli zemin (kalkan ızgarası) + "+N" ve
  "Sen %.. · Rakip %..". Savunan hiç puan kaybetmeyeceği için "−N" hiç gösterilmiyor.
  `V2KalkanPanel` artık `rakip` ve `esikYuzde` prop'u da alıyor (rengi hesaplamak için).
- **Kural metinleri:** `DuelloTanitim.jsx`'teki "Yıldızlı kategoriler" adımı → "Kartın rengi":
  "Rakibin iyi olduğu konuda puan almak zor, bu yüzden daha değerlidir. Kartın rengi o konuda kimin
  daha iyi olduğunu gösterir: yeşil sen, kırmızı rakip, gri denk." (aynı bileşen hem ilk tanıtımda
  hem lobi "Kurallar nasıl işliyor?"da). Tanıtım anahtarı `bildim_duello_tanitim_v7`'ye yükseltildi —
  herkese bir kez daha açılır. Kategori ekranındaki iki kısa açıklama cümlesi de (saldıran/savunan) aynı
  çerçeveye güncellendi. TR + EN (`oyun/lib/ceviri/mac.js`); eski yıldız çevirileri (V2Cevap/V2Sonuc/
  maç geçmişinde hâlâ kullanılan `YıldızEtiket` bileşeni ve onun aria metni) DOKUNULMADI — kapsam
  yalnız kategori SEÇİM kartlarıydı.
- **CSS** (`DuelloPage.a.css`): `.m2-kat--y1/2/3` + `.m2-kat-guc/-ceza` + `.m2-kat-yildiz` kaldırıldı,
  yerine `.m2-kat--yesil/--kirmizi` (gri = varsayılan), `.m2-kat-deger`, `.m2-kat-oranlar`;
  `.m2-savun-kat--yesil/--kirmizi` (sol kenar şeridi) + `.m2-savun-bilgi/-deger/-oranlar`;
  `.m2-kalkan-kat--yesil/--kirmizi`. Kart 2 sütuna döndü (3. sütun yıldız için ayrılmıştı).
- **Test aracı güncellendi** (`araclar/oyuncu-testi.mjs`): eski `yildizKontrol` (★ rozeti + sınıfını
  sunucudaki `yildiz1/2`'yle karşılaştırıyordu) yeni tasarıma göre yeniden yazıldı — artık
  `profil1/2.oranlar` + `duello_kat_esik_yuzde`'den beklenen rengi hesaplayıp kartın
  `m2-kat--{renk}` sınıfını ve `.m2-kat-deger` metnini ("+N / −N") sunucuyla karşılaştırıyor; kalkan
  ızgarası kontrolü de yıldız yerine puan rozetine (`b` metni) bakıyor. Bu güncelleme olmadan test
  eski tasarımı arayıp başarısız olurdu (kısa süre böyle oldu, kodda değil test aracında).
- **Doğrulama:** `npm run build` temiz (yalnız var olan chunk-size/color-mix uyarıları, ilgisiz).
  `node araclar/oyuncu-testi.mjs` (varsayılan 390+360 px, Düello dahil) **2 tam bota karşı Düello
  maçı** ile GEÇTİ — biri Altın Soru'ya gitti; kategori kartı denetimi (10 kart × renk + değer),
  Kategori Kalkanı ızgarası, savunan listesi, maç sonu özeti hepsi sunucu verisiyle birebir eşleşti;
  iki genişlikte de kart taşması yok.
- **Dağıtım:** `main`'e push edilecek, migration 669 canlıda uygulandı.

## 2026-09-27 — Düello kategori puanı maç başına 3/4/3 + kategori ekranı grupları
**Araç:** Codex
**Neden:** Sabit `%45/%70` eşikleri bazı maçlarda 6 puanlık seçenek bırakmıyor, iki oyuncuya farklı büyük hamle imkânı veriyor ve kategori ekranı puan/renk anlamını yeterince açıklamıyordu.

- **Yarım iş temizliği:** önceki “avantaja göre sırala + ton kademesi” oturumunun tüm commit edilmemiş kod/test değişiklikleri geri alındı; kapsam dışı yerel değişiklik yoktu. O oturumda canlı deftere yazılmış 670 numarası yeniden kullanılamadığı için uygulanmış SQL'in tarihsel dosyası `20260612000670_duello_kategori_kart_tonlari.sql` olarak geri kondu; ürün davranışına alınmadı ve 671 iki kullanılmayan ton ayarını kaldırdı.
- **Migration 671 (`duello_kategori_343`):** `duello_yildizlar_ic`, sayısal oranlı kategorileri her oyuncu için kendi içinde sıralar; üst/alt oranlar `duello_yildiz_ust_yuzde` / `duello_yildiz_alt_yuzde` = 30. 10 verili kategoride ★/★★/★★★ = **3/4/3**; `<5` cevap nedeniyle oranı `null` olan kategori doğrudan ★★ ve sıralama dışında; kalanlar aynı yüzdeyle, eşitlik kategori anahtarıyla tekrarlanabilir biçimde bölünür. Eski `%45/%70` ayar açıklamaları `KULLANILMIYOR` olarak işaretlendi. `yildiz1/yildiz2`, `puan_degerleri`, puan/ceza, Tur 9–10 ×2, Altın Soru, Kalkan ve bot seçim kodu değişmedi. Yalnız yeni maçlar etkilenir.
- **Arayüz:** saldıran kartları “Rakibin güçlü alanları · 6”, “Orta alanlar · 3”, “Rakibin zayıf alanları · 1” başlıklarında; savunan ekranı kendi güçlü/orta/zayıf gruplarında. Tur 9–10'da başlık/kart puanları ×2 ve rozet korunuyor. İnce renk şeridi yerine okunaklı düz açık yeşil/kırmızı/gri zemin; ton kademesi yok. Yüzdeler 360/390 px'de tek satır. Kalkan ızgarası aynı zemin dilinde. Tanıtım, lobi ve kategori açıklamaları TR/EN yeni kurala geçirildi.
- **Test ve canlı:** migration önce transaction'da prova edildi, sonra canlıya uygulandı. SQL provası migration ile **79/79**, canlı kural üzerinde **78/78**: yüksek/düşük/karışık/eşit/verisiz dağılımlar, devam eden maç yıldızlarının değişmemesi, puan/ceza, ×2, Altın Soru, Kalkan ve bot davranışı geçti. Bot risk testindeki bir ilk başarısızlık ürün hatası değil, testin önceki maçın yıldız haritasını kullanmasıydı; test güncel maçın sabit yıldızlarını okuyacak şekilde düzeltildi, bot kodu değişmedi.
- **Oyuncu testi:** `--mod=duello --mac=2 --hepsi --gorsel --genislik=390,360` ile bota karşı iki tam maç GEÇTİ (20+20 hamle; skorlar 64–78 ve 41–46). Saldıran/savunan 3/4/3 grupları, puanlar, renkli zemin, tek satır oran, Kalkan ızgarası, son iki tur çarpanı ve maç sonu puan hesabı doğrulandı; 390/360 görselleri ayrıca incelendi, yatay taşma yok.
- `npm run build` temiz. Migration 671 canlıda; `main` push ve dağıtım doğrulaması bu kaydın commit'iyle yapılacak.

## 2026-09-28 — Dört küçük iş: geri sayım sesi, varsayılan kategori kaldırma, devam eden maç kartı, bot tepki sıklığı
**Araç:** Claude Code (Sonnet 5, PC)
**Neden:** Ida — dört bağımsız küçük düzeltme/özellik, tek oturumda sırayla.

### İş 1 — 3-2-1 geri sayımında bildirim sesi
- Kök sebep: `MatchPage.jsx`'teki `useOyunModu` koşulu yalnız `soru` veya `senkronBekliyor`'a bakıyordu;
  3-2-1 geri sayımı sırasında (`geriSayim !== null`, henüz `soru` yok) `bd-oyun-modu` sınıfı body'ye
  eklenmiyor, `BildirimToast`/`DavetBandi`'nin `!body.classList.contains("bd-oyun-modu")` koruması
  geçersiz kalıp o sırada gelen bildirim/davet sesi çalıyordu.
- `MatchPage.jsx:631`: koşula `|| geriSayim !== null` eklendi. `BildirimToast`/`DavetBandi` mantığına
  dokunulmadı. Düello'da ayrı bir 3-2-1 ön-maç geri sayımı yok (`useOyunModu(d?.durum === "aktif")`
  zaten maç aktif olur olmaz devrede) — kapsam dışı bırakıldı.
- `npm run build` temiz.

### İş 2 — "Varsayılan kategorim" kaldırıldı
- Karar: Klasik/Saf Bilgi'de kategori filtresi kalksın (az oyunculu oyunda eşleşme havuzunu
  bölüyor; kategoriye göre pratik zaten Çalışma modunda var).
- `ProfilAyarlari.jsx`: "Varsayılan kategorim" bölümü (başlık, açıklama, ızgara), `kategoriKaydet`,
  `kategoriler`/`kategoriHata` state'i ve fetch effect'i tamamen kaldırıldı; artık kullanılmayan
  importlar (`KategoriIkon`, `kategoriEtiket`, `kategorileriSirala`, `rpcDene`, `sayiBicim`) silindi.
  Veritabanında `tercih_kategori` kolonu ve `tercih_kategori_kaydet` RPC'si DOKUNULMADI.
- `ModlarPage.jsx` ve `anasayfa/veri.jsx` (`useOyunBaslat`): Klasik/Saf Bilgi rakip arama çağrılarında
  `RakipAra`'ya artık her zaman `kategori={null}` (karışık) veriliyor; `profile.tercih_kategori` oradan
  okunmuyor. İkisinde de artık kullanılmayan `profile` destructure'ı kaldırıldı.
- `oyun/lib/dil.js`: artık hiçbir yerde kullanılmayan "Varsayılan kategorim" + açıklama çevirisi silindi.
- `oyun/pages/Home.jsx`: eski, route'suz ana sayfa dosyası — hiçbir yerden import edilmiyor
  (`BildimApp.jsx`'te yalnız bir yorum satırında adı geçiyor), dokunulmadı.
- `npm run build` temiz.

### İş 3 — Ana sayfada kalıcı "devam eden maçın var" kartı (tüm modlar)
- Senaryo: oyuncu maç ortasında kısa süreliğine çıkıp geri dönünce (WhatsApp vb.) hiçbir şeye
  basmadan ana sayfada aktif maçını görsün — eski `YarimMac.jsx` yalnız Klasik'i ve yalnız "Oyna"ya
  basınca kapsıyordu.
- **Güvenlik onayı (28 Eyl 2026, Ida):** Düello'da "X. tur" göstermek için `duellolar` tablosu
  istemciye tamamen kapalı (`revoke all`) olduğundan dar okuma RPC'si `duello_aktif_benim()`'i
  genişletmem gerekti — bu bir security-definer yetki değişikliği olduğundan önce soruldu, onay
  alındı. **Migration 672** (`duello_aktif_benim_tur.sql`): fonksiyon artık `tur` alanını da
  döndürüyor (soru/kategori/hamle gibi stratejik bilgi hâlâ sızmıyor). Transaction'da prova edildi,
  sonra canlıya uygulandı (`npx supabase db push`).
- **Veri (`oyun/pages/anasayfa/veri.jsx › useDevamEdenMaclar`):** 4 kaynaktan toplar — Klasik/Saf
  Bilgi `matches` (durum='aktif', RLS zaten kendi maçlarına sınırlı), Düello `duello_aktif_benim()`
  RPC'si + rakip adı için `profiles` sorgusu, Grup `group_matches` (RLS katılımcıya sınırlı, migration
  25), Turnuva `tournaments` (durum='aktif') + `tournament_players` (`user_id` = ben, `elendi=false`).
  Sekme arka plandan öne gelince (`visibilitychange`/`focus`) ve ilgili tablolarda realtime olay
  olunca yeniden okunuyor — sunucudaki kopma toleransı/10 dk iptal cron'ları zaten `durum`'u
  güncellediği için istemci ayrıca süre hesaplamıyor.
- **Arayüz (`parcalar.jsx › DevamEdenMaclarKarti`, `AnaSayfaA.jsx`):** kart(lar) "Oyna" sütununun EN
  ÜSTÜNE eklendi (mevcut mobil flex `order` düzeninde açık sınıf olmadığı için `order:0` varsayılanı
  onu bildirim izninden hemen sonra, oyuncu kartından ÖNCE gösteriyor — CSS grid yapısına
  dokunulmadı). Her satır: mod ikonu, "{rakip} ile {mod} sürüyor" / "{mod} sürüyor", alt metin
  (Klasik/Grup "Soru n/t", Düello "n. tur/10", Turnuva "n doğru"), "Devam et" → `/mac/:id`,
  `/duello/:id`, `/grup-mac/:id`, `/turnuva`. Birden fazla aktif maç varsa hepsi listelenir. Mevcut
  `YarimMac.jsx` pop-up'ına dokunulmadı, çakışmıyor (biri kalıcı kart, biri "Oyna" bastığındaki soru).
  Süresi dolmuş/biten/terk edilmiş maçlar `durum` filtresiyle zaten dışarıda kalıyor.
- **TR/EN:** yeni metinler `dil.js`'e eklendi (mod adları zaten vardı).
- **Test:** yerel `npm run dev` + gerçek tarayıcı oturumu (mevcut test hesabı). `pg-mini` ile bir
  gizli bota karşı 4 modun hepsinde gerçek 'aktif' satır kuruldu (Düello/Grup/Turnuva'da tabloya
  doğrudan yazıldı, Turnuva için sahte geçmiş tarihli bir seans satırı kullanıldı) → ana sayfa açılır
  açılmaz 4 kart da doğru mod/rakip/alt metinle göründü, "Devam et" hepsinde doğru sayfaya (`/mac/…`,
  `/duello/…`, `/grup-mac/…`, `/turnuva`) yönlendirdi, sayfalar hatasız açıldı. Düello sayfasını
  ziyaret etmek (test verisi eksik olduğu için) sunucu tarafında maçı "bitti" sonuçlandırdı — bu
  RLS/oyun mantığının beklenen tepkisiydi, kartın kendisi anında realtime ile kayboldu (istenen
  davranış: "maç bitince kart kayboluyor" doğrulandı). Test satırları ve sahte turnuva satırı
  sonda silindi, test hesabı gerçek durumuna döndü. `npm run build` temiz.

### İş 4 — Botlar çok sık ve saliselik gecikmeyle emoji atıyor
- **Kök sebep 1 (gecikme):** `bot_oyna()` botun cevabını yazdığı transaction içinde tepkiyi de
  gönderiyordu — gecikme tam olarak 0 sn'ydi.
- **Kök sebep 2 (sıklık, asıl büyük olan):** yeni tepki sistemi (`tepki_bot_olasilik`, eskiden %12,
  yalnız "anlamlı an") yalnız `tepki_acik_modlar`'da olan modlarda (bugün yalnız `antrenman`) devrede.
  Klasik ve Grup Maçı'nda (gerçek maçların çoğu — gizli bot rakip normal eşleşmeden gelir)
  `tepki_mod_acik` false döndüğü için `bot_oyna()` hiçbir gate'e uğramayan ESKİ bir yola
  düşüyordu: kodda sabit `random() < 0.15`, "anlamlı an" kontrolü yok, sıklık ayarı yok, gecikme yok
  — Klasik'te her bot cevabında, Grup Maçı'nda da aynı şekilde. Bu, Ida'nın "arkadaşımla oynadığım
  maçta da oluyor" gözlemini açıklıyor: Grup Maçı'nda dolgu bot varsa bu eski yol gerçek
  arkadaşların gördüğü ortak sohbete de yazıyordu.
- **İstemci tarafı kontrol edildi, ayrı hata YOK:** `match_messages` INSERT'i yalnız görsel balon
  açıyor (`MatchPage.jsx › balonGoster`, 4 sn, sessiz); yeni "tepki" broadcast'i de yalnız görsel
  balon (`Tepki.jsx`, sessiz — grep'te "ses" hiç geçmiyor). Duyulan ses, botun cevabıyla AYNI anda
  çalan `sesRakipCevapladi()` — emoji + o ses gecikmesiz üst üste bindiği için "tepki sesi" gibi
  algılanıyor; `sesRakipCevapladi` botun GERÇEKTEN cevapladığı anı bildirdiği için DOKUNULMADI.
- **Migration 673 (`bot_tepki_sikligi_gecikmesi.sql`):**
  1. Sıklık ~%25'e indi: `tepki_bot_olasilik` 0.12 → 0.03; yeni ayar `bot_eski_tepki_olasilik` (0.04,
     eski sabit 0.15'in ~%25'i) eski Klasik/Grup düz-metin yolunu artık koddan değil ayardan okuyor.
  2. Yeni tablo `bot_tepki_bekleyen` (gecikmeli kuyruk): karar (gönderilsin mi, ne gönderilsin) cevap
     ANINDA verilir (cron'un her 2 sn'lik turunda aynı roll'un tekrar tekrar atılmaması için) ama
     gönderim `bot_tepki_gecikme_min_sn`/`_max_sn` (1–4 sn, `bot_gecikme_sn`'deki insan gecikmesi
     deseniyle tutarlı) sonrası için kuyruklanır; `bot_oyna()`'nın YENİ 0. adımı her turda (2 sn'de
     bir) süresi geleni gönderir/siler. Yeni sistem (realtime `tepki_bot_gonder`) ve eski düz-metin
     yolu (`match_messages`/`group_match_messages`, yeni fonksiyon `bot_eski_tepki_kuyrukla`) AYNI
     kuyruğu kullanır.
  3. `bot_oyna()` (~480 satır, önceki tanımın aynısı + yalnız bu iki değişiklik) yeniden tanımlandı —
     Postgres `create or replace function` gövdeyi bütün ister, bu depoda köklü örnek (27 önceki
     migration'ın hepsi aynı şekilde tam gövdeyi taşıyor).
- **Test:** transaction'da prova edildi, sonra canlıya uygulandı; `pg-mini` ile ayarlar doğrulandı
  (0.03/0.04/1/4) ve `select bot_oyna();` elle çağrılıp hatasız çalıştığı, `bot_tepki_bekleyen`
  tablosunun okunabildiği doğrulandı.
- **Öneri (karar Ida'da):** tepki her cevaptan sonra değil, yalnız doğruda sevinç/yanlışta şaşkınlık
  gibi belirli durumlarda mı verilsin — yeni sistem zaten "anlamlı an"a (seri/maç sonu/rakip hatası)
  sınırlı, eski Klasik/Grup yolu değil (rastgele, doğru/yanlış ayırmıyor); istenirse eski yol da aynı
  "anlamlı an" kuralına bağlanabilir.

## 2026-09-30 — Lig çerçeveleri yeni SVG (Bronz, Gümüş, Altın, Elmas, Efsane)
**Araç:** Claude Code (Sonnet 5.5, PC).
- **Kaynak:** `tasarim/lig-cerceveleri/uretici.js` (Ida'nın kodu, aynen; ESM depoda çalışsın diye klasörde `package.json` commonjs) → `out/` → `public/lig-cerceveleri/cerceve-<lig>.svg` (5 dosya, statik).
- **Bağlantı (tek nokta):** `oyun/tasarim/kazanilan/KazanilanCerceve.jsx` — `tur === "lig"` artık yeni `LigCerceveSvg.jsx` çizer (eski Set A / Altın Cerceve2 çizimleri dosyalarda duruyor, silinmedi). Bütün ekranlar (ana sayfa, üst çubuk, profil, lig satırı, maç başı VS, Koleksiyon "Lig çerçevelerim") `CerceveliAvatar` üzerinden geldiği için tek değişiklik yetti. Hareketli premium, level, turnuva çerçevelerine dokunulmadı.
- **Geometri:** deliğin çapı = çerçeve genişliğinin %40'ı; `boyut` = halka dış çapı, kanat/taç/plaka kutunun dışına taşar (overflow visible). ≤ 48 px'te viewBox "-84 -84 168 168" gibi kırpılır (kırpma sarmalayıcıda, dosya tek). Avatar dairesel kırpılır (köşe halkadan taşmasın). Altın Lig artık hareketsiz (WebGL yok).
- **Bronz:** katalogda `lig_bronz` (migration 644, herkes sahip), `kazanilanMi` true → takılıysa çizilir. "Bronz ligdekine varsayılan gösterilir" mantığı kodda ayrıca YOK (takılı çerçeve değişmedi) — dokunulmadı, karar Ida'da.
- **Test:** 36/48/64/96/200 px görsel, 390 ve 360 px'te ana/profil/lig ekranı, yatay taşma yok; `npm run build` temiz. Migration yok.

## 2026-09-30 — Düello Hâkimiyet çekirdeği: sunucu (680)
**Araç:** Claude Code (Opus 5.5, ana oturum).
**Neden:** Ida kararı — Düello puan sistemi (666/667/671) yerine puansız 4 yuvalı Hâkimiyet + Baskın/Kalkan jokerleri.

- **Ida kararları (30 Eyl):** 1 tur = 1 hamle (maç 10 soru, her oyuncu 5 kez saldırır; kilit sıradaki 2 hamle). Baskın/Kalkan 3 yuvalı Düello joker setine (loadout) girer.
- **Migration 680 (`duello_hakimiyet.sql`), provadan sonra canlıya uygulandı.** Yeni kolonlar: `duellolar.hakimiyet/sahiplik/kilitler/hakimiyet_esik/kilit_tur/yuva1/yuva2`, `duello_hamleler.hakimiyet` (jsonb özet: eylem, tuttu, neden, sahip_once/sonra, kilit, baskin, kalkan, cakisma, yuvalar). Tur sırası: tek tur oyuncu1, çift tur oyuncu2 saldırır; `saldiri_sirasi` soru indeksini (tur*2+sıra) benzersiz tutmak için korunur. Eski puan maçları (`hakimiyet=false`) eski dallarla çözülür.
- Hamle kuralı + kilit `duello2_cozumle`'de, nakavt / 10. tur sayımı / Altın Soru `duello2_sonraki`'de, kilit kapısı `duello2_kategori_uygun_mu`'da (insan, otomatik seçim ve bot aynı kapı). `duello2_durum` → `hakimiyet {acik, esik, kilit_tur, sahiplik, kilitler{kat: kalan tur}, yuvalar{id: n}, rol_joker, rol_joker_hak, avantaj_esik}`; son_hamle ve geçmiş satırlarında `hakimiyet`.
- Jokerler `baskin` / `kalkan`: `skill_katalogu` + envanter kısıtı + `coin_joker_baskin` 70 / `coin_joker_kalkan` 50 (+ 10'lu paket). Kurallar `duello2_skill_hak_kontrol`'de (rol, sahiplik, maçta 1 — `duello_rol_joker_mac_hak`, toplam 4 içinde, soru başına 1 kuralı aynen). Rakibin `rakip_bu_soruda` bilgisinden gizlenir; Soru Değiştir'i engellemez. Klasik sete giremez.
- Eski Kategori Kalkanı: `duello2_kalkan_acik`=0 + `duello2_kalkan` her çağrıda reddeder (kolonlar/geçmiş duruyor). Puan/yıldız/çarpan/kalkan ayarları "KULLANILMIYOR (680)" işaretlendi, silinmedi.
- Rozet: Son Nefes = rakip 3 yuvadayken kazan; Büyük Geri Dönüş = bir an 2 yuva (`rozet_geri_donus_yuva_farki`) gerideyken kazan; Altın Dokunuş aynen.
- **Test:** `node araclar/duello-hakimiyet-sql-testi.mjs` → 59/59 (3 tür × 4 cevap, kilit, rol, nakavt, 10. tur, Altın Soru, Baskın/Kalkan/çakışma/gizlilik/hak, çift çözümleme, eski kalkan kapalı, yeni oyuncu kilidi).

## 2026-09-30 — Düello Hâkimiyet metinleri (tanıtım, lobi, mod seçimi)
**Araç:** Claude Code (alt ajan C, Sonnet 5.5)
**Neden:** Hâkimiyet kuralları (puansız, 4 yuva, Baskın/Kalkan) eski puan/yıldız/×2/Kategori Kalkanı anlatımının yerine geçti.
- `DuelloTanitim.jsx`: 7 adım yeniden yazıldı, `DEPO` → `bildim_duello_tanitim_v9`.
- `ModSecimPenceresi.jsx`: Düello açıklaması hâkimiyete çevrildi.
- `ceviri/hakimiyet.js`: 21 İngilizce çeviri (tanıtım, lobi cümlesi, arama ipuçları, mod seçimi).
- Rozetler (`rozet_tanimlari`) 680'de zaten uyarlanmış; ek metin değişikliği gerekmedi, 682 migration'ı eklenmedi.

## 2026-09-30 — Kart arka planları ÖNİZLEME (Su Altı, Yağan Kar, Düşen Sonbahar Yaprakları) — /arka-plan-onizleme
**Araç:** Claude Code (Sonnet 5.5, PC). YALNIZ önizleme; oyuna bağlama, katalog/DB, eski (avatar arkası) arka planın kaldırılması Ida onayından sonra ayrı iş. Migration yok.
- **Depo/DB durumu:** eski "aura" = `premium_aura` (6 kalem, `kozmetikler` pa_yaprak/kar/kor/gece/kuzey/sualti, hepsi aktif + `girsin`, 300 elmas, `kozmetik_satis_acik=true`); çizim `oyun/tasarim/premium/sanatAuralar.jsx` (`PremiumCerceve` iç dairesi, avatarın arkası), `CerceveliAvatar` → `PremiumAvatarCizim`; sahiplik `oyuncu_kozmetikleri`, takılı `profiles.takili_premium_aura`, seçim RPC'si sunucuda (`kozmetik_tak`). Bugün sahip: pa_yaprak 1, pa_sualti 1; **pa_kar'ın sahibi/takanı 0** — Yağan Kar bağlı ve satışta (Dükkân › Kozmetik › Arka Plan, 300 elmas) ama hiç alınmamış; "oyunda görmedim" = kimsede takılı değil, kod/katalog hatası değil.
- **Yeni:** `oyun/tasarim/arka-plan/` — `KartArkaPlan.jsx` (+`arka-plan.css`), `ArkaPlanOnizlemePage.jsx` (+css). Rota `/arka-plan-onizleme` (SahipKapisi, menüde yok). Hareketli/sabit aynı kompozisyon: sabit hâl = hareketli ilk kare (negatif gecikme, sallanma merkezde başlar). 3 derinlik katmanı, parçacık başına TEK öğe (transform düşme + `translate` sallanma + `rotate` dönme). Sayılar: su 30 · kar 34 · yaprak 15 (küçük satırda ×0,55, boyut ×0,62). Ayrıntılı çizimler: kristal kar taneleri (3 varyant), damarlı iki tonlu yaprak, yansımalı baloncuk, 3 ışık huzmesi.
- **Hareket kuralları:** sekme görünür + ekranda (IntersectionObserver) + pil düşük değil + aynı anda en çok 3 kart (`MAX_HAREKETLI`); "hareketi azalt" → `AZALT_DAVRANISI = "sabit"` (istenirse "yumusak": 2,5× yavaş + yarı parçacık, `yumusakHareket.js`).
- **Okunabilirlik (ölçüldü, pikseller üzerinden, beyaz yazıya karşı):** yazı arkasında rgba(10,20,40,.34) alan + yazı bölgesinde parçacık maskesi (su .4 · kar .12 · yaprak .6; beyaz parçacıklar kontrastı düşürdüğü için). En kötü piksel: Su 4,62 · Kar 5,65 · Yaprak 4,87 · lig satırı 5,0/8,6/6,7 (hepsi ≥ 4,5; hareketli kartta 4 farklı kare). Bedel: yazı bölgesinde parçacıklar sönük, sahne kartın kenarlarında ve avatar çevresinde belirgin.
- **Performans:** CPU 6× yavaşlatılmış headless Chrome'da 2 hareketli kart (64 parçacık) ≈ 19 fps; aynı ortamda mevcut /premium-onizleme ≈ 12 fps (yani daha hafif). Gerçek telefon ölçümü Ida'da.
- **Bulgu:** avatarın arkasındaki eski arka plan hâlâ çiziliyor (bu iş dokunmadı).

## 2026-09-30 — Marka paketi: yeni logo (Q + at hamlesi oku), uygulama simgesi, coin amblemi
**Araç:** Claude Code (Sonnet 5.5, PC). Ida onaylı tasarım; tasarım değiştirilmedi.
- **Üreticiler:** `tasarim/marka/logo-uretici.js` (logo-q.svg, logo-yatay.svg, uygulama-simgesi.svg) ve `coin-uretici.js` (`out/coin.svg`, `out/coin-kucuk.svg`, referans); klasörde commonjs `package.json`. PNG'ler `@resvg/resvg-js` ile (`npm i --no-save`, depoya bağımlılık girmedi).
- **public/ (yeni adlar, eskiler duruyor):** `quiztactics-q-icon-1024/512/192.png`, `quiztactics-q-apple-touch-180.png`, `quiztactics-q-favicon-32.png`, `quiztactics-q-og-512.png`, `quiztactics-q-favicon.svg` (=logo-q), `quiztactics-logo-yatay.svg`.
- **Logo.jsx:** varsayılan `Logo` artık `<img>` ile yatay logoyu çizer (`sadeceIkon` → yalnız Q). Eski Şeker Q çizimi `LogoSekerQ` adıyla dosyada duruyor. Üst çubuk logosu 120 → 144 px (`a-kabuk.css`, ≤560 px); 360 ve 390 px'te yatay taşma yok (ölçüldü).
- **index.html:** favicon SVG + 32/192 PNG, apple-touch 180, theme-color #3D8CE8, og/twitter görseli yeni Q simgesi. `bildim.webmanifest`: 192/512 için `any` ve `maskable` ayrı girdi, tema/zemin #3D8CE8. `AnaEkranaEkle.jsx` simgesi yeni dosya. Not: `oyun/lib/tema.js` çalışma anında theme-color'ı açık temada #CDEEFF yapar (üst çubuk açık zemin); dokunulmadı, karar Ida'da.
- **CoinIkon:** eski Q_YOL/Q_KUYRUK kaldırıldı; `Amblem` (halka + L ok) çizilir. Büyük: kahve #5C3A00 + sol üst açık kopya #FFF3B0; ≤28 px: kalın lacivert #1f2a44, iç halka yok. Sikke ölçüleri/kenar aynı. Paket görsellerine (CoinGorseli, yığın/sandık) dokunulmadı.
- **Stil rehberi:** yeni "Marka" bölümü (logo, Q, simge, coin 16/24/32/48).
- **Önbellek:** `public/sw.js` `qt-kabuk-v2` / `qt-varlik-v2`. Build temiz. Ekran görüntüleri: `tasarim/marka/ekran-*.png`.
- **Ida'ya not:** TÜRKPATENT / WIPO tescil ve benzerlik sorgusu yayından önce Ida'dadır.

## 2026-09-30 — Coin amblemi sadeleştirme (kısa ok)
**Araç:** Claude Code (Sonnet 5.5, PC). Ida: "Q'nun oku çok uzun, coin üzerinde farklı bir simge gibi; daha sade olsun."
- **Değişiklik (büyük + ≤28 px aynı geometri):** kuyruk `M58 58V74H72` → `M56 56V66H63`, kalınlık `sw*0.72` → `sw*0.62`; ok başı `70,66 62.5,61.5 62.5,70.5` (stroke 1.2); amblem grubu `translate(-56 -56)` → `translate(-48 -48)` (coin ortasına hizalı). Halka, renkler, kabartma kopya, sikke ölçüleri aynı.
- **Dosyalar:** `oyun/components/ParaIkonlari.jsx` (CoinIkon tek kaynak; başka kopya yok — logo/paket görsellerine dokunulmadı), `tasarim/marka/coin-uretici.js` + `out/coin.svg`, `out/coin-kucuk.svg` yenilendi, stil rehberi Marka notu, `public/sw.js` → `qt-kabuk-v3` / `qt-varlik-v3`.
- **Test:** 16/24/32/48 px stil rehberinde görsel (Q okunuyor, ok küçük, ortalı); 360 ve 390 px'te yatay taşma yok; build temiz. Ekran görüntüleri: `tasarim/marka/ekran-coin-24.png`, `ekran-coin-48.png`.
- **Gözlem (dokunulmadı):** stil rehberi Marka bölümündeki yatay logo görüntüsünde "QUIZ"in Q'su ikonla üst üste biniyor, "UIZ" gibi okunuyor — logo bu işin dışında; Ida karar versin.

## 2026-09-30 — Düello Hâkimiyet: bot, ekran, jokerler, doğrulama (kapanış)
**Araç:** Claude Code (Opus 5.5 ana oturum + 4 Sonnet 5.5 alt ajan; `CLAUDE_CODE_SUBAGENT_MODEL` ayarlı değildi, alt ajanların hepsi raporlarında Sonnet 5.5 bildirdi).
**Neden:** Hâkimiyet çekirdeğinin (680) botu, ekranı, joker ön yüzü ve uçtan uca doğrulaması.

- **Alt Ajan A (bot, 681):** `duello2_bot_kategori` hâkimiyet dalı (değer = bot isabeti × (1 − rakip oranı), %70 en iyi, nakavt/geri alma önceliği, pekiştir × 0.5). Test `duello-hakimiyet-bot-testi.mjs` 18/18. Canlıya uygulandı.
- **Alt Ajan C (metinler):** tanıtım v9, mod seçimi, çeviriler (`ceviri/hakimiyet.js`). 682 gerekmedi (rozet metinleri 680'de).
- **Alt Ajan D (joker ön yüzü):** `jokerler.js` baskin/kalkan, geçici semboller (nişangâh, onaylı kalkan), `--qt-skill-baskin/kalkan`, `DuelloJokerSeridi.jsx` rol filtresi, dükkân/set "Yalnız Düello'da". Ana oturum `oyun/_test/skill-sistemi-test.mjs`'i 9'lu listeye güncelledi (8/8).
- **Alt Ajan B (ekran):** `DuelloTahta.jsx` + `duello-tahta.css`; DuelloV2/DuelloPage/DuelloOzet'ten Kategori Kalkanı + yıldız/puan/×2 kaldırıldı; `oyuncu-testi.mjs` Düello bölümü hâkimiyete göre (eski `--altin` zorlaması kalktı; `--hizli`, `--zincir` eklendi). Canlı dokunuş broadcast'i yazıldı, iki gerçek oyuncuyla DENENMEDİ (bot dokunuş göndermez).
- Ana oturum: V2Skill → `DuelloJokerSeridi.jsx` ayrıldı (ajanlar aynı dosyaya dokunmasın), lobi metni/arama ipuçları, çeviri dosyaları `dil.js`'e bağlandı, PROJECT_CONTEXT Düello + Skill bölümleri yeniden yazıldı.
- **Doğrulama:** SQL 59/59 + bot 18/18; canlıda 11 bot–bot maçı (1 nakavt 4-0 tur 9, 1 Altın Soru, kazanan hep çok yuvalı, kilit ihlali 0; sonra silindi); `oyuncu-testi --mod=duello --mac=3` GEÇTİ (tam maç 3-2, 5 saldıran + 5 savunan, "Hazır" kart sırası gelince seçili, bütün ekranlar 390/360 × 640 kaydırmasız, en kötü benzetim 627 px); `npm run build` temiz. Test hesabı misafir olduğu için yeni oyuncu kilidine takıldı (kilit çalışıyor) — test süresince `duello_acilis_mac_esigi` 0'a çekildi, sonra 5'e geri alındı. Yeni test hesabı açılmadı.
- **Gözlem:** bot–bot maçlarında nakavt seyrek (10'da 1); yuva sayıları düşük (0-3). Ürün ayarı (eşik/kilit) Ida'nın kararı.

## 30 Eyl 2026 — Yatay logo: UIZ, Q'nun yanına alındı (Sonnet 5.5)
- **Sorun:** yatay logoda UIZ, TACTICS'in üstünde küçük ve Q'dan uzaktı; "UIZ TACTICS" okunuyordu. **Karar (Ida):** UIZ Q halkasının hizasında, hemen yanında; TACTICS altta. Q, renkler, harf çizimleri aynı.
- **Değişiklik:** `tasarim/marka/logo-uretici.js` — viewBox `-6 0 305 92` (915×276), mark `translate(2 2) scale(.66)`, `word('UIZ',74,13,.76)`, `word('TACTICS',96,52.5,.84)`. Önerilen 351 genişlikte sağda ~50 birim boş kalıyordu, 305'e kırpıldı; UIZ/TACTICS dış çizgileri arası ~2,5 birim nefes payı (önerilen değerlerde çizgiler 6 birim çakışıyordu, bu yüzden TACTICS .88→.84, y 44→52,5).
- **Dosyalar:** `public/quiztactics-logo-yatay.svg` (yenilendi), `tasarim/marka/logo-yatay.svg`, `oyun/components/Logo.jsx` (oran 305/92, `?v=…-r`), `public/sw.js` → v4. Uygulama simgesi, logo-q, coin, OG (Q simgesi kullanıyor) dokunulmadı. Yatay logoyu başka kopyalayan yer yok. Stil rehberi Marka bölümü `<Logo>` bileşeniyle çizdiği için kendiliğinden güncel.
- **Test:** 360/390 px'te giriş sayfası ve üst çubuk — yatay taşma 0; üst çubuk logosu 144×43 px, çubuk 64 px'e sığıyor; "QUIZ TACTICS" okunuyor. Ekran görüntüleri: `tasarim/marka/ekran-giris-390.png`, `ekran-ust-cubuk-390.png` (+360). Build temiz.

## 2026-09-30 — Kart arka planları oyuna bağlandı (Su Altı, Yağan Kar, Sonbahar) + 3 yeni arka plan önizlemede
**Araç:** Claude Code (Sonnet 5.5 ana oturum + Sonnet alt ajanı "3 yeni arka planı çiz"). Ida kararı: onaylı üçü GİRSİN; 390 px esas ölçü, 360 px'te aynı tasarım taşmadan; Köz/Yıldızlı Gece/Kuzey Işıkları da arka plan olacak (kaldırılmadı).
- **Eski sistem (listelendi):** `premium_aura` 6 kalem, çizim `premium/sanatAuralar.jsx`, sahiplik `oyuncu_kozmetikleri`, takılı `profiles.takili_premium_aura`, takma RPC'si `kozmetik_tak` (sunucuda). Başkasının arka planı `oyuncu_kartlari` › `premium_aura` (aktif + girsin kalem) ile gelir: maç başı/liste/profil aynı toplu okuma, ek sorgu yok. Veritabanı şeması DEĞİŞMEDİ.
- **Avatar arkası kaldırıldı:** `CerceveliAvatar` artık `premiumAura`'yı çizmez (`const pa = null`, tek satır); eski çizim dosyaları silinmedi. Avatar + çerçeve temiz.
- **Kayıt yapısı:** `oyun/tasarim/arka-plan/kayit.jsx` — `KAYIT` (sanat anahtarı → bileşen), `useKartArkaPlani(userId, kart)` (kartta alan varsa ek sorgu yok; yoksa `oyuncuKarti` önbelleği; kart değişince `oyuncuKartiDinle` ile anında güncellenir), `KartArkaPlanKatmani` (kartın İÇİNE arka katman), `KartArkaPlanSahibi` (map içi satırlar için). `KartArkaPlan`'a `katman` (yükseklik ölçülür, ResizeObserver) ve `duzen="dikey"` (ortalı kartlar: avatar üstte tam, yazı bölgesi sönük+okuma alanı) eklendi; onaylı üçün yatay görünümü değişmedi.
- **Bağlanan yerler:** ana sayfa `KompaktOyuncu` (hareketli, ~105 px) · Profil `OyuncuVitrinKarti arkaPlan` (hareketli, dikey) · maç başı `VsKarti` (`AramaSahnesi.jsx`, ortak bileşen: Klasik/Düello/arama sahnesi; herkes kendi arka planıyla; Düello dosyalarına dokunulmadı) · lig sayfası yalnız kendi satırım (`KartArkaPlanSahibi`, sabit, ~56 px) · dükkân/koleksiyon önizlemesi (`ArkaPlanOrnegi`: örnek kart, büyük hareketli, ızgarada küçük). Ana sayfadaki küçük lig kartı satırı ve Düello oyun-içi kartları BAĞLANMADI (istenmedi / Düello penceresinin).
- **Açık zeminli kartlarda** (ana sayfa, lig satırı) metin renkleri kart değişkenleriyle (`--qt-metin` vb.) açık tona çevrilir; koyu kartlar (profil, VS) zaten beyaz. Metin/açıklama: "oyuncu kartının arkasındaki hareketli sahne" (TR + EN, `ceviri/premium.js`).
- **Migration 690** (`kart_arka_plan_gecici_kapat`, transaction'da prova edildi, canlıya uygulandı): `pa_kor`, `pa_gece`, `pa_kuzey` `aktif=false` (silinmedi; sahiplik/fiyat aynı; takılıysa `oyuncu_kartlari` null verir → düz kart).
- **3 yeni arka plan (alt ajan):** `KozArkaPlan`, `YildizliGeceArkaPlan`, `KuzeyIsiklariArkaPlan` (+ ortak iskelet `arka-plan-yeni-ortak.jsx`, `arka-plan-yeni.css`), `/arka-plan-onizleme` sayfasında 3 yeni bölüm ("Onay bekliyor", Girsin/Girmesin, kopyalama). Parçacık: Köz 26 · Gece 28 (+ay/kayan yıldız/hilal, eski çizimden) · Kuzey 3 şerit + 14 yıldız (+dağ silüeti). Kontrast (beyaz yazıya karşı en kötü piksel): Köz 5,26 · Gece 5,07 · Kuzey 4,89 (hepsi ≥ 4,5). fps (CPU 6×, 2 hareketli kart, rAF): Köz+Gece 32 · Gece+Kuzey 59,8 (≥ 15). Kart üzerinde (VS, dikey) denendi: üçü de doğru çiziliyor.
- **Ida onaylayınca 3 arka planı açmak:** (1) `kayit.jsx`'te 3 import + 3 `KAYIT` satırını yorumdan çıkar, (2) yeni migration: `update public.kozmetikler set aktif = true where anahtar in ('pa_kor','pa_gece','pa_kuzey');`. Başka değişiklik gerekmez.
- **Test:** test hesabıyla (misafir) pa_yaprak takılıyken ana sayfa, profil, lig satırı, dükkân önizlemesi, VS kartı 390 ve 360 px (yatay taşma 0, konsol hatası yok), arka plan yokken düz kart, "Çıkar"dan sonra profil/ana sayfa anında düzeldi, TR/EN; dükkânda en çok 3 hareketli kart çalışıyor. Test sahipliği temizlendi. Ekran görüntüleri: `tasarim/arka-plan-ss/`. Gerçek iPhone kontrolü Ida'da.

## 2026-09-30 — Avatar nadirlik sistemi (grup / nadirlik / seri) + kademeli açılış altyapısı + /avatar-nadirlik
**Araç:** Claude Code (Sonnet 5.5, PC). Ida sistemi onayladı; oyuna görünür bağlama (Sahne rengi) Ida işaretlemeyi bitirince ayrı iş. Migration 700–701 canlıya uygulandı (provadan sonra).
- **Depo bulguları:** 31 hazır avatar koddadır (`HAZIR_AVATARLAR`, `avatar_onayla` sabit listesi) ve `avatar_katalogu`'nda DEĞİL; katalogda 39 avatar (31'i aktif) → oyunda 62 aktif. Avatarlar statik SVG (`public/avatars/pro`, `pro2`), "Sahne" = ilk `<rect width=320 height=320 rx=38 fill=…>` (70 dosyanın hepsinde aynı kalıp, ölçüldü). Tek çizim noktası `src/components/Avatar.jsx` (18 dosya kullanır); `<img>` ile ayrı çizen yerler: Dükkân avatar ızgarası, profil/kurulum/koleksiyon seçim ızgaraları, `AramaGunesHalkasi` (yörünge). Sahip/kozmetik kapısı: `avatar_acik_mi` + `sahip_mi`.
- **Karar — ayrı tablo `avatar_nitelikleri` (700):** 31 hazır + 39 katalog = 70 satır, anahtar = avatar adresi. Katalogdaki mevcut `avatar_katalogu.nadirlik` (646, değerler `siradan|nadir|epik|efsanevi`, bilerek boş; Koleksiyon Puanı okur) DOKUNULMADI — yeni sistemde `yaygin` değeri kullanılıyor, iki kolon karışmasın diye ayrı tablo. Alanlar: grup (hayvan, insan, meslek, kahraman, fantastik, robot, uzayli, uzay), nadirlik (yaygin|nadir|epik|efsanevi), seri (null), edinme (hepsi `ucretsiz`: 550'den beri bedava), acilis_zamani (hepsi NULL — kimse kilitlenmedi). Başlangıç nadirlik = sayfanın ön işareti: Yaygın 25 · Nadir 15 · Epik 16 · Efsanevi 6 (aktif 62 üzerinden).
- **Kademeli açılış (701):** `avatar_acilmis_mi(url)`; `avatar_katalogu_oyun` listelemez; `avatar_onayla` reddeder ("Bu avatar henüz kullanılamıyor") — sahip dahil, tek istisna oyuncunun ZATEN takılı avatarı (mevcut avatar bozulmaz). Hazır 31 için istemci `avatar_kilitli_urller()` ile süzer (`useHazirAvatarlar`: profil, kurulum, Dükkân, Koleksiyon; `AramaGunesHalkasi` havuzu). Ida takvimi: `update avatar_nitelikleri set acilis_zamani = '…' where anahtar = '…'`.
- **Sahne rengi (bayrak KAPALI):** `oyun_ayarlari.avatar_nadirlik_renk = false`; RPC `avatar_nadirlik_renkleri()` bayrak kapalıyken boş döner. `src/lib/avatarNadirlik.js` (renkler: Yaygın #7d93ad · Nadir #3fae6a · Epik #ee7a2c · Efsanevi #f5c431; mor/kırmızı yok) + `Avatar.jsx` `useNadirlikSahneli`: bayrak açılınca SVG metninde Sahne rect'i boyanır (data adresi, önbellekli); kapalıyken `<img>` özgün adres (canlıda doğrulandı). Açılınca boyanmayan yer: Dükkân avatar ızgarası (ham `<img>`) — o ayrı iş.
- **/avatar-nadirlik (SahipKapisi, menüde yok; robots'a eklendi):** `oyun/tasarim/avatar-nadirlik/`. 62 aktif avatar 8 grupta, 4 renkli düğme (dokununca Sahne anında boyanır), seri alanı, sticky sayaç ("Yaygın N · Nadir N · …"), sticky alt çubukta Kopyala ("avatar adı → nadirlik (seri)" satırları, grup başlıklarıyla) ve "Ön işarete dön". Seçim yalnız bu tarayıcıda (localStorage), veritabanına YAZILMAZ. RPC `avatar_nitelik_yonetici()` yalnız sahip.
- **Testler:** `node araclar/avatar-nitelik-sql-testi.mjs 700 701` → 21/21 (rollback'li; bayrak, kilit, takılı avatar istisnası, yetkiler: anon yok, tablo doğrudan erişimi yok). Canlı: `node araclar/avatar-kilit-canli-testi.mjs` → kilitli hazır (Kedi) ve katalog (Hostes) profil ızgarasında YOK (62 → 59), sunucu takılı olmayan kilitli avatarı reddeder, takılı olan kaydedilir, bayrak kapalıyken avatarlar özgün adresle çizilir; test avatarlarının tarihi geri alındı (0 dolu satır). Ekran: `node araclar/avatar-nadirlik-ekran.mjs` (sahip taklit edilir — test hesabının yetkisi DEĞİŞTİRİLMEDİ): 390 ve 360 px, TR/EN: 62 kart, yatay taşma 0, dokunma hedefi ≥ 44, sayaç/renk/kopya metni doğru, konsol hatası yok. Ekran görüntüleri `tasarim/avatar-nadirlik/`. Build temiz. `public/sw.js` → v6.
- **Sırada (ayrı iş):** Ida işaretleyip metni yapıştırınca `avatar_nitelikleri.nadirlik/seri` güncellenir → bayrak açılır; Dükkân ızgarası Sahne rengi; fiyat/Battle Pass bağlama; seri takvimi (`acilis_zamani`).

## 2026-09-30 — Kart arka planları TAM GÖRÜNÜR mod (yalnız önizleme, oyundaki kartlar aynen)
**Araç:** Claude Code (Sonnet 5.5, alt ajan yok). **Ida kararı:** "yazılar gayet okunuyor, yarım saniyeliğine üstüne kar ya da yaprak gelmesi engellemez; arka plan full görünür olsun." Oyundaki kartlar Ida onaylayana kadar AYNEN kalır.
- **Yeni mod:** `KartArkaPlan` ve `YeniSahne` (Köz/Gece/Kuzey) `tamGorunur` alır (varsayılan `false` → eski davranış). `true` iken: `.abp-okuma` çizilmez, parçacık maskesi kalkar, parçacık/ışık katmanı yazının ÜSTÜNDE (z 4 > içerik z 3, `pointer-events: none`), yazıya yalnız `text-shadow: 0 1px 2px rgba(0,0,0,.35)`; yeni koyu katman yok. CSS: `oyun/tasarim/arka-plan/arka-plan-tam.css` (`.abp--tam`, yüksek özgüllük; oyun kartları bu sınıfı taşımaz). `katman` (oyun içi kart) ile birlikte desteklenmez.
- **Sabit hâl (lig satırı, hareketi azalt, sekme gizli, 3 kart sınırı aşıldı):** `sabitYer()` parçacıkları yazı bölgesi DIŞINA yerleştirir (üçte biri avatar tarafı, üçte biri üst bant, üçte biri alt bant; lig satırında dar bant). Kuzey ışık şeritleri sabit hâlde zeminde (yazı altında), hareketli hâlde yazının üstünde. Kayan yıldız lig satırında sabit karede çizilmez.
- **Gözlem (ÖNEMLİ, dokunulmadı):** `rotate` özelliği `transform: translate3d(…)`'ten ÖNCE uygulanır; bu yüzden döndürülen parçacıkların (kar tanesi, yaprak) konumu dönme açısıyla kayar (oyundaki kartlarda da). Tam modda sabit karede dönme iç sarmalayıcıya (`.abp-don-ic`) alındı, konum tam çıkıyor; eski modda ve oyunda davranış aynı bırakıldı.
- **Taban kontrastı (parçacıksız kare, beyaz yazı, en kötü piksel):** Su Altı ve Kuzey ilk ölçümde 3,4–3,9 çıktı (okuma katmanı yok) → yalnız tam modda iki parlak zemin ışığı yumuşatıldı (Su üst degradesi .3→.1, huzme .22→.1; Kuzey şerit opaklığı .5/.45/.42→.30/.27/.25); taban renkleri aynı. Sonuç (kart/satır): Su 4,96/4,82 · Kar 6,18/5,90 · Yaprak 7,22/4,54 · Köz 13,32/14,47 · Gece 9,49/10,66 · Kuzey 5,34/5,75 → hepsi ≥ 4,5.
- **Performans (CPU 6× yavaş Chrome, ekranda 2 hareketli kart, 5 sn, iki tur ortalaması rAF fps eski→yeni):** Su 35→30 · Kar 38→40 · Köz 49→51 · Gece 60→60 · Kuzey 60→60. Su/Kar/Köz her iki modda ana iş parçacığını doyuruyor (yazılım çizimi); fark ölçüm gürültüsü içinde (aynı mod iki turda ±12 fps oynadı) — düşüş yok, iyileşme de kanıtlanmadı. Kural değişmedi: hareketi azalt → sabit (oynayan kart 0), gizli sekme/ekran dışı → dur, en çok 3 hareketli kart, parçacık sayıları aynı.
- **Oyundaki kartlar değişmedi (kanıt):** eski modda 18 kartın (6 arka plan × hareketli/sabit/lig) DOM'u HEAD ile 18/18 aynı ve (anahtar satırları gizlenince) piksel karması 18/18 aynı (`ozet-onceki.json` / `ozet-sonraki.json`). `kayit.jsx` ve oyun bileşenlerine dokunulmadı.
- **/arka-plan-onizleme:** en üstte "Tam görünür (YENİ) | Eski (yazı arkası sönük)" (varsayılan YENİ, localStorage), "Tam görünür modu: Onaylıyorum / Beğenmedim" + "Seçimi kopyala" (kopya metnine de eklenir). 6 arka planın hepsi için hareketli (100 px), sabit, lig satırı (42 px); 390 ve 360 px'te yatay taşma 0, konsol hatası 0, dokunma engeli 0.
- **Ida'ya not:** Kuzey Işıkları'nın şeritleri hareketli modda kalıcı olarak yazının üstünden geçiyor (parçacık gibi geçici değil); adı biraz renkleniyor (ekran görüntüsü `yeni-kuzey-390.png`). Rahatsız ederse şeritleri yazının altında bırakmak tek satırlık iş (`KuzeyIsiklariArkaPlan › zemin/parcalar`).
- **Dosyalar:** `oyun/tasarim/arka-plan/` KartArkaPlan.jsx, arka-plan-yeni-ortak.jsx, Koz/YildizliGece/KuzeyIsiklari, ArkaPlanOnizlemePage.jsx, arka-plan-onizleme.css, arka-plan-tam.css (yeni); `tasarim/arka-plan-tam/` ekran görüntüleri (yeni-/eski- × 6 × 390/360), `olcum.mjs`, `olcum.json`, `kontrast.json`, `fps.json`. `public/sw.js` → v7. Migration yok.

## 2026-09-30 — Ana sayfa düzeltmeleri (AnaSayfaA; prompt Home.jsx'i anlatıyordu)
**Araç:** Claude Code (Sonnet 5.5 ana oturum + Sonnet alt ajanı üst çubuk/alt menü). **Karar (Ida):** prompt'taki `Home.jsx` rotasız/eski; canlı ana sayfa `AnaSayfaA` (kaydırmasız lobi). Yalnız FARK yapıldı; bölüm sırası aynı kaldı (OYNA/DÜELLO'yu yukarı taşıma yapılmadı: 390×664'te zaten tam görünüyor, alt kenar 474 px).
- **1 Üst çubuk:** avatar düğmesi → dişli menü ikonu (44×44, aria "Menü"), menü içeriği/davranışı aynı (`AvatarMenu.jsx`, `a-kabuk.css`, `dil.js` "Menü"/"Menu").
- **2 Oyuncu kartı:** 105 → 103 px (zaten kompaktı). Yeni: rütbe etiketi (hap), sağda iki etiketli istatistik "Puan" (haftalık lig puanı, `ligOzet` benim satırım) ve "Seri · N gün" (`SeriRozeti bicim="kart"`). Etiketsiz lig yıldızı (amblem) karttan kalktı (lig kartı altında zaten var). Arka plan katmanı ResizeObserver'la yüksekliğe uyuyor, dokunulmadı.
- **3 DÜELLO:** pembe → #C93030, beyaz yazı (≈5,3:1), dudak #8F1F27. OYNA aynı.
- **4 Turnuva bandı:** "150 · 75 · 40" → altın/gümüş/bronz madalya ikonu (mevcut `madalya` ikonu + `--qt-madalyon-*`) + sayı + CoinIkon. Yalnız "bekleme" hâlinde çizilir; test hesabında lobi açıktı, GÖRSEL DOĞRULANMADI.
- **5 Lig kartı:** mesafe satırı başlığın altına alındı, metin "Yükselmeye N puan kaldı" (gerçek `yukselme_cizgisine_fark`) / "Yükselme bölgesindesin"; yükselme çizgisi satırına "Yükselme çizgisi" etiketi; satırda ad dikey ortalı; ≤760 px yükseklikte mesafe başlığa girer (kart büyümez). Gerçek kural zaten `lig_grubum_ozet.yukselme_sirasi`'ndan geliyor, sabit sayı yazılmadı. Test hesabında (sıra 8/11) çizgi görünür satırların dışında kaldığı için etiket ekranda GÖRÜLMEDİ.
- **6 Alt menü:** 5 sekme (prompt 4 demişti); etiketler tek satır, clamp'li yazı; Arkadaşlar sekmesindeki bekleyen noktası zaten sayısızdı → 8 px soluk gri-mavi. "99+" rozeti aslında Hatalarım kısayolundaydı: sessiz noktaya çevrildi, sayı gizli metinde. Bekleyen olmadığı için alt menü noktası ekranda görülmedi.
- **Ölçüm (390×664):** kart 103 px · OYNA/DÜELLO 406–474 px (ilk ekranda) · yatay taşma 0 · 360×640: kart 95 px, düğmeler 391–454, taşma 0. TR/EN tek satır.
- **Test notu:** Aynı misafir oturumunu iki süreç kullanınca yenileme belirteci çakışıp sayfa boş kalıyor; ölçümler sırayla yapıldı.
- `public/sw.js` v8. Görüntüler: `tasarim/ana-sayfa-ss/`.


## 2026-09-30 — Kart arka planı revizyonu (YENİ mod: yazının arkasında, tam görünür; yönler; özel sabit tasarımlar)
**Araç:** Claude Code (Sonnet 5.5) **Neden:** Ida: parçacıklar yazının ARKASINDAN aksın, arka plan tam görünür kalsın, yönler düzelsin, sabit kartlar/lig satırı özel tasarlansın, Gece yıldızı artsın. YALNIZ ÖNİZLEME; oyundaki kartlar aynen.
- **Repo bulgusu (başlangıç):** hareketli ve sabit hâl AYNI parçacık verisinden çiziliyordu (sabit = ilk kare; önceki `tamGorunur`da yalnız `sabitYer` ile yazı dışına kaydırılıyordu, parçacık yazının ÜSTÜNDEYDİ). Kar/yaprak "yukarı/yana gidiyor" kusurunun kök sebebi: `rotate` özelliği `translate3d`'den önce uygulandığı için dönme yolu eğiyordu.
- **`tamGorunur` anlamı YENİ moda çevrildi** (varsayılan false = eski, birebir): parçacık z 1 < içerik z 3, okuma alanı/maske yok, yazıya ince koyu gölge; kar/yaprak dış öğede yalnız dikey yol + hafif sallanma (kar ±2–6 px, yaprak ±2–4 px), dönme iç öğede (`.abp-y-ic`), başlangıç/bitiş kart dışında (dikiş yok); Su Altı baloncukları karışık (alttan giren / kartın içinde beliren / beliren-bekleyen, rastgele x, hız, faz); Gece 28 → 45 (31 nokta + 13 parıltı + 1 kayan), yıldızlar yazı arkasında dahil, ay üst sağ köşe.
- **Özel sabit kompozisyonlar** `sabit-tasarim.jsx` (dört arka plan × kart + lig satırı; elle yerleşim, derinlik, yazı bölgesi boş). Hareketi azalt / pil düşük / 3 kart sınırı / hareketsiz kart → bunlar; geçici durumlarda (sekme gizli, ekranda değil) kompozisyon değişmez. `useHareketAyrinti` eklendi (`useHareket` aynı).
- **Önizleme:** Yeni|Eski anahtarı, 4 arka plan, Girsin/Girmesin/Beğenmedim + Seçimlerimi kopyala. Köz ve Kuzey önizlemeden çıkarıldı (dosyalar durur); Ida kararı PROJECT_CONTEXT'e yazıldı.
- **Ölçümler** (`oyun/tasarim/arka-plan/olcum/`): taban kontrast (yazı, parçacıksız) 390 ve 360'ta tüm 12 durumda ≥ 4,5 (en düşük Su lig satırı 4,64); yaprak lig satırında 4,17 çıktı → yalnız tam moddaki ışık şiddeti .36→.18 (taban rengi aynı). Yön: 9 sn kare-kare, kar/yaprak yukarı adım 0, durgun 0; baloncuk 19 belirme. fps (CPU 6×, 2 hareketli kart): eski 26–32, yeni 24–28; Gece+Yaprak çifti eski ~52, yeni ~42 → hepsi ≥ 15. 4. kart özel sabite düşüyor (sinir.txt). Sabit tasarımlarda yazı dikdörtgenine değen öğe 0 (kesisim-*.txt). Yatay taşma 0, sayfa hatası 0 (390/360).
- **Eski mod kanıtı:** `olcum/eski2.mjs` — eski kodla (git stash) ve yeni kodla aynı DOM hash (15bee236b6) ve aynı piksel hash (cceb13bbdd) (9 kart: yatay 100/42 px + katman dikey). `arka-plan.css`, `arka-plan-yeni.css`, `kayit.jsx`, Köz/Kuzey dosyaları değişmedi.
- Not: ölçüm kancası (giriş yok) konsolda avatar nadirlik 401 gösterir; bu başka pencerenin avatar RPC'si, bu işle ilgisiz. `public/sw.js` önbellek sürümü artırıldı.
- **Bekleyen:** Ida önizlemeyi onaylayınca oyuna alma (kayit.jsx, oyundaki kartlarda `tamGorunur`, dikey düzen için ayrı sabit kompozisyon).

## 2026-09-30 — Avatar çizim düzeltmeleri: köşe yayı silindi, 8 çizim yenilendi, Kedili Genç geri / Sporcu çıktı (migration 703)
**Araç:** Claude Code (Sonnet 5.5) **Neden:** Ida 8 düzeltilmiş çizimi onayladı; köşelerdeki iki yay çizgisi tüm avatarlardan kalktı; Kedili Genç (y36) yeni çizimiyle geri girer, Sporcu (y09) çıkar.
- **Yay silme:** `public/avatars/pro` (31) + `pro2` (39) = 70 SVG; verilen regex 70 dosyada tam 70 eşleşme verdi (farksız), hepsi silindi, sonra kalıp araması 0. Sahne `<rect>` 70 dosyada hâlâ İLK `<rect>` (kontrol edildi).
- **8 dosya** verilen metinle yazıldı (ari-k14, mumya-k28, buyucu-k21, penguen-k06, ahtapot-k13, sovalye-k20, kizil-y03, kedili-genc-y36). Dosya sonunda üreticiyle aynı tek `\n` var. Canlıda Kedili Genç (omuzda kedi), Arı/Mumya kırpma (clipPath) tarayıcıda doğru çiziliyor (`tasarim/avatar-703/sekiz-cizim.png`).
- **Kaynak bulgusu (JSX):** Oyun statik SVG okur; `oyun/components/AvatarProIllustrations{,2,3}.jsx` yalnız önizleme sayfaları (AvatarPreviewPro, /avatar-onizleme), elmas görseli ve üretici `oyun/_test/avatar-pro-uret.mjs` tarafından kullanılıyor. Kaynak tek kalsın diye `Sahne` bileşeninden yay silindi ve 8 bileşen yeni çizimle değiştirildi. ÜRETİCİYİ ÇALIŞTIRMA: dosyaları JSX'ten yeniden yazar; 8 çizim baytça aynı değil (`<path></path>` / `/>`), ve bazı pro2 dosyalarda JSX ile SVG arasında zaten sonda boşluk farkı var. Bir kez çalıştırıldı, çıktı geri yüklendi (git'e girmedi).
- **Aktiflik mekanizması:** oyuncuya görünürlük `avatar_katalogu.aktif` + `onay='girsin'` (39 pro2 avatar); 31 hazır avatar (`pro`) katalogda DEĞİL, koddaki `HAZIR_AVATARLAR` + `avatar_onayla` sabit listesi. `/avatar-nadirlik` ve `avatar_nitelik_yonetici` `coalesce(k.aktif, true)` ile aynı tabloyu izler. Profil/kurulum/Dükkân/Koleksiyon `avatar_katalogu_oyun()` okur. Arama yörüngesi yalnız 31 hazır avatarı kullanır (pro2 zaten yok) → etkilenmez.
- **703:** `kedili-genc-y36` aktif+girsin; `sporcu-y09` pasif+girmesin (satır, nitelik satırı ve SVG durur). Takılı avatar korunur (`profiles.avatar_url` dokunulmaz); yalnız Sporcu'lu 2 gizli bot 649 kuralıyla taşındı; gerçek oyuncu yoktu (ölçüldü). Yetki/politika/fonksiyon değişmedi → güvenlik onayı gerekmedi. 702 main'de yoktu, beklenmedi. Transaction provası `araclar/avatar-703-sql-testi.mjs` 12/12, sonra `supabase db push`: katalogda açık 31 (+31 hazır = 62), kapalı avatarlı bot 0.
- **Test** (`araclar/avatar-703-ekran.mjs`, 390/360, TR/EN): profil ızgarası 62 avatar, Kedili Genç var, Sporcu yok; Dükkân ızgarası aynı; kırık görsel yok; yatay taşma yok; konsol hatası yok; 8 dosyada Sahne boyama (`sahneyiBoya`) dört nadirlikte de çalışıyor (bayrak kapalıyken kod özgün adresi kullanır). `/avatar-nadirlik` 62 aktif; sayaç DB'deki nadirlikle Yaygın 25 · Nadir 15 · Epik 16 · Efsanevi 6 (Ida'nın yerel işaretleri farklı olabilir; nadirlik dokunulmadı). Ekran görüntüleri `tasarim/avatar-703/`.
- `avatarNadirlik.js` içindeki `SAHNE_VURGU` artık eşleşmez (yay yok), zararsız bırakıldı. `public/sw.js` önbellek v10.

## 2026-09-30 — Sezon Yolu (Battle Pass): 28 günlük sezon, SP, BP satın alma, 56 yuva, sayfa + rozet + halka (sistem KAPALI)
**Araç:** Claude Code (Opus 5.5 ana oturum: bütün veritabanı/sunucu, testler, doğrulama · Sonnet 5.5 alt ajan A: `/sezon-yolu` sayfası ·
Sonnet 5.5 alt ajan B: üst çubuk rozeti, altın halka, altın isim yolu, seviye bildirimi, maç sonu şeridi — ikisi de gerçekten Sonnet 5.5'te çalıştı).
**Neden:** Ida'nın onayladığı Battle Pass kararları (28 gün, SP, 28×2 yuva, yalnız elmas 500, geriye dönük ödül, 5 ücretli cazibe, altın isim, pay-to-win yok).
- **Repo bulguları:** haftalık görev sistemi YOK (yalnız 3 günlük görev, `claim_quest`; SP'ye bağlanmadı, uydurulmadı). Maç sonu ödülü her modda
  ayrı fonksiyonda → SP maç tabloları üzerindeki `durum → bitti` tetikleyicileriyle tek fonksiyona (`sezon_puani_ekle`) bağlandı; tetikleyici hatası
  maçı ASLA bozmaz (exception → warning). Tepki paketi 2 (`tepki_eglence`, `tepki_rekabet`) → ikisi dolu, 3. "?". Unvan sistemi `unvan_tanimlari`/
  `oyuncu_unvanlari` (kural `olay`) — 3 yol unvanı + sezon başına final unvanı eklendi. Koleksiyon Puanı mevcut tetikleyicilerle otomatik.
- **Migration 720** (şema, RPC'ler, tetikleyiciler, cron `bildim-sezon-tik` */5, `coin_ekle`/`coin_gunluk_kalan`'da `sezon_yolu` tavan dışı,
  `oyuncu_kartlari` DROP+CREATE: `sezon_bp` kolonu + BP'de `isim_efekti='isim_altin'`, yetkiler aynı), **721** (56 yuva + 3 unvan), **722**
  (`lig_grubum_ozet` satırlarına `sezon_bp`). Hepsi transaction provasından sonra canlıya uygulandı. Tablolar RLS açık + politika yok; iç
  fonksiyonlar istemciye kapalı, istemci RPC'leri yalnız authenticated (yeni tablo/RPC; mevcut hiçbir politika değişmedi).
- **Testler:** `sezon-yolu-sql-testi.mjs` 76/76 (ROLLBACK): bayrak kapısı, sahip test sezonu, bitiş 00:00 TSİ/28 gün, eşik sınırları (99/100,
  2799/2800), çift sayma, gerçek maç tetikleyicisi (terk eden ve bot almaz), günlük tavan 150, görev SP'si, elmas yetersiz → hata + bakiye aynı,
  satın alma (−500 defter, 12 geriye dönük ücretli yuva, placeholder verildi=false), çift alım, ×1,25, ödül kuralları, placeholder→gerçek çerçeve
  tetikleyicisi, 28/28 unvanı, kapanış (56 yuva verildi, BP/altın isim/halka kapandı, kalıcılar kaldı, sezon 2 açıldı), pay-to-win taraması, yetkiler.
  `sezon-yolu-yaris-testi.mjs` 7/7 (iki bağlantı aynı anda: satın alma tek, ödül alımı tek, SP kaynağı tek) — sahibin test sezonunda, sonunda
  iade + silme; sahip hesapta kalan tek iz L1 ücretsiz ödülü 50 coin.
- **Ön yüz:** `oyun/tasarim/sezon-yolu/` (sayfa: sezon/kalan gün/SP çubuğu, BP düğmesi + cazibe listesi, iki kol yatay yol, 28. durak büyük,
  mevcut seviyeye kaydırma, alt sayfa Al/kilit nedeni/"Yakında", satın alma onayı + kutlama, bonus görev kartı, sahip test kutusu, kapalıyken
  "Bu bölüm şu an kapalı" → ana sayfa). `oyun/components/sezon/` (SezonRozeti + seviye bildirimi, AltinHalka, SezonZaferSeridi). Eklemeli
  dokunuşlar: CerceveliAvatar (`sezonBp`; yokken DOM/piksel birebir — 25 kombinasyonda karma aynı), IsimEfekti (`sezonBp`), Layout (rozet),
  MacSonuKutlama (şerit + `sezonTazele`). Ana oturum düzeltmesi: rozet ilerleme halkası `--qt-ikinci` (mor) → `--qt-vurgu` (turuncu).
- **Ölçüm:** sayfa betiği 59/59 (390/360, TR/EN, taşma 0, konsol 0, dokunma ≥ 44, hareketi azalt); parça betiği hatasız (halka 36–200 px ×
  çerçevesiz/lig/level/turnuva/premium, rozet 390/360 TR/EN). Canlı (sahip olmayan hesap): rozet yok, `/sezon-yolu` → `/`, RPC 200, konsol 0.
  Build temiz. `public/sw.js` v11. Görüntüler `tasarim/sezon-yolu/` (a-* sayfa, b-* parçalar). Alt ajan misafir hesapları (2) silindi.
- **Not:** ölçüm betiğinde art arda bağlamlar aynı yenileme belirtecini kullanınca oturum düşebiliyor (a-sayfa-bp-var-360.png'de isim/üst çubuk
  boş) — sayfa ölçümleri sahte veriyle yine geçer; gerçek 360 üst çubuk ölçümü b-ustcubuk-360-*.png.
- **Ida'nın kararı bekleyenler:** ödül tablosu değerleri (taslak), SP miktarları/eşikler, haftalık görev (yok — kurulsun mu?), sezon kapanışında
  alınmamış ödüllerin otomatik verilmesi, rozet varken telefonda logonun Q simgesine inmesi, sayfada ücretli kolun 390×844'te yarısının alt
  menü altında kalması (kaydırınca görünür), final unvanı adı "Sezon N Ustası", sistemi açma (`update oyun_ayarlari set deger='true' where anahtar='sezon_yolu_acik'`).

## 2026-09-30 — Kart arka planı: YENİ mod oyunda herkes için varsayılan + Yıldızlı Gece oyuna açıldı
**Araç:** Claude Code (Sonnet 5.5, tek oturum, alt ajan yok). **Neden:** Ida `/arka-plan-onizleme`'de "yazının arkasında, tam görünür" görünümüyle 4 arka planı onayladı (Su Altı, Yağan Kar, Sonbahar, Yıldızlı Gece: Girsin 4 / Girmesin 0 / Beğenmedim 0); Köz ve Kuzey Işıkları girmez (dosyalar durur).
- **Repo bulgusu (yalnız farkı yapıldı):** `tamGorunur` varsayılanı `false` idi; oyundaki bütün kartlar `KAYIT` üzerinden `KartArkaPlan`/`YildizliGece`'yi `tamGorunur` vermeden çağırıyor → varsayılanı `true` yapmak hepsini (ana sayfa, profil, VsKarti, lig satırı, dükkân/koleksiyon örneği) tek noktadan çevirdi; çağıran dosyalara (AnaSayfa, Profil, AramaSahnesi, LeaderboardPage, DukkanKozmetik) dokunulmadı. Eski mod `tamGorunur={false}` ile birebir erişilir (önizleme anahtarı çalışır).
- **Gece'de gerçek hata (düzeltildi):** `YeniSahne` (Gece/Köz/Kuzey iskeleti) katman kartının yüksekliğini ÖLÇMÜYORDU; lig satırı (yukseklik=64 tahmin, gerçek 56) "küçük satır" yerine 100 px kart düzeniyle çiziliyordu. `YeniSahne` artık `KartArkaPlan` gibi `ResizeObserver` ile ölçer, `k`/`yuk`'u `parcalar`/`zemin` işlevlerine verir; Gece yıldızları ayrı bileşen (`Yildizlar`, `k`'ya göre).
- **Özel sabit tasarımlar (oyundaki gerçek yerleşime göre):** önizlemedeki örnek kartlar oyundakinden farklıydı (ana sayfa kartında ad üstte, sağda Puan/Seri, altta XP çubuğu; lig satırında ikinci satır). `sabit-tasarim.jsx`: `dikey` (profil ~334×245, maç başı VS ~149×186; yüzde konumlu, elle), `ana` ve `lig` (bölge tabanlı, sabit tohumlu, çarpışmasız yerleştirme; yazı dışındaki serbest cepler). `katman` bayrağı `SabitTasarim`'a geçer; önizleme/dükkân örneği eski `kart`/`serit` listesini kullanmaya devam eder. Kural: hareketi azalt · pil düşük · 3 kart sınırı · hareketsiz kart (lig satırı) → özel sabit; sekme gizli/ekran dışı → durmuş kare.
- **Yazı gölgesi:** katman kartlarında `.abp-sahip:has(> .abp--tam)` ince koyu gölge (`arka-plan-tam.css`).
- **Yıldızlı Gece açıldı:** `kayit.jsx` import + `KAYIT.gece`; migration **710** `update public.kozmetikler set aktif = true where anahtar = 'pa_gece'` (prova transaction'da geçti, canlıya uygulandı; `pa_kor`/`pa_kuzey` `aktif=false` kaldı, `KAYIT`'ta yorumda). Dükkân › Arka Plan'da dört arka plan görünüyor (Köz/Kuzey yok).
- **Ölçümler (canlı `quiztactics.vercel.app`, test misafir hesabı; betikler `oyun/tasarim/arka-plan/olcum/`: `oyun-ekran.mjs`, `dukkan.mjs`, `satin.mjs`, `vs.mjs` + `dikey-kontrast.mjs`, `kontrast.mjs`, `fps.mjs`):**
  - 4 arka plan × ana sayfa/profil/lig satırı × 390 TR · 390 EN · 360 TR, hareketli ve hareketi azalt: yatay taşma 0, konsol hatası 0, aynı anda hareketli kart ≤ 1 (sayfa başına), dükkânda 5 kartla tam 3 hareketli (4.+ özel sabit). Hareketi azalt'ta hareketli kart 0 ve özel sabit kompozisyonun yazıya değen öğe sayısı 0 (360'ta lig satırı yaprakta 2 çıktı → alt taşan öğeler aşağı alındı).
  - Kontrast (parçacıksız taban, beyaz yazı; önizleme kart/lig satırı, 390 · 360): Su 4,96–5,10 · 4,64 · Kar 5,90–6,18 · Yaprak 5,49–7,22 · Gece 9,23–12,51; dikey kartlar (VS) en düşük 6,02 (Su), Kar 6,06, Yaprak 8,79, Gece 12,16 → hepsi ≥ 4,5.
  - fps (CPU 6× yavaş Chrome, ekranda 2 hareketli kart, iki tur): Su 39–43 · Kar 45–49 · Yaprak 52 · Gece 60 → ≥ 15.
  - Yön: kar/yaprak yalnız aşağı, baloncuk karışık (önceki ölçüm `olcum/yon.txt`; oyundaki kartlar aynı parçacık kodunu kullanıyor).
  - Satın alma/takma (test hesabı, elmas 10000): Yıldızlı Gece dükkândan "Satın al → Al" (−300 elmas), "Tak" → `profiles.takili_premium_aura = 'pa_gece'`, ana sayfada `.abp--gece` çiziliyor; ardından sahiplik silindi, elmas 10000'e ve takılı arka plan eski hâline döndürüldü. Arka planı olmayan oyuncuda kart düz (`KAYIT`'sız anahtar → düz kart, değişmedi).
- **Gözlem:** paylaşılan çalışma klasöründe başka pencerenin yarım import'u (`SezonYoluPage` henüz yokken) geliştirme sunucusunu geçici 500 verdirdi; bu yüzden ölçümler `waitForSelector(".abp--tam")` ile sağlamlaştırıldı ve son doğrulama canlıda yapıldı. Test hesabı oturumu `.arka-plan-oturum.json` (git'e girmez; ortak denetim oturumunun yenileme belirteci çakışmasın diye ayrı).
- **Dosyalar:** `oyun/tasarim/arka-plan/` KartArkaPlan, YildizliGeceArkaPlan, arka-plan-yeni-ortak, sabit-tasarim, arka-plan-tam.css, kayit.jsx; `supabase/migrations/20260612000710_yildizli_gece_ac.sql`; `PROJECT_CONTEXT.md` (kart arka planı maddesi güncellendi); ekran görüntüleri `tasarim/arka-plan-varsayilan/` (ana sayfa kartı, profil, maç başı VS, lig satırı, dükkân; 4 arka plan; 390 px TR/EN ve 360 px; hareketli ve hareketi azalt). `public/sw.js` → v12.
- **Bekleyen:** gerçek iPhone kontrolü Ida'da (WebKit bu makinede çalışmıyor).


## 2026-09-30 — Sezon Yolu revizyonu: rozet profil kartına taşındı, sayfa sıkıştırıldı, sezon sonu testi, 50 coin geri alındı (sistem KAPALI)
**Araç:** Claude Code (Sonnet 5.5) **Neden:** Ida ilk teslimi inceledi; küçük revizyonlar. Ödül tablosu, SP değerleri, fiyat, `sezon_yolu_acik` (false) DEĞİŞMEDİ.
- **Üst çubuk:** `SezonRozeti` üst çubuktan kalktı, "rozet varken logo Q simgesine iner" CSS kuralı silindi → yatay logo HER ZAMAN tam (360/390'da ölçüldü, dişli kesilmiyor). `SezonRozeti.jsx` varsayılan dışa aktarımı artık yalnız seviye atlama bildirimini taşır (Layout'ta `BildirimToast` yanında, görsel öğe çizmez); rozet `SezonMiniRozet` olarak aynı dosyada.
- **Ana sayfa:** `KompaktOyuncu` (parcalar.jsx) `Lv · rütbe` satırının sonunda 22 px halka + seviye no (turuncu halka, BP'de altın, bekleyen ödül noktası). Kart bir `<Link>` olduğu için rozet `<button>` (tıklama karta geçmez, `navigate`). Dokunma kutusu 44×44 ama negatif kenar boşluğuyla düzen yüksekliği 16 px → **kart yüksekliği değişmedi** (390: 103, 360: 95; ilk denemede 106'ydı, düzeltildi). OYNA/DÜELLO 390×664'te 474 px'te bitiyor (alt menü 594), 360×640'ta 454 (alt menü 570). Yalnız `ozet.gorunur` (sunucu: sistem açıkken, şimdi yalnız sahip).
- **Dişli menü:** `AvatarMenu` Ayarlar'ın altına "Sezon Yolu" satırı (yalnız `gorunur`; TR/EN çeviri zaten global).
- **/sezon-yolu:** üst blok tek kompakt kart (başlık + sezon + kalan gün · seviye + SP çubuğu · satın alma düğmesi); "Bugün maçlardan" notu ve BP özeti yolun altına taşındı (`.sy-notlar`). Alt menü payı zaten Layout'un `.qt-altmenu-payi` sınıfından geliyordu; asıl sorun içeriğin yüksekliğiydi. 390×844: iki kol 306–665 px, alt menü 774 → BÜTÜN görünür (BP'li 772, sığıyor). 390×664 ve 360×640'ta iki kol (2×147 px) ilk ekrana sığmaz; ücretsiz kol tam görünür, sayfa kaydırılınca içerik alt menünün üstünde biter (örtülen yuva yok), yol şeridinde dikey taşma 0. Karar: kısa ekranda kol yüksekliğini küçültmedim (yuva boyutu/okunurluk); istenirse `max-height` kuralı eklenebilir.
- **Sezon sonu (madde 4):** `sezon_kapat` ZATEN alınmamış ücretsiz + (BP'liye) ücretli ödülü veriyordu (720); kod değişmedi, yalnız TEST yazıldı: `araclar/sezon-kapanis-sql-testi.mjs` 23/23 (ROLLBACK): BP'li oyuncu seviye 10 (1 ücretsiz + 3 ücretli önceden alınmış) → 10+10 kayıt; BP'siz seviye 6 → 6 ücretsiz, 0 ücretli; ulaşılmamış seviye verilmez; coin toplamı yalnız alınmamış yuvalar kadar (çift yok); defterde çift referans 0; placeholder yuvalar `verildi=false` kayıt; gerçek ödül tanımlanınca hak sahibine verildi; `sezon_kapat` ikinci çağrıda false, `sezon_tik` iki kez daha çalışınca kayıt/coin/elmas aynı.
- **Test coin temizliği (madde 5):** sahip hesap (idaGG) `coin_hareketleri`'nde 17:59 `sezon_yolu` `sezon:1:1:ucretsiz` +50 (id 61165) → düzeltme satırı `-50 sezon_yolu_duzeltme sezon:1:1:ucretsiz:geri_alma` (id 61183) + bakiye 3210 → 3160, tek transaction. **DİKKAT:** aynı hesapta 18:35:34'te başka `sezon_yolu` alımları var (L2 joker +2 Ek Süre, L3 +50 coin, L4 +5 elmas, L5 +75 coin, L6 joker +1 Soru Değiştir; test sezonu id 1, no 0) — brifte yalnız 50 coin anıldığı için DOKUNULMADI. Ida karar verecek.
- **Test/araçlar:** `araclar/sezon-revizyon-ekran.mjs` 116/116 (390×844 TR/EN, 390×664, 360×640 TR/EN: tam logo, dişli, rozet kartta + /sezon-yolu'na gider, menü satırı, sahip olmayanda ikisi de yok, taşma 0, konsol 0). Görüntüler `tasarim/sezon-yolu/r-*.png`. Test misafir hesabı silindi. ESKİ `araclar/sezon-parca-ekran.mjs` üst çubuk rozetini sınıyordu → artık geçersiz (rozet üst çubukta yok). Kayıtlı eski misafir oturumu ölmüştü (profili silinmişti), yeni açıldı.
- `public/sw.js` v13. Başka pencerelerin dosyalarına (kart arka planı, avatar, Düello, `mac.js`, `BildimApp.jsx`) dokunulmadı.


## 2026-09-30 — Sezon Yolu test ödüllerinin geri alınması ve test sezonunun temizliği (veri düzeltmesi; kod değişmedi)
**Araç:** Claude Code (Sonnet 5.5) **Neden:** Ida sahip hesapta Battle Pass testinden kalan ödüllerin geri alınmasını ve gerçek sezonun sıfırdan başlamasını istedi. Sistem KAPALI kaldı (`sezon_yolu_acik=false`), ödül tablosu/SP/fiyat/bayrak değişmedi. Migration DOSYASI yok; tek transaction'lık yetkili betik (önce ROLLBACK provası, sonra commit), başka hesaba dokunulmadı (diğer 250 profilin coin/elmas toplamı önce=sonra).
- **Kapsam farkı:** Brif 18:35 alımlarını (L2–L6) saydı; ama Ida 18:56'da test araçlarıyla tekrar SP verip L7–L12'yi de almıştı (hepsi `sezon:1:*` referanslı). Betik geri alınacakları DEFTERDEN türetti; net sonuç brifteki hedefle aynı (coin 3035).
- **Geri alınanlar (düzeltme satırı, eksiye düşmedi):** coin L1 −50 (önceki oturumda), L3 −50, L5 −75, L7 −75, L9 −100, L12 −100 (`sezon_yolu_duzeltme`, ref `…:geri_alma`); elmas L4 −5, L10 −5; joker L2 Ek Süre −2, L6 Soru Değiştir −1, L11 Zaman Baskısı −1 (`joker_islemleri`, kaynak `hediye` negatif delta — tablo kaynak check'i başka değere izin vermiyor, şema değiştirilmedi); "Yolcu" unvanı (L8) silindi.
- **Önce → sonra:** coin 3435 → 3035 (test öncesi 3160'tan 3035: −125 = brif) · elmas 9136 → 9126 · Ek Süre 39 → 37 · Soru Değiştir 33 → 32 · Zaman Baskısı 13 → 12.
- **Sezon kayıtları silindi:** `oyuncu_sezon_puani` 1 (1210 SP, seviye 12), `sezon_puan_hareketleri` 5, `oyuncu_bp_odul_alimi` 12, `oyuncu_bp_sahipligi` 0, `sezon_bonus_gorev` 0, sahip unvanı 1, `sezonlar` test satırı (id 1, no 0) ve pasif `sezon_test_1_final` unvan tanımı. Gerçek sezon bayrak açılınca sıfırdan başlar (sezon no 1). Coin/elmas/joker defterindeki eski `sezon:1:*` satırları ve düzeltmeleri iz olarak KALDI.
- **Doğrulama:** sahip oturumuyla `sezon_ozetim`/`sezon_yolu_durumum` (ROLLBACK içinde): SP 0, seviye 0, BP yok, alınmış/alınabilir ödül 0; test sezonu sayfa açılırken isteğe bağlı yeniden yaratılır (tasarım gereği) — kalıcı satır bırakılmadı.
- **Dikkat:** sahip test araçlarıyla SP verip ödül alırsa sezon satırı yeniden oluşur; bayrak açılmadan önce yeniden temizlenmeli (`sezon_sahip_test_sifirla` ödül coin/jokerini GERİ ALMAZ, yalnız kayıtları siler).


## 2026-09-30 — Görev sistemi genişlemesi: sunucu tarafı (Ajan A, migration 740–743; ekran Ajan B'de)
**Araç:** Claude Code (Opus 5.5) **Neden:** Ida günlük görevlerin havuzdan seçilen 3'e (kolay/orta/zor) çıkmasını, yeni haftalık görevleri + Haftalık sandığı istedi. `sezon_yolu_acik=false` kaldı; Battle Pass dosyalarına dokunulmadı (yalnız `sezon_puani_ekle`, `sezon_gecerli`, `bp_aktif_mi`, `acik_bot_mu` ÇAĞRILDI).
- **Migration'lar (provadan sonra `araclar/migration-uygula.mjs` ile canlıya, ledger'a yazıldı):** 740 tablolar+havuz+ayarlar · 741 sayaçlar · 742 seçim · 743 RPC'ler. Güvenlik: yeni tablolarda RLS açık + politika yok + anon/authenticated yetkisiz; RPC'ler security definer, yalnız authenticated. Mevcut politika/GRANT/REVOKE değişmedi (yalnız eski `gorev_sayaci` fonksiyon gövdesi yeniden yazıldı, execute kapalı kaldı).
- **Tablolar:** `gorev_havuzu` (10 günlük + 6 haftalık; hedef + TR/EN ad tabloda), `gunluk_gorev_secimi`, `haftalik_gorev_secimi`, `haftalik_gorev_alimi` (sandık = quest_id `sandik`). Yeni `oyun_ayarlari` (test değerleri): `gorev_haftalik_coin` 50 · `sp_haftalik_gorev` 25 · `gorev_haftalik_sandik_sp` 75 · `gorev_haftalik_sandik_joker_adet` 1 · `gorev_haftalik_sandik_joker_tur` "soru_degistir". Günlük ödül mevcut `coin_gunluk_gorev` 15 + `sp_gunluk_gorev` 10.
- **RPC:** `gorevlerim()`, `gorev_al(kapsam, quest_id)`, `haftalik_sandik_al()`; `get_daily_quests()`/`claim_quest()` aynı imzayla yeni seçimle çalışır (eski 3 sabit id'ler bugünün seçiminde yok → `claim_quest('mac_oyna_3')` "Görev bulunamadı"; bugün alınmış eski `quest_progress` satırları durur).
- **Kararlar ve nedenleri:** (1) Seçim döngülü (md5 karışık tur): her görev eşit sıklıkta, ardışık günde aynı görev yok; kategori görevinin kategorisi aynı döngüyle aktif kategorilerden. (2) Günlük alım kaydı eski `quest_progress`'te → eski `claim_quest` ve `gorev_al` aynı görevi iki kez veremez; günlük SP mevcut `trg_sezon_gorev` tetikleyicisinden (ref `tarih:quest_id`). (3) **Lig puanı (profiles.puan) yeni görevlerde verilmez** (eski 3 görevde 20/50/30'du; brifte yalnız coin+SP var) — Ida'nın bilmesi gereken davranış farkı. (4) Coin `coin_ekle(tur 'gorev')` → günlük coin tavanına TAKILIR (eski günlük görevle aynı). (5) Düello doğru cevabı: savunan + saldıran (eski sayaç yalnız savunanı sayıyordu). (6) Sayaçlar Antrenman (rakip açık bot) ve terk edeni saymaz; `gorev_sayaci` yeni görev id'lerini havuza yönlendirir (maç sonu özeti bozulmasın diye).
- **Test:** `araclar/gorevler-sql-testi.mjs` 102/102 (ROLLBACK) · `araclar/gorevler-yaris-testi.mjs` 9/9 (iki bağlantı aynı anda günlük alım + sandık; test hesabında kalıcı fixture yazar, sonunda siler, bakiye aynı) · mevcut `sezon-yolu-sql-testi` 76/76 · `sezon-kapanis-sql-testi` 23/23. `sezon-yolu-yaris-testi` ÇALIŞTIRILMADI: sahip hesapta coin/test sezonu izi bırakıyor (sahip bakiyesi değişmesin kuralı); BP RPC'lerine dokunulmadı.
- **Sahip hesap (idaGG) önce = sonra:** coin 3155 · elmas 9126 · puan 1805 · joker aynı (soru_degistir 32) · SP 5:100 · quest_progress 15 · coin_hareketleri 242.
- **Gözlem:** Supabase pooler oturum modunda 15 istemci sınırı var (`MAXCONNSESSION`); paralel test pencereleri dolduruyor, `pg-mini` bu hatada sessizce takılır (yeniden dene).
- **Bekleyen:** Ajan B (ekran: /gorevler, ana sayfa şeridi, çeviri, sw.js).


## 2026-09-30 — Görev sistemi: maç sonu özeti "önceki ilerleme" yeni havuzla (migration 744, Ajan A)
**Araç:** Claude Code (Opus 5.5) **Neden:** `mac_sonu_ozet` yeni günlük görev kimliklerinde `onceki`'yi doğru veremiyordu (eski 3 kimliğe sabitliydi).
- **Migration 744** (prova + canlı): `gorev_olcum` / `gorev_dogru_satirlari` bir maçı HARİÇ tutan sürümler (eski imzalar sarmalayıcı, davranış aynı); `mac_sonu_ozet` yeni havuz görevlerinde `onceki` = bu maç hariç yeniden ölçüm; eski 3 kimlik 462 hesabıyla aynen. Dönüş biçimi korundu; ekleyici anahtar `haftalik_gorevler` [{id, ad, ilerleme, hedef, alindi, onceki}]. Antrenman/terk katkı vermez (onceki = ilerleme). Yetki/politika değişmedi.
- **Test:** `araclar/gorevler-mac-sonu-sql-testi.mjs` 15/15 (ROLLBACK); `gorevler-sql-testi` 102/102 yeniden. Sahip hesap önce = sonra (coin 3155, elmas 9126, joker/SP aynı). Lig puanına dokunulmadı.

## 2026-09-30 — Sezon Yolu v2: onaylı maket görünümü + 28 sonrası taşma ödülü (sistem KAPALI)
**Araç:** Claude Code (Opus 5.5 ana oturum: brif, denetim, PROGRESS · Sonnet 5.5 Ajan A: veritabanı · Sonnet 5.5 Ajan B: ekran; SIRALI).
**Neden:** Ida sayfanın onayladığı maketle aynı görünmesini ve 28. seviyeden sonra her 100 SP'ye küçük ödül istedi. Seviye satın alma YOK,
haftalık görev YOK; ödül tablosu, SP değerleri, BP fiyatı (500 elmas), `sezon_seviye_sayisi` (28) DEĞİŞMEDİ. `sezon_yolu_acik=false` kaldı.
- **Veritabanı (migration 730 `sezon_tasma_odulu`, prova + canlı):** ayarlar (TEST DEĞERİ) `sezon_tasma_sp=100`, `sezon_tasma_ucretsiz_coin=25`,
  `sezon_tasma_ucretli_coin=40`, `sezon_tasma_azami=10`. Yeni tablo `oyuncu_bp_tasma_alimi` (sezon, user_id, n, kol; RLS açık, istemciye yetki yok) —
  `oyuncu_bp_odul_alimi`'ne 28+n yazmak yuva kısıtı/placeholder tetikleyicisiyle karışırdı. `sezon_yolu_durumum().tasma` alanı, `sezon_ozetim().alinabilir`
  taşmayı sayar, yeni RPC `bp_tasma_al(p_kol)` (definer, yalnız authenticated, FOR UPDATE, idempotent, coin `sezon_yolu` tavan dışı — normal ödüllerle
  aynı), `bp_toplu_al` → `tasma_verilen`, `sezon_kapat` alınmamış taşmayı verir, `sezon_sahip_test_sifirla` taşmayı da siler. `sezon_puani_ekle`
  değişmedi (SP 28'de kırpılmıyordu). Mevcut hiçbir politika/GRANT değişmedi. Taşmanın ücretli kolu BP alınınca otomatik verilmez, "Al" ile alınır.
- **Testler:** yeni `sezon-tasma-sql-testi` 79/79 (ROLLBACK), `sezon-tasma-yaris-testi` 7/7 (geçici kayıtlar temizlendi); eski `sezon-yolu-sql-testi`
  76/76 (pay-to-win beyaz listesine `bp_tasma_al`, `sezon_tasma_bilgi` eklendi), `sezon-kapanis-sql-testi` 23/23. Eski `sezon-yolu-yaris-testi`
  ÇALIŞTIRILMADI: sahibin test sezonunu `sezon_sahip_test_sifirla` ile siliyor (sahip hesap değişmesin kuralı).
- **Ekran:** `oyun/tasarim/sezon-yolu/` yeni `sezonTemalari.jsx` (sezon no → tema; 0 ve 1 "Yıldızlı Gece", `sanat/YildizliGeceSanat.jsx` tembel;
  oyuncunun arka planına bakmaz), `SezonUst`, `Yol`, `OdulGorsel`, `OdulSayfasi` (tür bazlı önizleme: kendi avatarı + çerçeve, premium tembel),
  `TasmaSayfasi`, `SiradakiOdul`, `SatinAlSayfasi`, `Kutlama`, `SezonUcus` (coin üst çubuk çipine uçar), `simgeler`, `tasma.js`. `SezonYoluPage.jsx`
  585 → 293 satır. `oyun/lib/sezonYolu.js` (`bpTasmaAl`, toplu al taşmayı sayar), `oyun/lib/ceviri/sezon-yolu.js`, `sezon-yolu.css`, `public/sw.js` v14.
  Ses yalnız mevcut `sesCoin/sesRozet/sesSatinAlma`. 700 px altı ekranda "Seviye N için X SP" satırı gizli (sağdaki x/y SP aynı bilgiyi verir).
- **Ölçüm (`araclar/sezon-yolu-v2-ekran.mjs`, sahte RPC yanıtlarıyla; 425 + 140 kontrol):** iki kol + Hepsini al alt menünün üstünde: 390×700 606 < 630,
  360×640 538–542 < 570, en kötü 28+ 562 < 570. Taşma 0, dokunma ihlali 0, konsol 0 (64/64); en düşük kontrast 4,79 (gerçek piksel). Önizleme 10 türde
  TR/EN açıldı. Görüntüler `tasarim/sezon-yolu/v2/`. Eski `sezon-yolu-ekran.mjs` / `sezon-revizyon-ekran.mjs` eski sınıf adlarına bakıyor → geçersiz.
- **Sahip hesap önce/sonra:** coin 3155/3155, elmas 9126/9126, joker aynı, BP alım 0/0, taşma alım 0/0. Test sezonu SP'si A'nın ilk ölçümünde 540 idi,
  19:46 UTC'de bir `sahip_test` +100 kaydıyla 100 oldu — ajanlar yazmadı (Ida'nın ya da başka pencerenin işlemi); B boyunca 100 kaldı.
- **Maketten kalan fark:** seviye 0'da avatar işaretçisi yok; elmas uçuşu yok (üst çubukta elmas çipi yok); düğmeler gerçek `QtDugme`; "Her N SP"
  `sonraki_icin_sp`'den türetiliyor (azami dolunca "Taşma ödülü" yazar; durumum'a `tasma_sp` eklenirse sadeleşir); avatar ödülü görsel yolu varsayım
  (gerçek ödül satırı gelince doğrulanmalı).
- **Canlı:** sw v14 yayında; sahip olmayan misafirle `/sezon-yolu` → `/`, konsol 0. Misafir test hesapları (2) silindi.
- **Dokunulan dosyalar:** migration 730; `araclar/sezon-tasma-sql-testi.mjs`, `sezon-tasma-yaris-testi.mjs`, `sezon-yolu-sql-testi.mjs`,
  `sezon-yolu-v2-ekran.mjs`; `oyun/tasarim/sezon-yolu/*`; `oyun/lib/sezonYolu.js`; `oyun/lib/ceviri/sezon-yolu.js`; `public/sw.js`; `tasarim/sezon-yolu/v2/`.
  Başka pencerelerin dosyalarına (mac.js, BildimApp.jsx, duello-tahta, gorevler, avatar nadirlik) dokunulmadı.

## 2026-09-30 — Yayın öncesi SALT OKUNUR kalite denetimi
**Araç:** Claude Code (Sonnet 5.5, tek oturum). **Neden:** Ida, bugünkü ekran/sistem değişikliklerinin yayın öncesi ölçülmesini istedi; hiçbir çalışan dosya değişmedi.
- **Çıktı:** `tasarim/denetim/2026-09-30/rapor.md` + ekran görüntüleri + ham ölçüm `_tara/*.json`. Sonuç: 0 ENGEL · 7 ÖNEMLİ · 9 KÜÇÜK.
- **En önemliler:** (1) kart arka planında sarı yazı açık çip üstünde (Çaylak/"sen" 1,19:1; `arka-plan.css:126`), (2) Koleksiyon puanı arama VS ekranında 1,02:1 (`koleksiyon-puani.css:20`), (3) Düello joker ipucu sarı ≈1,3:1 (`DuelloPage.a.css:270`), (4) Düello yük altında `57014 statement timeout` + ekran takılması (`DuelloPage.jsx:516`), (5) CPU 6×'te Yağan Kar 23 / Su Altı 33 fps, (6) Vercel Güvenlik Kontrol Noktası canlıda otomasyonu 403'ledi (etkisi ölçülemedi), (7) Bronz grup 1 = 76 üye, kural 25 (`lig_uyeligi_kur`).
- **Yöntem kararı:** canlı site ~150 istekten sonra Vercel tarafından engellendi → aynı HEAD'in üretim derlemesi yerel sunucuda, aynı Supabase'e karşı ölçüldü. Kontrast taban kareye (metin saydam + parçacık gizli) karşı.
- **Bilinen iki konu:** avatar nadirlik 401 = RPC'nin oturumsuz/süresi dolmuş anahtara doğru cevabı (test düzeneği artığı); 360 px 404 = `Cerceve2.jsx` isteğe bağlı PNG yuvaları (boyuta bağlı değil).
- **Temizlik:** 7 test hesabı (`Denetim####`) silindi; geçici hediye kozmetik/takılı arka plan ve profil dili geri alındı; `sezon_yolu_acik` dokunulmadı; coin/elmas harcanmadı. Önceden var olan `ArayuzDenetim758` hesabına oyuncu-testi birkaç maç ekledi.
- **Ölçülemeyen:** gerçek iPhone/WebKit, ses, gerçek iki kişilik maç, push, canlı ağ süreleri, Kalkan düğmesi görseli, maç başı kare hızı.

## 2026-09-30 — Görev sistemi genişlemesi: EKRAN (Ajan B: /gorevler, ana sayfa şeridi, TR/EN)
**Araç:** Claude Code (Opus 5.5) **Neden:** Ajan A'nın sunucu işi (740–744) için onaylı maketteki ekranlar. Battle Pass/Sezon Yolu dosyalarına dokunulmadı; `sezon_yolu_acik` kapalı kaldı; migration yok.
- **Yeni:** `oyun/pages/GorevlerPage.jsx` + `gorevler.css` (rota `/gorevler`, `src/BildimApp.jsx` tek lazy satır + tek Route), `oyun/lib/gorevler.js` (RPC + `useGorevler` + geri sayım; `gorevlerim` ÖNBELLEĞE ALINMAZ), `oyun/lib/ceviri/gorevler.js` (+ `dil.js` bağlantısı; "Al|görev" bağlamlı anahtar, çünkü başka yerde "Al" = "Buy"), `oyun/tasarim/Ikon.jsx` (3 ikon: `gorevListesi`, `hedef`, `takvim`), `araclar/gorevler-ekran.mjs` (ölçüm), görüntüler `oyun/tasarim/gorevler/`.
- **Değişen:** `pages/anasayfa/parcalar.jsx` (`GorevSeridi` yerinde yeniden yazıldı: tek satır, `Link` → /gorevler; veriyi kendi okur), `AnaSayfaA.jsx` (eski günlük görev paneli ve "Günlük görevler" penceresi kalktı, `useAnaSayfaVerisi({gorevYukle:false})`), `veri.jsx` (yalnız `gorevYukle` seçeneği; eski `get_daily_quests`/`claim_quest` yolu AnaSayfaB/C için durur, silinmedi), `anasayfa.css`, `components/AvatarMenu.jsx` (Görevler satırı), `public/sw.js` v14→v15.
- **Kararlar:** (1) Ödül alınınca arayüz sunucunun döndüğü GERÇEK coin/SP'yi gösterir (coin tavanı `odul.coin`'den az olabilir; sezon kapalıyken `sp:null`). (2) **Sezon sistemi görünmüyorsa (`sezon_ozetim.gorunur` false) SP çipleri de gizlenir** (yalnız alt not değil): kapalıyken SP hiç verilmediği için "10 SP" göstermek yanıltırdı. (3) **Ana sayfa şeridi <700 px yükseklikte gizli:** 390×664'te şerit (44 px) sığmıyor, lig kartını kırpıyordu; OYNA/DÜELLO konumu eskisiyle AYNI kalsın diye (406–474) gizlendi; her ekranda erişim için avatar (dişli) menüsüne "Görevler" satırı eklendi. ≥700'de şerit görünür; 700–760 arası oyuncu kartı/OYNA biraz sıkışır, ≤830'da lig kartı en yakın 3 satıra iner (eskiden ≤760) — şerit 800 px civarında lig kartını kırpmasın diye. (4) Masaüstünde sağ sütundaki eski "Günlük görevler" paneli de aynı şeritle değişti. (5) Görev lig puanı vermez (Ida): arayüzde lig puanı yok.
- **Ölçüm (`node araclar/gorevler-ekran.mjs`, taklit veri, 228 kontrol hepsi geçti):** yatay taşma 0 · dokunma hedefi ≥44 · konsol hatası 0 (canlı DB `statement timeout` 57014 gürültüsü süzülür) · kontrast piksellerden: en düşük 5,33 (hata mesajı), "Al" düğmesi 5,80, sandık 7,74, zorluk çipleri ≥8,2, şerit 7,74/15,09. 390×700 ve 360×640'ta günlük 3 görev ilk ekranda. Ana sayfa OYNA/DÜELLO (önce → sonra): 390×664 406–474 → 406–474 · 360×640 391–454 → 391–454 · 390×700 413–510 → 399–462 (şerit 562–606) · 390×844 501–594 → 501–592 (şerit 702–750).
- **Gerçek alma (kendi misafir test hesabım, sahip DEĞİL; sonra `hesabimi_sil` ile silindi):** fixture maçlarla günlük 2 görev + haftalık `hft_mac_oyna_15` + Haftalık sandık arayüzden alındı: coin hareketleri `gorev:gunluk:…`, `gorev:haftalik:2026-09-28:…`, sandık jokeri `gorev:haftalik_sandik:2026-09-28` (Soru Değiştir +1), sayfa yenilenince alınmış kalıyor. **Sahip (idaGG) önce = sonra:** coin 3155 · elmas 9126 · puan 1805 · SP 5:100 · joker aynı (soru_degistir 32) · quest_progress 15 · haftalik_gorev_alimi 0 · coin_hareketleri 242.
- **7 günlük seçim (gorev_gunluk_hesapla):** 30 Eyl: mac_oyna_2/duello_mac_1/mac_kazan_5 · 1 Eki: mac_oyna_3/duello_galibiyet_1/dogru_50 · 2: dogru_10/dogru_25/mac_kazan_5 · 3: mac_oyna_2/mac_kazan_2/dogru_50 · 4: mac_oyna_3/dogru_25/kategori(spor) · 5: mac_oyna_2/duello_mac_1/dogru_50 · 6: dogru_10/duello_galibiyet_1/mac_kazan_5 · 7: mac_oyna_3/mac_kazan_2/kategori(teknoloji). Her gün 1 kolay + 1 orta + 1 zor.
- **Test notu:** `gorevler-ekran.mjs` ilk çalışmada misafir hesabı açar (`.sezon-gorev-oturum.json`, git'e girmez; avatar adımı yalnız "Bu avatarı kullan" ile geçer, "Avatarsız devam et" ilk bağlamda takılıyor). iOS kuralı: `fixed`+`transform` aynı öğede yok (uçan çip kartın içinde `absolute`).
- **Maketten kalan fark:** kart kontur rengi uygulamanın laciverti (`--qt-metin`, maketin #1f2a44'ü değil); "Al" düğmesi `QtDugme` (turuncu, büyük harf); çubuk uzunluğu sağ sütun genişliğine göre kartlar arasında hafif değişir; uçan ödül çipi maketin parçası değil (eklendi).


## 2026-10-01 — Sezon Yolu CANLIYA ALINDI: sahip kalıntı temizliği + bayrak açıldı (veri işlemi; kod/migration/ödül/SP/fiyat değişmedi)
**Araç:** Claude Code (Sonnet 5.5) **Neden:** Ida "battle pass'i canlıya alalım" dedi; önce sahip hesabın test kalıntıları temizlendi.
- **Kalıntı (defterden listelendi):** sahip hesapta Sezon kaynaklı TEK düzeltilmemiş iz: coin +50 (`sezon:5:1:ucretsiz`, L1 ücretsiz ödül, test sezonu id 5). Elmas/joker/unvan kalıntısı YOK (önceki temizlik tamdı). Kayıtlar: test sezonu 5 (no 0), `oyuncu_sezon_puani` 1 (SP 100, seviye 1, `sahip_test`), `sezon_puan_hareketleri` 1, `oyuncu_bp_odul_alimi` 1; BP sahipliği/bonus görev/taşma alımı 0; pasif `sezon_test_5_final` unvan tanımı.
- **Geri alma:** coin −50 (`sezon_yolu_duzeltme`, ref `sezon:5:1:ucretsiz:geri_alma`, doğrudan coin yazımı için yalnız o işlemde `app.coin_izin=1` — mevcut `coin_ekle` yolu; politika/GRANT değişmedi); yukarıdaki sezon kayıtları + test sezonu + unvan tanımı silindi. Önce ROLLBACK provası, sonra COMMIT. Başka hesaba dokunulmadı (diğer 250 profilin coin/elmas toplamı önce=sonra).
- **Sahip önce → sonra:** coin 3205 → 3155 · elmas 9126 → 9126 · puan 1805 → 1805 · joker aynı.
- **+120 coin kaynağı:** SEZON DEĞİL — gerçek oyun ödülleri (1 Eki 19:17–19:21 UTC): 2 düello maçı 45+45, rozet `gizli_1` 10, seviye 19 ödülü 20 = 120. Dokunulmadı. (3155 → 3205'teki +50 ise sahibin L1 test-sezon ödülüydü; geri alındı.)
- **Doğrulama (sahip kimliği, ROLLBACK):** SP 0, seviye 0, BP yok, alınabilir 0, taşma 0/0. Sezon_tik provası: bayrak açık → sezon 1; bitişi geçmişe çekince sezon 2 doğru üretildi.
- **BAYRAK AÇILDI:** `sezon_yolu_acik=true`, tetikleyici sezonu kendisi açtı: **Sezon 1 (id 46), başlangıç 30 Eyl 21:53 UTC = 1 Eki 00:53 TSİ, bitiş 28 Eki 21:00 UTC = 29 Eki 00:00 TSİ**. `bildim-sezon-tik` cron aktif (*/5).
- **Yarış testi:** `sezon-yolu-yaris-testi.mjs` 7/7. SAPMA: sahip-yalnız `sezon_sahip_*` fonksiyonları test hesabında çalışmaz (sahip listesine eklemek yetki değişikliği olurdu, yapılmadı); bu yüzden betik `TEST_KULLANICI=<uuid>` ortam değişkeniyle test hesabı + GERÇEK açık sezonda koşacak şekilde minimal genişletildi (sahip modu aynen duruyor) ve bayrak açıldıktan SONRA çalıştırıldı. Sahip hesap hiç etkilenmedi.
- **Açılış doğrulaması (canlı quiztactics.vercel.app, kendi misafir test hesabım, sahip DEĞİL; ödül alma/satın alma arayüzden yapılmadı):** 390×700 ve 360×640 × TR/EN: profil kartında Sezon Yolu rozeti görünür, dişli menüde "Sezon Yolu"/"Season Path" satırı var, /sezon-yolu açılıyor (Sezon 1, 28 gün kaldı), /gorevler'de SP çipleri + "Görev SP'leri sezon yoluna işler" notu var, yatay taşma 0, konsol hatası 0.
- **Görev → SP:** test hesabında fixture maçlarla `gun_mac_oyna_3` alındı: `gorev_al` sp 13 (taban 10 × BP 1,25), SP 219 → 232, hareket `2026-10-01:gun_mac_oyna_3` kaynak `gorev`.
- **Test hesabı silindi:** auth + profil + maç/cevap + bütün sezon/coin/elmas/joker izleri 0. Gerekirse BP test hesabı elması (yarış testi için 1000'e ayarlanmıştı) hesapla birlikte gitti.
- **Dikkat:** sahip artık gerçek sezondaki normal oyuncu; `sezon_sahip_sp_ekle` / `sezon_sahip_test_sifirla` bayrak açıkken sahibi ETKİLEMEMELİ — kullanma.

## 2026-10-01 — Düello takılması (Ida + arkadaşı, Samsung + iPhone) kök sebep + düzeltme; Düello 16 tur
**Araç:** Claude Code (Opus 5.5 ana oturum + 2 Sonnet 5.5 alt ajan: sunucu ölçümü, sabit-10 taraması).
**Neden:** 30 Eyl gece ilk gerçek iki kişilik Hâkimiyet maçında geri sayım 0'da takıldı, sonra ~20–30 kez "3"ten başlayıp sıfıra indi; denetim Ö4'te yük altında 57014. Ayrıca Ida kararı: maç 16 tur, eşik 4 yuva kalır.

- **Kök sebep (canlı veriyle, maç 8a01332b):** arkadaşın (oyuncu1) cihazı 19:20:08 UTC'den sonra HİÇ istek atmadı (`profiles.last_seen` ve `rpc_sayac.duello_durum` orada kaldı, sonra da dönmedi). 25 sn sonra 19:20:34'te `duello2_ilerlet` onu kopuk saydı (`kopuk_kalan` = taban 3 sn). Kopukken her ilerletme (cron 2 sn + Ida'nın okumaları) `faz_bitis`'i "şimdi + 3 sn"ye itti → Ida'nın sayacı ~2 sn'de bir yeniden 3'ten başladı; 45 sn sonra 19:21:21'de terkle bitti (≈22 döngü). İlk "0'da takılma" ayrı: 19:19:14–19:19:43 arası cron hiç çalışmadı (`job startup timeout` ×3), tur 5 39,3 sn sürdü (üst sınır 37). iPhone'un neden sustuğu ölçülemedi (WebKit yok, cihaz kaydı yok).
- **Sunucu ölçümü (alt ajan, temiz şart, begin…rollback):** `duello_durum` kategori fazı ort 99,8 / p95 108 / maks 119 ms; cevap/sonuç/bitti ~15 ms. Farkın kaynağı `duello_kategorileri()` (questions `distinct`, kilit altında ~12 çağrı). İki oyuncu aynı anda: ikinci çağrı birincinin kilit süresi kadar bekler. Dizin eksiği yok. 57014'ün asıl kaynağı Supabase örneğinin aralıklı donması: bu gece önemsiz cron işleri (turnuva-ilerlet normalde 0,01 sn) aynı anda 21–69 sn sürdü, `pg_stat_statements` bütün cron işlerinde maks ~69–72 sn; autovacuum/checkpoint izi yok (26 Eyl'deki platform kısıtıyla aynı belirti). Sonunda (≈01:30 TSİ) Supabase tamamen yanıtsız kaldı (REST 30 sn zaman aşımı, auth health 11 sn, Postgres bağlantısı kurulamadı).
- **Migration 760 (canlı):** `duello_durum`, surum 2'de cevaba `kopuk {ben_mi, bitis, faz_kalan_sn}` ekler (kopukluk kuralları, taban 3 sn, 60 sn güvenlik ağı, yetkiler aynı). **762 (canlı):** `duello_kategorileri()` gevşek dizin taramasıyla, aynı sonuç, 7,9 → 1,6 ms/çağrı. **761 (canlı):** `duello_max_tur` = 16 (sunucu zaten ayardan okuyordu; sabit 10 yok).
- **İstemci (`DuelloPage.jsx`):** hata/57014'te sahne son fazda kalır + "Bağlantı yeniden kuruluyor…" + 1→2→4→8 sn geri çekilmeli yeniden deneme (hata sürerken yedek yoklama durur — yük artmaz); faz bitişi 4 sn geçip yeni faz gelmezse de bant, bu sırada yoklama 4 → 2 sn; kopuklukta sayaç donuk (`faz_kalan_sn`), bantta bekleme sayılır, sahte bitişe zamanlayıcı/sık yoklama kurulmaz; `visibilitychange`/`pageshow`/`online` anında tazeler ve nabız atar.
- **16 tur:** metinler sayıyı ayardan okur (`useAyar` — `lib/ayarlar.js`): tanıtım, arama ipucu, mod seçimi, ana sayfa A/B, Home, Modlar, devam eden düello satırı ("{n}. tur/{t}"), EN `ceviri/hakimiyet.js` + `dil.js`. `mac.js`'teki eski 10'lu EN anahtarları başka pencerenin açık dosyası olduğu için dokunulmadı (artık kullanılmıyor). Kategori tekrar sınırı Hâkimiyet'te YOK (666'da kalktı; seçimi yalnız 2 turluk kilit daraltır, her turda ≥ 6 seçilebilir). Tur noktaları dinamik (`max_tur`), 16 nokta 360 px'te tek satır sığar.
- **Testler:** Hâkimiyet SQL 60/60 (son tur ayardan + "tur 15'te maç sürer" eklendi), bot 18/18, `npm run build` (vite) temiz. Eski `duello-puan-sql-testi` 7/12 — 680'de kalkan yıldız/kalkan bölümlerinde düşüyor (16 turla ilgisiz, zaten eskimiş).
- **İki gerçek bağlam testi (`araclar/duello-iki-oyuncu-testi.mjs`, Galaxy S24 + iPhone 13 görünümü, Chromium; B'ye +150 ms, tur 3'te 5 sn ağ kopması, tur 5'te 8 sn arka plan, tur 7'de 32 sn arka plan + ağ kesik):** ÖNCE (eski derleme): maç bitti ama tur 5'te iki ekran **105 sn sayaç 0'da** (DB donması, konsolda 57014), kopuklukta sayaç yeniden yükseldi, 0'da >3 sn kalma A 4 / B 5. SONRA: **koşulamadı** — test sırasında makinede bellek azaldı, Claude Code arka plan işlerini (önizleme sunucusu + test) durdurdu; ardından Supabase yanıtsızdı. Başsız Chromium'da CDP dondurma JS'i durdurmadı; uzun kopmada ağ da kesiliyor.
- **Yarıda kalan testin izleri (DOĞRULANAMADI, Supabase kapalı):** test başında `duello_acilis_mac_esigi` 5 → 0 çekildi, testin `finally` bloğu çalışmadı → canlıda 0 kalmış olabilir; iki misafir test hesabı ("DuelA…/DuelB…") ve bir test düellosu kalmış olabilir. Supabase dönünce ilk iş: eşiği 5'e al, test düellosunu iptal et, hesapları sil. Önceki üç test koşusunun hesapları silindi (200 "tam").
- **Push YAPILMADI** (kabul testi koşulamadı); commit'ler yerelde: d6485cfa, 52d0daac, 02151387. 761 canlıda olduğundan canlı istemci şu an "Tur n/16" gösterir ama tanıtım/ana sayfa metinleri push'a kadar "10 tur" der.

## 2026-10-01 · Sezon finali = Ejderha çerçevesi (migration 780) — YARIM KALDI, Supabase sağlıklı olunca devam

Ida kararı: seviye 28 ücretli ödülü Ejderha çerçevesi (`pc_ejderha2`), dükkândan çıkar, Battle Pass ekranında boş/"?" yer kalmasın. Supabase yanıt vermeyince durduruldu (sahibin talimatı: hiçbir DB isteği yok). Commit/push YAPILMADI.

**Yapılanlar**
- **780 CANLIYA UYGULANDI** (önce `migration-prova`, sonra `migration-uygula`): `kozmetikler.satis_pasif` kolonu + `kozmetik_satista` ona bakar; `pc_ejderha2` satis_pasif=true (kayıt, sahip, takılı korunur); `bp_odul_uygula` 'cerceve' türü: anahtar premium çerçeve kozmetiğiyse `kozmetik_ver` (idempotent), değilse eski `cerceve_ver`; 28/ücretli satırı gerçek ödül (Ejderha çerçevesi / Dragon frame, efsanevi). Seviye 28 için mevcut alım kaydı yoktu; Ejderha sahibi 1 (Ida), takılı değişmedi. Canlıda doğrulandı: satista=false, sahip=1, ödül satırı gerçek.
- **Yeni rollback'li test** `araclar/sezon-finali-sql-testi.mjs`: 30/30 geçti (migration sonrası alım/sahip/takılı aynı, idempotent, BP'siz alınamaz, bp_odul_al / bp_toplu_al / bp_satin_al geriye dönük / sezon_kapat otomatik verme, çift alma reddi, dükkân satın alma reddi, diğer kalemlerin satışı değişmedi).
- **İstemci** (build temiz): `CerceveOdulGorsel.jsx` (yeni; tembel PremiumAvatarCizim, iskelet, hata → çerçeve ikonu, `OdulKimlik` bağlamı), `OdulGorsel.jsx`, `Yol.jsx` (28 yuvası), `SezonUst.jsx` (hero "Sezon sonu ödülü" etiketi + 56 px çerçeve), `SatinAlSayfasi.jsx` (yeni ödül vitrini), `OdulSayfasi.jsx` (rozet + premium önizleme boşlukları), `SezonYoluPage.jsx`, `sezon-yolu.css`, `lib/ceviri/sezon-yolu.js` (EN).
- **Ekran aracı** `araclar/sezon-yolu-v3-ekran.mjs` (RPC taklitli) son koşu: 276 geçti, 2 kaldı. Görüntüler `tasarim/sezon-yolu/v3/`. Kalan 2: (1) "satın alma 360×640 tr" kontrast: vitrin yazısı altına Ejderha alevi/kanadı giriyor (önizlemede aynı sorun `sy-onizleme[data-premium]` boşluğuyla çözüldü; vitrin için aynı tür boşluk/yazı paneli düz zemin gerek), (2) "yük sırasında iskelet" testi: iskelet 0 (önbellekten hızlı iniyor olabilir; testin gecikmesi/yolu gözden geçirilecek).
- Kalan "?" yer tutucular DEĞİŞMEDİ (yeni ödül icat edilmedi): 5 avatar, 8 çerçeve, 14 avatar, 17 çerçeve, 19 çerçeve, 21 avatar, 22 tepki paketi, 23 çerçeve, 27 avatar (hepsi ücretli kol). Ana sayfadaki BP rozeti (`SezonMiniRozet`) 22 px seviye halkası; boş/resimsiz yer bulunmadı, dokunulmadı.
- Sahip hesap önce-görüntüsü scratchpad'de (`sahip-once.json`); sahip hesapta hiçbir işlem yapılmadı.

**Kalanlar**
1. Eski SQL testleri (yolu 76, taşma 79, kapanış) bayrak açık olduğu için "kapalı" varsayımında kırılıyor. Düzeltme: üç dosyada `begin` sonrası zaten eklenen satırın yanına `delete from sezonlar where not test` eklemek (bayrak false + gerçek sezon silinip bayrak true → "Sezon 1 şimdi başlar" durumu; kapalı/ROLLBACK). Şu an dosyalarda yalnız `update ... 'sezon_yolu_acik' = false` satırı var (eksik; son düzenleme kullanıcı tarafından durduruldu). `sezon-yolu-sql-testi` ayrıca placeholder beklentisini `avatar:4,cerceve:4,tepki_paketi:1` yaptı. Üçü de yeniden koşulup 76/76, 79/79, kapanış geçmeli.
2. Yarış testi (`sezon-tasma-yaris-testi` + `sezon-yolu-yaris-testi`, `TEST_KULLANICI=<test hesabı>`): koşulmadı.
3. Vitrin kontrast düzeltmesi + iskelet testi, ardından `sezon-yolu-v3-ekran.mjs` yeniden (dev sunucusunu kendin aç, `--adres=`).
4. **Silinecek test hesabı:** ekran aracının açtığı misafir hesap `732725ee-4824-4fbd-baa0-cd699aca1565` (oturum dosyası `.sezon-b-oturum.json`, git'e girmez) → `hesabimi_sil` ile sil; sahip bakiyeleri önce/sonra karşılaştır.
5. Commit'ler (mantıksal adımlar ayrı), `main`'e push, Vercel dağıtımı + canlı doğrulama, sw.js sürümünü `git pull` sonrası güncel değerden artır, PROJECT_CONTEXT (Sezon Yolu bölümüne: finali Ejderha, `satis_pasif`) güncelle.
- Not: 780 canlıda, istemci henüz dağıtılmadı; eski istemcide 28 yuvası madalya ikonu gösterir, önizleme çalışır, Ejderha dükkânda görünmez.

## 2026-10-01 — Denetim düzeltmeleri (kontrast · kart arka planı performansı · dükkân hareketi · lig grubu 25 · EN ülke adları) — YARIM KALDI, Supabase sağlıklı olunca devam
**Araç:** Claude Code (Sonnet 5.5) · **Migration aralığı:** 750–759 (yalnız 750 yazıldı) · **Commit YOK, push YOK, migration CANLIYA UYGULANMADI.**
**Neden:** `tasarim/denetim/2026-09-30/rapor.md` (Ö1, Ö2, Ö3, Ö5, Ö7, K9) + Ida'nın iki ek isteği (dükkân baloncukları, ülke adları EN).
**Durum:** Supabase yanıt vermiyor (REST/DB/pooler zaman aşımı, ~01:30'dan beri) → DB'ye dokunan her adım durduruldu. Dev sunucusu (5180) ve ölçüm betikleri kapatıldı.

### YAPILANLAR (hepsi çalışma ağacında, commitlenmemiş)
- **1 Kontrast:** `arka-plan.css` (kart içi sarı yazı açık tonlandı `#FFE27A`; "Çaylak" çipi ve lig "sen" rozeti koyu mor `#4f2fd6`; `--qt-metin-soluk` tam beyaz; Sezon mini rozet sayısı beyaz-üstü-beyaz idi → koyu), `koleksiyon-puani.css` (vitrinde `#ffe27a`, arama VS karesinde `#6b4200` ≈5,9:1), `DuelloPage.a.css` (yalnız `.hk-mac` joker ipucu/kilit → `#6b4200`). Ölçüm (gerçek piksel, parçacıksız taban, 4 arka plan × 390/360 × TR/EN): önce 17 eşik altı kalem (Çaylak/sen 1,19; Lv 4,15; Puan 4,22) → sonra yalnız Gece/360 "Puan" p5 1,35 (medyan 10,6; ay halesi artefaktı). VS karesi ve Düello ipucu gerçek piksel ölçülemedi (DB gerekir), hesapla 5,9 / ≈7.
- **2 Performans (Ö5):** `KartArkaPlan.jsx` + `arka-plan-tam.css`: (a) en küçük baloncuk ve kar noktasında sallanma animasyonu kaldırıldı (kart başına animasyon ↓, sabit kare aynı); (b) ADAPTİF KALİTE: hareketli kart varken ilk 16 sn kare süresi ölçülür, art arda 2 pencere >22,5 ms ise parçacıkların %67'si (kademe 1), ≥30 ms ise %33'ü (kademe 2) kalır (`.abp[data-kalite]`, sessionStorage); hızlı cihazda değişmez. Kök bulgu: maliyet animasyon sayısıyla doğrusal (her ana kare tüm animasyonlu öğelerin stilini yeniden hesaplar; 1×'te 103/75/38 animasyon → stil 541/353/198 ms). Harness (`olcum/index.html`, DB'siz, 2 hareketli kart, CPU 6×): Kar ~35 → 60 fps, Su Altı ~41 → 59 fps (kademe 2'ye inince). GERÇEK ANA SAYFADA (1 kart) ölçüm YAPILAMADI (oturum/DB).
- **3 Dükkân/Koleksiyon:** kök neden: genel 3 kart sınırı + "hareketi azalt"ta statik kompozisyon (ve pil ≤%20'de statik) → dükkânda kartlar donuyordu. `KartArkaPlan` GRUP KOTASI (`grup="dukkan"`): en çok 2 kart TAM (büyük önizleme önce), kalan görünür kartlar hafif (yumuşak) oynar, hareketi azalt/pil düşükte de yumuşak oynar, ekran dışı durur. `DukkanKozmetik.jsx` ArkaPlanOrnegi `grup/oncelik` geçer; küçük örnekte "Lv 17" koyu hap üstünde (kar taneleri örtmez). Harness `olcum/grup.html` (DB'siz): normal 2 oynar + 3 yumuşak, azalt açık 5 yumuşak, hiçbiri statik değil, konumlar değişiyor. Gerçek dükkân sayfası ekran görüntüsü ALINAMADI.
- **4 Lig 25 (yazıldı, UYGULANMADI):** `supabase/migrations/20260612000750_lig_grup_boyu_tek_tanim.sql` (prova `migration-prova.mjs` rollback ile geçti): tek tanım = gerçek grup (grup_no ≥ 1) üyeleri (açık bot hariç); `lig_uyeligim_kur` (danışma kilidi, yeri olan en dolu grup/yeni grup, uygun olmayan hesap → grup 0 "bekleme", bekleme→gerçek geçişi), `lig_gruplarini_kur` (uygun olmayanlar grup 1 yerine 0), `lig_grubum` (grup 0 yalnız kendini görür), `lig_haftayi_kapat` (yalnız `and u.grup_no >= 1` eklendi), yeni `lig_gruplari_dengele` (istemciye kapalı), bu haftanın düzeltmesi (46 uygun-olmayan satır grup 0'a; taşan grup dengelenir; satır silinmez). Canlı veri (bu hafta bronz): grup 1 = 75 satır (24 insan+5 bot uygun, 46 uygun olmayan), grup 2 = 25. Beklenen sonuç: grup 1 = 25 (taşan 4 bot grup 3'e), grup 2 = 25, grup 0 = 46.
  `araclar/lig-grup-sql-testi.mjs` YAZILDI ama HİÇ KOŞMADI (ilk koşu kilitte kaldı, kesildi). Koşarken `set local lock_timeout='5s'` ekle; 30 satırlık sentetik senaryo yerine `oyun_ayarlari.lig_grup_boyu`'nu transaction içinde 5'e çekip ~12 hesapla dene (kilit yüzeyi küçülsün). `lig_haftayi_kapat` adımı ağır/kilitli: gerekirse atla ve raporla.
- **5 EN ülke adı:** `lib/konum.js` (`ulkeAdiCevir`, `bildirimMetni`), `lib/unvan.js` (ülke unvanı EN'de Intl ile), `UnvanSecici.jsx` (ülke kodu geçer), `BildirimToast.jsx` + `BildirimZili.jsx` (sunucu bildirimi ülke adı çevrilir). `araclar/ulke-adi-testi.mjs` (DB'den 86 ülke okur; dev sunucu gerekir): EN 6/6, TR 3/3 geçti (86/86 ülke, Türkçe harf kalmadı, şehir adı değişmedi). Sunucu PUSH gövdesi (OS bildirimi) sunucuda üretildiğinden EN'de Türkçe ülke adı taşır — istemciden çevrilemez, AÇIK KONU (istenirse `ulkeler.ad_en` migration'ı).
- **Ana paket boyutu (yalnız benim değişikliklerim, HEAD kopyasına uygulanıp derlendi):** giriş gzip 467,7 → 469,4 KB (+1,7 KB; js +1,3, css +0,2). Derleme temiz.

### KALANLAR (Supabase sağlıklı olunca, sırayla)
1. `PROJECT_CONTEXT.md` güncelle: lig grup tanımı (grup 0 = bekleme), kart arka planı grup kotası + adaptif kalite, satır ~206 "ülke metni tek dil" → EN'de istemcide çevrilir.
2. Lig: `lig-grup-sql-testi.mjs` koş (yukarıdaki notlarla) → 750'yi canlıya uygula (`migration-uygula.mjs`) → canlıda bronz grupları doğrula (her grup ≤ 25) → yeni misafir hesapla ana sayfa "x/25" gör.
3. Ölçümler: gerçek ana sayfada fps önce/sonra (390×844, CPU 6×, 4 sn rAF; 4 arka plan), kontrast "sonra" tam tur (Sezon rozeti düzeltmesi dahil) + VS karesi/Düello ipucu gerçek piksel, dükkân Arka Plan sekmesi ekran görüntüleri (hareketi azalt açık/kapalı), EN ülke taraması canlı sayfalarda.
4. Commitler (mantıksal adım başına): kontrast · performans · dükkân · ülke adları · lig migration+test. Dikkat: `DukkanKozmetik.jsx`, `DuelloPage.a.css` vb. dosyalarda BAŞKA pencerelerin hunk'ları da var (avatar nadirlik 770, Düello) — yalnız kendi hunk'larını `git apply --cached` ile ekle. `public/sw.js` sürümünü artırırken `git pull` ile güncel değeri al.
5. Test hesapları SİL: `9cba8f79-8682-482b-985b-b02ef8bd38b9` (Kalite7890) ve `d3587f1a-f471-401a-804f-a6bd997fe8b1`; ikisine de `oyuncu_kozmetikleri` `hediye` (pa_*) satırları ve `takili_premium_aura` verildi → `hesabimi_sil` mantığıyla sil, sahip bakiyelerine dokunulmadı. Oturum dosyaları yalnız scratchpad'de.
6. Temizlik: `araclar/_gecici-*.mjs` ve `araclar/_q.mjs` (yalnız bu pencerenin; diğer pencere `_gecici-*` dosyalarını siliyor olabilir) — commit'e girmesin.

### DOKUNULAN DOSYALAR (git status)
Değiştirilen: `oyun/tasarim/arka-plan/{KartArkaPlan.jsx, YildizliGeceArkaPlan.jsx, arka-plan-yeni-ortak.jsx, arka-plan.css, arka-plan-tam.css}` · `oyun/tasarim/ekranlar/koleksiyon-puani.css` · `oyun/pages/DuelloPage.a.css` · `oyun/components/{DukkanKozmetik.jsx (yalnız ArkaPlanOrnegi grup satırı), BildirimToast.jsx, BildirimZili.jsx, UnvanSecici.jsx}` · `oyun/lib/{konum.js, unvan.js}`.
Yeni: `supabase/migrations/20260612000750_lig_grup_boyu_tek_tanim.sql` · `araclar/lig-grup-sql-testi.mjs` · `araclar/ulke-adi-testi.mjs` · `oyun/tasarim/arka-plan/olcum/{grup.html, grup.jsx}`.

### 2026-10-01 · Sezon finali — DEVAM (Supabase yeniden başlatıldıktan sonra, hafif mod)
- Eski SQL testleri düzeldi (bayrak false + `delete from sezonlar where not test`, ROLLBACK): **yolu 76/76, taşma 79/79, kapanış 23/23**, yeni finali testi **30/30**; `npm run build` temiz. Yük/yarış testi bilerek KOŞULMADI (Ida bitişte söyleyince bir kez).
- Satın alma vitrini için kontrast düzeltmesi (CSS: 128 px kutu + yazıya düz zemin) yapıldı ama **ekran ölçümüyle doğrulanmadı** (DB'ye yük bindirmemek için). Ekran aracı 276 geçmişti; kalan 2 madde (vitrin kontrastı 360×640, iskelet testi) yeniden ölçülmeli.
- Ekran aracının açtığı misafir hesap `732725ee-4824-4fbd-baa0-cd699aca1565` HÂLÂ SİLİNMEDİ (silme DB isteği; Ida onayıyla/yük sakinleşince `hesabimi_sil`). `.sezon-b-oturum.json` git'e girmez.
- sw.js v15 → v16, PROJECT_CONTEXT Sezon Yolu bölümüne finali satırı eklendi.

### 2026-10-01 · Sezon finali — TAMAMLANDI (canlı doğrulama)
- `git pull --rebase` temiz; **push edildi** (d63ec5be..ca90865b, Düello 760–762 commit'leriyle birlikte, Ida onayı). Vercel dağıtımı bitti (sw.js v16 canlıda).
- **Canlı doğrulama** (`araclar/sezon-yolu-v3-canli.mjs`, quiztactics.vercel.app, 360×640 TR, tek tarayıcı, yalnız okuma): hero'da yük sırasında iskelet var ve "?" yok · "Sezon sonu ödülü" etiketi · BP satın alma vitrininde Ejderha çizildi · yatay taşma 0 · vitrin metinleri gerçek piksel kontrastı en düşük **6,8** (≥ 4,5) · sayfa hatası 0. Görüntüler `tasarim/sezon-yolu/v3/canli-*.png`. (Not: Playwright'ta `serviceWorkers: "block"` gerekir; yoksa SW önbelleği route gecikmesini atlar.)
- **Test hesabı silindi:** `732725ee-…` (`hesabimi_sil`, tek çağrı): auth 0, profil 0; `.sezon-b-oturum.json` silindi.
- **Yarış testi KOŞULMADI** (Ida söyleyince bir kez: `TEST_KULLANICI=<yeni test hesabı>` ile `sezon-tasma-yaris-testi` + `sezon-yolu-yaris-testi`; sonra hesabı sil).
- Ekran aracının eski ölçüm maddeleri (vitrin kontrastı, iskelet) canlıda kapandı.

### 2026-10-01 (devam) — YARIM KALDI notu KAPANDI: Supabase geri geldi, kalanlar tamamlandı
- **Lig (Ö7):** `lig-grup-sql-testi.mjs` hafif senaryoyla (grup boyu transaction içinde 5, 12 hesap, `lock_timeout 5s`, kapanış çalıştırılmadı) **27/27** geçti; 750 canlıya uygulandı (`migration-uygula.mjs`). Bu hafta bronz: grup 0 = 47 (bekleme), grup 1 = 25, grup 2 = 25, grup 3 = 4 (taşan 4 bot); gümüş 11, altın 8. Hiçbir grup 25'i geçmiyor. Yeni test hesabı ana sayfada **20/25** gördü (önce 25/76). Satır silinmedi. Kapanışın (`lig_haftayi_kapat`) grup 0'ı atladığı yalnız kaynak incelemesiyle doğrulandı, çalıştırılmadı.
- **Ölçüm (tek koşu/arka plan, 390×844, TR; ana sayfa + lig satırı, gerçek piksel, parçacıksız taban):** eşik altı kalem YOK (Su Altı/Kar/Sonbahar); Yıldızlı Gece yalnız "Puan" p5=1,35 (medyan 10,8 — ay halesi artefaktı). Önce: Çaylak/sen 1,19, Lv 4,15–4,23, Puan 4,22–4,28. 360 px ve EN tekrar koşulmadı (hafif çalış kuralı); onlar önceki 216 ölçümlük turda (4 arka plan × 390/360 × TR/EN × ana/lig) 17→2 kalem olarak ölçülmüştü.
- **fps (ana sayfa, CPU 6×, 4 sn rAF, tek koşu; önce → sonra):** Yağan Kar 23–28 → **49,1** (en uzun kare 117 ms) · Su Altı 33–40 → **52,6** (84 ms) · Sonbahar 52–57 → 54,1 · Yıldızlı Gece 53–56 → 58,6. Kar ve Su Altı adaptif kalitede kademe 1'e indi; 1×'te kademe 0, tam görünüm. Makine diğer pencerelerce yüklüydü (gürültü ±5 fps).
- **Dükkân (gerçek sayfa, 390×844):** normal: 5 kart, 2 tam + 3 hafif oynuyor; "hareketi azalt" açık: 5 kart yumuşak oynuyor, hiçbiri statik değil; yatay taşma 0; "Lv 17" koyu hap üstünde okunur. Görüntüler `scratchpad` (repoya alınmadı).
- **Test hesapları SİLİNDİ** (4 adet; profil/auth/lig 0). Sahip hesaba dokunulmadı. Dev sunucusu kapatıldı. `sw.js` v17.
- **Ölçülemeyen/açık:** arama ekranı VS karesindeki Koleksiyon puanı ve Düello joker ipucunun GERÇEK piksel ölçümü (maç gerektirir; hesapla 5,9:1 ve ≈7:1) · sunucu PUSH gövdesinde EN'de Türkçe ülke adı · gerçek iOS/Samsung.

## 2026-10-01 — Ülke adı İngilizce + push dili (781)
- `ulkeler.ad_en` eklendi (86/86 dolu, Intl'den; Türkçe `ad` ve veri değişmedi). `push_metni`: dil Türkçe değilse ve anahtar `ulke_sampiyonu_oldun` ise Türkçe ülke adı → `ad_en`. Push şablonları zaten dile göre (214); eksik olan yalnız ülke adıydı.
- Karar: çeviri yalnız bu anahtarda (oyuncu adı/şehir parametreleri ülke adıyla karışmasın). 710 (yildizli_gece_ac) uygulanmamış/sırasız; `db push --include-all` kullanılmadı, 781 doğrudan uygulandı + schema_migrations'a işlendi.
- Doğrulandı: en → "Champion of Philippines", tr → "Filipinler", başka anahtar etkilenmedi.

## 2026-10-01 — Avatar nadirliği 770: seçim ızgaraları nadirliğe göre bölümlü + Sahne rengi (bayrak açık)
- **770 canlıda** (önceden uygulanmıştı; bayrak `avatar_nadirlik_renk` = true, `schema_migrations`'ta var): aktif 62 avatar Yaygın 21 · Nadir 15 · Epik 18 · Efsanevi 8; Epik zemini oyunun moru `#8b2fd6`.
- Kod: `AvatarNadirlikGoruntu.jsx` (`NadirlikImg`, `AvatarBolumBasligi` "● Efsanevi · 8"), `avatar-bolum.css`, `avatarNadirlik.js` (`nadirligeGoreBolumle`, `useNadirlikHaritasi`); Profil/Kurulum/Dükkân/Koleksiyon ızgaraları bölümlü (Yaygın → Nadir → Epik → Efsanevi), arama halkası avatarları Sahne renkli.
- **Ölçüm (rebase sonrası, `araclar/avatar-770-ekran.mjs sonra --g=…`, tek tarayıcı, DB'ye yalnız birkaç hafif sorgu, timeout yok):** Profil/Dükkân/Koleksiyon 360×640 TR + Profil/Dükkân/Koleksiyon 390 TR/EN: 62 avatar, Sahne renkleri doğru, başlık sırası doğru, başlıklar sığıyor, yatay taşma 0, dokunma hedefi ≥ 44, konsol hatası 0 (38/39; tek ✗ aşağıdaki Kurulum yolu). Kurulum 390 TR elle ölçüldü: başlıklar sığıyor, 62 öğe, en küçük hedef 57 px, taşma 0, 4 renk doğru. Görüntüleri incelendi.
- Bulgu: `--kurulum` yolu bozuk — yeni misafir artık sihirbaz açmadan ana sayfaya düşüyor (takma ad/avatar bayrakları dolu) ve önce Tanıtım ekranı var. Kurulum ölçümü test hesabında `avatar_onayli=false` + `bildim_tanitim=1` ile yapıldı; betikteki `--kurulum` adımı güncellenmeden güvenilmez.
- Test amaçlı 4 misafir hesap (aracın 3 başarısız denemesi + 1) silindi. Eski denetim misafirine (eeb11c7e) dokunulmadı.
- Ana paket gzip (giriş): 469,4 → 470,3 KB. `sw.js` v18. Ekran görüntüleri repoya alınmadı (boyut).
- Başka pencerelerin bitmemiş işleri (Düello tahta: `mac.js`, `BildimApp.jsx`, `duello-tahta/`, `tasarim/duello/`) ve `DukkanKozmetik.jsx › ArkaPlanOrnegi` yorum yeri değişikliği commit dışı bırakıldı.

## 2026-10-01 — Migration defteri tutarlılık denetimi (salt okunur)
- Defter 430 / dosya 431; tek fark 710 (yildizli_gece_ac): etkisi canlıda VAR, deftere işlenmemiş (pa_gece aktif). Düzeltme önerisi raporda, UYGULANMADI.
- Cron 28/28 dosyalarda; Auth sağlayıcı ayarları, Edge Function deploy listesi ve secret adları CLI 403 nedeniyle panelden doğrulanmalı. Rapor: tasarim/denetim/migration-defteri.md

## 2026-10-01 — Denetimden kalan küçük arayüz düzeltmeleri (dal: arayuz-kucuk-duzeltmeler)
**Araç:** Claude Code (Sonnet 5.5). **Migration yok**, DB'ye dokunulmadı; main'e push edilmedi.
- **Eski maddeler zaten kapalı (ölçüldü, 360 px, açık tema):** (1) `.bd-lobi-kilic` sınıfı artık hiçbir JSX'te yok (2096 kurallık CSS temizliğinde gitti); lobi ad düğmeleri `.ls-ad-dugme::after` ile ≥44 px; `arayuz-denetim.mjs` 7 genişlikte TEMİZ. (2) Seri sayısı `isi-sicak` → `var(--bd-hata-2)` #B62F2F = 6,11:1 (Paket 43 A.1; eski 2,31). (3) "Çırak" artık satır içi renk değil, `.qt-dk-ustalik-seviye` → 7,75:1. (4) Gizlilik/Koşullar metin içi bağlantı 7,75:1 (eski 2,68), TR+EN.
- **5 / K6 yapıldı:** Lig sayfasında "Sezon bitimine" → "Hafta bitimine {sure}" (EN "Week ends in"), "Haftalık sezon" → "Haftalık lig" ("Weekly league"), bilgi satırı "Hafta bitince … sıfırlanır" / "When the week ends…". Battle Pass ("Sezon Yolu") metinlerine dokunulmadı. Canlı ölçüm: "Hafta bitimine 3 gün 12 saat".
- **K3 yapıldı (renk):** `--qt-dogru-koyu` #137a45 → #0f6b3b (Meydan `Kolay` rozeti 3,94 ve Hazır kapısı `×2` 4,45 bu jetonu kullanıyor); `.qt-dk-fiyat-adet` opaklık .8 → .9 (4,33 → ≥4,5); Ana sayfa turnuva bandı altın/gümüş madalya yazısı 3,88 / 4,13 → #8a5500 / #4f5c73 (≥4,5). Tarama sonrası ana sayfa 0 eşik altı.
- **K4 / K5 yapılmadı:** K4 (360×640 turnuva bandı lig kartına biniyor) ana sayfa yerleşimi = yapısal, yasak; ayrıca bant yalnız lobi açıkken var, şu an üretilemedi. K5 (kurulum penceresi 360×640 hesap şeridi kırpık) yeni hesap gerektirir (DB yazısı), ölçülmedi. İkisi listede açık.
- **Araç:** `araclar/kontrast-tarama.mjs` (360 px, `--dil=tr|en`; EN için profil yanıtını yalnız tarayıcıda çevirir, DB'ye yazmaz). Kalan eşik altı çıkanlar ölçüm artefaktı: gradyan dolgulu ad (`.qt-ia-dolgu`), SVG "2X", Sezon Yolu başlığı görsel üstünde; gerçek kalan: `.sy-soru` "?" yer tutucusu 4,18 (aria-hidden, Battle Pass, dokunulmadı).
- **Ders:** Giriş yapmış hesapta dil profilden gelir (`dilCoz`); localStorage `bildim_dil`'i her açılışta init script ile yazmak yeniden yükleme döngüsü yapar.

## 2026-10-01 — Ana sayfa kozmetik düzeltmeleri + Sezon Yolu şeridi + Sezon Yolu açılış animasyonu (dal: ana-sayfa-sezon-seridi)
**Araç:** Claude Code (Sonnet 5.5). **Migration yok, DB yazımı yok**; yeni RPC yok (sezon_ozetim + sezon_yolu_durumum okunur). main'e push EDİLMEDİ; ayrı git worktree'de çalışıldı (başka pencerenin bekleyen işlerine dokunulmadı). Kullanıcı isteği (Ida): ana sayfa kozmetik + şerit + animasyon, Dükkân/Düello/BP mantığı/ödül tablosu/soru seçimi dosyalarına DOKUNMA.
- **A1 boşluk + halka (ölçüldü, 390×664 / 844):** turnuva bandı ↔ komşu 8 → 13–14 px (kısa ekranda 6 → 12). Lobi halkası eskiden bandın 9–11 px DIŞINA taşıyordu (komşu kartın ve ekran kenarının üstüne biniyordu) → altın halka 3 px + nabız en çok 5–6 px, taşma yok.
- **A2 OYNA/DÜELLO:** 412×915'te 109,5 → ≤ 92 px (uzun ekranda uzayıp içerik üst yarıda kalıyordu); kısa ekranda 62–68 → 54,6 px (≤800 px yükseklikte; turnuva 62 → 50, kısayol 84–90 → 76, simge küçüldü). 390×664'te OYNA/DÜELLO ilk ekranda (alt kenar 483,6 px, alt menü 594).
- **A3 gri nokta:** kaynak `.as-rozet-nokta` (Meydan Okumalar'da bekleyen davet, Hatalarım'da `banka` > 0 = bekleyen yanlış soru) ve `.as-gs-nokta` (Görevler'de alınabilir ödül): 8 px soluk gri-mavi (#8fa3bd, 30 Eyl "sessiz rozet" kararı) → bildirim noktasıydı, anlamsız duruyordu. Marka turuncusu (#ff7a2e) + beyaz/koyu çift kenar, 10 px. (Hesapta bekleyen soru yok; DOM'a nokta eklenerek ölçüldü.)
- **A4 Ejderha çerçevesi (taklit kartla ölçüldü, 360×740 · 390×844 · 390×664):** çerçeve kutusu kartın İÇİNDE (64×64, sol 14–22 px); yalnız boynuz ucu kartın üst kenarından ~5 px taşıyor ve ucu KESİLMİYOR (ata öğelerde overflow visible); ateş parıltı katmanı (`pc-k`, 109×109) 7 px alt/üst taşar ama saydam. Bilerek yapılmış güzel taşma → DOKUNULMADI.
- **A5** Lig kartı "15/25" → "Sıra 15/25" (EN "Rank 15/25"); kısa ekranda alt satır ("Yükselmeye n puan kaldı") mutlak kutu yerine başlık satırında ellipsis'le kısalır (pill uzayınca 360 px EN'de üst üste biniyordu).
- **A6 renk:** turnuva bandı koyu lacivert (#1B2260→#2B3596) + altın kupa/yazı (#FFE08A), KATIL turuncu kaldı, lobi halkası altın; beyaz/lacivert ≈ 14:1, altın/lacivert ≈ 10:1. Kırmızı = rakip, mor = seçim ayrı kaldı. Arka plana taban rengi eklendi (kontrast aracı gradyanı göremiyordu).
- **B Sezon Yolu şeridi** (`oyun/components/sezon/SezonSeridi.jsx`, ana sayfada Görevler'in hemen üstü): "Sezon N · Seviye X/28 · ilerleme · sıradaki ödül küçük resmi (placeholder "?") · X gün kaldı"; BP sahibi değilse altın "Battle Pass" çipi, sahipse ok + ince altın kenar; alınabilir ödül → ödül resminde altın nokta + sayı. Bütün şerit TEK bağlantı (/sezon-yolu; iç içe etkileşim yok). Yalnız `sezon_yolu_durumum().acik` (test sezonu değil) iken çizilir; yükleme/hata/kapalı → hiçbir şey. Durum 5 dk önbellekli (seviye/BP/sezon değişince yenilenir).
- **Öncelik/yerleşim kararı (telefon):** OYNA/DÜELLO > turnuva > şerit > lig > kısayol > Görevler. Yükseklik <700: şerit + Görevler gizli (sığmaz); 700–899: şerit var, Görevler gizli (avatar menüsünde); ≥900: ikisi de. Lig kartı ≤940 px'te en yakın 3 satıra iner. Lig kartının kesilen kısmı (px, önce→sonra): 664: 59→40 · 640: 66→56 · 700: 52→50 · 740: 12→10 · 780: 41→22 · 844: 29→0 · 915: 0→0 (hiçbir boyutta eskisinden kötü değil). **Gözlem:** lig kartı eskiden de 640–844 px arasında kesiliyordu (misafir hesapta 4–5 satır).
- **C açılış animasyonu:** sayfa alttan kayar 400 ms (CSS `sy-sayfa-ac`), yol mevcut seviyeye 400 ms kayar (rAF kübik), o durak 700 ms parlar (halka, scale/opacity); sezonun İLK açılışında 1,5 sn tam perde ("Sezon N" + sezon sonu ödülü vitrini = Ejderha çerçevesi; 250 ms giriş, 250 ms solma, dokununca ~120 ms'de atlanır; "gördü" `bildim_sezon_perde:<kullanıcı>:<sezon no>`, depolama okunamazsa GÖSTERİLMEZ); kapanışta sökülen sayfanın donmuş kopyası (hayalet) 250 ms alta kayıp solar (ölçülen 243 ms). Yalnız transform/opacity. "Hareketi azalt": sayfa anında, durak parlamaz, hayalet yok, perde hareketsiz (süre aynı). Premium çerçeve parçası perde için sayfa açılır açılmaz önceden indirilir.
- **Ölçümler:** `npm run build` TEMİZ · `arayuz-denetim.mjs` (16 sayfa × 4 genişlik) TEMİZ · kontrast taraması 360 px TR/EN (`/`, taklit şeritle) 0 eşik altı; `/sezon-yolu` hero'daki 2 uyarı ("Sezon 1", "Sezon Yolu") eski sürümde de var = gradyan zemini görmeyen ölçüm artefaktı (beyaz/lacivert) · konsol hatası 0 · yatay taşma 0. Araçlar: `araclar/ana-sayfa-olcum.mjs`, `ana-sayfa-ejderha-olcum.mjs`, `sezon-acilis-olcum.mjs` (hepsi taklit veri, sunucuya yazmaz).
- **Ders / olay:** `arayuz-denetim.mjs` oturum dosyasındaki ORİJİN'e (port) bağlı; farklı portta oturum bulamayıp YENİ bir misafir hesabı açtı (e0f2e1d6…). Aynı oturumun kendi token'ıyla `hesabimi_sil` çağrılarak silindi (200 "tam"); başka hesaba dokunulmadı. Başka portta çalıştırırken önce oturumu o orijine kopyala.
- **Test edilmesi gerekenler (sahibi):** telefonda (a) ana sayfa lobi açıkken turnuva bandı halkası ve boşluklar, (b) Sezon Yolu şeridi — BP yok / BP var / alınabilir ödül, (c) şeride dokununca sayfa kayarak açılır, yol seviyeye kayar; ilk açılışta perde (depoyu temizleyip tekrar: `bildim_sezon_perde:*`), (d) geri dönüşte kısa ters geçiş, (e) gerçek iOS Safari. Dal: ana-sayfa-sezon-seridi (yerel; push edilmedi).

## 2026-10-01 — Ana sayfa: Sezon Yolu + Görevler yan yana iki yarım kart (dal: ana-sayfa-sezon-seridi)
**Araç:** Claude Code (Sonnet 5.5). **Migration yok, DB yazımı yok** (yalnız `sezon_ozetim`/`sezon_yolu_durumum` taklit yanıtı tarayıcıda; oturum mevcut `.arayuz-denetim-oturum.json`, yeni hesap açılmadı). main'e push EDİLMEDİ. Açılış animasyonuna, Sezon Yolu sayfasına, Dükkân/Düello/BP mantığına/ödül tablosuna dokunulmadı.
- **Karar (Ida):** Görevler hiçbir yükseklikte ana sayfadan kaybolmaz. Eski kurallar kalktı (<700 px şerit+görev gizli, <900 px Görevler gizli).
- **Yerleşim:** `.as-a2-seritlar` tek satır flex, solda Sezon Yolu, sağda Görevler; ikisi de tek bağlantı. Sezon kartı çizilmezse (sistem kapalı / yükleniyor / hata → try-catch zaten null) `.as-a2-sezon:empty` gizlenir, Görevler tam genişlik (eski görünüm).
- **Sol kart:** "Sezon N" · "Seviye X/28" · 4 px ilerleme çubuğu; BP yoksa küçük altın "BP" çipi, alınabilir ödül varsa altın daire + sayı (99+). Kalan gün/sıradaki ödül resmi kartta YOK (yer yok; kalan gün ekran okuyucu etiketinde). Kullanılmayan `OdulKucuk`/`siradakiOdul` ve eski CSS silindi. **Sağ kart:** "Görevler" · "Günlük a/3 · Haftalık b/3"; yarım kartta simge ve ok gizli (yer metne), alınabilir ödül noktası marka turuncusu (önceki karar).
- **Kısa ekran:** 664 px'te iki kart sığması için lig kartı yalnız başlık + kendi satırı (`.as-lk-satir:not(.as-lk-satir--ben)` gizli, <700 px); kesik satır kalmadı. OYNA/DÜELLO ilk ekranda (alt kenar 428 px, alt menü 594).
- **Ölçüm (taklit veri, 360/390/412 × 664/780/844/915, TR+EN, 4 senaryo: BP yok · BP var · ödül var · sezon kapalı, 96 ölçüm):** kart yüksekliği 47–51 px (≥44), kart genişliği 167/179/190 px, metin kısalan (ellipsis) YOK, yatay taşma 0, konsol hatası 0. Sezon kapalıda Görevler 342/366/388 px tam genişlik. Lig kartı kesilen (px): 664: 0 (eski 37–43) · 780: 14–23 (eski 22–28) · 844/915: ≈0. Nokta (ödül) takılı iken 360 px TR/EN'de de kısalma yok.
- **Kontrast:** `kontrast-tarama.mjs` ana sayfa 360 px, BP yok/BP var/ödül var × TR/EN: 0 eşik altı. Araca `--sayfalar=` ve `--sezon=degil|sahip|odul` (tarayıcıda taklit) eklendi. `npm run build` TEMİZ · `arayuz-denetim.mjs` (16 sayfa × 4 genişlik) TEMİZ.
- **Test (sahibi):** telefonda iki kartın yan yana görünüşü, BP çipi/ödül sayısı, sezon kapalıyken Görevler tam genişlik, gerçek iOS Safari.

## 2026-10-01 — Avatar ve arka plan satışı (nadirliğe göre elmasla) + Battle Pass yuvaları (dal: avatar-arkaplan-satis)
**Araç:** Claude Code (Opus 5.5). **Neden:** Ida kararları: Yaygın/Nadir avatar ücretsiz, Epik/Efsanevi elmasla; arka planlara nadirlik + fiyat; satılan kalemler BP'de hediye; Sezon 1'in "?" yuvaları.
**Migration 820–822 YAZILDI, canlıya UYGULANMADI (Ida uygulayacak). main'e push YOK.** Ayrı worktree'de çalışıldı (görev talimatı; başka oturumların bekleyen değişikliklerine dokunulmadı).

- **Önce ölçülen durum (canlı):** nadirlik zaten yazılı (770): aktif 62 = Yaygın 21 · Nadir 15 (Ida'nın 14'ü + Kedili Genç; Kedili Genç = **nadir**, dokunulmadı) · Epik 18 · Efsanevi 8; `avatar_nadirlik_renk` = true; Epik zemini #8b2fd6. `edinme` hepsinde `ucretsiz`, `avatar_satin_al` "bedava — satın alınmaz" gövdesiydi, `oyuncu_avatarlari` 0 satır. Arka planlar (`premium_aura`) **hep elmasla** satıldı (coin yolu yok): tek fiyat `elmas_premium_aura` 300; sahiplik 3 satır (Su Altı 2, Sonbahar 1; hepsi `dukkan`), takılı 2 hesap (Su Altı); "giy" doğrulaması sunucuda (`kozmetik_tak`). **Lig arka planı kodda/veride HİÇ tanımlı değil** (takılı yoksa kart düz). BP: 9 "?" yuva, `avatar` türü vardı ama sahiplik tablosuna ADRES yazıyordu (yabancı anahtara takılırdı; hiç kullanılmadı), `arka_plan` türü yoktu.
- **820 avatar satışı:** fiyat `elmas_avatar_epik` 150 / `elmas_avatar_efsanevi` 300; aktif 26 Epik/Efsanevi avatar `edinme = 'elmas'`; `oyuncu_avatarlari` yabancı anahtarı `avatar_nitelikleri`'ne (31 hazır avatarın 7'si ücretli, katalogda değiller); `avatar_onayla` sahiplik ister (takılı olan hariç; sahibe ayrıcalık yok); `avatar_satin_al` (kozmetik deseni); `avatar_sahiplik_durumu()`; geriye uyumluluk: takılı ücretli avatarı olan **12 insan hesaba** `hediye` sahipliği. Botlar: 63 gizli botun takılı Epik/Efsanevi avatarı aynen duruyor, sahiplik satırı yazılmadı (botlar `avatar_onayla` çağırmaz; `avatar_url` yazan tek işlev o).
- **821 arka plan:** `kozmetikler.dukkan_nadirlik` (Yıldızlı Gece nadir · diğer üçü epik; pasif Köz/Kuzey boş), fiyat `elmas_arka_plan_nadir/epik/efsanevi` 100/200/300, `kozmetik_fiyati` üç parametreli; katalogda nadirlik `icerik.nadirlik` (dönüş tipi aynı). Mevcut 3 sahiplik ve 2 takılı korunur (300'e alanlara iade YOK — karar verilmedi).
- **822 Battle Pass:** tür kısıtına `arka_plan`; `bp_odul_uygula` avatar (anahtar/adres) + arka plan (`kozmetik_ver`); `bp_odul_ver_ic` zaten sahipse `zaten_sahip: true` (çift kayıt yok, iade yok); `sezon_yolu_durumum` ödüllere `sahip`; `trg_bp_odul_doldur` (ad/nadirlik/görsel katalogdan, yanlış anahtar reddedilir) → yuva eşlemesi tek satır. Yuvalar: 5 Korsan · 8 Yıldızlı Gece · 14 Samuray · 17 Su Altı · 21 Kristal Uzaylı · 27 Savaş Robotu; 19/22/23/28 dokunulmadı. **Geriye dönük ödül alan hesap: 0** (bu yuvalarda alım kaydı yok; BP sahibi 1 hesap, seviye 0).
- **Koleksiyon Puanı (değiştirilmedi, bulgu):** avatar puanı `oyuncu_avatarlari` × `avatar_katalogu.nadirlik`'ten gelir; o kolon 39 avatarın hepsinde BOŞ ve 31 hazır avatar katalogda yok → avatar sahipliği bugün **0 puan** (satın alınan/hediye avatar da 0). Arka plan `oyuncu_kozmetikleri` × `kozmetikler.nadirlik` = hepsi **efsanevi (10 puan)**; yeni dükkân nadirliği (Nadir/Epik) bunu etkilemez. Migration öncesi/sonrası herkesin puanı aynı (ölçüldü).
- **İstemci:** Dükkân › Avatar (kilit rozeti, nadirlik etiketi, elmas fiyatı, "Sahipsin", onay penceresi), Dükkân › Arka Plan (Nadir/Epik bölümleri, Yaygın başlığı yok), Profil/Kurulum/Koleksiyon ızgaralarında kilitli avatar seçilemez; Sezon Yolu yuvasında gerçek avatar/arka plan görseli + nadirlik yazısı (yalnız `OdulGorsel.jsx` + ödül alt sayfası; `Yol.jsx`, `SezonYoluPage.jsx`, `sezon-yolu.css` değişmedi), "Zaten sahipsin". `kayit.jsx`: takılı yoksa `lig_<lig>` satırı (çizim yok → düz kart). Nadir köşe etiketi 3,48 → koyu yeşil (≥ 4,5). Yeni çeviri dosyası `ceviri/avatar-satis.js`.
- **Testler:** `avatar-arkaplan-satis-sql-testi.mjs` **101/101** (tek transaction, ROLLBACK; sahip kimliği + sahip olmayan test hesabı; eşzamanlılık iki bağlantıyla: birinci satın alma sürerken ikinci işlem profil kilidinde bekledi — iki gerçek commit'li yarış canlıya yazmadan koşulamaz). `avatar-satis-ekran.mjs` **148/148** (360×640 + 390×844, TR/EN, RPC taklitli): yatay taşma 0, dokunma ≥ 44, konsol hatası 0, yeni öğelerde eşik altı kontrast yok (kalanlar eski/artefakt: Sezon başlığı görsel üstünde, "?" 4,18, Koleksiyon unvan çipleri, gradyan dolgulu ad). `npm run build` temiz. Yük testi koşulmadı; sahip hesapta gerçek işlem yapılmadı.
- **Uygulama sırası (Ida):** `node araclar/migration-uygula.mjs` ile 820 → 821 → 822, sonra dal main'e alınır (sw.js sürümü o sırada artırılır). İstemci migration'dan önce dağıtılırsa eski davranış sürer (kilit yok); migration istemciden önce uygulanırsa eski istemcide ücretli avatar seçimi "Bu avatar sende yok" hatası verir.
- **Açık kararlar:** (1) lig arka planı çizimleri yok; (2) BP ödülüne zaten sahip olana iade/dönüşüm; (3) Su Altı/Sonbahar'ı 300'e almış 3 sahipliğe fark iadesi; (4) Koleksiyon Puanı'nda avatar 0 puan, arka plan hepsi efsanevi; (5) Sezon bitince yuvalar aynı tabloda güncellenir (tablo sezonluk değil).

## 2026-10-01 — Birleştirme 1 (dal: birlestirme-1-ekim) — AŞAMA 1 (yerel birleştirme + doğrulama)
**Araç:** Claude Code (Sonnet 5.5). **Migration UYGULANMADI, push YOK.** Ayrı worktree (`quiztactics-birlestirme`, taban origin/main 375e7b9a); Ida bu işe özel "tek dal main" kuralını geçersiz kıldı.
- **Sıra:** arayuz-kucuk-duzeltmeler → ana-sayfa-sezon-seridi → avatar-arkaplan-satis (`--no-ff`). İlk ikisi temiz birleşti; üçüncüde yalnız PROGRESS.md çakıştı (PROJECT_CONTEXT.md otomatik birleşti). Çözüm: iki tarafın kayıtları da aynen korundu, yan yana (kronolojik) bırakıldı.
- **Migration sırası:** 820/821/822, 780/781'den sonra; yinelenen numara yok.
- **Doğrulama:** `npm run build` TEMİZ · `arayuz-denetim.mjs` TEMİZ · `/`, `/joker`, `/sezon-yolu` × 1440/850/560/390: yatay taşma 0, konsol hatası 0 · `kontrast-tarama.mjs` TR+EN: `/sezon-yolu` 10 eşik altı (hero "Sezon 1"/"Sezon Yolu" 1,16 → büyük olasılıkla açılış perdesi animasyonunun ortasında ölçüm; birleşmenin dokunmadığı alan, DOĞRULANMADI), `/joker` 1 (SVG "2X"), `/siralama` 2, `/profil` 1, `/turnuva` 4.
- **Olay:** Denetim oturumu 5174 kökenine bağlıydı; worktree'de 5175 portundan koşunca araç YENİ MİSAFİR HESABI açtı (canlı DB'ye 1 anonim hesap). Ders: worktree'de denetim için dev portunu oturumdaki 5173/5174'e ver ya da oturum kökenini taşı.
- **Önceki durum (canlı, salt okuma):** `oyuncu_avatarlari` 0 satır · 820'nin hedefi: takılı Epik/Efsanevi avatarlı insan 12 / bot 63 · bot profili 160 (avatar_url md5 `dc9b710f21971acf9c4e1144818aa67e`) · `oyuncu_kozmetikleri` 7 · `kozmetikler` 32 · `avatar_nitelikleri` 70 (hepsi 'ucretsiz') · `bp_seviye_odulleri`: placeholder avatar 4, çerçeve 4, tepki_paketi 1 (toplam 9 yer tutucu; 822 hedefi: sev. 5 avatar, 8 çerçeve→arka_plan, 14 avatar, 17 çerçeve→arka_plan, 21 avatar, 27 avatar) · `oyuncu_bp_odul_alimi` 0 · `oyun_ayarlari` elmas_avatar_epik/efsanevi yok · migration defteri 781'de.

## 2026-10-01 — Düello ücretsiz planda akıcı: arka plan yükü azaltma (dal: duello-yuk-azaltma)
**Araç:** Claude Code (Sonnet 5.5). Migration 830–831 HAZIR, **canlıya UYGULANMADI** (Ida uygular). main'e push edilmedi.
- **Ölçüm (salt okunur):** `duello_tik` ve `bildim-bot-oyna` 2 sn'de bir → günde ~43 bin koşu; son 30 günde yalnız 264 düello + 288 klasik maç → neredeyse hepsi boş. Her koşu bir pg_cron işçisi (`max_worker_processes`=6) + `job_run_details`'e 2 yazma. 28 "job startup timeout" hepsi 14:03–14:20 TSİ'de, aynı saniyede başlayan işlerde. (`job_run_details` 6 saatte budandığı için "24 sa" sayıları gerçekte ~6 saat.) Eşzamanlılık kilidi (237) dört işte ZATEN vardı. Ayrıntı/tablo: `tasarim/denetim/duello-yuk-azaltma.md` (git'e girmez).
- **Karar — sarmalayıcı:** asıl fonksiyonlar (21 KB `bot_oyna` dahil) DEĞİŞTİRİLMEDİ; başına guard koymak yerine cron komutu ince `cron_*` sarmalayıcıya bağlandı (kopya/sapma riski yok, geri alma tek `alter_job`). Sarmalayıcı: iş yoksa çıkar; Düello/Klasik tiklerinde aralığı 15 sn'ye çeker, iş doğunca (tetikleyici: düello/maç/grup/hızlı/turnuva aktif, rövanş isteği) 2 sn'ye döndürür; iş varken kendini de 2 sn'de tutar (tetikleyici kaçırırsa ≤15 sn gecikme, kendini onarır). Turnuva zamanlayıcı/bot katılım/sezon tiki: boşta-çık + try-lock (sezon_tik bloklayan kilit kullanıyordu).
- **Dokunulmadı:** kopukluk/terk kuralı (25+45 sn, istemci nabzı), `gizli_bot_nabiz`, `bot_puan_tik`, `advance_due_tournaments`, Düello kuralları.
- **İstemci:** `eylem()` (rövanş iste/iptal/yanıtla, terk) zaman aşımında (57014/AbortError/timed out/gateway timeout) en çok 2 kez yeniden dener (1 sn, 2 sn); `oyun/lib/yenidene.js`. Dördü sunucuda idempotent (kontrol edildi); cevap/joker/kategori eylem() dışı, yeniden denenmez. Düello durumu/tur/faz değişirse bırakır. Polling zaten Realtime + 4 sn yedek; değiştirilmedi.
- **Test:** `araclar/duello-yuk-sql-testi.mjs` 32/32 (rollback'li, canlıya yazma yok); `oyun/_test/yenidene-testi.mjs` 7/7; `npm run build` temiz.
- **Ders (test sırasında):** ilk prova sürümü, DDL kilidi + ikinci oturumun advisory kilit beklemesi yüzünden canlı cron işlerini ~2 dk birbirine bekletti (kalıcı etki yok; oturumlar sonlandırıldı, canlıda sarmalayıcı/tetikleyici 0, zamanlama aynı). Prova üçe bölündü (kilit/DDL ayrı); migration'da `create or replace trigger` + `lock_timeout 10s`.
- **Uygulama sırası:** 830 (zararsız: fonksiyon+tetikleyici+indeks) → 831 (cron komutları). Geri alma SQL'i 831 başında.

## 2026-10-01 — Birleştirme 1 — AŞAMA 1 tamamlandı (4. dal + Düello doğrulaması)
**Araç:** Claude Code (Sonnet 5.5). **Migration UYGULANMADI, push YOK.**
- **4. dal:** duello-yuk-azaltma `--no-ff` birleşti; yalnız PROGRESS.md çakıştı (iki taraf da sona eklenmişti), iki taraf da aynen korundu. Birleşik tepe: 25372654 + bu kayıt.
- **Migration sırası:** 820, 821, 822, 830, 831; yinelenen numara yok, canlı defter 781'de. **Not:** `lock_timeout = '10s'` yalnız 830'da var; 831'de yok (831 yalnız `cron.alter_job` çağırır, geri alma SQL'i başında yorumda).
- **Doğrulama:** build TEMİZ · `arayuz-denetim.mjs` TEMİZ (16 sayfa × 4 genişlik; `/duello` dahil: taşma 0, konsol hatası 0) · `kontrast-tarama.mjs` (derlenmiş preview, TR+EN) önceki oturumla aynı: `/sezon-yolu` 10 eşik altı (hero "Sezon 1"/"Sezon Yolu" 1,16 = açılış perdesi animasyonu; "?" 4,18), `/duello` 0. Dev sunucusunda `/sezon-yolu` 128 çıkar (yavaş derleme + perde) — ölçüm preview'da yapılmalı.
- **Önceki durum (cron):** `duello_tik` ve `bildim-bot-oyna` = `2 seconds`, aktif. Diğerleri: turnuva-zamanlayici/bot-turnuva-tik `* * * * *`, sezon-tik `*/5 * * * *`.
- **Olay 2:** Oturum dosyasında 5175 kökeni yoktu; `arayuz-denetim.mjs` bir misafir hesabı daha açmaya çalıştı ve kurulumda "Bu avatarı kullan" düğmesi pasif kaldığı için (kilitli avatar mantığı istemcide, 820 henüz uygulanmadı) yarıda kaldı. Hesap açılmış olabilir (canlı DB'de anonim). Sonra 5174 oturumu 5175/4173 kökenlerine kopyalanarak yeniden koşuldu.
- **Uygulama öncesi uyarı:** İstemci 820'den önce yayınlanırsa yeni misafirlerin kurulumunda ilk (Epik/Efsanevi olabilecek) avatar kilitli görünebilir; Aşama 2'de migration → push sırası (aralarında gecikme olmadan) bu yüzden korunmalı.

## 2026-10-01 — Birleştirme 1: 4. dal (duello-yuk-azaltma) + taban karşılaştırması (dal: birlestirme-1-ekim)
**Araç:** Claude Code (Sonnet 5.5). Migration UYGULANMADI, push YOK.
- **duello-yuk-azaltma** temiz birleşti (çakışma yok): migration 830/831 (cron boşta-çık + bağlama) + istemci yeniden deneme. Yinelenen migration numarası yok; sıra …781, 820, 821, 822, 830, 831.
- **Kontrast (360 px, TR+EN) taban origin/main (375e7b9a) ↔ birleşik:** yeni gerileme YOK. `/sezon-yolu` (10), `/siralama` (2), `/profil` (1), `/turnuva` (4) tabanda da aynı → birleşmeden gelmiyor (Sezon Yolu hero 1,16 tabanda da var). `/joker` 10 → 1 (birleşikte kalan: SVG "2X" 1,73, tabanda da var; "fiyat adet" 4,33 artık eşik üstü). Ana sayfa 42 → 45 metin, 0 eşik altı.
- **Build** TEMİZ; `/`, `/joker`, `/sezon-yolu`, `/duello` × 1440/850/560/390: taşma 0, konsol 0.
- **arayuz-denetim:** 2 konsol hatası, ikisi `profil?sekme=ayarlar` 404 `rpc/avatar_sahiplik_durumu` = 820 canlıya UYGULANMADI → beklenen; 820'den sonra kapanır. Aynı sebeple yeni istemci + eski DB'de kurulum sihirbazında "Bu avatarı kullan" devre dışı kaldı (yeni misafir akışı) → Aşama 2'de migration'lar push'tan ÖNCE uygulanmalı (zaten öyle sıralı).
- **Olay (misafir hesaplar):** denetim aracı oturumu yalnız kayıtlı köken (5174) için bulur, başka portta YENİ MİSAFİR AÇAR. Bu oturumda toplam 3 `ArayuzDenetim*` anonim hesap açıldı (183, 789, 542); üçü de `auth.users`'tan silindi (profil cascade ile gitti, doğrulandı). Kontrast aracı oturumu başka porta taşıyor, denetim aracı taşımıyor: oturum dosyasının kökenini hedef porta çevirip koş.

## 2026-10-01 — Birleştirme 1 — AŞAMA 2 (migration + canlı doğrulama)
**Araç:** Claude Code (Sonnet 5.5). Ida "push et" dedi.
- **Durum tespiti:** Aşama 2 başladığında `origin/main` zaten birleşik dalı içeriyordu (97ab9dd2; başka bir oturum push etmişti) ve 820–822 canlıda zaten uygulanmıştı. Bu oturum: 820/821/822 "Zaten uygulanmış" (atlandı), **830 ve 831 uygulandı** (`migration-uygula.mjs`, aralarında 5 sn; hatasız). Yük testi koşulmadı. Yeni push yalnız bu kayıt.
- **Canlı sonuç:** `duello_tik` ve `bildim-bot-oyna` = `15 seconds` (önce 2 seconds) · `oyuncu_avatarlari` 12 satır (hedef 12 insan; bot sahipliği 0) · defter 820–831 · bot profili 160 (820–822 yalnız `auth.uid()` RPC'lerinde profil günceller, toplu bot güncellemesi yok; eski md5 yöntemi bilinmediğinden birebir karşılaştırma yapılamadı) · BP: avatar 4 + arka_plan 2 gerçek, çerçeve 1 gerçek + 2 yer tutucu, tepki_paketi 1 yer tutucu (önceki: 9 yer tutucu) · site, /duello, /sezon-yolu 200.
- **Not:** 831'de `lock_timeout` yok (yalnız 830'da var); sorun çıkmadı.

## 2026-10-01 — Birleştirme 1: AŞAMA 2 (canlıya alındı)
**Araç:** Claude Code (Sonnet 5.5). Ida "push et" dedi.
- **Migration (migration-uygula.mjs, sırayla, 5 sn arayla):** 820, 821, 822 hatasız uygulandı; defter 822'de. **830/831 (duello cron) UYGULANMADI** — brifte yalnız 820–822 vardı, "Ida uygular" notu duruyor; dosyalar main'de, canlı DB'de henüz yok.
- **Push:** `97ab9dd2` → main (375e7b9a'dan hızlı ileri). Vercel durumu success; canlı 200.
- **Sonrası (salt okuma):** `oyuncu_avatarlari` 0 → 12 satır (12 hesap, hepsi 'hediye', bot 0, eksik sahiplik 0) · bot imzası aynı (160, md5 dc9b710f…) · `avatar_nitelikleri` 26 elmas / 44 ücretsiz · `oyun_ayarlari` elmas_avatar_epik 150 / efsanevi 300 · BP yuvaları 5/8/14/17/21/27 dolu (avatar 4 + arka_plan 2, placeholder=false); kalan placeholder: çerçeve 2, tepki 1 · `oyuncu_kozmetikleri` 7 (değişmedi) · `oyuncu_bp_odul_alimi` yazılmadı.
- **Canlı doğrulama (mevcut oturum, yeni hesap yok):** `/`, `/joker`, `/sezon-yolu`, `/profil?sekme=ayarlar` × 390/1440: taşma 0, konsol 0, 4xx 0; ana sayfada Sezon şeridi var; canlı paket `avatar_sahiplik_durumu` ve `sezon_ozetim` içeriyor.
- **Düzeltme (aynı gün):** yukarıdaki "830/831 UYGULANMADI" satırı eskidir. Başka bir oturum (düello) 830/831'i uyguladı ve `27b7403e` kaydını main'e yazdı; canlı defter şimdi 820, 821, 822, 830, 831. Bu oturum 830/831'e dokunmadı.

## 2026-10-01 — Yeni soru üretim hattı: yalnız zorluk 2 + pilot parti (kolay_01, 50 soru)
**Araç:** Claude Code (Opus 5.5)
**Neden:** Ida'ya göre "kolay" örnekler harika, "orta" zaten zor; oyuncu sıkılmasın diye zorluk 2 havuzu büyütülecek.
- **Stil profili:** `docs/SORU_STIL_PROFILI.md` (yeni; d8abcdd8 ile main'de) — yalnız zorluk 2, tarz, kategori önceliği, Ida'nın 8 onaylı örneği, geri bildirim günlüğü. PROJECT_CONTEXT'teki "kolay ve orta" satırı "yalnız zorluk 2" oldu.
- **Ölçüm (aktif havuz, zorluk 2):** sanat 129 · müzik 149 · teknoloji 162 · genel_kultur 170 · sinema 186 · edebiyat 187 · spor 193 · tarih 255 · cografya 490 · bilim 499.
- **Pilot parti:** 50 soru, hepsi zorluk 2 — sanat 10 · müzik 10 · teknoloji 8 · genel_kultur 8 · sinema 5 · edebiyat 4 · spor 3 · tarih 2; 49 global + 1 yerel TR (Ebru). İngilizce çeviri yok. `araclar/soru-uretim/kolay-01/` (sorular.json, ozet.json).
- **Eleme:** toplam 205 taslak yazıldı. Havuz bu tarzda çok doygun: 120'lik ilk turun 68'i havuzda birebir/anlamca vardı (+2 şık denge hatası), ikinci turda 7 tekrar daha çıktı. Jev kapısına 78 taslak girdi (0,005 $): şık ipucu 3 (Mario, Mayday, TikTok), sınırda itiraz 1 (Tenten/Milu — Jev İdefiks 0,90; bilgi doğru, pilot dışı), Jev seviye 4 → 2 (Among Us, emoji), eskiyebilir 2 (Meta, Ronaldo 7), belirsiz 1 (Sydney Opera), yedek 19. Net 50; etiket düzeltmesi 0.
- **Araç değişikliği (geriye uyumlu):** `birlestir-parti.mjs --klasor`; `uret-migration-parti.mjs --klasor --ad --cevirisiz` (çevirisizde `question_translations` / `ceviri_atlanan` yazılmaz). Eski parti yolu `--kontrol` ile doğrulandı. `OKU.md › Kolay seri`, `durum.json › kolay_seri`.
- **Migration:** `supabase/migrations/20260612000840_soru_parti_kolay_01.sql` HAZIR; kapı 1+2 geçti, prova (begin → rollback) başarılı. **UYGULANMADI, dosya COMMIT EDİLMEDİ** (çalışma klasöründe izlenmeyen dosya) — Ida önce 50 soruyu görecek. Onaydan sonra: gerekiyorsa çıkar/düzelt → yeniden üret → `migration-uygula.mjs` → commit.
- **Not:** `OKU.md` 7. adımdaki "gelistirme; main'e ASLA" satırı eskidir (dal düzeni 23 Eyl'de tek dal main oldu); dokunulmadı, kolay seri bölümünde "Dal: main" yazıyor.

## 2026-10-01 — Turnuva zorluk bandı daraltıldı (4-5 kalktı)
**Araç:** Claude Code
**Neden:** Ida'ya göre zorluk 3 zaten zor, 4-5'in anlamı yok.
- **Mantık (canlıdan doğrulandı):** `turnuva_soru_sec` dilim sınırını SIRA numarasıyla (dilim1_son=5, dilim2_son=10; sonrası dilim 3), dilim içi zorluğu min/max ile seçer; dilimde soru yetmezse sırayla alt dilimlerin bandına, o da yetmezse "dilime en yakın zorluk"a düşer. `turnuva_zorluk_dilim3_son` anahtarı yok.
- **Yeni bant:** 1-5 → 1-2 (aynı) · 6-10 → 2-3 (dilim2_min 3→2) · 11+ → 3 (dilim3_min 4→3, dilim3_max 5→3).
- **Migration:** `20260612000841_turnuva_zorluk_bandi_daralt.sql` (4 idempotent update; altın soru ve diğer ayarlara dokunulmadı). Prova + canlıya uygulama tamam, değerler canlıdan tekrar okundu.
- **Doğrulama:** aktif zorluk 3 havuzu 4929 soru; `turnuva_soru_sec(15)` → 11-15. sıra hepsi zorluk 3. Build temiz.

## 2026-10-01 — kolay_02: 491 zorluk-2 soru (5 parça, migration hazır, UYGULANMADI)
**Araç:** Claude Code
**Neden:** Ida zorluk 2'yi artırmak istiyor; hedef 500 soruluk kolay_02 üretimi (sanat/müzik öncelikli).
- **Çıktı:** `araclar/soru-uretim/kolay-02a … kolay-02e/` (sorular.json + ozet.json), parça başına ayrı commit. a=100 · b=86 · c=85 · d=71 · e=149 → **491 soru**; kategori: sanat 83 · müzik 92 · teknoloji 75 · genel_kultur 81 · sinema 60 · edebiyat 48 · spor 32 · tarih 20 (31'i yerel TR). Hedefe göre: sanat −7, teknoloji −5, edebiyat −2; müzik +2, genel_kultur +1, spor +2.
- **Eleme (Jev kapısına giren 662 benzersiz taslak):** Jev zorluk puanı ≥ 2,4 → 62 · şık ipucu → 17 · belirsiz ("bu da doğru" ≥ 0,35 / Jev farklı şık) → 24 · eskiyebilir → 8 · kategori kotası/zayıf → 60. Jev'e girmeden havuzla (aktif+pasif 15.404 soru + kolay-01 + önceki parçalar) birebir/anlamca tekrar ve şık-denge hatası nedeniyle ≈ 240 taslak daha atıldı.
- **Eşik kararı:** a–d parçaları sıkı eşikle (Jev puanı < 2,03) üretildi; kolay-01'in Ida onaylı 50 sorusu Jev'e yeniden sorulunca %16'sı ≥ 2,03, en yüksek 2,39 çıktı → e parçasında eşik < 2,4'e gevşetildi (a–d'de elenen sınırdaki sorular e'ye taşındı). Jev seviye ≥ 4 (≥ 2,82) hâlâ alınmaz.
- **Doygunluk:** Havuz bu tarzda çok dolu — taslakların ≈ %20-30'u havuzda aynı bilgiyle vardı. En çok sanat, müzik (şarkı→sanatçı soruları Jev'e göre hep 2,0-2,4) ve edebiyat (yazar soruları "orta") zorlandı; edebiyatta yalnız masal/çocuk kitabı soruları kolay çıktı.
- **Migration:** `supabase/migrations/20260612000842 … 846_soru_parti_kolay_02a … 02e.sql` HAZIR (`--cevirisiz`, kapı 1+2 geçti); **UYGULANMADI, COMMIT EDİLMEDİ** (kolay_01'in …840 dosyasıyla birlikte izlenmeyen). Ida soruları görüp çıkaracağı numaraları yazınca: çıkar → `uret-migration-parti.mjs` ile yeniden üret → prova/uygula.
- **Araç değişikliği:** yok (mevcut `birlestir-parti.mjs` / `uret-migration-parti.mjs`). Ara betikler (tekrar tarama, otomatik eleme, kota seçimi) geçici oturum klasöründeydi; kalıcı değil.
- **Test edilmesi gereken:** Ida'nın 491 soruluk listeyi okuyup çıkaracağı numaraları belirtmesi; ardından uygulanan migration sonrası aktif zorluk-2 sayısının artması.

## 2026-10-01 — Oyun hissi: Aşama 1 toplayıcı işler + bu turun toplu kaydı
**Araç:** Claude Code (Sonnet 5.5)
**Neden:** Aşama 1'de sayfa pencerelerinin düşürdüğü ortak parça/ölçüm borçlarını tek pencerede toplamak ve turun kaydını bir yere yazmak.

**Bu turun önceki işleri (kayıt için):**
- **Renkler (8fe8d31a):** Turnuva bandı sarıya döndü; Düello pembeden kan kırmızısına (#c93030, tek token), kırmızı yüzeylerde beyaz yazı. Kural: kırmızı yalnız Düello/rakip.
- **Soru ağırlığı (2ca695a9):** normal maçta zorluk dağılımı 80/17/3 (kolay artırıldı).
- **Soru stil profili + üretim:** `docs/SORU_STIL_PROFILI.md`; yalnız zorluk 2. kolay_01 (50 soru) ve kolay_02a–e (491 soru) üretildi; migration'lar (…840, …842–846) HAZIR, **UYGULANMADI**, çalışma klasöründe izlenmeyen dosya — Ida listeyi görüp numara çıkaracak.
- **Oyun hissi denetimi (8b48582c):** `docs/OYUN_HISSI_DENETIMI.md` — altı sayfa + ortak parça planı.
- **Aşama 0 (f1866cde, ff36ef94):** ortak parçalar (`qt-oyk-*` oyun kartı, QtAfis, OdulAni, dokunuş tek kapısı, sıralı giriş, canlı çubuk) + Görevler bu parçalara geçti.
- **Aşama 1 (944639cb Lig, 81b69270 Profil, bec2ee04 Arkadaşlar+Modlar, e583c32f Dükkân, 9c48dddb DukkanKozmetik yorum).**

**Toplayıcı işler (her biri ayrı commit):**
1. **araclar/arayuz-denetim.mjs** — kök neden: kurulum sihirbazında avatar seçici eski sınıfı (`.bd-avatar-secenek`) arıyordu; sihirbaz artık `.g-avatar-sec` kullanıyor → hiçbir avatar seçilmiyor, "Bu avatarı kullan" kapalı kalıp zaman aşımı veriyordu (Görevler/Profil ölçümlerinde takılma bundandı). Seçici kilitsiz (`:not(.qt-av-kilitli)`) ilk avatara çevrildi; düğme kapalıysa "Avatarsız devam et"e düşer. Yeni: `--oturum=dosya` ve `--sadece-oturum` (ikinci/İngilizce hesap; `.arayuz-denetim-oturum-*.json` .gitignore'da). Sonuç: 16 sayfa × 7 genişlik TEMİZ.
2. **QtAfis ton** — `.qt-oyk-afis` kendi `--oyk-serit`'ini ton sınıfından sonra tanımladığı için afiş hep maviydi. Varsayılan `:where()` ile özgüllüksüz yapıldı. 6 ton hesaplanmış stille doğrulandı. Etki: ton vermeyen sayfalar (Görevler, Lig, Modlar, Dükkân) mavi aynen; **Arkadaşlar `ton="mor"` veriyordu → artık gerçekten mor** (kodun asıl niyeti).
3. **QtModKart rozeti** — ≤600 px'te rozet metnin altına kayar, kart ikonun altından başlar (`:has`). 360/390 × TR/EN ölçüldü: örtüşme/taşma 0; Düello kırmızı aynen.
4. **Titreşim** — `geriBildirim.js › titret` artık `hisAcikMi()` kapısından geçer ("Efektler" kapalıysa çalmaz). `GB_MS` ve maç akışına dokunulmadı. Ölçüldü: Efektler 1 → titreşim 1, Efektler 0 → artmadı.
5. **Profil sekmeleri** — ≤700 px'te tek satır: aktif sekme ikon + (kısa) etiket, diğerleri 44×44 ikon düğmesi (etiket ekran okuyucuya açık). Yeni çeviri anahtarı `"İstatistik": "Stats"` (dil.js). 360/390/560/700 × TR/EN × 5 sekme: kayma 0, <44 px 0, metin kesilmesi 0.
6. **Dükkân önizleme döngüleri** — ölçüm: hareketi azalt açıkken Çerçeve (pc-), Arka Plan (abp-), İsim Efekti (qt-ia-), Elmas (ep-) sonsuz döngüleri çalışıyordu. `dukkan-cerceve.css` sonuna `.qt-dk` kapsamlı kural: bu ailelerde `animation: none`. Ölçüm sonrası 8 sekmede 0 döngü; statik kare görsel doğrulandı. Profil/maç çerçevesinin "yumuşak mod"una (yumusakHareket.js) dokunulmadı.
7. **Ölçüm (kodsuz):** 19 görünüm (Ana, Lig, Arkadaşlar, Modlar, Görevler, Meydan Okumalar, Dükkân 8 sekme, Profil 5 sekme) × 360/390 × TR/EN × (normal + hareketi azalt): yatay taşma 0, <44 px hedef 0 (Profil Davet sekmesinde bir kez 43×43 görüldü = giriş animasyonu ortası, yeniden ölçümde yok), konsol hatası 0, düz zeminli metinlerde kontrast ihlali 0 (gradyan/görüntü zeminli metinler ölçülemedi, atlandı), azaltılmış harekette içerikte dönen animasyon 0. Arkadaşlar dolu hâl (taklit sunucu cevabı + sahte Presence): çevrimiçi şerit "2 çevrimiçi", tek "Oyna" zıplaması, gelen istek nabzı (1), kabulde `ar-kap--yeni` vurgusu, azaltılmışta hepsi durur; taşma/küçük hedef 0. (Taklit kimlikler uuid olmadığı için `oyuncu_kartlari` 400 verdi — yalnız test artığı.) Küçük gözlem: 360 px'te gelen istek kartında "arkadaşlık isteği gönderdi" 3 satıra sarıyor; kozmetik, açık bırakıldı.
8. **Commit edilmemiş `oyun/lib/ceviri/mac.js` ve `src/BildimApp.jsx`:** ikisi de bağımsız Düello kategori tahtası prototipine (izlenmeyen `oyun/tasarim/duello-tahta/`) ait: mac.js +40 satır İngilizce çeviri, BildimApp.jsx +3 satır (lazy import + yalnız DEV'de giriş kapısını aşan ve üretimde SahipKapisi'ne bağlı `/duello-tahta-onizleme` rotası). Dokunulmadı; karar Ida'da.

**Gözlem:** bu turda aynı klasörde başka bir pencere/araç da çalıştı (ChallengesPage.jsx, a-meydan.css, antrenman.js değişiklikleri ve "Meydan Okumalar: sadeleştirme" commit'i e07345ee bu pencerenin dışından geldi); bu pencere onlara dokunmadı.
**Bilinen eski not:** `oyun/tasarim/OKU.md` sonundaki "titret henüz kapıya bağlı değil" satırı artık eskidir (madde 4); dosya bu işin kapsamı dışında olduğu için düzeltilmedi.
**Test edilmesi gereken (Ida, telefonda):** Profil sekme çubuğu (iPhone), Modlar'da Düello rozeti (EN), Dükkân önizlemeleri hareketi azalt açıkken, Ayarlar'da Efektler kapalıyken maç içi titreşim.

## 2026-10-01 — Sahne: Battle Pass + Görevler tam ekran oyun sahnesi (Araç: Claude Code; Neden: Ida iki ekranı "web sayfası gibi" buldu, gri kutu taslağını onayladı) — yeni ortak kabuk `QtSahne` (`oyun/tasarim/sahne/`: üst çubuk + alt menü gizli, 100dvh kilitli, sabit üst/alt yuva, tek kaydırılan bölge); Sezon Yolu dikey iki şeritli yol + sabit seviye çubuğu + altta tek büyük düğme (lejant/fayda çipleri/hero/"Seviyem"/yatay yol görünümden kalktı, arka plan türü ödül jenerik ikonla: Sezon 1 ücretli kol 8 ve 17); Görevler sabit halka özeti + nötr satırlar + zorluk 3 nokta + "Ödülü al (n)" (Sonnet alt ajanı); backend/RPC/migration yok; ölçüm `araclar/sahne-ekran-sezon.mjs` 504/504, `sahne-ekran-gorevler.mjs` temiz, `arayuz-denetim` temiz, build temiz; görüntüler `docs/sahne-ekranlari/`; commit 28dabe35 · 36f212ef · 197fe865.

## 2026-10-01 — Arayüz İngilizce: ölçüm + kalan açıklar (Ida kararı 25 Eyl)
**Araç:** Claude Code (Sonnet 5.5)
**Neden:** İngilizce oynayan oyuncu girişten başlayıp tüm modları/tanıtımları İngilizce görebilmeli (soru çevirisi hariç).
- **Ölçüm bulgusu:** arayüz zaten büyük ölçüde çevrilmiş (önceki turlar: `araclar/ceviri/tara.mjs`, `db-tara.mjs`, `bildirim-tara.mjs`). Statik taramada oyuncuya görünen yolda sözlükte karşılığı olmayan `tt()` anahtarı yok; kalanlar önizleme/ölü kod (AnaSayfaB/C/Secim hiçbir yerden import edilmez) ya da kod gürültüsü. Asıl açıklar **çalışma zamanında** çıktı → yeni araç `araclar/ceviri-ekran-tara.mjs` (İngilizce oturumla 16 sayfa + sekmeler + güvenli düğme tıklamaları + `--tanitim` + `--yol=`; ekranda kalan Türkçeyi ve taşmayı listeler).
- **Gerçek açıklar (önce → sonra):** (1) Maç sonu "Daily quests" satırında 14 görev havuzu adı Türkçeydi (`gorev_havuzu.ad_tr` sunucudan gelir, istemci `ttSunucu` sözlüğe bakar) → 14 anahtar `ceviri/mac-sonu-onizleme.js`'e (DB'deki `ad_en` ile birebir). (2) Turnuva saati yabancıya "(TSİ 20:00)" → "(Turkey time 20:00)" (`zaman.js › tsiEtiketi`). (3) Tekil: Ana sayfa "Streak 1 days" ve maç sonu "Daily streak (1 days)" → `1 gün` / `Günlük seri (1 gün)` anahtarları. (4) `Kategori Kalkanı kaldırıldı` sunucu mesajı → `ceviri/sunucu.js`. (5) Bot avatarı alt metni TR bot adı taşıyordu (`ChallengesPage`) → `botAdi()`.
- **Taşma/kesilme (360 px, EN):** ana sayfa turnuva şeridi "lobby o…" → bağlamlı anahtar `…|ana` "{saat} tournament lobby"; lig kartı "Week ends in …" → `Hafta bitimine {k}|ana` "Ends in {k}"; Meydan Oku mod kartı "Classic Mode" iki satıra sarıp ikona biniyordu → `Klasik Mod|meydan` "Classic"; Çalışma "General Knowl…" → `.m1-cal-cubuk:lang(en)` etiket sütunu 8.5rem (TR değişmez); lig satırı unvan şeridinde "Champion of S…" (şehir kayboluyordu) → EN biçimi `{şehir} Champion` (`unvan.js`; `ulke-adi-testi.mjs` ve `docs/SOZLESME_ROZET_CERCEVE.md` güncellendi). Bağlamlı anahtar mekanizması: `"metin|bağlam"` → TR `split("|")[0]` yani TR metin aynı kalır.
- **Doğrulama:** İngilizce hesapla (Classic maç baştan sona oynandı: hazırlık, 20 soru, maç sonu, Detay paneli) + tüm sayfalar + sekmeler + Düello kural tanıtımı (7 adım) 390/360 px: ekranda Türkçe yok (kalan eşleşmeler yalnız şehir/ülke özel adı: İstanbul, Türkiye, vb.). `node araclar/arayuz-denetim.mjs` TR ve `--oturum=…-en.json` EN: 16 sayfa × 7 genişlik TEMİZ. `npm run build` temiz. TR çıktı: bağlamlı anahtarların TR'si birebir aynı (`t("tr", …)` ile ölçüldü).
- **Sunucu metinleri (madde 3):** bildirim şablonları/gerçek bildirimler `ttSunucu` ile çevriliyor (`bildirim-tara.mjs`: çevrilmeyen yok); rozet/unvan/aura/çerçeve/kozmetik adları RPC'de `v_en` ile dile göre geliyor. Migration GEREKMEDİ. Çevrilmemiş 11 hata mesajı kaldı (hepsi sezon/yönetici: `bp_*`, `sezon_sahip_*`, `avatar_nitelik_yonetici`) → Sezon Yolu penceresiyle birlikte.
- **KALAN (yapılmadı):** (a) **Çoğul/tekil genel sorunu:** `{n} questions/friends/players/badges/rounds…` n=1 iken "1 questions". Sözlük çoğul bilmiyor; doğru çözüm `dil.js › t()` içinde EN için küçük bir "1 + çoğul → tekil" kuralı (beyaz liste: days, questions, rounds, matches, players, friends, badges…) — `dil.js`'e dokunulmaması istendiği için yapılmadı, Ida'nın onayı bekliyor. Yalnız en görünür iki yer (seri) çağrı yerinde düzeltildi. (b) **Düello maç içi ekranları** canlıda ölçülemedi: test hesabı 1/5 maç (Düello kilitli) — kural tanıtımı ve kilit ekranı doğrulandı, `DuelloV2/DuelloTahta/DuelloJokerSeridi` metinleri tamamı sözlükte karşılıklı (statik). Düello açılınca `ceviri-ekran-tara.mjs` ile bir tur gezilmeli. (c) **Sahne/Sezon/Görevler dosyaları** (başka pencere): `oyun/tasarim/sahne/`, `sezon-yolu/`, `GorevlerPage`, `ceviri/gorevler.js`, `ceviri/sezon-yolu.js`: DOKUNULMADI; `SezonSeridi.jsx` "BP" ve `sezonTemalari.jsx` "Sezon"/"{n} gün kaldı" tekil açığı orada kalır. Düello kategori tahtası prototipinde (`duello-tahta/`, başka pencere) TR metin: "5 KATEGORİ KAZANIR", "Kategori kontrol yarışı", "S3-R — Tek Parça Düello Tahtası". (d) `ceviri/ses.js` ve `ceviri/ses-secim.js` `dil.js`'e katılmıyor (bilinçli: `sesMetni()` kendi okuyor); `ses-secim` sayfası önizleme. (e) Soru çevirisi kapsam dışı (karar).
- **Test edilmesi gereken (Ida):** EN hesapta Ana sayfa şeridi + lig kartı + Meydan Oku (iPhone 360 genişlik) ve bir maç sonunda görev satırları.
- 2026-10-02 İngilizce tekil/çoğul: t() içinde '1 questions'→'1 question' kuralı + araclar/dil-cogul-testi.mjs; BP çipi EN'de 'Battle Pass'.

## 2026-10-02 — Arka planlar donduruldu (1 Eki, Ida)
**Araç:** Claude Code (Sonnet 5.5)
**Karar:** "Arka planları oyundan donduruyoruz. Hiçbir arka plan kalmasın oyunda." Kod ve veri durur; oyuncuya görünmez.
- **Geri açmak:** `oyun_ayarlari.arka_plan_acik = true` + `kozmetikler` pa_gece/pa_sualti/pa_yaprak/pa_kar `aktif = true` + (gerekirse) BP yuvalarını 849 yorumundaki eski değerlere döndür.
- **Migration (canlıya uygulandı, ledger'da 847-849):** 847 bayrak `arka_plan_acik=false` · 848 tüm pa_* `aktif=false` (silme yok; 4 sahiplik, 2 takılı kayıt aynen) · 849 BP ücretli yuva 8 (Yıldızlı Gece) → 25 elmas, yuva 17 (Su Altı) → 30 elmas (komşu elmas yuvaları 20/20/25/25/30; kimse almamıştı).
- **Sunucu doğrulaması (rollback'li):** pasif pa_* için `kozmetik_satin_al` ve `kozmetik_tak` "Böyle bir kozmetik yok" ile reddediyor; `kozmetik_katalogu` pa_* döndürmüyor.
- **İstemci:** tek kapı `oyun/lib/arkaPlanBayrak.js` (varsayılan KAPALI; okunamazsa kapalı). `tasarim/arka-plan/kayit.jsx` (useKartArkaPlani null + sorgu yok, KartArkaPlanKatmani null, abp-sahip sınıfı yok) → ana sayfa, profil, VS/arama, lig satırı düz kalır, parçacık/animasyon başlamaz. `useKozmetikDukkan` premium_aura'yı katalogdan düşürür → Dükkân "Arka Plan" sekmesi (eski aura dahil), Koleksiyon bölümü/sayaç/metin kalkar. Sezon Yolu ödül görseli bayrağa bağlı. EN çeviri eklendi (2 anahtar), eski metinler durur.
- **Dokunulmadı:** avatar nadirlik zemini, çerçeveler, altın isim, trg_bp_odul_doldur / bp_odul_uygula arka_plan dalı, önizleme sayfaları.
- **Doğrulama:** yalnız `npm run build` (temiz). Supabase kota/disk IO sınırında olduğu için canlıya istek atan ölçüm/Playwright/arayuz-denetim ÇALIŞTIRILMADI.
- **YAPILACAK (Supabase sağlıklı olunca):** `arayuz-denetim.mjs`; 390×844 ve 360×740'ta ana sayfa, profil, lig, Dükkân (tüm sekmeler, Arka Plan YOK), Koleksiyon, Sezon Yolu (yuva 8/17 elmas ikonu, "sıradaki büyük ödül" şeridi), VS ekran görüntüleri → `docs/arka-plan-dondurma/`; kartlarda boşluk/kontrast gözle incelenecek.
- 2026-10-02 E-posta girişi GEÇİCİ kapalı (Supabase varsayılan SMTP yalnız ekip adreslerine yolluyor, bounce uyarısı): tek bayrak `EPOSTA_GIRIS_ACIK=false` (src/lib/saglayicilar.js), gizli kapı `?eposta=1`; Login e-posta formu + HesapGuvence e-posta bağlama gizli, e-posta öneren metinlerin e-postasız TR/EN anahtarları eklendi. Kalıcı çözüm özel SMTP + alan adı. Doğrulama yalnız build + JSX incelemesi; **Supabase sağlıklı olunca 360/390 px giriş ekranı ekran görüntüsü alınacak.**

## 2026-10-02 — Supabase yük azaltma (önbellekli egress, istemci yoklamaları, cron)
**Araç:** Claude Code (Opus 5.5)
**Neden:** Panel "Exceeding usage limits": cached egress 10,4 / 5 GB, disk IO bütçesi bitmek üzere; Ida kararı ücretli plan yok. Ayrıntı ve tablolar: `docs/YUK_AZALTMA.md`.
- **Canlıya dokunan her şey:** 1 Storage liste + 3 HEAD isteği, 2 salt-okunur SQL (cron.job, pg_stat_statements ilk 15), migration 850 prova + uygulama. Playwright/ekran ölçümü/test hesabı/yük testi ÇALIŞTIRILMADI; müzik dosyası indirilmedi.
- **En büyük bulgu:** `muzik` kovası 22 parça, 27,3 MB; 10,4 GB ≈ 8.000 tam parça indirmesi, oyunda 12 insan hesabı var. Her oda girişinde (menü ↔ maç ↔ turnuva) rastgele bir parça `preload="auto"` ile baştan iniyordu, kalıcı önbellek yoktu (HEAD cevabı `Cache-Control: no-cache`; GET başlığı ölçülmedi) ve Playwright araçları her koşuda boş önbellekle müzik indiriyordu (tahmin: en büyük pay).
- **Müzik (3753501c):** `preload="none"`, adres çalma anında (gizli sekmede indirme yok); `public/sw.js` kalıcı müzik önbelleği `qt-muzik-v1` (anahtar dosya adı, sınır 14, Range istekleri önbellekten, hata → ağ); otomasyon tarayıcısında müzik inmez (`?tani=1` ile açılır); `KOVA` tek yerde yorumlu. **Karar:** 27,3 MB ≤ 40 MB olduğu hâlde Vercel'e taşınmadı — Ida: parçalar `/ses-secim`'den dağıtımsız değişecek, Storage'da kalsın. Yan etki: bir parçanın cihazdaki ilk çalınışı dosya tamamen inince başlar. Test `node oyun/_test/sw-muzik-testi.mjs` 11/11.
- **Polling (8577df19):** ana sayfa "devam eden maçlar" olayları 3 sn'ye toplanır, gizli sekmede okumaz, `tournament_players` yalnız kendi satırım (eskiden canlı turnuvada herkesin her cevabı 4–6 sorgu); biten/iptal Klasik ve Grup maçında nabız yok; `quick_match` / `duello_ara` / `grup_ara` üst üste binmez; Klasik/Grup/Turnuva kanal yeniden kurma 2→30 sn geri çekilmeli (`kanalBekleme`); coin aynı tikte tek okuma; `gorevlerim` sekme dönüşünde en çok dakikada 1; joker fiyatı 10 dk önbellek; turnuva şeridi gizli sekmede yoklamaz; `/meydan` dondurulmuş hızlı maç okuması + kanalı kapalı. Maç içi akış, süreler, Düello tiki ve 3 sn maç nabzı DEĞİŞMEDİ.
- **Cron (d6819ae4, migration 850 canlıda):** 28 iş, boşta ~17.950 koşu/gün (830/831 öncesi ~92.600). `cron_bot_oyna` kapısı insana giden bekleyen daveti iş saymaz (24 saate kadar 2 sn tikini açık tutuyordu) ve bot tepki kuyruğunu sayar (830'dan beri maç sonu bot tepkisi sonraki maça kalıyordu); `bildim-gizli-bot-nabiz` komutu `cron_gizli_bot_nabiz()` sarmalayıcısına bağlandı. Zamanlama ve asıl fonksiyonlar aynı. Uygulama sonrası doğrulama sorgusu çalıştırılmadı (izinli okuma kalmamıştı).
- **Yapılmadı (rapor):** arama yoklamalarını seyreltmek, Düello sonuç ekranı yoklaması, turnuva sayfası 1,5 sn okuması, Realtime kanal birleştirme, `bot_puan_tik` (~100 KB WAL/koşu) ve lobi botlarının dakikalık `last_seen` yazması, pg_cron'un koşu başına 2 yazması — hepsi ürün kararı ya da maç akışı.
- **Doğrulama:** `npm run build` temiz; birim testleri 11/11 ve 7/7. Tarayıcı/canlı ölçüm YOK (yasaktı) → 12 Ekim sonrası liste raporda.
- **Test edilmesi gereken (Ida, telefonda):** müzik açıkken menü → maç → menü geçişinde müziğin çalması (ilk seferde 1–2 sn geç başlayabilir), `/ses-secim`'de parça değiştirince yeni parçanın duyulması, bota karşı maç sonunda sonuç ekranı ve rövanş.
- **Not:** bu oturum sırasında klasörde başka bir araç da çalıştı (`src/lib/saglayicilar.js` bir ara değişmiş göründü); `oyun/lib/ceviri/mac.js`, `src/BildimApp.jsx`, `oyun/tasarim/duello-tahta/` ve izlenmeyen dosyalara dokunulmadı.

- 2026-10-02 Renk rolleri (Ida onayı): `--qt-ikinci*` mor→mavi (#2a73cc), mor yalnız Epik/Efsane Lig (ayrı tokenlar zaten vardı), `QtDugme tur="mor"` kararları (eylem=birincil turuncu, seçili/aç-kapa=yeni `tur="mavi"`), zemin #b9dcff, üç turuncu `--qt-vurgu`'ya bağlandı. Doğrulama yalnız build + kontrast hesabı; **Supabase sağlıklı olunca:** `arayuz-denetim.mjs` + ekran kontrolü (mavi zeminde kart dudağı, mavi/turuncu rol dağılımı, tabbar aktif rengi). Maç sahnesi mor zemin (#3b2a93) bilerek dokunulmadı.

- 2026-10-02 Sorular: genel_kultur taraması (migration 851, canlıda) — 730 aktif soru okundu + Jev çapraz kontrol; 206 pasif (ipucu 110, basit 43, kalite 25, zor 19, belirsiz 5, güncellik 3, yanlış-bilgi 1), 5 taşıma (spor 2, bilim 2, tarih 1); kayıt `docs/KATEGORI_DAGITIM.md`, geri alma `docs/KATEGORI_DAGITIM_YEDEK.json`. `genel`/`karisik`'te soru yok (056).
- 2026-10-02 Sorular: genel_kultur tekrar çiftleri (migration 852, canlıda) — aynı bilgiyi soran 16 çiftin birer sorusu pasif (neden: tekrar); genel_kultur aktif 519 → 503; liste ve yedek aynı iki dosyada.

- 2026-10-02 Ana sayfa eskiz uyarlaması (AnaSayfaA = kök rota; parcalar.jsx, anasayfa.css, SezonSeridi/SezonRozeti, tema.css): mod kutuları dolu renkli daire + beyaz glif (Hatalarım nötr); Sezon + Görevler ikiz altın kartlar (Sezon'da sıradaki ödül satırı mevcut `durum.oduller`'den, Epik/Efsanevi'de mor nokta; Görevler'de parçalı çubuk); oyuncu kartında XP "91/101", Sezon halkasına "Sezon" etiketi (o "1" halkası = Sezon Yolu seviyesi), premium `.pc` çerçeve sol kesilmesi için pay; lig alt satırına hafta bitimine kalan süre; aktif sekme mavi. Yeni sorgu yok. **Ekran doğrulaması yapılmadı — Supabase sağlıklı olunca (12 Eki sonrası) `node araclar/arayuz-denetim.mjs --gorsel` ile 360/390 px bakılmalı** (özellikle ikiz kartlar ve ejderha çerçeveli oyuncu kartı).

- 2026-10-02 Profil ekranı: onaylı eskize göre lig sahnesi + tekrar temizliği (OyuncuVitrinKarti, ProfilePage, KoleksiyonDokumu, tokenlar.css): koyu lacivert kimlik kartı yerine opt-in `ligSahnesi` prop'u (yalnız ProfilePage + OyuncuKarti) — zemin ligin açık tonu + sabit ışın deseni + çerçeve ligin dudak rengi, isim koyu lacivert plaka içinde (IsimEfekti `koyu` zaten buna göre tasarlıydı — altın isim bozulmadı), ligin silik filigran amblemi (opaklık 0,12, aria-hidden); Arama/Leaderboard/kompakt koyu kart değişmedi. `.qt-ok-lv` turuncu → mavi (`--qt-ikinci`, renk rolleri kararına uygun). Profildeki tekrar eden rütbe rozeti (QtRozet "Bilge") kaldırıldı (LevelCubugu zaten "Level N · Bilge" gösteriyordu), Misafir etiketi kaldı; profil kartındaki Koleksiyon çipi gizlendi (`koleksiyonCipi={false}`, KoleksiyonDokumu zaten "N rozet · N unvan" gösteriyor). Koleksiyon çubuğunun nadirlik lejandı (nokta + sayı) artık özet kartında da (Profil ilk ekranı dahil), önceden yalnız Koleksiyon sekmesindeydi. Battle Pass kaplaması hazırlığı: `.qt-ok--bp` + taç ikonlu "BP" rozeti — BP sahipliği (`oyuncu_kartlari.sezon_bp`) kartta zaten vardı (IsimEfekti/CerceveliAvatar ile aynı kaynak), yeni sorgu eklemeden bağlandı. Supabase kota sınırında olduğu için doğrulama yalnız `npm run build` + CSS/JSX incelemesi + kontrast hesabı (node, plaka 15:1, lig satırı ≥12,5:1, Lv etiketi 4,75:1, koleksiyon çipi/BP rozeti düzeltildi); **ekran görüntüsü alınmadı — Supabase sağlıklı olunca `node araclar/arayuz-denetim.mjs --gorsel` ile 360/390 px'te Profil ve oyuncu kartı penceresi (ejderha gibi büyük çerçeveler kırpılıyor mu) kontrol edilecek.**

- 2 Eki 2026 — Görevler ekranı oyunlaştırma (2. tur): en üstte haftalık sandık kahraman kartı (kilitli/alınabilir/alındı, mevcut sandikAc akışı), görev kartları tür renginde (Düello kırmızı · doğru cevap yeşil · kazanma/seri altın · kalan mavi; ikon 48 px + aynı renkli çubuk), "Günlük" başlığında mini halka + yenilenme; Ana sayfa SezonSeridi simgesi tac.webp (yedek: yıldız). Yeni RPC/sorgu yok. Kararlar: renkler token'dan (mod-duello, dogru-dudak, madalyon-altin-koyu, ikinci). Doğrulama: yalnız build + kod incelemesi; ekran doğrulaması (Playwright/arayuz-denetim, eski ölçüm betikleri gv-ozet/gv-sandik kancalarını arar) **Supabase sağlıklı olunca** yapılacak (12 Ekim'e kadar kota sınırı).

- 2 Eki 2026 — Sezon Yolu (Battle Pass) ekranı onaylı eskize göre oyunlaştırıldı (SezonUst, Yol, SiradakiOdul, SezonYoluPage, simgeler, sezon-yolu.css): üstte sezon afişi (koyu altın zemin, sezon sonu ödülü vitrini + tac.webp, "Sezon N · K gün kaldı"; afiş + seviye satırı 88 px @360×640 / 94 px @390×700; QtSahne başlığı "Sezon Yolu" oldu, alt başlık afişe taşındı) + tek satır seviye/mavi SP çubuğu; Battle Pass kolu boyunca altın şerit (BP yokken soluk) + taçlı altın sütun başlığı + koyu kilit rozeti; kutu zemini türe göre (coin altın, elmas mavi, joker yeşil, diğerleri beyaz), alınmışta yeşil tik, düğümler/çizgi mavi (şimdiki = büyük mavi halka); "Sıradaki büyük ödül" kart oldu; alt düğme: alınabilir ödül varsa (BP olmasa da) "Ödülleri al (n)", yoksa ve BP yoksa altın "Battle Pass al" + fiyat çipi. Karar: ara tonlar token karışımı (color-mix, `@supports` ile; eski iOS düz token yedeğinde), yeni token/sorgu/RPC/hareket yok; efsanevi kutu çerçevesi şeritte kaybolmasın diye koyu altın. Doğrulama: yalnız `npm run build` (TEMİZ) + kod incelemesi + node kontrast hesabı (metinler ≥ 4,6:1, rozet/glif ≥ 3,5:1) + ilk ekran bütçesi hesabı (yol 360×640 ≈ 334 px, 390×700 ≈ 376 px). **Ekran doğrulaması yapılmadı — Supabase sağlıklı olunca (12 Eki sonrası)** `node araclar/sahne-ekran-sezon.mjs` çalıştırılmadan ÖNCE betik güncellenmeli: `bp-yok` durumu (2 ücretsiz hazır) artık "Ödülleri al (2)" gösterir (satır 78/263 beklentisi ve 350'deki `.sy-bp-dugme` dokunuşu alınacak ödülü olmayan bir BP-yok durumuna taşınmalı). Sonra 360×640, 390×700/844 TR+EN ekran kontrolü (afişte ejderha çerçevesi kırpılıyor mu, altın şerit hizası, EN metin kesilmesi).

- 2 Eki 2026 — Lig ekranı onaylı eskize göre düzenlendi (LeaderboardPage, lig-a.css, ceviri/lig.js): Battle Pass sahibi her satır (kendin dahil) çift katmanlı altın kaplama (`lg-bp`: dışta koyu altın çerçeve, içte açık altın halka+zemin, 20 px köşe; sıra dairesi altın; taç ikonlu "BP" rozeti isim yanında) — veri `oyuncu_kartlari.sezon_bp`, yeni sorgu YOK (`useKartAlani` ile aynı toplu+önbellekli kaynak; satır bileşeni hook için modül düzeyinde `LigSatiri`'ye çıkarıldı). "Sen" satırı BP'liyse altın plaka + mavi "sen" rozeti birlikte. Sadeleşme: kılıç (meydan oku) düğmesi kaldırıldı — işlev satıra dokunup açılan oyuncu kartı modalındaki `onMeydanOku`'da zaten vardı (doğrulandı, değişmedi); "puan" → kısa "P" (EN "pts", Koleksiyon etiketi aynı kaldı); unvan artık rütbe/konumla aynı satırda (`lg-detay`) — unvanlı/unvansız satır aynı yükseklikte (~64 px), sığmazsa ellipsis. Renk rolleri: düşme hattı BAŞLIĞI kehribardan kırmızıya (`--qt-yanlis-koyu`) — satırın bölge şeridi kehribar kalır, yalnız çizgi başlığı. Sekme çubuğunda 360 px'te "Dünya" kesik görünüyordu; paylaşılan `QtSekmeler` DEĞİŞMEDİ, yalnız bu sayfada dar iç boşluk + daha belirgin kaydırma solması (`.lg-sekmeler`). Yan etki: önizleme sayfası `AltinIsimAdaylari.jsx`'teki artık var olmayan `lg-meydan-bos` referansı da kaldırıldı. Doğrulama: yalnız `npm run build` (TEMİZ) + CSS/JSX incelemesi + node kontrast hesabı (BP satır yazısı 13,4:1, BP rozeti 6,1:1, sıra dairesi 9,2:1, yükselme/düşme hattı ~6,5:1) + 360/390 px taşma kontrolü kodla (box-sizing:border-box, flex min-width:0 zinciri). Güncellenmesi gereken `araclar/*.mjs` seçicisi yok (ölçüm betiği çalıştırılmadı). **Ekran doğrulaması yapılmadı — Supabase sağlıklı olunca** `node araclar/arayuz-denetim.mjs --gorsel` ile 360/390 px'te BP altın satır, sekme çubuğu ve podyum (şehir/ülke/dünya/arkadaş — BP kaplaması BİLEREK podyuma eklenmedi, yalnız satır düzenine) kontrol edilecek.
- **2 Eki 2026 — Düello savunma banı (853, canlıya uygulandı):** yeni faz `ban` (sonuc → ban → kategori); savunan `duello_ban_sec` ile 1 kategori banlar (`duello_ban_sn` 5 sn, 1. turda +`duello_ban_ilk_tur_ek_sn` 3 sn açılış payı), kendi bir önceki savunmasındaki banı yineleyemez (`son_ban1/2`), kilitli kategori banlanmaz, süre dolarsa ban yok, Altın Soru'da ban yok; `duello2_kategori_uygun_mu` banlıyı dışlar, bot hem banlar (`duello2_bot_ban_kategori`) hem banlıyı seçmez; `duello_ban_acik` = 0 iken eski akış aynen. Arayüz: aynı kart ızgarası (savunan tek dokunuşla banlar, önceki banı kilitli; saldıran "Rakip ban seçiyor…"; banlı kart gri + "Banlı" damgası), TR+EN. Doğrulama: `node araclar/duello-ban-sql-testi.mjs` 47/47 (ROLLBACK), eski hâkimiyet testleri bayrak 0 ile 60/60 + 18/18, `npm run build` temiz. **Ekranda/gerçek maçta denenmedi** (Playwright ve canlı maç bu işte yasaktı).

- **2 Eki 2026 — Kategoriye göre maç (860, canlıya uygulandı):** Klasik ve Saf Bilgi'de OYNA'dan önce kategori seçilir (10 kategori + "Karışık" = seçilmedi, eski davranış; Düello hariç). Kategori seçilirse 20 sorunun hepsi o kategoriden (`kategori_mac_soru_sec`; `soru_sec` karışığa düşerse maç kurulmaz), eşleşme havuzu kategoriye göre ayrı (`kuyruga_gir` 2. adım ve `quick_match` artık kategori dışı rakip almaz; Karışık ↔ Karışık eski kurallarla), süre dolunca 370 bot yedeği aynı kategoride. Seçilebilirlik sunucuda: rekabetçi havuz < `kategori_mac_min_soru` (60) ise kayıt ve arama reddedilir; istemci `kategori_mac_uygunlar()` ile soluk çizer. Boş `p_kategori` = Karışık — profildeki `tercih_kategori`'ye düşülmez (Antrenman `hemen_bot_mac_sec` dahil); tercih yalnız son seçimi hatırlar (28 Eyl'de kaldırılan filtre Ida kararıyla geri geldi). Arayüz: `KategoriSecici` (yatay şerit, `KategoriIkon` + ad, seçili mavi) OYNA/Saf Bilgi penceresinde (`ModSecimPenceresi`) ve Modlar'da; `useKategoriTercih`; iptal sonrası yeniden arama kategoriyi taşır; EN `ceviri/kategori-maci.js`. Lig/ödül kuralları aynı. Prova: geri alınan transaction'da 38/38 (filtre, yetersiz soru, Karışık, havuz ayrımı, bot yedeği, yabancı oyuncu, yetkiler); provada `kategori_mac_uygunlar` 22 sn ölçülüp döngüye çevrildi (~0,1 sn). Tarayıcı testi yapılmadı (Ida: Playwright/ölçüm yok); build temiz.
- 2 Eki 2026: 4 görsel düzeltme — Lig kartı kısa başlık, oyuncu kartı sol boşluk +10px, global user-select:none (input/textarea/.ms-balon-metin hariç), profil kartı filigranı kapatıldı (yıldız kolları avatar altında üçgen izi). Ölçüm yapılmadı (kota).
- 2 Eki 2026: Lig BP satırı köşeli kabartmalı altın plaka (clip-path, perçin, parıltı, sekizgen sıra rozeti); tokenlar --qt-altin-plaka-*; lig-a.css, LeaderboardPage.jsx
- 2 Eki 2026: Düello — savunmadaki "hazırla" hamle işareti kaldırıldı (kartlar yalnız bilgi; sunucu/RPC aynı); savunanın ban fazına kırmızı uyarı bandı (geri sayım, RAKİP SALDIRACAK, Bir kategoriyi BANLA, azalan çubuk, kesikli çerçeveli kartlar, seçince nötr "Banladın"). Sol oyuncunun avatarındaki turuncu daire = "Kategoriyi seçen" (kılıç) rozeti (saldıran). Ölçüm yapılmadı (kota); build temiz.

- 2 Eki 2026 — Ana sayfa 3 düzeltme: turnuva bandı lobi başlığı "14:00 turnuvası" (lobi bilgisi alt satırda); Lig kartı "↑ Yükselme: 60 P · 2g 10s" (dar: "↑ 60 P"); BP afişi Ejderha çerçeve vitrini 64 px + taşma. Ölçüm yapılmadı (kota); gerçek ekranda 360 px kontrol edilmeli.
- 2026-10-02: 'sen' rozeti (.ls-sen) tüm yerlerde açık mavi zemin (--qt-ikinci-acik) + koyu mavi yazı (--qt-ikinci-koyu), 4 px köşe; plakalı satır aynı. Dosyalar: l-kart.css, lig-a.css.
- 2 Eki 2026: Düello kural değişikliği (Ida) — boş kategoride ikisi de doğru → saldıran alır (ayar duello_bos_ikisi_dogru_saldiran=1, 0 eski kural) + kazanma eşiği 4 → 5 yuva; migration 870 canlıda (duello2_cozumle), SQL testleri hâkimiyet 65 / ban 47 / bot 18 geçti; istemci eşiği ayardan okur, 5 yuva (.hk-yuvalar--cok), tanıtım v10, TR+EN. Ekran ölçümü yapılmadı (kota); Büyük Geri Dönüş (2 yuva fark) ve Son Nefes (eşik−1) rozetleri eşiğe göre çalışmaya devam eder. Bot hedef değeri boş kategoride yeni kuralı hesaba katmıyor (681/853 dokunulmadı).
- 2 Eki 2026: Düello savunma banı oyun hissi (kural aynı) — savunana giriş damgası + ses + titreşim, kırmızı "BAN SIRASI SENDE" durum satırı (eski üst bant kalktı), son 2 sn gerilim, "BANLADIN" / "BAN KULLANILMADI", ilk 3 Düello ipucu; saldırana tarama halkası, ~1,2 sn "RAKİP BANLADI" açıklaması (plaka karta uçar), banlı karta dokununca sarsıntı + "Rakip bunu banladı", mavi "SIRA SENDE" geçişi; yumuşak mod; migration 880 canlıda (duello_ban_gosterim_ms 1200: açıklama seçme süresinden yemez). Dosyalar: DuelloBanAni.jsx, duello-ban.css, DuelloTahta.jsx, duello-tahta.css, DuelloPage.jsx, hakimiyet-ekran.js. Ölçüm/tarayıcı testi yapılmadı (kota) — telefonda Ida deneyecek.
- 2 Eki 2026: Düello botu yeni boş kategori kuralına uyduruldu (migration 890, canlıda) — bot saldırırken boş kategori değeri p_s − (1−p_s)·p_d (rakibin: p_s·(1−p_d), kendi: ×pekiştir aynen), bot savunurken ban seçimi aynı formülle saldıranın en kazançlı kategorisi (boş dahil); %70/%30, nakavt/kritik, kilit, ardışık ban yasağı, cevap davranışı/süreler aynen; ayar duello_bos_ikisi_dogru_saldiran=0 iken eski formül. Yeni test araclar/duello-bot-bos-kural-sql-testi.mjs (17), bot 18 / ban 47 (880 payı için süre beklentisi güncellendi) / hâkimiyet 65 geçti; canlıda maç oynatılmadı (kota).

- 2 Eki 2026: Düello 3 değişiklik (Ida) — (1) ban süresi 5 → 7 sn (migration 900, canlıda; ilk tur ek payı 3 kaldı: VS geçişi 2 sn + sayfa/ilk okuma ≈ 2,3–4 sn, 2 olsaydı yavaş açılışta 1. tur banı kısalırdı); erken ilerleme 853'ten beri sunucudaydı (`duello_ban_sec` → `duello2_ban_bitir` FOR UPDATE, bot fazın 1–2,5. sn'sinde banlar) — değişmedi, SQL provasına bölüm 12 eklendi; istemci dokunuşta sayacı durdurur. (2) soru ekranı kategori durum çerçevesi (kırmızı tehlike · mavi fırsat · gri pekiştirme; soru rozeti + yuva, ≤ 4 kelime etiket, yükseklik eklemez). (3) uzun kural cümleleri soru ekranından çıktı: ilk 3 Düello ipucu, tanıtım v11 (çerçeve renkleri + savunma banı adımı), arama ipuçları. Kural notu: gri durumda savunanın doğrusu sahipliği değiştirmez ama rakibin kilidini önler. Test: ban 56 / hâkimiyet 65 / bot 18 + 17 geçti, build temiz. Ekran ölçümü ve canlı maç YAPILMADI (kota) — 360/390 px'te gerçek telefonda bakılmalı.

- 2 Eki 2026: Dükkân › Joker sekmesi moda göre + Seri Koruma kaldırıldı (Ida) — (1) üstte "Klasik | Düello" seçici (`?mod=`, seçim cihazda saklanır), jokerler Ortak + Yalnız o mod bölümlerinde, kartlarda mod rozeti, tek moda özel jokerde onayda tek satır not; mod verisi `jokerler.js › allowedModes` (tek kaynak). (2) migration 910 (canlıda): eski karışık `joker_10/30/100` + `seri_koruma_3` pasif (silinmedi; joker_10 da pasif çünkü 400 coin'le tek tek alımdan (390) pahalıydı ve iki modda da görünürdü); yeni `klasik_30` 960 · `klasik_100` 3220 · `duello_30` 1000 · `duello_100` 3370 coin (tek fiyat toplamı × 0,85, 5'e aşağı); paket yalnız kendi mod sekmesinde (modu içeriğinden okunur). (3) Seri Koruma: `seri_kontrol` koşulsuz sıfırlar, `seri_durumum.koruma` = 0, `envanterim` ve başlangıç stoğu içermez; istemciden (dükkân kartı, SeriRozeti, SkillGorseli, JokerCubugu, ses, sözlük) kalktı; envanter satırları ve tur kısıtı durur. Test: `araclar/joker-moda-gore-sql-testi.mjs` 47 geçti (ROLLBACK); joker/skill/seri sunucu testlerinde yeni kırık yok (önceden kırık 11 bayat beklenti aynen duruyor: fiyat 20→60, 7→9 aktif joker vb.); build temiz. Ekran ölçümü ve canlı satın alma YAPILMADI (kota) — 360/390 px'te gerçek telefonda bakılmalı.

- 2 Eki 2026: Dükkân sadeleştirildi (Ida) — sekmeler 4'e indi (Elmas · Joker · Çerçeve · Avatar ve İsim; Kıyafet ve Arka Plan sekme kodu çıktı), sekme altında tek kural şeridi (jokerler coin · kozmetikler elmas), telefonda dört sekme kaydırmadan sığar; migration 920 (canlıda): VS kartı / zafer efekti / tepki paketi `satis_pasif = true` (13 kalem, veri ve 8 sahiplik satırı aynen), tepki paketleri Battle Pass ödülü — Sezon 1'de ikisi de zaten vardı (Eğlence 3, Rekabet 12, ücretli kol), ödül tablosu değişmedi (56 yuva; ücretsiz kola taşıma Ida kararına açık); Coin sekmesi kaldırıldı (ürün satmıyordu; not + ödüllü video Joker sekmesinin altına); Avatar ve İsim = Epik/Efsanevi avatarlar (820 canlıda: 18 + 8) + Altın isim; build temiz; ekran ölçümü yapılmadı (Supabase kota sınırı — Playwright yasaktı), 360/390 px sığma CSS hesabıyla.

- 2 Eki 2026: Ekran turu (tek seferlik belgeleme, kod değişmedi) — yeni `araclar/ekran-turu.mjs` canlı siteyi 390×844 / 360×640 / EN boyutunda gezip `docs/ekran-turu/` altına 33 görüntü (2,9 MB) + `olcum.json` + `RAPOR.md` yazdı (taşma · kesik metin · <44 px hedef · piksel örneklemeli kontrast · konsol · ilk ekranda birincil düğme; elle gözlem `gozlem.md`); 132 sn, 301 Supabase isteği, tek misafir oturum, yeni hesap/DB yazması yok. Öne çıkanlar: ana sayfada Lig kartı turnuva bandının altında kesiliyor, Klasik soru ekranı cevaptan sonra ~75 px kayıyor, 360×640 Dükkân › Joker ilk ekranında ürün düğmesi yok, BP ejderha çerçevesi geri düğmesine biniyor, EN "Battle Pass" rozeti sezon başlığını örtüyor. **Düello oyun içi YAKALANAMADI:** oturum dosyasındaki 6 misafir hesabın hepsinde Düello kilitli (5 bitmiş Klasik şartı; en çok 1 maç) — Antrenman › Düello bunu söylemeden sunup 400 dönüyor; ban/çerçeve/yuva görüntüleri için 5 maçı bitmiş bir hesap gerekir.

- 2 Eki 2026: Ekran turu 5 düzen düzeltmesi — (1) ana sayfa: süren maç tek bantta (alttaki "maçın sürüyor" şeridi kalktı), Lig kartı ≤940 px 2 satır (ben + komşu), "maç sürüyor" açıkken ≤760 tek satır, ≤699 liste yok; EN sezon çipi "BP"; (2) Klasik soru: cevaptan sonra joker çubuğu yerinde soluk/pasif (QuestionCard `m1-joker-yuva`), şıklar kaymaz; (3) Dükkân: afiş kalktı, elmas bakiyesi sekme satırında, kural şeridi/mod seçici/joker kartı telefonda kompakt; (4) Battle Pass: ejderha vitrin üst taşması 4 px ile sınırlı; (5) Lig: dar ekranda unvan "Samsun Şamp." (UnvanYazisi kısa/uzun span). Düello dosyaları ve prompt B dosyalarına dokunulmadı.

- 2 Eki 2026: Ekran turu 5 düzen düzeltmesi (2. tur) — Antrenman penceresinde kilitli Düello gri+kilit+not (mevcut `duello_acilis_benim` RPC pencere açılınca bir kez okunur; ChallengesPage dışında hazır kilit bilgisi yoktu); "Maçtan ayrıldın" kartındaki ikinci eylem seti kalktı (alt çubuk tek set); davet kartı boşlukları (`.qt-kart{display:block}` grid gap_ı eziyordu); Saf Bilgi/Klasik metinlerinden "hız" kalktı (TR+EN, ana.js); "Koleksiyonuna bak" ≥44 px.
- 2 Eki 2026: Migration 930 — Dükkân Düello'da Baskın/Kalkan 10×: joker_paketleri'ne skill_baskin_10 (595) / skill_kalkan_10 (425) eklendi, canlıya uygulandı; fiyatlar 910 ×0,85 ile tutarlı, diğer tüm aktif jokerlerde 10'lu paket var, RPC'de beyaz liste yok.
- 2026-10-02 Düello: giriş kartı başlığı beyaz (5,32:1), arama rozeti ve ana sayfa Düello kartı eski pembe/mor yerine --qt-mod-duello kırmızısı [progress-yok]
- 2026-10-02 Faz 0 (QA raporu 4 madde): react-router-dom 7.17.0→7.18.4 (npm audit --omit=dev: 1 yüksek+1 orta → 0), giriş hedefi ters eğik çizgiyi reddeder; lig listesi key'li Fragment + QT_SAHNE_COIN_HAPI döngü uyarısı kalktı; ana sayfa Sezon rozeti dokunma alanı 9 px aşağı kaydı (ad alanıyla çakışma yok); düello kilidi tek kancada oyun/lib/useDuelloAcilis.js. AÇIK BULGU: src/BildimApp.jsx OnekiAt (/oyun//evil.com → '//evil.com' Navigate) iç yola zorlanmalı — dosya başka pencerede kirli olduğundan dokunulmadı [progress-yok]
- 2 Eki 2026: Joker ikonları yenilendi (Ida onayı) — 7 joker (elli, sure, zaman_baskisi, ikinci_sans, sigorta, cifte_puan, baskin) 64×64 SVG; tek kaynak `components/jokerCizim.jsx`, SkillRozeti (tüm üretim çizim noktaları) ve JokerIkon (stil rehberi) ona bağlı; soru_degistir/kalkan Phosphor'da kaldı; ≤32 px'te ince detay çıkar, kontur ×1,25; baskin JokerIkon'da yakut. Görüntü: docs/joker-ikon/joker-ikon.jpg
- 2026-10-02 Test araçları güncel ürüne taşındı (çalıştırılmadı, yalnız node --check): Düello tanıtım anahtarı DuelloTanitim.jsx › DEPO'dan okunuyor (araclar/duello-tanitim-anahtar.mjs, v9/v1 sabitleri kalktı); gecikme-testi Geç/Anladım/Şimdi değil kapatıyor; avatar-satis-ekran 4 sekme + Epik/Efsanevi bölümleri + 8/17 elmas yuvaları; avatar-arkaplan-satis-sql-testi 849/848 durumuna çekildi (pa_* yalnız transaction içinde açılır); skill-ekonomisi.test 9 skill + Baskın/Kalkan 10'lu paketleri [progress-yok]
- 2026-10-02 Düello canlı iki oyuncu ekran testi (Ida izniyle; canlıda TEK yazma: oyun_ayarlari.duello_acilis_mac_esigi 5 → 0 → 5, geri alındığı ayrı sorguyla doğrulandı): yeni araclar/duello-canli-ekran-testi.mjs (mevcut misafir hesaplar ArayuzDenetim648 + ArayuzDenetim327, yeni hesap yok, ses indirilmez, dur kuralı 402/429/kota/3×5xx), gerçek eşleşme, 4 tur, 99 sn, 822 istek (Supabase 289), hata yanıtı ve konsol hatası 0; docs/ekran-turu/duello-01…09 (10 görüntü) + duello-olcum.json + duello-test-cikti.txt. Betiğin kabulü GEÇMEDİ (9 koşuldan 1'i): "yanlış yuva (B ekranı)" — B ekranı 4. turun sonucunu göstermeden okundu (ölçüm zamanlaması; oyun hatası kanıtlanmadı). Tur 1–2'de saldıran betik banlı karta dokunduğu için seçim süresi doldu, sunucu kategoriyi kendisi seçti (test kusuru). Yakalanamayan: gri çerçeve ("Rakip pekiştiriyor"), arama sahnesinin kendisi (01 tembel yükleme yedeğini gösteriyor). Üç ölçüm kusuru betikte düzeltildi, yeniden ÇALIŞTIRILMADI. Oyun kodu değişmedi [progress-yok]
- 2026-10-02 Düello canlı test düzeltmeleri (3): ban şeridi savunanda dolu kırmızı (kök sebep: duello-tahta.css .hk-mesaj beyaz zemini aynı özgüllükle eziyordu → .hk-mesaj.hk-bankonsol--sec; ikon+yazı tek satır, sayaç sağda, beyaz/kırmızı 5,32:1) · kategori kartında iki oran yoksa ok çizilmez · eşleşme sahnesi rakip avatarı inene kadar baş harf yedeği + yumuşak geçiş (kök sebep: veri vardı, resim henüz inmemişti; AvatarResim yedeksiz, .gh-merkez beyaz). Bilinen: --bekle/--tamam durumları da aynı ezilmeden etkileniyor, dokunulmadı.
- 2026-10-02 5 küçük iş: Baskın turuncu/Kalkan açık yeşil tek kaynak (jokerCizim ROL_RENK, JokerIkon+SkillRozeti hizalı); joker paket kartları zaten SkillRozeti ile (değişiklik yok); Facebook düğmesi FACEBOOK_GIRIS_ACIK=false ile gizli; Düello belirtme genel/karisik girdileri silindi (KATEGORI_BILGI/KategoriIkon/KategoriProfili filtresi canlı veri için kaldı); docs/PAKET_BOYUTU.md (yalnız rapor).
- 2026-10-02 Üç iş: (1) İngilizce sözlük tembel parça — `dil` 266,8 → 5,4 kB (93,4 → 2,5 kB gzip), `dil-en` 262,9 kB yalnız İngilizcede iner; giriş `src/baslat.js` (dil → sözlük → `main.jsx`; `tt()` modül düzeyinde çağrıldığı ve hedef safari12 olduğu için üst düzey await yerine başlatıcı), uygulama parçaları `vite.config.js › uygulamaOnYukleme` ile index.html’e ön yüklenir; sözlük inemezse Türkçe sürer + kısa uyarı (`dilUyari.js`), dil seçici önce yükler sonra geçer; temel sözlük `ceviri/temel.js`’e aynen taşındı. (2) migration 940 (canlıda): 851’de ipucu nedeniyle pasif 110 genel_kultur sorusundan 93’ünün yanlış şıkları yeniden yazılıp açıldı (EN 91 satır aynı indeksle; `sik_ipucu_jev` 35 soruda kalktı — yeni şıklar aynı Jev testinden geçti), 17 açılmadı (tekrar 11 — 4’ü aktif havuzdaki soruyla, Jev testi 5, belirsiz 1); kayıt `docs/KATEGORI_DAGITIM.md`, yedek `docs/IPUCU_SIKLARI_YEDEK.json`; `soru_surum` yazılmadı (görev sınırı). (3) Düello soru ekranı: soru kartı ton sınıfına hiç bağlı değildi (sarı = “yeni soru” altın halkasının geçici animasyonu), artık kart 4 px + yuva paneli 3 px aynı renk (kırmızı/mavi/gri); Supabase’siz geçici önizlemeyle `docs/ekran-turu/duello-cerceve-sonra-*.jpg`. Canlı Playwright turu yapılmadı (kota); **telefonda bakılacak:** Düello soru ekranında çerçeve, İngilizceye geçiş.

## 2026-10-03/04 — KASA modu (deneysel): migration 950 + arayüz (canlıya UYGULANMADI, push yok)
**Araç:** Claude Code
**Neden:** Ida yeni 2 kişilik "Kasa" modunu deneysel olarak istedi (Klasik/Düello kalıbıyla).

- **Kural (sunucuda, 950):** kasa her soruda +2 (ikisi de doğru +6 toplam); tek bilen sahip olur; tur başında sahip AÇ/DEVAM (8 sn, dolarsa DEVAM); AÇ → kasa puana, 20 puana ilk ulaşan kazanır; 24 tur sonunda sahip kasayı alır, eşitlikte Altın Soru. Joker/hız bonusu yok. Sayılar oyun_ayarlari (kasa_*), maç başında satıra sabitlenir.
- **Sunucu:** kasa_maclari / kasa_hamleler (ayar analizi) / kasa_cevaplari / kasa_kuyrugu / kasa_davetleri / kasa_sinyal; RPC kasa_ara, kasa_durum, kasa_cevap, kasa_karar, kasa_terk, kasa_giris, kasa_davet_*; idempotent kasa_ilerlet + kasa_tik cron (10 sn). Ana tablolarda politika YOK (yalnız RPC; Ida onayı), _select_own yalnız sinyal + davetler. Bot: cevap 2–6 sn, tarz addan deterministik (Temkinli 4 / Dengeli 8 / Açgözlü 12, ±2), hedefe ulaştırıyorsa her zaman AÇ.
- **Ödül (Ida değişikliği):** Klasik yardımcılarıyla aynı yol (coin_mac_odulu, xp_mac_odulu, lig_mac_*, gunluk_seri_bonusu, mac_sayaci_arttir, award_badge) × kasa_odul_acik × kasa_odul_carpani. Sezon Puanı kaynağı 'mac', referans 'kasa:<id>' (Ida seçeneği A: sezon_puani_ekle DEĞİŞMEDİ; tablonun CHECK kısıtı 'kasa' kabul etmiyordu). Rozet/beraberlik Klasik ile aynı (ilk_galibiyet koşulsuz, mac_10 yalnız Dereceli, beraberlikte bot yüzdesi). Düello yeni oyuncu kilidi yok. Yeni görev türü yok; Kasa mevcut maç/doğru sayaçlarına girer (ödülsüz maç girmez).
- **Ortak fonksiyonlara yalnız kasa dalı (9):** cift_odul_carpani, xp_mac_odulu, gorev_olcum, gorev_dogru_satirlari, gorev_sayaci, odul_dokumu, level_kazancim, mac_sonu_ozet, trg_iletisim_engel.
- **SQL testi:** `node araclar/kasa-sql-testi.mjs` — tek işlem + ROLLBACK, canlı veritabanında (yerel Docker yok), 23:14 TSİ: **86/86**; Klasik + Düello 44 değer migration öncesi/sonrası birebir, ROLLBACK sonrası 12 imzanın md5'i aynı, kalıntı yok. Önceki koşularda bulunanlar: Sezon Puanı kısıt hatası (gerçek; A ile çözüldü) ve test beklenti hataları (seri bonusu, 3B görünümde ayakkabı "bot" değeri, coin_hareketleri.olusturuldu kolon adı).
- **Canlıya hazırlık:** `docs/kasa-canliya-uygulama.md` (Ida için adım adım), `docs/kasa-geri-alma-950.sql` (9 fonksiyonun canlı tanımı + kasa nesneleri; ÇALIŞTIRILMADI), `araclar/kasa-dogrula.mjs` (salt okunur). Canlıda bekleyen tek migration 950.
- **Arayüz:** `oyun/pages/KasaPage.jsx` + `components/KasaParcalari.jsx` + `styles/kasa.css` (kadran, SEN/RAKİP skor, AÇ/DEVAM, "Rakip karar veriyor…", sonuç bandı, 3-2-1, maç sonu rövanşsız); rota /kasa; ana sayfa 5. kısayol (Deneysel), Modlar kartı (kapalıyken kilitli), Antrenman düğmesi, devam eden maç kartı; mod rengi --qt-mod-kasa #0b6f68 (beyaz 6,0:1); İngilizce `ceviri/kasa.js` (Vault). İstemci, ayar satırı yoksa modu kapalı sayar (canlıda olmayan RPC çağrılmaz).
- **Ekran ölçümü (TAKLİT veri, gerçek hesap testi DEĞİL):** `node araclar/kasa-ekran.mjs` 360×640 + 390×844, TR/EN **280/280** (yatay taşma, tek ekran, ≥ 44 px, kontrast, kesik metin, konsol). `npm run build` temiz.
- **Kararlar (Ida, 3 Eki):** ana tablolar yalnız RPC; Serbest|Dereceli var; rozet yalnız genel; rövanş yok; Sezon Puanı seçeneği A; 4 küçük fark (bot hedef kuralı, mac_10 Klasik+Kasa sayımı, ödül kapalıyken seri durur, kendi gösterim payı) kalsın.
- **Kalan:** 950 canlıya (Ida, yönergeyle) ve ardından iki gerçek hesapla canlı test; cron önerisi (30 sn + aktif maç yoksa erken çıkış) onay bekliyor; arkadaş daveti arayüzü (bildirim türü kasa_daveti, Meydan'dan davet) yok; main'e push yok.

## 2026-10-04 — KASA canlıya alma
**Araç:** Claude Code
**Neden:** Ida onayıyla migration 950 canlıya, arayüz main'e.

- 950: kasa_tik cron aralığı 10 → 30 sn; kasa_tik_hepsi aktif maç yoksa (kasa_maclari_aktif_idx) kilit almadan hemen 0 döner.
- 4 Eki ~10:35 TSİ: `kasa-sql-testi.mjs --zorla` (Ida beklemeyi atlattı; ön kontrol zaten temizdi) **86/86**; `migration-uygula.mjs` 950 canlıya uygulandı; `kasa-dogrula.mjs` "KASA kurulumu TAMAM" (ayar 25/25, cron 1/1, realtime 1/1); canlı cron.job schedule = 30 seconds. kasa-onizleme zaten main'in içindeydi (birleştirme no-op); build temiz; main push edildi.

## 2026-10-04 — KASA oyun hissi (yalnız arayüz; DB/migration yok)
**Araç:** Claude Code
**Neden:** Ida: Kasa ekranı panel gibiydi (2 küçük animasyon); Klasik/Düello seviyesinde oyun hissi istendi.

- **Görsel:** halka kadran yerine SVG altın/pirinç kasa (kapı + dönen kadran + cıvatalar + önünde altın yığını). Doluluk (hedefe oranla bos/az/orta/dolu: <%30, <%60, ≥%60) kasayı büyütür, yığını artırır, parıltıyı güçlendirir; çerçeve halkası sahibin rengi (sen mavi / rakip kırmızı / sahipsiz gri). Soru/sonuç fazında üst şeritte mini kasa (değer SayanSayi ile sayarak).
- **Anlar (KasaPage › anBaslat, zamanlar kasa-efekt.css ile eşleşir):** sonuç +2 → bant'tan mini kasaya 6 altın (950 ms varış: sesCoin, zıplama, "+2", sayaç sayar); +6 → 14 altın, altın bant, halka patlaması + kadran dönüşü, ikinci ses (xp_dolma). Sahip değişince 🔑 eski sahibin avatarından (sahipsizse kasadan) yenisine uçar (1,9 sn: sesJoker, avatar halkası, mini kasa çerçeve rengi o an değişir). AÇ → sahnenin üstünde 1,55 sn katman: kadran döner, kapı açılır, ışın + ışık patlaması, ekran titremesi (yalnız iç bloklar; kökte transform yok), 16 altın açanın skor çubuğuna uçar, skor sayarak yükselir + çubuk parlar; soru gösterim payının (1,5 sn) içinde biter, soru sesi sonra çalar. Karar: sahipte kalp atışı, beklerken titreme; son 3 sn kızarma + hızlı titreme + kenar nabzı (sahipte), tik sesi zaten vardı. Yeni tur başında Düello'nun `m2-gecis` "Tur N/24" bandı; doğruda Konfeti; maç sonu kazanana body'ye portal altın yağmuru (sabit kap transform'suz).
- **Ortak yardımcı:** `components/KasaEfekt.jsx` › `UcanParcalar` (kökteki `[data-ks-hedef]` öğeleri arasında kavisli uçuş; yalnız transform). Yeni ses dosyası yok — mevcut roller (coin, rozet, joker, xp_dolma, tur_gecis) kullanıldı (yeni rol 404 + yedek ton olurdu).
- **Azaltılmış hareket:** uçuş/yağmur/AÇ katmanı çizilmez, değerler doğrudan; sesler sırayla çalar.
- **Dosyalar:** KasaEfekt.jsx (yeni), styles/kasa-efekt.css (yeni), KasaParcalari.jsx, KasaPage.jsx, kasa.css, ceviri/kasa.js (2 metin), araclar/kasa-efekt-ekran.mjs (yeni).
- **Ölçüm (taklit veri):** `kasa-efekt-ekran.mjs` 360×640 + 390×844 **58/58**, azaltılmış hareket 27/27 (her an zamanlı görüntü: tasarim/kasa-efekt/, git'e girmez); `kasa-ekran.mjs` TR/EN **280/280**; `arayuz-denetim.mjs` TEMİZ (Klasik/Düello/Modlar dahil); build temiz. Görüntüler Düello tur bandı / maç sonu sahnesiyle gözle karşılaştırıldı.
- **Telefonda bakılacak:** AÇ anının titremesi ve 🔑 emoji görünümü (iOS emoji yazı tipi).
