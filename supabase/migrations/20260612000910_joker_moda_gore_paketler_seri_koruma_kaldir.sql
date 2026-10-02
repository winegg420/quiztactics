-- 910 — Joker paketleri moda göre + Seri Koruma kaldırıldı (Ida onayı, 2 Eki 2026).
--
-- 1) PAKETLER MODA GÖRE. Eski karışık paketler (joker_10, joker_30, joker_100) ve seri_koruma_3
--    PASİF olur (satır SİLİNMEZ; RLS "aktif" satırı gösterdiği için dükkânda görünmez, satın alma
--    'Paket bulunamadı' der). Yerine dört paket: Klasik/Düello × Oyuncu (30) / Usta (100).
--    Paketin modu ayrı sütunda TUTULMAZ: istemci, içerikteki her jokerin jokerler.js ›
--    SKILL_TANIMLARI.allowedModes'una bakar (tek kaynak) — Sigorta/2X içeren paket yalnız Klasik,
--    Baskın/Kalkan içeren paket yalnız Düello sekmesinde görünür.
--    FİYAT = Σ(adet × coin_joker_<tür>) × 10'lu paket oranı, 5'e aşağı yuvarlanır. Oran koda gömülü
--    değildir: bugünkü 10'lu paketten okunur (coin_joker_elli_10 / (10 × coin_joker_elli) = 0,85).
--    Tek fiyatlar değişirse paket fiyatı yeniden hesaplanmalıdır (bu dosyanın 1. bloğu yeni
--    numaralı bir migration'da tekrar çalıştırılır). Para birimi yolu aynı: joker_coin_ile_al (coin).
-- 2) SERİ KORUMA KALKTI. Seri, kaçırılan günde koşulsuz sıfırlanır; koruma harcanmaz, okunmaz,
--    verilmez. joker_envanter'deki 'seri_koruma' satırları ve tur kısıtı DURUR (veri silinmez),
--    yalnız kullanılmaz. Yetki/RLS değişikliği YOK: işlevler aynı imzayla yeniden tanımlanır.

-- ---------------------------------------------------------------- 1. paketler
update public.joker_paketleri
   set aktif = false
 where urun_id in ('joker_10', 'joker_30', 'joker_100', 'seri_koruma_3');

do $$
declare
  v_oran numeric;
  r record;
begin
  v_oran := public.ayar_sayi('coin_joker_elli_10', null)::numeric
            / nullif(10 * public.ayar_sayi('coin_joker_elli', null)::numeric, 0);
  if v_oran is null or v_oran <= 0 or v_oran >= 1 then v_oran := 0.85; end if;

  insert into public.joker_paketleri (urun_id, ad, aciklama, icerik, sira, aktif, coin_fiyat, fiyat_anahtari)
  select v.urun_id, v.ad, v.aciklama, v.icerik, v.sira, true,
         (floor((select sum(public.ayar_sayi('coin_joker_' || e.key, null)::numeric * e.value::int)
                   from jsonb_each_text(v.icerik) e) * v_oran / 5) * 5)::bigint,
         null
    from (values
      ('klasik_30',  'Klasik Oyuncu Paketi', '30 joker',  21,
       '{"elli":6,"sure":8,"soru_degistir":5,"zaman_baskisi":4,"sigorta":3,"ikinci_sans":2,"cifte_puan":2}'::jsonb),
      ('klasik_100', 'Klasik Usta Paketi',   '100 joker', 22,
       '{"elli":20,"sure":26,"soru_degistir":17,"zaman_baskisi":13,"sigorta":10,"ikinci_sans":7,"cifte_puan":7}'::jsonb),
      ('duello_30',  'Düello Oyuncu Paketi', '30 joker',  23,
       '{"elli":6,"sure":8,"soru_degistir":5,"zaman_baskisi":5,"ikinci_sans":2,"baskin":2,"kalkan":2}'::jsonb),
      ('duello_100', 'Düello Usta Paketi',   '100 joker', 24,
       '{"elli":20,"sure":26,"soru_degistir":17,"zaman_baskisi":16,"ikinci_sans":7,"baskin":7,"kalkan":7}'::jsonb)
    ) as v(urun_id, ad, aciklama, sira, icerik)
  on conflict (urun_id) do update
    set ad = excluded.ad, aciklama = excluded.aciklama, icerik = excluded.icerik, sira = excluded.sira,
        aktif = true, coin_fiyat = excluded.coin_fiyat, fiyat_anahtari = null;

  -- Kendi kendini denetler: toplam adet 30 / 100, her tür fiyatlı ve aktif, paket tek tek alımdan ucuz.
  for r in
    select p.urun_id, p.coin_fiyat,
           (select sum(e.value::int) from jsonb_each_text(p.icerik) e) as adet,
           (select sum(public.joker_fiyati(e.key) * e.value::int) from jsonb_each_text(p.icerik) e) as tek_tek,
           (select count(*) from jsonb_each_text(p.icerik) e where public.joker_fiyati(e.key) is null) as fiyatsiz
      from public.joker_paketleri p
     where p.urun_id in ('klasik_30', 'klasik_100', 'duello_30', 'duello_100')
  loop
    if r.fiyatsiz > 0 then raise exception '910: % içinde fiyatı olmayan joker var', r.urun_id; end if;
    if r.adet <> (case when r.urun_id like '%\_100' then 100 else 30 end) then
      raise exception '910: % toplam adedi yanlış (%)', r.urun_id, r.adet;
    end if;
    if r.coin_fiyat is null or r.coin_fiyat <= 0 or r.coin_fiyat >= r.tek_tek then
      raise exception '910: % fiyatı (%) tek tek alımdan (%) ucuz değil', r.urun_id, r.coin_fiyat, r.tek_tek;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- 2. seri koruma

-- Günlük seri denetimi (cron bildim-seri-kontrol): dün oynamayanın serisi sıfırlanır. Koruma dalı yok.
create or replace function public.seri_kontrol()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  r record;
begin
  for r in
    select p.id, p.seri_gun
    from public.profiles p
    where coalesce(p.is_bot, false) = false
      and coalesce(p.seri_gun, 0) > 0
      and p.seri_son_gun is not null
      and p.seri_son_gun < v_bugun - 1        -- dün oynamamış
  loop
    update public.profiles
       set seri_gun = 0, seri = 0
     where id = r.id;
    perform public.bildirim_anahtarla(
      r.id, 'seri', 'seri_kirildi',
      jsonb_build_array(r.seri_gun),
      '/bildim'
    );
  end loop;
end;
$function$;

-- İmza aynı kalır (eski istemci önbelleği kırılmasın); koruma her zaman 0 döner.
create or replace function public.seri_durumum()
returns table(seri_gun integer, seri_en_uzun integer, bugun_oynadi boolean, koruma integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    coalesce(p.seri_gun, 0),
    coalesce(p.seri_en_uzun, 0),
    p.seri_son_gun = (now() at time zone 'Europe/Istanbul')::date,
    0
  from public.profiles p
  where p.id = auth.uid();
$function$;

-- Envanter yalnız aktif maç jokerlerini döndürür.
create or replace function public.envanterim()
returns table(tur text, adet integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  select k.tur, coalesce(e.adet, 0)
  from public.skill_katalogu k
  left join public.joker_envanter e on e.tur = k.tur and e.user_id = auth.uid()
  where k.aktif
  order by k.sira;
$function$;

-- Yeni hesaba başlangıç stoğu: seri koruma verilmez (diğer türler aynı).
create or replace function public.baslangic_jokerleri_ver(p_user uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_adet int := public.ayar_sayi('baslangic_joker_adet', 2)::int;
  v_tur text;
  v_verilen int := 0;
begin
  if p_user is null or v_adet <= 0 then return 0; end if;
  -- Botlara verilmez: botun envanteri yok, jokerini sunucu simüle eder.
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then
    return 0;
  end if;
  -- Bir kez verilir: hesapta zaten joker varsa tekrar eklenmez (idempotent).
  if exists (select 1 from public.joker_envanter where user_id = p_user) then
    return 0;
  end if;

  foreach v_tur in array array['elli', 'sure', 'soru_degistir',
                               'zaman_baskisi', 'saldiri_degistir', 'savunma_kilidi',
                               'sis'] loop   -- Paket 32: Sis · 910: seri koruması listeden çıktı
    perform public.joker_hareket(p_user, v_tur, v_adet, 'baslangic', null);
    v_verilen := v_verilen + v_adet;
  end loop;
  return v_verilen;
end;
$function$;

create or replace function public.baslangic_jokerleri_toplu_ver()
returns table(oyuncu integer, joker integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_adet int := public.ayar_sayi('baslangic_joker_adet', 2)::int;
  v_user uuid;
  v_tur text;
begin
  oyuncu := 0;
  joker := 0;
  if v_adet <= 0 then return next; return; end if;

  for v_user in
    select p.id
      from public.profiles p
     where not coalesce(p.is_bot, false)
       and not exists (select 1 from public.joker_islemleri i
                        where i.user_id = p.id and i.kaynak = 'baslangic')
     order by p.created_at
       for update of p                      -- aynı anda iki çalıştırma çift vermesin
  loop
    foreach v_tur in array array['elli', 'sure', 'soru_degistir',
                                 'zaman_baskisi', 'saldiri_degistir', 'savunma_kilidi'] loop
      perform public.joker_hareket(v_user, v_tur, v_adet, 'baslangic', 'paket29_geriye_donuk');
      joker := joker + v_adet;
    end loop;
    oyuncu := oyuncu + 1;
  end loop;

  return next;
end;
$function$;
