# Bekleyen migration'lar — UYGULANMADI

1000 yeni soru (270–273) ve Jev zorluk seviyeleri (274). 22 Eyl 2026'da Şerit D
üretti, provadan geçti; aynı gün Ida "soru üretimini durdur" dedi. Canlıya
uygulanmadılar ve `supabase/migrations/` dışında tutuluyorlar ki `db push`
kazara uygulamasın.

Açmaya karar verilirse: dosyaları aynı adlarla `supabase/migrations/` altına
geri taşı ve uygula. 274'ten önce karar: `soru_sec` yalnız `zorluk >= 2`
sorulardan seçer; 274 havuzun en kolay %10'unu (≈938 soru) zorluk 1 yapar ve
bunlar Klasik/Düello/Grup'tan çıkar (yalnız turnuva ısınması). Ayrıntı:
`../OKU.md`, `../ozet.json`.
