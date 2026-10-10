-- ============================================================
-- GERİ ALMA — migration 20260612001053_guvenlik_c_girdi_hiz_siniri.sql
-- Fonksiyonların 10 Eki 2026 (uygulama öncesi) canlı gövdeleri. Gerekmedikçe ÇALIŞTIRMA.
-- ============================================================
begin;

CREATE OR REPLACE FUNCTION public.arkadas_davet_kodu_ile_ekle(p_kod text)
 RETURNS TABLE(durum text, gorunen_ad text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

CREATE OR REPLACE FUNCTION public.avatar3d_satin_al(p_id text)
 RETURNS TABLE(bakiye bigint, alinan_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me     uuid := auth.uid();
  v_parca  public.avatar3d_parcalar%rowtype;
  v_bakiye bigint;
  v_bedava boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('avatar3d_satin_al', 30, interval '60 seconds');

  select coalesce((deger)::boolean, false) into v_bedava
    from public.oyun_ayarlari where anahtar = 'kozmetik_bedava_test';
  v_bedava := coalesce(v_bedava, false);

  select * into v_parca from public.avatar3d_parcalar where id = p_id and aktif;
  if not found then raise exception 'Parça bulunamadı'; end if;

  -- 213: ödül/etkinlik eşyası HİÇBİR ZAMAN satılmaz (Taç, Pelerin, turnuva giysisi) —
  -- kozmetik_bedava_test açıkken de. Eskiden test anahtarı bunları da bedava açıyordu.
  if v_parca.coin_fiyat is null or v_parca.nadirlik = 'etkinlik' then
    raise exception 'Bu parça satın alınamaz, yalnız ödül olarak kazanılır';
  end if;

  if exists (select 1 from public.avatar3d_sahip s where s.oyuncu_id = v_me and s.parca_id = p_id) then
    raise exception 'Bu parça zaten sende';
  end if;

  if v_bedava or coalesce(v_parca.coin_fiyat, 0) = 0 then
    -- Coin'e dokunulmaz: bakiye olduğu gibi döner.
    select coin into v_bakiye from public.profiles where id = v_me;
  else
    v_bakiye := public.coin_harca(v_parca.coin_fiyat, 'avatar3d', p_id);
  end if;

  insert into public.avatar3d_sahip (oyuncu_id, parca_id, kaynak)
  values (v_me, p_id,
          case when v_bedava then 'bedava_test'
               when v_parca.coin_fiyat = 0 then 'baslangic'
               else 'satin' end)
  on conflict do nothing;

  return query select v_bakiye, p_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cihaz_bildir(p_cihaz text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_ip text;
begin
  if v_me is null then return; end if;
  if nullif(btrim(coalesce(p_cihaz, '')), '') is null then return; end if;

  begin
    v_ip := split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      ',', 1);
  exception when others then
    v_ip := null;   -- başlık yoksa (doğrudan bağlantı) sessizce geç
  end;

  insert into public.oyuncu_cihazlari (user_id, cihaz_id, ip, son_at)
  values (v_me, left(p_cihaz, 64), nullif(btrim(coalesce(v_ip, '')), ''), now())
  on conflict (user_id, cihaz_id)
    do update set ip = coalesce(excluded.ip, public.oyuncu_cihazlari.ip), son_at = now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_referral(p_davet_eden uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return public.davet_bagla_ic(auth.uid(), p_davet_eden) in ('baglandi', 'ayni_cihaz');
end;
$function$;

CREATE OR REPLACE FUNCTION public.duello_davet_et(p_rakip uuid, p_dereceli boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_davet uuid;
  v_duello uuid;
  v_bot boolean;
  v_ad text;
begin
  -- 440 (Ida, 24 Eyl 2026): açık botla antrenman her zaman serbest; botla lig puanı kasılamaz.
  if exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('duello_davet_et', 30, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_rakip = v_me then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then
    raise exception 'Oyuncu bulunamadı';
  end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;
  perform public.duello_acilis_kontrol(v_me, true);        -- 666: yeni oyuncu kilidi
  perform public.duello_acilis_kontrol(p_rakip, false);

  delete from public.duello_davetleri
   where durum = 'bekliyor' and created_at < now() - interval '24 hours';

  if exists (select 1 from public.duellolar
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or p_rakip in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir düello var';
  end if;
  -- Kural 5: aynı modda ikinci davet yok
  if exists (select 1 from public.duello_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir düello davetin zaten var';
  end if;
  -- Kural 2: modlar toplamında en fazla 2 bekleyen davet (Paket 24 · A.2)
  perform public.davet_siniri_kontrol(p_rakip);

  perform public.mac_kotasi_kontrol();

  insert into public.duello_davetleri (kuran, rakip, dereceli)
  values (v_me, p_rakip, coalesce(p_dereceli, true))
  returning id into v_davet;

  select coalesce(is_bot, false) and coalesce(acik_bot, false) into v_bot
    from public.profiles where id = p_rakip;
  if coalesce(v_bot, false) then
    v_duello := public.duello_olustur(v_me, p_rakip, coalesce(p_dereceli, true));
    update public.duello_davetleri
       set durum = 'kabul', duello_id = v_duello, yanit_at = now()
     where id = v_davet;
  else
    -- Davet edilen haberdar olsun (bant + telefon bildirimi). Bot ise bildirim_yaz kendisi susar.
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_yaz(
      p_rakip,
      'duello_daveti',
      coalesce(v_ad, 'Bir oyuncu') || ' seni düelloya çağırdı!',
      '/bildim/duello'
    );
  end if;

  return jsonb_build_object('davet_id', v_davet, 'duello_id', v_duello);
end;
$function$;

CREATE OR REPLACE FUNCTION public.esya_satin_al(p_kod text)
 RETURNS TABLE(bakiye bigint, alinan_kod text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_esya public.esyalar%rowtype;
  v_bakiye bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('esya_satin_al', 30, interval '60 seconds');

  select * into v_esya from public.esyalar where kod = p_kod and aktif;
  if not found then raise exception 'Eşya bulunamadı'; end if;
  if v_esya.coin_fiyat is null then
    raise exception 'Bu eşya satın alınamaz, yalnız ödül olarak kazanılır';
  end if;
  if exists (select 1 from public.oyuncu_esyalari o where o.user_id = v_me and o.esya_kod = p_kod) then
    raise exception 'Bu eşya zaten sende';
  end if;

  if v_esya.coin_fiyat > 0 then
    v_bakiye := public.coin_harca(v_esya.coin_fiyat, 'esya', p_kod);
  else
    select coin into v_bakiye from public.profiles where id = v_me;
  end if;

  insert into public.oyuncu_esyalari (user_id, esya_kod, kaynak)
  values (v_me, p_kod, case when v_esya.coin_fiyat = 0 then 'baslangic' else 'satin' end)
  on conflict do nothing;

  return query select v_bakiye, p_kod;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ikram_yanitla(p_id uuid, p_kabul boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  r public.meydan_ikramlari%rowtype;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into r from public.meydan_ikramlari where id = p_id for update;
  if not found then raise exception 'Teklif bulunamadı'; end if;
  if r.alan <> v_me then raise exception 'Bu teklif sana değil'; end if;
  if r.durum <> 'bekliyor' then return r.durum; end if;

  if r.created_at < now() - (public.ayar_sayi('ikram_zaman_asimi_sn', 20) * interval '1 second') then
    update public.meydan_ikramlari
       set durum = 'zaman_asimi', yanit_at = now() where id = p_id;
    perform public.coin_ekle(r.gonderen, r.coin, 'ikram_iade', p_id::text);
    return 'zaman_asimi';
  end if;

  update public.meydan_ikramlari
     set durum = case when p_kabul then 'kabul' else 'red' end, yanit_at = now()
   where id = p_id;

  if not p_kabul then
    perform public.coin_ekle(r.gonderen, r.coin, 'ikram_iade', p_id::text);
  end if;

  return case when p_kabul then 'kabul' else 'red' end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.kalp_at()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.nabiz_yaz(auth.uid());   -- 996
end $function$;

CREATE OR REPLACE FUNCTION public.karakter_satin_al(p_id text)
 RETURNS TABLE(bakiye bigint, alinan_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  k public.karakterler%rowtype;
  v_bakiye bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('karakter_satin_al', 30, interval '60 seconds');

  select * into k from public.karakterler where id = p_id and aktif;
  if not found then raise exception 'Karakter bulunamadı'; end if;
  if k.coin_fiyat is null then
    raise exception 'Bu karakter satın alınamaz, yalnız ödül olarak kazanılır';
  end if;
  if exists (select 1 from public.oyuncu_karakterleri o
              where o.user_id = v_me and o.karakter_id = p_id) then
    raise exception 'Bu karakter zaten sende';
  end if;

  if k.coin_fiyat > 0 then
    v_bakiye := public.coin_harca(k.coin_fiyat, 'karakter', p_id);
  else
    select coin into v_bakiye from public.profiles where id = v_me;
  end if;

  insert into public.oyuncu_karakterleri (user_id, karakter_id, kaynak)
  values (v_me, p_id, case when k.coin_fiyat = 0 then 'baslangic' else 'satin' end)
  on conflict do nothing;

  return query select v_bakiye, p_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.kasa_davet_et(p_rakip uuid, p_dereceli boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_davet uuid;
  v_kasa uuid;
  v_bot boolean;
  v_ad text;
begin
  -- 440: açık botla antrenman her zaman serbest
  if exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('kasa_davet_et', 30, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if p_rakip = v_me then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then raise exception 'Oyuncu bulunamadı'; end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;

  delete from public.kasa_davetleri where durum = 'bekliyor' and created_at < now() - interval '24 hours';
  if exists (select 1 from public.kasa_maclari
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or p_rakip in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir Ortak Hazine maçı var';
  end if;
  if exists (select 1 from public.kasa_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir Ortak Hazine davetin zaten var';
  end if;
  perform public.davet_siniri_kontrol(p_rakip);
  perform public.mac_kotasi_kontrol();

  insert into public.kasa_davetleri (kuran, rakip, dereceli)
  values (v_me, p_rakip, coalesce(p_dereceli, true))
  returning id into v_davet;

  select coalesce(is_bot, false) and coalesce(acik_bot, false) into v_bot from public.profiles where id = p_rakip;
  if coalesce(v_bot, false) then
    v_kasa := public.kasa_olustur(v_me, p_rakip, coalesce(p_dereceli, true), true);
    update public.kasa_davetleri set durum = 'kabul', kasa_id = v_kasa, yanit_at = now() where id = v_davet;
  else
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_yaz(p_rakip, 'kasa_daveti',
      coalesce(v_ad, 'Bir oyuncu') || ' seni Ortak Hazine maçına çağırdı!', '/bildim/kasa');
  end if;
  return jsonb_build_object('davet_id', v_davet, 'kasa_id', v_kasa);
end $function$;

CREATE OR REPLACE FUNCTION public.send_friend_request(p_target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ters uuid;
begin
  perform public.hiz_siniri('send_friend_request', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if p_target = auth.uid() then raise exception 'Kendini ekleyemezsin'; end if;

  -- Karşı taraf zaten istek gönderdiyse direkt arkadaş yap
  select id into v_ters from public.friendships
  where requester = p_target and addressee = auth.uid();
  if found then
    update public.friendships set durum = 'arkadas' where id = v_ters;
    return;
  end if;

  insert into public.friendships (requester, addressee)
  values (auth.uid(), p_target)
  on conflict (requester, addressee) do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sikayet_et(p_kisi uuid, p_sebep text, p_aciklama text DEFAULT NULL::text, p_mesaj_id uuid DEFAULT NULL::uuid, p_engelle boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_ad text;
  v_metin text;
  v_id bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('sikayet_et', 10, interval '60 seconds');
  if p_kisi is null or p_kisi = v_me then raise exception 'Kendini şikâyet edemezsin'; end if;
  if p_sebep not in ('hakaret', 'uygunsuz_ad', 'spam', 'hile', 'diger') then raise exception 'Geçersiz şikâyet sebebi'; end if;
  select gorunen_ad into v_ad from public.profiles where id = p_kisi;
  if not found then raise exception 'Oyuncu bulunamadı'; end if;
  if exists (select 1 from public.sikayetler s
              where s.sikayet_eden = v_me and s.sikayet_edilen = p_kisi and s.created_at > now() - interval '24 hours') then
    raise exception 'Bu oyuncuyu bugün zaten şikâyet ettin.';
  end if;
  if p_mesaj_id is not null then
    -- Yalnız o kişinin BANA gönderdiği mesaj; metin şikâyet anındaki hâliyle kopyalanır (silinse de kanıt kalır)
    select d.metin into v_metin from public.direkt_mesajlar d
     where d.id = p_mesaj_id and d.gonderen_id = p_kisi and d.alici_id = v_me;
    if not found then raise exception 'Mesaj bulunamadı'; end if;
  end if;
  insert into public.sikayetler (sikayet_eden, sikayet_edilen, edilen_ad, sebep, aciklama, mesaj_id, mesaj_metni)
  values (v_me, p_kisi, v_ad, p_sebep, nullif(left(btrim(coalesce(p_aciklama, '')), 500), ''), p_mesaj_id, v_metin)
  returning id into v_id;
  if coalesce(p_engelle, false) then perform public.oyuncu_engelle(p_kisi); end if;
  return jsonb_build_object('id', v_id, 'engellendi', coalesce(p_engelle, false));
end;
$function$;

CREATE OR REPLACE FUNCTION public.trg_dm_guvenlik()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = new.gonderen_id;
  if found and not coalesce(p.is_bot, false) then
    if p.askida then raise exception 'Hesabın askıya alındı; mesaj gönderemezsin.'; end if;
    if p.mesaj_kapali then raise exception 'Mesajlaşman kapatıldı.'; end if;
    if p.kosullar_kabul_at is null then
      raise exception 'Mesaj göndermek için önce Kullanım Koşulları''nı kabul etmelisin.';
    end if;
  end if;
  if public.iletisim_engelli(new.gonderen_id, new.alici_id) then
    raise exception 'Bu oyuncuyla iletişim kuramazsın.';
  end if;
  new.metin := public.kufur_maskele_dil(new.metin, p.dil);   -- gönderen bulunamazsa p.dil null
  return new;
end;
$function$;

alter table public.profiles drop constraint if exists profiles_tercih_kategori_check;
drop function if exists public.hiz_siniri_mesajli(text, integer, interval, text);
drop function if exists public.gorunmez_temizle(text);
delete from public.rpc_sayac where uc_adi in ('arkadas_istek_gunluk', 'davet_gunluk', 'cihaz_bildir', 'claim_referral',
  'kalp_at', 'ikram_yanitla', 'arkadas_davet_kodu_ile_ekle') or uc_adi like 'arkadas_hedef:%';

commit;
