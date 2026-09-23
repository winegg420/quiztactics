-- 332 · Gizli rozet anahtarları nötr olsun: rozetlerim() kazanılmamış gizli rozetin
-- anahtarını da döndürüyor; 'gizli_bes_seans' gibi bir anahtar koşulu ele veriyordu.
-- Henüz kimse bu rozetleri kazanmadı (331 yeni), anahtar güvenle değişir.
update public.rozet_tanimlari t
   set anahtar = y.yeni
  from (values ('gizli_rovans', 'gizli_1'), ('gizli_uzatma', 'gizli_2'), ('gizli_kasif', 'gizli_3'),
               ('gizli_ilk_soz', 'gizli_4'), ('gizli_bes_seans', 'gizli_5')) as y(eski, yeni)
 where t.anahtar = y.eski
   and not exists (select 1 from public.oyuncu_rozetleri o where o.rozet = y.eski);
