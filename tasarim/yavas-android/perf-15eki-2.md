# Yavaş telefon performans paketi 2 — 15 Eki 2026

Koşul: CPU 6x yavaş · yavaş 4G (150 ms, 1,6 Mbit/s) · 390×844 @2x · Android UA. "Önce" = oturum başı HEAD (00709b86)
üretim derlemesi, "sonra" = bu paketin derlemesi; makinede paralel pencereler olabileceği için önce/sonra **dönüşümlü**
koşuldu. Ham ölçümler: `ham-15eki-2/` (ana sayfa `ab-*`, Klasik `k-*`, canlı Hazine `h-son-*`, Hazine A/B özeti `hazine-ab-6+6.txt`).

## 1 · Ana sayfa açılışı (Ida, `yavas-android-olcum --sw --sayfa=ana`, 4 tur dönüşümlü)

| Ölçü | Önce | Sonra |
|---|---|---|
| Kurulu uygulama 2. açılış — içerik görünür | 2344 · 2236 · 1916 · 2009 ms | **947 · 885 · 1307 · 1520 ms** (hedef < 1,5 sn ✓) |
| Kurulu 2. açılış — FCP | 224–260 ms | 232–508 ms (aynı aralık) |
| Kurulu 2. açılış — Supabase istek / sıralı tur | 20 / 3–5 tur | **4 / 1 tur** |
| Soğuk açılış — içerik görünür | 6417 · 6767 · 5647 · 6251 ms | 6459 · **4420 · 4631 · 4554** ms (ortanca 6,3 → 4,6 sn) |
| Soğuk açılış — FCP | ~2,0 sn | ~2,0 sn (JS/CSS inişi; değişmedi) |
| Ana sayfa sığdırma (`useSigdir`) CPU profili | 838 ms öz süre | 318 ms (kalan = tarayıcının zaten yaptığı ilk yerleşimler) |

Kök neden: (a) `AnaSayfaA › useSigdir` her DOM değişiminde 0'dan 8'e kadar her kademeyi zorunlu yerleşimle ölçüyordu ve
bu `useLayoutEffect` içinde ilk commit'te çalıştığı için ikinci istek turunu da ~1 sn geciktiriyordu; (b) ilk özetten sonra
3 sıralı istek turu (ayarlar + 5 devam eden maç okuması → lig kartları → lobi). Ölçülen başlangıç modül işi (ses, izleme,
sözlük) < 50 ms — ertelemeye değer bir şey bulunmadı.

## 2 · Ortak Hazine sonuç fazı (`hazine-akis-olcum`, taklit sunucu, 6+6 maç dönüşümlü)

| Ölçü | Önce | Sonra |
|---|---|---|
| Sonuç fazı en uzun kare (ortanca / en kötü) | 100 / 167 ms | **83** / 234 ms (234 tek seferlik; aynı an 2 tekrarda 83–84 ms) |
| ≥ 100 ms kare içeren sonuç anı | 5 / 33 | **1 / 33** |
| Sonuç fazı ort kare/sn · en kötü dilim (ortanca) | 54 · 32 | 55 · 36 |
| Faz taşması · geç çalma · eşzamanlı ses · kesilen animasyon | 0 · 0 · 0 · 0 | 0 · 0 · 0 · 0 |
| 3-2-1 rakamları | ~1000 ms | ~1000 ms |

Kök neden (hafif iz + stil geçersizleştirme takibi): sonuç anında maç kökü `DIV.m2-mac`'in satır içi stiline
`--ks-sonuc-olcek` yazılıyordu → kalıtılan değişken maçın **bütün 415 öğesini** yeniden stil hesabına sokuyordu
(CPU 6x 42–52 ms; an bitince kaldırılırken bir kez daha). Değişken yalnız okuyan iki küçük alt ağaçta (mini hazine
kadranı, anahtar avatarı). Faz sınıfı (`ks-mac--sonuc`) suçlu değil: ona bağlı seçici yok. Sahne her fazda yeniden
kuruluyor (114–314 öğe) ama bu, soru kartının giriş animasyonunun bir parçası — görünüm değişmesin diye dokunulmadı.

Canlıdaki 434 ms kare: dünkü canlı ölçümde **maç sayfası açılış görevi** (352 ms, maç adresinden 0,6 sn sonra), sonuç
fazı değil. Bugün canlı ×2: aynı görev 245–253 ms; sonuç fazında 150 ms üstü kare yok.

## 3 · Klasik maç sayfası (canlı, Ida, bota karşı; `--mac --mod=klasik --erken`)

| Ölçü | Önce | Sonra |
|---|---|---|
| Maç adresi → ilk kare ("Hazırım") | 639 · 797 · 716 · 815 ms | **378 · 292 ms** (~%56 kısa; hedef ≥ %40 ✓) |
| Bekleme ("Hazır mısın?" + "Rakip bekleniyor…") ort kare/sn | 52–54 | 51–54 (hedef ≥ 50 ✓) |
| 3-2-1 penceresi ort / en uzun kare | 52–55 / 36–117 ms | 54–55 / 54–57 ms |
| Maç paketi indiği an (maç adresine göre) | −7,3 / −12,2 sn | −13,3 / −16,9 sn |

Kök neden: açılışın kritik yolu = sayfa kurulumu (~180 ms) + maç satırı isteği (400–640 ms) + çizim. Rakip bulununca
2,85 sn'lik VS anı oynuyor; satır artık o sırada isteniyor (`lib/macOnYukleme.js`). Maç sayfası paketi 4 sn yerine
1,5 sn'de boşta + Oyna / arama başlarken iner (bugünkü akışta paket zaten önceden inmişti; dünkü 2,83 sn'nin bir kısmı
eşleşme anında inen paketti). Dünkü bekleme 27 kare/sn'si bugün yeniden üretilemedi; --profil koşusundaki 684 ms'lik tek kare
izin başlatılmasının kendisinden (iz başlamadan önceki an, ana iş parçacığı boşta). Grup/Turnuva aynı `GeriSayim`
bileşenini kullanır; `mac-duzeltme-ekran` G1/G2 bekleme ortanca 57 kare/sn.

## Testler
`npm run build` temiz (eski iPhone denetimi TEMİZ) · ses-rakip-soru hepsi ✓ · ses-zamanlama 7/7 · ses-hazine-grup-taklit
6/6 · senkron-testi --taklit Turnuva geçti · mac-duzeltme-ekran (üretim derlemesi) 45/45 · hazine-akis-olcum 6 maç:
taşma 0 · geç 0 · eşzamanlı 0 · kesik 0 · migration 1109 provası (ROLLBACK) hepsi ✓.

Canlı (Ida, bota karşı, CPU 6x + yavaş 4G, tarayıcı sessiz):

| Maç | çalınan ses | ses çakışması (< 100 ms) | konsol hatası | en uzun kare | an |
|---|---|---|---|---|---|
| Klasik #1 | 44 | 0 | 0 | 194 ms | maç sonu |
| Klasik #2 | 45 | 0 | 0 | 212 ms | maç sonu |
| Hazine #1 | 159 | 0 | 0 | 302 ms | maç sayfası açılışı (sonuç fazı < 150) |
| Hazine #2 | 134 | 0 | 0 | 300 ms | maç sayfası açılışı (sonuç fazı < 150; soru anında bir kez 178) |
