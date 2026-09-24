-- ============================================================
-- 541 · OYUNCU KARTI + LİG ÖZETİ: elmas kozmetikleri (EKLEYİCİ — ek sorgu yok)
--
-- Rakibin/oyuncunun VS kartı, isim efekti ve zafer efekti mevcut tek çağrıdan gelir:
--   oyuncu_kartlari (maç şeridi, VS, lig tablosu, maç sonu, profil — istemcide toplu + önbellekli)
--   lig_grubum_ozet (ana sayfa canlı lig kartı) satırlarına isim efekti.
-- Gizli botlar: takılı yuvaları boş; kozmetik bot_kozmetik() ile kimlikten deterministik türetilir
--   (yalnız satıştaki + 'girsin' kalemler; satış kapalıyken hiçbir şey). Çıktı şekli insanla aynı —
--   is_bot sızmaz. Açık botlar kozmetik takmaz.
-- Dönüş tipine kolon eklendiği için DROP + CREATE; yetkiler 481'dekiyle birebir aynı yeniden verilir.
-- ============================================================
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text,
              vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text)
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
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'aura') else p.takili_aura end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'vs_karti')
              else (select k.anahtar from public.kozmetikler k where k.anahtar = p.takili_vs_karti and k.aktif) end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
              else (select k.anahtar from public.kozmetikler k where k.anahtar = p.takili_isim_efekti and k.aktif) end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'zafer_efekti')
              else (select k.anahtar from public.kozmetikler k where k.anahtar = p.takili_zafer_efekti and k.aktif) end
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated;

-- lig_grubum_ozet satırlarına isim efekti (ana sayfa canlı lig kartı; aynı kart, ek sorgu yok)
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
           'aura', k.aura, 'isim_efekti', k.isim_efekti)
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
