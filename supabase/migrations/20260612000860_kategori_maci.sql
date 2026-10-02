-- 860 — KATEGORİYE GÖRE MAÇ (Klasik + Saf Bilgi; Düello HARİÇ) — Ida, 2 Eki 2026
--
-- Oyuncu OYNA'dan önce bir kategori seçer (10 kategori + "Karışık" = kategori seçilmedi).
-- Kategori seçilirse maçın BÜTÜN soruları o kategoriden gelir.
--
-- Var olan parçalar yeniden kullanılır (yeni kuyruk / yeni tablo YOK):
--   • matchmaking_queue.kategori + kuyruga_gir / quick_match (048'den beri kategori taşıyor)
--   • profiles.tercih_kategori + tercih_kategori_kaydet (son seçim hatırlanır)
--   • get_categories (seçim listesi), soru_sec (soru seçimi), 370 bot süresi (eslesme_bot_hazir)
--
-- Değişen kurallar:
--   1) Eşleşme havuzu kategoriye göre AYRILIR: yalnız aynı kategoriyi seçenler eşleşir. Eskiden
--      20 sn bekleyen rakip kategorisine bakılmadan alınıyor (kuyruga_gir 2. adım) ve quick_match
--      kategoriye hiç bakmıyordu. "Karışık" seçen eski havuzda kalır (Karışık ↔ Karışık, aynı kurallar).
--   2) Bekleme süresi dolunca mevcut gizli bot yedeği (370) aynı kategoride maç kurar.
--   3) Kategori sunucuda doğrulanır: rekabetçi havuzda en az `kategori_mac_min_soru` soru yoksa
--      o kategori seçilemez (kayıt da, arama da reddedilir).
--   4) Kategorili maçta soru_sec kategoriyi gevşetip karışığa düşerse maç KURULMAZ
--      (kategori_mac_soru_sec denetler) — soru_sec'in kendisine dokunulmadı.
--   5) p_kategori boşsa artık profildeki tercih_kategori'ye DÜŞÜLMEZ: boş = Karışık. İstemci seçimi
--      açıkça gönderir; aksi hâlde "Karışık" seçen oyuncu eski kayıtlı kategorisinde maça giriyordu
--      (aynı düzeltme Antrenman'da: hemen_bot_mac_sec).
-- Lig puanı / coin / XP kuralları DEĞİŞMEDİ (mac_sonuclandir'a dokunulmadı).

insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('kategori_mac_min_soru', '60'::jsonb,
        'Kategoriye göre maç (860): bir kategorinin Klasik/Saf Bilgi''de seçilebilmesi için rekabetçi havuzda (oyuncunun dili + soru kapsamı) gereken en az soru sayısı. Taban 20 (bir maçın soru sayısı).')
on conflict (anahtar) do nothing;

-- ───── 1) Kategorinin bu oyuncu(lar) için rekabetçi havuzu ─────
-- soru_sec ile AYNI süzgeç: aktif · şüpheli/denetlenmemiş hariç · herkesin dilinde okunur ·
-- biri Türkiye dışıysa yalnız global (ve 652 asgari havuzu). Serbest Klasik'in gevşek havuzu
-- sayılmaz (ihtiyatlı taraf).
create or replace function public.kategori_mac_havuzu(p_kategori text, p_oyuncular uuid[])
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_oyn uuid[] := coalesce(p_oyuncular, '{}'::uuid[]);
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(coalesce(p_oyuncular, '{}'::uuid[]));
  v_supheli_haric boolean := public.soru_supheli_haric_mi();
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  v_diller text[];
  v_n int;
begin
  if p_kategori is null or p_kategori in ('genel', 'karisik') then return 0; end if;
  -- soru_sec bu durumda kategoriyi yok sayar (652) → kategorili maç kurulamaz
  if v_evrensel and not public.kategori_evrensel_yeterli(p_kategori) then return 0; end if;

  select coalesce(array_agg(distinct coalesce(nullif(btrim(pr.dil), ''), 'tr')), array['tr'])
    into v_diller
    from public.profiles pr
   where pr.id = any(v_oyn);
  if coalesce(array_length(v_diller, 1), 0) = 0 then v_diller := array['tr']; end if;

  select count(*)::int into v_n
    from public.questions q
   where q.aktif
     and q.kategori = p_kategori
     and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik)
     and (not v_evrensel or q.kapsam = 'global')
     and not exists (
       select 1 from unnest(v_diller) d
        where d <> q.dil
          and not exists (
            select 1 from public.question_translations t
             where t.question_id = q.id and t.dil = d and not t.eskidi
          )
     );
  return coalesce(v_n, 0);
end $$;

create or replace function public.kategori_mac_uygun_mu(p_kategori text, p_oyuncular uuid[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kategori_mac_havuzu(p_kategori, p_oyuncular)
         >= greatest(20, coalesce(public.ayar_sayi('kategori_mac_min_soru', 60), 60)::int);
$$;

-- ───── 2) Maç soruları: kategori verildiyse 20 sorunun HEPSİ o kategoriden; değilse NULL ─────
-- Karışık'ta (p_kategori null) soru_sec'in sonucu aynen döner (eski davranış).
create or replace function public.kategori_mac_soru_sec(p_kategori text, p_oyuncular uuid[], p_serbest boolean)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  v_ids := public.soru_sec(p_kategori, 20, p_oyuncular, p_serbest_klasik => coalesce(p_serbest, false));
  if p_kategori is null then return v_ids; end if;
  if coalesce(array_length(v_ids, 1), 0) < 20
     or exists (select 1 from public.questions q
                 where q.id = any(v_ids) and q.kategori is distinct from p_kategori) then
    return null;
  end if;
  return v_ids;
end $$;

-- ───── 3) İstemci: seçilebilir kategoriler (liste get_categories'ten gelir; bu yalnız kapıyı söyler) ─────
create or replace function public.kategori_mac_uygunlar()
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_liste text[] := '{}'::text[];
  v_kat text;
begin
  if auth.uid() is null then return v_liste; end if;
  -- Döngü bilerek: tek sorguda yazılınca süzgeç DISTINCT'in altına iniyor ve havuz sayımı
  -- kategori başına değil SORU başına çalışıyordu (prova ölçümü: 22 sn → döngüyle ~1 sn altı).
  for v_kat in
    select distinct q.kategori
      from public.questions q
     where q.aktif and q.kategori not in ('genel', 'karisik')
     order by 1
  loop
    if public.kategori_mac_uygun_mu(v_kat, array[auth.uid()]) then
      v_liste := array_append(v_liste, v_kat);
    end if;
  end loop;
  return v_liste;
end $$;

revoke all on function public.kategori_mac_havuzu(text, uuid[]) from public, anon, authenticated;
revoke all on function public.kategori_mac_uygun_mu(text, uuid[]) from public, anon, authenticated;
revoke all on function public.kategori_mac_soru_sec(text, uuid[], boolean) from public, anon, authenticated;
revoke execute on function public.kategori_mac_uygunlar() from public, anon;
grant execute on function public.kategori_mac_uygunlar() to authenticated;

-- ───── 4) Tercih kaydı: yeterli sorusu olmayan kategori kaydedilemez ─────
create or replace function public.tercih_kategori_kaydet(p_kategori text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kat text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  v_kat := nullif(btrim(coalesce(p_kategori, '')), '');

  if v_kat in ('genel', 'karisik') then
    v_kat := 'genel_kultur';           -- eski anahtarlar birleştirildi
  end if;

  if v_kat is not null
     and not exists (
       select 1 from public.questions q
       where q.aktif and q.kategori = v_kat and q.kategori not in ('genel','karisik')
     )
  then
    raise exception 'Geçersiz kategori';
  end if;

  -- 860: seçilebilirlik sunucuda (rekabetçi havuzda yeterli soru)
  if v_kat is not null and not public.kategori_mac_uygun_mu(v_kat, array[auth.uid()]) then
    raise exception 'Bu kategoride yeterli soru yok. Başka bir kategori seç.';
  end if;

  update public.profiles set tercih_kategori = v_kat where id = auth.uid();
end;
$$;

-- ───── 5) kuyruga_gir: havuz kategoriye göre ayrılır, sorular kategoriden ─────
create or replace function public.kuyruga_gir(p_kategori text default null::text, p_dereceli boolean default true, p_jokersiz boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- ───── 6) quick_match: gerçek oyuncu yalnız aynı kategoriden; bot yedeği aynı kategoride ─────
create or replace function public.quick_match(p_kategori text default null::text, p_dereceli boolean default true, p_jokersiz boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- ───── 7) Antrenman (açık bot): "Karışık" seçilince kayıtlı tercihe düşmesin ─────
create or replace function public.hemen_bot_mac_sec(p_bot uuid, p_kategori text default null::text, p_dereceli boolean default true, p_jokersiz boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kat text;
begin
  -- 440 (Ida, 24 Eyl 2026): açık botla antrenman her zaman serbest; botla lig puanı kasılamaz.
  if exists (select 1 from public.profiles b where b.id = p_bot and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
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

  -- 860: boş ya da 'karisik' = Karışık. Profildeki tercihe düşülmez (tercih artık OYNA
  -- penceresinin son seçimidir; Antrenman kendi kategori adımını gönderir).
  v_kat := nullif(nullif(btrim(coalesce(p_kategori, '')), ''), 'karisik');

  delete from public.matchmaking_queue where user_id = auth.uid();

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), p_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()], p_serbest_klasik => not coalesce(p_dereceli, true)),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;

  return v_id;
end;
$$;
