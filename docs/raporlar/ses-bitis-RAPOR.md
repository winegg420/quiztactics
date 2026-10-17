# RAPOR — Ses bitiş kuralı (ses-bitis, 17 Eki 2026)

Klasör/dal: `C:\Users\ida\Desktop\quiztactics-ses` · `ses-bitis` (git worktree). Migration yok, canlı veritabanına yazma yok,
`ses_secimleri` değişmedi. Ölçüm Ida'nın isteğiyle son aşamada durduruldu; aşağıdaki sonuçlar o ana kadar tamamlanan koşulardır.

## Özet

| ölçü (gerçek ses çıkışı, AudioWorklet) | 10 Eki (efd76df3) | önce (908c2619) | sonra |
|---|---|---|---|
| Çizelge ölçümü, 6 mod × 7 senaryo (sonra: × 2 boyut × 2 dil) | 42 koşu · 1030 ses | 42 koşu · 1009 ses | **168 koşu · 3708 ses** |
| · ses bitmeden ekran geçti | 80 | 25 | **0** |
| · üst üste binme > 50 ms | 222 | 167 | **0** |
| · kesildi (doğal eğriden > 30 ms erken) | 0 | 45 | **0** |
| Hazine gerçek sayfa (taklit sunucu, CPU 6x, Android, 7 senaryo) | BAKILAMADI | 16 maç · 889 ses | **15 maç · 694 ses** |
| · ses bitmeden ekran geçti / binme / kesildi | — | 6 / 114 / 74 | **0 / 0 / 0** |

"Bir hafta önce kusursuzdu" notu: ölçüm 10 Eki hâlinin de kusursuz olmadığını gösteriyor. O gün sesler kesilmiyordu ama çok üst
üste biniyor ve ekran geçişlerine taşıyordu (ör. DEVAM anında soru sesi + rozet + coin aynı anda; o günkü rozet 3,1 sn). 16–17
Eki'deki düzeltmeler binmeyi kesmeyle (pencere kısaltma, söndürme) çözmeye çalıştı, bu kez sesler yarıda kesildi. Bu işte ikisi
birlikte kalktı: hiçbir ses kesilmiyor, hiçbir ses binmiyor.

## Kural (oyun/lib/sesKurali.js)

1. Anlamlı ses doğal sonuna (-45 dBFS) kadar çalar; hiçbir mekanizma kesmez, kısaltmaz, söndürmez.
2. Karar ses BAŞLAMADAN verilir: o ekranın penceresine (`sesPencere`) doğal hâliyle sığmayan ya da çalan anlamlı sesin üstüne
   50 ms'den fazla binecek ses HİÇ çalmaz (yarım ses yok). Maç sonu sesleri atlanmaz, sıraya girer (önceki ses bitince, ekran açıkken).
3. Dosyalar her rolün en dar penceresine doğal hâliyle sığar (`SINIR_MS`). Süreler, faz zamanları, sureler.js ve sunucu DEĞİŞMEDİ.

## Kaldırılan mekanizmalar

- 5d86f454: pencereye kısaltma, maç içi üst sınır (joker 700 / skill 900), yeni ekranda 150 ms söndürme, aynı rolün yeni
  kopyasının eskisini kısması.
- 7d278bec / B2: soru sesinin çalan doğru/yanlış sesini kısması (`kisVeDurdur`), faz değişiminde ÇALAN sesin düşürülmesi.
  Bekleyen ama başlamamış seslerin faz değişiminde düşmesi, tek sefer çalma, gizli sekmede çalmama, sunucu zamanına bağlı an KALDI.
- 194a494 / 63f4dc0: `TAM_CALAR`, `kasa_devam` rolü, `kasa_devam-e18d695314.wav` (rozet-n1 kırpılıp söndürülmüş) ve üreticisi;
  maç sonu ekranı kapanınca çalan XP sesinin söndürülmesi.
- 953e399: /ses-secim "Hazine DEVAM anı / Eski hâl" provası, `DevamProva.jsx`, çevirileri ve CSS'i.
- İzleme `ses_kesildi` artık doğal sona göre: `ekran` (doğal sona 50 ms'den fazla varken yeni ekran) · `aski` (AudioContext
  çalarken askıya alındı) · `diger`. Kurala göre bilerek çalınmayan (üst üste binerdi) ses `ses_yok` sayılmaz.

## O anda tek ses çalan yerler (karar ve gerekçe)

| an | çalan | çalmayan | gerekçe |
|---|---|---|---|
| Hazine DEVAM anı | kısa rozet (rozet:devam, 1175 ms), an sonunda soru sesi | DEVAM ödülünün ayrı rozeti | En dar ölçekte an 59 → 1380 ms; rozet ve soru sesi sırayla sığıyor. Ödül rozeti aynı anda başlıyor, pencereye sığmıyordu. |
| Hazine AÇ anı | kısa rozet (rozet:ac, 875 ms), sonra soru sesi | coin | m(980) ile an sonu arası en dar 323 ms, coin 430 ms; soru sesine biniyordu. Açılış rozetle anlatılıyor. |
| Hazine AÇ/DEVAM, veri çok geç | — (görsel aynı) | anın sesi | An gösterim payına sığmıyorsa sayaç başlamış; oyuncu cevaplayınca sonuç rozetin üstüne geliyordu (yavaş sunucu ölçümü). |
| Hazine giriş sahnesi | düşüş (tur geçişi), 3-2-1, sahne sonunda soru sesi | 1300 ms rozeti | 1000/2000 ms'deki "son 3 saniye" sesleriyle (445 ms) biniyordu; sayım işlevsel bilgi. |
| Hazine sonuç, kendi yanlış + rakip yanlış | yanlış sesi | rakibin kısık can kaybı (480 ms) | Yanlış sesi 585 ms; can kaybı binerdi. Doğru sesinde (395 ms) can kaybı çalar. |
| Hazine sonuç, büyük artış + anahtar el değişti | XP sesi | anahtar tur geçişi | XP 960 ms sürerken binerdi. |
| Hazine kapanış (hareket azaltma, 1,5 sn) | sahneye sığanlar | 1350 ms'deki yanlış | Sahnenin penceresi bildirildi; yanlış sesi maç sonu ekranına taşıyordu. |
| Rakibin joker / zaman baskısı işareti | sonuç sesi | işaret sesi (ben cevapladıysam) | Cevapladıysam sonuç rakip cevaplar cevaplamaz geliyor (ölçülen 150–180 ms). |
| Soru Değiştir (bütün modlar) | yeni sorunun soru sesi | joker sesi | Kart 200 ms (Klasik) / 1 RTT (Hazine, Düello) sonra değişiyor; joker sesi sığmıyordu. |
| Arama → rakip bulundu → VS | rakip bulundu (1385 ms) | VS sesi (450 ms'de) | Rakip bulundu sürerken başlardı; 2850 ms'lik pencerede ikisi sırayla sığmıyor. Bulunma anı birincil geri bildirim. |
| İlk soru (Klasik/Grup/Turnuva) | soru sesi, 3-2-1 bitip soru görününce | — | Kart sayımın altında takılınca çalıyordu; Turnuva başlangıç sesinin üstüne biniyordu. |
| Rütbe atlama | son cevabın sesinden sonra (sıra) | — | Rütbe katmanı geçici üst katman; sesi sıraya girer. |

## Değiştirilen / üretilen dosyalar

Üretici `araclar/ses-duzelt.mjs` (yeni paket yok): kesik dosyaya DOĞAL KUYRUK (sesin kendi son karesinin tayfı faz
sürekliliğiyle sürdürülür, kendi sönüm eğimiyle iner; kırpma yok), darbeli seste (XP sayacı) son vuruşun periyodunu tamamlama,
pencereye sığmayana PERDEYİ KORUYAN ZAMAN SIKIŞTIRMA (WSOLA, bütün cümle). Ad içerik sürümlü (public/ses/<kaynak>-<sha10>.wav, sw.js
önbelleğiyle uyumlu). Eşleme oyun/lib/sesDuzeltme.js (üretilir). Ida'nın seçimi sunucuda aynen duruyor.

- Brifte örnek verilen rozet-k2 ölçümde kesik çıktı (süren ses 10 ms'de -22 → -59 dB); kullanılmadı.
- Aday WAV'larda 0xFFFFFFFF veri boyutu arandı: yerel 175 adayın hiçbirinde yok (hepsi kovadaki dosyayla aynı özet).
- Joker/skill sesleri 350 ms sınırına sıkıştırıldı (bazıları ×0,2–0,3); tını aynı, süre kısa. Gerekçe: rakip jokerinden sonra
  sonuç ekranı 433 ms'de geldi (dalgalı ağ ölçümü).
- Uyarı: dosya testi "başından kırpılıp yavaşça söndürülmüş" dosyayı (kasa_devam gibi) doğal sönümden ayıramaz; bu,
  üreticinin kırpmamasıyla korunur. kasa_devam kaldırıldı.

### Dosya tablosu

| kaynak (seçim / varsayılan) | rol | kaynak süre / doğal ms | kaynakta kesik | pencere sınırı ms | çalan dosya (sonra) | doğal ms | son 20 ms dB | işlem |
|---|---|---|---|---|---|---|---|---|
| joker.mp3 | sis+joker | 387 / 365 | hayır | 294 | joker-d8380314a2.wav | 175 | -85.4 | perdeyi koruyan sıkıştırma ×0.25 |
| kazandin.wav | kazandin | 1387 / 1215 | hayır | 3000 | kazandin.wav | 1215 | -46.6 | değişmedi |
| kaybettin.wav | kaybettin | 1324 / 1315 | EVET (-40.2 dB) | 3000 | kaybettin-e71304cf40.wav | 1330 | -110.9 | doğal kuyruk (kaynak kesik) |
| soru_geldi.wav | soru_geldi | 328 / 320 | EVET (-33.2 dB) | 450 | soru_geldi-1008d41ce0.wav | 395 | -87.7 | doğal kuyruk (kaynak kesik) |
| tur_gecis.wav | tur_gecis | 369 / 365 | EVET (-27.5 dB) | 700 | tur_gecis-1781d6f888.wav | 405 | -89.8 | doğal kuyruk (kaynak kesik) |
| sayim_son.wav | sayim_son | 120 / 115 | EVET (-37.3 dB) | 900 | sayim_son-90d6b6bfd2.wav | 120 | -93 | doğal kuyruk (kaynak kesik) |
| son_saniyeler.wav | son_saniyeler | 147 / 100 | hayır | 700 | son_saniyeler.wav | 100 | -47.6 | değişmedi |
| skill_elli.wav | skill_elli | 256 / 250 | EVET (-23.7 dB) | 350 | skill_elli-f34034d224.wav | 335 | -86.6 | perdeyi koruyan sıkıştırma ×0.74 + doğal kuyruk (kaynak kesik) |
| skill_ek_sure.wav | skill_ek_sure | 485 / 475 | EVET (-35.6 dB) | 350 | skill_ek_sure-2f47cfa4f3.wav | 330 | -81.9 | perdeyi koruyan sıkıştırma ×0.59 + doğal kuyruk (kaynak kesik) |
| skill_soru_degistir.wav | skill_soru_degistir | 401 / 395 | EVET (-11.6 dB) | 350 | skill_soru_degistir-552c3715fa.wav | 300 | -78.9 | perdeyi koruyan sıkıştırma ×0.45 + doğal kuyruk (kaynak kesik) |
| skill_zaman_baskisi.wav | skill_zaman_baskisi | 284 / 230 | hayır | 350 | skill_zaman_baskisi.wav | 230 | -49.2 | değişmedi |
| skill_sigorta.wav | skill_sigorta | 254 / 165 | hayır | 350 | skill_sigorta.wav | 165 | -48.9 | değişmedi |
| skill_2x.wav | skill_2x | 561 / 535 | EVET (-42.1 dB) | 350 | skill_2x-76b55f6184.wav | 315 | -77.6 | perdeyi koruyan sıkıştırma ×0.35 + doğal kuyruk (kaynak kesik) |
| skill_ikinci_sans.wav | skill_ikinci_sans | 448 / 425 | EVET (-42 dB) | 350 | skill_ikinci_sans-a484ddc129.wav | 320 | -77.5 | perdeyi koruyan sıkıştırma ×0.43 + doğal kuyruk (kaynak kesik) |
| coin.wav | coin | 332 / 305 | EVET (-42.2 dB) | 1000 | coin-067c69fbfa.wav | 455 | -77.8 | doğal kuyruk (kaynak kesik) |
| level.wav | level | 792 / 770 | EVET (-41.3 dB) | 3000 | level-fd441b4bd8.wav | 930 | -76.3 | doğal kuyruk (kaynak kesik) |
| turnuva.wav | turnuva | 909 / 900 | EVET (-34.4 dB) | 4000 | turnuva-3d80d74de6.wav | 920 | -107.9 | doğal kuyruk (kaynak kesik) |
| dogru.mp3 | dogru | 295 / 285 | EVET (-30.9 dB) | 430 | dogru-34ccd47c79.wav | 390 | -95 | doğal kuyruk (kaynak kesik) |
| yanlis.mp3 | yanlis | 139 / 139 | EVET (-9.3 dB) | 800 | yanlis-45b86bf9b7.wav | 205 | -83.4 | doğal kuyruk (kaynak kesik) |
| sure_doldu.mp3 | sure_doldu | 521 / 215 | hayır | 300 | sure_doldu.mp3 | 215 | -66.6 | değişmedi |
| rakip_bulundu.mp3 | rakip_bulundu | 132 / 125 | EVET (-38.7 dB) | 2300 | rakip_bulundu-007545f14f.wav | 175 | -86.7 | doğal kuyruk (kaynak kesik) |
| can_kaybi.mp3 | can_kaybi | 129 / 85 | hayır | 800 | can_kaybi.mp3 | 85 | -46.8 | değişmedi |
| rutbe.mp3 | rutbe | 528 / 525 | EVET (-9.2 dB) | 3000 | rutbe-277eefc2d4.wav | 735 | -74.3 | doğal kuyruk (kaynak kesik) |
| coin-n1 | coin | 608 / 435 | hayır | 1000 | coin-n1.wav | 435 | -52.4 | değişmedi |
| dogru-n1 | dogru | 290 / 280 | EVET (-28 dB) | 430 | dogru-n1-f0351e252a.wav | 395 | -94.3 | doğal kuyruk (kaynak kesik) |
| level-n1 | level | 2023 / 1115 | hayır | 3000 | level-n1.wav | 1115 | -59.1 | değişmedi |
| rozet-n1 | rozet | 1800 / 1800 | EVET (-20.2 dB) | 2600 | rozet-n1-df4f6419ca.wav | 1910 | -84.1 | doğal kuyruk (kaynak kesik) |
| rozet-n1:ac | rozet | 1800 / 1800 | EVET (-20.2 dB) | 920 | rozet-n1-ac-d86df4e393.wav | 885 | -80.3 | perdeyi koruyan sıkıştırma ×0.41 + doğal kuyruk (kaynak kesik) |
| rozet-n1:devam | rozet | 1800 / 1800 | EVET (-20.2 dB) | 1230 | rozet-n1-devam-9e2f97d54f.wav | 1215 | -81.7 | perdeyi koruyan sıkıştırma ×0.58 + doğal kuyruk (kaynak kesik) |
| skill-n1 | joker | 1408 / 905 | hayır | 350 | skill-n1-257ab08d74.wav | 330 | -59.9 | perdeyi koruyan sıkıştırma ×0.36 |
| vs_ani-n1 | vs_ani | 1800 / 1745 | hayır | 2350 | vs_ani-n1.wav | 1745 | -47.9 | değişmedi |
| yanlis-n1 | yanlis | 600 / 575 | EVET (-38.8 dB) | 800 | yanlis-n1-1445b6e216.wav | 605 | -95.7 | doğal kuyruk (kaynak kesik) |
| turnuva-n1 | turnuva | 2500 / 2495 | EVET (-22.3 dB) | 4000 | turnuva-n1-169200f784.wav | 2600 | -88 | doğal kuyruk (kaynak kesik) |
| bildirim-n1 | bildirim | 232 / 195 | hayır | 3000 | bildirim-n1.wav | 195 | -49.1 | değişmedi |
| skill_2x-n1 | skill_2x | 410 / 405 | EVET (-14.9 dB) | 350 | skill_2x-n1-4ce6cd4ef0.wav | 330 | -74.4 | perdeyi koruyan sıkıştırma ×0.49 + doğal kuyruk (kaynak kesik) |
| xp_dolma-n1 | xp_dolma | 962 / 960 | EVET (-3.2 dB) | 1500 | xp_dolma-n1-df7e296a85.wav | 960 | -61.1 | son vuruş periyodu tamamlandı (kaynak kesik) |
| can_kaybi-n1 | can_kaybi | 253 / 250 | EVET (-22.7 dB) | 800 | can_kaybi-n1-121f0f06fb.wav | 345 | -81.6 | doğal kuyruk (kaynak kesik) |
| galibiyet-n1 | kazandin | 1385 / 1215 | EVET (-41.1 dB) | 3000 | galibiyet-n1-8d7e811f5e.wav | 1215 | -118.3 | doğal kuyruk (kaynak kesik) |
| tur_gecis-n1 | tur_gecis | 522 / 330 | hayır | 700 | tur_gecis-n1.wav | 330 | -63.3 | değişmedi |
| beraberlik-n1 | beraberlik | 526 / 510 | EVET (-38.4 dB) | 3000 | beraberlik-n1-35b4891731.wav | 525 | -114.4 | doğal kuyruk (kaynak kesik) |
| hata_uyari-n1 | hata_uyari | 393 / 300 | hayır | 3000 | hata_uyari-n1.wav | 300 | -52 | değişmedi |
| lig_atlama-n1 | rutbe | 1868 / 1205 | hayır | 3000 | lig_atlama-n1.wav | 1205 | -58.3 | değişmedi |
| maglubiyet-n1 | kaybettin | 1322 / 1310 | EVET (-40.2 dB) | 3000 | maglubiyet-n1-a9eea9e11d.wav | 1325 | -112.9 | doğal kuyruk (kaynak kesik) |
| satin_alma-n1 | satin_alma | 1001 / 960 | EVET (-40.8 dB) | 3000 | satin_alma-n1-9af1f9e622.wav | 980 | -105.2 | doğal kuyruk (kaynak kesik) |
| skill_elli-n1 | skill_elli | 1200 / 1130 | hayır | 350 | skill_elli-n1-16f27fefb4.wav | 260 | -45.4 | perdeyi koruyan sıkıştırma ×0.21 |
| soru_geldi-n1 | soru_geldi | 344 / 310 | hayır | 450 | soru_geldi-n1.wav | 310 | -50.1 | değişmedi |
| sure_doldu-n1 | sure_doldu | 1126 / 1120 | EVET (-24.6 dB) | 300 | sure_doldu-n1-cb8ad61d50.wav | 285 | -82.5 | perdeyi koruyan sıkıştırma ×0.15 + doğal kuyruk (kaynak kesik) |
| son_3_saniye-n1 | sayim_son | 697 / 445 | hayır | 900 | son_3_saniye-n1.wav | 445 | -48.9 | değişmedi |
| rakip_bulundu-n1 | rakip_bulundu | 1800 / 1350 | hayır | 2300 | rakip_bulundu-n1.wav | 1350 | -66.8 | değişmedi |
| skill_ek_sure-n1 | skill_ek_sure | 683 / 520 | hayır | 350 | skill_ek_sure-n1-4adfc5eed9.wav | 335 | -48.4 | perdeyi koruyan sıkıştırma ×0.62 |
| skill_sigorta-n1 | skill_sigorta | 777 / 700 | hayır | 350 | skill_sigorta-n1-ba3f33b633.wav | 330 | -49.4 | perdeyi koruyan sıkıştırma ×0.46 |
| rakip_cevapladi-n1 | rakip_cevapladi | 540 / 100 | hayır | 250 | rakip_cevapladi-n1.wav | 100 | -68.7 | değişmedi |
| kategori_secildi-n1 | kategori_secildi | 417 / 215 | hayır | 250 | kategori_secildi-n1.wav | 215 | -50.1 | değişmedi |
| skill_ikinci_sans-n1 | skill_ikinci_sans | 1200 / 1160 | hayır | 350 | skill_ikinci_sans-n1-e7dab32cd8.wav | 335 | -80.9 | perdeyi koruyan sıkıştırma ×0.22 |
| skill_soru_degistir-n1 | skill_soru_degistir | 721 / 710 | EVET (-35.5 dB) | 350 | skill_soru_degistir-n1-2c3a167848.wav | 320 | -83.5 | perdeyi koruyan sıkıştırma ×0.32 + doğal kuyruk (kaynak kesik) |
| skill_zaman_baskisi-n1 | skill_zaman_baskisi | 1200 / 1105 | hayır | 350 | skill_zaman_baskisi-n1-e3ba587ba9.wav | 335 | -47.8 | perdeyi koruyan sıkıştırma ×0.28 |

## An tablosu — her an için 10 Eki / önce / sonra: dosya · doğal ms · en dar gözlenen pencere · ekran geçti · binme · kesildi (bütün senaryolar birleşik)

| mod | an | rol | 10 Eki (efd76df3) | önce (908c2619) | sonra |
|---|---|---|---|---|---|
| duello | acilis_kategori | kategori_secildi | kategori_secildi-p1.mp3 · doğal 215 · pencere ≥ 1386 · ekran geçti 0 · binme 0 · kesildi 0 | kategori_secildi-n1.wav · doğal 210 · pencere ≥ 862 · ekran geçti 0 · binme 0 · kesildi 0 | kategori_secildi-n1.wav · doğal 210 · pencere ≥ 857 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | arama | rakip_bulundu | rakip_bulundu-p1.mp3 · doğal 920 · pencere ≥ 439 · ekran geçti 0 · binme 14 (≤ 481 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 449 · ekran geçti 0 · binme 14 (≤ 919 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 2816 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | arama | vs_ani | vs_ani-p1.mp3 · doğal 2325 · pencere ≥ 2356 · ekran geçti 1 (≤ 55 ms) · binme 0 · kesildi 0 | vs_ani-n1.wav · doğal 1745 · pencere ≥ 2378 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| duello | can_kaybi | can_kaybi | can_kaybi-k3.wav · doğal 255 · pencere ≥ 1917 · ekran geçti 0 · binme 0 · kesildi 0 | can_kaybi-n1.wav · doğal 250 · pencere ≥ 1918 · ekran geçti 0 · binme 0 · kesildi 0 | can_kaybi-n1.wav · doğal 340 · pencere ≥ 1916 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | kart | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 989 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 987 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 958 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | kart | tur_gecis | tur_gecis-p1.mp3 · doğal 340 · pencere ≥ 7886 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 7888 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 7877 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | kendi_joker | joker | skill-p1.mp3 · doğal 850 · pencere ≥ 802 · ekran geçti 0 · binme 0 · kesildi 0 | skill-n1.wav · doğal 900 · pencere ≥ 803 · ekran geçti 0 · binme 0 · kesildi 4 (≤ 55 ms) | skill-n1.wav · doğal 330 · pencere ≥ 799 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | kontrol_aldi | tur_gecis | tur_gecis-p1.mp3 · doğal 340 · pencere ≥ 1917 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 1913 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 1908 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | mac_sonu | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 1221 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 603 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 460 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | mac_sonu | kazandin | kazandin.wav · doğal 1120 · pencere ≥ 700 · ekran geçti 0 · binme 7 (≤ 492 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 819 · ekran geçti 0 · binme 7 (≤ 373 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 1225 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | mac_sonu | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 3243 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 3244 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1890 · pencere ≥ 2610 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | mac_sonu | xp_dolma | xp_dolma-k3.wav · doğal 960 · pencere ≥ 108 · ekran geçti 0 · binme 7 (≤ 381 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 610 · ekran geçti 0 · binme 7 (≤ 351 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 970 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | notr2_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1195 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1189 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1196 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | notr_soru | rakip_cevapladi | rakip_cevapladi-p1.mp3 · doğal 260 · pencere ≥ 1639 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 1312 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 1245 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | notr_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 898 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1185 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1195 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | rakip_zaman_baskisi | skill_zaman_baskisi | skill_zaman_baskisi-p1.mp3 · doğal 2895 · pencere ≥ 1400 · ekran geçti 6 (≤ 1497 ms) · binme 6 (≤ 1363 ms) · kesildi 0 | skill_zaman_baskisi-n1.wav · doğal 1105 · pencere ≥ 1398 · ekran geçti 0 · binme 0 · kesildi 0 | skill_zaman_baskisi-n1.wav · doğal 335 · pencere ≥ 1390 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | rovans_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ — · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ — · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ — · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | saldiri_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1191 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1192 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1190 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | son_baski | son_saniyeler | son_saniyeler.wav · doğal 90 · pencere ≥ 2177 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 2178 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 2158 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | sonuc_dogru2 | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 798 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 794 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 800 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | sonuc_dogru | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 1030 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 1054 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 1029 · ekran geçti 0 · binme 0 · kesildi 0 |
| duello | sonuc_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 1060 · ekran geçti 0 · binme 7 (≤ 251 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 1060 · ekran geçti 0 · binme 0 · kesildi 0 | yanlis-n1.wav · doğal 585 · pencere ≥ 1031 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | arama | rakip_bulundu | rakip_bulundu-p1.mp3 · doğal 920 · pencere ≥ 452 · ekran geçti 0 · binme 7 (≤ 468 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 450 · ekran geçti 0 · binme 7 (≤ 918 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 2848 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | arama | vs_ani | vs_ani-p1.mp3 · doğal 2325 · pencere ≥ 2358 · ekran geçti 1 (≤ 52 ms) · binme 0 · kesildi 0 | vs_ani-n1.wav · doğal 1745 · pencere ≥ 2388 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| grup | mac_sonu | beraberlik | beraberlik-k1.wav · doğal 510 · pencere ≥ 2440 · ekran geçti 0 · binme 0 · kesildi 0 | beraberlik-n1.wav · doğal 510 · pencere ≥ 2444 · ekran geçti 0 · binme 0 · kesildi 0 | beraberlik-n1.wav · doğal 510 · pencere ≥ 2439 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | mac_sonu | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 3228 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 3200 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1890 · pencere ≥ 3210 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s1_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2687 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2686 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1609 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s2_soru | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 974 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 939 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 961 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s2_soru | son_saniyeler | son_saniyeler.wav · doğal 90 · pencere ≥ 1994 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1998 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1929 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s2_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 9988 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 9980 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 9935 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s3_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1945 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1940 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1895 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s4_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2349 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2280 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2343 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | s5_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2648 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2643 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2644 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | sonuc_dogru | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 787 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 776 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 776 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | sonuc_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 976 · ekran geçti 4 (≤ 387 ms) · binme 4 (≤ 304 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 967 · ekran geçti 0 · binme 0 · kesildi 0 | yanlis-n1.wav · doğal 585 · pencere ≥ 978 · ekran geçti 0 · binme 0 · kesildi 0 |
| grup | sure_doldu | sure_doldu | sure_doldu-p1.mp3 · doğal 1750 · pencere ≥ 294 · ekran geçti 5 (≤ 1456 ms) · binme 5 (≤ 304 ms) · kesildi 0 | sure_doldu-n1.wav · doğal 1120 · pencere ≥ 258 · ekran geçti 5 (≤ 216 ms) · binme 5 (≤ 216 ms) · kesildi 4 (≤ 715 ms) | sure_doldu-n1.wav · doğal 270 · pencere ≥ 256 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | ac_coin | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 292 · ekran geçti 7 (≤ 89 ms) · binme 7 (≤ 89 ms) · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 420 · ekran geçti 0 · binme 0 · kesildi 7 (≤ 78 ms) | — |
| hazine | ac_rozet | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 634 · ekran geçti 7 (≤ 2185 ms) · binme 7 (≤ 381 ms) · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 911 · ekran geçti 0 · binme 7 (≤ 368 ms) · kesildi 7 (≤ 512 ms) | rozet-n1-ac.wav · doğal 875 · pencere ≥ 1320 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | ac_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2627 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2647 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2598 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | anahtar | tur_gecis | tur_gecis-p1.mp3 · doğal 340 · pencere ≥ 869 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 872 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| hazine | arama | rakip_bulundu | rakip_bulundu-p1.mp3 · doğal 920 · pencere ≥ 450 · ekran geçti 0 · binme 7 (≤ 470 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 449 · ekran geçti 0 · binme 7 (≤ 919 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 2847 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | arama | vs_ani | vs_ani-p1.mp3 · doğal 2325 · pencere ≥ 2383 · ekran geçti 0 · binme 0 · kesildi 0 | vs_ani-n1.wav · doğal 1745 · pencere ≥ 2345 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| hazine | cevap | sayim_son | son_3_saniye-k2.wav · doğal 335 · pencere ≥ 402 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 379 · pencere ≥ 404 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 379 · pencere ≥ 360 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | devam_an_sonu_soru | soru_geldi | — | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1499 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1468 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | devam_coin | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 838 · ekran geçti 0 · binme 0 · kesildi 0 | — | — |
| hazine | devam_ses | kasa_devam | — | kasa_devam.wav · doğal 750 · pencere ≥ 1312 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| hazine | devam_ses | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 500 · ekran geçti 7 (≤ 1782 ms) · binme 7 (≤ 381 ms) · kesildi 0 | — | rozet-n1-devam.wav · doğal 1175 · pencere ≥ 1280 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | devam_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 359 · ekran geçti 0 · binme 0 · kesildi 0 | — | — |
| hazine | final_rozet | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 1291 · ekran geçti 0 · binme 6 (≤ 960 ms) · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 1300 · ekran geçti 0 · binme 6 (≤ 498 ms) · kesildi 0 | rozet-n1.wav · doğal 1890 · pencere ≥ 1920 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | final_rozet | xp_dolma | xp_dolma-k3.wav · doğal 960 · pencere ≥ 1817 · ekran geçti 0 · binme 0 · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 1841 · ekran geçti 0 · binme 0 · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 1192 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | final_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 156 · ekran geçti 1 (≤ 1206 ms) · binme 1 (≤ 914 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 146 · ekran geçti 1 (≤ 139 ms) · binme 0 · kesildi 1 (≤ 290 ms) | — |
| hazine | final | tur_gecis | tur_gecis-p1.mp3 · doğal 340 · pencere ≥ 969 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 992 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 952 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | giris_rozet | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 690 · ekran geçti 7 (≤ 1021 ms) · binme 7 (≤ 381 ms) · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 700 · ekran geçti 0 · binme 7 (≤ 443 ms) · kesildi 0 | — |
| hazine | giris_rozet | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 999 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 995 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| hazine | giris_sayim | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 250 · ekran geçti 0 · binme 7 (≤ 132 ms) · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 286 · ekran geçti 0 · binme 7 (≤ 157 ms) · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 979 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | giris | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 240 · ekran geçti 0 · binme 1 (≤ 141 ms) · kesildi 0 | — | — |
| hazine | giris | tur_gecis | tur_gecis-p1.mp3 · doğal 340 · pencere ≥ 638 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 984 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 897 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | ilk_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1789 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1784 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1764 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | karar | tur_gecis | tur_gecis-p1.mp3 · doğal 340 · pencere ≥ 1824 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 1929 · ekran geçti 0 · binme 0 · kesildi 0 | tur_gecis-n1.wav · doğal 300 · pencere ≥ 1929 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | kendi_joker | skill_2x | skill_2x-p1.mp3 · doğal 410 · pencere ≥ 784 · ekran geçti 0 · binme 0 · kesildi 0 | skill_2x-n1.wav · doğal 405 · pencere ≥ 799 · ekran geçti 0 · binme 0 · kesildi 0 | skill_2x-n1.wav · doğal 320 · pencere ≥ 800 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | mac_sonu | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 4478 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 589 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 460 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | mac_sonu | kaybettin | kaybettin.wav · doğal 1305 · pencere ≥ 1100 · ekran geçti 0 · binme 1 (≤ 209 ms) · kesildi 0 | maglubiyet-n1.wav · doğal 1310 · pencere ≥ 1363 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| hazine | mac_sonu | kazandin | kazandin.wav · doğal 1120 · pencere ≥ 668 · ekran geçti 0 · binme 6 (≤ 524 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 819 · ekran geçti 0 · binme 6 (≤ 373 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 1225 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | mac_sonu | xp_dolma | xp_dolma-k3.wav · doğal 960 · pencere ≥ 112 · ekran geçti 0 · binme 6 (≤ 381 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 3865 · ekran geçti 0 · binme 0 · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 3579 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | rakip_can | can_kaybi | can_kaybi-k3.wav · doğal 250 · pencere ≥ 455 · ekran geçti 0 · binme 0 · kesildi 0 | can_kaybi-n1.wav · doğal 245 · pencere ≥ 2507 · ekran geçti 0 · binme 0 · kesildi 0 | can_kaybi-n1.wav · doğal 315 · pencere ≥ 2506 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | rakip_can | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 2036 · ekran geçti 0 · binme 0 · kesildi 0 | — | — |
| hazine | rakip_joker | joker | skill-p1.mp3 · doğal 850 · pencere ≥ 800 · ekran geçti 1 (≤ 51 ms) · binme 1 (≤ 50 ms) · kesildi 0 | skill-n1.wav · doğal 900 · pencere ≥ 800 · ekran geçti 0 · binme 0 · kesildi 4 (≤ 55 ms) | skill-n1.wav · doğal 330 · pencere ≥ 783 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | sonuc_dogru3 | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 1310 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 1300 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 1297 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | sonuc_dogru | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 449 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 469 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 423 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | sonuc_xp | xp_dolma | xp_dolma-k3.wav · doğal 960 · pencere ≥ 801 · ekran geçti 0 · binme 7 (≤ 159 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 804 · ekran geçti 0 · binme 7 (≤ 157 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 1665 · ekran geçti 0 · binme 0 · kesildi 0 |
| hazine | sonuc_yanlis | can_kaybi | can_kaybi-k3.wav · doğal 250 · pencere ≥ 2506 · ekran geçti 0 · binme 0 · kesildi 0 | can_kaybi-n1.wav · doğal 245 · pencere ≥ 2504 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| hazine | sonuc_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 428 · ekran geçti 0 · binme 7 (≤ 251 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 472 · ekran geçti 0 · binme 7 (≤ 106 ms) · kesildi 0 | yanlis-n1.wav · doğal 585 · pencere ≥ 2938 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | arama | rakip_bulundu | rakip_bulundu-p1.mp3 · doğal 920 · pencere ≥ 411 · ekran geçti 0 · binme 14 (≤ 509 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 430 · ekran geçti 0 · binme 14 (≤ 938 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 2824 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | arama | vs_ani | vs_ani-p1.mp3 · doğal 2325 · pencere ≥ 2370 · ekran geçti 0 · binme 0 · kesildi 0 | vs_ani-n1.wav · doğal 1745 · pencere ≥ 2387 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| klasik | joker_elli | skill_elli | skill_elli-p1.mp3 · doğal 1615 · pencere ≥ 780 · ekran geçti 0 · binme 6 (≤ 283 ms) · kesildi 0 | skill_elli-n1.wav · doğal 1130 · pencere ≥ 770 · ekran geçti 0 · binme 5 (≤ 280 ms) · kesildi 0 | skill_elli-n1.wav · doğal 260 · pencere ≥ 668 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | joker_soru_degistir | skill_soru_degistir | skill_soru_degistir-k2.wav · doğal 690 · pencere ≥ 131 · ekran geçti 7 (≤ 557 ms) · binme 7 (≤ 304 ms) · kesildi 0 | skill_soru_degistir-n1.wav · doğal 705 · pencere ≥ 127 · ekran geçti 7 (≤ 142 ms) · binme 7 (≤ 140 ms) · kesildi 7 (≤ 436 ms) | — |
| klasik | joker_sure | skill_ek_sure | skill_ek_sure-k3.wav · doğal 485 · pencere ≥ 798 · ekran geçti 0 · binme 0 · kesildi 0 | skill_ek_sure-n1.wav · doğal 485 · pencere ≥ 801 · ekran geçti 0 · binme 0 · kesildi 0 | skill_ek_sure-n1.wav · doğal 320 · pencere ≥ 793 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | mac_sonu | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 1199 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 601 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 460 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | mac_sonu | kazandin | kazandin.wav · doğal 1120 · pencere ≥ 692 · ekran geçti 0 · binme 7 (≤ 500 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 816 · ekran geçti 0 · binme 7 (≤ 376 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 1225 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | mac_sonu | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 3240 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 3248 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1890 · pencere ≥ 2560 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | mac_sonu | xp_dolma | xp_dolma-k3.wav · doğal 960 · pencere ≥ 110 · ekran geçti 0 · binme 7 (≤ 381 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 572 · ekran geçti 0 · binme 7 (≤ 388 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 970 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | rovans_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ — · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ — · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ — · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | rutbe | rutbe | lig_atlama-p1.mp3 · doğal 1225 · pencere ≥ 1490 · ekran geçti 0 · binme 0 · kesildi 0 | lig_atlama-n1.wav · doğal 1360 · pencere ≥ 1493 · ekran geçti 0 · binme 0 · kesildi 0 | lig_atlama-n1.wav · doğal 1360 · pencere ≥ 1367 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s1_soru | rakip_cevapladi | rakip_cevapladi-p1.mp3 · doğal 260 · pencere ≥ 592 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 260 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 177 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s1_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2687 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2687 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1162 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s2_soru | rakip_cevapladi | rakip_cevapladi-p1.mp3 · doğal 260 · pencere ≥ 6911 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 6521 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 6530 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s2_soru | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 991 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 985 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 899 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s2_soru | son_saniyeler | son_saniyeler.wav · doğal 90 · pencere ≥ 1993 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1997 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1987 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s2_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2991 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 3301 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 3292 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s3_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1158 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1181 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1149 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s4_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1495 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1493 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1667 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | s5_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 490 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 499 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 490 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | sis | joker | joker.mp3 · doğal 521 · pencere ≥ 343 · ekran geçti 0 · binme 0 · kesildi 0 | joker.mp3 · doğal 521 · pencere ≥ 342 · ekran geçti 0 · binme 0 · kesildi 0 | joker.wav · doğal 250 · pencere ≥ 339 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | sonuc_dogru | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 280 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 279 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 406 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | sonuc_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 997 · ekran geçti 5 (≤ 366 ms) · binme 5 (≤ 304 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 1000 · ekran geçti 0 · binme 0 · kesildi 0 | yanlis-n1.wav · doğal 585 · pencere ≥ 984 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | soru_degisti | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1642 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1640 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1631 · ekran geçti 0 · binme 0 · kesildi 0 |
| klasik | sure_doldu | sure_doldu | sure_doldu-p1.mp3 · doğal 1750 · pencere ≥ 2299 · ekran geçti 0 · binme 0 · kesildi 0 | sure_doldu-n1.wav · doğal 1120 · pencere ≥ 2297 · ekran geçti 0 · binme 0 · kesildi 0 | sure_doldu-n1.wav · doğal 270 · pencere ≥ 2285 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | arama | rakip_bulundu | rakip_bulundu-p1.mp3 · doğal 920 · pencere ≥ 450 · ekran geçti 0 · binme 7 (≤ 470 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 450 · ekran geçti 0 · binme 7 (≤ 918 ms) · kesildi 0 | rakip_bulundu-n1.wav · doğal 1385 · pencere ≥ 2833 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | arama | vs_ani | vs_ani-p1.mp3 · doğal 2325 · pencere ≥ 2359 · ekran geçti 1 (≤ 52 ms) · binme 0 · kesildi 0 | vs_ani-n1.wav · doğal 1745 · pencere ≥ 2330 · ekran geçti 0 · binme 0 · kesildi 0 | — |
| saf_bilgi | mac_sonu | coin | coin-p1.mp3 · doğal 385 · pencere ≥ 1226 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 603 · ekran geçti 0 · binme 0 · kesildi 0 | coin-n1.wav · doğal 430 · pencere ≥ 460 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | mac_sonu | kazandin | kazandin.wav · doğal 1120 · pencere ≥ 700 · ekran geçti 0 · binme 7 (≤ 493 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 797 · ekran geçti 0 · binme 7 (≤ 395 ms) · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 1225 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | mac_sonu | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 3249 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 3230 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1890 · pencere ≥ 2600 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | mac_sonu | xp_dolma | xp_dolma-k3.wav · doğal 960 · pencere ≥ 99 · ekran geçti 0 · binme 7 (≤ 381 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 610 · ekran geçti 0 · binme 7 (≤ 350 ms) · kesildi 0 | xp_dolma-n1.wav · doğal 960 · pencere ≥ 970 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s1_soru | rakip_cevapladi | rakip_cevapladi-p1.mp3 · doğal 260 · pencere ≥ 716 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 359 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 332 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s1_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2688 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2687 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1192 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s2_soru | rakip_cevapladi | rakip_cevapladi-p1.mp3 · doğal 260 · pencere ≥ 6993 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 6651 · ekran geçti 0 · binme 0 · kesildi 0 | rakip_cevapladi-n1.wav · doğal 100 · pencere ≥ 6641 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s2_soru | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 987 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 953 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 979 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s2_soru | son_saniyeler | son_saniyeler.wav · doğal 90 · pencere ≥ 1995 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1995 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1929 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s2_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2960 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 3300 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 3288 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s3_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1940 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1921 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1915 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s4_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2341 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2348 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2306 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | s5_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2627 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2645 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2620 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | sonuc_dogru | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 995 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 979 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 979 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | sonuc_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 977 · ekran geçti 4 (≤ 385 ms) · binme 4 (≤ 304 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 994 · ekran geçti 0 · binme 0 · kesildi 0 | yanlis-n1.wav · doğal 585 · pencere ≥ 977 · ekran geçti 0 · binme 0 · kesildi 0 |
| saf_bilgi | sure_doldu | sure_doldu | sure_doldu-p1.mp3 · doğal 1750 · pencere ≥ 2297 · ekran geçti 0 · binme 0 · kesildi 0 | sure_doldu-n1.wav · doğal 1120 · pencere ≥ 2290 · ekran geçti 0 · binme 0 · kesildi 0 | sure_doldu-n1.wav · doğal 270 · pencere ≥ 2277 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | mac_sonu | kazandin | kazandin.wav · doğal 1120 · pencere ≥ 2043 · ekran geçti 0 · binme 0 · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 2045 · ekran geçti 0 · binme 0 · kesildi 0 | galibiyet-n1.wav · doğal 1120 · pencere ≥ 2030 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | mac_sonu | rozet | rozet-p1.mp3 · doğal 3120 · pencere ≥ 3234 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1795 · pencere ≥ 3240 · ekran geçti 0 · binme 0 · kesildi 0 | rozet-n1.wav · doğal 1890 · pencere ≥ 3239 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s1_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 4607 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 4687 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1643 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s2_soru | sayim_son | son_3_saniye-k2.wav · doğal 375 · pencere ≥ 942 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 981 · ekran geçti 0 · binme 0 · kesildi 0 | son_3_saniye-n1.wav · doğal 425 · pencere ≥ 908 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s2_soru | son_saniyeler | son_saniyeler.wav · doğal 90 · pencere ≥ 1994 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1994 · ekran geçti 0 · binme 0 · kesildi 0 | son_saniyeler.wav · doğal 90 · pencere ≥ 1991 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s2_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 9990 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 9988 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 9966 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s3_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 1949 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1941 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 1876 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s4_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2341 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2307 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2344 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | s5_soru | soru_geldi | soru_geldi-k3.wav · doğal 305 · pencere ≥ 2641 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2643 · ekran geçti 0 · binme 0 · kesildi 0 | soru_geldi-n1.wav · doğal 305 · pencere ≥ 2647 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | sonuc_dogru | dogru | dogru-k1.wav · doğal 285 · pencere ≥ 436 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 280 · pencere ≥ 447 · ekran geçti 0 · binme 0 · kesildi 0 | dogru-n1.wav · doğal 385 · pencere ≥ 438 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | sonuc_yanlis | yanlis | yanlis-p1.mp3 · doğal 1340 · pencere ≥ 992 · ekran geçti 4 (≤ 371 ms) · binme 4 (≤ 304 ms) · kesildi 0 | yanlis-n1.wav · doğal 575 · pencere ≥ 997 · ekran geçti 0 · binme 0 · kesildi 0 | yanlis-n1.wav · doğal 585 · pencere ≥ 947 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | sure_doldu | sure_doldu | sure_doldu-p1.mp3 · doğal 1750 · pencere ≥ 257 · ekran geçti 5 (≤ 1493 ms) · binme 5 (≤ 304 ms) · kesildi 0 | sure_doldu-n1.wav · doğal 1120 · pencere ≥ 287 · ekran geçti 5 (≤ 234 ms) · binme 5 (≤ 234 ms) · kesildi 4 (≤ 693 ms) | sure_doldu-n1.wav · doğal 270 · pencere ≥ 248 · ekran geçti 0 · binme 0 · kesildi 0 |
| turnuva | turnuva_basla | turnuva | turnuva-p1.mp3 · doğal 3055 · pencere ≥ 305 · ekran geçti 7 (≤ 2759 ms) · binme 7 (≤ 304 ms) · kesildi 0 | turnuva-n1.wav · doğal 2495 · pencere ≥ 298 · ekran geçti 7 (≤ 146 ms) · binme 7 (≤ 146 ms) · kesildi 7 (≤ 2055 ms) | turnuva-n1.wav · doğal 2590 · pencere ≥ 4990 · ekran geçti 0 · binme 0 · kesildi 0 |


## Kalıcı testler

- `araclar/ses-dosya-sonu.mjs` (`npm run test:kurallar`): oyunda çalabilecek 57 dosya (varsayılanlar, seçimler, an varyantları):
  WAV başlığı, son 20 ms -45 dB altı, son 150 ms'de basamak yok, doğal süre rol sınırı içinde, eksik/başvurulmayan düzeltilmiş
  dosya yok. Kesik dosya konunca kırmızıya düştüğü denendi. Son koşu: 57/57 geçti.
- `araclar/ses-cikis-olcum.mjs` (+ `ses-cikis-iz.mjs`, `ses-cikis-rapor.mjs`): gerçek ses.js ve dosyalar; her ses zincirine
  AudioWorklet dinleyicisi; ekran geçti / binme / kesilme gerçek sinyalden; sürümler yan yana.
- `araclar/hazine-akis-olcum.mjs`: "GERÇEK ÇIKIŞ" satırı (gerçek KasaPage, taklit sunucu).
- `araclar/ses-zamanlama-dogrula.mjs`: B2/B3 yeni kurala göre; 9/9 geçti.
- Seçim değişince: canlıdan tek salt okuma (ses_secimleri_oyun) → `node araclar/ses-duzelt.mjs` → `npm run test:kurallar`.

## Faz zamanları değişmedi (E)

- `git diff 908c2619 -- oyun/pages oyun/components oyun/lib/sureler.js`: yalnız ses çağrıları ve ses koşulları değişti.
  sureler.js, zamanlayıcı süreleri, an adımlarının zamanları (görsel adımlar duruyor) ve sunucu ayarları değişmedi.
- Hazine gerçek sayfa önce/sonra (aynı senaryolar): 3-2-1 rakam süreleri iki sürümde 990–1090 ms; DEVAM anı zamanları
  (gösterim başına göre an ≈ −2,6 → −0,8 sn, soru sesi an sonunda) ve soru↔ses farkları aynı düzende; sayaç ilk değer 15.
  Ham veri yerel: tasarim/hazine-akis/olcum-once-senaryolar.json, olcum-sonra-senaryolar.json (git'e girmedi).

## TEST-KAPSAMI — madde durumu

| madde | durum | ölçü / neden |
|---|---|---|
| 4 Ses (bütün maddeler) | GEÇTİ | çizelge 168 koşu + Hazine gerçek sayfa 15 maç: ekran geçti 0, binme 0, kesildi 0. Çalmayanlar yalnız tablodaki tasarlanmış tek-ses anları |
| 4 Dosya sonu | GEÇTİ | 57/57 |
| 5 Zamanlama | GEÇTİ (kısmi) | süre bildirimi ölçümü (bellekte): yeni kodda erken gönderim 0; Hazine 3-2-1 ~1 sn. senkron-testi BAKILAMADI: canlıda bot maçı açar (bu işte canlı yazma yasak) |
| 2 Görünüm (maç ekranları) | GEÇTİ | klasik-mac-ekran --taklit-oturum: Klasik/Saf/Uzun/Grup/Turnuva × TR/EN × 390/360: taşma 0, kesik 0, CLS 0 |
| 8 Konsol / izleme | GEÇTİ | izleme-istemci-testi hepsi geçti; ölçüm koşularında sayfa hatası 0 |
| 1, 2 (16 sayfa × 4 genişlik) | BAKILAMADI | arayuz-denetim iş sonunda misafir hesabını canlıda siler (canlı yazma yasak). Değişen arayüz yalnız /ses-secim'deki prova bölümünün kaldırılması |
| 3 Animasyon | GEÇTİ (Hazine) | Hazine ölçümünde kesik animasyonlar önce/sonra aynı türde, ses değişikliğinden bağımsız |
| 6 Akış · 7 Veri | BAKILAMADI | canlı maç / canlı veri yazımı bu işte yasak; ses dışında akış/veri kodu değişmedi |
| Hazine sonra: hareket azaltma + 360 + EN | KISMİ | 1 maç tamamlandı (0/0/0); kalan 3 maç ölçüm durdurulunca yarıda kaldı |
| 10 Eki gerçek sayfa | BAKILAMADI | efd76df3'ün sunucu sözleşmesi bugünkü taklit sunucuyla uyumlu değil; 10 Eki çizelge ölçümüyle (o günün sayfa davranışı ve seçimleriyle) karşılaştırıldı |
| Gerçek iOS / telefon | BAKILAMADI | WebKit bu makinede çalışmıyor; gerçek cihaz sahibinde |

Çizelge ölçümü sayfaların ses çağrı zamanlarını koddan alır (gerçek sayfa değil); bu yüzden Hazine ayrıca gerçek sayfada ölçüldü.
Gerçek sayfa iki ihlal yakaladı (rakip jokeri → hızlı sonuç; yavaş sunucuda geç DEVAM anı) ve ikisi düzeltildi.

## PROGRESS.md'ye eklenecek satırlar

```
### 17 Eki 2026 — Ses bitiş kuralı (ses-bitis, birleştirildi)
- Ida: "sesler birbirinin üstüne biniyor, ses bitmeden yeni soru geliyor". Kural: anlamlı ses doğal sonuna (-45 dB) kadar çalar,
  hiçbir şey kesmez; sığmayan / üstüne binecek ses hiç çalmaz; iki anlamlı ses > 50 ms binmez. Süreler değişmedi.
- Kaldırıldı: pencere kısaltma, maç içi üst sınır, yeni ekranda söndürme, aynı rolde kısma, kisVeDurdur, kasa_devam + üreticisi,
  /ses-secim DEVAM provası. Kesik/sığmayan dosyaların doğal biten kopyaları araclar/ses-duzelt.mjs ile (public/ses/<ad>-<sha>.wav).
- Tek ses anları: Hazine AÇ (kısa rozet, coin yok), DEVAM (kısa rozet + an sonunda soru), giriş (rozet yok), Soru Değiştir
  (soru sesi), VS (rakip bulundu sürerken çalmaz), rakip jokeri (yalnız ben cevaplamamışken), geç DEVAM anı (sessiz).
- Ölçüm (gerçek çıkış, AudioWorklet): 10 Eki 80 ekran geçti / 222 binme · önce 25 / 167 / 45 kesik · sonra 0 / 0 / 0 (168 koşu);
  Hazine gerçek sayfa önce 6/114/74 → sonra 0/0/0 (15 maç).
- Testler: araclar/ses-dosya-sonu.mjs (test:kurallar), araclar/ses-cikis-olcum.mjs, hazine-akis-olcum GERÇEK ÇIKIŞ.
```

## PROJECT_CONTEXT.md'ye eklenecek / değişecek satırlar

- "Hazine DEVAM anı sesi (17 Eki 2026)" satırı silinip yerine:
  `- **Ses bitiş kuralı (Ida, 17 Eki 2026):** tablo oyun/lib/sesKurali.js. Anlamlı ses doğal sonuna (-45 dBFS) kadar çalar, hiçbir mekanizma kesmez; karar ses başlamadan: ekran penceresine (sesPencere) doğal hâliyle sığmayan ya da çalan anlamlı sesin üstüne > 50 ms binecek ses çalmaz (maç sonu sesleri sıraya girer). Dosyalar rolün en dar penceresine sığar (SINIR_MS: soru 450, doğru 430, yanlış 800, süre doldu 300, joker/skill 350…); kesik/sığmayan seçimler araclar/ses-duzelt.mjs ile düzeltilmiş kopyaya eşlenir (oyun/lib/sesDuzeltme.js, public/ses/<ad>-<sha10>.wav; ses_secimleri değişmez). Seçim değişince: ses-duzelt → npm run test:kurallar. Hazine AÇ/DEVAM anı kısa rozet (sesRozet("ac"/"devam")). Ölçüm: araclar/ses-cikis-olcum.mjs (gerçek çıkış).`
- "ANLAMLI SES KURALI (Ida, 16 Eki 2026)" paragrafı silinip: "16 Eki'nin pencere kısaltma / üst sınır / yeni ekran söndürmesi 17 Eki'de kaldırıldı (bkz. Ses bitiş kuralı)."
- "Ses işleme (15 Eki)" içindeki "soru_geldi çalarken süren doğru/yanlış 120 ms fade ile kısılır" → "17 Eki: kısılmaz; doğru/yanlış sürerken soru sesi çalmaz".
- İzleme 1116 satırına: "17 Eki: ses_kesildi doğal sona göre — kesen ekran / aski / diger; kurala göre çalınmayan ses ses_yok sayılmaz."
