-- 722 — lig_grubum_ozet(): komşu satırlara 'sezon_bp' (Battle Pass altın halkası) eklendi; başka değişiklik yok (kaynak: 661).
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
           'premium_cerceve', k.premium_cerceve, 'premium_aura', k.premium_aura, 'sezon_bp', k.sezon_bp)
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
$function$

;
