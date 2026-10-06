-- KASA 981 GERİ ALMA — ÇALIŞTIRILMADI. Gerekirse Supabase SQL düzenleyicisinde tek seferde çalıştır.
-- 981 yalnız kasa_tavan değerini değiştirdi (80). Bu dosya 956 değerini (60) geri yazar.
-- Değer yeni maçlarda kasa_maclari.kasa_tavan'a sabitlenir: geri alma yalnız SONRA açılan maçları etkiler.

begin;

update public.oyun_ayarlari
   set deger = '60'::jsonb,
       aciklama = 'KASA: hazine bu değeri hiç geçemez (artıştan ve DEVAM çarpanından sonra). 955: 30; 956: 60. 0 = tavan yok. Yeni maçlar.'
 where anahtar = 'kasa_tavan';

do $$ begin
  if (select deger::text from public.oyun_ayarlari where anahtar = 'kasa_tavan') <> '60' then
    raise exception 'geri alma 981: kasa_tavan beklenen değerde değil';
  end if;
end $$;

commit;
