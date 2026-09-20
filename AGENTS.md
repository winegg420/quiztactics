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

Aynı anda **tek araç** çalışır. Biri işini bitirip push etmeden diğeri
başlamaz. Oturum başında `git pull`, sonunda commit + `main`'e push.
**Commit edilmemiş iş bırakma** — yarım kalsa bile commit et.

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

## Yayın

Canlıya çıkış **yalnız GitHub üzerinden** olur (push → Vercel derler).
**Vercel'e doğrudan kaynak dağıtımı yapılmaz** — bir sonraki normal
push'ta sessizce silinir; 13 Eyl'de tam olarak bu oldu.

## Kurallar

- **Türkçe yaz** — kod, yorum, commit, yanıtlar.
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
- **Migration'lar sıralıdır** — mevcut migration'ı düzenleme, yeni
  numaralı dosya ekle (`20260612000NNN_ad.sql`). Soru eklerken `soru`
  kolonu UNIQUE olduğundan `on conflict (soru) do nothing`.
- **Yeni paket kurma.** Tailwind, Framer Motion, styled-components ve
  benzeri yasak. Mevcut yapı: düz CSS + CSS değişkenleri.
- Git/teknik terim kullanırken kısa bir sadeleştirme ekle
  (ör. "rebase yaptım (commit'ini güncel hale getirdim)").

## Çalışma düzeni — SAHİBİNİN İSTEDİĞİ AKIŞ

Sahibi kod yazmaz, dosya taşımaz. Verilen görevi baştan sona kendin
bitirirsin:

- **Durma, adım adım onay isteme.** Görev bitene kadar devam et.
  Dosya silme, deploy ve migration uygulama için **kalıcı onay** verildi;
  yalnız bu listede olmayan geri dönüşsüz bir işlem çıkarsa sor.
- Her mantıksal adım **ayrı commit**, mesajlar Türkçe.
- `npm run build` hatasız olmalı; migration'ları canlıya uygula.
- İşi bitirince `main`'e push et ve dağıtımın bittiğini doğrula.
- **Kendi kendini test et.** Sahibinden bir şey kontrol etmesini isteme.
- Bitince **tek kısa özet**: hangi dosyalar değişti, kaç migration
  eklendi/uygulandı, build sonucu, push/dağıtım durumu, ne doğrulandı.

**İstisna:** yalnızca sahibinin bilebileceği bir şey varsa (gerçek şifre,
API anahtarı doğruluğu, ürün kararı) sor.
