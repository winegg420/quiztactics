-- 920 — Dükkân sadeleştirme + tepki paketleri Battle Pass'te (Ida onayı, 2 Eki 2026).
--
-- Dükkân dört sekmeye indi (Elmas · Joker · Çerçeve · Avatar ve İsim). Bu dosya sunucu tarafıdır:
--
-- 1) SATIŞ KAPANIR: VS kartı, zafer efekti ve tepki paketi türündeki BÜTÜN kalemler
--    kozmetikler.satis_pasif = true olur (780'deki Ejderha deseni). kozmetik_satista() bunu okur →
--    kozmetik_satin_al 'Bu kozmetik satılmıyor' der, kozmetik_katalogu kalemi yalnız SAHİBİNE döner
--    (kapali = true, takılır/çıkarılır). SATIR, SAHİPLİK VE TAKILI KAYIT SİLİNMEZ; aktif/onay
--    değişmez (kalem oyunda çizilmeye devam eder). Geri açmak: satis_pasif = false.
--    Kıyafet (gardırop) ve Arka Plan zaten dondurulmuştu (GARDIROP_ACIK / arka_plan_acik) — dokunulmadı.
-- 2) TEPKİ PAKETLERİ BATTLE PASS ÖDÜLÜ: Eğlence ve Rekabet paketleri bp_seviye_odulleri'nde zaten var
--    (721: seviye 3 ve 12, ücretli kol); bu dosya ödül tablosunu DEĞİŞTİRMEZ, yalnız ikisinin de
--    durduğunu denetler. Ödül kozmetik_ver ile verilir (satış kapısına bakmaz) — aşağıda denenir.
--
-- Yetki/RLS/GRANT değişikliği YOK; işlev tanımı değişmez. Dosya kendi denetimini yapar: bir koşul
-- tutmazsa exception atar ve hiçbir şey uygulanmaz.

do $$
declare
  c_kapanan constant text[] := array['vs_karti', 'zafer_efekti', 'tepki_paketi'];
  v_sahiplik_once bigint;
  v_sahiplik_sonra bigint;
  v_diger_once text[];
  v_diger_sonra text[];
  v_bp_once text;
  v_bp_sonra text;
  v_n int;
  v_sahibi uuid;
  v_esya text;
  v_oyuncu uuid;
  v_verildi boolean := false;
  r record;
begin
  -- ---------- önceki durum ----------
  select count(*) into v_sahiplik_once from public.oyuncu_kozmetikleri;
  select array_agg(k.anahtar order by k.anahtar) into v_diger_once
    from public.kozmetikler k where k.tur <> all (c_kapanan) and public.kozmetik_satista(k.anahtar);
  select md5(string_agg(o::text, '|' order by o.seviye, o.kol)) into v_bp_once from public.bp_seviye_odulleri o;

  -- ---------- 1. satış kapanır ----------
  update public.kozmetikler set satis_pasif = true where tur = any (c_kapanan) and not satis_pasif;
  get diagnostics v_n = row_count;
  raise notice '920: satışı kapanan kalem: %', v_n;

  -- ---------- denetim A: kapanan türlerde satılan kalem kalmadı, diğer türler aynen ----------
  if exists (select 1 from public.kozmetikler k where k.tur = any (c_kapanan) and public.kozmetik_satista(k.anahtar)) then
    raise exception '920: kapanan türlerde hâlâ satılan kalem var';
  end if;
  select array_agg(k.anahtar order by k.anahtar) into v_diger_sonra
    from public.kozmetikler k where k.tur <> all (c_kapanan) and public.kozmetik_satista(k.anahtar);
  if v_diger_once is distinct from v_diger_sonra then
    raise exception '920: dükkânda kalan türlerin satış listesi değişti (% → %)', v_diger_once, v_diger_sonra;
  end if;

  -- ---------- denetim B: sahiplik aynen ----------
  select count(*) into v_sahiplik_sonra from public.oyuncu_kozmetikleri;
  if v_sahiplik_once <> v_sahiplik_sonra then
    raise exception '920: sahiplik satırı değişti (% → %)', v_sahiplik_once, v_sahiplik_sonra;
  end if;

  -- ---------- denetim C: kapanan kalemin sahibi onu envanterinde (katalogda sahip = true) görmeye devam eder ----------
  select o.user_id, o.kozmetik into v_sahibi, v_esya
    from public.oyuncu_kozmetikleri o
    join public.kozmetikler k on k.anahtar = o.kozmetik
   where k.tur = any (c_kapanan) and k.aktif and k.onay = 'girsin'
   limit 1;
  if v_sahibi is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', v_sahibi, 'role', 'authenticated')::text, true);
    if not exists (select 1 from public.kozmetik_katalogu() kk where kk.anahtar = v_esya and kk.sahip and not kk.satilik) then
      raise exception '920: sahibi % kalemini envanterinde göremiyor', v_esya;
    end if;
  else
    raise notice '920: kapanan türlerde sahipli kalem yok — envanter denetimi atlandı';
  end if;

  -- ---------- denetim D: sıradan oyuncunun dükkân listesinde kapanan türler yok; satın alma reddedilir ----------
  for r in
    select p.id from public.profiles p
     where not coalesce(p.is_bot, false)
       and not exists (select 1 from public.oyuncu_kozmetikleri o join public.kozmetikler k on k.anahtar = o.kozmetik
                        where o.user_id = p.id and k.tur = any (c_kapanan))
     limit 20
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', r.id, 'role', 'authenticated')::text, true);
    if not public.sahip_mi() then v_oyuncu := r.id; exit; end if;
  end loop;
  if v_oyuncu is not null then
    if exists (select 1 from public.kozmetik_katalogu() kk where kk.tur = any (c_kapanan)) then
      raise exception '920: sıradan oyuncunun dükkân listesinde kapanan tür görünüyor';
    end if;
    begin
      perform public.kozmetik_satin_al('tepki_eglence');
      raise exception '920: kapanan kalem satın alınabildi';
    exception when others then
      if sqlerrm not like '%satılmıyor%' then raise; end if;
    end;

    -- ---------- denetim E: Battle Pass ödül yolu (kozmetik_ver) satış kapalıyken de verir — alt işlemde, geri alınır ----------
    begin
      perform public.kozmetik_ver(v_oyuncu, 'tepki_eglence', 'etkinlik');
      v_verildi := exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_oyuncu and o.kozmetik = 'tepki_eglence');
      raise exception using errcode = 'QT920', message = 'prova geri alınır';
    exception when sqlstate 'QT920' then null;
    end;
    if not v_verildi then raise exception '920: Battle Pass ödül yolu tepki paketini veremedi'; end if;
  else
    raise notice '920: sıradan oyuncu bulunamadı — liste/ödül denetimi atlandı';
  end if;
  perform set_config('request.jwt.claims', '', true);

  -- ---------- 2. Battle Pass: iki tepki paketi de ödül, tablo aynen ----------
  select count(distinct o.veri->>'anahtar') into v_n
    from public.bp_seviye_odulleri o
   where o.tur = 'tepki_paketi' and not o.placeholder and o.veri->>'anahtar' in ('tepki_eglence', 'tepki_rekabet');
  if v_n <> 2 then
    raise exception '920: Battle Pass ödül tablosunda iki tepki paketi yok (bulunan: %)', v_n;
  end if;
  select md5(string_agg(o::text, '|' order by o.seviye, o.kol)) into v_bp_sonra from public.bp_seviye_odulleri o;
  if v_bp_once is distinct from v_bp_sonra then raise exception '920: Battle Pass ödül tablosu değişti'; end if;
  if (select count(*) from public.oyuncu_kozmetikleri) <> v_sahiplik_once then
    raise exception '920: prova sahiplik bıraktı';
  end if;

  raise notice '920: denetimler geçti — satılan: %; BP tepki ödülleri: %', v_diger_sonra,
    (select string_agg(o.seviye || ' ' || o.kol || ' ' || (o.veri->>'anahtar'), ', ' order by o.seviye)
       from public.bp_seviye_odulleri o where o.tur = 'tepki_paketi' and not o.placeholder);
end $$;
