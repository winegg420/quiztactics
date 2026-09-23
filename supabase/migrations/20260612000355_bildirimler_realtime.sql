-- 355 · bildirimler tablosu Realtime yayınında YOKTU (ölçüldü: pg_publication_tables boş).
-- BildirimToast `postgres_changes INSERT bildirimler` dinliyor ama hiç olay gelmiyordu →
-- uygulama içi tost (davet ödülü dahil) hiçbir bildirimde çıkmıyordu; yalnız zil listesi doluyordu.
-- Hacim düşük (haftada ~120 satır); RLS (bildirimler_select_own) olayları sahibine süzer.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bildirimler') then
    execute 'alter publication supabase_realtime add table public.bildirimler';
  end if;
end $$;
