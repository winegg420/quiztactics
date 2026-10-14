# generate-questions — devre dışı (14 Eki 2026, Paket 4)

Claude API ile soru üreten Edge Function kullanılmıyor (saatlik cron 215'te kapatıldı; sorular
migration'larla ekleniyor). **Silinmedi**, yalnız çağrılamaz hâle getirildi:

1. **JWT zorunlu:** `supabase/config.toml › [functions.generate-questions] verify_jwt = true`.
   Anahtarsız/oturumsuz istek fonksiyona hiç ulaşmaz (401, Supabase ağ geçidi).
2. **Kod kapısı:** `supabase/functions/generate-questions/index.ts` en başta
   `SORU_URET_ACIK` sırrına bakar; `"1"` değilse hiçbir iş yapmadan **410 Gone** döner
   (Anthropic çağrısı yok, veritabanı sorgusu yok).

Canlı proje: `etezccrifaetzrgfvawl`.

## Geri açmak

```bash
# 1) Kod kapısını aç (sır)
npx supabase secrets set SORU_URET_ACIK=1 --project-ref etezccrifaetzrgfvawl

# 2) Cron (x-cron-secret) ile çağrılacaksa JWT'yi kapat: config.toml'da verify_jwt = false yap, sonra
npx supabase functions deploy generate-questions --project-ref etezccrifaetzrgfvawl
```

- Yalnız elle bir kez çalıştırmak için 2. adım gerekmez: istekte `Authorization: Bearer <service_role
  anahtarı>` ve `x-cron-secret: <CRON_SECRET>` başlıklarıyla `POST` at.
- `ANTHROPIC_API_KEY` ve `CRON_SECRET` sırlarının tanımlı olduğunu kontrol et
  (`npx supabase secrets list --project-ref etezccrifaetzrgfvawl`).
- Tekrar kapatmak: `npx supabase secrets unset SORU_URET_ACIK --project-ref etezccrifaetzrgfvawl`
  (kod kapısı hemen devreye girer; yeniden dağıtım gerekmez).
