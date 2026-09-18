# QUIZ TACTICS — PAKET 35

Beş bölüm var. **Sırayla yap**, her bölüm bitince `npm run build` çalıştır ve
kısa bir not düş. Bölümler birbirinden bağımsız; biri takılırsa diğerine geç,
takılanı rapora yaz.

**Genel kurallar:**
- Migration'lar **append-only**. Var olan migration dosyasını düzenleme, yeni numara aç.
- Mevcut kodu silme/yeniden yazma. **Sadece gereken satırı** değiştir.
- Yeni npm paketi yok. localStorage anahtarlarını yeniden adlandırma.
- Bütün RPC çağrılarında try-catch; hata kullanıcıya okunur bir cümleyle gösterilsin.
- Tasarım "Şenlik" dilinde: vurgu rengi `--bd-vurgu` (#F4701F), kart gölgesi
  `0 4px 0`, basılınca `translateY(4px)`, WCAG AA kontrast,
  `@media (prefers-reduced-motion: reduce)` içinde animasyonlar kapalı.
- **"Çalışıyor" yeterli değil.** Her yeni düğmenin dört hali (normal / basılı /
  pasif / çalışıyor) tanımlı olacak.

---

# A — EKONOMİ: JOKERLER ÜCRETSİZ DEĞİL, HERKESE 10.000 COIN

## A.0 — Karar değişti

Paket 34'te jokerler ücretsiz yapılmıştı. **Bu karardan vazgeçildi.**
Yeni karar: jokerler ve her şey **parayla** alınacak, bunun yerine
**bütün hesapların bakiyesi 10.000 coin'e eşitlenecek**. Böylece ekonomi
sistemi de gerçekten test edilmiş olacak.

Paket 34 kodunu **silme** — sadece kapat. İleride tekrar lazım olabilir.

## A.1 — Yeni migration: `20260612000252_ekonomi_testi_10000_coin.sql`

**A.1.1 — Ücretsiz modu kapat**

```sql
-- Paket 34'ün ücretsiz joker modu kapatıldı (karar değişti).
-- Fonksiyonlar duruyor; yalnız anahtar 0. Geri açmak: deger = '1'::jsonb
insert into public.oyun_ayarlari (anahtar, deger) values ('jokerler_ucretsiz', '0'::jsonb)
on conflict (anahtar) do update set deger = excluded.deger;
```

> `jokerler_ucretsiz` anahtarı **yoksa** (Paket 34 migration'ı uygulanmadıysa)
> bu satır anahtarı 0 olarak oluşturur, hiçbir şeyi bozmaz. İki durumda da çalışır.

**A.1.2 — Bütün bakiyeleri 10.000'e eşitle**

```sql
-- TEST DÖNEMİ: herkes eşit başlasın. EKLEME DEĞİL, EŞİTLEME.
-- 10.000 üstünde bakiyesi olan varsa o da 10.000'e iner (Ida'nın kararı).
update public.profiles set coin = 10000 where coalesce(coin, 0) <> 10000;
```

Bu hareketi coin defterine de yaz ki bakiye değişimi izlenebilir olsun.
`coin_hareketleri` tablosunun gerçek kolon adlarını **önce oku**, ona göre insert
yaz. Kolon yapısı beklediğinden farklıysa bu insert'i atla ve rapora yaz —
asıl iş `update`.

**A.1.3 — Yeni hesaplar da 10.000 ile başlasın**

Yeni kullanıcı profili oluşturan trigger/fonksiyonu bul
(`handle_new_user`, `profil_olustur` ya da benzeri — `grep -rn "insert into public.profiles" supabase/migrations | tail -20` ile bul).
Başlangıç coin değerini **10000** yap. Bu değeri koda gömme; bir ayar anahtarından oku:

```sql
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values (
  'baslangic_coin', '10000'::jsonb,
  'Test dönemi: yeni hesabın başlangıç coin bakiyesi. Yayından önce gerçek değere çekilecek.'
) on conflict (anahtar) do update set deger = excluded.deger;
```

Fonksiyonda `public.ayar_sayi('baslangic_coin', 10000)` kullan.

## A.2 — Arayüz: joker fiyatları her yerde görünsün

`oyun/components/JokerCubugu.jsx`:

- Paket 34'te eklenmiş `serbestMod` / `bedavaTest` kaynaklı **"ÜCRETSİZ" rozetleri
  ve ∞ işaretleri** artık görünmemeli. Kodu silmene gerek yok — anahtar 0 olduğu
  için zaten kapanacak. **Ama kontrol et:** anahtar 0 iken ekranda hiçbir
  "ücretsiz/∞" izi kalmamalı.
- **Fiyat rozeti her satılık jokerde görünsün.** Şu an fiyat yalnız
  `satinAlinabilir(tur)` true iken yazılıyor. Kural şu olsun:
  - Envanterde **varsa** → adet rozeti (mevcut hali).
  - Envanterde **yoksa** → coin ikonu + fiyat, `--bd-vurgu` renginde.
  - Coin **yetmiyorsa** → aynı fiyat rozeti ama `opacity: .5` ve düğme pasif;
    dokununca "Yetersiz coin" yazsın (satın alma penceresi açılmasın).
- Tek istisna: ücretsiz 50:50 hakkı varken `elli` jokerinde **ÜCRETSİZ** rozeti
  kalsın — o kural Paket 34'ten değil, oyunun kendi kuralı (`ucretsiz_elli_kaldi`).

`oyun/pages/JokerDukkani.jsx`: dükkânda da her jokerin fiyatı açıkça yazsın,
bakiyen yetmiyorsa düğme pasif + "Yetersiz coin" notu.

## A.3 — Joker hak kuralları (Paket 34'te bozulmuştu, kesin düzelt)

Paket 34 migration'ı (`20260612000251_jokerler_ucretsiz_sinirsiz.sql`) uygulandıysa
`joker_hak_kontrol()` içinde iki kural `jokerler_serbest()` ile atlanıyor olabilir.
Anahtar 0 olunca zaten devreye girerler **ama** kodun anahtardan bağımsız doğru
olmasını istiyoruz. Aynı migration dosyasında (`...252`) şu son halleri yaz:

- **"Aynı joker maç başına bir kez"** → `jokerler_serbest()` koşulu OLMADAN,
  her zaman geçerli.
- **Maç başına toplam hak** (`joker_mac_siniri()` / `duello_joker_hak`) →
  `jokerler_serbest()` erken `return`'ü OLMADAN, her zaman geçerli.
- **"Aynı soruda bir joker" diye bir kural YOK** ve olmayacak. Oyuncu isterse
  bütün joker haklarını tek soruda arka arkaya harcayabilir. Düelloda da,
  Klasik'te de böyle.

`duello_saldiri_jokeri()` ve `duello_savunma_jokeri()` içinde "bu soruda/turda
zaten joker kullandın" anlamına gelen bir kontrol varsa **kaldır** ve rapora yaz.

## A.4 — Test

- Coin'i 10.000 olan hesapla klasik maça gir → joker fiyatları düğmelerde görünmeli.
- Bir joker al → coin **düşmeli**, bakiye üst barda **anında** güncellenmeli.
- Aynı jokeri ikinci kez → "Bu jokeri bu maçta zaten kullandın".
- Tek soruda üç farklı joker → **üçü de çalışmalı**.
- Düelloda aynı iki kontrol.
- `PROGRESS.md`'ye "YAYIN ÖNCESİ ZORUNLU" altına ekle:
  `[ ] baslangic_coin gerçek değere çekilecek (şu an test için 10.000)`

---

# B — "HEMEN OYNA" MOD SEÇİMİ

## B.1 — Sorun

`oyun/pages/Home.jsx` satır ~528: "Hemen oyna" düğmesi doğrudan
`hemenOyna(dereceliTercih)` çağırıyor ve oyuncuyu **Klasik** moda atıyor.
Oyuncunun mod seçme şansı yok.

## B.2 — Çözüm: mevcut pencereyi kullan

`oyun/components/ModSecimPenceresi.jsx` zaten var ve **üç modu da** listeliyor
(Klasik / Düello / Saf Bilgi). Yeni pencere YAZMA, bunu kullan.

Ama pencere şu an "arkadaşa davet gönder" için yazılmış:
- `profil` prop'u zorunlu gibi duruyor (başlıkta arkadaşın adı geçiyor),
- bekleme metni "Davet gönderiliyor…".

Bunları **kırmadan** genişlet:

- Yeni opsiyonel prop: `baslik` (verilmezse mevcut "{ad} ile nasıl oynamak
  istersin?" davranışı aynen kalsın).
- Yeni opsiyonel prop: `bekleMetni` (verilmezse "Davet gönderiliyor…").
- `profil` null ise üstteki `AvatarCerceve` çizilmesin, başlık tek satır olsun.

`Home.jsx`'te:
- `modSecimAcik` adında bir state ekle.
- "Hemen oyna" düğmesi artık `hemenOyna(...)` çağırmasın, `setModSecimAcik(true)` yapsın.
- Pencere açıldığında:
  ```jsx
  <ModSecimPenceresi
    profil={null}
    baslik={tt("Nasıl oynamak istersin?")}
    bekleMetni={tt("Rakip aranıyor…")}
    onSec={async (mod) => {
      if (mod === "duello") { navigate(y("/duello")); return null; }
      await hemenOyna(dereceliTercih, mod === "saf");
      return null;
    }}
    onKapat={() => setModSecimAcik(false)}
  />
  ```
- Sayfanın alt kısmındaki mevcut mod düğmelerine (satır ~715-745) **dokunma**,
  onlar kısayol olarak kalsın.

## B.3 — Tasarım

- Pencere alttan açılsın (`bd-alttan` sınıfı, `JokerSatinAlModal` gibi) —
  ana ekranda tek elle erişilebilir olsun.
- Üç kart dikey, her biri: ikon + mod adı + tek satır açıklama + ödül satırı.
- Düello kartında mevcut "En çok ödül" rozeti kalsın.
- Kart basılı hali: `translateY(4px)`, gölge 0.
- Seçim yapılırken diğer iki kart `opacity: .45` ve pasif.
- Odak ilk karta gelsin (zaten var), Esc ile kapanabilsin (Modal zaten yapıyor).

## B.4 — Test

- Ana sayfada "Hemen oyna" → pencere açılmalı, üç mod da görünmeli.
- Klasik seç → eskisi gibi rakip aramaya başlamalı.
- Saf Bilgi seç → jokersiz maç açılmalı.
- Düello seç → düello sayfasına gitmeli.
- Vazgeç → hiçbir şey başlamamalı, ana sayfada kalmalı.

---

# C — PROFİL KARTI HER YERDE AÇILSIN

## C.1 — Sorun

`oyun/components/OyuncuKarti.jsx` var ve `LeaderboardPage.jsx` kullanıyor.
Ama `FriendsPage.jsx` satır ~272'de arkadaş satırına dokununca
`setModHedef(p)` çalışıyor — yani **mod seçim penceresi** açılıyor, profil kartı değil.

## C.2 — Yapılacak

`FriendsPage.jsx`'te arkadaş satırı:

- **Satıra dokunmak → `OyuncuKarti` açsın** (mod seçimi değil).
- Satırın sağındaki mevcut "Oyna" düğmesi **kalsın** ve doğrudan
  `setModHedef(p)` yapmaya devam etsin — kısayol olarak lazım.

## C.3 — Kartın içine üç eylem

`OyuncuKarti.jsx`'e üç opsiyonel prop daha ekle. **Verilmeyen prop'un düğmesi
çizilmesin** — mevcut `onMeydanOku` deseni aynen böyle, onu takip et:

| Prop | Düğme | Nerede verilir |
|---|---|---|
| `onMeydanOku` (mevcut) | "Meydan oku" | Lig + Arkadaşlar |
| `onOyna` | "Oyna" → mod seçim penceresi | Arkadaşlar (sadece arkadaşsa) |
| `onMesaj` | "Mesaj at" | Sadece arkadaşsa (E bölümü) |
| `onArkadasEkle` | "Arkadaş ekle" | Arkadaş DEĞİLSE (Lig, turnuva) |

Kart kendi başına "arkadaş mıyım" bilmiyor; **karar veren sayfadır**, kart sadece
verilen prop'ları çizer. Böylece mevcut kullanım yerleri bozulmaz.

Kendi kartın açılırsa hiçbir eylem düğmesi çıkmasın
(Lig sayfasında `kartOyuncu.id === user.id` kontrolü zaten var, aynı deseni uygula).

## C.4 — Tasarım

- Düğmeler kartın altında **2×2 ızgara**, eşit genişlik, aralarında 8px.
- Birincil eylem (Oyna varsa o, yoksa Meydan oku) dolu turuncu (`--bd-vurgu`);
  diğerleri `btn ikincil` (beyaz zemin, turuncu kenarlık ve yazı).
- Her düğmede ikon + metin: Oyna → `oyna`, Meydan oku → `kilic`,
  Mesaj → `mesaj` (`Ikon.jsx`'te yoksa **ekle**, mevcut ikonların çizim diliyle
  aynı: 24×24 viewBox, `stroke-width: 2`, yuvarlak uçlar), Arkadaş ekle → `arti`.
- Tek düğme varsa tam genişlik.
- Dört hal tanımlı: normal / basılı (`translateY(4px)`) / pasif (`opacity: .45`) /
  çalışıyor (metin "…", düğme kilitli).
- Kart açılışı: 180 ms `opacity 0→1` + `scale(.96)→1`. Azaltılmış harekette kapalı.

## C.5 — Test

- Arkadaş listesinde bir arkadaşa dokun → profil kartı açılmalı, içinde
  Oyna / Meydan oku / Mesaj düğmeleri olmalı.
- Lig sayfasında arkadaş olmayan birine dokun → kartta Meydan oku + Arkadaş ekle
  olmalı, Mesaj **olmamalı**.
- Kendine dokun → hiçbir eylem düğmesi olmamalı.
- Turnuva lobisinde de kart açılıyorsa orada da kontrol et.

---

# D — GÖNDERDİĞİM MEYDAN OKUMA AYNI SAYFADA GÖRÜNSÜN

## D.1 — Sorun

`FriendsPage.jsx` satır ~171-180: `meydanOku()` → `create_challenge` RPC'si
çalışıyor, sonra `navigate("/meydan")` ile **sayfadan çıkıyor**. Arkadaş
ekranında gönderdiğin meydan okumadan hiçbir iz kalmıyor.

## D.2 — Yapılacak

1. **Sayfadan çıkma.** `navigate(y("/meydan"))` satırını kaldır.
2. Bunun yerine arkadaş satırının altında **bekleyen meydan okuma şeridi** çıksın:
   - Metin: "Meydan okuma gönderildi · yanıt bekleniyor"
   - Sağında iki küçük düğme: **"Maça git"** (`/meydan`'a gider) ve
     **"Geri çek"** (mevcut geri çekme RPC'si neyse onu çağırır; arkadaşlık
     isteği geri çekme zaten var, meydan okuma için karşılığını bul).
3. Sayfa açıldığında **mevcut bekleyen meydan okumalar da okunsun** — sadece bu
   oturumda gönderilenler değil. Yani yenilenince kaybolmasın.
   Bekleyen meydan okumaları döndüren RPC'yi bul
   (`grep -rn "bekleyen\|challenge" oyun/pages/ChallengesPage.jsx | head -30`),
   aynısını `FriendsPage`'te de kullan.
4. Aynı kişiye ikinci kez meydan okunamasın: bekleyen varken "Oyna" /
   "Meydan oku" düğmeleri pasif olsun, sebebi yazsın.

## D.3 — Tasarım

- Şerit arkadaş satırının hemen altında, `--bd-vurgu` rengin %8 opaklıkta zemini,
  sol kenarında 3px turuncu çizgi, `border-radius: 10px`, `padding: 8px 10px`.
- Solunda küçük bir bekleme noktası animasyonu (üç nokta, 1.4 s döngü).
  Azaltılmış harekette noktalar sabit.
- "Geri çek" `btn kucuk tehlike`, "Maça git" `btn kucuk`.
- Şerit açılırken 200 ms yukarıdan aşağı `max-height` + `opacity` geçişi.

## D.4 — Test

- Bir arkadaşa meydan oku → sayfadan **çıkmamalı**, şerit görünmeli.
- Sayfayı yenile → şerit **hâlâ** görünmeli.
- "Geri çek" → şerit kaybolmalı, düğmeler tekrar aktif olmalı.
- Rakip kabul edince şerit ne oluyor? En azından yenilemede kaybolmalı.

---

# E — MESAJLAŞMA (YENİ ÖZELLİK)

> Bu bölüm en büyüğü. Önce A-B-C-D'yi bitir, sonra buna başla.

## E.1 — Kapsam (Ida'nın kararı, genişletme)

- İçerik: **metin + emoji**. Fotoğraf/görsel yükleme **YOK**. Hazır çıkartma seti **YOK**.
- Kimler: **sadece karşılıklı arkadaş olanlar**. Arkadaş olmayana mesaj kutusu açılmaz.
- Bire bir sohbet. Grup mesajlaşma bu pakette yok.

## E.2 — Veritabanı: `20260612000253_direkt_mesajlar.sql`

Oyunda zaten `mac_sohbet` (migration 12) ve grup sohbeti (migration 30) var.
**Önce ikisini de oku**, tablo/RLS/Realtime desenini aynen taklit et — yeni bir
desen icat etme.

Tablo:

```sql
create table if not exists public.direkt_mesajlar (
  id          uuid primary key default gen_random_uuid(),
  gonderen_id uuid not null references public.profiles(id) on delete cascade,
  alici_id    uuid not null references public.profiles(id) on delete cascade,
  metin       text not null check (length(btrim(metin)) between 1 and 500),
  okundu      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists dm_sohbet_idx
  on public.direkt_mesajlar (least(gonderen_id, alici_id), greatest(gonderen_id, alici_id), created_at desc);
create index if not exists dm_okunmamis_idx
  on public.direkt_mesajlar (alici_id, okundu) where not okundu;
```

**RLS** — açıkça yaz, varsayma:
- `select`: yalnız `gonderen_id = auth.uid() or alici_id = auth.uid()`.
- `insert`: doğrudan tabloya **kapalı**. Mesaj yalnız RPC ile yazılır.
- `update` / `delete`: doğrudan **kapalı**.

**RPC'ler** (hepsi `security definer`, `set search_path to 'public'`,
`hiz_siniri()` ile korunmalı — mevcut sohbet RPC'lerindeki oranlara bak):

1. `dm_gonder(p_alici uuid, p_metin text)` →
   - Arkadaşlık kontrolü: karşılıklı arkadaş değilse `raise exception 'Yalnız arkadaşlarına mesaj atabilirsin'`.
   - Kendine mesaj yasak.
   - Hız sınırı: 60 saniyede en fazla 20 mesaj.
   - Metin `btrim` edilip 1-500 karakter kontrolü (kısıt zaten var, hata mesajı okunur olsun).
   - Bildirim: alıcıya push/bildirim gönderen mevcut altyapı neyse ona bağla
     (`grep -rn "bildirim_olustur\|push_gonder" supabase/migrations | head` ile bul).
     Bulamazsan **bağlama** ve rapora yaz — uydurma.
2. `dm_sohbetlerim()` → arkadaş başına son mesaj + okunmamış sayısı + karşı tarafın
   profil bilgisi (ad, avatar). Sohbet listesi ekranı bunu kullanacak.
3. `dm_sohbet(p_kisi uuid, p_limit int default 50, p_once timestamptz default null)` →
   o kişiyle olan mesajlar, yeniden eskiye, sayfalı.
4. `dm_okundu(p_kisi uuid)` → o kişiden gelen okunmamışları `okundu = true` yapar.
5. `dm_okunmamis_sayim()` → toplam okunmamış sayısı (rozet için).

**Realtime**: `direkt_mesajlar` tablosunu realtime publication'a ekle
(mevcut sohbet tabloları nasıl eklenmişse aynı şekilde).

## E.3 — Arayüz

**E.3.1 — Sohbet listesi**

Yeni sayfa: `oyun/pages/MesajlarPage.jsx`, rota `/mesajlar`.
- `dm_sohbetlerim()` sonucunu listeler: avatar + ad + son mesajın ilk satırı +
  saat + okunmamış rozeti.
- Boşsa: "Henüz mesajın yok. Arkadaşlarına ilk mesajı sen at." + "Arkadaşlar"
  düğmesi.
- Satıra dokunmak sohbeti açar.

**E.3.2 — Sohbet ekranı**

Yeni bileşen: `oyun/components/SohbetKutusu.jsx`.
- Üstte: geri düğmesi + avatar + ad (ada dokunmak `OyuncuKarti` açar).
- Ortada baloncuklar: kendi mesajın sağda `--bd-vurgu` zeminde beyaz yazı,
  karşınınki solda beyaz zeminde koyu yazı. Köşe yarıçapı 16px, kendi tarafın
  alt köşesi 4px (kuyruk hissi).
- Altta: metin kutusu + emoji düğmesi + gönder düğmesi.
- Yeni mesaj Realtime ile anında düşsün; en alta otomatik kaydırsın —
  **ama** kullanıcı yukarı kaydırmışsa zorla aşağı atma, onun yerine
  "Yeni mesaj ↓" şeridi göster.
- Sohbet açıldığında `dm_okundu()` çağrılsın.
- Yukarı kaydırınca eski mesajlar yüklensin (`p_once` ile).

**E.3.3 — Emoji**

Hazır kütüphane **kullanma** (yeni npm paketi yasak). Kendi küçük seçicini yaz:
- ~60 emoji, altı kategoriye ayrılmış (yüzler, el hareketleri, kalpler, oyun,
  hayvanlar, kutlama). Emoji'ler koda gömülü düz Unicode karakter.
- Emoji düğmesine basınca metin kutusunun üstünde 6 sütunlu ızgara açılır.
- Emoji'ye dokunmak imlecin olduğu yere ekler, seçici **kapanmaz**
  (arka arkaya birkaç tane eklenebilsin).
- Dışarı dokununca ya da Esc ile kapanır.

**E.3.4 — Giriş noktaları**

- `OyuncuKarti`'ndaki "Mesaj at" düğmesi (C bölümü) sohbeti açsın.
- Alt gezinme çubuğuna **yeni sekme ekleme** — zaten altı sekme var, yedincisi
  sıkışır. Onun yerine: **Arkadaşlar** sayfasının üstüne "Mesajlar" düğmesi,
  okunmamış varsa üzerinde sayı rozeti.
- Üst bardaki bildirim zilinde de okunmamış mesaj sayısı görünsün
  (`BildirimZili.jsx` mevcut sayımı nasıl yapıyorsa ona ekle).

## E.4 — Tasarım (kabul şartı)

- Baloncuk girişi: 160 ms `translateY(6px) → 0` + `opacity 0→1`.
- Gönder düğmesi: metin boşken pasif (`opacity: .45`), doluyken `--bd-vurgu`,
  gönderilirken dönen küçük gösterge.
- Okunmamış rozeti: `--bd-vurgu` zemin, beyaz yazı, `border-radius: 999px`,
  `min-width: 18px`, ortalı, 11px kalın yazı. 99'dan fazlası "99+".
- Metin kutusu 4 satıra kadar büyüsün, sonra kendi içinde kaysın.
- Klavye açıldığında giriş alanı klavyenin üstünde kalsın
  (mobilde `env(safe-area-inset-bottom)` hesaba katılsın).
- Azaltılmış harekette bütün geçişler kapalı.
- Kontrast: turuncu baloncuk üstünde beyaz yazı AA geçmiyorsa yazıyı `#1B1B1B` yap.

## E.5 — Güvenlik

- İstemciden gelen hiçbir şeye güvenme: arkadaşlık kontrolü **sunucuda**.
- Metin ekrana basılırken HTML olarak yorumlanmasın (React zaten kaçırıyor,
  `dangerouslySetInnerHTML` **kullanma**).
- Engelleme/şikayet bu pakette yok ama tabloyu ileride genişletilebilir bırak
  (kolon ekleme, tablo yeniden yazma gerekmesin).

## E.6 — Test

- İki hesapla karşılıklı arkadaş ol, mesajlaş → iki tarafta da anında düşmeli.
- Arkadaş olmayan birine RPC'yi doğrudan çağır → **reddedilmeli**.
- Arkadaşlıktan çık → mesaj kutusu kapanmalı, eski mesajlar okunabilir kalabilir.
- 500 karakterden uzun mesaj → okunur bir hata vermeli.
- Okunmamış rozeti: mesaj gelince artmalı, sohbet açılınca sıfırlanmalı.
- Emoji seçiciden 3 emoji arka arkaya ekle → seçici kapanmamalı.

---

# RAPOR

Her bölüm için ayrı ayrı yaz:
1. Hangi dosyalara dokundun (dosya + ne yaptın).
2. Hangi migration numaralarını açtın.
3. Test sonuçları — hangilerini gerçekten çalıştırdın, hangisi kaldı.
4. Bulamadığın / uyduramadığın şeyler (özellikle A.1.2'deki coin defteri kolonları,
   A.3'teki düello kontrolleri, E.2'deki bildirim altyapısı). **Uydurma, sor.**
