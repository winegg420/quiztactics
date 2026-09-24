-- ============================================================
-- 600 · DÜELLO ASILI MAÇ DÜZELTMESİ (24 Eyl 2026, canlı hata: "Devam eden bir düello var")
--
-- KÖK SEBEP (470): duello2_cozumle'de savunanın zayıf noktası yoksa (profil->>'zayif' NULL, yeni ya da az
-- oynamış oyuncu) v_zayif_saldiri NULL oluyordu; duello_hamleler.riskli NOT NULL olduğundan insert hata veriyor,
-- tur çözülemiyor. duello_tik_hepsi hatayı yalnız uyarı olarak yutuyordu → maç 'aktif' + faz 'cevap'ta asılı,
-- iki oyuncu da yeni düello açamıyor/davet edemiyordu (duello_davet_et: 'Devam eden bir düello var'). Canlıda
-- görülen: 352797a8 (silaa, 16 dk), 5df65666 (denetim, ~1 sa), fde41b07 (test hesabı).
--   1) duello2_cozumle: v_zayif_saldiri := coalesce(…, false)   (fonksiyonun geri kalanı canlı tanımla BİREBİR)
--   2) duello_tik_hepsi: ilerletme hata verir ve faz süresi 60 sn'den fazla geçmişse maç ödülsüz 'iptal'
--      (güvenlik ağı — yeni bir hata çeşidi de maçı asılı bırakmasın). Fonksiyonun geri kalanı canlı tanımla birebir.
-- Yetki/politika değişmez (create or replace mevcut yetkileri korur). Tekrar çalıştırılabilir.
-- ============================================================

CREATE OR REPLACE FUNCTION public.duello2_cozumle(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_dc smallint;
  v_savunan uuid;
  v_c_sal smallint;
  v_c_sav smallint;
  v_d_sal boolean;
  v_d_sav boolean;
  v_kaybeden uuid;
  v_idx int;
  v_o uuid;
  v_c smallint;
  v_zayif_saldiri boolean;
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

  -- 470: saldıran savunanın ZAYIF kategorisini seçtiyse (uzatma hariç — orada kimse seçmez).
  -- 600: zayıf noktası olmayan savunanda ->> 'zayif' NULL → karşılaştırma NULL → riskli (NOT NULL) yazılamıyor,
  -- tur çözülemiyor, maç 'aktif' asılı kalıyordu. NULL = zayıf yok = false.
  v_zayif_saldiri := coalesce(not d.uzatma and d.kategori is not null
    and d.kategori = (case when v_savunan = d.oyuncu1 then d.profil1 else d.profil2 end) ->> 'zayif', false);

  v_kaybeden := case when v_zayif_saldiri and v_d_sav then d.saldiran   -- savunan bildi → saldıran (ikisi doğru olsa da)
                     when v_d_sal and not v_d_sav then v_savunan
                     when v_d_sav and not v_d_sal then d.saldiran
                     else null end;

  update public.duellolar
     set can1 = greatest(can1 - (case when v_kaybeden = oyuncu1 then 1 else 0 end), 0),
         can2 = greatest(can2 - (case when v_kaybeden = oyuncu2 then 1 else 0 end), 0),
         dogru1 = dogru1 + (case when (oyuncu1 = d.saldiran and v_d_sal) or (oyuncu1 = v_savunan and v_d_sav) then 1 else 0 end),
         dogru2 = dogru2 + (case when (oyuncu2 = d.saldiran and v_d_sal) or (oyuncu2 = v_savunan and v_d_sav) then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'surum', 2, 'tur', d.tur, 'saldiri_sirasi', d.saldiri_sirasi, 'uzatma', d.uzatma,
           'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'dogru_cevap', v_dc, 'can_kaybeden', v_kaybeden,
           'zayif_saldiri', v_zayif_saldiri,
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          v_zayif_saldiri, v_kaybeden, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $function$;

CREATE OR REPLACE FUNCTION public.duello_tik_hepsi()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  d public.duellolar%rowtype;
  v_bot uuid;
  v_bot_saldiran boolean;
  v_kat text;
  v_cevap smallint;
  v_dogru_cevap smallint;
  v_bas timestamptz;
  v_gecikme double precision;
  v_islenen int := 0;
  v_tur text;
  v_min real;
  v_max real;
begin
  -- Paket 26 E: aynı işin iki kopyası aynı anda çalışmasın. Ölçüldü (17 Eyl 15:00 UTC):
  -- migration uygulanırken fonksiyon derlemesi kilitlenince 2 saniyelik işler birikti ve
  -- 9 koşu 120 sn'lik ifade zaman aşımına düştü. Kilidi alamayan koşu sessizce atlar.
  if not pg_try_advisory_xact_lock(hashtext('duello_tik_hepsi')) then return 0; end if;
  for r in select x.id from public.duellolar x where x.durum = 'aktif' loop
    begin
      select * into d from public.duellolar where id = r.id for update skip locked;
      if not found then continue; end if;
      perform public.duello_ilerlet(r.id);
      select * into d from public.duellolar where id = r.id;
      if d.durum <> 'aktif' then continue; end if;

      select p.id, p.bot_gecikme_min, p.bot_gecikme_max into v_bot, v_min, v_max
        from public.profiles p where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) limit 1;
      if v_bot is null then continue; end if;
      -- >>> Düello 1.0 botu (migration 269): surum = 2 maçta bot tek maç tikinde oynar.
      if d.surum = 2 then
        perform public.duello2_bot_tik(d.id);
        v_islenen := v_islenen + 1;
        continue;
      end if;
      -- <<< Düello 1.0 botu
      v_bot_saldiran := (d.saldiran = v_bot);

      if d.faz = 'kategori' and v_bot_saldiran then
        v_bas := d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_kategori_sn', 20));
        if now() >= v_bas + make_interval(secs =>
             public.ayar_ondalik('duello_bot_kategori_min_sn', 2)
             + public.bot_rasgele('dkat:' || d.id::text || ':' || d.tur || ':' || d.saldiri_sirasi)
               * (public.ayar_ondalik('duello_bot_kategori_max_sn', 5) - public.ayar_ondalik('duello_bot_kategori_min_sn', 2))) then
          v_kat := public.duello_bot_kategori(d.id);
          if v_kat is not null then
            perform public.duello_kategori_uygula(d.id, v_kat);
            perform public.duello_sinyal_ver(d.id);
          end if;
        end if;

      elsif d.faz = 'hazirlik' and v_bot_saldiran and not d.zaman_baskisi and not d.savunma_kilidi then
        -- Bir kez zar at (saldırı başına sabit tohum)
        -- Paket 27 D — BOT SİMETRİSİ.
        -- Ölçülen adaletsizlik: bot %15 olasılıkla saldırı jokeri kullanıyordu ama
        -- envanterinden ya da coin'inden hiçbir şey düşmüyordu; insan her joker için
        -- ödüyordu. Botun envanteri olmadığı için "ödesin" demek anlamsız — doğrusu
        -- botu insanın GERÇEK KISITINA sokmak: maç başına en çok duello_joker_hak (4)
        -- joker ve AYNI JOKER İKİ KEZ KULLANILAMAZ. Sıklık ayarı (yüzde) korundu.
        if public.bot_rasgele('djok:' || d.id::text || ':' || d.tur || ':' || d.saldiri_sirasi) * 100
             < public.ayar_sayi('duello_bot_joker_yuzde', 15)
           and (select count(*) from public.joker_kullanimlari k
                 where k.user_id = v_bot and k.mac_tur = 'duello' and k.mac_id = d.id)
               < public.ayar_sayi('duello_joker_hak', 4) then
          -- Bu maçta bot tarafından HENÜZ KULLANILMAMIŞ saldırı jokerlerinden biri.
          -- Havuz bilerek iki tür: botun 'saldiri_degistir' için soru değiştirme
          -- yolu yok (aşağıdaki update yalnız iki bayrağı yazar), eklenirse bot
          -- etkisiz bir joker harcamış olurdu.
          -- Seçim tohumu eskisiyle aynı; yalnız aday havuzu daralıyor.
          select k2 into v_tur
            from unnest(array['zaman_baskisi', 'savunma_kilidi']) k2
           where not exists (select 1 from public.joker_kullanimlari k3
                              where k3.user_id = v_bot and k3.mac_tur = 'duello'
                                and k3.mac_id = d.id and k3.tur = k2)
           order by public.bot_rasgele('djt:' || d.id::text || ':' || d.tur || ':' || k2)
           limit 1;
        else
          v_tur := null;
        end if;

        if v_tur is not null then
          insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
          values (v_bot, 'duello', d.id, d.tur * 2 + d.saldiri_sirasi, v_tur, true);
          update public.duellolar
             set zaman_baskisi = zaman_baskisi or v_tur = 'zaman_baskisi',
                 savunma_kilidi = savunma_kilidi or v_tur = 'savunma_kilidi'
           where id = d.id;
          perform public.duello_sinyal_ver(d.id);
        end if;

      elsif d.faz = 'cevap' and not v_bot_saldiran then
        v_bas := d.faz_bitis - make_interval(secs =>
                   case when d.zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn', 10)
                        else public.ayar_sayi('duello_cevap_sn', 15) end)
                 - case when d.ek_sure then make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) else interval '0' end;
        v_gecikme := least(
          extract(epoch from (d.faz_bitis - v_bas)) - 0.8,
          public.bot_gecikme_sn(v_bot, 'duello:' || d.id::text || ':' || d.soru_id::text, v_min, v_max,
                                public.soru_okuma_yuku(d.soru_id)));
        if now() >= v_bas + v_gecikme * interval '1 second' then
          select dogru_cevap into v_dogru_cevap from public.questions where id = d.soru_id;
          if random() < public.bot_soru_isabet(v_bot, d.kategori, d.soru_id) then
            v_cevap := v_dogru_cevap;
          else
            select x into v_cevap from generate_series(0, 3) x where x <> v_dogru_cevap order by random() limit 1;
          end if;
          perform public.duello_cozumle(d.id, v_cevap);
          perform public.duello_sinyal_ver(d.id);
        end if;

      elsif d.faz = 'altin' and not (d.altin_cevaplar ? v_bot::text) then
        v_bas := d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_altin_sn', 15));
        v_gecikme := least(
          public.ayar_ondalik('duello_altin_sn', 15) - 0.8,
          public.bot_gecikme_sn(v_bot, 'dalt:' || d.id::text || ':' || d.soru_id::text, v_min, v_max,
                                public.soru_okuma_yuku(d.soru_id)));
        if now() >= v_bas + v_gecikme * interval '1 second' then
          select dogru_cevap into v_dogru_cevap from public.questions where id = d.soru_id;
          if random() < public.bot_soru_isabet(v_bot, d.kategori, d.soru_id) then
            v_cevap := v_dogru_cevap;
          else
            select x into v_cevap from generate_series(0, 3) x where x <> v_dogru_cevap order by random() limit 1;
          end if;
          update public.duellolar
             set altin_cevaplar = altin_cevaplar || jsonb_build_object(v_bot::text,
                   jsonb_build_object('cevap', v_cevap, 'dogru', v_cevap = v_dogru_cevap))
           where id = d.id;
          perform public.kategori_istatistik_yaz(v_bot, d.kategori, v_cevap = v_dogru_cevap);
          select * into d from public.duellolar where id = d.id;
          if (d.altin_cevaplar ? d.oyuncu1::text) and (d.altin_cevaplar ? d.oyuncu2::text) then
            perform public.duello_altin_degerlendir(d.id);
          end if;
          perform public.duello_sinyal_ver(d.id);
        end if;
      end if;
      v_islenen := v_islenen + 1;
    exception when others then
      raise warning 'duello_tik_hepsi %: %', r.id, sqlerrm;
      -- 600: GÜVENLİK AĞI — ilerletme hata verip süresi 60 sn'den fazla geçmiş maç asılı kalmasın
      -- (ikisi de "Devam eden bir düello var" kilidine düşüyordu). Ödülsüz iptal; istemci 'iptal'i bilir.
      begin
        update public.duellolar
           set durum = 'iptal', bitis = now(), son_hareket = now()
         where id = r.id and durum = 'aktif'
           and coalesce(faz_bitis, son_hareket) < now() - interval '60 seconds';
        if found then
          raise warning 'duello_tik_hepsi %: asılı maç iptal edildi', r.id;
          perform public.duello_sinyal_ver(r.id);
        end if;
      exception when others then
        raise warning 'duello_tik_hepsi % iptal edilemedi: %', r.id, sqlerrm;
      end;
    end;
  end loop;

  -- Bota gelen rövanş istekleri: insan gibi gecikmeyle kabul
  for r in
    select x.id, p.id as bot_id, p.bot_turu, x.rovans_at
      from public.duellolar x
      join public.profiles p on p.id in (x.oyuncu1, x.oyuncu2) and coalesce(p.is_bot, false)
     where x.durum = 'bitti' and x.rovans_isteyen is not null and x.rovans_isteyen <> p.id
       and x.rovans_id is null
       and x.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))
  loop
    begin
      if now() >= r.rovans_at + make_interval(secs => 2 + 4 * public.bot_rasgele('drov:' || r.id::text)) then
        perform public.duello_rovans_baslat(r.id);
      end if;
    exception when others then
      raise warning 'duello rovans %: %', r.id, sqlerrm;
    end;
  end loop;

  return v_islenen;
end $function$;


-- Şu an asılı olan maçlar: 1. düzeltmeden sonra bir sonraki tikte kendiliğinden çözülür; çözülmeyen olursa
-- 2. güvenlik ağı iptal eder. Rapor:
do $$
declare v int;
begin
  select count(*) into v from public.duellolar where durum = 'aktif' and coalesce(faz_bitis, son_hareket) < now() - interval '60 seconds';
  raise notice '600: şu an süresi 60 sn''den fazla geçmiş aktif düello: %', v;
end $$;
