-- ============================================================
-- 1117 — SESLİ SOHBET KALDIRILDI (Ida, 16 Eki 2026: "gereksiz")
--
-- İstemcide sesli sohbet her moddan kalktı (SesliSohbet.jsx, sesliSohbet.js,
-- stiller, metinler, Gizlilik/Koşullar bölümleri). Sunucu kapısı da kapanır:
-- sesli_sohbet_izni SİLİNMEZ, her çağrıda izinli=false döner. Eski bir
-- istemci (önbellekteki sürüm) çağırsa bile görüşme kurulmaz.
--
-- Değişmeyenler: imza, dönüş tipi, security definer, search_path ve yetkiler
-- (create or replace mevcut GRANT/REVOKE'u korur: yalnız authenticated).
-- mac_sonu_sesli_sn ayar satırı ve eski veri silinmez.
-- Geri alma: docs/sesli-sohbet-1117-geri-al.sql (206 sürümünün gövdesi).
-- ============================================================

create or replace function public.sesli_sohbet_izni(p_match_id uuid)
returns table(izinli boolean, neden text, rakip_id uuid, kapanis_sn integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  return query select false, 'Sesli sohbet kaldırıldı'::text, null::uuid, null::int;
end;
$$;
