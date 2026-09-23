-- ============================================================
-- 335 · ARKADAŞ DAVET SİSTEMİ
--
-- - Kalıcı davet kodu (profiles.davet_kodu, mevcut) + bağlantı /davet/KOD.
-- - Kod bağlanınca: davet edilen +100 coin (davet_odul_davet_edilen), otomatik arkadaş.
-- - Davet edilen Level 5'e ulaşınca (davet_gereken_level) davet eden +300 (davet_odul_davet_eden).
-- - Aynı cihaz/IP (ayni_cihaz_mi, mevcut kural) sayılmaz: bağlanırken ve ödül anında iki kez bakılır.
-- - Ayda en çok 10 ödüllü davet (davet_aylik_sinir, TSİ takvim ayı); fazlası 'sinir_asildi' (ödülsüz).
-- - Davet yalnız YENİ hesapta bağlanır (davet_baglama_saat = 72): eski hesaplar birbirinin kodunu
--   "arkadaş ekle" için kullanmaya devam eder ama davet sayılıp coin toplayamaz.
-- - İki kapı, tek iç mantık (davet_bagla_ic): mevcut arkadas_davet_kodu_ile_ekle (/davet/KOD sayfası,
--   giriş sonrası AuthContext) ve kayıt ekranındaki elle alan için davet_kodu_bagla.
-- - Eski claim_referral (?davet=<uuid>, anında 200+200) aynı iç mantığa yönlendirildi.
-- ============================================================

-- Eski sistemle bağlanmış 2 davet kaydı: o zaman anında ödüllendiler (200+200) → 'odullendi', coin 0.
insert into public.davetler (davet_eden, davet_edilen, durum, eden_coin, edilen_coin, olusturma_at, odul_at)
select p.davet_eden, p.id, 'odullendi', 0, 0, p.created_at, p.created_at
  from public.profiles p
  join public.profiles e on e.id = p.davet_eden
 where p.davet_eden is not null and p.davet_eden <> p.id
on conflict (davet_edilen) do nothing;

-- ---------- İç: ödül kontrolü (davet edilen level atlayınca) ----------
create or replace function public.davet_odul_kontrol(p_edilen uuid)
returns text
language plpgsql security definer set search_path to 'public'
as $$
declare
  d public.davetler%rowtype;
  v_level int;
  v_sinir int := public.ayar_sayi('davet_aylik_sinir', 10)::int;
  v_coin int := public.ayar_sayi('davet_odul_davet_eden', 300)::int;
  v_ay_basi timestamptz := (date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  v_bu_ay int;
begin
  select * into d from public.davetler where davet_edilen = p_edilen for update;
  if not found then return null; end if;
  if d.durum <> 'bekliyor' then return d.durum; end if;

  select coalesce(level, 1) into v_level from public.profiles where id = p_edilen;
  if v_level < public.ayar_sayi('davet_gereken_level', 5)::int then return 'bekliyor'; end if;

  if public.ayni_cihaz_mi(p_edilen, d.davet_eden) then
    update public.davetler set durum = 'gecersiz', gecersiz_neden = 'ayni_cihaz', odul_at = now() where id = d.id;
    return 'gecersiz';
  end if;

  -- Aylık sınır: davet edenin satırı kilitlenir, eşzamanlı iki ödül sırayla sayılır.
  perform 1 from public.profiles where id = d.davet_eden for update;
  select count(*) into v_bu_ay from public.davetler x
   where x.davet_eden = d.davet_eden and x.durum = 'odullendi' and x.odul_at >= v_ay_basi;

  if v_bu_ay >= v_sinir then
    update public.davetler set durum = 'sinir_asildi', odul_at = now() where id = d.id;
  else
    if v_coin > 0 then
      perform public.coin_ekle(d.davet_eden, v_coin, 'davet', 'davet_eden:' || p_edilen::text);
    end if;
    update public.davetler set durum = 'odullendi', eden_coin = greatest(v_coin, 0), odul_at = now() where id = d.id;
  end if;

  perform public.rozet_kontrol_guvenli(d.davet_eden, array['davet']);
  return (select durum from public.davetler where id = d.id);
end;
$$;
revoke all on function public.davet_odul_kontrol(uuid) from public, anon, authenticated;

-- ---------- İç: bağlama ----------
-- Dönüş: baglandi | ayni_cihaz | zaten_bagli | sure_doldu | kendi_kodun | gecersiz_kod
create or replace function public.davet_bagla_ic(p_edilen uuid, p_eden uuid)
returns text
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_edilen public.profiles%rowtype;
  v_ayni boolean;
  v_coin int := public.ayar_sayi('davet_odul_davet_edilen', 100)::int;
  v_saat int := public.ayar_sayi('davet_baglama_saat', 72)::int;
  v_f uuid;
begin
  if p_edilen is null or p_eden is null then return 'gecersiz_kod'; end if;
  if p_edilen = p_eden then return 'kendi_kodun'; end if;
  if not exists (select 1 from public.profiles e where e.id = p_eden and not coalesce(e.is_bot, false)) then
    return 'gecersiz_kod';
  end if;

  select * into v_edilen from public.profiles where id = p_edilen for update;
  if not found or coalesce(v_edilen.is_bot, false) then return 'gecersiz_kod'; end if;
  if v_edilen.davet_eden is not null or exists (select 1 from public.davetler d where d.davet_edilen = p_edilen) then
    return 'zaten_bagli';
  end if;
  if v_edilen.created_at < now() - make_interval(hours => v_saat) then return 'sure_doldu'; end if;

  v_ayni := public.ayni_cihaz_mi(p_edilen, p_eden);

  insert into public.davetler (davet_eden, davet_edilen, durum, gecersiz_neden, edilen_coin, odul_at)
  values (p_eden, p_edilen,
          case when v_ayni then 'gecersiz' else 'bekliyor' end,
          case when v_ayni then 'ayni_cihaz' end,
          case when v_ayni then 0 else greatest(v_coin, 0) end,
          case when v_ayni then now() end);

  update public.profiles set davet_eden = p_eden where id = p_edilen;
  update public.profiles set davet_sayisi = coalesce(davet_sayisi, 0) + 1 where id = p_eden;

  if not v_ayni and v_coin > 0 then
    perform public.coin_ekle(p_edilen, v_coin, 'davet', 'davet_edilen:' || p_eden::text);
  end if;

  -- Otomatik arkadaşlık (varsa bekleyen isteği kabul eder)
  select f.id into v_f from public.friendships f
   where (f.requester = p_eden and f.addressee = p_edilen) or (f.requester = p_edilen and f.addressee = p_eden)
   limit 1;
  if v_f is not null then
    update public.friendships set durum = 'arkadas' where id = v_f and durum is distinct from 'arkadas';
  else
    insert into public.friendships (requester, addressee, durum) values (p_eden, p_edilen, 'arkadas')
    on conflict (requester, addressee) do update set durum = 'arkadas';
  end if;

  begin
    perform public.bildirim_anahtarla(p_eden, 'arkadas_kabul', 'arkadas_kabul',
      jsonb_build_array(coalesce(v_edilen.gorunen_ad, 'Bir oyuncu')), '/bildim/arkadaslar');
  exception when others then
    raise warning 'davet bildirimi gönderilemedi: %', sqlerrm;
  end;

  -- Hızlı oyuncu 72 saat içinde zaten Level 5 olmuş olabilir
  if not v_ayni then perform public.davet_odul_kontrol(p_edilen); end if;

  return case when v_ayni then 'ayni_cihaz' else 'baglandi' end;
end;
$$;
revoke all on function public.davet_bagla_ic(uuid, uuid) from public, anon, authenticated;

-- ---------- Tetikleyici: level atlayınca davet ödülü ----------
create or replace function public.trg_davet_level()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (select 1 from public.davetler d where d.davet_edilen = new.id and d.durum = 'bekliyor') then
    perform public.davet_odul_kontrol(new.id);
  end if;
  return null;
exception when others then
  raise warning 'trg_davet_level başarısız (%): %', new.id, sqlerrm;
  return null;
end;
$$;
revoke all on function public.trg_davet_level() from public, anon, authenticated;
drop trigger if exists trg_davet_level on public.profiles;
create trigger trg_davet_level
  after update of level on public.profiles
  for each row when (new.level > old.level and not coalesce(new.is_bot, false))
  execute function public.trg_davet_level();

-- ---------- İstemci RPC'leri ----------

create or replace function public.davet_kodum()
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_kod text;
  v_ay_basi timestamptz := (date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select davet_kodu into v_kod from public.profiles where id = v_me;
  if v_kod is null then
    v_kod := public.yeni_davet_kodu();
    update public.profiles set davet_kodu = v_kod where id = v_me and davet_kodu is null;
    select davet_kodu into v_kod from public.profiles where id = v_me;
  end if;
  return jsonb_build_object(
    'kod', v_kod,
    'yol', '/davet/' || v_kod,
    'odul_davet_eden', public.ayar_sayi('davet_odul_davet_eden', 300)::int,
    'odul_davet_edilen', public.ayar_sayi('davet_odul_davet_edilen', 100)::int,
    'gereken_level', public.ayar_sayi('davet_gereken_level', 5)::int,
    'aylik_sinir', public.ayar_sayi('davet_aylik_sinir', 10)::int,
    'bu_ay_odullenen', (select count(*) from public.davetler d
                         where d.davet_eden = v_me and d.durum = 'odullendi' and d.odul_at >= v_ay_basi));
end;
$$;
revoke all on function public.davet_kodum() from public, anon;
grant execute on function public.davet_kodum() to authenticated;

create or replace function public.davet_durumum()
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_ay_basi timestamptz := (date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  v_gereken int := public.ayar_sayi('davet_gereken_level', 5)::int;
  v_p public.profiles%rowtype;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into v_p from public.profiles where id = v_me;
  return jsonb_build_object(
    'davetlerim', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', p.id, 'ad', p.gorunen_ad, 'avatar', p.gorunen_avatar, 'level', coalesce(p.level, 1),
               'cerceve', p.takili_cerceve, 'durum', d.durum, 'gereken_level', v_gereken,
               'olusturma_at', d.olusturma_at, 'odul_at', d.odul_at)
             order by d.olusturma_at desc)
        from public.davetler d join public.profiles p on p.id = d.davet_edilen
       where d.davet_eden = v_me), '[]'::jsonb),
    'davet_eden', (
      select jsonb_build_object('user_id', e.id, 'ad', e.gorunen_ad, 'durum', d.durum)
        from public.davetler d join public.profiles e on e.id = d.davet_eden
       where d.davet_edilen = v_me),
    'ozet', (
      select jsonb_build_object(
               'toplam', count(*),
               'bekleyen', count(*) filter (where d.durum = 'bekliyor'),
               'odullenen', count(*) filter (where d.durum = 'odullendi'),
               'bu_ay_odullenen', count(*) filter (where d.durum = 'odullendi' and d.odul_at >= v_ay_basi),
               'aylik_sinir', public.ayar_sayi('davet_aylik_sinir', 10)::int)
        from public.davetler d where d.davet_eden = v_me),
    'baglanabilir', (v_p.davet_eden is null
                     and not exists (select 1 from public.davetler d where d.davet_edilen = v_me)
                     and v_p.created_at >= now() - make_interval(hours => public.ayar_sayi('davet_baglama_saat', 72)::int)));
end;
$$;
revoke all on function public.davet_durumum() from public, anon;
grant execute on function public.davet_durumum() to authenticated;

-- Kayıt ekranındaki elle kod alanı: hata atmaz, durum döner.
create or replace function public.davet_kodu_bagla(p_kod text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_kod text := upper(btrim(coalesce(p_kod, '')));
  v_eden public.profiles%rowtype;
  v_durum text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('davet_kodu_bagla', 10, interval '60 seconds');
  select * into v_eden from public.profiles p where p.davet_kodu = v_kod and length(v_kod) = 8;
  if not found or coalesce(v_eden.is_bot, false) then
    return jsonb_build_object('durum', 'gecersiz_kod', 'davet_eden_ad', null, 'coin', 0, 'arkadas', false);
  end if;
  v_durum := public.davet_bagla_ic(v_me, v_eden.id);
  return jsonb_build_object(
    'durum', v_durum,
    'davet_eden_ad', case when v_durum in ('baglandi', 'ayni_cihaz', 'zaten_bagli') then v_eden.gorunen_ad end,
    'coin', case when v_durum = 'baglandi' then public.ayar_sayi('davet_odul_davet_edilen', 100)::int else 0 end,
    'arkadas', v_durum in ('baglandi', 'ayni_cihaz'));
end;
$$;
revoke all on function public.davet_kodu_bagla(text) from public, anon;
grant execute on function public.davet_kodu_bagla(text) to authenticated;

-- ---------- Mevcut kapılar ----------

-- Eski ?davet=<uuid> bağlantısı: artık anında 200+200 yok, aynı bağlama mantığı.
create or replace function public.claim_referral(p_davet_eden uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return public.davet_bagla_ic(auth.uid(), p_davet_eden) in ('baglandi', 'ayni_cihaz');
end;
$function$;

-- /davet/KOD ve "kodla arkadaş ekle": dönüş şekli aynı. Yeni hesap davet de bağlar.
create or replace function public.arkadas_davet_kodu_ile_ekle(p_kod text)
 returns table(durum text, gorunen_ad text)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_hedef public.profiles%rowtype;
  v_kod text;
  v_ters uuid;
  v_mevcut text;
  v_ben_ad text;
  v_bag text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  v_kod := upper(btrim(coalesce(p_kod, '')));
  if length(v_kod) <> 8 then raise exception 'Davet kodu 8 karakter olmalı.'; end if;

  select * into v_hedef from public.profiles p where p.davet_kodu = v_kod;
  if not found then raise exception 'Böyle bir davet kodu yok.'; end if;
  if v_hedef.id = auth.uid() then raise exception 'Kendi davet kodunu kullanamazsın.'; end if;
  if coalesce(v_hedef.is_bot, false) then raise exception 'Bu kod kullanılamaz.'; end if;

  -- 335: yeni hesap (≤ davet_baglama_saat) bu kodla geldiyse davet bağlanır ve doğrudan arkadaş olunur.
  v_bag := public.davet_bagla_ic(auth.uid(), v_hedef.id);
  if v_bag in ('baglandi', 'ayni_cihaz') then
    return query select 'arkadas_oldu'::text, v_hedef.gorunen_ad;
    return;
  end if;

  -- Kendi görünen adımızı bir kez, NİTELİKLİ olarak alalım
  select me.gorunen_ad into v_ben_ad
    from public.profiles me where me.id = auth.uid();

  select f.durum into v_mevcut from public.friendships f
  where (f.requester = auth.uid() and f.addressee = v_hedef.id)
     or (f.requester = v_hedef.id and f.addressee = auth.uid());

  if v_mevcut = 'arkadas' then
    return query select 'zaten_arkadas'::text, v_hedef.gorunen_ad;
    return;
  end if;

  -- Karşı taraf zaten istek gönderdiyse doğrudan arkadaş ol
  select f.id into v_ters from public.friendships f
  where f.requester = v_hedef.id and f.addressee = auth.uid();
  if found then
    update public.friendships f set durum = 'arkadas' where f.id = v_ters;
    perform public.bildirim_anahtarla(
      v_hedef.id, 'arkadas_kabul', 'arkadas_kabul',
      jsonb_build_array(coalesce(v_ben_ad, 'Bir oyuncu')),
      '/bildim/arkadaslar'
    );
    return query select 'arkadas_oldu'::text, v_hedef.gorunen_ad;
    return;
  end if;

  insert into public.friendships (requester, addressee)
  values (auth.uid(), v_hedef.id)
  on conflict (requester, addressee) do nothing;

  perform public.bildirim_anahtarla(
      v_hedef.id, 'arkadas_istek', 'arkadas_istek',
      jsonb_build_array(coalesce(v_ben_ad, 'Bir oyuncu')),
      '/bildim/arkadaslar'
    );

  return query select 'istek_gonderildi'::text, v_hedef.gorunen_ad;
end;
$function$;

-- Eski sistemin iki davet edeni için sosyal rozet (geriye dönük, coin'siz)
do $$
declare r record;
begin
  for r in select distinct davet_eden from public.davetler loop
    perform public.rozet_kontrol(r.davet_eden, array['davet'], false, true);
  end loop;
end $$;
