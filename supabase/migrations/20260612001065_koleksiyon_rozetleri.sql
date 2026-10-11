-- 1065: KOLEKSİYON ROZETLERİ (Ida onayı, 11 Eki 2026)
--
-- Koleksiyon Puanı 25 / 50 / 100 / 200'e ulaşınca birer rozet. Unvan, çerçeve, süs YOK.
--   koleksiyon_25  Koleksiyoncu I / Collector I          bronz  coin 10
--   koleksiyon_50  Koleksiyoncu II / Collector II        gümüş  coin 25
--   koleksiyon_100 Koleksiyoncu III / Collector III      altın  coin 50
--   koleksiyon_200 Büyük Koleksiyoncu / Grand Collector  elmas  coin 100
-- Coin mevcut 102 rozetin kuralıyla (rozet_ver; günlük tavana sayılmaz). Elmas verilmez (elmas = 0; Ida yalnız coin
-- kuralını verdi).
-- Altyapı aynı: rozet_tanimlari (yeni grup 'koleksiyon'), ölçüt rozet_olcut('koleksiyon_puani') = profiles.koleksiyon_puani,
-- verme rozet_kontrol / rozet_ver (pk (user_id, rozet) → aynı rozet iki kez verilmez).
-- Tetik: profiles.koleksiyon_puani ARTINCA (koleksiyon_yenile tek yazma yoludur) AFTER UPDATE tetikleyicisi
-- rozet_kontrol_guvenli(uid, '{koleksiyon_puani}') çağırır — olay anında, sunucuda. Bot rozet almaz (rozet_kontrol).
-- Rozetin kendisi de Koleksiyon Puanı'na girer (koleksiyon_kalemleri); zincir sonludur (sahip olunan rozet atlanır).
-- Geriye dönük: eşiği şimdiden geçmiş insan oyunculara coin'SİZ (p_coin false, p_geriye true → geriye_donuk, goruldu).
-- Geriye dönük işlem sırasında tetikleyici susturulur (app.koleksiyon_geriye) ki zincir coin'li rozet vermesin.
-- Yetki/RLS/GRANT değişmez: yeni tablo yok; create or replace yetkileri korur; tetikleyici fonksiyonu istemciye kapalı.
-- Geri alma: update rozet_tanimlari set aktif = false where grup = 'koleksiyon'; drop trigger trg_profiles_koleksiyon_rozet.

insert into public.rozet_gruplari (anahtar, sira, ikon, ad_tr, ad_en) values
  ('koleksiyon', 10, 'diamonds-four', 'Koleksiyon', 'Collection')
on conflict (anahtar) do nothing;
-- Gizli grup en sonda kalsın
update public.rozet_gruplari set sira = 11 where anahtar = 'gizli' and sira = 10;

insert into public.rozet_tanimlari
  (anahtar, grup, kademe, esik, olcut, coin, elmas, gizli, sira, ikon, cerceve, aktif, ad_tr, ad_en, aciklama_tr, aciklama_en)
values
  ('koleksiyon_25',  'koleksiyon', 'bronz', 25,  'koleksiyon_puani', 10,  0, false, 951, 'diamonds-four', null, true,
   'Koleksiyoncu I',     'Collector I',      'Koleksiyon Puanın 25''e ulaşsın.',  'Reach 25 Collection Points.'),
  ('koleksiyon_50',  'koleksiyon', 'gumus', 50,  'koleksiyon_puani', 25,  0, false, 952, 'diamonds-four', null, true,
   'Koleksiyoncu II',    'Collector II',     'Koleksiyon Puanın 50''ye ulaşsın.', 'Reach 50 Collection Points.'),
  ('koleksiyon_100', 'koleksiyon', 'altin', 100, 'koleksiyon_puani', 50,  0, false, 953, 'diamonds-four', null, true,
   'Koleksiyoncu III',   'Collector III',    'Koleksiyon Puanın 100''e ulaşsın.', 'Reach 100 Collection Points.'),
  ('koleksiyon_200', 'koleksiyon', 'elmas', 200, 'koleksiyon_puani', 100, 0, false, 954, 'diamonds-four', null, true,
   'Büyük Koleksiyoncu', 'Grand Collector',  'Koleksiyon Puanın 200''e ulaşsın.', 'Reach 200 Collection Points.')
on conflict (anahtar) do nothing;

CREATE OR REPLACE FUNCTION public.rozet_olcut(p_user uuid, p_olcut text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     where tp.user_id = p_user and t.durum = 'bitti' and tp.terk_at is null;

  elsif p_olcut in ('turnuva_ilk10', 'turnuva_ilk3') then
    -- Sıra, ödül dağıtımıyla aynı düzen (turnuva_odullerini_dagit)
    select count(*) into v from (
      select tp.user_id,
             row_number() over (partition by tp.tournament_id
                                order by tp.elendi asc, tp.elenme_sorusu desc nulls first,
                                         tp.dogru_sayisi desc, tp.user_id) as sira
        from public.tournament_players tp
        join public.tournaments t on t.id = tp.tournament_id and t.durum = 'bitti'
       where tp.terk_at is null and tp.tournament_id in (select x.tournament_id from public.tournament_players x where x.user_id = p_user)
    ) s
     where s.user_id = p_user and s.sira <= case when p_olcut = 'turnuva_ilk3' then 3 else 10 end;

  elsif p_olcut = 'turnuva_sampiyon' then
    select count(*) into v from public.tournaments t
     where t.durum = 'bitti' and t.kazanan = p_user;

  elsif p_olcut = 'turnuva_seans' then
    select count(distinct t.seans) into v
      from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and tp.terk_at is null
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
     where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
       and coalesce(array_length(m.soru_ids, 1), 0) > 0
       and (select count(distinct a.soru_index) from public.match_answers a
             where a.match_id = m.id and a.user_id = p_user and a.dogru) >= array_length(m.soru_ids, 1);

  elsif p_olcut = 'duello_son_can' then
    -- 666: puan sisteminde "Son Nefes" = en çok rozet_kil_payi_puan (3) farkla kazanılan düello
    -- (Altın Soru'suz, terksiz). Eski can maçları (puan1 boş) eski kuralla sayılmaya devam eder.
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and ((d.puan1 is null and ((d.oyuncu1 = p_user and d.can1 = 1) or (d.oyuncu2 = p_user and d.can2 = 1)))
         or (d.puan1 is not null and not coalesce(d.hakimiyet, false) and not coalesce(d.uzatma, false) and d.terk_eden is null
             and abs(d.puan1 - d.puan2) between 1 and public.ayar_sayi('rozet_kil_payi_puan', 3))
         -- 680 · Hâkimiyet: rakip eşiğin bir altındayken (bir yuva daha alsa kazanacakken) kazanmak; terksiz.
         or (coalesce(d.hakimiyet, false) and d.terk_eden is null
             and (case when d.oyuncu1 = p_user then d.yuva2 else d.yuva1 end) >= d.hakimiyet_esik - 1));

  elsif p_olcut = 'duello_geri_donus' then
    -- 666: puan maçında rakip en az rozet_geri_donus_puan_farki (10) öndeyken kazanmak; eski maçlarda can farkı.
    v_fark := public.ayar_sayi('rozet_geri_donus_can_farki', 2)::int;
    v_min := public.ayar_sayi('rozet_geri_donus_puan_farki', 10)::int;
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and (exists (
         select 1 from (
           select case when d.puan1 is null then
                    sum(case when h.can_kaybeden = p_user then 1
                             when h.can_kaybeden is not null then -1 else 0 end) over (order by h.id)
                  else
                    sum(case when h.saldiran = p_user then coalesce(h.puan_savunan, 0) - coalesce(h.puan_saldiran, 0)
                             else coalesce(h.puan_saldiran, 0) - coalesce(h.puan_savunan, 0) end) over (order by h.id)
                  end as fark
             from public.duello_hamleler h where h.duello_id = d.id
         ) x where not coalesce(d.hakimiyet, false) and x.fark >= case when d.puan1 is null then v_fark else v_min end)
       -- 680 · Hâkimiyet: bir an rakip rozet_geri_donus_yuva_farki (2) yuva öndeyken kazanmak.
       or (coalesce(d.hakimiyet, false) and exists (
             select 1 from public.duello_hamleler h
              where h.duello_id = d.id and h.hakimiyet is not null
                and coalesce((h.hakimiyet -> 'yuvalar' ->> (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end)::text)::int, 0)
                  - coalesce((h.hakimiyet -> 'yuvalar' ->> p_user::text)::int, 0)
                  >= public.ayar_sayi('rozet_geri_donus_yuva_farki', 2))));

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
             where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
               and (case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end) in (select id from ark))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
               and (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end) in (select id from ark))
      into v;

  elsif p_olcut = 'davet' then
    select count(*) into v from public.davetler dv
     where dv.davet_eden = p_user and dv.durum in ('odullendi', 'sinir_asildi');

  elsif p_olcut = 'mac_mesaji' then
    select case when exists (select 1 from public.match_messages mm where mm.user_id = p_user) then 1 else 0 end into v;

  elsif p_olcut = 'koleksiyon_puani' then   -- 1065
    select coalesce(koleksiyon_puani, 0) into v from public.profiles where id = p_user;

  else
    v := 0;   -- 'olay' ve bilinmeyenler: yalnız olay anında verilir
  end if;

  return coalesce(v, 0);
end;
$function$

;

create or replace function public.trg_koleksiyon_rozet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('app.koleksiyon_geriye', true), '') = '1' then return null; end if;
  perform public.rozet_kontrol_guvenli(new.id, array['koleksiyon_puani']);
  return null;
end;
$$;
revoke execute on function public.trg_koleksiyon_rozet() from public, anon, authenticated;

drop trigger if exists trg_profiles_koleksiyon_rozet on public.profiles;
create trigger trg_profiles_koleksiyon_rozet
  after update of koleksiyon_puani on public.profiles
  for each row
  when (coalesce(new.koleksiyon_puani, 0) > coalesce(old.koleksiyon_puani, 0) and new.koleksiyon_puani >= 25)
  execute function public.trg_koleksiyon_rozet();

-- Geriye dönük (coin'siz). Rozetin kendisi puanı artırıp bir sonraki eşiği geçirebilir → en çok 4 tur.
do $$
declare v_tur int; v_adet int; v_toplam int := 0;
begin
  perform set_config('app.koleksiyon_geriye', '1', true);
  for v_tur in 1..4 loop
    select coalesce(sum(public.rozet_kontrol(p.id, array['koleksiyon_puani'], false, true)), 0) into v_adet
      from public.profiles p
     where not coalesce(p.is_bot, false) and coalesce(p.koleksiyon_puani, 0) >= 25;
    v_toplam := v_toplam + v_adet;
    exit when v_adet = 0;
  end loop;
  perform set_config('app.koleksiyon_geriye', '', true);
  raise notice '1065 geriye dönük koleksiyon rozeti: %', v_toplam;
end $$;
