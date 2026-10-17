-- 1127 · Grup Maçı botu yeni 4 bedava tepkiyi kullanır (bot paritesi, madde 5 — tepki-duzelt Grup'u 4 bedava tepkiye geçirdi)
--
-- Önce: bot_grup_adimlari her bot cevabında bot_eski_tepki_kuyrukla ile %4 olasılıkla eski emoji/cümleyi SOHBETE yazıyordu.
-- tepki-duzelt (main, 17 Eki 2026) Grup'ta eski 6 emoji kolunu kaldırdı; insanın tepkisi sayfanın maç kanalından (grup-mac-<id>)
-- "tepki" yayını olarak gidiyor. Yeni: bot da aynı kanala aynı yayını, Klasik botuyla aynı anlamlı anlarda ve aynı olasılıkla
-- (tepki_bot_olasilik), insanla aynı 3 sn / maçta 10 sınırıyla (bot_tepki_gonder, 1126) yollar. Tepki sesi yok (istemci sessiz).
-- bot_oyna kuyruk gönderimi: 'tepki-*' özel kanal (1v1, eskisi gibi), öteki (grup-mac-*) açık kanal.
-- bot_eski_tepki_kuyrukla silinmedi (artık çağrılmıyor). Yetki: yeni iç fonksiyon istemciye kapalı; mevcutlar aynı.
-- Geri alma: docs/bot-parite-geri-al.sql (1127 bölümü).

set local lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.bot_tepki_grup(p_mac uuid, p_bot uuid, p_dogru boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gm public.group_matches%rowtype;
  v_n int;
  v_idx int;
  v_seri int;
  v_bot_skor int;
  v_en_iyi int;
  v_olay text;
begin
  -- 1127: Klasik bot_tepki_klasik ile aynı anlamlı anlar — maç sonu (skora göre), rakip hatası (bu soruda yanlış cevaplayan
  -- bir insan var), doğru serisi (tepki_bot_seri). Olasılık/paket/3 sn/10 sınırı bot_tepki_gonder'de. Kanal: sayfanın açık
  -- maç kanalı grup-mac-<id> (Grup tepkisi istemcide de orada; components/Tepki.jsx yerel=true).
  select * into gm from public.group_matches where id = p_mac;
  if not found then return false; end if;
  v_n := coalesce(array_length(gm.soru_ids, 1), 0);
  select max(a.soru_index) into v_idx from public.group_match_answers a where a.group_match_id = p_mac and a.user_id = p_bot;
  if v_idx is null then return true; end if;
  v_seri := greatest(2, public.ayar_sayi('tepki_bot_seri', 3)::int);

  if gm.durum = 'bitti' or v_idx + 1 >= v_n then
    select gp.skor into v_bot_skor from public.group_match_players gp where gp.group_match_id = p_mac and gp.user_id = p_bot;
    select max(gp.skor) into v_en_iyi from public.group_match_players gp
      join public.profiles p on p.id = gp.user_id and not coalesce(p.is_bot, false)
     where gp.group_match_id = p_mac and gp.davet_durumu = 'kabul';
    v_olay := case when v_bot_skor > coalesce(v_en_iyi, 0) then 'dogru' when v_bot_skor < v_en_iyi then 'saygi' else 'dusun' end;
  elsif exists (select 1 from public.group_match_answers a join public.profiles p on p.id = a.user_id and not coalesce(p.is_bot, false)
                 where a.group_match_id = p_mac and a.soru_index = v_idx and not a.dogru) then
    v_olay := case when p_dogru then 'dogru' else 'dusun' end;   -- rakip hatası
  elsif p_dogru and (select count(*) from public.group_match_answers a
                      where a.group_match_id = p_mac and a.user_id = p_bot and a.dogru
                        and a.soru_index > v_idx - v_seri and a.soru_index <= v_idx) >= v_seri then
    v_olay := 'dogru';   -- doğru cevap serisi
  else
    return true;
  end if;
  perform public.bot_tepki_gonder('grup-mac-' || p_mac::text, p_bot, v_olay);
  return true;
exception when others then
  raise warning 'bot_tepki_grup (%): %', p_mac, sqlerrm;
  return false;
end;
$function$;
revoke all on function public.bot_tepki_grup(uuid, uuid, boolean) from public, anon, authenticated;

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

    -- 1127: eski emoji/sohbet kolu (bot_eski_tepki_kuyrukla) yerine yeni 4 bedava tepki, Klasik ile aynı anlamlı anlarda
    perform public.bot_tepki_grup(r.id, r.bot_id, v_dogru);
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
          'tepki', r.kanal, r.kanal like 'tepki-%');   -- 1127: özel tepki kanalı (1v1); Grup sayfanın açık maç kanalı (grup-mac-<id>)
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

    -- 1126: isabet + botun kendi jokeri (50:50, İkinci Şans, Çifte Puan, Sigorta) tek yerde (bot_klasik_cevap)
    select b.cevap, b.puan into v_cevap, v_puan from public.bot_klasik_cevap(r.id, r.bot_id, v_bot_index, q.id) b;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.match_answers (match_id, user_id, soru_index, cevap, dogru, sure_ms)
    values (r.id, r.bot_id, v_bot_index, v_cevap, v_dogru,
            -- 1062: botun süresi de sunucu saatiyle (kişisel başlangıçtan; başlangıç yoksa null)
            least(greatest(round(extract(epoch from (now() - public.soru_baslangic_coz('1v1', r.id, r.bot_id, v_bot_index,
              case when coalesce(r.senkron, false) then r.soru_baslangic
                   when r.oyuncu1 = r.bot_id then r.oyuncu1_baslangic else r.oyuncu2_baslangic end))) * 1000), 0), 15000)::int)
    on conflict do nothing;

    -- HIZ BONUSU YOK: bot da insanla ayni sabit puani alir (1126: puan bot_klasik_cevap'tan — insanla aynı skill puanı)

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

    -- 1120: yalnız yeni tepki sistemi (bot_tepki_klasik, gecikmeli kuyruk). match_messages'a yazan eski
    -- 6 emoji / hazır cümle kolu kalktı.
    perform public.bot_tepki_klasik(r.id, r.bot_id, v_dogru);
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
