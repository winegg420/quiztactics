-- ============================================================
-- YENİ AVATAR KATALOĞU (27 karakter) — KAPALI başlar
-- Günlük (13, bedava) + Kostümlü (14, elmas). Mevcut 31 profesyonel avatar
-- bu tabloya GİRMEZ; onların davranışı (avatar_onayla izin listesi) aynen durur.
--
-- Görünürlük kuralı (sunucuda): bir avatar normal oyuncuya ancak
--   aktif = true  VE  onay = 'girsin' (Ida /avatar-onizleme'de seçer)
--   VE  oyun_ayarlari.kozmetik_satis_acik doğru
-- olduğunda görünür/seçilir/satılır. Sahip (sahip_mi()) test için her şeyi
-- görür ve satın almadan takabilir.
--
-- Tablolar : avatar_katalogu, oyuncu_avatarlari (RLS açık, politika yok → yalnız RPC)
-- RPC'ler  : avatar_katalogu_oyun()          — oyuncu kataloğu (Dükkân/Koleksiyon okur)
--            avatar_satin_al(p_anahtar)      — kostümlü avatarı elmasla al
--            avatar_onizleme_listesi()       — yalnız sahip: 27'si + onay durumu
--            avatar_onay_kaydet(p_anahtar, p_onay) — yalnız sahip yazar
--            avatar_onayla(p_url)            — profil avatarı doğrulama (katalog kuralı eklendi)
-- Ayarlar  : elmas_avatar_kostumlu 250 (TEST), kozmetik_satis_acik false (yoksa eklenir)
-- ============================================================

-- ---------- 1. Ayarlar ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_avatar_kostumlu', '250', 'TEST — Kostümlü avatar fiyatı (elmas). avatar_katalogu.fiyat_elmas boşsa bu kullanılır.'),
  ('kozmetik_satis_acik', 'false', 'Yeni kozmetikler (avatar, çerçeve tarzı, elmas kozmetikleri) normal oyuncuya açık mı. Ida onaylayınca true.')
on conflict (anahtar) do nothing;

-- Bayrak okuyucu: true / sıfırdan farklı sayı / "true" metni → açık
create or replace function public.kozmetik_satis_acik_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case jsonb_typeof(deger)
             when 'boolean' then (deger #>> '{}')::boolean
             when 'number'  then (deger #>> '{}')::numeric <> 0
             when 'string'  then lower(deger #>> '{}') in ('true', '1', 'evet')
             else false end
      from public.oyun_ayarlari where anahtar = 'kozmetik_satis_acik'), false);
$$;
revoke execute on function public.kozmetik_satis_acik_mi() from public, anon;
grant execute on function public.kozmetik_satis_acik_mi() to authenticated;

-- ---------- 2. Katalog ----------
create table if not exists public.avatar_katalogu (
  anahtar      text primary key check (anahtar ~ '^[a-z0-9-]{2,40}$'),
  url          text not null unique check (url ~ '^/avatars/pro2/[a-z0-9-]+\.svg$'),
  ad_tr        text not null,
  ad_en        text not null,
  tur          text not null check (tur in ('gunluk', 'kostumlu')),
  fiyat_elmas  integer check (fiyat_elmas is null or fiyat_elmas > 0),  -- boş = ayar (kostümlü) / bedava (günlük)
  aktif        boolean not null default true,                            -- teknik anahtar
  onay         text not null default 'bekliyor' check (onay in ('bekliyor', 'girsin', 'girmesin')),
  onay_zamani  timestamptz,
  sira         integer not null default 0,
  olusturuldu  timestamptz not null default now()
);
alter table public.avatar_katalogu enable row level security;
revoke all on public.avatar_katalogu from public, anon, authenticated;

create table if not exists public.oyuncu_avatarlari (
  user_id  uuid not null references auth.users(id) on delete cascade,
  avatar   text not null references public.avatar_katalogu(anahtar) on update cascade,
  kaynak   text not null default 'dukkan' check (kaynak in ('dukkan', 'etkinlik', 'hediye')),
  alindi   timestamptz not null default now(),
  primary key (user_id, avatar)
);
alter table public.oyuncu_avatarlari enable row level security;
revoke all on public.oyuncu_avatarlari from public, anon, authenticated;

insert into public.avatar_katalogu (anahtar, url, ad_tr, ad_en, tur, sira) values
  ('sarisin-y01',        '/avatars/pro2/sarisin-y01.svg',        'Sarışın',          'Blonde',          'gunluk',   1),
  ('kivircik-y02',       '/avatars/pro2/kivircik-y02.svg',       'Kıvırcık',         'Curly',           'gunluk',   2),
  ('kizil-y03',          '/avatars/pro2/kizil-y03.svg',          'Kızıl',            'Redhead',         'gunluk',   3),
  ('basortulu-y04',      '/avatars/pro2/basortulu-y04.svg',      'Başörtülü',        'Headscarf',       'gunluk',   4),
  ('gozluklu-y05',       '/avatars/pro2/gozluklu-y05.svg',       'Gözlüklü',         'Specs',           'gunluk',   5),
  ('kel-y06',            '/avatars/pro2/kel-y06.svg',            'Kel',              'Bald',            'gunluk',   6),
  ('sakalli-y07',        '/avatars/pro2/sakalli-y07.svg',        'Sakallı',          'Bearded',         'gunluk',   7),
  ('dede-y08',           '/avatars/pro2/dede-y08.svg',           'Bilge Dede',       'Wise Elder',      'gunluk',   8),
  ('sporcu-y09',         '/avatars/pro2/sporcu-y09.svg',         'Sporcu',           'Athlete',         'gunluk',   9),
  ('ogrenci-y10',        '/avatars/pro2/ogrenci-y10.svg',        'Öğrenci',          'Student',         'gunluk',  10),
  ('bilim-y11',          '/avatars/pro2/bilim-y11.svg',          'Bilim İnsanı',     'Scientist',       'gunluk',  11),
  ('doktor-y12',         '/avatars/pro2/doktor-y12.svg',         'Doktor',           'Doctor',          'gunluk',  12),
  ('veteriner-y13',      '/avatars/pro2/veteriner-y13.svg',      'Veteriner',        'Vet',             'gunluk',  13),
  ('golge-ninja-y14',    '/avatars/pro2/golge-ninja-y14.svg',    'Gölge Ninja',      'Shadow Ninja',    'kostumlu', 14),
  ('samuray-y15',        '/avatars/pro2/samuray-y15.svg',        'Samuray',          'Samurai',         'kostumlu', 15),
  ('noel-baba-y16',      '/avatars/pro2/noel-baba-y16.svg',      'Noel Baba',        'Santa',           'kostumlu', 16),
  ('kaptan-y17',         '/avatars/pro2/kaptan-y17.svg',         'Korsan Kaptan',    'Pirate Captain',  'kostumlu', 17),
  ('uzay-kasifi-y18',    '/avatars/pro2/uzay-kasifi-y18.svg',    'Uzay Kaşifi',      'Space Explorer',  'kostumlu', 18),
  ('vampir-y19',         '/avatars/pro2/vampir-y19.svg',         'Vampir',           'Vampire',         'kostumlu', 19),
  ('ates-buyucu-y20',    '/avatars/pro2/ates-buyucu-y20.svg',    'Ateş Büyücüsü',    'Fire Mage',       'kostumlu', 20),
  ('mekanik-y21',        '/avatars/pro2/mekanik-y21.svg',        'Mekanik Robot',    'Mech Robot',      'kostumlu', 21),
  ('pelerinli-y22',      '/avatars/pro2/pelerinli-y22.svg',      'Pelerinli Kahraman', 'Caped Hero',    'kostumlu', 22),
  ('gece-y23',           '/avatars/pro2/gece-y23.svg',           'Gece Bekçisi',     'Night Guardian',  'kostumlu', 23),
  ('uzay-sovalye-y24',   '/avatars/pro2/uzay-sovalye-y24.svg',   'Yıldız Şövalyesi', 'Star Knight',     'kostumlu', 24),
  ('canavar-y25',        '/avatars/pro2/canavar-y25.svg',        'Laboratuvar Canavarı', 'Lab Monster', 'kostumlu', 25),
  ('yuce-kral-y26',      '/avatars/pro2/yuce-kral-y26.svg',      'Yüce Kral',        'High King',       'kostumlu', 26),
  ('kralice-y27',        '/avatars/pro2/kralice-y27.svg',        'Kraliçe',          'Queen',           'kostumlu', 27)
on conflict (anahtar) do nothing;

-- ---------- 3. Yardımcılar ----------
-- Etkin fiyat: günlük 0; kostümlü satırdaki fiyat ya da ayar
create or replace function public.avatar_fiyati(p_tur text, p_fiyat integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when p_tur = 'kostumlu'
              then coalesce(p_fiyat, public.ayar_sayi('elmas_avatar_kostumlu', 250)::int)
              else 0 end;
$$;
revoke execute on function public.avatar_fiyati(text, integer) from public, anon, authenticated;

-- Normal oyuncuya açık mı (sahip istisnası burada DEĞİL — çağıran ekler)
create or replace function public.avatar_acik_mi(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select k.aktif and k.onay = 'girsin'
                     from public.avatar_katalogu k where k.anahtar = p_anahtar), false)
         and public.kozmetik_satis_acik_mi();
$$;
revoke execute on function public.avatar_acik_mi(text) from public, anon, authenticated;

-- ---------- 4. Oyuncu kataloğu (Dükkân › Avatar, Profil › Koleksiyon) ----------
-- Normal oyuncu: yalnız açık avatarlar. Sahip: 27'sinin hepsi (kapali=true işaretli).
-- kullanabilir: günlük (açık) ya da sahip olunan kostümlü; sahip için hep true (test modu).
create or replace function public.avatar_katalogu_oyun()
returns table (anahtar text, url text, ad_tr text, ad_en text, tur text, fiyat_elmas integer,
               sira integer, sahibim boolean, kullanabilir boolean, kapali boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_sahip boolean;
  v_acik boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_sahip := public.sahip_mi();
  v_acik := public.kozmetik_satis_acik_mi();
  return query
    select k.anahtar, k.url, k.ad_tr, k.ad_en, k.tur,
           public.avatar_fiyati(k.tur, k.fiyat_elmas),
           k.sira,
           (o.user_id is not null),
           (v_sahip or k.tur = 'gunluk' or o.user_id is not null),
           not (k.aktif and k.onay = 'girsin' and v_acik)
      from public.avatar_katalogu k
      left join public.oyuncu_avatarlari o on o.user_id = v_me and o.avatar = k.anahtar
     where k.aktif
       and (v_sahip or (k.onay = 'girsin' and v_acik))
     order by k.sira, k.anahtar;
end;
$$;
revoke execute on function public.avatar_katalogu_oyun() from public, anon;
grant execute on function public.avatar_katalogu_oyun() to authenticated;

-- ---------- 5. Satın alma (kostümlü, elmas) ----------
create or replace function public.avatar_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_k public.avatar_katalogu%rowtype;
  v_fiyat int;
  v_bakiye int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('avatar_satin_al', 20, interval '60 seconds');
  select * into v_k from public.avatar_katalogu k where k.anahtar = p_anahtar;
  if not found or not v_k.aktif then raise exception 'Böyle bir avatar yok'; end if;
  if not (public.avatar_acik_mi(v_k.anahtar) or public.sahip_mi()) then
    raise exception 'Bu avatar satılmıyor';
  end if;
  if v_k.tur <> 'kostumlu' then raise exception 'Bu avatar bedava — satın alınmaz'; end if;
  v_fiyat := public.avatar_fiyati(v_k.tur, v_k.fiyat_elmas);

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_avatarlari o where o.user_id = v_me and o.avatar = v_k.anahtar) then
    raise exception 'Bu avatar zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, 'avatar', v_k.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (v_me, v_k.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_k.anahtar, 'url', v_k.url, 'fiyat', v_fiyat,
                            'bakiye', v_bakiye, 'sahip', true);
end;
$$;
revoke execute on function public.avatar_satin_al(text) from public, anon;
grant execute on function public.avatar_satin_al(text) to authenticated;

-- ---------- 6. Sahip önizleme sayfası (/avatar-onizleme) ----------
create or replace function public.avatar_onizleme_listesi()
returns table (anahtar text, url text, ad_tr text, ad_en text, tur text, fiyat_elmas integer,
               sira integer, aktif boolean, onay text, onay_zamani timestamptz, satis_acik boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  return query
    select k.anahtar, k.url, k.ad_tr, k.ad_en, k.tur, public.avatar_fiyati(k.tur, k.fiyat_elmas),
           k.sira, k.aktif, k.onay, k.onay_zamani, public.kozmetik_satis_acik_mi()
      from public.avatar_katalogu k
     order by k.sira, k.anahtar;
end;
$$;
revoke execute on function public.avatar_onizleme_listesi() from public, anon;
grant execute on function public.avatar_onizleme_listesi() to authenticated;

create or replace function public.avatar_onay_kaydet(p_anahtar text, p_onay text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_sayi int;
begin
  if auth.uid() is null or not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  if p_onay not in ('bekliyor', 'girsin', 'girmesin') then raise exception 'Geçersiz seçim'; end if;
  update public.avatar_katalogu
     set onay = p_onay, onay_zamani = case when p_onay = 'bekliyor' then null else now() end
   where anahtar = p_anahtar;
  if not found then raise exception 'Böyle bir avatar yok'; end if;
  select count(*) into v_sayi from public.avatar_katalogu where onay = 'girsin';
  return jsonb_build_object('anahtar', p_anahtar, 'onay', p_onay, 'girsin_sayisi', v_sayi);
end;
$$;
revoke execute on function public.avatar_onay_kaydet(text, text) from public, anon;
grant execute on function public.avatar_onay_kaydet(text, text) to authenticated;

-- ---------- 7. avatar_onayla: katalog kuralı ----------
-- Mevcut 31 profesyonel avatar ve https fotoğrafları AYNEN. Katalog avatarı:
-- sahip her zaman; normal oyuncu yalnız açıksa ve (günlükse ya da satın aldıysa).
create or replace function public.avatar_onayla(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_k public.avatar_katalogu%rowtype;
begin
  perform public.hiz_siniri('avatar_onayla', 10, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  v_url := nullif(btrim(coalesce(p_url, '')), '');

  if v_url is null then
    update public.profiles set avatar_url = null, avatar_onayli = false where id = auth.uid();
    return;
  end if;

  if length(v_url) > 500 then raise exception 'Avatar adresi çok uzun'; end if;
  if v_url !~ '^(/[A-Za-z0-9._/-]+|https://[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]+)$' then
    raise exception 'Geçersiz avatar adresi';
  end if;

  if left(v_url, 1) = '/' then
    select * into v_k from public.avatar_katalogu k where k.url = v_url;
    if found then
      if not public.sahip_mi() then
        if not public.avatar_acik_mi(v_k.anahtar) then
          raise exception 'Bu avatar henüz kullanılamıyor';
        end if;
        if v_k.tur = 'kostumlu' and not exists (
             select 1 from public.oyuncu_avatarlari o
              where o.user_id = auth.uid() and o.avatar = v_k.anahtar) then
          raise exception 'Bu avatar sende yok';
        end if;
      end if;
    elsif v_url not in (
      '/avatars/pro/kedi-k01.svg', '/avatars/pro/kopek-k02.svg',
      '/avatars/pro/baykus-k03.svg', '/avatars/pro/tilki-k04.svg',
      '/avatars/pro/panda-k05.svg', '/avatars/pro/penguen-k06.svg',
      '/avatars/pro/kurbaga-k07.svg', '/avatars/pro/ayi-k08.svg',
      '/avatars/pro/maymun-k09.svg', '/avatars/pro/dinozor-k10.svg',
      '/avatars/pro/ejderha-k11.svg', '/avatars/pro/kopekbaligi-k12.svg',
      '/avatars/pro/ahtapot-k13.svg', '/avatars/pro/ari-k14.svg',
      '/avatars/pro/robot-k15.svg', '/avatars/pro/uzayli-k16.svg',
      '/avatars/pro/astronot-k17.svg', '/avatars/pro/ninja-k18.svg',
      '/avatars/pro/korsan-k19.svg', '/avatars/pro/sovalye-k20.svg',
      '/avatars/pro/buyucu-k21.svg', '/avatars/pro/dedektif-k22.svg',
      '/avatars/pro/asci-k23.svg', '/avatars/pro/profesor-k24.svg',
      '/avatars/pro/viking-k25.svg', '/avatars/pro/hayalet-k26.svg',
      '/avatars/pro/zombi-k27.svg', '/avatars/pro/mumya-k28.svg',
      '/avatars/pro/kahraman-k29.svg', '/avatars/pro/palyaco-k30.svg',
      '/avatars/pro/kral-k31.svg'
    ) then
      raise exception 'Bu hazır avatar artık kullanılamıyor';
    end if;
  end if;

  update public.profiles set avatar_url = v_url, avatar_onayli = true where id = auth.uid();
end;
$$;

revoke execute on function public.avatar_onayla(text) from public, anon;
grant execute on function public.avatar_onayla(text) to authenticated;
