# Basılı tut (3 sn) → doğru şık — bütün modlar (10 Eki 2026)

Ida'nın isteği: özellik Klasik/Turnuva/Grup dışındaki modlara da (Düello dahil) yayılsın, yalnız yetkili hesapta.
Önceki tarama (aynı gün, ab0a9a6f) diğer modları "doğru cevap istemcide yok" diye atlamıştı; bu iş o eksiği kapatır.

**Kapı aynen korundu:** sunucu `dogru_cevap`ı yalnız `hileli_mi()` (`profiles.hile_yetkisi`) hesabına verir. Şu an
yetkili tek hesap: `idagg`. Normal oyuncu ve anon için alan `null` (TABLE dönenlerde) ya da hiç yok (jsonb dönenlerde).

## Mod tablosu

| Mod | Durum | Sunucu (soru RPC'si) | İstemci | Tarayıcı denemesi |
|---|---|---|---|---|
| Klasik 1v1 | Çalışıyor | `get_match_question` (önceden vardı) | QuestionCard | 3 sn ✓ · 1 sn ✓ |
| Turnuva | Çalışıyor | `get_tournament_question` (önceden vardı) | QuestionCard (aynı kart) | Klasik kartıyla aynı bileşen |
| Grup maçı | Çalışıyor | `get_group_match_question` (önceden vardı) | QuestionCard (aynı kart) | Klasik kartıyla aynı bileşen |
| Ortak Hazine (Kasa) | Çalışıyor | `kasa_durum` — yalnız `faz=cevap`, maç aktif, ben henüz cevaplamadım | KasaPage | 3 sn ✓ · 1 sn ✓ · azaltma ✓ |
| Düello v4 (yeni çekirdek) | Çalışıyor | `duello4_durum` — yalnız `notr/cevap/son`, soru açık, ben henüz cevaplamadım | Duello4Arena | 3 sn ✓ · 1 sn ✓ · cevap verilmişken tetik yok ✓ |
| Düello v2 | Çalışıyor (kod hazır) | `duello2_durum` — yalnız `faz=cevap`, ben henüz cevaplamadım | DuelloV2 › V2Cevap | yapılmadı: yeni maçlar v4; sunucu kapısı SQL ile doğrulandı |
| Çalışma | Çalışıyor | `calisma_soru` (+ `dogru_cevap` sütunu) | CalismaPage | 3 sn ✓ · 1 sn ✓ · azaltma ✓ |
| Hızlı Mod | Hazır, mod DONDURULMUŞ | `hizli_mod_soru` (+ `dogru_cevap` sütunu) | HizliModPage | yapılmadı: rota `BulunamadiPage kapaliMod`; sunucu SQL ile doğrulandı |
| Hızlı Maç | Hazır, mod DONDURULMUŞ | `get_hizli_soru` (+ `dogru_cevap` sütunu) | QuestionCard | yapılmadı: rota kapalı; kart Klasik denemesiyle aynı, sunucu SQL ile doğrulandı |
| Düello v1 (eski) | Eklenmedi | `duello_durum` eski dalı | — | son v1 maçı 22 Eyl; erişilen akış değil |

Düello kuralı: basılı tut yalnız oyuncunun **kendi cevap hakkı varken** çalışır (sunucu koşulu + istemcide
`tiklanabilir`: cevaplamadım, süre var, istek yolda değil). Kart fazında, cevap verdikten sonra ya da rakip
beklerken alan gelmez ve tetik olmaz. Tetik `duello_cevap`ı normal yoldan çağırır; kontrol / 4 kart / 3-3 seri
sunucu kurallarına dokunulmadı (`duello4_cevap` değişmedi).

## Migration

`supabase/migrations/20260612001052_basili_tut_tum_modlar.sql` — **1052**, canlıya uygulandı (origin/main'deki son 1051'di).
- `calisma_soru`, `hizli_mod_soru`, `get_hizli_soru`: dönüş tipine `dogru_cevap smallint` (DROP + CREATE; yetkiler
  aynen: `authenticated`, `service_role`; `public`/`anon` REVOKE).
- `kasa_durum`, `duello4_durum`, `duello2_durum`: `soru` nesnesine koşullu `dogru_cevap` (CREATE OR REPLACE, yetkiler aynı).
- Gövdeler canlı tanımdan alındı; tek fark eklenen satırlar. Cevap RPC'lerine (`*_cevap`) dokunulmadı.
- Yetki listesi uygulama sonrası ölçüldü: önceki hâliyle birebir aynı; anon hiçbirinde EXECUTE yok.

## Güvenlik testi (canlı, tek transaction, ROLLBACK — canlıda iz yok)

`IZIN_CANLI_TEST=1 node araclar/basili-tut-guvenlik-sql-testi.mjs` → **21/21 geçti**

| Deneme | Sonuç |
|---|---|
| anon: `calisma_soru`, `hizli_mod_soru`, `get_hizli_soru`, `kasa_durum`, `duello_durum` | 5/5 `permission denied` |
| Çalışma · Hızlı Mod · Hızlı Maç — yetkili | `dogru_cevap` = doğru şık |
| Çalışma · Hızlı Mod · Hızlı Maç — yetkisiz (normal hesap) | `dogru_cevap` = null |
| Kasa yetkili (cevap fazı) / yetkisiz / yetkili cevap verdikten sonra | var / yok / yok |
| Düello v4 yetkili / yetkisiz / cevap verdikten sonra / kart fazı | var / yok / yok / yok |
| Düello v2 yetkili / yetkisiz | var / yok |
| Klasik `get_match_question` kapısı (regresyon) | yerinde |

Test, bitmiş eski maç satırlarını transaction içinde geçici açar, Hızlı Mod/Maç bayraklarını geçici açar; sonunda
ROLLBACK. Sonradan ölçüldü: maç `bitti`, bayraklar `false`, oturum satırı yok.

## İstemci

- Yeni ortak kanca `oyun/lib/useBasiliTut.js` (+ erken dönüşlü sayfalar için `<BasiliTut>` sarmalayıcı).
  QuestionCard da artık bu kancayı kullanıyor; davranış aynı.
- Görsel: `.qt-sik--tutulur` / `.qt-sik--basili` (bilesenler.css, değişmedi) — 3 sn dolan mavi çizgi, hareket
  azaltmada sade dolgu; mobilde menü/metin seçimi/büyüteç yok.
- İptal: parmak kalkar, 12 px'den fazla kayar, pointercancel, cevap verilir, süre biter, soru değişir.
  Aynı soruda ikinci tetik yok. Tetikten sonra parmak kalkınca gelen tıklama yutulur (tutulan yanlış şık gitmez).
- dogru_cevap gelmeyen hesapta şıklara hiçbir sınıf/olay eklenmez.

**Yakalanan hata:** İlk sürümde QuestionCard'da kanca `soru` tanımlanmadan önce çağrılıyordu ("Cannot access 'soru'
before initialization") — Klasik/Turnuva/Grup kartını tamamen kırardı. Tarayıcı denemesi yakaladı, yayından önce düzeltildi.

## Test

- `npm run build`: temiz (eski iPhone ayrıştırma denetimi TEMİZ).
- `npm test`: sunucu testleri geçti; `test:kurallar` içinde **1 eski başarısızlık** — `skill-sistemi-test.mjs:22`
  "İkinci Şans yalnız Klasik ve Düello" beklentisi, gerçekte Kasa'da da var. Bu işle ilgisi yok (skill ayarına
  dokunulmadı). `test:dans` geçti.
- Tarayıcı (yerel, taklit veri, canlıya yazma yok): `node araclar/basili-tut-ekran.mjs` → **35/35 geçti**.
  Her modda: yetkili 1 sn + kaydırma → cevap yok · 3 sn → tek cevap, doğru şık · contextmenu engelli ·
  user-select none · hareket azaltmada animasyonsuz dolgu · yetkisizde sınıf yok ve 3,5 sn'de cevap yok.
- Ekran görüntüleri: `tasarim/basili-tut/` (basılı 1,5 sn · 3 sn sonrası · azaltma · yetkisiz · Düello cevap verilmiş).
- **Yapılmadı:** gerçek `idagg` hesabıyla canlı maçta deneme — hesabın şifresi bende yok ve canlıya test yükü
  gönderme kuralı var; sunucu tarafı SQL ile, istemci taklit veriyle doğrulandı. Gerçek iOS dokunuşu
  (uzun basış menüsü/büyüteç) bu makinede denenemez; Chrome dokunmatik öykünmesiyle ölçüldü.

---

# Soru üretim maliyet tahmini düzeltmesi (10 Eki 2026)

**Yer:** Hesap `api-uret.mjs`'te değil, ortak katman `araclar/soru-temizlik/claude-cagri.mjs` içinde (`apiUsd`, `claudeCagir`). Migration yok; codex dosyalarına dokunulmadı.

## Kanıtlanan açıklar (kodda)

1. **Zaman aşımı/kopan çağrılar hiç sayılmıyordu.** `usage` yalnız başarılı yanıtta okunuyordu; 240 sn zaman aşımı veya bağlantı kopmasında yanıt gelmediği için jeton eklenmiyor, sunucu ise işi (Opus, `maxJeton` 16000'e kadar çıktı) faturalıyor. `api-uret.mjs` bu durumda isteği küçültüp yeniden gönderiyor (`zamanAsimi` → `CAGRI_KUCUK`) — aynı iş iki kez faturalanıp bir kez sayılıyordu. Tahmini gerçeğin altında tutan kalem budur.
2. **Önbellek okuma katsayısı sabit 0,1×.** Opus 5.5 için gerçek oran 0,05× ($0,20/1M, girdi $4). Bu hata tahmini **yukarı** iter (kolay-04: Opus 4,06M okuma jetonu). Sonnet 5.5 için 0,1× doğru.
3. **1 saatlik önbellek yazması (2×) ayrıştırılmıyordu.** Bugün kodda 1 sa TTL yok (`ephemeral` = 5 dk), ama `usage.cache_creation.ephemeral_1h_input_tokens` gelirse eksik sayılırdı.

Çıktı jetonu (düşünme dahil `output_tokens`), önbellek yazma/okuma ve girdi zaten toplanıyordu; fiyat sabitleri (Sonnet 5.5 $2/$10, Opus 5.5 $4/$20) güncel tabloyla eşleşiyor. Jev maliyeti ihmal edilebilir (kolay-04: 326.857 jeton ≈ $0,014).

## Düzeltme

- `FIYAT`'a model başına `okuma` katsayısı; `modelUsd` (5 dk/1 sa yazma ayrı, okuma modele göre).
- `kullanimEkle`: usage → sayaç (tek yer). `iptalEkle`: yanıtı alınamayan çağrı için **tahmin** — girdi = istem karakteri/3; çıktı yalnız zaman aşımında `maxJeton` (üst sınır). Alanlar `iptal_cagri/iptal_girdi/iptal_cikti` olarak `durum.json › harcama`'ya yazılır; eski dosyalar bozulmaz. Usage'ı zaten eklenmiş denemede (ör. JSON ayrıştırma hatası) çift sayım yok.
- Doğrulama: `node araclar/soru-temizlik/claude-cagri.test.mjs` — Opus 1,41 · Sonnet 3,20 · zaman aşımı 0,36 · kopma 0,04 (elle hesapla eşleşti). Sahte `fetch` ile 2 zaman aşımı + 1 başarı senaryosu da denendi (gerçek API çağrısı yok).

## Dürüst not

Gerçek faturayı (Anthropic konsolu) bu ortamdan göremediğim için "%20" farkını rakamla kapatamadım; yukarıdaki üç kalem kodda kanıtlı, ama asıl paya (iptal kalemi) etkisi koşudaki zaman aşımı sayısına bağlı — artık `iptal_cagri` ile görünür. Kapanmayan fark konsol faturasıyla karşılaştırılmalı. Eski `durum.json`'larda iptal kaydı yok, geriye dönük düzelmez. kolay-04 yeniden hesabı: $14,998 → $14,186 (yalnız okuma katsayısı; o koşuda iptal kaydı olmadığından eklenemedi).

## Başka betikler

- `soru-temizlik/{asiri-basit-tara,en-eksik-ceviri,sik-ipucu-837,z2-*}.mjs` aynı `claude-cagri.mjs`'i kullanıyor → düzeltmeden otomatik yararlanır.
- `soru-temizlik/sik-ipucu-api.mjs` kendi hesabını yapıyor: önbellek yazma/okuma jetonlarını tam girdi fiyatından sayıyor (yazma 1,25× yerine 1×, okuma 0,1× yerine 1×) ve iptal çağrısını saymıyor. Önbellekte **fazla**, zaman aşımında **eksik** tahmin eder; dokunulmadı (`claude-cagri.mjs`'e geçirilmesi önerilir).

RAPOR HAZIR — Ida'ya iletilecek.
