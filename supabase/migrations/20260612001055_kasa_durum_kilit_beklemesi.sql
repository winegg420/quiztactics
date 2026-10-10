-- ============================================================
-- 1055 — Kasa takılması (10 Eki 2026): kasa_durum her yoklamada maç satırını FOR UPDATE kilitler.
-- DB yavaşlayınca (16:00–16:05 UTC: checkpoint + 21 sn süren cron_hizli_tik + grup maçı kilit yığılması)
-- yoklamalar aynı satırda sıraya girip 8 sn statement_timeout ile 500 döndü. Artık kilit 2 sn'de
-- alınamazsa kilitsiz okuma ile 200 döner (yalnız görünüm; yetki kontrolü aynı). Yetki/ACL değişmez.
-- ============================================================

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
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)),
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
    'ezeli', v_ezeli
  );
end $function$;
