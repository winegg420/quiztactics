-- ============================================================
-- 1067 — Cevap İmzası: Yanan Kart (imza_yanan_kart) DONDURULDU (11 Eki 2026, Ida: "alevi iptal et, dondur").
--
-- Mevcut kozmetik kapatma yolu (yeni RPC / yetki değişikliği YOK):
--   1) kozmetikler.aktif = false + satis_pasif = true →
--        kozmetik_satista() false   → kozmetik_satin_al 'Bu kozmetik satılmıyor' (sunucu reddeder)
--        kozmetik_katalogu()        → kalem kimseye listelenmez (Dükkân › Efekt, Koleksiyon)
--        kozmetik_tak()             → 'Böyle bir kozmetik yok' (yeniden takılamaz)
--   2) Takılı olanlar null'a çekilir (istemci de oynatmaz: CevapImzasi.jsx › DONDURULAN).
-- Sahiplik kayıtları (oyuncu_kozmetikleri) SİLİNMEZ — dondurma, silme değil.
-- Ölçüm (11 Eki 2026, canlı, salt okuma): sahip 1 hesap = sahip hesabı (idaGG); gerçek alıcı 0; takılı 0 → iade yok.
--
-- Geri açma: update kozmetikler set aktif = true, satis_pasif = false where anahtar = 'imza_yanan_kart';
--            + CevapImzasi.jsx › DONDURULAN ve lib/cevapImzasi.js › DONDURULAN_IMZALAR'dan çıkar.
-- ============================================================

update public.kozmetikler
   set aktif = false,
       satis_pasif = true
 where anahtar = 'imza_yanan_kart';

update public.profiles
   set takili_cevap_imzasi = null
 where takili_cevap_imzasi = 'imza_yanan_kart';
