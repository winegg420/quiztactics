-- Paket 35 A — EKONOMİ TESTİ: jokerler ücretsiz DEĞİL, herkes 10.000 coin ile.
--
-- Karar değişti (18 Eyl 2026): Paket 34'ün ücretsiz/sınırsız joker modu KAPATILDI. Jokerler ve
-- her şey yine coin ile alınır; bunun yerine bütün hesapların bakiyesi 10.000'e EŞİTLENİR ki
-- ekonomi gerçekten test edilsin.
--
-- Paket 34 kodu SİLİNMEDİ: jokerler_serbest() ve anahtar duruyor. Anahtar yeniden 1 yapılırsa
-- yalnız STOK/COIN serbest olur (envanterden düşmez, satın alma yok); maç içi HAK kuralları
-- (maç başına toplam hak, aynı joker maçta bir kez) artık anahtardan bağımsız, hep geçerli.
--
-- A.3 — hak kuralları kesin hali:
--   * joker_hak_kontrol: "aynı joker maçta bir kez" ve toplam hak sınırı jokerler_serbest()'ten
--     bağımsız.
--   * joker_kullan: Paket 34'ün "aynı joker aynı soruda bir kez" bloğu kaldırıldı (maçta bir kez
--     kuralı zaten daha sıkı). "Aynı soruda tek joker" diye bir kural YOK.
--   * duello_savunma_jokeri: Paket 34'ün "bu soruda Soru Değiştir zaten kullanıldı" satırı
--     kaldırıldı. Düelloda "bu soruda/turda herhangi bir joker kullandın" anlamına gelen bir
--     kontrol YOKTU; kalan satırlar (ör. "Bu soruda 50:50 zaten kullanıldı") AYNI jokerin
--     tekrarını engeller, maçta bir kez kuralıyla örtüşür, farklı jokerleri engellemez.

-- A.1.1 — ücretsiz mod kapalı. Geri açmak: deger = '1'::jsonb
insert into public.oyun_ayarlari (anahtar, deger) values ('jokerler_ucretsiz', '0'::jsonb)
on conflict (anahtar) do update set deger = excluded.deger;

-- A.1.3 — yeni hesabın başlangıç coin'i (test dönemi). Eski anahtar coin_baslangic artık okunmuyor.
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values (
  'baslangic_coin', '10000'::jsonb,
  'Test dönemi: yeni hesabın başlangıç coin bakiyesi. Yayından önce gerçek değere çekilecek.'
) on conflict (anahtar) do update set deger = excluded.deger;
update public.oyun_ayarlari
   set aciklama = 'KULLANILMIYOR (Paket 35): yerine baslangic_coin okunur'
 where anahtar = 'coin_baslangic';

-- A.1.2 — TEST DÖNEMİ: herkes eşit başlasın. EKLEME DEĞİL, EŞİTLEME.
-- 10.000 üstünde bakiyesi olan varsa o da 10.000'e iner (Ida'nın kararı).
-- Deftere (coin_hareketleri) fark yazılır: tur 'ekonomi_esitleme' (miktar = 10000 - eski bakiye,
-- eksi olabilir). 'baslangic' kullanılamaz: hesap başına tek satır kısıtı var
-- (coin_hareketleri_baslangic_tek). Yeni tür günlük kazanç tavanına SAYILMAZ (aşağıda
-- coin_gunluk_kalan'ın hariç listesine eklendi) — yoksa bugün kimse maçtan coin kazanamazdı.
create or replace function public.coin_gunluk_kalan(p_user uuid)
 returns bigint
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select greatest(0, public.ayar_sayi('coin_gunluk_tavan', 400) - coalesce((
    select sum(h.miktar) from public.coin_hareketleri h
    where h.user_id = p_user and h.miktar > 0
      and h.tur not in ('satin_alma', 'baslangic', 'ikram_iade', 'ekonomi_esitleme')
      and (h.olusturuldu at time zone 'Europe/Istanbul')::date
          = (now() at time zone 'Europe/Istanbul')::date
  ), 0));
$function$;

do $$
begin
  perform set_config('app.coin_izin', '1', true);   -- coin kolonu yalnız bu bayrakla değişir

  with eski as (
    select id, coalesce(coin, 0) as coin from public.profiles
     where coalesce(coin, 0) <> 10000
       for update
  ), guncel as (
    update public.profiles p set coin = 10000
      from eski where p.id = eski.id
    returning p.id, eski.coin as eski_coin
  )
  insert into public.coin_hareketleri (user_id, miktar, tur, referans, bakiye_sonra)
  select g.id, 10000 - g.eski_coin, 'ekonomi_esitleme', 'paket35', 10000
    from guncel g
   where exists (select 1 from auth.users u where u.id = g.id);
end $$;

-- A.1.3 — handle_new_user: canlı gövde, yalnız başlangıç coin anahtarı değişti
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, username, avatar_url, provider, davet_kodu)
  values (
    new.id,
    'oyuncu_' || substr(md5(new.id::text || random()::text), 1, 8),
    null,                                    -- Google fotoğrafı ALINMAZ
    new.raw_app_meta_data->>'provider',
    public.yeni_davet_kodu()
  );

  -- Her ödül AYRI blokta. Tek blok olsaydı birinin hatası ötekileri de geri alırdı
  -- (plpgsql'de exception bloğu örtük alt-işlemdir) — Paket 27'de tam bu oldu.
  -- Paket 35: başlangıç coin'i baslangic_coin ayarından (test dönemi 10.000)
  begin perform public.coin_ekle(new.id, public.ayar_sayi('baslangic_coin', 10000), 'baslangic', null);
  exception when others then null; end;

  begin perform public.ucretsiz_esyalari_ver(new.id);
  exception when others then null; end;

  begin perform public.ucretsiz_karakter_ve_parca_ver(new.id);
  exception when others then null; end;

  begin perform public.baslangic_jokerleri_ver(new.id);   -- Paket 27 A
  exception when others then null; end;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- A.3 — 251'deki canlı gövdeler; yalnız yukarıda sayılan satırlar değişti
CREATE OR REPLACE FUNCTION public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
begin
  -- Paket 31 B: Saf Bilgi (jokersiz) maçta hiçbir joker yok
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m where m.id = p_mac_id and coalesce(m.jokersiz, false)
  ) then
    raise exception 'Bu modda joker kullanılamaz';
  end if;

  -- Paket 31 A.3: Klasik Mod Savunma Kilidi — rakip bu soruda kilitlediyse hiçbir joker yok
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m
      join public.joker_kullanimlari k
        on k.mac_tur = '1v1'
       and k.mac_id = m.id
       and k.soru_index = m.aktif_soru
       and k.tur = 'savunma_kilidi'
       and k.user_id <> v_me
     where m.id = p_mac_id and coalesce(m.senkron, false)
  ) then
    raise exception 'Rakibin savunma jokerlerini kilitledi';
  end if;

  -- AYNI JOKER MAÇ BAŞINA BİR KEZ (Paket 27 B.1.5) — Paket 35 A.3: HER ZAMAN geçerli,
  -- jokerler_ucretsiz anahtarından bağımsız (ücretsizlik stokla ilgili, hakla değil).
  if exists (
    select 1 from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
  ) then
    raise exception 'Bu jokeri bu maçta zaten kullandın';
  end if;

  if p_mac_tur = 'duello' then
    v_sinir := public.ayar_sayi('duello_joker_hak', 4)::int;
  else
    v_sinir := public.joker_mac_siniri(p_mac_tur, p_mac_id);
  end if;

  if v_sinir = 0 then
    raise exception 'Turnuva finalinde joker kullanılamaz';
  end if;
  if v_sinir is null then
    return;                                        -- arkadaş maçı: sınırsız
  end if;

  select count(*) into v_kullanilan
    from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
  if v_kullanilan >= v_sinir then
    raise exception 'Bu maçta en fazla % joker kullanabilirsin', v_sinir;
  end if;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.joker_kullan(p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
  v_ucretsiz boolean := false;
  v_soru_id uuid;
  v_dogru smallint;
  v_kapali int[];
  v_baslangic timestamptz;
  v_aktif_soru int;
  m public.matches%rowtype;
  gm public.group_matches%rowtype;
  hm public.hizli_maclar%rowtype;
  t public.tournaments%rowtype;
  v_ben_p1 boolean;
  v_yeni_soru uuid;
  v_degisti boolean;
  v_q record;   -- soru_dilinde(): oyuncunun dilindeki metin
begin
  perform public.hiz_siniri('joker_kullan', 20, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  -- Paket 31 A: Klasik Mod'da (1v1) iki saldırı jokeri de maç içinde kullanılır.
  if not (p_tur in ('elli','sure','soru_degistir')
          -- Paket 32 A: Klasik'te Savunma Kilidi yerine Sis (düello DEĞİŞMEDİ, orası ayrı fonksiyon)
          or (p_mac_tur = '1v1' and p_tur in ('zaman_baskisi','sis'))) then
    raise exception 'Bu joker maç içinde kullanılamaz';
  end if;
  if p_mac_tur not in ('1v1','grup','hizli','turnuva') then
    raise exception 'Geçersiz maç türü';
  end if;
  -- Turnuva herkese AYNI soruyu sorar ve elemelidir: soru değiştirilemez.
  if p_mac_tur = 'turnuva' and p_tur = 'soru_degistir' then
    raise exception 'Turnuvada soru değiştirilemez';
  end if;

  if p_mac_tur = '1v1' then
    select * into m from public.matches where id = p_mac_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if v_me not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
    if m.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    v_ben_p1 := (m.oyuncu1 = v_me);
    if coalesce(m.senkron, false) then
      v_aktif_soru := m.aktif_soru;
      v_baslangic := m.soru_baslangic;
    else
      v_aktif_soru := coalesce(case when v_ben_p1 then m.oyuncu1_soru else m.oyuncu2_soru end, 0);
      v_baslangic := case when v_ben_p1 then m.oyuncu1_baslangic else m.oyuncu2_baslangic end;
    end if;
    v_soru_id := m.soru_ids[v_aktif_soru + 1];
    if exists (select 1 from public.match_answers
               where match_id = p_mac_id and user_id = v_me and soru_index = v_aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;

  elsif p_mac_tur = 'grup' then
    select * into gm from public.group_matches where id = p_mac_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if not exists (select 1 from public.group_match_players
                   where group_match_id = p_mac_id and user_id = v_me and davet_durumu = 'kabul') then
      raise exception 'Bu maçta değilsin';
    end if;
    if gm.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    v_aktif_soru := gm.aktif_soru; v_baslangic := gm.soru_baslangic;
    v_soru_id := gm.soru_ids[gm.aktif_soru + 1];
    if exists (select 1 from public.group_match_answers
               where group_match_id = p_mac_id and user_id = v_me and soru_index = gm.aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;

  elsif p_mac_tur = 'hizli' then
    select * into hm from public.hizli_maclar where id = p_mac_id for update;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if not exists (select 1 from public.hizli_oyuncular
                   where hizli_mac_id = p_mac_id and user_id = v_me and davet_durumu = 'kabul') then
      raise exception 'Bu maçta değilsin';
    end if;
    if hm.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    v_aktif_soru := hm.aktif_soru; v_baslangic := hm.soru_baslangic;
    v_soru_id := hm.soru_ids[hm.aktif_soru + 1];
    if exists (select 1 from public.hizli_cevaplar
               where hizli_mac_id = p_mac_id and user_id = v_me and soru_index = hm.aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;

  else
    select * into t from public.tournaments where id = p_mac_id for update;
    if not found then raise exception 'Turnuva bulunamadı'; end if;
    if not exists (select 1 from public.tournament_players
                   where tournament_id = p_mac_id and user_id = v_me and not elendi) then
      raise exception 'Turnuvada değilsin ya da elendin';
    end if;
    if t.durum <> 'aktif' then raise exception 'Turnuva aktif değil'; end if;
    v_aktif_soru := t.aktif_soru; v_baslangic := t.soru_baslangic;
    v_soru_id := t.soru_ids[t.aktif_soru + 1];
    if exists (select 1 from public.tournament_answers
               where tournament_id = p_mac_id and user_id = v_me and soru_index = t.aktif_soru) then
      raise exception 'Bu soruyu zaten cevapladın';
    end if;
  end if;

  -- Soru daha önce değiştirildiyse kişiye özel soru/saat geçerlidir
  if p_mac_tur <> 'turnuva' then
    v_soru_id := public.soru_id_coz(p_mac_tur, p_mac_id, v_me, v_aktif_soru, v_soru_id);
    v_baslangic := public.soru_baslangic_coz(p_mac_tur, p_mac_id, v_me, v_aktif_soru, v_baslangic);
  end if;

  if p_soru_index is not null and p_soru_index <> v_aktif_soru then
    raise exception 'Soru değişti, tekrar dene';
  end if;
  if now() > v_baslangic + interval '16 seconds' then
    raise exception 'Süre doldu';
  end if;
  -- Paket 32 A.4: Sis sürenin son klasik_sis_son_esik_sn saniyesinde kullanılamaz — YALNIZ Sis
  if p_tur = 'sis'
     and now() > v_baslangic + make_interval(secs => 15 - public.ayar_sayi('klasik_sis_son_esik_sn', 6)) then
    raise exception 'Son % saniyede Sis kullanılamaz', public.ayar_sayi('klasik_sis_son_esik_sn', 6)::int;
  end if;

  -- Paket 27 B: toplam hak + "aynı joker maçta bir kez" tek yerden (joker_hak_kontrol).
  -- Paket 35 A.3: "aynı soruda tek joker" diye bir kural YOK — farklı jokerler tek soruda
  -- arka arkaya kullanılabilir (Paket 34'ün soru başına bloğu kaldırıldı).

  perform public.joker_hak_kontrol(p_mac_tur, p_mac_id, p_tur);

  -- "Soru Değiştir maç başına 1 kez" kuralı artık BÜTÜN türler için geçerli;
  -- yukarıdaki joker_hak_kontrol uyguluyor, ayrı istisnaya gerek kalmadı.

  -- Ücretsiz 50:50 yalnız SERBEST Klasik Mod'da (Paket 27 B.1.2).
  if p_tur = 'elli' then
    v_ucretsiz := public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id);
  end if;

  -- Paket 34: ücretsiz modda envanterden düşülmez
  v_ucretsiz := v_ucretsiz or public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', p_mac_tur || ':' || p_mac_id::text);
  end if;

  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, p_mac_tur, p_mac_id, v_aktif_soru, p_tur, v_ucretsiz);

  -- Paket 31 A.2 / 32 A: Klasik saldırı jokerleri — etki rakibe (tek yer: klasik_joker_etki)
  if p_mac_tur = '1v1' and p_tur in ('zaman_baskisi','sis') then
    perform public.klasik_joker_etki(p_mac_id, v_me, v_aktif_soru, p_tur);
    return jsonb_build_object('tur', p_tur, 'ucretsiz', false, 'uygulandi', true,
      'sis_sn', case when p_tur = 'sis' then public.ayar_sayi('klasik_sis_sn', 3) end);
  end if;

  select q.dogru_cevap into v_dogru from public.questions q where q.id = v_soru_id;

  if p_tur = 'elli' then
    select array_agg(x) into v_kapali from (
      select x from generate_series(0, 3) x
      where x <> v_dogru order by random() limit 2
    ) s;
    return jsonb_build_object('tur','elli','ucretsiz',v_ucretsiz,'kapali',to_jsonb(v_kapali));

  elsif p_tur = 'sure' then
    -- Soru değiştirilmişse sayaç kişisel satırda tutuluyor; onu uzat.
    v_degisti := exists (select 1 from public.soru_degisimleri d
      where d.mac_tur = p_mac_tur and d.mac_id = p_mac_id
        and d.user_id = v_me and d.soru_index = v_aktif_soru);
    if v_degisti then
      update public.soru_degisimleri
         set baslangic = baslangic + interval '10 seconds'
       where mac_tur = p_mac_tur and mac_id = p_mac_id
         and user_id = v_me and soru_index = v_aktif_soru;
    elsif p_mac_tur = '1v1' then
      if coalesce(m.senkron, false) then
        update public.matches set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
      elsif v_ben_p1 then
        update public.matches set oyuncu1_baslangic = oyuncu1_baslangic + interval '10 seconds' where id = p_mac_id;
      else
        update public.matches set oyuncu2_baslangic = oyuncu2_baslangic + interval '10 seconds' where id = p_mac_id;
      end if;
    elsif p_mac_tur = 'grup' then
      update public.group_matches set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
    elsif p_mac_tur = 'hizli' then
      update public.hizli_maclar set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
    else
      update public.tournaments set soru_baslangic = soru_baslangic + interval '10 seconds' where id = p_mac_id;
    end if;
    return jsonb_build_object('tur','sure','ucretsiz',false,'uzatildi',true);

  else -- soru_degistir: soru atlanmaz, yerine yenisi gelir, süre baştan başlar
    v_yeni_soru := public.mac_soru_degistir(p_mac_tur, p_mac_id, v_me, v_aktif_soru);
    -- Paket 31 A.1: Klasik Mod'da soru İKİ oyuncuda da değişir (aynı soru, aynı başlangıç)
    if p_mac_tur = '1v1' and coalesce(m.senkron, false) then
      perform public.klasik_joker_etki(p_mac_id, v_me, v_aktif_soru, 'soru_degistir');
    end if;
    -- Metin oyuncunun dilinde (bkz. migration 163 soru_dilinde)
    select v_yeni_soru as id, sd.soru, sd.secenekler, sd.dogru_cevap into v_q
      from public.soru_dilinde(v_yeni_soru, public.oyuncu_dili()) sd;
    perform public.gorulen_kaydet(v_yeni_soru);
    return jsonb_build_object(
      'tur','soru_degistir','ucretsiz',false,'degisti',true,
      'soru', jsonb_build_object(
        'question_id', v_q.id,
        'soru', v_q.soru,
        'secenekler', v_q.secenekler,
        'soru_index', v_aktif_soru,
        'baslangic', (select d.baslangic from public.soru_degisimleri d
                       where d.mac_tur = p_mac_tur and d.mac_id = p_mac_id
                         and d.user_id = v_me and d.soru_index = v_aktif_soru),
        'sunucu_zamani', now(),
        'dogru_cevap', case when public.hileli_mi() then v_q.dogru_cevap else null end));
  end if;
end;
$function$


;

CREATE OR REPLACE FUNCTION public.duello_savunma_jokeri(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_kullanilan int;
  v_ucretsiz boolean := false;
  v_dogru smallint;
  v_soru uuid;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  if p_tur not in ('elli','sure','soru_degistir') then raise exception 'Geçersiz joker'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' or d.faz <> 'cevap' or d.saldiran = v_me or now() > d.faz_bitis then
    raise exception 'Savunma jokerleri yalnız cevap verirken kullanılır';
  end if;
  if d.savunma_kilidi then raise exception 'Rakip bu soruda savunma jokeri kullanamaz'; end if;
  if p_tur = 'elli' and d.elli_kapali is not null then raise exception 'Bu soruda 50:50 zaten kullanıldı'; end if;
  if p_tur = 'sure' and d.ek_sure then raise exception 'Bu soruda Ek Süre zaten kullanıldı'; end if;

  -- Paket 27 B: tek toplam hak + aynı joker maçta bir kez (joker_hak_kontrol).
  -- Düellodaki ücretsiz 50:50 KALDIRILDI: düelloda hiçbir joker ücretsiz değil.
  perform public.joker_hak_kontrol('duello', p_id, p_tur);
  -- Paket 34: ücretsiz/sınırsız modda envanterden düşülmez
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'duello:' || p_id::text);
  end if;
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, 'duello', p_id, d.tur * 2 + d.saldiri_sirasi, p_tur, v_ucretsiz);

  if p_tur = 'elli' then
    select dogru_cevap into v_dogru from public.questions where id = d.soru_id;
    update public.duellolar
       set elli_kapali = (select array_agg(x) from (select x from generate_series(0, 3) x
                            where x <> v_dogru order by random() limit 2) s),
           son_hareket = now()
     where id = p_id;
  elsif p_tur = 'sure' then
    update public.duellolar
       set ek_sure = true, faz_bitis = faz_bitis + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)),
           son_hareket = now()
     where id = p_id;
  else
    v_soru := public.duello_soru_bul(p_id, d.kategori, array[v_me, d.saldiran], d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
    update public.duellolar
       set soru_id = v_soru, soru_degisti_savunma = true, elli_kapali = null,
           kullanilan_sorular = kullanilan_sorular || v_soru,
           faz_bitis = now() + make_interval(secs =>
             case when zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn', 10)
                  else public.ayar_sayi('duello_cevap_sn', 15) end),
           son_hareket = now()
     where id = p_id;
  end if;
  perform public.duello_sinyal_ver(p_id);
end $function$


;

