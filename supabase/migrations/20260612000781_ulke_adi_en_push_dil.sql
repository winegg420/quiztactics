-- ============================================================
-- 781 — Ülke adı İngilizce + push gövdesi kullanıcının dilinde
--
-- Önce: ulkeler.ad tek dil (Türkçe). "ulke_sampiyonu_oldun" push'u İngilizce şablonda bile Türkçe ülke adı
--   taşıyordu ("You are the Champion of Filipinler!").
-- Şimdi: ulkeler.ad_en (nullable; Türkçe ad değişmedi, mevcut veri korunur). push_metni, alıcının dili Türkçe değilse
--   ve anahtar ülke şampiyonu ise Türkçe ülke adını ad_en'e çevirir (ad_en boşsa Türkçe ad kalır).
-- Değişen tek davranış: push_metni içindeki bu ek dal; imza, yetki (grant/revoke) ve diğer anahtarlar aynı.
-- ============================================================

alter table public.ulkeler add column if not exists ad_en text;

update public.ulkeler u
   set ad_en = v.ad_en
  from (values
    ('AE', 'United Arab Emirates'),
    ('AL', 'Albania'),
    ('AM', 'Armenia'),
    ('AR', 'Argentina'),
    ('AT', 'Austria'),
    ('AU', 'Australia'),
    ('AZ', 'Azerbaijan'),
    ('BA', 'Bosnia & Herzegovina'),
    ('BD', 'Bangladesh'),
    ('BE', 'Belgium'),
    ('BG', 'Bulgaria'),
    ('BR', 'Brazil'),
    ('BY', 'Belarus'),
    ('CA', 'Canada'),
    ('CH', 'Switzerland'),
    ('CL', 'Chile'),
    ('CN', 'China'),
    ('CO', 'Colombia'),
    ('CY', 'Cyprus'),
    ('CZ', 'Czechia'),
    ('DE', 'Germany'),
    ('DK', 'Denmark'),
    ('DZ', 'Algeria'),
    ('EE', 'Estonia'),
    ('EG', 'Egypt'),
    ('ES', 'Spain'),
    ('FI', 'Finland'),
    ('FR', 'France'),
    ('GB', 'United Kingdom'),
    ('GE', 'Georgia'),
    ('GH', 'Ghana'),
    ('GR', 'Greece'),
    ('HR', 'Croatia'),
    ('HU', 'Hungary'),
    ('ID', 'Indonesia'),
    ('IE', 'Ireland'),
    ('IL', 'Israel'),
    ('IN', 'India'),
    ('IQ', 'Iraq'),
    ('IR', 'Iran'),
    ('IS', 'Iceland'),
    ('IT', 'Italy'),
    ('JO', 'Jordan'),
    ('JP', 'Japan'),
    ('KG', 'Kyrgyzstan'),
    ('KR', 'South Korea'),
    ('KW', 'Kuwait'),
    ('KZ', 'Kazakhstan'),
    ('LB', 'Lebanon'),
    ('LT', 'Lithuania'),
    ('LU', 'Luxembourg'),
    ('LV', 'Latvia'),
    ('LY', 'Libya'),
    ('MA', 'Morocco'),
    ('MD', 'Moldova'),
    ('MK', 'North Macedonia'),
    ('MX', 'Mexico'),
    ('MY', 'Malaysia'),
    ('NG', 'Nigeria'),
    ('NL', 'Netherlands'),
    ('NO', 'Norway'),
    ('NZ', 'New Zealand'),
    ('PH', 'Philippines'),
    ('PK', 'Pakistan'),
    ('PL', 'Poland'),
    ('PT', 'Portugal'),
    ('QA', 'Qatar'),
    ('RO', 'Romania'),
    ('RS', 'Serbia'),
    ('RU', 'Russia'),
    ('SA', 'Saudi Arabia'),
    ('SE', 'Sweden'),
    ('SG', 'Singapore'),
    ('SI', 'Slovenia'),
    ('SK', 'Slovakia'),
    ('SY', 'Syria'),
    ('TH', 'Thailand'),
    ('TM', 'Turkmenistan'),
    ('TN', 'Tunisia'),
    ('TR', 'Türkiye'),
    ('UA', 'Ukraine'),
    ('US', 'United States'),
    ('UZ', 'Uzbekistan'),
    ('VN', 'Vietnam'),
    ('XK', 'Kosovo'),
    ('ZA', 'South Africa')
  ) as v(kod, ad_en)
 where u.kod = v.kod and u.ad_en is null;

create or replace function public.push_metni(p_anahtar text, p_dil text, p_parametre jsonb default '{}'::jsonb)
returns table (baslik text, govde text)
language plpgsql stable security definer
set search_path = public
as $fn$
declare
  v_dil   text := lower(coalesce(nullif(trim(p_dil), ''), 'tr'));
  v_b     text;
  v_g     text;
  v_sonuc text := '';
  v_i     int := 1;
  v_sira  int := 0;
  v_no    int;
  v_ham   text;
  v_ceviri text;
  v_c     text;
begin
  select m.baslik, m.govde into v_b, v_g from public.push_metinleri m where m.anahtar = p_anahtar and m.dil = v_dil;
  if v_g is null then
    v_dil := 'tr';
    select m.baslik, m.govde into v_b, v_g from public.push_metinleri m where m.anahtar = p_anahtar and m.dil = 'tr';
  end if;
  if v_g is null then
    return query select 'Quiz Tactics'::text, p_anahtar;
    return;
  end if;

  while v_i <= length(v_g) loop
    v_c := substr(v_g, v_i, 1);
    if v_c = '%' then
      if substr(v_g, v_i + 1, 1) ~ '^[0-9]$' then
        v_no := substr(v_g, v_i + 1, 1)::int; v_i := v_i + 2;
      else
        v_sira := v_sira + 1; v_no := v_sira; v_i := v_i + 1;
      end if;
      v_ham := case when jsonb_typeof(p_parametre) = 'array' then p_parametre ->> (v_no - 1) else p_parametre ->> v_no::text end;
      v_ceviri := null;
      if v_ham is not null and v_dil <> 'tr' then
        select m.govde into v_ceviri from public.push_metinleri m where m.anahtar = 'terim:' || v_ham and m.dil = v_dil;
        -- 781: ülke şampiyonu push'unda parametre Türkçe ülke adıdır → ulkeler.ad_en (yalnız bu anahtar; başka parametre ülke adıyla karışmasın)
        if v_ceviri is null and p_anahtar = 'ulke_sampiyonu_oldun' then
          select u.ad_en into v_ceviri from public.ulkeler u where u.ad = v_ham;
        end if;
      end if;
      v_sonuc := v_sonuc || coalesce(v_ceviri, v_ham, '');
    else
      v_sonuc := v_sonuc || v_c; v_i := v_i + 1;
    end if;
  end loop;

  return query select coalesce(v_b, 'Quiz Tactics'), v_sonuc;
end;
$fn$;
revoke all on function public.push_metni(text, text, jsonb) from public, anon;
grant execute on function public.push_metni(text, text, jsonb) to authenticated;
