-- 848 · Arka plan kozmetikleri (pa_*) PASİF. Silme YOK: sahiplik kayıtları (oyuncu_kozmetikleri), takılı kayıtlar
-- (profiles.takili_premium_aura) ve 821'deki fiyat ayarları aynen kalır; yalnız oyuncuya görünmez/satın alınmaz/giyilemez.
-- kozmetik_satin_al: "not v_k.aktif → 'Böyle bir kozmetik yok'"; kozmetik_tak: aktif olmayan anahtarı reddeder; kozmetik_katalogu: aktif olanı listeler.
-- GERİ AÇMAK: update public.kozmetikler set aktif = true where anahtar in ('pa_gece','pa_sualti','pa_yaprak','pa_kar');
-- (848 öncesi: bu dördü aktif, pa_kor ve pa_kuzey zaten pasifti — 690.)
update public.kozmetikler set aktif = false where tur = 'premium_aura' and aktif;

do $$
declare v_aktif int; v_toplam int; v_sahip int; v_takili int;
begin
  select count(*) filter (where aktif), count(*) into v_aktif, v_toplam from public.kozmetikler where tur = 'premium_aura';
  select count(*) into v_sahip from public.oyuncu_kozmetikleri where kozmetik like 'pa\_%';
  select count(*) into v_takili from public.profiles where takili_premium_aura is not null;
  if v_aktif <> 0 then raise exception '848: aktif pa_* kaldı (%)', v_aktif; end if;
  raise notice '848 pa_* toplam % · aktif % · sahiplik kaydı % · takılı % (hiçbiri silinmedi)', v_toplam, v_aktif, v_sahip, v_takili;
end $$;
