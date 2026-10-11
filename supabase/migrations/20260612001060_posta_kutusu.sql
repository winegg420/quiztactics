-- ============================================================
-- 1060 · POSTA KUTUSU — yönetimden oyunculara posta + ödül (Ida onaylı, 11 Eki 2026)
--
-- Bildirim zili paneli posta kutusu olur. Üç tür:
--   bilgi   = mevcut `bildirimler` satırları (değişmedi)
--   odullu  = "Quiz Tactics"ten ödüllü posta (en az bir ödül kalemi)
--   duyuru  = herkese / lige; ödüllü ya da ödülsüz
-- Herkese / lige giden posta TEK satırdır; oyuncu başına satır (posta_durum) yalnız okuyunca ya da
-- alınca yazılır. Bitiş tarihi geçen ya da "Bitir"ilen posta listeden kalkar, ödülü alınamaz.
-- Ödül tek seferdir: (posta, oyuncu) birincil anahtar + FOR UPDATE. Botlara posta gitmez.
-- Bütün okuma/yazma security definer RPC ile; tablolar RLS açık, istemciye doğrudan yetki yok.
-- Gönderim yalnız sahip hesap (sahip_mi()).
-- ============================================================

create table if not exists public.posta (
  id            uuid primary key default gen_random_uuid(),
  tur           text not null check (tur in ('odullu', 'duyuru')),
  hedef         text not null check (hedef in ('oyuncu', 'herkes', 'lig')),
  hedef_oyuncu  uuid references public.profiles(id) on delete cascade,
  hedef_lig     text check (hedef_lig is null or hedef_lig in ('bronz', 'gumus', 'altin', 'elmas', 'efsane')),
  baslik_tr     text not null check (char_length(btrim(baslik_tr)) between 1 and 80),
  baslik_en     text check (baslik_en is null or char_length(baslik_en) <= 80),
  metin_tr      text not null check (char_length(btrim(metin_tr)) between 1 and 1000),
  metin_en      text check (metin_en is null or char_length(metin_en) <= 1000),
  oduller       jsonb not null default '[]'::jsonb check (jsonb_typeof(oduller) = 'array' and jsonb_array_length(oduller) <= 8),
  gonderen      uuid references auth.users(id) on delete set null,
  bitis         timestamptz not null,
  bitirildi     timestamptz,
  olusturuldu   timestamptz not null default now(),
  constraint posta_hedef_oyuncu check ((hedef = 'oyuncu') = (hedef_oyuncu is not null)),
  constraint posta_hedef_lig check ((hedef = 'lig') = (hedef_lig is not null)),
  constraint posta_odullu_kalem check (tur <> 'odullu' or jsonb_array_length(oduller) > 0),
  constraint posta_duyuru_genel check (tur <> 'duyuru' or hedef <> 'oyuncu')
);
create index if not exists posta_aktif_idx on public.posta (bitis) where bitirildi is null;
create index if not exists posta_oyuncu_idx on public.posta (hedef_oyuncu) where hedef_oyuncu is not null;

alter table public.posta enable row level security;
revoke all on public.posta from public, anon, authenticated;

create table if not exists public.posta_durum (
  posta_id  uuid not null references public.posta(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  okundu    timestamptz,
  alindi    timestamptz,
  verilen   jsonb,
  primary key (posta_id, user_id)
);
create index if not exists posta_durum_oyuncu_idx on public.posta_durum (user_id);

alter table public.posta_durum enable row level security;
revoke all on public.posta_durum from public, anon, authenticated;

-- Posta ödülü coin defterinde tek seferdir (aynı posta, aynı oyuncu).
create unique index if not exists coin_hareketleri_posta_odul_tek
  on public.coin_hareketleri (user_id, tur, referans)
  where tur = 'posta_odul' and referans is not null;

-- coin_ekle: 'posta_odul' günlük coin tavanına takılmaz (yönetimin verdiği tek seferlik ödül).
-- Gövde canlıdaki tanımla aynı; yalnız muaf tür listesine 'posta_odul' eklendi.
create or replace function public.coin_ekle(p_user uuid, p_miktar bigint, p_tur text, p_referans text default null::text)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_bakiye bigint;
  v_bot boolean;
  v_miktar bigint := p_miktar;
  v_kalan bigint;
begin
  if p_user is null or coalesce(p_miktar, 0) <= 0 then return null; end if;

  select coalesce(is_bot, false) into v_bot from public.profiles where id = p_user;
  if coalesce(v_bot, false) then return null; end if;

  -- 'davet' tek seferlik hoş geldin ödülü: günlük tavana takılmaz (Paket 14, 3.4)
  -- 'seviye' level/rütbe atlama ödülü: tek seferlik kilometre taşı, tavana takılmaz (P2A)
  -- 'rozet' rozet ödülü: aynı rozet bir kez, tavana takılmaz (333)
  -- 'sezon_yolu' Sezon Yolu yuva ödülü: her yuva bir kez, tavana takılmaz (720)
  -- 'posta_odul' yönetim postası ödülü: posta başına bir kez, tavana takılmaz (1060)
  if p_tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'davet', 'seviye', 'rozet', 'sezon_yolu', 'posta_odul') then
    v_kalan := public.coin_gunluk_kalan(p_user);
    v_miktar := least(v_miktar, v_kalan);
    if v_miktar <= 0 then
      -- Paket 20 I.3: günlük coin tavanı doldu → dökümde görünsün
      perform public.odul_kalem_yaz(p_user, public.odul_kalem_adi(p_tur, p_referans), 0, 0,
        jsonb_build_object('tavan', true, 'istenen', p_miktar));
      return (select coin from public.profiles where id = p_user);
    end if;
  end if;

  perform set_config('app.coin_izin', '1', true);
  update public.profiles
     set coin = coin + v_miktar
   where id = p_user
  returning coin into v_bakiye;
  if v_bakiye is null then return null; end if;

  begin
    insert into public.coin_hareketleri (user_id, miktar, tur, referans, bakiye_sonra)
    values (p_user, v_miktar, p_tur, p_referans, v_bakiye);
  exception when unique_violation then
    update public.profiles set coin = coin - v_miktar where id = p_user
    returning coin into v_bakiye;
    return v_bakiye;
  end;

  -- Paket 20 I.3: maç sonu dökümü için kalem (bağlam yoksa yazılmaz)
  perform public.odul_kalem_yaz(p_user, public.odul_kalem_adi(p_tur, p_referans), 0, v_miktar::int,
    case when v_miktar < p_miktar then jsonb_build_object('tavan', true, 'istenen', p_miktar) else '{}'::jsonb end
    || case when p_tur = 'turnuva' and p_referans like 'derece:%'
            then jsonb_build_object('sira', split_part(p_referans, ':', 3)::int) else '{}'::jsonb end);
  return v_bakiye;
end;
$function$;

-- İç yardımcı: posta bu oyuncuya görünür mü (bitmemiş, süresi geçmemiş, hedefte).
create or replace function public.posta_gorunur(p public.posta, p_uid uuid, p_lig text)
returns boolean
language sql
stable
set search_path = public
as $$
  select p.bitirildi is null
     and p.bitis > now()
     and case p.hedef
           when 'herkes' then true
           when 'lig'    then p.hedef_lig = p_lig
           when 'oyuncu' then p.hedef_oyuncu = p_uid
           else false
         end;
$$;
revoke execute on function public.posta_gorunur(public.posta, uuid, text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- OYUNCU: posta kutusu (panel açılışında TEK çağrı: bildirimler + postalar)
-- ------------------------------------------------------------
create or replace function public.posta_kutusu()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lig text;
  v_bot boolean;
begin
  if v_uid is null then raise exception 'Giriş gerekli'; end if;
  select lig, coalesce(is_bot, false) into v_lig, v_bot from public.profiles where id = v_uid;

  return jsonb_build_object(
    'bildirimler', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.created_at desc)
        from (select id, tip, metin, yol, okundu, created_at
                from public.bildirimler
               where user_id = v_uid
               order by created_at desc
               limit 30) b), '[]'::jsonb),
    'postalar', case when coalesce(v_bot, true) then '[]'::jsonb else coalesce((
      select jsonb_agg(to_jsonb(x) order by x.bekleyen desc, x.olusturuldu desc)
        from (select p.id, p.tur, p.baslik_tr, p.baslik_en, p.metin_tr, p.metin_en, p.oduller,
                     p.bitis, p.olusturuldu,
                     (d.okundu is not null) as okundu,
                     d.alindi, d.verilen,
                     (jsonb_array_length(p.oduller) > 0 and d.alindi is null) as bekleyen
                from public.posta p
                left join public.posta_durum d on d.posta_id = p.id and d.user_id = v_uid
               where public.posta_gorunur(p, v_uid, v_lig)
               order by (jsonb_array_length(p.oduller) > 0 and d.alindi is null) desc, p.olusturuldu desc
               limit 30) x), '[]'::jsonb) end
  );
end;
$$;
revoke execute on function public.posta_kutusu() from public, anon;
grant execute on function public.posta_kutusu() to authenticated;

-- Paneli açınca: bildirimler okundu (bildirimleri_oku) + görünür postalar okundu (satır yalnız burada açılır).
create or replace function public.posta_kutusu_oku()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lig text;
  v_bot boolean;
begin
  if v_uid is null then raise exception 'Giriş gerekli'; end if;
  perform public.bildirimleri_oku();
  select lig, coalesce(is_bot, false) into v_lig, v_bot from public.profiles where id = v_uid;
  if coalesce(v_bot, true) then return; end if;

  insert into public.posta_durum (posta_id, user_id, okundu)
  select p.id, v_uid, now()
    from public.posta p
   where public.posta_gorunur(p, v_uid, v_lig)
     and not exists (select 1 from public.posta_durum d
                      where d.posta_id = p.id and d.user_id = v_uid and d.okundu is not null)
  on conflict (posta_id, user_id) do update
     set okundu = excluded.okundu
   where public.posta_durum.okundu is null;
end;
$$;
revoke execute on function public.posta_kutusu_oku() from public, anon;
grant execute on function public.posta_kutusu_oku() to authenticated;

-- Ödülü al: tek seferlik. (posta, oyuncu) satırı FOR UPDATE ile kilitlenir; ikinci çağrı "zaten aldın" alır.
create or replace function public.posta_odul_al(p_posta uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lig text;
  v_bot boolean;
  v_p public.posta%rowtype;
  v_d public.posta_durum%rowtype;
  v_k jsonb;
  v_ver jsonb := '[]'::jsonb;
  v_ref text;
  v_n integer;
begin
  if v_uid is null then raise exception 'Giriş gerekli'; end if;
  select lig, coalesce(is_bot, false) into v_lig, v_bot from public.profiles where id = v_uid;
  if coalesce(v_bot, true) then raise exception 'Posta bulunamadı'; end if;

  -- FOR SHARE: alma sürerken "Bitir" bekler; bitmiş posta burada yakalanır.
  select * into v_p from public.posta where id = p_posta for share;
  if not found then raise exception 'Posta bulunamadı'; end if;
  if not (case v_p.hedef when 'herkes' then true
                         when 'lig' then v_p.hedef_lig = v_lig
                         when 'oyuncu' then v_p.hedef_oyuncu = v_uid
                         else false end) then
    raise exception 'Posta bulunamadı';
  end if;
  if v_p.bitirildi is not null or v_p.bitis <= now() then
    raise exception 'Bu postanın süresi doldu';
  end if;
  if jsonb_array_length(v_p.oduller) = 0 then raise exception 'Bu postada ödül yok'; end if;

  insert into public.posta_durum (posta_id, user_id, okundu)
  values (v_p.id, v_uid, now())
  on conflict (posta_id, user_id) do nothing;
  select * into v_d from public.posta_durum
   where posta_id = v_p.id and user_id = v_uid
   for update;
  if v_d.alindi is not null then raise exception 'Bu ödülü zaten aldın'; end if;

  v_ref := 'posta:' || v_p.id::text;
  for v_k in select value from jsonb_array_elements(v_p.oduller) loop
    case v_k->>'tur'
      when 'coin' then
        perform public.coin_ekle(v_uid, (v_k->>'miktar')::bigint, 'posta_odul', v_ref);
        v_ver := v_ver || jsonb_build_array(v_k || '{"zaten_sende":false}'::jsonb);
      when 'elmas' then
        perform public.elmas_ekle(v_uid, (v_k->>'miktar')::integer, 'posta_odul', v_ref);
        v_ver := v_ver || jsonb_build_array(v_k || '{"zaten_sende":false}'::jsonb);
      when 'joker' then
        insert into public.joker_envanter (user_id, tur, adet)
        values (v_uid, v_k->>'anahtar', (v_k->>'miktar')::integer)
        on conflict (user_id, tur) do update set adet = public.joker_envanter.adet + excluded.adet;
        insert into public.joker_islemleri (user_id, tur, delta, kaynak, ref)
        values (v_uid, v_k->>'anahtar', (v_k->>'miktar')::integer, 'hediye', v_ref);
        v_ver := v_ver || jsonb_build_array(v_k || '{"zaten_sende":false}'::jsonb);
      when 'avatar' then
        insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
        values (v_uid, v_k->>'anahtar', 'hediye')
        on conflict (user_id, avatar) do nothing;
        get diagnostics v_n = row_count;
        v_ver := v_ver || jsonb_build_array(v_k || jsonb_build_object('zaten_sende', v_n = 0));
      else
        null;
    end case;
  end loop;

  update public.posta_durum
     set alindi = now(), verilen = v_ver, okundu = coalesce(okundu, now())
   where posta_id = v_p.id and user_id = v_uid;

  return jsonb_build_object('verilen', v_ver);
end;
$$;
revoke execute on function public.posta_odul_al(uuid) from public, anon;
grant execute on function public.posta_odul_al(uuid) to authenticated;

-- ------------------------------------------------------------
-- YÖNETİM (yalnız sahip_mi())
-- ------------------------------------------------------------
create or replace function public.posta_oyuncu_ara(p_q text)
returns table (id uuid, ad text, kullanici_adi text, lig text, avatar_url text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := btrim(coalesce(p_q, ''));
  v_desen text;
begin
  if not public.sahip_mi() then raise exception 'Yetkin yok'; end if;
  if char_length(v_q) < 2 then return; end if;
  v_desen := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
    select pr.id, coalesce(pr.takma_ad, pr.gorunen_ad, pr.username), pr.username, pr.lig, pr.avatar_url
      from public.profiles pr
     where not coalesce(pr.is_bot, false)
       and (pr.takma_ad ilike v_desen or pr.username ilike v_desen or pr.gorunen_ad ilike v_desen)
     order by (lower(coalesce(pr.takma_ad, pr.username)) = lower(v_q)) desc, pr.takma_ad nulls last, pr.username
     limit 8;
end;
$$;
revoke execute on function public.posta_oyuncu_ara(text) from public, anon;
grant execute on function public.posta_oyuncu_ara(text) to authenticated;

create or replace function public.posta_gonder(
  p_tur text, p_hedef text, p_hedef_oyuncu uuid, p_hedef_lig text,
  p_baslik_tr text, p_baslik_en text, p_metin_tr text, p_metin_en text,
  p_oduller jsonb, p_bitis timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_k jsonb;
  v_temiz jsonb := '[]'::jsonb;
  v_tur text;
  v_miktar bigint;
  v_av record;
  v_id uuid;
  v_jokerler text[] := array['elli', 'sure', 'pas', 'seri_koruma', 'soru_degistir', 'zaman_baskisi',
    'saldiri_degistir', 'savunma_kilidi', 'sis', 'sigorta', 'cifte_puan', 'ikinci_sans', 'baskin', 'kalkan'];
begin
  if not public.sahip_mi() then raise exception 'Yetkin yok'; end if;
  if p_tur not in ('odullu', 'duyuru') then raise exception 'Geçersiz posta türü'; end if;
  if p_hedef not in ('oyuncu', 'herkes', 'lig') then raise exception 'Geçersiz hedef'; end if;
  if p_tur = 'duyuru' and p_hedef = 'oyuncu' then raise exception 'Duyuru herkese ya da bir lige gider'; end if;
  if p_hedef = 'oyuncu' and not exists (
       select 1 from public.profiles where id = p_hedef_oyuncu and not coalesce(is_bot, false)) then
    raise exception 'Oyuncu bulunamadı';
  end if;
  if p_hedef = 'lig' and coalesce(p_hedef_lig, '') not in ('bronz', 'gumus', 'altin', 'elmas', 'efsane') then
    raise exception 'Geçersiz lig';
  end if;
  if char_length(btrim(coalesce(p_baslik_tr, ''))) = 0 or char_length(btrim(coalesce(p_metin_tr, ''))) = 0 then
    raise exception 'Türkçe başlık ve metin gerekli';
  end if;
  if p_bitis is null or p_bitis <= now() + interval '5 minutes' or p_bitis > now() + interval '90 days' then
    raise exception 'Bitiş tarihi geçersiz';
  end if;
  if p_oduller is null then p_oduller := '[]'::jsonb; end if;
  if jsonb_typeof(p_oduller) <> 'array' or jsonb_array_length(p_oduller) > 8 then
    raise exception 'Ödül listesi geçersiz';
  end if;

  for v_k in select value from jsonb_array_elements(p_oduller) loop
    v_tur := v_k->>'tur';
    if v_tur = 'avatar' then
      select anahtar, url, ad_tr, ad_en, nadirlik into v_av
        from public.avatar_katalogu where anahtar = v_k->>'anahtar' and aktif;
      if not found then raise exception 'Avatar bulunamadı'; end if;
      v_temiz := v_temiz || jsonb_build_array(jsonb_build_object(
        'tur', 'avatar', 'anahtar', v_av.anahtar, 'miktar', 1, 'url', v_av.url,
        'ad_tr', v_av.ad_tr, 'ad_en', v_av.ad_en, 'nadirlik', v_av.nadirlik));
    elsif v_tur in ('coin', 'elmas', 'joker') then
      begin
        v_miktar := (v_k->>'miktar')::bigint;
      exception when others then raise exception 'Ödül miktarı geçersiz';
      end;
      if v_miktar is null or v_miktar < 1
         or (v_tur = 'coin' and v_miktar > 100000)
         or (v_tur = 'elmas' and v_miktar > 10000)
         or (v_tur = 'joker' and v_miktar > 100) then
        raise exception 'Ödül miktarı geçersiz';
      end if;
      if v_tur = 'joker' then
        if not (coalesce(v_k->>'anahtar', '') = any (v_jokerler)) then raise exception 'Joker türü geçersiz'; end if;
        v_temiz := v_temiz || jsonb_build_array(jsonb_build_object('tur', 'joker', 'anahtar', v_k->>'anahtar', 'miktar', v_miktar));
      else
        v_temiz := v_temiz || jsonb_build_array(jsonb_build_object('tur', v_tur, 'miktar', v_miktar));
      end if;
    else
      raise exception 'Ödül türü geçersiz';
    end if;
  end loop;

  -- Aynı kalem iki kez olmaz (coin/elmas defteri posta başına tek satır).
  if (select count(*) from jsonb_array_elements(v_temiz)) <>
     (select count(distinct (e->>'tur') || ':' || coalesce(e->>'anahtar', '')) from jsonb_array_elements(v_temiz) e) then
    raise exception 'Aynı ödül iki kez eklenmiş';
  end if;
  if p_tur = 'odullu' and jsonb_array_length(v_temiz) = 0 then
    raise exception 'Ödüllü postada en az bir ödül olmalı';
  end if;

  insert into public.posta (tur, hedef, hedef_oyuncu, hedef_lig, baslik_tr, baslik_en, metin_tr, metin_en,
                            oduller, gonderen, bitis)
  values (p_tur, p_hedef,
          case when p_hedef = 'oyuncu' then p_hedef_oyuncu end,
          case when p_hedef = 'lig' then p_hedef_lig end,
          btrim(p_baslik_tr), nullif(btrim(coalesce(p_baslik_en, '')), ''),
          btrim(p_metin_tr), nullif(btrim(coalesce(p_metin_en, '')), ''),
          v_temiz, auth.uid(), p_bitis)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.posta_gonder(text, text, uuid, text, text, text, text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.posta_gonder(text, text, uuid, text, text, text, text, text, jsonb, timestamptz) to authenticated;

create or replace function public.posta_gonderilenler()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.sahip_mi() then raise exception 'Yetkin yok'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.olusturuldu desc)
      from (select p.id, p.tur, p.hedef, p.hedef_lig, p.baslik_tr, p.oduller, p.bitis, p.bitirildi, p.olusturuldu,
                   (select coalesce(pr.takma_ad, pr.gorunen_ad, pr.username) from public.profiles pr where pr.id = p.hedef_oyuncu) as hedef_ad,
                   (select count(*) from public.posta_durum d where d.posta_id = p.id and d.okundu is not null) as okuyan,
                   (select count(*) from public.posta_durum d where d.posta_id = p.id and d.alindi is not null) as alan
              from public.posta p
             order by p.olusturuldu desc
             limit 30) x), '[]'::jsonb);
end;
$$;
revoke execute on function public.posta_gonderilenler() from public, anon;
grant execute on function public.posta_gonderilenler() to authenticated;

create or replace function public.posta_bitir(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sahip_mi() then raise exception 'Yetkin yok'; end if;
  update public.posta set bitirildi = now() where id = p_id and bitirildi is null;
  if not found and not exists (select 1 from public.posta where id = p_id) then
    raise exception 'Posta bulunamadı';
  end if;
end;
$$;
revoke execute on function public.posta_bitir(uuid) from public, anon;
grant execute on function public.posta_bitir(uuid) to authenticated;
