-- 440: Antrenman (açık bot) maçları HER ZAMAN serbest (Ida, 24 Eyl 2026).
-- İstemci Dereceli gönderse de sunucu açık botlu Klasik/Düello'yu serbest kurar: lig puanı yok,
-- coin serbest oranında (açık bot yarım ödül kuralı değişmedi; indirimler çarpılmaz, en düşüğü).
-- Değişen: hemen_bot_mac_sec, hemen_bot_mac (yalnız açık bot kurar), duello_davet_et.

CREATE OR REPLACE FUNCTION public.hemen_bot_mac_sec(p_bot uuid, p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_kat text;
begin
  -- 440 (Ida, 24 Eyl 2026): açık botla antrenman her zaman serbest; botla lig puanı kasılamaz.
  if exists (select 1 from public.profiles b where b.id = p_bot and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('hemen_bot_mac', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  -- Zaten aktif maçı varsa oraya döndür (çift maç açılmasın).
  select m.id into v_id from public.matches m
   where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
   limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  -- Seçilen kimlik gerçekten açık ve aktif bir bot mu? (istemciye güvenme)
  if not exists (
    select 1 from public.profiles p
     where p.id = p_bot and p.is_bot and coalesce(p.bot_aktif, true)
       and public.acik_bot_mu(p.is_bot, p.bot_turu)
  ) then
    raise exception 'Bu bot şu an oynanamıyor.';
  end if;

  perform public.mac_kotasi_kontrol();

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );

  delete from public.matchmaking_queue where user_id = auth.uid();

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), p_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()], p_serbest_klasik => not coalesce(p_dereceli, true)),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.hemen_bot_mac(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_bot uuid;
  v_kat text;
  v_lig int;
begin
  -- 440 (Ida, 24 Eyl 2026): açık botla antrenman her zaman serbest; botla lig puanı kasılamaz.
  p_dereceli := false;   -- bu yol yalnız açık bot kurar
  perform public.hiz_siniri('hemen_bot_mac', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  -- Zaten aktif maçı varsa oraya döndür (çift maç açılmasın).
  select m.id into v_id from public.matches m
   where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
   limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  perform public.mac_kotasi_kontrol();

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );

  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig
    from public.profiles where id = auth.uid();
  v_lig := coalesce(v_lig, 1);

  -- Seviyesi en yakın AÇIK bot. Eşitlikte rastgele: hep aynı bot gelmesin.
  select p.id into v_bot
    from public.profiles p
   where p.is_bot and coalesce(p.bot_aktif, true)
     and coalesce(p.bot_turu, 'acik') = 'acik'
   order by abs(public.lig_sirasi(coalesce(p.lig, 'bronz')) - v_lig), random()
   limit 1;

  -- Açık bot havuzu boşsa oyuncu düğmeye bassın da bir şey olsun:
  -- gizli bot seçicisine düşülür (mevcut mantık, yeni algoritma değil).
  if v_bot is null then
    v_bot := public.bot_sec(auth.uid());
  end if;
  if v_bot is null then
    raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.';
  end if;

  delete from public.matchmaking_queue where user_id = auth.uid();

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), v_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()], p_serbest_klasik => not coalesce(p_dereceli, true)),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;

  return v_id;
end;
$function$
;

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
$function$
;
