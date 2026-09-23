-- 326: Klasik / Saf Bilgi / Grup / Turnuva soru sayacı — gösterim payı (325'in eşi, mod paritesi).
--
-- Ölçüm (yerel istemci + canlı DB, Klasik 21 soru): sonraki soru ekrana sunucudaki
-- `soru_baslangic`tan medyan 1,68 sn (çoğu 1,3–1,9 sn) sonra geliyordu — önceki sorunun
-- geri bildirim penceresi + kart geçişi + soru okuma. Sayaç 14 ile açılıyor, ilk adım
-- 15–800 ms sürüyordu (20/21 soru). Oyuncu her soruda ~1,7 sn kaybediyordu.
--
-- Çözüm: soru ilerlerken yeni başlangıç `now() + soru_gosterim_payi_ms` (2000) olur.
-- İstemci sayacı tam süreden fazlasını göstermez (kalanSure 15'e kırpar): soru ekrana
-- payın içinde gelirse sayaç 15'te bekler, sonra gerçek zamanla akar. 2000 ms: ölçülen
-- gecikmelerin ~%90'ı. Pay içinde ekrana gelen soru cevaplanabilir (submit_match_answer
-- ve advance_match "başlamadı" kontrolü pay kadar gevşedi; maç başı 3-2-1 geri sayımı
-- 3 sn olduğu için o sırada ekranda şık yoktur). Süre sınırları (15/16/17 sn) başlangıca
-- göre aynı kalır; iki oyuncu için başlangıç ortak.
-- Değişen: advance_match, submit_match_answer, advance_group_match, advance_tournament.
-- Soru Değiştir (kişisel başlangıç) ve maç/turnuva ilk sorusu değişmedi.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('soru_gosterim_payi_ms', '2000'::jsonb,
   'Klasik/Grup/Turnuva: sonraki soru başlangıcına eklenen gösterim payı (ms) — sayaç tam süreyle, düzgün akar')
on conflict (anahtar) do nothing;

create or replace function public.soru_gosterim_payi()
 returns interval
 language sql
 stable
 set search_path to 'public'
as $$
  select make_interval(secs => greatest(0, public.ayar_sayi('soru_gosterim_payi_ms', 2000)) / 1000.0)
$$;

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

  if coalesce(m.senkron, false) then
    if not m.basladi or m.soru_baslangic is null then return; end if;
    if m.duraklatildi_at is not null then return; end if;
    if now() < m.soru_baslangic - public.soru_gosterim_payi() then return; end if;   -- 326: gösterim payı içinde cevaplanabilir

    if m.aktif_soru < v_toplam then
      select count(*) into v_cevap_sayisi
        from public.match_answers a
       where a.match_id = p_match_id and a.soru_index = m.aktif_soru;

      v_bas := public.soru_son_baslangic('1v1', p_match_id, m.aktif_soru, m.soru_baslangic);
      if v_cevap_sayisi < 2 and now() <= v_bas + interval '16 seconds' then
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
$function$
;

CREATE OR REPLACE FUNCTION public.submit_match_answer(p_match_id uuid, p_cevap smallint)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint, puan integer, benim_skor integer, rakip_skor integer, tekrar_hakki boolean, ilk_yanlis_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  m public.matches%rowtype; q public.questions%rowtype; v_dogru boolean; v_puan int; v_ben_p1 boolean;
  v_index int; v_bas timestamptz; v_toplam int; v_senkron boolean; v_s1 int; v_s2 int; v_soru_id uuid;
  v_skill text; v_ilk smallint;
begin
  perform public.hiz_siniri('submit_match_answer',60,interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in(m.oyuncu1,m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if m.durum<>'aktif' then raise exception 'Maç aktif değil'; end if;
  v_ben_p1:=(m.oyuncu1=auth.uid()); v_senkron:=coalesce(m.senkron,false);
  v_toplam:=coalesce(array_length(m.soru_ids,1),0);
  if v_senkron then
    if not m.basladi or m.soru_baslangic is null then raise exception 'Maç henüz başlamadı'; end if;
    if m.duraklatildi_at is not null then raise exception 'Rakip bağlantısı koptu — maç duraklatıldı'; end if;
    if now()<m.soru_baslangic-public.soru_gosterim_payi() then raise exception 'Maç başlamak üzere'; end if;   -- 326: pay içinde ekrana gelen soru cevaplanabilir
    v_index:=m.aktif_soru; v_bas:=m.soru_baslangic;
  else
    v_index:=case when v_ben_p1 then m.oyuncu1_soru else m.oyuncu2_soru end;
    v_bas:=coalesce(case when v_ben_p1 then m.oyuncu1_baslangic else m.oyuncu2_baslangic end,now());
  end if;
  if v_index>=v_toplam then raise exception 'Bu maçta senin sıran bitti'; end if;
  v_soru_id:=public.soru_id_coz('1v1',p_match_id,auth.uid(),v_index,m.soru_ids[v_index+1]);
  v_bas:=public.soru_baslangic_coz('1v1',p_match_id,auth.uid(),v_index,v_bas);
  if now()>v_bas+interval '17 seconds' then raise exception 'Süre doldu'; end if;
  if exists(select 1 from public.match_answers a where a.match_id=p_match_id and a.user_id=auth.uid() and a.soru_index=v_index)
    then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if v_senkron and exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=p_match_id
    and k.soru_index=v_index and k.tur='sis' and k.user_id<>auth.uid()
    and k.created_at+make_interval(secs=>public.ayar_sayi('klasik_sis_sn',3))>now())
    then raise exception 'Sis kalkınca cevaplayabilirsin'; end if;
  select * into q from public.questions where id=v_soru_id;
  v_dogru:=(p_cevap=q.dogru_cevap);
  select k.tur into v_skill from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=p_match_id
    and k.user_id=auth.uid() and k.soru_index=v_index and k.tur in('sigorta','cifte_puan','ikinci_sans')
    order by k.created_at desc limit 1;
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s where s.mac_tur='1v1'
    and s.mac_id=p_match_id and s.user_id=auth.uid() and s.soru_index=v_index for update;
  if v_skill='ikinci_sans' and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri(mac_tur,mac_id,user_id,soru_index,ilk_cevap)
    values('1v1',p_match_id,auth.uid(),v_index,p_cevap);
    select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
    return query select false,q.dogru_cevap,0,
      case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,true,p_cevap;
    return;
  end if;
  if v_ilk is not null and p_cevap=v_ilk then raise exception 'Başka bir cevap seç'; end if;
  delete from public.skill_ikinci_sans_denemeleri where mac_tur='1v1' and mac_id=p_match_id
    and user_id=auth.uid() and soru_index=v_index;
  perform public.soru_sayac(q.id,v_dogru);
  insert into public.match_answers(match_id,user_id,soru_index,cevap,dogru)
  values(p_match_id,auth.uid(),v_index,p_cevap,v_dogru);
  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;
  v_puan:=case when v_dogru and v_skill='cifte_puan' then 20 when v_dogru then 10
    when not v_dogru and v_skill='sigorta' then 5 else 0 end;
  if v_ben_p1 then
    update public.matches set oyuncu1_skor=oyuncu1_skor+v_puan,oyuncu1_soru=v_index+1,
      oyuncu1_baslangic=case when v_senkron then oyuncu1_baslangic else null end,
      oyuncu1_bitti_at=case when not v_senkron and v_index+1>=v_toplam then now() else oyuncu1_bitti_at end,
      aktif_soru=case when v_senkron then aktif_soru else greatest(aktif_soru,v_index+1) end where id=p_match_id;
  else
    update public.matches set oyuncu2_skor=oyuncu2_skor+v_puan,oyuncu2_soru=v_index+1,
      oyuncu2_baslangic=case when v_senkron then oyuncu2_baslangic else null end,
      oyuncu2_bitti_at=case when not v_senkron and v_index+1>=v_toplam then now() else oyuncu2_bitti_at end,
      aktif_soru=case when v_senkron then aktif_soru else greatest(aktif_soru,v_index+1) end where id=p_match_id;
  end if;
  perform public.advance_match(p_match_id);
  select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
  return query select v_dogru,q.dogru_cevap,v_puan,
    case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,false,v_ilk;
end;
$function$
;

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
     and now() < public.soru_son_baslangic('grup', p_group_match_id, gm.aktif_soru, gm.soru_baslangic) + interval '16 seconds' then
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
$function$
;

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

  if now() < t.soru_baslangic + interval '16 seconds' then
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
$function$
;
