-- 1035 · Düello v4 kart seçimi kullanılabilir süresi 7 sn → 10 sn (Ida, 9 Eki 2026).
-- Tek kaynak oyun_ayarlari.duello4_kart_sn; 1034'ün mantığı aynı: faz_bitis = kart açılışı + duyuru + 10 sn,
-- istemci sayacı ve botlar bu değerden (faz_bitis / sureler.kart) hesaplar. Duyuru süresi (900 ms) ve oto-seçim kuralları değişmez.
-- Geri alma: docs/duello-v4-sure-10-geri-al.sql
update public.oyun_ayarlari set deger = '10'::jsonb where anahtar = 'duello4_kart_sn';
