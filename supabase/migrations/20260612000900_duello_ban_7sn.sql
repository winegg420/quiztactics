-- 900 · Düello: BAN SÜRESİ 5 → 7 sn + erken ilerleme (Ida, 2 Eki 2026)
--
-- 1) Süre: savunanın ban seçme süresi duello_ban_sn 5 → 7 sn. Süreyi okuyan her yer ayardan okur
--    (duello2_ban_baslat, duello2_bot_tik, duello2_durum › sureler.ban / gosterim_bas / ban.sure): kod değişmez.
--
-- 2) İlk tur ek payı duello_ban_ilk_tur_ek_sn = 3 KALIR (karar, ölçüsü istemci kodundan):
--    maç satırı açılınca istemci eşleşmeyi en geç ~1 sn'lik yoklamada görür, ARAMA_GECIS_MS = 2000 ms VS geçişini
--    oynatır, sonra maç sayfası + ilk duello_durum okuması (~0,3–1 sn) gelir → tahta maç açılışından 2,3–4 sn sonra
--    görünür. Sayaç gosterim_bas = açılış + ek pay + gösterim payı (1,5 sn) anına dek TAM süreyi gösterir:
--    ek pay 3 iken 4,5 sn (en yavaş açılışta da savunan 7 sn'nin tamamını görür); 2 olsaydı 3,5 sn → yavaş açılışta
--    1. turun banı ~0,5 sn kısalırdı.
--
-- 3) Erken ilerleme: savunan banı işaretler işaretlemez ban fazı kapanır, kategori fazı açılır; süre dolması
--    beklenmez. Bu davranış 853'ten beri sunucudadır ve DEĞİŞMEDEN kalır:
--      · duello_ban_sec → duello_kilitle (maç satırı FOR UPDATE) → duello2_ban_bitir (FOR UPDATE; faz 'kategori',
--        faz_bitis = şimdi + duello2_kategori_sn + gösterim payı + duello_ban_gosterim_ms) → duello_sinyal_ver.
--      · Bot savunurken fazın 1–2,5. saniyesinde banlar (duello2_bot_tik; an faz başından hesaplanır, süre 7 olunca
--        da aynı insansı gecikme) ve aynı duello2_ban_bitir ile fazı hemen kapatır.
--      · Süre dolarsa duello2_ilerlet → duello2_ban_bitir(null): ban yok, saldıran bütün uygun kategorilerden seçer.
--    Ardışık ban yasağı, kilit, Altın Soru, kopukluk dondurması ve yetkiler AYNEN. Fonksiyon tanımı değişmediği
--    için GRANT/REVOKE de değişmez. Sınama: node araclar/duello-ban-sql-testi.mjs (bölüm 12).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_ban_sn', '7'::jsonb, 'Düello: savunanın ban seçme süresi (sn); dolarsa ban yok. Savunan banlayınca faz hemen kapanır')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;
