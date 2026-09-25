-- 646: Koleksiyon Puanı (Ida, 25 Eyl 2026) — oyun avantajı YOK, yalnız statü.
--
-- Puan = oyuncunun sahip olduğu KALICI şeylerin nadirliğe göre ağırlıklı toplamı.
--   Ağırlıklar oyun_ayarlari'nda: Sıradan 1 · Nadir 3 · Epik 5 · Efsanevi 10 (`koleksiyon_agirlik_*`).
--   Kalemler (koleksiyon_kalemleri):
--     rozet      → rozetin KADEMESİ: bronz = sıradan · gümüş = nadir · altın = epik · elmas = efsanevi
--     çerçeve    → kazanılan (dükkân dışı) aktif çerçeve: cerceveler.nadirlik (lig, level, turnuva)
--     aura       → sahip olunan aktif dükkân aurası: auralar.nadirlik
--     unvan      → unvan_tanimlari.nadirlik      ┐
--     kozmetik   → kozmetikler.nadirlik          ├ BU SÜTUNLAR BOŞ: nadirlik tanımsız → puana girmez (uydurulmadı).
--     avatar     → avatar_katalogu.nadirlik      ┘   Ida değeri yazınca (update … set nadirlik) koleksiyon_hepsini_yenile() çalıştırılır.
--     ek         → koleksiyon_ek_kalemleri: ileride Battle Pass ödülleri ve başka kalıcı kalemler için hazır kanca;
--                  ödül bu tabloya (user_id, tur, anahtar, nadirlik) yazılınca puana kendiliğinden girer. Mevcut
--                  ödül fonksiyonları (rozet_ver, cerceve_ver, kozmetik_ver) zaten kendi tablolarına yazdığı için
--                  onlardan gelen ödüller ayrıca bir şey gerektirmez.
-- Önbellek: profiles.koleksiyon_puani; sahiplik tabloları değişince (INSERT/DELETE, deyim düzeyinde tetikleyici) o
-- oyuncular yeniden hesaplanır. oyuncu_kartlari.koleksiyon_puani (N+1 yok). Gizli botlar da puanlıdır (kendi rozet/çerçeve
-- satırlarından); açık botlar sıralamada yoktur. is_bot istemciye sızmaz.
-- Yetki: yeni tablo RLS açık (yalnız RPC); dökümler/sıralama yalnız authenticated; iç yardımcılar service_role.
-- oyuncu_kartlari dönüş tipi değiştiği için DROP/CREATE, eski yetki birebir geri.

-- ---------------------------------------------------------------------------
-- 1) Ayarlar, sütunlar, ek tablo
-- ---------------------------------------------------------------------------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('koleksiyon_agirlik_siradan', to_jsonb(1), '646: Koleksiyon Puanı ağırlığı — sıradan'),
  ('koleksiyon_agirlik_nadir', to_jsonb(3), '646: Koleksiyon Puanı ağırlığı — nadir'),
  ('koleksiyon_agirlik_epik', to_jsonb(5), '646: Koleksiyon Puanı ağırlığı — epik'),
  ('koleksiyon_agirlik_efsanevi', to_jsonb(10), '646: Koleksiyon Puanı ağırlığı — efsanevi')
on conflict (anahtar) do nothing;

alter table public.profiles add column if not exists koleksiyon_puani integer not null default 0;

alter table public.unvan_tanimlari add column if not exists nadirlik text
  check (nadirlik is null or nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi'));
alter table public.kozmetikler add column if not exists nadirlik text
  check (nadirlik is null or nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi'));
alter table public.avatar_katalogu add column if not exists nadirlik text
  check (nadirlik is null or nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi'));

create table if not exists public.koleksiyon_ek_kalemleri (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tur text not null,
  anahtar text not null,
  nadirlik text not null check (nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi')),
  kazanildi_at timestamptz not null default now(),
  primary key (user_id, tur, anahtar)
);
alter table public.koleksiyon_ek_kalemleri enable row level security;   -- politika yok: yalnız sunucu/RPC

-- ---------------------------------------------------------------------------
-- 2) Kalemler ve puan (tek kaynak)
-- ---------------------------------------------------------------------------
create or replace function public.koleksiyon_agirlik(p_nadirlik text)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when p_nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi')
              then public.ayar_sayi('koleksiyon_agirlik_' || p_nadirlik, 0)::int else 0 end;
$$;
revoke all on function public.koleksiyon_agirlik(text) from public, anon, authenticated;
grant execute on function public.koleksiyon_agirlik(text) to service_role;

-- Oyuncunun sahip olduğu kalıcı kalemler: (tur, anahtar, nadirlik). nadirlik null = tanımsız (puana girmez).
create or replace function public.koleksiyon_kalemleri(p_user uuid)
returns table (tur text, anahtar text, nadirlik text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select 'rozet'::text, r.rozet,
         case t.kademe when 'bronz' then 'siradan' when 'gumus' then 'nadir' when 'altin' then 'epik' when 'elmas' then 'efsanevi' end
    from public.oyuncu_rozetleri r join public.rozet_tanimlari t on t.anahtar = r.rozet and t.aktif
   where r.user_id = p_user
  union all
  select 'cerceve', c.anahtar, c.nadirlik
    from public.oyuncu_cerceveleri o join public.cerceveler c on c.anahtar = o.cerceve
   where o.user_id = p_user and c.aktif and c.kaynak <> 'dukkan'
  union all
  select 'aura', a.anahtar, a.nadirlik
    from public.oyuncu_auralari o join public.auralar a on a.anahtar = o.aura
   where o.user_id = p_user and a.aktif
  union all
  select 'unvan', t.anahtar, t.nadirlik
    from public.oyuncu_unvan_listesi(p_user) k join public.unvan_tanimlari t on t.anahtar = k.anahtar
  union all
  select 'kozmetik', k.anahtar, k.nadirlik
    from public.oyuncu_kozmetikleri o join public.kozmetikler k on k.anahtar = o.kozmetik
   where o.user_id = p_user and k.aktif and k.onay = 'girsin'
  union all
  select 'avatar', a.anahtar, a.nadirlik
    from public.oyuncu_avatarlari o join public.avatar_katalogu a on a.url = o.avatar or a.anahtar = o.avatar
   where o.user_id = p_user and a.aktif
  union all
  select e.tur, e.anahtar, e.nadirlik from public.koleksiyon_ek_kalemleri e where e.user_id = p_user;
$$;
revoke all on function public.koleksiyon_kalemleri(uuid) from public, anon, authenticated;
grant execute on function public.koleksiyon_kalemleri(uuid) to service_role;

create or replace function public.koleksiyon_puani_hesapla(p_user uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(sum(public.koleksiyon_agirlik(k.nadirlik)), 0)::int from public.koleksiyon_kalemleri(p_user) k;
$$;
revoke all on function public.koleksiyon_puani_hesapla(uuid) from public, anon, authenticated;
grant execute on function public.koleksiyon_puani_hesapla(uuid) to service_role;

create or replace function public.koleksiyon_yenile(p_user uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.profiles set koleksiyon_puani = public.koleksiyon_puani_hesapla(p_user)
   where id = p_user and koleksiyon_puani is distinct from public.koleksiyon_puani_hesapla(p_user);
$$;
revoke all on function public.koleksiyon_yenile(uuid) from public, anon, authenticated;
grant execute on function public.koleksiyon_yenile(uuid) to service_role;

-- Ağırlık / nadirlik / katalog değişince elle çalıştırılır: select public.koleksiyon_hepsini_yenile();
create or replace function public.koleksiyon_hepsini_yenile()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare v int := 0; r record;
begin
  for r in select id from public.profiles loop
    perform public.koleksiyon_yenile(r.id);
    v := v + 1;
  end loop;
  return v;
end;
$$;
revoke all on function public.koleksiyon_hepsini_yenile() from public, anon, authenticated;
grant execute on function public.koleksiyon_hepsini_yenile() to service_role;

-- ---------------------------------------------------------------------------
-- 3) Sahiplik değişince güncelle (deyim düzeyi; bot toplu üretimi tek deyimde bir kez hesaplanır)
-- ---------------------------------------------------------------------------
create or replace function public.trg_koleksiyon_ekle() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare r record;
begin
  for r in select distinct user_id from yeni loop perform public.koleksiyon_yenile(r.user_id); end loop;
  return null;
end $$;
create or replace function public.trg_koleksiyon_sil() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare r record;
begin
  for r in select distinct user_id from eski where exists (select 1 from public.profiles p where p.id = eski.user_id) loop
    perform public.koleksiyon_yenile(r.user_id);
  end loop;
  return null;
end $$;
revoke all on function public.trg_koleksiyon_ekle() from public, anon, authenticated;
revoke all on function public.trg_koleksiyon_sil() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['oyuncu_rozetleri', 'oyuncu_cerceveleri', 'oyuncu_auralari', 'oyuncu_unvanlari', 'oyuncu_kozmetikleri',
                           'oyuncu_avatarlari', 'koleksiyon_ek_kalemleri'] loop
    execute format('drop trigger if exists trg_koleksiyon_ekle on public.%I', t);
    execute format('create trigger trg_koleksiyon_ekle after insert on public.%I referencing new table as yeni for each statement execute function public.trg_koleksiyon_ekle()', t);
    execute format('drop trigger if exists trg_koleksiyon_sil on public.%I', t);
    execute format('create trigger trg_koleksiyon_sil after delete on public.%I referencing old table as eski for each statement execute function public.trg_koleksiyon_sil()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Oyuncu kartı: + koleksiyon_puani
-- ---------------------------------------------------------------------------
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text, premium_cerceve text, premium_aura text, sehir_sampiyonu jsonb, unvan jsonb, koleksiyon_puani integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select p.id, p.gorunen_ad, p.gorunen_avatar, coalesce(p.level, 1), coalesce(p.lig, 'bronz'),
         case when c.aktif then p.takili_cerceve end, case when c.aktif then c.nadirlik end,
         coalesce((
           select jsonb_agg(jsonb_build_object('anahtar', t.anahtar, 'grup', t.grup, 'kademe', t.kademe, 'ikon', t.ikon)
                            order by v.ord)
             from unnest(p.vitrin_rozetleri) with ordinality as v(anahtar, ord)
             join public.rozet_tanimlari t on t.anahtar = v.anahtar
             join public.oyuncu_rozetleri r on r.user_id = p.id and r.rozet = v.anahtar
         ), '[]'::jsonb),
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'aura')
              when public.aura_aktif_mi(p.takili_aura) then p.takili_aura end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'vs_karti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_vs_karti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_isim_efekti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'zafer_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_zafer_efekti and k.aktif and k.onay = 'girsin') end,
         -- 560: premium — gizli botta her zaman null; insanda yalnız aktif ('girsin') kalem
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_cerceve and k.tur = 'premium_cerceve'
                       and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_aura and k.tur = 'premium_aura'
                       and k.aktif and k.onay = 'girsin') end,
         -- 641: geçen haftanın şehir şampiyonu ise bu hafta boyunca unvan (kaynak lig_arsiv)
         ss.j,
         -- 643: görünen unvan — aktif şehir şampiyonluğu önce; yoksa takılı unvan (kazanılmışsa);
         --      gizli bot kazandığı unvanlardan kimliğinden sabit birini (ya da hiçbirini) taşır.
         coalesce(
           case when ss.j is not null then jsonb_build_object('tur', 'sehir', 'sehir', ss.j ->> 'sehir', 'ulke', ss.j ->> 'ulke') end,
           (select jsonb_build_object('tur', t.tur, 'anahtar', t.anahtar, 'tr', t.ad_tr, 'en', t.ad_en)
              from public.unvan_tanimlari t
             where t.aktif and t.anahtar = case
                     when gb.gizli then (select l.anahtar from public.oyuncu_unvan_listesi(p.id) l
                                          where abs(hashtext(p.id::text || ':unvan')) % 3 <> 0
                                          order by md5(p.id::text || l.anahtar) limit 1)
                     else p.takili_unvan end
               and exists (select 1 from public.oyuncu_unvan_listesi(p.id) l where l.anahtar = t.anahtar)))
         -- 646: koleksiyon puanı (profiles.koleksiyon_puani önbelleği; sahiplik değişince tetikleyiciler günceller)
         ,coalesce(p.koleksiyon_puani, 0)
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
    left join lateral (select jsonb_build_object('sehir', a.sehir, 'ulke', a.ulke, 'hafta', a.hafta) as j
                         from public.lig_arsiv a
                        where a.user_id = p.id and a.hafta = public.hafta_basi() - 7 and a.sehir_sampiyonu) ss on true
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
-- Eski yetkinin birebir aynısı (önce: postgres, authenticated, service_role).
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 5) Profil dökümü ve Koleksiyoncular sıralaması
-- ---------------------------------------------------------------------------
-- Kendi dökümüm: { puan, sira, kategoriler: {rozet:{adet,puan}, …}, nadirlik: {siradan:{adet,puan}, …, tanimsiz:{adet}}, agirliklar }
create or replace function public.koleksiyon_dokum()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_kat jsonb;
  v_nad jsonb;
  v_puan int;
  v_sira bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select coalesce(jsonb_object_agg(x.tur, jsonb_build_object('adet', x.adet, 'puan', x.puan)), '{}'::jsonb) into v_kat
    from (select k.tur, count(*) adet, coalesce(sum(public.koleksiyon_agirlik(k.nadirlik)), 0)::int puan
            from public.koleksiyon_kalemleri(v_me) k group by k.tur) x;
  select jsonb_build_object(
           'siradan', jsonb_build_object('adet', count(*) filter (where nadirlik = 'siradan'), 'puan', coalesce(sum(public.koleksiyon_agirlik(nadirlik)) filter (where nadirlik = 'siradan'), 0)),
           'nadir', jsonb_build_object('adet', count(*) filter (where nadirlik = 'nadir'), 'puan', coalesce(sum(public.koleksiyon_agirlik(nadirlik)) filter (where nadirlik = 'nadir'), 0)),
           'epik', jsonb_build_object('adet', count(*) filter (where nadirlik = 'epik'), 'puan', coalesce(sum(public.koleksiyon_agirlik(nadirlik)) filter (where nadirlik = 'epik'), 0)),
           'efsanevi', jsonb_build_object('adet', count(*) filter (where nadirlik = 'efsanevi'), 'puan', coalesce(sum(public.koleksiyon_agirlik(nadirlik)) filter (where nadirlik = 'efsanevi'), 0)),
           'tanimsiz', jsonb_build_object('adet', count(*) filter (where nadirlik is null))) into v_nad
    from public.koleksiyon_kalemleri(v_me);
  select p.koleksiyon_puani into v_puan from public.profiles p where p.id = v_me;
  select 1 + count(*) into v_sira from public.profiles p where p.koleksiyon_puani > coalesce(v_puan, 0)
     and not public.acik_bot_mu(p.is_bot, p.bot_turu) and coalesce(p.toplam_mac, 0) >= 1
     and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true));
  return jsonb_build_object('puan', coalesce(v_puan, 0), 'sira', v_sira, 'kategoriler', v_kat, 'nadirlik', v_nad,
    'agirliklar', jsonb_build_object('siradan', public.koleksiyon_agirlik('siradan'), 'nadir', public.koleksiyon_agirlik('nadir'),
                                     'epik', public.koleksiyon_agirlik('epik'), 'efsanevi', public.koleksiyon_agirlik('efsanevi')));
end;
$$;
revoke all on function public.koleksiyon_dokum() from public, anon;
grant execute on function public.koleksiyon_dokum() to authenticated, service_role;

-- Koleksiyoncular (tüm zamanlar): lig_siralama ile aynı görünürlük; ilk 100 + ben. puan > 0.
create or replace function public.koleksiyon_siralama()
returns table (sira bigint, user_id uuid, gorunen_ad text, gorunen_avatar text, puan integer, ben boolean)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  return query
  with sirali as (
    select p.id, p.gorunen_ad as p_ad, p.gorunen_avatar as p_av, p.koleksiyon_puani as p_puan,
           row_number() over (order by p.koleksiyon_puani desc, p.gorunen_ad asc, p.id asc) as p_sira
      from public.profiles p
     where coalesce(p.toplam_mac, 0) >= 1
       and (p.koleksiyon_puani > 0 or p.id = v_me)
       and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true))
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)
       and ((public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
             and (coalesce(p.is_bot, false) or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac)))
            or p.id = v_me)
  )
  select s.p_sira, s.id, s.p_ad, s.p_av, s.p_puan, (s.id = v_me)
    from sirali s where s.p_sira <= 100 or s.id = v_me order by s.p_sira;
end;
$$;
revoke all on function public.koleksiyon_siralama() from public, anon;
grant execute on function public.koleksiyon_siralama() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Geriye dönük: herkes için hesapla
-- ---------------------------------------------------------------------------
select public.koleksiyon_hepsini_yenile();
