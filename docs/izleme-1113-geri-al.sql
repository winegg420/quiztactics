-- 1113 geri alma (izleme): fonksiyonların 1113 öncesi (canlı, 16 Eki 2026) gövdeleri + yeni nesnelerin kaldırılması.
-- Sıra önemli: önce eski gövdeler (akis_bozulma'ya başvurmayan), sonra tablo/fonksiyon/cron.
CREATE OR REPLACE FUNCTION public.istemci_kayit_yaz(p_oturum uuid, p_surum text DEFAULT NULL::text, p_cihaz text DEFAULT NULL::text, p_hatalar jsonb DEFAULT '[]'::jsonb, p_olaylar jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.izleme_ozeti()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.kayit_budama()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'bildim-izleme-gunluk') then perform cron.unschedule('bildim-izleme-gunluk'); end if;
end $$;
drop function if exists public.izleme_gunluk_ozet_elle();
drop function if exists public.izleme_gunluk_ozet_gonder(boolean);
drop function if exists public.izleme_akis_ozet(interval);
drop table if exists public.akis_bozulma;
alter table public.izleme_uyari drop column if exists gunluk_son, drop column if exists gunluk_istek_id, drop column if exists gunluk_elle_son;
