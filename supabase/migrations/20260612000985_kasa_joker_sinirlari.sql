-- 985: ORTAK HAZİNE (kod adı kasa) — joker sınırları yalnız Hazine'ye özel (Ida, 7 Eki 2026).
--
-- ÖNCE: kasa_joker / kasa_joker_durumu Klasik sınırlarını okuyordu (klasik_skill_toplam_hak 6 /
--    klasik_skill_tur_basi_hak 2 / klasik_skill_soru_basi_hak 1).
-- SONRA (yeni oyun_ayarlari anahtarları, yalnız Hazine):
--    kasa_joker_hak_ikinci_sans 1 · kasa_joker_hak_elli 2 · kasa_joker_hak_sure 2 · kasa_joker_hak_zaman_baskisi 3
--    kasa_joker_toplam_hak 4 · kasa_joker_soru_basi_hak 1
-- klasik_skill_* anahtarları ve Klasik / Düello / Saf Bilgi fonksiyonları DEĞİŞMEZ.
-- Fonksiyonlar canlı tanımdan (pg_get_functiondef, 7 Eki 2026 — son yazan 954) türetildi; yalnız sınır okuma
--    satırları değişti. Korunan mantık: Altın Soru'da joker yok, DEVAM ücretsiz 50:50 (p_bedava) sınırlara SAYILMAZ
--    (joker_kullanimlari'na yazılmaz), rakip cevapladıysa Zaman Baskısı reddi, aynı soruda aynı tür iki kez yok.
-- kasa_joker_durumu yeni alanlar: tur_sinirlari {tur: sınır}, kalan_haklar {tur: kalan}. sinir = toplam (4).
-- Sınırlar maça SABİTLENMEZ (Klasik gibi canlı okunur) — imza aynı, CREATE OR REPLACE: yetkiler (GRANT) değişmez.
-- GERİ ALMA: docs/kasa-geri-alma-985.sql

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_joker_hak_ikinci_sans', '1'::jsonb, 'ORTAK HAZİNE (985): İkinci Şans maç başına en fazla.'),
  ('kasa_joker_hak_elli', '2'::jsonb, 'ORTAK HAZİNE (985): 50:50 maç başına en fazla (DEVAM ücretsiz 50:50 sayılmaz).'),
  ('kasa_joker_hak_sure', '2'::jsonb, 'ORTAK HAZİNE (985): Ek Süre maç başına en fazla.'),
  ('kasa_joker_hak_zaman_baskisi', '3'::jsonb, 'ORTAK HAZİNE (985): Zaman Baskısı maç başına en fazla.'),
  ('kasa_joker_toplam_hak', '4'::jsonb, 'ORTAK HAZİNE (985): maç başına toplam joker (DEVAM ücretsiz 50:50 sayılmaz).'),
  ('kasa_joker_soru_basi_hak', '1'::jsonb, 'ORTAK HAZİNE (985): soru başına joker (DEVAM ücretsiz 50:50 sayılmaz).')
on conflict (anahtar) do nothing;

CREATE OR REPLACE FUNCTION public.kasa_joker(p_id uuid, p_tur text, p_satin_al boolean DEFAULT false, p_bedava boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
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
begin
  perform public.hiz_siniri('kasa_joker', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur is null or p_tur not in ('elli', 'sure', 'zaman_baskisi', 'ikinci_sans') then
    raise exception 'Bu joker Kasa modunda kullanılamaz';
  end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: cevap ve joker aynı sırayla kilitlenir
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if not k.jokerli then raise exception 'Bu maçta joker yok'; end if;
  if k.altin then raise exception 'Altın Soru''da joker kullanılamaz'; end if;
  if k.faz <> 'cevap' then raise exception 'Joker yalnız soru açıkken kullanılır'; end if;
  if k.kopuk_at is not null then raise exception 'Maç durdu, biraz bekle'; end if;
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
    -- 985: Ortak Hazine'ye özel maç içi sınırlar (herkese eşit) — klasik_skill_* artık okunmuyor
    select count(*), count(*) filter (where j.tur = p_tur), count(*) filter (where j.soru_index = k.tur)
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

    -- Envanter (Klasik ile aynı yardımcılar)
    v_serbest := public.jokerler_serbest();
    if coalesce(p_satin_al, false) then
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
    values (v_me, 'kasa', p_id, k.tur, p_tur, v_serbest);
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

CREATE OR REPLACE FUNCTION public.kasa_joker_durumu(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  -- 985: Ortak Hazine'ye özel sınırlar (klasik_skill_* okunmuyor)
  v_sinirlar jsonb := jsonb_build_object(
    'elli', public.ayar_sayi('kasa_joker_hak_elli', 2)::int,
    'sure', public.ayar_sayi('kasa_joker_hak_sure', 2)::int,
    'zaman_baskisi', public.ayar_sayi('kasa_joker_hak_zaman_baskisi', 3)::int,
    'ikinci_sans', public.ayar_sayi('kasa_joker_hak_ikinci_sans', 1)::int);
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into k from public.kasa_maclari where id = p_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  return (
    with benim as (
      select j.tur, j.soru_index from public.joker_kullanimlari j
       where j.user_id = v_me and j.mac_tur = 'kasa' and j.mac_id = p_id
    )
    select jsonb_build_object(
      'sinir', public.ayar_sayi('kasa_joker_toplam_hak', 4)::int,
      'kullanilan', (select count(*)::int from benim),
      'ucretsiz_elli_kaldi', false,
      'kilitli', not k.jokerli or k.altin,
      'kisaltildi', k.faz = 'cevap' and coalesce((k.joker -> v_me::text ->> 'kisaltildi')::boolean, false),
      'sis_bitis', null,
      'sunucu_zamani', now(),
      'kullanilan_turler', coalesce((select jsonb_agg(distinct b.tur) from benim b), '[]'::jsonb),
      'kullanim_sayilari', coalesce((select jsonb_object_agg(s.tur, s.adet)
                                       from (select b.tur, count(*)::int adet from benim b group by b.tur) s), '{}'::jsonb),
      -- tur_basi_sinir: eski istemci için en büyük tür sınırı; asıl kaynak tur_sinirlari / kalan_haklar
      'tur_basi_sinir', (select max(v.value::int) from jsonb_each_text(v_sinirlar) v),
      'tur_sinirlari', v_sinirlar,
      'kalan_haklar', (select jsonb_object_agg(v.key, greatest(0, v.value::int
                          - (select count(*)::int from benim b where b.tur = v.key)))
                         from jsonb_each_text(v_sinirlar) v),
      'soru_basi_sinir', public.ayar_sayi('kasa_joker_soru_basi_hak', 1)::int,
      'soruda_kullanildi', exists (select 1 from benim b where b.soru_index = k.tur),
      -- 953: DEVAM ödülü (yalnız kendi; yalnız soru açıkken)
      'bedava', case when k.jokerli and not k.altin and k.faz = 'cevap' then k.joker -> v_me::text ->> 'bedava' end,
      'soru_turleri', case when k.faz = 'cevap' then coalesce(k.joker -> v_me::text -> 'turler', '[]'::jsonb)
                           else '[]'::jsonb end)
  );
end $function$;
