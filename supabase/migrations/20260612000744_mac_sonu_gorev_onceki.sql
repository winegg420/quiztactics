-- 744 — Maç sonu özetinde günlük görev "önceki ilerleme" (onceki) yeni görev havuzuyla doğru çalışır.
--  * gorev_olcum / gorev_dogru_satirlari: bir maçı HARİÇ tutan isteğe bağlı (p_haric_tur, p_haric_id) sürümleri (eski imzalar sarmalayıcı).
--  * mac_sonu_ozet: yeni havuz görevlerinde onceki = bu maç hariç yeniden ölçüm (Antrenman/terk zaten sayılmadığı için 0 katkı);
--    eski 3 kimlik (mac_oyna_3, mac_kazan_5, dogru_25) 462'deki hesapla AYNEN. Dönüş biçimi korunur; ekleyici anahtar:
--    haftalik_gorevler [{id, ad, ilerleme, hedef, alindi, onceki}] (eski istemci yok sayar).

create or replace function public.gorev_dogru_satirlari(p_user uuid, p_bas timestamptz, p_son timestamptz, p_haric_tur text, p_haric_id uuid)
 returns table (kategori text) language sql stable security definer set search_path to 'public'
as $$
  select q.kategori
    from public.match_answers a
    join public.matches m on m.id = a.match_id
    left join public.questions q on q.id = m.soru_ids[a.soru_index + 1]
   where a.user_id = p_user and a.dogru and a.created_at >= p_bas and a.created_at < p_son
     and m.durum in ('aktif', 'bitti') and (p_haric_tur is distinct from 'mac' or m.id is distinct from p_haric_id) and m.terk_eden is distinct from p_user
     and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end)
  union all
  select coalesce(q.kategori, h.kategori)
    from public.duello_hamleler h
    join public.duellolar d on d.id = h.duello_id
    left join public.questions q on q.id = h.soru_id
   where h.created_at >= p_bas and h.created_at < p_son
     and ((h.savunan = p_user and h.dogru) or (h.saldiran = p_user and coalesce(h.dogru_saldiran, false)))
     and d.durum in ('aktif', 'bitti') and (p_haric_tur is distinct from 'duello' or d.id is distinct from p_haric_id) and d.terk_eden is distinct from p_user
     and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end)
  union all
  select h.kategori
    from public.hizli_mod_oturumlar h
    cross join lateral generate_series(1, greatest(coalesce(h.dogru, 0), 0)) g
   where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= p_bas and h.bitis < p_son
  union all
  select q.kategori
    from public.group_match_answers ga
    join public.group_matches gm on gm.id = ga.group_match_id
    left join public.questions q on q.id = gm.soru_ids[ga.soru_index + 1]
   where ga.user_id = p_user and ga.dogru and (p_haric_tur is distinct from 'grup' or ga.group_match_id is distinct from p_haric_id) and ga.created_at >= p_bas and ga.created_at < p_son
     and not exists (select 1 from public.group_match_players gx
                      where gx.group_match_id = ga.group_match_id and gx.user_id = p_user and gx.terk_at is not null)
  union all
  select q.kategori
    from public.tournament_answers ta
    join public.tournaments t on t.id = ta.tournament_id
    left join public.questions q on q.id = t.soru_ids[ta.soru_index + 1]
   where ta.user_id = p_user and ta.dogru and (p_haric_tur is distinct from 'turnuva' or ta.tournament_id is distinct from p_haric_id) and ta.created_at >= p_bas and ta.created_at < p_son
     and not exists (select 1 from public.tournament_players tx
                      where tx.tournament_id = ta.tournament_id and tx.user_id = p_user and tx.terk_at is not null);
$$;

create or replace function public.gorev_olcum(p_user uuid, p_sayac text, p_param jsonb, p_bas timestamptz, p_son timestamptz, p_haric_tur text, p_haric_id uuid)
 returns bigint language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v bigint := 0;
begin
  if p_user is null then return 0; end if;

  if p_sayac in ('mac_oyna', 'duello_mac') then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and (p_haric_tur is distinct from 'duello' or d.id is distinct from p_haric_id) and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
       and d.bitis >= p_bas and d.bitis < p_son
       and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end);
    if p_sayac = 'mac_oyna' then
      v := v
        + (select count(*) from public.matches m
            where m.durum = 'bitti' and (p_haric_tur is distinct from 'mac' or m.id is distinct from p_haric_id) and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
              and m.bitis >= p_bas and m.bitis < p_son
              and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end))
        + (select count(*) from public.hizli_mod_oturumlar h
            where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= p_bas and h.bitis < p_son)
        + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id
            where g.durum = 'bitti' and (p_haric_tur is distinct from 'grup' or g.id is distinct from p_haric_id) and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null
              and g.bitis >= p_bas and g.bitis < p_son)
        + (select count(*) from public.tournaments t join public.tournament_players tp on tp.tournament_id = t.id
            where t.durum = 'bitti' and (p_haric_tur is distinct from 'turnuva' or t.id is distinct from p_haric_id) and tp.user_id = p_user and tp.terk_at is null and t.bitis >= p_bas and t.bitis < p_son);
    end if;

  elsif p_sayac in ('mac_kazan', 'duello_galibiyet') then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and (p_haric_tur is distinct from 'duello' or d.id is distinct from p_haric_id) and d.kazanan = p_user and d.terk_eden is distinct from p_user
       and d.bitis >= p_bas and d.bitis < p_son
       and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end);
    if p_sayac = 'mac_kazan' then
      v := v
        + (select count(*) from public.matches m
            where m.durum = 'bitti' and (p_haric_tur is distinct from 'mac' or m.id is distinct from p_haric_id) and m.kazanan = p_user and m.terk_eden is distinct from p_user
              and m.bitis >= p_bas and m.bitis < p_son
              and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end))
        + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id
            where g.durum = 'bitti' and (p_haric_tur is distinct from 'grup' or g.id is distinct from p_haric_id) and g.kazanan = p_user and gp.user_id = p_user and gp.davet_durumu = 'kabul'
              and gp.terk_at is null and g.bitis >= p_bas and g.bitis < p_son)
        + (select count(*) from public.tournaments t
            where t.durum = 'bitti' and (p_haric_tur is distinct from 'turnuva' or t.id is distinct from p_haric_id) and t.kazanan = p_user and t.bitis >= p_bas and t.bitis < p_son
              and exists (select 1 from public.tournament_players tp
                           where tp.tournament_id = t.id and tp.user_id = p_user and tp.terk_at is null));
    end if;

  elsif p_sayac = 'dogru_soru' then
    select count(*) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son, p_haric_tur, p_haric_id);

  elsif p_sayac = 'kategori_dogru' then
    select count(*) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son, p_haric_tur, p_haric_id) s
     where s.kategori = p_param ->> 'kategori';

  elsif p_sayac = 'farkli_kategori_dogru' then
    select count(distinct s.kategori) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son, p_haric_tur, p_haric_id) s
     where s.kategori is not null;
  end if;

  return coalesce(v, 0);
end $$;

-- Eski imzalar: davranış değişmez (hariç tutma yok)
create or replace function public.gorev_dogru_satirlari(p_user uuid, p_bas timestamptz, p_son timestamptz)
 returns table (kategori text) language sql stable security definer set search_path to 'public'
as $$ select * from public.gorev_dogru_satirlari(p_user, p_bas, p_son, null::text, null::uuid); $$;

create or replace function public.gorev_olcum(p_user uuid, p_sayac text, p_param jsonb, p_bas timestamptz, p_son timestamptz)
 returns bigint language sql stable security definer set search_path to 'public'
as $$ select public.gorev_olcum(p_user, p_sayac, p_param, p_bas, p_son, null::text, null::uuid); $$;

CREATE OR REPLACE FUNCTION public.mac_sonu_ozet(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_tur text;
  v_id uuid;
  v_bitti boolean := false;
  v_bitis timestamptz;
  v_kazanan uuid;
  v_ben_terk boolean := false;
  v_rakip_terk boolean := false;
  v_edenler uuid[] := '{}';
  v_hazir boolean := false;
  v_dokum jsonb;
  v_level jsonb;
  v_lig jsonb;
  v_rozet jsonb;
  v_gorev jsonb;
  v_haftalik jsonb;
  v_hafta date := public.gorev_hafta_basi(now());
  v_lig_puan int := 0;
  v_dogru int := 0;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_bugun_mu boolean := false;
  v_dil text := public.oyuncu_dili();
  p record;
  h public.xp_hareketleri%rowtype;
  v_kalan int; v_l int;
  v_sira bigint; v_puan int; v_once int; v_sira_once bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva|grup):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
  v_tur := split_part(p_kaynak, ':', 1);
  v_id := split_part(p_kaynak, ':', 2)::uuid;

  -- Maç durumu + katılım denetimi (başkasının maçı okunmaz)
  if v_tur = 'mac' then
    select m.durum = 'bitti', m.bitis, m.kazanan,
           m.terk_eden = v_me, m.terk_eden is not null and m.terk_eden <> v_me,
           case when m.terk_eden is null then '{}'::uuid[] else array[m.terk_eden] end,
           (select count(*) from public.match_answers a where a.match_id = m.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.matches m where m.id = v_id and v_me in (m.oyuncu1, m.oyuncu2);
  elsif v_tur = 'duello' then
    select d.durum = 'bitti', d.bitis, d.kazanan,
           d.terk_eden = v_me, d.terk_eden is not null and d.terk_eden <> v_me,
           case when d.terk_eden is null then '{}'::uuid[] else array[d.terk_eden] end,
           (select count(*) from public.duello_hamleler dh where dh.duello_id = d.id and dh.savunan = v_me and dh.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.duellolar d where d.id = v_id and v_me in (d.oyuncu1, d.oyuncu2);
  elsif v_tur = 'grup' then
    select g.durum = 'bitti', g.bitis, g.kazanan,
           exists (select 1 from public.group_match_players x where x.group_match_id = g.id and x.user_id = v_me and x.terk_at is not null),
           false,
           coalesce((select array_agg(x.user_id) from public.group_match_players x
                      where x.group_match_id = g.id and x.terk_at is not null), '{}'::uuid[]),
           (select count(*) from public.group_match_answers a where a.group_match_id = g.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.group_matches g
     where g.id = v_id
       and exists (select 1 from public.group_match_players x where x.group_match_id = g.id and x.user_id = v_me);
  else
    select t.durum = 'bitti', t.bitis, t.kazanan,
           exists (select 1 from public.tournament_players x where x.tournament_id = t.id and x.user_id = v_me and x.terk_at is not null),
           false, '{}'::uuid[],
           (select count(*) from public.tournament_answers a where a.tournament_id = t.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.tournaments t
     where t.id = v_id
       and exists (select 1 from public.tournament_players x where x.tournament_id = t.id and x.user_id = v_me);
  end if;
  if not found then raise exception 'Bu maçta değilsin'; end if;
  v_bitti := coalesce(v_bitti, false);
  v_ben_terk := coalesce(v_ben_terk, false);
  v_rakip_terk := coalesce(v_rakip_terk, false);
  v_bugun_mu := v_bitis is not null and (v_bitis at time zone 'Europe/Istanbul')::date = v_bugun;

  v_dokum := public.odul_dokumu(p_kaynak);
  v_lig_puan := coalesce((v_dokum -> 'toplam' ->> 'lig')::int, 0);

  -- XP / level (grup XP vermez)
  if v_tur <> 'grup' then
    v_level := public.level_kazancim(p_kaynak);
    select * into h from public.xp_hareketleri where user_id = v_me and kaynak = p_kaynak;
    if h.id is not null then
      select level, level_xp into p from public.profiles where id = v_me;
      if h.level_sonra > h.level_once and p.level = h.level_sonra then
        -- Atlamadan önceki levelin doluluğu: bu maçın XP'sinden atlanan levellerin ihtiyacı düşülür.
        -- (Bu maçtan sonra başka XP geldiyse yaklaşık kalır; yalnız çubuk animasyonu içindir.)
        v_kalan := h.xp - p.level_xp;
        v_l := h.level_once + 1;
        while v_l < h.level_sonra loop
          v_kalan := v_kalan - public.level_gereken_xp(v_l);
          v_l := v_l + 1;
        end loop;
        -- Maçtan sonra başka XP geldiyse hesap tutmaz (v_kalan ≤ 0): alan yazılmaz, istemci varsayılanı kullanır.
        if v_kalan > 0 and v_kalan < public.level_gereken_xp(h.level_once) then
          v_level := v_level || jsonb_build_object(
            'level_gereken_once', public.level_gereken_xp(h.level_once),
            'level_xp_once', public.level_gereken_xp(h.level_once) - v_kalan);
        end if;
      end if;
    end if;
  end if;

  v_hazir := v_bitti and (v_ben_terk or v_tur = 'grup'
                          or exists (select 1 from public.xp_hareketleri x where x.user_id = v_me and x.kaynak = p_kaynak)
                          or coalesce((v_dokum ->> 'hazir')::boolean, false));

  -- Lig sırası (yalnız bu maçtan lig puanı geldiyse): sonra = bugünkü sıra, önce = puan düşülmüş hâl
  if v_lig_puan > 0 and not v_ben_terk then
    begin
      select g.sira, g.puan into v_sira, v_puan from public.lig_grubum() g where g.ben;
      if v_sira is not null then
        v_once := v_puan - v_lig_puan;
        select 1 + count(*) into v_sira_once
          from public.lig_grubum() g
         where not g.ben and (g.puan > v_once or (g.puan = v_once and g.sira < v_sira));
        v_lig := jsonb_build_object('puan', v_lig_puan, 'sira_sonra', v_sira,
                                    'sira_once', greatest(v_sira_once, v_sira));
      else
        v_lig := jsonb_build_object('puan', v_lig_puan);
      end if;
    exception when others then
      v_lig := jsonb_build_object('puan', v_lig_puan);
    end;
  elsif v_lig_puan > 0 then
    v_lig := jsonb_build_object('puan', v_lig_puan);
  end if;

  -- Bu maçta kazanılan rozetler (rozet coini bu kaynağa yazıldıysa ya da maç bitişiyle aynı işlemde)
  select coalesce(jsonb_agg(jsonb_build_object(
           'anahtar', t.anahtar,
           'ad', case when v_dil = 'en' then coalesce(t.ad_en, t.ad_tr) else t.ad_tr end,
           'ikon', t.ikon, 'grup', t.grup, 'kademe', t.kademe) order by r.kazanildi_at, t.sira), '[]'::jsonb)
    into v_rozet
    from public.oyuncu_rozetleri r
    join public.rozet_tanimlari t on t.anahtar = r.rozet
   where r.user_id = v_me and not r.geriye_donuk
     and (exists (select 1 from public.odul_kalemleri o
                   where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem = 'rozet_odulu'
                     and o.detay ->> 'rozet' = r.rozet)
          or (v_bitis is not null and r.kazanildi_at between v_bitis - interval '2 seconds' and v_bitis + interval '5 seconds'));

  -- Günlük görevler + bu maçtan önceki ilerleme (744: yeni havuz görevleri için sayaç bu maç HARİÇ yeniden ölçülür;
  -- eski 3 kimlik (mac_oyna_3…) için 462'deki hesap aynen)
  -- (görev listesi odul_dokumu'dan — get_daily_quests ikinci kez çağrılmaz)
  select coalesce(jsonb_agg(g.j || jsonb_build_object(
           'onceki', case when gh.quest_id is not null then
               least((g.j ->> 'ilerleme')::int, greatest(0,
                 case when not v_bitti or v_ben_terk or not v_bugun_mu
                      then public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun)
                      else public.gorev_olcum(v_me, gh.sayac, coalesce(gs.parametre, gh.parametre),
                             public.gorev_gun_bas(v_bugun), public.gorev_gun_bas(v_bugun + 1), v_tur, v_id) end))
             else
               least((g.j ->> 'ilerleme')::int, greatest(0, public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun) - (
                  case when not v_bitti or v_ben_terk or not v_bugun_mu then 0
                       when g.j ->> 'id' = 'mac_oyna_3' then 1
                       when g.j ->> 'id' = 'mac_kazan_5' then (case when v_kazanan = v_me then 1 else 0 end)
                       when g.j ->> 'id' = 'dogru_25' then v_dogru
                       else 0 end)))
             end)), '[]'::jsonb)
    into v_gorev
    from jsonb_array_elements(coalesce(v_dokum -> 'gorevler', '[]'::jsonb)) as g(j)
    left join public.gorev_havuzu gh on gh.quest_id = g.j ->> 'id'
    left join public.gunluk_gorev_secimi gs on gs.tarih = v_bugun and gs.quest_id = gh.quest_id;

  -- Haftalık görevler (744, ekleyici anahtar): aynı biçim {id, ad, ilerleme, hedef, alindi, onceki}
  perform public.haftalik_secim_yap(v_hafta);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', gh.quest_id, 'ad', gh.ad_tr, 'hedef', gh.hedef,
           'ilerleme', least(n.simdi, gh.hedef::bigint),
           'alindi', exists (select 1 from public.haftalik_gorev_alimi a
                              where a.user_id = v_me and a.hafta = v_hafta and a.quest_id = gh.quest_id),
           'onceki', least(n.once, n.simdi, gh.hedef::bigint)) order by gs.slot), '[]'::jsonb)
    into v_haftalik
    from public.haftalik_gorev_secimi gs
    join public.gorev_havuzu gh on gh.quest_id = gs.quest_id
    cross join lateral (
      select public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7)) as simdi,
             case when v_bitti and not v_ben_terk and v_bitis >= public.gorev_gun_bas(v_hafta) and v_bitis < public.gorev_gun_bas(v_hafta + 7)
                  then public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7), v_tur, v_id)
                  else public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7)) end as once) n
   where gs.hafta = v_hafta;

  return jsonb_build_object(
    'kaynak', p_kaynak,
    'hazir', v_hazir,
    'bitti', v_bitti,
    'kazanan', v_kazanan,
    'terk', jsonb_build_object('ben', v_ben_terk, 'rakip', v_rakip_terk, 'edenler', to_jsonb(v_edenler)),
    'dokum', v_dokum,
    'level', v_level,
    'lig', v_lig,
    'rozetler', v_rozet,
    'gorevler', v_gorev,
    'haftalik_gorevler', v_haftalik
  );
end $function$;

revoke all on function public.mac_sonu_ozet(text) from public, anon;
grant execute on function public.mac_sonu_ozet(text) to authenticated;

revoke all on function public.gorev_dogru_satirlari(uuid, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.gorev_dogru_satirlari(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.gorev_olcum(uuid, text, jsonb, timestamptz, timestamptz, text, uuid) from public, anon, authenticated;
revoke all on function public.gorev_olcum(uuid, text, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
