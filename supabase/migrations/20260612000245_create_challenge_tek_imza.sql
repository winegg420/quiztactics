-- Paket 30 A — ACİL: create_challenge HTTP 300 (PGRST203) veriyordu.
--
-- Canlıdan ölçüldü (pg_proc, 18 Eyl 2026): public.create_challenge İKİ imza —
--   create_challenge(p_rakip uuid, p_kategori text DEFAULT NULL)
--   create_challenge(p_rakip uuid, p_kategori text DEFAULT NULL, p_dereceli boolean DEFAULT true)
-- İkisi de 235'te oluşturulmuş. İstemci yalnız { p_rakip } (ya da + p_kategori)
-- gönderince ikisi de uyuyor → PostgREST hangisini çağıracağını seçemiyor → 300.
-- Sonuç: arkadaşa Klasik Mod daveti hiçbir oyuncuda çalışmıyordu.
--
-- DİKKAT: iki gövde AYNI DEĞİLDİ. 2 parametreli sürümde Paket 24 A.2'nin
-- davet_siniri_kontrol(p_rakip) çağrısı (modlar toplamı bekleyen davet sınırı)
-- vardı, 3 parametrelide YOKTU. Yalnız 2'liyi düşürmek o kuralı sessizce
-- kaldırırdı. Bu yüzden 3 parametreli sürüm önce kuralla birlikte yeniden
-- kuruluyor (gövde canlıdakiyle birebir + o tek satır), sonra fazla imza düşüyor.

CREATE OR REPLACE FUNCTION public.create_challenge(p_rakip uuid, p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  perform public.hiz_siniri('create_challenge', 20, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if p_rakip = auth.uid() then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then
    raise exception 'Oyuncu bulunamadı';
  end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;
  if exists (
    select 1 from public.matches
    where durum in ('bekliyor','aktif')
      and ((oyuncu1 = auth.uid() and oyuncu2 = p_rakip)
        or (oyuncu1 = p_rakip and oyuncu2 = auth.uid()))
  ) then
    raise exception 'Bu oyuncuyla zaten devam eden bir meydan okuman var';
  end if;

  -- Kural 2: modlar toplamı (Paket 24 · A.2) — 2 parametreli sürümden taşındı (Paket 30 A)
  perform public.davet_siniri_kontrol(p_rakip);

  perform public.mac_kotasi_kontrol();

  insert into public.matches (oyuncu1, oyuncu2, kategori, dereceli)
  values (auth.uid(), p_rakip, p_kategori, coalesce(p_dereceli, true))
  returning id into v_id;
  return v_id;
end;
$function$

;

drop function if exists public.create_challenge(uuid, text);

-- Paket 26 A güvenlik kuralı: yalnız authenticated.
revoke all on function public.create_challenge(uuid, text, boolean) from public, anon;
grant execute on function public.create_challenge(uuid, text, boolean) to authenticated;
