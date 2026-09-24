-- ============================================================
-- 480 · ELMAS — ikinci para birimi (Ida kararı, 24 Eyl 2026: "pay to win olmasın")
--
--   Coin : yalnız OYNAYARAK kazanılır, parayla SATILMAZ. Jokerler yalnız coin'le alınır.
--   Elmas: gerçek parayla alınır + oyunla damla damla kazanılır. YALNIZ kozmetik (aura) alır.
--
-- Bu migration:
--   1. profiles.elmas + elmas_hareketleri (defter) + elmas_ekle / elmas_harca (iç yardımcılar)
--   2. elmas_durumum() — bakiye, son hareketler, günlük elmas reklamı durumu
--   3. Elmas paketleri (eski coin paketlerinin yerine) — coin paketleri pasif (coin satın alınamaz)
--   4. Oyunla elmas: haftalık lig 1./2./3. · turnuva birincisi · her 10 level · 7 günlük seri ·
--      zor (elmas kademeli) rozetler · günde 1 elmas reklamı. Rakamlar oyun_ayarlari'nda (TEST).
--   5. Joker fiyatları (Ida onayı, test): Ek Süre 20 · Soru Değiştir 30 · Zaman Baskısı 30 ·
--      Sigorta 40 · 2X 50 · 50:50 60 · İkinci Şans 60; 10'lu paket aynı %15 indirim.
--
-- Maç bitiş fonksiyonlarına DOKUNULMAZ (başka ajanın dosyası): level/seri/rozet/turnuva elmasları
-- ayrı tetikleyicilerle verilir; hepsi referansla tekil (aynı ödül iki kez yazılmaz), bot almaz.
-- Mevcut coin bakiyeleri ve 10.000 test coin'i AYNEN kalır.
-- ============================================================

-- ---------- 1. Bakiye + defter ----------
alter table public.profiles add column if not exists elmas integer not null default 0;
do $$ begin
  alter table public.profiles add constraint profiles_elmas_negatif_degil check (elmas >= 0);
exception when duplicate_object then null; end $$;
-- Not: profiles'ta authenticated'ın SELECT/UPDATE yetkisi kolon bazlıdır; yeni kolon istemciye
-- kapalı doğar (bakiye yalnız elmas_durumum() / profilim() ile okunur, yalnız sunucu yazar).

create table if not exists public.elmas_hareketleri (
  id           bigserial primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  miktar       integer not null,
  tur          text not null,        -- lig · turnuva · level · seri · rozet · reklam · aura · satin_alma
  referans     text,
  bakiye_sonra integer,
  olusturuldu  timestamptz not null default now()
);
create index if not exists elmas_hareketleri_user_idx on public.elmas_hareketleri (user_id, olusturuldu desc);
-- Aynı ödül iki kez yazılmasın (tetikleyici/cron tekrarına karşı)
create unique index if not exists elmas_hareketleri_tek
  on public.elmas_hareketleri (user_id, tur, referans) where referans is not null and miktar > 0;
-- Satın alma jetonu hesaptan bağımsız tekil (coin defterindeki kuralın aynısı)
create unique index if not exists elmas_hareketleri_satin_alma_tek
  on public.elmas_hareketleri (referans) where tur = 'satin_alma' and referans is not null;
alter table public.elmas_hareketleri enable row level security;
revoke all on public.elmas_hareketleri from anon, authenticated;
revoke all on sequence public.elmas_hareketleri_id_seq from anon, authenticated;

-- İç yardımcı: elmas ekle. Bot almaz; aynı (tür, referans) ikinci kez yazılmaz → null döner.
create or replace function public.elmas_ekle(p_user uuid, p_miktar integer, p_tur text, p_referans text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_bakiye integer;
begin
  if p_user is null or coalesce(p_miktar, 0) <= 0 or p_tur is null then return null; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return null; end if;

  insert into public.elmas_hareketleri (user_id, miktar, tur, referans)
  values (p_user, p_miktar, p_tur, p_referans)
  on conflict do nothing
  returning id into v_id;
  if v_id is null then return null; end if;   -- bu ödül zaten verilmiş

  update public.profiles set elmas = elmas + p_miktar where id = p_user returning elmas into v_bakiye;
  if v_bakiye is null then
    delete from public.elmas_hareketleri where id = v_id;
    return null;
  end if;
  update public.elmas_hareketleri set bakiye_sonra = v_bakiye where id = v_id;
  return v_bakiye;
end;
$$;
revoke all on function public.elmas_ekle(uuid, integer, text, text) from public, anon, authenticated;

-- İç yardımcı: oturumdaki oyuncunun elmasından düş (FOR UPDATE; yetmezse 'Yetersiz elmas').
create or replace function public.elmas_harca(p_miktar integer, p_tur text, p_referans text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_bakiye integer;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if coalesce(p_miktar, 0) <= 0 then raise exception 'Geçersiz tutar'; end if;
  select elmas into v_bakiye from public.profiles where id = v_me for update;
  if v_bakiye is null then raise exception 'Profil bulunamadı'; end if;
  if v_bakiye < p_miktar then raise exception 'Yetersiz elmas'; end if;
  update public.profiles set elmas = elmas - p_miktar where id = v_me returning elmas into v_bakiye;
  insert into public.elmas_hareketleri (user_id, miktar, tur, referans, bakiye_sonra)
  values (v_me, -p_miktar, p_tur, p_referans, v_bakiye);
  return v_bakiye;
end;
$$;
revoke all on function public.elmas_harca(integer, text, text) from public, anon, authenticated;

-- ---------- 2. Ayarlar (TEST değerleri) ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_lig_1', '10', 'TEST — Haftalık lig grubunu 1. bitirene elmas (puan > 0). Bot almaz.'),
  ('elmas_lig_2', '6', 'TEST — Haftalık lig grubunu 2. bitirene elmas (puan > 0).'),
  ('elmas_lig_3', '3', 'TEST — Haftalık lig grubunu 3. bitirene elmas (puan > 0).'),
  ('elmas_turnuva_1', '10', 'TEST — Turnuva birincisine elmas.'),
  ('elmas_level_aralik', '10', 'TEST — Kaç levelde bir elmas verilir (level). 0 = kapalı.'),
  ('elmas_level', '20', 'TEST — Her elmas_level_aralik levelde verilen elmas.'),
  ('elmas_seri_gun', '7', 'TEST — Kaç günlük seri tamamlanınca elmas verilir (7, 14, 21… her katında).'),
  ('elmas_seri', '5', 'TEST — Seri her elmas_seri_gun katına ulaşınca verilen elmas.'),
  ('elmas_reklam', '2', 'TEST — Elmas reklamı başına elmas (normal reklam coin verir, ayrı).'),
  ('elmas_reklam_gunluk', '1', 'TEST — Günde kaç elmas reklamı izlenebilir.')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

-- ---------- 3. elmas_durumum() ----------
create or replace function public.elmas_durumum()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_gun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  return jsonb_build_object(
    'bakiye', coalesce((select p.elmas from public.profiles p where p.id = v_me), 0),
    'reklam', jsonb_build_object(
      'bugun', coalesce((select r.elmas_sayac from public.reklam_odulleri r where r.user_id = v_me and r.gun = v_gun), 0),
      'tavan', public.ayar_sayi('elmas_reklam_gunluk', 1),
      'odul', public.ayar_sayi('elmas_reklam', 2)),
    'hareketler', coalesce((
      select jsonb_agg(jsonb_build_object('miktar', h.miktar, 'tur', h.tur, 'referans', h.referans,
                                          'bakiye_sonra', h.bakiye_sonra, 'olusturuldu', h.olusturuldu)
                       order by h.olusturuldu desc)
        from (select * from public.elmas_hareketleri h where h.user_id = v_me
               order by h.olusturuldu desc limit 20) h), '[]'::jsonb));
end;
$$;

-- ---------- 4. Elmas paketleri (gerçek para) — coin paketlerinin yerine ----------
-- Adlar ve bonus sırası coin paketlerinden: Avuç %0 · Kese %10 · Sandık %15 · Hazine %20 · Define %30.
-- `elmas` = taban miktar (TEST: 100/220/500/1.100/2.400), `bonus` = tabanın yüzdesi, üstüne eklenir.
-- Gerçek para fiyatı veritabanında YOK (bilerek): Play Console belirler; TL fiyatları eski coin
-- paketleriyle aynı sırada kalır (Avuç … Define). SATIN ALMA ŞU AN KAPALI: Play Console'da ürünler
-- (elmas_100 … elmas_2400, tüketilebilir) sonra tanımlanacak — docs/YAYIN_ONCESI.md.
create table if not exists public.elmas_paketleri (
  urun_id text primary key,              -- Play ürün kimliği
  ad      text not null,
  elmas   integer not null check (elmas > 0),
  bonus   integer not null default 0 check (bonus >= 0),
  sira    integer not null,
  aktif   boolean not null default true
);
alter table public.elmas_paketleri enable row level security;
revoke all on public.elmas_paketleri from anon, authenticated;

insert into public.elmas_paketleri (urun_id, ad, elmas, bonus, sira) values
  ('elmas_100',  'Avuç',   100,    0, 1),   -- %0
  ('elmas_220',  'Kese',   220,   22, 2),   -- %10
  ('elmas_500',  'Sandık', 500,   75, 3),   -- %15
  ('elmas_1100', 'Hazine', 1100, 220, 4),   -- %20
  ('elmas_2400', 'Define', 2400, 720, 5)    -- %30
on conflict (urun_id) do update
  set ad = excluded.ad, elmas = excluded.elmas, bonus = excluded.bonus, sira = excluded.sira;

create or replace function public.elmas_paketleri()
returns table(urun_id text, ad text, elmas integer, bonus integer, sira integer, satista boolean)
language sql
stable
security definer
set search_path = public
as $$
  -- satista: Play'de ürün tanımlanıp satın alma açılana kadar false (oyun_ayarlari.elmas_satin_alma_acik)
  select p.urun_id, p.ad, p.elmas, p.bonus, p.sira, (public.ayar_sayi('elmas_satin_alma_acik', 0) > 0)
    from public.elmas_paketleri p
   where p.aktif and auth.uid() is not null
   order by p.sira;
$$;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_satin_alma_acik', '0', 'Elmas paketi satın alma açık mı (1/0). Play Console ürünleri (elmas_*) tanımlanınca 1 yapılır.')
on conflict (anahtar) do nothing;

-- Coin artık parayla satılmaz: bütün coin paketleri pasif (satır ve geçmiş defter durur).
-- coin_satin_alma_kaydet yalnız aktif paketi kabul ettiği için sunucu da coin satmaz.
update public.coin_paketleri set aktif = false where aktif;

-- ---------- 5. Joker fiyatları (coin, TEST — Ida onayı 24 Eyl) ----------
update public.oyun_ayarlari set deger = to_jsonb(v.fiyat),
       aciklama = 'Joker hakkı fiyatı — ' || v.ad || ', 1 hak (coin). TEST değeri (Ida, 24 Eyl 2026).'
  from (values ('coin_joker_sure', 20, 'Ek Süre'), ('coin_joker_soru_degistir', 30, 'Soru Değiştir'),
               ('coin_joker_zaman_baskisi', 30, 'Zaman Baskısı'), ('coin_joker_sigorta', 40, 'Sigorta'),
               ('coin_joker_cifte_puan', 50, '2X'), ('coin_joker_elli', 60, '50:50'),
               ('coin_joker_ikinci_sans', 60, 'İkinci Şans')) as v(anahtar, fiyat, ad)
 where oyun_ayarlari.anahtar = v.anahtar;
-- 10'lu paket: 10 × tek fiyat × 0,85 (eski %15 indirim oranı aynı)
update public.oyun_ayarlari set deger = to_jsonb(v.fiyat),
       aciklama = '10''lu joker paketi — ' || v.ad || ' × 10 hak (coin, %15 indirim). TEST değeri. Paket: joker_paketleri.' || v.urun
  from (values ('coin_joker_sure_10', 170, 'Ek Süre', 'skill_sure_10'),
               ('coin_joker_soru_degistir_10', 255, 'Soru Değiştir', 'skill_soru_degistir_10'),
               ('coin_joker_zaman_baskisi_10', 255, 'Zaman Baskısı', 'skill_zaman_baskisi_10'),
               ('coin_joker_sigorta_10', 340, 'Sigorta', 'skill_sigorta_10'),
               ('coin_joker_cifte_puan_10', 425, '2X', 'skill_cifte_puan_10'),
               ('coin_joker_elli_10', 510, '50:50', 'skill_elli_10'),
               ('coin_joker_ikinci_sans_10', 510, 'İkinci Şans', 'skill_ikinci_sans_10')) as v(anahtar, fiyat, ad, urun)
 where oyun_ayarlari.anahtar = v.anahtar;
-- Paket satırındaki yedek fiyat da aynı (fiyat_anahtari okunamazsa kullanılır)
update public.joker_paketleri p set coin_fiyat = v.fiyat
  from (values ('skill_sure_10', 170), ('skill_soru_degistir_10', 255), ('skill_zaman_baskisi_10', 255),
               ('skill_sigorta_10', 340), ('skill_cifte_puan_10', 425), ('skill_elli_10', 510),
               ('skill_ikinci_sans_10', 510)) as v(urun, fiyat)
 where p.urun_id = v.urun;

-- ---------- 6. Rozet elmasları (yalnız elmas kademe, 5–20) ----------
alter table public.rozet_tanimlari add column if not exists elmas integer not null default 0;
update public.rozet_tanimlari set elmas = case
    when anahtar in ('level_100', 'klasik_1000', 'duello_1000', 'seri_365', 'turnuva_sampiyon_25') then 20
    when anahtar = 'lig_efsane_bir' then 15
    when anahtar in ('level_75', 'lig_cikis_efsane') then 10
    when anahtar like 'ustalik\_%\_750' then 5
    else 0 end
 where kademe = 'elmas';

-- ---------- 7. Oyunla elmas — tetikleyiciler (maç bitiş fonksiyonlarına dokunmadan) ----------

-- 7a. Level: her elmas_level_aralik levelde (10, 20, 30…) — birden çok level atlanırsa her biri
create or replace function public.trg_elmas_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aralik int := public.ayar_sayi('elmas_level_aralik', 10)::int;
  v_odul int := public.ayar_sayi('elmas_level', 20)::int;
  l int;
begin
  if v_aralik <= 0 or v_odul <= 0 then return null; end if;
  for l in (coalesce(old.level, 1) + 1) .. new.level loop
    if l % v_aralik = 0 then
      perform public.elmas_ekle(new.id, v_odul, 'level', 'level:' || l);
    end if;
  end loop;
  return null;
exception when others then
  raise warning 'level elmasi verilemedi (%): %', new.id, sqlerrm;   -- level yazımını bozmaz
  return null;
end;
$$;
drop trigger if exists trg_profiles_elmas_level on public.profiles;
create trigger trg_profiles_elmas_level
  after update of level on public.profiles
  for each row when (new.level > old.level and not coalesce(new.is_bot, false))
  execute function public.trg_elmas_level();

-- 7b. Günlük seri: 7, 14, 21… güne ulaşınca
create or replace function public.trg_elmas_seri()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gun int := public.ayar_sayi('elmas_seri_gun', 7)::int;
  v_odul int := public.ayar_sayi('elmas_seri', 5)::int;
begin
  if v_gun > 0 and v_odul > 0 and new.seri_gun >= v_gun and new.seri_gun % v_gun = 0 then
    perform public.elmas_ekle(new.id, v_odul, 'seri',
      'seri:' || coalesce(new.seri_son_gun::text, (now() at time zone 'Europe/Istanbul')::date::text));
  end if;
  return null;
exception when others then
  raise warning 'seri elmasi verilemedi (%): %', new.id, sqlerrm;
  return null;
end;
$$;
drop trigger if exists trg_profiles_elmas_seri on public.profiles;
create trigger trg_profiles_elmas_seri
  after update of seri_gun on public.profiles
  for each row when (new.seri_gun > coalesce(old.seri_gun, 0) and not coalesce(new.is_bot, false))
  execute function public.trg_elmas_seri();

-- 7c. Rozet: yeni kazanılan (geriye dönük olmayan) elmas kademeli rozet
create or replace function public.trg_elmas_rozet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_elmas int;
begin
  select t.elmas into v_elmas from public.rozet_tanimlari t where t.anahtar = new.rozet;
  if coalesce(v_elmas, 0) > 0 then
    perform public.elmas_ekle(new.user_id, v_elmas, 'rozet', 'rozet:' || new.rozet);
  end if;
  return null;
exception when others then
  raise warning 'rozet elmasi verilemedi (%): %', new.user_id, sqlerrm;
  return null;
end;
$$;
drop trigger if exists trg_oyuncu_rozetleri_elmas on public.oyuncu_rozetleri;
create trigger trg_oyuncu_rozetleri_elmas
  after insert on public.oyuncu_rozetleri
  for each row when (not coalesce(new.geriye_donuk, false))
  execute function public.trg_elmas_rozet();

-- 7d. Turnuva birincisi (turnuva bitince kazanan)
create or replace function public.trg_elmas_turnuva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.elmas_ekle(new.kazanan, public.ayar_sayi('elmas_turnuva_1', 10)::int, 'turnuva',
                            'birinci:' || new.id::text);
  return null;
exception when others then
  raise warning 'turnuva elmasi verilemedi (%): %', new.id, sqlerrm;
  return null;
end;
$$;
drop trigger if exists trg_tournaments_elmas on public.tournaments;
create trigger trg_tournaments_elmas
  after update of durum, kazanan on public.tournaments
  for each row when (new.durum = 'bitti' and new.kazanan is not null
                     and (old.durum is distinct from 'bitti' or old.kazanan is distinct from new.kazanan))
  execute function public.trg_elmas_turnuva();

revoke all on function public.trg_elmas_level() from public, anon, authenticated;
revoke all on function public.trg_elmas_seri() from public, anon, authenticated;
revoke all on function public.trg_elmas_rozet() from public, anon, authenticated;
revoke all on function public.trg_elmas_turnuva() from public, anon, authenticated;

-- 7e. Haftalık lig kapanışı: grup 1./2./3.'süne elmas (coin ödülüne ek; puanı 0 olana yok, bot almaz)
create or replace function public.lig_haftayi_kapat(p_hafta date default null::date)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_hafta date := coalesce(p_hafta, public.hafta_basi());   -- 217: haftalik_kapanis kapanan haftayı açıkça verir (Pazartesi 00:00'dan sonra çalışır)
  v_yuk int := public.ayar_sayi('lig_yukselen', 5)::int;
  v_dus int := public.ayar_sayi('lig_dusen', 5)::int;
  v_pasif_esik int := public.ayar_sayi('lig_pasif_dusme_hafta', 2)::int;
  v_islenen int := 0;
  r record;
begin
  -- Aynı hafta iki kez kapanmasın (cron birden çok kez deneniyor).
  if (select deger #>> '{}' from public.oyun_ayarlari where anahtar = 'lig_son_kapanis')
     = v_hafta::text then
    return 0;
  end if;

  -- Haftalık maç sayısı: pasiflik buna bakar. 217: BÜTÜN modlar (Normal Maç · Düello · Hızlı Mod · Grup · Turnuva),
  -- hafta sınırı TSİ (eskiden yalnız matches ve UTC gece yarısı).
  update public.lig_uyelik u
     set mac_sayisi = public.lig_aktif_mac_sayisi(u.user_id, v_hafta)
   where u.hafta = v_hafta;

  for r in
    select u.user_id, u.lig, u.grup_no, u.mac_sayisi, u.pasif_hafta,
           coalesce(p.is_bot, false) as bot,
           row_number() over (partition by u.lig, u.grup_no
                              order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc) as sira,
           count(*) over (partition by u.lig, u.grup_no) as grup_boyu,
           p.puan_hafta
      from public.lig_uyelik u
      join public.profiles p on p.id = u.user_id
     where u.hafta = v_hafta
       -- Açık bot tabloda görünmediği için sıraya da girmez.
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)
  loop
    v_islenen := v_islenen + 1;

    -- Grup içi ödül (ilk üç) — botlara coin_ekle zaten vermiyor.
    if r.sira <= 3 then
      perform public.coin_ekle(
        r.user_id,
        public.ayar_sayi('lig_odul_' || r.lig || '_' || r.sira::text, 0),
        'lig', v_hafta::text || ':' || r.lig || ':' || r.grup_no::text);
      -- 480: elmas (yalnız puan kazanmış oyuncuya; bot almaz; hata kapanışı bozmaz)
      if not r.bot and coalesce(r.puan_hafta, 0) > 0 then
        begin
          perform public.elmas_ekle(r.user_id, public.ayar_sayi('elmas_lig_' || r.sira::text, 0)::int,
                                    'lig', v_hafta::text || ':' || r.lig || ':' || r.grup_no::text);
        exception when others then
          raise warning 'lig elmasi verilemedi (%): %', r.user_id, sqlerrm;
        end;
      end if;
    end if;

    if r.bot then
      continue;                      -- BOTLAR LİG DEĞİŞTİRMEZ
    end if;

    -- 333: Efsane Lig'de haftayı grubunun 1.'si bitiren (puanla) rozeti alır; hata kapanışı bozmaz.
    if r.lig = 'efsane' and r.sira = 1 and coalesce(r.puan_hafta, 0) > 0 then
      begin
        perform public.rozet_ver(r.user_id, 'lig_efsane_bir', true, false);
      exception when others then
        raise warning 'lig_efsane_bir rozeti verilemedi (%): %', r.user_id, sqlerrm;
      end;
    end if;

    -- Pasiflik takibi
    if coalesce(r.mac_sayisi, 0) = 0 then
      update public.lig_uyelik set pasif_hafta = coalesce(pasif_hafta, 0) + 1
       where user_id = r.user_id and hafta = v_hafta;
    else
      update public.lig_uyelik set pasif_hafta = 0
       where user_id = r.user_id and hafta = v_hafta;
    end if;

    if coalesce(r.mac_sayisi, 0) = 0 then
      -- 1 hafta pasif: düşmez, yerinde kalır. Üst üste 2. haftada bir lig düşer.
      if coalesce(r.pasif_hafta, 0) + 1 >= v_pasif_esik then
        update public.profiles
           set lig = public.lig_adi(greatest(1, public.lig_sirasi(r.lig) - 1))
         where id = r.user_id;
        -- 217: düşünce sayaç sıfırlanır → pasiflik sürerse her v_pasif_esik haftada bir düşer (her hafta değil)
        update public.lig_uyelik set pasif_hafta = 0 where user_id = r.user_id and hafta = v_hafta;
      end if;
      continue;
    end if;

    if r.sira <= v_yuk and coalesce(r.puan_hafta, 0) > 0 then   -- 217: 0 puanla yükselme yok (sıra ada göre kalıyordu)
      if r.lig = 'efsane' then
        perform public.award_badge(r.user_id, 'efsane_zirve');   -- üstü yok
      else
        update public.profiles
           set lig = public.lig_adi(least(5, public.lig_sirasi(r.lig) + 1))
         where id = r.user_id;
        -- 213: lig atlayınca o ligin KALICI çerçevesi (düşse de kalır)
        perform public.lig_cerceve_ver(r.user_id, public.lig_adi(least(5, public.lig_sirasi(r.lig) + 1)), 'lig_yukselme');
      end if;
    elsif r.sira > r.grup_boyu - v_dus then
      update public.profiles
         set lig = public.lig_adi(greatest(1, public.lig_sirasi(r.lig) - 1))
       where id = r.user_id;
    end if;
  end loop;

  -- Kapanış damgası (tekrar çalıştırmaya karşı)
  insert into public.oyun_ayarlari (anahtar, deger)
  values ('lig_son_kapanis', to_jsonb(v_hafta::text))
  on conflict (anahtar) do update set deger = excluded.deger;

  -- Yeni haftanın grupları: gruplar HER HAFTA yeniden karılır.
  perform public.lig_gruplarini_kur(v_hafta + 7);

  return v_islenen;
end;
$function$;

-- ---------- 8. Günde 1 "elmas reklamı" (normal reklam coin verir — ayrı hak) ----------
alter table public.reklam_odulleri add column if not exists elmas_sayac integer not null default 0;

create or replace function public.elmas_reklam_jetonu_al()
returns table(jeton uuid, min_sure_sn integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tavan int := public.ayar_sayi('elmas_reklam_gunluk', 1)::int;
  v_gun date := (now() at time zone 'Europe/Istanbul')::date;
  v_sayac int;
  v_jeton uuid;
begin
  perform public.hiz_siniri('elmas_reklam_jetonu_al', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select r.elmas_sayac into v_sayac from public.reklam_odulleri r where r.user_id = v_me and r.gun = v_gun;
  if coalesce(v_sayac, 0) >= v_tavan then
    raise exception 'Bugünkü elmas reklamı hakkın doldu (%/%)', coalesce(v_sayac, 0), v_tavan;
  end if;
  insert into public.reklam_jetonlari (user_id) values (v_me) returning reklam_jetonlari.jeton into v_jeton;
  return query select v_jeton, public.ayar_sayi('reklam_min_sure_sn', 10)::int;
end;
$$;

create or replace function public.elmas_reklam_odulu_al(p_reklam_ref text)
returns table(verilen integer, bugun integer, tavan integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tavan int := public.ayar_sayi('elmas_reklam_gunluk', 1)::int;
  v_odul int := public.ayar_sayi('elmas_reklam', 2)::int;
  v_min int := public.ayar_sayi('reklam_min_sure_sn', 10)::int;
  v_omur int := public.ayar_sayi('reklam_jeton_omur_dk', 15)::int;
  v_gun date := (now() at time zone 'Europe/Istanbul')::date;
  v_jeton uuid;
  v_kayit public.reklam_jetonlari%rowtype;
  v_sayac int;
begin
  perform public.hiz_siniri('elmas_reklam_odulu_al', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  begin
    v_jeton := nullif(btrim(coalesce(p_reklam_ref, '')), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Geçersiz reklam jetonu';
  end;
  if v_jeton is null then raise exception 'Geçersiz reklam jetonu'; end if;

  -- Jetonu kilitle: eşzamanlı iki çağrıdan yalnız biri geçer
  select * into v_kayit from public.reklam_jetonlari where jeton = v_jeton and user_id = v_me for update;
  if not found or v_kayit.iptal then raise exception 'Geçersiz reklam jetonu'; end if;
  if v_kayit.kullanildi is not null then raise exception 'Bu reklam ödülü zaten alındı'; end if;
  if v_kayit.olusturuldu > now() - make_interval(secs => v_min) then
    raise exception 'Reklam tamamlanmadan ödül alınamaz';
  end if;
  if v_kayit.olusturuldu < now() - make_interval(mins => v_omur) then
    raise exception 'Reklam jetonunun süresi doldu';
  end if;

  insert into public.reklam_odulleri (user_id, gun, sayac) values (v_me, v_gun, 0)
  on conflict (user_id, gun) do nothing;
  select r.elmas_sayac into v_sayac from public.reklam_odulleri r
   where r.user_id = v_me and r.gun = v_gun for update;
  if v_sayac >= v_tavan then
    raise exception 'Bugünkü elmas reklamı hakkın doldu (%/%)', v_sayac, v_tavan;
  end if;

  update public.reklam_jetonlari set kullanildi = now() where jeton = v_jeton;
  update public.reklam_odulleri set elmas_sayac = elmas_sayac + 1
   where user_id = v_me and gun = v_gun returning elmas_sayac into v_sayac;
  perform public.elmas_ekle(v_me, v_odul, 'reklam', v_jeton::text);
  return query select v_odul, v_sayac, v_tavan;
end;
$$;

-- ---------- Yetkiler: istemci RPC'leri yalnız authenticated ----------
revoke all on function public.elmas_durumum() from public, anon;
grant execute on function public.elmas_durumum() to authenticated;
revoke all on function public.elmas_paketleri() from public, anon;
grant execute on function public.elmas_paketleri() to authenticated;
revoke all on function public.elmas_reklam_jetonu_al() from public, anon;
grant execute on function public.elmas_reklam_jetonu_al() to authenticated;
revoke all on function public.elmas_reklam_odulu_al(text) from public, anon;
grant execute on function public.elmas_reklam_odulu_al(text) to authenticated;
