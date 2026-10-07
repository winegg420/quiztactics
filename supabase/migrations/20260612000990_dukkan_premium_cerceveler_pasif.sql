-- 990 · DÜKKÂN PREMIUM ÇERÇEVELERİ DONDURULDU (Ida, 7 Eki 2026). Arka plan dondurmasıyla (848) aynı yöntem: SİLME YOK.
-- Pasif: Sonbahar, Galaksi, Sakura, Sönmeyen Alev, Şimşek, Kraliyet (pc_*). Sahiplik (oyuncu_kozmetikleri) ve takılı
-- kayıt (profiles.takili_premium_cerceve) aynen kalır; kozmetik_satin_al/kozmetik_tak "Böyle bir kozmetik yok" der,
-- kozmetik_katalogu listelemez, oyuncu_kartlari premium_cerceve=null döner → avatar lig çerçevesine düşer.
-- DOKUNULMAYAN: lig çerçeveleri (cerceveler tablosu), pc_ejderha2 (Battle Pass seviye 28 ödülü, dükkânda satılmıyor).
-- GERİ AÇMAK: update public.kozmetikler set aktif = true where anahtar in
--   ('pc_sonbahar','pc_galaksi','pc_sakura','pc_alev2','pc_simsek2','pc_kraliyet2');   (+ istemci: ozellikBayraklari.js › DUKKAN_PREMIUM_CERCEVE_ACIK = true)
update public.kozmetikler set aktif = false
 where tur = 'premium_cerceve' and anahtar <> 'pc_ejderha2' and aktif;

do $$
declare v_aktif int; v_toplam int; v_sahip int; v_ejd boolean;
begin
  select count(*) filter (where aktif and anahtar <> 'pc_ejderha2'), count(*) into v_aktif, v_toplam from public.kozmetikler where tur = 'premium_cerceve';
  select aktif into v_ejd from public.kozmetikler where anahtar = 'pc_ejderha2';
  select count(*) into v_sahip from public.oyuncu_kozmetikleri where kozmetik like 'pc\_%';
  if v_aktif <> 0 then raise exception '990: aktif dükkân çerçevesi kaldı (%)', v_aktif; end if;
  if v_ejd is distinct from true then raise exception '990: pc_ejderha2 (BP ödülü) aktif olmalı'; end if;
  raise notice '990 premium_cerceve toplam % · aktif dükkân çerçevesi 0 · ejderha aktif · sahiplik kaydı % (hiçbiri silinmedi)', v_toplam, v_sahip;
end $$;
