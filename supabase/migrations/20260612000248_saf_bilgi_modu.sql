-- Paket 31 B — Üçüncü mod: SAF BİLGİ (jokersiz Klasik Mod). Sahibinin kararı, 18 Eyl 2026.
--
-- Yeni maç türü DEĞİL, bayrak: matches.jokersiz. Eşleştirme, puanlama, bot ve bütün
-- mevcut akış aynı kalır. Ödül Klasik Mod ile AYNI (mac_sonuclandir değişmedi).
--   * joker_hak_kontrol ve eski use_joker: jokersiz maçta her joker reddedilir
--   * kuyruk: matchmaking_queue.jokersiz — jokerli ve jokersiz oyuncu eşleşmez
--   * bot jokeri (bot_klasik_joker_tik): jokersiz maçta çalışmaz
--   * rövanş aynı modda açılır
--
-- İMZA DEĞİŞİYOR (p_jokersiz eklendi). Paket 30 A'da create_challenge'ın iki imzası
-- PostgREST'te HTTP 300 üretmişti — aynı hatayı tekrarlamamak için ESKİ imza önce DÜŞER,
-- yeni imza varsayılanlıyla kurulur. Eski istemci (p_jokersiz göndermeyen) yine çalışır.
--
-- ÖLÇÜLDÜ (kuyruk bölünmesi riski): son 30 günde 50 Klasik maç — 33 botlu, 17 arkadaş,
-- insan–insan rastgele eşleşme 0. Her rastgele arama zaten bekleme süresi sonunda bota
-- düşüyor; bayrak bugün bekleme süresini ve bot oranını fiilen değiştirmez.

alter table public.matches add column if not exists jokersiz boolean not null default false;
alter table public.matchmaking_queue add column if not exists jokersiz boolean not null default false;

drop function if exists public.kuyruga_gir(text, boolean);
drop function if exists public.quick_match(text, boolean);
drop function if exists public.hemen_bot_mac(text, boolean);
drop function if exists public.hemen_bot_mac_sec(uuid, text, boolean);
drop function if exists public.create_challenge(uuid, text, boolean);

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
  select coalesce(extract(epoch from (now() - q.created_at))::int, 0)
    into v_bekleme
    from public.matchmaking_queue q where q.user_id = auth.uid();
  v_bekleme := coalesce(v_bekleme, 0);

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
      public.soru_sec(v_secilen_kat, 20, array[auth.uid(), v_rakip]),
      0, now(), p_dereceli, coalesce(p_jokersiz, false)
    )
    returning id into v_id;
    return v_id;
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
$function$


;

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
      public.soru_sec(v_kat, 20, array[auth.uid(), v_rakip]),
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

  if now() < v_arama_bas + public.bot_eslesme_gecikmesi(auth.uid(), v_arama_bas) * interval '1 second' then
    return null;                     -- hâlâ aranıyor
  end if;

  delete from public.matchmaking_queue where user_id = auth.uid();

  -- Bot: bant + lig sınırı + tekrar engeli (bkz. bot_sec).
  v_bot := public.bot_sec(auth.uid());

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), v_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()]),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;
  return v_id;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.hemen_bot_mac(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_bot uuid;
  v_kat text;
  v_lig int;
begin
  perform public.hiz_siniri('hemen_bot_mac', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  -- Zaten aktif maçı varsa oraya döndür (çift maç açılmasın).
  select m.id into v_id from public.matches m
   where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
   limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  perform public.mac_kotasi_kontrol();

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );

  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig
    from public.profiles where id = auth.uid();
  v_lig := coalesce(v_lig, 1);

  -- Seviyesi en yakın AÇIK bot. Eşitlikte rastgele: hep aynı bot gelmesin.
  select p.id into v_bot
    from public.profiles p
   where p.is_bot and coalesce(p.bot_aktif, true)
     and coalesce(p.bot_turu, 'acik') = 'acik'
   order by abs(public.lig_sirasi(coalesce(p.lig, 'bronz')) - v_lig), random()
   limit 1;

  -- Açık bot havuzu boşsa oyuncu düğmeye bassın da bir şey olsun:
  -- gizli bot seçicisine düşülür (mevcut mantık, yeni algoritma değil).
  if v_bot is null then
    v_bot := public.bot_sec(auth.uid());
  end if;
  if v_bot is null then
    raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.';
  end if;

  delete from public.matchmaking_queue where user_id = auth.uid();

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), v_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()]),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;

  return v_id;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.hemen_bot_mac_sec(p_bot uuid, p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_kat text;
begin
  perform public.hiz_siniri('hemen_bot_mac', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  -- Zaten aktif maçı varsa oraya döndür (çift maç açılmasın).
  select m.id into v_id from public.matches m
   where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
   limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  -- Seçilen kimlik gerçekten açık ve aktif bir bot mu? (istemciye güvenme)
  if not exists (
    select 1 from public.profiles p
     where p.id = p_bot and p.is_bot and coalesce(p.bot_aktif, true)
       and public.acik_bot_mu(p.is_bot, p.bot_turu)
  ) then
    raise exception 'Bu bot şu an oynanamıyor.';
  end if;

  perform public.mac_kotasi_kontrol();

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );

  delete from public.matchmaking_queue where user_id = auth.uid();

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), p_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()]),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;

  return v_id;
end;
$function$


;

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
$function$


;

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
  -- ESKİDEN: her bot için anında başlıyordu. Artık yalnız AÇIK bot.
  select coalesce(is_bot, false) and coalesce(bot_turu, 'acik') = 'acik'
    into v_acik_bot from public.profiles where id = v_rakip;

  if exists (
    select 1 from public.matches x
    where x.durum in ('bekliyor','aktif')
      and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me))
  ) then
    raise exception 'Bu oyuncuyla zaten devam eden bir maçın var';
  end if;

  perform public.mac_kotasi_kontrol();

  if coalesce(v_acik_bot, false) then
    -- Açık bot: rövanş anında başlar (oyuncu bot olduğunu biliyor).
    insert into public.matches (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, rovans, jokersiz)
    values (
      v_me, v_rakip, 'aktif', m.kategori,
      public.soru_sec(m.kategori, 20, array[v_me]),
      0, now(), true, coalesce(m.jokersiz, false)   -- Paket 31 B: rövanş aynı modda
    )
    returning id into v_id;
  else
    -- Gerçek oyuncu VE gizli bot: davet olarak açılır.
    -- Bildirimi trg_matches_davet_bildir yazar (tek kaynak); gizli botun
    -- kabulünü bot_oyna gecikmeyle yapar.
    insert into public.matches (oyuncu1, oyuncu2, kategori, rovans, jokersiz)
    values (v_me, v_rakip, m.kategori, true, coalesce(m.jokersiz, false))
    returning id into v_id;
  end if;

  return v_id;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.use_joker(p_match_id uuid, p_tip text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.matches%rowtype;
  q public.questions%rowtype;
  v_bedel int;
  v_kapali int[];
begin
  if p_tip not in ('elli', 'sure') then raise exception 'Geçersiz joker'; end if;
  v_bedel := case p_tip when 'elli' then 0 else 20 end;

  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if coalesce(m.jokersiz, false) then raise exception 'Bu modda joker kullanılamaz'; end if;   -- Paket 31 B
  if auth.uid() not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if m.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
  if now() > m.soru_baslangic + interval '16 seconds' then raise exception 'Süre doldu'; end if;
  if exists (
    select 1 from public.match_answers
    where match_id = p_match_id and user_id = auth.uid() and soru_index = m.aktif_soru
  ) then
    raise exception 'Bu soruyu zaten cevapladın';
  end if;

  if v_bedel > 0 and (select puan from public.profiles where id = auth.uid()) < v_bedel then
    raise exception 'Yetersiz puan (% gerekli)', v_bedel;
  end if;

  insert into public.match_jokers (match_id, user_id, tip, soru_index)
  values (p_match_id, auth.uid(), p_tip, m.aktif_soru);
  -- pk çakışırsa exception fırlar: maç başına her jokerden 1

  if v_bedel > 0 then
    update public.profiles set puan = puan - v_bedel where id = auth.uid();
  end if;

  if p_tip = 'elli' then
    select * into q from public.questions where id = m.soru_ids[m.aktif_soru + 1];
    select array_agg(x) into v_kapali from (
      select x from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 2
    ) s;
    return jsonb_build_object('kapali', to_jsonb(v_kapali));
  else
    update public.matches
       set soru_baslangic = soru_baslangic + interval '10 seconds'
     where id = p_match_id;
    return jsonb_build_object('uzatildi', true);
  end if;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
begin
  -- Paket 31 B: Saf Bilgi (jokersiz) maçta hiçbir joker yok
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m where m.id = p_mac_id and coalesce(m.jokersiz, false)
  ) then
    raise exception 'Bu modda joker kullanılamaz';
  end if;

  -- Paket 31 A.3: Klasik Mod Savunma Kilidi — rakip bu soruda kilitlediyse hiçbir joker yok
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m
      join public.joker_kullanimlari k
        on k.mac_tur = '1v1'
       and k.mac_id = m.id
       and k.soru_index = m.aktif_soru
       and k.tur = 'savunma_kilidi'
       and k.user_id <> v_me
     where m.id = p_mac_id and coalesce(m.senkron, false)
  ) then
    raise exception 'Rakibin savunma jokerlerini kilitledi';
  end if;

  -- AYNI JOKER MAÇ BAŞINA BİR KEZ (Paket 27 B.1.5)
  if exists (
    select 1 from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
  ) then
    raise exception 'Bu jokeri bu maçta zaten kullandın';
  end if;

  if p_mac_tur = 'duello' then
    v_sinir := public.ayar_sayi('duello_joker_hak', 4)::int;
  else
    v_sinir := public.joker_mac_siniri(p_mac_tur, p_mac_id);
  end if;

  if v_sinir = 0 then
    raise exception 'Turnuva finalinde joker kullanılamaz';
  end if;
  if v_sinir is null then
    return;                                        -- arkadaş maçı: sınırsız
  end if;

  select count(*) into v_kullanilan
    from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
  if v_kullanilan >= v_sinir then
    raise exception 'Bu maçta en fazla % joker kullanabilirsin', v_sinir;
  end if;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.bot_klasik_joker_tik()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_tur text;
begin
  if not pg_try_advisory_xact_lock(hashtext('bot_klasik_joker_tik')) then return; end if;
  for r in
    select m.id, m.aktif_soru as idx, p.id as bot_id,
           case when m.oyuncu1 = p.id then m.oyuncu2 else m.oyuncu1 end as insan_id
      from public.matches m
      join public.profiles p on p.is_bot and p.id in (m.oyuncu1, m.oyuncu2)
     where m.durum = 'aktif' and coalesce(m.senkron, false) and m.basladi
       and not coalesce(m.jokersiz, false)          -- Paket 31 B: Saf Bilgi'de bot da joker basmaz
       and m.duraklatildi_at is null
       and m.aktif_soru < coalesce(array_length(m.soru_ids, 1), 0)
       and now() >= m.soru_baslangic + make_interval(secs =>
             2 + 6 * public.bot_rasgele('kjz:' || m.id::text || ':' || m.aktif_soru))
       and now() <= m.soru_baslangic + interval '10 seconds'
       and public.bot_rasgele('kjok:' || m.id::text || ':' || m.aktif_soru) * 100
             < public.ayar_sayi('klasik_bot_joker_yuzde', 15)
     for update of m skip locked
  loop
    -- bu soruda bot zaten joker bastı mı / insan cevapladı mı / insan kilitledi mi
    continue when exists (select 1 from public.joker_kullanimlari k
                           where k.mac_tur = '1v1' and k.mac_id = r.id and k.soru_index = r.idx
                             and k.user_id = r.bot_id);
    continue when exists (select 1 from public.match_answers a
                           where a.match_id = r.id and a.soru_index = r.idx
                             and a.user_id in (r.insan_id, r.bot_id));
    continue when exists (select 1 from public.joker_kullanimlari k
                           where k.mac_tur = '1v1' and k.mac_id = r.id and k.soru_index = r.idx
                             and k.user_id = r.insan_id and k.tur = 'savunma_kilidi');
    continue when (select count(*) from public.joker_kullanimlari k
                    where k.mac_tur = '1v1' and k.mac_id = r.id and k.user_id = r.bot_id)
                  >= public.ayar_sayi('duello_joker_hak', 4);

    select t into v_tur
      from unnest(array['zaman_baskisi', 'savunma_kilidi', 'soru_degistir']) t
     where not exists (select 1 from public.joker_kullanimlari k
                        where k.mac_tur = '1v1' and k.mac_id = r.id
                          and k.user_id = r.bot_id and k.tur = t)
     order by public.bot_rasgele('kjt:' || r.id::text || ':' || r.idx || ':' || t)
     limit 1;
    continue when v_tur is null;

    insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
    values (r.bot_id, '1v1', r.id, r.idx, v_tur, true);

    if v_tur = 'soru_degistir' then
      perform public.mac_soru_degistir('1v1', r.id, r.bot_id, r.idx);
    end if;
    perform public.klasik_joker_etki(r.id, r.bot_id, r.idx, v_tur);
  end loop;
end;
$function$


;

-- Paket 26 A güvenlik kuralı: istemci RPC'leri yalnız authenticated.
revoke all on function public.kuyruga_gir(text, boolean, boolean) from public, anon;
grant execute on function public.kuyruga_gir(text, boolean, boolean) to authenticated;
revoke all on function public.quick_match(text, boolean, boolean) from public, anon;
grant execute on function public.quick_match(text, boolean, boolean) to authenticated;
revoke all on function public.hemen_bot_mac(text, boolean, boolean) from public, anon;
grant execute on function public.hemen_bot_mac(text, boolean, boolean) to authenticated;
revoke all on function public.hemen_bot_mac_sec(uuid, text, boolean, boolean) from public, anon;
grant execute on function public.hemen_bot_mac_sec(uuid, text, boolean, boolean) to authenticated;
revoke all on function public.create_challenge(uuid, text, boolean, boolean) from public, anon;
grant execute on function public.create_challenge(uuid, text, boolean, boolean) to authenticated;
