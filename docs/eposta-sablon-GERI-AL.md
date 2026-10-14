# E-posta şablonları — geri alma

Şablonlar Supabase Auth ayarında durur (Management API `PATCH /v1/projects/etezccrifaetzrgfvawl/config/auth`).
Uygulama aracı: `araclar/eposta-sablon-uygula.mjs <json>` — yalnız `mailer_templates_*` / `mailer_subjects_*`
anahtarlarını gönderir, sonra yeniden okuyup doğrular. Belirteç `SUPABASE_PAT` ortam değişkeninden okunur
(Supabase CLI'nin Windows Kimlik Yöneticisi kaydı; dosyaya yazılmaz).

| Dosya | Ne |
|---|---|
| `docs/eposta-sablon-yedek-20261014.json` | **Asıl yedek** (14 Eki 2026 öncesi): iki dilli, yalnız bağlantı, kod yok. |
| `docs/eposta-sablon-kodlu-20261014.json` | Aşama 3: iki dilli, kod + bağlantı birlikte. |
| `docs/eposta-sablon-tekdil-20261014.json` | **Şu an canlıda** (Yalnız uygulama A): tek dil (TR ya da EN), yalnız kod, bağlantı yok. |

## Geri almak

```bash
# Aşama 3 hâline (kod + bağlantı, iki dil) — önerilen geri dönüş
SUPABASE_PAT=… node araclar/eposta-sablon-uygula.mjs docs/eposta-sablon-kodlu-20261014.json
# En baştaki hâle (yalnız bağlantı) — uygulama içi kod girişi o zaman çalışmaz
SUPABASE_PAT=… node araclar/eposta-sablon-uygula.mjs docs/eposta-sablon-yedek-20261014.json
```

Geri alma uygulama kodunu bozmaz: istemci `emailRedirectTo` olarak `<origin>/?dil=tr|en` gönderir; eski
şablonlar bunu yalnız bağlantı adresi olarak kullanır.

## Dil nasıl seçiliyor

İstemci (Login, HesapGuvence) `emailRedirectTo = <origin>/?dil=<uygulamanın seçili dili>` gönderir. Adres izin
listesinde (`https://quiztactics.com/**`, `https://www.quiztactics.com/**`) olduğu için Supabase olduğu gibi
saklar (14 Eki 2026, admin generate_link ile ölçüldü; listede olmayan adres Site URL'e düşer → Türkçe).
Şablon: `{{ $en := or (eq .RedirectTo "https://quiztactics.com/?dil=en") (eq .RedirectTo "https://www.quiztactics.com/?dil=en") }}`
→ `{{ if $en }}İngilizce{{ else }}Türkçe{{ end }}`. Kullanıcı metadata'sı kullanılmaz (eski hesaplarda güncel
değil; eksik anahtar şablon hatası verebilir). Localhost ve önizleme adresleri her zaman Türkçe alır.

## Neden Send Email Hook değil

Ölçüm (14 Eki 2026): hook kapalı, gönderim Resend SMTP ile çalışıyor. Hook için yeni bir Edge Function +
Resend anahtarının ayrıca gizli değişken olarak kopyalanması gerekirdi; fonksiyon hata verirse e-posta HİÇ
gitmez. Şablon koşulu mevcut, çalışan gönderim yolunu değiştirmez ve dil istek anında istemciden gelir
(mevcut kullanıcıda da güvenilir).

## Gönderim başarısız olursa

Şablon çalıştırma hatası (ör. sözdizimi) e-postanın gitmemesine yol açar → istemci "E-posta şu an
gönderilemedi… Google ile devam et" der; misafir girişi her zaman açık. Bu durumda yukarıdaki geri alma
komutunu çalıştır (≈10 sn).
