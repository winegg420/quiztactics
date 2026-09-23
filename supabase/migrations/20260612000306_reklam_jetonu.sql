-- Şerit S4 — Satın alma güvenliği, 3/3: reklam ödülü için sunucu jetonu
-- (docs/SATIN_ALMA_DENETIMI.md §3.3-D)
--
-- Sorun: reklam_odulu_al herhangi bir metinle çağrılabiliyordu; konsoldan
-- reklam izlemeden günde 5 × 25 coin alınabiliyordu.
--
-- Çözüm (ara önlem — kalıcı çözüm reklam ağının SSV'si):
--   1) Reklam başlarken istemci reklam_jetonu_al() ile sunucudan tek kullanımlık
--      jeton alır. Yeni jeton, hesabın kullanılmamış eski jetonlarını geçersiz
--      kılar (aynı anda tek açık jeton → paralel çiftlik yok).
--   2) reklam_odulu_al(p_reklam_ref) artık yalnız bu jetonu kabul eder:
--      jeton bu hesaba ait, kullanılmamış, en az `reklam_min_sure_sn` saniye önce
--      verilmiş ve `reklam_jeton_omur_dk` dakikadan eski değil olmalı.
--   3) Günlük tavan (reklam_gunluk_tavan) hem jeton verilirken hem ödülde bakılır.
--   4) Jeton kullanımı FOR UPDATE kilidiyle tek sefer; coin_hareketleri'nde de
--      (user_id, referans) tekil indeks.
-- İmza (p_reklam_ref text) ve dönüş tipi korunur.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('reklam_min_sure_sn', '10'::jsonb,
   'Şerit S4: reklam jetonu verildikten sonra ödül için geçmesi gereken en az süre (sn).'),
  ('reklam_jeton_omur_dk', '15'::jsonb,
   'Şerit S4: reklam jetonunun geçerlilik süresi (dk).')
on conflict (anahtar) do nothing;

create table if not exists public.reklam_jetonlari (
  jeton        uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  olusturuldu  timestamptz not null default now(),
  kullanildi   timestamptz,
  iptal        boolean not null default false
);
create index if not exists reklam_jetonlari_acik
  on public.reklam_jetonlari (user_id) where kullanildi is null and not iptal;

alter table public.reklam_jetonlari enable row level security;
revoke all on table public.reklam_jetonlari from public, anon, authenticated;

-- Reklam ödülü aynı referansla iki kez yazılmasın (ikinci savunma hattı)
create unique index if not exists coin_hareketleri_reklam_tek
  on public.coin_hareketleri (user_id, referans)
  where tur = 'reklam' and referans is not null;

-- ---------------------------------------------------------------------------
-- Jeton ver
-- ---------------------------------------------------------------------------
create or replace function public.reklam_jetonu_al()
returns table (jeton uuid, min_sure_sn int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tavan int := public.ayar_sayi('reklam_gunluk_tavan', 5)::int;
  v_min int := public.ayar_sayi('reklam_min_sure_sn', 10)::int;
  v_gun date := (now() at time zone 'Europe/Istanbul')::date;
  v_sayac int;
  v_jeton uuid;
begin
  perform public.hiz_siniri('reklam_jetonu_al', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  select r.sayac into v_sayac from public.reklam_odulleri r
   where r.user_id = v_me and r.gun = v_gun;
  if coalesce(v_sayac, 0) >= v_tavan then
    raise exception 'Bugünkü reklam ödülü hakkın doldu (%/%)', coalesce(v_sayac, 0), v_tavan;
  end if;

  -- Aynı anda tek açık jeton: eskileri geçersiz kıl
  update public.reklam_jetonlari set iptal = true
   where user_id = v_me and kullanildi is null and not iptal;

  -- Eski kayıtları temizle (tablo büyümesin)
  delete from public.reklam_jetonlari
   where user_id = v_me and olusturuldu < now() - interval '2 days';

  insert into public.reklam_jetonlari (user_id) values (v_me) returning reklam_jetonlari.jeton into v_jeton;
  return query select v_jeton, v_min;
end;
$$;

revoke all on function public.reklam_jetonu_al() from public, anon;
grant execute on function public.reklam_jetonu_al() to authenticated;

-- ---------------------------------------------------------------------------
-- Ödül ver (yalnız jetonla)
-- ---------------------------------------------------------------------------
create or replace function public.reklam_odulu_al(p_reklam_ref text)
returns table (verilen integer, bugun integer, tavan integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tavan int := public.ayar_sayi('reklam_gunluk_tavan', 5)::int;
  v_odul bigint := public.ayar_sayi('coin_reklam', 25);
  v_min int := public.ayar_sayi('reklam_min_sure_sn', 10)::int;
  v_omur int := public.ayar_sayi('reklam_jeton_omur_dk', 15)::int;
  v_gun date := (now() at time zone 'Europe/Istanbul')::date;
  v_sayac int;
  v_ref text;
  v_jeton uuid;
  v_kayit public.reklam_jetonlari%rowtype;
begin
  perform public.hiz_siniri('reklam_odulu_al', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_ref := nullif(btrim(coalesce(p_reklam_ref, '')), '');
  if v_ref is null then raise exception 'Geçersiz reklam referansı'; end if;

  begin
    v_jeton := v_ref::uuid;
  exception when invalid_text_representation then
    raise exception 'Geçersiz reklam jetonu';
  end;

  -- Jetonu kilitle: eşzamanlı iki çağrıdan yalnız biri geçer
  select * into v_kayit from public.reklam_jetonlari
   where jeton = v_jeton and user_id = v_me
   for update;
  if not found or v_kayit.iptal then
    raise exception 'Geçersiz reklam jetonu';
  end if;
  if v_kayit.kullanildi is not null then
    raise exception 'Bu reklam ödülü zaten alındı';
  end if;
  if v_kayit.olusturuldu > now() - make_interval(secs => v_min) then
    raise exception 'Reklam tamamlanmadan ödül alınamaz';
  end if;
  if v_kayit.olusturuldu < now() - make_interval(mins => v_omur) then
    raise exception 'Reklam jetonunun süresi doldu';
  end if;

  insert into public.reklam_odulleri (user_id, gun, sayac)
  values (v_me, v_gun, 0)
  on conflict (user_id, gun) do nothing;

  select r.sayac into v_sayac
  from public.reklam_odulleri r
  where r.user_id = v_me and r.gun = v_gun
  for update;

  if v_sayac >= v_tavan then
    raise exception 'Bugünkü reklam ödülü hakkın doldu (%/%)', v_sayac, v_tavan;
  end if;

  update public.reklam_jetonlari set kullanildi = now() where jeton = v_jeton;

  update public.reklam_odulleri
     set sayac = sayac + 1
   where user_id = v_me and gun = v_gun
  returning sayac into v_sayac;

  perform public.coin_ekle(v_me, v_odul, 'reklam', v_ref);

  return query select v_odul::int, v_sayac, v_tavan;
end;
$$;

revoke all on function public.reklam_odulu_al(text) from public, anon;
grant execute on function public.reklam_odulu_al(text) to authenticated;
