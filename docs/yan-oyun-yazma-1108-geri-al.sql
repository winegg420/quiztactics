-- 1108 geri alma: kaldırılan yan oyun yazma politikaları, kaldırılmadan önceki tam tanımlarıyla (canlıdan pg_policies, 15 Eki 2026).
-- Uygulamadan önce RLS'in bu tablolarda açık olduğunu doğrula (alter table ... enable row level security zaten açık).

create policy races_insert_auth on public.pr_races
  for insert to authenticated
  with check (true);

create policy races_update_auth on public.pr_races
  for update to authenticated
  using (true);

create policy error_logs_insert_auth on public.pr_error_logs
  for insert to authenticated
  with check (true);

create policy ghosts_insert_auth on public.dg_ghosts
  for insert to authenticated
  with check (auth.uid() is not null);

create policy ghosts_update_auth on public.dg_ghosts
  for update to authenticated
  using (auth.uid() is not null);

-- İzleme huni fonksiyonunu 1107 gövdesine döndürmek için: supabase/migrations/20260612001107_izleme_funnel.sql yeniden uygulanır.
