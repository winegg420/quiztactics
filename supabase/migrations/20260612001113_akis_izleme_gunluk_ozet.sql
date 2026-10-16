-- ============================================================
-- 1113 AKIŞ BOZULMASI KAYDI + GÜNLÜK İZLEME E-POSTASI (16 Eki 2026)
--
-- Neden: Ida'nın Android uygulamasında (TWA, Wi-Fi) Hazine'de sayaç yavaşlayıp hızlandı, 0'da takıldı, sonra sayfa bir
-- anda geçti; bilgisayardaki yavaş telefon taklidi "çakışma 0" verdi. 1097 izlemesi yalnız çökme / başarısız çağrı
-- kaydediyordu, zamanlama bozulmasını değil.
--
-- 1) akis_bozulma: istemcinin kendi ölçtüğü akış bozulmaları (oyun/lib/akisIzleme.js): sayac_sapma (> 700 ms) ·
--    sayac_sifir (0'da > 1 sn) · faz_gec (sunucu bitişinden > 1 sn geç / ani atlama) · donma (> 500 ms uzun görev) ·
--    ses_gec (> 300 ms) · ses_yok. Alanlar: mod, an, gecikme ms, cihaz, kip (twa/pwa/tarayici), ağ türü, sürüm, maç kimliği.
--    KİŞİSEL VERİ YOK (an adı izleme_temizle'den geçer; IP yok). 30 gün (kayit_budama).
-- 2) istemci_kayit_yaz: MEVCUT tek RPC ve imza — p_olaylar içindeki `olay: "akis"` öğeleri bu tabloya yazılır.
--    Sınır: kullanıcı başına dakikada 10 (rpc_sayac, UNLOGGED), sekme oturumunda 60, aynı maçta aynı tür 3; aşan sessizce
--    atılır. İstemci de ayrıca sınırlar (maçta tür başına 3, dakikada 8, oturumda 40).
-- 3) izleme_ozeti: "akis" bölümü (son 24 saat / 7 gün: mod × olay, en kötü 20, etkilenen oyuncu) + günlük e-posta durumu.
-- 4) izleme_gunluk_ozet_gonder(p_test): her sabah 08:00 TSİ (cron 05:00 UTC) son 24 saatin özeti → idagureli@gmail.com +
--    info@quiztactics.com (Resend, anahtar Vault resend_api_key — 1097 yolu). Sorun yoksa da "sorun yok" gelir.
--    izleme_gunluk_ozet_elle(): sahip elle tetikler ([TEST] konulu; 10 dakikada en çok 1).
--
-- GÜVENLİK (görev metni Ida, 16 Eki 2026 — istenen yapı; 1097 deseni): akis_bozulma RLS AÇIK, politika YOK, hiçbir role
-- GRANT YOK → yalnız security definer fonksiyonlar okur/yazar. Yeni iç fonksiyonlar herkese kapalı (cron: service_role);
-- izleme_gunluk_ozet_elle authenticated'a açık ama sahip_mi() kapılı (izleme_ozeti / izleme_funnel gibi).
-- istemci_kayit_yaz / izleme_ozeti / kayit_budama: yalnız gövde (create or replace yetkileri korur).
-- Geri alma: docs/izleme-1113-geri-al.sql
-- ============================================================

-- ───── 1) Tablo ─────
create table if not exists public.akis_bozulma (
  id           bigint generated always as identity primary key,
  zaman        timestamptz not null default now(),
  kullanici_id uuid not null,
  oturum_id    uuid not null,
  mod          text not null check (mod in ('klasik', 'saf_bilgi', 'duello', 'hazine', 'grup', 'turnuva')),
  olay         text not null check (olay in ('sayac_sapma', 'sayac_sifir', 'faz_gec', 'donma', 'ses_gec', 'ses_yok')),
  an           text not null default '' check (length(an) <= 40),
  gecikme_ms   int not null check (gecikme_ms between 0 and 600000),
  mac_id       uuid,
  kip          text check (kip in ('twa', 'pwa', 'tarayici')),
  ag           text check (length(ag) <= 20),
  surum        text check (length(surum) <= 40),
  cihaz        text check (cihaz in ('ios', 'android', 'masaustu', 'diger'))
);
create index if not exists akis_bozulma_zaman on public.akis_bozulma (zaman);
create index if not exists akis_bozulma_oturum on public.akis_bozulma (oturum_id);
alter table public.akis_bozulma enable row level security;
revoke all on public.akis_bozulma from public, anon, authenticated;
-- politika yok: doğrudan okuma/yazma kimseye açık değil

-- Günlük e-posta durumu (tek satırlık mevcut tablo)
alter table public.izleme_uyari add column if not exists gunluk_son timestamptz;
alter table public.izleme_uyari add column if not exists gunluk_istek_id bigint;
alter table public.izleme_uyari add column if not exists gunluk_elle_son timestamptz;

-- ───── 2) İç özet (sahip sayfası + e-posta ortak) ─────
create or replace function public.izleme_akis_ozet(p_sure interval)
returns jsonb
language sql
stable
set search_path to 'public'
as $f$
  with b as (select * from public.akis_bozulma where zaman > now() - p_sure)
  select jsonb_build_object(
    'toplam', (select count(*) from b),
    'kisi',   (select count(distinct kullanici_id) from b),
    'mac',    (select count(distinct mac_id) from b),
    'mod_olay', coalesce((select jsonb_agg(t order by t.sayi desc) from (
        select mod, olay, count(*) as sayi, count(distinct kullanici_id) as kisi,
               round(avg(gecikme_ms))::int as ort_ms, max(gecikme_ms) as en_kotu_ms
          from b group by mod, olay) t), '[]'::jsonb),
    'en_kotu', coalesce((select jsonb_agg(t order by t.gecikme_ms desc) from (
        select zaman, mod, olay, an, gecikme_ms, cihaz, kip, ag, surum
          from b order by gecikme_ms desc limit 20) t), '[]'::jsonb),
    'cihaz', coalesce((select jsonb_agg(t order by t.sayi desc) from (
        select coalesce(cihaz, 'diger') as cihaz, coalesce(kip, '?') as kip, count(*) as sayi, count(distinct kullanici_id) as kisi
          from b group by 1, 2) t), '[]'::jsonb));
$f$;
revoke all on function public.izleme_akis_ozet(interval) from public, anon, authenticated;

-- ───── 3) Yazma: mevcut RPC (imza/yetki aynı), akış öğeleri eklendi ─────
CREATE OR REPLACE FUNCTION public.istemci_kayit_yaz(p_oturum uuid, p_surum text DEFAULT NULL::text, p_cihaz text DEFAULT NULL::text, p_hatalar jsonb DEFAULT '[]'::jsonb, p_olaylar jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me    uuid := auth.uid();
  v_surum text := left(coalesce(p_surum, ''), 40);
  v_cihaz text := case when p_cihaz in ('ios', 'android', 'masaustu', 'diger') then p_cihaz else 'diger' end;
  v_kalan int;
  v_yazilan int;
begin
  if v_me is null or p_oturum is null then return; end if;

  if jsonb_typeof(p_hatalar) = 'array' and jsonb_array_length(p_hatalar) > 0 then
    v_kalan := least(public.izleme_kota('izleme_hata', 5), 10);
    if v_kalan > 0 then
      with girdi as (
        select e->>'tur' as tur,
               public.izleme_temizle(split_part(e->>'sayfa', '?', 1), 120) as sayfa,
               public.izleme_temizle(e->>'mesaj', 300) as mesaj
          from jsonb_array_elements(p_hatalar) with ordinality as x(e, sira)
         where jsonb_typeof(e) = 'object'
           and e->>'tur' in ('js', 'soz', 'react', 'rpc', 'rest')
           and length(coalesce(e->>'mesaj', '')) > 0
         order by sira
         limit 10
      )
      insert into public.istemci_hata (kullanici_id, oturum_id, imza, tur, sayfa, mesaj, surum, cihaz)
      select v_me, p_oturum, md5(tur || '|' || sayfa || '|' || mesaj), tur, sayfa, mesaj, v_surum, v_cihaz
        from (select distinct on (tur, sayfa, mesaj) * from girdi) g
       limit v_kalan
      on conflict (oturum_id, imza) do nothing;
      get diagnostics v_yazilan = row_count;
      if v_yazilan > 0 then perform public.izleme_kota('izleme_hata', 5, v_yazilan); end if;
    end if;
  end if;

  -- 1113: akış bozulmaları (p_olaylar içinde olay = 'akis') → akis_bozulma. Dakikada 10 (rpc_sayac), sekme oturumunda 60,
  -- aynı maçta aynı tür 3; geçersiz/aşan öğe sessizce atılır (hata fırlatılmaz, istemci yeniden denemez).
  if jsonb_typeof(p_olaylar) = 'array' and exists (select 1 from jsonb_array_elements(p_olaylar) x(e)
                                                    where jsonb_typeof(e) = 'object' and e->>'olay' = 'akis') then
    v_kalan := least(public.izleme_kota('izleme_akis', 10), 10,
                     60 - (select count(*) from public.akis_bozulma b where b.oturum_id = p_oturum)::int);
    if v_kalan > 0 then
      insert into public.akis_bozulma (kullanici_id, oturum_id, mod, olay, an, gecikme_ms, mac_id, kip, ag, surum, cihaz)
      select v_me, p_oturum, e->>'mod', e->>'tur', public.izleme_temizle(coalesce(e->>'an', ''), 40),
             least((e->>'ms')::numeric, 600000)::int,
             case when e->>'mac' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (e->>'mac')::uuid end,
             case when e->>'kip' in ('twa', 'pwa', 'tarayici') then e->>'kip' end,
             nullif(left(regexp_replace(coalesce(e->>'ag', ''), '[^A-Za-z0-9/_-]', '', 'g'), 20), ''),
             v_surum, v_cihaz
        from (select e, sira, row_number() over (partition by e->>'tur', lower(e->>'mac') order by sira) as sira_tur
                from jsonb_array_elements(p_olaylar) with ordinality as x(e, sira)) x
       where jsonb_typeof(e) = 'object' and e->>'olay' = 'akis'
         and e->>'tur' in ('sayac_sapma', 'sayac_sifir', 'faz_gec', 'donma', 'ses_gec', 'ses_yok')
         and e->>'mod' in ('klasik', 'saf_bilgi', 'duello', 'hazine', 'grup', 'turnuva')
         and coalesce(e->>'ms', '') ~ '^[0-9]{1,9}(.[0-9]+)?$'
         and (select count(*) from public.akis_bozulma b
               where b.oturum_id = p_oturum and b.olay = e->>'tur' and b.mac_id::text = lower(e->>'mac')) + sira_tur <= 3
       order by sira
       limit v_kalan;
      get diagnostics v_yazilan = row_count;
      if v_yazilan > 0 then perform public.izleme_kota('izleme_akis', 10, v_yazilan); end if;
    end if;
  end if;

  if jsonb_typeof(p_olaylar) = 'array' and jsonb_array_length(p_olaylar) > 0 then
    v_kalan := least(public.izleme_kota('izleme_olay', 10), 10);
    if v_kalan > 0 then
      insert into public.olay_kaydi (kullanici_id, olay, anahtar, surum, cihaz)
      select v_me, e->>'olay', public.izleme_temizle(e->>'anahtar', 64), v_surum, v_cihaz
        from jsonb_array_elements(p_olaylar) as x(e)
       where jsonb_typeof(e) = 'object'
         and e->>'olay' in ('giris', 'kurulum', 'davet_eslesti')   -- 'kayit' yalnız sunucu tetikleyicisinden
       limit v_kalan
      on conflict (olay, kullanici_id, anahtar) do nothing;
      get diagnostics v_yazilan = row_count;
      if v_yazilan > 0 then perform public.izleme_kota('izleme_olay', 10, v_yazilan); end if;
    end if;
  end if;
end $function$;

-- ───── 4) Sahip özeti (gövde; yetki aynı) + saklama ─────
CREATE OR REPLACE FUNCTION public.izleme_ozeti()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_bas  timestamptz := clock_timestamp();
  v_gun  timestamptz := now() - interval '24 hours';
  v_sonuc jsonb;
  v_uyari public.izleme_uyari;
begin
  if not public.sahip_mi() then
    raise exception 'Bu bilgi yalnız sahibe açık.' using errcode = '42501';
  end if;
  select * into v_uyari from public.izleme_uyari where id = 1;

  v_sonuc := jsonb_build_object(
    'hata_24s',  (select count(*) from public.istemci_hata where zaman > v_gun),
    'hata_10dk', (select count(*) from public.istemci_hata where zaman > now() - interval '10 minutes'),
    'hata_kisi_24s', (select count(distinct kullanici_id) from public.istemci_hata where zaman > v_gun),
    'en_sik', coalesce((
      select jsonb_agg(t order by t.sayi desc)
        from (select tur, sayfa, mesaj, count(*) as sayi, count(distinct kullanici_id) as kisi,
                     max(zaman) as son, max(surum) as surum
                from public.istemci_hata where zaman > v_gun
               group by tur, sayfa, mesaj
               order by count(*) desc limit 10) t), '[]'::jsonb),
    'olaylar', coalesce((
      select jsonb_object_agg(olay, sayi)
        from (select olay, count(*) as sayi from public.olay_kaydi where zaman > v_gun group by olay) t), '{}'::jsonb),
    'maclar', jsonb_build_array(
      jsonb_build_object('mod', 'klasik',  'basladi', (select count(*) from public.matches       where created_at > v_gun), 'bitti', (select count(*) from public.matches       where bitis > v_gun)),
      jsonb_build_object('mod', 'duello',  'basladi', (select count(*) from public.duellolar     where created_at > v_gun), 'bitti', (select count(*) from public.duellolar     where bitis > v_gun)),
      jsonb_build_object('mod', 'kasa',    'basladi', (select count(*) from public.kasa_maclari  where created_at > v_gun), 'bitti', (select count(*) from public.kasa_maclari  where bitis > v_gun)),
      jsonb_build_object('mod', 'grup',    'basladi', (select count(*) from public.group_matches where created_at > v_gun), 'bitti', (select count(*) from public.group_matches where bitis > v_gun)),
      jsonb_build_object('mod', 'turnuva', 'basladi', (select count(*) from public.tournaments   where created_at > v_gun), 'bitti', (select count(*) from public.tournaments   where bitis > v_gun))),
    'aktif_kullanici', (select count(*) from public.profiles where last_seen > v_gun and not coalesce(is_bot, false)),
    'son_kontrol', (select max(d.end_time) from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                     where j.jobname = 'bildim-izleme-uyari' and d.status = 'succeeded'),
    'son_uyari', v_uyari.son_gonderim,
    'son_uyari_sayi', v_uyari.son_sayi,
    'son_uyari_kod', (select r.status_code from net._http_response r where r.id = v_uyari.son_istek_id),
    'esik', 50,
    'db_boyut_mb', round(pg_database_size(current_database()) / 1048576.0),
    'baglanti', (select count(*) from pg_stat_activity where datname = current_database()),
    -- 1113: akış bozulmaları + günlük e-posta durumu
    'akis', jsonb_build_object('s24', public.izleme_akis_ozet(interval '24 hours'), 'g7', public.izleme_akis_ozet(interval '7 days')),
    'gunluk_son', v_uyari.gunluk_son,
    'gunluk_kod', (select r.status_code from net._http_response r where r.id = v_uyari.gunluk_istek_id)
  );
  return v_sonuc || jsonb_build_object('sunucu_ms',
    round(extract(epoch from clock_timestamp() - v_bas) * 1000, 1));
end $function$;

CREATE OR REPLACE FUNCTION public.kayit_budama()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_cron int := 0;
  v_sayac int := 0;
  v_net int := 0;
  v_hata int := 0;
  v_olay int := 0;
  v_akis int := 0;
begin
  delete from cron.job_run_details
   where end_time < now() - interval '6 hours'
      or (end_time is null and start_time < now() - interval '1 day');
  get diagnostics v_cron = row_count;
  -- En uzun pencere 24 saat (günlük davet/istek tavanı, 1053): 2 günden eski pencere zaten sıfırlanır.
  delete from public.rpc_sayac where pencere_baslangic < now() - interval '2 days';
  get diagnostics v_sayac = row_count;
  if to_regclass('net._http_response') is not null then
    execute 'delete from net._http_response where created < now() - interval ''1 day''';
    get diagnostics v_net = row_count;
  end if;
  -- 1097: izleme kayıtları 30 gün saklanır.
  delete from public.istemci_hata where zaman < now() - interval '30 days';
  get diagnostics v_hata = row_count;
  delete from public.olay_kaydi where zaman < now() - interval '30 days';
  get diagnostics v_olay = row_count;
  -- 1113: akış bozulmaları da 30 gün
  delete from public.akis_bozulma where zaman < now() - interval '30 days';
  get diagnostics v_akis = row_count;
  return jsonb_build_object('cron', v_cron, 'rpc_sayac', v_sayac, 'net', v_net, 'istemci_hata', v_hata, 'olay_kaydi', v_olay, 'akis_bozulma', v_akis);
end $function$;

-- ───── 5) Günlük özet e-postası ─────
-- p_test = true: konu "[TEST] " ile başlar; günlük gönderim kaydını (gunluk_son) değiştirmez → o sabahki gerçek e-postayı engellemez.
create or replace function public.izleme_gunluk_ozet_gonder(p_test boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_bas    timestamptz := now() - interval '24 hours';
  v_tr     timestamp := now() at time zone 'Europe/Istanbul';   -- TSİ duvar saati (gösterim)
  v_son    timestamptz;
  v_hata   int; v_hata_kisi int;
  v_akis   int; v_akis_kisi int; v_akis_mac int;
  v_metin  text;
  v_sik    text; v_mod text; v_cihaz text; v_mac text;
  v_id     bigint;
begin
  select gunluk_son into v_son from public.izleme_uyari where id = 1 for update;
  if not p_test and v_son is not null and v_son > now() - interval '20 hours' then
    return jsonb_build_object('gonderildi', false, 'neden', 'bugun_gonderildi');
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'resend_api_key') then
    raise warning 'izleme_gunluk_ozet_gonder: Vault anahtarı yok';
    return jsonb_build_object('gonderildi', false, 'neden', 'anahtar_yok');
  end if;

  select count(*), count(distinct kullanici_id) into v_hata, v_hata_kisi from public.istemci_hata where zaman > v_bas;
  select count(*), count(distinct kullanici_id), count(distinct mac_id) into v_akis, v_akis_kisi, v_akis_mac
    from public.akis_bozulma where zaman > v_bas;

  -- En sık 10 sorun: istemci hataları (tür · sayfa · mesaj) + akış bozulmaları (mod · olay · an) birlikte sıralı
  select string_agg(format('%s. %s× %s', n, sayi, ad), E'\n' order by n)
    into v_sik
    from (select row_number() over (order by sayi desc, ad) as n, sayi, ad
            from (select count(*) as sayi,
                         format('[hata:%s] %s — %s (%s oyuncu)', tur, sayfa, left(mesaj, 140), count(distinct kullanici_id)) as ad
                    from public.istemci_hata where zaman > v_bas group by tur, sayfa, mesaj
                  union all
                  select count(*) as sayi,
                         format('[akış:%s] %s · %s — ort %s ms, en kötü %s ms (%s oyuncu)', olay, mod, nullif(an, ''),
                                round(avg(gecikme_ms)), max(gecikme_ms), count(distinct kullanici_id)) as ad
                    from public.akis_bozulma where zaman > v_bas group by olay, mod, an) u
           order by sayi desc, ad limit 10) t;

  select string_agg(format('  %s: %s', mod, olaylar), E'\n' order by mod)
    into v_mod
    from (select mod, string_agg(format('%s %s', olay, sayi), ', ' order by sayi desc) as olaylar
            from (select mod, olay, count(*) as sayi from public.akis_bozulma where zaman > v_bas group by mod, olay) x
           group by mod) t;

  select string_agg(format('  %s: %s hata, %s akış%s', c, coalesce(h, 0), coalesce(a, 0), coalesce(' (' || k || ')', '')),
                    E'
' order by coalesce(h, 0) + coalesce(a, 0) desc)
    into v_cihaz
    from (select coalesce(h.c, a.c) as c, h.n as h, a.n as a, a.k
            from (select coalesce(cihaz, 'diger') as c, count(*) as n from public.istemci_hata where zaman > v_bas group by 1) h
            full join (select c, sum(n)::int as n, string_agg(format('%s %s', kip, n), ', ' order by n desc) as k
                         from (select coalesce(cihaz, 'diger') as c, coalesce(kip, '?') as kip, count(*) as n
                                 from public.akis_bozulma where zaman > v_bas group by 1, 2) y group by c) a on a.c = h.c) t;

  select string_agg(format('  %s: %s başladı, %s bitti', m, b, s), E'\n')
    into v_mac
    from (values
      ('Klasik/Saf Bilgi', (select count(*) from public.matches where created_at > v_bas), (select count(*) from public.matches where bitis > v_bas)),
      ('Düello',  (select count(*) from public.duellolar where created_at > v_bas), (select count(*) from public.duellolar where bitis > v_bas)),
      ('Hazine',  (select count(*) from public.kasa_maclari where created_at > v_bas), (select count(*) from public.kasa_maclari where bitis > v_bas)),
      ('Grup',    (select count(*) from public.group_matches where created_at > v_bas), (select count(*) from public.group_matches where bitis > v_bas)),
      ('Turnuva', (select count(*) from public.tournaments where created_at > v_bas), (select count(*) from public.tournaments where bitis > v_bas))) v(m, b, s);

  v_metin := format(E'Quiz Tactics günlük izleme — %s\nDönem: son 24 saat (%s – %s TSİ)\n\n',
                    to_char(v_tr, 'DD.MM.YYYY'), to_char(v_tr - interval '24 hours', 'DD.MM HH24:MI'), to_char(v_tr, 'DD.MM HH24:MI'))
    || case when v_hata = 0 and v_akis = 0
            then E'SORUN YOK — son 24 saatte istemci hatası ve akış bozulması kaydedilmedi.\n\n' else '' end
    || format(E'İstemci hataları: %s kayıt · %s oyuncu\nAkış bozulmaları: %s kayıt · %s oyuncu · %s maç\n\n', v_hata, v_hata_kisi, v_akis, v_akis_kisi, v_akis_mac)
    || case when v_sik is not null then E'En sık 10 sorun:\n' || v_sik || E'\n\n' else '' end
    || case when v_mod is not null then E'Akış bozulması — mod kırılımı:\n' || v_mod || E'\n\n' else '' end
    || case when v_cihaz is not null then E'Cihaz kırılımı (akışta açılış kipi: twa / pwa / tarayici):\n' || v_cihaz || E'\n\n' else '' end
    || E'Maçlar:\n' || coalesce(v_mac, '  —') || E'\n\n'
    || E'Ayrıntı: https://quiztactics.com/yonetim/izleme\n'
    || E'Olay türleri: sayac_sapma = sayaç sunucudan > 700 ms saptı · sayac_sifir = sayaç 0''da > 1 sn kaldı · faz_gec = geçiş > 1 sn geç / ani atlama · donma = > 500 ms donma · ses_gec / ses_yok = ses > 300 ms geç / hiç başlamadı.\n'
    || E'Bu e-posta her sabah 08:00 TSİ gönderilir; kişisel veri içermez.';

  -- Anahtar yalnız istek başlığında kullanılır; değişkene/kayda/çıktıya yazılmaz.
  select net.http_post(
           url := 'https://api.resend.com/emails',
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                             where name = 'resend_api_key' limit 1)),
           body := jsonb_build_object(
             'from', 'Quiz Tactics İzleme <no-reply@quiztactics.com>',
             'to', jsonb_build_array('idagureli@gmail.com', 'info@quiztactics.com'),
             'subject', case when p_test then '[TEST] ' else '' end || format('Quiz Tactics günlük izleme — %s', to_char(v_tr, 'DD.MM')),
             'text', v_metin),
           timeout_milliseconds := 5000)
    into v_id;

  if p_test then
    update public.izleme_uyari set gunluk_istek_id = v_id where id = 1;
  else
    update public.izleme_uyari set gunluk_son = now(), gunluk_istek_id = v_id where id = 1;
  end if;
  return jsonb_build_object('gonderildi', true, 'istek', v_id, 'test', p_test, 'hata', v_hata, 'akis', v_akis);
end $f$;
revoke all on function public.izleme_gunluk_ozet_gonder(boolean) from public, anon, authenticated;
grant execute on function public.izleme_gunluk_ozet_gonder(boolean) to service_role;

-- Sahip elle tetikler (/yonetim/izleme › "Test e-postası gönder"): [TEST] konulu, 10 dakikada en çok 1.
create or replace function public.izleme_gunluk_ozet_elle()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_son timestamptz;
begin
  if not public.sahip_mi() then
    raise exception 'Bu işlem yalnız sahibe açık.' using errcode = '42501';
  end if;
  select gunluk_elle_son into v_son from public.izleme_uyari where id = 1 for update;
  if v_son is not null and v_son > now() - interval '10 minutes' then
    return jsonb_build_object('gonderildi', false, 'neden', 'sinir', 'son', v_son);
  end if;
  update public.izleme_uyari set gunluk_elle_son = now() where id = 1;
  return public.izleme_gunluk_ozet_gonder(true);
end $f$;
revoke all on function public.izleme_gunluk_ozet_elle() from public, anon;
grant execute on function public.izleme_gunluk_ozet_elle() to authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'bildim-izleme-gunluk') then
    perform cron.unschedule('bildim-izleme-gunluk');
  end if;
  -- 05:00 UTC = 08:00 TSİ (Türkiye yaz saati uygulamaz)
  perform cron.schedule('bildim-izleme-gunluk', '0 5 * * *', 'select public.izleme_gunluk_ozet_gonder()');
end $$;
