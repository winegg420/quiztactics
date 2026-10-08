-- 1010 GERİ ALMA — ÇALIŞTIRILMADI. soru_sec 652 tanımına (3 grup, kolay=Z1+Z2) döner; ayarlar 832 değerlerine.
begin;
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
  -- 652: bir oyuncu Türkiye dışıysa (ülke ≠ TR ya da dil ≠ tr; bot sayılmaz) yalnız evrensel soru
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(coalesce(p_oyuncular, '{}'::uuid[]))
                        or coalesce(current_setting('app.soru_kapsam', true), '') = 'evrensel';
begin
  -- 652: evrensel filtresiyle kategori çok daralıyorsa kategori bu maçta yok sayılır (karışık havuz).
  if v_evrensel and v_kat is not null and not public.kategori_evrensel_yeterli(v_kat) then
    v_kat := null;
  end if;
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
update public.oyun_ayarlari set deger = '17'::jsonb,
  aciklama = 'Normal maç soru seçimi: orta (zorluk 3) grubunun ağırlığı (832: 25 → 17)' where anahtar = 'soru_agirlik_orta';
update public.oyun_ayarlari set
  aciklama = 'Normal maç soru seçimi: kolay (zorluk 1–2) grubunun ağırlığı (832: 70 → 80)' where anahtar = 'soru_agirlik_kolay';
delete from public.oyun_ayarlari where anahtar in ('soru_agirlik_z1', 'soru_agirlik_z2');
delete from supabase_migrations.schema_migrations where version = '20260612001010';
commit;
