-- 1050: Maç sonu SP şeridi + seviye atlama kutlaması (sunucu değerleri) ve Battle Pass tanıtım penceresi.
--  * sezon_mac_sp_ozetim(p_ref): bu maçtan (mac / duello / kasa / turnuva referansı) kazanılan SP, öncesi/sonrası SP ve seviye,
--    eşik sınırları ve atlanan seviyelerin ücretsiz kol ödülleri. İstemci hesap yapmaz. Yalnız okur.
--  * bp_tanitim_gosterimleri + bp_tanitim_gosterilsin_mi(): yalnız BP'si olmayan oyuncuya günde en çok 1 kez (TSİ),
--    kayıt hesaba bağlı ve atomik. Sezon açık değilse / test sezonuysa / BP varsa gösterilmez.
-- Mevcut hiçbir RLS / GRANT / security definer yetkisi değiştirilmez; yalnız yeni tablo + yeni fonksiyonlar.

create table if not exists public.bp_tanitim_gosterimleri (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  son_tarih  date not null,
  adet       int not null default 1,
  guncellendi timestamptz not null default now()
);
alter table public.bp_tanitim_gosterimleri enable row level security;
revoke all on public.bp_tanitim_gosterimleri from anon, authenticated;

create or replace function public.sezon_mac_sp_ozetim(p_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_top int;
  v_sp int;
  v_once int;
  v_sv_once int;
  v_sv_sonra int;
  v_oduller jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_ref is null or length(p_ref) = 0 or length(p_ref) > 64 then
    return jsonb_build_object('gorunur', false);
  end if;
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then return jsonb_build_object('gorunur', false); end if;

  select coalesce(sum(h.miktar), 0)::int into v_top
    from public.sezon_puan_hareketleri h
   where h.sezon = v_sezon and h.user_id = v_me
     and h.kaynak in ('mac', 'duello', 'turnuva')
     and split_part(h.referans, ':', 2) = p_ref;
  if v_top <= 0 then return jsonb_build_object('gorunur', true, 'kazanilan', 0); end if;

  select sp into v_sp from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me;
  v_sp := coalesce(v_sp, 0);
  v_once := greatest(0, v_sp - v_top);
  v_sv_once := public.sezon_seviye(v_once);
  v_sv_sonra := public.sezon_seviye(v_sp);

  select coalesce(jsonb_agg(jsonb_build_object(
           'seviye', o.seviye, 'kol', o.kol, 'tur', o.tur, 'veri', o.veri, 'placeholder', o.placeholder,
           'ad_tr', o.ad_tr, 'ad_en', o.ad_en, 'nadirlik', o.nadirlik) order by o.seviye), '[]'::jsonb)
    into v_oduller
    from public.bp_seviye_odulleri o
   where o.kol = 'ucretsiz' and o.seviye > v_sv_once and o.seviye <= v_sv_sonra and o.seviye <= v_max;

  return jsonb_build_object(
    'gorunur', true,
    'kazanilan', v_top,
    'sp_once', v_once, 'sp_sonra', v_sp,
    'seviye_once', v_sv_once, 'seviye_sonra', v_sv_sonra,
    'seviye_sayisi', v_max,
    'once_alt', public.sezon_esik(v_sv_once),
    'once_ust', case when v_sv_once >= v_max then null else public.sezon_esik(v_sv_once + 1) end,
    'sonra_alt', public.sezon_esik(v_sv_sonra),
    'sonra_ust', case when v_sv_sonra >= v_max then null else public.sezon_esik(v_sv_sonra + 1) end,
    'kalan', case when v_sv_sonra >= v_max then null else public.sezon_esik(v_sv_sonra + 1) - v_sp end,
    'atlandi', v_sv_sonra > v_sv_once,
    'oduller', v_oduller
  );
end $$;

create or replace function public.bp_tanitim_gosterilsin_mi()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_sezon public.sezonlar;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_id uuid;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not public.sezon_yolu_acik_mi() then return jsonb_build_object('goster', false); end if;
  select * into v_sezon from public.sezonlar where kapandi_at is null and not test and bitis > now() order by no desc limit 1;
  if v_sezon.id is null then return jsonb_build_object('goster', false); end if;
  if exists (select 1 from public.profiles where id = v_me and coalesce(is_bot, false)) then
    return jsonb_build_object('goster', false);
  end if;
  if public.bp_aktif_mi(v_sezon.id, v_me) then return jsonb_build_object('goster', false); end if;

  -- atomik günlük işaret: satır yoksa eklenir, dünden kaldıysa güncellenir; bugün zaten varsa satır dönmez
  insert into public.bp_tanitim_gosterimleri as t (user_id, son_tarih) values (v_me, v_bugun)
  on conflict (user_id) do update set son_tarih = excluded.son_tarih, adet = t.adet + 1, guncellendi = now()
   where t.son_tarih < excluded.son_tarih
  returning user_id into v_id;
  if v_id is null then return jsonb_build_object('goster', false); end if;

  return jsonb_build_object(
    'goster', true,
    'sezon_no', v_sezon.no,
    'ucretli_odul_sayisi', (select count(*) from public.bp_seviye_odulleri o where o.kol = 'ucretli' and o.seviye <= v_max),
    'fiyat', public.ayar_sayi('bp_fiyat_elmas', 500),
    'sp_carpan', public.ayar_ondalik('bp_sp_carpan', 1.25)
  );
end $$;

revoke all on function public.sezon_mac_sp_ozetim(text) from public, anon;
grant execute on function public.sezon_mac_sp_ozetim(text) to authenticated, service_role;
revoke all on function public.bp_tanitim_gosterilsin_mi() from public, anon;
grant execute on function public.bp_tanitim_gosterilsin_mi() to authenticated, service_role;
