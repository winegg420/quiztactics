-- ============================================================
-- 003 — Şık ipucu düzeltmesi, parti 7 (8 Eki 2026, Claude API)
--
-- 298'de Jev'in soru metnini görmeden doğru şıkkı > 0,8 güvenle bulduğu sorular
-- `sik_ipucu_jev` ile işaretlenip rekabetçi havuzdan çıkarılmıştı. Bu partide işaretli kolay/orta
-- (zorluk 1–3) sorulardan 26 tanesinin YANLIŞ şıkları Claude API (claude-sonnet-5-5) ile yeniden yazıldı;
-- soru metni, doğru cevap ve doğru şıkkın indeksi DEĞİŞMEDİ (match_answers.cevap indeksle tutulur, şık sırası karışmaz).
-- Yeni şıklar dört kapıdan geçti: soru_kural_isaretleri (ağırlık >= 2 işaret yok), Jev "soru olmadan"
-- testi (soru_denetim/kapi.mjs › sikIpucuTesti, doğru şıkka <= 0.75), Jev tek doğru cevap kontrolü ve
-- yanlış şık başına ayrı Claude hakem çağrısı (kesin_yanlis). Geçemeyen sorulara dokunulmadı, işaretli kalır.
-- EN çeviri: aynı indekslerle güncellenir (EN çevirisi olmayan soruda yalnız TR). Üretici: araclar/soru-temizlik/sik-ipucu-api.mjs --tam
-- Eski hâl: soru_surum (surum +1) ve araclar/soru-temizlik/sik-ipucu-duzeltme.csv.
-- Geri alma: node araclar/soru-temizlik/sik-ipucu-geri-al.mjs --parti 7   (önce prova)
-- ============================================================

-- Elle işaret (sik_ipucu_jev) tetikleyicide korunur; bilerek kaldırmak için (298):
select set_config('app.soru_elle_isaret_yaz', 'on', true);

create temp table _j_sik (id uuid primary key, dogru smallint, eski_tr jsonb, yeni_tr jsonb, eski_en jsonb, yeni_en jsonb) on commit drop;
insert into _j_sik values
    ('cd97ac21-d7e2-4c30-81eb-1cd8f4beabc9'::uuid, 2, '["Ucuz üretim yalnızca","Düşük kapasite","Yüksek enerji yoğunluğu","Ağırlık"]'::jsonb, '["Yüksek erime noktası","Düşük kapasite","Yüksek enerji yoğunluğu","Kolay geri dönüştürülebilmesi"]'::jsonb, '["Cheap production alone","Low capacity","High energy density","Their weight"]'::jsonb, '["High melting point","Low capacity","High energy density","Easy recyclability"]'::jsonb),
    ('5f8a14a8-19fc-46af-a9aa-0a0306822977'::uuid, 0, '["Tessera","Kalıp","Palet","Fırça"]'::jsonb, '["Tessera","Fresko","Kartuş","Vitray"]'::jsonb, '["Tesserae","Moulds","Palettes","Brushes"]'::jsonb, '["Tesserae","Frescoes","Cartouches","Vitraux"]'::jsonb),
    ('8d3aebfb-d7d3-4fd6-817b-67a2395f8617'::uuid, 1, '["İşlemci hızını","Makinenin insanca yanıt verebilmesini","Bellek boyutunu","Ağ gecikmesini"]'::jsonb, '["Makinenin karmaşık işlemleri hızlı yapabilmesini","Makinenin insanca yanıt verebilmesini","Makinenin veriyi güvenle saklayabilmesini","Makinenin kendi kendini onarabilmesini"]'::jsonb, '["Processor speed","Whether a machine can respond like a human","Memory size","Network latency"]'::jsonb, '["Whether a machine can perform complex operations quickly","Whether a machine can respond like a human","Whether a machine can store data securely","Whether a machine can repair itself"]'::jsonb),
    ('21e84a8d-d75d-4f34-8931-4343c7b9014a'::uuid, 0, '["Zararlı mikropları azaltmak","Renk vermek","Yağ artırmak","Şeker eklemek"]'::jsonb, '["Zararlı mikropları azaltmak","Besinin vitamin oranını artırmak","Besindeki suyu uzaklaştırmak","Besinin asitliğini yükseltmek"]'::jsonb, '["Reducing harmful microbes","Adding colour","Increasing fat","Adding sugar"]'::jsonb, '["Reducing harmful microbes","Raising the food''s vitamin content","Removing water from the food","Increasing the food''s acidity"]'::jsonb),
    ('3e5afef9-92de-446b-8de5-39a2188cb9a8'::uuid, 2, '["Askerî düzeni","Vergi artışını","Hukuki güvence ve eşitlik ilkelerini","Toprak dağıtımını"]'::jsonb, '["Padişahın yetkilerinin kaldırılmasını","Vergi artışını","Hukuki güvence ve eşitlik ilkelerini","Yabancı sermayeye ticari tekel hakkını"]'::jsonb, '["Military order","Tax increases","Legal guarantees and the principle of equality","Land distribution"]'::jsonb, '["Abolition of the sultan''s powers","Tax increases","Legal guarantees and the principle of equality","Commercial monopoly rights for foreign capital"]'::jsonb),
    ('2c46a8d8-ca28-413f-a7fb-a1828c3c2641'::uuid, 3, '["Buharlaşma","Erime","Donma","Su damlasının küresel olması"]'::jsonb, '["Sıvının kaynama noktasında gaza dönüşmesi","Tuzun suda çözünmesi","Buzun yoğunluğunun sudan az olması","Su damlasının küresel olması"]'::jsonb, '["Evaporation","Melting","Freezing","A drop of water becoming spherical"]'::jsonb, '["A liquid turning into gas at its boiling point","Salt dissolving in water","Ice being less dense than water","A drop of water becoming spherical"]'::jsonb),
    ('eafc5da1-1ac3-49e6-a52b-102088fd516e'::uuid, 2, '["Ma Huan","Koxinga","Zheng He","Wang Zhi"]'::jsonb, '["Yi Sun-sin","Koxinga","Zheng He","Qi Jiguang"]'::jsonb, '["Ma Huan","Koxinga","Zheng He","Wang Zhi"]'::jsonb, '["Yi Sun-sin","Koxinga","Zheng He","Qi Jiguang"]'::jsonb),
    ('ece3b65b-5cec-4080-856c-3dc9e1a67891'::uuid, 3, '["Geleneğe dönüşü","Durağanlığı","Muhafazayı","Sürekli yenileşmeyi"]'::jsonb, '["Siyasal kurumların tek elde toplanmasını","Toplumsal yapının korunmasını","Eski kurumların sürdürülmesini","Sürekli yenileşmeyi"]'::jsonb, '["A return to tradition","Stagnation","Conservation","Continuous renewal"]'::jsonb, '["Concentration of political institutions in a single hand","Preservation of the social structure","Continuation of old institutions","Continuous renewal"]'::jsonb),
    ('15933bf4-d8a2-4c51-afa0-f9afeab7dc87'::uuid, 3, '["Yavaş oyun","Faul yapmak","Zaman harcamak","Savunmadan hızla hücuma geçmek"]'::jsonb, '["Hücumdan savunmaya dönüp pozisyonu kapatmak","Topu sürekli ribaunt kovalayarak çevirmek","Rakibin hücumunu yarı sahada durdurmak","Savunmadan hızla hücuma geçmek"]'::jsonb, '["Slow play","Committing fouls","Wasting time","Switching quickly from defence to attack"]'::jsonb, '["Falling back from attack to defence to close the play","Keeping the ball moving by chasing rebounds","Stopping the opponent''s attack at half court","Switching quickly from defence to attack"]'::jsonb),
    ('09df7b99-bc53-476e-b9b9-d0e46038b018'::uuid, 3, '["Sistemin uyku moduna geçişi","Diskin biçimlendirilmesi","Sistemin kapatılma süreci","Sistemin başlatılma süreci"]'::jsonb, '["Sistemin yedeklenme süreci","Verilerin şifrelenme süreci","Sistemin güncellenme süreci","Sistemin başlatılma süreci"]'::jsonb, '["Sleep mode","Formatting","Shutting down","The process of starting the system"]'::jsonb, '["The process of backing up the system","The process of encrypting the data","The process of updating the system","The process of starting the system"]'::jsonb),
    ('029f0d92-fe88-4f88-89c8-bebd279771c2'::uuid, 0, '["Enlem ve boylam","Deniz yüksekliği","Komşu ülkeler","İklim tipi"]'::jsonb, '["Enlem ve boylam","Yer şekilleri ve akarsular","Sınır komşuları ve denizler","Yıllık yağış miktarı"]'::jsonb, '["Latitude and longitude","Height above sea level","Neighbouring countries","Climate type"]'::jsonb, '["Latitude and longitude","Landforms and rivers","Border neighbours and seas","Annual precipitation amount"]'::jsonb),
    ('a7f38015-0350-47c9-b074-715afcc10204'::uuid, 3, '["Stoke City","West Ham United","Aston Villa","Leicester City"]'::jsonb, '["Southampton","West Ham United","Crystal Palace","Leicester City"]'::jsonb, '["Stoke City","West Ham United","Aston Villa","Leicester City"]'::jsonb, '["Southampton","West Ham United","Crystal Palace","Leicester City"]'::jsonb),
    ('08a70e98-b7d9-4a2e-a7d5-1c956506fb8b'::uuid, 3, '["Barajdaki suyun rengini","Sudaki sıcaklık düzeyini","Göldeki balık sayısını","Üretilecek enerji miktarını"]'::jsonb, '["Barajdaki su seviyesinin mevsimlik değişimini","Türbin kanatlarının dönüş yönünü","Rezervuardaki tortu birikimi miktarını","Üretilecek enerji miktarını"]'::jsonb, '["The colour of the water","The temperature of the water","The number of fish","The amount of energy that can be produced"]'::jsonb, '["The seasonal variation of the reservoir water level","The direction in which the turbine blades rotate","The amount of sediment build-up in the reservoir","The amount of energy that can be produced"]'::jsonb),
    ('7489b7f7-16b1-40bf-9561-d0a91cd3a8f2'::uuid, 3, '["Geniş fırça darbeleriyle","Kazıyarak","Sıvayarak","Küçük renk noktalarıyla"]'::jsonb, '["İnce çizgi taramalarıyla","Mozaik taşlarıyla","Baskı kalıplarıyla","Küçük renk noktalarıyla"]'::jsonb, '["With broad brushstrokes","By scraping","By plastering","With small dots of colour"]'::jsonb, '["With fine hatching lines","With mosaic tiles","With printing blocks","With small dots of colour"]'::jsonb),
    ('8719303a-4d85-499c-bba9-450c47a0b4ac'::uuid, 2, '["Sayfa hızı","Renk düzeni","Şifreli bağlantı ve kimlik doğrulama","Veri yedeği"]'::jsonb, '["Sunucu yük dengeleme ve hız optimizasyonu","Alan adı kaydı ve DNS yönlendirme","Şifreli bağlantı ve kimlik doğrulama","Güvenlik duvarı ve sızma tespiti"]'::jsonb, '["Page speed","A colour scheme","An encrypted connection and authentication","A data backup"]'::jsonb, '["Server load balancing and speed optimisation","Domain name registration and DNS routing","An encrypted connection and authentication","A firewall and intrusion detection"]'::jsonb),
    ('64713ae1-cdc4-4a7c-83b1-5ba08bc2216a'::uuid, 2, '["Geleneği","Klasiği","Öncü ve yenilikçi tavrı","Akademiyi"]'::jsonb, '["Eski ustaların taklidini","Doğaya sadık gerçekçi tavrı","Öncü ve yenilikçi tavrı","Süsleme ve gösterişe düşkünlüğü"]'::jsonb, '["Tradition","The classical","A pioneering, innovative stance","The academy"]'::jsonb, '["Imitation of the old masters","A faithful, realistic approach to nature","A pioneering, innovative stance","A fondness for ornament and show"]'::jsonb),
    ('342e051d-8bcf-42f2-a5f9-e3cd93e32444'::uuid, 0, '["İşlemci ve bellek kullanımını","Boyutunu yalnızca","Fiyatını","Rengini"]'::jsonb, '["İşlemci ve bellek kullanımını","Ağ ve yazılım lisansı sayısını","Kod satırı ve dosya sayısını","Ekran çözünürlüğü ve renk derinliğini"]'::jsonb, '["Its processor and memory use","Only its size","Its price","Its colour"]'::jsonb, '["Its processor and memory use","Its network and software licence count","Its lines of code and file count","Its screen resolution and colour depth"]'::jsonb),
    ('73c850ea-4921-41b2-91ce-fdce98010611'::uuid, 0, '["Bağışıklık belleği oluşturarak","Doğrudan antikor vererek","Virüsü öldürerek","Kanı temizleyerek"]'::jsonb, '["Bağışıklık belleği oluşturarak","Kana hazır antikor aktararak","Vücuttaki mikropları doğrudan yok ederek","Alyuvar üretimini hızlandırarak"]'::jsonb, '["By building immune memory","By supplying antibodies directly","By killing the virus","By cleaning the blood"]'::jsonb, '["By building immune memory","By transferring ready-made antibodies","By directly destroying germs in the body","By speeding up red blood cell production"]'::jsonb),
    ('9caa3a10-4c39-4ab7-9b79-fd9c9618e88a'::uuid, 1, '["Arka aydınlatma zorunlu","Pikseller kendi ışığını üretir","Kalın olması","Renksiz olması"]'::jsonb, '["Sıvı kristal katman kullanır","Pikseller kendi ışığını üretir","Yalnızca dokunmatik çalışır","Sadece siyah beyaz gösterir"]'::jsonb, '["Backlighting is required","The pixels produce their own light","It is thick","It is colourless"]'::jsonb, '["It uses a liquid crystal layer","The pixels produce their own light","It works only by touch","It displays only black and white"]'::jsonb),
    ('c8a83f82-dd39-453b-89e0-e615f9416549'::uuid, 1, '["Joseph Lister","John Snow","Edward Jenner","William Farr"]'::jsonb, '["Thomas Sydenham","John Snow","Florence Nightingale","Robert Koch"]'::jsonb, '["Joseph Lister","John Snow","Edward Jenner","William Farr"]'::jsonb, '["Thomas Sydenham","John Snow","Florence Nightingale","Robert Koch"]'::jsonb),
    ('1c7a77f9-3403-4ee6-8363-2ed6276eea37'::uuid, 0, '["Gemilere yön ve itki sağlaması","Yolu kapatması","Fırtına yaratması yalnızca","Etkisiz olması"]'::jsonb, '["Gemilere yön ve itki sağlaması","Okyanus akıntılarının hızını kesmesi","Kıyı limanlarında tuz üretimini artırması","Pusula iğnesinin sapmasına yol açması"]'::jsonb, '["They gave ships direction and propulsion","They blocked the route","Only that they caused storms","They had no effect"]'::jsonb, '["They gave ships direction and propulsion","They slowed down ocean currents","They increased salt production in coastal ports","They caused compass needles to deviate"]'::jsonb),
    ('4325dd17-5ba7-40dd-8c1a-f832c75e9bba'::uuid, 0, '["Sıcak ve sığ deniz suyu","Soğuk derin su","Tatlı su","Tuzsuz su"]'::jsonb, '["Sıcak ve sığ deniz suyu","Soğuk ve derin okyanus suyu","Ilık ve tuzsuz nehir suyu","Serin ve çamurlu göl suyu"]'::jsonb, '["Warm, shallow sea water","Cold deep water","Fresh water","Water without salt"]'::jsonb, '["Warm, shallow sea water","Cold, deep ocean water","Lukewarm, salt-free river water","Cool, muddy lake water"]'::jsonb),
    ('30a2f3c9-cf99-4b74-91ce-aa2d2aed64ec'::uuid, 2, '["Eseri değiştirmek","Eseri boyamak","Eserin bozulmasını yavaşlatmak","Eseri taşımak"]'::jsonb, '["Eserin değerini artırmak","Eserin kopyasını üretmek","Eserin bozulmasını yavaşlatmak","Eserin sahibini belirlemek"]'::jsonb, '["Altering the work","Painting the work","Slowing the work''s deterioration","Moving the work"]'::jsonb, '["Raising the work''s value","Making copies of the work","Slowing the work''s deterioration","Identifying the work''s owner"]'::jsonb),
    ('6723db83-a6ff-4df5-944b-4fb418e92654'::uuid, 2, '["Boyutu","Ağırlığı","Algılayabildiği en küçük değişimi","Fiyatı"]'::jsonb, '["Ölçebildiği en yüksek değeri","Ölçüm sonucunun gerçek değere yakınlığını","Algılayabildiği en küçük değişimi","Tekrarlı ölçümlerde aynı sonucu verme düzeyini"]'::jsonb, '["Its size","Its weight","The smallest change it can detect","Its price"]'::jsonb, '["The highest value it can measure","How close its reading is to the true value","The smallest change it can detect","How consistently it gives the same result in repeated measurements"]'::jsonb),
    ('194717e6-e661-4eaf-99a6-4c8131865100'::uuid, 2, '["Konya","Edirne","İstanbul","Bursa"]'::jsonb, '["Ankara","Edirne","İstanbul","Manisa"]'::jsonb, '["Konya","Edirne","Istanbul","Bursa"]'::jsonb, '["Ankara","Edirne","Istanbul","Manisa"]'::jsonb),
    ('93d2a40c-1fd7-4905-9d9f-b9c560485e88'::uuid, 2, '["Doğa resmi yaparak","Portre yaparak","Tüketim imgelerini yineleyerek","Heykel dökerek"]'::jsonb, '["Manzara resmi yaparak","Soyut formlar çizerek","Tüketim imgelerini yineleyerek","Dini sahneler resmederek"]'::jsonb, '["By painting nature","By painting portraits","By repeating images of consumption","By casting sculpture"]'::jsonb, '["By painting landscapes","By drawing abstract forms","By repeating images of consumption","By depicting religious scenes"]'::jsonb);

do $$
declare v_n int; v_beklenen int := (select count(*) from _j_sik);
begin
  -- Yalnız hâlâ eski şıkları taşıyan satırlar (araya başka düzeltme girdiyse dur)
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where q.secenekler = s.eski_tr and q.dogru_cevap = s.dogru;
  if v_n <> v_beklenen then
    raise exception 'Şık ipucu parti 7: % sorudan % tanesi beklenen eski hâlde', v_beklenen, v_n;
  end if;

  insert into public.soru_surum (question_id, surum, soru, secenekler, dogru_cevap, degisiklik_notu)
  select q.id, q.surum, q.soru, q.secenekler, q.dogru_cevap, 'Şık ipucu düzeltmesi parti 7: yanlış şıklar yeniden yazıldı (003)'
    from public.questions q join _j_sik s on s.id = q.id;

  update public.questions q
     set secenekler = s.yeni_tr,
         supheli_isaretler = array_remove(q.supheli_isaretler, 'sik_ipucu_jev'),
         surum = q.surum + 1
    from _j_sik s
   where q.id = s.id;

  update public.question_translations t
     set secenekler = s.yeni_en
    from _j_sik s
   where t.question_id = s.id and t.dil = 'en' and s.yeni_en is not null and t.secenekler = s.eski_en;
  get diagnostics v_n = row_count;
  if v_n <> (select count(*) from _j_sik where yeni_en is not null) then
    raise exception 'Şık ipucu parti 7: EN çeviri % satır güncellendi, beklenen %', v_n, (select count(*) from _j_sik where yeni_en is not null);
  end if;

  -- Sonuç: yazılanlarda sik_ipucu_jev kalmamalı, ağır kural işareti olmamalı
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where 'sik_ipucu_jev' = any(q.supheli_isaretler) or q.supheli_agirlik >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2);
  if v_n > 0 then
    raise exception 'Şık ipucu parti 7: % soruda işaret/ağırlık kaldı', v_n;
  end if;
end $$;

select set_config('app.soru_elle_isaret_yaz', '', true);
