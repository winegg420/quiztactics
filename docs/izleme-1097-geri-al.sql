-- 1097 izleme_kaydi GERİ ALMA. Tek seferde çalıştırılır (pg-mini ya da SQL düzenleyici).
-- İstemci (src/lib/izlemeKaydi.js) RPC yoksa sessizce atlar; önce istemciyi geri almak gerekmez.
-- /api/saglik saglik_ping yoksa 503 döner — UptimeRobot'u da kapat.
begin;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'bildim-izleme-uyari') then
    perform cron.unschedule('bildim-izleme-uyari');
  end if;
end $$;
drop trigger if exists trg_profiles_izleme_kayit on public.profiles;
drop function if exists public.izleme_kayit_olayi();
drop function if exists public.istemci_kayit_yaz(uuid, text, text, jsonb, jsonb);
drop function if exists public.izleme_uyari_kontrol(boolean);
drop function if exists public.izleme_ozeti();
drop function if exists public.saglik_ping();
drop function if exists public.izleme_kota(text, int, int);
drop function if exists public.izleme_temizle(text, int);
delete from public.rpc_sayac where uc_adi in ('izleme_hata', 'izleme_olay');

-- kayit_budama 1058 hâline döner (izleme tabloları silinmeden ÖNCE).
create or replace function public.kayit_budama()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_cron int := 0;
  v_sayac int := 0;
  v_net int := 0;
begin
  delete from cron.job_run_details
   where end_time < now() - interval '6 hours'
      or (end_time is null and start_time < now() - interval '1 day');
  get diagnostics v_cron = row_count;
  -- En uzun pencere 24 saat (günlük davet/istek tavanı, 1053): 2 günden eski pencere zaten sıfırlanır.
  delete from public.rpc_sayac where pencere_baslangic < now() - interval '2 days';
  get diagnostics v_sayac = row_count;
  if to_regclass('net._http_response') is not null then
    execute 'delete from net._http_response where created < now() - interval ''1 day''';
    get diagnostics v_net = row_count;
  end if;
  return jsonb_build_object('cron', v_cron, 'rpc_sayac', v_sayac, 'net', v_net);
end $f$;
revoke all on function public.kayit_budama() from public, anon, authenticated;
grant execute on function public.kayit_budama() to service_role;

drop table if exists public.istemci_hata;
drop table if exists public.olay_kaydi;
drop table if exists public.izleme_uyari;
delete from supabase_migrations.schema_migrations where version = '20260612001097';
commit;
