-- Paket 30 D — Düello Saldırı Hazırlığı 4 sn → 6 sn (sahibinin kararı, 18 Eyl 2026).
--
-- Gerekçe (canlıda yaşandı): 4 saniyede soruyu okuyup "Soru Değiştir kullanayım mı"
-- kararını vermeye vakit yetmiyordu.
--
-- Süre zaten ayarda duruyordu (205): duello_kategori_uygula() hazırlık fazının
-- bitişini ayar_sayi('duello_hazirlik_sn', 4) ile kuruyor, duello_durum().sureler
-- de aynı ayarı istemciye veriyor. Kod değişmez, yalnız ayar.
--
-- DEĞİŞMEYENLER (ölçüldü): savunanın cevap süresi duello_cevap_sn = 15,
-- Zaman Baskısı duello_zaman_baskisi_sn = 10. Bot saldırırken hazırlık fazını
-- ERKEN BİTİRMEZ (duello_tik_hepsi yalnız joker kararı verir, faz faz_bitis'te
-- duello_ilerlet ile ilerler) → bot da aynı 6 sn'yi bekler, tempo simetrik.

update public.oyun_ayarlari
   set deger = '6'::jsonb
 where anahtar = 'duello_hazirlik_sn';

insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('duello_hazirlik_sn', '6'::jsonb, 'Düello Saldırı Hazırlığı süresi (sn)')
on conflict (anahtar) do nothing;
