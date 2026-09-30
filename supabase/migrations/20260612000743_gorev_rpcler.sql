-- 743 — Görev sistemi genişlemesi (4/4): istemci RPC'leri. security definer, yalnız authenticated, oyuncu satırı FOR UPDATE, idempotent.
--  gorevlerim()                 → günlük + haftalık + sandık durumu (tek JSON)
--  gorev_al(kapsam, quest_id)   → günlük/haftalık görev ödülü (coin + SP); ikinci çağrı {alindi:false, zaten:true}
--  haftalik_sandik_al()         → 3 haftalık görev ALINMIŞSA: SP + joker
--  get_daily_quests / claim_quest: eski istemci (önbellekli PWA) için AYNI imza; artık yeni günlük seçimle çalışır.
-- Kurallar:
--  * Coin: coin_ekle(tur 'gorev') — günlük coin tavanı eski günlük görevle AYNI (tavana takılır; 'gorev' istisna listesinde değil).
--  * SP: günlük görev quest_progress INSERT'inde trg_sezon_gorev ile (sp_gunluk_gorev); haftalık + sandık sezon_puani_ekle(kaynak 'gorev').
--    BP sahibinde x bp_sp_carpan; sezon kapalı/yoksa SP verilmez ama coin/joker verilir.
--  * Günlük alım kaydı quest_progress'te (eski claim_quest ile ortak: aynı görev iki yoldan alınamaz). Lig puanı (profiles.puan)
--    yeni görevlerde VERİLMEZ (eski 3 görevde 20/50/30 idi; yeni görevlerde ödül yalnız coin + SP).
--  * Joker: joker_hareket(kaynak 'hediye', ref 'gorev:haftalik_sandik:<hafta>').

-- Yenilenme: bir sonraki TSİ gün / pazartesi 00:00'a kalan saniye
create or replace function public.gorev_iclem_ozet(p_user uuid)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_hafta date := public.gorev_hafta_basi(now());
  v_gbas timestamptz := public.gorev_gun_bas(v_bugun);
  v_gson timestamptz := public.gorev_gun_bas(v_bugun + 1);
  v_hbas timestamptz := public.gorev_gun_bas(v_hafta);
  v_hson timestamptz := public.gorev_gun_bas(v_hafta + 7);
  v_coin_g int := public.ayar_sayi('coin_gunluk_gorev', 15)::int;
  v_sp_g int := public.ayar_sayi('sp_gunluk_gorev', 10)::int;
  v_coin_h int := public.ayar_sayi('gorev_haftalik_coin', 50)::int;
  v_sp_h int := public.ayar_sayi('sp_haftalik_gorev', 25)::int;
  v_sandik_sp int := public.ayar_sayi('gorev_haftalik_sandik_sp', 75)::int;
  v_joker_adet int := public.ayar_sayi('gorev_haftalik_sandik_joker_adet', 1)::int;
  v_joker_tur text := coalesce((select deger #>> '{}' from public.oyun_ayarlari where anahtar = 'gorev_haftalik_sandik_joker_tur'), 'soru_degistir');
  v_g jsonb;
  v_h jsonb;
  v_tamam int;
  v_sandik_alindi boolean;
  v_alinabilir int;
begin
  perform public.gunluk_secim_yap(v_bugun);
  perform public.haftalik_secim_yap(v_hafta);

  select coalesce(jsonb_agg(x.j order by x.sira), '[]'::jsonb) into v_g from (
    select case s.zorluk when 'kolay' then 1 when 'orta' then 2 else 3 end as sira,
           jsonb_build_object(
             'quest_id', h.quest_id, 'ad_tr', h.ad_tr, 'ad_en', h.ad_en, 'zorluk', s.zorluk, 'sayac', h.sayac,
             'hedef', h.hedef, 'parametre', s.parametre,
             'ilerleme', least(o.n, h.hedef::bigint), 'alindi', a.v,
             'alinabilir', (o.n >= h.hedef and not a.v),
             'odul', jsonb_build_object('coin', v_coin_g, 'sp', v_sp_g)) as j
      from public.gunluk_gorev_secimi s
      join public.gorev_havuzu h on h.quest_id = s.quest_id
      cross join lateral (select public.gorev_olcum(p_user, h.sayac, s.parametre, v_gbas, v_gson) as n) o
      cross join lateral (select exists (select 1 from public.quest_progress p
                                          where p.user_id = p_user and p.tarih = v_bugun and p.quest_id = h.quest_id) as v) a
     where s.tarih = v_bugun) x;

  select coalesce(jsonb_agg(x.j order by x.sira), '[]'::jsonb) into v_h from (
    select s.slot as sira,
           jsonb_build_object(
             'quest_id', h.quest_id, 'ad_tr', h.ad_tr, 'ad_en', h.ad_en, 'zorluk', null::text, 'sayac', h.sayac,
             'hedef', h.hedef, 'parametre', h.parametre,
             'ilerleme', least(o.n, h.hedef::bigint), 'alindi', a.v,
             'alinabilir', (o.n >= h.hedef and not a.v),
             'odul', jsonb_build_object('coin', v_coin_h, 'sp', v_sp_h)) as j
      from public.haftalik_gorev_secimi s
      join public.gorev_havuzu h on h.quest_id = s.quest_id
      cross join lateral (select public.gorev_olcum(p_user, h.sayac, h.parametre, v_hbas, v_hson) as n) o
      cross join lateral (select exists (select 1 from public.haftalik_gorev_alimi p
                                          where p.user_id = p_user and p.hafta = v_hafta and p.quest_id = h.quest_id) as v) a
     where s.hafta = v_hafta) x;

  select count(*) into v_tamam from jsonb_array_elements(v_h) e where (e ->> 'alindi')::boolean;
  v_sandik_alindi := exists (select 1 from public.haftalik_gorev_alimi p
                              where p.user_id = p_user and p.hafta = v_hafta and p.quest_id = 'sandik');

  select (select count(*) from jsonb_array_elements(v_g) e where (e ->> 'alinabilir')::boolean)
       + (select count(*) from jsonb_array_elements(v_h) e where (e ->> 'alinabilir')::boolean)
       + case when v_tamam >= 3 and not v_sandik_alindi then 1 else 0 end
    into v_alinabilir;

  return jsonb_build_object(
    'gunluk', jsonb_build_object('yenilenme_sn', greatest(0, extract(epoch from (v_gson - now()))::int), 'gorevler', v_g),
    'haftalik', jsonb_build_object(
      'yenilenme_sn', greatest(0, extract(epoch from (v_hson - now()))::int),
      'gorevler', v_h,
      'sandik', jsonb_build_object(
        'tamam', v_tamam, 'hedef', 3, 'alindi', v_sandik_alindi,
        'alinabilir', (v_tamam >= 3 and not v_sandik_alindi),
        'sp', v_sandik_sp, 'joker', jsonb_build_object('tur', v_joker_tur, 'adet', v_joker_adet))),
    'alinabilir_sayi', v_alinabilir);
end $$;

create or replace function public.gorevlerim()
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return public.gorev_iclem_ozet(auth.uid());
end $$;

-- Görev alımı (iç; hız sınırı çağıran RPC'de)
create or replace function public.gorev_al_ic(p_user uuid, p_kapsam text, p_quest_id text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_hafta date := public.gorev_hafta_basi(now());
  h public.gorev_havuzu;
  v_par jsonb;
  v_n bigint;
  v_coin int;
  v_verilen int := 0;
  v_sp int;
  v_ref text;
  v_ok boolean;
  v_rc int;
begin
  if p_user is null then raise exception 'Giriş gerekli'; end if;
  if p_kapsam is null or p_kapsam not in ('gunluk', 'haftalik') then raise exception 'Geçersiz kapsam'; end if;
  -- Oyuncu satırı kilidi: aynı oyuncunun eşzamanlı alımları sıraya girer (ikincisi "zaten alınmış" görür)
  perform 1 from public.profiles where id = p_user for update;
  if not found then raise exception 'Giriş gerekli'; end if;

  if p_kapsam = 'gunluk' then
    perform public.gunluk_secim_yap(v_bugun);
    select g.* into h from public.gorev_havuzu g
      join public.gunluk_gorev_secimi s on s.quest_id = g.quest_id and s.tarih = v_bugun
     where g.quest_id = p_quest_id;
    if h.quest_id is null then raise exception 'Görev bulunamadı'; end if;
    select s.parametre into v_par from public.gunluk_gorev_secimi s where s.tarih = v_bugun and s.quest_id = p_quest_id;
    v_n := public.gorev_olcum(p_user, h.sayac, v_par, public.gorev_gun_bas(v_bugun), public.gorev_gun_bas(v_bugun + 1));
    if v_n < h.hedef then raise exception 'Görev henüz tamamlanmadı'; end if;

    -- SP: quest_progress INSERT tetikleyicisi (trg_sezon_gorev, referans 'tarih:quest_id')
    insert into public.quest_progress (user_id, tarih, quest_id, odul) values (p_user, v_bugun, p_quest_id, 0)
    on conflict do nothing;
    get diagnostics v_rc = row_count; v_ok := v_rc > 0;
    if not v_ok then
      return jsonb_build_object('alindi', false, 'zaten', true, 'kapsam', p_kapsam, 'quest_id', p_quest_id, 'coin', 0, 'sp', null);
    end if;

    v_coin := public.ayar_sayi('coin_gunluk_gorev', 15)::int;
    v_verilen := least(v_coin, public.coin_gunluk_kalan(p_user))::int;
    perform public.coin_ekle(p_user, v_coin, 'gorev', 'gorev:gunluk:' || v_bugun::text || ':' || p_quest_id);
    select m.miktar into v_sp from public.sezon_puan_hareketleri m
     where m.user_id = p_user and m.kaynak = 'gorev' and m.referans = v_bugun::text || ':' || p_quest_id
     order by m.id desc limit 1;
  else
    perform public.haftalik_secim_yap(v_hafta);
    select g.* into h from public.gorev_havuzu g
      join public.haftalik_gorev_secimi s on s.quest_id = g.quest_id and s.hafta = v_hafta
     where g.quest_id = p_quest_id;
    if h.quest_id is null then raise exception 'Görev bulunamadı'; end if;
    v_n := public.gorev_olcum(p_user, h.sayac, h.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7));
    if v_n < h.hedef then raise exception 'Görev henüz tamamlanmadı'; end if;

    insert into public.haftalik_gorev_alimi (user_id, hafta, quest_id) values (p_user, v_hafta, p_quest_id)
    on conflict do nothing;
    get diagnostics v_rc = row_count; v_ok := v_rc > 0;
    if not v_ok then
      return jsonb_build_object('alindi', false, 'zaten', true, 'kapsam', p_kapsam, 'quest_id', p_quest_id, 'coin', 0, 'sp', null);
    end if;

    v_ref := 'gorev:haftalik:' || v_hafta::text || ':' || p_quest_id;
    v_coin := public.ayar_sayi('gorev_haftalik_coin', 50)::int;
    v_verilen := least(v_coin, public.coin_gunluk_kalan(p_user))::int;
    perform public.coin_ekle(p_user, v_coin, 'gorev', v_ref);
    perform public.sezon_puani_ekle(p_user, 'gorev', v_ref, public.ayar_sayi('sp_haftalik_gorev', 25)::int);
    select m.miktar into v_sp from public.sezon_puan_hareketleri m
     where m.user_id = p_user and m.kaynak = 'gorev' and m.referans = v_ref order by m.id desc limit 1;
    update public.haftalik_gorev_alimi set odul = jsonb_build_object('coin', v_verilen, 'sp', v_sp)
     where user_id = p_user and hafta = v_hafta and quest_id = p_quest_id;
  end if;

  return jsonb_build_object('alindi', true, 'zaten', false, 'kapsam', p_kapsam, 'quest_id', p_quest_id,
                            'coin', v_verilen, 'sp', v_sp);
end $$;

create or replace function public.gorev_al(p_kapsam text, p_quest_id text)
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
begin
  perform public.hiz_siniri('gorev_al', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return public.gorev_al_ic(auth.uid(), p_kapsam, p_quest_id);
end $$;

create or replace function public.haftalik_sandik_al()
 returns jsonb language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_hafta date := public.gorev_hafta_basi(now());
  v_alinan int;
  v_ok boolean;
  v_rc int;
  v_sp int;
  v_ref text;
  v_joker_adet int := public.ayar_sayi('gorev_haftalik_sandik_joker_adet', 1)::int;
  v_joker_tur text := coalesce((select deger #>> '{}' from public.oyun_ayarlari where anahtar = 'gorev_haftalik_sandik_joker_tur'), 'soru_degistir');
begin
  perform public.hiz_siniri('haftalik_sandik_al', 10, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform 1 from public.profiles where id = v_me for update;
  if not found then raise exception 'Giriş gerekli'; end if;
  perform public.haftalik_secim_yap(v_hafta);

  select count(*) into v_alinan from public.haftalik_gorev_alimi a
    join public.haftalik_gorev_secimi s on s.hafta = a.hafta and s.quest_id = a.quest_id
   where a.user_id = v_me and a.hafta = v_hafta;
  if v_alinan < 3 then raise exception 'Haftalık görevlerin hepsini almadan sandık açılmaz'; end if;

  insert into public.haftalik_gorev_alimi (user_id, hafta, quest_id) values (v_me, v_hafta, 'sandik')
  on conflict do nothing;
  get diagnostics v_rc = row_count; v_ok := v_rc > 0;
  if not v_ok then
    return jsonb_build_object('alindi', false, 'zaten', true, 'sp', null, 'joker', jsonb_build_object('tur', v_joker_tur, 'adet', 0));
  end if;

  v_ref := 'gorev:haftalik_sandik:' || v_hafta::text;
  perform public.sezon_puani_ekle(v_me, 'gorev', v_ref, public.ayar_sayi('gorev_haftalik_sandik_sp', 75)::int);
  select m.miktar into v_sp from public.sezon_puan_hareketleri m
   where m.user_id = v_me and m.kaynak = 'gorev' and m.referans = v_ref order by m.id desc limit 1;
  if v_joker_adet > 0 then
    perform public.joker_hareket(v_me, v_joker_tur, v_joker_adet, 'hediye', v_ref);
  end if;
  update public.haftalik_gorev_alimi set odul = jsonb_build_object('sp', v_sp, 'joker', jsonb_build_object('tur', v_joker_tur, 'adet', v_joker_adet))
   where user_id = v_me and hafta = v_hafta and quest_id = 'sandik';

  return jsonb_build_object('alindi', true, 'zaten', false, 'sp', v_sp,
                            'joker', jsonb_build_object('tur', v_joker_tur, 'adet', v_joker_adet));
end $$;

-- ---------------------------------------------------------------- eski RPC'ler: aynı imza, yeni günlük seçimle
create or replace function public.get_daily_quests()
 returns table (quest_id text, ad text, hedef int, odul int, ilerleme bigint, alindi boolean)
 language plpgsql volatile security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.gunluk_secim_yap(v_bugun);
  return query
    select h.quest_id, h.ad_tr, h.hedef, public.ayar_sayi('coin_gunluk_gorev', 15)::int,
           least(public.gorev_olcum(v_me, h.sayac, s.parametre, public.gorev_gun_bas(v_bugun), public.gorev_gun_bas(v_bugun + 1)), h.hedef::bigint),
           exists (select 1 from public.quest_progress p where p.user_id = v_me and p.tarih = v_bugun and p.quest_id = h.quest_id)
      from public.gunluk_gorev_secimi s
      join public.gorev_havuzu h on h.quest_id = s.quest_id
     where s.tarih = v_bugun
     order by case s.zorluk when 'kolay' then 1 when 'orta' then 2 else 3 end;
end $$;

create or replace function public.claim_quest(p_quest_id text)
 returns boolean language plpgsql volatile security definer set search_path to 'public'
as $$
begin
  perform public.hiz_siniri('claim_quest', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return coalesce((public.gorev_al_ic(auth.uid(), 'gunluk', p_quest_id) ->> 'alindi')::boolean, false);
end $$;

-- ---------------------------------------------------------------- yetkiler
revoke all on function public.gorev_iclem_ozet(uuid) from public, anon, authenticated;
revoke all on function public.gorev_al_ic(uuid, text, text) from public, anon, authenticated;
revoke all on function public.gorevlerim() from public, anon;
revoke all on function public.gorev_al(text, text) from public, anon;
revoke all on function public.haftalik_sandik_al() from public, anon;
grant execute on function public.gorevlerim() to authenticated;
grant execute on function public.gorev_al(text, text) to authenticated;
grant execute on function public.haftalik_sandik_al() to authenticated;
