-- GERİ ALMA: migration 950 (KASA modu). YALNIZ 950 canlıya uygulandıktan sonra ve geri dönmek gerekirse çalıştırılır.
-- Hazırlandı: 2026-10-03 20:57:04.05767+00 (canlı veritabanından pg_get_functiondef ile, salt-okunur). Bu dosya ÇALIŞTIRILMADI.
--
-- Ne yapar (tek işlem):
--   1) 9 ortak fonksiyonu 950 ÖNCESİ canlı tanımına döndürür (md5 değerleri her bloğun üstünde).
--      Önce bu yapılır: gorev_dogru_satirlari / gorev_sayaci SQL fonksiyonlarıdır ve kasa tablolarına
--      başvurdukları için tablolar silinmeden önce eski hâllerine dönmeleri gerekir.
--   2) kasa_tik cron işini kaldırır, kasa_sinyal tablosunu realtime yayınından çıkarır.
--   3) Kasa görünümünü, tablolarını (VERİSİYLE: maç kayıtları, hamleler, cevaplar, davetler), fonksiyonlarını
--      ve kasa_* ayarlarını siler.
-- Silinmeyenler: Kasa maçlarından verilmiş coin / XP / lig puanı / SP / rozet kayıtları (oyunculara verilmiş
--   ödüller geri alınmaz; kaynakları "kasa:<id>" olarak kalır).
-- Doğrulama: sondaki sorgu 11 satır döndürür (9 değişen + gorev_olcum ve gorev_dogru_satirlari'nın değişmeyen kısa
--   sarmalayıcıları). Değişen 9 imzanın md5'i bloklarının üstündeki değerle aynı olmalı; kalan_kasa_nesnesi = 0.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- 1) ORTAK FONKSİYONLAR — 950 öncesi canlı tanım

-- cift_odul_carpani(uuid,uuid,uuid)
-- md5 (950 öncesi): f6ead2f9f479e284165e3a518a3fb69c
CREATE OR REPLACE FUNCTION public.cift_odul_carpani(p_a uuid, p_b uuid, p_mac_id uuid DEFAULT NULL::uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tam  int := public.ayar_sayi('mac_cift_tam_sinir', 5)::int;
  v_yari int := public.ayar_sayi('mac_cift_yari_sinir', 10)::int;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_sira int;
begin
  -- Aynı cihaz/IP: sıralı maç hiç ödül vermez (sessiz koruma).
  if public.ayni_cihaz_mi(p_a, p_b) then return 0; end if;

  select
    (select count(*) from public.matches m
      where m.durum = 'bitti'
        and ((m.oyuncu1 = p_a and m.oyuncu2 = p_b) or (m.oyuncu1 = p_b and m.oyuncu2 = p_a))
        and (coalesce(m.bitis, m.created_at) at time zone 'Europe/Istanbul')::date = v_bugun
        and (p_mac_id is null or m.id <> p_mac_id))
  + (select count(*) from public.duellolar x
      where x.durum = 'bitti'
        and ((x.oyuncu1 = p_a and x.oyuncu2 = p_b) or (x.oyuncu1 = p_b and x.oyuncu2 = p_a))
        and (coalesce(x.bitis, x.created_at) at time zone 'Europe/Istanbul')::date = v_bugun
        and (p_mac_id is null or x.id <> p_mac_id))
  into v_sira;

  v_sira := v_sira + 1;   -- bu maç kaçıncı olacak

  if v_sira <= v_tam then return 1; end if;
  if v_sira <= v_yari then return 0.5; end if;
  return 0;
end;
$function$;

-- xp_mac_odulu(text,text,uuid,uuid[],numeric,boolean)
-- md5 (950 öncesi): d5fe15e37d9e667837c27a3a29cfd38f
CREATE OR REPLACE FUNCTION public.xp_mac_odulu(p_kaynak text, p_mod text, p_kazanan uuid, p_oyuncular uuid[], p_cift numeric DEFAULT 1, p_acik_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_oyuncu uuid; v_sonuc text; v_taban int; v_xp int; v_carpan numeric; v_indirim text;
  v_id uuid; v_oynadi boolean;
  v_bot_carpan numeric := public.ayar_ondalik('xp_acik_bot_carpani', 0.5);
begin
  if p_kaynak is null then return; end if;
  begin v_id := split_part(p_kaynak, ':', 2)::uuid; exception when others then v_id := null; end;

  v_carpan := least(coalesce(p_cift, 1), case when coalesce(p_acik_bot, false) then v_bot_carpan else 1 end);
  v_indirim := case when v_carpan >= 1 then null
                    when coalesce(p_cift, 1) <= 0 then 'cift_odulsuz'
                    when coalesce(p_cift, 1) = v_carpan then 'cift_yari'
                    else 'acik_bot' end;

  foreach v_oyuncu in array coalesce(p_oyuncular, '{}'::uuid[]) loop
    continue when v_oyuncu is null;
    v_sonuc := case when p_kazanan is null then 'beraberlik' when p_kazanan = v_oyuncu then 'galibiyet' else 'maglubiyet' end;
    if p_mod = 'duello' then
      -- Düello'da beraberlik yok; kazanansız biterse iki taraf mağlubiyet XP'si alır
      v_taban := case when v_sonuc = 'galibiyet' then public.ayar_sayi('xp_duello_galibiyet', 45)
                      else public.ayar_sayi('xp_duello_maglubiyet', 15) end;
      v_oynadi := exists (select 1 from public.duello_hamleler h
                           where h.duello_id = v_id and (h.saldiran = v_oyuncu or h.savunan = v_oyuncu));
    else
      v_taban := case v_sonuc when 'galibiyet' then public.ayar_sayi('xp_mac_galibiyet', 30)
                              when 'beraberlik' then public.ayar_sayi('xp_mac_beraberlik', 15)
                              else public.ayar_sayi('xp_mac_maglubiyet', 10) end;
      v_oynadi := exists (select 1 from public.match_answers a where a.match_id = v_id and a.user_id = v_oyuncu);
    end if;
    if v_sonuc <> 'galibiyet' and not v_oynadi then v_taban := 0; end if;
    v_xp := greatest(floor(v_taban * v_carpan), 0)::int;
    perform public.xp_ver(v_oyuncu, v_xp, p_kaynak,
      jsonb_strip_nulls(jsonb_build_object('sonuc', v_sonuc, 'taban', v_taban, 'carpan', v_carpan,
                                           'indirim', v_indirim, 'oynamadi', case when not v_oynadi and v_sonuc <> 'galibiyet' then true end)));
  end loop;
end $function$;

-- gorev_olcum(uuid,text,jsonb,timestamp with time zone,timestamp with time zone,text,uuid)
-- md5 (950 öncesi): c05a3326138377b207018fc8990d1249
CREATE OR REPLACE FUNCTION public.gorev_olcum(p_user uuid, p_sayac text, p_param jsonb, p_bas timestamp with time zone, p_son timestamp with time zone, p_haric_tur text, p_haric_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;

-- gorev_dogru_satirlari(uuid,timestamp with time zone,timestamp with time zone,text,uuid)
-- md5 (950 öncesi): da43baa357ac4ff48110eb9ce1ece891
CREATE OR REPLACE FUNCTION public.gorev_dogru_satirlari(p_user uuid, p_bas timestamp with time zone, p_son timestamp with time zone, p_haric_tur text, p_haric_id uuid)
 RETURNS TABLE(kategori text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- gorev_sayaci(text,uuid,date)
-- md5 (950 öncesi): 915f864b70cc398bf886f9964f341f6f
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

-- odul_dokumu(text)
-- md5 (950 öncesi): 22b4e7cc4859126dc02b8222c4d03780
CREATE OR REPLACE FUNCTION public.odul_dokumu(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|hizli|turnuva|grup):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;

  select jsonb_build_object(
    'hazir', exists (select 1 from public.odul_kalemleri o where o.user_id = v_me and o.kaynak = p_kaynak),
    'kalemler', coalesce((
      select jsonb_agg(jsonb_build_object('kalem', k.kalem, 'lig', k.lig, 'coin', k.coin, 'detay', k.detay) order by k.ilk)
        from (select o.kalem, sum(o.lig)::int lig, sum(o.coin)::int coin, min(o.id) ilk,
                     (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                        from public.odul_kalemleri x, jsonb_each(x.detay) e
                       where x.user_id = v_me and x.kaynak = p_kaynak and x.kalem = o.kalem) detay
                from public.odul_kalemleri o
               where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem <> 'rozet'
               group by o.kalem) k), '[]'::jsonb),
    'rozetler', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'ad', b.ad, 'ikon', b.ikon) order by o.id)
        from public.odul_kalemleri o join public.badges b on b.id = o.detay ->> 'rozet'
       where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem = 'rozet'), '[]'::jsonb),
    'toplam', (select jsonb_build_object('lig', coalesce(sum(o.lig), 0), 'coin', coalesce(sum(o.coin), 0))
                 from public.odul_kalemleri o where o.user_id = v_me and o.kaynak = p_kaynak),
    'gorevler', coalesce((select jsonb_agg(jsonb_build_object('id', g.quest_id, 'ad', g.ad, 'ilerleme', g.ilerleme,
                                                              'hedef', g.hedef, 'alindi', g.alindi))
                            from public.get_daily_quests() g), '[]'::jsonb)
  ) into v;
  return v;
end $function$;

-- level_kazancim(text)
-- md5 (950 öncesi): f6c92c0c004b1c4f8afe9372bb6d2aa7
CREATE OR REPLACE FUNCTION public.level_kazancim(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  h public.xp_hareketleri%rowtype;
  p record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
  select level, level_xp, xp into p from public.profiles where id = v_me;
  select * into h from public.xp_hareketleri where user_id = v_me and kaynak = p_kaynak;
  return jsonb_build_object(
    'hazir', h.id is not null,
    'xp', coalesce(h.xp, 0),
    'level_once', h.level_once,
    'level_sonra', h.level_sonra,
    'rutbe_once', case when h.id is not null then public.level_rutbe(h.level_once) end,
    'rutbe_sonra', case when h.id is not null then public.level_rutbe(h.level_sonra) end,
    'indirim', h.detay ->> 'indirim',
    'oynamadi', coalesce((h.detay ->> 'oynamadi')::boolean, false),
    'level_coin', coalesce((h.detay ->> 'level_coin')::int, 0),
    'rutbe_coin', coalesce((h.detay ->> 'rutbe_coin')::int, 0),
    'skiller', coalesce(h.detay -> 'skiller', '[]'::jsonb),
    'level', coalesce(p.level, 1),
    'level_xp', coalesce(p.level_xp, 0),
    'level_gereken', public.level_gereken_xp(coalesce(p.level, 1))
  );
end $function$;

-- mac_sonu_ozet(text)
-- md5 (950 öncesi): 0c9874a127695f29cffc1b66d8a549d7
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

-- trg_iletisim_engel()
-- md5 (950 öncesi): 2ab6618c0a8f5f658f6ac3e925418fc2
CREATE OR REPLACE FUNCTION public.trg_iletisim_engel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_a uuid; v_b uuid;
begin
  if tg_table_name = 'friendships' then
    if new.durum not in ('bekliyor', 'arkadas') then return new; end if;
    if tg_op = 'UPDATE' and old.durum is not distinct from new.durum then return new; end if;
    v_a := new.requester; v_b := new.addressee;
  elsif tg_table_name = 'matches' then
    if new.durum is distinct from 'bekliyor' then return new; end if;     -- yalnız meydan okuma / rövanş daveti
    v_a := new.oyuncu1; v_b := new.oyuncu2;
  elsif tg_table_name = 'duello_davetleri' then
    v_a := new.kuran; v_b := new.rakip;
  elsif tg_table_name = 'group_match_players' then
    if new.davet_durumu is distinct from 'bekliyor' then return new; end if;
    select g.kurucu into v_a from public.group_matches g where g.id = new.group_match_id;
    v_b := new.user_id;
  elsif tg_table_name = 'duellolar' then
    if tg_op = 'INSERT' and new.onceki_id is null then return new; end if;   -- yalnız rövanş düellosu
    if tg_op = 'UPDATE' and (new.rovans_isteyen is null or old.rovans_isteyen is not distinct from new.rovans_isteyen) then return new; end if;
    v_a := new.oyuncu1; v_b := new.oyuncu2;
  elsif tg_table_name = 'match_messages' then
    select case when m.oyuncu1 = new.user_id then m.oyuncu2 else m.oyuncu1 end into v_b from public.matches m where m.id = new.match_id;
    v_a := new.user_id;
  else
    return new;
  end if;
  if auth.uid() is not null and public.askida_mi(auth.uid()) then
    raise exception 'Hesabın askıya alındı; bu işlemi yapamazsın.';
  end if;
  if public.iletisim_engelli(v_a, v_b) then
    raise exception 'Bu oyuncuyla iletişim kuramazsın.';
  end if;
  return new;
end;
$function$;

-- 2) CRON + REALTIME
do $$
begin
  if exists (select 1 from cron.job where jobname = 'kasa_tik') then
    perform cron.unschedule('kasa_tik');
  end if;
end $$;
do $$
begin
  alter publication supabase_realtime drop table public.kasa_sinyal;
exception when undefined_object or undefined_table then null;
end $$;

-- 3) KASA NESNELERİ
drop view if exists public.kasa_deneme_ozeti;
drop table if exists public.kasa_sinyal, public.kasa_davetleri, public.kasa_kuyrugu,
                     public.kasa_cevaplari, public.kasa_hamleler, public.kasa_maclari cascade;
drop function if exists
  public.kasa_ara(boolean), public.kasa_aramadan_cik(), public.kasa_aktif_benim(), public.kasa_giris(uuid),
  public.kasa_durum(uuid), public.kasa_cevap(uuid, smallint), public.kasa_karar(uuid, boolean), public.kasa_terk(uuid),
  public.kasa_davet_et(uuid, boolean), public.kasa_davet_cevap(uuid, boolean), public.kasa_davet_iptal(uuid),
  public.kasa_acik_mi(), public.kasa_gosterim_payi(), public.kasa_nabiz_sn(), public.kasa_sinyal_ver(uuid),
  public.kasa_kopuk_kim(uuid), public.kasa_bot_tarz(uuid), public.kasa_bot_karar(uuid), public.kasa_soru_bul(uuid),
  public.kasa_altin_soru_bul(uuid), public.kasa_olustur(uuid, uuid, boolean, boolean), public.kasa_soru_ac(uuid, uuid),
  public.kasa_tur_baslat(uuid), public.kasa_bitir(uuid, uuid, text), public.trg_sezon_kasa(),
  public.kasa_karar_uygula(uuid, boolean, boolean), public.kasa_cozumle(uuid), public.kasa_altin_ac(uuid),
  public.kasa_sonraki(uuid), public.kasa_ilerlet(uuid), public.kasa_kilitle(uuid), public.kasa_tik_hepsi();
delete from public.oyun_ayarlari where anahtar like 'kasa_%';

-- Migration kaydını sil (Supabase CLI 950'yi yeniden "bekliyor" görsün)
delete from supabase_migrations.schema_migrations where version = '20260612000950';

-- 4) DOĞRULAMA (hepsi yukarıdaki md5 değerleriyle aynı olmalı; kasa nesnesi kalmamalı)
select p.oid::regprocedure::text as imza, md5(pg_get_functiondef(p.oid)) as md5
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('cift_odul_carpani', 'xp_mac_odulu', 'gorev_olcum', 'gorev_dogru_satirlari', 'gorev_sayaci', 'odul_dokumu', 'level_kazancim', 'mac_sonu_ozet', 'trg_iletisim_engel')
 order by 1;
select count(*) as kalan_kasa_nesnesi from pg_class where relname like 'kasa_%' and relnamespace = 'public'::regnamespace;

commit;
