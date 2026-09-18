-- Paket 34 — BÜTÜN JOKERLER GEÇİCİ OLARAK ÜCRETSİZ VE SINIRSIZ (sahibinin talimatı, 18 Eyl 2026:
-- "bütün jokerleri ful sınırsız yap, bedava ücretsiz yap, sonra söyleyeceğim ücretlendireceksin").
--
-- TEK ANAHTAR: oyun_ayarlari.jokerler_ucretsiz = 1 → açık, 0 → eski ekonomi AYNEN geri gelir.
-- Geri almak için yalnız:  update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz';
-- (Kod değişmeden, yeniden dağıtım gerekmeden. İstemci de aynı ayarı okuyor.)
--
-- Açıkken:
--   * envanterden hiçbir joker düşmez (Klasik, Grup, Turnuva, Düello) — stok gerekmez
--   * maç başına hak sınırı (4) ve "aynı joker maçta bir kez" kalkar
--   * maç içi satın alma olmaz, coin düşmez
--   * KALAN TEK SINIR: aynı joker AYNI SORUDA bir kez (sonsuz +10 sn / Soru Değiştir ile süreyi
--     sıfırlayıp maçı kilitlemek olmasın). Düelloda bu zaten saldırı/soru başına vardı; savunmadaki
--     Soru Değiştir'e aynı soru koruması eklendi (normal modda maç başına bir kez olduğu için
--     davranışı değişmez).
-- Değişmeyen oyun kuralları (mod kuralı, ekonomi değil): Saf Bilgi'de joker yok, turnuva finali ve
-- altın soruda joker yok, turnuvada Soru Değiştir yok, Sis'in son 6 sn kuralı, Savunma Kilidi.
-- Botlar mevcut sınırlarıyla oynar (bot_klasik_joker_tik / duello_tik_hepsi değişmedi).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('jokerler_ucretsiz', '1'::jsonb,
   'Paket 34: 1 = bütün jokerler ücretsiz ve sınırsız (stok/hak/satın alma yok), 0 = normal ekonomi')
on conflict (anahtar) do update set deger = excluded.deger;

create or replace function public.jokerler_serbest()
returns boolean
language sql stable security definer set search_path to 'public'
as $function$
  select public.ayar_sayi('jokerler_ucretsiz', 0) > 0;
$function$;
revoke all on function public.jokerler_serbest() from public, anon;
grant execute on function public.jokerler_serbest() to authenticated;

-- ---------------------------------------------------------------------------
-- Canlı gövdeler + Paket 34 ekleri (başka satır değişmedi)
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

  -- AYNI JOKER MAÇ BAŞINA BİR KEZ (Paket 27 B.1.5) — ücretsiz modda KAPALI (Paket 34);
  -- o modda "aynı soruda bir kez" kuralı joker_kullan / duello_* içinde uygulanır.
  if not public.jokerler_serbest() and exists (
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
  -- Paket 34: ücretsiz ve sınırsız mod — maç başına hak sınırı yok
  if public.jokerler_serbest() then
    return;
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
  -- Paket 34: ücretsiz/sınırsız modda aynı joker AYNI SORUDA bir kez (sonsuz süre uzatma /
  -- soru değiştirme olmasın). Normal modda zaten maç başına bir kez (joker_hak_kontrol).
  if public.jokerler_serbest() and exists (
    select 1 from public.joker_kullanimlari k
     where k.user_id = v_me and k.mac_tur = p_mac_tur and k.mac_id = p_mac_id
       and k.soru_index = v_aktif_soru and k.tur = p_tur
  ) then
    raise exception 'Bu jokeri bu soruda zaten kullandın';
  end if;

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

CREATE OR REPLACE FUNCTION public.joker_al_ve_kullan(p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_fiyat bigint;
  v_adet int;
  v_satin boolean := false;
  v_sonuc jsonb;
begin
  -- Arka arkaya basılıp coin boşaltılamasın.
  perform public.hiz_siniri('joker_al_ve_kullan', 10, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_mac_tur not in ('1v1', 'grup', 'hizli', 'turnuva', 'duello') then
    raise exception 'Geçersiz maç türü';
  end if;

  v_fiyat := public.joker_fiyati(p_tur);
  if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu joker satın alınamaz'; end if;

  -- Hak kapısı satın almadan ÖNCE: hakkı dolmuş oyuncudan coin alınmasın.
  -- (Aynı kapı kullanım fonksiyonunda tekrar çalışır; burada erken dönmek için.)
  perform public.joker_hak_kontrol(p_mac_tur, p_mac_id, p_tur);

  -- Profil kilidi: iki sekmeden aynı anda satın alma aynı coin'i harcayamaz.
  perform 1 from public.profiles where id = v_me for update;

  select coalesce(e.adet, 0) into v_adet
    from public.joker_envanter e where e.user_id = v_me and e.tur = p_tur;

  -- Ücretsiz 50:50 hakkı duruyorsa satın almaya gerek yok — coin boşa gitmesin.
  -- Paket 34: ücretsiz modda hiçbir şey satın alınmaz, coin düşmez
  if not public.jokerler_serbest() and coalesce(v_adet, 0) <= 0 and not (p_tur = 'elli'
      and public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id)) then
    perform public.coin_harca(v_fiyat, 'joker', 'joker_mac_ici:' || p_mac_id::text);
    perform public.joker_hareket(v_me, p_tur, 1, 'mac_ici', p_mac_tur || ':' || p_mac_id::text);
    v_satin := true;
  end if;

  -- Kullanım: buradan sonra bir hata çıkarsa İŞLEMİN TAMAMI geri alınır,
  -- yani coin de joker de geri gelir.
  if p_mac_tur = 'duello' then
    if p_tur in ('zaman_baskisi', 'saldiri_degistir', 'savunma_kilidi') then
      perform public.duello_saldiri_jokeri(p_mac_id, p_tur);
    else
      perform public.duello_savunma_jokeri(p_mac_id, p_tur);
    end if;
    v_sonuc := jsonb_build_object('tur', p_tur);
  else
    v_sonuc := public.joker_kullan(p_mac_tur, p_mac_id, p_soru_index, p_tur);
  end if;

  return v_sonuc
    || jsonb_build_object(
         'satin_alindi', v_satin,
         'odenen', case when v_satin then v_fiyat else 0 end,
         'coin', (select pr.coin from public.profiles pr where pr.id = v_me));
end;
$function$


;

CREATE OR REPLACE FUNCTION public.duello_saldiri_jokeri(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_kullanilan int;
  v_ucretsiz boolean;
  v_soru uuid;
  v_savunan uuid;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  if p_tur not in ('zaman_baskisi','saldiri_degistir','savunma_kilidi') then raise exception 'Geçersiz joker'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' or d.faz <> 'hazirlik' or d.saldiran <> v_me or now() >= d.faz_bitis then
    raise exception 'Saldırı jokerleri yalnız Saldırı Hazırlığı sırasında kullanılır';
  end if;
  if (p_tur = 'zaman_baskisi' and d.zaman_baskisi) or (p_tur = 'savunma_kilidi' and d.savunma_kilidi) then
    raise exception 'Bu joker bu saldırıda zaten kullanıldı';
  end if;
  if p_tur = 'saldiri_degistir' and d.soru_degisti_saldiri then
    raise exception 'Yeni gelen soru ikinci kez değiştirilemez';
  end if;

  -- Paket 27 B: saldırı ve savunma ayrı ayrı değil, TEK toplam hak sayılır;
  -- aynı joker maçta bir kez. Düelloda hiçbir joker ücretsiz DEĞİL.
  perform public.joker_hak_kontrol('duello', p_id, p_tur);
  -- Paket 34: ücretsiz/sınırsız modda envanterden düşülmez
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'duello:' || p_id::text);
  end if;
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, 'duello', p_id, d.tur * 2 + d.saldiri_sirasi, p_tur, v_ucretsiz);

  if p_tur = 'zaman_baskisi' then
    update public.duellolar set zaman_baskisi = true, son_hareket = now() where id = p_id;
  elsif p_tur = 'savunma_kilidi' then
    update public.duellolar set savunma_kilidi = true, son_hareket = now() where id = p_id;
  else
    v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
    v_soru := public.duello_soru_bul(p_id, d.kategori, array[v_savunan, v_me], d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
    update public.duellolar
       set soru_id = v_soru, soru_degisti_saldiri = true,
           kullanilan_sorular = kullanilan_sorular || v_soru, son_hareket = now()
     where id = p_id;
    perform public.gorulen_kaydet(v_soru);
  end if;
  perform public.duello_sinyal_ver(p_id);
end $function$


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
  -- Paket 34: sınırsız modda savunan Soru Değiştir'le süreyi sonsuza kadar sıfırlamasın
  if p_tur = 'soru_degistir' and d.soru_degisti_savunma then
    raise exception 'Bu soruda Soru Değiştir zaten kullanıldı';
  end if;

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

