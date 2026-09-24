-- 460: TERK KURALI (Ida, 24 Eyl 2026) — herhangi bir maçın yarısında çıkan ASLA ödül almaz.
-- Terk eden: 0 coin, 0 XP, günlük seri/seri bonusu yok, görev ve rozet (maç sayısı, arkadaş maçı, tam isabet,
-- turnuva katılımı) ilerlemesi sayılmaz, level ödülü tetiklenmez (XP yok). Dereceli maçta terk eden tam
-- mağlubiyet alır (bugün mağlubiyet lig puanı 0 — eksiye düşürülmez); kalan oyuncu tam galibiyet alır.
-- İnternet kopması: mevcut kopukluk süresi (12 sn + 45 sn; Düello duello_kopuk_bekleme_sn) dolunca terk.
--
-- Modlar: Klasik/Saf Bilgi/Antrenman (matches.terk_eden — mac_iptal, mac_nabiz, advance_match bot maçı),
-- Düello (duellolar.terk_eden — duello_terk, kopukluk → duello_bitir), Grup (group_match_players.terk_at —
-- grup_mac_terk, grup_mac_nabiz), Turnuva (tournament_players.terk_at — turnuva_terk).
-- Ekleyici: iki yeni kolon, üç yeni fonksiyon; mevcut fonksiyonlar create or replace (yetkiler korunur).

alter table public.duellolar add column if not exists terk_eden uuid;
alter table public.tournament_players add column if not exists terk_at timestamptz;

-- ------------------------------------------------------------
-- Düello: terk eden kaydı + duello_bitir terk kuralı
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.duello_terk(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then return; end if;
  if auth.uid() not in (d.oyuncu1, d.oyuncu2) then return; end if;
  -- 460: terk eden kaydedilir → duello_bitir ona ödül yazmaz; kalan tam galibiyet alır.
  update public.duellolar set terk_eden = auth.uid() where id = p_id;
  perform public.duello_bitir(p_id, case when d.oyuncu1 = auth.uid() then d.oyuncu2 else d.oyuncu1 end);
end $function$;

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
end $function$;

-- ------------------------------------------------------------
-- Klasik / Saf Bilgi / Antrenman (matches)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mac_sonuclandir(p_match_id uuid, p_kazanan uuid, p_kaybeden uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m public.matches%rowtype; v_oyuncu uuid; v_carpan numeric:=1; v_lig int;
  v_bot_var boolean; v_acik_bot boolean;
  v_bot_yuzde numeric:=public.ayar_sayi('lig_bot_puan_yuzde',40)::numeric/100;
  v_oyuncu_bot boolean;
  v_cift numeric:=1;   -- P2A: Saf Bilgi indiriminden ÖNCEKİ çarpan (XP yalnız bunu izler)
  v_terk uuid;         -- 460: maçı yarıda bırakan (ödül yok)
begin
  select * into m from public.matches where id=p_match_id;
  if not found then return; end if;
  v_terk:=m.terk_eden;
  if v_terk is not distinct from p_kazanan then v_terk:=null; end if;
  perform public.odul_baglam('mac:'||p_match_id::text);
  select bool_or(coalesce(p.is_bot,false)),
         bool_or(coalesce(p.is_bot,false) and coalesce(p.bot_turu,'acik')='acik')
    into v_bot_var,v_acik_bot from public.profiles p where p.id in(m.oyuncu1,m.oyuncu2);
  if coalesce(v_bot_var,false) then v_carpan:=1;
  else v_carpan:=public.cift_odul_carpani(m.oyuncu1,m.oyuncu2,p_match_id); end if;
  v_cift:=v_carpan;   -- P2A
  if coalesce(m.jokersiz,false) then
    v_carpan:=least(v_carpan,public.ayar_ondalik('saf_bilgi_odul_carpani',0.5));
  end if;
  update public.matches set durum='bitti',kazanan=p_kazanan,bitis=now(),
    odul_carpan=v_carpan,dostluk=(v_carpan=0) where id=p_match_id;
  -- Terk eden kazanan olamaz → coin almaz.
  perform public.coin_mac_odulu(p_match_id::text,p_kazanan,array[m.oyuncu1,m.oyuncu2],
    v_carpan,not coalesce(m.dereceli,true),coalesce(v_acik_bot,false));
  -- P2A: XP (serbest ve Saf Bilgi dahil; tek sefer). 460: terk edene XP yok.
  perform public.xp_mac_odulu('mac:'||p_match_id::text,'mac',p_kazanan,array_remove(array[m.oyuncu1,m.oyuncu2],v_terk),
    v_cift,coalesce(v_acik_bot,false));
  if p_kazanan is not null then perform public.award_badge(p_kazanan,'ilk_galibiyet'); end if;
  if not coalesce(m.dereceli,true) then perform public.odul_baglam(null); return; end if;
  if p_kazanan is not null then
    select coalesce(is_bot,false) into v_oyuncu_bot from public.profiles where id=p_kazanan;
    v_lig:=floor(public.ayar_sayi('lig_mac_galibiyet',25)*v_carpan*
      (case when v_oyuncu_bot then v_bot_yuzde else 1 end))::int;
    if v_lig>0 then update public.profiles set puan=puan+v_lig,puan_hafta=puan_hafta+v_lig where id=p_kazanan; end if;
    perform public.odul_kalem_yaz(p_kazanan,'galibiyet',greatest(v_lig,0),0,
      case when coalesce(m.jokersiz,false) then jsonb_build_object('indirim','Saf Bilgi') else public.odul_lig_indirimi(v_carpan) end);
    if (select count(*) from public.matches where kazanan=p_kazanan and durum='bitti')>=10 then
      perform public.award_badge(p_kazanan,'mac_10'); end if;
    if p_kaybeden='b0b00000-0000-4000-8000-000000000003' then perform public.award_badge(p_kazanan,'bot_avcisi'); end if;
    if (select count(*) from public.match_answers where match_id=p_match_id and user_id=p_kazanan and dogru)
      >=coalesce(array_length(m.soru_ids,1),0) then perform public.award_badge(p_kazanan,'tam_isabet'); end if;
  else
    foreach v_oyuncu in array array[m.oyuncu1,m.oyuncu2] loop
      select coalesce(is_bot,false) into v_oyuncu_bot from public.profiles where id=v_oyuncu;
      v_lig:=floor(public.ayar_sayi('lig_mac_beraberlik',10)*v_carpan*
        (case when v_oyuncu_bot then v_bot_yuzde else 1 end))::int;
      if v_lig>0 then update public.profiles set puan=puan+v_lig,puan_hafta=puan_hafta+v_lig where id=v_oyuncu; end if;
      perform public.odul_kalem_yaz(v_oyuncu,'beraberlik',greatest(v_lig,0),0,
        case when coalesce(m.jokersiz,false) then jsonb_build_object('indirim','Saf Bilgi') else public.odul_lig_indirimi(v_carpan) end);
    end loop;
  end if;
  foreach v_oyuncu in array array[m.oyuncu1,m.oyuncu2] loop
    continue when v_oyuncu is not distinct from v_terk;   -- 460: terk edene seri bonusu yok
    perform public.gunluk_seri_bonusu(v_oyuncu);
  end loop;
  perform public.odul_baglam(null);
end;
$function$;

CREATE OR REPLACE FUNCTION public.trg_mac_bitti()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.durum = 'bitti' and coalesce(old.durum, '') <> 'bitti' then
    -- 460: terk edenin günlük serisi ilerlemez (maç sayısı istatistik olarak sayılır)
    perform public.mac_sayaci_arttir(new.oyuncu1, new.terk_eden is distinct from new.oyuncu1);
    perform public.mac_sayaci_arttir(new.oyuncu2, new.terk_eden is distinct from new.oyuncu2);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.mac_iptal(p_match_id uuid)
 RETURNS TABLE(sonuc text, kazanan uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  m public.matches%rowtype;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_cevap_sayisi int;
  v_ad text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Kullanıcı tetikli uç: hız sınırı (bkz. migration 115)
  perform public.hiz_siniri('mac_iptal', 20, interval '60 seconds');

  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (m.oyuncu1, m.oyuncu2) then
    raise exception 'Bu maçta değilsin';
  end if;
  if m.durum in ('bitti', 'iptal', 'reddedildi') then
    raise exception 'Bu maç zaten kapanmış';
  end if;

  v_rakip := case when m.oyuncu1 = v_me then m.oyuncu2 else m.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;

  -- Gelen daveti reddetmek bu RPC'nin işi değil; mevcut reddetme akışı var.
  if m.durum = 'bekliyor' and m.oyuncu2 = v_me then
    raise exception 'Gelen daveti reddetme akışını kullan';
  end if;

  select count(*) into v_cevap_sayisi
    from public.match_answers where match_id = p_match_id;

  -- 460 (terk kuralı, Ida 24 Eyl 2026): BAŞLAMIŞ maçtan çıkan terk eder — rakip bot da olsa,
  -- henüz cevap verilmemiş olsa da. Terk eden ödül almaz, kalan tam galibiyet alır.
  -- Eski asenkron maçta eski kural (gerçek rakip + en az bir cevap) sürer.
  if m.durum = 'aktif'
     and ((coalesce(m.senkron, false) and coalesce(m.basladi, false))
          or (not coalesce(m.senkron, false) and not coalesce(v_rakip_bot, false) and v_cevap_sayisi > 0))
  then
    update public.matches set terk_eden = v_me where id = p_match_id;
    perform public.mac_sonuclandir(p_match_id, v_rakip, v_me);

    if not coalesce(v_rakip_bot, false) then
      select gorunen_ad into v_ad from public.profiles where id = v_me;
      perform public.bildirim_anahtarla(
        v_rakip, 'mac_bitti', 'mac_iptal_hukmen',
        jsonb_build_array(coalesce(v_ad, 'Rakibin')),
        '/bildim/mac/' || p_match_id::text
      );
    end if;

    return query select 'hukmen'::text, v_rakip;
    return;
  end if;

  -- Sade iptal (maç başlamadan): puan yok, mağlubiyet yazılmaz
  update public.matches
     set durum = 'iptal', kazanan = null, bitis = now()
   where id = p_match_id;

  if not coalesce(v_rakip_bot, false) then
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_anahtarla(
      v_rakip, 'mac_bitti', 'mac_iptal_puansiz',
      jsonb_build_array(coalesce(v_ad, 'Rakibin')),
      '/bildim/meydan'
    );
  end if;

  return query select 'iptal'::text, null::uuid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.senkron_mac_temizle()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- 1) Hiç başlamamış maç: taraflardan biri bir saattir ekrana gelmedi.
  --    Kimse mağdur olmaz, puan yazılmaz; maç iptal edilir.
  update public.matches
     set durum = 'iptal'
   where durum = 'aktif'
     and coalesce(senkron, false)
     and not basladi
     and created_at < now() - interval '1 hour';

  -- 2) Başlamış ama 10 dakikadır ilerlememiş maç: iki taraf da terk etti.
  --    460 (terk kuralı): maçı yarıda bırakan ödül almaz → iki taraf da gittiği için maç
  --    ödülsüz iptal edilir (önceden o ana kadarki skorla sonuçlandırılıyordu).
  --    Tek taraf giderse buraya gelinmez: mac_nabiz (insan rakip) ya da advance_match
  --    (bot rakip) kopukluk süresi dolunca terk yazar.
  update public.matches
     set durum = 'iptal', bitis = now()
   where durum = 'aktif'
     and coalesce(senkron, false)
     and basladi
     and soru_baslangic < now() - interval '10 minutes';
end;
$function$;

-- ------------------------------------------------------------
-- Turnuva: yarışırken çıkış = terk
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.turnuva_terk(p_tournament_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  t public.tournaments%rowtype;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.durum <> 'aktif' then return; end if;
  -- Yalnız hâlâ yarışan oyuncu terk eder; normal elenen oyuncu maçını zaten bitirdi.
  -- elenme_sorusu -1: sıralamada herkesin altında (ödül dağıtımı terk edeni zaten atlar).
  update public.tournament_players
     set elendi = true, elenme_sorusu = -1, terk_at = now()
   where tournament_id = p_tournament_id and user_id = v_me
     and not elendi and terk_at is null;
  if found then perform public.advance_tournament(p_tournament_id); end if;
end;
$function$;

-- ------------------------------------------------------------
-- Grup: çıkış = terk (45 sn bekletmeden); tek kişi kalınca maç biter
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grup_tek_kalan_bitir(p_group_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  gm public.group_matches%rowtype;
  v_kalan int;
  v_kazanan uuid;
begin
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found or gm.durum <> 'aktif' or not coalesce(gm.basladi, false) then return; end if;
  select count(*), min(user_id::text)::uuid into v_kalan, v_kazanan
    from public.group_match_players
   where group_match_id = p_group_match_id and davet_durumu = 'kabul' and terk_at is null;
  if v_kalan > 1 then return; end if;
  -- Kalan tek oyuncu tam galibiyet alır (grup ödülsüz: yalnız rozet). Kimse kalmadıysa kazanansız biter.
  update public.group_matches
     set durum = 'bitti', kazanan = case when v_kalan = 1 then v_kazanan end, bitis = now(), duraklatildi_at = null
   where id = p_group_match_id;
  if v_kalan = 1 then perform public.award_badge(v_kazanan, 'ilk_galibiyet'); end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.grup_mac_terk(p_group_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  gm public.group_matches%rowtype;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found then raise exception 'Grup maçı bulunamadı'; end if;
  if gm.durum <> 'aktif' or not coalesce(gm.basladi, false) then return; end if;
  update public.group_match_players
     set terk_at = now()
   where group_match_id = p_group_match_id and user_id = v_me
     and davet_durumu = 'kabul' and terk_at is null;
  if found then perform public.grup_tek_kalan_bitir(p_group_match_id); end if;
end;
$function$;


-- ---------- advance_match (460) ----------
CREATE OR REPLACE FUNCTION public.advance_match(p_match_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  select * into m from public.matches where id = p_match_id for update;
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
      if v_cevap_sayisi < 2 and now() <= v_bas + interval '16 seconds' then
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
$function$;

-- ---------- gorev_sayaci (460) ----------
CREATE OR REPLACE FUNCTION public.gorev_sayaci(p_quest_id text, p_user uuid, p_tarih date)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with sinir as (
    select (p_tarih::timestamp at time zone 'Europe/Istanbul') as bas,
           ((p_tarih + 1)::timestamp at time zone 'Europe/Istanbul') as son
  )
  select case p_quest_id
    when 'mac_oyna_3' then
      (select count(*) from public.matches m, sinir s
        where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user and m.bitis >= s.bas and m.bitis < s.son)
    + (select count(*) from public.duellolar d, sinir s
        where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user and d.bitis >= s.bas and d.bitis < s.son)
    + (select count(*) from public.hizli_mod_oturumlar h, sinir s
        where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= s.bas and h.bitis < s.son)
    + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id, sinir s
        where g.durum = 'bitti' and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null and g.bitis >= s.bas and g.bitis < s.son)
    + (select count(*) from public.tournaments t join public.tournament_players tp on tp.tournament_id = t.id, sinir s
        where t.durum = 'bitti' and tp.user_id = p_user and tp.terk_at is null and t.bitis >= s.bas and t.bitis < s.son)
    when 'mac_kazan_5' then
      (select count(*) from public.matches m, sinir s
        where m.durum = 'bitti' and m.kazanan = p_user and m.bitis >= s.bas and m.bitis < s.son)
    + (select count(*) from public.duellolar d, sinir s
        where d.durum = 'bitti' and d.kazanan = p_user and d.bitis >= s.bas and d.bitis < s.son)
    + (select count(*) from public.group_matches g join public.group_match_players gp on gp.group_match_id = g.id, sinir s
        where g.durum = 'bitti' and g.kazanan = p_user and gp.user_id = p_user and gp.davet_durumu = 'kabul' and gp.terk_at is null and g.bitis >= s.bas and g.bitis < s.son)
    + (select count(*) from public.tournaments t, sinir s
        where t.durum = 'bitti' and t.kazanan = p_user and t.bitis >= s.bas and t.bitis < s.son)
    when 'dogru_25' then
      (select count(*) from public.match_answers a, sinir s
        where a.user_id = p_user and a.dogru and a.created_at >= s.bas and a.created_at < s.son
          and not exists (select 1 from public.matches mx where mx.id = a.match_id and mx.terk_eden = p_user))
    + (select count(*) from public.duello_hamleler dh, sinir s
        where dh.savunan = p_user and dh.dogru and dh.created_at >= s.bas and dh.created_at < s.son
          and not exists (select 1 from public.duellolar dx where dx.id = dh.duello_id and dx.terk_eden = p_user))
    + (select coalesce(sum(h.dogru), 0) from public.hizli_mod_oturumlar h, sinir s
        where h.durum = 'bitti' and h.user_id = p_user and h.bitis >= s.bas and h.bitis < s.son)
    + (select count(*) from public.group_match_answers ga, sinir s
        where ga.user_id = p_user and ga.dogru and ga.created_at >= s.bas and ga.created_at < s.son
          and not exists (select 1 from public.group_match_players gx where gx.group_match_id = ga.group_match_id and gx.user_id = p_user and gx.terk_at is not null))
    + (select count(*) from public.tournament_answers ta, sinir s
        where ta.user_id = p_user and ta.dogru and ta.created_at >= s.bas and ta.created_at < s.son
          and not exists (select 1 from public.tournament_players tx where tx.tournament_id = ta.tournament_id and tx.user_id = p_user and tx.terk_at is not null))
    else 0
  end;
$function$;

-- ---------- rozet_olcut (460) ----------
CREATE OR REPLACE FUNCTION public.rozet_olcut(p_user uuid, p_olcut text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v bigint := 0;
  v_fark int;
  v_min int;
begin
  if p_user is null or p_olcut is null then return 0; end if;

  if p_olcut = 'level' then
    select coalesce(level, 1) into v from public.profiles where id = p_user;

  elsif p_olcut = 'klasik_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user;

  elsif p_olcut = 'saf_bilgi_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.jokersiz, false);

  elsif p_olcut = 'duello_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user;

  elsif p_olcut = 'seri' then
    select greatest(coalesce(seri_gun, 0), coalesce(seri_en_uzun, 0), coalesce(seri, 0))
      into v from public.profiles where id = p_user;

  elsif p_olcut like 'kategori:%' then
    select coalesce(max(kd.dogru_sayisi), 0) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.kategori = substr(p_olcut, 10);

  elsif p_olcut = 'kasif' then
    v_min := public.ayar_sayi('rozet_kasif_min_dogru', 10)::int;
    select count(*) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.dogru_sayisi >= v_min;

  elsif p_olcut = 'turnuva_katilim' then
    select count(*) into v from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and t.durum = 'bitti' and tp.terk_at is null;

  elsif p_olcut in ('turnuva_ilk10', 'turnuva_ilk3') then
    -- Sıra, ödül dağıtımıyla aynı düzen (turnuva_odullerini_dagit)
    select count(*) into v from (
      select tp.user_id,
             row_number() over (partition by tp.tournament_id
                                order by tp.elendi asc, tp.elenme_sorusu desc nulls first,
                                         tp.dogru_sayisi desc, tp.user_id) as sira
        from public.tournament_players tp
        join public.tournaments t on t.id = tp.tournament_id and t.durum = 'bitti'
       where tp.terk_at is null and tp.tournament_id in (select x.tournament_id from public.tournament_players x where x.user_id = p_user)
    ) s
     where s.user_id = p_user and s.sira <= case when p_olcut = 'turnuva_ilk3' then 3 else 10 end;

  elsif p_olcut = 'turnuva_sampiyon' then
    select count(*) into v from public.tournaments t
     where t.durum = 'bitti' and t.kazanan = p_user;

  elsif p_olcut = 'turnuva_seans' then
    select count(distinct t.seans) into v
      from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and tp.terk_at is null
       and t.seans in (select jsonb_array_elements_text(o.deger) from public.oyun_ayarlari o
                        where o.anahtar = 'turnuva_saatleri' and jsonb_typeof(o.deger) = 'array');

  elsif p_olcut in ('lig_gumus', 'lig_altin', 'lig_elmas', 'lig_efsane') then
    -- Bir kez çıkılan lig sayılır (düşse de rozet kalır): profil + kalıcı lig çerçeveleri
    select case when greatest(
             public.lig_sirasi(coalesce(p.lig, 'bronz')),
             coalesce((select max(public.lig_sirasi(c.lig)) from public.lig_cerceveleri c where c.user_id = p_user), 1)
           ) >= public.lig_sirasi(substr(p_olcut, 5)) then 1 else 0 end
      into v from public.profiles p where p.id = p_user;

  elsif p_olcut = 'klasik_tam' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
       and coalesce(array_length(m.soru_ids, 1), 0) > 0
       and (select count(distinct a.soru_index) from public.match_answers a
             where a.match_id = m.id and a.user_id = p_user and a.dogru) >= array_length(m.soru_ids, 1);

  elsif p_olcut = 'duello_son_can' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and ((d.oyuncu1 = p_user and d.can1 = 1) or (d.oyuncu2 = p_user and d.can2 = 1));

  elsif p_olcut = 'duello_geri_donus' then
    v_fark := public.ayar_sayi('rozet_geri_donus_can_farki', 2)::int;
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and exists (
         select 1 from (
           select sum(case when h.can_kaybeden = p_user then 1
                           when h.can_kaybeden is not null then -1 else 0 end)
                    over (order by h.id) as fark
             from public.duello_hamleler h where h.duello_id = d.id
         ) x where x.fark >= v_fark);

  elsif p_olcut = 'uzatma_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user and coalesce(d.uzatma, false);

  elsif p_olcut = 'rovans_galibiyet' then
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.rovans, false))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and d.kazanan = p_user and d.onceki_id is not null)
      into v;

  elsif p_olcut = 'galibiyet_serisi' then
    -- Klasik + Düello, bitiş sırasıyla; beraberlik ve mağlubiyet seriyi keser.
    with g as (
      select coalesce(m.bitis, m.created_at) as t, coalesce(m.kazanan = p_user, false) as w
        from public.matches m
       where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
      union all
      select coalesce(d.bitis, d.son_hareket, d.created_at), coalesce(d.kazanan = p_user, false)
        from public.duellolar d
       where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2)
    ), n as (
      select w, sum(case when w then 0 else 1 end) over (order by t rows unbounded preceding) as grp from g
    )
    select coalesce(max(c), 0) into v from (select count(*) as c from n where w group by grp) x;

  elsif p_olcut = 'arkadas' then
    select count(*) into v from public.friendships f
     where f.durum = 'arkadas' and p_user in (f.requester, f.addressee);

  elsif p_olcut = 'arkadas_mac' then
    with ark as (
      select case when f.requester = p_user then f.addressee else f.requester end as id
        from public.friendships f
       where f.durum = 'arkadas' and p_user in (f.requester, f.addressee)
    )
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
               and (case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end) in (select id from ark))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
               and (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end) in (select id from ark))
      into v;

  elsif p_olcut = 'davet' then
    select count(*) into v from public.davetler dv
     where dv.davet_eden = p_user and dv.durum in ('odullendi', 'sinir_asildi');

  elsif p_olcut = 'mac_mesaji' then
    select case when exists (select 1 from public.match_messages mm where mm.user_id = p_user) then 1 else 0 end into v;

  else
    v := 0;   -- 'olay' ve bilinmeyenler: yalnız olay anında verilir
  end if;

  return coalesce(v, 0);
end;
$function$;

-- ---------- grup_mac_nabiz (460) ----------
CREATE OR REPLACE FUNCTION public.grup_mac_nabiz(p_group_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, hazir_sayisi integer, toplam_oyuncu integer, bekleyenler text[], duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
begin
  select * into gm from public.group_matches where id = p_group_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not exists (
    select 1 from public.group_match_players
    where group_match_id = p_group_match_id and user_id = auth.uid()
  ) then raise exception 'Bu maçta değilsin'; end if;

  update public.group_match_players
     set nabiz_at = now(),
         hazir = hazir or coalesce(p_hazir, false)
   where group_match_id = p_group_match_id and user_id = auth.uid();

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

  if gm.durum = 'aktif' and not gm.basladi then
    if v_toplam > 0 and v_hazir >= v_toplam and v_kopuk = 0 then
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

-- ---------- turnuva_odullerini_dagit (460) ----------
CREATE OR REPLACE FUNCTION public.turnuva_odullerini_dagit(p_tournament_id uuid, p_kazanan uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_sira int := 0;
  v_odul bigint;
  v_lig int;
  v_bot_yuzde numeric := public.ayar_sayi('lig_bot_puan_yuzde', 40)::numeric / 100;
  v_giysi text := public.turnuva_haftalik_giysi();   -- 213: bu haftanın ilk-3 giysisi (turnuva_giysi_odulu)
  v_tekrar_coin bigint := public.ayar_sayi('turnuva_giysi_tekrar_coin', 0);
  v_xp_katilim int := public.ayar_sayi('xp_turnuva_katilim', 20)::int;   -- P2A
  v_xp_ilk3 int := public.ayar_sayi('xp_turnuva_ilk3', 50)::int;         -- P2A
begin
  perform public.odul_baglam('turnuva:' || p_tournament_id::text);   -- Paket 20 I.3
  if p_kazanan is not null then
    perform public.esya_odul_ver(p_kazanan, 'spk_04', 'etkinlik');
    update public.profiles set turnuva_taci_at = now() where id = p_kazanan;
  end if;

  -- İlk üç: Yıldızlar efekti + dereceye göre coin
  for r in
    select tp.user_id
      from public.tournament_players tp
     where tp.tournament_id = p_tournament_id and tp.terk_at is null   -- 460: terk eden ödül almaz
     order by tp.elendi asc, tp.elenme_sorusu desc nulls first, tp.dogru_sayisi desc
     limit 3
  loop
    v_sira := v_sira + 1;
    perform public.esya_odul_ver(r.user_id, 'efk_02', 'etkinlik');
    -- 213: haftalık turnuva giysisi — üçü de aynı giysiyi alır; zaten sahipse eşya verilmez, yalnız coin
    if v_giysi is not null then
      if exists (select 1 from public.avatar3d_sahip s where s.oyuncu_id = r.user_id and s.parca_id = v_giysi) then
        if v_tekrar_coin > 0 then
          perform public.coin_ekle(r.user_id, v_tekrar_coin, 'turnuva', 'giysi_tekrar:' || p_tournament_id::text);
        end if;
      else
        perform public.avatar3d_odul_ver(r.user_id, v_giysi, 'turnuva');
      end if;
    end if;
    v_odul := case v_sira
      when 1 then public.ayar_sayi('coin_turnuva_1', 150)
      when 2 then public.ayar_sayi('coin_turnuva_2', 75)
      else public.ayar_sayi('coin_turnuva_3', 40) end;
    perform public.coin_ekle(r.user_id, v_odul, 'turnuva',
                             'derece:' || p_tournament_id::text || ':' || v_sira::text);
  end loop;

  -- LİG PUANI (Paket 14, 3.2): dereceye göre tek miktar —
  -- 1. / 2. / 3. / 4-10. / diğer katılanlar. Botlar gerçek maçtaki gibi
  -- lig_bot_puan_yuzde ile kırpılır.
  v_sira := 0;
  for r in
    select tp.user_id, coalesce(p.is_bot, false) as bot
      from public.tournament_players tp
      join public.profiles p on p.id = tp.user_id
     where tp.tournament_id = p_tournament_id and tp.terk_at is null   -- 460
     order by tp.elendi asc, tp.elenme_sorusu desc nulls first, tp.dogru_sayisi desc
  loop
    v_sira := v_sira + 1;
    v_lig := case
      when v_sira = 1 then public.ayar_sayi('lig_turnuva_1', 150)
      when v_sira = 2 then public.ayar_sayi('lig_turnuva_2', 80)
      when v_sira = 3 then public.ayar_sayi('lig_turnuva_3', 40)
      when v_sira <= 10 then public.ayar_sayi('lig_turnuva_ilk10', 20)
      else public.ayar_sayi('lig_turnuva_katilim', 10) end;
    if r.bot then v_lig := floor(v_lig * v_bot_yuzde)::int; end if;
    if v_lig > 0 then
      update public.profiles
         set puan = puan + v_lig, puan_hafta = puan_hafta + v_lig
       where id = r.user_id;
    end if;
    perform public.odul_kalem_yaz(r.user_id, 'turnuva_derece', greatest(v_lig, 0), 0, jsonb_build_object('sira', v_sira));
    -- P2A: XP — katılan herkese katılım XP'si, ilk üçe ek XP (botlara xp_ver yazmaz)
    perform public.xp_ver(r.user_id, v_xp_katilim + case when v_sira <= 3 then v_xp_ilk3 else 0 end,
                          'turnuva:' || p_tournament_id::text,
                          jsonb_build_object('sonuc', 'turnuva', 'sira', v_sira, 'katilim', v_xp_katilim,
                                             'ilk3', case when v_sira <= 3 then v_xp_ilk3 else 0 end));
  end loop;

  -- Katılım ödülü: turnuvaya girmiş herkese (botlara coin_ekle zaten vermez).
  for r in
    select tp.user_id from public.tournament_players tp
     where tp.tournament_id = p_tournament_id and tp.terk_at is null   -- 460
  loop
    perform public.coin_ekle(r.user_id, public.ayar_sayi('coin_turnuva_katilim', 10),
                             'turnuva', 'katilim:' || p_tournament_id::text);
  end loop;
  perform public.odul_baglam(null);
end;
$function$;

revoke all on function public.turnuva_terk(uuid) from public, anon;
grant execute on function public.turnuva_terk(uuid) to authenticated;
revoke all on function public.grup_mac_terk(uuid) from public, anon;
grant execute on function public.grup_mac_terk(uuid) to authenticated;
revoke all on function public.grup_tek_kalan_bitir(uuid) from public, anon, authenticated;
