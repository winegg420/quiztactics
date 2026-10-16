-- 1115 geri alma: değiştirilen fonksiyonların ESKİ gövdeleri (canlıdan, 2026-10-16).
begin;

-- kuyruga_gir
CREATE OR REPLACE FUNCTION public.kuyruga_gir(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_kat text;
  v_id uuid;
  v_rakip uuid;
  v_rakip_kat text;
  v_secilen_kat text;
  v_puan int;
  v_bekleme int;
  v_bas timestamptz;
  v_sorular uuid[];
begin
  perform public.hiz_siniri('kuyruga_gir', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  -- 860: boş ya da 'karisik' = Karışık (kategori seçilmedi). Profildeki tercihe düşülmez.
  v_kat := nullif(nullif(btrim(coalesce(p_kategori, '')), ''), 'karisik');
  select coalesce(pr.puan, 0) into v_puan from public.profiles pr where pr.id = auth.uid();

  -- Devam eden aktif maçım varsa ona dön
  select m.id into v_id from public.matches m
  where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
  limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  -- 860: kategori sunucuda doğrulanır (istemciye güvenme)
  if v_kat is not null and not public.kategori_mac_uygun_mu(v_kat, array[auth.uid()]) then
    raise exception 'Bu kategoride yeterli soru yok. Başka bir kategori seç.';
  end if;

  delete from public.matchmaking_queue where created_at < now() - interval '90 seconds';

  -- Kuyrukta ne kadardır bekliyorum? (saniye) Aralık buna göre genişler.
  select q.created_at into v_bas
    from public.matchmaking_queue q where q.user_id = auth.uid();
  v_bekleme := coalesce(extract(epoch from (now() - v_bas))::int, 0);

  -- 1) Aynı kategori + (dereceliyse) uygun seviye
  select q.user_id, q.kategori into v_rakip, v_rakip_kat
  from public.matchmaking_queue q
  join public.profiles pr on pr.id = q.user_id
  where q.user_id <> auth.uid()
       and not public.iletisim_engelli(auth.uid(), q.user_id)   -- 630: engelli çift eşleşmez
    and q.kategori is not distinct from v_kat
    -- 860: ikimizin ortak havuzu (dil + kapsam) kategorili maça yetmeli
    and (v_kat is null or public.kategori_mac_uygun_mu(v_kat, array[auth.uid(), q.user_id]))
    and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)   -- Paket 31 B: jokerli ≠ jokersiz
    and (
      not p_dereceli
      or coalesce(q.dereceli, true) = p_dereceli
    )
    and (
      not p_dereceli
      -- DERECELİ: kendi basamağım ya da ALTI. Yukarı çıkma yok.
      -- 20 sn'den fazla bekledimse bir basamak daha aşağı açılır.
      or public.seviye_basamagi(pr.puan) between
           greatest(0, public.seviye_basamagi(v_puan) - (case when v_bekleme > 20 then 2 else 1 end))
           and public.seviye_basamagi(v_puan)
    )
  order by
    -- En yakın seviyeden başla
    abs(public.seviye_basamagi(pr.puan) - public.seviye_basamagi(v_puan)),
    q.created_at
  limit 1
  for update skip locked;

  -- 2) Yoksa: 20 saniyedir bekleyen herhangi bir KARIŞIK rakip.
  -- 860: yalnız Karışık ↔ Karışık; kategori seçen oyuncu başka havuza taşınmaz.
  if not found and v_kat is null then
    select q.user_id, null::text into v_rakip, v_rakip_kat
    from public.matchmaking_queue q
    join public.profiles pr on pr.id = q.user_id
    where q.user_id <> auth.uid()
       and not public.iletisim_engelli(auth.uid(), q.user_id)   -- 630: engelli çift eşleşmez
      and q.kategori is null
      and q.created_at < now() - interval '20 seconds'
      and (not p_dereceli or coalesce(q.dereceli, true) = p_dereceli)
      and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)
      and (
        not p_dereceli
        or public.seviye_basamagi(pr.puan) <= public.seviye_basamagi(v_puan)
      )
    order by q.created_at
    limit 1
    for update skip locked;
  end if;

  if v_rakip is not null then
    v_secilen_kat := v_rakip_kat;
    -- 860: kategorili maçta 20 sorunun hepsi kategoriden çıkmıyorsa bu rakiple maç kurulmaz
    v_sorular := public.kategori_mac_soru_sec(v_secilen_kat, array[auth.uid(), v_rakip], not coalesce(p_dereceli, true));
  end if;

  if v_rakip is not null and v_sorular is not null then
    delete from public.matchmaking_queue where user_id in (v_rakip, auth.uid());

    if not public.hileli_mi() then
      perform public.mac_kotasi_kontrol();
    end if;

    insert into public.matches
      (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
    values (
      v_rakip, auth.uid(), 'aktif', v_secilen_kat,
      v_sorular,
      0, now(), p_dereceli, coalesce(p_jokersiz, false)
    )
    returning id into v_id;
    return v_id;
  end if;

  -- 370: gerçek rakip yok ve bu aramanın bot süresi doldu → mevcut bot yolu (quick_match).
  if v_bas is not null and public.eslesme_bot_hazir(auth.uid(), v_bas, public.eslesme_klasik_pay_sn()) then
    return public.quick_match(coalesce(v_kat, 'karisik'), p_dereceli, p_jokersiz);
  end if;

  -- Eşleşme yok: kuyruğa gir (varsa süreyi koru — 20 sn sayacı sıfırlanmasın)
  insert into public.matchmaking_queue (user_id, kategori, dereceli, jokersiz)
  values (auth.uid(), v_kat, p_dereceli, coalesce(p_jokersiz, false))
  on conflict (user_id) do update
    set kategori = excluded.kategori,
        dereceli = excluded.dereceli,
        jokersiz = excluded.jokersiz;

  return null;
end;
$function$;

-- quick_match
CREATE OR REPLACE FUNCTION public.quick_match(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_rakip uuid;
  v_bot uuid;
  v_kat text;
  v_puan int;
  v_arama_bas timestamptz;
  v_sorular uuid[];
begin
  perform public.hiz_siniri('quick_match', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  -- 860: boş ya da 'karisik' = Karışık. Profildeki tercihe düşülmez.
  v_kat := nullif(nullif(btrim(coalesce(p_kategori, '')), ''), 'karisik');
  select coalesce(pr.puan, 0) into v_puan from public.profiles pr where pr.id = auth.uid();

  select m.id into v_id from public.matches m
  where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
  limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  -- 860: kategori sunucuda doğrulanır
  if v_kat is not null and not public.kategori_mac_uygun_mu(v_kat, array[auth.uid()]) then
    raise exception 'Bu kategoride yeterli soru yok. Başka bir kategori seç.';
  end if;

  perform public.mac_kotasi_kontrol();

  delete from public.matchmaking_queue where created_at < now() - interval '90 seconds';

  -- ÖNCE GERÇEK OYUNCU: bot yalnız kuyruk boşsa devreye girer.
  select q.user_id into v_rakip
  from public.matchmaking_queue q
  join public.profiles pr on pr.id = q.user_id
  where q.user_id <> auth.uid()
       and not public.iletisim_engelli(auth.uid(), q.user_id)   -- 630: engelli çift eşleşmez
    -- 860: havuz kategoriye göre ayrı (Karışık ↔ Karışık, kategori ↔ aynı kategori)
    and q.kategori is not distinct from v_kat
    and (v_kat is null or public.kategori_mac_uygun_mu(v_kat, array[auth.uid(), q.user_id]))
    and (not p_dereceli or coalesce(q.dereceli, true) = p_dereceli)
    and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)   -- Paket 31 B
    and (
      not p_dereceli
      or public.seviye_basamagi(pr.puan) <= public.seviye_basamagi(v_puan)
    )
  order by abs(public.seviye_basamagi(pr.puan) - public.seviye_basamagi(v_puan)), q.created_at
  limit 1
  for update skip locked;

  if v_rakip is not null then
    v_sorular := public.kategori_mac_soru_sec(v_kat, array[auth.uid(), v_rakip], not coalesce(p_dereceli, true));
  end if;

  if v_rakip is not null and v_sorular is not null then
    delete from public.matchmaking_queue where user_id in (v_rakip, auth.uid());
    insert into public.matches
      (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
    values (
      v_rakip, auth.uid(), 'aktif', v_kat,
      v_sorular,
      0, now(), p_dereceli, coalesce(p_jokersiz, false)
    )
    returning id into v_id;
    return v_id;
  end if;

  -- ---- ARAMA GECİKMESİ ----
  -- Oyuncu "rakip aranıyor" der demez bota bağlanırsa sahte olduğu anlaşılır.
  select q.created_at into v_arama_bas
    from public.matchmaking_queue q where q.user_id = auth.uid();

  if v_arama_bas is null then
    insert into public.matchmaking_queue (user_id, kategori, dereceli, jokersiz)
    values (auth.uid(), v_kat, p_dereceli, coalesce(p_jokersiz, false))
    on conflict (user_id) do update set created_at = now()
    returning created_at into v_arama_bas;
    return null;                     -- aranıyor
  end if;

  -- 370: aramaya özgü rastgele süre (üçgen 3-6-15 sn), kuyruga_gir ile aynı pay
  if not public.eslesme_bot_hazir(auth.uid(), v_arama_bas, public.eslesme_klasik_pay_sn()) then
    return null;                     -- hâlâ aranıyor
  end if;

  -- 860: bot maçında da 20 sorunun hepsi seçilen kategoriden
  v_sorular := public.kategori_mac_soru_sec(v_kat, array[auth.uid()], not coalesce(p_dereceli, true));
  if v_sorular is null then
    raise exception 'Bu kategoride yeterli soru yok. Başka bir kategori seç.';
  end if;

  delete from public.matchmaking_queue where user_id = auth.uid();

  -- Bot: bant + lig sınırı + tekrar engeli (bkz. bot_sec).
  v_bot := public.bot_sec(auth.uid());

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), v_bot, 'aktif', v_kat,
    v_sorular,
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;
  return v_id;
end;
$function$;

-- hizli_mod_baslat
CREATE OR REPLACE FUNCTION public.hizli_mod_baslat(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true)
 RETURNS TABLE(oturum_id uuid, soru_sayisi integer, sure_sn integer, soru_sure_sn integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  -- Okuma yükü tavanı (soru metni + şıkların toplam karakteri): soru başına
  -- verilen süreye sığsın diye var. Değerler oyun_ayarlari'nda (migration 200).
  v_max_okuma int := public.ayar_sayi('hizli_mod_okuma_tavani', 170)::int;
  v_sure int := public.ayar_sayi('hizli_mod_sure_sn', 90)::int;
  v_soru_sure int := public.ayar_sayi('hizli_mod_soru_sure_sn', 10)::int;
  v_tavan int := public.ayar_sayi('hizli_mod_soru_tavani', 9)::int;   -- 212: oturum başına en çok soru
  v_me uuid := auth.uid();
  v_kat text;
  v_ids uuid[];
  v_id uuid;
begin
  -- Hız sınırı: yalnız kullanıcı tetikli çağrılar (bkz. migration 115).
  perform public.hiz_siniri('hizli_mod_baslat', 10, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  v_kat := nullif(btrim(coalesce(p_kategori, '')), '');
  if v_kat is not null
     and not exists (select 1 from public.questions q where q.aktif and q.kategori = v_kat) then
    raise exception 'Geçersiz kategori';
  end if;

  -- Devam eden oturumu kapat (tek aktif oturum)
  update public.hizli_mod_oturumlar
     set durum = 'bitti', bitis = coalesce(bitis, now())
   where user_id = v_me and durum = 'aktif';

  perform public.mac_kotasi_kontrol();

  -- 90 sn / 10 sn = en çok 9 soru; yedekle birlikte 25 çekilir.
  -- Son parametre: soru süresine sığmayan uzun sorular elenir.
  v_ids := public.soru_sec(v_kat, 25, array[v_me], null, v_max_okuma);
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    raise exception 'Bu kategoride soru bulunamadı';
  end if;

  insert into public.hizli_mod_oturumlar (user_id, kategori, soru_ids, dereceli)
  values (v_me, v_kat, v_ids, coalesce(p_dereceli, true))
  returning id into v_id;

  return query select v_id, least(coalesce(array_length(v_ids, 1), 0), greatest(v_tavan, 1)), v_sure, v_soru_sure;
end;
$function$;

-- duello_ara
CREATE OR REPLACE FUNCTION public.duello_ara(p_dereceli boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_lig int;
  v_rakip uuid;
  v_bas timestamptz;
  v_bot uuid;
begin
  perform public.hiz_siniri('duello_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Devam eden düellom varsa ona dön
  select x.id into v_id from public.duellolar x
   where x.durum = 'aktif' and v_me in (x.oyuncu1, x.oyuncu2) limit 1;
  if found then
    delete from public.duello_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  perform public.duello_acilis_kontrol(v_me, true);   -- 666: yeni oyuncu kilidi
  delete from public.duello_kuyrugu where created_at < now() - interval '90 seconds';
  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig from public.profiles where id = v_me;
  v_lig := coalesce(v_lig, 1);

  -- Gerçek rakip: aynı giriş türü, kendi ligi ± 1
  select q.user_id into v_rakip
    from public.duello_kuyrugu q
    join public.profiles pr on pr.id = q.user_id
   where q.user_id <> v_me
       and not public.iletisim_engelli(v_me, q.user_id)   -- 630: engelli çift eşleşmez
     and q.dereceli = coalesce(p_dereceli, true)
     and public.lig_sirasi(coalesce(pr.lig, 'bronz')) between v_lig - 1 and v_lig + 1
   order by q.created_at
   limit 1
   for update of q skip locked;

  if v_rakip is not null then
    perform public.mac_kotasi_kontrol();
    return public.duello_olustur(v_rakip, v_me, p_dereceli);
  end if;

  select q.created_at into v_bas from public.duello_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.duello_kuyrugu (user_id, dereceli) values (v_me, coalesce(p_dereceli, true))
    on conflict (user_id) do update set dereceli = excluded.dereceli, created_at = now();
    return null;
  end if;
  update public.duello_kuyrugu set dereceli = coalesce(p_dereceli, true) where user_id = v_me;

  -- 370: kimse yoksa aramaya özgü rastgele sürede (üçgen 3-6-15 sn) gizli bot (lig ± 1).
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then
    return null;
  end if;

  v_bot := public.bot_sec(v_me);
  if v_bot is null then raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.'; end if;
  perform public.mac_kotasi_kontrol();
  perform public.bot_kisilik_tohumla(v_bot);
  return public.duello_olustur(v_me, v_bot, p_dereceli);
end $function$;

-- kasa_ara
CREATE OR REPLACE FUNCTION public.kasa_ara(p_dereceli boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_lig int;
  v_rakip uuid;
  v_bas timestamptz;
  v_bot uuid;
begin
  perform public.hiz_siniri('kasa_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;

  select x.id into v_id from public.kasa_maclari x
   where x.durum = 'aktif' and v_me in (x.oyuncu1, x.oyuncu2) limit 1;
  if found then
    delete from public.kasa_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  delete from public.kasa_kuyrugu where created_at < now() - interval '90 seconds';
  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig from public.profiles where id = v_me;
  v_lig := coalesce(v_lig, 1);

  select q.user_id into v_rakip
    from public.kasa_kuyrugu q
    join public.profiles pr on pr.id = q.user_id
   where q.user_id <> v_me
     and not public.iletisim_engelli(v_me, q.user_id)
     and q.dereceli = coalesce(p_dereceli, true)
     and public.lig_sirasi(coalesce(pr.lig, 'bronz')) between v_lig - 1 and v_lig + 1
   order by q.created_at
   limit 1
   for update of q skip locked;

  if v_rakip is not null then
    perform public.mac_kotasi_kontrol();
    return public.kasa_olustur(v_rakip, v_me, p_dereceli, false);
  end if;

  select q.created_at into v_bas from public.kasa_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.kasa_kuyrugu (user_id, dereceli) values (v_me, coalesce(p_dereceli, true))
    on conflict (user_id) do update set dereceli = excluded.dereceli, created_at = now();
    return null;
  end if;
  update public.kasa_kuyrugu set dereceli = coalesce(p_dereceli, true) where user_id = v_me;

  -- 370: kimse yoksa aramaya özgü rastgele sürede gizli bot (lig ± 1)
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then return null; end if;
  v_bot := public.bot_sec(v_me);
  if v_bot is null then raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.'; end if;
  perform public.mac_kotasi_kontrol();
  perform public.bot_kisilik_tohumla(v_bot);
  return public.kasa_olustur(v_me, v_bot, p_dereceli, false);
end $function$;

-- duello_olustur
CREATE OR REPLACE FUNCTION public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
  v_secim boolean;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));
  v_secim := public.duello_secim_modu_acik();   -- 960

  -- 680: Hâkimiyet — puan/yıldız/çarpan yok; oranlar kart yüzdeleri için profil içinde kalır.
  -- Eşik ve kilit süresi maç başında sabitlenir (ayar değişse de devam eden maç etkilenmez).
  -- 960: mod + eşik + tur sayısı da satıra sabitlenir. Seçim modunda maç 'secim' fazıyla açılır: ilk seçen oyuncu2
  -- (sıra zaten rastgele), böylece tur 1'de ilk saldıran oyuncu1 = ilk seçmeyen. Bayrak kapalıysa eski akış (eski değerler).
  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, carpanli_turlar, carpan_katsayi,
                                hakimiyet, sahiplik, kilitler, hakimiyet_esik, kilit_tur, yuva1, yuva2,
                                saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum,
                                secim_modu, max_tur, ilk_secen, secim_sira, secimler)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,   -- puan kolonu 0 kalır (eski "puan1 boş = can maçı" ayrımı bozulmasın)
          null, null, null, null, null,
          true, '{}'::jsonb, '{}'::jsonb,
          greatest(1, case when v_secim then public.ayar_sayi('duello_hakimiyet_esik', 7)
                           else public.ayar_sayi('duello_bos_mod_esik', 5) end::int),
          greatest(0, public.ayar_sayi('duello_kilit_tur', 2)::int), 0, 0,
          case when v_secim then p_b else p_a end,
          case when v_secim then 'secim' else 'kategori' end,
          case when v_secim
               then now() + make_interval(secs => public.ayar_sayi('duello_secim_sn', 5) + public.ayar_sayi('duello_secim_ilk_ek_sn', 3))
                    + public.duello2_gosterim_payi()
               else now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi() end,
          v_p1, v_p2, p_onceki, 2,
          v_secim,
          greatest(1, case when v_secim then public.ayar_sayi('duello_max_tur', 20)
                           else public.ayar_sayi('duello_bos_mod_max_tur', 16) end)::smallint,
          case when v_secim then p_b end, 0, '[]'::jsonb)
  returning id into v_id;
  -- 970: yeni puan kuralı (yalnız seçim modunda — başlangıç kategorileri draft'tan gelir). Hedef, kategori yolu ve
  -- tur sayısı maç satırına sabitlenir; bayrak 'eski' ise satır puan_modu = false kalır (960 hâkimiyet akışı aynen).
  -- 1015 · Düello v4: bayrak açıksa (ya da "test" ve oyuncular test listesinde) maç v4 çekirdeğiyle başlar (surum 4);
  -- 970 puan / 853 ban kurulumları atlanır. Bayrak kapalıysa aşağısı aynen.
  if public.duello4_acik_mi(p_a, p_b) then
    perform public.duello4_baslat(v_id);
  elsif v_secim and public.duello_puan_modu_acik() then
    update public.duellolar
       set puan_modu = true,
           puan_hedef = greatest(1, public.ayar_sayi('duello_puan_hedef', 12))::smallint,
           kategori_yolu = greatest(1, public.ayar_sayi('duello_puan_kategori_yolu', 4))::smallint,
           max_tur = greatest(1, public.ayar_sayi('duello_puan_max_tur', 20))::smallint
     where id = v_id;
  end if;
  if not v_secim and (select x.surum from public.duellolar x where x.id = v_id) <> 4 then
    perform public.duello2_ban_baslat(v_id);   -- 853: ilk tur da savunma banıyla başlar (bayrak kapalıysa 'kategori' kalır)
  end if;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- kasa_olustur
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
    devam_sans, devam_garanti, devam_birakir, devam_elli, kasa_tavan, devam_carpan, savunma_acik,
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
    -- 954: 953 şanslı ödülü yeni maçlarda kapalı; yerine sahiplik bırakma + garanti ücretsiz 50:50
    0, 0,
    public.ayar_sayi('kasa_devam_birakir', 0) >= 1,
    -- 987: Savunma Hakkı açıkken 954 ücretsiz 50:50 YOK (yerine geçer)
    public.ayar_sayi('kasa_devam_joker_acik', 0) >= 1 and public.ayar_sayi('kasa_savunma_acik', 0) < 1,
    -- 955: tavan (0 = yok) ve DEVAM çarpanı (1 = yok)
    greatest(0, public.ayar_sayi('kasa_tavan', 0)::int),
    greatest(1, public.ayar_ondalik('kasa_devam_carpan', 1)),
    public.ayar_sayi('kasa_savunma_acik', 0) >= 1,
    coalesce(public.soru_sec(null::text, v_max + 2, array[p_a, p_b]), '{}'::uuid[]),
    v_bot, case when v_bot is not null then public.kasa_bot_tarz(v_bot) end)
  returning id into v_id;

  insert into public.kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.kasa_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- create_challenge
CREATE OR REPLACE FUNCTION public.create_challenge(p_rakip uuid, p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  perform public.hiz_siniri('create_challenge', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if p_rakip = auth.uid() then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then
    raise exception 'Oyuncu bulunamadı';
  end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;
  if exists (
    select 1 from public.matches
    where durum in ('bekliyor','aktif')
      and ((oyuncu1 = auth.uid() and oyuncu2 = p_rakip)
        or (oyuncu1 = p_rakip and oyuncu2 = auth.uid()))
  ) then
    raise exception 'Bu oyuncuyla zaten devam eden bir meydan okuman var';
  end if;

  -- Kural 2: modlar toplamı (Paket 24 · A.2) — 2 parametreli sürümden taşındı (Paket 30 A)
  perform public.davet_siniri_kontrol(p_rakip);

  perform public.mac_kotasi_kontrol();

  insert into public.matches (oyuncu1, oyuncu2, kategori, dereceli, jokersiz)
  values (auth.uid(), p_rakip, p_kategori, coalesce(p_dereceli, true), coalesce(p_jokersiz, false))
  returning id into v_id;
  return v_id;
end;
$function$;

-- duello_davet_et
CREATE OR REPLACE FUNCTION public.duello_davet_et(p_rakip uuid, p_dereceli boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_davet uuid;
  v_duello uuid;
  v_bot boolean;
  v_ad text;
begin
  -- 440 (Ida, 24 Eyl 2026): açık botla antrenman her zaman serbest; botla lig puanı kasılamaz.
  if exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('duello_davet_et', 30, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_rakip = v_me then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then
    raise exception 'Oyuncu bulunamadı';
  end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;
  perform public.duello_acilis_kontrol(v_me, true);        -- 666: yeni oyuncu kilidi
  perform public.duello_acilis_kontrol(p_rakip, false);

  delete from public.duello_davetleri
   where durum = 'bekliyor' and created_at < now() - interval '24 hours';

  if exists (select 1 from public.duellolar
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or p_rakip in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir düello var';
  end if;
  -- Kural 5: aynı modda ikinci davet yok
  if exists (select 1 from public.duello_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir düello davetin zaten var';
  end if;
  -- Kural 2: modlar toplamında en fazla 2 bekleyen davet (Paket 24 · A.2)
  perform public.davet_siniri_kontrol(p_rakip);

  perform public.mac_kotasi_kontrol();

  -- 1053: açık bot hariç; aynı kişiye 60 sn içinde yeniden davet yok, düello + kasa toplam 24 saatte 100
  if not exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    if exists (select 1 from public.duello_davetleri d
                where d.kuran = v_me and d.rakip = p_rakip and d.created_at > now() - interval '60 seconds') then
      raise exception 'Bu oyuncuya az önce davet gönderdin, biraz bekle.';
    end if;
    perform public.hiz_siniri_mesajli('davet_gunluk', 100, interval '24 hours',
      'Bugün çok fazla davet gönderdin, daha sonra tekrar dene.');
  end if;

  insert into public.duello_davetleri (kuran, rakip, dereceli)
  values (v_me, p_rakip, coalesce(p_dereceli, true))
  returning id into v_davet;

  select coalesce(is_bot, false) and coalesce(acik_bot, false) into v_bot
    from public.profiles where id = p_rakip;
  if coalesce(v_bot, false) then
    v_duello := public.duello_olustur(v_me, p_rakip, coalesce(p_dereceli, true));
    update public.duello_davetleri
       set durum = 'kabul', duello_id = v_duello, yanit_at = now()
     where id = v_davet;
  else
    -- Davet edilen haberdar olsun (bant + telefon bildirimi). Bot ise bildirim_yaz kendisi susar.
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_yaz(
      p_rakip,
      'duello_daveti',
      coalesce(v_ad, 'Bir oyuncu') || ' seni düelloya çağırdı!',
      '/bildim/duello'
    );
  end if;

  return jsonb_build_object('davet_id', v_davet, 'duello_id', v_duello);
end;
$function$;

-- kasa_davet_et
CREATE OR REPLACE FUNCTION public.kasa_davet_et(p_rakip uuid, p_dereceli boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_davet uuid;
  v_kasa uuid;
  v_bot boolean;
  v_ad text;
begin
  -- 440: açık botla antrenman her zaman serbest
  if exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('kasa_davet_et', 30, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if p_rakip = v_me then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then raise exception 'Oyuncu bulunamadı'; end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;

  delete from public.kasa_davetleri where durum = 'bekliyor' and created_at < now() - interval '24 hours';
  if exists (select 1 from public.kasa_maclari
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or p_rakip in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir Ortak Hazine maçı var';
  end if;
  if exists (select 1 from public.kasa_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir Ortak Hazine davetin zaten var';
  end if;
  perform public.davet_siniri_kontrol(p_rakip);
  perform public.mac_kotasi_kontrol();

  -- 1053: açık bot hariç; aynı kişiye 60 sn içinde yeniden davet yok, düello + kasa toplam 24 saatte 100
  if not exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    if exists (select 1 from public.kasa_davetleri d
                where d.kuran = v_me and d.rakip = p_rakip and d.created_at > now() - interval '60 seconds') then
      raise exception 'Bu oyuncuya az önce davet gönderdin, biraz bekle.';
    end if;
    perform public.hiz_siniri_mesajli('davet_gunluk', 100, interval '24 hours',
      'Bugün çok fazla davet gönderdin, daha sonra tekrar dene.');
  end if;

  insert into public.kasa_davetleri (kuran, rakip, dereceli)
  values (v_me, p_rakip, coalesce(p_dereceli, true))
  returning id into v_davet;

  select coalesce(is_bot, false) and coalesce(acik_bot, false) into v_bot from public.profiles where id = p_rakip;
  if coalesce(v_bot, false) then
    v_kasa := public.kasa_olustur(v_me, p_rakip, coalesce(p_dereceli, true), true);
    update public.kasa_davetleri set durum = 'kabul', kasa_id = v_kasa, yanit_at = now() where id = v_davet;
  else
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_yaz(p_rakip, 'kasa_daveti',
      coalesce(v_ad, 'Bir oyuncu') || ' seni Ortak Hazine maçına çağırdı!', '/bildim/kasa');
  end if;
  return jsonb_build_object('davet_id', v_davet, 'kasa_id', v_kasa);
end $function$;

-- rovans_iste
CREATE OR REPLACE FUNCTION public.rovans_iste(p_mac_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  m public.matches%rowtype;
  v_rakip uuid;
  v_bot boolean;
  v_acik_bot boolean;
  v_id uuid;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  select * into m from public.matches where id = p_mac_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if m.durum <> 'bitti' then raise exception 'Maç henüz bitmedi'; end if;
  if m.kazanan is null or m.kazanan = v_me then
    raise exception 'Rövanş yalnızca kaybettiğin maç için istenebilir';
  end if;
  if m.bitis is null or m.bitis < now() - interval '24 hours' then
    raise exception 'Rövanş süresi doldu (24 saat)';
  end if;

  v_rakip := case when m.oyuncu1 = v_me then m.oyuncu2 else m.oyuncu1 end;
  select coalesce(is_bot, false),
         coalesce(is_bot, false) and coalesce(bot_turu, 'acik') = 'acik'
    into v_bot, v_acik_bot from public.profiles where id = v_rakip;

  if exists (
    select 1 from public.matches x
    where x.durum in ('bekliyor','aktif')
      and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me))
  ) then
    raise exception 'Bu oyuncuyla zaten devam eden bir maçın var';
  end if;

  perform public.mac_kotasi_kontrol();

  if coalesce(v_acik_bot, false)
     or (coalesce(v_bot, false) and public.ayar_ondalik('bot_rovans_anlik', 1) >= 1) then
    -- Bot rakip (açık ya da gizli): rövanş anında başlar, kabul beklenmez.
    insert into public.matches (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic,
                                rovans, dereceli, jokersiz)
    values (
      v_me, v_rakip, 'aktif', m.kategori,
      public.soru_sec(m.kategori, 20, array[v_me], p_serbest_klasik => not coalesce(m.dereceli, true)),
      0, now(), true,
      coalesce(m.dereceli, true),     -- rövanş aynı tür: serbest → serbest
      coalesce(m.jokersiz, false)     -- Paket 31 B: rövanş aynı modda
    )
    returning id into v_id;
  else
    -- Gerçek oyuncu (ve bot_rovans_anlik = 0'da gizli bot): davet olarak açılır.
    -- Bildirimi trg_matches_davet_bildir yazar (tek kaynak); gizli botun
    -- kabulünü bot_oyna gecikmeyle yapar (soruları m.dereceli'ye göre seçer).
    insert into public.matches (oyuncu1, oyuncu2, kategori, rovans, dereceli, jokersiz)
    values (v_me, v_rakip, m.kategori, true, coalesce(m.dereceli, true), coalesce(m.jokersiz, false))
    returning id into v_id;
  end if;

  return v_id;
end;
$function$;

-- joker_ucretsiz_elli_hakki
CREATE OR REPLACE FUNCTION public.joker_ucretsiz_elli_hakki(p_mac_tur text, p_mac_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dereceli boolean;
begin
  -- Paket 27 B.1.2: ücretsiz 50:50 YALNIZ serbest Klasik Mod'da.
  -- Dereceli Klasik Mod, düello, turnuva, grup, hızlı: ücretsiz joker YOK.
  if p_mac_tur <> '1v1' then return false; end if;
  select coalesce(dereceli, true) into v_dereceli from public.matches where id = p_mac_id;
  if not found or v_dereceli then return false; end if;
  -- Bu maçta ücretsizi daha önce kullandıysa hak bitmiştir.
  return not exists (
    select 1 from public.joker_kullanimlari
     where user_id = auth.uid() and mac_tur = p_mac_tur and mac_id = p_mac_id
       and tur = 'elli' and ucretsiz);
end;
$function$;

-- odul_carpani
CREATE OR REPLACE FUNCTION public.odul_carpani(p_cift numeric, p_serbest boolean, p_acik_bot boolean)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select least(
    coalesce(p_cift, 1),
    case when coalesce(p_serbest, false) then public.ayar_ondalik('serbest_coin_carpani', 0.5) else 1 end,
    case when coalesce(p_acik_bot, false) then public.ayar_ondalik('coin_bot_carpani', 0.5) else 1 end
  );
$function$;

-- odul_indirim_sebebi
CREATE OR REPLACE FUNCTION public.odul_indirim_sebebi(p_cift numeric, p_serbest boolean, p_acik_bot boolean)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v numeric := public.odul_carpani(p_cift, p_serbest, p_acik_bot);
begin
  if v >= 1 then return null; end if;
  if coalesce(p_cift, 1) <= 0 then return 'cift_odulsuz'; end if;
  if coalesce(p_cift, 1) = v then return 'cift_yari'; end if;
  if coalesce(p_serbest, false) and public.ayar_ondalik('serbest_coin_carpani', 0.5) = v then return 'serbest'; end if;
  if coalesce(p_acik_bot, false) and public.ayar_ondalik('coin_bot_carpani', 0.5) = v then return 'acik_bot'; end if;
  return null;
end $function$;

commit;
