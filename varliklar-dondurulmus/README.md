# varliklar-dondurulmus/

Derlemeye GİRMEYEN, silinmemiş varlıklar. `public/` altındaki her dosya
Vite tarafından her derlemeye kopyalanır ve her Vercel dağıtımında yeniden
saklanır; kullanılmayan büyük dosyalar bu yüzden buraya taşınır.

## sounds/ — 26 wav, 1,8 MB (22 Eyl 2026)

DidaGP (araba yarışı) motor/çarpma/drift sesleri. DidaGP bu depodan
ayrıldıktan sonra sahipsiz kaldı; taşındığı gün kodda hiçbir referansı
yoktu (her dosya adı tek tek arandı).

Geri açma: klasörü `public/sounds/` olarak geri taşı
(`git mv varliklar-dondurulmus/sounds public/sounds`); oyun `/sounds/<ad>.wav`
yolundan okur.

## meydan/ — 3B meydan varlıkları, 13,7 MB (22 Eyl 2026)

Dondurulmuş Meydan'ın (3B harita) ve meydan karakter prototipinin dosyaları:

- `meydan/deneme/` — atlas dokuları, bina/prop/karakter GLB'leri, cephe AO verisi.
  Kullanan kod: `oyun/harita/**` (deneme sayfası, karakter sistemi, muayene
  araçları) ve gardırop vitrini (`oyun/vitrin/**`).
- `meydan/aday-quaternius/` — Quaternius hazır insan modeli, saç ve hareket
  dosyaları (lisanslar klasörün içinde). Kullanan kod:
  `oyun/harita/aday/HazirInsanPrototipi.jsx` (`/insan-prototip`).

Hepsi `MEYDAN_ACIK` / `GARDIROP_ACIK` bayrağı (`oyun/lib/ozellikBayraklari.js`)
kapalıyken erişilemez; `/insan-prototip` da aynı bayrağa bağlandı.

Geri açma: bayrağı `true` yap ve iki klasörü `public/meydan/` altına geri taşı
(`git mv varliklar-dondurulmus/meydan/deneme public/meydan/deneme`, aynısı
`aday-quaternius` için). Kod `/meydan/deneme/` ve `/meydan/aday-quaternius/`
yollarından okur; üretici araçlar (`oyun/harita/varlik/*.mjs`) çıktıyı
`public/meydan/deneme`'ye yazar.
