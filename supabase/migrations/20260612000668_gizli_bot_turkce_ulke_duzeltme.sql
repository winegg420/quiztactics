-- Migration 175'te (gizli bot havuzu büyütme) eklenen 75 botun bir kısmında Türkçe/Türkiye
-- tarzı kullanıcı adı (umut01, merve07, aleyna2 vb.) ile atanmış ülke kodu (BR, PT, MA, IN...)
-- uyuşmuyordu. 20 bot: ülke TR yapıldı, şehir (önceki yanlış ülkeye ait bir şehirdi) çeşitli
-- Türkiye illeriyle değiştirildi. İsim, seviye, avatar, maç geçmişi vb. değişmedi.
-- Kimlik artık rastgele (664/665) olduğundan eşleştirme takma_ad ile yapılır.

update public.profiles set ulke = 'TR', sehir = v.sehir
  from (values
    ('aleyna2',  'Trabzon'),
    ('aleyna35', 'Mersin'),
    ('ayla_',    'Samsun'),
    ('baris01',  'Eskişehir'),
    ('baris61',  'Balıkesir'),
    ('batuhan06','Denizli'),
    ('cansu99',  'Erzurum'),
    ('ceren99',  'Diyarbakır'),
    ('ege55',    'Antalya'),
    ('esra16',   'Konya'),
    ('ilayda_',  'Adana'),
    ('melek16',  'Gaziantep'),
    ('melis16',  'Malatya'),
    ('mert41',   'Kayseri'),
    ('merve07',  'Şanlıurfa'),
    ('ozan2',    'Sakarya'),
    ('sude06',   'Bursa'),
    ('umut',     'İzmir'),
    ('umut01',   'Ankara'),
    ('yigit34',  'İstanbul')
  ) as v(takma_ad, sehir)
 where profiles.takma_ad = v.takma_ad
   and profiles.is_bot and profiles.bot_turu = 'gizli';
