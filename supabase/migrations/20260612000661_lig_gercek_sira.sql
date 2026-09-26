-- 661 (D-226 bulgusu, Ida): Lig tablosunda GÖSTERİLEN sıra, haftalık kapanıştaki GERÇEK sıra olsun.
--
-- Kök sebep: lig_grubum() içinde row_number() WHERE süzgecinden SONRA çalışıyordu — sıra yalnız görünür
-- satırlar arasında 1..N numaralanıyordu; lig_haftayi_kapat() ise grubun TÜM üyeleri (gizli botlar, henüz
-- görünmeyen hesaplar dahil, yalnız açık bot hariç) arasında sıralar. Sonuç: ekranda "#5, güvendesin" görünen oyuncu
-- kapanışta düşme bölgesinde olabilirdi (Bronz grup 1: 81 üye, 14 görünür).
--
-- Düzeltme:
--  1) lig_grubum(): sıra TÜM grup üyeleri arasında (kapanışla aynı sıralama kuralı) hesaplanır, SONRA görünürlük
--     süzülür. Gizli üyeler satır olarak yine görünmez ama sıra numaraları boşluklu ve gerçektir.
--  2) lig_haftayi_kapat(): yalnız sıralamaya `p.id asc` eşitlik bozucu eklendi (tam eşitlikte deterministik olsun;
--     lig_siralama 641'deki gibi). Başka hiçbir satırı değişmedi.
--  3) lig_grubum_ozet(): grup boyu gerçek boy (grup_boyu); komşu satırlar "görünür 2 üst + 2 alt"; yükselme çizgisi ve
--     "bir üst sıraya" puan farkı gerçek sıradan okunur.
-- İmzalar değişmedi (CREATE OR REPLACE) → mevcut yetkiler (GRANT) aynen kalır.

create or replace function public.lig_grubum()
 returns table(sira bigint, user_id uuid, gorunen_ad text, gorunen_avatar text, puan integer, ben boolean, bot boolean,
               lig text, grup_boyu integer, yukselen integer, dusen integer, sezon_bitis timestamptz, gorunum jsonb)
 language plpgsql
 security definer
 set search_path to 'public'
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

-- lig_haftayi_kapat: TEK değişiklik → sıralamada `p.id asc` eşitlik bozucu (aşağıdaki `order by` satırı).
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

create or replace function public.lig_grubum_ozet()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_tum jsonb;
  v_satirlar jsonb;
  v_ben record;
  v_boyu int; v_lig text; v_yuk int; v_dus int; v_bitis timestamptz;
  v_ust_puan int; v_cizgi_puan int;
  v_yuk_sira int; v_dus_sira int;
  v_bolge text;
  v_grup int;
  v_hafta date := public.hafta_basi();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Mevcut lig_grubum() (görünürlük kuralları onda) tek kez çağrılır
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', g.sira, 'user_id', g.user_id, 'puan', g.puan, 'ben', g.ben, 'lig', g.lig,
           'yukselen', g.yukselen, 'dusen', g.dusen, 'sezon_bitis', g.sezon_bitis, 'grup_boyu', g.grup_boyu)
           order by g.sira), '[]'::jsonb)
    into v_tum
    from public.lig_grubum() g;

  select * into v_ben from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean,
    lig text, yukselen int, dusen int, sezon_bitis timestamptz, grup_boyu int) where o.ben limit 1;
  if not found then return null; end if;

  v_lig := v_ben.lig; v_yuk := v_ben.yukselen; v_dus := v_ben.dusen; v_bitis := v_ben.sezon_bitis;
  -- 661: sıra gerçek (tüm grup üyeleri arasında) olduğundan boy da gerçek grup boyu.
  v_boyu := v_ben.grup_boyu;

  v_yuk_sira := case when v_lig = 'efsane' then null else least(v_yuk, v_boyu) end;
  v_dus_sira := case when v_lig = 'bronz' or v_boyu <= v_dus then null else v_boyu - v_dus + 1 end;

  select u.grup_no into v_grup from public.lig_uyelik u where u.user_id = v_me and u.hafta = v_hafta;

  -- Puan farkları GERÇEK sıradan okunur (gizli üyeler sıralamada durur; yalnız puan sayısı döner, kimlik değil).
  select x.puan_hafta into v_ust_puan from (
    select p.puan_hafta, row_number() over (order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc, p.id asc) as s
      from public.lig_uyelik u join public.profiles p on p.id = u.user_id
     where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)) x
   where x.s = v_ben.sira - 1;
  if v_yuk_sira is not null then
    select x.puan_hafta into v_cizgi_puan from (
      select p.puan_hafta, row_number() over (order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc, p.id asc) as s
        from public.lig_uyelik u join public.profiles p on p.id = u.user_id
       where u.hafta = v_hafta and u.lig = v_lig and u.grup_no = v_grup
         and not public.acik_bot_mu(p.is_bot, p.bot_turu)) x
     where x.s = v_yuk_sira;
  end if;

  v_bolge := case
    when v_yuk_sira is not null and v_ben.sira <= v_yuk_sira and coalesce(v_ben.puan, 0) > 0 then 'yukselme'
    when v_dus_sira is not null and v_ben.sira >= v_dus_sira then 'dusme'
    else 'guvenli' end;

  -- Komşular: benden önceki 2 + sonraki 2 GÖRÜNÜR satır (sıra numarası gerçek, aralarda boşluk olabilir).
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', o.sira, 'user_id', o.user_id, 'puan', o.puan, 'ben', o.ben,
           'ad', k.ad, 'avatar', k.avatar, 'level', k.level, 'lig', k.lig,
           'cerceve', k.cerceve, 'cerceve_nadirlik', k.cerceve_nadirlik, 'vitrin', k.vitrin,
           'aura', k.aura, 'isim_efekti', k.isim_efekti,
           'premium_cerceve', k.premium_cerceve, 'premium_aura', k.premium_aura)
           order by o.sira), '[]'::jsonb)
    into v_satirlar
    from (select t.*, row_number() over (order by t.sira) as sn
            from jsonb_to_recordset(v_tum) as t(sira bigint, user_id uuid, puan int, ben boolean)) o
    left join lateral public.oyuncu_kartlari(array[o.user_id]) k on true
   where o.sn between (select b.sn - 2 from (select t.ben, row_number() over (order by t.sira) as sn
                                               from jsonb_to_recordset(v_tum) as t(sira bigint, ben boolean)) b where b.ben)
                  and (select b.sn + 2 from (select t.ben, row_number() over (order by t.sira) as sn
                                               from jsonb_to_recordset(v_tum) as t(sira bigint, ben boolean)) b where b.ben);

  return jsonb_build_object(
    'lig', v_lig,
    'ust_lig', case when v_lig = 'efsane' then null else public.lig_adi(public.lig_sirasi(v_lig) + 1) end,
    'alt_lig', case when v_lig = 'bronz' then null else public.lig_adi(public.lig_sirasi(v_lig) - 1) end,
    'grup_boyu', v_boyu,
    'sira', v_ben.sira,
    'puan', v_ben.puan,
    'yukselen', v_yuk,
    'dusen', v_dus,
    'yukselme_sirasi', v_yuk_sira,
    'dusme_sirasi', v_dus_sira,
    'bolge', v_bolge,
    'ust_siraya_fark', case when v_ust_puan is null then null else greatest(v_ust_puan - v_ben.puan, 0) + 1 end,
    'yukselme_cizgisine_fark', case
        when v_yuk_sira is null then null
        when v_bolge = 'yukselme' then 0
        else greatest(coalesce(v_cizgi_puan, 0) - coalesce(v_ben.puan, 0), 0) + 1 end,
    'hafta_bitis', v_bitis,
    'satirlar', v_satirlar);
end;
$function$;
