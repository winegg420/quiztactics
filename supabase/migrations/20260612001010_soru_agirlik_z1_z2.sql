-- 1010 · Normal maç soru zorluk dağılımı: Z1 %10 · Z2 %60 · Z3 ~%27 · Z4–5 ~%3 (Ida onayı, 9 Eki 2026).
-- Önce: kolay grubu (Z1+Z2) tek listeydi, Z1/Z2 havuz büyüklüğüne göre karışıyordu (~%20/%60).
-- Şimdi: 4 grup (Z1 · Z2 · Z3 · Z4–5), ayrı ağırlık. Z4/Z5 bölümü havuz oranıyla aynı kalır.
-- Grup tükenirse komşu gruba düşer. Turnuva (turnuva_soru_sec, bantlar 841) DEĞİŞMEZ.
-- Gövde 652'deki soru_sec'in aynısı; yalnız grup/ağırlık mantığı değişti. Geri alma: docs/soru-agirlik-geri-alma-1010.sql

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('soru_agirlik_z1', '10'::jsonb, 'Normal maç soru seçimi: zorluk 1 grubunun ağırlığı (1010)'),
  ('soru_agirlik_z2', '60'::jsonb, 'Normal maç soru seçimi: zorluk 2 grubunun ağırlığı (1010)')
on conflict (anahtar) do nothing;
update public.oyun_ayarlari set deger = '27'::jsonb,
  aciklama = 'Normal maç soru seçimi: orta (zorluk 3) grubunun ağırlığı (1010: 17 → 27)'
where anahtar = 'soru_agirlik_orta';
update public.oyun_ayarlari set
  aciklama = 'KULLANILMIYOR (1010): yerine soru_agirlik_z1 + soru_agirlik_z2'
where anahtar = 'soru_agirlik_kolay';

CREATE OR REPLACE FUNCTION public.soru_sec(p_kategori text, p_adet integer, p_oyuncular uuid[] DEFAULT '{}'::uuid[], p_dil text DEFAULT NULL::text, p_max_okuma integer DEFAULT NULL::integer, p_serbest_klasik boolean DEFAULT false)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- 1010: zorluk grubu ağırlıkları (Z1 · Z2 · Z3 · Z4–5)
  v_w1 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_z1', 10), 0));
  v_w2 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_z2', 60), 0));
  v_w3 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_orta', 27), 0));
  v_w4 numeric := greatest(0, coalesce(public.ayar_sayi('soru_agirlik_zor', 3), 0));
  v_k uuid[]; v_o uuid[]; v_z uuid[]; v_y uuid[];
  v_ik int := 1; v_io int := 1; v_iz int := 1; v_iy int := 1;
  v_toplam int;
  v_r numeric;
  v_g int;
  v_sira int[];
  v_yuva int;
  -- 652: bir oyuncu Türkiye dışıysa (ülke ≠ TR ya da dil ≠ tr; bot sayılmaz) yalnız evrensel soru
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(coalesce(p_oyuncular, '{}'::uuid[]))
                        or coalesce(current_setting('app.soru_kapsam', true), '') = 'evrensel';
begin
  -- 652: evrensel filtresiyle kategori çok daralıyorsa kategori bu maçta yok sayılır (karışık havuz).
  if v_evrensel and v_kat is not null and not public.kategori_evrensel_yeterli(v_kat) then
    v_kat := null;
  end if;
  if v_w1 + v_w2 + v_w3 + v_w4 <= 0 then v_w1 := 1; v_w2 := 1; v_w3 := 1; v_w4 := 1; end if;

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
           coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 3), '{}'::uuid[]),
           coalesce(array_agg(s.id order by s.rn) filter (where s.grup = 4), '{}'::uuid[])
      into v_k, v_o, v_z, v_y
    from (
      select q.id,
             case when q.zorluk <= 1 then 1 when q.zorluk = 2 then 2 when q.zorluk = 3 then 3 else 4 end as grup,
             row_number() over (
               partition by case when q.zorluk <= 1 then 1 when q.zorluk = 2 then 2 when q.zorluk = 3 then 3 else 4 end
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
        and (not v_evrensel or q.kapsam = 'global')   -- 652: gevşetilmez
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
              + coalesce(array_length(v_z, 1), 0) + coalesce(array_length(v_y, 1), 0);

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
    v_r := random() * (v_w1 + v_w2 + v_w3 + v_w4);
    v_sira := case
      when v_r < v_w1 then array[1, 2, 3, 4]
      when v_r < v_w1 + v_w2 then array[2, 1, 3, 4]
      when v_r < v_w1 + v_w2 + v_w3 then array[3, 2, 1, 4]
      else array[4, 3, 2, 1]
    end;
    foreach v_g in array v_sira loop
      if v_g = 1 and v_ik <= coalesce(array_length(v_k, 1), 0) then
        v_ids := v_ids || v_k[v_ik]; v_ik := v_ik + 1; exit;
      elsif v_g = 2 and v_io <= coalesce(array_length(v_o, 1), 0) then
        v_ids := v_ids || v_o[v_io]; v_io := v_io + 1; exit;
      elsif v_g = 3 and v_iz <= coalesce(array_length(v_z, 1), 0) then
        v_ids := v_ids || v_z[v_iz]; v_iz := v_iz + 1; exit;
      elsif v_g = 4 and v_iy <= coalesce(array_length(v_y, 1), 0) then
        v_ids := v_ids || v_y[v_iy]; v_iy := v_iy + 1; exit;
      end if;
    end loop;
  end loop;

  return v_ids;
end;
$function$;
