-- 337 · Rakip arama yoklaması seyreltildi (A6): RakipAra kuyruga_gir'i saniyede bir değil
-- bu aralıkla yoklar. Sunucudaki dakikalık sınır (kuyruga_gir 30/dk) AYNI kalır.
insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('rakip_ara_yoklama_ms', '3000', 'Rakip ararken kuyruk yoklama aralığı (ms). Geri sayım saniyede bir akar.')
on conflict (anahtar) do nothing;
