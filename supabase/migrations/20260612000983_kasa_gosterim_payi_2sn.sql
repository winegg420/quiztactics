-- 983: ORTAK HAZİNE (kod adı kasa) gösterim payı 1,5 sn → 2,0 sn (Ida, 6 Eki 2026; öneri PROGRESS.md 990).
--
-- NEDEN: 990 sunumunda rakip kararında kapalı kart 0,3 + AÇ/DEVAM anı tabanı 1,0 sn; Realtime gecikmesiyle
--    an 1,5 sn payı aşıp soru süresinden yiyordu. 2,0 sn'de tipik gecikmede an soru süresine dokunmadan biter.
-- YALNIZ AYAR DEĞERİ değişir; fonksiyon/şema DEĞİŞMEZ.
-- DİKKAT: pay maça SABİTLENMEZ — kasa_gosterim_payi() her fazda ayarı canlı okur. "Süren maçlar eski değerle
--    biter" ancak uygulama anında aktif maç yoksa doğrudur; bu yüzden aktif maç varsa migration DURUR.
-- GERİ ALMA: update public.oyun_ayarlari set deger = '1500'::jsonb where anahtar = 'kasa_gosterim_payi_ms';

do $$ begin
  if (select deger::text from public.oyun_ayarlari where anahtar = 'kasa_gosterim_payi_ms') is distinct from '1500' then
    raise exception '983: kasa_gosterim_payi_ms beklenen 1500 değil (950 uygulanmamış ya da değer değişmiş)';
  end if;
  if exists (select 1 from public.kasa_maclari where durum = 'aktif') then
    raise exception '983: aktif Ortak Hazine maçı var — bitince yeniden uygula (pay maça sabitlenmiyor)';
  end if;
end $$;

update public.oyun_ayarlari
   set deger = '2000'::jsonb,
       aciklama = 'KASA faz bitişine eklenen gösterim payı (ms) — Düello 325 deseni. 950: 1500; 983: 2000. Canlı okunur (maça sabitlenmez).'
 where anahtar = 'kasa_gosterim_payi_ms';
