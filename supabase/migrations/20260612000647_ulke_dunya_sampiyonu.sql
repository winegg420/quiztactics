-- 647: Ülke Şampiyonu + Dünya Şampiyonu (641 Şehir Şampiyonu'nun aynı deseni; unvan 643'ün üstüne)
--
-- * Kapanan haftayı ülkesinde / dünyada 1. bitiren, sonraki hafta boyunca o unvanın sahibidir. TEK KAYNAK
--   lig_arsiv.ulke_sampiyonu / dunya_sampiyonu (aktif = hafta = hafta_basi() - 7; profile kalıcı alan yazılmaz).
-- * FARK (şehirden): asgari oyuncu/galibiyet şartı YOK. Gizli botlar şampiyon olabilir (ele verilmez).
-- * DİKKAT: lig_arsiv.sira_ulke / sira_global TÜM havuzu (gorunur = false dahil) kapsar; "= 1" DİYE KULLANILMAZ.
--   Şampiyonluk şehirdeki gibi yalnız gorunur = true satırlar arasında lig_kapanis_havuzu()'ndan yeniden hesaplanır
--   (sıra: puan_hafta → puan → gorunen_ad → id; canlı liste ile aynı).
-- * Gövdeler CANLI veritabanından (pg_get_functiondef) alındı: haftayi_kapat = 641 gövdesi, oyuncu_kartlari = 646
--   (koleksiyon_puani dahil), unvanlarim = 644 (unvan_galibiyet_kontrol dahil). Değişiklik yalnız eklenen parçalar.
-- * Kalıcı rozetler lig_ulke_sampiyonu / lig_dunya_sampiyonu (elmas kademe → Koleksiyon Puanı'nda otomatik efsanevi
--   ağırlık; coin yok). Bildirim baştan açık (ayarla kapatılabilir).
-- * Unvan önceliği (oyuncu_kartlari.unvan): dünya > ülke > şehir > takılı unvan. Ülke adı `ulkeler.ad` (tek dil).
-- * Yetki/RLS: DEĞİŞİKLİK YOK. oyuncu_kartlari / unvanlarim / haftayi_kapat dönüş tipleri aynı kaldığı için
--   CREATE OR REPLACE (mevcut yetkiler korunur). Yeni RPC yalnız authenticated + service_role (sehir_sampiyonu() gibi).

-- ---------------------------------------------------------------------------
-- 1) Rozetler, arşiv kolonları, ayarlar, bildirim metinleri
-- ---------------------------------------------------------------------------
insert into public.rozet_tanimlari
  (anahtar, grup, kademe, esik, olcut, coin, gizli, sira, ikon, cerceve, aktif, ad_tr, ad_en, aciklama_tr, aciklama_en, elmas)
values
  ('lig_ulke_sampiyonu', 'lig', 'elmas', 1, 'olay', 0, false, 707, 'crown', null, true,
   'Ülke Şampiyonu', 'Country Champion', 'Bir haftayı ülkende 1. bitir', 'Finish a week ranked #1 in your country', 0),
  ('lig_dunya_sampiyonu', 'lig', 'elmas', 1, 'olay', 0, false, 708, 'crown', null, true,
   'Dünya Şampiyonu', 'World Champion', 'Bir haftayı dünyada 1. bitir', 'Finish a week ranked #1 in the world', 0)
on conflict (anahtar) do nothing;

alter table public.lig_arsiv add column if not exists ulke_sampiyonu boolean not null default false;
alter table public.lig_arsiv add column if not exists dunya_sampiyonu boolean not null default false;
comment on column public.lig_arsiv.ulke_sampiyonu is
  '647: o haftanın ülke şampiyonu (yalnız görünür oyuncular arasından; asgari şart yok). sira_ulke = 1 tek başına yetmez.';
comment on column public.lig_arsiv.dunya_sampiyonu is
  '647: o haftanın dünya şampiyonu (yalnız görünür oyuncular arasından; asgari şart yok). sira_global = 1 tek başına yetmez.';
create index if not exists idx_lig_arsiv_ulke_sampiyonu on public.lig_arsiv (hafta, ulke) where ulke_sampiyonu;
create index if not exists idx_lig_arsiv_dunya_sampiyonu on public.lig_arsiv (hafta) where dunya_sampiyonu;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('ulke_sampiyonu_bildirim_acik', to_jsonb(1), '647: 1 = ülke şampiyonuna "Ülke Şampiyonu oldun" bildirimi'),
  ('dunya_sampiyonu_bildirim_acik', to_jsonb(1), '647: 1 = dünya şampiyonuna "Dünya Şampiyonu oldun" bildirimi')
on conflict (anahtar) do nothing;

insert into public.push_metinleri (anahtar, dil, baslik, govde) values
  ('ulke_sampiyonu_oldun', 'tr', '🏆 Ülke Şampiyonu',
   '🏆 %1 Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.'),
  ('ulke_sampiyonu_oldun', 'en', '🏆 Country Champion',
   '🏆 You are the Champion of %1! Your title will appear on your profile and in matches this week.'),
  ('dunya_sampiyonu_oldun', 'tr', '🏆 Dünya Şampiyonu',
   '🏆 Dünya Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.'),
  ('dunya_sampiyonu_oldun', 'en', '🏆 World Champion',
   '🏆 You are the World Champion! Your title will appear on your profile and in matches this week.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2) Haftalık kapanış (canlı = 641 gövdesi + ülke/dünya şampiyonu blokları)
-- ---------------------------------------------------------------------------
create or replace function public.haftayi_kapat(p_hafta date default null::date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date;
  v_min_oyuncu int := public.ayar_sayi('sehir_sampiyonu_min_oyuncu', 3)::int;
  v_min_galibiyet int := public.ayar_sayi('sehir_sampiyonu_min_galibiyet', 1)::int;
  v_sampiyon_bildirim boolean := public.ayar_sayi('sehir_sampiyonu_bildirim_acik', 0) > 0;
  v_ulke_bildirim boolean := public.ayar_sayi('ulke_sampiyonu_bildirim_acik', 1) > 0;
  v_dunya_bildirim boolean := public.ayar_sayi('dunya_sampiyonu_bildirim_acik', 1) > 0;
  r record;
begin
  v_hafta := coalesce(p_hafta, (date_trunc('week', (now() at time zone 'Europe/Istanbul') - interval '1 day'))::date);

  if exists (select 1 from public.lig_arsiv where hafta = v_hafta) then
    return;
  end if;

  -- 641: gizli botlar da arşive girer (canlı listede görünüyorlar). sira_sehir = canlı şehir
  -- listesindeki yer: önünde duran GÖRÜNÜR şehir oyuncusu sayısı + 1 (görünür oyuncuda bu,
  -- lig_siralama'nın row_number'ıyla aynıdır; listede görünmeyen oyuncu kendi ekranındaki yeri alır).
  -- sira_ulke / sira_global eski anlamında rank(); havuz artık gizli botları da içerir.
  insert into public.lig_arsiv (user_id, hafta, puan, sehir, ulke, sira_sehir, sira_ulke, sira_global)
  select k.id, v_hafta, k.puan_hafta, k.sehir, k.ulke,
         case when k.sehir is not null and k.ulke is not null then
           1 + (select count(*) from public.lig_kapanis_havuzu() k2
                 where k2.gorunur and k2.id <> k.id and k2.ulke = k.ulke and k2.sehir = k.sehir
                   and (k2.puan_hafta > k.puan_hafta
                        or (k2.puan_hafta = k.puan_hafta and k2.puan > k.puan)
                        or (k2.puan_hafta = k.puan_hafta and k2.puan = k.puan
                            and ((k2.gorunen_ad < k.gorunen_ad)
                                 or (k2.gorunen_ad is not null and k.gorunen_ad is null)))
                        or (k2.puan_hafta = k.puan_hafta and k2.puan = k.puan
                            and k2.gorunen_ad is not distinct from k.gorunen_ad and k2.id < k.id)))
         end,
         case when k.ulke is not null
              then rank() over (partition by k.ulke order by k.puan_hafta desc) end,
         rank() over (order by k.puan_hafta desc)
    from public.lig_kapanis_havuzu() k
  on conflict (user_id, hafta) do nothing;

  -- 641: şehir şampiyonu — canlı listenin 1.'si (görünür, aynı sıralama) + asgari şart.
  update public.lig_arsiv a
     set sehir_sampiyonu = true
    from (
      select h.id, h.ulke, h.sehir,
             row_number() over (partition by h.ulke, h.sehir
                                order by h.puan_hafta desc, h.puan desc, h.gorunen_ad asc, h.id asc) as rn,
             count(*) over (partition by h.ulke, h.sehir) as n
        from public.lig_kapanis_havuzu() h
       where h.gorunur and h.sehir is not null and h.ulke is not null
    ) s
   where s.rn = 1 and s.n >= v_min_oyuncu
     and a.user_id = s.id and a.hafta = v_hafta
     and public.haftalik_galibiyet_sayisi(s.id, v_hafta) >= v_min_galibiyet;

  -- 647: ülke şampiyonu — ülkesinin GÖRÜNÜR oyuncuları arasında 1. (sira_ulke kullanılmaz: gizli satırları da sayar).
  -- Asgari oyuncu/galibiyet şartı yok; gizli bot şampiyon olabilir.
  update public.lig_arsiv a
     set ulke_sampiyonu = true
    from (
      select h.id,
             row_number() over (partition by h.ulke
                                order by h.puan_hafta desc, h.puan desc, h.gorunen_ad asc, h.id asc) as rn
        from public.lig_kapanis_havuzu() h
       where h.gorunur and h.ulke is not null
    ) s
   where s.rn = 1 and a.user_id = s.id and a.hafta = v_hafta;

  -- 647: dünya şampiyonu — bütün GÖRÜNÜR oyuncular arasında tek 1. (sira_global kullanılmaz). Ülke şartı yok.
  update public.lig_arsiv a
     set dunya_sampiyonu = true
    from (
      select h.id,
             row_number() over (order by h.puan_hafta desc, h.puan desc, h.gorunen_ad asc, h.id asc) as rn
        from public.lig_kapanis_havuzu() h
       where h.gorunur
    ) s
   where s.rn = 1 and a.user_id = s.id and a.hafta = v_hafta;

  -- Eski haftalık rozetler (badges sistemi) — değişmedi.
  for r in
    select a.user_id, a.sira_global
    from public.lig_arsiv a
    where a.hafta = v_hafta and a.sira_global <= 3
  loop
    perform public.award_badge(
      r.user_id,
      case r.sira_global when 1 then 'hafta_1' when 2 then 'hafta_2' else 'hafta_3' end
    );
  end loop;

  -- 641: eski 'sehir_krali' (award_badge) yerine tek kaynak yeni rozet. Coin yok, ikinci kez verilmez
  -- (rozet_ver PK ile), botlara verilmez (rozet_ver). Hata kapanışı bozmaz.
  for r in
    select a.user_id, a.sehir from public.lig_arsiv a
    where a.hafta = v_hafta and a.sehir_sampiyonu
  loop
    begin
      perform public.rozet_ver(r.user_id, 'lig_sehir_sampiyonu', false, false);
      if v_sampiyon_bildirim then
        perform public.bildirim_anahtarla(r.user_id, 'sehir_sampiyonu', 'sehir_sampiyonu_oldun',
                                          jsonb_build_array(r.sehir), '/bildim/siralama');
      end if;
    exception when others then
      raise warning 'sehir sampiyonu odulu verilemedi (%): %', r.user_id, sqlerrm;
    end;
  end loop;

  -- 647: ülke şampiyonu ödülü (şehirdeki desen: rozet coin'siz, hata kapanışı bozmaz; bot rozet/bildirim almaz).
  for r in
    select a.user_id, coalesce(u.ad, a.ulke) as ulke_ad
      from public.lig_arsiv a
      left join public.ulkeler u on u.kod = a.ulke
     where a.hafta = v_hafta and a.ulke_sampiyonu
  loop
    begin
      perform public.rozet_ver(r.user_id, 'lig_ulke_sampiyonu', false, false);
      if v_ulke_bildirim then
        perform public.bildirim_anahtarla(r.user_id, 'ulke_sampiyonu', 'ulke_sampiyonu_oldun',
                                          jsonb_build_array(r.ulke_ad), '/bildim/siralama');
      end if;
    exception when others then
      raise warning 'ulke sampiyonu odulu verilemedi (%): %', r.user_id, sqlerrm;
    end;
  end loop;

  -- 647: dünya şampiyonu ödülü.
  for r in
    select a.user_id from public.lig_arsiv a
     where a.hafta = v_hafta and a.dunya_sampiyonu
  loop
    begin
      perform public.rozet_ver(r.user_id, 'lig_dunya_sampiyonu', false, false);
      if v_dunya_bildirim then
        perform public.bildirim_anahtarla(r.user_id, 'dunya_sampiyonu', 'dunya_sampiyonu_oldun',
                                          '[]'::jsonb, '/bildim/siralama');
      end if;
    exception when others then
      raise warning 'dunya sampiyonu odulu verilemedi (%): %', r.user_id, sqlerrm;
    end;
  end loop;

  -- Uygulama içi haftalık sonuç bildirimi (push'tan bağımsız, herkese; botlara bildirim_anahtarla gitmez)
  for r in
    select a.user_id, a.sira_sehir, a.sira_global, a.sehir, a.puan
    from public.lig_arsiv a
    where a.hafta = v_hafta
  loop
    perform public.bildirim_anahtarla(
      r.user_id, 'hafta_sonuc', case when r.sira_sehir is not null then 'hafta_sonuc_sehir' else 'hafta_sonuc_dunya' end,
      case when r.sira_sehir is not null
        then jsonb_build_array(coalesce(r.sehir, 'şehrinde'), r.sira_sehir, r.puan)
        else jsonb_build_array(r.sira_global, r.puan) end,
      '/bildim/siralama'
    );
  end loop;

  update public.profiles set puan_hafta = 0 where puan_hafta <> 0;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3) Oyuncu kartı (canlı = 646 gövdesi): unvan önceliği dünya > ülke > şehir > takılı.
--    Dönüş tipi AYNI (koleksiyon_puani dahil) → CREATE OR REPLACE, yetki korunur.
--    unvan jsonb: {tur:'dunya', tr, en} | {tur:'ulke', ulke:<kod>, ad:<ülke adı>} | {tur:'sehir', sehir, ulke} | ...
--    Arşiv satırı tek lateral ile (user_id, hafta) PK'sinden okunur — N+1 yok.
-- ---------------------------------------------------------------------------
create or replace function public.oyuncu_kartlari(p_idler uuid[])
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
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
    left join lateral (select a.sehir, a.ulke, a.hafta,
                              a.sehir_sampiyonu as sehir_s, a.ulke_sampiyonu as ulke_s, a.dunya_sampiyonu as dunya_s
                         from public.lig_arsiv a
                        where a.user_id = p.id and a.hafta = public.hafta_basi() - 7) ar on true
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;

-- ---------------------------------------------------------------------------
-- 4) unvanlarim() (canlı = 644 gövdesi) + ulke_sampiyonu / dunya_sampiyonu alanları
-- ---------------------------------------------------------------------------
create or replace function public.unvanlarim()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_takili text;
  v_sonuc jsonb;
  v_sehir jsonb;
  v_ulke jsonb;
  v_dunya jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.unvan_galibiyet_kontrol(v_me);
  select takili_unvan into v_takili from public.profiles where id = v_me;
  select jsonb_build_object('sehir', a.sehir, 'ulke', a.ulke, 'hafta', a.hafta) into v_sehir
    from public.lig_arsiv a where a.user_id = v_me and a.hafta = public.hafta_basi() - 7 and a.sehir_sampiyonu;
  -- 647: aktif ülke / dünya şampiyonluğu (null = yok)
  select jsonb_build_object('ulke', a.ulke, 'ad', coalesce(u.ad, a.ulke), 'hafta', a.hafta) into v_ulke
    from public.lig_arsiv a left join public.ulkeler u on u.kod = a.ulke
   where a.user_id = v_me and a.hafta = public.hafta_basi() - 7 and a.ulke_sampiyonu;
  select jsonb_build_object('hafta', a.hafta) into v_dunya
    from public.lig_arsiv a where a.user_id = v_me and a.hafta = public.hafta_basi() - 7 and a.dunya_sampiyonu;
  select coalesce(jsonb_agg(jsonb_build_object(
           'anahtar', t.anahtar, 'tur', t.tur, 'ad_tr', t.ad_tr, 'ad_en', t.ad_en,
           'aciklama_tr', t.aciklama_tr, 'aciklama_en', t.aciklama_en,
           'kazanildi', k.anahtar is not null, 'takili', t.anahtar = v_takili) order by t.sira), '[]'::jsonb)
    into v_sonuc
    from public.unvan_tanimlari t
    left join public.oyuncu_unvan_listesi(v_me) k on k.anahtar = t.anahtar
   where t.aktif;
  return jsonb_build_object('unvanlar', v_sonuc, 'takili', v_takili, 'sehir_sampiyonu', v_sehir,
                            'ulke_sampiyonu', v_ulke, 'dunya_sampiyonu', v_dunya);
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5) ulke_dunya_sampiyonu(): çağıranın ülkesinin ve dünyanın geçen hafta şampiyonu (sehir_sampiyonu() karşılığı).
--    Tek fonksiyonda ikisi: {ulke: {user_id, ulke, ad, hafta, puan} | null, dunya: {user_id, hafta, puan} | null}.
--    Bot bilgisi DÖNMEZ.
-- ---------------------------------------------------------------------------
create or replace function public.ulke_dunya_sampiyonu()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_ulke jsonb;
  v_dunya jsonb;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select jsonb_build_object('user_id', a.user_id, 'ulke', a.ulke, 'ad', coalesce(u.ad, a.ulke), 'hafta', a.hafta, 'puan', a.puan)
    into v_ulke
    from public.profiles me
    join public.lig_arsiv a
      on a.hafta = public.hafta_basi() - 7 and a.ulke_sampiyonu and a.ulke = me.ulke
    left join public.ulkeler u on u.kod = a.ulke
   where me.id = auth.uid()
   limit 1;
  select jsonb_build_object('user_id', a.user_id, 'hafta', a.hafta, 'puan', a.puan)
    into v_dunya
    from public.lig_arsiv a
   where a.hafta = public.hafta_basi() - 7 and a.dunya_sampiyonu
   limit 1;
  return jsonb_build_object('ulke', v_ulke, 'dunya', v_dunya);
end;
$function$;
revoke all on function public.ulke_dunya_sampiyonu() from public, anon;
grant execute on function public.ulke_dunya_sampiyonu() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Geriye dönük: arşivdeki geçmiş haftalar (641 §8 deseni). O haftalarda botlar arşivlenmediği için
--    arşivdeki kayıtlar arasından; asgari şart yok. Görünürlük şimdiki ölçütle (lig_kapanis_havuzu ile aynı):
--    görünmeyen / test / açık-bot / pasif-bot hesap şampiyon olmaz. Sıra: haftalık puan → toplam puan → ad → id.
--    Rozet coin'siz, görülmüş (popup yok).
-- ---------------------------------------------------------------------------
update public.lig_arsiv a
   set ulke_sampiyonu = true
  from (
    select x.user_id, x.hafta,
           row_number() over (partition by x.hafta, x.ulke
                              order by x.puan desc, coalesce(p.puan, 0) desc, p.gorunen_ad asc, x.user_id asc) as rn
      from public.lig_arsiv x
      join public.profiles p on p.id = x.user_id
     where x.ulke is not null and x.puan > 0
       and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
       and (coalesce(p.is_bot, false) or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac))
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)
       and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true))
  ) s
 where s.rn = 1 and a.user_id = s.user_id and a.hafta = s.hafta;

update public.lig_arsiv a
   set dunya_sampiyonu = true
  from (
    select x.user_id, x.hafta,
           row_number() over (partition by x.hafta
                              order by x.puan desc, coalesce(p.puan, 0) desc, p.gorunen_ad asc, x.user_id asc) as rn
      from public.lig_arsiv x
      join public.profiles p on p.id = x.user_id
     where x.puan > 0
       and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
       and (coalesce(p.is_bot, false) or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac))
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)
       and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true))
  ) s
 where s.rn = 1 and a.user_id = s.user_id and a.hafta = s.hafta;

select public.rozet_ver(a.user_id, 'lig_ulke_sampiyonu', false, true)
  from (select distinct user_id from public.lig_arsiv where ulke_sampiyonu) a;
select public.rozet_ver(a.user_id, 'lig_dunya_sampiyonu', false, true)
  from (select distinct user_id from public.lig_arsiv where dunya_sampiyonu) a;

-- Koleksiyon Puanı (646): yeni rozetler elmas kademe → efsanevi ağırlık; sahipler yeniden hesaplanır.
select public.koleksiyon_hepsini_yenile();

-- ---------------------------------------------------------------------------
-- 7) Level çerçeve adları geri alındı (643'teki "Level N Madalyası" kararı yanlıştı; 360'taki adlar).
-- ---------------------------------------------------------------------------
update public.cerceveler set ad_tr = 'Level 25 Bronz', ad_en = 'Level 25 Bronze' where anahtar = 'level_25';
update public.cerceveler set ad_tr = 'Level 50 Gümüş', ad_en = 'Level 50 Silver' where anahtar = 'level_50';
update public.cerceveler set ad_tr = 'Level 75 Altın', ad_en = 'Level 75 Gold' where anahtar = 'level_75';
update public.cerceveler set ad_tr = 'Level 100 Altın Kanatlar', ad_en = 'Level 100 Golden Wings' where anahtar = 'level_100';
