# Sözleşme — Rozet · Çerçeve · Davet · Lig kartı · Oyuncu kartı

Sahibi: Ajan A (sunucu). Kullanan: Ajan B (arayüz). Adlar ve dönüş şekilleri
**bağlayıcıdır**; değişiklik yönetici kararıyla bu belgeye yazılır.
Migration'lar: 331 (tablolar + katalog + RPC'ler), 332 (gizli rozet anahtarları), 333 (rozet motoru),
334 (lig çerçevelerinin taşınması), 335 (davet), 336 (coin paketleri), 337 (rakip arama).

Bütün RPC'ler `security definer`, yalnız `authenticated`. İstemci RPC'yi doğrudan
değil, `oyun/lib/*.js` sarmalayıcılarıyla çağırır. Sarmalayıcılar hatayı
konsola yazar ve **atar** (sessiz catch yok) — arayüz `hataMesaji(e)` ile gösterir.
Yeni oyuncu (Level 1, lig grubu yok) hâlinde RPC'ler boş/null döner, hata değil.

---

## 1. Sarmalayıcılar (`oyun/lib/`)

| Dosya | Fonksiyon | RPC |
|---|---|---|
| `rozet.js` | `rozetlerim()` | `rozetlerim()` |
| | `rozetVitriniSec(anahtarlar)` | `rozet_vitrini_sec(text[])` |
| | `rozetBildirimlerim()` | `rozet_bildirimlerim()` |
| | `ROZET_KADEMELERI` | `['bronz','gumus','altin','elmas']` |
| `cerceve.js` | `cerceveKatalogu()` | `cerceve_katalogu()` |
| | `cercevelerim()` | `cercevelerim()` |
| | `cerceveTak(anahtar, userId)` | `cerceve_tak(text)` — önbellekleri de tazeler |
| | `cerceveSatinAl(anahtar)` | `cerceve_satin_al(text)` |
| | `oyuncuKarti(id)` · `oyuncuKartlari(ids)` | `oyuncu_kartlari(uuid[])` — toplu + önbellekli |
| | `oyuncuKartiUnut(id?)` · `oyuncuKartiDinle(fn)` | önbellek |
| | `CERCEVE_NADIRLIKLERI` | `['siradan','nadir','epik','efsanevi']` |
| `davet.js` | `davetKodum()` | `davet_kodum()` |
| | `davetDurumum()` | `davet_durumum()` |
| | `davetKoduBagla(kod)` | `davet_kodu_bagla(text)` |
| | `davetBaglantisi(yol)` | istemci: `origin + y(yol)` |
| `lig.js` | `ligGrubumOzet()` | `lig_grubum_ozet()` |
| | `LIG_SIRASI`, `LIG_ADLARI` | — |

Eski yollar **çalışmaya devam eder**: `ligCerceve.js` (`oyuncu_lig_cerceveleri`,
`lig_cercevelerim`, `lig_cerceve_sec`), `arkadas_davet_kodu_ile_ekle`, `claim_referral`.

---

## 2. Tablolar

### `rozet_gruplari`
`anahtar` pk · `sira` · `ikon` (Phosphor önerisi) · `ad_tr` · `ad_en`. Herkese okunur.

### `rozet_tanimlari`
`anahtar` pk · `grup` → rozet_gruplari · `kademe` (`bronz|gumus|altin|elmas`) · `esik` ·
`olcut` (sunucu ölçütü; istemci kullanmaz) · `coin` (bronz 10 · gümüş 25 · altın 50 · elmas 100) ·
`gizli` · `sira` · `ikon` · `cerceve` (kazanınca verilen çerçeve, yalnız level_25/50/75/100) ·
`aktif` · `ad_tr` · `ad_en` · `aciklama_tr` · `aciklama_en`.
RLS: yalnız **gizli olmayan** satırlar okunur. Liste için `rozetlerim()` kullan.

### `oyuncu_rozetleri`
`user_id` · `rozet` · `kazanildi_at` · `coin` (verilen; geriye dönükte 0) · `geriye_donuk` ·
`goruldu`. pk (user_id, rozet) → aynı rozet iki kez verilmez. RLS: kendi satırların.

### `cerceveler`
`anahtar` pk · `nadirlik` (`siradan|nadir|epik|efsanevi`) · `kaynak` (`lig|level|etkinlik|dukkan`) ·
`fiyat` (yalnız dükkân) · `kosul` (`lig:gumus`, `level:25`, dükkânda null) · `aktif` · `sira` ·
`ad_tr` · `ad_en`. Herkese okunur.

### `oyuncu_cerceveleri`
`user_id` · `cerceve` · `kaynak` (`dukkan|lig_yukselme|rozet|tasima|etkinlik`) · `kazanildi_at`.
RLS: kendi satırların.

### `profiles` (yeni kolonlar)
- `takili_cerceve text` → cerceveler (null = çerçevesiz)
- `vitrin_rozetleri text[]` (en çok 3)

İkisi de `authenticated`'a SELECT açık; ama başkası için `oyuncu_kartlari` kullan.
`profilim()` kendi değerlerini zaten döndürür.

### `davetler`
`id` · `davet_eden` · `davet_edilen` (unique — bir hesap bir kez davet edilir) ·
`durum` (`bekliyor|odullendi|sinir_asildi|gecersiz`) · `gecersiz_neden` (`ayni_cihaz`) ·
`eden_coin` · `edilen_coin` · `olusturma_at` · `odul_at`. İstemciye kapalı, yalnız RPC.
- `sinir_asildi`: davet edilen Level 5'e ulaştı ama davet edenin o ayki 10 ödüllü daveti dolmuştu
  (brifteki "fazlası ödülsüz kaydedilir"). Sosyal rozetlerde **sayılır**.

---

## 3. RPC'ler — imza ve dönüş şekli

### `oyuncu_kartlari(p_idler uuid[])` → tablo
En çok 200 kimlik. Maç şeridi, lig tablosu, arkadaş listesi bunu kullanır.
Rakibin **ligi** buradan gelir (`profiles.lig` istemciye kapalı). `is_bot` hiç dönmez.
```json
[{ "id": "5b55…", "ad": "ArayuzDenetim890", "avatar": "/avatars/pro/kedi-k01.svg",
   "level": 16, "lig": "bronz", "cerceve": "lig_gumus", "cerceve_nadirlik": "nadir",
   "vitrin": [{ "anahtar": "klasik_10", "grup": "klasik", "kademe": "bronz", "ikon": "trophy" }] }]
```

### `rozetlerim()` → jsonb
```json
{
  "gruplar": [{ "anahtar": "level", "sira": 1, "ikon": "star", "ad": "Level", "ad_tr": "Level", "ad_en": "Level" }],
  "rozetler": [
    { "anahtar": "klasik_50", "grup": "klasik", "kademe": "gumus", "esik": 50, "coin": 25,
      "gizli": false, "sira": 203, "ikon": "trophy", "cerceve": null,
      "ad": "Klasik: 50 Galibiyet", "aciklama": "Klasik'te 50 maç kazan",
      "ad_tr": "…", "ad_en": "Classic: 50 Wins", "aciklama_tr": "…", "aciklama_en": "Win 50 Classic matches",
      "kazanildi": false, "kazanildi_at": null, "deger": 37, "hedef": 50 },
    { "anahtar": "gizli_3", "grup": "gizli", "kademe": "gumus", "esik": null, "coin": 25,
      "gizli": true, "sira": 1003, "ikon": null, "cerceve": null,
      "ad": null, "aciklama": null, "ad_tr": null, "ad_en": null, "aciklama_tr": null, "aciklama_en": null,
      "kazanildi": false, "kazanildi_at": null, "deger": null, "hedef": null }
  ],
  "vitrin": ["klasik_10"],
  "vitrin_max": 3,
  "ozet": { "kazanilan": 12, "toplam": 101 }
}
```
- `ad`/`aciklama` oyuncunun diline göre (`profiles.dil = 'en'` → İngilizce); iki dil de ayrıca gelir.
- `deger` eşikte kırpılır (kazanılmışsa `deger = hedef`). "37/50 galibiyet" = `deger/hedef`.
- Gizli + kazanılmamış: ad/açıklama/ikon/eşik/değer **null** → "?" silüeti. Kazanılınca her şey dolar.
- Sıralama `sira`'ya göre; gruplama `grup` ile.

### `rozet_vitrini_sec(p_rozetler text[])` → text[]
Kazanılmış en çok 3 rozet; sıra korunur, tekrarlar atılır. `[]` vitrini temizler.
Hatalar: `Vitrine en fazla 3 rozet konabilir`, `Vitrine yalnız kazandığın rozetleri koyabilirsin`.
Hız sınırı 20/dk.

### `rozet_bildirimlerim()` → tablo
Görülmemiş yeni rozetler; okununca `goruldu = true` olur (ikinci kez dönmez).
Maç sonu / ana sayfa açılışında çağrılır. Geriye dönük verilenler baştan görüldü sayılır (bildirim yağmuru olmasın).
```json
[{ "anahtar": "klasik_10", "grup": "klasik", "kademe": "bronz", "ikon": "trophy",
   "ad": "Klasik: 10 Galibiyet", "coin": 10, "cerceve": null, "kazanildi_at": "2026-09-23T18:00:00Z" }]
```
`cerceve` doluysa (level_25 …) aynı anda o çerçeve de kazanıldı.

### `cerceve_katalogu()` → tablo
```json
[{ "anahtar": "dukkan_ametist", "ad": "Ametist", "ad_tr": "Ametist", "ad_en": "Amethyst",
   "nadirlik": "epik", "kaynak": "dukkan", "fiyat": 2500, "kosul": null, "sira": 321,
   "satilik": true, "sahip": false, "takili": false },
 { "anahtar": "level_25", "ad": "Level 25 Madalyonu", "nadirlik": "nadir", "kaynak": "level",
   "fiyat": null, "kosul": "level:25", "satilik": false, "sahip": false, "takili": false, "…": "…" }]
```

### `cercevelerim()` → tablo
```json
[{ "anahtar": "lig_gumus", "ad": "Gümüş Lig", "nadirlik": "nadir", "kaynak": "lig",
   "kazanildi_at": "2026-09-14T21:00:00Z", "takili": true }]
```

### `cerceve_tak(p_anahtar text)` → `{ "takili": "dukkan_ametist" }`
`null` = çerçevesiz. Sahip değilsen `Bu çerçeve sende yok`. Hız sınırı 20/dk.
Eski `gorunum.lig_cerceve` alanı da eşlenir (lig çerçevesi takılıysa adı, değilse null).

### `cerceve_satin_al(p_anahtar text)` → `{ "anahtar", "fiyat", "bakiye", "sahip": true }`
Tek işlem, profil `FOR UPDATE`. **Takmaz** (B: satın al → tak). Hatalar:
`Böyle bir çerçeve yok` · `Bu çerçeve satılmıyor` (lig/level/etkinlik) · `Bu çerçeve zaten sende` ·
`Yetersiz coin`. Coin hareketi `tur = 'cerceve'`, `referans = anahtar`. Hız sınırı 20/dk.

### `lig_grubum_ozet()` → jsonb | null
Grup yoksa **null**. Satırlar mevcut `lig_grubum()`'un görünürlük kurallarıyla (misafir/0 maç gizli).
```json
{
  "lig": "gumus", "ust_lig": "altin", "alt_lig": "bronz",
  "grup_boyu": 25, "sira": 8, "puan": 120,
  "yukselen": 5, "dusen": 5,
  "yukselme_sirasi": 5,       // efsane'de null (üstü yok)
  "dusme_sirasi": 21,         // bu sıra ve altı düşer; bronz'da ya da grup ≤ dusen ise null
  "bolge": "guvenli",         // 'yukselme' | 'guvenli' | 'dusme' (yükselme 0 puanla olmaz)
  "ust_siraya_fark": 15,      // bir üst sıraya geçmek için puan; 1.'yse null
  "yukselme_cizgisine_fark": 40,  // yükselme bölgesindeyse 0; efsane'de null
  "hafta_bitis": "2026-09-27T21:00:00+00:00",
  "satirlar": [
    { "sira": 6, "user_id": "…", "puan": 150, "ben": false,
      "ad": "…", "avatar": "…", "level": 12, "lig": "gumus",
      "cerceve": null, "cerceve_nadirlik": null, "vitrin": [] }
  ]
}
```
`satirlar` = üstümdeki 2 + ben + altımdaki 2 (kenarda daha az). Yeşil çizgi `yukselme_sirasi`'nın
altında, kırmızı çizgi `dusme_sirasi`'nın üstünde. "Altın'a çıkmana 40 puan" = `ust_lig` + `yukselme_cizgisine_fark`.

### `davet_kodum()` → jsonb
```json
{ "kod": "J8K2M4PR", "yol": "/davet/J8K2M4PR",
  "odul_davet_eden": 300, "odul_davet_edilen": 100, "gereken_level": 5,
  "aylik_sinir": 10, "bu_ay_odullenen": 2 }
```

### `davet_durumum()` → jsonb
```json
{
  "davetlerim": [
    { "user_id": "…", "ad": "…", "avatar": "…", "level": 3, "cerceve": null,
      "durum": "bekliyor", "gereken_level": 5, "olusturma_at": "…", "odul_at": null }
  ],
  "davet_eden": { "user_id": "…", "ad": "…", "durum": "bekliyor" },   // yoksa null
  "ozet": { "toplam": 4, "bekleyen": 2, "odullenen": 1, "bu_ay_odullenen": 1, "aylik_sinir": 10 },
  "baglanabilir": false     // bu hesap hâlâ davet kodu bağlayabilir mi (yeni hesap + bağlı değil)
}
```
`durum`: `bekliyor` ("Level 3/5") · `odullendi` ("Ödül alındı") · `sinir_asildi` (Level 5 oldu, aylık sınır dolu — ödülsüz) · `gecersiz` (aynı cihaz/IP).

### `davet_kodu_bagla(p_kod text)` → jsonb (hata ATMAZ, durum döner; yalnız oturumsuzsa hata)
```json
{ "durum": "baglandi", "davet_eden_ad": "…", "coin": 100, "arkadas": true }
```
`durum`: `baglandi` · `ayni_cihaz` (bağlandı, arkadaş oldunuz ama ödülsüz) · `zaten_bagli` ·
`sure_doldu` (hesap 72 saatten eski) · `kendi_kodun` · `gecersiz_kod`. Hız sınırı 10/dk.

### Mevcut yollar (değişmedi, yeni sisteme bağlandı)
- `arkadas_davet_kodu_ile_ekle(p_kod)` — dönüş şekli aynı (`durum`, `gorunen_ad`). Yeni hesap
  (≤ 72 saat, bağlı değil) bu yolla gelirse davet de bağlanır, doğrudan arkadaş olunur (`arkadas_oldu`).
  `/davet/KOD` sayfası ve giriş sonrası `AuthContext` bu yolu kullanıyor — ek iş gerekmez.
- `claim_referral(uuid)` — eski `?davet=<uuid>` bağlantısı; artık anında 200+200 vermez, aynı
  bağlama mantığına yönlendirir.

---

## 4. Çerçeve anahtarları (B her birine görsel yazar)

| Anahtar | Ad (TR / EN) | Nadirlik | Kaynak | Fiyat | Koşul |
|---|---|---|---|---|---|
| `lig_gumus` | Gümüş Lig / Silver League | nadir | lig | — | Gümüş'e çık |
| `lig_altin` | Altın Lig / Gold League | nadir | lig | — | Altın'a çık |
| `lig_elmas` | Elmas Lig / Diamond League | epik | lig | — | Elmas'a çık |
| `lig_efsane` | Efsane Lig / Legend League | efsanevi | lig | — | Efsane'ye çık |
| `level_25` | Level 25 Madalyonu / Medallion | nadir | level | — | Level 25 rozeti |
| `level_50` | Level 50 Yıldızı / Star | epik | level | — | Level 50 rozeti |
| `level_75` | Level 75 Kanatları / Wings | epik | level | — | Level 75 rozeti |
| `level_100` | Level 100 Tacı / Crown | efsanevi | level | — | Level 100 rozeti |
| `dukkan_gece` | Gece Mavisi / Night Blue | siradan | dukkan | 400 | — |
| `dukkan_nane` | Nane / Mint | siradan | dukkan | 400 | — |
| `dukkan_mercan` | Mercan / Coral | siradan | dukkan | 400 | — |
| `dukkan_okyanus` | Okyanus / Ocean | nadir | dukkan | 1.000 | — |
| `dukkan_zumrut` | Zümrüt / Emerald | nadir | dukkan | 1.000 | — |
| `dukkan_yakut` | Yakut / Ruby | nadir | dukkan | 1.000 | — |
| `dukkan_ametist` | Ametist / Amethyst | epik | dukkan | 2.500 | — |
| `dukkan_kutup` | Kutup Işığı / Aurora | epik | dukkan | 2.500 | — |
| `dukkan_nebula` | Nebula / Nebula | epik | dukkan | 2.500 | — |
| `dukkan_anka` | Anka / Phoenix | efsanevi | dukkan | 6.000 | — |
| `dukkan_ejder` | Ejder / Dragon | efsanevi | dukkan | 6.000 | — |
| `dukkan_gunes` | Güneş Tacı / Sun Crown | efsanevi | dukkan | 6.000 | — |

Etkinlik çerçevesi: bugün **yok** (eşyalar/avatar kataloğunda çerçeve bulunmadı). `kaynak = 'etkinlik'` ileride.
Lig çerçevesi görsel tanımı briften (Gümüş kalkan, Altın defne, Elmas kristal, Efsane alev aura) —
nadirlik sütunu yalnız etiket/renk kodu içindir.

---

## 5. Rozet grupları ve anahtarlar (101 rozet)

| Grup | Sembol (Phosphor) | Anahtarlar · kademe |
|---|---|---|
| `level` | `star` | `level_5` `level_10` `level_15` (bronz) · `level_20` `level_25`★ `level_30` (gümüş) · `level_40` `level_50`★ `level_60` (altın) · `level_75`★ `level_100`★ (elmas) — ★ çerçeve de verir |
| `klasik` | `trophy` | `klasik_1` `klasik_10` (bronz) · `klasik_50` `klasik_100` (gümüş) · `klasik_250` `klasik_500` (altın) · `klasik_1000` (elmas) |
| `duello` | `sword` | `duello_1` … `duello_1000` (aynı eşik/kademe) |
| `seri` | `fire` | `seri_3` `seri_7` (bronz) · `seri_14` `seri_30` (gümüş) · `seri_60` `seri_100` (altın) · `seri_365` (elmas) |
| `ustalik` | `graduation-cap`; rozet `ikon` = `kategori:<k>` → KategoriIkon | `ustalik_<kategori>_<esik>`: 25 bronz (Çırak) · 100 gümüş (Kalfa) · 300 altın (Usta) · 750 elmas (Üstat). Kategoriler: `genel_kultur bilim tarih cografya edebiyat spor sanat sinema muzik teknoloji` (40 rozet) |
| `turnuva` | `crown` | `turnuva_katilim` `turnuva_ilk10` (bronz) · `turnuva_ilk3` (gümüş) · `turnuva_sampiyon` `turnuva_sampiyon_5` (altın) · `turnuva_sampiyon_25` (elmas) |
| `lig` | `shield-star` | `lig_cikis_gumus` (bronz) · `lig_cikis_altin` (gümüş) · `lig_cikis_elmas` (altın) · `lig_cikis_efsane` `lig_efsane_bir` (elmas) |
| `ozel` | `lightning` | `ozel_kusursuz` (gümüş) · `ozel_son_can` (bronz) · `ozel_geri_donus` (altın) · `ozel_saf_10` (bronz) · `ozel_saf_50` (gümüş) · `ozel_seri_5` (gümüş) · `ozel_seri_10` (altın) |
| `sosyal` | `users-three` | `sosyal_arkadas_1` (bronz) · `sosyal_arkadas_10` (gümüş) · `sosyal_davet_1` (bronz) · `sosyal_davet_5` (gümüş) · `sosyal_davet_20` (altın) · `sosyal_arkadas_mac_25` (gümüş) |
| `gizli` | `question` (kazanılana dek) | `gizli_1` … `gizli_5` — adları kazanılana kadar sunucudan gelmez |

Her rozetin kendi `ikon` önerisi de var (ör. `ozel_kusursuz` → `target`, `sosyal_davet_*` → `gift`);
`rozetlerim()` içinde gelir. Grup sembolü yedektir.

---

## 6. Kararlar ve gerekçeler (Ajan A)

- **Kategori ustalığı 4 kademe = Çırak 25 / Kalfa 100 / Usta 300 / Üstat 750.** Mevcut 5 eşikten
  en üstteki Efsane (2.000) rozet zincirine alınmadı: tek kategoride 2.000 doğru aylarca sürer,
  elmas kademe zaten 750'de. Profil ustalık ızgarası (`ustalik_seviyelerim`) değişmedi.
- **"3 gerideyken Düello kazanmak" → "2 can gerideyken"** (`ozel_geri_donus`). Düello 3 canla
  oynanır; 3 can geride olan oyuncunun canı bitmiştir, bu yüzden en büyük geri dönüş farkı 2'dir.
  Fark `oyun_ayarlari.rozet_geri_donus_can_farki`'nda.
- **"Son canla Düello zaferi"**: maç bittiğinde kazananın canı 1. Uzatmada (can 0/0) kazanmak
  ayrı gizli rozettir.
- **Galibiyet serisi** Klasik + Düello birlikte, bitiş sırasıyla; beraberlik/mağlubiyet keser.
- **Davet rozetleri** davet edilen Level 5'e ulaşınca sayılır (aynı cihaz = sayılmaz).
- **Rozet coin'i günlük coin tavanına takılmaz** (level ödülü gibi tek seferlik kilometre taşı).
- **5 gizli rozet** (eğlenceli, herkesin ulaşabileceği, kimseyi dışlamayan):
  1. `gizli_1` Rövanşçı (bronz) — bir rövanş maçını kazan. Kaybettikten sonra tekrar denemeyi ödüllendirir.
  2. `gizli_2` Uzatmaların Adamı (gümüş) — uzatmaya giden bir Düello'yu kazan. Nadir ama şansla herkesin başına gelebilir.
  3. `gizli_3` Kaşif (gümüş) — 8 farklı kategoride en az 10'ar doğru. Tek kategoriye gömülmeyip keşfetmeyi özendirir.
  4. `gizli_4` İlk Söz (bronz) — maçta rakibe ilk mesaj. Sosyalleşmeyi başlatır; bir mesaj yeter, spam'i ödüllendirmez.
  5. `gizli_5` Her Saatin Oyuncusu (altın) — 5 turnuva seansının her birine en az bir kez katıl. Farklı günlere yayılabilir; kimseyi gece oynamaya zorlamaz.
  Bot/gizli bot, ülke, cinsiyet, harcama ya da oyun süresine bağlı rozet **bilerek yok**.
- **Davet bağlama iki kapıdan, tek iç mantıkla:** mevcut `arkadas_davet_kodu_ile_ekle`
  kodu (arkadaş ekleme) herkes kullanır; eski hesapların birbirinin koduyla "davet" sayılıp coin
  toplaması istenmez. Bu yüzden davet yalnız **yeni hesapta** (`davet_baglama_saat` = 72) ve bir kez
  bağlanır; iki kapı da aynı iç fonksiyonu (`davet_bagla_ic`) çağırır. Kayıt ekranındaki elle alan
  için `davet_kodu_bagla` durum kodu döndürür (hata atmaz).
- Eski `claim_referral` anında iki tarafa 200 coin veriyordu; ekonomi iki kez ödemesin diye yeni
  kurala yönlendirildi. `davet_coin` (200) satırı durur, okunmaz.

---

## 7. B için notlar

- **Maç sonu dökümü:** rozet coin'i `odul_dokumu` kalemlerinde **`rozet_odulu`** adıyla gelir
  (`detay: { rozet, kademe }`; aynı maçta birden çok rozet varsa coin'ler toplanır). `OdulDokumu.jsx ›
  kalemAdi` bu kalemi tanımıyor, ham ad yazar — `case "rozet_odulu": return tt("Rozet ödülü")` gerekir.
  Eski rozet sisteminin (`badges`) `rozet` kalemi ayrıdır, değişmedi.
- **Yeni rozet bildirimi:** `rozetBildirimlerim()` maç sonunda ve ana sayfa açılışında çağrılabilir;
  okunan rozet bir daha dönmez.
- **Geriye dönük:** 333 uygulanırken 16 oyuncuya 56 rozet coin'siz, `goruldu = true` verildi.
- **Coin paketleri (336):** `coin_paketleri`'ne 5. satır `coin_16000` "Define" (16.000 + 4.800) eklendi;
  bonuslar %0/%10/%15/%20/%30. `dil.js`'te `"Define": "Hoard"` çevirisi yok — B ekler.
