-- GERİ ALMA 988 → 987 kasa_cozumle (Savunma Sorusu hazine hedefe/tavana ulaşınca açılmaz).
-- Uygulama: bu dosyayı SQL olarak çalıştır. Şema/ayar değişmediği için başka adım yok.

CREATE OR REPLACE FUNCTION public.kasa_cozumle(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_dogru smallint;
  v_kat text;
  v_c1 smallint; v_c2 smallint;
  v_d1 boolean; v_d2 boolean;
  v_artis int := 0;
  v_kasa int;
  v_sahip uuid;
  v_kazanan uuid;
  v_oy uuid; v_c smallint; v_d boolean; v_at timestamptz;
  v_h uuid;          -- 987: savunan (hak sahibi)
  v_sav jsonb;       -- 987: bekleyen Savunma Sorusu
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'cevap' then return; end if;
  select q.dogru_cevap, q.kategori into v_dogru, v_kat from public.questions q where q.id = k.soru_id;
  v_c1 := (k.cevaplar -> k.oyuncu1::text ->> 'cevap')::smallint;
  v_c2 := (k.cevaplar -> k.oyuncu2::text ->> 'cevap')::smallint;
  v_d1 := v_c1 is not null and v_c1 = v_dogru;
  v_d2 := v_c2 is not null and v_c2 = v_dogru;

  -- Oyuncu cevapları (yanıtsız da yazılır: cevap null, yanlış)
  foreach v_oy in array array[k.oyuncu1, k.oyuncu2] loop
    v_c := case when v_oy = k.oyuncu1 then v_c1 else v_c2 end;
    v_d := case when v_oy = k.oyuncu1 then v_d1 else v_d2 end;
    v_at := (k.cevaplar -> v_oy::text ->> 'at')::timestamptz;
    insert into public.kasa_cevaplari (kasa_id, tur, user_id, soru_id, kategori, cevap, dogru, sure_ms)
    values (p_id, k.tur, v_oy, k.soru_id, v_kat, v_c, v_d,
            case when v_at is not null then greatest(0, round(extract(epoch from
                 (v_at - k.soru_baslangic - public.kasa_gosterim_payi())) * 1000))::int end)
    on conflict (kasa_id, tur, user_id) do nothing;
    if v_c is not null then
      perform public.kategori_istatistik_yaz(v_oy, v_kat, v_d);
      perform public.soru_sayac(k.soru_id, v_d);                                -- 957 (Düello gibi)
      if v_d then perform public.kategori_dogru_arttir(v_oy, v_kat); end if;    -- 957: ustalık
    end if;
  end loop;

  if k.altin then
    v_kasa := k.kasa; v_sahip := k.sahip;
    v_kazanan := case when v_d1 and not v_d2 then k.oyuncu1 when v_d2 and not v_d1 then k.oyuncu2 end;
  else
    v_artis := case when v_d1 and v_d2 then k.ikisi_artis else k.artis end;
    v_kasa := k.kasa + v_artis;
    -- 955: tavan artıştan SONRA (0 = yok)
    if k.kasa_tavan > 0 then v_kasa := least(v_kasa, k.kasa_tavan); end if;
    v_sahip := case when v_d1 and not v_d2 then k.oyuncu1
                    when v_d2 and not v_d1 then k.oyuncu2
                    else k.sahip end;
    -- 987: hak sahibi YANLIŞ + rakip TEK BAŞINA doğru → rakip AÇ/DEVAM'a geçmez, önce Savunma Sorusu.
    -- Açılmaz: son tur (oyun biter), kasa hedefe/tavana doldu. Altın Soru bu dalda değil.
    if k.savunma_acik and k.savunma is null and k.tur < k.max_tur
       and v_kasa < k.hedef and (k.kasa_tavan = 0 or v_kasa < k.kasa_tavan) then
      v_h := case when v_d1 and not v_d2 and k.oyuncu2 = any(k.savunma_hak) then k.oyuncu2
                  when v_d2 and not v_d1 and k.oyuncu1 = any(k.savunma_hak) then k.oyuncu1 end;
      if v_h is not null then
        v_sav := jsonb_build_object('sahip', v_h, 'rakip', v_sahip, 'tur', k.tur, 'kategori', v_kat, 'durum', 'bekliyor');
        v_sahip := null;   -- hazine Savunma Sorusu bitene kadar sahipsiz
      end if;
    end if;
  end if;

  update public.kasa_maclari
     set faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => k.sonuc_sn),
         kasa = v_kasa, sahip = v_sahip, savunma = v_sav,
         son_tur = jsonb_build_object(
           'tur', k.tur, 'altin', k.altin, 'dogru_cevap', v_dogru,
           'dogru', jsonb_build_object(k.oyuncu1::text, v_d1, k.oyuncu2::text, v_d2),
           'artis', v_artis, 'kasa_once', k.kasa, 'kasa_sonra', v_kasa,
           -- 955: tavana kırpıldı mı (istemci gerçek artışı kasa_sonra − kasa_once ile gösterir)
           'tavan_kirpti', not k.altin and k.kasa_tavan > 0 and k.kasa + v_artis > k.kasa_tavan,
           'sahip_once', k.sahip, 'sahip_sonra', v_sahip, 'kazanan', v_kazanan)
           || case when v_sav is not null then jsonb_build_object('savunma', v_sav) else '{}'::jsonb end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler
     set dogru1 = v_d1, dogru2 = v_d2, artis = v_artis, kasa_sonra = v_kasa, sahip_sonra = v_sahip,
         puan1_sonra = k.puan1, puan2_sonra = k.puan2, soru_id = k.soru_id, kategori = v_kat
   where kasa_id = p_id and tur = k.tur;
end $function$;
