# Premium çerçeve PNG yuvaları (`/premium-onizleme`, 2. tur)

Bu klasöre aşağıdaki adla bir PNG konursa, önizleme **kod çizimi yerine o görseli** kullanır;
efektler (göz parlaması, alev, kıvılcım, altın yansıması, parıltı) görselin üstünde aynen çalışır.
Dosya yoksa ya da yüklenemiyorsa kod çizimi kalır — başka bir ayar gerekmez.
Kod: `oyun/tasarim/premium/tur2/Cerceve2.jsx › PNG_YUVALARI`.

Dış kaynaklı görsel konacaksa lisansı önce `docs/VARLIK_LISANSLARI.md`'ye yazılır;
ticari izni olmayan görsel kullanılmaz.

## Koordinat sistemi (ikisi için ortak)

- Çerçeve kutusu = avatarın çapı. Birim = kutunun %1'i, merkez (0, 0), **y aşağı**.
- Çizim alanı kutunun %170'i: **−85 … +85** (her iki eksende). Görselin tamamı bu alana gerilir.
- Avatar dairesi yarıçapı **43**, halka **43 … 51**. Avatar dairesinin içi **tamamen şeffaf** olmalı.
- Piksele çevirme (1024 px kare görsel için): `px = (birim + 85) / 170 × 1024`
  → merkez 512, avatar dairesi yarıçapı 259 px, halka dış kenarı 307 px.

## `ejderha.png` — bütün çerçeve (halka + ejderha)

- Kare, şeffaf zemin, önerilen **1024 × 1024** (en az 512). Görsel −85…85 alanının tamamını kaplar.
- Halkayı da görsel çizer (kod halkası çizilmez); avatar dairesi (r ≤ 43 → 1024'te 259 px) şeffaf.
- Efekt noktaları kod çizimindekiyle **aynı yerde** olmalı:

| Nokta | Birim (x, y) | 1024 px'te (x, y) | Not |
|---|---|---|---|
| Göz (parlayan) | 8.3, −67.8 | 562, 103 | göz bebeği merkezi, görünür tek göz |
| Ağız (alev çıkışı) | 24.9, −61.0 | 662, 145 | açık ağzın ön ucu |
| Alev yönü | (0.91, 0.40) | — | sağa ve hafif aşağı (≈ 24°) |
| Burun deliği (duman) | 24.0, −68.1 | 657, 102 | nefes aralarında ince duman |

- Alev jeti ağızdan ~50 birim (≈ 300 px) ilerler; o yönde görselde boşluk bırakılmalı.
- Noktalar farklı olacaksa: `Cerceve2.jsx › TUR2.ejderha.n` yerine sabit liste verilir
  (`[[gözX, gözY, 1.5, 1], [0,0,0,0], [ağızX, ağızY, yönX, yönY], [burunX, burunY, 0, 0]]`).
- Pullara vuran ışık kırmızı alanlarda, alevin aydınlattığı yer görselin opak alanlarında çalışır.

## `kraliyet-tac.png` — yalnız taç

- Taç kutusu: **x −30 … 30, y −86 … −42** (60 × 44 birim; en-boy 15 : 11).
  Önerilen **600 × 440** px, şeffaf zemin. Görsel bu kutuya gerilir.
- Taç bandının alt kenarı **y ≈ −44**'te (halkanın tepesine oturur); halka, taşlar ve zambaklar kodda kalır.
- Görsel varken kod tacı çizilmez. Altın yansıması PNG'nin sarı-altın alanlarında çalışır
  (parlak sarı: kırmızı > 0,45, mavi belirgin düşük). Parıltı noktaları (birim): band taşları
  (0, −48), (±12.5, −48); uçlar (±24, −71), tepe (0, −81) — bu yerlerde taş/inci olması iyi görünür.
