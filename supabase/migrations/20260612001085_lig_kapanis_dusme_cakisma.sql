-- 1085 — Lig kapanışı: küçük grupta düşme yalnız yükselme bölgesiyle çakışmayan sıralara uygulanır
-- (GPT denetimi 13 Eki 2026, madde 3).
-- Ölçüm: if/elsif yüzünden aynı oyuncu hem yükselip hem düşmüyordu. Ama 8 kişilik grupta (yükselen 5,
-- düşen 5) ilk 5'te olup 0 puanla yükselemeyen oyuncu "sira > grup_boyu - düşen" (sira > 3) koluna
-- düşüyor ve bir alt lige iniyordu; ekran ise o sırayı yükselme bölgesi gösteriyor ve düşme yazmıyordu.
-- Düzeltme: düşme sınırı greatest(grup_boyu - düşen, yükselen). Ekrandaki LeaderboardPage
-- (dusmeSiniri > yukselen) ve kurallar yazısı ile aynı tanım. Başka satır değişmez; imza/GRANT aynı.
CREATE OR REPLACE FUNCTION public.lig_haftayi_kapat(p_hafta date DEFAULT NULL::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    elsif r.sira > greatest(r.grup_boyu - v_dus, v_yuk) then   -- 1085: yükselme bölgesiyle çakışan sıra düşmez
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
