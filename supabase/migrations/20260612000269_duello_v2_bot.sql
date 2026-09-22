-- Düello 1.0 (sürüm 2) — BOTLAR. Oturum 3/3 (sunucu 1/3 = migration 268).
--
-- SORUN: 268'de v2 maçta bot kategori seçebiliyordu (duello_tik_hepsi → duello_bot_kategori →
-- duello_kategori_uygula v2 kolu) ama CEVAP VEREMİYORDU: eski duello_cozumle v2'de no-op.
-- Bot hep "Yanıtsız" kalıyordu.
--
-- ÇÖZÜM: duello_tik_hepsi v2 maçı yeni iç fonksiyona yönlendirir: duello2_bot_tik(p_id).
-- surum = 1 maçta tik_hepsi'nin davranışı AYNEN kalır (tanım canlının birebir kopyası +
-- işaretli tek v2 bloğu; test bunu metin karşılaştırmasıyla doğrular).
--
-- v2 BOT DAVRANIŞI:
--  · KATEGORİ: saldırırken kendi GÜÇLÜ kategorisini seçer — bot_kategori_isabet (bot_isabet
--    + bot_kategori_sapma kişiliği) en yüksek olan, duello2_kategori_uygun_mu kuralına uyan
--    kategori. Gecikme duello2_bot_kategori_min/max_sn (8 sn'lik süre içinde).
--  · CEVAP: saldırırken de savunurken de, uzatmada da her soruyu cevaplar. İsabet
--    kategoriye göre (bot_kategori_isabet), düz tek oran yok. Cevap duello2 akışıyla yazılır
--    (cevaplar jsonb) ve duello2_ilerlet ile çözümlenir: duello2_bot_cevap, duello2_cevap'ın
--    auth.uid()'siz iç eşi — aynı kurallar, istemciye kapalı.
--  · ZAMANLAMA: açık bot ("...Bot", bot_turu = 'acik') 0,3–0,8 sn; gizli bot bot_gecikme_sn
--    (lig seviyesi + soru okuma yükü) ile gerçekçi sürede. İkisi de kişisel bitişini aşmaz
--    (bitiş − duello2_bot_cevap_pay_sn; pay cron aralığını, 2 sn, karşılar).
--  · SKILL: Klasik'teki bot_klasik_joker_tik deseni — soru başına %duello2_bot_skill_yuzde
--    olasılıkla, kimse cevaplamamışken, ücretsiz, havuz zaman_baskisi + soru_degistir.
--    Sınırlar (4 / aynı skill 2 / soruda 1) önce burada, sonra joker_kullanimlari
--    tetikleyicisinde (duello2_skill_kapisi, bot kolu) uygulanır. Skill anı botun cevap
--    gecikmesinin %35–75'i: bot cevapladıktan sonra skill kullanamaz.
--  · YARIŞ: duello2_bot_tik maç satırını FOR UPDATE SKIP LOCKED ile alır; kilitliyse o tikte
--    atlar. Oyuncu eylemleri de aynı satırı kilitlediği için bot ile insan sıraya girer.
--  · Rövanş kabulü değişmedi (tik_hepsi'nin rövanş döngüsü aynen).
--  · is_bot hiçbir dönüş değerine girmez; yeni fonksiyonlar void/sayı döndürür.

-- ---------------------------------------------------------------- ayarlar
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello2_bot_kategori_min_sn', '1.5', 'Düello 1.0 botu: kategori seçmeden önce en az bekleme (sn)'),
  ('duello2_bot_kategori_max_sn', '4', 'Düello 1.0 botu: kategori seçmeden önce en çok bekleme (sn; kategori süresi 8)'),
  ('duello2_bot_acik_cevap_min_sn', '0.3', 'Düello 1.0 açık bot ("...Bot"): cevap gecikmesi alt sınırı (sn)'),
  ('duello2_bot_acik_cevap_max_sn', '0.8', 'Düello 1.0 açık bot ("...Bot"): cevap gecikmesi üst sınırı (sn)'),
  ('duello2_bot_cevap_pay_sn', '2', 'Düello 1.0 botu: cevap kişisel bitişten en az bu kadar önce hedeflenir (cron aralığı payı)'),
  ('duello2_bot_skill_yuzde', '15', 'Düello 1.0 botu: soru başına skill kullanma olasılığı (%)')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------- açık bot mu
-- Açık bot = adı "...Bot" olan, oyuncunun bot olduğunu bildiği bot (bot_turu 'acik').
create or replace function public.duello2_bot_acik_mi(p_bot uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce((select public.acik_bot_mu(p.is_bot, p.bot_turu) or coalesce(p.acik_bot, false)
                     from public.profiles p where p.id = p_bot), false);
$function$;

-- ---------------------------------------------------------------- kategori
-- Bot kendi GÜÇLÜ kategorisini seçer: v2 kuralına uyan kategoriler arasında
-- bot_kategori_isabet en yüksek olan (eşitlikte rastgele). Uygun kategori yoksa rastgele.
create or replace function public.duello2_bot_kategori(p_id uuid, p_bot uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_kat text;
begin
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by public.bot_kategori_isabet(p_bot, k) desc, random()
   limit 1;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
  end if;
  return v_kat;
end $function$;

-- ---------------------------------------------------------------- cevap gecikmesi
-- Botun bu soruyu soru_baslangic'tan kaç saniye sonra cevaplayacağı. Tohum soruya
-- bağlıdır: aynı soru için her tikte aynı sonuç; Soru Değiştir yeni tohum verir.
create or replace function public.duello2_bot_cevap_gecikme(p_id uuid, p_bot uuid)
returns double precision
language plpgsql
stable security definer
set search_path to 'public'
as $function$
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
  return greatest(least(v_g, v_sure), 0.3);
end $function$;

-- ---------------------------------------------------------------- cevap (iç)
-- duello2_cevap'ın bot eşi: auth.uid() yerine p_bot. Aynı kurallar (faz, tek cevap,
-- kişisel süre + tolerans); İkinci Şans botun havuzunda olmadığı için dalı yok.
-- gorulen_kaydet / yanlis_kaydet auth.uid()'ye bağlı ve botun bankası yok → çağrılmaz.
create or replace function public.duello2_bot_cevap(p_id uuid, p_bot uuid, p_cevap smallint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_bitis timestamptz;
begin
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if p_bot not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;
  if not exists (select 1 from public.profiles where id = p_bot and coalesce(is_bot, false)) then
    raise exception 'Yalnız bot için';
  end if;
  if d.surum <> 2 then raise exception 'Yalnız Düello 1.0 maçı'; end if;
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if d.cevaplar ? p_bot::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  v_bitis := case when p_bot = d.oyuncu1 then d.bitis1 else d.bitis2 end;
  if now() > v_bitis + make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)) then
    raise exception 'Süre doldu';
  end if;

  update public.duellolar
     set cevaplar = cevaplar || jsonb_build_object(p_bot::text, jsonb_build_object('cevap', p_cevap, 'at', now())),
         son_hareket = now()
   where id = p_id;

  perform public.duello2_ilerlet(p_id);   -- ikisi de cevapladıysa çözümler
  perform public.duello_sinyal_ver(p_id);
end $function$;

-- ---------------------------------------------------------------- skill (iç)
-- Klasik bot deseni (bot_klasik_joker_tik) Düello 1.0'a uyarlandı. true = skill kullanıldı.
-- Hata olursa (sınır, soru kalmadı...) sessizce false: bot cevaplamaya devam eder.
create or replace function public.duello2_bot_skill_dene(p_id uuid, p_bot uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15));
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
end $function$;

-- ---------------------------------------------------------------- tek maç bot tiki
-- duello_tik_hepsi v2 maçta bunu çağırır; testler de doğrudan bunu çağırır. Dönen sayı
-- botun bu tikte yaptığı eylem sayısıdır (kategori + skill + cevap).
create or replace function public.duello2_bot_tik(p_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_bot uuid;
  v_n int := 0;
  v_kat text;
  v_gecikme double precision;
  v_min double precision := public.ayar_ondalik('duello2_bot_kategori_min_sn', 1.5);
  v_max double precision := public.ayar_ondalik('duello2_bot_kategori_max_sn', 4);
  v_dc smallint;
  v_cevap smallint;
begin
  -- Maç satırı kilitliyse (oyuncu eylemi / başka tik) bu tikte atla.
  select * into d from public.duellolar where id = p_id and surum = 2 for update skip locked;
  if not found or d.durum <> 'aktif' then return 0; end if;
  perform public.duello2_ilerlet(p_id);

  for v_bot in select p.id from public.profiles p
                where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) loop
    select * into d from public.duellolar where id = p_id;
    -- Kopuk oyuncu varken maç donar; bot da bekler.
    exit when d.durum <> 'aktif' or d.kopuk_at is not null;

    -- ---------- kategori ----------
    if d.faz = 'kategori' and d.saldiran = v_bot
       and now() >= d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
                    + make_interval(secs => v_min + (v_max - v_min)
                        * public.bot_rasgele('d2kat:' || p_id::text || ':' || d.tur || ':' || d.saldiri_sirasi)) then
      v_kat := public.duello2_bot_kategori(p_id, v_bot);
      perform public.duello2_soru_ac(p_id, v_kat);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- skill + cevap (saldırı, savunma, uzatma) ----------
    if d.faz = 'cevap' and not (d.cevaplar ? v_bot::text) and d.soru_baslangic is not null then
      v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);
      -- Skill anı: cevap gecikmesinin %35–75'i (bot cevapladıktan sonra skill kullanılamaz).
      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme * (0.35 + 0.4
             * public.bot_rasgele('d2skz:' || p_id::text || ':' || (d.tur * 2 + d.saldiri_sirasi) || ':' || v_bot::text))) then
        if public.duello2_bot_skill_dene(p_id, v_bot) then
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
          v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);   -- Soru Değiştir süreyi baştan başlatır
        end if;
      end if;

      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme) then
        -- İsabet KATEGORİYE göre (botun kişiliği: güçlü/zayıf kategoriler).
        select dogru_cevap into v_dc from public.questions where id = d.soru_id;
        if random() < public.bot_kategori_isabet(v_bot, d.kategori) then
          v_cevap := v_dc;
        else
          select x into v_cevap from generate_series(0, 3) x
           where x <> v_dc and not (x = any(coalesce(case when v_bot = d.oyuncu1 then d.elli1 else d.elli2 end, '{}')))
           order by random() limit 1;
        end if;
        begin
          perform public.duello2_bot_cevap(p_id, v_bot, v_cevap);
          v_n := v_n + 1;
        exception when others then
          -- Süre kaçtıysa soru "Yanıtsız" çözümlenir (duello2_ilerlet).
          raise warning 'duello2_bot_tik % cevap: %', p_id, sqlerrm;
        end;
      end if;
    end if;
  end loop;
  return v_n;
end $function$;

revoke all on function public.duello2_bot_acik_mi(uuid) from public, anon, authenticated;
revoke all on function public.duello2_bot_kategori(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello2_bot_cevap_gecikme(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello2_bot_cevap(uuid, uuid, smallint) from public, anon, authenticated;
revoke all on function public.duello2_bot_skill_dene(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello2_bot_tik(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- duello_tik_hepsi
-- Canlı tanımın BİREBİR kopyası; yalnız işaretli v2 bloğu eklendi. surum = 1 maçta aynı.
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
          if random() < public.bot_kategori_isabet(v_bot, d.kategori) then
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
          if random() < public.bot_kategori_isabet(v_bot, d.kategori) then
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
;

revoke all on function public.duello_tik_hepsi() from public, anon, authenticated;
