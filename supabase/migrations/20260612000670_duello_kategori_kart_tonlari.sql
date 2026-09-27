-- TARİHSEL KAYIT: Önceki yarım kalan oturumda canlıya uygulanmıştır.
-- 671 bu kullanılmayan ton ayarlarını kaldırır; istemciye alınmamıştır.
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_kat_ton_orta_yuzde', '20'::jsonb, 'Düello kategori kartı: mutlak fark bu yüzde puana ulaşınca orta renk tonu'),
  ('duello_kat_ton_koyu_yuzde', '35'::jsonb, 'Düello kategori kartı: mutlak fark bu yüzde puana ulaşınca koyu renk tonu')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;
