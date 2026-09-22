-- Paket 2 · Şerit B · B2 — Skill kataloğu ve skill kilidi altyapısı
--
-- Bugün bütün aktif skill'ler herkese açık (kilit_fiyati 0, gereken_level 1).
-- İleride yeni bir skill'in kilidi coin ile BİR KEZ açılır; bazıları level şartlıdır.
-- Level şartı parayla atlanamaz: kilit açma RPC'si önce level'i, sonra coin'i denetler.
--
-- Bu dosya:
--   1. oyuncu_level(uuid)       — level'i TEK yerden okuyan yardımcı (yoksa güvenli tanım: 1)
--   2. skill_katalogu           — skill başına aktif / kilit_fiyati / gereken_level / sira
--   3. oyuncu_skill_kilitleri   — oyuncunun coin ile açtığı kilitler
--   4. skill_aktif(text)        — artık kataloğu okur (kod içi liste kalktı)
--   5. skill_kilidi_acik(uuid,text), skill_kilidi_ac(text)
-- Kullanım kapısındaki (skill_kullanim_kapisi) kilit reddi 283'te, loadout ile birlikte yazılır.
-- Yıkıcı işlem yok: tablo/kolon silinmez, mevcut veri değişmez.

-- ---------------------------------------------------------------- 1. oyuncu_level
-- Level alanı Şerit A'nın (ilerleme/ödül) işidir. A bu adı daha önceki bir migration'da
-- tanımladıysa ONA DOKUNULMAZ. Tanımlı değilse güvenli bir yer tutucu yazılır: bugün
-- profiles'ta level kolonu yok → herkes Level 1. A'nın kolonu gelince yalnız bu
-- fonksiyonun gövdesi değişir; kilit mantığı başka yerden level okumaz.
do $do$
begin
  if to_regprocedure('public.oyuncu_level(uuid)') is null then
    execute $f$
      create function public.oyuncu_level(p_user uuid)
      returns integer language sql stable security definer set search_path to 'public'
      as $b$ select 1 $b$
    $f$;
    execute 'comment on function public.oyuncu_level(uuid) is '
      || quote_literal('Oyuncunun level''i — TEK okuma noktası. Yer tutucu (Şerit B, 281): profiles''ta level kolonu yokken herkes 1. Şerit A kendi kolonuna bağlar.');
    execute 'revoke all on function public.oyuncu_level(uuid) from public, anon';
    execute 'grant execute on function public.oyuncu_level(uuid) to authenticated';
  end if;
end
$do$;

-- ---------------------------------------------------------------- 2. katalog
create table if not exists public.skill_katalogu (
  tur text primary key,
  aktif boolean not null default false,
  kilit_fiyati bigint not null default 0 check (kilit_fiyati >= 0),
  gereken_level integer not null default 1 check (gereken_level >= 1),
  sira integer not null default 100,
  aciklama text,
  guncellendi timestamptz not null default now()
);
comment on table public.skill_katalogu is
  'Skill kataloğu (Paket 2 B2). aktif: maçta kullanılabilir mi. kilit_fiyati: kilidi bir kez açmanın coin bedeli (0 = ücretsiz). gereken_level: kilidi açmak için en düşük level (parayla atlanamaz). Oyuncuya görünen ad/ikon oyun/lib/jokerler.js''te.';
comment on column public.skill_katalogu.kilit_fiyati is 'Kilidi bir kez açmanın bedeli (coin). 0 = kilitsiz (yalnız level şartı varsa o).';
comment on column public.skill_katalogu.gereken_level is 'Kilidi açmak için gereken en düşük level (oyuncu_level). Coin ile atlanamaz.';

alter table public.skill_katalogu enable row level security;
drop policy if exists "skill katalogu okuma" on public.skill_katalogu;
create policy "skill katalogu okuma" on public.skill_katalogu for select using (true);
grant select on public.skill_katalogu to anon, authenticated;

-- Aktif yedi maç skill'i: fiyat 0, level 1 (bugün herkese açık). Pasif üçlü geçmiş
-- veri için kayıtlı ama aktif değil (PROJECT_CONTEXT › Skill sistemi).
insert into public.skill_katalogu (tur, aktif, kilit_fiyati, gereken_level, sira, aciklama) values
  ('elli',             true,  0, 1, 1, '50:50'),
  ('sure',             true,  0, 1, 2, 'Ek Süre'),
  ('soru_degistir',    true,  0, 1, 3, 'Soru Değiştir'),
  ('zaman_baskisi',    true,  0, 1, 4, 'Zaman Baskısı'),
  ('sigorta',          true,  0, 1, 5, 'Sigorta (yalnız Klasik)'),
  ('cifte_puan',       true,  0, 1, 6, '2X (yalnız Klasik)'),
  ('ikinci_sans',      true,  0, 1, 7, 'İkinci Şans'),
  ('sis',              false, 0, 1, 90, 'Pasif — geçmiş veri'),
  ('savunma_kilidi',   false, 0, 1, 91, 'Pasif — geçmiş veri'),
  ('saldiri_degistir', false, 0, 1, 92, 'Pasif — geçmiş veri')
on conflict (tur) do nothing;

-- ---------------------------------------------------------------- 3. açılan kilitler
create table if not exists public.oyuncu_skill_kilitleri (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tur text not null references public.skill_katalogu(tur),
  odenen bigint not null default 0,
  acildi timestamptz not null default now(),
  primary key (user_id, tur)
);
comment on table public.oyuncu_skill_kilitleri is
  'Oyuncunun coin ile açtığı skill kilitleri (Paket 2 B2). Yalnız skill_kilidi_ac() yazar.';
alter table public.oyuncu_skill_kilitleri enable row level security;
drop policy if exists "kendi skill kilitlerini oku" on public.oyuncu_skill_kilitleri;
create policy "kendi skill kilitlerini oku" on public.oyuncu_skill_kilitleri for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------- 4. skill_aktif
-- Kod içi liste yerine katalog. (Bağımlı index/kısıt yok — pg_depend ile ölçüldü.)
create or replace function public.skill_aktif(p_tur text)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select k.aktif from public.skill_katalogu k where k.tur = p_tur), false) $$;
revoke all on function public.skill_aktif(text) from public, anon;
grant execute on function public.skill_aktif(text) to authenticated;

-- ---------------------------------------------------------------- 5. kilit
-- Açık = coin ile açılmış ya da (bedeli 0 ve level yeterli). Aktif olmayan skill açık sayılmaz.
create or replace function public.skill_kilidi_acik(p_user uuid, p_tur text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((
    select exists (select 1 from public.oyuncu_skill_kilitleri o where o.user_id = p_user and o.tur = k.tur)
        or (k.kilit_fiyati <= 0 and public.oyuncu_level(p_user) >= k.gereken_level)
      from public.skill_katalogu k
     where k.tur = p_tur and k.aktif), false);
$$;
-- Yalnız sunucu içi (security definer fonksiyonlar) çağırır; istemci skill_dukkani()'ni okur.
revoke all on function public.skill_kilidi_acik(uuid, text) from public, anon, authenticated;

create or replace function public.skill_kilidi_ac(p_tur text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  k public.skill_katalogu%rowtype;
  v_level int;
  v_bakiye bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('skill_kilidi_ac', 20, interval '60 seconds');

  select * into k from public.skill_katalogu where tur = p_tur and aktif;
  if not found then raise exception 'Skill bulunamadı'; end if;

  -- Profil kilidi: iki sekmeden aynı kilit iki kez ödenemez.
  perform 1 from public.profiles where id = v_me for update;

  if public.skill_kilidi_acik(v_me, p_tur) then
    return jsonb_build_object('tur', p_tur, 'acik', true, 'odenen', 0,
      'coin', (select coin from public.profiles where id = v_me));
  end if;

  -- Level şartı ÖNCE: parayla atlanamaz, yetersizse coin'e hiç bakılmaz.
  v_level := public.oyuncu_level(v_me);
  if v_level < k.gereken_level then
    raise exception 'Bu skill için Level % gerekir', k.gereken_level;
  end if;

  if k.kilit_fiyati > 0 then
    v_bakiye := public.coin_harca(k.kilit_fiyati, 'skill_kilidi', p_tur);   -- 'Yetersiz coin'
  end if;

  insert into public.oyuncu_skill_kilitleri (user_id, tur, odenen)
  values (v_me, p_tur, k.kilit_fiyati)
  on conflict (user_id, tur) do nothing;

  return jsonb_build_object('tur', p_tur, 'acik', true, 'odenen', k.kilit_fiyati,
    'coin', (select coin from public.profiles where id = v_me));
end;
$$;
revoke all on function public.skill_kilidi_ac(text) from public, anon;
grant execute on function public.skill_kilidi_ac(text) to authenticated;
