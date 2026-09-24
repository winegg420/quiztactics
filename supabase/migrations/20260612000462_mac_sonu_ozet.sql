-- 462: mac_sonu_ozet(kaynak) — yeni maç sonu sahnesinin TEK çağrılık verisi (A.3, Ida onayı 24 Eyl 2026).
--
-- Ekleyici, yalnız okur (lig sırası için lig_grubum() üyeliği kurabilir — mevcut davranış).
-- Eski iki çağrı (odul_dokumu + level_kazancim) ve eksik parçalar tek yanıtta:
--   hazir       ödül/XP kaydı yazıldı mı (terk edende ve grup maçında maç bitince true)
--   bitti       maç bitti mi
--   terk        { ben: bool, rakip: bool, edenler: [uuid] } — 460 terk kaydından
--   dokum       odul_dokumu(kaynak) (kalemler, toplam, eski rozetler, günlük görevler)
--   level       level_kazancim(kaynak) + level_xp_once / level_gereken_once (çubuk animasyonu)
--               (grup maçında null — grup XP vermez)
--   lig         { puan, sira_once, sira_sonra } — yalnız bu maçtan lig puanı geldiyse
--   rozetler    bu maçta kazanılan rozetler (rozet_tanimlari: anahtar, ad, ikon, grup, kademe)
--   gorevler    günlük görevler + onceki (bu maçtan önceki ilerleme)
-- Sayılar sunucu kaydından okunur; burada ödül hesaplanmaz.

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

  -- Günlük görevler + bu maçtan önceki ilerleme
  -- (görev listesi odul_dokumu'dan — get_daily_quests ikinci kez çağrılmaz)
  select coalesce(jsonb_agg(g.j || jsonb_build_object(
           'onceki', least((g.j ->> 'ilerleme')::int, greatest(0, public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun) - (
              case when not v_bitti or v_ben_terk or not v_bugun_mu then 0
                   when g.j ->> 'id' = 'mac_oyna_3' then 1
                   when g.j ->> 'id' = 'mac_kazan_5' then (case when v_kazanan = v_me then 1 else 0 end)
                   when g.j ->> 'id' = 'dogru_25' then v_dogru
                   else 0 end))))), '[]'::jsonb)
    into v_gorev
    from jsonb_array_elements(coalesce(v_dokum -> 'gorevler', '[]'::jsonb)) as g(j);

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
    'gorevler', v_gorev
  );
end $function$;

revoke all on function public.mac_sonu_ozet(text) from public, anon;
grant execute on function public.mac_sonu_ozet(text) to authenticated;
