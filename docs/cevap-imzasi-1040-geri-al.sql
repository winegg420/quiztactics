-- GERİ ALMA · 1040 Cevap İmzası (docs/cevap-imzasi-1040-geri-al.sql)
-- Dört fonksiyonu 1040 öncesi hâline döndürür (canlıdan alınmış tanımlar, 10 Eki 2026), imza satırlarını,
-- sahipliklerini, ayarları ve takılı kolonu kaldırır. ÖNCE: alınmış imza varsa iade kararı Ida'nındır
-- (coin_hareketleri / elmas_hareketleri tur = 'cevap_imzasi'). Tek transaction'da çalıştır.
begin;
-- ===== kozmetik_satista 
CREATE OR REPLACE FUNCTION public.kozmetik_satista(p_anahtar text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select k.aktif and k.onay = 'girsin' and not k.satis_pasif
                          and public.kozmetik_fiyati(k.tur, k.fiyat_elmas, k.dukkan_nadirlik) is not null
                     from public.kozmetikler k where k.anahtar = p_anahtar), false)
     and public.kozmetik_satis_acik_mi();
$function$;

-- ===== kozmetik_satin_al 
CREATE OR REPLACE FUNCTION public.kozmetik_satin_al(p_anahtar text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_fiyat := public.kozmetik_fiyati(v_k.tur, v_k.fiyat_elmas, v_k.dukkan_nadirlik);

  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = v_k.anahtar) then
    raise exception 'Bu kozmetik zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, v_k.tur, v_k.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_kozmetikleri (user_id, kozmetik, kaynak) values (v_me, v_k.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_k.anahtar, 'tur', v_k.tur, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$function$;

-- ===== kozmetik_tak 
CREATE OR REPLACE FUNCTION public.kozmetik_tak(p_tur text, p_anahtar text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_tur text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kozmetik_tak', 30, interval '60 seconds');
  if p_tur not in ('vs_karti', 'isim_efekti', 'zafer_efekti', 'premium_cerceve', 'premium_aura') then
    raise exception 'Bu tür takılmaz';
  end if;
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null then
    select k.tur into v_tur from public.kozmetikler k where k.anahtar = p_anahtar and k.aktif and k.onay = 'girsin';
    if v_tur is null or v_tur <> p_tur then raise exception 'Böyle bir kozmetik yok'; end if;
    if not public.sahip_mi() and not exists (
         select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = p_anahtar) then
      raise exception 'Bu kozmetik sende yok';
    end if;
  end if;
  update public.profiles
     set takili_vs_karti        = case when p_tur = 'vs_karti'        then p_anahtar else takili_vs_karti end,
         takili_isim_efekti     = case when p_tur = 'isim_efekti'     then p_anahtar else takili_isim_efekti end,
         takili_zafer_efekti    = case when p_tur = 'zafer_efekti'    then p_anahtar else takili_zafer_efekti end,
         takili_premium_cerceve = case when p_tur = 'premium_cerceve' then p_anahtar else takili_premium_cerceve end,
         takili_premium_aura    = case when p_tur = 'premium_aura'    then p_anahtar else takili_premium_aura end
   where id = v_me;
  return jsonb_build_object('tur', p_tur, 'takili', p_anahtar);
end;
$function$;

-- ===== kozmetik_katalogu 
CREATE OR REPLACE FUNCTION public.kozmetik_katalogu()
 RETURNS TABLE(anahtar text, tur text, ad text, ad_tr text, ad_en text, fiyat integer, icerik jsonb, sira integer, satilik boolean, sahip boolean, takili boolean, kapali boolean, onay text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_sahip_hesap boolean;
  p record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  v_sahip_hesap := public.sahip_mi();
  select pr.takili_vs_karti, pr.takili_isim_efekti, pr.takili_zafer_efekti,
         pr.takili_premium_cerceve, pr.takili_premium_aura into p
    from public.profiles pr where pr.id = v_me;
  return query
  select k.anahtar, k.tur, case when v_en then k.ad_en else k.ad_tr end, k.ad_tr, k.ad_en,
         public.kozmetik_fiyati(k.tur, k.fiyat_elmas, k.dukkan_nadirlik),
         -- 821: dükkân nadirliği (yalnız tanımlıysa) içerikle birlikte gider
         case when k.dukkan_nadirlik is null then k.icerik
              else coalesce(k.icerik, '{}'::jsonb) || jsonb_build_object('nadirlik', k.dukkan_nadirlik) end,
         k.sira,
         public.kozmetik_satista(k.anahtar),
         exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar),
         coalesce(k.anahtar in (p.takili_vs_karti, p.takili_isim_efekti, p.takili_zafer_efekti,
                                p.takili_premium_cerceve, p.takili_premium_aura), false),
         not public.kozmetik_satista(k.anahtar),
         case when v_sahip_hesap then k.onay end
    from public.kozmetikler k
   where k.aktif and k.onay = 'girsin'
     and (v_sahip_hesap
          or public.kozmetik_satista(k.anahtar)
          or exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar))
   order by k.sira;
end;
$function$;

CREATE OR REPLACE FUNCTION public.kozmetik_fiyati(p_tur text, p_fiyat integer, p_dukkan_nadirlik text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(p_fiyat,
                  case when p_tur = 'premium_aura' and p_dukkan_nadirlik is not null
                       then nullif(public.ayar_sayi('elmas_arka_plan_' || p_dukkan_nadirlik, 0), 0)
                       else nullif(public.ayar_sayi('elmas_' || p_tur, 0), 0) end)::int;
$function$;

update public.profiles set takili_cevap_imzasi = null where takili_cevap_imzasi is not null;
delete from public.oyuncu_kozmetikleri where kozmetik in (select anahtar from public.kozmetikler where tur = 'cevap_imzasi');
delete from public.kozmetikler where tur = 'cevap_imzasi';
alter table public.profiles drop column if exists takili_cevap_imzasi;
delete from public.oyun_ayarlari where anahtar in ('cevap_imzasi_satis_acik', 'coin_cevap_imzasi_nadir', 'elmas_cevap_imzasi_epik', 'elmas_cevap_imzasi_efsanevi');
alter table public.kozmetikler drop constraint if exists kozmetikler_tur_check;
alter table public.kozmetikler add constraint kozmetikler_tur_check
  check (tur = any (array['vs_karti', 'isim_efekti', 'zafer_efekti', 'tepki_paketi', 'premium_cerceve', 'premium_aura']));
commit;
