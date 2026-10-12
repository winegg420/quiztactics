-- 1080 geri alma: coin_gunluk_kalan 1080 öncesi canlı gövdeye (720).
-- begin/commit YOK; doğrudan uygulanır.
create or replace function public.coin_gunluk_kalan(p_user uuid)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0, public.ayar_sayi('coin_gunluk_tavan', 400) - coalesce((
    select sum(h.miktar) from public.coin_hareketleri h
    where h.user_id = p_user and h.miktar > 0
      and h.tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'ekonomi_esitleme', 'seviye', 'sezon_yolu')
      and (h.olusturuldu at time zone 'Europe/Istanbul')::date
          = (now() at time zone 'Europe/Istanbul')::date
  ), 0));
$function$;
