-- 1098 — ana_sayfa_ozet: soğuk açılışta ilk tur verisi TEK çağrıda (Paket A/1, 14 Eki 2026, Ida onaylı).
--
-- Ölçüm (CPU 6x + yavaş 4G): ana sayfanın ilk turdaki ~17 isteği ancak JS indirilip çalışınca (4,3 sn) başlıyordu.
-- index.html'deki ön yükleme betiği bunu profilim ile birlikte, JS inerken çağırır; istemci (src/lib/supabase.js
-- › dilliFetch) aynı adlı RPC çağrılarını bu yanıttan BİR KEZ karşılar, sonrakiler ağa gider.
--
-- Yeni veri/kural YOK: her anahtar mevcut fonksiyonun kendisidir (auth.uid() ile yalnız çağıranın kendi verisi).
-- Yan etkili olanlar (rozet_bildirimlerim "görüldü" yazar, kalp_at, cihaz_bildir) BİLEREK dışarıda.
-- Bir fonksiyon hata verirse yalnız o anahtar düşer (istemci o çağrıyı ağdan yapar).
-- p_kapsam: 'kabuk' = her ekranın üst çubuk/zil verisi · 'ana' = yalnız ana sayfanın kartları.
-- İki kapsam ön yüklemede paralel çağrılır (sunucuda sıralı toplam süre ikiye bölünür).

create or replace function public.ana_sayfa_ozet(p_kapsam text default 'kabuk')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v jsonb := '{}'::jsonb;
  v_ad text;
  v_deger jsonb;
  v_adlar text[];
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  v_adlar := case p_kapsam
    when 'kabuk' then array['dm_okunmamis_sayim', 'posta_kutusu', 'coin_bakiyem', 'sezon_ozetim', 'bekleyen_davetlerim', 'bekleyen_sayim']
    when 'ana' then array['avatar_nadirlik_renkleri', 'seri_durumum', 'sezon_yolu_durumum', 'gorevlerim', 'lig_grubum_ozet']
    else array[]::text[] end;
  foreach v_ad in array v_adlar loop
    begin
      v_deger := case v_ad
        -- tek değer döndürenler (PostgREST gövdesi = değerin kendisi)
        when 'dm_okunmamis_sayim' then to_jsonb(public.dm_okunmamis_sayim())
        when 'posta_kutusu' then to_jsonb(public.posta_kutusu())
        when 'sezon_ozetim' then to_jsonb(public.sezon_ozetim())
        when 'bekleyen_sayim' then to_jsonb(public.bekleyen_sayim())
        when 'sezon_yolu_durumum' then to_jsonb(public.sezon_yolu_durumum())
        when 'gorevlerim' then to_jsonb(public.gorevlerim())
        when 'lig_grubum_ozet' then to_jsonb(public.lig_grubum_ozet())
        -- tablo döndürenler (PostgREST gövdesi = satır dizisi)
        when 'coin_bakiyem' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.coin_bakiyem() t)
        when 'bekleyen_davetlerim' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.bekleyen_davetlerim() t)
        when 'avatar_nadirlik_renkleri' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.avatar_nadirlik_renkleri() t)
        when 'seri_durumum' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.seri_durumum() t)
      end;
      -- null değer de geçerli yanıttır ("null" gövdesi); anahtar yine yazılır
      v := v || jsonb_build_object(v_ad, coalesce(v_deger, 'null'::jsonb));
    exception when others then
      raise warning 'ana_sayfa_ozet › %: % (%)', v_ad, sqlerrm, sqlstate;
    end;
  end loop;
  return v;
end $$;

revoke all on function public.ana_sayfa_ozet(text) from public, anon;
grant execute on function public.ana_sayfa_ozet(text) to authenticated;
