-- ============================================================
-- 1114 SÜRE DOLDU BİLDİRİMİ (16 Eki 2026 — Hazine kök neden: "sayaç 0'da takılı kaldı, sonra sayfa bir anda geçti")
--
-- KÖK NEDEN: cevaplamadan süresi dolan oyuncu için sunucu soruyu 5 sn daha açık tutuyordu (cevap_gec_varis_sn, 991 —
-- süre içinde dokunup ağda geç varan cevabın payı). Sunucu oyuncunun dokunup dokunmadığını bilemez, ama oyuncunun
-- KENDİ istemcisi bilir. Ida'nın 16 Eki 01:46 maçında (kasa bbed4452) 1. turda cevap yok → sayaç 0'da ~5–6 sn.
-- Düello v4'te aynı kalıp (cevap 5 sn; kart fazı secim_gec_varis_sn 3 sn).
--
-- DÜZELTME: istemci kişisel süresi bitince (dokunmadıysa) bildirir; sunucu payı bu oyuncu için beklemez:
--   kasa_cevap(p_id, -1) · duello4_cevap(p_id, -1) (duello_cevap üzerinden) · duello4_kart(p_id, null)
--     (duello_kategori_sec üzerinden) · submit_group_match_answer(-1) · submit_tournament_answer(-1) — Grup/Turnuva'da
--     sunucu ortak soruyu cevapsız oyuncu için 5 sn açık tutuyordu ("Süre doldu" ekranı 5–6 sn kalıyordu); bu ikisinde
--     doğru şık da döner (Klasik mac_soruyu_atla gibi), soru istatistiği / Hatalarım yazılmaz.
--   Karar fazındaki 1063 (kasa_karar p_ac = null) deseninin aynısı.
-- Kayıt yanıtsızla aynıdır (cevap null, at null); yalnız sunucu saatiyle süre dolduysa kabul edilir ('Süre dolmadı').
-- Rakip hâlâ düşünüyorsa onun süresi ve geç varış payı AYNEN beklenir.
-- GÜVENLİK: yalnız fonksiyon gövdeleri — imza, security definer, GRANT/REVOKE, RLS DEĞİŞMEDİ (create or replace yetkileri korur).
-- Geri alma: docs/sure-doldu-1114-geri-al.sql
-- ============================================================

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
  if p_cevap is null or p_cevap not between -1 and 3 then raise exception 'Geçersiz cevap'; end if;   -- 1114: -1 = süre doldu, cevabım yok
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and v_me::text is distinct from k.savunma ->> 'sahip' then
    raise exception 'Savunma Sorusunu yalnız hak sahibi cevaplar';
  end if;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  -- 1114: kişisel süresi dolan oyuncunun istemcisi "cevabım yok" der → sunucu geç varış payını (cevap_gec_varis_sn, 5 sn)
  -- bu oyuncu için beklemez. Kayıt yanıtsızla AYNI (cevap null, at null → kasa_cozumle yanlış sayar, sure_ms null).
  -- Yalnız süre gerçekten dolduysa (sunucu saati); erken gelen istek reddedilir, istemci kısa süre sonra yeniden dener.
  if p_cevap = -1 then
    if now() < public.kasa_oyuncu_bitis(k, v_me) then raise exception 'Süre dolmadı'; end if;
    update public.kasa_maclari
       set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', null, 'at', null, 'sure_doldu', true))
     where id = p_id;
    if k.bot is not null and v_me is distinct from k.bot and not (k.cevaplar ? k.bot::text)
       and k.bot_cevap_at is not null and k.bot_cevap_at > now()
       and not (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
      update public.kasa_maclari set bot_cevap_gercek = least(bot_cevap_at, now() + interval '2.5 seconds'), bot_cevap_at = now() where id = p_id;
    end if;
    perform public.kasa_ilerlet(p_id);
    perform public.kasa_sinyal_ver(p_id);
    return jsonb_build_object('cevaplandi', false, 'sure_doldu', true);
  end if;
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

CREATE OR REPLACE FUNCTION public.duello4_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_bitis timestamptz;
  v_soru uuid;
  v_dogru boolean;
  v_index int;
  v_ilk smallint;
  v_ikinci boolean;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between -1 and 3 then raise exception 'Geçersiz cevap'; end if;   -- 1114: -1 = süre doldu, cevabım yok
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz not in ('notr', 'cevap', 'son') then raise exception 'Şu an cevap verilemez'; end if;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() < d.soru_baslangic then raise exception 'Şu an cevap verilemez'; end if;
  v_bitis := case when v_me = d.oyuncu1 then d.bitis1 else d.bitis2 end;
  -- 1114: kişisel süresi dolan oyuncu "cevabım yok" der → sunucu 5 sn geç varış payını bu oyuncu için beklemez.
  -- Kayıt yanıtsızla AYNI (cevap null → duello4_cozumle yanıtsız/yanlış sayar). Yalnız süre gerçekten dolduysa.
  if p_cevap = -1 then
    if v_bitis is null or now() < v_bitis then raise exception 'Süre dolmadı'; end if;
    update public.duellolar
       set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', null, 'at', null, 'sure_doldu', true))
     where id = p_id;
    perform public.duello4_ilerlet(p_id);
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('tekrar_hakki', false, 'cevaplandi', false, 'sure_doldu', true);
  end if;
  if not public.cevap_gec_kabul(v_bitis, make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)), public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;
  v_soru := case when v_me = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
  v_index := d.v4_soru_no;
  v_dogru := p_cevap = (select dogru_cevap from public.questions where id = v_soru);

  v_ikinci := exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                        and k.user_id = v_me and k.soru_index = v_index and k.tur = 'ikinci_sans');
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_index for update;
  if v_ikinci and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri (mac_tur, mac_id, user_id, soru_index, ilk_cevap)
    values ('duello', p_id, v_me, v_index, p_cevap);
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('tekrar_hakki', true, 'ilk_yanlis_cevap', p_cevap);
  end if;
  if v_ilk is not null and p_cevap = v_ilk then raise exception 'Başka bir cevap seç'; end if;

  update public.duellolar
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', least(now(), v_bitis))),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(v_soru);
  if not v_dogru then perform public.yanlis_kaydet(v_soru); end if;
  perform public.duello4_ilerlet(p_id);
  perform public.duello_sinyal_ver(p_id);
  return jsonb_build_object('tekrar_hakki', false, 'cevaplandi', true);
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_kart(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  -- Çift dokunuş / yeniden gönderim: aynı kart bu turda zaten işlendiyse sessizce geç (idempotent).
  if d.v4_kontrol is not distinct from auth.uid() and p_kategori is not null
     and ((p_kategori = d.v4_gonderilen and (d.faz <> 'kart' or d.v4_secilen is null))
          or p_kategori = d.v4_secilen) then
    return;
  end if;
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  -- 1114: kart sahibinin süresi doldu, seçmedi (p_kategori null) → sunucu 3 sn geç varış payını beklemeden otomatik seçer
  -- (eskiden sayaç 0'da ~3 sn bekliyordu). Yalnız kontrol sahibi ve yalnız süre gerçekten dolduysa.
  if p_kategori is null and d.faz = 'kart' and d.v4_kontrol is not distinct from auth.uid() then
    if now() < d.faz_bitis then raise exception 'Süre dolmadı'; end if;
    perform public.duello4_kart_oto(p_id);
    perform public.duello4_ilerlet(p_id);
    perform public.duello_sinyal_ver(p_id);
    return;
  end if;
  if d.faz <> 'kart' or d.v4_kontrol is distinct from auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.cevap_gec_kabul(d.faz_bitis, interval '0 seconds', public.ayar_ondalik('secim_gec_varis_sn', 3)) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  if p_kategori is null or not (p_kategori = any(d.v4_kartlar)) then raise exception 'Bu kategori şu an seçilemez'; end if;
  if p_kategori is not distinct from d.v4_gonderilen then raise exception 'Bu kategoriyi rakibe gönderdin'; end if;
  if d.v4_gonderilen is null then
    perform public.duello4_kart_uygula(p_id, p_kategori, null, false);
  else
    perform public.duello4_kart_uygula(p_id, null, p_kategori, false);
  end if;
  perform public.duello_sinyal_ver(p_id);
end $function$;

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

  -- 1114: kişisel süresi dolan oyuncunun istemcisi "cevabım yok" der (p_cevap = -1) → advance_group_match bu oyuncu için
  -- geç varış payını (5 sn) beklemez. Satır yanıtsız/yanlış (cevap -1, dogru false); soru istatistiği / Hatalarım YAZILMAZ.
  -- Doğru şık döner (süresi bitmiş oyuncuya; Klasik mac_soruyu_atla gibi) → "Süre doldu" ekranı doğruyu da gösterir.
  if p_cevap = -1 then
    if now() < v_bas + interval '15 seconds' then raise exception 'Süre dolmadı'; end if;
    select * into q from public.questions where id = v_soru_id;
    insert into public.group_match_answers (group_match_id, user_id, soru_index, cevap, dogru)
    values (p_group_match_id, auth.uid(), gm.aktif_soru, -1, false)
    on conflict do nothing;
    if not exists (
      select 1 from public.group_match_players hg
        join public.profiles hp on hp.id = hg.user_id and not coalesce(hp.is_bot, false)
       where hg.group_match_id = p_group_match_id and hg.davet_durumu = 'kabul' and hg.terk_at is null
         and not exists (select 1 from public.group_match_answers ha
                          where ha.group_match_id = p_group_match_id and ha.user_id = hg.user_id
                            and ha.soru_index = gm.aktif_soru)
    ) then
      perform public.bot_grup_mac_tik(p_group_match_id);
    end if;
    return query select false, q.dogru_cevap;
    return;
  end if;

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

  -- 1088: son insan cevapladıysa botlar hemen cevaplar (bot_grup_mac_tik hatayı kendi içinde yutar).
  -- 1100 (Paket A/8): bot adımı YALNIZ son insan cevabında çalışır — öncesinde ne botların bekleme kısaltması ne soru
  -- ilerletme mümkün; maç satırı kilitliyken boşuna iş yapılmaz. Gecikmesi dolan bot cron tikinde (2-5 sn) cevaplar.
  if not exists (
    select 1 from public.group_match_players hg
      join public.profiles hp on hp.id = hg.user_id and not coalesce(hp.is_bot, false)
     where hg.group_match_id = p_group_match_id and hg.davet_durumu = 'kabul' and hg.terk_at is null
       and not exists (select 1 from public.group_match_answers ha
                        where ha.group_match_id = p_group_match_id and ha.user_id = hg.user_id
                          and ha.soru_index = gm.aktif_soru)
  ) then
    perform public.bot_grup_mac_tik(p_group_match_id);
  end if;

  return query select v_dogru, q.dogru_cevap;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_tournament_answer(p_tournament_id uuid, p_cevap smallint, p_soru_index integer DEFAULT NULL::integer)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t public.tournaments%rowtype;
  q public.questions%rowtype;
  p public.tournament_players%rowtype;
  v_dogru boolean;
begin
  -- Hız sınırı: yalnız kullanıcı tetikli çağrılar (bkz. migration 115).
  perform public.hiz_siniri('submit_tournament_answer', 60, interval '60 seconds');
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Turnuva bulunamadı'; end if;
  if t.durum <> 'aktif' then raise exception 'Turnuva aktif değil'; end if;

  select * into p from public.tournament_players
  where tournament_id = p_tournament_id and user_id = auth.uid();
  if not found then raise exception 'Turnuvada değilsin'; end if;
  if p.elendi then raise exception 'Elendin'; end if;

  -- 329: istemci hangi soruyu cevapladığını söyler; soru değiştiyse (eski kart) reddedilir.
  if p_soru_index is not null and p_soru_index <> t.aktif_soru then raise exception 'Soru değişti, tekrar dene'; end if;
  -- 1114: süresi dolan oyuncu "cevabım yok" der (p_cevap = -1) → advance_tournament geç varış payını (5 sn) beklemez.
  -- Satır yanıtsız/yanlış (cevap -1, dogru false → elenir, eskisi gibi); soru istatistiği / Hatalarım YAZILMAZ; doğru şık döner.
  if p_cevap = -1 then
    if now() < t.soru_baslangic + interval '15 seconds' then raise exception 'Süre dolmadı'; end if;
    select * into q from public.questions where id = t.soru_ids[t.aktif_soru + 1];
    insert into public.tournament_answers (tournament_id, user_id, soru_index, cevap, dogru)
    values (p_tournament_id, auth.uid(), t.aktif_soru, -1, false)
    on conflict do nothing;
    return query select false, q.dogru_cevap;
    return;
  end if;
  -- 991: süre içinde tıklanıp geç varan cevap kabul
  if not public.cevap_gec_kabul(t.soru_baslangic + interval '15 seconds', interval '1 second', public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;

  select * into q from public.questions where id = t.soru_ids[t.aktif_soru + 1];
  v_dogru := (p_cevap = q.dogru_cevap);
  -- Zorluk kalibrasyonu: dogru oranini biriktir (bkz. migration 147).
  perform public.soru_sayac(q.id, v_dogru);

  insert into public.tournament_answers (tournament_id, user_id, soru_index, cevap, dogru)
  values (p_tournament_id, auth.uid(), t.aktif_soru, p_cevap, v_dogru);

  -- Hatalarım bankası
  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;

  if v_dogru then
    update public.tournament_players
       set dogru_sayisi = dogru_sayisi + 1
     where tournament_id = p_tournament_id and user_id = auth.uid();
  end if;

  return query select v_dogru, q.dogru_cevap;
end;
$function$;
