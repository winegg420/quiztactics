# Paket 41 — Eksikler · Rapor

19 Eyl 2026. On üç madde (A–M) uygulandı. Her adım ayrı commit, `main`'e push edildi (41202c8 → rapor commit'i).

- **Veritabanı:** SQL değişikliği ve migration yok. Canlı veritabanından yalnız okuma yapıldı: görev adları ve bildirim metinleri (L).
- **Auth ayarı:** Supabase'in herkese açık auth ayar ucundan Facebook sağlayıcı durumu okundu (K.3).
- **Test yöntemi:**
  - Her adımdan sonra `npm run build` temiz.
  - Vite dev + Playwright Chromium, Supabase yanıtları sahte (canlıya yazılmadı).
  - Kanıt görüntüleri: `denetim/goruntuler/p41-*.png`.
- **Gerileme taraması:** 12 ana ekranda sayfa hatası yok, yatay taşma 0.

---

## A — Ortak hata / yükleme / boş durum sistemi
**Yeni bileşen:** `oyun/components/DurumKutusu.jsx`
- Üç durum:
  - `yukleniyor`: iskelet, sahte veri çizilmez.
  - `hata`: maskot + "Yüklenemedi." + birincil **Tekrar dene**.
  - `bos`: sayfanın mevcut boş durumu.
- `useZamanAsimi(aktif, 12 sn)` kancası: veri hiç gelmezse sonsuz beklemeyi hata durumuna çevirir.
- Ham sunucu metni oyuncuya gösterilmez; `console.error`'a yazılır.
- `src/context/AuthContext.jsx`: `profilHata` bayrağı eklendi (profil okunamadıysa true).
- İskelet CSS'i: `tema.css` › "PAKET 41 A". `prefers-reduced-motion`'da animasyon yok.

**12 yer:**

| Ekran | Değişiklik | Dosya |
|---|---|---|
| Ana sayfa (hata + yükleniyor) | Profil yokken sahte "Oyuncu · 0 PUAN · Çaylak" yerine iskelet; hata/zaman aşımında Tekrar dene | `Home.jsx` (erken dönüş) |
| Profil | Sonsuz "Yükleniyor…" kırıldı: hata ya da 12 sn → hata durumu | `ProfilePage.jsx:~87` |
| Profil kartı | "0 maç · 0 kupa" yerine hata + Tekrar dene, yüklenirken iskelet | `OyuncuKarti.jsx` |
| Meydan | Arkadaş listesi ayrı durumda (hata ≠ "0 arkadaş"); maç listesi hatası ayrı kart | `ChallengesPage.jsx` |
| Arkadaşlar | Ham metin + "Henüz arkadaşın yok" yerine hata + Tekrar dene | `FriendsPage.jsx` |
| Lig | Ham metin + "henüz kimse yarışmıyor" yerine hata + Tekrar dene; yükleniyor iskelet | `LeaderboardPage.jsx` |
| Çalışma | "Henüz yanlışın yok" yerine "bankan alınamadı; pratik turu yine açılabilir" + Tekrar dene | `CalismaPage.jsx` |
| Dükkân | Jokerler "0" yerine hata + Tekrar dene (Joker/Coin sekmeleri) | `JokerDukkani.jsx` |
| Mesajlar listesi | Ham metin yerine hata + Tekrar dene, yükleniyor iskelet | `MesajlarPage.jsx` |
| Mesaj gönderme | Değiştirilmedi (aşağıdaki not) | `SohbetKutusu.jsx` |
| Sohbet geçmişi | "İlk mesajı sen at" yerine hata + Tekrar dene | `SohbetKutusu.jsx` |
| Bildirim zili | `catch {}` sessizliği kaldırıldı; "Henüz bildirim yok" yerine hata + Tekrar dene | `BildirimZili.jsx` |

- **A.5:** Ana sayfada "Seni bekleyenler" altında bekleyen maç/davet yokken şu satır çıkıyor: "Şu an seni bekleyen maç yok. · Arkadaşına meydan oku" (`Home.jsx`).
- **Mesaj gönderme — neden dokunulmadı:** `hataMesaji()` teknik hataları zaten genel bir metne çeviriyor. Yalnız sunucunun bilerek yazdığı Türkçe iş kuralı mesajları geçiyor ("yalnız arkadaşlarına mesaj atabilirsin", hız sınırı). Yazılan metin kutuda kalıyor; gönder düğmesi zaten tekrar deneme yolu.

**Doğrulama:** her istek 400 dönerken 10 ekran çekildi. Profil kartı ve ana sayfanın yükleniyor hâli ayrıca ölçüldü.

| Ölçüm | Sonuç |
|---|---|
| "Tekrar dene" düğmesi | 10 ekranın hepsinde var |
| Yasak metinler ("0 PUAN", "Henüz arkadaşın yok", "Bu ligde henüz kimse", "Henüz yanlışın yok", "Henüz mesajın yok", "Henüz bildirim yok", "İlk mesajı sen at", "sahte hata") | Hiçbirinde yok |
| Zil ölçümündeki "0 PUAN" eşleşmesi | Arkadaki sayacın 0→300 animasyonu anında yakalanmış; gerçek değer 300 |
| Ana sayfa yüklenirken | 4 iskelet satırı; "PUAN" ve "Oyuncu" metni yok |
| Profil kartı hatası | Tekrar dene var, "0 maç" yok |

## B + E + H — Ortak maç üst şeridi (ses · çıkış · mod rozeti)
Üç madde aynı yere düştüğü için tek bileşen oldu: `oyun/components/MacUstSerit.jsx`. Solda **X**, ortada **mod rozeti**, sağda **ses**.

**B — ses:**
- `SesDugmesi.jsx` artık kullanılıyor.
- `ses.js`'e `sesDinle()` eklendi: `sesAyarla` bir olay yayar; Profil › Ayarlar, maç şeridi ve avatar menüsü aynı anda eşitlenir.
- `bildim_ses` anahtarı değişmedi.

**E — çıkış:**
- Klasik'teki X (36 → **44 px**) şeride taşındı, davranışı aynı (`/meydan`).
- Grup → `/meydan`.
- Turnuva → ana sayfa.
- Düello → mevcut "Düellodan çık" onayını açar.
- Çalışma → "Turu bitir" (sonucu gösterir).
- Klasik'te onay penceresi yok; Grup ve Turnuva da aynı (onaysız).

**H — mod rozeti:** "Klasik Mod" · "Saf Bilgi · jokersiz" · "Düello · Taktik Maçı" · "Grup Maçı · ödülsüz" · "Turnuva" / "Turnuva · altın soru". Çalışma'da rozet yok; "ÇALIŞMA · PUAN VERİLMEZ" bandı zaten var.

**Çalışma turu:** öteki modlar gibi `useOyunModu` çağırıyor; şerit aynı yere oturdu.

**Ölçüm (390×844):**
- Klasik, Saf, Düello, Grup, Turnuva, Çalışma: X **12,12 · 44×44**, ses **334,12 · 44×44**. Altısında aynı.
- Ses düğmesi `bildim_ses=0` yazıyor.
- Profil › Ayarlar'da kapatınca maç şeridi `aria-pressed=false` açılıyor.

Görüntüler: p41-ust-serit-*.png

## C — Avatar menüsü
- Yeni `oyun/components/AvatarMenu.jsx`. `Layout.jsx`'teki profil bağlantısının yerinde.
- İçerik: **Profilim · Ayarlar · Ses (Açık/Kapalı) · Dil TR/EN · Çıkış Yap**.
- Ayarlar → `/profil?sekme=ayarlar`. `ProfilePage.jsx` bu parametreyi okuyup Ayarlar sekmesini açar ve sekmeleri üst çubuğun altına kaydırır.
- Profil › Ayarlar sekmesi yerinde duruyor.

**Ölçüm:**

| Kontrol | Sonuç |
|---|---|
| Menü öğeleri | 208×44; TR/EN 44×44 |
| Açılışta odak | "Profilim" |
| ↓ tuşu | "Ayarlar" |
| Esc | Kapanır, odak avatara döner |
| Dışarı tık | Kapanır |
| Ses | `bildim_ses=0` |
| EN | `profiles` PATCH `{"dil":"en"}` + sayfa yenilendi |
| Ayarlar | URL `/profil?sekme=ayarlar`, aktif sekme Ayarlar, sekmeler y=76 |

Görüntü: p41-avatar-menu-*.png

## D — Maç sonunda rakip avatarı → profil kartı
- Yeni `oyun/components/AvatarDugmesi.jsx`: kendi kartını açar; yalnız avatar dokunulabilir.
- Kullanıldığı yerler:
  - `MacSonuSahnesi` (sağ taraf = rakip)
  - `GroupMatchPage` (podyum + Detay'daki sıralama listesi)
  - `TournamentPage` (şampiyon)
- Kendi avatarın düz kalır.

**Ölçüm:**

| Mod | Tıklanabilir avatar | Kart açıldı | Kendi avatarın |
|---|---|---|---|
| Klasik | 1 | ✓ | tıklanmaz |
| Saf Bilgi | 1 | ✓ | tıklanmaz |
| Düello | 1 | ✓ | tıklanmaz |
| Grup | 5 (podyum + liste) | ✓ | tıklanmaz |
| Turnuva | 1 | ✓ | tıklanmaz |

## F — Rakip aramada sınırsız bekleme
**`RakipAra.jsx`:**
- "Maç hazırlanıyor…" hâline **30 sn** üst sınır (`HAZIRLIK_SINIR_MS`).
- Sınır ya da hata anında:
  - Başlık "Maç başlatılamadı" olur, sayaç durur.
  - Düğmeler: **Tekrar dene** (aramayı baştan başlatır) · **Bot ile oyna** · **Vazgeç**.
- Bot düğmesi artık her hâlde görünüyor; bot listesi açıkken gizli.

**`DuelloPage.jsx` (`duello_ara`) — aynı sorunlar vardı:**
- Hata çıkınca sayaç sürüyordu, Tekrar dene yoktu, üst sınır yoktu.
- Artık 60 sn sınır; hatada sayaç durur, başlık "Rakip bulunamadı", Tekrar dene + Vazgeç.

**Ölçüm:**

| Durum | Başlık | Sayaç | Düğmeler |
|---|---|---|---|
| Sınır (8+30 sn) | Maç başlatılamadı | yok | Tekrar dene · Bot ile oyna · Vazgeç |
| Arama hatası | Maç başlatılamadı | 2 sn sonra da yok | Tekrar dene · Bot ile oyna · Vazgeç |
| Bot hatası | Maç başlatılamadı | yok | Tekrar dene · Bot ile oyna · Vazgeç |
| Düello hatası | Rakip bulunamadı | yok | Tekrar dene · Vazgeç |

## G — Yükleme hatası paritesi
- `MacYukleniyor.jsx` artık ham metin göstermiyor ("Maç bilgisi alınamadı. Bağlantını kontrol edip tekrar dene."). `donusYolu`/`donusMetni` parametreleri eklendi.
- Düello `MacYukleniyor`'a geçti (Tekrar dene + "Düello'ya dön").
- Turnuva okunamazsa "sıradaki turnuva" görünümü yerine hata + Tekrar dene çıkıyor.

**Ölçüm:** Klasik, Düello, Grup, Turnuva — dördünde de Tekrar dene var, ham "sahte hata" metni yok.

## I — 404 ve yönlendirmeler
- Yeni `oyun/pages/BulunamadiPage.jsx`: maskot + "Bu sayfa yok." + "Ana sayfaya dön". Layout içinde `path="*"`.
- `/hizli-mod`, `/hizli-mac/:id`: "Bu mod şu an kapalı." notu, 2,5 sn sonra ana sayfaya `replace` ile yönlenir. CLAUDE.md ve AGENTS.md'ye not düşüldü.
- Oturumsuzken bilinmeyen adres köke yönlenir; giriş sonrası ana sayfa. `src/lib/girisHedefi.js` › `bilinenYol()`: bilinmeyen adres giriş hedefi olarak saklanmaz.

**Ölçüm:**
- Oturumlu `/asdasd` → 404 sayfası.
- `/hizli-mod`: 1. saniyede not, 3,5. saniyede `/`.
- Oturumsuz `/asdasd` → `/` giriş ekranı, saklanan hedef yok.
- `/mac/olmayan-id` (gerçek Supabase'in döndürdüğü 406/PGRST116 taklit edildi) → "Maç açılamadı · Tekrar dene".

## J — Dokunma hedefleri ≥ 44×44
Düzeltilen yerler (`tema.css` › "PAKET 41 J"):
- Üst çubuk Profil/Görünüm
- TR/EN
- Giriş yasal bağlantıları
- Tepki emojileri
- Profil kartı kapat
- Dükkân sekmeleri
- Mesaj kutusu
- Düello "Kurallar nasıl işliyor?"
- Arkadaş satırı
- Arkadaş çıkar (✕, "Oyna"dan 12 px ayrık)
- Klasik X (E'de)

**Ölçüm:** giriş, ana sayfa, maç, maç sonu, grup, arkadaşlar (+kart), dükkân, sohbet, düello lobisi; 390 ve 360'ta 44 altı hedef yok.
- Tek kalan: Dükkân'daki metin içi "Gizlilik Politikası" bağlantısı (103×18). Paragraf içindeki bağlantılar WCAG 2.5.8'de muaf; dokunulmadı.

## K — Giriş sayfası
- **K.1:** "Bağlantı gönderildi" kutusuna **Yeniden gönder** ve **Adresi değiştir** eklendi. Ölçüldü: yeniden gönder 2. OTP isteğini attı; adresi değiştir formu adres dolu hâlde açtı.
- **K.2:** `noValidate` + uygulama içi doğrulama. Geçersiz adreste "Geçerli bir e-posta adresi yaz (ör. ad@ornek.com)." / EN "Enter a valid email address…". Sunucuya istek gitmiyor (0 OTP).
- **K.3 — Facebook:** canlıda **kapalı**. `auth/v1/settings` › `external.facebook = false`; açık olanlar: Google, e-posta, anonim/misafir.
  - Paket "kendin karar verme, sor" dediği için düğmeyi gizlemedim.
  - **❔ Soru:** Facebook düğmesi giriş sayfasından kaldırılsın mı? (Basınca "Facebook girişi henüz açılmadı…" mesajı çıkıyor; bu mesaj artık okunur.)

## L — Sunucu metinleri İngilizce'de
Canlı `gorev_tanimlari()` ve `bildirimler` tablosundaki bütün metin kalıpları okunup `ttSunucu()` ile denendi.
- **Görev adları:** üçü de zaten çevriliydi ("3 maç oyna", "Bugün 5 maç kazan", "25 soruyu doğru cevapla").
- **Bildirimler:** 20 canlı kalıbın **18'i** zaten vardı.
- **Eksik olan ve eklenen iki anahtar** (`oyun/lib/dil.js`):
  - `"% seni düelloya çağırdı!"` → "% invited you to a duel!"
  - `"% düello davetini kabul etti - düello başlıyor!"` → "% accepted your duel invite — the duel is starting!"
- **Denetimdeki Türkçe kalıntıların kaynağı:** Paket 39'da görülenler ("10 doğru cevap ver", "Ayşe arkadaşlık isteğini kabul etti") benim sahte verimdeki uydurma metinlerdi; canlıda böyle bir metin yok.
- Görev adı artık maç sonunda da `ttSunucu` ile çevriliyor (`MacSonuSahnesi`, `OdulDokumu`).
- Sözlükte karşılığı olmayan metin olduğu gibi gösteriliyor (değişmedi).
- Yalnız telefon bildirimine giden (uygulama içinde görünmeyen) eski metinlere dokunulmadı.

## M — Küçük eksikler

| # | Ne yapıldı | Dosya / ölçüm |
|---|---|---|
| 1 | Grup hazır kapısı listesi artık yalnız nabızdan (tek kaynak): kendin "hazır/bekleniyor", ötekiler "ekranda/bekleniyor". Tablodaki `hazir` sütunu botların sanal hazırlığını bilmediği için sayaçla ayrışıyordu. | `GroupMatchPage.jsx` |
| 2 | Turnuvada elenen/izleyen oyuncuya soru sayacı (sunucu saatiyle, son 5 sn kırmızı) | `TournamentPage.jsx` `IzleyiciSayac` |
| 3 | Mod seçim penceresinde ödül satırı kaybolmaz: yüklenirken "Ödül: …", okunamazsa "Ödül: —" | `ModSecimPenceresi.jsx` |
| 4 | "Cevap bekleniyor"da "Davet N saat daha geçerli" + **Daveti geri çek** (`mac_iptal`) + "Meydan okumalara dön". Süre 24 saat (`eski_davetleri_temizle`) | `MatchPage.jsx` |
| 5 | Arkadaş çıkarma onayı pencerede: "Mert arkadaşlıktan çıkarılsın mı?" + açıklama + Vazgeç (ikincil) / Çıkar (tehlike) | `FriendsPage.jsx` |
| 6 | Davet kodu gelmezse: "Davet kodun şu an alınamadı; paylaşma düğmeleri bu yüzden kapalı." + Tekrar dene (Arkadaşlar ve Profil › Ayarlar, ortak bileşen) | `DavetKodu.jsx` |
| 7 | Uzun soruda kademeli küçülme (100+/170+ karakter ya da uzun şık). 390×844'te 5 satırlık soruda son şık 816 → **652**, joker çubuğu 935 → **771**, sohbet 987 → **823** (ekran 844) | `QuestionCard.jsx` `uzunlukSinifi`, `tema.css` |
| 8 | 1280×800'de joker çubuğu 748 → **714**, sohbet 800 → **766** (uzun soruda 718/770) | `tema.css` `@media (max-height: 820px)` |
| 9 | Yasal sayfalarda üstte **Geri**: geldiği yere döner, dışarıdan açıldıysa ana sayfaya | `GeriDugmesi.jsx`; giriş→gizlilik→geri = `/giris`, dükkân→gizlilik→geri = `/joker?sekme=coin`, doğrudan açılış→geri = `/` |
| 10 | **Değiştirilmedi.** İletişim adresi iki yerde | `oyun/pages/GizlilikPage.jsx:10` ve `oyun/pages/KosullarPage.jsx:11` (`const ILETISIM = "…"`). Yeni adresi verdiğinde ikisini birden değiştiririm |

- M.7 notu: 360×740 gibi daha küçük ekranda joker çubuğu hâlâ biraz aşağıda kalıyor (781 / 740). İstenen ölçü 390×844 olduğu için bıraktım; istersen Paket 42'de sıkıştırılır.

## Sorularım
1. **Facebook:** canlıda kapalı. Giriş sayfasındaki Facebook düğmesi kaldırılsın mı?
2. **İletişim adresi:** yeni adresi yazarsan iki dosyada değiştiririm.
3. **Grup / Turnuva çıkışı:** Klasik'teki gibi onaysız. Turnuvada çıkmak pratikte elenmek demek; onay penceresi ister misin?
