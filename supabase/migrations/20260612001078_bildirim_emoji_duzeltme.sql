-- 1078: 1077 düzeltmesi. 1077'deki emoji deseni dosyaya ters bölüleri düşmüş yazıldı
-- ('[U0001F000-U0001FAFF…]' → '0'-'U' aralığı): push_metinleri'nde rakamlar, A–U büyük harfler
-- ve %1/%2 yer tutucularının numaraları silindi. Burada:
--   1) emoji_temizle doğru desenle yeniden tanımlanır (chr() ile, kaçış yok),
--   2) push_metinleri 214/253/323/354/641/647 migration'larından yeniden kurulan ÖZGÜN
--      metinlerden (1077 öncesi canlıyla birebir doğrulandı) emojisiz olarak geri yazılır.
-- Etkilenen başka tablo yok (bildirim_yaz yalnız 1077→1078 arasındaki birkaç dakikada yeni
-- bildirim metnine uygulandı; aşağıda kontrol edilir). RLS/GRANT değişmez.

create or replace function public.emoji_temizle(p text)
returns text language sql immutable set search_path = public as $$
  select case when p is null then null else
    btrim(regexp_replace(regexp_replace(p,
      '[' || chr(126976) || '-' || chr(129791)      -- U+1F000–U+1FAFF
          || chr(9728)   || '-' || chr(10175)       -- U+2600–U+27BF
          || chr(11008)  || '-' || chr(11263)       -- U+2B00–U+2BFF
          || chr(8960)   || '-' || chr(9215)        -- U+2300–U+23FF
          || chr(65039) || chr(8205) || chr(8419)   -- FE0F, ZWJ, 20E3
          || ']', '', 'g'),
      '[ ]{2,}', ' ', 'g'))
  end;
$$;
revoke execute on function public.emoji_temizle(text) from public, anon, authenticated;

update public.push_metinleri p
   set baslik = public.emoji_temizle(v.baslik), govde = public.emoji_temizle(v.govde)
  from (values
  ('arkadas_istek', 'en', '🤝 Friend request', '% sent you a friend request.'),
  ('arkadas_istek', 'tr', '🤝 Arkadaşlık isteği', '% sana arkadaşlık isteği gönderdi.'),
  ('arkadas_kabul', 'en', '🎉 New friend', '% is now your friend! 🤝'),
  ('arkadas_kabul', 'tr', '🎉 Yeni arkadaş', '% arkadaşın oldu! 🤝'),
  ('davet_katildi', 'en', '🎉 Your invite worked', '%1 joined with your invite! Reach Level %2 to earn +%3 coins.'),
  ('davet_katildi', 'tr', '🎉 Davetin işe yaradı', '%1 davetinle katıldı! Level %4 ulaşınca +%3 coin kazanacaksın.'),
  ('davet_odul', 'en', '🪙 Invite reward', '%1 reached Level %2! +%3 coins'),
  ('davet_odul', 'tr', '🪙 Davet ödülü', '%1 Level %4 ulaştı! +%3 coin'),
  ('dm_yeni', 'en', '💬 New message', '% sent you a message.'),
  ('dm_yeni', 'tr', '💬 Yeni mesaj', '% sana mesaj attı.'),
  ('dunya_sampiyonu_oldun', 'en', '🏆 World Champion', '🏆 You are the World Champion! Your title will appear on your profile and in matches this week.'),
  ('dunya_sampiyonu_oldun', 'tr', '🏆 Dünya Şampiyonu', '🏆 Dünya Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.'),
  ('gecildin', 'en', '⚡ You dropped a place', '% passed you in the weekly league! Take your place back. ⚡'),
  ('gecildin', 'tr', '⚡ Sıran düştü', '% haftalık ligde seni geçti! Sıranı geri al. ⚡'),
  ('grup_daveti', 'en', '👥 Group Match invite', '% invited you to a %-player Group Match! 👥'),
  ('grup_daveti', 'tr', '👥 Grup maçı daveti', '% seni % kişilik grup maçına çağırdı! 👥'),
  ('hafta_sonuc_dunya', 'en', '🏆 The week is over', 'Your place in last week''s world league: #% (% points). A new week has begun!'),
  ('hafta_sonuc_dunya', 'tr', '🏆 Hafta bitti', 'Geçen hafta dünya ligindeki sıran: % (% puan). Yeni hafta başladı!'),
  ('hafta_sonuc_sehir', 'en', '🏆 The week is over', 'Last week you finished #%2 in the %1 league (%3 points). A new week has begun!'),
  ('hafta_sonuc_sehir', 'tr', '🏆 Hafta bitti', 'Geçen hafta % liginde %. oldun (% puan). Yeni hafta başladı!'),
  ('lige_girdin', 'en', '🏙️ You''re in the leagues', 'You finished your first match — you''re now in the city, country and world leagues! 🏙️'),
  ('lige_girdin', 'tr', '🏙️ Ligdesin', 'İlk maçını tamamladın — artık şehir, ülke ve dünya liglerindesin! 🏙️'),
  ('mac_daveti', 'en', '⚔️ Challenge!', '% challenged you! ⚔️'),
  ('mac_daveti', 'tr', '⚔️ Meydan okuma!', '% sana meydan okudu! ⚔️'),
  ('mac_iptal_hukmen', 'en', 'Quiz Tactics', '% cancelled the match — you win by forfeit! 🏆'),
  ('mac_iptal_hukmen', 'tr', 'Quiz Tactics', '% maçı iptal etti — hükmen kazandın! 🏆'),
  ('mac_iptal_puansiz', 'en', 'Quiz Tactics', '% cancelled the match. Nobody got any points.'),
  ('mac_iptal_puansiz', 'tr', 'Quiz Tactics', '% maçı iptal etti. Kimseye puan yazılmadı.'),
  ('meydan_kabul', 'en', '🔥 Challenge accepted!', '% accepted your challenge — the match is starting!'),
  ('meydan_kabul', 'tr', '🔥 Meydan okuman kabul edildi!', '% meydan okumanı kabul etti - maç başlıyor!'),
  ('rovans', 'en', '⚔️ Rematch request', '% wants a rematch! ⚔️'),
  ('rovans', 'tr', '⚔️ Rövanş isteği', '% rövanş istiyor! ⚔️'),
  ('sehir_sampiyonu_oldun', 'en', '🏆 City Champion', '🏆 You are the Champion of %1! Your title will appear on your profile and in matches this week.'),
  ('sehir_sampiyonu_oldun', 'tr', '🏆 Şehir Şampiyonu', '🏆 %1 Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.'),
  ('seri_artti', 'en', '🔥 Your streak', '🔥 Your streak is now % days! Come back tomorrow to keep it going.'),
  ('seri_artti', 'tr', '🔥 Serin', '🔥 Serin % gün oldu! Yarın da gel, bozma.'),
  ('seri_kirildi', 'en', '🔥 Your streak', '💔 Your %-day streak was broken. Start again today!'),
  ('seri_kirildi', 'tr', '🔥 Serin', '💔 % günlük serin kırıldı. Bugün yeniden başla!'),
  ('seri_koruma', 'en', '🔥 Your streak', '🛡️ We used your streak shield — your %-day streak continues. Don''t forget to play today!'),
  ('seri_koruma', 'tr', '🔥 Serin', '🛡️ Seri korumanı kullandık — % günlük serin sürüyor. Bugün oynamayı unutma!'),
  ('seri_tehlike', 'en', '🔥 Your streak', '🔥 Your %-day streak is in danger! Play a match today to keep it.'),
  ('seri_tehlike', 'tr', '🔥 Serin', '🔥 % günlük serin tehlikede! Bugün bir maç yap, bozulmasın.'),
  ('sira_sende', 'en', '⏳ Your turn!', '% made their move — your turn! ⏳'),
  ('sira_sende', 'tr', '⏳ Sıra sende!', '% hamlesini yaptı — sıra sende! ⏳'),
  ('terim:Bilim', 'en', null, 'Science'),
  ('terim:Bir oyuncu', 'en', null, 'A player'),
  ('terim:Çırak', 'en', null, 'Apprentice'),
  ('terim:Coğrafya', 'en', null, 'Geography'),
  ('terim:Edebiyat', 'en', null, 'Literature'),
  ('terim:Efsane', 'en', null, 'Legend'),
  ('terim:Genel', 'en', null, 'General'),
  ('terim:Genel Kültür', 'en', null, 'General Knowledge'),
  ('terim:Kalfa', 'en', null, 'Journeyman'),
  ('terim:Karışık', 'en', null, 'Mixed'),
  ('terim:Müzik', 'en', null, 'Music'),
  ('terim:Rakibin', 'en', null, 'Your opponent'),
  ('terim:Sanat', 'en', null, 'Art'),
  ('terim:şehrinde', 'en', null, 'your city'),
  ('terim:Sinema', 'en', null, 'Cinema'),
  ('terim:Spor', 'en', null, 'Sports'),
  ('terim:Tarih', 'en', null, 'History'),
  ('terim:Teknoloji', 'en', null, 'Technology'),
  ('terim:Usta', 'en', null, 'Master'),
  ('terim:Üstat', 'en', null, 'Grandmaster'),
  ('turnuva_gece', 'en', '🌙 Evening Tournament coming up!', 'The big tournament starts at 20:00. Grab your spot in the lobby! 🏆'),
  ('turnuva_gece', 'tr', '🌙 Akşam turnuvası yaklaşıyor!', 'Büyük turnuva 20:00''de başlıyor. Lobideki yerini al! 🏆'),
  ('turnuva_ogle', 'en', '☀️ Midday Tournament coming up!', 'The tournament starts at 14:00. Grab your spot in the lobby! 🏆'),
  ('turnuva_ogle', 'tr', '☀️ Öğle turnuvası yaklaşıyor!', 'Turnuva 14:00''te başlıyor. Lobideki yerini al! 🏆'),
  ('ulke_sampiyonu_oldun', 'en', '🏆 Country Champion', '🏆 You are the Champion of %1! Your title will appear on your profile and in matches this week.'),
  ('ulke_sampiyonu_oldun', 'tr', '🏆 Ülke Şampiyonu', '🏆 %1 Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.'),
  ('ustalik', 'en', '🎖️ Mastery', '🎖️ You became %2 in %1!'),
  ('ustalik', 'tr', '🎖️ Ustalık', '🎖️ % kategorisinde % oldun!')
  ) v(anahtar, dil, baslik, govde)
 where p.anahtar = v.anahtar and p.dil = v.dil;
