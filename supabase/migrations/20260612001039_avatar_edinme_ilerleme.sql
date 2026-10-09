-- ============================================================
-- 1039 · AVATAR EDİNME = İLERLEME (Ida onaylı tasarım, 9 Eki 2026)
--
-- Level = kalıcı ilerleme · Sezon Yolu ücretsiz kol = sezonluk ilerleme · Mağaza = seçim · Epik/Efsanevi = premium.
-- Her avatarın TEK edinme yolu var (tek kaynak `avatar_nitelikleri.edinme`):
--   ucretsiz → herkes · level → `edinme_level`'a ulaşınca sunucu verir · sezon → Sezon Yolu ücretsiz kol (`edinme_sezon_seviye`)
--   coin → Dükkân'da coin (`coin_avatar_<nadirlik>`) · elmas → Dükkân'da elmas (820; ücretli Sezon Yolu ödülü de olabilir)
-- Epik / Efsanevi hiçbir level ya da ücretsiz kol satırında YOK.
--
-- Değişen: edinme kontrolü (+level/sezon/coin), avatar_nitelikleri +2 kolon, oyuncu_avatarlari.kaynak +'level',
--   Nadir 17 avatarın edinmesi, bp_seviye_odulleri (ücretsiz 10/24 avatar · ücretli 19/22/23 Epik),
--   avatar_satis_fiyati (coin), avatar_satin_al (coin dalı), avatar_sahiplik_durumu (edinme kolonları; DROP+CREATE,
--   GRANT authenticated AYNEN — Ida onayı 9 Eki 2026), xp_ver (level avatarı), level_kazancim (avatarlar),
--   bp_odul_ver_ic + bp_odul_uygula (zaten sahipse 200 coin — 822'deki "iade yok"un yerine), koleksiyon_kalemleri
--   (avatar nadirliği avatar_nitelikleri'nden; önce hiç sayılmıyordu).
-- DEĞİŞMEZ: avatar_onayla (sahiplik kapısı avatar_sahip_mi → edinme <> 'ucretsiz' kendiliğinden kilitler; botlar
--   avatar_onayla çağırmaz, muafiyet aynı), level coin 20 / skill / rütbe 100, Epik 150 / Efsanevi 300.
-- Geri alma: docs/avatar-edinme-1039-geri-al.sql
-- ============================================================

-- ---------- 1. Şema ----------
alter table public.avatar_nitelikleri drop constraint if exists avatar_nitelikleri_edinme_check;
alter table public.avatar_nitelikleri add constraint avatar_nitelikleri_edinme_check
  check (edinme = any (array['ucretsiz', 'elmas', 'coin', 'level', 'sezon', 'battle_pass', 'turnuva', 'lig', 'seri']));
alter table public.avatar_nitelikleri add column if not exists edinme_level int;
alter table public.avatar_nitelikleri add column if not exists edinme_sezon_seviye int;
alter table public.avatar_nitelikleri drop constraint if exists avatar_nitelikleri_edinme_veri_check;
alter table public.avatar_nitelikleri add constraint avatar_nitelikleri_edinme_veri_check
  check ((edinme <> 'level' or edinme_level between 1 and 1000)
     and (edinme <> 'sezon' or edinme_sezon_seviye between 1 and 100)
     and (edinme not in ('level', 'sezon') or nadirlik not in ('epik', 'efsanevi')));

alter table public.oyuncu_avatarlari drop constraint if exists oyuncu_avatarlari_kaynak_check;
alter table public.oyuncu_avatarlari add constraint oyuncu_avatarlari_kaynak_check
  check (kaynak = any (array['dukkan', 'etkinlik', 'hediye', 'level']));

-- ---------- 2. Ayarlar (TEST DEĞERLERİ) ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('coin_avatar_nadir', '750', 'TEST — coin ile satılan Nadir avatar fiyatı (coin). 1039.'),
  ('bp_avatar_sahipse_coin', '200', 'Sezon Yolu avatar ödülüne zaten sahipse avatar yerine verilen coin. 1039.'),
  ('level_avatar_sahipse_coin', '200', 'Level avatarına zaten sahipse avatar yerine verilen coin. 1039.')
on conflict (anahtar) do nothing;

-- ---------- 3. Dağılım: Nadir 17 ----------
update public.avatar_nitelikleri n
   set edinme = 'level', edinme_level = v.lv, edinme_sezon_seviye = null
  from (values ('kedili-kiz-y37', 3), ('viking-k25', 10), ('dedektif-k22', 15),
               ('sovalye-k20', 25), ('buyucu-k21', 35), ('kral-k31', 50)) as v(anahtar, lv)
 where n.anahtar = v.anahtar;

update public.avatar_nitelikleri n
   set edinme = 'sezon', edinme_sezon_seviye = v.sv, edinme_level = null
  from (values ('kovboy-y40', 10), ('korkuluk-y41', 24)) as v(anahtar, sv)
 where n.anahtar = v.anahtar;

update public.avatar_nitelikleri n
   set edinme = 'coin', edinme_level = null, edinme_sezon_seviye = null
 where n.anahtar in ('palyaco-k30', 'hostes-y39', 'pelerinli-y22', 'gece-y23', 'kahraman-k29',
                     'hayalet-k26', 'zombi-k27', 'mumya-k28', 'kedili-genc-y36');

-- ---------- 4. Sezon Yolu yuvaları (Sezon 2+ aynı tabloyu tekrarlar) ----------
-- Ücretsiz kol 10 / 24 (5 elmas) → Nadir avatar; ücretli 19/22/23 (1037'deki Nadir) → Epik. ad/nadirlik/url trg_bp_odul_doldur'dan.
update public.bp_seviye_odulleri o
   set tur = 'avatar', placeholder = false, veri = jsonb_build_object('anahtar', v.anahtar)
  from (values (10, 'ucretsiz', 'kovboy-y40'), (24, 'ucretsiz', 'korkuluk-y41'),
               (19, 'ucretli', 'kurt-adam-y42'), (22, 'ucretli', 'balkabagi-adam-y43'), (23, 'ucretli', 'vampir-y19')) as v(seviye, kol, anahtar)
 where o.seviye = v.seviye and o.kol = v.kol;

-- ---------- 5. Fiyat: coin dalı ----------
create or replace function public.avatar_satis_fiyati(p_nadirlik text, p_edinme text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
           when p_edinme = 'ucretsiz' then 0
           when p_edinme in ('elmas', 'coin') and p_nadirlik in ('yaygin', 'nadir', 'epik', 'efsanevi')
             then nullif(public.ayar_sayi(p_edinme || '_avatar_' || p_nadirlik, 0), 0)::int
         end;
$$;
revoke execute on function public.avatar_satis_fiyati(text, text) from public, anon, authenticated;

-- ---------- 6. Satın alma: coin dalı (820 deseni; yeni fonksiyon / GRANT yok) ----------
create or replace function public.avatar_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_n public.avatar_nitelikleri%rowtype;
  v_fiyat int;
  v_bakiye bigint;
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
  if v_n.edinme not in ('elmas', 'coin') or v_fiyat is null or v_fiyat <= 0 or not public.kozmetik_satis_acik_mi() then
    raise exception 'Bu avatar satılmıyor';
  end if;

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca / coin_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_avatarlari o where o.user_id = v_me and o.avatar = v_n.anahtar) then
    raise exception 'Bu avatar zaten sende';
  end if;

  if v_n.edinme = 'coin' then
    v_bakiye := public.coin_harca(v_fiyat, 'avatar', v_n.anahtar);    -- yetersizse 'Yetersiz coin'
  else
    v_bakiye := public.elmas_harca(v_fiyat, 'avatar', v_n.anahtar);   -- yetersizse 'Yetersiz elmas'
  end if;
  insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (v_me, v_n.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_n.anahtar, 'url', v_n.url, 'fiyat', v_fiyat, 'para', v_n.edinme,
                            'bakiye', v_bakiye, 'sahip', true);
end;
$$;
revoke execute on function public.avatar_satin_al(text) from public, anon;
grant execute on function public.avatar_satin_al(text) to authenticated;

-- ---------- 7. İstemci durumu: edinme kolonları (dönüş tipi değişti → DROP + CREATE; GRANT aynen) ----------
drop function if exists public.avatar_sahiplik_durumu();
create function public.avatar_sahiplik_durumu()
returns table (url text, anahtar text, nadirlik text, fiyat integer, sahibim boolean, satilik boolean,
               edinme text, edinme_level integer, edinme_sezon_seviye integer, bp_ucretli_seviye integer)
language plpgsql
stable
security definer
set search_path = public
as $$
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
           (v_satis and n.edinme in ('elmas', 'coin') and public.avatar_satis_fiyati(n.nadirlik, n.edinme) is not null),
           n.edinme, n.edinme_level, n.edinme_sezon_seviye,
           (select min(b.seviye) from public.bp_seviye_odulleri b
             where b.kol = 'ucretli' and b.tur = 'avatar' and not b.placeholder and b.veri->>'anahtar' = n.anahtar)::int
      from public.avatar_nitelikleri n
      left join public.oyuncu_avatarlari o on o.user_id = v_me and o.avatar = n.anahtar
     where n.edinme <> 'ucretsiz'
       and public.avatar_acilmis_mi(n.url)
       and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
     order by n.sira, n.anahtar;
end;
$$;
revoke execute on function public.avatar_sahiplik_durumu() from public, anon;
grant execute on function public.avatar_sahiplik_durumu() to authenticated;

-- ---------- 8. Level avatarı: iç yardımcı (istemciye KAPALI) ----------
-- O level'in avatar(lar)ını verir; zaten sahipse `level_avatar_sahipse_coin` (referans tekil → idempotent).
-- Dönüş: [{level, anahtar, url, ad_tr, ad_en, nadirlik, sahipti, coin}]
create or replace function public.level_avatar_ver(p_user uuid, p_level int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_n int;
  v_coin bigint := public.ayar_sayi('level_avatar_sahipse_coin', 200);
  v_sonuc jsonb := '[]'::jsonb;
begin
  if p_user is null or p_level is null then return v_sonuc; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return v_sonuc; end if;
  for r in select n.* from public.avatar_nitelikleri n
            where n.edinme = 'level' and n.edinme_level = p_level
              and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
            order by n.sira, n.anahtar loop
    insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (p_user, r.anahtar, 'level')
    on conflict (user_id, avatar) do nothing;
    get diagnostics v_n = row_count;
    if v_n = 0 and v_coin > 0 then
      perform public.coin_ekle(p_user, v_coin, 'seviye', 'level_avatar:' || r.anahtar);
    end if;
    v_sonuc := v_sonuc || jsonb_build_object('level', p_level, 'anahtar', r.anahtar, 'url', r.url, 'ad_tr', r.ad_tr,
                                             'ad_en', r.ad_en, 'nadirlik', r.nadirlik, 'sahipti', v_n = 0,
                                             'coin', case when v_n = 0 then v_coin else 0 end);
  end loop;
  return v_sonuc;
end $$;
revoke execute on function public.level_avatar_ver(uuid, int) from public, anon, authenticated;

-- ---------- 9. xp_ver: level atlama döngüsüne level avatarı (20 coin / skill / rütbe 100 aynen) ----------
create or replace function public.xp_ver(p_user uuid, p_xp integer, p_kaynak text, p_detay jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_id bigint;
  v_level int; v_kalan bigint; v_xp bigint; v_once int; v_gerek int;
  v_coin_level bigint := public.ayar_sayi('level_odul_coin', 20);
  v_coin_rutbe bigint := public.ayar_sayi('rutbe_odul_coin', 100);
  v_aralik int := public.ayar_sayi('level_skill_aralik', 5)::int;
  v_skill_adet int := public.ayar_sayi('level_skill_adet', 1)::int;
  v_skiller jsonb := '[]'::jsonb;
  v_avatarlar jsonb := '[]'::jsonb;
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

    -- 1039: level avatarı (zaten sahipse coin; tavan dışı)
    perform set_config('app.odul_kalem', 'seviye', true);
    perform set_config('app.odul_detay', '', true);
    v_avatarlar := v_avatarlar || public.level_avatar_ver(p_user, v_level);

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
             || jsonb_build_object('level_coin', v_toplam_level_coin, 'rutbe_coin', v_toplam_rutbe_coin, 'skiller', v_skiller,
                                   'avatarlar', v_avatarlar);
  update public.xp_hareketleri set level_sonra = v_level, detay = v_detay where id = v_id;
  return v_detay || jsonb_build_object('level_once', v_once, 'level_sonra', v_level);
end $function$;

-- ---------- 10. level_kazancim: maç sonu gösterimi için avatarlar ----------
create or replace function public.level_kazancim(p_kaynak text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
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
    'avatarlar', coalesce(h.detay -> 'avatarlar', '[]'::jsonb),
    'level', coalesce(p.level, 1),
    'level_xp', coalesce(p.level_xp, 0),
    'level_gereken', public.level_gereken_xp(coalesce(p.level, 1))
  );
end $function$;

-- ---------- 11. Sezon Yolu: avatar ödülüne zaten sahipse coin (822'deki "iade yok" değişti) ----------
create or replace function public.bp_odul_uygula(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text, p_odul jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_tur text := p_odul->>'tur';
  v_veri jsonb := coalesce(p_odul->'veri', '{}'::jsonb);
  v_ref text := 'sezon:' || p_sezon || ':' || p_seviye || ':' || p_kol;
  v_n int;
begin
  if coalesce((p_odul->>'placeholder')::boolean, false) then return false; end if;
  case v_tur
    when 'coin'  then perform public.coin_ekle(p_user, (v_veri->>'miktar')::bigint, 'sezon_yolu', v_ref);
    when 'elmas' then perform public.elmas_ekle(p_user, (v_veri->>'miktar')::int, 'sezon_yolu', v_ref);
    when 'joker' then perform public.joker_hareket(p_user, v_veri->>'tur', (v_veri->>'adet')::int, 'hediye', v_ref);
    when 'tepki_paketi' then perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
    when 'unvan' then insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, v_veri->>'anahtar') on conflict do nothing;
    when 'avatar' then
      -- 822: sahiplik anahtarla tutulur (820). 1039: zaten sahipse avatar yerine bp_avatar_sahipse_coin (tavan dışı, referans tekil)
      insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
      select p_user, n.anahtar, 'etkinlik'
        from public.avatar_nitelikleri n
       where n.anahtar = v_veri->>'anahtar' or n.url = v_veri->>'url'
      on conflict do nothing;
      get diagnostics v_n = row_count;
      if v_n = 0 then
        perform public.coin_ekle(p_user, public.ayar_sayi('bp_avatar_sahipse_coin', 200), 'sezon_yolu', v_ref || ':sahip');
      end if;
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
end $function$;

create or replace function public.bp_odul_ver_ic(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_odul jsonb;
  v_n int;
  v_verildi boolean;
begin
  select to_jsonb(o) into v_odul from public.bp_seviye_odulleri o where o.seviye = p_seviye and o.kol = p_kol;
  if v_odul is null then return null; end if;
  v_verildi := not coalesce((v_odul->>'placeholder')::boolean, false);
  -- 822: ödül verilmeden ÖNCE bakılır; zaten sahipse çift satır yok. 1039: avatar ödülünde yerine coin (bp_odul_uygula)
  if v_verildi and public.bp_odul_sahip_mi(p_user, v_odul->>'tur', v_odul->'veri') then
    v_odul := v_odul || jsonb_build_object('zaten_sahip', true);
    if v_odul->>'tur' = 'avatar' then
      v_odul := v_odul || jsonb_build_object('sahip_coin', public.ayar_sayi('bp_avatar_sahipse_coin', 200));
    end if;
  end if;
  insert into public.oyuncu_bp_odul_alimi (sezon, user_id, seviye, kol, odul, verildi)
  values (p_sezon, p_user, p_seviye, p_kol, v_odul, v_verildi)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return null; end if;
  perform public.bp_odul_uygula(p_user, p_sezon, p_seviye, p_kol, v_odul);
  return v_odul;
end $function$;

-- ---------- 12. Koleksiyon Puanı: avatarlar nadirliğe göre (avatar_nitelikleri; yaygın → sıradan) ----------
-- Önce avatar_katalogu.nadirlik (hepsi boş) okunuyordu ve 31 hazır avatar katalogda olmadığı için hiç sayılmıyordu.
create or replace function public.koleksiyon_kalemleri(p_user uuid)
returns table (tur text, anahtar text, nadirlik text)
language sql
stable
security definer
set search_path = public
as $function$
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
  select 'avatar', n.anahtar, case n.nadirlik when 'yaygin' then 'siradan' else n.nadirlik end
    from public.oyuncu_avatarlari o join public.avatar_nitelikleri n on n.anahtar = o.avatar
   where o.user_id = p_user
     and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
  union all
  select e.tur, e.anahtar, e.nadirlik from public.koleksiyon_ek_kalemleri e where e.user_id = p_user;
$function$;

-- ---------- 13. Geçiş (yalnız İNSAN hesaplar; botlara dokunulmaz) ----------
-- a) Takılı avatarı artık sahiplik isteyen (Nadir dahil) hesaplara geriye uyumluluk sahipliği — takılı avatar düşmez.
insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
select p.id, n.anahtar, 'hediye'
  from public.profiles p
  join public.avatar_nitelikleri n on n.url = p.avatar_url
 where n.edinme <> 'ucretsiz'
   and not coalesce(p.is_bot, false)
on conflict (user_id, avatar) do nothing;

-- b) Eşiği geçmiş level'lara geriye dönük level avatarı (zaten sahipse dokunulmaz, coin yok)
insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
select p.id, n.anahtar, 'level'
  from public.profiles p
  join public.avatar_nitelikleri n on n.edinme = 'level' and coalesce(p.level, 1) >= n.edinme_level
 where not coalesce(p.is_bot, false)
on conflict (user_id, avatar) do nothing;

-- c) Koleksiyon Puanı: avatar sahibi herkes yeniden hesaplanır
do $$
declare r record;
begin
  for r in select distinct user_id from public.oyuncu_avatarlari loop
    perform public.koleksiyon_yenile(r.user_id);
  end loop;
end $$;

-- ---------- 14. Rapor + güvence ----------
do $$
declare v_dagilim text; v_eksik int; v_bot int; v_epik int; v_level int; v_hediye int;
begin
  select string_agg(nadirlik || '/' || edinme || ' ' || n, ' · ' order by nadirlik, edinme) into v_dagilim
    from (select n.nadirlik, n.edinme, count(*) n
            from public.avatar_nitelikleri n
           where not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
           group by 1, 2) t;
  select count(*) into v_eksik
    from public.profiles p join public.avatar_nitelikleri n on n.url = p.avatar_url
   where not coalesce(p.is_bot, false) and not public.avatar_sahip_mi(p.id, p.avatar_url);
  select count(*) into v_bot
    from public.oyuncu_avatarlari o join public.profiles p on p.id = o.user_id where coalesce(p.is_bot, false);
  select count(*) into v_epik
    from public.bp_seviye_odulleri b join public.avatar_nitelikleri n on n.anahtar = b.veri->>'anahtar'
   where b.kol = 'ucretsiz' and b.tur = 'avatar' and n.nadirlik in ('epik', 'efsanevi');
  v_epik := v_epik + (select count(*) from public.avatar_nitelikleri where edinme in ('level', 'sezon') and nadirlik in ('epik', 'efsanevi'));
  select count(*) into v_level from public.oyuncu_avatarlari where kaynak = 'level';
  select count(*) into v_hediye from public.oyuncu_avatarlari where kaynak = 'hediye';
  if v_eksik > 0 then raise exception '1039: takılı avatarı kilitli kalan % insan hesap var', v_eksik; end if;
  if v_epik > 0 then raise exception '1039: Epik/Efsanevi avatar level ya da ücretsiz kolda (% satır)', v_epik; end if;
  raise notice '1039 dağılım (nadirlik/edinme): %', v_dagilim;
  raise notice '1039 sahiplik: level % · hediye % · bot % (0 olmalı)', v_level, v_hediye, v_bot;
end $$;
