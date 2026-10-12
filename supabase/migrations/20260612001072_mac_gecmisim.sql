-- 1072 — Meydan Oku › Bitenler: bütün modların maç geçmişi tek çağrıda (Telefon denetimi 12 Eki 2026, Ida onaylı).
--
-- Eskiden Bitenler yalnız `matches` tablosunu (Klasik / Saf Bilgi) istemciden okuyordu; Düello ve Ortak Hazine
-- maçları hiç görünmüyordu, satırda mod ve tarih yoktu. "idagg 20-10 Kaybettin" gibi skorla çelişen satırların
-- kök sebebi taraf karışması DEĞİL, terktir (canlı ölçüm: 7 çelişkili satırın 5'inde terk_eden = kaybeden;
-- terk eden skoru ne olursa olsun kaybeder — kural 460). Bu fonksiyon terki ayrıca döndürür.
--
-- Dönen her satır (jsonb dizi, en yeni önce, en çok p_limit; 1..50):
--   mod      : 'klasik' | 'saf' | 'duello' | 'kasa'
--   id, tarih (bitiş, yoksa açılış), dereceli
--   rakip    : {id, gorunen_ad, gorunen_avatar, puan, acik_bot}
--   ben_skor, rakip_skor : Klasik/Saf = skor, Hazine = puan; Düello v4'te null (puan yok)
--   sonuc    : 'kazandi' | 'kaybetti' | 'berabere'
--   terk     : 'ben' | 'rakip' | null
--   duello   : yalnız Düello — {surum, bitis ('seri' | 'son_duello' | 'terk' | 'diger'), seri, seri_hedef, tur,
--               eski: surum < 4 için {puan_modu, ben, rakip} (puan ya da yuva)}
--
-- Yetki: security definer; yalnız çağıranın kendi maçları (auth.uid()); yalnız authenticated. Yeni fonksiyon —
-- mevcut RLS / GRANT değişmez. Geri alma: drop function public.mac_gecmisim(integer);

create or replace function public.mac_gecmisim(p_limit integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_lim integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_sonuc jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  with
  k as (
    select case when m.jokersiz then 'saf' else 'klasik' end as mod, m.id,
           coalesce(m.bitis, m.created_at) as tarih, m.dereceli,
           case when m.oyuncu1 = v_me then m.oyuncu2 else m.oyuncu1 end as rakip_id,
           case when m.oyuncu1 = v_me then m.oyuncu1_skor else m.oyuncu2_skor end as ben_skor,
           case when m.oyuncu1 = v_me then m.oyuncu2_skor else m.oyuncu1_skor end as rakip_skor,
           m.kazanan, m.terk_eden, null::jsonb as duello
    from matches m
    where (m.oyuncu1 = v_me or m.oyuncu2 = v_me) and m.durum = 'bitti'
    order by coalesce(m.bitis, m.created_at) desc
    limit v_lim
  ),
  d as (
    select 'duello'::text as mod, x.id, coalesce(x.bitis, x.created_at) as tarih, x.dereceli,
           case when x.oyuncu1 = v_me then x.oyuncu2 else x.oyuncu1 end as rakip_id,
           null::integer as ben_skor, null::integer as rakip_skor,
           x.kazanan, x.terk_eden,
           jsonb_build_object(
             'surum', x.surum,
             'bitis', case
               when x.terk_eden is not null then 'terk'
               when coalesce(x.surum, 0) >= 4 and (coalesce(x.v4_son, false) or coalesce(x.uzatma, false)) then 'son_duello'
               when coalesce(x.surum, 0) >= 4 and x.v4_seri >= coalesce(x.v4_seri_hedef, 3) then 'seri'
               else 'diger' end,
             'seri', x.v4_seri, 'seri_hedef', coalesce(x.v4_seri_hedef, 3), 'tur', x.v4_tur,
             'eski', case when coalesce(x.surum, 0) >= 4 then null else jsonb_build_object(
               'puan_modu', coalesce(x.puan_modu, false),
               'ben', case when coalesce(x.puan_modu, false)
                        then (case when x.oyuncu1 = v_me then x.puan1 else x.puan2 end)
                        else (case when x.oyuncu1 = v_me then x.yuva1 else x.yuva2 end) end,
               'rakip', case when coalesce(x.puan_modu, false)
                        then (case when x.oyuncu1 = v_me then x.puan2 else x.puan1 end)
                        else (case when x.oyuncu1 = v_me then x.yuva2 else x.yuva1 end) end) end
           ) as duello
    from duellolar x
    where (x.oyuncu1 = v_me or x.oyuncu2 = v_me) and x.durum = 'bitti'
    order by coalesce(x.bitis, x.created_at) desc
    limit v_lim
  ),
  h as (
    select 'kasa'::text as mod, z.id, coalesce(z.bitis, z.created_at) as tarih, z.dereceli,
           case when z.oyuncu1 = v_me then z.oyuncu2 else z.oyuncu1 end as rakip_id,
           case when z.oyuncu1 = v_me then z.puan1 else z.puan2 end as ben_skor,
           case when z.oyuncu1 = v_me then z.puan2 else z.puan1 end as rakip_skor,
           z.kazanan, z.terk_eden, null::jsonb as duello
    from kasa_maclari z
    where (z.oyuncu1 = v_me or z.oyuncu2 = v_me) and z.durum = 'bitti'
    order by coalesce(z.bitis, z.created_at) desc
    limit v_lim
  ),
  hepsi as (
    select * from k union all select * from d union all select * from h
    order by tarih desc
    limit v_lim
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'mod', a.mod, 'id', a.id, 'tarih', a.tarih, 'dereceli', a.dereceli,
           'rakip', case when p.id is null then null else jsonb_build_object(
             'id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
             'puan', p.puan, 'acik_bot', p.acik_bot) end,
           'ben_skor', a.ben_skor, 'rakip_skor', a.rakip_skor,
           'sonuc', case when a.kazanan is null then 'berabere' when a.kazanan = v_me then 'kazandi' else 'kaybetti' end,
           'terk', case when a.terk_eden is null then null when a.terk_eden = v_me then 'ben' else 'rakip' end,
           'duello', a.duello
         ) order by a.tarih desc), '[]'::jsonb)
    into v_sonuc
  from hepsi a
  left join profiles p on p.id = a.rakip_id;

  return v_sonuc;
end;
$$;

revoke all on function public.mac_gecmisim(integer) from public, anon;
grant execute on function public.mac_gecmisim(integer) to authenticated;
