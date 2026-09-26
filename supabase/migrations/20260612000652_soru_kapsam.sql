-- 652: Soru kapsamı — "evrensel" (dünya geneli bilgi) / "yerel" (Türkiye'ye özgü).
--
-- Kural: maçtaki oyunculardan biri Türkiye dışıysa (profiles.ulke dolu ve ≠ 'TR', ya da
-- profiles.dil ≠ 'tr') o maçta HERKESE yalnız kapsam = 'global' (evrensel) soru çıkar. Botlar sayılmaz
-- (adalet insan oyuncu içindir; Türk oyuncunun yabancı gizli bota karşı deneyimi değişmez).
-- Türkiye-Türkiye maçı değişmez. Bütün modlar tek yerden geçer: soru_sec (Klasik, Saf Bilgi,
-- Antrenman, Düello, Grup, Hızlı, Soru Değiştir, Hatalarım dolgusu) + turnuva_soru_aday
-- (Turnuva; katılımcılardan biri yabancıysa oturum ayarı app.soru_kapsam = 'evrensel').
-- Asgari havuz: evrensel filtresiyle kategoride soru_kapsam_min_havuz'dan az soru kalıyorsa
-- o kategori o maçta seçilemez (Düello uygunluk kapısı, uzatma) / yok sayılır (soru_sec → karışık).
-- Etiketler Jev ile ayrı migration'da yeniden yazılır.

-- Sütun YENİ DEĞİL: questions.kapsam ('global' | 'yerel') + questions.ulke 118'de (çok dilli şema)
-- açıldı, 119'da etiketlendi, ama hiçbir soru seçimi kullanmıyordu. 'global' = evrensel.
-- Kısıt: global → ulke null · yerel → ulke dolu (questions_kapsam_ulke_chk).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('soru_kapsam_filtresi_acik', '0'::jsonb, 'Türkiye dışı oyunculu maçta yalnız evrensel (global) soru (1 açık, 0 kapalı). Jev etiketlemesi onaylanıp yazılınca açılır (652).'),
  ('soru_kapsam_min_havuz', '60'::jsonb, 'TEST DEĞERİ — evrensel filtresiyle bir kategoride bundan az aktif soru kalırsa kategori o maçta seçilemez (652).')
on conflict (anahtar) do nothing;

-- Oyunculardan biri (bot hariç) Türkiye dışı mı?
create or replace function public.soru_kapsam_evrensel_mi(p_oyuncular uuid[])
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select coalesce(public.ayar_sayi('soru_kapsam_filtresi_acik', 1), 1) = 1
     and exists (
       select 1 from public.profiles p
        where p.id = any(coalesce(p_oyuncular, '{}'::uuid[]))
          and not coalesce(p.is_bot, false)
          and ((nullif(btrim(p.ulke), '') is not null and upper(btrim(p.ulke)) <> 'TR')
               or coalesce(nullif(btrim(p.dil), ''), 'tr') <> 'tr')
     );
$$;
revoke all on function public.soru_kapsam_evrensel_mi(uuid[]) from public, anon, authenticated;

-- Kategoride evrensel aktif soru asgari havuzu karşılıyor mu?
create or replace function public.kategori_evrensel_yeterli(p_kategori text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select count(*) >= greatest(1, coalesce(public.ayar_sayi('soru_kapsam_min_havuz', 60), 60)::int)
    from public.questions q
   where q.aktif and q.kategori = p_kategori and q.kapsam = 'global';
$$;
revoke all on function public.kategori_evrensel_yeterli(text) from public, anon, authenticated;

-- Düello: bu maçta kategori kapsam açısından seçilebilir mi? (Türkiye-Türkiye maçında her zaman evet)
create or replace function public.duello_kategori_kapsam_uygun(p_id uuid, p_kategori text)
returns boolean
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_o1 uuid; v_o2 uuid;
begin
  select d.oyuncu1, d.oyuncu2 into v_o1, v_o2 from public.duellolar d where d.id = p_id;
  if not public.soru_kapsam_evrensel_mi(array[v_o1, v_o2]) then return true; end if;
  return public.kategori_evrensel_yeterli(p_kategori);
end $$;
revoke all on function public.duello_kategori_kapsam_uygun(uuid, text) from public, anon, authenticated;

-- Turnuva: katılımcılardan biri Türkiye dışıysa bu transaction'da app.soru_kapsam = 'evrensel'.
create or replace function public.turnuva_kapsam_ayarla(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform set_config('app.soru_kapsam',
    case when public.soru_kapsam_evrensel_mi(
           (select coalesce(array_agg(tp.user_id), '{}'::uuid[])
              from public.tournament_players tp where tp.tournament_id = p_tournament_id))
         then 'evrensel' else '' end, true);
end $$;
revoke all on function public.turnuva_kapsam_ayarla(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.soru_sec(p_kategori text, p_adet integer, p_oyuncular uuid[] DEFAULT '{}'::uuid[], p_dil text DEFAULT NULL::text, p_max_okuma integer DEFAULT NULL::integer, p_serbest_klasik boolean DEFAULT false)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_oyn uuid[] := coalesce(p_oyuncular, '{}'::uuid[]);
  v_adet int := greatest(1, coalesce(p_adet, 1));
  v_kat text := p_kategori;
  v_diller text[];
  v_max int := p_max_okuma;
  v_ids uuid[] := '{}'::uuid[];
  v_deneme int;
  v_supheli_haric boolean := public.soru_supheli_haric_mi();   -- Paket 20 II.6
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  -- 324: zorluk grubu ağırlıkları
  v_w1 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_kolay', 55), 0));
  v_w2 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_orta', 30), 0));
  v_w3 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_zor', 15), 0));
  v_k uuid[]; v_o uuid[]; v_z uuid[];
  v_ik int := 1; v_io int := 1; v_iz int := 1;
  v_toplam int;
  v_r numeric;
  v_g int;
  v_sira int[];
  v_yuva int;
  -- 652: bir oyuncu Türkiye dışıysa (ülke ≠ TR ya da dil ≠ tr; bot sayılmaz) yalnız evrensel soru
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(coalesce(p_oyuncular, '{}'::uuid[]))
                        or coalesce(current_setting('app.soru_kapsam', true), '') = 'evrensel';
begin
  -- 652: evrensel filtresiyle kategori çok daralıyorsa kategori bu maçta yok sayılır (karışık havuz).
  if v_evrensel and v_kat is not null and not public.kategori_evrensel_yeterli(v_kat) then
    v_kat := null;
  end if;
  if v_w1 + v_w2 + v_w3 <= 0 then v_w1 := 1; v_w2 := 1; v_w3 := 1; end if;

  if nullif(btrim(coalesce(p_dil, '')), '') is not null then
    v_diller := array[btrim(p_dil)];
  else
    select coalesce(array_agg(distinct coalesce(nullif(btrim(pr.dil), ''), 'tr')), array['tr'])
      into v_diller
      from public.profiles pr
     where pr.id = any(v_oyn);
  end if;
  if coalesce(array_length(v_diller, 1), 0) = 0 then v_diller := array['tr']; end if;

  for v_deneme in 1..3 loop
    -- Her gruptan en çok v_adet aday (görülmemiş önce, sonra en eski görülen, rastgele).
    select coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 1), '{}'::uuid[]),
           coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 2), '{}'::uuid[]),
           coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 3), '{}'::uuid[])
      into v_k, v_o, v_z
    from (
      select q.id,
             case when q.zorluk <= 2 then 1 when q.zorluk = 3 then 2 else 3 end as grup,
             row_number() over (
               partition by case when q.zorluk <= 2 then 1 when q.zorluk = 3 then 2 else 3 end
               order by (gs.son is not null), gs.son asc, random()
             ) as rn
      from public.questions q
      left join lateral (
        select max(g.gorulen_at) as son
        from public.gorulen_sorular g
        where g.question_id = q.id and g.user_id = any(v_oyn)
      ) gs on true
      where q.aktif
        -- Paket 20 II.6: denetlenmemiş + kural işaretli soru rekabetçi havuza girmez (ayar: soru_supheli_rekabetci_haric)
        and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik
                 -- 309: Serbest Klasik'te yalnız 'sik_ipucu_jev' işareti dışlamaz; soru ancak
                 -- BAŞKA bir işaretin ağırlığı eşiğe ulaşıyorsa dışarıda kalır.
                 and (not coalesce(p_serbest_klasik, false)
                      or exists (select 1 from unnest(q.supheli_isaretler) i
                                  where i <> 'sik_ipucu_jev'
                                    and public.soru_isaret_agirligi(i) >= v_haric_agirlik)))
        and (v_kat is null or q.kategori = v_kat)
        and (not v_evrensel or q.kapsam = 'global')   -- 652: gevşetilmez
        -- HER oyuncunun dilinde okunabilmeli: ya kaynak dil o dil,
        -- ya da o dilde çevirisi var. Aksi halde soru havuzda yok.
        and not exists (
          select 1 from unnest(v_diller) d
           where d <> q.dil
             and not exists (
               select 1 from public.question_translations t
                where t.question_id = q.id and t.dil = d and not t.eskidi
             )
        )
        and (
          v_max is null
          or length(q.soru)
             + (select coalesce(sum(length(x)), 0)
                  from jsonb_array_elements_text(q.secenekler) x) <= v_max
        )
    ) s
    where s.rn <= v_adet;

    v_toplam := coalesce(array_length(v_k, 1), 0) + coalesce(array_length(v_o, 1), 0)
              + coalesce(array_length(v_z, 1), 0);

    exit when v_toplam >= v_adet;

    -- Havuz genişletme SIRASI: önce okuma yükü, sonra kategori.
    -- DİL ARTIK GEVŞETİLMİYOR — oyuncuya anlamadığı dilde soru sormaktansa
    -- havuz dar kalsın (görev kararı: "çevirisi olmayan soru sorulmasın").
    if v_max is not null then
      v_max := null;
    elsif v_kat is not null then
      v_kat := null;
    else
      exit;
    end if;
  end loop;

  -- Yuva yuva ağırlıklı grup seçimi; grup tükenirse komşu gruba düşer.
  for v_yuva in 1..least(v_adet, v_toplam) loop
    v_r := random() * (v_w1 + v_w2 + v_w3);
    v_sira := case
      when v_r < v_w1 then array[1, 2, 3]
      when v_r < v_w1 + v_w2 then array[2, 1, 3]
      else array[3, 2, 1]
    end;
    foreach v_g in array v_sira loop
      if v_g = 1 and v_ik <= coalesce(array_length(v_k, 1), 0) then
        v_ids := v_ids || v_k[v_ik]; v_ik := v_ik + 1; exit;
      elsif v_g = 2 and v_io <= coalesce(array_length(v_o, 1), 0) then
        v_ids := v_ids || v_o[v_io]; v_io := v_io + 1; exit;
      elsif v_g = 3 and v_iz <= coalesce(array_length(v_z, 1), 0) then
        v_ids := v_ids || v_z[v_iz]; v_iz := v_iz + 1; exit;
      end if;
    end loop;
  end loop;

  return v_ids;
end;
$function$;

CREATE OR REPLACE FUNCTION public.turnuva_soru_aday(p_adet integer, p_haric uuid[], p_alt integer, p_ust integer, p_dil text DEFAULT 'tr'::text, p_yakin integer DEFAULT NULL::integer)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_supheli_haric boolean := public.soru_supheli_haric_mi();
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  v_ids uuid[];
begin
  if coalesce(p_adet, 0) <= 0 then return '{}'::uuid[]; end if;

  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_ids
  from (
    select q.id from public.questions q
    where q.aktif and q.dil = coalesce(p_dil, 'tr')
      and not (v_supheli_haric and q.denetim_durumu = 'bekliyor'
               and greatest(q.supheli_agirlik,
                            coalesce((select max(public.soru_isaret_agirligi(i))
                                        from unnest(q.supheli_isaretler) i), 0)) >= v_haric_agirlik)
      and exists (select 1 from public.question_translations t
                   where t.question_id = q.id and t.dil = 'en' and not t.eskidi)
      and (p_alt is null or q.zorluk >= p_alt)
      and (p_ust is null or q.zorluk <= p_ust)
      and q.id <> all(coalesce(p_haric, '{}'::uuid[]))
      and (q.kapsam = 'global' or not coalesce(current_setting('app.soru_kapsam', true), '') = 'evrensel')   -- 652
    order by case when p_yakin is null then 0 else abs(q.zorluk - p_yakin) end, random()
    limit p_adet
  ) s;
  return v_ids;
end;
$function$;

CREATE OR REPLACE FUNCTION public.turnuva_soru_sec(p_adet integer, p_dil text DEFAULT 'tr'::text)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ids uuid[] := '{}'::uuid[];
  v_parca uuid[];
  v_d1 int := greatest(0, public.ayar_sayi('turnuva_zorluk_dilim1_son', 5)::int);
  v_d2 int;
  v_min int[];
  v_max int[];
  v_i int; v_j int;
  v_istenen int; v_eksik int; v_kalan int;
  v_supheli_haric boolean := public.soru_supheli_haric_mi();
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
begin
  v_d2 := greatest(v_d1, public.ayar_sayi('turnuva_zorluk_dilim2_son', 10)::int);
  v_min := array[public.ayar_sayi('turnuva_zorluk_dilim1_min', 1)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim2_min', 3)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim3_min', 4)::int];
  v_max := array[public.ayar_sayi('turnuva_zorluk_dilim1_max', 2)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim2_max', 3)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim3_max', 5)::int];

  for v_i in 1..3 loop
    v_istenen := case v_i
      when 1 then least(v_d1, p_adet)
      when 2 then greatest(0, least(v_d2, p_adet) - v_d1)
      else greatest(0, p_adet - v_d2)
    end;
    if v_istenen <= 0 then continue; end if;

    -- Kendi dilimi, yetmezse sırayla ALT dilimler.
    v_parca := '{}'::uuid[];
    for v_j in reverse v_i..1 loop
      v_eksik := v_istenen - coalesce(array_length(v_parca, 1), 0);
      exit when v_eksik <= 0;
      v_parca := v_parca || public.turnuva_soru_aday(v_eksik, v_ids || v_parca,
                                                      v_min[v_j], v_max[v_j], p_dil);
    end loop;

    -- Hâlâ eksikse: herhangi uygun soru, dilime en yakın zorluk önce.
    v_eksik := v_istenen - coalesce(array_length(v_parca, 1), 0);
    if v_eksik > 0 then
      v_parca := v_parca || public.turnuva_soru_aday(v_eksik, v_ids || v_parca, null, null,
                                                      p_dil, v_min[v_i]);
    end if;

    v_ids := v_ids || v_parca;
  end loop;

  -- Havuz yine de yetmediyse kalanı serbest doldur (turnuva bozulmasın).
  v_kalan := p_adet - coalesce(array_length(v_ids, 1), 0);
  if v_kalan > 0 then
    select coalesce(array_agg(s.id), '{}'::uuid[]) into v_parca
    from (
      select q.id from public.questions q
      where q.aktif
        and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik)
        and exists (select 1 from public.question_translations t
                     where t.question_id = q.id and t.dil = 'en' and not t.eskidi)
        and q.id <> all(v_ids)
        and (q.kapsam = 'global' or not coalesce(current_setting('app.soru_kapsam', true), '') = 'evrensel')   -- 652
      order by random() limit v_kalan
    ) s;
    v_ids := v_ids || coalesce(v_parca, '{}'::uuid[]);
  end if;

  return v_ids;
end;
$function$;

CREATE OR REPLACE FUNCTION public.turnuva_altin_soru_ekle(p_tournament_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_haric uuid[];
  v_yeni uuid;
  v_aralik int[] := array[
    public.ayar_sayi('turnuva_altin_zorluk_min', 4)::int,  public.ayar_sayi('turnuva_altin_zorluk_max', 5)::int,
    public.ayar_sayi('turnuva_zorluk_dilim2_min', 3)::int, public.ayar_sayi('turnuva_zorluk_dilim2_max', 3)::int,
    public.ayar_sayi('turnuva_zorluk_dilim1_min', 1)::int, public.ayar_sayi('turnuva_zorluk_dilim1_max', 2)::int];
  v_k int;
begin
  select coalesce(t.soru_ids, '{}'::uuid[]) into v_haric
    from public.tournaments t where t.id = p_tournament_id;
  perform public.turnuva_kapsam_ayarla(p_tournament_id);   -- 652

  for v_k in 0..2 loop
    v_yeni := (public.turnuva_soru_aday(1, v_haric, v_aralik[v_k*2+1], v_aralik[v_k*2+2], 'tr'))[1];
    exit when v_yeni is not null;
  end loop;

  if v_yeni is null then
    v_yeni := (public.turnuva_soru_aday(1, v_haric, null, null, 'tr', v_aralik[1]))[1];
  end if;

  -- Havuz tükenirse kısıt gevşetilir; maç asla askıda kalmaz.
  if v_yeni is null then
    select q.id into v_yeni
      from public.questions q
     where q.aktif and q.id <> all(v_haric)
     order by random() limit 1;
  end if;

  perform set_config('app.soru_kapsam', '', true);
  if v_yeni is null then return null; end if;

  update public.tournaments
     set soru_ids = coalesce(soru_ids, '{}'::uuid[]) || v_yeni,
         altin_soru = true
   where id = p_tournament_id;

  return v_yeni;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_tournament(p_seans text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t public.tournaments%rowtype;
  v_oyuncu int;
begin
  select * into t
  from public.tournaments
  where tarih = (now() at time zone 'Europe/Istanbul')::date
    and seans = p_seans
    and durum = 'lobi'
  for update;
  if not found then return; end if;

  select count(*) into v_oyuncu from public.tournament_players where tournament_id = t.id;

  if v_oyuncu < 2 then
    update public.tournaments set durum = 'iptal', bitis = now() where id = t.id;
    return;
  end if;

  perform public.turnuva_kapsam_ayarla(t.id);   -- 652
  update public.tournaments
     set durum = 'aktif',
         -- Turnuva KARIŞIK: kategori yok, ortak havuz (dil 'tr')
         soru_ids = public.turnuva_soru_sec(30, 'tr'),
         aktif_soru = 0,
         baslangic = now(),
         soru_baslangic = now()
   where id = t.id;
  perform set_config('app.soru_kapsam', '', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.turnuva_zamanlayici_tik()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_oyuncu int;
  v_baslayan int := 0;
begin
  for r in
    select t.id from public.tournaments t
     where t.durum = 'lobi' and public.turnuva_an(t.id) <= now()
     for update skip locked
  loop
    if public.turnuva_an(r.id) < now() - interval '15 minutes' then
      -- Zamanında başlatılamamış eski lobi: açık kalıp kafa karıştırmasın.
      update public.tournaments set durum = 'iptal', bitis = now() where id = r.id;
      continue;
    end if;

    select count(*) into v_oyuncu from public.tournament_players where tournament_id = r.id;
    if v_oyuncu < 2 then
      update public.tournaments set durum = 'iptal', bitis = now() where id = r.id;
      continue;
    end if;

    -- start_tournament ile aynı başlangıç (karışık havuz, 30 soru, 'tr').
    perform public.turnuva_kapsam_ayarla(r.id);   -- 652
    update public.tournaments
       set durum = 'aktif',
           soru_ids = public.turnuva_soru_sec(30, 'tr'),
           aktif_soru = 0,
           baslangic = now(),
           soru_baslangic = now()
     where id = r.id;
    perform set_config('app.soru_kapsam', '', true);
    v_baslayan := v_baslayan + 1;
  end loop;

  -- Sıradaki lobi hazır olsun (oyuncu ana sayfadan hemen katılabilsin).
  insert into public.tournaments (tarih, seans)
  select o_tarih, o_seans from public.sonraki_turnuva_bilgi()
  on conflict (tarih, seans) do nothing;

  return v_baslayan;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mac_soru_degistir(p_mac_tur text, p_mac_id uuid, p_user uuid, p_index integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_haric uuid[];
  v_kategori text;
  v_oyuncular uuid[] := array[p_user];
  v_yeni uuid;
  v_serbest boolean := false;
begin
  if p_mac_tur = '1v1' then
    select m.soru_ids,m.kategori,array[m.oyuncu1,m.oyuncu2],not m.dereceli
      into v_haric,v_kategori,v_oyuncular,v_serbest from public.matches m where m.id=p_mac_id;
  elsif p_mac_tur = 'grup' then
    select g.soru_ids,g.kategori into v_haric,v_kategori from public.group_matches g where g.id=p_mac_id;
    -- 652: kapsam kuralı için bütün oyuncular
    select coalesce(array_agg(x.user_id), array[p_user]) into v_oyuncular from public.group_match_players x where x.group_match_id=p_mac_id;
  elsif p_mac_tur = 'hizli' then
    select h.soru_ids,h.kategori into v_haric,v_kategori from public.hizli_maclar h where h.id=p_mac_id;
    select coalesce(array_agg(x.user_id), array[p_user]) into v_oyuncular from public.hizli_oyuncular x where x.hizli_mac_id=p_mac_id;
  else
    raise exception 'Bu maç türünde soru değiştirilemez';
  end if;

  v_haric := coalesce(v_haric,'{}'::uuid[]) || coalesce((
    select array_agg(d.question_id) from public.soru_degisimleri d
    where d.mac_tur=p_mac_tur and d.mac_id=p_mac_id),'{}'::uuid[]);

  select s.id into v_yeni
    from unnest(public.soru_sec(v_kategori,25,coalesce(v_oyuncular,array[p_user]),p_serbest_klasik => coalesce(v_serbest,false))) s(id)
    where s.id <> all(v_haric) limit 1;
  if v_yeni is null then raise exception 'Bu kategoride değiştirilecek yeni soru kalmadı'; end if;

  insert into public.soru_degisimleri(mac_tur,mac_id,user_id,soru_index,question_id,baslangic)
  values(p_mac_tur,p_mac_id,p_user,p_index,v_yeni,now())
  on conflict(mac_tur,mac_id,user_id,soru_index)
  do update set question_id=excluded.question_id,baslangic=now();
  return v_yeni;
end;
$function$;

CREATE OR REPLACE FUNCTION public.duello_soru_bul(p_id uuid, p_kategori text, p_oyuncular uuid[], p_haric uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_adaylar uuid[];
  v_s uuid;
  v_supheli_haric boolean := public.soru_supheli_haric_mi();   -- Paket 20 II.6
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
begin
  v_adaylar := public.soru_sec(p_kategori, 8, p_oyuncular);
  foreach v_s in array coalesce(v_adaylar, '{}') loop
    if not (v_s = any(coalesce(p_haric, '{}'))) then return v_s; end if;
  end loop;
  select q.id into v_s from public.questions q
   where q.aktif and q.kategori = p_kategori and not (q.id = any(coalesce(p_haric, '{}')))
     and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik)
     and (q.kapsam = 'global' or not public.soru_kapsam_evrensel_mi(p_oyuncular))   -- 652
   order by random() limit 1;
  return v_s;
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from (select h.kategori from public.duello_hamleler h
                                       where h.duello_id = p_id order by h.id desc limit 1)
     and (select count(*) from public.duello_hamleler h
           where h.duello_id = p_id and h.kategori = p_kategori and not h.uzatma)
         < public.ayar_sayi('duello_kategori_max', 2)
     -- 650: savunanın bu seçim için kalkanla koruduğu kategori seçilemez
     and p_kategori is distinct from public.duello2_aktif_kalkan(p_id)
     -- 652: yabancı oyunculu maçta evrensel havuzu dar kategori seçilemez
     and public.duello_kategori_kapsam_uygun(p_id, p_kategori);
$function$;

CREATE OR REPLACE FUNCTION public.duello2_uzatma_ac(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id for update;
  update public.duellolar
     set uzatma = true,
         tur = case when saldiri_sirasi = 1 then tur + 1 else tur end,
         saldiri_sirasi = case when saldiri_sirasi = 1 then 0 else 1 end,
         saldiran = case when saldiri_sirasi = 1 then oyuncu1 else oyuncu2 end,
         son_hareket = now()
   where id = p_id;
  select k into v_kat from unnest(public.duello_kategorileri()) k
   order by public.duello_kategori_kapsam_uygun(p_id, k) desc, random() limit 1;   -- 652
  perform public.duello2_soru_ac(p_id, v_kat);
exception when raise_exception then
  -- Havuzda kullanılmamış hiç soru kalmadı (pratikte olmaz): eski altın sorunun
  -- son çaresi gibi ilk oyuncu kazanır ki maç asılı kalmasın.
  perform public.duello_bitir(p_id, d.oyuncu1);
end $function$;

CREATE OR REPLACE FUNCTION public.get_categories()
 RETURNS TABLE(kategori text, soru_sayisi bigint, gorulen_sayisi bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select q.kategori,
         count(*) as soru_sayisi,
         count(*) filter (where g.user_id is not null) as gorulen_sayisi
  from public.questions q
  left join public.gorulen_sorular g
    on g.question_id = q.id and g.user_id = auth.uid()
  where q.aktif
    -- 652: oyuncunun dilinde okunabilen soru (kaynak dil ya da güncel çeviri); eskiden yalnız
    -- kaynak dil sayılıyordu → dili 'en' olan oyuncuya liste boş dönüyordu.
    and (q.dil = coalesce((select nullif(btrim(pr.dil), '') from public.profiles pr where pr.id = auth.uid()), 'tr')
         or exists (select 1 from public.question_translations t
                     where t.question_id = q.id and not t.eskidi
                       and t.dil = (select nullif(btrim(pr.dil), '') from public.profiles pr where pr.id = auth.uid())))
    -- 652: Türkiye dışı oyuncuya yalnız evrensel sorular sayılır; dar kategoriler listeden düşer
    and (q.kapsam = 'global' or not public.soru_kapsam_evrensel_mi(array[auth.uid()]))
    -- 'genel' ve 'karisik' birleştirildi; "Karışık" artık kategori SEÇMEMEK demek
    and q.kategori not in ('genel', 'karisik')
  group by q.kategori
  having count(*) >= case when public.soru_kapsam_evrensel_mi(array[auth.uid()])
                          then greatest(15, public.ayar_sayi('soru_kapsam_min_havuz', 60)::int) else 15 end
  order by (q.kategori = 'genel_kultur') desc, count(*) desc;
$function$;
