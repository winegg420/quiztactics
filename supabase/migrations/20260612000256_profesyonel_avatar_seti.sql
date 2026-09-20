-- ============================================================
-- PROFESYONEL AVATAR SETİ — 20 Eylül 2026
-- Eski 31 hazır SVG silinmez; seçim ve kayıt için dondurulur.
-- Google fotoğrafları ve özel https avatarları değişmez.
-- ============================================================

update public.profiles
set avatar_url = case substring(avatar_url from 'k([0-9]{2})[.]svg$')
  when '01' then '/avatars/pro/kedi-k01.svg'
  when '02' then '/avatars/pro/kedi-k01.svg'
  when '03' then '/avatars/pro/profesor-k24.svg'
  when '04' then '/avatars/pro/kedi-k01.svg'
  when '05' then '/avatars/pro/panda-k05.svg'
  when '06' then '/avatars/pro/panda-k05.svg'
  when '07' then '/avatars/pro/uzayli-k16.svg'
  when '08' then '/avatars/pro/panda-k05.svg'
  when '09' then '/avatars/pro/kahraman-k29.svg'
  when '10' then '/avatars/pro/dinozor-k10.svg'
  when '11' then '/avatars/pro/dinozor-k10.svg'
  when '12' then '/avatars/pro/dinozor-k10.svg'
  when '13' then '/avatars/pro/uzayli-k16.svg'
  when '14' then '/avatars/pro/robot-k15.svg'
  when '15' then '/avatars/pro/robot-k15.svg'
  when '16' then '/avatars/pro/uzayli-k16.svg'
  when '17' then '/avatars/pro/astronot-k17.svg'
  when '18' then '/avatars/pro/kahraman-k29.svg'
  when '19' then '/avatars/pro/korsan-k19.svg'
  when '20' then '/avatars/pro/kahraman-k29.svg'
  when '21' then '/avatars/pro/profesor-k24.svg'
  when '22' then '/avatars/pro/profesor-k24.svg'
  when '23' then '/avatars/pro/asci-k23.svg'
  when '24' then '/avatars/pro/profesor-k24.svg'
  when '25' then '/avatars/pro/korsan-k19.svg'
  when '26' then '/avatars/pro/uzayli-k16.svg'
  when '27' then '/avatars/pro/uzayli-k16.svg'
  when '28' then '/avatars/pro/astronot-k17.svg'
  when '29' then '/avatars/pro/kahraman-k29.svg'
  when '30' then '/avatars/pro/asci-k23.svg'
  when '31' then '/avatars/pro/kahraman-k29.svg'
end
where avatar_url ~ '^/avatars/k([0-9]{2})[.]svg$';

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
    '/avatars/pro/kedi-k01.svg', '/avatars/pro/panda-k05.svg',
    '/avatars/pro/dinozor-k10.svg', '/avatars/pro/robot-k15.svg',
    '/avatars/pro/uzayli-k16.svg', '/avatars/pro/astronot-k17.svg',
    '/avatars/pro/korsan-k19.svg', '/avatars/pro/asci-k23.svg',
    '/avatars/pro/profesor-k24.svg', '/avatars/pro/kahraman-k29.svg'
  ) then
    raise exception 'Bu hazır avatar artık kullanılamıyor';
  end if;

  update public.profiles set avatar_url = v_url, avatar_onayli = true where id = auth.uid();
end;
$$;

revoke execute on function public.avatar_onayla(text) from public, anon;
grant execute on function public.avatar_onayla(text) to authenticated;
