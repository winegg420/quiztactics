-- Paket 2 · Şerit A — İlerleme ve ödül: EKONOMİ AYARLARI (TEST DEĞERLERİ)
--
-- Bütün rakamlar test değeridir; kod okumaz, `oyun_ayarlari`'ndan okunur ve yayından
-- sonra SQL ile değiştirilebilir. Her anahtarın `aciklama`sı: ne işe yarar + birim.
--
-- 1) MEVCUT coin anahtarlarının DEĞERİ değişir (update; eski değerler yorumda):
--      coin_mac_galibiyet     25 → 30   (Klasik galibiyet)
--      coin_mac_beraberlik    10 → 12   (Klasik beraberlik)
--      coin_duello_galibiyet  25 → 45   (Düello galibiyet; Düello'da beraberlik yok)
--    Mağlubiyet 0 kalır (coin_mac_maglubiyet = 0, Düello kaybedene coin_mac_odulu hiç vermez).
--    Serbest (dereceli=false) ve Saf Bilgi (jokersiz Klasik) mevcut mekanizmayla %50 alır
--    (serbest_coin_carpani = saf_bilgi_odul_carpani = 0.5; indirimler çarpılmaz, en düşüğü) →
--    galibiyet 15, beraberlik 6. Çift koruması / aynı cihaz / açık bot aynen uygulanır.
--    Lig puanı, turnuva, günlük görev, seri, davet anahtarlarına DOKUNULMAZ.
--
-- 2) YENİ anahtarlar: XP, level eğrisi, level/rütbe ödülleri, bot level türetme.

update public.oyun_ayarlari
   set deger = '30'::jsonb,
       aciklama = 'TEST DEĞERİ — Klasik Mod galibiyet coini (coin). Serbest/Saf Bilgi %50, çift koruması ve açık bot indirimi çarpılmadan en düşüğü uygulanır. (P2A: 25 → 30)'
 where anahtar = 'coin_mac_galibiyet';

update public.oyun_ayarlari
   set deger = '12'::jsonb,
       aciklama = 'TEST DEĞERİ — Klasik Mod beraberlik coini, iki tarafa (coin). Serbest/Saf Bilgi %50. (P2A: 10 → 12)'
 where anahtar = 'coin_mac_beraberlik';

update public.oyun_ayarlari
   set deger = '45'::jsonb,
       aciklama = 'TEST DEĞERİ — Düello galibiyet coini (coin). Düello''da beraberlik yok, kaybedene coin yok. Serbest %50. (P2A: 25 → 45; artık Klasik''ten ayrı)'
 where anahtar = 'coin_duello_galibiyet';

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('xp_mac_galibiyet',     '30',  'TEST DEĞERİ — Klasik Mod galibiyet XP''si (XP). Serbest/Saf Bilgi''de TAM verilir; yalnız çift koruması ve açık bot indirimi uygulanır.'),
  ('xp_mac_beraberlik',    '15',  'TEST DEĞERİ — Klasik Mod beraberlik XP''si, iki tarafa (XP).'),
  ('xp_mac_maglubiyet',    '10',  'TEST DEĞERİ — Klasik Mod mağlubiyet XP''si (XP). Maçta en az bir cevabı olmayan kaybedene verilmez.'),
  ('xp_duello_galibiyet',  '45',  'TEST DEĞERİ — Düello galibiyet XP''si (XP). Düello 1.0 ve eski Düello aynı.'),
  ('xp_duello_maglubiyet', '15',  'TEST DEĞERİ — Düello mağlubiyet XP''si (XP). Hiç hamlesi olmayan (hemen terk eden) kaybedene verilmez.'),
  ('xp_turnuva_katilim',   '20',  'TEST DEĞERİ — Turnuvaya katılan her oyuncuya XP (XP).'),
  ('xp_turnuva_ilk3',      '50',  'TEST DEĞERİ — Turnuvada ilk 3''e katılım XP''sine EK XP (XP).'),
  ('xp_acik_bot_carpani',  '0.5', 'TEST DEĞERİ — Açık botla ("…Bot") maçta XP çarpanı (0-1). Coin''deki coin_bot_carpani ile aynı mantık; çift koruması ile çarpılmaz, en düşüğü.'),
  ('level_xp_taban',       '60',  'TEST DEĞERİ — Level eğrisi: bir sonraki level için gereken XP = round(taban + katsayı × level^üs). Taban (XP).'),
  ('level_xp_katsayi',     '0.5', 'TEST DEĞERİ — Level eğrisi katsayısı (birimsiz). Bkz. level_xp_taban.'),
  ('level_xp_us',          '1.5', 'TEST DEĞERİ — Level eğrisi üssü (birimsiz). Bkz. level_xp_taban.'),
  ('level_odul_coin',      '20',  'TEST DEĞERİ — Her level atlayışında verilen coin (coin). Günlük coin tavanına takılmaz. Tek maçta birden çok level atlanırsa her biri için.'),
  ('level_skill_aralik',   '5',   'TEST DEĞERİ — Kaç levelde bir bedava skill kullanım hakkı verilir (level). 0 = kapalı.'),
  ('level_skill_adet',     '1',   'TEST DEĞERİ — Her level_skill_aralik''ta envantere eklenen skill hakkı (adet; aktif skill''lerden rastgele). Maç içi skill sınırlarını ARTIRMAZ.'),
  ('rutbe_odul_coin',      '100', 'TEST DEĞERİ — Rütbe atlayınca (Bilge L10, Üstat L25, Kahin L50, Dâhi L100) verilen coin (coin). Günlük tavana takılmaz.'),
  ('bot_level_oran_min',   '0.6', 'Bot level''i = bot_seviye_puan × oran; oran bot id''sinden tohumlu, bu ile bot_level_oran_max arasında (birimsiz). Sabit, düşmez.'),
  ('bot_level_oran_max',   '1.1', 'Bot level oranının üst sınırı (birimsiz). Bkz. bot_level_oran_min.')
on conflict (anahtar) do nothing;
