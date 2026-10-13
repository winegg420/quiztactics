-- 1087 — Bot Battle Pass görünümü (Ida kararı, 13 Eki 2026): altın isim YALNIZ Battle Pass'e aittir.
-- a) bot_kozmetik: gizli botların rastgele isim efekti havuzundan isim_altin çıkar. Bot kozmetiği saklanmaz,
--    her okumada kimlikten hesaplanır; dolayısıyla "atanmış" isim_altin da kendiliğinden kalkar (havuz değişince
--    seçim başka efekte kayar). Gerçek oyuncu verisine dokunulmaz.
-- b) bot_bp_gorunur: bazı gizli botlar BP sahibi gibi görünür — altın isim + BP halkası (sezon_bp) + avatar
--    parlaması (bp_parlama) BİRLİKTE. Kimlik tabanlı sabit: bot_rasgele('bp:' || id) < min(%35, %10 + level × %0,4)
--    (level 1 ≈ %10, 25 ≈ %20, 63+ = %35; ölçüm: 155 gizli bottan 35'i). Gerçek oyuncunun sezon_bp_gorunur
--    mantığı DEĞİŞMEZ; botta da yalnız aktif, test olmayan sezon açıkken görünür.
-- c) oyuncu_kartlari: tanım canlıdan (pg_get_functiondef) alındı; yalnız isim_efekti sırası, bp lateral'i ve
--    bp_parlama satırı değişti. Ek sorgu yok (1061 ilkesi). Yetki/RLS/GRANT değişikliği YOK: imzalar aynı,
--    yeni yardımcı yalnız bu iki security definer işlevin içinden çağrılır.

CREATE OR REPLACE FUNCTION public.bot_bp_gorunur(p_id uuid, p_level integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p_id is not null
     and public.bot_rasgele('bp:' || p_id::text) < least(0.35, 0.10 + 0.004 * coalesce(p_level, 1))
     and public.sezon_yolu_acik_mi()
     and exists (select 1 from public.sezonlar s where s.kapandi_at is null and not s.test);
$function$;
-- Yeni işlev varsayılanı PUBLIC EXECUTE'tur; bot_kozmetik ile aynı kapalılıkta kalsın (yalnız iç çağrı).
revoke execute on function public.bot_bp_gorunur(uuid, integer) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bot_kozmetik(p_id uuid, p_level integer, p_tur text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_olasilik numeric;
  v_adaylar text[];
begin
  if p_id is null then return null; end if;
  if p_tur in ('premium_cerceve', 'premium_aura') then return null; end if;   -- 560: botlar premium takmaz
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
       and public.kozmetik_fiyati(k.tur, k.fiyat_elmas) is not null
       and k.anahtar <> 'isim_altin';   -- 1087: altın isim yalnız Battle Pass'e ait (bkz. bot_bp_gorunur)
  end if;
  if v_adaylar is null or cardinality(v_adaylar) = 0 then return null; end if;
  return v_adaylar[1 + floor(public.bot_rasgele('bks:' || p_tur || ':' || p_id::text) * cardinality(v_adaylar))::int];
end;
$function$
;

CREATE OR REPLACE FUNCTION public.oyuncu_kartlari(p_idler uuid[])
 RETURNS TABLE(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text, premium_cerceve text, premium_aura text, sehir_sampiyonu jsonb, unvan jsonb, koleksiyon_puani integer, sezon_bp boolean, bp_parlama boolean)
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
         -- 1087: BP görünümlü gizli bot da altın isim taşır; BP'siz botun havuzunda isim_altin yok
         case when bp.var then 'isim_altin'
              when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
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
         -- 1061: aktif sezonun Battle Pass sahibi → avatar parlar (takılı avatardan bağımsız; gizli botta false)
         -- 1087: BP görünümlü gizli bot da parlar (gerçek oyuncuda bp.var = sezon_bp_gorunur, değişmedi)
         ,bp.var
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    left join public.cerceveler lc on lc.anahtar = 'lig_' || coalesce(p.lig, 'bronz')
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
    cross join lateral (select case when gb.gizli then public.bot_bp_gorunur(p.id, p.level)
                                    else (not coalesce(p.is_bot, false)) and public.sezon_bp_gorunur(p.id) end as var) bp
    left join lateral (select a.sehir, a.ulke, a.hafta,
                              a.sehir_sampiyonu as sehir_s, a.ulke_sampiyonu as ulke_s, a.dunya_sampiyonu as dunya_s
                         from public.lig_arsiv a
                        where a.user_id = p.id and a.hafta = public.hafta_basi() - 7) ar on true
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$
;
