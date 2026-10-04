-- GERİ ALMA: migration 951 (KASA uzunluk + AÇ alt sınırı + joker). YALNIZ 951 canlıya uygulandıktan sonra ve
-- geri dönmek gerekirse çalıştırılır. Hazırlandı: 2026-10-04 11:44:08.20304+00 (canlı veritabanından pg_get_functiondef ile, 951 ÖNCESİ,
-- salt-okunur). Bu dosya ÇALIŞTIRILMADI.
--
-- Ne yapar (tek işlem):
--   1) 951'in değiştirdiği 9 kasa fonksiyonunu 950 tanımına döndürür (md5 her bloğun üstünde).
--   2) 951'in eklediği kasa_joker, kasa_joker_durumu, kasa_oyuncu_bitis fonksiyonlarını siler.
--   3) Ayarları 951 öncesi değerlere döndürür, kasa_acma_min ayarını siler.
--   4) joker_kullanimlari'ndaki 'kasa' satırlarını siler (kısıt eski hâline dönebilsin diye) ve kısıtı geri koyar.
--      Not: harcanan jokerler envantere İADE EDİLMEZ (joker_islemleri kaydı 'kasa:<id>' olarak kalır).
--   5) kasa_maclari'ndan acma_min, jokerli, joker kolonlarını siler.
-- Doğrulama: sondaki sorgu 9 satır döndürür; md5'ler bloklarının üstündeki değerle aynı olmalı.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- 2) Yeni fonksiyonlar (önce: kasa_oyuncu_bitis kasa_maclari satır tipine bağlı)
drop function if exists public.kasa_joker(uuid, text, boolean);
drop function if exists public.kasa_joker_durumu(uuid);

-- 1) 950 tanımları

-- kasa_bot_karar(uuid)
-- md5 (951 öncesi): dc1776f7b332603c7c8c16df3430ae56
CREATE OR REPLACE FUNCTION public.kasa_bot_karar(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_esik int;
  v_puan int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.bot is null or k.sahip is distinct from k.bot then return false; end if;
  v_puan := case when k.bot = k.oyuncu1 then k.puan1 else k.puan2 end;
  if v_puan + k.kasa >= k.hedef then return true; end if;
  v_esik := public.ayar_sayi('kasa_bot_esik_' || coalesce(k.bot_tarz, 'dengeli'),
                             case k.bot_tarz when 'temkinli' then 4 when 'acgozlu' then 12 else 8 end)::int
            + (floor(random() * 3)::int - 1) * public.ayar_sayi('kasa_bot_esik_sapma', 2)::int;
  return k.kasa >= v_esik;
end $function$;

-- kasa_olustur(uuid,uuid,boolean,boolean)
-- md5 (951 öncesi): 225f4be5a92f0251f138e72dad11afaa
CREATE OR REPLACE FUNCTION public.kasa_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_davetli boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_x uuid;
  v_bot uuid;
  v_max int := greatest(1, public.ayar_sayi('kasa_max_tur', 24)::int);
begin
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if random() < 0.5 then v_x := p_a; p_a := p_b; p_b := v_x; end if;
  select p.id into v_bot from public.profiles p where p.id in (p_a, p_b) and coalesce(p.is_bot, false) limit 1;

  insert into public.kasa_maclari (
    oyuncu1, oyuncu2, dereceli, davetli, faz, faz_bitis,
    hedef, max_tur, artis, ikisi_artis, soru_sn, karar_sn, sonuc_sn,
    soru_ids, bot, bot_tarz)
  values (
    p_a, p_b, coalesce(p_dereceli, true), coalesce(p_davetli, false), 'baslangic',
    -- Klasik 3-2-1 (651): ilk soru now + geri sayım + gösterim payı
    now() + make_interval(secs => public.ayar_sayi('mac_geri_sayim_sn', 3)
                                  + greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0),
    greatest(1, public.ayar_sayi('kasa_hedef_puan', 20)::int), v_max,
    greatest(0, public.ayar_sayi('kasa_artis', 2)::int),
    greatest(0, public.ayar_sayi('kasa_ikisi_dogru_artis', 6)::int),
    greatest(5, public.ayar_sayi('kasa_soru_sn', 15)::int),
    greatest(3, public.ayar_sayi('kasa_karar_sn', 8)::int),
    greatest(1, public.ayar_sayi('kasa_sonuc_sn', 3)::int),
    coalesce(public.soru_sec(null::text, v_max + 2, array[p_a, p_b]), '{}'::uuid[]),
    v_bot, case when v_bot is not null then public.kasa_bot_tarz(v_bot) end)
  returning id into v_id;

  insert into public.kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.kasa_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- kasa_soru_ac(uuid,uuid)
-- md5 (951 öncesi): 8b50eaeea815fb18e6004cb6b5306f10
CREATE OR REPLACE FUNCTION public.kasa_soru_ac(p_id uuid, p_soru uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_soru uuid := p_soru;
  v_kat text;
  v_dogru smallint;
  v_bot_cevap smallint;
  v_gecikme numeric;
  v_min numeric := public.ayar_ondalik('kasa_bot_cevap_min_sn', 2);
  v_max numeric := public.ayar_ondalik('kasa_bot_cevap_max_sn', 6);
begin
  select * into k from public.kasa_maclari where id = p_id;
  if v_soru is null and not k.altin and k.tur between 1 and coalesce(array_length(k.soru_ids, 1), 0) then
    v_soru := k.soru_ids[k.tur];
    if v_soru = any(k.kullanilan_sorular) then v_soru := null; end if;
  end if;
  if v_soru is null then v_soru := public.kasa_soru_bul(p_id); end if;
  if v_soru is null then
    -- Havuz tamamen boş: ödülsüz iptal (asılı kalmasın)
    update public.kasa_maclari set durum = 'iptal', bitis = now(), son_hareket = now() where id = p_id;
    return;
  end if;
  select q.kategori, q.dogru_cevap into v_kat, v_dogru from public.questions q where q.id = v_soru;

  if k.bot is not null then
    if random() < public.bot_soru_isabet(k.bot, v_kat, v_soru) then
      v_bot_cevap := v_dogru;
    else
      select x into v_bot_cevap from generate_series(0, 3) x where x <> v_dogru order by random() limit 1;
    end if;
    v_gecikme := least(v_min + (greatest(v_max, v_min) - v_min) * random()::numeric, k.soru_sn - 1);
  end if;

  update public.kasa_maclari
     set soru_id = v_soru,
         kullanilan_sorular = array_append(kullanilan_sorular, v_soru),
         faz = 'cevap',
         soru_baslangic = now(),
         faz_bitis = now() + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when k.bot is not null
                             then now() + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler set soru_id = v_soru, kategori = v_kat where kasa_id = p_id and tur = k.tur;
end $function$;

-- kasa_tur_baslat(uuid)
-- md5 (951 öncesi): 6bfdd584e2f6a2215ffde90c532680d6
CREATE OR REPLACE FUNCTION public.kasa_tur_baslat(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_min numeric := public.ayar_ondalik('kasa_bot_karar_min_sn', 1);
  v_max numeric := public.ayar_ondalik('kasa_bot_karar_max_sn', 3);
begin
  select * into k from public.kasa_maclari where id = p_id;
  update public.kasa_maclari
     set tur = tur + 1, son_karar = null, son_tur = null, cevaplar = '{}'::jsonb,
         bot_karar = null, bot_karar_at = null, son_hareket = now()
   where id = p_id;
  insert into public.kasa_hamleler (kasa_id, tur, altin, kasa_once, sahip_once)
  values (p_id, k.tur + 1, false, k.kasa, k.sahip)
  on conflict (kasa_id, tur) do nothing;

  if k.sahip is not null and k.kasa > 0 then
    update public.kasa_maclari
       set faz = 'karar', karar_baslangic = now(),
           faz_bitis = now() + make_interval(secs => k.karar_sn) + public.kasa_gosterim_payi()
     where id = p_id;
    if k.sahip = k.bot then
      update public.kasa_maclari
         set bot_karar = public.kasa_bot_karar(p_id),
             bot_karar_at = now() + public.kasa_gosterim_payi()
                            + make_interval(secs => v_min + (greatest(v_max, v_min) - v_min) * random()::numeric)
       where id = p_id;
    end if;
  else
    perform public.kasa_soru_ac(p_id);
  end if;
end $function$;

-- kasa_karar_uygula(uuid,boolean,boolean)
-- md5 (951 öncesi): c30a0e8c04ace0c4482d12b8939e0843
CREATE OR REPLACE FUNCTION public.kasa_karar_uygula(p_id uuid, p_ac boolean, p_sure_doldu boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_p1 int; v_p2 int;
  v_ms int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'karar' or k.sahip is null then return; end if;
  v_ms := greatest(0, round(extract(epoch from (now() - coalesce(k.karar_baslangic, now()) - public.kasa_gosterim_payi())) * 1000))::int;

  if coalesce(p_ac, false) then
    v_p1 := k.puan1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end;
    v_p2 := k.puan2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end;
    update public.kasa_maclari
       set puan1 = v_p1, puan2 = v_p2,
           acma_sayisi1 = acma_sayisi1 + (k.sahip = k.oyuncu1)::int,
           acma_sayisi2 = acma_sayisi2 + (k.sahip = k.oyuncu2)::int,
           acma_toplam1 = acma_toplam1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end,
           acma_toplam2 = acma_toplam2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end,
           kasa = 0, sahip = null,
           son_karar = jsonb_build_object('veren', k.sahip, 'ac', true, 'deger', k.kasa),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = 'ac', karar_veren = k.sahip, karar_ms = v_ms, acilan_deger = k.kasa,
           puan1_sonra = v_p1, puan2_sonra = v_p2
     where kasa_id = p_id and tur = k.tur;
    -- AÇ sonrası hedef kontrolü
    if (case when k.sahip = k.oyuncu1 then v_p1 else v_p2 end) >= k.hedef then
      perform public.kasa_bitir(p_id, k.sahip, 'hedef');
      return;
    end if;
  else
    update public.kasa_maclari
       set son_karar = jsonb_build_object('veren', k.sahip, 'ac', false, 'deger', k.kasa,
                                          'sure_doldu', coalesce(p_sure_doldu, false)),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = case when p_sure_doldu then 'sure_doldu' else 'devam' end,
           karar_veren = k.sahip, karar_ms = v_ms
     where kasa_id = p_id and tur = k.tur;
  end if;
  perform public.kasa_soru_ac(p_id);
end $function$;

-- kasa_ilerlet(uuid)
-- md5 (951 öncesi): af11e2d41851e84b963b440b11225efc
CREATE OR REPLACE FUNCTION public.kasa_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_tol interval := make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1));
  v_taban interval := make_interval(secs => public.ayar_sayi('kasa_kopuk_taban_sn', 3));
  v_kayma interval;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (Düello 760 deseni: faz donar, bekleme dolunca terk) ----------
  v_kopuk := public.kasa_kopuk_kim(p_id);
  if v_kopuk is not null then
    if k.kopuk_at is null then
      update public.kasa_maclari
         set kopuk_at = now(), kopuk_kalan = greatest(coalesce(k.faz_bitis, now()) - now(), v_taban)
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      select * into k from public.kasa_maclari where id = p_id;
    end if;
    if k.kopuk_at < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)) then
      perform public.kasa_bitir(p_id, case when v_kopuk = k.oyuncu1 then k.oyuncu2 else k.oyuncu1 end, 'kopuk');
      return;
    end if;
    update public.kasa_maclari
       set faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban)
     where id = p_id;
    return;
  end if;
  if k.kopuk_at is not null then
    v_kayma := now() - k.kopuk_at;
    update public.kasa_maclari
       set kopuk_at = null, kopuk_kalan = null,
           faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban),
           bot_cevap_at = bot_cevap_at + v_kayma,
           bot_karar_at = bot_karar_at + v_kayma,
           son_hareket = now()
     where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into k from public.kasa_maclari where id = p_id;
    exit when not found or k.durum <> 'aktif';

    if k.son_hareket < now() - make_interval(mins => public.ayar_sayi('kasa_zaman_asimi_dk', 60)::int) then
      update public.kasa_maclari set durum = 'iptal', bitis = now() where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      exit;
    end if;

    if k.faz = 'baslangic' then
      exit when now() < k.faz_bitis;
      perform public.kasa_tur_baslat(p_id);
    elsif k.faz = 'karar' then
      if k.bot is not null and k.sahip = k.bot and k.bot_karar_at is not null and now() >= k.bot_karar_at then
        perform public.kasa_karar_uygula(p_id, coalesce(k.bot_karar, false), false);
      elsif now() >= k.faz_bitis then
        perform public.kasa_karar_uygula(p_id, false, true);   -- süre doldu → DEVAM
      else
        exit;
      end if;
    elsif k.faz = 'cevap' then
      if k.bot is not null and not (k.cevaplar ? k.bot::text) and k.bot_cevap_at is not null
         and now() >= k.bot_cevap_at then
        update public.kasa_maclari
           set cevaplar = cevaplar || jsonb_build_object(k.bot::text,
                            jsonb_build_object('cevap', k.bot_cevap, 'at', k.bot_cevap_at))
         where id = p_id;
        select * into k from public.kasa_maclari where id = p_id;
      end if;
      exit when not ((k.cevaplar ? k.oyuncu1::text) or now() > k.faz_bitis + v_tol)
             or not ((k.cevaplar ? k.oyuncu2::text) or now() > k.faz_bitis + v_tol);
      perform public.kasa_cozumle(p_id);
    elsif k.faz = 'sonuc' then
      exit when now() < k.faz_bitis;
      perform public.kasa_sonraki(p_id);
    else
      exit;
    end if;
    perform public.kasa_sinyal_ver(p_id);
  end loop;
end $function$;

-- kasa_durum(uuid)
-- md5 (951 öncesi): 39470fc21067e13babd1fb3fdafee068
CREATE OR REPLACE FUNCTION public.kasa_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_sonuc jsonb;
  v_gecmis jsonb;
  v_kopuk uuid;
  v_payi interval := public.kasa_gosterim_payi();
begin
  perform public.hiz_siniri('kasa_durum', 400, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;

  if k.soru_id is not null and (k.faz in ('cevap', 'sonuc') or k.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(k.soru_id, v_dil) sd;
  end if;

  -- Sonuç bandı: soru çözümlendikten SONRA (doğru cevap ancak burada)
  if k.faz = 'sonuc' and k.son_tur is not null then
    v_sonuc := k.son_tur || jsonb_build_object(
      'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
      'ben_dogru', coalesce((k.son_tur -> 'dogru' ->> v_me::text)::boolean, false),
      'rakip_dogru', coalesce((k.son_tur -> 'dogru' ->> v_rakip::text)::boolean, false));
    v_sonuc := v_sonuc - 'dogru';
  end if;

  if k.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'altin', h.altin, 'kategori', h.kategori,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', cb.cevap, 'ben_dogru', coalesce(cb.dogru, false),
             'rakip_dogru', coalesce(cr.dogru, false),
             'karar', h.karar, 'karar_ben', h.karar_veren = v_me, 'acilan_deger', h.acilan_deger,
             'kasa_sonra', h.kasa_sonra) order by h.tur), '[]'::jsonb)
      into v_gecmis
      from public.kasa_hamleler h
      left join public.questions q on q.id = h.soru_id
      left join public.kasa_cevaplari cb on cb.kasa_id = h.kasa_id and cb.tur = h.tur and cb.user_id = v_me
      left join public.kasa_cevaplari cr on cr.kasa_id = h.kasa_id and cr.tur = h.tur and cr.user_id = v_rakip
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on h.soru_id is not null
     where h.kasa_id = p_id;
  end if;

  if k.durum = 'aktif' and k.kopuk_at is not null then
    v_kopuk := public.kasa_kopuk_kim(p_id);
  end if;

  return jsonb_build_object(
    'id', k.id, 'durum', k.durum, 'dereceli', k.dereceli,
    'faz', k.faz, 'faz_bitis', k.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'tur', k.tur, 'max_tur', k.max_tur, 'hedef', k.hedef, 'altin', k.altin,
    'artis', k.artis, 'ikisi_artis', k.ikisi_artis,
    'kasa', k.kasa, 'sahip', k.sahip,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'unvan', public.oyuncu_unvani(p.id), 'puan', k.puan1, 'acma', k.acma_sayisi1)
         from public.profiles p where p.id = k.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'unvan', public.oyuncu_unvani(p.id), 'puan', k.puan2, 'acma', k.acma_sayisi2)
         from public.profiles p where p.id = k.oyuncu2)),
    'karar', case when k.faz = 'karar' then jsonb_build_object('veren', k.sahip, 'deger', k.kasa) end,
    'son_karar', k.son_karar,
    'soru', v_soru,
    'cevap', case when k.faz = 'cevap' then jsonb_build_object(
               'ben_cevapladim', k.cevaplar ? v_me::text,
               'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
               'rakip_cevapladi', k.cevaplar ? v_rakip::text) end,
    'sonuc', v_sonuc,
    'sureler', jsonb_build_object(
       'soru', k.soru_sn, 'karar', k.karar_sn, 'sonuc', k.sonuc_sn,
       'nabiz', public.kasa_nabiz_sn(), 'kopuk', public.ayar_sayi('kasa_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('kasa_gosterim_payi_ms', 1500),
       'gosterim_bas', case k.faz
          when 'karar' then k.karar_baslangic + v_payi
          when 'cevap' then k.soru_baslangic + v_payi end),
    'kopuk', case when k.durum = 'aktif' and k.kopuk_at is not null then jsonb_build_object(
       'ben_mi', v_kopuk is not null and v_kopuk = v_me,
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)),
       'faz_kalan_sn', round(extract(epoch from coalesce(k.kopuk_kalan, interval '0'))::numeric, 2)) end,
    'kazanan', k.kazanan, 'sonuc_neden', k.sonuc_neden,
    'terk', case when k.durum <> 'aktif' then jsonb_build_object(
       'ben', k.terk_eden = v_me, 'rakip', k.terk_eden is not null and k.terk_eden <> v_me) end,
    'baglanmayan', k.baglanmayan,
    'gecmis', v_gecmis
  );
end $function$;

-- kasa_cevap(uuid,smallint)
-- md5 (951 öncesi): ee717cc671e40bb8ee3dac0fed14631d
CREATE OR REPLACE FUNCTION public.kasa_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > k.faz_bitis + make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)) then
    raise exception 'Süre doldu';
  end if;

  update public.kasa_maclari
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', now())),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(k.soru_id);
  if p_cevap is distinct from (select dogru_cevap from public.questions where id = k.soru_id) then
    perform public.yanlis_kaydet(k.soru_id);
  end if;
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ (rakip henüz cevaplamamış olabilir)
  return jsonb_build_object('cevaplandi', true);
end $function$;

-- kasa_karar(uuid,boolean)
-- md5 (951 öncesi): 44117a94413ac204c1ba10fac37f02cc
CREATE OR REPLACE FUNCTION public.kasa_karar(p_id uuid, p_ac boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'karar' then raise exception 'Şu an karar verilemez'; end if;
  if k.sahip is distinct from auth.uid() then raise exception 'Karar kasanın sahibinde'; end if;
  perform public.kasa_karar_uygula(p_id, coalesce(p_ac, false), false);
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
end $function$;

drop function if exists public.kasa_oyuncu_bitis(public.kasa_maclari, uuid);

-- 3) Ayarlar
update public.oyun_ayarlari set deger = '12'::jsonb, aciklama = 'TEST DEĞERİ — Açgözlü bot kasa ≥ bu ise AÇ (950).' where anahtar = 'kasa_bot_esik_acgozlu';
update public.oyun_ayarlari set deger = '8'::jsonb, aciklama = 'TEST DEĞERİ — Dengeli bot kasa ≥ bu ise AÇ (950).' where anahtar = 'kasa_bot_esik_dengeli';
update public.oyun_ayarlari set deger = '4'::jsonb, aciklama = 'TEST DEĞERİ — Temkinli bot kasa ≥ bu ise AÇ (950).' where anahtar = 'kasa_bot_esik_temkinli';
update public.oyun_ayarlari set deger = '20'::jsonb, aciklama = 'TEST DEĞERİ — kazanma hedefi (950).' where anahtar = 'kasa_hedef_puan';
update public.oyun_ayarlari set deger = '24'::jsonb, aciklama = 'TEST DEĞERİ — tur üst sınırı (950).' where anahtar = 'kasa_max_tur';
delete from public.oyun_ayarlari where anahtar = 'kasa_acma_min';

-- 4) Joker kullanım kısıtı
delete from public.joker_kullanimlari where mac_tur = 'kasa';
alter table public.joker_kullanimlari drop constraint if exists joker_kullanimlari_mac_tur_check;
alter table public.joker_kullanimlari add constraint joker_kullanimlari_mac_tur_check CHECK ((mac_tur = ANY (ARRAY['1v1'::text, 'grup'::text, 'hizli'::text, 'turnuva'::text, 'duello'::text])));

-- 5) Kolonlar
alter table public.kasa_maclari drop column if exists joker;
alter table public.kasa_maclari drop column if exists jokerli;
alter table public.kasa_maclari drop column if exists acma_min;

-- Doğrulama
select p.oid::regprocedure::text imza, md5(pg_get_functiondef(p.oid)) md5
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = any(array['kasa_bot_karar', 'kasa_olustur', 'kasa_soru_ac', 'kasa_tur_baslat', 'kasa_karar_uygula', 'kasa_ilerlet', 'kasa_durum', 'kasa_cevap', 'kasa_karar'])
 order by 1;
-- Beklenen:
--   kasa_bot_karar(uuid)  dc1776f7b332603c7c8c16df3430ae56
--   kasa_olustur(uuid,uuid,boolean,boolean)  225f4be5a92f0251f138e72dad11afaa
--   kasa_soru_ac(uuid,uuid)  8b50eaeea815fb18e6004cb6b5306f10
--   kasa_tur_baslat(uuid)  6bfdd584e2f6a2215ffde90c532680d6
--   kasa_karar_uygula(uuid,boolean,boolean)  c30a0e8c04ace0c4482d12b8939e0843
--   kasa_ilerlet(uuid)  af11e2d41851e84b963b440b11225efc
--   kasa_durum(uuid)  39470fc21067e13babd1fb3fdafee068
--   kasa_cevap(uuid,smallint)  ee717cc671e40bb8ee3dac0fed14631d
--   kasa_karar(uuid,boolean)  44117a94413ac204c1ba10fac37f02cc

commit;
