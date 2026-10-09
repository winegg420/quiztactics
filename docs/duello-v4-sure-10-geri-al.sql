-- Geri alma: Düello v4 kart seçimi süresi 10 sn → 7 sn (1035'i geri alır). İstemcideki ?? 10 yedek değerleri de 7'ye döner (Duello4Arena.jsx, DuelloPage.jsx).
update public.oyun_ayarlari set deger = '7'::jsonb where anahtar = 'duello4_kart_sn';
