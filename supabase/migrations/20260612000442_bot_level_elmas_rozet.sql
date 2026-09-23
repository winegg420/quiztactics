-- 442: Botlara Level 75/100 rozetleri level'e göre verilir (Ida, 24 Eyl 2026: Level 90 botta rozet
-- olmaması şüphe çeker). Diğer elmas/gizli/etkinlik rozetleri yine verilmez. Bütün botlar yeniden üretilir
-- (deterministik; mevcut rozetler aynı kalır, yalnız eksik level rozetleri eklenir).

CREATE OR REPLACE FUNCTION public.bot_rozetleri_uret(p_bot uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_level int;
  v_tohum text := p_bot::text;
  v_xp numeric;
  v_klasik numeric;
  v_duello numeric;
  v_seri numeric;
  v_tmax int := public.ayar_sayi('bot_rozet_turnuva_max', 2)::int;
  v_rozetler text[] := '{}';
  v_turnuva text[] := '{}';
  v_vitrin text[];
  v_n int;
begin
  select coalesce(level, 1) into v_level from public.profiles where id = p_bot and coalesce(is_bot, false);
  if not found then return 0; end if;

  -- Bu level'e gelmek için gereken toplam XP.
  select coalesce(sum(public.level_gereken_xp(l)), 0) into v_xp from generate_series(1, greatest(v_level - 1, 0)) l;

  v_klasik := v_xp * public.ayar_ondalik('bot_rozet_klasik_carpan', 0.013) * (0.5 + public.bot_rasgele('brz:k:' || v_tohum));
  v_duello := v_xp * public.ayar_ondalik('bot_rozet_duello_carpan', 0.0045) * (0.5 + public.bot_rasgele('brz:d:' || v_tohum));
  v_seri   := v_level * public.ayar_ondalik('bot_rozet_seri_carpan', 0.6) * (0.5 + public.bot_rasgele('brz:s:' || v_tohum));

  select coalesce(array_agg(t.anahtar), '{}') into v_rozetler
    from public.rozet_tanimlari t
   where t.aktif and not t.gizli
     -- 442: elmas kademe yalnız LEVEL grubunda (Level 75/100 bot level'ine göre); diğer elmaslar verilmez.
     and (t.kademe <> 'elmas' or t.grup = 'level')
     and ((t.grup = 'level'  and t.esik <= v_level)
       or (t.grup = 'klasik' and t.esik <= v_klasik)
       or (t.grup = 'duello' and t.esik <= v_duello)
       or (t.grup = 'seri'   and t.esik <= v_seri));

  -- Turnuva: level arttıkça olası, en çok v_tmax tane; şampiyonluk verilmez.
  if v_level >= 5 and public.bot_rasgele('brz:t1:' || v_tohum) < least(0.9, 0.3 + v_level / 100.0) then
    v_turnuva := v_turnuva || 'turnuva_katilim'::text;
  end if;
  if v_level >= 25 and public.bot_rasgele('brz:t2:' || v_tohum) < least(0.6, v_level / 150.0) then
    v_turnuva := v_turnuva || 'turnuva_ilk10'::text;
  end if;
  if v_level >= 50 and public.bot_rasgele('brz:t3:' || v_tohum) < least(0.3, v_level / 400.0) then
    v_turnuva := v_turnuva || 'turnuva_ilk3'::text;
  end if;
  if cardinality(v_turnuva) > v_tmax then
    v_turnuva := v_turnuva[cardinality(v_turnuva) - v_tmax + 1 : cardinality(v_turnuva)];
  end if;
  select coalesce(array_agg(x), '{}') into v_turnuva
    from unnest(v_turnuva) x join public.rozet_tanimlari t on t.anahtar = x and t.aktif;
  v_rozetler := v_rozetler || v_turnuva;

  delete from public.oyuncu_rozetleri r where r.user_id = p_bot and not (r.rozet = any(v_rozetler));
  insert into public.oyuncu_rozetleri (user_id, rozet, kazanildi_at, coin, geriye_donuk, goruldu)
  select p_bot, x,
         date_trunc('day', coalesce((select created_at from public.profiles where id = p_bot), now()))
           - make_interval(days => (1 + floor(300 * public.bot_rasgele('brz:z:' || x || ':' || v_tohum)))::int),
         0, true, true
    from unnest(v_rozetler) x
  on conflict (user_id, rozet) do nothing;
  get diagnostics v_n = row_count;

  -- Vitrin: her gruptan en yüksek kademeli rozet, sonra kademe + tohumlu sıra; ilk 3.
  select array_agg(z.anahtar order by z.sira) into v_vitrin from (
    select y.anahtar, row_number() over (order by y.kr desc, public.bot_rasgele('brz:v:' || y.anahtar || ':' || v_tohum)) sira
      from (select distinct on (t.grup) t.anahtar,
                   array_position(array['bronz','gumus','altin','elmas'], t.kademe) kr
              from public.rozet_tanimlari t
             where t.anahtar = any(v_rozetler)
             order by t.grup, array_position(array['bronz','gumus','altin','elmas'], t.kademe) desc, t.esik desc nulls last) y
  ) z where z.sira <= 3;

  update public.profiles set vitrin_rozetleri = coalesce(v_vitrin, '{}')
   where id = p_bot and vitrin_rozetleri is distinct from coalesce(v_vitrin, '{}');
  return v_n;
end $function$
;

-- Mevcut botlar için bir kez yeniden üret.
select count(public.bot_rozetleri_uret(p.id)) from public.profiles p where coalesce(p.is_bot, false);
