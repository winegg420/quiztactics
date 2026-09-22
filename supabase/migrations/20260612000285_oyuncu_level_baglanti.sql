-- Paket 2 birleştirme: skill kilidinin level kaynağı.
-- 281 (Şerit B) oyuncu_level()'i, level kolonu henüz yokken güvenli olsun diye 1
-- döndürecek biçimde tanımlamıştı. Level'in tek kaynağı 278'de (Şerit A) eklenen
-- profiles.level kolonudur; fonksiyon artık onu okur. Kolon boşsa 1.
create or replace function public.oyuncu_level(p_user uuid)
returns integer
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce((select p.level from public.profiles p where p.id = p_user), 1)::int;
$function$;

revoke all on function public.oyuncu_level(uuid) from public, anon;
grant execute on function public.oyuncu_level(uuid) to authenticated;   -- 281 ile aynı yetki (level herkese açık bilgi)
