-- ============================================================
-- 481 · KOZMETİK KATMANLARI — Çerçeve (kazanılan prestij) · Aura (satılık tarz)  (Ida onayı, 24 Eyl 2026)
--
--   Çerçeve = kazanılır, ASLA satılmaz: lig, turnuva, level, etkinlik (Yılbaşı, Ramazan Bayramı…).
--            Dükkânda görünmez; Profil › Koleksiyon'da (kilitliler nasıl kazanılacağıyla).
--   Aura    = avatarın ARKASINDA duran tema katmanı. Elmasla satılır (coin'le alınamaz — coin kabul
--            eden aura RPC'si yok). Dünkü temalı dükkân çerçeveleri (D 360: Bulut … Kozmik) auraya
--            dönüştü. Etkinlik aurası da olabilir (kaynak 'etkinlik', satılmaz).
--   Katman sırası (istemci, CerceveliAvatar): aura (arkada) → avatar → çerçeve (önde).
--
-- Coin'le alınmış dükkân çerçeveleri aynı temanın aurası olarak envantere taşınır; takılıysa aura
-- olarak takılı kalır (kimse bir şey kaybetmez). Eski satırlar SİLİNMEZ (dükkân çerçeveleri pasif).
-- Fiyatlar oyun_ayarlari'nda (TEST): Sıradan 75 · Nadir 150 · Epik 300 · Efsanevi 600 elmas.
-- ============================================================

-- ---------- 1. Katalog ----------
create table if not exists public.auralar (
  anahtar      text primary key,
  nadirlik     text not null check (nadirlik in ('siradan', 'nadir', 'epik', 'efsanevi')),
  kaynak       text not null check (kaynak in ('dukkan', 'etkinlik')),
  kosul        text,                          -- etkinlik: 'etkinlik:<ad>'; dükkânda null
  eski_cerceve text unique references public.cerceveler(anahtar),   -- dönüştüğü dükkân çerçevesi
  aktif        boolean not null default true,
  sira         integer not null default 0,
  ad_tr        text not null,
  ad_en        text not null
);
alter table public.auralar enable row level security;
revoke all on public.auralar from anon, authenticated;

create table if not exists public.oyuncu_auralari (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  aura         text not null references public.auralar(anahtar),
  kaynak       text not null check (kaynak in ('dukkan', 'tasima', 'etkinlik')),
  kazanildi_at timestamptz not null default now(),
  primary key (user_id, aura)
);
alter table public.oyuncu_auralari enable row level security;
revoke all on public.oyuncu_auralari from anon, authenticated;

alter table public.profiles add column if not exists takili_aura text
  references public.auralar(anahtar) on delete set null;
-- Kolon istemciye kapalı doğar (profiles kolon bazlı SELECT). Başkasının aurası oyuncu_kartlari ile.

insert into public.auralar (anahtar, nadirlik, kaynak, eski_cerceve, sira, ad_tr, ad_en) values
  ('aura_bulut',    'siradan',  'dukkan', 'dukkan_gece',    301, 'Bulut',           'Cloud'),
  ('aura_cicek',    'siradan',  'dukkan', 'dukkan_nane',    302, 'Çiçek Bahçesi',   'Flower Garden'),
  ('aura_neon',     'siradan',  'dukkan', 'dukkan_mercan',  303, 'Neon Çizgi',      'Neon Line'),
  ('aura_okyanus',  'nadir',    'dukkan', 'dukkan_okyanus', 311, 'Okyanus Dalgası', 'Ocean Wave'),
  ('aura_yildiz',   'nadir',    'dukkan', 'dukkan_zumrut',  312, 'Yıldız Tozu',     'Stardust'),
  ('aura_buz',      'nadir',    'dukkan', 'dukkan_yakut',   313, 'Buz Kristali',    'Ice Crystal'),
  ('aura_ejder',    'epik',     'dukkan', 'dukkan_ametist', 321, 'Ejder Pulu',      'Dragon Scale'),
  ('aura_simsek',   'epik',     'dukkan', 'dukkan_kutup',   322, 'Şimşek',          'Lightning'),
  ('aura_gezegen',  'epik',     'dukkan', 'dukkan_nebula',  323, 'Gezegen Halkası', 'Planet Ring'),
  ('aura_alev',     'efsanevi', 'dukkan', 'dukkan_anka',    331, 'Alev Kanatları',  'Flame Wings'),
  ('aura_kozmik',   'efsanevi', 'dukkan', 'dukkan_ejder',   332, 'Kozmik',          'Cosmic'),
  ('aura_kraliyet', 'efsanevi', 'dukkan', 'dukkan_gunes',   333, 'Kraliyet',        'Royal')
on conflict (anahtar) do update
  set nadirlik = excluded.nadirlik, kaynak = excluded.kaynak, eski_cerceve = excluded.eski_cerceve,
      sira = excluded.sira, ad_tr = excluded.ad_tr, ad_en = excluded.ad_en;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_aura_siradan', '75', 'TEST — Sıradan aura fiyatı (elmas). Ida 3 kademe verdi (150/300/600); sıradan = nadirin yarısı, karar bekliyor.'),
  ('elmas_aura_nadir', '150', 'TEST — Nadir aura fiyatı (elmas).'),
  ('elmas_aura_epik', '300', 'TEST — Epik aura fiyatı (elmas).'),
  ('elmas_aura_efsanevi', '600', 'TEST — Efsanevi aura fiyatı (elmas).')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

create or replace function public.aura_fiyati(p_nadirlik text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select nullif(public.ayar_sayi('elmas_aura_' || p_nadirlik, 0), 0)::int;
$$;
revoke all on function public.aura_fiyati(text) from public, anon, authenticated;

-- ---------- 2. Çerçeveler: dükkân kapanır, turnuva + etkinlik çerçeveleri eklenir ----------
alter table public.cerceveler drop constraint if exists cerceveler_kaynak_check;
alter table public.cerceveler add constraint cerceveler_kaynak_check
  check (kaynak in ('lig', 'level', 'etkinlik', 'dukkan', 'turnuva'));

insert into public.cerceveler (anahtar, nadirlik, kaynak, fiyat, kosul, aktif, sira, ad_tr, ad_en) values
  ('turnuva_sampiyon', 'epik',  'turnuva',  null, 'turnuva:1',         true, 151, 'Turnuva Şampiyonu', 'Tournament Champion'),
  ('etkinlik_yilbasi', 'nadir', 'etkinlik', null, 'etkinlik:yilbasi',  true, 401, 'Yılbaşı',           'New Year'),
  ('etkinlik_ramazan', 'nadir', 'etkinlik', null, 'etkinlik:ramazan',  true, 402, 'Ramazan Bayramı',   'Eid al-Fitr')
on conflict (anahtar) do update
  set nadirlik = excluded.nadirlik, kaynak = excluded.kaynak, kosul = excluded.kosul,
      sira = excluded.sira, ad_tr = excluded.ad_tr, ad_en = excluded.ad_en, aktif = true;

-- ---------- 3. Taşıma: coin'le alınmış dükkân çerçevesi → aynı temanın aurası ----------
insert into public.oyuncu_auralari (user_id, aura, kaynak, kazanildi_at)
select oc.user_id, a.anahtar, 'tasima', oc.kazanildi_at
  from public.oyuncu_cerceveleri oc
  join public.auralar a on a.eski_cerceve = oc.cerceve
on conflict do nothing;

-- Takılıysa aura olarak takılı kalır; çerçeve yuvası boşalır (dükkân çerçevesi artık çizilmez)
update public.profiles p
   set takili_aura = a.anahtar,
       takili_cerceve = null
  from public.auralar a
 where a.eski_cerceve = p.takili_cerceve;

-- Satırlar durur (geçmiş), yalnız pasif: katalogda/koleksiyonda görünmez, takılamaz, satılmaz.
update public.cerceveler set aktif = false where kaynak = 'dukkan';

-- Geçmiş turnuva şampiyonları çerçevesini alır (takmadan)
insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak)
select distinct t.kazanan, 'turnuva_sampiyon', 'turnuva'
  from public.tournaments t
  join public.profiles p on p.id = t.kazanan and not coalesce(p.is_bot, false)
 where t.durum = 'bitti' and t.kazanan is not null
on conflict do nothing;

-- Turnuva birincisi: elmas (480) + şampiyon çerçevesi
create or replace function public.trg_elmas_turnuva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.elmas_ekle(new.kazanan, public.ayar_sayi('elmas_turnuva_1', 10)::int, 'turnuva',
                            'birinci:' || new.id::text);
  if not exists (select 1 from public.profiles where id = new.kazanan and coalesce(is_bot, false)) then
    perform public.cerceve_ver(new.kazanan, 'turnuva_sampiyon', 'turnuva');
  end if;
  return null;
exception when others then
  raise warning 'turnuva elmasi/cercevesi verilemedi (%): %', new.id, sqlerrm;
  return null;
end;
$$;

-- ---------- 4. Çerçeve RPC'leri: pasif çerçeve listelenmez / takılamaz ----------
create or replace function public.cercevelerim()
returns table(anahtar text, ad text, nadirlik text, kaynak text, kazanildi_at timestamptz, takili boolean)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_takili text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  select p.takili_cerceve into v_takili from public.profiles p where p.id = v_me;
  return query
  select c.anahtar, case when v_en then c.ad_en else c.ad_tr end, c.nadirlik, c.kaynak,
         o.kazanildi_at, (c.anahtar = v_takili)
    from public.oyuncu_cerceveleri o
    join public.cerceveler c on c.anahtar = o.cerceve
   where o.user_id = v_me and c.aktif
   order by c.sira;
end;
$function$;

create or replace function public.cerceve_tak(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_me uuid := auth.uid();
  v_lig text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('cerceve_tak', 20, interval '60 seconds');
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null and not exists (
       select 1 from public.oyuncu_cerceveleri o
         join public.cerceveler c on c.anahtar = o.cerceve and c.aktif
        where o.user_id = v_me and o.cerceve = p_anahtar) then
    raise exception 'Bu çerçeve sende yok';
  end if;
  v_lig := case when p_anahtar like 'lig\_%' then substr(p_anahtar, 5) else null end;
  update public.profiles
     set takili_cerceve = p_anahtar,
         gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', v_lig, 'lig_cerceve_elle', true)
   where id = v_me;
  return jsonb_build_object('takili', p_anahtar);
end;
$function$;

-- Çerçeve satılmaz (dükkân çerçeveleri pasif; bu fonksiyon eski istemci için yalnız reddeder)
create or replace function public.cerceve_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  raise exception 'Çerçeveler satılmaz, kazanılır';
end;
$function$;

-- ---------- 5. Aura RPC'leri ----------
create or replace function public.aura_katalogu()
returns table(anahtar text, ad text, ad_tr text, ad_en text, nadirlik text, kaynak text, fiyat integer,
              kosul text, sira integer, satilik boolean, sahip boolean, takili boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_takili text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  select p.takili_aura into v_takili from public.profiles p where p.id = v_me;
  return query
  select a.anahtar, case when v_en then a.ad_en else a.ad_tr end, a.ad_tr, a.ad_en, a.nadirlik, a.kaynak,
         case when a.kaynak = 'dukkan' then public.aura_fiyati(a.nadirlik) end,
         a.kosul, a.sira,
         (a.kaynak = 'dukkan' and public.aura_fiyati(a.nadirlik) is not null),
         exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = a.anahtar),
         (a.anahtar = v_takili)
    from public.auralar a
   where a.aktif
      or exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = a.anahtar)
   order by a.sira;
end;
$$;

-- Aura yalnız ELMASLA alınır. Tek işlem, profil FOR UPDATE (elmas_harca). Takmaz.
create or replace function public.aura_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_a public.auralar%rowtype;
  v_fiyat int;
  v_bakiye int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('aura_satin_al', 20, interval '60 seconds');
  select * into v_a from public.auralar a where a.anahtar = p_anahtar;
  if not found or not v_a.aktif then raise exception 'Böyle bir aura yok'; end if;
  v_fiyat := public.aura_fiyati(v_a.nadirlik);
  if v_a.kaynak <> 'dukkan' or v_fiyat is null then raise exception 'Bu aura satılmıyor'; end if;

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = v_a.anahtar) then
    raise exception 'Bu aura zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, 'aura', v_a.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_auralari (user_id, aura, kaynak) values (v_me, v_a.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_a.anahtar, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$$;

create or replace function public.aura_tak(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('aura_tak', 20, interval '60 seconds');
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null and not exists (
       select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = p_anahtar) then
    raise exception 'Bu aura sende yok';
  end if;
  update public.profiles set takili_aura = p_anahtar where id = v_me;
  return jsonb_build_object('takili', p_anahtar);
end;
$$;

-- İç yardımcı: etkinlik aurası vermek için (ileride etkinlik ödülleri)
create or replace function public.aura_ver(p_user uuid, p_aura text, p_kaynak text default 'etkinlik')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_yeni boolean;
begin
  if p_user is null or p_aura is null then return false; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return false; end if;
  insert into public.oyuncu_auralari (user_id, aura, kaynak) values (p_user, p_aura, coalesce(p_kaynak, 'etkinlik'))
  on conflict do nothing returning true into v_yeni;
  return coalesce(v_yeni, false);
end;
$$;
revoke all on function public.aura_ver(uuid, text, text) from public, anon, authenticated;

revoke all on function public.aura_katalogu() from public, anon;
grant execute on function public.aura_katalogu() to authenticated;
revoke all on function public.aura_satin_al(text) from public, anon;
grant execute on function public.aura_satin_al(text) to authenticated;
revoke all on function public.aura_tak(text) from public, anon;
grant execute on function public.aura_tak(text) to authenticated;

-- ---------- 6. Oyuncu kartı: aura alanı (maç şeridi, lig tablosu, VS, profil — CerceveliAvatar) ----------
-- Dönüş tipine kolon eklendiği için DROP + CREATE; yetkiler 331'dekiyle birebir aynı yeniden verilir.
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text,
              vitrin jsonb, aura text)
language sql
stable
security definer
set search_path = public
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
         p.takili_aura
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated;

-- lig_grubum_ozet satırlarına aura (ana sayfa canlı lig kartı; ek sorgu yok — aynı kart)
create or replace function public.lig_grubum_ozet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_me uuid := auth.uid();
  v_tum jsonb;
  v_satirlar jsonb;
  v_ben record;
  v_boyu int; v_lig text; v_yuk int; v_dus int; v_bitis timestamptz;
  v_ust_puan int; v_cizgi_puan int;
  v_yuk_sira int; v_dus_sira int;
  v_bolge text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Mevcut lig_grubum() (görünürlük kuralları onda) tek kez çağrılır
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', g.sira, 'user_id', g.user_id, 'puan', g.puan, 'ben', g.ben, 'lig', g.lig,
           'yukselen', g.yukselen, 'dusen', g.dusen, 'sezon_bitis', g.sezon_bitis)), '[]'::jsonb)
    into v_tum
    from public.lig_grubum() g;

  select * into v_ben from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean,
    lig text, yukselen int, dusen int, sezon_bitis timestamptz) where o.ben limit 1;
  if not found then return null; end if;

  v_lig := v_ben.lig; v_yuk := v_ben.yukselen; v_dus := v_ben.dusen; v_bitis := v_ben.sezon_bitis;
  v_boyu := jsonb_array_length(v_tum);   -- oyuncunun gördüğü tablo boyu

  v_yuk_sira := case when v_lig = 'efsane' then null else least(v_yuk, v_boyu) end;
  v_dus_sira := case when v_lig = 'bronz' or v_boyu <= v_dus then null else v_boyu - v_dus + 1 end;

  select o.puan into v_ust_puan from jsonb_to_recordset(v_tum) as o(sira bigint, puan int) where o.sira = v_ben.sira - 1;
  select o.puan into v_cizgi_puan from jsonb_to_recordset(v_tum) as o(sira bigint, puan int) where o.sira = v_yuk_sira;

  v_bolge := case
    when v_yuk_sira is not null and v_ben.sira <= v_yuk_sira and coalesce(v_ben.puan, 0) > 0 then 'yukselme'
    when v_dus_sira is not null and v_ben.sira >= v_dus_sira then 'dusme'
    else 'guvenli' end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', o.sira, 'user_id', o.user_id, 'puan', o.puan, 'ben', o.ben,
           'ad', k.ad, 'avatar', k.avatar, 'level', k.level, 'lig', k.lig,
           'cerceve', k.cerceve, 'cerceve_nadirlik', k.cerceve_nadirlik, 'vitrin', k.vitrin,
           'aura', k.aura)
           order by o.sira), '[]'::jsonb)
    into v_satirlar
    from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean)
    left join lateral public.oyuncu_kartlari(array[o.user_id]) k on true
   where o.sira between v_ben.sira - 2 and v_ben.sira + 2;

  return jsonb_build_object(
    'lig', v_lig,
    'ust_lig', case when v_lig = 'efsane' then null else public.lig_adi(public.lig_sirasi(v_lig) + 1) end,
    'alt_lig', case when v_lig = 'bronz' then null else public.lig_adi(public.lig_sirasi(v_lig) - 1) end,
    'grup_boyu', v_boyu,
    'sira', v_ben.sira,
    'puan', v_ben.puan,
    'yukselen', v_yuk,
    'dusen', v_dus,
    'yukselme_sirasi', v_yuk_sira,
    'dusme_sirasi', v_dus_sira,
    'bolge', v_bolge,
    'ust_siraya_fark', case when v_ust_puan is null then null else greatest(v_ust_puan - v_ben.puan, 0) + 1 end,
    'yukselme_cizgisine_fark', case
        when v_yuk_sira is null then null
        when v_bolge = 'yukselme' then 0
        else greatest(coalesce(v_cizgi_puan, 0) - coalesce(v_ben.puan, 0), 0) + 1 end,
    'hafta_bitis', v_bitis,
    'satirlar', v_satirlar);
end;
$function$;
