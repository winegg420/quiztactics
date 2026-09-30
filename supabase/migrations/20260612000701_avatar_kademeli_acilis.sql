-- ============================================================
-- 701 · AVATAR KADEMELİ AÇILIŞ — sunucu kapıları (30 Eyl 2026)
--
-- 700'deki avatar_nitelikleri.acilis_zamani gelmemiş avatar:
--   * avatar_katalogu_oyun (Dükkân / Koleksiyon / Profil / Kurulum kataloğu) listelemez,
--   * avatar_onayla (profil avatarı seçimi) kabul etmez — sahip dahil (sahip /avatar-nadirlik'te görür),
--     tek istisna: oyuncunun ZATEN takılı avatarı (mevcut avatar bozulmaz, yeniden kaydedilebilir).
-- 31 hazır avatarın istemci listesi avatar_kilitli_urller() ile süzülür (700).
-- Gövdeler 550'deki son tanımların aynısıdır; yalnız kilit satırları eklendi. Yetkiler korunur (create or replace).
-- ============================================================

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
  end if;

  update public.profiles set avatar_url = v_url, avatar_onayli = true where id = auth.uid();
end;
$$;

create or replace function public.avatar_katalogu_oyun()
returns table (anahtar text, url text, ad_tr text, ad_en text, tur text, fiyat_elmas integer,
               sira integer, sahibim boolean, kullanabilir boolean, kapali boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  return query
    select k.anahtar, k.url, k.ad_tr, k.ad_en, k.tur,
           public.avatar_fiyati(k.tur, k.fiyat_elmas),
           k.sira,
           (o.user_id is not null),
           true,
           false
      from public.avatar_katalogu k
      left join public.oyuncu_avatarlari o on o.user_id = v_me and o.avatar = k.anahtar
     where k.aktif
       and public.avatar_acilmis_mi(k.url)   -- 701: kademeli açılış
     order by k.sira, k.anahtar;
end;
$$;
