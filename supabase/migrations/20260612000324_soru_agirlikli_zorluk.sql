-- 324: Normal maçlarda soru zorluğa göre AĞIRLIKLI seçilir (Ida, 23 Eyl 2026).
--
-- Sorun: soru_sec zorluğa bakmıyordu; havuz 1–5 için %10/%20/%40/%20/%10 (sıralamaya
-- göre etiketli, 290/316–318) ve `q.zorluk >= 2` filtresi en kolay dilimi tamamen
-- dışlıyordu → maçlarda ~%33 zor/çok zor soru.
--
-- `zorluk >= 2` 147'de "aşırı basit 53 soru yalnız turnuva açılışında" diye eklenmişti.
-- 290'dan beri zorluk mutlak değil sıralamadır (zorluk 1 = havuzun en kolay %10'u),
-- o gerekçe artık geçerli değil; ağırlık bunu yönetiyor. Filtre kaldırıldı.
--
-- Seçim: her soru yuvası için önce ağırlığa göre grup (kolay 1–2 · orta 3 · zor 4–5),
-- sonra o gruptan mevcut kurallarla (görülmemiş önce, dil, şık ipucu, okuma yükü)
-- soru. Grupta soru kalmazsa komşu gruba düşer (kolay→orta→zor, orta→kolay→zor,
-- zor→orta→kolay). Havuz genişletme sırası (okuma yükü, sonra kategori) aynı.
--
-- Kullananlar (hepsi soru_sec üzerinden): Klasik serbest/dereceli (quick_match,
-- kuyruga_gir, hemen_bot_mac, hemen_bot_mac_sec, respond_challenge, rovans_iste,
-- bot_oyna), Saf Bilgi (aynı Klasik yolları), Düello (duello_soru_bul ←
-- duello2_soru_ac, duello2_skill, duello2_bot_skill_dene, duello_kategori_uygula,
-- duello_savunma_jokeri), Grup (respond_group_challenge, grup_kur_kuyruktan),
-- Soru Değiştir (mac_soru_degistir), Hatalarım dolgusu (calisma_baslat).
-- Turnuva (turnuva_soru_sec, turnuva_altin_soru_ekle) ve bot isabeti (302) DEĞİŞMEZ.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('soru_agirlik_kolay', '55'::jsonb, 'Normal maç soru seçimi: kolay (zorluk 1–2) grubunun ağırlığı'),
  ('soru_agirlik_orta',  '30'::jsonb, 'Normal maç soru seçimi: orta (zorluk 3) grubunun ağırlığı'),
  ('soru_agirlik_zor',   '15'::jsonb, 'Normal maç soru seçimi: zor (zorluk 4–5) grubunun ağırlığı')
on conflict (anahtar) do nothing;

create or replace function public.soru_sec(p_kategori text, p_adet integer, p_oyuncular uuid[] default '{}'::uuid[], p_dil text default null::text, p_max_okuma integer default null::integer, p_serbest_klasik boolean default false)
 returns uuid[]
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_oyn uuid[] := coalesce(p_oyuncular, '{}'::uuid[]);
  v_adet int := greatest(1, coalesce(p_adet, 1));
  v_kat text := p_kategori;
  v_diller text[];
  v_max int := p_max_okuma;
  v_ids uuid[] := '{}'::uuid[];
  v_deneme int;
  v_supheli_haric boolean := public.soru_supheli_haric_mi();   -- Paket 20 II.6
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  -- 324: zorluk grubu ağırlıkları
  v_w1 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_kolay', 55), 0));
  v_w2 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_orta', 30), 0));
  v_w3 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_zor', 15), 0));
  v_k uuid[]; v_o uuid[]; v_z uuid[];
  v_ik int := 1; v_io int := 1; v_iz int := 1;
  v_toplam int;
  v_r numeric;
  v_g int;
  v_sira int[];
  v_yuva int;
begin
  if v_w1 + v_w2 + v_w3 <= 0 then v_w1 := 1; v_w2 := 1; v_w3 := 1; end if;

  if nullif(btrim(coalesce(p_dil, '')), '') is not null then
    v_diller := array[btrim(p_dil)];
  else
    select coalesce(array_agg(distinct coalesce(nullif(btrim(pr.dil), ''), 'tr')), array['tr'])
      into v_diller
      from public.profiles pr
     where pr.id = any(v_oyn);
  end if;
  if coalesce(array_length(v_diller, 1), 0) = 0 then v_diller := array['tr']; end if;

  for v_deneme in 1..3 loop
    -- Her gruptan en çok v_adet aday (görülmemiş önce, sonra en eski görülen, rastgele).
    select coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 1), '{}'::uuid[]),
           coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 2), '{}'::uuid[]),
           coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 3), '{}'::uuid[])
      into v_k, v_o, v_z
    from (
      select q.id,
             case when q.zorluk <= 2 then 1 when q.zorluk = 3 then 2 else 3 end as grup,
             row_number() over (
               partition by case when q.zorluk <= 2 then 1 when q.zorluk = 3 then 2 else 3 end
               order by (gs.son is not null), gs.son asc, random()
             ) as rn
      from public.questions q
      left join lateral (
        select max(g.gorulen_at) as son
        from public.gorulen_sorular g
        where g.question_id = q.id and g.user_id = any(v_oyn)
      ) gs on true
      where q.aktif
        -- Paket 20 II.6: denetlenmemiş + kural işaretli soru rekabetçi havuza girmez (ayar: soru_supheli_rekabetci_haric)
        and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik
                 -- 309: Serbest Klasik'te yalnız 'sik_ipucu_jev' işareti dışlamaz; soru ancak
                 -- BAŞKA bir işaretin ağırlığı eşiğe ulaşıyorsa dışarıda kalır.
                 and (not coalesce(p_serbest_klasik, false)
                      or exists (select 1 from unnest(q.supheli_isaretler) i
                                  where i <> 'sik_ipucu_jev'
                                    and public.soru_isaret_agirligi(i) >= v_haric_agirlik)))
        and (v_kat is null or q.kategori = v_kat)
        -- HER oyuncunun dilinde okunabilmeli: ya kaynak dil o dil,
        -- ya da o dilde çevirisi var. Aksi halde soru havuzda yok.
        and not exists (
          select 1 from unnest(v_diller) d
           where d <> q.dil
             and not exists (
               select 1 from public.question_translations t
                where t.question_id = q.id and t.dil = d and not t.eskidi
             )
        )
        and (
          v_max is null
          or length(q.soru)
             + (select coalesce(sum(length(x)), 0)
                  from jsonb_array_elements_text(q.secenekler) x) <= v_max
        )
    ) s
    where s.rn <= v_adet;

    v_toplam := coalesce(array_length(v_k, 1), 0) + coalesce(array_length(v_o, 1), 0)
              + coalesce(array_length(v_z, 1), 0);

    exit when v_toplam >= v_adet;

    -- Havuz genişletme SIRASI: önce okuma yükü, sonra kategori.
    -- DİL ARTIK GEVŞETİLMİYOR — oyuncuya anlamadığı dilde soru sormaktansa
    -- havuz dar kalsın (görev kararı: "çevirisi olmayan soru sorulmasın").
    if v_max is not null then
      v_max := null;
    elsif v_kat is not null then
      v_kat := null;
    else
      exit;
    end if;
  end loop;

  -- Yuva yuva ağırlıklı grup seçimi; grup tükenirse komşu gruba düşer.
  for v_yuva in 1..least(v_adet, v_toplam) loop
    v_r := random() * (v_w1 + v_w2 + v_w3);
    v_sira := case
      when v_r < v_w1 then array[1, 2, 3]
      when v_r < v_w1 + v_w2 then array[2, 1, 3]
      else array[3, 2, 1]
    end;
    foreach v_g in array v_sira loop
      if v_g = 1 and v_ik <= coalesce(array_length(v_k, 1), 0) then
        v_ids := v_ids || v_k[v_ik]; v_ik := v_ik + 1; exit;
      elsif v_g = 2 and v_io <= coalesce(array_length(v_o, 1), 0) then
        v_ids := v_ids || v_o[v_io]; v_io := v_io + 1; exit;
      elsif v_g = 3 and v_iz <= coalesce(array_length(v_z, 1), 0) then
        v_ids := v_ids || v_z[v_iz]; v_iz := v_iz + 1; exit;
      end if;
    end loop;
  end loop;

  return v_ids;
end;
$function$;
