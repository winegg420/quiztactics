-- 443: Ölü "bot portresi yazma" Storage kuralları kaldırıldı (Ida onayı, 24 Eyl 2026).
--
-- avatarlar_bot_portre_yaz (INSERT) ve avatarlar_bot_portre_guncelle (UPDATE) bot_portre_yolu_mu()
-- fonksiyonunu çağırıyordu; fonksiyonun authenticated yetkisi 234'te (güvenlik sertleştirmesi)
-- kaldırılmıştı. Sonuç: bu kurallar hiçbir şeye izin vermiyor, üstelik yetki hatası fırlattığı için
-- giriş yapmış kullanıcıların Storage'a yaptığı BÜTÜN yüklemeleri düşürüyordu. Çalışsalardı da her
-- oyuncunun bot portrelerini yazmasına izin verecekleri için yetki GERİ VERİLMEDİ; kurallar silindi.
-- Kalan avatarlar kuralları: okuma herkese, yazma/güncelleme/silme yalnız oyuncunun kendi klasörü.
drop policy if exists avatarlar_bot_portre_yaz on storage.objects;
drop policy if exists avatarlar_bot_portre_guncelle on storage.objects;
