# Ses kesilmesi çizelge ölçümü — tum-modlar

| mod | ses.js | CPU | anlamlı | ANİ kesilen | yumuşak biten | çalarken yeni ekran (>150 ms) | pencereye kısaltılan | çalmayan |
|---|---|---|---|---|---|---|---|---|
| klasik | eski | 1x | 8 | 0 | 0 | 0 | 0 | 0 |
| saf_bilgi | eski | 1x | 6 | 0 | 0 | 0 | 0 | 0 |
| duello | eski | 1x | 10 | 0 | 0 | 1 | 0 | 0 |
| grup | eski | 1x | 6 | 0 | 0 | 0 | 0 | 0 |
| turnuva | eski | 1x | 7 | 0 | 0 | 0 | 0 | 0 |
| hazine | eski | 1x | 9 | 0 | 0 | 2 | 0 | 0 |
| klasik | eski | 6x | 7 | 0 | 0 | 0 | 0 | 0 |
| saf_bilgi | eski | 6x | 5 | 0 | 0 | 0 | 0 | 0 |
| duello | eski | 6x | 10 | 0 | 0 | 0 | 0 | 0 |
| grup | eski | 6x | 5 | 0 | 0 | 0 | 0 | 0 |
| turnuva | eski | 6x | 6 | 0 | 0 | 0 | 0 | 0 |
| hazine | eski | 6x | 9 | 0 | 0 | 2 | 0 | 0 |
| klasik | yeni | 1x | 8 | 0 | 0 | 0 | 1 | 0 |
| saf_bilgi | yeni | 1x | 6 | 0 | 0 | 0 | 0 | 0 |
| duello | yeni | 1x | 10 | 0 | 0 | 0 | 1 | 0 |
| grup | yeni | 1x | 6 | 0 | 0 | 0 | 0 | 0 |
| turnuva | yeni | 1x | 7 | 0 | 0 | 0 | 0 | 0 |
| hazine | yeni | 1x | 9 | 0 | 0 | 0 | 2 | 0 |
| klasik | yeni | 6x | 7 | 0 | 0 | 0 | 2 | 0 |
| saf_bilgi | yeni | 6x | 5 | 0 | 0 | 0 | 1 | 0 |
| duello | yeni | 6x | 10 | 0 | 0 | 1 | 1 | 0 |
| grup | yeni | 6x | 5 | 0 | 0 | 0 | 1 | 0 |
| turnuva | yeni | 6x | 6 | 0 | 0 | 0 | 1 | 0 |
| hazine | yeni | 6x | 9 | 0 | 0 | 2 | 2 | 0 |

## Ayrıntı

| mod | ses.js | CPU | rol | plan/dosya ms | çaldı ms | kesildi | yeni ekran | çakışan |
|---|---|---|---|---|---|---|---|---|
| duello | eski | 1x | skill_zaman_baskisi | 1200/1200 | 1196 | — | faz sonuc · kalan 397 | yanlis |
| hazine | eski | 1x | joker | 1408/1408 | 1408 | — | faz sonuc · kalan 705 | dogru |
| hazine | eski | 1x | rozet | 1800/1800 | 1792 | — | yeni soru · kalan 312 | coin, soru_geldi |
| hazine | eski | 6x | rozet | 1800/1800 | 1796 | — | yeni soru · kalan 1590 | soru_geldi |
| hazine | eski | 6x | coin | 608/608 | 605 | — | yeni soru · kalan 399 | soru_geldi |
| duello | yeni | 6x | skill_zaman_baskisi | 920/1200 | 920 | — | faz sonuc · kalan 258 | yanlis |
| hazine | yeni | 6x | joker | 720/1408 | 720 | — | faz sonuc · kalan 174 | dogru |
| hazine | yeni | 6x | rozet | 1800/1800 | 779 | — | yeni soru · kalan 1192 | soru_geldi |
