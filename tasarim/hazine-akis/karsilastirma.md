# Ortak Hazine akış ölçümü — önce / sonra (15 Eki 2026)

Taklit sunucu (canlı kasa_ilerlet_ic sırası/süreleri), CPU 6x + yavaş 4G, 390×844 Android; her sürümde 3 bot + 3 gecikmeli rakip maçı (aynı tohumlu plan). Araç: araclar/hazine-akis-olcum.mjs.

| sürüm | faz taşması | geç çalma (>250 ms) | eşzamanlı ses (<150 ms) | yarıda kesilen animasyon | 3-2-1 aralığı (ms) | soru sayacı ilk değer |
|---|---|---|---|---|---|---|
| 928914d (ses değişikliklerinden önce) | 4 | 0 | 1 | 85 | 982–1016 | 45/45 kez 15 |
| HEAD 7fff98f (bugün canlı) | 0 | 0 | 68 | 68 | 986–1035 | 43/43 kez 15 |
| düzeltme sonrası | 0 | 0 | 0 | 0 | 922–1015 | hep 15 |

Dokunuşla kapanan karar paneli (oyuncu AÇ/DEVAM'a basınca) ve sayacın saniye vuruşu (faz bitince sayaç kalkar) çakışma sayılmadı.

## 928914d (ses değişikliklerinden önce)

| adet | ne neyin üstüne biniyor |
|---|---|
| 22 | kesilen: ks-patla (ks-avatar.ks-avatar--anahtar, karar) |
| 16 | kesilen: ks-cubuk-parla (ks-skor-cubuk, cevap) |
| 11 | kesilen: ks-kadran-don (ks-kasa-kadran, cevap) |
| 8 | kesilen: qt-h-konfeti (qt-konfeti, sonuc) |
| 7 | kesilen: ks-kadran-don (ks-kasa-kadran, baslangic) |
| 4 | kesilen: ks-patla (ks-avatar.ks-avatar--anahtar, sonuc) |
| 3 | kesilen: qt-h-uc (ks-artis-etiket.qt-sayi, karar) |
| 2 | faz taşması: soru_geldi(ton) (cevap → karar) |
| 2 | kesilen: ks-kapak-tikir (ks-kasa-kapi, baslangic) |
| 2 | kesilen: qt-h-zipla (ks-kadran.ks-kadran--ben, karar) |
| 1 | faz taşması: dogru(ton) (sonuc → cevap) |
| 1 | faz taşması: yanlis(ton) (sonuc → cevap) |
| 1 | kesilen: ks-cifte-kat (ks-cifte, sonuc) |
| 1 | kesilen: ks-cifte-bant (ks-cifte-isin, sonuc) |
| 1 | kesilen: ks-cifte-yazi (ks-cifte-yazi, sonuc) |
| 1 | kesilen: ks-cifte-kat (ks-cifte, karar) |
| 1 | kesilen: ks-cifte-bant (ks-cifte-isin, karar) |
| 1 | kesilen: ks-cifte-yazi (ks-cifte-yazi, karar) |
| 1 | kesilen: ks-patla (ks-kadran.ks-kadran--ben, karar) |
| 1 | kesilen: ks-kadran-don (ks-kasa-kadran, karar) |
| 1 | eşzamanlı: (üretilmiş) + tur_gecis(ton) (karar) |
| 1 | kesilen: qt-h-kart-gir (qt-soru-kart, sonuc) |
| 1 | kesilen: ks-ucus-anahtar (ks-ucan.ks-ucan--anahtar, karar) |

## HEAD 7fff98f (bugün canlı)

| adet | ne neyin üstüne biniyor |
|---|---|
| 42 | eşzamanlı: tur_gecis + kalp (karar) |
| 21 | kesilen: ks-patla (ks-avatar.ks-avatar--anahtar, karar) |
| 15 | kesilen: ks-cubuk-parla (ks-skor-cubuk, cevap) |
| 14 | eşzamanlı: soru_geldi + rozet (cevap) |
| 8 | kesilen: qt-h-konfeti (qt-konfeti, sonuc) |
| 7 | eşzamanlı: kalp + sayim_son (karar) |
| 6 | kesilen: ks-giris-alt (ks-giris-hazir, baslangic) |
| 6 | kesilen: ks-kapak-tikir (ks-kasa-kapi, baslangic) |
| 5 | kesilen: ks-patla (ks-avatar.ks-avatar--anahtar, sonuc) |
| 2 | kesilen: ks-cifte-kat (ks-cifte, sonuc) |
| 2 | kesilen: ks-cifte-bant (ks-cifte-isin, sonuc) |
| 2 | kesilen: ks-cifte-yazi (ks-cifte-yazi, sonuc) |
| 2 | eşzamanlı: sayim_son + kalp (karar) |
| 1 | eşzamanlı: kalp + soru_geldi (cevap) |
| 1 | eşzamanlı: tur_gecis + tur_gecis (karar) |
| 1 | kesilen: qt-h-zipla (ks-kadran.ks-kadran--ben, karar) |
| 1 | eşzamanlı: sayim_son + soru_geldi (cevap) |

## düzeltme sonrası

Çakışma yok.
