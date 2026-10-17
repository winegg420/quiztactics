-- 1126 + 1127 geri alma (bot paritesi; 1127 Grup bot tepkisi). Eski tanımlar canlıdan (pg_get_functiondef, 17 Eki 2026, 1126 öncesi).
-- Sıra: önce sarmalayıcılar ve çağıranlar eski tanımlarına, sonra tetikleyiciler, en son yeni iç nesneler silinir.
-- Yalnız kapatmak için (geri almadan): klasik_bot_joker_yuzde / duello_bot_joker_yuzde = 0 (bot jokeri), tepki_bot_olasilik = 0
-- (bot tepkisi, bütün modlar), kasa_bot_gecikme_profili = 0 (Hazine eski 2–6 sn).
begin;

-- joker_hak_kontrol
CREATE OR REPLACE FUNCTION public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
  v_tur_kullanilan int;
begin
  -- 1015 · Düello v4: kendi sınırları (Son Düello jokersiz, Baskın/Kalkan yok).
  if p_mac_tur = 'duello' and exists (select 1 from public.duellolar where id = p_mac_id and surum = 4) then
    perform public.duello4_joker_hak_kontrol(p_mac_id, v_me, p_tur);
    return;
  end if;
  -- Düello 1.0: surum = 2 maçta 4 toplam / aynı skill 2 / soruda 1.
  if p_mac_tur = 'duello' and exists (select 1 from public.duellolar where id = p_mac_id and surum = 2) then
    perform public.duello2_skill_hak_kontrol(p_mac_id, v_me, p_tur);
    return;
  end if;
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m where m.id = p_mac_id and coalesce(m.jokersiz, false)
  ) then
    raise exception 'Bu modda skill kullanılamaz';
  end if;

  if p_mac_tur = '1v1' then
    v_sinir := public.ayar_sayi('klasik_skill_toplam_hak', 6)::int;
    select count(*), count(*) filter (where tur = p_tur)
      into v_kullanilan, v_tur_kullanilan
      from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
    if v_kullanilan >= v_sinir then
      raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
    end if;
    if v_tur_kullanilan >= public.ayar_sayi('klasik_skill_tur_basi_hak', 2)::int then
      raise exception 'Bu skill için maç hakkın doldu';
    end if;
    return;
  end if;

  -- Grup/turnuva/düello kuralları değişmedi.
  if exists (
    select 1 from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
  ) then
    raise exception 'Bu skill''i bu maçta zaten kullandın';
  end if;
  if p_mac_tur = 'duello' then
    v_sinir := public.ayar_sayi('duello_joker_hak', 4)::int;
  else
    v_sinir := public.joker_mac_siniri(p_mac_tur, p_mac_id);
  end if;
  if v_sinir = 0 then raise exception 'Turnuva finalinde skill kullanılamaz'; end if;
  if v_sinir is null then return; end if;
  select count(*) into v_kullanilan from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
  if v_kullanilan >= v_sinir then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
  end if;
end;
$function$;

-- joker_kullan
CREATE OR REPLACE FUNCTION public.joker_kullan(p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
  v_ucretsiz boolean := false;
  v_soru_id uuid;
  v_dogru smallint;
  v_kapali int[];
  v_baslangic timestamptz;
  v_aktif_soru int;
  m public.matches%rowtype;
  gm public.group_matches%rowtype;
  hm public.hizli_maclar%rowtype;
  t public.tournaments%rowtype;
  v_ben_p1 boolean;
  v_yeni_soru uuid;
  v_degisti boolean;
  v_q record;   -- soru_dilinde(): oyuncunun dilindeki metin
begin
  perform public.hiz_siniri('joker_kullan', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  -- Paket 31 A: Klasik Mod'da (1v1) iki saldırı jokeri de maç içinde kullanılır.
  if not (p_tur in ('elli','sure','soru_degistir')
          -- Paket 32 A: Klasik'te Savunma Kilidi yerine Sis (düello DEĞİŞMEDİ, orası ayrı fonksiyon)
          or (p_mac_tur = '1v1' and p_tur in ('zaman_baskisi','sis'))) then
    raise exception 'Bu joker maç içinde kullanılamaz';
  end if;
  if p_mac_tur not in ('1v1','grup','hizli','turnuva') then
    raise exception 'Geçersiz maç türü';
  end if;
  -- Turnuva herkese AYNI soruyu sorar ve elemelidir: soru değiştirilemez.
  if p_mac_tur = 'turnuva' and p_tur = 'soru_degistir' then
    raise exception 'Turnuvada soru değiştirilemez';
  end if;

  if p_mac_tur = '1v1' then
    select * into m from public.matches where id = p_mac_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if v_me not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
    if m.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    v_ben_p1 := (m.oyuncu1 = v_me);
    if coalesce(m.senkron, false) then
      v_aktif_soru := m.aktif_soru;
      v_baslangic := m.soru_baslangic;
    else
      v_aktif_soru := coalesce(case when v_ben_p1 then m.oyuncu1_soru else m.oyuncu2_soru end, 0);
      v_baslangic := case when v_ben_p1 then m.oyuncu1_baslangic else m.oyuncu2_baslangic end;
    end if;
    v_soru_id := m.soru_ids[v_aktif_soru + 1];
    if exists (select 1 from public.match_answers
               where match_id = p_mac_id and user_id = v_me and soru_index = v_aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;

  elsif p_mac_tur = 'grup' then
    select * into gm from public.group_matches where id = p_mac_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if not exists (select 1 from public.group_match_players
                   where group_match_id = p_mac_id and user_id = v_me and davet_durumu = 'kabul') then
      raise exception 'Bu maçta değilsin';
    end if;
    if gm.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    v_aktif_soru := gm.aktif_soru; v_baslangic := gm.soru_baslangic;
    v_soru_id := gm.soru_ids[gm.aktif_soru + 1];
    if exists (select 1 from public.group_match_answers
               where group_match_id = p_mac_id and user_id = v_me and soru_index = gm.aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;

  elsif p_mac_tur = 'hizli' then
    select * into hm from public.hizli_maclar where id = p_mac_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if not exists (select 1 from public.hizli_oyuncular
                   where hizli_mac_id = p_mac_id and user_id = v_me and davet_durumu = 'kabul') then
      raise exception 'Bu maçta değilsin';
    end if;
    if hm.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    v_aktif_soru := hm.aktif_soru; v_baslangic := hm.soru_baslangic;
    v_soru_id := hm.soru_ids[hm.aktif_soru + 1];
    if exists (select 1 from public.hizli_cevaplar
               where hizli_mac_id = p_mac_id and user_id = v_me and soru_index = hm.aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;

  else
    select * into t from public.tournaments where id = p_mac_id for update;
    if not found then raise exception 'Turnuva bulunamadı'; end if;
    if not exists (select 1 from public.tournament_players
                   where tournament_id = p_mac_id and user_id = v_me and not elendi) then
      raise exception 'Turnuvada değilsin ya da elendin';
    end if;
    if t.durum <> 'aktif' then raise exception 'Turnuva aktif değil'; end if;
    v_aktif_soru := t.aktif_soru; v_baslangic := t.soru_baslangic;
    v_soru_id := t.soru_ids[t.aktif_soru + 1];
    if exists (select 1 from public.tournament_answers
               where tournament_id = p_mac_id and user_id = v_me and soru_index = t.aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;
  end if;

  -- Soru daha önce değiştirildiyse kişiye özel soru/saat geçerlidir
  if p_mac_tur <> 'turnuva' then
    v_soru_id := public.soru_id_coz(p_mac_tur, p_mac_id, v_me, v_aktif_soru, v_soru_id);
    v_baslangic := public.soru_baslangic_coz(p_mac_tur, p_mac_id, v_me, v_aktif_soru, v_baslangic);
  end if;

  if p_soru_index is not null and p_soru_index <> v_aktif_soru then
    raise exception 'Soru değişti, tekrar dene';
  end if;
  if now() > v_baslangic + interval '16 seconds' then
    raise exception 'Süre doldu';
  end if;
  -- Paket 32 A.4: Sis sürenin son klasik_sis_son_esik_sn saniyesinde kullanılamaz — YALNIZ Sis
  if p_tur = 'sis'
     and now() > v_baslangic + make_interval(secs => 15 - public.ayar_sayi('klasik_sis_son_esik_sn', 6)) then
    raise exception 'Son % saniyede Sis kullanılamaz', public.ayar_sayi('klasik_sis_son_esik_sn', 6)::int;
  end if;

  -- Paket 27 B: toplam hak + "aynı joker maçta bir kez" tek yerden (joker_hak_kontrol).
  -- Paket 35 A.3: "aynı soruda tek joker" diye bir kural YOK — farklı jokerler tek soruda
  -- arka arkaya kullanılabilir (Paket 34'ün soru başına bloğu kaldırıldı).

  perform public.joker_hak_kontrol(p_mac_tur, p_mac_id, p_tur);

  -- "Soru Değiştir maç başına 1 kez" kuralı artık BÜTÜN türler için geçerli;
  -- yukarıdaki joker_hak_kontrol uyguluyor, ayrı istisnaya gerek kalmadı.

  -- Ücretsiz 50:50 yalnız SERBEST Klasik Mod'da (Paket 27 B.1.2).
  if p_tur = 'elli' then
    v_ucretsiz := public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id);
  end if;

  -- Paket 34: ücretsiz modda envanterden düşülmez
  v_ucretsiz := v_ucretsiz or public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', p_mac_tur || ':' || p_mac_id::text);
  end if;

  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, p_mac_tur, p_mac_id, v_aktif_soru, p_tur, v_ucretsiz);

  -- Paket 31 A.2 / 32 A: Klasik saldırı jokerleri — etki rakibe (tek yer: klasik_joker_etki)
  if p_mac_tur = '1v1' and p_tur in ('zaman_baskisi','sis') then
    perform public.klasik_joker_etki(p_mac_id, v_me, v_aktif_soru, p_tur);
    return jsonb_build_object('tur', p_tur, 'ucretsiz', false, 'uygulandi', true,
      'sis_sn', case when p_tur = 'sis' then public.ayar_sayi('klasik_sis_sn', 3) end);
  end if;

  select q.dogru_cevap into v_dogru from public.questions q where q.id = v_soru_id;

  if p_tur = 'elli' then
    select array_agg(x) into v_kapali from (
      select x from generate_series(0, 3) x
      where x <> v_dogru order by random() limit 2
    ) s;
    return jsonb_build_object('tur','elli','ucretsiz',v_ucretsiz,'kapali',to_jsonb(v_kapali));

  elsif p_tur = 'sure' then
    -- Soru değiştirilmişse sayaç kişisel satırda tutuluyor; onu uzat.
    v_degisti := exists (select 1 from public.soru_degisimleri d
      where d.mac_tur = p_mac_tur and d.mac_id = p_mac_id
        and d.user_id = v_me and d.soru_index = v_aktif_soru);
    if v_degisti then
      update public.soru_degisimleri
         set baslangic = baslangic + interval '10 seconds'
       where mac_tur = p_mac_tur and mac_id = p_mac_id
         and user_id = v_me and soru_index = v_aktif_soru;
    elsif p_mac_tur = '1v1' then
      if coalesce(m.senkron, false) then
        update public.matches set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
      elsif v_ben_p1 then
        update public.matches set oyuncu1_baslangic = oyuncu1_baslangic + interval '10 seconds' where id = p_mac_id;
      else
        update public.matches set oyuncu2_baslangic = oyuncu2_baslangic + interval '10 seconds' where id = p_mac_id;
      end if;
    elsif p_mac_tur = 'grup' then
      update public.group_matches set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
    elsif p_mac_tur = 'hizli' then
      update public.hizli_maclar set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
    else
      update public.tournaments set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
    end if;
    return jsonb_build_object('tur','sure','ucretsiz',false,'uzatildi',true);

  else -- soru_degistir: soru atlanmaz, yerine yenisi gelir, süre baştan başlar
    v_yeni_soru := public.mac_soru_degistir(p_mac_tur, p_mac_id, v_me, v_aktif_soru);
    -- Paket 31 A.1: Klasik Mod'da soru İKİ oyuncuda da değişir (aynı soru, aynı başlangıç)
    if p_mac_tur = '1v1' and coalesce(m.senkron, false) then
      perform public.klasik_joker_etki(p_mac_id, v_me, v_aktif_soru, 'soru_degistir');
    end if;
    -- Metin oyuncunun dilinde (bkz. migration 163 soru_dilinde)
    select v_yeni_soru as id, sd.soru, sd.secenekler, sd.dogru_cevap into v_q
      from public.soru_dilinde(v_yeni_soru, public.oyuncu_dili()) sd;
    perform public.gorulen_kaydet(v_yeni_soru);
    return jsonb_build_object(
      'tur','soru_degistir','ucretsiz',false,'degisti',true,
      'soru', jsonb_build_object(
        'question_id', v_q.id,
        'soru', v_q.soru,
        'secenekler', v_q.secenekler,
        'soru_index', v_aktif_soru,
        'baslangic', (select d.baslangic from public.soru_degisimleri d
                       where d.mac_tur = p_mac_tur and d.mac_id = p_mac_id
                         and d.user_id = v_me and d.soru_index = v_aktif_soru),
        'sunucu_zamani', now(),
        'dogru_cevap', case when public.hileli_mi() then v_q.dogru_cevap else null end));
  end if;
end;
$function$;

-- skill_hazirla
CREATE OR REPLACE FUNCTION public.skill_hazirla(p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_me uuid:=auth.uid(); v_ucretsiz boolean:=false;
begin
  perform public.hiz_siniri('skill_hazirla',30,interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur not in ('sigorta','cifte_puan','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  if p_mac_tur='duello' then
    if p_tur<>'ikinci_sans' then raise exception 'Bu skill Düello modunda kullanılamaz'; end if;
    perform public.duello_savunma_jokeri(p_mac_id,p_tur);
    return jsonb_build_object('tur',p_tur);
  end if;
  if p_mac_tur<>'1v1' then raise exception 'Bu skill bu modda kullanılamaz'; end if;
  if p_soru_index is null then raise exception 'Soru bilgisi gerekli'; end if;
  perform public.joker_hak_kontrol(p_mac_tur,p_mac_id,p_tur);
  v_ucretsiz:=public.jokerler_serbest();
  if not v_ucretsiz then perform public.joker_hareket(v_me,p_tur,-1,'kullanim',p_mac_tur||':'||p_mac_id::text); end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,p_mac_tur,p_mac_id,p_soru_index,p_tur,v_ucretsiz);
  return jsonb_build_object('tur',p_tur);
end;
$function$;

-- bot_klasik_joker_tik
CREATE OR REPLACE FUNCTION public.bot_klasik_joker_tik()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; v_tur text;
begin
  if not pg_try_advisory_xact_lock(hashtext('bot_klasik_joker_tik')) then return; end if;
  for r in
    select m.id,m.aktif_soru idx,p.id bot_id,
           case when m.oyuncu1=p.id then m.oyuncu2 else m.oyuncu1 end insan_id
    from public.matches m join public.profiles p on p.is_bot and p.id in(m.oyuncu1,m.oyuncu2)
    where m.durum='aktif' and coalesce(m.senkron,false) and m.basladi
      and not coalesce(m.jokersiz,false) and m.duraklatildi_at is null
      and m.aktif_soru < coalesce(array_length(m.soru_ids,1),0)
      and now() >= m.soru_baslangic + make_interval(secs=>2+6*public.bot_rasgele('kjz:'||m.id::text||':'||m.aktif_soru))
      and now() <= m.soru_baslangic + interval '10 seconds'
      and public.bot_rasgele('kjok:'||m.id::text||':'||m.aktif_soru)*100 < public.ayar_sayi('klasik_bot_joker_yuzde',15)
    for update of m skip locked
  loop
    continue when exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.soru_index=r.idx and k.user_id=r.bot_id);
    continue when exists(select 1 from public.match_answers a where a.match_id=r.id and a.soru_index=r.idx and a.user_id in(r.insan_id,r.bot_id));
    continue when (select count(*) from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.user_id=r.bot_id)
      >= public.ayar_sayi('klasik_skill_toplam_hak',6);
    select t into v_tur from unnest(array['zaman_baskisi','soru_degistir']) t
      where (select count(*) from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.user_id=r.bot_id and k.tur=t)
        < public.ayar_sayi('klasik_skill_tur_basi_hak',2)
      order by public.bot_rasgele('kjt:'||r.id::text||':'||r.idx||':'||t) limit 1;
    continue when v_tur is null;
    insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
      values(r.bot_id,'1v1',r.id,r.idx,v_tur,true);
    if v_tur='soru_degistir' then perform public.mac_soru_degistir('1v1',r.id,r.bot_id,r.idx); end if;
    perform public.klasik_joker_etki(r.id,r.bot_id,r.idx,v_tur);
  end loop;
end;
$function$;

-- bot_oyna
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

-- submit_match_answer
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
          perform public.bot_tepki_klasik(b_m.id,b_id,b_d);   -- 1120: eski match_messages kolu kalktı
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

-- duello4_joker
CREATE OR REPLACE FUNCTION public.duello4_joker(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben1 boolean;
  v_rakip uuid;
  v_idx int;
  v_ucretsiz boolean;
  v_soru uuid;
  v_kat text;
  v_dogru smallint;
  v_kapali int[];
  v_yeni_soru uuid;
  v_yeni timestamptz;
  v_bitis timestamptz;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' or d.faz not in ('notr', 'cevap', 'son') then raise exception 'Skill yalnız soru açıkken kullanılır'; end if;
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.v4_soru_no;
  v_bitis := case when v_ben1 then d.bitis1 else d.bitis2 end;
  v_soru := case when v_ben1 then d.soru_id1 else d.soru_id2 end;
  v_kat := case when v_ben1 then d.kategori1 else d.kategori2 end;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > v_bitis then raise exception 'Süre doldu'; end if;
  if p_tur = 'zaman_baskisi' and d.cevaplar ? v_rakip::text then raise exception 'Rakibin bu soruyu zaten cevapladı'; end if;
  if p_tur = 'soru_degistir' then
    if exists (select 1 from public.skill_ikinci_sans_denemeleri s
                where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx and s.user_id = v_me) then
      raise exception 'Cevap verildikten sonra soru değiştirilemez';
    end if;
    if d.faz = 'notr' then
      -- Ortak soru: rakip cevapladıysa ya da bu soruda joker kullandıysa değişmez (2. sürüm kuralı).
      if d.cevaplar <> '{}'::jsonb or exists (select 1 from public.skill_ikinci_sans_denemeleri s
           where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx) then
        raise exception 'Cevap verildikten sonra soru değiştirilemez';
      end if;
      if exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                   and k.user_id = v_rakip and k.soru_index = v_idx) then
        raise exception 'Rakibin bu soruda skill kullandı, soru değiştirilemez';
      end if;
    end if;
    v_yeni_soru := public.duello4_soru_benzer(p_id, v_kat, (select q.zorluk from public.questions q where q.id = v_soru));
    if v_yeni_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
  end if;

  perform public.duello4_joker_hak_kontrol(p_id, v_me, p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'duello:' || p_id::text);
  end if;
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, 'duello', p_id, v_idx, p_tur, v_ucretsiz);

  if p_tur = 'elli' then
    select dogru_cevap into v_dogru from public.questions where id = v_soru;
    select array_agg(x) into v_kapali
      from (select x from generate_series(0, 3) x where x <> v_dogru order by random() limit 2) s;
    update public.duellolar
       set elli1 = case when v_ben1 then v_kapali else elli1 end,
           elli2 = case when v_ben1 then elli2 else v_kapali end, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'sure' then
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) else bitis1 end,
           bitis2 = case when v_ben1 then bitis2 else bitis2 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) end,
           ek_sure = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'zaman_baskisi' then
    v_yeni := greatest(
      (case when v_ben1 then d.bitis2 else d.bitis1 end) - make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_taban_sn', 3)));
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 else least(bitis1, v_yeni) end,
           bitis2 = case when v_ben1 then least(bitis2, v_yeni) else bitis2 end,
           zaman_baskisi = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'soru_degistir' then
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello4_cevap_sn', 15)) + public.duello2_gosterim_payi();
    if d.faz = 'notr' then
      update public.duellolar
         set soru_id = v_yeni_soru, soru_id1 = v_yeni_soru, soru_id2 = v_yeni_soru,
             kullanilan_sorular = kullanilan_sorular || v_yeni_soru,
             soru_baslangic = now(), bitis1 = v_yeni, bitis2 = v_yeni, elli1 = null, elli2 = null,
             cevaplar = '{}'::jsonb, son_hareket = now()
       where id = p_id;
    else
      update public.duellolar
         set soru_id1 = case when v_ben1 then v_yeni_soru else soru_id1 end,
             soru_id2 = case when v_ben1 then soru_id2 else v_yeni_soru end,
             soru_id = case when v_me = v4_kontrol then v_yeni_soru else soru_id end,
             kullanilan_sorular = kullanilan_sorular || v_yeni_soru,
             bitis1 = case when v_ben1 then v_yeni else bitis1 end,
             bitis2 = case when v_ben1 then bitis2 else v_yeni end,
             elli1 = case when v_ben1 then null else elli1 end,
             elli2 = case when v_ben1 then elli2 else null end,
             soru_degisti_saldiri = soru_degisti_saldiri or v_me = v4_kontrol,
             soru_degisti_savunma = soru_degisti_savunma or v_me <> v4_kontrol,
             son_hareket = now()
       where id = p_id;
    end if;
  else   -- ikinci_sans: etkisi cevapta
    update public.duellolar set son_hareket = now() where id = p_id;
  end if;

  update public.duellolar set faz_bitis = greatest(bitis1, bitis2) where id = p_id;
  perform public.duello_sinyal_ver(p_id);
end $function$;

-- duello4_bot_tik
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

-- duello4_durum
CREATE OR REPLACE FUNCTION public.duello4_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben1 boolean;
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_benim_profil jsonb;
  v_rakip_profil jsonb;
  v_soru jsonb;
  v_soru_id uuid;
  v_soru_acik boolean;
  v_kart jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
  v_varsayilan int := public.ayar_sayi('duello4_oran_varsayilan', 50);
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_benim_profil := case when v_ben1 then d.profil1 else d.profil2 end;
  v_rakip_profil := case when v_ben1 then d.profil2 else d.profil1 end;

  -- Soru metni yalnız giriş bittikten sonra ve soru/sonuç fazında (kart fazında yok).
  v_soru_id := case when v_ben1 then d.soru_id1 else d.soru_id2 end;
  v_soru_acik := v_soru_id is not null
    and ((d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic) or d.faz = 'sonuc' or d.durum <> 'aktif'
         -- 1092: maçın 1. sorusu kurulduğu anda gelir (Klasik/Grup gibi): istemci 3-2-1 katmanının ALTINDA tutar, yavaş
         -- telefonda soru başlangıçtan sonraki okumayı beklemez. Cevap yine soru_baslangic'tan önce reddedilir (duello4_cevap).
         or (d.durum = 'aktif' and d.faz = 'notr' and d.v4_soru_no = 1));
  if v_soru_acik then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(v_soru_id, v_dil) sd;
  end if;
  -- 1052 basılı tut: doğru şık YALNIZ hileli_mi() hesabına ve yalnız kendi cevap hakkı sürerken (normal oyuncuda alan yok).
  if v_soru is not null and d.durum = 'aktif' and d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic and not (coalesce(d.cevaplar, '{}'::jsonb) ? v_me::text) and public.hileli_mi() then
    v_soru := v_soru || jsonb_build_object('dogru_cevap', (select q.dogru_cevap from public.questions q where q.id = v_soru_id));
  end if;

  -- Kartlar: oranlar izleyenin bakışıyla (ben / rakip). null = yeterli veri yok ("?"). Rakibe gönderilen kart,
  -- seçim bitene kadar bekleyen oyuncuya gizli (adim: kaç seçim yapıldı).
  if d.faz = 'kart' and d.v4_kartlar is not null then
    v_kart := jsonb_build_object(
      'kartlar', (select coalesce(jsonb_agg(jsonb_build_object(
                    'k', k, 'ben', public.duello4_oran(v_benim_profil, k), 'rakip', public.duello4_oran(v_rakip_profil, k)) order by n), '[]'::jsonb)
                    from unnest(d.v4_kartlar) with ordinality x(k, n)),
      'adim', (case when d.v4_gonderilen is not null then 1 else 0 end) + (case when d.v4_secilen is not null then 1 else 0 end),
      'gonderilen', case when v_me = d.v4_kontrol then d.v4_gonderilen end,
      'secilen', case when v_me = d.v4_kontrol then d.v4_secilen end,
      'varsayilan', v_varsayilan);
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me), 'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli from public.duellolar x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  if d.durum = 'bitti' then
    v_odul := jsonb_build_object(
      'lig_puan', case when d.dereceli and d.kazanan = v_me
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int
                       when d.dereceli and d.kazanan is null and coalesce(d.v4_berabere, false)   -- 1102
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan * 0.5)::int else 0 end,
      'coin', coalesce((select sum(h.miktar) from public.coin_hareketleri h
                         where h.user_id = v_me and h.tur = 'mac' and h.referans = 'duello:' || p_id::text), 0));
  end if;

  -- Maç sonu özeti: her soru izleyenin bakışıyla.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tip', h.v4 ->> 'tip', 'tur', h.tur, 'sonuc', h.v4 ->> 'sonuc',
             'kontrol_sonra', h.v4 -> 'kontrol_sonra', 'seri_sonra', h.v4 -> 'seri_sonra',
             'kategori', h.v4 -> 'oyuncular' -> v_me::text ->> 'kategori',
             'rakip_kategori', h.v4 -> 'oyuncular' -> v_rakip::text ->> 'kategori',
             'soru', sd.soru, 'secenekler', sd.secenekler,
             'dogru_cevap', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru_cevap'),
             'benim_cevabim', (h.v4 -> 'oyuncular' -> v_me::text -> 'cevap'),
             'ben_dogru', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru'),
             'ben_yanitsiz', (h.v4 -> 'oyuncular' -> v_me::text -> 'yanitsiz'),
             'rakip_dogru', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'dogru'),
             'rakip_yanitsiz', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'yanitsiz')) order by h.id), '[]'::jsonb)
      into v_gecmis
      from public.duello_hamleler h
      left join lateral public.soru_dilinde((h.v4 -> 'oyuncular' -> v_me::text ->> 'soru_id')::uuid, v_dil) sd on true
     where h.duello_id = p_id and h.v4 is not null;
  end if;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0), 'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = d.v4_soru_no;
  v_kilit := case
    when d.faz not in ('notr', 'cevap') or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar ? v_me::text or v_ilk is not null then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and d.cevaplar <> '{}'::jsonb then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 4,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'rakip', v_rakip,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru1, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru2, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'v4', jsonb_build_object(
      'kontrol', d.v4_kontrol, 'seri', d.v4_seri, 'seri_hedef', d.v4_seri_hedef,
      'tur', d.v4_tur, 'max_tur', d.v4_max_tur, 'notr_seri', d.v4_notr_seri, 'notr_max', d.v4_notr_max,
      'son', d.v4_son, 'soru_no', d.v4_soru_no,
      -- 1093: Son Düello toplam soru sınırında (nötr + saldırı); rehber = bu maç oyuncunun ilk Düello rehberi maçı
      'max_soru', coalesce(d.v4_max_soru, public.ayar_sayi('duello4_max_soru', 20)::smallint),
      -- 1102: Son Düello soru sınırı; berabere = bu sınırda kazanan çıkmadı
      'son_max', coalesce(d.v4_son_max, public.ayar_sayi('duello4_son_max', 10)::smallint),
      'berabere', coalesce(d.v4_berabere, false),
      'rehber', coalesce((select p.duello_rehber_mac = d.id from public.profiles p where p.id = v_me), false),
      -- 1092: iki oyuncu da maç ekranına gelene kadar ilk soru kurulmaz (istemci "Rakip bağlanıyor…" gösterir)
      'giris_bekle', d.durum = 'aktif' and d.faz = 'notr' and d.v4_soru_no = 0 and d.soru_id is null, 'kullanilan', to_jsonb(d.v4_kullanilan),
      'kart', v_kart,
      -- Saldırı turunda kategoriler kart fazı bitince iki oyuncuya da açılır.
      'benim_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori1 else d.kategori2 end end,
      'rakip_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori2 else d.kategori1 end end,
      'oto', case when d.faz <> 'kart' then d.v4_kart_oto end,
      -- 1058: hangi adım otomatik seçildi (istemci "Süre doldu · otomatik seçildi"yi yalnız o kategoride yazar)
      'oto_gonder', case when d.faz <> 'kart' then d.v4_oto_gonder end,
      'oto_sec', case when d.faz <> 'kart' then d.v4_oto_sec end,
      'ilk_mac', not exists (select 1 from public.duellolar x
                              where x.surum = 4 and x.durum = 'bitti' and x.id <> d.id and v_me in (x.oyuncu1, x.oyuncu2))),
    'soru', v_soru,
    'cevap', case when d.faz in ('notr', 'cevap', 'son') then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'kapali', d.v4_son,
       'set', to_jsonb(public.skill_setim('duello')),
       'izinli', to_jsonb(public.duello4_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan', 'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda, 'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kart', public.ayar_sayi('duello4_kart_sn', 7),
       'kart_duyuru_ms', public.ayar_sayi('duello4_kart_duyuru_ms', 900),
       'cevap', public.ayar_sayi('duello4_cevap_sn', 15),
       'sonuc', public.ayar_sayi('duello4_sonuc_sn', 3),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'acilis_ms', case when d.faz = 'cevap' then coalesce(d.v4_acilis_ms, 0) else 0 end,   -- 1092
       'kart_payi_ms', case when d.faz = 'kart' then coalesce(d.v4_kart_payi_ms, 0) else 0 end,   -- 1092
       'gosterim_bas', case
          when d.faz = 'kart' then coalesce(d.v4_duyuru_bitis, d.faz_bitis - make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)))
          when d.faz = 'cevap' then d.soru_baslangic + make_interval(secs => coalesce(d.v4_acilis_ms, 0) / 1000.0) + public.duello2_gosterim_payi()   -- 1092
          when d.faz in ('notr', 'son') then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'terk_eden', d.terk_eden, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))));
end $function$;

-- bot_tepki_gonder
CREATE OR REPLACE FUNCTION public.bot_tepki_gonder(p_kanal text, p_bot uuid, p_olay text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_gizli boolean;
  v_level int;
  v_paket text;
  v_aday text[];
  v_gecikme_min numeric;
  v_gecikme_max numeric;
begin
  if random() >= public.ayar_ondalik('tepki_bot_olasilik', 0.03) then return; end if;
  select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu) and not coalesce(p.acik_bot, false),
         p.level
    into v_gizli, v_level
    from public.profiles p where p.id = p_bot and coalesce(p.is_bot, false);
  if not found then return; end if;

  v_aday := case p_olay when 'dogru' then array['havali'] when 'yanlis' then array['terli']
                        when 'dusun' then array['dusunen'] when 'saygi' then array['alkis'] else array[]::text[] end;
  if v_gizli then
    v_paket := public.bot_kozmetik(p_bot, v_level, 'tepki_paketi');
    if v_paket = 'tepki_eglence' then
      v_aday := v_aday || case p_olay when 'dogru' then array['ates', 'hedef'] when 'yanlis' then array['gulen']
                                      when 'saygi' then array['tac'] else array[]::text[] end;
    elsif v_paket = 'tepki_rekabet' then
      v_aday := v_aday || case p_olay when 'dogru' then array['kas'] when 'yanlis' then array['korku']
                                      when 'saygi' then array['selam', 'rica'] else array[]::text[] end;
    end if;
  end if;
  if cardinality(v_aday) = 0 then return; end if;

  v_gecikme_min := public.ayar_ondalik('bot_tepki_gecikme_min_sn', 1);
  v_gecikme_max := public.ayar_ondalik('bot_tepki_gecikme_max_sn', 4);
  insert into public.bot_tepki_bekleyen (tur, kanal, bot, icerik, gonder_zamani)
  values ('realtime', p_kanal, p_bot, v_aday[1 + floor(random() * cardinality(v_aday))::int],
          now() + (v_gecikme_min + random() * greatest(v_gecikme_max - v_gecikme_min, 0)) * interval '1 second');
exception when others then
  raise warning 'bot tepkisi kuyruklanamadı (%): %', p_kanal, sqlerrm;   -- tepki maçı asla bozmaz
end;
$function$;

-- trg_duello_bot_tepki
CREATE OR REPLACE FUNCTION public.trg_duello_bot_tepki()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_bot uuid;
  v_insan uuid;
  v_mod text;
  v_bot_dogru boolean;
  v_insan_dogru boolean;
  v_seri int;
  v_onceki int;
  v_olay text;
begin
  select p.id into v_bot from public.profiles p
   where p.id in (new.oyuncu1, new.oyuncu2) and coalesce(p.is_bot, false) limit 1;
  if v_bot is null then return null; end if;
  v_insan := case when v_bot = new.oyuncu1 then new.oyuncu2 else new.oyuncu1 end;
  v_mod := public.tepki_mac_modu('duello', new.id, v_insan);
  if v_mod is null or not public.tepki_mod_acik(v_mod) then return null; end if;

  v_bot_dogru := coalesce((new.son_hamle -> 'cevaplar' -> v_bot::text ->> 'dogru')::boolean, false);
  v_insan_dogru := coalesce((new.son_hamle -> 'cevaplar' -> v_insan::text ->> 'dogru')::boolean, false);
  v_seri := greatest(2, public.ayar_sayi('tepki_bot_seri', 3)::int);

  if new.durum = 'bitti' then
    -- maç sonu
    v_olay := case when new.kazanan = v_bot then 'dogru'
                   when new.kazanan = v_insan then 'saygi'
                   else 'dusun' end;
  elsif not v_insan_dogru then
    -- rakip hatası (yanlış ya da cevapsız)
    v_olay := case when v_bot_dogru then 'dogru' else 'dusun' end;
  elsif v_bot_dogru then
    select count(*) into v_onceki from (
      select (h.saldiran = v_bot and coalesce(h.dogru_saldiran, false)) or (h.savunan = v_bot and h.dogru) as bd
        from public.duello_hamleler h
       where h.duello_id = new.id
       order by h.id desc
       limit v_seri - 1) x
     where x.bd;
    if v_onceki < v_seri - 1 then return null; end if;
    v_olay := 'dogru';   -- doğru cevap serisi
  else
    return null;   -- anlamlı an değil
  end if;

  perform public.bot_tepki_gonder('tepki-duello-' || new.id::text, v_bot, v_olay);
  return null;
exception when others then
  raise warning 'trg_duello_bot_tepki (%): %', new.id, sqlerrm;
  return null;
end;
$function$;

-- kasa_soru_ac
CREATE OR REPLACE FUNCTION public.kasa_soru_ac(p_id uuid, p_soru uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_soru uuid := p_soru;
  v_kat text;
  v_dogru smallint;
  v_bot_cevap smallint;
  v_gecikme numeric;
  v_min numeric := public.ayar_ondalik('kasa_bot_cevap_min_sn', 2);
  v_max numeric := public.ayar_ondalik('kasa_bot_cevap_max_sn', 6);
  v_an interval := interval '0';   -- 1092
begin
  select * into k from public.kasa_maclari where id = p_id;
  -- 1092: karar fazından gelen soru (AÇ/DEVAM, rakip karar kartı) — an ekranda sürerken soru süresi işlemez: soru anı
  -- an süresi (kasa_karar_an_ms) kadar ileri kurulur; gösterim payı ondan SONRA başlar (sayaç hep tam süreden görünür).
  if k.faz = 'karar' then v_an := make_interval(secs => greatest(0, public.ayar_sayi('kasa_karar_an_ms', 1500)) / 1000.0); end if;
  if v_soru is null and not k.altin and k.tur between 1 and coalesce(array_length(k.soru_ids, 1), 0) then
    v_soru := k.soru_ids[k.tur];
    if v_soru = any(k.kullanilan_sorular) then v_soru := null; end if;
  end if;
  if v_soru is null then v_soru := public.kasa_soru_bul(p_id); end if;
  if v_soru is null then
    -- Havuz tamamen boş: ödülsüz iptal (asılı kalmasın)
    update public.kasa_maclari set durum = 'iptal', bitis = now(), son_hareket = now() where id = p_id;
    return;
  end if;
  select q.kategori, q.dogru_cevap into v_kat, v_dogru from public.questions q where q.id = v_soru;

  if k.bot is not null then
    if random() < public.bot_soru_isabet(k.bot, v_kat, v_soru) then
      v_bot_cevap := v_dogru;
    else
      select x into v_bot_cevap from generate_series(0, 3) x where x <> v_dogru order by random() limit 1;
    end if;
    v_gecikme := least(v_min + (greatest(v_max, v_min) - v_min) * random()::numeric, k.soru_sn - 1);
  end if;

  update public.kasa_maclari
     set soru_id = v_soru,
         kullanilan_sorular = array_append(kullanilan_sorular, v_soru),
         faz = 'cevap',
         soru_baslangic = now() + v_an,
         faz_bitis = now() + v_an + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         -- soru başına girdiler silinir; maç boyu anahtarlar kalır: '_devam' (953 sayacı), '_hak' (954 ücretsiz 50:50)
         joker = coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(joker) e
                            where e.key in ('_devam', '_hak')), '{}'::jsonb),
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when k.bot is not null
                             then now() + v_an + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler set soru_id = v_soru, kategori = v_kat where kasa_id = p_id and tur = k.tur;
  perform public.kasa_devam_hak_ver(p_id);
end $function$;

-- kasa_savunma_ac
CREATE OR REPLACE FUNCTION public.kasa_savunma_ac(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_h uuid;
  v_soru uuid;
  v_kat text;
  v_dogru smallint;
  v_bot_cevap smallint;
  v_gecikme numeric;
  v_min numeric := public.ayar_ondalik('kasa_bot_cevap_min_sn', 2);
  v_max numeric := public.ayar_ondalik('kasa_bot_cevap_max_sn', 6);
begin
  select * into k from public.kasa_maclari where id = p_id;
  if not found or k.durum <> 'aktif' or k.savunma is null or k.savunma ->> 'durum' <> 'bekliyor' then return; end if;
  v_h := (k.savunma ->> 'sahip')::uuid;
  v_soru := public.kasa_savunma_soru_bul(p_id, k.savunma ->> 'kategori');
  if v_soru is null then
    -- Havuz boş (pratikte olmaz): savunma yapılamadı → başarısız sayılır, rakip kararını verir
    update public.kasa_maclari
       set sahip = (k.savunma ->> 'rakip')::uuid, savunma = null,
           savunma_hak = array_remove(savunma_hak, v_h), son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set sahip_sonra = (k.savunma ->> 'rakip')::uuid,
           savunma = k.savunma || jsonb_build_object('durum', 'basarisiz', 'neden', 'soru_yok')
     where kasa_id = p_id and tur = k.tur;
    perform public.kasa_tur_baslat(p_id);
    return;
  end if;
  select q.kategori, q.dogru_cevap into v_kat, v_dogru from public.questions q where q.id = v_soru;

  if k.bot is not null and k.bot = v_h then
    if random() < public.bot_soru_isabet(k.bot, v_kat, v_soru) then
      v_bot_cevap := v_dogru;
    else
      select x into v_bot_cevap from generate_series(0, 3) x where x <> v_dogru order by random() limit 1;
    end if;
    v_gecikme := least(v_min + (greatest(v_max, v_min) - v_min) * random()::numeric, k.soru_sn - 1);
  end if;

  update public.kasa_maclari
     set soru_id = v_soru,
         kullanilan_sorular = array_append(kullanilan_sorular, v_soru),
         faz = 'cevap',
         soru_baslangic = now(),
         faz_bitis = now() + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         joker = coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(joker) e
                            where e.key in ('_devam', '_hak')), '{}'::jsonb),
         -- Bot yalnız savunan ise cevaplar (rakip bot izler)
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when v_bot_cevap is not null
                             then now() + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         savunma = k.savunma || jsonb_build_object('durum', 'soru', 'soru_id', v_soru, 'soru_kategori', v_kat),
         savunma_hak = array_remove(savunma_hak, v_h),
         son_hareket = now()
   where id = p_id;
end $function$;

-- 1127: bot_grup_adimlari eski tanımı (bot_eski_tepki_kuyrukla); bot_oyna yukarıda 1126 öncesine döndü (1127 de geri alınır)
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

drop function if exists public.bot_tepki_grup(uuid, uuid, boolean);
delete from supabase_migrations.schema_migrations where version = '20260612001127';

drop trigger if exists trg_duello_bot_tepki on public.duellolar;
CREATE TRIGGER trg_duello_bot_tepki AFTER UPDATE OF son_hamle ON public.duellolar FOR EACH ROW WHEN (((new.son_hamle IS DISTINCT FROM old.son_hamle) AND (new.surum = 2) AND (new.son_hamle IS NOT NULL))) EXECUTE FUNCTION trg_duello_bot_tepki();
drop trigger if exists trg_kasa_bot_tepki_tur on public.kasa_hamleler;
drop trigger if exists trg_kasa_bot_tepki_son on public.kasa_maclari;
drop function if exists public.trg_kasa_bot_tepki();
drop function if exists public.duello4_bot_joker(uuid, uuid);
drop function if exists public.duello4_joker_ic(uuid, uuid, text);
drop function if exists public.rakip_jokerleri(text, uuid);
drop function if exists public.bot_klasik_cevap(uuid, uuid, integer, uuid);
drop function if exists public.skill_hazirla_ic(uuid, text, uuid, integer, text);
drop function if exists public.joker_kullan_ic(uuid, text, uuid, integer, text);
drop function if exists public.joker_hak_kontrol_ic(uuid, text, uuid, text);
drop table if exists public.bot_tepki_gecmisi;
delete from public.oyun_ayarlari where anahtar = 'kasa_bot_gecikme_profili';
delete from supabase_migrations.schema_migrations where version = '20260612001126';

commit;
