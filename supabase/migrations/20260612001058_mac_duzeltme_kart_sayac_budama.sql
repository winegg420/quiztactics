-- 1058 · Maç düzeltmeleri (10 Eki 2026, Ida'nın canlı testinden) + disk bütçesi.
--
-- 1) Düello v4 kart seçimi: "Rakibe gönder" ve "Kendine al" artık AYRI süreli. Her adım duello4_kart_sn (10) + duyuru
--    (duello4_kart_duyuru_ms, sayaç durur). Eskiden 2. adım 1. adımdan kalan süreyle sınırlıydı (tek 10 sn paylaşılıyordu).
--    Süre dolumu adım adım: 1. adım dolarsa yalnız rakibe giden kart otomatik (rakibin en zayıfı), 2. adım kendi süresiyle
--    açılır; 2. adım dolarsa yalnız kendi kartı (kendi en güçlüsü). Hangi adımın otomatik seçildiği satırda
--    (v4_oto_gonder / v4_oto_sec) ve duello_durum › v4.oto_gonder / oto_sec'te; v4_kart_oto (ikisinden biri) aynen durur.
-- 2) rpc_sayac UNLOGGED: hız sınırı sayacı her çağrıda yazıyor; artık WAL üretmez, salt-okuma RPC'leri (duello_durum,
--    kasa_durum…) commit'te disk senkronu beklemez. Sayaç değerleri yeniden başlatma/çökmede sıfırlanır (zararsız: en çok
--    bir pencere boyu ek hak). Fonksiyonlar, kısıtlar, RLS ve yetkiler AYNI (ALTER TABLE … SET UNLOGGED bunları korur).
-- 3) Kayıt budama: public.kayit_budama() — cron.job_run_details (6 sa; takılı 'starting' satırları 1 gün), süresi geçmiş
--    rpc_sayac satırları (2 gün), net._http_response (1 gün). Mevcut 'bildim-cron-kayit-budama' işi (saatte bir) artık
--    bunu çağırır.
-- Geri alma: docs/mac-duzeltme-1058-geri-al.sql

alter table public.duellolar add column if not exists v4_oto_gonder boolean not null default false;
alter table public.duellolar add column if not exists v4_oto_sec boolean not null default false;

CREATE OR REPLACE FUNCTION public.duello4_kart_ac(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_tum text[];
  v_kalan text[];
  v_kullanilan text[];
  v_kartlar text[];
  v_n int;
begin
  select * into d from public.duellolar where id = p_id for update;
  v_n := greatest(2, coalesce(d.v4_kart_sayisi, 4));
  v_tum := public.duello4_kategoriler(p_id);
  if coalesce(array_length(v_tum, 1), 0) < 2 then v_tum := public.duello_kategorileri(); end if;
  v_kullanilan := coalesce(d.v4_kullanilan, '{}');
  select coalesce(array_agg(k), '{}') into v_kalan from unnest(v_tum) k where not (k = any(v_kullanilan));
  if coalesce(array_length(v_kalan, 1), 0) < least(v_n, coalesce(array_length(v_tum, 1), 0)) then
    v_kullanilan := '{}';
    v_kalan := v_tum;
  end if;
  select array_agg(k) into v_kartlar from (select k from unnest(v_kalan) k order by random() limit v_n) s;
  update public.duellolar
     set faz = 'kart', saldiran = d.v4_kontrol,
         v4_tur = v4_tur + 1, v4_kullanilan = v_kullanilan,
         v4_kartlar = v_kartlar, v4_gonderilen = null, v4_secilen = null, v4_kart_oto = false, v4_oto_gonder = false, v4_oto_sec = false,
         v4_duyuru_bitis = now() + public.duello4_kart_duyuru(),
         faz_bitis = now() + public.duello4_kart_duyuru() + make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)),
         cevaplar = '{}'::jsonb, son_hareket = now()
   where id = p_id;
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_kart_uygula(p_id uuid, p_gonder text, p_sec text, p_oto boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if d.faz <> 'kart' then return; end if;
  if p_gonder is not null and d.v4_gonderilen is null then
    if not (p_gonder = any(d.v4_kartlar)) then raise exception 'Bu kategori şu an seçilemez'; end if;
    update public.duellolar set v4_gonderilen = p_gonder, v4_kart_oto = v4_kart_oto or p_oto, v4_oto_gonder = p_oto, son_hareket = now() where id = p_id;
    d.v4_gonderilen := p_gonder;
    if p_sec is null then
      -- 1058: 2. adım KENDİ süresiyle (duello4_kart_sn, tam). Eskiden 1. adımdan kalanla sınırlıydı: iki adım tek
      -- 10 sn'yi paylaşıyordu. 2. duyuru boyunca sayaç yine durur.
      update public.duellolar
         set v4_duyuru_bitis = now() + public.duello4_kart_duyuru(),
             faz_bitis = now() + public.duello4_kart_duyuru() + make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7))
       where id = p_id;
    end if;
  end if;
  if p_sec is not null and d.v4_gonderilen is not null and d.v4_secilen is null then
    if not (p_sec = any(d.v4_kartlar)) or p_sec = d.v4_gonderilen then raise exception 'Bu kategori şu an seçilemez'; end if;
    update public.duellolar set v4_secilen = p_sec, v4_kart_oto = v4_kart_oto or p_oto, v4_oto_sec = p_oto, son_hareket = now() where id = p_id;
    perform public.duello4_soru_ac(p_id);
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_kart_oto(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype; v_g text; v_s text; v_ben jsonb; v_rakip jsonb;
  v_vars int := public.ayar_sayi('duello4_oran_varsayilan', 50);
begin
  select * into d from public.duellolar where id = p_id for update;
  if d.faz <> 'kart' then return; end if;
  v_ben := case when d.v4_kontrol = d.oyuncu1 then d.profil1 else d.profil2 end;
  v_rakip := case when d.v4_kontrol = d.oyuncu1 then d.profil2 else d.profil1 end;
  -- 1058: adımlar ayrı. 1. adımın süresi dolduysa yalnız rakibe giden kart otomatik seçilir; 2. adım kendi
  -- süresiyle açılır (oyuncu kendi kategorisini yine seçebilir). 2. adımın süresi dolduysa yalnız kendi kartı.
  if d.v4_gonderilen is null then
    v_g := (select k from unnest(d.v4_kartlar) k
             order by coalesce(public.duello4_oran(v_rakip, k), v_vars), random() limit 1);
    perform public.duello4_kart_uygula(p_id, v_g, null, true);
    return;
  end if;
  v_g := d.v4_gonderilen;
  v_s := (select k from unnest(d.v4_kartlar) k where k <> v_g
           order by coalesce(public.duello4_oran(v_ben, k), v_vars) desc, random() limit 1);
  perform public.duello4_kart_uygula(p_id, null, v_s, true);
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben1 boolean;
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_benim_profil jsonb;
  v_rakip_profil jsonb;
  v_soru jsonb;
  v_soru_id uuid;
  v_soru_acik boolean;
  v_kart jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
  v_varsayilan int := public.ayar_sayi('duello4_oran_varsayilan', 50);
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_benim_profil := case when v_ben1 then d.profil1 else d.profil2 end;
  v_rakip_profil := case when v_ben1 then d.profil2 else d.profil1 end;

  -- Soru metni yalnız giriş bittikten sonra ve soru/sonuç fazında (kart fazında yok).
  v_soru_id := case when v_ben1 then d.soru_id1 else d.soru_id2 end;
  v_soru_acik := v_soru_id is not null
    and ((d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic) or d.faz = 'sonuc' or d.durum <> 'aktif');
  if v_soru_acik then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(v_soru_id, v_dil) sd;
  end if;
  -- 1052 basılı tut: doğru şık YALNIZ hileli_mi() hesabına ve yalnız kendi cevap hakkı sürerken (normal oyuncuda alan yok).
  if v_soru is not null and d.durum = 'aktif' and d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic and not (coalesce(d.cevaplar, '{}'::jsonb) ? v_me::text) and public.hileli_mi() then
    v_soru := v_soru || jsonb_build_object('dogru_cevap', (select q.dogru_cevap from public.questions q where q.id = v_soru_id));
  end if;

  -- Kartlar: oranlar izleyenin bakışıyla (ben / rakip). null = yeterli veri yok ("?"). Rakibe gönderilen kart,
  -- seçim bitene kadar bekleyen oyuncuya gizli (adim: kaç seçim yapıldı).
  if d.faz = 'kart' and d.v4_kartlar is not null then
    v_kart := jsonb_build_object(
      'kartlar', (select coalesce(jsonb_agg(jsonb_build_object(
                    'k', k, 'ben', public.duello4_oran(v_benim_profil, k), 'rakip', public.duello4_oran(v_rakip_profil, k)) order by n), '[]'::jsonb)
                    from unnest(d.v4_kartlar) with ordinality x(k, n)),
      'adim', (case when d.v4_gonderilen is not null then 1 else 0 end) + (case when d.v4_secilen is not null then 1 else 0 end),
      'gonderilen', case when v_me = d.v4_kontrol then d.v4_gonderilen end,
      'secilen', case when v_me = d.v4_kontrol then d.v4_secilen end,
      'varsayilan', v_varsayilan);
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me), 'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli from public.duellolar x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  if d.durum = 'bitti' then
    v_odul := jsonb_build_object(
      'lig_puan', case when d.dereceli and d.kazanan = v_me
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int else 0 end,
      'coin', coalesce((select sum(h.miktar) from public.coin_hareketleri h
                         where h.user_id = v_me and h.tur = 'mac' and h.referans = 'duello:' || p_id::text), 0));
  end if;

  -- Maç sonu özeti: her soru izleyenin bakışıyla.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tip', h.v4 ->> 'tip', 'tur', h.tur, 'sonuc', h.v4 ->> 'sonuc',
             'kontrol_sonra', h.v4 -> 'kontrol_sonra', 'seri_sonra', h.v4 -> 'seri_sonra',
             'kategori', h.v4 -> 'oyuncular' -> v_me::text ->> 'kategori',
             'rakip_kategori', h.v4 -> 'oyuncular' -> v_rakip::text ->> 'kategori',
             'soru', sd.soru, 'secenekler', sd.secenekler,
             'dogru_cevap', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru_cevap'),
             'benim_cevabim', (h.v4 -> 'oyuncular' -> v_me::text -> 'cevap'),
             'ben_dogru', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru'),
             'ben_yanitsiz', (h.v4 -> 'oyuncular' -> v_me::text -> 'yanitsiz'),
             'rakip_dogru', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'dogru'),
             'rakip_yanitsiz', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'yanitsiz')) order by h.id), '[]'::jsonb)
      into v_gecmis
      from public.duello_hamleler h
      left join lateral public.soru_dilinde((h.v4 -> 'oyuncular' -> v_me::text ->> 'soru_id')::uuid, v_dil) sd on true
     where h.duello_id = p_id and h.v4 is not null;
  end if;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0), 'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = d.v4_soru_no;
  v_kilit := case
    when d.faz not in ('notr', 'cevap') or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar ? v_me::text or v_ilk is not null then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and d.cevaplar <> '{}'::jsonb then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 4,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'rakip', v_rakip,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru1, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru2, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'v4', jsonb_build_object(
      'kontrol', d.v4_kontrol, 'seri', d.v4_seri, 'seri_hedef', d.v4_seri_hedef,
      'tur', d.v4_tur, 'max_tur', d.v4_max_tur, 'notr_seri', d.v4_notr_seri, 'notr_max', d.v4_notr_max,
      'son', d.v4_son, 'soru_no', d.v4_soru_no, 'kullanilan', to_jsonb(d.v4_kullanilan),
      'kart', v_kart,
      -- Saldırı turunda kategoriler kart fazı bitince iki oyuncuya da açılır.
      'benim_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori1 else d.kategori2 end end,
      'rakip_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori2 else d.kategori1 end end,
      'oto', case when d.faz <> 'kart' then d.v4_kart_oto end,
      -- 1058: hangi adım otomatik seçildi (istemci "Süre doldu · otomatik seçildi"yi yalnız o kategoride yazar)
      'oto_gonder', case when d.faz <> 'kart' then d.v4_oto_gonder end,
      'oto_sec', case when d.faz <> 'kart' then d.v4_oto_sec end,
      'ilk_mac', not exists (select 1 from public.duellolar x
                              where x.surum = 4 and x.durum = 'bitti' and x.id <> d.id and v_me in (x.oyuncu1, x.oyuncu2))),
    'soru', v_soru,
    'cevap', case when d.faz in ('notr', 'cevap', 'son') then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'kapali', d.v4_son,
       'set', to_jsonb(public.skill_setim('duello')),
       'izinli', to_jsonb(public.duello4_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan', 'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda, 'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kart', public.ayar_sayi('duello4_kart_sn', 7),
       'kart_duyuru_ms', public.ayar_sayi('duello4_kart_duyuru_ms', 900),
       'cevap', public.ayar_sayi('duello4_cevap_sn', 15),
       'sonuc', public.ayar_sayi('duello4_sonuc_sn', 3),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'gosterim_bas', case
          when d.faz = 'kart' then coalesce(d.v4_duyuru_bitis, d.faz_bitis - make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)))
          when d.faz in ('notr', 'cevap', 'son') then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'terk_eden', d.terk_eden, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))));
end $function$;

-- 2) hız sınırı sayacı: WAL'sız
alter table public.rpc_sayac set unlogged;

-- 3) kayıt budama (yalnız cron/postgres çalıştırır)
create or replace function public.kayit_budama()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $f$
declare
  v_cron int := 0;
  v_sayac int := 0;
  v_net int := 0;
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
  return jsonb_build_object('cron', v_cron, 'rpc_sayac', v_sayac, 'net', v_net);
end $f$;
revoke all on function public.kayit_budama() from public, anon, authenticated;
grant execute on function public.kayit_budama() to service_role;

select cron.schedule('bildim-cron-kayit-budama', '17 * * * *', 'select public.kayit_budama()');
