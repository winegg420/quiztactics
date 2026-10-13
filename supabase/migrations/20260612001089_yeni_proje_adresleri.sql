-- 1089: Supabase taşıması (13 Eki 2026) — eski proje (zfpnxzybcpkxsotwdsey, "eski (hub)")
-- adresi yeni projeye (etezccrifaetzrgfvawl) çevrilir.
--  1) Gövdesinde eski ref geçen public fonksiyonlar (send-push adresi, avatar kova kontrolü)
--     aynı tanımla, yalnız ref değiştirilerek yeniden oluşturulur. CREATE OR REPLACE
--     sahipliği, yetkileri (EXECUTE) ve security definer ayarını korur.
--  2) public tablolardaki metin/jsonb verilerinde geçen eski Storage adresleri
--     (ör. profiles avatarları) yeni adrese çevrilir. Tetikleyiciler çalışmasın diye
--     replica kipinde yapılır (veri olduğu gibi kalır, yalnız adres değişir).
-- Yalnız yeni projeye uygulanır; eski (hub) projeye uygulanmaz.

set session_replication_role = replica;

do $$
declare
  eski constant text := 'zfpnxzybcpkxsotwdsey';
  yeni constant text := 'etezccrifaetzrgfvawl';
  f record;
  k record;
begin
  for f in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prosrc like '%' || eski || '%'
  loop
    execute replace(pg_get_functiondef(f.oid), eski, yeni);
  end loop;

  for k in
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.data_type in ('text', 'character varying', 'jsonb')
      and c.is_generated = 'NEVER'
  loop
    if k.data_type = 'jsonb' then
      execute format('update public.%I set %I = replace(%I::text, %L, %L)::jsonb where %I::text like %L',
        k.table_name, k.column_name, k.column_name, eski, yeni, k.column_name, '%' || eski || '%');
    else
      execute format('update public.%I set %I = replace(%I, %L, %L) where %I like %L',
        k.table_name, k.column_name, k.column_name, eski, yeni, k.column_name, '%' || eski || '%');
    end if;
  end loop;
end $$;

set session_replication_role = origin;
