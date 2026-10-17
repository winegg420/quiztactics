# AGENTS.md

Codex ve diğer AI ajanları için depo rehberi. Claude Code karşılığı
`CLAUDE.md`'dir; **ürün kararları ikisinde de TEKRAR ETMEZ** — tek kaynak
`PROJECT_CONTEXT.md`. **Her oturuma başlarken oku.**

## Proje hafızası — HER OTURUMDA

Okuma sırası:
1. PROJECT_CONTEXT.md — tamamını oku. Projenin bugünkü gerçeği burada.
2. PROGRESS.md — son 300 satır.
3. git log -30
4. Görev belirli bir konuya dokunuyorsa (ör. skill, lig, turnuva,
   harita, düello): PROGRESS.md içinde o anahtar kelimeyi ARA. İlgili
   eski karar 300 satırın dışında kalmış olabilir.

Yazma:
- İş bitince PROGRESS.md'nin SONUNA yeni kayıt ekle (şablon o dosyanın başında).
- Projenin güncel gerçeğini değiştiren bir karar alındıysa
  PROJECT_CONTEXT.md'yi de güncelle — eski satırı silip yenisini yazarak.
- Eski kayıtları silme veya yeniden yazma.

`oyun/AGENTS.md` ve `oyun/harita/` alt rehberlere yönlendirir; o alanda
çalışırken önce onları oku.

## Çalışma klasörü — TEK KURAL

Tek çalışma klasörü: `C:\Users\ida\Desktop\quiztactics`. Ayrı worktree,
ayrı kopya, `DocumentsCodex...` altında klasör **açılmaz**. 13 Eyl
2026'da ayrık worktree yüzünden 26 commitlik iş görünmez oldu ve
canlıdaki 3B sayfalar silindi. (Kurtarılan iş: `arsiv/OKU.md`.)

**Aynı klasörde** aynı anda tek araç çalışır. Biri işini bitirip push etmeden diğeri
o klasörde başlamaz. Oturum başında `git pull`, sonunda commit + `main`'e push (bkz. Dal düzeni).
**Commit edilmemiş iş bırakma** — yarım kalsa bile commit et.

### Paralel çalışma (Ida kararı, 16 Eki 2026) — yukarıdaki "ayrı kopya açılmaz" kuralının İZİNLİ İSTİSNASI

Birden fazla araç/pencere aynı anda çalışabilir; şartlar:
- Her iş **kendi klasöründe ve kendi dalında** çalışır (git worktree); ana klasöre (`C:\Users\ida\Desktop\quiztactics`) başka iş girmez. Ida ayrı klasör açılmasına izin verdiğinde klasör adı/dal adı işin başında yazılır.
- İşlerin **dosyaları ayrık** olmalı; aynı dosyaya iki iş dokunacaksa paralel yapılmaz.
- **Supabase (Nano, ücretsiz) güvenliği:**
  - Migration yazan / canlı veritabanına dokunan iş aynı anda **tek pencerede** olur.
  - Migration numarası işin başında **önceden ayrılır** (ör. A işi 1120–1129, B işi 1130–1139); numara başkasının aralığından alınmaz. Sıra bağımlılığı kurulmaz ("984 olmadan 985 uygulanmaz" gibi); `--include-all` kullanılmaz.
  - Aynı SQL fonksiyonu/ayar iki işte değiştirilmez (`CREATE OR REPLACE` çakışması, 17 Eyl 2026 `bot_oyna` olayı).
  - Canlı veritabanına test/ölçüm aynı anda **tek pencerede** koşar; toplu/döngülü istek ve simülasyon yine yasak.
- Birleştirme **sırayla** yapılır; her birleştirmeden önce güncel `main` alınır, çakışma çıkarsa DUR ve raporla.
- `PROGRESS.md` ve `PROJECT_CONTEXT.md` paralel işlerde **yazılmaz** (commit `[progress-yok]`); işler bitince tek pencere toplu kayıt düşer.
- Gün içi Vercel dağıtım sınırı için push'lar biriktirilir.

### Klasör temizliği (Ida kararı, 17 Eki 2026)

- Yeni worktree'ler tek klasör altında açılır: `C:\Users\ida\Desktop\quiztactics-isler\<is-adi>`.
- İş bitince, son cevaptan ÖNCE kendi açtığın worktree klasörünü kendin kaldır; Ida'ya sorma.
- Önce kontrol: dal `main`'e birleşmiş mi (`git branch --merged main`) ve `git status` temiz mi. İkisi de evetse: `git worktree remove <klasör>`, sonra `git branch -d <dal>`.
- Birleşmemiş veya değişiklik varsa SİLME; son cevapta tek satır yaz: "Klasör duruyor: <ad>, sebep: <birleşmedi/değişiklik var>".
- Geçici dosyalar (`.tmp`, `*.log`, `ek.tmp.css`, `oyuncu-testi-hata-*.png`) iş bitince silinir. `RAPOR-*.md` dosyaları ana klasöre değil `docs/raporlar/` altına yazılır.

## Komutlar

```bash
npm run dev        # Geliştirme sunucusu (Vite)
npm run build      # Production derlemesi (dist/) — değişiklikten sonra doğrula
npm run preview    # Derlemeyi yerel önizle
npx supabase db push                            # Migration'ları uygula
npx supabase functions deploy generate-questions
```

## Teknoloji ve dizin

React 19 + Vite 7 + React Router 7 · Supabase (Auth, Postgres, Realtime,
RLS, Edge Functions, pg_cron) · three.js (`oyun/harita/`) · Vercel.

Paylaşılan kabuk `src/`: `main.jsx` (giriş; BrowserRouter + AuthProvider),
`App.jsx` (route tanımları), `context/AuthContext.jsx`, `lib/supabase.js`,
`components/Avatar.jsx`, `styles.css`.

Oyun modülleri — her biri izole, kabuğa tek lazy route satırıyla bağlı,
hiçbiri diğerinin klasöründen import etmez: `oyun/` (Quiz Tactics, DB
öneksiz) · `kafatopu/` (`kafatopu_`) · `meyvekes/` (`meyvekes_`) · `run/`
(backend yok, DEMO) · `gladius/` (`gl_`, DEMO) · `patirun/` (`pr_`) ·
`driftgp/` (`dg_`; kullanıcıya görünen ad **DidaGP**).

Ortak: `supabase/migrations/` (sıralı SQL) · `supabase/functions/` ·
`public/` (PWA varlıkları; oyun varlıkları namespace'li).

## Ortam değişkenleri

`.env` içinde: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(bkz. `.env.example`). Edge Function gizli anahtarları Supabase
secrets'ta: `ANTHROPIC_API_KEY`, `CRON_SECRET`. `.env` varyantları ve
`.vercel` git'e **girmez**; yalnız `.env.example` istisna.

**Supabase projesi (13 Eki 2026):** `etezccrifaetzrgfvawl` (quiztacticsapp@gmail.com hesabı, eu-central-1, ücretsiz plan). Eski proje `zfpnxzybcpkxsotwdsey` = **eski (hub)** — diğer hub oyunları orada kalır; Quiz Tactics cron işleri orada durduruldu. Gizli anahtarlar: `ANTHROPIC_API_KEY`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

## Derleme — DÖRT GİRİŞ, DOKUNMA

`vite.config.js › rollupOptions.input` dört giriş taşır ve **koşulsuzdur**:

```
oyun: index.html · atolye: oyun/avatar3d/index.html
meydan: oyun/avatar3d/meydan.html · gardrop: oyun/avatar3d/gardrop.html
```

Liste bozulursa üç sayfa derlemeye girmez ve **canlıdan silinir**;
istekler SPA kabuğuna düşer. 12 Eylül 2026'da tam olarak bu oldu.
Liste **`vercel.json`'a taşınmaz** — derlemeye ait her şey
`vite.config.js`'te durur; oradaki tek üretim işi robots.txt + sitemap.xml.
(Üç avatar3d sayfası dondurulmuştur ama dosyalar ve giriş listesi durur.)

`VITE_MOD` ve iki-mod ayrımı KALKTI. Site kimliği `index.html` içinde
statiktir; derleme sırasında değiştirilmez.

## iOS Safari kontrolü — her arayüz değişikliğinden sonra

`position: fixed` ile `transform` **aynı öğede kullanılmaz**; yükseklikte
`100vh` yerine `100dvh`. iOS'ta bu ikisi birlikte sabitlemeyi bozar; 13
Eyl 2026'da `.tabbar` bu yüzden sayfayı bölüyordu. Aynı tuzak
**atalarda** da geçerlidir: `transform`, `filter`, `perspective` ya da
transform'lu animasyon içeren bir ata, içindeki `fixed` katmanları
kendine göre konumlandırır.

**Bu makinede WebKit ÇALIŞMIYOR** (17 Eyl 2026): Windows 11 Akıllı
Uygulama Denetimi imzasız WebKit DLL'lerini engelliyor (çıkış kodu
`0xC0E90002`). Denetimi kapatmak geri alınamaz bir güvenlik ayarıdır —
yapılmaz, WSL de yok. Bu cümle raporlara TEKRAR yazılmaz. Yerine:

```bash
npm run dev                      # başka bir kabukta
node araclar/arayuz-denetim.mjs  # --gorsel: ekran görüntüsü de alır
```

16 sayfayı dört genişlikte (1440 · 850 · 560 · 390) açar ve ölçer: yatay
taşma · sabit öğede transform · transform'lu ata · kaydırınca kayan sabit
menü · 44 px altı dokunma hedefi · konsol hatası. İlk çalışmada "Misafir
olarak dene" ile oturum açıp `.arayuz-denetim-oturum.json`'a yazar (git'e
girmez). Gerçek iOS kontrolü sahibinin telefonunda yapılır.

## Dal düzeni

- **Tek dal: `main`** (23 Eyl 2026, Ida kararı — oyunun henüz oyuncusu yok,
  inşa aşamasında). Doğrudan `main`'de çalışılır; her iş bitince `main`'e
  push edilir ve canlı (quiztactics.com) güncellenir.
- `gelistirme` dalı ve önizleme linki artık kullanılmaz.
- Canlıda doğrulama: `node araclar/oyuncu-testi.mjs --adres=https://quiztactics.com`.

## Yayın

Canlıya çıkış **yalnız GitHub üzerinden** olur (push → Vercel derler).
**Vercel'e doğrudan kaynak dağıtımı yapılmaz** — bir sonraki normal
push'ta sessizce silinir; 13 Eyl'de tam olarak bu oldu.

## Kurallar

- **Türkçe yaz** — kod, yorum, commit, yanıtlar.
- **Canlı DB'de test/simülasyon koşturma** — yerel Supabase (`supabase start`) kullan; `pg-mini.mjs` canlıyı yalnız `IZIN_CANLI_TEST=1` ile açar (9 Eki 2026, Disk IO kotası).
- **Minimal değişiklik** — mevcut kodu silme/bozma, sınıf adlarını koru.
  Dosyayı baştan yazmak yerine hedefli düzenleme yap.
- **Hata için özür dileme.** Doğrudan bul ve düzelt. Bir hatayı
  düzelttikten sonra aynı hatayı başka dosyalarda da ara.
- Tüm Supabase/API çağrılarında **try-catch** ve hata yönetimi.
- **Emin değilsen tahmin etme — ölç.** Tarayıcıda/veritabanında doğrula,
  kök sebebi raporla.
- **DB güvenliği:** RLS + RPC'ler `security definer`, yalnız
  `authenticated` rolü. İstemciye güvenme; kritik mantığı (satın alma,
  puanlama, maç durumu) `FOR UPDATE` kilidiyle sunucuda çöz.
- **Yetki/izin/güvenlik kuralı değişikliği önce sorulur** (Ida, 24 Eyl 2026): RLS politikası,
  Storage politikası, GRANT/REVOKE, `security definer` yetkisi, sahip/yönetici kontrolü ya da
  benzeri bir güvenlik kuralını değiştirmeden önce — **geçici bile olsa** — alt ajan ana oturuma,
  ana oturum Ida'ya sorar. Kalıcı onay listesinde (dosya silme, deploy, migration) bu yoktur.
- **Migration'lar sıralıdır** — mevcut migration'ı düzenleme, yeni
  numaralı dosya ekle (`20260612000NNN_ad.sql`). Soru eklerken `soru`
  kolonu UNIQUE olduğundan `on conflict (soru) do nothing`.
- **Soru üretimi: yeni zor soru üretilmez; üretim yalnız kolay ve orta**
  (Ida, 23 Eyl 2026 — sorular normal oyuncu için fazla zor). Ayrıntı
  PROJECT_CONTEXT › Ortak mekanik.
- **Yeni paket kurma.** Tailwind, Framer Motion, styled-components ve
  benzeri yasak. Mevcut yapı: düz CSS + CSS değişkenleri.
- **Bot paritesi (Ida, 17 Eki 2026):** yeni mod ya da modun yeni özelliği (joker/skill, tepki, karar) eklenirken botlar öteki
  modlardaki botlarla aynı insan gibi davranış kontrolünden geçer: joker/skill kullanır (insanla AYNI kural fonksiyonundan,
  ayarlanabilir yüzdeyle), cevap süresi insan gibi değişkendir, yanlış yapar (`bot_soru_isabet`), tepki atar; moda özgü
  kararları da verir. Eksik bırakılırsa raporda açıkça yazılır. Son denetim: `docs/raporlar/RAPOR-bot-joker.md`.
- Git/teknik terim kullanırken kısa bir sadeleştirme ekle
  (ör. "rebase yaptım (commit'ini güncel hale getirdim)").

## Jev (TypeSafe) ne zaman kullanılır
**JEV KAPALI (kredi bitti, 16 Eki 2026): kullanma, karar adımlarını kendin ver.**

Jev metin üretmez; kapalı uçlu bir soruya güven skoruyla cevap verir.
Maliyeti LLM'in yüzde biri kadardır. Amaç: toplu değerlendirme işini
Claude Code'un bağlamından çıkarmak.

**Kural:** Metin yazmayı gerektirmeyen her karar adımında (dosya seçimi,
hata sınıflama, bulgu önceliği, commit öncesi kontrol — bkz. aşağıdaki
"Jev iş akışı" bölümü) ve yüzlerce kalemlik değerlendirmelerde önce Jev.

Jev'e ver — üçü birden doğruysa:
1. Soru kapalı uçlu (şıklardan biri, evet/hayır, sabit liste)
2. Cevap nesnel olarak doğru/yanlış ayrılabiliyor (zevk meselesi değil)
3. Kalem sayısı çok (onlarca, yüzlerce)

Jev'e verme: kod, tasarım, metin yazımı, "hangisi daha iyi" gibi zevk kararları,
ekran görüntüsü değerlendirme.

Somut örnekler: yeni soruların kalite kapısı, kategori/zorluk atama,
çeviri kontrolü, muğlak soru tespiti, şık ipucu taraması.

Nasıl çağrılacağı: typesafe skill'i kurulu (`/typesafe:typesafe-ai`).
Mevcut araçlar: `araclar/jev.mjs`, `araclar/jev-tarama.mjs`,
`araclar/jev-tarama-en.mjs`. Anahtar `.env` içinde `TYPESAFE_API_KEY`
(VITE_ öneki YOK — istemciye sızmamalı).

Sınır: Jev yalnız geliştirme/kalite işlerinde kullanılır. Oyunun içine
(mesaj filtresi, takma ad moderasyonu vb.) yayından önce KONULMAYACAK —
Ida'nın kararı.

## Çalışma düzeni — SAHİBİNİN İSTEDİĞİ AKIŞ

Sahibi kod yazmaz, dosya taşımaz. Verilen görevi baştan sona kendin
bitirirsin:

- **Durma, adım adım onay isteme.** Görev bitene kadar devam et.
  Dosya silme, deploy ve migration uygulama için **kalıcı onay** verildi;
  yalnız bu listede olmayan geri dönüşsüz bir işlem çıkarsa sor.
- Her mantıksal adım **ayrı commit**, mesajlar Türkçe.
- `npm run build` hatasız olmalı; migration'ları canlıya uygula.
- İşi bitirince `main`'e push et, Vercel dağıtımının bittiğini ve canlıda
  çalıştığını doğrula (bkz. Dal düzeni).
- **Kendi kendini test et.** Sahibinden bir şey kontrol etmesini isteme.
- Bitince **tek kısa özet**: hangi dosyalar değişti, kaç migration
  eklendi/uygulandı, build sonucu, push/dağıtım durumu, ne doğrulandı.

**İstisna:** yalnızca sahibinin bilebileceği bir şey varsa (gerçek şifre,
API anahtarı doğruluğu, ürün kararı) sor.

## Siteyi tarama/test

- **TAM TEST KAPSAMI (Ida, 16 Eki 2026):** her test `docs/TEST-KAPSAMI.md`'nin **tamamını** koşar (dokunma, görünüm,
  animasyon, ses — sonuna kadar çaldı mı / kim kesti / kalan ms —, zamanlama, akış, veri, konsol; 360×640 + 390×844, TR + EN,
  yavaş telefon taklidi; bütün modlar ve sayfalar). Testi o günkü şikâyete göre daraltmak **yasak**; koşulamayan madde raporda
  **BAKILAMADI + nedeni** yazar.
- Oyun masaüstü tarayıcıda **`https://quiztactics.com/?dev=1`** ile açılır (kurulum kapısı geçilir; oturum boyunca
  hatırlanır, sekme kapanınca biter). Bu adres arayüz metinlerinde geçmez.
- **Robot doğrulaması (Cloudflare Turnstile) çıkarsa dur** ve Ida'ya bırak; aşmaya, tekrar tekrar denemeye çalışma.
- Test **Ida'nın hesabıyla** yapılır (yeni hesap/misafir açılmaz, başka oyuncuya işlem yapılmaz).
- **Arayüz denetim aracına (`araclar/arayuz-denetim.mjs`) Ida oturumu VERİLMEZ** (16 Eki 2026: `--oturum` ile verilen Ida
  oturumu iş sonunda `hesabimi_sil` ile silindi, hesap yedekten geri yüklendi). Araç yalnız kendi açtığı misafir
  hesabını siler; başka oturumda silmeyi reddeder. Hesap silen herhangi bir araca (`hesabimi_sil`, `--sil`, admin
  users DELETE) Ida oturumu verilmeden önce aracın tamamı okunur.
- **Oyunun ses/müzik ayarına dokunma:** ayar o cihazdaki uygulamayla ortaktır (`bildim_muzik` / `bildim_ses`); açıp
  kapatmak telefondaki oyuncunun deneyimini de değiştirir.
- **Telefon hızındaki kasmaları masaüstü tarayıcı göstermez.** Bunun için `araclar/yavas-android-olcum.mjs`
  (CPU 6x yavaş + yavaş 4G + 390×844 Android UA, soğuk/sıcak açılış). Canlı veritabanına yük kuralları (yukarıda) aynen geçerli.

## Jev iş akışı (bütün projeler)
**JEV KAPALI (kredi bitti, 16 Eki 2026): kullanma, karar adımlarını kendin ver.**

<!-- TEK KAYNAK: C:/Users/ida/.claude/jev/is-akisi.md — bu bölüm oradan birebir kopyalanır
     (~/.claude/skills/jev-akis/SKILL.md, ~/.codex/AGENTS.md, proje AGENTS.md). Değiştirirken kaynağı değiştir. -->

Jev (TypeSafe System One) metin üretmez; kapalı uçlu sorulara olasılıkla cevap verir ve çok ucuzdur. Metin yazmayı
gerektirmeyen her karar adımını ÖNCE Jev'e ver. Araç: `node C:/Users/ida/.claude/jev/jev.mjs <komut> --girdi dosya.json`
(ya da stdin; çıktı JSON). Komutlar: `sirala` {soru, adaylar:[{id, metin}]} · `kontrol` {kanit, sorular:[{id, soru}]} ·
`sinifla` {kalemler:[{id, metin}], siniflar:{kod: açıklama}} · `puanla` {kalemler, olcek:[düşük…yüksek], soru} · `rapor` ·
`dosya-sec "<soru>" [--desen regex]`.

1. **Dosya seçimi:** okumadan önce tek komut: `node C:/Users/ida/.claude/jev/jev.mjs dosya-sec "<ne arıyorsun>" [--desen "kodAdı|diğer"]`
   (adayları kendisi bulur, özetler, sıralar) → yalnız `oku` listesini oku. Özel aday listen varsa `sirala`. "Bakayım" diye
   dosya açma. Büyük dosyada önce bölüm adaylarını (fonksiyon/başlık) sırala.
2. **Hata ayıklama:** derleme, test, lint, konsol, ağ hataları ve denetim çıktıları → `sinifla`
   (gercek / gurultu / eski / ortam). Yalnız `gercek` olanları incele.
3. **Bulgu önceliği:** denetim/inceleme bulguları → `puanla` (olcek: cila, onemli, engelleyici).
4. **Değişiklik kontrolü:** commit öncesi diff özeti + görev maddeleri → `kontrol` (her madde yapıldı mı, kapsam dışı
   dosyaya dokunuldu mu, istenmeden silinen kod var mı). `hayir`/`belirsiz` çıkan maddeye bak.
5. **Log / hata raporları** (Sentry vb.): aynı kök sebebe göre grupla (`sinifla`), ciddiyeti `puanla`.
6. **Veri kalitesi işleri** (soru bankası, içerik listeleri): doğruluk, kategori, zorluk, tekrar, çeviri anlamı —
   yüzlerce kalemlik işlerde her zaman Jev.
7. **`karar: "incele"`** çıkarsa veya girdi ~30k token'ı aşarsa: böl ya da kendin karar ver.
   **`karar: "kendin_karar_ver"`** dönerse (Jev'e ulaşılamadı) iş durmaz: Jev'siz devam et. Çıktıda
   `sebep: "jev_devre_disi"` görürsen oturumda BİR KEZ tek satır söyle: "Jev kredisi bitmiş görünüyor, Jev'siz devam ediyorum."

**Tehlikeli komut kapısı** (`~/.claude/jev/kapi.mjs`, Claude Code PreToolUse): bariz yıkıcı kalıplar (rm -rf, del/rmdir /s,
Remove-Item -Recurse -Force, git reset --hard, git push --force, git clean -f, komut satırında DROP/TRUNCATE/DELETE FROM,
.env'e yazma) her zaman onay ister. **Migration uygulama** (`node araclar/migration-uygula.mjs <dosya>`, `supabase db push`)
kalıcı onaylıdır, sorulmadan geçer; TEK istisna: uygulanacak migration dosyasında DROP TABLE, TRUNCATE ya da WHERE'siz DELETE
varsa (ya da dosya okunamazsa) yine sorar (db push'ta en yeni 10 migration taranır). Belirsiz kalıplar Jev'e sorulur.

Jev'in yapamadıkları (Claude/Codex'te kalır): resim/ekran görüntüsü değerlendirme, kod/metin yazma, çok adımlı akıl yürütme.
Aday dosyaları bulmak için (Claude Code) salt-okunur `dosya-arayici` alt ajanı (Haiku) kullanılabilir; sıralamayı Jev yapar.
Harcama: `node C:/Users/ida/.claude/jev/jev.mjs rapor` (proje ve güne göre çağrı / token).

- Test hesapları iş bitince sormadan silinir (sahip ve botlar hariç). Araç: `IZIN_CANLI_TEST=1 node araclar/test-hesap-temizle.mjs [--uygula]` (varsayılan DRY-RUN).
