-- 1036 geri alma: boştaki hızlı tik yeniden 15 sn.
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

  -- 993: birleşik hizli_tik varsa isteği işlem-yerel olarak kaydet.
  select j.jobid, j.schedule into v_id, v_mevcut from cron.job j where j.jobname = 'hizli_tik';
  if v_id is not null then
    perform set_config(case p_isim when 'duello_tik' then 'qt.aralik_duello' else 'qt.aralik_bot' end,
                       p_aralik, true);
    -- Tikin içinden gelen istek: aralığa tik sonunda cron_hizli_tik karar verir.
    if current_setting('qt.hizli_tik_icinde', true) = '1' then return; end if;
    -- Dışarıdan (uyandırma tetikleyicisi): yalnız hızlandır.
    if split_part(p_aralik, ' ', 1)::int
       < coalesce(nullif(substring(v_mevcut from '^(\d+) seconds$'), '')::int, 15) then
      perform cron.alter_job(v_id, schedule := p_aralik);
    end if;
    return;
  end if;

  select j.jobid, j.schedule into v_id, v_mevcut from cron.job j where j.jobname = p_isim;
  if v_id is null or v_mevcut = p_aralik then return; end if;
  perform cron.alter_job(v_id, schedule := p_aralik);
exception when others then
  raise warning 'cron_aralik_ayarla(%, %): %', p_isim, p_aralik, sqlerrm;
end $function$;

CREATE OR REPLACE FUNCTION public.cron_duello_tik()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.duellolar where durum = 'aktif')
     or exists (select 1 from public.duellolar x
                 where x.durum = 'bitti' and x.rovans_isteyen is not null and x.rovans_id is null
                   and x.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))) then
    perform public.cron_aralik_ayarla('duello_tik', '2 seconds');
    return public.duello_tik_hepsi();
  end if;
  perform public.cron_aralik_ayarla('duello_tik', '15 seconds');
  return 0;
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

CREATE OR REPLACE FUNCTION public.cron_hizli_tik()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_e numeric := extract(epoch from now());
  v_id bigint;
  v_mevcut text;
  v_i int;
  v_d int;
  v_b int;
  v_yeni int;
  v_bot_calisti boolean := false;
  v_hata int := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('cron_hizli_tik')) then return 0; end if;
  perform set_config('qt.hizli_tik_icinde', '1', true);
  perform set_config('qt.aralik_duello', '', true);
  perform set_config('qt.aralik_bot', '', true);

  select j.jobid, j.schedule into v_id, v_mevcut from cron.job j where j.jobname = 'hizli_tik';
  v_i := coalesce(nullif(substring(v_mevcut from '^(\d+) seconds$'), '')::int, 15);

  -- Düello: her tikte (iş varken 2 sn).
  begin
    perform public.cron_duello_tik();
  exception when others then
    v_hata := v_hata + 1;
    raise warning 'cron_hizli_tik › cron_duello_tik: % (%)', sqlerrm, sqlstate;
  end;

  -- Ortak Hazine: ~30 sn'de bir (30 sn sınırını geçen tikte; ara sıra bir fazla koşu zararsız).
  if v_i >= 30 or floor(v_e / 30) <> floor((v_e - v_i - 0.5) / 30) then
    begin
      perform public.kasa_tik_hepsi();
    exception when others then
      v_hata := v_hata + 1;
      raise warning 'cron_hizli_tik › kasa_tik_hepsi: % (%)', sqlerrm, sqlstate;
    end;
  end if;

  -- Klasik/grup/hızlı/turnuva botları: tik 5 sn ve üstündeyse her tikte, 2 sn'deyse 5 sn sınırında.
  if v_i >= 5 or floor(v_e / 5) <> floor((v_e - v_i) / 5) then
    v_bot_calisti := true;
    begin
      perform public.cron_bot_oyna();
    exception when others then
      v_hata := v_hata + 1;
      raise warning 'cron_hizli_tik › cron_bot_oyna: % (%)', sqlerrm, sqlstate;
    end;
  end if;

  -- Yeni aralık: alt işlerin istediği en kısa aralık. İstek gelmediyse (hata) mevcut aralık korunur;
  -- bot bu tikte çalışmadıysa isteği bilinmez → 5 sn (sonraki tikte kendisi bildirir).
  v_d := coalesce(nullif(split_part(current_setting('qt.aralik_duello', true), ' ', 1), '')::int, v_i);
  v_b := coalesce(nullif(split_part(current_setting('qt.aralik_bot', true), ' ', 1), '')::int,
                  case when v_bot_calisti then v_i else 5 end);
  v_yeni := least(v_d, v_b);
  if v_yeni in (2, 5, 15) and v_yeni <> v_i and v_id is not null then
    begin
      perform cron.alter_job(v_id, schedule := v_yeni || ' seconds');
    exception when others then
      raise warning 'cron_hizli_tik › aralık %: %', v_yeni, sqlerrm;
    end;
  end if;
  return v_hata;
end $function$;

drop trigger if exists trg_cron_hizlan_bot_tepki on public.bot_tepki_bekleyen;
-- Tik o an 30 sn'deyse 15 sn'ye çek (bir sonraki tik zaten kendisi ayarlar).
select cron.alter_job(jobid, schedule := '15 seconds') from cron.job where jobname = 'hizli_tik' and schedule = '30 seconds';
