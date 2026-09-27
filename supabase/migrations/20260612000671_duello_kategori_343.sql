-- ============================================================
-- 671 · DÜELLO KATEGORİ PUANI — MAÇ BAŞINA 3/4/3 (Ida, 27 Eyl 2026)
--
-- Sayısal oranı olan kategoriler oyuncunun kendi içinde sıralanır:
-- üst yaklaşık %30 → ★★★ (6), alt yaklaşık %30 → ★ (1), kalan → ★★ (3).
-- Veri yoksa (<5 cevap; duello_oranlar_ic çıktısı null) doğrudan ★★ olur.
-- Eşit oran kategori anahtarıyla kırılır. Yıldızlar yalnız yeni maç kurulurken
-- hesaplandığından devam eden maçların yildiz1/yildiz2 değerleri değişmez.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_yildiz_ust_yuzde', '30'::jsonb, 'Düello: sayısal verili kategorilerin üst yüzde kaçı ★★★ (6 puan) olur'),
  ('duello_yildiz_alt_yuzde', '30'::jsonb, 'Düello: sayısal verili kategorilerin alt yüzde kaçı ★ (1 puan) olur')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

update public.oyun_ayarlari
   set aciklama = case anahtar
     when 'duello_yildiz_zayif_esik' then 'KULLANILMIYOR (671): sabit %45 eşiği yerine maç başına göreli 3/4/3 dağılımı'
     when 'duello_yildiz_orta_esik' then 'KULLANILMIYOR (671): sabit %70 eşiği yerine maç başına göreli 3/4/3 dağılımı'
   end
 where anahtar in ('duello_yildiz_zayif_esik', 'duello_yildiz_orta_esik');

-- 670 yarım kalan ton denemesiydi; yeni tasarım üç düz renk kullanır.
delete from public.oyun_ayarlari
 where anahtar in ('duello_kat_ton_orta_yuzde', 'duello_kat_ton_koyu_yuzde');

-- Tek bir oran artık yıldız belirlemez; geriye dönük çağrılar güvenli orta değeri alır.
create or replace function public.duello_yildiz(p_oran integer)
returns smallint language sql immutable security definer set search_path = public as $$
  select 2::smallint;
$$;
revoke all on function public.duello_yildiz(integer) from public, anon, authenticated;

create or replace function public.duello_yildizlar_ic(p_oranlar jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  with ham as (
    select k,
           case when jsonb_typeof(p_oranlar -> k) = 'number'
                then (p_oranlar ->> k)::numeric end as oran
      from unnest(public.duello_kategorileri()) k
  ), sirali as (
    select k, oran,
           row_number() over (order by oran desc nulls last, k) as sira,
           count(oran) over ()::int as sayisal
      from ham
  ), sinirli as (
    select *,
           case when sayisal >= 2 then least(
             greatest(round(sayisal * public.ayar_sayi('duello_yildiz_ust_yuzde', 30) / 100.0)::int, 1),
             floor(sayisal / 2.0)::int
           ) else 0 end as ust_sayi,
           case when sayisal >= 2 then least(
             greatest(round(sayisal * public.ayar_sayi('duello_yildiz_alt_yuzde', 30) / 100.0)::int, 1),
             floor(sayisal / 2.0)::int
           ) else 0 end as alt_sayi
      from sirali
  )
  select coalesce(jsonb_object_agg(k,
    case when oran is null then 2
         when sira <= ust_sayi then 3
         when sira > sayisal - alt_sayi then 1
         else 2 end), '{}'::jsonb)
    from sinirli;
$$;
revoke all on function public.duello_yildizlar_ic(jsonb) from public, anon, authenticated;
