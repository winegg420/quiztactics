-- 463: Terk kuralı eki (460) — turnuvadan çıkan oyuncunun günlük serisi ilerlemez.
-- Test (işlem içi) yakaladı: turnuva bitince trg_turnuva_bitti herkes için mac_sayaci_arttir → seri_guncelle
-- çağırıyor, günün ilk maçıysa seri coini (coin_seri_*) terk edene de yazılıyordu. Klasik/Düello'da
-- 460 aynı şeyi zaten kapattı; Grup'ta seri hiç yok.

CREATE OR REPLACE FUNCTION public.trg_turnuva_bitti()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
  if new.durum = 'bitti' and coalesce(old.durum, '') <> 'bitti' then
    perform public.odul_baglam('turnuva:' || new.id::text);   -- Paket 20 I.3 (seri coin'i bu turnuvanın dökümüne)
    for r in
      select tp.user_id, tp.terk_at from public.tournament_players tp
      where tp.tournament_id = new.id
    loop
      -- 463: terk eden maç sayısına girer ama günlük serisi (ve seri coini) ilerlemez
      perform public.mac_sayaci_arttir(r.user_id, r.terk_at is null);
    end loop;
  end if;
  return new;
end;
$function$;
