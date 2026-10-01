-- 831 — 830'daki sarmalayıcıları cron'a bağla (yalnız KOMUT değişir; zamanlama ve iş adları aynı).
--
-- Aralık: duello_tik ve bildim-bot-oyna '2 seconds' olarak kalır; sarmalayıcı ilk koşuda iş yoksa
-- kendini 15 sn'ye çeker, bir oyun/maç doğunca tetikleyici 2 sn'ye geri alır (bkz. 830).
--
-- GERİ ALMA (bu dosyanın tersi; 830'daki nesneler zararsız kalır, istenirse ayrıca silinir):
--   select cron.alter_job((select jobid from cron.job where jobname = 'duello_tik'),
--                         schedule := '2 seconds', command := 'select public.duello_tik_hepsi()');
--   select cron.alter_job((select jobid from cron.job where jobname = 'bildim-bot-oyna'),
--                         schedule := '2 seconds', command := 'select public.bot_oyna()');
--   select cron.alter_job((select jobid from cron.job where jobname = 'bildim-turnuva-zamanlayici'),
--                         command := 'select public.turnuva_zamanlayici_tik()');
--   select cron.alter_job((select jobid from cron.job where jobname = 'bildim-bot-turnuva-tik'),
--                         command := 'select public.bot_turnuva_katilim_tik()');
--   select cron.alter_job((select jobid from cron.job where jobname = 'bildim-sezon-tik'),
--                         command := 'select public.sezon_tik()');

do $$
declare
  v record;
begin
  for v in
    select * from (values
      ('duello_tik',                   'select public.cron_duello_tik()'),
      ('bildim-bot-oyna',              'select public.cron_bot_oyna()'),
      ('bildim-turnuva-zamanlayici',   'select public.cron_turnuva_zamanlayici_tik()'),
      ('bildim-bot-turnuva-tik',       'select public.cron_bot_turnuva_katilim_tik()'),
      ('bildim-sezon-tik',             'select public.cron_sezon_tik()')
    ) as t(isim, komut)
  loop
    perform cron.alter_job(j.jobid, command := v.komut)
       from cron.job j where j.jobname = v.isim;
  end loop;
end $$;
