-- ============================================================
-- 1116 İZLEME: "ses kesildi" olay türü (16 Eki 2026)
--
-- Neden: Ida, Hazine'de rakibin 2x işaret sesinin ve 3-2-1 sonrası giriş sesinin yarıda kaldığını gördü; 1113 izlemesi geç
-- başlayan / hiç çalmayan sesi kaydediyordu, YARIDA KALAN sesi değil. İstemci (oyun/lib/ses.js › omurBitti → akisIzleme.js ›
-- akisSesKesildi) anlam taşıyan ses planının %80'inden önce bittiyse ya da çalarken yeni faz geldi ve > 150 ms kaldıysa
-- 'ses_kesildi' yazar: an = "rol|faz|kesen", gecikme_ms = kalan ms. Mod, cihaz, kip, sürüm, maç kimliği 1113 ile aynı.
-- Sınırlar aynı (maçta tür başına 3, dakikada 10, oturumda 60).
--
-- Değişen: akis_bozulma.olay kısıtına 'ses_kesildi' · istemci_kayit_yaz gövdesi (yalnız tür listesi) · günlük e-posta açıklama
-- satırı. Yetki/RLS/GRANT DEĞİŞMEDİ (create or replace yetkileri korur). Geri alma: docs/izleme-1116-geri-al.sql
-- ============================================================

alter table public.akis_bozulma drop constraint if exists akis_bozulma_olay_check;
alter table public.akis_bozulma add constraint akis_bozulma_olay_check
  check (olay in ('sayac_sapma', 'sayac_sifir', 'faz_gec', 'donma', 'ses_gec', 'ses_yok', 'ses_kesildi'));

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
         and e->>'tur' in ('sayac_sapma', 'sayac_sifir', 'faz_gec', 'donma', 'ses_gec', 'ses_yok', 'ses_kesildi')
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

CREATE OR REPLACE FUNCTION public.izleme_gunluk_ozet_gonder(p_test boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    || E'Olay türleri: sayac_sapma = sayaç sunucudan > 700 ms saptı · sayac_sifir = sayaç 0''da > 1 sn kaldı · faz_gec = geçiş > 1 sn geç / ani atlama · donma = > 500 ms donma · ses_gec / ses_yok = ses > 300 ms geç / hiç başlamadı · ses_kesildi = anlamlı ses yarıda kaldı (an: rol|faz|kesen, ms = kalan).\n'
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
end $function$;
