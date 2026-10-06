-- Düello 970 GERİ ALMA — yeni puan kuralı kapatılır, 960 hâkimiyet akışına (7 yuva, 20 tur) dönülür.
-- ÇALIŞTIRMA NOTU: yalnız ayar değiştirir; şema / fonksiyon dokunulmaz (970'in kodu eski akışı da taşır).
--   · duello_puan_modu = "eski" → YENİ açılan maçlar puan_modu = false: kendi kategorisi pekiştirilebilir, puan yok,
--     duello_hakimiyet_esik (7) yuvaya ulaşan kazanır, tur duello_max_tur (20).
--   · SÜREN puan maçları etkilenmez: mod, hedef, kategori yolu ve tur sayısı maç satırına sabitlenmiştir.
--   · İstemci kuralı maç satırından (duello_durum › puan.acik) okur; lobi/tanıtım metinleri bayrağı ayardan okur.
-- Yeniden açmak: duello_puan_modu = "yeni".

update public.oyun_ayarlari set deger = '"eski"'::jsonb where anahtar = 'duello_puan_modu';
