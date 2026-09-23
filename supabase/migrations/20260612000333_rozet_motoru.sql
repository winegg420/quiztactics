-- ============================================================
-- 333 · ROZET MOTORU — olay anında kazanma + geriye dönük verme
--
-- Kazanma kontrolü sunucuda, olay anında: maç sonu (matches / duellolar),
-- level atlama · seri · lig değişimi (profiles), kategori doğrusu (kategori_dogru),
-- turnuva sonu (tournaments), arkadaşlık (friendships), maç mesajı (match_messages),
-- davet ödülü (335), Efsane'de haftanın 1.'si (lig_haftayi_kapat).
-- Tetikleyiciler rozet_kontrol_guvenli üzerinden çağırır: rozet tarafındaki bir hata
-- maçı / cevabı / lig kapanışını ASLA bozmaz (uyarı yazar, devam eder).
-- Aynı rozet iki kez verilmez (oyuncu_rozetleri pk + coin_hareketleri_rozet_tek).
-- ============================================================

-- ---------- coin_ekle: 'rozet' günlük tavana takılmaz (tek seferlik kilometre taşı) ----------
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
  if p_tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'davet', 'seviye', 'rozet') then
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

-- ---------- Rozet ver (iç) ----------
-- p_coin=false: geriye dönük (coin yok, bildirim yok). Rozetin çerçevesi her durumda verilir.
create or replace function public.rozet_ver(p_user uuid, p_anahtar text, p_coin boolean default true, p_geriye boolean default false)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_t public.rozet_tanimlari%rowtype;
  v_yeni boolean;
  v_coin int := 0;
  v_eski_kalem text := coalesce(current_setting('app.odul_kalem', true), '');
  v_eski_detay text := coalesce(current_setting('app.odul_detay', true), '');
begin
  if p_user is null or p_anahtar is null then return false; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return false; end if;
  select * into v_t from public.rozet_tanimlari where anahtar = p_anahtar and aktif;
  if not found then return false; end if;

  v_coin := case when p_coin then greatest(coalesce(v_t.coin, 0), 0) else 0 end;
  insert into public.oyuncu_rozetleri (user_id, rozet, coin, geriye_donuk, goruldu)
  values (p_user, p_anahtar, v_coin, p_geriye, p_geriye)
  on conflict do nothing
  returning true into v_yeni;
  if not coalesce(v_yeni, false) then return false; end if;

  if v_coin > 0 then
    -- Maç sonu dökümünde ayrı kalem: 'rozet_odulu' (eski rozet sisteminin 'rozet' kalemiyle karışmasın)
    perform set_config('app.odul_kalem', 'rozet_odulu', true);
    perform set_config('app.odul_detay', jsonb_build_object('rozet', p_anahtar, 'kademe', v_t.kademe)::text, true);
    perform public.coin_ekle(p_user, v_coin, 'rozet', 'rozet:' || p_anahtar);
    perform set_config('app.odul_kalem', v_eski_kalem, true);
    perform set_config('app.odul_detay', v_eski_detay, true);
  end if;

  if v_t.cerceve is not null then
    perform public.cerceve_ver(p_user, v_t.cerceve, 'rozet');
  end if;
  return true;
end;
$$;
revoke all on function public.rozet_ver(uuid, text, boolean, boolean) from public, anon, authenticated;

-- ---------- Rozet kontrol (iç): verilen ölçütlerdeki kazanılmamış rozetleri değerlendirir ----------
-- p_olcutler null = hepsi. Dönüş: bu çağrıda verilen rozet sayısı.
create or replace function public.rozet_kontrol(p_user uuid, p_olcutler text[] default null, p_coin boolean default true, p_geriye boolean default false)
returns int
language plpgsql security definer set search_path to 'public'
as $$
declare
  r record;
  v_olcut text := null;
  v_deger bigint := 0;
  v_adet int := 0;
begin
  if p_user is null then return 0; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return 0; end if;

  for r in
    select t.anahtar, t.olcut, t.esik
      from public.rozet_tanimlari t
     where t.aktif and t.olcut <> 'olay'
       and (p_olcutler is null or t.olcut = any(p_olcutler))
       and not exists (select 1 from public.oyuncu_rozetleri o where o.user_id = p_user and o.rozet = t.anahtar)
     order by t.olcut, t.esik
  loop
    if v_olcut is distinct from r.olcut then
      v_olcut := r.olcut;
      v_deger := public.rozet_olcut(p_user, r.olcut);
    end if;
    if v_deger >= r.esik then
      if public.rozet_ver(p_user, r.anahtar, p_coin, p_geriye) then v_adet := v_adet + 1; end if;
    end if;
  end loop;
  return v_adet;
end;
$$;
revoke all on function public.rozet_kontrol(uuid, text[], boolean, boolean) from public, anon, authenticated;

-- Tetikleyiciler için: hata oyunu bozmasın.
create or replace function public.rozet_kontrol_guvenli(p_user uuid, p_olcutler text[])
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.rozet_kontrol(p_user, p_olcutler, true, false);
exception when others then
  raise warning 'rozet_kontrol (%, %) başarısız: %', p_user, p_olcutler, sqlerrm;
end;
$$;
revoke all on function public.rozet_kontrol_guvenli(uuid, text[]) from public, anon, authenticated;

-- ---------- Tetikleyiciler ----------

-- Profil: level · seri · lig
create or replace function public.trg_rozet_profil()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
declare v_olcutler text[] := '{}';
begin
  if coalesce(new.is_bot, false) then return null; end if;
  if new.level is distinct from old.level then v_olcutler := v_olcutler || array['level']; end if;
  if new.seri_gun is distinct from old.seri_gun or new.seri_en_uzun is distinct from old.seri_en_uzun
     or new.seri is distinct from old.seri then
    v_olcutler := v_olcutler || array['seri'];
  end if;
  if new.lig is distinct from old.lig then
    v_olcutler := v_olcutler || array['lig_gumus', 'lig_altin', 'lig_elmas', 'lig_efsane'];
  end if;
  if cardinality(v_olcutler) > 0 then
    perform public.rozet_kontrol_guvenli(new.id, v_olcutler);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_rozet_profil on public.profiles;
create trigger trg_rozet_profil
  after update of level, seri_gun, seri_en_uzun, seri, lig on public.profiles
  for each row execute function public.trg_rozet_profil();

-- Klasik maç sonu
create or replace function public.trg_rozet_mac()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_olcutler text[] := array['klasik_galibiyet', 'saf_bilgi_galibiyet', 'klasik_tam', 'galibiyet_serisi',
                             'arkadas_mac', 'rovans_galibiyet'];
begin
  perform public.rozet_kontrol_guvenli(new.oyuncu1, v_olcutler);
  if new.oyuncu2 is not null then perform public.rozet_kontrol_guvenli(new.oyuncu2, v_olcutler); end if;
  return null;
end;
$$;
drop trigger if exists trg_rozet_mac on public.matches;
create trigger trg_rozet_mac
  after update of durum on public.matches
  for each row when (new.durum = 'bitti' and old.durum is distinct from 'bitti')
  execute function public.trg_rozet_mac();

-- Düello sonu
create or replace function public.trg_rozet_duello()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_olcutler text[] := array['duello_galibiyet', 'duello_son_can', 'duello_geri_donus', 'uzatma_galibiyet',
                             'galibiyet_serisi', 'arkadas_mac', 'rovans_galibiyet'];
begin
  perform public.rozet_kontrol_guvenli(new.oyuncu1, v_olcutler);
  if new.oyuncu2 is not null then perform public.rozet_kontrol_guvenli(new.oyuncu2, v_olcutler); end if;
  return null;
end;
$$;
drop trigger if exists trg_rozet_duello on public.duellolar;
create trigger trg_rozet_duello
  after update of durum on public.duellolar
  for each row when (new.durum = 'bitti' and old.durum is distinct from 'bitti')
  execute function public.trg_rozet_duello();

-- Kategori doğrusu: her doğru cevapta çalışır → önce ucuz kapı (eşik geçildi mi?)
create or replace function public.trg_rozet_kategori()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
begin
  if exists (
       select 1 from public.rozet_tanimlari t
        where t.aktif and t.olcut = 'kategori:' || new.kategori and t.esik <= new.dogru_sayisi
          and not exists (select 1 from public.oyuncu_rozetleri o where o.user_id = new.user_id and o.rozet = t.anahtar))
     or new.dogru_sayisi = public.ayar_sayi('rozet_kasif_min_dogru', 10)::int then
    perform public.rozet_kontrol_guvenli(new.user_id, array['kategori:' || new.kategori, 'kasif']);
  end if;
  return null;
exception when others then
  raise warning 'trg_rozet_kategori başarısız: %', sqlerrm;
  return null;
end;
$$;
drop trigger if exists trg_rozet_kategori on public.kategori_dogru;
create trigger trg_rozet_kategori
  after insert or update of dogru_sayisi on public.kategori_dogru
  for each row execute function public.trg_rozet_kategori();

-- Turnuva sonu
create or replace function public.trg_rozet_turnuva()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
declare r record;
begin
  for r in
    select tp.user_id from public.tournament_players tp
      join public.profiles p on p.id = tp.user_id and not coalesce(p.is_bot, false)
     where tp.tournament_id = new.id
  loop
    perform public.rozet_kontrol_guvenli(r.user_id,
      array['turnuva_katilim', 'turnuva_ilk10', 'turnuva_ilk3', 'turnuva_sampiyon', 'turnuva_seans']);
  end loop;
  return null;
exception when others then
  raise warning 'trg_rozet_turnuva başarısız: %', sqlerrm;
  return null;
end;
$$;
drop trigger if exists trg_rozet_turnuva on public.tournaments;
create trigger trg_rozet_turnuva
  after update of durum, kazanan on public.tournaments
  for each row when (new.durum = 'bitti' and (old.durum is distinct from 'bitti' or old.kazanan is distinct from new.kazanan))
  execute function public.trg_rozet_turnuva();

-- Arkadaşlık
create or replace function public.trg_rozet_arkadas()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.rozet_kontrol_guvenli(new.requester, array['arkadas']);
  perform public.rozet_kontrol_guvenli(new.addressee, array['arkadas']);
  return null;
end;
$$;
drop trigger if exists trg_rozet_arkadas on public.friendships;
create trigger trg_rozet_arkadas
  after insert or update of durum on public.friendships
  for each row when (new.durum = 'arkadas')
  execute function public.trg_rozet_arkadas();

-- Maç mesajı (gizli "İlk Söz"): kazanıldıktan sonra kapı tek sorgu
create or replace function public.trg_rozet_mesaj()
returns trigger
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.oyuncu_rozetleri o
                  join public.rozet_tanimlari t on t.anahtar = o.rozet and t.olcut = 'mac_mesaji'
                 where o.user_id = new.user_id) then
    perform public.rozet_kontrol_guvenli(new.user_id, array['mac_mesaji']);
  end if;
  return null;
exception when others then
  raise warning 'trg_rozet_mesaj başarısız: %', sqlerrm;
  return null;
end;
$$;
drop trigger if exists trg_rozet_mesaj on public.match_messages;
create trigger trg_rozet_mesaj
  after insert on public.match_messages
  for each row execute function public.trg_rozet_mesaj();

revoke all on function public.trg_rozet_profil() from public, anon, authenticated;
revoke all on function public.trg_rozet_mac() from public, anon, authenticated;
revoke all on function public.trg_rozet_duello() from public, anon, authenticated;
revoke all on function public.trg_rozet_kategori() from public, anon, authenticated;
revoke all on function public.trg_rozet_turnuva() from public, anon, authenticated;
revoke all on function public.trg_rozet_arkadas() from public, anon, authenticated;
revoke all on function public.trg_rozet_mesaj() from public, anon, authenticated;

-- ---------- Efsane Lig'de haftanın 1.'si (lig_haftayi_kapat, canlı tanım + tek ek) ----------
CREATE OR REPLACE FUNCTION public.lig_haftayi_kapat(p_hafta date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

-- ---------- GERİYE DÖNÜK: mevcut oyuncular hak ettiklerini alır — COIN YOK, bildirim yok ----------
-- Level 25/50/75/100 rozetinin çerçevesi de verilir (rozetin kendisi ödül).
do $$
declare
  r record;
  v_toplam int := 0;
begin
  for r in select p.id from public.profiles p where not coalesce(p.is_bot, false) loop
    v_toplam := v_toplam + public.rozet_kontrol(r.id, null, false, true);
  end loop;
  raise notice 'Geriye dönük verilen rozet: %', v_toplam;
end $$;
