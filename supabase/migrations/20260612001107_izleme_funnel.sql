-- ============================================================
-- 1107 İZLEME HUNİSİ (15 Eki 2026) — /yonetim/izleme › "Huni"
--
-- Tek okuma RPC'si: izleme_funnel(p_gun). Yalnız sahip (sahip_mi) — değilse 42501.
-- Yeni tablo/sütun/indeks YOK; mevcut tablolardan okur. Başka GRANT/RLS/politika değişikliği YOK.
-- Yetki: PUBLIC/anon'dan alınır, yalnız authenticated çağırabilir; içeride sahip_mi() kapısı
-- (izleme_ozeti ile aynı kalıp). Oyuncu tarafında hiçbir şey değişmez; yeni istemci olayı yok.
--
-- KOHORT: kayıt gününe (Europe/Istanbul) göre son p_gun gün (bugün dahil). HARİÇ:
--   profiles.is_bot (gizli bot) · acik_bot · arac_hesabi (1064: araçla açılan test/denetim hesabı)
--   · sahip_kullanicilar · takma_ad/gorunen_ad test desenine uyanlar (qttest|hazinetest|test|denetim).
--   Rakibi bot olan maç İNSAN için sayılır (bot yalnız oyuncu olarak hariç).
-- ADIMLAR: 1 kurulum olayı olanlar (olay_kaydi 'kurulum'; olay kaydı 14 Eki'de başladı, eski hesaplarda yok)
--   · 2 hesap/misafir = kohort (profil oluştu) · 3 >=1 maç BİTİRDİ · 4 >=2 maç bitirdi
--   · 5 D1 · 6 D7 (kayıt gününden sonraki 1./7. takvim günü, Europe/Istanbul; o gün 'giris' olayı
--   ya da maça girme; gün tamamlanmamışsa kişi paydaya girmez → taban).
-- BİTİRDİ: matches/duellolar/kasa_maclari durum='bitti' VE terk_eden boş; group_matches 'bitti' + oyuncunun
--   terk_at'ı boş; tournaments 'bitti' + oyuncunun terk_at'ı boş. TERK: kişinin kendisi terk_eden / terk_at dolu.
--   Rakibi terk edip kalanın maçı ne bitirdi ne terk sayılır. İptal/reddedildi/aktif/lobi sayılmaz.
-- Geri alma: docs/izleme-funnel-1107-geri-al.sql
-- ============================================================
create or replace function public.izleme_funnel(p_gun int default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $f$
declare
  v_bas   timestamptz := clock_timestamp();
  v_gun   int := least(greatest(coalesce(p_gun, 7), 1), 90);
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_basla timestamptz;
  v_sahip jsonb;
  v_sonuc jsonb;
begin
  if not public.sahip_mi() then
    raise exception 'Bu bilgi yalnız sahibe açık.' using errcode = '42501';
  end if;
  v_basla := ((v_bugun - (v_gun - 1))::timestamp at time zone 'Europe/Istanbul');
  v_sahip := coalesce((select deger from public.oyun_ayarlari where anahtar = 'sahip_kullanicilar'), '[]'::jsonb);

  with aday as (
    select p.id,
           (p.created_at at time zone 'Europe/Istanbul')::date as kg,
           coalesce(p.is_bot, false) as bot, coalesce(p.acik_bot, false) as acik,
           coalesce(p.arac_hesabi, false) as arac, (v_sahip ? p.id::text) as sahip,
           (coalesce(p.takma_ad, '') || ' ' || coalesce(p.gorunen_ad, '')) ~* '(^|\s)(qttest|hazinetest|test|denetim)' as test
      from public.profiles p
     where p.created_at >= v_basla
  ),
  koh as (select id, kg from aday where not bot and not acik and not arac and not sahip and not test),
  mac as (
    select m.oyuncu1 as uid, case when m.jokersiz then 'saf_bilgi' else 'klasik' end as mod,
           case when m.terk_eden is null then 'bitirdi' when m.terk_eden = m.oyuncu1 then 'terk' end as sonuc,
           coalesce(m.bitis, m.created_at) as t
      from public.matches m where m.durum = 'bitti' and m.created_at >= v_basla and m.oyuncu1 in (select id from koh)
    union all
    select m.oyuncu2, case when m.jokersiz then 'saf_bilgi' else 'klasik' end,
           case when m.terk_eden is null then 'bitirdi' when m.terk_eden = m.oyuncu2 then 'terk' end,
           coalesce(m.bitis, m.created_at)
      from public.matches m where m.durum = 'bitti' and m.created_at >= v_basla and m.oyuncu2 in (select id from koh)
    union all
    select d.oyuncu1, 'duello', case when d.terk_eden is null then 'bitirdi' when d.terk_eden = d.oyuncu1 then 'terk' end,
           coalesce(d.bitis, d.created_at)
      from public.duellolar d where d.durum = 'bitti' and d.created_at >= v_basla and d.oyuncu1 in (select id from koh)
    union all
    select d.oyuncu2, 'duello', case when d.terk_eden is null then 'bitirdi' when d.terk_eden = d.oyuncu2 then 'terk' end,
           coalesce(d.bitis, d.created_at)
      from public.duellolar d where d.durum = 'bitti' and d.created_at >= v_basla and d.oyuncu2 in (select id from koh)
    union all
    select k.oyuncu1, 'kasa', case when k.terk_eden is null then 'bitirdi' when k.terk_eden = k.oyuncu1 then 'terk' end,
           coalesce(k.bitis, k.created_at)
      from public.kasa_maclari k where k.durum = 'bitti' and k.created_at >= v_basla and k.oyuncu1 in (select id from koh)
    union all
    select k.oyuncu2, 'kasa', case when k.terk_eden is null then 'bitirdi' when k.terk_eden = k.oyuncu2 then 'terk' end,
           coalesce(k.bitis, k.created_at)
      from public.kasa_maclari k where k.durum = 'bitti' and k.created_at >= v_basla and k.oyuncu2 in (select id from koh)
    union all
    select gp.user_id, 'grup', case when gp.terk_at is null then 'bitirdi' else 'terk' end, coalesce(g.bitis, g.created_at)
      from public.group_match_players gp join public.group_matches g on g.id = gp.group_match_id
     where g.durum = 'bitti' and gp.davet_durumu = 'kabul' and g.created_at >= v_basla and gp.user_id in (select id from koh)
    union all
    select tp.user_id, 'turnuva', case when tp.terk_at is null then 'bitirdi' else 'terk' end, coalesce(t.bitis, t.created_at)
      from public.tournament_players tp join public.tournaments t on t.id = tp.tournament_id
     where t.durum = 'bitti' and t.created_at >= v_basla and tp.user_id in (select id from koh)
  ),
  mac_k as (select * from mac where sonuc is not null),
  kisi as (
    select k.id, k.kg,
           (select count(*) from mac_k x where x.uid = k.id and x.sonuc = 'bitirdi') as bitirdi,
           exists (select 1 from public.olay_kaydi o where o.kullanici_id = k.id and o.olay = 'kurulum') as kurulum
      from koh k
  ),
  ilk as (
    select distinct on (uid) uid, mod, sonuc from mac_k order by uid, t, sonuc
  ),
  etkin as (
    select o.kullanici_id as uid, (o.zaman at time zone 'Europe/Istanbul')::date as gun
      from public.olay_kaydi o where o.olay = 'giris' and o.kullanici_id in (select id from koh) and o.zaman >= v_basla
    union
    select m.oyuncu1, (m.created_at at time zone 'Europe/Istanbul')::date from public.matches m
     where m.created_at >= v_basla and m.oyuncu1 in (select id from koh)
    union
    select m.oyuncu2, (m.created_at at time zone 'Europe/Istanbul')::date from public.matches m
     where m.created_at >= v_basla and m.oyuncu2 in (select id from koh)
    union
    select d.oyuncu1, (d.created_at at time zone 'Europe/Istanbul')::date from public.duellolar d
     where d.created_at >= v_basla and d.oyuncu1 in (select id from koh)
    union
    select d.oyuncu2, (d.created_at at time zone 'Europe/Istanbul')::date from public.duellolar d
     where d.created_at >= v_basla and d.oyuncu2 in (select id from koh)
    union
    select k.oyuncu1, (k.created_at at time zone 'Europe/Istanbul')::date from public.kasa_maclari k
     where k.created_at >= v_basla and k.oyuncu1 in (select id from koh)
    union
    select k.oyuncu2, (k.created_at at time zone 'Europe/Istanbul')::date from public.kasa_maclari k
     where k.created_at >= v_basla and k.oyuncu2 in (select id from koh)
    union
    select gp.user_id, (gp.joined_at at time zone 'Europe/Istanbul')::date from public.group_match_players gp
     where gp.joined_at >= v_basla and gp.user_id in (select id from koh)
    union
    select tp.user_id, (tp.joined_at at time zone 'Europe/Istanbul')::date from public.tournament_players tp
     where tp.joined_at >= v_basla and tp.user_id in (select id from koh)
  ),
  ret as (
    select ks.id,
           (ks.kg + 1 < v_bugun) as d1_uygun, (ks.kg + 7 < v_bugun) as d7_uygun,
           exists (select 1 from etkin e where e.uid = ks.id and e.gun = ks.kg + 1) as d1,
           exists (select 1 from etkin e where e.uid = ks.id and e.gun = ks.kg + 7) as d7
      from koh ks
  )
  select jsonb_build_object(
    'gun', v_gun,
    'baslangic', (v_bugun - (v_gun - 1)),
    'haric', jsonb_build_object(
      'bot', (select count(*) from aday where bot),
      'acik_bot', (select count(*) from aday where acik and not bot),
      'arac_hesabi', (select count(*) from aday where arac and not bot and not acik),
      'sahip', (select count(*) from aday where sahip),
      'test_adi', (select count(*) from aday where test and not bot and not acik and not arac and not sahip)),
    'kohort', (select count(*) from koh),
    'adimlar', jsonb_build_array(
      jsonb_build_object('k', 'kurulum', 'n', (select count(*) from kisi where kurulum)),
      jsonb_build_object('k', 'hesap',   'n', (select count(*) from kisi)),
      jsonb_build_object('k', 'mac1',    'n', (select count(*) from kisi where bitirdi >= 1)),
      jsonb_build_object('k', 'mac2',    'n', (select count(*) from kisi where bitirdi >= 2)),
      jsonb_build_object('k', 'd1',      'n', (select count(*) from ret where d1_uygun and d1), 'taban', (select count(*) from ret where d1_uygun)),
      jsonb_build_object('k', 'd7',      'n', (select count(*) from ret where d7_uygun and d7), 'taban', (select count(*) from ret where d7_uygun))),
    'mac_oynayan', (select count(distinct uid) from mac_k),
    'ilk_mod', coalesce((select jsonb_agg(jsonb_build_object('mod', mod, 'n', n, 'terk', terk) order by n desc)
                           from (select mod, count(*) as n, count(*) filter (where sonuc = 'terk') as terk from ilk group by mod) t), '[]'::jsonb),
    'ilk_terk', (select count(*) from ilk where sonuc = 'terk'),
    'terk_toplam', (select count(*) from mac_k where sonuc = 'terk')
  ) into v_sonuc;

  return v_sonuc || jsonb_build_object('sunucu_ms', round(extract(epoch from clock_timestamp() - v_bas) * 1000, 1));
end $f$;
revoke all on function public.izleme_funnel(int) from public, anon;
grant execute on function public.izleme_funnel(int) to authenticated;
