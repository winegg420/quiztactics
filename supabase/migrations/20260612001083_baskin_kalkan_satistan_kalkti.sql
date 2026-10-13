-- 1083 — Baskın ve Kalkan satıştan kalktı (GPT denetimi 13 Eki 2026, madde 1).
-- Düello v4 (Duello4Arena → V2Skill, hakimiyet: null) bu iki jokeri hiç göstermiyor; oyuncu satın
-- alıp kullanamıyordu. Tanımlar ve eski Düello kodu durur; yalnız satış kapanır, eldeki stok iade edilir.
-- GRANT/RLS değişmez; create or replace mevcut yetkileri korur.

-- 1) Paketler: Baskın/Kalkan içeren her paket satıştan iner (satır silinmez).
update public.joker_paketleri set aktif = false
 where aktif and icerik ?| array['baskin', 'kalkan'];

-- 2) Tek kaynak fiyat: Baskın/Kalkan fiyatsız → joker_tek_al, joker_al_ve_kullan, skill_al_ve_hazirla,
--    kasa_joker ve skill_dukkani satışı reddeder ("Bu joker tek tek satılmıyor").
create or replace function public.joker_fiyati(p_tur text)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select case when public.skill_aktif(p_tur) and p_tur not in ('baskin', 'kalkan')
    then public.ayar_sayi('coin_joker_' || p_tur, null)
    else null end;
$function$;

-- 3) Paket satın alma: aktif bayrağına ek olarak içerik kontrolü (bir paket yanlışlıkla açılırsa da reddeder).
create or replace function public.joker_coin_ile_al(p_urun_id text)
returns table(bakiye bigint, icerik jsonb)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_paket public.joker_paketleri%rowtype;
  v_fiyat bigint;
  v_bakiye bigint;
  v_tip text;
  v_adet int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('joker_coin_ile_al', 20, interval '60 seconds');

  select * into v_paket from public.joker_paketleri where urun_id = p_urun_id and aktif;
  if not found then raise exception 'Paket bulunamadı'; end if;
  if v_paket.icerik ?| array['baskin', 'kalkan'] then raise exception 'Bu paket satıştan kalktı'; end if;
  v_fiyat := public.joker_paket_fiyati(p_urun_id);
  if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu paket coin ile satılmıyor'; end if;

  if exists (select 1 from jsonb_object_keys(v_paket.icerik) t
              where t <> 'seri_koruma' and not public.skill_kilidi_acik(v_me, t)) then
    raise exception 'Bu paketteki bir skill kilitli';
  end if;

  v_bakiye := public.coin_harca(v_fiyat, 'joker', p_urun_id);

  -- kaynak 'satin_alma': joker_islemleri_kaynak_check yalnız bilinen kaynakları kabul eder.
  for v_tip, v_adet in select key, (value #>> '{}')::int from jsonb_each(v_paket.icerik) loop
    perform public.joker_hareket(v_me, v_tip, v_adet, 'satin_alma', p_urun_id);
  end loop;

  return query select v_bakiye, v_paket.icerik;
end;
$$;

-- 4) 'joker_iade' coin türü günlük tavandan muaf (1060 coin_ekle + 1080 coin_gunluk_kalan listeleri).
create or replace function public.coin_gunluk_kalan(p_user uuid)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0, public.ayar_sayi('coin_gunluk_tavan', 400) - coalesce((
    select sum(h.miktar) from public.coin_hareketleri h
    where h.user_id = p_user and h.miktar > 0
      and h.tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'ekonomi_esitleme', 'seviye', 'sezon_yolu',
                        'rozet', 'davet', 'posta_odul', 'joker_iade')
      and (h.olusturuldu at time zone 'Europe/Istanbul')::date
          = (now() at time zone 'Europe/Istanbul')::date
  ), 0));
$function$;

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
  -- 'rozet' rozet ödülü: aynı rozet bir kez, tavana takılmaz (333)
  -- 'sezon_yolu' Sezon Yolu yuva ödülü: her yuva bir kez, tavana takılmaz (720)
  -- 'posta_odul' yönetim postası ödülü: posta başına bir kez, tavana takılmaz (1060)
  -- 'joker_iade' satıştan kalkan joker stoğunun iadesi: tek seferlik, tavana takılmaz (1083)
  if p_tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'davet', 'seviye', 'rozet', 'sezon_yolu', 'posta_odul', 'joker_iade') then
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

-- 5) İade: joker kaynağına 'iade' eklenir; gerçek oyuncuların (bot hariç) Baskın/Kalkan stoğu dükkân
--    birim fiyatından (coin_joker_baskin / coin_joker_kalkan) coin'e çevrilir, stok sıfırlanır.
--    İdempotent: stok sıfırlandığı için ikinci çalışmada iade edilecek satır kalmaz; ayrıca coin
--    hareketinde (user_id, tur, referans) tekil indeksi aynı iadenin iki kez yazılmasını engeller.
alter table public.joker_islemleri drop constraint if exists joker_islemleri_kaynak_check;
alter table public.joker_islemleri add constraint joker_islemleri_kaynak_check
  check (kaynak = any (array['ucretsiz', 'reklam', 'satin_alma', 'kullanim', 'seri', 'hediye',
    'baslangic', 'mac_ici', 'iade']));

create unique index if not exists coin_hareketleri_joker_iade_tek
  on public.coin_hareketleri (user_id, tur, referans) where tur = 'joker_iade' and referans is not null;

do $$
declare
  r record;
begin
  for r in
    select e.user_id, e.tur, e.adet, public.ayar_sayi('coin_joker_' || e.tur, 0) as birim
      from public.joker_envanter e
      join public.profiles p on p.id = e.user_id
     where e.tur in ('baskin', 'kalkan') and e.adet > 0 and not coalesce(p.is_bot, false)
     for update of e
  loop
    if r.birim > 0 then
      perform public.coin_ekle(r.user_id, r.adet * r.birim, 'joker_iade', '1083:' || r.tur);
    end if;
    perform public.joker_hareket(r.user_id, r.tur, -r.adet, 'iade', '1083');
  end loop;
end;
$$;
