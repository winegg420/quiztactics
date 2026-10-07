-- ============================================================
-- 992 · bildim-bot-oyna iş varken 2 sn → 5 sn (Ida kararı, 8 Eki 2026)
--
-- NEDEN: 7 Eki 18:02'den beri Supabase projesi kesintili donuyor (cron işleri topluca 10–47 sn,
-- 256 "job startup timeout", REST/Auth 504; ölçüm PROGRESS.md 8 Eki kaydı). En sık çalışan iş
-- bildim-bot-oyna: iş varken saatte 1800 koşu. Aralık 5 sn → koşu sayısı 2,5 kat azalır.
--
-- ETKİ: bot cevabı planlanan anından en çok 5 sn (eskiden 2 sn) sonra işlenir. Gecikme tavanı
-- bot_gecikme_tavan = 8 sn → oyuncunun bota en kötü beklemesi 10 sn → 13 sn (15 sn'lik soru
-- içinde kalır). Boşta aralık (15 sn) ve duello_tik değişmedi.
--
-- Değişen: cron_aralik_ayarla izin listesine '5 seconds' eklendi; cron_bot_oyna iş varken
-- '5 seconds' ister; canlı iş hemen 5 sn'ye alınır (2 sn'deyse). İmzalar, sahiplik, GRANT aynı.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cron_aralik_ayarla(p_isim text, p_aralik text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
  v_mevcut text;
begin
  -- Yalnız bu iki iş (savunma derinliği: yanlış ada dokunulmaz).
  if p_isim not in ('duello_tik', 'bildim-bot-oyna') then return; end if;
  if p_aralik not in ('2 seconds', '5 seconds', '15 seconds') then return; end if;   -- 992: 5 sn
  select j.jobid, j.schedule into v_id, v_mevcut from cron.job j where j.jobname = p_isim;
  if v_id is null or v_mevcut = p_aralik then return; end if;
  perform cron.alter_job(v_id, schedule := p_aralik);
exception when others then
  raise warning 'cron_aralik_ayarla(%, %): %', p_isim, p_aralik, sqlerrm;
end $function$;

CREATE OR REPLACE FUNCTION public.cron_bot_oyna()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.matches where durum = 'aktif')
     or exists (select 1 from public.matches m
                  join public.profiles p on p.id = m.oyuncu2 and p.is_bot
                 where m.durum = 'bekliyor')
     or exists (select 1 from public.tournaments where durum = 'aktif')
     or exists (select 1 from public.group_matches where durum in ('bekliyor', 'aktif'))
     or exists (select 1 from public.hizli_maclar where durum in ('bekliyor', 'aktif'))
     or exists (select 1 from public.bot_tepki_bekleyen) then
    perform public.cron_aralik_ayarla('bildim-bot-oyna', '5 seconds');   -- 992: 2 → 5 sn
    perform public.bot_oyna();
    return;
  end if;
  perform public.cron_aralik_ayarla('bildim-bot-oyna', '15 seconds');
end $function$;

-- Canlı iş 2 sn'deyse hemen 5 sn'ye (boşta 15 sn'deyse dokunulmaz; ilk iş anında cron_bot_oyna ayarlar)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'bildim-bot-oyna' and schedule = '2 seconds') then
    perform public.cron_aralik_ayarla('bildim-bot-oyna', '5 seconds');
  end if;
end $$;
