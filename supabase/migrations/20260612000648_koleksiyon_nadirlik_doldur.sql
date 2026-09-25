-- 648: Koleksiyon Puanı — 646'da boş bırakılan nadirlikler dolduruldu (Ida onayı, 25 Eyl 2026). Yalnız UPDATE, yıkıcı değil.
--   * unvan_tanimlari: rozete bağlı unvan → rozetin kademesi (bronz=siradan · gumus=nadir · altin=epik · elmas=efsanevi);
--     olay unvanları Ida'nın verdiği listeyle. Rozete bağlı 9 unvanın elle yazılan değeri rozet_tanimlari.kademe ile
--     karşılaştırıldı: hepsi tuttu (efsane_lig_sampiyonu/tarih/bilim/dahi elmas · cografya/turnuva altın · duello/seri/kusursuz gümüş).
--   * kozmetikler: tur'a göre (elmas fiyatı: vs/isim/tepki 100–150 nadir · zafer 200 epik · premium 300–500 efsanevi);
--     yalnız NULL olanlar (elle verilmiş değer ezilmez).
--   * avatar_katalogu.nadirlik BİLEREK BOŞ (null): avatarlar 550'den beri herkese ücretsiz; bedava seçilebilen şey
--     koleksiyon puanı vermez.
-- Sonda bütün oyuncuların puanı yeniden hesaplanır.

update public.unvan_tanimlari set nadirlik = case anahtar
    when 'duello_ustasi' then 'nadir' when 'seri_canavari' then 'nadir'
    when 'kusursuz' then 'nadir' when 'altin_lig_fatihi' then 'nadir'
    when 'cografya_kasifi' then 'epik' when 'turnuva_sampiyonu' then 'epik' when 'elmas_lig_birincisi' then 'epik'
    when 'tarih_ustasi' then 'efsanevi' when 'bilim_dehasi' then 'efsanevi' when 'dahi' then 'efsanevi'
    when 'efsane_lig_sampiyonu' then 'efsanevi' when 'bes_kez_lig_birincisi' then 'efsanevi' when 'bin_galibiyet' then 'efsanevi'
  end
 where nadirlik is null
   and anahtar in ('duello_ustasi', 'seri_canavari', 'kusursuz', 'altin_lig_fatihi', 'cografya_kasifi', 'turnuva_sampiyonu',
                   'elmas_lig_birincisi', 'tarih_ustasi', 'bilim_dehasi', 'dahi', 'efsane_lig_sampiyonu',
                   'bes_kez_lig_birincisi', 'bin_galibiyet');

update public.kozmetikler set nadirlik = case tur
    when 'vs_karti' then 'nadir' when 'isim_efekti' then 'nadir' when 'tepki_paketi' then 'nadir'
    when 'zafer_efekti' then 'epik'
    when 'premium_cerceve' then 'efsanevi' when 'premium_aura' then 'efsanevi'
  end
 where nadirlik is null
   and tur in ('vs_karti', 'isim_efekti', 'tepki_paketi', 'zafer_efekti', 'premium_cerceve', 'premium_aura');

select public.koleksiyon_hepsini_yenile();
