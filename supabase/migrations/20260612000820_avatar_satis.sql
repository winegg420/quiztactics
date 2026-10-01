-- ============================================================
-- 820 · AVATAR SATIŞI: Epik / Efsanevi avatar ELMASLA, Yaygın / Nadir ücretsiz (Ida, 1 Eki 2026)
--
-- Karar: oyun başında Yaygın ve Nadir avatarlar ücretsiz; Epik ve Efsanevi avatarlar dükkânda elmasla satılır
-- (Epik 150 · Efsanevi 300 — TEST, `oyun_ayarlari.elmas_avatar_<nadirlik>`; koda gömülü fiyat yok).
--
-- Tek kaynak `avatar_nitelikleri` (700): `edinme` = 'ucretsiz' → herkes seçer · 'elmas' → SAHİPLİK ister,
-- fiyat nadirlikten (`avatar_satis_fiyati`). Başka edinme türleri (battle_pass, turnuva…) de sahiplik ister, satılmaz.
-- Sahiplik mevcut tabloda: `oyuncu_avatarlari` (520). Yabancı anahtarı `avatar_katalogu`'ndan `avatar_nitelikleri`'ne
-- çevrilir: 31 hazır avatar katalogda DEĞİL ama 7'si Epik/Efsanevi (Korsan dahil); nitelik tablosu 70 avatarın hepsini
-- tutar ve katalog anahtarlarının üst kümesidir. Tablo canlıda boştu (0 satır).
--
-- Desen kozmetik_satin_al / aura_satin_al ile AYNI: security definer, yalnız authenticated, profil satırı FOR UPDATE,
-- çift alım reddi, bakiye `elmas_harca` (defter satırı `elmas_hareketleri`, tur 'avatar'), satış kapısı `kozmetik_satis_acik`.
--
-- GERİYE UYUMLULUK: takılı avatarı ücretli olan her İNSAN hesaba sahiplik satırı yazılır (kaynak 'hediye') → avatar
-- elinden alınmaz. Botların `profiles.avatar_url`'üne DOKUNULMAZ; botlar `avatar_onayla` çağırmaz, sahiplik satırı almaz.
-- Pasif avatarlar (avatar_katalogu.aktif = false) değişmez (edinme 'ucretsiz' kalır; zaten seçilemezler).
--
-- DEĞİŞMEZ: avatar_katalogu.nadirlik ve koleksiyon_kalemleri (Koleksiyon Puanı), avatar_katalogu_oyun, avatar_fiyati,
-- nadirlik değerleri (770), Kedili Genç (nadir → ücretsiz). Sahip (Ida) için AYRICALIK YOK: o da satın alır.
-- Tekrar çalıştırılabilir. Yıkıcı değil: satır silinmez, kolon düşmez.
-- ============================================================

-- ---------- 1. Fiyatlar (TEST) ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_avatar_epik', '150', 'TEST — Epik avatar fiyatı (elmas). 820.'),
  ('elmas_avatar_efsanevi', '300', 'TEST — Efsanevi avatar fiyatı (elmas). 820.')
on conflict (anahtar) do nothing;

-- ---------- 2. Edinme: aktif Epik / Efsanevi → elmas ----------
update public.avatar_nitelikleri n
   set edinme = 'elmas'
 where n.nadirlik in ('epik', 'efsanevi')
   and n.edinme = 'ucretsiz'
   and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif);

-- ---------- 3. Sahiplik tablosu: yabancı anahtar avatar_nitelikleri'ne (31 hazır avatar da sahiplenilebilsin) ----------
do $$
begin
  if exists (select 1 from public.oyuncu_avatarlari o
              where not exists (select 1 from public.avatar_nitelikleri n where n.anahtar = o.avatar)) then
    raise exception '820: oyuncu_avatarlari içinde avatar_nitelikleri''nde olmayan avatar var';
  end if;
  if exists (select 1 from pg_constraint c
              where c.conrelid = 'public.oyuncu_avatarlari'::regclass and c.conname = 'oyuncu_avatarlari_avatar_fkey'
                and c.confrelid = 'public.avatar_katalogu'::regclass) then
    alter table public.oyuncu_avatarlari drop constraint oyuncu_avatarlari_avatar_fkey;
  end if;
  if not exists (select 1 from pg_constraint c
                  where c.conrelid = 'public.oyuncu_avatarlari'::regclass and c.conname = 'oyuncu_avatarlari_avatar_fkey') then
    alter table public.oyuncu_avatarlari add constraint oyuncu_avatarlari_avatar_fkey
      foreign key (avatar) references public.avatar_nitelikleri(anahtar) on update cascade;
  end if;
end $$;

-- ---------- 4. İç yardımcılar (istemciye KAPALI) ----------
-- Fiyat: ücretsiz → 0 · elmas → oyun_ayarlari.elmas_avatar_<nadirlik> (yoksa/0 ise null = satılmıyor) · diğer → null.
create or replace function public.avatar_satis_fiyati(p_nadirlik text, p_edinme text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
           when p_edinme = 'ucretsiz' then 0
           when p_edinme = 'elmas' and p_nadirlik in ('yaygin', 'nadir', 'epik', 'efsanevi')
             then nullif(public.ayar_sayi('elmas_avatar_' || p_nadirlik, 0), 0)::int
         end;
$$;
revoke execute on function public.avatar_satis_fiyati(text, text) from public, anon, authenticated;

-- Oyuncu bu avatarı kullanabilir mi: ücretsizse ya da sahiplik satırı varsa. Tabloda kaydı olmayan adres → true
-- (geçerlilik denetimi avatar_onayla'nın işi).
create or replace function public.avatar_sahip_mi(p_user uuid, p_url text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select n.edinme = 'ucretsiz'
                          or exists (select 1 from public.oyuncu_avatarlari o
                                      where o.user_id = p_user and o.avatar = n.anahtar)
                     from public.avatar_nitelikleri n where n.url = p_url), true);
$$;
revoke execute on function public.avatar_sahip_mi(uuid, text) from public, anon, authenticated;

-- ---------- 5. Seçim: ücretli avatar SAHİPLİK ister (701'in gövdesi + sahiplik satırları) ----------
create or replace function public.avatar_onayla(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_k public.avatar_katalogu%rowtype;
begin
  perform public.hiz_siniri('avatar_onayla', 10, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  v_url := nullif(btrim(coalesce(p_url, '')), '');

  if v_url is null then
    update public.profiles set avatar_url = null, avatar_onayli = false where id = auth.uid();
    return;
  end if;

  if length(v_url) > 500 then raise exception 'Avatar adresi çok uzun'; end if;
  if v_url !~ '^(/[A-Za-z0-9._/-]+|https://[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]+)$' then
    raise exception 'Geçersiz avatar adresi';
  end if;

  if left(v_url, 1) = '/' then
    -- 701: henüz açılmamış avatar seçilemez (takılı olan hariç)
    if not public.avatar_acilmis_mi(v_url)
       and v_url is distinct from (select p.avatar_url from public.profiles p where p.id = auth.uid()) then
      raise exception 'Bu avatar henüz kullanılamıyor';
    end if;

    select * into v_k from public.avatar_katalogu k where k.url = v_url;
    if found then
      if not public.avatar_acik_mi(v_k.anahtar) and not public.sahip_mi() then
        raise exception 'Bu avatar henüz kullanılamıyor';
      end if;
    elsif v_url not in (
      '/avatars/pro/kedi-k01.svg', '/avatars/pro/kopek-k02.svg',
      '/avatars/pro/baykus-k03.svg', '/avatars/pro/tilki-k04.svg',
      '/avatars/pro/panda-k05.svg', '/avatars/pro/penguen-k06.svg',
      '/avatars/pro/kurbaga-k07.svg', '/avatars/pro/ayi-k08.svg',
      '/avatars/pro/maymun-k09.svg', '/avatars/pro/dinozor-k10.svg',
      '/avatars/pro/ejderha-k11.svg', '/avatars/pro/kopekbaligi-k12.svg',
      '/avatars/pro/ahtapot-k13.svg', '/avatars/pro/ari-k14.svg',
      '/avatars/pro/robot-k15.svg', '/avatars/pro/uzayli-k16.svg',
      '/avatars/pro/astronot-k17.svg', '/avatars/pro/ninja-k18.svg',
      '/avatars/pro/korsan-k19.svg', '/avatars/pro/sovalye-k20.svg',
      '/avatars/pro/buyucu-k21.svg', '/avatars/pro/dedektif-k22.svg',
      '/avatars/pro/asci-k23.svg', '/avatars/pro/profesor-k24.svg',
      '/avatars/pro/viking-k25.svg', '/avatars/pro/hayalet-k26.svg',
      '/avatars/pro/zombi-k27.svg', '/avatars/pro/mumya-k28.svg',
      '/avatars/pro/kahraman-k29.svg', '/avatars/pro/palyaco-k30.svg',
      '/avatars/pro/kral-k31.svg'
    ) then
      raise exception 'Bu hazır avatar artık kullanılamıyor';
    end if;

    -- 820: Epik / Efsanevi (edinme <> 'ucretsiz') avatar sahiplik ister (takılı olan hariç; sahip dahil herkes)
    if not public.avatar_sahip_mi(auth.uid(), v_url)
       and v_url is distinct from (select p.avatar_url from public.profiles p where p.id = auth.uid()) then
      raise exception 'Bu avatar sende yok';
    end if;
  end if;

  update public.profiles set avatar_url = v_url, avatar_onayli = true where id = auth.uid();
end;
$$;

-- ---------- 6. Satın alma (550'deki "bedava — satın alınmaz" gövdesinin yerine) ----------
-- p_anahtar: avatar anahtarı (ör. 'korsan-k19') ya da adresi ('/avatars/pro/korsan-k19.svg').
create or replace function public.avatar_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_n public.avatar_nitelikleri%rowtype;
  v_fiyat int;
  v_bakiye int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('avatar_satin_al', 20, interval '60 seconds');
  select * into v_n from public.avatar_nitelikleri n where n.anahtar = p_anahtar or n.url = p_anahtar;
  if not found
     or not public.avatar_acilmis_mi(v_n.url)
     or exists (select 1 from public.avatar_katalogu k where k.url = v_n.url and not k.aktif) then
    raise exception 'Böyle bir avatar yok';
  end if;
  if v_n.edinme = 'ucretsiz' then raise exception 'Bu avatar bedava — satın alınmaz'; end if;
  v_fiyat := public.avatar_satis_fiyati(v_n.nadirlik, v_n.edinme);
  if v_fiyat is null or v_fiyat <= 0 or not public.kozmetik_satis_acik_mi() then
    raise exception 'Bu avatar satılmıyor';
  end if;

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_avatarlari o where o.user_id = v_me and o.avatar = v_n.anahtar) then
    raise exception 'Bu avatar zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, 'avatar', v_n.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (v_me, v_n.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_n.anahtar, 'url', v_n.url, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$$;
revoke execute on function public.avatar_satin_al(text) from public, anon;
grant execute on function public.avatar_satin_al(text) to authenticated;

-- ---------- 7. İstemci: sahiplik isteyen (ücretli) avatarların durumu ----------
-- Yalnız açık + aktif + edinme <> 'ucretsiz' satırlar. Listede OLMAYAN avatar ücretsizdir.
-- fiyat null / satilik false → dükkânda alınamaz (ör. yalnız Battle Pass ödülü ya da satış kapalı).
create or replace function public.avatar_sahiplik_durumu()
returns table (url text, anahtar text, nadirlik text, fiyat integer, sahibim boolean, satilik boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_satis boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_satis := public.kozmetik_satis_acik_mi();
  return query
    select n.url, n.anahtar, n.nadirlik,
           public.avatar_satis_fiyati(n.nadirlik, n.edinme),
           (o.user_id is not null),
           (v_satis and n.edinme = 'elmas' and public.avatar_satis_fiyati(n.nadirlik, n.edinme) is not null)
      from public.avatar_nitelikleri n
      left join public.oyuncu_avatarlari o on o.user_id = v_me and o.avatar = n.anahtar
     where n.edinme <> 'ucretsiz'
       and public.avatar_acilmis_mi(n.url)
       and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
     order by n.sira, n.anahtar;
end;
$$;
revoke execute on function public.avatar_sahiplik_durumu() from public, anon;
grant execute on function public.avatar_sahiplik_durumu() to authenticated;

-- ---------- 8. Geriye uyumluluk: takılı ücretli avatar → sahiplik (yalnız insan hesaplar) ----------
insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
select p.id, n.anahtar, 'hediye'
  from public.profiles p
  join public.avatar_nitelikleri n on n.url = p.avatar_url
 where n.edinme <> 'ucretsiz'
   and not coalesce(p.is_bot, false)
on conflict (user_id, avatar) do nothing;

-- ---------- 9. Rapor ----------
do $$
declare v_dagilim text; v_hediye int; v_eksik int; v_bot int;
begin
  select string_agg(nadirlik || '/' || edinme || ' ' || n, ' · ' order by nadirlik, edinme) into v_dagilim
    from (select n.nadirlik, n.edinme, count(*) n
            from public.avatar_nitelikleri n
           where not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
           group by 1, 2) t;
  select count(*) into v_hediye from public.oyuncu_avatarlari where kaynak = 'hediye';
  select count(*) into v_eksik
    from public.profiles p join public.avatar_nitelikleri n on n.url = p.avatar_url
   where n.edinme <> 'ucretsiz' and not coalesce(p.is_bot, false)
     and not public.avatar_sahip_mi(p.id, p.avatar_url);
  select count(*) into v_bot
    from public.oyuncu_avatarlari o join public.profiles p on p.id = o.user_id where coalesce(p.is_bot, false);
  if v_eksik > 0 then raise exception '820: takılı ücretli avatarı olup sahipliği olmayan % insan hesap var', v_eksik; end if;
  raise notice '820 aktif avatarlar (nadirlik/edinme): %', v_dagilim;
  raise notice '820 hediye sahiplik satırı: % · bot sahiplik satırı: % (0 olmalı)', v_hediye, v_bot;
end $$;
