-- 681: Düello Hâkimiyet — bot kategori seçimi hamle kuralına göre.
-- Hamle yalnız "saldıran doğru + savunan yanlış" ise tutar; bot hedef değeri =
-- (botun doğru olasılığı) × (1 − rakibin doğru olasılığı). Eski (hakimiyet=false) maçlarda
-- eski puan mantığı AYNEN çalışır. Yetki/GRANT değişmez (CREATE OR REPLACE mevcut yetkileri korur).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_bot_hamle_en_iyi_yuzde', '70', 'Düello Hâkimiyet botu: en yüksek değerli kategoriyi seçme olasılığı (%); kalanı en iyi dışındaki uygun kategorilerden rastgele'),
  ('duello_bot_pekistir_agirlik', '0.5', 'Düello Hâkimiyet botu: kendi kategorisini pekiştirmenin değer çarpanı (yuva kazandırmadığı için < 1)')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

create or replace function public.duello2_bot_kategori(p_id uuid, p_bot uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  -- 681: Hâkimiyet dalı
  v_ks text[] := '{}';
  v_deger numeric[] := '{}';
  v_tur text[] := '{}';
  v_k text;
  v_bot_p numeric;
  v_rak_p numeric;
  v_sahip text;
  v_esik int;
  v_ben_yuva int;
  v_rakip_yuva int;
  v_en_iyi numeric := public.ayar_sayi('duello_bot_hamle_en_iyi_yuzde', 70);
  v_pekistir numeric := public.ayar_ondalik('duello_bot_pekistir_agirlik', 0.5);
  v_en_iyi_k text;
begin
  select * into d from public.duellolar where id = p_id;

  if coalesce(d.hakimiyet, false) then
    v_esik := coalesce(d.hakimiyet_esik, 4);
    v_ben_yuva := case when d.oyuncu1 = p_bot then coalesce(d.yuva1, 0) else coalesce(d.yuva2, 0) end;
    v_rakip_yuva := case when d.oyuncu1 = p_bot then coalesce(d.yuva2, 0) else coalesce(d.yuva1, 0) end;
    v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);

    -- Aday: kilitsiz (uygun) kategoriler; her biri için tür (bos/rakip/kendi) ve hedef değer.
    for v_k in select k from unnest(public.duello_kategorileri()) k
                where public.duello2_kategori_uygun_mu(p_id, k) loop
      v_bot_p := public.bot_kategori_isabet(p_bot, v_k);
      v_rak_p := case when jsonb_typeof(v_rakip_oran -> v_k) = 'number' then (v_rakip_oran ->> v_k)::numeric / 100.0 else 0.5 end;
      v_sahip := d.sahiplik ->> v_k;
      v_ks := v_ks || v_k;
      if v_sahip is null then
        v_tur := v_tur || 'bos'::text;
        v_deger := v_deger || (v_bot_p * (1 - v_rak_p));
      elsif v_sahip = p_bot::text then
        v_tur := v_tur || 'kendi'::text;
        v_deger := v_deger || (v_bot_p * (1 - v_rak_p) * v_pekistir);
      else
        v_tur := v_tur || 'rakip'::text;
        v_deger := v_deger || (v_bot_p * (1 - v_rak_p));
      end if;
    end loop;

    if coalesce(array_length(v_ks, 1), 0) > 0 then
      -- ÖNCELİK 1: nakavt (bot eşiğe 1 kala) — yalnız boş + rakip kategorisi, en yüksek değer, rastgelelik yok.
      if v_ben_yuva >= v_esik - 1 then
        select t.k into v_kat from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
         where t.tr in ('bos', 'rakip') order by t.v desc, t.k limit 1;
        if v_kat is not null then return v_kat; end if;
      end if;
      -- ÖNCELİK 2: kritik geri alma (rakip eşiğe 1 kala) — rakibin kategorilerinden en yüksek değer.
      if v_rakip_yuva >= v_esik - 1 then
        select t.k into v_kat from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
         where t.tr = 'rakip' order by t.v desc, t.k limit 1;
        if v_kat is not null then return v_kat; end if;
      end if;
      -- Normal: %en_iyi → en yüksek değerli; kalan → en iyi dışındaki uygunlardan rastgele.
      select t.k into v_en_iyi_k from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
       order by t.v desc, t.k limit 1;
      if v_r < v_en_iyi or array_length(v_ks, 1) = 1 then
        return v_en_iyi_k;
      end if;
      select t.k into v_kat from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
       where t.k <> v_en_iyi_k order by random() limit 1;
      return coalesce(v_kat, v_en_iyi_k);
    end if;

    -- Hiç aday yok (pratikte olmaz): yedek — rastgele kategori.
    select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
    return v_kat;
  end if;

  -- ===== Eski (puan) maçlar: 680 öncesi gövde AYNEN =====
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
end $function$;
