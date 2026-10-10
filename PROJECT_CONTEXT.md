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
PWA. Tek depo, tek Vercel projesi; ana adres **quiztactics.com** (10 Eki 2026: quiztactics.vercel.app → quiztactics.com kalıcı yönlendirme, `vercel.json › redirects`, yalnız bu host; www Vercel alan ayarıyla yönlenir; önizleme *.vercel.app adresleri etkilenmez).

18 Eylül 2026'da `idagggamecenter` hub'ından kendi deposuna ayrıldı.
Supabase **aynı** projedir — veri, anahtarlar ve tablolar taşınmadı.
`VITE_MOD` ve iki-mod ayrımı kalktı; site kimliği `index.html` içinde
statik durur.

Oyun kodu `oyun/` altında, paylaşılan kabuk `src/` altında. Depoda
başka oyun modülleri de (`kafatopu/`, `meyvekes/`, `run/`, `gladius/`,
`patirun/`, `driftgp/`) durur; her biri kabuğa tek lazy route satırıyla
bağlıdır ve hiçbiri diğerinin klasöründen import etmez.

Araçlar: **Jev (TypeSafe)** — toplu soru/çeviri kalite değerlendirmesi (proje araçları `araclar/jev*.mjs`)
ve 25 Eyl 2026'dan beri geliştirme adımlarında da (dosya seçimi, hata sınıflama, bulgu önceliği, commit öncesi
kontrol) global araçla: `node C:/Users/ida/.claude/jev/jev.mjs`; kullanım kuralı AGENTS.md'de ve `jev-akis` skill'inde.

### Dil

- Marka adı her dilde **"Quiz Tactics"**, çevrilmez.
- İlk yayın: Türkçe + İngilizce.
- Dil seçimi: giriş yapmışsa profildeki tercih; yoksa tarayıcı dili `tr`
  ile başlıyorsa Türkçe, başka her şeyde İngilizce. IP/ülkeye bakılmaz.
- Özel isimler asla çevrilmez (şair "Cami" → "Jami", "Mosque" DEĞİL).

---

## Oyun Modları

**Üç aktif mod: Klasik Mod (1v1), Düello (Taktik Maçı) ve Ortak Hazine (kod adı Kasa).**
Turnuva bir mod değil, etkinliktir. Grup Maçı ödülsüz arkadaş modudur
(coin/lig/seri yok, rozet var).

Her mod iki girişlidir: **Dereceli** (lig puanı + tam coin) ve **Serbest**
(lig puanı yok, coin %50). Arayüzde her yerde aynı iki seçenekli **"Serbest | Dereceli"**
anahtarı (`DereceliAnahtari`) vardır: Düello girişi, ana sayfa OYNA penceresinin en üstü (Saf Bilgi
kısayolu da aynı pencereden geçer — sessiz başlama yok), Meydan okumalar, Modlar. Son tercih
hatırlanır (localStorage + `profiles.dereceli_tercih`).

### Ortak mekanik

- **Basılı tut (3 sn) → doğru şık — yalnız `profiles.hile_yetkisi` hesabı** (Ida, 10 Eki 2026; migration 1052):
  bütün cevap ekranlarında (Klasik · Turnuva · Grup · Hızlı Maç · Kasa · Çalışma · Hızlı Mod · Düello v2/v4).
  Sunucu `dogru_cevap`ı yalnız `hileli_mi()` hesabına ve yalnız kendi cevap hakkı sürerken verir; normal oyuncu/anon
  null. İstemci ortak kanca `oyun/lib/useBasiliTut.js`; tetik modun normal cevap fonksiyonunu çağırır.
  Prova: `IZIN_CANLI_TEST=1 node araclar/basili-tut-guvenlik-sql-testi.mjs` (ROLLBACK).
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
- **Soru üretimi: zorluk 2 tarzı, ~%70 zorluk 2 / ~%30 zorluk 3** (Ida, 9 Eki 2026; 1 Eki'de yalnız zorluk 2 idi) —
  zorluk 1, 4, 5 üretilmez; bilim ve cografya için üretilmez. Yasak tip: genel kavram ("X'in amacı"), tanımlama,
  okuduğunu anlama, mantıkla bulunan. Stil, kategori önceliği ve Ida'nın onaylı örnekleri: `docs/SORU_STIL_PROFILI.md`
  (her partiden sonra geri bildirimle eklenerek güncellenir). Üretim Claude API ile (`araclar/soru-uretim/api-uret.mjs`,
  kolay_03'ten beri); global sorulara İngilizce çeviri YAPILIR, yerel TR soruda EN boş + `ceviri_atlanan`.
  Hat: `araclar/soru-uretim/OKU.md › Kolay seri`.
- **Soru kapsamı (652–655, Ida 26 Eyl):** `questions.kapsam` = `global` (evrensel) | `yerel` (+ `ulke` TR; Türkiye
  tarihi/coğrafyası/siyaseti, yalnız Türkiye'de bilinen kültür). Aktif havuz 9.931 global / 2.302 yerel (Jev, `araclar/jev-kapsam.mjs`;
  belirsizler yerel). Maçta bot OLMAYAN bir oyuncunun ülkesi ≠ TR ya da dili ≠ tr ise o maçta HERKESE yalnız global —
  bütün modlar (`soru_sec` içinde, gevşetilmez; Turnuva katılımcılara göre `app.soru_kapsam`). Türkiye-Türkiye ve yabancı
  gizli bota karşı maç değişmez. Kategoride global < `soru_kapsam_min_havuz` (60) ise yabancılı maçta seçilemez (Düello),
  karışığa düşer (Klasik — arkadaş daveti/Antrenman; kategorili eşleşme araması ise reddedilir, 860) ve `get_categories`'ten düşer. Anahtar `soru_kapsam_filtresi_acik`. Yeni üretim `kapsam` alanıyla
  (generate-questions). Test: `node araclar/kapsam-sql-testi.mjs`, `oyuncu-testi --ulke=DE`.
- **Kategoriye göre maç (860, Ida 2 Eki 2026) — Klasik + Saf Bilgi, Düello HARİÇ:** OYNA'dan önce kategori seçilir (10 kategori +
  "Karışık" = seçilmedi). Kategori seçilirse 20 sorunun HEPSİ o kategoriden (`kategori_mac_soru_sec`; `soru_sec` karışığa düşerse maç
  kurulmaz). Eşleşme havuzu kategoriye göre ayrı: yalnız aynı kategoriyi seçenler eşleşir, Karışık ↔ Karışık eski kurallarla; süre dolunca
  370 bot yedeği aynı kategoride. Seçilebilirlik sunucuda: rekabetçi havuz (dil + kapsam) < `kategori_mac_min_soru` (60) ise kayıt ve arama
  reddedilir (`kategori_mac_uygun_mu`; istemci listesi `get_categories` + `kategori_mac_uygunlar()`). Boş `p_kategori` = Karışık;
  `profiles.tercih_kategori` yalnız son seçimi hatırlar (`useKategoriTercih`), aramaya sızmaz. Arayüz `KategoriSecici` (OYNA/Saf Bilgi
  penceresi + Modlar). Lig puanı/ödül aynı.
- **Geç varış payı (991, Ida 7 Eki 2026): süre bitmeden işaretlenen cevap SAYILIR** — ağ/Supabase gecikmesi oyuncuyu
  cezalandırmaz. İstemci dokunma anını (sunucu saatiyle ms) `x-qt-tik` başlığıyla yollar (`zaman.js › tikBasligiEkle`;
  RPC imzaları aynı). Sunucu `cevap_gec_kabul`: varış ≤ bitiş + eski tolerans → kabul; değilse tık ≤ bitiş + tolerans
  ve varış ≤ bitiş + pay → kabul. Pay `cevap_gec_varis_sn` 5 (cevaplar), `secim_gec_varis_sn` 3 (Hazine AÇ/DEVAM,
  Düello seçim + kategori). Faz, cevaplamayan oyuncu için bitiş + pay dolunca kapanır; herkes cevapladıysa beklenmez
  (Klasik'te süresi biten istemcinin `mac_soruyu_atla`sı da "cevap yok" sayılır). Kasa, Düello, Klasik/Saf Bilgi,
  Grup, Turnuva, Hatalarım. Sahte tık beyanının kazancı en çok pay kadar; puan/hız beyana bağlı değil (`at` =
  least(varış, bitiş)). Testler `araclar/gec-cevap-sql-testi.mjs` (ROLLBACK) + `araclar/gec-cevap-canli-testi.mjs`.
- **Gösterim payı (325/326):** sunucu yeni fazın/sorunun bitişine pay ekler — Düello
  `duello_gosterim_payi_ms` 1500 (kategori + cevap), Klasik/Grup/Turnuva sonraki soru
  `soru_gosterim_payi_ms` 2000. İstemci sayacı pay bitene dek TAM süreyi gösterir, sonra gerçek
  zamanla akar; sayaç yetişmek için hızlanmaz. Faz ekrana geç görünürse ilk rakamın kesri ilk görünüşte bir kez
  alınır ve kalanla orantılı erir (`lib/zaman.js › sayacGoster`): ilk rakam tam saniye, rakamlar ≥ 900 ms, gösterilen 0 gerçek
  bitişle aynı anda (ölçüm: ±60 ms); mantık gerçek kalanda — Düello `gosterSn`, `QuestionCard` `gosterKalan`. Düello
  gösterimi için saat farkı sıçraması en çok %5 hızla kaydırılır. `oyuncu-testi --sifir` bu sıfır anını ölçer. İki oyuncunun bitişi aynı, geç cevap sunucuda
  reddedilir. Düello `sunucu_zamani` = clock_timestamp(). Ölçüm: `oyuncu-testi` sayaç raporu (⏱).
  **Klasik maç başı 3-2-1 (651, 25 Eyl):** ilk sorunun başlangıcı = now + `mac_geri_sayim_sn` (3) + `mac_geri_sayim_payi_ms` (2000);
  istemci en çok "3" gösterir (pay boyunca bekler), maç satırı "başladı" derse nabzı hemen atar, saat farkı gidiş-dönüş ortasından.
  Sonraki soru geri bildirim penceresi sürerken arka planda çekilir (`soruCek › bekleMs`; Klasik/Grup/Turnuva). Yüksek gecikme
  ölçümü: `node araclar/gecikme-testi.mjs --gecikme=300` (iki gerçek oyuncu, biri yavaşlatılmış; `--gorunum=375x553 --uzun` kısa ekran).
- Yanlış cevap sonrası bekleme **1 sn**.
- Kategori yüzdesi için asgari örneklem 10 soru; altı "veri yok".

### Kasa (deneysel — 950 + 951 + 952 + 953 + 954 + 955 + 956 + 957 + 958 + 980 + 981 + 983 + 985 + 987 canlıda, 7 Eki 2026; sunum 990) — oyuncuya görünen adı "Ortak Hazine"
- **Ad (Ida, 6 Eki 2026):** oyuncunun gördüğü ad **"Ortak Hazine"** (EN "Shared Treasure"); ortadaki puan **"hazine"** (EN "treasure"; kadranda HAZİNE / TREASURE, AÇ anında HAZİNE AÇILDI!). Sandık görseli aynı. Kod, dosya, bileşen, veritabanı ve bildirim tipi adları **kasa_*** olarak KALIR (bu bölümdeki "Kasa" = kod adı). Arayüzde "Kasa"/"Vault" geçmez: metinler `ceviri/kasa.js` (anahtar = yeni Türkçe metin). Sunucunun eski metinleri ("Kasa" geçen hata/bildirim) istemcide yeni adla yazılır: TR `dil.js › TR_DUZELTME + TR_KALIP`, EN `ceviri/kasa.js` + `ceviri/sunucu.js`. **Migration 980 (`ortak_hazine_metinleri`) canlıda (6 Eki 2026):** push başlıkları (`bildirim_yaz`) + davet bildirim/hata metinleri (`kasa_davet_et`, `kasa_davet_cevap`); yalnız metin, yetki/kural aynı (canlıda BEGIN…ROLLBACK ile denendi). Geri alma `docs/kasa-geri-alma-980.sql`.
- **Senkron + tek sefer kuralı (980 istemci, 6 Eki 2026):** saat farkı istek/yanıt orta noktası + penceredeki en kısa gidiş-dönüş (`zaman.js › saatFarkiOrnekle`; Düello da). Giriş sahnesinin bitişi sahne başlayınca SABİTLENİR, bitince maçta bir daha açılmaz (tembel faz geçişinde gosterim_bas kayıyordu). Her ses/efekt olay anahtarına bağlı, maçta tek sefer (`KasaPage › birKez`: faz, tik, 3-2-1, giriş düşüşü, final). Gizli sekmede ses/titreşim yok (`ses.js › cal`, `geriBildirim.js › titret` — BÜTÜN modlar); sekme gizlenince süren anlar biter (`anlariBitir`). Sonuç uçuşu / AÇ / DEVAM ×2 / ÇİFTE / maç sonu sahnesi dokunarak geçilir. AÇ anı 1,28 sn, DEVAM anı 1,4 sn (soru gösterim payı 2,0 sn içinde — 983). Karar süresi: düğmeler sunucu bitişine 6,45–6,9 sn kala tıklanabilir (983 ölçümü; 1,5 sn payla 6,0–6,4) (5 sn yenmiyor; sunucu değişikliği gerekmedi). Sandığın sonsuz döngüleri (giriş kapak tıkırtısı, karar nabız/titreme) tek sefer; son 3 sn "gergin" kalır. **Ses = görsel anı (9 Eki 2026):** Düello v4 saldırı sorusu sesi "kim neyi aldı" panelinin kalktığı SUNUCU anına bağlı (`gosterim_bas − pay + duello4_acilis`; o an yeniden çizim zorlanır), faz cihaza geç gelse de kayma ≤ 10 ms; an 500 ms’den çok geride kaldıysa (yenileme/geç katılım) çalmaz, panel hiç görünmediyse kategori sesi de çalmaz. Hazine soru sesi tek kaynak (`KasaPage › soruSesi`: giriş kalkışı / faz gelişi / AÇ anı bitişi, anahtar `soru:<tur>`). Diğer modlarda ses, görselin çizildiği efekte bağlı (ölçüm `araclar/ses-zamanlama-olcum.mjs`, taklit). Ön yükleme: maç ekranları `sesOnYukle` çağırır (Hazine dahil); ses seçimleri sunucudan geç gelirse istenen gruplar seçilen dosyayla yeniden iner — yoksa ilk çalış 250 ms sınırında atlanıyordu. Test: `araclar/kasa-canli-testi.mjs --ag=150 --cpu=4 --dondur`.

- 2 kişi; kasa +2 / ikisi doğru +6; tek bilen sahip; sahip tur başında AÇ/DEVAM; **954: DEVAM (bilerek ya da süre dolumu) sahipliği bırakır** — kasa korunur, sahip null, sahipsizken karar fazı yok, yeni sahip yalnız tek başına bilen (ikisi bilir / ikisi yanlış → sahipsiz kalır); tur sınırında sahip yoksa kasa kimseye gitmez; **80 puan (958; 955: 60; 951: 50) / 36 tur / karar 5 sn (955; önce 8)** / eşitlikte Altın Soru (sayılar `oyun_ayarlari.kasa_*`, maç açılırken satıra sabitlenir). **Tavan + DEVAM çarpanı (955 mekanizma; 956 değerler — Ida, 5 Eki 2026, 955 canlı testi sonrası):** `kasa_tavan` **80** (981, Ida 6 Eki 2026; 956: 60; 955: 30) — kasa hiçbir zaman geçemez, soru artışından (+2/+6) SONRA ve DEVAM çarpanından SONRA min(kasa, tavan). `kasa_devam_carpan` **2** (955: 1.25 — kasa 10'da yalnız +3, hissedilmiyordu) — her DEVAM (bilerek ya da süre dolumu, bot dahil) kasa = ceil(kasa × 2), sonra tavan; seri/kademe yok (10 → 20 → 40/44 → 60). **Tavan 60 = hedef 60: yüksek kasa tek AÇ ile maçı bitirebilir** — 955'in "tavan = hedefin yarısı, en az 2 AÇ" tasarımı BİLEREK terk edildi (Ida kabul etti; hata değil). 956 yalnız iki ayar değeri; fonksiyon/şema değişmedi. Satıra sabit `kasa_maclari.kasa_tavan` (vars. 0 = yok) / `devam_carpan` (vars. 1 = yok) — süren 954 maçları eski kuralla biter; ayarlar canlıda SQL ile (tavan 0 / çarpan 1 = kapalı). Bot tavandaki kasayı her zaman açar. **988 (Ida, 9 Eki 2026): tavan ≥ hedef ve hazine tavandayken karar süresi dolarsa otomatik AÇ** (maç biter; `son_karar.oto`); bilerek DEVAM ve tavan < hedef maçları eski kural. Karar ekranında tavanda DEVAM düğmesi yok; düğmeler sonucu gösterir ("AÇ → +k / Skor s/h", "DEVAM → Hazine y" + kalkan). `son_karar` DEVAM'da `yeni`/`carpan`/`tavan`, `son_tur.tavan_kirpti`, `kasa_durum` `tavan`/`devam_carpan`. Simülasyon 956 (SQL, 150 maç, %60 isabet, eşik 10 vs 20): ort ~20,6 tur, %100 hedefle biter, ort AÇ ~21, tek AÇ ile biten ~%2 (Ida'nın beklediği ~%44'ten SAPAR — politika varsayımı farklı olabilir), AÇ'ların ~%0,6'sı tavanda. Geri alma `docs/kasa-geri-alma-956.sql` (955: `docs/kasa-geri-alma-955.sql`). **955 görsel:** kasa artık altın kenarlı HAZİNE SANDIĞI (SVG; kapak menteşesi, kilit plakası), 4 kademe kasa/tavan oranıyla (kapak aralanır, altın taşar, ışık güçlenir), tavanda DOLU parıltısı + göstergede `/<tavan>` (956: `/60`; kademeler 60'a yayılır: ~20 kapak aralık, ~44 altın taşar, 60 DOLU); giriş sahnesi TEK KATMAN (soru gizli, 3-2-1 sandığın üstünde, sunucu saatine bağlı — süre kaybı yok); DEVAM anı: sandık sarsılır, "×<çarpan>" (956: "×2") patlar, kasa eski → yeni sayarak yükselir; çarpan/tavan metinleri ayardan okunur, kural satırı tavan < hedef iken "tek AÇ maçı bitirmez", değilse "Kasa en çok {t} olur.". **AÇ alt sınırı YOK (958, Ida 5 Eki 2026): `kasa_acma_min` 0** — kasa kaç olursa olsun (2 iken de) tek başına bilen sahip bir sonraki soru gelmeden AÇ/DEVAM der; sahipsizken karar fazı yine yok; bot küçük kasada kendi eşiğine göre (altında DEVAM). 958 yalnız iki ayar değeri (fonksiyon/şema değişmedi; mantık 0'ı "hiç kilitleme" diye işler); acma_min + hedef maç satırına sabit → süren 957 maçları alt sınır 10 / hedef 60 ile biter ve o maçlarda kilitli AÇ rozeti hâlâ görünür. 981'den beri tavan 80 = hedef 80 → dolu hazine tek AÇ ile maçı bitirebilir (958–981 arası hedef 80 > tavan 60 iken en az 2 AÇ gerekiyordu). 981 yalnız ayar; satıra sabit → süren maçlar tavan 60 ile biter; geri alma `docs/kasa-geri-alma-981.sql`. Geri alma `docs/kasa-geri-alma-958.sql` (10 / 60). Simülasyon 958 (SQL, 150 maç, karar kuralı bot eşikleri 8/14/20±2): %70 isabet ort ~25,6 tur, %96 hedefle biter, karar ekranı ~10,6/maç, DEVAM ~5,2/maç, iki AÇ ile biten ~%9; %90 isabet ort ~28 tur, %85 hedefle biter, iki AÇ ile biten ~%47. Ida'nın beklediği "tek AÇ ile biten ~%27 / ~%47", "DEVAM ~2-3", "karar ~7" bu politikayla tutmuyor (tek AÇ hedef 80 > tavan 60 yüzünden imkânsız) — Ida'ya soru açık. Bot eşikleri 8/14/20. **Joker (951):** 50:50, Ek Süre, Zaman Baskısı, İkinci Şans — Klasik envanteri ve Klasik sınırları (6 / 2 / 1) — **985 (Ida, 7 Eki 2026; canlıda):** Hazine'ye özel sınırlar `kasa_joker_hak_*` İkinci Şans 1 · 50:50 2 · Ek Süre 2 · Zaman Baskısı 3, `kasa_joker_toplam_hak` 4, `kasa_joker_soru_basi_hak` 1 (DEVAM ücretsiz 50:50 sayılmaz; çubukta tür başı `kalan/sınır` sayacı; geri alma `docs/kasa-geri-alma-985.sql`, test `araclar/kasa-joker-sinir-sql-testi.mjs`), `kasa_joker` + `kasa_joker_durumu`, çubuk Klasik `JokerCubugu` (macTur "kasa"); Soru Değiştir/Sigorta/2X yok, Altın Soru jokersiz; kişisel bitiş `kasa_oyuncu_bitis` (faz bitişi + joker farkı); rakip yalnız joker adını görür. Geri alma `docs/kasa-geri-alma-951.sql`. **952/1038:** başlangıç fazı 3 + 2 + `kasa_giris_sahne_ms` = **9 sn** (`kasa_giris_sahne_ms` **4000**, canlı DB — 1038, Ida 10 Eki 2026; geri alma `docs/kasa-giris-4000-geri-al.sql`). İstemci süreyi AYNI ayardan okur (`KasaPage › useAyar`, okunamazsa 4000; tek kaynak, uyuşmazlık kalktı) = ~1 sn sandık düşüşü + 3 sn tam 3-2-1, ilk sorunun gösterim başlangıcında biter — 3-2-1 tam görünür, geri alma `docs/kasa-geri-alma-952.sql`. **987 DEVAM ödülü = SAVUNMA HAKKI (Ida, 7 Eki 2026; canlıda — 954'ün ücretsiz 50:50'sinin YERİNE):** bilerek DEVAM (bot dahil; süre dolumu değil) → oyuncu başı en fazla 1 hak, süresiz; iki oyuncuya görünür (avatarda altın kalkan). Tetik: hak sahibi normal soruyu yanlış + rakip tek başına doğru → rakip AÇ/DEVAM'a geçmez, sonuç bandından sonra **Savunma Sorusu** (tur sayısını yemez; normal soru kasaya +2'sini ekler; hazine o sırada sahipsiz): yalnız hak sahibi cevaplar, rakip izler, 15 sn, farklı kategori + orta zorluk (yoksa gevşer), kasaya bir şey eklemez; normal jokerler (985 sınırları; soru başı sınırı ayrı soru, `soru_index = -tur`) kullanılır, Zaman Baskısı hariç. Doğru → rakibin kararı iptal, hazine sahipsiz; yanlış / süre / bağlantı kopması → rakip sahip olur ve karar verir. Hak Savunma Sorusu açılınca tüketilir; hazine AÇILINCA bütün haklar silinir. Açılmaz: son tur, Altın Soru (hak kalır). **988 (Ida, 8 Eki 2026; canlıda): hazine hedefe/tavana (80) ulaştığında da açılır** — başarılıysa hazine 80'de sahipsiz kalır, maç sürer; başarısızsa rakip karar verir. Geri alma `docs/kasa-geri-alma-988.sql`, test `araclar/kasa-savunma-80-sql-testi.mjs`. Bot savunanda `bot_soru_isabet` ile, jokersiz (Hazine botları normal joker kullanmaz). Kural satıra sabit `kasa_maclari.savunma_acik` (ayar `kasa_savunma_acik` 1; açıkken `devam_elli` false); durum `savunma_hak uuid[]` + `savunma jsonb` (bekliyor/soru/basarili/basarisiz + neden), geçmiş `kasa_hamleler.savunma`; `kasa_durum` → `savunma_acik/savunma_hak/savunma`, `kasa_joker_durumu` → `savunma/yasak_turler`. Ad "Savunma Hakkı" / EN "Defense Right" — arayüzde tek yer `KasaParcalari › SAVUNMA_HAKKI` + `ceviri/kasa.js` (Düello Kalkan jokeriyle karışmasın). Simülasyon: tetik 1,4–3,1/maç, başarılı savunma %54–72, maç +2–5 soru, DEVAM dengesi korunur. Geri alma `docs/kasa-geri-alma-987.sql`; testler `araclar/kasa-savunma-sql-testi.mjs` (ROLLBACK, 49) + `araclar/kasa-savunma-ekran.mjs` (taklit, 170). **954 DEVAM ödülü (953'ün yerine; 987 ile YENİ maçlarda kapalı, süren 954 maçları eski kuralla biter):** bilerek DEVAM diyen (süre dolumu değil) kasa AÇILANA kadar her soruda 1 ücretsiz 50:50 alır (garanti; şans/garanti sayacı/Ek Süre yok); AÇ iki oyuncunun hakkını bitirir; envanter/coin/Klasik sınırları dışı (`kasa_joker` `p_bedava`), kullanılmazsa soru kapanınca kaybolur ve sonraki soruda yeniden verilir; Altın Soru jokersiz. Durum `kasa_maclari.joker._hak` (uid listesi), dağıtım `kasa_devam_hak_ver` (kasa_soru_ac sonunda); yalnız sahibi görür (`bedava_joker`), rakip kullanılınca adını; bot o soruda hemen kullanır. Kural satıra sabit: `devam_birakir` / `devam_elli` (ayar `kasa_devam_birakir` · `kasa_devam_joker_acik`); yeni maçta `devam_sans`/`devam_garanti` 0 — `kasa_devam_joker_sans/_garanti` artık okunmuyor (satırlar duruyor); süren 953 maçları eski kuralla biter. Arayüz: "DEVAM · ÜCRETSİZ 50:50", sahipsiz kasada mini kadranda SAHİPSİZ rozeti + karar satırı gizli. Geri alma `docs/kasa-geri-alma-954.sql` (953: `docs/kasa-geri-alma-953.sql`). Canlı uçtan uca test `araclar/kasa-canli-testi.mjs` (gerçek-gerçek / bot, sayaç–sunucu, ses–faz). Ödül Klasik yoluyla aynı (× `kasa_odul_acik` × `kasa_odul_carpani`), Sezon Puanı kaynağı `mac` / referans `kasa:<id>`. `kasa_tik` cron 30 sn (aktif maç yoksa hemen çıkar). Kapatma `kasa_modu_acik` = 0 (istemci ayar satırı yoksa kapalı sayar). Uygulama `docs/kasa-canliya-uygulama.md`, geri alma `docs/kasa-geri-alma-950.sql`, test `araclar/kasa-sql-testi.mjs` (ROLLBACK) + `araclar/kasa-ekran.mjs` (taklit) + `araclar/kasa-efekt-ekran.mjs` (anlar, taklit). Görsel/anlar: `components/KasaEfekt.jsx` + `styles/kasa-efekt.css` (SVG kasa, +2/+6 altın uçuşu, 🔑 sahiplik, AÇ anı, karar gerilimi, maç sonu altın yağmuru; 951: 3-2-1 sonrası 3 sn giriş sahnesi (sunucu saatine bağlı, sayaç sahne bitince başlar), AÇ ile biten maçta 4,3 sn yavaş açılış / kaybedende kapanış, ÇİFTE bandı, kasa ≥20 ışık ≥40 alev; yalnız sunum).
- **Sunum paketi (990, Ida 6 Eki 2026 — yalnız istemci; kural/ayar değişmedi):** AÇ / DEVAM anı geç veride bile en az **1,0 sn** görünür (980'deki %40'a sıkışma ve AÇ'ın atlanması kalktı); an (ve rakip karar kartı) bitene kadar yeni sorunun SAYACI GİZLİ (yer tutucu), AÇ'ta şıklar örtülü — an bitince sayaç sunucunun gerçek kalanını gösterir. **Rakibin kararı** önce 0,3 sn kapalı kart ("Rakip karar verdi"), sonra vuruş: AÇ'ta AÇ anının kendi yazısı, DEVAM'da "RAKİP DEVAM ETTİ · Hazine ×2" kartı (0,65 sn); olay anahtarlı tek sefer, dokunarak geçilir, hareket azaltmada yalnız saydamlık. **Soru sırasında hazine skor şeridinin ORTASINDA** ortak nesne: SEN çubuğu | sandık + değer | RAKİP çubuğu (çubuklar hazineye doğru dolar, sahibin tarafına ok); karar/başlangıçta ortada HEDEF; şerit yüksekliği eskisiyle aynı (≈42–48 px). Başlıkta ad sütunu sabit en büyük genişlik (112 px, ≤400 px ekranda 92) + üç nokta. **Lobi:** 3 maddelik özet + "Rakip ara" ilk ekranda + açılır "Tüm kurallar". Sunucu `kasa_gosterim_payi_ms` **2000** (983, Ida 6 Eki 2026; önce 1500) — rakip kararında kapalı kart + 1 sn tabanlı an ≈ 1,3 sn, tipik Realtime gecikmesinde soru süresinden yemez. Pay maça SABİTLENMEZ, her fazda canlı okunur (983 aktif maç varken uygulanmaz). Test `araclar/sunum-990-ekran.mjs` (taklit).
- **Kasa oyunun parçasıdır, ayrı tutulmaz (Ida, 5 Eki 2026 — 957).** Öteki modlardaki ortak özellikler Kasa'da da var: **arkadaşa meydan okuma** — mod seçim penceresinde (Arkadaşlar "Oyna", ana sayfa OYNA) Kasa kartı (`kasa_modu_acik` kapalıysa gizli), Meydan sayfasında Kasa modu + "Sana gelen davetler"/"Gönderdiğin" Kasa satırları, arkadaş satırında bekleyen/başlayan Kasa şeridi, üst davet bandı (`bekleyen_davetlerim` 'kasa', kabul `kasa_davet_cevap` → dönen maç id'sine gider), bildirim tostu/zili `kasa_daveti`/`kasa_kabul` (kabulde davet eden otomatik maça girer), push başlığı, ana sayfa gelen davet sayısı; ortak sunucu zinciri `gonderdigim_davetler` / `davet_geri_cek('kasa')` / `davet_cakismasi` (bekleyen sınırı + aktif Kasa maçı başka mod davetini kabulü engeller) / `oyuncu_engelle` (bekleyen Kasa davetini iptal eder); `kasa_davetleri` Realtime'da (davet 24 saat geçerli). **Rövanş** Düello ile aynı: `kasa_rovans_iste` / `_yanitla` / `_iptal` (authenticated) + iç `kasa_rovans_baslat`; istek `kasa_rovans_sn` (60) geçerli, maç bitişinden 24 saat sonra istenemez, engelli çift isteyemez, bota istek hemen kabul edilir; yeni maç aynı oyuncular + aynı Dereceli/Serbest, `kasa_maclari.onceki_id` / `rovans_id`; `kasa_durum.rovans` + `ezeli` (arkadaşla bitmiş Kasa maçlarında galibiyet sayısı, maç sonunda "Bu oyuncuyla 2-0 öndesin"). **Tepki**: özel kanal `tepki-kasa-<id>` (yalnız iki oyuncu, engelli çift hariç), açık modlar listesi aynı (`tepki_acik_modlar` — bugün yalnız Antrenman). **Kategori ustalığı + soru sayacı** (`kategori_dogru_arttir`, `soru_sayac`) Kasa cevaplarında da işler. Gizli bot nabzı aktif Kasa maçını sayar; `/kasa/:id` çevrimiçi durumda "maçta", maç müziği çalar; lobide süren maça "Maça dön". Kasa rozet ailesi YOK (Ida: şimdilik ekleme; ortak `ilk_galibiyet`/`mac_10` sayılır). Geri alma `docs/kasa-geri-alma-957.sql`; testler `araclar/kasa-ortak-sql-testi.mjs` (ROLLBACK) + `araclar/kasa-davet-canli-testi.mjs` (iki oturum, uçtan uca).

### Düello

- **DÜELLO v4 (1013–1015, 9 Eki 2026 — canlıda, bayrak `duello_v4_acik` = **"acik"** (canlı DB ölçümü, 9 Eki 2026) — herkes oynar; "test" = yalnız `duello_v2_test_kullanicilari` (6 hesap), "kapali" = kimse).** Maç açılırken satıra sabitlenir (`surum` 4); süren surum 2 maçları eski kuralla biter. Kural: nötr soruda (iki oyuncuya aynı) yalnız biri doğru → KONTROL onda (seri 0/3); art arda 5 nötr → Son Düello. Kontrol sahibine her saldırı turunda 4 rastgele kart (kontrol döneminde kullanılan kategoriler girmez; kalan < 4 → havuz açılır); `duello_kategori_sec` 1. dokunuş RAKİBE GÖNDER, 2. KENDİNE SEÇ — **onay düğmesi yok, tek dokunuş** (1034); her adımın başında duyuru (`duello4_kart_duyuru_ms` 900) boyunca sayaç durur, kullanılabilir süre toplam 10 sn (1035; `duello4_kart_sn`); sunucu son tarihi `faz_bitis` = açılış + 10 + duyurular, `v4_duyuru_bitis` = istemcinin `gosterim_bas`ı; aynı kart tekrarı sessiz (idempotent). Dolarsa: 1. adım rakibin EN ZAYIFI, 2. adım kendi EN GÜÇLÜSÜ. Geri alma `docs/duello-v4-kart-akisi-geri-al.sql` + `KART_TEK_DOKUNUS = false`. İki oyuncuya farklı kategoriden, AYNI ZORLUKTA iki farklı soru (`soru_sec` adayları). Sahip doğru + rakip yanlış → seri +1; sahip yanlış + rakip doğru → kontrol rakibe, seri 1/3, liste sıfır; ikisi aynı → değişmez (süre dolumu yanlış). Aynı dönemde seri 3/3 kazanır (sonuç fazından sonra). **20** saldırı turu (1016; nötr sayılmaz) → SON DÜELLO: aynı soru, jokersiz, tek bilen kazanır. Puan/sahiplik/draft/kilit/ban/Baskın/Kalkan YOK; normal jokerler kendi sorusunda (Soru Değiştir aynı kategori + zorluk). Son Nefes / Büyük Geri Dönüş saymaz; Son Düello galibiyeti Altın Dokunuş sayar. Kod: `duello4_*` (iç, istemciye kapalı), durum `duello_durum` → `duello4_durum` (`v4 {kontrol, seri, tur, kart{kartlar[ben/rakip %], adim}, …}`). Test `araclar/duello-v4-sql-testi.mjs` (ROLLBACK). Geri alma `docs/duello-geri-alma-v4.sql`. Arayüz: TEK ARENA `components/duello4/Duello4Arena.jsx` + `duello4.css` (DuelloPage yalnız surum 4'te çizer; maç sonu ortak `MacSonuKutlama`). Testler: `duello-v4-ekran.mjs` (taklit) · `duello-v4-canli-bot-testi.mjs` (canlı bot maçı).
- **PUAN KURALI (970, Ida 6 Eki 2026) — bugünkü kural.** Bayrak `duello_puan_modu` (jsonb "yeni" | "eski", varsayılan "yeni";
  yalnız seçim modunda açılan maçta geçerli). Mod, hedef, kategori yolu ve tur maç satırına sabit (`duellolar.puan_modu/puan_hedef/kategori_yolu/max_tur`).
  Draft aynen (10 kategori, yılan 5-5). Saldıran **yalnız rakibin (savunanın) kategorisini** seçer; kendi kategorisine saldırı sunucuda
  reddedilir (`duello2_kategori_uygun_mu` → `duello2_puan_hedefler`; otomatik seçim, bot ve ban da bu kapıdan geçer — savunan yalnız kendi
  kategorisini banlar). Puan (`duello2_cozumle`, puan1/puan2 kolonları): **doğru cevap +1** (savunanınki Baskın'da sayılmaz), **kategori
  alınırsa saldırana +1 ek (toplam +2)** → ikisi doğru +1/+1 el değişmez · saldıran doğru + savunan yanlış → saldıran +2 ve alır (kilit
  `duello_kilit_tur` 2) · saldıran yanlış + savunan doğru → savunan +1 · ikisi yanlış → 0. Kalkan: alma ve ek puan yok (saldıran doğruysa
  +1). **Kazanma** (`duello2_sonraki`, sonuç fazından sonra anında): `duello_puan_hedef` (**12**) puana ya da rakibin BAŞLANGIÇTAKİ (seçimdeki)
  kategorilerinden `duello_puan_kategori_yolu` (**4**) tanesini elinde tutan (`duello2_puan_alinan`; geri alınan düşer); ikisi aynı turda iki
  oyuncu için birden → Altın Soru; `duello_puan_max_tur` (20) tur sonunda puanı çok olan, eşitse Altın Soru. **7 yuva eşiği bu modda yok**
  (yuva sayıları yalnız gösterim). Kilit: savunanın bütün kategorileri kilitliyse kilit o tur yok sayılır. Bot: net beklenen puan
  p_s·(2−p_d) − (1−p_s)·p_d, bitişe yakınken (hedefe ≤ 2 puan ya da yolda 1 eksik) en değerli hamle; ban da aynı değerle.
  Durum: `duello_durum › puan {acik, hedef, kategori_yolu, puanlar, alinan, baslangic}`, `son_hamle.hakimiyet.{puan_modu, kazanilan, puanlar, alinan}`.
  Ekran: puan tahtası (iki satır: Sen x/12 + çubuk + "Çalınan" y/4; cevapta ince; seçim fazında 5'erli yuva şeridi), kart grupları
  "Rakibin kategorileri · saldır" / "Senin kategorilerin · savun" (saldırıda kendi kartların, banda rakibinkiler pasif), "Saldır" +
  "tutarsa kategori senin · a→b", tur sonu "Sen +a · Rakip +b · X el değiştirdi / kategori el değiştirmedi" + bir kez oynayan +N rozeti.
  Geri alma `docs/duello-geri-alma-puan.sql` (bayrak "eski" → aşağıdaki 960 hâkimiyet aynen). Testler: `duello-puan-modu-sql-testi.mjs`
  (ROLLBACK; `--sim N`, `--yaris`) · `duello-puan-ekran.mjs` (taklit) · `duello-secim-canli-testi.mjs --mod=bot|gercek --tam` (canlı tam maç).
- **Sırayla kategori seçimi — draft (960, Ida 5 Eki 2026):** maç `secim` fazıyla açılır: 10 kategori ortada, sıra yılan A-B-B-A-A-B-B-A-A-B, herkes 5;
  seçilen kategori anında seçenin yuvası (sahiplik). İlk seçen rastgele (`duello_olustur` oyuncuları karıştırır; ilk seçen = oyuncu2), tur 1'de ilk
  SALDIRAN = oyuncu1 = ilk seçmeyen. Süre `duello_secim_sn` 5 (+ gösterim payı; ilk seçimde + `duello_secim_ilk_ek_sn` 3); dolarsa sunucu oyuncunun
  maç başında sabit kart yüzdesi (`profil.oranlar`, kartta "Sen %X") en yüksek kalanı seçer, yüzdesiz ("Yeni") kartlar sonra rastgele; bot
  `duello_bot_secim_min/max_sn` 1–3 sn sonra `bot_kategori_isabet` en yüksek kalanı seçer (geç kalırsa süre dolumu aynı seçimi yapar). Seçim istemciden
  MEVCUT `duello_kategori_sec` ile (faz secim dalı; yeni GRANT yok), satır FOR UPDATE ile serileşir; sıra dışı / alınmış / geçersiz seçim reddedilir.
  Seçim bitince tur 1 ban fazı. Boş kategori YOK → 870 boş kuralı kodda durur, bu modda tetiklenmez. Mod (`secim_modu`), eşik ve tur (`max_tur`)
  maç satırına sabit. Bayrak `duello_secim_modu` (jsonb true/false): false → eski akış (boş başlar, eşik `duello_bos_mod_esik` 5, tur
  `duello_bos_mod_max_tur` 16). Durum: `duello_durum › secim {acik, sira, toplam, ilk_secen, sure, sirasi, secimler[{k,u,oto,sira}], kalan}`.
  Geri alma `docs/duello-geri-alma-secim.sql`. Test `araclar/duello-secim-sql-testi.mjs` (ROLLBACK; `--sim N`, `--yaris`) ·
  `duello-secim-ekran.mjs` (taklit) · `duello-secim-canli-testi.mjs --mod=bot|gercek`. Metinler maç dışında `lib/duelloKurallari.js › useDuelloKurallari`.
- **Hâkimiyet (680/681, Ida 30 Eyl 2026) — PUAN YOK. 970'ten beri yalnız `duello_puan_modu` = "eski" iken (ya da seçim modu kapalıyken).** **20 tur** (`duello_max_tur`, 960 — 5 Eki 2026 Ida: 16 → 20; maç satırına sabit),
  **1 tur = 1 hamle** (tek turda oyuncu1, çift turda oyuncu2 saldırır), 10 kategori; seçim modunda 5-5 başlar (eski akışta 0-0, hepsi boş). Saldıran kategoriyi seçer
  (15 sn; dolarsa rastgele uygun), soru ikisine aynı anda açılır (cevap 15 sn, süre dolarsa yanlış).
  **Hamle yalnız "saldıran doğru + savunan yanlış" ise tutar.** Rakibin kategorisi (Elinden al) → tutarsa saldırana
  geçer · boş (Al) → tutarsa saldıran alır, saldıran yanlış + savunan doğru → savunan alır ("boşta bilen alır"), **ikisi de doğru → saldıran alır** (870, Ida 2 Eki 2026; neden `bos_ikisi_dogru`, kilit aynen; ayar `duello_bos_ikisi_dogru_saldiran` 1, 0 → kimse almaz) ·
  kendi kategorisi (Pekiştir) → tutarsa kilitlenir. **Kilit:** sahipliği değişen / pekiştirilen kategori
  `duello_kilit_tur` (2) tur kimse tarafından seçilemez; tutmayan hamlede kilit yok. **Kazanma:** `duello_hakimiyet_esik`
  (**7**, 960 — 5 Eki 2026 Ida: 5 → 7; maç açılırken `duellolar.hakimiyet_esik`'e sabitlenir) yuvaya ilk ulaşan kazanır (sonuç fazından sonra biter); son tur (20.) sonunda yuvası çok olan; eşitse Altın Soru.
  Hesap sunucuda: `duello2_cozumle` (kural + kilit), `duello2_sonraki` (nakavt / sayım / roller), kilit kapısı
  `duello2_kategori_uygun_mu`. Veri: `duellolar.hakimiyet/sahiplik/kilitler/hakimiyet_esik/kilit_tur/yuva1/yuva2`,
  `duello_hamleler.hakimiyet` (eylem, tuttu, neden, sahip_once/sonra, kilit, baskin, kalkan, cakisma, yuvalar);
  `duello_durum › hakimiyet` (sahiplik, kilitler{kat: kalan tur}, yuvalar, rol_joker). Eski puan maçları
  (`hakimiyet=false`) eski dallarla çözülür; puan/yıldız/×2 ayarları "KULLANILMIYOR (680)".
  Test: `node araclar/duello-hakimiyet-sql-testi.mjs` · `node araclar/duello-hakimiyet-bot-testi.mjs`.
- **SAVUNMA BANI KALDIRILDI (982, Ida 6 Eki 2026) — bugünkü kural:** tur akışı sonuç → saldırı kategorisi seçimi → soru; ban fazı hiç açılmaz. Bayrak `duello_ban_acik` (jsonb **false**; eski biçim 1/0 da okunur) maç açılırken TETİKLEYİCİYLE `duellolar.ban_acik`'a sabitlenir (her açılış yolu); null = 982 öncesi maç → eski kural (banla biter). true yapılırsa YENİ maçlarda aşağıdaki 853 akışı aynen geri gelir (kod silinmedi). `duello2_ban_baslat` / `duello2_bot_tik` (bot ban dalı) / `duello2_durum` (`ban.acik`) satırdan okur; `duello_ban_sec` ban kapalı maçta "Bu Düello'da ban yok" diye reddeder. Kilit, Baskın, Kalkan, Altın Soru, 12 puan / 4 kategori, kendi kategorisine saldırı yasağı, süreler (kategori 15 sn, soru 15 sn) aynı; tur 1'in ban açılış payı (+3 sn) ban'la birlikte kalktı. Tanıtım v14 (ban adımı yalnız bayrak açıkken). Geri alma `docs/duello-geri-alma-982.sql` (ya da yalnız bayrağı true). Test `araclar/duello-ban-kaldir-sql-testi.mjs` + `duello-puan-modu-sql-testi.mjs` (ban açık/kapalı iki akış; 982 canlı değilse `--ek-mig`).
- **Kategori çalma anı (990, yalnız sunum):** kategori el değiştirince kart eski sahibin tarafından (sen solda, rakip sağda) yeni sahibe kayar (0,82 sn), puan artışı ve "Çalınan" ikonu inişten SONRA gelir; toplam 1,8 sn, hamle anahtarlı tek sefer, faz değişse de sürer, dokunarak geçilir, hareket azaltmada kayma yok. Sonuç bandında tek güçlü cümle "{kat} rakipten sana geçti! / {kat} senden rakibe geçti" (`DuelloTahta › CalmaAni`, `hkSonucMesaji`).
- **Savunma banı (853, Ida 2 Eki 2026; 982'den beri KAPALI — aşağısı bayrak açıkken geçerli):** her normal turda saldıran seçmeden önce savunan 1 kategoriyi banlar — faz `ban` (sonuc → ban → kategori),
  süre `duello_ban_sn` (7 — 900; 1. turda +`duello_ban_ilk_tur_ek_sn` 3). Savunan (ya da bot) banlayınca faz HEMEN kategoriye geçer, süre beklenmez. Savunan kendi bir önceki savunmasındaki banı arka arkaya yineleyemez
  (`duellolar.son_ban1/2`; arada bir savunma geçince serbest), kilitli kategori banlanamaz, saldırana en az 1 kategori kalır. Banlı kategori
  (`duellolar.ban_kategori`) o tur seçilemez (`duello2_kategori_uygun_mu`); süre dolarsa ban yok; Altın Soru'da ban yok. RPC `duello_ban_sec`;
  `duello_durum › ban {acik, sure, kategori, onceki, uygun}`. Bot savunurken saldıranın en değerli hamlesini banlar (`duello2_bot_ban_kategori`).
  Kapatma: `duello_ban_acik` = 0 → eski akış aynen. Ekran: kategori kartlarının aynısı — savunan tek dokunuşla banlar, banlı kart gri + kilit +
  "Banlı" damgası (`--qt-mod-duello`). **Ban anları (2 Eki 2026, `DuelloBanAni.jsx` + `duello-ban.css`, yalnız sunum):** savunana faz girişinde
  damga + ses + titreşim, mesaj satırının yerinde kırmızı "BAN SIRASI SENDE" satırı, son 2 sn gerilim, "BANLADIN" / "BAN KULLANILMADI"; saldırana
  ~1,2 sn "RAKİP BANLADI" açıklaması → mavi "SIRA SENDE"; ilk 3 Düello'da ipucu (cihazda). Açıklama saldıranın süresinden yemez: ban fazından çıkan
  kategori fazına `duello_ban_gosterim_ms` (1200) eklenir (880, `duello2_ban_bitir`). Test: `node araclar/duello-ban-sql-testi.mjs`.
- **Soru ekranı kategori durumu (Ida, 2 Eki 2026; `DuelloTahta › hkKategoriDurumu`, yalnız sunum):** sorulan kategori AYNI renkle
  çerçevelenir — soru kartının kendisi (4 px) + kategori rozeti + yuva panelinin tamamı (3 px) + kategorinin yuvası (hafif nabız; boş kategoride yuva yok). Kırmızı = kategorin
  tehlikede (savunan), mavi = fırsat/saldırı (saldıran her durumda; savunan boş kategoride), gri = rakip pekiştiriyor. Rozetin yanında en çok
  4 kelimelik aynı renkli etiket. Uzun sonuç cümleleri soru ekranında YAZILMAZ: ilk 3 Düello'da savunan beklerken alt çubukta ipucu
  (cihazda), tanıtım (v11) ve arama ipuçları. Hareketi azalt: nabız kapalı, sabit çerçeve.
- **Altın Soru (eşitlik):** son tur sonunda yuvalar eşitse Turnuva'nın seçicisiyle (`turnuva_soru_aday`: kullanılmamış,
  önce zorluk 4–5, boşsa alt dilim; `duello_altin_soru_bul`) Altın Soru; **jokersiz** (`duello2_skill_hak_kontrol` reddeder),
  sahiplik değişmez. Yalnız biri bilirse o kazanır (`altin_kazanan`), yoksa yeni Altın Soru — sınırsız. Veride
  `uzatma` bayrağı Altın Soru demektir (iç ad korunur).
- **Kaldırıldı:** puan sistemi (666/667/671: yıldız, 1/3/6, 3-4-3, saldırana eksi, son 2 tur ×2 — 680), zayıf nokta
  kuralı, kategori kullanım sınırı, üst üste aynı kategori yasağı (666). Eski can/puan kolonları geçmiş için durur.
- **Eski ücretsiz Kategori Kalkanı KAPALI (680):** `duello2_kalkan_acik` = 0 ve `duello2_kalkan` her çağrıda reddeder;
  kolonlar (`kalkanlar1/2`, `duello_hamleler.kalkan`) geçmiş için durur. Yeni **Kalkan jokeri** ondan ayrıdır (Skill bölümü).
- **Rozetler (680):** Son Nefes = rakip eşik−1 (3) yuvadayken kazan; Büyük Geri Dönüş = bir an `rozet_geri_donus_yuva_farki`
  (2) yuva gerideyken kazan; Altın Dokunuş aynen.
- **Yeni oyuncu kilidi (666):** Düello en az `duello_acilis_mac_esigi` (5) bitmiş Klasik + Saf Bilgi maçıyla açılır
  (`matches`, terk edilen sayılmaz; level'e bağlı değil). `duello_ara` / `duello_davet_et` (iki taraf) /
  `duello_davet_cevap` sunucuda reddeder; lobi `duello_acilis_benim` ile "Düello'yu açmak için X maç daha oyna" +
  ilerleme çubuğu gösterir. Botlar muaf.
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
- **Bota rövanş anında (657, Ida — D-402):** Klasik maç sonu "Rövanş" bot rakipte (açık VE gizli) `rovans_iste` içinde aynı transaction'da
  'aktif' maç açar; kabul beklenmez (eski gizli bot 8–90 sn gecikmesi rövanşta kalktı). Geri alma `bot_rovans_anlik` = 0 (gizli bota
  gecikmeli davet). Gerçek oyuncu rövanşı istek olarak kalır. `MatchPage › ilerlemeDamgasi` 'bekliyor' maçı (aktif_soru −1) eski
  görüntü saymaz. Not: gizli botun anında kabulü bir zamanlama ipucudur — ürün kararı Ida'nındır.
- **Kopukluk + takılma (760/762, 1 Eki 2026):** oyuncu `duello_kopuk_sn` (25) nabızsız kalınca sunucu fazı dondurur, `duello_kopuk_bekleme_sn` (45) sonra terk; dondurma sırasında her ilerletme faz bitişini "şimdi + kalan (taban 3 sn)"a iter. `duello_durum` bunu `kopuk {ben_mi, bitis, faz_kalan_sn}` ile bildirir; istemci sayacı donuk gösterir (eskiden ~2 sn'de bir yeniden "3"ten başlıyordu), bantta bekleme sayılır. Durum okuması hata verirse (57014, ağ) sahne son fazda kalır, 1→2→4→8 sn geri çekilmeli yeniden deneme + "Bağlantı yeniden kuruluyor…" (faz bitişi 4 sn geçip yeni faz gelmezse de); görünür olunca / pageshow / online anında tazeler. `duello_kategorileri()` gevşek dizin taramasıyla (762). Bilinen dış risk: Supabase örneği aralıklı 20–70 sn donuyor (cron `job startup timeout`); kod bunu önleyemez. Test: `node araclar/duello-iki-oyuncu-testi.mjs` (iki gerçek bağlam, ağ kısıtı, 5 sn kopma, arka plan, uzun kopma).
- **Nabız ayrı tabloda (995/996, 8 Eki 2026):** `kalp_at`, `duello_kilitle`, `kasa_kilitle`, `gizli_bot_nabiz` → `nabiz_yaz(uid)`: her çağrı UNLOGGED `oyuncu_nabiz`'e (RLS açık, istemci hakkı yok, Realtime'da yok); `profiles.last_seen` yalnız 50 sn'de en fazla bir kez (OyuncuKarti rozeti 120 sn eşikle doğrudan onu okur). Kopukluk/çevrimiçi okuyanlar (`duello_kopuk_kim`, `kasa_kopuk_kim`, `kasa_ilerlet` savunma, `oyuncu_ara`) `greatest(oyuncu_nabiz.son_gorulme, profiles.last_seen)` kullanır — `profiles.last_seen`'e tek başına kopukluk kararı bağlanmaz. RPC adları aynı, istemci değişmedi. `cron.log_statement = off` (CLI `postgres-config`, 8 Eki 2026).
- Rövanş bekleme penceresindeki “Vazgeç”, `duello_rovans_iptal` ile sunucu
  isteğini de geri çeker; yalnız pencereyi kapatıp hayalet istek bırakmaz.
- **Tek sürüm:** bütün yeni maçlar `surum` = 2 (kurallar yerinde değişir; V3/sürüm dalı yok). Eski can maçları
  (surum 1/2, puan1 boş) yalnız geçmiş kaydıdır. Arayüz `DuelloV2.jsx` + `DuelloPage.jsx` (eski V1 ekranı silindi).
  İstemci tanımadığı bir sürüm görürse maçı çizmez, yenileme ister (`DUELLO_EN_YUKSEK_SURUM`). Joker 4 / aynı 2 / soruda 1,
  Sigorta/2X yok.
- **Ekran (680, `DuelloTahta.jsx` + `duello-tahta.css`, açık tema, `--hk-*` renkler: sen mavi / rakip kırmızı / boş gri /
  vurgu turuncu):** tek ekran, 390 ve 360 px × 640'ta kaydırmasız (`oyuncu-testi` ölçer). Üst başlık (Tur N/20 + büyük
  süre, tur noktaları) · rozet yuvaları (eşik ≥ 6: iki satır — üstte sen, altta rakip, 7 yuva; soru ekranında ince iki satır) (kategori ikonu yuvaya oturur, eşik−1'de son yuva turuncu yanıp söner, kilitli
  yuvada altın çerçeve + kilit) · 2 satırlık sabit mesaj (kural / eşik−1 uyarısı / tur sonucu + tutmama nedeni HER ZAMAN) ·
  aidiyete göre 3 grup kart ("Rakibin kategorileri · elinden al" / "Boş kategoriler · al" / "Senin kategorilerin ·
  pekiştir"; sıra Sen% − Rakip%, ↑ = ↓ eşiği `duello_kat_esik_yuzde` 10; kilitli kart soluk + "N tur kilitli") · alt
  seçim çubuğu ("tutarsa Sen 2→3, Rakip 2→1" / "Kazanırsın!" + Elinden al / Al / Pekiştir). Savunan: saldıranın dokunduğu
  kart kesikli turuncu çerçeveyle canlı parlar (realtime broadcast `dokunus`, DB'ye yazılmaz) ve sıradaki saldırısı için
  kart işaretler ("Hazır", istemcide; sıra gelince seçili gelir). Seçim ekranı (960, `DuelloSecim.jsx` + `duello-secim.css`): başlıkta SEÇİM + 5 sn halka (son 2 sn gerilim) + 10 seçim noktası (yılan, mavi/kırmızı),
  konsol SENİN SIRAN / RAKİP SEÇİYOR + "Sen x/5 · Rakip y/5" (+ "sonra yine sen"), 10 kart 2×5 (Sen %X / Rakip %Y güç çubukları, güçlü tarafın
  yüzdesi dolu rozet, verisiz "Yeni"), tek dokunuş seçer; seçilen kartın ikonu seçenin yuvasına uçar (WAAPI, 460 ms, iniş parıltısı), kart
  yerinde soluk "Aldın / Rakip aldı"; "Otomatik seçildi"; seçim bitince HÂKİMİYET BAŞLIYOR (2,1 sn); ilk 3 Düello ipucu; hareket azaltmada uçuş yok.
  Maç sonu: nakavtta "Hâkimiyet zaferi! 7 yuva doldu",
  son turda "3-2 önde, kazandın" / "geride, kaybettin" / eşit → Altın Soru; skor = yuva. Oyunda "fetih" kelimesi geçmez.
- **Bot (681):** hedef değeri = bot isabeti × (1 − rakip oranı); pekiştir × `duello_bot_pekistir_agirlik` (0.5);
  `duello_bot_hamle_en_iyi_yuzde` (70) en iyi, kalanı rastgele başka uygun; bot eşik−1'deyse nakavt için boş/rakip
  kategorisine, rakip eşik−1'deyse rakibin kategorisine öncelik; kilitliyi seçmez. Cevap gecikmesi ve joker davranışı
  aynen (Baskın/Kalkan kullanmaz).

### Turnuva

- Günde 5 seans, TSİ: **10:00 · 14:00 · 18:00 · 20:00 · 24:00** (24:00 = ertesi gün 00:00)
- Tek kaynak `oyun_ayarlari.turnuva_saatleri`; kod varsayılanı aynı liste
  (`oyun/lib/zaman.js › VARSAYILAN_LISTE`). Eski `turnuva_saat_sabah` /
  `turnuva_saat_aksam` satırları veritabanında DURUR ama okunmaz. Silinmez.
- Dakikalık zamanlayıcı (`turnuva_zamanlayici_tik`) listeyi `turnuva_saatleri_listesi()` ile okur.
  Lobi başlangıçtan `turnuva_lobi_acilis_dk` (120) önce "açık" sayılır: botlar dolar, ana sayfa
  şeridi nabız atar. Hatırlatma push'u 14:00 ve 20:00 seanslarından 45 dk önce (günde 2).
- **Saat gösterimi (26 Eyl 2026):** turnuva anı hep TSİ'de sabit; yalnız GÖSTERİM cihaz saat dilimine çevrilir.
  Arayüz dili TR ya da profil ülkesi TR (ya da cihaz zaten TSİ'de) → eskisi gibi yalnız TSİ; başkası → yerel saat + "(TSİ …)".
  Tek hesap `lib/zaman.js › turnuvaSaatiGoster / turnuvaSaatleriniGoster`; turnuva saatinin yazıldığı her yer bunu kullanır.
- Turnuva önemli etkinliktir: ana sayfa oyuncuyu katılmaya iter (avatar kartı altındaki şerit).

### Lig

- 5 kademe: Bronz → Gümüş → Altın → Elmas → Efsane.
- 25 kişilik gruplar. Grup = yalnız sıralama tablosu, eşleşmeyle ilgisi yok. **Tek tanım (750, 1 Eki 2026):** gerçek grup = `grup_no >= 1`; doluluk (`lig_uyeligim_kur`), gösterilen `grup_boyu`, `sira` ve kapanış AYNI kümeyi (açık bot hariç grup üyeleri) sayar; kurulumu bitmemiş / `lig_gizli` hesaplar **grup 0 (bekleme)**: hiçbir grubu şişirmez, sıraya/ödüle/terfiye girmez, kurulumu bitirince bir sonraki `lig_uyeligim_kur`'da yeri olan gruba alınır. Haftalık karma aynı kural; `lig_gruplari_dengele` (istemciye kapalı) taşanı dağıtır.
  İlk 5 yükselir, son 5 düşer. Pazartesi 00:00 (TSİ) sıfırlanır.
- Eşleşme kendi ligi ± 1 lig ile sınırlıdır.
- **Lig sayfası:** ⓘ "Lig kuralları" penceresi (yükselme/düşme sayıları `lig_grubum`'dan, haftalık coin `lig_odul_<lig>_<1-3>` + elmas
  `elmas_lig_1-3`, pasiflik düşmesi `lig_pasif_dusme_hafta` — hepsi `oyun_ayarlari`'ndan). Pankart çubuğu tek ölçüdür: yükselme
  hattına yakınlık (Efsane'de düşme hattına uzaklık); ölçek gerçek grup boyudur (`grup_boyu`; sıra da gerçek — aşağıya bak).
- **Gösterilen sıra = gerçek sıra (661, Ida 26 Eyl):** `lig_grubum` sırayı grubun TÜM üyeleri arasında (haftalık kapanışla birebir: `puan_hafta`, `puan`, ad, id) hesaplar, görünürlüğü sonra süzer; gizli üyeler satır olarak görünmez ama numarada boşluk bırakır (1,2,…,11,13,16). Yükselme/düşme bölgesi ve çizgileri bu sıraya göre.
- Misafir (anonim) hesap ligde ancak `lig_misafir_min_mac` (5) maçtan sonra
  görünür; oyuncu kendi satırını her zaman görür. Hesap silinmez.
- **Toplam oyuncu sayısı hiçbir yerde gösterilmez.**
- **Şehir Şampiyonu (641, arka plan; görünüm Görsel Paket 2'de):** kapanan haftayı şehrinde 1. bitiren sonraki hafta
  boyunca o şehrin şampiyonudur (TEK kaynak `lig_arsiv.sehir_sampiyonu`, aktif = `hafta_basi() − 7`; profilde alan yok).
  Şehir sırası canlı listeyle birebir: haftalık puan → toplam puan → ad → id; gizli botlar da arşive girer ve gerekirse
  şampiyon olur (listede 1. görünen = şampiyon). Şart: şehirde puanı > 0 en az 3 görünür oyuncu + 1.'nin o hafta ≥ 1
  galibiyeti (`sehir_sampiyonu_min_*`). Kalıcı rozet `lig_sehir_sampiyonu` (coin yok); eski `sehir_krali` verilmez.
  Veri: `oyuncu_kartlari.sehir_sampiyonu`, `sehir_sampiyonu()`. Şampiyona bildirim gider (`sehir_sampiyonu_bildirim_acik` = 1, 643).
- **Ülke + Dünya Şampiyonu (647):** aynı desen, kaynak `lig_arsiv.ulke_sampiyonu` / `dunya_sampiyonu` (aktif = `hafta_basi() − 7`).
  Asgari oyuncu/galibiyet şartı YOK; gizli botlar şampiyon olabilir. Şampiyonluk `sira_ulke`/`sira_global`'den DEĞİL,
  `lig_kapanis_havuzu()`'nda yalnız `gorunur` satırlar arasında yeniden hesaplanır (arşiv sırası gizli hesapları da sayar).
  Rozetler `lig_ulke_sampiyonu` / `lig_dunya_sampiyonu` (elmas kademe, coin yok → Koleksiyon Puanı'nda efsanevi); bildirim açık
  (`ulke_/dunya_sampiyonu_bildirim_acik` = 1). Unvan önceliği: dünya > ülke > şehir > takılı; ülke adı `ulkeler.ad` Türkçe kalır, EN arayüzde istemcide çevrilir (`konum.js › ulkeAdiCevir/bildirimMetni`, Intl.DisplayNames; şehir adı çevrilmez; sunucu PUSH gövdesi çevrilemez — açık konu).
  Veri: `oyuncu_kartlari.unvan` (`tur` dunya/ulke), `unvanlarim()`, `ulke_dunya_sampiyonu()`.
- **Konum:** şehir her ülkede listeden (aranabilir; `sehirler`: 81 il + GeoNames CC BY 4.0 100.000+ şehirler, 86 ülke).
  Günde en fazla 1 değişiklik; şehri olan oyuncu o hafta puan kazandıysa yeni haftayı bekler; ilk seçim serbest.

### Sosyal

- **Oyuncular sadece arkadaşlarıyla da oynayabilir** — biri bu oyunu
  yalnızca arkadaşlarıyla maç yapmak için oynuyor olabilir. Arkadaşlar alt
  sekmeden kaldırılmaz, hiçbir limit onu cezalandırmaz.
- "Ezeli rakip" istatistiği yalnız arkadaşlar için tutulur.
- **Mesajlaşma güvenliği (620/621, Google Play UGC + KVKK; kurallar SUNUCUDA):** özel mesaj yalnız kabul edilmiş
  arkadaşa (`dm_gonder`); ilk mesajdan önce Kullanım Koşulları kabulü (`profiles.kosullar_kabul_at`). **Engelleme**
  (`engellemeler`, `oyuncu_engelle` / `engel_kaldir` / `engellediklerim`): engelli çift arasında mesaj, arkadaşlık,
  meydan okuma/rövanş, grup ve Düello daveti, maç içi mesaj **tablo tetikleyicileriyle** reddedilir, tepki kanalı
  kapanır; arkadaşlık ve bekleyen davetler biter; gizli botlar etkilenmez; rastgele eşleşme kapsam dışı. **Şikâyet**
  (`sikayet_et`: günde aynı kişiye 1, mesaj metni kopyalanır) + `/yonetim/sikayetler` (yalnız `yonetici_mi` =
  sahip ∪ `yonetici_kullanicilar`): incelendi · mesajlaşmayı kapat (`mesaj_kapali`) · askıya al (`askida`: iletişim
  kapanır) · geri al. **Küfür filtresi** `yasakli_kelimeler` (kapsam hepsi/ad, eşleşme tam/önek) + `izinli_kelimeler`
  (tam/önek) — koda gömülü liste yok; mesajda `***`, takma adda red; ı katlanmaz ("sıkıldım" masum) ama tamamı BÜYÜK kelimede I ayrıca i okunur
  (653: SIKTIR/IBNE yakalanır; SIK, SIKIK, SIKILDIM masum kalır); gönderenin dili `en` ise çıplak "pic" maskelenmez
  (`kufur_maskele_dil`; TR hesapta maskeli). Test: `node araclar/kufur-filtre-testi.mjs`. Hesap silinince mesajlar, engellemeler
  ve açtığı şikâyetler silinir; hakkındaki şikâyetler kanıt olarak **1 yıl** kalır (630: `sikayet_saklama_gun` 365,
  günlük iş `bildim-sikayet-saklama`; Gizlilik'te yazılı). **Rastgele eşleşmede** (Klasik, Düello, Grup) birbirini
  engellemiş iki oyuncu eşleşmez (630).
- Aynı çift aynı gün: 1-5. maç tam ödül, 6-10. %50, 11+ ödülsüz. Aynı
  cihaz/IP'den iki hesap arasında sıralı maç hiç ödül vermez.

---

## Skill ve Ekonomi

### Skill sistemi

Oyuncuya görünen ad **"Joker"** (TR + EN; Ida, 24 Eyl 2026 — "Skill" kalktı). Kodda/DB'de
`skill_*` ve `joker_*` iç adları **bilerek korunur** — yeniden adlandırılmaz. Anahtarı hâlâ
"skill" geçen metinler `dil.js › jokerAdi()` ile çıkışta Joker olur. Tek kayıt kaynağı
`oyun/lib/jokerler.js`. Jokerler **yalnız coin'le** alınır (test fiyatları: Ek Süre 20 · Soru
Değiştir 30 · Zaman Baskısı 30 · Sigorta 40 · 2X 50 · 50:50 60 · İkinci Şans 60 · Kalkan 50 · Baskın 70).

Aktif dokuz maç skill'i vardır (Baskın ve Kalkan 680'de eklendi, yalnız Düello):

| id | Ad | Mod | Davranış |
|---|---|---|---|
| `elli` | 50:50 | Klasik · Grup · Turnuva · Düello · Kasa | iki yanlış şıkkı eler |
| `sure` | Ek Süre | Klasik · Grup · Turnuva · Düello · Kasa | kişisel cevap süresini uzatır |
| `soru_degistir` | Soru Değiştir | Klasik · Grup · Düello | aynı kategoriden kendi sorusunu değiştirir |
| `zaman_baskisi` | Zaman Baskısı | Klasik · Düello · Kasa | rakibin süresini kısaltır |
| `sigorta` | Sigorta | yalnız Klasik | yanlışta 5; doğruda normal 10 |
| `cifte_puan` | 2X | yalnız Klasik | doğruda 20; yanlışta 0 |
| `ikinci_sans` | İkinci Şans | Klasik · Düello · Kasa | ilk yanlışta aynı sayaçla bir ikinci cevap |
| `baskin` | Baskın | yalnız Düello | saldıran, soru ekranında: bu hamlede savunanın cevabı sayılmaz; saldıran doğruysa hamle tutar |
| `kalkan` | Kalkan | yalnız Düello | savunan, yalnız kendi kategorisine saldırılırken: hamle tutmaz |

- **Baskın / Kalkan (680):** her biri maçta 1 kez (`duello_rol_joker_mac_hak`), Düello 4 / aynı 2 / soruda 1 sınırları içinde; Düello joker setine (3 yuva) seçilir, Klasik sete giremez. Oyuncuya yalnız kendi rolünün jokeri görünür (`hakimiyet.rol_joker`). Basılan joker tur sonuna kadar rakibe gizli (Soru Değiştir kilidine de yansımaz); ikisi aynı hamlede → birbirini götürür, ikisi de harcanır, hamle normal kurala göre. Kural `duello2_skill_hak_kontrol`, etkisi `duello2_cozumle`. Fiyat `coin_joker_baskin` / `coin_joker_kalkan`. Semboller GEÇİCİ (Ida ikonları sonra seçecek); rozet renkleri `--qt-skill-baskin` (turuncu) / `--qt-skill-kalkan` (limon yeşili).

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
- **Seri Koruma kaldırıldı** (910, Ida kararı 2 Eki 2026): seri kaçırılan günde koşulsuz sıfırlanır; koruma verilmez,
  satılmaz, harcanmaz. `joker_envanter`'deki eski `seri_koruma` satırları ve `seri_koruma_3` paketi (pasif) durur, kullanılmaz.
- **Dükkân › Joker sekmesi moda göre** (2 Eki 2026): üstte "Klasik | Düello" seçici (`?mod=klasik|duello`); seçili modda
  çalışan jokerler Ortak + Yalnız o mod bölümlerinde. Mod verisi tek kaynaktan: `jokerler.js › SKILL_TANIMLARI.allowedModes`.
- **Joker paketleri moda göre** (910): `klasik_30` / `klasik_100` / `duello_30` / `duello_100`; eski karışık `joker_10/30/100`
  pasif (silinmedi). Paketin modu içeriğinden okunur (`paketDukkanModlari`), ayrı sütun yok. Fiyat = tek fiyatlar toplamı ×
  10'lu paket oranı (0,85), 5'e aşağı yuvarlanır ve `coin_fiyat`'a SABİT yazılır — **tek fiyat değişirse paket fiyatı yeni bir
  migration'la yeniden hesaplanır.** Prova: `node araclar/joker-moda-gore-sql-testi.mjs`.
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
  L^1,5. Level ödülü 20 coin; her 5 levelde 1 rastgele aktif skill hakkı; Lv 3/10/15/25/35/50'de Nadir avatar (1039); rütbe
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
  (2 sn) içinde. Klasik, Saf Bilgi, Düello ve Grup araması; ada dokununca oyuncu kartı.
- **Maç şeridinde ülke bayrağı (26 Eyl 2026):** oyuncu adının altındaki "Lv · lig" satırının başında (`SeviyeEtiketi` › `Bayrak`);
  kaynak `profiles.ulke` (gizli botlar dahil aynı alan, `lib/oyuncuSeviye.js` toplu sorgu + önbellek); ülke yoksa bayrak çizilmez.
  Klasik ve Düello'da iki oyuncu, Turnuva/Grup'ta kendi şeridin.
- **Maç ekranları gök mavisi** (`.qt-sahne-gok`; koyu mor sahne yok): Hazır mısın?, Düello, Çalışma, bekleme, terk hâlleri.
  Soru açıkken sayfa 100dvh sütun, kaydırmasız; joker + tepki hep görünür. Çok kısa alan (≤ 600 px yükseklik, ≈ iPhone Safari 375×553; Klasik/Grup/Turnuva `m1-mac.css`, Düello `DuelloPage.a.css`): kart 84 px'e iner, Sesli sohbet + tepki tek satır, joker hak yazısı gizli, Düello kategori fazı sıkışır — dört şık, joker çubuğu ve ≥ 3 kategori satırı ilk ekranda (ölçüm: gerçek 2–3 hesapla, `elementFromPoint`). Tek ekran düzeni masaüstünde de KISA pencerede (yükseklik ≤ 960 px, genişlikten bağımsız) çalışır — maç sayfası dikey taşmaz (1024×768 ölçüldü; Klasik/Grup/Turnuva `m1-mac.css`, Düello `DuelloPage.a.css`). Baykuş maskot oyundan tamamen çıktı (giriş: avatar üçlüsü, diğerleri ikon diski); Düello VS ~1,5 sn.
- **Hata kurtarma:** `HataSiniri` Layout'ta rota içeriğini sarar (alt menü kalır), `tembelYukle` (1 yeniden deneme),
  vite:preloadError'da bir kez yenile, "Bağlantı yok" şeridi. Dükkân alımları onay penceresiyle (`JokerSatinAlModal`);
  misafir çıkışında uyarı (`CikisOnayi`); ağ hatası metni tek yerden (`hataMesaji`) ve hata TÜRÜNE göre ayrışır (`hata.js › hataTuru`: çevrimdışı / zaman aşımı / sunucu / sunucuya ulaşılamıyor; "İnternetini kontrol et" her hatada yazılmaz).
  **Soğuk açılış (7 Eki 2026):** ilk çizim cihazdaki supabase oturumu + son profil kaydıyla (`AuthContext`, `qt_profil_onbellek`;
  yenileme/profilim arka planda, başarısız yenilemede giriş ekranı); ana CSS `<head>`de `preload` (çizimi engellemez — başlatıcı
  yüklerken bekler); Meydan + Klasik maç tembel, ama stilleri `BildimApp.jsx`'te eski sırasıyla ana pakette (tembel parçaya
  geçen CSS global stillerin arkasına düşer, görünüm değişir). Ölçüm: `araclar/yukleme-suresi-olcum.mjs [--profil-onbellek]`.
  **Meydan okuma kabulü:** davet eden başka maçın içinde değilse `meydan_kabul`/`duello_kabul` bildirimiyle doğrudan maça geçer (`BildirimToast`); kaçırılırsa Arkadaşlar satırında "Maç başladı · Maça gir".
- **Ana sayfa "devam eden maçın var" kartı (28 Eyl 2026, `useDevamEdenMaclar` + `DevamEdenMaclarKarti`):**
  ana sayfa açılır açılmaz (Oyna'ya basmadan), bütün modlarda (Klasik/Saf Bilgi, Düello, Grup, Turnuva)
  aktif maçı olan oyuncuya "Oyna" sütununun en üstünde kart(lar) gösterir; "Devam et" ilgili maç
  sayfasına götürür. Ayrı bir mekanizmadır, yalnız "Oyna"ya basınca soran `YarimMac.jsx`
  pop-up'ının (Klasik) yerini almaz.
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
- **Görsel revizyon oyunda (Ida seçimleri 25 Eyl 2026, tasarim/SECIMLER_GORSEL_REVIZYON.md; stil rehberi `/stil-rehberi`):**
  lig çerçeveleri Set A "Defne ve Taç" (Altın = onaylı WebGL Altın Lig), level Set A "Altıgen Madalya", Turnuva Şampiyonu
  "Kupa Tepesi" (`tasarim/kazanilan/`, tembel; ≤ 48 px siluetleri kutudan taşmaz), lig amblemi "Fasetli Yıldız"
  (`premium/ligAmblemi.jsx`; ana pakette çizim kodu yok: `public/lig-amblem/*.svg` <img>, hareketli hâl tembel parça; üretici `araclar/lig-amblem/uret.mjs`), rozetler "Madalyon" (`tasarim/rozet/`: amblem × seviye + eşik rakamı), premium hizalama
  (`premium/hizalama.js`), tek oyuncu kartı "Vitrin kartı" (`OyuncuVitrinKarti`: profil başı + oyuncu kartı penceresi;
  küçük hâli lig satırı, VS, maç şeridi ≥ 420 px). Coin/elmas, logo, joker, nadirlik (Nadir yeşil · Epik mor) bulutta.
  Adaylar `/gorsel-revizyon` sayfasında durur; çizim kaynağı oradaki `cizim/` dosyaları (tek kaynak).
- **Unvan (643):** isim altında Kurdele. 12 unvan: 8'i rozete bağlı (türetilir), 4'ü lig olayı (haftalık kapanış). Aktif Dünya >
  Ülke > Şehir Şampiyonluğu (647) takılı unvanın önüne geçer. Seçim Profil › Koleksiyon › Unvanlar. Sezon unvanları Battle Pass sezon sistemi gelene kadar gizli (bağlı değil). "Bin Galibiyet" (644): Antrenman hariç Klasik + Düello + Grup + Turnuva toplam galibiyet ≥ 1.000 (`unvan_galibiyet_esik`); `unvanlarim()` ve haftalık kapanış kontrol eder. Bronz Lig çerçevesi (`lig_bronz`) katalogda; bütün insan oyuncular kazanır (takılı çerçeve değişmez).
  **Çerçevesiz oyuncu YOK (1049, Ida 10 Eki 2026):** `oyuncu_kartlari` takılı aktif çerçeve yoksa `lig_<lig>` (lig yoksa `lig_bronz`) + o çerçevenin
  nadirliğini döndürür — gizli botlar dahil herkes; takılı başka çerçeve (level/turnuva/premium/eski lig) aynen kalır. Yalnız görünüm: sahiplik,
  `takili_cerceve`, Koleksiyon Puanı değişmez. `lig_grubum_ozet` kartı okur; `davet_durumum.cerceve` aynı kurala bağlı.
- **Rozetler (331–333, 641):** 102 rozet (`rozet_tanimlari`: level, Klasik/Düello galibiyet, seri, 10
  kategori × 4 ustalık, turnuva, lig, özel an, sosyal, 5 gizli), kazanma sunucuda olay anında; coin
  bronz 10 · gümüş 25 · altın 50 · elmas 100 (günlük tavana sayılmaz). Geriye dönük verilenler
  coin'siz (`geriye_donuk`). Vitrin `profiles.vitrin_rozetleri` (en çok 3). Level 25/50/75/100
  rozeti level çerçevesini de verir. Sözleşme `docs/SOZLESME_ROZET_CERCEVE.md`.
- **Kozmetik katmanları (481, Ida):** **çerçeve** = kazanılan prestij, **asla satılmaz** (lig, level,
  turnuva şampiyonu, etkinlik — Yılbaşı, Ramazan Bayramı); dükkânda görünmez, Profil › Koleksiyon'da
  (kilitliler "nasıl kazanılır"la). **Arka Plan** (kod adı: `aura`; oyuncuya görünen ad — ekranda "aura" kelimesi geçmez, Ida 24 Eyl. Açıklama: "Arka Plan — avatarının arkasındaki hareketli sahne") = satılık tarz, avatarın arkasındaki tema katmanı; eski 12
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
  **Yeni avatarlar (katalog 39, oyunda 31 — Ida kararı, 649):** `avatar_katalogu` 27 (13 günlük + 14 kostümlü) + 12 yeni; KAPALI 8: Veteriner, Öğrenci, Sakallı, Kedili Genç, Fitness Kraliçesi, Demir Pazı, Kaslı Şampiyon, Android (`onay = girmesin`, `aktif = false`); çizim `AvatarProIllustrations2.jsx`,
  `public/avatars/pro2/`; açık olanlar herkese ÜCRETSİZ: profil, kurulum, Dükkân › Avatar ve Koleksiyon'da seçilir
  (`avatar_katalogu.aktif` yeter; `/avatar-onizleme` onayı bu karar için bakılmaz).
  (550 dalda `bulut/kozmetik-aktivasyon` — canlıya uygulanınca geçerli; bkz. `docs/KOZMETIK_AKTIVASYON.md`.)
- **Premium kozmetik (560, dal `bulut/premium-aktivasyon` — uygulanınca geçerli):** `kozmetikler` türleri
  `premium_cerceve` (Sonbahar, Galaksi, Sakura; 500 elmas) ve `premium_aura` (yaprak, kar, köz, gece, kuzey, su altı;
  300 elmas; avatarın İÇ zemini) — ayar `elmas_premium_cerceve/aura`, `kozmetik_satis_acik` kuralı, sahip test modu,
  gizli bot takmaz, `kozmetik_ver` (etkinlik ödülü). Çizim `oyun/tasarim/premium/` (tembel), `CerceveliAvatar` karttaki
  `premium_cerceve/premium_aura`'yı çizer (2. tur: pc_alev2/simsek2/kraliyet2 570, pc_ejderha2 580); hareket yalnız profil/lobi/VS/maç sonu, ≤48 px durağan. Lig amblemi
  (`ligAmblemi.jsx`) oyuncu adının yanında her yerde. Eski dükkân auraları pasif.
- **Avatar Prestij (1049 canlıda, Ida 10 Eki 2026):** sahip olunan (ücretsiz dahil) avatar coin'le BİR KEZ geliştirilir — tek kademe, ikinci yok.
  Efekt yalnız avatar fotoğrafının İÇİNDE ara ara çakan 4 köşeli beyaz yıldızlar (Ida onaylı CSS birebir, `src/styles.css › .av-parla`; halka/rozet/çerçeve
  değişmez; hareketi azaltta kapalı); HER YERDE, her boyutta, herkes görür (Düello dahil — "Düello'da efekt yok" kuralı bunu kapsamaz). Yalnız ekrandaki
  avatarda katman açık (`src/lib/parlaGozcu.js`, tek IntersectionObserver; 100 satırda kaydırma ölçüldü). Ayar `avatar_prestij_fiyat` **2500** coin ·
  `avatar_prestij_acik` true. Veri `oyuncu_avatar_prestij` (RLS: yalnız kendi satırı okunur), RPC `avatar_prestij_al` (yalnız authenticated; FOR UPDATE +
  `coin_harca`, defter tür `avatar_prestij`; hatalar kapali/sahip_degil/zaten_alindi/coin_yetersiz), `oyuncu_kartlari.avatar_prestij` (takılı avatar;
  gizli botta false). Koleksiyon Puanı: her prestijli avatar ayrı kalem, ağırlık nadir. Arayüz Dükkân › Avatar › Prestij + Koleksiyon "Prestij" etiketi.
  Testler `araclar/avatar-prestij-canli-testi.mjs` (tek seferlik, test hesabını siler) · `araclar/avatar-prestij-ekran.mjs`.
- **Avatar edinme = ilerleme (1039 canlıda, Ida 9 Eki 2026; 820–822'nin üstüne):** her avatarın TEK edinme yolu var, tek kaynak
  `avatar_nitelikleri.edinme` (+ `edinme_level`, `edinme_sezon_seviye`): Yaygın 21 `ucretsiz` · Nadir 6 `level` (Lv 3 Kedili Kız · 10 Viking ·
  15 Dedektif · 25 Şövalye · 35 Büyücü · 50 Kral; `xp_ver` level döngüsünde iç `level_avatar_ver` verir) · Nadir 2 `sezon` (Sezon Yolu
  ÜCRETSİZ kol 10 Kovboy · 24 Korkuluk) · Nadir 9 `coin` (Dükkân, `coin_avatar_nadir` **750**, TEST) · Epik 20 / Efsanevi 10 `elmas`
  (**150 / 300**, `elmas_avatar_<nadirlik>`, TEST). **Epik/Efsanevi level'dan ve ücretsiz koldan ASLA verilmez** (kısıt `avatar_nitelikleri_edinme_veri_check`).
  Zaten sahip olunan level avatarı → `level_avatar_sahipse_coin` 200, Sezon Yolu avatar ödülü (iki kol) → `bp_avatar_sahipse_coin` 200 coin (tavan dışı).
  Sahiplik isteyen avatarı seçmek SAHİPLİK ister (`avatar_onayla`; **sahip hesaba ayrıcalık yok**; botlar muaf). Sahiplik `oyuncu_avatarlari`
  (kaynak dukkan | etkinlik | hediye | level), satın alma `avatar_satin_al` (coin ve elmas dalı; FOR UPDATE, `coin_harca`/`elmas_harca`, çift alım reddi,
  kapı `kozmetik_satis_acik`), istemci durumu `avatar_sahiplik_durumu()` (+ edinme, edinme_level, edinme_sezon_seviye, bp_ucretli_seviye).
  Kilitli avatara dokununca bütün ızgaralarda AYNI kısa kart (`components/AvatarEdinme.jsx`: "Lv 25'te açılır · sen Lv 12" / "Sezon Yolu · Ücretsiz kol ·
  Seviye 10" / "750 coin · Al" / "150 elmas · Al" + "ya da Sezon Yolu · Seviye 19"); köşede edinme işareti (Lv · bayrak · coin · elmas). Profil level
  alanında sıradaki 3 level ödülü (`LevelOdulleri`), maç sonu level atlamada avatar (`level_kazancim.avatarlar`). Koleksiyon Puanı avatarı
  `avatar_nitelikleri` nadirliğiyle sayar. Geri alma `docs/avatar-edinme-1039-geri-al.sql`; test `araclar/avatar-edinme-1039-sql-testi.mjs` (ROLLBACK) ·
  ekran `araclar/avatar-edinme-ekran.mjs` (taklit). Geçişte takılı avatarı kilitlenen insan hesaba `hediye`, eşiği geçmiş level'a `level` sahipliği.
  Arka plan: `kozmetikler.dukkan_nadirlik` (Yıldızlı Gece nadir · Sonbahar, Su Altı, Yağan Kar epik; Yaygın yok) → fiyat
  `elmas_arka_plan_<nadirlik>` **Nadir 100 · Epik 200 · Efsanevi 300**; `kozmetikler.nadirlik` (Koleksiyon Puanı, hepsi efsanevi) AYRI ve değişmedi.
  Arka plan takılı değilse **lig arka planı**: `arka-plan/kayit.jsx` › `lig_<lig>` satırı — **çizimleri henüz yok**, o yüzden kart düz kalır.
  Arka plan satışı testi: `node araclar/avatar-arkaplan-satis-sql-testi.mjs` (ROLLBACK) · ekran `node araclar/avatar-satis-ekran.mjs` (RPC taklitli).
- **Cevap İmzası (1040 canlıda, Ida 10 Eki 2026):** doğru cevapta doğru şıkkın üstünde ~0,8–1,3 sn oynayan kişisel efekt; YALNIZ sahibi görür
  (sunucuya/Realtime'a bir şey gitmez; takılı `profiles.takili_cevap_imzasi` authenticated'a açık değil, `oyuncu_kartlari`'nda yok; istemci
  `profilim()`'den okur — `lib/cevapImzasi.js › useTakiliImza`). Yeni ses / pay-to-win / hareketi azalt sürümü yok. 5 ürün (`kozmetikler.tur = 'cevap_imzasi'`):
  Neon Tik · Yıldız Patlaması (Nadir, **coin** `coin_cevap_imzasi_nadir` 750) · Bilgi Ampulü · Elektrik Akımı (Epik, elmas `elmas_cevap_imzasi_epik` 150) ·
  Yanan Kart (Efsanevi, elmas `elmas_cevap_imzasi_efsanevi` 300) — fiyatlar TEST; para `icerik.para`. `kozmetik_satin_al` coin dalı (1039 deseni).
  **Satış kapısı `cevap_imzasi_satis_acik` = true** (canlı DB, 10 Eki 2026, Ida onayı) → Dükkân › Efekt herkese açık; false yapılırsa yalnız sahip hesap görür (test modu);
  Görsel kaynak `docs/cevap-imzasi-referans.txt` (maket birebir; Yanan Kart ızgara adımı 2 → 3 px, ImageData ile çizim —
  performans, görünüm aynı). Ortak bileşen `components/CevapImzasi.jsx`: QuestionCard (Klasik/Saf Bilgi/Grup/Turnuva/Hatalarım), KasaPage (Savunma dahil),
  **Düello v4'te OYNAMAZ** (Ida, 10 Eki 2026: v4 sonuç penceresinde güzel durmuyor; Duello4Arena'dan kaldırıldı). Dükkân kartında demo (`DukkanCevapImzasi.jsx`), Koleksiyon grubu. Zafer Efekti satışa açılmaz.
  Geri alma `docs/cevap-imzasi-1040-geri-al.sql`; testler `araclar/cevap-imzasi-sql-testi.mjs` (ROLLBACK) · `araclar/cevap-imzasi-ekran.mjs` (taklit).
- **Kart arka planı (30 Eyl 2026, Ida onayı):** `premium_aura` (Arka Plan) artık avatarın ARKASINDA değil oyuncu KARTININ arkasında çizilir
  (`CerceveliAvatar` `premiumAura`'yı yok sayar; eski çizim `premium/sanatAuralar.jsx` durur). Yer: ana sayfa kompakt kart (hareketli), profil vitrin kartı
  (hareketli), maç başı VS kartları (`VsKarti`, herkes kendi arka planıyla; Düello dahil), lig sayfasında yalnız kendi satırım (sabit), dükkân/koleksiyon
  önizlemesi (örnek kart). Kod `oyun/tasarim/arka-plan/`: `kayit.jsx` › `KAYIT` (sanat anahtarı → bileşen; YENİ ARKA PLAN = TEK SATIR + kalemi `aktif=true`),
  `KartArkaPlan.jsx` (Su Altı, Yağan Kar, Sonbahar) + `YildizliGeceArkaPlan.jsx`. Kaydı olmayan arka plan → düz kart. **Dört arka plan oyunda açık** (Yıldızlı Gece: migration 710, 30 Eyl 2026).
  **Yükselen Köz ve Kuzey Işıkları girmez** (Ida, 30 Eyl 2026): dosyalar durur, `KAYIT`'ta yorumda, dükkânda kapalı (migration 690, `aktif=false`).
  **YENİ mod (`tamGorunur`) oyunda HERKES için varsayılan** (Ida onayı, 30 Eyl 2026; `tamGorunur={false}` eski modu verir, önizlemedeki Yeni/Eski anahtarı bunu kullanır):
  parçacıklar yazının/avatarın/çerçevenin ARKASINDA, okunabilirlik alanı ve maske yok, yazıya ince koyu gölge (`arka-plan-tam.css`); kar/yaprak yalnız aşağı iner, baloncuklar karışık, Gece 45 yıldız.
  **Performans/dükkân (1 Eki 2026):** maliyet animasyon sayısıyla doğrusal → en küçük baloncuk/kar noktasında sallanma yok; ADAPTİF KALİTE (`KartArkaPlan › kaliteOlc`: kare süresi >22,5 ms ise parçacıkların %67'si, ≥30 ms ise %33'ü, `.abp[data-kalite]`, oturum boyu). Dükkân/Koleksiyon örnek kartları `grup="dukkan"`: en çok 2 kart TAM oynar (büyük önizleme önce), kalanı hafif; hareketi azalt/pil düşükte de yumuşak oynar (genel 3 kart sınırı orada kartları donduruyordu).
  Kalıcı durgunlukta (hareketi azalt, pil düşük, 3 hareketli kart sınırı aşıldı, hareketsiz kart, lig satırı; sekme gizliyken değil) → ayrı çizilmiş özel sabit kompozisyon (`sabit-tasarim.jsx`: `kart` ~100 px yatay · `serit` lig satırı · `dikey` profil/maç başı ortalı kartlar).
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
- **Dükkân sade (2 Eki 2026, Ida; migration 920 canlıda):** sekmeler — **Elmas · Joker · Avatar · Efekt** (Çerçeve sekmesi `ozellikBayraklari.js › DUKKAN_PREMIUM_CERCEVE_ACIK` ile kapalı;
  Efekt yalnız katalogda Cevap İmzası varken görünür — 1040); açılış sekmesi Joker.
  Tek kural ekranda yazar (kural şeridi): **jokerler, Nadir avatar ve imzalar coin'le, öteki kozmetikler elmasla** (1039/1040). Çerçeve = premium hareketli çerçeveler; Avatar ve İsim =
  bütün avatarlar (coin'li Nadir + elmaslı Epik/Efsanevi satılır, level/Sezon Yolu avatarları edinme işaretiyle kilitli görünür; 1039) + Altın isim. Satılan kozmetik türleri tek kaynak `kozmetik.js › DUKKAN_TURLERI`. **Satılmayanlar:** VS kartı,
  zafer efekti, tepki paketi (`kozmetikler.satis_pasif = true`; satır/sahiplik/takılı kayıt durur, sahibi Koleksiyon'da görür; geri açmak
  `satis_pasif = false`), Kıyafet (gardırop dondurulmuş) ve Arka Plan (dondurulmuş) sekmeleri. **Tepki paketleri Battle Pass ödülüdür** (Sezon 1:
  Eğlence seviye 3, Rekabet seviye 12 — ikisi de ücretli kolda; ücretsiz kola taşıma kararı açık). **Coin sekmesi yok** (ürün satmıyordu);
  "Coin nasıl kazanılır?" notu ve ödüllü video Joker sekmesinin altında.
- **Rakamları koda gömme.** Yayından sonra SQL ile değiştirilebilmeli.

- **Satın alma güvenliği (304–306):** coin satın alımları `coin_satin_alma_defteri`'ne yazılır;
  Play jetonu ve orderId hesaptan bağımsız tekil (ilk işleyen hesap sahibi; TWA
  obfuscatedAccountId desteklemiyor). Tüketim sunucuda (`satin_alma_dogrula` →
  `purchases.products.consume`), istemci `tuket()` yalnız yedek. İade taraması
  `satin_alma_iade_tara` (bakiye sıfırın altına inmez, açık `iade_eksik`) `satin_alma_iade_takibi`
  = false ile kapalı. Reklam ödülü yalnız `reklam_jetonu_al()` jetonuyla, en az
  `reklam_min_sure_sn` sonra; kalıcı çözüm reklam ağı SSV. İki Edge Function 23 Eyl'de
  DAĞITILAMADI (CLI 403) — bkz. Açık İşler.

### Sezon Yolu (Battle Pass) — 720–722 (30 Eyl 2026, Ida kararları; **sistem 1 Eki 2026'da AÇILDI** — Sezon 1: 1 Eki 00:53 TSİ → 29 Eki 00:00 TSİ)

- **Anahtar:** `oyun_ayarlari.sezon_yolu_acik` (**true**, 1 Eki 2026). Açıldığı AN 1. sezon başlar (tetikleyici + `bildim-sezon-tik` 5 dk cron,
  `sezon_tik` idempotent). Sezon 28 gün (`sezon_gun`), bitiş 00:00 TSİ, biten sezonun yerine yenisi kendiliğinden açılır.
  Kapalıyken yalnız SAHİP bir **test sezonunda** (no 0) gerçek veriyle dener: sayfa + rozet görünür, kendi maçları SP verir,
  BP alabilir; altın isim/halka yalnız kendine görünür; `sezon_sahip_sp_ekle` / `sezon_sahip_test_sifirla` (BP elması iade).
- **SP (Sezon Puanı)** coin/elmas değil; herkes toplar. Tek giriş `sezon_puani_ekle` (idempotent: sezon+oyuncu+kaynak+referans,
  oyuncu satırı FOR UPDATE). Kaynak tetikleyicileri: Klasik/Saf Bilgi/Antrenman (`matches`), Düello, Turnuva, günlük görev
  (`quest_progress` INSERT). Maç `sp_mac_oyna` 10 + galibiyet `sp_mac_galibiyet` 10, × `odul_carpan`, açık bota × `sp_acik_bot_carpani` 0,5;
  terk eden almaz; günlük maç tavanı `sp_gunluk_mac_tavan` 150 (çarpan öncesi). Turnuva bitiren 15 (+ kazanana 10). Görev 10.
  Grup Maçı SP vermez (ödülsüz mod). Haftalık görev (25 SP) ve Haftalık sandık (75 SP) de SP verir — bkz. "Görevler" bölümü.
- **Seviye:** 28 (`sezon_seviye_sayisi`), eşik `sezon_sp_esik_taban` 100 + `sezon_sp_esik_artis` 0 (sabit) → toplam 2.800 SP.
- **Ödüller:** `bp_seviye_odulleri` (56 yuva, seviye × `ucretsiz|ucretli`), "Al" ile bir kez (`bp_odul_al`, `bp_toplu_al`); alım
  `oyuncu_bp_odul_alimi`. Sezon kapanınca hak edilip alınmamış ödüller verilir. Placeholder (`placeholder=true`, "?" + "Yakında"):
  4 avatar, 5 çerçeve, 1 tepki paketi — gerçek ödül = satırı güncelle (`placeholder=false`, `veri`), tetikleyici önceden alanlara verir.
  Coin ödülü `coin_ekle(..., 'sezon_yolu')` günlük tavan dışı. Kalıcı kozmetikler Koleksiyon Puanı'na mevcut tetikleyicilerle girer.
- **Taşma ödülü (730):** 28. eşik (2.800 SP) geçilince her `sezon_tasma_sp` 100 SP = 1 taşma ödülü, sezonda en çok `sezon_tasma_azami` 10;
  ücretsiz kol `sezon_tasma_ucretsiz_coin` 25, ücretli (yalnız BP, geriye dönük) `sezon_tasma_ucretli_coin` 40 coin (TEST DEĞERLERİ). `bp_tasma_al(p_kol)`,
  alım `oyuncu_bp_tasma_alimi`; `sezon_yolu_durumum().tasma`, `bp_toplu_al` ve `sezon_kapat` taşmayı da kapsar. Seviye 28'de kalır.
- **Maç sonu SP şeridi + BP tanıtımı (1050, 10 Eki 2026):** `sezon_mac_sp_ozetim(p_ref)` maç/düello/kasa/turnuva kimliğinden kazanılan SP, öncesi/sonrası SP-seviye, eşikler ve atlanan seviyelerin ÜCRETSİZ ödüllerini döner (istemci hesaplamaz); `MacSonuKutlama` `sezonMacRef` prop'u → `components/sezon/SezonSpSeridi.jsx` (SP yoksa/sezon kapalıysa çizilmez; Grup Maçı ve Hızlı Mod bağlı değil). `bp_tanitim_gosterilsin_mi()` + `bp_tanitim_gosterimleri` (RLS açık, politikasız): BP'siz oyuncuya günde en çok 1 kez (TSİ, atomik, hesaba bağlı), sezon kapalı/test sezonu/BP sahibi → gösterme; pencere `components/sezon/BpTanitimPenceresi.jsx` ana sayfada, "Battle Pass al" → `/sezon-yolu` (`state.bpSatinAl`) satın alma sayfasını açar. Test: `araclar/mac-sonu-sp-sql-testi.mjs`, ekran `araclar/mac-sonu-sp-ekran.mjs`.
- **Sezon finali (780, 1 Eki 2026):** seviye 28 ücretli ödülü = **Ejderha çerçevesi** (`pc_ejderha2`, premium çerçeve, efsanevi, "Sezon sonu ödülü"). `bp_odul_uygula` 'cerceve' türü premium çerçeve kozmetiğini `kozmetik_ver` ile sahipliğe işler (bp_odul_al / bp_toplu_al / bp_satin_al geriye dönük / sezon_kapat aynı yoldan). Ejderha ARTIK dükkânda satılmaz (`kozmetikler.satis_pasif`, `kozmetik_satista` okur); kayıt, çizim, sahipler ve takılılar durur. Ekranda 28 yuvası, hero final kartı ve BP satın alma vitrini oyuncunun kendi avatarıyla çizer (`CerceveOdulGorsel`). **822 (uygulanınca):** ödül türü `avatar` + `arka_plan`; Sezon 1: 5 Korsan · 14 Samuray (Epik avatar) · 21 Kristal Uzaylı · 27 Savaş Robotu (Efsanevi avatar) · 8 Yıldızlı Gece · 17 Su Altı (arka plan). BP ödülü dükkânda satılmaya devam eder; zaten sahipse avatar yerine `bp_avatar_sahipse_coin` 200 coin (1039; arka plan ödülünde iade yok). Yuva → ödül eşlemesi TEK SATIR: `update bp_seviye_odulleri set tur, veri='{"anahtar":…}', placeholder=false` (ad/nadirlik/görsel `trg_bp_odul_doldur` ile katalogdan). Ücretli kol 19 Kurt Adam · 22 Balkabağı Adam · 23 Vampir (Epik, 1039; 1037'deki Nadir Şövalye/Büyücü/Kral artık level ödülü); ücretsiz kol 10 Kovboy · 24 Korkuluk (Nadir, 1039). Test: `sezon-finali-sql-testi` (ROLLBACK).
- **Battle Pass:** yalnız elmas, `bp_fiyat_elmas` 500; `bp_satin_al` tek atomik işlem (profil FOR UPDATE, `elmas_harca`, sahiplik,
  hak edilen ücretli ödüller geriye dönük, çift alım reddedilir). BP sahibi: ismi altın (`oyuncu_kartlari.isim_efekti = 'isim_altin'`,
  takılı efektin önüne geçer), çerçevesine altın halka (`oyuncu_kartlari.sezon_bp` → `CerceveliAvatar` `AltinHalka`), SP ×`bp_sp_carpan` 1,25
  (maç/turnuva/görev), günlük bonus görev (`bp_bonus_gorev_al`: bugün `bp_bonus_gorev_hedef` 2 maç → `sp_bp_bonus_gorev` 20 SP),
  maç sonu altın şerit (1,8 sn, sonucu örtmez), 28/28'e sezona özgü unvan (`sezon_<no>_final` "Sezon N Ustası", efsanevi, bir daha
  verilmez). Sezon kapanınca BP, altın isim ve halka kapanır; kalıcı ödüller kalır. **Pay-to-win yok:** maç/soru/lig/eşleşme kodu BP okumaz.
- **Oyun hissi (10 Eki 2026, güncel — aşağıdaki afiş/alt kart tarifinin yerine):** `/sezon-yolu` sabit koyu lacivert yıldızlı sahne (Sezon 2+ aynı); hero = büyük Ejderha (oyuncunun avatarıyla) altın ışıltı/nabız + "Final ödülü · ad" + "Sezon N · X gün kaldı" + sıradaki büyük ödül hapı (alt karttan taşındı); turuncu seviye dairesi + altın çubuk (`AltinCubuk`, dolunca bir kez parıltı) + x/y SP; kutular 72 px, kilometre taşı (5/10/15/20/25/28 + sıradaki) 86 px kalın altın kenar; alınabilir altın ışıma nabzı; alınmış RENKLİ + yeşil tik; BP kolu BP yokken de renkli altın şerit + altın kilit; "Ödülleri al" TURUNCU nabızlı, yoksa "Sıradaki ödül: Sv N · K SP kaldı" bilgi şeridi. Ödül alma: `OdulPatlamasi` (7 ikon hapa uçar, konfeti, titreşim, sıralı). Ana sayfa Sezon/Görevler kartları oyun kartı (lacivert+Ejderha / krem+sandık, kırmızı nokta + nabız, hiçbir yükseklikte gizlenmez). Ölçüm `araclar/oyun-hissi-sezon-ekran.mjs`.
- **Arayüz — TAM EKRAN SAHNE (Ida onaylı gri kutu taslağı, 1 Eki 2026):** `/sezon-yolu` (`oyun/tasarim/sezon-yolu/`) `QtSahne` içinde açılır (üst çubuk + alt menü gizli,
  ekran kilitli). Üst şerit "Sezon Yolu" + coin hapı; sabit üst (2 Eki 2026, Ida onaylı eskiz): **sezon afişi** (koyu altın zemin: sezon sonu ödülü vitrini + taç, "Sezon N · X gün kaldı", "Sezon sonu ödülü: ad"; 68 px, kısa ekranda 64; dokununca ödül önizlemesi) + tek satır "Seviye N · mavi SP çubuğu · x / y SP" + sütun başlıkları (Ücretsiz | altın hap "Battle Pass" + taç);
  tek odak **dikey iki şeritli yol** (satır = seviye: ücretsiz kutu · düğüm · Battle Pass kutusu, 64 px; açılışta mevcut seviye ekranın ortasında; alınabilir kutu
  tek dokunuşla `bp_odul_al`, diğerleri önizleme `OdulSayfasi`; 28. satır özel geniş kutu = iki ödül + sezon unvanı; sonda 28+ taşma satırı → `TasmaSayfasi`);
  sabit alt: "Sıradaki büyük ödül" kartı (nadirlik çerçeveli 48 px görsel, "Sv N: ad", "K seviye kaldı", altın-krem) · (BP) günlük bonus satırı · tek büyük düğme (alınabilir ödül varsa — BP olsun olmasın — "Ödülleri al (n)" `bp_toplu_al`; yoksa ve BP yoksa ALTIN "Battle Pass al" + elmas fiyat çipi;
  BP var + alınacak yoksa düğme yok). Renk rolleri: turuncu = eylem ("Al", alınabilir çerçeve) · mavi = ilerleme (SP çubuğu, geçilen düğümler dolu, şimdiki seviye büyük halka) · altın = Battle Pass (sağ sütun boyunca altın şerit `.sy-dikey::before`, BP yokken soluk + ücretli kutularda koyu kilit rozeti) · yeşil = alındı tiki · kutu zemini ödül türünden (`data-tur`: coin altın, elmas mavi, joker yeşil, diğerleri beyaz) · nadirlik yalnız ÇERÇEVE rengiyle (mor yalnız Epik); lejant, fayda çipleri, hero pankartı, "Seviyem", "Battle Pass aktif" şeridi,
  yatay yol görünümden kalktı (bileşenler durur). Sezon teması (`sezonTemalari.jsx`) arka plan çizmez, yalnız ilk açılış perdesinde kullanılır.
  **Arka planlar bu sayfada DONDURULDU (Ida):** `arka_plan` türü ödül yuvası jenerik hediye ikonuyla çizilir (`OdulGorsel.jsx › ARKA_PLAN_DONDURULDU`); sezon verisi değişmedi
  (Sezon 1: ücretli kol 8 Yıldızlı Gece, 17 Su Altı). Sahibin test araçları yolun sonunda katlanır "Test modu" alanında.
  Rozet ana sayfa oyuncu kartında + dişli menüde "Sezon Yolu" satırı (`oyun/components/sezon/`), istemci `oyun/lib/sezonYolu.js`.
  Sezonun İLK açılışında tam perde (1,5 sn, dokununca atlanır; "gördü" `bildim_sezon_perde:<kullanıcı>:<sezon no>` localStorage). "Hareketi azalt" → sahne ve yol anında.
  Dosyalar: `SezonYoluPage.jsx` (durum/akış), `SezonUst.jsx`, `Yol.jsx` (DikeyYol), `SiradakiOdul.jsx`, `SezonAcilisPerdesi.jsx`; ölçüm `araclar/sahne-ekran-sezon.mjs` (taklit RPC).
  Testler: `sezon-yolu-sql-testi` · `sezon-tasma-sql-testi` · `sezon-kapanis-sql-testi` (ROLLBACK) · `sezon-tasma-yaris-testi` ·
  `sezon-yolu-yaris-testi` (sahip test sezonunu SİLER) · ekran `araclar/sezon-yolu-v2-ekran.mjs` (390×700 ve 360×640 ana ölçü).

### Görevler — 740–744 (30 Eyl 2026, Ida kararları; sunucu + ekran tamam)

- **Günlük:** her gün 3 görev (1 kolay + 1 orta + 1 zor), **herkese aynı**, `gorev_havuzu`'ndan (10 görev, hedef + TR/EN ad TABLODA, koda gömülü
  değil). Seçim tarihten deterministik ve döngülü (her görev eşit sıklıkta, ardışık günde aynı görev yok); `gunluk_gorev_secimi`'ne tembel
  yazılır, yazılınca o gün DEĞİŞMEZ (havuz sonradan değişse de). Zor havuzda "günün kategorisinde 10 doğru" — kategori aktif soru kategorilerinden
  aynı döngüyle (parametre jsonb). Ödül: `coin_gunluk_gorev` 15 coin (günlük coin tavanına TAKILIR, tur `gorev`) + `sp_gunluk_gorev` 10 SP.
  Lig puanı (`profiles.puan`) YENİ görevlerde verilmez (eski 3 sabit görevde 20/50/30 idi).
- **Haftalık:** havuzdan 3 görev (`haftalik_gorev_secimi`, pazartesi 00:00 TSİ = lig haftası), her biri `gorev_haftalik_coin` 50 + `sp_haftalik_gorev` 25.
  3'ü de ALININCA **Haftalık sandık**: `gorev_haftalik_sandik_sp` 75 SP + `gorev_haftalik_sandik_joker_adet` 1 × `gorev_haftalik_sandik_joker_tur` (soru_degistir;
  joker kaynağı `hediye`). Alım kaydı `haftalik_gorev_alimi` (sandık = quest_id `sandik`); günlük alım eskisi gibi `quest_progress`.
- **Sayaç kuralı (741):** TSİ gün/hafta penceresi; **Antrenman (açık bot) maçı/düellosu SAYILMAZ** (sezon_mac_sp ile aynı tespit: rakip `acik_bot`
  ya da `acik_bot_mu`), gizli bot normal oyuncu; terk eden sayılmaz; modlar eski `gorev_sayaci` ile aynı (Klasik/Saf Bilgi + Düello + Hızlı Mod + Grup +
  Turnuva; Düello sayaçları yalnız Düello). Düello doğrusu savunan + saldıran. Eski `gorev_sayaci` (mac_oyna_3…) aynen durur (BP bonus görevi onu kullanır).
- **SP:** sezon kapalı/yoksa SP verilmez, coin/joker verilir; açıkken `sezon_puani_ekle(kaynak 'gorev')`, BP sahibinde ×`bp_sp_carpan`.
- **RPC:** `gorevlerim()` · `gorev_al(kapsam, quest_id)` · `haftalik_sandik_al()` (hepsi security definer, yalnız authenticated, oyuncu satırı kilidi,
  idempotent: ikinci alım `{alindi:false, zaten:true}`). Eski `get_daily_quests` / `claim_quest` aynı imzayla yeni günlük seçimle çalışır.
  Test: `node araclar/gorevler-sql-testi.mjs` (ROLLBACK) · `node araclar/gorevler-yaris-testi.mjs` (iki bağlantı, test hesabında, temizler).
- **Ekran — OYUN EKRANI (10 Eki 2026, güncel; aşağıdaki 1 Eki liste görünümünün yerine):** koyu mavi sahne, Günlük/Haftalık sekmeleri (kalan süre), süzülen sandık + dönen altın ışınlar, yıldız yolu (görev sayısı kadar yıldız + sandık düğümü), yan yana 3 renkli görev kartı (maç oyna mavi · Düello kırmızı · doğru yeşil; zorluk yıldızı, ilerleme, ödül); hazır kart yeşil nabız + AL → flip → altın TAMAM kartı (tamamlananlar soluk değil), ödül coin hapına uçar (`tasarim/sahne/OdulPatlamasi.jsx`, Sezon Yolu ile ortak), yıldız yanar, sandık sallanır. Haftalık sandık: tam ekran perde, gerçek ödüller zıplar, "Topla"; tek sefer. Günlük sandık sunucuda ödülsüz → yalnız görsel ("Yarın yeni sandık"). Veri localStorage önbelleğinden anında. Parçalar `pages/gorevler/`; ölçüm `araclar/sahne-ekran-gorevler.mjs`.
- **(Eski, 1 Eki) Ekran — TAM EKRAN SAHNE (Ida onaylı gri kutu taslağı, 1 Eki 2026):** `/gorevler` (`pages/GorevlerPage.jsx` + `gorevler.css`, veri `lib/gorevler.js`, çeviri
  `lib/ceviri/gorevler.js`) `QtSahne` içinde. Sabit üst (tek odak): halka "1/3" + "Bugün N görev tamam" + "X sa Y dk sonra yenilenir" (1 saatten azsa kehribar; hepsi alınınca
  "Bugünlük tamam"). Liste: "Günlük" (3 satır) · "Haftalık, N gün M sa" · sonda kesikli çerçeveli Haftalık sandık (3 nokta). Satır NÖTR: renksiz ikon kutusu, zorluk = 3 nokta
  (Kolay/Orta/Zor etiketi ve zorluk renkleri yok), ince çubuk + sayı/hedef, tek satır ödül "15 · 10 SP"; yalnız ALINABİLİR satır turuncu çerçeve + "Al"; alınmış soluk.
  Sabit alt: alınabilir varsa tek düğme "Ödülü al (n)" (mevcut `gorev_al` / `haftalik_sandik_al` ile tek tek, sırayla; hata olursa durur), yoksa alan çöker.
  Alınca sunucunun döndüğü GERÇEK coin/SP uçan çipte görünür; SP yalnız sezon sistemi görünürken (`sezon_ozetim.gorunur`). Ölçüm `araclar/sahne-ekran-gorevler.mjs`. Ana sayfada tek satırlık Görevler şeridi (`GorevSeridi`, "Günlük a/3 · Haftalık b/3", alınabilir ödül varsa 8 px sessiz nokta);
  şerit yalnız ekran yüksekliği ≥ 700 px iken görünür (<700'de sığmaz; OYNA/DÜELLO yerinde kalsın diye gizli) — her ekranda avatar (dişli) menüsü ›
  Görevler satırı var. Ölçüm: `node araclar/gorevler-ekran.mjs` (taklit veri, sunucuya yazmaz). **Güncel görünürlük (1 Eki 2026): Görevler şeridi yalnız ekran yüksekliği ≥ 900 px'te** (Sezon Yolu şeridi yer aldı; 700–899'da gizli).

### Botlar

- İki katman: **açık botlar** (adında "Bot" geçer, %50 coin, anında cevaplar)
  ve **gizli botlar** (gerçek oyuncu gibi, tam coin, gerçekçi sürede cevaplar).
- `is_bot` istemciye **ASLA sızmaz** — gizli botun bot olduğu anlaşılmamalı.
- **155 gizli botun kimlikleri rastgele (664/665):** migration 150'deki
  `b17b…001–080` ve migration 175'teki `b27b…001–075` kimlikleri, bağlı bütün
  UUID satırları korunarak benzersiz UUID v4 değerlerine taşındı. Bot üretim
  mantığı kimlik önekine değil, erişimi kısıtlı `profiles.is_bot` / `bot_turu`
  alanlarına dayanır; gizli botlarda sabit/sıralı UUID deseni kalmadı.
- **Gizli botların hepsinde avatar var (610, 659):** avatarı boş olanlara açık avatarlardan (31 + aktif katalog) bot
  adına göre sabit (hashtext) avatar verildi; `avatar_onayli` da açık olmalı (`gorunen_avatar` yalnız onaylıyken avatar_url'i verir) —
  659 ile 75 botta açıldı; baş harfli (avatarsız) gizli bot kalmadı.
- Gizli botlar arkadaşlık kabul etmez, lig değiştirmez.
- **Gizli bot şehirleri (640) listeden ve nüfusa göre:** TR'de 81 ilin nüfus payı kadar (İstanbul 20, Ankara 7, İzmir 6…),
  yurt dışında ülkesinin en kalabalık 10 şehrinden nüfus ağırlıklı; şehirsiz gizli bot yok.
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
  dili ezilmez. Soru dili `profiles.dil` → `soru_dilinde` (aktif soruların ~12.700'ünün EN çevirisi var).
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

- **Sunum süreleri (9 Eki 2026):** Düello + Ortak Hazine geçiş/animasyon süreleri tek yerde `oyun/lib/sureler.js`; ince ayar gizli `/sure-ayar` (yalnız o tarayıcı, localStorage). Envanter/ölçüm `docs/sure-olcum.md`. Değer değişikliği = `sureler.js` varsayılanı. **Bugünkü varsayılanlar (ms):** ortak_arama_gecis 2850 · duello4_acilis 2000 · duello4_sarsinti 860 · duello4_baski 2950 · duello4_konfeti 2500 · duello_skill_efekt 1040 · kasa_ac_an 1820 · kasa_devam_an 1770 · kasa_an_taban 1380 · kasa_kapali_karar 700 · kasa_devam_vurus 1030 · kasa_sonuc_ucus 2910 · kasa_final_sahne 4300 · kasa_final_kapanis 3200 · kasa_cifte 1670 · kasa_savunma 2350 · kasa_joker_bilgi / kasa_devam_odul / kasa_rakip_joker 2650 · kasa_tur_bant 1200. Sunucu tarafı (canlı DB): `duello4_kart_sn` 10 · `duello4_kart_duyuru_ms` 900 · `kasa_gosterim_payi_ms` 2000 · `kasa_giris_sahne_ms` 4000 (1038; istemci aynı ayardan okur). Sayfadaki "Oynat" her sahneyi gerçek bileşenle taklit veriyle oynatır (`oyun/tasarim/sure-ayar/sahneler.jsx`; oyun bu dosyayı yüklemez).

**Görsel dil: Yön A "Şeker Kutusu" (Tasarım Adım 2, 23 Eyl 2026 — canlıda).** Parlak,
yuvarlak, oyuncak gibi kabarık düğmeler. Bütün ekranlar (harita/meydan, gardırop,
karakter, Hızlı Mod hariç — dondurulmuş) bu sistemle yeniden yazıldı.

- **Tek kaynak: `oyun/tasarim/`** — token'lar (`--qt-*`, `tokenlar.css`), bileşenler (`Qt*`:
  düğme, kart, mod kartı, şık, sayaç, can, skill, üst çubuk, alt menü, modal, toast…),
  ikon seti (`Ikon.jsx`), hareket (`hareket.css/js`). Kılavuz `oyun/tasarim/OKU.md`,
  canlı örnek `/tasarim-sistemi` (menüsüz; giriş + yalnız sahip — `SahipKapisi`). Ekran stilleri
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
- **Geliştirici/tasarım sayfaları girişsiz DEĞİL (26 Eyl 2026):** `/insan-prototip`, `/preview/*`, `/tasarim-yonleri`, `/tasarim-sistemi`,
  `/kozmetik-onizleme`, `/mac-sonu-onizleme` giriş ister ve `SahipKapisi` (`sahip_mi()`) ile yalnız sahibe açılır (oturumsuz → giriş
  ekranı, misafir/normal oyuncu → "Bu sayfa yalnız sahibe açık"). `bagimsizModul` yalnız Gizlilik + Koşullar. Bu adresler
  robots.txt'te Disallow (kaynak `vite.config.js › ROBOTS_YASAK` + `public/robots.txt`). Yerel geliştirmede (.env yok) kapı atlanır.
- **Önizleme sayfaları (menüde yok):** `/kozmetik-onizleme` (çerçeve + rozet), `/mac-sonu-onizleme`
  (maç sonu sahnesinin 6 hâli; aynı sahne `MacSonuKutlama` 24 Eyl'den beri BÜTÜN modlarda canlı —
  veri tek çağrı `mac_sonu_ozet`, sesler yalnız `ses.js › sesMacSonu`, terkte ödülsüz "Maçtan
  ayrıldın" / "Rakip ayrıldı — galibiyet"; Turnuva/Grup'ta kendi derecen; `lottie-web` +
  `canvas-confetti` maç sonunda tembel yüklenir — "yeni paket yok" kuralının Ida onaylı istisnası),
  `/ses-secim` (kalıcı ses aracı, yalnız sahip), `/avatar-onizleme` (39 avatarın onayı verildi — 649; "Seçimlerimi kopyala" üç bölümü de kapsar),
  `/ikon-onizleme` (4 uygulama ikonu adayı, yalnız sahip; hazır dosyalar
  `public/ikon-aday/<ad>/` — oyunun ikonu onaya kadar değişmez),
  `/cerceve-onizleme` (çerçeve tarzı A/B/C), `/kozmetik-onizleme` (kozmetik "satışa girsin" seçimi
  yalnız sahipte), `/premium-onizleme` (8 hareketli premium çerçeve, 6 iç arka plan, altın isim plakası, lig
  amblemi — yalnız önizleme, oyunda yok; Girsin/Girmesin tarayıcıda, "Seçimlerimi kopyala" ile iletilir)
  — seçim sayfaları yalnız sahip yazar.
- **Skill rozeti (`SkillRozeti`)** her yerde aynı: dükkân, loadout, maç çubuğu, maç içi satın alma,
  maç sonu, envanter, level ödülü. Kabarık parlak rozet, renk token'ı `--qt-skill-<tur>`, sembol
  Phosphor (MIT). Coin paketi görseli `CoinPaketGorseli` (Noto Emoji 3D, Apache 2.0). **Dış
  kaynaklı her varlık `docs/VARLIK_LISANSLARI.md`'ye yazılır; ticari izni olmayan kullanılmaz.**
- **Tam ekran oyun sahnesi `QtSahne` (1 Eki 2026, `oyun/tasarim/sahne/`; kılavuz OKU.md §12):** Sezon Yolu ve Görevler "web sayfası" değil sahnedir —
  `useOyunModu` ile uygulama üst çubuğu + alt menü gizlenir, kök `position: fixed` 100dvh (sayfa gövdesi kaymaz), üst şerit [geri · başlık · coin hapı],
  `ust` sabit alan, `alt` sabit eylem alanı (boşsa yok), tek kaydırılan bölge; giriş sağdan ~240 ms (içteki sarmalayıcıda; hareketi azaltta anında). Sahne kuralı:
  tek odak, tek vurgu rengi (turuncu) + en çok 3 ton, kırmızı yok (hata şeridi kehribar), en çok 1 nabız. Sahnede coin hapı hedefi `QT_SAHNE_COIN_HAPI`.
- **Ana sayfa telefonda HİÇ kaydırılmaz:** `AnaSayfaA` `<html>`e `.as-kaydirmasiz` koyar, kabuk
  100dvh esnek sütun + overflow hidden + overscroll-behavior none; sahne kalan alanı doldurur,
  kısa ekranda avatar küçülür (container query). Diğer sayfalar kaydırılır. Durum bantları (bildirim
  şeridi, devam eden maç, acil) açılınca `useSigdir` 0→8 kademe sıkıştırır (`data-s1…s8`; hiçbir öğe
  gizlenmez, lig kartı kabı artık kırpmaz). Profil gelmeden sayfa çizilir; oyuncu + lig kartı iskelet.
- **Ana sayfa "oyun sahnesi" (8 Eki 2026, Ida onaylı eskiz):** zemin #BFDBF7 · metin #1F2A5C · turuncu
  #EE7F45 YALNIZ Klasik (tek ana eylem) · Düello kırmızı #B93C3A beyaz yazı · Ortak Hazine hardal #D8A53A ·
  turnuva sarı #F6CF5A, halo yok, KATIL yeşil #3FA568 · krem isim plakası #FFF3C9. Mod kartları kama ışın +
  büyük figür (`ModFiguru`: rozet amblemleri soru/kılıçlar + sandık/şimşek/parıltı webp). Bildirim izni ana
  sayfada tek satır şerit (`BildirimIzniSor serit`). Alt menü ikonları kalın lacivert kontur + dolu iç.
- **Ana sayfa = seçenek A (lobi, kaydırmasız)** — `oyun/pages/anasayfa/AnaSayfaA.jsx`, veri `veri.jsx`,
  parçalar `parcalar.jsx`. Sıra: kompakt oyuncu kartı (çerçeveli avatar, level + XP, lig, seri) → canlı
  lig kartı (`lig_grubum_ozet`: üstümdeki 2 · ben · altımdaki 2, yükselme/düşme çizgisi, fark) → turnuva
  şeridi (sarı zemin + kupa, KATIL yeşil; komşularla 12–14 px) → OYNA/DÜELLO (en çok 92 px) → kısayollar
  (Meydan Okumalar · Grup Maçı · Saf Bilgi · Hatalarım) → **Sezon Yolu şeridi** (`SezonSeridi`, 1 Eki 2026) → görev şeridi. Lig kartı "Sıra 15/25".
  Şerit: "Sezon N · Seviye X/28 · ilerleme · sıradaki ödül · X gün kaldı"; BP sahibi değilse altın "Battle Pass" çipi, alınabilir ödül varsa altın nokta + sayı;
  bütün şerit tek bağlantı (/sezon-yolu); yalnız `sezon_yolu_durumum().acik` iken (test sezonu değil) çizilir; veri sezon_ozetim + sezon_yolu_durumum (yeni RPC yok).
  Telefonda öncelik OYNA/DÜELLO > turnuva > Sezon şeridi > lig > kısayol > Görevler: ekran yüksekliği <700 px şerit ve Görevler gizli, 700–899 px şerit görünür/Görevler gizli
  (Görevler avatar menüsünde), ≥900 px ikisi de; lig kartı ≤940 px'te en yakın 3 satıra iner. Masaüstü üç sütun. Coin yalnız üst çubukta. Eski `pages/Home.jsx`
  ve B/C/seçim dosyaları duruyor, rotasız. Meydan Okumalar `/meydan`, Grup Maçı `/meydan?bolum=grup`.
- **Tasarım skill'leri (proje içi):** `.claude/skills/impeccable` (pbakaus/impeccable; ikili
  dosyası git'e girmez; otomatik hook YOK — denetim elle, `impeccable.cmd detect`) ve
  `emil-design-eng` + hareket skill'leri (emilkowalski/skills). Ürün bağlamı `PRODUCT.md`.
- Resmi marka işareti Q Logo Lab **03 Forward Pulse** Q'sudur + `QUIZ TACTICS` yazısı
  (`Logo.jsx`); yeni logo ayrı iş, bekliyor.
- **Masaüstü (≥ 1024 px, Ida 25 Eyl 2026):** yeni yan menü/panel YOK (telefon oyunu). Ana Sayfa (`.as-sayfa`) kendi masaüstü panelini
  taşır; diğer bütün sayfalar tek ortalı sütun, genişlik tek token `--qt-sutun` (640 px, `tokenlar.css`; kural `a-kabuk.css` › `.a-icerik > :not(.as-sayfa)`).
  **Tek istisna Dükkân:** `--qt-sutun-dukkan` 740 px (8 sekme TR 671 / EN 730 px ister; sekme çubuğu ≥ 1024'te 13 px yazı + 8 px dolgu). Maç ekranları (`body.bd-oyun-modu`) kendi 560 px sahnesini korur. Sütunun iki yanı: noktalı zemin + hafif yüzey bandı (yalnız zemin token'ları).
  Alt menü yalnız < 850 px; masaüstünde üst çubuk menüsü var, sabit alt menü yok.
- Baloo 2 başlık / Nunito gövde — **yerel paketli** (`public/fonts/`). Google Fonts YOK.
- Oyun, bilgi yarışması gibi görünmeli; sakin/nötr "uygulama" estetiğine kaydırma.
- **Mod anlatımı kısa (Ida, 7 Eki 2026):** mod giriş/tanıtım ekranları ve maç içi açıklama satırları = bir kısa başlık + en çok 2-3 kısa satır (~8 kelime). Ayrıntı yazılmaz; TR ve EN aynı kısalıkta (yeni EN anahtarları `ceviri/kisa-metin.js`). Düello tanıtımı puan modunda **en çok 5 adım** (`DuelloTanitim › P_ADIMLAR`: seçim · saldır/puan · hedef · renkler+kilit · jokerler; ban adımı yalnız bayrak açıkken). Ortak Hazine karar ekranı (9 Eki 2026): başlık, "Skor x/y" alt yazısı, ayrı hak satırı ve "Süre dolarsa DEVAM sayılır." YOK; DEVAM alt yazısı tek satır ("Sahipsiz kalır · Savunma Hakkı" / "Savunma Hakkı sende" / "Hazine sahipsiz kalır"); hazine tavandayken yalnız "Süre dolarsa otomatik AÇ sayılır." kalır
- **Mod özel maç sonu (7 Eki 2026):** `MacSonuKutlama › modOzet` yuvası skorun altında, sahnede (Detay açılmadan). Düello: "Ele geçirilen kategoriler" (`DuelloTahta › HkEleGecenler`; Sen/Rakip kategori çipleri + x/4; puan modu). Ortak Hazine: "Açılan hazineler" (`KasaPage › KasaAcilanlar`; kim kaç açtı, toplam puan, en büyük hazine + kim açtı; hiç açılmadıysa en yüksek değer). Veri `duello_durum.puan` / `kasa_durum.gecmis` — ek istek yok. Renk: Düello kırmızı çerçeve + beyaz zemin, Hazine altın çerçeve + açık altın zemin.
- **Ortak maç akışı açık sahne (8 Eki 2026):** 3-2-1 açık gök + ışın, rakam rengi 3 kırmızı · 2 sarı · 1 yeşil (`MacHazirlik › GeriSayim`); Hazır VS kartı açık ışınlı + lacivert kontur; maç sonu (bütün modlar + terk) koyu bant/skor kutusu YOK — kazandı sıcak sarı + turuncu afiş, kaybetti/terk açık gök + beyaz afiş, berabere nane; afiş/skor/isim/ödül kartı kalın lacivert kontur. Maç akışında iptal düğmesi her yerde **"Vazgeç" + `QtDugme ikincil`**. VS ve maç şeridinde kimlik sırası tek: bayrak · Lv · lig amblemi (Düello şeridi bayrağı hâlâ gizliyor — `duello-tahta.css`, karar bekliyor).
- **Maç zemini hiçbir fazda koyu değil:** `.qt-sahne-mac` kullanan her maç kökü `qt-sahne-gok` da taşır (kategori yokken gök mavisi, varken pastel); tek başına `.qt-sahne-mac` = eski koyu mor (yalnız koyu vitrin önizlemeleri). Denetim `araclar/koyu-zemin-tarama.mjs`.

### Ses

- Kaynaklar: Kenney (CC0) + **Pixabay** (İçerik Lisansı, efekt + müzik) — Ida kararı, 23 Eyl 2026.
  Eski dosyalar `public/ses/` (lisans `LISANS.txt`). **Adaylar (8 Eki 2026) Supabase Storage `ses-adaylar`
  kovasında** (migration 1000; dist'e girmez), adres tek yerde `oyun/lib/sesAdayKova.js` (üretici
  `araclar/ses-adaylari-yukle.mjs`, ad içerik sürümlü, cihaz önbelleği `sw.js › qt-ses-aday-v1`); adres
  yoksa efekt osilatör yedeğine düşer. Kaynak kopyalar `araclar/ses-adaylar-kaynak/`, lisanslar
  `docs/ses-kaynaklari.md` + `docs/VARLIK_LISANSLARI.md`. Pixabay'de yapay zekâ üretimi ve Content ID kayıtlı parça alınmaz.
- **Hafif müzik VAR** (Ida kararı, 23 Eyl 2026): üç döngü — menü/lobi · maç (Klasik, Düello, Grup,
  turnuva maçı, Hatalarım çalışma) · turnuva lobisi. Rota tabanlı, 0,8 sn geçiş, soru ekrandayken
  seviye × `muzik_kisik_oran` (0,3), sekme gizliyken durur, ilk dokunuştan sonra başlar, tembel iner.
  Seviye `oyun_ayarlari.muzik_varsayilan_seviye` (0,35, test değeri). Motor `oyun/lib/sesArkaPlan.js`.
- **Müzik indirme kuralı (2 Eki 2026, Supabase önbellekli egress kotası):** tam parçalar Supabase Storage `muzik` kovasında KALIR
  (Ida `/ses-secim`'den dağıtımsız değiştirir); taban adres tek yerde (`muzikParcalari.js › KOVA`). Yalnız çalan parça iner:
  `preload="none"`, adres çalma anında verilir (gizli sekmede/müzik kapalıyken indirme yok). Parça cihazda kalıcı önbellekte
  (`public/sw.js › qt-muzik-v1`, anahtar = dosya adı, sınır 14, sürümü kabukla ARTIRILMAZ; Range istekleri önbellekten). Otomasyon
  tarayıcısında (`navigator.webdriver`) müzik inmez — müzik testi `?tani=1` ile açar. Test: `node oyun/_test/sw-muzik-testi.mjs`. Ayrıntı `docs/YUK_AZALTMA.md`.
- Ayar iki anahtar: **Müzik** (`bildim_muzik`) ve **Efektler** (`bildim_ses`, eski tercih) — avatar
  menüsü + Profil › Ayarlar; maç şeridindeki hoparlör küçük pencere açar — Müzik ve Efektler ayrı anahtar, aynı kaynak.
- `oyun/lib/ses.js`: dosyadan çalar, yüklenemezse osilatör yedeği. 30 anın her biri bir fonksiyon
  (tablo `public/ses/OKU.md`); "mevcut" = eski dosya, "sessiz" = çalmaz.
- **`/ses-secim` kalıcı araçtır** (menüde yok, yalnız sahip — `sahip_mi()`): Ida bir sesi orada
  değiştirince oyun yeni dağıtım olmadan değişir (`ses_secimleri` → `ses_secimleri_oyun(sürüm)`,
  migration 380 + 400; istemci açılışta sürümle doğrular). **Seçilmeyen adaylar silinmez** (ileride
  değiştirmek için). Yeni aday / yeni an ekleme: `docs/ses-kaynaklari.md` başı (yeni aday = önce kovaya
  yükle, sonra push).

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

**Avatar nitelikleri (700/701, 30 Eyl 2026):** `avatar_nitelikleri` (70 satır = 31 hazır + 39 katalog; anahtar avatar adresi) tutar
grup (hayvan·insan·meslek·kahraman·fantastik·robot·uzayli·uzay; göz atma, rengi etkilemez), nadirlik (`yaygin|nadir|epik|efsanevi`; katalogdaki
`avatar_katalogu.nadirlik` Koleksiyon Puanı'nındır, ayrı), seri (nullable), edinme (1039: ucretsiz | level | sezon | coin | elmas — bkz. Kozmetik › Avatar edinme), `acilis_zamani` (null = açık).
`acilis_zamani` gelmemiş avatar katalogda/seçimde/kurulumda görünmez, `avatar_onayla` reddeder (takılı avatar hariç); Ida takvimi SQL ile verir.
Sahne (zemin) rengi nadirlikten türer; **bayrak `avatar_nadirlik_renk = true` (770, 1 Eki 2026)**. Nadirlik verisi Ida'nın işaretlemesiyle yazıldı: aktif 62 avatar =
Yaygın 21 · Nadir 15 · Epik 18 · Efsanevi 8 (8 pasif avatar değişmedi). Renkler: Yaygın gri-mavi · Nadir yeşil · **Epik = oyunun Epik moru (`--qt-nadir-epik`, #8b2fd6)** ·
Efsanevi altın; **mor yalnız Epik için ayrılmıştır**, kırmızı kullanılmaz. Avatar seçim ekranları (Profil › Ayarlar, Kurulum, Dükkân › Avatar, Koleksiyon) nadirliğe göre
bölümlenir: **Yaygın → Nadir → Epik → Efsanevi** (yaygınlar üstte), başlık "● Efsanevi · 8". Ham `<img>` yerleri `NadirlikImg` (oyun/components/AvatarNadirlikGoruntu.jsx) ile renge bağlı;
harita/bölümleme `src/lib/avatarNadirlik.js`. İşaretleme sayfası `/avatar-nadirlik` (yalnız sahip, seçim DB'ye yazılmaz, "Kopyala"). Tek çizim noktası `src/components/Avatar.jsx`.

### Mod paritesi — KALICI KURAL

Bir moda yapılan kozmetik/arayüz düzeltmesi, aynı sorunun bulunduğu
**bütün modlara** aynen uygulanır. **Düello da diğer modlar gibidir,
ayrı tutulmaz.** Her düzeltmede "düelloda (ve öteki modlarda) da var mı"
diye bak, varsa aynısını orada da yap. Sorma.

### Oyun hissi — KALICI KURALLAR (1 Eki 2026)

Ortak "oyun hissi" parçaları tek yerde: `oyun/tasarim/oyun-hissi.css` (`qt-oyk-*`, `--oyk-*`; `hareket.css` üzerinden global) +
`QtAfis`, `OdulAni`, `useSiraliGiris`; kılavuz `oyun/tasarim/OKU.md` §11. Sayfa kendi kart/çip/afiş stilini yazmaz, bu parçaları kullanır.

- **Dokunuş tek kapı:** ses + titreşim `dokunus()` / `odulHissi()` / `titresim()` ile verilir; hepsi `hisAcikMi()` kapısından geçer. Titreşim ayrı ayar değildir:
  "Efektler" kapalıysa, hareket azaltılmışsa ya da sayfaya henüz dokunulmadıysa çalmaz. Maç içi `geriBildirim.js › titret` de aynı kapıdadır. Yalnız seçim/eylem düğmelerinde çağrılır (gezinme, sekme, geri değil).
- **Kutlama yalnız sunucu onayından sonra:** ödül/satın alma anı (`kutla`, konfeti, uçan çip, coin hapı zıplaması) sunucu "verildi" demeden oynamaz; iyimser kutlama yok.
- **Azaltılmış harekette sürekli animasyon yok:** giriş/nabız/zıplama/parıltı/konfeti kapanır; renk ve durum kalır. Sonsuz döngülü her yeni önizleme/süs bunu kendi kuralıyla sağlar (Dükkân önizlemeleri: `dukkan-cerceve.css` › `.qt-dk` kapsamı).
- **Tek renk ekseni / tek nabız:** sayfa başına tek renk ekseni (Görevler zorluk, Dükkân nadirlik, Lig lig rengi; kırmızı yalnız Düello/rakip, aciliyet kehribar); ekranda en çok 1 nabız, sürekli dönen hareket ≤ 3; sıralı giriş ≤ 8 öğe ve yalnız ilk açılışta.
- **Renk rolleri (Ida, 7 Eki 2026):** Klasik / OYNA / ana eylem = turuncu · Düello = kan kırmızısı (`--qt-mod-duello`) · Ortak Hazine, coin, ödül, BP, premium = altın (`--qt-mod-kasa`, `--qt-coin`) · level / XP / rütbe / aktif sekme / "Sıra" / "Sen" = mavi (`--qt-ikinci`; bileşenlerde `ton="mor"` adı tarihsel, maviye bağlı) · başarı / AL / satın al / kabul = yeşil (`QtDugme tur="dogru"`) · bekliyor = kehribar (`QtRozet ton="uyari"`) · mor YALNIZ Epik nadirlik (+ Joker Elli, Efsane lig, Sezon Yolu Epik/avatar). Yeni renk icat edilmez, `tokenlar.css` jetonları kullanılır.
- **CSS sıra kuralı (9 Eki 2026):** Bir öğede ortak kalıp sınıfı (`m2-*`, `qt-*`) ile mod/sayfa sınıfı birlikte kullanılıyorsa mod kuralı daha yüksek özgüllükte yazılır (ör. `.m2-giris-kafa.ks-giris-kafa`); CSS yükleme sırasına güvenilmez — lazy parçaların sırası sayfaya nereden gelindiğine göre değişir.
- **Ölçüm:** arayüz değişikliğinden sonra `node araclar/arayuz-denetim.mjs` (16 sayfa × 7 genişlik) temiz olmalı; ikinci/İngilizce hesap için `--oturum=dosya`.

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
  4 sn'de bir yedek yoklar, `duello_baglanti` 5 sn'de bir. Oyun cron'ları iş varken bot_oyna 5 sn (992, Ida 8 Eki), duello_tik 2 sn;
  boşta 15 sn (830/831 sarmalayıcıları `cron_*`; 850: gizli bot nabzına kapı, bot_oyna kapısı insana giden bekleyen daveti iş saymaz,
  bot tepki kuyruğunu sayar). Zamanlamayı seyreltmek ürün kararıdır. Yük envanteri ve 12 Eki sonrası ölçüm listesi: `docs/YUK_AZALTMA.md`.
- **İstemci yük kuralları (2 Eki 2026):** biten/iptal maçta nabız atılmaz; arama yoklamaları önceki istek bitmeden yenisini atmaz;
  düşen Realtime kanalı 2→30 sn geri çekilmeyle yeniden kurulur (`gorunurluk.js › kanalBekleme`); ana sayfa "devam eden maçlar" olayları
  3 sn'ye toplar ve gizli sekmede okumaz. Yeni yoklama eklerken: gizli sekmede dur, unmount'ta temizle, üst üste binmeyi engelle.

Her pakette: `node araclar/oyuncu-testi.mjs [--adres=https://quiztactics.com]`.

- Oyuncunun cevap vermesi gereken HER soruda şıklar dokunulabilir olmalı;
  değilse test ANINDA başarısız. "Açık şık varsa dokun" yazılmaz — eski betik
  şık kapalıyken sessizce bekledi, soru Yanıtsız kapandı, test geçti.
- Her dokunuştan sonra cevabın sunucuya ulaştığı veritabanından doğrulanır;
  maç sonunda test hesabının yanıtsız kaldığı her soru başarısızdır.
- Düello: en az 3 saldıran + 3 savunan; maç sonu puan/kazanan denetimi her maçta; `--altin` 10. tur sonunda puanı eşitleyip Altın Soru açtırır; SQL provası `node araclar/duello-puan-sql-testi.mjs` (canlı, ROLLBACK).
- Her ekran 360 ve 390 px ölçülür; dokunulabilir öğe kutuları kesişirse
  başarısız. Maç öncesi ekran, maç içi skill çubuğu, maç sonu dahil.
- Telefon taklidi (dokunuş), gerçek akış, bota karşı. Klasik ve turnuvada da
  (turnuva yalnız seans açıkken) aynı kontrol.

## Açık İşler

- **Edge Function dağıtımı bekliyor (23 Eyl):** `satin_alma_dogrula` (yeni sürüm) ve
  `satin_alma_iade_tara` depoda hazır, canlıda değil — CLI 403 (makinedeki Supabase belirteci
  başka hesaba ait), Chrome eklentisi bağlı değildi. Migration'lar (304–306) uygulandı; canlıdaki
  eski fonksiyon `coin_satin_alma_isle` üzerinden yeni deftere devreder. Satın alma zaten kapalı.
  10 Eki ölçümü: canlı `satin_alma_dogrula` 9 Eyl sürümü, `send-push` 12 Haz sürümü, `satin_alma_iade_tara` yok.
  `send-push` canlıda `verify_jwt = false` ama `config.toml`'da kaydı yok → dağıtırken `--no-verify-jwt`.
- **Güvenlik denetimi (10 Eki 2026) A bölümü UYGULANDI (migration 1047, Ida onayı 14:48):** A.1, A.4–A.9, A.11, A.12.
  Bugünkü kural: `public` şemada **anon'a açık tek fonksiyon `ses_secimleri_oyun`** (giriş ekranı müziği); başka hiçbir
  RPC giriş yapılmadan çağrılmaz. İç yardımcılar/tetikleyiciler + `coin_harca`, `eski_davetleri_temizle`,
  `mac_oyuncu_indeksi` authenticated'a da kapalı (yalnız postgres/cron + service_role). postgres'in yeni açtığı
  fonksiyonlar PUBLIC/anon'a kendiliğinden açılmaz (authenticated + service_role açılır); yeni tablolarda anon'a yazma yok.
  Push aboneliği: yalnız FCM/Mozilla/Apple/Windows push alan adı, ≤ 1000 karakter, kullanıcı başına 5, başkasının
  adresi devralınmaz (istemci yeniden abone olur). FB kimliği `auth.identities`'ten. Turnuva sorusu yalnız kayıtlı +
  elenmemiş oyuncuya. `avatarlar` kovası 2 MB, png/jpeg/webp. Geri alma: `docs/guvenlik-a-geri-al.sql`.
  **Açık kalan:** A.2 captcha ve A.3 yan oyun tabloları (bu işin dışında); A.10 `net.http_*` migration ile yapılamıyor
  (sahibi `supabase_admin`, postgres geri alamıyor) — Supabase tarafı; supabase_admin'in varsayılan yetkileri de değiştirilemiyor.
- **Güvenlik C (migration 1053 + 1054, 10 Eki 2026):** DM ve şikâyet açıklamasında görünmez karakter (kontrol, sıfır genişlik,
  bidi) küfür filtresinden önce silinir (`gorunmez_temizle`; emoji arası ZWJ kalır). Arkadaşlık isteği 24 sa'te 100, Düello+Kasa
  daveti ortak 24 sa'te 100, aynı kişiye 60 sn bekleme (açık bot hariç). `cihaz_bildir` 10/dk ve `kalp_at` 60/dk sınırda sessizce
  atlar. `profiles.tercih_kategori` CHECK `^[a-z0-9_]{1,40}$`. Edge Function kod değişiklikleri (sabit zamanlı secret, `send-push`
  boş user_ids = 400) yukarıdaki dağıtım işini bekliyor. Geri alma: `docs/guvenlik-c-geri-al.sql`.


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

- Oyunda arka plan YOK (dondurulmuş, 1 Eki 2026): `oyun_ayarlari.arka_plan_acik=false`, pa_* pasif; ayrıntı PROGRESS.md.

- **Ana sayfa: mod kartları (Ida onaylı taslak, 7 Eki 2026):** Klasik tam genişlik büyük kart (120 px; ekran ≤700 px yükseklikte 96; başlık 26 px, 64 px ikon dairesi, "Hızlı sorular, en çok bilen kazanır", sağda ok); altında Düello ("Kategorini savun") + Ortak Hazine ("Doğru anda aç") yan yana yarım genişlik 64 px kart (ikon + başlık + tek kısa satır). Parlama/nabız/rozet yok. "OYNA/DÜELLO" düğmeleri ve Kasa kısayolu kalktı. Telefonda sıra: oyuncu → turnuva → mod kartları → lig → Sezon + Görevler → kısayollar (Meydan, Grup, Saf Bilgi, Hatalarım). Ortak Hazine kartı yalnız `kasa_modu_acik ≥ 1` iken (kapalıysa Düello tam genişlik). Tıklama davranışı eskisiyle aynı (Klasik → mod seçim penceresi, Düello → `/duello`, Ortak Hazine → `/kasa`). Altta "En son oynadığın: {mod}" (`localStorage` `qt:v1:ana-son-mod`, `veri.jsx › sonModuYaz/sonModuOku`; sırayı değiştirmez). "Ortak Hazine" adı 6 Eki 2026'dan beri modun her yerinde (bkz. Kasa bölümü). Kodlar: `AnaSayfaA.jsx`, `anasayfa.css` (dosya sonu), ikon `sandik` (`tasarim/Ikon.jsx`), ölçüm `araclar/ana-sayfa-serit-olcum.mjs`.
- **Ekran revizyonu (Ida seçimi, 10 Eki 2026, canlıda):** **Hatalarım** (`CalismaPage`) = turuncu kitap afişi (`QtAfis`, sağda bekleyen sayı, şeritte "{öğrenilen}/{toplam} soruyu öğrendin") + 2 sütunlu kategori kartları (bütün kategoriler; bankada sorusu olan önde, sayı rozeti yalnız > 0) + soru sayısı + turuncu düğme; "bu hafta öğrenilen" YOK (sunucuda alan yok). **Profil** (`ProfilePage`, yalnız kendi profilin) = kompakt kimlik satırı (`.qt-pf-kisa`: çerçeveli avatar + takılı kart arka planı, isim efekti, unvan, lig + Lv + BP, misafir) + level/XP şeridi (XP tek satır "47/130 XP → Lv 28", altında "Sonraki rütbe: … · Lv N", kesik çizgili Vitrin satırı 44 px — vitrin boşsa yok) → sekmeler ilk ekranda (beşi ikon + kısa yazı, eşit genişlik); İstatistik sekmesinin başında **Ödüllerim** (üç sayı kartı tek kalıp, boşken "0") + **Sıradaki ödül** kartı (`LevelOdulleri vurgu`: avatar > rütbe > joker) + Koleksiyon özeti. **Tutarlılık standardı (10 Eki 2026):** Profil'deki bütün kartlar beyaz + 3 px lacivert kontur + 4 px dudak + 18 px köşe (`.qt-pf .qt-kart`), bütün bölüm başlıkları sade lacivert qt-baslik-3 (Profil'de altın plaka yok). Kategori başarın tek bölüm (ustalık birleşti, tur 2): "N maçtan istatistik · M doğru" + satır ikon · ad · rütbe rozeti · kategori renginde çubuk · yüzde + "N doğru · X için K kaldı" (oyuncu kartı eski görünüm). Seri ve jokerler: en uzun seri + kullanılan joker (Ödüllerim kalıbı) + adlı 2 sütun joker listesi; güncel seri / izlenen video yok. Sıradaki ödül: aynı level'daki ek "+ joker" kartta, Yolda yalnız başka level'lar. `/profil?sekme=ayarlar|davet` doğrudan gelince level şeridi yok (kısa kimlik). Başkasının kartı (`OyuncuVitrinKarti`) aynen. **Boş durumlar** (`QtBosDurum gorsel`): sahne (A) Hatalarım · Mesajlar · Bildirim paneli · 404; rozet (B) Arkadaşlar · Lig "tek başınasın"; öteki kullanımlar ikonlu eski hâl. `/ekran-revizyon-onizleme` duruyor ("Şu anki" sütunu artık eski hâl; kaldırma Ida kararı). Görüntüler `tasarim/ekran-revizyon/asama2/`, araç `araclar/ekran-revizyon-asama2.mjs`.
