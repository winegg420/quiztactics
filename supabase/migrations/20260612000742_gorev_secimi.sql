-- 742 — Görev sistemi genişlemesi (3/4): günlük / haftalık SEÇİM. Herkese aynı, tarihten deterministik (md5), tembel yazılır;
-- bir kez yazılınca o gün / o hafta DEĞİŞMEZ (havuz sonradan değişse de). Saf hesap fonksiyonları yazmaz (önizleme/test için).
--  * Günlük: 1 kolay + 1 orta + 1 zor; döngülü seçim (her görev eşit sıklıkta, ardışık günde aynı görev yok).
--  * Kategori görevi: günün kategorisi aktif soru kategorilerinden ('genel'/'karisik' hariç) aynı döngüyle.
--  * Haftalık: havuzdan 3 farklı görev, hafta (pazartesi TSİ) + görev kimliğinden md5 sırasıyla.

-- Döngülü seçim (saf, deterministik): adaylar (sıralı) gün sayısına göre turlara bölünür; her turda her aday bir kez, sıra md5 ile
-- karışık. Böylece görevler eşit sıklıkla çıkar ve ardışık iki günde AYNI görev çıkmaz (tur sınırında gerekirse ilk ikisi yer değiştirir).
create or replace function public.gorev_dongu_dizi(p_adaylar text[], p_tur int, p_tuz text)
 returns text[] language sql immutable
as $$ select coalesce(array_agg(x order by md5(p_tur::text || ':' || p_tuz || ':' || x), x), '{}') from unnest(p_adaylar) x; $$;

create or replace function public.gorev_dongu_sec(p_adaylar text[], p_tarih date, p_tuz text)
 returns text language plpgsql immutable
as $$
declare
  v_len int := coalesce(array_length(p_adaylar, 1), 0);
  n int := p_tarih - date '2026-01-05';
  c int;
  pos int;
  v_dizi text[];
  v_onceki text;
  t text;
begin
  if v_len = 0 then return null; end if;
  if v_len = 1 then return p_adaylar[1]; end if;
  if v_len = 2 then return p_adaylar[1 + ((n % 2) + 2) % 2]; end if;   -- iki aday: dönüşümlü
  c := floor(n::numeric / v_len)::int;
  pos := n - c * v_len;
  v_dizi := public.gorev_dongu_dizi(p_adaylar, c, p_tuz);
  v_onceki := (public.gorev_dongu_dizi(p_adaylar, c - 1, p_tuz))[v_len];
  if v_dizi[1] = v_onceki then t := v_dizi[1]; v_dizi[1] := v_dizi[2]; v_dizi[2] := t; end if;
  return v_dizi[pos + 1];
end $$;

-- Günün kategorisi (saf): aktif soru kategorileri ('genel'/'karisik' hariç), döngülü
create or replace function public.gorev_gunun_kategorisi(p_tarih date)
 returns text language sql stable security definer set search_path to 'public'
as $$
  select public.gorev_dongu_sec(
    coalesce((select array_agg(k order by k) from (select distinct q.kategori k from public.questions q
               where q.aktif and q.kategori is not null and q.kategori not in ('genel', 'karisik')) x), '{}'),
    p_tarih, 'kategori');
$$;

-- Günlük ham seçim (saf): zorluk için havuzdan bir görev kimliği
create or replace function public.gorev_gunluk_ham(p_tarih date, p_zorluk text)
 returns text language sql stable security definer set search_path to 'public'
as $$
  select public.gorev_dongu_sec(
    coalesce((select array_agg(h.quest_id order by h.quest_id) from public.gorev_havuzu h
               where h.kapsam = 'gunluk' and h.zorluk = p_zorluk and h.aktif), '{}'),
    p_tarih, 'gunluk:' || p_zorluk);
$$;

-- Günün 3 görevi (saf; yazmaz)
create or replace function public.gorev_gunluk_hesapla(p_tarih date)
 returns table (zorluk text, quest_id text, parametre jsonb)
 language plpgsql stable security definer set search_path to 'public'
as $$
declare
  z text;
  v_q text;
  v_par jsonb;
begin
  foreach z in array array['kolay', 'orta', 'zor'] loop
    v_q := public.gorev_gunluk_ham(p_tarih, z);
    continue when v_q is null;
    select h.parametre into v_par from public.gorev_havuzu h where h.quest_id = v_q;
    if v_par ? 'kategori' then
      v_par := jsonb_build_object('kategori', public.gorev_gunun_kategorisi(p_tarih));
    end if;
    zorluk := z; quest_id := v_q; parametre := coalesce(v_par, '{}'::jsonb);
    return next;
  end loop;
end $$;

-- Haftanın 3 görevi (saf; yazmaz). p_hafta = pazartesi
create or replace function public.gorev_haftalik_hesapla(p_hafta date)
 returns table (slot int, quest_id text)
 language sql stable security definer set search_path to 'public'
as $$
  select (row_number() over (order by md5(p_hafta::text || ':' || h.quest_id), h.quest_id))::int, h.quest_id
    from public.gorev_havuzu h where h.kapsam = 'haftalik' and h.aktif
   order by 1 limit 3;
$$;

-- Tembel yazım (iç, idempotent; yazılmış satıra dokunmaz)
create or replace function public.gunluk_secim_yap(p_tarih date)
 returns void language plpgsql volatile security definer set search_path to 'public'
as $$
begin
  if (select count(*) from public.gunluk_gorev_secimi where tarih = p_tarih) >= 3 then return; end if;
  perform pg_advisory_xact_lock(hashtext('quiztactics:gunluk_gorev:' || p_tarih::text));
  insert into public.gunluk_gorev_secimi (tarih, zorluk, quest_id, parametre)
  select p_tarih, g.zorluk, g.quest_id, g.parametre from public.gorev_gunluk_hesapla(p_tarih) g
  on conflict (tarih, zorluk) do nothing;
end $$;

create or replace function public.haftalik_secim_yap(p_hafta date)
 returns void language plpgsql volatile security definer set search_path to 'public'
as $$
begin
  if (select count(*) from public.haftalik_gorev_secimi where hafta = p_hafta) >= 3 then return; end if;
  perform pg_advisory_xact_lock(hashtext('quiztactics:haftalik_gorev:' || p_hafta::text));
  insert into public.haftalik_gorev_secimi (hafta, slot, quest_id)
  select p_hafta, g.slot, g.quest_id from public.gorev_haftalik_hesapla(p_hafta) g
  on conflict (hafta, slot) do nothing;
end $$;

revoke all on function public.gorev_dongu_dizi(text[], int, text) from public, anon, authenticated;
revoke all on function public.gorev_dongu_sec(text[], date, text) from public, anon, authenticated;
revoke all on function public.gorev_gunun_kategorisi(date) from public, anon, authenticated;
revoke all on function public.gorev_gunluk_ham(date, text) from public, anon, authenticated;
revoke all on function public.gorev_gunluk_hesapla(date) from public, anon, authenticated;
revoke all on function public.gorev_haftalik_hesapla(date) from public, anon, authenticated;
revoke all on function public.gunluk_secim_yap(date) from public, anon, authenticated;
revoke all on function public.haftalik_secim_yap(date) from public, anon, authenticated;
