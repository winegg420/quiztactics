-- 750: Lig grubu 25 kişi olsun — grup doluluğu, gösterilen grup boyu ve sıra AYNI kümeyi sayar.
--
-- KÖK (30 Eyl 2026 denetim Ö7): yeni oyuncu ana sayfada "25/76" görüyordu. Bronz grup 1'de 76 satır vardı (lig_grup_boyu = 25):
--   · lig_gruplarini_kur (haftalık karma) kurulumu bitmemiş / lig_gizli hesapları "yer kaplamaz" diye hepsini GRUP 1'e yazıyordu;
--   · lig_grubum (661) boyu ve sırayı bu hesaplar dahil TÜM satırlardan çıkarıyordu → 46 "görünmez" satır grup 1'i 76'ya şişirdi;
--   · lig_uyeligim_kur (275) doluluğu başka bir tanımla (tabloda çizilen satırlar) sayıyordu → yeni oyuncular aynı gruba üst üste
--     düşüp ilk maçtan sonra görünür hâle gelince grup 25'i aşıyordu.
--
-- TEK TANIM: GERÇEK GRUP = grup_no >= 1. Bir gerçek grubun üyesi = lig_uyelik satırı olan ve açık bot OLMAYAN herkes (oyuncular + gizli botlar).
--   Doluluk (lig_uyeligim_kur), gösterilen boy (lig_grubum.grup_boyu), sıra (lig_grubum.sira) ve hafta kapanışı (lig_haftayi_kapat)
--   hep bu kümeyi kullanır; görünür satır süzgeci (hiç maç yapmamış, az maçlı misafir) yalnız ÇİZİLECEK satırları eler, sayıyı değiştirmez.
--   Kurulumu bitmemiş / lig_gizli hesaplar artık GRUP 0 ("bekleme"): hiçbir gerçek grubu şişirmez, sıraya/ödüle/terfiye girmez.
--   Kurulumunu bitiren hesap (grup 0'da) bir sonraki lig_uyeligim_kur çağrısında yeri olan gruba ya da yeni gruba alınır.
--
-- BU MIGRATION:
--   1) lig_uyeligim_kur: yeri olan en dolu gruba / yeni gruba; uygun olmayan hesap → grup 0; grup 0'dan uygun olana geçiş;
--      aynı lig-haftada eşzamanlı iki yeni oyuncu için danışma kilidi (25'i aşma yarışı).
--   2) lig_gruplarini_kur: haftalık karma aynı kural; uygun olmayanlar grup 1 yerine grup 0.
--   3) lig_grubum: grup 0'daki hesap yalnız kendini görür (boy 1). Başka her şey 661 ile aynı.
--   4) lig_haftayi_kapat: grup 0 kapanışa girmez (ödül/terfi/pasiflik yok). Gövde canlıdaki hâlinden alındı, tek satır eklendi.
--   5) lig_gruplari_dengele (yeni, istemciye kapalı): bir gruptaki fazlayı yeri olan gruba/yeni gruba taşır.
--   6) BU HAFTA düzeltmesi: uygun olmayan satırlar grup 0'a, taşan gruplar dengelenir. Hiçbir satır SİLİNMEZ (yalnız grup_no değişir).
-- Yıkıcı değil, tekrar çalıştırılabilir. Güvenlik: security definer + search_path sabit; lig_grubum/lig_uyeligim_kur/lig_gruplarini_kur/
-- lig_haftayi_kapat'ın mevcut yetkileri CREATE OR REPLACE ile aynen korunur; yeni işlev yalnız postgres/service_role.

-- ---------------------------------------------------------------------------
-- 1) lig_uyeligim_kur
-- ---------------------------------------------------------------------------
create or replace function public.lig_uyeligim_kur(p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date := public.hafta_basi();
  v_lig text;
  v_uygun boolean;
  v_mevcut int;
  v_boyu int;
  v_gercek int;
  v_grup int;
begin
  select u.grup_no into v_mevcut
    from public.lig_uyelik u where u.user_id = p_user and u.hafta = v_hafta;
  -- Gerçek grupta zaten üye: yapılacak bir şey yok.
  if v_mevcut is not null and v_mevcut >= 1 then
    return;
  end if;

  select coalesce(p.lig, 'bronz'),
         public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
    into v_lig, v_uygun
    from public.profiles p where p.id = p_user;
  if v_lig is null then return; end if;

  -- Kurulumu bitmemiş / lig_gizli hesap: üyelik satırı yazılır ama GRUP 0 (bekleme) — gerçek grubu şişirmez.
  if not v_uygun then
    if v_mevcut is null then
      insert into public.lig_uyelik (user_id, hafta, lig, grup_no)
      values (p_user, v_hafta, v_lig, 0)
      on conflict (user_id, hafta) do nothing;
    end if;
    return;
  end if;

  -- Aynı lig-haftada iki yeni oyuncu aynı "son boş yere" düşüp grubu 25'in üstüne çıkarmasın.
  perform pg_advisory_xact_lock(hashtext('lig_uyelik:' || v_hafta::text || ':' || v_lig)::bigint);

  select count(*) into v_gercek
    from public.profiles p
   where not coalesce(p.is_bot, false) and coalesce(p.lig, 'bronz') = v_lig
     and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli);
  v_boyu := case when v_gercek < public.ayar_sayi('lig_kucuk_esik', 10)::int
                 then public.ayar_sayi('lig_grup_boyu_kucuk', 15)::int
                 else public.ayar_sayi('lig_grup_boyu', 25)::int end;

  -- Yeri olan en dolu gerçek grup. Doluluk = lig_grubum'un gösterdiği grup boyuyla AYNI küme (açık bot hariç tüm satırlar).
  select u.grup_no into v_grup
    from public.lig_uyelik u
    join public.profiles p on p.id = u.user_id
   where u.hafta = v_hafta and u.lig = v_lig and u.grup_no >= 1
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)
   group by u.grup_no
  having count(*) < v_boyu
   order by count(*) desc, u.grup_no
   limit 1;

  if v_grup is null then
    select coalesce(max(u.grup_no), 0) + 1 into v_grup
      from public.lig_uyelik u where u.hafta = v_hafta and u.lig = v_lig and u.grup_no >= 1;
  end if;

  insert into public.lig_uyelik (user_id, hafta, lig, grup_no)
  values (p_user, v_hafta, v_lig, v_grup)
  on conflict (user_id, hafta) do update
    set lig = excluded.lig, grup_no = excluded.grup_no
    where public.lig_uyelik.grup_no = 0;   -- yalnız bekleme grubundan çıkış; gerçek gruptakini ellemez
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2) lig_gruplarini_kur: canlıdaki gövde; TEK değişiklik — uygun olmayan hesaplar grup 1 yerine grup 0.
-- ---------------------------------------------------------------------------
create or replace function public.lig_gruplarini_kur(p_hafta date default null::date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date := coalesce(p_hafta, public.hafta_basi());
  v_boyu int := public.ayar_sayi('lig_grup_boyu', 25)::int;
  v_kucuk int := public.ayar_sayi('lig_grup_boyu_kucuk', 15)::int;
  v_esik int := public.ayar_sayi('lig_kucuk_esik', 10)::int;
  v_bot_tavan int := public.ayar_sayi('lig_grup_bot_tavani', 15)::int;
  v_lig text;
  v_gercek int;
  v_grup_boyu int;
  v_grup_sayisi int;
  v_bot_sinir int;
  v_toplam int := 0;
  r record;
  v_i int;
begin
  foreach v_lig in array array['bronz','gumus','altin','elmas','efsane'] loop
    select count(*) into v_gercek
      from public.profiles p
     where not coalesce(p.is_bot, false) and coalesce(p.lig, 'bronz') = v_lig
       and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli);

    -- Görünür gerçek oyuncu yoksa grup açma: bot dolu tablo kimseye bir şey anlatmaz.
    if v_gercek = 0 then continue; end if;

    v_grup_boyu := case when v_gercek < v_esik then v_kucuk else v_boyu end;
    v_grup_sayisi := greatest(1, ceil(v_gercek::numeric / v_grup_boyu)::int);
    v_bot_sinir := least(v_bot_tavan, floor((v_grup_boyu - 1) / 2.0)::int);

    -- Görünür gerçek oyuncular gruplara sırayla (karışık) dağıtılır
    v_i := 0;
    for r in
      select p.id from public.profiles p
       where not coalesce(p.is_bot, false) and coalesce(p.lig, 'bronz') = v_lig
         and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
       order by random()
    loop
      -- 217: pasif sayacı önceki haftanın (kapanışta güncellenmiş) değerinden TAŞINIR; yoksa 0
      insert into public.lig_uyelik (user_id, hafta, lig, grup_no, pasif_hafta)
      values (r.id, v_hafta, v_lig, (v_i % v_grup_sayisi) + 1,
              coalesce((select o.pasif_hafta from public.lig_uyelik o where o.user_id = r.id and o.hafta = v_hafta - 7), 0))
      on conflict (user_id, hafta) do update
        set lig = excluded.lig, grup_no = excluded.grup_no, pasif_hafta = excluded.pasif_hafta;
      v_i := v_i + 1;
      v_toplam := v_toplam + 1;
    end loop;

    -- Kurulumu bitmemiş / gizli hesaplar: üyelik yazılır, GRUP 0'a (bekleme). 750: eskiden grup 1'e yazılıp grubu şişiriyordu.
    for r in
      select p.id from public.profiles p
       where not coalesce(p.is_bot, false) and coalesce(p.lig, 'bronz') = v_lig
         and not public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
    loop
      insert into public.lig_uyelik (user_id, hafta, lig, grup_no, pasif_hafta)
      values (r.id, v_hafta, v_lig, 0,
              coalesce((select o.pasif_hafta from public.lig_uyelik o where o.user_id = r.id and o.hafta = v_hafta - 7), 0))
      on conflict (user_id, hafta) do nothing;
    end loop;

    -- Boşlukları GİZLİ bot doldurur; doluluk yalnız görünür üyelerle sayılır.
    for v_i in 1..v_grup_sayisi loop
      for r in
        select p.id from public.profiles p
         where coalesce(p.is_bot, false) and coalesce(p.bot_aktif, true)
           and p.bot_turu = 'gizli'
           and coalesce(p.lig, 'bronz') = v_lig
           and not exists (select 1 from public.lig_uyelik u
                            where u.user_id = p.id and u.hafta = v_hafta)
         order by random()
         limit least(
           v_bot_sinir,
           greatest(0, v_grup_boyu - (select count(*) from public.lig_uyelik u
                                       join public.profiles q on q.id = u.user_id
                                       where u.hafta = v_hafta and u.lig = v_lig
                                         and u.grup_no = v_i
                                         and public.lig_gorunur_mu(q.is_bot, q.takma_ad_secildi, q.avatar_onayli, q.lig_gizli))))
      loop
        insert into public.lig_uyelik (user_id, hafta, lig, grup_no)
        values (r.id, v_hafta, v_lig, v_i)
        on conflict (user_id, hafta) do nothing;
        v_toplam := v_toplam + 1;
      end loop;
    end loop;
  end loop;

  return v_toplam;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3) lig_grubum: 661 gövdesi aynen; tek ekleme — grup 0'daki (bekleme) hesap yalnız kendini görür (boy 1, sıra 1).
-- ---------------------------------------------------------------------------
create or replace function public.lig_grubum()
returns table(sira bigint, user_id uuid, gorunen_ad text, gorunen_avatar text,
              puan integer, ben boolean, bot boolean, lig text, grup_boyu integer,
              yukselen integer, dusen integer, sezon_bitis timestamp with time zone,
              gorunum jsonb)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_hafta date := public.hafta_basi();
  v_lig text;
  v_grup int;
  v_boyu int;
  v_min_mac int := public.ayar_sayi('lig_gorunur_min_mac', 1)::int;   -- Paket 28 F
begin
  if v_me is null then return; end if;

  -- 275 A: grupları kurulduktan sonra açılan hesap burada gruba yerleşir.
  perform public.lig_uyeligim_kur(v_me);

  select u.lig, u.grup_no into v_lig, v_grup
    from public.lig_uyelik u
   where u.user_id = v_me and u.hafta = v_hafta;
  if v_lig is null then return; end if;

  -- 750: bekleme grubu (kurulumu bitmemiş / lig_gizli) gerçek bir grup değil; yalnız kendi satırı.
  if v_grup = 0 then
    return query
    select 1::bigint, p.id, p.gorunen_ad, p.gorunen_avatar, p.puan_hafta, true,
           public.acik_bot_mu(p.is_bot, p.bot_turu), v_lig, 1,
           public.ayar_sayi('lig_yukselen', 5)::int,
           public.ayar_sayi('lig_dusen', 5)::int,
           public.lig_sezon_bitisi(),
           p.gorunum
      from public.profiles p where p.id = v_me;
    return;
  end if;

  -- Grup boyu = doluluk sayımıyla (lig_uyeligim_kur) AYNI küme: gerçek grubun açık bot olmayan tüm üyeleri.
  select count(*) into v_boyu
    from public.lig_uyelik u
    join public.profiles p on p.id = u.user_id
   where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
     and not public.acik_bot_mu(p.is_bot, p.bot_turu);

  -- 661: sıra TÜM grup üyeleri arasında (lig_haftayi_kapat ile aynı küme + aynı sıralama), görünürlük SONRA.
  return query
  select t.g_sira, t.g_id, t.g_ad, t.g_avatar, t.g_puan, (t.g_id = v_me), t.g_bot,
         v_lig, v_boyu,
         public.ayar_sayi('lig_yukselen', 5)::int,
         public.ayar_sayi('lig_dusen', 5)::int,
         public.lig_sezon_bitisi(),
         t.g_gorunum
    from (
      select row_number() over (order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc, p.id asc) as g_sira,
             p.id as g_id, p.gorunen_ad as g_ad, p.gorunen_avatar as g_avatar, p.puan_hafta as g_puan,
             public.acik_bot_mu(p.is_bot, p.bot_turu) as g_bot, p.gorunum as g_gorunum,
             (public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
              -- Paket 28 F: hiç maç yapmamış hesap tabloda satır tutmasın.
              and coalesce(p.toplam_mac, 0) >= v_min_mac
              -- 275 B: az oynamış misafir (deneme) hesabı satır tutmasın.
              and (coalesce(p.is_bot, false)
                   or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac))) as g_gorunur
        from public.lig_uyelik u
        join public.profiles p on p.id = u.user_id
       where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
         and not public.acik_bot_mu(p.is_bot, p.bot_turu)
    ) t
   -- Oyuncu kendi satırını her durumda görür.
   where t.g_id = v_me or t.g_gorunur
   order by t.g_sira;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4) lig_haftayi_kapat: canlıdaki gövde; TEK ekleme — `and u.grup_no >= 1` (bekleme grubu kapanışa girmez:
--    ödül, terfi/düşme, pasiflik ve unvan kancası yalnız gerçek grup üyelerine).
-- ---------------------------------------------------------------------------
create or replace function public.lig_haftayi_kapat(p_hafta date default null::date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date := coalesce(p_hafta, public.hafta_basi());   -- 217: haftalik_kapanis kapanan haftayı açıkça verir (Pazartesi 00:00'dan sonra çalışır)
  v_yuk int := public.ayar_sayi('lig_yukselen', 5)::int;
  v_dus int := public.ayar_sayi('lig_dusen', 5)::int;
  v_pasif_esik int := public.ayar_sayi('lig_pasif_dusme_hafta', 2)::int;
  v_islenen int := 0;
  r record;
begin
  -- Aynı hafta iki kez kapanmasın (cron birden çok kez deneniyor).
  if (select deger #>> '{}' from public.oyun_ayarlari where anahtar = 'lig_son_kapanis')
     = v_hafta::text then
    return 0;
  end if;

  -- Haftalık maç sayısı: pasiflik buna bakar. 217: BÜTÜN modlar (Normal Maç · Düello · Hızlı Mod · Grup · Turnuva),
  -- hafta sınırı TSİ (eskiden yalnız matches ve UTC gece yarısı).
  update public.lig_uyelik u
     set mac_sayisi = public.lig_aktif_mac_sayisi(u.user_id, v_hafta)
   where u.hafta = v_hafta;

  for r in
    select u.user_id, u.lig, u.grup_no, u.mac_sayisi, u.pasif_hafta,
           coalesce(p.is_bot, false) as bot,
           row_number() over (partition by u.lig, u.grup_no
                              order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc, p.id asc) as sira,   -- 661: + id (lig_grubum ile birebir)
           count(*) over (partition by u.lig, u.grup_no) as grup_boyu,
           p.puan_hafta
      from public.lig_uyelik u
      join public.profiles p on p.id = u.user_id
     where u.hafta = v_hafta
       -- 750: bekleme grubu (grup 0) gerçek grup değil; kapanışa girmez.
       and u.grup_no >= 1
       -- Açık bot tabloda görünmediği için sıraya da girmez.
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)
  loop
    v_islenen := v_islenen + 1;

    -- Grup içi ödül (ilk üç) — botlara coin_ekle zaten vermiyor.
    if r.sira <= 3 then
      perform public.coin_ekle(
        r.user_id,
        public.ayar_sayi('lig_odul_' || r.lig || '_' || r.sira::text, 0),
        'lig', v_hafta::text || ':' || r.lig || ':' || r.grup_no::text);
      -- 480: elmas (yalnız puan kazanmış oyuncuya; bot almaz; hata kapanışı bozmaz)
      if not r.bot and coalesce(r.puan_hafta, 0) > 0 then
        begin
          perform public.elmas_ekle(r.user_id, public.ayar_sayi('elmas_lig_' || r.sira::text, 0)::int,
                                    'lig', v_hafta::text || ':' || r.lig || ':' || r.grup_no::text);
        exception when others then
          raise warning 'lig elmasi verilemedi (%): %', r.user_id, sqlerrm;
        end;
      end if;
    end if;

    if r.bot then
      continue;                      -- BOTLAR LİG DEĞİŞTİRMEZ
    end if;

    -- 333: Efsane Lig'de haftayı grubunun 1.'si bitiren (puanla) rozeti alır; hata kapanışı bozmaz.
    if r.lig = 'efsane' and r.sira = 1 and coalesce(r.puan_hafta, 0) > 0 then
      begin
        perform public.rozet_ver(r.user_id, 'lig_efsane_bir', true, false);
      exception when others then
        raise warning 'lig_efsane_bir rozeti verilemedi (%): %', r.user_id, sqlerrm;
      end;
    end if;

    -- 643: unvan kancası (grup 1.'liği · Altın'dan yükselme); hata kapanışı bozmaz.
    begin
      perform public.unvan_lig_kapanis(r.user_id, r.lig,
        r.sira = 1 and coalesce(r.puan_hafta, 0) > 0,
        coalesce(r.mac_sayisi, 0) > 0 and r.sira <= v_yuk and coalesce(r.puan_hafta, 0) > 0 and r.lig <> 'efsane');
    exception when others then
      raise warning 'unvan kancasi calismadi (%): %', r.user_id, sqlerrm;
    end;

    -- Pasiflik takibi
    if coalesce(r.mac_sayisi, 0) = 0 then
      update public.lig_uyelik set pasif_hafta = coalesce(pasif_hafta, 0) + 1
       where user_id = r.user_id and hafta = v_hafta;
    else
      update public.lig_uyelik set pasif_hafta = 0
       where user_id = r.user_id and hafta = v_hafta;
    end if;

    if coalesce(r.mac_sayisi, 0) = 0 then
      -- 1 hafta pasif: düşmez, yerinde kalır. Üst üste 2. haftada bir lig düşer.
      if coalesce(r.pasif_hafta, 0) + 1 >= v_pasif_esik then
        update public.profiles
           set lig = public.lig_adi(greatest(1, public.lig_sirasi(r.lig) - 1))
         where id = r.user_id;
        -- 217: düşünce sayaç sıfırlanır → pasiflik sürerse her v_pasif_esik haftada bir düşer (her hafta değil)
        update public.lig_uyelik set pasif_hafta = 0 where user_id = r.user_id and hafta = v_hafta;
      end if;
      continue;
    end if;

    if r.sira <= v_yuk and coalesce(r.puan_hafta, 0) > 0 then   -- 217: 0 puanla yükselme yok (sıra ada göre kalıyordu)
      if r.lig = 'efsane' then
        perform public.award_badge(r.user_id, 'efsane_zirve');   -- üstü yok
      else
        update public.profiles
           set lig = public.lig_adi(least(5, public.lig_sirasi(r.lig) + 1))
         where id = r.user_id;
        -- 213: lig atlayınca o ligin KALICI çerçevesi (düşse de kalır)
        perform public.lig_cerceve_ver(r.user_id, public.lig_adi(least(5, public.lig_sirasi(r.lig) + 1)), 'lig_yukselme');
      end if;
    elsif r.sira > r.grup_boyu - v_dus then
      update public.profiles
         set lig = public.lig_adi(greatest(1, public.lig_sirasi(r.lig) - 1))
       where id = r.user_id;
    end if;
  end loop;

  -- Kapanış damgası (tekrar çalıştırmaya karşı)
  insert into public.oyun_ayarlari (anahtar, deger)
  values ('lig_son_kapanis', to_jsonb(v_hafta::text))
  on conflict (anahtar) do update set deger = excluded.deger;

  -- Yeni haftanın grupları: gruplar HER HAFTA yeniden karılır.
  perform public.lig_gruplarini_kur(v_hafta + 7);

  return v_islenen;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5) lig_gruplari_dengele: bir gerçek gruptaki FAZLAYI (üye sayısı > grup boyu) yeri olan gruba / yeni gruba taşır.
--    Önce botlar (ligi değiştirmezler, sıralarını bozmaz), sonra en az ilerleyen oyuncular (haftalık puanı en düşük, maçı en az).
--    Hiçbir satır silinmez; yalnız grup_no değişir. İstemciye KAPALI (yalnız postgres/service_role).
-- ---------------------------------------------------------------------------
create or replace function public.lig_gruplari_dengele(p_hafta date default null::date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date := coalesce(p_hafta, public.hafta_basi());
  v_lig text;
  v_gercek int;
  v_boyu int;
  v_hedef int;
  v_tasinan int := 0;
  g record;
  m record;
begin
  foreach v_lig in array array['bronz','gumus','altin','elmas','efsane'] loop
    perform pg_advisory_xact_lock(hashtext('lig_uyelik:' || v_hafta::text || ':' || v_lig)::bigint);

    select count(*) into v_gercek
      from public.profiles p
     where not coalesce(p.is_bot, false) and coalesce(p.lig, 'bronz') = v_lig
       and public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli);
    v_boyu := case when v_gercek < public.ayar_sayi('lig_kucuk_esik', 10)::int
                   then public.ayar_sayi('lig_grup_boyu_kucuk', 15)::int
                   else public.ayar_sayi('lig_grup_boyu', 25)::int end;

    for g in
      select u.grup_no, count(*)::int as n
        from public.lig_uyelik u
        join public.profiles p on p.id = u.user_id
       where u.hafta = v_hafta and u.lig = v_lig and u.grup_no >= 1
         and not public.acik_bot_mu(p.is_bot, p.bot_turu)
       group by u.grup_no
      having count(*) > v_boyu
       order by u.grup_no
    loop
      for m in
        select u.user_id
          from public.lig_uyelik u
          join public.profiles p on p.id = u.user_id
         where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = g.grup_no
           and not public.acik_bot_mu(p.is_bot, p.bot_turu)
         order by coalesce(p.is_bot, false) desc, coalesce(p.puan_hafta, 0) asc, coalesce(p.toplam_mac, 0) asc, p.id asc
         limit g.n - v_boyu
      loop
        -- yeri olan (kendisi hariç) en dolu gerçek grup; yoksa yeni grup
        select x.grup_no into v_hedef
          from (select u.grup_no, count(*) as n
                  from public.lig_uyelik u
                  join public.profiles p on p.id = u.user_id
                 where u.hafta = v_hafta and u.lig = v_lig and u.grup_no >= 1 and u.grup_no <> g.grup_no
                   and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                 group by u.grup_no) x
         where x.n < v_boyu
         order by x.n desc, x.grup_no
         limit 1;
        if v_hedef is null then
          select coalesce(max(u.grup_no), 0) + 1 into v_hedef
            from public.lig_uyelik u where u.hafta = v_hafta and u.lig = v_lig and u.grup_no >= 1;
        end if;
        update public.lig_uyelik set grup_no = v_hedef
         where user_id = m.user_id and hafta = v_hafta;
        v_tasinan := v_tasinan + 1;
        v_hedef := null;
      end loop;
    end loop;
  end loop;
  return v_tasinan;
end;
$function$;

revoke all on function public.lig_gruplari_dengele(date) from public, anon, authenticated;
grant execute on function public.lig_gruplari_dengele(date) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 6) BU HAFTANIN düzeltmesi (tekrar çalıştırılabilir; veri silinmez).
--    a) uygun olmayan (kurulumu bitmemiş / lig_gizli) insan hesapları gerçek gruptan grup 0'a;
--    b) taşan gruplar dengelenir.
-- ---------------------------------------------------------------------------
do $duzelt$
declare
  v_hafta date := public.hafta_basi();
  v_park int;
  v_tasinan int;
  v_ozet text;
begin
  update public.lig_uyelik u
     set grup_no = 0
    from public.profiles p
   where p.id = u.user_id and u.hafta = v_hafta and u.grup_no >= 1
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)
     and not public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli);
  get diagnostics v_park = row_count;

  v_tasinan := public.lig_gruplari_dengele(v_hafta);

  select string_agg(x.lig || '#' || x.grup_no || '=' || x.n, ', ' order by x.lig, x.grup_no) into v_ozet
    from (select u.lig, u.grup_no, count(*) as n
            from public.lig_uyelik u join public.profiles p on p.id = u.user_id
           where u.hafta = v_hafta and not public.acik_bot_mu(p.is_bot, p.bot_turu)
           group by u.lig, u.grup_no) x;
  raise notice '750: % satır bekleme grubuna (0) alındı, % üye taşan gruptan taşındı. Gruplar: %', v_park, v_tasinan, v_ozet;
end
$duzelt$;
