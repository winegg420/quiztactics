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
