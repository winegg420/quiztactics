-- ============================================================
-- Ajan M (24 Eyl 2026) — tam müzik parçaları + müzik çalma listeleri.
--
-- 1) KOVA `muzik`: tam parçalar (AAC/ADTS 96 kbps) site dağıtımına (public/) GİRMEZ,
--    Supabase Storage'dan herkese okunur. Dosya adı içerik sürümlü (<aday>-<sha>.aac),
--    yükleme cacheControl = 1 yıl → tarayıcı bir kez indirir.
--    Yazma politikası YOK: istemci (anon/authenticated) yükleyemez, silemez.
-- 2) ÇALMA LİSTESİ: müzik anlarında (muzik_*) 1–4 aday sıralı seçilir.
--    Geri uyum: `aday` sütunu hep listenin İLK parçasıdır (eski istemci tek parça çalar);
--    `liste` yalnız 2+ parçada dolu. ses_secimleri_oyun() `listeler` alanını ekler.
-- ============================================================

-- ---------- 1) kova ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('muzik', 'muzik', true, 10485760, array['audio/aac'])
on conflict (id) do nothing;

drop policy if exists muzik_okuma on storage.objects;
create policy muzik_okuma on storage.objects
  for select using (bucket_id = 'muzik');

-- ---------- 2) çalma listesi ----------
alter table public.ses_secimleri add column if not exists liste text[];

alter table public.ses_secimleri drop constraint if exists ses_secimleri_liste_kontrol;
alter table public.ses_secimleri add constraint ses_secimleri_liste_kontrol check (
  liste is null or (
    an like 'muzik\_%'
    and cardinality(liste) between 2 and 4
    and liste[1] = aday
  )
);

/** Tek seçim (efekt anları ve eski istemci). Liste varsa temizlenir. Yalnız sahip. */
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
    insert into public.ses_secimleri (an, aday, secen, guncellendi, liste)
    values (p_an, p_aday, auth.uid(), now(), null)
    on conflict (an) do update
      set aday = excluded.aday, secen = excluded.secen, guncellendi = now(), liste = null;
  end if;

  select count(*) into v_sayi from public.ses_secimleri;
  return v_sayi;
end;
$$;

/**
 * Müzik anının sıralı çalma listesi (1–4 aday, tekrarsız). Yalnız sahip.
 * Boş/null → seçimi kaldırır · 1 parça → tek seçim (döngü) · 2–4 → liste.
 * Döner: kaydedilen parça sayısı.
 */
create or replace function public.ses_listesi_kaydet(p_an text, p_liste text[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int := coalesce(cardinality(p_liste), 0);
  v_aday text;
begin
  if auth.uid() is null or not public.sahip_mi() then
    raise exception 'Bu sayfa yalnız sahibe açık';
  end if;
  if p_an is null or p_an !~ '^muzik_[a-z0-9_]{1,34}$' then
    raise exception 'Çalma listesi yalnız müzik anlarında';
  end if;
  if v_n > 4 then
    raise exception 'Çalma listesi en çok 4 parça';
  end if;
  foreach v_aday in array coalesce(p_liste, array[]::text[]) loop
    if v_aday is null or v_aday !~ '^[a-z0-9_-]{1,60}$' or v_aday in ('mevcut', 'sessiz') then
      raise exception 'Geçersiz aday';
    end if;
  end loop;
  if v_n <> (select count(distinct x) from unnest(p_liste) x) then
    raise exception 'Aynı parça iki kez eklenemez';
  end if;

  if v_n = 0 then
    delete from public.ses_secimleri where an = p_an;
  else
    insert into public.ses_secimleri (an, aday, secen, guncellendi, liste)
    values (p_an, p_liste[1], auth.uid(), now(), case when v_n > 1 then p_liste end)
    on conflict (an) do update
      set aday = excluded.aday, secen = excluded.secen, guncellendi = now(), liste = excluded.liste;
  end if;
  return v_n;
end;
$$;

revoke execute on function public.ses_listesi_kaydet(text, text[]) from public, anon;
grant execute on function public.ses_listesi_kaydet(text, text[]) to authenticated;

/**
 * Oyunun okuduğu seçimler (400'ün aynısı + `listeler`). Herkese açık, salt okunur.
 * Döner: {surum, muzik_seviye, muzik_kisik_oran, secimler?: {an: aday}, listeler?: {an: [aday…]}}
 */
create or replace function public.ses_secimleri_oyun(p_surum int default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_surum int;
  v_sonuc jsonb;
begin
  select coalesce((deger #>> '{}')::int, 0) into v_surum
    from public.oyun_ayarlari where anahtar = 'ses_secim_surumu';
  v_surum := coalesce(v_surum, 0);

  v_sonuc := jsonb_build_object(
    'surum', v_surum,
    'muzik_seviye', coalesce((select (deger #>> '{}')::numeric from public.oyun_ayarlari where anahtar = 'muzik_varsayilan_seviye'), 0.35),
    'muzik_kisik_oran', coalesce((select (deger #>> '{}')::numeric from public.oyun_ayarlari where anahtar = 'muzik_kisik_oran'), 0.3));

  if p_surum is distinct from v_surum then
    v_sonuc := v_sonuc || jsonb_build_object(
      'secimler', coalesce((select jsonb_object_agg(s.an, s.aday) from public.ses_secimleri s), '{}'::jsonb),
      'listeler', coalesce((select jsonb_object_agg(s.an, to_jsonb(s.liste)) from public.ses_secimleri s where s.liste is not null), '{}'::jsonb));
  end if;
  return v_sonuc;
end;
$$;

revoke execute on function public.ses_secimleri_oyun(int) from public;
grant execute on function public.ses_secimleri_oyun(int) to anon, authenticated;

-- Oyuncuların önbelleği yeni biçimi (listeler) alsın.
update public.oyun_ayarlari
   set deger = to_jsonb(coalesce((deger #>> '{}')::int, 0) + 1)
 where anahtar = 'ses_secim_surumu';
