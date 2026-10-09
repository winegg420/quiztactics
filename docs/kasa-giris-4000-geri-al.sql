-- 1038 geri alma: kasa_giris_sahne_ms 4000 → 3000 (önceki canlı değer).
-- Not: istemci süreyi bu ayardan okuduğu için geri alınca sahne de 3 sn olur (3-2-1 düşüşsüz başlar);
-- eski 6 sn davranışı için KasaPage.jsx değil ayar 6000 yapılmalı.
update public.oyun_ayarlari
   set deger = '3000'::jsonb,
       aciklama = 'KASA: maç başı giriş sahnesi süresi (ms) — başlangıç fazına eklenir; KasaPage GIRIS_SAHNE_MS ile aynı olmalı (952).'
 where anahtar = 'kasa_giris_sahne_ms';
