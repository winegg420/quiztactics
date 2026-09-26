-- ============================================================
-- 653 · Küfür filtresi: TAMAMI BÜYÜK yazılan kelime + İngilizce "pic" (denetim tur 2, 26 Eyl 2026)
--
-- 1) "SIKTIR", "GERIZEKALI", "IBNE", "SIKEYIM" yakalanmıyordu: kufur_norm büyük I'yı ı sayar (sıkıldım masum kalsın
--    diye), oysa tamamı büyük yazılan kelimede I hem ı hem i olabilir. Artık tamamı BÜYÜK (küçük harf içermeyen)
--    bir kelimede I ayrıca i okunur ve o okuma da listeyle karşılaştırılır (yalnız EK eşleşme; eski okuma aynen durur).
--    Bu okumada, ı'lı okuması yaygın Türkçe kelime olan girişler ('sik' → SIK/SIKINTI/SIKILDIM, 'sikik' → SIKIK)
--    hariç tutulur: SIKILDIM, SIKINTI, SIKISTIM masum kalır. Küçük/karışık yazım (sıkıldım, Sıkıldım) değişmedi.
--    Takma ad denetimi (kufur_ad_uygun) da aynı okumayı kullanır.
-- 2) "pic" (İngilizce "picture"): listedeki "pic" girişi Türkçe "piç"in ASCII yazımıdır; İngilizce oyuncunun
--    "send me a pic" mesajı maskeleniyordu. Yeni kufur_maskele_dil(metin, dil): gönderenin dili 'en' ise ÇIPLAK
--    "pic" (noktalama hariç, büyük/küçük fark etmez) maskelenmez; "piç/PİÇ/PIÇ", "p1c", "p i c" hâlâ maskelenir.
--    Türkçe (ya da dili bilinmeyen) hesapta "pic" eskisi gibi maskelenir. Takma adda "pic" yine reddedilir.
-- Eski kufur_maskele(text) aynı imzayla kalır (dil = null). Yetki (GRANT/REVOKE) değişmedi: yeni fonksiyonlar da
-- yalnız sunucu içinden (security definer tetikleyici / RPC) çağrılır.
-- ============================================================

create or replace function public.kufur_norm_buyuk(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
           translate(
             lower(replace(coalesce(p, ''), 'İ', 'i')),
             'şçğöüâîû013457@$!€',
             'scgouaiuoieastasie'),
           '[^a-zı]', '', 'g');
$$;

create or replace function public.kufur_tamami_buyuk(p text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p, '') ~ '[A-ZÇĞİIÖŞÜ]' and coalesce(p, '') !~ '[a-zçğıöşü]';
$$;

-- Büyük harf (I → i) okuması için liste eşleşmesi; ı'lı okuması yaygın Türkçe kelime olan girişler dışında.
create or replace function public.kufur_kelime_mi_buyuk(p_norm text, p_ad boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(length(p_norm), 0) > 0 and exists (
    select 1 from public.yasakli_kelimeler y
     cross join lateral (select public.kufur_norm(y.kelime) as k) n
     where (y.kapsam = 'hepsi' or p_ad)
       and length(n.k) > 0
       and n.k not in ('sik', 'sikik')
       and (
         (y.eslesme = 'tam' and (p_norm = n.k or public.kufur_sikistir(p_norm) = n.k))
         or (y.eslesme = 'onek'
             and (p_norm like n.k || '%' or public.kufur_sikistir(p_norm) like n.k || '%')
             and not exists (select 1 from public.izinli_kelimeler i
                              where (i.eslesme = 'onek' and p_norm like public.kufur_norm(i.kelime) || '%')
                                 or (i.eslesme = 'tam' and p_norm = public.kufur_norm(i.kelime))))
       ));
$$;

create or replace function public.kufur_maskele_dil(p_metin text, p_dil text default null)
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
  v_kelime boolean;
begin
  if p_metin is null or btrim(p_metin) = '' then return p_metin; end if;
  v_sonuc := coalesce(substring(p_metin from '^\s*'), '');
  for r in select m[1] as tok, m[2] as ara from regexp_matches(p_metin, '(\S+)(\s*)', 'g') as m loop
    v_tok := v_tok || r.tok; v_ara := v_ara || r.ara;
    v_norm := v_norm || public.kufur_norm(r.tok);
    v_kelime := public.kufur_kelime_mi(public.kufur_norm(r.tok), false)
      or (public.kufur_tamami_buyuk(r.tok) and public.kufur_kelime_mi_buyuk(public.kufur_norm_buyuk(r.tok), false));
    -- İngilizce hesapta çıplak "pic" (picture) küfür sayılmaz; "piç", "p1c", "p i c" yine yakalanır
    if v_kelime and lower(coalesce(p_dil, '')) = 'en' and regexp_replace(lower(r.tok), '[^a-zçğıöşüâîû0-9]', '', 'g') = 'pic' then
      v_kelime := false;
    end if;
    v_maske := v_maske || v_kelime;
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

create or replace function public.kufur_maskele(p_metin text)
returns text
language sql
stable
security definer
set search_path = public
as $$ select public.kufur_maskele_dil(p_metin, null); $$;

create or replace function public.trg_dm_guvenlik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = new.gonderen_id;
  if found and not coalesce(p.is_bot, false) then
    if p.askida then raise exception 'Hesabın askıya alındı; mesaj gönderemezsin.'; end if;
    if p.mesaj_kapali then raise exception 'Mesajlaşman kapatıldı.'; end if;
    if p.kosullar_kabul_at is null then
      raise exception 'Mesaj göndermek için önce Kullanım Koşulları''nı kabul etmelisin.';
    end if;
  end if;
  if public.iletisim_engelli(new.gonderen_id, new.alici_id) then
    raise exception 'Bu oyuncuyla iletişim kuramazsın.';
  end if;
  new.metin := public.kufur_maskele_dil(new.metin, p.dil);   -- gönderen bulunamazsa p.dil null
  return new;
end;
$$;

-- Takma ad: tamamı BÜYÜK yazılmış ad/parça için büyük harf okuması da denenir
create or replace function public.kufur_ad_uygun(p_ad text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parca text;
  v_tum text := public.kufur_norm(p_ad);
  v_buyuk boolean := public.kufur_tamami_buyuk(p_ad);
  v_tum_b text := public.kufur_norm_buyuk(p_ad);
begin
  foreach v_parca in array regexp_split_to_array(coalesce(p_ad, ''), '_+') loop
    if public.kufur_kelime_mi(public.kufur_norm(v_parca), true) then return false; end if;
    if public.kufur_tamami_buyuk(v_parca) and public.kufur_kelime_mi_buyuk(public.kufur_norm_buyuk(v_parca), true) then return false; end if;
  end loop;
  if exists (
    select 1 from public.yasakli_kelimeler y
     cross join lateral (select public.kufur_norm(y.kelime) as k) n
     where y.eslesme = 'onek' and length(n.k) >= 4
       and (v_tum like '%' || n.k || '%' or public.kufur_sikistir(v_tum) like '%' || n.k || '%')
       and not exists (select 1 from public.izinli_kelimeler i where v_tum like '%' || public.kufur_norm(i.kelime) || '%')
  ) then return false; end if;
  if v_buyuk and exists (
    select 1 from public.yasakli_kelimeler y
     cross join lateral (select public.kufur_norm(y.kelime) as k) n
     where y.eslesme = 'onek' and length(n.k) >= 4 and n.k not in ('sik', 'sikik')
       and (v_tum_b like '%' || n.k || '%' or public.kufur_sikistir(v_tum_b) like '%' || n.k || '%')
       and not exists (select 1 from public.izinli_kelimeler i where v_tum_b like '%' || public.kufur_norm(i.kelime) || '%')
  ) then return false; end if;
  return true;
end;
$$;

revoke all on function public.kufur_norm_buyuk(text) from public, anon, authenticated;
revoke all on function public.kufur_tamami_buyuk(text) from public, anon, authenticated;
revoke all on function public.kufur_kelime_mi_buyuk(text, boolean) from public, anon, authenticated;
revoke all on function public.kufur_maskele_dil(text, text) from public, anon, authenticated;
