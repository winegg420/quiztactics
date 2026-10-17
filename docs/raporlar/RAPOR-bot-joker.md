# Botlar insan gibi: Ortak Hazine botu joker kullanıyor + tüm modlarda bot denetimi (17 Eki 2026)

> Klasör `quiztactics-isler/bot-joker`, dal `bot-joker`, migration **1125** (tepki paketinin ayırdığı 1120–1124'ün sonrası).
> Model Opus 5.5. Jev kapalıydı (kredi), Jev'siz çalışıldı. Yeni GRANT/RLS kuralı yok: yeni iç fonksiyonlar repodaki
> iç fonksiyonlar gibi istemciye kapalı, `kasa_joker`'in yetkisi değişmedi (ölçüldü).

## 1) Hazine botunda joker gerçekten yok muydu? — EVET, hiç yoktu

| Yer | Ne yapıyor | Joker? |
|---|---|---|
| `20260612001092_senkron_paketi.sql:620-641` `kasa_soru_ac` | Botun cevabını (`bot_soru_isabet`) ve anını (`bot_cevap_at`, 2–6 sn) planlar | yok |
| `20260612000987_kasa_savunma_hakki.sql:117-140` `kasa_savunma_ac` | Savunan botun cevabını planlar | yok |
| `20260612001104_ort_cevap_bot_suresi.sql:317-327` `kasa_ilerlet_ic` | Zamanı gelince bot cevabını `cevaplar`a yazar | yok |
| `20260612000955_kasa_tavan_carpan.sql:167-184` `kasa_bot_karar` | AÇ/DEVAM kararı | yok |
| `20260612000987_kasa_savunma_hakki.sql:678` `kasa_joker` | Oyuncuyu `auth.uid()` ile alır, kilidi `kasa_kilitle` (o da `auth.uid()`) ile alır | bot bu fonksiyona **ulaşamıyordu** |
| `20260612000954_kasa_devam_birakir.sql` `kasa_devam_hak_ver` | DEVAM ödülü 50:50'yi bot hemen kullanırdı | 987'den beri yeni maçlarda `devam_elli` false → **ölü yol** |

PROJECT_CONTEXT'te bile "Hazine botları normal joker kullanmaz" yazıyordu. Sonuç olarak `kasa_durum › rakip_joker` (`k.joker -> rakip -> turler`) bota karşı hep boş kaldı, "Rakip ___ kullandı" bildirimi hiç çıkmadı.

**Canlıyla karşılaştırma (salt okuma, `pg-mini`):** `kasa_joker`, `kasa_ilerlet_ic`, `kasa_soru_ac`, `kasa_bot_karar`, `kasa_durum`, `kasa_cevap` ve `kasa_savunma_ac` için canlıdaki gövde (`pg_get_functiondef`) depodaki son tanımla **birebir aynı**. Canlı veri, son 30 gün: 131 Hazine maçı var; 126'sı botlu, 124'ü botlu ve jokerli. Botların `joker_kullanimlari` satırı **0**.

## 2) Düzeltme — migration `20260612001125_kasa_bot_joker.sql` (canlıda)

- **Ayar** `kasa_bot_joker_yuzde` = **15** (Klasik `klasik_bot_joker_yuzde` ile aynı). 0 verilirse kapanır.
- **Tek kural yolu:** `kasa_joker`'in gövdesi aynen iç fonksiyon `kasa_joker_ic(p_id, p_me, …)`'ye taşındı. `kasa_joker` artık yalnızca hız sınırını, `kasa_kilitle`'yi (kilit, giriş kaydı, üyelik) çalıştırıp bu fonksiyonu `auth.uid()` ile çağırıyor. İnsan yolu değişmedi; testte kabul, soru başı reddi ve envanter düşüşü aynen çalıştı. Bot da **aynı** fonksiyondan geçiyor:
  - jokerli maç olmalı
  - Altın Soru'da yasak
  - faz `cevap` olmalı
  - kopukluk varken yasak
  - Savunma Sorusunda yalnız savunan kullanır ve Zaman Baskısı kullanamaz
  - bu soruyu cevapladıysa yasak
  - kişisel süresi bitmişse yasak
  - aynı tür aynı soruda iki kez kullanılamaz
  - 985 sınırları: toplam 4, İkinci Şans 1, 50:50 2, Ek Süre 2, Zaman Baskısı 3, soru başı 1
  - Zaman Baskısı yalnız rakip cevaplamadıysa

  Bot için tek fark envanterde: botun envanteri ve coini olmadığından kullanımı **ücretsiz** sayılıyor (`ucretsiz = true`; Klasik bot jokeri de böyle). Ayrı bir baypas yolu yok.
- **`kasa_bot_joker` (iç):** her soruda bir kez çalışır. Olasılık soru başına sabit tohumla belirlenir (`bot_rasgele`), böylece her yoklamada aynı karar çıkar. Bot jokerini oynanabilir başlangıç ile planlı cevabı arasındaki sürenin %20–%60'ında bir anda dener. Türleri rastgele sırayla `kasa_joker_ic`'e verir; kural reddederse sonraki türe geçer, hiçbiri kabul edilmezse o soruda vazgeçer. Rakip zaten cevapladıysa denemez, çünkü bot o anda cevaplıyor (1088).
- **Botun cevabına etki** (insanın ekranda yaşadığının karşılığı):
  - **50:50:** bot yanlışa gidiyorsa kalan iki şık arasında yarı yarıya seçer (954'teki bot kalıbının aynısı).
  - **İkinci Şans:** bot yanlışa gidiyorsa ilk cevabı elenir, kalan üç şıktan birini seçer.
  - **Ek Süre / Zaman Baskısı:** `kasa_joker_ic`'in kendi etkisi uygulanır.
- **Bağlantı:** `kasa_ilerlet`, `kasa_ilerlet_ic`'ten önce `kasa_bot_joker`'i çağırıyor. `kasa_durum`, `kasa_cevap` ve `kasa_tik` hepsi bu fonksiyondan geçiyor. Hata ilerletmeyi durdurmaz: `exception` bloğu var ve `raise warning` ile günlüğe yazıyor.
- **Arayüz:** dokunulmadı (`KasaParcalari.jsx › KasaRakipJokerAn`, `KasaPage.jsx`). `rakip_joker` artık bot için de doluyor.
- **Geri alma:** `docs/kasa-bot-joker-1125-geri-al.sql` (987 `kasa_joker` + 1105 `kasa_ilerlet`, iç fonksiyonlar ve ayar silinir). Yalnız kapatmak için `kasa_bot_joker_yuzde = 0` yeterli.

## 3) Test (kendim koştum)

- **`IZIN_CANLI_TEST=1 node araclar/kasa-bot-joker-sql-testi.mjs` → 25/25 geçti.** Tek maç (Ida hesabı ile bot), tek işlem, sonunda ROLLBACK; canlıda iz yok (doğrulandı). Doğrulananlar:
  - ayar ve yetkiler: iç fonksiyonlar `anon`/`authenticated`'a kapalı, `kasa_joker` aynı
  - insan yolu: kabul, soru başı reddi, envanter
  - bot an gelmeden denemiyor; an gelince joker yazıyor (`joker_kullanimlari`, ücretsiz satır)
  - **`kasa_durum › rakip_joker` insana botun jokerini döndürüyor**
  - bot jokeri cevabından önce kullanıyor ve aynı soruda ikinci kez denemiyor
  - 6 soruda yüzde 100 iken bot tam 4 joker kullandı, tür sınırları aşılmadı, hak bitince denemiyor
  - yüzde 0, Altın Soru, jokersiz maç, rakip cevaplamış, Savunma'da izleyen bot → joker yok
  - Savunma'da savunan bot joker kullanıyor (Zaman Baskısı değil, `soru_index = -tur`)
- **Oran:** `bot_rasgele` formülü JS'te yeniden üretildi (20.000 tohum, veritabanına gitmeden) → %15,06.
- **Canlı uygulama:** `araclar/migration-uygula.mjs` ile yapıldı (tek dosya, kayıt defterine işlendi, `--include-all` yok). Kayıt defteri `…1119, 1120, 1125`, ayar 15, `kasa_ilerlet` yeni adımı içeriyor; uygulama anında aktif Hazine maçı 0.
- **Yapılmadı:** canlıda gerçek bir bot maçının ekranda izlenmesi. Toplu deneme ve simülasyon yasağı nedeniyle, olasılıklı davranış yalnız işlem içi tek maçla ve JS'te ölçüldü. İlk gerçek bot maçlarında `joker_kullanimlari` (`mac_tur = 'kasa'` ve `user_id` = bot) satırları görülmeli.
- **Frontend değişmedi**, bu yüzden `npm run build` gerekmedi. Değişen dosyalar SQL, test aracı ve kural/rapor dosyaları.

## 4) Tüm modlarda bot davranışı denetimi

| Mod | Bot var mı | Joker/skill | Cevap süresi | Yanlış yapıyor mu | Tepki | Moda özgü karar |
|---|---|---|---|---|---|---|
| **Klasik** | Var (gizli bot, `bot_oyna`) | Var, %15 (`klasik_bot_joker_yuzde`). **Yalnız Zaman Baskısı ve Soru Değiştir** (`0255:219`). Ayrı cron fonksiyonu `bot_klasik_joker_tik`, kuralların kopyasıyla çalışıyor | İnsan gibi: bota özel `bot_gecikme_min/max`, soru uzunluğu, 1–8 sn | Evet, `bot_soru_isabet` (taban + kategori + zorluk, %5–98) | Var, `tepki_bot_olasilik` **0.03**, seri 3 | — |
| **Saf Bilgi** | Var (Klasik yolu) | Yok, **tasarım gereği** (jokersiz mod; insan da kullanamıyor) | Klasik ile aynı | Evet | Var | — |
| **Antrenman** (açık bot) | Var | Klasik ile aynı | Kolay/orta/zor profili | Evet | Var | — |
| **Düello v4** | Var (`duello4_bot_tik`) | **Hiç yok.** "Jokersiz (2. sürümün bot jokeri v4'e taşınmadı)" (`1014:925`). İnsanın 5 türü var | İnsan gibi (`bot_gecikme_sn`), insan cevaplayınca en fazla 2 sn sonra | Evet | **Yok.** Tetik yalnız `surum = 2` (`0542:236`) | Kart seçiyor: rakibe en zayıf, kendine en güçlü kategori, %75 en iyi; 1,2–3 sn |
| **Ortak Hazine** | Var | **ARTIK VAR** (1125; önceden hiç yoktu) | 2–6 sn, herkese tek düze aralık | Evet | **Yok** (mod tepkiye açık, bot tepki üretmiyor) | AÇ/DEVAM (tarz eşikleri 8/14/20 ±2), Savunma Sorusu |
| **Turnuva** | Var (lobi botları) | **Yok** (insanın kuralı var: tür başı 1, final ve Altın Soru'da kapalı) | `bot_gecikme_sn` | Evet | Yok (mod tepki listesinde değil) | — |
| **Grup** | Var (davetle) | **Yok** | `bot_gecikme_sn` | Evet | Yalnız eski metin/emoji kolu (`bot_eski_tepki_olasilik` 0.04) | — |
| Hızlı maç (`hizli_maclar`) | Kod var; kullanımda mı: BELİRSİZ | Yok | `bot_gecikme_sn` | Evet | Yok | — |
| kafatopu / meyvekes / patirun / driftgp / run / gladius | Migration'larda bu oyunlar için bot fonksiyonu yok | — | — | — | — | — |

### Eksikler (bu işte düzeltilmedi, yalnız rapor)

1. **Düello v4 botu joker kullanmıyor.** Kullanmadığı türler: 50:50, Ek Süre, Soru Değiştir, Zaman Baskısı, İkinci Şans. `duello_bot_joker_yuzde` v4'te okunmuyor. En büyük eksik bu.
2. **Düello v4 botu tepki atmıyor.** Tetik `surum = 2` filtreli. Ayrıca fonksiyon `son_hamle->'cevaplar'` okuyor, v4 ise `'oyuncular'` yazıyor; filtre kalksa bile doğru/yanlış hep yanlış okunur.
3. **Ortak Hazine botu tepki atmıyor**, mod tepkiye açık olduğu hâlde.
4. **Klasik bot yalnız 2 tür joker kullanıyor.** 50:50, Ek Süre, Sigorta, Çifte Puan ve İkinci Şans hiç kullanılmıyor. Klasik bot kendi kural kopyasıyla çalışıyor: soru başı hak sabit kodla 1 (`klasik_skill_soru_basi_hak` okunmuyor), loadout/kilit kapısından da geçmiyor. Hazine'deki gibi "insanla aynı kural fonksiyonu" kalıbına taşınması önerilir.
5. **Turnuva ve Grup botlarının joker yolu yok**, oysa insan joker kullanabiliyor.
6. **Grup'ta bot yalnız eski metin/emoji tepkisini kullanıyor**; yeni tepki paketi Grup'ta yok. Turnuva'da bot tepkisi hiç yok (mod da tepkiye kapalı).
7. **Hazine bot cevap süresi** herkese aynı 2–6 sn aralığından geliyor; bota özel gecikme profili ve soru uzunluğu yok. Öteki modlardaki `bot_gecikme_sn` modeliyle tutarsız.

## 5) Kalıcı kural

CLAUDE.md ve AGENTS.md › Kurallar bölümüne **"Bot paritesi"** maddesi eklendi: yeni mod ya da özellik eklenirken botlar joker, süre, hata, tepki ve moda özgü karar kontrolünden geçer; joker insanla aynı kural fonksiyonundan geçer; eksik kalırsa raporda yazılır. Bu raporun kalıcı kopyası `docs/raporlar/RAPOR-bot-joker.md`.

## 6) Toplu kayıt için (paralel iş kuralı: PROGRESS/PROJECT_CONTEXT bu işte yazılmadı, commit'ler `[progress-yok]`)

- **PROJECT_CONTEXT › Ortak Hazine:** "Bot savunanda `bot_soru_isabet` ile, jokersiz (Hazine botları normal joker kullanmaz)" cümlesi yerine şu yazılmalı: "**1125 (17 Eki 2026): Hazine botu joker kullanır** — `kasa_bot_joker_yuzde` 15 (soru başına), insanla aynı `kasa_joker_ic` kuralları (985 sınırları, Altın Soru, Savunma'da Zaman Baskısı yok), ücretsiz; savunan bot da kullanır; `rakip_joker`'de görünür. Geri alma `docs/kasa-bot-joker-1125-geri-al.sql`, test `araclar/kasa-bot-joker-sql-testi.mjs`."
- **PROJECT_CONTEXT 633. satır:** "Bot tepkisi sunucudan %12" eskimiş; canlıda `tepki_bot_olasilik` = **0.03**.
- **PROGRESS:** bu raporun 2. ve 3. bölümü.

## 7) Not

- Ana klasördeki `RAPOR.md` başka bir iş tarafından commit edilmeden değiştirilmiş durumda (klasör temizliği raporu). Bu dal `RAPOR.md`'yi yeniden yazdığı için ana klasörde `git pull` öncesinde o değişiklik commit edilmeli ya da kaldırılmalı.
- `araclar/kasa-joker-sinir-sql-testi.mjs` (985) artık koşamıyor: kullandığı `ArayuzDenetim890/648` hesapları silinmiş. Yeni test Ida hesabını ROLLBACK içinde kullanıyor.
