-- 741 — Görev sistemi genişlemesi (2/4): sunucu sayaçları. TSİ gün/hafta penceresi, Antrenman (açık bot) HARİÇ, terk eden HARİÇ.
--  * "Açık bot" tespiti sezon_mac_sp / sp_acik_bot_carpani ile AYNI: rakip profili `acik_bot` ya da `acik_bot_mu(is_bot, bot_turu)`.
--    Gizli botlar normal oyuncu sayılır.
--  * Modlar 460'taki gorev_sayaci ile aynı yapı: Klasik/Saf Bilgi (matches) + Düello + Hızlı Mod + Grup + Turnuva.
--    Antrenman yalnız matches/duellolar'da olabilir (rakip açık bot). Terk eden: matches/duellolar.terk_eden, grup/turnuva terk_at.
--  * Doğru cevaplar: Düello'da iki taraf da cevaplar → savunanın (dogru) ve saldıranın (dogru_saldiran) doğrusu sayılır.
--  * Eski gorev_sayaci (mac_oyna_3, mac_kazan_5, dogru_25) AYNEN durur (BP bonus görevi, maç sonu özeti ona bağlı); yalnız
--    tanımadığı (yeni) görev kimliğini havuz sayacına yönlendirir.

create or replace function public.gorev_acik_bot_mu(p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select coalesce(p.acik_bot, false) or public.acik_bot_mu(p.is_bot, p.bot_turu)
                     from public.profiles p where p.id = p_user), false);
$$;

-- Penceredeki DOĞRU cevapların kategorisi (her doğru cevap bir satır)
create or replace function public.gorev_dogru_satirlari(p_user uuid, p_bas timestamptz, p_son timestamptz)
 returns table (kategori text) language sql stable security definer set search_path to 'public'
as $$
  select q.kategori
    from public.match_answers a
    join public.matches m on m.id = a.match_id
    left join public.questions q on q.id = m.soru_ids[a.soru_index + 1]
   where a.user_id = p_user and a.dogru and a.created_at >= p_bas and a.created_at < p_son
     and m.durum in ('aktif', 'bitti') and m.terk_eden is distinct from p_user
     and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end)
  union all
  select coalesce(q.kategori, h.kategori)
    from public.duello_hamleler h
    join public.duellolar d on d.id = h.duello_id
    left join public.questions q on q.id = h.soru_id
   where h.created_at >= p_bas and h.created_at < p_son
     and ((h.savunan = p_user and h.dogru) or (h.saldiran = p_user and coalesce(h.dogru_saldiran, false)))
     and d.durum in ('aktif', 'bitti') and d.terk_eden is distinct from p_user
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
   where ga.user_id = p_user and ga.dogru and ga.created_at >= p_bas and ga.created_at < p_son
     and not exists (select 1 from public.group_match_players gx
                      where gx.group_match_id = ga.group_match_id and gx.user_id = p_user and gx.terk_at is not null)
  union all
  select q.kategori
    from public.tournament_answers ta
    join public.tournaments t on t.id = ta.tournament_id
    left join public.questions q on q.id = t.soru_ids[ta.soru_index + 1]
   where ta.user_id = p_user and ta.dogru and ta.created_at >= p_bas and ta.created_at < p_son
     and not exists (select 1 from public.tournament_players tx
                      where tx.tournament_id = ta.tournament_id and tx.user_id = p_user and tx.terk_at is not null);
$$;

-- Yeni sayaçlar: (oyuncu, sayaç, parametre, [bas, son)) → adet
create or replace function public.gorev_olcum(p_user uuid, p_sayac text, p_param jsonb, p_bas timestamptz, p_son timestamptz)
 returns bigint language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v bigint := 0;
begin
  if p_user is null then return 0; end if;

  if p_sayac in ('mac_oyna', 'duello_mac') then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
       and d.bitis >= p_bas and d.bitis < p_son
       and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end);
    if p_sayac = 'mac_oyna' then
      v := v
        + (select count(*) from public.matches m
            where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
              and m.bitis >= p_bas and m.bitis < p_son
              and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end))
        + (select count(*) from public.hizli_mod_oturumlar h
            where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= p_bas and h.bitis < p_son)
        + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id
            where g.durum = 'bitti' and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null
              and g.bitis >= p_bas and g.bitis < p_son)
        + (select count(*) from public.tournaments t join public.tournament_players tp on tp.tournament_id = t.id
            where t.durum = 'bitti' and tp.user_id = p_user and tp.terk_at is null and t.bitis >= p_bas and t.bitis < p_son);
    end if;

  elsif p_sayac in ('mac_kazan', 'duello_galibiyet') then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user and d.terk_eden is distinct from p_user
       and d.bitis >= p_bas and d.bitis < p_son
       and not public.gorev_acik_bot_mu(case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end);
    if p_sayac = 'mac_kazan' then
      v := v
        + (select count(*) from public.matches m
            where m.durum = 'bitti' and m.kazanan = p_user and m.terk_eden is distinct from p_user
              and m.bitis >= p_bas and m.bitis < p_son
              and not public.gorev_acik_bot_mu(case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end))
        + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id
            where g.durum = 'bitti' and g.kazanan = p_user and gp.user_id = p_user and gp.davet_durumu = 'kabul'
              and gp.terk_at is null and g.bitis >= p_bas and g.bitis < p_son)
        + (select count(*) from public.tournaments t
            where t.durum = 'bitti' and t.kazanan = p_user and t.bitis >= p_bas and t.bitis < p_son
              and exists (select 1 from public.tournament_players tp
                           where tp.tournament_id = t.id and tp.user_id = p_user and tp.terk_at is null));
    end if;

  elsif p_sayac = 'dogru_soru' then
    select count(*) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son);

  elsif p_sayac = 'kategori_dogru' then
    select count(*) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son) s
     where s.kategori = p_param ->> 'kategori';

  elsif p_sayac = 'farkli_kategori_dogru' then
    select count(distinct s.kategori) into v from public.gorev_dogru_satirlari(p_user, p_bas, p_son) s
     where s.kategori is not null;
  end if;

  return coalesce(v, 0);
end $$;

-- TSİ pencere yardımcıları
create or replace function public.gorev_gun_bas(p_tarih date)
 returns timestamptz language sql immutable as $$ select p_tarih::timestamp at time zone 'Europe/Istanbul'; $$;

-- Verilen anın haftası: pazartesi (TSİ) — lig haftasıyla (hafta_basi) aynı
create or replace function public.gorev_hafta_basi(p_an timestamptz default now())
 returns date language sql immutable
as $$ select date_trunc('week', p_an at time zone 'Europe/Istanbul')::date; $$;

-- Havuz sayacı: yeni görev kimliği + gün → ilerleme (gün görevi: o günün penceresi; hafta görevi: günün haftası)
create or replace function public.gorev_havuz_sayaci(p_quest_id text, p_user uuid, p_tarih date)
 returns bigint language plpgsql stable security definer set search_path to 'public'
as $$
declare
  h public.gorev_havuzu;
  v_param jsonb;
  v_bas timestamptz;
  v_son timestamptz;
  v_hafta date;
begin
  select * into h from public.gorev_havuzu where quest_id = p_quest_id;
  if h.quest_id is null then return 0; end if;
  if h.kapsam = 'gunluk' then
    v_param := coalesce((select s.parametre from public.gunluk_gorev_secimi s where s.tarih = p_tarih and s.quest_id = p_quest_id), h.parametre);
    v_bas := public.gorev_gun_bas(p_tarih);
    v_son := public.gorev_gun_bas(p_tarih + 1);
  else
    v_param := h.parametre;
    v_hafta := public.gorev_hafta_basi(public.gorev_gun_bas(p_tarih));
    v_bas := public.gorev_gun_bas(v_hafta);
    v_son := public.gorev_gun_bas(v_hafta + 7);
  end if;
  return public.gorev_olcum(p_user, h.sayac, v_param, v_bas, v_son);
end $$;

-- Eski gorev_sayaci: 460'taki gövde AYNEN; yalnız `else 0` → havuz sayacı (eski kimlikler için davranış değişmedi)
CREATE OR REPLACE FUNCTION public.gorev_sayaci(p_quest_id text, p_user uuid, p_tarih date)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with sinir as (
    select (p_tarih::timestamp at time zone 'Europe/Istanbul') as bas,
           ((p_tarih + 1)::timestamp at time zone 'Europe/Istanbul') as son
  )
  select case p_quest_id
    when 'mac_oyna_3' then
      (select count(*) from public.matches m, sinir s
        where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user and m.bitis >= s.bas and m.bitis < s.son)
    + (select count(*) from public.duellolar d, sinir s
        where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user and d.bitis >= s.bas and d.bitis < s.son)
    + (select count(*) from public.hizli_mod_oturumlar h, sinir s
        where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= s.bas and h.bitis < s.son)
    + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id, sinir s
        where g.durum = 'bitti' and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null and g.bitis >= s.bas and g.bitis < s.son)
    + (select count(*) from public.tournaments t join public.tournament_players tp on tp.tournament_id = t.id, sinir s
        where t.durum = 'bitti' and tp.user_id = p_user and tp.terk_at is null and t.bitis >= s.bas and t.bitis < s.son)
    when 'mac_kazan_5' then
      (select count(*) from public.matches m, sinir s
        where m.durum = 'bitti' and m.kazanan = p_user and m.bitis >= s.bas and m.bitis < s.son)
    + (select count(*) from public.duellolar d, sinir s
        where d.durum = 'bitti' and d.kazanan = p_user and d.bitis >= s.bas and d.bitis < s.son)
    + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id, sinir s
        where g.durum = 'bitti' and g.kazanan = p_user and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null and g.bitis >= s.bas and g.bitis < s.son)
    + (select count(*) from public.tournaments t, sinir s
        where t.durum = 'bitti' and t.kazanan = p_user and t.bitis >= s.bas and t.bitis < s.son)
    when 'dogru_25' then
      (select count(*) from public.match_answers a, sinir s
        where a.user_id = p_user and a.dogru and a.created_at >= s.bas and a.created_at < s.son
          and not exists (select 1 from public.matches mx where mx.id = a.match_id and mx.terk_eden = p_user))
    + (select count(*) from public.duello_hamleler dh, sinir s
        where dh.savunan = p_user and dh.dogru and dh.created_at >= s.bas and dh.created_at < s.son
          and not exists (select 1 from public.duellolar dx where dx.id = dh.duello_id and dx.terk_eden = p_user))
    + (select coalesce(sum(h.dogru), 0) from public.hizli_mod_oturumlar h, sinir s
        where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= s.bas and h.bitis < s.son)
    + (select count(*) from public.group_match_answers ga, sinir s
        where ga.user_id = p_user and ga.dogru and ga.created_at >= s.bas and ga.created_at < s.son
          and not exists (select 1 from public.group_match_players gx where gx.group_match_id = ga.group_match_id and gx.user_id = p_user and gx.terk_at is not null))
    + (select count(*) from public.tournament_answers ta, sinir s
        where ta.user_id = p_user and ta.dogru and ta.created_at >= s.bas and ta.created_at < s.son
          and not exists (select 1 from public.tournament_players tx where tx.tournament_id = ta.tournament_id and tx.user_id = p_user and tx.terk_at is not null))
    else public.gorev_havuz_sayaci(p_quest_id, p_user, p_tarih)
  end;
$function$;

-- İç yardımcılar: istemci çağıramaz (gorevlerim/gorev_al security definer içinden çağrılır)
revoke all on function public.gorev_acik_bot_mu(uuid) from public, anon, authenticated;
revoke all on function public.gorev_dogru_satirlari(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.gorev_olcum(uuid, text, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.gorev_gun_bas(date) from public, anon, authenticated;
revoke all on function public.gorev_hafta_basi(timestamptz) from public, anon, authenticated;
revoke all on function public.gorev_havuz_sayaci(text, uuid, date) from public, anon, authenticated;
revoke execute on function public.gorev_sayaci(text, uuid, date) from public, anon, authenticated;
