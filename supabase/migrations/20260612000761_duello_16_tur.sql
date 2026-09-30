-- ============================================================
-- 761 — Düello Hâkimiyet: maç 10 yerine 16 tur (Ida onaylı karar, 1 Eki 2026)
--
-- Kazanma eşiği 4 yuva KALIR (duellolar.hakimiyet_esik / duello_hakimiyet_esik dokunulmaz); hamle kuralı,
-- kilit (2 tur), nakavt, Altın Soru ve Baskın/Kalkan aynen. Sunucu tur sayısını zaten bu ayardan okuyor
-- (duello2_sonraki: tur < duello_max_tur → sonraki tur, değilse sayım / Altın Soru; duello2_durum: max_tur).
-- 16 çift sayı: roller tek/çift tura göre değiştiği için iki oyuncu 8'er kez saldırır (10'da 5'er).
-- Kategori havuzu: kullanım sınırı ve üst üste yasağı 666'da kalktı; seçimi yalnız 2 turluk kilit daraltır
-- (10 kategoride her turda en az 6 seçilebilir) — 16 tur için yeterli.
-- Ayar anlıkken sürmekte olan maçlar da 16 tura uzar (tur sayısı maç satırına yazılmıyor).
-- Tekrar çalıştırılabilir.
-- ============================================================

update public.oyun_ayarlari
   set deger = '16'::jsonb,
       aciklama = 'Düello: maçın tur sayısı (Hâkimiyet: 1 tur = 1 hamle; 1 Eki 2026 Ida kararı 10 → 16, eşik 4 yuva aynı)'
 where anahtar = 'duello_max_tur';

insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('duello_max_tur', '16'::jsonb, 'Düello: maçın tur sayısı (Hâkimiyet: 1 tur = 1 hamle; 1 Eki 2026 Ida kararı 10 → 16, eşik 4 yuva aynı)')
on conflict (anahtar) do nothing;
