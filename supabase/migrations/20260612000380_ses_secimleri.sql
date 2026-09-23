-- ============================================================
-- /ses-secim (Ajan F, 23 Eyl 2026) — Ida'nın kulağıyla ses seçimi.
-- Sayfa yalnız sahibe açık; seçimler burada saklanır. Oyuna ŞİMDİ bağlanmaz
-- (Ida bitirince ayrı adımda ses.js'e bağlanır).
--
-- Sahip listesi: oyun_ayarlari.sahip_kullanicilar (jsonb metin dizisi, auth.users id).
-- İlk değer idagureli@gmail.com hesabı (auth.users'ta e-postayla doğrulandı;
-- 028 gelistirici_yetkisi ve 034 gl_admin_mi ile aynı kimlik).
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('sahip_kullanicilar', '["e4f6006f-d6bb-4ca8-be67-3bdf9efc9708"]'::jsonb,
        'Sahip hesapları (auth.users id). Yalnız sahip sayfaları (/ses-secim) ve sahip RPC''leri için.')
on conflict (anahtar) do nothing;

/** Oturumdaki kullanıcı sahip mi? (sunucu kararı; istemci yalnız görünümü buna göre çizer) */
create or replace function public.sahip_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select jsonb_typeof(deger) = 'array' and deger ? auth.uid()::text
       from public.oyun_ayarlari where anahtar = 'sahip_kullanicilar'),
    false);
$$;

revoke execute on function public.sahip_mi() from public, anon;
grant execute on function public.sahip_mi() to authenticated;

-- ---------- Seçim tablosu ----------
create table if not exists public.ses_secimleri (
  an          text primary key check (an ~ '^[a-z0-9_]{2,40}$'),
  aday        text not null check (aday ~ '^[a-z0-9_-]{1,60}$'),   -- aday id'si ya da 'mevcut'
  secen       uuid not null references auth.users(id) on delete cascade,
  guncellendi timestamptz not null default now()
);

alter table public.ses_secimleri enable row level security;
-- Politika YOK: doğrudan okuma/yazma kapalı; erişim yalnız aşağıdaki RPC'lerle.
revoke all on public.ses_secimleri from public, anon, authenticated;

/** Sahibin seçimleri. Sahip değilse hata. */
create or replace function public.ses_secimlerim()
returns table (an text, aday text, guncellendi timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  return query select s.an, s.aday, s.guncellendi from public.ses_secimleri s order by s.an;
end;
$$;

/**
 * Seçimi yazar (p_aday null → seçimi kaldırır). Yalnız sahip.
 * Döner: toplam seçim sayısı.
 */
create or replace function public.ses_secimi_kaydet(p_an text, p_aday text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sayi int;
begin
  if auth.uid() is null or not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  if p_an is null or p_an !~ '^[a-z0-9_]{2,40}$' then
    raise exception 'Geçersiz ses anı';
  end if;

  if p_aday is null then
    delete from public.ses_secimleri where an = p_an;
  else
    if p_aday !~ '^[a-z0-9_-]{1,60}$' then
      raise exception 'Geçersiz aday';
    end if;
    insert into public.ses_secimleri (an, aday, secen, guncellendi)
    values (p_an, p_aday, auth.uid(), now())
    on conflict (an) do update
      set aday = excluded.aday, secen = excluded.secen, guncellendi = now();
  end if;

  select count(*) into v_sayi from public.ses_secimleri;
  return v_sayi;
end;
$$;

revoke execute on function public.ses_secimlerim() from public, anon;
grant execute on function public.ses_secimlerim() to authenticated;
revoke execute on function public.ses_secimi_kaydet(text, text) from public, anon;
grant execute on function public.ses_secimi_kaydet(text, text) to authenticated;
