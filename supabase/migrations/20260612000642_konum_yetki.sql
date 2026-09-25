-- 642: profil_konum_kaydet yalnız authenticated (Ida onayı, 25 Eyl 2026): anon/public yetkisi kaldırıldı.
-- Gövde değişmedi; fonksiyon zaten auth.uid() yoksa 'Giriş gerekli' der.
revoke all on function public.profil_konum_kaydet(text, text) from public, anon;
grant execute on function public.profil_konum_kaydet(text, text) to authenticated, service_role;
