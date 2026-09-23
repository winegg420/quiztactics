-- ============================================================
-- 331 · ROZET + ÇERÇEVE + DAVET SÖZLEŞMESİ (Ajan A, paket "rozet-çerçeve")
--
-- Bu migration yalnız TABLOLARI, KATALOG VERİSİNİ ve istemcinin çağırdığı
-- RPC'leri kurar. Rozet kazanma motoru (olay tetikleyicileri + geriye dönük
-- verme) 332'de, lig çerçevelerinin taşınması 333'te, davet mantığı 334'te.
-- Sözleşme belgesi: docs/SOZLESME_ROZET_CERCEVE.md
--
-- Bütün rakamlar katalog tablolarında ya da oyun_ayarlari'nda (test değeri).
-- ============================================================

-- ---------- Ayarlar ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('rozet_vitrin_max', '3', 'Profilde vitrine konabilecek en fazla rozet'),
  ('rozet_kasif_min_dogru', '10', 'Gizli "Kaşif" rozeti: bir kategoriyi sayması için gereken doğru'),
  ('rozet_geri_donus_can_farki', '2', 'Özel an "Geri Dönüş": Düello''da en az bu kadar can gerideyken kazanmak (3 can ile en büyük fark 2)'),
  ('davet_odul_davet_eden', '300', 'Davet eden: davet edilen davet_gereken_level''a ulaşınca'),
  ('davet_odul_davet_edilen', '100', 'Davet edilen: kod bağlanınca başlangıç coini'),
  ('davet_gereken_level', '5', 'Davet edenin ödülü için davet edilenin ulaşması gereken level'),
  ('davet_aylik_sinir', '10', 'Ayda en fazla ödüllü davet (TSİ takvim ayı); fazlası ödülsüz kaydedilir'),
  ('davet_baglama_saat', '72', 'Hesap açıldıktan sonra davet kodu bağlanabilecek süre (saat)')
on conflict (anahtar) do nothing;

-- ---------- Rozet grupları (sunucu metinleri TR+EN) ----------
create table if not exists public.rozet_gruplari (
  anahtar text primary key,
  sira int not null,
  ikon text not null,          -- Phosphor sembol önerisi
  ad_tr text not null,
  ad_en text not null
);
alter table public.rozet_gruplari enable row level security;
drop policy if exists rozet_gruplari_oku on public.rozet_gruplari;
create policy rozet_gruplari_oku on public.rozet_gruplari for select using (true);

insert into public.rozet_gruplari (anahtar, sira, ikon, ad_tr, ad_en) values
  ('level',   1, 'star',          'Level',              'Level'),
  ('klasik',  2, 'trophy',        'Klasik Galibiyet',   'Classic Wins'),
  ('duello',  3, 'sword',         'Düello Galibiyet',   'Duel Wins'),
  ('seri',    4, 'fire',          'Günlük Seri',        'Daily Streak'),
  ('ustalik', 5, 'graduation-cap','Kategori Ustalığı',  'Category Mastery'),
  ('turnuva', 6, 'crown',         'Turnuva',            'Tournament'),
  ('lig',     7, 'shield-star',   'Lig',                'League'),
  ('ozel',    8, 'lightning',     'Özel An',            'Special Moment'),
  ('sosyal',  9, 'users-three',   'Sosyal',             'Social'),
  ('gizli',  10, 'question',      'Gizli',              'Hidden')
on conflict (anahtar) do nothing;

-- ---------- Çerçeve kataloğu ----------
create table if not exists public.cerceveler (
  anahtar text primary key,
  nadirlik text not null check (nadirlik in ('siradan','nadir','epik','efsanevi')),
  kaynak text not null check (kaynak in ('lig','level','etkinlik','dukkan')),
  fiyat int check (fiyat is null or fiyat > 0),     -- yalnız dükkân
  kosul text,                                      -- 'lig:gumus' · 'level:25' · null (dükkân)
  aktif boolean not null default true,
  sira int not null default 0,
  ad_tr text not null,
  ad_en text not null,
  constraint cerceve_fiyat_dukkan check ((kaynak = 'dukkan') = (fiyat is not null))
);
alter table public.cerceveler enable row level security;
drop policy if exists cerceveler_oku on public.cerceveler;
create policy cerceveler_oku on public.cerceveler for select using (true);

insert into public.cerceveler (anahtar, nadirlik, kaynak, fiyat, kosul, sira, ad_tr, ad_en) values
  -- Lig (mevcut lig_cerceveleri buraya taşınır — 333)
  ('lig_gumus',  'nadir',    'lig',   null, 'lig:gumus',  101, 'Gümüş Lig',   'Silver League'),
  ('lig_altin',  'nadir',    'lig',   null, 'lig:altin',  102, 'Altın Lig',   'Gold League'),
  ('lig_elmas',  'epik',     'lig',   null, 'lig:elmas',  103, 'Elmas Lig',   'Diamond League'),
  ('lig_efsane', 'efsanevi', 'lig',   null, 'lig:efsane', 104, 'Efsane Lig',  'Legend League'),
  -- Level (Level 25/50/75/100 rozetiyle birlikte gelir)
  ('level_25',   'nadir',    'level', null, 'level:25',   201, 'Level 25 Madalyonu', 'Level 25 Medallion'),
  ('level_50',   'epik',     'level', null, 'level:50',   202, 'Level 50 Yıldızı',   'Level 50 Star'),
  ('level_75',   'epik',     'level', null, 'level:75',   203, 'Level 75 Kanatları', 'Level 75 Wings'),
  ('level_100',  'efsanevi', 'level', null, 'level:100',  204, 'Level 100 Tacı',     'Level 100 Crown'),
  -- Dükkân: her nadirlikten 3 (Sıradan 400 · Nadir 1.000 · Epik 2.500 · Efsanevi 6.000)
  ('dukkan_gece',    'siradan',  'dukkan',  400, null, 301, 'Gece Mavisi',  'Night Blue'),
  ('dukkan_nane',    'siradan',  'dukkan',  400, null, 302, 'Nane',         'Mint'),
  ('dukkan_mercan',  'siradan',  'dukkan',  400, null, 303, 'Mercan',       'Coral'),
  ('dukkan_okyanus', 'nadir',    'dukkan', 1000, null, 311, 'Okyanus',      'Ocean'),
  ('dukkan_zumrut',  'nadir',    'dukkan', 1000, null, 312, 'Zümrüt',       'Emerald'),
  ('dukkan_yakut',   'nadir',    'dukkan', 1000, null, 313, 'Yakut',        'Ruby'),
  ('dukkan_ametist', 'epik',     'dukkan', 2500, null, 321, 'Ametist',      'Amethyst'),
  ('dukkan_kutup',   'epik',     'dukkan', 2500, null, 322, 'Kutup Işığı',  'Aurora'),
  ('dukkan_nebula',  'epik',     'dukkan', 2500, null, 323, 'Nebula',       'Nebula'),
  ('dukkan_anka',    'efsanevi', 'dukkan', 6000, null, 331, 'Anka',         'Phoenix'),
  ('dukkan_ejder',   'efsanevi', 'dukkan', 6000, null, 332, 'Ejder',        'Dragon'),
  ('dukkan_gunes',   'efsanevi', 'dukkan', 6000, null, 333, 'Güneş Tacı',   'Sun Crown')
on conflict (anahtar) do nothing;

create table if not exists public.oyuncu_cerceveleri (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cerceve text not null references public.cerceveler(anahtar),
  kaynak text not null default 'dukkan',   -- dukkan | lig_yukselme | rozet | tasima | etkinlik
  kazanildi_at timestamptz not null default now(),
  primary key (user_id, cerceve)
);
alter table public.oyuncu_cerceveleri enable row level security;
drop policy if exists oyuncu_cerceveleri_kendim on public.oyuncu_cerceveleri;
create policy oyuncu_cerceveleri_kendim on public.oyuncu_cerceveleri for select using (user_id = auth.uid());

-- ---------- Rozet tanımları ----------
create table if not exists public.rozet_tanimlari (
  anahtar text primary key,
  grup text not null references public.rozet_gruplari(anahtar),
  kademe text not null check (kademe in ('bronz','gumus','altin','elmas')),
  esik int not null check (esik > 0),
  olcut text not null,            -- sunucu ölçütü (rozet_olcut); 'olay' = yalnız olay anında verilir
  coin int not null default 0,
  gizli boolean not null default false,
  sira int not null default 0,
  ikon text,                      -- Phosphor sembol önerisi ('kategori:<k>' = KategoriIkon)
  cerceve text references public.cerceveler(anahtar),   -- kazanınca verilen çerçeve
  aktif boolean not null default true,
  ad_tr text not null,
  ad_en text not null,
  aciklama_tr text not null,
  aciklama_en text not null
);
create index if not exists rozet_tanimlari_olcut_idx on public.rozet_tanimlari (olcut) where aktif;
alter table public.rozet_tanimlari enable row level security;
drop policy if exists rozet_tanimlari_oku on public.rozet_tanimlari;
-- Gizli rozetin adı/koşulu istemciye doğrudan sızmasın: tablo yalnız gizli OLMAYANLARI açar.
create policy rozet_tanimlari_oku on public.rozet_tanimlari for select using (not gizli);

create table if not exists public.oyuncu_rozetleri (
  user_id uuid not null references public.profiles(id) on delete cascade,
  rozet text not null references public.rozet_tanimlari(anahtar),
  kazanildi_at timestamptz not null default now(),
  coin int not null default 0,              -- verilen coin (geriye dönükte 0)
  geriye_donuk boolean not null default false,
  goruldu boolean not null default false,   -- "yeni rozet" bildirimi gösterildi mi
  primary key (user_id, rozet)
);
create index if not exists oyuncu_rozetleri_gorulmemis_idx on public.oyuncu_rozetleri (user_id) where not goruldu;
alter table public.oyuncu_rozetleri enable row level security;
drop policy if exists oyuncu_rozetleri_kendim on public.oyuncu_rozetleri;
create policy oyuncu_rozetleri_kendim on public.oyuncu_rozetleri for select using (user_id = auth.uid());

-- Rozet coin'i: kademeye göre (bronz 10 · gümüş 25 · altın 50 · elmas 100) — satırda durur.
with v(anahtar, grup, kademe, esik, olcut, gizli, sira, ikon, cerceve, ad_tr, ad_en, aciklama_tr, aciklama_en) as (values
  -- LEVEL (11)
  ('level_5',   'level','bronz',  5,'level',false,101,'star',null,        'Level 5',  'Level 5',  'Level 5''e ulaş',  'Reach Level 5'),
  ('level_10',  'level','bronz', 10,'level',false,102,'star',null,        'Level 10', 'Level 10', 'Level 10''a ulaş', 'Reach Level 10'),
  ('level_15',  'level','bronz', 15,'level',false,103,'star',null,        'Level 15', 'Level 15', 'Level 15''e ulaş', 'Reach Level 15'),
  ('level_20',  'level','gumus', 20,'level',false,104,'star',null,        'Level 20', 'Level 20', 'Level 20''ye ulaş','Reach Level 20'),
  ('level_25',  'level','gumus', 25,'level',false,105,'star','level_25',  'Level 25', 'Level 25', 'Level 25''e ulaş — Level 25 çerçevesi de gelir', 'Reach Level 25 — unlocks the Level 25 frame'),
  ('level_30',  'level','gumus', 30,'level',false,106,'star',null,        'Level 30', 'Level 30', 'Level 30''a ulaş', 'Reach Level 30'),
  ('level_40',  'level','altin', 40,'level',false,107,'star',null,        'Level 40', 'Level 40', 'Level 40''a ulaş', 'Reach Level 40'),
  ('level_50',  'level','altin', 50,'level',false,108,'star','level_50',  'Level 50', 'Level 50', 'Level 50''ye ulaş — Level 50 çerçevesi de gelir', 'Reach Level 50 — unlocks the Level 50 frame'),
  ('level_60',  'level','altin', 60,'level',false,109,'star',null,        'Level 60', 'Level 60', 'Level 60''a ulaş', 'Reach Level 60'),
  ('level_75',  'level','elmas', 75,'level',false,110,'star','level_75',  'Level 75', 'Level 75', 'Level 75''e ulaş — Level 75 çerçevesi de gelir', 'Reach Level 75 — unlocks the Level 75 frame'),
  ('level_100', 'level','elmas',100,'level',false,111,'star','level_100', 'Level 100','Level 100','Level 100''e ulaş — Level 100 çerçevesi de gelir','Reach Level 100 — unlocks the Level 100 frame'),
  -- KLASİK GALİBİYET (7)
  ('klasik_1',   'klasik','bronz',   1,'klasik_galibiyet',false,201,'trophy',null,'İlk Klasik Zafer',   'First Classic Win',   'Klasik''te ilk maçını kazan',   'Win your first Classic match'),
  ('klasik_10',  'klasik','bronz',  10,'klasik_galibiyet',false,202,'trophy',null,'Klasik: 10 Galibiyet','Classic: 10 Wins',   'Klasik''te 10 maç kazan',       'Win 10 Classic matches'),
  ('klasik_50',  'klasik','gumus',  50,'klasik_galibiyet',false,203,'trophy',null,'Klasik: 50 Galibiyet','Classic: 50 Wins',   'Klasik''te 50 maç kazan',       'Win 50 Classic matches'),
  ('klasik_100', 'klasik','gumus', 100,'klasik_galibiyet',false,204,'trophy',null,'Klasik: 100 Galibiyet','Classic: 100 Wins', 'Klasik''te 100 maç kazan',      'Win 100 Classic matches'),
  ('klasik_250', 'klasik','altin', 250,'klasik_galibiyet',false,205,'trophy',null,'Klasik: 250 Galibiyet','Classic: 250 Wins', 'Klasik''te 250 maç kazan',      'Win 250 Classic matches'),
  ('klasik_500', 'klasik','altin', 500,'klasik_galibiyet',false,206,'trophy',null,'Klasik: 500 Galibiyet','Classic: 500 Wins', 'Klasik''te 500 maç kazan',      'Win 500 Classic matches'),
  ('klasik_1000','klasik','elmas',1000,'klasik_galibiyet',false,207,'trophy',null,'Klasik: 1.000 Galibiyet','Classic: 1,000 Wins','Klasik''te 1.000 maç kazan', 'Win 1,000 Classic matches'),
  -- DÜELLO GALİBİYET (7)
  ('duello_1',   'duello','bronz',   1,'duello_galibiyet',false,301,'sword',null,'İlk Düello Zaferi',   'First Duel Win',     'Düello''da ilk maçını kazan',   'Win your first Duel'),
  ('duello_10',  'duello','bronz',  10,'duello_galibiyet',false,302,'sword',null,'Düello: 10 Galibiyet','Duel: 10 Wins',      'Düello''da 10 maç kazan',       'Win 10 Duels'),
  ('duello_50',  'duello','gumus',  50,'duello_galibiyet',false,303,'sword',null,'Düello: 50 Galibiyet','Duel: 50 Wins',      'Düello''da 50 maç kazan',       'Win 50 Duels'),
  ('duello_100', 'duello','gumus', 100,'duello_galibiyet',false,304,'sword',null,'Düello: 100 Galibiyet','Duel: 100 Wins',    'Düello''da 100 maç kazan',      'Win 100 Duels'),
  ('duello_250', 'duello','altin', 250,'duello_galibiyet',false,305,'sword',null,'Düello: 250 Galibiyet','Duel: 250 Wins',    'Düello''da 250 maç kazan',      'Win 250 Duels'),
  ('duello_500', 'duello','altin', 500,'duello_galibiyet',false,306,'sword',null,'Düello: 500 Galibiyet','Duel: 500 Wins',    'Düello''da 500 maç kazan',      'Win 500 Duels'),
  ('duello_1000','duello','elmas',1000,'duello_galibiyet',false,307,'sword',null,'Düello: 1.000 Galibiyet','Duel: 1,000 Wins','Düello''da 1.000 maç kazan',    'Win 1,000 Duels'),
  -- GÜNLÜK SERİ (7)
  ('seri_3',   'seri','bronz',  3,'seri',false,401,'fire',null,'3 Günlük Seri',   '3-Day Streak',   '3 gün üst üste oyna',   'Play 3 days in a row'),
  ('seri_7',   'seri','bronz',  7,'seri',false,402,'fire',null,'7 Günlük Seri',   '7-Day Streak',   '7 gün üst üste oyna',   'Play 7 days in a row'),
  ('seri_14',  'seri','gumus', 14,'seri',false,403,'fire',null,'14 Günlük Seri',  '14-Day Streak',  '14 gün üst üste oyna',  'Play 14 days in a row'),
  ('seri_30',  'seri','gumus', 30,'seri',false,404,'fire',null,'30 Günlük Seri',  '30-Day Streak',  '30 gün üst üste oyna',  'Play 30 days in a row'),
  ('seri_60',  'seri','altin', 60,'seri',false,405,'fire',null,'60 Günlük Seri',  '60-Day Streak',  '60 gün üst üste oyna',  'Play 60 days in a row'),
  ('seri_100', 'seri','altin',100,'seri',false,406,'fire',null,'100 Günlük Seri', '100-Day Streak', '100 gün üst üste oyna', 'Play 100 days in a row'),
  ('seri_365', 'seri','elmas',365,'seri',false,407,'fire',null,'365 Günlük Seri', '365-Day Streak', '365 gün üst üste oyna', 'Play 365 days in a row'),
  -- TURNUVA (6)
  ('turnuva_katilim',     'turnuva','bronz', 1,'turnuva_katilim', false,601,'ticket',     null,'İlk Turnuva',        'First Tournament',   'Bir turnuvaya katıl',              'Take part in a tournament'),
  ('turnuva_ilk10',       'turnuva','bronz', 1,'turnuva_ilk10',   false,602,'medal',      null,'İlk 10',             'Top 10',             'Bir turnuvayı ilk 10''da bitir',    'Finish a tournament in the top 10'),
  ('turnuva_ilk3',        'turnuva','gumus', 1,'turnuva_ilk3',    false,603,'medal-military',null,'Kürsü',            'Podium',             'Bir turnuvayı ilk 3''te bitir',     'Finish a tournament in the top 3'),
  ('turnuva_sampiyon',    'turnuva','altin', 1,'turnuva_sampiyon',false,604,'crown',      null,'Şampiyon',           'Champion',           'Bir turnuvayı kazan',              'Win a tournament'),
  ('turnuva_sampiyon_5',  'turnuva','altin', 5,'turnuva_sampiyon',false,605,'crown',      null,'5 Kez Şampiyon',     '5-Time Champion',    '5 turnuva kazan',                  'Win 5 tournaments'),
  ('turnuva_sampiyon_25', 'turnuva','elmas',25,'turnuva_sampiyon',false,606,'crown-simple',null,'25 Kez Şampiyon',   '25-Time Champion',   '25 turnuva kazan',                 'Win 25 tournaments'),
  -- LİG (5) — lig_en_yuksek: 2 Gümüş · 3 Altın · 4 Elmas · 5 Efsane
  ('lig_cikis_gumus',  'lig','bronz',1,'lig_gumus', false,701,'shield-star',null,'Gümüş Lig',      'Silver League',    'Gümüş Lig''e yüksel',            'Get promoted to the Silver League'),
  ('lig_cikis_altin',  'lig','gumus',1,'lig_altin', false,702,'shield-star',null,'Altın Lig',      'Gold League',      'Altın Lig''e yüksel',            'Get promoted to the Gold League'),
  ('lig_cikis_elmas',  'lig','altin',1,'lig_elmas', false,703,'shield-star',null,'Elmas Lig',      'Diamond League',   'Elmas Lig''e yüksel',            'Get promoted to the Diamond League'),
  ('lig_cikis_efsane', 'lig','elmas',1,'lig_efsane',false,704,'shield-star',null,'Efsane Lig',     'Legend League',    'Efsane Lig''e yüksel',           'Get promoted to the Legend League'),
  ('lig_efsane_bir',   'lig','elmas',1,'olay',      false,705,'crown',      null,'Efsanelerin Zirvesi','Top of the Legends','Efsane Lig''de haftayı grubunun 1.''si bitir','Finish a week 1st in your Legend League group'),
  -- ÖZEL AN (7)
  ('ozel_kusursuz',  'ozel','gumus', 1,'klasik_tam',         false,801,'target',          null,'Kusursuz',        'Flawless',        'Klasik''te bir maçın bütün sorularını doğru bil',   'Answer every question right in a Classic match'),
  ('ozel_son_can',   'ozel','bronz', 1,'duello_son_can',     false,802,'heart-half',      null,'Son Nefes',       'Last Breath',     'Düello''yu son canınla kazan',                      'Win a Duel on your last life'),
  ('ozel_geri_donus','ozel','altin', 1,'duello_geri_donus',  false,803,'arrow-bend-up-left',null,'Büyük Geri Dönüş','Great Comeback', 'Düello''da 2 can gerideyken maçı kazan',            'Win a Duel after trailing by 2 lives'),
  ('ozel_saf_10',    'ozel','bronz',10,'saf_bilgi_galibiyet',false,804,'brain',           null,'Saf Bilgi: 10',   'Pure Knowledge: 10','Saf Bilgi''de 10 maç kazan',                     'Win 10 Pure Knowledge matches'),
  ('ozel_saf_50',    'ozel','gumus',50,'saf_bilgi_galibiyet',false,805,'brain',           null,'Saf Bilgi: 50',   'Pure Knowledge: 50','Saf Bilgi''de 50 maç kazan',                     'Win 50 Pure Knowledge matches'),
  ('ozel_seri_5',    'ozel','gumus', 5,'galibiyet_serisi',   false,806,'lightning',       null,'Beşte Beş',       'Five in a Row',   '5 maçı üst üste kazan (Klasik + Düello)',          'Win 5 matches in a row (Classic + Duel)'),
  ('ozel_seri_10',   'ozel','altin',10,'galibiyet_serisi',   false,807,'lightning',       null,'Durdurulamaz',    'Unstoppable',     '10 maçı üst üste kazan (Klasik + Düello)',         'Win 10 matches in a row (Classic + Duel)'),
  -- SOSYAL (6)
  ('sosyal_arkadas_1',     'sosyal','bronz', 1,'arkadas',    false,901,'user-plus',  null,'İlk Arkadaş',     'First Friend',      'İlk arkadaşını ekle',                      'Add your first friend'),
  ('sosyal_arkadas_10',    'sosyal','gumus',10,'arkadas',    false,902,'users-three',null,'Kalabalık Masa',  'Full Table',        '10 arkadaşın olsun',                       'Have 10 friends'),
  ('sosyal_davet_1',       'sosyal','bronz', 1,'davet',      false,903,'gift',       null,'İlk Davet',       'First Invite',      'Davet ettiğin bir arkadaşın Level 5''e ulaşsın',   'A friend you invited reaches Level 5'),
  ('sosyal_davet_5',       'sosyal','gumus', 5,'davet',      false,904,'gift',       null,'Davetkâr',        'Host',              'Davet ettiğin 5 arkadaşın Level 5''e ulaşsın',     '5 friends you invited reach Level 5'),
  ('sosyal_davet_20',      'sosyal','altin',20,'davet',      false,905,'gift',       null,'Elçi',            'Ambassador',        'Davet ettiğin 20 arkadaşın Level 5''e ulaşsın',    '20 friends you invited reach Level 5'),
  ('sosyal_arkadas_mac_25','sosyal','gumus',25,'arkadas_mac',false,906,'handshake',  null,'Dostlar Meclisi', 'Friendly Rivals',   'Arkadaşlarınla 25 maç oyna (Klasik + Düello)',     'Play 25 matches with friends (Classic + Duel)'),
  -- GİZLİ (5) — kazanılana kadar ad/koşul istemciye gönderilmez
  ('gizli_rovans',   'gizli','bronz',1,'rovans_galibiyet', true,1001,'arrows-clockwise', null,'Rövanşçı',        'Rematch King',    'Bir rövanş maçını kazan',                               'Win a rematch'),
  ('gizli_uzatma',   'gizli','gumus',1,'uzatma_galibiyet', true,1002,'hourglass-high',   null,'Uzatmaların Adamı','Overtime Hero',  'Uzatmaya giden bir Düello''yu kazan',                   'Win a Duel that went to overtime'),
  ('gizli_kasif',    'gizli','gumus',8,'kasif',            true,1003,'compass',          null,'Kaşif',           'Explorer',        '8 farklı kategoride en az 10''ar doğru cevap ver',      'Give at least 10 correct answers in 8 different categories'),
  ('gizli_ilk_soz',  'gizli','bronz',1,'mac_mesaji',       true,1004,'chat-circle-dots', null,'İlk Söz',         'Ice Breaker',     'Bir maçta rakibine ilk mesajını gönder',                'Send your first message to a rival in a match'),
  ('gizli_bes_seans','gizli','altin',5,'turnuva_seans',    true,1005,'calendar-check',   null,'Her Saatin Oyuncusu','Around the Clock','Günün 5 turnuva seansının her birine en az bir kez katıl','Join each of the 5 daily tournament sessions at least once')
)
insert into public.rozet_tanimlari (anahtar, grup, kademe, esik, olcut, coin, gizli, sira, ikon, cerceve, ad_tr, ad_en, aciklama_tr, aciklama_en)
select anahtar, grup, kademe, esik, olcut,
       case kademe when 'bronz' then 10 when 'gumus' then 25 when 'altin' then 50 else 100 end,
       gizli, sira, ikon, cerceve, ad_tr, ad_en, aciklama_tr, aciklama_en
  from v
on conflict (anahtar) do nothing;

-- KATEGORİ USTALIĞI (10 kategori × 4 kademe = 40) — mevcut ustalık eşikleri Çırak 25 · Kalfa 100 · Usta 300 · Üstat 750
with k(kat, sira, ad_tr, ad_en) as (values
  ('genel_kultur', 0, 'Genel Kültür', 'General Knowledge'),
  ('bilim',        1, 'Bilim',        'Science'),
  ('tarih',        2, 'Tarih',        'History'),
  ('cografya',     3, 'Coğrafya',     'Geography'),
  ('edebiyat',     4, 'Edebiyat',     'Literature'),
  ('spor',         5, 'Spor',         'Sports'),
  ('sanat',        6, 'Sanat',        'Art'),
  ('sinema',       7, 'Sinema',       'Cinema'),
  ('muzik',        8, 'Müzik',        'Music'),
  ('teknoloji',    9, 'Teknoloji',    'Technology')
), d(kademe, esik, ks, dtr, den) as (values
  ('bronz',  25, 1, 'Çırak', 'Apprentice'),
  ('gumus', 100, 2, 'Kalfa', 'Journeyman'),
  ('altin', 300, 3, 'Usta',  'Expert'),
  ('elmas', 750, 4, 'Üstat', 'Master')
)
insert into public.rozet_tanimlari (anahtar, grup, kademe, esik, olcut, coin, gizli, sira, ikon, cerceve, ad_tr, ad_en, aciklama_tr, aciklama_en)
select 'ustalik_' || k.kat || '_' || d.esik, 'ustalik', d.kademe, d.esik, 'kategori:' || k.kat,
       case d.kademe when 'bronz' then 10 when 'gumus' then 25 when 'altin' then 50 else 100 end,
       false, 500 + k.sira * 10 + d.ks, 'kategori:' || k.kat, null,
       k.ad_tr || ' · ' || d.dtr, k.ad_en || ' · ' || d.den,
       k.ad_tr || ' kategorisinde ' || d.esik || ' doğru cevap ver',
       'Give ' || d.esik || ' correct answers in ' || k.ad_en
  from k cross join d
on conflict (anahtar) do nothing;

-- ---------- Profil kolonları ----------
alter table public.profiles add column if not exists takili_cerceve text references public.cerceveler(anahtar);
alter table public.profiles add column if not exists vitrin_rozetleri text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_vitrin_rozetleri_max;
alter table public.profiles add constraint profiles_vitrin_rozetleri_max check (coalesce(array_length(vitrin_rozetleri, 1), 0) <= 3);
-- Başkasının çerçevesi ve vitrini herkese açık bilgidir (oyuncu kartı).
grant select (takili_cerceve, vitrin_rozetleri) on public.profiles to authenticated;

-- ---------- Davetler ----------
create table if not exists public.davetler (
  id bigint generated always as identity primary key,
  davet_eden uuid not null references public.profiles(id) on delete cascade,
  davet_edilen uuid not null unique references public.profiles(id) on delete cascade,
  durum text not null default 'bekliyor'
    check (durum in ('bekliyor','odullendi','sinir_asildi','gecersiz')),
  gecersiz_neden text,               -- 'ayni_cihaz' …
  eden_coin int not null default 0,
  edilen_coin int not null default 0,
  olusturma_at timestamptz not null default now(),
  odul_at timestamptz,
  constraint davet_kendine_degil check (davet_eden <> davet_edilen)
);
create index if not exists davetler_eden_idx on public.davetler (davet_eden, durum);
alter table public.davetler enable row level security;   -- yalnız RPC

-- Coin hareketi tekilliği: aynı rozet iki kez coin vermesin.
create unique index if not exists coin_hareketleri_rozet_tek
  on public.coin_hareketleri (user_id, tur, referans) where tur = 'rozet' and referans is not null;

-- ============================================================
-- İÇ YARDIMCILAR
-- ============================================================

-- Oyuncunun dili: 'en' → İngilizce metin, diğerleri Türkçe.
create or replace function public.rozet_dil_en(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select p.dil from public.profiles p where p.id = p_user), 'tr') = 'en';
$$;
revoke all on function public.rozet_dil_en(uuid) from public, anon, authenticated;

-- Rozet ölçütünün oyuncu için bugünkü değeri. Tek kaynak: rozetlerim ilerlemesi,
-- olay anındaki kontrol ve geriye dönük verme aynı fonksiyonu kullanır.
create or replace function public.rozet_olcut(p_user uuid, p_olcut text)
returns bigint
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v bigint := 0;
  v_fark int;
  v_min int;
begin
  if p_user is null or p_olcut is null then return 0; end if;

  if p_olcut = 'level' then
    select coalesce(level, 1) into v from public.profiles where id = p_user;

  elsif p_olcut = 'klasik_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user;

  elsif p_olcut = 'saf_bilgi_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.jokersiz, false);

  elsif p_olcut = 'duello_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user;

  elsif p_olcut = 'seri' then
    select greatest(coalesce(seri_gun, 0), coalesce(seri_en_uzun, 0), coalesce(seri, 0))
      into v from public.profiles where id = p_user;

  elsif p_olcut like 'kategori:%' then
    select coalesce(max(kd.dogru_sayisi), 0) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.kategori = substr(p_olcut, 10);

  elsif p_olcut = 'kasif' then
    v_min := public.ayar_sayi('rozet_kasif_min_dogru', 10)::int;
    select count(*) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.dogru_sayisi >= v_min;

  elsif p_olcut = 'turnuva_katilim' then
    select count(*) into v from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and t.durum = 'bitti';

  elsif p_olcut in ('turnuva_ilk10', 'turnuva_ilk3') then
    -- Sıra, ödül dağıtımıyla aynı düzen (turnuva_odullerini_dagit)
    select count(*) into v from (
      select tp.user_id,
             row_number() over (partition by tp.tournament_id
                                order by tp.elendi asc, tp.elenme_sorusu desc nulls first,
                                         tp.dogru_sayisi desc, tp.user_id) as sira
        from public.tournament_players tp
        join public.tournaments t on t.id = tp.tournament_id and t.durum = 'bitti'
       where tp.tournament_id in (select x.tournament_id from public.tournament_players x where x.user_id = p_user)
    ) s
     where s.user_id = p_user and s.sira <= case when p_olcut = 'turnuva_ilk3' then 3 else 10 end;

  elsif p_olcut = 'turnuva_sampiyon' then
    select count(*) into v from public.tournaments t
     where t.durum = 'bitti' and t.kazanan = p_user;

  elsif p_olcut = 'turnuva_seans' then
    select count(distinct t.seans) into v
      from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user
       and t.seans in (select jsonb_array_elements_text(o.deger) from public.oyun_ayarlari o
                        where o.anahtar = 'turnuva_saatleri' and jsonb_typeof(o.deger) = 'array');

  elsif p_olcut in ('lig_gumus', 'lig_altin', 'lig_elmas', 'lig_efsane') then
    -- Bir kez çıkılan lig sayılır (düşse de rozet kalır): profil + kalıcı lig çerçeveleri
    select case when greatest(
             public.lig_sirasi(coalesce(p.lig, 'bronz')),
             coalesce((select max(public.lig_sirasi(c.lig)) from public.lig_cerceveleri c where c.user_id = p_user), 1)
           ) >= public.lig_sirasi(substr(p_olcut, 5)) then 1 else 0 end
      into v from public.profiles p where p.id = p_user;

  elsif p_olcut = 'klasik_tam' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
       and coalesce(array_length(m.soru_ids, 1), 0) > 0
       and (select count(distinct a.soru_index) from public.match_answers a
             where a.match_id = m.id and a.user_id = p_user and a.dogru) >= array_length(m.soru_ids, 1);

  elsif p_olcut = 'duello_son_can' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and ((d.oyuncu1 = p_user and d.can1 = 1) or (d.oyuncu2 = p_user and d.can2 = 1));

  elsif p_olcut = 'duello_geri_donus' then
    v_fark := public.ayar_sayi('rozet_geri_donus_can_farki', 2)::int;
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and exists (
         select 1 from (
           select sum(case when h.can_kaybeden = p_user then 1
                           when h.can_kaybeden is not null then -1 else 0 end)
                    over (order by h.id) as fark
             from public.duello_hamleler h where h.duello_id = d.id
         ) x where x.fark >= v_fark);

  elsif p_olcut = 'uzatma_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user and coalesce(d.uzatma, false);

  elsif p_olcut = 'rovans_galibiyet' then
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.rovans, false))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and d.kazanan = p_user and d.onceki_id is not null)
      into v;

  elsif p_olcut = 'galibiyet_serisi' then
    -- Klasik + Düello, bitiş sırasıyla; beraberlik ve mağlubiyet seriyi keser.
    with g as (
      select coalesce(m.bitis, m.created_at) as t, coalesce(m.kazanan = p_user, false) as w
        from public.matches m
       where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
      union all
      select coalesce(d.bitis, d.son_hareket, d.created_at), coalesce(d.kazanan = p_user, false)
        from public.duellolar d
       where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2)
    ), n as (
      select w, sum(case when w then 0 else 1 end) over (order by t rows unbounded preceding) as grp from g
    )
    select coalesce(max(c), 0) into v from (select count(*) as c from n where w group by grp) x;

  elsif p_olcut = 'arkadas' then
    select count(*) into v from public.friendships f
     where f.durum = 'arkadas' and p_user in (f.requester, f.addressee);

  elsif p_olcut = 'arkadas_mac' then
    with ark as (
      select case when f.requester = p_user then f.addressee else f.requester end as id
        from public.friendships f
       where f.durum = 'arkadas' and p_user in (f.requester, f.addressee)
    )
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
               and (case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end) in (select id from ark))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2)
               and (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end) in (select id from ark))
      into v;

  elsif p_olcut = 'davet' then
    select count(*) into v from public.davetler dv
     where dv.davet_eden = p_user and dv.durum in ('odullendi', 'sinir_asildi');

  elsif p_olcut = 'mac_mesaji' then
    select case when exists (select 1 from public.match_messages mm where mm.user_id = p_user) then 1 else 0 end into v;

  else
    v := 0;   -- 'olay' ve bilinmeyenler: yalnız olay anında verilir
  end if;

  return coalesce(v, 0);
end;
$$;
revoke all on function public.rozet_olcut(uuid, text) from public, anon, authenticated;

-- Çerçeve ver (iç). Oyuncunun takılı çerçevesi yoksa bunu takar.
create or replace function public.cerceve_ver(p_user uuid, p_cerceve text, p_kaynak text default 'rozet')
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
declare v_yeni boolean;
begin
  if p_user is null or p_cerceve is null then return false; end if;
  if not exists (select 1 from public.cerceveler c where c.anahtar = p_cerceve) then return false; end if;
  insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak)
  values (p_user, p_cerceve, coalesce(p_kaynak, 'rozet'))
  on conflict do nothing
  returning true into v_yeni;
  if coalesce(v_yeni, false) then
    update public.profiles set takili_cerceve = p_cerceve
     where id = p_user and takili_cerceve is null;
  end if;
  return coalesce(v_yeni, false);
end;
$$;
revoke all on function public.cerceve_ver(uuid, text, text) from public, anon, authenticated;

-- ============================================================
-- İSTEMCİ RPC'LERİ
-- ============================================================

-- Oyuncu kartları: ad, avatar, level, LİG, takılı çerçeve, vitrin rozetleri.
-- profiles.lig ve is_bot istemciye kapalı; lig yalnız bu yolla gelir, is_bot hiç gelmez.
create or replace function public.oyuncu_kartlari(p_idler uuid[])
returns table (id uuid, ad text, avatar text, level int, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb)
language sql stable security definer set search_path to 'public'
as $$
  select p.id, p.gorunen_ad, p.gorunen_avatar, coalesce(p.level, 1), coalesce(p.lig, 'bronz'),
         p.takili_cerceve, c.nadirlik,
         coalesce((
           select jsonb_agg(jsonb_build_object('anahtar', t.anahtar, 'grup', t.grup, 'kademe', t.kademe, 'ikon', t.ikon)
                            order by v.ord)
             from unnest(p.vitrin_rozetleri) with ordinality as v(anahtar, ord)
             join public.rozet_tanimlari t on t.anahtar = v.anahtar
             join public.oyuncu_rozetleri r on r.user_id = p.id and r.rozet = v.anahtar
         ), '[]'::jsonb)
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$$;
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated;

-- Bütün rozet tanımları + kazanılanlar + ilerleme.
create or replace function public.rozetlerim()
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_degerler jsonb := '{}'::jsonb;
  r record;
  v_liste jsonb := '[]'::jsonb;
  v_deger bigint;
  v_kazanilan int := 0; v_toplam int := 0;
  v_vitrin text[];
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);

  -- Her ölçüt bir kez hesaplanır
  for r in select distinct t.olcut from public.rozet_tanimlari t where t.aktif loop
    v_degerler := v_degerler || jsonb_build_object(r.olcut, public.rozet_olcut(v_me, r.olcut));
  end loop;

  for r in
    select t.*, o.kazanildi_at, (o.rozet is not null) as kazanildi
      from public.rozet_tanimlari t
      left join public.oyuncu_rozetleri o on o.user_id = v_me and o.rozet = t.anahtar
     where t.aktif
     order by t.sira
  loop
    v_toplam := v_toplam + 1;
    if r.kazanildi then v_kazanilan := v_kazanilan + 1; end if;
    v_deger := case when r.kazanildi then r.esik
                    else least(coalesce((v_degerler ->> r.olcut)::bigint, 0), r.esik) end;
    if r.gizli and not r.kazanildi then
      v_liste := v_liste || jsonb_build_object(
        'anahtar', r.anahtar, 'grup', r.grup, 'kademe', r.kademe, 'esik', null, 'coin', r.coin,
        'gizli', true, 'sira', r.sira, 'ikon', null, 'cerceve', null,
        'ad', null, 'aciklama', null, 'ad_tr', null, 'ad_en', null, 'aciklama_tr', null, 'aciklama_en', null,
        'kazanildi', false, 'kazanildi_at', null, 'deger', null, 'hedef', null);
    else
      v_liste := v_liste || jsonb_build_object(
        'anahtar', r.anahtar, 'grup', r.grup, 'kademe', r.kademe, 'esik', r.esik, 'coin', r.coin,
        'gizli', r.gizli, 'sira', r.sira, 'ikon', r.ikon, 'cerceve', r.cerceve,
        'ad', case when v_en then r.ad_en else r.ad_tr end,
        'aciklama', case when v_en then r.aciklama_en else r.aciklama_tr end,
        'ad_tr', r.ad_tr, 'ad_en', r.ad_en, 'aciklama_tr', r.aciklama_tr, 'aciklama_en', r.aciklama_en,
        'kazanildi', r.kazanildi, 'kazanildi_at', r.kazanildi_at,
        'deger', v_deger, 'hedef', r.esik);
    end if;
  end loop;

  select coalesce(p.vitrin_rozetleri, '{}') into v_vitrin from public.profiles p where p.id = v_me;

  return jsonb_build_object(
    'gruplar', (select coalesce(jsonb_agg(jsonb_build_object(
                  'anahtar', g.anahtar, 'sira', g.sira, 'ikon', g.ikon,
                  'ad', case when v_en then g.ad_en else g.ad_tr end, 'ad_tr', g.ad_tr, 'ad_en', g.ad_en)
                  order by g.sira), '[]'::jsonb) from public.rozet_gruplari g),
    'rozetler', v_liste,
    'vitrin', to_jsonb(coalesce(v_vitrin, '{}')),
    'vitrin_max', public.ayar_sayi('rozet_vitrin_max', 3)::int,
    'ozet', jsonb_build_object('kazanilan', v_kazanilan, 'toplam', v_toplam));
end;
$$;
revoke all on function public.rozetlerim() from public, anon;
grant execute on function public.rozetlerim() to authenticated;

-- Vitrin: en fazla 3 kazanılmış rozet (sıra korunur). Boş dizi = vitrini temizle.
create or replace function public.rozet_vitrini_sec(p_rozetler text[])
returns text[]
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_max int := least(public.ayar_sayi('rozet_vitrin_max', 3)::int, 3);
  v_liste text[];
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('rozet_vitrini_sec', 20, interval '60 seconds');
  select coalesce(array_agg(x.a order by x.ord), '{}') into v_liste
    from (select a, min(ord) as ord
            from unnest(coalesce(p_rozetler, '{}')) with ordinality as u(a, ord)
           where a is not null and btrim(a) <> ''
           group by a) x;
  if coalesce(array_length(v_liste, 1), 0) > v_max then
    raise exception 'Vitrine en fazla % rozet konabilir', v_max;
  end if;
  if exists (select 1 from unnest(v_liste) a
              where not exists (select 1 from public.oyuncu_rozetleri o where o.user_id = v_me and o.rozet = a)) then
    raise exception 'Vitrine yalnız kazandığın rozetleri koyabilirsin';
  end if;
  update public.profiles set vitrin_rozetleri = v_liste where id = v_me;
  return v_liste;
end;
$$;
revoke all on function public.rozet_vitrini_sec(text[]) from public, anon;
grant execute on function public.rozet_vitrini_sec(text[]) to authenticated;

-- Yeni kazanılan (görülmemiş) rozetler — okununca "görüldü" olur. Bildirim için.
create or replace function public.rozet_bildirimlerim()
returns table (anahtar text, grup text, kademe text, ikon text, ad text, coin int, cerceve text, kazanildi_at timestamptz)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  return query
  with g as (
    update public.oyuncu_rozetleri o set goruldu = true
     where o.user_id = v_me and not o.goruldu
    returning o.rozet, o.coin, o.kazanildi_at
  )
  select t.anahtar, t.grup, t.kademe, t.ikon, case when v_en then t.ad_en else t.ad_tr end,
         g.coin, t.cerceve, g.kazanildi_at
    from g join public.rozet_tanimlari t on t.anahtar = g.rozet
   order by g.kazanildi_at, t.sira;
end;
$$;
revoke all on function public.rozet_bildirimlerim() from public, anon;
grant execute on function public.rozet_bildirimlerim() to authenticated;

-- Çerçeve kataloğu + benim durumum (sahip / takılı).
create or replace function public.cerceve_katalogu()
returns table (anahtar text, ad text, ad_tr text, ad_en text, nadirlik text, kaynak text, fiyat int,
               kosul text, sira int, satilik boolean, sahip boolean, takili boolean)
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_takili text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  select p.takili_cerceve into v_takili from public.profiles p where p.id = v_me;
  return query
  select c.anahtar, case when v_en then c.ad_en else c.ad_tr end, c.ad_tr, c.ad_en,
         c.nadirlik, c.kaynak, c.fiyat, c.kosul, c.sira,
         (c.kaynak = 'dukkan'),
         exists (select 1 from public.oyuncu_cerceveleri o where o.user_id = v_me and o.cerceve = c.anahtar),
         (c.anahtar = v_takili)
    from public.cerceveler c
   where c.aktif
   order by c.sira;
end;
$$;
revoke all on function public.cerceve_katalogu() from public, anon;
grant execute on function public.cerceve_katalogu() to authenticated;

-- Sahip olduğum çerçeveler.
create or replace function public.cercevelerim()
returns table (anahtar text, ad text, nadirlik text, kaynak text, kazanildi_at timestamptz, takili boolean)
language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_takili text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  select p.takili_cerceve into v_takili from public.profiles p where p.id = v_me;
  return query
  select c.anahtar, case when v_en then c.ad_en else c.ad_tr end, c.nadirlik, c.kaynak,
         o.kazanildi_at, (c.anahtar = v_takili)
    from public.oyuncu_cerceveleri o
    join public.cerceveler c on c.anahtar = o.cerceve
   where o.user_id = v_me
   order by c.sira;
end;
$$;
revoke all on function public.cercevelerim() from public, anon;
grant execute on function public.cercevelerim() to authenticated;

-- Çerçeve tak (null = çerçevesiz). Eski lig çerçevesi alanı (gorunum.lig_cerceve) eşlenir:
-- eski istemciler ve oyuncu_lig_cerceveleri aynı sonucu görsün.
create or replace function public.cerceve_tak(p_anahtar text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_lig text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('cerceve_tak', 20, interval '60 seconds');
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null and not exists (
       select 1 from public.oyuncu_cerceveleri o where o.user_id = v_me and o.cerceve = p_anahtar) then
    raise exception 'Bu çerçeve sende yok';
  end if;
  v_lig := case when p_anahtar like 'lig\_%' then substr(p_anahtar, 5) else null end;
  update public.profiles
     set takili_cerceve = p_anahtar,
         gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', v_lig, 'lig_cerceve_elle', true)
   where id = v_me;
  return jsonb_build_object('takili', p_anahtar);
end;
$$;
revoke all on function public.cerceve_tak(text) from public, anon;
grant execute on function public.cerceve_tak(text) to authenticated;

-- Dükkândan çerçeve satın al: tek işlem, profil kilitli; lig/level/etkinlik çerçevesi satılmaz.
create or replace function public.cerceve_satin_al(p_anahtar text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_c public.cerceveler%rowtype;
  v_bakiye bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('cerceve_satin_al', 20, interval '60 seconds');
  select * into v_c from public.cerceveler c where c.anahtar = p_anahtar;
  if not found or not v_c.aktif then raise exception 'Böyle bir çerçeve yok'; end if;
  if v_c.kaynak <> 'dukkan' or v_c.fiyat is null then raise exception 'Bu çerçeve satılmıyor'; end if;

  -- Kilit: aynı anda iki satın alma denemesi sırayla işlensin
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_cerceveleri o where o.user_id = v_me and o.cerceve = v_c.anahtar) then
    raise exception 'Bu çerçeve zaten sende';
  end if;

  v_bakiye := public.coin_harca(v_c.fiyat::bigint, 'cerceve', v_c.anahtar);   -- yetersizse 'Yetersiz coin'
  insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak) values (v_me, v_c.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_c.anahtar, 'fiyat', v_c.fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$$;
revoke all on function public.cerceve_satin_al(text) from public, anon;
grant execute on function public.cerceve_satin_al(text) to authenticated;

-- Lig kartı özeti: benim sıram, üstümdeki 2 + altımdaki 2, sınırlar, farklar, hafta bitişi.
-- Grup kurulmamışsa (yeni oyuncu) null döner, hata değil.
create or replace function public.lig_grubum_ozet()
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_tum jsonb;
  v_satirlar jsonb;
  v_ben record;
  v_boyu int; v_lig text; v_yuk int; v_dus int; v_bitis timestamptz;
  v_ust_puan int; v_cizgi_puan int;
  v_yuk_sira int; v_dus_sira int;
  v_bolge text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Mevcut lig_grubum() (görünürlük kuralları onda) tek kez çağrılır
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', g.sira, 'user_id', g.user_id, 'puan', g.puan, 'ben', g.ben, 'lig', g.lig,
           'yukselen', g.yukselen, 'dusen', g.dusen, 'sezon_bitis', g.sezon_bitis)), '[]'::jsonb)
    into v_tum
    from public.lig_grubum() g;

  select * into v_ben from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean,
    lig text, yukselen int, dusen int, sezon_bitis timestamptz) where o.ben limit 1;
  if not found then return null; end if;

  v_lig := v_ben.lig; v_yuk := v_ben.yukselen; v_dus := v_ben.dusen; v_bitis := v_ben.sezon_bitis;
  v_boyu := jsonb_array_length(v_tum);   -- oyuncunun gördüğü tablo boyu

  v_yuk_sira := case when v_lig = 'efsane' then null else least(v_yuk, v_boyu) end;
  v_dus_sira := case when v_lig = 'bronz' or v_boyu <= v_dus then null else v_boyu - v_dus + 1 end;

  select o.puan into v_ust_puan from jsonb_to_recordset(v_tum) as o(sira bigint, puan int) where o.sira = v_ben.sira - 1;
  select o.puan into v_cizgi_puan from jsonb_to_recordset(v_tum) as o(sira bigint, puan int) where o.sira = v_yuk_sira;

  v_bolge := case
    when v_yuk_sira is not null and v_ben.sira <= v_yuk_sira and coalesce(v_ben.puan, 0) > 0 then 'yukselme'
    when v_dus_sira is not null and v_ben.sira >= v_dus_sira then 'dusme'
    else 'guvenli' end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', o.sira, 'user_id', o.user_id, 'puan', o.puan, 'ben', o.ben,
           'ad', k.ad, 'avatar', k.avatar, 'level', k.level, 'lig', k.lig,
           'cerceve', k.cerceve, 'cerceve_nadirlik', k.cerceve_nadirlik, 'vitrin', k.vitrin)
           order by o.sira), '[]'::jsonb)
    into v_satirlar
    from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean)
    left join lateral public.oyuncu_kartlari(array[o.user_id]) k on true
   where o.sira between v_ben.sira - 2 and v_ben.sira + 2;

  return jsonb_build_object(
    'lig', v_lig,
    'ust_lig', case when v_lig = 'efsane' then null else public.lig_adi(public.lig_sirasi(v_lig) + 1) end,
    'alt_lig', case when v_lig = 'bronz' then null else public.lig_adi(public.lig_sirasi(v_lig) - 1) end,
    'grup_boyu', v_boyu,
    'sira', v_ben.sira,
    'puan', v_ben.puan,
    'yukselen', v_yuk,
    'dusen', v_dus,
    'yukselme_sirasi', v_yuk_sira,
    'dusme_sirasi', v_dus_sira,
    'bolge', v_bolge,
    'ust_siraya_fark', case when v_ust_puan is null then null else greatest(v_ust_puan - v_ben.puan, 0) + 1 end,
    'yukselme_cizgisine_fark', case
        when v_yuk_sira is null then null
        when v_bolge = 'yukselme' then 0
        else greatest(coalesce(v_cizgi_puan, 0) - coalesce(v_ben.puan, 0), 0) + 1 end,
    'hafta_bitis', v_bitis,
    'satirlar', v_satirlar);
end;
$$;
revoke all on function public.lig_grubum_ozet() from public, anon;
grant execute on function public.lig_grubum_ozet() to authenticated;
