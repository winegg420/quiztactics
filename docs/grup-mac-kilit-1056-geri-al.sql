-- 1056 GERİ ALMA — elle çalıştırılır (begin/commit yok, provada çalıştırılmaz).
-- hizli_tik işini eski komuta döndürür ve 1056 öncesi tanımları geri yükler.
select cron.alter_job(j.jobid, command := 'select public.cron_hizli_tik()')
  from cron.job j where j.jobname = 'hizli_tik';

CREATE OR REPLACE FUNCTION public.advance_group_match(p_group_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gm public.group_matches%rowtype;
  v_toplam_oyuncu int;
  v_cevap_sayisi int;
  v_kazanan uuid;
  v_en_yuksek int;
  v_kazanan_sayisi int;
  v_oyuncu uuid;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_seri int;
  v_tarih date;
  v_yeni_seri int;
  v_bonus int;
  v_odul int;
begin
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found or gm.durum <> 'aktif' then return; end if;
  -- Hazır kapısı ve kopma kilidi (bkz. grup_mac_nabiz)
  if not coalesce(gm.basladi, true) then return; end if;
  if gm.duraklatildi_at is not null then return; end if;

  select count(*) into v_toplam_oyuncu
  from public.group_match_players
  where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null;

  select count(*) into v_cevap_sayisi
  from public.group_match_answers
  where group_match_id = p_group_match_id and soru_index = gm.aktif_soru;

  -- Soru Degistir jokeri: kisisel sayaci dolmamis oyuncu beklenir
  if v_cevap_sayisi < v_toplam_oyuncu
     and now() < public.soru_son_baslangic('grup', p_group_match_id, gm.aktif_soru, gm.soru_baslangic)
                 + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then   -- 991
    return;
  end if;

  if gm.aktif_soru + 1 >= coalesce(array_length(gm.soru_ids, 1), 0) then
    select max(skor) into v_en_yuksek
    from public.group_match_players
    where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null;

    select count(*) into v_kazanan_sayisi
    from public.group_match_players
    where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null and skor = v_en_yuksek;

    if v_kazanan_sayisi = 1 then
      select user_id into v_kazanan
      from public.group_match_players
      where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null and skor = v_en_yuksek;
    else
      v_kazanan := null; -- birden fazla kişi en yüksek skorda: berabere
    end if;

    update public.group_matches
       set durum = 'bitti', kazanan = v_kazanan, bitis = now()
     where id = p_group_match_id;

    -- GRUP MAÇI = ÖDÜLSÜZ ARKADAŞ MODU (Paket 14, 3.5): coin yok, lig puanı yok,
    -- günlük seri bonusu yok. Yalnız rozetler verilir.
    if v_kazanan is not null then
      perform public.award_badge(v_kazanan, 'ilk_galibiyet');
      if (select count(*) from public.group_match_answers
          where group_match_id = p_group_match_id and user_id = v_kazanan and dogru)
         >= coalesce(array_length(gm.soru_ids, 1), 0) then
        perform public.award_badge(v_kazanan, 'tam_isabet');
      end if;
    end if;

  else
    update public.group_matches
       set aktif_soru = aktif_soru + 1, soru_baslangic = now() + public.soru_gosterim_payi()   -- 326
     where id = p_group_match_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.matches%rowtype;
  v_kazanan uuid;
  v_kaybeden uuid;
  v_toplam int;
  v_ikisi_bitti boolean;
  v_terk boolean;
  v_cevap_sayisi int;
  v_yeni int;
  v_bas timestamptz;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.durum <> 'aktif' then return; end if;
  if auth.uid() is not null and auth.uid() not in (m.oyuncu1, m.oyuncu2) then return; end if;

  v_toplam := coalesce(array_length(m.soru_ids, 1), 0);

  -- 460 (terk kuralı): bota karşı başlamış maçta insan oyuncunun nabzı 57 sn (12 sn kopukluk +
  -- 45 sn bekleme — insan-insan maçındaki mac_nabiz kuralıyla aynı) gelmediyse maçı terk etmiş
  -- sayılır: bot kazanır, terk eden ödül almaz. (İnsan-insan maçında bunu mac_nabiz yapar.)
  if coalesce(m.senkron, false) and m.basladi and m.terk_eden is null then
    select case
             when coalesce(p1.is_bot, false) and not coalesce(p2.is_bot, false)
                  and coalesce(m.oyuncu2_hazir_at, '-infinity'::timestamptz) < now() - interval '57 seconds' then m.oyuncu2
             when coalesce(p2.is_bot, false) and not coalesce(p1.is_bot, false)
                  and coalesce(m.oyuncu1_hazir_at, '-infinity'::timestamptz) < now() - interval '57 seconds' then m.oyuncu1
           end
      into v_kaybeden
      from public.profiles p1, public.profiles p2
     where p1.id = m.oyuncu1 and p2.id = m.oyuncu2;
    if v_kaybeden is not null then
      update public.matches set terk_eden = v_kaybeden where id = p_match_id;
      perform public.mac_sonuclandir(p_match_id,
        case when v_kaybeden = m.oyuncu1 then m.oyuncu2 else m.oyuncu1 end, v_kaybeden);
      return;
    end if;
  end if;

  if coalesce(m.senkron, false) then
    if not m.basladi or m.soru_baslangic is null then return; end if;
    if m.duraklatildi_at is not null then return; end if;
    if now() < m.soru_baslangic - public.soru_gosterim_payi() then return; end if;   -- 326: gösterim payı içinde cevaplanabilir

    if m.aktif_soru < v_toplam then
      select count(*) into v_cevap_sayisi
        from public.match_answers a
       where a.match_id = p_match_id and a.soru_index = m.aktif_soru;

      v_bas := public.soru_son_baslangic('1v1', p_match_id, m.aktif_soru, m.soru_baslangic);
      -- 991: cevaplamayan oyuncu (süre dolumu bildirmemişse) bitiş + geç varış payı kadar beklenir
      if v_cevap_sayisi < 2 and now() <= v_bas + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then
        return;
      end if;

      v_yeni := m.aktif_soru + 1;
      update public.matches
         set aktif_soru = v_yeni,
             soru_baslangic = now() + public.soru_gosterim_payi(),   -- 326
             oyuncu1_soru = v_yeni,
             oyuncu2_soru = v_yeni,
             oyuncu1_baslangic = null,
             oyuncu2_baslangic = null,
             oyuncu1_bitti_at = case when v_yeni >= v_toplam then now() else oyuncu1_bitti_at end,
             oyuncu2_bitti_at = case when v_yeni >= v_toplam then now() else oyuncu2_bitti_at end
       where id = p_match_id;

      if v_yeni < v_toplam then return; end if;
    end if;
  else
    v_ikisi_bitti := (m.oyuncu1_soru >= v_toplam and m.oyuncu2_soru >= v_toplam);
    v_terk := (
      (m.oyuncu1_soru >= v_toplam or m.oyuncu2_soru >= v_toplam)
      and coalesce(m.oyuncu1_bitti_at, m.oyuncu2_bitti_at) < now() - interval '24 hours'
    );
    if not (v_ikisi_bitti or v_terk) then
      return;
    end if;
  end if;

  select * into m from public.matches where id = p_match_id;
  if m.oyuncu1_skor > m.oyuncu2_skor then v_kazanan := m.oyuncu1; v_kaybeden := m.oyuncu2;
  elsif m.oyuncu2_skor > m.oyuncu1_skor then v_kazanan := m.oyuncu2; v_kaybeden := m.oyuncu1;
  else v_kazanan := null; v_kaybeden := null;
  end if;

  perform public.mac_sonuclandir(p_match_id, v_kazanan, v_kaybeden);
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_hizli_mac(p_hizli_mac_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  hm public.hizli_maclar%rowtype;
  v_toplam_oyuncu int;
  v_cevap_sayisi int;
  v_kazanan uuid;
  v_en_yuksek int;
  v_kazanan_sayisi int;
  v_oyuncu uuid;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_seri int;
  v_tarih date;
  v_yeni_seri int;
  v_bonus int;
  v_odul int;
begin
  select * into hm from public.hizli_maclar where id = p_hizli_mac_id for update;
  if not found or hm.durum <> 'aktif' then return; end if;
  -- Hazır kapısı ve kopma kilidi (bkz. hizli_mac_nabiz)
  if not coalesce(hm.basladi, true) then return; end if;
  if hm.duraklatildi_at is not null then return; end if;

  select count(*) into v_toplam_oyuncu
  from public.hizli_oyuncular
  where hizli_mac_id = p_hizli_mac_id and davet_durumu = 'kabul' and terk_at is null;

  select count(*) into v_cevap_sayisi
  from public.hizli_cevaplar
  where hizli_mac_id = p_hizli_mac_id and soru_index = hm.aktif_soru;

  -- Soru Degistir jokeri: kisisel sayaci dolmamis oyuncu beklenir
  if v_cevap_sayisi < v_toplam_oyuncu
     and now() < public.soru_son_baslangic('hizli', p_hizli_mac_id, hm.aktif_soru, hm.soru_baslangic) + interval '16 seconds' then
    return;
  end if;

  if hm.aktif_soru + 1 >= coalesce(array_length(hm.soru_ids, 1), 0) then
    select max(skor) into v_en_yuksek
    from public.hizli_oyuncular
    where hizli_mac_id = p_hizli_mac_id and davet_durumu = 'kabul' and terk_at is null;

    select count(*) into v_kazanan_sayisi
    from public.hizli_oyuncular
    where hizli_mac_id = p_hizli_mac_id and davet_durumu = 'kabul' and terk_at is null and skor = v_en_yuksek;

    if v_kazanan_sayisi = 1 and v_en_yuksek > 0 then
      select user_id into v_kazanan
      from public.hizli_oyuncular
      where hizli_mac_id = p_hizli_mac_id and davet_durumu = 'kabul' and terk_at is null and skor = v_en_yuksek;
    else
      v_kazanan := null; -- berabere veya kimse puan almadı
    end if;

    update public.hizli_maclar
       set durum = 'bitti', kazanan = v_kazanan, bitis = now()
     where id = p_hizli_mac_id;

    -- COİN ödülü (bkz. coin_mac_odulu)
    perform public.coin_mac_odulu(
      p_hizli_mac_id::text, v_kazanan,
      (select coalesce(array_agg(user_id), '{}'::uuid[])
         from public.hizli_oyuncular
        where hizli_mac_id = p_hizli_mac_id
          and davet_durumu = 'kabul' and terk_at is null));

    if v_kazanan is not null then
      v_odul := 50; -- 5 kişilik yarış galibi
      update public.profiles
         set puan = puan + v_odul, puan_hafta = puan_hafta + v_odul
       where id = v_kazanan;
      perform public.award_badge(v_kazanan, 'ilk_galibiyet');
    end if;

    -- Günlük seri: insan oyunculara (1v1 ile aynı kural, günde bir kez)
    for v_oyuncu in
      select user_id from public.hizli_oyuncular
      where hizli_mac_id = p_hizli_mac_id and davet_durumu = 'kabul' and terk_at is null
    loop
      select seri, son_seri_tarihi into v_seri, v_tarih
      from public.profiles where id = v_oyuncu and not is_bot;
      if found and v_tarih is distinct from v_bugun then
        v_yeni_seri := case when v_tarih = v_bugun - 1 then v_seri + 1 else 1 end;
        v_bonus := least(v_yeni_seri * 5, 50);
        update public.profiles
           set seri = v_yeni_seri, son_seri_tarihi = v_bugun,
               puan = puan + v_bonus, puan_hafta = puan_hafta + v_bonus
         where id = v_oyuncu;
        if v_yeni_seri >= 3 then perform public.award_badge(v_oyuncu, 'seri_3'); end if;
        if v_yeni_seri >= 7 then perform public.award_badge(v_oyuncu, 'seri_7'); end if;
      end if;
    end loop;
  else
    update public.hizli_maclar
       set aktif_soru = aktif_soru + 1, soru_baslangic = now()
     where id = p_hizli_mac_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_tournament(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t public.tournaments%rowtype;
  v_kalan int;
  v_elenecek int;
  v_kazanan uuid;
  v_en_iyi int;
  v_zirve int;
  v_altin uuid;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.durum <> 'aktif' then return; end if;

  if now() < t.soru_baslangic + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then   -- 991
    if exists (
      select 1 from public.tournament_players tp
      where tp.tournament_id = p_tournament_id and not tp.elendi
        and not exists (
          select 1 from public.tournament_answers ta
          where ta.tournament_id = p_tournament_id
            and ta.user_id = tp.user_id
            and ta.soru_index = t.aktif_soru
        )
    ) then
      return;
    end if;
  end if;

  select count(*) into v_elenecek
  from public.tournament_players tp
  where tp.tournament_id = p_tournament_id and not tp.elendi
    and not exists (
      select 1 from public.tournament_answers ta
      where ta.tournament_id = p_tournament_id
        and ta.user_id = tp.user_id
        and ta.soru_index = t.aktif_soru
        and ta.dogru
    );

  select count(*) into v_kalan
  from public.tournament_players
  where tournament_id = p_tournament_id and not elendi;

  -- Hayattakilerin HEPSİ yanlış yaptıysa kimse elenmez (berabere tur).
  if v_elenecek < v_kalan then
    update public.tournament_players tp
       set elendi = true, elenme_sorusu = t.aktif_soru
     where tp.tournament_id = p_tournament_id and not tp.elendi
       and not exists (
         select 1 from public.tournament_answers ta
         where ta.tournament_id = p_tournament_id
           and ta.user_id = tp.user_id
           and ta.soru_index = t.aktif_soru
           and ta.dogru
       );
    v_kalan := v_kalan - v_elenecek;
  end if;

  if v_kalan = 1 then
    select user_id into v_kazanan
    from public.tournament_players
    where tournament_id = p_tournament_id and not elendi;

  elsif t.aktif_soru + 1 >= coalesce(array_length(t.soru_ids, 1), 0) then
    -- SORULAR BİTTİ. Tek bir zirve varsa o kazanır; eşitlik varsa ALTIN SORU.
    select max(dogru_sayisi) into v_en_iyi
      from public.tournament_players
     where tournament_id = p_tournament_id and not elendi;

    select count(*) into v_zirve
      from public.tournament_players
     where tournament_id = p_tournament_id and not elendi
       and dogru_sayisi = v_en_iyi;

    if v_zirve = 1 then
      select user_id into v_kazanan
        from public.tournament_players
       where tournament_id = p_tournament_id and not elendi
         and dogru_sayisi = v_en_iyi;
    else
      -- Zirvenin altındakiler elenir, kalanlar altın soruda kapışır.
      update public.tournament_players
         set elendi = true, elenme_sorusu = t.aktif_soru
       where tournament_id = p_tournament_id and not elendi
         and dogru_sayisi < v_en_iyi;

      v_altin := public.turnuva_altin_soru_ekle(p_tournament_id);
      if v_altin is null then
        -- Havuzda tek soru bile kalmadı: en erken katılan kazansın,
        -- turnuva askıda kalmasın.
        select user_id into v_kazanan
          from public.tournament_players
         where tournament_id = p_tournament_id and not elendi
         order by dogru_sayisi desc, joined_at asc
         limit 1;
      end if;
    end if;
  end if;

  if v_kazanan is not null then
    update public.tournaments
       set durum = 'bitti', kazanan = v_kazanan, bitis = now()
     where id = p_tournament_id;
    update public.profiles
       set sampiyonluk = sampiyonluk + 1
     where id = v_kazanan;
    perform public.award_badge(v_kazanan, 'sampiyon');
    perform public.turnuva_odullerini_dagit(p_tournament_id, v_kazanan);
  else
    update public.tournaments
       set aktif_soru = aktif_soru + 1, soru_baslangic = now() + public.soru_gosterim_payi()   -- 326
     where id = p_tournament_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.grup_mac_nabiz(p_group_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, hazir_sayisi integer, toplam_oyuncu integer, bekleyenler text[], duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
begin
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.group_match_players
    where group_match_id = p_group_match_id and user_id = auth.uid()
  ) then raise exception 'Bu maçta değilsin'; end if;

  update public.group_match_players
     set nabiz_at = now(),
         hazir = hazir or coalesce(p_hazir, false)
   where group_match_id = p_group_match_id and user_id = auth.uid();

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

  if gm.durum = 'aktif' and not gm.basladi then
    if v_toplam > 0 and v_hazir >= v_toplam and v_kopuk = 0 then
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

CREATE OR REPLACE FUNCTION public.hizli_mac_nabiz(p_hizli_mac_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, hazir_sayisi integer, toplam_oyuncu integer, bekleyenler text[], duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  hm public.hizli_maclar%rowtype;
  v_ben_hazir boolean;
  v_hazir int;
  v_toplam int;
  v_kopuk int;
  v_bekleyenler text[];
  v_duraklama int := 0;
begin
  select * into hm from public.hizli_maclar where id = p_hizli_mac_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.hizli_oyuncular
    where hizli_mac_id = p_hizli_mac_id and user_id = auth.uid()
  ) then raise exception 'Bu maçta değilsin'; end if;

  update public.hizli_oyuncular
     set nabiz_at = now(),
         hazir = hazir or coalesce(p_hazir, false)
   where hizli_mac_id = p_hizli_mac_id and user_id = auth.uid();

  select count(*),
         -- ESKİDEN: `or coalesce(pr.is_bot,false)` — bot 0. saniyede hazırdı.
         count(*) filter (where ho.hazir or (coalesce(pr.is_bot, false)
                            and public.bot_hazir_mi(pr.id, ho.joined_at, p_hizli_mac_id::text))),
         count(*) filter (where not coalesce(pr.is_bot, false)
                            and coalesce(ho.nabiz_at, '-infinity'::timestamptz)
                                <= now() - interval '12 seconds'),
         coalesce(array_agg(pr.gorunen_ad) filter (
           where not coalesce(pr.is_bot, false)
             and coalesce(ho.nabiz_at, '-infinity'::timestamptz) <= now() - interval '12 seconds'
         ), '{}'::text[])
    into v_toplam, v_hazir, v_kopuk, v_bekleyenler
    from public.hizli_oyuncular ho
    join public.profiles pr on pr.id = ho.user_id
   where ho.hizli_mac_id = p_hizli_mac_id
     and ho.davet_durumu = 'kabul'
     and ho.terk_at is null;

  select (hazir or coalesce((select is_bot from public.profiles where id = auth.uid()), false))
    into v_ben_hazir
    from public.hizli_oyuncular
   where hizli_mac_id = p_hizli_mac_id and user_id = auth.uid();

  if hm.durum = 'aktif' and not hm.basladi then
    if v_toplam > 0 and v_hazir >= v_toplam and v_kopuk = 0 then
      update public.hizli_maclar
         set basladi = true, aktif_soru = 0, soru_baslangic = now()
       where id = p_hizli_mac_id;
      select * into hm from public.hizli_maclar where id = p_hizli_mac_id;
    end if;

  elsif hm.durum = 'aktif' and hm.basladi then
    if v_kopuk > 0 and hm.duraklatildi_at is null then
      update public.hizli_maclar set duraklatildi_at = now() where id = p_hizli_mac_id;
      select * into hm from public.hizli_maclar where id = p_hizli_mac_id;

    elsif v_kopuk = 0 and hm.duraklatildi_at is not null then
      update public.hizli_maclar
         set soru_baslangic = soru_baslangic + (now() - hm.duraklatildi_at),
             duraklatildi_at = null
       where id = p_hizli_mac_id;
      select * into hm from public.hizli_maclar where id = p_hizli_mac_id;

    elsif v_kopuk > 0 and hm.duraklatildi_at is not null
          and now() > hm.duraklatildi_at + interval '45 seconds' then
      update public.hizli_oyuncular ho
         set terk_at = now()
        from public.profiles pr
       where ho.hizli_mac_id = p_hizli_mac_id
         and pr.id = ho.user_id
         and ho.davet_durumu = 'kabul'
         and ho.terk_at is null
         and not coalesce(pr.is_bot, false)
         and coalesce(ho.nabiz_at, '-infinity'::timestamptz) <= now() - interval '12 seconds';

      update public.hizli_maclar
         set soru_baslangic = soru_baslangic + (now() - hm.duraklatildi_at),
             duraklatildi_at = null
       where id = p_hizli_mac_id;

      if (select count(*) from public.hizli_oyuncular
           where hizli_mac_id = p_hizli_mac_id
             and davet_durumu = 'kabul' and terk_at is null) <= 1 then
        perform public.advance_hizli_mac(p_hizli_mac_id);
      end if;
      select * into hm from public.hizli_maclar where id = p_hizli_mac_id;
      v_kopuk := 0;
      v_bekleyenler := '{}'::text[];
    end if;
  end if;

  if hm.duraklatildi_at is not null then
    v_duraklama := greatest(0, extract(epoch from (now() - hm.duraklatildi_at))::int);
  end if;

  return query select hm.durum, hm.basladi, coalesce(v_ben_hazir, false), v_hazir, v_toplam,
                      v_bekleyenler, (hm.duraklatildi_at is not null), v_duraklama,
                      hm.soru_baslangic, now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.mac_nabiz(p_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, rakip_hazir boolean, rakip_baglantili boolean, duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, terk_eden uuid, lobi_saniye integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  m public.matches%rowtype;
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_hazir boolean;
  v_ben_hazir boolean;
  v_rakip_bagli boolean;
  v_duraklama int := 0;
  v_terk uuid;
  v_geri_sayim int := public.ayar_sayi('mac_geri_sayim_sn', 3)::int;
  v_sayim_payi interval := make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0);   -- 651
  v_loadout int := public.ayar_sayi('loadout_secim_sn', 20)::int;
  v_lobi int := 0;
  v_lobi_bas timestamptz;
  v_sure_doldu boolean := false;
  v_baglanma int := public.ayar_sayi('klasik_baglanma_sn', 15)::int;   -- 441
  v_baglanma_doldu boolean := false;
  v_rakip_hic_gelmedi boolean := false;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;

  v_ben_p1 := (m.oyuncu1 = auth.uid());
  v_rakip := case when v_ben_p1 then m.oyuncu2 else m.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;

  -- Eski (asenkron) maç: kapı ve kilit yok.
  if not coalesce(m.senkron, false) then
    return query select m.durum, true, true, true, true, false, 0,
                        m.soru_baslangic, now(), m.terk_eden, 0;
    return;
  end if;

  if v_ben_p1 then
    update public.matches
       set oyuncu1_hazir_at = now(),
           oyuncu1_hazir = oyuncu1_hazir or coalesce(p_hazir, false),
           lobi_baslangic = coalesce(lobi_baslangic, now())
     where id = p_match_id;
  else
    update public.matches
       set oyuncu2_hazir_at = now(),
           oyuncu2_hazir = oyuncu2_hazir or coalesce(p_hazir, false),
           lobi_baslangic = coalesce(lobi_baslangic, now())
     where id = p_match_id;
  end if;
  select * into m from public.matches where id = p_match_id;

  v_ben_hazir := case when v_ben_p1 then m.oyuncu1_hazir else m.oyuncu2_hazir end;
  v_rakip_hazir := (coalesce(v_rakip_bot, false)
                    and public.bot_hazir_mi(v_rakip, m.lobi_baslangic, p_match_id::text))
    or (case when v_ben_p1 then m.oyuncu2_hazir else m.oyuncu1_hazir end);
  v_rakip_bagli := coalesce(v_rakip_bot, false) or
    coalesce(case when v_ben_p1 then m.oyuncu2_hazir_at else m.oyuncu1_hazir_at end,
             '-infinity'::timestamptz) > now() - interval '12 seconds';

  -- 410: lobi başı — davet kabulünden önceki nabızlar sayılmaz.
  v_lobi_bas := greatest(m.lobi_baslangic, coalesce(m.kabul_at, m.lobi_baslangic));
  v_sure_doldu := v_lobi_bas is not null and v_loadout > 0
                  and now() >= v_lobi_bas + make_interval(secs => v_loadout);

  -- 441: rakip kapıya HİÇ gelmediyse (tek nabız yok) bekleme klasik_baglanma_sn (15); loadout süresi ayrı (20).
  v_baglanma_doldu := v_lobi_bas is not null and v_baglanma > 0
                      and now() >= v_lobi_bas + make_interval(secs => v_baglanma);
  v_rakip_hic_gelmedi := not coalesce(v_rakip_bot, false)
    and (case when v_ben_p1 then m.oyuncu2_hazir_at else m.oyuncu1_hazir_at end) is null;

  if m.durum = 'aktif' and not m.basladi then
    if v_rakip_bagli and ((v_ben_hazir and v_rakip_hazir) or v_sure_doldu) then
      -- 410: süre dolduysa iki taraf da hazır sayılır (son kayıtlı set kullanılır).
      update public.matches
         set basladi = true, aktif_soru = 0,
             oyuncu1_hazir = true, oyuncu2_hazir = true,
             soru_baslangic = now() + (v_geri_sayim || ' seconds')::interval + v_sayim_payi,   -- 651
             oyuncu1_soru = 0, oyuncu2_soru = 0,
             oyuncu1_baslangic = null, oyuncu2_baslangic = null
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;
      v_ben_hazir := true;
      v_rakip_hazir := true;

    elsif ((v_sure_doldu and not v_rakip_bagli) or (v_baglanma_doldu and v_rakip_hic_gelmedi))
          and m.kabul_at is null then
      -- 410: eşleştirme maçı, rakip bağlanmadı → CEZASIZ iptal (mac_sonuclandir çağrılmaz:
      -- kazanan/puan/coin/lig/XP yok; bildirim yok).
      update public.matches
         set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;
    end if;

  elsif m.durum = 'aktif' and m.basladi then
    if not v_rakip_bagli and m.duraklatildi_at is null then
      update public.matches set duraklatildi_at = now() where id = p_match_id;
      select * into m from public.matches where id = p_match_id;

    elsif v_rakip_bagli and m.duraklatildi_at is not null then
      update public.matches
         set soru_baslangic = soru_baslangic + (now() - m.duraklatildi_at),
             duraklatildi_at = null
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;

    elsif not v_rakip_bagli and m.duraklatildi_at is not null
          and now() > m.duraklatildi_at + interval '45 seconds' then
      update public.matches set terk_eden = v_rakip where id = p_match_id;
      perform public.mac_sonuclandir(p_match_id, auth.uid(), v_rakip);
      select * into m from public.matches where id = p_match_id;
    end if;
  end if;

  if m.duraklatildi_at is not null then
    v_duraklama := greatest(0, extract(epoch from (now() - m.duraklatildi_at))::int);
  end if;
  if v_lobi_bas is not null and not m.basladi then
    v_lobi := greatest(0, extract(epoch from (now() - v_lobi_bas))::int);
  end if;
  v_terk := m.terk_eden;

  return query select m.durum, m.basladi, v_ben_hazir, v_rakip_hazir, v_rakip_bagli,
                      (m.duraklatildi_at is not null), v_duraklama,
                      m.soru_baslangic, now(), v_terk, v_lobi;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bot_oyna()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  q public.questions%rowtype;
  v_cevap smallint;
  v_dogru boolean;
  v_puan int;
  v_ilk boolean;
  v_bot_index int;
begin
  if not pg_try_advisory_xact_lock(hashtext('bot_oyna')) then return; end if;

  -- 0) Süresi gelen bekleyen bot tepkilerini/mesajlarını gönder (673: gecikmeli kuyruk).
  for r in select * from public.bot_tepki_bekleyen where gonder_zamani <= now() for update skip locked
  loop
    begin
      if r.tur = 'realtime' then
        perform realtime.send(
          jsonb_build_object('id', gen_random_uuid(), 'k', r.icerik, 'u', r.bot),
          'tepki', r.kanal, true);
      elsif r.tur = 'mac_mesaj' then
        insert into public.match_messages (match_id, user_id, mesaj) values (r.hedef_id, r.bot, r.icerik);
      elsif r.tur = 'grup_mesaj' then
        insert into public.group_match_messages (group_match_id, user_id, mesaj) values (r.hedef_id, r.bot, r.icerik);
      end if;
    exception when others then
      raise warning 'bekleyen bot tepkisi gönderilemedi (id=%): %', r.id, sqlerrm;
    end;
    delete from public.bot_tepki_bekleyen where id = r.id;
  end loop;

  -- 1) Botlara gelen meydan okumaları kabul et (kategoriye saygılı)
  for r in
    select m.id, m.kategori, m.oyuncu1, m.dereceli from public.matches m
    join public.profiles p on p.id = m.oyuncu2 and p.is_bot
    where m.durum = 'bekliyor'
      -- GİZLİ bot daveti hemen kabul etmez: insan gibi biraz düşünür.
      -- Açık bot (adı "...Bot") anında kabul eder, oyuncu zaten biliyor.
      and public.bot_daveti_kabul_etti_mi(p.id, m.created_at, m.id::text,
                                          coalesce(p.bot_turu, 'acik'))
    for update of m skip locked
  loop
    update public.matches
       set durum = 'aktif',
           soru_ids = public.soru_sec(r.kategori, 20, array[r.oyuncu1], p_serbest_klasik => not r.dereceli),
           aktif_soru = 0,
           soru_baslangic = now(),
           kabul_at = now()
     where id = r.id;
  end loop;

  -- Paket 31 A.5: Klasik Mod'da bot da saldırı jokeri basar (aynı kurallar)
  perform public.bot_klasik_joker_tik();

  -- 2) Aktif maçlarda cevapla — bot ASLA oyuncunun önüne geçmez.
  --    Bot yalnızca oyuncunun ulaştığı soruyu cevaplar (oyuncunun cevapladığı
  --    en yüksek indeks + 1) ve 2-6 sn arası rastgele gecikmeyle yanıtlar.
  --    (Eski davranış: 3 sn sonra her soruyu cevaplıyordu; 16 sn'lik otomatik
  --     ilerletmeyle birleşince bot 20 soruyu bitirirken oyuncu 2. sorudaydı.)
  for r in
    select m.*, p.id as bot_id, p.bot_isabet,
           case when m.oyuncu1 = p.id then m.oyuncu2 else m.oyuncu1 end as insan_id
    from public.matches m
    join public.profiles p on p.is_bot and p.id in (m.oyuncu1, m.oyuncu2)
    where m.durum = 'aktif'
      -- Botun sira indeksi. SENKRONDA ortak soru (aktif_soru) ile ayni olmali:
      -- bot cevapladiginda kendi indeksi bir ilerler ve sira ortak indeksten
      -- one gecer; boylece ayni soruyu ikinci kez cevaplamaz (cift puan yok).
      and (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)
          < coalesce(array_length(m.soru_ids, 1), 0)
      and (
        not coalesce(m.senkron, false)
        or (m.basladi
            and (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)
                = m.aktif_soru)
      )
      -- Bot, insan oyuncunun ulaştığı sırayı GEÇEMEZ
      and (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)
          <= (case when m.oyuncu1 = p.id then m.oyuncu2_soru else m.oyuncu1_soru end)
      -- 2-6 sn rastgele gecikme (insanın son hamlesinden sonra)
      -- Gecikme artik ZORLUGA BAGLI ve SORU BASINA SABIT (bkz. bot_gecikme_sn).
      -- Paket 31 A: soru değiştiyse / süresi kısaltıldıysa botun KİŞİSEL başlangıcı geçerli
      and (not coalesce(m.senkron, false)
           or now() <= public.soru_baslangic_coz('1v1', m.id, p.id, m.aktif_soru, m.soru_baslangic)
                       + interval '15 seconds')
      -- Paket 32: insanın Sisi sürerken bot da cevaplamaz (simetri)
      and not exists (
        select 1 from public.joker_kullanimlari k
         where k.mac_tur = '1v1' and k.mac_id = m.id and k.soru_index = m.aktif_soru
           and k.tur = 'sis' and k.user_id <> p.id
           and k.created_at + make_interval(secs => public.ayar_sayi('klasik_sis_sn', 3)) > now())
      and now() >= coalesce(public.soru_baslangic_coz('1v1', m.id, p.id,
                     (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end),
                     m.soru_baslangic), m.created_at)
                   + public.bot_gecikme_sn(
                       p.id,
                       m.id::text || ':' ||
                       (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)::text,
                       p.bot_gecikme_min, p.bot_gecikme_max,
                       public.soru_okuma_yuku(
                         m.soru_ids[(case when m.oyuncu1 = p.id
                                          then m.oyuncu1_soru else m.oyuncu2_soru end) + 1])
                     ) * interval '1 second'
    for update of m skip locked
  loop
    v_bot_index := case when r.oyuncu1 = r.bot_id then r.oyuncu1_soru else r.oyuncu2_soru end;
    -- Paket 31 A.1: soru ortak değiştiyse bot da YENİ soruyu cevaplar
    select * into q from public.questions
     where id = public.soru_id_coz('1v1', r.id, r.bot_id, v_bot_index, r.soru_ids[v_bot_index + 1]);
    if not found then continue; end if;

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.match_answers (match_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, v_bot_index, v_cevap, v_dogru)
    on conflict do nothing;

    -- HIZ BONUSU YOK: bot da insanla ayni sabit puani alir
    v_puan := case when v_dogru then 10 else 0 end;

    if r.oyuncu1 = r.bot_id then
      update public.matches
         set oyuncu1_skor = oyuncu1_skor + v_puan,
             oyuncu1_soru = v_bot_index + 1,
             oyuncu1_bitti_at = case
               when v_bot_index + 1 >= coalesce(array_length(r.soru_ids,1),0) then now()
               else oyuncu1_bitti_at end,
             aktif_soru = case when coalesce(r.senkron, false)
                               then aktif_soru else greatest(aktif_soru, v_bot_index + 1) end,
             soru_baslangic = case when coalesce(r.senkron, false)
                                   then soru_baslangic else now() end
       where id = r.id;
    else
      update public.matches
         set oyuncu2_skor = oyuncu2_skor + v_puan,
             oyuncu2_soru = v_bot_index + 1,
             oyuncu2_bitti_at = case
               when v_bot_index + 1 >= coalesce(array_length(r.soru_ids,1),0) then now()
               else oyuncu2_bitti_at end,
             aktif_soru = case when coalesce(r.senkron, false)
                               then aktif_soru else greatest(aktif_soru, v_bot_index + 1) end,
             soru_baslangic = case when coalesce(r.senkron, false)
                                   then soru_baslangic else now() end
       where id = r.id;
    end if;

    perform public.advance_match(r.id);

    -- 673: yeni tepki sistemi bu maçın modunda açıksa bot_tepki_klasik kararı kuyruklar (gecikmeli);
    -- kapalıysa eski yol artık sabit 0.15 değil, bot_eski_tepki_olasilik ile AYNI kuyruğa kuyruklanır.
    if public.bot_tepki_klasik(r.id, r.bot_id, v_dogru) then
      null;
    else
      perform public.bot_eski_tepki_kuyrukla('mac_mesaj', r.id, r.bot_id);
    end if;
  end loop;

  -- 3) Bot maçlarını ilerlet — oyuncu cevaplamadan 16 sn'de ilerletme.
  --    İki koşuldan biri: (a) her ikisi de cevapladı, (b) süre doldu VE oyuncu
  --    bu soruyu cevapladı. Oyuncu maçı terk ederse 90 sn'lik güvenlik ağı
  --    devreye girer (maç sonsuza kadar aktif kalmasın).
  for r in
    select distinct m.id from public.matches m
    join public.profiles p on p.is_bot and p.id in (m.oyuncu1, m.oyuncu2)
    where m.durum = 'aktif'
      and (not coalesce(m.senkron, false) or m.basladi)
      and (
        2 <= (select count(*) from public.match_answers a
              where a.match_id = m.id and a.soru_index = m.aktif_soru)
        or (now() > m.soru_baslangic + interval '16 seconds'
            and exists (
              select 1 from public.match_answers a
              where a.match_id = m.id and a.soru_index = m.aktif_soru
                and a.user_id = (case when m.oyuncu1 = p.id then m.oyuncu2 else m.oyuncu1 end)
            ))
        or now() > m.soru_baslangic + interval '90 seconds'
      )
  loop
    perform public.advance_match(r.id);
  end loop;

  -- 4) Turnuvada hayatta olan botlar cevaplasın
  for r in
    select t.*, p.id as bot_id, p.bot_isabet
    from public.tournaments t
    join public.tournament_players tp on tp.tournament_id = t.id and not tp.elendi
    join public.profiles p on p.id = tp.user_id and p.is_bot
    where t.durum = 'aktif'
      -- Gecikme BOTA OZEL (bkz. bot_gecikme_sn): acik botlar aninda,
      -- gizli botlar lig seviyelerine uygun gercekci surede cevaplar.
      and now() >= t.soru_baslangic + public.bot_gecikme_sn(
            p.id, t.id::text || ':' || t.aktif_soru::text,
            p.bot_gecikme_min, p.bot_gecikme_max,
            public.soru_okuma_yuku(t.soru_ids[t.aktif_soru + 1])) * interval '1 second'
      and now() <= t.soru_baslangic + interval '15 seconds'
      and not exists (
        select 1 from public.tournament_answers ta
        where ta.tournament_id = t.id and ta.user_id = p.id and ta.soru_index = t.aktif_soru
      )
  loop
    select * into q from public.questions where id = r.soru_ids[r.aktif_soru + 1];
    if not found then continue; end if;

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.tournament_answers (tournament_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, r.aktif_soru, v_cevap, v_dogru)
    on conflict do nothing;

    if v_dogru then
      update public.tournament_players
         set dogru_sayisi = dogru_sayisi + 1
       where tournament_id = r.id and user_id = r.bot_id;
    end if;
  end loop;

  -- 5) Turnuvaları ilerlet (süre dolduysa veya hayattaki herkes cevapladıysa)
  for r in
    select t.id from public.tournaments t
    where t.durum = 'aktif'
      and (now() > t.soru_baslangic + interval '16 seconds'
        or not exists (
          select 1 from public.tournament_players tp
          where tp.tournament_id = t.id and not tp.elendi
            and not exists (
              select 1 from public.tournament_answers ta
              where ta.tournament_id = t.id
                and ta.user_id = tp.user_id
                and ta.soru_index = t.aktif_soru
            )
        ))
  loop
    perform public.advance_tournament(r.id);
  end loop;

  -- 6) Botlara giden grup davetlerini kabul et
  for r in
    select gmp.group_match_id, gmp.user_id as bot_id
    from public.group_match_players gmp
    join public.profiles p on p.id = gmp.user_id and p.is_bot
    join public.group_matches gm on gm.id = gmp.group_match_id
    where gm.durum = 'bekliyor' and gmp.davet_durumu = 'bekliyor'
      and public.bot_daveti_kabul_etti_mi(p.id, gmp.joined_at, gmp.group_match_id::text,
                                          coalesce(p.bot_turu, 'acik'))
    for update of gmp skip locked
  loop
    update public.group_match_players
       set davet_durumu = 'kabul'
     where group_match_id = r.group_match_id and user_id = r.bot_id;
  end loop;

  -- 7) Herkes kabul ettiyse grup maçını başlat
  for r in
    select gm.id, gm.kategori from public.group_matches gm
    where gm.durum = 'bekliyor'
      and not exists (
        select 1 from public.group_match_players gmp
        where gmp.group_match_id = gm.id and gmp.davet_durumu <> 'kabul'
      )
    for update of gm skip locked
  loop
    update public.group_matches
       set durum = 'aktif',
           soru_ids = public.soru_sec(r.kategori, 20,
                        (select coalesce(array_agg(gmp.user_id), '{}'::uuid[])
                           from public.group_match_players gmp
                          where gmp.group_match_id = r.id)),
           aktif_soru = 0,
           soru_baslangic = now()
     where id = r.id;
  end loop;

  -- 8) Aktif grup maçlarında botlar cevaplasın (ve ara sıra tepki versin)
  for r in
    select gm.*, p.id as bot_id, p.bot_isabet
    from public.group_matches gm
    join public.group_match_players gmp on gmp.group_match_id = gm.id
      and gmp.davet_durumu = 'kabul' and gmp.terk_at is null
    join public.profiles p on p.id = gmp.user_id and p.is_bot
    where gm.durum = 'aktif' and gm.basladi and gm.duraklatildi_at is null
      -- Gecikme BOTA OZEL (1v1 ve turnuvadaki kuralin aynisi)
      and now() >= gm.soru_baslangic + public.bot_gecikme_sn(
            p.id, gm.id::text || ':' || gm.aktif_soru::text,
            p.bot_gecikme_min, p.bot_gecikme_max,
            public.soru_okuma_yuku(gm.soru_ids[gm.aktif_soru + 1])) * interval '1 second'
      and not exists (
        select 1 from public.group_match_answers a
        where a.group_match_id = gm.id and a.user_id = p.id and a.soru_index = gm.aktif_soru
      )
      -- Bot, insan oyuncularin ulastigi soruyu GECEMEZ (1v1'deki kural)
      and gm.aktif_soru <= 1 + coalesce((
        select max(a2.soru_index)
        from public.group_match_answers a2
        join public.profiles p2 on p2.id = a2.user_id
        where a2.group_match_id = gm.id and not coalesce(p2.is_bot, false)
      ), -1)
    for update of gm skip locked
  loop
    select * into q from public.questions where id = r.soru_ids[r.aktif_soru + 1];
    if not found then continue; end if;

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.group_match_answers (group_match_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, r.aktif_soru, v_cevap, v_dogru)
    on conflict do nothing;

    if v_dogru then
      v_puan := 10;
      update public.group_match_players
         set skor = skor + v_puan
       where group_match_id = r.id and user_id = r.bot_id;
    end if;

    -- 673: sabit 0.15 yerine bot_eski_tepki_olasilik, kuyruklu (1-4 sn gecikme).
    perform public.bot_eski_tepki_kuyrukla('grup_mesaj', r.id, r.bot_id);
  end loop;

  -- 9) Grup maçlarını ilerlet (süre dolduysa veya kabul edenlerin hepsi cevapladıysa)
  for r in
    select gm.id from public.group_matches gm
    where gm.durum = 'aktif' and gm.basladi and gm.duraklatildi_at is null
      and (
        -- herkes cevapladi
        not exists (
          select 1 from public.group_match_players gmp
          where gmp.group_match_id = gm.id and gmp.davet_durumu = 'kabul'
            and gmp.terk_at is null
            and not exists (
              select 1 from public.group_match_answers a
              where a.group_match_id = gm.id and a.user_id = gmp.user_id and a.soru_index = gm.aktif_soru
            )
        )
        -- ya da soru suresi doldu VE en az bir insan bu soruyu fiilen oynadi
        or (now() > gm.soru_baslangic + interval '16 seconds'
            and exists (
              select 1 from public.group_match_answers a3
              join public.profiles p3 on p3.id = a3.user_id
              where a3.group_match_id = gm.id and a3.soru_index = gm.aktif_soru
                and not coalesce(p3.is_bot, false)
            ))
        -- ya da mac terk edildi (guvenlik agi)
        or now() > gm.soru_baslangic + interval '10 minutes'
      )
  loop
    perform public.advance_group_match(r.id);
  end loop;

  -- 10) Botlara giden hızlı maç davetlerini kabul et
  for r in
    select ho.hizli_mac_id, ho.user_id as bot_id
    from public.hizli_oyuncular ho
    join public.profiles p on p.id = ho.user_id and p.is_bot
    join public.hizli_maclar hm on hm.id = ho.hizli_mac_id
    where hm.durum = 'bekliyor' and ho.davet_durumu = 'bekliyor'
      and public.bot_daveti_kabul_etti_mi(p.id, ho.joined_at, ho.hizli_mac_id::text,
                                          coalesce(p.bot_turu, 'acik'))
    for update of ho skip locked
  loop
    update public.hizli_oyuncular
       set davet_durumu = 'kabul'
     where hizli_mac_id = r.hizli_mac_id and user_id = r.bot_id;
  end loop;

  -- 11) Herkes kabul ettiyse hızlı maçı başlat
  for r in
    select hm.id, hm.kategori from public.hizli_maclar hm
    where hm.durum = 'bekliyor'
      and not exists (
        select 1 from public.hizli_oyuncular ho
        where ho.hizli_mac_id = hm.id and ho.davet_durumu <> 'kabul'
      )
    for update of hm skip locked
  loop
    update public.hizli_maclar
       set durum = 'aktif',
           soru_ids = public.soru_sec(r.kategori, 20,
                        (select coalesce(array_agg(ho.user_id), '{}'::uuid[])
                           from public.hizli_oyuncular ho
                          where ho.hizli_mac_id = r.id)),
           aktif_soru = 0,
           soru_baslangic = now()
     where id = r.id;
  end loop;

  -- 12) Aktif hızlı maçlarda botlar cevaplasın (SADECE ilk doğru puan alır)
  --     Yarış durumu: hizli_maclar satırı kilitlenir, ilk doğru kontrolü yapılır.
  for r in
    select hm.*, p.id as bot_id, p.bot_isabet
    from public.hizli_maclar hm
    join public.hizli_oyuncular ho on ho.hizli_mac_id = hm.id
      and ho.davet_durumu = 'kabul' and ho.terk_at is null
    join public.profiles p on p.id = ho.user_id and p.is_bot
    where hm.durum = 'aktif' and hm.basladi and hm.duraklatildi_at is null
      -- Gecikme zorluga bagli ve (mac, soru, bot) icin SABIT: cron her 7 sn'de
      -- calistigi icin random() her tikte yeniden cekiliyordu; bu, dagilimin
      -- alt sinirina yigilmaya (bot hep ~2 sn'de basiyor) yol aciyordu.
      and now() >= hm.soru_baslangic
                   + public.bot_gecikme_sn(
                       p.id, hm.id::text || ':' || hm.aktif_soru::text,
                       p.bot_gecikme_min, p.bot_gecikme_max,
                       public.soru_okuma_yuku(hm.soru_ids[hm.aktif_soru + 1])
                     ) * interval '1 second'
      and not exists (
        select 1 from public.hizli_cevaplar a
        where a.hizli_mac_id = hm.id and a.user_id = p.id and a.soru_index = hm.aktif_soru
      )
      -- Bot, insan oyuncularin ulastigi soruyu GECEMEZ
      and hm.aktif_soru <= 1 + coalesce((
        select max(a2.soru_index)
        from public.hizli_cevaplar a2
        join public.profiles p2 on p2.id = a2.user_id
        where a2.hizli_mac_id = hm.id and not coalesce(p2.is_bot, false)
      ), -1)
    for update of hm skip locked
  loop
    select * into q from public.questions where id = r.soru_ids[r.aktif_soru + 1];
    if not found then continue; end if;

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    v_ilk := false;
    if v_dogru then
      v_ilk := not exists (
        select 1 from public.hizli_cevaplar
        where hizli_mac_id = r.id and soru_index = r.aktif_soru and dogru
      );
    end if;

    insert into public.hizli_cevaplar (hizli_mac_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, r.aktif_soru, v_cevap, v_dogru)
    on conflict do nothing;

    if v_ilk then
      update public.hizli_oyuncular
         set skor = skor + 10
       where hizli_mac_id = r.id and user_id = r.bot_id;
    end if;
  end loop;

  -- 13) Hızlı maçları ilerlet (süre dolduysa veya kabul edenlerin hepsi cevapladıysa)
  for r in
    select hm.id from public.hizli_maclar hm
    where hm.durum = 'aktif' and hm.basladi and hm.duraklatildi_at is null
      and (
        not exists (
          select 1 from public.hizli_oyuncular ho
          where ho.hizli_mac_id = hm.id and ho.davet_durumu = 'kabul'
            and ho.terk_at is null
            and not exists (
              select 1 from public.hizli_cevaplar a
              where a.hizli_mac_id = hm.id and a.user_id = ho.user_id and a.soru_index = hm.aktif_soru
            )
        )
        or (now() > hm.soru_baslangic + interval '16 seconds'
            and exists (
              select 1 from public.hizli_cevaplar a3
              join public.profiles p3 on p3.id = a3.user_id
              where a3.hizli_mac_id = hm.id and a3.soru_index = hm.aktif_soru
                and not coalesce(p3.is_bot, false)
            ))
        or now() > hm.soru_baslangic + interval '10 minutes'
      )
  loop
    perform public.advance_hizli_mac(r.id);
  end loop;
end;
$function$;

drop procedure if exists public.cron_hizli_tik_islem();
drop function if exists public.bot_grup_mac_tik(uuid);
drop function if exists public.bot_grup_adimlari(uuid);
