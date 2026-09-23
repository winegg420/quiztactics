-- ============================================================
-- 300 — Turnuvada artan zorluk (Şerit S2, 23 Eyl 2026)
--
-- Karar (Ida, 11 Eyl): insanlar ilk sorudan elenmesin. questions.zorluk
-- (1–5, migration 290'da sıralamaya göre) ile:
--   1–5. soru → zorluk 1–2 · 6–10. soru → zorluk 3 · 11+ → zorluk 4–5
--   Altın soru (eşitlik bozma): maçta kullanılmamış, zorluk 4–5.
--
-- Önceki hâl (147/222): bant sınırları kodda sabitti; bant boşalınca aralık
-- İKİ YÖNE genişliyordu (ilk 5'e zorluk 3–4 sızabiliyordu). Altın soru
-- zorluğa, rekabetçi havuz filtresine ve EN çeviri şartına bakmıyordu.
--
-- Yeni:
--  * Dilim sınırları + zorluk aralıkları oyun_ayarlari'nda (aşağıda).
--  * Dilim boşalırsa ALT dilime düşülür (11+ → 3 → 1–2); o da yetmezse
--    herhangi uygun TR soru (dilime en yakın zorluk önce); o da yetmezse
--    eski serbest doldurma. Turnuva asla sorusuz kalmaz.
--  * Rekabetçi havuz filtresi (soru_supheli_haric_mi + eşik
--    soru_rekabetci_haric_agirlik) aynen geçerli. Ağırlık hem saklı
--    supheli_agirlik'tan hem supheli_isaretler'den (soru_isaret_agirligi)
--    okunur; yeni bir işaret türü (ör. sik_ipucu_jev) eklendiğinde saklı
--    ağırlık yeniden hesaplanmamış olsa da filtre onu kapsar.
--  * soru_ids turnuvanın BAŞINDA seçilir (start_tournament /
--    turnuva_zamanlayici_tik → turnuva_soru_sec(30,'tr')); onlara dokunulmaz.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('turnuva_zorluk_dilim1_son', '5'::jsonb,  'Turnuva: 1. dilimin son soru sırası (1..N)'),
  ('turnuva_zorluk_dilim2_son', '10'::jsonb, 'Turnuva: 2. dilimin son soru sırası; sonrası 3. dilim'),
  ('turnuva_zorluk_dilim1_min', '1'::jsonb,  'Turnuva 1. dilim en düşük zorluk'),
  ('turnuva_zorluk_dilim1_max', '2'::jsonb,  'Turnuva 1. dilim en yüksek zorluk'),
  ('turnuva_zorluk_dilim2_min', '3'::jsonb,  'Turnuva 2. dilim en düşük zorluk'),
  ('turnuva_zorluk_dilim2_max', '3'::jsonb,  'Turnuva 2. dilim en yüksek zorluk'),
  ('turnuva_zorluk_dilim3_min', '4'::jsonb,  'Turnuva 3. dilim en düşük zorluk'),
  ('turnuva_zorluk_dilim3_max', '5'::jsonb,  'Turnuva 3. dilim en yüksek zorluk'),
  ('turnuva_altin_zorluk_min',  '4'::jsonb,  'Turnuva altın soru en düşük zorluk'),
  ('turnuva_altin_zorluk_max',  '5'::jsonb,  'Turnuva altın soru en yüksek zorluk')
on conflict (anahtar) do nothing;

-- ------------------------------------------------------------
-- Dahili yardımcı: uygun TR sorulardan zorluk aralığında rastgele aday.
-- p_alt/p_ust null → zorluk serbest (yakınlık sırası p_yakin'a göre).
-- ------------------------------------------------------------
create or replace function public.turnuva_soru_aday(
  p_adet int, p_haric uuid[], p_alt int, p_ust int,
  p_dil text default 'tr', p_yakin int default null)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_supheli_haric boolean := public.soru_supheli_haric_mi();
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  v_ids uuid[];
begin
  if coalesce(p_adet, 0) <= 0 then return '{}'::uuid[]; end if;

  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_ids
  from (
    select q.id from public.questions q
    where q.aktif and q.dil = coalesce(p_dil, 'tr')
      and not (v_supheli_haric and q.denetim_durumu = 'bekliyor'
               and greatest(q.supheli_agirlik,
                            coalesce((select max(public.soru_isaret_agirligi(i))
                                        from unnest(q.supheli_isaretler) i), 0)) >= v_haric_agirlik)
      and exists (select 1 from public.question_translations t
                   where t.question_id = q.id and t.dil = 'en' and not t.eskidi)
      and (p_alt is null or q.zorluk >= p_alt)
      and (p_ust is null or q.zorluk <= p_ust)
      and q.id <> all(coalesce(p_haric, '{}'::uuid[]))
    order by case when p_yakin is null then 0 else abs(q.zorluk - p_yakin) end, random()
    limit p_adet
  ) s;
  return v_ids;
end;
$$;

revoke all on function public.turnuva_soru_aday(int, uuid[], int, int, text, int) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Turnuva soru sırası (başta, tek sefer). İmza ve yetki aynı.
-- ------------------------------------------------------------
create or replace function public.turnuva_soru_sec(p_adet integer, p_dil text default 'tr')
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[] := '{}'::uuid[];
  v_parca uuid[];
  v_d1 int := greatest(0, public.ayar_sayi('turnuva_zorluk_dilim1_son', 5)::int);
  v_d2 int;
  v_min int[];
  v_max int[];
  v_i int; v_j int;
  v_istenen int; v_eksik int; v_kalan int;
  v_supheli_haric boolean := public.soru_supheli_haric_mi();
  v_haric_agirlik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
begin
  v_d2 := greatest(v_d1, public.ayar_sayi('turnuva_zorluk_dilim2_son', 10)::int);
  v_min := array[public.ayar_sayi('turnuva_zorluk_dilim1_min', 1)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim2_min', 3)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim3_min', 4)::int];
  v_max := array[public.ayar_sayi('turnuva_zorluk_dilim1_max', 2)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim2_max', 3)::int,
                 public.ayar_sayi('turnuva_zorluk_dilim3_max', 5)::int];

  for v_i in 1..3 loop
    v_istenen := case v_i
      when 1 then least(v_d1, p_adet)
      when 2 then greatest(0, least(v_d2, p_adet) - v_d1)
      else greatest(0, p_adet - v_d2)
    end;
    if v_istenen <= 0 then continue; end if;

    -- Kendi dilimi, yetmezse sırayla ALT dilimler.
    v_parca := '{}'::uuid[];
    for v_j in reverse v_i..1 loop
      v_eksik := v_istenen - coalesce(array_length(v_parca, 1), 0);
      exit when v_eksik <= 0;
      v_parca := v_parca || public.turnuva_soru_aday(v_eksik, v_ids || v_parca,
                                                      v_min[v_j], v_max[v_j], p_dil);
    end loop;

    -- Hâlâ eksikse: herhangi uygun soru, dilime en yakın zorluk önce.
    v_eksik := v_istenen - coalesce(array_length(v_parca, 1), 0);
    if v_eksik > 0 then
      v_parca := v_parca || public.turnuva_soru_aday(v_eksik, v_ids || v_parca, null, null,
                                                      p_dil, v_min[v_i]);
    end if;

    v_ids := v_ids || v_parca;
  end loop;

  -- Havuz yine de yetmediyse kalanı serbest doldur (turnuva bozulmasın).
  v_kalan := p_adet - coalesce(array_length(v_ids, 1), 0);
  if v_kalan > 0 then
    select coalesce(array_agg(s.id), '{}'::uuid[]) into v_parca
    from (
      select q.id from public.questions q
      where q.aktif
        and not (v_supheli_haric and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_haric_agirlik)
        and exists (select 1 from public.question_translations t
                     where t.question_id = q.id and t.dil = 'en' and not t.eskidi)
        and q.id <> all(v_ids)
      order by random() limit v_kalan
    ) s;
    v_ids := v_ids || coalesce(v_parca, '{}'::uuid[]);
  end if;

  return v_ids;
end;
$$;

revoke all on function public.turnuva_soru_sec(integer, text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Altın soru: maçta kullanılmamış, zorluk 4–5; yetmezse alt dilimler,
-- sonra herhangi uygun TR soru, en son herhangi aktif soru. İmza/yetki aynı.
-- ------------------------------------------------------------
create or replace function public.turnuva_altin_soru_ekle(p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_haric uuid[];
  v_yeni uuid;
  v_aralik int[] := array[
    public.ayar_sayi('turnuva_altin_zorluk_min', 4)::int,  public.ayar_sayi('turnuva_altin_zorluk_max', 5)::int,
    public.ayar_sayi('turnuva_zorluk_dilim2_min', 3)::int, public.ayar_sayi('turnuva_zorluk_dilim2_max', 3)::int,
    public.ayar_sayi('turnuva_zorluk_dilim1_min', 1)::int, public.ayar_sayi('turnuva_zorluk_dilim1_max', 2)::int];
  v_k int;
begin
  select coalesce(t.soru_ids, '{}'::uuid[]) into v_haric
    from public.tournaments t where t.id = p_tournament_id;

  for v_k in 0..2 loop
    v_yeni := (public.turnuva_soru_aday(1, v_haric, v_aralik[v_k*2+1], v_aralik[v_k*2+2], 'tr'))[1];
    exit when v_yeni is not null;
  end loop;

  if v_yeni is null then
    v_yeni := (public.turnuva_soru_aday(1, v_haric, null, null, 'tr', v_aralik[1]))[1];
  end if;

  -- Havuz tükenirse kısıt gevşetilir; maç asla askıda kalmaz.
  if v_yeni is null then
    select q.id into v_yeni
      from public.questions q
     where q.aktif and q.id <> all(v_haric)
     order by random() limit 1;
  end if;

  if v_yeni is null then return null; end if;

  update public.tournaments
     set soru_ids = coalesce(soru_ids, '{}'::uuid[]) || v_yeni,
         altin_soru = true
   where id = p_tournament_id;

  return v_yeni;
end;
$$;

revoke all on function public.turnuva_altin_soru_ekle(uuid) from public, anon, authenticated;
