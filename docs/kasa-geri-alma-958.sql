-- KASA 958 GERİ ALMA — ÇALIŞTIRILMADI. Gerekirse Supabase SQL düzenleyicisinde tek seferde çalıştır.
-- 958 yalnız iki ayar değerini değiştirdi (fonksiyon/şema değişmedi). Bu dosya canlı 958 öncesi değer + açıklamayı geri yazar:
--   kasa_acma_min 0 → 10, kasa_hedef_puan 80 → 60.
-- Değerler yeni maçlarda kasa_maclari.acma_min / hedef kolonlarına sabitlenir: geri alma yalnız SONRA açılan maçları etkiler;
-- süren 958 maçları acma_min 0 / hedef 80 ile biter.

begin;

update public.oyun_ayarlari
   set deger = '10'::jsonb,
       aciklama = 'KASA: kasa bunun altındayken AÇ reddedilir, karar fazı açılmaz (951). 0 = sınırsız.'
 where anahtar = 'kasa_acma_min';
update public.oyun_ayarlari
   set deger = '60'::jsonb,
       aciklama = 'KASA: kazanmak için gereken puan (950: 20; 951: 50; 955: 60).'
 where anahtar = 'kasa_hedef_puan';

do $$ begin
  if (select deger::text from public.oyun_ayarlari where anahtar = 'kasa_acma_min') <> '10'
     or (select deger::text from public.oyun_ayarlari where anahtar = 'kasa_hedef_puan') <> '60' then
    raise exception 'geri alma 958: ayarlar beklenen değerde değil';
  end if;
end $$;

commit;
