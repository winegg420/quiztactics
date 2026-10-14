-- 1100 geri alma: iki fonksiyon 1100 öncesi canlı gövdesine döner (14 Eki 2026 dökümü); yardımcı kaldırılır.
CREATE OR REPLACE FUNCTION public.grup_mac_nabiz(p_group_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, hazir_sayisi integer, toplam_oyuncu integer, bekleyenler text[], duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $function$
#variable_conflict use_column
declare
  gm public.group_matches%rowtype;
  v_ben_hazir boolean;
  v_hazir int;
  v_toplam int;
  v_kopuk int;
  v_bekleyenler text[];
  v_duraklama int := 0;
  v_kilit boolean := true;   -- 1056
  v_bagli int;              -- 1092: nabzı taze insan oyuncu
begin
  -- 1056: maç satırı 2 sn'de kilitlenemezse kilitsiz okuma (yalnız görünüm + kendi nabzın);
  -- başlatma/duraklatma/terk geçişleri yalnız kilidi alan çağrıda yapılır.
  begin
    select * into gm from public.group_matches where id = p_group_match_id for update;
  exception when lock_not_available then
    v_kilit := false;
    select * into gm from public.group_matches where id = p_group_match_id;
  end;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.group_match_players
    where group_match_id = p_group_match_id and user_id = auth.uid()
  ) then raise exception 'Bu maçta değilsin'; end if;

  begin
    update public.group_match_players
       set nabiz_at = now(),
           hazir = hazir or coalesce(p_hazir, false)
     where group_match_id = p_group_match_id and user_id = auth.uid();
  exception when lock_not_available then null;   -- 1056: nabız bir sonraki tikte yazılır
  end;

  select count(*),
         count(*) filter (where gp.hazir or (coalesce(pr.is_bot, false)
                            and public.bot_hazir_mi(pr.id, gp.joined_at, p_group_match_id::text))),
         count(*) filter (where not coalesce(pr.is_bot, false)
                            and coalesce(gp.nabiz_at, '-infinity'::timestamptz)
                                <= now() - interval '12 seconds'),
         coalesce(array_agg(pr.gorunen_ad) filter (
           where not coalesce(pr.is_bot, false)
             and coalesce(gp.nabiz_at, '-infinity'::timestamptz) <= now() - interval '12 seconds'
         ), '{}'::text[])
    into v_toplam, v_hazir, v_kopuk, v_bekleyenler
    from public.group_match_players gp
    join public.profiles pr on pr.id = gp.user_id
   where gp.group_match_id = p_group_match_id
     and gp.davet_durumu = 'kabul'
     and gp.terk_at is null;

  select (hazir or coalesce((select is_bot from public.profiles where id = auth.uid()), false))
    into v_ben_hazir
    from public.group_match_players
   where group_match_id = p_group_match_id and user_id = auth.uid();

  if not v_kilit then
    null;   -- 1056: geçiş yok, yalnız görünüm
  elsif gm.durum = 'aktif' and not gm.basladi then
    -- 1092: lobi başı (ilk nabız) bir kez yazılır. Klasik'teki gibi loadout_secim_sn (20) dolunca maç bağlı oyuncularla
    -- başlar; hiç gelmeyen oyuncu başladıktan sonra mevcut kopukluk akışına düşer (12 sn → duraklat, 45 sn → terk).
    if gm.lobi_bas is null then
      update public.group_matches set lobi_bas = now() where id = p_group_match_id;
      gm.lobi_bas := now();
    end if;
    v_bagli := v_toplam - v_kopuk - (select count(*)::int from public.group_match_players gp join public.profiles pr on pr.id = gp.user_id
                                      where gp.group_match_id = p_group_match_id and gp.davet_durumu = 'kabul' and gp.terk_at is null
                                        and coalesce(pr.is_bot, false));
    if v_toplam > 0 and ((v_hazir >= v_toplam and v_kopuk = 0)
        or (v_bagli > 0 and now() >= gm.lobi_bas + make_interval(secs => public.ayar_sayi('loadout_secim_sn', 20)))) then
      update public.group_matches
         set basladi = true, aktif_soru = 0, soru_baslangic = now()
       where id = p_group_match_id;
      select * into gm from public.group_matches where id = p_group_match_id;
    end if;

  elsif gm.durum = 'aktif' and gm.basladi then
    if v_kopuk > 0 and gm.duraklatildi_at is null then
      update public.group_matches set duraklatildi_at = now() where id = p_group_match_id;
      select * into gm from public.group_matches where id = p_group_match_id;

    elsif v_kopuk = 0 and gm.duraklatildi_at is not null then
      update public.group_matches
         set soru_baslangic = soru_baslangic + (now() - gm.duraklatildi_at),
             duraklatildi_at = null
       where id = p_group_match_id;
      select * into gm from public.group_matches where id = p_group_match_id;

    elsif v_kopuk > 0 and gm.duraklatildi_at is not null
          and now() > gm.duraklatildi_at + interval '45 seconds' then
      update public.group_match_players gp
         set terk_at = now()
        from public.profiles pr
       where gp.group_match_id = p_group_match_id
         and pr.id = gp.user_id
         and gp.davet_durumu = 'kabul'
         and gp.terk_at is null
         and not coalesce(pr.is_bot, false)
         and coalesce(gp.nabiz_at, '-infinity'::timestamptz) <= now() - interval '12 seconds';

      update public.group_matches
         set soru_baslangic = soru_baslangic + (now() - gm.duraklatildi_at),
             duraklatildi_at = null
       where id = p_group_match_id;

      if (select count(*) from public.group_match_players
           where group_match_id = p_group_match_id
             and davet_durumu = 'kabul' and terk_at is null) <= 1 then
        -- 460: tek oyuncu kaldı → maç biter, kalan kazanır (terk kuralı)
        perform public.grup_tek_kalan_bitir(p_group_match_id);
      end if;
      select * into gm from public.group_matches where id = p_group_match_id;
      v_kopuk := 0;
      v_bekleyenler := '{}'::text[];
    end if;
  end if;

  if gm.duraklatildi_at is not null then
    v_duraklama := greatest(0, extract(epoch from (now() - gm.duraklatildi_at))::int);
  end if;

  return query select gm.durum, gm.basladi, coalesce(v_ben_hazir, false), v_hazir, v_toplam,
                      v_bekleyenler, (gm.duraklatildi_at is not null), v_duraklama,
                      gm.soru_baslangic, now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_group_match_answer(p_group_match_id uuid, p_cevap smallint, p_soru_index integer DEFAULT NULL::integer)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gm public.group_matches%rowtype;
  q public.questions%rowtype;
  v_dogru boolean;
  v_puan int;
  v_soru_id uuid;
  v_bas timestamptz;
begin
  perform public.hiz_siniri('submit_group_match_answer', 60, interval '60 seconds');
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.group_match_players
    where group_match_id = p_group_match_id and user_id = auth.uid() and davet_durumu = 'kabul'
  ) then
    raise exception 'Bu maçta değilsin';
  end if;
  if gm.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
  -- 329: istemci hangi soruyu cevapladığını söyler; soru değiştiyse (eski kart) reddedilir.
  if p_soru_index is not null and p_soru_index <> gm.aktif_soru then raise exception 'Soru değişti, tekrar dene'; end if;

  v_soru_id := public.soru_id_coz('grup', p_group_match_id, auth.uid(), gm.aktif_soru, gm.soru_ids[gm.aktif_soru + 1]);
  v_bas := public.soru_baslangic_coz('grup', p_group_match_id, auth.uid(), gm.aktif_soru, gm.soru_baslangic);

  -- 991: süre içinde tıklanıp geç varan cevap kabul
  if not public.cevap_gec_kabul(v_bas + interval '15 seconds', interval '1 second', public.ayar_ondalik('cevap_gec_varis_sn', 5)) then raise exception 'Süre doldu'; end if;

  select * into q from public.questions where id = v_soru_id;
  v_dogru := (p_cevap = q.dogru_cevap);
  -- Zorluk kalibrasyonu: dogru oranini biriktir (bkz. migration 147).
  perform public.soru_sayac(q.id, v_dogru);

  insert into public.group_match_answers (group_match_id, user_id, soru_index, cevap, dogru)
  values (p_group_match_id, auth.uid(), gm.aktif_soru, p_cevap, v_dogru);

  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;

  if v_dogru then
    -- HIZ BONUSU YOK: dogru = sabit 10 puan (bkz. migration 143).
    v_puan := 10;
    update public.group_match_players
       set skor = skor + v_puan
     where group_match_id = p_group_match_id and user_id = auth.uid();
  end if;

  -- 1088: son insan cevapladıysa botlar hemen cevaplar (bot_grup_mac_tik hatayı kendi içinde yutar)
  perform public.bot_grup_mac_tik(p_group_match_id);

  return query select v_dogru, q.dogru_cevap;
end;
$function$;

drop function if exists public.grup_mac_nabiz_sayim(uuid);
