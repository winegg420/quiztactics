# Varlık lisansları

Oyunda kullanılan dış kaynaklı görsel ve seslerin kaynağı, lisansı ve bağlantısı.
Yeni bir dış varlık eklenmeden önce buraya satır eklenir; ticari kullanıma izin
vermeyen kaynak kullanılmaz.

| Varlık | Nerede | Kaynak | Lisans | Bağlantı |
|---|---|---|---|---|
| Skill rozeti sembolleri (50:50 `circle-half`, Ek Süre `hourglass-medium` + `plus-circle`, Soru Değiştir `arrows-clockwise`, Zaman Baskısı `timer` + `flame`, İkinci Şans `heart`, Sigorta `shield`, 2X `seal`) — "fill" ağırlığı, yollar değiştirilmeden | `oyun/components/skillSembolleri.jsx` | Phosphor Icons (core) | MIT — Copyright (c) 2023 Phosphor Icons | https://github.com/phosphor-icons/core · lisans: https://github.com/phosphor-icons/core/blob/main/LICENSE |
| Coin paketi görselleri: coin (U+1FA99), kese (U+1F4B0), sandık (U+1FA8E), mücevher (U+1F48E), taç (U+1F451), parıltı (U+2728) — 3D PNG 512 px → 256 px WebP | `public/dukkan/*.webp`, `oyun/components/CoinPaketGorseli.jsx` | Google Noto Emoji (3D) | Apache License 2.0 (görseller; yazı tipleri OFL 1.1, kullanılmıyor) | https://github.com/googlefonts/noto-emoji/tree/main/3D/png/512 · lisans: https://github.com/googlefonts/noto-emoji/blob/main/LICENSE |
| Rozet madalyonu grup sembolleri: Level `star`, Klasik `trophy`, Düello `sword`, Seri `flame`, Kategori `brain`, Turnuva `crown`, Lig `shield-star`, Özel an `lightning`, Sosyal `users-three` ("fill") · Gizli `question-mark` ("bold") — yollar değiştirilmeden | `oyun/components/rozetSembolleri.jsx` | Phosphor Icons (core) | MIT — Copyright (c) 2023 Phosphor Icons | https://github.com/phosphor-icons/core |
| Çerçeve süsleri: kalkan (U+1F6E1), defne (U+1F33F), yıldız (U+2B50), bronz madalya (U+1F949), kanat (U+1FABD), alev (U+1F525), parlayan yıldız (U+1F31F), kar tanesi (U+2744); 23 Eyl 2026 temalı çerçeveler için: bulut (U+2601), sakura (U+1F338), papatya (U+1F33C), uçuşan yaprak (U+1F343), dalga (U+1F30A), deniz kabuğu (U+1F41A), dönen yıldız (U+1F4AB), ejder başı (U+1F432), şimşek (U+26A1), halkalı gezegen (U+1FA90), kuyruklu yıldız (U+2604) — 3D PNG 512 px → 256 px WebP; ayrıca `public/dukkan/` taç, mücevher ve parıltı yeniden kullanılır. Bazıları CSS süzgeciyle tonlanır (dosya değişmez) | `public/kozmetik/*.webp`, `oyun/tasarim/cerceveler/tanimlar.js` | Google Noto Emoji (3D) | Apache License 2.0 | https://github.com/googlefonts/noto-emoji/tree/main/3D/png/512 · `public/kozmetik/LISANS.txt` |
| Oyun sesleri | `public/ses/` | Kenney | CC0 1.0 | https://kenney.nl · ayrıntı `public/ses/LISANS.txt` |

## Kendi tasarımımız (dış kaynak değil)

- Skill rozetinin gövdesi (degrade, üst parlama, iç gölge, dış gölge, kenar) ve renkleri:
  `oyun/tasarim/ekranlar/skill-rozet.css`, token'lar `--qt-skill-*` (`oyun/tasarim/tokenlar.css`).
- Coin paketi dizilimi (parçaların yerleşimi): `CoinPaketGorseli.jsx`. Yeni çizim yoktur; yalnız
  yukarıdaki Noto görselleri dizilir.

- Çerçeve halkaları (tema halkaları: bulut, sarmaşık, neon, buz faseti, köpük, yıldız tozu, ejder pulu, enerji çizgisi, gezegen bantları, alev, kadife, prizma; eğik yörünge, dönen bulutsu, kor ışıması, level plakası; metal/faset degrade, mücevher taşları, kristal uçlar, dönen ışık halkası,
  kıvılcımlar, parıltı) ve rozet madalyonu gövdesi tamamen CSS'tir: `oyun/tasarim/cerceveler/cerceveler.css`,
  `oyun/tasarim/ekranlar/rozet-madalyon.css`. Lottie kullanılmadı (oynatıcı paketi yok, yeni paket kurulmaz).

## Ses adayları (`/ses-secim`, 23 Eyl 2026)

Oyunda ÇALMAZ; yalnız sahibin ses seçim sayfası ister. 27 efekt anı + 3 müzik anı, 112 dosya,
7,1 MB (`public/ses/adaylar/`). Dosya başına kaynak, yazar, bağlantı ve lisans:
**`public/ses/adaylar/KAYNAKLAR.md`**. Seçilmeyenler Ida'ya sorularak kaldırılacak.

| Grup | Kaynak | Lisans | Bağlantı |
|---|---|---|---|
| 81 efekt adayı (WAV) | Kenney — Interface Sounds, UI Audio, Impact Sounds, Digital Audio, Music Jingles, Casino Audio | CC0 1.0 | https://kenney.nl/assets · paket lisansları `public/ses/LISANS.txt` |
| 19 efekt adayı (mp3, kırpılmış) | Pixabay ses efektleri (yazarlar KAYNAKLAR.md'de) | Pixabay İçerik Lisansı — ticari kullanım serbest, atıf gerekmez, dosyayı tek başına yeniden dağıtmak/satmak yasak | https://pixabay.com/service/license-summary/ |
| 12 müzik önizlemesi (AAC, 30 sn) | Pixabay Music (yazarlar KAYNAKLAR.md'de) | Pixabay İçerik Lisansı (aynı) | https://pixabay.com/service/license-summary/ |

Pixabay'de yapay zekâ üretimi ve YouTube Content ID kayıtlı parçalar bilerek elendi.

## Notlar

- Apache 2.0: lisans metni ve bu atıf korunur; görseller yalnız küçültüldü (değişiklik bildirimi:
  512 → 256 px, PNG → WebP). `public/dukkan/LISANS.txt` aynı bilgiyi taşır.
- MIT (Phosphor): telif satırı `skillSembolleri.jsx` başında ve burada durur.
