-- ============================================================
-- 334 · Lig çerçeveleri yeni çerçeve sistemine taşınır (hiçbir sahiplik kaybolmaz)
--
-- - lig_cerceveleri (eski, 213) → oyuncu_cerceveleri ('lig_<lig>', kaynak 'tasima')
-- - profiles.gorunum.lig_cerceve (takılı) → profiles.takili_cerceve
-- - Eski fonksiyonlar çalışmaya devam eder ve yeni tabloyu da günceller:
--   lig_cerceve_ver (lig kapanışı) · lig_cerceve_sec (eski seçim ekranı).
--   Eski tablo ve gorunum alanı silinmez; oyuncu_lig_cerceveleri aynen okur.
-- ============================================================

insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak, kazanildi_at)
select c.user_id, 'lig_' || c.lig, 'tasima', coalesce(c.kazanildi, now())
  from public.lig_cerceveleri c
 where c.lig in ('gumus', 'altin', 'elmas', 'efsane')
on conflict (user_id, cerceve) do nothing;

update public.profiles p
   set takili_cerceve = 'lig_' || (p.gorunum ->> 'lig_cerceve')
 where p.takili_cerceve is null
   and (p.gorunum ->> 'lig_cerceve') in ('gumus', 'altin', 'elmas', 'efsane')
   and exists (select 1 from public.oyuncu_cerceveleri o
                where o.user_id = p.id and o.cerceve = 'lig_' || (p.gorunum ->> 'lig_cerceve'));

-- Lig atlayınca kalıcı çerçeve: eski tablo + yeni tablo. Oyuncu elle seçmediyse ve takılı
-- çerçevesi yoksa ya da bir lig çerçevesiyse en yüksek lig çerçevesi takılır (satın alınmış /
-- level çerçevesinin üstüne yazılmaz).
create or replace function public.lig_cerceve_ver(p_user uuid, p_lig text, p_kaynak text default 'lig_yukselme'::text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_en text;
begin
  if p_user is null or p_lig is null or p_lig not in ('gumus','altin','elmas','efsane') then return false; end if;
  insert into public.lig_cerceveleri (user_id, lig, kaynak) values (p_user, p_lig, p_kaynak)
  on conflict do nothing;
  insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak) values (p_user, 'lig_' || p_lig, 'lig_yukselme')
  on conflict do nothing;
  -- Oyuncu elle seçmediyse en yüksek çerçeve takılır
  select c.lig into v_en from public.lig_cerceveleri c
   where c.user_id = p_user order by public.lig_sirasi(c.lig) desc limit 1;
  update public.profiles
     set gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', v_en),
         takili_cerceve = 'lig_' || v_en
   where id = p_user
     and coalesce((gorunum ->> 'lig_cerceve_elle')::boolean, false) = false
     and (takili_cerceve is null or takili_cerceve like 'lig\_%');
  return true;
end;
$function$;
revoke all on function public.lig_cerceve_ver(uuid, text, text) from public, anon, authenticated;

-- Eski seçim yolu: yeni takili_cerceve de eşlenir.
create or replace function public.lig_cerceve_sec(p_lig text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('lig_cerceve_sec', 20, interval '60 seconds');
  if p_lig is not null and not exists (select 1 from public.lig_cerceveleri c where c.user_id = v_me and c.lig = p_lig) then
    raise exception 'Bu çerçeveyi henüz kazanmadın';
  end if;
  update public.profiles
     set gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', p_lig, 'lig_cerceve_elle', true),
         takili_cerceve = case when p_lig is null then null else 'lig_' || p_lig end
   where id = v_me;
  return p_lig;
end;
$function$;
revoke all on function public.lig_cerceve_sec(text) from public, anon;
grant execute on function public.lig_cerceve_sec(text) to authenticated;
