-- ============================================================
-- 762 — duello_kategorileri() hızlandırma (1 Eki 2026, Düello takılma ölçümü)
--
-- Ölçüm (temiz şart, begin…rollback): duello_durum kategori fazında ort 99,8 ms / p95 108 ms, öteki fazlarda
-- ~15 ms. Farkın kaynağı duello_kategorileri(): questions üzerinde `select distinct kategori … where aktif`
-- (tek çağrı 9–16 ms, ~4000 buffer; soğukken 468–814 ms görüldü). duello2_kategori_uygun_mu her kategori için
-- onu yeniden çağırdığından kategori fazında düello satırı kilidi (FOR UPDATE) altında ~12 kez çalışıyordu.
-- Düzeltme: aynı sonuç (aktif sorulardaki ayrı, boş olmayan kategoriler, sıralı) "gevşek dizin taraması"yla
-- (recursive CTE, questions_kategori_zorluk_idx (kategori, zorluk) WHERE aktif) — kategori başına tek dizin
-- sıçraması. İmza, dönüş, STABLE / SECURITY DEFINER ve yetkiler (create or replace ACL'yi korur) aynı.
-- Tekrar çalıştırılabilir.
-- ============================================================

create or replace function public.duello_kategorileri()
returns text[]
language sql
stable security definer
set search_path to 'public'
as $function$
  with recursive k(ad) as (
    (select q.kategori from public.questions q
      where q.aktif and q.kategori is not null
      order by q.kategori limit 1)
    union all
    select (select q.kategori from public.questions q
             where q.aktif and q.kategori is not null and q.kategori > k.ad
             order by q.kategori limit 1)
      from k where k.ad is not null
  )
  select coalesce(array_agg(ad order by ad) filter (where ad is not null), '{}') from k;
$function$;
