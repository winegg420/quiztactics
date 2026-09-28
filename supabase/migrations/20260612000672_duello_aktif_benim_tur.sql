-- Ana sayfadaki "devam eden maçın var" kartı (bütün modlar) Düello için de sıra/tur
-- bilgisi göstermek istiyor. duellolar tablosu istemciye kapalı (658: revoke all);
-- duello_aktif_benim() dar okuma RPC'sine yalnız zararsız bir alan (tur, 1-10) eklendi.
-- Soru/kategori/hamle gibi stratejik bilgi hâlâ sızmıyor. Ida onayı (28 Eyl 2026,
-- güvenlik kuralı değişikliği).
drop function if exists public.duello_aktif_benim();
create or replace function public.duello_aktif_benim()
returns table (id uuid, oyuncu1 uuid, oyuncu2 uuid, tur int)
language sql
stable security definer
set search_path to 'public'
as $function$
  select d.id, d.oyuncu1, d.oyuncu2, d.tur
    from public.duellolar d
   where d.durum = 'aktif'
     and auth.uid() in (d.oyuncu1, d.oyuncu2)
   order by d.created_at desc
   limit 50;
$function$;

revoke all on function public.duello_aktif_benim() from public, anon;
grant execute on function public.duello_aktif_benim() to authenticated;
