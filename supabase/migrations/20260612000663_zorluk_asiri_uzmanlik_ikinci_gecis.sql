-- Jev zorluk dondurma — ikinci geçiş (araclar/jev-zorluk-dondurma-ikinci-gecis.mjs).
-- İlk geçişte edebiyat/sinema/coğrafya/genel_kültür/tarih/spor kategorilerinde "zor_bilinebilir"
-- kalan sorular çok alanlı çapa örnekli ölçütle yeniden dendi; 32 soru "aşırı uzmanlık" çıktı.
-- Silme yok; geri açmak için aktif = true yeterli. Idempotent.

update public.questions set aktif = false where aktif and id in (
  '0420ca75-c41f-41a4-9ea3-a3521558e0ec',
  '1c5540f1-6675-48ca-b313-bcec3f6cc496',
  '21386368-e2e6-4f20-8cc1-bf7639294dde',
  '25c73703-9524-4110-a8f9-fd284aa95e8a',
  '2d9f3f10-4bd9-44bc-af44-4a41d07697a7',
  '64486c32-b526-42e5-bfb1-025dc90af614',
  '6b696754-7940-4e6e-b73d-788d917e5fe0',
  '76987671-bdf9-4ffd-a85e-2f23941f7f6b',
  '88d0913c-fd52-4c64-a6bf-487648dc2b3c',
  '8f5a282d-0869-46e0-9de8-3a4f7ad0ab7e',
  '9b5f22aa-d7ef-4f40-97c3-a1d7fa0e15c5',
  '9c57f3e5-9f23-41f1-8a83-1c9ce2dedd64',
  '9dcea119-ae82-436b-9870-5e758dd9fa27',
  'a72fcc6f-9a1d-464d-a38b-de381ab0ed1a',
  'b8e75a0d-ab7e-4a1c-bc2f-8357cc88779b',
  'c1db1ff3-a1da-41c9-815d-499be23b8f02',
  'cbcc56c0-3979-4e50-9545-f2219210f2ba',
  'cba69715-b510-448a-9b65-743170ec856b',
  'd66d948f-d4a1-43ce-b7f2-566d398d8d2d',
  'dd50795f-30bc-4e7d-8bd1-6d2ff6b488f8',
  'dd0c7f1c-8a70-468b-a5ab-5ad6192918ea',
  'ddd96512-9e08-44d6-8af3-6b36c0dd61ba',
  'de34ff29-9f90-48c2-9ff1-3017144d81b7',
  'e3fb2c38-5e13-4a54-afc8-53b9b88e52bb',
  'e73ab383-d953-4f73-864b-0f63857cace9',
  'ed901387-94d6-4776-9052-f0d6a64290ff',
  'f28cf9bd-dcdb-4160-aeb3-4f9f4c0fdeae',
  'f81a8783-5305-452a-aca7-d2c593ca701a',
  'f8f3348e-d692-4653-9b33-59ed64278e58',
  'faac1f8a-8739-48ab-9622-fb7e4e10a7a7',
  'fd7c4d5c-5711-49b8-bb2e-59cfe7abd3ab',
  'ff87fa40-b2a3-409c-8f5e-fa1567ddca6e'
);
