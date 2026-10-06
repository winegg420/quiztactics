-- 980 geri alma: Ortak Hazine sunucu metinleri → eski 'Kasa' metinleri (canlı tanım, 6 Eki 2026, 980 öncesi)
CREATE OR REPLACE FUNCTION public.bildirim_yaz(p_user uuid, p_tip text, p_metin text, p_yol text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_bot boolean;
  v_baslik text;
begin
  if p_user is null then return; end if;

  select coalesce(is_bot, false) into v_bot from public.profiles where id = p_user;
  if coalesce(v_bot, false) then return; end if;

  insert into public.bildirimler (user_id, tip, metin, yol)
  values (p_user, p_tip, p_metin, p_yol);

  v_baslik := case p_tip
    when 'mac_daveti'      then '⚔️ Meydan okuma!'
    when 'meydan_kabul'    then '🔥 Meydan okuman kabul edildi!'
    when 'rovans'          then '⚔️ Rövanş isteği'
    when 'grup_daveti'     then '👥 Grup maçı daveti'
    when 'grup_kabul'      then '👥 Grup maçın başlıyor!'
    when 'hizli_daveti'    then '⚡ Hızlı maç daveti'
    when 'duello_daveti'   then '⚔️ Düello daveti'
    when 'duello_kabul'    then '🔥 Düello kabul edildi'
    when 'kasa_daveti'     then '💰 Kasa daveti'
    when 'kasa_kabul'      then '🔥 Kasa daveti kabul edildi'
    when 'sira_sende'      then '⏳ Sıra sende!'
    when 'arkadas_istek'   then '🤝 Arkadaşlık isteği'
    when 'arkadas_kabul'   then '🎉 Yeni arkadaş'
    when 'gecildin'        then '⚡ Sıran düştü'
    when 'hafta_sonuc'     then '🏆 Hafta bitti'
    when 'ustalik'         then '🎖️ Ustalık'
    when 'seri'            then '🔥 Serin'
    when 'lige_girdin'     then '🏙️ Ligdesin'
    else 'Quiz Tactics'
  end;

  begin
    perform net.http_post(
      url := 'https://zfpnxzybcpkxsotwdsey.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'x-cron-secret', public.gizli_al('cron_secret'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_ids', jsonb_build_array(p_user),
        'baslik', v_baslik,
        'govde', p_metin,
        'url', coalesce(p_yol, '/bildim')
      )
    );
  exception when others then
    null;
  end;
end;
$function$
;

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
    raise exception 'Devam eden bir Kasa maçı var';
  end if;
  if exists (select 1 from public.kasa_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir Kasa davetin zaten var';
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
      coalesce(v_ad, 'Bir oyuncu') || ' seni Kasa maçına çağırdı!', '/bildim/kasa');
  end if;
  return jsonb_build_object('davet_id', v_davet, 'kasa_id', v_kasa);
end $function$
;

CREATE OR REPLACE FUNCTION public.kasa_davet_cevap(p_id uuid, p_kabul boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  d public.kasa_davetleri%rowtype;
  v_kasa uuid;
  v_ad text;
begin
  perform public.hiz_siniri('kasa_davet_cevap', 60, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.kasa_davetleri where id = p_id for update;
  if not found then raise exception 'Davet bulunamadı'; end if;
  if d.rakip <> v_me then raise exception 'Bu davet sana ait değil'; end if;
  if d.durum <> 'bekliyor' then raise exception 'Davet zaten yanıtlanmış'; end if;

  if not coalesce(p_kabul, false) then
    update public.kasa_davetleri set durum = 'red', yanit_at = now() where id = p_id;
    return null;
  end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if exists (select 1 from public.kasa_maclari
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or d.kuran in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir Kasa maçı var';
  end if;
  perform public.davet_kabul_kontrol(d.kuran);
  perform public.mac_kotasi_kontrol();

  v_kasa := public.kasa_olustur(d.kuran, v_me, d.dereceli, true);
  update public.kasa_davetleri set durum = 'kabul', kasa_id = v_kasa, yanit_at = now() where id = p_id;
  select gorunen_ad into v_ad from public.profiles where id = v_me;
  perform public.bildirim_yaz(d.kuran, 'kasa_kabul',
    coalesce(v_ad, 'Rakibin') || ' Kasa davetini kabul etti - maç başlıyor!', '/bildim/kasa/' || v_kasa::text);
  return v_kasa;
end $function$
;

