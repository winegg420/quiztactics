-- 371 · 370'ten beri okunmayan arama süresi ayarları "KULLANILMIYOR" diye işaretlenir.
-- Değer ve satır SİLİNMEZ (Ida kararı, 24 Eyl 2026); yalnız açıklama güncellenir.
-- Gizli botun geliş süresi artık eslesme_bot_min_sn / _tepe_sn / _max_sn'den gelir.
update public.oyun_ayarlari
   set aciklama = 'KULLANILMIYOR (370) — Düello: eski sabit gerçek oyuncu arama süresi. Yerine eslesme_bot_min/tepe/max_sn. Silinmedi.'
 where anahtar = 'duello_arama_sn';

update public.oyun_ayarlari
   set aciklama = 'KULLANILMIYOR (370) — Grup Maçı: eski sabit gerçek oyuncu arama süresi. Yerine eslesme_bot_min/tepe/max_sn. Silinmedi.'
 where anahtar = 'grup_arama_sn';
