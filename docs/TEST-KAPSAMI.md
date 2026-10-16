# TAM TEST KAPSAMI — kalıcı liste (Ida, 16 Eki 2026)

**Kural:** her test (Claude Code, Codex, Claude in Chrome taraması, elle tarama) bu listenin **TAMAMINI** koşar.
Testi o günkü şikâyete göre daraltmak **yasak**. Koşulamayan madde raporda **BAKILAMADI + nedeni** yazar;
sessizce atlanmaz. Rapor her madde için **GEÇTİ / KALDI / BAKILAMADI** verir.

Neden: 11–16 Eki arasındaki beş test "ses başladı mı" ve "iki ses aynı anda başladı mı"ya baktı; "ses sonuna kadar
çaldı mı, çalarken ekran değişti mi, kalan kaç ms" hiç ölçülmedi — Hazine'de yarıda kesilen sesler bu yüzden kaçtı.

## 0 · Koşullar (her madde bu koşulların hepsinde)

| Koşul | Değerler |
|---|---|
| Ekran | 360×640 ve 390×844 (telefon); yerleşim maddeleri ayrıca 1440 · 850 · 560 (`araclar/arayuz-denetim.mjs`) |
| Dil | TR ve EN |
| Hız | normal + **yavaş telefon taklidi**: CPU 6x · yavaş 4G (150 ms, 1,6 Mbit/s) · Android UA (`araclar/yavas-android-olcum.mjs`) |
| Ağ senaryosu | maç akışında ayrıca `dalgali` (dalgalı ağ, cevapsız turlar, saat atlaması, arka plan — `araclar/hazine-akis-olcum.mjs --senaryo=dalgali`) |
| Hareket | normal + `prefers-reduced-motion: reduce` |
| Modlar | Klasik · Saf Bilgi · Düello · Ortak Hazine · Grup · Turnuva — hepsi |
| Sayfalar | bütün sayfalar (`araclar/arayuz-denetim.mjs` listesi + maç sayfaları + maç sonu + Dükkân/Profil/Lig/Arkadaşlar/Görevler/Sezon Yolu/Ayarlar) |

Canlı veri kuralı (CLAUDE.md) aynen geçerli: önce yerel + taklit; canlıda yalnız tek maçlık duman testi (Ida hesabı,
açık bot), canlı DB'de simülasyon/toplu deneme yok. Hesap silen araca Ida oturumu verilmez. Ses/müzik ayarına dokunulmaz.
Turnstile çıkarsa durulur. İş bitince tarayıcı/sunucu süreçleri kapatılır.

## 1 · Dokunma
- [ ] Her düğme / kart / sekme basılıyor mu, **doğru yere** gidiyor mu
- [ ] Üstü başka öğeyle kapalı mı (`elementFromPoint` hedefin kendisi ya da çocuğu mu)
- [ ] 44 px altı dokunma hedefi
- [ ] Çift / hızlı basışta bozulma (iki istek, iki geçiş, iki ses)
- [ ] Pasif düğme gerçekten pasif mi (basınca hiçbir şey olmuyor, görünüşü pasif)

## 2 · Görünüm
- [ ] Yatay taşma
- [ ] Kesilen / üç noktaya düşen yazı (`scrollWidth > clientWidth`)
- [ ] Üst üste binen öğe
- [ ] Kırık görsel (`naturalWidth = 0`)
- [ ] Ekranda "undefined", "NaN", "null", çevrilmemiş anahtar, yanlış dil
- [ ] Hizalama (aynı sıradaki öğeler, ortalanması gereken öğe)
- [ ] Alt menünün öğe örtmesi (son öğe alt menünün altında kalıyor mu)
- [ ] iOS kuralları: aynı öğede `position: fixed` + `transform` yok; `fixed` öğenin atasında transform/filter/perspective yok; `100vh` yok

## 3 · Animasyon (her animasyon için)
- [ ] Başlıyor mu
- [ ] Sonuna kadar oynuyor mu
- [ ] Yarıda kesiliyor mu — **kim kesti** (faz değişimi, bileşen kapanması, sayfa geçişi)
- [ ] Kapanıyor mu (ekranda takılı / donuk kalıyor mu)
- [ ] Tekrar tekrar oynuyor mu (yeniden çizimde baştan başlama)
- [ ] > 100 ms kare (animasyon süresince en uzun kare)
- [ ] Hareket azaltma tercihinde sade sürüm (sonsuz döngü yok, bilgi kaybı yok)

## 4 · Ses (her ses rolü için — `window.__sesOmur`, `?tani=1` / `bd_ses_tani=1`)
- [ ] İstendi mi
- [ ] Başladı mı — **gecikme ms** (istek → kaynak başladı)
- [ ] **Sonuna kadar çaldı mı** (gerçek çalma süresi ≥ planlanan süre)
- [ ] Erken bitti mi + **kim kesti**: yeni ses (aynı rol, `ES_ZAMANLI` sınırı) · `kisVeDurdur` (soru sesi) · faz değişimi · bileşen kapanması / sayfa geçişi · maç sonu ekranı kapandı
- [ ] **Ses çalarken yeni faz / ekran geldi mi + kalan ms** (> 150 ms kaldıysa KALDI)
- [ ] Başka sesle çakıştı mı (hangi ses, kaç ms üst üste)
- [ ] Hiç çalmadı mı + **neden**: AudioContext askıda · dosya inmedi (250 ms kuralı) · faz iptali · ses kapalı / dokunuş yok
- [ ] Anlam taşıyan ses (joker işaretleri, giriş sesi, VS / rakip bulundu, doğru/yanlış, süre doldu, kategori seçildi, tur geçişi, maç sonu, XP/seviye/rozet) **ani kesilmiyor** (ani = < 80 ms fade ile durdurma)

## 5 · Zamanlama
- [ ] Sayaç sunucu saatine göre düzgün iniyor mu (rakam süreleri 0,9–1,2 sn)
- [ ] Sıçrama (ileri / geri)
- [ ] 0'da takılma (> 1 sn)
- [ ] Faz geçişinin geç gelmesi (sunucu bitişinden > 1 sn) — geç geldiyse **kim bekletti**: sunucu yanıt süresi (edge log
      `response.origin_time`) · istemci yoklaması / zinciri · erken süre bildirimi
- [ ] Erken süre bildirimi ("cevabım yok" / "karar yok" süre dolmadan vardı → `Süre dolmadı` reddi) — 0 olmalı; sayaç > 0 iken
      bildirim gitmemeli (oyuncunun dokunma hakkı kesilmez)
- [ ] 3-2-1 tam dizi (3 → 2 → 1, her biri ~1 sn, tekrar yok)
- [ ] Arka plana gidip dönme (sayaç, ses, faz doğru yerden sürüyor)

## 6 · Akış (her mod)
- [ ] Giriş → ana sayfa → mod seçimi → eşleşme / bekleme → 3-2-1 → her soru → cevap sonucu → tur geçişi → maç sonu → ödül / XP / seviye → ana sayfaya dönüş
- [ ] Terk (maçtan çık)
- [ ] Bağlantı kopup geri gelme
- [ ] Rövanş

## 7 · Veri
- [ ] Puan · coin · XP · SP · lig puanı doğru işlendi
- [ ] Görev ilerlemesi
- [ ] Bin Galibiyet sayacı (açık bot hariç; beraberlik sayılmaz)
- [ ] Toplu soru düzeltmesi (migration): kayma kontrolü (canlı eski metin = kaynak yedek) · yerel PGlite'ta migration → tekrar (idempotent) → geri-al (birebir eski hâl) → kayma senaryosu · canlıda salt okuma son kontrol (hedef hâl sayısı, pasif sayısı, rastgele 20 TR+EN, kategori bazında aktif önce/sonra)

## 8 · Konsol
- [ ] JS hatası (`pageerror`, `console.error`)
- [ ] Başarısız Supabase çağrısı (4xx/5xx; beklenen 400'ler raporda ayrı)
- [ ] Uyarı (`console.warn`)

## 9 · Rapor biçimi
Her madde × mod × koşul için tek satır: `madde | mod | koşul | GEÇTİ/KALDI/BAKILAMADI | ölçü / neden`.
KALDI satırında kanıt (ms, ekran görüntüsü yolu, kayıt). BAKILAMADI satırında neden (ör. "Turnuva canlıda istenince
başlatılamaz — taklitle bakıldı", "WebKit bu makinede çalışmıyor — gerçek iOS sahibinin telefonunda").

## Araçlar (hangi madde hangi araçla)
| Araç | Kapsadığı maddeler |
|---|---|
| `araclar/arayuz-denetim.mjs [--gorsel]` | 1 (44 px, kapalı hedef), 2 (taşma, iOS kuralları), 8 — 16 sayfa × 4 genişlik |
| `araclar/hazine-akis-olcum.mjs --senaryo=bot,gecikmeli,dalgali` | 3, 4, 5 — Hazine tam maç, taklit sunucu, CPU 6x |
| `araclar/ses-zamanlama-olcum.mjs` | 4 — Düello v4 açılış/soru sesi (taklit) + ses ömrü tablosu |
| `araclar/ses-kesilme-olcum.mjs` | 4 — bütün modların ses çizelgesi (gerçek ses.js + dosyalar): kesilme, kalan ms, çakışma |
| `araclar/yavas-android-olcum.mjs --mac [--ida] [--videosuz] [--iz_mac]` | 3, 4, 5, 6, 8 — Klasik/Düello/Hazine bota karşı tek maç (canlı), yavaş telefon. Kare ölçümünde `--videosuz` (video kodlaması kareye 15–35 ms ekler); ilk 5 sn soğuk sayfa açılışıdır, maç içi sayılmaz |
| `araclar/iz-coz.mjs <iz> [--dist=…] [--gecersiz]` | 3 — uzun görevin sorumlusu: JS (kaynak haritasıyla dosya:satır) · stil (öğe sayısı) · yerleşim · boyama; `--gecersiz` stil geçersizleştirme nedeni (zamanları şişirir, yalnız neden için) |
| `araclar/hazine-akis-olcum.mjs --senaryo=yavas_sunucu` | 5 — canlı DB yavaşlaması taklidi (satır kilidi + 1–3,5 sn işlem, saat damgası yanıt sonunda); faz geçişi sunucu → istemci ms, erken süre bildirimi (bütün senaryolar) |
| Yerel PGlite (`@electric-sql/pglite`, repo DIŞI geçici klasöre kurulur; repoya paket girmez) | 7 — toplu soru migration'ı: canlıdan salt okuma anlık görüntü (hedef satırlar + hedef dışı örnek + tetikleyici fonksiyonları) yüklenir; migration, ikinci çalıştırma, geri-al ve kayma senaryosu yerelde koşar (16 Eki 2026, soru-duzelt-2: 17/17). Canlıda test işlemi açılmaz |
| `araclar/sure-bildirim-olcum.mjs` | 5 — süre dolumu bildirimi zamanlaması (Düello/Hazine): gerçek `sunucuSaati.js` sanal saatle, bellekte — sayaç 0'da kalma, red oranı, erken gönderim |
| Supabase edge log (Management API `analytics/endpoints/logs`, salt okuma) | 5 — canlıda geç geçiş görülünce o dakikadaki RPC `response.origin_time` (sunucu mu bekletti, istemci mi) |
| `araclar/hazine-akis-olcum.mjs --azalt` / `--spa` | 3 — hareket azaltma; maça uygulama içinden (SPA) giriş |
| `araclar/hazine-akis-olcum.mjs --senaryo=aski` | 5 — yanıtı kaybolan okuma (her 15 `kasa_durum`'dan biri 9,5 sn yanıtsız): ekranın donup birden atlaması, sayaç 0'da kalma (16 Eki 2026) |
| `araclar/hazine-akis-olcum.mjs --kozmetik=ida` / `--anim_dokum=<ms,…>` | 3 — Ida'nın gerçek oyuncu kartıyla (çerçeve, altın isim, BP parlaması) ölçüm; verilen anlarda süren CSS animasyonları ve canlandırdıkları özellikler (transform/opacity dışı = her karede boyama) |
| `node --test oyun/_test/akis-kasma-test.mjs` (`npm run test:kurallar`) | 3 — izleme `kasma` özeti: aşama sayımı, maç sonu penceresi, gizlenince gönderim, sınırlar, donma (bellekte) |
| `araclar/izleme-istemci-testi.mjs` | 8 — izleme kuyruğu: gizlenince beklemeden (keepalive) gönderim, gizlenip hemen dondurulan sayfa (Android arka plan) |
| Gerçek telefon izlemesi (`/yonetim/izleme › Akış bozulmaları`, günlük e-posta) | 3, 5 — **yalnız `kip = twa` satırları gerçek telefondur**; `tarayici` satırları ölçüm araçlarından. `kasma` = > 100 ms kareler (aşama:adet) |
| `araclar/klasik-mac-ekran.mjs` `butce` alanı | 2 — dikey bütçe (maç kökü + soru bölümü çocuk yükseklikleri); kayan şeritteki ekran dışı öğe "kaydırmalı şeritte" yazılır, kırpık sayılmaz |
| `araclar/klasik-mac-ekran.mjs` `CLS=` sütunu | 2, 3 — dokunuştan sonuç bandına kadar düzen kayması (`layout-shift`); sonuç gelince 0 olmalı (16 Eki 2026) |
| `araclar/hazine-akis-olcum.mjs --iz=son` · kesik nedeni | 3 — maç bitişinden 9 sn'lik iz (`iz-coz.mjs` ile); her kesik animasyon nedeniyle: `sinif_kaldirildi` · `yeniden_baglandi` (key/yeniden takılma) · `ekran_degisti` · `devam` (kaldığı yerden sürdü — kesik sayılmaz) · `devralindi` (aynı öğede başka animasyon, tasarım). Gerçek hata = ilk ikisi (16 Eki 2026) |
| `araclar/senkron-testi.mjs [--taklit]` | 5 — 3-2-1 ve sayaçlar, bütün modlar (Turnuva taklit) |
| `node araclar/oyuncu-testi.mjs --adres=…` | 6, 7, 8 — canlı duman testi |
| `node araclar/jev.mjs` · `node araclar/jev-test.mjs` · `node araclar/soru_denetim/kapi.mjs › sikIpucuTesti` (yerel örnek soru, `fetch` tuzaklı) | Jev kapalı (`JEV_KAPALI`, 16 Eki 2026): ağ çağrısı yok, `jev_devre_disi` döner; şık ipucu kapısı "Jev yok, atlandı" ile geçer (başarısız sayılmaz), diğer kapılar (`codex-kapi.test.mjs` 13/13) aynen çalışır |
