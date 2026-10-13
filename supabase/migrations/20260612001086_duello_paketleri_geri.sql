-- 1086 — Düello paketleri Baskın/Kalkan'sız geri açıldı (Ida onayı, 13 Eki 2026).
-- 1083'te duello_30 / duello_100 içlerinde Baskın/Kalkan olduğu için kapanmıştı. Yeni içerik yalnız
-- satıştaki beş jokerden oluşur; toplamlar 30 / 100 aynı. Fiyat 910'daki formülle yeniden hesaplanır:
-- Σ(adet × coin_joker_<tür>) × 10'lu paket oranı, 5'e aşağı yuvarlanır. Baskın/Kalkan'ın satıştan kalkması,
-- 1083'ün iade ve reddetme mantığı DEĞİŞMEZ. Mod ayrımı istemcide ürün kimliği önekinden (jokerler.js ›
-- paketDukkanModlari): "duello_" yalnız Düello, "klasik_" yalnız Klasik. Yetki/RLS değişikliği YOK.
do $$
declare
  v_oran numeric;
  r record;
begin
  v_oran := public.ayar_sayi('coin_joker_elli_10', null)::numeric
            / nullif(10 * public.ayar_sayi('coin_joker_elli', null)::numeric, 0);
  if v_oran is null or v_oran <= 0 or v_oran >= 1 then v_oran := 0.85; end if;

  update public.joker_paketleri p
     set icerik = v.icerik, aktif = true, fiyat_anahtari = null,
         coin_fiyat = (floor((select sum(public.ayar_sayi('coin_joker_' || e.key, null)::numeric * e.value::int)
                                from jsonb_each_text(v.icerik) e) * v_oran / 5) * 5)::bigint
    from (values
      ('duello_30',  '{"elli":7,"sure":9,"soru_degistir":6,"zaman_baskisi":6,"ikinci_sans":2}'::jsonb),
      ('duello_100', '{"elli":24,"sure":30,"soru_degistir":20,"zaman_baskisi":19,"ikinci_sans":7}'::jsonb)
    ) as v(urun_id, icerik)
   where p.urun_id = v.urun_id;

  -- 910'daki öz-denetim aynen: toplam 30 / 100, her tür fiyatlı, Baskın/Kalkan yok, paket tek tek alımdan ucuz.
  for r in
    select p.urun_id, p.coin_fiyat, p.aktif,
           (select sum(e.value::int) from jsonb_each_text(p.icerik) e) as adet,
           (select sum(public.joker_fiyati(e.key) * e.value::int) from jsonb_each_text(p.icerik) e) as tek_tek,
           (select count(*) from jsonb_each_text(p.icerik) e where public.joker_fiyati(e.key) is null) as fiyatsiz,
           p.icerik ?| array['baskin', 'kalkan'] as yasakli
      from public.joker_paketleri p
     where p.urun_id in ('duello_30', 'duello_100')
  loop
    if not r.aktif then raise exception '1086: % aktif değil', r.urun_id; end if;
    if r.yasakli then raise exception '1086: % içinde Baskın/Kalkan var', r.urun_id; end if;
    if r.fiyatsiz > 0 then raise exception '1086: % içinde fiyatı olmayan joker var', r.urun_id; end if;
    if r.adet <> (case when r.urun_id like '%\_100' then 100 else 30 end) then
      raise exception '1086: % toplam adedi yanlış (%)', r.urun_id, r.adet;
    end if;
    if r.coin_fiyat is null or r.coin_fiyat <= 0 or r.coin_fiyat >= r.tek_tek then
      raise exception '1086: % fiyatı (%) tek tek alımdan (%) ucuz değil', r.urun_id, r.coin_fiyat, r.tek_tek;
    end if;
  end loop;
end $$;
