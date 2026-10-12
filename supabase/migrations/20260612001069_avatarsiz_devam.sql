-- 1069: "Avatarsız devam et" oyuncuyu kurulumda hapsediyordu.
-- avatar_onayla(null) avatar_onayli'yi false bırakıyordu; kurulum penceresi (KurulumSihirbazi) ve Layout
-- bu bayrağa bakıp oyuncuyu avatar adımına geri atıyordu. Avatarsız seçim de bir karardır: onaylı sayılır,
-- harf avatarı gösterilir. Yalnız `v_url is null` dalı değişti; gövdenin kalanı 820 ile aynı.
-- Yetki/GRANT/RLS değişikliği yok (create or replace mevcut yetkileri korur).
-- Etkilenmiş mevcut hesap: 12 Eki 2026 ölçümünde 0 — veri düzeltmesi gerekmedi.
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
    update public.profiles set avatar_url = null, avatar_onayli = true where id = auth.uid();
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
