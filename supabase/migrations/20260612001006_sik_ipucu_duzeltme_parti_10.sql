-- ============================================================
-- 006 — Şık ipucu düzeltmesi, parti 10 (8 Eki 2026, Claude API)
--
-- 298'de Jev'in soru metnini görmeden doğru şıkkı > 0,8 güvenle bulduğu sorular
-- `sik_ipucu_jev` ile işaretlenip rekabetçi havuzdan çıkarılmıştı. Bu partide işaretli kolay/orta
-- (zorluk 1–3) sorulardan 25 tanesinin YANLIŞ şıkları Claude API (claude-sonnet-5-5) ile yeniden yazıldı;
-- soru metni, doğru cevap ve doğru şıkkın indeksi DEĞİŞMEDİ (match_answers.cevap indeksle tutulur, şık sırası karışmaz).
-- Yeni şıklar dört kapıdan geçti: soru_kural_isaretleri (ağırlık >= 2 işaret yok), Jev "soru olmadan"
-- testi (soru_denetim/kapi.mjs › sikIpucuTesti, doğru şıkka <= 0.75), Jev tek doğru cevap kontrolü ve
-- yanlış şık başına ayrı Claude hakem çağrısı (kesin_yanlis). Geçemeyen sorulara dokunulmadı, işaretli kalır.
-- EN çeviri: aynı indekslerle güncellenir (EN çevirisi olmayan soruda yalnız TR). Üretici: araclar/soru-temizlik/sik-ipucu-api.mjs --tam
-- Eski hâl: soru_surum (surum +1) ve araclar/soru-temizlik/sik-ipucu-duzeltme.csv.
-- Geri alma: node araclar/soru-temizlik/sik-ipucu-geri-al.mjs --parti 10   (önce prova)
-- ============================================================

-- Elle işaret (sik_ipucu_jev) tetikleyicide korunur; bilerek kaldırmak için (298):
select set_config('app.soru_elle_isaret_yaz', 'on', true);

create temp table _j_sik (id uuid primary key, dogru smallint, eski_tr jsonb, yeni_tr jsonb, eski_en jsonb, yeni_en jsonb) on commit drop;
insert into _j_sik values
    ('98d625c2-6fce-4e84-97fe-2a067c6adc90'::uuid, 1, '["Yükselen hava","Alçalıcı hava ve yüksek basınç","Bol yağış","Soğuk akıntı yokluğu"]'::jsonb, '["Yükselen sıcak hava ve alçak basınç","Alçalıcı hava ve yüksek basınç","Yoğun nem taşıyan muson rüzgârları","Güçlü okyanus akıntıları ve bulutluluk"]'::jsonb, '["Rising air","Subsiding air and high pressure","Abundant rainfall","The absence of cold currents"]'::jsonb, '["Rising warm air and low pressure","Subsiding air and high pressure","Moisture-laden monsoon winds","Strong ocean currents and heavy cloud cover"]'::jsonb),
    ('30b36388-e58a-400d-a45e-c1fd6d03bfe8'::uuid, 3, '["Enerji üretir","Sindirim yapar","Kemik yapar","Yabancı maddeyi tanıyıp etkisizleştirir"]'::jsonb, '["Oksijeni dokulara taşır","Kanın pıhtılaşmasını sağlar","Hormon salgılayıp büyümeyi düzenler","Yabancı maddeyi tanıyıp etkisizleştirir"]'::jsonb, '["Produces energy","Digests","Builds bone","Recognises and neutralises a foreign substance"]'::jsonb, '["Carries oxygen to tissues","Makes the blood clot","Secretes hormones to regulate growth","Recognises and neutralises a foreign substance"]'::jsonb),
    ('8378ac91-fe3f-48d5-a069-81f4e97dcb2e'::uuid, 0, '["Kalıtım bilgisini taşımak","Madde depolamak","Enerji üretmek","Hareket sağlamak"]'::jsonb, '["Kalıtım bilgisini taşımak","Proteinleri sentezlemek","Hücreyi dış etkenlerden korumak","Atıkları parçalamak"]'::jsonb, '["Carrying the hereditary information","Storing substances","Producing energy","Providing movement"]'::jsonb, '["Carrying the hereditary information","Synthesizing proteins","Protecting the cell from external factors","Breaking down waste"]'::jsonb),
    ('5c388bd8-912d-40af-8c64-85ef042a1109'::uuid, 1, '["İki ametal","Zıt yüklü iyonlar","İki metal","Nötr atomlar"]'::jsonb, '["İki ametal atomu","Zıt yüklü iyonlar","İki soygaz atomu","Nötr moleküller"]'::jsonb, '["Two non-metals","Oppositely charged ions","Two metals","Neutral atoms"]'::jsonb, '["Two non-metal atoms","Oppositely charged ions","Two noble gas atoms","Neutral molecules"]'::jsonb),
    ('68b55ef0-d00b-45d9-9254-cb6794417303'::uuid, 2, '["Işık","Tuz","Oksijen ve nem","Sadece sıcaklık"]'::jsonb, '["Karbondioksit ve kuru hava","Azot ve ışık","Oksijen ve nem","Hidrojen ve soğuk"]'::jsonb, '["Light","Salt","Oxygen and moisture","Heat alone"]'::jsonb, '["Carbon dioxide and dry air","Nitrogen and light","Oxygen and moisture","Hydrogen and cold"]'::jsonb),
    ('542b1393-e0fb-4fbd-b959-a2167d44fce0'::uuid, 1, '["Kır nüfusunun artışını","Kent nüfusunun payının artışını","Ölüm oranını","Doğum oranını"]'::jsonb, '["Tarım arazilerinin payının artışını","Kent nüfusunun payının artışını","Kişi başına düşen gelirin artışını","Sanayi üretiminin payının artışını"]'::jsonb, '["A rise in the rural population","A rise in the share of the urban population","The death rate","The birth rate"]'::jsonb, '["A rise in the share of farmland","A rise in the share of the urban population","A rise in per capita income","A rise in the share of industrial output"]'::jsonb),
    ('cf3ad4e4-15f9-4041-8cdb-92c235dd9047'::uuid, 1, '["Kira artışı","Depreme dayanıklı yapılaşma","Nüfus planlaması","Arsa satışı"]'::jsonb, '["Kentsel dönüşüm finansmanı","Depreme dayanıklı yapılaşma","Yangına karşı sigorta güvencesi","Su kaynaklarının korunması"]'::jsonb, '["Rent increases","Earthquake-resistant construction","Population planning","Land sales"]'::jsonb, '["Urban renewal financing","Earthquake-resistant construction","Fire insurance coverage","Protection of water resources"]'::jsonb),
    ('935aa019-5de0-4ab0-9d70-8ad1e8e05eb6'::uuid, 2, '["Tarıma","Turizme","Kaynak ve yeni deniz yollarına","Sanayiye"]'::jsonb, '["Verimli tarım arazilerine ve sulama kaynaklarına","Yoğun nüfus ve büyük kentlere","Kaynak ve yeni deniz yollarına","Gelişmiş sanayi ve imalat merkezlerine"]'::jsonb, '["Farming","Tourism","Resources and new sea routes","Industry"]'::jsonb, '["Fertile farmland and irrigation sources","Dense population and large cities","Resources and new sea routes","Advanced industry and manufacturing centers"]'::jsonb),
    ('33b1274a-18d2-49e4-8977-4c79e2426251'::uuid, 0, '["Fırat ve Dicle","Nil ve Kongo","Ganj ve İndus","Tuna ve Ren"]'::jsonb, '["Fırat ve Dicle","Amu Derya ve Sir Derya","Ganj ve İndus","Tuna ve Ren"]'::jsonb, '["The Euphrates and the Tigris","The Nile and the Congo","The Ganges and the Indus","The Danube and the Rhine"]'::jsonb, '["The Euphrates and the Tigris","The Amu Darya and the Syr Darya","The Ganges and the Indus","The Danube and the Rhine"]'::jsonb),
    ('1467e65c-a86b-469f-9bf4-dc520d66d8fd'::uuid, 1, '["Nötron sayısını","Proton sayısını","Kütle numarasını","Elektron kabuğunu"]'::jsonb, '["Nötron sayısını","Proton sayısını","Atom yarıçapını","Değerlik enerjisini"]'::jsonb, '["The number of neutrons","The number of protons","The mass number","The electron shell"]'::jsonb, '["The number of neutrons","The number of protons","The atomic radius","The valence energy"]'::jsonb),
    ('a8a6c5ac-0587-4bce-8e73-f53419ced9d6'::uuid, 3, '["Yağmurun donmasıyla","Karın erimesiyle","Sisin dağılmasıyla","Su buharının doğrudan buza dönüşmesiyle"]'::jsonb, '["Soğuk havada yağmur damlalarının yere düşerken donmasıyla","Kar tanelerinin güneşte erimesiyle","Bulutlardaki su damlacıklarının sürekli yükselmesiyle","Su buharının doğrudan buza dönüşmesiyle"]'::jsonb, '["Rain freezing","Snow melting","Fog dispersing","Water vapour turning directly into ice"]'::jsonb, '["Raindrops freezing as they fall through cold air","Snowflakes melting in the sunshine","Water droplets in clouds rising continuously","Water vapour turning directly into ice"]'::jsonb),
    ('83ab453f-8ab0-47b7-a703-92531f87e0bb'::uuid, 2, '["Kuvvet çarpı alan","Kütle çarpı hız","Kuvvet bölü alan","Alan bölü kuvvet"]'::jsonb, '["Kuvvet çarpı mesafe","Kütle çarpı hız","Kuvvet bölü alan","Kütle bölü hacim"]'::jsonb, '["Force times area","Mass times speed","Force divided by area","Area divided by force"]'::jsonb, '["Force times distance","Mass times speed","Force divided by area","Mass divided by volume"]'::jsonb),
    ('87157843-e246-498a-b88c-072714b96a6f'::uuid, 3, '["Tamamen kumlu olması","Tamamen killi olması","Taşlı olması","Su tutma ve havalanma dengesi"]'::jsonb, '["Yüksek tuz oranı ve kuraklığa dayanımı","Organik madde ve kireç içermemesi","Rüzgar erozyonuna tamamen kapalı olması","Su tutma ve havalanma dengesi"]'::jsonb, '["It is entirely sandy","It is entirely clay","It is stony","It balances water retention and aeration"]'::jsonb, '["Its high salt content and drought resistance","Its lack of organic matter and lime","Its complete immunity to wind erosion","It balances water retention and aeration"]'::jsonb),
    ('7a2121a1-7a9d-4dec-a9a5-09fcf7bd7a28'::uuid, 1, '["Estetik","Araç güvenliği ve tırmanma kapasitesi","Maliyet yalnızca","Manzara"]'::jsonb, '["Trafik yoğunluğunun azaltılması","Araç güvenliği ve tırmanma kapasitesi","Yol çizgilerinin daha net görünmesi","Sürücülerin yolculuk süresini uzatması"]'::jsonb, '["Aesthetics","Vehicle safety and climbing ability","Cost alone","The view"]'::jsonb, '["Reducing traffic density","Vehicle safety and climbing ability","Making road markings more visible","Lengthening drivers'' travel time"]'::jsonb),
    ('4810ad81-e305-40b8-bb38-22223444b58d'::uuid, 1, '["Daha çok atık","Daha az sera gazı","Daha çok kirlilik","Daha çok kömür"]'::jsonb, '["Daha çok su tüketimi","Daha az sera gazı","Daha çok toprak erozyonu","Daha çok ses kirliliği"]'::jsonb, '["More waste","Fewer greenhouse gases","More pollution","More coal"]'::jsonb, '["More water consumption","Fewer greenhouse gases","More soil erosion","More noise pollution"]'::jsonb),
    ('fbf516eb-b8fb-4b3d-b69d-26c60b414bef'::uuid, 0, '["Kuala Lumpur","Penang","Johor Bahru","Ipoh"]'::jsonb, '["Kuala Lumpur","Kuching","Putrajaya Limanı","Malakka"]'::jsonb, '["Kuala Lumpur","Penang","Johor Bahru","Ipoh"]'::jsonb, '["Kuala Lumpur","Kuching","Port Putrajaya","Malacca"]'::jsonb),
    ('63c4c7e9-d428-453f-96fa-be2c9e9690d7'::uuid, 2, '["Suyun sıcaklığını","Yatağın genişliğini","Debinin yıl içindeki değişimini","Kaynağın yüksekliğini"]'::jsonb, '["Suyun yıllık toplam taşıdığı tortu miktarını","Yatağın denize doğru eğim değişimini","Debinin yıl içindeki değişimini","Havzanın yıllık yağış miktarındaki değişimi"]'::jsonb, '["The temperature of the water","The width of the channel","The variation in discharge through the year","The height of the source"]'::jsonb, '["The total amount of sediment it carries per year","The change in slope of the channel toward the sea","The variation in discharge through the year","The variation in annual precipitation of the basin"]'::jsonb),
    ('f812d3e2-f458-4879-b491-17af5ebcc3ed'::uuid, 3, '["Erozyonun bitmesi","Verimin artması","Depremin azalması","Sel riskinin artması"]'::jsonb, '["Kuraklığın azalması","Toprağın verimlenmesi","Rüzgâr hızının düşmesi","Sel riskinin artması"]'::jsonb, '["Erosion stops","Yields rise","Earthquakes lessen","Flood risk rises"]'::jsonb, '["Drought decreases","Soil becomes fertile","Wind speed drops","Flood risk rises"]'::jsonb),
    ('4164202b-68a7-4c31-9af3-9cc16762fe8a'::uuid, 0, '["Su kaynaklarının kirlenmesi","Toprağın zenginleşmesi","Verimin sürekli artması","Erozyonun bitmesi"]'::jsonb, '["Su kaynaklarının kirlenmesi","Yağış miktarının azalması","Rüzgâr hızının artması","Deniz seviyesinin yükselmesi"]'::jsonb, '["Pollution of water sources","Enrichment of the soil","A permanent rise in yield","The end of erosion"]'::jsonb, '["Pollution of water sources","A decrease in rainfall","An increase in wind speed","A rise in sea level"]'::jsonb),
    ('42267fe4-f719-40e3-b977-9528417bc4d2'::uuid, 0, '["Zengin balık alanları ve sis","Çöl koşulları","Buzul kütlesi","Volkanik ada"]'::jsonb, '["Zengin balık alanları ve sis","Kuvvetli kasırga ve kuraklık","Kalın buz örtüsü ve don","Geniş mercan resifleri ve lagünler"]'::jsonb, '["Rich fishing grounds and fog","Desert conditions","An ice sheet","A volcanic island"]'::jsonb, '["Rich fishing grounds and fog","Strong hurricanes and drought","Thick ice cover and frost","Wide coral reefs and lagoons"]'::jsonb),
    ('80649baa-33fa-4e51-985b-9e614789f7bb'::uuid, 0, '["Kıyı yapılaşması ve plastik","Soğuk hava","Yağış","Rüzgâr"]'::jsonb, '["Kıyı yapılaşması ve plastik","Mercan resiflerinin doğal beyazlaması","Gelgit saatlerinin değişmesi","Deniz suyunun tuzluluk farkı"]'::jsonb, '["Coastal development and plastic","Cold weather","Rainfall","Wind"]'::jsonb, '["Coastal development and plastic","Natural bleaching of coral reefs","Changing tide times","Differences in sea water salinity"]'::jsonb),
    ('2c0d8712-80b5-4a74-99c8-ca54419a3078'::uuid, 3, '["Tarımın çöktüğünü","Nüfusun azaldığını","Toprağın verimsizleştiğini","Sanayi ve hizmetin geliştiğini"]'::jsonb, '["Nüfusun hızla yaşlandığını","Dış ticaretin azaldığını","Kentlerden köylere göçün arttığını","Sanayi ve hizmetin geliştiğini"]'::jsonb, '["That agriculture has collapsed","That the population has fallen","That the soil has become infertile","That industry and services have developed"]'::jsonb, '["That the population is ageing rapidly","That foreign trade has declined","That migration from cities to villages has increased","That industry and services have developed"]'::jsonb),
    ('04f9d1ec-378f-4542-9543-53e2cff2ddd8'::uuid, 3, '["Sürekli akan soğuk pınar","Sönmüş bir volkan konisi","Buzul üstü derin çatlak","Aralıklı sıcak su fışkırması"]'::jsonb, '["Sürekli akan soğuk pınar","Yeraltındaki geniş kireçtaşı mağarası","Buzul üstü derin çatlak","Aralıklı sıcak su fışkırması"]'::jsonb, '["A permanently cold spring","A volcanic cone","A glacial crevasse","An intermittent eruption of hot water"]'::jsonb, '["A permanently cold spring","A large underground limestone cave","A glacial crevasse","An intermittent eruption of hot water"]'::jsonb),
    ('11dc8bd6-af5e-44be-8b1b-74af64c95bae'::uuid, 3, '["Geri dönüşüm yapma","Fırında yakıp yok etme","Düzenli depolama","Önleme ve azaltma"]'::jsonb, '["Geri dönüşüm ve ayrıştırma","Enerji geri kazanımı","Düzenli depolama","Önleme ve azaltma"]'::jsonb, '["Recycling","Incineration","Landfill","Prevention and reduction"]'::jsonb, '["Recycling and sorting","Energy recovery","Landfill","Prevention and reduction"]'::jsonb),
    ('8e9ec970-c2f2-4d24-91f2-063230934769'::uuid, 1, '["Yağışlı","Açık ve durgun","Sisli hep","Fırtınalı"]'::jsonb, '["Bulutlu ve nemli","Açık ve durgun","Rüzgârlı ve sağanaklı","Kapalı ve serin"]'::jsonb, '["Rainy","Clear and settled","Always foggy","Stormy"]'::jsonb, '["Cloudy and damp","Clear and settled","Windy and showery","Overcast and cool"]'::jsonb);

do $$
declare v_n int; v_beklenen int := (select count(*) from _j_sik);
begin
  -- Yalnız hâlâ eski şıkları taşıyan satırlar (araya başka düzeltme girdiyse dur)
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where q.secenekler = s.eski_tr and q.dogru_cevap = s.dogru;
  if v_n <> v_beklenen then
    raise exception 'Şık ipucu parti 10: % sorudan % tanesi beklenen eski hâlde', v_beklenen, v_n;
  end if;

  insert into public.soru_surum (question_id, surum, soru, secenekler, dogru_cevap, degisiklik_notu)
  select q.id, q.surum, q.soru, q.secenekler, q.dogru_cevap, 'Şık ipucu düzeltmesi parti 10: yanlış şıklar yeniden yazıldı (006)'
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
    raise exception 'Şık ipucu parti 10: EN çeviri % satır güncellendi, beklenen %', v_n, (select count(*) from _j_sik where yeni_en is not null);
  end if;

  -- Sonuç: yazılanlarda sik_ipucu_jev kalmamalı, ağır kural işareti olmamalı
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where 'sik_ipucu_jev' = any(q.supheli_isaretler) or q.supheli_agirlik >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2);
  if v_n > 0 then
    raise exception 'Şık ipucu parti 10: % soruda işaret/ağırlık kaldı', v_n;
  end if;
end $$;

select set_config('app.soru_elle_isaret_yaz', '', true);
