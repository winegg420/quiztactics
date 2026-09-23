-- 370 · Eşleşme süresi rastgele (Ajan E, E.1)
--
-- Sorun: gerçek oyuncu yokken gizli bot HER ZAMAN arama süresinin sonunda geliyordu
-- (Klasik/Saf Bilgi 15 sn + 0-5, Düello 8 + 2-5 sn, Grup 12 sn). İnandırıcı değil.
--
-- Yeni kural (her modda aynı): gerçek oyuncu varsa anında eşleşme DEĞİŞMEDİ. Yoksa gizli
-- bot, aramanın başından itibaren üçgen dağılımlı rastgele bir sürede gelir:
-- en az eslesme_bot_min_sn (3), en çok eslesme_bot_max_sn (15), tepe eslesme_bot_tepe_sn (6)
-- → sürelerin ~%64'ü 4-9 sn, medyan ~7,6 sn, ortalama 8 sn; ara sıra 3 ya da 12+ sn.
--
-- Süre SUNUCUDA belirlenir ve aynı aramada sabittir: tohum = oyuncu + kuyruk satırının
-- created_at'i (arama başında yazılır, yoklamalarda değişmez). Her yoklamada yeniden zar
-- atılmaz; istemci süreyi bilmez (bilseydi gerçek rakip olmadığını anlardı).
--
-- Yoklama payı: istemci ~3 sn'de bir (Klasik) / 1 sn'de bir (Düello, Grup) yoklar. Bot,
-- hedef anı en yakın yoklamaya yuvarlansın diye hedeften "pay" kadar önce hazır sayılır
-- (pay = yoklama aralığının yarısı); böylece gelen süreler 3'ün katlarına yığılmaz ve
-- ortalama hedefte kalır. Alt sınır (min) pay'dan etkilenmez.
--
-- Bot maçı mantığı YENİDEN YAZILMADI: kuyruga_gir süre dolunca mevcut quick_match'i çağırır;
-- quick_match / duello_ara / grup_ara yalnız "bot zamanı geldi mi" koşulunu değiştirir.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('eslesme_bot_min_sn',  '3'::jsonb,  'TEST DEĞERİ — Rakip ararken gerçek oyuncu yoksa gizli botun en erken geliş süresi (sn). Üçgen dağılım alt ucu.'),
  ('eslesme_bot_tepe_sn', '6'::jsonb,  'TEST DEĞERİ — Gizli bot geliş süresinin en sık değeri (sn). Üçgen dağılım tepesi.'),
  ('eslesme_bot_max_sn',  '15'::jsonb, 'TEST DEĞERİ — Gizli botun en geç geliş süresi (sn). Üçgen dağılım üst ucu. İstemci en çok bunun + 5 sn bekler.')
on conflict (anahtar) do nothing;

-- Aramaya özgü hedef süre (sn). Deterministik: aynı (oyuncu, arama başı) → aynı süre.
create or replace function public.eslesme_bot_suresi(p_user uuid, p_baslangic timestamptz)
returns numeric
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_min  numeric := public.ayar_ondalik('eslesme_bot_min_sn', 3);
  v_tepe numeric := public.ayar_ondalik('eslesme_bot_tepe_sn', 6);
  v_max  numeric := public.ayar_ondalik('eslesme_bot_max_sn', 15);
  v_u    numeric;
  v_fc   numeric;
begin
  -- Ayar hatasına karşı sırala: min <= tepe <= max
  v_max  := greatest(v_min, v_max);
  v_tepe := least(v_max, greatest(v_min, v_tepe));
  if v_max = v_min then return v_min; end if;

  v_u  := public.bot_rasgele(p_user::text || ':' || p_baslangic::text || ':eslesme')::numeric;
  v_fc := (v_tepe - v_min) / (v_max - v_min);
  -- Üçgen dağılımın ters birikimli dağılım fonksiyonu
  if v_u < v_fc then
    return v_min + sqrt(v_u * (v_max - v_min) * (v_tepe - v_min));
  end if;
  return v_max - sqrt((1 - v_u) * (v_max - v_min) * (v_max - v_tepe));
end $$;

-- Bot zamanı geldi mi? p_pay_sn: istemcinin yoklama aralığının yarısı (yuvarlama payı).
create or replace function public.eslesme_bot_hazir(p_user uuid, p_baslangic timestamptz, p_pay_sn numeric default 0)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select now() >= p_baslangic
         + greatest(public.ayar_ondalik('eslesme_bot_min_sn', 3),
                    public.eslesme_bot_suresi(p_user, p_baslangic) - greatest(0, coalesce(p_pay_sn, 0)))
           * interval '1 second';
$$;

-- Yalnız sunucu fonksiyonları çağırır: istemci kendi hedef süresini okuyamasın.
revoke all on function public.eslesme_bot_suresi(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.eslesme_bot_hazir(uuid, timestamptz, numeric) from public, anon, authenticated;

-- Klasik/Saf Bilgi yoklama payı (sn) — kuyruga_gir ile quick_match AYNI payı kullanmalı,
-- yoksa kuyruga_gir "hazır" deyip quick_match "bekle" diyebilir.
create or replace function public.eslesme_klasik_pay_sn()
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select greatest(0, public.ayar_sayi('rakip_ara_yoklama_ms', 3000))::numeric / 2000.0;
$$;
revoke all on function public.eslesme_klasik_pay_sn() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- kuyruga_gir: gerçek rakip yoksa ve bot zamanı geldiyse mevcut quick_match'e devreder.
-- (Önceden istemci 15 sn sayıp quick_match'i kendisi çağırıyordu.) Gövdenin geri kalanı aynı.
-- ---------------------------------------------------------------------------
create or replace function public.kuyruga_gir(p_kategori text default null::text, p_dereceli boolean default true, p_jokersiz boolean default false)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_kat text;
  v_id uuid;
  v_rakip uuid;
  v_rakip_kat text;
  v_secilen_kat text;
  v_puan int;
  v_bekleme int;
  v_bas timestamptz;
begin
  perform public.hiz_siniri('kuyruga_gir', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );
  select coalesce(pr.puan, 0) into v_puan from public.profiles pr where pr.id = auth.uid();

  -- Devam eden aktif maçım varsa ona dön
  select m.id into v_id from public.matches m
  where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
  limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
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
    and q.kategori is not distinct from v_kat
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

  -- 2) Yoksa: 20 saniyedir bekleyen herhangi bir rakip (karışık kategori)
  if not found then
    select q.user_id, null::text into v_rakip, v_rakip_kat
    from public.matchmaking_queue q
    join public.profiles pr on pr.id = q.user_id
    where q.user_id <> auth.uid()
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

  if found and v_rakip is not null then
    v_secilen_kat := v_rakip_kat;
    delete from public.matchmaking_queue where user_id in (v_rakip, auth.uid());

    if not public.hileli_mi() then
      perform public.mac_kotasi_kontrol();
    end if;

    insert into public.matches
      (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
    values (
      v_rakip, auth.uid(), 'aktif', v_secilen_kat,
      public.soru_sec(v_secilen_kat, 20, array[auth.uid(), v_rakip], p_serbest_klasik => not coalesce(p_dereceli, true)),
      0, now(), p_dereceli, coalesce(p_jokersiz, false)
    )
    returning id into v_id;
    return v_id;
  end if;

  -- 370: gerçek rakip yok ve bu aramanın bot süresi doldu → mevcut bot yolu (quick_match).
  if v_bas is not null and public.eslesme_bot_hazir(auth.uid(), v_bas, public.eslesme_klasik_pay_sn()) then
    return public.quick_match(p_kategori, p_dereceli, p_jokersiz);
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

-- ---------------------------------------------------------------------------
-- quick_match: yalnız bekleme koşulu değişti (bot_eslesme_gecikmesi → eslesme_bot_hazir).
-- ---------------------------------------------------------------------------
create or replace function public.quick_match(p_kategori text default null::text, p_dereceli boolean default true, p_jokersiz boolean default false)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_rakip uuid;
  v_bot uuid;
  v_kat text;
  v_puan int;
  v_arama_bas timestamptz;
begin
  perform public.hiz_siniri('quick_match', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );
  select coalesce(pr.puan, 0) into v_puan from public.profiles pr where pr.id = auth.uid();

  select m.id into v_id from public.matches m
  where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
  limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  perform public.mac_kotasi_kontrol();

  delete from public.matchmaking_queue where created_at < now() - interval '90 seconds';

  -- ÖNCE GERÇEK OYUNCU: bot yalnız kuyruk boşsa devreye girer.
  select q.user_id into v_rakip
  from public.matchmaking_queue q
  join public.profiles pr on pr.id = q.user_id
  where q.user_id <> auth.uid()
    and (not p_dereceli or coalesce(q.dereceli, true) = p_dereceli)
    and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)   -- Paket 31 B
    and (
      not p_dereceli
      or public.seviye_basamagi(pr.puan) <= public.seviye_basamagi(v_puan)
    )
  order by abs(public.seviye_basamagi(pr.puan) - public.seviye_basamagi(v_puan)), q.created_at
  limit 1
  for update skip locked;

  if found then
    delete from public.matchmaking_queue where user_id in (v_rakip, auth.uid());
    insert into public.matches
      (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
    values (
      v_rakip, auth.uid(), 'aktif', v_kat,
      public.soru_sec(v_kat, 20, array[auth.uid(), v_rakip], p_serbest_klasik => not coalesce(p_dereceli, true)),
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

  delete from public.matchmaking_queue where user_id = auth.uid();

  -- Bot: bant + lig sınırı + tekrar engeli (bkz. bot_sec).
  v_bot := public.bot_sec(auth.uid());

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), v_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()], p_serbest_klasik => not coalesce(p_dereceli, true)),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;
  return v_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- duello_ara: yalnız bekleme koşulu değişti (duello_arama_sn + gecikme → eslesme_bot_hazir).
-- İstemci 1 sn'de bir yoklar → pay 0,5 sn.
-- ---------------------------------------------------------------------------
create or replace function public.duello_ara(p_dereceli boolean default true)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  delete from public.duello_kuyrugu where created_at < now() - interval '90 seconds';
  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig from public.profiles where id = v_me;
  v_lig := coalesce(v_lig, 1);

  -- Gerçek rakip: aynı giriş türü, kendi ligi ± 1
  select q.user_id into v_rakip
    from public.duello_kuyrugu q
    join public.profiles pr on pr.id = q.user_id
   where q.user_id <> v_me
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

-- ---------------------------------------------------------------------------
-- grup_ara: yalnız bekleme koşulu değişti (grup_arama_sn → eslesme_bot_hazir).
-- İstemci 1 sn'de bir yoklar → pay 0,5 sn.
-- ---------------------------------------------------------------------------
create or replace function public.grup_ara(p_kategori text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_bas timestamptz;
  v_hedef int := greatest(3, least(5, public.ayar_sayi('grup_hedef_kisi', 3)::int));
  v_liste uuid[];
  v_bot uuid;
  v_deneme int;
begin
  perform public.hiz_siniri('grup_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Devam eden grup maçım varsa ona dön (kuyrukta kalmayayım)
  select g.id into v_id
    from public.group_matches g
    join public.group_match_players gp on gp.group_match_id = g.id
   where gp.user_id = v_me and gp.davet_durumu = 'kabul' and gp.terk_at is null
     and g.durum in ('bekliyor', 'lobi', 'aktif')
   limit 1;
  if v_id is not null then
    delete from public.grup_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  -- Eski kuyruk kayıtları düşer (duello_kuyrugu ile aynı ilke)
  delete from public.grup_kuyrugu
   where created_at < now() - make_interval(secs => public.ayar_sayi('grup_kuyruk_omru_sn', 90));

  -- Kuyruğa gir / kaydı tazele
  select q.created_at into v_bas from public.grup_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.grup_kuyrugu (user_id, kategori) values (v_me, p_kategori)
    on conflict (user_id) do update set kategori = excluded.kategori, created_at = now();
    return null;
  end if;
  update public.grup_kuyrugu set kategori = p_kategori where user_id = v_me;

  -- Yeterli gerçek oyuncu var mı? (kategori uyumlu: aynı kategori ya da ikisinden biri "farketmez")
  select coalesce(array_agg(q.user_id), '{}'::uuid[]) into v_liste
    from (
      select q.user_id
        from public.grup_kuyrugu q
       where q.user_id <> v_me
         and (p_kategori is null or q.kategori is null or q.kategori = p_kategori)
       order by q.created_at
       limit v_hedef - 1
       for update skip locked
    ) q;

  if coalesce(array_length(v_liste, 1), 0) >= v_hedef - 1 then
    perform public.mac_kotasi_kontrol();
    v_id := public.grup_kur_kuyruktan(array_prepend(v_me, v_liste), coalesce(p_kategori, (select kategori from public.grup_kuyrugu where user_id = v_liste[1])));
    delete from public.grup_kuyrugu where user_id = v_me or user_id = any(v_liste);
    return v_id;
  end if;

  -- 370: arama süresi aramaya özgü rastgele (üçgen 3-6-15 sn); dolmadıysa beklemeye devam
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then
    return null;
  end if;

  -- Süre doldu: kalan yerleri GİZLİ botlarla tamamla (1v1'deki "kimse yoksa botla başla"
  -- davranışının aynısı). Aynı bot iki kez seçilmesin diye tekrar denenir.
  v_liste := coalesce(v_liste, '{}'::uuid[]);
  while coalesce(array_length(v_liste, 1), 0) < v_hedef - 1 loop
    v_bot := null;
    for v_deneme in 1..6 loop
      v_bot := public.bot_sec(v_me);
      exit when v_bot is not null and not (v_bot = any(v_liste));
      v_bot := null;
    end loop;
    if v_bot is null then
      -- Son çare: seviyeye bakmadan uygun bir gizli bot
      select p.id into v_bot from public.profiles p
       where p.is_bot and coalesce(p.bot_aktif, true) and p.bot_turu = 'gizli'
         and p.id <> all(v_liste)
       order by random() limit 1;
    end if;
    if v_bot is null then
      raise exception 'Şu an uygun oyuncu yok, birazdan tekrar dene.';
    end if;
    perform public.bot_kisilik_tohumla(v_bot);
    v_liste := array_append(v_liste, v_bot);
  end loop;

  perform public.mac_kotasi_kontrol();
  v_id := public.grup_kur_kuyruktan(array_prepend(v_me, v_liste), p_kategori);
  delete from public.grup_kuyrugu where user_id = v_me or user_id = any(v_liste);
  return v_id;
end;
$function$;
