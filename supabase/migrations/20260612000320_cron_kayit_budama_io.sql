-- ============================================================
-- Disk IO: pg_cron çalışma kayıtları + gereksiz cron (23 Eyl 2026)
--
-- KUSUR: Supabase "Disk IO bütçesi tükeniyor" uyarısı. pg_stat_statements ölçümü:
-- yazma yükünün başı pg_cron'un her koşu için cron.job_run_details'e yazdığı üç satır
-- işlemi (insert + 2 update). 2 saniyelik iki iş (bot_oyna, duello_tik_hepsi) ve beş
-- dakikalık işle günde ~100 bin koşu; tablo hiç budanmadığı için 323 MB'a şişti
-- (2,1 milyon insert). Ayrıca dondurulmuş Meydan'ın ikram zaman aşımı işi her dakika
-- boşuna çalışıyordu.
--
-- ÇÖZÜM:
--  1) Çalışma kayıtları bir kez boşaltılır (TRUNCATE: satır taramaz, IO'suz).
--  2) Saatlik budama: 6 saatten eski kayıtlar silinir (tablo küçük kalır).
--  3) Meydan dondurulmuşken `bildim-ikram-zaman-asimi` kapatılır (silinmez; Meydan
--     açılınca `select cron.alter_job(<id>, active := true)`).
-- Oyun işleri (bot_oyna, duello_tik_hepsi, turnuva) ve sıklıkları DEĞİŞMEDİ.
-- ============================================================

truncate table cron.job_run_details;

select cron.unschedule(jobid) from cron.job where jobname = 'bildim-cron-kayit-budama';
select cron.schedule(
  'bildim-cron-kayit-budama',
  '17 * * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '6 hours'$$
);

select cron.alter_job(jobid, active := false) from cron.job where jobname = 'bildim-ikram-zaman-asimi';
