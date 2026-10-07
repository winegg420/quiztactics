-- ============================================================
-- 991 · SÜRE İÇİNDE İŞARETLENEN CEVAP KABUL (geç varış payı) — bütün zamanlı modlar
--
-- KÖK NEDEN (ölçüldü, araclar/gec-cevap-sql-testi.mjs): sunucu cevabın süresini TIKLAMA anına değil
-- cevabın SUNUCUYA VARIŞ anına (now()) göre ölçüyordu. Oyuncu 2 sn kala işaretleyip istek 3+ sn
-- gecikince (yavaş ağ / Supabase takılması) cevap 'Süre doldu' ile reddediliyordu. Ayrıca fazı kapatan
-- fonksiyonlar (kasa_ilerlet, duello2_ilerlet, advance_*) aynı anda (bitiş + 1 sn) soruyu çözüp
-- ilerletiyordu: geciken geçerli cevap 'Şu an cevap verilemez' / 'Soru değişti' ile çöpe gidiyordu.
-- Seçim/karar fazlarında (Ortak Hazine AÇ/DEVAM, Düello seçim + kategori) hiç pay yoktu.
--
-- YÖNTEM: istemci tıklama anını (sunucu saatiyle, epoch ms) `x-qt-tik` HTTP başlığıyla yollar
-- (PostgREST → current_setting('request.headers')). Başlık seçildi çünkü RPC imzaları DEĞİŞMEZ:
-- GRANT'lar aynı kalır, eski (önbellekteki) istemciler aynen çalışır (başlıksız = eski kural).
-- Kabul kuralı (cevap_gec_kabul):
--   1) varış ≤ bitiş + eski tolerans → kabul (eski kural, aynen)
--   2) değilse: tıklama ≤ bitiş + tolerans VE varış ≤ bitiş + geç varış payı → kabul
--   tıklama bitişten sonraysa / bildirim yoksa / pay geçtiyse → eskisi gibi ret.
-- Faz kapanışı: cevaplamayan oyuncu için bitiş + max(tolerans, pay). Herkes cevapladıysa BEKLENMEZ
-- (çözümleme son cevapla aynı istekte olur). Klasik'te süresi biten istemci mac_soruyu_atla ile
-- "cevabım yok" der (−1 satırı), orada da beklenmez.
--
-- HİLE SINIRI: tıklama anı istemcinin beyanıdır, doğrulanamaz. Sahte beyanın kazancı en çok pay
-- kadar ek süredir (faz o anda kapanır). Puan/hız beyana bağlı DEĞİL: Klasik/Grup/Turnuva sabit puan;
-- Kasa/Düello 'at' damgası least(varış, bitiş) — beyan hiçbir zaman damgayı öne çekmez.
-- Gelecekteki beyan now()'a kırpılır.
--
-- Ayarlar (migration tek kaynak; elle değiştirme): cevap_gec_varis_sn = 5, secim_gec_varis_sn = 3.
-- Fonksiyonlar canlı tanımlardan türetildi; yalnız süre satırları değişti. İmzalar aynı.
-- Dokunulmadı: joker/skill RPC'leri, bot fonksiyonları (bot_oyna yalnız aday süzer; advance_* kendi
-- kontrolünü yapar), dondurulmuş Hızlı Maç / Hızlı Mod, kapalı Düello ban fazı.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('cevap_gec_varis_sn', '5'::jsonb,
   '991: Süre içinde işaretlenen cevabın sunucuya geç varış payı (sn, bitişten sonra; x-qt-tik bildirimiyle). Faz, cevaplamayan oyuncu için bitiş + bu pay dolunca kapanır; herkes cevapladıysa beklenmez. Kasa, Düello, Klasik, Grup, Turnuva, Hatalarım.'),
  ('secim_gec_varis_sn', '3'::jsonb,
   '991: Süre içinde yapılan seçim/kararın geç varış payı (sn): Ortak Hazine AÇ/DEVAM, Düello seçim fazı ve kategori seçimi. Süre dolumu varsayılanı (DEVAM / otomatik seçim) bu pay dolunca uygulanır.')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

-- İstemcinin bildirdiği tıklama anı (x-qt-tik: sunucu saatiyle epoch ms). Yok/bozuksa null; gelecekse now().
create or replace function public.cevap_tik_ani()
returns timestamptz
language plpgsql
stable
set search_path to 'public'
as $function$
declare
  v_h text;
begin
  v_h := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-qt-tik';
  if v_h is null or v_h !~ '^[0-9]{12,14}$' then return null; end if;
  return least(now(), to_timestamp(v_h::double precision / 1000));
exception when others then
  return null;
end $function$;

-- Cevap / seçim zamanında mı? p_bitis: oyuncunun kişisel bitişi (null = süre yok → kabul),
-- p_tol: modun eski varış toleransı, p_pay_sn: bitişten sonra geç varış payı.
create or replace function public.cevap_gec_kabul(p_bitis timestamptz, p_tol interval, p_pay_sn numeric)
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select p_bitis is null
      or now() <= p_bitis + p_tol
      or (now() <= p_bitis + greatest(p_tol, make_interval(secs => greatest(coalesce(p_pay_sn, 0), 0)::double precision))
          and coalesce(public.cevap_tik_ani() <= p_bitis + p_tol, false));
$function$;

CREATE OR REPLACE FUNCTION public.kasa_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_j jsonb;
  v_dogru smallint;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and v_me::text is distinct from k.savunma ->> 'sahip' then
    raise exception 'Savunma Sorusunu yalnız hak sahibi cevaplar';
  end if;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  -- 991: süre içinde tıklanıp geç varan cevap kabul (x-qt-tik bildirimi + geç varış payı; bkz. cevap_gec_kabul)
  if not public.cevap_gec_kabul(public.kasa_oyuncu_bitis(k, v_me), make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)), public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;
  select dogru_cevap into v_dogru from public.questions where id = k.soru_id;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);

  if (v_j ->> 'ilk') is not null and p_cevap = (v_j ->> 'ilk')::smallint then
    raise exception 'Başka bir cevap seç';
  end if;
  -- İkinci Şans: ilk yanlış cevap sayılmaz; aynı sayaçla bir kez daha (yalnız kullanan bilir)
  if coalesce((v_j ->> 'ikinci')::boolean, false) and (v_j ->> 'ilk') is null and p_cevap is distinct from v_dogru then
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(v_me::text, v_j || jsonb_build_object('ilk', p_cevap)),
           son_hareket = now()
     where id = p_id;
    perform public.gorulen_kaydet(k.soru_id);
    return jsonb_build_object('cevaplandi', false, 'ikinci_sans', true, 'elenen', p_cevap);
  end if;

  update public.kasa_maclari
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', least(now(), public.kasa_oyuncu_bitis(k, v_me)))),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(k.soru_id);
  if p_cevap is distinct from v_dogru then
    perform public.yanlis_kaydet(k.soru_id);
  end if;
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ (rakip henüz cevaplamamış olabilir)
  return jsonb_build_object('cevaplandi', true);
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_tol interval := make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1));
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)), make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));   -- 991
  v_karar_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);   -- 991
  v_taban interval := make_interval(secs => public.ayar_sayi('kasa_kopuk_taban_sn', 3));
  v_kayma interval;
  v_b1 timestamptz;
  v_b2 timestamptz;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;

  -- 987: Savunma Sorusunda savunanın bağlantısı koptu → savunma başarısız (rakip kararını verir)
  if k.faz = 'cevap' and (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and exists (
       select 1 from public.profiles p
        where p.id = (k.savunma ->> 'sahip')::uuid and not coalesce(p.is_bot, false)
          and p.last_seen < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 25))) then
    perform public.kasa_savunma_cozumle(p_id, 'kopuk');
    perform public.kasa_sinyal_ver(p_id);
    select * into k from public.kasa_maclari where id = p_id;
  end if;

  -- ---------- KOPUKLUK KAPISI (Düello 760 deseni: faz donar, bekleme dolunca terk) ----------
  v_kopuk := public.kasa_kopuk_kim(p_id);
  if v_kopuk is not null then
    if k.kopuk_at is null then
      update public.kasa_maclari
         set kopuk_at = now(), kopuk_kalan = greatest(coalesce(k.faz_bitis, now()) - now(), v_taban)
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      select * into k from public.kasa_maclari where id = p_id;
    end if;
    if k.kopuk_at < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)) then
      perform public.kasa_bitir(p_id, case when v_kopuk = k.oyuncu1 then k.oyuncu2 else k.oyuncu1 end, 'kopuk');
      return;
    end if;
    update public.kasa_maclari
       set faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban)
     where id = p_id;
    return;
  end if;
  if k.kopuk_at is not null then
    v_kayma := now() - k.kopuk_at;
    update public.kasa_maclari
       set kopuk_at = null, kopuk_kalan = null,
           faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban),
           bot_cevap_at = bot_cevap_at + v_kayma,
           bot_karar_at = bot_karar_at + v_kayma,
           son_hareket = now()
     where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into k from public.kasa_maclari where id = p_id;
    exit when not found or k.durum <> 'aktif';

    if k.son_hareket < now() - make_interval(mins => public.ayar_sayi('kasa_zaman_asimi_dk', 60)::int) then
      update public.kasa_maclari set durum = 'iptal', bitis = now() where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      exit;
    end if;

    if k.faz = 'baslangic' then
      exit when now() < k.faz_bitis;
      perform public.kasa_tur_baslat(p_id);
    elsif k.faz = 'karar' then
      if k.bot is not null and k.sahip = k.bot and k.bot_karar_at is not null and now() >= k.bot_karar_at then
        perform public.kasa_karar_uygula(p_id, coalesce(k.bot_karar, false), false);
      elsif now() >= k.faz_bitis + v_karar_pay then   -- 991: geç varan karar payı
        perform public.kasa_karar_uygula(p_id, false, true);   -- süre doldu → DEVAM
      else
        exit;
      end if;
    elsif k.faz = 'cevap' then
      if k.bot is not null and not (k.cevaplar ? k.bot::text) and k.bot_cevap_at is not null
         and now() >= k.bot_cevap_at then
        update public.kasa_maclari
           set cevaplar = cevaplar || jsonb_build_object(k.bot::text,
                            jsonb_build_object('cevap', k.bot_cevap, 'at', k.bot_cevap_at))
         where id = p_id;
        select * into k from public.kasa_maclari where id = p_id;
      end if;
      if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
        -- 987: yalnız savunan cevaplar; rakip izler
        exit when not ((k.cevaplar ? (k.savunma ->> 'sahip'))
                       or now() > public.kasa_oyuncu_bitis(k, (k.savunma ->> 'sahip')::uuid) + v_kapanis);
        perform public.kasa_savunma_cozumle(p_id, null);
        perform public.kasa_sinyal_ver(p_id);
        continue;
      end if;
      v_b1 := public.kasa_oyuncu_bitis(k, k.oyuncu1);
      v_b2 := public.kasa_oyuncu_bitis(k, k.oyuncu2);
      -- 991: cevaplamayan oyuncu için bitiş + geç varış payı beklenir; ikisi de cevapladıysa beklenmez
      exit when not ((k.cevaplar ? k.oyuncu1::text) or now() > v_b1 + v_kapanis)
             or not ((k.cevaplar ? k.oyuncu2::text) or now() > v_b2 + v_kapanis);
      perform public.kasa_cozumle(p_id);
    elsif k.faz = 'sonuc' then
      exit when now() < k.faz_bitis;
      perform public.kasa_sonraki(p_id);
    else
      exit;
    end if;
    perform public.kasa_sinyal_ver(p_id);
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.kasa_karar(p_id uuid, p_ac boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'karar' then raise exception 'Şu an karar verilemez'; end if;
  -- 991: süre bitince yalnız süre içinde tıklanmış (x-qt-tik) karar, geç varış payı içinde kabul
  if not public.cevap_gec_kabul(k.faz_bitis, interval '0 seconds', public.ayar_ondalik('secim_gec_varis_sn', 3)) then raise exception 'Şu an karar verilemez'; end if;
  if k.sahip is distinct from auth.uid() then raise exception 'Karar kasanın sahibinde'; end if;
  if coalesce(p_ac, false) and k.kasa < k.acma_min then
    raise exception 'Kasa en az % olmalı', k.acma_min;
  end if;
  perform public.kasa_karar_uygula(p_id, coalesce(p_ac, false), false);
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_bitis timestamptz;
  v_dogru boolean;
  v_index int;
  v_ilk smallint;
  v_ikinci boolean;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  d := public.duello_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  v_bitis := case when v_me = d.oyuncu1 then d.bitis1 else d.bitis2 end;
  -- 991: süre içinde tıklanıp geç varan cevap kabul
  if not public.cevap_gec_kabul(v_bitis, make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)), public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;

  v_index := d.tur * 2 + d.saldiri_sirasi;
  v_dogru := p_cevap = (select dogru_cevap from public.questions where id = d.soru_id);

  -- İkinci Şans: bu soruda kullanıldıysa ilk yanlış kaydedilir, aynı sayaçla bir cevap daha.
  v_ikinci := exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                        and k.user_id = v_me and k.soru_index = v_index and k.tur = 'ikinci_sans');
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_index for update;
  if v_ikinci and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri (mac_tur, mac_id, user_id, soru_index, ilk_cevap)
    values ('duello', p_id, v_me, v_index, p_cevap);
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('tekrar_hakki', true, 'ilk_yanlis_cevap', p_cevap);
  end if;
  if v_ilk is not null and p_cevap = v_ilk then raise exception 'Başka bir cevap seç'; end if;

  update public.duellolar
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', least(now(), v_bitis))),
         son_hareket = now()
   where id = p_id;

  perform public.gorulen_kaydet(d.soru_id);
  if not v_dogru then perform public.yanlis_kaydet(d.soru_id); end if;

  -- İkisi de cevapladıysa ya da rakibin süresi dolduysa soru hemen çözümlenir
  -- (koşul tek yerde: duello2_ilerlet).
  perform public.duello2_ilerlet(p_id);
  perform public.duello_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ: rakip daha cevaplamamış olabilir.
  return jsonb_build_object('tekrar_hakki', false, 'cevaplandi', true);
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kat text;
  v_tol interval := make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1));
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)), make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));   -- 991
  v_secim_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);   -- 991
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (eski akışla aynı; kişisel bitişler de donar) ----------
  v_kopuk := public.duello_kopuk_kim(p_id);
  if v_kopuk is not null then
    if d.kopuk_at is null then
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban),
             kopuk_kalan1 = case when d.bitis1 is not null then greatest(d.bitis1 - now(), v_taban) end,
             kopuk_kalan2 = case when d.bitis2 is not null then greatest(d.bitis2 - now(), v_taban) end
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;

    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      perform public.duello_bitir(p_id, case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;

    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end
     where id = p_id;
    return;
  end if;

  if d.kopuk_at is not null then
    update public.duellolar
       set kopuk_at = null, kopuk_kalan = null, kopuk_kalan1 = null, kopuk_kalan2 = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end,
           son_hareket = now()
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into d from public.duellolar where id = p_id;
    exit when not found or d.durum <> 'aktif';

    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    if d.faz = 'kategori' then
      exit when now() < d.faz_bitis + v_secim_pay;   -- 991: geç varan seçim payı
      -- Süre doldu: uygun kategorilerden RASTGELE; 470: savunanın zayıf kategorisi başka seçenek
      -- varsa seçilmez (saldıran seçmediği bir risk yüzünden can kaybetmesin).
      v_kat := public.duello2_otomatik_kategori(p_id);
      perform public.duello2_soru_ac(p_id, v_kat);
    elsif d.faz = 'cevap' then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ tolerans) doldu → çözümle.
      -- 991: cevaplamayan için kişisel bitiş + geç varış payı; ikisi de cevapladıysa beklenmez
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_kapanis)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_kapanis);
      perform public.duello2_cozumle(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello2_sonraki(p_id);
    elsif d.faz = 'ban' then
      -- 853: savunma banı süresi doldu → ban yok, saldıran bütün uygun kategorilerden seçer.
      exit when now() < d.faz_bitis;
      perform public.duello2_ban_bitir(p_id, null);
    elsif d.faz = 'secim' then
      -- 960: seçim süresi doldu → sunucu sıradaki oyuncu için seçer (kendi en yüksek yüzdesi; bot: bot seçimi).
      exit when now() < d.faz_bitis + v_secim_pay;   -- 991
      perform public.duello2_secim_oto(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_kategori_sec(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);   -- satır FOR UPDATE: iki seçim (ya da seçim + süre dolumu) sırayla işlenir
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  -- 960 · seçim fazı: aynı RPC sıradaki oyuncunun seçimini alır (yılan sırası sunucuda; istemciye güvenilmez).
  if d.faz = 'secim' then
    if d.saldiran <> auth.uid() then raise exception 'Şu an seçim sırası sende değil'; end if;
    if not public.cevap_gec_kabul(d.faz_bitis, interval '0 seconds', public.ayar_ondalik('secim_gec_varis_sn', 3)) then raise exception 'Şu an seçim sırası sende değil'; end if;   -- 991
    if not (p_kategori = any(public.duello2_secim_havuzu(p_id))) then raise exception 'Bu kategori şu an seçilemez'; end if;
    if coalesce(d.sahiplik, '{}'::jsonb) ? p_kategori then raise exception 'Bu kategori zaten alındı'; end if;
    perform public.duello2_secim_uygula(p_id, p_kategori, false);
    perform public.duello_sinyal_ver(p_id);
    return;
  end if;
  if d.faz <> 'kategori' or d.saldiran <> auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.cevap_gec_kabul(d.faz_bitis, interval '0 seconds', public.ayar_ondalik('secim_gec_varis_sn', 3)) then raise exception 'Bu kategori şu an seçilemez'; end if;   -- 991
  if not public.duello2_kategori_uygun_mu(p_id, p_kategori) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  perform public.duello2_soru_ac(p_id, p_kategori);
  perform public.duello_sinyal_ver(p_id);
end $function$;

CREATE OR REPLACE FUNCTION public.submit_match_answer(p_match_id uuid, p_cevap smallint, p_soru_index integer DEFAULT NULL::integer)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint, puan integer, benim_skor integer, rakip_skor integer, tekrar_hakki boolean, ilk_yanlis_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  m public.matches%rowtype; q public.questions%rowtype; v_dogru boolean; v_puan int; v_ben_p1 boolean;
  v_index int; v_bas timestamptz; v_toplam int; v_senkron boolean; v_s1 int; v_s2 int; v_soru_id uuid;
  v_skill text; v_ilk smallint;
begin
  perform public.hiz_siniri('submit_match_answer',60,interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in(m.oyuncu1,m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if m.durum<>'aktif' then raise exception 'Maç aktif değil'; end if;
  v_ben_p1:=(m.oyuncu1=auth.uid()); v_senkron:=coalesce(m.senkron,false);
  v_toplam:=coalesce(array_length(m.soru_ids,1),0);
  if v_senkron then
    if not m.basladi or m.soru_baslangic is null then raise exception 'Maç henüz başlamadı'; end if;
    if m.duraklatildi_at is not null then raise exception 'Rakip bağlantısı koptu — maç duraklatıldı'; end if;
    if now()<m.soru_baslangic-public.soru_gosterim_payi() then raise exception 'Maç başlamak üzere'; end if;   -- 326: pay içinde ekrana gelen soru cevaplanabilir
    v_index:=m.aktif_soru; v_bas:=m.soru_baslangic;
  else
    v_index:=case when v_ben_p1 then m.oyuncu1_soru else m.oyuncu2_soru end;
    v_bas:=coalesce(case when v_ben_p1 then m.oyuncu1_baslangic else m.oyuncu2_baslangic end,now());
  end if;
  if v_index>=v_toplam then raise exception 'Bu maçta senin sıran bitti'; end if;
  -- 329: istemci hangi soruyu cevapladığını söyler; soru değiştiyse (eski kart) reddedilir.
  if p_soru_index is not null and p_soru_index <> v_index then raise exception 'Soru değişti, tekrar dene'; end if;
  v_soru_id:=public.soru_id_coz('1v1',p_match_id,auth.uid(),v_index,m.soru_ids[v_index+1]);
  v_bas:=public.soru_baslangic_coz('1v1',p_match_id,auth.uid(),v_index,v_bas);
  -- 991: süre içinde tıklanıp geç varan cevap kabul (eski 2 sn varış toleransı aynen)
  if not public.cevap_gec_kabul(v_bas+interval '15 seconds',interval '2 seconds',public.ayar_ondalik('cevap_gec_varis_sn', 5)) then raise exception 'Süre doldu'; end if;
  if exists(select 1 from public.match_answers a where a.match_id=p_match_id and a.user_id=auth.uid() and a.soru_index=v_index)
    then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if v_senkron and exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=p_match_id
    and k.soru_index=v_index and k.tur='sis' and k.user_id<>auth.uid()
    and k.created_at+make_interval(secs=>public.ayar_sayi('klasik_sis_sn',3))>now())
    then raise exception 'Sis kalkınca cevaplayabilirsin'; end if;
  select * into q from public.questions where id=v_soru_id;
  v_dogru:=(p_cevap=q.dogru_cevap);
  select k.tur into v_skill from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=p_match_id
    and k.user_id=auth.uid() and k.soru_index=v_index and k.tur in('sigorta','cifte_puan','ikinci_sans')
    order by k.created_at desc limit 1;
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s where s.mac_tur='1v1'
    and s.mac_id=p_match_id and s.user_id=auth.uid() and s.soru_index=v_index for update;
  if v_skill='ikinci_sans' and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri(mac_tur,mac_id,user_id,soru_index,ilk_cevap)
    values('1v1',p_match_id,auth.uid(),v_index,p_cevap);
    select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
    return query select false,q.dogru_cevap,0,
      case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,true,p_cevap;
    return;
  end if;
  if v_ilk is not null and p_cevap=v_ilk then raise exception 'Başka bir cevap seç'; end if;
  delete from public.skill_ikinci_sans_denemeleri where mac_tur='1v1' and mac_id=p_match_id
    and user_id=auth.uid() and soru_index=v_index;
  perform public.soru_sayac(q.id,v_dogru);
  insert into public.match_answers(match_id,user_id,soru_index,cevap,dogru)
  values(p_match_id,auth.uid(),v_index,p_cevap,v_dogru);
  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;
  v_puan:=case when v_dogru and v_skill='cifte_puan' then 20 when v_dogru then 10
    when not v_dogru and v_skill='sigorta' then 5 else 0 end;
  if v_ben_p1 then
    update public.matches set oyuncu1_skor=oyuncu1_skor+v_puan,oyuncu1_soru=v_index+1,
      oyuncu1_baslangic=case when v_senkron then oyuncu1_baslangic else null end,
      oyuncu1_bitti_at=case when not v_senkron and v_index+1>=v_toplam then now() else oyuncu1_bitti_at end,
      aktif_soru=case when v_senkron then aktif_soru else greatest(aktif_soru,v_index+1) end where id=p_match_id;
  else
    update public.matches set oyuncu2_skor=oyuncu2_skor+v_puan,oyuncu2_soru=v_index+1,
      oyuncu2_baslangic=case when v_senkron then oyuncu2_baslangic else null end,
      oyuncu2_bitti_at=case when not v_senkron and v_index+1>=v_toplam then now() else oyuncu2_bitti_at end,
      aktif_soru=case when v_senkron then aktif_soru else greatest(aktif_soru,v_index+1) end where id=p_match_id;
  end if;
  perform public.advance_match(p_match_id);
  select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
  return query select v_dogru,q.dogru_cevap,v_puan,
    case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,false,v_ilk;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.matches%rowtype;
  v_kazanan uuid;
  v_kaybeden uuid;
  v_toplam int;
  v_ikisi_bitti boolean;
  v_terk boolean;
  v_cevap_sayisi int;
  v_yeni int;
  v_bas timestamptz;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found or m.durum <> 'aktif' then return; end if;
  if auth.uid() is not null and auth.uid() not in (m.oyuncu1, m.oyuncu2) then return; end if;

  v_toplam := coalesce(array_length(m.soru_ids, 1), 0);

  -- 460 (terk kuralı): bota karşı başlamış maçta insan oyuncunun nabzı 57 sn (12 sn kopukluk +
  -- 45 sn bekleme — insan-insan maçındaki mac_nabiz kuralıyla aynı) gelmediyse maçı terk etmiş
  -- sayılır: bot kazanır, terk eden ödül almaz. (İnsan-insan maçında bunu mac_nabiz yapar.)
  if coalesce(m.senkron, false) and m.basladi and m.terk_eden is null then
    select case
             when coalesce(p1.is_bot, false) and not coalesce(p2.is_bot, false)
                  and coalesce(m.oyuncu2_hazir_at, '-infinity'::timestamptz) < now() - interval '57 seconds' then m.oyuncu2
             when coalesce(p2.is_bot, false) and not coalesce(p1.is_bot, false)
                  and coalesce(m.oyuncu1_hazir_at, '-infinity'::timestamptz) < now() - interval '57 seconds' then m.oyuncu1
           end
      into v_kaybeden
      from public.profiles p1, public.profiles p2
     where p1.id = m.oyuncu1 and p2.id = m.oyuncu2;
    if v_kaybeden is not null then
      update public.matches set terk_eden = v_kaybeden where id = p_match_id;
      perform public.mac_sonuclandir(p_match_id,
        case when v_kaybeden = m.oyuncu1 then m.oyuncu2 else m.oyuncu1 end, v_kaybeden);
      return;
    end if;
  end if;

  if coalesce(m.senkron, false) then
    if not m.basladi or m.soru_baslangic is null then return; end if;
    if m.duraklatildi_at is not null then return; end if;
    if now() < m.soru_baslangic - public.soru_gosterim_payi() then return; end if;   -- 326: gösterim payı içinde cevaplanabilir

    if m.aktif_soru < v_toplam then
      select count(*) into v_cevap_sayisi
        from public.match_answers a
       where a.match_id = p_match_id and a.soru_index = m.aktif_soru;

      v_bas := public.soru_son_baslangic('1v1', p_match_id, m.aktif_soru, m.soru_baslangic);
      -- 991: cevaplamayan oyuncu (süre dolumu bildirmemişse) bitiş + geç varış payı kadar beklenir
      if v_cevap_sayisi < 2 and now() <= v_bas + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then
        return;
      end if;

      v_yeni := m.aktif_soru + 1;
      update public.matches
         set aktif_soru = v_yeni,
             soru_baslangic = now() + public.soru_gosterim_payi(),   -- 326
             oyuncu1_soru = v_yeni,
             oyuncu2_soru = v_yeni,
             oyuncu1_baslangic = null,
             oyuncu2_baslangic = null,
             oyuncu1_bitti_at = case when v_yeni >= v_toplam then now() else oyuncu1_bitti_at end,
             oyuncu2_bitti_at = case when v_yeni >= v_toplam then now() else oyuncu2_bitti_at end
       where id = p_match_id;

      if v_yeni < v_toplam then return; end if;
    end if;
  else
    v_ikisi_bitti := (m.oyuncu1_soru >= v_toplam and m.oyuncu2_soru >= v_toplam);
    v_terk := (
      (m.oyuncu1_soru >= v_toplam or m.oyuncu2_soru >= v_toplam)
      and coalesce(m.oyuncu1_bitti_at, m.oyuncu2_bitti_at) < now() - interval '24 hours'
    );
    if not (v_ikisi_bitti or v_terk) then
      return;
    end if;
  end if;

  select * into m from public.matches where id = p_match_id;
  if m.oyuncu1_skor > m.oyuncu2_skor then v_kazanan := m.oyuncu1; v_kaybeden := m.oyuncu2;
  elsif m.oyuncu2_skor > m.oyuncu1_skor then v_kazanan := m.oyuncu2; v_kaybeden := m.oyuncu1;
  else v_kazanan := null; v_kaybeden := null;
  end if;

  perform public.mac_sonuclandir(p_match_id, v_kazanan, v_kaybeden);
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_group_match_answer(p_group_match_id uuid, p_cevap smallint, p_soru_index integer DEFAULT NULL::integer)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gm public.group_matches%rowtype;
  q public.questions%rowtype;
  v_dogru boolean;
  v_puan int;
  v_soru_id uuid;
  v_bas timestamptz;
begin
  perform public.hiz_siniri('submit_group_match_answer', 60, interval '60 seconds');
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.group_match_players
    where group_match_id = p_group_match_id and user_id = auth.uid() and davet_durumu = 'kabul'
  ) then
    raise exception 'Bu maçta değilsin';
  end if;
  if gm.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
  -- 329: istemci hangi soruyu cevapladığını söyler; soru değiştiyse (eski kart) reddedilir.
  if p_soru_index is not null and p_soru_index <> gm.aktif_soru then raise exception 'Soru değişti, tekrar dene'; end if;

  v_soru_id := public.soru_id_coz('grup', p_group_match_id, auth.uid(), gm.aktif_soru, gm.soru_ids[gm.aktif_soru + 1]);
  v_bas := public.soru_baslangic_coz('grup', p_group_match_id, auth.uid(), gm.aktif_soru, gm.soru_baslangic);

  -- 991: süre içinde tıklanıp geç varan cevap kabul
  if not public.cevap_gec_kabul(v_bas + interval '15 seconds', interval '1 second', public.ayar_ondalik('cevap_gec_varis_sn', 5)) then raise exception 'Süre doldu'; end if;

  select * into q from public.questions where id = v_soru_id;
  v_dogru := (p_cevap = q.dogru_cevap);
  -- Zorluk kalibrasyonu: dogru oranini biriktir (bkz. migration 147).
  perform public.soru_sayac(q.id, v_dogru);

  insert into public.group_match_answers (group_match_id, user_id, soru_index, cevap, dogru)
  values (p_group_match_id, auth.uid(), gm.aktif_soru, p_cevap, v_dogru);

  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;

  if v_dogru then
    -- HIZ BONUSU YOK: dogru = sabit 10 puan (bkz. migration 143).
    v_puan := 10;
    update public.group_match_players
       set skor = skor + v_puan
     where group_match_id = p_group_match_id and user_id = auth.uid();
  end if;

  return query select v_dogru, q.dogru_cevap;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_group_match(p_group_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gm public.group_matches%rowtype;
  v_toplam_oyuncu int;
  v_cevap_sayisi int;
  v_kazanan uuid;
  v_en_yuksek int;
  v_kazanan_sayisi int;
  v_oyuncu uuid;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_seri int;
  v_tarih date;
  v_yeni_seri int;
  v_bonus int;
  v_odul int;
begin
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found or gm.durum <> 'aktif' then return; end if;
  -- Hazır kapısı ve kopma kilidi (bkz. grup_mac_nabiz)
  if not coalesce(gm.basladi, true) then return; end if;
  if gm.duraklatildi_at is not null then return; end if;

  select count(*) into v_toplam_oyuncu
  from public.group_match_players
  where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null;

  select count(*) into v_cevap_sayisi
  from public.group_match_answers
  where group_match_id = p_group_match_id and soru_index = gm.aktif_soru;

  -- Soru Degistir jokeri: kisisel sayaci dolmamis oyuncu beklenir
  if v_cevap_sayisi < v_toplam_oyuncu
     and now() < public.soru_son_baslangic('grup', p_group_match_id, gm.aktif_soru, gm.soru_baslangic)
                 + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then   -- 991
    return;
  end if;

  if gm.aktif_soru + 1 >= coalesce(array_length(gm.soru_ids, 1), 0) then
    select max(skor) into v_en_yuksek
    from public.group_match_players
    where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null;

    select count(*) into v_kazanan_sayisi
    from public.group_match_players
    where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null and skor = v_en_yuksek;

    if v_kazanan_sayisi = 1 then
      select user_id into v_kazanan
      from public.group_match_players
      where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null and skor = v_en_yuksek;
    else
      v_kazanan := null; -- birden fazla kişi en yüksek skorda: berabere
    end if;

    update public.group_matches
       set durum = 'bitti', kazanan = v_kazanan, bitis = now()
     where id = p_group_match_id;

    -- GRUP MAÇI = ÖDÜLSÜZ ARKADAŞ MODU (Paket 14, 3.5): coin yok, lig puanı yok,
    -- günlük seri bonusu yok. Yalnız rozetler verilir.
    if v_kazanan is not null then
      perform public.award_badge(v_kazanan, 'ilk_galibiyet');
      if (select count(*) from public.group_match_answers
          where group_match_id = p_group_match_id and user_id = v_kazanan and dogru)
         >= coalesce(array_length(gm.soru_ids, 1), 0) then
        perform public.award_badge(v_kazanan, 'tam_isabet');
      end if;
    end if;

  else
    update public.group_matches
       set aktif_soru = aktif_soru + 1, soru_baslangic = now() + public.soru_gosterim_payi()   -- 326
     where id = p_group_match_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_tournament_answer(p_tournament_id uuid, p_cevap smallint, p_soru_index integer DEFAULT NULL::integer)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t public.tournaments%rowtype;
  q public.questions%rowtype;
  p public.tournament_players%rowtype;
  v_dogru boolean;
begin
  -- Hız sınırı: yalnız kullanıcı tetikli çağrılar (bkz. migration 115).
  perform public.hiz_siniri('submit_tournament_answer', 60, interval '60 seconds');
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Turnuva bulunamadı'; end if;
  if t.durum <> 'aktif' then raise exception 'Turnuva aktif değil'; end if;

  select * into p from public.tournament_players
  where tournament_id = p_tournament_id and user_id = auth.uid();
  if not found then raise exception 'Turnuvada değilsin'; end if;
  if p.elendi then raise exception 'Elendin'; end if;

  -- 329: istemci hangi soruyu cevapladığını söyler; soru değiştiyse (eski kart) reddedilir.
  if p_soru_index is not null and p_soru_index <> t.aktif_soru then raise exception 'Soru değişti, tekrar dene'; end if;
  -- 991: süre içinde tıklanıp geç varan cevap kabul
  if not public.cevap_gec_kabul(t.soru_baslangic + interval '15 seconds', interval '1 second', public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;

  select * into q from public.questions where id = t.soru_ids[t.aktif_soru + 1];
  v_dogru := (p_cevap = q.dogru_cevap);
  -- Zorluk kalibrasyonu: dogru oranini biriktir (bkz. migration 147).
  perform public.soru_sayac(q.id, v_dogru);

  insert into public.tournament_answers (tournament_id, user_id, soru_index, cevap, dogru)
  values (p_tournament_id, auth.uid(), t.aktif_soru, p_cevap, v_dogru);

  -- Hatalarım bankası
  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;

  if v_dogru then
    update public.tournament_players
       set dogru_sayisi = dogru_sayisi + 1
     where tournament_id = p_tournament_id and user_id = auth.uid();
  end if;

  return query select v_dogru, q.dogru_cevap;
end;
$function$;

CREATE OR REPLACE FUNCTION public.advance_tournament(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t public.tournaments%rowtype;
  v_kalan int;
  v_elenecek int;
  v_kazanan uuid;
  v_en_iyi int;
  v_zirve int;
  v_altin uuid;
begin
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.durum <> 'aktif' then return; end if;

  if now() < t.soru_baslangic + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then   -- 991
    if exists (
      select 1 from public.tournament_players tp
      where tp.tournament_id = p_tournament_id and not tp.elendi
        and not exists (
          select 1 from public.tournament_answers ta
          where ta.tournament_id = p_tournament_id
            and ta.user_id = tp.user_id
            and ta.soru_index = t.aktif_soru
        )
    ) then
      return;
    end if;
  end if;

  select count(*) into v_elenecek
  from public.tournament_players tp
  where tp.tournament_id = p_tournament_id and not tp.elendi
    and not exists (
      select 1 from public.tournament_answers ta
      where ta.tournament_id = p_tournament_id
        and ta.user_id = tp.user_id
        and ta.soru_index = t.aktif_soru
        and ta.dogru
    );

  select count(*) into v_kalan
  from public.tournament_players
  where tournament_id = p_tournament_id and not elendi;

  -- Hayattakilerin HEPSİ yanlış yaptıysa kimse elenmez (berabere tur).
  if v_elenecek < v_kalan then
    update public.tournament_players tp
       set elendi = true, elenme_sorusu = t.aktif_soru
     where tp.tournament_id = p_tournament_id and not tp.elendi
       and not exists (
         select 1 from public.tournament_answers ta
         where ta.tournament_id = p_tournament_id
           and ta.user_id = tp.user_id
           and ta.soru_index = t.aktif_soru
           and ta.dogru
       );
    v_kalan := v_kalan - v_elenecek;
  end if;

  if v_kalan = 1 then
    select user_id into v_kazanan
    from public.tournament_players
    where tournament_id = p_tournament_id and not elendi;

  elsif t.aktif_soru + 1 >= coalesce(array_length(t.soru_ids, 1), 0) then
    -- SORULAR BİTTİ. Tek bir zirve varsa o kazanır; eşitlik varsa ALTIN SORU.
    select max(dogru_sayisi) into v_en_iyi
      from public.tournament_players
     where tournament_id = p_tournament_id and not elendi;

    select count(*) into v_zirve
      from public.tournament_players
     where tournament_id = p_tournament_id and not elendi
       and dogru_sayisi = v_en_iyi;

    if v_zirve = 1 then
      select user_id into v_kazanan
        from public.tournament_players
       where tournament_id = p_tournament_id and not elendi
         and dogru_sayisi = v_en_iyi;
    else
      -- Zirvenin altındakiler elenir, kalanlar altın soruda kapışır.
      update public.tournament_players
         set elendi = true, elenme_sorusu = t.aktif_soru
       where tournament_id = p_tournament_id and not elendi
         and dogru_sayisi < v_en_iyi;

      v_altin := public.turnuva_altin_soru_ekle(p_tournament_id);
      if v_altin is null then
        -- Havuzda tek soru bile kalmadı: en erken katılan kazansın,
        -- turnuva askıda kalmasın.
        select user_id into v_kazanan
          from public.tournament_players
         where tournament_id = p_tournament_id and not elendi
         order by dogru_sayisi desc, joined_at asc
         limit 1;
      end if;
    end if;
  end if;

  if v_kazanan is not null then
    update public.tournaments
       set durum = 'bitti', kazanan = v_kazanan, bitis = now()
     where id = p_tournament_id;
    update public.profiles
       set sampiyonluk = sampiyonluk + 1
     where id = v_kazanan;
    perform public.award_badge(v_kazanan, 'sampiyon');
    perform public.turnuva_odullerini_dagit(p_tournament_id, v_kazanan);
  else
    update public.tournaments
       set aktif_soru = aktif_soru + 1, soru_baslangic = now() + public.soru_gosterim_payi()   -- 326
     where id = p_tournament_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.calisma_cevap(p_oturum_id uuid, p_soru_index integer, p_cevap smallint)
 RETURNS TABLE(dogru boolean, dogru_cevap smallint, bankadan boolean, yeni_seri integer, ogrenildi boolean, onceki_yanlis integer, bitti boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  o public.calisma_oturumlari%rowtype;
  q public.questions%rowtype;
  v_dogru boolean;
  v_bankadan boolean;
  v_seri int := 0;
  v_yanlis int := 0;
  v_ogrenildi boolean := false;
  v_bitti boolean := false;
  v_var boolean;
begin
  -- Hız sınırı: yalnız kullanıcı tetikli çağrılar (bkz. migration 115).
  perform public.hiz_siniri('calisma_cevap', 60, interval '60 seconds');
  select * into o from public.calisma_oturumlari where id = p_oturum_id for update;
  if not found then raise exception 'Oturum bulunamadı'; end if;
  if o.user_id <> auth.uid() then raise exception 'Bu oturum senin değil'; end if;
  if o.durum <> 'aktif' then raise exception 'Oturum bitti'; end if;
  if p_soru_index <> o.aktif_soru then raise exception 'Soru değişti'; end if;

  select * into q from public.questions where id = o.soru_ids[o.aktif_soru + 1];
  v_bankadan := q.id = any(o.banka_ids);

  -- Süre 20 sn (+1 sn ağ payı); geçtiyse yanlış sayılır
  -- 991: süre içinde tıklanıp geç varan cevap da sayılır
  if not public.cevap_gec_kabul(o.soru_baslangic + interval '20 seconds', interval '1 second', public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    v_dogru := false;
  else
    v_dogru := (p_cevap = q.dogru_cevap);
    -- Zorluk kalibrasyonu: dogru oranini biriktir (bkz. migration 147).
    perform public.soru_sayac(q.id, v_dogru);
    perform public.soru_cevap_yaz(q.id, o.user_id, p_cevap, v_dogru, 'calisma');   -- Paket 20 II.4
  end if;

  -- Bankadaki satırın önceki durumunu al
  select true, ys.yanlis_sayisi, ys.dogru_serisi
    into v_var, v_yanlis, v_seri
  from public.yanlis_sorular ys
  where ys.user_id = o.user_id and ys.question_id = q.id;

  if v_dogru then
    -- Kategori ustalığı: çalışma modunda da doğrular sayılır
    perform public.kategori_dogru_arttir(o.user_id, q.kategori);

    if coalesce(v_var, false) then
      v_seri := coalesce(v_seri, 0) + 1;
      if v_seri >= 2 then
        v_ogrenildi := true;
        update public.yanlis_sorular ys
           set dogru_serisi = v_seri, ogrenildi_at = now()
         where ys.user_id = o.user_id and ys.question_id = q.id;
      else
        update public.yanlis_sorular ys
           set dogru_serisi = v_seri, ogrenildi_at = null
         where ys.user_id = o.user_id and ys.question_id = q.id;
      end if;
    end if;
    -- Havuzdan gelen soru doğru bilindiyse bankaya hiç girmez.
  else
    -- Yanlış: seri sıfırlanır, banka satırı açılır/güncellenir
    perform public.yanlis_kaydet(q.id);
    v_seri := 0;
    v_yanlis := coalesce(v_yanlis, 0) + 1;
    v_ogrenildi := false;
  end if;

  update public.calisma_oturumlari c
     set dogru = c.dogru + (case when v_dogru then 1 else 0 end),
         yanlis = c.yanlis + (case when v_dogru then 0 else 1 end),
         ogrenilen = c.ogrenilen + (case when v_ogrenildi then 1 else 0 end),
         aktif_soru = c.aktif_soru + 1,
         soru_baslangic = now()
   where c.id = p_oturum_id
  returning c.* into o;

  if o.aktif_soru >= coalesce(array_length(o.soru_ids, 1), 0) then
    v_bitti := true;
  end if;

  return query select v_dogru, q.dogru_cevap, v_bankadan,
                      coalesce(v_seri, 0), v_ogrenildi,
                      coalesce(v_yanlis, 0), v_bitti;
end;
$function$;

-- Sıra/imza aynı: CREATE OR REPLACE mevcut GRANT'ları korur. Yeni iki iç yardımcı istemciye kapalı (987 deseni).
revoke all on function public.cevap_tik_ani() from public, anon, authenticated;
revoke all on function public.cevap_gec_kabul(timestamptz, interval, numeric) from public, anon, authenticated;
