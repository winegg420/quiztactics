-- ============================================================
-- 011 — ZORLUK 2 TARAMASI: AŞIRI BASİT + YANLIŞ/ÇİFT CEVAP PASİFE ALINDI (2026-10-08)
--
-- Aktif zorluk 2 soruları (2965) claude-sonnet-5-5 ile tarandı (araclar/soru-temizlik/z2-tara.mjs).
-- Kapanan: aşırı basit (güven ≥ 0.9) 51 · yanlış/çift cevap (güven ≥ 0.9) 2.
-- Liste ve gerekçeler: araclar/soru-temizlik/z2-tarama-rapor.csv. Hiçbiri SİLİNMEDİ; yalnız aktif = false.
-- Geri alma: docs/z2-tarama-geri-al.sql
-- ============================================================

update public.questions
   set aktif = false
 where aktif and zorluk = 2 and id in (
  '58dcbc2f-b5d2-4d90-8122-09bcc2fbbd7e',
  '917b70ed-43e3-41ce-bdf4-38935f825715',
  '759e4ba7-4c50-4208-aa29-1225bfe300c5',
  '5719c78e-8011-4ae3-8afa-640835c878c7',
  'f1d30c43-e4c7-4506-802c-d7e795603518',
  'b45c1333-d584-45d2-afab-4f1a18dfb993',
  '0ff63ad3-10ae-435a-a5d1-26b870ed7d4d',
  '458c6ffa-fd09-475c-81c2-ef4ad323ebce',
  '3a9ef9ca-9558-4e15-b6fe-400075ed3004',
  'c1545673-877c-413d-a51a-58facadce18e',
  'd26e8b24-7c34-4f6b-8cb1-a6c6e542eec6',
  'fbab201a-99ea-4893-8d0c-f7487f156af7',
  '175acbaa-815c-4ed3-b8c1-267bff8c5ea9',
  '5d30f47e-a6b5-459e-b4ee-429abaf225be',
  '3b994c32-e3e8-431f-9947-a1e224a62236',
  '1e98b4e6-62bf-4e0a-9945-0b08532fc976',
  '57a31a7b-0b08-4037-b83b-2c3978129d16',
  '64333163-4012-4d18-aeaf-e32f41be8bac',
  '60b48a45-c819-40a6-b865-2371305e2df1',
  '73b8dbeb-2fad-4823-b4e9-7362e2bd67f3',
  '7688e806-a953-4e06-bd46-a81b5487be20',
  'bdf1486f-995a-4cb9-9b4b-0dfb97881e7f',
  '3e521b36-56c6-4aec-80cd-dcd98c694c50',
  '4ae5186c-a4de-445a-9be7-452bc3671a40',
  '667d3653-4b29-4aff-999d-b9d49e453fe7',
  '35adc19b-6337-453f-a5d7-c2f045adb095',
  '60bc0d80-63bc-47fc-8e33-c65c7dc6ebce',
  '1044fa1f-5bb0-4ba2-bafb-81bd3f727bb5',
  'fc346ba3-9b60-462a-8eb2-89e0f7bd89ed',
  '7633c5cb-f6c5-4090-8ab3-85a73c25ba20',
  'e3067598-8f79-4911-b56d-a30d9a440a0d',
  'd3e4a9a3-f5ad-4702-8e6c-d416e661bbe0',
  '74c24233-056b-49a9-a0bd-abbff2619bc2',
  '0abd07b9-5138-40e2-b475-9da47c198587',
  'de6bd89a-76a3-445e-9356-22f1c48d5670',
  '6d809b0a-2731-4b62-8370-ed1bc39e3ac6',
  '50a17adc-1706-4ce9-ae9c-789608346c0e',
  '19fd72ec-6593-4ad0-b21a-2e17c23cc8a4',
  '75e55e32-2cbf-4fc4-beda-1ceb0b46831d',
  '183e764e-31ac-4ca1-ae4d-e71e5d50a605',
  '2d57e107-9b72-4ebb-a030-21ed243488de',
  '7f1ea8b9-0106-4f18-82d7-98642c47db9e',
  '501bcd32-263a-4548-a6d5-7e4bc26d95b1',
  '75037ff5-575a-45af-b414-37418622db69',
  'd4829cf2-3a57-4605-a4ae-653ef03e213b',
  '458f7dfe-49c8-4611-a987-81bb2ccea45c',
  'eb0ed58c-1363-4a37-9e89-80be1f8eb028',
  '1aea0c29-5c7c-42c9-bba0-ea8c42ed0058',
  '52e3181a-8526-4c6e-a107-9d1dd4fbe851',
  '230bafe7-4940-4c31-9b9d-020bf9655317',
  '00d37c42-72a4-418d-8080-73e9e8d1e70e',
  '2d74846f-3935-4980-a0d0-d239753ab194',
  '1badd06f-ace5-4cf8-a647-81021955fef7'
);
