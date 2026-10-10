-- 1049 — (1) ÇERÇEVESİZ OYUNCU KALMASIN + (2) AVATAR PRESTİJ (tek kademe) — Ida, 10 Eki 2026
--
-- (1) oyuncu_kartlari: takılı aktif çerçeve yoksa cerceve = 'lig_' || coalesce(lig, 'bronz') ve nadirliği o lig
--     çerçevesinin cerceveler.nadirlik'i. Gizli botlar dahil herkes. Yalnız GÖRÜNÜM kuralı: oyuncu_cerceveleri,
--     takili_cerceve ve Koleksiyon Puanı DEĞİŞMEZ. Takılı başka aktif çerçevesi olanın çerçevesi aynı kalır.
--     lig_grubum_ozet zaten oyuncu_kartlari'ndan okur (yalnız avatar_prestij alanı eklendi); davet_durumum
--     kendi 'cerceve' alanını takili_cerceve'den okuyordu → aynı kurala bağlandı.
-- (2) Avatar Prestij: sahip olunan avatar coin'le bir kez geliştirilir (ikinci kademe yok). Efekt yalnız istemcide
--     (avatar fotoğrafının üstünde CSS pırıltı). Ayar avatar_prestij_fiyat (2500) / avatar_prestij_acik (true).
--     Tablo oyuncu_avatar_prestij (RLS: yalnız kendi satırını okur; yazma yalnız RPC). RPC avatar_prestij_al.
--     oyuncu_kartlari.avatar_prestij = takılı avatar prestijli mi (gizli botta false). Koleksiyon Puanı: her
--     prestijli avatar ayrı kalem, ağırlık 'nadir'.
--
-- YETKİ (Ida, görev metninde önceden onaylı): yeni tablonun RLS'i + SELECT (authenticated, kendi satırı) ve
-- avatar_prestij_al EXECUTE (yalnız authenticated). Başka hiçbir mevcut RLS/GRANT değişmez.
-- oyuncu_kartlari GRANT'ı ÖNCE: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
--                         SONRA: birebir aynı (aşağıda açıkça yeniden verilir; anon'a AÇILMAZ).

-- ---------- Ayarlar ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('avatar_prestij_fiyat', '2500'::jsonb, '1049: Avatar Prestij fiyatı (coin, tek kademe)'),
  ('avatar_prestij_acik', 'true'::jsonb, '1049: Avatar Prestij satın alma açık mı')
on conflict (anahtar) do nothing;

-- ---------- Tablo ----------
create table if not exists public.oyuncu_avatar_prestij (
  user_id uuid not null references public.profiles(id) on delete cascade,
  avatar text not null,                       -- avatar_nitelikleri.anahtar (oyuncu_avatarlari ile aynı)
  alindi_at timestamptz not null default now(),
  primary key (user_id, avatar)
);
alter table public.oyuncu_avatar_prestij enable row level security;
revoke all on public.oyuncu_avatar_prestij from public, anon, authenticated;
grant select on public.oyuncu_avatar_prestij to authenticated;
grant all on public.oyuncu_avatar_prestij to service_role;
drop policy if exists oyuncu_avatar_prestij_kendi on public.oyuncu_avatar_prestij;
create policy oyuncu_avatar_prestij_kendi on public.oyuncu_avatar_prestij
  for select to authenticated using (user_id = auth.uid());

-- Koleksiyon Puanı tetikleyicileri (öteki sahiplik tablolarıyla aynı)
drop trigger if exists trg_koleksiyon_ekle on public.oyuncu_avatar_prestij;
create trigger trg_koleksiyon_ekle after insert on public.oyuncu_avatar_prestij
  referencing new table as yeni for each statement execute function public.trg_koleksiyon_ekle();
drop trigger if exists trg_koleksiyon_sil on public.oyuncu_avatar_prestij;
create trigger trg_koleksiyon_sil after delete on public.oyuncu_avatar_prestij
  referencing old table as eski for each statement execute function public.trg_koleksiyon_sil();

-- ---------- Koleksiyon kalemleri: + avatar_prestij (ağırlık 'nadir'); GRANT değişmez ----------
create or replace function public.koleksiyon_kalemleri(p_user uuid)
 returns table(tur text, anahtar text, nadirlik text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
  select 'avatar', n.anahtar, case n.nadirlik when 'yaygin' then 'siradan' else n.nadirlik end
    from public.oyuncu_avatarlari o join public.avatar_nitelikleri n on n.anahtar = o.avatar
   where o.user_id = p_user
     and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
  union all
  -- 1049: her prestijli avatar ayrı kalem, ağırlık 'nadir'
  select 'avatar_prestij', x.avatar, 'nadir'
    from public.oyuncu_avatar_prestij x join public.avatar_nitelikleri n on n.anahtar = x.avatar
   where x.user_id = p_user
     and not exists (select 1 from public.avatar_katalogu k where k.url = n.url and not k.aktif)
  union all
  select e.tur, e.anahtar, e.nadirlik from public.koleksiyon_ek_kalemleri e where e.user_id = p_user;
$function$;

-- ---------- RPC: avatar_prestij_al ----------
-- Hata kodları (istemci çevirir): kapali · sahip_degil · zaten_alindi · coin_yetersiz
create or replace function public.avatar_prestij_al(p_avatar text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_n public.avatar_nitelikleri%rowtype;
  v_fiyat bigint;
  v_bakiye bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('avatar_prestij_al', 20, interval '60 seconds');
  if coalesce((select o.deger from public.oyun_ayarlari o where o.anahtar = 'avatar_prestij_acik'), 'false'::jsonb)
     not in ('true'::jsonb, '1'::jsonb) then
    raise exception 'kapali';
  end if;
  v_fiyat := public.ayar_sayi('avatar_prestij_fiyat', 0)::bigint;
  if coalesce(v_fiyat, 0) <= 0 then raise exception 'kapali'; end if;

  select * into v_n from public.avatar_nitelikleri n where n.anahtar = p_avatar or n.url = p_avatar;
  if not found
     or not public.avatar_acilmis_mi(v_n.url)
     or exists (select 1 from public.avatar_katalogu k where k.url = v_n.url and not k.aktif) then
    raise exception 'sahip_degil';
  end if;

  -- Kilit: aynı anda iki çağrı sırayla işlensin (coin_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  -- Sahiplik: avatar dükkânıyla aynı kural (ücretsiz avatar herkesin; değilse oyuncu_avatarlari)
  if not public.avatar_sahip_mi(v_me, v_n.url) then raise exception 'sahip_degil'; end if;
  if exists (select 1 from public.oyuncu_avatar_prestij x where x.user_id = v_me and x.avatar = v_n.anahtar) then
    raise exception 'zaten_alindi';
  end if;
  if coalesce((select p.coin from public.profiles p where p.id = v_me), 0) < v_fiyat then raise exception 'coin_yetersiz'; end if;

  v_bakiye := public.coin_harca(v_fiyat, 'avatar_prestij', v_n.anahtar);   -- coin_hareketleri defterine de yazar
  insert into public.oyuncu_avatar_prestij (user_id, avatar) values (v_me, v_n.anahtar);
  return jsonb_build_object('alindi', true, 'coin', v_bakiye, 'anahtar', v_n.anahtar, 'url', v_n.url, 'fiyat', v_fiyat);
end;
$function$;
revoke all on function public.avatar_prestij_al(text) from public, anon;
grant execute on function public.avatar_prestij_al(text) to authenticated, service_role;

-- ---------- oyuncu_kartlari: dönüş tipi değişti → drop + create ----------
-- (lig_grubum_ozet / davet_durumum gövdeleri adı çalışma anında çözer; bağımlılık kaydı yok)
drop function if exists public.oyuncu_kartlari(uuid[]);

CREATE FUNCTION public.oyuncu_kartlari(p_idler uuid[])
 RETURNS TABLE(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text, premium_cerceve text, premium_aura text, sehir_sampiyonu jsonb, unvan jsonb, koleksiyon_puani integer, sezon_bp boolean, avatar_prestij boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.gorunen_ad, p.gorunen_avatar, coalesce(p.level, 1), coalesce(p.lig, 'bronz'),
         -- 1049: çerçevesiz oyuncu yok — takılı aktif çerçeve yoksa ligin çerçevesi (Bronz dahil, gizli botlar dahil).
         --       Yalnız görünüm: sahiplik/takili_cerceve/koleksiyon değişmez.
         case when c.aktif then p.takili_cerceve when lc.aktif then lc.anahtar end,
         case when c.aktif then c.nadirlik when lc.aktif then lc.nadirlik end,
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
         -- 720: aktif Battle Pass sahibinin ismi altın ("Işık Şeritli Altın"); sezon/BP kapanınca takılı efekte döner
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
              when bp.var then 'isim_altin'
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
         case when ar.sehir_s then jsonb_build_object('sehir', ar.sehir, 'ulke', ar.ulke, 'hafta', ar.hafta) end,
         -- 643 + 647: görünen unvan — aktif dünya > ülke > şehir şampiyonluğu önce; yoksa takılı unvan (kazanılmışsa);
         --      gizli bot kazandığı unvanlardan kimliğinden sabit birini (ya da hiçbirini) taşır.
         coalesce(
           case when ar.dunya_s then jsonb_build_object('tur', 'dunya', 'tr', 'Dünya Şampiyonu', 'en', 'World Champion') end,
           case when ar.ulke_s then jsonb_build_object('tur', 'ulke', 'ulke', ar.ulke,
                  'ad', coalesce((select u.ad from public.ulkeler u where u.kod = ar.ulke), ar.ulke)) end,
           case when ar.sehir_s then jsonb_build_object('tur', 'sehir', 'sehir', ar.sehir, 'ulke', ar.ulke) end,
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
         -- 720: aktif Battle Pass → çerçevenin üstüne ince altın halka
         ,bp.var
         -- 1049: takılı avatar prestijli mi (gizli botta her zaman false)
         ,(not gb.gizli and exists (select 1 from public.oyuncu_avatar_prestij x
                                       join public.avatar_nitelikleri n on n.anahtar = x.avatar
                                      where x.user_id = p.id and n.url = p.gorunen_avatar))
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    left join public.cerceveler lc on lc.anahtar = 'lig_' || coalesce(p.lig, 'bronz')
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
    cross join lateral (select (not coalesce(p.is_bot, false)) and public.sezon_bp_gorunur(p.id) as var) bp
    left join lateral (select a.sehir, a.ulke, a.hafta,
                              a.sehir_sampiyonu as sehir_s, a.ulke_sampiyonu as ulke_s, a.dunya_sampiyonu as dunya_s
                         from public.lig_arsiv a
                        where a.user_id = p.id and a.hafta = public.hafta_basi() - 7) ar on true
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated, service_role;

-- ---------- davet_durumum: 'cerceve' aynı kurala bağlandı (GRANT değişmez) ----------
CREATE OR REPLACE FUNCTION public.davet_durumum()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_ay_basi timestamptz := (date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  v_gereken int := public.ayar_sayi('davet_gereken_level', 5)::int;
  v_p public.profiles%rowtype;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into v_p from public.profiles where id = v_me;
  return jsonb_build_object(
    'davetlerim', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', p.id, 'ad', p.gorunen_ad, 'avatar', p.gorunen_avatar, 'level', coalesce(p.level, 1),
               -- 1049: takılı aktif çerçeve yoksa lig çerçevesi (çerçevesiz oyuncu yok; oyuncu_kartlari ile aynı kural)
               'cerceve', coalesce((select c.anahtar from public.cerceveler c where c.anahtar = p.takili_cerceve and c.aktif),
                                   (select c.anahtar from public.cerceveler c where c.anahtar = 'lig_' || coalesce(p.lig, 'bronz') and c.aktif)), 'durum', d.durum, 'gereken_level', v_gereken,
               'olusturma_at', d.olusturma_at, 'odul_at', d.odul_at)
             order by d.olusturma_at desc)
        from public.davetler d join public.profiles p on p.id = d.davet_edilen
       where d.davet_eden = v_me), '[]'::jsonb),
    'davet_eden', (
      select jsonb_build_object('user_id', e.id, 'ad', e.gorunen_ad, 'durum', d.durum)
        from public.davetler d join public.profiles e on e.id = d.davet_eden
       where d.davet_edilen = v_me),
    'ozet', (
      select jsonb_build_object(
               'toplam', count(*),
               'bekleyen', count(*) filter (where d.durum = 'bekliyor'),
               'odullenen', count(*) filter (where d.durum = 'odullendi'),
               'bu_ay_odullenen', count(*) filter (where d.durum = 'odullendi' and d.odul_at >= v_ay_basi),
               'aylik_sinir', public.ayar_sayi('davet_aylik_sinir', 10)::int)
        from public.davetler d where d.davet_eden = v_me),
    'baglanabilir', (v_p.davet_eden is null
                     and not exists (select 1 from public.davetler d where d.davet_edilen = v_me)
                     and v_p.created_at >= now() - make_interval(hours => public.ayar_sayi('davet_baglama_saat', 72)::int)));
end;
$function$;

-- ---------- lig_grubum_ozet: satırlara avatar_prestij (GRANT değişmez) ----------
CREATE OR REPLACE FUNCTION public.lig_grubum_ozet()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_tum jsonb;
  v_satirlar jsonb;
  v_ben record;
  v_boyu int; v_lig text; v_yuk int; v_dus int; v_bitis timestamptz;
  v_ust_puan int; v_cizgi_puan int;
  v_yuk_sira int; v_dus_sira int;
  v_bolge text;
  v_grup int;
  v_hafta date := public.hafta_basi();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Mevcut lig_grubum() (görünürlük kuralları onda) tek kez çağrılır
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', g.sira, 'user_id', g.user_id, 'puan', g.puan, 'ben', g.ben, 'lig', g.lig,
           'yukselen', g.yukselen, 'dusen', g.dusen, 'sezon_bitis', g.sezon_bitis, 'grup_boyu', g.grup_boyu)
           order by g.sira), '[]'::jsonb)
    into v_tum
    from public.lig_grubum() g;

  select * into v_ben from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean,
    lig text, yukselen int, dusen int, sezon_bitis timestamptz, grup_boyu int) where o.ben limit 1;
  if not found then return null; end if;

  v_lig := v_ben.lig; v_yuk := v_ben.yukselen; v_dus := v_ben.dusen; v_bitis := v_ben.sezon_bitis;
  -- 661: sıra gerçek (tüm grup üyeleri arasında) olduğundan boy da gerçek grup boyu.
  v_boyu := v_ben.grup_boyu;

  v_yuk_sira := case when v_lig = 'efsane' then null else least(v_yuk, v_boyu) end;
  v_dus_sira := case when v_lig = 'bronz' or v_boyu <= v_dus then null else v_boyu - v_dus + 1 end;

  select u.grup_no into v_grup from public.lig_uyelik u where u.user_id = v_me and u.hafta = v_hafta;

  -- Puan farkları GERÇEK sıradan okunur (gizli üyeler sıralamada durur; yalnız puan sayısı döner, kimlik değil).
  select x.puan_hafta into v_ust_puan from (
    select p.puan_hafta, row_number() over (order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc, p.id asc) as s
      from public.lig_uyelik u join public.profiles p on p.id = u.user_id
     where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)) x
   where x.s = v_ben.sira - 1;
  if v_yuk_sira is not null then
    select x.puan_hafta into v_cizgi_puan from (
      select p.puan_hafta, row_number() over (order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc, p.id asc) as s
        from public.lig_uyelik u join public.profiles p on p.id = u.user_id
       where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
         and not public.acik_bot_mu(p.is_bot, p.bot_turu)) x
     where x.s = v_yuk_sira;
  end if;

  v_bolge := case
    when v_yuk_sira is not null and v_ben.sira <= v_yuk_sira and coalesce(v_ben.puan, 0) > 0 then 'yukselme'
    when v_dus_sira is not null and v_ben.sira >= v_dus_sira then 'dusme'
    else 'guvenli' end;

  -- Komşular: benden önceki 2 + sonraki 2 GÖRÜNÜR satır (sıra numarası gerçek, aralarda boşluk olabilir).
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', o.sira, 'user_id', o.user_id, 'puan', o.puan, 'ben', o.ben,
           'ad', k.ad, 'avatar', k.avatar, 'level', k.level, 'lig', k.lig,
           'cerceve', k.cerceve, 'cerceve_nadirlik', k.cerceve_nadirlik, 'vitrin', k.vitrin,
           'aura', k.aura, 'isim_efekti', k.isim_efekti,
           'premium_cerceve', k.premium_cerceve, 'premium_aura', k.premium_aura, 'sezon_bp', k.sezon_bp,
           'avatar_prestij', k.avatar_prestij)
           order by o.sira), '[]'::jsonb)
    into v_satirlar
    from (select t.*, row_number() over (order by t.sira) as sn
            from jsonb_to_recordset(v_tum) as t(sira bigint, user_id uuid, puan int, ben boolean)) o
    left join lateral public.oyuncu_kartlari(array[o.user_id]) k on true
   where o.sn between (select b.sn - 2 from (select t.ben, row_number() over (order by t.sira) as sn
                                               from jsonb_to_recordset(v_tum) as t(sira bigint, ben boolean)) b where b.ben)
                  and (select b.sn + 2 from (select t.ben, row_number() over (order by t.sira) as sn
                                               from jsonb_to_recordset(v_tum) as t(sira bigint, ben boolean)) b where b.ben);

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
