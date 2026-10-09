-- ============================================================
-- 1039 GERİ ALMA — avatar edinme = ilerleme (9 Eki 2026)
-- Nadir avatarlar yeniden ÜCRETSİZ; Sezon Yolu yuvaları 1037 hâline; fonksiyonlar 1039 öncesi canlı gövdelerine.
-- Sahiplik satırları (kaynak 'level' / 'hediye' / coin alımları) SİLİNMEZ — zararsızdır (ücretsiz avatarda sahiplik
-- anlamsız). Coin ile alınmış avatarların coini iade edilmez (gerekirse coin_hareketleri tur='avatar', miktar<0'dan).
-- Tek transaction: psql -1 -f docs/avatar-edinme-1039-geri-al.sql
-- ============================================================

update public.avatar_nitelikleri set edinme = 'ucretsiz', edinme_level = null, edinme_sezon_seviye = null
 where edinme in ('level', 'sezon', 'coin');

update public.bp_seviye_odulleri set tur = 'elmas', veri = '{"miktar": 5}'::jsonb, ad_tr = '5 elmas', ad_en = '5 gems', nadirlik = null
 where kol = 'ucretsiz' and seviye in (10, 24);
update public.bp_seviye_odulleri o
   set tur = 'avatar', placeholder = false, veri = jsonb_build_object('anahtar', v.anahtar)
  from (values (19, 'sovalye-k20'), (22, 'buyucu-k21'), (23, 'kral-k31')) as v(seviye, anahtar)
 where o.seviye = v.seviye and o.kol = 'ucretli';

drop function if exists public.level_avatar_ver(uuid, int);

drop function if exists public.avatar_sahiplik_durumu();
CREATE OR REPLACE FUNCTION public.avatar_sahiplik_durumu()
 RETURNS TABLE(url text, anahtar text, nadirlik text, fiyat integer, sahibim boolean, satilik boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_satis boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_satis := public.kozmetik_satis_acik_mi();
  return query
    select n.url, n.anahtar, n.nadirlik,
           public.avatar_satis_fiyati(n.nadirlik, n.edinme),
           (o.user_id is not null),
           (v_satis and n.edinme = 'elmas' and public.avatar_satis_fiyati(n.nadirlik, n.edinme) is not null)
      from public.avatar_nitelikleri n
      left join public.oyuncu_avatarlari o on o.user_id = v_me and o.avatar = n.anahtar
     where n.edinme <> 'ucretsiz'
       and public.avatar_acilmis_mi(n.url)
       and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
     order by n.sira, n.anahtar;
end;
$function$
;
revoke execute on function public.avatar_sahiplik_durumu() from public, anon;
grant execute on function public.avatar_sahiplik_durumu() to authenticated;

CREATE OR REPLACE FUNCTION public.avatar_satin_al(p_anahtar text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_n public.avatar_nitelikleri%rowtype;
  v_fiyat int;
  v_bakiye int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('avatar_satin_al', 20, interval '60 seconds');
  select * into v_n from public.avatar_nitelikleri n where n.anahtar = p_anahtar or n.url = p_anahtar;
  if not found
     or not public.avatar_acilmis_mi(v_n.url)
     or exists (select 1 from public.avatar_katalogu k where k.url = v_n.url and not k.aktif) then
    raise exception 'Böyle bir avatar yok';
  end if;
  if v_n.edinme = 'ucretsiz' then raise exception 'Bu avatar bedava — satın alınmaz'; end if;
  v_fiyat := public.avatar_satis_fiyati(v_n.nadirlik, v_n.edinme);
  if v_fiyat is null or v_fiyat <= 0 or not public.kozmetik_satis_acik_mi() then
    raise exception 'Bu avatar satılmıyor';
  end if;

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_avatarlari o where o.user_id = v_me and o.avatar = v_n.anahtar) then
    raise exception 'Bu avatar zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, 'avatar', v_n.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (v_me, v_n.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_n.anahtar, 'url', v_n.url, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.avatar_satis_fiyati(p_nadirlik text, p_edinme text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
           when p_edinme = 'ucretsiz' then 0
           when p_edinme = 'elmas' and p_nadirlik in ('yaygin', 'nadir', 'epik', 'efsanevi')
             then nullif(public.ayar_sayi('elmas_avatar_' || p_nadirlik, 0), 0)::int
         end;
$function$
;

CREATE OR REPLACE FUNCTION public.bp_odul_uygula(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text, p_odul jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tur text := p_odul->>'tur';
  v_veri jsonb := coalesce(p_odul->'veri', '{}'::jsonb);
  v_ref text := 'sezon:' || p_sezon || ':' || p_seviye || ':' || p_kol;
begin
  if coalesce((p_odul->>'placeholder')::boolean, false) then return false; end if;
  case v_tur
    when 'coin'  then perform public.coin_ekle(p_user, (v_veri->>'miktar')::bigint, 'sezon_yolu', v_ref);
    when 'elmas' then perform public.elmas_ekle(p_user, (v_veri->>'miktar')::int, 'sezon_yolu', v_ref);
    when 'joker' then perform public.joker_hareket(p_user, v_veri->>'tur', (v_veri->>'adet')::int, 'hediye', v_ref);
    when 'tepki_paketi' then perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
    when 'unvan' then insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, v_veri->>'anahtar') on conflict do nothing;
    when 'avatar' then
      -- 822: sahiplik anahtarla tutulur (820); zaten sahipse satır eklenmez
      insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
      select p_user, n.anahtar, 'etkinlik'
        from public.avatar_nitelikleri n
       where n.anahtar = v_veri->>'anahtar' or n.url = v_veri->>'url'
      on conflict do nothing;
    when 'arka_plan' then perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');   -- 822; idempotent
    when 'cerceve' then
      -- 780: premium çerçeve (kozmetik) → sahiplik kozmetik_ver ile; lig/level/rozet çerçevesi → eski yol
      if exists (select 1 from public.kozmetikler k where k.anahtar = v_veri->>'anahtar' and k.tur = 'premium_cerceve') then
        perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      else
        perform public.cerceve_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      end if;
    else raise exception 'Bilinmeyen ödül türü: %', v_tur;
  end case;
  return true;
end $function$
;

CREATE OR REPLACE FUNCTION public.bp_odul_ver_ic(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_odul jsonb;
  v_n int;
  v_verildi boolean;
begin
  select to_jsonb(o) into v_odul from public.bp_seviye_odulleri o where o.seviye = p_seviye and o.kol = p_kol;
  if v_odul is null then return null; end if;
  v_verildi := not coalesce((v_odul->>'placeholder')::boolean, false);
  -- 822: ödül verilmeden ÖNCE bakılır; zaten sahipse ödül alınmış sayılır, çift satır yok, iade yok
  if v_verildi and public.bp_odul_sahip_mi(p_user, v_odul->>'tur', v_odul->'veri') then
    v_odul := v_odul || jsonb_build_object('zaten_sahip', true);
  end if;
  insert into public.oyuncu_bp_odul_alimi (sezon, user_id, seviye, kol, odul, verildi)
  values (p_sezon, p_user, p_seviye, p_kol, v_odul, v_verildi)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return null; end if;
  perform public.bp_odul_uygula(p_user, p_sezon, p_seviye, p_kol, v_odul);
  return v_odul;
end $function$
;

CREATE OR REPLACE FUNCTION public.koleksiyon_kalemleri(p_user uuid)
 RETURNS TABLE(tur text, anahtar text, nadirlik text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select 'rozet'::text, r.rozet,
         case t.kademe when 'bronz' then 'siradan' when 'gumus' then 'nadir' when 'altin' then 'epik' when 'elmas' then 'efsanevi' end
    from public.oyuncu_rozetleri r join public.rozet_tanimlari t on t.anahtar = r.rozet and t.aktif
   where r.user_id = p_user
  union all
  select 'cerceve', c.anahtar, c.nadirlik
    from public.oyuncu_cerceveleri o join public.cerceveler c on c.anahtar = o.cerceve
   where o.user_id = p_user and c.aktif and c.kaynak <> 'dukkan'
  union all
  select 'aura', a.anahtar, a.nadirlik
    from public.oyuncu_auralari o join public.auralar a on a.anahtar = o.aura
   where o.user_id = p_user and a.aktif
  union all
  select 'unvan', t.anahtar, t.nadirlik
    from public.oyuncu_unvan_listesi(p_user) k join public.unvan_tanimlari t on t.anahtar = k.anahtar
  union all
  select 'kozmetik', k.anahtar, k.nadirlik
    from public.oyuncu_kozmetikleri o join public.kozmetikler k on k.anahtar = o.kozmetik
   where o.user_id = p_user and k.aktif and k.onay = 'girsin'
  union all
  select 'avatar', a.anahtar, a.nadirlik
    from public.oyuncu_avatarlari o join public.avatar_katalogu a on a.url = o.avatar or a.anahtar = o.avatar
   where o.user_id = p_user and a.aktif
  union all
  select e.tur, e.anahtar, e.nadirlik from public.koleksiyon_ek_kalemleri e where e.user_id = p_user;
$function$
;

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
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva|kasa):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
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
end $function$
;

CREATE OR REPLACE FUNCTION public.xp_ver(p_user uuid, p_xp integer, p_kaynak text, p_detay jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
  v_level int; v_kalan bigint; v_xp bigint; v_once int; v_gerek int;
  v_coin_level bigint := public.ayar_sayi('level_odul_coin', 20);
  v_coin_rutbe bigint := public.ayar_sayi('rutbe_odul_coin', 100);
  v_aralik int := public.ayar_sayi('level_skill_aralik', 5)::int;
  v_skill_adet int := public.ayar_sayi('level_skill_adet', 1)::int;
  v_skiller jsonb := '[]'::jsonb;
  v_toplam_level_coin int := 0; v_toplam_rutbe_coin int := 0;
  v_tur text; v_turler text[];
  v_eski_kalem text := coalesce(current_setting('app.odul_kalem', true), '');
  v_eski_detay text := coalesce(current_setting('app.odul_detay', true), '');
  v_detay jsonb;
begin
  if p_user is null or p_kaynak is null then return null; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return null; end if;

  -- Önce kilit: aynı oyuncunun eşzamanlı iki XP yazımı sırayla işlensin
  select level, level_xp, xp into v_level, v_kalan, v_xp from public.profiles where id = p_user for update;
  if not found then return null; end if;

  insert into public.xp_hareketleri (user_id, kaynak, xp, level_once, level_sonra, detay)
  values (p_user, p_kaynak, greatest(coalesce(p_xp, 0), 0), v_level, v_level, coalesce(p_detay, '{}'::jsonb))
  on conflict (user_id, kaynak) do nothing
  returning id into v_id;
  if v_id is null then return null; end if;   -- bu kaynak için zaten yazılmış

  v_once := v_level;
  v_kalan := v_kalan + greatest(coalesce(p_xp, 0), 0);
  v_xp := v_xp + greatest(coalesce(p_xp, 0), 0);

  loop
    v_gerek := public.level_gereken_xp(v_level);
    exit when v_kalan < v_gerek;
    v_kalan := v_kalan - v_gerek;
    v_level := v_level + 1;

    -- Level ödülü: coin (günlük tavan dışı, referans benzersiz)
    if v_coin_level > 0 then
      perform set_config('app.odul_kalem', 'seviye', true);
      perform set_config('app.odul_detay', '', true);
      perform public.coin_ekle(p_user, v_coin_level, 'seviye', 'seviye:' || v_level);
      v_toplam_level_coin := v_toplam_level_coin + v_coin_level;
    end if;

    -- Her N levelde bedava skill hakkı (aktif skill'lerden rastgele; envantere, maç sınırı değişmez)
    if v_aralik > 0 and v_skill_adet > 0 and v_level % v_aralik = 0 then
      if v_turler is null then
        select coalesce(array_agg(t), '{}') into v_turler
          from (select (regexp_matches(pg_get_constraintdef(c.oid), '''([a-z_]+)''', 'g'))[1] t
                  from pg_constraint c
                 where c.conrelid = 'public.joker_envanter'::regclass and c.conname = 'joker_envanter_tur_check') x
         where public.skill_aktif(t);
        if coalesce(array_length(v_turler, 1), 0) = 0 then
          v_turler := array(select t from unnest(array['elli','sure','soru_degistir','zaman_baskisi','sigorta','cifte_puan','ikinci_sans']) t
                             where public.skill_aktif(t));
        end if;
      end if;
      if coalesce(array_length(v_turler, 1), 0) > 0 then
        v_tur := v_turler[1 + floor(random() * array_length(v_turler, 1))::int];
        perform public.joker_hareket(p_user, v_tur, v_skill_adet, 'hediye', 'seviye:' || v_level);
        v_skiller := v_skiller || jsonb_build_object('level', v_level, 'skill', v_tur, 'adet', v_skill_adet);
      end if;
    end if;

    -- Rütbe atlama: coin
    if public.level_rutbe_sira(v_level) > public.level_rutbe_sira(v_level - 1) and v_coin_rutbe > 0 then
      perform set_config('app.odul_kalem', 'rutbe', true);
      perform set_config('app.odul_detay', '', true);
      perform public.coin_ekle(p_user, v_coin_rutbe, 'seviye', 'rutbe:' || v_level);
      v_toplam_rutbe_coin := v_toplam_rutbe_coin + v_coin_rutbe;
    end if;
  end loop;

  perform set_config('app.odul_kalem', v_eski_kalem, true);
  perform set_config('app.odul_detay', v_eski_detay, true);

  update public.profiles set level = v_level, level_xp = v_kalan, xp = v_xp where id = p_user;

  v_detay := coalesce(p_detay, '{}'::jsonb)
             || jsonb_build_object('level_coin', v_toplam_level_coin, 'rutbe_coin', v_toplam_rutbe_coin, 'skiller', v_skiller);
  update public.xp_hareketleri set level_sonra = v_level, detay = v_detay where id = v_id;
  return v_detay || jsonb_build_object('level_once', v_once, 'level_sonra', v_level);
end $function$
;

revoke execute on function public.avatar_satis_fiyati(text, text) from public, anon, authenticated;
revoke execute on function public.avatar_satin_al(text) from public, anon;
grant execute on function public.avatar_satin_al(text) to authenticated;

-- Koleksiyon Puanı eski kurala göre yeniden
do $$ declare r record; begin for r in select distinct user_id from public.oyuncu_avatarlari loop perform public.koleksiyon_yenile(r.user_id); end loop; end $$;
