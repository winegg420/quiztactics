-- ============================================================
-- 821 · ARKA PLAN SATIŞI: dükkân nadirliği + nadirliğe göre elmas fiyatı (Ida, 1 Eki 2026)
--
-- Arka plan = `kozmetikler.tur = 'premium_aura'` (560; 30 Eyl'den beri oyuncu KARTININ arkasında). Bugüne kadar
-- hepsi tek fiyattı: `elmas_premium_aura` 300 elmas (coin yolu hiç olmadı).
--
-- Yeni: `kozmetikler.dukkan_nadirlik` (yaygin | nadir | epik | efsanevi) ve fiyat nadirlikten
-- (`oyun_ayarlari.elmas_arka_plan_<nadirlik>`: Nadir 100 · Epik 200 · Efsanevi 300 — TEST; Yaygın arka plan henüz yok).
--   Yıldızlı Gece = nadir · Düşen Sonbahar Yaprakları, Su Altı, Yağan Kar = epik.
--   Pasif iki kalem (Yükselen Köz, Kuzey Işıkları) DEĞİŞMEZ: dukkan_nadirlik boş → eski fiyat kuralı.
--
-- NEDEN AYRI KOLON: `kozmetikler.nadirlik` (646) Koleksiyon Puanı'nın ağırlığıdır (siradan|nadir|epik|efsanevi;
-- arka planların hepsi 'efsanevi' = 10 puan). O kolona DOKUNULMAZ → Koleksiyon Puanı değişmez (avatarlarda da aynı
-- ayrım var: avatar_nitelikleri.nadirlik ↔ avatar_katalogu.nadirlik).
--
-- Fiyat kuralı tek yerde: kozmetik_fiyati(tur, fiyat_elmas, dukkan_nadirlik) — satır fiyatı (fiyat_elmas) varsa o,
-- yoksa arka planda nadirlik ayarı, diğer türlerde eski `elmas_<tur>` ayarı. Eski iki parametreli sürüm durur
-- (bot_kozmetik ve kozmetik_onay_listesi onu kullanır; ikisi de arka plan fiyatını etkilemez / yalnız sahip görür).
--
-- Satın alma ve "giy" doğrulaması ZATEN sunucuda: kozmetik_satin_al (profil FOR UPDATE, çift alım reddi, elmas_harca)
-- ve kozmetik_tak (sahip olunmayan kalem takılamaz). Gövdeleri canlıdaki son tanımların aynısıdır; yalnız fiyat çağrısı
-- üç parametreli oldu. Yetkiler korunur (create or replace). Mevcut sahiplik satırları ve takılılar DOKUNULMAZ.
-- Katalog dönüş tipi DEĞİŞMEZ: nadirlik `icerik.nadirlik` içinde gider (eski istemci etkilenmez).
-- Tekrar çalıştırılabilir. Yıkıcı değil.
-- ============================================================

-- ---------- 1. Kolon + fiyat ayarları (TEST) ----------
alter table public.kozmetikler add column if not exists dukkan_nadirlik text
  check (dukkan_nadirlik is null or dukkan_nadirlik in ('yaygin', 'nadir', 'epik', 'efsanevi'));

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_arka_plan_nadir', '100', 'TEST — Nadir arka plan fiyatı (elmas). 821.'),
  ('elmas_arka_plan_epik', '200', 'TEST — Epik arka plan fiyatı (elmas). 821.'),
  ('elmas_arka_plan_efsanevi', '300', 'TEST — Efsanevi arka plan fiyatı (elmas). 821.')
on conflict (anahtar) do nothing;

-- ---------- 2. Nadirlikler (yalnız oyundaki dört arka plan) ----------
update public.kozmetikler k
   set dukkan_nadirlik = v.nadirlik
  from (values ('pa_gece', 'nadir'), ('pa_yaprak', 'epik'), ('pa_sualti', 'epik'), ('pa_kar', 'epik')) as v(anahtar, nadirlik)
 where k.anahtar = v.anahtar and k.tur = 'premium_aura' and k.dukkan_nadirlik is distinct from v.nadirlik;

-- ---------- 3. Fiyat kuralı ----------
create or replace function public.kozmetik_fiyati(p_tur text, p_fiyat integer, p_dukkan_nadirlik text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_fiyat,
                  case when p_tur = 'premium_aura' and p_dukkan_nadirlik is not null
                       then nullif(public.ayar_sayi('elmas_arka_plan_' || p_dukkan_nadirlik, 0), 0)
                       else nullif(public.ayar_sayi('elmas_' || p_tur, 0), 0) end)::int;
$$;
revoke execute on function public.kozmetik_fiyati(text, integer, text) from public, anon, authenticated;

-- ---------- 4. Satışta mı (780'in gövdesi; fiyat üç parametreli) ----------
create or replace function public.kozmetik_satista(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select k.aktif and k.onay = 'girsin' and not k.satis_pasif
                          and public.kozmetik_fiyati(k.tur, k.fiyat_elmas, k.dukkan_nadirlik) is not null
                     from public.kozmetikler k where k.anahtar = p_anahtar), false)
     and public.kozmetik_satis_acik_mi();
$$;

-- ---------- 5. Katalog (560'ın gövdesi; fiyat üç parametreli, icerik.nadirlik eklenir) ----------
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
$$;

-- ---------- 6. Satın alma (540'ın gövdesi; fiyat üç parametreli) ----------
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
  v_fiyat := public.kozmetik_fiyati(v_k.tur, v_k.fiyat_elmas, v_k.dukkan_nadirlik);

  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = v_k.anahtar) then
    raise exception 'Bu kozmetik zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, v_k.tur, v_k.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_kozmetikleri (user_id, kozmetik, kaynak) values (v_me, v_k.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_k.anahtar, 'tur', v_k.tur, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$$;

-- ---------- 7. Rapor ----------
do $$
declare v_k text; v_sahip int; v_takili int;
begin
  select string_agg(anahtar || ' ' || coalesce(dukkan_nadirlik, '-') || ' '
                    || coalesce(public.kozmetik_fiyati(tur, fiyat_elmas, dukkan_nadirlik)::text, 'yok')
                    || case when aktif then '' else ' (pasif)' end, ', ' order by sira) into v_k
    from public.kozmetikler where tur = 'premium_aura';
  select count(*) into v_sahip
    from public.oyuncu_kozmetikleri o join public.kozmetikler k on k.anahtar = o.kozmetik where k.tur = 'premium_aura';
  select count(*) into v_takili from public.profiles where takili_premium_aura is not null;
  raise notice '821 arka planlar (nadirlik fiyat): %', v_k;
  raise notice '821 korunan sahiplik satırı: % · takılı: %', v_sahip, v_takili;
end $$;
