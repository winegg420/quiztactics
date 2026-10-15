-- 1109 — ana_sayfa_ozet: devam eden maçlar + davet sayıları + ayarlar da İLK turda (Yavaş telefon paketi 2, 15 Eki 2026, Ida onaylı).
--
-- Ölçüm (CPU 6x + yavaş 4G, kurulu uygulama 2. açılış): ana sayfa 1098 özetinden sonra hâlâ 3 sıralı istek turu açıyordu —
-- (2) oyun_ayarlari, matches, duello_aktif_benim, kasa_aktif_benim, group_matches, tournaments; (3) oyuncu_kartlari (lig
-- satırları); (4) tournament_players (lobi). Her tur yavaş 4G'de ~0,5–0,8 sn. Hepsi index.html ön yüklemesiyle JS inerken
-- tek turda gelsin diye:
--   · yeni kapsam 'devam' (ana sayfada 'kabuk' + 'ana' ile PARALEL çağrılır): istemcinin bugün okuduğu satırların AYNISI.
--   · 'ana' kapsamına 'lig_kartlari': lig özetindeki satırların oyuncu kartları (oyuncu_kartlari, aynı kimlikler).
--
-- Güvenlik: yeni GRANT/RLS/politika YOK; imza aynı (authenticated, security definer). Satırlar istemcinin RLS altında
-- gördüğüyle birebir aynı süzgeçle okunur — yalnız kişinin kendi maçları (matches_select_own: oyuncu1/oyuncu2 = ben;
-- group_matches_select_own: grup_mac_uyesi_mi; duello/kasa davetleri: rakip = ben), tournaments / tournament_players /
-- oyun_ayarlari / profiles herkese açık okuma (select true) ve yalnız istemcinin zaten okuduğu sütunlar. Duello/Kasa
-- mevcut dar RPC'lerden (duello_aktif_benim, kasa_aktif_benim). Yan etkili çağrı yok.
-- Bir parça hata verirse yalnız o anahtar düşer (istemci o okumayı ağdan yapar). Geri alma: docs/ana-ozet-1109-geri-al.sql.

create or replace function public.ana_sayfa_ozet(p_kapsam text default 'kabuk')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v jsonb := '{}'::jsonb;
  v_ad text;
  v_deger jsonb;
  v_adlar text[];
  v_ben uuid := auth.uid();
begin
  if v_ben is null then raise exception 'Giriş gerekli'; end if;
  v_adlar := case p_kapsam
    when 'kabuk' then array['dm_okunmamis_sayim', 'posta_kutusu', 'coin_bakiyem', 'sezon_ozetim', 'bekleyen_davetlerim', 'bekleyen_sayim']
    when 'ana' then array['avatar_nadirlik_renkleri', 'seri_durumum', 'sezon_yolu_durumum', 'gorevlerim', 'lig_grubum_ozet', 'lig_kartlari']
    when 'devam' then array['oyun_ayarlari', 'maclar', 'duellolar', 'kasalar', 'rakip_adlar', 'gruplar', 'turnuvalar',
                            'turnuva_benim', 'lobi_sayilari', 'gelen_davet']
    else array[]::text[] end;
  foreach v_ad in array v_adlar loop
    begin
      v_deger := case v_ad
        -- tek değer döndürenler (PostgREST gövdesi = değerin kendisi)
        when 'dm_okunmamis_sayim' then to_jsonb(public.dm_okunmamis_sayim())
        when 'posta_kutusu' then to_jsonb(public.posta_kutusu())
        when 'sezon_ozetim' then to_jsonb(public.sezon_ozetim())
        when 'bekleyen_sayim' then to_jsonb(public.bekleyen_sayim())
        when 'sezon_yolu_durumum' then to_jsonb(public.sezon_yolu_durumum())
        when 'gorevlerim' then to_jsonb(public.gorevlerim())
        when 'lig_grubum_ozet' then to_jsonb(public.lig_grubum_ozet())
        -- tablo döndürenler (PostgREST gövdesi = satır dizisi)
        when 'coin_bakiyem' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.coin_bakiyem() t)
        when 'bekleyen_davetlerim' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.bekleyen_davetlerim() t)
        when 'avatar_nadirlik_renkleri' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.avatar_nadirlik_renkleri() t)
        when 'seri_durumum' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.seri_durumum() t)
        -- 1109 · 'ana': lig satırlarının oyuncu kartları (istemci cerceve.js › oyuncu_kartlari ile aynı kimlikleri istiyordu)
        when 'lig_kartlari' then (
          select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
          from public.oyuncu_kartlari(array(
            select distinct (s->>'user_id')::uuid
            from jsonb_array_elements(case when jsonb_typeof(v->'lig_grubum_ozet'->'satirlar') = 'array'
                                           then v->'lig_grubum_ozet'->'satirlar' else '[]'::jsonb end) s
            where s->>'user_id' is not null)) t)
        -- 1109 · 'devam': veri.jsx / ayarlar.js okumalarının aynısı
        when 'oyun_ayarlari' then (select coalesce(jsonb_agg(jsonb_build_object('anahtar', a.anahtar, 'deger', a.deger)), '[]'::jsonb)
                                   from public.oyun_ayarlari a)
        when 'maclar' then (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', m.id, 'oyuncu1', m.oyuncu1, 'oyuncu2', m.oyuncu2, 'oyuncu1_soru', m.oyuncu1_soru, 'oyuncu2_soru', m.oyuncu2_soru,
            'soru_ids', m.soru_ids, 'kabul_at', m.kabul_at, 'aktif_soru', m.aktif_soru, 'jokersiz', m.jokersiz,
            'p1', (select jsonb_build_object('gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar, 'acik_bot', p.acik_bot)
                   from public.profiles p where p.id = m.oyuncu1),
            'p2', (select jsonb_build_object('gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar, 'acik_bot', p.acik_bot)
                   from public.profiles p where p.id = m.oyuncu2))), '[]'::jsonb)
          from (select * from public.matches
                where durum = 'aktif' and (oyuncu1 = v_ben or oyuncu2 = v_ben) limit 20) m)
        when 'duellolar' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.duello_aktif_benim() t)
        when 'kasalar' then (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.kasa_aktif_benim() t)
        when 'rakip_adlar' then (
          select coalesce(jsonb_object_agg(p.id, p.gorunen_ad), '{}'::jsonb)
          from public.profiles p
          where p.id in (select case when (x->>'oyuncu1')::uuid = v_ben then (x->>'oyuncu2')::uuid else (x->>'oyuncu1')::uuid end
                         from jsonb_array_elements(coalesce(v->'duellolar', '[]'::jsonb) || coalesce(v->'kasalar', '[]'::jsonb)) x))
        when 'gruplar' then (
          select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'aktif_soru', g.aktif_soru, 'soru_ids', g.soru_ids,
                                                       'oyuncu_sayisi', g.oyuncu_sayisi)), '[]'::jsonb)
          from (select gm.* from public.group_matches gm
                where gm.durum = 'aktif'
                  and exists (select 1 from public.group_match_players gp where gp.group_match_id = gm.id and gp.user_id = v_ben)
                limit 20) g)
        when 'turnuvalar' then (
          select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'durum', t.durum, 'tarih', t.tarih, 'seans', t.seans)), '[]'::jsonb)
          from (select * from public.tournaments where durum in ('aktif', 'lobi') limit 20) t)
        when 'turnuva_benim' then (
          select coalesce(jsonb_agg(jsonb_build_object('tournament_id', tp.tournament_id, 'dogru_sayisi', tp.dogru_sayisi,
                                                       'elendi', tp.elendi)), '[]'::jsonb)
          from public.tournament_players tp
          where tp.user_id = v_ben
            and tp.tournament_id in (select (x->>'id')::uuid from jsonb_array_elements(coalesce(v->'turnuvalar', '[]'::jsonb)) x))
        when 'lobi_sayilari' then (
          select coalesce(jsonb_object_agg(x->>'id', (select count(*) from public.tournament_players tp
                                                      where tp.tournament_id = (x->>'id')::uuid)), '{}'::jsonb)
          from jsonb_array_elements(coalesce(v->'turnuvalar', '[]'::jsonb)) x
          where x->>'durum' = 'lobi')
        when 'gelen_davet' then jsonb_build_object(
          'mac', (select count(*) from (select 1 from public.matches where oyuncu2 = v_ben and durum = 'bekliyor' limit 50) a),
          'duello', (select count(*) from (select 1 from public.duello_davetleri where rakip = v_ben and durum = 'bekliyor' limit 50) a),
          'kasa', (select count(*) from (select 1 from public.kasa_davetleri where rakip = v_ben and durum = 'bekliyor'
                                         and created_at > now() - interval '24 hours' limit 50) a))
      end;
      -- null değer de geçerli yanıttır ("null" gövdesi); anahtar yine yazılır
      v := v || jsonb_build_object(v_ad, coalesce(v_deger, 'null'::jsonb));
    exception when others then
      raise warning 'ana_sayfa_ozet › %: % (%)', v_ad, sqlerrm, sqlstate;
    end;
  end loop;
  return v;
end $$;

-- Yetki DEĞİŞMEZ: create or replace mevcut yetkileri korur (1098: yalnız authenticated execute, public/anon kapalı).
