-- ============================================================
-- 852 — genel_kultur tekrar çiftleri (2 Eki 2026, Ida kararı)
--
-- 851 taramasında raporlanan, aynı bilgiyi soran 16 aktif soru çiftinin her birinde
-- bir soru pasife alınır (neden: tekrar); çiftin diğer sorusu aktif kalır.
-- Seçim: şıkları/metni zayıf ya da cevabı belirsiz olan; eşitse id'si büyük olan.
-- Soru metni, şıklar, doğru cevap, kategori, zorluk DEĞİŞMEZ; yalnız aktif.
-- Kayıt: docs/KATEGORI_DAGITIM.md · Geri alma: docs/KATEGORI_DAGITIM_YEDEK.json
-- ============================================================

update public.questions q
   set aktif = false
  from (values
    ('05ce2d35-95f2-46de-97fc-9bb78c2522a3'::uuid),
    ('a42ca8cd-0d9c-4b21-af90-b7d3a6c2cdba'::uuid),
    ('125a0a66-dbab-48ec-884c-9323fee9c780'::uuid),
    ('a10f7bbe-7584-4dcb-b33d-486198851f2b'::uuid),
    ('179d8bb2-0d44-47c5-8cce-7083a3644af4'::uuid),
    ('2df1a1d9-efa3-455d-a8d1-20ac2bf234a9'::uuid),
    ('36013dc0-2433-41c4-83a5-2bad6ee60fd7'::uuid),
    ('d05e9c19-77a8-4a00-bf4a-22e88c8f8c39'::uuid),
    ('5353e619-e76f-4da2-8c6b-216248bbfb0c'::uuid),
    ('b35a1b34-dd62-4216-bfaf-63b4e2bdd250'::uuid),
    ('fe1c9766-317a-47b5-99a0-4cec99657ff1'::uuid),
    ('e471a907-b360-4450-8995-d535a07bd7fb'::uuid),
    ('ede85aed-0934-4e37-af96-20b2dcf05ebb'::uuid),
    ('ca88e87f-5528-4ac4-b9c1-5a353ab8b374'::uuid),
    ('45eada97-77a9-4790-a13f-512984ff3bd3'::uuid),
    ('df37de05-3b8d-4806-86b8-c132e242c120'::uuid)
  ) as v(id)
 where q.id = v.id
   and q.aktif = true;
