-- 1109 geri alma: ana_sayfa_ozet 1098 tanımına döner ('devam' kapsamı ve 'lig_kartlari' anahtarı kalkar).
-- İstemci eksik anahtar/kapsamda o okumayı eskisi gibi ağdan yapar (ön yükleme boş döner).
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
