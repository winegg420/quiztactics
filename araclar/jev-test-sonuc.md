# Jev (TypeSafe AI) deneme testi — sonuç

**Tarih:** 21 Eylül 2026 · **Araç:** Claude Code · **Model:** `jev-1.13.0`

Bu bir denemedir. Oyuna entegrasyon, veritabanına yazma, migration ve
arayüz değişikliği **yapılmadı**. Tek amaç: Jev'in bizim soru havuzumuzda
doğruluk / kategori / zorluk kontrolünde işe yarayıp yaramadığını ölçmek.

---

## 1. Kullanılan API yapısı

Resmi dokümandan (`https://docs.typesafe.ai/`) okunan yapı:

- **Uç nokta:** `POST https://api.typesafe.ai/v1/systemone`,
  `Authorization: Bearer <API_KEY>`.
- **İstek:** `{ state, model, questions }`. `state` değerlendirilecek veri
  (metin ya da JSON); `questions` anahtarlarını kendin seçtiğin tipli soru
  haritası. Jev `state`'i bir kez okur, bütün soruları ona karşı
  **paralel ve birbirinden yalıtılmış** olarak yanıtlar.
- **Üç soru tipi (primitives):**
  - `noul` — evet/hayır; 0–1 arası olasılık döner.
  - `choice` — `criteria` haritasındaki seçeneklerden biri; seçim +
    tam olasılık dağılımı + `confidence` döner. En fazla 255 seçenek.
  - `score` — sıralı `criteria` dizisindeki seviyeler üzerinden
    olasılık-ağırlıklı bir değer (seviyeler arasına da düşebilir) +
    `confidence`. En fazla 10 seviye.
- **Yanıt:** `{ model, answers, usage }`; her cevap soruyu verdiğin
  anahtarın altında.
- **Fiyat:** yalnız girdi jetonu, 42 $/Btok (0,042 $/Mtok). Çıktı ücretsiz.
- **Hata:** 401 · 422 · 429 · 529; 429/529'da üstel geri çekilmeli yeniden
  deneme öneriliyor.

**Resmi JS SDK'sı var** (`@typesafe-ai/sdk`) ama **kurulmadı**: bu depoda
yeni npm paketi kurulmaz (kök `CLAUDE.md`). Yerine dokümandaki REST biçimi
`araclar/jev.mjs` içinde Node'un kendi `fetch`'iyle çağrıldı — try-catch,
60 sn zaman aşımı, 429/5xx için üstel geri çekilmeli 3 deneme ve
`retry-after` başlığına uyum ile. Yeni bağımlılık **eklenmedi**.

## 2. Soru kaynağı ve örneklem

Kaynak: **canlı Supabase veritabanı**, `public.questions` tablosu,
`araclar/pg-mini.mjs` ile **salt okuma** (tek bir `select`; hiçbir yazma
yapılmadı). Migration SQL'lerinden ayrıştırma yapılmadı — şıkların sonradan
karıştırıldığı uyarısı tam da bu yüzden geçerli; canlı tablodaki
`secenekler` + `dogru_cevap` indeksi esas alındı, sıra değil.

- **80 normal soru:** 10 kategoriden 8'er tane, `aktif = true` ve
  `zorluk <> 1` olanlardan, sabit tohumla (20260921) rastgele.
- **20 çapa soru:** "aşırı basit" diye işaretlenen 53 sorudan rastgele.

**İki düzeltme — görevdeki varsayımlar tuttu mu:**

1. Görevde "13 kategori" deniyor; **gerçek sayı 10**. `oyun/lib/kategoriler.js`
   12 anahtar taşır ama `genel` ve `karisik` birer **oyun kipi** anahtarıdır,
   soru kategorisi değil — `questions` tablosunda hiç geçmiyorlar. Jev'e
   verilen liste fiilen kullanılan 10 kategoridir.
2. Görevde çapa sorular için `20260612000082` deniyor; o migration
   sinema sorusu ekleme partisidir. Doğru dosya
   **`20260612000265_asiri_basit_sorular.sql`** (9 Eyl 2026, 53 soru).
   Ayrıca bu sorular **bugün pasif değil**: `20260612000147_soru_zorlugu.sql`
   onları yeniden aktif edip `zorluk = 1` ile işaretlemiş. Bugünkü havuzda
   `zorluk = 1` olan tam 53 soru var ve hepsi bu listeyle birebir eşleşiyor —
   çapa kümesi bunlardan seçildi.

## 3. Jev'e sorulanlar

Her soru için **tek çağrı**, üç tipli soru birlikte. `state` yalnız
`{ soru, siklar }` — **doğru cevap ve kategori Jev'e verilmedi**, şıklar
gönderilmeden önce tohumlu olarak **karıştırıldı**.

| Anahtar | Tip | Ne sorulur |
| --- | --- | --- |
| `dogru_sik` | `choice` (4 seçenek) | Doğru cevap hangi şık? |
| `kategori` | `choice` (10 seçenek) | Soru hangi bilgi alanına girer? |
| `zorluk` | `score` (5 seviye) | Ortalama bir yetişkin için ne kadar zor? |

---

## 4. Ölçümler

### A. Doğruluk

| Küme | Soru | Doğru | Oran |
| --- | --- | --- | --- |
| Tümü | 100 | 99 | 99.0% |
| Normal (80) | 80 | 79 | 98.8% |
| Çapa (20) | 20 | 20 | 100.0% |

**Kategori bazında (bizim etiketimize göre):**

| Kategori | Soru | Doğru | Oran |
| --- | --- | --- | --- |
| bilim | 16 | 16 | 100.0% |
| cografya | 14 | 14 | 100.0% |
| edebiyat | 8 | 7 | 87.5% |
| genel_kultur | 13 | 13 | 100.0% |
| muzik | 8 | 8 | 100.0% |
| sanat | 8 | 8 | 100.0% |
| sinema | 8 | 8 | 100.0% |
| spor | 9 | 9 | 100.0% |
| tarih | 8 | 8 | 100.0% |
| teknoloji | 8 | 8 | 100.0% |

### B. Kalibrasyon

| Güven kovası | Soru | Doğru | Doğruluk |
| --- | --- | --- | --- |
| < 0,6 | 3 | 2 | 66.7% |
| 0,6 – 0,8 | 2 | 2 | 100.0% |
| 0,8 – 0,9 | 2 | 2 | 100.0% |
| > 0,9 | 93 | 93 | 100.0% |

Ortalama güven — doğrularda **0.978**, yanlışlarda **0.050** (1 yanlış).

### C. Kategori uyumu

Uyum: **89/100** (89.0%).

| Soru | Bizim | Jev | Güven |
| --- | --- | --- | --- |
| Kansızlığın tıptaki adı nedir? | genel_kultur | bilim | 0.99 |
| Osmanlı'da "Divan-ı Hümayun" ne işlevi görürdü? | genel_kultur | tarih | 1.00 |
| Osmanlı'da "şehzade" kime denirdi? | genel_kultur | tarih | 1.00 |
| Denizde yön bulmada yıldızlardan yararlanmaya ne denir? | genel_kultur | cografya | 0.56 |
| Tam bir çember kaç derecedir? | genel_kultur | bilim | 0.96 |
| Rüzgâr enerjisinde en önemli koşul nedir? | genel_kultur | bilim | 0.40 |
| Köpekbalıkları hangi hayvan grubundandır? | genel_kultur | bilim | 1.00 |
| Fields Madalyası hangi alanda verilir? | genel_kultur | bilim | 0.84 |
| Sulak alanların ekolojik önemi nedir? | cografya | bilim | 0.89 |
| Futbolda bir maç kaç dakikadır (normal süre)? | genel_kultur | spor | 1.00 |
| Işığın aynadan geri dönmesine ne denir? | genel_kultur | bilim | 1.00 |

### D. Zorluk

| Küme | 1 | 2 | 3 | 4 | 5 | Ortalama |
| --- | --- | --- | --- | --- | --- | --- |
| Normal | 7 | 37 | 28 | 8 | 0 | 2.46 |
| Çapa ("aşırı basit") | 16 | 4 | 0 | 0 | 0 | 1.25 |

Fark: **1.21** puan.

### E. Yüksek güvenli uyuşmazlıklar (güven > 0,8)

0 soruda Jev bizim cevabımıza yüksek güvenle karşı çıktı.

| Soru | Bizim cevabımız | Jev | Güven |
| --- | --- | --- | --- |

**Düşük güvenli yanlışlar (≤ 0,8):**

| Soru | Bizim cevabımız | Jev | Güven |
| --- | --- | --- | --- |
| 'Anayurt Oteli' kime aittir? | Yusuf Atılgan | Adalet Ağaoğlu | 0.05 |

### F. Maliyet ve süre

| Ölçüt | Değer |
| --- | --- |
| Model | jev-1.13.0 |
| Toplam girdi jetonu | 94555 |
| Toplam maliyet | $0.00397 |
| Ortalama çağrı süresi | 410 ms |
| Duvar saati (4 eşzamanlı) | 10.4 sn |
| Başarısız çağrı | 0 |


---

## 5. Yorum

**Doğruluk (A).** 100 sorunun 99'u doğru. Tek yanlış edebiyat
kategorisinde ve aşağıda (E) ele alınıyor. Türkçe bir sorun **değil**:
doküman "İngilizce dışındaki dillerde doğruluk eşit değil" diye uyarıyor
ama bizim havuzda çöküş yok, hiçbir kategoride %87,5'in altına inmedi.
F maddesi (dil sorunu araştırması) uygulanmadı, çünkü genel doğruluk
%60 eşiğinin çok üstünde.

**Kalibrasyon (B) — en önemlisi.** `> 0,9` kovasında **93 soruda 93 doğru
(%100)**. Kova hem büyük (soruların %93'ü) hem kusursuz. Tek yanlışın
güveni **0,05** — Jev bilmediğini biliyor: dört şıkka 0,28 / 0,28 / 0,24 /
0,20 dağıtmış, yani "hiçbir fikrim yok" demiş. Doğrularda ortalama güven
0,978, yanlışta 0,050. Bu, bir kontrolcü için istenebilecek en temiz ayrım.

**Kategori (C).** 89/100 uyum. Uyuşmayan 11 sorunun **10'u bizim
etiketimizin zayıflığı**, Jev'in hatası değil: "Osmanlı'da şehzade kime
denirdi?" bizde `genel_kultur`, Jev `tarih` diyor (güven 1,00);
"Köpekbalıkları hangi hayvan grubundandır?" bizde `genel_kultur`, Jev
`bilim` (1,00); "Futbolda bir maç kaç dakikadır?" bizde `genel_kultur`,
Jev `spor` (1,00). `genel_kultur` bizde fiilen bir **çöp kutusu kategori**
olarak kullanılmış. Gerçek tartışmalı tek örnek "Sulak alanların ekolojik
önemi nedir?" (bizde `cografya`, Jev `bilim`, 0,89) — ikisi de savunulabilir.
Düşük güvenli iki örnek (0,40 ve 0,56) zaten sınırda sorular.

**Zorluk (D).** Çapa soruların ortalaması **1,25**, normal soruların
**2,46** — 1,21 puanlık net ayrım. 20 çapa sorusunun 16'sı seviye 1, 4'ü
seviye 2; hiçbiri 3 ve üzeri değil. Beklenti (1–2) birebir tuttu. Normal
havuz ise 2'de yığılıyor (37 soru) — yani bizim "orta" dediğimiz havuz
Jev'e göre aslında kolay tarafta. Bu ayrı bir bulgu.

**Uyuşmazlıklar (E).** Yüksek güvenle (> 0,8) bizim cevabımıza karşı
çıkılan **hiç soru yok**. Tek yanlış, 'Anayurt Oteli' romanının yazarı:
bizim cevabımız **Yusuf Atılgan doğrudur** (Anayurt Oteli, 1973). Jev
Adalet Ağaoğlu demiş ama 0,05 güvenle — yani zaten "emin değilim"
etiketiyle geldi ve bir kontrolcü akışında insana yönlenirdi. Bu testte
**bizim yanlış cevaplı sorumuz çıkmadı**.

**Maliyet.** 100 soru = **0,004 $**. Bütçe koruması (1 $) hiç devreye
girmedi; havuzun tamamını (12.454 soru) taramak ~0,50 $ eder. Ortalama
çağrı 410 ms, 4 eşzamanlı işçiyle 100 soru 10,4 saniyede bitti.

---

## 6. Karar

| Kullanım | Sonuç | Gerekçe |
| --- | --- | --- |
| **Kontrolcü ("ikinci görüş")** | **EVET** | `> 0,9` kovası 93 soru ve **%100** doğru — ölçüt %95'ti. Emin olmadığında güveni yere düşüyor (tek yanlışta 0,05). |
| **Zorluk etiketleme** | **EVET** | Çapa 1,25 · normal 2,46; 1,21 puanlık belirgin ayrım, çapaların hiçbiri 3'e çıkmadı. |
| **Kategori** | **KOŞULLU EVET** | 89/100 uyum, ama uyuşmazlıkların 10/11'i **bizim** etiket hatamız. Otomatik değiştirme için değil, `genel_kultur` çöp kutusunu temizlemek için **öneri listesi** üretmeye uygun. |

**Önerilen kullanım biçimi (uygulanmadı, karar sahibinindir):**
havuzun tamamını tek seferde tarat (~0,50 $); Jev'in `> 0,9` güvenle
bizim doğru cevabımıza karşı çıktığı soruları **insan denetimine** düşür;
güveni `< 0,6` olan soruları "muğlak/kötü yazılmış" diye işaretle;
`zorluk` skorunu havuza öneri olarak yaz.

---

## 7. Dosyalar

| Dosya | Ne |
| --- | --- |
| `araclar/jev.mjs` | Jev istemcisi — tek yardımcı, ileride başka işler de kullanır |
| `araclar/jev-test.mjs` | Deneme betiği (örneklem + çağrılar) |
| `araclar/jev-test-rapor.mjs` | Ham JSON → A–F ölçümleri |
| `araclar/jev-test-ham.json` | 100 sorunun ham cevabı (olasılık dağılımlarıyla) |

Anahtar `.env` içinde `TYPESAFE_API_KEY` olarak duruyor, `VITE_` öneki
**yok** (site koduna gömülmez), `.env` git'te izlenmiyor ve anahtar
hiçbir çıktıya yazılmadı.

---

## Ek: örneklem id listesi


Normal (80):
```
056e7094-596e-4e44-956e-8275a4067373
073855cb-0849-46e4-96af-c1f9919d3940
07e02e22-8516-469b-99e3-f93cd6a2baba
090b1e74-7f48-40b5-80f7-9d5f44f13b02
09c3af7d-5395-4734-a2fd-9d2d8dd54778
0db76a59-df58-457c-8d5e-be2dd86e35ab
13921d97-f542-4a18-8bc4-694dbee746c2
15532af7-83d4-4d6b-b7d7-46aff5ceb49d
179d0757-f5af-479f-827a-e94a7e92a2a8
1864db5e-ecbb-444c-a936-063ef40a3fce
1a61e8ed-2755-448e-b161-985fa911dbbd
1e6effca-a125-4c0d-a11c-fe2781ff35d2
216f24a8-562e-4ca7-9a9e-e2247d05b046
24ae2f64-cf65-4839-8c7f-b8de751aa23b
25c86c14-bf28-4293-bf16-5a4e0f66ebc4
28a45963-f41c-4e2e-9a9b-0fd7ab405b49
29acdb46-0e7a-46f7-aab5-899cc4acbd17
2b82d393-9916-4a76-b6ef-861c1fa08201
2f2ae679-fde5-4f01-9c77-019eb1d802da
330262b5-99d2-4c55-bf17-bed606d2f1c0
360105dd-cf28-4693-8dc1-6b1c36fbde6e
373a8179-4e08-471b-911d-87993a000d30
3b27bcb8-7993-4ef3-b1b1-fd2bd94c9587
46802d7e-3c57-4a81-a2ac-76a52a6d8772
489ae20b-bb9b-47fd-b43f-7ff17161fb3a
4e8aec4b-555a-40fc-bbb3-a9025a1baff2
50c60897-b933-4f38-8ce1-6061ccc92c4e
515ae4fe-5f05-44e2-83ca-969cdb629d7d
52471386-9020-4543-8c58-9c4539fa655f
52e8ef96-f6e8-4a52-864b-6f4f47f6f868
58a968e3-4be7-4471-b8ab-c89484ffa9bd
5cb385bd-925c-4b8d-973e-6f6360de9616
5cc7a98f-4ec6-482c-a8c3-7250d341d354
6157ad65-6b13-4eb7-84c4-602e40982c5a
64750611-08b1-4e36-85ce-7bd317691979
66bfec7f-0d0d-47e1-968c-f24505d8e6c9
66cc21fb-5eb1-4577-904d-dc92a33896dd
6b8cfd1a-7b8c-470f-b23d-9221e25093a4
6bcc89d5-5d5c-47fe-9e26-c361373dc40c
6c9f1ce3-4ff0-4846-9bb5-37a7c6668223
6d87a36c-d292-4754-b443-fa764fae43f9
6eddeda7-9b98-4bb3-a6db-1bdff83da1ab
71fde9b0-07c9-4bb8-ae73-6577b5166ef8
7476011a-c0a3-444e-a141-91333560a6e4
77cd4ef2-92e0-4e77-b44b-690cc9babfb0
794e77e3-3cd1-4cb5-b912-217999362a5d
809f95b4-f693-4e17-90de-e7b93f18c9ce
828caccb-452a-4516-87c6-75e5c359759d
87cf1cb3-c3c7-41f3-889f-f53954ced7a3
891c99ce-5a5d-495f-96bc-5da3f31c1855
92e5c116-cfef-49ce-aabd-6552afa68595
96041f6e-e3bb-439c-9f31-18cbd442d32f
97e5ea63-39b0-4ed5-9c49-57ea60161a7e
a1b8ce29-c1c1-4c69-8b0b-03cbf523fa83
a37f1942-ed1e-4c70-915a-49ae66a44cee
a395e6a0-bca2-4b5b-b8d9-227884a45bf9
a9f3b3d4-7efd-4a7e-9c14-3c0c139735b3
af3f3ce7-1a86-471f-8b46-9a89236c5339
b2701d28-8adc-44b9-9096-c903349e2d96
b3f8b942-e034-46d9-a005-a73c42b2b5c3
b8278808-b09e-43fa-96ff-cffccdaae616
b97101c3-b42a-4a68-8174-68ef31452ce0
bfbecca8-3096-458b-9e2c-3ae15d9f92f4
c2a86d50-b207-422a-91dd-1f1ebe4f83e0
ca95f94d-9ebb-4aa5-95af-25b2dc71a3e3
d10c268e-9105-4e3f-be90-973774d36b07
d38e9df6-b76f-4eaa-baa9-0493bbc48cd3
d3a4325e-3f9b-4a03-8ff2-faada04e5c5a
db1df786-e9f2-4cb8-a121-9f6d311174a0
df530716-5973-486c-a1ca-ec34821135ba
e7b0f2cc-8d06-44ba-b5b0-debe12db08bb
ea296c44-9bd6-4c1d-a2ee-24b8781381c8
eb78b2b5-bcea-4b4d-8d37-1c5fd1a69def
ef46f329-17f1-43d1-bcaf-3519edeed490
f0c4d58f-897c-4275-a1f4-939645715d12
f5087292-99ec-4b05-ba46-6fa6b16943d4
f5b40b80-a674-484c-8db8-2d6b51da5f04
f5d2ec9d-f4db-48cb-9953-b0eefbcdebba
f9ab3b32-9766-440a-bd2b-b604c0bd5ffd
fad8ecd7-2a9d-458d-8a83-cb5decb6f67f
```

Çapa (20):
```
0117c539-60e1-4012-8c8f-083ec59b5d00
089be8ad-ba14-4a9b-a765-bd8c87c5068c
0905f8b0-78f1-46cc-95f2-9a54e1f56ce9
0f117374-dd67-4bdd-a131-8c2ff4ac34d2
22fbee72-6705-40b5-a026-7729ca282c62
2619aa7c-7483-4707-8a13-5e9332aa840f
39ae2c8c-b54d-4e46-8d22-05e3371cf7e4
4d5c643d-9e5b-4e51-bc7e-213eb4fc6915
6c72f4ec-7106-4c2d-90a4-af4fb937b828
7b5e9b5e-98f7-4998-8dc8-6e16857db48b
829986bb-0f4f-48ab-a62a-7ebb486017c0
8b019f2a-afc1-44cb-b1ac-686ab71d3b64
ab81d5bb-977e-463d-b478-457c17df7856
acaec160-0452-4aaa-9c55-d34c6031aa7c
b0e3f438-71b2-4b41-af85-491e46178b64
b2f5e4ef-5ac7-4bcf-bd84-7549566a6308
dd5966c0-e77b-4dfd-8cf6-95e0c8959327
ead2ce39-a123-476d-b2ba-1ca3e95ea2b1
f1e39d4e-195b-4650-9711-f6891f7aa99d
f5d35384-9f42-4cba-aaf1-ff8d5d10ac09
```
