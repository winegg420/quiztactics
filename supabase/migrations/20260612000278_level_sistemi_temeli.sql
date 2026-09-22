-- Paket 2 · Şerit A — LEVEL SİSTEMİ TEMELİ
--
-- Level ligden ayrıdır: kalıcı, düşmez, sınırsız, rekabet gücü vermez. Herkes Level 1'den
-- başlar (mevcut oyuncular dahil). Mevcut coin / lig puanı / istatistiklere DOKUNULMAZ —
-- yalnız yeni alanlar eklenir (yıkıcı değişiklik yok).
--
--   profiles.level      şu anki level (≥ 1)
--   profiles.level_xp   bu level içindeki XP (bir sonraki level için gereken XP'den az)
--   profiles.xp         toplam kazanılmış XP
--
-- Rütbe level'e bağlıdır: Çaylak L1 · Bilge L10 · Üstat L25 · Kahin L50 · Dâhi L100
-- (istemcide aynı eşikler: oyun/lib/ranks.js). Eski puan-rütbesi `public.rutbe(int)`
-- SİLİNMEDİ, kullanım dışı.
--
-- XP YALNIZ sunucuda, maçı bitiren fonksiyonların içinden `xp_ver` ile yazılır (279).
-- Aynı kaynak (maç/düello/turnuva) için bir oyuncuya bir kez: `xp_hareketleri` benzersiz
-- anahtarı (user_id, kaynak). Level atlama ödülleri (coin, skill hakkı, rütbe coini) aynı
-- işlemde verilir; coin referansı 'seviye:<L>' / 'rutbe:<L>' benzersizdir.

-- ---------------------------------------------------------------- şema
alter table public.profiles add column if not exists level    integer not null default 1;
alter table public.profiles add column if not exists level_xp integer not null default 0;
alter table public.profiles add column if not exists xp       bigint  not null default 0;

do $$ begin
  alter table public.profiles add constraint profiles_level_check check (level >= 1 and level_xp >= 0 and xp >= 0);
exception when duplicate_object then null; end $$;

-- Başkasının level'i (rütbe rozeti) görünür; xp / level_xp yalnız sahibine (profilim).
grant select (level) on public.profiles to authenticated;

create table if not exists public.xp_hareketleri (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kaynak      text not null,              -- 'mac:<id>' · 'duello:<id>' · 'turnuva:<id>'
  xp          integer not null default 0,
  level_once  integer not null,
  level_sonra integer not null,
  detay       jsonb not null default '{}'::jsonb,
  olusturuldu timestamptz not null default now(),
  unique (user_id, kaynak)
);
alter table public.xp_hareketleri enable row level security;
revoke all on public.xp_hareketleri from public, anon, authenticated;
revoke all on sequence public.xp_hareketleri_id_seq from public, anon, authenticated;

-- Level/rütbe coini tek sefer: aynı oyuncuya aynı level için ikinci kez yazılamaz.
create unique index if not exists coin_hareketleri_seviye_tek
  on public.coin_hareketleri (user_id, tur, referans)
  where tur = 'seviye' and referans is not null;

-- ---------------------------------------------------------------- eğri ve rütbe
-- Bir sonraki level için gereken XP = round(taban + katsayı × level^üs)
create or replace function public.level_gereken_xp(p_level integer)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(1, round(public.ayar_ondalik('level_xp_taban', 60)
                           + public.ayar_ondalik('level_xp_katsayi', 0.5)
                             * power(greatest(coalesce(p_level, 1), 1)::numeric, public.ayar_ondalik('level_xp_us', 1.5))))::int;
$$;

-- Level L'ye ulaşmak için gereken toplam XP (Level 1 = 0)
create or replace function public.level_toplam_xp(p_level integer)
returns bigint language sql stable security definer set search_path = public as $$
  select coalesce(sum(public.level_gereken_xp(l)), 0)::bigint from generate_series(1, greatest(coalesce(p_level, 1), 1) - 1) l;
$$;

-- Rütbe eşikleri (istemci: oyun/lib/ranks.js › RUTBELER ile aynı)
create or replace function public.level_rutbe_sira(p_level integer)
returns integer language sql immutable as $$
  select case when p_level >= 100 then 4 when p_level >= 50 then 3 when p_level >= 25 then 2
              when p_level >= 10 then 1 else 0 end;
$$;

create or replace function public.level_rutbe(p_level integer)
returns text language sql immutable as $$
  select (array['Çaylak', 'Bilge', 'Üstat', 'Kahin', 'Dâhi'])[public.level_rutbe_sira(p_level) + 1];
$$;

-- ---------------------------------------------------------------- bot level'i
-- bot_seviye_puan (1-100) × oran; oran bot id'sinden tohumlu [min, max] (deterministik).
-- Açık botlarda seviye puanı yoksa isabet × 100 kullanılır. Sabit: XP almaz, düşmez.
create or replace function public.bot_level_hesapla(p_id uuid, p_puan integer)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(1, round(greatest(coalesce(p_puan, 50), 1) *
    (public.ayar_ondalik('bot_level_oran_min', 0.6)
     + (public.ayar_ondalik('bot_level_oran_max', 1.1) - public.ayar_ondalik('bot_level_oran_min', 0.6))
       * ((abs(hashtext(p_id::text)::bigint) % 1000)::numeric / 999))))::int;
$$;

create or replace function public.trg_bot_level()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_level int;
begin
  if not coalesce(new.is_bot, false) then return new; end if;
  v_level := public.bot_level_hesapla(new.id,
    coalesce(new.bot_seviye_puan::int, round(coalesce(new.bot_isabet::numeric, 0.5) * 100)::int));
  if tg_op = 'UPDATE' then v_level := greatest(v_level, coalesce(old.level, 1)); end if;   -- düşmez
  if tg_op = 'INSERT' or v_level <> coalesce(old.level, 1) then
    new.level := v_level;
    new.xp := public.level_toplam_xp(v_level) + (abs(hashtext(new.id::text || ':xp')::bigint) % public.level_gereken_xp(v_level));
    new.level_xp := new.xp - public.level_toplam_xp(v_level);
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_bot_level on public.profiles;
create trigger trg_profiles_bot_level
  before insert or update of is_bot, bot_seviye_puan, bot_isabet on public.profiles
  for each row execute function public.trg_bot_level();

-- Mevcut botlar: bir kez türet (tetikleyici update'te çalışır; coin'e dokunulmaz)
update public.profiles set bot_seviye_puan = bot_seviye_puan where coalesce(is_bot, false);

-- ---------------------------------------------------------------- coin: level ödülü tavan dışı
-- Tek fark: 'seviye' (level/rütbe atlama ödülü) günlük coin tavanına takılmaz — 'davet' gibi
-- tek seferlik kilometre taşı. Gövdenin geri kalanı canlıdaki tanımın aynısı.
create or replace function public.coin_ekle(p_user uuid, p_miktar bigint, p_tur text, p_referans text default null::text)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_bakiye bigint;
  v_bot boolean;
  v_miktar bigint := p_miktar;
  v_kalan bigint;
begin
  if p_user is null or coalesce(p_miktar, 0) <= 0 then return null; end if;

  select coalesce(is_bot, false) into v_bot from public.profiles where id = p_user;
  if coalesce(v_bot, false) then return null; end if;

  -- 'davet' tek seferlik hoş geldin ödülü: günlük tavana takılmaz (Paket 14, 3.4)
  -- 'seviye' level/rütbe atlama ödülü: tek seferlik kilometre taşı, tavana takılmaz (P2A)
  if p_tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'davet', 'seviye') then
    v_kalan := public.coin_gunluk_kalan(p_user);
    v_miktar := least(v_miktar, v_kalan);
    if v_miktar <= 0 then
      -- Paket 20 I.3: günlük coin tavanı doldu → dökümde görünsün
      perform public.odul_kalem_yaz(p_user, public.odul_kalem_adi(p_tur, p_referans), 0, 0,
        jsonb_build_object('tavan', true, 'istenen', p_miktar));
      return (select coin from public.profiles where id = p_user);
    end if;
  end if;

  perform set_config('app.coin_izin', '1', true);
  update public.profiles
     set coin = coin + v_miktar
   where id = p_user
  returning coin into v_bakiye;
  if v_bakiye is null then return null; end if;

  begin
    insert into public.coin_hareketleri (user_id, miktar, tur, referans, bakiye_sonra)
    values (p_user, v_miktar, p_tur, p_referans, v_bakiye);
  exception when unique_violation then
    update public.profiles set coin = coin - v_miktar where id = p_user
    returning coin into v_bakiye;
    return v_bakiye;
  end;

  -- Paket 20 I.3: maç sonu dökümü için kalem (bağlam yoksa yazılmaz)
  perform public.odul_kalem_yaz(p_user, public.odul_kalem_adi(p_tur, p_referans), 0, v_miktar::int,
    case when v_miktar < p_miktar then jsonb_build_object('tavan', true, 'istenen', p_miktar) else '{}'::jsonb end
    || case when p_tur = 'turnuva' and p_referans like 'derece:%'
            then jsonb_build_object('sira', split_part(p_referans, ':', 3)::int) else '{}'::jsonb end);
  return v_bakiye;
end;
$function$;


-- Günlük tavan hesabı da level/rütbe ödülünü saymaz (yoksa level atlayan oyuncunun o günkü maç
-- coin'i erken tavana takılırdı). Gövde canlıdakinin aynısı + 'seviye'.
create or replace function public.coin_gunluk_kalan(p_user uuid)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0, public.ayar_sayi('coin_gunluk_tavan', 400) - coalesce((
    select sum(h.miktar) from public.coin_hareketleri h
    where h.user_id = p_user and h.miktar > 0
      and h.tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'ekonomi_esitleme', 'seviye')
      and (h.olusturuldu at time zone 'Europe/Istanbul')::date
          = (now() at time zone 'Europe/Istanbul')::date
  ), 0));
$function$;

-- ---------------------------------------------------------------- XP yazımı (iç fonksiyon)
-- Bir oyuncuya bir kaynaktan XP yazar; level atlarsa her atlanan level için ödül verir.
-- Aynı (oyuncu, kaynak) ikinci kez gelirse HİÇBİR ŞEY yapmaz. Botlara yazmaz.
-- Dönüş: yazılan xp_hareketleri satırının detayı (ya da null).
create or replace function public.xp_ver(p_user uuid, p_xp integer, p_kaynak text, p_detay jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
end $$;

revoke all on function public.xp_ver(uuid, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.trg_bot_level() from public, anon, authenticated;
revoke all on function public.bot_level_hesapla(uuid, integer) from public, anon, authenticated;
revoke all on function public.level_toplam_xp(integer) from public, anon, authenticated;
-- level_gereken_xp / level_rutbe* salt hesap; istemci profilim ve level_kazancim üzerinden okur.
revoke all on function public.level_gereken_xp(integer) from public, anon, authenticated;
