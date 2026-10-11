-- 1062: "Rakibin seçtiği şık" + "Ort. cevap" (Klasik, Saf Bilgi, Ortak Hazine).
--  * match_answers.sure_ms: cevap süresi SUNUCU saatiyle (submit_match_answer + bot_oyna). Süre dolumu (-1) satırında null.
--  * mac_rakip_cevabi(maç, soru): rakibin şıkkı YALNIZ soru benim için kapandıysa (cevap verdim / süre doldu / soru ilerledi).
--    match_answers RLS'si DEĞİŞMEDİ (rakip cevabı yalnız bu security definer kapıdan, yalnız maçın iki oyuncusuna).
--  * mac_sonu_ozet: 'ort_cevap' {ben, rakip} (ms, tek ortalama) — 'mac' ve 'kasa' kaynakları.
--  * kasa_durum: sonuc.rakip_cevabi (yalnız faz 'sonuc') + maç bitince 'ort_cevap'.

alter table public.match_answers add column if not exists sure_ms int;

-- İç yardımcı: iki tarafın ortalama cevap süresi (ms). Yalnız cevaplanmış (sure_ms dolu, şık 0-3) sorular.
-- İstemciye açık DEĞİL (yalnız mac_sonu_ozet / kasa_durum çağırır; ikisi de oyuncuyu zaten doğruluyor).
create or replace function public.ort_cevap_ms(p_tur text, p_id uuid, p_me uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare v_rakip uuid; v_ben numeric; v_rk numeric;
begin
  if p_tur = 'mac' then
    select case when m.oyuncu1 = p_me then m.oyuncu2 else m.oyuncu1 end into v_rakip
      from public.matches m where m.id = p_id and p_me in (m.oyuncu1, m.oyuncu2);
    if not found then return null; end if;
    select avg(a.sure_ms) filter (where a.user_id = p_me), avg(a.sure_ms) filter (where a.user_id = v_rakip)
      into v_ben, v_rk from public.match_answers a
     where a.match_id = p_id and a.sure_ms is not null and a.cevap between 0 and 3;
  elsif p_tur = 'kasa' then
    select case when k.oyuncu1 = p_me then k.oyuncu2 else k.oyuncu1 end into v_rakip
      from public.kasa_maclari k where k.id = p_id and p_me in (k.oyuncu1, k.oyuncu2);
    if not found then return null; end if;
    select avg(c.sure_ms) filter (where c.user_id = p_me), avg(c.sure_ms) filter (where c.user_id = v_rakip)
      into v_ben, v_rk from public.kasa_cevaplari c
     where c.kasa_id = p_id and c.sure_ms is not null and c.cevap between 0 and 3;
  else
    return null;
  end if;
  if v_ben is null and v_rk is null then return null; end if;
  return jsonb_build_object('ben', round(v_ben)::int, 'rakip', round(v_rk)::int);
end $$;
revoke all on function public.ort_cevap_ms(text, uuid, uuid) from public, anon, authenticated;

-- Rakibin bu sorudaki şıkkı (0-3) ya da null. Soru benim için AÇIKKEN asla dönmez.
create or replace function public.mac_rakip_cevabi(p_match_id uuid, p_soru_index int)
 returns smallint language plpgsql security definer set search_path to 'public'
as $$
declare m public.matches%rowtype; v_me uuid := auth.uid(); v_rakip uuid; v_ben_p1 boolean;
        v_kapali boolean; v_bas timestamptz; v_c smallint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('mac_rakip_cevabi', 120, interval '60 seconds');
  select * into m from public.matches where id = p_match_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if p_soru_index is null or p_soru_index < 0 then return null; end if;
  v_ben_p1 := (m.oyuncu1 = v_me);
  v_rakip := case when v_ben_p1 then m.oyuncu2 else m.oyuncu1 end;
  -- Kapalı mı? (1) bu soruya satırım var (cevap ya da süre dolumu -1) (2) maç aktif değil
  -- (3) soru benim için ilerledi (4) kişisel süre + geç varış payı tamamen geçti.
  v_kapali := exists (select 1 from public.match_answers a where a.match_id = p_match_id and a.user_id = v_me and a.soru_index = p_soru_index)
    or m.durum <> 'aktif'
    or (case when coalesce(m.senkron, false) then m.aktif_soru
             when v_ben_p1 then m.oyuncu1_soru else m.oyuncu2_soru end) > p_soru_index;
  if not v_kapali and coalesce(m.senkron, false) and m.aktif_soru = p_soru_index and m.soru_baslangic is not null then
    v_bas := public.soru_baslangic_coz('1v1', p_match_id, v_me, p_soru_index, m.soru_baslangic);
    v_kapali := now() > v_bas + interval '17 seconds' + make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision);
  end if;
  if not v_kapali then return null; end if;
  select a.cevap into v_c from public.match_answers a
   where a.match_id = p_match_id and a.user_id = v_rakip and a.soru_index = p_soru_index and a.cevap between 0 and 3;
  return v_c;
end $$;
revoke all on function public.mac_rakip_cevabi(uuid, int) from public, anon;
grant execute on function public.mac_rakip_cevabi(uuid, int) to authenticated;

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
  select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
  return query select v_dogru,q.dogru_cevap,v_puan,
    case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,false,v_ilk;
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

    insert into public.match_answers (match_id, user_id, soru_index, cevap, dogru, sure_ms)
    values (r.id, r.bot_id, v_bot_index, v_cevap, v_dogru,
            -- 1062: botun süresi de sunucu saatiyle (kişisel başlangıçtan; başlangıç yoksa null)
            least(greatest(round(extract(epoch from (now() - public.soru_baslangic_coz('1v1', r.id, r.bot_id, v_bot_index,
              case when coalesce(r.senkron, false) then r.soru_baslangic
                   when r.oyuncu1 = r.bot_id then r.oyuncu1_baslangic else r.oyuncu2_baslangic end))) * 1000), 0), 15000)::int)
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

  -- 8) + 9) Grup maçı bot cevapları ve ilerletme → bot_grup_adimlari (1056).
  -- cron_hizli_tik_islem içinden çağrıldıysa (qt.grup_ayri) maç başına AYRI işlemde yapılır.
  if coalesce(current_setting('qt.grup_ayri', true), '') <> '1' then
    perform public.bot_grup_adimlari(null);
  end if;

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

CREATE OR REPLACE FUNCTION public.mac_sonu_ozet(p_kaynak text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_tur text;
  v_id uuid;
  v_bitti boolean := false;
  v_bitis timestamptz;
  v_kazanan uuid;
  v_ben_terk boolean := false;
  v_rakip_terk boolean := false;
  v_edenler uuid[] := '{}';
  v_hazir boolean := false;
  v_dokum jsonb;
  v_level jsonb;
  v_lig jsonb;
  v_rozet jsonb;
  v_gorev jsonb;
  v_haftalik jsonb;
  v_hafta date := public.gorev_hafta_basi(now());
  v_lig_puan int := 0;
  v_dogru int := 0;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_bugun_mu boolean := false;
  v_dil text := public.oyuncu_dili();
  p record;
  h public.xp_hareketleri%rowtype;
  v_kalan int; v_l int;
  v_sira bigint; v_puan int; v_once int; v_sira_once bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva|grup|kasa):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
  v_tur := split_part(p_kaynak, ':', 1);
  v_id := split_part(p_kaynak, ':', 2)::uuid;

  -- Maç durumu + katılım denetimi (başkasının maçı okunmaz)
  if v_tur = 'mac' then
    select m.durum = 'bitti', m.bitis, m.kazanan,
           m.terk_eden = v_me, m.terk_eden is not null and m.terk_eden <> v_me,
           case when m.terk_eden is null then '{}'::uuid[] else array[m.terk_eden] end,
           (select count(*) from public.match_answers a where a.match_id = m.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.matches m where m.id = v_id and v_me in (m.oyuncu1, m.oyuncu2);
  elsif v_tur = 'duello' then
    select d.durum = 'bitti', d.bitis, d.kazanan,
           d.terk_eden = v_me, d.terk_eden is not null and d.terk_eden <> v_me,
           case when d.terk_eden is null then '{}'::uuid[] else array[d.terk_eden] end,
           (select count(*) from public.duello_hamleler dh where dh.duello_id = d.id and dh.savunan = v_me and dh.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.duellolar d where d.id = v_id and v_me in (d.oyuncu1, d.oyuncu2);
  elsif v_tur = 'kasa' then   -- 950
    select k.durum = 'bitti', k.bitis, k.kazanan,
           k.terk_eden = v_me, k.terk_eden is not null and k.terk_eden <> v_me,
           case when k.terk_eden is null then '{}'::uuid[] else array[k.terk_eden] end,
           (select count(*) from public.kasa_cevaplari c where c.kasa_id = k.id and c.user_id = v_me and c.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.kasa_maclari k where k.id = v_id and v_me in (k.oyuncu1, k.oyuncu2);
  elsif v_tur = 'grup' then
    select g.durum = 'bitti', g.bitis, g.kazanan,
           exists (select 1 from public.group_match_players x where x.group_match_id = g.id and x.user_id = v_me and x.terk_at is not null),
           false,
           coalesce((select array_agg(x.user_id) from public.group_match_players x
                      where x.group_match_id = g.id and x.terk_at is not null), '{}'::uuid[]),
           (select count(*) from public.group_match_answers a where a.group_match_id = g.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.group_matches g
     where g.id = v_id
       and exists (select 1 from public.group_match_players x where x.group_match_id = g.id and x.user_id = v_me);
  else
    select t.durum = 'bitti', t.bitis, t.kazanan,
           exists (select 1 from public.tournament_players x where x.tournament_id = t.id and x.user_id = v_me and x.terk_at is not null),
           false, '{}'::uuid[],
           (select count(*) from public.tournament_answers a where a.tournament_id = t.id and a.user_id = v_me and a.dogru)
      into v_bitti, v_bitis, v_kazanan, v_ben_terk, v_rakip_terk, v_edenler, v_dogru
      from public.tournaments t
     where t.id = v_id
       and exists (select 1 from public.tournament_players x where x.tournament_id = t.id and x.user_id = v_me);
  end if;
  if not found then raise exception 'Bu maçta değilsin'; end if;
  v_bitti := coalesce(v_bitti, false);
  v_ben_terk := coalesce(v_ben_terk, false);
  v_rakip_terk := coalesce(v_rakip_terk, false);
  v_bugun_mu := v_bitis is not null and (v_bitis at time zone 'Europe/Istanbul')::date = v_bugun;

  v_dokum := public.odul_dokumu(p_kaynak);
  v_lig_puan := coalesce((v_dokum -> 'toplam' ->> 'lig')::int, 0);

  -- XP / level (grup XP vermez)
  if v_tur <> 'grup' then
    v_level := public.level_kazancim(p_kaynak);
    select * into h from public.xp_hareketleri where user_id = v_me and kaynak = p_kaynak;
    if h.id is not null then
      select level, level_xp into p from public.profiles where id = v_me;
      if h.level_sonra > h.level_once and p.level = h.level_sonra then
        -- Atlamadan önceki levelin doluluğu: bu maçın XP'sinden atlanan levellerin ihtiyacı düşülür.
        -- (Bu maçtan sonra başka XP geldiyse yaklaşık kalır; yalnız çubuk animasyonu içindir.)
        v_kalan := h.xp - p.level_xp;
        v_l := h.level_once + 1;
        while v_l < h.level_sonra loop
          v_kalan := v_kalan - public.level_gereken_xp(v_l);
          v_l := v_l + 1;
        end loop;
        -- Maçtan sonra başka XP geldiyse hesap tutmaz (v_kalan ≤ 0): alan yazılmaz, istemci varsayılanı kullanır.
        if v_kalan > 0 and v_kalan < public.level_gereken_xp(h.level_once) then
          v_level := v_level || jsonb_build_object(
            'level_gereken_once', public.level_gereken_xp(h.level_once),
            'level_xp_once', public.level_gereken_xp(h.level_once) - v_kalan);
        end if;
      end if;
    end if;
  end if;

  v_hazir := v_bitti and (v_ben_terk or v_tur = 'grup'
                          or exists (select 1 from public.xp_hareketleri x where x.user_id = v_me and x.kaynak = p_kaynak)
                          or coalesce((v_dokum ->> 'hazir')::boolean, false));

  -- Lig sırası (yalnız bu maçtan lig puanı geldiyse): sonra = bugünkü sıra, önce = puan düşülmüş hâl
  if v_lig_puan > 0 and not v_ben_terk then
    begin
      select g.sira, g.puan into v_sira, v_puan from public.lig_grubum() g where g.ben;
      if v_sira is not null then
        v_once := v_puan - v_lig_puan;
        select 1 + count(*) into v_sira_once
          from public.lig_grubum() g
         where not g.ben and (g.puan > v_once or (g.puan = v_once and g.sira < v_sira));
        v_lig := jsonb_build_object('puan', v_lig_puan, 'sira_sonra', v_sira,
                                    'sira_once', greatest(v_sira_once, v_sira));
      else
        v_lig := jsonb_build_object('puan', v_lig_puan);
      end if;
    exception when others then
      v_lig := jsonb_build_object('puan', v_lig_puan);
    end;
  elsif v_lig_puan > 0 then
    v_lig := jsonb_build_object('puan', v_lig_puan);
  end if;

  -- Bu maçta kazanılan rozetler (rozet coini bu kaynağa yazıldıysa ya da maç bitişiyle aynı işlemde)
  select coalesce(jsonb_agg(jsonb_build_object(
           'anahtar', t.anahtar,
           'ad', case when v_dil = 'en' then coalesce(t.ad_en, t.ad_tr) else t.ad_tr end,
           'ikon', t.ikon, 'grup', t.grup, 'kademe', t.kademe) order by r.kazanildi_at, t.sira), '[]'::jsonb)
    into v_rozet
    from public.oyuncu_rozetleri r
    join public.rozet_tanimlari t on t.anahtar = r.rozet
   where r.user_id = v_me and not r.geriye_donuk
     and (exists (select 1 from public.odul_kalemleri o
                   where o.user_id = v_me and o.kaynak = p_kaynak and o.kalem = 'rozet_odulu'
                     and o.detay ->> 'rozet' = r.rozet)
          or (v_bitis is not null and r.kazanildi_at between v_bitis - interval '2 seconds' and v_bitis + interval '5 seconds'));

  -- Günlük görevler + bu maçtan önceki ilerleme (744: yeni havuz görevleri için sayaç bu maç HARİÇ yeniden ölçülür;
  -- eski 3 kimlik (mac_oyna_3…) için 462'deki hesap aynen)
  -- (görev listesi odul_dokumu'dan — get_daily_quests ikinci kez çağrılmaz)
  select coalesce(jsonb_agg(g.j || jsonb_build_object(
           'onceki', case when gh.quest_id is not null then
               least((g.j ->> 'ilerleme')::int, greatest(0,
                 case when not v_bitti or v_ben_terk or not v_bugun_mu
                      then public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun)
                      else public.gorev_olcum(v_me, gh.sayac, coalesce(gs.parametre, gh.parametre),
                             public.gorev_gun_bas(v_bugun), public.gorev_gun_bas(v_bugun + 1), v_tur, v_id) end))
             else
               least((g.j ->> 'ilerleme')::int, greatest(0, public.gorev_sayaci(g.j ->> 'id', v_me, v_bugun) - (
                  case when not v_bitti or v_ben_terk or not v_bugun_mu then 0
                       when g.j ->> 'id' = 'mac_oyna_3' then 1
                       when g.j ->> 'id' = 'mac_kazan_5' then (case when v_kazanan = v_me then 1 else 0 end)
                       when g.j ->> 'id' = 'dogru_25' then v_dogru
                       else 0 end)))
             end)), '[]'::jsonb)
    into v_gorev
    from jsonb_array_elements(coalesce(v_dokum -> 'gorevler', '[]'::jsonb)) as g(j)
    left join public.gorev_havuzu gh on gh.quest_id = g.j ->> 'id'
    left join public.gunluk_gorev_secimi gs on gs.tarih = v_bugun and gs.quest_id = gh.quest_id;

  -- Haftalık görevler (744, ekleyici anahtar): aynı biçim {id, ad, ilerleme, hedef, alindi, onceki}
  perform public.haftalik_secim_yap(v_hafta);
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', gh.quest_id, 'ad', gh.ad_tr, 'hedef', gh.hedef,
           'ilerleme', least(n.simdi, gh.hedef::bigint),
           'alindi', exists (select 1 from public.haftalik_gorev_alimi a
                              where a.user_id = v_me and a.hafta = v_hafta and a.quest_id = gh.quest_id),
           'onceki', least(n.once, n.simdi, gh.hedef::bigint)) order by gs.slot), '[]'::jsonb)
    into v_haftalik
    from public.haftalik_gorev_secimi gs
    join public.gorev_havuzu gh on gh.quest_id = gs.quest_id
    cross join lateral (
      select public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7)) as simdi,
             case when v_bitti and not v_ben_terk and v_bitis >= public.gorev_gun_bas(v_hafta) and v_bitis < public.gorev_gun_bas(v_hafta + 7)
                  then public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7), v_tur, v_id)
                  else public.gorev_olcum(v_me, gh.sayac, gh.parametre, public.gorev_gun_bas(v_hafta), public.gorev_gun_bas(v_hafta + 7)) end as once) n
   where gs.hafta = v_hafta;

  return jsonb_build_object(
    'kaynak', p_kaynak,
    'hazir', v_hazir,
    'bitti', v_bitti,
    'kazanan', v_kazanan,
    'terk', jsonb_build_object('ben', v_ben_terk, 'rakip', v_rakip_terk, 'edenler', to_jsonb(v_edenler)),
    'dokum', v_dokum,
    'level', v_level,
    'lig', v_lig,
    'rozetler', v_rozet,
    'gorevler', v_gorev,
    'haftalik_gorevler', v_haftalik,
    -- 1062: ortalama cevap süresi (ms) — yalnız Klasik/Saf Bilgi ('mac') ve Ortak Hazine ('kasa'), maç bitince.
    -- Rakibin soru bazlı süresi ASLA dönmez; yalnız tek ortalama. Veri yoksa null.
    'ort_cevap', case when v_bitti and v_tur in ('mac', 'kasa') then public.ort_cevap_ms(v_tur, v_id, v_me) end
  );
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
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
  v_j jsonb;
  v_b_ben timestamptz;
  v_b_son timestamptz;
  v_ezeli jsonb;   -- 957
begin
  perform public.hiz_siniri('kasa_durum', 400, interval '60 seconds');
  -- 1055: kilit 2 sn içinde alınamazsa (DB yavaş / sıra uzun) 500 yerine KİLİTSİZ anlık görüntü dön.
  -- İlerletme (kasa_ilerlet) o yoklamada atlanır; bir sonraki yoklama ya da diğer oyuncu ilerletir.
  begin
    k := public.kasa_kilitle(p_id);
  exception when lock_not_available then
    select * into k from public.kasa_maclari where id = p_id;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if v_me is null or v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  end;
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);
  if k.faz = 'cevap' then
    v_b_ben := public.kasa_oyuncu_bitis(k, v_me);
    v_b_son := greatest(public.kasa_oyuncu_bitis(k, k.oyuncu1), public.kasa_oyuncu_bitis(k, k.oyuncu2));
  end if;

  if k.soru_id is not null and (k.faz in ('cevap', 'sonuc') or k.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(k.soru_id, v_dil) sd;
  end if;
  -- 1052 basılı tut: doğru şık YALNIZ hileli_mi() hesabına ve yalnız kendi cevap hakkı sürerken (normal oyuncuda alan yok).
  if v_soru is not null and k.durum = 'aktif' and k.faz = 'cevap' and not (coalesce(k.cevaplar, '{}'::jsonb) ? v_me::text) and public.hileli_mi() then
    v_soru := v_soru || jsonb_build_object('dogru_cevap', (select q.dogru_cevap from public.questions q where q.id = k.soru_id));
  end if;

  -- Sonuç bandı: soru çözümlendikten SONRA (doğru cevap ancak burada)
  if k.faz = 'sonuc' and k.son_tur is not null then
    v_sonuc := k.son_tur || jsonb_build_object(
      'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
      'ben_dogru', coalesce((k.son_tur -> 'dogru' ->> v_me::text)::boolean, false),
      'rakip_dogru', coalesce((k.son_tur -> 'dogru' ->> v_rakip::text)::boolean, false),
      -- 1062: rakibin seçtiği şık — YALNIZ tur çözümlendikten sonra (faz 'sonuc'); cevapsızsa null
      'rakip_cevabi', case when (k.cevaplar -> v_rakip::text ->> 'cevap')::int between 0 and 3
                           then (k.cevaplar -> v_rakip::text ->> 'cevap')::int end);
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

  -- 957: arkadaşla bitmiş Kasa maçlarında galibiyet sayısı (Düello 'ezeli' ile aynı; yalnız maç bitince)
  if k.durum <> 'aktif' and exists (select 1 from public.friendships f where f.durum = 'arkadas'
       and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me))) then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me),
                              'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.kasa_maclari x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  return jsonb_build_object(
    'id', k.id, 'durum', k.durum, 'dereceli', k.dereceli,
    'faz', k.faz, 'faz_bitis', k.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'tur', k.tur, 'max_tur', k.max_tur, 'hedef', k.hedef, 'altin', k.altin,
    'artis', k.artis, 'ikisi_artis', k.ikisi_artis, 'acma_min', k.acma_min, 'jokerli', k.jokerli,
    'devam_sans', case when k.jokerli then k.devam_sans else 0 end,
    -- 954: kural bayrakları (maç satırına sabit)
    'devam_birakir', k.devam_birakir,
    'devam_elli', k.jokerli and k.devam_elli,
    -- 955: tavan (0 = yok) + DEVAM çarpanı (1 = yok)
    'tavan', k.kasa_tavan, 'devam_carpan', k.devam_carpan,
    'kasa', k.kasa, 'sahip', k.sahip,
    -- 987: Savunma Hakkı (iki oyuncuya da görünür) + bekleyen/süren/biten Savunma Sorusu
    'savunma_acik', k.savunma_acik,
    'savunma_hak', to_jsonb(coalesce(k.savunma_hak, '{}'::uuid[])),
    'savunma', case when k.durum = 'aktif' then k.savunma end,
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
    -- Joker: yalnız KENDİ girdin (kapalı şıklar / elenen ilk cevap / kısaltıldın mı); rakipten yalnız adlar
    'joker', case when k.jokerli and k.faz in ('cevap', 'sonuc') then jsonb_build_object(
               'turler', coalesce(v_j -> 'turler', '[]'::jsonb),
               'kapali', coalesce(v_j -> 'kapali', '[]'::jsonb),
               'elenen', v_j -> 'ilk',
               'ikinci_sans', coalesce((v_j ->> 'ikinci')::boolean, false),
               'kisaltildi', coalesce((v_j ->> 'kisaltildi')::boolean, false)) end,
    'rakip_joker', case when k.jokerli and k.faz in ('cevap', 'sonuc')
                        then coalesce(k.joker -> v_rakip::text -> 'turler', '[]'::jsonb) end,
    -- 953/954: ücretsiz joker — YALNIZ kendi kaydın (rakibin hakkı ve '_hak' / '_devam' dönmez)
    'bedava_joker', case when k.jokerli and k.faz = 'cevap' and not k.altin then v_j ->> 'bedava' end,
    'devam_odul', case when k.jokerli and k.faz in ('cevap', 'sonuc') then v_j -> 'devam' end,
    'sonuc', v_sonuc,
    'sureler', jsonb_build_object(
       'soru', k.soru_sn, 'karar', k.karar_sn, 'sonuc', k.sonuc_sn,
       'nabiz', public.kasa_nabiz_sn(), 'kopuk', public.ayar_sayi('kasa_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('kasa_gosterim_payi_ms', 1500),
       'gosterim_bas', case k.faz
          when 'karar' then k.karar_baslangic + v_payi
          when 'cevap' then k.soru_baslangic + v_payi end,
       'benim_bitis', v_b_ben,
       'faz_son', coalesce(v_b_son, k.faz_bitis)),
    'kopuk', case when k.durum = 'aktif' and k.kopuk_at is not null then jsonb_build_object(
       'ben_mi', v_kopuk is not null and v_kopuk = v_me,
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('mac_kopuk_toplam_sn', 60)),
       'faz_kalan_sn', round(extract(epoch from coalesce(k.kopuk_kalan, interval '0'))::numeric, 2)) end,
    'kazanan', k.kazanan, 'sonuc_neden', k.sonuc_neden,
    'terk', case when k.durum <> 'aktif' then jsonb_build_object(
       'ben', k.terk_eden = v_me, 'rakip', k.terk_eden is not null and k.terk_eden <> v_me) end,
    'baglanmayan', k.baglanmayan,
    'gecmis', v_gecmis,
    -- 957: rövanş + arkadaşla Kasa geçmişi
    'rovans', case when k.durum <> 'aktif' then jsonb_build_object(
       'isteyen', k.rovans_isteyen, 'id', k.rovans_id,
       'gecerli', k.rovans_at is not null and k.rovans_at > now() - make_interval(secs => public.ayar_sayi('kasa_rovans_sn', 60)),
       'sure_sn', public.ayar_sayi('kasa_rovans_sn', 60)) end,
    'onceki_id', k.onceki_id,
    'ezeli', v_ezeli,
    -- 1062: ortalama cevap süresi (yalnız maç bitince; tek ortalama, soru bazlı süre yok)
    'ort_cevap', case when k.durum <> 'aktif' then public.ort_cevap_ms('kasa', k.id, v_me) end
  );
end $function$;
