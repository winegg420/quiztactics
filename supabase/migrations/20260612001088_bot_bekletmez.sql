-- 1088 · Botlar her soruda bekletmesin (13 Eki 2026, telefon turu madde 8).
-- Kural: oyuncu cevapladıktan sonra botun cevabı EN FAZLA 2,5 sn içinde gelir; bot zaten daha önce cevaplayacaksa
-- dokunulmaz. Doğru cevap oranı ve zorluk mantığı DEĞİŞMEZ — yalnız bekleme kısalır.
--  · Klasik / Saf Bilgi (senkron 1v1): submit_match_answer içinde bot aynı soruyu hemen cevaplar (bot_oyna 2. adımının gövdesi).
--  · Grup: son insan cevaplayınca submit_group_match_answer bot_grup_mac_tik'i çağırır; bot_grup_adimlari gecikmeyi
--    "bütün insanlar cevapladı" durumunda atlar.
--  · Ortak Hazine: kasa_cevap botun önceden belli cevabının zamanını (bot_cevap_at) şimdiye çeker.
--  · Düello v4: duello4_bot_tik insan cevapladıysa gecikmeyi atlar (2 sn'lik tikte cevaplar).
--  · Turnuva: soru süreyle ilerler, oyuncu bot beklemez — dokunulmadı.
-- Gövdeler canlı tanımdan (pg_get_functiondef) alındı; yetki/GRANT değişmez (CREATE OR REPLACE mevcut ACL'yi korur).


CREATE OR REPLACE FUNCTION public.submit_match_answer(p_match_id uuid, p_cevap smallint, p_soru_index integer DEFAULT NULL::integer)
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
  -- 329: istemci hangi soruyu cevapladığını söyler; soru değiştiyse (eski kart) reddedilir.
  if p_soru_index is not null and p_soru_index <> v_index then raise exception 'Soru değişti, tekrar dene'; end if;
  v_soru_id:=public.soru_id_coz('1v1',p_match_id,auth.uid(),v_index,m.soru_ids[v_index+1]);
  v_bas:=public.soru_baslangic_coz('1v1',p_match_id,auth.uid(),v_index,v_bas);
  -- 991: süre içinde tıklanıp geç varan cevap kabul (eski 2 sn varış toleransı aynen)
  if not public.cevap_gec_kabul(v_bas+interval '15 seconds',interval '2 seconds',public.ayar_ondalik('cevap_gec_varis_sn', 5)) then raise exception 'Süre doldu'; end if;
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
  -- 1062: cevap süresi SUNUCU saatiyle (kişisel başlangıçtan), 0..15 sn'ye sıkıştırılır; istemci sayısına güvenilmez
  insert into public.match_answers(match_id,user_id,soru_index,cevap,dogru,sure_ms)
  values(p_match_id,auth.uid(),v_index,p_cevap,v_dogru,
    least(greatest(round(extract(epoch from (now()-v_bas))*1000),0),15000)::int);
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
  -- 1088: senkron bot maçında oyuncu cevapladıysa bot bekletmez — aynı soruyu hemen cevaplar.
  -- bot_oyna 2) adımının gövdesi (isabet/puan/tepki aynı); Sis sürüyorsa ya da hata olursa normal tik devralır.
  if v_senkron then
    declare
      b_m public.matches%rowtype; b_id uuid; b_idx int; b_q public.questions%rowtype; b_c smallint; b_d boolean; b_p int;
    begin
      select * into b_m from public.matches where id=p_match_id;
      b_id:=case when v_ben_p1 then b_m.oyuncu2 else b_m.oyuncu1 end;
      b_idx:=case when v_ben_p1 then b_m.oyuncu2_soru else b_m.oyuncu1_soru end;
      if b_m.durum='aktif' and b_m.basladi and b_idx=v_index and b_idx=b_m.aktif_soru and b_idx<v_toplam
         and exists(select 1 from public.profiles bp where bp.id=b_id and bp.is_bot)
         and now()<=public.soru_baslangic_coz('1v1',b_m.id,b_id,b_idx,b_m.soru_baslangic)+interval '15 seconds'
         and not exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=b_m.id
           and k.soru_index=b_idx and k.tur='sis' and k.user_id<>b_id
           and k.created_at+make_interval(secs=>public.ayar_sayi('klasik_sis_sn',3))>now()) then
        select * into b_q from public.questions where id=public.soru_id_coz('1v1',b_m.id,b_id,b_idx,b_m.soru_ids[b_idx+1]);
        if found then
          if random()<public.bot_soru_isabet(b_id,b_q.kategori,b_q.id) then b_c:=b_q.dogru_cevap;
          else select x into b_c from generate_series(0,3) x where x<>b_q.dogru_cevap order by random() limit 1; end if;
          b_d:=(b_c=b_q.dogru_cevap);
          insert into public.match_answers(match_id,user_id,soru_index,cevap,dogru,sure_ms)
          values(b_m.id,b_id,b_idx,b_c,b_d,
            least(greatest(round(extract(epoch from (now()-public.soru_baslangic_coz('1v1',b_m.id,b_id,b_idx,b_m.soru_baslangic)))*1000),0),15000)::int)
          on conflict do nothing;
          b_p:=case when b_d then 10 else 0 end;
          if b_m.oyuncu1=b_id then
            update public.matches set oyuncu1_skor=oyuncu1_skor+b_p,oyuncu1_soru=b_idx+1,
              oyuncu1_bitti_at=case when b_idx+1>=v_toplam then now() else oyuncu1_bitti_at end where id=b_m.id;
          else
            update public.matches set oyuncu2_skor=oyuncu2_skor+b_p,oyuncu2_soru=b_idx+1,
              oyuncu2_bitti_at=case when b_idx+1>=v_toplam then now() else oyuncu2_bitti_at end where id=b_m.id;
          end if;
          perform public.advance_match(b_m.id);
          if not public.bot_tepki_klasik(b_m.id,b_id,b_d) then
            perform public.bot_eski_tepki_kuyrukla('mac_mesaj',b_m.id,b_id);
          end if;
        end if;
      end if;
    exception when others then
      raise warning 'submit_match_answer › bot hemen cevap %: % (%)', p_match_id, sqlerrm, sqlstate;
    end;
  end if;
  select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
  return query select v_dogru,q.dogru_cevap,v_puan,
    case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,false,v_ilk;
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

CREATE OR REPLACE FUNCTION public.bot_grup_adimlari(p_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- 1056: bot_oyna'nın 8) ve 9) adımları (gövde aynen taşındı). p_id verilirse yalnız o maç.
declare
  r record;
  q public.questions%rowtype;
  v_cevap smallint;
  v_dogru boolean;
  v_puan int;
begin
  -- 8) Aktif grup maçlarında botlar cevaplasın (ve ara sıra tepki versin)
  for r in
    select gm.*, p.id as bot_id, p.bot_isabet
    from public.group_matches gm
    join public.group_match_players gmp on gmp.group_match_id = gm.id
      and gmp.davet_durumu = 'kabul' and gmp.terk_at is null
    join public.profiles p on p.id = gmp.user_id and p.is_bot
    where gm.durum = 'aktif' and gm.basladi and gm.duraklatildi_at is null
      and (p_id is null or gm.id = p_id)   -- 1056
      -- Gecikme BOTA OZEL (1v1 ve turnuvadaki kuralin aynisi)
      and (now() >= gm.soru_baslangic + public.bot_gecikme_sn(
            p.id, gm.id::text || ':' || gm.aktif_soru::text,
            p.bot_gecikme_min, p.bot_gecikme_max,
            public.soru_okuma_yuku(gm.soru_ids[gm.aktif_soru + 1])) * interval '1 second'
           -- 1088: bütün insanlar bu soruyu cevapladıysa bot bekletmez (zorluk/isabet aynı, yalnız bekleme kısalır)
           or (exists (select 1 from public.group_match_answers ha
                         join public.profiles hp on hp.id = ha.user_id and not coalesce(hp.is_bot, false)
                        where ha.group_match_id = gm.id and ha.soru_index = gm.aktif_soru)
               and not exists (select 1 from public.group_match_players hg
                                 join public.profiles hp2 on hp2.id = hg.user_id and not coalesce(hp2.is_bot, false)
                                where hg.group_match_id = gm.id and hg.davet_durumu = 'kabul' and hg.terk_at is null
                                  and not exists (select 1 from public.group_match_answers ha2
                                                   where ha2.group_match_id = gm.id and ha2.user_id = hg.user_id
                                                     and ha2.soru_index = gm.aktif_soru))))
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
      and (p_id is null or gm.id = p_id)   -- 1056
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
end;
$function$;

CREATE OR REPLACE FUNCTION public.kasa_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_j jsonb;
  v_dogru smallint;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and v_me::text is distinct from k.savunma ->> 'sahip' then
    raise exception 'Savunma Sorusunu yalnız hak sahibi cevaplar';
  end if;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  -- 991: süre içinde tıklanıp geç varan cevap kabul (x-qt-tik bildirimi + geç varış payı; bkz. cevap_gec_kabul)
  if not public.cevap_gec_kabul(public.kasa_oyuncu_bitis(k, v_me), make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)), public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;
  select dogru_cevap into v_dogru from public.questions where id = k.soru_id;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);

  if (v_j ->> 'ilk') is not null and p_cevap = (v_j ->> 'ilk')::smallint then
    raise exception 'Başka bir cevap seç';
  end if;
  -- İkinci Şans: ilk yanlış cevap sayılmaz; aynı sayaçla bir kez daha (yalnız kullanan bilir)
  if coalesce((v_j ->> 'ikinci')::boolean, false) and (v_j ->> 'ilk') is null and p_cevap is distinct from v_dogru then
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(v_me::text, v_j || jsonb_build_object('ilk', p_cevap)),
           son_hareket = now()
     where id = p_id;
    perform public.gorulen_kaydet(k.soru_id);
    return jsonb_build_object('cevaplandi', false, 'ikinci_sans', true, 'elenen', p_cevap);
  end if;

  update public.kasa_maclari
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', least(now(), public.kasa_oyuncu_bitis(k, v_me)))),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(k.soru_id);
  if p_cevap is distinct from v_dogru then
    perform public.yanlis_kaydet(k.soru_id);
  end if;
  -- 1088: oyuncu cevapladı, bot henüz cevaplamadıysa bot bekletmez (cevabı önceden belli; yalnız zamanı öne alınır)
  if k.bot is not null and v_me is distinct from k.bot and not (k.cevaplar ? k.bot::text)
     and k.bot_cevap_at is not null and k.bot_cevap_at > now()
     and not (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
    update public.kasa_maclari set bot_cevap_at = now() where id = p_id;
  end if;
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ (rakip henüz cevaplamamış olabilir)
  return jsonb_build_object('cevaplandi', true);
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_bot_tik(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_bot uuid;
  v_n int := 0;
  v_kat text;
  v_bas timestamptz;
  v_t1 double precision;
  v_t2 double precision;
  v_min double precision := public.ayar_ondalik('duello4_bot_kart_min_sn', 1.2);
  v_max double precision := public.ayar_ondalik('duello4_bot_kart_max_sn', 3);
  v_kart_sn double precision := public.ayar_ondalik('duello4_kart_sn', 7);
  v_soru uuid;
  v_kategori text;
  v_dc smallint;
  v_cevap smallint;
begin
  select * into d from public.duellolar where id = p_id and surum = 4 for update skip locked;
  if not found or d.durum <> 'aktif' then return 0; end if;
  perform public.duello4_ilerlet(p_id);

  for v_bot in select p.id from public.profiles p where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) loop
    select * into d from public.duellolar where id = p_id;
    exit when d.durum <> 'aktif' or d.kopuk_at is not null;

    if d.faz = 'kart' and d.v4_kontrol = v_bot then
      -- 1034: her adım kendi duyurusunun bitişinden sayılır; kalan kullanılabilir süreyi aşmaz.
      v_bas := coalesce(d.v4_duyuru_bitis, d.faz_bitis - make_interval(secs => v_kart_sn));
      v_kart_sn := greatest(extract(epoch from d.faz_bitis - v_bas)::double precision, 0.5);
      v_t1 := least(v_min + (v_max - v_min) * public.bot_rasgele('d4k1:' || p_id::text || ':' || d.v4_tur), greatest(v_kart_sn - 2, 0.2));
      v_t2 := least(0.8 + 1.2 * public.bot_rasgele('d4k2:' || p_id::text || ':' || d.v4_tur), greatest(v_kart_sn - 0.5, 0.2));
      if d.v4_gonderilen is null and now() >= v_bas + make_interval(secs => v_t1) then
        perform public.duello4_kart_uygula(p_id, public.duello4_bot_kart(p_id, v_bot, 1), null, false);
        perform public.duello_sinyal_ver(p_id);
        v_n := v_n + 1;
        select * into d from public.duellolar where id = p_id;
        v_bas := d.v4_duyuru_bitis;   -- 2. adım: 2. duyurunun bitişinden sayılır
      end if;
      if d.faz = 'kart' and d.v4_gonderilen is not null and d.v4_secilen is null and now() >= v_bas + make_interval(secs => v_t2) then
        perform public.duello4_kart_uygula(p_id, null, public.duello4_bot_kart(p_id, v_bot, 2), false);
        perform public.duello_sinyal_ver(p_id);
        v_n := v_n + 1;
        select * into d from public.duellolar where id = p_id;
      end if;
    end if;

    if d.faz in ('notr', 'cevap', 'son') and not (d.cevaplar ? v_bot::text) and d.soru_baslangic is not null
       and (now() >= d.soru_baslangic + make_interval(secs => public.duello4_bot_gecikme(p_id, v_bot))
            -- 1088: rakip (insan) cevapladıysa bot bekletmez — sonraki tikte (≤ 2 sn) cevaplar
            or d.cevaplar ? (case when v_bot = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end)::text) then
      v_soru := case when v_bot = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
      v_kategori := case when v_bot = d.oyuncu1 then d.kategori1 else d.kategori2 end;
      select dogru_cevap into v_dc from public.questions where id = v_soru;
      -- Doğruluk: kategoriye + bot seviyesine + soru zorluğuna göre (bot_soru_isabet, 2. sürümle aynı).
      if random() < public.bot_soru_isabet(v_bot, v_kategori, v_soru) then
        v_cevap := v_dc;
      else
        select x into v_cevap from generate_series(0, 3) x where x <> v_dc order by random() limit 1;
      end if;
      update public.duellolar
         set cevaplar = cevaplar || jsonb_build_object(v_bot::text, jsonb_build_object('cevap', v_cevap, 'at', now())),
             son_hareket = now()
       where id = p_id;
      perform public.duello4_ilerlet(p_id);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $function$;
