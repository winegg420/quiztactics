# QUIZ TACTICS — PAKET 38: DÜELLO PARİTESİ VE MODAL DÜĞMELERİ

Paket 37'nin açık bıraktığı iki maddenin cevabı ve kalıcı bir kural.

## KALICI KURAL — BİR DAHA SORMA
**Bir moda yapılan kozmetik/arayüz düzeltmesi, aynı sorunun bulunduğu BÜTÜN modlara
aynen uygulanır. Düello da diğer modlar gibidir, ayrı tutulmaz.** Bir düzeltme
yaparken "düelloda da var mı" diye kontrol et ve varsa aynısını orada da yap.
Sormaya gerek yok.

## Değişmezler
- **SQL değişikliği YOK, migration YOK.** Bu paket tamamen arayüz.
- Mevcut kodu silme; çalışan mantığa dokunma.
- Yeni npm paketi yok.
- Tasarım dili: vurgu `--bd-vurgu` (#F4701F), kart gölgesi `0 4px 0`,
  basılınca `translateY(4px)`, WCAG AA, `prefers-reduced-motion` içinde animasyon kapalı.
- Şu an bütün hesaplarda 10.000 coin var; **geçicidir**, ekonomiyle ilgili hiçbir şeye dokunma.

---

## A — DÜELLO BİLDİRİMLERİ DİĞER MODLARLA EŞİTLENSİN

**Ölçüldü:** Sunucu tarafı hazır. `20260612000228_duello_ortak_davet.sql`
`duello_daveti` (satır 504) ve `duello_kabul` (satır 559) bildirimlerini yazıyor,
başlıkları da tanımlı (satır 410-411).

**Eksik olan tamamen istemcide.** `oyun/components/BildirimZili.jsx` bu iki türü
hiç tanımıyor — dosyada "duello" kelimesi geçmiyor. Sonuç:

| Sözlük | Bugün | Etkisi |
|---|---|---|
| `TIP_IKON` | yok | Düello bildirimi genel zil ikonuyla çıkıyor; diğer davetlerin kılıç/kişi ikonu var |
| `ONCELIK` | yok | Varsayılan 2'ye düşüyor; `mac_daveti`/`rovans`/`grup_daveti`/`hizli_daveti` 0 (en üst) |
| `TOPLAMA` | yok | Beş düello daveti gelirse beş ayrı satır; diğer davetler tek satırda toplanıyor |

**Yapılacak — mevcut desenleri birebir takip et, yeni desen icat etme:**

1. `TIP_IKON`'a ekle:
   - `duello_daveti: "kilic"` (düellonun kendi ikonu `kilic`, mod seçim penceresinde de öyle)
   - `duello_kabul: "ates"` (kabul edilmiş/başlamış anlamı; `arkadas_kabul` nasıl ayrı ikon
     alıyorsa aynı mantık)
2. `ONCELIK`'e ekle:
   - `duello_daveti: 0` — bir davettir, öteki dört davetle aynı seviyede
   - `duello_kabul: 1` — `arkadas_kabul` ile aynı seviyede
3. `TOPLAMA`'ya ekle:
   ```js
   duello_daveti: { metin: (n) => tt("{0} düello daveti", { 0: n }), yol: y("/duello") },
   ```
   `duello_kabul` **TOPLAMA'ya girmesin** — kabul bildirimi tekrar eden bir olay değil,
   `arkadas_kabul` de girmemiş; aynı mantık.
4. Yeni metinleri `oyun/lib/dil.js`'e ekle (TR + EN).

**Doğrula:** `yol` alanı sunucuda ne yazıyorsa TOPLAMA'daki `yol` onunla tutarlı olsun.
`20260612000228`'deki `v_yol` değerini oku, `/duello` değilse oradaki değeri kullan.

---

## B — MODAL İÇİNDEKİ İKİNCİL DÜĞMELER (KÖK SEBEP)

**Paket 37 E'de bulunan kök sebep:** `oyun/styles/tema.css:4482`
```css
.app .anasayfa .btn:not(.tehlike):not(.basari),
.bd-modal-katman .btn:not(.tehlike):not(.basari) { /* turuncu dolgu */ }
```
Bu kural modal içindeki **her** düğmeyi turuncuya boyuyor — `btn ikincil` olsa bile.
Paket 37'de yalnız iki pencere (`ModSecimPenceresi`, `JokerSatinAlModal`) elle
kurtarıldı; geri kalan bütün modallarda vazgeç/kapat düğmeleri hâlâ asıl eylemle
aynı görünüyor.

Ayrıca `tema.css:3236`'da aynı seçiciye ters yönde bir kural daha var
(`.bd-modal-katman .btn:not(.tehlike)` → nötr). İkisi çakışıyor, sonradan geleni
kazanıyor. **Önce ikisini oku ve hangisinin ne için yazıldığını anla** (3234'teki
yorum "iptal bir kazanım değil" diyor — asıl niyet buymuş).

**Yapılacak:**
1. `.ikincil` sınıfını bu boyamanın **dışında** tut. Yani seçiciyi
   `:not(.tehlike):not(.basari):not(.ikincil)` yap. Tek yerde çözülsün, her modalda
   tek tek düzeltme yapma.
2. `.bd-modal-katman .btn.ikincil` için açık tanım yaz: beyaz/yüzey zemin,
   `--bd-vurgu` kenarlık ve yazı — oyuncu kartındaki (`bd-oyuncu-eylemler`) desenle aynı.
   Dört hal tanımlı olsun: normal / basılı (`translateY(4px)`, gölge 0) /
   pasif (`opacity: .45`) / çalışıyor.
3. Koyu temada da ölç: zemin `--bd-yuzey-2` (Paket 37 B'de `--bd-yuzey`'in tanımsız
   olduğu görüldü, onu kullanma), yazı ve kenarlık AA geçsin.
4. Paket 37'de `ModSecimPenceresi` ve `JokerSatinAlModal`'a elle eklenmiş varsa
   **artık gereksiz kalan satırları temizle** — kural kökten çözüldüğü için iki yerde
   iki tanım kalmasın.

**Sonra bütün modalları tek tek aç ve kontrol et.** `btn ikincil` kullanan bileşenler
(ölçüldü): `DuelloTanitim` · `HesapGuvence` · `JokerSatinAlModal` · `KonumSecici` ·
`KurulumSihirbazi` · `MacHazirlik` · `MacYukleniyor` · `MeydanaDonus` ·
`ModSecimPenceresi` · `ProfilAyarlari` · `RakipAra` · `YarimMac`.

Her birinde asıl eylem turuncu, vazgeç/kapat/sonra ikincil olacak. Hangi düğmenin
asıl eylem olduğundan emin değilsen **değiştirme, rapora yaz.**

**Dikkat:** `.tehlike` (kırmızı) ve `.basari` (yeşil) düğmelere dokunma.
`.anasayfa` kısmına da dokunma — orası modal değil, ana sayfanın kendi kuralı.

---

## C — DÜELLO PARİTE TARAMASI

Yukarıdaki kalıcı kuralın gereği: Paket 35, 36 ve 37'de diğer modlara yapılan
arayüz düzeltmelerinin düelloda da uygulandığını **doğrula**. Eksik bulursan tamamla.

Kontrol listesi:
1. **Maç sonu ekranı** (Paket 36) — düello `MacSonuSahnesi` kullanıyor mu, kalpler,
   ödül hapları, günlük görev satırı (Paket 37 D.1), Detay alt boşluğu (D.2) düelloda da var mı?
2. **Joker fiyat rozetleri** (Paket 35 A.2) — düello joker çubuğunda da fiyatlar
   görünüyor mu, coin yetmeyince soluk mu?
3. **Profil kartı** (Paket 35 C) — düello sonunda rakibin adına dokununca kart açılıyor mu?
4. **Bildirim izni kartı** (Paket 36 H) — düello sonuç ekranından çıkmış mı?
5. **Mod seçim penceresi** (Paket 35 B) — düelloya giriş yollarının hepsi aynı
   pencereden mi geçiyor?

Her madde için "var / eksikti, ekledim / bu modda geçerli değil çünkü…" diye yaz.

---

## TEST

- `npm run build` her maddeden sonra temiz.
- A: Düello daveti gönder → zilde kılıç ikonuyla ve en üstte çıksın. İki düello daveti
  varsa tek satırda "2 düello daveti" yazsın, tıklayınca düello sayfasına gitsin.
- B: Sırayla aç ve bak — "Hemen oyna" mod seçimi, maç içi joker satın alma, yarım maç
  penceresi, rakip arama, konum seçici, kurulum sihirbazı, hesap güvence.
  Her birinde vazgeç beyaz, asıl eylem turuncu.
- B: Koyu temada aynı turu tekrarla.
- C: Bir düello oyna ve sonuç ekranını diğer modlarla yan yana karşılaştır.

## RAPOR

1. A: `duello_daveti` bildiriminin sunucudaki `yol` değeri neydi.
2. B: `tema.css:3236` ile `4482` çakışmasını nasıl çözdün; hangi modallarda
   asıl eylemden emin olamadın.
3. B: Paket 37'de elle eklenmiş ve artık gereksiz kalan satır var mıydı, temizledin mi.
4. C: Beş maddenin her biri için sonuç.
5. Emin olamadığın her şey. **Tahmin etme, yaz ve sor.**
