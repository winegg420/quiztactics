-- 953 geri alma: KASA "DEVAM ödülü" kaldırılır; 6 fonksiyon canlı 953 ÖNCESİ tanımlarına döner (pg_get_functiondef,
-- 4 Eki 2026), kasa_devam_odulu silinir, kasa_joker 3 parametreli imzaya döner, ayarlar ve kolonlar silinir.
-- Uygulama: canlı veritabanında tek işlemde çalıştır. Süren maçlarda kullanılmamış ücretsiz joker kaybolur;
-- kural/puan etkilenmez (kasa_soru_ac yine her soruda joker girdilerini sıfırlar).
begin;
drop function if exists public.kasa_joker(uuid, text, boolean, boolean);
drop function if exists public.kasa_devam_odulu(uuid, uuid);

CREATE OR REPLACE FUNCTION public.kasa_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
begin
  perform public.hiz_siniri('kasa_durum', 400, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
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

  -- Sonuç bandı: soru çözümlendikten SONRA (doğru cevap ancak burada)
  if k.faz = 'sonuc' and k.son_tur is not null then
    v_sonuc := k.son_tur || jsonb_build_object(
      'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
      'ben_dogru', coalesce((k.son_tur -> 'dogru' ->> v_me::text)::boolean, false),
      'rakip_dogru', coalesce((k.son_tur -> 'dogru' ->> v_rakip::text)::boolean, false));
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

  return jsonb_build_object(
    'id', k.id, 'durum', k.durum, 'dereceli', k.dereceli,
    'faz', k.faz, 'faz_bitis', k.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'tur', k.tur, 'max_tur', k.max_tur, 'hedef', k.hedef, 'altin', k.altin,
    'artis', k.artis, 'ikisi_artis', k.ikisi_artis, 'acma_min', k.acma_min, 'jokerli', k.jokerli,
    'kasa', k.kasa, 'sahip', k.sahip,
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
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)),
       'faz_kalan_sn', round(extract(epoch from coalesce(k.kopuk_kalan, interval '0'))::numeric, 2)) end,
    'kazanan', k.kazanan, 'sonuc_neden', k.sonuc_neden,
    'terk', case when k.durum <> 'aktif' then jsonb_build_object(
       'ben', k.terk_eden = v_me, 'rakip', k.terk_eden is not null and k.terk_eden <> v_me) end,
    'baglanmayan', k.baglanmayan,
    'gecmis', v_gecmis
  );
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
      'sinir', public.ayar_sayi('klasik_skill_toplam_hak', 6)::int,
      'kullanilan', (select count(*)::int from benim),
      'ucretsiz_elli_kaldi', false,
      'kilitli', not k.jokerli or k.altin,
      'kisaltildi', k.faz = 'cevap' and coalesce((k.joker -> v_me::text ->> 'kisaltildi')::boolean, false),
      'sis_bitis', null,
      'sunucu_zamani', now(),
      'kullanilan_turler', coalesce((select jsonb_agg(distinct b.tur) from benim b), '[]'::jsonb),
      'kullanim_sayilari', coalesce((select jsonb_object_agg(s.tur, s.adet)
                                       from (select b.tur, count(*)::int adet from benim b group by b.tur) s), '{}'::jsonb),
      'tur_basi_sinir', public.ayar_sayi('klasik_skill_tur_basi_hak', 2)::int,
      'soru_basi_sinir', public.ayar_sayi('klasik_skill_soru_basi_hak', 1)::int,
      'soruda_kullanildi', exists (select 1 from benim b where b.soru_index = k.tur))
  );
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_joker(p_id uuid, p_tur text, p_satin_al boolean DEFAULT false)
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
  v_serbest boolean;
  v_fiyat bigint;
  v_adet int;
  v_satin boolean := false;
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

  -- Klasik maç içi sınırları (herkese eşit)
  select count(*), count(*) filter (where j.tur = p_tur), count(*) filter (where j.soru_index = k.tur)
    into v_toplam, v_tur, v_soru
    from public.joker_kullanimlari j
   where j.user_id = v_me and j.mac_tur = 'kasa' and j.mac_id = p_id;
  if v_toplam >= public.ayar_sayi('klasik_skill_toplam_hak', 6)::int then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('klasik_skill_toplam_hak', 6)::int;
  end if;
  if v_tur >= public.ayar_sayi('klasik_skill_tur_basi_hak', 2)::int then
    raise exception 'Bu skill için maç hakkın doldu';
  end if;
  if v_soru >= public.ayar_sayi('klasik_skill_soru_basi_hak', 1)::int then
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

  -- Etki
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);
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
    'coin', (select pr.coin from public.profiles pr where pr.id = v_me));
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_karar_uygula(p_id uuid, p_ac boolean, p_sure_doldu boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_p1 int; v_p2 int;
  v_ms int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'karar' or k.sahip is null then return; end if;
  v_ms := greatest(0, round(extract(epoch from (now() - coalesce(k.karar_baslangic, now()) - public.kasa_gosterim_payi())) * 1000))::int;

  if coalesce(p_ac, false) and k.kasa >= k.acma_min then
    v_p1 := k.puan1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end;
    v_p2 := k.puan2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end;
    update public.kasa_maclari
       set puan1 = v_p1, puan2 = v_p2,
           acma_sayisi1 = acma_sayisi1 + (k.sahip = k.oyuncu1)::int,
           acma_sayisi2 = acma_sayisi2 + (k.sahip = k.oyuncu2)::int,
           acma_toplam1 = acma_toplam1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end,
           acma_toplam2 = acma_toplam2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end,
           kasa = 0, sahip = null,
           son_karar = jsonb_build_object('veren', k.sahip, 'ac', true, 'deger', k.kasa),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = 'ac', karar_veren = k.sahip, karar_ms = v_ms, acilan_deger = k.kasa,
           puan1_sonra = v_p1, puan2_sonra = v_p2
     where kasa_id = p_id and tur = k.tur;
    -- AÇ sonrası hedef kontrolü
    if (case when k.sahip = k.oyuncu1 then v_p1 else v_p2 end) >= k.hedef then
      perform public.kasa_bitir(p_id, k.sahip, 'hedef');
      return;
    end if;
  else
    update public.kasa_maclari
       set son_karar = jsonb_build_object('veren', k.sahip, 'ac', false, 'deger', k.kasa,
                                          'sure_doldu', coalesce(p_sure_doldu, false)),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = case when p_sure_doldu then 'sure_doldu' else 'devam' end,
           karar_veren = k.sahip, karar_ms = v_ms
     where kasa_id = p_id and tur = k.tur;
  end if;
  perform public.kasa_soru_ac(p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_davetli boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_x uuid;
  v_bot uuid;
  v_max int := greatest(1, public.ayar_sayi('kasa_max_tur', 36)::int);
begin
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if random() < 0.5 then v_x := p_a; p_a := p_b; p_b := v_x; end if;
  select p.id into v_bot from public.profiles p where p.id in (p_a, p_b) and coalesce(p.is_bot, false) limit 1;

  insert into public.kasa_maclari (
    oyuncu1, oyuncu2, dereceli, davetli, faz, faz_bitis,
    hedef, max_tur, artis, ikisi_artis, soru_sn, karar_sn, sonuc_sn, acma_min, jokerli,
    soru_ids, bot, bot_tarz)
  values (
    p_a, p_b, coalesce(p_dereceli, true), coalesce(p_davetli, false), 'baslangic',
    -- Klasik 3-2-1 (651): ilk soru now + geri sayım + gösterim payı; 952: + giriş sahnesi
    now() + make_interval(secs => public.ayar_sayi('mac_geri_sayim_sn', 3)
                                  + greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0
                                  + greatest(0, public.ayar_sayi('kasa_giris_sahne_ms', 3000)) / 1000.0),
    greatest(1, public.ayar_sayi('kasa_hedef_puan', 50)::int), v_max,
    greatest(0, public.ayar_sayi('kasa_artis', 2)::int),
    greatest(0, public.ayar_sayi('kasa_ikisi_dogru_artis', 6)::int),
    greatest(5, public.ayar_sayi('kasa_soru_sn', 15)::int),
    greatest(3, public.ayar_sayi('kasa_karar_sn', 8)::int),
    greatest(1, public.ayar_sayi('kasa_sonuc_sn', 3)::int),
    greatest(0, public.ayar_sayi('kasa_acma_min', 10)::int),
    true,
    coalesce(public.soru_sec(null::text, v_max + 2, array[p_a, p_b]), '{}'::uuid[]),
    v_bot, case when v_bot is not null then public.kasa_bot_tarz(v_bot) end)
  returning id into v_id;

  insert into public.kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.kasa_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

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
begin
  select * into k from public.kasa_maclari where id = p_id;
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
         soru_baslangic = now(),
         faz_bitis = now() + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         joker = '{}'::jsonb,
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when k.bot is not null
                             then now() + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler set soru_id = v_soru, kategori = v_kat where kasa_id = p_id and tur = k.tur;
end $function$;

revoke all on function public.kasa_joker(uuid, text, boolean) from public, anon;
grant execute on function public.kasa_joker(uuid, text, boolean) to authenticated;
alter table public.kasa_maclari drop column if exists devam_sans;
alter table public.kasa_maclari drop column if exists devam_garanti;
delete from public.oyun_ayarlari where anahtar in ('kasa_devam_joker_acik', 'kasa_devam_joker_sans', 'kasa_devam_joker_garanti');
commit;
