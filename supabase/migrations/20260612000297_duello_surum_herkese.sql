-- ============================================================
-- 297 — Düello 1.0 herkese açık (23 Eyl 2026, Ida kararı)
--
-- Genel bayrak duello_surum 1 → 2. Yeni açılan her düello sürüm 2'dir
-- (duello_olustur, 276). Test listesi (duello_v2_test_kullanicilari) ve
-- v1 fonksiyonları SİLİNMEZ; yalnız artık belirleyici değildir.
-- Açık v1 maçları kendi akışıyla biter (surum satırda sabittir).
-- ============================================================
update public.oyun_ayarlari
   set deger = '2'::jsonb
 where anahtar = 'duello_surum';

do $$
begin
  if public.ayar_sayi('duello_surum', 1) <> 2 then
    raise exception 'duello_surum 2 olmadı';
  end if;
end $$;
