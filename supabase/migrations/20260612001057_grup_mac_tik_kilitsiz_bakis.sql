-- ============================================================
-- 1057 — 1056 düzeltmesi (10 Eki 2026): bot_grup_mac_tik her tikte, iş olmasa da maç satırını
-- FOR UPDATE ile kilitliyordu. Satır kilidi tuple başlığını yazar (WAL + kirli sayfa); disk G/Ç'si kısılmış
-- nano sunucuda gereksiz yazı. Ön kilit kalktı: bot_grup_adimlari zaten yalnız işi olan maçı kilitler
-- (8: FOR UPDATE SKIP LOCKED, 9: advance_group_match — 1056 ile 2 sn'de kilit yoksa döner).
-- Oyun kuralı / yetki değişmez (CREATE OR REPLACE ACL'yi korur).
-- ============================================================

CREATE OR REPLACE FUNCTION public.bot_grup_mac_tik(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $function$
-- 1056: tek grup maçının bot adımı; hata yalnız bu maçı geri alır.
-- 1057: ön kilit yok — işi olmayan maçta satıra yazı yapılmaz.
begin
  perform public.bot_grup_adimlari(p_id);
exception when others then
  raise warning 'bot_grup_mac_tik %: % (%)', p_id, sqlerrm, sqlstate;
end;
$function$;
