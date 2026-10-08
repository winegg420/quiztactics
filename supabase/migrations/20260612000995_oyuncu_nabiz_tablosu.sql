-- ============================================================
-- 995 · Oyuncu nabzı ayrı tabloda (1/2): tablo + okuyanlar
--       (Supabase Aşama 2 devamı, 8 Eki 2026)
--
-- NEDEN (ölçüm 8 Eki, canlı pg_stat_user_tables): profiles 15.326 güncelleme, yalnız 633 HOT
-- (%4). last_seen indeksli, tabloda 15 indeks + 13 tetikleyici → her nabız tüm indeksleri ve
-- tetikleyicileri çalıştırıyor. Düello/Kasa ekranı 10 sn'de bir kalp_at atıyor.
--
-- TASARIM:
--   * public.oyuncu_nabiz (user_id PK, son_gorulme) — UNLOGGED: WAL yazmaz; çökmede boşalır,
--     o an okuyanlar profiles.last_seen'e düşer (aşağıdaki greatest). Tek indeks (PK), son_gorulme
--     indekssiz → güncellemeler HOT olabilir.
--   * RLS açık, politika YOK, anon/authenticated'a hiçbir hak yok — yalnız security definer
--     fonksiyonlar erişir. Realtime yayınına EKLENMEDİ.
--   * nabiz_son(uid) = greatest(oyuncu_nabiz.son_gorulme, profiles.last_seen). GEÇİŞ GÜVENLİĞİ:
--     eski istemci/eski fonksiyon yalnız profiles'a yazsa da oyuncu kopmuş sayılmaz; greatest
--     NULL'ları yok sayar, ikisi de NULL ise sonuç NULL → karşılaştırma doğru değil → kopuk değil
--     (eski davranışla aynı).
--
-- DEĞİŞEN OKUYANLAR (eşikler AYNI: duello_kopuk_sn / kasa_kopuk_sn = 25, oyuncu_ara 2 dk):
--   duello_kopuk_kim, kasa_kopuk_kim, kasa_ilerlet (savunma kopukluk kontrolü), oyuncu_ara.
-- DEĞİŞMEYEN: OyuncuKarti istemciden profiles.last_seen okur (120 sn); 996'da profiles.last_seen
--   en geç ~60 sn'de bir yazılmaya devam eder → rozet etkilenmez.
--
-- GERİ ALMA: 996'yı geri al; bu dört fonksiyonun 991/önceki tanımlarını yeniden çalıştır;
--   drop function public.nabiz_son(uuid); drop table public.oyuncu_nabiz;
-- ============================================================

create unlogged table if not exists public.oyuncu_nabiz (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  son_gorulme timestamptz not null default now()
);
alter table public.oyuncu_nabiz enable row level security;
revoke all on table public.oyuncu_nabiz from public, anon, authenticated;

create or replace function public.nabiz_son(p_uid uuid)
 returns timestamptz
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(n.son_gorulme, p.last_seen)
    from public.profiles p
    left join public.oyuncu_nabiz n on n.user_id = p.id
   where p.id = p_uid;
$function$;
revoke all on function public.nabiz_son(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.duello_kopuk_kim(p_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id
    from public.duellolar d
    join public.profiles p on p.id in (d.oyuncu1, d.oyuncu2)
    left join public.oyuncu_nabiz n on n.user_id = p.id   -- 995
   where d.id = p_id
     and d.durum = 'aktif'
     and not coalesce(p.is_bot, false)
     and greatest(n.son_gorulme, p.last_seen) < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_sn', 25))
   order by greatest(n.son_gorulme, p.last_seen)
   limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.kasa_kopuk_kim(p_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id
    from public.kasa_maclari k
    join public.profiles p on p.id in (k.oyuncu1, k.oyuncu2)
    left join public.oyuncu_nabiz n on n.user_id = p.id   -- 995
   where k.id = p_id and k.durum = 'aktif'
     and not coalesce(p.is_bot, false)
     and greatest(n.son_gorulme, p.last_seen) < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 25))
   order by greatest(n.son_gorulme, p.last_seen)
   limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.oyuncu_ara(p_arama text)
 RETURNS TABLE(id uuid, username text, avatar_url text, puan integer, online boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.username,
    p.avatar_url,
    p.puan,
    (greatest(n.son_gorulme, p.last_seen) > now() - interval '2 minutes') as online
  from public.profiles p
  left join public.oyuncu_nabiz n on n.user_id = p.id   -- 995
  where p.id <> auth.uid()
    -- ESKİDEN: tüm botlar hariç. Gizli bot gerçek oyuncu gibi aranabilir.
    and not public.acik_bot_mu(p.is_bot, p.bot_turu)
    and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true))
    and length(coalesce(p_arama, '')) >= 2
    and p.username ilike '%' || p_arama || '%'
    and (
      public.hileli_mi()                                   -- admin: herkesi görür
      or greatest(n.son_gorulme, p.last_seen) > now() - interval '2 minutes'        -- normal: yalnız online
    )
  order by (greatest(n.son_gorulme, p.last_seen) > now() - interval '2 minutes') desc, p.username asc
  limit 20;
$function$;

-- kasa_ilerlet: canlı tanımın aynısı, yalnız savunma kopukluk satırı nabiz_son'a geçti (-- 995)
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
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('kasa_cevap_tolerans_sn', 1)), make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));   -- 991
  v_karar_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);   -- 991
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
          and public.nabiz_son(p.id) < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_sn', 25))) then   -- 995
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
      elsif now() >= k.faz_bitis + v_karar_pay then   -- 991: geç varan karar payı
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
                       or now() > public.kasa_oyuncu_bitis(k, (k.savunma ->> 'sahip')::uuid) + v_kapanis);
        perform public.kasa_savunma_cozumle(p_id, null);
        perform public.kasa_sinyal_ver(p_id);
        continue;
      end if;
      v_b1 := public.kasa_oyuncu_bitis(k, k.oyuncu1);
      v_b2 := public.kasa_oyuncu_bitis(k, k.oyuncu2);
      -- 991: cevaplamayan oyuncu için bitiş + geç varış payı beklenir; ikisi de cevapladıysa beklenmez
      exit when not ((k.cevaplar ? k.oyuncu1::text) or now() > v_b1 + v_kapanis)
             or not ((k.cevaplar ? k.oyuncu2::text) or now() > v_b2 + v_kapanis);
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
