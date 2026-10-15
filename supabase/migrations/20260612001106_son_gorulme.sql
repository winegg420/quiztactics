-- 1106: Arkadaşlarda "son görülme" + Ayarlar › "Son görülmemi gizle" (Ida, 15 Eki 2026)
--
-- Kural SUNUCUDA: gizleyenin last_seen'i hiçbir istemciye gitmez; gizleyen de başkalarınınkini göremez.
--   · profiles.son_gorulme_gizli (boolean, varsayılan false). Sütun-bazlı yetki düzeninde yeni sütun
--     `authenticated`a AÇIK DEĞİLDİR; oyuncu kendi değerini profilim()'den okur, yalnız RPC ile yazar.
--   · profiles.last_seen SELECT yetkisi `authenticated`tan alınır (264'te "lig/maç listeleri" için açılmıştı;
--     bugün istemcide tek okuyan OyuncuKarti'ydı, o da profil_cevrimici() RPC'sine geçti). Yazma yolu
--     (kalp_at, security definer) ve sunucu fonksiyonları (hepsi security definer) etkilenmez.
--   · arkadas_son_gorulme(uuid[]): YALNIZ kabul edilmiş, engelsiz arkadaşların last_seen'i; çağıran ya da
--     arkadaş gizliyse satır dönmez.
--   · profil_cevrimici(uuid): oyuncu kartındaki yeşil nokta için boolean (son 2 dk); hedef gizliyse false.
-- Geri alma: docs/son-gorulme-geri-alma-1106.sql

alter table public.profiles add column if not exists son_gorulme_gizli boolean not null default false;

revoke select (last_seen) on public.profiles from authenticated;

-- Ayar yazma
create or replace function public.son_gorulme_gizli_ayarla(p_gizli boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  update public.profiles set son_gorulme_gizli = coalesce(p_gizli, false) where id = auth.uid();
end;
$$;
revoke all on function public.son_gorulme_gizli_ayarla(boolean) from public, anon;
grant execute on function public.son_gorulme_gizli_ayarla(boolean) to authenticated;

-- Arkadaşların son görülme zamanı (en çok 200 kişi)
create or replace function public.arkadas_son_gorulme(p_ids uuid[])
returns table (id uuid, son_gorulme timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 then return; end if;
  -- gizleyen başkalarınınkini de görmez
  if exists (select 1 from public.profiles m where m.id = v_me and m.son_gorulme_gizli) then return; end if;

  return query
  select p.id, p.last_seen
    from public.profiles p
   where p.id = any (p_ids[1:200])
     and p.id <> v_me
     and not p.son_gorulme_gizli
     and not coalesce(p.is_bot, false)
     and exists (
       select 1 from public.friendships f
        where f.durum = 'arkadas'
          and ((f.requester = v_me and f.addressee = p.id) or (f.requester = p.id and f.addressee = v_me))
     )
     and not exists (
       select 1 from public.engellemeler e
        where (e.engelleyen = v_me and e.engellenen = p.id) or (e.engelleyen = p.id and e.engellenen = v_me)
     );
end;
$$;
revoke all on function public.arkadas_son_gorulme(uuid[]) from public, anon;
grant execute on function public.arkadas_son_gorulme(uuid[]) to authenticated;

-- Oyuncu kartı: çevrimiçi noktası (zaman damgası dönmez, yalnız boolean)
create or replace function public.profil_cevrimici(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.last_seen > now() - interval '2 minutes' and not p.son_gorulme_gizli, false)
    from public.profiles p
   where p.id = p_id and auth.uid() is not null;
$$;
revoke all on function public.profil_cevrimici(uuid) from public, anon;
grant execute on function public.profil_cevrimici(uuid) to authenticated;

comment on column public.profiles.son_gorulme_gizli is
  '1106: true ise oyuncunun last_seen''i arkadaşlara da gitmez ve kendisi de başkalarınınkini göremez. İstemciye kapalı sütun; yazma: son_gorulme_gizli_ayarla().';
