-- 1104 · "Ort. cevap" iki tarafta birebir aynı çıkıyordu (site testi 3. tur, madde 1).
-- Kök neden (1088): oyuncu cevaplayınca bot AYNI işlemde cevaplanıyor; sure_ms ikisi için de now() − soru_baslangic
-- olduğundan insan ve bot süresi bire bir eşitti (Klasik/Saf Bilgi: submit_match_answer; Ortak Hazine: bot_cevap_at = now()).
-- Düzeltme: bot bekletmeden cevaplamaya DEVAM eder (oyun hızı/puan/isabet aynı); yalnız kayda geçen süre botun kendi
-- planlı gecikmesi olur, en fazla insanın süresi + 2,5 sn. Ortak Hazine için kasa_maclari.bot_cevap_gercek eklendi
-- ('at' yalnız sure_ms istatistiğinde okunur; puanlama/sıralama etkilenmez). Gövdeler canlı tanımdan, hedefli eklerle.
-- Geri alma: araclar/ort-cevap-1104-geri-alma.sql

alter table public.kasa_maclari add column if not exists bot_cevap_gercek timestamptz;

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
      b_bas timestamptz; b_ins_ms numeric; b_plan_ms numeric; b_ms int;
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
          -- 1104: botun süresi insanla AYNI işlem saatini (now) paylaşmasın. Bot bekletmeden cevaplasa da kayda
          -- geçen süre botun kendi planlı gecikmesidir (bot_oyna ile aynı formül), en fazla insandan 2,5 sn sonra.
          b_bas:=public.soru_baslangic_coz('1v1',b_m.id,b_id,b_idx,b_m.soru_baslangic);
          b_ins_ms:=greatest(round(extract(epoch from (now()-b_bas))*1000),0);
          select public.bot_gecikme_sn(b_id,b_m.id::text||':'||b_idx::text,bp.bot_gecikme_min,bp.bot_gecikme_max,
                   public.soru_okuma_yuku(b_m.soru_ids[b_idx+1]))*1000 into b_plan_ms from public.profiles bp where bp.id=b_id;
          b_ms:=least(greatest(coalesce(b_plan_ms,b_ins_ms),0),b_ins_ms+2500,15000)::int;
          insert into public.match_answers(match_id,user_id,soru_index,cevap,dogru,sure_ms)
          values(b_m.id,b_id,b_idx,b_c,b_d,b_ms)
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
    -- 1104: bekletmeden cevaplasa da kayda geçen zaman botun planlı zamanı (en fazla insandan 2,5 sn sonra)
    update public.kasa_maclari set bot_cevap_gercek = least(bot_cevap_at, now() + interval '2.5 seconds'), bot_cevap_at = now() where id = p_id;
  end if;
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ (rakip henüz cevaplamamış olabilir)
  return jsonb_build_object('cevaplandi', true);
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_ilerlet_ic(p_id uuid)
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
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)), make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));   -- 991
  v_karar_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);   -- 991
  v_taban interval := make_interval(secs => public.ayar_sayi('kasa_kopuk_taban_sn', 3));
  v_kayma interval;
  v_b1 timestamptz;
  v_b2 timestamptz;
  v_toplam interval := make_interval(secs => public.ayar_sayi('mac_kopuk_toplam_sn', 60));   -- 1059
  v_an timestamptz;   -- 1059: kopma anı (son nabız)
  v_tavan interval := make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 15) + 15);   -- 1059
  v_sav uuid;   -- 1059
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;

  -- 987: Savunma Sorusunda savunanın bağlantısı koptu → savunma başarısız (rakip kararını verir)
  -- 1059: toplam kopukluk süresi açıkken savunan da 60 sn beklenir (faz donar); bu kural yalnız mac_kopuk_toplam_sn = 0 iken.
  if public.ayar_sayi('mac_kopuk_toplam_sn', 60) <= 0 and k.faz = 'cevap' and (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and exists (
       select 1 from public.profiles p
        where p.id = (k.savunma ->> 'sahip')::uuid and not coalesce(p.is_bot, false)
          and public.nabiz_son(p.id) < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 25))) then   -- 995
    perform public.kasa_savunma_cozumle(p_id, 'kopuk');
    perform public.kasa_sinyal_ver(p_id);
    select * into k from public.kasa_maclari where id = p_id;
  end if;

  -- ---------- KOPUKLUK KAPISI (1059: kopma anından itibaren toplam mac_kopuk_toplam_sn; o sürede kimse süre/soru kaybetmez) ----------
  v_kopuk := public.kasa_kopuk_kim(p_id);
  if v_kopuk is null and k.kopuk_at is not null then
    v_kopuk := public.mac_hala_kopuk(k.oyuncu1, k.oyuncu2, k.kopuk_at);   -- dönmedi: kopma anından sonra nabız yok
  end if;
  if v_kopuk is null and k.kopuk_at is null then
    -- Süre dolumu kapısı: cevaplamayan / karar vermeyen oyuncu süre bitiminden sonra hiç görünmediyse süre dolumu SAYILMAZ.
    if k.faz = 'cevap' then
      v_sav := case when k.savunma is not null and k.savunma ->> 'durum' = 'soru' then (k.savunma ->> 'sahip')::uuid end;
      if (v_sav is null or v_sav = k.oyuncu1) and not (k.cevaplar ? k.oyuncu1::text)
         and public.mac_sure_kopugu(k.oyuncu1, public.kasa_oyuncu_bitis(k, k.oyuncu1), v_kapanis) then v_kopuk := k.oyuncu1;
      elsif (v_sav is null or v_sav = k.oyuncu2) and not (k.cevaplar ? k.oyuncu2::text)
         and public.mac_sure_kopugu(k.oyuncu2, public.kasa_oyuncu_bitis(k, k.oyuncu2), v_kapanis) then v_kopuk := k.oyuncu2;
      end if;
    elsif k.faz = 'karar' and public.mac_sure_kopugu(k.sahip, k.faz_bitis, v_karar_pay) then
      v_kopuk := k.sahip;
    end if;
  end if;
  if v_kopuk is not null then
    if k.kopuk_at is null then
      -- Donma kopma ANINDAN: o andan beri geçen süre (en çok v_tavan) iki oyuncuya geri verilir.
      v_an := least(now(), greatest(coalesce(public.nabiz_son(v_kopuk), now()), now() - v_tavan));
      update public.kasa_maclari
         set kopuk_at = v_an, kopuk_kalan = greatest(coalesce(k.faz_bitis, now()) - v_an, v_taban)
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      select * into k from public.kasa_maclari where id = p_id;
    end if;
    if k.kopuk_at < now() - v_toplam then
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
      elsif now() >= k.faz_bitis + v_karar_pay then   -- 991: geç varan karar payı
        perform public.kasa_karar_uygula(p_id, false, true);   -- süre doldu → DEVAM
      else
        exit;
      end if;
    elsif k.faz = 'cevap' then
      if k.bot is not null and not (k.cevaplar ? k.bot::text) and k.bot_cevap_at is not null
         and now() >= k.bot_cevap_at then
        update public.kasa_maclari
           set cevaplar = cevaplar || jsonb_build_object(k.bot::text,
                            jsonb_build_object('cevap', k.bot_cevap, 'at',
                              case when k.bot_cevap_gercek is not null and k.bot_cevap_gercek >= k.bot_cevap_at
                                    and k.bot_cevap_gercek > k.soru_baslangic then k.bot_cevap_gercek else k.bot_cevap_at end))
         where id = p_id;
        select * into k from public.kasa_maclari where id = p_id;
      end if;
      if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
        -- 987: yalnız savunan cevaplar; rakip izler
        exit when not ((k.cevaplar ? (k.savunma ->> 'sahip'))
                       or now() > public.kasa_oyuncu_bitis(k, (k.savunma ->> 'sahip')::uuid) + v_kapanis);
        perform public.kasa_savunma_cozumle(p_id, null);
        perform public.kasa_sinyal_ver(p_id);
        continue;
      end if;
      v_b1 := public.kasa_oyuncu_bitis(k, k.oyuncu1);
      v_b2 := public.kasa_oyuncu_bitis(k, k.oyuncu2);
      -- 991: cevaplamayan oyuncu için bitiş + geç varış payı beklenir; ikisi de cevapladıysa beklenmez
      exit when not ((k.cevaplar ? k.oyuncu1::text) or now() > v_b1 + v_kapanis)
             or not ((k.cevaplar ? k.oyuncu2::text) or now() > v_b2 + v_kapanis);
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
