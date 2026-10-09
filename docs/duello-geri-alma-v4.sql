-- Düello v4 GERİ ALMA (1013–1015). İki seviye:
--
-- 1) HIZLI (önerilen): yalnız bayrağı kapat — yeni maçlar eski (surum 2) kuralla açılır, süren v4 maçları v4 koduyla biter.
--      update public.oyun_ayarlari set deger = '"kapali"'::jsonb where anahtar = 'duello_v4_acik';
--
-- 2) TAM: süren v4 maçlarını ödülsüz iptal et, 1015'in değiştirdiği 9 fonksiyonu 1015 ÖNCESİ canlı hâline döndür,
--    v4 fonksiyonlarını kaldır. Kolonlar / ayar satırları / surum-faz kısıtı geçmiş kayıtlar için DURUR (zararsız).
--    Aşağıdaki blok tek transaction'dır.

begin;

update public.oyun_ayarlari set deger = '"kapali"'::jsonb where anahtar = 'duello_v4_acik';
update public.duellolar set durum = 'iptal', bitis = now(), son_hareket = now() where surum = 4 and durum = 'aktif';

CREATE OR REPLACE FUNCTION public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
  v_secim boolean;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));
  v_secim := public.duello_secim_modu_acik();   -- 960

  -- 680: Hâkimiyet — puan/yıldız/çarpan yok; oranlar kart yüzdeleri için profil içinde kalır.
  -- Eşik ve kilit süresi maç başında sabitlenir (ayar değişse de devam eden maç etkilenmez).
  -- 960: mod + eşik + tur sayısı da satıra sabitlenir. Seçim modunda maç 'secim' fazıyla açılır: ilk seçen oyuncu2
  -- (sıra zaten rastgele), böylece tur 1'de ilk saldıran oyuncu1 = ilk seçmeyen. Bayrak kapalıysa eski akış (eski değerler).
  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, carpanli_turlar, carpan_katsayi,
                                hakimiyet, sahiplik, kilitler, hakimiyet_esik, kilit_tur, yuva1, yuva2,
                                saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum,
                                secim_modu, max_tur, ilk_secen, secim_sira, secimler)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,   -- puan kolonu 0 kalır (eski "puan1 boş = can maçı" ayrımı bozulmasın)
          null, null, null, null, null,
          true, '{}'::jsonb, '{}'::jsonb,
          greatest(1, case when v_secim then public.ayar_sayi('duello_hakimiyet_esik', 7)
                           else public.ayar_sayi('duello_bos_mod_esik', 5) end::int),
          greatest(0, public.ayar_sayi('duello_kilit_tur', 2)::int), 0, 0,
          case when v_secim then p_b else p_a end,
          case when v_secim then 'secim' else 'kategori' end,
          case when v_secim
               then now() + make_interval(secs => public.ayar_sayi('duello_secim_sn', 5) + public.ayar_sayi('duello_secim_ilk_ek_sn', 3))
                    + public.duello2_gosterim_payi()
               else now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi() end,
          v_p1, v_p2, p_onceki, 2,
          v_secim,
          greatest(1, case when v_secim then public.ayar_sayi('duello_max_tur', 20)
                           else public.ayar_sayi('duello_bos_mod_max_tur', 16) end)::smallint,
          case when v_secim then p_b end, 0, '[]'::jsonb)
  returning id into v_id;
  -- 970: yeni puan kuralı (yalnız seçim modunda — başlangıç kategorileri draft'tan gelir). Hedef, kategori yolu ve
  -- tur sayısı maç satırına sabitlenir; bayrak 'eski' ise satır puan_modu = false kalır (960 hâkimiyet akışı aynen).
  if v_secim and public.duello_puan_modu_acik() then
    update public.duellolar
       set puan_modu = true,
           puan_hedef = greatest(1, public.ayar_sayi('duello_puan_hedef', 12))::smallint,
           kategori_yolu = greatest(1, public.ayar_sayi('duello_puan_kategori_yolu', 4))::smallint,
           max_tur = greatest(1, public.ayar_sayi('duello_puan_max_tur', 20))::smallint
     where id = v_id;
  end if;
  if not v_secim then
    perform public.duello2_ban_baslat(v_id);   -- 853: ilk tur da savunma banıyla başlar (bayrak kapalıysa 'kategori' kalır)
  end if;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$

CREATE OR REPLACE FUNCTION public.duello_kilitle(p_id uuid)
 RETURNS duellolar
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if auth.uid() not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  -- 410: ilk geliş anı (yalnız bir kez yazılır)
  if d.oyuncu1 = auth.uid() and d.giris1 is null then
    update public.duellolar set giris1 = now() where id = p_id;
  elsif d.oyuncu2 = auth.uid() and d.giris2 is null then
    update public.duellolar set giris2 = now() where id = p_id;
  end if;

  -- Düelloya bakan oyuncu bağlıdır (Paket 24 · A.4)
  perform public.nabiz_yaz(auth.uid());   -- 996: eskiden profiles.last_seen (5 sn süzgeçli)

  perform public.duello_ilerlet(p_id);
  select * into d from public.duellolar where id = p_id;
  return d;
end;
$function$

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
end $function$

CREATE OR REPLACE FUNCTION public.duello_durum(p_id uuid)
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
  v_dil text := public.oyuncu_dili();
  v_soru_goster boolean;
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_envanter jsonb;
  v_kullanim jsonb;
  v_sonuc jsonb;     -- 760
  v_kopuk uuid;      -- 760
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then
    v_sonuc := public.duello2_durum(p_id);   -- kilit + tembel ilerletme bunun içinde (duello_kilitle)
    -- 760: kopukluk dondurması istemciye açıkça bildirilir. Kopukken duello2_ilerlet her çağrıda faz bitişini
    -- "şimdi + kalan (en az duello_kopuk_taban_sn)" diye ileri iter; istemci bu bitişi sayaç diye çizince geri
    -- sayım ~2 sn'de bir yeniden "3"ten başlıyordu (30 Eyl gece, 45 sn'de ~22 kez). Artık istemci 'kopuk'
    -- görünce sayacı donuk kalanla gösterir, bekleme süresini (bitis) bantta sayar.
    select * into d from public.duellolar where id = p_id;
    if d.durum = 'aktif' and d.kopuk_at is not null then
      v_kopuk := public.duello_kopuk_kim(p_id);
      v_sonuc := v_sonuc || jsonb_build_object('kopuk', jsonb_build_object(
        'ben_mi', v_kopuk is not null and v_kopuk = v_me,
        'bitis', d.kopuk_at + make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)),
        'faz_kalan_sn', round(extract(epoch from coalesce(
            case when d.faz = 'cevap' then case when v_me = d.oyuncu1 then d.kopuk_kalan1 else d.kopuk_kalan2 end end,
            d.kopuk_kalan))::numeric, 2)));
    end if;
    return v_sonuc;
  end if;
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_rakip := case when d.oyuncu1 = v_me then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;

  v_soru_goster := d.soru_id is not null and (
       (d.faz = 'hazirlik' and d.saldiran = v_me)
    or d.faz in ('cevap','sonuc','altin')
    or d.durum <> 'aktif');
  if v_soru_goster then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object(
             'ben', count(*) filter (where x.kazanan = v_me),
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

  select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) into v_envanter
    from public.joker_envanter e where e.user_id = v_me;
  select jsonb_build_object(
           'saldiri', count(*) filter (where k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'saldiri_ucretsiz', count(*) filter (where k.ucretsiz and k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'savunma', count(*) filter (where k.tur in ('elli','sure','soru_degistir')),
           'elli_ucretsiz', bool_or(k.tur = 'elli' and k.ucretsiz),
           'soru_degistir', bool_or(k.tur = 'soru_degistir'),
           -- Paket 27 B: aynı tür maçta bir kez — istemci hangi türün
           -- tükendiğini bilsin ki düğmeyi boşuna açmasın.
           'turler', coalesce(jsonb_agg(distinct k.tur) filter (where k.tur is not null), '[]'::jsonb))
    into v_kullanim
    from public.joker_kullanimlari k where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id;

  return jsonb_build_object(
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', now(),
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1, 'zayif', d.zayif1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2, 'zayif', d.zayif2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
    'kullanim', jsonb_build_object(d.oyuncu1::text, public.duello_kategori_kullanimi(p_id, d.oyuncu1),
                                   d.oyuncu2::text, public.duello_kategori_kullanimi(p_id, d.oyuncu2)),
    'kategori', d.kategori,
    'soru', v_soru,
    'elli_kapali', case when v_me = v_savunan and d.faz = 'cevap' then to_jsonb(d.elli_kapali) end,
    'zaman_baskisi', d.zaman_baskisi, 'savunma_kilidi', d.savunma_kilidi, 'ek_sure', d.ek_sure,
    'soru_degisti_saldiri', d.soru_degisti_saldiri,
    'son_hamle', case when d.faz in ('sonuc','kategori','altin') or d.durum <> 'aktif' then d.son_hamle end,
    'altin', case when d.faz = 'altin' then jsonb_build_object(
                    'ben_cevapladim', d.altin_cevaplar ? v_me::text,
                    'benim_cevabim', d.altin_cevaplar -> v_me::text -> 'cevap',
                    'rakip_cevapladi', d.altin_cevaplar ? v_rakip::text) end,
    'jokerler', jsonb_build_object(
       'envanter', v_envanter, 'kullanim', v_kullanim,
       -- Paket 27 B: tek toplam hak. Eski alanlar (saldiri_siniri/savunma_siniri/
       -- ucretsiz_saldiri) eski istemci sürümü kırılmasın diye aynı yapıda
       -- doldurulmaya devam ediyor; yeni istemci 'hak' ve 'kullanilan'a bakar.
       'hak', public.ayar_sayi('duello_joker_hak', 4),
       'kullanilan', (select count(*) from public.joker_kullanimlari k2
                       where k2.user_id = v_me and k2.mac_tur = 'duello' and k2.mac_id = p_id),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me),
       'saldiri_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'savunma_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'ucretsiz_saldiri', public.ayar_sayi('duello_ucretsiz_saldiri_joker', 0)),
    'sureler', jsonb_build_object('cevap', public.ayar_sayi('duello_cevap_sn', 15),
       'zaman_baskisi', public.ayar_sayi('duello_zaman_baskisi_sn', 10),
       'hazirlik', public.ayar_sayi('duello_hazirlik_sn', 4),
       'kategori', public.ayar_sayi('duello_kategori_sn', 20),
       'altin', public.ayar_sayi('duello_altin_sn', 15),
       -- Paket 28 A: düello ekranının kendi nabız aralığı. Sunucu hesaplıyor ki
       -- istemci kopukluk eşiğinden yavaş atıp kendini "kopuk" göstermesin.
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25)),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  );
end $function$

CREATE OR REPLACE FUNCTION public.duello_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype; v_me uuid:=auth.uid(); v_dogru boolean; v_index int; v_ilk smallint; v_ikinci boolean;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then return public.duello2_cevap(p_id, p_cevap); end if;
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  d:=public.duello_kilitle(p_id);
  if d.durum<>'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz='cevap' then
    if d.saldiran=v_me then raise exception 'Kendi saldırını cevaplayamazsın'; end if;
    v_index:=d.tur*2+d.saldiri_sirasi;
    v_dogru:=p_cevap=(select dogru_cevap from public.questions where id=d.soru_id);
    v_ikinci:=exists(select 1 from public.joker_kullanimlari k where k.mac_tur='duello' and k.mac_id=p_id
      and k.user_id=v_me and k.soru_index=v_index and k.tur='ikinci_sans');
    select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s where s.mac_tur='duello'
      and s.mac_id=p_id and s.user_id=v_me and s.soru_index=v_index for update;
    if v_ikinci and not v_dogru and v_ilk is null then
      insert into public.skill_ikinci_sans_denemeleri(mac_tur,mac_id,user_id,soru_index,ilk_cevap)
      values('duello',p_id,v_me,v_index,p_cevap);
      return jsonb_build_object('tekrar_hakki',true,'ilk_yanlis_cevap',p_cevap);
    end if;
    if v_ilk is not null and p_cevap=v_ilk then raise exception 'Başka bir cevap seç'; end if;
    delete from public.skill_ikinci_sans_denemeleri where mac_tur='duello' and mac_id=p_id
      and user_id=v_me and soru_index=v_index;
    perform public.gorulen_kaydet(d.soru_id); perform public.duello_cozumle(p_id,p_cevap);
  elsif d.faz='altin' then
    if d.altin_cevaplar?v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
    v_dogru:=p_cevap=(select dogru_cevap from public.questions where id=d.soru_id);
    update public.duellolar set altin_cevaplar=altin_cevaplar||jsonb_build_object(v_me::text,
      jsonb_build_object('cevap',p_cevap,'dogru',v_dogru)),son_hareket=now() where id=p_id;
    perform public.gorulen_kaydet(d.soru_id); perform public.kategori_istatistik_yaz(v_me,d.kategori,v_dogru);
    if v_dogru then perform public.kategori_dogru_arttir(v_me,d.kategori); end if;
    select * into d from public.duellolar where id=p_id;
    if (d.altin_cevaplar?d.oyuncu1::text) and (d.altin_cevaplar?d.oyuncu2::text) then
      perform public.duello_altin_degerlendir(p_id); end if;
  else raise exception 'Şu an cevap verilemez'; end if;
  perform public.duello_sinyal_ver(p_id);
  return jsonb_build_object('tekrar_hakki',false);
end;
$function$

CREATE OR REPLACE FUNCTION public.duello_kategori_sec(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_kategori_sec(p_id, p_kategori); return; end if;
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'kategori' or d.saldiran <> auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.duello_kategori_uygun_mu(p_id, auth.uid(), p_kategori) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  perform public.duello_kategori_uygula(p_id, p_kategori);
  select * into d from public.duellolar where id = p_id;
  perform public.gorulen_kaydet(d.soru_id);
  perform public.duello_sinyal_ver(p_id);
end $function$

CREATE OR REPLACE FUNCTION public.duello_saldiri_jokeri(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ucretsiz boolean;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_skill(p_id, p_tur); return; end if;
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur <> 'zaman_baskisi' then raise exception 'Bu saldırı skill''i artık aktif değil'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'hazirlik' or d.saldiran<>v_me or now()>=d.faz_bitis then
    raise exception 'Saldırı skilleri yalnız Saldırı Hazırlığı sırasında kullanılır';
  end if;
  if d.zaman_baskisi then raise exception 'Bu skill bu saldırıda zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text);
  end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  update public.duellolar set zaman_baskisi=true,son_hareket=now() where id=p_id;
  perform public.duello_sinyal_ver(p_id);
end;
$function$

CREATE OR REPLACE FUNCTION public.duello_savunma_jokeri(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype; v_me uuid:=auth.uid(); v_ucretsiz boolean:=false;
  v_dogru smallint; v_soru uuid;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_skill(p_id, p_tur); return; end if;
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur not in ('elli','sure','soru_degistir','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  d:=public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'cevap' or d.saldiran=v_me or now()>d.faz_bitis then
    raise exception 'Savunma skilleri yalnız cevap verirken kullanılır';
  end if;
  if p_tur='elli' and d.elli_kapali is not null then raise exception 'Bu soruda 50:50 zaten kullanıldı'; end if;
  if p_tur='sure' and d.ek_sure then raise exception 'Bu soruda Ek Süre zaten kullanıldı'; end if;
  if p_tur='soru_degistir' and d.soru_degisti_savunma then raise exception 'Bu soruda Soru Değiştir zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz:=public.jokerler_serbest();
  if not v_ucretsiz then perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text); end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  if p_tur='elli' then
    select dogru_cevap into v_dogru from public.questions where id=d.soru_id;
    update public.duellolar set elli_kapali=(select array_agg(x) from
      (select x from generate_series(0,3)x where x<>v_dogru order by random() limit 2)s),son_hareket=now() where id=p_id;
  elsif p_tur='sure' then
    update public.duellolar set ek_sure=true,
      faz_bitis=faz_bitis+make_interval(secs=>public.ayar_sayi('duello_ek_sure_sn',5)),son_hareket=now() where id=p_id;
  elsif p_tur='soru_degistir' then
    v_soru:=public.duello_soru_bul(p_id,d.kategori,array[v_me,d.saldiran],d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
    update public.duellolar set soru_id=v_soru,soru_degisti_savunma=true,elli_kapali=null,
      kullanilan_sorular=kullanilan_sorular||v_soru,
      faz_bitis=now()+make_interval(secs=>case when zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn',10)
        else public.ayar_sayi('duello_cevap_sn',15) end),son_hareket=now() where id=p_id;
  else
    update public.duellolar set son_hareket=now() where id=p_id;
  end if;
  perform public.duello_sinyal_ver(p_id);
end;
$function$

CREATE OR REPLACE FUNCTION public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
  v_tur_kullanilan int;
begin
  -- Düello 1.0: surum = 2 maçta 4 toplam / aynı skill 2 / soruda 1.
  if p_mac_tur = 'duello' and exists (select 1 from public.duellolar where id = p_mac_id and surum = 2) then
    perform public.duello2_skill_hak_kontrol(p_mac_id, v_me, p_tur);
    return;
  end if;
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m where m.id = p_mac_id and coalesce(m.jokersiz, false)
  ) then
    raise exception 'Bu modda skill kullanılamaz';
  end if;

  if p_mac_tur = '1v1' then
    v_sinir := public.ayar_sayi('klasik_skill_toplam_hak', 6)::int;
    select count(*), count(*) filter (where tur = p_tur)
      into v_kullanilan, v_tur_kullanilan
      from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
    if v_kullanilan >= v_sinir then
      raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
    end if;
    if v_tur_kullanilan >= public.ayar_sayi('klasik_skill_tur_basi_hak', 2)::int then
      raise exception 'Bu skill için maç hakkın doldu';
    end if;
    return;
  end if;

  -- Grup/turnuva/düello kuralları değişmedi.
  if exists (
    select 1 from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
  ) then
    raise exception 'Bu skill''i bu maçta zaten kullandın';
  end if;
  if p_mac_tur = 'duello' then
    v_sinir := public.ayar_sayi('duello_joker_hak', 4)::int;
  else
    v_sinir := public.joker_mac_siniri(p_mac_tur, p_mac_id);
  end if;
  if v_sinir = 0 then raise exception 'Turnuva finalinde skill kullanılamaz'; end if;
  if v_sinir is null then return; end if;
  select count(*) into v_kullanilan from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
  if v_kullanilan >= v_sinir then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
  end if;
end;
$function$

drop function if exists public.duello4_bot_tik(uuid);
drop function if exists public.duello4_bot_gecikme(uuid, uuid);
drop function if exists public.duello4_bot_kart(uuid, uuid, int);
drop function if exists public.duello4_durum(uuid);
drop function if exists public.duello4_joker(uuid, text);
drop function if exists public.duello4_joker_hak_kontrol(uuid, uuid, text);
drop function if exists public.duello4_izinli_skiller();
drop function if exists public.duello4_kart(uuid, text);
drop function if exists public.duello4_cevap(uuid, smallint);
drop function if exists public.duello4_baslat(uuid);
drop function if exists public.duello4_ilerlet(uuid);
drop function if exists public.duello4_sonraki(uuid);
drop function if exists public.duello4_cozumle(uuid);
drop function if exists public.duello4_kart_oto(uuid);
drop function if exists public.duello4_kart_uygula(uuid, text, text, boolean);
drop function if exists public.duello4_soru_ac(uuid);
drop function if exists public.duello4_kart_ac(uuid);
drop function if exists public.duello4_ortak_soru_ac(uuid, boolean, interval);
drop function if exists public.duello4_soru_benzer(uuid, text, int);
drop function if exists public.duello4_soru_cifti(uuid, text, text);
drop function if exists public.duello4_kategoriler(uuid);
drop function if exists public.duello4_oran(jsonb, text);
drop function if exists public.duello4_acik_mi(uuid, uuid);

commit;
