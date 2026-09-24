-- ============================================================
-- Sahip tasarım seçimleri (Ajan B, 24 Eyl 2026) — /cerceve-onizleme'de Ida'nın çerçeve TARZI seçimi.
-- Genel tablo: konu başına tek seçim (ilk konu 'cerceve_tarzi' = cizgi | mucevher | isik).
-- Yalnız sahip okur/yazar (mevcut sahip_mi(), migration 380 — yetki değişmedi). Yeni RPC'ler
-- mevcut kalıpla security definer + yalnız authenticated.
-- ============================================================

create table if not exists public.sahip_tasarim_secimleri (
  konu        text primary key check (konu ~ '^[a-z0-9_]{2,40}$'),
  secim       text not null check (secim ~ '^[a-z0-9_-]{1,40}$'),
  secen       uuid not null references auth.users(id) on delete cascade,
  guncellendi timestamptz not null default now()
);

alter table public.sahip_tasarim_secimleri enable row level security;
-- Politika YOK: doğrudan okuma/yazma kapalı; erişim yalnız aşağıdaki RPC'lerle.
revoke all on public.sahip_tasarim_secimleri from public, anon, authenticated;

/** Konunun seçimi (yoksa null). Yalnız sahip. */
create or replace function public.tasarim_secimi(p_konu text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  return (select s.secim from public.sahip_tasarim_secimleri s where s.konu = p_konu);
end;
$$;

/** Seçimi yazar (p_secim null → kaldırır). Yalnız sahip. Döner: kayıtlı seçim. */
create or replace function public.tasarim_secimi_kaydet(p_konu text, p_secim text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  if p_konu is null or p_konu !~ '^[a-z0-9_]{2,40}$' then
    raise exception 'Geçersiz konu';
  end if;

  if p_secim is null then
    delete from public.sahip_tasarim_secimleri where konu = p_konu;
    return null;
  end if;
  if p_secim !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'Geçersiz seçim';
  end if;
  if p_konu = 'cerceve_tarzi' and p_secim not in ('cizgi', 'mucevher', 'isik') then
    raise exception 'Geçersiz çerçeve tarzı';
  end if;

  insert into public.sahip_tasarim_secimleri (konu, secim, secen, guncellendi)
  values (p_konu, p_secim, auth.uid(), now())
  on conflict (konu) do update
    set secim = excluded.secim, secen = excluded.secen, guncellendi = now();
  return p_secim;
end;
$$;

revoke execute on function public.tasarim_secimi(text) from public, anon;
grant execute on function public.tasarim_secimi(text) to authenticated;
revoke execute on function public.tasarim_secimi_kaydet(text, text) from public, anon;
grant execute on function public.tasarim_secimi_kaydet(text, text) to authenticated;
