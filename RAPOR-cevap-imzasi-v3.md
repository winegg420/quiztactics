# Cevap İmzası v3 — rapor (11–12 Eki 2026)

Kaynak: `docs/cevap-imzasi-v3-maket.html` (Ida onaylı maket). Araç: Claude Code (Opus 5.5).

## 1) Yıldız Patlaması v3 + Bilgi Ampulü v3 (canvas)
- `oyun/components/CevapImzasi.jsx`: `tuvalYildiz` (1150 ms) ve `tuvalAmpul` (1400 ms) maketteki `yildizV3` / `ampulV3` ve
  yardımcılarının (hap, rnd, geriYay, cikis, yildizYol, piril, CAM / TEL / telCiz) birebir taşınmışı. Renk, süre, parçacık sayısı,
  hareket, katman sırası aynı; `hiz` taşınmadı (= 1); eski işlevler ve `yananV3` taşınmadı.
- Canvas hedef şıkkın (`.qt-sik-yuva`) etrafında taşma paylı açılır: yıldız 130 px her yön, ampul üst 160 · alt 80 · yan 130 px.
  Pay ekran ve overflow'u görünür olmayan ataların kutusuyla sınırlanır (`kirpmaSiniri`) → kırpan ata yok, yatay taşma 0,
  kaydırma kabında taşma yok. Koordinatlar maketteki `kutu(R)` mantığıyla şıkka göre (`.qt-sik`'in kutusu, ölçeksiz boy). Ampul `R.w × .74`'te.
- Maketteki `calistir` aynen: kare süresi 50 ms'de kırpılır, dt 60 fps'e göre ölçeklenir; bitince canvas kendiliğinden kalkar.
- `EN_UZUN_MS` = 1400 (Ampul); güvenlik zamanlayıcısı + 400 ms pay (yavaş cihazda animasyon saatten geri kalabilir).
- Kurallar aynı: yalnız kendi ekranında, `pointer-events: none`, sonucu/sonraki soruyu geciktirmez, anahtar değişince / bileşen
  kalkınca ANINDA temizlenir, ses yok. Dükkân demosu aynı bileşeni kullanıyor. ImzaSimgesi değişmedi.
- Eski `.yildiz` / `.ampul` CSS kuralları duruyor (kullanılmıyor, not düşüldü).

### Maketle karşılaştırma (taklit veri, kare anı kesin: sayfa saati dondurulur, rAF elle ilerletilir — maket de aynı yolla)
`tasarim/cevap-imzasi-v3/yanyana-{yildiz,ampul}-{390,360}.png`: satırlar maket · Klasik (gerçek QuestionCard) · Ortak Hazine
(gerçek KasaPage, doğru şık EN ÜSTTE) · Dükkân demosu; sütunlar 0/150/400/700/1000 ms. 390×844 TR ve 360×780 EN.
Her karede ölçüldü: kırpan ata 0, şık kayması yok, yatay taşma 0, konsol hatası yok. Tek karelik ayrı görüntüler aynı klasörde.

## 2) Yanan Kart DONDURULDU (migration 1067, canlıda)
- Gerçek sahip sayımı (canlı, salt okuma): sahip 1 hesap = sahip hesabı (idaGG); **gerçek alıcı 0 → iade yok**; takılı 0 → null'a çekilen **0**.
- 1067: `kozmetikler.aktif = false, satis_pasif = true` (mevcut kapatma yolu; yeni RPC / yetki değişikliği yok) + takılı olanlar null.
  Canlı doğrulama (ROLLBACK'li tek deneme, normal oyuncu adına): `kozmetik_satin_al` → "Böyle bir kozmetik yok" (red),
  `kozmetik_tak` → red, katalogda 0 (öteki imzalar 4), sahiplik kaydı 1 (durur).
- İstemci: `CevapImzasi.jsx › DONDURULAN` (imzaOynat atlar), `lib/cevapImzasi.js › DONDURULAN_IMZALAR` (useTakiliImza null),
  Dükkân listesi de süzer (eski önbellekli katalogda bile görünmez). `tuvalYanan` kodu duruyor, başında dondurma bloğu.
- DONDURULMUŞLAR: `oyun/CLAUDE.md` tablosu + `PROJECT_CONTEXT.md › Dondurulanlar`. Kök `CLAUDE.md`'de bu tablo yok
  (kural: ürün kararı tek kaynakta, PROJECT_CONTEXT) — oraya eklenmedi.

## 3) Neon Tik ↔ normal tik
- Takılı imza Neon Tik ve imza o şıkta oynuyorsa `.qt-sik-yuva[data-ci-tik-gizli] .qt-sik-isaret { visibility: hidden }`.
  Öznitelik `useLayoutEffect` ile boyamadan önce konur (iki tik bir kare bile üst üste görünmez), soru değişince kalkar.
  Tek bileşende olduğu için Klasik / Saf Bilgi / Grup / Turnuva / Hatalarım (QuestionCard) ve Ortak Hazine (KasaPage) hepsi kapsanır;
  Düello'ya dokunulmadı. Yanlış cevaptaki "doğrusu" tikinde imza oynamadığı için o tik aynen.
- Ölçüm (390 TR, 360 EN): Klasik Neon → gizli (oynarken + sonra), imzasız → görünür, Yıldız → görünür; işaret kutusu konumu/genişliği
  aynı; Ortak Hazine'de Neon → gizli, rakip avatarı (.qt-sik-ek) konumu imzasızla AYNI.

## 4) Performans — 4× CPU, başsız Chrome (yazılım çizimi), 390 px, Klasik, 3 koşu medyanı
"akış" = imza canvas'ı ekrandayken kare aralıkları (ilk kurulum karesi hariç); "kaçan" = > 20 ms.

| durum | p50 | p95 | kaçan kare | JS çizim p95 |
|---|---|---|---|---|
| imzasız taban | 16,7 | 17,0–17,2 | %1,3–2,7 | — |
| Yıldız — maket çizimi (önce) | 16,7 | **33,4** | **%6,3** (4–5/64) | 4,1 ms |
| **Yıldız — önbellekli (sonra)** | 16,7 | **17,7** | **%4,8** (3–4/63) | 3,6–4,1 ms |
| Bilgi Ampulü (maket çizimi, değiştirilmedi) | 16,7 | 17,2–17,3 | %2,7–4,1 | 1,7 ms |

- Optimizasyon (yalnız Yıldız): yıldız gövdesi (dolgu · kontur · parlak nokta), hale ve pırıltı (ışıma · beyaz yıldızcık) 1 px boy adımlarıyla
  bir kez küçük tuvallere çizilir, kesin boya ölçeklenip basılır. Her katman ayrı resim → maketteki sıra, saydamlık ve "lighter" toplaması aynı.
- Kalan kaçan kareler 130–300 ms aralığında; sonuç anının kendi ağır karesiyle çakışıyor (tabanda da aynı anda 83 ms'lik tek kare var).
- Not: ilk "önce" ölçümü pencereyi erken kesiyordu (p95 33,5, %7); tablo aynı pencereyle yeniden ölçülmüş değerlerdir.
  Telefonda canvas GPU'da çizilir; bu ölçüm kötümser taraftır.

## Maketten bilerek ayrılanlar
- Tuval tek sahne değil, şık çevresinde (taşma payı ekran/kırpan ata ile sınırlı — maketteki sahne kırpması gibi).
- Şık kırpma yarıçapı şıkkın gerçek köşe yarıçapı (maket `min(30, h/2)`; oyunda şık zaten 30 px).
- Yıldızda önbellekli resimler (yukarıda); `hiz` yok.

## Testler
- `node araclar/cevap-imzasi-v3-ekran.mjs --adres=http://localhost:5189` — maket, klasik, hazine, dukkan, neon, yanan: **81/81 geçti**
  (son koşu klasik+hazine+dukkan 66/66). `--yalniz=kare --etiket=… --ayrinti` kare ölçümü.
- `node araclar/cevap-imzasi-v3-yanyana.mjs` — yan yana görüntüler.
- Canlı duman testi (push öncesi, yerel yeni istemci + canlı DB, tek Klasik maç, bota karşı): 20 soru dokunuldu, hepsi sunucuya ulaştı — GEÇTİ.
  Misafir test hesabı iş sonunda silindi (`arayuz-denetim.mjs --hesap-sil`). Geliştirme sunucusu ve tarayıcılar kapatıldı.
- `npm run build` temiz.
