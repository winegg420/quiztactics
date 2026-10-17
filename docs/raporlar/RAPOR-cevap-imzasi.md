# RAPOR — Cevap İmzası (10 Eki 2026, migration 1040)

## Özet
Dükkân'a yeni kozmetik ailesi "Cevap İmzası" eklendi: 5 ürün, mevcut kozmetik altyapısıyla (ikinci sistem yok). Migration canlıda, satış
kapısı **kapalı** (`cevap_imzasi_satis_acik = false`) → Dükkân › Efekt yalnız sahip hesapta görünür; sahip satın almadan takıp maçta deneyebilir.
Ida onaylayınca: `update oyun_ayarlari set deger='true' where anahtar='cevap_imzasi_satis_acik';`

Commit'ler (main, push edildi, Vercel "success", canlı paket doğrulandı):
`78a562c0` DB · `6e517d48` bileşen + maç ekranları · `70f0a876` Dükkân + Koleksiyon · `2aea1274` ekran testi + kareler · `5853663c` belgeler.

## Veritabanı (1040 — `supabase/migrations/20260612001040_cevap_imzasi.sql`)
**Eklenen satırlar**
- `kozmetikler` (tür `cevap_imzasi`, `onay='girsin'`, `aktif`):
  | anahtar | ad | nadirlik / dukkan_nadirlik | icerik.para | sira |
  |---|---|---|---|---|
  | imza_neon_tik | Neon Tik | nadir | coin | 701 |
  | imza_yildiz | Yıldız Patlaması | nadir | coin | 702 |
  | imza_ampul | Bilgi Ampulü | epik | elmas | 703 |
  | imza_elektrik | Elektrik Akımı | epik | elmas | 704 |
  | imza_yanan_kart | Yanan Kart | efsanevi | elmas | 705 |
- `oyun_ayarlari`: `cevap_imzasi_satis_acik` false · `coin_cevap_imzasi_nadir` 750 · `elmas_cevap_imzasi_epik` 150 · `elmas_cevap_imzasi_efsanevi` 300 (TEST).
- Şema: `kozmetikler_tur_check` += `cevap_imzasi`; `profiles.takili_cevap_imzasi text` (authenticated/anon'a kolon izni **verilmedi**).

**Değişen fonksiyonlar** (hepsi CREATE OR REPLACE, imza ve yetkiler aynı — GRANT/RLS değişikliği yok):
- `kozmetik_fiyati(tur, fiyat, dukkan_nadirlik)` — cevap_imzasi: Nadir → `coin_cevap_imzasi_nadir`, öteki → `elmas_cevap_imzasi_<nadirlik>`.
- `kozmetik_satista(anahtar)` — cevap_imzasi ayrıca `cevap_imzasi_satis_acik` ister.
- `kozmetik_satin_al(anahtar)` — coin dalı (icerik.para = coin): FOR UPDATE, `coin_harca` ('Yetersiz coin'), çift alım reddi; elmas akışı aynen.
- `kozmetik_tak(tur, anahtar)` — yeni yuva; sahip test modu aynen.
- `kozmetik_katalogu()` — takılı imza işaretlenir.

Geri alma: `docs/cevap-imzasi-1040-geri-al.sql` (canlıdan alınmış eski tanımlarla).

**SQL testi** `araclar/cevap-imzasi-sql-testi.mjs` — 47/47 (ROLLBACK; uygulama öncesi prova + canlıda `--canli`):
fiyat ayardan (ayar değişince değişir), öteki türlerin fiyatı aynı · satış kapalıyken normal oyuncu katalogda görmez / alamaz / takamaz ·
coin ile Nadir alım (yetersiz coin, coin_hareketleri −750, çift alım reddi) · elmas ile Epik/Efsanevi (yetersiz elmas, coin'e dokunulmaz) ·
tak / değiştir / çıkar, sahip olunmayan ve yanlış tür reddi · `profilim()` takılıyı yalnız sahibine döndürür · kolon authenticated'a kapalı ·
`oyuncu_kartlari` imza içermez · satış kapanınca sahip olunanlar kalır · Koleksiyon Puanı nadirliğe göre (nadir+epik+efsanevi = 18), tetikleyici yazar · yetkiler aynı.

## İstemci
- `oyun/components/CevapImzasi.jsx` + `oyun/tasarim/ekranlar/cevap-imzasi.css` — maketin birebiri; tek ortak bileşen. `pointer-events: none`,
  `anahtar` değişince / bileşen kalkınca katman + canvas anında kalkar (rAF durur). Yeni ses yok, hareketi azalt sürümü yok.
- `oyun/lib/cevapImzasi.js › useTakiliImza` — yalnız kendi `profilim()`'den; tak/çıkar anında yerel güncellenir.
- Maç ekranları: `QuestionCard` (Klasik/Saf Bilgi/Grup/Turnuva/Hatalarım), `KasaPage` (sonuçta benim cevabım doğruysa; Savunma dahil, izlerken oynamaz),
  `Duello4Arena` (sonuç fazında şıklar ekranda olmadığı için "Sen · Doğru" satırında; nötr/saldırı/Son Düello).
- Dükkân › Efekt (`DukkanCevapImzasi.jsx`), Koleksiyon grubu (`KOZMETIK_SEKMELERI` + kilitli "Dükkân'da · fiyat"), EN çeviriler.
- Kural şeridi "Jokerler · Nadir avatar ve imzalar — coin / Öteki kozmetikler — elmas"; dar ekranda tek satıra sığmadığı için ikinci satıra iner.

### Maketten sapmalar / yorumlar (görünümü değiştirmeden)
1. `--neon`, `--altin` ve ampul konturu `K` referans dosyada tanımlı değildi → neon #3dff9e (ışıması maketteki #00c86a), altın = `--qt-coin` #ffc933,
   kontur = `--qt-metin` #1d2152. Tek yer: `.ci-katman` / `K` sabiti. **Ida'nın maketindeki değerler farklıysa bu üç değer değişmeli.**
2. Canvas kırpma yarıçapı maketteki sabit 9 px yerine hedef şıkkın gerçek köşe yarıçapı (kor/kömür şıkkın dışına taşmasın).
3. Düello v4'te sonuç satırı "damga" girişiyle beliriyor; imza o sırada başlayınca ilk yarısı görünmüyordu → hedef/atalarındaki sonlu giriş
   animasyonu bitince (en çok 0,8 sn) başlar. Sonuç/sonraki soru gecikmez.
4. Yanan Kart performansı (aşağıda): hücreler ImageData + tek drawImage, kül tek setTransform + globalAlpha (piksel olarak aynı), ızgara adımı 2 → 3 px.
5. Konfeti: imza takılıyken de gösteriliyor — Konfeti kartın üst kısmında, imza şıkta; üst üste binmiyor (`tasarim/cevap-imzasi/klasik-tam-konfeti-*.png`).

## Ekran görüntüleri — `tasarim/cevap-imzasi/` (130 PNG + `olcum.json`)
- `{dukkan|klasik|hazine|duello}-{neon|yildiz|ampul|elektrik|yanan}-{360|390}-{bas|orta|son}.png` — 120 kare. Kare anları kesin: imza DOM'a girince sayfa
  saati dondurulur (CSS animasyonları duraklatılır, canvas'ta rAF + performance.now denetlenir). Anlar (ms): neon 90/380/720 · yıldız 90/380/700 ·
  ampul 120/450/820 · elektrik 100/450/900 · yanan 150/620/1150.
- `dukkan-liste-*.png`, `dukkan-demo-acik-*.png`, `dukkan-onay-coin-*.png`, `koleksiyon-*.png`, `rakip-{hazine|duello}-B.png`, `klasik-tam-konfeti-*.png`.

## Ekran testi — `araclar/cevap-imzasi-ekran.mjs` (taklit veri, sunucuya yazmaz)
155/155 (kare süresi hariç): Dükkân (sekme, 5 kart, kural şeridi, her imza demo + Tekrar oynat + kapatınca temizlik, coin onay penceresi 10.000 → 9.250,
konsol temiz) · Koleksiyon (grup, takılı işaretli, 3 kilitli "Dükkân'da · fiyat", Nadir coin / Epik-Efsanevi elmas, /joker?sekme=efekt) ·
Klasik (gerçek QuestionCard, `araclar/cevap-imzasi-sahne/`; hedef = doğru şık; yanlışta ve imzasızken hiçbir şey) · Hazine + Düello v4 (gerçek sayfalar) ·
**Rakip:** iki istemci — A imzalı + doğru imzayı görür; B (rakip) ekranında imza YOK, B'nin ağ yanıtlarında A'nın imzası YOK; imzası takılı ama yanlış
cevaplayan, rakibinin doğru satırında imza görmez · imza sürerken alttaki düğme tıklanabilir · soru kalkınca canvas anında kalkar.
360 ve 390 px'te yatay taşma yok; Dükkân'da 44 px altı dokunma hedefi yok. `node araclar/arayuz-denetim.mjs` → TEMİZ. `npm run build` temiz.

## Kare süresi (4× CPU yavaşlatma, başsız Chrome — yazılım canvas çizimi, 390 px, Klasik, 3 koşu)
"akış" = imza canvas'ı ekrandayken, kurulum karesi hariç kare aralıkları. "çizim" = karedeki rAF işlerinin JS süresi.

| durum | p50 | p95 | kaçan kare (>20 ms) | JS çizim p95 |
|---|---|---|---|---|
| imzasız taban (aynı tıklama, konfeti+ses) | 16,7 | 17,3–33,5 | 3–4 / ~66 (%5–6) | — |
| Yanan Kart — maket hâli (fillRect, A=2) | 33,3 | **100** | — | ~23 |
| Yanan Kart — ImageData (A=2) | 16,7 | 50 | — | 15,3 |
| Yanan Kart — + kül setTransform (A=2) | 16,7 | 33,4–34,1 | 8–14 / ~55 (%15–25) | 10,5–14,1 |
| **Yanan Kart — son (A=3)** | 16,7 | **33,4** | 4–8 / ~61 (%7–13) | **10,5** |
| **Elektrik Akımı** | 16,7 | **16,9–33,4** | 1–3 / ~44 (%2–7) | **1,6** |

Sonuç: hedef "p95 < 33 ms" **sınırda** — Elektrik tabanla aynı (iki koşuda geçti, birinde 33,4); Yanan Kart p95 33,4 (kaçan kare tabanın biraz üstü).
Kalan maliyet Yanan Kart'ta alev parçacıklarının radyal gradyanları (her alev kendi gradyanı, "lighter" karışım) ve yazılım raster'ı; görünümü
değiştirmeden daha fazla düşürmek için sonraki adım alev sprite önbelleği olur (yapılmadı). Telefonlarda canvas GPU'da çizilir; gerçek telefonda bakılması iyi olur.
Izgara adımını maketle aynı yapmak için `CevapImzasi.jsx › IZGARA_ADIMI = 2` (tek satır).

## Yapılamayanlar / açık
- Satış açılmadı (Ida onayı bekleniyor); README'de "satışa açılması onay bekliyor".
- Kare süresi hedefi tam karşılanmadı (yukarıda, sınırda).
- WebKit/iOS bu makinede çalışmıyor; iOS kontrolü sahibinin telefonunda.
- Maketin `--neon / --altin / K` değerleri elde değildi (yukarıda madde 1).
- Test: misafir test hesabı (ArayuzDenetim200) açıldı, iş sonunda `test-hesap-temizle --uygula` ile silindi. Satın al / +SP / Sıfırla'ya basılmadı;
  canlıdaki satın alma yalnız ROLLBACK'li SQL testinde denendi.
