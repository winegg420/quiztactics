-- ============================================================
-- 760 — Düello: kopukluk dondurması istemciye bildirilir (1 Eki 2026)
--
-- Ölçüm (30 Eyl 19:17–19:21 UTC, Ida + arkadaşının ilk iki kişilik Hâkimiyet maçı 8a01332b):
--   · arkadaşın cihazı 19:20:08'den sonra hiç istek atmadı (profiles.last_seen ve rpc_sayac orada kaldı);
--   · 25 sn sonra (duello_kopuk_sn) 19:20:34'te duello2_ilerlet onu kopuk saydı (kopuk_at), kalan = taban 3 sn;
--   · kopukken her ilerletme (cron 2 sn + istemci okumaları) faz_bitis'i "şimdi + 3 sn"ye itti → Ida'nın ekranında
--     geri sayım ~2 sn'de bir yeniden 3'ten başladı; 45 sn (duello_kopuk_bekleme_sn) sonra 19:21:21'de maç
--     terkle bitti (≈ 22 döngü = Ida'nın "20–30 kez").
-- Düzeltme (yıkıcı değil): duello_durum, surum 2 maçında duello2_durum'un cevabına 'kopuk' ekler
--   { ben_mi, bitis (bekleme sonu), faz_kalan_sn (dönüşte fazın süreceği donuk kalan) }.
-- Kopukluk kuralları (eşik 25 sn, bekleme 45 sn, taban 3 sn), 60 sn ödülsüz iptal güvenlik ağı ve yetkiler
-- (create or replace ACL'yi korur) DEĞİŞMEZ. Eski (surum 1) dal aynen durur. Tekrar çalıştırılabilir.
-- ============================================================

CREATE OR REPLACE FUNCTION public.duello_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_savunan uuid;
  v_dil text := public.oyuncu_dili();
  v_soru_goster boolean;
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_envanter jsonb;
  v_kullanim jsonb;
  v_sonuc jsonb;     -- 760
  v_kopuk uuid;      -- 760
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then
    v_sonuc := public.duello2_durum(p_id);   -- kilit + tembel ilerletme bunun içinde (duello_kilitle)
    -- 760: kopukluk dondurması istemciye açıkça bildirilir. Kopukken duello2_ilerlet her çağrıda faz bitişini
    -- "şimdi + kalan (en az duello_kopuk_taban_sn)" diye ileri iter; istemci bu bitişi sayaç diye çizince geri
    -- sayım ~2 sn'de bir yeniden "3"ten başlıyordu (30 Eyl gece, 45 sn'de ~22 kez). Artık istemci 'kopuk'
    -- görünce sayacı donuk kalanla gösterir, bekleme süresini (bitis) bantta sayar.
    select * into d from public.duellolar where id = p_id;
    if d.durum = 'aktif' and d.kopuk_at is not null then
      v_kopuk := public.duello_kopuk_kim(p_id);
      v_sonuc := v_sonuc || jsonb_build_object('kopuk', jsonb_build_object(
        'ben_mi', v_kopuk is not null and v_kopuk = v_me,
        'bitis', d.kopuk_at + make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)),
        'faz_kalan_sn', round(extract(epoch from coalesce(
            case when d.faz = 'cevap' then case when v_me = d.oyuncu1 then d.kopuk_kalan1 else d.kopuk_kalan2 end end,
            d.kopuk_kalan))::numeric, 2)));
    end if;
    return v_sonuc;
  end if;
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_rakip := case when d.oyuncu1 = v_me then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;

  v_soru_goster := d.soru_id is not null and (
       (d.faz = 'hazirlik' and d.saldiran = v_me)
    or d.faz in ('cevap','sonuc','altin')
    or d.durum <> 'aktif');
  if v_soru_goster then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object(
             'ben', count(*) filter (where x.kazanan = v_me),
             'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.duellolar x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  if d.durum = 'bitti' then
    v_odul := jsonb_build_object(
      'lig_puan', case when d.dereceli and d.kazanan = v_me
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int else 0 end,
      'coin', coalesce((select sum(h.miktar) from public.coin_hareketleri h
                         where h.user_id = v_me and h.tur = 'mac' and h.referans = 'duello:' || p_id::text), 0));
  end if;

  select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) into v_envanter
    from public.joker_envanter e where e.user_id = v_me;
  select jsonb_build_object(
           'saldiri', count(*) filter (where k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'saldiri_ucretsiz', count(*) filter (where k.ucretsiz and k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'savunma', count(*) filter (where k.tur in ('elli','sure','soru_degistir')),
           'elli_ucretsiz', bool_or(k.tur = 'elli' and k.ucretsiz),
           'soru_degistir', bool_or(k.tur = 'soru_degistir'),
           -- Paket 27 B: aynı tür maçta bir kez — istemci hangi türün
           -- tükendiğini bilsin ki düğmeyi boşuna açmasın.
           'turler', coalesce(jsonb_agg(distinct k.tur) filter (where k.tur is not null), '[]'::jsonb))
    into v_kullanim
    from public.joker_kullanimlari k where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id;

  return jsonb_build_object(
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', now(),
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1, 'zayif', d.zayif1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2, 'zayif', d.zayif2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
    'kullanim', jsonb_build_object(d.oyuncu1::text, public.duello_kategori_kullanimi(p_id, d.oyuncu1),
                                   d.oyuncu2::text, public.duello_kategori_kullanimi(p_id, d.oyuncu2)),
    'kategori', d.kategori,
    'soru', v_soru,
    'elli_kapali', case when v_me = v_savunan and d.faz = 'cevap' then to_jsonb(d.elli_kapali) end,
    'zaman_baskisi', d.zaman_baskisi, 'savunma_kilidi', d.savunma_kilidi, 'ek_sure', d.ek_sure,
    'soru_degisti_saldiri', d.soru_degisti_saldiri,
    'son_hamle', case when d.faz in ('sonuc','kategori','altin') or d.durum <> 'aktif' then d.son_hamle end,
    'altin', case when d.faz = 'altin' then jsonb_build_object(
                    'ben_cevapladim', d.altin_cevaplar ? v_me::text,
                    'benim_cevabim', d.altin_cevaplar -> v_me::text -> 'cevap',
                    'rakip_cevapladi', d.altin_cevaplar ? v_rakip::text) end,
    'jokerler', jsonb_build_object(
       'envanter', v_envanter, 'kullanim', v_kullanim,
       -- Paket 27 B: tek toplam hak. Eski alanlar (saldiri_siniri/savunma_siniri/
       -- ucretsiz_saldiri) eski istemci sürümü kırılmasın diye aynı yapıda
       -- doldurulmaya devam ediyor; yeni istemci 'hak' ve 'kullanilan'a bakar.
       'hak', public.ayar_sayi('duello_joker_hak', 4),
       'kullanilan', (select count(*) from public.joker_kullanimlari k2
                       where k2.user_id = v_me and k2.mac_tur = 'duello' and k2.mac_id = p_id),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me),
       'saldiri_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'savunma_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'ucretsiz_saldiri', public.ayar_sayi('duello_ucretsiz_saldiri_joker', 0)),
    'sureler', jsonb_build_object('cevap', public.ayar_sayi('duello_cevap_sn', 15),
       'zaman_baskisi', public.ayar_sayi('duello_zaman_baskisi_sn', 10),
       'hazirlik', public.ayar_sayi('duello_hazirlik_sn', 4),
       'kategori', public.ayar_sayi('duello_kategori_sn', 20),
       'altin', public.ayar_sayi('duello_altin_sn', 15),
       -- Paket 28 A: düello ekranının kendi nabız aralığı. Sunucu hesaplıyor ki
       -- istemci kopukluk eşiğinden yavaş atıp kendini "kopuk" göstermesin.
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25)),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  );
end $function$;
