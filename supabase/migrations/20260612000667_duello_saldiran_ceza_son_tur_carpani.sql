-- ============================================================
-- 667 · DÜELLO: SALDIRANA EKSİ PUAN + SON 2 TUR ×2 + BOT KATEGORİ SEÇİMİ (Ida, 27 Eyl 2026)
--
--   · Kategoriyi seçen SALDIRAN, o soruyu yanlış/yanıtsız bırakırsa kategori değeri kadar
--     puan kaybeder (★ −1 · ★★ −3 · ★★★ −6). SAVUNAN hiçbir durumda kaybetmez. Puan
--     SIFIRIN ALTINA İNMEZ (taban 0) — ceza kalan puandan fazlaysa uygulanan miktar
--     kalan puanla sınırlanır (gösterilen "−N" balonu gerçekte uygulanan miktardır).
--   · Son 2 tur (varsayılan Tur 9–10, oyun_ayarlari'ndan) puanlar ×2: kazanç da ceza da
--     katlanır. Altın Soru'da çarpan da ceza da YOK (mevcut kural aynen kalır).
--   · Çarpanlı turlar/katsayı MAÇ BAŞINDA sabitlenir (puan_degerleri/yıldızlar gibi).
--   · Bot kategori seçimi: "akıllı" seçimde net avantaj artık saldıranın eksi riskini de
--     hesaba katar (değer × (2×botun isabeti − 1 − rakip oranı)). Maç sonu risk: Tur 8'den
--     sonra belirgin gerideyse (oyun_ayarlari eşiği) yüksek değerli kategoriye, öndeyse
--     güvenli (★) kategoriye yönelir. Kalkan mantığı DEĞİŞMEDİ.
-- ============================================================

-- ---------------------------------------------------------------- kolonlar
alter table public.duellolar
  add column if not exists carpanli_turlar jsonb,   -- maç başında sabit: [9,10]
  add column if not exists carpan_katsayi numeric;   -- maç başında sabit: 2

alter table public.duello_hamleler
  add column if not exists carpan numeric;   -- bu hamlede uygulanan çarpan (1 ya da katsayı)

-- ---------------------------------------------------------------- ayarlar
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_carpanli_turlar', '[9,10]'::jsonb, 'Düello: puanların çarpanla katlandığı turlar (dizi, maç başında sabitlenir)'),
  ('duello_carpan_katsayi', '2'::jsonb, 'Düello: duello_carpanli_turlar''daki turlarda puan çarpanı'),
  ('duello2_bot_risk_esik_tur', '8'::jsonb, 'Düello bot: bu turdan sonra puan farkına göre riskli/güvenli kategori seçer'),
  ('duello2_bot_risk_puan_farki', '6'::jsonb, 'Düello bot: bu kadar (ya da fazla) puan gerideyse riskli, öndeyse güvenli kategori seçer')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

-- ---------------------------------------------------------------- tur çarpanı
-- p_turlar/p_katsayi verilmezse (eski/legacy satır) canlı ayara düşer.
create or replace function public.duello_tur_carpani(p_tur integer, p_turlar jsonb default null, p_katsayi numeric default null)
returns numeric language sql stable security definer set search_path = public as $$
  select case
    when p_tur = any (select (jsonb_array_elements_text(
           coalesce(p_turlar,
                    (select deger from public.oyun_ayarlari where anahtar = 'duello_carpanli_turlar'),
                    '[9,10]'::jsonb)
         ))::int)
    then coalesce(p_katsayi, public.ayar_ondalik('duello_carpan_katsayi', 2))
    else 1
  end;
$$;
revoke all on function public.duello_tur_carpani(integer, jsonb, numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------- maç kurulumu: çarpan ayarları sabitlenir
create or replace function public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, carpanli_turlar, carpan_katsayi,
                                saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,
          public.duello_yildizlar_ic(v_p1 -> 'oranlar'), public.duello_yildizlar_ic(v_p2 -> 'oranlar'),
          public.duello_puan_degerleri(),
          coalesce((select deger from public.oyun_ayarlari where anahtar = 'duello_carpanli_turlar'), '[9,10]'::jsonb),
          public.ayar_ondalik('duello_carpan_katsayi', 2),
          p_a, 'kategori',
          now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
          v_p1, v_p2, p_onceki, 2)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $$;

-- ---------------------------------------------------------------- çözümleme (puan): saldırana eksi + çarpan
create or replace function public.duello2_cozumle(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_dc smallint;
  v_savunan uuid;
  v_c_sal smallint;
  v_c_sav smallint;
  v_d_sal boolean;
  v_d_sav boolean;
  v_idx int;
  v_o uuid;
  v_c smallint;
  v_kalkan_kat text;
  v_yildiz smallint;
  v_deger_taban int;
  v_carpan numeric;
  v_deger int;
  v_p_sal int := 0;
  v_p_sav int := 0;
  v_sal_once int;
  v_altin uuid;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'cevap' then return; end if;

  v_idx := d.tur * 2 + d.saldiri_sirasi;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  select dogru_cevap into v_dc from public.questions where id = d.soru_id;
  v_c_sal := (d.cevaplar -> d.saldiran::text ->> 'cevap')::smallint;
  v_c_sav := (d.cevaplar -> v_savunan::text ->> 'cevap')::smallint;
  v_d_sal := v_c_sal is not null and v_c_sal = v_dc;   -- Yanıtsız = doğru değil
  v_d_sav := v_c_sav is not null and v_c_sav = v_dc;
  v_sal_once := case when d.saldiran = d.oyuncu1 then coalesce(d.puan1, 0) else coalesce(d.puan2, 0) end;

  if d.uzatma then
    -- Altın Soru: puan yok, çarpan/ceza yok; yalnız biri doğruysa o kazanır.
    v_altin := case when v_d_sal and not v_d_sav then d.saldiran
                    when v_d_sav and not v_d_sal then v_savunan end;
  else
    select e ->> 'kategori' into v_kalkan_kat
      from jsonb_array_elements(case when v_savunan = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end) e
     where (e ->> 'idx')::int = v_idx limit 1;
    -- Değer: savunanın (rakibin) maç başında sabitlenen kategori yıldızı; son 2 turda ×çarpan (667).
    v_yildiz := coalesce((case when v_savunan = d.oyuncu1 then d.yildiz1 else d.yildiz2 end ->> d.kategori)::smallint, 2);
    v_deger_taban := coalesce((d.puan_degerleri ->> v_yildiz::text)::int, (public.duello_puan_degerleri() ->> v_yildiz::text)::int);
    v_carpan := public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi);
    v_deger := round(v_deger_taban * v_carpan)::int;
    -- 667: saldıran yanlış/yanıtsız → kategori değeri kadar kayıp (taban 0'da durur); savunan hiç kaybetmez.
    v_p_sal := case when v_d_sal then v_deger else greatest(-v_deger, -v_sal_once) end;
    v_p_sav := case when v_d_sav then v_deger else 0 end;
  end if;

  update public.duellolar
     set puan1 = greatest(0, coalesce(puan1, 0) + (case when oyuncu1 = d.saldiran then v_p_sal else v_p_sav end)),
         puan2 = greatest(0, coalesce(puan2, 0) + (case when oyuncu2 = d.saldiran then v_p_sal else v_p_sav end)),
         dogru1 = dogru1 + (case when (oyuncu1 = d.saldiran and v_d_sal) or (oyuncu1 = v_savunan and v_d_sav) then 1 else 0 end),
         dogru2 = dogru2 + (case when (oyuncu2 = d.saldiran and v_d_sal) or (oyuncu2 = v_savunan and v_d_sav) then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'surum', 2, 'tur', d.tur, 'saldiri_sirasi', d.saldiri_sirasi, 'uzatma', d.uzatma,
           'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'dogru_cevap', v_dc,
           'yildiz', v_yildiz, 'deger', v_deger, 'carpan', coalesce(v_carpan, 1), 'altin_kazanan', v_altin, 'kalkan', v_kalkan_kat,
           'puanlar', jsonb_build_object(d.saldiran::text, v_p_sal, v_savunan::text, v_p_sav),
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan, kalkan,
                                      yildiz, deger, carpan, puan_saldiran, puan_savunan, altin_kazanan)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          false, null, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null, v_kalkan_kat,
          v_yildiz, v_deger, coalesce(v_carpan, 1), v_p_sal, v_p_sav, v_altin);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $$;

-- ---------------------------------------------------------------- bot kategori seçimi: eksi risk + maç sonu risk
create or replace function public.duello2_bot_kategori(p_id uuid, p_bot uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_kat text;
  d public.duellolar%rowtype;
  v_rakip_oran jsonb;
  v_rakip_yildiz jsonb;
  v_carpan numeric;
  v_r double precision := random() * 100;
  v_akilli double precision := public.ayar_sayi('duello2_bot_zayif_secim_yuzde', 65);
  v_guclu double precision := public.ayar_sayi('duello2_bot_guclu_secim_yuzde', 20);
  v_fark int;
  v_risk_tur int := public.ayar_sayi('duello2_bot_risk_esik_tur', 8)::int;
  v_risk_fark int := public.ayar_sayi('duello2_bot_risk_puan_farki', 6)::int;
  v_risk_modu text := 'normal';
begin
  select * into d from public.duellolar where id = p_id;
  v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
  v_rakip_yildiz := coalesce(case when d.oyuncu1 = p_bot then d.yildiz2 else d.yildiz1 end, '{}'::jsonb);
  v_carpan := public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi);

  -- 667: maç sonu risk — Tur risk_tur'dan sonra belirgin gerideyse yüksek değerliye (★★★/×2), öndeyse güvenliye (★).
  if not d.uzatma and d.tur > v_risk_tur then
    v_fark := (case when d.oyuncu1 = p_bot then coalesce(d.puan1, 0) - coalesce(d.puan2, 0)
                     else coalesce(d.puan2, 0) - coalesce(d.puan1, 0) end);
    if v_fark <= -v_risk_fark then v_risk_modu := 'riskli';
    elsif v_fark >= v_risk_fark then v_risk_modu := 'guvenli';
    end if;
  end if;

  if v_risk_modu = 'riskli' then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by coalesce((v_rakip_yildiz ->> k)::int, 2) desc, random() limit 1;
  elsif v_risk_modu = 'guvenli' then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by coalesce((v_rakip_yildiz ->> k)::int, 2) asc, random() limit 1;
  elsif v_r < v_akilli then
    -- 667: net avantaj artık saldıranın eksi riskini de sayar: değer(çarpanlı) × (2×botun isabeti − 1 − rakip oranı).
    select z.k into v_kat from (
      select k from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k)
       order by (coalesce((d.puan_degerleri ->> coalesce(v_rakip_yildiz ->> k, '2'))::numeric, 3) * v_carpan)
                * (2 * public.bot_kategori_isabet(p_bot, k) - 1
                   - coalesce(case when jsonb_typeof(v_rakip_oran -> k) = 'number' then (v_rakip_oran ->> k)::numeric end, 50) / 100.0)
                desc, random()
       limit 2) z
     order by random() limit 1;
  elsif v_r >= v_akilli + v_guclu then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by random() limit 1;
  end if;

  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by public.bot_kategori_isabet(p_bot, k) desc, random()
     limit 1;
  end if;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
     order by random() limit 1;
  end if;
  return v_kat;
end $$;

-- ---------------------------------------------------------------- durum: çarpan bilgisi + geçmişte çarpan
CREATE OR REPLACE FUNCTION public.duello2_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_savunan uuid;
  v_ben1 boolean;
  v_idx int;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_sayim jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.tur * 2 + d.saldiri_sirasi;

  -- Soru iki oyuncuya AYNI ANDA görünür: yalnız cevap/sonuç fazında (saldıran önceden görmez).
  if d.soru_id is not null and (d.faz in ('cevap', 'sonuc') or d.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me),
                              'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.duellolar x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  if d.durum = 'bitti' then
    v_odul := jsonb_build_object(
      'lig_puan', case when d.dereceli and d.kazanan = v_me
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int else 0 end,
      'coin', coalesce((select sum(h.miktar) from public.coin_hareketleri h
                         where h.user_id = v_me and h.tur = 'mac' and h.referans = 'duello:' || p_id::text), 0));
  end if;

  -- Maç sonu özeti: her soru, doğru cevap ve "şık işaretlenmedi" (yanitsiz) bilgisi.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'uzatma', h.uzatma, 'kategori', h.kategori, 'saldiran', h.saldiran,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', case when h.saldiran = v_me then h.cevap_saldiran else h.cevap end,
             'ben_dogru', case when h.saldiran = v_me then h.dogru_saldiran else h.dogru end,
             'ben_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_saldiran else h.yanitsiz_savunan end,
             'rakip_dogru', case when h.saldiran = v_me then h.dogru else h.dogru_saldiran end,
             'rakip_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_savunan else h.yanitsiz_saldiran end,
             'yildiz', h.yildiz, 'deger', h.deger, 'carpan', h.carpan, 'altin_kazanan', h.altin_kazanan,   -- 666/667
             'benim_puanim', case when h.saldiran = v_me then h.puan_saldiran else h.puan_savunan end,
             'rakip_puani', case when h.saldiran = v_me then h.puan_savunan else h.puan_saldiran end,
             'kalkan', h.kalkan, 'savunan', h.savunan) order by h.id), '[]'::jsonb)   -- 650: kalkan
      into v_gecmis
      from public.duello_hamleler h
      join public.questions q on q.id = h.soru_id
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on true
     where h.duello_id = p_id;
  end if;

  select coalesce(jsonb_object_agg(s.kategori, s.n), '{}'::jsonb) into v_sayim
    from (select h.kategori, count(*) n from public.duello_hamleler h
           where h.duello_id = p_id and not h.uzatma group by h.kategori) s;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0),
                            'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_idx;

  v_kilit := case
    when d.faz <> 'cevap' or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar <> '{}'::jsonb or v_ilk is not null
      or exists (select 1 from public.skill_ikinci_sans_denemeleri s
                  where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx)
      then 'Cevap verildikten sonra soru değiştirilemez'
    when v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 2,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'uzatma', d.uzatma,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),   -- 325: yanıtın çıktığı an
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan1, 0), 'yildizlar', d.yildiz1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan2, 0), 'yildizlar', d.yildiz2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'puan_degerleri', coalesce(d.puan_degerleri, public.duello_puan_degerleri()),   -- 666
    -- 667: son 2 tur ×çarpan — maç başında sabitlenen liste/katsayı; tur_carpani = bu an geçerli çarpan.
    'tur_carpani', case when d.uzatma then 1 else public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi) end,
    'carpanli_turlar', coalesce(d.carpanli_turlar,
       (select deger from public.oyun_ayarlari where anahtar = 'duello_carpanli_turlar'), '[9,10]'::jsonb),
    'kategori_sayim', v_sayim,
    'uygun_kategoriler', case when d.faz = 'kategori' then
        (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
          where public.duello2_kategori_uygun_mu(p_id, k)) end,
    'kategori', d.kategori,
    'soru', v_soru,
    -- Rakibin CEVAPLADIĞI görünür, NE cevapladığı görünmez.
    'cevap', case when d.faz = 'cevap' then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'set', to_jsonb(public.skill_setim('duello')),   -- 327: Düello seti
       'izinli', to_jsonb(public.duello2_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan',
       'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda,
       'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb)
                      from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kategori', public.ayar_sayi('duello2_kategori_sn', 8),
       'cevap', public.ayar_sayi('duello2_cevap_sn', 15),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'sonuc', public.ayar_sayi('duello_sonuc_sn', 3),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       -- 325: sayaç bu andan önce tam süreyi gösterir (ekran fazı geç görse de hızlanmaz).
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'gosterim_bas', case d.faz
          when 'kategori' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
          when 'cevap' then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  )
  -- 666: Kategori Kalkanı — maçta 2 hak (Tur 1–pencere1: 1 açık; pencere2'ye kadar: 2, kullanılmayan kaybolmaz).
  -- kullanilan: [{kategori, idx, tur}]; kalan: şu an kullanılabilecek hak; aktif: bu seçimde korunan kategori.
  || jsonb_build_object('kalkan', jsonb_build_object(
       'acik', d.surum = 2 and public.ayar_sayi('duello2_kalkan_acik', 1) = 1,
       'son_sn', public.ayar_sayi('duello2_kalkan_son_sn', 5),
       'toplam_hak', 2,
       'pencere1_son', public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5),
       'pencere2_son', public.ayar_sayi('duello_kalkan_pencere2_son_tur', 10),
       'oyuncular', jsonb_build_object(
          d.oyuncu1::text, jsonb_build_object('kullanilan', d.kalkanlar1,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar1)) end),
          d.oyuncu2::text, jsonb_build_object('kullanilan', d.kalkanlar2,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar2)) end)),
       'aktif', public.duello2_aktif_kalkan(p_id)));
end $function$;
