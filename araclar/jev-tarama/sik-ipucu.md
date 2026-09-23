# Şık ipucu testi (Jev) — soru metni gizli

- Tarih: 2026-09-23 · anlık görüntü: 2026-09-23T04:08:03.701Z — o an **11540** aktif soru (hepsi TR; üretim sürdüğü için sayı artabilir)
- Yöntem: Jev'e yalnız dört şık (sabit tohumla karıştırılmış) verildi, soru metni verilmedi. Soru: "Bir bilgi yarışması sorusunun şıkları bunlar; soruyu görmeden hangisi doğru cevap olabilir?" (choice, dört şık için olasılık döner).
- **Sorunlu** tanımı: Jev'in en yüksek olasılıklı seçimi doğru şık VE doğru şıkka verdiği olasılık > 0,8.
- Taranan: **11540** soru · hata: 0
- Toplam Jev maliyeti: **$0.1990** (4737080 girdi jetonu; 50 soruluk deneme dahil). Bütçe 1 $ → örnekleme gerekmedi, tüm havuz tarandı.

## Sonuç

- Sorunlu (şıklar cevabı ele veriyor, >0,8): **1310 / 11540 = 11,4%**
- Genel isabet (Jev'in en yüksek seçimi doğru): **6314 / 11540 = 54,7%** — rastgele tahmin beklentisi %25 (≈2885). Fark: 29,7 puan.
- Doğru şıkka verilen ortalama olasılık: 0,436 (rastgele 0,25)

## Güven eşiklerine göre dağılım

| eşik | doğru seçip P(doğru) > eşik | P(doğru) > eşik (seçilmese de) | YANLIŞ şıkkı güvenle seçti (güven > eşik) |
|---|---|---|---|
| > 0,5 | 4365 (37,8%) | 4365 (37,8%) | 858 (7,4%) |
| > 0,6 | 3273 (28,4%) | 3273 (28,4%) | 446 (3,9%) |
| > 0,7 | 2313 (20,0%) | 2313 (20,0%) | 180 (1,6%) |
| > 0,8 | 1310 (11,4%) | 1310 (11,4%) | 57 (0,5%) |
| > 0,9 | 564 (4,9%) | 564 (4,9%) | 8 (0,1%) |

## Kategori bazında

| kategori | taranan | isabet | sorunlu | oran |
|---|---|---|---|---|
| teknoloji | 1132 | 754 (66,6%) | 240 | 21,2% |
| bilim | 1073 | 617 (57,5%) | 161 | 15,0% |
| cografya | 1707 | 960 (56,2%) | 231 | 13,5% |
| sanat | 1133 | 643 (56,8%) | 123 | 10,9% |
| genel_kultur | 898 | 442 (49,2%) | 95 | 10,6% |
| spor | 1032 | 522 (50,6%) | 96 | 9,3% |
| sinema | 1169 | 636 (54,4%) | 105 | 9,0% |
| muzik | 1142 | 566 (49,6%) | 93 | 8,1% |
| tarih | 1122 | 576 (51,3%) | 90 | 8,0% |
| edebiyat | 1132 | 598 (52,8%) | 76 | 6,7% |

## Zorluk bazında (DB `zorluk` kolonu)

| zorluk | taranan | isabet | sorunlu | oran |
|---|---|---|---|---|
| 1 | 974 | 554 (56,9%) | 141 | 14,5% |
| 2 | 1999 | 1182 (59,1%) | 279 | 14,0% |
| 3 | 4236 | 2326 (54,9%) | 485 | 11,4% |
| 4 | 2678 | 1399 (52,2%) | 245 | 9,1% |
| 5 | 1653 | 853 (51,6%) | 160 | 9,7% |

## Gözlenen ipucu kalıpları (sezgisel, otomatik ölçüm)

Her kalıp doğru şık için ölçüldü (ör. "en_uzun" = doğru şık tek başına en uzun şık). "celdiricilerde_mutlak_ifade" = en az iki yanlış şıkta "yalnız/sadece/hep/hiç/asla/ikisinin aynı" gibi mutlak ifade var, doğru şıkta yok. "digerleri_ortak_kalipli" = üç yanlış şık birbirleriyle kelime paylaşıyor, doğru şık hiçbiriyle paylaşmıyor (tek farklı tür). Sorunlu sorularda sıklık, sorunsuzlarla kıyaslanır; son sütun kalıbı taşıyan soruların ne kadarının sorunlu olduğudur.

| kalıp | sorunlu sorularda | diğer sorularda | kalıp varsa sorunlu olma oranı |
|---|---|---|---|
| en_uzun | 994 (75,9%) | 4785 (46,8%) | 17,2% |
| en_kisa | 46 (3,5%) | 834 (8,2%) | 5,2% |
| tek_sayisal | 1 (0,1%) | 5 (0,0%) | 16,7% |
| tek_sayisal_olmayan | 2 (0,2%) | 3 (0,0%) | 40,0% |
| tek_farkli_kelime_sayisi | 861 (65,7%) | 3343 (32,7%) | 20,5% |
| soru_kokunu_tekrarlayan | 77 (5,9%) | 404 (3,9%) | 16,0% |
| tek_farkli_buyuk_harf | 3 (0,2%) | 15 (0,1%) | 16,7% |
| digerleri_ortak_kalipli | 128 (9,8%) | 161 (1,6%) | 44,3% |
| celdiricilerde_mutlak_ifade | 124 (9,5%) | 69 (0,7%) | 64,2% |

## En belirgin 30 örnek (doğru şıkka verilen olasılığa göre)

| id | kategori | soru (kısa) | şıklar (doğru **kalın**) | P(doğru) |
|---|---|---|---|---|
| 114ced14-abf2-4e33-af5c-6331408da9d5 | tarih | 'Bellek mekanı' neyi ifade eder? | **Toplumsal hatırlamayı taşıyan yer** · Yalnızca müze yapılarını · Yalnızca arşiv birimlerini · Yalnızca okul binalarını | 1.00 |
| 140d9248-b870-4b84-9559-dc046ea76348 | bilim | 'Verim' bir makinede neyi ölçer? | Makinenin ağırlığını · Makinenin dış boyutunu · **Yararlı enerjinin oranını** · Toplam çalışma süresini | 1.00 |
| 1eb8153d-ac24-44a9-b6a8-4879e592e9eb | muzik | Müzikte 'kontrast' neyle sağlanır? | **Hız, gürlük ve doku değişimiyle** · Yalnız nota sayısıyla · Yalnız süre ile · Yalnız çalgı sayısıyla | 1.00 |
| 26bdc79e-1a92-4c3f-a178-8baee4a1cc11 | teknoloji | Modem ile router arasındaki fark nedir? | **Modemin internet sinyalini dönüştürmesi** · Router'ın kablo olması · Modemin yazıcı olması · İkisinin aynı olması | 1.00 |
| 2afe9668-442e-42ea-9c5f-e57f62f92945 | teknoloji | HTTP ile HTTPS arasındaki fark nedir? | **HTTPS'in şifreli olması** · HTTP'nin daha güvenli olması · HTTPS'in daha yavaş olması · İkisinin aynı olması | 1.00 |
| 2c33d618-49de-4e78-b6ee-bd8e536fbb08 | sanat | Bauhaus neyi savunmuştur? | Yalnız heykeli · **Sanat ile tasarım-üretim birliğini** · Yalnız müziği · Yalnız resmi | 1.00 |
| 2f11ed5c-ab52-4ac2-92d4-d9476f557af5 | bilim | 'Tür' biyolojide nasıl tanımlanır? | Aynı bölgede yaşayanlar · Aynı renkte olanlar · **Verimli döl verebilen bireyler** · Aynı boyda olanlar | 1.00 |
| 2f28a0a9-6742-4674-b2d6-4458be5adaa5 | bilim | Gök gürültüsünü şimşekten sonra duymamızın sebebi nedir? | Bulutlar sesi tutar · Işık sesten yavaştır · **Ses ışıktan yavaştır** · Kulağımız geç algılar | 1.00 |
| 305f1884-2cf8-4efc-826a-0d25c1ba5af5 | spor | Sporda 'engelli erişimi' tesislerde neyi gerektirir? | Yalnız otopark · Yalnız bilet indirimi · Yalnız tabela · **Rampa ve uygun donanımı** | 1.00 |
| 33523ec8-6312-47c8-bbf5-fc91734bf934 | teknoloji | 'Nesnelerin İnterneti' neyi tanımlar? | **Cihazların ağa bağlanmasını** · Yalnız telefonları · Yalnız bilgisayarları · Yalnız sunucuları | 1.00 |
| 493a9ed9-9852-4753-b686-df1be40487db | teknoloji | Derleme ile yorumlama arasındaki performans farkı nedir? | Yorumlananın hep hızlı olması · Farkın olmaması · Derlemenin hep yavaş olması · **Derlenmiş kodun daha hızlı çalışması** | 1.00 |
| 4a88beb3-3513-4901-aa50-3417c68d26ab | cografya | Akarsu havzası kavramı neyi kapsar? | Yalnız yatağını · Yalnız ağzını · **Bir akarsuyu besleyen tüm alanı** · Yalnız kaynağını | 1.00 |
| 4a9129dc-de72-405f-8f92-19bf1e5d82ec | spor | 'Antrenman periyotlaması' ne sağlar? | Rastgele çalışmayı · **Planlı yük ve dinlenme dengesi** · Sadece dinlenmeyi · Sadece yükü | 1.00 |
| 4aec1015-ce4f-4b5a-9690-ba2f7ae7fddc | teknoloji | Sanal gerçeklik (VR) ile AR arasındaki fark nedir? | **VR'ın tümüyle sanal ortam sunması** · AR'ın tümüyle sanal olması · İkisinin aynı olması · VR'ın ses olması | 1.00 |
| 4dcae754-c355-4269-a6a9-09fdbd46679d | cografya | İklim ile hava durumu arasındaki fark nedir? | Havanın uzun süreli olması · **İklimin uzun süreli ortalama olması** · İkisinin aynı olması · İklimin günlük olması | 1.00 |
| 58dcbc2f-b5d2-4d90-8122-09bcc2fbbd7e | cografya | Kırık (fay) hatlarının depremle ilişkisi nedir? | Faylar depremi engeller · İlgisizdirler · Faylar yalnız volkan yapar · **Depremler genelde faylarda olur** | 1.00 |
| 5d05879f-1bfa-41fe-95cc-fcff9e11a025 | teknoloji | 'Otonom sürüş' hangi verileri birleştirir? | Yalnız kamerayı · Yalnız haritayı · Yalnız radarı · **Çoklu sensör verisini** | 1.00 |
| 65af8dd7-4c73-4f69-81b3-374e09d04941 | bilim | Doğal seçilim neye dayanır? | Rastgele üremeye · Boyut büyüklüğüne · **Uyum sağlayanın daha çok üremesine** · Yaşa | 1.00 |
| 66f0faec-30dd-4904-a8fe-f212127ece61 | muzik | Operet ile opera farkı nedir? | Operet daha uzundur · **Operette konuşmalı bölümler ve hafif kon** · Opera dansızdır · Fark yoktur | 1.00 |
| 6c7c31c5-93ad-4cbc-bdf5-980cb9090122 | cografya | Bir kentin 'trafik yoğunluğu' neyle azaltılabilir? | Yol genişletmeyle yalnızca · **Toplu taşıma ve yaya önceliğiyle** · Otopark azaltmayla · Hız artırmayla | 1.00 |
| 72942e10-1f47-4186-ba8a-9c220763f230 | teknoloji | Yazılım güvenliğinde "en az yetki" ilkesi nedir? | Yetki vermemek · Rastgele yetki · **Gerekli olan en düşük yetkiyi vermek** · Herkese tam yetki | 1.00 |
| 75fb4ac6-a00f-4b42-8b4e-f4d88d74d7af | cografya | Sürdürülebilir kalkınma ne demektir? | **Gelecek kuşakları gözeten kalkınma** · Sınırsız üretim · Doğayı yok sayma · Hızlı tüketim | 1.00 |
| 7dc17d36-94da-44d8-9742-7924dbf74490 | sanat | 'Sanat eğitimi müfredatı' neyi hedefler? | **Yaratıcı ve eleştirel gelişimi** · Yalnız tekniği · Yalnız tarihi · Yalnız satışı | 1.00 |
| 7e971ae9-98db-4cff-a51d-fec4352e088a | bilim | Bir maddenin yoğunluğu neyle hesaplanır? | Hacim bölü kütle · **Kütle bölü hacim** · Kütle çarpı hacim · Kütle artı hacim | 1.00 |
| 83af0fc4-b715-45e8-848b-ba974ee85f87 | sanat | Seramik ile porselen arasındaki fark nedir? | **Porselenin daha ince ve saydam olması** · Seramiğin saydam olması · İkisinin aynı olması · Porselenin pişmemesi | 1.00 |
| 87157843-e246-498a-b88c-072714b96a6f | cografya | Tınlı toprak neden tarımda tercih edilir? | Tamamen kumlu olması · Tamamen killi olması · Taşlı olması · **Su tutma ve havalanma dengesi** | 1.00 |
| 9058e291-e22f-4e1a-a3c0-f1425c0b935b | bilim | Yarı ömür kavramı neyi ifade eder? | Tam bozunma süresi · Isınma süresi · Erime süresi · **Radyoaktif maddenin yarıya inme süresi** | 1.00 |
| 9c936245-c809-4172-afd3-3a311f41b07b | bilim | Mutlak sıfır kaç santigrat derecedir? | **-273** · -300 · -200 · -100 | 1.00 |
| a27fa4f9-d0d7-4b54-8014-21dbe8fd61ff | sinema | 'Manga' ile 'anime' arasındaki fark nedir? | İkisi aynıdır · Manga animasyondur · **Manga basılı çizgi romandır** · Anime basılıdır | 1.00 |
| b67fcfa3-1788-4304-8a71-1fd7ccf51fb1 | cografya | Uzay hukuku hangi ilkeyi benimser? | Uzayın paylaşılması · **Uzayın tüm insanlığın ortak alanı olması** · Uzayın satılması · Uzayın kapatılması | 1.00 |

## Dosyalar

- `araclar/jev-tarama/sik-ipucu.csv` — soru başına satır (sorunlu=1 olanlar filtrelenebilir; guven = doğru şıkka verilen olasılık).
- Tarama betiği repo dışında (scratchpad); DB'ye yalnız SELECT atıldı, hiçbir soru değiştirilmedi.
