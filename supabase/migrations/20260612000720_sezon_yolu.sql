-- 720 — Sezon Yolu (Battle Pass) sunucusu. Ida onaylı kararlar (30 Eyl 2026):
--  * 28 günlük sezon; bitiş 00:00 TSİ; biten sezonun yerine yenisi kendiliğinden açılır (pg_cron, idempotent).
--    İlk gerçek sezon `sezon_yolu_acik` bayrağı açıldığı an başlar. Bayrak kapalıyken yalnız SAHİP için bir
--    "test sezonu" açılır (gerçek veriyle denemek için; başkası puan kazanmaz, başkası görmez).
--  * Sezon Puanı (SP): coin/elmas değil, ayrı sayaç; herkes toplar. Kaynaklar: maç (Klasik/Saf Bilgi/Antrenman,
--    Düello, Turnuva) + günlük görev + BP günlük bonus görevi. Tek giriş `sezon_puani_ekle` (idempotent).
--  * 28 seviye × 2 kol (ücretsiz / ücretli) = 56 yuva (`bp_seviye_odulleri`, 721). Ödül "Al" ile, bir kez.
--  * Battle Pass yalnız ELMASLA (bp_fiyat_elmas), tek atomik RPC; o ana kadar hak edilen ücretli ödüller geriye dönük.
--  * BP sahibi: ismi altın (oyuncu_kartlari.isim_efekti = 'isim_altin'), çerçevesine altın halka (sezon_bp),
--    SP ×bp_sp_carpan, günlük bonus görev, 28/28'e sezona özel unvan. Sezon kapanınca hepsi kapanır; kalıcı ödüller kalır.
--  * Pay-to-win yok: BP maç kurallarına, soru seçimine, süreye, lige, eşleşmeye DOKUNMAZ.
-- Bütün sayılar oyun_ayarlari'nda. Tablolar RLS açık + politika yok (yalnız RPC); RPC'ler security definer, yalnız authenticated.

-- ---------------------------------------------------------------- ayarlar
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('sezon_yolu_acik',            'false', 'Sezon Yolu herkese açık mı (açıldığı an 1. sezon başlar). Kapalıyken yalnız sahip test sezonunda dener.'),
  ('sezon_gun',                  '28',    'Sezon süresi (gün); bitiş 00:00 TSİ'),
  ('sezon_seviye_sayisi',        '28',    'Sezon Yolu seviye sayısı'),
  ('sezon_sp_esik_taban',        '100',   'Bir seviye için gereken SP (1. seviye)'),
  ('sezon_sp_esik_artis',        '0',     'Her sonraki seviyede eşiğe eklenen SP (0 = sabit eşik)'),
  ('sp_mac_oyna',                '10',    'Biten maç başına SP (terk eden almaz)'),
  ('sp_mac_galibiyet',           '10',    'Galibiyete ek SP'),
  ('sp_turnuva_katilim',         '15',    'Turnuvayı bitirene SP (kazanana ayrıca sp_mac_galibiyet)'),
  ('sp_gunluk_gorev',            '10',    'Günlük görev ödülü alınınca SP'),
  ('sp_gunluk_mac_tavan',        '150',   'Günde maçlardan kazanılabilecek en çok SP (çarpan öncesi)'),
  ('sp_acik_bot_carpani',        '0.5',   'Açık bota (Antrenman) karşı maçta SP çarpanı'),
  ('bp_fiyat_elmas',             '500',   'Battle Pass fiyatı (yalnız elmas)'),
  ('bp_sp_carpan',               '1.25',  'BP sahibinin maç ve görev SP çarpanı (yalnız ilerleme hızı)'),
  ('bp_bonus_gorev_hedef',       '2',     'BP günlük bonus görevi: bugün oynanacak maç sayısı'),
  ('sp_bp_bonus_gorev',          '20',    'BP günlük bonus görevi SP ödülü (çarpansız)')
on conflict (anahtar) do nothing;

-- coin_ekle: sezon ödülü coini günlük tavana takılmaz (tek seferlik yuva ödülü, alım tablosu tekil)
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
  if p_tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'davet', 'seviye', 'rozet', 'sezon_yolu') then
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

-- Tavan hesabına da girmez (seviye gibi)
create or replace function public.coin_gunluk_kalan(p_user uuid)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0, public.ayar_sayi('coin_gunluk_tavan', 400) - coalesce((
    select sum(h.miktar) from public.coin_hareketleri h
    where h.user_id = p_user and h.miktar > 0
      and h.tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'ekonomi_esitleme', 'seviye', 'sezon_yolu')
      and (h.olusturuldu at time zone 'Europe/Istanbul')::date
          = (now() at time zone 'Europe/Istanbul')::date
  ), 0));
$function$;

create unique index if not exists coin_hareketleri_sezon_yolu_tek
  on public.coin_hareketleri (user_id, tur, referans) where tur = 'sezon_yolu' and referans is not null;

-- ---------------------------------------------------------------- tablolar
create table if not exists public.sezonlar (
  id          bigserial primary key,
  no          int not null,                         -- oyuncuya görünen sezon numarası (test sezonunda 0)
  test        boolean not null default false,       -- bayrak kapalıyken sahibin deneme sezonu
  baslangic   timestamptz not null,
  bitis       timestamptz not null,
  kapandi_at  timestamptz,
  final_unvan text,                                  -- 28/28 BP sahiplerine verilen, bu sezona özgü unvan
  created_at  timestamptz not null default now(),
  check (bitis > baslangic)
);
create unique index if not exists sezonlar_gercek_no_tek on public.sezonlar (no) where not test;
create unique index if not exists sezonlar_tek_acik on public.sezonlar (test) where kapandi_at is null;

create table if not exists public.oyuncu_sezon_puani (
  sezon       bigint not null references public.sezonlar(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sp          int not null default 0 check (sp >= 0),
  seviye      int not null default 0,
  guncellendi timestamptz not null default now(),
  primary key (sezon, user_id)
);

create table if not exists public.sezon_puan_hareketleri (
  id         bigserial primary key,
  sezon      bigint not null references public.sezonlar(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kaynak     text not null check (kaynak in ('mac', 'duello', 'turnuva', 'gorev', 'bonus_gorev', 'sahip_test')),
  referans   text not null,
  taban      int not null,        -- çarpan öncesi (günlük maç tavanı buna bakar)
  miktar     int not null check (miktar > 0),
  created_at timestamptz not null default now(),
  unique (sezon, user_id, kaynak, referans)
);
create index if not exists sezon_puan_hareketleri_gun on public.sezon_puan_hareketleri (user_id, sezon, created_at);

create table if not exists public.oyuncu_bp_sahipligi (
  sezon       bigint not null references public.sezonlar(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  satin_alma_at timestamptz not null default now(),
  fiyat_elmas int not null,
  aktif       boolean not null default true,
  kapandi_at  timestamptz,
  primary key (sezon, user_id)
);
create index if not exists oyuncu_bp_sahipligi_aktif on public.oyuncu_bp_sahipligi (user_id) where aktif;

create table if not exists public.bp_seviye_odulleri (
  seviye      int not null check (seviye between 1 and 100),
  kol         text not null check (kol in ('ucretsiz', 'ucretli')),
  tur         text not null check (tur in ('coin', 'elmas', 'joker', 'tepki_paketi', 'unvan', 'avatar', 'cerceve')),
  veri        jsonb not null default '{}'::jsonb,   -- coin/elmas {miktar} · joker {tur, adet} · tepki_paketi {anahtar} · unvan {anahtar} · avatar {url} · cerceve {anahtar}
  placeholder boolean not null default false,       -- henüz tasarlanmamış görsel ödül: "?" + "Yakında"; gerçek ödül = bu satırı güncelle
  ad_tr       text,
  ad_en       text,
  nadirlik    text check (nadirlik is null or nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi')),
  primary key (seviye, kol)
);

create table if not exists public.oyuncu_bp_odul_alimi (
  sezon     bigint not null references public.sezonlar(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  seviye    int not null,
  kol       text not null check (kol in ('ucretsiz', 'ucretli')),
  odul      jsonb not null,                -- alındığı andaki ödül satırı (geçmiş için)
  verildi   boolean not null,              -- placeholder alındıysa false; ödül gerçek olunca tetikleyici verir
  alindi_at timestamptz not null default now(),
  primary key (sezon, user_id, seviye, kol)
);
create index if not exists oyuncu_bp_odul_alimi_bekleyen on public.oyuncu_bp_odul_alimi (seviye, kol) where not verildi;

create table if not exists public.sezon_bonus_gorev (
  sezon     bigint not null references public.sezonlar(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  tarih     date not null,
  alindi_at timestamptz not null default now(),
  primary key (user_id, tarih)
);

alter table public.sezonlar               enable row level security;
alter table public.oyuncu_sezon_puani     enable row level security;
alter table public.sezon_puan_hareketleri enable row level security;
alter table public.oyuncu_bp_sahipligi    enable row level security;
alter table public.bp_seviye_odulleri     enable row level security;
alter table public.oyuncu_bp_odul_alimi   enable row level security;
alter table public.sezon_bonus_gorev      enable row level security;
revoke all on public.sezonlar, public.oyuncu_sezon_puani, public.sezon_puan_hareketleri, public.oyuncu_bp_sahipligi,
              public.bp_seviye_odulleri, public.oyuncu_bp_odul_alimi, public.sezon_bonus_gorev from anon, authenticated;

-- ---------------------------------------------------------------- yardımcılar (iç)
create or replace function public.sezon_yolu_acik_mi()
 returns boolean language sql stable security definer set search_path to 'public'
as $$ select coalesce((select (deger)::text = 'true' from public.oyun_ayarlari where anahtar = 'sezon_yolu_acik'), false); $$;

create or replace function public.sahip_kullanici_mi(p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select deger ? p_user::text from public.oyun_ayarlari
                    where anahtar = 'sahip_kullanicilar' and jsonb_typeof(deger) = 'array'), false);
$$;

-- Bir seviyeye ulaşmak için gereken TOPLAM SP
create or replace function public.sezon_esik(p_seviye int)
 returns int language sql stable security definer set search_path to 'public'
as $$
  select case when coalesce(p_seviye, 0) <= 0 then 0 else
    (p_seviye * public.ayar_sayi('sezon_sp_esik_taban', 100)
     + public.ayar_sayi('sezon_sp_esik_artis', 0) * p_seviye * (p_seviye - 1) / 2)::int end;
$$;

create or replace function public.sezon_seviye(p_sp int)
 returns int language sql stable security definer set search_path to 'public'
as $$
  select coalesce(max(g), 0)::int
    from generate_series(1, public.ayar_sayi('sezon_seviye_sayisi', 28)::int) g
   where public.sezon_esik(g) <= coalesce(p_sp, 0);
$$;

-- Oyuncunun puan kazandığı açık sezon: bayrak açıkken gerçek sezon; kapalıyken yalnız sahip için test sezonu
create or replace function public.sezon_gecerli(p_user uuid)
 returns bigint language sql stable security definer set search_path to 'public'
as $$
  select s.id from public.sezonlar s
   where s.kapandi_at is null and s.baslangic <= now() and s.bitis > now()
     and ((not s.test and public.sezon_yolu_acik_mi())
          or (s.test and not public.sezon_yolu_acik_mi() and public.sahip_kullanici_mi(p_user)))
   order by s.test limit 1;
$$;

create or replace function public.bp_aktif_mi(p_sezon bigint, p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.oyuncu_bp_sahipligi b where b.sezon = p_sezon and b.user_id = p_user and b.aktif); $$;

-- Kartlarda altın isim + altın halka: sistem açıkken herkes görür; test sezonunda yalnız kendisi
create or replace function public.sezon_bp_gorunur(p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.oyuncu_bp_sahipligi b join public.sezonlar s on s.id = b.sezon
     where b.user_id = p_user and b.aktif and s.kapandi_at is null
       and ((not s.test and public.sezon_yolu_acik_mi()) or p_user = auth.uid()));
$$;

-- Yeni sezon aç (iç). Gerçek sezonda sezona özgü final unvanı da tanımlanır.
create or replace function public.sezon_ac(p_test boolean, p_baslangic timestamptz)
 returns bigint language plpgsql security definer set search_path to 'public'
as $$
declare
  v_no int;
  v_bitis timestamptz;
  v_id bigint;
  v_unvan text;
begin
  v_bitis := (((p_baslangic at time zone 'Europe/Istanbul')::date + public.ayar_sayi('sezon_gun', 28)::int)::timestamp
              at time zone 'Europe/Istanbul');
  if p_test then v_no := 0;
  else v_no := coalesce((select max(no) from public.sezonlar where not test), 0) + 1; end if;
  insert into public.sezonlar (no, test, baslangic, bitis) values (v_no, p_test, p_baslangic, v_bitis)
  returning id into v_id;
  v_unvan := case when p_test then 'sezon_test_' || v_id || '_final' else 'sezon_' || v_no || '_final' end;
  insert into public.unvan_tanimlari (anahtar, tur, kural, sira, aktif, ad_tr, ad_en, aciklama_tr, aciklama_en, nadirlik)
  values (v_unvan, 'sezon', 'olay', 900 + v_no, not p_test,
          'Sezon ' || v_no || ' Ustası', 'Season ' || v_no || ' Master',
          'Sezon ' || v_no || ' Yolu''nu Battle Pass''le 28/28 bitirdi. Bir daha verilmez.',
          'Finished the Season ' || v_no || ' Path 28/28 with the Battle Pass. Never awarded again.',
          'efsanevi')
  on conflict (anahtar) do nothing;
  update public.sezonlar set final_unvan = v_unvan where id = v_id;
  return v_id;
end $$;

-- Final unvanı (28/28 + BP) — idempotent
create or replace function public.sezon_final_kontrol(p_sezon bigint, p_user uuid)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare v_unvan text; v_n int;
begin
  select final_unvan into v_unvan from public.sezonlar where id = p_sezon;
  if v_unvan is null or not public.bp_aktif_mi(p_sezon, p_user) then return false; end if;
  if coalesce((select seviye from public.oyuncu_sezon_puani where sezon = p_sezon and user_id = p_user), 0)
     < public.ayar_sayi('sezon_seviye_sayisi', 28) then return false; end if;
  insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, v_unvan) on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- TEK SP giriş noktası (iç). İdempotent: (sezon, oyuncu, kaynak, referans) bir kez. Döner: yeni SP (verilmediyse null).
create or replace function public.sezon_puani_ekle(p_user uuid, p_kaynak text, p_referans text, p_miktar int)
 returns int language plpgsql security definer set search_path to 'public'
as $$
declare
  v_sezon bigint;
  v_taban int := coalesce(p_miktar, 0);
  v_miktar int;
  v_kullanilan int;
  v_id bigint;
  v_sp int;
  v_seviye int;
begin
  if p_user is null or v_taban <= 0 or p_referans is null then return null; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return null; end if;
  v_sezon := public.sezon_gecerli(p_user);
  if v_sezon is null then return null; end if;

  -- Oyuncu satırını kilitle: günlük tavan ve seviye hesabı yarışsız
  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, p_user) on conflict do nothing;
  perform 1 from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = p_user for update;

  if p_kaynak in ('mac', 'duello') then
    select coalesce(sum(h.taban), 0) into v_kullanilan from public.sezon_puan_hareketleri h
     where h.user_id = p_user and h.sezon = v_sezon and h.kaynak in ('mac', 'duello')
       and (h.created_at at time zone 'Europe/Istanbul')::date = (now() at time zone 'Europe/Istanbul')::date;
    v_taban := least(v_taban, greatest(0, public.ayar_sayi('sp_gunluk_mac_tavan', 150)::int - v_kullanilan));
    if v_taban <= 0 then return null; end if;
  end if;

  v_miktar := v_taban;
  if p_kaynak in ('mac', 'duello', 'turnuva', 'gorev') and public.bp_aktif_mi(v_sezon, p_user) then
    v_miktar := round(v_taban * public.ayar_ondalik('bp_sp_carpan', 1.25))::int;
  end if;

  insert into public.sezon_puan_hareketleri (sezon, user_id, kaynak, referans, taban, miktar)
  values (v_sezon, p_user, p_kaynak, p_referans, v_taban, v_miktar)
  on conflict do nothing returning id into v_id;
  if v_id is null then return null; end if;   -- bu kaynak zaten puan verdi

  update public.oyuncu_sezon_puani set sp = sp + v_miktar, guncellendi = now()
   where sezon = v_sezon and user_id = p_user returning sp into v_sp;
  v_seviye := public.sezon_seviye(v_sp);
  update public.oyuncu_sezon_puani set seviye = v_seviye where sezon = v_sezon and user_id = p_user and seviye <> v_seviye;
  perform public.sezon_final_kontrol(v_sezon, p_user);
  return v_sp;
end $$;

-- Ödülü envantere işle (iç; alım satırı zaten yazılmış olmalı)
create or replace function public.bp_odul_uygula(p_user uuid, p_sezon bigint, p_seviye int, p_kol text, p_odul jsonb)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
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
    when 'avatar' then insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (p_user, v_veri->>'url', 'etkinlik') on conflict do nothing;
    when 'cerceve' then perform public.cerceve_ver(p_user, v_veri->>'anahtar', 'etkinlik');
    else raise exception 'Bilinmeyen ödül türü: %', v_tur;
  end case;
  return true;
end $$;

-- Tek yuvayı ver (iç). Hak kontrolü çağıranda. Döner: ödül jsonb (zaten alınmışsa null).
create or replace function public.bp_odul_ver_ic(p_user uuid, p_sezon bigint, p_seviye int, p_kol text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_odul jsonb;
  v_n int;
  v_verildi boolean;
begin
  select to_jsonb(o) into v_odul from public.bp_seviye_odulleri o where o.seviye = p_seviye and o.kol = p_kol;
  if v_odul is null then return null; end if;
  v_verildi := not coalesce((v_odul->>'placeholder')::boolean, false);
  insert into public.oyuncu_bp_odul_alimi (sezon, user_id, seviye, kol, odul, verildi)
  values (p_sezon, p_user, p_seviye, p_kol, v_odul, v_verildi)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return null; end if;
  perform public.bp_odul_uygula(p_user, p_sezon, p_seviye, p_kol, v_odul);
  return v_odul;
end $$;

-- Placeholder yuva gerçek ödüle çevrilince (tek satır güncellemesi) daha önce alanlara verilir
create or replace function public.trg_bp_odul_gercek()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare r record;
begin
  if old.placeholder and not new.placeholder then
    for r in select * from public.oyuncu_bp_odul_alimi a
              where a.seviye = new.seviye and a.kol = new.kol and not a.verildi for update loop
      perform public.bp_odul_uygula(r.user_id, r.sezon, r.seviye, r.kol, to_jsonb(new));
      update public.oyuncu_bp_odul_alimi set verildi = true, odul = to_jsonb(new)
       where sezon = r.sezon and user_id = r.user_id and seviye = r.seviye and kol = r.kol;
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists trg_bp_odul_gercek on public.bp_seviye_odulleri;
create trigger trg_bp_odul_gercek after update on public.bp_seviye_odulleri
  for each row execute function public.trg_bp_odul_gercek();

-- Sezon kapanışı (iç, idempotent): hak edilip alınmamış ödüller verilir, 28/28 unvanı, BP (altın isim + halka) kapanır
create or replace function public.sezon_kapat(p_sezon bigint)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare
  v_s public.sezonlar;
  r record;
  g int;
begin
  select * into v_s from public.sezonlar where id = p_sezon for update;
  if v_s.id is null or v_s.kapandi_at is not null then return false; end if;
  for r in select p.user_id, p.seviye, public.bp_aktif_mi(p_sezon, p.user_id) as bp
             from public.oyuncu_sezon_puani p where p.sezon = p_sezon and p.seviye > 0 loop
    for g in 1..r.seviye loop
      perform public.bp_odul_ver_ic(r.user_id, p_sezon, g, 'ucretsiz');
      if r.bp then perform public.bp_odul_ver_ic(r.user_id, p_sezon, g, 'ucretli'); end if;
    end loop;
    if r.bp then perform public.sezon_final_kontrol(p_sezon, r.user_id); end if;
  end loop;
  update public.oyuncu_bp_sahipligi set aktif = false, kapandi_at = now() where sezon = p_sezon and aktif;
  update public.sezonlar set kapandi_at = now() where id = p_sezon;
  return true;
end $$;

-- Dakikalık/5 dk'lık zamanlayıcı (pg_cron). İdempotent; eşzamanlı çağrıda kilitle sıralanır.
create or replace function public.sezon_tik()
 returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  r record;
  v_son timestamptz;
  v_bas timestamptz;
begin
  perform pg_advisory_xact_lock(hashtext('quiztactics:sezon_tik'));
  for r in select id from public.sezonlar where kapandi_at is null and bitis <= now() order by bitis loop
    perform public.sezon_kapat(r.id);
  end loop;
  if public.sezon_yolu_acik_mi() then
    for r in select id from public.sezonlar where kapandi_at is null and test loop
      perform public.sezon_kapat(r.id);                       -- gerçek sistem açılınca test sezonu biter
    end loop;
    if not exists (select 1 from public.sezonlar where kapandi_at is null and not test) then
      select max(bitis) into v_son from public.sezonlar where not test;
      v_bas := coalesce(v_son, now());
      -- kesinti uzun sürdüyse (bitiş + 1 sezon geçmişse) bugünden başlat
      if v_bas + make_interval(days => public.ayar_sayi('sezon_gun', 28)::int) <= now() then v_bas := now(); end if;
      perform public.sezon_ac(false, v_bas);
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------- SP kaynakları (tetikleyiciler; hata maçı ASLA bozmaz)
create or replace function public.sezon_mac_sp(p_kaynak text, p_ref text, p_oyuncu uuid, p_rakip uuid, p_kazanan uuid, p_carpan numeric)
 returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  v_taban numeric;
  v_rakip_acik boolean;
begin
  if p_oyuncu is null or coalesce(p_carpan, 1) <= 0 then return; end if;
  v_taban := public.ayar_sayi('sp_mac_oyna', 10) + case when p_kazanan = p_oyuncu then public.ayar_sayi('sp_mac_galibiyet', 10) else 0 end;
  select coalesce(p.acik_bot, false) or public.acik_bot_mu(p.is_bot, p.bot_turu) into v_rakip_acik
    from public.profiles p where p.id = p_rakip;
  if coalesce(v_rakip_acik, false) then v_taban := v_taban * public.ayar_ondalik('sp_acik_bot_carpani', 0.5); end if;
  perform public.sezon_puani_ekle(p_oyuncu, p_kaynak, p_ref, round(v_taban * coalesce(p_carpan, 1))::int);
end $$;

create or replace function public.trg_sezon_mac()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.durum = 'bitti' and old.durum is distinct from 'bitti' then
    begin
      if new.terk_eden is distinct from new.oyuncu1 then
        perform public.sezon_mac_sp('mac', 'mac:' || new.id, new.oyuncu1, new.oyuncu2, new.kazanan, new.odul_carpan);
      end if;
      if new.oyuncu2 is not null and new.terk_eden is distinct from new.oyuncu2 then
        perform public.sezon_mac_sp('mac', 'mac:' || new.id, new.oyuncu2, new.oyuncu1, new.kazanan, new.odul_carpan);
      end if;
    exception when others then
      raise warning 'sezon_mac_sp: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

create or replace function public.trg_sezon_duello()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.durum = 'bitti' and old.durum is distinct from 'bitti' then
    begin
      if new.terk_eden is distinct from new.oyuncu1 then
        perform public.sezon_mac_sp('duello', 'duello:' || new.id, new.oyuncu1, new.oyuncu2, new.kazanan, new.odul_carpan);
      end if;
      if new.oyuncu2 is not null and new.terk_eden is distinct from new.oyuncu2 then
        perform public.sezon_mac_sp('duello', 'duello:' || new.id, new.oyuncu2, new.oyuncu1, new.kazanan, new.odul_carpan);
      end if;
    exception when others then
      raise warning 'sezon_duello_sp: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

create or replace function public.trg_sezon_turnuva()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare r record;
begin
  if new.durum = 'bitti' then
    begin
      for r in select tp.user_id from public.tournament_players tp where tp.tournament_id = new.id and tp.terk_at is null loop
        perform public.sezon_puani_ekle(r.user_id, 'turnuva', 'turnuva:' || new.id, public.ayar_sayi('sp_turnuva_katilim', 15)::int);
      end loop;
      if new.kazanan is not null and exists (select 1 from public.tournament_players tp
                                              where tp.tournament_id = new.id and tp.user_id = new.kazanan and tp.terk_at is null) then
        perform public.sezon_puani_ekle(new.kazanan, 'turnuva', 'turnuva_kazanan:' || new.id, public.ayar_sayi('sp_mac_galibiyet', 10)::int);
      end if;
    exception when others then
      raise warning 'sezon_turnuva_sp: %', sqlerrm;
    end;
  end if;
  return null;
end $$;

create or replace function public.trg_sezon_gorev()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  begin
    perform public.sezon_puani_ekle(new.user_id, 'gorev', new.tarih::text || ':' || new.quest_id, public.ayar_sayi('sp_gunluk_gorev', 10)::int);
  exception when others then
    raise warning 'sezon_gorev_sp: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists trg_sezon_mac on public.matches;
create trigger trg_sezon_mac after update of durum on public.matches
  for each row when (new.durum = 'bitti' and old.durum is distinct from 'bitti') execute function public.trg_sezon_mac();
drop trigger if exists trg_sezon_duello on public.duellolar;
create trigger trg_sezon_duello after update of durum on public.duellolar
  for each row when (new.durum = 'bitti' and old.durum is distinct from 'bitti') execute function public.trg_sezon_duello();
drop trigger if exists trg_sezon_turnuva on public.tournaments;
create trigger trg_sezon_turnuva after update of durum, kazanan on public.tournaments
  for each row when (new.durum = 'bitti' and (old.durum is distinct from 'bitti' or old.kazanan is distinct from new.kazanan))
  execute function public.trg_sezon_turnuva();
drop trigger if exists trg_sezon_gorev on public.quest_progress;
create trigger trg_sezon_gorev after insert on public.quest_progress
  for each row execute function public.trg_sezon_gorev();

-- ---------------------------------------------------------------- istemci RPC'leri
-- Oyuncunun görebildiği sezon: bayrak açıkken gerçek; kapalıyken sahip için test sezonu (yoksa açılır)
create or replace function public.sezon_gorunen_ic()
 returns bigint language plpgsql security definer set search_path to 'public'
as $$
declare v_id bigint;
begin
  if auth.uid() is null then return null; end if;
  v_id := public.sezon_gecerli(auth.uid());
  if v_id is null and public.sezon_yolu_acik_mi() then
    perform public.sezon_tik();                      -- bitiş anı ile cron arasındaki boşlukta da yeni sezon hazır
    v_id := public.sezon_gecerli(auth.uid());
  elsif v_id is null and public.sahip_kullanici_mi(auth.uid()) then
    perform pg_advisory_xact_lock(hashtext('quiztactics:sezon_tik'));
    v_id := public.sezon_gecerli(auth.uid());
    if v_id is null then
      update public.sezonlar set kapandi_at = now() where test and kapandi_at is null;   -- süresi bitmiş eski test
      v_id := public.sezon_ac(true, now());
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.sezon_yolu_durumum()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_s public.sezonlar;
  v_sp int := 0;
  v_seviye int := 0;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_bp public.oyuncu_bp_sahipligi;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_oduller jsonb;
  v_esikler jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then
    return jsonb_build_object('gorunur', false, 'acik', public.sezon_yolu_acik_mi());
  end if;
  select * into v_s from public.sezonlar where id = v_sezon;
  select sp, seviye into v_sp, v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me;
  v_sp := coalesce(v_sp, 0); v_seviye := coalesce(v_seviye, 0);
  select * into v_bp from public.oyuncu_bp_sahipligi where sezon = v_sezon and user_id = v_me;

  select jsonb_agg(public.sezon_esik(g) order by g) into v_esikler from generate_series(1, v_max) g;
  select coalesce(jsonb_agg(jsonb_build_object(
           'seviye', o.seviye, 'kol', o.kol, 'tur', o.tur, 'veri', o.veri, 'placeholder', o.placeholder,
           'ad_tr', o.ad_tr, 'ad_en', o.ad_en, 'nadirlik', o.nadirlik,
           'alindi', a.seviye is not null,
           'alinabilir', a.seviye is null and o.seviye <= v_seviye
                         and (o.kol = 'ucretsiz' or coalesce(v_bp.aktif, false)))
           order by o.seviye, o.kol), '[]'::jsonb)
    into v_oduller
    from public.bp_seviye_odulleri o
    left join public.oyuncu_bp_odul_alimi a
      on a.sezon = v_sezon and a.user_id = v_me and a.seviye = o.seviye and a.kol = o.kol
   where o.seviye <= v_max;

  return jsonb_build_object(
    'gorunur', true,
    'acik', public.sezon_yolu_acik_mi(),
    'test', v_s.test,
    'sahip', public.sahip_kullanici_mi(v_me),
    'sezon', jsonb_build_object('id', v_s.id, 'no', v_s.no, 'baslangic', v_s.baslangic, 'bitis', v_s.bitis,
                                'kalan_gun', greatest(0, ceil(extract(epoch from (v_s.bitis - now())) / 86400.0))::int),
    'sp', v_sp, 'seviye', v_seviye, 'seviye_sayisi', v_max,
    'esikler', v_esikler,
    'sonraki_esik', case when v_seviye >= v_max then null else public.sezon_esik(v_seviye + 1) end,
    'onceki_esik', public.sezon_esik(v_seviye),
    'bp', jsonb_build_object('aktif', coalesce(v_bp.aktif, false), 'satin_alma_at', v_bp.satin_alma_at,
                             'fiyat', public.ayar_sayi('bp_fiyat_elmas', 500),
                             'sp_carpan', public.ayar_ondalik('bp_sp_carpan', 1.25)),
    'elmas', (select elmas from public.profiles where id = v_me),
    'oduller', v_oduller,
    'bonus_gorev', jsonb_build_object(
      'hedef', public.ayar_sayi('bp_bonus_gorev_hedef', 2),
      'ilerleme', least(public.gorev_sayaci('mac_oyna_3', v_me, v_bugun), public.ayar_sayi('bp_bonus_gorev_hedef', 2)),
      'sp', public.ayar_sayi('sp_bp_bonus_gorev', 20),
      'alindi', exists (select 1 from public.sezon_bonus_gorev b where b.user_id = v_me and b.tarih = v_bugun)),
    'final_unvan', (select jsonb_build_object('anahtar', t.anahtar, 'ad_tr', t.ad_tr, 'ad_en', t.ad_en,
                                              'kazanildi', exists (select 1 from public.oyuncu_unvanlari u where u.user_id = v_me and u.unvan = t.anahtar))
                      from public.unvan_tanimlari t where t.anahtar = v_s.final_unvan),
    'bugun_mac_sp', coalesce((select sum(h.taban) from public.sezon_puan_hareketleri h
                               where h.user_id = v_me and h.sezon = v_sezon and h.kaynak in ('mac', 'duello')
                                 and (h.created_at at time zone 'Europe/Istanbul')::date = v_bugun), 0),
    'gunluk_mac_tavan', public.ayar_sayi('sp_gunluk_mac_tavan', 150)
  );
end $$;

-- Üst çubuk rozeti için hafif özet (test sezonunu AÇMAZ)
create or replace function public.sezon_ozetim()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_sp int := 0; v_seviye int := 0;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_bp boolean;
begin
  if v_me is null then return jsonb_build_object('gorunur', false); end if;
  v_sezon := public.sezon_gecerli(v_me);
  if v_sezon is null then
    -- sahip test sezonu henüz yoksa da rozet görünsün (sayfa açılınca sezon kurulur)
    return jsonb_build_object('gorunur', public.sezon_yolu_acik_mi() or public.sahip_kullanici_mi(v_me),
                              'seviye', 0, 'sp', 0, 'onceki_esik', 0, 'sonraki_esik', public.sezon_esik(1),
                              'bp', false, 'alinabilir', 0);
  end if;
  select sp, seviye into v_sp, v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me;
  v_sp := coalesce(v_sp, 0); v_seviye := coalesce(v_seviye, 0);
  v_bp := public.bp_aktif_mi(v_sezon, v_me);
  return jsonb_build_object(
    'gorunur', true, 'sezon', v_sezon, 'seviye', v_seviye, 'seviye_sayisi', v_max, 'sp', v_sp,
    'onceki_esik', public.sezon_esik(v_seviye),
    'sonraki_esik', case when v_seviye >= v_max then null else public.sezon_esik(v_seviye + 1) end,
    'bp', v_bp,
    'alinabilir', (select count(*) from public.bp_seviye_odulleri o
                    where o.seviye <= v_seviye and (o.kol = 'ucretsiz' or v_bp)
                      and not exists (select 1 from public.oyuncu_bp_odul_alimi a
                                       where a.sezon = v_sezon and a.user_id = v_me and a.seviye = o.seviye and a.kol = o.kol)));
end $$;

-- Battle Pass satın al: tek atomik işlem. Elmas düşer, deftere yazılır, sahiplik yazılır, hak edilen ücretli ödüller geriye dönük verilir.
create or replace function public.bp_satin_al()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_fiyat int := public.ayar_sayi('bp_fiyat_elmas', 500)::int;
  v_bakiye int;
  v_seviye int;
  v_verilen jsonb := '[]'::jsonb;
  v_odul jsonb;
  g int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('bp_satin_al', 10, interval '60 seconds');
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then raise exception 'Sezon Yolu şu an kapalı'; end if;
  if v_fiyat <= 0 then raise exception 'Geçersiz fiyat'; end if;

  -- Oyuncu başına sıralama: aynı anda iki satın alma burada bekler
  select elmas into v_bakiye from public.profiles where id = v_me for update;
  if v_bakiye is null then raise exception 'Profil bulunamadı'; end if;
  if exists (select 1 from public.oyuncu_bp_sahipligi where sezon = v_sezon and user_id = v_me) then
    raise exception 'Battle Pass zaten sende';
  end if;
  if v_bakiye < v_fiyat then raise exception 'Yetersiz elmas'; end if;

  v_bakiye := public.elmas_harca(v_fiyat, 'battle_pass', 'sezon:' || v_sezon);
  insert into public.oyuncu_bp_sahipligi (sezon, user_id, fiyat_elmas) values (v_sezon, v_me, v_fiyat);

  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, v_me) on conflict do nothing;
  select seviye into v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me for update;
  for g in 1..coalesce(v_seviye, 0) loop
    v_odul := public.bp_odul_ver_ic(v_me, v_sezon, g, 'ucretli');
    if v_odul is not null then v_verilen := v_verilen || v_odul; end if;
  end loop;
  perform public.sezon_final_kontrol(v_sezon, v_me);

  return jsonb_build_object('ok', true, 'elmas', v_bakiye, 'verilen', v_verilen,
                            'elmas_bakiye', (select elmas from public.profiles where id = v_me));
end $$;

-- Tek yuva al
create or replace function public.bp_odul_al(p_seviye int, p_kol text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_seviye int;
  v_odul jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('bp_odul_al', 90, interval '60 seconds');
  if p_kol not in ('ucretsiz', 'ucretli') then raise exception 'Geçersiz kol'; end if;
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then raise exception 'Sezon Yolu şu an kapalı'; end if;
  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, v_me) on conflict do nothing;
  select seviye into v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me for update;
  if coalesce(p_seviye, 0) < 1 or p_seviye > coalesce(v_seviye, 0) then raise exception 'Bu seviyeye henüz ulaşmadın'; end if;
  if p_kol = 'ucretli' and not public.bp_aktif_mi(v_sezon, v_me) then raise exception 'Bu ödül Battle Pass''li'; end if;
  v_odul := public.bp_odul_ver_ic(v_me, v_sezon, p_seviye, p_kol);
  if v_odul is null then raise exception 'Bu ödülü zaten aldın'; end if;
  return jsonb_build_object('ok', true, 'odul', v_odul);
end $$;

-- Hak edilen bütün yuvaları al
create or replace function public.bp_toplu_al()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_seviye int;
  v_bp boolean;
  v_odul jsonb;
  v_verilen jsonb := '[]'::jsonb;
  g int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('bp_toplu_al', 20, interval '60 seconds');
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then raise exception 'Sezon Yolu şu an kapalı'; end if;
  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, v_me) on conflict do nothing;
  select seviye into v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me for update;
  v_bp := public.bp_aktif_mi(v_sezon, v_me);
  for g in 1..coalesce(v_seviye, 0) loop
    v_odul := public.bp_odul_ver_ic(v_me, v_sezon, g, 'ucretsiz');
    if v_odul is not null then v_verilen := v_verilen || v_odul; end if;
    if v_bp then
      v_odul := public.bp_odul_ver_ic(v_me, v_sezon, g, 'ucretli');
      if v_odul is not null then v_verilen := v_verilen || v_odul; end if;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'verilen', v_verilen);
end $$;

-- BP günlük bonus görevi (yalnız BP sahipleri)
create or replace function public.bp_bonus_gorev_al()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_n int;
  v_sp int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('bp_bonus_gorev_al', 20, interval '60 seconds');
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then raise exception 'Sezon Yolu şu an kapalı'; end if;
  if not public.bp_aktif_mi(v_sezon, v_me) then raise exception 'Bu görev Battle Pass''li'; end if;
  if public.gorev_sayaci('mac_oyna_3', v_me, v_bugun) < public.ayar_sayi('bp_bonus_gorev_hedef', 2) then
    raise exception 'Görev henüz tamamlanmadı';
  end if;
  insert into public.sezon_bonus_gorev (sezon, user_id, tarih) values (v_sezon, v_me, v_bugun) on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Bugünkü bonus görevi zaten aldın'; end if;
  v_sp := public.sezon_puani_ekle(v_me, 'bonus_gorev', v_bugun::text, public.ayar_sayi('sp_bp_bonus_gorev', 20)::int);
  return jsonb_build_object('ok', true, 'sp', v_sp);
end $$;

-- Sahip test araçları (yalnız bayrak kapalıyken, yalnız test sezonunda)
create or replace function public.sezon_sahip_sp_ekle(p_miktar int)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_sezon bigint;
begin
  if not public.sahip_mi() then raise exception 'Yalnız sahip'; end if;
  if public.sezon_yolu_acik_mi() then raise exception 'Sistem açıkken test puanı verilmez'; end if;
  if coalesce(p_miktar, 0) not between 1 and 5000 then raise exception 'Geçersiz miktar'; end if;
  v_sezon := public.sezon_gorunen_ic();
  perform public.sezon_puani_ekle(auth.uid(), 'sahip_test', 'test:' || clock_timestamp()::text, p_miktar);
  return public.sezon_ozetim();
end $$;

create or replace function public.sezon_sahip_test_sifirla()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_fiyat int;
begin
  if not public.sahip_mi() then raise exception 'Yalnız sahip'; end if;
  if public.sezon_yolu_acik_mi() then raise exception 'Sistem açıkken test sıfırlanmaz'; end if;
  select id into v_sezon from public.sezonlar where test and kapandi_at is null;
  if v_sezon is null then return jsonb_build_object('ok', true); end if;
  select fiyat_elmas into v_fiyat from public.oyuncu_bp_sahipligi where sezon = v_sezon and user_id = v_me;
  if v_fiyat is not null then
    perform public.elmas_ekle(v_me, v_fiyat, 'battle_pass_test_iade', 'sezon:' || v_sezon || ':' || clock_timestamp()::text);
  end if;
  delete from public.oyuncu_bp_sahipligi   where sezon = v_sezon and user_id = v_me;
  delete from public.oyuncu_bp_odul_alimi  where sezon = v_sezon and user_id = v_me;
  delete from public.sezon_puan_hareketleri where sezon = v_sezon and user_id = v_me;
  delete from public.sezon_bonus_gorev     where sezon = v_sezon and user_id = v_me;
  delete from public.oyuncu_sezon_puani    where sezon = v_sezon and user_id = v_me;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- oyuncu_kartlari: BP altın isim + sezon_bp (halka)
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
 returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text, premium_cerceve text, premium_aura text, sehir_sampiyonu jsonb, unvan jsonb, koleksiyon_puani integer, sezon_bp boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.id, p.gorunen_ad, p.gorunen_avatar, coalesce(p.level, 1), coalesce(p.lig, 'bronz'),
         case when c.aktif then p.takili_cerceve end, case when c.aktif then c.nadirlik end,
         coalesce((
           select jsonb_agg(jsonb_build_object('anahtar', t.anahtar, 'grup', t.grup, 'kademe', t.kademe, 'ikon', t.ikon)
                            order by v.ord)
             from unnest(p.vitrin_rozetleri) with ordinality as v(anahtar, ord)
             join public.rozet_tanimlari t on t.anahtar = v.anahtar
             join public.oyuncu_rozetleri r on r.user_id = p.id and r.rozet = v.anahtar
         ), '[]'::jsonb),
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'aura')
              when public.aura_aktif_mi(p.takili_aura) then p.takili_aura end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'vs_karti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_vs_karti and k.aktif and k.onay = 'girsin') end,
         -- 720: aktif Battle Pass sahibinin ismi altın ("Işık Şeritli Altın"); sezon/BP kapanınca takılı efekte döner
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
              when bp.var then 'isim_altin'
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_isim_efekti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'zafer_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_zafer_efekti and k.aktif and k.onay = 'girsin') end,
         -- 560: premium — gizli botta her zaman null; insanda yalnız aktif ('girsin') kalem
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_cerceve and k.tur = 'premium_cerceve'
                       and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_aura and k.tur = 'premium_aura'
                       and k.aktif and k.onay = 'girsin') end,
         -- 641: geçen haftanın şehir şampiyonu ise bu hafta boyunca unvan (kaynak lig_arsiv)
         case when ar.sehir_s then jsonb_build_object('sehir', ar.sehir, 'ulke', ar.ulke, 'hafta', ar.hafta) end,
         -- 643 + 647: görünen unvan — aktif dünya > ülke > şehir şampiyonluğu önce; yoksa takılı unvan (kazanılmışsa);
         --      gizli bot kazandığı unvanlardan kimliğinden sabit birini (ya da hiçbirini) taşır.
         coalesce(
           case when ar.dunya_s then jsonb_build_object('tur', 'dunya', 'tr', 'Dünya Şampiyonu', 'en', 'World Champion') end,
           case when ar.ulke_s then jsonb_build_object('tur', 'ulke', 'ulke', ar.ulke,
                  'ad', coalesce((select u.ad from public.ulkeler u where u.kod = ar.ulke), ar.ulke)) end,
           case when ar.sehir_s then jsonb_build_object('tur', 'sehir', 'sehir', ar.sehir, 'ulke', ar.ulke) end,
           (select jsonb_build_object('tur', t.tur, 'anahtar', t.anahtar, 'tr', t.ad_tr, 'en', t.ad_en)
              from public.unvan_tanimlari t
             where t.aktif and t.anahtar = case
                     when gb.gizli then (select l.anahtar from public.oyuncu_unvan_listesi(p.id) l
                                          where abs(hashtext(p.id::text || ':unvan')) % 3 <> 0
                                          order by md5(p.id::text || l.anahtar) limit 1)
                     else p.takili_unvan end
               and exists (select 1 from public.oyuncu_unvan_listesi(p.id) l where l.anahtar = t.anahtar)))
         -- 646: koleksiyon puanı (profiles.koleksiyon_puani önbelleği; sahiplik değişince tetikleyiciler günceller)
         ,coalesce(p.koleksiyon_puani, 0)
         -- 720: aktif Battle Pass → çerçevenin üstüne ince altın halka
         ,bp.var
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
    cross join lateral (select (not coalesce(p.is_bot, false)) and public.sezon_bp_gorunur(p.id) as var) bp
    left join lateral (select a.sehir, a.ulke, a.hafta,
                              a.sehir_sampiyonu as sehir_s, a.ulke_sampiyonu as ulke_s, a.dunya_sampiyonu as dunya_s
                         from public.lig_arsiv a
                        where a.user_id = p.id and a.hafta = public.hafta_basi() - 7) ar on true
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;

-- ---------------------------------------------------------------- yetkiler
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated, service_role;

do $$
declare f text;
begin
  -- iç fonksiyonlar: istemciye kapalı
  foreach f in array array[
    'sezon_yolu_acik_mi()', 'sahip_kullanici_mi(uuid)', 'sezon_esik(int)', 'sezon_seviye(int)', 'sezon_gecerli(uuid)',
    'bp_aktif_mi(bigint, uuid)', 'sezon_bp_gorunur(uuid)', 'sezon_ac(boolean, timestamptz)', 'sezon_final_kontrol(bigint, uuid)',
    'sezon_puani_ekle(uuid, text, text, int)', 'bp_odul_uygula(uuid, bigint, int, text, jsonb)', 'bp_odul_ver_ic(uuid, bigint, int, text)',
    'sezon_kapat(bigint)', 'sezon_tik()', 'sezon_mac_sp(text, text, uuid, uuid, uuid, numeric)', 'sezon_gorunen_ic()',
    'trg_bp_odul_gercek()', 'trg_sezon_mac()', 'trg_sezon_duello()', 'trg_sezon_turnuva()', 'trg_sezon_gorev()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  -- istemci RPC'leri: yalnız authenticated
  foreach f in array array[
    'sezon_yolu_durumum()', 'sezon_ozetim()', 'bp_satin_al()', 'bp_odul_al(int, text)', 'bp_toplu_al()',
    'bp_bonus_gorev_al()', 'sezon_sahip_sp_ekle(int)', 'sezon_sahip_test_sifirla()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- Bayrak açıldığı AN ilk sezon başlar (cron'u beklemez)
create or replace function public.trg_sezon_bayrak()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  if new.anahtar = 'sezon_yolu_acik' then perform public.sezon_tik(); end if;
  return null;
end $$;
revoke all on function public.trg_sezon_bayrak() from public, anon, authenticated;
drop trigger if exists trg_sezon_bayrak on public.oyun_ayarlari;
create trigger trg_sezon_bayrak after insert or update of deger on public.oyun_ayarlari
  for each row when (new.anahtar = 'sezon_yolu_acik') execute function public.trg_sezon_bayrak();

-- ---------------------------------------------------------------- zamanlayıcı (5 dk; bitiş 00:00 TSİ = 21:00 UTC en geç 5 dk sonra işlenir)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'bildim-sezon-tik') then perform cron.unschedule('bildim-sezon-tik'); end if;
  perform cron.schedule('bildim-sezon-tik', '*/5 * * * *', 'select public.sezon_tik()');
end $$;
