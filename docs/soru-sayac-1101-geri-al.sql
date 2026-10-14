-- 1101 geri alma: kuyruktaki sayım önce sayaçlara yazılır, sonra soru_sayac eski (doğrudan UPDATE) gövdesine döner.
select public.soru_sayac_bosalt();
select cron.unschedule('bildim-soru-sayac') where exists (select 1 from cron.job where jobname = 'bildim-soru-sayac');
CREATE OR REPLACE FUNCTION public.soru_sayac(p_question uuid, p_dogru boolean)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.questions
     set cevap_sayisi = cevap_sayisi + 1,
         dogru_sayisi = dogru_sayisi + case when p_dogru then 1 else 0 end
   where id = p_question;
$function$;
drop function if exists public.soru_sayac_bosalt();
drop table if exists public.soru_sayac_kuyruk;
