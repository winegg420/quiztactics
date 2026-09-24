-- ============================================================
-- 540 · ELMAS KOZMETİKLERİ — VS kartı · İsim efekti · Zafer efekti · Tepki paketi  (Ida onayı, 24 Eyl 2026)
--
--   VS kartı      : rakip aranırken, VS anında ve profil başlığında kartının arka planı (6 tema). 150 elmas.
--   İsim efekti   : lig tablosu, maç şeridi, maç sonu ve profilde adının görünümü (6 efekt). 100 elmas.
--   Zafer efekti  : kazanınca maç sonu sahnesine eklenen efekt; rakip de görür (5 efekt). 200 elmas.
--   Tepki paketi  : maç içi tepki (emote) paketleri — "Eğlence" · "Rekabet". 100 elmas.
--                   Bedava 4 tepki (👏 😎 😅 🤔) herkeste; paket takılmaz, sahip olunca kullanılır.
--   Aura (481)    : DOKUNULMAZ — satışı aynen sürer. Yalnız Ida'nın satış seçimi (onay) kolonu eklenir;
--                   bu seçim aura SATIŞINI DEĞİŞTİRMEZ, yalnız botların aura takmasını belirler.
--
-- SATIŞ KAPISI (sunucuda): yeni bir kalem normal oyuncuya ancak
--     aktif  VE  onay = 'girsin' (Ida /kozmetik-onizleme'de seçer)  VE  kozmetik_satis_acik (520)
--   olduğunda görünür ve satılır. Sahip olunan kalem (satın alınmış) her zaman görünür/takılır.
-- SAHİP TEST MODU: sahip_mi() hesabı satın almadan her kalemi takıp çıkarabilir ve bütün tepkileri
--   kullanabilir (yalnız sunucu kontrolü). Takılan kalem gerçek maçta rakibe de görünür.
-- BOTLAR: gizli botlar level'e göre, bot kimliğinden deterministik ve yalnız SATIŞTAKİ + 'girsin'
--   kalemlerden takar (satış kapalıyken hiçbir şey). Botlara etkinlik kozmetiği yok. Açık botlar takmaz.
-- Rakamlar oyun_ayarlari'nda (TEST).
-- ============================================================

-- ---------- 1. Katalog + sahiplik + takılı yuvalar ----------
create table if not exists public.kozmetikler (
  anahtar      text primary key check (anahtar ~ '^[a-z0-9_]{2,40}$'),
  tur          text not null check (tur in ('vs_karti', 'isim_efekti', 'zafer_efekti', 'tepki_paketi')),
  ad_tr        text not null,
  ad_en        text not null,
  fiyat_elmas  integer check (fiyat_elmas is null or fiyat_elmas > 0),   -- boş = ayar elmas_<tur>
  icerik       jsonb not null default '{}'::jsonb,                        -- tepki paketi: {"tepkiler": [...]}
  bot_min_level integer not null default 1,                               -- bot ataması: bu level'den itibaren
  aktif        boolean not null default true,
  onay         text not null default 'bekliyor' check (onay in ('bekliyor', 'girsin', 'girmesin')),
  onay_zamani  timestamptz,
  sira         integer not null default 0
);
alter table public.kozmetikler enable row level security;
revoke all on public.kozmetikler from public, anon, authenticated;

create table if not exists public.oyuncu_kozmetikleri (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  kozmetik  text not null references public.kozmetikler(anahtar) on update cascade,
  kaynak    text not null default 'dukkan' check (kaynak in ('dukkan', 'hediye', 'etkinlik')),
  alindi    timestamptz not null default now(),
  primary key (user_id, kozmetik)
);
alter table public.oyuncu_kozmetikleri enable row level security;
revoke all on public.oyuncu_kozmetikleri from public, anon, authenticated;

-- Takılı yuvalar (tepki paketi takılmaz). Kolonlar istemciye kapalı doğar (profiles kolon bazlı SELECT);
-- başkasınınki oyuncu_kartlari ile okunur.
alter table public.profiles add column if not exists takili_vs_karti text
  references public.kozmetikler(anahtar) on delete set null;
alter table public.profiles add column if not exists takili_isim_efekti text
  references public.kozmetikler(anahtar) on delete set null;
alter table public.profiles add column if not exists takili_zafer_efekti text
  references public.kozmetikler(anahtar) on delete set null;

-- Aura satış seçimi (yalnız bot ataması için; aura satışı 481'deki gibi sürer)
alter table public.auralar add column if not exists onay text not null default 'bekliyor';
do $$ begin
  alter table public.auralar add constraint auralar_onay_check check (onay in ('bekliyor', 'girsin', 'girmesin'));
exception when duplicate_object then null; end $$;
alter table public.auralar add column if not exists onay_zamani timestamptz;

insert into public.kozmetikler (anahtar, tur, ad_tr, ad_en, icerik, bot_min_level, sira) values
  ('vs_uzay',        'vs_karti', 'Uzay',        'Space',       '{}', 5,  101),
  ('vs_orman',       'vs_karti', 'Orman',       'Forest',      '{}', 5,  102),
  ('vs_neon_sehir',  'vs_karti', 'Neon Şehir',  'Neon City',   '{}', 10, 103),
  ('vs_okyanus',     'vs_karti', 'Okyanus',     'Ocean',       '{}', 5,  104),
  ('vs_volkan',      'vs_karti', 'Volkan',      'Volcano',     '{}', 15, 105),
  ('vs_sakura',      'vs_karti', 'Sakura',      'Sakura',      '{}', 10, 106),
  ('isim_altin',       'isim_efekti', 'Altın',       'Gold',        '{}', 10, 201),
  ('isim_gokkusagi',   'isim_efekti', 'Gökkuşağı',   'Rainbow',     '{}', 20, 202),
  ('isim_neon_mavi',   'isim_efekti', 'Neon Mavi',   'Neon Blue',   '{}', 5,  203),
  ('isim_alev',        'isim_efekti', 'Alev',        'Flame',       '{}', 15, 204),
  ('isim_buz',         'isim_efekti', 'Buz',         'Ice',         '{}', 5,  205),
  ('isim_mor_isilti',  'isim_efekti', 'Mor Işıltı',  'Purple Glow', '{}', 10, 206),
  ('zafer_havai_fisek',    'zafer_efekti', 'Havai Fişek',    'Fireworks',    '{}', 15, 301),
  ('zafer_altin_yagmuru',  'zafer_efekti', 'Altın Yağmuru',  'Gold Rain',    '{}', 25, 302),
  ('zafer_ejder_alevi',    'zafer_efekti', 'Ejder Alevi',    'Dragon Fire',  '{}', 35, 303),
  ('zafer_kar_firtinasi',  'zafer_efekti', 'Kar Fırtınası',  'Snowstorm',    '{}', 15, 304),
  ('zafer_yildiz_yagmuru', 'zafer_efekti', 'Yıldız Yağmuru', 'Star Shower',  '{}', 20, 305),
  ('tepki_eglence', 'tepki_paketi', 'Eğlence', 'Fun',         '{"tepkiler": ["gulen", "ates", "hedef", "tac"]}', 5,  401),
  ('tepki_rekabet', 'tepki_paketi', 'Rekabet', 'Competition', '{"tepkiler": ["kas", "korku", "selam", "rica"]}', 10, 402)
on conflict (anahtar) do update
  set tur = excluded.tur, ad_tr = excluded.ad_tr, ad_en = excluded.ad_en, icerik = excluded.icerik,
      bot_min_level = excluded.bot_min_level, sira = excluded.sira;

-- ---------- 2. Ayarlar (TEST) ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_vs_karti', '150', 'TEST — VS kartı teması fiyatı (elmas).'),
  ('elmas_isim_efekti', '100', 'TEST — İsim efekti fiyatı (elmas).'),
  ('elmas_zafer_efekti', '200', 'TEST — Zafer efekti fiyatı (elmas).'),
  ('elmas_tepki_paketi', '100', 'TEST — Tepki paketi fiyatı (elmas).'),
  ('bot_kozmetik_taban_yuzde', '10', 'TEST — Gizli botun bir kozmetik türünü takma olasılığı, taban (%). Yalnız satıştaki + girsin kalemlerden.'),
  ('bot_kozmetik_level_yuzde', '0.6', 'TEST — Level başına eklenen takma olasılığı (%).'),
  ('bot_kozmetik_max_yuzde', '55', 'TEST — Takma olasılığının tavanı (%).')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kozmetik_satis_acik', 'false', 'Yeni kozmetikler (avatar, çerçeve tarzı, elmas kozmetikleri) normal oyuncuya açık mı. Ida onaylayınca true.')
on conflict (anahtar) do nothing;

-- ---------- 3. Yardımcılar ----------
create or replace function public.kozmetik_fiyati(p_tur text, p_fiyat integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_fiyat, nullif(public.ayar_sayi('elmas_' || p_tur, 0), 0))::int;
$$;
revoke all on function public.kozmetik_fiyati(text, integer) from public, anon, authenticated;

-- Normal oyuncuya satışta mı (bayrak + Ida onayı + aktif + fiyatlı)
create or replace function public.kozmetik_satista(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select k.aktif and k.onay = 'girsin'
                          and public.kozmetik_fiyati(k.tur, k.fiyat_elmas) is not null
                     from public.kozmetikler k where k.anahtar = p_anahtar), false)
     and public.kozmetik_satis_acik_mi();
$$;
revoke all on function public.kozmetik_satista(text) from public, anon, authenticated;

-- ---------- 4. Oyuncu RPC'leri ----------
-- Katalog + durumum. Normal oyuncu: satıştakiler + sahip oldukları. Sahip: hepsi (kapali = satışta değil).
create or replace function public.kozmetik_katalogu()
returns table(anahtar text, tur text, ad text, ad_tr text, ad_en text, fiyat integer, icerik jsonb, sira integer,
              satilik boolean, sahip boolean, takili boolean, kapali boolean, onay text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_sahip_hesap boolean;
  p record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  v_sahip_hesap := public.sahip_mi();
  select pr.takili_vs_karti, pr.takili_isim_efekti, pr.takili_zafer_efekti into p
    from public.profiles pr where pr.id = v_me;
  return query
  select k.anahtar, k.tur, case when v_en then k.ad_en else k.ad_tr end, k.ad_tr, k.ad_en,
         public.kozmetik_fiyati(k.tur, k.fiyat_elmas), k.icerik, k.sira,
         public.kozmetik_satista(k.anahtar),
         exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar),
         k.anahtar in (p.takili_vs_karti, p.takili_isim_efekti, p.takili_zafer_efekti),
         not public.kozmetik_satista(k.anahtar),
         case when v_sahip_hesap then k.onay end
    from public.kozmetikler k
   where (k.aktif and (v_sahip_hesap or public.kozmetik_satista(k.anahtar)))
      or exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar)
   order by k.sira;
end;
$$;

-- Elmasla satın al (takmaz). Tek işlem, profil FOR UPDATE (elmas_harca). Satış kapısı sunucuda.
create or replace function public.kozmetik_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_k public.kozmetikler%rowtype;
  v_fiyat int;
  v_bakiye int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kozmetik_satin_al', 20, interval '60 seconds');
  select * into v_k from public.kozmetikler k where k.anahtar = p_anahtar;
  if not found or not v_k.aktif then raise exception 'Böyle bir kozmetik yok'; end if;
  if not public.kozmetik_satista(v_k.anahtar) then raise exception 'Bu kozmetik satılmıyor'; end if;
  v_fiyat := public.kozmetik_fiyati(v_k.tur, v_k.fiyat_elmas);

  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = v_k.anahtar) then
    raise exception 'Bu kozmetik zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, v_k.tur, v_k.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_kozmetikleri (user_id, kozmetik, kaynak) values (v_me, v_k.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_k.anahtar, 'tur', v_k.tur, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$$;

-- Tak / çıkar (p_anahtar null → o türün yuvası boşalır). Sahip olunan ya da SAHİP TEST MODU.
create or replace function public.kozmetik_tak(p_tur text, p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tur text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kozmetik_tak', 30, interval '60 seconds');
  if p_tur not in ('vs_karti', 'isim_efekti', 'zafer_efekti') then raise exception 'Bu tür takılmaz'; end if;
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null then
    select k.tur into v_tur from public.kozmetikler k where k.anahtar = p_anahtar and k.aktif;
    if v_tur is null or v_tur <> p_tur then raise exception 'Böyle bir kozmetik yok'; end if;
    if not public.sahip_mi() and not exists (
         select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = p_anahtar) then
      raise exception 'Bu kozmetik sende yok';
    end if;
  end if;
  update public.profiles
     set takili_vs_karti     = case when p_tur = 'vs_karti'     then p_anahtar else takili_vs_karti end,
         takili_isim_efekti  = case when p_tur = 'isim_efekti'  then p_anahtar else takili_isim_efekti end,
         takili_zafer_efekti = case when p_tur = 'zafer_efekti' then p_anahtar else takili_zafer_efekti end
   where id = v_me;
  return jsonb_build_object('tur', p_tur, 'takili', p_anahtar);
end;
$$;

-- ---------- 5. Sahip: önizleme listesi + "Satışa girsin / Girmesin" ----------
create or replace function public.kozmetik_onay_listesi()
returns table(anahtar text, tur text, ad_tr text, ad_en text, fiyat integer, onay text, onay_zamani timestamptz,
              satista boolean, sira integer)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.sahip_mi() then raise exception 'Bu sayfa yalnız sahibe açık'; end if;
  return query
  select k.anahtar, k.tur, k.ad_tr, k.ad_en, public.kozmetik_fiyati(k.tur, k.fiyat_elmas), k.onay, k.onay_zamani,
         public.kozmetik_satista(k.anahtar), k.sira
    from public.kozmetikler k where k.aktif
  union all
  select a.anahtar, 'aura', a.ad_tr, a.ad_en, public.aura_fiyati(a.nadirlik), a.onay, a.onay_zamani,
         (a.kaynak = 'dukkan' and public.aura_fiyati(a.nadirlik) is not null), a.sira
    from public.auralar a where a.aktif and a.kaynak = 'dukkan'
  order by 9;
end;
$$;

create or replace function public.kozmetik_onay_kaydet(p_anahtar text, p_onay text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_n int;
begin
  if auth.uid() is null or not public.sahip_mi() then raise exception 'Bu sayfa yalnız sahibe açık'; end if;
  if p_onay not in ('bekliyor', 'girsin', 'girmesin') then raise exception 'Geçersiz seçim'; end if;
  update public.kozmetikler set onay = p_onay, onay_zamani = now() where anahtar = p_anahtar;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    update public.auralar set onay = p_onay, onay_zamani = now() where anahtar = p_anahtar and kaynak = 'dukkan';
    get diagnostics v_n = row_count;
  end if;
  if v_n = 0 then raise exception 'Böyle bir kalem yok'; end if;
  return jsonb_build_object('anahtar', p_anahtar, 'onay', p_onay);
end;
$$;

-- ---------- 6. Bot kozmetiği (deterministik, yazma yok) ----------
-- Gizli bot: tür başına olasılık = taban + level × artış (tavanlı), bot kimliğinden sabit. Aday yalnız
-- satıştaki + 'girsin' kalemler (aura: onay 'girsin' + dükkân aurası; nadirliğe göre level şartı).
create or replace function public.bot_kozmetik(p_id uuid, p_level integer, p_tur text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_olasilik numeric;
  v_adaylar text[];
begin
  if p_id is null then return null; end if;
  v_olasilik := least(public.ayar_ondalik('bot_kozmetik_max_yuzde', 55),
                      public.ayar_ondalik('bot_kozmetik_taban_yuzde', 10)
                      + public.ayar_ondalik('bot_kozmetik_level_yuzde', 0.6) * coalesce(p_level, 1)) / 100.0;
  if public.bot_rasgele('bk:' || p_tur || ':' || p_id::text) >= v_olasilik then return null; end if;

  if p_tur = 'aura' then
    select array_agg(a.anahtar order by a.sira) into v_adaylar
      from public.auralar a
     where a.aktif and a.kaynak = 'dukkan' and a.onay = 'girsin' and public.aura_fiyati(a.nadirlik) is not null
       and coalesce(p_level, 1) >= case a.nadirlik when 'siradan' then 1 when 'nadir' then 10
                                                   when 'epik' then 20 else 35 end;
  else
    if not public.kozmetik_satis_acik_mi() then return null; end if;
    select array_agg(k.anahtar order by k.sira) into v_adaylar
      from public.kozmetikler k
     where k.tur = p_tur and k.aktif and k.onay = 'girsin' and coalesce(p_level, 1) >= k.bot_min_level
       and public.kozmetik_fiyati(k.tur, k.fiyat_elmas) is not null;
  end if;
  if v_adaylar is null or cardinality(v_adaylar) = 0 then return null; end if;
  return v_adaylar[1 + floor(public.bot_rasgele('bks:' || p_tur || ':' || p_id::text) * cardinality(v_adaylar))::int];
end;
$$;
revoke all on function public.bot_kozmetik(uuid, integer, text) from public, anon, authenticated;

-- ---------- 7. Yetkiler (mevcut kalıp: yalnız authenticated) ----------
revoke all on function public.kozmetik_katalogu() from public, anon;
grant execute on function public.kozmetik_katalogu() to authenticated;
revoke all on function public.kozmetik_satin_al(text) from public, anon;
grant execute on function public.kozmetik_satin_al(text) to authenticated;
revoke all on function public.kozmetik_tak(text, text) from public, anon;
grant execute on function public.kozmetik_tak(text, text) to authenticated;
revoke all on function public.kozmetik_onay_listesi() from public, anon;
grant execute on function public.kozmetik_onay_listesi() to authenticated;
revoke all on function public.kozmetik_onay_kaydet(text, text) from public, anon;
grant execute on function public.kozmetik_onay_kaydet(text, text) to authenticated;
