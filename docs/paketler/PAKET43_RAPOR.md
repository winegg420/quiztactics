# Paket 43 — Kalan maddeler · Rapor

19 Eylül 2026. Her madde ayrı commit + `main`'e push; son dağıtım Vercel'de başarılı.
Migration yok, canlı `oyun_ayarlari`'na yazma yok (yalnız okuma), yeni paket yok.
Ölçümler Playwright + Chromium, 390×844 ve 1280×800, açık tema; iki genişlikte değerler aynı çıktı.
Görüntüler: `denetim/goruntuler/p43-*.png`.

---

## A. Kontrast — `d417fcd`

| # | Yer | Önce | Sonra | Dosya:satır |
|---|---|---|---|---|
| A.1 | Seri sayısı, 7+ gün (`isi-sicak`, 22 px kalın) | **2,31** | **6,11** | `oyun/styles/tema.css:8363` → `var(--bd-hata-2)` (#B62F2F) |
| A.1 | Seri, 0 gün (`isi-yok`) | 5,10 | 5,10 | değişmedi |
| A.1 | Seri, 1–2 gün (`isi-sonuk`) | 5,92 | 5,92 | değişmedi |
| A.1 | Seri, 3–6 gün (`isi-orta`) | 5,92 | 5,92 | değişmedi |
| A.2 | Ustalık "Çırak" (12 px) | 3,01 | **6,51** | `oyun/components/UstalikIzgarasi.jsx:117` |
| A.2 | "Kalfa" | 2,38 | **5,80** | 〃 |
| A.2 | "Usta" | 2,95 | **6,44** | 〃 |
| A.2 | "Üstat" | 2,84 | **6,33** | 〃 |
| A.2 | "Efsane" | 1,87 | **5,11** | 〃 |
| A.3 | Gizlilik metin içi bağlantı (14,5 px) | **2,68** | **5,00** | `oyun/styles/tema.css:8366` |
| A.3 | Koşullar metin içi bağlantı | **2,68** | **5,00** | 〃 |

- **A.2:** beş seviyenin hepsi eşiğin altındaydı, yalnız Çırak değil. Çubuk rengi aynı kaldı. Yazı, seviyenin kendi renginin metin rengiyle %45 karışımı. Her seviye kendi tonunda kaldı (gri, yeşil, mavi, camgöbeği, altın-kahve), hiçbiri aynı renge çevrilmedi. Görüntü: `p43-a2-ustalik-*-once/sonra`.
- **A.3, kök sebep:** `--bd-baglanti` değeri zaten doğruydu (#B3480C, beyazda 5,46). Ama Gizlilik ve Koşullar sayfaları Layout'suz rotalar, yani `.app` dışında çiziliyor. Bu yüzden `.app .bd-metin-sayfa a` kuralı hiç eşleşmiyordu. Onun yerine `src/styles.css:1561`'deki `--primary` (2,68) uygulanıyordu. Aynı kural `.app` öneki olmadan eklendi. Düğme görünümlü bağlantılar (`.btn`) ve içindekiler bağlantıları kuralın dışında tutuldu.
- **`--bd-baglanti` değişkeninin öteki kullanımları** (`tema.css:2035` `.app a`, `:2084` `.alt-yazi a` / `.bd-gizlilik-not a` / `.bd-joker-not a` / `.bd-metin-sayfa a`) ayrı ayrı ölçüldü:
  - Dükkân › Coin sekmesindeki "Gizlilik Politikası" bağlantısı: 5,46.
  - Giriş sayfasındaki yasal bağlantılar (`.giris-yasal a`, ayrı renk): 5,43.
  - Koyu temadaki değer (`koyu.css:250`) pakette kapsam dışı olduğu için dokunulmadı.

## B. Turnuva lobisindeki kılıç düğmesi — `0973957`

| Ölçüm | Önce | Sonra |
|---|---|---|
| Öğe | `<span role="button">` | `<button type="button">` |
| Boyut | 34×34 | **44×44** |
| Görünüm | turuncu zemin (`rgba(244,112,31,.12)`), turuncu ikon | zeminsiz, ince kenar, gri ikon (#5B7088); üstüne gelince ve odakta turuncu |
| Satır yüksekliği | 48 px | 48 px (korundu) |

- `oyun/pages/TournamentPage.jsx:623`, CSS `oyun/styles/tema.css:8375`.
- **Yapı değişti:** satırın kendisi zaten bir `<button>`'dı. İçine gerçek bir düğme koymak iç içe düğme olurdu (geçersiz HTML). Bu yüzden satır artık bir kapsayıcı; içinde iki kardeş düğme var: kartı açan (avatar + ad) ve meydan okuyan (kılıç). `e.stopPropagation()` korundu.
- **Satır yüksekliği nasıl korundu:** iki düğme de dikeyde −6 px kenar boşluğu taşıyor. Böylece 44 px dokunma alanı satıra 32 px yer kaplıyor.
- İkon 15 px kaldı.
- **Doğrulandı:**
  - Kılıca basınca kart açılmıyor, `create_challenge` çağrılıyor.
  - Ada basınca kart açılıyor.
  - Tab tuşuyla kılıca odaklanılıyor (`:focus-visible` halkası çıkıyor).
  - İç içe düğme uyarısı yok.
- Görüntü: `p43-b-lobi-*`.

### B.4 — `role="button"` taraması
`grep -rn 'role="button"' oyun/ src/` (dondurulmuş `oyun/avatar3d` dahil) sonucu:

| Yer | Dokunma hedefi | Karar |
|---|---|---|
| `TournamentPage.jsx` lobi kılıcı (eski :631) | 34×34 → 44×44 | **Gerçek `<button>`'a çevrildi** (yukarıda). |
| `LeaderboardPage.jsx:222` lig satırı (`div role="button"`) | satır 63 px yüksek, kart düğmesi 287×44 (390) / 517×44 (1280) | **Çevrildi.** İçinde gerçek kılıç düğmesi vardı, yani iç içe etkileşim. Lobideki yapıya geçti: satır kapsayıcı, kartı açan kısım gerçek `<button>` (`:233`), kılıç kardeş düğme. Düzen birebir aynı ölçüldü (63 px satır, puan aynı konumda). Satırın boş kenarına dokunmak da kartı açıyor. |
| `LeaderboardPage.jsx:410` podyum (`div role="button"`) | 111×186 … 212×217, `tabIndex=0`, Enter/Boşluk çalışıyor | **Çevrilmedi.** İçinde iç içe etkileşim yok, dokunma hedefi büyük, klavye davranışı zaten doğru. İçeriği blok öğeler (`div`, avatar çerçevesi); `<button>`'a çevirmek bütün podyum CSS'ini sıfırlamayı gerektirir, bu pakette kazancı yok. İstersen ayrı bir işte çeviririm. |

Başka `role="button"` yok.

## C. Turnuva maçından çıkışa onay — `2ab78e1`

- **Dosyalar:**
  - `oyun/pages/TournamentPage.jsx:53` durum değişkeni (`cikisOnay`, Düello'daki `terkOnay` kalıbı).
  - `TournamentPage.jsx:661` `MacUstSerit` + mevcut `Modal` bileşeni. Pencere, arkadaş çıkarma onayıyla aynı biçimde.
- **Pencere metni:**
  - Başlık: "Turnuvadan çıkarsan elenirsin."
  - Açıklama: "Bu turnuvaya geri dönemezsin."
  - Düğmeler: **Vazgeç** (ikincil, 4,57:1) · **Çık ve elen** (dolu kırmızı, 5,03:1).
- **Doğrulandı:**
  - **Yarışan oyuncu:** X'e basınca pencere çıkıyor.
  - **Vazgeç'e basınca:** maç ekranında kalıyor, soru sayacı akmaya devam ediyor (13 → 10; duraklatma yok).
  - **"Çık ve elen"e basınca:** ana sayfaya dönüyor.
- **Elenmiş oyuncu ve izleyici:** onay çıkmıyor, doğrudan ana sayfaya dönüyor. Kaybedecekleri bir şey yok.
- **Diğer modlar değişmedi:** Klasik, Saf Bilgi, Grup ve Çalışma'ya onay eklenmedi. Düello'nun onayı zaten vardı.
- **Not:** aktif turnuvada sunucuda ayrı bir "turnuvadan ayrıl" çağrısı yok (yalnız lobi için `leave_tournament_lobby` var). Çıkan oyuncu, sunucuda eskisi gibi cevapsız kalan soruyla eleniyor. Bu pakette sunucu tarafına dokunulmadı.
- Görüntü: `p43-c-turnuva-cikis-*`.

## D. Turnuva saatleri belgeleri — `ab2f645`

- `CLAUDE.md:337` ve `AGENTS.md:305` artık canlıyla aynı: **günde 7 seans, TSİ 10:00 · 12:30 · 15:00 · 18:00 · 20:00 · 22:00 · 24:00**.
- **Canlıda okundu (salt okuma):**
  - `turnuva_saatleri` = yukarıdaki 7 seans.
  - `turnuva_saat_sabah` = "13:00", `turnuva_saat_aksam` = "21:50". Bu ikisi duruyor ama kullanılmıyor.
    - Sunucu, migration 198'den beri onları okumuyor (dosyadaki not: "SİLİNMEZ ama artık okunmaz").
    - İstemcide `Layout.jsx:79` onları hâlâ `turnuvaSaatleriniAyarla`'ya yazıyor. Ama o değerleri kullanan yardımcıları (`turnuvaSaatMetni` vb.) `zaman.js` dışından çağıran hiçbir yer yok.
  - Bu durum belgeye not düşüldü. Veritabanından silinmedi, kod ve canlı ayar değişmedi.

## iOS kontrolü
Değişen ekranlarda, Chromium'da 390×844 boyutunda hesaplanmış stillerle kontrol edildi:
- Ekranlar: turnuva lobisi, lig, profil, gizlilik, ayrıca turnuva çıkış penceresi.
- Sonuç:
  - Sabit öğede ya da atasında transform/filter/perspective yok.
  - Yatay taşma 0.
  - Kaydırınca sekme çubuğu yerinde kalıyor.

Kılıcın basılma efekti (`translateY`) sabit olmayan bir düğmede, sorun değil.

## Dokunulmayanlar (paket gereği)
Facebook düğmesi, iletişim e-postası, masaüstü yan menü, bayrak, zil "tümünü okundu say", son 5 sn filigranı, koyu tema, Gardırop, Meydan 3B, ekonomi, İngilizce soru bankası.
