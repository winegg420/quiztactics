-- 954 geri alma: KASA "DEVAM bırakır + garanti ücretsiz 50:50" kaldırılır; 4 fonksiyon canlı 954 ÖNCESİ (953)
-- tanımlarına döner (pg_get_functiondef, 2026-10-05), kasa_devam_hak_ver silinir, kolonlar devam_birakir / devam_elli ve
-- ayar kasa_devam_birakir silinir. 953 ayar satırları (kasa_devam_joker_*) kalır; açıklamaları kozmetik.
-- DİKKAT: geri almadan sonra yeni maçlar yine 953 kuralıyla (şanslı DEVAM ödülü) açılır — kasa_olustur 953 tanımı
-- kasa_devam_joker_sans/_garanti'yi okur. Süren 954 maçlarında sahiplik bırakma ve ücretsiz 50:50 durur
-- (joker '_hak' anahtarı zararsız kalır, okunmaz).
-- Uygulama: canlı veritabanında tek işlemde çalıştır.
begin;
drop function if exists public.kasa_devam_hak_ver(uuid);

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
    devam_sans, devam_garanti,
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
    -- 953: DEVAM ödülü (kapalıysa 0)
    case when public.ayar_sayi('kasa_devam_joker_acik', 0) >= 1
         then least(100, greatest(0, public.ayar_sayi('kasa_devam_joker_sans', 50)::int)) else 0 end,
    greatest(0, public.ayar_sayi('kasa_devam_joker_garanti', 2)::int),
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
         -- 953: soru başına girdiler (ve kullanılmamış ücretsiz joker) silinir; DEVAM kaçırma sayacı kalır
         joker = case when joker ? '_devam' then jsonb_build_object('_devam', joker -> '_devam') else '{}'::jsonb end,
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when k.bot is not null
                             then now() + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler set soru_id = v_soru, kategori = v_kat where kasa_id = p_id and tur = k.tur;
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
  v_odul boolean := false;
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
    -- 953: yalnız bilerek seçilen DEVAM (süre dolumu değil), karar fazı gerçekten açıkken (kasa ≥ alt sınır)
    v_odul := not coalesce(p_ac, false) and not coalesce(p_sure_doldu, false)
              and coalesce(k.devam_sans, 0) > 0 and k.kasa > 0 and k.kasa >= k.acma_min;
  end if;
  perform public.kasa_soru_ac(p_id);
  if v_odul then perform public.kasa_devam_odulu(p_id, k.sahip); end if;
end $function$;

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
    'devam_sans', case when k.jokerli then k.devam_sans else 0 end,
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
    -- 953: DEVAM ödülü — YALNIZ kendi kaydın (rakibin kazanıp kazanmadığı ve kaçırma sayacı dönmez)
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
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)),
       'faz_kalan_sn', round(extract(epoch from coalesce(k.kopuk_kalan, interval '0'))::numeric, 2)) end,
    'kazanan', k.kazanan, 'sonuc_neden', k.sonuc_neden,
    'terk', case when k.durum <> 'aktif' then jsonb_build_object(
       'ben', k.terk_eden = v_me, 'rakip', k.terk_eden is not null and k.terk_eden <> v_me) end,
    'baglanmayan', k.baglanmayan,
    'gecmis', v_gecmis
  );
end $function$;

alter table public.kasa_maclari drop column if exists devam_birakir;
alter table public.kasa_maclari drop column if exists devam_elli;
delete from public.oyun_ayarlari where anahtar = 'kasa_devam_birakir';
commit;
