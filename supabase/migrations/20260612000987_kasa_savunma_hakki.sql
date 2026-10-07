-- 987: ORTAK HAZİNE (kod adı kasa) — DEVAM ödülü = SAVUNMA HAKKI (Ida, 7 Eki 2026).
-- 954'ün "DEVAM → her soruda ücretsiz 50:50" ödülünün YERİNE geçer (yeni maçlarda devam_elli = false).
--
-- KURAL
--  · Bilerek DEVAM (bot dahil; süre dolumu değil) → Savunma Hakkı otomatik. Oyuncu başı en fazla 1, süresiz.
--  · Tetik: hak sahibi normal soruyu YANLIŞ + rakip TEK BAŞINA doğru → rakip AÇ/DEVAM'a geçmez,
--    sonuç bandından sonra SAVUNMA SORUSU açılır (tur sayısını yemez). Normal soru kasaya +2'sini ekler.
--  · Savunma Sorusu: yalnız hak sahibi cevaplar (rakip izler), normal soru süresi (kasa_soru_sn),
--    rastgele, tetikleyen sorudan FARKLI kategori, orta zorluk (zorluk 3; yoksa herhangi), kasaya bir şey eklemez.
--    Normal jokerler (985 envanter + sınırlar) kullanılabilir, Zaman Baskısı hariç; soru başı sınırı ayrı soru
--    olarak sayılır (joker_kullanimlari.soru_index = -tur).
--  · Doğru → rakibin AÇ/DEVAM hakkı iptal, hazine sahipsiz kalır. Yanlış / süre dolumu / bağlantı kopması →
--    rakip sahip olur ve kararını verir.
--  · Hak tek kullanımlık (Savunma Sorusu açılınca tüketilir). Hazine açılınca bütün haklar silinir.
--  · Açılmaz: son tur (k.tur >= max_tur → oyun biter), kasa hedefe/tavana doldu, Altın Soru. O durumda hak kalır.
--  · Bot hak sahibiyse kendi doğruluk oranıyla (bot_soru_isabet) cevaplar. Hazine botları normal joker
--    kullanmaz (951'den beri yalnız 954 ücretsiz 50:50'yi kullanıyordu) → Savunma Sorusunda da jokersiz.
--  · Kural maç satırına sabit (kasa_maclari.savunma_acik, ayar kasa_savunma_acik). Süren 954 maçları eski kuralla biter.
--
-- ŞEMA: kasa_maclari.savunma_acik / savunma_hak uuid[] / savunma jsonb
--       ({sahip, rakip, tur, kategori, durum: bekliyor|soru|basarili|basarisiz, neden, soru_id, dogru_cevap}),
--       kasa_hamleler.savunma jsonb (geçmiş). Yeni iç fonksiyonlar authenticated'a AÇILMAZ (kasa_soru_ac gibi).
-- Değişen fonksiyonlar canlı tanımdan (pg_get_functiondef, 7 Eki 2026 — 954/985 sonrası) hedefli değişiklikle
-- türetildi; imzalar aynı → mevcut GRANT'lar değişmez. Klasik / Düello fonksiyonlarına dokunulmadı.
-- GERİ ALMA: docs/kasa-geri-alma-987.sql

alter table public.kasa_maclari
  add column if not exists savunma_acik boolean not null default false,
  add column if not exists savunma_hak uuid[] not null default '{}'::uuid[],
  add column if not exists savunma jsonb;
alter table public.kasa_hamleler add column if not exists savunma jsonb;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_savunma_acik', '1'::jsonb, 'ORTAK HAZİNE (987): DEVAM ödülü Savunma Hakkı (1 açık; 954 ücretsiz 50:50 yerine). Maça sabitlenir.')
on conflict (anahtar) do nothing;

-- Savunma Sorusu: farklı kategori, orta zorluk, iki oyuncunun dilinde okunur, maçta kullanılmamış.
create or replace function public.kasa_savunma_soru_bul(p_id uuid, p_haric_kat text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  k public.kasa_maclari%rowtype;
  v_s uuid;
  v_diller text[];
  v_evrensel boolean;
  v_supheli boolean := public.soru_supheli_haric_mi();
  v_esik int := public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int;
  v_adim int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if not found then return null; end if;
  v_evrensel := public.soru_kapsam_evrensel_mi(array[k.oyuncu1, k.oyuncu2]);
  select coalesce(array_agg(distinct coalesce(nullif(btrim(pr.dil), ''), 'tr')), array['tr'])
    into v_diller from public.profiles pr where pr.id in (k.oyuncu1, k.oyuncu2);
  -- 1: orta + farklı kategori · 2: farklı kategori (her zorluk) · 3: herhangi
  for v_adim in 1..3 loop
    select q.id into v_s
      from public.questions q
     where q.aktif
       and not (q.id = any(k.kullanilan_sorular))
       and (v_adim = 3 or q.kategori is distinct from p_haric_kat)
       and (v_adim > 1 or q.zorluk = 3)
       and (not v_evrensel or q.kapsam = 'global')
       and not (v_supheli and q.denetim_durumu = 'bekliyor' and q.supheli_agirlik >= v_esik)
       and not exists (
         select 1 from unnest(v_diller) d
          where d <> q.dil
            and not exists (select 1 from public.question_translations t
                             where t.question_id = q.id and t.dil = d and not t.eskidi))
     order by random()
     limit 1;
    exit when v_s is not null;
  end loop;
  return v_s;
end $function$;

-- Savunma Sorusunu açar (kasa_sonraki, tetikli sonuç bandı bitince). Hak burada tüketilir.
create or replace function public.kasa_savunma_ac(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  k public.kasa_maclari%rowtype;
  v_h uuid;
  v_soru uuid;
  v_kat text;
  v_dogru smallint;
  v_bot_cevap smallint;
  v_gecikme numeric;
  v_min numeric := public.ayar_ondalik('kasa_bot_cevap_min_sn', 2);
  v_max numeric := public.ayar_ondalik('kasa_bot_cevap_max_sn', 6);
begin
  select * into k from public.kasa_maclari where id = p_id;
  if not found or k.durum <> 'aktif' or k.savunma is null or k.savunma ->> 'durum' <> 'bekliyor' then return; end if;
  v_h := (k.savunma ->> 'sahip')::uuid;
  v_soru := public.kasa_savunma_soru_bul(p_id, k.savunma ->> 'kategori');
  if v_soru is null then
    -- Havuz boş (pratikte olmaz): savunma yapılamadı → başarısız sayılır, rakip kararını verir
    update public.kasa_maclari
       set sahip = (k.savunma ->> 'rakip')::uuid, savunma = null,
           savunma_hak = array_remove(savunma_hak, v_h), son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set sahip_sonra = (k.savunma ->> 'rakip')::uuid,
           savunma = k.savunma || jsonb_build_object('durum', 'basarisiz', 'neden', 'soru_yok')
     where kasa_id = p_id and tur = k.tur;
    perform public.kasa_tur_baslat(p_id);
    return;
  end if;
  select q.kategori, q.dogru_cevap into v_kat, v_dogru from public.questions q where q.id = v_soru;

  if k.bot is not null and k.bot = v_h then
    if random() < public.bot_soru_isabet(k.bot, v_kat, v_soru) then
      v_bot_cevap := v_dogru;
    else
      select x into v_bot_cevap from generate_series(0, 3) x where x <> v_dogru order by random() limit 1;
    end if;
    v_gecikme := least(v_min + (greatest(v_max, v_min) - v_min) * random()::numeric, k.soru_sn - 1);
  end if;

  update public.kasa_maclari
     set soru_id = v_soru,
         kullanilan_sorular = array_append(kullanilan_sorular, v_soru),
         faz = 'cevap',
         soru_baslangic = now(),
         faz_bitis = now() + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         joker = coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(joker) e
                            where e.key in ('_devam', '_hak')), '{}'::jsonb),
         -- Bot yalnız savunan ise cevaplar (rakip bot izler)
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when v_bot_cevap is not null
                             then now() + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         savunma = k.savunma || jsonb_build_object('durum', 'soru', 'soru_id', v_soru, 'soru_kategori', v_kat),
         savunma_hak = array_remove(savunma_hak, v_h),
         son_hareket = now()
   where id = p_id;
end $function$;

-- Savunma Sorusunu çözümler (kasa_ilerlet: savunan cevapladı / süresi doldu / bağlantısı koptu).
create or replace function public.kasa_savunma_cozumle(p_id uuid, p_neden text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  k public.kasa_maclari%rowtype;
  v_h uuid; v_r uuid;
  v_dogru smallint;
  v_kat text;
  v_c smallint;
  v_d boolean;
  v_at timestamptz;
  v_neden text;
  v_sahip uuid;
  v_sav jsonb;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if not found or k.durum <> 'aktif' or k.faz <> 'cevap' or k.savunma is null or k.savunma ->> 'durum' <> 'soru' then
    return;
  end if;
  v_h := (k.savunma ->> 'sahip')::uuid;
  v_r := (k.savunma ->> 'rakip')::uuid;
  select q.dogru_cevap, q.kategori into v_dogru, v_kat from public.questions q where q.id = k.soru_id;
  v_c := (k.cevaplar -> v_h::text ->> 'cevap')::smallint;
  v_at := (k.cevaplar -> v_h::text ->> 'at')::timestamptz;
  v_d := coalesce(v_c = v_dogru, false);
  v_neden := case when v_d then 'dogru' when v_c is null then coalesce(p_neden, 'sure') else 'yanlis' end;
  v_sahip := case when v_d then null else v_r end;

  -- İstatistik (normal soru gibi; kasa_cevaplari tur anahtarlı olduğu için oraya yazılmaz)
  if v_c is not null then
    perform public.kategori_istatistik_yaz(v_h, v_kat, v_d);
    perform public.soru_sayac(k.soru_id, v_d);
    if v_d then perform public.kategori_dogru_arttir(v_h, v_kat); end if;
  end if;

  v_sav := k.savunma || jsonb_build_object('durum', case when v_d then 'basarili' else 'basarisiz' end,
                                           'neden', v_neden, 'dogru_cevap', v_dogru,
                                           'sure_ms', case when v_at is not null then greatest(0, round(extract(epoch from
                                              (v_at - k.soru_baslangic - public.kasa_gosterim_payi())) * 1000))::int end);
  update public.kasa_maclari
     set faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => k.sonuc_sn),
         sahip = v_sahip,
         savunma = v_sav,
         son_tur = jsonb_build_object(
           'tur', k.tur, 'altin', false, 'dogru_cevap', v_dogru,
           'dogru', jsonb_build_object(v_h::text, v_d, v_r::text, false),
           'artis', 0, 'kasa_once', k.kasa, 'kasa_sonra', k.kasa, 'tavan_kirpti', false,
           'sahip_once', null, 'sahip_sonra', v_sahip, 'kazanan', null,
           'savunma', v_sav),
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler
     set sahip_sonra = v_sahip,
         savunma = v_sav - 'dogru_cevap'
   where kasa_id = p_id and tur = k.tur;
end $function$;

revoke all on function public.kasa_savunma_soru_bul(uuid, text) from public, anon, authenticated;
revoke all on function public.kasa_savunma_ac(uuid) from public, anon, authenticated;
revoke all on function public.kasa_savunma_cozumle(uuid, text) from public, anon, authenticated;

-- kasa_olustur
CREATE OR REPLACE FUNCTION public.kasa_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_davetli boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_x uuid;
  v_bot uuid;
  v_max int := greatest(1, public.ayar_sayi('kasa_max_tur', 36)::int);
begin
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if random() < 0.5 then v_x := p_a; p_a := p_b; p_b := v_x; end if;
  select p.id into v_bot from public.profiles p where p.id in (p_a, p_b) and coalesce(p.is_bot, false) limit 1;

  insert into public.kasa_maclari (
    oyuncu1, oyuncu2, dereceli, davetli, faz, faz_bitis,
    hedef, max_tur, artis, ikisi_artis, soru_sn, karar_sn, sonuc_sn, acma_min, jokerli,
    devam_sans, devam_garanti, devam_birakir, devam_elli, kasa_tavan, devam_carpan, savunma_acik,
    soru_ids, bot, bot_tarz)
  values (
    p_a, p_b, coalesce(p_dereceli, true), coalesce(p_davetli, false), 'baslangic',
    -- Klasik 3-2-1 (651): ilk soru now + geri sayım + gösterim payı; 952: + giriş sahnesi
    now() + make_interval(secs => public.ayar_sayi('mac_geri_sayim_sn', 3)
                                  + greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0
                                  + greatest(0, public.ayar_sayi('kasa_giris_sahne_ms', 3000)) / 1000.0),
    greatest(1, public.ayar_sayi('kasa_hedef_puan', 50)::int), v_max,
    greatest(0, public.ayar_sayi('kasa_artis', 2)::int),
    greatest(0, public.ayar_sayi('kasa_ikisi_dogru_artis', 6)::int),
    greatest(5, public.ayar_sayi('kasa_soru_sn', 15)::int),
    greatest(3, public.ayar_sayi('kasa_karar_sn', 8)::int),
    greatest(1, public.ayar_sayi('kasa_sonuc_sn', 3)::int),
    greatest(0, public.ayar_sayi('kasa_acma_min', 10)::int),
    true,
    -- 954: 953 şanslı ödülü yeni maçlarda kapalı; yerine sahiplik bırakma + garanti ücretsiz 50:50
    0, 0,
    public.ayar_sayi('kasa_devam_birakir', 0) >= 1,
    -- 987: Savunma Hakkı açıkken 954 ücretsiz 50:50 YOK (yerine geçer)
    public.ayar_sayi('kasa_devam_joker_acik', 0) >= 1 and public.ayar_sayi('kasa_savunma_acik', 0) < 1,
    -- 955: tavan (0 = yok) ve DEVAM çarpanı (1 = yok)
    greatest(0, public.ayar_sayi('kasa_tavan', 0)::int),
    greatest(1, public.ayar_ondalik('kasa_devam_carpan', 1)),
    public.ayar_sayi('kasa_savunma_acik', 0) >= 1,
    coalesce(public.soru_sec(null::text, v_max + 2, array[p_a, p_b]), '{}'::uuid[]),
    v_bot, case when v_bot is not null then public.kasa_bot_tarz(v_bot) end)
  returning id into v_id;

  insert into public.kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.kasa_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- kasa_karar_uygula
CREATE OR REPLACE FUNCTION public.kasa_karar_uygula(p_id uuid, p_ac boolean, p_sure_doldu boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_p1 int; v_p2 int;
  v_ms int;
  v_odul boolean := false;
  v_hak boolean := false;
  v_yeni int;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'karar' or k.sahip is null then return; end if;
  v_ms := greatest(0, round(extract(epoch from (now() - coalesce(k.karar_baslangic, now()) - public.kasa_gosterim_payi())) * 1000))::int;

  if coalesce(p_ac, false) and k.kasa >= k.acma_min then
    v_p1 := k.puan1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end;
    v_p2 := k.puan2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end;
    update public.kasa_maclari
       set puan1 = v_p1, puan2 = v_p2,
           acma_sayisi1 = acma_sayisi1 + (k.sahip = k.oyuncu1)::int,
           acma_sayisi2 = acma_sayisi2 + (k.sahip = k.oyuncu2)::int,
           acma_toplam1 = acma_toplam1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end,
           acma_toplam2 = acma_toplam2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end,
           kasa = 0, sahip = null,
           -- 954: kasa açıldı → iki oyuncunun da ücretsiz 50:50 hakkı biter
           joker = joker - '_hak',
           -- 987: hazine açıldı → kullanılmamış Savunma Hakları silinir
           savunma_hak = '{}'::uuid[],
           son_karar = jsonb_build_object('veren', k.sahip, 'ac', true, 'deger', k.kasa),
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = 'ac', karar_veren = k.sahip, karar_ms = v_ms, acilan_deger = k.kasa,
           puan1_sonra = v_p1, puan2_sonra = v_p2
     where kasa_id = p_id and tur = k.tur;
    -- AÇ sonrası hedef kontrolü
    if (case when k.sahip = k.oyuncu1 then v_p1 else v_p2 end) >= k.hedef then
      perform public.kasa_bitir(p_id, k.sahip, 'hedef');
      return;
    end if;
  else
    -- 954: bilerek DEVAM (süre dolumu değil) → kasa açılana kadar her soruda ücretsiz 50:50
    v_hak := k.devam_elli and k.jokerli and not coalesce(p_ac, false) and not coalesce(p_sure_doldu, false);
    -- 955: DEVAM (bilerek ya da süre dolumu) → ceil(kasa × çarpan), sonra tavan (çarpan 1 / tavan 0 = eski davranış)
    v_yeni := k.kasa;
    if coalesce(k.devam_carpan, 1) > 1 then v_yeni := ceil(k.kasa * k.devam_carpan)::int; end if;
    if k.kasa_tavan > 0 then v_yeni := least(v_yeni, k.kasa_tavan); end if;
    update public.kasa_maclari
       set son_karar = jsonb_build_object('veren', k.sahip, 'ac', false, 'deger', k.kasa,
                                          'sure_doldu', coalesce(p_sure_doldu, false))
                       || case when k.devam_birakir then jsonb_build_object('birakti', true) else '{}'::jsonb end
                       -- 955: çarpan anı (eski → yeni değer; istemci sayarak gösterir)
                       || case when coalesce(k.devam_carpan, 1) > 1 then jsonb_build_object('carpan', k.devam_carpan, 'yeni', v_yeni,
                                 'tavan', k.kasa_tavan > 0 and v_yeni >= k.kasa_tavan) else '{}'::jsonb end,
           kasa = v_yeni,
           -- 954: DEVAM sahipliği bırakır (kasa değeri korunur)
           sahip = case when k.devam_birakir then null else sahip end,
           joker = case when v_hak and not (coalesce(joker -> '_hak', '[]'::jsonb) ? k.sahip::text)
                        then joker || jsonb_build_object('_hak', coalesce(joker -> '_hak', '[]'::jsonb) || to_jsonb(k.sahip::text))
                        else joker end,
           -- 987: bilerek DEVAM (bot dahil; süre dolumu değil) → Savunma Hakkı (oyuncu başı en fazla 1, süresiz)
           savunma_hak = case when k.savunma_acik and not coalesce(p_sure_doldu, false)
                                   and not (k.sahip = any(savunma_hak))
                              then array_append(savunma_hak, k.sahip) else savunma_hak end,
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set karar = case when p_sure_doldu then 'sure_doldu' else 'devam' end,
           karar_veren = k.sahip, karar_ms = v_ms
     where kasa_id = p_id and tur = k.tur;
    -- 953 maçları (devam_sans > 0): eski şanslı ödül; yalnız bilerek DEVAM, karar fazı gerçekten açıkken
    v_odul := not coalesce(p_ac, false) and not coalesce(p_sure_doldu, false)
              and coalesce(k.devam_sans, 0) > 0 and k.kasa > 0 and k.kasa >= k.acma_min;
  end if;
  perform public.kasa_soru_ac(p_id);   -- 954: hak varsa ücretsiz 50:50 burada dağıtılır
  if v_odul then perform public.kasa_devam_odulu(p_id, k.sahip); end if;
  if v_hak then
    -- DEVAM anı (yalnız sahibine dönen 953 'devam' kaydı; ekranda "Ücretsiz 50:50" kartı)
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(k.sahip::text, coalesce(joker -> k.sahip::text, '{}'::jsonb)
                     || jsonb_build_object('devam', jsonb_build_object('tur', k.tur, 'kazandi', true, 'joker', 'elli')))
     where id = p_id and durum = 'aktif' and faz = 'cevap';
  end if;
end $function$;

-- kasa_cozumle
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

-- kasa_sonraki
CREATE OR REPLACE FUNCTION public.kasa_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_p1 int; v_p2 int;
  v_w uuid;
begin
  select * into k from public.kasa_maclari where id = p_id;
  if k.durum <> 'aktif' or k.faz <> 'sonuc' then return; end if;

  if k.altin then
    v_w := (k.son_tur ->> 'kazanan')::uuid;
    if v_w is not null then
      perform public.kasa_bitir(p_id, v_w, 'altin');
    else
      perform public.kasa_altin_ac(p_id);
    end if;
    return;
  end if;

  -- 987: Savunma Sorusu (tur sayısını yemez; tetik son turda açılmaz)
  if k.savunma is not null then
    if k.savunma ->> 'durum' = 'bekliyor' then
      perform public.kasa_savunma_ac(p_id);
      return;
    end if;
    update public.kasa_maclari set savunma = null where id = p_id;   -- sonuç gösterildi
  end if;

  if k.tur >= k.max_tur then
    -- Tur sınırı: sahip kasayı alır, çok puanlı kazanır; eşitse Altın Soru (jokersiz)
    v_p1 := k.puan1 + case when k.sahip = k.oyuncu1 then k.kasa else 0 end;
    v_p2 := k.puan2 + case when k.sahip = k.oyuncu2 then k.kasa else 0 end;
    update public.kasa_maclari
       set puan1 = v_p1, puan2 = v_p2, kasa = 0, sahip = null,
           son_karar = case when k.sahip is not null
                            then jsonb_build_object('veren', k.sahip, 'ac', true, 'deger', k.kasa, 'son', true) end,
           son_hareket = now()
     where id = p_id;
    update public.kasa_hamleler
       set son_tasima = case when k.sahip is not null then k.kasa end, puan1_sonra = v_p1, puan2_sonra = v_p2
     where kasa_id = p_id and tur = k.tur;
    if v_p1 > v_p2 then
      perform public.kasa_bitir(p_id, k.oyuncu1, 'tur_siniri');
    elsif v_p2 > v_p1 then
      perform public.kasa_bitir(p_id, k.oyuncu2, 'tur_siniri');
    else
      perform public.kasa_altin_ac(p_id);
    end if;
    return;
  end if;

  perform public.kasa_tur_baslat(p_id);
end $function$;

-- kasa_ilerlet
CREATE OR REPLACE FUNCTION public.kasa_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_tol interval := make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1));
  v_taban interval := make_interval(secs => public.ayar_sayi('kasa_kopuk_taban_sn', 3));
  v_kayma interval;
  v_b1 timestamptz;
  v_b2 timestamptz;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;

  -- 987: Savunma Sorusunda savunanın bağlantısı koptu → savunma başarısız (rakip kararını verir)
  if k.faz = 'cevap' and (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and exists (
       select 1 from public.profiles p
        where p.id = (k.savunma ->> 'sahip')::uuid and not coalesce(p.is_bot, false)
          and p.last_seen < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 25))) then
    perform public.kasa_savunma_cozumle(p_id, 'kopuk');
    perform public.kasa_sinyal_ver(p_id);
    select * into k from public.kasa_maclari where id = p_id;
  end if;

  -- ---------- KOPUKLUK KAPISI (Düello 760 deseni: faz donar, bekleme dolunca terk) ----------
  v_kopuk := public.kasa_kopuk_kim(p_id);
  if v_kopuk is not null then
    if k.kopuk_at is null then
      update public.kasa_maclari
         set kopuk_at = now(), kopuk_kalan = greatest(coalesce(k.faz_bitis, now()) - now(), v_taban)
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      select * into k from public.kasa_maclari where id = p_id;
    end if;
    if k.kopuk_at < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)) then
      perform public.kasa_bitir(p_id, case when v_kopuk = k.oyuncu1 then k.oyuncu2 else k.oyuncu1 end, 'kopuk');
      return;
    end if;
    update public.kasa_maclari
       set faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban)
     where id = p_id;
    return;
  end if;
  if k.kopuk_at is not null then
    v_kayma := now() - k.kopuk_at;
    update public.kasa_maclari
       set kopuk_at = null, kopuk_kalan = null,
           faz_bitis = now() + greatest(coalesce(k.kopuk_kalan, v_taban), v_taban),
           bot_cevap_at = bot_cevap_at + v_kayma,
           bot_karar_at = bot_karar_at + v_kayma,
           son_hareket = now()
     where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into k from public.kasa_maclari where id = p_id;
    exit when not found or k.durum <> 'aktif';

    if k.son_hareket < now() - make_interval(mins => public.ayar_sayi('kasa_zaman_asimi_dk', 60)::int) then
      update public.kasa_maclari set durum = 'iptal', bitis = now() where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
      exit;
    end if;

    if k.faz = 'baslangic' then
      exit when now() < k.faz_bitis;
      perform public.kasa_tur_baslat(p_id);
    elsif k.faz = 'karar' then
      if k.bot is not null and k.sahip = k.bot and k.bot_karar_at is not null and now() >= k.bot_karar_at then
        perform public.kasa_karar_uygula(p_id, coalesce(k.bot_karar, false), false);
      elsif now() >= k.faz_bitis then
        perform public.kasa_karar_uygula(p_id, false, true);   -- süre doldu → DEVAM
      else
        exit;
      end if;
    elsif k.faz = 'cevap' then
      if k.bot is not null and not (k.cevaplar ? k.bot::text) and k.bot_cevap_at is not null
         and now() >= k.bot_cevap_at then
        update public.kasa_maclari
           set cevaplar = cevaplar || jsonb_build_object(k.bot::text,
                            jsonb_build_object('cevap', k.bot_cevap, 'at', k.bot_cevap_at))
         where id = p_id;
        select * into k from public.kasa_maclari where id = p_id;
      end if;
      if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
        -- 987: yalnız savunan cevaplar; rakip izler
        exit when not ((k.cevaplar ? (k.savunma ->> 'sahip'))
                       or now() > public.kasa_oyuncu_bitis(k, (k.savunma ->> 'sahip')::uuid) + v_tol);
        perform public.kasa_savunma_cozumle(p_id, null);
        perform public.kasa_sinyal_ver(p_id);
        continue;
      end if;
      v_b1 := public.kasa_oyuncu_bitis(k, k.oyuncu1);
      v_b2 := public.kasa_oyuncu_bitis(k, k.oyuncu2);
      exit when not ((k.cevaplar ? k.oyuncu1::text) or now() > v_b1 + v_tol)
             or not ((k.cevaplar ? k.oyuncu2::text) or now() > v_b2 + v_tol);
      perform public.kasa_cozumle(p_id);
    elsif k.faz = 'sonuc' then
      exit when now() < k.faz_bitis;
      perform public.kasa_sonraki(p_id);
    else
      exit;
    end if;
    perform public.kasa_sinyal_ver(p_id);
  end loop;
end $function$;

-- kasa_cevap
CREATE OR REPLACE FUNCTION public.kasa_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_j jsonb;
  v_dogru smallint;
begin
  perform public.hiz_siniri('kasa_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if k.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') and v_me::text is distinct from k.savunma ->> 'sahip' then
    raise exception 'Savunma Sorusunu yalnız hak sahibi cevaplar';
  end if;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > public.kasa_oyuncu_bitis(k, v_me) + make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)) then
    raise exception 'Süre doldu';
  end if;
  select dogru_cevap into v_dogru from public.questions where id = k.soru_id;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);

  if (v_j ->> 'ilk') is not null and p_cevap = (v_j ->> 'ilk')::smallint then
    raise exception 'Başka bir cevap seç';
  end if;
  -- İkinci Şans: ilk yanlış cevap sayılmaz; aynı sayaçla bir kez daha (yalnız kullanan bilir)
  if coalesce((v_j ->> 'ikinci')::boolean, false) and (v_j ->> 'ilk') is null and p_cevap is distinct from v_dogru then
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(v_me::text, v_j || jsonb_build_object('ilk', p_cevap)),
           son_hareket = now()
     where id = p_id;
    perform public.gorulen_kaydet(k.soru_id);
    return jsonb_build_object('cevaplandi', false, 'ikinci_sans', true, 'elenen', p_cevap);
  end if;

  update public.kasa_maclari
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', now())),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(k.soru_id);
  if p_cevap is distinct from v_dogru then
    perform public.yanlis_kaydet(k.soru_id);
  end if;
  perform public.kasa_ilerlet(p_id);
  perform public.kasa_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ (rakip henüz cevaplamamış olabilir)
  return jsonb_build_object('cevaplandi', true);
end $function$;

-- kasa_joker
CREATE OR REPLACE FUNCTION public.kasa_joker(p_id uuid, p_tur text, p_satin_al boolean DEFAULT false, p_bedava boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_j jsonb;
  v_rj jsonb;
  v_toplam int; v_tur int; v_soru int;
  v_tur_sinir int;
  v_serbest boolean;
  v_fiyat bigint;
  v_adet int;
  v_satin boolean := false;
  v_bedava boolean := coalesce(p_bedava, false);
  v_dogru smallint;
  v_kapali int[];
  v_sn numeric;
  v_bitis timestamptz;
  v_yeni timestamptz;
  v_sonuc jsonb;
  v_idx int;   -- 987: joker_kullanimlari.soru_index (Savunma Sorusu = -tur: ayrı soru, soru başı sınırı ayrıca)
begin
  perform public.hiz_siniri('kasa_joker', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur is null or p_tur not in ('elli', 'sure', 'zaman_baskisi', 'ikinci_sans') then
    raise exception 'Bu joker Kasa modunda kullanılamaz';
  end if;
  k := public.kasa_kilitle(p_id);   -- FOR UPDATE: cevap ve joker aynı sırayla kilitlenir
  if k.durum <> 'aktif' then raise exception 'Maç bitti'; end if;
  if not k.jokerli then raise exception 'Bu maçta joker yok'; end if;
  if k.altin then raise exception 'Altın Soru''da joker kullanılamaz'; end if;
  if k.faz <> 'cevap' then raise exception 'Joker yalnız soru açıkken kullanılır'; end if;
  if k.kopuk_at is not null then raise exception 'Maç durdu, biraz bekle'; end if;
  if (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then
    if v_me::text is distinct from k.savunma ->> 'sahip' then raise exception 'Savunma Sorusunu yalnız hak sahibi cevaplar'; end if;
    if p_tur = 'zaman_baskisi' then raise exception 'Savunma Sorusunda Zaman Baskısı kullanılamaz'; end if;
  end if;
  v_idx := case when (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then -k.tur else k.tur end;
  if k.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > public.kasa_oyuncu_bitis(k, v_me) then raise exception 'Süre doldu'; end if;
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);
  -- 953: aynı soruda aynı joker türü iki kez (ücretsiz + ücretli dahil) kullanılamaz
  if coalesce(v_j -> 'turler', '[]'::jsonb) ? p_tur then
    raise exception 'Bu joker bu soruda zaten kullanıldı';
  end if;

  if v_bedava then
    -- DEVAM ödülü: yalnız kazanılan tür, yalnız bu soruda; envanter/coin/joker_kullanimlari YOK (sınırlara sayılmaz)
    if (v_j ->> 'bedava') is distinct from p_tur then raise exception 'Ücretsiz jokerin yok'; end if;
    v_j := v_j - 'bedava';
  else
    -- 985: Ortak Hazine'ye özel maç içi sınırlar (herkese eşit) — klasik_skill_* artık okunmuyor
    select count(*), count(*) filter (where j.tur = p_tur), count(*) filter (where j.soru_index = v_idx)
      into v_toplam, v_tur, v_soru
      from public.joker_kullanimlari j
     where j.user_id = v_me and j.mac_tur = 'kasa' and j.mac_id = p_id;
    if v_toplam >= public.ayar_sayi('kasa_joker_toplam_hak', 4)::int then
      raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('kasa_joker_toplam_hak', 4)::int;
    end if;
    v_tur_sinir := public.ayar_sayi('kasa_joker_hak_' || p_tur,
      case p_tur when 'ikinci_sans' then 1 when 'zaman_baskisi' then 3 else 2 end)::int;
    if v_tur >= v_tur_sinir then
      raise exception 'Bu skill için maç hakkın doldu';
    end if;
    if v_soru >= public.ayar_sayi('kasa_joker_soru_basi_hak', 1)::int then
      raise exception 'Bu soruda skill hakkını kullandın';
    end if;
    if p_tur = 'zaman_baskisi' and k.cevaplar ? v_rakip::text then
      raise exception 'Rakibin bu soruyu zaten cevapladı';
    end if;

    -- Envanter (Klasik ile aynı yardımcılar)
    v_serbest := public.jokerler_serbest();
    if coalesce(p_satin_al, false) then
      v_fiyat := public.joker_fiyati(p_tur);
      if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu joker satın alınamaz'; end if;
      perform 1 from public.profiles where id = v_me for update;
      select coalesce(e.adet, 0) into v_adet from public.joker_envanter e where e.user_id = v_me and e.tur = p_tur;
      if not v_serbest and coalesce(v_adet, 0) <= 0 then
        perform public.coin_harca(v_fiyat, 'joker', 'joker_mac_ici:' || p_id::text);
        perform public.joker_hareket(v_me, p_tur, 1, 'mac_ici', 'kasa:' || p_id::text);
        v_satin := true;
      end if;
    end if;
    if not v_serbest then
      perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'kasa:' || p_id::text);
    end if;
    insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
    values (v_me, 'kasa', p_id, v_idx, p_tur, v_serbest);
  end if;

  -- Etki
  v_j := v_j || jsonb_build_object('turler', coalesce(v_j -> 'turler', '[]'::jsonb) || to_jsonb(p_tur));
  if p_tur = 'elli' then
    select q.dogru_cevap into v_dogru from public.questions q where q.id = k.soru_id;
    select array_agg(x order by x) into v_kapali from (
      select x from generate_series(0, 3) x where x <> v_dogru order by random() limit 2
    ) s;
    v_j := v_j || jsonb_build_object('kapali', to_jsonb(v_kapali));
    v_sonuc := jsonb_build_object('tur', 'elli', 'kapali', to_jsonb(v_kapali));
  elsif p_tur = 'sure' then
    v_sn := greatest(1, public.ayar_sayi('skill_ek_sure_sn', 10));
    v_j := v_j || jsonb_build_object('fark', coalesce((v_j ->> 'fark')::numeric, 0) + v_sn);
    v_sonuc := jsonb_build_object('tur', 'sure', 'uzatildi', true, 'eklenen_sn', v_sn);
  elsif p_tur = 'ikinci_sans' then
    v_j := v_j || jsonb_build_object('ikinci', true);
    v_sonuc := jsonb_build_object('tur', 'ikinci_sans');
  else
    -- Zaman Baskısı: rakibin kişisel bitişi kısalır, en az klasik_zaman_baskisi_taban_sn kalır (Klasik kuralı)
    v_rj := coalesce(k.joker -> v_rakip::text, '{}'::jsonb);
    v_bitis := public.kasa_oyuncu_bitis(k, v_rakip);
    v_yeni := least(v_bitis, greatest(
      v_bitis - make_interval(secs => public.ayar_sayi('klasik_zaman_baskisi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('klasik_zaman_baskisi_taban_sn', 3))));
    v_rj := v_rj || jsonb_build_object('fark', round(extract(epoch from (v_yeni - k.faz_bitis))::numeric, 3),
                                       'kisaltildi', true);
    update public.kasa_maclari
       set joker = joker || jsonb_build_object(v_rakip::text, v_rj),
           -- Bot kısalan sürede cevaplayamıyorsa yanıtsız kalır (insan gibi)
           bot_cevap_at = case when bot = v_rakip and bot_cevap_at > v_yeni then null else bot_cevap_at end,
           bot_cevap = case when bot = v_rakip and bot_cevap_at > v_yeni then null else bot_cevap end
     where id = p_id;
    v_sonuc := jsonb_build_object('tur', 'zaman_baskisi', 'uygulandi', true,
                                  'azaltildi_sn', round(extract(epoch from (v_bitis - v_yeni))::numeric));
  end if;
  update public.kasa_maclari
     set joker = joker || jsonb_build_object(v_me::text, v_j), son_hareket = now()
   where id = p_id;
  perform public.kasa_sinyal_ver(p_id);

  return v_sonuc || jsonb_build_object(
    'satin_alindi', v_satin,
    'odenen', case when v_satin then v_fiyat else 0 end,
    'bedava', v_bedava,
    'coin', (select pr.coin from public.profiles pr where pr.id = v_me));
end $function$;

-- kasa_joker_durumu
CREATE OR REPLACE FUNCTION public.kasa_joker_durumu(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  -- 985: Ortak Hazine'ye özel sınırlar (klasik_skill_* okunmuyor)
  v_sinirlar jsonb := jsonb_build_object(
    'elli', public.ayar_sayi('kasa_joker_hak_elli', 2)::int,
    'sure', public.ayar_sayi('kasa_joker_hak_sure', 2)::int,
    'zaman_baskisi', public.ayar_sayi('kasa_joker_hak_zaman_baskisi', 3)::int,
    'ikinci_sans', public.ayar_sayi('kasa_joker_hak_ikinci_sans', 1)::int);
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into k from public.kasa_maclari where id = p_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  return (
    with benim as (
      select j.tur, j.soru_index from public.joker_kullanimlari j
       where j.user_id = v_me and j.mac_tur = 'kasa' and j.mac_id = p_id
    )
    select jsonb_build_object(
      'sinir', public.ayar_sayi('kasa_joker_toplam_hak', 4)::int,
      'kullanilan', (select count(*)::int from benim),
      'ucretsiz_elli_kaldi', false,
      -- 987: Savunma Sorusunda rakip izler (joker yok); savunana Zaman Baskısı yok
      'kilitli', not k.jokerli or k.altin or ((k.savunma is not null and k.savunma ->> 'durum' = 'soru') and v_me::text is distinct from k.savunma ->> 'sahip'),
      'savunma', (k.savunma is not null and k.savunma ->> 'durum' = 'soru'),
      'yasak_turler', case when (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then '["zaman_baskisi"]'::jsonb else '[]'::jsonb end,
      'kisaltildi', k.faz = 'cevap' and coalesce((k.joker -> v_me::text ->> 'kisaltildi')::boolean, false),
      'sis_bitis', null,
      'sunucu_zamani', now(),
      'kullanilan_turler', coalesce((select jsonb_agg(distinct b.tur) from benim b), '[]'::jsonb),
      'kullanim_sayilari', coalesce((select jsonb_object_agg(s.tur, s.adet)
                                       from (select b.tur, count(*)::int adet from benim b group by b.tur) s), '{}'::jsonb),
      -- tur_basi_sinir: eski istemci için en büyük tür sınırı; asıl kaynak tur_sinirlari / kalan_haklar
      'tur_basi_sinir', (select max(v.value::int) from jsonb_each_text(v_sinirlar) v),
      'tur_sinirlari', v_sinirlar,
      'kalan_haklar', (select jsonb_object_agg(v.key, greatest(0, v.value::int
                          - (select count(*)::int from benim b where b.tur = v.key)))
                         from jsonb_each_text(v_sinirlar) v),
      'soru_basi_sinir', public.ayar_sayi('kasa_joker_soru_basi_hak', 1)::int,
      'soruda_kullanildi', exists (select 1 from benim b where b.soru_index = case when (k.savunma is not null and k.savunma ->> 'durum' = 'soru') then -k.tur else k.tur end),
      -- 953: DEVAM ödülü (yalnız kendi; yalnız soru açıkken)
      'bedava', case when k.jokerli and not k.altin and k.faz = 'cevap' then k.joker -> v_me::text ->> 'bedava' end,
      'soru_turleri', case when k.faz = 'cevap' then coalesce(k.joker -> v_me::text -> 'turler', '[]'::jsonb)
                           else '[]'::jsonb end)
  );
end $function$;

-- kasa_durum
CREATE OR REPLACE FUNCTION public.kasa_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_sonuc jsonb;
  v_gecmis jsonb;
  v_kopuk uuid;
  v_payi interval := public.kasa_gosterim_payi();
  v_j jsonb;
  v_b_ben timestamptz;
  v_b_son timestamptz;
  v_ezeli jsonb;   -- 957
begin
  perform public.hiz_siniri('kasa_durum', 400, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;
  v_j := coalesce(k.joker -> v_me::text, '{}'::jsonb);
  if k.faz = 'cevap' then
    v_b_ben := public.kasa_oyuncu_bitis(k, v_me);
    v_b_son := greatest(public.kasa_oyuncu_bitis(k, k.oyuncu1), public.kasa_oyuncu_bitis(k, k.oyuncu2));
  end if;

  if k.soru_id is not null and (k.faz in ('cevap', 'sonuc') or k.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(k.soru_id, v_dil) sd;
  end if;

  -- Sonuç bandı: soru çözümlendikten SONRA (doğru cevap ancak burada)
  if k.faz = 'sonuc' and k.son_tur is not null then
    v_sonuc := k.son_tur || jsonb_build_object(
      'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
      'ben_dogru', coalesce((k.son_tur -> 'dogru' ->> v_me::text)::boolean, false),
      'rakip_dogru', coalesce((k.son_tur -> 'dogru' ->> v_rakip::text)::boolean, false));
    v_sonuc := v_sonuc - 'dogru';
  end if;

  if k.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'altin', h.altin, 'kategori', h.kategori,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', cb.cevap, 'ben_dogru', coalesce(cb.dogru, false),
             'rakip_dogru', coalesce(cr.dogru, false),
             'karar', h.karar, 'karar_ben', h.karar_veren = v_me, 'acilan_deger', h.acilan_deger,
             'kasa_sonra', h.kasa_sonra) order by h.tur), '[]'::jsonb)
      into v_gecmis
      from public.kasa_hamleler h
      left join public.questions q on q.id = h.soru_id
      left join public.kasa_cevaplari cb on cb.kasa_id = h.kasa_id and cb.tur = h.tur and cb.user_id = v_me
      left join public.kasa_cevaplari cr on cr.kasa_id = h.kasa_id and cr.tur = h.tur and cr.user_id = v_rakip
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on h.soru_id is not null
     where h.kasa_id = p_id;
  end if;

  if k.durum = 'aktif' and k.kopuk_at is not null then
    v_kopuk := public.kasa_kopuk_kim(p_id);
  end if;

  -- 957: arkadaşla bitmiş Kasa maçlarında galibiyet sayısı (Düello 'ezeli' ile aynı; yalnız maç bitince)
  if k.durum <> 'aktif' and exists (select 1 from public.friendships f where f.durum = 'arkadas'
       and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me))) then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me),
                              'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.kasa_maclari x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  return jsonb_build_object(
    'id', k.id, 'durum', k.durum, 'dereceli', k.dereceli,
    'faz', k.faz, 'faz_bitis', k.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'tur', k.tur, 'max_tur', k.max_tur, 'hedef', k.hedef, 'altin', k.altin,
    'artis', k.artis, 'ikisi_artis', k.ikisi_artis, 'acma_min', k.acma_min, 'jokerli', k.jokerli,
    'devam_sans', case when k.jokerli then k.devam_sans else 0 end,
    -- 954: kural bayrakları (maç satırına sabit)
    'devam_birakir', k.devam_birakir,
    'devam_elli', k.jokerli and k.devam_elli,
    -- 955: tavan (0 = yok) + DEVAM çarpanı (1 = yok)
    'tavan', k.kasa_tavan, 'devam_carpan', k.devam_carpan,
    'kasa', k.kasa, 'sahip', k.sahip,
    -- 987: Savunma Hakkı (iki oyuncuya da görünür) + bekleyen/süren/biten Savunma Sorusu
    'savunma_acik', k.savunma_acik,
    'savunma_hak', to_jsonb(coalesce(k.savunma_hak, '{}'::uuid[])),
    'savunma', case when k.durum = 'aktif' then k.savunma end,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'unvan', public.oyuncu_unvani(p.id), 'puan', k.puan1, 'acma', k.acma_sayisi1)
         from public.profiles p where p.id = k.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'unvan', public.oyuncu_unvani(p.id), 'puan', k.puan2, 'acma', k.acma_sayisi2)
         from public.profiles p where p.id = k.oyuncu2)),
    'karar', case when k.faz = 'karar' then jsonb_build_object('veren', k.sahip, 'deger', k.kasa) end,
    'son_karar', k.son_karar,
    'soru', v_soru,
    'cevap', case when k.faz = 'cevap' then jsonb_build_object(
               'ben_cevapladim', k.cevaplar ? v_me::text,
               'benim_cevabim', k.cevaplar -> v_me::text -> 'cevap',
               'rakip_cevapladi', k.cevaplar ? v_rakip::text) end,
    -- Joker: yalnız KENDİ girdin (kapalı şıklar / elenen ilk cevap / kısaltıldın mı); rakipten yalnız adlar
    'joker', case when k.jokerli and k.faz in ('cevap', 'sonuc') then jsonb_build_object(
               'turler', coalesce(v_j -> 'turler', '[]'::jsonb),
               'kapali', coalesce(v_j -> 'kapali', '[]'::jsonb),
               'elenen', v_j -> 'ilk',
               'ikinci_sans', coalesce((v_j ->> 'ikinci')::boolean, false),
               'kisaltildi', coalesce((v_j ->> 'kisaltildi')::boolean, false)) end,
    'rakip_joker', case when k.jokerli and k.faz in ('cevap', 'sonuc')
                        then coalesce(k.joker -> v_rakip::text -> 'turler', '[]'::jsonb) end,
    -- 953/954: ücretsiz joker — YALNIZ kendi kaydın (rakibin hakkı ve '_hak' / '_devam' dönmez)
    'bedava_joker', case when k.jokerli and k.faz = 'cevap' and not k.altin then v_j ->> 'bedava' end,
    'devam_odul', case when k.jokerli and k.faz in ('cevap', 'sonuc') then v_j -> 'devam' end,
    'sonuc', v_sonuc,
    'sureler', jsonb_build_object(
       'soru', k.soru_sn, 'karar', k.karar_sn, 'sonuc', k.sonuc_sn,
       'nabiz', public.kasa_nabiz_sn(), 'kopuk', public.ayar_sayi('kasa_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('kasa_gosterim_payi_ms', 1500),
       'gosterim_bas', case k.faz
          when 'karar' then k.karar_baslangic + v_payi
          when 'cevap' then k.soru_baslangic + v_payi end,
       'benim_bitis', v_b_ben,
       'faz_son', coalesce(v_b_son, k.faz_bitis)),
    'kopuk', case when k.durum = 'aktif' and k.kopuk_at is not null then jsonb_build_object(
       'ben_mi', v_kopuk is not null and v_kopuk = v_me,
       'bitis', k.kopuk_at + make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)),
       'faz_kalan_sn', round(extract(epoch from coalesce(k.kopuk_kalan, interval '0'))::numeric, 2)) end,
    'kazanan', k.kazanan, 'sonuc_neden', k.sonuc_neden,
    'terk', case when k.durum <> 'aktif' then jsonb_build_object(
       'ben', k.terk_eden = v_me, 'rakip', k.terk_eden is not null and k.terk_eden <> v_me) end,
    'baglanmayan', k.baglanmayan,
    'gecmis', v_gecmis,
    -- 957: rövanş + arkadaşla Kasa geçmişi
    'rovans', case when k.durum <> 'aktif' then jsonb_build_object(
       'isteyen', k.rovans_isteyen, 'id', k.rovans_id,
       'gecerli', k.rovans_at is not null and k.rovans_at > now() - make_interval(secs => public.ayar_sayi('kasa_rovans_sn', 60)),
       'sure_sn', public.ayar_sayi('kasa_rovans_sn', 60)) end,
    'onceki_id', k.onceki_id,
    'ezeli', v_ezeli
  );
end $function$;

-- kasa_altin_ac
CREATE OR REPLACE FUNCTION public.kasa_altin_ac(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
begin
  select * into k from public.kasa_maclari where id = p_id;
  update public.kasa_maclari
     set altin = true, tur = tur + 1, son_karar = null, son_tur = null, sahip = null, kasa = 0,
         bot_karar = null, bot_karar_at = null, son_hareket = now(),
         savunma_hak = '{}'::uuid[], savunma = null   -- 987
   where id = p_id;
  insert into public.kasa_hamleler (kasa_id, tur, altin, kasa_once, sahip_once)
  values (p_id, k.tur + 1, true, 0, null)
  on conflict (kasa_id, tur) do nothing;
  perform public.kasa_soru_ac(p_id, public.kasa_altin_soru_bul(p_id));
end $function$;

-- /987
