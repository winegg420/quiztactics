-- Arkadaşlar sayfası aktif düelloyu `duellolar` tablosundan doğrudan okuyordu;
-- tablo bilinçli olarak istemciye KAPALI (205: revoke all) → her açılışta 403 +
-- "Maça gir" şeridi hiç çıkmıyordu. Tabloyu açmak yerine (soru/hamle durumu
-- sızar) yalnız çağıranın kendi aktif düellolarının kimlik + rakip bilgisini
-- veren dar bir okuma RPC'si.
create or replace function public.duello_aktif_benim()
returns table (id uuid, oyuncu1 uuid, oyuncu2 uuid)
language sql
stable security definer
set search_path to 'public'
as $function$
  select d.id, d.oyuncu1, d.oyuncu2
    from public.duellolar d
   where d.durum = 'aktif'
     and auth.uid() in (d.oyuncu1, d.oyuncu2)
   order by d.created_at desc
   limit 50;
$function$;

revoke all on function public.duello_aktif_benim() from public, anon;
grant execute on function public.duello_aktif_benim() to authenticated;
