# Varlık lisansları

Oyunda kullanılan dış kaynaklı görsel ve seslerin kaynağı, lisansı ve bağlantısı.
Yeni bir dış varlık eklenmeden önce buraya satır eklenir; ticari kullanıma izin
vermeyen kaynak kullanılmaz.

| Varlık | Nerede | Kaynak | Lisans | Bağlantı |
|---|---|---|---|---|
| Skill rozeti sembolleri (50:50 `circle-half`, Ek Süre `hourglass-medium` + `plus-circle`, Soru Değiştir `arrows-clockwise`, Zaman Baskısı `timer` + `flame`, İkinci Şans `heart`, Sigorta `shield`, 2X `seal`) — "fill" ağırlığı, yollar değiştirilmeden | `oyun/components/skillSembolleri.jsx` | Phosphor Icons (core) | MIT — Copyright (c) 2023 Phosphor Icons | https://github.com/phosphor-icons/core · lisans: https://github.com/phosphor-icons/core/blob/main/LICENSE |
| Coin paketi görselleri: coin (U+1FA99), kese (U+1F4B0), sandık (U+1FA8E), mücevher (U+1F48E), taç (U+1F451), parıltı (U+2728) — 3D PNG 512 px → 256 px WebP | `public/dukkan/*.webp`, `oyun/components/CoinPaketGorseli.jsx` | Google Noto Emoji (3D) | Apache License 2.0 (görseller; yazı tipleri OFL 1.1, kullanılmıyor) | https://github.com/googlefonts/noto-emoji/tree/main/3D/png/512 · lisans: https://github.com/googlefonts/noto-emoji/blob/main/LICENSE |
| Oyun sesleri | `public/ses/` | Kenney | CC0 1.0 | https://kenney.nl · ayrıntı `public/ses/LISANS.txt` |

## Kendi tasarımımız (dış kaynak değil)

- Skill rozetinin gövdesi (degrade, üst parlama, iç gölge, dış gölge, kenar) ve renkleri:
  `oyun/tasarim/ekranlar/skill-rozet.css`, token'lar `--qt-skill-*` (`oyun/tasarim/tokenlar.css`).
- Coin paketi dizilimi (parçaların yerleşimi): `CoinPaketGorseli.jsx`. Yeni çizim yoktur; yalnız
  yukarıdaki Noto görselleri dizilir.

## Notlar

- Apache 2.0: lisans metni ve bu atıf korunur; görseller yalnız küçültüldü (değişiklik bildirimi:
  512 → 256 px, PNG → WebP). `public/dukkan/LISANS.txt` aynı bilgiyi taşır.
- MIT (Phosphor): telif satırı `skillSembolleri.jsx` başında ve burada durur.
