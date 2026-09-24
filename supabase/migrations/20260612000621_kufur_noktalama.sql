-- ============================================================
-- 621 · Küfür maskesinde noktalama korunur (620 düzeltmesi, 25 Eyl 2026)
-- "salak," → "***," ("*** git ***, sıkıldım"): kelimeye yapışık baştaki ( " ' « ve sondaki , . ; : ? ) " ' » …
-- işaretleri maskelenmez. Eşleşme kuralı aynı (işaretler zaten normalleştirmede atılıyor). Yalnız kufur_maskele.
-- ============================================================
create or replace function public.kufur_maskele(p_metin text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tok text[] := array[]::text[];
  v_ara text[] := array[]::text[];
  v_norm text[] := array[]::text[];
  v_maske boolean[] := array[]::boolean[];
  r record;
  i int; j int; n int;
  v_bir text;
  v_sonuc text := '';
begin
  if p_metin is null or btrim(p_metin) = '' then return p_metin; end if;
  v_sonuc := coalesce(substring(p_metin from '^\s*'), '');
  for r in select m[1] as tok, m[2] as ara from regexp_matches(p_metin, '(\S+)(\s*)', 'g') as m loop
    v_tok := v_tok || r.tok; v_ara := v_ara || r.ara;
    v_norm := v_norm || public.kufur_norm(r.tok);
    v_maske := v_maske || public.kufur_kelime_mi(public.kufur_norm(r.tok), false);
  end loop;
  n := coalesce(array_length(v_tok, 1), 0);
  i := 1;
  while i <= n loop
    if length(v_norm[i]) = 1 then
      j := i; v_bir := '';
      while j <= n and length(v_norm[j]) = 1 loop v_bir := v_bir || v_norm[j]; j := j + 1; end loop;
      if j - i >= 2 and public.kufur_kelime_mi(v_bir, false) then
        for k in i .. j - 1 loop v_maske[k] := true; end loop;
      end if;
      i := j;
    else
      i := i + 1;
    end if;
  end loop;
  for k in 1 .. n loop
    v_sonuc := v_sonuc
      || case when v_maske[k]
              then coalesce(substring(v_tok[k] from '^[("''«“]+'), '') || '***'
                   || coalesce(substring(v_tok[k] from '[,.;:?)"''»”…]+$'), '')
              else v_tok[k] end
      || v_ara[k];
  end loop;
  return v_sonuc;
end;
$$;
revoke all on function public.kufur_maskele(text) from public, anon, authenticated;
