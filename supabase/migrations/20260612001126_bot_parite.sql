-- 1126 · Bot paritesi (Ida, 17 Eki 2026 — "botlar bütün modlarda insan gibi davranmalı"; 1125 Hazine bot jokerinin devamı)
--
-- Ölçüm (canlı, salt okuma, son 30 gün — docs/raporlar/RAPOR-bot-parite.md):
--   · Düello v4: 61 botlu maç, bot joker 0, bot tepki tetiği yalnız surum 2 → v4'te bot tepkisi yok.
--   · Klasik: bot yalnız Zaman Baskısı / Soru Değiştir (kendi kural kopyası, bot_klasik_joker_tik); insan 50:50, Ek Süre,
--     Sigorta, Çifte Puan, İkinci Şans da kullanıyor.
--   · Hazine: bot tepkisi yok; bot cevabı herkese aynı 2–6 sn (bot ort. 4,1 sn; Klasik botu 6,2 sn, bota/soruya göre).
--   · Turnuva / Grup: insanın arayüzünde joker yok (Grup'ta use_group_joker hiç çağrılmıyor, 0 satır) → botta da yok, dokunulmadı.
--   · Bot tepkilerinde 3 sn / maçta 10 sınırı sunucuda hiç uygulanmıyordu.
--
-- İlke (Hazine 1125 ile aynı): insanın joker fonksiyonunun gövdesi AYNEN bir iç fonksiyona taşınır, insan yolu onu auth.uid() ile,
-- bot kendi id'siyle çağırır. Kuralı baypas eden ayrı yol yok; botun tek farkı kullanımın ücretsiz sayılması.
-- Yeni sayı yok: oranlar mevcut ayarlardan (klasik_bot_joker_yuzde 15, duello_bot_joker_yuzde 15, tepki_bot_olasilik 0.03,
-- tepki_aralik_sn 3, tepki_mac_max 10, bot_gecikme_*). Tek yeni ayar kasa_bot_gecikme_profili (1 = yeni, 0 = eski 2–6 sn).
-- Yetki: mevcut fonksiyonların yetkisi DEĞİŞMEZ (create or replace korur). Yeni iç fonksiyonlar 1125'teki gibi istemciye kapalı;
-- yeni iç tablo bot_tepki_gecmisi 673'teki bot_tepki_bekleyen gibi kapalı. Yeni istemci fonksiyonu rakip_jokerleri varsayılan
-- yetkiyle (joker_mac_durumu gibi: authenticated). Geri alma: docs/bot-parite-geri-al.sql.

-- ===================================================================== 1) KLASİK — bot bütün joker türlerini insanla AYNI kuraldan kullanır
CREATE OR REPLACE FUNCTION public.joker_hak_kontrol_ic(p_me uuid, p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := p_me;   -- 1126: oyuncu parametreyle (insan: auth.uid(), bot: bot id)
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

CREATE OR REPLACE FUNCTION public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- 1126: gövde joker_hak_kontrol_ic'e taşındı (bot da aynı kuraldan geçer); insan yolu aynı
  perform public.joker_hak_kontrol_ic(auth.uid(), p_mac_tur, p_mac_id, p_tur);
end;
$function$;

CREATE OR REPLACE FUNCTION public.joker_kullan_ic(p_me uuid, p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := p_me;   -- 1126: insan auth.uid() (joker_kullan), bot kendi id'si
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

  perform public.joker_hak_kontrol_ic(v_me, p_mac_tur, p_mac_id, p_tur);

  -- "Soru Değiştir maç başına 1 kez" kuralı artık BÜTÜN türler için geçerli;
  -- yukarıdaki joker_hak_kontrol uyguluyor, ayrı istisnaya gerek kalmadı.

  -- Ücretsiz 50:50 yalnız SERBEST Klasik Mod'da (Paket 27 B.1.2).
  if p_tur = 'elli' then
    v_ucretsiz := public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id);
  end if;

  -- Paket 34: ücretsiz modda envanterden düşülmez
  v_ucretsiz := v_ucretsiz or public.jokerler_serbest();
  -- 1126: botun envanteri/coin'i yok → kullanımı ücretsiz sayılır (Hazine 1125 ile aynı; kurallar değişmez)
  v_ucretsiz := v_ucretsiz or exists (select 1 from public.profiles pb where pb.id = v_me and coalesce(pb.is_bot, false));
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', p_mac_tur || ':' || p_mac_id::text);
  end if;

  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, p_mac_tur, p_mac_id, v_aktif_soru, p_tur, v_ucretsiz);
  -- 1126: kapı (skill_kullanim_kapisi) botun pasif skill satırını sessizce düşürür → etki de uygulanmasın
  if not found then raise exception 'Bu skill artık aktif değil'; end if;
  -- 1126: Klasik'te rakip her jokeri görsün (rakip_jokerleri) — istemci joker_surum değişince okur
  if p_mac_tur = '1v1' then update public.matches set joker_surum = joker_surum + 1 where id = p_mac_id; end if;

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

CREATE OR REPLACE FUNCTION public.joker_kullan(p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.hiz_siniri('joker_kullan', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  -- 1126: gövde joker_kullan_ic'e taşındı (Klasik botu da aynı fonksiyondan geçer); insan yolu aynı
  return public.joker_kullan_ic(auth.uid(), p_mac_tur, p_mac_id, p_soru_index, p_tur);
end;
$function$;

CREATE OR REPLACE FUNCTION public.skill_hazirla_ic(p_me uuid, p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_me uuid:=p_me; v_ucretsiz boolean:=false;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur not in ('sigorta','cifte_puan','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  if p_mac_tur<>'1v1' then raise exception 'Bu skill bu modda kullanılamaz'; end if;
  if p_soru_index is null then raise exception 'Soru bilgisi gerekli'; end if;
  perform public.joker_hak_kontrol_ic(v_me,p_mac_tur,p_mac_id,p_tur);
  v_ucretsiz:=public.jokerler_serbest()
    or exists(select 1 from public.profiles pb where pb.id=v_me and coalesce(pb.is_bot,false));   -- 1126: bot ücretsiz
  if not v_ucretsiz then perform public.joker_hareket(v_me,p_tur,-1,'kullanim',p_mac_tur||':'||p_mac_id::text); end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,p_mac_tur,p_mac_id,p_soru_index,p_tur,v_ucretsiz);
  if not found then raise exception 'Bu skill artık aktif değil'; end if;   -- kapı botun pasif skill satırını düşürdü
  update public.matches set joker_surum=joker_surum+1 where id=p_mac_id;   -- 1126: rakip görsün (rakip_jokerleri)
  return jsonb_build_object('tur',p_tur);
end;
$function$;

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
  -- 1126: Klasik kolu skill_hazirla_ic'e taşındı (Klasik botu da aynı fonksiyondan geçer)
  return public.skill_hazirla_ic(v_me,p_mac_tur,p_mac_id,p_soru_index,p_tur);
end;
$function$;

CREATE OR REPLACE FUNCTION public.bot_klasik_cevap(p_mac uuid, p_bot uuid, p_idx integer, p_soru uuid)
 RETURNS TABLE(cevap smallint, puan integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.questions%rowtype;
  v_c smallint;
  v_elli boolean;
  v_skill text;
  v_d boolean;
begin
  select * into q from public.questions where id = p_soru;
  if not found then return; end if;
  -- İsabet aynen (bot_soru_isabet)
  if random() < public.bot_soru_isabet(p_bot, q.kategori, q.id) then
    v_c := q.dogru_cevap;
  else
    select x into v_c from generate_series(0, 3) x where x <> q.dogru_cevap order by random() limit 1;
  end if;
  -- 1126: botun bu sorudaki jokeri (insanın ekranda yaşadığının karşılığı; Hazine 1125 ile aynı kalıp)
  select bool_or(k.tur = 'elli'),
         (array_agg(k.tur order by k.created_at desc) filter (where k.tur in ('sigorta','cifte_puan','ikinci_sans')))[1]
    into v_elli, v_skill
    from public.joker_kullanimlari k
   where k.mac_tur = '1v1' and k.mac_id = p_mac and k.user_id = p_bot and k.soru_index = p_idx;
  -- 50:50: yanlışa gidiyorsa kalan iki şık arasında yarı yarıya
  if v_c <> q.dogru_cevap and coalesce(v_elli, false) and random() < 0.5 then v_c := q.dogru_cevap; end if;
  -- İkinci Şans: yanlışa gidiyorsa ilk cevabı elenir, kalan üç şıktan biri
  if v_c <> q.dogru_cevap and v_skill = 'ikinci_sans' then
    select x into v_c from generate_series(0, 3) x where x <> v_c order by random() limit 1;
  end if;
  v_d := (v_c = q.dogru_cevap);
  -- Puan submit_match_answer ile AYNI (Çifte Puan 20, Sigorta yanlışta 5; hız bonusu yok)
  return query select v_c,
    case when v_d and v_skill = 'cifte_puan' then 20 when v_d then 10 when v_skill = 'sigorta' then 5 else 0 end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bot_klasik_joker_tik()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; v_tur text; v_ok boolean;
begin
  if not pg_try_advisory_xact_lock(hashtext('bot_klasik_joker_tik')) then return; end if;
  -- Zaman ve olasılık 255'teki gibi (soru başına sabit tohum, 2–8 sn arası bir an, ilk 10 sn, klasik_bot_joker_yuzde).
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
    -- Bot bu soruda zaten joker kullandıysa ya da biri cevapladıysa denemez (insan cevaplayınca bot hemen cevaplar — 1088)
    continue when exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.soru_index=r.idx and k.user_id=r.bot_id);
    continue when exists(select 1 from public.match_answers a where a.match_id=r.id and a.soru_index=r.idx and a.user_id in(r.insan_id,r.bot_id));
    -- 1126: oyuncunun Klasik'te kullanabildiği BÜTÜN aktif türler, rastgele sırayla; kural İNSANLA AYNI iç fonksiyonlarda
    -- (joker_kullan_ic / skill_hazirla_ic + skill_kullanim_kapisi: maç/tür/soru sınırları, jokersiz maç, süre, cevaplanmış soru,
    -- Zaman Baskısı rakip cevaplamadıysa). Kural reddederse sonraki tür; hiçbiri olmazsa bu soruda vazgeçer. Tek fark: ücretsiz.
    v_ok := false;
    for v_tur in
      select t from unnest(array['elli','sure','soru_degistir','zaman_baskisi','sis','sigorta','cifte_puan','ikinci_sans']) t
       where public.skill_aktif(t)
       order by public.bot_rasgele('kjt:'||r.id::text||':'||r.idx||':'||t)
    loop
      begin
        if v_tur in ('sigorta','cifte_puan','ikinci_sans') then
          perform public.skill_hazirla_ic(r.bot_id,'1v1',r.id,r.idx,v_tur);
        else
          perform public.joker_kullan_ic(r.bot_id,'1v1',r.id,r.idx,v_tur);
        end if;
        v_ok := true;
      exception when others then
        v_ok := false;
      end;
      exit when v_ok;
    end loop;
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
          -- 1126: isabet + botun kendi jokeri tek yerde (bot_klasik_cevap; bot_oyna ile aynı)
          select bc.cevap,bc.puan into b_c,b_p from public.bot_klasik_cevap(b_m.id,b_id,b_idx,b_q.id) bc;
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

CREATE OR REPLACE FUNCTION public.rakip_jokerleri(p_mac_tur text, p_mac_id uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- 1126: Klasik (1v1, eş zamanlı) — rakibin ORTAK aktif sorudaki joker türleri, kullanım sırasıyla. Yalnız maçtaki oyuncuya.
  select coalesce(array_agg(k.tur order by k.created_at), '{}'::text[])
    from public.matches m
    join public.joker_kullanimlari k on k.mac_tur = '1v1' and k.mac_id = m.id and k.soru_index = m.aktif_soru
                                     and k.user_id <> auth.uid()
   where p_mac_tur = '1v1' and m.id = p_mac_id and coalesce(m.senkron, false)
     and auth.uid() in (m.oyuncu1, m.oyuncu2);
$function$;

revoke all on function public.joker_hak_kontrol_ic(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.joker_kullan_ic(uuid, text, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.skill_hazirla_ic(uuid, text, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.bot_klasik_cevap(uuid, uuid, integer, uuid) from public, anon, authenticated;
revoke all on function public.rakip_jokerleri(text, uuid) from public, anon;
