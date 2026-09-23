-- 325: Düello sayacı — "gösterim payı" (Ida, 23 Eyl 2026: saldırı süresinin ilk ~2 sn'si hızlı akıyor).
--
-- Ölçüm (yerel istemci + canlı DB, 1 maç, 35 faz): ekran yeni fazı sunucu başlangıcından
-- medyan 450 ms, p90 ~1,1 sn, en çok ~2,1 sn sonra görüyordu; ilk rakam bu yüzden 1 sn
-- yerine 12–650 ms ekranda kaldı (28/35 faz). Ayrıca `sunucu_zamani` = now() (işlem
-- BAŞLANGICI) olduğundan istemci saati gecikme kadar geride kalıyor, kategori sayacı
-- "9" ile açılıp 100 ms içinde 8'e düşüyordu (iki geri sayım sesi üst üste).
--
-- Çözüm: faz bitişine `duello_gosterim_payi_ms` (1200) eklenir. İstemci sayacı
-- `gosterim_bas`a (sunucu başlangıcı + pay) kadar TAM süreyi gösterir, sonra gerçek
-- zamanla akar; sayaç asla yetişmek için hızlanmaz. 1200 ms: ölçülen gecikmelerin ~%90'ı
-- + tur geçiş bandı (900 ms) içinde kalır; tur başına ~2,4 sn uzama kabul edilebilir.
-- Adalet: iki oyuncunun bitişi aynı (bitis1 = bitis2), geç cevap duello2_cevap'ta yine
-- reddedilir; pay yalnız herkese aynı ek süredir. Botlar kategori ve cevap gecikmesini
-- oyuncunun gördüğü andan sayar. `sunucu_zamani` artık clock_timestamp() (yanıtın çıktığı an).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_gosterim_payi_ms', '1200'::jsonb,
   'Düello: faz bitişine eklenen gösterim payı (ms) — ekran fazı geç görse de sayaç tam süreyle, düzgün akar')
on conflict (anahtar) do nothing;

create or replace function public.duello2_gosterim_payi()
 returns interval
 language sql
 stable
 set search_path to 'public'
as $$
  select make_interval(secs => greatest(0, public.ayar_sayi('duello_gosterim_payi_ms', 1200)) / 1000.0)
$$;

CREATE OR REPLACE FUNCTION public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_can int := public.ayar_sayi('duello_can', 3)::int;
  v_surum smallint := case when public.ayar_sayi('duello_surum', 1) = 2
                             or (public.duello_v2_test_kullanicisi_mi(p_a)
                                 and (public.duello_v2_test_kullanicisi_mi(p_b) or public.duello_bot_mu(p_b)))
                             or (public.duello_v2_test_kullanicisi_mi(p_b)
                                 and (public.duello_v2_test_kullanicisi_mi(p_a) or public.duello_bot_mu(p_a)))
                        then 2 else 1 end;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if v_surum = 2 and random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil ve en zayıf kategori MAÇ BAŞINDA sabitlenir.
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, saldiran, faz, faz_bitis,
                                profil1, profil2, zayif1, zayif2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), v_can, v_can, p_a, 'kategori',
          now() + make_interval(secs => case when v_surum = 2
                                             then public.ayar_sayi('duello2_kategori_sn', 8)
                                             else public.duello_kategori_suresi(p_a) end)
          + case when v_surum = 2 then public.duello2_gosterim_payi() else interval '0' end,   -- Paket 20 IV.3 · 325 gösterim payı
          v_p1, v_p2, public.duello_en_zayif(p_a), public.duello_en_zayif(p_b), p_onceki, v_surum)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.duello2_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_kaybeden uuid;
begin
  select * into d from public.duellolar where id = p_id for update;

  if d.uzatma then
    v_kaybeden := (d.son_hamle ->> 'can_kaybeden')::uuid;
    if v_kaybeden is not null then
      perform public.duello_bitir(p_id, case when v_kaybeden = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
    else
      perform public.duello2_uzatma_ac(p_id);
    end if;
    return;
  end if;

  if d.saldiri_sirasi = 0 then
    -- Tur çift hâlinde tamamlanır: ilk saldırıdan sonra can bitse bile ikinci saldırı oynanır.
    update public.duellolar
       set saldiri_sirasi = 1, saldiran = oyuncu2, faz = 'kategori', kategori = null, soru_id = null,
           cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
    return;
  end if;

  if d.can1 > 0 and d.can2 > 0 and d.tur < public.ayar_sayi('duello_max_tur', 10) then
    update public.duellolar
       set tur = tur + 1, saldiri_sirasi = 0, saldiran = oyuncu1, faz = 'kategori',
           kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
  elsif d.can1 <> d.can2 then
    perform public.duello_bitir(p_id, case when d.can1 > d.can2 then d.oyuncu1 else d.oyuncu2 end);
  else
    perform public.duello2_uzatma_ac(p_id);   -- beraberlik yok
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.duello2_soru_ac(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_soru uuid;
  v_kat text := p_kategori;
  v_bitis timestamptz := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15)) + public.duello2_gosterim_payi();
begin
  select * into d from public.duellolar where id = p_id for update;
  v_soru := public.duello_soru_bul(p_id, v_kat, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
  if v_soru is null and d.uzatma then
    -- Uzatmada kategori zaten rastgele: o kategoride soru kalmadıysa herhangi biri.
    select q.id, q.kategori into v_soru, v_kat from public.questions q
     where q.aktif and not (q.id = any(d.kullanilan_sorular))
     order by random() limit 1;
  end if;
  if v_soru is null then raise exception 'Bu kategoride soru kalmadı'; end if;

  update public.duellolar
     set kategori = v_kat, soru_id = v_soru, faz = 'cevap',
         soru_baslangic = now(), bitis1 = v_bitis, bitis2 = v_bitis, faz_bitis = v_bitis,
         cevaplar = '{}'::jsonb, elli1 = null, elli2 = null, elli_kapali = null,
         zaman_baskisi = false, ek_sure = false,
         soru_degisti_saldiri = false, soru_degisti_savunma = false,
         kullanilan_sorular = kullanilan_sorular || v_soru,
         son_hareket = now()
   where id = p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.duello2_skill(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_ben1 boolean;
  v_idx int;
  v_ucretsiz boolean;
  v_dogru smallint;
  v_kapali int[];
  v_soru uuid;
  v_bitis timestamptz;
  v_yeni timestamptz;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);   -- FOR UPDATE
  if d.durum <> 'aktif' or d.faz <> 'cevap' then raise exception 'Skill yalnız soru açıkken kullanılır'; end if;
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.tur * 2 + d.saldiri_sirasi;
  v_bitis := case when v_ben1 then d.bitis1 else d.bitis2 end;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > v_bitis then raise exception 'Süre doldu'; end if;

  if p_tur = 'zaman_baskisi' and d.cevaplar ? v_rakip::text then
    raise exception 'Rakibin bu soruyu zaten cevapladı';
  end if;
  if p_tur = 'soru_degistir' then
    if d.cevaplar <> '{}'::jsonb or exists (select 1 from public.skill_ikinci_sans_denemeleri s
         where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx) then
      raise exception 'Cevap verildikten sonra soru değiştirilemez';
    end if;
    if exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                 and k.user_id = v_rakip and k.soru_index = v_idx) then
      raise exception 'Rakibin bu soruda skill kullandı, soru değiştirilemez';
    end if;
    -- Yeni soru ÖNCE bulunur: bulunamazsa skill harcanmaz.
    v_soru := public.duello_soru_bul(p_id, d.kategori, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
  end if;

  perform public.duello2_skill_hak_kontrol(p_id, v_me, p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'duello:' || p_id::text);
  end if;
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, 'duello', p_id, v_idx, p_tur, v_ucretsiz);

  if p_tur = 'elli' then
    select dogru_cevap into v_dogru from public.questions where id = d.soru_id;
    select array_agg(x) into v_kapali
      from (select x from generate_series(0, 3) x where x <> v_dogru order by random() limit 2) s;
    update public.duellolar
       set elli1 = case when v_ben1 then v_kapali else elli1 end,
           elli2 = case when v_ben1 then elli2 else v_kapali end,
           son_hareket = now()
     where id = p_id;
  elsif p_tur = 'sure' then
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) else bitis1 end,
           bitis2 = case when v_ben1 then bitis2 else bitis2 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) end,
           ek_sure = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'zaman_baskisi' then
    v_yeni := greatest(
      (case when v_ben1 then d.bitis2 else d.bitis1 end) - make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_taban_sn', 3)));
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 else least(bitis1, v_yeni) end,
           bitis2 = case when v_ben1 then least(bitis2, v_yeni) else bitis2 end,
           zaman_baskisi = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'soru_degistir' then
    -- Kategori aynı kalır; yeni soruyu ikisi de görür, süre ikisi için baştan başlar.
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15)) + public.duello2_gosterim_payi();
    update public.duellolar
       set soru_id = v_soru, kullanilan_sorular = kullanilan_sorular || v_soru,
           soru_baslangic = now(), bitis1 = v_yeni, bitis2 = v_yeni,
           elli1 = null, elli2 = null, cevaplar = '{}'::jsonb,
           soru_degisti_saldiri = soru_degisti_saldiri or v_me = d.saldiran,
           soru_degisti_savunma = soru_degisti_savunma or v_me <> d.saldiran,
           son_hareket = now()
     where id = p_id;
  else   -- ikinci_sans: etkisi cevapta (duello2_cevap)
    update public.duellolar set son_hareket = now() where id = p_id;
  end if;

  update public.duellolar set faz_bitis = greatest(bitis1, bitis2) where id = p_id;
  perform public.duello_sinyal_ver(p_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.duello2_bot_skill_dene(p_id uuid, p_bot uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_idx int;
  v_rakip uuid;
  v_ben1 boolean;
  v_tur text;
  v_soru uuid;
  v_yeni timestamptz;
  v_eklendi int;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'cevap' or d.surum <> 2 then return false; end if;
  v_idx := d.tur * 2 + d.saldiri_sirasi;
  v_ben1 := d.oyuncu1 = p_bot;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;

  -- Zar: soru başına sabit tohum (Soru Değiştir sonrası aynı soru indeksinde yeniden atılmaz).
  if public.bot_rasgele('d2sk:' || p_id::text || ':' || v_idx || ':' || p_bot::text) * 100
       >= public.ayar_sayi('duello2_bot_skill_yuzde', 15) then return false; end if;
  -- Kimse cevaplamamışken (Klasik ile aynı); süre bitmemişken.
  if d.cevaplar <> '{}'::jsonb then return false; end if;
  if now() > (case when v_ben1 then d.bitis1 else d.bitis2 end) then return false; end if;
  -- Sınırlar: soruda 1 · maçta toplam · aynı skill.
  if exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
               and k.user_id = p_bot and k.soru_index = v_idx) then return false; end if;
  if (select count(*) from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
        and k.user_id = p_bot) >= public.ayar_sayi('duello2_skill_toplam_hak', 4) then return false; end if;

  select t into v_tur from unnest(array['zaman_baskisi', 'soru_degistir']) t
   where (select count(*) from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
            and k.user_id = p_bot and k.tur = t) < public.ayar_sayi('duello2_skill_tur_basi_hak', 2)
     -- Soru Değiştir: rakip bu soruda skill kullandıysa kilitli (insanla aynı kural).
     and not (t = 'soru_degistir' and exists (select 1 from public.joker_kullanimlari k
               where k.mac_tur = 'duello' and k.mac_id = p_id and k.user_id = v_rakip and k.soru_index = v_idx))
   order by public.bot_rasgele('d2skt:' || p_id::text || ':' || v_idx || ':' || t)
   limit 1;
  if v_tur is null then return false; end if;

  if v_tur = 'soru_degistir' then
    v_soru := public.duello_soru_bul(p_id, d.kategori, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
    if v_soru is null then return false; end if;   -- yeni soru yoksa skill harcanmaz
  end if;

  -- Tetikleyici (skill_kullanim_kapisi → duello2_skill_kapisi) sınırları bir kez daha uygular.
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (p_bot, 'duello', p_id, v_idx, v_tur, true);
  get diagnostics v_eklendi = row_count;
  if v_eklendi = 0 then return false; end if;

  if v_tur = 'zaman_baskisi' then
    v_yeni := greatest(
      (case when v_ben1 then d.bitis2 else d.bitis1 end) - make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_taban_sn', 3)));
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 else least(bitis1, v_yeni) end,
           bitis2 = case when v_ben1 then least(bitis2, v_yeni) else bitis2 end,
           zaman_baskisi = true, son_hareket = now()
     where id = p_id;
  else
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15)) + public.duello2_gosterim_payi();
    update public.duellolar
       set soru_id = v_soru, kullanilan_sorular = kullanilan_sorular || v_soru,
           soru_baslangic = now(), bitis1 = v_yeni, bitis2 = v_yeni,
           elli1 = null, elli2 = null, cevaplar = '{}'::jsonb,
           soru_degisti_saldiri = soru_degisti_saldiri or p_bot = d.saldiran,
           soru_degisti_savunma = soru_degisti_savunma or p_bot <> d.saldiran,
           son_hareket = now()
     where id = p_id;
  end if;
  update public.duellolar set faz_bitis = greatest(bitis1, bitis2) where id = p_id;
  perform public.duello_sinyal_ver(p_id);
  return true;
exception when others then
  return false;
end $function$
;

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
             'can_kaybeden', h.can_kaybeden) order by h.id), '[]'::jsonb)
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
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
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
       'set', to_jsonb(public.skill_setim()),
       'izinli', jsonb_build_array('elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans'),
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
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.duello2_bot_cevap_gecikme(p_id uuid, p_bot uuid)
 RETURNS double precision
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  p public.profiles%rowtype;
  v_tohum text;
  v_g double precision;
  v_sure double precision;
  v_min double precision;
  v_max double precision;
begin
  select * into d from public.duellolar where id = p_id;
  select * into p from public.profiles where id = p_bot;
  v_tohum := 'd2cev:' || p_id::text || ':' || coalesce(d.soru_id::text, '') || ':' || p_bot::text;

  if public.duello2_bot_acik_mi(p_bot) then
    v_min := public.ayar_ondalik('duello2_bot_acik_cevap_min_sn', 0.3);
    v_max := public.ayar_ondalik('duello2_bot_acik_cevap_max_sn', 0.8);
    v_g := v_min + (v_max - v_min) * public.bot_rasgele(v_tohum);
  else
    v_g := public.bot_gecikme_sn(p_bot, v_tohum, p.bot_gecikme_min, p.bot_gecikme_max,
                                 public.soru_okuma_yuku(d.soru_id));
  end if;

  -- Kişisel bitişi aşmasın (Zaman Baskısı yediyse bitiş öne gelmiş olabilir).
  v_sure := extract(epoch from (case when p_bot = d.oyuncu1 then d.bitis1 else d.bitis2 end) - d.soru_baslangic)
            - public.ayar_ondalik('duello2_bot_cevap_pay_sn', 2);
  -- 325: gecikme oyuncunun soruyu gördüğü andan (gösterim payı sonrası) sayılır.
  return greatest(least(v_g + extract(epoch from public.duello2_gosterim_payi()), v_sure), 0.3);
end $function$
;
