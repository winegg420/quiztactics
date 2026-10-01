-- 847 · ARKA PLAN DONDURMA — tek bayrak (Ida, 1 Eki 2026: "Arka planları oyundan donduruyoruz. Hiçbir arka plan kalmasın oyunda.")
-- Arka plan = oyuncu kartının arkasındaki sahne (pa_* kozmetikleri). Bayrak false iken istemci hiçbir yerde çizmez/seçtirmez/satmaz.
-- Kod ve veri durur (silme yok). GERİ AÇMAK: update public.oyun_ayarlari set deger = 'true'::jsonb where anahtar = 'arka_plan_acik';
-- (+ 848'deki pa_* kayıtlarını aktif yap, gerekirse 849'daki Battle Pass yuvalarını eski değerlere döndür.)
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('arka_plan_acik', 'false'::jsonb, 'Oyuncu kartı arka planları oyunda görünsün mü (847). false = donduruldu: hiçbir yerde çizilmez, seçilmez, satılmaz.')
on conflict (anahtar) do update set deger = 'false'::jsonb;

do $$
declare v text;
begin
  select deger::text into v from public.oyun_ayarlari where anahtar = 'arka_plan_acik';
  if v is distinct from 'false' then raise exception '847: arka_plan_acik false olmadı (%)', v; end if;
  raise notice '847 arka_plan_acik = %', v;
end $$;
