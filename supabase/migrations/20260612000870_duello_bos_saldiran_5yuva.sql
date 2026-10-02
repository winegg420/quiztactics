-- 870 · Düello Hâkimiyet: iki kural değişikliği (Ida, 2 Eki 2026).
-- 1) BOŞ kategoride saldıran VE savunan ikisi de doğru bilirse kategoriyi SALDIRAN alır (kilit kuralı aynen:
--    alınca kilit_tur tur kilitli). son_hamle/duello_hamleler › hakimiyet: tuttu = true, neden = 'bos_ikisi_dogru'.
--    Rakibin / kendi kategorisinde ikisi doğru → değişmez; ikisi yanlış → değişmez; "saldıran doğru + savunan yanlış"
--    ve "boşta saldıran yanlış + savunan doğru → savunan alır" AYNEN. Baskın / Kalkan / çakışma / ban akışı dokunulmadı
--    (boşta Baskın zaten tutar → neden 'baskin'; Kalkan yalnız elinden_al'da geçerli).
--    Ayar: duello_bos_ikisi_dogru_saldiran (1); 0 → eski davranış (boşta ikisi doğru → kimse almaz).
-- 2) Kazanma eşiği 4 → 5 yuva: duello_hakimiyet_esik = 5. Eşik maç açılırken duellolar.hakimiyet_esik'e
--    sabitlendiğinden süren maçlar 4 ile biter; yeni maçlar 5.
-- duello2_cozumle gövdesi 680'deki tanımın aynısıdır; tek fark "870" işaretli daldır.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_bos_ikisi_dogru_saldiran', '1'::jsonb, 'Düello Hâkimiyet: boş kategoride ikisi de doğru bilirse saldıran alır (1); 0 → kimse almaz (eski kural)')
on conflict (anahtar) do nothing;

update public.oyun_ayarlari set deger = '5'::jsonb where anahtar = 'duello_hakimiyet_esik';

-- ---------------------------------------------------------------- duello2_cozumle
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
  -- 680: Hâkimiyet
  v_hk jsonb;
  v_sahip text;
  v_eylem text;
  v_baskin boolean := false;
  v_kalkan boolean := false;
  v_cakisma boolean := false;
  v_sav_sayilir boolean;
  v_tuttu boolean := false;
  v_yeni_sahip text;
  v_neden text;
  v_kilit boolean := false;
  v_sahiplik jsonb;
  v_kilitler jsonb;
  v_y1 int;
  v_y2 int;
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

  if coalesce(d.hakimiyet, false) and not d.uzatma then
    -- 680 · HAMLE KURALI: hamle yalnız "saldıran doğru + savunan yanlış" ise tutar.
    --   Rakibin kategorisi (elinden_al): tutarsa saldırana geçer. Boş (al): tutarsa saldıran alır;
    --   saldıran yanlış + savunan doğru → savunan alır (kontra). Kendi kategorisi (pekistir): tutarsa kilitlenir.
    --   870: boşta ikisi de doğru → saldıran alır (ayar duello_bos_ikisi_dogru_saldiran = 1).
    --   Sahipliği değişen ya da pekiştirilen kategori kilit_tur tur seçilemez (kilitler[k] = son kilitli tur).
    -- Jokerler (bu soru indeksinde): Baskın (saldıran) → savunanın cevabı sayılmaz; Kalkan (savunan, yalnız
    --   elinden_al) → hamle tutmaz. İkisi birden → birbirini götürür, ikisi de harcanmış olur, normal kural.
    v_sahip := d.sahiplik ->> d.kategori;
    v_eylem := case when v_sahip is null then 'al' when v_sahip = d.saldiran::text then 'pekistir' else 'elinden_al' end;
    v_baskin := exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                          and k.soru_index = v_idx and k.user_id = d.saldiran and k.tur = 'baskin');
    v_kalkan := v_eylem = 'elinden_al' and exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello'
                          and k.mac_id = p_id and k.soru_index = v_idx and k.user_id = v_savunan and k.tur = 'kalkan');
    v_cakisma := v_baskin and v_kalkan;
    v_sav_sayilir := v_d_sav and not (v_baskin and not v_cakisma);
    v_tuttu := v_d_sal and not v_sav_sayilir and not (v_kalkan and not v_cakisma);
    v_yeni_sahip := v_sahip;
    if v_tuttu then
      v_yeni_sahip := d.saldiran::text;
      v_kilit := true;                                     -- el değişti ya da pekiştirildi
      v_neden := case when v_baskin and not v_cakisma and v_d_sav then 'baskin' else 'tuttu' end;
    elsif v_eylem = 'al' and v_d_sal and v_sav_sayilir
          and public.ayar_sayi('duello_bos_ikisi_dogru_saldiran', 1) >= 1 then
      -- 870: boş kategoride ikisi de doğru → saldıran alır (Baskın varsa üstteki dal tutar, neden baskin).
      v_tuttu := true;
      v_yeni_sahip := d.saldiran::text;
      v_kilit := true;
      v_neden := 'bos_ikisi_dogru';
    elsif v_eylem = 'al' and not v_d_sal and v_sav_sayilir then
      v_yeni_sahip := v_savunan::text;                     -- boşta bilen alır
      v_kilit := true;
      v_neden := 'kontra';
    else
      v_neden := case when v_kalkan and not v_cakisma and v_d_sal then 'kalkan'
                      when v_d_sal and v_d_sav then 'ikisi_dogru'
                      when not v_d_sal and not v_d_sav then 'ikisi_yanlis'
                      else 'saldiran_yanlis' end;
    end if;
    v_sahiplik := case when v_yeni_sahip is null then coalesce(d.sahiplik, '{}'::jsonb)
                       else coalesce(d.sahiplik, '{}'::jsonb) || jsonb_build_object(d.kategori, v_yeni_sahip) end;
    v_kilitler := case when v_kilit and coalesce(d.kilit_tur, 0) > 0
                       then coalesce(d.kilitler, '{}'::jsonb) || jsonb_build_object(d.kategori, d.tur + d.kilit_tur)
                       else coalesce(d.kilitler, '{}'::jsonb) end;
    select count(*) filter (where e.value #>> '{}' = d.oyuncu1::text),
           count(*) filter (where e.value #>> '{}' = d.oyuncu2::text)
      into v_y1, v_y2 from jsonb_each(v_sahiplik) e;
    v_hk := jsonb_build_object(
      'eylem', v_eylem, 'tuttu', v_tuttu, 'neden', v_neden,
      'sahip_once', v_sahip, 'sahip_sonra', v_yeni_sahip,
      'kilit', case when v_kilit and coalesce(d.kilit_tur, 0) > 0 then d.kilit_tur else 0 end,
      'baskin', v_baskin, 'kalkan', v_kalkan, 'cakisma', v_cakisma,
      'yuvalar', jsonb_build_object(d.oyuncu1::text, v_y1, d.oyuncu2::text, v_y2),
      'esik', d.hakimiyet_esik);
  elsif d.uzatma then
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
     set sahiplik = coalesce(v_sahiplik, sahiplik),
         kilitler = coalesce(v_kilitler, kilitler),
         yuva1 = coalesce(v_y1, yuva1),
         yuva2 = coalesce(v_y2, yuva2),
         puan1 = greatest(0, coalesce(puan1, 0) + (case when oyuncu1 = d.saldiran then v_p_sal else v_p_sav end)),
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
           'hakimiyet', v_hk,
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
                                      yildiz, deger, carpan, puan_saldiran, puan_savunan, altin_kazanan, hakimiyet)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          false, null, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null, v_kalkan_kat,
          v_yildiz, v_deger, coalesce(v_carpan, 1), v_p_sal, v_p_sav, v_altin, v_hk);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $function$
;
