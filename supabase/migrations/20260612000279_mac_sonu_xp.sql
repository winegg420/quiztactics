-- Paket 2 · Şerit A — MAÇ SONU XP/LEVEL YAZIMI + OKUMA
--
-- XP maçı bitiren fonksiyonların İÇİNDE yazılır (istemci XP yazamaz):
--   Klasik  → mac_sonuclandir   (advance_match / mac_iptal / mac_nabiz / senkron_mac_temizle çağırır,
--                                 hepsi maç satırını FOR UPDATE ile kilitler)
--   Düello  → duello_bitir      (v1 ve Düello 1.0 / v2 bitişlerinin hepsi buradan geçer; FOR UPDATE)
--   Turnuva → turnuva_odullerini_dagit (advance_tournament)
-- Grup Maçı ödülsüz arkadaş modudur → XP YOK. Hızlı Mod donmuş → XP YOK.
--
-- Kurallar (rakamlar oyun_ayarlari, 277):
--   * Serbest (dereceli=false) ve Saf Bilgi (jokersiz) XP'yi DÜŞÜRMEZ — yalnız coin %50.
--   * Aynı çift koruması XP'ye de uygulanır: coin'deki cift_odul_carpani aynen (1-5 tam,
--     6-10 %50, 11+ 0; aynı cihaz/IP 0). Bot maçında çift koruması yok (coin'deki gibi);
--     açık botta xp_acik_bot_carpani (coin_bot_carpani mantığı). İndirimler çarpılmaz, en düşüğü.
--   * Kaybeden (ve beraberlikte taraf) XP'yi ancak maçta oynadıysa alır: Klasik'te en az bir
--     cevap satırı, Düello'da en az bir hamle. Hemen terk ederek XP toplanamaz.
--   * Tek sefer: xp_hareketleri (user_id, kaynak) benzersiz → aynı maç iki kez XP yazmaz.
-- Gövdeler canlıdaki tanımların AYNISI; eklenen satırlar "P2A" yorumuyla işaretli.

-- ---------------------------------------------------------------- ortak iç fonksiyon
create or replace function public.xp_mac_odulu(p_kaynak text, p_mod text, p_kazanan uuid, p_oyuncular uuid[],
                                               p_cift numeric default 1, p_acik_bot boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oyuncu uuid; v_sonuc text; v_taban int; v_xp int; v_carpan numeric; v_indirim text;
  v_id uuid; v_oynadi boolean;
  v_bot_carpan numeric := public.ayar_ondalik('xp_acik_bot_carpani', 0.5);
begin
  if p_kaynak is null then return; end if;
  begin v_id := split_part(p_kaynak, ':', 2)::uuid; exception when others then v_id := null; end;

  v_carpan := least(coalesce(p_cift, 1), case when coalesce(p_acik_bot, false) then v_bot_carpan else 1 end);
  v_indirim := case when v_carpan >= 1 then null
                    when coalesce(p_cift, 1) <= 0 then 'cift_odulsuz'
                    when coalesce(p_cift, 1) = v_carpan then 'cift_yari'
                    else 'acik_bot' end;

  foreach v_oyuncu in array coalesce(p_oyuncular, '{}'::uuid[]) loop
    continue when v_oyuncu is null;
    v_sonuc := case when p_kazanan is null then 'beraberlik' when p_kazanan = v_oyuncu then 'galibiyet' else 'maglubiyet' end;
    if p_mod = 'duello' then
      -- Düello'da beraberlik yok; kazanansız biterse iki taraf mağlubiyet XP'si alır
      v_taban := case when v_sonuc = 'galibiyet' then public.ayar_sayi('xp_duello_galibiyet', 45)
                      else public.ayar_sayi('xp_duello_maglubiyet', 15) end;
      v_oynadi := exists (select 1 from public.duello_hamleler h
                           where h.duello_id = v_id and (h.saldiran = v_oyuncu or h.savunan = v_oyuncu));
    else
      v_taban := case v_sonuc when 'galibiyet' then public.ayar_sayi('xp_mac_galibiyet', 30)
                              when 'beraberlik' then public.ayar_sayi('xp_mac_beraberlik', 15)
                              else public.ayar_sayi('xp_mac_maglubiyet', 10) end;
      v_oynadi := exists (select 1 from public.match_answers a where a.match_id = v_id and a.user_id = v_oyuncu);
    end if;
    if v_sonuc <> 'galibiyet' and not v_oynadi then v_taban := 0; end if;
    v_xp := greatest(floor(v_taban * v_carpan), 0)::int;
    perform public.xp_ver(v_oyuncu, v_xp, p_kaynak,
      jsonb_strip_nulls(jsonb_build_object('sonuc', v_sonuc, 'taban', v_taban, 'carpan', v_carpan,
                                           'indirim', v_indirim, 'oynamadi', case when not v_oynadi and v_sonuc <> 'galibiyet' then true end)));
  end loop;
end $$;
revoke all on function public.xp_mac_odulu(text, text, uuid, uuid[], numeric, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- Klasik
create or replace function public.mac_sonuclandir(p_match_id uuid, p_kazanan uuid, p_kaybeden uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  m public.matches%rowtype; v_oyuncu uuid; v_carpan numeric:=1; v_lig int;
  v_bot_var boolean; v_acik_bot boolean;
  v_bot_yuzde numeric:=public.ayar_sayi('lig_bot_puan_yuzde',40)::numeric/100;
  v_oyuncu_bot boolean;
  v_cift numeric:=1;   -- P2A: Saf Bilgi indiriminden ÖNCEKİ çarpan (XP yalnız bunu izler)
begin
  select * into m from public.matches where id=p_match_id;
  if not found then return; end if;
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
  perform public.coin_mac_odulu(p_match_id::text,p_kazanan,array[m.oyuncu1,m.oyuncu2],
    v_carpan,not coalesce(m.dereceli,true),coalesce(v_acik_bot,false));
  -- P2A: XP (serbest ve Saf Bilgi dahil; tek sefer)
  perform public.xp_mac_odulu('mac:'||p_match_id::text,'mac',p_kazanan,array[m.oyuncu1,m.oyuncu2],
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
  foreach v_oyuncu in array array[m.oyuncu1,m.oyuncu2] loop perform public.gunluk_seri_bonusu(v_oyuncu); end loop;
  perform public.odul_baglam(null);
end;
$function$;

-- ---------------------------------------------------------------- Düello (v1 + v2)
create or replace function public.duello_bitir(p_id uuid, p_kazanan uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_bot_var boolean;
  v_acik_bot boolean;
  v_carpan numeric := 1;
  v_lig int;
  v_kazanan_bot boolean;
  v_oyuncu uuid;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;
  perform public.odul_baglam('duello:' || p_id::text);   -- Paket 20 I.3

  select bool_or(coalesce(p.is_bot, false)),
         bool_or(coalesce(p.is_bot, false) and coalesce(p.bot_turu, 'acik') = 'acik')
    into v_bot_var, v_acik_bot
    from public.profiles p where p.id in (d.oyuncu1, d.oyuncu2);

  if not coalesce(v_bot_var, false) then
    v_carpan := public.cift_odul_carpani(d.oyuncu1, d.oyuncu2, null);
  end if;

  update public.duellolar
     set durum = 'bitti', kazanan = p_kazanan, bitis = now(), odul_carpan = v_carpan,
         faz = case when faz = 'altin' then 'sonuc' else faz end, son_hareket = now()
   where id = p_id;

  -- Coin: dereceli tam, serbest yarı; indirimler çarpılmaz (coin_mac_odulu).
  perform public.coin_mac_odulu('duello:' || p_id::text, p_kazanan, array[d.oyuncu1, d.oyuncu2],
                                v_carpan, not d.dereceli, coalesce(v_acik_bot, false),
                                'coin_duello_galibiyet');

  -- P2A: XP (serbest dahil tam; çift koruması / açık bot indirimi; tek sefer)
  perform public.xp_mac_odulu('duello:' || p_id::text, 'duello', p_kazanan, array[d.oyuncu1, d.oyuncu2],
                              v_carpan, coalesce(v_acik_bot, false));

  foreach v_oyuncu in array array[d.oyuncu1, d.oyuncu2] loop
    perform public.mac_sayaci_arttir(v_oyuncu, true);
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
      perform public.gunluk_seri_bonusu(v_oyuncu);
    end loop;
  end if;

  perform public.odul_baglam(null);
  perform public.duello_sinyal_ver(p_id);
end $function$;

-- ---------------------------------------------------------------- Turnuva
create or replace function public.turnuva_odullerini_dagit(p_tournament_id uuid, p_kazanan uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
     where tp.tournament_id = p_tournament_id
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
     where tp.tournament_id = p_tournament_id
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
     where tp.tournament_id = p_tournament_id
  loop
    perform public.coin_ekle(r.user_id, public.ayar_sayi('coin_turnuva_katilim', 10),
                             'turnuva', 'katilim:' || p_tournament_id::text);
  end loop;
  perform public.odul_baglam(null);
end;
$function$;

-- ---------------------------------------------------------------- okuma
-- Maç sonu ekranı: bu kaynaktan kazanılan XP, level atlama, level ödülleri + güncel ilerleme.
create or replace function public.level_kazancim(p_kaynak text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  h public.xp_hareketleri%rowtype;
  p record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kaynak is null or p_kaynak !~ '^(mac|duello|turnuva):[0-9a-f-]{36}$' then raise exception 'Geçersiz kaynak'; end if;
  select level, level_xp, xp into p from public.profiles where id = v_me;
  select * into h from public.xp_hareketleri where user_id = v_me and kaynak = p_kaynak;
  return jsonb_build_object(
    'hazir', h.id is not null,
    'xp', coalesce(h.xp, 0),
    'level_once', h.level_once,
    'level_sonra', h.level_sonra,
    'rutbe_once', case when h.id is not null then public.level_rutbe(h.level_once) end,
    'rutbe_sonra', case when h.id is not null then public.level_rutbe(h.level_sonra) end,
    'indirim', h.detay ->> 'indirim',
    'oynamadi', coalesce((h.detay ->> 'oynamadi')::boolean, false),
    'level_coin', coalesce((h.detay ->> 'level_coin')::int, 0),
    'rutbe_coin', coalesce((h.detay ->> 'rutbe_coin')::int, 0),
    'skiller', coalesce(h.detay -> 'skiller', '[]'::jsonb),
    'level', coalesce(p.level, 1),
    'level_xp', coalesce(p.level_xp, 0),
    'level_gereken', public.level_gereken_xp(coalesce(p.level, 1))
  );
end $$;
revoke all on function public.level_kazancim(text) from public, anon;
grant execute on function public.level_kazancim(text) to authenticated;

-- Kendi profilim: bir sonraki level için gereken XP de gelsin (profil ve ana sayfa çubuğu).
create or replace function public.profilim()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select to_jsonb(p) || jsonb_build_object('level_gereken', public.level_gereken_xp(p.level))
    from public.profiles p where p.id = auth.uid();
$function$;
