-- 1125 · Ortak Hazine botu joker kullanır (Ida, 17 Eki 2026 — "botlar insan gibi davranmalı")
--
-- Sorun: Hazine botu hiç joker yazmıyordu. kasa_joker oyuncuyu auth.uid() ile aldığı için sunucuda oynayan bot o fonksiyona
-- ulaşamıyordu; kasa_soru_ac / kasa_ilerlet_ic yalnız cevabı planlıyor/yazıyordu. Bu yüzden kasa_durum › rakip_joker hep boş,
-- "Rakip ___ kullandı" bildirimi bota karşı hiç çıkmıyordu (canlı ölçüm 17 Eki: son 30 günde 124 jokerli bot maçı, bot joker 0).
--
-- Yeni:
-- 1) kasa_joker gövdesi AYNEN kasa_joker_ic(p_id, p_me, ...)'e taşındı (iç, istemciye kapalı). kasa_joker yalnız hız sınırı +
--    kasa_kilitle (kilit, giriş kaydı, üyelik) yapıp onu auth.uid() ile çağırır → insan yolu davranışı değişmedi.
--    Tek fark bot içindir: botun envanteri/coin'i yok → kullanımı ücretsiz sayılır (Klasik bot jokeri gibi ucretsiz = true).
--    Bütün kurallar (jokerli maç, Altın Soru, faz 'cevap', kopukluk, Savunma Sorusu, cevaplanmış soru, kişisel süre, aynı tür,
--    985 maç/tür/soru başı sınırları, Zaman Baskısı rakip cevaplamadıysa) bot için de AYNI fonksiyonda işler.
-- 2) kasa_bot_joker(p_id) (iç): soru başına bir kez, kasa_bot_joker_yuzde (15) olasılıkla, soru içinde bir anda (oynanabilir
--    başlangıç ile botun planlı cevabı arasının %20–%60'ı) türleri rastgele sırayla kasa_joker_ic'e dener; kural reddederse
--    sonraki tür, hiçbiri olmazsa o soruda vazgeçer. Rakip cevapladıysa denemez (bot o anda zaten cevaplar — 1088).
--    Etki botun planlı cevabına yansır (insanın ekranda yaşadığının karşılığı): 50:50 → yanlışa gidiyorsa kalan iki şık
--    arasında yarı yarıya (954 bot kalıbı); İkinci Şans → yanlışa gidiyorsa kalan üç şıktan biri; Ek Süre / Zaman Baskısı
--    kasa_joker_ic'in kendi etkisi.
-- 3) kasa_ilerlet: kasa_ilerlet_ic'ten ÖNCE kasa_bot_joker çağrılır (kasa_durum / kasa_cevap / kasa_tik hepsi buradan geçer).
-- Geri alma: docs/kasa-bot-joker-1125-geri-al.sql (ya da kasa_bot_joker_yuzde = 0 → bot hiç denemez).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_bot_joker_yuzde', '15'::jsonb,
   'ORTAK HAZİNE (1125): botun bir soruda joker deneme olasılığı (%). İnsanla aynı kurallar (kasa_joker_ic). 0 = kapalı.')
on conflict (anahtar) do nothing;

-- ===================================================================== 1) kasa_joker_ic (987 kasa_joker gövdesi)
create or replace function public.kasa_joker_ic(p_id uuid, p_me uuid, p_tur text, p_satin_al boolean default false,
                                                 p_bedava boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := p_me;
  v_rakip uuid;
  v_j jsonb;
  v_rj jsonb;
  v_toplam int; v_tur int; v_soru int;
  v_tur_sinir int;
  v_serbest boolean;
  v_fiyat bigint;
  v_adet int;
  v_satin boolean := false;
  v_bedava boolean := coalesce(p_bedava, false);
  v_dogru smallint;
  v_kapali int[];
  v_sn numeric;
  v_bitis timestamptz;
  v_yeni timestamptz;
  v_sonuc jsonb;
  v_idx int;   -- 987: joker_kullanimlari.soru_index (Savunma Sorusu = -tur: ayrı soru, soru başı sınırı ayrıca)
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur is null or p_tur not in ('elli', 'sure', 'zaman_baskisi', 'ikinci_sans') then
    raise exception 'Bu joker Kasa modunda kullanılamaz';
  end if;
  -- FOR UPDATE: cevap ve joker aynı sırayla kilitlenir (insan yolunda kasa_joker zaten kasa_kilitle ile kilitledi)
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if not k.jokerli then raise exception 'Bu maçta joker yok'; end if;
  if k.altin then raise exception 'Altın Soru''da joker kullanılamaz'; end if;
  if k.faz <> 'cevap' then raise exception 'Joker yalnız soru açıkken kullanılır'; end if;
  if k.kopuk_at is not null then raise exception 'Maç durdu, biraz bekle'; end if;
  if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
    if v_me::text is distinct from k.savunma ->> 'sahip' then raise exception 'Savunma Sorusunu yalnız hak sahibi cevaplar'; end if;
    if p_tur = 'zaman_baskisi' then raise exception 'Savunma Sorusunda Zaman Baskısı kullanılamaz'; end if;
  end if;
  v_idx := case when (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then -k.tur else k.tur end;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > public.kasa_oyuncu_bitis(k, v_me) then raise exception 'Süre doldu'; end if;
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);
  -- 953: aynı soruda aynı joker türü iki kez (ücretsiz + ücretli dahil) kullanılamaz
  if coalesce(v_j -> 'turler', '[]'::jsonb) ? p_tur then
    raise exception 'Bu joker bu soruda zaten kullanıldı';
  end if;

  if v_bedava then
    -- DEVAM ödülü: yalnız kazanılan tür, yalnız bu soruda; envanter/coin/joker_kullanimlari YOK (sınırlara sayılmaz)
    if (v_j ->> 'bedava') is distinct from p_tur then raise exception 'Ücretsiz jokerin yok'; end if;
    v_j := v_j - 'bedava';
  else
    -- 985: Ortak Hazine'ye özel maç içi sınırlar (herkese eşit — bot dahil) — klasik_skill_* artık okunmuyor
    select count(*), count(*) filter (where j.tur = p_tur), count(*) filter (where j.soru_index = v_idx)
      into v_toplam, v_tur, v_soru
      from public.joker_kullanimlari j
     where j.user_id = v_me and j.mac_tur = 'kasa' and j.mac_id = p_id;
    if v_toplam >= public.ayar_sayi('kasa_joker_toplam_hak', 4)::int then
      raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('kasa_joker_toplam_hak', 4)::int;
    end if;
    v_tur_sinir := public.ayar_sayi('kasa_joker_hak_' || p_tur,
      case p_tur when 'ikinci_sans' then 1 when 'zaman_baskisi' then 3 else 2 end)::int;
    if v_tur >= v_tur_sinir then
      raise exception 'Bu skill için maç hakkın doldu';
    end if;
    if v_soru >= public.ayar_sayi('kasa_joker_soru_basi_hak', 1)::int then
      raise exception 'Bu soruda skill hakkını kullandın';
    end if;
    if p_tur = 'zaman_baskisi' and k.cevaplar ? v_rakip::text then
      raise exception 'Rakibin bu soruyu zaten cevapladı';
    end if;

    -- Envanter (Klasik ile aynı yardımcılar). 1125: botun envanteri/coin'i yok → ücretsiz (Klasik bot jokeri gibi).
    v_serbest := public.jokerler_serbest() or v_me = k.bot;
    if coalesce(p_satin_al, false) and v_me is distinct from k.bot then
      v_fiyat := public.joker_fiyati(p_tur);
      if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu joker satın alınamaz'; end if;
      perform 1 from public.profiles where id = v_me for update;
      select coalesce(e.adet, 0) into v_adet from public.joker_envanter e where e.user_id = v_me and e.tur = p_tur;
      if not v_serbest and coalesce(v_adet, 0) <= 0 then
        perform public.coin_harca(v_fiyat, 'joker', 'joker_mac_ici:' || p_id::text);
        perform public.joker_hareket(v_me, p_tur, 1, 'mac_ici', 'kasa:' || p_id::text);
        v_satin := true;
      end if;
    end if;
    if not v_serbest then
      perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'kasa:' || p_id::text);
    end if;
    insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
    values (v_me, 'kasa', p_id, v_idx, p_tur, v_serbest);
  end if;

  -- Etki
  v_j := v_j || jsonb_build_object('turler', coalesce(v_j -> 'turler', '[]'::jsonb) || to_jsonb(p_tur));
  if p_tur = 'elli' then
    select q.dogru_cevap into v_dogru from public.questions q where q.id = k.soru_id;
    select array_agg(x order by x) into v_kapali from (
      select x from generate_series(0, 3) x where x <> v_dogru order by random() limit 2
    ) s;
    v_j := v_j || jsonb_build_object('kapali', to_jsonb(v_kapali));
    v_sonuc := jsonb_build_object('tur', 'elli', 'kapali', to_jsonb(v_kapali));
  elsif p_tur = 'sure' then
    v_sn := greatest(1, public.ayar_sayi('skill_ek_sure_sn', 10));
    v_j := v_j || jsonb_build_object('fark', coalesce((v_j ->> 'fark')::numeric, 0) + v_sn);
    v_sonuc := jsonb_build_object('tur', 'sure', 'uzatildi', true, 'eklenen_sn', v_sn);
  elsif p_tur = 'ikinci_sans' then
    v_j := v_j || jsonb_build_object('ikinci', true);
    v_sonuc := jsonb_build_object('tur', 'ikinci_sans');
  else
    -- Zaman Baskısı: rakibin kişisel bitişi kısalır, en az klasik_zaman_baskisi_taban_sn kalır (Klasik kuralı)
    v_rj := coalesce(k.joker -> v_rakip::text, '{}'::jsonb);
    v_bitis := public.kasa_oyuncu_bitis(k, v_rakip);
    v_yeni := least(v_bitis, greatest(
      v_bitis - make_interval(secs => public.ayar_sayi('klasik_zaman_baskisi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('klasik_zaman_baskisi_taban_sn', 3))));
    v_rj := v_rj || jsonb_build_object('fark', round(extract(epoch from (v_yeni - k.faz_bitis))::numeric, 3),
                                       'kisaltildi', true);
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(v_rakip::text, v_rj),
           -- Bot kısalan sürede cevaplayamıyorsa yanıtsız kalır (insan gibi)
           bot_cevap_at = case when bot = v_rakip and bot_cevap_at > v_yeni then null else bot_cevap_at end,
           bot_cevap = case when bot = v_rakip and bot_cevap_at > v_yeni then null else bot_cevap end
     where id = p_id;
    v_sonuc := jsonb_build_object('tur', 'zaman_baskisi', 'uygulandi', true,
                                  'azaltildi_sn', round(extract(epoch from (v_bitis - v_yeni))::numeric));
  end if;
  update public.kasa_maclari
     set joker = joker || jsonb_build_object(v_me::text, v_j), son_hareket = now()
   where id = p_id;
  perform public.kasa_sinyal_ver(p_id);

  return v_sonuc || jsonb_build_object(
    'satin_alindi', v_satin,
    'odenen', case when v_satin then v_fiyat else 0 end,
    'bedava', v_bedava,
    'coin', (select pr.coin from public.profiles pr where pr.id = v_me));
end $function$;
revoke all on function public.kasa_joker_ic(uuid, uuid, text, boolean, boolean) from public, anon, authenticated;

-- ===================================================================== 2) kasa_joker (istemci RPC; imza + yetkiler aynen)
create or replace function public.kasa_joker(p_id uuid, p_tur text, p_satin_al boolean default false, p_bedava boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.hiz_siniri('kasa_joker', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  perform public.kasa_kilitle(p_id);   -- FOR UPDATE + giriş kaydı + üyelik (987 ile aynı sıra)
  return public.kasa_joker_ic(p_id, auth.uid(), p_tur, p_satin_al, p_bedava);
end $function$;

-- ===================================================================== 3) kasa_bot_joker (iç)
create or replace function public.kasa_bot_joker(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  k public.kasa_maclari%rowtype;
  v_sav boolean;
  v_idx int;
  v_rakip uuid;
  v_bas timestamptz;
  v_an timestamptz;
  v_tur text;
  v_tamam text;
  v_dogru smallint;
  v_kapali int[];
  v_yeni smallint;
begin
  select * into k from public.kasa_maclari where id = p_id;
  -- Ucuz ön eleme (asıl kurallar kasa_joker_ic'te): bot var, soru açık, jokerli, Altın Soru değil, maç akıyor, bot cevaplamadı
  if not found or k.bot is null or k.durum <> 'aktif' or k.faz <> 'cevap' or not k.jokerli or k.altin
     or k.kopuk_at is not null or k.bot_cevap_at is null or k.cevaplar ? k.bot::text then
    return;
  end if;
  -- Bu soruda bot zaten joker kullandı ya da denedi (girdi soru başında sıfırlanır: kasa_soru_ac / kasa_savunma_ac)
  if (k.joker -> k.bot::text) ? 'turler' or (k.joker -> k.bot::text) ? 'bot_denedi' then return; end if;
  v_sav := k.savunma is not null and k.savunma ->> 'durum' = 'soru';
  v_rakip := case when k.oyuncu1 = k.bot then k.oyuncu2 else k.oyuncu1 end;
  if v_sav then
    if k.savunma ->> 'sahip' is distinct from k.bot::text then return; end if;
  elsif k.cevaplar ? v_rakip::text then
    return;   -- rakip cevapladı → bot o anda cevaplar (1088); joker anı geçti
  end if;
  v_idx := case when v_sav then -k.tur else k.tur end;
  -- Olasılık (soru başına sabit tohum → her yoklamada aynı karar)
  if public.bot_rasgele('kasajok:' || p_id::text || ':' || v_idx) * 100
     >= public.ayar_sayi('kasa_bot_joker_yuzde', 15) then
    return;
  end if;
  -- An: oynanabilir başlangıç (gösterim payı sonrası) ile planlı cevap arasının %20–%60'ı
  v_bas := k.soru_baslangic + public.kasa_gosterim_payi();
  v_an := v_bas + (k.bot_cevap_at - v_bas) * (0.2 + 0.4 * public.bot_rasgele('kasajoz:' || p_id::text || ':' || v_idx));
  if now() < v_an then return; end if;

  -- Tek deneme hakkı: önce işaretle (deneme başarısız olsa da bu soruda tekrar denenmez)
  update public.kasa_maclari
     set joker = joker || jsonb_build_object(k.bot::text,
                   coalesce(joker -> k.bot::text, '{}'::jsonb) || jsonb_build_object('bot_denedi', true))
   where id = p_id;

  for v_tur in
    select t from unnest(array['elli', 'sure', 'zaman_baskisi', 'ikinci_sans']) t
     order by public.bot_rasgele('kasajot:' || p_id::text || ':' || v_idx || ':' || t)
  loop
    begin
      perform public.kasa_joker_ic(p_id, k.bot, v_tur, false, false);
      v_tamam := v_tur;
    exception when others then
      v_tamam := null;   -- kural reddetti (hak doldu, rakip cevapladı, Savunma'da Zaman Baskısı...) → sonraki tür
    end;
    exit when v_tamam is not null;
  end loop;
  if v_tamam is null then return; end if;

  -- Etki botun planlı cevabına (insanın ekranda yaşadığının karşılığı)
  select * into k from public.kasa_maclari where id = p_id;
  select q.dogru_cevap into v_dogru from public.questions q where q.id = k.soru_id;
  if k.bot_cevap is null or k.bot_cevap = v_dogru then return; end if;
  if v_tamam = 'elli' then
    -- 954 bot kalıbı: bilmiyorsa kalan iki şık arasında yarı yarıya
    select array_agg((x #>> '{}')::int) into v_kapali from jsonb_array_elements(k.joker -> k.bot::text -> 'kapali') x;
    if random() < 0.5 then
      v_yeni := v_dogru;
    else
      select x into v_yeni from generate_series(0, 3) x where x <> v_dogru and not (x = any(coalesce(v_kapali, '{}'))) limit 1;
    end if;
  elsif v_tamam = 'ikinci_sans' then
    -- İlk tahmin yanlış (elenir) → kalan üç şıktan biri
    select x into v_yeni from generate_series(0, 3) x where x <> k.bot_cevap order by random() limit 1;
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(k.bot::text, (joker -> k.bot::text) || jsonb_build_object('ilk', k.bot_cevap))
     where id = p_id;
  end if;
  if v_yeni is not null then
    update public.kasa_maclari set bot_cevap = v_yeni where id = p_id;
  end if;
end $$;
revoke all on function public.kasa_bot_joker(uuid) from public, anon, authenticated;

-- ===================================================================== 4) kasa_ilerlet (1105 tanımı + bot joker adımı)
create or replace function public.kasa_ilerlet(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  k public.kasa_maclari%rowtype;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;
  if k.faz = 'baslangic' and k.faz_bitis is null then
    -- Giriş beklemesi: iki giriş (bot hazır) ya da kasa_baglanma_sn → başlangıç fazı o an + pay + giriş sahnesi − ilk sorunun
    -- gösterim payı (1105; sahne 3-2-1'i içerir, en az mac_geri_sayim_sn).
    if ((k.ekran1 is not null or k.oyuncu1 = k.bot) and (k.ekran2 is not null or k.oyuncu2 = k.bot))
       or now() >= k.created_at + make_interval(secs => public.ayar_ondalik('kasa_baglanma_sn', 10)::double precision) then
      update public.kasa_maclari
         set faz_bitis = now() + make_interval(secs => greatest(
                                  public.ayar_sayi('mac_geri_sayim_sn', 3)::numeric,
                                  (greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000))
                                   + greatest(0, public.ayar_sayi('kasa_giris_sahne_ms', 3000))
                                   - greatest(0, public.ayar_sayi('kasa_gosterim_payi_ms', 1500))) / 1000.0)),
             son_hareket = now()
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
    end if;
    return;   -- beklemede kopukluk kapısı / faz döngüsü çalışmaz
  end if;
  -- 1125: bot, cevabından önce joker kullanabilir (insanla aynı kurallar; hata ilerletmeyi durdurmaz)
  if k.bot is not null and k.faz = 'cevap' then
    begin
      perform public.kasa_bot_joker(p_id);
    exception when others then
      raise warning 'kasa_bot_joker %: %', p_id, sqlerrm;
    end;
  end if;
  perform public.kasa_ilerlet_ic(p_id);
end $$;
revoke all on function public.kasa_ilerlet(uuid) from public, anon, authenticated;
