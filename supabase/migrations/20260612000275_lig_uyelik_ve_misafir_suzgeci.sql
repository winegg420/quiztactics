-- Şerit E — Lig: yeni hesaplar gruba girmiyordu · deneme misafir hesapları tabloda
--
-- A) KAYIP ÜYELİK (ölçülen kök sebep)
--    151/157/181/195'te `lig_grubum()` ilk satırında `lig_uyeligim_kur(v_me)`
--    çağırıyordu: haftanın grupları kurulduktan SONRA açılan hesap, Lig
--    sayfasını açtığında gruba yerleşiyordu. 243 (Paket 28 F) gövdeyi yeniden
--    yazarken bu satır düştü; o günden beri `lig_uyeligim_kur` hiçbir yerden
--    çağrılmıyor (migration'larda ve istemcide arandı). Sonuç: Pazartesi
--    kurulumundan sonra açılan her hesap (ör. telefonda yeni "Misafir olarak
--    dene" hesabı) hafta sonuna kadar `lig_grubum` boş döndürür; LİGİM
--    sekmesi "Bu ligde henüz kimse yarışmıyor" der, ana sayfa lig kartı
--    çizilmez. Ölçüm (22 Eyl): bu hafta üyeliği olmayan maçlı gerçek hesap 1.
--    Düzeltme: çağrı geri kondu. İşlev boşta bir şey yapmaz (üyelik varsa
--    hemen döner), grup doluluğunu 195'teki gibi görünür üyelerle sayar.
--
-- B) DENEME MİSAFİR HESAPLARI
--    195 isimsiz/avatarsız (kurulumu bitmemiş) hesapları, 243 hiç maç
--    yapmamışları gizliyor. Kalan "test görünümlü" satırların hepsi misafir
--    (anonim) hesap ve az maçlı. Ölçüm (lig_gorunur_mu geçen gerçek hesaplar,
--    toplam_mac dağılımı): misafir 1-2 maç: 6 · 3-4 maç: 1 (arayüz denetim
--    aracının hesabı) · 5-19: 0 · 20+: 1 (23 maçlı, arkadaşı olan gerçek
--    oyuncu). Kayıtlı (e-posta/Google) hesapların hiçbiri bu kurala girmez.
--    Kural: misafir hesap ligde görünmek için `lig_misafir_min_mac` (5) maç
--    yapmış olmalı. Botlar ve kayıtlı hesaplar ETKİLENMEZ; oyuncu kendi
--    satırını her durumda görür. Hesap/veri silinmez, yalnız gösterim.
--    Hafta kapanışı (lig_haftayi_kapat) değişmedi.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('lig_misafir_min_mac', '5'::jsonb,
   'Misafir (anonim) hesap lig/sıralama tablolarında görünmek için en az kaç maç yapmış olmalı. '
   'Kayıtlı hesaplar ve botlar bu kurala girmez; oyuncu kendi satırını her durumda görür.')
on conflict (anahtar) do nothing;

-- Misafir ve henüz yeterince oynamamış mı? (auth.users okunduğu için definer;
-- yalnız lig fonksiyonlarının içinden çağrılır, istemciye kapalı.)
create or replace function public.lig_misafir_eksik_mi(p_user uuid, p_toplam_mac integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(p_toplam_mac, 0) < public.ayar_sayi('lig_misafir_min_mac', 5)::int
     and exists (select 1 from auth.users au
                  where au.id = p_user and coalesce(au.is_anonymous, false));
$function$;

revoke execute on function public.lig_misafir_eksik_mi(uuid, integer) from public, anon, authenticated;
grant execute on function public.lig_misafir_eksik_mi(uuid, integer) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- lig_uyeligim_kur: gövde canlıdaki (195) hâlinden alındı. Tek değişiklik:
-- grup doluluğu, tabloda GERÇEKTEN satır tutan üyelerle sayılır (243'ün maç
-- şartı + 275 B misafir şartı). Ölçüm: bronz grup 1'de kurulum süzgecini
-- geçen üye 25'i buluyor ama tabloda 11 satır çiziliyordu; hafta içi açılan
-- hesap bu yüzden tek kişilik yeni gruba düşüp "tek başınasın" görüyordu.
-- ---------------------------------------------------------------------------
create or replace function public.lig_uyeligim_kur(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date := public.hafta_basi();
  v_lig text;
  v_boyu int;
  v_gercek int;
  v_grup int;
  v_min_mac int := public.ayar_sayi('lig_gorunur_min_mac', 1)::int;
begin
  if exists (select 1 from public.lig_uyelik where user_id = p_user and hafta = v_hafta) then
    return;
  end if;

  select coalesce(lig, 'bronz') into v_lig from public.profiles where id = p_user;
  if v_lig is null then return; end if;

  select count(*) into v_gercek
    from public.profiles p
   where not coalesce(p.is_bot, false) and coalesce(p.lig, 'bronz') = v_lig
     and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli);
  v_boyu := case when v_gercek < public.ayar_sayi('lig_kucuk_esik', 10)::int
                 then public.ayar_sayi('lig_grup_boyu_kucuk', 15)::int
                 else public.ayar_sayi('lig_grup_boyu', 25)::int end;

  -- Yeri olan en dolu grup; tabloda satır tutmayan hesaplar yer kaplamaz.
  select u.grup_no into v_grup
    from public.lig_uyelik u
    join public.profiles p on p.id = u.user_id
   where u.hafta = v_hafta and u.lig = v_lig
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)
     and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
     and coalesce(p.toplam_mac, 0) >= v_min_mac
     and (coalesce(p.is_bot, false) or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac))
   group by u.grup_no
  having count(*) < v_boyu
   order by count(*) desc
   limit 1;

  if v_grup is null then
    select coalesce(max(u.grup_no), 0) + 1 into v_grup
      from public.lig_uyelik u where u.hafta = v_hafta and u.lig = v_lig;
  end if;

  insert into public.lig_uyelik (user_id, hafta, lig, grup_no)
  values (p_user, v_hafta, v_lig, v_grup)
  on conflict (user_id, hafta) do nothing;
end;
$function$;

-- ---------------------------------------------------------------------------
-- lig_grubum: gövde 243'teki (canlı) hâlinden alındı. Değişenler:
--   A) lig_uyeligim_kur(v_me) geri geldi; B) misafir süzgeci.
-- ---------------------------------------------------------------------------
create or replace function public.lig_grubum()
returns table(sira bigint, user_id uuid, gorunen_ad text, gorunen_avatar text,
              puan integer, ben boolean, bot boolean, lig text, grup_boyu integer,
              yukselen integer, dusen integer, sezon_bitis timestamp with time zone,
              gorunum jsonb)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_hafta date := public.hafta_basi();
  v_lig text;
  v_grup int;
  v_boyu int;
  v_min_mac int := public.ayar_sayi('lig_gorunur_min_mac', 1)::int;   -- Paket 28 F
begin
  if v_me is null then return; end if;

  -- 275 A: grupları kurulduktan sonra açılan hesap burada gruba yerleşir.
  perform public.lig_uyeligim_kur(v_me);

  select u.lig, u.grup_no into v_lig, v_grup
    from public.lig_uyelik u
   where u.user_id = v_me and u.hafta = v_hafta;
  if v_lig is null then return; end if;

  select count(*) into v_boyu
    from public.lig_uyelik u
    join public.profiles p on p.id = u.user_id
   where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
     and not public.acik_bot_mu(p.is_bot, p.bot_turu);

  return query
  select row_number() over (order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc),
         p.id, p.gorunen_ad, p.gorunen_avatar, p.puan_hafta,
         (p.id = v_me),
         public.acik_bot_mu(p.is_bot, p.bot_turu),
         v_lig, v_boyu,
         public.ayar_sayi('lig_yukselen', 5)::int,
         public.ayar_sayi('lig_dusen', 5)::int,
         public.lig_sezon_bitisi(),
         p.gorunum
    from public.lig_uyelik u
    join public.profiles p on p.id = u.user_id
   where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)
     -- Oyuncu kendi satırını her durumda görür.
     and (p.id = v_me
          or (public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
              -- Paket 28 F: hiç maç yapmamış hesap tabloda satır tutmasın.
              and coalesce(p.toplam_mac, 0) >= v_min_mac
              -- 275 B: az oynamış misafir (deneme) hesabı satır tutmasın.
              and (coalesce(p.is_bot, false)
                   or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac))))
   order by 1;
end;
$function$;

-- ---------------------------------------------------------------------------
-- lig_siralama (Şehir/Ülke/Dünya): gövde canlıdaki hâlinden alındı.
-- Tek değişiklik: 275 B misafir süzgeci.
-- ---------------------------------------------------------------------------
create or replace function public.lig_siralama(p_kapsam text default 'global'::text,
                                               p_donem text default 'hafta'::text)
returns table(sira bigint, user_id uuid, gorunen_ad text, gorunen_avatar text,
              puan integer, sehir text, ulke text, ben boolean, bot boolean, gorunum jsonb)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_ulke text;
  v_sehir text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kapsam not in ('sehir', 'ulke', 'global') then raise exception 'Geçersiz kapsam'; end if;
  if p_donem not in ('hafta', 'tum_zamanlar') then raise exception 'Geçersiz dönem'; end if;

  select p.ulke, p.sehir into v_ulke, v_sehir from public.profiles p where p.id = v_me;

  if p_kapsam in ('sehir', 'ulke') and v_ulke is null then
    raise exception 'Önce ülkeni ve şehrini seçmelisin';
  end if;
  if p_kapsam = 'sehir' and v_sehir is null then
    raise exception 'Önce şehrini seçmelisin';
  end if;

  return query
  with sirali as (
    select p.id,
           p.gorunen_ad as p_ad,
           p.gorunen_avatar as p_avatar,
           (case when p_donem = 'hafta' then p.puan_hafta else p.puan end) as p_puan,
           p.sehir, p.ulke, p.gorunum as p_gorunum,
           public.acik_bot_mu(p.is_bot, p.bot_turu) as p_bot,
           row_number() over (
             order by (case when p_donem = 'hafta' then p.puan_hafta else p.puan end) desc,
                      p.puan desc, p.gorunen_ad asc) as p_sira
    from public.profiles p
    where coalesce(p.toplam_mac, 0) >= 1
      and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true))
      and not public.acik_bot_mu(p.is_bot, p.bot_turu)
      and ((public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
            -- 275 B: az oynamış misafir (deneme) hesabı satır tutmasın.
            and (coalesce(p.is_bot, false)
                 or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac)))
           or p.id = v_me)
      and (
        p_kapsam = 'global'
        or (p_kapsam = 'ulke'  and p.ulke = v_ulke)
        or (p_kapsam = 'sehir' and p.ulke = v_ulke and p.sehir = v_sehir)
      )
  )
  select s.p_sira, s.id, s.p_ad, s.p_avatar, s.p_puan, s.sehir, s.ulke,
         (s.id = v_me), s.p_bot, s.p_gorunum
  from sirali s
  where s.p_sira <= 100 or s.id = v_me
  order by s.p_sira;
end;
$function$;
