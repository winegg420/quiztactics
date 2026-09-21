-- ============================================================
-- PROFESYONEL AVATAR SETİ — 31 KARAKTER
-- Dondurulmuş eski 31 düşük ayrıntılı SVG geri açılmaz. Aynı karakterlerin
-- profesyonel yorumları /avatars/pro altında seçim için etkinleştirilir.
-- Google fotoğrafları ve özel https avatarları değişmez.
-- ============================================================

create or replace function public.avatar_onayla(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
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

  if left(v_url, 1) = '/' and v_url not in (
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

  update public.profiles set avatar_url = v_url, avatar_onayli = true where id = auth.uid();
end;
$$;

revoke execute on function public.avatar_onayla(text) from public, anon;
grant execute on function public.avatar_onayla(text) to authenticated;
