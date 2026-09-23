-- ============================================================
-- Disk IO: duello_kilitle son görülmeyi her çağrıda değil, 5 sn'de bir yazar (23 Eyl 2026)
--
-- Her duello_durum/eylem çağrısı profiles.last_seen satırını yeniden yazıyordu (oyuncu
-- başına saniyede ~1,3 yazma). Kopukluk eşiği 25 sn, nabız aralığı eşiğin yarısından küçük;
-- 5 sn'lik seyreltme kopukluk tespitini değiştirmez. Mantığın geri kalanı canlı tanımla aynı.
-- ============================================================
CREATE OR REPLACE FUNCTION public.duello_kilitle(p_id uuid)
 RETURNS duellolar
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if auth.uid() not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  -- Düelloya bakan oyuncu bağlıdır (Paket 24 · A.4)
  update public.profiles set last_seen = now()
   where id = auth.uid() and (last_seen is null or last_seen < now() - interval '5 seconds');

  perform public.duello_ilerlet(p_id);
  select * into d from public.duellolar where id = p_id;
  return d;
end;
$function$;
