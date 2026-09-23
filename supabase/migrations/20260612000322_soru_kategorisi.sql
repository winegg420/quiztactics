-- ============================================================
-- soru_kategorisi — maç ekranında kategoriye göre pastel zemin (23 Eyl 2026)
--
-- Klasik / Turnuva / Grup soru RPC'leri (get_match_question vb.) sorunun kategorisini
-- döndürmüyor; imzaları değiştirilmesin diye yalnız kategoriyi veren küçük, EKLEYİCİ bir
-- fonksiyon. Doğru cevap ya da başka alan dönmez. Birincil anahtarla tek satır okur.
-- ============================================================
create or replace function public.soru_kategorisi(p_soru uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select kategori from public.questions where id = p_soru;
$$;

revoke all on function public.soru_kategorisi(uuid) from public, anon;
grant execute on function public.soru_kategorisi(uuid) to authenticated;
