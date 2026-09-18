-- Paket 31 A.5 — Klasik Mod bot jokerini aç (247'de 0 ile başlamıştı).
-- İstemci (rakibin soru/sayaç/kilit yenilemesi, commit e1c25df) canlıda doğrulandıktan
-- sonra uygulanır: bot soruyu değiştirirse insanın ekranı artık yeni soruyu gösteriyor.
-- 15: düellodaki duello_bot_joker_yuzde ile aynı.
update public.oyun_ayarlari set deger = '15'::jsonb where anahtar = 'klasik_bot_joker_yuzde';
