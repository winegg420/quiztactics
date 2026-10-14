-- ============================================================
-- 1097 İZLEME VE KAYIT (Paket 4, 14 Eki 2026 — yayın öncesi)
--
-- 1) istemci_hata : yakalanmamış JS hataları + başarısız Supabase çağrıları (rpc/rest).
-- 2) olay_kaydi   : temel olaylar — kayit (sunucu tetikleyicisi), giris, kurulum, davet_eslesti.
--    Maç başladı/bitti AYRI YAZILMAZ: maç tablolarının kendi created_at / bitis kolonlarından
--    sayılır (izleme_ozeti) — maç RPC'lerine dokunulmaz, maç başına ek yazma yok, bütün modlar kapsanır.
-- 3) izleme_ozeti()        : sahip sayfası (/yonetim/izleme) tek JSON.
-- 4) izleme_uyari_kontrol(): 5 dk'da bir; son 10 dk'da >= 50 hata → info@quiztactics.com'a
--    tek e-posta (Resend, saatte en çok 1). Anahtar Vault'ta `resend_api_key`; hiçbir yere yazılmaz.
-- 5) saglik_ping()         : dış bekçi (UptimeRobot) için `select 1` — /api/saglik bunu çağırır.
--
-- NANO KURALLARI: istemci toplu gönderir (tek çağrıda en çok 10+10 kayıt); aynı hata aynı oturumda
-- 1 kez (unique), kullanıcı başına dakikada en çok 5 hata / 10 olay (rpc_sayac — UNLOGGED, WAL yok);
-- sınırı aşan kayıt sessizce atılır (hata fırlatılmaz, istemci yeniden denemez). 30 gün saklama
-- (kayit_budama). Kişisel veri yok: mesajda e-posta/UUID sunucuda da temizlenir; IP tutulmaz.
--
-- GÜVENLİK (Ida onayı 14 Eki 2026): RLS açık; yazma yalnız security definer RPC (authenticated),
-- okuma yalnız sahip (sahip_mi). anon yalnız saglik_ping (select 1, invoker) çağırabilir.
-- Geri alma: docs/izleme-1097-geri-al.sql
-- ============================================================

-- ───── 1) Tablolar ─────
create table if not exists public.istemci_hata (
  id           bigint generated always as identity primary key,
  zaman        timestamptz not null default now(),
  kullanici_id uuid,
  oturum_id    uuid not null,
  imza         text not null,
  tur          text not null check (tur in ('js', 'soz', 'react', 'rpc', 'rest')),
  sayfa        text not null check (length(sayfa) <= 120),
  mesaj        text not null check (length(mesaj) <= 300),
  surum        text check (length(surum) <= 40),
  cihaz        text check (cihaz in ('ios', 'android', 'masaustu', 'diger')),
  unique (oturum_id, imza)
);
create index if not exists istemci_hata_zaman on public.istemci_hata (zaman);

create table if not exists public.olay_kaydi (
  id           bigint generated always as identity primary key,
  zaman        timestamptz not null default now(),
  kullanici_id uuid not null,
  olay         text not null check (olay in ('kayit', 'giris', 'kurulum', 'davet_eslesti')),
  anahtar      text not null default '' check (length(anahtar) <= 64),
  surum        text check (length(surum) <= 40),
  cihaz        text check (cihaz in ('ios', 'android', 'masaustu', 'diger')),
  unique (olay, kullanici_id, anahtar)
);
create index if not exists olay_kaydi_zaman on public.olay_kaydi (zaman);

-- Tek satır: son uyarı e-postası (saatte en çok 1) ve pg_net istek kimliği (yanıt kodu için).
create table if not exists public.izleme_uyari (
  id            int primary key default 1 check (id = 1),
  son_gonderim  timestamptz,
  son_sayi      int,
  son_istek_id  bigint
);
insert into public.izleme_uyari (id) values (1) on conflict do nothing;

alter table public.istemci_hata enable row level security;
alter table public.olay_kaydi   enable row level security;
alter table public.izleme_uyari enable row level security;

revoke all on public.istemci_hata, public.olay_kaydi, public.izleme_uyari from public, anon, authenticated;
grant select on public.istemci_hata, public.olay_kaydi to authenticated;

drop policy if exists istemci_hata_sahip_okur on public.istemci_hata;
create policy istemci_hata_sahip_okur on public.istemci_hata
  for select to authenticated using ((select public.sahip_mi()));
drop policy if exists olay_kaydi_sahip_okur on public.olay_kaydi;
create policy olay_kaydi_sahip_okur on public.olay_kaydi
  for select to authenticated using ((select public.sahip_mi()));
-- izleme_uyari: politika yok → yalnız security definer fonksiyonlar.

-- ───── 2) Yardımcı: metin temizliği (e-posta, UUID) ─────
create or replace function public.izleme_temizle(p text, p_uzunluk int)
returns text
language sql
immutable
set search_path to 'public'
as $f$
  select left(
    regexp_replace(
      regexp_replace(coalesce(p, ''), '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[e-posta]', 'g'),
      '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '[kimlik]', 'g'),
    p_uzunluk);
$f$;
revoke all on function public.izleme_temizle(text, int) from public, anon, authenticated;

-- Dakikalık kota: rpc_sayac'tan kalan hakkı okur (hata fırlatmaz). p_kullanilan > 0 ise sayacı artırır.
create or replace function public.izleme_kota(p_uc text, p_limit int, p_kullanilan int default 0)
returns int
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_me uuid := auth.uid();
  v_sayi int;
begin
  if v_me is null then return 0; end if;
  insert into public.rpc_sayac as s (user_id, uc_adi, pencere_baslangic, sayi)
  values (v_me, p_uc, now(), p_kullanilan)
  on conflict (user_id, uc_adi) do update
    set sayi = case when s.pencere_baslangic < now() - interval '1 minute' then p_kullanilan
                    else s.sayi + p_kullanilan end,
        pencere_baslangic = case when s.pencere_baslangic < now() - interval '1 minute' then now()
                                 else s.pencere_baslangic end
  returning s.sayi into v_sayi;
  return greatest(0, p_limit - v_sayi);
end $f$;
revoke all on function public.izleme_kota(text, int, int) from public, anon, authenticated;

-- ───── 3) Yazma RPC'si (istemci tek çağrıyla toplu gönderir) ─────
create or replace function public.istemci_kayit_yaz(
  p_oturum  uuid,
  p_surum   text default null,
  p_cihaz   text default null,
  p_hatalar jsonb default '[]'::jsonb,
  p_olaylar jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_me    uuid := auth.uid();
  v_surum text := left(coalesce(p_surum, ''), 40);
  v_cihaz text := case when p_cihaz in ('ios', 'android', 'masaustu', 'diger') then p_cihaz else 'diger' end;
  v_kalan int;
  v_yazilan int;
begin
  if v_me is null or p_oturum is null then return; end if;

  if jsonb_typeof(p_hatalar) = 'array' and jsonb_array_length(p_hatalar) > 0 then
    v_kalan := least(public.izleme_kota('izleme_hata', 5), 10);
    if v_kalan > 0 then
      with girdi as (
        select e->>'tur' as tur,
               public.izleme_temizle(split_part(e->>'sayfa', '?', 1), 120) as sayfa,
               public.izleme_temizle(e->>'mesaj', 300) as mesaj
          from jsonb_array_elements(p_hatalar) with ordinality as x(e, sira)
         where jsonb_typeof(e) = 'object'
           and e->>'tur' in ('js', 'soz', 'react', 'rpc', 'rest')
           and length(coalesce(e->>'mesaj', '')) > 0
         order by sira
         limit 10
      )
      insert into public.istemci_hata (kullanici_id, oturum_id, imza, tur, sayfa, mesaj, surum, cihaz)
      select v_me, p_oturum, md5(tur || '|' || sayfa || '|' || mesaj), tur, sayfa, mesaj, v_surum, v_cihaz
        from (select distinct on (tur, sayfa, mesaj) * from girdi) g
       limit v_kalan
      on conflict (oturum_id, imza) do nothing;
      get diagnostics v_yazilan = row_count;
      if v_yazilan > 0 then perform public.izleme_kota('izleme_hata', 5, v_yazilan); end if;
    end if;
  end if;

  if jsonb_typeof(p_olaylar) = 'array' and jsonb_array_length(p_olaylar) > 0 then
    v_kalan := least(public.izleme_kota('izleme_olay', 10), 10);
    if v_kalan > 0 then
      insert into public.olay_kaydi (kullanici_id, olay, anahtar, surum, cihaz)
      select v_me, e->>'olay', public.izleme_temizle(e->>'anahtar', 64), v_surum, v_cihaz
        from jsonb_array_elements(p_olaylar) as x(e)
       where jsonb_typeof(e) = 'object'
         and e->>'olay' in ('giris', 'kurulum', 'davet_eslesti')   -- 'kayit' yalnız sunucu tetikleyicisinden
       limit v_kalan
      on conflict (olay, kullanici_id, anahtar) do nothing;
      get diagnostics v_yazilan = row_count;
      if v_yazilan > 0 then perform public.izleme_kota('izleme_olay', 10, v_yazilan); end if;
    end if;
  end if;
end $f$;
revoke all on function public.istemci_kayit_yaz(uuid, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.istemci_kayit_yaz(uuid, text, text, jsonb, jsonb) to authenticated;

-- ───── 4) Kayıt olayı: yeni insan profili (bot hariç). Hata profil oluşturmayı ASLA bozmaz. ─────
create or replace function public.izleme_kayit_olayi()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $f$
begin
  if not coalesce(new.is_bot, false) then
    begin
      insert into public.olay_kaydi (kullanici_id, olay, anahtar)
      values (new.id, 'kayit',
              case when coalesce((select u.is_anonymous from auth.users u where u.id = new.id), false)
                   then 'misafir' else 'hesap' end)
      on conflict do nothing;
    exception when others then
      null;
    end;
  end if;
  return null;
end $f$;
revoke all on function public.izleme_kayit_olayi() from public, anon, authenticated;

drop trigger if exists trg_profiles_izleme_kayit on public.profiles;
create trigger trg_profiles_izleme_kayit
  after insert on public.profiles
  for each row execute function public.izleme_kayit_olayi();

-- ───── 5) Uyarı kontrolü (cron, 5 dk) ─────
-- p_test = true: eşik ve saatlik sınır atlanır, konu "[TEST]"; son_gonderim değişmez (gerçek uyarıyı engellemez).
create or replace function public.izleme_uyari_kontrol(p_test boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_esik  constant int := 50;
  v_sayi  int;
  v_son   timestamptz;
  v_ozet  text;
  v_id    bigint;
begin
  select count(*) into v_sayi from public.istemci_hata where zaman > now() - interval '10 minutes';
  if not p_test and v_sayi < v_esik then
    return jsonb_build_object('sayi', v_sayi, 'gonderildi', false);
  end if;

  select son_gonderim into v_son from public.izleme_uyari where id = 1 for update;
  if not p_test and v_son is not null and v_son > now() - interval '1 hour' then
    return jsonb_build_object('sayi', v_sayi, 'gonderildi', false, 'neden', 'saatlik_sinir');
  end if;

  if not exists (select 1 from vault.decrypted_secrets where name = 'resend_api_key') then
    raise warning 'izleme_uyari_kontrol: Vault anahtarı yok';
    return jsonb_build_object('sayi', v_sayi, 'gonderildi', false, 'neden', 'anahtar_yok');
  end if;

  select string_agg(format('%s × [%s] %s — %s', sayi, tur, sayfa, mesaj), E'\n')
    into v_ozet
    from (select tur, sayfa, mesaj, count(*) as sayi
            from public.istemci_hata
           where zaman > now() - interval '10 minutes'
           group by tur, sayfa, mesaj
           order by count(*) desc
           limit 5) t;

  -- Anahtar yalnız istek başlığında kullanılır; değişkene/kayda/çıktıya yazılmaz.
  select net.http_post(
           url := 'https://api.resend.com/emails',
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                             where name = 'resend_api_key' limit 1)),
           body := jsonb_build_object(
             'from', 'Quiz Tactics İzleme <no-reply@quiztactics.com>',
             'to', jsonb_build_array('info@quiztactics.com'),
             'subject', case when p_test then '[TEST] ' else '' end
                        || format('Quiz Tactics: son 10 dakikada %s istemci hatası', v_sayi),
             'text', format(E'Son 10 dakikada %s istemci hatası kaydedildi (eşik %s).\n\nEn sık:\n%s\n\nAyrıntı: https://quiztactics.com/yonetim/izleme\n\nBu uyarı saatte en çok bir kez gönderilir.',
                            v_sayi, v_esik, coalesce(v_ozet, '—'))),
           timeout_milliseconds := 5000)
    into v_id;

  if p_test then
    update public.izleme_uyari set son_istek_id = v_id where id = 1;
  else
    update public.izleme_uyari set son_gonderim = now(), son_sayi = v_sayi, son_istek_id = v_id where id = 1;
  end if;
  return jsonb_build_object('sayi', v_sayi, 'gonderildi', true, 'istek', v_id, 'test', p_test);
end $f$;
revoke all on function public.izleme_uyari_kontrol(boolean) from public, anon, authenticated;
grant execute on function public.izleme_uyari_kontrol(boolean) to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'bildim-izleme-uyari') then
    perform cron.unschedule('bildim-izleme-uyari');
  end if;
  perform cron.schedule('bildim-izleme-uyari', '*/5 * * * *', 'select public.izleme_uyari_kontrol()');
end $$;

-- ───── 6) Sahip özeti ─────
create or replace function public.izleme_ozeti()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_bas  timestamptz := clock_timestamp();
  v_gun  timestamptz := now() - interval '24 hours';
  v_sonuc jsonb;
  v_uyari public.izleme_uyari;
begin
  if not public.sahip_mi() then
    raise exception 'Bu bilgi yalnız sahibe açık.' using errcode = '42501';
  end if;
  select * into v_uyari from public.izleme_uyari where id = 1;

  v_sonuc := jsonb_build_object(
    'hata_24s',  (select count(*) from public.istemci_hata where zaman > v_gun),
    'hata_10dk', (select count(*) from public.istemci_hata where zaman > now() - interval '10 minutes'),
    'hata_kisi_24s', (select count(distinct kullanici_id) from public.istemci_hata where zaman > v_gun),
    'en_sik', coalesce((
      select jsonb_agg(t order by t.sayi desc)
        from (select tur, sayfa, mesaj, count(*) as sayi, count(distinct kullanici_id) as kisi,
                     max(zaman) as son, max(surum) as surum
                from public.istemci_hata where zaman > v_gun
               group by tur, sayfa, mesaj
               order by count(*) desc limit 10) t), '[]'::jsonb),
    'olaylar', coalesce((
      select jsonb_object_agg(olay, sayi)
        from (select olay, count(*) as sayi from public.olay_kaydi where zaman > v_gun group by olay) t), '{}'::jsonb),
    'maclar', jsonb_build_array(
      jsonb_build_object('mod', 'klasik',  'basladi', (select count(*) from public.matches       where created_at > v_gun), 'bitti', (select count(*) from public.matches       where bitis > v_gun)),
      jsonb_build_object('mod', 'duello',  'basladi', (select count(*) from public.duellolar     where created_at > v_gun), 'bitti', (select count(*) from public.duellolar     where bitis > v_gun)),
      jsonb_build_object('mod', 'kasa',    'basladi', (select count(*) from public.kasa_maclari  where created_at > v_gun), 'bitti', (select count(*) from public.kasa_maclari  where bitis > v_gun)),
      jsonb_build_object('mod', 'grup',    'basladi', (select count(*) from public.group_matches where created_at > v_gun), 'bitti', (select count(*) from public.group_matches where bitis > v_gun)),
      jsonb_build_object('mod', 'turnuva', 'basladi', (select count(*) from public.tournaments   where created_at > v_gun), 'bitti', (select count(*) from public.tournaments   where bitis > v_gun))),
    'aktif_kullanici', (select count(*) from public.profiles where last_seen > v_gun and not coalesce(is_bot, false)),
    'son_kontrol', (select max(d.end_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                     where j.jobname = 'bildim-izleme-uyari' and d.status = 'succeeded'),
    'son_uyari', v_uyari.son_gonderim,
    'son_uyari_sayi', v_uyari.son_sayi,
    'son_uyari_kod', (select r.status_code from net._http_response r where r.id = v_uyari.son_istek_id),
    'esik', 50,
    'db_boyut_mb', round(pg_database_size(current_database()) / 1048576.0),
    'baglanti', (select count(*) from pg_stat_activity where datname = current_database())
  );
  return v_sonuc || jsonb_build_object('sunucu_ms',
    round(extract(epoch from clock_timestamp() - v_bas) * 1000, 1));
end $f$;
revoke all on function public.izleme_ozeti() from public, anon;
grant execute on function public.izleme_ozeti() to authenticated;

-- ───── 7) Dış bekçi ─────
create or replace function public.saglik_ping()
returns int
language sql
stable
set search_path to 'public'
as $f$ select 1 $f$;
revoke all on function public.saglik_ping() from public;
grant execute on function public.saglik_ping() to anon, authenticated;

-- ───── 8) Saklama: 30 gün (kayit_budama'ya eklenir; mevcut gövde aynen korunur) ─────
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
  v_hata int := 0;
  v_olay int := 0;
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
  -- 1097: izleme kayıtları 30 gün saklanır.
  delete from public.istemci_hata where zaman < now() - interval '30 days';
  get diagnostics v_hata = row_count;
  delete from public.olay_kaydi where zaman < now() - interval '30 days';
  get diagnostics v_olay = row_count;
  return jsonb_build_object('cron', v_cron, 'rpc_sayac', v_sayac, 'net', v_net, 'istemci_hata', v_hata, 'olay_kaydi', v_olay);
end $f$;
revoke all on function public.kayit_budama() from public, anon, authenticated;
grant execute on function public.kayit_budama() to service_role;
