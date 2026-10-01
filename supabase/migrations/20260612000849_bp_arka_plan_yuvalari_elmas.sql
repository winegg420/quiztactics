-- 849 · Battle Pass'teki ARKA PLAN yuvaları → ELMAS (arka planlar dondurulduğu için; Ida, 1 Eki 2026).
-- Yuvalar (822): seviye 8 ücretli = Yıldızlı Gece (pa_gece, nadir) · seviye 17 ücretli = Su Altı (pa_sualti, epik).
-- Komşu ücretli elmas yuvaları: 1:20 · 7:20 · 11:20 · 16:25 · 20:25 · 24:30 → seviye 8 = 25 elmas (7/11'in 20'si + nadir yuva payı),
-- seviye 17 = 30 elmas (16/20'nin 25'i + epik yuva payı, 24'teki 30 ile aynı basamak).
-- Yalnız HENÜZ KİMSE ALMADIYSA (oyuncu_bp_odul_alimi'nde o yuva için kayıt yoksa) güncellenir; alınmış yuvaya DOKUNULMAZ.
-- trg_bp_odul_doldur ve bp_odul_uygula'daki 'arka_plan' dalına dokunulmadı (kod kalır).
--
-- GERİ ALMAK (eski değerler):
--   update public.bp_seviye_odulleri set tur = 'arka_plan', veri = '{"sanat": "gece", "anahtar": "pa_gece"}',
--          ad_tr = 'Yıldızlı Gece arka planı', ad_en = 'Starry Night background', nadirlik = 'nadir'
--    where seviye = 8 and kol = 'ucretli';
--   update public.bp_seviye_odulleri set tur = 'arka_plan', veri = '{"sanat": "sualti", "anahtar": "pa_sualti"}',
--          ad_tr = 'Su Altı arka planı', ad_en = 'Underwater background', nadirlik = 'epik'
--    where seviye = 17 and kol = 'ucretli';
update public.bp_seviye_odulleri set tur = 'elmas', veri = '{"miktar": 25}', ad_tr = '25 elmas', ad_en = '25 gems', nadirlik = null
 where seviye = 8 and kol = 'ucretli' and tur = 'arka_plan'
   and not exists (select 1 from public.oyuncu_bp_odul_alimi a where a.seviye = 8 and a.kol = 'ucretli');
update public.bp_seviye_odulleri set tur = 'elmas', veri = '{"miktar": 30}', ad_tr = '30 elmas', ad_en = '30 gems', nadirlik = null
 where seviye = 17 and kol = 'ucretli' and tur = 'arka_plan'
   and not exists (select 1 from public.oyuncu_bp_odul_alimi a where a.seviye = 17 and a.kol = 'ucretli');

do $$
declare v_kalan int; v_rapor text;
begin
  select count(*) into v_kalan from public.bp_seviye_odulleri where tur = 'arka_plan';
  select string_agg(seviye || ' ' || kol || ' ' || tur || ' ' || (veri::text), ' · ' order by seviye) into v_rapor
    from public.bp_seviye_odulleri where kol = 'ucretli' and seviye in (8, 17);
  if v_kalan <> 0 then raise exception '849: arka_plan yuvası kaldı (%) — alınmış kayıt var mı?', v_kalan; end if;
  raise notice '849 %', v_rapor;
end $$;
