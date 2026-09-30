-- 730 — Sezon Yolu TAŞMA ÖDÜLÜ (Ida isteği, 30 Eyl 2026). Sistem KAPALI kalır (sezon_yolu_acik=false).
-- 28. seviyenin eşiği geçildikten sonra her `sezon_tasma_sp` SP = 1 taşma ödülü (en çok `sezon_tasma_azami`):
--   n = least(azami, floor((sp - esik28) / tasma_sp)). İki kol: ücretsiz herkese, ücretli yalnız BP sahibine;
--   BP sonradan alınırsa önceki taşma ödüllerinin ücretli kolu da alınabilir (Al ile).
-- Ödül tablosu, SP değerleri, BP fiyatı, seviye sayısı, "28/28" ve final unvanı DEĞİŞMEZ.
-- Kayıt: ayrı tablo `oyuncu_bp_tasma_alimi` (yuva tablosundaki seviye kısıtı/placeholder tetikleyicisi ile karışmasın diye
--   oyuncu_bp_odul_alimi'ne yazılmaz). sezon_puani_ekle SP'yi kırpmıyor (yalnız seviye 28'de durur) → değişmedi.
-- Değerler TEST DEĞERİDİR; yayından önce yeniden bakılır.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('sezon_tasma_sp',              '100', 'Taşma ödülü: 28. seviyeden sonra her bu kadar SP = 1 ödül'),
  ('sezon_tasma_ucretsiz_coin',   '25',  'Taşma ödülü ücretsiz kol: coin (TEST)'),
  ('sezon_tasma_ucretli_coin',    '40',  'Taşma ödülü ücretli kol (BP): coin (TEST)'),
  ('sezon_tasma_azami',           '10',  'Bir sezonda kazanılabilecek en çok taşma ödülü')
on conflict (anahtar) do nothing;

create table if not exists public.oyuncu_bp_tasma_alimi (
  sezon     bigint not null references public.sezonlar(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  n         int not null check (n >= 1),
  kol       text not null check (kol in ('ucretsiz', 'ucretli')),
  miktar    int not null,                  -- alındığı andaki coin miktarı (geçmiş için)
  alindi_at timestamptz not null default now(),
  primary key (sezon, user_id, n, kol)
);
alter table public.oyuncu_bp_tasma_alimi enable row level security;
revoke all on public.oyuncu_bp_tasma_alimi from anon, authenticated;

-- Kazanılan taşma ödülü sayısı (iç)
create or replace function public.sezon_tasma_kazanilan(p_sezon bigint, p_user uuid)
 returns int language sql stable security definer set search_path to 'public'
as $$
  select case when coalesce(public.ayar_sayi('sezon_tasma_sp', 100), 0) <= 0 or p.sp is null
                   or p.sp < public.sezon_esik(public.ayar_sayi('sezon_seviye_sayisi', 28)::int) then 0
         else least(greatest(public.ayar_sayi('sezon_tasma_azami', 10)::int, 0),
                    ((p.sp - public.sezon_esik(public.ayar_sayi('sezon_seviye_sayisi', 28)::int))
                     / public.ayar_sayi('sezon_tasma_sp', 100)::int)::int) end
    from (select 1) d left join public.oyuncu_sezon_puani p on p.sezon = p_sezon and p.user_id = p_user;
$$;

-- Durum özeti (iç; sezon_yolu_durumum ve sezon_ozetim kullanır)
create or replace function public.sezon_tasma_bilgi(p_sezon bigint, p_user uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_sp int := coalesce((select sp from public.oyuncu_sezon_puani where sezon = p_sezon and user_id = p_user), 0);
  v_azami int := greatest(public.ayar_sayi('sezon_tasma_azami', 10)::int, 0);
  v_adim int := public.ayar_sayi('sezon_tasma_sp', 100)::int;
  v_kaz int := public.sezon_tasma_kazanilan(p_sezon, p_user);
  v_bp boolean := public.bp_aktif_mi(p_sezon, p_user);
  v_au int; v_al int;
begin
  select count(*) filter (where kol = 'ucretsiz'), count(*) filter (where kol = 'ucretli') into v_au, v_al
    from public.oyuncu_bp_tasma_alimi where sezon = p_sezon and user_id = p_user and n <= v_kaz;
  return jsonb_build_object(
    'acik', v_sp >= public.sezon_esik(v_max),
    'azami', v_azami,
    'kazanilan', v_kaz,
    'alinan_ucretsiz', v_au,
    'alinan_ucretli', v_al,
    'alinabilir_ucretsiz', v_kaz - v_au,
    'alinabilir_ucretli', case when v_bp then v_kaz - v_al else 0 end,
    'sonraki_icin_sp', case when v_kaz >= v_azami or v_adim <= 0 then null
                            else greatest(0, public.sezon_esik(v_max) + (v_kaz + 1) * v_adim - v_sp) end,
    'odul', jsonb_build_object(
      'ucretsiz', jsonb_build_object('tur', 'coin', 'miktar', public.ayar_sayi('sezon_tasma_ucretsiz_coin', 25)::int),
      'ucretli',  jsonb_build_object('tur', 'coin', 'miktar', public.ayar_sayi('sezon_tasma_ucretli_coin', 40)::int)));
end $$;

-- Tek taşma ödülünü ver (iç). Hak/BP kontrolü çağıranda. Döner: {n, kol, tur, miktar} (zaten alınmışsa null).
create or replace function public.bp_tasma_ver_ic(p_user uuid, p_sezon bigint, p_n int, p_kol text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_miktar int := public.ayar_sayi(case when p_kol = 'ucretli' then 'sezon_tasma_ucretli_coin' else 'sezon_tasma_ucretsiz_coin' end, 0)::int;
  v_k int;
begin
  insert into public.oyuncu_bp_tasma_alimi (sezon, user_id, n, kol, miktar) values (p_sezon, p_user, p_n, p_kol, v_miktar)
  on conflict do nothing;
  get diagnostics v_k = row_count;
  if v_k = 0 then return null; end if;
  if v_miktar > 0 then
    perform public.coin_ekle(p_user, v_miktar, 'sezon_yolu', 'sezon:' || p_sezon || ':tasma:' || p_n || ':' || p_kol);
  end if;
  return jsonb_build_object('n', p_n, 'kol', p_kol, 'tur', 'coin', 'miktar', v_miktar);
end $$;

-- Sıradaki alınmamış taşma ödülünü al
create or replace function public.bp_tasma_al(p_kol text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_kaz int;
  v_n int;
  v_odul jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('bp_tasma_al', 90, interval '60 seconds');
  if p_kol not in ('ucretsiz', 'ucretli') then raise exception 'Geçersiz kol'; end if;
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then raise exception 'Sezon Yolu şu an kapalı'; end if;
  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, v_me) on conflict do nothing;
  perform 1 from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me for update;   -- bp_odul_al ile aynı kilit
  if p_kol = 'ucretli' and not public.bp_aktif_mi(v_sezon, v_me) then raise exception 'Bu ödül Battle Pass''li'; end if;
  v_kaz := public.sezon_tasma_kazanilan(v_sezon, v_me);
  if v_kaz < 1 then raise exception 'Henüz taşma ödülü kazanmadın'; end if;
  select min(g) into v_n from generate_series(1, v_kaz) g
   where not exists (select 1 from public.oyuncu_bp_tasma_alimi a
                      where a.sezon = v_sezon and a.user_id = v_me and a.n = g and a.kol = p_kol);
  if v_n is null then raise exception 'Bu ödülü zaten aldın'; end if;
  v_odul := public.bp_tasma_ver_ic(v_me, v_sezon, v_n, p_kol);
  if v_odul is null then raise exception 'Bu ödülü zaten aldın'; end if;
  return jsonb_build_object('ok', true, 'n', v_n, 'kol', p_kol,
                            'odul', jsonb_build_object('tur', v_odul->>'tur', 'miktar', (v_odul->>'miktar')::int),
                            'tasma', public.sezon_tasma_bilgi(v_sezon, v_me));
end $$;

-- sezon_yolu_durumum: mevcut alanlar aynı, sonuna "tasma" eklendi
create or replace function public.sezon_yolu_durumum()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_s public.sezonlar;
  v_sp int := 0;
  v_seviye int := 0;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_bp public.oyuncu_bp_sahipligi;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_oduller jsonb;
  v_esikler jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then
    return jsonb_build_object('gorunur', false, 'acik', public.sezon_yolu_acik_mi());
  end if;
  select * into v_s from public.sezonlar where id = v_sezon;
  select sp, seviye into v_sp, v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me;
  v_sp := coalesce(v_sp, 0); v_seviye := coalesce(v_seviye, 0);
  select * into v_bp from public.oyuncu_bp_sahipligi where sezon = v_sezon and user_id = v_me;

  select jsonb_agg(public.sezon_esik(g) order by g) into v_esikler from generate_series(1, v_max) g;
  select coalesce(jsonb_agg(jsonb_build_object(
           'seviye', o.seviye, 'kol', o.kol, 'tur', o.tur, 'veri', o.veri, 'placeholder', o.placeholder,
           'ad_tr', o.ad_tr, 'ad_en', o.ad_en, 'nadirlik', o.nadirlik,
           'alindi', a.seviye is not null,
           'alinabilir', a.seviye is null and o.seviye <= v_seviye
                         and (o.kol = 'ucretsiz' or coalesce(v_bp.aktif, false)))
           order by o.seviye, o.kol), '[]'::jsonb)
    into v_oduller
    from public.bp_seviye_odulleri o
    left join public.oyuncu_bp_odul_alimi a
      on a.sezon = v_sezon and a.user_id = v_me and a.seviye = o.seviye and a.kol = o.kol
   where o.seviye <= v_max;

  return jsonb_build_object(
    'gorunur', true,
    'acik', public.sezon_yolu_acik_mi(),
    'test', v_s.test,
    'sahip', public.sahip_kullanici_mi(v_me),
    'sezon', jsonb_build_object('id', v_s.id, 'no', v_s.no, 'baslangic', v_s.baslangic, 'bitis', v_s.bitis,
                                'kalan_gun', greatest(0, ceil(extract(epoch from (v_s.bitis - now())) / 86400.0))::int),
    'sp', v_sp, 'seviye', v_seviye, 'seviye_sayisi', v_max,
    'esikler', v_esikler,
    'sonraki_esik', case when v_seviye >= v_max then null else public.sezon_esik(v_seviye + 1) end,
    'onceki_esik', public.sezon_esik(v_seviye),
    'bp', jsonb_build_object('aktif', coalesce(v_bp.aktif, false), 'satin_alma_at', v_bp.satin_alma_at,
                             'fiyat', public.ayar_sayi('bp_fiyat_elmas', 500),
                             'sp_carpan', public.ayar_ondalik('bp_sp_carpan', 1.25)),
    'elmas', (select elmas from public.profiles where id = v_me),
    'oduller', v_oduller,
    'bonus_gorev', jsonb_build_object(
      'hedef', public.ayar_sayi('bp_bonus_gorev_hedef', 2),
      'ilerleme', least(public.gorev_sayaci('mac_oyna_3', v_me, v_bugun), public.ayar_sayi('bp_bonus_gorev_hedef', 2)),
      'sp', public.ayar_sayi('sp_bp_bonus_gorev', 20),
      'alindi', exists (select 1 from public.sezon_bonus_gorev b where b.user_id = v_me and b.tarih = v_bugun)),
    'final_unvan', (select jsonb_build_object('anahtar', t.anahtar, 'ad_tr', t.ad_tr, 'ad_en', t.ad_en,
                                              'kazanildi', exists (select 1 from public.oyuncu_unvanlari u where u.user_id = v_me and u.unvan = t.anahtar))
                      from public.unvan_tanimlari t where t.anahtar = v_s.final_unvan),
    'bugun_mac_sp', coalesce((select sum(h.taban) from public.sezon_puan_hareketleri h
                               where h.user_id = v_me and h.sezon = v_sezon and h.kaynak in ('mac', 'duello')
                                 and (h.created_at at time zone 'Europe/Istanbul')::date = v_bugun), 0),
    'gunluk_mac_tavan', public.ayar_sayi('sp_gunluk_mac_tavan', 150),
    'tasma', public.sezon_tasma_bilgi(v_sezon, v_me)
  );
end $$;

-- sezon_ozetim: "alinabilir" taşma ödüllerini de sayar
create or replace function public.sezon_ozetim()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_sp int := 0; v_seviye int := 0;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_bp boolean;
begin
  if v_me is null then return jsonb_build_object('gorunur', false); end if;
  v_sezon := public.sezon_gecerli(v_me);
  if v_sezon is null then
    -- sahip test sezonu henüz yoksa da rozet görünsün (sayfa açılınca sezon kurulur)
    return jsonb_build_object('gorunur', public.sezon_yolu_acik_mi() or public.sahip_kullanici_mi(v_me),
                              'seviye', 0, 'sp', 0, 'onceki_esik', 0, 'sonraki_esik', public.sezon_esik(1),
                              'bp', false, 'alinabilir', 0);
  end if;
  select sp, seviye into v_sp, v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me;
  v_sp := coalesce(v_sp, 0); v_seviye := coalesce(v_seviye, 0);
  v_bp := public.bp_aktif_mi(v_sezon, v_me);
  return jsonb_build_object(
    'gorunur', true, 'sezon', v_sezon, 'seviye', v_seviye, 'seviye_sayisi', v_max, 'sp', v_sp,
    'onceki_esik', public.sezon_esik(v_seviye),
    'sonraki_esik', case when v_seviye >= v_max then null else public.sezon_esik(v_seviye + 1) end,
    'bp', v_bp,
    'alinabilir', (select count(*) from public.bp_seviye_odulleri o
                    where o.seviye <= v_seviye and (o.kol = 'ucretsiz' or v_bp)
                      and not exists (select 1 from public.oyuncu_bp_odul_alimi a
                                       where a.sezon = v_sezon and a.user_id = v_me and a.seviye = o.seviye and a.kol = o.kol))
                  + (public.sezon_tasma_bilgi(v_sezon, v_me)->>'alinabilir_ucretsiz')::int
                  + (public.sezon_tasma_bilgi(v_sezon, v_me)->>'alinabilir_ucretli')::int);
end $$;

-- bp_toplu_al: dönüşe "tasma_verilen" eklendi ({n, kol, tur, miktar} dizisi)
create or replace function public.bp_toplu_al()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_seviye int;
  v_bp boolean;
  v_odul jsonb;
  v_verilen jsonb := '[]'::jsonb;
  v_tasma jsonb := '[]'::jsonb;
  v_kaz int;
  g int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('bp_toplu_al', 20, interval '60 seconds');
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then raise exception 'Sezon Yolu şu an kapalı'; end if;
  insert into public.oyuncu_sezon_puani (sezon, user_id) values (v_sezon, v_me) on conflict do nothing;
  select seviye into v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me for update;
  v_bp := public.bp_aktif_mi(v_sezon, v_me);
  for g in 1..coalesce(v_seviye, 0) loop
    v_odul := public.bp_odul_ver_ic(v_me, v_sezon, g, 'ucretsiz');
    if v_odul is not null then v_verilen := v_verilen || v_odul; end if;
    if v_bp then
      v_odul := public.bp_odul_ver_ic(v_me, v_sezon, g, 'ucretli');
      if v_odul is not null then v_verilen := v_verilen || v_odul; end if;
    end if;
  end loop;
  -- 730: taşma ödülleri (yuva ödüllerinden ayrı anahtar; 'verilen' yapısı değişmez)
  v_kaz := public.sezon_tasma_kazanilan(v_sezon, v_me);
  for g in 1..v_kaz loop
    v_odul := public.bp_tasma_ver_ic(v_me, v_sezon, g, 'ucretsiz');
    if v_odul is not null then v_tasma := v_tasma || v_odul; end if;
    if v_bp then
      v_odul := public.bp_tasma_ver_ic(v_me, v_sezon, g, 'ucretli');
      if v_odul is not null then v_tasma := v_tasma || v_odul; end if;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'verilen', v_verilen, 'tasma_verilen', v_tasma);
end $$;

-- sezon_kapat: taşma ödülleri de otomatik verilir
create or replace function public.sezon_kapat(p_sezon bigint)
 returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare
  v_s public.sezonlar;
  r record;
  g int;
  n int;
begin
  select * into v_s from public.sezonlar where id = p_sezon for update;
  if v_s.id is null or v_s.kapandi_at is not null then return false; end if;
  for r in select p.user_id, p.seviye, public.bp_aktif_mi(p_sezon, p.user_id) as bp
             from public.oyuncu_sezon_puani p where p.sezon = p_sezon and p.seviye > 0 loop
    for g in 1..r.seviye loop
      perform public.bp_odul_ver_ic(r.user_id, p_sezon, g, 'ucretsiz');
      if r.bp then perform public.bp_odul_ver_ic(r.user_id, p_sezon, g, 'ucretli'); end if;
    end loop;
    -- 730: alınmamış taşma ödülleri de aynı kuralla (ücretsiz herkese, ücretli BP'liye)
    for n in 1..public.sezon_tasma_kazanilan(p_sezon, r.user_id) loop
      perform public.bp_tasma_ver_ic(r.user_id, p_sezon, n, 'ucretsiz');
      if r.bp then perform public.bp_tasma_ver_ic(r.user_id, p_sezon, n, 'ucretli'); end if;
    end loop;
    if r.bp then perform public.sezon_final_kontrol(p_sezon, r.user_id); end if;
  end loop;
  update public.oyuncu_bp_sahipligi set aktif = false, kapandi_at = now() where sezon = p_sezon and aktif;
  update public.sezonlar set kapandi_at = now() where id = p_sezon;
  return true;
end $$;

-- sezon_sahip_test_sifirla: taşma kayıtlarını da siler
create or replace function public.sezon_sahip_test_sifirla()
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_fiyat int;
begin
  if not public.sahip_mi() then raise exception 'Yalnız sahip'; end if;
  if public.sezon_yolu_acik_mi() then raise exception 'Sistem açıkken test sıfırlanmaz'; end if;
  select id into v_sezon from public.sezonlar where test and kapandi_at is null;
  if v_sezon is null then return jsonb_build_object('ok', true); end if;
  select fiyat_elmas into v_fiyat from public.oyuncu_bp_sahipligi where sezon = v_sezon and user_id = v_me;
  if v_fiyat is not null then
    perform public.elmas_ekle(v_me, v_fiyat, 'battle_pass_test_iade', 'sezon:' || v_sezon || ':' || clock_timestamp()::text);
  end if;
  delete from public.oyuncu_bp_sahipligi   where sezon = v_sezon and user_id = v_me;
  delete from public.oyuncu_bp_odul_alimi  where sezon = v_sezon and user_id = v_me;
  delete from public.oyuncu_bp_tasma_alimi where sezon = v_sezon and user_id = v_me;
  delete from public.sezon_puan_hareketleri where sezon = v_sezon and user_id = v_me;
  delete from public.sezon_bonus_gorev     where sezon = v_sezon and user_id = v_me;
  delete from public.oyuncu_sezon_puani    where sezon = v_sezon and user_id = v_me;
  return jsonb_build_object('ok', true);
end $$;

-- yetkiler: yeni iç fonksiyonlar istemciye kapalı; bp_tasma_al yalnız authenticated (mevcut Sezon Yolu düzeni)
do $$
declare f text;
begin
  foreach f in array array['sezon_tasma_kazanilan(bigint, uuid)', 'sezon_tasma_bilgi(bigint, uuid)', 'bp_tasma_ver_ic(uuid, bigint, int, text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
  revoke all on function public.bp_tasma_al(text) from public, anon;
  grant execute on function public.bp_tasma_al(text) to authenticated, service_role;
end $$;
