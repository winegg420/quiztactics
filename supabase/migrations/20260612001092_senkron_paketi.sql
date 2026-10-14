-- 1092 · SENKRON PAKETİ — maç başı ve soru sayaçları için tek kural (Ida, 14 Eki 2026).
-- Kural: ilk soru/tur, bütün oyuncular maç ekranına geldikten SONRA kurulur: başlangıç = o an + 3 sn sayım + gösterim payı.
-- Bot anında hazırdır. Gelmeyen oyuncu için yedek süre dolunca maç yine başlar ve o oyuncu mevcut bağlantısız akışına düşer.
--
-- 1) Düello v4: maç eşleşme anında DEĞİL, iki oyuncu da MAÇ EKRANINI açınca (duello_giris → ekran1/2) başlar. Arama
--    ekranının "Rakip bulundu" kartı için yaptığı duello_durum okuması (→ duello_kilitle → giris1/2) sayılmaz. Bekleme: faz 'notr', soru yok, v4_soru_no 0, faz_bitis = yedek (duello_baglanma_sn 15).
--    Yedek dolarsa maç başlar; aramayla kurulan maçta gelmeyen oyuncu için duello_giris'in 410 cezasız iptali aynen,
--    davet/rövanşta 1059 kopukluk (60 sn) aynen. Bekleme sırasında kopukluk kapısı çalışmaz (1091 "ilk sayaç 38" notu).
--    Uygulama: duello4_ilerlet → duello4_ilerlet_ic adını aldı (gövde 1059 ile AYNEN); yeni duello4_ilerlet bekleme
--    kapısını yapar, beklemede değilse _ic'i çağırır. SONRAKİ MİGRATION'LAR GÖVDEYİ duello4_ilerlet_ic'te değiştirir.
-- 2) Düello v4 soru içi sayaçlar: saldırı sorusunun bitişine "kim neyi aldı" açılışı (duello4_acilis_ms 2000 = istemci
--    duello4_acilis) EKLENİR; gosterim_bas = soru_baslangic + açılış + pay. Kart fazında her adımın duyurusundan sonra
--    gösterim payı eklenir (v4_duyuru_bitis = duyuru + pay). Sayaç her zaman tam süreden görünür; bot gecikmesi açılışı bekler.
-- 3) Ortak Hazine: aynı giriş kapısı (kasa_giris → ekran1/2). Bekleme: faz 'baslangic', faz_bitis NULL (BEFORE INSERT tetikleyicisi). İki giriş
--    (bot hazır) ya da kasa_baglanma_sn (10) dolunca faz_bitis = o an + 3 + pay + kasa_giris_sahne_ms. kasa_ilerlet →
--    kasa_ilerlet_ic (gövde 1059 ile AYNEN); yeni kasa_ilerlet kapıyı yapar. 410/950 cezasız iptal kuralı aynen.
--    Karardan (AÇ/DEVAM) sonra açılan soruda soru anı kasa_karar_an_ms (1500) ileri kurulur: an ekrandayken süre işlemez.
-- 4) Grup: hazır olmayan için yedek süre — lobi başından (ilk nabız, group_matches.lobi_bas) loadout_secim_sn (20) sonra
--    maç bağlı oyuncularla başlar; hiç gelmeyen kopukluk akışına düşer. 1091 tetikleyicisi aynen.
-- 5) Turnuva: lobi → aktif geçişinde ilk soru = o an + mac_geri_sayim_sn (3) + mac_geri_sayim_payi_ms (2000);
--    lobidekiler ortak 3-2-1'i görür. Hazır kapısı yok (sabit saatli etkinlik).
-- Yeni GRANT/RLS yok: yeni fonksiyonlar iç (public/anon/authenticated'tan geri alınır); istemci mevcut RPC'leri çağırır.

-- ================================================================== şema + ayar
alter table public.duellolar add column if not exists v4_acilis_ms int not null default 0;
alter table public.duellolar add column if not exists v4_kart_payi_ms int not null default 0;
alter table public.group_matches add column if not exists lobi_bas timestamptz;
-- Maç EKRANI açıldı anı: yalnız duello_giris / kasa_giris yazar (maç sayfası açılınca çağrılır). giris1/2 (410/950) ayrıca
-- duello_kilitle / kasa_kilitle'de de yazılır — arama ekranı "Rakip bulundu" kartı için durum okuyunca dolar; kapı ona bakmaz.
alter table public.duellolar add column if not exists ekran1 timestamptz;
alter table public.duellolar add column if not exists ekran2 timestamptz;
alter table public.kasa_maclari add column if not exists ekran1 timestamptz;
alter table public.kasa_maclari add column if not exists ekran2 timestamptz;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello4_acilis_ms', '2000'::jsonb, 'Düello v4 saldırı sorusunda "kim neyi aldı" açılışı (ms). Soru süresi bunun + gösterim payının ARDINDAN işler. İstemci sureler.js › duello4_acilis ile aynı tutulur.')
on conflict (anahtar) do nothing;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_karar_an_ms', '1500'::jsonb, 'Ortak Hazine: karardan (AÇ/DEVAM) sonra açılan soruda an süresi (ms). Soru anı bu kadar ileri kurulur; gösterim payı ondan sonra. İstemci DEVAM anı 1,4 sn, AÇ anı 1,28 sn.')
on conflict (anahtar) do nothing;

-- ================================================================== 1) Düello: giriş kapısı
-- 1091'deki tanımın aynısı; yalnız ilk soru AÇILMAZ — giriş beklemesi kurulur (yedek: duello_baglanma_sn).
create or replace function public.duello4_baslat(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.duellolar
     set surum = 4, hakimiyet = false, secim_modu = false, puan_modu = false, ban_acik = false,
         faz = 'notr', saldiran = oyuncu1, ilk_secen = null, tur = 0, max_tur = null,
         v4_kontrol = null, v4_seri = 0, v4_tur = 0, v4_notr_seri = 0, v4_kullanilan = '{}', v4_soru_no = 0,
         v4_max_tur = greatest(1, public.ayar_sayi('duello4_max_tur', 15))::smallint,
         v4_seri_hedef = greatest(1, public.ayar_sayi('duello4_seri_hedef', 3))::smallint,
         v4_notr_max = greatest(1, public.ayar_sayi('duello4_notr_max', 5))::smallint,
         v4_kart_sayisi = greatest(2, public.ayar_sayi('duello4_kart_sayisi', 4))::smallint,
         -- 1092: giriş beklemesi
         soru_id = null, soru_id1 = null, soru_id2 = null, soru_baslangic = null, bitis1 = null, bitis2 = null,
         faz_bitis = now() + make_interval(secs => greatest(1, public.ayar_sayi('duello_baglanma_sn', 15)))
   where id = p_id;
end $$;
revoke all on function public.duello4_baslat(uuid) from public, anon, authenticated;

alter function public.duello4_ilerlet(uuid) rename to duello4_ilerlet_ic;
revoke all on function public.duello4_ilerlet_ic(uuid) from public, anon, authenticated;

create or replace function public.duello4_ilerlet(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_bot1 boolean;
  v_bot2 boolean;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.surum <> 4 then return; end if;
  if d.faz = 'notr' and d.v4_soru_no = 0 and d.soru_id is null then
    -- Giriş beklemesi: iki oyuncu da maç ekranına geldi (bot hazır) ya da yedek süre doldu → ilk soru o an + 3 sn + pay.
    select coalesce(p.is_bot, false) into v_bot1 from public.profiles p where p.id = d.oyuncu1;
    select coalesce(p.is_bot, false) into v_bot2 from public.profiles p where p.id = d.oyuncu2;
    if ((d.ekran1 is not null or v_bot1) and (d.ekran2 is not null or v_bot2))
       or now() >= coalesce(d.faz_bitis, d.created_at + make_interval(secs => public.ayar_sayi('duello_baglanma_sn', 15))) then
      perform public.duello4_ortak_soru_ac(p_id, false,
        make_interval(secs => public.ayar_sayi('duello4_giris_sn', 3))
        + make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0));
      perform public.duello_sinyal_ver(p_id);
    end if;
    return;   -- beklemede kopukluk kapısı / faz döngüsü çalışmaz
  end if;
  perform public.duello4_ilerlet_ic(p_id);
end $$;
revoke all on function public.duello4_ilerlet(uuid) from public, anon, authenticated;

-- Maç ekranı sinyali: duello_giris (410'daki tanımın aynısı + ekran1/2 + kapıyı hemen dene). Yetkiler aynen kalır.
create or replace function public.duello_giris(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_giris timestamptz;
  v_sure numeric := public.ayar_ondalik('duello_baglanma_sn', 10);
  v_aramadan boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('duello_giris', 90, interval '60 seconds');

  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if v_me not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  v_ben_p1 := (d.oyuncu1 = v_me);
  v_rakip := case when v_ben_p1 then d.oyuncu2 else d.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;

  if v_ben_p1 then
    update public.duellolar set giris1 = coalesce(giris1, now()) where id = p_id and giris1 is null;
  else
    update public.duellolar set giris2 = coalesce(giris2, now()) where id = p_id and giris2 is null;
  end if;
  -- 1092: maç EKRANI açıldı sinyali (yalnız bu çağrı yazar; arama ekranının rakip kartı okuması — duello_durum →
  -- duello_kilitle → giris — sayılmaz). Giriş kapısı hemen denenir: iki ekran da açıksa ilk soru şimdi + 3 sn + pay.
  if v_ben_p1 then
    update public.duellolar set ekran1 = now() where id = p_id and ekran1 is null;
  else
    update public.duellolar set ekran2 = now() where id = p_id and ekran2 is null;
  end if;
  if d.surum = 4 and d.durum = 'aktif' then perform public.duello4_ilerlet(p_id); end if;
  v_rakip_giris := case when v_ben_p1 then d.giris2 else d.giris1 end;

  -- Aramayla kurulan düello: rövanş değil (onceki_id boş) ve davetten değil.
  v_aramadan := d.onceki_id is null
    and not exists (select 1 from public.duello_davetleri x where x.duello_id = p_id);

  if d.durum = 'aktif' and not coalesce(v_rakip_bot, false) and v_rakip_giris is null
     and v_aramadan and now() >= d.created_at + make_interval(secs => v_sure) then
    -- CEZASIZ iptal: duello_bitir çağrılmaz → kazanan/ödül/lig/XP yok.
    update public.duellolar
       set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('durum', 'iptal', 'rakip_geldi', false, 'kalan_sn', 0,
                              'baglanmayan', v_rakip);
  end if;

  return jsonb_build_object(
    'durum', d.durum,
    'rakip_geldi', coalesce(v_rakip_bot, false) or v_rakip_giris is not null or not v_aramadan,
    'kalan_sn', greatest(0, ceil(v_sure - extract(epoch from (now() - d.created_at))))::int,
    'baglanmayan', d.baglanmayan
  );
end;
$$;

-- ================================================================== 2) Düello: açılış + kart payı
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
         -- 1092: duyurudan sonra gösterim payı (sayaç pay boyunca tam sürede bekler; geç gelen ekran süre kaybetmez)
         v4_duyuru_bitis = now() + public.duello4_kart_duyuru() + public.duello2_gosterim_payi(),
         v4_kart_payi_ms = (extract(epoch from public.duello2_gosterim_payi()) * 1000)::int,
         faz_bitis = now() + public.duello4_kart_duyuru() + public.duello2_gosterim_payi() + make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)),
         cevaplar = '{}'::jsonb, son_hareket = now()
   where id = p_id;
end $function$;
revoke all on function public.duello4_kart_ac(uuid) from public, anon, authenticated;

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
         set v4_duyuru_bitis = now() + public.duello4_kart_duyuru() + public.duello2_gosterim_payi(),   -- 1092
             v4_kart_payi_ms = (extract(epoch from public.duello2_gosterim_payi()) * 1000)::int,
             faz_bitis = now() + public.duello4_kart_duyuru() + public.duello2_gosterim_payi() + make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7))
       where id = p_id;
    end if;
  end if;
  if p_sec is not null and d.v4_gonderilen is not null and d.v4_secilen is null then
    if not (p_sec = any(d.v4_kartlar)) or p_sec = d.v4_gonderilen then raise exception 'Bu kategori şu an seçilemez'; end if;
    update public.duellolar set v4_secilen = p_sec, v4_kart_oto = v4_kart_oto or p_oto, v4_oto_sec = p_oto, son_hareket = now() where id = p_id;
    perform public.duello4_soru_ac(p_id);
  end if;
end $function$;
revoke all on function public.duello4_kart_uygula(uuid, text, text, boolean) from public, anon, authenticated;

create or replace function public.duello4_soru_ac(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_k uuid;            -- kontrol sahibi
  v_cift uuid[];
  v_kat1 text;
  v_kat2 text;
  v_s1 uuid;
  v_s2 uuid;
  v_bitis timestamptz;
  v_acilis_ms int := greatest(0, public.ayar_sayi('duello4_acilis_ms', 2000))::int;   -- 1092
begin
  select * into d from public.duellolar where id = p_id for update;
  v_k := d.v4_kontrol;
  v_cift := public.duello4_soru_cifti(p_id, d.v4_secilen, d.v4_gonderilen);   -- [kontrol, rakip]
  if v_k = d.oyuncu1 then
    v_kat1 := d.v4_secilen; v_kat2 := d.v4_gonderilen; v_s1 := v_cift[1]; v_s2 := v_cift[2];
  else
    v_kat1 := d.v4_gonderilen; v_kat2 := d.v4_secilen; v_s1 := v_cift[2]; v_s2 := v_cift[1];
  end if;
  if v_s1 is null or v_s2 is null then
    -- Kategori(ler)de soru kalmadı (pratikte olmaz): maç takılmasın, tur nötr soruyla oynanır.
    perform public.duello4_ortak_soru_ac(p_id, false);
    update public.duellolar set faz = 'cevap', v4_acilis_ms = 0 where id = p_id;   -- 1092: açılış paneli yok
    return;
  end if;
  -- 1092: soru süresi açılış sahnesi (duello4_acilis_ms) + gösterim payından SONRA işler; oyuncu sayacı hep tam süreden görür.
  v_bitis := now() + make_interval(secs => public.ayar_sayi('duello4_cevap_sn', 15)) + public.duello2_gosterim_payi()
             + make_interval(secs => v_acilis_ms / 1000.0);
  update public.duellolar
     set faz = 'cevap',
         kategori = case when v_k = d.oyuncu1 then v_kat1 else v_kat2 end,
         soru_id = case when v_k = d.oyuncu1 then v_s1 else v_s2 end,
         kategori1 = v_kat1, kategori2 = v_kat2, soru_id1 = v_s1, soru_id2 = v_s2,
         v4_kullanilan = (select coalesce(array_agg(distinct k), '{}') from unnest(v4_kullanilan || array[d.v4_gonderilen, d.v4_secilen]) k),
         v4_soru_no = v4_soru_no + 1,
         soru_baslangic = now(), v4_acilis_ms = v_acilis_ms, bitis1 = v_bitis, bitis2 = v_bitis, faz_bitis = v_bitis,
         cevaplar = '{}'::jsonb, elli1 = null, elli2 = null, elli_kapali = null,
         zaman_baskisi = false, ek_sure = false, soru_degisti_saldiri = false, soru_degisti_savunma = false,
         kullanilan_sorular = kullanilan_sorular || v_s1 || v_s2,
         son_hareket = now()
   where id = p_id;
end $$;
revoke all on function public.duello4_soru_ac(uuid) from public, anon, authenticated;

create or replace function public.duello4_bot_gecikme(p_id uuid, p_bot uuid)
returns double precision language plpgsql stable security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  p public.profiles%rowtype;
  v_soru uuid;
  v_tohum text;
  v_g double precision;
  v_sure double precision;
  v_min double precision;
  v_max double precision;
begin
  select * into d from public.duellolar where id = p_id;
  select * into p from public.profiles where id = p_bot;
  v_soru := case when p_bot = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
  v_tohum := 'd4cev:' || p_id::text || ':' || coalesce(v_soru::text, '') || ':' || p_bot::text;
  if public.duello2_bot_acik_mi(p_bot) then
    v_min := public.ayar_ondalik('duello2_bot_acik_cevap_min_sn', 0.3);
    v_max := public.ayar_ondalik('duello2_bot_acik_cevap_max_sn', 0.8);
    v_g := v_min + (v_max - v_min) * public.bot_rasgele(v_tohum);
  else
    v_g := public.bot_gecikme_sn(p_bot, v_tohum, p.bot_gecikme_min, p.bot_gecikme_max, public.soru_okuma_yuku(v_soru));
  end if;
  v_sure := extract(epoch from (case when p_bot = d.oyuncu1 then d.bitis1 else d.bitis2 end) - d.soru_baslangic)
            - public.ayar_ondalik('duello2_bot_cevap_pay_sn', 2);
  -- 1092: saldırı sorusunda açılış sahnesi de beklenir (insan o sırada soruyu görmüyor)
  return greatest(least(v_g + extract(epoch from public.duello2_gosterim_payi())
                        + case when d.faz = 'cevap' then coalesce(d.v4_acilis_ms, 0) / 1000.0 else 0 end, v_sure), 0.3);
end $$;
revoke all on function public.duello4_bot_gecikme(uuid, uuid) from public, anon, authenticated;

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
    and ((d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic) or d.faz = 'sonuc' or d.durum <> 'aktif'
         -- 1092: maçın 1. sorusu kurulduğu anda gelir (Klasik/Grup gibi): istemci 3-2-1 katmanının ALTINDA tutar, yavaş
         -- telefonda soru başlangıçtan sonraki okumayı beklemez. Cevap yine soru_baslangic'tan önce reddedilir (duello4_cevap).
         or (d.durum = 'aktif' and d.faz = 'notr' and d.v4_soru_no = 1));
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
      'son', d.v4_son, 'soru_no', d.v4_soru_no,
      -- 1092: iki oyuncu da maç ekranına gelene kadar ilk soru kurulmaz (istemci "Rakip bağlanıyor…" gösterir)
      'giris_bekle', d.durum = 'aktif' and d.faz = 'notr' and d.v4_soru_no = 0 and d.soru_id is null, 'kullanilan', to_jsonb(d.v4_kullanilan),
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
       'acilis_ms', case when d.faz = 'cevap' then coalesce(d.v4_acilis_ms, 0) else 0 end,   -- 1092
       'kart_payi_ms', case when d.faz = 'kart' then coalesce(d.v4_kart_payi_ms, 0) else 0 end,   -- 1092
       'gosterim_bas', case
          when d.faz = 'kart' then coalesce(d.v4_duyuru_bitis, d.faz_bitis - make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)))
          when d.faz = 'cevap' then d.soru_baslangic + make_interval(secs => coalesce(d.v4_acilis_ms, 0) / 1000.0) + public.duello2_gosterim_payi()   -- 1092
          when d.faz in ('notr', 'son') then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'terk_eden', d.terk_eden, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))));
end $function$;
revoke all on function public.duello4_durum(uuid) from public, anon, authenticated;

-- ================================================================== 3) Ortak Hazine: giriş kapısı
-- kasa_olustur (987) ilk fazın bitişini kurulurken yazar; yeni maç giriş beklemesiyle açılır (faz_bitis NULL).
create or replace function public.kasa_giris_bekle_kur()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.faz = 'baslangic' then new.faz_bitis := null; end if;
  return new;
end $$;
revoke all on function public.kasa_giris_bekle_kur() from public, anon, authenticated;
drop trigger if exists kasa_giris_bekle_kur on public.kasa_maclari;
create trigger kasa_giris_bekle_kur before insert on public.kasa_maclari
  for each row execute function public.kasa_giris_bekle_kur();

alter function public.kasa_ilerlet(uuid) rename to kasa_ilerlet_ic;
revoke all on function public.kasa_ilerlet_ic(uuid) from public, anon, authenticated;

create or replace function public.kasa_ilerlet(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  k public.kasa_maclari%rowtype;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;
  if k.faz = 'baslangic' and k.faz_bitis is null then
    -- Giriş beklemesi: iki giriş (bot hazır) ya da kasa_baglanma_sn → başlangıç fazı o an + 3 + pay + giriş sahnesi (952/1038).
    if ((k.ekran1 is not null or k.oyuncu1 = k.bot) and (k.ekran2 is not null or k.oyuncu2 = k.bot))
       or now() >= k.created_at + make_interval(secs => public.ayar_ondalik('kasa_baglanma_sn', 10)::double precision) then
      update public.kasa_maclari
         set faz_bitis = now() + make_interval(secs => public.ayar_sayi('mac_geri_sayim_sn', 3)
                                  + greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0
                                  + greatest(0, public.ayar_sayi('kasa_giris_sahne_ms', 3000)) / 1000.0),
             son_hareket = now()
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
    end if;
    return;   -- beklemede kopukluk kapısı / faz döngüsü çalışmaz
  end if;
  perform public.kasa_ilerlet_ic(p_id);
end $$;
revoke all on function public.kasa_ilerlet(uuid) from public, anon, authenticated;

-- Maç ekranı sinyali: kasa_giris (950'deki tanımın aynısı + ekran1/2 + kapıyı hemen dene). Yetkiler aynen kalır.
create or replace function public.kasa_giris(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_me uuid := auth.uid();
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_giris timestamptz;
  v_sure numeric := public.ayar_ondalik('kasa_baglanma_sn', 10);
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kasa_giris', 90, interval '60 seconds');
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;

  v_ben_p1 := (k.oyuncu1 = v_me);
  v_rakip := case when v_ben_p1 then k.oyuncu2 else k.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;
  if v_ben_p1 then
    update public.kasa_maclari set giris1 = now() where id = p_id and giris1 is null;
  else
    update public.kasa_maclari set giris2 = now() where id = p_id and giris2 is null;
  end if;
  v_rakip_giris := case when v_ben_p1 then k.giris2 else k.giris1 end;
  -- 1092: maç EKRANI açıldı sinyali (yalnız bu çağrı yazar; arama ekranının rakip kartı okuması sayılmaz) + kapıyı dene
  if v_ben_p1 then
    update public.kasa_maclari set ekran1 = now() where id = p_id and ekran1 is null;
  else
    update public.kasa_maclari set ekran2 = now() where id = p_id and ekran2 is null;
  end if;
  if k.durum = 'aktif' then perform public.kasa_ilerlet(p_id); end if;

  if k.durum = 'aktif' and not coalesce(v_rakip_bot, false) and v_rakip_giris is null
     and not k.davetli and now() >= k.created_at + make_interval(secs => v_sure) then
    update public.kasa_maclari
       set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
     where id = p_id;
    perform public.kasa_sinyal_ver(p_id);
    return jsonb_build_object('durum', 'iptal', 'rakip_geldi', false, 'kalan_sn', 0, 'baglanmayan', v_rakip);
  end if;

  return jsonb_build_object(
    'durum', k.durum,
    'rakip_geldi', coalesce(v_rakip_bot, false) or v_rakip_giris is not null or k.davetli,
    'kalan_sn', greatest(0, ceil(v_sure - extract(epoch from (now() - k.created_at))))::int,
    'baglanmayan', k.baglanmayan);
end $$;

-- Karardan sonra açılan soru: AÇ/DEVAM anı + gösterim payı (954'teki tanımın aynısı + an süresi). Yetkiler aynen kalır.
create or replace function public.kasa_soru_ac(p_id uuid, p_soru uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.kasa_maclari%rowtype;
  v_soru uuid := p_soru;
  v_kat text;
  v_dogru smallint;
  v_bot_cevap smallint;
  v_gecikme numeric;
  v_min numeric := public.ayar_ondalik('kasa_bot_cevap_min_sn', 2);
  v_max numeric := public.ayar_ondalik('kasa_bot_cevap_max_sn', 6);
  v_an interval := interval '0';   -- 1092
begin
  select * into k from public.kasa_maclari where id = p_id;
  -- 1092: karar fazından gelen soru (AÇ/DEVAM, rakip karar kartı) — an ekranda sürerken soru süresi işlemez: soru anı
  -- an süresi (kasa_karar_an_ms) kadar ileri kurulur; gösterim payı ondan SONRA başlar (sayaç hep tam süreden görünür).
  if k.faz = 'karar' then v_an := make_interval(secs => greatest(0, public.ayar_sayi('kasa_karar_an_ms', 1500)) / 1000.0); end if;
  if v_soru is null and not k.altin and k.tur between 1 and coalesce(array_length(k.soru_ids, 1), 0) then
    v_soru := k.soru_ids[k.tur];
    if v_soru = any(k.kullanilan_sorular) then v_soru := null; end if;
  end if;
  if v_soru is null then v_soru := public.kasa_soru_bul(p_id); end if;
  if v_soru is null then
    -- Havuz tamamen boş: ödülsüz iptal (asılı kalmasın)
    update public.kasa_maclari set durum = 'iptal', bitis = now(), son_hareket = now() where id = p_id;
    return;
  end if;
  select q.kategori, q.dogru_cevap into v_kat, v_dogru from public.questions q where q.id = v_soru;

  if k.bot is not null then
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
         soru_baslangic = now() + v_an,
         faz_bitis = now() + v_an + make_interval(secs => k.soru_sn) + public.kasa_gosterim_payi(),
         cevaplar = '{}'::jsonb,
         -- soru başına girdiler silinir; maç boyu anahtarlar kalır: '_devam' (953 sayacı), '_hak' (954 ücretsiz 50:50)
         joker = coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(joker) e
                            where e.key in ('_devam', '_hak')), '{}'::jsonb),
         bot_cevap = v_bot_cevap,
         bot_cevap_at = case when k.bot is not null
                             then now() + v_an + public.kasa_gosterim_payi() + make_interval(secs => v_gecikme) end,
         son_hareket = now()
   where id = p_id;
  update public.kasa_hamleler set soru_id = v_soru, kategori = v_kat where kasa_id = p_id and tur = k.tur;
  perform public.kasa_devam_hak_ver(p_id);
end $$;

-- ================================================================== 4) Grup: yedek süre
-- (create or replace mevcut yetkileri korur; GRANT/REVOKE değişmez)
CREATE OR REPLACE FUNCTION public.grup_mac_nabiz(p_group_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, hazir_sayisi integer, toplam_oyuncu integer, bekleyenler text[], duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $function$
#variable_conflict use_column
declare
  gm public.group_matches%rowtype;
  v_ben_hazir boolean;
  v_hazir int;
  v_toplam int;
  v_kopuk int;
  v_bekleyenler text[];
  v_duraklama int := 0;
  v_kilit boolean := true;   -- 1056
  v_bagli int;              -- 1092: nabzı taze insan oyuncu
begin
  -- 1056: maç satırı 2 sn'de kilitlenemezse kilitsiz okuma (yalnız görünüm + kendi nabzın);
  -- başlatma/duraklatma/terk geçişleri yalnız kilidi alan çağrıda yapılır.
  begin
    select * into gm from public.group_matches where id = p_group_match_id for update;
  exception when lock_not_available then
    v_kilit := false;
    select * into gm from public.group_matches where id = p_group_match_id;
  end;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.group_match_players
    where group_match_id = p_group_match_id and user_id = auth.uid()
  ) then raise exception 'Bu maçta değilsin'; end if;

  begin
    update public.group_match_players
       set nabiz_at = now(),
           hazir = hazir or coalesce(p_hazir, false)
     where group_match_id = p_group_match_id and user_id = auth.uid();
  exception when lock_not_available then null;   -- 1056: nabız bir sonraki tikte yazılır
  end;

  select count(*),
         count(*) filter (where gp.hazir or (coalesce(pr.is_bot, false)
                            and public.bot_hazir_mi(pr.id, gp.joined_at, p_group_match_id::text))),
         count(*) filter (where not coalesce(pr.is_bot, false)
                            and coalesce(gp.nabiz_at, '-infinity'::timestamptz)
                                <= now() - interval '12 seconds'),
         coalesce(array_agg(pr.gorunen_ad) filter (
           where not coalesce(pr.is_bot, false)
             and coalesce(gp.nabiz_at, '-infinity'::timestamptz) <= now() - interval '12 seconds'
         ), '{}'::text[])
    into v_toplam, v_hazir, v_kopuk, v_bekleyenler
    from public.group_match_players gp
    join public.profiles pr on pr.id = gp.user_id
   where gp.group_match_id = p_group_match_id
     and gp.davet_durumu = 'kabul'
     and gp.terk_at is null;

  select (hazir or coalesce((select is_bot from public.profiles where id = auth.uid()), false))
    into v_ben_hazir
    from public.group_match_players
   where group_match_id = p_group_match_id and user_id = auth.uid();

  if not v_kilit then
    null;   -- 1056: geçiş yok, yalnız görünüm
  elsif gm.durum = 'aktif' and not gm.basladi then
    -- 1092: lobi başı (ilk nabız) bir kez yazılır. Klasik'teki gibi loadout_secim_sn (20) dolunca maç bağlı oyuncularla
    -- başlar; hiç gelmeyen oyuncu başladıktan sonra mevcut kopukluk akışına düşer (12 sn → duraklat, 45 sn → terk).
    if gm.lobi_bas is null then
      update public.group_matches set lobi_bas = now() where id = p_group_match_id;
      gm.lobi_bas := now();
    end if;
    v_bagli := v_toplam - v_kopuk - (select count(*)::int from public.group_match_players gp join public.profiles pr on pr.id = gp.user_id
                                      where gp.group_match_id = p_group_match_id and gp.davet_durumu = 'kabul' and gp.terk_at is null
                                        and coalesce(pr.is_bot, false));
    if v_toplam > 0 and ((v_hazir >= v_toplam and v_kopuk = 0)
        or (v_bagli > 0 and now() >= gm.lobi_bas + make_interval(secs => public.ayar_sayi('loadout_secim_sn', 20)))) then
      update public.group_matches
         set basladi = true, aktif_soru = 0, soru_baslangic = now()
       where id = p_group_match_id;
      select * into gm from public.group_matches where id = p_group_match_id;
    end if;

  elsif gm.durum = 'aktif' and gm.basladi then
    if v_kopuk > 0 and gm.duraklatildi_at is null then
      update public.group_matches set duraklatildi_at = now() where id = p_group_match_id;
      select * into gm from public.group_matches where id = p_group_match_id;

    elsif v_kopuk = 0 and gm.duraklatildi_at is not null then
      update public.group_matches
         set soru_baslangic = soru_baslangic + (now() - gm.duraklatildi_at),
             duraklatildi_at = null
       where id = p_group_match_id;
      select * into gm from public.group_matches where id = p_group_match_id;

    elsif v_kopuk > 0 and gm.duraklatildi_at is not null
          and now() > gm.duraklatildi_at + interval '45 seconds' then
      update public.group_match_players gp
         set terk_at = now()
        from public.profiles pr
       where gp.group_match_id = p_group_match_id
         and pr.id = gp.user_id
         and gp.davet_durumu = 'kabul'
         and gp.terk_at is null
         and not coalesce(pr.is_bot, false)
         and coalesce(gp.nabiz_at, '-infinity'::timestamptz) <= now() - interval '12 seconds';

      update public.group_matches
         set soru_baslangic = soru_baslangic + (now() - gm.duraklatildi_at),
             duraklatildi_at = null
       where id = p_group_match_id;

      if (select count(*) from public.group_match_players
           where group_match_id = p_group_match_id
             and davet_durumu = 'kabul' and terk_at is null) <= 1 then
        -- 460: tek oyuncu kaldı → maç biter, kalan kazanır (terk kuralı)
        perform public.grup_tek_kalan_bitir(p_group_match_id);
      end if;
      select * into gm from public.group_matches where id = p_group_match_id;
      v_kopuk := 0;
      v_bekleyenler := '{}'::text[];
    end if;
  end if;

  if gm.duraklatildi_at is not null then
    v_duraklama := greatest(0, extract(epoch from (now() - gm.duraklatildi_at))::int);
  end if;

  return query select gm.durum, gm.basladi, coalesce(v_ben_hazir, false), v_hazir, v_toplam,
                      v_bekleyenler, (gm.duraklatildi_at is not null), v_duraklama,
                      gm.soru_baslangic, now();
end;
$function$;

-- ================================================================== 5) Turnuva: ilk soru + 3-2-1
-- start_tournament / turnuva_zamanlayici_tik lobi → aktif geçişinde soru_baslangic = now() yazar; geçiş tetikleyiciyle ileri alınır.
create or replace function public.turnuva_baslangic_sayim()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.durum = 'aktif' and old.durum = 'lobi' and coalesce(new.aktif_soru, 0) = 0 then
    new.soru_baslangic := now()
      + make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_sn', 3)))
      + make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0);
  end if;
  return new;
end $$;
revoke all on function public.turnuva_baslangic_sayim() from public, anon, authenticated;
drop trigger if exists turnuva_baslangic_sayim on public.tournaments;
create trigger turnuva_baslangic_sayim before update of durum on public.tournaments
  for each row execute function public.turnuva_baslangic_sayim();
