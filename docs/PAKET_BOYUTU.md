# Paket boyutu ölçümü (2 Eki 2026) — yalnız rapor, kod değişmedi

Kaynak: `npm run build` çıktısı + `dist/index.html` içindeki statik import kapanışı (betik ile hesaplandı) + `src/main.jsx`, `src/BildimApp.jsx`, `vite.config.js`, `oyun/lib/dil.js` okuması.

## En büyük parçalar (min / gzip)
| Parça | Boyut | gzip | Not |
|---|---|---|---|
| `three.module` | 633,6 kB | 161,8 kB | **tembel** — ilk açılışta inmez |
| `oyun` (ana JS) | 531,3 kB | 171,2 kB | giriş parçası, ilk açılışta iner |
| `oyun` (ana CSS) | 566,6 kB | 103,3 kB | tek CSS, ilk açılışta iner |
| `dil` (İngilizce sözlükler) | 266,8 kB | 93,4 kB | giriş kapanışında, ilk açılışta iner |
| `supabase` | 215,6 kB | 54,6 kB | giriş kapanışında |
| `react` | 192,7 kB | 60,4 kB | giriş kapanışında |
| `lottie_light` | 169,2 kB | 48,3 kB | tembel |
| `dunya` (harita) | 117,9 kB | 45,6 kB | tembel (three'ye bağlı) |

## Bulgular
- **three ana pakette değil, tembel.** `index.html` kapanışında (oyun, dil, react, router, supabase, zaman, preload-helper) three yok; three'yi 20 parça statik içe aktarıyor (harita, gardrop/avatar, vitrin vb.) ve hepsi dinamik import ile yüklenir. Harita/avatar ekranına girmeyen oyuncu 633 kB'ı hiç indirmez.
- **İlk açılışta inen toplam:** JS 1.251 kB → **396,4 kB gzip**; CSS 566,6 kB → **103,3 kB gzip**; toplam ≈ **500 kB gzip** (yazı tipi CSS'i ve açılan ilk sayfanın tembel parçası hariç).
- Ana CSS'in kaynağı tek tek `src/main.jsx` ile eager içe aktarılan dosyalar: `tema.css` 159 kB + `yeni.css` 123 kB (ham, toplamın ~%65'i), `bilesenler.css` 51 kB, `src/styles.css` 40 kB.

## En büyük 3 küçültme fırsatı (tahmin; uygulanmadı)
1. **İngilizce sözlükleri dil=en olunca tembel yükle** (`oyun/lib/dil.js` ~45 `ceviri/*.js` içe aktarımı → `dil` parçası, −93 kB gzip ≈ ilk açılışın %19'u). Türkçe oyuncu bu sözlüğe hiç ihtiyaç duymaz. Dikkat: `tt()` modül yüklenirken senkron çağrılıyor (ör. `kategoriler.js`); sözlük dil değişince yüklenip arayüz yeniden çizilmeli.
2. **Ana CSS'i böl** (`tema.css` + `yeni.css` 283 kB ham): sayfaya özgü blokları ilgili tembel sayfanın kendi CSS'ine taşı (Vite tembel sayfa CSS'ini ayrı indirir). Kullanılmayan kural oranı ölçülmedi (kapsama testi Playwright gerektirir; kota nedeniyle çalıştırılmadı) — kazanç tahmini 20–40 kB gzip, doğrulanmalı.
3. **`MatchPage` ve `ChallengesPage` statik içe aktarılıyor** (`src/BildimApp.jsx` 36–37; Login/AnaSayfa ile birlikte `oyun` parçasında). Diğer 9 sayfa zaten `tembelYukle`. İkisini de tembel yapmak `oyun` parçasını (171 kB gzip) küçültür; ses/maç kütüphaneleri maça girince iner. Kazanç ölçülmedi. (Not: `BildimApp.jsx` şu an başka bir işte değişmiş durumda; çakışmasın diye dokunulmadı.)

Harita dondurulmuş sayılsa da kodu **oyuncu açısından bedelsiz**: tembel olduğu için ilk açılışa maliyeti yok; kaldırmak yalnız `dist` boyutunu (~1,1 MB) ve derleme süresini düşürür, oyuncuya kazandırmaz.
