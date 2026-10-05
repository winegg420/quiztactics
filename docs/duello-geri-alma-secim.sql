-- Düello 960 GERİ ALMA — sıralı kategori seçimi (draft) kapatılır, eski akışa dönülür.
-- ÇALIŞTIRMA NOTU: bu dosya yalnız ayar değiştirir; şema / fonksiyon dokunulmaz (960'ın kodu eski akışı da taşır).
--   · duello_secim_modu = false → YENİ açılan maçlar eski akışla: bütün kategoriler boş, ban + saldırı turları,
--     eşik duello_bos_mod_esik (5), tur duello_bos_mod_max_tur (16).
--   · Lobi / tanıtım metinleri (duello_hakimiyet_esik, duello_max_tur) eski değerleri göstersin diye o iki ayar da 5 / 16'ya döner.
--   · SÜREN maçlar etkilenmez: mod, eşik ve tur sayısı maç satırına sabitlenmiştir (seçim maçı seçimle, 7 / 20 ile biter).
-- Yeniden açmak: duello_secim_modu = true, duello_hakimiyet_esik = 7, duello_max_tur = 20.

update public.oyun_ayarlari set deger = 'false'::jsonb where anahtar = 'duello_secim_modu';
update public.oyun_ayarlari set deger = '5'::jsonb,
       aciklama = 'Düello Hâkimiyet: bu kadar kategoriye (yuva) ilk ulaşan kazanır (870: 4 → 5; maç satırına sabitlenir)'
 where anahtar = 'duello_hakimiyet_esik';
update public.oyun_ayarlari set deger = '16'::jsonb,
       aciklama = 'Düello: maçın tur sayısı (Hâkimiyet: 1 tur = 1 hamle; 1 Eki 2026 Ida kararı 10 → 16; maç satırına sabitlenir)'
 where anahtar = 'duello_max_tur';
