# Telefon kasması / donma — kök neden + düzeltme (16 Eki 2026, gece)

> Taklit sonuçları **gerçek telefonda doğrulanmadı**. Doğrulama 17 Eki 08:00'deki günlük izleme e-postasında ve
> `/yonetim/izleme › Akış bozulmaları`nda, **yalnız `kip = twa` satırlarıyla** yapılacak (aşağıda "Yarın neye bakılacak").

## 0 · Salt okuma analiz (canlı DB + Supabase istek kaydı, hiçbir şey değiştirilmedi)
O maç: **95d80d86** (idaGG, Hazine, dereceli; rakip gizli bot "oyuncu_e153fbd9", açgözlü). 19:20–19:54 TSİ arasında Ida'nın tek
maçı bu. Telefon 19:20–19:53 arasında ana sayfa / lig ekranlarında; 19:19'da bir Hazine daveti var (kabul edilmedi).

| Aşama (TSİ) | Sunucu çağrıları (sunucu süresi) | İstemci kare / donma | Akış olayı (1113) | Ses | Hata | Çift / sırasız |
|---|---|---|---|---|---|---|
| Arama 19:53:28,7–36,6 | kasa_ara ×5 (55–578 ms) | kayıtta yok | kayıtta yok | kayıtta yok | 0 | yok |
| Rakip bulundu → maç ekranı (3,7 sn) | kasa_giris 54 ms | kayıtta yok | kayıtta yok | kayıtta yok | 0 | yok |
| Giriş sahnesi + 3-2-1 (40,39 → 44,54) | kasa_durum ×5 (56–104 ms) | kayıtta yok | kayıtta yok | kayıtta yok | 0 | 44,27 / 44,50 art arda (sıralı zincir) |
| Soru 1 (44,54 → 48,56) | kasa_durum 49–60 ms; Ida 4,02 sn'de yanlış, bot doğru | kayıtta yok | kayıtta yok | kayıtta yok | 0 | kasa_cevap istek kaydında yok (DB'de var → kayıt eksik) |
| Sonuç 1 (→ 51,72) | kasa_durum 55–141 ms; hazine 0 → 2, puan 0–0 | kayıtta yok | kayıtta yok | kayıtta yok | 0 | yok |
| Karar: rakip DEVAM (bot 54,93), 2x: hazine 2 → 4 | kasa_durum 60–65 ms, sonra **9,25 sn hiç kasa_durum yok** (52,10 → 01,35) — sayfa görünür (nabız 54,45, joker paneli 56,53) | kayıtta yok | kayıtta yok | kayıtta yok | 0 | yok |
| Soru 2 (57,82 →) | kasa_durum 71 ms; son nabız 01,46 → telefon susuyor | kayıtta yok | kayıtta yok | — | 0 | — |
| Maç sonu | kayıtta yok (uygulama kapandı / arka plana alındı); sunucu 19:55:06 kopuk → bot kazandı | — | — | — | — | — |

- **Sunucu beklemesi yok.** Telefonun son 24 saatteki bütün maç çağrıları: kasa_durum p50 59 / p95 258 ms (358 çağrıda 1'i > 1 sn),
  duello_durum p50 186 / p95 708, kasa_cevap p50 90; 4xx/5xx 0. Sunucu fonksiyonu / yetki değişikliği gerekmedi.
- **Skor/sayaç karışması:** sunucu verisi tutarlı (0 → 2 → 4, puan 0–0). Okumalar sıralı zincirde ve imzayla tekilleştiriliyor →
  sırasız / çift yanıt işlenemez (kod incelendi: Hazine, Düello, Klasik nabız). Karışma görüntüsünün olası nedeni 9,25 sn'lik boşluk:
  ekran karar fazında kalıp DEVAM/2x anı ile yeni soruya birden atlıyor (aşağıda taklitle üretildi).
- **Gerçek telefondan HİÇ akış kaydı yoktu:** `akis_bozulma`'daki 40 satırın 40'ı ölçüm araçlarından (kip = tarayici); TWA 0.
  Nedenler: (a) 1113 16 Eki 11:01'de çıktı, telefon o saatten sonra yalnız bu 25 sn'lik maçı oynadı; (b) gizlenince gönderim önce
  oturumu bekleyip normal istek atıyordu — 19:54:01'den sonra hiç `istemci_kayit_yaz` yok (geç geçiş kaydedildiyse gitmedi);
  (c) `donma` eşiği 500 ms — gözle görülen 100–400 ms kasmalar hiç kaydedilmiyordu.
- **Son 7 gün en sık bozulma:** gerçek telefon için **kayıtta yok** (istek kaydı 1 gün tutuluyor). Araç satırları (taklit, yalnız bilgi):
  Hazine `ses_yok` 11 · `faz_gec` 9 · `sayac_sifir` 7; Düello `faz_gec` 3 · `sayac_sifir` 2. Telefonun Hazine yoklama boşlukları
  (24 sa, 6 maç): hepsi ≤ 4,5 sn (yedek yoklama), tek istisna bu maçtaki 9,3 sn (06:29 maçındaki 55,6 sn arka plan); Düello 7–11 sn.

## 1 · Kök nedenler ve düzeltmeler
| # | Kök neden (ölçüldü) | Düzeltme | Dosya |
|---|---|---|---|
| A | Telefon izleme verisi sunucuya varmıyordu + > 100 ms kareler hiç ölçülmüyordu | Kuyruk gizlenince / `pagehide`'da beklemeden `keepalive` istekle; belirteç önceden tutulur. Yeni olay `kasma`: maç başına tek özet, an = `aşama:adet` (en çok kasan önce), ms = en uzun kare (Long Animation Frames; maç sonunun ilk 5 sn'si `macsonu`). **Migration 1119** (tür listesi + kısıt + e-posta açıklaması; yetki/RLS aynı; yerel PGlite provası 12/12, canlıda uygulandı) | `src/lib/izlemeKaydi.js`, `oyun/lib/akisIzleme.js`, `oyun/pages/YonetimIzlemePage.jsx`, `supabase/migrations/20260612001119_izleme_kasma.sql`, `docs/izleme-1119-geri-al.sql` |
| B | Yanıtı kaybolan TEK okuma, sıralı zincirdeki bütün okumaları 10 sn'ye kadar bekletiyor → ekran donup birden atlıyor, sayaç 0'da kalıyor | **Askı kesici:** yoldaki okuma 3 sn'den uzun sürerken yeni okuma isteği gelirse yoldaki kesilir, yenisi hemen atılır; kesilen yanıt uygulanmaz (sıra korunur). Hazine + Düello + Klasik/Saf Bilgi/Grup nabzı (2,5 sn) | `oyun/pages/KasaPage.jsx`, `oyun/pages/DuelloPage.jsx`, `oyun/lib/nabiz.js` |
| C | 360×640 Grup: iki satırlık joker hak yazısı orta bölümü 8 px taşırıyor (çubuk 2 px kırpık, soru metni karta sığmıyor) | ≤ 700 px yükseklikte hak yazısı tek satır + üç nokta | `oyun/tasarim/ekranlar/m1-mac.css` |

**Bilinen kalanlar (izle ölçüldü, kod hatası değil / ayrı karar):**
- Ana iş parçacığı kasması taklitte görünmüyor: Hazine CPU 6x, Ida'nın gerçek kartıyla (lig_altin çerçeve, altın isim, BP parlaması)
  en uzun kare 83–100 ms, ≥ 100 ms kare 0–1. Süren animasyonlar transform/opacity (birleştirilmiş); boyama gerektiren tek sürekli
  geçiş sayaç halkası (`stroke-dashoffset`, 1 sn). S24 FE'de bu değerler ~3–4 kat daha kısa olmalı → telefondaki "her ekranda donma"nın
  ölçülebilen kaynağı B. Kesin dağılım yarın `kasma` kayıtlarından gelecek.
- SPA girişinde maç sayfasının ilk yerleşimi 184 ms (CPU 6x, 251 nesne) — gerçek akışta arama ekranı aynı avatarları önceden çizdiği için çoğunlukla orada ödeniyor; dokunulmadı.
- Hazine maç sonu dalgalı ağda en uzun kare 134 ms (iki derlemede aynı; `html.msk-acik` stil hesabı) — dokunulmadı.
- Kesik animasyon: rakip joker rozeti soru ekranıyla sökülüyor (tasarım kararı, önceki raporda) — dokunulmadı.
- **Grup "ad düğmesi kırpık" = 4./3. oyuncunun yatay kayan şeritte ekran dışında olması** (D-412, kaydırmayla görünür) — hata değil;
  ölçüm aracı artık "kaydırmalı şeritte (ekran dışı)" yazıyor, kırpık saymıyor. CSS değişmedi.
- **Turnuva 360×640: orta bölüm 54 px taşıyor** (önce 67) — joker çubuğunun büyük kısmı kaydırma alanının altında. Kapatmak için bilgi
  gizlemek / sıkıştırmak gerekiyor (aşağıda seçenekler) → **Ida kararı**.

## Önce / sonra
| Ölçü | Önce | Sonra | Kaynak |
|---|---|---|---|
| Gerçek telefondan akış kaydı (TWA) | 0 (40/40 satır araç) | yarın ölçülecek | canlı `akis_bozulma` |
| Gizlenince kuyruk gönderimi (taklit, normal / hemen dondurulan sayfa) | 4 ms · gönderildi | 3 ms · gönderildi (keepalive, oturum beklenmez) | `izleme-istemci-testi` — masaüstü dondurma eski kodda da kaybı üretmedi; gerçek telefonda doğrulanmadı |
| > 100 ms kare kaydı | yok (yalnız > 500 ms donma) | maç başına `kasma` özeti | `akis-kasma-test` 5/5 |
| Askı taklidi: faz geçişi > 1 sn | 9 / 33 | 7 / 37 | `hazine-akis-olcum --senaryo=aski` (CPU 6x, kozmetik=ida) |
| Askı taklidi: geçişin en kötüsü | **9820 ms** | **3576 ms** | aynı |
| Askı taklidi: sayaç 0'da > 1 sn | 3 kez, en uzun 6235 ms | **0** | aynı |
| Bot taklidi: en uzun kare (sonuç) · ≥ 100 ms kare | 100 ms · 1 | 83 ms · 0 | A/B, tek koşu (gürültü ±17 ms) |
| Bot taklidi: faz geçişi en kötü (cevap) | 858 ms | 746 ms | A/B |
| Dalgalı taklidi: maç sonu en uzun kare | 134 ms | 134 ms | A/B (değişmedi) |
| Dalgalı taklidi: sayaç 0'da en uzun | 1756 ms | 1806 ms | A/B (değişmedi; senaryonun kendi gecikmesi) |
| Ses ömrü (bot / dalgalı): ani kesilen | 0 / 0 | 0 / 0 | A/B |
| Çift / sırasız yanıt işlenmesi | 0 (zincir) | 0 (kesilen yanıt uygulanmaz) | kod + taklit |
| 360×640 Grup: joker çubuğu kırpık · orta bölüm taşması · soru metni taşıyor | 2 px · 8 px · evet | **0 · 0 · hayır** | `klasik-mac-ekran` TR+EN |
| 360×640 Turnuva: orta bölüm taşması | 67 px | 54 px (KALDI) | aynı |
| 390×844 / 1440×900 Grup + Turnuva | sığıyor | sığıyor (değişmedi) | aynı |

Ekran görüntüleri: `tasarim/gorsel-16eki/once|sonra/{grup,turnuva}-acik-{360x640,390x844,1440x900}-{tr,en}.png`.

## Turnuva 360×640 — karar seçenekleri (Ida)
1. "Canlı · N oyuncu hayatta" satırını kısa ekranda yalnız ekran okuyucuya bırakmak (üstteki "N/M oyuncu kaldı" aynı sayıyı gösteriyor) → −28 px.
2. Üst oyuncu kartını kısa ekranda %80 küçültmek (1v1'deki desen) → ~−13 px.
3. Boş sonuç yuvasını (44 px) kısa ekranda akış dışına almak (sonuç bandı soluk joker çubuğunun üstüne düşer) → −52 px, tek başına yeter.
Bugün hiçbiri uygulanmadı; jokerler orta bölüm kaydırılarak erişilebilir.

## Yarın (17 Eki 08:00 e-postası + /yonetim/izleme) neye bakılacak — yalnız `kip = twa`
| Olay | Beklenen | Eşik |
|---|---|---|
| `kasma` | **GELMELİ** (gelmezse telefon izlemesi hâlâ kırık). İlk gerçek dağılım: hangi aşama (`cevap`/`sonuc`/`karar`/`baslangic`/`macsonu`) kaç kare, en uzun kaç ms | kare > 100 ms; hedef maç başına ≤ 3 kare, en uzun < 150 ms |
| `faz_gec` | askı tipi geç geçişler düşmeli; `gecikme_ms` ~10 000'e varan değer görülmemeli | > 1 sn kaydedilir; hedef ≤ 4000 ms (askı kesici + yedek yoklama) |
| `sayac_sifir` | 0'da 5–6 sn kalma görülmemeli | > 1 sn kaydedilir; hedef ≤ 2000 ms |
| `donma` | var mı (500 ms üstü) | > 500 ms; hedef 0 |
| `ses_gec` / `ses_yok` / `ses_kesildi` | bu paket değiştirmedi — taban çizgisi | 300 ms / — / kalan > 150 ms |
Not: e-posta son 24 saati sayar; bugünkü ölçüm koşuları `kip = tarayici` görünür, onları sayma.

## Test tablosu (docs/TEST-KAPSAMI.md)
| Madde | Kapsam | Sonuç | Not |
|---|---|---|---|
| 1 Dokunma · 2 Görünüm (16 sayfa × 4 genişlik) · iOS kuralları | `arayuz-denetim` | BAKILAMADI | misafir/test hesabı gerekiyor (yeni hesap açılmaz, Ida oturumu bu araca verilmez); değişen CSS yalnız ≤ 700 px soru ekranı |
| 2 Görünüm — maç ekranları | `klasik-mac-ekran` Grup + Turnuva × 360×640 / 390×844 / 1440×900 × TR+EN (taklit) | GEÇTİ (Grup) · KALDI (Turnuva 360×640, karar bekliyor) | yatay taşma 0, örtüşme 0 |
| 2 Görünüm — Düello | `duello-v4-ekran` | BAKILAMADI | araç test hesabı oturum dosyası istiyor (yok) |
| 3 Animasyon — > 100 ms kare | Hazine taklit A/B bot + dalgalı + askı, CPU 6x, Ida kartı; iz + animasyon dökümü | GEÇTİ (maç içi) · KALDI (dalgalı maç sonu 134, değişmedi) | gerçek telefonda doğrulanmadı |
| 3 Animasyon — kesilen | Hazine taklit | GEÇTİ / sınıflı | yeni 0–3; rakip joker rozeti eski karar |
| 3 Hareket azaltma | — | BAKILAMADI (bu pakette yeniden koşulmadı) | animasyon kodu değişmedi |
| 4 Ses | Hazine taklit ses ömrü A/B | GEÇTİ | ani kesilen 0; ses-kesilme 6 mod yeniden koşulmadı (ses.js değişmedi; yalnız maç sonu penceresinde `akisMacAcik` false — eski davranış) |
| 5 Zamanlama — faz geçişi / sayaç 0 | askı + bot + dalgalı taklit A/B | GEÇTİ | askı 9,8 → 3,6 sn; sayaç 0'da 6,2 sn → 0 |
| 5 Erken süre bildirimi | `sure-bildirim-olcum` (bellekte) | GEÇTİ | sonuçlar önceki paketle aynı (kod değişmedi) |
| 5 3-2-1 | Hazine taklit | GEÇTİ | 981–1048 ms |
| 5 Senkron (bütün modlar) | `senkron-testi` | BAKILAMADI | her moda canlı maç açıyor (canlı yük kuralı); Turnuva taklidi koşulmadı |
| 6 Akış · 7 Veri · 8 Konsol | canlı duman: Ida, açık bot, tek Hazine maçı, yerel üretim derlemesi, CPU 6x | GEÇTİ | maç bitti (17 tur, hedef); 3-2-1 999/1006/1077 ms; ses 109/111 (2 arama sesi faz iptali), ani kesilen 0; konsol 0; **canlı `kasma` kaydı yazıldı**: `macsonu:4 cevap:3 baslangic:2 sonuc:2`, en uzun 273 ms (kip tarayici, CPU 6x) |
| 8 Konsol | `izleme-istemci-testi` + taklit koşular | GEÇTİ | konsol hatası 0 |
| Birim | `npm run test:kurallar` (+ yeni `akis-kasma-test`), `test:dans` | GEÇTİ | `npm test` sunucu bölümü canlı DB'ye yazdığı için koşulmadı |


# Soru düzeltme 2 canlıda — rapor (16 Eki 2026, akşam)

## Kategori bazında aktif soru — önce / sonra (canlı, salt okuma)

| Kategori | Aktif önce | Aktif sonra | Pasif | EN kullanılabilir önce → sonra | Rekabetçi havuz dışı (şüpheli) önce → sonra |
|---|---:|---:|---:|---:|---:|
| bilim | 1.184 | 1.182 | 2 | 1.184 → 1.182 | 166 → 53 |
| cografya | 1.555 | 1.550 | 5 | 1.474 → 1.469 | 289 → 73 |
| edebiyat | 1.519 | 1.519 | 0 | 1.495 → 1.494 (1 EN eskidi) | 231 → 99 |
| genel_kultur | 1.160 | 1.160 | 0 | 1.132 → 1.132 | 16 → 7 |
| muzik | 1.564 | 1.564 | 0 | 1.559 → 1.559 | 252 → 101 |
| sanat | 1.585 | 1.583 | 2 | 1.583 → 1.581 | 230 → 92 |
| sinema | 1.528 | 1.524 | 4 | 1.522 → 1.518 | 295 → 129 |
| spor | 1.435 | 1.432 | 3 | 1.432 → 1.429 | 182 → 49 |
| tarih | 1.502 | 1.500 | 2 | 1.500 → 1.498 | 190 → 46 |
| teknoloji | 1.691 | 1.690 | 1 | 1.689 → 1.688 | 332 → 186 |
| **Toplam** | **14.723** | **14.704** | **19** | **14.570 → 14.550** | **2.183 → 835** |

Pasifler kategori dengesini bozmadı: en çok kayıp coğrafyada (5 soru, %0,32); hiçbir kategori %0,3'ten fazla küçülmedi.
Yan etki (beklenen): `trg_questions_kural_isaret` yeni şıklar için şüphe işaretlerini yeniden hesapladı. Rekabetçi havuzdan
dışlanan aktif soru sayısı 2.183'ten 835'e indi. Bunun nedeni, düzeltmenin hedefinin "doğru şık en uzun / çok kelimeli" ipuçlarını kaldırmak olması.

## Özet
- **Migration `20260612001118_soru_duzelt_2.sql` canlıda** (`araclar/migration-uygula.mjs`, tek işlem + ledger).
  Kaynak: `C:\Users\ida\Desktop\soru-duzelt-2\parti-001..010.jsonl` (1.931 satır = 1.911 düzeltildi + 19 pasif önerisi + 1 en_eskidi).
- **Yazılan:** `questions` 1.906 satır (19'u aktif=false), `question_translations` (en) 1.908 satır. 24 satırda yalnız EN değişti
  (TR aynı). **Atlanan: 0**. Kayma: **0**.
- **en_eskidi** (`b5e6ca35…`, edebiyat "'Nüsha' ne demektir?"): Ida kararıyla TR'ye dokunulmadı. EN eski metniyle `eskidi=true`.
  Codex verisi bu satırda TR'yi de değiştiriyordu; o kısım uygulanmadı.
- **Taslak neden kullanılmadı:** `taslak-migration.sql` ikinci çalıştırmada hata veriyordu (idempotent değil). İçindeki `begin/commit`
  migration-uygula'nın tek işlemini bölüyordu. en_eskidi satırında TR'yi değiştiriyordu. Migration parti dosyalarından yeniden üretildi.
  Taslak ve geri-al taslağı yerinde duruyor, dokunulmadı.
- **Geri alma:** `docs/soru-duzelt-2-geri-al.sql`. Migration'dan hemen önce canlıdan okunan TR+EN hâlini (eskidi_at dahil) geri yükler.
  Yalnız migration'ın yazdığı hâldeki satırları yazar, başka hâldeki satır varsa durur. Kendi `begin/commit`'i var.
- **Yedek:** `node araclar/yedek-al.mjs` → `C:\Users\ida\Desktop\quiztactics-yedek\2026-10-16` (93,2 MB, 217 tablo, questions 19.628 satır).

## Koruma (migration içinde)
- Hedef satır başlangıç ya da hedef hâlinde olmalı. Üçüncü bir hâl varsa (yedekten sonra değişmiş) işlem hata ile durur ve hiçbir satır yazılmaz.
- `update … where id eşleşir and (soru, secenekler, dogru_cevap, aktif, surum, zorluk) = eski`. EN için `(soru, secenekler, eskidi) = eski`.
  Hedef hâldeki satır atlanır, bu yüzden migration idempotent.
- Sonda `kategori_havuz_yenile()` çalışır (taslaktaki gibi).

## Doğrulama
| Adım | Sonuç |
|---|---|
| Parti uyumu | 1.931 satır, 1.931 tekil id. Doğru indeks 1.931/1.931 aynı. 4 farklı şık TR+EN 1.931/1.931. Pasif 19 (taslak da aktif=false yapıyordu) |
| Kayma (canlı, salt okuma) | 1.931 id'nin TR (soru, şıklar, doğru, aktif, sürüm, zorluk) ve EN (soru, şıklar, eskidi, eskidi_at) hâli yedekle birebir aynı: **0 kayma** |
| Tekillik (`questions.soru` UNIQUE) | Değişen 453 kökten hiçbiri canlıda başka soruyla çakışmıyor |
| Yerel PGlite (repo dışı) | 1.931 hedef + 300 hedef dışı soru, canlı tetikleyicilerle: **17/17**. Migration TR 1.906 / EN 1.908 = beklenen, pasif 19, hedef dışı ve başka kolon değişmedi. İkinci çalıştırmada değişiklik yok. Geri-al birebir eski hâli getirdi (supheli_isaretler, eskidi_at dahil). Kayma senaryosunda işlem durdu, hiçbir satır yazılmadı |
| Canlı son kontrol (salt okuma) | 1.931/1.931 TR ve EN hedef hâlde. 1.911 aktif satır yeni metinde, 1 satır yalnız EN eskidi (TR eski, karar gereği), 19 pasif. Toplam aktif 14.723 → 14.704 (−19). Rastgele 20 soru TR+EN 20/20. kategori/kapsam/denetim kolonları değişmedi. Ledger'da 20260612001118 kayıtlı |

# Hazine / Düello zamanlama gecikmeleri + Gizlilik/Koşullar veri sorumlusu — rapor (16 Eki 2026, gece)

## Özet
- **A · Hazine sonuç geçişi 4,2 sn:** kod hatası değil. O dakikada (14:04:40–14:05:20 UTC) **canlı veritabanı ~40 sn yavaşladı** — bütün
  RPC'ler 1,7–4,2 sn (kasa_durum, kalp_at, coin_bakiyem, envanterim, istemci_kayit_yaz), cron işleri 2 sn geç başladı. İstemci bitiş
  isteğini zamanında attı (tur, isteğin varışından 43 ms sonra ilerledi), yanıt 3,3 / 4,0 sn sürdü. Maçın geri kalanında kasa_durum
  p50 86 ms. Uygulama koduna düzeltme gerekmiyor; geçiş sunucu yanıtı kadar gecikir.
- **B · Düello nötr sayaç 0'da 1,8 sn:** kök neden istemcide, düzeltildi. "Cevabım yok" (1114) bildirimi düzgünleştirilmiş sayaç saatiyle
  ve soru başında bir kez zamanlanıyordu; yavaş yanıtlar saat örneğini öne kaydırınca bildirim sunucuya **erken** vardı → `Süre dolmadı`
  (canlı postgres log 14:15:25.011) → 600 ms bekleme → yeniden deneme. 1114 düzeltmesi nötr yolu kapsıyordu; sorun gönderim anıydı.
- **Düzeltme (kural/süre/görünüm aynı):** `sunucuSaati.js › sureBildirimMs` — sayaç saati ile en iyi saat örneğinin GEÇ olanı + 150 ms;
  gönderim anında yeniden bakılır, erkense yeniden kurulur; red sonrası `sureBildirimTekrarMs` 150–600 ms. Düello v4 (soru + kart) ve
  Hazine (cevap + karar) — mod paritesi. Sayaç 0'ı göstermeden bildirim gitmez.
- **C · Klasik / Saf Bilgi / Grup / Turnuva: desen YOK** — bildirim sorunun kendi saat farkıyla + 0,6 sn payla gider ve 0'da "Süre doldu"
  ekranı sayacın yerini alır; 16 Eki izleme kayıtlarında bu modlarda tek olay yok.
- **D · Gizlilik/Koşullar:** "Veri sorumlusu: Ida Güreli (Quiz Tactics). İletişim: info@quiztactics.com" · Koşullar "Ida Güreli adlı gerçek
  kişi" (TR+EN, son güncelleme 16 Ekim 2026). Adres / kişisel e-posta yok. Koddaki "unvan/adres yok" yorumu ve Play Store notu güncellendi.
- Migration **yok** (sunucu fonksiyonu / yetki değişmedi). Yeni araç `araclar/sure-bildirim-olcum.mjs`; `hazine-akis-olcum.mjs`'ye
  `yavas_sunucu` senaryosu + faz geçişi (sunucu → istemci) + erken bildirim sayımı.

## A · Hazine — kanıt (canlı, salt okuma)
Maç e4dfd87e (Ida, açık bot, yavaş telefon taklidi), `akis_bozulma`: `faz_gec sonuc` 4211 / 4245 ms, `sayac_sifir karar` 1195, `faz_gec karar` 1236.

| Ne | Ölçü |
|---|---|
| Edge log, maçın 135–176. sn'si | kasa_durum 2641 · 3304 · 2690 · 1736 · 3595 · 4032 ms (`x_envoy_upstream_service_time` ≈ aynı → bekleme PostgREST/DB'de) |
| Aynı maç, öncesi/sonrası | kasa_durum p50 86 ms (160 çağrı); > 1 sn olan 12 çağrının hepsi bu pencerede |
| Aynı pencerede başka uçlar | kalp_at 2811 / 2954, envanterim 3068, coin_bakiyem 2606, kasa_joker_durumu 3213, istemci_kayit_yaz 4211 ms |
| Cron | 14:05 dakika işleri 14:05:02'de başladı (2 sn geç), hizli_tik 839 ms (normal 38) |
| İstemci zamanlaması | sonuç bitişindeki istek, tur ilerlemesinden 43 ms önce sunucuya vardı — istemci geç kalmadı |
| Sebep | o 40 sn'de API'ye yalnız bu maçın istekleri geldi (yük yok) → nano sunucunun genel duraklaması (CPU/disk G/Ç); kod yolu değil |

Taklit (yerel, `hazine-akis-olcum.mjs`, CPU 6x · yavaş 4G · 390×844, eski 5198 ↔ yeni 5199, senaryo başına bir maç):

| Senaryo | Faz geçişi sunucu → istemci, önce (sonuç / karar / soru — ort·en kötü ms) | sonra | Sayaç 0'da en uzun önce → sonra | Erken bildirim |
|---|---|---|---|---|
| bot | 257·303 / 145·224 / 292·634 | 254·388 / 138·240 / 260·578 | 0 → 0 | 0 / 0 |
| dalgalı | 1503·2346 / 1224·2069 / 1168·1902 | 1256·2307 / 1173·1613 / 1098·1696 | 2233 → **1206** | 0 / 0 |
| yavaş sunucu (canlı 14:04 taklidi) | 2426·6049 / 2231·5892 / 1999·4810 | 2331·6056 / 1803·5275 / 2896·6975 | 6919 → 4264 | 0 / 0 |

Yavaş sunucu taklidi canlıdaki 4,2 sn'yi yeniden üretiyor ve iki derlemede aynı: geçiş gecikmesi = sunucu yanıt süresi.

## B · Düello — kanıt ve önce/sonra
Maç b383d002 (Ida, açık bot): edge log `duello_cevap` 14:15:24.648 → 400 `Süre dolmadı` (14:15:25.011) → 600 ms sonra 14:15:25.943 kabul →
durum okuması → yeni faz. Öncesinde `sayac_sapma` 836 ms, açılışta yavaş yanıtlar (duello_durum 1646, duello_giris 1495 ms).
Bellekte ölçüm (`sure-bildirim-olcum.mjs`, gerçek `sunucuSaati.js`, sanal saat, senaryo başına 4000 soru):

| Senaryo | Sayaç 0'da ort · p95 (ms) önce | sonra | Red oranı önce → sonra | Sayaç > 0 iken giden bildirim önce → sonra |
|---|---|---|---|---|
| normal | 683 · 755 | 684 · 755 | %0 → %0 | 0 → 0 |
| ilk yanıtlar yavaş (canlı 14:15 kaydı) | 937 · 1048 | **689 · 758** | **%100 → %0** | 4000 → **0** |
| dalgalı ağ | 1347 · 2071 | 1439 · 2071 | %0,5 → %0 | 113 → **0** |
| yavaş sunucu | 3546 · 7068 | 3708 · 6859 | %11,6 → %1,3 | 556 → **0** |

Dalgalı/yavaşta ortalamanın ~90–160 ms uzaması kasıtlı: eski yöntem bu durumların bir kısmında sayaç hâlâ > 0 iken (oyuncu dokunabilirken)
"cevabım yok" gönderiyordu; yenisi göndermiyor. Birim testi `oyun/_test/sayac-saati-test.mjs` 10/10 (3 yeni).

## Test tablosu (docs/TEST-KAPSAMI.md)
| Madde | Kapsam | Sonuç | Not |
|---|---|---|---|
| 5 Zamanlama — faz geçişi | Hazine taklit bot/dalgalı/yavaş sunucu (önce/sonra) + canlı izleme / edge log çözümlemesi | GEÇTİ (kod) · KALDI (sunucu) | geç geçişler yalnız sunucu yavaşlığında |
| 5 Zamanlama — sayaç 0'da > 1 sn | Hazine taklit, Düello/Hazine bellek ölçümü | GEÇTİ (düzeldi) | dalgalı 2233 → 1206 ms; yavaş sunucuda sunucu süresi kadar kalır |
| 5 Erken süre bildirimi | bellek ölçümü (4 senaryo × 4000) + Hazine taklit | GEÇTİ | sonra red %0–1,3, sayaç > 0 iken gönderim 0 |
| 5 Sıçrama / rakam süresi | Hazine taklit 3 senaryo × 2 derleme | GEÇTİ | sıçrama 0, rakam 894–1217 ms |
| 2 Görünüm — Gizlilik/Koşullar | TR+EN × 360/390 (yerel, ağ taklit) | GEÇTİ | yeni ad görünüyor, eski ifade 0, taşma 0, konsol hatası 0, kişisel e-posta 0 |
| 2 Görünüm — maç ekranları | `klasik-mac-ekran` Klasik/Saf/uzun/Grup/Turnuva × TR+EN × 360/390 (taklit) | KALDI (eski) | Grup `ls-ad-dugme` kırpık (önceki raporda da); 360×640'ta Grup/Turnuva joker satırı 1–2 px — CSS'e dokunulmadı |
| 3 Animasyon — kesilen | Hazine taklit | KALDI (sınıflı, eski) | dalgalıda rakip joker rozeti + ÇİFTE efekti karar ekranı ağ gecikmesiyle gelince sökülüyor; bot/yavaş 0–1 |
| 4 Ses | `ses-kesilme-olcum` 6 mod: eski CPU 1x/6x + yeni CPU 1x; Hazine taklit ses ömrü (3 senaryo × 2) | GEÇTİ (kısmen) | ani kesilen 0; yeni CPU 6x **BAKILAMADI** — sistem bellek darlığında ölçümü durdurdu |
| 1 Dokunma · 2 Görünüm (16 sayfa × 4 genişlik) · iOS kuralları | `arayuz-denetim` | **BAKILAMADI** | misafir/test hesabı açmadan çalışmıyor (yeni hesap açılmaz, Ida oturumu bu araca verilmez); CSS/yerleşim değişmedi |
| Düello v4 ekran turu · ses zamanlaması | `duello-v4-ekran`, `ses-zamanlama-olcum` | **BAKILAMADI** | taklit olmayan RPC'leri oturumla canlıya iletiyor; oturum dosyası yok (aynı neden) |
| 6 Akış · 7 Veri · 3 kare (canlı Klasik/Düello/Hazine, CPU 6x yavaş 4G 390×844) | `yavas-android-olcum --mac --ida` | **BAKILAMADI** | sistem bellek darlığında yerel sunucuları durdurdu; talimat gereği yeniden açılmadı. Değişen yalnız bildirim zamanlaması |
| Senkron testi | `senkron-testi` | **BAKILAMADI** | misafir hesabı açıyor |
| 8 Konsol | taklit koşular + yasal sayfalar | GEÇTİ | JS hatası 0 |
| Yerel testler | `test:kurallar` (8 + 10), `test:dans`, `npm run build` (+ iOS ayrıştırma) | GEÇTİ | |
| `npm test` (sunucu) | | BAKILAMADI | `_test/sunucu` canlı DB'de işlem açıyor (kural) |
| iOS gerçek cihaz | | BAKILAMADI | WebKit bu makinede çalışmıyor |

## Karar bekleyenler
1. **Canlı DB duraklaması** (14:04:40–14:05:20 UTC, yük yokken bütün RPC'ler 2–4 sn): nano sunucunun genel durması. Kod düzeltmesiyle
   kapanmaz; tekrar ederse sunucu boyutu (ücretli plan) kararı Ida'nın. Günlük izleme e-postası bunu `faz_gec` olarak gösterir.
2. Önceki paketten açık: rakip joker rozeti yarıda kayboluyor (görünüm kararı), maç sonu ilk çizimi 150–160 ms.

## Telefonda bakılacak 3 şey
1. Düello'da nötr soruda hiç dokunmadan süreyi bitir: sayaç 0'a inince sonuç ~1 sn içinde gelmeli (önce ~2 sn).
2. Hazine'de cevaplamadan süreyi bitir; karar sende iken AÇ/DEVAM'a basma: 0'dan kısa süre sonra sonuç / "Süre doldu · DEVAM" gelmeli.
3. Gizlilik ve Kullanım Koşulları: "Ida Güreli (Quiz Tactics)" / "Ida Güreli adlı gerçek kişi", İngilizcede de aynı.

---

# Sesli sohbet kaldırıldı + Maç içi kasmalar — rapor (16 Eki 2026, akşam)

## Ne yapıldı
- **A · Sesli sohbet her yerden kalktı** (bütün modlar). Sunucu kapısı kapandı (1117, geri alınabilir, yetkiler aynı).
- **B · Kasma kök nedeni ölçüldü** (Chrome izi + kaynak haritası, her uzun görev için sorumlu adıyla). Maç sonu sahnesinin açılış
  görevi küçültüldü; maç içi kalan maliyetler ve ölçüm artefaktları ayrıldı. Görünüm, süreler ve oyun kuralları değişmedi.
- Yeni/ genişleyen ölçüm araçları: `araclar/iz-coz.mjs` (iz çözümleyici, `--gecersiz` ile stil geçersizleştirme nedeni),
  `araclar/profil-coz.mjs` (CPU profili → kaynak), `yavas-android-olcum.mjs --iz_mac --videosuz`, `hazine-akis-olcum.mjs --spa --azalt
  --tani_has --dom_svg`.

## A · Sesli sohbet — kaldırılanlar (kalan referans: **0**)
| Yer | Ne kalktı |
|---|---|
| `oyun/components/SesliSohbet.jsx`, `oyun/lib/sesliSohbet.js` | dosyalar silindi (WebRTC, mikrofon, davet/kabul arayüzü) |
| `oyun/pages/MatchPage.jsx` | import, `sesYuva` durumu, iki `.bd-ses-yuva` yuvası, `<SesliSohbet …/>` çağrısı, ilgili yorumlar |
| `oyun/styles/tema.css` | "MAÇ İÇİ SESLİ SOHBET" bloğu (`bd-ses-yanip`), `.bd-ses-yuva:empty` |
| `oyun/tasarim/ekranlar/m1-mac.css` | `.m1-ses-satir/-metin/-cagri/-nokta/-bilgi`; `.bd-ses-yuva` kuralları (kısa ekranda tepki düğmesinin ortalanması `.m1-alt--1v1` ile aynen korundu). `.m1-ses` kaldı — maç içi ses ayarı düğmesi (`MacUstSerit`) kullanıyor |
| `oyun/lib/ceviri/temel.js` | 43 anahtar (TR+EN; yalnız başka yerde kullanılmayanlar) |
| `oyun/pages/GizlilikPage.jsx` | "Sesli sohbet" bölümü (mikrofon, WebRTC, IP adresi paragrafları); son güncelleme 16 Ekim 2026 |
| `oyun/pages/KosullarPage.jsx` | taciz maddesinde "sesli sohbette", "Sesli sohbette izinsiz kayıt" maddesi, "Sesli sohbet bunun dışındadır" paragrafı; son güncelleme 16 Ekim 2026 (EN: `ceviri/kosullar.js`) |
| `docs/play-store/*` | veri güvenliği ("uygulama mikrofon kullanmaz"), içerik derecelendirme, mağaza metni TR+EN |
| Korunan | `Ikon.jsx › mikrofon` ikonu (Görünüm › Dans kullanıyor; yorum düzeltildi) |

Tarama (`sesli|SesliSohbet|webrtc|RTCPeerConnection|getUserMedia|mac_sonu_sesli|sesli_sohbet|bd-ses-yuva`): kaynakta 0, derlemede
(`dist/assets`) 0. **Migration 1117** (`20260612001117_sesli_sohbet_kaldirildi.sql`, canlıda): `sesli_sohbet_izni` silinmedi; her çağrıda
`izinli=false, 'Sesli sohbet kaldırıldı'`. ROLLBACK provası (1117 + geri alma dosyası) temiz; uygulandıktan sonra ACL aynı
(`authenticated`, `service_role`), `security definer` aynı. `mac_sonu_sesli_sn` satırı ve eski veri durur. Geri alma:
`docs/sesli-sohbet-1117-geri-al.sql` (canlıdan okunan 206 gövdesi). `TEST-KAPSAMI.md`'de sesli sohbet maddesi yoktu.

## B · Kasmalar — kök neden (ölçüldü)
Ölçüm: CPU 6x · yavaş 4G · 390×844 Android. Canlı: test hesabı (izli) + Ida (duman, videosuz). Yerel: Hazine taklit (bot / gecikmeli /
dalgalı), A/B dönüşümlü (eski derleme 5198 ↔ yeni 5199).
| Önceki "en uzun kare" | Gerçek sorumlu | Tür |
|---|---|---|
| Klasik 305 · Düello 498 · Hazine 497 ms | **ilk 5 sn**: aracın maça `page.goto` ile girmesi = uygulamanın soğuk açılışı (JS derleme, kabuk çizimi 119 ms, `new AudioContext()` 179 ms, ilk yerleşim 203 ms). Gerçek oyuncu maça uygulama içinden (SPA) girer | ölçüm yolu (soğuk açılış) |
| maç içi 117–284 ms kareler (31 / 9 / 39 adet) | **ekran videosu kodlaması**: aynı canlı akış videosuz 0–5 adet; taklitte video +15–35 ms ekliyor | ölçüm artefaktı |
| soru geçişi 95–120 ms görev | yeni sorunun yeniden kurulan DOM'u (Hazine ~690, Klasik ~330 öğe stil hesabı, CPU 6x 30–42 ms) + yerleşim + React; `:has()` kuralları silinince değişmiyor (311 öğe) | gerçek, < 150 |
| dokunuş 95–148 ms görev | React tıklama işlemesi (30–60 ms) + şıkların sınıf/disabled değişimiyle stil | gerçek, < 150 |
| maç sonu 125–200 ms | `MacSonuKutlama`: (1) `--msk-ust` / `--msk-sigdir` kalıtsal özel değişkenleri sahnenin 350–500 öğesini 2–3 kez yeniden stilliyordu, (2) açılış görevinde iki zorunlu ölçüm (436: üst blok ölçümü 20–23 ms, 466: sığdırma 26–31 ms) | gerçek → **düzeltildi (kısmen)** |
| SPA girişinde 168 ms tek yerleşim (taklit Hazine) | avatar SVG görsellerinin (`/avatars/pro*/…svg`) ilk görünüşü (SVG belge kurulumu; `visibility:hidden` ile kayboluyor) | gerçek ama gerçek akışta arama ekranı avatarları önceden gösterdiğinden çoğunlukla orada ödenir |

**Düzeltme (görünüm aynı):** `@property --msk-ust { inherits: false }` (yalnız kökün `top`unda kullanılıyor), `--msk-sigdir` yalnız
ölçek < 1 iken ve değişince yazılır (CSS yalnız `[data-sikisik]` altında, varsayılan 1), üst blok ilk ölçümü ResizeObserver'ın ilk
gözleminde (aynı kare, yerleşimden sonra, boyamadan önce), gövde sınıfı değişimi bir sonraki kareye ertelendi. Denenip **geri alınan**:
sığdırma ölçümünü ResizeObserver'a taşımak (kareyi uzattı), rakip joker rozetini sonuç fazında tutmak (sahne faz anahtarıyla yeniden
kurulduğu için kesik sayısı arttı).

### Önce / sonra
| Mod · senaryo | Ölçü | Önce | Sonra |
|---|---|---|---|
| Hazine taklit · bot (A/B, 2 çift) | maç sonu açılış görevi | 117 · 112 ms | **78 · 78 ms** |
| Hazine taklit · dalgalı (A/B, 2 çift) | maç sonu açılış görevi | 117 · 115 ms | **77 · 78 ms** |
| Hazine taklit · bot / dalgalı | maç sonu en uzun kare (aynı anda koşulan A/B) | 134·117 / 118·117 | 117·117 / 100·117 (makine yükünde iki derleme de 117'de; sakin anda sonra: bot 69 · gecikmeli 70 · EN/360 50 · azalt 50) |
| Hazine taklit · bot / gecikmeli / dalgalı | maç içi en uzun kare (sonuç · AÇ · DEVAM) | 71 / 54 / 125 | 71 / 71 / 89 — bu paket maç içi koda dokunmadı; fark koşular arası gürültü |
| Canlı Klasik (Ida, videosuz) | maç içi en uzun kare · > 100 ms kare | 305 · 31 (videolu) | **150 · 15** |
| Canlı Düello (Ida, videosuz) | aynı | 230 · 9 (videolu) | **134 · 4** |
| Canlı Hazine (Ida, videosuz) | aynı | 177 · 39 (videolu) | **134 · 23** (bir kez 200 ms, uzun görevsiz) |
| Canlı test hesabı (izli, videosuz) | maç içi en uzun görev | — | Klasik 79 · Hazine 86 ms |
| Canlı (Ida) | açılış (ilk 5 sn, soğuk) | 284 / 498 / 497 | 329 / 300 / 467 (soğuk yükleme — aracın yolu) |
| Canlı (Ida) | maç sonu görevleri | 161 / 200 / 149 | 161 / 160 / 153 |
| Kesik CSS animasyonu (Hazine taklit, 10 maç) | — | 0–3 / maç | 0–3 / maç (dalgalıda bir koşuda 21: aşağıda) |

**Hedefler:** maç içi < 150 ms — Düello 134 ✓, Hazine 134 ✓ (tek 200 ms kare uzun görev içermiyor; araç yoklaması/GC), Klasik **150 = sınırda,
tutmadı** (tek kare, soru geçişi 119 ms görev). Hazine maç sonu < 100 ms — taklitte açılış görevi 78 ms ✓, kare sakin makinede 50–70 ✓,
yüklü makinede 100–117 ✗; canlıda Ida profiliyle maç sonu görevleri 152–161 ms ✗ — kalan, sahnenin ilk React çizimi (Ida'nın çerçeve, lig
amblemi, XP/level, görev ve rozet içeriğiyle taklitten ~2 kat ağır); ilk çizimi parçalamak sahnenin beliriş sırasını etkiler → karar bekliyor.

### Kesik animasyonlar (3–7) — sınıflama
| Animasyon | Ne zaman | Sınıf |
|---|---|---|
| `qt-h-konfeti`, `ks-dogru-isik` (16+1) | dalgalı ağda sonuç ekranı geç görününce karar ekranı gelir, ekranla birlikte gider | ekran geçişi (ağ gecikmesi) — kod hatası değil |
| `ks-rakip-joker` rozeti + içindeki `qt-h-zipla` (7+1) | iki taraf cevaplayınca soru ekranı sonuç ekranına geçer, rozet soru ekranıyla sökülür | **gerçek, görünür** (rozet tam görünürken kaybolur) — düzeltmesi tasarım kararı (aşağıda) |
| `ks-karar-yakin/isik` (2+2) | karar ekranı ağ gecikmesiyle geç görünüp yeni soruyla gider | ekran geçişi |
| `ks-titre` (2), `ks-kalp` (4) | sandığın 2 px titremesi / kalp atışı, karar/soru ekranı değişince | görünmez (2 px) / ekran geçişi |
| `ks-giris-sayi` (1) | dalgalı ağda saat atlaması: "1" rakamı 534/1000 ms'de | dalgalı senaryoya özgü (saat atlaması taklidi) |

## Test tablosu (docs/TEST-KAPSAMI.md)
| Madde | Kapsam | Sonuç | Not |
|---|---|---|---|
| A · sesli sohbet düğmesi yok | Klasik, Saf, Grup, Turnuva (`klasik-mac-ekran`, taklit), Düello (`duello-v4-ekran`), Hazine (taklit) · 360/390 · TR+EN; kaynak + derleme taraması | GEÇTİ | arayüzde mikrofon/sesli sohbet yok; derlemede metin/WebRTC 0 |
| 1 Dokunma | `arayuz-denetim` (16 sayfa × 1440/850/560/390, test hesabı), maç ekran turları | GEÇTİ | 44 px altı 0, kapalı hedef 0 |
| 2 Görünüm | aynı + `klasik-mac-ekran` (20 kombinasyon), `duello-v4-ekran` (750 denetim) | **KALDI (eski)** | Grup: `ls-ad-dugme` ad kırpık (paket öncesi CSS'le de aynı); Düello `00-giris` tek ekran/sayaç beklentisi 6–10 (paket öncesi kaynakta da aynı). Bu paketin değişikliğiyle ilgisiz |
| 2 iOS kuralları | `arayuz-denetim` | GEÇTİ | fixed+transform 0, transform'lu ata 0, 100vh 0 |
| 3 Animasyon — maç içi > 100 ms kare | canlı 3 mod (Ida) + Hazine taklit 3 senaryo, CPU 6x | **KALDI (kısmen)** | yukarıdaki tablo: Klasik 150 sınırda; maç sonu canlıda 152–161 ms görev |
| 3 Animasyon — kesilen | Hazine taklit 10+ maç | KALDI (sınıflandı) | gerçek görünür olan yalnız rakip joker rozeti; gerisi ekran geçişi |
| 3 Hareket azaltma | Hazine taklit `--azalt`, Düello 360 TR azalt | GEÇTİ | maç sonu 50 ms, kesik 0, sonsuz döngü yok |
| 4 Ses | canlı 3 maç (ses ömrü), `ses-kesilme-olcum` 6 mod × CPU 1x/6x, `ses-zamanlama-olcum`, Hazine taklit | GEÇTİ | ani kesilen 0; çalarken yeni ekran (>150 ms) 0 (canlı), 1 (azalt, rozet sonuna kadar çaldı); Hazine çizelgesi CPU 6x: joker + rozet 150 ms fade ile yumuşak bitti (ani değil); canlıda `ses_kesildi` 0 |
| 5 Zamanlama | Hazine taklit (sayaç 0'da > 1 sn 0, sıçrama 0, 3-2-1 ~1 sn), Turnuva senkron taklidi | GEÇTİ (taklit) | |
| 5 Zamanlama — canlı izleme | Ida duman sonrası `akis_bozulma` | **KALDI** | Hazine `faz_gec` sonuç 4211 / 4245 ms + karar 1236 ms, `sayac_sifir` karar 1195 ms; Düello nötr `sayac_sapma` 836, `sayac_sifir` 1793, `faz_gec` 1831 ms. Bu paket zamanlama koduna dokunmadı; CPU 6x otomasyonda ayrı inceleme gerekiyor |
| 6 Akış | canlı Klasik / Düello / Hazine (açık bot) | GEÇTİ | üçü de `bitti` (DB); araç "bitti"yi algılayamadı ve süre sınırına kadar bekledi (aracın durum algısı — ölçümü etkilemedi) |
| 7 Veri | açık bot maçı (serbest) | GEÇTİ | maçlar `bitti`, ses/XP akışı oynadı; açık bot → Bin Galibiyet sayılmaz kuralı değişmedi |
| 8 Konsol | bütün koşular | GEÇTİ | JS hatası 0; beklenen 400: `duello_cevap … Süre dolmadı` (1114 yeniden deneme); taklitte kesilen istekler `ERR_FAILED`; arayüz denetiminde `localhost:5199` kökenli 1 CORS (yerel port) |
| Yerel testler | `test:kurallar` (8 + 7), `test:dans`, build, iOS ayrıştırma | GEÇTİ | joker testinin DB kısmı canlı kilidinde atlandı |
| `npm test` (sunucu) | | BAKILAMADI | `_test/sunucu` canlı DB'de işlem açıyor — CLAUDE.md canlı DB kuralı |
| Arayüz denetimi misafir girişi | | BAKILAMADI → test hesabıyla koşuldu | Turnstile denenmedi; geçici test hesabı (admin API, Ida değil) kullanıldı, sonunda silindi |
| iOS gerçek cihaz | | BAKILAMADI | WebKit bu makinede çalışmıyor |

## Karar bekleyenler
1. **Rakip joker rozeti** sonuç ekranı gelince yarıda kayboluyor: rozeti faz anahtarlı sahnenin dışına taşımak konumunu etkileyebilir
   (görünüm değişikliği) — yapılsın mı?
2. **Maç sonu ilk çizimi** canlıda (dolu profil) 150–160 ms: sahneyi bir kare daha erken iskeletle açıp içeriği 2. karede takmak beliriş
   sırasını değiştirir — yapılsın mı?
3. Canlı izlemedeki Hazine sonuç geçişi 4,2 sn / Düello nötr sayaç 0'da 1,8 sn: ayrı paket olarak incelensin mi?
4. Klasik soru geçişi tek karesi 150 ms (sınırda): yeni sorunun DOM'unu yeniden kurmak yerine yerinde güncellemek (anahtar değişimi) bir
   sonraki paketin işi olabilir.

## Özet
Sesli sohbet her moddan kalktı (2 dosya silindi, 8 kaynak dosyası + 3 Play Store belgesi düzenlendi, 43 çeviri anahtarı, kalan referans 0); 1117 canlıda, yetkiler aynı.
Kasmaların büyük kısmı ölçüm artefaktıydı (video kodlaması + soğuk sayfa yüklemesi); gerçek kalan maliyetler adıyla ölçüldü, maç sonu açılış
görevi taklitte 115 → 78 ms. Canlı maç içi en uzun kare Klasik 150 · Düello 134 · Hazine 134 ms.

## Telefonda bakılacak 3 şey
1. Maç sonu sahnesi açılırken üst çubuğun altındaki konum ve içerik sığdırma eskisi gibi mi (kayma/zıplama yok).
2. Maç ekranında ve maç sonunda mikrofon/sesli sohbet düğmesi hiç görünmüyor; Gizlilik/Koşullar'da sesli sohbet paragrafı yok.
3. Kısa ekranlı telefonda (≤ 600 px yükseklik) Klasik maçta tepki düğmesi alt satırda ortalı.

---

# Ses kesilmesi + Tam test kapsamı + Dereceli kalktı + Maç sonu karesi — rapor (16 Eki 2026)

## A · Tam test kapsamı (kalıcı kural)
`docs/TEST-KAPSAMI.md`: her test 8 başlığın tamamını koşar — dokunma, görünüm, animasyon, **ses (sonuna kadar çaldı mı, kim kesti,
yeni ekran geldiğinde kalan ms, çakışma, hiç çalmadıysa neden)**, zamanlama, akış, veri, konsol; 360×640 + 390×844, TR + EN, yavaş telefon
taklidi, bütün modlar ve sayfalar. Her madde GEÇTİ / KALDI / BAKILAMADI (+ neden). Kural CLAUDE.md ve AGENTS.md'de.

### Bu paketin test tablosu
| Madde | Kapsam | Sonuç | Not |
|---|---|---|---|
| 4 Ses — ani kesilme | Hazine sayfa (6 maç, 3 senaryo, CPU 1x/6x) + 6 mod çizelgesi (CPU 1x/6x) | **GEÇTİ** | ani kesilen anlamlı ses 0 |
| 4 Ses — çalarken yeni ekran | aynı | **GEÇTİ (kalan var)** | 30 → 3 (Hazine) · 7 → 4 (çizelge); kalanlar ≤ 290 ms ve sonuna kadar çalıyor |
| 4 Ses — hiç çalmadı | aynı | GEÇTİ | çalmayan anlamlı ses 0 |
| 5 Zamanlama — sayaç | Hazine 6 maç | GEÇTİ | 0'da > 1 sn: 0 · sıçrama 0 · rakam 0,89–1,21 sn |
| 3 Animasyon — maç sonu > 100 ms kare | Hazine 3 senaryo CPU 6x | **KALDI (dalgalı)** | 71 / 55 / **108** ms (önce 87 / 89 / 158) |
| 3 Animasyon — kesilen | Hazine | KALDI (eski) | 3–7 kesik CSS animasyonu (önce 6–14) — bu paketin konusu değil, ayrı iş |
| 8 Konsol | Hazine taklit, çizelge | GEÇTİ | sayfa hatası 0 |
| Derleme + yerel testler | build, joker kuralları, skill, sayaç saati, dans, iOS ayrıştırma | GEÇTİ | |
| 6/7 Akış + veri — canlı duman (Ida, açık bot, yerel üretim derlemesi + canlı Supabase, yavaş telefon) | Klasik · Düello · Hazine birer maç | **GEÇTİ** | üçü de bitti (açık bot maçı dereceli=false — Antrenman kuralı korunuyor); ses 62/62 · 25/25 · 116/119 çaldı (Hazine'de 3'ü soğuk açılışta geç inen giriş sesi — bilinen); ses ömrü ani 0, çalarken yeni ekran 0; canlı izleme kaydı: ses_kesildi 0, ses_yok 2, faz_gec 1 (Düello 1,0 sn); konsol 0. İlk deneme bellek azlığında durdurulmuştu, Ida onayıyla sırayla yeniden koşuldu |
| 3 Animasyon — maç içi > 100 ms kare (yavaş telefon) | duman maçları | **KALDI** | en uzun kare Klasik 305 · Düello 498 · Hazine 497 ms (CPU 6x) — bu paketin konusu değil, ayrı iş |
| 2 Görünüm — Dereceli ekranları | OYNA penceresi, Saf Bilgi penceresi, Modlar, Düello, Meydan Oku, Dükkân · 360×640 + 390×844 · TR + EN (Ida hesabı, salt okuma) | **GEÇTİ** | "Serbest/Casual" 0, anahtar yok, taşma yok, undefined/NaN yok, konsol 0 (`tasarim/dereceli-1115/`) |
| 1/2 Dokunma + görünüm — arayuz-denetim (18 sayfa) | | **BAKILAMADI** | misafir girişi Cloudflare Turnstile'da tamamlanmadı (oturumda kimlik yok) → sonuç girişsiz sayfalara ait, geçersiz; Turnstile aşılmadı (kural). Hesap açılmadı, silinecek hesap yok |
| Grup / Turnuva sayfada ses | | BAKILAMADI (sayfada) | canlıda istenince başlatılamıyor; ses çizelgesiyle (gerçek ses.js + dosyalar) bakıldı: GEÇTİ |
| `npm test` (sunucu) | | BAKILAMADI | canlı DB'de işlem açar — CLAUDE.md canlı DB kuralı |
| iOS gerçek cihaz | | BAKILAMADI | WebKit bu makinede çalışmıyor; Ida'nın telefonunda |

## B · Kesilen sesler — önce / sonra
**Kök neden (ölçüldü):** kod hiçbir sesi ani durdurmuyordu; sesler **çalarken yeni ekran geliyordu** ve yeni ekranın sesi (soru geldi /
doğru-yanlış) üstüne biniyordu — kulakta "yarıda kesildi". Eski testler yalnız başlangıca baktığı için görmedi. Ayrıca aynı ses ikinci kez
istenince eskisi 30 ms'de (ani) kısılıyordu.

| Ses (Ida'nın örnekleri önce) | Önce | Ne yapıldı | Sonra |
|---|---|---|---|
| Hazine rakip 2x/joker işaret sesi (1,41 sn) | sonuç ekranı gelince 0,2–1,1 sn kala doğru/yanlış altında | çalma 0,7 sn'ye kısaldı (sonu 120 ms iniş); yalnız işaret kutusuyla, iki taraf cevaplamamışken | en çok 0,29 sn kala, sonuna kadar çalıyor |
| Hazine giriş sahnesi sesi (rozet, 1,8 sn) | 3-2-1 sonrası soru geldiğinde 0,9 sn kala soru sesiyle çakışma | sahnenin bitişine sığar (pencere "giriş") | çakışma 0 |
| Hazine AÇ anı sesi (rozet + coin) | yeni soru geldiğinde 0,3–1,6 sn kala | AÇ/DEVAM anının süresine sığar | çakışma 0 |
| Düello rakip zaman baskısı sesi (1,2 sn) | sonuçta 0,4 sn kala | maç içi 0,9 sn sınırı | ≤ 0,26 sn kala, sonuna kadar |
| Rakip bulundu + VS (1,8 sn) | geçişe sığmıyordu (VS 0,45 sn'de başlar) | maç ekranına geçişe kalan süreye sığar | — |
| Aynı ses tekrar | eskisi 30 ms'de ani | 120 ms iniş | ani 0 |
| Yeni ekran gelince hâlâ çalan anlamlı ses | üst üste | ≤ 400 ms kaldıysa sonuna kadar, fazlaysa 150 ms'de kendiliğinden biter | — |
Ses dosyaları ve /ses-secim seçimleri değişmedi (kısaltma çalma süresinde).

**İzlemeye eklenen olay (migration 1116, canlıda):** `ses_kesildi` — anlamlı ses planının %80'inden önce bittiyse ya da çalarken yeni ekran
geldi ve 150 ms'den fazlası kaldıysa: mod, faz, ses rolü, kalan ms, kesen (ekran / aynı ses / soru sesi), cihaz. Sınırlar aynı (maçta tür
başına 3). `/yonetim/izleme › Akış bozulmaları` ve 08:00 e-postasında görünür. Prova: geçersiz tür atıldı, yetkiler aynı.

## C · Dereceli / Serbest kalktı (migration 1115, canlıda)
- Sunucu: 14 fonksiyon — `kuyruga_gir`, `quick_match`, `duello_ara`, `kasa_ara`, `hizli_mod_baslat`, `duello_davet_et`, `kasa_davet_et`,
  `duello_olustur`, `kasa_olustur`, `create_challenge`, `rovans_iste` (p_dereceli false gelse de dereceli; açık bot hariç), `joker_ucretsiz_elli_hakki`
  (her zaman yok), `odul_carpani` / `odul_indirim_sebebi` (serbest indirimi çıktı). Ayar satırları, eski maçlar, `dereceli_tercih` silinmedi.
  Geri alma `docs/dereceli-1115-geri-al.sql`.
- İstemci: ModSecimPenceresi, Home, anasayfa/veri, ModlarPage, DuelloPage, KasaPage, ChallengesPage, RakipAra, AramaGunesHalkasi,
  AramaSahnesi, MatchPage (açık bot maçı "Antrenman"), jokerKurallari, JokerCubugu, OdulDokumu, dereceli.js (sabit dereceli), README.
- **Dikkat:** alt ajanın ilk prova denemesi bir fonksiyonu sorgunun WHERE'ine koyduğu için tek ROLLBACK'li işlemde ~135 çağrı yaptı (veri
  kalmadı) — canlı DB "döngü yok" kuralına aykırı; betik düzeltildi.
- Açık soru: Antrenman'da (açık bot) ücretsiz 50:50 de kalktı.

## D · Hazine maç sonu karesi
Kaynak (profil): kutlamanın ilk çizimi (~58 ms) + kupa Lottie kurulumu (64–127 ms, CPU 6x) art arda. Kupa artık maç sürerken boşta, sayfa
dışında kuruluyor (bütün modlar); rakip tarafı ayrı karede; altın yağmuru iki kare sonra. Görünüm aynı (önce/sonra görüntüleri
`tasarim/hazine-akis/ms-once-bot1.png`, `ms-sonra-bot1.png`).
| CPU 6x | bot | gecikmeli | dalgalı ağ |
|---|---|---|---|
| önce | 87 ms | 89 ms | 158 ms |
| sonra | **71 ms** | **55 ms** | **108 ms** |
Dalgalıda kalan: sahne açılınca `<html>`'e eklenen sınıf bütün sayfanın stilini yeniden hesaplatıyor (görünümü değiştirmeden ayrılamadı).

## Ida'nın telefonda bakacağı 3 şey
1. Hazine: rakip 2x işaretlediğinde ses kısa ve tam çalmalı; sonuç geldiğinde yarıda kalmamalı.
2. Hazine girişi: 3-2-1 bitip soru gelirken önceki ses soru sesinin üstüne binmemeli.
3. OYNA / Modlar / Düello / Meydan Oku: "Serbest | Dereceli" anahtarı olmamalı.

## Özet
Ses: ani kesilme 0, çalarken yeni ekran 30 → 3 (kalanlar kısa ve sonuna kadar çalıyor); izlemeye `ses_kesildi` eklendi. Dereceli kalktı
(1115), ekranlar TR/EN temiz. Maç sonu karesi 3 senaryonun 2'sinde < 100 ms, dalgalıda 108 ms. Canlı duman (Klasik, Düello, Hazine) geçti.
Push 2f84152b, Vercel canlıda doğrulandı. Bakılamayan: arayüz denetimi (Turnstile). Kalan: maç içi yavaş telefon uzun kareleri (ayrı iş).

---

# Akış izlemesi + günlük e-posta + Hazine "sayaç 0'da takıldı" — rapor (16 Eki 2026)

## A · Akış bozulması kaydı (migration 1113, canlıda)
Oyun, maç sayfası açık ve görünürken kendi zamanlamasını ölçer (Klasik, Saf Bilgi, Düello, Hazine, Grup, Turnuva):

| Olay | Eşik | Nasıl ölçülür |
|---|---|---|
| `sayac_sapma` | > 700 ms | sayaç saati ile en iyi sunucu saati tahmini arası (arka plandan dönüşün ilk 3 sn'si hariç) |
| `sayac_sifir` | > 1 sn | sayaç 0'a indi, sonraki faz gelmedi |
| `faz_gec` | > 1 sn | faz sunucunun bitiş anından geç uygulandı; `atlama:sonuc` = sonuç hiç görünmeden yeni tur; Klasik/Grup/Turnuva'da soru sayaç başlangıcından geç geldi |
| `donma` | > 500 ms | uzun görev (iOS'ta 250 ms saatin boşluğu) |
| `ses_gec` / `ses_yok` | > 300 ms / hiç | istenen maç sesi (maç sonu seslerinin geç çalma izni sayılmaz) |

Her kayıtta mod, faz adı, ms, cihaz (android/ios/masaüstü), açılış kipi (twa/pwa/tarayıcı), ağ türü, sürüm, maç kimliği. Kişisel veri yok.
Hafiflik: aynı kuyruk + aynı RPC (15 sn toplu gönderim), istemci maçta tür başına 3 · dakikada 8 · oturumda 40; sunucu dakikada 10 ·
oturumda 60 · maçta tür başına 3; 30 gün saklama. `/yonetim/izleme › Akış bozulmaları` (24 sa / 7 gün, mod × olay, en kötü 20, etkilenen oyuncu).
Eşikler: 700 ms = sayacın kasıtlı ilk-rakam kayması (en çok 0,9 sn, rakamı yavaşlatır, sıçratmaz) ile karışmayacak sınır.

## B · Günlük özet e-postası
Her sabah 08:00 TSİ (cron 05:00 UTC) → idagureli@gmail.com + info@quiztactics.com, konu "Quiz Tactics günlük izleme — GG.AA", düz metin:
sayılar, en sık 10 sorun (hata + akış birlikte), mod ve cihaz kırılımı, maçlar; sorun yoksa "SORUN YOK". Elle: sahip sayfasında
"Test e-postası gönder" ([TEST] konulu, 10 dk'da 1). **Test e-postası gönderildi:** Resend 200, Gmail gelen kutusunda (10:47 TSİ).

## C · Hazine kök neden
- **Kök neden 1 (asıl takılma):** cevaplamadan süresi dolan oyuncu için sunucu soruyu 5 sn daha açık tutuyordu (`cevap_gec_varis_sn`,
  geç varan dokunuş payı — `kasa_ilerlet_ic` cevap dalı). İstemci dokunmadığını biliyordu ama söylemiyordu → sayaç 0'da 5–6 sn, sonra sonuç
  bir anda. Ida'nın 01:46 maçında 1. turda cevap yoktu (kasa `bbed4452`). Düello (soru 5 sn, kart 3 sn), Grup ve Turnuva'da aynı kalıp vardı.
- **Kök neden 2 (yavaşlayıp hızlanma, geri sayma):** sayaç `Date.now() + saat farkı` ile akıyordu (`KasaPage.jsx` kalanSn); fark "en kısa
  gidiş-dönüşlü örnek"ten seçildiği için daha iyi yanıt gelince ya da eski örnek 60 sn'lik pencereden düşünce 100–400 ms sıçrıyor, telefonun
  saati ayarlanınca 60 sn boyunca yanlış kalıyordu (`oyun/lib/sunucuSaati.js › saatOrnegiEkle`).
- **Neden taklit görmedi:** taklit sunucu cevapsız soruyu 1 sn'de kapatıyor, oto oyuncu her soruyu cevaplıyordu.
- **Düzeltme:** süre bitince istemci "cevabım yok" der (migration 1114: Hazine, Düello soru + kart, Grup, Turnuva; sunucu yalnız süre gerçekten
  dolduysa kabul eder). Sayaç tekdüze saate bağlı düzgün saatle akar (en çok %10 kayar, geri gitmez, faz başında hizalanır; saat atlaması ve
  arka plan dönüşü ele alındı). 0'dan sonra sonuç gelene dek sayaçta kısa "•••". Grup/Turnuva'da "Süre doldu" ekranı artık doğru şıkkı da gösterir.
- **Önce / sonra — canlı (Ida, açık bot, Antrenman):** önce 2 maç, 13 cevapsız tur → `sayac_sifir` 6 (ort 6,1 sn, en kötü 7,1) + `faz_gec` 6
  (ort 6,2 sn) (tavan: maçta tür başına 3) · sonra 2 maç, 12 cevapsız tur → **0 + 0**.
  Not: ikinci "sonra" maçı bilgisayarın belleği azaldığı için 7. turda durduruldu (maç iptal edildi; ilk 4 cevapsız turda kayıt yok).
- **Önce / sonra — taklit `--senaryo=dalgali`** (canlı kapanış kuralları, %40 cevapsız, dalgalı ağ, saat atlaması, arka plan; 2'şer maç):
  0'da > 1 sn bekleme en uzun **8,0 → 2,3 sn** (kalan = bu senaryonun 1,4 sn'ye varan yanıt gecikmesi), ileri/geri sıçrama **2 → 0**,
  rakam süresi 0,90–1,20 sn. Birim testi `oyun/_test/sayac-saati-test.mjs` 7/7.

## D · Maç sonu karesi
Denenmedi. Bu paketin taklitinde Hazine maç sonu en uzun kare 100–167 ms (15 Eki ölçümüyle aynı aralık; bu paket etkilemedi). Kalan iki görev
MacSonuKutlama'nın ilk çizimi ve kupa Lottie kurulumu; bellek baskısı ve süre nedeniyle ayrı işe bırakıldı (öneri aynı: kutlamayı final
sahnesi sırasında gizli kurmak, kupa Lottie'yi önceden oluşturmak).

## Ida'nın telefonda bakacakları
1. Hazine'de bir soruya hiç dokunma: sayaç 0'a inince kısa "•••", sonuç ~yarım saniyede gelmeli (eskiden 5–6 sn 0'da kalıyordu).
2. Soru boyunca rakamlar eşit hızda insin; uygulamayı arka plana alıp dön — sayaç sıçramadan sürmeli.
3. Ertesi sabah 08:00'de "Quiz Tactics günlük izleme" e-postası; `/yonetim/izleme › Akış bozulmaları`nda telefonun kayıtları (android/twa).

---

# Codex maçlı tarama + Hazine/Bin Galibiyet paketi — rapor (15–16 Eki 2026)

## Olay: Ida hesabı silindi ve geri yüklendi (16 Eki 00:50 TSİ)
- **Ne oldu:** arayüz denetimini Ida hesabıyla koşmak için `araclar/arayuz-denetim.mjs --oturum=<Ida oturumu>` verildi. Araç
  kendi misafir hesabı için yazılmıştı: `--sakla` yoksa iş sonunda oturumdaki hesabı `hesabimi_sil` ile siliyor →
  auth.users + kaskadla bütün oyun verisi gitti.
- **Geri yükleme (Ida kararı):** önce canlının yeni yedeği (`yedek-al.mjs` → `quiztactics-yedek/2026-10-15`), sonra 15 Eki
  04:10 UTC gece yedeğinden YALNIZ Ida'nın satırları, tek işlemde, aynı kullanıcı kimliğiyle: 77 tablo, 12.713 satır
  (auth.users + auth.identities + profil + bağlı tablolar; Ida'nın maçlarında kaskadla giden rakip cevapları dahil);
  oturum/yenileme belirteci ve rpc_sayac geri yüklenmedi; 3 oyuncunun NULL'a düşen `davet_eden`i eski değerine döndü.
  Önce ROLLBACK provası; FK ihlali 0; yetki/RLS değişikliği yok.
- **Doğrulandı:** `sahip_mi()` Ida belirteciyle true (/yonetim), `profilim` (Lv 34, 2.641 coin, 3.305 XP, Altın lig, 12 seri),
  6 arkadaşlık, Google kimliği + onaylı e-posta, 109 Klasik + 67 Hazine maçı, magic link oturumu aynı kimlikle açılıyor.
- **Kayıp:** 15 Eki 04:10 UTC sonrası Ida verisi (o günkü test maçları; `toplam_galibiyet` 69 → 68).
- **Kök neden kapatıldı:** `arayuz-denetim.mjs` yalnız kendi açtığı misafir hesabını siler (işaret dosyası + anonim + kimlik
  eşleşmesi + Ida kimliği asla); `test-oturumu.mjs --sil` aynı kapı. Kural CLAUDE.md + AGENTS.md'de. Betikler
  `araclar/hesap-geri-yukle/`.

## 1 · Bin Galibiyet'e Hazine (migration 1112 — canlıda)
- `toplam_galibiyet` + `kasa_maclari` (durum 'bitti', kazanan = oyuncu; beraberlikte `kasa_bitir` kazanan'ı NULL yazar).
  Rakibi **açık bot** olan maç hariç (`acik_bot_mu`, Klasik/Düello ile aynı). Yetki aynı (yalnız service_role).
- Saf Bilgi = `matches.jokersiz` → zaten sayılıyordu; açıklama "1.000 maç kazan (Klasik, Saf Bilgi, Düello, Grup, Turnuva,
  Hazine)" / "Win 1,000 matches (Classic, Pure Knowledge, Duel, Group, Tournament, Treasure)" (oyundaki EN adlar).
- **(c) maddesi uygulanmadı — gerekçe:** hiçbir modun maç bitirme fonksiyonu `unvan_galibiyet_kontrol` çağırmıyor (canlı
  katalogda ölçüldü: yalnız `unvanlarim()` ve `unvan_lig_kapanis`). Hazine aynı kalıba girer; maç bitişine çağrı eklemek
  Hazine'yi diğer modlardan ayırırdı.
- **Not (karar gerekebilir):** Hazine'de arama yedeği botları **gizli** bot (65 maç); mevcut kural gizli bot galibiyetini
  Klasik/Düello'da da sayıyor, Hazine'de de sayılıyor. Yalnız açık bot (Antrenman) hariç.
- Prova `araclar/bin-galibiyet-1112-prova.mjs` (ROLLBACK): Ida 50 → 69 (Hazine 19; açık bot dahil olsaydı 21), yetki aynı.
  Geri alma `docs/bin-galibiyet-1112-geri-al.sql`.

## 2 · Hazine XP sesi
- **Kök neden (ölçümle):** 15 Eki yavaş telefon ölçümünde düşen `xp_dolma` maç SONU değil, maç içi ilk sonuç anının "büyük
  artış" sesiydi (t=10 sn); maç sonu `xp_dolma` aynı ölçümde çalmıştı. Dosya ertelenen ön yükleme grubundaydı, ilk sonuçta
  hâlâ iniyordu, faz değişince (kurala uygun) düştü. Aynı kök `can_kaybi`'de de (taklitte 2 kez).
- Düzeltme: Hazine'nin ilk sonuç anı sesleri (xp_dolma 92 KB, can_kaybi 24 KB) ilk ön yüklemede. Ayrıca maç sonu sesleri
  kendi penceresinde: `sesMacSonu` sesleri (ertelenen xp_dolma dahil) maç sayfasının faz değişiminden etkilenmez, yalnız
  ekran/sayfa kapanınca (`sesMacSonuKapat`) düşer — Düello v4 `sesFaz` durum değişimi ertelenen xp'yi düşürebiliyordu
  (B4 testi eski kodda ✗, yeni kodda ✓). Maç içi sesler eskisi gibi faz değişince düşer (B4 ✓).
- Önce/sonra (hazine-akis-olcum, CPU 6x + yavaş 4G, 7'şer maç): çalınmayan xp_dolma 0 → 0, can_kaybi 2 → 0; faz taşması,
  geç çalma 0; eşzamanlı yalnız EN/360 koşularında 3–7 (önce sürümde de aynı: 5–7).

## 3 · Hazine maç sonu kare süresi
- Profil + `--paylas_yok` deneyi: 184/323 ms'lik görev Paylaş kartı (`toBlob`'un eşzamanlı 1080×1920 geri okuması 69–153 ms +
  metin ölçümü `sigdir/satirla`). Düzeltme: PNG kodlama Worker'da (`paylasKartiIsci.js`), çizim bölümler arasında ana iş
  parçacığını bırakır; piksel özeti ve PNG boyutu aynı (715.447 B). Paylaş görevi **172–323 → ≤57 ms**.
- **Hedef <100 ms TUTMADI:** maç sonu en uzun kare 167–334 → 150–200 ms. Kalan iki görev Paylaş'tan bağımsız: maç sonu
  ekranının ilk React çizimi (133–177 ms) ve kupa Lottie kurulumu + konfeti (116–140 ms), bitişten ~4,1 sn sonra. Görsel
  akışı değiştirmeden küçültmek ayrı iş (öneri: MacSonuKutlama'yı final sahnesi sırasında gizli kurmak, kupa Lottie'yi
  önceden oluşturmak).

## 4–7 · Codex bulguları
- **4 Turnuva lobisi:** `/^d{1,2}:d{2}$/` → `/^\d{1,2}:\d{2}$/`, başlıkta `saatYazi` (24:00 → 00:00; liste değeri 24:00).
  Başka dosyada ters bölü kaybı yok (Modal.jsx'teki eski düzeltilmiş). Birim: seans "24:00" → "00:00 Turnuvası".
- **5 Hazine skor şeridi EN:** orta şeritte EN rakip etiketi "RIVAL" (TR "RAKİP" boyunda). Ölçüm: 360 EN yan sütun 66 px,
  "OPPONENT" 0/24 skorla tam sınırda (66/66), gerçek hedef 80 ve iki haneli skorda kesiliyordu. TR ve iki satırlı eski
  şerit değişmedi; yatay taşma yok.
- **6 Grup sonucu:** lig çerçevesinin alt şerit/yıldız süsü kutudan ~12 px taşıp "1."e değiyordu → avatara alt pay (sıkışık
  kademelerde orantılı). 390/360 × TR/EN × 1./2./son × süslü/lig çerçevesi ekran görüntüsü: değme yok. Turnuva derece
  ekranı aynı sınıfı kullanıyor, o da düzeldi.
- **7 Paylaş "Couldn't share":** gerçek kod hatası bulundu — kart hazır değilken (ilk 2,5 sn ya da çizim sürerken) dokunuşta
  `await hazirla()` (tuval + avatar indirme) `navigator.share`'i dokunuş etkileşiminin dışına itiyordu → Safari/yavaş
  cihazda NotAllowedError. Artık hazır kart yoksa beklemeden metin + bağlantı paylaşılır; davet bilgisi baştan alınır. Hata
  mesajı davranışı aynı. Codex'in masaüstü otomasyonu da bu yolu ya da tarayıcının paylaşım iznini görmüş olabilir.

## 8 · Ölçüm teyitleri
- **Statement timeout:** son kayıt 15 Eki 05:52 UTC (sabah test oturumları); sonrasında yok. pg_stat_statements (14 Eki 14:18'den
  beri, 1099/1100 öncesini de içerir): get_categories ort 278 ms / en çok 4,7 sn, kuyruga_gir 239 / 5,6 sn,
  submit_group_match_answer 66 / 2,4 sn — en yükseklerin 1099/1100 öncesi kilit dönemine ait olması muhtemel. Riskli
  değişiklik yapılmadı.
- **Klasik açılış/bekleme:** bu pakette Klasik koduna dokunulmadı; ayrı canlı ölçüm yapılmadı (canlıda yalnız tek Hazine maçı).

## Canlı test (16 Eki, Ida, açık bota karşı tek Hazine maçı — Antrenman, serbest)
- Yerel üretim derlemesi + canlı Supabase, CPU 6x + yavaş 4G, 390×844. Maç bitti; açık bot kazandı (80–0). `toplam_galibiyet` 68 → 68.
  Açık bot galibiyetinin hariç tutulduğu 1112 provasında ölçüldü (Ida'nın 21 Hazine galibiyetinden 2'si açık bota karşı, sayılan 19).
- Ses: 104 istek, 101 çaldı. **xp_dolma: maç içinde 5/5 çaldı; maç sonunda `kaybettin` bitene dek 224 ms ertelendi ve ÇALDI.** can_kaybi 1/1.
  Çakışma 0, konsol hatası 0. Çalınmayan 3 ses giriş sahnesinde (tur_gecis geç indi 1,9 sn, sayim_son 338 ms, rozet faz değişince):
  maç lobisiz, doğrudan adresle soğuk açıldı. Taklitte tur_gecis geç inişi önce/sonra aynı (1–4) — bu paketten gerileme değil.
- Şık basış → seçildi: DOM ort 61 ms, boyama ort 105 ms. Canlı paket doğrulandı (canlı kasa paketinde `RIVAL`, Worker varlığı 200).

## Testler
- `npm run build` TEMİZ · ses-rakip-soru ✓ · ses-zamanlama (B2/B3/B4) ✓ · ses-hazine-grup-taklit 6/6 · senkron-testi --taklit
  Turnuva ✓ · hazine-akis-olcum taşma/geç/askıda 0 · arayüz denetimi TEMİZ (yatay taşma 0, konsol temiz).
- Görüntüler `tasarim/duzeltme-codex-15eki/` (önce/sonra: Hazine skor şeridi, Grup derece, Turnuva lobisi).

---

# Tam tur sonrası düzeltme paketi — rapor (15 Eki 2026)

Commit'ler: 0dfd0132 (migration 1110 + 1111) · 51965eff (arayüz) · 21d7ed25 (kalan + ölçümler + PROGRESS/PROJECT_CONTEXT). `main`'e push edildi, Vercel "success", canlıda doğrulandı (`/hesap-sil` 360 px: üç öğe aynı satırda, top 12/12/12).

## A) Hatalar

| # | Sonuç | Kök neden / not | Dosyalar |
|---|---|---|---|
| 1 | "Bin Galibiyet" açıklaması TR "1.000 maç kazan (Klasik, Düello, Grup, Turnuva)" · EN "Win 1,000 matches (Classic, Duel, Group, Tournament)". Sayım kuralı DEĞİŞMEDİ. | `toplam_galibiyet` Klasik/Saf Bilgi + Düello + Grup + Turnuva sayıyor (Hazine yok). **Dikkat:** görev "oyunda Antrenman yolu yok" diyordu; kodda Meydan Oku › Antrenman (açık bot) duruyor (canlıda 5 açık bot, 38 açık botlu maç) ve bu maçlar hâlâ sayılmıyor. Yeni metin bunu söylemiyor. İstenirse "(Antrenman maçları sayılmaz)" eklenir. | migration `1110_bin_galibiyet_aciklama.sql` |
| 2 | Ortak Hazine "Ort. cevap" artık şıkların göründüğü andan cevaba ölçülüyor. | **Kök neden sunucu:** `kasa_cozumle` süreyi `at − soru_baslangic − kasa_gosterim_payi (2 sn)` yazıyordu. Şıklar gösterim payında zaten görünür ve dokunulabilir (istemci yalnız sayacı gizler; yalnız AÇ/rakip kararında örtülü) → payda dokunuş 0'a kıstırılıyor, sonrası 2 sn eksik çıkıyordu (0,7–2,2 sn → "0,3 sn"). 1104/`bot_cevap_gercek` ve istemci suçsuz. Klasik/Saf Bilgi `now() − soru_baslangic` (istemcide ayrı pay yok) → hata YOK, dokunulmadı. Bot süresi de aynı çıpada (pay + planlı gecikme). Eski satırlar olduğu gibi kaldı. | migration `1111_hazine_ort_cevap_sure.sql` |
| 3 | Profil › "Seri ve skiller" envanterinde ve maç sonu "Bu maçta kullandığın jokerler"de Baskın/Kalkan (ve pasif Sis vb.) gösterilmiyor; veri silinmedi. | `jokerler.js › jokerGosterilir` (aktif değil ya da `yalnizDuello` → gizli). Başka liste yok (Dükkân/SkillSeti zaten satılık listeden). | `jokerler.js`, `UstalikIzgarasi.jsx`, `MacSonuEklentisi.jsx` |

## B) Küçük düzeltmeler

4. Ad düğmesi (Meydan Oku / Turnuva lobisi): kutu en az 44 × 44 px; satır yüksekliği aynı (negatif dikey boşluk). `a-meydan.css`, `m1-turnuva.css`. Ölçüm: 40 → 44 px genişlik, yükseklik 44.
5. Profil › Hatalarım: "Öğrenilen: {0} · Bankada: {1}" (EN "Learned · In bank"). 360 TR satır 78 → 64 px (tek satır). `ProfilePage.jsx`, `ceviri/dukkan.js`.
6. Turnuva "24:00" → "00:00" (Turnuva sayfası, ana sayfa lobi saati, Turnuva tanıtımı, Giriş; EN aynı). Liste değeri "24:00" kalır. `zaman.js › saatYazi`, `parcalar.jsx`, `TurnuvaTanitim.jsx`, `Login.jsx`.
7. Arkadaşlar: "Facebook'ta paylaş" / "Paylaş" eşit yükseklik (`paylas.css`; ölçümde ikisi de 44 px).
8. /hesap-sil 360 px: Geri / TR-EN / logo aynı satırda (top 68 → 12); ≤380 px Geri yalnız ok (ad ekran okuyucuda). `g-yasal.css`.

## C) Tasarım

9. Dükkân joker kartı: tümünde geçerliyse "Tüm modlar" (EN "All modes"), yalnız Klasik+Düello ise iki küçük mod ikonu; iki daireli nokta kalktı. Rozet 31 → 22–23 px (tek satır). `JokerDukkani.jsx`, `dukkan-magaza.css`.
10. "Tak" düğmelerinde ✓ yok (Dükkân Efekt/Çerçeve/Arka plan/İmza + AvatarEdinme); ✓ yalnız "Takılı"da. Ölçüm: Tak düğmesinde svg 1 → 0.
11. Tek ad "Meydan Oku" (sayfa başlığı, ana sayfa kısayolu, "Meydan Oku'ya dön"; EN "Challenge"). `sayfaBasligi.js`, `parcalar.jsx`, `MacYukleniyor.jsx`, `ceviri/ana.js`.
12. Koleksiyon › Çerçeve ≤479 px 2 sütun (390 px: 3 → 2). `cerceve-secici.css`, `Koleksiyon.jsx`.
13. Hatalarım üst kart ≤420 px: sayı küçük, "soru" altına; başlık tek satır. 360 EN kart 172 → 124 px. `m1-calisma.css`.
14. Saf Bilgi açıklaması "Yalnız bilgiyle yarış." ("Jokersiz" yalnız rozette). `modAciklamalari.js`, `ceviri/telefon-meydan.js`.

## Migration ve geri alma
- 1110 → `docs/bin-galibiyet-1110-geri-al.sql`
- 1111 → `docs/ort-cevap-1111-geri-al.sql` (eski `kasa_cozumle` gövdesi)
- Prova: `araclar/duzeltme-1110-1111-prova.mjs` (tek işlem + ROLLBACK; metin, ifade, yetki/security definer aynı: 3/3 ✓). İkisi `migration-uygula.mjs` ile canlıya uygulandı. Yeni GRANT/RLS/politika yok; oyun kuralı/değeri değişmedi.

## Testler
- `npm run build` TEMİZ (eski iPhone denetimi temiz).
- ses-rakip-soru ✓ · ses-zamanlama ✓ · ses-hazine-grup-taklit 6/6 · senkron-testi --taklit Turnuva GEÇTİ.
- hazine-akis-olcum (bota karşı 4 maç): faz taşması 0 · geç çalma 0 · eşzamanlı 0 · askıda 0 · kesilen animasyon 1/603 (gecikmeli #2). Aynı senaryo tekrarında 0/578 → tek seferlik; ilgili kod değişmedi.
- Önce/sonra (Ida hesabı, 390 + 360 × TR + EN, 11 sayfa): `tasarim/duzeltme-15eki/{once,sonra}-*.png` + `olcum-{once,sonra}.json`; yatay taşma 0, konsol hatası 0. (`araclar/duzeltme-15eki-ekran.mjs`; "önce" = canlı eski sürüm, "sonra" = yerel dev, canlı Supabase, yalnız okuma.)

## Canlı Ort. cevap doğrulaması (1111 sonrası, Ida, bota karşı tek maç)
| Mod | DB `sure_ms` (ben) | İstemci: şıklar göründü → dokunuş | Yorum |
|---|---|---|---|
| Klasik | 1379 ms (rakip bot 3792) | 1380 ms (ilk soru aykırısı 5090 hariç; dahil 1565) | tutarlı |
| Hazine | 2389 ms (rakip bot 4796) | 2683 ms | +0,3 sn: yavaş telefonda şıklar sunucu başlangıcından ~0,3 sn sonra görünüyor. Eski formülle ~0,4 sn çıkardı. Soru başına eşleştirme yapılmadı. |

Otomatik oyuncunun dokunma gecikmesi 0,7–1,9 sn aralığındadır (+ ölçüm döngüsü); ortalamalar buna uyuyor.

## D) Hazine yavaş telefon ölçümü (CPU 6x + yavaş 4G, Ida, bota karşı tek maç, üretim derlemesi)
- 3-2-1: **"3" 924 · "2" 979 · "1" 1078 ms**, "Hazır ol!" 1051 ms; penceredeki en uzun kare 83 ms, ort 57 fps (en düşük 54).
- Sonuç/maç sonu anı en uzun kare: **184 ms** (maç sonu +2,5 sn; bir önceki saniye 167 ms). Maç ortası en kötü kare 133 ms (26 fps'lik tek saniye). Maç ort 57 fps.
- Maç açılışı: maç adresi → ilk kare 856 ms; en uzun görev 240 ms.
- Şık basış → seçildi: DOM ort 64 (en kötü 87) · boyama ort 112 (en kötü 139) ms.
- Ses: 160 istek, 158 çalındı; çalınmayan 2: lobide ilk dokunuş sesi geç yüklendi (382 ms), `xp_dolma` faz değişince iptal. Çakışma (<100 ms) 0. Konsol hatası 0.
- Ham: `tasarim/duzeltme-15eki/hazine-yavas-olcum.json` (+ Klasik/Hazine canlı `ort-cevap-canli.json`).

## Açık / öneri
- Hazine maç sonu karesi (184 ms) 100 ms hedefinin üstünde; sorumlu paylaş kartı tuvali/lottie (bir önceki turdaki bulgu aynen).
- Bin Galibiyet metninde Antrenman konusu: yukarıda #1 — karar Ida'nın.
- Testlerin yeniden yazdığı `tasarim/ses-tani/*`, `tasarim/duello-v4/*` dosyaları commit'e alınmadı.

---

# Basılı tut (3 sn) → doğru şık — bütün modlar (10 Eki 2026)

Ida'nın isteği: özellik Klasik/Turnuva/Grup dışındaki modlara da (Düello dahil) yayılsın, yalnız yetkili hesapta.
Önceki tarama (aynı gün, ab0a9a6f) diğer modları "doğru cevap istemcide yok" diye atlamıştı; bu iş o eksiği kapatır.

**Kapı aynen korundu:** sunucu `dogru_cevap`ı yalnız `hileli_mi()` (`profiles.hile_yetkisi`) hesabına verir. Şu an
yetkili tek hesap: `idagg`. Normal oyuncu ve anon için alan `null` (TABLE dönenlerde) ya da hiç yok (jsonb dönenlerde).

## Mod tablosu

| Mod | Durum | Sunucu (soru RPC'si) | İstemci | Tarayıcı denemesi |
|---|---|---|---|---|
| Klasik 1v1 | Çalışıyor | `get_match_question` (önceden vardı) | QuestionCard | 3 sn ✓ · 1 sn ✓ |
| Turnuva | Çalışıyor | `get_tournament_question` (önceden vardı) | QuestionCard (aynı kart) | Klasik kartıyla aynı bileşen |
| Grup maçı | Çalışıyor | `get_group_match_question` (önceden vardı) | QuestionCard (aynı kart) | Klasik kartıyla aynı bileşen |
| Ortak Hazine (Kasa) | Çalışıyor | `kasa_durum` — yalnız `faz=cevap`, maç aktif, ben henüz cevaplamadım | KasaPage | 3 sn ✓ · 1 sn ✓ · azaltma ✓ |
| Düello v4 (yeni çekirdek) | Çalışıyor | `duello4_durum` — yalnız `notr/cevap/son`, soru açık, ben henüz cevaplamadım | Duello4Arena | 3 sn ✓ · 1 sn ✓ · cevap verilmişken tetik yok ✓ |
| Düello v2 | Çalışıyor (kod hazır) | `duello2_durum` — yalnız `faz=cevap`, ben henüz cevaplamadım | DuelloV2 › V2Cevap | yapılmadı: yeni maçlar v4; sunucu kapısı SQL ile doğrulandı |
| Çalışma | Çalışıyor | `calisma_soru` (+ `dogru_cevap` sütunu) | CalismaPage | 3 sn ✓ · 1 sn ✓ · azaltma ✓ |
| Hızlı Mod | Hazır, mod DONDURULMUŞ | `hizli_mod_soru` (+ `dogru_cevap` sütunu) | HizliModPage | yapılmadı: rota `BulunamadiPage kapaliMod`; sunucu SQL ile doğrulandı |
| Hızlı Maç | Hazır, mod DONDURULMUŞ | `get_hizli_soru` (+ `dogru_cevap` sütunu) | QuestionCard | yapılmadı: rota kapalı; kart Klasik denemesiyle aynı, sunucu SQL ile doğrulandı |
| Düello v1 (eski) | Eklenmedi | `duello_durum` eski dalı | — | son v1 maçı 22 Eyl; erişilen akış değil |

Düello kuralı: basılı tut yalnız oyuncunun **kendi cevap hakkı varken** çalışır (sunucu koşulu + istemcide
`tiklanabilir`: cevaplamadım, süre var, istek yolda değil). Kart fazında, cevap verdikten sonra ya da rakip
beklerken alan gelmez ve tetik olmaz. Tetik `duello_cevap`ı normal yoldan çağırır; kontrol / 4 kart / 3-3 seri
sunucu kurallarına dokunulmadı (`duello4_cevap` değişmedi).

## Migration

`supabase/migrations/20260612001052_basili_tut_tum_modlar.sql` — **1052**, canlıya uygulandı (origin/main'deki son 1051'di).
- `calisma_soru`, `hizli_mod_soru`, `get_hizli_soru`: dönüş tipine `dogru_cevap smallint` (DROP + CREATE; yetkiler
  aynen: `authenticated`, `service_role`; `public`/`anon` REVOKE).
- `kasa_durum`, `duello4_durum`, `duello2_durum`: `soru` nesnesine koşullu `dogru_cevap` (CREATE OR REPLACE, yetkiler aynı).
- Gövdeler canlı tanımdan alındı; tek fark eklenen satırlar. Cevap RPC'lerine (`*_cevap`) dokunulmadı.
- Yetki listesi uygulama sonrası ölçüldü: önceki hâliyle birebir aynı; anon hiçbirinde EXECUTE yok.

## Güvenlik testi (canlı, tek transaction, ROLLBACK — canlıda iz yok)

`IZIN_CANLI_TEST=1 node araclar/basili-tut-guvenlik-sql-testi.mjs` → **21/21 geçti**

| Deneme | Sonuç |
|---|---|
| anon: `calisma_soru`, `hizli_mod_soru`, `get_hizli_soru`, `kasa_durum`, `duello_durum` | 5/5 `permission denied` |
| Çalışma · Hızlı Mod · Hızlı Maç — yetkili | `dogru_cevap` = doğru şık |
| Çalışma · Hızlı Mod · Hızlı Maç — yetkisiz (normal hesap) | `dogru_cevap` = null |
| Kasa yetkili (cevap fazı) / yetkisiz / yetkili cevap verdikten sonra | var / yok / yok |
| Düello v4 yetkili / yetkisiz / cevap verdikten sonra / kart fazı | var / yok / yok / yok |
| Düello v2 yetkili / yetkisiz | var / yok |
| Klasik `get_match_question` kapısı (regresyon) | yerinde |

Test, bitmiş eski maç satırlarını transaction içinde geçici açar, Hızlı Mod/Maç bayraklarını geçici açar; sonunda
ROLLBACK. Sonradan ölçüldü: maç `bitti`, bayraklar `false`, oturum satırı yok.

## İstemci

- Yeni ortak kanca `oyun/lib/useBasiliTut.js` (+ erken dönüşlü sayfalar için `<BasiliTut>` sarmalayıcı).
  QuestionCard da artık bu kancayı kullanıyor; davranış aynı.
- Görsel: `.qt-sik--tutulur` / `.qt-sik--basili` (bilesenler.css, değişmedi) — 3 sn dolan mavi çizgi, hareket
  azaltmada sade dolgu; mobilde menü/metin seçimi/büyüteç yok.
- İptal: parmak kalkar, 12 px'den fazla kayar, pointercancel, cevap verilir, süre biter, soru değişir.
  Aynı soruda ikinci tetik yok. Tetikten sonra parmak kalkınca gelen tıklama yutulur (tutulan yanlış şık gitmez).
- dogru_cevap gelmeyen hesapta şıklara hiçbir sınıf/olay eklenmez.

**Yakalanan hata:** İlk sürümde QuestionCard'da kanca `soru` tanımlanmadan önce çağrılıyordu ("Cannot access 'soru'
before initialization") — Klasik/Turnuva/Grup kartını tamamen kırardı. Tarayıcı denemesi yakaladı, yayından önce düzeltildi.

## Test

- `npm run build`: temiz (eski iPhone ayrıştırma denetimi TEMİZ).
- `npm test`: sunucu testleri geçti; `test:kurallar` içinde **1 eski başarısızlık** — `skill-sistemi-test.mjs:22`
  "İkinci Şans yalnız Klasik ve Düello" beklentisi, gerçekte Kasa'da da var. Bu işle ilgisi yok (skill ayarına
  dokunulmadı). `test:dans` geçti.
- Tarayıcı (yerel, taklit veri, canlıya yazma yok): `node araclar/basili-tut-ekran.mjs` → **35/35 geçti**.
  Her modda: yetkili 1 sn + kaydırma → cevap yok · 3 sn → tek cevap, doğru şık · contextmenu engelli ·
  user-select none · hareket azaltmada animasyonsuz dolgu · yetkisizde sınıf yok ve 3,5 sn'de cevap yok.
- Ekran görüntüleri: `tasarim/basili-tut/` (basılı 1,5 sn · 3 sn sonrası · azaltma · yetkisiz · Düello cevap verilmiş).
- **Yapılmadı:** gerçek `idagg` hesabıyla canlı maçta deneme — hesabın şifresi bende yok ve canlıya test yükü
  gönderme kuralı var; sunucu tarafı SQL ile, istemci taklit veriyle doğrulandı. Gerçek iOS dokunuşu
  (uzun basış menüsü/büyüteç) bu makinede denenemez; Chrome dokunmatik öykünmesiyle ölçüldü.

---

# Soru üretim maliyet tahmini düzeltmesi (10 Eki 2026)

**Yer:** Hesap `api-uret.mjs`'te değil, ortak katman `araclar/soru-temizlik/claude-cagri.mjs` içinde (`apiUsd`, `claudeCagir`). Migration yok; codex dosyalarına dokunulmadı.

## Kanıtlanan açıklar (kodda)

1. **Zaman aşımı/kopan çağrılar hiç sayılmıyordu.** `usage` yalnız başarılı yanıtta okunuyordu; 240 sn zaman aşımı veya bağlantı kopmasında yanıt gelmediği için jeton eklenmiyor, sunucu ise işi (Opus, `maxJeton` 16000'e kadar çıktı) faturalıyor. `api-uret.mjs` bu durumda isteği küçültüp yeniden gönderiyor (`zamanAsimi` → `CAGRI_KUCUK`) — aynı iş iki kez faturalanıp bir kez sayılıyordu. Tahmini gerçeğin altında tutan kalem budur.
2. **Önbellek okuma katsayısı sabit 0,1×.** Opus 5.5 için gerçek oran 0,05× ($0,20/1M, girdi $4). Bu hata tahmini **yukarı** iter (kolay-04: Opus 4,06M okuma jetonu). Sonnet 5.5 için 0,1× doğru.
3. **1 saatlik önbellek yazması (2×) ayrıştırılmıyordu.** Bugün kodda 1 sa TTL yok (`ephemeral` = 5 dk), ama `usage.cache_creation.ephemeral_1h_input_tokens` gelirse eksik sayılırdı.

Çıktı jetonu (düşünme dahil `output_tokens`), önbellek yazma/okuma ve girdi zaten toplanıyordu; fiyat sabitleri (Sonnet 5.5 $2/$10, Opus 5.5 $4/$20) güncel tabloyla eşleşiyor. Jev maliyeti ihmal edilebilir (kolay-04: 326.857 jeton ≈ $0,014).

## Düzeltme

- `FIYAT`'a model başına `okuma` katsayısı; `modelUsd` (5 dk/1 sa yazma ayrı, okuma modele göre).
- `kullanimEkle`: usage → sayaç (tek yer). `iptalEkle`: yanıtı alınamayan çağrı için **tahmin** — girdi = istem karakteri/3; çıktı yalnız zaman aşımında `maxJeton` (üst sınır). Alanlar `iptal_cagri/iptal_girdi/iptal_cikti` olarak `durum.json › harcama`'ya yazılır; eski dosyalar bozulmaz. Usage'ı zaten eklenmiş denemede (ör. JSON ayrıştırma hatası) çift sayım yok.
- Doğrulama: `node araclar/soru-temizlik/claude-cagri.test.mjs` — Opus 1,41 · Sonnet 3,20 · zaman aşımı 0,36 · kopma 0,04 (elle hesapla eşleşti). Sahte `fetch` ile 2 zaman aşımı + 1 başarı senaryosu da denendi (gerçek API çağrısı yok).

## Dürüst not

Gerçek faturayı (Anthropic konsolu) bu ortamdan göremediğim için "%20" farkını rakamla kapatamadım; yukarıdaki üç kalem kodda kanıtlı, ama asıl paya (iptal kalemi) etkisi koşudaki zaman aşımı sayısına bağlı — artık `iptal_cagri` ile görünür. Kapanmayan fark konsol faturasıyla karşılaştırılmalı. Eski `durum.json`'larda iptal kaydı yok, geriye dönük düzelmez. kolay-04 yeniden hesabı: $14,998 → $14,186 (yalnız okuma katsayısı; o koşuda iptal kaydı olmadığından eklenemedi).

## Başka betikler

- `soru-temizlik/{asiri-basit-tara,en-eksik-ceviri,sik-ipucu-837,z2-*}.mjs` aynı `claude-cagri.mjs`'i kullanıyor → düzeltmeden otomatik yararlanır.
- `soru-temizlik/sik-ipucu-api.mjs` kendi hesabını yapıyor: önbellek yazma/okuma jetonlarını tam girdi fiyatından sayıyor (yazma 1,25× yerine 1×, okuma 0,1× yerine 1×) ve iptal çağrısını saymıyor. Önbellekte **fazla**, zaman aşımında **eksik** tahmin eder; dokunulmadı (`claude-cagri.mjs`'e geçirilmesi önerilir).

RAPOR HAZIR — Ida'ya iletilecek.

---

# Güvenlik C — girdi temizliği, spam tavanı, hız sınırı (10 Eki 2026)

Kaynak: `docs/GUVENLIK-DENETIMI-2026-10-10.md` madde 3, 4, 5 + Ek. Kapsam dışı: captcha (A.2), reklam SSV, yan oyun tabloları (A.3), CSP / X-Frame-Options.

## Migration'lar (ikisi de canlıda)
- **1053** `20260612001053_guvenlik_c_girdi_hiz_siniri.sql` — asıl iş.
- **1054** `20260612001054_guvenlik_c_sessiz_sinir.sql` — 1053 düzeltmesi: `cihaz_bildir` ve `kalp_at` arka planda çalışan çağrılar; sınır aşılınca hata atmak yerine sessizce atlıyorlar. Arayüz denetimi, hızlı sayfa açılışında `cihaz_bildir`'in 10/dk sınırına takılıp konsola hata yazdığını yakaladı.
- Geri alma: `docs/guvenlik-c-geri-al.sql` (1053 öncesi canlı gövdelerden üretildi; ikisini birden geri alır).
- Yetki: yalnız `CREATE OR REPLACE` kullanıldı (ACL korunur). Yeni iki iç yardımcı (`gorunmez_temizle`, `hiz_siniri_mesajli`) PUBLIC/anon/authenticated'a kapalı. anon'a açık fonksiyon hâlâ yalnız `ses_secimleri_oyun` (1047 kuralı korundu).

## Yapılanlar
1. **Görünmez karakter:** `gorunmez_temizle()` şu karakterleri siler: \u0001-\u0008, \u000B-\u001F, \u007F, ​-‏, ‪-‮, ⁠-⁩, ﻿. Sekme ve satır sonu kalır (rapordaki aralık da onları dışarıda bırakıyor). **ZWJ (U+200D) iki emoji/simge arasındaysa korunur**; yoksa 👨‍👩‍👧 / ❤️‍🔥 / 🏳️‍🌈 parçalanırdı. Harf arasındaki ZWJ silinir. `trg_dm_guvenlik` küfür filtresinden ÖNCE temizler; sonuç boşsa mevcut `Mesaj boş olamaz` hatası döner. `sikayet_et` açıklaması da temizlenir.
2. **Spam tavanı:** Arkadaşlık isteği (`send_friend_request` + `arkadas_davet_kodu_ile_ekle`) ortak sayaçla 24 saatte en fazla 100; `send_friend_request` ile aynı kişiye 60 sn'de 1. Düello + Kasa daveti ortak sayaçla 24 saatte en fazla 100; aynı kişiye 60 sn içinde yeniden davet yok (reddedilse bile). **Açık botlar sayılmaz** (antrenman serbest kalır). Sayaçlar yalnız gerçek gönderimde artar (doğrulama hatasında işlem geri alındığı için sayılmaz). Mesajlar TR + EN (`oyun/lib/ceviri/sunucu.js`):
   - "Bu oyuncuya az önce davet/istek gönderdin, biraz bekle." · "Bugün çok fazla davet / arkadaşlık isteği gönderdin, daha sonra tekrar dene."
3. **Hız sınırı:** `cihaz_bildir` 10/dk (sessiz), `claim_referral` 10/dk, `arkadas_davet_kodu_ile_ekle` 10/dk, `kalp_at` 60/dk (sessiz; Düello/Kasa nabzı ve 60 sn'lik genel nabız bunun çok altında), `ikram_yanitla` 30/dk.
4. **Eşzamanlı satın alma:** `esya_satin_al`, `karakter_satin_al`, `avatar3d_satin_al` başına `perform 1 from profiles where id = v_me for update` eklendi (hiz_siniri'nden hemen sonra; "zaten sende" kontrolü artık kilitten sonra yapılıyor). Başka mantık değişmedi.
5. **tercih_kategori:** Canlıda 266 satırın hepsi `null`, uyumsuz satır yok. `profiles_tercih_kategori_check` eklendi: `null` ya da `^[a-z0-9_]{1,40}$` (canlıdaki 10 kategori anahtarının hepsi bu biçimde). Sabit liste yerine biçim kısıtı seçildi; böylece yeni kategori eklemek migration gerektirmez. Asıl liste doğrulaması `tercih_kategori_kaydet` RPC'sinde zaten var.
6. **Edge Function kodu (DAĞITILMADI):** `_shared/gizli.ts › gizliEsitMi` ile sabit zamanlı karşılaştırma → `send-push`, `generate-questions`, `satin_alma_iade_tara`. `send-push`: `req.json()` try içine alındı (hatalı gövdede 400). Boş ya da eksik `user_ids` artık 400 döner, herkese gönderim yok. Ölçüldü: canlıdaki bütün çağıranlar (`push_gonder` ← `bildirim_yaz`, `haftalik_sonuc_bildir`, `notify_new_hizli_davet`) tek kişilik dizi yolluyor. Gövde ve ölü abonelik silme try-catch içinde. `satin_alma_dogrula`: kullanıcı başına 60 sn'de 10 istek (bellek içi, her sunucu örneği için ayrı sayar; asıl tekrar koruması token UNIQUE kısıtında). Dağıtım notları değişmedi: bkz. PROJECT_CONTEXT › Açık İşler (`send-push` `--no-verify-jwt` ile dağıtılmalı).
7. **vercel.json:** Bütün yollara `X-Content-Type-Options: nosniff` + `Referrer-Policy: strict-origin-when-cross-origin` eklendi. X-Frame-Options / CSP eklenmedi.

## Testler
- `araclar/guvenlik-c-prova.mjs`: tek işlem, taklit kullanıcılar, sonunda ROLLBACK (geri alma). **Prova (migration işlem içinde): 56/56. Canlıda uygulandıktan sonra aynı set (migration'sız): 56/56.**
  - Görünmez karakter: Türkçe karakter/noktalama, emoji (ten rengi, ZWJ aile, bayrak), boşluk/sekme/satır sonu değişmiyor; ZW/RLO/BEL/BOM/isolate ve harf arası ZWJ siliniyor.
  - DM ve şikâyet: normal DM gidiyor; görünmez karakterli DM temizleniyor; yalnız görünmez karakterden oluşan mesaj "Mesaj boş olamaz" alıyor; şikâyet açıklaması temizleniyor (emoji kalıyor).
  - Arkadaşlık: ilk istek gidiyor, 60 sn bekleme çalışıyor, 100. istek gidiyor, 101. istek doğru hatayı alıyor; davet kodu yolu da tavana tabi.
  - Kasa: ilk davet gidiyor, red sonrası bekleme ve günlük tavan hatası doğru.
  - Hız sınırı: 5 RPC sınır altında çalışıyor, üstünde duruyor (ikisi sessizce atlıyor).
  - Satın alma: 3 RPC'de kilit var, iş hatası akışı bozulmamış.
  - tercih_kategori: geçerli değer ve null yazılıyor, çöp değer reddediliyor.
  - Yetki: 14 fonksiyon anon'a kapalı, iki yardımcı authenticated'a da kapalı; anon'a açık tek fonksiyon `ses_secimleri_oyun`.
- İz kontrolü: test sonrası `prova-c-*` kullanıcı 0, yeni sayaç satırı 0, `idle in transaction` 0.
- `npm run build` temiz · `arayuz-denetim` (1054 sonrası) **TEMİZ**. Denetimin açtığı misafir hesabı `hesabimi_sil` ile silindi (DB'de 0).
- `npm test`: tek kırmızı test **bu işten bağımsız ve önceden vardı**: `oyun/_test/skill-sistemi-test.mjs` "İkinci Şans Klasik ve Düello içindir" `['1v1','duello']` bekliyor, ama kod `kasa`'yı da içeriyor (Kasa'ya İkinci Şans eklenmiş, test güncellenmemiş). DB testleri bağlantı olmadığı için atlandı.

## Yapılamayan / dikkat
- **Düello daveti tavanı canlı akışta uçtan uca denenemedi:** Yeni test hesabı, tavana gelmeden Düello açılış kilidine ("5 maç daha oyna") takılıyor. Kod bloğu Kasa ile birebir aynı ve katalogdan doğrulandı.
- Edge Function'lar dağıtılmadı (talimat gereği). Yerelde Deno yok, bu yüzden TypeScript derleme denetimi yapılamadı. Değişiklikler küçük ve tip uyumlu yazıldı; dağıtırken `supabase functions deploy` paketlemesi ilk kontrol olur.
- `docs/guvenlik-c-geri-al.sql` kendi `begin/commit`'ini taşıdığı için `migration-prova` ile denendiğinde canlıda gerçekten işledi. O anda 1053 henüz uygulanmamıştı, yani gövdeleri canlıdakiyle birebir aynı olarak yeniden yazdı. Ardından 13 fonksiyonun tanımı önceki dökümle karşılaştırıldı: **aynı**. Yeni fonksiyon ya da kısıt eklenmemişti.
- Başka bir oturumdan kalan misafir hesabı `ArayuzDenetim131` (13:57 UTC) canlıda duruyor; bu işe ait olmadığı için dokunulmadı.

## Madde 8 — aynı kalıp taraması
- **Görünmez karakter:** Başkalarının gördüğü serbest metin alanı yalnız DM ve şikâyet açıklaması; ikisi de düzeltildi. Takma ad zaten sıkı bir karakter listesiyle sınırlı; maç/grup sohbeti sabit listeden. `profiles`'ta istemcinin doğrudan yazabildiği metin kolonları yalnız `dil` (CHECK var) ve `tercih_kategori` (artık CHECK var). Yan oyunların metin parametreleri (`kafatopu_*`, `gl_profil_kaydet`, `ses_*`) serbest metin değil, kod/kimlik değerleri.
- **Hız sınırı olmayan yazma RPC'leri (authenticated'a açık, ~70):** Çoğu kendi satırını değiştiren ucuz işlemler (`dm_okundu`, `bildirimleri_oku`, `*_aramadan_cik`, `*_terk`, `*_iptal`, `*_nabiz`, tercih kaydetme) ya da maç durumunu `FOR UPDATE` ile ilerleten `advance_*` / `get_match_question`. Bunlara sınır gerekmiyor ya da sınır maç hızını bozar. Bu işte düzeltilmedi; ileride bakılabilecekler: `respond_challenge` / `respond_group_challenge` / `respond_hizli_davet`, `rovans_iste`, `engel_kaldir`, `kafatopu_odaya_katil` (oda kodu tahmini), `avatar_onay_kaydet` / `kozmetik_onay_kaydet`. Hiçbiri coin/elmas vermiyor, hepsi oturum istiyor.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Profil tutarlılık turu (10 Eki 2026)

**İstek:** Profil sayfasını (bütün sekmeler) tek kart + tek başlık standardına getirmek; tekrar eden bilgileri kaldırmak. İşlev/veri/RPC değişmedi, migration yok.

## Ne değişti
| Alan | Önce | Sonra |
|---|---|---|
| Kart stili | 3 farklı: kalın lacivert çerçeve (kimlik, sayılar), çerçevesiz QtKart (Koleksiyon, Kategori, Ustalık, Ayarlar…), soluk boş kart (kupa/seri 0) | Profil'deki bütün QtKart + QtListe: beyaz zemin, 3 px lacivert kontur, 4 px alt dudak, 18 px köşe, 16 px iç boşluk (`.qt-pf .qt-kart`, `dukkan-profil.css`). Kimlik ve sayı kartları aynı köşe/dudak. Yeni bileşen yok. |
| Başlık stili | Altın `qt-plaka` (Ödüllerim, Koleksiyon, Kategori başarın, Seri ve jokerler, Kategori ustalığı) + gri büyük harf (VİTRİN ROZETLERİ, SIRADAKİ ÖDÜLLER) + sade | Hepsi sade lacivert `qt-baslik-3`, sola dayalı. Profil içinde `.qt-plaka` nötr; Koleksiyon başlığındaki yıldız ikonu gizli. |
| Kimlik | XP iki kez ("47/130 XP" + "Level 28 için 83 XP"); vitrin ayrı kart; "Sonraki rütbe" en altta ayrı kart | XP tek satır "47/130 XP → Lv 28" (`LevelCubugu xpSatiri`); çubuğun altında "Sonraki rütbe: [ikon] Kahin · Lv 50" (son rütbede yok); kesik çizgiyle ayrılmış "Vitrin" satırı, rozetler 44 px, sağa hizalı (vitrin boşsa satır yok). Ayarlar/Davet'e doğrudan gelince kısa kimlik aynen (şerit yok). |
| Sekmeler | Dar ekranda yalnız aktif sekmenin yazısı vardı | Beşi de ikon + kısa yazı (İstatistik, Ayarlar, Rozetler, Koleksiyon, Davet), eşit genişlik, aktif beyaz; ≤700 px'te ikon üstte, yazı 11 px. 360 px'te kırpık yazı 0 (ölçüldü). Sıra değişmedi. Üst bardaki dişli menü aynen. |
| Ödüllerim | Kupa/seri boşken soluk kartta cümle | Üçü aynı kalıp: ikon + büyük sayı + küçük etiket. Kupa 0 → "0 · Kupa · turnuva kazan", seri 0 → "0 · Günlük seri" (TR/EN). |
| Sıradaki ödül | 3 satırlık liste, gri büyük harf başlık | `LevelOdulleri vurgu`: solda görsel (avatarsa 56 px resim), sağda ad + "Lv 35'te · 8 level kaldı" + mavi çubuk, altta "Yolda: Lv 30 joker · Lv 35 joker". Varsayılan liste görünümü aynen durur (başka sayfada canlı kullanımı yok; önizleme sayfası kendi taklidini çiziyor). |
| Kategori başarın | "242 maç · 195 maçın istatistiği"; renkli çerçeveli kutular | "195 maçtan istatistik"; satırlar sade: ikon · ad · çubuk · yüzde, ince ayırıcı. Kategori rengi ikon ve çubukta. Unvan rozeti altın kaldı. |
| Koleksiyon özeti, Ustalık, Hatalarım | Çerçevesiz kart + altın plaka başlık | İçerik aynı; dış kart ve başlık standarda çekildi. |

**Öncelik kararı (Sıradaki ödül):** istek "avatar > skill > rütbe > joker". Kodda ayrı bir "skill" ödülü yok — level ödülü olan "Skill hakkı" arayüzde "Joker" olarak gösteriliyor (`jokerAdi`). Bu yüzden uygulanan sıra **avatar > rütbe > joker**. Zaten sahip olunan avatar (coin'e dönüyor) ana ödül sayılmaz. Arama penceresi 30 level; çubuk son 5'lik basamaktan ödül level'ine ölçeklenir (Lv 27 → 35: 25'ten 35'e). Türkçe ek sayıya göre (28'de, 30'da, 40'ta, 35'te).

**"242 maç · 195 maçın istatistiği" kararı (koddan):** `oyuncu_kategori_profili` (migration 204) → `toplam_mac` = `profiles.toplam_mac`, `istatistikli_mac` = `oyuncu_istatistik.istatistikli_mac`: cevap kaydı olan maç sayısı (maç bitince `istatistikli_mac_arttir` ile +1; ilk dolum cevap tablolarından). Bu **son N maç değil**, bütün geçmişten cevabı kayıtlı maçlar. Yazılan: **"195 maçtan istatistik"** / "Stats from 195 matches". Aynı bileşen oyuncu kartında da kullanıldığı için orada da bu ifade görünür.

**Dosyalar:** `oyun/pages/ProfilePage.jsx`, `oyun/components/LevelCubugu.jsx` (`xpSatiri`), `oyun/components/LevelOdulleri.jsx` (`vurgu`), `oyun/components/KategoriProfili.jsx`, `oyun/tasarim/ekranlar/dukkan-profil.css`, `oyun/tasarim/ekranlar/dukkan-bilesen.css`, `oyun/lib/ceviri/profil-tutarlilik.js` (+ `oyun/lib/dil-en.js`), araç `araclar/profil-tutarlilik-ekran.mjs`.

## Test
- `npm run build` temiz (eski iPhone uyumluluk denetimi TEMİZ). `npm run test:kurallar` fail 0, `npm run test:dans` TÜMÜ GEÇTİ. `_test/sunucu` DB testleri koşulmadı (sunucu tarafı değişmedi; canlı DB yük kuralı).
- `arayuz-denetim`: **TEMİZ** (taşma yok, sabit öğe kayması yok, dokunma hedefi ≥ 44 px, konsol temiz).
- Önce/sonra tam sayfa: `tasarim/profil-tutarlilik/` — 112 görüntü: `<once|sonra>-<dolu|bos>-<sekme>-<360|390>-<tr|en>-<acik|koyu>.png`. "dolu" = misafir hesabı + taklit yanıt (vitrin 3 rozet, kupa 2, seri 6, Lv 27 47/130 XP, 242/195 maç; sunucuya yazılmaz), beş sekme; "bos" = misafirin gerçek boş hâli (İstatistik + Ayarlar). Dil × senaryo başına sayfa bir kez açıldı (toplam 4 yükleme); genişlik/tema/sekme aynı sayfada değişti. Sabit alt menü görüntüde gizli (içeriği örtmesin). Sonra: **taşma 0, sekme kırpığı 0, sayfa/konsol hatası 0** (önce: sekme kırpığı 56 — pasif sekmelerin yazısı gizliydi).
- Koyu tema oyunda kapalı (`KOYU_TEMA_KAPALI`); `data-tema="koyu"` zorlanarak çekildi, önce/sonra aynı davranış, bozulma yok. Hareketi azalt: görüntüler `reducedMotion: reduce` ile alındı, yeni hareket eklenmedi.

## Kontrol listesi
| Kontrol | İstatistik | Rozetler | Koleksiyon | Davet | Ayarlar |
|---|---|---|---|---|---|
| Her kart aynı çerçeve | ✓ kimlik, 3 sayı, Sıradaki ödül, Koleksiyon, Kategori, Seri ve jokerler, Ustalık, Hatalarım | ✓ Vitrinim + rozet grupları | ✓ Görünümün, Koleksiyon, Unvanlar, Çerçeveler, Arka planlar, Avatarlar | ✓ | ✓ Güvence, Oyun ayarları, Takma ad, Avatar, Davet kodu, Engellediklerim, Şehir, Hesap listesi |
| Her başlık aynı stil | ✓ | ✓ | ✓ | ✓ | ✓ ("Hesap" zemin başlığı aynı boy) |
| Taşma / kırpılma (360 + 390, TR + EN) | 0 | 0 | 0 | 0 | 0 |
| Tekrar eden bilgi kaldı mı | Hayır: XP tek satır, vitrin tek yerde, sonraki rütbe tek satır | — | — | — | — |
| Boş durumlar | vitrin boş → satır yok ✓ · kupa 0 → "0 · Kupa · turnuva kazan" ✓ · seri 0 → "0 · Günlük seri" ✓ · misafir rozeti ✓ · koleksiyon boş tek satır ✓ · kategori "maç yok" ✓ | ✓ | ✓ | ✓ | misafir güvence kartı en üstte ✓ |

**Bilinçli istisnalar:** Ustalık satırlarının ve rozet/koleksiyon kalemlerinin kendi iç kutuları içerik olarak kaldı ("içerik aynı"); yalnız dış kart eşitlendi. Sayı kartlarında yatay iç boşluk 8 px (üç sütun 360 px'te "1.840" sığsın), dikey 16 px. Davet kartındaki altın "300 sana / +100" çipleri ödül olduğu için kaldı. Hesap silme akışı ve "Hesap" bölümünün işlevi değişmedi.

## Başka sayfalarda aynı tutarsızlık (DÜZELTİLMEDİ — yalnız rapor)
- **Arkadaşlar:** "Arkadaşını davet et" kartı krem/altın zeminli + kalın kontur; hemen altındaki "Arkadaşların" boş durum kartı beyaz ve konturuz (yumuşak gölge); "Davet koduyla ekle" açılır satırı kartsız. Tek ekranda üç kart dili.
- **Lig:** Yüklenirken iskelet kartı beyaz/konturuz, yüklenince liste kartı kalın konturlu (geçişte stil değişiyor). "YÜKSELME HATTI" yeşil büyük harfli ara başlık. Sayfa başlığı krem zeminli plaka.
- **Dükkân › Joker:** Joker kartları kendi renginde degrade zemin + sol şerit (qt-oyk dili); sekme altındaki "Jokerler · Nadir avatar ve imzalar / Öteki kozmetikler" bilgi satırı kartsız iki sütun; bölüm başlığı yok. Profil'in beyaz kart standardından ayrı dil (renk = joker kimliği olduğu için bilinçli olabilir).
- Ortak kök: `QtKart` varsayılanı konturuz (yalnız alt dudak); "oyun kartı" dili (3 px kontur) sayfa CSS'lerinde elle veriliyor. Bütün site için `QtKart`'a ortak konturlu bir varyant eklemek düşünülebilir — bu iş Profil'le sınırlı tutuldu.

## Dikkat
- Çalışma sırasında canlı Supabase'de statement timeout'lar görüldü; aynı saatte başka oturumun incelediği Kasa olayıyla (migration 1055) çakışıyor. Ekran aracı bu yüzden sayfa başına tek yükleme yapıyor.
- Eski "Sonraki rütbe" kartındaki rütbe ilerleme çubuğu kalktı (bilgi tek satıra indi; istek gereği).

RAPOR HAZIR — Ida'ya iletilecek.

---

# Kasa (Ortak Hazine) takılması — kök neden ve düzeltme (10 Eki 2026, migration 1055)

## Kök neden (kanıtlı)
**İki katmanlı:** sunucu kısa süre yavaşladı → Kasa'nın yazma kilitli yoklaması 500 verdi → **istemci askıda kalan tek isteğe takılıp yoklamayı tamamen bıraktı.**

1. **Sunucu (Supabase logları, 16:00–16:05 UTC):** veritabanı genel olarak yavaşladı — `cron_hizli_tik` 12,5 ve 21,7 sn sürdü (normalde ort. 0,2 sn), checkpoint 16:00:24–16:01:37, `group_matches` satırında 8 bekleyenli kilit kuyrukları (`grup_mac_nabiz` / `advance_group_match`; o dakikalarda gerçek bir oyuncu botlarla art arda grup maçı oynuyordu). Kilitle ilgisi olmayan basit sorgular bile 8 sn `statement_timeout`'a düştü (`profiles` SELECT'i, `oyuncu_nabiz` INSERT'i, `gorev_olcum`).
   - `kasa_giris` 16:00:40 "canceling statement due to statement timeout" (maç satırı kilidini tutarken) → arkasındaki `kasa_durum` aynı satırı beklerken 8 sn'de düştü (**açılıştaki ~10 sn boş ekran**).
   - `kasa_cevap` 16:01:27: maç satırında 4,3 sn bekledi, sonra `nabiz_yaz`'da zaman aşımı (**Geyik cevabı 500**). `kasa_durum` 16:01:48 ve 16:02:52 `kasa_cozumle` içinde zaman aşımı.
   - Sebep zinciri: `kasa_durum` her yoklamada `kasa_kilitle` ile maç satırını **FOR UPDATE** kilitler + nabız yazar + ilerletir; DB yavaşken aynı maçın çağrıları sıraya girip toplu 8 sn sınırına takıldı. Düello okuması bu kadar ağır yazmadığı için aynı dakikalarda çalıştı.
2. **İstemci (edge logları):** 16:02:15'ten sonra sayfa **hiç `kasa_durum` isteği atmadı** (kalp_at sürdü). `KasaPage` okumaları tek söze (`yukleSozRef`) bağlıyor; yanıtı gelmeyen tek istek o sözü sonsuza tuttu, sonraki her yoklama ona zincirlendi → sunucu düzelse de ekran Tur 3'te 0 sn'de, "Bağlantı yeniden kuruluyor…" bandıyla dondu. Maç 16:05'te sunucuda `kopuk` ile bitti.
3. **1052/1053/1054 ile ilişki:** doğrudan sebep değil. `kasa_durum`'daki `hiz_siniri` 950'den beri var; 1052 yalnız `hileli_mi()` okuması ekledi (yazma yok); 1053/1054'ün `kalp_at`/`cihaz_bildir` sınırı ayrı satırlar (`rpc_sayac` aynı kullanıcı + uç adı) — olay anında bu satırlarda kısa (≈1 sn) bekleme görüldü ama zaman aşımı oradan gelmedi.

## Düzeltmeler
| | |
|---|---|
| **1055** (canlı) | `kasa_durum`: `SET lock_timeout '2s'`; maç kilidi 2 sn'de alınamazsa 500 yerine **kilitsiz görünüm** (yetki kontrolü aynı; o yoklamada ilerletme atlanır, sıradaki yoklama ilerletir). ACL/RLS değişmedi. Prova (BEGIN…ROLLBACK) → canlı. Canlı kilit testi: satır başka bağlantıda kilitliyken `kasa_durum` **2,1 sn'de 200** (eskiden 8 sn + 500). Geri alma dosyası yok (gövde 1052 tanımıyla aynı, yalnız blok + SET eklendi). |
| `KasaPage.jsx` | `kasa_durum` isteği **10 sn'de `AbortController` ile kesilir** → hata yoluna düşer, geri çekilmeli yeniden dener, yanıt gelince bant kalkar ve tur/soru/süre sunucudan yeniden çizilir. |
| `KasaPage.jsx` | `kasa_cevap` sunucu/ağ hatasında (500, 57014, ağ) aynı tur sürüyorsa **0,7 sn sonra bir kez sessizce yeniden** gönderilir (tıklama anı başlığı korunur → geç varış payı içinde sayılır); "zaten cevapladın" = cevap kayıtlı. Yine olmazsa: "Cevabın sunucuya ulaşmadı. Süre bitmediyse şıkkı yeniden seç." |
| `KasaPage.jsx` + `kasa.css` | Yükleniyor: Kasa renginde ikon + **"Maç yükleniyor…"** metni (eskiden Düello kırmızısı, metinsiz sallanan ikon). 8 sn'de veri yoksa okunur **"Maç açılamadı" + "Tekrar dene"** (arka planda deneme sürer, veri gelince maç açılır). |
| `DuelloPage.jsx` | Aynı askıda kalma kalıbı vardı → `duello_durum` / `duello_baglanti` aynı 10 sn kesme. |
| Klasik (`MatchPage`) | Kalıp yok: her yoklama bağımsız, zincir yok. Değişiklik yapılmadı. |
| `skill-sistemi-test.mjs` | İkinci Şans beklentisi `["1v1","duello","kasa"]`. |
| `kasa-canli-testi.mjs` | `--kopma` bot senaryosunda A'ya da uygulanır, süre `--kopmasn`. |

"Maç açılamadı" metninin DOM'da olup görünmemesi yerelde yeniden üretilemedi (taklit 500 ile ekran okunur çıktı: `once-yukleme-hatasi-390.png`). Gözlenen "sallanan kırmızı ikon", Kasa'nın Düello renginde (kırmızı) çizilen yükleniyor ikonuydu; artık metinli ve Kasa renginde, 8 sn'de hata ekranına geçiyor.

## Test sonuçları
- **Canlı, bota karşı Serbest Hazine (test hesabı, quiztactics.com, yeni kod yayında):**
  - Maç 1 `330c246d` — 20 tur, `bitti/hedef`, açılış (giriş sahnesi + 3-2-1) → her tur → final sahnesi → sonuç ekranı. Bu sırada DB yine yavaşladı (16:30 UTC, aynı grup maçı kilitleri): bir `kasa_durum` 10 sn'de **kesildi**, ekran toparlandı, maç sürdü.
  - Maç 2 `1eaeff62` — **400 ms ağ gecikmesi + Tur 3'te 12 sn bağlantı kopması** (Chrome öykünmesi): 23 tur, 90-36 kazanıldı, `bitti/hedef`. Boş ekran 0, çift ekran 0, faz geri dönüşü 0, takılı bant 0.
  - Test aracının kalan kırmızıları bu işle ilgisiz ve eski beklentiler: DEVAM düğmesinde "ÜCRETSİZ 50:50 / ×2" ve `devam_odul` (Serbest Hazine'de bu kurallar şu an kapalı), "Yeni Kasa maçı" (düğme artık "Yeni maç"); 400 ms gecikmede sayaç 0'da ~5 sn (sunucunun geç varış payı, tasarım gereği).
- **Toparlanma (yerel, taklit `kasa_durum`; canlıya yük yok):** normal → 16 sn yanıtsız → yeniden 200. Yeni kod: bant çıktı, sonra **kalktı ve Tur 5 çizildi — GEÇTİ**. Eski kod (aynı test): bant hiç çıkmadı, sunucu dönünce de **Tur 4'te donuk kaldı** (Ida'nın gördüğü). Görüntüler: `once-toparlanma-*`, `sonra-toparlanma-*`.
- **Cevap yeniden denemesi (taklit):** ilk 500 + ikinci 200 → 2 istek, ekranda hata yok · hep 500 → 2 istek, net mesaj (`sonra-cevap-*.png`).
- **Düello (taklit):** ilk `duello_durum` yanıtsız → 10,8 sn'de kesildi, ikinci istekle sayfa açıldı (eski kodda sonsuz yükleniyor). Canlı Düello duman testi yapılamadı: yeni test hesabında Düello kilitli (5 Klasik maçı şartı, 1 oynanmış).
- **Klasik duman (canlı, `oyuncu-testi --mod=klasik`):** 20 soru dokunuldu, hepsi sunucuya ulaştı. (Ana sayfada 390 px'te `ls-ad-dugme` × `sz-mini` 3 px üst üste binme bulgusu — bu işle ilgisiz, profil/ana sayfa alanı.)
- `npm run build` temiz · `npm test` yeşil · `skill-sistemi-test` 8/8 · `arayuz-denetim` **TEMİZ**.
- Test hesapları: **ArayuzDenetim131** ve testte kullanılan **ArayuzDenetim826** `hesabimi_sil` ile silindi ("tam"); `profiles` ve `auth.users`'ta 0, `ArayuzDenetim%` toplam 0.

## Ayrı bulgu (düzeltilmedi, karar gerekir)
DB yavaşlamasının tetikleyicisi grup maçı akışı: istemci `grup_mac_nabiz` + `advance_group_match` + `group_matches` okumasını sık çağırıyor, `cron_hizli_tik` › `bot_oyna` › `advance_group_match` aynı satırı tek uzun işlemde kilitliyor (12–22 sn). Nano işlemcide bu, bütün modları yavaşlatıyor. Önerim: `advance_group_match`/`grup_mac_nabiz`'e de kısa `lock_timeout` + kilitsiz dönüş, cron'da maç başına ayrı işlem. Ayrıca `gorevlerim` (ort. 1,16 sn) ve `get_categories` (1,13 sn) pahalı.

**Migration:** 1055 (`20260612001055_kasa_durum_kilit_beklemesi.sql`) — canlıda uygulandı.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Profil tutarlılık turu 2 — İstatistik sekmesinin alt yarısı (10 Eki 2026)

**İstek:** 68a92b5'in üst kısmına dokunmadan Seri ve jokerler, iki kategori bölümü ve Sıradaki ödül tekrarını düzeltmek. Migration yok; Kasa dosyalarına dokunulmadı.

## Ne değişti
| Alan | Önce | Sonra |
|---|---|---|
| Seri ve jokerler | 4 renkli zeminli kutu (güncel seri, en uzun seri, kullanılan joker, izlenen video) + yalnız ikon + sayı çipleri | "Güncel seri" (Ödüllerim'deki Günlük seri ile aynıydı) ve "İzlenen video" kalktı. "En uzun seri" + "Kullanılan joker" Ödüllerim'deki beyaz sayı kartıyla birebir aynı kalıpta (`qt-pf-sayi`: ikon + büyük sayı + küçük etiket). Joker envanteri 2 sütunlu sade liste: ikon · kısa ad · adet ("50:50 · 19"); zemin beyaz, renk yalnız ikonda; uzun ad ("Soru Değiştir") iki satıra sarar, kesilmez. Başlık aynı. |
| Kategoriler | İki bölüm: "Kategori başarın" (yüzde) + "Kategori ustalığı" (renkli zeminli 10 kart: doğru + rütbe) | Tek bölüm "Kategori başarın". Üstte unvan rozeti (altın) + "199 maçtan istatistik · 3.961 doğru". Satır: kategori ikonu · ad · rütbe rozeti (Çırak/Kalfa/Usta/Üstat/Efsane, mevcut stil) · doğru oranı çubuğu (kategori renginde) · yüzde; altında gri "299 doğru · Usta için 1 kaldı". Sıra ustalık sırası (en çok doğru üstte). Verisi olmayan kategori (0 doğru, yüzde yok) çizilmez. 360 px'te çubuk ad satırının altına iner; ≥ 560 px'te aynı satırda. |
| Sıradaki ödül | "Yolda: Lv 30 joker · Lv 35 joker" — Lv 35 büyük ödülün kendi level'ı | Büyük ödülle aynı level'daki öteki ödül kartın içinde küçük ek: "Büyücü (avatar) + joker". "Yolda" yalnız başka level'lar: "Lv 30 joker · Lv 40 joker". |

**Veri:** Ustalık satırları tek RPC'den (`ustalik_seviyelerim`) gelir; `UstalikIzgarasi` veriyi `onSeviyeler` ile ProfilePage'e verir, ProfilePage `KategoriProfili`'ne `ustalik` prop'u olarak geçirir. Yeni RPC yok, çağrı sayısı aynı.

## Başka yerlerdeki görünüm
- `KategoriProfili` oyuncu kartında da kullanılıyor (`OyuncuKarti.jsx`, `kucuk`): `ustalik` verilmediği için **eski görünüm aynen** (yüzde satırları, rütbe/doğru yok). Birleşik görünüm yalnız Profil'de.
- `UstalikIzgarasi` yalnız Profil'de kullanılıyor. `kategoriYok` verilmezse eski "Kategori ustalığı" kartı hâlâ çizilir (kod duruyor, silinmedi).
- `LevelOdulleri` vurgu görünümü yalnız Profil'de; varsayılan liste görünümü değişmedi.

**Dosyalar:** `oyun/components/UstalikIzgarasi.jsx` (`kategoriYok`, `onSeviyeler`, `SEVIYE_KOD` dışa açıldı), `oyun/components/KategoriProfili.jsx` (`ustalik`), `oyun/components/LevelOdulleri.jsx` (ek + Yolda), `oyun/pages/ProfilePage.jsx` (2 satır bağlantı), `oyun/tasarim/ekranlar/dukkan-bilesen.css`, `oyun/lib/ceviri/profil-tutarlilik.js`, araç `araclar/profil-tutarlilik-2-ekran.mjs`.

## Test
- `npm run build` temiz (eski iPhone denetimi TEMİZ) · `test:kurallar` fail 0 · `test:dans` TÜMÜ GEÇTİ · `arayuz-denetim` **TEMİZ**.
- Önce/sonra tam sayfa (İstatistik sekmesi): `tasarim/profil-tutarlilik-2/<once|sonra>-<bos|bir|on>-<360|390>-<tr|en>.png` — 24 görüntü. Taklit veri (sunucuya yazılmaz): **bos** hiç maç yok · **bir** yalnız Tarih (40 doğru, Çırak, %62) · **on** 10 kategori, Teknoloji **Usta**, Tarih "299 doğru · Usta için 1 kaldı", Müzik Üstat, Edebiyat Efsane, 9 joker. Sonra: taşma 0, sayfa/konsol hatası 0.
- Araç düzeltmesi: oturum her bağlamdan sonra dosyaya geri yazılıyor (Supabase yenileme belirteci tek kullanımlık; eski kopya ikinci bağlamda 400 alıyordu). Denetim oturumu süresi dolduğu için yeni misafir hesabı açıldı.

## Sayfa baştan sona kontrol (İstatistik)
| Kart | Beyaz + lacivert çerçeve | Renk yalnız ikon/çubuk/rozette |
|---|---|---|
| Kimlik + level şeridi + vitrin | ✓ | ✓ |
| Ödüllerim (3 sayı) | ✓ | ✓ ikon diski |
| Sıradaki ödül | ✓ | ✓ mavi çubuk |
| Koleksiyon | ✓ | ✓ (boş hâlde ikon dairesi açık mavi) |
| Kategori başarın | ✓ | ✓ ikon plakası, çubuk, rütbe rozeti, altın unvan rozeti |
| Seri ve jokerler | ✓ | ✓ ikon diski / joker ikonu |
| Hatalarım | ✓ | ✓ ikon kutusu |

Renkli zeminli kutu kalmadı. Not: Seri ve jokerler'deki iki sayı kartı Ödüllerim kalıbında olduğu için kendi çerçevesiyle kart içinde duruyor (istek "birebir aynı kalıp").

RAPOR HAZIR — Ida'ya iletilecek.

---

# Canlı kesinti — 10 Eki 2026, 20:30 (TR) · 1056 GERİ ALINMADI

## Ne yapıldı
1. **Canlıya yük bindiren test durduruldu:** `araclar/kasa-canli-testi.mjs --senaryo=bot --adres=https://quiztactics.com`
   bu bilgisayarda çalışıyordu (17:25–17:32 UTC arası dakikada 106–192 istek, çoğu `rpc/kasa_durum`). Süreç kapatıldı;
   17:33'ten itibaren bu IP'den gelen istek dakikada ~10'a düştü.
2. Salt-okuma ölçüm (pg-mini + Management API log/health). Hiçbir SQL değişikliği yapılmadı.

## Ölçüm
| | |
|---|---|
| Bağlantı / kilit (17:36–17:40 UTC) | 25–36 bağlantı, 0–5 aktif, **kilit bekleyen 0**, bekleyen `FOR UPDATE` yığını yok |
| Basit katalog sorguları | `pg_stat_activity` sayımı 11–15 sn, `pg_stat_statements` 40 sn'de bile bitmedi; yeni bağlantı 14,6 sn |
| İstek yükü (edge log, 17:15'ten beri) | 2.220 istek; **1.960'ı bu bilgisayardan** (Kasa testi), 256'sı tek gerçek kullanıcı. Yük düşük |
| cron `hizli_tik` | 1056 sonrası **17:21–17:31 normal** (ort. 0,04–0,09 sn). 17:32'den itibaren `job startup timeout` |
| Öteki cron işleri | `cron_dakika_tik` 121 sn, `cron_sezon_tik` 49 sn, `bot_puan_tik` / `turnuva_lobi_botlari` 12 sn ile düşüyor — 1056'nın dokunmadığı işler de |
| Aynı desen 1056'dan ÖNCE | 14:45, 15:30, 16:00–16:45 UTC dilimlerinde `cron_dakika_tik` 16–31 sn, `hizli_tik` 11–24 sn, edge 5xx (16:35'te 17 adet) |
| Health (17:41 UTC) | `db`, `rest`, `auth` **UNHEALTHY**; realtime sağlıklı. 17:42'de DB yeni bağlantı kabul etmiyor, REST 504/zaman aşımı |
| Plan | Compute eklentisi yok → **Nano** (paylaşımlı CPU, 0,5 GB RAM, düşük disk IO tabanı). DB 119 MB, okuma %99,99 bellekten |

## Kök neden değerlendirmesi
- **1056 kaynağı değil.** Göstergeler: (a) 1056 uygulandıktan sonraki 10 dakika tikler normaldi; (b) aynı takılma deseni
  1056'dan 2,5 saat önce de vardı (1056 zaten bunun için yazılmıştı); (c) şu an kilit bekleyen yok, 1056'nın hiç
  dokunmadığı işler ve katalog sorguları bile yavaş; (d) test durduktan 10 dk sonra durum düzelmedi, kötüleşti.
- Desen **örnek (instance) düzeyinde kaynak tükenmesi**: arka uç başlatma (`job startup timeout`), yeni bağlantı ve
  diskten okuyan `pg_stat_statements` dakikalarca sürüyor, ama bellekteki sorgular hızlı. Nano'nun disk IO / CPU
  bütçesinin tükenmesiyle uyumlu (9 Eki "Disk IO kotası" notu). Bütçe grafiği yalnız panelde; API'den okunamadı.
- Yükü artıranlar: gün boyu bu bilgisayardan koşan canlı testler (Kasa botu) ve her 5 sn'de yeni arka uç açan `hizli_tik`.

## Neden geri alınmadı
Brif "sorun 1056'dan geliyorsa" diyordu; kanıt aksini gösteriyor. Ayrıca geri alma 10 fonksiyonu yeniden yazan DDL'dir:
bu durumda (a) DB bağlantı kabul etmediği için uygulanamaz, (b) uygulanabilse kilit/IO yükünü artırır, (c) 1056'nın
çözdüğü grup maçı kilit yığılmasını geri getirir. Geri alma dosyası hazır duruyor: `docs/grup-mac-kilit-1056-geri-al.sql`.

## Ida'nın kararı gereken
1. **Projeyi yeniden başlatma** (Supabase panel › Settings › General › Restart project, ya da benden iste — onayın olmadan
   yapmadım). Kaynak tükenmesinde en hızlı düzeltme budur.
2. Kalıcı çözüm seçeneği: Micro compute (~10 $/ay; 1 GB RAM, disk IO tabanı 87 MB/sn). Bu bir ücret kararı.
3. Canlıya karşı test koşmayı durdurmak (CLAUDE.md kuralı zaten böyle; bugün yine çalışıyordu).

Not: Bu bilgisayarda Codex süreçleri ve iki Vite geliştirme sunucusu (5199 ve varsayılan port) açık; onlara dokunmadım.

RAPOR HAZIR — Ida'ya iletilecek.

## Yeniden başlatma ve 15 dk izleme (Ida onayıyla, 10 Eki 2026)
- **17:51 UTC** Management API `POST /v1/projects/<ref>/restart` → 200. Proje 17:56 UTC'de `ACTIVE_HEALTHY`
  (arada REST 521/522 döndü). db / rest / auth sağlıklı.
- **Canlı kontrol (17:57 UTC, tek seferlik, 390 px):** ana sayfada coin (10.000), Sezon ve Ortak Hazine kartları
  geldi; Dükkân (`/joker`) açıldı, jokerler listelendi. 62 Supabase isteğinin **0'ı** hatalı.
- **İzleme 17:57–18:12 UTC (3 dk'da bir hafif sorgu):**

| UTC | hizli_tik ort / maks | dakika_tik ort / maks | hata | bağlantı | kilit bekleyen |
|---|---|---|---|---|---|
| 18:00 | 0,05 / 0,53 sn | 0,19 / 0,47 sn | 0 | 20 | 0 |
| 18:03 | 0,04 / 0,08 sn | 0,17 / 0,36 sn | 0 | 21 | 0 |
| 18:06 | 0,03 / 0,04 sn | 0,04 / 0,05 sn | 0 | 21 | 0 |
| 18:09 | 0,03 / 0,04 sn | 0,04 / 0,04 sn | 0 | 21 | 0 |
| 18:12 | 0,03 / 0,05 sn | 0,04 / 0,05 sn | 0 | 14 | 0 |

  Kesinti öncesi değerler (hizli_tik 49 sn, dakika_tik 121 sn, `job startup timeout`) görülmedi. Son REST yanıtı 200, 1,2 sn.
- 1056 yerinde duruyor; geri alma gerekmedi. Kalıcı risk sürüyor: Nano kaynak sınırı (compute kararı Ida'da) ve
  canlıya karşı koşan testler.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Grup maçı kilidi — bütün modları yavaşlatan kilit yığılması (10 Eki 2026, migration 1056 + 1057)

## Ölçüm (önce, canlı, salt okuma)
- `pg_stat_statements` (7 Eki'den beri): `cron_hizli_tik` 13.031 çağrı, **ort. 231 ms, maks. 81,4 sn**; `cron_bot_oyna` maks. 45,6 sn; `advance_group_match` (istemci) 227 çağrı, ort. 475 ms, maks. 7,8 sn; `mac_nabiz` 800 çağrı, maks. 7,7 sn.
- `cron.job_run_details` (bugün): `hizli_tik` saatlik en uzun tur 11–24 sn; **39 tur "job startup timeout"** (pg_cron bağlantı bile açamadı, 10:29–16:56).
- Kilit kalıbı:
  - `hizli_tik` tek işlemde Düello + Kasa + `bot_oyna` koşturuyordu.
  - `bot_oyna`'nın 8) adımı `group_matches` satırını `FOR UPDATE` alıp **tik bitene kadar** tutuyordu; 9) adımı `advance_group_match` ile başka maçın satırını **süresiz** bekliyordu.
  - İstemci 3 sn'de bir `grup_mac_nabiz`, cevaptan sonra 2,5 sn'de bir `advance_group_match` atıyordu (ikisi de FOR UPDATE) ve **önceki yanıtı beklemeden** yenisini gönderiyordu → aynı satırda 8 bekleyenli kuyruklar.
- İki bağlantılı kilit testi (`araclar/grup-kilit-testi.mjs`; satır 6 sn kilitli, B'nin işlemi geri alınır): `grup_mac_nabiz` 5.677 ms · `advance_group_match` 5.790 ms · `mac_nabiz` 5.776 ms · `advance_match` 5.705 ms. Yani çağrılar **kilit bırakılana kadar tam bekliyor**.
- Aynı kalıp öteki modlarda da var: `advance_match`, `advance_hizli_mac`, `advance_tournament`, `mac_nabiz`, `hizli_mac_nabiz` aynı süresiz `FOR UPDATE`'i kullanıyor. Düello (`cron_duello_tik`) ve Kasa (`kasa_tik_hepsi`, `SKIP LOCKED`) zaten beklemiyor.
- `gorevlerim` (ort. 1,16 sn): yeni bağlantıdaki ilk çağrı 783 ms, ikincisi 63 ms. Sayaç başına süre soğukta 50–120 ms, sıcakta 1–10 ms. Maliyet bağlantı başına plpgsql derlemesinden, soğuk önbellekten ve DB yavaşken ölçülen çağrılardan geliyor. Eksik index yok → **değiştirilmedi**. `get_categories` (1,13 sn) sıcakta 81 ms; aynı neden, düzeltilmedi.

## Kök neden
1. **Tetikleyici: disk G/Ç kısılması.** 17:38 UTC'de checkpoint 391 tamponu (≈3 MB) yazmak için **153 sn** harcadı (normalde ~33 sn). Nano sunucunun disk G/Ç bütçesi tükenince her şey yavaşlıyor. Bütçeyi tüketen başlıca yük 9 Eki'deki **Düello v4 simülasyonu** (`pg_temp.sim_mac`, ~3.100 çağrı, ROLLBACK'li): 7 Eki'den beri üretilen 1,3 GB WAL'ın **~700 MB'ı** ondan.
2. **Büyütücü: kilit yığılması.** DB yavaşken cron'un tuttuğu grup maçı satırı ve istemcinin üst üste binen istekleri bağlantıları doldurdu. Kilitle ilgisi olmayan sorgular da 8 sn'de düştü (`rpc_sayac` satırında 8 bekleyen görüldü).

## Düzeltme
| | |
|---|---|
| **1056** (canlı) | `hizli_tik` artık `call public.cron_hizli_tik_islem()` çalıştırıyor. Önce eski tik (Düello/Kasa/öteki botlar) **COMMIT** ediliyor. Sonra her aktif grup maçı **ayrı kısa işlemde** ilerliyor (`bot_grup_mac_tik` → `bot_grup_adimlari`; bot_oyna'nın 8+9 adımı, gövde aynen taşındı). Hata ya da kilit yalnız o maçı etkiliyor. |
| 1056 | `advance_group_match` / `advance_match` / `advance_hizli_mac` / `advance_tournament`: `lock_timeout 2s`. Kilit 2 sn'de alınamazsa çağrı sessiz dönüyor; ilerletmeyi yalnız kilidi alan çağrı yapıyor. |
| 1056 | `grup_mac_nabiz` / `mac_nabiz` / `hizli_mac_nabiz`: kilit alınamazsa kilitsiz görünüm dönüyor (1055 deseni). Başlatma/duraklatma/terk geçişleri yalnız kilidi alan çağrıda. Grup/hızlıda oyuncunun kendi nabzı yine yazılıyor; `mac_nabiz`'de bir sonraki tike kalıyor. |
| 1056 | Yeni iç yordamların yetkisi `bot_oyna` ile aynı (postgres + service_role). Mevcut fonksiyonların ACL'si değişmedi (provada doğrulandı). Geri alma: `docs/grup-mac-kilit-1056-geri-al.sql`. |
| **1057** (canlı) | `bot_grup_mac_tik` her tikte, iş olmasa da maç satırını kilitliyordu (satır kilidi diske yazar). Bu kalktı; kilidi artık yalnız işi olan adım alıyor. |
| İstemci | `oyun/lib/nabiz.js` (Klasik/Grup/Hızlı ortak) ve `GroupMatchPage` ilerletmesi: yanıtlanmamış istek varken yenisi gönderilmiyor; takılan istek **10 sn'de AbortController ile kesiliyor**. Uçuştayken gelen ilerletme denemesi kaybolmuyor, yanıttan sonra bir kez tekrarlanıyor. Aralıklar (3 sn / 2,5 sn) aynı kaldı, akıcılık değişmedi. |
| CLAUDE.md | Yeni kural: canlı DB'de simülasyon, toplu deneme ve yük testi yasak — ROLLBACK edilse bile. |
| Temizlik | `pg_temp.sim_mac` ve öteki `sim_*` nesneleri kalmadı (geçici şema yeniden başlatmayla temizlendi; sorguyla doğrulandı). |

## Önce / sonra
| Ölçüm | Önce | 1056 sonrası | 1057 sonrası (18:16–18:31 UTC, 15 dk) |
|---|---|---|---|
| `hizli_tik` tur süresi | ort. 231 ms, maks. 81 sn; bugün 39 başlatma zaman aşımı | 17:15–17:32: 0,03–0,28 sn · yeniden başlatma sonrası (17:58–18:15): 190 tur, ort. 34 ms, maks. 77 ms | **267 tur, ort. 39 ms, p95 73 ms, maks. 439 ms, 0 hata** |
| `dakika_tik` | — | 17:58–18:15: ort. 94 ms, p95 385 ms, maks. 474 ms | **ort. 80 ms, p95 253 ms, maks. 336 ms, 0 hata** |
| Kilitli satırda nabız/ilerletme | 5,7 sn (kilit bitene kadar) | **2,1 sn'de 200** | aynı |
| Grup maçı istemcisi (canlı, bota karşı) | nabızlar üst üste biniyordu | nabız ort. 190 ms, maks. 470 ms · ilerletme ort. 200 ms, maks. 521 ms · **aynı anda uçuşta en çok 1 nabız** | — |
| Sorgu kaynaklı WAL | `sim_mac` ~700 MB | — | yeniden başlatmadan beri toplam ~2,5 MB (≈70 KB/dk) |

Not: LSN farkıyla ölçülen ham WAL hızı güvenilir değil (yeniden başlatma sonrası 0,5 KB/sn, 1057 sonrası 272 KB/sn). `archive_timeout=120` her 2 dakikada 16 MB'lık segmenti kapatıyor; ölçüm penceresine düşen kapanma rakamı şişiriyor. Gerçek yazı `pg_stat_statements.wal_bytes`'tan okundu. Yeniden başlatmadan beri en çok yazanlar: `cron_dakika_tik` 543 kB, `bot_puan_tik` 440 kB, `hizli_tik` 432 kB.

## Kesinti (17:32–17:56 UTC)
- 1056 uygulandıktan 17 dk sonra, canlı Kasa duman testi sürerken G/Ç kısılması yeniden başladı: checkpoint 153 sn sürdü, pg_cron bağlantı açamadı, API 20 sn'de yanıt vermedi.
- Trafik ~1 istek/sn'ydi ve hepsi test makinesinden geliyordu.
- Aynı tablo 1056'dan önce de gün boyunca vardı (39 zaman aşımı). Kesintiyi 1056'nın başlattığını gösteren bir iz yok. Yine de 1056'daki gereksiz satır kilidi 1057 ile kaldırıldı.
- Ida Supabase'i yeniden başlattı (17:56). Sonrasında bağlantı ~0,6 sn, `select 1` 70–200 ms.

## Test
- Canlı, test hesabı (ArayuzDenetim913):
  - Grup maçı, bota karşı (`8696c498`): 20 soru, takılma yok, `bitti`.
  - Serbest Hazine (`30868a03`): `bitti`. Aracın "DEVAM ×2 / ücretsiz 50:50" kırmızıları eski beklentiler; o kural şu an kapalı (Kasa raporundaki gibi).
  - Klasik: 20/20 cevap sunucuya ulaştı. Ana sayfada 390 px'te 3 px çakışma kırmızısı önceden bilinen, bu işle ilgisiz bir bulgu.
  - Test hesabı `hesabimi_sil` ile silindi ("tam"; ArayuzDenetim profili 0).
- Prova (BEGIN…ROLLBACK): 1056 ve 1057 hatasız, ACL'ler korundu, cron komutu değişti. pg_cron altında CALL + maç başına COMMIT çalışıyor.
- `npm run build` temiz · `npm test` TÜMÜ GEÇTİ · `arayuz-denetim` **TEMİZ**.
- Yük testi canlıda yapılmadı. Yerelde Supabase yok (Docker kurulu değil), bu yüzden "birkaç bot grup maçı + Kasa" senaryosu yerine canlıda tek seferlik iki bağlantılı kilit testi yapıldı: 4 çağrı, hepsi geri alındı.

## Açık kalanlar (karar gerekir)
- Nano sunucunun disk G/Ç bütçesi dar. 2–5 sn'lik `hizli_tik` ve `cron.job_run_details` kayıtları sürekli küçük yazı üretiyor. Kalıcı çözüm: compute yükseltme ya da cron kayıt budamasını sıklaştırma.
- `rpc_sayac` (hız sınırı, 1053/1054) her çağrıda yazıyor; kesintide aynı satırda 8 bekleyen görüldü. Ayrı iş olarak ele alınmalı.
- Grup maçında `group_matches` okuması ~51/dk (gerçek zamanlı kanal + her ilerletmeden sonra yeniden okuma). Çağrı ucuz (ort. ~23 ms); akıcılık için dokunulmadı.

**Migration:** 1056 (`20260612001056_grup_mac_kilit.sql`) + 1057 (`20260612001057_grup_mac_tik_kilitsiz_bakis.sql`) — ikisi de canlıda uygulandı.

RAPOR HAZIR — Ida'ya iletilecek.

---

# Maç düzeltmeleri — Ida'nın 10 Eki ~21:15–21:35 canlı testi + disk bütçesi (migration 1058)

## 1. Hazine Tur 7 takılması (maç 47d9d421) — kalıcı sunucu hatası DEĞİL; test sekmesi arka plandaydı
**Kanıt (edge logu + maç satırı):**
- Maç boyunca (18:21–18:28 UTC) **hiç `kalp_at` isteği yok**. KasaPage nabzı yalnız sekme görünürken atar → sekme baştan sona gizliydi (Claude in Chrome arka plan sekmesi). 18:15 Düello'sunda da `kalp_at` yok.
- `kasa_durum` yalnız `kasa_tik` cron'unun (30 sn) sinyalinden hemen sonra çağrılmış (18:22:02, :32, 18:23:02 …); turlar da tam 30,1 sn arayla açılmış (`kasa_hamleler.created_at` 18:22:01, :31, 18:23:01 …). Gizli sekmede yedek yoklama ve faz bitişi zamanlayıcısı çalışmaz, yalnız Realtime sinyali okuma yapar.
- Tur 7 18:25:02'de açıldı; o turda `kasa_cevap` isteği hiç gitmedi (sayaç 0'dayken dokunuş kabul edilmez). 18:25:03 → 18:25:34 arası 30 sn istek yok → nabız 25 sn eşiğini geçti → 18:25:32 tikinde `kasa_kopuk_kim` Ida'yı kopuk saydı, faz dondu (`bot_cevap_at` 2,4 sn kaydırılmış = kopukluk kayması). Sinyalle gelen okuma nabzı yazıp kopukluğu kaldırıyor, 30 sn sonraki tik yine kopuk buluyordu ("süre 0'da, bant gitmiyor" döngüsü). 18:27:02'den sonra okuma gelmedi; 45 sn sonra 18:28:03'te `sonuc_neden = kopuk` ile bitti.
- 1057 / kilit testiyle ilgisi yok: o dakikalardaki bütün `kasa_durum`'lar 200 ve 78–178 ms; Postgres logunda kilit/zaman aşımı satırı yok.

**İstemcinin toparlanması:** sekme görünür olunca hemen `kasa_durum` + `kalp_at` gider (taklit testi K3: 7 ms) → nabız yazılır, kopukluk kalkar, faz kalan süreyle sürer (45 sn dolmadıysa). Gizli sekmede nabız atılmaması bilinçli (oyuncu uygulamadan çıktıysa kopuk sayılmalı). Arka plan sekmesinde yapılan canlı testler bu yüzden her zaman takılır.

## 2. Yanlış "Bağlantı yeniden kuruluyor" bandı
**Kök neden:** bant, faz bitişinden 4 sn sonra yeni faz gelmemesini de bağlantı sorunu sayıyordu. Sunucu cevapsız oyuncu için **5 sn geç varış payı** (991) bekler ve fazı ancak bir okuma ilerletir → neredeyse her tur geçişinde bant çıkıyordu. Bant akış içindeydi: çıkınca şıkları/kartları **48 px** aşağı itiyordu (dokunuş yanlış yere düşüyor, "kilitli" hissi). Boş soru metni yeniden üretilemedi (taklit testinde bant varken metin hep yerinde; gizli sekmede giriş animasyonu durdurulduğu için ekran görüntüsünde boş görünmüş olabilir).

**Düzeltme (Hazine + Düello):** bant yalnız okuma hata veriyor **ve** son başarılı yanıttan beri ≥ 10 sn geçtiyse. Bant ve kopukluk bandı kaydırmasız üst katman (`.m2-bant--katman`, dokunuşu geçirir). Şıklar bantla kilitlenmez.

## 3. "Rakip ara" ilk tıklama
- **Düello:** düğme önce çizilip Skill seti yüklenince **~1,2 sn'de 223 px aşağı kayıyordu** (327 → 550, ölçüldü) → ilk dokunuş boşa. Düzeltme: düğme kural metni + Skill seti yerleşince çizilir (`SkillSeti onHazir`, 2,5 sn yedek). Canlıda ilk tıkta arama başladı.
- **Hazine:** kayma yok (491 px sabit); üretim derlemesinde 0/150/600/2500 ms'de tek tık hep aramayı başlattı. Logda ilk tıklamaya ait istek yok — en olası açıklama arka plan sekmesi (eski ekran karesi). Kod değişikliği gerekmedi.

## 4. Düello kategori seçimi
- (a) **1058:** her adımın kendi süresi (10 sn + 0,9 sn duyuru). Süre dolumu adım adım: 1. adım dolarsa yalnız rakibe giden kart otomatik, 2. adım yine 10 sn ile açılır.
- (b) Kayma üç kaynaktan: bağlantı bandı, kartların ÜSTÜNDE çıkan "Süre doldu · otomatik seçiliyor" notu, EN'de 1. adım başlığı 2 satır / 2. adım 1 satır. Düzeltme: bant katman, not kartların altında, iki başlık aynı hücrede üst üste. Önce 9–26 px kayma → sonra 0.
- (c) Ida'nın 18:15 maçında 9 saldırı turunun 7'sinde gerçekten bir adım otomatik seçilmişti (çoğu turda tek `kategori_sec` gitti: 2. dokunuş kayan karta düştü ya da paylaşılan süre bitti). Artık hangi adımın otomatik olduğu saklanıyor (`v4_oto_gonder` / `v4_oto_sec`), "otomatik seçildi" yalnız o kategoride yazıyor.

## 5. Cevap sonrası
Sayaç cevap anında durur (`useDonukSayac`), joker şeridi "Cevabın gitti · rakip bekleniyor" (rakip de cevapladıysa "Cevabın gitti"). Eskiden sayaç akıp "Süren doldu — sonuç bekleniyor" yazıyordu (taklit: 10 → 7).

## 6. Maç sonu boş sayfa
Kök: `DuelloPage` maç bitince özet (`mac_sonu_ozet`) gelene dek boş `msk-bekle` döndürüyordu (taklitte 2,3 sn). Artık arena ekranda kalır; özet hata verirse sahne özetsiz kurulur.

## 7. Aynı kalıplar öteki modlarda
| Kalıp | Hazine | Klasik | Grup | Turnuva |
|---|---|---|---|---|
| Yanlış bant (2) | düzeltildi | bant yok | bant yok | bant yok |
| İlk tık (3) | kayma yok | — | — | — |
| Cevap sonrası sayaç (5) | akıyordu → durdu | QuestionCard sayacı akıyordu → durdu | aynı kart → durdu | aynı kart → durdu |
| Maç sonu boşluk (6) | 2,3 sn boş → final/maç sahnesi kalır | perde vardı; **özet hata verirse sonsuza dek boş** ve rakip terk edince perde yoktu → düzeltildi | özet hatasında sonsuza dek boş → düzeltildi | özet gelene dek boş → "Turnuva bitti / ŞAMPİYON!" perdesi |

## 8. Disk bütçesi
- Budama zaten vardı (job 124: saatte bir, 6 sa'ten eski `job_run_details`). 1058 onu `kayit_budama()`'ya çevirdi: + takılı 'starting' satırları (1 gün), süresi geçmiş `rpc_sayac` satırları (2 gün; ilk koşuda 237'nin 193'ü), `net._http_response` (1 gün).
- Ölçüm (`pg_stat_statements`, yeniden başlatmadan beri): 17:56–19:26 UTC sorgu WAL'ı 7,11 MB (78 KB/dk); bunun **1,38 MB'ı (%19,5) `cron.job_run_details` yazımları** (her koşuda 1 insert + 4 update). Budama bu yazımı azaltmaz, tabloyu küçük tutar: `job_run_details` 1,45–1,50 MB / ~3.200–3.400 satırda sabit (önce ve sonra). 1058 sonrası 19:26–19:56: cron kayıt WAL'ı 5,7 KB/dk (önce 15,2 KB/dk — fark büyük ölçüde 1036'nın boşta 30 sn tikinden; bu pencerede iki canlı test maçı ve migration DDL'i de vardı, toplam 142 KB/dk). Ham LSN örneği (258 KB/sn) `archive_timeout` segment kapanmasına denk geldi, güvenilir değil.
- Asıl büyük kalem için seçenek (yapılmadı): `cron.log_run = off` — Supabase'de süper kullanıcı ve yeniden başlatma ister.

## 9. Hız sınırı sayacı: `rpc_sayac` → UNLOGGED (neden)
- Seçenekler: (a) UNLOGGED, (b) seyrek güncelleme (satır kilitliyse sayma / N'de bir yaz), (c) bellekte sayaç.
- **(a) seçildi:** davranış birebir aynı (aynı fonksiyon, pencere, hata), yetkiler/RLS aynı (provada ACL önce/sonra eşit). Sayaç yazımı WAL üretmez; yalnız sayaç yazan RPC'ler (`duello_durum`, `kasa_durum` yoklamaları) commit'te disk senkronu beklemez → Nano'nun G/Ç bütçesi korunur, satır kilidi daha kısa tutulur. Bedeli: çökme/yeniden başlatmada sayaçlar sıfırlanır → en çok bir pencere boyu ek hak (24 saatlik davet tavanı dahil); kabul edilebilir.
- (b) reddedildi: kilitliyken saymamak paralel isteklerle sınırı delmeye açık, seyrek yazmak sınırı gevşetir. (c) Postgres'te bağlantılar arası paylaşılan bellek yok.
- Not: "aynı satırda 8 bekleyen" kilit, sayacın çağıran RPC bitene kadar kilitli kalmasından (ör. `kasa_durum` maç kilidini 2 sn beklerken). UNLOGGED süreyi kısaltır ama kalıbı kaldırmaz.

## Migration
**1058** `20260612001058_mac_duzeltme_kart_sayac_budama.sql` — canlıda (19:28 UTC). Prova (BEGIN…ROLLBACK) → canlı. Geri alma `docs/mac-duzeltme-1058-geri-al.sql` (begin/commit yok, provayla çalıştırılmadı). Prova aracı `araclar/mac-duzeltme-1058-prova.mjs`: **16/16** (uygulamadan önce ve sonra).

## Test
- `npm run build` temiz · `npm test` TÜMÜ GEÇTİ · `arayuz-denetim` **TEMİZ**.
- Taklit (`araclar/mac-duzeltme-ekran.mjs`, aynı senaryolar): **eski kod 9 kırmızı → yeni kod 21/21**: tur geçişinde bant 8. sn'de → yok; bant 48 px kaydırma → 0; maç sonu Hazine/Düello 2,3 sn boş → 0; cevap sonrası sayaç 10→7 → sabit; kart 2. adımda 9–26 px → 0; gerçek 16 sn kopmada bant 12,7 sn'de çıkıp yanıtla kalkıyor. Yakalanan hata: kart başlığında `aria-hidden` dize oluyordu (iki yazı üst üste) → düzeltildi, araca kalıcı kontrol eklendi. Görüntüler `tasarim/mac-duzeltme-10eki/once-*` / `sonra-*`.
- **Canlı, test hesabı (ArayuzDenetim903), görünür sekme:**
  - Serbest Hazine, bota karşı (`37c6595a`): 19 tur, `bitti/hedef` 86-0. **Bant 0**, sayaç 0'da takılma 0, boş ekran 0, faz geri dönüşü 0, karar düğmesi kullanılabilir 6,7–6,9 sn. Aracın 4 kırmızısı eski beklentiler (DEVAM'da "ÜCRETSİZ 50:50/×2", `devam_odul`, "Yeni Kasa maçı" → artık "Yeni maç").
  - Serbest Düello, bota karşı (`dc42ef0b`): ilk tıkta arama başladı, 28 faz geçişi, **bant 0**, 0'da bekleme 0, cevaptan sonra sayaç 10/10 durdu ("Cevabın gitti · rakip bekleniyor"), kart 1→2 adım 8/8 yerinde, maç sonu boşluk 0 ms, `bitti`. Test hesabında 5 Klasik maç olmadığı için `duello_acilis_mac_esigi` yalnız arama süresince (~15 sn) 0 yapıldı, maç kurulunca 5'e geri alındı (doğrulandı).
  - Test hesabı `hesabimi_sil` → "tam" (profil 0).
- 1058 sonrası (19:29–19:56 UTC): `hizli_tik` 117 koşu, ort. 55 ms, p95 136 ms, maks. 947 ms, 0 hata · `dakika_tik` 28 koşu, ort. 235 ms, p95 515 ms, maks. 1.507 ms (tek koşu), 0 hata. `hizli_tik` boşta 30 sn'de bir koşuyor — 1036 tasarımı (Kasa'da da 30 sn), elle değişiklik değil.

## Dikkat
- Bu iş sürerken Codex aynı klasörde commit/push yaptı (`b467fe95`, soru üretimi); 1058 commit'im onun push'uyla birlikte gitti. Migration çakışması yok.

RAPOR HAZIR — Ida'ya iletilecek.
