-- 690: Kart arka planları — kart karşılığı henüz ONAYLANMAMIŞ üç arka planı dükkândan GEÇİCİ kapat.
-- Ida (30 Eyl): Su Altı, Yağan Kar, Düşen Sonbahar Yaprakları oyuna bağlandı (kartın arkasında).
-- Yükselen Köz, Yıldızlı Gece, Kuzey Işıkları kart olarak çizilip Ida onaylayana kadar satışta değil.
-- SİLİNMEZ: kalemler kozmetikler'de durur, sahiplik (oyuncu_kozmetikleri) ve fiyat aynı; takılıysa
-- oyuncu_kartlari zaten aktif olmayan kalemi null verir → kart arka planı boş (düz kart) görünür.
-- GERİ AÇMAK (onaydan sonra): update public.kozmetikler set aktif = true where anahtar in ('pa_kor','pa_gece','pa_kuzey');
--   + oyun/tasarim/arka-plan/kayit.jsx › KAYIT'a kor / gece / kuzey satırları.
update public.kozmetikler set aktif = false where anahtar in ('pa_kor', 'pa_gece', 'pa_kuzey');

do $$
declare v text;
begin
  select string_agg(anahtar || '=' || aktif::text, ', ' order by sira) into v
    from public.kozmetikler where tur = 'premium_aura';
  raise notice '690 premium_aura aktif durumu: %', v;
end $$;
