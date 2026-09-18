-- Paket 35 E — MESAJLAŞMA: karşılıklı arkadaşlar arasında bire bir, metin + emoji.
--
-- Desen maç sohbetinden (migration 12, match_messages) ve grup sohbetinden (30,
-- group_match_messages) alındı: RLS açık, istemcinin tabloya YAZMA izni yok (revoke all +
-- yalnız select), mesaj yalnız security definer RPC ile yazılır, tablo supabase_realtime
-- yayınına eklenir. Fark: burada serbest metin var (1-500 karakter) — kalıp listesi yok.
--
-- Güvenlik:
--   * arkadaşlık kontrolü SUNUCUDA (dm_gonder); istemciden gelen hiçbir şeye güvenilmez
--   * select yalnız gönderen ya da alıcıya açık; insert/update/delete doğrudan KAPALI
--   * hız sınırı: 60 saniyede en çok 20 mesaj (hiz_siniri — öteki RPC'lerle aynı sayaç)
--   * gizli bot sızmaz: botlar arkadaşlık kabul etmediği için onlara mesaj yolu zaten yok;
--     bildirim yardımcısı botlara push göndermez
--
-- Genişletilebilirlik (E.5): engelleme/şikâyet bu pakette yok. İleride ayrı tablo
-- (ör. dm_engeller) ya da bu tabloya kolon eklenerek gelir; tablo yeniden yazılmaz.
--
-- Bildirim: mevcut push altyapısı (push_metni + push_gonder, bkz. bildirim_anahtarla).
-- bildirimler tablosuna SATIR YAZILMAZ — zil okunmamış mesajı ayrıca sayar
-- (dm_okunmamis_sayim); yazılsaydı her mesaj zilde iki kez sayılırdı. Push yalnız o
-- kişiden gelen İLK okunmamış mesajda gider (arka arkaya 10 mesaj = 1 bildirim).

create table if not exists public.direkt_mesajlar (
  id          uuid primary key default gen_random_uuid(),
  gonderen_id uuid not null references public.profiles(id) on delete cascade,
  alici_id    uuid not null references public.profiles(id) on delete cascade,
  metin       text not null check (length(btrim(metin)) between 1 and 500),
  okundu      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists dm_sohbet_idx
  on public.direkt_mesajlar (least(gonderen_id, alici_id), greatest(gonderen_id, alici_id), created_at desc);
create index if not exists dm_okunmamis_idx
  on public.direkt_mesajlar (alici_id, okundu) where not okundu;

alter table public.direkt_mesajlar enable row level security;
revoke all on public.direkt_mesajlar from authenticated, anon;
drop policy if exists "direkt_mesajlar_select" on public.direkt_mesajlar;
create policy "direkt_mesajlar_select" on public.direkt_mesajlar for select
  to authenticated
  using (gonderen_id = auth.uid() or alici_id = auth.uid());
-- insert / update / delete politikası YOK ve yetki verilmedi → doğrudan yazma kapalı.
grant select on public.direkt_mesajlar to authenticated;

-- Realtime yayınına ekle (maç sohbetiyle aynı yol)
do $$
begin
  alter publication supabase_realtime add table public.direkt_mesajlar;
exception when duplicate_object then null;
end $$;

-- Push metni (tr + en); push_metni() bu tablodan okur
insert into public.push_metinleri (anahtar, dil, baslik, govde) values
  ('dm_yeni', 'tr', '💬 Yeni mesaj', '% sana mesaj attı.'),
  ('dm_yeni', 'en', '💬 New message', '% sent you a message.')
on conflict (anahtar, dil) do update set baslik = excluded.baslik, govde = excluded.govde;

-- ---------------------------------------------------------------------------
-- İki oyuncu karşılıklı arkadaş mı? (friendships.durum = 'arkadas', yön fark etmez)
create or replace function public.dm_arkadas_mi(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.friendships f
     where f.durum = 'arkadas'
       and ((f.requester = p_a and f.addressee = p_b) or (f.requester = p_b and f.addressee = p_a))
  );
$$;
revoke all on function public.dm_arkadas_mi(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Mesaj gönder
create or replace function public.dm_gonder(p_alici uuid, p_metin text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_metin text := btrim(coalesce(p_metin, ''));
  v_satir public.direkt_mesajlar%rowtype;
  v_dil text;
  v_ad text;
  v_m record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('dm_gonder', 20, interval '60 seconds');
  if p_alici is null or p_alici = v_me then raise exception 'Kendine mesaj atamazsın'; end if;
  if length(v_metin) = 0 then raise exception 'Mesaj boş olamaz'; end if;
  if length(v_metin) > 500 then raise exception 'Mesaj en fazla 500 karakter olabilir'; end if;
  if not public.dm_arkadas_mi(v_me, p_alici) then
    raise exception 'Yalnız arkadaşlarına mesaj atabilirsin';
  end if;

  insert into public.direkt_mesajlar (gonderen_id, alici_id, metin)
  values (v_me, p_alici, v_metin)
  returning * into v_satir;

  -- Push: bu kişiden gelen başka okunmamış mesaj yoksa (ilk mesaj). Hata mesajı düşürmez.
  if not exists (
    select 1 from public.direkt_mesajlar d
     where d.alici_id = p_alici and d.gonderen_id = v_me and not d.okundu and d.id <> v_satir.id
  ) and exists (select 1 from public.push_subscriptions s where s.user_id = p_alici) then
    begin
      select dil into v_dil from public.profiles where id = p_alici;
      select gorunen_ad into v_ad from public.profiles where id = v_me;
      select * into v_m from public.push_metni('dm_yeni', v_dil, jsonb_build_array(coalesce(v_ad, 'Quiz Tactics')));
      perform public.push_gonder(jsonb_build_array(p_alici), v_m.baslik, v_m.govde, '/mesajlar/' || v_me::text);
    exception when others then
      raise notice 'dm_gonder push hatası: %', sqlerrm;
    end;
  end if;

  return to_jsonb(v_satir);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Sohbet listesi: karşı taraf başına son mesaj + okunmamış sayısı + profil.
--    Arkadaşlıktan çıkılsa da eski sohbet listede kalır (okunabilir); `arkadas` bayrağı
--    istemcide mesaj kutusunu kapatır.
create or replace function public.dm_sohbetlerim()
returns table (
  kisi_id uuid, gorunen_ad text, gorunen_avatar text, gorunum jsonb,
  son_metin text, son_zaman timestamptz, son_benden boolean, okunmamis int, arkadas boolean
)
language sql stable security definer set search_path to 'public'
as $$
  with benim as (
    select d.*, case when d.gonderen_id = auth.uid() then d.alici_id else d.gonderen_id end as kisi
      from public.direkt_mesajlar d
     where d.gonderen_id = auth.uid() or d.alici_id = auth.uid()
  ), son as (
    select distinct on (kisi) kisi, metin, created_at, gonderen_id = auth.uid() as benden
      from benim order by kisi, created_at desc
  )
  select s.kisi, p.gorunen_ad, p.gorunen_avatar, p.gorunum,
         s.metin, s.created_at, s.benden,
         (select count(*)::int from benim b where b.kisi = s.kisi and b.alici_id = auth.uid() and not b.okundu),
         public.dm_arkadas_mi(auth.uid(), s.kisi)
    from son s join public.profiles p on p.id = s.kisi
   order by s.created_at desc
   limit 200;
$$;

-- ---------------------------------------------------------------------------
-- 3) Bir kişiyle mesajlar, yeniden eskiye, sayfalı (p_once: bu andan ÖNCEKİLER)
create or replace function public.dm_sohbet(p_kisi uuid, p_limit int default 50, p_once timestamptz default null)
returns setof public.direkt_mesajlar
language sql stable security definer set search_path to 'public'
as $$
  select d.* from public.direkt_mesajlar d
   where auth.uid() is not null
     and least(d.gonderen_id, d.alici_id) = least(auth.uid(), p_kisi)
     and greatest(d.gonderen_id, d.alici_id) = greatest(auth.uid(), p_kisi)
     and (p_once is null or d.created_at < p_once)
   order by d.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

-- ---------------------------------------------------------------------------
-- 4) O kişiden gelen okunmamışları okundu yap; kaç tane olduğunu döndürür
create or replace function public.dm_okundu(p_kisi uuid)
returns int
language plpgsql security definer set search_path to 'public'
as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  update public.direkt_mesajlar set okundu = true
   where alici_id = auth.uid() and gonderen_id = p_kisi and not okundu;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Toplam okunmamış (rozetler için)
create or replace function public.dm_okunmamis_sayim()
returns int
language sql stable security definer set search_path to 'public'
as $$
  select count(*)::int from public.direkt_mesajlar
   where alici_id = auth.uid() and not okundu;
$$;

revoke all on function public.dm_gonder(uuid, text) from public, anon;
revoke all on function public.dm_sohbetlerim() from public, anon;
revoke all on function public.dm_sohbet(uuid, int, timestamptz) from public, anon;
revoke all on function public.dm_okundu(uuid) from public, anon;
revoke all on function public.dm_okunmamis_sayim() from public, anon;
grant execute on function public.dm_gonder(uuid, text) to authenticated;
grant execute on function public.dm_sohbetlerim() to authenticated;
grant execute on function public.dm_sohbet(uuid, int, timestamptz) to authenticated;
grant execute on function public.dm_okundu(uuid) to authenticated;
grant execute on function public.dm_okunmamis_sayim() to authenticated;
