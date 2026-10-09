-- 1038 — Hazine (Kasa) giriş sahnesi 4000 ms (Ida kararı, 10 Eki 2026).
-- Önce: sunucu kasa_giris_sahne_ms=3000, istemci GIRIS_SAHNE_MS=6000 (uyuşmazlık; canlıda oyuncu 6 sn görüyordu).
-- Şimdi: ikisi de aynı kaynaktan — istemci süreyi bu ayardan okur (KasaPage, useAyar). Yalnız bu ayar satırı değişir.
-- Etki: yeni kurulan maçların başlangıç fazı 1 sn uzar (faz_bitis = now + 3 + 2 + 4); süren maçlar etkilenmez.
-- Sahne = ~1 sn sandık düşüşü + 3 sn tam 3-2-1; ilk soru sahne bitince açılır.
-- Geri alma: docs/kasa-giris-4000-geri-al.sql
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_giris_sahne_ms', '4000'::jsonb,
   'KASA: maç başı giriş sahnesi süresi (ms) — başlangıç fazına eklenir ve istemci sahneyi bu süreyle çizer (tek kaynak; 1038). En az 3000 (3-2-1 tam görünsün).')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;
