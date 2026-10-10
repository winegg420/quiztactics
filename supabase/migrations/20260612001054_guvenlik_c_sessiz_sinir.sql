-- ============================================================
-- 1054 — 1053 düzeltmesi: cihaz_bildir ve kalp_at arka plan çağrılarıdır; hız sınırı aşılınca
-- hata atmak yerine sessizce hiçbir şey yapmaz. (arayuz-denetim hızlı sayfa açılışında konsol hatası buldu.)
-- Yetki değişmez (CREATE OR REPLACE, ACL korunur). Geri alma: docs/guvenlik-c-geri-al.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.cihaz_bildir(p_cihaz text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_ip text;
begin
  if v_me is null then return; end if;
  if nullif(btrim(coalesce(p_cihaz, '')), '') is null then return; end if;
  -- 1054: arka plan çağrısı — sınır aşılınca hata yerine sessizce atla (istemci konsolu kirlenmesin)
  begin
    perform public.hiz_siniri('cihaz_bildir', 10, interval '60 seconds');
  exception when others then
    return;
  end;

  begin
    v_ip := split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      ',', 1);
  exception when others then
    v_ip := null;   -- başlık yoksa (doğrudan bağlantı) sessizce geç
  end;

  insert into public.oyuncu_cihazlari (user_id, cihaz_id, ip, son_at)
  values (v_me, left(p_cihaz, 64), nullif(btrim(coalesce(v_ip, '')), ''), now())
  on conflict (user_id, cihaz_id)
    do update set ip = coalesce(excluded.ip, public.oyuncu_cihazlari.ip), son_at = now();
end;
$function$;

CREATE OR REPLACE FUNCTION public.kalp_at()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- 1054: nabız — sınır aşılınca hata yerine sessizce atla
  begin
    perform public.hiz_siniri('kalp_at', 60, interval '60 seconds');
  exception when others then
    return;
  end;
  perform public.nabiz_yaz(auth.uid());   -- 996
end $function$;
