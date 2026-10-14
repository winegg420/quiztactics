-- 1102 geri alma: fonksiyonları 1102 öncesine döndürür (kolonlar ve ayar zararsız, kalır).

CREATE OR REPLACE FUNCTION public.duello4_baslat(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.duellolar
     set surum = 4, hakimiyet = false, secim_modu = false, puan_modu = false, ban_acik = false,
         faz = 'notr', saldiran = oyuncu1, ilk_secen = null, tur = 0, max_tur = null,
         v4_kontrol = null, v4_seri = 0, v4_tur = 0, v4_notr_seri = 0, v4_kullanilan = '{}', v4_soru_no = 0,
         v4_max_tur = greatest(1, public.ayar_sayi('duello4_max_tur', 15))::smallint,
         v4_max_soru = greatest(2, public.ayar_sayi('duello4_max_soru', 20))::smallint,   -- 1093: toplam soru sınırı
         v4_seri_hedef = greatest(1, public.ayar_sayi('duello4_seri_hedef', 3))::smallint,
         v4_notr_max = greatest(1, public.ayar_sayi('duello4_notr_max', 5))::smallint,
         v4_kart_sayisi = greatest(2, public.ayar_sayi('duello4_kart_sayisi', 4))::smallint,
         -- 1092: giriş beklemesi
         soru_id = null, soru_id1 = null, soru_id2 = null, soru_baslangic = null, bitis1 = null, bitis2 = null,
         faz_bitis = now() + make_interval(secs => greatest(1, public.ayar_sayi('duello_baglanma_sn', 15)))
   where id = p_id;
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'sonuc' then return; end if;
  if d.son_hamle ->> 'sonuc' = 'son_kazandi' then
    perform public.duello_bitir(p_id, (d.son_hamle ->> 'kazanan')::uuid);
  elsif d.v4_kontrol is not null and d.v4_seri >= coalesce(d.v4_seri_hedef, 3) then
    perform public.duello_bitir(p_id, d.v4_kontrol);
  elsif d.v4_son
     or d.v4_soru_no + 1 >= coalesce(d.v4_max_soru, public.ayar_sayi('duello4_max_soru', 20)::smallint) then
    perform public.duello4_ortak_soru_ac(p_id, true);                  -- 1093: toplam 20. soru Son Düello (tek bilen çıkana kadar)
  elsif d.v4_kontrol is null then
    perform public.duello4_ortak_soru_ac(p_id, false);                 -- nötr (art arda nötr artık Son Düello tetiklemez)
  else
    perform public.duello4_kart_ac(p_id);
  end if;
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
     and d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('mac_kopuk_toplam_sn', 60)) then
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

CREATE OR REPLACE FUNCTION public.coin_mac_odulu(p_referans text, p_kazanan uuid, p_oyuncular uuid[], p_carpan numeric DEFAULT 1, p_serbest boolean DEFAULT false, p_acik_bot boolean DEFAULT false, p_galibiyet_anahtar text DEFAULT 'coin_mac_galibiyet'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_galibiyet bigint:=public.ayar_sayi(coalesce(p_galibiyet_anahtar,'coin_mac_galibiyet'),25);
  v_beraberlik bigint:=public.ayar_sayi('coin_mac_beraberlik',10); v_serbest boolean:=coalesce(p_serbest,false);
  v_carpan numeric; v_oyuncu uuid; v_mac_id uuid; v_dereceli boolean; v_jokersiz boolean:=false;
begin
  if p_referans is null then return; end if;
  begin v_mac_id:=p_referans::uuid; exception when others then v_mac_id:=null; end;
  if v_mac_id is not null then
    select coalesce(m.dereceli,true),coalesce(m.jokersiz,false) into v_dereceli,v_jokersiz from public.matches m where m.id=v_mac_id;
    if found and not v_dereceli then v_serbest:=true; end if;
  end if;
  v_carpan:=public.odul_carpani(p_carpan,v_serbest,p_acik_bot);
  if v_jokersiz then v_carpan:=least(v_carpan,public.ayar_ondalik('saf_bilgi_odul_carpani',0.5)); end if;
  perform set_config('app.odul_detay',coalesce(jsonb_build_object('indirim',
    case when v_jokersiz then 'Saf Bilgi' else public.odul_indirim_sebebi(p_carpan,v_serbest,p_acik_bot) end)::text,''),true);
  if v_carpan<=0 then
    foreach v_oyuncu in array(case when p_kazanan is null then coalesce(p_oyuncular,'{}'::uuid[]) else array[p_kazanan] end) loop
      perform public.odul_kalem_yaz(v_oyuncu,case when p_kazanan is null then 'beraberlik' else 'galibiyet' end,0,0,'{}'::jsonb);
    end loop;
  elsif p_kazanan is not null then
    perform set_config('app.odul_kalem','galibiyet',true);
    perform public.coin_ekle(p_kazanan,floor(v_galibiyet*v_carpan)::bigint,'mac',p_referans);
  else
    perform set_config('app.odul_kalem','beraberlik',true);
    foreach v_oyuncu in array coalesce(p_oyuncular,'{}'::uuid[]) loop
      perform public.coin_ekle(v_oyuncu,floor(v_beraberlik*v_carpan)::bigint,'mac',p_referans);
    end loop;
  end if;
  perform set_config('app.odul_kalem','',true); perform set_config('app.odul_detay','',true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.xp_mac_odulu(p_kaynak text, p_mod text, p_kazanan uuid, p_oyuncular uuid[], p_cift numeric DEFAULT 1, p_acik_bot boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      if p_mod = 'kasa' then   -- 950
        v_oynadi := exists (select 1 from public.kasa_cevaplari c
                             where c.kasa_id = v_id and c.user_id = v_oyuncu and c.cevap is not null);
      else
        v_oynadi := exists (select 1 from public.match_answers a where a.match_id = v_id and a.user_id = v_oyuncu);
      end if;
    end if;
    if v_sonuc <> 'galibiyet' and not v_oynadi then v_taban := 0; end if;
    v_xp := greatest(floor(v_taban * v_carpan), 0)::int;
    perform public.xp_ver(v_oyuncu, v_xp, p_kaynak,
      jsonb_strip_nulls(jsonb_build_object('sonuc', v_sonuc, 'taban', v_taban, 'carpan', v_carpan,
                                           'indirim', v_indirim, 'oynamadi', case when not v_oynadi and v_sonuc <> 'galibiyet' then true end)));
  end loop;
end $function$;

CREATE OR REPLACE FUNCTION public.trg_sezon_duello()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.durum = 'bitti' and old.durum is distinct from 'bitti' then
    begin
      if new.terk_eden is distinct from new.oyuncu1 then
        perform public.sezon_mac_sp('duello', 'duello:' || new.id, new.oyuncu1, new.oyuncu2, new.kazanan, new.odul_carpan);
      end if;
      if new.oyuncu2 is not null and new.terk_eden is distinct from new.oyuncu2 then
        perform public.sezon_mac_sp('duello', 'duello:' || new.id, new.oyuncu2, new.oyuncu1, new.kazanan, new.odul_carpan);
      end if;
    exception when others then
      raise warning 'sezon_duello_sp: %', sqlerrm;
    end;
  end if;
  return null;
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
      -- 1093: Son Düello toplam soru sınırında (nötr + saldırı); rehber = bu maç oyuncunun ilk Düello rehberi maçı
      'max_soru', coalesce(d.v4_max_soru, public.ayar_sayi('duello4_max_soru', 20)::smallint),
      'rehber', coalesce((select p.duello_rehber_mac = d.id from public.profiles p where p.id = v_me), false),
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
