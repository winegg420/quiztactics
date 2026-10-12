-- 1080: coin_gunluk_kalan, coin_ekle'nin tavandan muaf tuttuğu 'rozet', 'davet', 'posta_odul'
-- türlerini günlük toplamdan düşer (telefon denetimi 12 Eki, madde 1).
-- Sorun: coin_ekle bu üç türü 400 tavanından muaf tutuyor ama coin_gunluk_kalan sayıyordu;
-- rozet ödülleri gelince maç coin'i erken tavana takılıyordu (idagg: Hazine galibiyeti 15 yerine +3).
-- Yalnız hariç tutulan tür listesi genişler; imza, GRANT, RLS aynı.
create or replace function public.coin_gunluk_kalan(p_user uuid)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0, public.ayar_sayi('coin_gunluk_tavan', 400) - coalesce((
    select sum(h.miktar) from public.coin_hareketleri h
    where h.user_id = p_user and h.miktar > 0
      and h.tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'ekonomi_esitleme', 'seviye', 'sezon_yolu',
                        'rozet', 'davet', 'posta_odul')
      and (h.olusturuldu at time zone 'Europe/Istanbul')::date
          = (now() at time zone 'Europe/Istanbul')::date
  ), 0));
$function$;
