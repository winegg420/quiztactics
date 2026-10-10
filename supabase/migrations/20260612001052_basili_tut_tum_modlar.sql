-- ============================================================
-- 1052 — Basılı tut (3 sn) → doğru şık: bütün modlar (Ida, 10 Eki 2026)
-- Klasik/Turnuva/Grup'taki kapı (get_match_question: case when hileli_mi() then dogru_cevap)
-- aynen Çalışma, Hızlı Mod, Hızlı Maç (dondurulmuş), Kasa ve Düello (v2 + v4) soru RPC'lerine.
-- Normal oyuncu ve anon: dogru_cevap null / alan yok. anon'a EXECUTE verilmez (1047).
-- Gövdeler canlı tanımdan alındı; tek fark eklenen dogru_cevap satırları.
-- ============================================================

-- calisma_soru(uuid)
drop function if exists public.calisma_soru(uuid);
CREATE OR REPLACE FUNCTION public.calisma_soru(p_oturum_id uuid)
 RETURNS TABLE(question_id uuid, soru text, secenekler jsonb, kategori text, soru_index integer, toplam integer, bankadan boolean, onceki_yanlis integer, dogru_serisi integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o public.calisma_oturumlari%rowtype;
  v_qid uuid;
  v_bankadan boolean;
  v_yanlis int := 0;
  v_seri int := 0;
begin
  select * into o from public.calisma_oturumlari where id = p_oturum_id;
  if not found then raise exception 'Oturum bulunamadı'; end if;
  if o.user_id <> auth.uid() then raise exception 'Bu oturum senin değil'; end if;
  if o.durum <> 'aktif' then raise exception 'Oturum bitti'; end if;
  if o.aktif_soru >= coalesce(array_length(o.soru_ids, 1), 0) then
    raise exception 'Tur bitti';
  end if;

  v_qid := o.soru_ids[o.aktif_soru + 1];
  v_bankadan := v_qid = any(o.banka_ids);

  select ys.yanlis_sayisi, ys.dogru_serisi into v_yanlis, v_seri
  from public.yanlis_sorular ys
  where ys.user_id = o.user_id and ys.question_id = v_qid;

  update public.calisma_oturumlari set soru_baslangic = now() where id = p_oturum_id;

  return query
  select v_qid, sd.soru, sd.secenekler, sd.kategori,
         o.aktif_soru,
         coalesce(array_length(o.soru_ids, 1), 0),
         v_bankadan,
         coalesce(v_yanlis, 0),
         coalesce(v_seri, 0),
         now(), now(),
         case when public.hileli_mi() then sd.dogru_cevap else null end
  from public.soru_dilinde(v_qid, public.oyuncu_dili()) sd;
end;
$function$
;
revoke all on function public.calisma_soru(uuid) from public, anon;
grant execute on function public.calisma_soru(uuid) to authenticated, service_role;

-- hizli_mod_soru(uuid)
drop function if exists public.hizli_mod_soru(uuid);
CREATE OR REPLACE FUNCTION public.hizli_mod_soru(p_oturum_id uuid)
 RETURNS TABLE(question_id uuid, soru text, secenekler jsonb, soru_index integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, kalan_toplam_sn integer, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o public.hizli_mod_oturumlar%rowtype;
  v_kalan int;
  v_soru_id uuid;
  v_sure int := public.ayar_sayi('hizli_mod_sure_sn', 90)::int;
  v_tavan int := public.ayar_sayi('hizli_mod_soru_tavani', 9)::int;
begin
  select * into o from public.hizli_mod_oturumlar where id = p_oturum_id;
  if not found then raise exception 'Oturum bulunamadı'; end if;
  if o.user_id <> auth.uid() then raise exception 'Bu oturum senin değil'; end if;
  if o.durum <> 'aktif' then raise exception 'Oturum bitti'; end if;

  v_kalan := greatest(0, v_sure - floor(extract(epoch from (now() - o.baslangic)))::int);
  if v_kalan <= 0 then
    perform public.hizli_mod_bitir(p_oturum_id);
    raise exception 'Süre doldu';
  end if;

  -- 212: tavan dolmuşsa yeni soru verilmez
  if o.aktif_soru >= greatest(v_tavan, 1) then
    perform public.hizli_mod_bitir(p_oturum_id);
    raise exception 'Sorular tamamlandı';
  end if;

  v_soru_id := o.soru_ids[o.aktif_soru + 1];
  perform public.gorulen_kaydet(v_soru_id);

  return query
    select v_soru_id, sd.soru, sd.secenekler, o.aktif_soru, o.soru_baslangic, now(), v_kalan,
           case when public.hileli_mi() then sd.dogru_cevap else null end
    from public.soru_dilinde(v_soru_id, public.oyuncu_dili()) sd;
end;
$function$
;
revoke all on function public.hizli_mod_soru(uuid) from public, anon;
grant execute on function public.hizli_mod_soru(uuid) to authenticated, service_role;

-- get_hizli_soru(uuid)
drop function if exists public.get_hizli_soru(uuid);
CREATE OR REPLACE FUNCTION public.get_hizli_soru(p_hizli_mac_id uuid)
 RETURNS TABLE(question_id uuid, soru text, secenekler jsonb, soru_index integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  hm public.hizli_maclar%rowtype;
  v_soru_id uuid;
  v_bas timestamptz;
begin
  select * into hm from public.hizli_maclar where id = p_hizli_mac_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.hizli_oyuncular
    where hizli_mac_id = p_hizli_mac_id and user_id = auth.uid() and davet_durumu = 'kabul'
  ) then
    raise exception 'Bu maçta değilsin';
  end if;
  if hm.durum <> 'aktif' or hm.aktif_soru < 0 then raise exception 'Maç aktif değil'; end if;

  v_soru_id := public.soru_id_coz('hizli', p_hizli_mac_id, auth.uid(), hm.aktif_soru, hm.soru_ids[hm.aktif_soru + 1]);
  v_bas := public.soru_baslangic_coz('hizli', p_hizli_mac_id, auth.uid(), hm.aktif_soru, hm.soru_baslangic);

  perform public.gorulen_kaydet(v_soru_id);

  return query
    select v_soru_id, sd.soru, sd.secenekler, hm.aktif_soru, v_bas, now(),
           case when public.hileli_mi() then sd.dogru_cevap else null end
    from public.soru_dilinde(v_soru_id, public.oyuncu_dili()) sd;
end;
$function$
;
revoke all on function public.get_hizli_soru(uuid) from public, anon;
grant execute on function public.get_hizli_soru(uuid) to authenticated, service_role;

-- kasa_durum(uuid) (yetkiler create or replace ile aynen kalır)
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
  v_ezeli jsonb;   -- 957
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
end $function$
;

-- duello4_durum(uuid) (yetkiler create or replace ile aynen kalır)
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
    and ((d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic) or d.faz = 'sonuc' or d.durum <> 'aktif');
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
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int else 0 end,
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
      'son', d.v4_son, 'soru_no', d.v4_soru_no, 'kullanilan', to_jsonb(d.v4_kullanilan),
      'kart', v_kart,
      -- Saldırı turunda kategoriler kart fazı bitince iki oyuncuya da açılır.
      'benim_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori1 else d.kategori2 end end,
      'rakip_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori2 else d.kategori1 end end,
      'oto', case when d.faz <> 'kart' then d.v4_kart_oto end,
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
       'gosterim_bas', case
          when d.faz = 'kart' then coalesce(d.v4_duyuru_bitis, d.faz_bitis - make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)))
          when d.faz in ('notr', 'cevap', 'son') then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'terk_eden', d.terk_eden, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))));
end $function$
;

-- duello2_durum(uuid) (yetkiler create or replace ile aynen kalır)
CREATE OR REPLACE FUNCTION public.duello2_durum(p_id uuid)
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
  v_ben1 boolean;
  v_idx int;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_sayim jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
  v_hk jsonb;
  v_rol text;
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.tur * 2 + d.saldiri_sirasi;

  -- Soru iki oyuncuya AYNI ANDA görünür: yalnız cevap/sonuç fazında (saldıran önceden görmez).
  if d.soru_id is not null and (d.faz in ('cevap', 'sonuc') or d.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;
  -- 1052 basılı tut: doğru şık YALNIZ hileli_mi() hesabına ve yalnız kendi cevap hakkı sürerken (normal oyuncuda alan yok).
  if v_soru is not null and d.durum = 'aktif' and d.faz = 'cevap' and not (coalesce(d.cevaplar, '{}'::jsonb) ? v_me::text) and public.hileli_mi() then
    v_soru := v_soru || jsonb_build_object('dogru_cevap', (select q.dogru_cevap from public.questions q where q.id = d.soru_id));
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me),
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

  -- Maç sonu özeti: her soru, doğru cevap ve "şık işaretlenmedi" (yanitsiz) bilgisi.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'uzatma', h.uzatma, 'kategori', h.kategori, 'saldiran', h.saldiran,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', case when h.saldiran = v_me then h.cevap_saldiran else h.cevap end,
             'ben_dogru', case when h.saldiran = v_me then h.dogru_saldiran else h.dogru end,
             'ben_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_saldiran else h.yanitsiz_savunan end,
             'rakip_dogru', case when h.saldiran = v_me then h.dogru else h.dogru_saldiran end,
             'rakip_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_savunan else h.yanitsiz_saldiran end,
             'yildiz', h.yildiz, 'deger', h.deger, 'carpan', h.carpan, 'altin_kazanan', h.altin_kazanan,   -- 666/667
             'benim_puanim', case when h.saldiran = v_me then h.puan_saldiran else h.puan_savunan end,
             'rakip_puani', case when h.saldiran = v_me then h.puan_savunan else h.puan_saldiran end,
             'kalkan', h.kalkan, 'savunan', h.savunan, 'hakimiyet', h.hakimiyet) order by h.id), '[]'::jsonb)   -- 650: kalkan
      into v_gecmis
      from public.duello_hamleler h
      join public.questions q on q.id = h.soru_id
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on true
     where h.duello_id = p_id;
  end if;

  select coalesce(jsonb_object_agg(s.kategori, s.n), '{}'::jsonb) into v_sayim
    from (select h.kategori, count(*) n from public.duello_hamleler h
           where h.duello_id = p_id and not h.uzatma group by h.kategori) s;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0),
                            'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx
     and k.tur not in ('baskin', 'kalkan'));   -- 680: rol jokerleri tur sonuna kadar rakibe gizli
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_idx;

  v_kilit := case
    when d.faz <> 'cevap' or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar <> '{}'::jsonb or v_ilk is not null
      or exists (select 1 from public.skill_ikinci_sans_denemeleri s
                  where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx)
      then 'Cevap verildikten sonra soru değiştirilemez'
    when v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  -- 680 · Hâkimiyet tahtası. kilitler: yalnız süren kilitler, değer = kalan tur (sonuç fazında bu tur sayılmaz).
  -- rol_joker: bu an bana gösterilecek rol jokeri (saldırıyorsam Baskın, kendi kategorime saldırılıyorsa Kalkan).
  if coalesce(d.hakimiyet, false) then
    v_rol := case when d.durum <> 'aktif' or d.faz <> 'cevap' or d.uzatma or d.kategori is null then null
                  when d.saldiran = v_me then 'baskin'
                  when (d.sahiplik ->> d.kategori) = v_me::text then 'kalkan' end;
    v_hk := jsonb_build_object(
      'acik', true,
      'esik', d.hakimiyet_esik,
      'kilit_tur', d.kilit_tur,
      'sahiplik', coalesce(d.sahiplik, '{}'::jsonb),
      'kilitler', (select coalesce(jsonb_object_agg(e.key, x.kalan), '{}'::jsonb)
                     from jsonb_each_text(coalesce(d.kilitler, '{}'::jsonb)) e
                     cross join lateral (select e.value::int - d.tur + case when d.faz = 'sonuc' then 0 else 1 end as kalan) x
                    where x.kalan > 0 and not d.uzatma),
      'yuvalar', jsonb_build_object(d.oyuncu1::text, coalesce(d.yuva1, 0), d.oyuncu2::text, coalesce(d.yuva2, 0)),
      'rol_joker', v_rol,
      'rol_joker_hak', public.ayar_sayi('duello_rol_joker_mac_hak', 1),
      'avantaj_esik', public.ayar_sayi('duello_kat_esik_yuzde', 10));
  else
    v_hk := jsonb_build_object('acik', false);
  end if;

  return jsonb_build_object(
    'surum', 2,
    'hakimiyet', v_hk,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', coalesce(d.max_tur, public.ayar_sayi('duello_max_tur', 10)), 'saldiri_sirasi', d.saldiri_sirasi,   -- 960: satırdan
    'uzatma', d.uzatma,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),   -- 325: yanıtın çıktığı an
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan1, 0), 'yildizlar', d.yildiz1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan2, 0), 'yildizlar', d.yildiz2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'puan_degerleri', coalesce(d.puan_degerleri, public.duello_puan_degerleri()),   -- 666
    -- 667: son 2 tur ×çarpan — maç başında sabitlenen liste/katsayı; tur_carpani = bu an geçerli çarpan.
    'tur_carpani', case when d.uzatma or coalesce(d.hakimiyet, false) then 1 else public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi) end,
    'carpanli_turlar', case when coalesce(d.hakimiyet, false) then '[]'::jsonb else coalesce(d.carpanli_turlar,
       (select deger from public.oyun_ayarlari where anahtar = 'duello_carpanli_turlar'), '[9,10]'::jsonb) end,
    'kategori_sayim', v_sayim,
    'uygun_kategoriler', case when d.faz = 'kategori' then
        (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
          where public.duello2_kategori_uygun_mu(p_id, k)) end,
    'kategori', d.kategori,
    'soru', v_soru,
    -- Rakibin CEVAPLADIĞI görünür, NE cevapladığı görünmez.
    'cevap', case when d.faz = 'cevap' then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'set', to_jsonb(public.skill_setim('duello')),   -- 327: Düello seti
       'izinli', to_jsonb(public.duello2_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan',
       'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda,
       'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb)
                      from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kategori', public.ayar_sayi('duello2_kategori_sn', 8),
       'ban', public.ayar_sayi('duello_ban_sn', 5),   -- 853
       'secim', public.ayar_sayi('duello_secim_sn', 5),   -- 960
       'cevap', public.ayar_sayi('duello2_cevap_sn', 15),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'sonuc', public.ayar_sayi('duello_sonuc_sn', 3),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       -- 325: sayaç bu andan önce tam süreyi gösterir (ekran fazı geç görse de hızlanmaz).
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'gosterim_bas', case d.faz
          when 'kategori' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
          when 'ban' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_ban_sn', 5))   -- 853
          when 'secim' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_secim_sn', 5))   -- 960
          when 'cevap' then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  )
  -- 666: Kategori Kalkanı — maçta 2 hak (Tur 1–pencere1: 1 açık; pencere2'ye kadar: 2, kullanılmayan kaybolmaz).
  -- kullanilan: [{kategori, idx, tur}]; kalan: şu an kullanılabilecek hak; aktif: bu seçimde korunan kategori.
  || jsonb_build_object('kalkan', jsonb_build_object(
       'acik', d.surum = 2 and public.ayar_sayi('duello2_kalkan_acik', 1) = 1,
       'son_sn', public.ayar_sayi('duello2_kalkan_son_sn', 5),
       'toplam_hak', 2,
       'pencere1_son', public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5),
       'pencere2_son', public.ayar_sayi('duello_kalkan_pencere2_son_tur', 10),
       'oyuncular', jsonb_build_object(
          d.oyuncu1::text, jsonb_build_object('kullanilan', d.kalkanlar1,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar1)) end),
          d.oyuncu2::text, jsonb_build_object('kullanilan', d.kalkanlar2,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar2)) end)),
       'aktif', public.duello2_aktif_kalkan(p_id)))
  -- 853: savunma banı. kategori: bu turun banı (ban fazı bitince, tur sonuna kadar); onceki: savunanın bir önceki
  -- savunmasındaki banı (arka arkaya banlanamaz); uygun: ban fazında banlanabilecek kategoriler.
  || jsonb_build_object('ban', jsonb_build_object(
       'acik', coalesce(d.hakimiyet, false) and coalesce(d.ban_acik, true),   -- 982: maç satırına sabit
       'sure', public.ayar_sayi('duello_ban_sn', 5),
       'kategori', case when d.durum = 'aktif' and not d.uzatma and d.faz <> 'ban' then d.ban_kategori end,
       'onceki', case when d.durum = 'aktif' and d.faz = 'ban'
                      then (case when v_savunan = d.oyuncu1 then d.son_ban1 else d.son_ban2 end) end,
       'uygun', case when d.durum = 'aktif' and d.faz = 'ban' then
           (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
             where public.duello2_ban_uygun_mu(p_id, v_savunan, k)) end))
  -- 960: sıralı kategori seçimi. sira: yapılmış seçim sayısı; toplam: havuz (10); sirasi: her seçim sırasının oyuncusu
  -- (yılan A-B-B-A…); secimler: [{k, u, oto, sira}] — oto = süre doldu, sunucu seçti; kalan: henüz alınmamışlar.
  || jsonb_build_object('secim', case when coalesce(d.secim_modu, false) then jsonb_build_object(
       'acik', true,
       'sira', d.secim_sira,
       'toplam', coalesce(array_length(public.duello2_secim_havuzu(p_id), 1), 0),
       'ilk_secen', d.ilk_secen,
       'sure', public.ayar_sayi('duello_secim_sn', 5),
       'sirasi', (select coalesce(jsonb_agg(case when public.duello2_secim_sirasi(i) = 0 then d.ilk_secen
                                                 when d.ilk_secen = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end order by i), '[]'::jsonb)
                    from generate_series(0, coalesce(array_length(public.duello2_secim_havuzu(p_id), 1), 0) - 1) i),
       'secimler', coalesce(d.secimler, '[]'::jsonb),
       'kalan', case when d.faz = 'secim' then
           (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello2_secim_havuzu(p_id)) k
             where not (coalesce(d.sahiplik, '{}'::jsonb) ? k)) end)
     else jsonb_build_object('acik', false) end)
  -- 970: puan modu. puanlar: anlık puan; alinan: rakibin BAŞLANGIÇTAKİ (seçimdeki) kategorilerinden şu an elinde tuttuğun sayı;
  -- baslangic: seçim sonundaki sahiplik {kategori: oyuncu}.
  || jsonb_build_object('puan', case when coalesce(d.puan_modu, false) then jsonb_build_object(
       'acik', true,
       'hedef', d.puan_hedef,
       'kategori_yolu', d.kategori_yolu,
       'puanlar', jsonb_build_object(d.oyuncu1::text, coalesce(d.puan1, 0), d.oyuncu2::text, coalesce(d.puan2, 0)),
       'alinan', jsonb_build_object(
          d.oyuncu1::text, public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu1),
          d.oyuncu2::text, public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu2)),
       'baslangic', (select coalesce(jsonb_object_agg(s ->> 'k', s ->> 'u'), '{}'::jsonb)
                       from jsonb_array_elements(coalesce(d.secimler, '[]'::jsonb)) s))
     else jsonb_build_object('acik', false) end);
end $function$
;
