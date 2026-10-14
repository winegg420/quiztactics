-- 1099 geri alma: önbellek kaldırılır, dört fonksiyon 1099 öncesi canlı gövdesine döner (14 Eki 2026 canlı dökümü).
select cron.unschedule('bildim-kategori-havuz') where exists (select 1 from cron.job where jobname = 'bildim-kategori-havuz');

CREATE OR REPLACE FUNCTION public.kategori_evrensel_yeterli(p_kategori text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*) >= greatest(1, coalesce(public.ayar_sayi('soru_kapsam_min_havuz', 60), 60)::int)
    from public.questions q
   where q.aktif and q.kategori = p_kategori and q.kapsam = 'global';
$function$
;

CREATE OR REPLACE FUNCTION public.kategori_mac_havuzu(p_kategori text, p_oyuncular uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_oyn uuid[] := coalesce(p_oyuncular, '{}'::uuid[]);
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(coalesce(p_oyuncular, '{}'::uuid[]));
  v_supheli_haric boolean := public.soru_supheli_haric_mi();
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  v_diller text[];
  v_n int;
begin
  if p_kategori is null or p_kategori in ('genel', 'karisik') then return 0; end if;
  -- soru_sec bu durumda kategoriyi yok sayar (652) → kategorili maç kurulamaz
  if v_evrensel and not public.kategori_evrensel_yeterli(p_kategori) then return 0; end if;

  select coalesce(array_agg(distinct coalesce(nullif(btrim(pr.dil), ''), 'tr')), array['tr'])
    into v_diller
    from public.profiles pr
   where pr.id = any(v_oyn);
  if coalesce(array_length(v_diller, 1), 0) = 0 then v_diller := array['tr']; end if;

  select count(*)::int into v_n
    from public.questions q
   where q.aktif
     and q.kategori = p_kategori
     and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik)
     and (not v_evrensel or q.kapsam = 'global')
     and not exists (
       select 1 from unnest(v_diller) d
        where d <> q.dil
          and not exists (
            select 1 from public.question_translations t
             where t.question_id = q.id and t.dil = d and not t.eskidi
          )
     );
  return coalesce(v_n, 0);
end $function$
;

CREATE OR REPLACE FUNCTION public.get_categories()
 RETURNS TABLE(kategori text, soru_sayisi bigint, gorulen_sayisi bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_dil text;
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(array[auth.uid()]);
  v_min int := case when public.soru_kapsam_evrensel_mi(array[auth.uid()])
                    then greatest(15, public.ayar_sayi('soru_kapsam_min_havuz', 60)::int) else 15 end;
begin
  select coalesce(nullif(btrim(pr.dil), ''), 'tr') into v_dil from public.profiles pr where pr.id = v_me;
  v_dil := coalesce(v_dil, 'tr');
  return query
  select q.kategori,
         count(*) as soru_sayisi,
         count(*) filter (where g.user_id is not null) as gorulen_sayisi
  from public.questions q
  left join public.gorulen_sorular g
    on g.question_id = q.id and g.user_id = v_me
  where q.aktif
    -- 'genel' ve 'karisik' birleştirildi; "Karışık" artık kategori SEÇMEMEK demek
    and q.kategori not in ('genel', 'karisik')
    and (q.dil = v_dil
         or exists (select 1 from public.question_translations t
                     where t.question_id = q.id and t.dil = v_dil and not t.eskidi))
    and (not v_evrensel or q.kapsam = 'global')
  group by q.kategori
  having count(*) >= v_min
  order by (q.kategori = 'genel_kultur') desc, count(*) desc;
end $function$
;

CREATE OR REPLACE FUNCTION public.kategori_mac_uygunlar()
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_liste text[] := '{}'::text[];
  v_kat text;
begin
  if auth.uid() is null then return v_liste; end if;
  -- Döngü bilerek: tek sorguda yazılınca süzgeç DISTINCT'in altına iniyor ve havuz sayımı
  -- kategori başına değil SORU başına çalışıyordu (prova ölçümü: 22 sn → döngüyle ~1 sn altı).
  for v_kat in
    select distinct q.kategori
      from public.questions q
     where q.aktif and q.kategori not in ('genel', 'karisik')
     order by 1
  loop
    if public.kategori_mac_uygun_mu(v_kat, array[auth.uid()]) then
      v_liste := array_append(v_liste, v_kat);
    end if;
  end loop;
  return v_liste;
end $function$
;

drop function if exists public.kategori_havuz_yenile();
drop function if exists public.kategori_havuz_taze();
drop table if exists public.kategori_havuz_onbellek;
