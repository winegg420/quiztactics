-- ============================================================
-- 1040 · CEVAP İMZASI (Ida, 10 Eki 2026) — yeni satılık kozmetik ailesi
--
-- Oyuncu bir soruyu DOĞRU cevaplayınca doğru şıkkın üstünde ~0,8–1,3 sn oynayan kişisel efekt.
-- YALNIZ oyuncunun kendisi görür: sunucuya / Realtime'a "imza oynadı" bilgisi gitmez; takılı imza
-- yalnız kendi istemcinde okunur (profilim() satırın tamamını döndürür; profiles kolonları
-- authenticated'a kolon kolon açıktır ve YENİ kolon açılmaz → başkası okuyamaz; oyuncu_kartlari'na
-- eklenmez). Süre / puan / soru / eşleşme etkilenmez (pay-to-win yok), yeni ses yok.
--
-- Mevcut kozmetik altyapısı yeniden kullanılır (ikinci sistem yok):
--   kozmetikler (yeni tür 'cevap_imzasi') · oyuncu_kozmetikleri (sahiplik) · profiles.takili_cevap_imzasi (takılı)
--   · kozmetik_katalogu / kozmetik_satin_al / kozmetik_tak · Koleksiyon Puanı (kozmetikler.nadirlik, tetikleyici).
-- Para: Nadir → COIN (coin_harca; 1039 avatar_satin_al coin dalının aynı deseni), Epik / Efsanevi → ELMAS.
--   Para kalemin icerik.para alanında ('coin' | 'elmas'); fiyat oyun_ayarlari'ndan (koda gömülmez):
--   coin_cevap_imzasi_nadir 750 · elmas_cevap_imzasi_epik 150 · elmas_cevap_imzasi_efsanevi 300 (TEST).
-- Satış kapısı: kozmetik_satis_acik (mevcut) VE yeni cevap_imzasi_satis_acik (false). Kapalıyken yalnız
--   sahip hesap görür ve satın almadan takar (mevcut sahip test modu); normal oyuncu alamaz.
-- Yetki/GRANT/RLS değişikliği YOK: yalnız mevcut fonksiyonlar CREATE OR REPLACE (imza ve yetkiler aynı kalır).
-- Geri alma: docs/cevap-imzasi-1040-geri-al.sql
-- ============================================================

-- 1) Yeni tür
alter table public.kozmetikler drop constraint if exists kozmetikler_tur_check;
alter table public.kozmetikler add constraint kozmetikler_tur_check
  check (tur = any (array['vs_karti', 'isim_efekti', 'zafer_efekti', 'tepki_paketi', 'premium_cerceve', 'premium_aura', 'cevap_imzasi']));

-- 2) Takılı imza (yalnız sahibinin istemcisi okur — kolon authenticated'a AÇILMAZ)
alter table public.profiles add column if not exists takili_cevap_imzasi text;

-- 3) Ayarlar (TEST fiyatları; SQL ile değişir)
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('cevap_imzasi_satis_acik', 'false'::jsonb,
   'Cevap İmzası satışı açık mı (1040). false iken Dükkân › Efekt yalnız sahip hesapta görünür (test modu: satın almadan takar); normal oyuncu alamaz. kozmetik_satis_acik da açık olmalı.'),
  ('coin_cevap_imzasi_nadir', '750'::jsonb, 'TEST — Nadir Cevap İmzası fiyatı (coin). 1040.'),
  ('elmas_cevap_imzasi_epik', '150'::jsonb, 'TEST — Epik Cevap İmzası fiyatı (elmas). 1040.'),
  ('elmas_cevap_imzasi_efsanevi', '300'::jsonb, 'TEST — Efsanevi Cevap İmzası fiyatı (elmas). 1040.')
on conflict (anahtar) do nothing;

-- 4) Beş ürün (Ida onayı, 10 Eki 2026). nadirlik = Koleksiyon Puanı ağırlığı; dukkan_nadirlik = fiyat kademesi.
insert into public.kozmetikler (anahtar, tur, ad_tr, ad_en, fiyat_elmas, icerik, aktif, onay, onay_zamani, sira, nadirlik, satis_pasif, dukkan_nadirlik) values
  ('imza_neon_tik',   'cevap_imzasi', 'Neon Tik',          'Neon Tick',      null, '{"para":"coin"}'::jsonb,  true, 'girsin', now(), 701, 'nadir',    false, 'nadir'),
  ('imza_yildiz',     'cevap_imzasi', 'Yıldız Patlaması',  'Star Burst',     null, '{"para":"coin"}'::jsonb,  true, 'girsin', now(), 702, 'nadir',    false, 'nadir'),
  ('imza_ampul',      'cevap_imzasi', 'Bilgi Ampulü',      'Bright Idea',    null, '{"para":"elmas"}'::jsonb, true, 'girsin', now(), 703, 'epik',     false, 'epik'),
  ('imza_elektrik',   'cevap_imzasi', 'Elektrik Akımı',    'Electric Surge', null, '{"para":"elmas"}'::jsonb, true, 'girsin', now(), 704, 'epik',     false, 'epik'),
  ('imza_yanan_kart', 'cevap_imzasi', 'Yanan Kart',        'Burning Card',   null, '{"para":"elmas"}'::jsonb, true, 'girsin', now(), 705, 'efsanevi', false, 'efsanevi')
on conflict (anahtar) do nothing;

-- 5) Fiyat: cevap_imzasi → <para>_cevap_imzasi_<dukkan_nadirlik>. Öteki türler AYNEN.
create or replace function public.kozmetik_fiyati(p_tur text, p_fiyat integer, p_dukkan_nadirlik text)
 returns integer
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(p_fiyat,
                  case when p_tur = 'premium_aura' and p_dukkan_nadirlik is not null
                       then nullif(public.ayar_sayi('elmas_arka_plan_' || p_dukkan_nadirlik, 0), 0)
                       -- 1040: Nadir coin'le, Epik / Efsanevi elmasla
                       when p_tur = 'cevap_imzasi' and p_dukkan_nadirlik is not null
                       then nullif(public.ayar_sayi(case when p_dukkan_nadirlik = 'nadir' then 'coin_' else 'elmas_' end
                                                    || 'cevap_imzasi_' || p_dukkan_nadirlik, 0), 0)
                       else nullif(public.ayar_sayi('elmas_' || p_tur, 0), 0) end)::int;
$function$;

-- 6) Satışta mı: cevap_imzasi ayrıca kendi bayrağına bağlı. Öteki türler AYNEN.
create or replace function public.kozmetik_satista(p_anahtar text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce((select k.aktif and k.onay = 'girsin' and not k.satis_pasif
                          and public.kozmetik_fiyati(k.tur, k.fiyat_elmas, k.dukkan_nadirlik) is not null
                          -- 1040: Cevap İmzası kendi kapısıyla açılır
                          and (k.tur <> 'cevap_imzasi'
                               or coalesce((select case jsonb_typeof(a.deger)
                                                     when 'boolean' then (a.deger #>> '{}')::boolean
                                                     when 'number'  then (a.deger #>> '{}')::numeric <> 0
                                                     when 'string'  then lower(a.deger #>> '{}') in ('true', '1', 'evet')
                                                     else false end
                                              from public.oyun_ayarlari a where a.anahtar = 'cevap_imzasi_satis_acik'), false))
                     from public.kozmetikler k where k.anahtar = p_anahtar), false)
     and public.kozmetik_satis_acik_mi();
$function$;

-- 7) Satın alma: coin dalı (yalnız icerik.para = 'coin' olan kalem). Elmas akışı AYNEN.
create or replace function public.kozmetik_satin_al(p_anahtar text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_k public.kozmetikler%rowtype;
  v_fiyat int;
  v_bakiye bigint;
  v_para text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kozmetik_satin_al', 20, interval '60 seconds');
  select * into v_k from public.kozmetikler k where k.anahtar = p_anahtar;
  if not found or not v_k.aktif then raise exception 'Böyle bir kozmetik yok'; end if;
  if not public.kozmetik_satista(v_k.anahtar) then raise exception 'Bu kozmetik satılmıyor'; end if;
  v_fiyat := public.kozmetik_fiyati(v_k.tur, v_k.fiyat_elmas, v_k.dukkan_nadirlik);
  -- 1040: para kalemde (yalnız Nadir Cevap İmzası coin); yoksa elmas
  v_para := case when v_k.tur = 'cevap_imzasi' and v_k.icerik->>'para' = 'coin' then 'coin' else 'elmas' end;

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca / coin_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = v_k.anahtar) then
    raise exception 'Bu kozmetik zaten sende';
  end if;

  if v_para = 'coin' then
    v_bakiye := public.coin_harca(v_fiyat, v_k.tur, v_k.anahtar);    -- yetersizse 'Yetersiz coin'
  else
    v_bakiye := public.elmas_harca(v_fiyat, v_k.tur, v_k.anahtar);   -- yetersizse 'Yetersiz elmas'
  end if;
  insert into public.oyuncu_kozmetikleri (user_id, kozmetik, kaynak) values (v_me, v_k.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_k.anahtar, 'tur', v_k.tur, 'fiyat', v_fiyat, 'para', v_para,
                            'bakiye', v_bakiye, 'sahip', true);
end;
$function$;

-- 8) Tak / çıkar: yeni yuva. Öteki türler AYNEN (sahip test modu dahil).
create or replace function public.kozmetik_tak(p_tur text, p_anahtar text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_tur text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kozmetik_tak', 30, interval '60 seconds');
  if p_tur not in ('vs_karti', 'isim_efekti', 'zafer_efekti', 'premium_cerceve', 'premium_aura', 'cevap_imzasi') then
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
         takili_premium_aura    = case when p_tur = 'premium_aura'    then p_anahtar else takili_premium_aura end,
         takili_cevap_imzasi    = case when p_tur = 'cevap_imzasi'    then p_anahtar else takili_cevap_imzasi end
   where id = v_me;
  return jsonb_build_object('tur', p_tur, 'takili', p_anahtar);
end;
$function$;

-- 9) Katalog: takılı imza işaretlenir. Dönüş tipi AYNI (yetkiler korunur).
create or replace function public.kozmetik_katalogu()
 returns table(anahtar text, tur text, ad text, ad_tr text, ad_en text, fiyat integer, icerik jsonb, sira integer, satilik boolean, sahip boolean, takili boolean, kapali boolean, onay text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
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
         pr.takili_premium_cerceve, pr.takili_premium_aura, pr.takili_cevap_imzasi into p
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
                                p.takili_premium_cerceve, p.takili_premium_aura, p.takili_cevap_imzasi), false),
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
