# Yavaş telefon performans paketi — 15 Eki 2026

Koşul: CPU 6x yavaş · yavaş 4G (150 ms, 1,6 Mbit/s) · 390×844 @2x · Android UA. "Kare" = ana iş parçacığı rAF karesi
(transform/opacity animasyonları birleştiricide döner; ana iş parçacığı takılınca da akabilir — ölçü üst sınırdır).
Makinede paralel oturumlar (başka Claude pencereleri, Chrome) olduğu için önce/sonra **maç maç dönüşümlü** koşuldu
(`.tmp/ab.sh` deseni: her turda önce A sonra B). Ham özetler: `hazine-ab-15eki.txt`, `hazine-akis-sonra-15eki.json`,
`tarama-15eki.json`, `canli-mac-15eki.json`.

## Önce / sonra

| Madde | Ölçü | Önce | Sonra |
|---|---|---|---|
| 1 Hazine maç başı tek kare | taklitteki ~400 ms kare | yeni tarayıcıda ilk GPU taraması ~200 ms + `new AudioContext()` ~180 ms (taklide özgü) | canlı akışta yok (canlı giriş en uzun kare 19–72 ms); taklit düzeltildi → giriş en uzun kare ortanca 117 ms, ≥100 ms kare 23 → 12 |
| 2 Hazine sonuç anı (6+6 maç, dönüşümlü) | en uzun kare ortanca / en kötü | 334 / 351 ms | 134 / 167 ms |
| | en kötü 500 ms dilim (ortanca) | 10 kare/sn | 18 kare/sn |
| | ortalama kare/sn | 47 | 47 (hedef ≥ 40 ✓) |
| | sonuç commit'i (iz, tek görev) | 207 ms | 92 ms |
| 3 Klasik/Düello 3-2-1 ışını | piksel farkı (390@2x / 1440) | — | 0,11 / 0,12 (255 üzerinden) |
| | katman | 180vmax canlı conic + mask (2 büyük doku + maske geçişi) | 126vmax tek görsel, maskesiz (piksel alanı ~%51) |
| | G2 3-2-1 penceresi (3+3, GPU ısınmış) | ort 48–50 · en kötü dilim 8–17 | ort 50–52 · en kötü dilim 18–22 |
| | masaüstü GPU mikro ölçüm | 60 kare/sn | 60 kare/sn (fark ölçülemedi; kazanç telefon GPU'sunda) |
| 4 Hazine "2" uzaması (canlı süreler, giriş 6+8 maç) | en uzun rakam | 1352 ms ("1" 643 ms) | 1113 ms |
| 5 Ana sayfa (Ida, SW açık) | kurulu 2. açılış FCP / içerik | 0,28–0,62 / 2,8–3,2 sn | aynı aralık (gürültü ±0,3 sn) |
| | Hazine devam eden maç isteği | ayar → ikinci tur | ayarla aynı tur |
| 6 DB zaman aşımı (7 gün) | istemci_hata | 15 (hepsi 15 Eki 03:03–05:52 UTC) | migration gerekmedi |
| 7 Ekran taraması (sıcak) | en uzun görev | Dükkân 739 ms (tekrarda yok) | Dükkân ~170 ms ilk çizim (1.850 öğe) |

## Hazine akış testi (sonra, 6 maç)
faz taşması 0 · geç çalma 0 · eşzamanlı ses 0 · kesilen animasyon 0 · 3-2-1 ~1000 ms · sayaç her soruda 15.

## Canlı (Ida, bota karşı, yerel üretim derlemesi + canlı Supabase)
| Mod | 3-2-1 ort / en uzun kare | rakamlar | ses çakışması | konsol hatası |
|---|---|---|---|---|
| Klasik | 50 / 150 ms | 1000 · 1130 · 900 | 0 | 0 |
| Düello | 58 / 117 ms | 992 · 1005 · 1114 | 0 | 0 |
| Hazine | 50 / 434 ms | 999 · 968 · 1150 | 0 | 0 |
