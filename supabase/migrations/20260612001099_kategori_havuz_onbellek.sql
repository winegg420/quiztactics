-- 1099 — kategori havuz sayıları önbellekte (Paket A/10, 14 Eki 2026, Ida onaylı).
--
-- Ölçüm: get_categories ~190 ms, kategori_mac_uygunlar ~285 ms (10 × havuz sayımı), kategori_mac_uygun_mu ~150 ms;
-- kuyruga_gir bunu kendisi + kuyruktaki her aday için tekrarlıyor. Her çağrı ~15 bin soruyu baştan sayıyordu; veritabanı
-- yavaşladığında (nano) bunlar 8 sn statement timeout'a düşen ilk sorgulardı.
--
-- Şimdi: sayılar küçük bir UNLOGGED tabloda (WAL yazmaz), 10 dakikada bir `kategori_havuz_yenile()` ile yenilenir.
-- Kurallar AYNI: eşikler (soru_kapsam_min_havuz, kategori_mac_min_soru) okuma anında uygulanır; dil/kapsam/şüpheli
-- süzgeçleri önbellek anahtarındadır. Önbellek yoksa / 30 dakikadan eskiyse / anahtar yoksa (bilinmeyen dil, yeni
-- kategori) eski canlı sayım yapılır — sonuç asla önbelleğe bağımlı kalmaz.
--   tur 'global' : kategori başına aktif + kapsam global soru sayısı (kategori_evrensel_yeterli)
--   tur 'liste'  : get_categories sayısı — dil (tek), evrensel
--   tur 'havuz'  : kategori_mac_havuzu sayısı — diller (sıralı, virgüllü), evrensel, şüpheli hariç mi
-- Geri alma: docs/kategori-havuz-1099-geri-al.sql

create unlogged table if not exists public.kategori_havuz_onbellek (
  tur text not null check (tur in ('global', 'liste', 'havuz')),
  kategori text not null,
  dil text not null default '',
  evrensel boolean not null default false,
  supheli boolean not null default false,
  sayi integer not null,
  guncellendi timestamptz not null default now(),
  primary key (tur, kategori, dil, evrensel, supheli)
);
alter table public.kategori_havuz_onbellek enable row level security;
-- politika yok, istemci hakkı yok: yalnız security definer fonksiyonlar okur/yazar
revoke all on public.kategori_havuz_onbellek from public, anon, authenticated;

-- Taze önbellek eşiği (yenileme 10 dk; cron aksarsa 30 dk sonra canlı sayıma düşülür)
create or replace function public.kategori_havuz_taze()
returns timestamptz language sql stable as $$ select now() - interval '30 minutes' $$;

create or replace function public.kategori_havuz_yenile()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  v_n int := 0;
  v_diller text[];
  v_ev boolean;
  v_sup boolean;
  v_dil text;
  v_an timestamptz := now();
begin
  -- global (kategori_evrensel_yeterli): genel/karisik dahil bütün aktif kategoriler
  insert into public.kategori_havuz_onbellek as c (tur, kategori, sayi, guncellendi)
  select 'global', k.kategori, coalesce(s.n, 0), v_an
    from (select distinct q.kategori from public.questions q where q.aktif) k
    left join (select q.kategori, count(*)::int n from public.questions q
                where q.aktif and q.kapsam = 'global' group by 1) s using (kategori)
  on conflict (tur, kategori, dil, evrensel, supheli) do update set sayi = excluded.sayi, guncellendi = excluded.guncellendi;

  -- liste (get_categories): dil × evrensel
  foreach v_dil in array array['tr', 'en'] loop
    foreach v_ev in array array[false, true] loop
      insert into public.kategori_havuz_onbellek as c (tur, kategori, dil, evrensel, sayi, guncellendi)
      select 'liste', k.kategori, v_dil, v_ev, coalesce(s.n, 0), v_an
        from (select distinct q.kategori from public.questions q
               where q.aktif and q.kategori not in ('genel', 'karisik')) k
        left join (
          select q.kategori, count(*)::int n
            from public.questions q
           where q.aktif
             and q.kategori not in ('genel', 'karisik')
             and (q.dil = v_dil
                  or exists (select 1 from public.question_translations t
                              where t.question_id = q.id and t.dil = v_dil and not t.eskidi))
             and (not v_ev or q.kapsam = 'global')
           group by 1) s using (kategori)
      on conflict (tur, kategori, dil, evrensel, supheli) do update set sayi = excluded.sayi, guncellendi = excluded.guncellendi;
    end loop;
  end loop;

  -- havuz (kategori_mac_havuzu): diller × evrensel × şüpheli hariç
  foreach v_dil in array array['tr', 'en', 'en,tr'] loop
    v_diller := string_to_array(v_dil, ',');
    foreach v_ev in array array[false, true] loop
      foreach v_sup in array array[false, true] loop
        insert into public.kategori_havuz_onbellek as c (tur, kategori, dil, evrensel, supheli, sayi, guncellendi)
        select 'havuz', k.kategori, v_dil, v_ev, v_sup, coalesce(s.n, 0), v_an
          from (select distinct q.kategori from public.questions q
                 where q.aktif and q.kategori not in ('genel', 'karisik')) k
          left join (
            select q.kategori, count(*)::int n
              from public.questions q
             where q.aktif
               and q.kategori not in ('genel', 'karisik')
               and not (v_sup and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_agirlik)
               and (not v_ev or q.kapsam = 'global')
               and not exists (
                 select 1 from unnest(v_diller) d
                  where d <> q.dil
                    and not exists (
                      select 1 from public.question_translations t
                       where t.question_id = q.id and t.dil = d and not t.eskidi))
             group by 1) s using (kategori)
        on conflict (tur, kategori, dil, evrensel, supheli) do update set sayi = excluded.sayi, guncellendi = excluded.guncellendi;
      end loop;
    end loop;
  end loop;

  -- artık olmayan kategoriler
  delete from public.kategori_havuz_onbellek where guncellendi < v_an;
  select count(*) into v_n from public.kategori_havuz_onbellek;
  return v_n;
end $$;
revoke all on function public.kategori_havuz_yenile() from public, anon, authenticated;
revoke all on function public.kategori_havuz_taze() from public, anon, authenticated;

-- kategori_evrensel_yeterli: önbellekten (COALESCE ikinci argümanı yalnız önbellek yoksa çalışır)
create or replace function public.kategori_evrensel_yeterli(p_kategori text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(
           (select c.sayi::bigint from public.kategori_havuz_onbellek c
             where c.tur = 'global' and c.kategori = p_kategori and c.dil = '' and not c.evrensel and not c.supheli
               and c.guncellendi > public.kategori_havuz_taze()),
           (select count(*) from public.questions q
             where q.aktif and q.kategori = p_kategori and q.kapsam = 'global'))
         >= greatest(1, coalesce(public.ayar_sayi('soru_kapsam_min_havuz', 60), 60)::int);
$function$;

-- kategori_mac_havuzu: önbellekten; yoksa eski canlı sayım (gövde 860/652 ile aynı)
create or replace function public.kategori_mac_havuzu(p_kategori text, p_oyuncular uuid[])
 returns integer
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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

  select coalesce(array_agg(distinct coalesce(nullif(btrim(pr.dil), ''), 'tr') order by coalesce(nullif(btrim(pr.dil), ''), 'tr')), array['tr'])
    into v_diller
    from public.profiles pr
   where pr.id = any(v_oyn);
  if coalesce(array_length(v_diller, 1), 0) = 0 then v_diller := array['tr']; end if;

  -- 1099: önbellek
  select c.sayi into v_n
    from public.kategori_havuz_onbellek c
   where c.tur = 'havuz' and c.kategori = p_kategori and c.dil = array_to_string(v_diller, ',')
     and c.evrensel = v_evrensel and c.supheli = v_supheli_haric and c.guncellendi > public.kategori_havuz_taze();
  if found then return coalesce(v_n, 0); end if;

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
end $function$;

-- get_categories: sayı önbellekten, görülen sayısı canlı (yalnız kendi görülen satırlarım)
create or replace function public.get_categories()
 returns table(kategori text, soru_sayisi bigint, gorulen_sayisi bigint)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_dil text;
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(array[auth.uid()]);
  v_min int;
begin
  v_min := case when v_evrensel then greatest(15, public.ayar_sayi('soru_kapsam_min_havuz', 60)::int) else 15 end;
  select coalesce(nullif(btrim(pr.dil), ''), 'tr') into v_dil from public.profiles pr where pr.id = v_me;
  v_dil := coalesce(v_dil, 'tr');

  if exists (select 1 from public.kategori_havuz_onbellek c
              where c.tur = 'liste' and c.dil = v_dil and c.evrensel = v_evrensel
                and c.guncellendi > public.kategori_havuz_taze()) then
    return query
    with g as (
      select q.kategori, count(*) as n
        from public.gorulen_sorular gs
        join public.questions q on q.id = gs.question_id
       where gs.user_id = v_me
         and q.aktif
         and q.kategori not in ('genel', 'karisik')
         and (q.dil = v_dil
              or exists (select 1 from public.question_translations t
                          where t.question_id = q.id and t.dil = v_dil and not t.eskidi))
         and (not v_evrensel or q.kapsam = 'global')
       group by 1
    )
    select c.kategori, c.sayi::bigint, coalesce(g.n, 0)::bigint
      from public.kategori_havuz_onbellek c
      left join g on g.kategori = c.kategori
     where c.tur = 'liste' and c.dil = v_dil and c.evrensel = v_evrensel and c.sayi >= v_min
     order by (c.kategori = 'genel_kultur') desc, c.sayi desc;
    return;
  end if;

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
end $function$;

-- kategori_mac_uygunlar: kategori listesi önbellekten (yoksa eski tarama), uygunluk kapısı aynı
create or replace function public.kategori_mac_uygunlar()
 returns text[]
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_liste text[] := '{}'::text[];
  v_kat text;
  v_katlar text[];
begin
  if auth.uid() is null then return v_liste; end if;
  select array_agg(distinct c.kategori order by c.kategori) into v_katlar
    from public.kategori_havuz_onbellek c
   where c.tur = 'liste' and c.guncellendi > public.kategori_havuz_taze();
  if v_katlar is null then
    select array_agg(distinct q.kategori order by q.kategori) into v_katlar
      from public.questions q
     where q.aktif and q.kategori not in ('genel', 'karisik');
  end if;
  -- Döngü bilerek: tek sorguda yazılınca süzgeç DISTINCT'in altına iniyor (bkz. 860 notu).
  foreach v_kat in array coalesce(v_katlar, '{}'::text[]) loop
    if public.kategori_mac_uygun_mu(v_kat, array[auth.uid()]) then
      v_liste := array_append(v_liste, v_kat);
    end if;
  end loop;
  return v_liste;
end $function$;

-- İlk dolum + 10 dakikada bir yenileme
select public.kategori_havuz_yenile();
select cron.schedule('bildim-kategori-havuz', '*/10 * * * *', 'select public.kategori_havuz_yenile()');
