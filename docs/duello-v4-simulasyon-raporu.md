# Düello v4 — simülasyon raporu (Aşama 2, 9 Eki 2026)

Araç: `node araclar/duello-v4-simulasyon.mjs --n 120 [--ayar duello4_max_tur=20]`
Tek işlem + ROLLBACK (canlıya iz yok); sahte oyuncular; ödül/sayaç/cron yan etkileri işlem içinde etkisiz;
20 maçta bir kayıt noktasına dönülür (tek işlemde satır sürümü birikip yavaşlatmasın — ilk koşu bu yüzden 40 dk bekçiye takıldı).
Süre: her fazın gerçek formülüyle tahmin (gösterim payı 2 sn, bot gecikmesi, insan 3–12 sn, cevapsız 22 sn, kart 7+3 sn, sonuç 3 sn).
Seviyeler: eşit 62/62 · biraz 70/60 · çok 82/50. İnsan taklidi: kategori ±12, %4 cevapsız, kartta %8 süre dolumu, %50 akıllı.

## Mevcut ayar (15 tur) — 1080 maç
| grup | n | tur ort | süre ort | 3/3 | Son Düello | güçlü kazandı | 5 nötr |
|---|---|---|---|---|---|---|---|
| TOPLAM | 1080 | 9,0 | 3,5 dk | %71,3 | **%28,7** | %67,1 | 77 |
| bot-bot eşit / biraz / çok | 120×3 | 9,7 / 9,5 / 6,6 | 3,3 / 3,3 / 2,4 | | %30,8 / %37,5 / %16,7 | %37,5 / %68,3 / %96,7 | 11 / 11 / 13 |
| insan-insan eşit / biraz / çok | 120×3 | 9,7 / 9,8 / 8,1 | 4,2 / 4,2 / 3,6 | | %35,0 / %30,8 / %20,8 | %44,2 / %63,3 / %88,3 | 10 / 6 / 8 |
| insan-bot eşit / biraz / çok | 120×3 | 10,0 / 9,8 / 7,8 | 3,9 / 3,9 / 3,1 | | %36,7 / %35,8 / %14,2 | %44,2 / %64,2 / %97,5 | 6 / 8 / 4 |

- Hata 0 · takılan 0 · bitmeyen 0 · boş alanlı hamle 0 · maks 68 adım / 15 tur / 26 soru. Süre medyan 3,3 dk, %90 5,9 dk, maks 8,4 dk.
- Havuz yeniden açılması: 980 (maç başına ~0,9 — 10 kategoride bir kontrol döneminin 4. turunda doğal olarak).
- El değişimi maç başına ort 1,5.
- Bot kartı: rakibin en zayıfını gönderdi %65,2 (3128/4799), kendine en güçlüsünü aldı %72,1 (3459/4799) — ayar %75 en iyi; eşit oranlarda
  ölçüm alfabetik ilk kartı "en zayıf" saydığı için biraz düşük görünür. Örnek: sanat(rakip %50) cografya(%60) sinema(%53) teknoloji(%70)
  → gönderdi **sanat** (rakibin en zayıfı) · aldı cografya (botun 0,64 ile en güçlüsü).
- **Sapma:** Son Düello %28,7 (beklenen %7–15). ~%7,1'i art arda 5 nötr kuralından (p≈0,62'de nötrde "ikisi aynı" ≈ %53, 0,53⁵ ≈ %4–7),
  kalanı 15 tur dolması (eşit seviyede seri 3/3 tutturmak uzun sürüyor; tur başına başarılı saldırı ≈ %24, el değişimi ≈ %24, değişmez ≈ %52).

## Alternatif (yalnız işlem içinde denendi, canlıda değişiklik YOK) — 360'ar maç
| duello4_max_tur | Son Düello | 3/3 | süre ort | %90 süre | güçlü kazandı |
|---|---|---|---|---|---|
| 15 (mevcut) | %28,7 | %71,3 | 3,5 dk | 5,9 dk | %67,1 |
| **20** | **%13,6** | %86,4 | 3,5 dk | 6,1 dk | %76,4 |
| 25 | %11,9 | %88,1 | 3,6 dk | 6,9 dk | %71,9 |

20 turda beklenen aralığa giriyor; ortalama süre değişmiyor (çoğu maç zaten 3/3 ile ~9 turda biter). Karar Ida'nın — tek ayar satırı
(`duello4_max_tur`, maça sabitlenir).
