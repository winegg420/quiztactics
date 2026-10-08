-- ============================================================
-- 993 · Cron işlerini birleştir: dakikalık 4 iş → cron_dakika_tik, hızlı 3 iş → cron_hizli_tik
--       (Supabase Aşama 2, 8 Eki 2026)
--
-- NEDEN: cron.use_background_workers = off → her cron koşusu yeni bir Postgres süreci açar
-- (Nano, 0,5 GB RAM). Ölçüm (8 Eki, canlı cron.job): her dakikanın :00'ında 4 ayrı iş
-- (bildim-bot-turnuva-tik, bildim-gizli-bot-nabiz, bildim-turnuva-ilerlet,
-- bildim-turnuva-zamanlayici) aynı anda süreç açıyor; boşta bildim-bot-oyna (15 sn),
-- duello_tik (15 sn) ve kasa_tik (30 sn) dakikada 10 süreç daha açıyor.
-- Sonra: dakikalık 1 + boşta dakikada 4 süreç.
--
-- İŞ MANTIĞI DEĞİŞMEZ: alt fonksiyonlar (cron_*, advance_due_tournaments, kasa_tik_hepsi)
-- aynen çağrılır. Her çağrı kendi begin/exception bloğundadır: biri hata verirse yalnız
-- onun işi geri alınır, diğerleri çalışır; hata `raise warning` ile Postgres/cron günlüğüne
-- düşer (Supabase › Logs › Postgres).
--
-- HIZLI TİK ARALIĞI (eski dinamik aralıklar korunur):
--   · Düello iş varken 2 sn ister → tik 2 sn. Klasik/grup/turnuva botları iş varken 5 sn ister →
--     tik 2 sn'deyken bot_oyna yalnız 5 sn sınırını geçen tikte çalışır. Boşta ikisi de 15 sn.
--   · kasa_tik_hepsi eskisi gibi ~30 sn'de bir (kendi boşta-çık kapısı var).
--   · Alt fonksiyonların cron_aralik_ayarla() istekleri artık yalnız KAYDEDİLİR; tik sonunda en
--     kısa istenen aralık hizli_tik işine yazılır. Uyandırma tetikleyicileri (830) dışarıdan
--     '2 seconds' isteyince hizli_tik hemen hızlanır (yavaşlatma yalnız tikin kendisinden).
--   · Fark: üç iş artık TEK işlemde sırayla çalışır (düello → kasa → botlar). Biri uzarsa
--     sonrakiler o tikte bekler.
--
-- GERİ ALMA:
--   select cron.unschedule('bildim-dakika-tik'); select cron.unschedule('hizli_tik');
--   select cron.schedule('bildim-bot-turnuva-tik', '* * * * *', 'select public.cron_bot_turnuva_katilim_tik()');
--   select cron.schedule('bildim-gizli-bot-nabiz', '* * * * *', 'select public.cron_gizli_bot_nabiz()');
--   select cron.schedule('bildim-turnuva-ilerlet', '* * * * *', 'select public.advance_due_tournaments()');
--   select cron.schedule('bildim-turnuva-zamanlayici', '* * * * *', 'select public.cron_turnuva_zamanlayici_tik()');
--   select cron.schedule('bildim-bot-oyna', '15 seconds', 'select public.cron_bot_oyna()');
--   select cron.schedule('duello_tik', '15 seconds', 'select public.cron_duello_tik()');
--   select cron.schedule('kasa_tik', '30 seconds', 'select public.kasa_tik_hepsi()');
--   (cron_aralik_ayarla eski işler varken eskisi gibi davranır; ayrıca geri almak gerekmez.)
-- ============================================================

-- ───── 1) Aralık ayarlayıcı: birleşik modda isteği kaydet, gerekirse hizli_tik'i hızlandır ─────
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

-- ───── 2) Dakikalık tik ─────
CREATE OR REPLACE FUNCTION public.cron_dakika_tik()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hata int := 0;
begin
  begin
    perform public.cron_turnuva_zamanlayici_tik();
  exception when others then
    v_hata := v_hata + 1;
    raise warning 'cron_dakika_tik › cron_turnuva_zamanlayici_tik: % (%)', sqlerrm, sqlstate;
  end;
  begin
    perform public.advance_due_tournaments();
  exception when others then
    v_hata := v_hata + 1;
    raise warning 'cron_dakika_tik › advance_due_tournaments: % (%)', sqlerrm, sqlstate;
  end;
  begin
    perform public.cron_bot_turnuva_katilim_tik();
  exception when others then
    v_hata := v_hata + 1;
    raise warning 'cron_dakika_tik › cron_bot_turnuva_katilim_tik: % (%)', sqlerrm, sqlstate;
  end;
  begin
    perform public.cron_gizli_bot_nabiz();
  exception when others then
    v_hata := v_hata + 1;
    raise warning 'cron_dakika_tik › cron_gizli_bot_nabiz: % (%)', sqlerrm, sqlstate;
  end;
  return v_hata;
end $function$;

-- ───── 3) Hızlı tik ─────
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

revoke all on function public.cron_dakika_tik() from public, authenticated, anon;
revoke all on function public.cron_hizli_tik() from public, authenticated, anon;
grant execute on function public.cron_dakika_tik() to service_role;
grant execute on function public.cron_hizli_tik() to service_role;

-- ───── 4) Eski işleri kaldır, yenilerini kur ─────
do $$
declare
  v_isim text;
begin
  foreach v_isim in array array['bildim-bot-turnuva-tik', 'bildim-gizli-bot-nabiz', 'bildim-turnuva-ilerlet',
                                'bildim-turnuva-zamanlayici', 'bildim-bot-oyna', 'duello_tik', 'kasa_tik']
  loop
    if exists (select 1 from cron.job where jobname = v_isim) then
      perform cron.unschedule(v_isim);
    end if;
  end loop;
  perform cron.schedule('bildim-dakika-tik', '* * * * *', 'select public.cron_dakika_tik()');
  -- Başlangıç 2 sn: ilk tik gerçek ihtiyaca göre 5/15 sn'ye çeker.
  perform cron.schedule('hizli_tik', '2 seconds', 'select public.cron_hizli_tik()');
end $$;
