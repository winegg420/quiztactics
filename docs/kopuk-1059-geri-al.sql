-- 1059 geri alma: kopukluk eski kurala döner (algılama 25 sn, bekleme 45 sn; Klasik 12 + 45, bot maçı 57 sn).
-- Fonksiyonlar 1059 öncesi canlı tanımlardır (pg_get_functiondef, 11 Eki 2026). İçinde begin/commit YOK; provadan çalıştırılmaz.
-- İstemci mac_kopuk_toplam_sn yoksa 60 gösterir: geri alınca KopukPerde/bant kalan süresi sunucunun durum.kopuk.bitis'inden okunur (Düello/Hazine),
-- Klasik perdesi için ayarı 45'e çekmek yeterli (satır silinmez).

update public.oyun_ayarlari set deger = '25'::jsonb where anahtar in ('duello_kopuk_sn', 'kasa_kopuk_sn');
update public.oyun_ayarlari set deger = '45'::jsonb where anahtar = 'mac_kopuk_toplam_sn';

CREATE OR REPLACE FUNCTION public.duello4_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)),
                                 make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));
  v_secim_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.surum <> 4 then return; end if;

  -- ---------- KOPUKLUK KAPISI (duello2_ilerlet ile aynı) ----------
  v_kopuk := public.duello_kopuk_kim(p_id);
  if v_kopuk is not null then
    if d.kopuk_at is null then
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban),
             kopuk_kalan1 = case when d.bitis1 is not null then greatest(d.bitis1 - now(), v_taban) end,
             kopuk_kalan2 = case when d.bitis2 is not null then greatest(d.bitis2 - now(), v_taban) end
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;
    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      perform public.duello_bitir(p_id, case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;
    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end
     where id = p_id;
    return;
  end if;
  if d.kopuk_at is not null then
    update public.duellolar
       set kopuk_at = null, kopuk_kalan = null, kopuk_kalan1 = null, kopuk_kalan2 = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end,
           son_hareket = now()
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into d from public.duellolar where id = p_id;
    exit when not found or d.durum <> 'aktif';

    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    if d.faz in ('notr', 'cevap', 'son') then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ geç varış payı) doldu → çözümle.
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_kapanis)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_kapanis);
      perform public.duello4_cozumle(p_id);
    elsif d.faz = 'kart' then
      exit when now() < d.faz_bitis + v_secim_pay;
      perform public.duello4_kart_oto(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello4_sonraki(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$
;

CREATE OR REPLACE FUNCTION public.duello2_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kat text;
  v_tol interval := make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1));
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)), make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));   -- 991
  v_secim_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);   -- 991
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (eski akışla aynı; kişisel bitişler de donar) ----------
  v_kopuk := public.duello_kopuk_kim(p_id);
  if v_kopuk is not null then
    if d.kopuk_at is null then
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban),
             kopuk_kalan1 = case when d.bitis1 is not null then greatest(d.bitis1 - now(), v_taban) end,
             kopuk_kalan2 = case when d.bitis2 is not null then greatest(d.bitis2 - now(), v_taban) end
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;

    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      perform public.duello_bitir(p_id, case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;

    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end
     where id = p_id;
    return;
  end if;

  if d.kopuk_at is not null then
    update public.duellolar
       set kopuk_at = null, kopuk_kalan = null, kopuk_kalan1 = null, kopuk_kalan2 = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end,
           son_hareket = now()
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into d from public.duellolar where id = p_id;
    exit when not found or d.durum <> 'aktif';

    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    if d.faz = 'kategori' then
      exit when now() < d.faz_bitis + v_secim_pay;   -- 991: geç varan seçim payı
      -- Süre doldu: uygun kategorilerden RASTGELE; 470: savunanın zayıf kategorisi başka seçenek
      -- varsa seçilmez (saldıran seçmediği bir risk yüzünden can kaybetmesin).
      v_kat := public.duello2_otomatik_kategori(p_id);
      perform public.duello2_soru_ac(p_id, v_kat);
    elsif d.faz = 'cevap' then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ tolerans) doldu → çözümle.
      -- 991: cevaplamayan için kişisel bitiş + geç varış payı; ikisi de cevapladıysa beklenmez
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_kapanis)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_kapanis);
      perform public.duello2_cozumle(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello2_sonraki(p_id);
    elsif d.faz = 'ban' then
      -- 853: savunma banı süresi doldu → ban yok, saldıran bütün uygun kategorilerden seçer.
      exit when now() < d.faz_bitis;
      perform public.duello2_ban_bitir(p_id, null);
    elsif d.faz = 'secim' then
      -- 960: seçim süresi doldu → sunucu sıradaki oyuncu için seçer (kendi en yüksek yüzdesi; bot: bot seçimi).
      exit when now() < d.faz_bitis + v_secim_pay;   -- 991
      perform public.duello2_secim_oto(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$
;

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
end $function$
;

CREATE OR REPLACE FUNCTION public.mac_nabiz(p_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, rakip_hazir boolean, rakip_baglantili boolean, duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, terk_eden uuid, lobi_saniye integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $function$
#variable_conflict use_column
declare
  m public.matches%rowtype;
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_hazir boolean;
  v_ben_hazir boolean;
  v_rakip_bagli boolean;
  v_duraklama int := 0;
  v_terk uuid;
  v_geri_sayim int := public.ayar_sayi('mac_geri_sayim_sn', 3)::int;
  v_sayim_payi interval := make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0);   -- 651
  v_loadout int := public.ayar_sayi('loadout_secim_sn', 20)::int;
  v_lobi int := 0;
  v_lobi_bas timestamptz;
  v_sure_doldu boolean := false;
  v_baglanma int := public.ayar_sayi('klasik_baglanma_sn', 15)::int;   -- 441
  v_baglanma_doldu boolean := false;
  v_rakip_hic_gelmedi boolean := false;
  v_kilit boolean := true;   -- 1056
begin
  -- 1056: maç satırı 2 sn'de kilitlenemezse kilitsiz okuma (yalnız görünüm + kendi nabzın);
  -- başlatma/duraklatma/terk geçişleri yalnız kilidi alan çağrıda yapılır.
  begin
    select * into m from public.matches where id = p_match_id for update;
  exception when lock_not_available then
    v_kilit := false;
    select * into m from public.matches where id = p_match_id;
  end;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;

  v_ben_p1 := (m.oyuncu1 = auth.uid());
  v_rakip := case when v_ben_p1 then m.oyuncu2 else m.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;

  -- Eski (asenkron) maç: kapı ve kilit yok.
  if not coalesce(m.senkron, false) then
    return query select m.durum, true, true, true, true, false, 0,
                        m.soru_baslangic, now(), m.terk_eden, 0;
    return;
  end if;

  if not v_kilit then
    null;   -- 1056: satır kilitliyken nabız bir sonraki tikte yazılır
  elsif v_ben_p1 then
    update public.matches
       set oyuncu1_hazir_at = now(),
           oyuncu1_hazir = oyuncu1_hazir or coalesce(p_hazir, false),
           lobi_baslangic = coalesce(lobi_baslangic, now())
     where id = p_match_id;
  else
    update public.matches
       set oyuncu2_hazir_at = now(),
           oyuncu2_hazir = oyuncu2_hazir or coalesce(p_hazir, false),
           lobi_baslangic = coalesce(lobi_baslangic, now())
     where id = p_match_id;
  end if;
  select * into m from public.matches where id = p_match_id;

  v_ben_hazir := case when v_ben_p1 then m.oyuncu1_hazir else m.oyuncu2_hazir end;
  v_rakip_hazir := (coalesce(v_rakip_bot, false)
                    and public.bot_hazir_mi(v_rakip, m.lobi_baslangic, p_match_id::text))
    or (case when v_ben_p1 then m.oyuncu2_hazir else m.oyuncu1_hazir end);
  v_rakip_bagli := coalesce(v_rakip_bot, false) or
    coalesce(case when v_ben_p1 then m.oyuncu2_hazir_at else m.oyuncu1_hazir_at end,
             '-infinity'::timestamptz) > now() - interval '12 seconds';

  -- 410: lobi başı — davet kabulünden önceki nabızlar sayılmaz.
  v_lobi_bas := greatest(m.lobi_baslangic, coalesce(m.kabul_at, m.lobi_baslangic));
  v_sure_doldu := v_lobi_bas is not null and v_loadout > 0
                  and now() >= v_lobi_bas + make_interval(secs => v_loadout);

  -- 441: rakip kapıya HİÇ gelmediyse (tek nabız yok) bekleme klasik_baglanma_sn (15); loadout süresi ayrı (20).
  v_baglanma_doldu := v_lobi_bas is not null and v_baglanma > 0
                      and now() >= v_lobi_bas + make_interval(secs => v_baglanma);
  v_rakip_hic_gelmedi := not coalesce(v_rakip_bot, false)
    and (case when v_ben_p1 then m.oyuncu2_hazir_at else m.oyuncu1_hazir_at end) is null;

  if not v_kilit then
    null;   -- 1056: geçiş yok, yalnız görünüm
  elsif m.durum = 'aktif' and not m.basladi then
    if v_rakip_bagli and ((v_ben_hazir and v_rakip_hazir) or v_sure_doldu) then
      -- 410: süre dolduysa iki taraf da hazır sayılır (son kayıtlı set kullanılır).
      update public.matches
         set basladi = true, aktif_soru = 0,
             oyuncu1_hazir = true, oyuncu2_hazir = true,
             soru_baslangic = now() + (v_geri_sayim || ' seconds')::interval + v_sayim_payi,   -- 651
             oyuncu1_soru = 0, oyuncu2_soru = 0,
             oyuncu1_baslangic = null, oyuncu2_baslangic = null
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;
      v_ben_hazir := true;
      v_rakip_hazir := true;

    elsif ((v_sure_doldu and not v_rakip_bagli) or (v_baglanma_doldu and v_rakip_hic_gelmedi))
          and m.kabul_at is null then
      -- 410: eşleştirme maçı, rakip bağlanmadı → CEZASIZ iptal (mac_sonuclandir çağrılmaz:
      -- kazanan/puan/coin/lig/XP yok; bildirim yok).
      update public.matches
         set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;
    end if;

  elsif m.durum = 'aktif' and m.basladi then
    if not v_rakip_bagli and m.duraklatildi_at is null then
      update public.matches set duraklatildi_at = now() where id = p_match_id;
      select * into m from public.matches where id = p_match_id;

    elsif v_rakip_bagli and m.duraklatildi_at is not null then
      update public.matches
         set soru_baslangic = soru_baslangic + (now() - m.duraklatildi_at),
             duraklatildi_at = null
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;

    elsif not v_rakip_bagli and m.duraklatildi_at is not null
          and now() > m.duraklatildi_at + interval '45 seconds' then
      update public.matches set terk_eden = v_rakip where id = p_match_id;
      perform public.mac_sonuclandir(p_match_id, auth.uid(), v_rakip);
      select * into m from public.matches where id = p_match_id;
    end if;
  end if;

  if m.duraklatildi_at is not null then
    v_duraklama := greatest(0, extract(epoch from (now() - m.duraklatildi_at))::int);
  end if;
  if v_lobi_bas is not null and not m.basladi then
    v_lobi := greatest(0, extract(epoch from (now() - v_lobi_bas))::int);
  end if;
  v_terk := m.terk_eden;

  return query select m.durum, m.basladi, v_ben_hazir, v_rakip_hazir, v_rakip_bagli,
                      (m.duraklatildi_at is not null), v_duraklama,
                      m.soru_baslangic, now(), v_terk, v_lobi;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.advance_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
AS $function$
declare
  m public.matches%rowtype;
  v_kazanan uuid;
  v_kaybeden uuid;
  v_toplam int;
  v_ikisi_bitti boolean;
  v_terk boolean;
  v_cevap_sayisi int;
  v_yeni int;
  v_bas timestamptz;
begin
  -- 1056: satır 2 sn'de kilitlenemezse beklemeden çık; ilerletmeyi kilidi tutan çağrı yapıyor.
  begin
    select * into m from public.matches where id = p_match_id for update;
  exception when lock_not_available then return;
  end;
  if not found or m.durum <> 'aktif' then return; end if;
  if auth.uid() is not null and auth.uid() not in (m.oyuncu1, m.oyuncu2) then return; end if;

  v_toplam := coalesce(array_length(m.soru_ids, 1), 0);

  -- 460 (terk kuralı): bota karşı başlamış maçta insan oyuncunun nabzı 57 sn (12 sn kopukluk +
  -- 45 sn bekleme — insan-insan maçındaki mac_nabiz kuralıyla aynı) gelmediyse maçı terk etmiş
  -- sayılır: bot kazanır, terk eden ödül almaz. (İnsan-insan maçında bunu mac_nabiz yapar.)
  if coalesce(m.senkron, false) and m.basladi and m.terk_eden is null then
    select case
             when coalesce(p1.is_bot, false) and not coalesce(p2.is_bot, false)
                  and coalesce(m.oyuncu2_hazir_at, '-infinity'::timestamptz) < now() - interval '57 seconds' then m.oyuncu2
             when coalesce(p2.is_bot, false) and not coalesce(p1.is_bot, false)
                  and coalesce(m.oyuncu1_hazir_at, '-infinity'::timestamptz) < now() - interval '57 seconds' then m.oyuncu1
           end
      into v_kaybeden
      from public.profiles p1, public.profiles p2
     where p1.id = m.oyuncu1 and p2.id = m.oyuncu2;
    if v_kaybeden is not null then
      update public.matches set terk_eden = v_kaybeden where id = p_match_id;
      perform public.mac_sonuclandir(p_match_id,
        case when v_kaybeden = m.oyuncu1 then m.oyuncu2 else m.oyuncu1 end, v_kaybeden);
      return;
    end if;
  end if;

  if coalesce(m.senkron, false) then
    if not m.basladi or m.soru_baslangic is null then return; end if;
    if m.duraklatildi_at is not null then return; end if;
    if now() < m.soru_baslangic - public.soru_gosterim_payi() then return; end if;   -- 326: gösterim payı içinde cevaplanabilir

    if m.aktif_soru < v_toplam then
      select count(*) into v_cevap_sayisi
        from public.match_answers a
       where a.match_id = p_match_id and a.soru_index = m.aktif_soru;

      v_bas := public.soru_son_baslangic('1v1', p_match_id, m.aktif_soru, m.soru_baslangic);
      -- 991: cevaplamayan oyuncu (süre dolumu bildirmemişse) bitiş + geç varış payı kadar beklenir
      if v_cevap_sayisi < 2 and now() <= v_bas + interval '15 seconds' + greatest(interval '1 second', make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision)) then
        return;
      end if;

      v_yeni := m.aktif_soru + 1;
      update public.matches
         set aktif_soru = v_yeni,
             soru_baslangic = now() + public.soru_gosterim_payi(),   -- 326
             oyuncu1_soru = v_yeni,
             oyuncu2_soru = v_yeni,
             oyuncu1_baslangic = null,
             oyuncu2_baslangic = null,
             oyuncu1_bitti_at = case when v_yeni >= v_toplam then now() else oyuncu1_bitti_at end,
             oyuncu2_bitti_at = case when v_yeni >= v_toplam then now() else oyuncu2_bitti_at end
       where id = p_match_id;

      if v_yeni < v_toplam then return; end if;
    end if;
  else
    v_ikisi_bitti := (m.oyuncu1_soru >= v_toplam and m.oyuncu2_soru >= v_toplam);
    v_terk := (
      (m.oyuncu1_soru >= v_toplam or m.oyuncu2_soru >= v_toplam)
      and coalesce(m.oyuncu1_bitti_at, m.oyuncu2_bitti_at) < now() - interval '24 hours'
    );
    if not (v_ikisi_bitti or v_terk) then
      return;
    end if;
  end if;

  select * into m from public.matches where id = p_match_id;
  if m.oyuncu1_skor > m.oyuncu2_skor then v_kazanan := m.oyuncu1; v_kaybeden := m.oyuncu2;
  elsif m.oyuncu2_skor > m.oyuncu1_skor then v_kazanan := m.oyuncu2; v_kaybeden := m.oyuncu1;
  else v_kazanan := null; v_kaybeden := null;
  end if;

  perform public.mac_sonuclandir(p_match_id, v_kazanan, v_kaybeden);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duello_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_savunan uuid;
  v_dil text := public.oyuncu_dili();
  v_soru_goster boolean;
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_envanter jsonb;
  v_kullanim jsonb;
  v_sonuc jsonb;     -- 760
  v_kopuk uuid;      -- 760
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum in (2, 4)) then
    v_sonuc := case when (select x.surum from public.duellolar x where x.id = p_id) = 4
                    then public.duello4_durum(p_id) else public.duello2_durum(p_id) end;   -- 1015: v4   -- kilit + tembel ilerletme bunun içinde (duello_kilitle)
    -- 760: kopukluk dondurması istemciye açıkça bildirilir. Kopukken duello2_ilerlet her çağrıda faz bitişini
    -- "şimdi + kalan (en az duello_kopuk_taban_sn)" diye ileri iter; istemci bu bitişi sayaç diye çizince geri
    -- sayım ~2 sn'de bir yeniden "3"ten başlıyordu (30 Eyl gece, 45 sn'de ~22 kez). Artık istemci 'kopuk'
    -- görünce sayacı donuk kalanla gösterir, bekleme süresini (bitis) bantta sayar.
    select * into d from public.duellolar where id = p_id;
    if d.durum = 'aktif' and d.kopuk_at is not null then
      v_kopuk := public.duello_kopuk_kim(p_id);
      v_sonuc := v_sonuc || jsonb_build_object('kopuk', jsonb_build_object(
        'ben_mi', v_kopuk is not null and v_kopuk = v_me,
        'bitis', d.kopuk_at + make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)),
        'faz_kalan_sn', round(extract(epoch from coalesce(
            case when d.faz = 'cevap' then case when v_me = d.oyuncu1 then d.kopuk_kalan1 else d.kopuk_kalan2 end end,
            d.kopuk_kalan))::numeric, 2)));
    end if;
    return v_sonuc;
  end if;
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_rakip := case when d.oyuncu1 = v_me then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;

  v_soru_goster := d.soru_id is not null and (
       (d.faz = 'hazirlik' and d.saldiran = v_me)
    or d.faz in ('cevap','sonuc','altin')
    or d.durum <> 'aktif');
  if v_soru_goster then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object(
             'ben', count(*) filter (where x.kazanan = v_me),
             'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.duellolar x
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

  select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) into v_envanter
    from public.joker_envanter e where e.user_id = v_me;
  select jsonb_build_object(
           'saldiri', count(*) filter (where k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'saldiri_ucretsiz', count(*) filter (where k.ucretsiz and k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'savunma', count(*) filter (where k.tur in ('elli','sure','soru_degistir')),
           'elli_ucretsiz', bool_or(k.tur = 'elli' and k.ucretsiz),
           'soru_degistir', bool_or(k.tur = 'soru_degistir'),
           -- Paket 27 B: aynı tür maçta bir kez — istemci hangi türün
           -- tükendiğini bilsin ki düğmeyi boşuna açmasın.
           'turler', coalesce(jsonb_agg(distinct k.tur) filter (where k.tur is not null), '[]'::jsonb))
    into v_kullanim
    from public.joker_kullanimlari k where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id;

  return jsonb_build_object(
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', now(),
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1, 'zayif', d.zayif1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2, 'zayif', d.zayif2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
    'kullanim', jsonb_build_object(d.oyuncu1::text, public.duello_kategori_kullanimi(p_id, d.oyuncu1),
                                   d.oyuncu2::text, public.duello_kategori_kullanimi(p_id, d.oyuncu2)),
    'kategori', d.kategori,
    'soru', v_soru,
    'elli_kapali', case when v_me = v_savunan and d.faz = 'cevap' then to_jsonb(d.elli_kapali) end,
    'zaman_baskisi', d.zaman_baskisi, 'savunma_kilidi', d.savunma_kilidi, 'ek_sure', d.ek_sure,
    'soru_degisti_saldiri', d.soru_degisti_saldiri,
    'son_hamle', case when d.faz in ('sonuc','kategori','altin') or d.durum <> 'aktif' then d.son_hamle end,
    'altin', case when d.faz = 'altin' then jsonb_build_object(
                    'ben_cevapladim', d.altin_cevaplar ? v_me::text,
                    'benim_cevabim', d.altin_cevaplar -> v_me::text -> 'cevap',
                    'rakip_cevapladi', d.altin_cevaplar ? v_rakip::text) end,
    'jokerler', jsonb_build_object(
       'envanter', v_envanter, 'kullanim', v_kullanim,
       -- Paket 27 B: tek toplam hak. Eski alanlar (saldiri_siniri/savunma_siniri/
       -- ucretsiz_saldiri) eski istemci sürümü kırılmasın diye aynı yapıda
       -- doldurulmaya devam ediyor; yeni istemci 'hak' ve 'kullanilan'a bakar.
       'hak', public.ayar_sayi('duello_joker_hak', 4),
       'kullanilan', (select count(*) from public.joker_kullanimlari k2
                       where k2.user_id = v_me and k2.mac_tur = 'duello' and k2.mac_id = p_id),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me),
       'saldiri_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'savunma_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'ucretsiz_saldiri', public.ayar_sayi('duello_ucretsiz_saldiri_joker', 0)),
    'sureler', jsonb_build_object('cevap', public.ayar_sayi('duello_cevap_sn', 15),
       'zaman_baskisi', public.ayar_sayi('duello_zaman_baskisi_sn', 10),
       'hazirlik', public.ayar_sayi('duello_hazirlik_sn', 4),
       'kategori', public.ayar_sayi('duello_kategori_sn', 20),
       'altin', public.ayar_sayi('duello_altin_sn', 15),
       -- Paket 28 A: düello ekranının kendi nabız aralığı. Sunucu hesaplıyor ki
       -- istemci kopukluk eşiğinden yavaş atıp kendini "kopuk" göstermesin.
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25)),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.kasa_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '2s'
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
  -- 1055: kilit 2 sn içinde alınamazsa (DB yavaş / sıra uzun) 500 yerine KİLİTSİZ anlık görüntü dön.
  -- İlerletme (kasa_ilerlet) o yoklamada atlanır; bir sonraki yoklama ya da diğer oyuncu ilerletir.
  begin
    k := public.kasa_kilitle(p_id);
  exception when lock_not_available then
    select * into k from public.kasa_maclari where id = p_id;
    if not found then raise exception 'Maç bulunamadı'; end if;
    if v_me is null or v_me not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  end;
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
  -- 1052 basılı tut: doğru şık YALNIZ hileli_mi() hesabına ve yalnız kendi cevap hakkı sürerken (normal oyuncuda alan yok).
  if v_soru is not null and k.durum = 'aktif' and k.faz = 'cevap' and not (coalesce(k.cevaplar, '{}'::jsonb) ? v_me::text) and public.hileli_mi() then
    v_soru := v_soru || jsonb_build_object('dogru_cevap', (select q.dogru_cevap from public.questions q where q.id = k.soru_id));
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
    -- 987: Savunma Hakkı (iki oyuncuya da görünür) + bekleyen/süren/biten Savunma Sorusu
    'savunma_acik', k.savunma_acik,
    'savunma_hak', to_jsonb(coalesce(k.savunma_hak, '{}'::uuid[])),
    'savunma', case when k.durum = 'aktif' then k.savunma end,
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

CREATE OR REPLACE FUNCTION public.duello_baglanti(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_kopuk uuid;
  v_bekleme numeric := public.ayar_sayi('duello_kopuk_bekleme_sn', 45);
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.duellolar where id = p_id;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if v_me not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  v_kopuk := public.duello_kopuk_kim(p_id);
  return jsonb_build_object(
    'kopuk', v_kopuk is not null,
    'ben_mi', v_kopuk is not null and v_kopuk = v_me,
    'kalan_sn', case
      when v_kopuk is null or d.kopuk_at is null then null
      else greatest(0, ceil(v_bekleme - extract(epoch from (now() - d.kopuk_at))))::int end,
    'bekleme_sn', v_bekleme::int,
    'sunucu_zamani', now()
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duello_bitir(p_id uuid, p_kazanan uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_bot_var boolean;
  v_acik_bot boolean;
  v_carpan numeric := 1;
  v_lig int;
  v_kazanan_bot boolean;
  v_oyuncu uuid;
  v_terk uuid;   -- 460: maçı yarıda bırakan (ödül yok)
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;
  perform public.odul_baglam('duello:' || p_id::text);   -- Paket 20 I.3

  -- 460: terk — duello_terk önceden yazar; kopukluk süresi dolan oyuncu (duello_ilerlet /
  -- duello2_ilerlet bu fonksiyonu kalan oyuncuyu kazanan yaparak çağırır) burada bulunur.
  v_terk := d.terk_eden;
  if v_terk is null and d.kopuk_at is not null
     and d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
    v_terk := public.duello_kopuk_kim(p_id);
  end if;
  if v_terk is not distinct from p_kazanan then v_terk := null; end if;

  select bool_or(coalesce(p.is_bot, false)),
         bool_or(coalesce(p.is_bot, false) and coalesce(p.bot_turu, 'acik') = 'acik')
    into v_bot_var, v_acik_bot
    from public.profiles p where p.id in (d.oyuncu1, d.oyuncu2);

  if not coalesce(v_bot_var, false) then
    v_carpan := public.cift_odul_carpani(d.oyuncu1, d.oyuncu2, null);
  end if;

  update public.duellolar
     set durum = 'bitti', kazanan = p_kazanan, bitis = now(), odul_carpan = v_carpan,
         faz = case when faz = 'altin' then 'sonuc' else faz end, son_hareket = now(),
         terk_eden = v_terk
   where id = p_id;

  -- Coin: dereceli tam, serbest yarı; indirimler çarpılmaz (coin_mac_odulu).
  -- Terk eden kazanan olamaz → coin almaz.
  perform public.coin_mac_odulu('duello:' || p_id::text, p_kazanan, array[d.oyuncu1, d.oyuncu2],
                                v_carpan, not d.dereceli, coalesce(v_acik_bot, false),
                                'coin_duello_galibiyet');

  -- P2A: XP (serbest dahil tam; çift koruması / açık bot indirimi; tek sefer). 460: terk edene XP yok.
  perform public.xp_mac_odulu('duello:' || p_id::text, 'duello', p_kazanan,
                              array_remove(array[d.oyuncu1, d.oyuncu2], v_terk),
                              v_carpan, coalesce(v_acik_bot, false));

  foreach v_oyuncu in array array[d.oyuncu1, d.oyuncu2] loop
    -- 460: terk edenin günlük serisi ilerlemez (maç sayısı istatistik olarak sayılır)
    perform public.mac_sayaci_arttir(v_oyuncu, v_oyuncu is distinct from v_terk);
    perform public.istatistikli_mac_arttir(v_oyuncu);
  end loop;

  if p_kazanan is not null then
    perform public.award_badge(p_kazanan, 'ilk_galibiyet');
  end if;

  if d.dereceli then
    if p_kazanan is not null then
      select coalesce(is_bot, false) into v_kazanan_bot from public.profiles where id = p_kazanan;
      v_lig := floor(public.ayar_sayi('lig_duello_galibiyet', 50) * v_carpan *
                     (case when v_kazanan_bot then public.ayar_sayi('lig_bot_puan_yuzde', 40)::numeric / 100 else 1 end))::int;
      if v_lig > 0 then
        update public.profiles set puan = puan + v_lig, puan_hafta = puan_hafta + v_lig where id = p_kazanan;
      end if;
      perform public.odul_kalem_yaz(p_kazanan, 'galibiyet', greatest(v_lig, 0), 0, public.odul_lig_indirimi(v_carpan));
    end if;
    foreach v_oyuncu in array array[d.oyuncu1, d.oyuncu2] loop
      continue when v_oyuncu is not distinct from v_terk;   -- 460: terk edene seri bonusu yok
      perform public.gunluk_seri_bonusu(v_oyuncu);
    end loop;
  end if;

  perform public.odul_baglam(null);
  perform public.duello_sinyal_ver(p_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.kasa_bitir(p_id uuid, p_kazanan uuid, p_neden text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  k public.kasa_maclari%rowtype;
  v_bot_var boolean;
  v_acik_bot boolean;
  v_carpan numeric := 1;
  v_odul numeric;
  v_lig int;
  v_kazanan_bot boolean;
  v_oyuncu uuid;
  v_terk uuid;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;
  perform public.odul_baglam('kasa:' || p_id::text);

  -- Terk (460): kasa_terk önceden yazar; kopukluk süresi dolan burada bulunur. Terk eden kazanamaz.
  v_terk := k.terk_eden;
  if v_terk is null and k.kopuk_at is not null
     and k.kopuk_at < now() - make_interval(secs => public.ayar_sayi('kasa_kopuk_bekleme_sn', 45)) then
    v_terk := public.kasa_kopuk_kim(p_id);
  end if;
  if v_terk is not distinct from p_kazanan then v_terk := null; end if;

  select bool_or(coalesce(p.is_bot, false)),
         bool_or(coalesce(p.is_bot, false) and coalesce(p.bot_turu, 'acik') = 'acik')
    into v_bot_var, v_acik_bot
    from public.profiles p where p.id in (k.oyuncu1, k.oyuncu2);

  -- Aynı çift günlük sınırı + aynı cihaz/IP (Klasik gibi; botla maçta uygulanmaz)
  if not coalesce(v_bot_var, false) then
    v_carpan := public.cift_odul_carpani(k.oyuncu1, k.oyuncu2, p_id);
  end if;
  -- KASA ek çarpanı: tek ayarla ödüller kapatılabilir
  v_odul := case when public.ayar_sayi('kasa_odul_acik', 1) >= 1
                 then greatest(0, public.ayar_ondalik('kasa_odul_carpani', 1)) else 0 end;
  v_carpan := v_carpan * v_odul;

  update public.kasa_maclari
     set durum = 'bitti', kazanan = p_kazanan, bitis = now(), odul_carpan = v_carpan,
         odul_acik = v_odul > 0, terk_eden = v_terk, son_hareket = now(),
         sonuc_neden = coalesce(p_neden, case when v_terk is not null then 'terk' end)
   where id = p_id;

  -- Coin: Klasik değerleri (coin_mac_*), serbest/açık bot/çift indirimi "en düşüğü" kuralıyla
  perform public.coin_mac_odulu('kasa:' || p_id::text, p_kazanan, array[k.oyuncu1, k.oyuncu2],
                                v_carpan, not k.dereceli, coalesce(v_acik_bot, false));
  -- XP: Klasik değerleri (xp_mac_*); terk edene yok
  perform public.xp_mac_odulu('kasa:' || p_id::text, 'kasa', p_kazanan,
                              array_remove(array[k.oyuncu1, k.oyuncu2], v_terk),
                              v_carpan, coalesce(v_acik_bot, false));

  foreach v_oyuncu in array array[k.oyuncu1, k.oyuncu2] loop
    -- Günlük seri yalnız ödüllü maçta ve terk etmeyende ilerler
    perform public.mac_sayaci_arttir(v_oyuncu, v_oyuncu is distinct from v_terk and v_odul > 0);
    perform public.istatistikli_mac_arttir(v_oyuncu);
  end loop;

  -- Rozet: yalnız genel rozetler (Ida, 3 Eki 2026). Klasik gibi: ilk galibiyet koşulsuz; mac_10 aşağıda yalnız Dereceli.
  if p_kazanan is not null then
    perform public.award_badge(p_kazanan, 'ilk_galibiyet');
  end if;

  -- Lig puanı: yalnız Dereceli, Klasik değerleri (lig_mac_galibiyet / lig_mac_beraberlik)
  if k.dereceli then
    if p_kazanan is not null then
      select coalesce(is_bot, false) into v_kazanan_bot from public.profiles where id = p_kazanan;
      v_lig := floor(public.ayar_sayi('lig_mac_galibiyet', 25) * v_carpan *
                     (case when v_kazanan_bot then public.ayar_sayi('lig_bot_puan_yuzde', 40)::numeric / 100 else 1 end))::int;
      if v_lig > 0 then
        update public.profiles set puan = puan + v_lig, puan_hafta = puan_hafta + v_lig where id = p_kazanan;
      end if;
      perform public.odul_kalem_yaz(p_kazanan, 'galibiyet', greatest(v_lig, 0), 0, public.odul_lig_indirimi(v_carpan));
      -- 10 galibiyet (Klasik + Kasa), Klasik gibi yalnız Dereceli
      if (select count(*) from public.matches where kazanan = p_kazanan and durum = 'bitti')
         + (select count(*) from public.kasa_maclari where kazanan = p_kazanan and durum = 'bitti') >= 10 then
        perform public.award_badge(p_kazanan, 'mac_10');
      end if;
    else
      -- Beraberlik (Klasik gibi): her oyuncuya lig_mac_beraberlik × çarpan, bota bot yüzdesiyle
      foreach v_oyuncu in array array[k.oyuncu1, k.oyuncu2] loop
        select coalesce(is_bot, false) into v_kazanan_bot from public.profiles where id = v_oyuncu;
        v_lig := floor(public.ayar_sayi('lig_mac_beraberlik', 10) * v_carpan *
                       (case when v_kazanan_bot then public.ayar_sayi('lig_bot_puan_yuzde', 40)::numeric / 100 else 1 end))::int;
        if v_lig > 0 then
          update public.profiles set puan = puan + v_lig, puan_hafta = puan_hafta + v_lig where id = v_oyuncu;
        end if;
        perform public.odul_kalem_yaz(v_oyuncu, 'beraberlik', greatest(v_lig, 0), 0, public.odul_lig_indirimi(v_carpan));
      end loop;
    end if;
    if v_odul > 0 then
      foreach v_oyuncu in array array[k.oyuncu1, k.oyuncu2] loop
        continue when v_oyuncu is not distinct from v_terk;
        perform public.gunluk_seri_bonusu(v_oyuncu);
      end loop;
    end if;
  end if;

  perform public.odul_baglam(null);
  perform public.kasa_sinyal_ver(p_id);
end $function$
;

drop function if exists public.mac_sure_kopugu(uuid, timestamptz, interval);
drop function if exists public.mac_hala_kopuk(uuid, uuid, timestamptz);
