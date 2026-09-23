-- Şerit S1 — "Şıklar cevabı ele veriyor" (Jev, soru metni gizli) → rekabetçi havuzdan çıkar
--
-- ÖLÇÜM (araclar/jev-tarama/sik-ipucu.md, 23 Eyl 2026): Jev'e yalnız dört şık (karışık) verildi,
-- soru metni verilmedi. 11.540 aktif sorunun 1.310'unda (%11,4) Jev doğru şıkkı > 0,8 olasılıkla
-- buldu — oyuncu soruyu okumadan kazanabiliyor. Liste: araclar/jev-tarama/sik-ipucu.csv (sorunlu=1).
--
-- Mekanizma, "şık uzunluğu" kuralıyla (227) AYNI: işaret supheli_isaretler'e yazılır,
-- ağırlığı 2 → soru_rekabetci_haric_agirlik (2) eşiğine ulaşır → denetim_durumu 'bekliyor'
-- iken soru_sec / duello_soru_bul / turnuva_soru_sec onu seçmez. Veri silinmez, soru aktif kalır;
-- app.soru_havuzu = 'serbest' olan yol (bugün yalnız calisma_baslat = Hatalarım) seçebilir.
--
-- FARK: bu işaret SQL kuralından türemez (Jev ölçümü), dışarıdan "elle" konur. Eski tetikleyici
-- (trg_soru_kural_isaret) soru/secenekler/dogru_cevap güncellenince supheli_isaretler'i
-- YALNIZ kural sonucuyla ezip elle işareti silerdi. Burada:
--   * soru_elle_isaret_mi(i): kuraldan türemeyen, korunacak işaretlerin tek listesi.
--   * Tetikleyici kural işaretlerini yeniden hesaplar, elle işaretleri NEW ∪ OLD'dan korur.
--   * Tetikleyici artık supheli_isaretler / supheli_agirlik doğrudan yazılınca da çalışır:
--     227'deki gibi "tüm havuzu yeniden tara" güncellemesi de elle işareti silemez,
--     ağırlık da her zaman işaretlerle tutarlı kalır.
--   * Bilerek kaldırmak için aynı transaction'da:
--       select set_config('app.soru_elle_isaret_yaz', 'on', true);
--     o zaman elle işaretler yalnız NEW'dan alınır (array_remove ile silinebilir).
-- Denetimden geçen soru ('duzeltildi'/'onaylandi') zaten 'bekliyor' dışlamasından çıkar;
-- bu yüzden soru:iceri kapısı (araclar/soru_denetim/kapi.mjs) Jev şık testini yazmadan ÖNCE yapar.

-- ---------- Ağırlık ----------
create or replace function public.soru_isaret_agirligi(p_isaret text)
 returns smallint language sql immutable
as $$
  select (case p_isaret
    when 'sik_sayisi' then 3 when 'ayni_sik' then 3 when 'celiski' then 3 when 'ters_anahtar' then 3
    when 'cevap_sizmasi' then 2 when 'hepsi_hicbiri' then 2 when 'dusuk_dogruluk' then 2
    when 'dogru_en_uzun' then 2 when 'dogru_coklu_kelime' then 2
    when 'sik_ipucu_jev' then 2
    when 'sayisal_uc' then 1 when 'yakin_varyant' then 1 when 'kategori_carpik' then 1
    else 1 end)::smallint;
$$;

-- ---------- Elle (kural dışı) işaretler ----------
create or replace function public.soru_elle_isaret_mi(p_isaret text)
 returns boolean language sql immutable
as $$
  select p_isaret in ('sik_ipucu_jev');
$$;

grant execute on function public.soru_elle_isaret_mi(text) to service_role;
revoke all on function public.soru_elle_isaret_mi(text) from public, anon, authenticated;

-- ---------- Tetikleyici: kural yeniden hesaplanır, elle işaret korunur ----------
create or replace function public.trg_soru_kural_isaret()
 returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  v_kural text[] := public.soru_kural_isaretleri(new.soru, new.secenekler, new.dogru_cevap);
  v_elle text[];
begin
  select coalesce(array_agg(distinct i order by i), '{}') into v_elle
    from unnest(
      coalesce(new.supheli_isaretler, '{}')
      || case when tg_op = 'UPDATE'
                   and coalesce(current_setting('app.soru_elle_isaret_yaz', true), '') <> 'on'
              then coalesce(old.supheli_isaretler, '{}') else '{}'::text[] end
    ) i
   where public.soru_elle_isaret_mi(i) and not (i = any(v_kural));
  new.supheli_isaretler := v_kural || v_elle;
  new.supheli_agirlik := coalesce((select max(public.soru_isaret_agirligi(i)) from unnest(new.supheli_isaretler) i), 0);
  return new;
end $$;

drop trigger if exists trg_questions_kural_isaret on public.questions;
create trigger trg_questions_kural_isaret
  before insert or update of soru, secenekler, dogru_cevap, supheli_isaretler, supheli_agirlik
  on public.questions
  for each row execute function public.trg_soru_kural_isaret();

-- ---------- 1.310 sorunun işaretlenmesi ----------
-- Hepsi 23 Eyl 2026'da var ve aktifti (ölçüldü). Artık yoksa sessizce atlanır; aktif olmayan
-- da işaretlenir (yeniden açılırsa ipucuyla rekabetçi havuza dönmesin).
do $$
declare
  v_ids uuid[] := array[
    '001b9805-7f4e-4375-b17a-fb11fd8feacf', '003e2733-e66c-4c32-96ed-f43b8373028f', '00a20e91-ffae-4f83-b8e2-470df21e55f9', '00c4a92f-87cf-4233-8a2d-e63f88df4aaa',
    '00dea4dc-9d81-42ff-bd83-7f82364c1362', '0117c539-60e1-4012-8c8f-083ec59b5d00', '014d42fc-f76d-4402-a3f3-ec41188a9c3a', '01b2e965-5dbe-4fe0-b685-26e7ff60804a',
    '0200a1b0-aed3-47c6-8f42-e024372eaae2', '0204b92e-9d90-44e1-b034-9d61d64a14bd', '02068961-92cd-417c-abca-2b9310839dde', '021edc4f-a7ac-4097-9ccf-46e8866e7ead',
    '02446ee1-8d88-4d2b-b0cb-c4bcc6e3f220', '029f0d92-fe88-4f88-89c8-bebd279771c2', '02a58ee6-b919-4d9e-aa8c-4e4dbfa725c7', '02d9938f-a89c-4385-a424-f5c1e6c68628',
    '0325ecc8-dced-4940-abe4-64dacc37c09e', '035a7aed-083f-4316-92c0-1b787a800c4e', '0363541a-d2b1-4c97-bca3-34a9c185721a', '03728bcd-eb39-42c6-93fd-fb996315aaa4',
    '03c5f568-128a-4d9e-8623-22f3f42a4de6', '03f438d1-e7b0-49ee-9120-6ba07e0ac129', '03fd172c-2442-4cb5-bf02-de1240644053', '0401298b-47ba-4dd7-b37b-f8ec08d87df6',
    '042ed2c6-0aef-4ffb-aebe-5ce5ddc8688d', '043c15de-094d-45bb-a768-968ec9b805c5', '046232e7-0010-43a5-ab0a-5848b7db8cd6', '046b138a-1728-49fe-8538-98e95a8147d9',
    '04a4a123-5567-49bf-ac1f-b546605eb172', '04f9d1ec-378f-4542-9543-53e2cff2ddd8', '050a6c17-c8bc-4a83-8f9a-13088a46cb99', '052f6554-51d4-48aa-a497-616933814e1c',
    '05545294-d1ee-4ada-9280-189544194810', '05719bd9-4fea-4aaa-b16f-bf255bf1a2f9', '05a49262-66bf-4d20-9188-15b0e5975267', '05b899d3-8120-4c67-a228-8bcdd404d129',
    '05d350fd-0554-4324-b650-6ff8035966a3', '05f8db14-35de-4ee6-8c94-01ad0d438ae1', '06822b70-cd2b-4b8c-aaa9-2073d2f1b01f', '0684b1db-6738-496e-bd8f-59b4d116b37c',
    '06a64086-5099-4a4b-9a28-6eabf23c19f3', '06d2d84e-9314-4666-b731-873d237b7293', '06e54827-3198-4b85-a8a7-2685f6c855e2', '0720fd75-9537-47b6-9d0b-458dbbdd4ff9',
    '0746cdb8-f7ba-4e72-86fd-8fbb01bc31e7', '07a52aa9-3aea-4077-a953-cab3b84846cd', '07bc0aea-2a94-4a66-b43a-5d005ce6f047', '07dbd3b9-e201-4928-a82b-83686e64f8ce',
    '07ef6ff0-d7b3-4405-a3f2-f2cafa160133', '0803b55a-8fa8-4719-92d6-ea068f42ab93', '0819f7c4-df4c-415b-a70c-88a43097025f', '084d67f7-631d-49c0-8033-639a0edfc49f',
    '08a70e98-b7d9-4a2e-a7d5-1c956506fb8b', '08d54b04-1a9b-4719-afe7-ce970ce92521', '091ae603-f917-45de-a3c7-dac444b2aa1d', '0940b25f-70cc-4c5f-a8f9-fa9ca3eddd8a',
    '0951944b-ac0c-4510-915f-3c80b4c060d8', '09df7b99-bc53-476e-b9b9-d0e46038b018', '09f6db66-8788-4452-b05a-35428ee201eb', '0a0ab7b3-5e35-4438-8807-21e797210b83',
    '0a21f6f8-489a-43f1-8735-e174a7b7d597', '0a46d4aa-37a1-4752-af2f-1c95796ad80e', '0a5e9518-8cfd-4d10-b03d-8bdc78646544', '0a6192f5-1e47-4fbd-a980-68ae68c4e58d',
    '0a739a91-9ad4-438e-add6-c9f3b753eb4a', '0a714bd0-3b18-437a-9182-8cdeee15c820', '0adf570d-06a9-4e87-806a-e333cff71276', '0b2160a3-60cc-44e5-84cc-6ef4f7bc5767',
    '0b633087-bb45-46a3-81ec-452c6bf1113b', '0ba7719f-d597-4670-9b0d-37301df4fb37', '0bcc81ec-69db-4537-b61e-e8a40f3236e2', '0c11330b-fee2-4639-a403-6289a1f51dbb',
    '0c26afe8-71a2-46e0-b805-e235c85d442e', '0c360825-7f89-4537-94a1-2eb7e91851c4', '0d596711-117c-4741-8021-7803aa0379a0', '0d7c3c67-3807-4b9a-a13b-bdb90bf51746',
    '0d7e57a9-21dc-4868-a529-41e4b5260088', '0d9cda0e-904d-4858-aaef-4e4224b415b2', '0dbd1339-99a2-4635-882a-506f3b161e14', '0df1d1e5-4c64-484a-8947-936d0e32e039',
    '0e497c85-1a87-4892-9bc3-fdbc57693c66', '0e8e7e43-8cdd-4510-8234-0e7b96f189b8', '0eec5397-1007-4650-b0c3-015ee18faee4', '0f5fec72-b15b-4490-bc49-9e5adf691853',
    '0f67c1fd-f0fd-42bf-97de-b70c0a316b4c', '0f95abdc-acf2-428c-9f23-bdd1c211e6da', '0f972905-6b4e-4d9f-b6e8-026c0ca9bb7e', '0fef7aab-1a32-4187-b998-2534e8704b12',
    '0ffd8ab0-5278-4b1d-996d-be4a5b86e02e', '1000ab93-b4dc-487d-8c1b-70cc2aa11345', '101dcf9d-d583-41e2-af45-694dadb88d54', '10c8ee06-6647-4b5a-8373-fb3df8ec2eec',
    '10d0b8a6-d1ce-4100-aee8-cf2255b9b364', '114ced14-abf2-4e33-af5c-6331408da9d5', '11dc8bd6-af5e-44be-8b1b-74af64c95bae', '126d3ee9-2555-48b1-a20a-7ff05c2eb41a',
    '126fd8f5-8a59-4316-aaf0-fcb7f0f440bc', '12871e4e-22cb-4bb9-9764-e564e32cd9a9', '12b65a6c-8e45-4794-a246-a613b144a533', '1301df43-eb12-49fe-8add-addf48753458',
    '131f1408-fb4e-4138-a58b-0670c6ca2b0b', '134fa573-39d0-49b1-aa67-bbafe3475e31', '135a7f18-5866-4ab0-a04f-9fd8410682bf', '137dc199-d674-4d32-988a-853c85d50839',
    '140d9248-b870-4b84-9559-dc046ea76348', '142e7b46-be82-4a14-9c2f-5af0062f4fd4', '1441c3ee-72bb-4476-a33a-3833c728ceec', '145a2541-2f5d-4155-ad4c-28140448a5d5',
    '1467e65c-a86b-469f-9bf4-dc520d66d8fd', '146a8139-ba9e-4af1-b78e-aeb370e5a240', '148c9a31-1863-4ca2-94dd-46787249e960', '1497cafe-77ad-490b-ae43-98a7ed823b1f',
    '14f45cc7-4256-4bf9-aa32-c990b6226beb', '1517ae79-9e8c-494c-8be1-1518779b947c', '1516c00b-b3d7-45d8-afb2-528dd17ec412', '151ee83f-d710-4c41-a1f6-3117fb65bfe8',
    '15933bf4-d8a2-4c51-afa0-f9afeab7dc87', '15c77a4e-7fa6-4f36-b18f-9523185a41b3', '15cf018d-118c-465c-9c40-cd59b5be5101', '1609a497-0d94-425b-8d6a-4c01bdde486c',
    '1614bf3a-7929-4703-ba50-503bc278f833', '16195fba-96a7-4ca3-9dd3-79fb864a6564', '1677dad7-300f-4afd-a83c-6a53f06a0faf', '16d9b6fc-a8bf-4772-b40d-51e86ea0c4c8',
    '17132ccb-5753-47ef-b665-3ced3efeccee', '171440b1-d2fa-4f86-8644-3e5a5c827dca', '174b3850-a680-4b80-b1d6-fb88fdd903bb', '175acbaa-815c-4ed3-b8c1-267bff8c5ea9',
    '1764f3b0-00ec-4110-ae54-f41d7107280e', '17d6cc39-5b6c-4206-b508-c931db0f4355', '18116f38-5708-4a90-9fc2-d0dfc39cf0c0', '1829a753-86f7-4cbd-90d7-39a58fa69a32',
    '183e764e-31ac-4ca1-ae4d-e71e5d50a605', '18b43af8-f022-4c71-99f9-79fd028cc409', '194717e6-e661-4eaf-99a6-4c8131865100', '194d67e3-5394-4d50-adf1-30787fb212fc',
    '197fb2e6-9af4-4e6a-ab3e-4518c893f766', '198bc500-a569-46b5-bff7-6ccc7b9a5dc0', '19923f04-e4ab-4428-84bc-5c6f287f1c25', '19b62228-2a73-4f7a-821e-500411f6646a',
    '1a26fba0-3aff-4172-ae4d-c1486d1952a9', '1a27b68f-8244-458e-aff4-760e346e5fa7', '1a388151-84aa-4548-a7bf-c477391c831d', '1a67fc51-6a9e-4e5d-a821-213094b0c5bd',
    '1a72a20a-95e0-42c5-a6b9-2d8438830847', '1a7da5c1-4d20-42f0-a1e4-69d7f4593337', '1a88c007-f00f-440d-9241-0792a589c20b', '1a919dec-a419-4ae0-86d1-0eef81870dba',
    '1a9f3d4f-27b5-4aa4-b1d8-ed4323d77909', '1aa8d792-3184-45af-addf-f21f2a2cc994', '1b234866-578e-4ae6-b154-7e20613b9110', '1b454fb2-912e-4d11-a79a-76deb12cdfed',
    '1bb3604d-457e-4deb-aeb9-af45712d0f86', '1bb59c0d-c1d3-4507-9fc4-95d1ee5420cc', '1c25362e-4d2e-45b4-a700-c7fd59c0e9e0', '1c615d49-c408-4a3a-81f9-db1758fe57d2',
    '1c7a77f9-3403-4ee6-8363-2ed6276eea37', '1c8783db-89b2-4a1a-ab9d-4c63e7cc22d3', '1c9c3343-ea13-40ec-89ce-86ce4953d252', '1cbf721b-faee-4219-852e-09b167aa015a',
    '1cf64cac-e726-44a4-b175-caf181a5572c', '1cf67ef7-8fd4-4449-b5fe-d200408e9de9', '1d49ac59-3746-4f23-b3c1-8201fad9b64e', '1d53a228-56c9-48e9-a129-681ed3288150',
    '1d96ffa9-17b9-43f8-8bfe-7ae31956d1ab', '1da6da91-a6cd-42b0-90d9-d3ff7a2289f3', '1e02a2fe-e2a3-4eb9-ba43-cc17e1c2c72a', '1e0f59cb-ac63-4b1f-b1cf-f35653490804',
    '1e30ac1f-9d5b-468a-9171-0b0043b3b1a1', '1e562adc-9838-4830-8352-3a81f4b68b97', '1e5c22a3-b351-435f-aa19-d026dc9f03e9', '1e66253a-6413-4e80-ba1d-c02d5ddbc38f',
    '1eb8153d-ac24-44a9-b6a8-4879e592e9eb', '1eb498df-c500-45fb-8181-4da35c5f9d49', '1ec0027b-5f04-4e02-a7aa-9ce087aa1947', '1f101dcc-c6a6-44e2-8dff-f96790588f86',
    '1f2ab939-e7ad-40e7-852c-95035f3681e2', '1f64a3de-5ad2-4e92-a280-670c97fc9f87', '1f7b398f-44d6-4fcc-8541-ce7834e5c0a4', '1f8484f1-f7d3-4680-b7ff-4fa14a9f5c4f',
    '1f8de820-68b6-47bf-bf7e-ecef416d565a', '1f97508b-ce5f-4f55-8dbf-9612d717ff04', '1fb65cc8-4889-476a-b873-1384eb58ba95', '1feb8c8f-1e33-45d1-81d1-f3b54a802c6a',
    '20071084-7e5a-4397-a51e-606df9bd092a', '201e6a79-6c32-4926-9322-a14d7c90bf13', '20313230-ac17-46a0-affd-e3ce4e185b19', '205a64e1-984c-4d40-8e36-fc293a25e749',
    '20860c11-8b8b-40d9-b2d6-43e3d387a040', '20efc089-c01d-475b-b4a3-6c0333432e6b', '21426d58-cdce-427f-a7e8-3bb0ccc474d5', '215a679c-9923-4f09-aefb-a7bbddcb5da6',
    '216f24a8-562e-4ca7-9a9e-e2247d05b046', '216edb98-34f5-456f-b75e-8d6006aad510', '21a397db-d5b9-454e-8816-d4bc294ff845', '21be54fa-9a8f-4ad2-b915-7df2bce1aa67',
    '21c10ce5-57f8-45fa-b76e-e38210ea22ba', '21e84a8d-d75d-4f34-8931-4343c7b9014a', '2201afce-43ce-46ef-8202-01f0db44ee54', '22a10f3f-8bdf-4328-9371-53764625bb36',
    '22ba732e-7570-4610-843b-ea300970cab0', '22cff7a1-62cb-484e-b869-b7162385e356', '2313ea53-dd97-420b-b776-0a31f706b8a0', '2317fff0-9298-46e9-b488-04e34c9f7607',
    '235f8375-cf29-4f8e-8f8a-f7f69a6653a0', '2389706c-29f9-40a6-908d-616863a0c018', '23da29c3-2838-4776-81f7-fd283c58457a', '2416da4a-05de-4d31-9c57-be0c5dfcc33d',
    '242dd6a8-0dda-45e3-a2c3-5073b95a836f', '244adf5b-a485-4207-9ee8-da73b4bf0b47', '246f3f09-254c-48f4-9618-2ec520b54b1a', '248b8d0f-b762-4a5e-893b-6e3da346bff5',
    '249bbf50-802f-4b6b-9fad-8a6c859b0f03', '24a0ecde-9246-4a9a-b3a3-34fb4a17a3fc', '24b66787-9ee6-4e80-a61d-f19d6ae6318b', '24bc2683-223f-4c93-9c05-276e2c4ff7d9',
    '255dfd17-fd7d-4880-8f41-c53c723c7710', '25a9bab6-0060-49ed-9e23-82a80797163f', '25e4f2dc-88f5-4456-882e-3bc922c4ba11', '2609c35c-1aa9-4c9f-a400-6bf1eb5b7ec2',
    '260f2807-4a86-43d6-8602-01b56c8cb2b9', '2657ee35-c8b5-4bcf-8d47-1aa59b346769', '265c8c70-70cc-42fa-a3ec-2f6872b6f3f1', '265f066d-b881-4246-ad1e-6b480b08718b',
    '2673cc3b-31bd-4f8a-9b87-dd4136462980', '268e4d85-0d5e-45f4-bd1d-93c5daec0b46', '26aeeb6e-dcb9-48f0-801e-cbd819793e60', '26b701ec-e114-4b0d-a507-f224baf2f8d5',
    '26bdc79e-1a92-4c3f-a178-8baee4a1cc11', '26d365cf-bbae-4e9d-8f96-6eb53a2e63e7', '26fffc32-81b6-453a-9594-63e72f9608cf', '270cd3c9-73f4-41d6-a817-32c43c9c3eb2',
    '2721eb1b-0b29-4c4a-83f6-fdca5bd9adfd', '2750c56f-272d-45d1-805f-0db5301c4443', '276388ca-2956-4316-83b7-586f41b97b96', '27851994-04db-4ca5-9868-ea97c2ab7e8e',
    '27f7e270-909e-41b0-b660-3795bf79817a', '282c28d1-def0-48d0-8686-8c802b6008cf', '2867aae5-d440-40d2-ba74-225c855da281', '28723b5e-4c3e-40a7-92a8-ce91f43ede94',
    '28757fef-e73f-4ff1-b303-60eeb66f673a', '28cc0e74-6217-4eee-b261-fe3312439c18', '296871b3-8cc2-4db4-a5f5-0a7d39fe955d', '298a98f1-c702-4e81-b7ee-b40f3ec85f07',
    '29a043b5-585a-42a3-bfc9-a432078df38d', '29a80c29-ca0c-4869-924f-3a9e877d2fff', '29ba991e-fcdd-4974-8eed-290472efef2d', '29bdde39-8e29-4132-8ac0-178ba239e9ea',
    '29bef700-1284-4c93-b99b-ab40cdc138d3', '2a224e01-3d7f-4452-90b8-778c2847e726', '2a5cca6b-251c-4d02-a27f-6c45303d7b4f', '2a7f0f9d-e7c4-4fde-b225-4c2e392c2acc',
    '2afe9668-442e-42ea-9c5f-e57f62f92945', '2b2d5c5c-80ed-41c5-9f51-cbbbb43a5472', '2b35aeea-745f-456d-8468-11d8921f0999', '2b3079f1-5668-4c5b-af8c-7731e464e1ae',
    '2b4711f4-f13e-4d7e-bf2d-ccc7d5f4bf96', '2b4954da-ccb5-49ee-bdb3-dd9745edf44f', '2bb5ac23-ca37-43a0-a572-cf780c08bb07', '2bd40f64-e6ef-4ac5-ba4d-4897868cabf3',
    '2bd5fe33-d68f-4830-b28a-e1f32c639e2d', '2c0d8712-80b5-4a74-99c8-ca54419a3078', '2c2d7823-84bd-4bc2-a197-779c682986be', '2c33d618-49de-4e78-b6ee-bd8e536fbb08',
    '2c46a8d8-ca28-413f-a7fb-a1828c3c2641', '2c653944-6dae-4625-8596-719b5de6be46', '2c6e4f28-582c-4b6c-9f39-6d08052b77e3', '2c79e9a1-0217-4b2c-a8b7-c4be0790ad5f',
    '2ca2acba-d71a-4276-920c-7e005f72e315', '2cc18c4c-f420-435a-bb70-dc356bdf250b', '2d2faafa-219b-42ff-abb5-71c0a2b03ea5', '2d36ee81-4720-43a3-a53f-d78cd833a03b',
    '2d476c5f-1b71-4971-9f18-1a291e8b0a82', '2d8d8b9c-2279-40f1-b480-ce00bc64e366', '2d8f97da-881b-461b-a5da-6b86300ce376', '2dbb9936-7635-4f0d-96b7-682a72689b17',
    '2dc86cb7-39d8-4a69-95c4-f3bc66641702', '2dd03928-75b8-4fc7-80ac-d1039eea99a8', '2dda3839-ed2f-4058-99b6-6d70ccb913c5', '2dfb8761-72b1-4f6a-b712-4f8c9594a898',
    '2ec21c17-dcf5-453c-b840-bc4f989104e6', '2f11ed5c-ab52-4ac2-92d4-d9476f557af5', '2f26059b-c2dd-464d-97bc-1bf53ce02c2c', '2f28a0a9-6742-4674-b2d6-4458be5adaa5',
    '2f99e8a5-a7fa-413b-859f-f5368599b35c', '2fa004d0-73d2-4461-b2d5-654745786b7a', '2fc765cb-00d9-4376-b704-cc57a2816bd7', '2fe581b2-97b4-46cc-8040-84f83fe58de1',
    '304c6a19-b0a6-47a3-8ff0-2547a15800dc', '305f1884-2cf8-4efc-826a-0d25c1ba5af5', '307437aa-f27d-46a7-bf11-aa52f4c584a6', '30a2f3c9-cf99-4b74-91ce-aa2d2aed64ec',
    '30a95561-1573-4aee-99fb-e148e7cfd460', '30b36388-e58a-400d-a45e-c1fd6d03bfe8', '30c284e7-456d-49ee-bd52-867b011939c2', '30ec9fa9-58f4-41ad-bac3-a8dbacdc3dd0',
    '30eccaf1-032f-4201-afb6-38f000453ad5', '30f19073-4d16-4dbb-a96a-129fcff65e0a', '310ad36e-5353-4c35-9533-f4fc35dfe530', '315fdcf6-c40e-41f8-8c8b-5efe57a36b23',
    '31bfeca0-a1aa-4341-b8f3-364625073bfa', '32199470-c435-4486-9cb0-af6b88f20a93', '32817d65-4a62-4639-a492-1ce9c4b24f8e', '328cae26-d4eb-4356-a7dc-25935b22746b',
    '32b7a137-5165-4fb3-a528-e722de0d94b9', '32b4b9f2-787f-422d-94a7-fd9bf7519d6f', '32d5c5c0-bb34-46ee-ac7d-c223cd3c47b9', '32e46a0a-c0ed-44c5-93da-65c97f8c81dc',
    '32e7b9ec-e751-4ad6-a1b4-3c3c5a43617e', '33523ec8-6312-47c8-bbf5-fc91734bf934', '33527893-0e03-4ec4-bf91-d927eece1295', '33b1274a-18d2-49e4-8977-4c79e2426251',
    '33f4ef63-0c16-4b51-94ef-0211501df118', '342e051d-8bcf-42f2-a5f9-e3cd93e32444', '34396980-8081-454a-9b08-8d6af91f9de0', '345215c3-32b2-4798-8d91-e977fadb849c',
    '346764e0-1d36-4374-8bff-e7af9165c206', '348db667-3b01-482b-8300-e809bee532cc', '348ed1bc-8c3d-44db-9451-24e6e579832d', '350e9bd8-8160-4025-926d-82d5c13755ca',
    '3510be1d-2e52-4d7b-823c-a4233efa467d', '356e9be0-b7f2-45f0-9777-1caaf092de21', '3602d5e7-027f-450d-9c20-279813a6fe0f', '361d5d6f-0a90-44d6-a657-7507dfaa768e',
    '36e8e3c1-d775-4dc6-9115-5421a2db55d5', '370c0262-6859-4ab2-8e27-234562a81cfc', '3710ba45-7de1-49a7-9240-b0470ba2b9fc', '373043c2-323b-4173-9fe9-0edd0114f22b',
    '3734b8ae-2214-4b74-9408-f432856ee3f8', '374ac8bb-b3c2-4249-bc6e-74d094af4a27', '375a0e59-f20c-4804-94dd-d2f2885799e5', '37c04db9-f1e1-497a-9e71-d30a5a60da68',
    '37e18d95-5a5a-4b8b-9091-3ec8b47d55d2', '37f34199-3b7d-43ba-b52b-4b196c0e3792', '37fd09f5-aa85-411e-8d9e-a8335adb4e4a', '383dfe6b-be94-43c4-966e-f028c2f1aaba',
    '3852c1c5-e7d5-4cef-a63a-697adb14a01c', '3856cf67-a99b-4fd7-a768-534a7cc2600e', '3888fead-7af7-401e-bdff-884b7ab5539a', '3880dde8-158b-49f1-b40d-54b4c9faaa9f',
    '38916f29-c357-4754-a13c-da667cce986e', '38dc4633-6634-439a-a053-15c936f23e15', '3906177c-d196-4f5d-a73d-eb5f16e7fc6c', '391853d4-1178-49ba-9dcc-1f39f117a43b',
    '399062ec-28cc-49a2-8bee-d405771d8ba7', '39ac9b7e-5a4d-42e1-aa47-5080cf0671fb', '39b4e276-65c1-432d-aa57-b6341f94af3a', '39c0882f-b7c8-4056-8fee-9c2841e913a7',
    '39c63d96-ffae-4d02-9c46-0df573b71e36', '39ee291f-b0f5-42b3-803e-c7b5503c118e', '39eb88ab-255b-428d-adf7-7480851e6430', '39f94fb6-e9a8-4e83-91b6-6087b2ab586c',
    '3a054208-615e-4b7f-bee7-02100a7da024', '3a1e320c-a284-4f9c-bf4d-cd601db255de', '3a2c3be4-3f9f-43e4-bda6-434c507cbd88', '3a33cb50-5a36-4ba0-a18b-a8ad0f808664',
    '3a4f8efe-b089-446a-a239-246d5fd1f1d5', '3a5037db-33a9-4314-a084-2633db94704a', '3a679775-200c-4da9-b405-e48a186d2a95', '3aa3afa3-4e13-420e-ae99-3a8177d6aa57',
    '3a9ef9ca-9558-4e15-b6fe-400075ed3004', '3a67d3de-bec1-4f37-80ed-cd2d65336226', '3aec3d2f-347c-4ab3-8271-a24ed63003b8', '3b328eb3-e94f-4474-a774-60d9bb3795c3',
    '3b96db93-65a3-41d3-8878-007aa5439204', '3b918058-07d5-410b-b15c-c9276bc1f08a', '3bd3d3f9-6fd8-4c66-94c1-c755c71f2fbb', '3bf6086e-0f7d-47ba-bcb2-203037a24748',
    '3c25f856-bf61-44ad-bf66-be7bdd8a8db1', '3cd2c88a-dd90-4065-8f99-21fd38d2ba68', '3cd4103a-b781-43ca-87ca-2218278e2b0a', '3cd43862-148d-47de-83e2-767dd53219ef',
    '3cd93649-cddb-4f12-ab09-311152d3e877', '3cedeb16-edbf-4b17-9afd-bc309298f118', '3d4f0238-aa31-4b19-8c72-6ba6c5c352b1', '3d4f80cd-691d-4b50-b300-0f5044721f8b',
    '3d859ba7-c063-45cf-b649-cf2e3ec0ca5b', '3d973371-a581-4255-8dfd-e342eb52a3f5', '3dfcac2b-1ccf-48f2-926c-c7197b847ff2', '3e3b1759-0a5d-4dd5-bd4c-5d18704ffb15',
    '3e5afef9-92de-446b-8de5-39a2188cb9a8', '3e7829d4-50b2-4ffb-bc60-8dca448f32d7', '3eba917b-5c04-40e1-9bca-d00bf57b4a41', '3f098067-9e2e-4860-954d-9c15d28c7f8e',
    '3f16e761-1d25-4f20-a0c5-c30df20ce051', '3f1a176a-7ff6-4db9-ac85-029230a12716', '3f5a222a-df08-4442-bd1f-72fe81b90fb8', '401b2446-25ea-4bf9-a902-e4db0e2b9d88',
    '405bc4af-455e-4b3b-9062-6da7254a015f', '40cef15f-9121-4452-b180-45d47587591b', '414b54c1-ad50-48d5-af3a-8cd2bca01edb', '414f3bea-1283-46e8-b61c-c1c25a7fa2dc',
    '4164202b-68a7-4c31-9af3-9cc16762fe8a', '4180e69e-6fd9-47c9-b6fa-f20287b9115e', '41a77c87-6c5a-46ee-81d4-353914ad5862', '41bc1d11-8b66-46ba-a68f-dcaf015e970b',
    '41d65ab3-223f-4bd0-920b-1e2dc36fe58c', '421e4ae9-067b-45a2-a56c-05f6f8bb29b9', '42267fe4-f719-40e3-b977-9528417bc4d2', '4243824d-6fa7-4d05-b13a-dfcf72d8f50f',
    '42874d3a-05ab-48ed-a05f-1f42a5975cc1', '4290fb07-e006-478b-b632-3fc66e86222a', '42c71580-8236-4635-8dc8-f2bc1aa03458', '42f2415b-cdc8-4b10-839d-1a1bc3a3c2ae',
    '42fc0af0-e234-41e8-b428-55feab7624e2', '42fc3d67-41e8-491b-9e9b-a4f7718f6d70', '4325dd17-5ba7-40dd-8c1a-f832c75e9bba', '433d8d6f-5d48-4a2c-beca-6da7a353ddde',
    '433eaa2a-dfad-441e-b7d7-da29d26787ae', '4390ebe2-7407-4625-a850-8067ae9602c6', '4378c1bc-a3ee-44f6-ac48-f41926604aa1', '4390f93b-5cfc-4faa-8e0e-b4cfbb640dcc',
    '439acb72-a143-4abd-9ccb-0b043d16b10c', '43d8fa78-15a8-43f0-adaa-e335127b88cd', '4402f8e6-2479-4eaa-84a7-637457d9bbee', '440af05f-09ac-4838-9691-2ae72561a12b',
    '44517e8f-a3b8-4de6-befe-d583147a7ec0', '4475e408-7bb1-46fe-a7a5-af3e53760daf', '447a6457-c1c8-4fe0-9be9-b5975e8aa7f0', '4491e08c-4b3e-4b45-8fa4-c1841679f1cd',
    '449f9f78-b915-44f2-a1c2-db8ee18677b9', '44a8ee25-3a4a-4e6a-9084-04186d2aff9e', '4521ac61-2343-4b67-9e27-78fda9f14160', '458c1bf9-f798-4696-96dc-fe57e8779b15',
    '45dc000e-3f0b-4464-ac86-d648075ada83', '45dfbe4d-48fc-4b3f-913c-7cadd40dc300', '46776537-a07e-4dae-9764-fca72db06789', '46b91a41-4402-4fb4-b5a4-f566cc5eeb3c',
    '46dc45b0-800c-4846-9f39-8427886dbba8', '46f38914-35f6-404e-ba7a-9114f4c113b1', '47c69f74-cb73-4005-9039-f8b26252c741', '4810ad81-e305-40b8-bb38-22223444b58d',
    '486b6516-414e-4514-9cce-3bcf41ef58a0', '48cfa609-7353-4e94-8b08-29e0fe856c5b', '48e6bdc4-e185-4e59-92aa-4eee739c0f91', '4909c1b0-5d39-430b-ab00-430b47c0609c',
    '490dd855-3d1e-48da-b412-9675f7c1caba', '49292a24-8bd2-4393-a714-f861e785ec70', '493a9ed9-9852-4753-b686-df1be40487db', '497070b2-c5aa-424a-8cf4-615a7d62cd37',
    '497ee11c-52a7-4ed1-8c47-3eb37792b982', '49aa11c4-9c6c-454c-b1a7-924773abe70a', '49c6af2b-e8a8-4ad2-8332-25601890cace', '4a012f4c-1b6b-416b-bbcb-aa6e54e54732',
    '4a582735-c0d8-4edb-bbf7-daeb957b4204', '4a6ae192-e9de-44e1-8b77-1372027aef50', '4a752d40-3102-4abb-8e1c-4fbbd62dfd82', '4a88beb3-3513-4901-aa50-3417c68d26ab',
    '4a9129dc-de72-405f-8f92-19bf1e5d82ec', '4abd4ecf-e5d3-489a-b9ae-48adcfd32be6', '4ac56261-cfe3-4402-af22-74f15c6f5879', '4ae5186c-a4de-445a-9be7-452bc3671a40',
    '4aec1015-ce4f-4b5a-9690-ba2f7ae7fddc', '4af370a1-557f-4db7-b5d3-21974f17e7cf', '4ba03a48-a553-4d0f-8d17-e15293b53ffd', '4bd6af2d-3e34-4ff1-bf64-e24f487da599',
    '4c1518d3-975b-4fba-ab4b-1bbc26a0542e', '4cb66bd1-8147-4274-9407-6554a8a00e3f', '4cc1b732-9283-4b6f-93ff-9253011253ab', '4cef6c10-83ca-43e3-8201-474025b63f93',
    '4cf870fa-31a3-4ee3-860f-5c9ee40de3b2', '4cfd8db0-e086-44ff-a6b0-d97c015643be', '4d6fa318-b486-4dd5-aba0-8d1aa6bfb011', '4d64bab6-5327-4003-90e4-f3d4c7872c4f',
    '4dcae754-c355-4269-a6a9-09fdbd46679d', '4dfaf329-5832-4a13-a08b-5b55e2b5e01b', '4e2c83a3-2917-4058-ba3f-47af47bbe387', '4e8b6f26-4af7-48cc-aeb5-0553d8719350',
    '4eb4fb54-d980-4d16-8db7-27d450325f1f', '4ee1d7e4-b9ea-4882-87dd-8df972f70b74', '4ee4d7e8-8a94-434c-b514-ffddd465492f', '4f080dd5-e436-46f5-a78d-04b4a0e97083',
    '4f1bdb40-f3ba-454d-a9be-6d5e05dfec44', '4f4bf5a2-a50b-4205-b46f-a3c9620b1d86', '4f5ae38e-1e3b-4c7b-9624-49bbff372228', '4fbf9145-07ff-4952-9b1c-96202b1dce2d',
    '4fe974cd-f484-49c4-9c45-c9954fdd9396', '50453e03-e6ef-44ff-b505-3d7e14db28fe', '505a4391-44e0-4bc5-b5c4-ab7e8944cf57', '506f8ab3-761a-45f2-a903-6fa6e6f93c9e',
    '507ad953-e865-4e00-a7f7-a284556b7959', '508f3b86-cf4e-4051-b28a-6c3acadfd693', '50980c01-29f9-4128-9e63-f0443f77dfae', '51445e39-b8b0-49cd-8901-5c2c485f5fad',
    '515ae4fe-5f05-44e2-83ca-969cdb629d7d', '51b75e36-1a5c-4317-954f-8f0560a5659f', '51c8d5c3-e55f-45ad-a026-ed1a253a74cb', '5247abfe-5099-4d93-989e-5ca63eb7c6c5',
    '528ce5cf-f7ce-4175-9a42-1657cb854cd0', '52a24856-d9bf-4654-8591-269cdd419394', '52d97857-a9e4-4710-b0d2-1c4ad56d6504', '52e3181a-8526-4c6e-a107-9d1dd4fbe851',
    '52e8ef96-f6e8-4a52-864b-6f4f47f6f868', '5316a8a7-9979-4ee5-843f-f41cf53d61a3', '530bb367-22b4-4f04-9b74-45bc8a679977', '5319d51f-24d7-4634-9d79-ce12971cdf9d',
    '53363a41-b845-4717-bb59-14d088132d2a', '53773e97-13e9-4146-8720-dd6a7968ee1d', '53ec2177-a495-42b8-9c48-a71844868dd8', '540991f1-43a0-4c11-bf7d-520ffe33b4e1',
    '542b1393-e0fb-4fbd-b959-a2167d44fce0', '546fa275-4b72-4fde-8bf2-ba739bbd553c', '54882261-79e1-47d3-a5a6-3fb87c1a7da1', '54ed9d7d-8c71-4ca8-84b9-750cc59e0ea2',
    '54fc0af1-3e90-4709-ab94-5585ef4a0737', '5619d693-97ac-40d4-a0f8-98e265abea06', '56671fce-8a0d-42e4-b575-13f6b32b20dc', '569966f2-ce0a-4845-b5cd-4f7f924322ad',
    '56ab00df-2795-406b-92d6-3d08f082994b', '56d0c81f-0271-4ec7-b1b0-b1394e4c3ff2', '56e6a987-9da6-44f2-b818-776a9847cdc3', '56e1e98f-6a4a-49bf-8dad-902693a9e7c3',
    '5708c916-8015-4f11-a3e7-661c1e6ceaee', '5719c78e-8011-4ae3-8afa-640835c878c7', '572b0a2b-60d4-4f67-937a-cb11f9bd7353', '5773d6ca-1036-4475-a598-d6cb19e0729d',
    '57a24725-ebb5-4eb2-b3e5-471462bd4c44', '57a31a7b-0b08-4037-b83b-2c3978129d16', '57dc74ef-5105-4fae-be79-3f30862740d0', '57e8ba48-6b6b-4a25-8c79-3cbdf56a2bd1',
    '57ec3851-0e6c-460f-a0dd-e17aa5fd92b8', '57f9f779-9c14-4c97-93f0-5fdeed3fa77c', '580d54ad-1654-4dfd-8fc9-188818b9367a', '581399d3-0328-4312-97fb-9cb80442986c',
    '5838e4af-92d9-4a30-9a9e-470f06df32bb', '58bd94bc-e4a8-4c86-9c44-0890a23ea94f', '58dcbc2f-b5d2-4d90-8122-09bcc2fbbd7e', '59616def-ca7b-434d-84b7-f62d604e1d1c',
    '59b56693-5156-478b-af2a-551a5b16c37f', '59f4aefa-ec58-4c84-a836-ad656e99bd15', '59fbb7f6-1202-4813-8c39-7930a5d62d1e', '5a832993-c25b-4bce-b69c-ab4d919a2726',
    '5a905f92-d1d7-4390-8108-f351fdb6f206', '5ad41016-051a-4a43-9a24-14663945d6c8', '5b2c44bb-dd48-477c-8eed-cbd7debf7edf', '5b6f4a57-b77d-4442-88fe-c1c498c7f3cb',
    '5b759bb7-d7cf-4b61-ab0f-19d8cb23e618', '5b8bfe2c-9a81-4730-99d2-a450f07f65d2', '5ba4d1e3-c29b-434a-8408-9d2361149c3e', '5bee06a0-2e41-4175-a6eb-0ed8e139c7f7',
    '5bfc641d-bb3b-4816-9f17-912f17623f95', '5c388bd8-912d-40af-8c64-85ef042a1109', '5c696b1e-7b25-4620-b81e-bebdb80fa991', '5c98b21b-93fb-4a2f-950d-e87d31834e9c',
    '5cde6d88-3324-4b7f-b0b9-8dfb6a182287', '5d05879f-1bfa-41fe-95cc-fcff9e11a025', '5d08fdc1-3be0-4927-a090-b062da29ca45', '5d599b0a-38ac-4590-85d0-c3dd7c03f3f0',
    '5db7dbdc-102c-4813-a95b-35b306779ed4', '5df2592b-fb06-4379-9f9f-3c29209c2379', '5e3b4cba-7323-443e-aed6-913f0a872077', '5e6de39a-20ce-465e-be17-7775bd805e58',
    '5e9ddb8f-d6e1-464a-9a9e-689fb3666671', '5f2a7418-9f18-4a34-9589-c19d7864909e', '5f46774e-8619-4521-a66f-c2c81606f412', '5f53d1f9-96e1-4c17-9e35-fcb40f6d5f52',
    '5f688b73-856c-4c49-86fd-244c94ea4b52', '5f78a987-306e-48e5-982c-ef80d30cfb8e', '5f8a14a8-19fc-46af-a9aa-0a0306822977', '5fd472dd-5985-49a1-a97e-f82f612161e3',
    '6009d67e-06de-4198-acd5-13c68fb316c5', '6081ebde-7da0-4179-98fd-cf16edb6cae6', '61275a5c-5902-4902-8eab-7bec5ea35de5', '6194cc84-2ae6-4170-8b23-f8bbe7b3b675',
    '61c1b3e5-6076-4c94-8fec-261c158049b5', '61ce6975-71d0-441e-968b-41dc39eb2a21', '625f05c0-c0f7-4701-baaa-c5fa570c9853', '632994f4-7d7d-4db5-b45c-8a0631966c63',
    '633d317d-bad4-4e64-b28c-cf6c079f57a7', '635d9437-6dd0-479f-a106-5a3b73b6b22f', '63843f4c-11df-4a3f-bec0-015e29aa8418', '63a993a7-f85c-4c4a-b060-e946e1e8fe4a',
    '63c4c7e9-d428-453f-96fa-be2c9e9690d7', '63e166e8-34a5-48e0-9ffe-f579a2691c07', '63e221e3-3cdb-4e43-9a9c-24da445fa928', '6407c0ff-2737-4a37-8a04-35ce0136da0b',
    '646622e5-2ba6-4d18-a12d-519fe6dd651c', '64713ae1-cdc4-4a7c-83b1-5ba08bc2216a', '64793a8d-99a1-4c99-a9fe-6340d9314c24', '64984acc-1bba-4d18-bbbf-8dc4842e2799',
    '64c76727-3866-40ee-8170-33b218f0cae6', '64e4adef-4830-4131-9f57-051d9e2c7ea5', '6514bc7b-7b5a-458a-85df-f32fa70603fb', '6520d85c-be5e-47ef-b7e0-a39a202667d7',
    '6526e06e-078c-4f1d-9c31-93ecaf231f3c', '652f67b6-287e-441c-9816-bca4e9c67850', '65562b73-af89-4d4b-9464-82561df829d5', '65a03d3c-7143-49f1-a177-d4c29a52b4d3',
    '65af8dd7-4c73-4f69-81b3-374e09d04941', '65ccdb32-acbc-4a96-9185-303790d7c9d2', '65d35a77-ce28-42eb-a0df-ef754dbb8a8c', '65e973ca-c89d-4613-9eb1-d19f66ba1e23',
    '65f91191-73c3-4d7b-b595-51c2ba626276', '65fed6f7-621e-4380-8dd8-46662f7c4432', '66f0faec-30dd-4904-a8fe-f212127ece61', '67146ab1-6246-4891-98f8-95f26cb8b23f',
    '6723db83-a6ff-4df5-944b-4fb418e92654', '67336186-3830-4b9d-a72d-1938e33fc826', '67375812-8048-442b-b83f-721f802c80b6', '6759c1e5-8c42-472f-ad40-0137b93513d8',
    '67a85f02-7b3c-4420-b983-a1f82fa52546', '67b1877d-9f08-44eb-aa4e-3eb4e2dc7c39', '67d10358-5741-46f0-b5ad-f75db582cb00', '67eb73f1-ed7b-489a-9759-59757ce76e03',
    '67e75520-8a7f-42b9-a3c1-f15acbc9697b', '67fa4136-3ce0-40ce-9c6e-1dd94303f5c1', '6818bc4e-f79d-4776-91ef-eabe4299f54e', '68539bd2-3ab7-4ac4-9816-987a7a1726fe',
    '686ef3ec-dbdb-4d7c-8a15-bc56363c0fcf', '68a2a302-1afb-4388-a821-8017478003d4', '68a20879-4b2b-4bca-91c7-83352dc32867', '68b18e87-1497-4de4-9daa-8046817da941',
    '68b55ef0-d00b-45d9-9254-cb6794417303', '68cee3dd-381a-416f-9414-6068fb2bb2dc', '68f30e00-90ea-4ccc-bb66-a68300ec4319', '691c85b9-f955-44cd-8990-1f6725d7c96a',
    '693b15b3-b1ba-4001-8b57-36462d071d2e', '695c7977-ba8d-468b-bc2b-c3a37b20ffca', '6970dd56-a1fb-45a2-bd34-a9006197c520', '6995e259-b89d-4906-adbf-f1c049a73ce3',
    '69b614d9-6bee-4720-9c5d-59fe953630a4', '69d1207d-337f-4ffd-8ef0-d04e963dcdc5', '69eba6b4-c3a3-468f-8f75-a63f03744609', '6a1b0fb0-b580-4a60-94ce-a34de81de149',
    '6a17a980-e413-4ee2-895f-4438f0ce610f', '6a26d3b0-4874-4b61-902a-f7b5c352cfbf', '6a5a2ffe-d6d5-4688-be00-512a9dd3bb4e', '6a8975e0-b4c8-4133-b352-d254fa8e0580',
    '6a8bae98-9159-4f52-943a-862968cf4694', '6ab1516e-1e8b-413b-8338-c32072d6069c', '6aed8efa-9509-40f8-b4d6-7218953ea650', '6afae723-c5a5-45b3-a1d5-559f239f45a2',
    '6b03d632-62f9-4544-9c95-8207ebb58af6', '6b369ea3-4cf2-435e-8f4c-0a657f220f58', '6b398080-0c89-4ba5-acf9-9fb150626961', '6b5d3111-d042-47d3-bf20-79a5e05d8d89',
    '6b667770-5be8-45a4-bdb0-d5bdf516ee89', '6b782834-3dea-452f-b355-15621e31da20', '6b73f88c-4cc3-438f-a126-ee7eda5f5031', '6b9d39b9-6d91-4e0c-865a-03600bfae92f',
    '6bb0d0af-2334-4874-bfa5-513add6a8579', '6bb65be9-7a5e-46db-b308-4a501ff89d50', '6bc281fe-aec2-458a-b2d8-a4f16ee370d0', '6bc423c6-dbef-4603-978a-db4388b1a783',
    '6bdbd857-d789-4145-94ab-0968e70e1f44', '6bfa0b00-fc61-458a-aac6-b7ef8a285a04', '6c72f4ec-7106-4c2d-90a4-af4fb937b828', '6c7c31c5-93ad-4cbc-bdf5-980cb9090122',
    '6c856d79-a592-4add-9eab-ee845dbf286a', '6c8cabde-7c4a-4f98-9526-e1fb25abdbdd', '6c9b57a7-4058-4549-9d59-842b0d83ac08', '6cf2b0fa-0a81-4de0-bb2d-a736819ce2d4',
    '6d5d8ac1-7aab-4e10-b404-03114bf0b01b', '6daa04d0-92e4-4335-acfa-a47f826075b5', '6daeacec-d341-44a5-b548-c192be4b1b51', '6e2c3121-4aa5-4e13-84c1-5c4c72e062f9',
    '6e51d1b4-c837-4532-91ec-c7b14ea65e55', '6e59e664-2ac2-499f-af4c-c15b87aac977', '6e6820c9-c7aa-48ad-85dc-00675284e730', '6ea0168d-881d-4c35-9d9a-8a112a8e0d37',
    '6eb2e655-f3fe-48c9-94d0-801d827b884a', '6ee4556d-7194-41bf-a6d5-b5ae83b1bca6', '6f2a9130-adcd-4553-a99b-71c7b0dd13d7', '6f44a03f-bcf1-4d62-8649-50c1275a2bc9',
    '6f6c3aaa-0b6c-4254-8fa7-51e178beefc6', '6f81034a-f090-4cd5-beb5-39ea6a5024d4', '6fbd2ce7-0a6b-4e6e-881d-a705a0f0b371', '6fbea056-ada2-404d-a7c4-47d5bfa8abd0',
    '7018301f-035b-428a-b75e-6d9f431a165d', '7052eb21-aa4d-4553-9288-c7000373a645', '70dd0e9a-7944-436a-8d80-0b3dbad6309a', '70e62f88-1419-402b-9c5e-71ef7a67164f',
    '7109e5d1-4afe-4a5c-8960-46bc84ee56e0', '712c7838-135e-4aad-b166-23054247d1a3', '714e8bd1-7bc8-44bb-828f-46caaf9ef68b', '71513d2f-3e9d-48ab-9ab4-9d57a5a45527',
    '716ff0a9-1769-4548-973f-792febc24cdd', '71807dcb-4b77-4efd-825c-5cac51c46d55', '71b3e53c-daff-4351-8eb2-f5f85cb2ae60', '71dd23f8-abe9-4db6-957e-e605c326429c',
    '71e10795-afb9-4bb5-8329-62c9eda172ea', '726a8472-99b5-4d2e-a772-adfc0396d5a6', '72942e10-1f47-4186-ba8a-9c220763f230', '72c9909b-2d13-489d-b6a3-467fec1f2ea2',
    '731e635b-14cf-450b-81db-7d16ac28484d', '7353ebcb-2a41-4b61-9b1a-c65e14d0b45e', '73727e0d-5503-42b4-be19-75e054678d85', '73943626-c83d-49e6-bd21-1c18fe744d44',
    '73c850ea-4921-41b2-91ce-fdce98010611', '73ce999a-d633-40ec-b6d7-d7da53e02925', '73f83b7e-b00a-4369-97f3-3dd1f0e2024d', '73fa2f10-6280-4c5e-ac39-a118f57432af',
    '7411408c-5396-4402-8edd-7615a1b8c24f', '743e6d0d-57c9-41ba-91d9-5c0ae6b281b1', '744ceae2-7e3f-45cf-ab2e-ecff3ae952a5', '746dfce9-54f3-4900-a9c1-86472844e3ee',
    '747f09a2-1565-4a24-8980-4231cc3af247', '7489b7f7-16b1-40bf-9561-d0a91cd3a8f2', '749602f2-d780-46a5-a684-ce36b9a8f8d1', '74c24233-056b-49a9-a0bd-abbff2619bc2',
    '7525a8fc-47b8-4fa7-8808-31611e1c9335', '754556d9-4e0b-4c66-b359-85254e786b69', '755904c8-65d2-4493-844d-a8edf6b6d609', '755be283-f5f6-4010-a634-64601e088cb7',
    '75671524-4685-463c-b3b6-4569f5455fda', '759e4ba7-4c50-4208-aa29-1225bfe300c5', '75b2f685-a68d-409b-bd50-e182a18b7745', '75fb4ac6-a00f-4b42-8b4e-f4d88d74d7af',
    '75ffbc64-eab3-4aeb-8747-2ace520a445d', '760b269a-84db-4d25-ae62-b2ed9920b3a7', '761ca836-ef79-43bd-88f4-2b4cf36b7d45', '7627a617-c486-4db8-accd-02cacb32bbba',
    '762d9e39-d17a-4aee-abda-19d89651b80d', '766663e8-92f8-40f4-9ede-36a16d189dc5', '769dd522-ff13-458a-95a1-f597753c3854', '76b44477-0bfa-4c05-837b-051bd7b530e5',
    '76f5d165-1e3c-410f-b00b-0b91b7098466', '7747b72c-a801-4a48-b397-c806c9f1ab36', '774f5e28-8aea-4101-b06d-889e272c1f9f', '77519218-c5bf-4559-97cc-fd6020caa912',
    '77b32477-ad8f-463b-8f32-c291b9724424', '77bf3621-6176-45c5-80ca-93e17438856c', '7818d995-cee3-437a-be8e-6c594125fb18', '782f09d3-3e5d-4939-9e02-aae91692bbe8',
    '783c60e8-6355-4a66-affd-0d20f7b81838', '784f34c0-8779-4005-8c80-91e70286ec3d', '784daa1a-4e28-425a-a920-2a9c23b5f5d2', '78a8f04e-14ab-4cc1-9059-7a8f3caeb469',
    '791f42f0-e75a-418e-ac68-79dbd851f0db', '791f452e-f719-4f7d-94d9-7511a28a20fe', '7927b9a5-08e7-4838-9185-56322788840b', '7926c5c9-3253-4cf9-bd0e-a6e4a85f867d',
    '793b974d-d030-4025-b1e9-994c5a2e97a6', '7962cf24-5426-4655-9c85-91b62f32e924', '79686e00-80d8-46ad-bea0-3bd201c76831', '79b1bc66-ff72-4221-94fa-c962dae1f0bf',
    '7a071912-ce6c-4471-8940-7c2dd4276a74', '7a0b7c56-5741-411a-844d-fb8da1485f35', '7a2121a1-7a9d-4dec-a9a5-09fcf7bd7a28', '7a64238c-4992-4d3d-960d-971894a894d8',
    '7a8ed9cf-a237-4238-a67f-00a1714dcc45', '7a98a4bf-9cbc-4248-a984-cbdfec809507', '7aa09491-965a-459b-affd-6a5fd5e0e30f', '7aae9c9f-05e5-4fa6-9859-a81d7ce45da1',
    '7ad0b0f2-7cd6-4a1e-9c18-a1cc138b2ecd', '7b015cdc-4d2c-4b57-a5ed-4aa1b58f0b46', '7bb1dd9a-c8ff-4674-a6bf-be4ea6cfc047', '7bc21bcf-dcf3-4c3b-b957-056e90e6a268',
    '7bec4518-2ef4-47bd-acdd-09558578bfa6', '7c1e7d4e-1b24-43e4-bfd9-d395f19add2b', '7c1f43c0-f5fc-46ee-b31b-f8570ceef0ef', '7c23ffd5-fd79-4eba-8fc2-9a022b788297',
    '7c556621-7d26-40ba-95e1-cc48de6f7669', '7c53921c-260c-4b72-aed7-9188fc145099', '7c518fbd-89a9-4c15-bb65-833cd5ed2163', '7c661c34-eeb0-4a5a-a860-bf3621987f08',
    '7c72e21e-df5a-4ef4-975b-62facbf04a83', '7d1d93e0-4d6f-4c5f-88b0-c64785d377ac', '7d30f522-f5e6-492d-9a91-53b0d5dff6c5', '7d39b76b-1902-49ec-b501-9da92e5c23dd',
    '7d98a4b7-0a23-4212-a0e3-6e784cf9db61', '7dbbf77a-3e21-4719-bc66-d9194f9a805b', '7dc17d36-94da-44d8-9742-7924dbf74490', '7deea844-46de-4fbe-9efb-ec7ea100ae14',
    '7e115937-6c7a-485e-b2d3-0fb3e205a615', '7e3b0826-449b-42f3-bea9-fe8fa7256e70', '7e3cf80a-db51-40e2-af3e-8743daad321d', '7e47d1ad-a631-413c-bc2f-0315dd86e7f3',
    '7e66691f-5bbc-47f5-b4f2-b4892ef360fa', '7e7a3d5f-38d9-4243-8e00-3b2441b118ea', '7e971ae9-98db-4cff-a51d-fec4352e088a', '7e973915-623d-4800-9004-eccf773e8e7c',
    '7ea2d60d-8cf6-4b71-8042-ada16b613bb7', '7eb815fa-8c2d-4668-9ed6-f911cde663bb', '7eb81688-5dec-4bb6-ab9e-606f881448b0', '7f12fa40-ce4d-4923-9ac2-8de31bfb31ec',
    '7f69ea05-c86e-4822-b31c-93ac7100b6ea', '7f79ac23-d7e6-4f58-b2a8-8ac353371d1a', '7f7a2974-4cae-4b9e-bcdb-e937617d0301', '7fb8d170-7df8-4868-b7b1-5d9546b8d079',
    '801d54a0-1624-4cd8-891b-5e80641fa8db', '80649baa-33fa-4e51-985b-9e614789f7bb', '809f95b4-f693-4e17-90de-e7b93f18c9ce', '80bf2aa4-982e-49d2-8296-49d5e67ace24',
    '810188af-51ca-4dc9-bff2-86f37ea049d6', '811c6a78-70f2-4d3f-9650-0b94a486d931', '821894ad-be86-4382-9fe8-f51bb4af0bf3', '82caee88-8660-4b36-9b65-a5fe15a10cc6',
    '8308ac29-5212-445e-aa81-7140edc70c3a', '8315edc0-0027-4a42-aa7c-02667891c738', '83436f92-7dda-499d-a57c-645404bff5b8', '836ab883-00ca-45cb-8454-8223bd827f1a',
    '8378ac91-fe3f-48d5-a069-81f4e97dcb2e', '83a2a381-2ecf-47c2-8708-d09c5b62fd2e', '83ab453f-8ab0-47b7-a703-92531f87e0bb', '83ab60e6-99eb-434e-8f8d-d5f19d7bce4c',
    '83af0fc4-b715-45e8-848b-ba974ee85f87', '840471aa-bb7b-4864-a68c-e91f3e57101d', '8425be93-40fd-472c-b850-47a505cc2ecf', '844d840e-be23-4428-a0e7-81ac87140a2a',
    '84502199-565b-454a-ae05-6c3b066f7f4b', '84644866-c2f3-49a3-8ee6-eba895afa782', '849ee9c3-9f5d-4a78-877c-d33c6ff89aa4', '84e35851-58bd-45a1-b47b-53d863232edf',
    '850bcdb3-e241-4a46-92b9-d0888212cf28', '851e0c3b-cb02-47f7-a087-77dc6099f0f0', '856faf98-9751-4a84-b11b-a8a1e42992e9', '857adf7c-c6d5-426a-ad91-f4e68c10588c',
    '86b9337b-1cdb-4d0e-bbbd-4888c903bbb1', '86cdc70f-fa36-46f5-98e4-9dfa85babdd8', '87157843-e246-498a-b88c-072714b96a6f', '8719303a-4d85-499c-bba9-450c47a0b4ac',
    '8787c9cf-9930-4270-9580-e886a5d4cb6a', '87b7dcc2-632e-433b-84ae-9570a63c1118', '87cf1cb3-c3c7-41f3-889f-f53954ced7a3', '887b0c1b-a448-4187-9eb6-b1ae0fb26993',
    '888de49b-b39f-42e1-8784-f4f25a807278', '88f3a58b-501a-4a5d-9283-d4c7d772cfa1', '89289072-107f-4fcd-95fa-caf8439ea504', '899400bb-95ed-4d4f-aef2-8c51fc1e5e3d',
    '89e1b3aa-2d2a-402d-9e18-735e183874af', '8a48a58d-10b4-4229-9a16-bf0b788174b9', '8a53834b-3a68-449e-8de0-8a3533ad8edc', '8aa50365-4981-47f6-a013-b1209748083b',
    '8aae04e2-2ddb-4035-aeb1-a17a6acb79d0', '8add4a0d-82a1-4d78-afe4-6bb9b8568c3f', '8b019f2a-afc1-44cb-b1ac-686ab71d3b64', '8b3a25bd-c2ee-466d-b330-88225d3df4b2',
    '8b71eec4-5caf-4bf0-ab87-646e277c46f5', '8ba63c9a-990b-4ef4-bc86-61f5fe512e78', '8c45ef41-4391-4bb4-a5c7-12f5639b0bf4', '8d3aebfb-d7d3-4fd6-817b-67a2395f8617',
    '8d892e4b-b743-4cd4-8d08-a719be3dff50', '8db10c03-e22c-480a-a221-e4465bff0e57', '8dd96c61-edd1-4aa5-b810-21daa3d6c60a', '8e134a41-dfd1-49c6-906a-910f00eaaa8e',
    '8e6c9296-d991-4d2f-a387-710ffb56ed5c', '8e9ec970-c2f2-4d24-91f2-063230934769', '8ec31d95-64e1-4f25-bb7a-a5da8b211a48', '8ee713b3-c82d-4340-9129-415e68bdc0b1',
    '8f767654-c0bf-44a9-846d-83876990380d', '8f8dc691-287e-42e7-adae-20d78f3c567e', '8fac266e-43db-4726-a6d4-1c2bca36c25a', '8fafb110-09e7-43d9-9407-8078227ad351',
    '8faf888f-d6d7-4f83-b5fb-1e9794f92de8', '900f622a-905b-4b6d-a1f4-27e7b6bfee49', '9050520b-1681-4e86-b687-fb6268cd5661', '9058e291-e22f-4e1a-a3c0-f1425c0b935b',
    '9130e09b-236e-4c99-9573-bffc5091629f', '91443c2b-9643-419b-ade4-5c2010831946', '917b70ed-43e3-41ce-bdf4-38935f825715', '9196ed4b-1502-4675-ae2d-53d74aadef19',
    '91c79446-6a7b-4ab9-91f7-5949141cbf31', '91cf735f-cad9-4dcb-a0d5-8428f26ee34d', '91d4a15f-70d2-4610-b9e1-cba0856c341c', '922b77e1-d27e-4d2f-a103-74f9079346c4',
    '926a006d-6731-42fc-bf92-6d70da8009e2', '92d3d014-4500-44dc-b8bb-cdf92a672378', '92db65df-d5c1-4d9f-8b57-18edccd140ae', '92ffae89-edfd-42c3-8e73-c853100f3190',
    '931fb3ab-2fc0-4347-be20-5946c9131630', '9324d208-f86a-4098-b8c2-faa1b30479bd', '93419796-eece-442a-91ca-7e6dadb017c2', '935aa019-5de0-4ab0-9d70-8ad1e8e05eb6',
    '936e03e4-c669-42ae-9afb-d1d08db9ea2b', '93b6c445-5112-446b-9639-1feaaeb32e33', '93d49d75-2935-4739-a18c-ca1c12bf631c', '93d2a40c-1fd7-4905-9d9f-b9c560485e88',
    '93f61a51-005e-4940-b1d5-171794012557', '9401194b-3d4c-4da2-b2c3-8c6878e902e6', '94285db0-5ee9-42b6-b324-bd389cf29f96', '947ffa04-0fa0-41ba-9f89-39e7b671d285',
    '94993bae-2cad-4bf0-a29f-4150d9277300', '95164a6b-0aab-4083-aeb4-768d4191c0c9', '95689290-f23a-4f8a-bf9d-1223535b5b69', '95fed67c-6d56-4a36-9f50-06ab4a1bd483',
    '9607b716-8ecc-4717-9a3f-361b6bc25272', '96139645-80c5-42c7-a283-8646158c96f0', '96460747-8a7f-4028-b90d-465b1667f3cc', '96a61ba1-8e91-4de1-95d3-ca03aa79afb2',
    '96d9a788-663e-412d-9406-4b0849823362', '97514cec-6084-463c-a960-46c685e0b0da', '9755107d-0b88-4e16-9eef-3c51cee942b4', '977861f6-a962-40fc-bc23-6c945ecf501f',
    '98861765-6250-4f02-b3ba-4e34ca2f00e6', '987e404d-dcc2-488c-9c45-f2a455287489', '98c4d5f9-bfb5-4e3e-bc77-ce4ea471e874', '98d625c2-6fce-4e84-97fe-2a067c6adc90',
    '98fa3907-d799-4924-8cd3-cf3af8b6679c', '990ede4a-0c1b-49b1-b2fc-d738fc982f40', '9996f8c1-650c-47ad-87ab-63f7c8a9c242', '99d689e2-f40e-49e8-8be3-6f89e493e9e3',
    '9a3bfefe-161d-46f0-b193-2e2622efc443', '9a88b5a8-5a8e-45f9-bccc-2017cdab4c6c', '9b54127f-e59c-45a7-b083-9e989305d4e4', '9b668596-a40c-48b1-a7f5-682106cd4042',
    '9baf3d25-a1d1-45d3-a88c-04c2bc7c261d', '9bdc5ecd-3c67-4122-8a76-ad2fe5b5ac67', '9bf8721c-cf3e-4b71-ac2f-a2e61a71fd39', '9c115483-036b-4855-827a-6bb731f85655',
    '9c32df08-b91e-4ee5-a82c-153b773b2b8a', '9c45f636-85e2-4095-8de4-cb5c29c9ac8f', '9c5d4cd3-1ca9-40eb-bac1-b8dafcc08cba', '9c936245-c809-4172-afd3-3a311f41b07b',
    '9c9fa247-ab20-44eb-adbd-9d195cd3b00c', '9caa3a10-4c39-4ab7-9b79-fd9c9618e88a', '9cfdb289-0159-40de-9d37-47dc3e33a0aa', '9d975608-6265-46b7-bc29-c61a273f4191',
    '9ddadf09-7659-4ff4-a01c-c7d9ef414e03', '9e05f57a-e17a-4259-b988-717b0736aef5', '9e46d65c-14df-4215-b228-5439fbab2441', '9eb56e8e-23e3-4447-a0b4-436623b695d9',
    '9edaa9f4-16fd-4559-ac92-a32d50ca4c99', '9f28226c-e2d5-44c0-a3db-16cdfa7aa4a9', '9f95b8fb-c9e2-47d0-a26a-772031bb3b31', '9fefa171-b8ed-4619-9a57-01ea3c143aaa',
    'a0523806-3167-471d-b1d4-df16028a9c7b', 'a064e252-9120-4a0e-a1c0-c3a0a53394d2', 'a08d81e1-e105-4918-a917-3d226430d596', 'a0936c2b-94a5-4fc0-b5ee-f1cb8db7bd2d',
    'a10f7bbe-7584-4dcb-b33d-486198851f2b', 'a1d23fef-5b1d-4769-9118-544ccd2faabc', 'a2256eb4-f019-4b00-b1ac-fcb4ed244760', 'a24674e8-5037-40d8-9b0c-42c1c33b80e4',
    'a27fa4f9-d0d7-4b54-8014-21dbe8fd61ff', 'a2aed7c6-315e-4d61-9461-866f9eb7944d', 'a2c6e50f-a80b-4e00-a782-b50e73b23247', 'a3a9c588-20d5-41ff-8157-9e45118a9571',
    'a3bb3c4e-9161-43f8-8713-694e8c248385', 'a3e1c61d-2d99-4b2b-a1fa-8877b30afd71', 'a417357c-d1eb-4179-ade5-9472427fd343', 'a49aeae1-3508-456c-ac02-6f463f85be17',
    'a4797081-d2c3-4f00-bc7c-28d3ad37217b', 'a4c79913-9870-431c-b7d1-99aa4790dde2', 'a5776577-c101-464d-83d5-6fbfd1d2f6de', 'a5887584-1278-4125-97a5-27ad2efba102',
    'a5e7c2f6-5e47-4321-afea-c41c82104388', 'a6601d15-276d-48b7-95e6-615403aeb827', 'a66f0382-43a8-4b76-b68c-ca2e262739c1', 'a6d57331-71b6-4e6b-94c4-4913460d382c',
    'a6f7627a-e261-4899-b150-8a2eaf2ef7c4', 'a6fab5c4-b569-4ae1-876f-1606705f8a06', 'a70dc585-7d3f-476b-b1e7-b44fc5dc900d', 'a76f57b4-fd2f-4500-9da4-7245506b2e8c',
    'a7e2b297-ad62-4ad4-b30b-2b349ec8713c', 'a7f38015-0350-47c9-b074-715afcc10204', 'a83f6ac3-472d-402b-8132-6d1a5808996b', 'a893807c-821a-48ae-895f-29fc831ad14e',
    'a8955360-0910-4753-b876-33afe744b581', 'a8969406-4718-4a4a-a271-7d2b85a7f4c1', 'a8a6c5ac-0587-4bce-8e73-f53419ced9d6', 'a95ee4c1-df1f-44ad-85fa-17bd02956a9a',
    'a96dd140-8924-4cba-b4ad-5719471dab10', 'a99e9745-14d3-4b2d-8f81-f6d2dc7a28a5', 'a9ba5c91-2f9f-4e0e-9516-b5678cfeb62b', 'a9cf0d63-2bc4-4f40-abcc-65b7d64a7ae1',
    'a9db0385-7c11-46d2-89a2-e8b2af76e615', 'a9f3093c-406a-4ea2-8ed5-3a550dd460cb', 'aa49a927-1561-4551-b643-a19e15effc89', 'aa66134d-2084-4029-ba71-2b9f69e9494d',
    'aa6b4ee3-0d38-4a7f-9a55-7da6849fc2e4', 'aa7af2e2-20e3-4e0e-96dc-bce78bfe1e78', 'aaccc68a-380d-487b-b1d3-f5f6a83742bc', 'ab81d5bb-977e-463d-b478-457c17df7856',
    'abea9f65-6ade-428a-8350-d97133e254a6', 'ac705c5c-f598-4e35-8746-0419f118f163', 'ac76149b-f9ec-4ffa-a611-90d701bae49c', 'acb40dc9-481c-4a85-bcb8-0cf5dc1f8d37',
    'acc9cf09-6a97-4f55-b7da-573fb7e3afc1', 'acc2a772-d754-43b2-9bcd-d902a7ea0b98', 'acda988a-a0b4-4308-8ec7-d7fe2993bbec', 'acebd19b-c578-4949-b34a-543af8c30fd8',
    'acf984e2-7d3f-4724-8f0a-8e76c9167581', 'add467d2-2f81-45b4-b3c9-5389e82e6a55', 'ae103116-f802-4b4f-8293-05d1e1d70825', 'aeba5d5d-d14f-462b-8291-f98c7b695cd7',
    'af156f9b-a3e3-415f-848b-563f91bb8957', 'af3f3ce7-1a86-471f-8b46-9a89236c5339', 'af4df535-d97c-4d0f-a6ef-21303dd9e3d4', 'af6d6517-ebde-4c4c-a230-99d9d5153a79',
    'b06d174d-5c3c-4ec8-80f8-e88ce1f1e4d2', 'b07248f4-50c8-4593-a799-1a0378fdb892', 'b09d1a2f-abf5-459b-bdd5-ada34259b26d', 'b0ecdf77-af94-4508-9a08-1a5e1e7cf083',
    'b13b5990-9686-4bd0-bed3-bae386006b86', 'b15134f7-c134-4844-a67f-0691057bc9f6', 'b182d00b-da23-40b6-81e2-225a2eb01d6a', 'b18da7b6-a985-4c09-af14-383161c53ffe',
    'b1957df7-fe15-46ba-8021-3de90c3a2363', 'b1d6d47a-3a0b-47e3-b4c5-30de1d70825d', 'b2311917-1070-4612-a385-68646dcea44c', 'b2342276-5dab-43ca-b499-a0950ae79eeb',
    'b246b77e-cb49-463e-8d56-4ff93c9a676a', 'b2a0969b-f098-4015-add1-e10c6cd9f4cc', 'b2be4f72-1c9f-45d8-8e14-1397bf11bf39', 'b3d1304b-5c21-46ab-bf7e-ac0f3a80d9aa',
    'b3df4a91-0155-4667-a3d0-83999771f0b9', 'b3f00614-85b8-4320-a467-5070143d1824', 'b3fb1aef-1c78-4da2-b6af-2b474d1aaa0b', 'b439870b-6f3d-41f1-b6ba-f680ce14a477',
    'b472c67f-0baf-45cd-b2e6-f691d0b01236', 'b48cb8b2-4345-4611-bce3-c15113c3c888', 'b495af6b-33f5-4370-bce3-4623370de477', 'b4effedf-b5b0-44a1-b7f2-a105c7f69e4f',
    'b51ecae3-da35-4d80-bf3e-18390107f118', 'b5505fb6-bfc0-468e-80e8-71992cccbe8b', 'b5d51a18-5294-4264-9e07-1646ed374ebf', 'b5e51127-e236-4986-9c82-12f4e0ee09fa',
    'b619f181-cfe7-48dd-9017-49ce6727df8e', 'b67fcfa3-1788-4304-8a71-1fd7ccf51fb1', 'b6f3417f-b94a-435f-9109-4bae5e6f035e', 'b75cb64a-cb4b-4034-af52-b8bab10ad40d',
    'b77c4fd6-5402-4df7-aecc-829a9a7e09e1', 'b788647e-bbb2-48b0-ace0-8ebadb9fa35e', 'b78d2100-2058-452d-9b05-52e48291dbe7', 'b7b028e6-b829-46e7-b562-d57a4e1841b5',
    'b7f4fdd5-c250-420b-b8df-a3ddce255b0d', 'b882ea22-e547-4f3b-a5e0-6c2ac48c86b2', 'b8883d17-fd94-4610-a10f-5bf037db3f73', 'b94f72de-04d5-40d7-8591-3d1c803e4e52',
    'b9a13847-dfff-4b39-a5d8-27241cb5c996', 'b9b3d4c7-ece8-4bfc-9136-db15390e5fb3', 'b9d690f9-ea1a-4348-9c33-8ea3f77cdf09', 'b9f88581-f937-49bc-97b5-c3a14b68f11d',
    'ba2aa038-b5cb-4295-bd2a-c684abe2c64a', 'ba691c22-df2a-4310-8265-7d5e2b574a02', 'ba86bb06-52d0-407f-a4de-63e80c0e7e24', 'bad1e548-f833-4584-b048-e84eab4f8727',
    'bae76640-fe57-4ce9-9391-0ccc1e175c1c', 'bb7da62a-f8a6-49d9-a32c-1a642aaa7682', 'bbe849bd-7d6b-4e02-8613-65d3312a5434', 'bc16bb2b-2d97-40bb-a9b9-d8ab38f61d0b',
    'bc1349c4-7f2b-43e0-b81e-9de7c43bfade', 'bc1d502b-e1f5-4e6f-a3f8-4d09ff713dbc', 'bc28d429-e864-4188-9c4e-26836b02121e', 'bc7cc6a4-7457-40c3-a1ae-dda4ab97ae9b',
    'bd00c994-2990-4d5a-94da-afc5f0d16a56', 'bd19f1d2-8c02-4ce4-885e-7e3927ec05f5', 'bd3fa0b7-d6e6-49e7-9df7-e2a36952df2f', 'bd3eca99-a781-4903-b0be-6c50dd245b29',
    'bd76ab59-7606-406b-b3f6-b5d6a7d73b85', 'bd714100-eac2-40ac-8675-e1651d0e9675', 'bda7b3f4-d929-4f11-8774-5327440245fb', 'be027b06-88fd-4f96-a802-20169d7d2b19',
    'beb8eaef-6724-4368-bf16-aaf0c7e87601', 'bf045f96-bcd4-4487-b28e-f7808ae36c7c', 'bf0fa86a-5f71-490f-9288-fada7221160f', 'bf7bc5ed-608b-4522-86b3-f139eb16848b',
    'bf8e420d-d4b9-4695-85d6-2a5b33814875', 'bfbdf796-83ea-44ce-8ddf-37a990b07814', 'c07229bf-e210-44ab-9969-2e5e94b3e331', 'c082bad0-33f8-48fa-ba4d-888094a8b158',
    'c09887ef-4358-40ab-8396-abd7fa11d2ff', 'c0f063c4-56cf-450f-bacb-95e1ec9c33a8', 'c10b6272-4052-4c00-8df0-5ca03ea43b29', 'c10c98ea-9555-469a-921c-22c2943c97d3',
    'c14f7924-9790-44c6-9e78-0fbf2a446e1a', 'c1545673-877c-413d-a51a-58facadce18e', 'c15a7eb4-3fa9-42e2-b894-75dff8c973b1', 'c1c688fe-73cd-4735-bacb-498d56627078',
    'c1d74827-a7d2-4855-9d19-724da9306a55', 'c24c59cb-1825-4d0c-823a-fefb03ea66ae', 'c29f755a-a003-4939-8478-dec1bc92e347', 'c2d09587-6957-48a2-8bee-8dc98ba26414',
    'c2e3fe82-d4d7-4e28-b776-44bf08bcd12a', 'c2eb31ad-7ed8-459a-9a61-be8a8b2eff19', 'c3214e83-4eae-4726-b2d3-8b4c14e5e956', 'c3775c53-9102-4627-8e2b-0cc706bb0211',
    'c39c0b55-7845-4866-84f7-0487b7ba6960', 'c3c01af6-6222-45b0-b946-67acb843eba0', 'c418df64-ef50-4c39-8e46-6e4fcb0cf880', 'c47e99e0-1417-4470-a4e0-ae16e543a9e7',
    'c4876fa1-73e4-45e7-beb0-8e94a644b080', 'c48c831c-0420-49b3-9dc8-8039eca3ef82', 'c5445672-537b-45a2-9613-31edbbe9a2eb', 'c571e93d-586f-44c8-958d-835349f7e971',
    'c6071fb0-a2c7-487e-a6c7-88864f9d09e8', 'c6572a6d-aca0-4976-ac9d-f7bb40c87c5d', 'c6f91f31-a038-410a-a20a-c3dccd1eafd9', 'c7156bee-7eff-4467-8cb0-01f7c67a57ac',
    'c7471777-bcd1-4e41-9a6a-c630e9e5f4de', 'c771be3b-e71b-41f2-b821-28e574a38f7e', 'c7ac24b2-1ec0-45fc-a4c8-3d172dcf3192', 'c7e1be1e-3c99-46cb-9727-6939dab9772a',
    'c864e6a9-59ed-4ffa-b4b1-a89069fccf50', 'c88c95d8-ff0f-4476-bbb0-6df8667f09d9', 'c89b9782-6642-4b14-b78b-15998d4c3458', 'c8a83f82-dd39-453b-89e0-e615f9416549',
    'c913b456-fe9b-447b-a855-e68ce6121c17', 'c9809a6a-aae6-4d3a-a212-3c1af7fcee97', 'c97538ff-e56c-4c19-90e3-4f7a51bfbf97', 'c9a981b2-d8ac-4bbb-9278-f601a0165e68',
    'c9b5d16d-672c-4066-a6b3-6ce4010ef75e', 'c9dd90e7-e188-4527-948d-ad01147c5cc3', 'c9f5a556-3699-4471-b25a-59121debf8bd', 'ca4f409f-bde6-4099-bf9c-695132e44f1e',
    'ca729cb5-0349-457e-84f0-973c41155f02', 'cac476ac-478e-45bb-a20d-1d9b1f08dae0', 'cac61623-6728-4428-8756-ee3960298315', 'caefc6d9-d96f-4b59-800d-aea9b9276443',
    'cb30c773-499a-429b-86a7-d7759b21ac37', 'cb6656b0-276a-4a06-9f01-48025097859e', 'cc3efdf1-071e-4c86-817f-f22339238732', 'cc6bf49d-0320-44c3-893e-8393bd6bc8f6',
    'cc875b42-343f-452c-b964-5732cf649c44', 'cccaec8c-a799-4454-b70d-a4eeecb4f75a', 'cd446f9d-34c7-4bf9-8e42-1f711cb3bd49', 'cd97ac21-d7e2-4c30-81eb-1cd8f4beabc9',
    'cd9cfae5-e9e1-43cc-b33e-24f60e6450c6', 'ce865cc5-ce9f-48bb-862a-5b2556a7095c', 'ceb720e3-82a7-40c7-a9cb-a83745ebcd1d', 'cf118e22-7e9c-4c83-a677-38d3adc357bd',
    'cf3ad4e4-15f9-4041-8cdb-92c235dd9047', 'cf6176ae-05da-403f-a476-b7376afdb17f', 'cf91b22a-033f-4f00-9d72-9d7eb5275099', 'cfce80b2-68b5-47e9-ac0b-6c83efb6b482',
    'd0035eec-1d85-465b-bb2a-c6ae8dbe814a', 'd01bc8f0-04c8-4e55-9d23-47efc41d5dbd', 'd083d15e-59fa-42c1-b136-24776ddc2d03', 'd096d5d1-0e78-4930-abad-b7f51ccae000',
    'd0c7f464-1273-40b6-b05a-f74bce10351c', 'd0de97e0-cabe-4910-a006-97f74da644f8', 'd0e22222-8074-42fb-b927-0e6b81671f96', 'd1166dd8-59e8-48d4-9356-095eff99cdea',
    'd1198f0e-13e9-49c2-9166-3cc19f9c9eb2', 'd17e5ee8-c73f-4302-82d1-97bc855aeece', 'd17972ce-bd1e-4513-abf3-698e55eb99da', 'd1946303-bf03-427c-a257-730a56dfabd7',
    'd1c3acea-2643-4962-b708-51ef5ec4e870', 'd25401d5-58a0-45c3-8805-4933d85a0363', 'd25fdb90-adee-4cea-8487-20279a3f10f4', 'd2682fc2-bcb2-4697-9ac8-2df271cf8d33',
    'd26e8b24-7c34-4f6b-8cb1-a6c6e542eec6', 'd2a12914-7dec-41f8-9eb9-5d6b044311d6', 'd2a0f824-deab-4eac-9399-05d3cfa6a3bf', 'd2e3c40b-8bb0-4fa5-8700-8b2fd57f334b',
    'd3375d31-9d2b-46e1-b731-cfa35a324aa7', 'd3659cdc-656f-49d1-8f1a-002abb628997', 'd38e9df6-b76f-4eaa-baa9-0493bbc48cd3', 'd3f5d812-5ec2-4cb0-89fa-64e2c3bf0991',
    'd4fa02bf-8250-4c60-ae04-758261ca8baa', 'd62cb875-384e-4df9-b392-49acf9ac5265', 'd63c4d3f-e68b-478b-90f0-c3385dfcbe80', 'd679098a-b9ef-43e4-8529-23b9c4bd9bf4',
    'd6a09bf7-c9ad-4491-802a-00e5f71aa1fe', 'd6c41702-5f04-42f3-9908-929ab1e2d4ee', 'd6fed4ce-9b80-493a-8b59-b10727ee7544', 'd76a373f-f6cc-473a-9079-3131b3d66967',
    'd7851912-f85a-42ac-b59f-286f960976e0', 'd7a7ccdb-9cb8-4d9c-ae14-49c42fc1e1ee', 'd7b682d1-dcc2-4cd4-9e77-1eb61cc7357e', 'd7e7f00d-42cb-4120-bec6-47d0fece8358',
    'd8223a64-618e-49ac-b7f6-6366798720ce', 'd83b367a-9038-41af-8020-390b36836975', 'd858e16d-2edf-40ae-836d-effb27e524cd', 'd89afc33-fd08-4eaf-9284-39844b4880a9',
    'd8b64604-d506-4c38-99cb-ac945db3624a', 'd9342cf8-2223-4c77-86fa-84545a4daef8', 'd93bf512-7bd4-4005-969d-d47f7bc65dd5', 'd93c7408-061a-411e-b728-a3bb57cd40fb',
    'd9b5fd5e-ad40-4b7f-80fc-ed16579b001c', 'd9c2e47a-460b-4abc-86ab-d078e1a0e7bd', 'd9e3af68-2bff-4cf8-8c38-f1879e697a45', 'd9f803e6-52cc-4002-ab2a-047db82f011f',
    'da1d6b40-7f15-4762-b94d-bbee3441788d', 'da9955ab-5317-4af9-8d8b-2c68a3dadd64', 'db135c84-8e80-448b-9cc6-281366d7e422', 'db158d00-73f2-48b6-85ef-b671ce25d835',
    'db24a0cf-37b3-4974-bc55-6afcd4d6f9f5', 'db64de8b-7e45-4cb6-b9fa-76e591b67b4a', 'db7e2a14-50ce-47e5-8a23-b487cc2d9b0b', 'dbc2cac6-fb39-46ac-82f5-f679737ca0ce',
    'dbd65543-c42c-4933-9e15-f2e2bc87ecd9', 'dbddf4cf-2515-45d2-bbd0-e6c3f3008484', 'dbf5fa3b-f0ac-47fb-8562-d29c3e8594c2', 'dc21e0bb-b2ec-4498-8b09-2b73d3b07035',
    'dc63a8c9-f9f2-4250-b67f-f2e0f5a330f6', 'dc647a19-4e85-46bf-8647-393ef2261b4d', 'dca4ccc1-cc9b-49c7-b912-aa8ed20c7da5', 'dd86b44c-4347-450f-a261-eeb623e9a1a8',
    'dd953682-b9ca-4fbf-bf92-44da0895a895', 'dd9c4170-d341-4def-b8c9-6e7c25d22c84', 'ddc16128-448a-44eb-8b58-9264dbb45460', 'dddf2630-cfc3-47d9-b92b-a0f8fb9d7eed',
    'de9c6540-17c4-4d5e-9938-59d33d188ddd', 'debccd72-1abd-4d7a-9668-068c60268bb3', 'deed6efe-8e1f-4661-b762-fdd9613bb469', 'dfb1fde6-45ba-468e-86f7-f09aa9bc3bfe',
    'dfd483d4-71e4-48e1-854f-738f71d82ba6', 'e06332e4-0aae-43a6-a096-73755310f2cc', 'e0b516b8-6f7c-4aba-91e1-0dcedfacf761', 'e109f323-55e0-4b10-bdda-70b8131b25a4',
    'e15644f2-3d33-428a-bf88-a142694d3261', 'e1b676b3-a143-4375-949f-7af7b99153e7', 'e1d4edc6-9c31-4b3f-bab0-3d7075d33c6a', 'e24daffa-965d-4daa-9acc-83cd40c4d411',
    'e277b968-af01-4a0b-b4d0-845619723839', 'e293113f-e907-4674-8031-5d31068240c6', 'e2ea396f-208b-4d55-a16d-8bf8efdbd300', 'e31a0d42-45e2-4cfc-bed1-29d6d0c0d7cd',
    'e35085ef-ebf3-450a-a860-df079ea3a42f', 'e3f747d5-d369-4a0c-82ff-77383767b386', 'e422ddd3-256e-4d20-897e-5fbc3b5a57ba', 'e466aee1-9da4-4aaf-885a-d2b1c26ed6b7',
    'e46f17e7-7d13-43ad-88a3-1455445f05f5', 'e4b4211d-515f-4a48-98eb-bbc8d3bbc62f', 'e4e383dd-8f39-4a98-bc95-c26f353cada6', 'e4e528a2-72c1-403a-8468-9b694935cdea',
    'e508540c-7b4b-4166-947c-e5c4ad68205a', 'e501c06a-15e3-4b49-8cf6-79a9b3896f29', 'e5205974-591f-4bdb-9d71-96d8a9b60429', 'e54b9ec0-f58b-49e3-843b-9b092de4ab6c',
    'e586580d-7650-47fc-8238-aa94597f9079', 'e5ba202d-c1c6-4a1f-a967-0d373130a778', 'e600492c-2639-489d-8008-5de80135a620', 'e6abf677-ef55-4ae0-a1cc-a715f71dea4b',
    'e6e372b0-e1d1-4d7d-bb45-2234c92bc80d', 'e785c50f-42b3-4c97-ac7a-098ded56a2a8', 'e79a6196-90f5-408c-a790-c8ed5184ae15', 'e7970a93-9b10-4951-8eb8-f50123003209',
    'e814a9b4-c2db-4aa2-961b-b0cf226d61c0', 'e8994a91-a4f2-4e3d-9725-79395dd5510c', 'e9bf1b43-e552-4680-836d-c1202e04421b', 'ea04ae5b-58da-42e1-ae25-4880bb55229e',
    'ea0ac05e-dbf7-4cf2-b4ac-ddaa1c1ec393', 'ea8e9ae9-b4c9-40c9-8865-dad35597a275', 'ea7d9bbc-0c4b-47db-b87e-dac26d66f349', 'eafc5da1-1ac3-49e6-a52b-102088fd516e',
    'eba0084d-6442-4b8d-8deb-18b2f4fe3bc9', 'ec19416c-866a-4ec6-82d1-33dead7e38d6', 'ec506348-fb06-483c-acc2-480fcb66e9fa', 'ec5593a9-b4bb-49b8-93a4-e7f5c9e6d99b',
    'ec71147d-552f-4959-bfa1-e07ab1c010fb', 'ecc1289f-6a60-42ee-af76-58bdc9c974a0', 'ece3b65b-5cec-4080-856c-3dc9e1a67891', 'ed9cc6d2-1774-4ca8-8935-aab4e4e7cd07',
    'edb66b39-3d2a-41e0-9f3f-4919939573bb', 'edbde11c-5c3b-449d-97cb-52dfa73674c9', 'ee03439d-6862-4b59-af84-3f6668496db0', 'ee02943b-a9b1-48ee-915b-91c3be146523',
    'ee4b5625-a73a-4f5b-b430-3a65ecd51714', 'ee7b17f5-ba06-4f22-9cdd-e68eee447ea3', 'ee8d7825-e19f-42ae-b37e-e7913cc14151', 'eed50884-15c4-40dd-8e43-aa3e5cf4b38b',
    'ef4c61eb-c794-450e-b4c4-30454483e4cc', 'ef63056e-1483-4947-b9b1-d0702701ff97', 'efee2f4a-69c7-4ffa-b514-231083c00421', 'eff47ff7-eeac-4d55-bb44-71f88dbfc3b5',
    'f00d56b1-fbca-4364-8863-f9959af16561', 'f07d887f-eb8e-4893-a2c3-a5e5947a3c6a', 'f13ae585-a08a-4500-933a-56ea70c5174b', 'f17e64f3-890c-4a46-b7d6-139a26ecb0da',
    'f1a9ed3d-1888-497e-be90-b478282fccb9', 'f1aa9c7f-bb11-43f3-b66a-ebc92bd46276', 'f1d52acf-0376-4f5f-981a-33f9a25093f8', 'f21670d4-031b-4bbf-b8ec-05954154802f',
    'f2888556-b06c-4a3f-9dda-0197c618f5c3', 'f2aabf0d-1eab-4ed4-abd1-8ec489d931c6', 'f2d92f35-2800-443c-a84d-84f65e476aed', 'f31fc661-e519-436e-b5ec-5dc47415f9c1',
    'f3253ba7-7ce3-44ed-ba7c-30a1a781d62d', 'f3b88c09-78e6-4c05-a9d7-b1ba800a8ca5', 'f4be2f43-7616-4f2b-8e7d-38bd33493d5b', 'f52219c0-25d7-485d-b32e-7ca4db75a9c9',
    'f53d3bff-231f-4902-a473-aa402344756c', 'f55fb934-3750-470c-a719-1a827df63520', 'f57e810a-1ed5-462a-bdf5-e1bc392e2fd9', 'f5b40b80-a674-484c-8db8-2d6b51da5f04',
    'f5d9d92b-5d8b-46cc-81c9-d57e58ac855e', 'f6349bb6-ab62-4414-bb6a-6dcaae115033', 'f656c283-45d9-4bb7-ab33-15c72f63b04e', 'f6bc5719-ed27-468e-928c-08e8a4e66ae3',
    'f71da1a5-7dcc-40d4-8c4f-05cedd55aaa3', 'f72a79a5-9d2b-4554-8f62-8f4750cb238c', 'f7e0d0d5-77f2-4537-a595-5dec85524b0c', 'f812d3e2-f458-4879-b491-17af5ebcc3ed',
    'f84df9db-b88f-480f-aa01-91e87e352fbb', 'f856f9c7-2dab-479d-ae7c-9ceeed9fd03a', 'f87d9f7d-5c39-4824-8ea3-8490b3003722', 'f8a33cf2-3ac0-478b-918f-d91912a5c3e5',
    'f9192d03-b190-4ff2-80de-6501abf08c80', 'f9651604-8c3e-4cad-b01f-86d71013c7e1', 'f96555cd-8d62-4063-ab45-738c2a6ed7b7', 'f9a6316f-bd87-4056-b7c4-b9b4786e0a7a',
    'f9b6b318-b508-456b-af89-cbf55874a45f', 'f9d72ff9-874f-4641-a3ac-50523d19acd4', 'f9f1e12c-8324-4ceb-b809-3d7097fa16cf', 'fa1756fc-34ff-4992-9ca9-f81650d29c21',
    'fa1d2f54-20a4-4887-aabf-7e2683bff61e', 'fa42c734-f05f-4ab8-9bc2-c85563e8974c', 'fa75cef6-4230-4f3a-9ae2-4fda98ae15f2', 'fb77343b-dad2-47e4-988b-fe65e8eaad0f',
    'fbab201a-99ea-4893-8d0c-f7487f156af7', 'fbf516eb-b8fb-4b3d-b69d-26c60b414bef', 'fc09a085-2f9d-4580-9de1-e0c4b0e197fc', 'fc346ba3-9b60-462a-8eb2-89e0f7bd89ed',
    'fc52bad7-c5f8-46ec-b7f0-3d2e37fe2bcd', 'fc5c65b1-f5ba-44ab-b6c3-9d73bb92e04a', 'fc620fcb-58fb-42de-98e3-092dbf79cc7d', 'fca589d5-d296-4e17-9d41-2ce1ccc4aaae',
    'fceaa176-ce97-4a6a-83ba-0e78deb8f69a', 'fd780c2a-7fd6-403e-a07f-4647ef79972f', 'fdf10b30-5514-4831-aa3c-dd0532fa1c04', 'fe24fd40-4170-4a3b-a78e-147aa542445a',
    'fe384c1b-9cfc-4eb2-9c7e-9397ba630066', 'fe7cff4e-d06e-447f-bf64-466aa123f398', 'fecfff3b-ffb3-4c21-a1e8-68478a83acc9', 'fef92c79-094f-41ec-a4c8-cf8560f012c1',
    'ff20d13c-6f4d-4932-b013-d3529f201203', 'ffb71d7a-e2f4-4b49-9abc-ab7848d47f07'
  ]::uuid[];
  v_var int;
  v_yazilan int;
begin
  select count(*) into v_var from public.questions where id = any(v_ids);
  update public.questions
     set supheli_isaretler = coalesce(supheli_isaretler, '{}') || array['sik_ipucu_jev']
   where id = any(v_ids)
     and not ('sik_ipucu_jev' = any(coalesce(supheli_isaretler, '{}')));
  get diagnostics v_yazilan = row_count;
  raise notice 'sik_ipucu_jev: liste %, veritabanında %, yeni işaretlenen %', array_length(v_ids, 1), v_var, v_yazilan;
end $$;
