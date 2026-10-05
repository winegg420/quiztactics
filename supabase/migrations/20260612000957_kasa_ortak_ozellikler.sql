-- 957: KASA artık oyunun parçası — öteki modlardaki ortak özellikler Kasa'ya bağlanır (Ida, 5 Eki 2026:
-- "Kasa modu da oyunun bir parçası. Onu ayrı tutma.").
--
-- 1) ARKADAŞA MEYDAN OKUMA: kasa_davet_et / kasa_davet_cevap / kasa_davet_iptal (950) zaten vardı ama ortak davet
--    zincirine bağlı değildi. Ortak fonksiyonlara 'kasa' dalı eklenir (Düello dalıyla aynı biçim):
--    bekleyen_davetlerim (davet bandı / meydan sayfası), gonderdigim_davetler + davet_geri_cek (gönderdiklerim),
--    davet_cakismasi (bekleyen/aktif sınırları), oyuncu_engelle (engelleme bekleyen Kasa davetini iptal eder),
--    bildirim_yaz (push başlığı 'kasa_daveti' / 'kasa_kabul'). kasa_davetleri Realtime yayınına eklenir
--    (Ida onayı 5 Eki 2026; mevcut "yalnız kendi satırı" politikası DEĞİŞMEZ).
-- 2) RÖVANŞ (Düello ile aynı): kasa_maclari.rovans_isteyen / rovans_at / rovans_id / onceki_id;
--    kasa_rovans_iste / kasa_rovans_yanitla / kasa_rovans_iptal (authenticated — Ida onayı) + iç kasa_rovans_baslat.
--    İstek ayar kasa_rovans_sn (60) içinde geçerli; maç bitişinden 24 saat sonra istenemez; engelli çift istek atamaz;
--    bota gelen istek hemen kabul edilir (Kasa cron'u 30 sn — Düello'daki gibi tik'e bırakılmaz).
--    kasa_durum: 'rovans' {isteyen, id, gecerli} + 'ezeli' (arkadaşla bitmiş Kasa maçlarında galibiyet sayısı).
-- 3) TEPKİ (emoji): tepki_kanal_uyesi_mi / tepki_mac_modu / tepki_durumu 'kasa' (kanal 'tepki-kasa-<id>'; yalnız o maçın
--    iki oyuncusu, engelli çift hariç — Klasik/Düello kuralı; Ida onayı). Açık modlar listesi (tepki_acik_modlar) değişmez.
-- 4) Kategori ustalığı + soru istatistiği: kasa_cozumle doğru cevapta kategori_dogru_arttir, her cevapta soru_sayac
--    (Düello'daki gibi). Kasa kuralı (kasa/sahip/puan) DEĞİŞMEZ.
-- 5) Gizli bot nabzı: aktif Kasa maçındaki gizli bot çevrimiçi görünür (gizli_bot_nabiz).
-- Kasa kuralları, ödüller, Klasik/Düello davranışı DEĞİŞMEZ. GERİ ALMA: docs/kasa-geri-alma-957.sql.

-- 1a) Bekleyen davetlerim (davet bandı, Meydan sayfası) + Kasa
CREATE OR REPLACE FUNCTION public.bekleyen_davetlerim()
 RETURNS TABLE(tur text, kayit_id uuid, davet_eden uuid, gorunen_ad text, gorunen_avatar text, kategori text, kisi_sayisi integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    case when m.rovans then 'rovans' else 'mac' end,
    m.id, m.oyuncu1, p.gorunen_ad, p.gorunen_avatar, m.kategori, 2, m.created_at
  from public.matches m
  join public.profiles p on p.id = m.oyuncu1
  where m.oyuncu2 = auth.uid()
    and m.durum = 'bekliyor'
    and not coalesce(p.is_bot, false)

  union all

  select
    'grup', g.id, g.kurucu, p.gorunen_ad, p.gorunen_avatar, g.kategori,
    g.oyuncu_sayisi, gp.joined_at
  from public.group_match_players gp
  join public.group_matches g on g.id = gp.group_match_id
  join public.profiles p on p.id = g.kurucu
  where gp.user_id = auth.uid()
    and gp.davet_durumu = 'bekliyor'
    and g.durum in ('lobi', 'bekliyor')

  union all

  select
    'hizli', h.id, h.kurucu, p.gorunen_ad, p.gorunen_avatar, h.kategori,
    h.oyuncu_sayisi, ho.joined_at
  from public.hizli_oyuncular ho
  join public.hizli_maclar h on h.id = ho.hizli_mac_id
  join public.profiles p on p.id = h.kurucu
  where ho.user_id = auth.uid()
    and ho.davet_durumu = 'bekliyor'
    and h.durum in ('lobi', 'bekliyor')

  union all

  -- Düello daveti (Paket 24). kayit_id = duello_davetleri.id — cevap RPC'si bunu bekler.
  select
    'duello', dd.id, dd.kuran, p.gorunen_ad, p.gorunen_avatar, null::text, 2, dd.created_at
  from public.duello_davetleri dd
  join public.profiles p on p.id = dd.kuran
  where dd.rakip = auth.uid()
    and dd.durum = 'bekliyor'
    and not coalesce(p.is_bot, false)

  union all

  -- 957: Kasa daveti. kayit_id = kasa_davetleri.id — kasa_davet_cevap(p_id) bunu bekler.
  select
    'kasa', kd.id, kd.kuran, p.gorunen_ad, p.gorunen_avatar, null::text, 2, kd.created_at
  from public.kasa_davetleri kd
  join public.profiles p on p.id = kd.kuran
  where kd.rakip = auth.uid()
    and kd.durum = 'bekliyor'
    and kd.created_at > now() - interval '24 hours'
    and not coalesce(p.is_bot, false)

  order by 8 desc
  limit 20;
$function$
;

-- 1b) Gönderdiğim davetler + Kasa
CREATE OR REPLACE FUNCTION public.gonderdigim_davetler()
 RETURNS TABLE(tur text, kayit_id uuid, rakip uuid, gorunen_ad text, gorunen_avatar text, kategori text, bekleyen_sayisi integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    case when m.rovans then 'rovans' else 'mac' end,
    m.id, m.oyuncu2, p.gorunen_ad, p.gorunen_avatar, m.kategori, 1, m.created_at
  from public.matches m
  join public.profiles p on p.id = m.oyuncu2
  where m.oyuncu1 = auth.uid()
    and m.durum = 'bekliyor'
    and not coalesce(p.is_bot, false)

  union all

  select
    'grup', g.id, null::uuid, null::text, null::text, g.kategori,
    (select count(*)::int from public.group_match_players x
      where x.group_match_id = g.id and x.davet_durumu = 'bekliyor'),
    g.created_at
  from public.group_matches g
  where g.kurucu = auth.uid()
    and g.durum in ('lobi', 'bekliyor')
    and exists (
      select 1 from public.group_match_players gp
      join public.profiles pp on pp.id = gp.user_id
      where gp.group_match_id = g.id
        and gp.davet_durumu = 'bekliyor'
        and not coalesce(pp.is_bot, false)
    )

  union all

  select
    'hizli', h.id, null::uuid, null::text, null::text, h.kategori,
    (select count(*)::int from public.hizli_oyuncular x
      where x.hizli_mac_id = h.id and x.davet_durumu = 'bekliyor'),
    h.created_at
  from public.hizli_maclar h
  where h.kurucu = auth.uid()
    and h.durum in ('lobi', 'bekliyor')
    and exists (
      select 1 from public.hizli_oyuncular ho
      join public.profiles pp on pp.id = ho.user_id
      where ho.hizli_mac_id = h.id
        and ho.davet_durumu = 'bekliyor'
        and not coalesce(pp.is_bot, false)
    )

  union all

  -- Düello: ben davet ettim, rakip henüz cevaplamadı (açık bot anında kabul eder, listede görünmez)
  select
    'duello', dd.id, dd.rakip, p.gorunen_ad, p.gorunen_avatar, null::text, 1, dd.created_at
  from public.duello_davetleri dd
  join public.profiles p on p.id = dd.rakip
  where dd.kuran = auth.uid()
    and dd.durum = 'bekliyor'
    and not coalesce(p.is_bot, false)

  union all

  -- 957: Kasa — ben davet ettim, rakip henüz cevaplamadı (açık bot anında kabul eder, listede görünmez)
  select
    'kasa', kd.id, kd.rakip, p.gorunen_ad, p.gorunen_avatar, null::text, 1, kd.created_at
  from public.kasa_davetleri kd
  join public.profiles p on p.id = kd.rakip
  where kd.kuran = auth.uid()
    and kd.durum = 'bekliyor'
    and kd.created_at > now() - interval '24 hours'
    and not coalesce(p.is_bot, false)

  order by 8 desc
  limit 20;
$function$
;

-- 1c) Daveti geri çek + Kasa
CREATE OR REPLACE FUNCTION public.davet_geri_cek(p_tur text, p_kayit_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  m public.matches%rowtype;
  v_yol text;
  v_rakip uuid;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('davet_geri_cek', 30, interval '60 seconds');

  if p_tur in ('mac', 'rovans') then
    select * into m from public.matches where id = p_kayit_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if m.oyuncu1 <> v_me then raise exception 'Bu daveti sen göndermedin'; end if;
    if m.durum <> 'bekliyor' then raise exception 'Davet artık beklemede değil'; end if;

    update public.matches
       set durum = 'iptal', kazanan = null, bitis = now()
     where id = p_kayit_id;

    v_yol := '/bildim/mac/' || p_kayit_id::text;
    delete from public.bildirimler
     where user_id = m.oyuncu2 and not okundu and yol = v_yol;
    return true;

  elsif p_tur = 'grup' then
    if not exists (
      select 1 from public.group_matches
       where id = p_kayit_id and kurucu = v_me and durum = 'bekliyor'
    ) then
      raise exception 'Davet artık beklemede değil';
    end if;
    update public.group_matches set durum = 'iptal' where id = p_kayit_id;
    v_yol := '/bildim/grup/' || p_kayit_id::text;
    delete from public.bildirimler
     where not okundu and yol = v_yol
       and user_id in (
         select user_id from public.group_match_players
          where group_match_id = p_kayit_id and davet_durumu = 'bekliyor'
       );
    return true;

  elsif p_tur = 'hizli' then
    if not exists (
      select 1 from public.hizli_maclar
       where id = p_kayit_id and kurucu = v_me and durum = 'bekliyor'
    ) then
      raise exception 'Davet artık beklemede değil';
    end if;
    update public.hizli_maclar set durum = 'iptal' where id = p_kayit_id;
    v_yol := '/bildim/hizli/' || p_kayit_id::text;
    delete from public.bildirimler
     where not okundu and yol = v_yol
       and user_id in (
         select user_id from public.hizli_oyuncular
          where hizli_mac_id = p_kayit_id and davet_durumu = 'bekliyor'
       );
    return true;

  elsif p_tur = 'duello' then
    -- p_kayit_id = duello_davetleri.id (bekleyen_davetlerim/gonderdigim_davetler ile aynı)
    select rakip into v_rakip from public.duello_davetleri
     where id = p_kayit_id and kuran = v_me and durum = 'bekliyor' for update;
    if v_rakip is null then raise exception 'Davet artık beklemede değil'; end if;

    update public.duello_davetleri
       set durum = 'iptal', yanit_at = now()
     where id = p_kayit_id;

    v_yol := '/bildim/duello';
    delete from public.bildirimler
     where user_id = v_rakip and not okundu and tip = 'duello_daveti' and yol = v_yol;
    return true;

  elsif p_tur = 'kasa' then
    -- 957: p_kayit_id = kasa_davetleri.id
    select rakip into v_rakip from public.kasa_davetleri
     where id = p_kayit_id and kuran = v_me and durum = 'bekliyor' for update;
    if v_rakip is null then raise exception 'Davet artık beklemede değil'; end if;

    update public.kasa_davetleri
       set durum = 'iptal', yanit_at = now()
     where id = p_kayit_id;

    v_yol := '/bildim/kasa';
    delete from public.bildirimler
     where user_id = v_rakip and not okundu and tip = 'kasa_daveti' and yol = v_yol;
    return true;
  end if;

  raise exception 'Bilinmeyen davet türü: %', p_tur;
end;
$function$
;

-- 1d) Davet çakışması (bekleyen sınırı / aktif oyun) + Kasa
CREATE OR REPLACE FUNCTION public.davet_cakismasi(p_ben uuid, p_rakip uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with kaynak as (
    -- 1v1 meydan okuma / rövanş
    select 'mac'::text mod, (m.durum = 'bekliyor') bekleyen, (m.durum = 'aktif') aktif
      from public.matches m
     where m.durum in ('bekliyor', 'aktif')
       and ((m.oyuncu1 = p_ben and m.oyuncu2 = p_rakip) or (m.oyuncu1 = p_rakip and m.oyuncu2 = p_ben))

    union all

    -- Grup maçı: ikimiz de aynı grupta mıyız?
    select 'grup', (g.durum in ('bekliyor', 'lobi')), (g.durum = 'aktif')
      from public.group_matches g
     where g.durum in ('bekliyor', 'lobi', 'aktif')
       and exists (select 1 from public.group_match_players a
                    where a.group_match_id = g.id and a.user_id = p_ben and a.davet_durumu <> 'red')
       and exists (select 1 from public.group_match_players b
                    where b.group_match_id = g.id and b.user_id = p_rakip and b.davet_durumu <> 'red')

    union all

    -- "Hızlı Olan Kazanır" (dondurulmuş mod — eski kayıtlar için sayılır)
    select 'hizli', (h.durum in ('bekliyor', 'lobi')), (h.durum = 'aktif')
      from public.hizli_maclar h
     where h.durum in ('bekliyor', 'lobi', 'aktif')
       and exists (select 1 from public.hizli_oyuncular a
                    where a.hizli_mac_id = h.id and a.user_id = p_ben and a.davet_durumu <> 'red')
       and exists (select 1 from public.hizli_oyuncular b
                    where b.hizli_mac_id = h.id and b.user_id = p_rakip and b.davet_durumu <> 'red')

    union all

    -- Düello daveti (bekleyen) — kabul edilmişse aktif düello alt sorguda sayılır
    select 'duello', true, false
      from public.duello_davetleri dd
     where dd.durum = 'bekliyor'
       and ((dd.kuran = p_ben and dd.rakip = p_rakip) or (dd.kuran = p_rakip and dd.rakip = p_ben))

    union all

    -- Aktif düello
    select 'duello', false, true
      from public.duellolar d
     where d.durum = 'aktif'
       and ((d.oyuncu1 = p_ben and d.oyuncu2 = p_rakip) or (d.oyuncu1 = p_rakip and d.oyuncu2 = p_ben))

    union all

    -- 957: Kasa daveti (bekleyen, 24 saatten yeni)
    select 'kasa', true, false
      from public.kasa_davetleri kd
     where kd.durum = 'bekliyor' and kd.created_at > now() - interval '24 hours'
       and ((kd.kuran = p_ben and kd.rakip = p_rakip) or (kd.kuran = p_rakip and kd.rakip = p_ben))

    union all

    -- 957: aktif Kasa maçı
    select 'kasa', false, true
      from public.kasa_maclari k
     where k.durum = 'aktif'
       and ((k.oyuncu1 = p_ben and k.oyuncu2 = p_rakip) or (k.oyuncu1 = p_rakip and k.oyuncu2 = p_ben))
  )
  select jsonb_build_object(
    'bekleyen', coalesce(count(*) filter (where bekleyen), 0)::int,
    'aktif', coalesce(bool_or(aktif), false),
    'modlar', coalesce((select array_agg(distinct k.mod) from kaynak k where k.bekleyen), '{}'::text[]),
    'aktif_mod', (select k.mod from kaynak k where k.aktif limit 1)
  )
  from kaynak;
$function$
;

-- 1e) Engelleme bekleyen Kasa davetini de iptal eder
CREATE OR REPLACE FUNCTION public.oyuncu_engelle(p_kisi uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('oyuncu_engelle', 20, interval '60 seconds');
  if p_kisi is null or p_kisi = v_me then raise exception 'Kendini engelleyemezsin'; end if;
  if not exists (select 1 from public.profiles where id = p_kisi) then raise exception 'Oyuncu bulunamadı'; end if;
  insert into public.engellemeler (engelleyen, engellenen) values (v_me, p_kisi) on conflict do nothing;
  -- Engelleme arkadaşlığı ve bekleyen davetleri bitirir (eski mesajlar okunabilir kalır)
  delete from public.friendships f
   where (f.requester = v_me and f.addressee = p_kisi) or (f.requester = p_kisi and f.addressee = v_me);
  update public.duello_davetleri set durum = 'iptal', yanit_at = now()
   where durum = 'bekliyor' and ((kuran = v_me and rakip = p_kisi) or (kuran = p_kisi and rakip = v_me));
  -- 957: bekleyen Kasa daveti de biter
  update public.kasa_davetleri set durum = 'iptal', yanit_at = now()
   where durum = 'bekliyor' and ((kuran = v_me and rakip = p_kisi) or (kuran = p_kisi and rakip = v_me));
  update public.matches set durum = 'reddedildi'
   where durum = 'bekliyor' and ((oyuncu1 = v_me and oyuncu2 = p_kisi) or (oyuncu1 = p_kisi and oyuncu2 = v_me));
  return jsonb_build_object('engellendi', true);
end;
$function$
;

-- 1f) Push başlığı: Kasa daveti / kabul
CREATE OR REPLACE FUNCTION public.bildirim_yaz(p_user uuid, p_tip text, p_metin text, p_yol text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_bot boolean;
  v_baslik text;
begin
  if p_user is null then return; end if;

  select coalesce(is_bot, false) into v_bot from public.profiles where id = p_user;
  if coalesce(v_bot, false) then return; end if;

  insert into public.bildirimler (user_id, tip, metin, yol)
  values (p_user, p_tip, p_metin, p_yol);

  v_baslik := case p_tip
    when 'mac_daveti'      then '⚔️ Meydan okuma!'
    when 'meydan_kabul'    then '🔥 Meydan okuman kabul edildi!'
    when 'rovans'          then '⚔️ Rövanş isteği'
    when 'grup_daveti'     then '👥 Grup maçı daveti'
    when 'grup_kabul'      then '👥 Grup maçın başlıyor!'
    when 'hizli_daveti'    then '⚡ Hızlı maç daveti'
    when 'duello_daveti'   then '⚔️ Düello daveti'
    when 'duello_kabul'    then '🔥 Düello kabul edildi'
    when 'kasa_daveti'     then '💰 Kasa daveti'
    when 'kasa_kabul'      then '🔥 Kasa daveti kabul edildi'
    when 'sira_sende'      then '⏳ Sıra sende!'
    when 'arkadas_istek'   then '🤝 Arkadaşlık isteği'
    when 'arkadas_kabul'   then '🎉 Yeni arkadaş'
    when 'gecildin'        then '⚡ Sıran düştü'
    when 'hafta_sonuc'     then '🏆 Hafta bitti'
    when 'ustalik'         then '🎖️ Ustalık'
    when 'seri'            then '🔥 Serin'
    when 'lige_girdin'     then '🏙️ Ligdesin'
    else 'Quiz Tactics'
  end;

  begin
    perform net.http_post(
      url := 'https://zfpnxzybcpkxsotwdsey.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'x-cron-secret', public.gizli_al('cron_secret'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_ids', jsonb_build_array(p_user),
        'baslik', v_baslik,
        'govde', p_metin,
        'url', coalesce(p_yol, '/bildim')
      )
    );
  exception when others then
    null;
  end;
end;
$function$
;

-- 1g) Realtime: davet anında düşsün (Ida onayı 5 Eki 2026). Okuma politikası kasa_davetleri_select_own (950) aynı kalır.
do $$ begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kasa_davetleri') then
    alter publication supabase_realtime add table public.kasa_davetleri;
  end if;
end $$;

-- 2a) RÖVANŞ — şema + ayar
alter table public.kasa_maclari add column if not exists rovans_isteyen uuid references public.profiles(id) on delete set null;
alter table public.kasa_maclari add column if not exists rovans_at timestamptz;
alter table public.kasa_maclari add column if not exists rovans_id uuid references public.kasa_maclari(id) on delete set null;
alter table public.kasa_maclari add column if not exists onceki_id uuid references public.kasa_maclari(id) on delete set null;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_rovans_sn', '60'::jsonb, 'KASA: rövanş isteğinin geçerlilik süresi sn (957; Düello duello_rovans_sn ile aynı).')
on conflict (anahtar) do nothing;

-- 2b) İç: rövanş maçını kur (oyuncular ve dereceli/serbest aynı; davetli = bağlanma iptali yok)
create or replace function public.kasa_rovans_baslat(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_yeni uuid;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if k.rovans_id is not null then return k.rovans_id; end if;
  if exists (select 1 from public.kasa_maclari x where x.durum = 'aktif'
               and (x.oyuncu1 in (k.oyuncu1, k.oyuncu2) or x.oyuncu2 in (k.oyuncu1, k.oyuncu2))) then
    raise exception 'Oyunculardan birinin devam eden Kasa maçı var';
  end if;
  v_yeni := public.kasa_olustur(k.oyuncu2, k.oyuncu1, k.dereceli, true);
  update public.kasa_maclari set onceki_id = p_id where id = v_yeni;
  update public.kasa_maclari set rovans_id = v_yeni where id = p_id;
  perform public.kasa_sinyal_ver(p_id);
  return v_yeni;
end $$;

-- 2c) Rövanş iste (bota istek hemen kabul edilir → yeni maç id döner; insana null döner, karşı taraf yanıtlar)
create or replace function public.kasa_rovans_iste(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
begin
  perform public.hiz_siniri('kasa_rovans', 30, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  if k.durum <> 'bitti' then raise exception 'Maç henüz bitmedi'; end if;
  if k.rovans_id is not null then return k.rovans_id; end if;
  if coalesce(k.bitis, k.son_hareket) < now() - interval '24 hours' then raise exception 'Rövanş süresi doldu'; end if;
  v_rakip := case when k.oyuncu1 = v_me then k.oyuncu2 else k.oyuncu1 end;
  if public.iletisim_engelli(v_me, v_rakip) then raise exception 'Bu oyuncuyla oynayamazsın'; end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  update public.kasa_maclari set rovans_isteyen = v_me, rovans_at = now() where id = p_id;
  perform public.kasa_sinyal_ver(p_id);
  if exists (select 1 from public.profiles p where p.id = v_rakip and coalesce(p.is_bot, false)) then
    perform public.mac_kotasi_kontrol();
    return public.kasa_rovans_baslat(p_id);
  end if;
  return null;
end $$;

-- 2d) Rövanşı yanıtla (kabul → yeni maç id)
create or replace function public.kasa_rovans_yanitla(p_id uuid, p_kabul boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare k public.kasa_maclari%rowtype;
begin
  perform public.hiz_siniri('kasa_rovans', 30, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  if k.rovans_isteyen is null or k.rovans_isteyen = auth.uid() then raise exception 'Yanıtlanacak rövanş yok'; end if;
  if k.rovans_id is not null then return k.rovans_id; end if;
  if k.rovans_at < now() - make_interval(secs => public.ayar_sayi('kasa_rovans_sn', 60)) then
    raise exception 'Rövanş isteğinin süresi doldu';
  end if;
  if not coalesce(p_kabul, false) then
    update public.kasa_maclari set rovans_isteyen = null, rovans_at = null where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
    return null;
  end if;
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  perform public.mac_kotasi_kontrol();
  return public.kasa_rovans_baslat(p_id);
end $$;

-- 2e) Rövanş isteğini geri çek (Vazgeç)
create or replace function public.kasa_rovans_iptal(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare k public.kasa_maclari%rowtype;
begin
  perform public.hiz_siniri('kasa_rovans', 30, interval '60 seconds');
  k := public.kasa_kilitle(p_id);
  if k.rovans_id is not null then raise exception 'Rövanş zaten başladı'; end if;
  if k.rovans_isteyen is distinct from auth.uid() then raise exception 'Geri çekilecek rövanş isteği yok'; end if;
  update public.kasa_maclari set rovans_isteyen = null, rovans_at = null where id = p_id;
  perform public.kasa_sinyal_ver(p_id);
end $$;

-- 2f) Durum: rövanş + ezeli
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
end $function$
;

-- 3a) Tepki özel kanalı: tepki-kasa-<id> (Ida onayı 5 Eki 2026)
CREATE OR REPLACE FUNCTION public.tepki_kanal_uyesi_mi(p_konu text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_parca text[];
  v_id uuid;
begin
  if v_me is null or p_konu is null then return false; end if;
  v_parca := regexp_match(p_konu, '^tepki-(mac|duello|kasa)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
  if v_parca is null then return false; end if;
  v_id := v_parca[2]::uuid;
  if v_parca[1] = 'mac' then
    return exists (select 1 from public.matches m where m.id = v_id and v_me in (m.oyuncu1, m.oyuncu2)
                    and not public.iletisim_engelli(m.oyuncu1, m.oyuncu2));   -- 620: engelli çift tepki alışverişi yapamaz
  end if;
  if v_parca[1] = 'kasa' then   -- 957
    return exists (select 1 from public.kasa_maclari k where k.id = v_id and v_me in (k.oyuncu1, k.oyuncu2)
                    and not public.iletisim_engelli(k.oyuncu1, k.oyuncu2));
  end if;
  return exists (select 1 from public.duellolar d where d.id = v_id and v_me in (d.oyuncu1, d.oyuncu2)
                  and not public.iletisim_engelli(d.oyuncu1, d.oyuncu2));   -- 620
end;
$function$
;

-- 3b) Tepki modu: kasa
CREATE OR REPLACE FUNCTION public.tepki_mac_modu(p_mac_tur text, p_mac_id uuid, p_ben uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_o1 uuid; v_o2 uuid; v_rakip uuid;
begin
  if p_mac_tur = 'klasik' then
    select m.oyuncu1, m.oyuncu2 into v_o1, v_o2 from public.matches m where m.id = p_mac_id;
  elsif p_mac_tur = 'duello' then
    select d.oyuncu1, d.oyuncu2 into v_o1, v_o2 from public.duellolar d where d.id = p_mac_id;
  elsif p_mac_tur = 'kasa' then   -- 957
    select k.oyuncu1, k.oyuncu2 into v_o1, v_o2 from public.kasa_maclari k where k.id = p_mac_id;
  else
    return null;
  end if;
  if p_ben is null or p_ben not in (v_o1, v_o2) then return null; end if;
  v_rakip := case when p_ben = v_o1 then v_o2 else v_o1 end;
  if exists (select 1 from public.profiles p where p.id = v_rakip
               and (public.acik_bot_mu(p.is_bot, p.bot_turu) or coalesce(p.acik_bot, false))) then
    return 'antrenman';
  end if;
  return p_mac_tur;
end;
$function$
;

-- 3c) Tepki durumu: kasa kanalı
CREATE OR REPLACE FUNCTION public.tepki_durumu(p_mac_tur text, p_mac_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_mod text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_mod := public.tepki_mac_modu(p_mac_tur, p_mac_id, v_me);
  if v_mod is null then return jsonb_build_object('acik', false); end if;
  -- 620: engelli çiftte tepki kapalı (özel kanal da reddeder)
  if not public.tepki_kanal_uyesi_mi('tepki-' || case when p_mac_tur in ('duello', 'kasa') then p_mac_tur else 'mac' end || '-' || p_mac_id::text) then
    return jsonb_build_object('acik', false);
  end if;
  return jsonb_build_object(
    'acik', public.tepki_mod_acik(v_mod),
    'mod', v_mod,
    'kanal', 'tepki-' || case when p_mac_tur in ('duello', 'kasa') then p_mac_tur else 'mac' end || '-' || p_mac_id::text,
    'tepkiler', public.tepkilerim_liste(v_me),
    'aralik_sn', public.ayar_ondalik('tepki_aralik_sn', 3),
    'mac_max', public.ayar_sayi('tepki_mac_max', 10),
    'balon_ms', public.ayar_sayi('tepki_balon_ms', 2000));
end;
$function$
;

-- 4) Cevap çözümle: + soru_sayac + kategori_dogru_arttir (kural aynı)
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
  end if;

  update public.kasa_maclari
     set faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => k.sonuc_sn),
         kasa = v_kasa, sahip = v_sahip,
         son_tur = jsonb_build_object(
           'tur', k.tur, 'altin', k.altin, 'dogru_cevap', v_dogru,
           'dogru', jsonb_build_object(k.oyuncu1::text, v_d1, k.oyuncu2::text, v_d2),
           'artis', v_artis, 'kasa_once', k.kasa, 'kasa_sonra', v_kasa,
           -- 955: tavana kırpıldı mı (istemci gerçek artışı kasa_sonra − kasa_once ile gösterir)
           'tavan_kirpti', not k.altin and k.kasa_tavan > 0 and k.kasa + v_artis > k.kasa_tavan,
           'sahip_once', k.sahip, 'sahip_sonra', v_sahip, 'kazanan', v_kazanan),
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler
     set dogru1 = v_d1, dogru2 = v_d2, artis = v_artis, kasa_sonra = v_kasa, sahip_sonra = v_sahip,
         puan1_sonra = k.puan1, puan2_sonra = k.puan2, soru_id = k.soru_id, kategori = v_kat
   where kasa_id = p_id and tur = k.tur;
end $function$
;

-- 5) Gizli bot nabzı: aktif Kasa maçı
CREATE OR REPLACE FUNCTION public.gizli_bot_nabiz()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_n int;
begin
  -- Paket 26 E: aynı işin iki kopyası aynı anda çalışmasın. Ölçüldü (17 Eyl 15:00 UTC):
  -- migration uygulanırken fonksiyon derlemesi kilitlenince 2 saniyelik işler birikti ve
  -- 9 koşu 120 sn'lik ifade zaman aşımına düştü. Kilidi alamayan koşu sessizce atlar.
  if not pg_try_advisory_xact_lock(hashtext('gizli_bot_nabiz')) then return 0; end if;
  update public.profiles p
     set last_seen = now()
   where p.id in (
     select x.id from public.profiles x
      where coalesce(x.is_bot, false) and x.bot_turu = 'gizli' and coalesce(x.bot_aktif, true)
        and (
          exists (select 1 from public.meydan_bot_nobeti n where n.bot_id = x.id and n.bitis > now())
          or exists (select 1 from public.matches m
                      where m.durum in ('aktif','bekliyor') and x.id in (m.oyuncu1, m.oyuncu2))
          or exists (select 1 from public.duellolar d
                      where d.durum = 'aktif' and x.id in (d.oyuncu1, d.oyuncu2))
          or exists (select 1 from public.kasa_maclari km   -- 957
                      where km.durum = 'aktif' and x.id in (km.oyuncu1, km.oyuncu2))
          or exists (select 1 from public.group_match_players gp
                       join public.group_matches g on g.id = gp.group_match_id
                      where gp.user_id = x.id and g.durum in ('lobi','bekliyor','aktif')
                        and gp.terk_at is null)
          or exists (select 1 from public.hizli_oyuncular ho
                       join public.hizli_maclar h on h.id = ho.hizli_mac_id
                      where ho.user_id = x.id and h.durum in ('lobi','bekliyor','aktif')
                        and ho.terk_at is null)
          or exists (select 1 from public.tournament_players tp
                       join public.tournaments t on t.id = tp.tournament_id
                      where tp.user_id = x.id and t.durum in ('lobi','aktif'))
        )
      order by x.id
      for update of x skip locked
   );
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$
;

-- YETKİLER (Ida onayı 5 Eki 2026: rövanş RPC'leri yalnız authenticated; iç fonksiyon kapalı)
revoke execute on function public.kasa_rovans_baslat(uuid) from public, anon, authenticated;
revoke execute on function public.kasa_rovans_iste(uuid) from public, anon;
revoke execute on function public.kasa_rovans_yanitla(uuid, boolean) from public, anon;
revoke execute on function public.kasa_rovans_iptal(uuid) from public, anon;
grant execute on function public.kasa_rovans_iste(uuid) to authenticated;
grant execute on function public.kasa_rovans_yanitla(uuid, boolean) to authenticated;
grant execute on function public.kasa_rovans_iptal(uuid) to authenticated;

