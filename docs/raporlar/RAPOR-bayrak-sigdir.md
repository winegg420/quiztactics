# RAPOR — bayrak-sigdir (17 Eki 2026)

**Hedef:** Maç üst şeridinde ad altındaki bayrak + Lv + lig yıldızı satırı her telefon genişliğinde, üçü birlikte, kesilmeden ve binmeden görünsün.

## Ölçüm (önce)
Araç: `araclar/bayrak-sigdir-olcum.mjs` (gerçek bileşenler + sahte veri, yalnız yerel, sessiz). 320/340/360/375/390/412/430 px × TR/EN × 5 lig × 3 durum (Lv 5/35/100–112, kısa/uzun ad, 2–3 basamaklı skor) × 8 yer.
- Hazine (`ks-ust`) ≤ 409 px: bayrak gizli (769d6091 / 27767521 çözümü); 412'de satır sütundan taşıyor.
- Klasik/Saf Bilgi (`qt-mac-ust`) ≤ 409 px: bayrak gizli; **430 px dahil her genişlikte** yıldız rozeti Lv hapına biniyor, 320–390'da Lv hapı skora biniyor (ad sütunu 13–80 px, satır 91–102 px ister).
- Düello: Lv hapı 320–375'te sütundan taşıyor (yıldız bilerek gizli).
- Turnuva/Grup, VS sahnesi, profil kartı, lig tablosu, maç sonu: kesik/binme yok.

## Çözüm ve gerekçe
Satırı avatarın YANINDAki dar ad sütununda sıkıştırmak yerine, dar telefonda avatar + adın ALTINA, sütunun tam genişliğine indirdim (`mac-oyuncu.css`): `.qt-oyuncu` flex-wrap + `.qt-oyuncu-yazi {display: contents}` + `.mo-seviye {width: 100%}`; satır kendi içinde de sarabilir (son güvenlik, kesilmez). DOM, avatar boyutu, maç akışı/senkron/animasyon aynı.
- Hazine ve Klasik/Saf Bilgi ≤ 439 px, Düello ≤ 389 px (Düello'da ≥ 390 zaten sığıyordu; gereksiz yükseklik eklenmesin).
- ≤ 439: boşluk 3 px, Lv hapı iç boşluğu 5 px. Klasik yıldızı avatar köşesinden satıra alındı.
- Klasik ≤ 389: skor 28 px (kısa ekranlarda zaten kullanılan değer), ≤ 339: 26 px; ≤ 359: Lv yazısı 11 px, bayrak 16,5×11, amblem 18 px (alt sınır 16 px aşılmadı).
- 410 px altında bayrak gizleyen iki kural kaldırıldı (`kasa.css`, `mac-oyuncu.css`). Düello yıldız gizleme (`duello-tahta.css`) dokunulmadı.

## Sonuç (sonra)
8 yer × 7 genişlik × 2 dil × 5 lig × 3 durum = 1680 senaryo: kesik 0, binme 0, sütun taşması 0, çok satır (sarma) 0, yatay taşma 0, hata 0 (320 dahil). Bayrak/Lv/yıldız her şeritte görünür; ölçümde "yok" görünenler tasarım gereği: Düello yıldızı, profil kartı/lig tablosu/maç sonunda bayrak hiç yok (daha önce de yoktu), liste/maç sonu Lv düz metin.
En dar pay: Klasik 320 px, Lv 100 + 3 basamaklı skor — sütun 82 px, satır ~82 px (sığıyor, sarma güvenliği var).
Görüntüler: `tasarim/bayrak-sigdir/onceki-sonraki/` (önce-/sonra-, Hazine/Klasik/Düello × 320/360/430, 3x büyütme). Ölçüm özeti: `sonra/ozet.txt`, `sonra-b/ozet.txt`.

## Doğrulama
`npm run build` temiz; `npm run test:kurallar` temiz (57 ses dosyası). Ses çalınmadı (başsız, `--mute-audio`). Canlı doğrulama aşağıda.
Gerçek iOS Safari kontrolü bu makinede yapılamaz (WebKit engelli); `display: contents` + flex-wrap + `:is()` iOS 14+ destekli.
