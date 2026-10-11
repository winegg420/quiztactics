-- 1063: ORTAK HAZİNE — karar süresi doldu bildirimi (Yayın öncesi canlı tarama, 11 Eki 2026)
--
-- Sorun (canlı ölçüm + taklit ölçüm araclar/yayin-oncesi-tarama.mjs › m1): karar sayacı 0'a indikten sonra panel ~4 sn
-- daha açık kalıyordu. Süre dolumu yalnız kasa_ilerlet'te faz_bitis + secim_gec_varis_sn (3 sn, 991 geç varış payı)
-- sonra uygulanıyor, sonra istemci bir sonraki okumada görüyordu. Pay, süre içinde basılıp ağda yolda olan dokunuş
-- içindir; karar sahibinin istemcisi dokunmadığını bildiği için bu bekleme ölü bekleme idi.
--
-- Değişiklik: kasa_karar(p_id, p_ac) p_ac = NULL ile çağrılırsa "süre doldu" bildirimidir:
--   · yalnız karar sahibi (kasanın sahibi), yalnız faz 'karar' iken ve yalnız now() >= faz_bitis ise;
--   · süre dolumu sunucunun kendi yolundan uygulanır: kasa_karar_uygula(p_id, false, true) — DEVAM sayılır, hazine
--     tavanda ve tavan ≥ hedef ise otomatik AÇ (988), son_karar.sure_doldu = true (rakip ekranı aynı anı oynar);
--   · maç donuksa (1059 kopuk_at) hiçbir şey yapmaz; faz zaten geçtiyse sessizce döner; erken gelirse 'Süre dolmadı'.
-- İstemci (KasaPage) bunu yalnız karar sahibinin ekranında, dokunuş yolda değilken, sayaç 0'dan ~150 ms sonra çağırır;
-- rakibin istemcisi çağırmaz (karar sahibinin yolda olan dokunuşu pay içinde aynen kabul edilir).
--
-- Oyuncu aleyhine süre kısaltma YOK: faz_bitis, karar_sn, gösterim payı ve geç varış payı değişmedi; boolean p_ac
-- davranışı 991 ile birebir aynı. İmza aynı (create or replace) → mevcut EXECUTE yetkileri korunur; yeni yetki/grant yok.
-- Geri alma: 20260612000991_cevap_gec_varis_payi.sql içindeki kasa_karar tanımını yeniden çalıştır.

CREATE OR REPLACE FUNCTION public.kasa_karar(p_id uuid, p_ac boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  k := public.kasa_kilitle(p_id);

  -- 1063: süre doldu bildirimi (p_ac NULL)
  if p_ac is null then
    if k.durum <> 'aktif' or k.faz <> 'karar' then return; end if;   -- zaten ilerledi
    if k.sahip is distinct from auth.uid() then raise exception 'Karar kasanın sahibinde'; end if;
    if k.kopuk_at is not null then return; end if;                  -- maç donuk: süre işlemiyor (1059)
    if now() < k.faz_bitis then raise exception 'Süre dolmadı'; end if;
    perform public.kasa_karar_uygula(p_id, false, true);
    perform public.kasa_ilerlet(p_id);
    perform public.kasa_sinyal_ver(p_id);
    return;
  end if;

  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'karar' then raise exception 'Şu an karar verilemez'; end if;
  -- 991: süre bitince yalnız süre içinde tıklanmış (x-qt-tik) karar, geç varış payı içinde kabul
  if not public.cevap_gec_kabul(k.faz_bitis, interval '0 seconds', public.ayar_ondalik('secim_gec_varis_sn', 3)) then raise exception 'Şu an karar verilemez'; end if;
  if k.sahip is distinct from auth.uid() then raise exception 'Karar kasanın sahibinde'; end if;
  if coalesce(p_ac, false) and k.kasa < k.acma_min then
    raise exception 'Kasa en az % olmalı', k.acma_min;
  end if;
  perform public.kasa_karar_uygula(p_id, coalesce(p_ac, false), false);
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
end $function$;
