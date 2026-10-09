# Düello + Ortak Hazine — süre envanteri ve ölçüm (9 Eki 2026)

Ölçüm: yerel (Vite :5188), **taklit veriyle** (duello_* / kasa_* RPC'leri tarayıcıda taklit; canlı DB'ye yazma yok), 390 px,
TR. Araç: `araclar/sure-olcum.mjs` mevcut ekran araçlarını (`kasa-efekt`, `kasa-savunma`, `sunum-990`, `duello-secim`,
`duello-puan`, `duello-plan-a`, `duello-v4`) `araclar/sure-olcum-izci.mjs` ile koşar; izci her karede (rAF, ~16 ms) sahnenin
DOM'da kaldığı süreyi yazar ve ekran kaydı alır (`tasarim/sure-olcum/video/`, git'e girmez). "Ölçülen" = medyan.

Merkezi dosya: `oyun/lib/sureler.js` (anahtar · açıklama · varsayılan · min · max). Ayar sayfası: **/sure-ayar** (menüde yok,
noindex + robots.txt). Seçim yalnız o tarayıcıda (localStorage `qt-sure-ayar-v1`); CSS animasyonları `--sr-<anahtar>` oranıyla
ölçeklenir. **Varsayılanlar bugünkü değerler** — paket öncesi/sonrası ölçüm aynı (aşağıda "Doğrulama").

İşaretler: **U** = gereksiz uzun · **K** = okunamayacak kadar kısa · **T** = benzer sahnelerle tutarsız · **S** = sunucuya bağlı (tek başına istemcide değişmez).
Öneri kuralı: küçük geri bildirim 150–300 ms · ekran geçişi 300–500 ms · bilgi/sonuç ≈ 1 sn + kelime × 0,25 sn · kutlama ≤ 2–3 sn · tekrar eden oyun içi geçiş olabildiğince kısa.

## 1. Ayarlanabilir süreler (/sure-ayar)

| Mod | Ekran / olay | Ne yapıyor | Mevcut | Ölçülen | Öneri | İşaret | Dosya:satır |
|---|---|---|---|---|---|---|---|
| Ortak | Rakip bulundu → maç | VS kartından maça geçiş | 2000 | — (arama akışı taklitte yok) | 1500 | U | components/AramaSahnesi.jsx:72 |
| Düello | Ban sırası girişi | "BAN SIRASI SENDE" damgası | 1000 | 906–915 | 1250 (4 kelime) | K | components/DuelloBanAni.jsx:25 |
| Düello | Ban açıklaması | saldırana "rakip X'i banladı" | 1200 | (sunum-990'da kesik) | 1500 | T, S (sunucu 880 ms payı) | DuelloBanAni.jsx:27 |
| Düello | BANLADIN onayı | savunana onay | 1000 | — | 1000 | T (bilgi 1700 ile) | DuelloBanAni.jsx:28 |
| Düello | BAN KULLANILMADI | gri bilgi plakası | 1700 | — | 2000 (8 kelime) | T | DuelloBanAni.jsx:29 |
| Düello | SIRA SENDE | mavi şerit | 900 | — | 1250 | K | DuelloBanAni.jsx:30 |
| Düello | SIRA SENDE + bilgi | rakip banlamadıysa | 1500 | — | 2000 (8 kelime) | K | DuelloBanAni.jsx:31 |
| Düello | Otomatik seçim | "otomatik seçildi" konsolu | 1800 | 1804–1819 | 1800 | — | components/DuelloSecim.jsx:28 |
| Düello | Kart uçuşu | kategori kartı yuvaya | 460 | (WAAPI) | 400 | — | DuelloSecim.jsx:27 |
| Düello | HÂKİMİYET BAŞLIYOR | seçimden saldırıya geçiş | 2100 | 2113–2120 | 2000 | U (geçiş) | DuelloSecim.jsx:321 |
| Düello | Kategori çalma | kart karşı tarafa kayar (iniş 820) | 1800 | 1793–1805 | 1600 | — | components/DuelloTahta.jsx:318 |
| Düello | Puan vuruşu | +puan vuruşu, şerit | 1500 | 1499–1514 | 1200 | T (çalmayla üst üste) | pages/DuelloPage.jsx:864 |
| Düello | Skill efekti | skill anı (720; ikinci şans 680) | 720 | — | 600 | T (720/680) | DuelloPage.jsx:584, 1176 |
| Düello v4 | Saldırı sorusu açılışı | "kim neyi aldı" paneli | 1600 | **956–968** | 1600 (gösterim payı ≥ 1,6 sn olmalı) | K, S | components/duello4/Duello4Arena.jsx:28 |
| Düello v4 | Kontrol el değişti | çekirdek uçuşu + sarsıntı | 520 | 532–534 | 520 | — | Duello4Arena.jsx:29 |
| Hazine | AÇ anı | hazine açılır, altın skora uçar | 1280 | 1124 (geç veri 1001–1272) | 1280 | T (DEVAM 1400), S (pay 1,5 sn) | pages/KasaPage.jsx:89 |
| Hazine | DEVAM anı | ×2 patlar, hazine sayarak yükselir | 1400 | 1390–1401 | 1280 | T | KasaPage.jsx:88 |
| Hazine | AÇ/DEVAM en kısa | geç veride taban | 1000 | 1001 | 1000 | — | KasaPage.jsx:93 |
| Hazine | Rakip kararı kapalı | ters kart | 300 | 301–309 | 400 | K | KasaPage.jsx:94 |
| Hazine | DEVAM ETTİ vuruşu | rakibin DEVAM'ı açılır | 650 | 655–656 | 900 (2 kelime + ×2) | K | KasaPage.jsx:95 |
| Hazine | Sonuç: altın uçuşu | +2/+6 → mini hazine, anahtar el değiştirir | 2600 | parça 1124 (sahne 2600) | 2000 | U, S (sonuç fazı 3 sn) | KasaPage.jsx:849–856 |
| Hazine | Maç sonu kazanan | kapı, ışık, patlama | 4300 | 4314–4339 | 3000 | **U** | KasaPage.jsx:96 |
| Hazine | Maç sonu kaybeden | hazine kapanır, kararır | 3200 | 3206–3230 | 2200 | **U** | KasaPage.jsx:97 |
| Hazine | ÇİFTE! | ikisi de bildi bandı | 1400 | 1393–1399 | 1400 | — | KasaPage.jsx:98 |
| Hazine | Savunma Hakkı | tetik / savundu / düştü | 1500 | 1497–1498 | 1500 | — | KasaPage.jsx:63 |
| Hazine | Joker bilgi | "İkinci Şans…" satırı | 1800 | — | 2000 (5 kelime) | — | KasaPage.jsx:769 |
| Hazine | DEVAM ödülü | ödül bandı (kaybedince 1200) | 2000 | 2000–2001 / 1207 | 1800 | T (2000/1200) | KasaPage.jsx:780 |
| Hazine | Rakip joker | rakip avatarında joker ikonu | 2200 | — | 1500 | U | KasaPage.jsx:796 |

## 2. Envanter — ayarlanmayan (sunucuya bağlı, ağ ya da küçük geri bildirim)

| Mod | Olay | Ne yapıyor | Mevcut | Ölçülen | Not / dosya |
|---|---|---|---|---|---|
| Hazine | Giriş sahnesi (sandık + 3-2-1) | maç başı | 6000 | 6842–6908 | **U, S** — sunucunun ilk soru gösterimine bağlı; öneri 4000 (sunucu `kasa` başlangıç süresiyle birlikte) · KasaPage.jsx:87 |
| Hazine | Giriş sesleri | düşüş/coin/rozet | 650 / 1300 | — | KasaPage.jsx:671 |
| Hazine | Final sayı sayımı | skor hedefe sayar | 2350 / 1500 | — | final süresiyle ölçeklenir · KasaEfekt.jsx:316 |
| Hazine | AÇ alt adımları | sars / varış / coin | 340 / 690 / 980 | — | AÇ süresiyle ölçeklenir · KasaPage.jsx:900 |
| Hazine | Rakip arama ipucu | ipucu dönüşü | 3 sn | — | KasaPage.jsx:83 |
| Hazine | Ayar bekleme | ayar gelmezse | 15000 | — | KasaPage.jsx:126 |
| Hazine | İkinci şans seçim temizleme | şık seçimi silinir | 260 | — | KasaPage.jsx:953 |
| Hazine | Kadran ölçek geçişi | hazine büyür | .5 s | — | styles/kasa-efekt.css:37 |
| Düello | Ban girişi ses | ses gecikmesi | 160 | — | DuelloBanAni.jsx:104 |
| Düello | Damga / yuva iniş | kart damgası, yuva | 700 / 900 | — | DuelloSecim.jsx:219, 224 |
| Düello | Kart zıplama | sahiplik değişti | 1000 | — | DuelloPage.jsx:841 |
| Düello | Vuruş gecikmesi | sesDogru ile binmesin | 220 | — | DuelloPage.jsx:882 |
| Düello | Soru sesi gecikmesi | | 300 | — | DuelloPage.jsx:1098, 1103 |
| Düello | 50:50 kırılma | şıklar düşer | 760 | — | tasarim/hareket.js:9 (Klasik ile ortak) |
| Düello | v4 sonuç sesi | el değişti sesi | 650 | — | Duello4Arena.jsx:207 |
| Düello | v4 giriş 3-2-1 | | ≈ 1000 / rakam | 939–965 | sunucu `soru_baslangic` |
| Düello | v4 kart duyuru / bilet / sonuç | CSS | 450 / 420 / 400 / 360 | — | duello4/duello4.css:65, 187–190 |
| Düello | v4 son baskı / konfeti | CSS | 1600 (+750) / 1800 | — | duello4.css:191–192 |
| Düello | Ban perde / tarama / damga | CSS | 2200 / 1200 / 1800 / 520 | — | styles/duello-ban.css:75–103 |
| Düello | Yuva pop / +puan rozeti | CSS | 550 / 2200 | — | styles/duello-tahta.css:133, 369 |
| Ortak | VS ses | | 450 | — | AramaSahnesi.jsx:74 |
| Ortak (ağ) | yoklama / kanal / nabız / geri çekilme | 4000 · 1000 · 500 · 5000 · [1–8 sn] · 30 · 2000 · 4000 | — | sunum süresi değil; sunucu yükünü belirler — DuelloPage.jsx:81–100, KasaPage.jsx:72–81 |
| Ortak (sunucu) | soru 15 sn · karar 8 (5) sn · sonuç 3 sn · gösterim payı 1,5–2 sn · ban gösterim 880 ms | — | — | `oyun_ayarlari`, değiştirilmedi |

## 3. Doğrulama

- **Varsayılan = paket öncesi:** `--karsilastir=once,sonra` — 19 sahnenin hepsi ±6 % / 60 ms içinde (ör. AÇ 1124→1124,
  final 4339→4314, Hâkimiyet 2113→2120, sarsıntı 532→534). Çalma özetinde görülen 1793→1614 yalnız ölçüm birleştirmesinden
  (aynı araçta 1804→1805, 1617→1614).
- **Ayar etkisi** (`--ayar` ile o tarayıcıya seçim yazılıp oynatıldı): sarsıntı 520→**802** (800), Hâkimiyet 2100→**3030**
  (3000), çalma 1800→**2414** (2400), vuruş 1500→**2504** (2500), final 4300→**5515** (5500), kapalı kart 300→**607** (600),
  AÇ 1280→**1428** (1500; gösterim payı sınırı). Değiştirilmeyenler aynı kaldı.
- **/sure-ayar** (`araclar/sure-ayar-testi.mjs`): 15/15 — taşma 0, ≥ 44 px, noindex, kaydırıcı → localStorage, "Bu süreyi dene"
  ÇİFTE 2500 seçiminde 2522 ms, kopyala JSON, sıfırla, localStorage kapalıyken çökme yok (uyarı + sekme içinde geçerli).
