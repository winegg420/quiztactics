-- Paket 31 A — Klasik Mod'a saldırı jokerleri (sahibinin kararı, 18 Eyl 2026).
--
-- KARAR (sahibine soruldu): Klasik Mod'da 5 joker —
--   savunma: elli · sure · soru_degistir (artık ORTAK: iki oyuncunun da sorusu değişir)
--   saldırı: zaman_baskisi ("Süreyi Kısalt") · savunma_kilidi
-- saldiri_degistir Klasik'te YOK (iki ayrı "Soru Değiştir" düğmesi olmasın).
-- Yalnız '1v1'. grup/hizli/turnuva ve düello DEĞİŞMEZ.
--
-- ÖLÇÜLDÜ (A.2): senkron 1v1'de süre ORTAK `matches.soru_baslangic`'tan sayılır; ama
-- kişi bazlı geçersiz kılma zaten var: `soru_degisimleri.baslangic` (soru_baslangic_coz).
-- cevap (submit_match_answer), süre dolumu (mac_soruyu_atla) ve joker kapısı hepsi onu
-- okuyor. Bu yüzden YENİ TABLO GEREKMEDİ: Süreyi Kısalt rakibin kişisel satırını
-- (aynı soru, daha erken başlangıç) yazar. İlerleme `soru_son_baslangic` = en GEÇ başlangıç
-- olduğu için rakibin erken bitmesi turu kısaltmaz; rakip farkı bekleme ekranında geçirir.
--
-- Tek şema eki: `matches.joker_surum` — rakibi etkileyen her jokerde bir artar. Rakibin
-- ekranı soruyu yalnız soru indeksi değişince çekiyordu; bu sayaç Realtime ile gelir,
-- istemci soruyu/sayacı ve joker durumunu yeniden okur.

alter table public.matches add column if not exists joker_surum integer not null default 0;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('klasik_zaman_baskisi_sn', '5'::jsonb,
   'Klasik Mod Süreyi Kısalt: rakibin soru süresinden düşülen saniye (düellodaki 15→10 farkı)'),
  ('klasik_zaman_baskisi_taban_sn', '3'::jsonb,
   'Klasik Mod Süreyi Kısalt: rakibe en az bu kadar saniye kalır (anında sıfırlanmasın)'),
  -- 0 ile başlar: istemci (rakibin soru/sayaç yenilemesi) yayınlanmadan bot soruyu
  -- değiştirirse eski ekran yeni soruyu göstermeden yeni soruya göre puanlanırdı.
  -- İstemci yayınlandıktan sonra ayrı migration 15'e çeker.
  ('klasik_bot_joker_yuzde', '0'::jsonb,
   'Klasik Mod: botun bir soruda saldırı jokeri kullanma olasılığı (%)')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------------------
-- Rakibi etkileyen Klasik joker etkisi — TEK YER (oyuncu ve bot aynı yolu kullanır).
-- İç fonksiyon: istemciye açık değil.
create or replace function public.klasik_joker_etki(p_mac_id uuid, p_user uuid, p_index integer, p_tur text)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  m public.matches%rowtype;
  v_rakip uuid;
  v_bas timestamptz;
  v_yeni_bas timestamptz;
  v_soru uuid;
  v_ben_soru uuid;
  v_ben_bas timestamptz;
begin
  select * into m from public.matches where id = p_mac_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  v_rakip := case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end;
  -- Kullanılmayan asenkron dalda "aynı soru, aynı anda" yok; etki anlamsız.
  if not coalesce(m.senkron, false) then
    raise exception 'Bu joker yalnız eş zamanlı maçta kullanılabilir';
  end if;

  -- Rakip bu soruyu zaten cevapladıysa etki boşa gider
  if exists (select 1 from public.match_answers a
              where a.match_id = p_mac_id and a.user_id = v_rakip and a.soru_index = p_index) then
    if p_tur = 'soru_degistir' then return; end if;   -- yalnız basanın sorusu değişmiş olur
    raise exception 'Rakibin bu soruyu zaten cevapladı';
  end if;

  if p_tur = 'soru_degistir' then
    -- A.1: basanın yeni sorusu ve başlangıcı rakibe de yazılır (aynı question_id).
    -- mac_soru_degistir 1v1'de iki oyuncuyu da soru_sec'e veriyor ve maçın bütün
    -- soru_ids + soru_degisimleri'ni dışlıyor → soru ikisi için de yeni.
    select d.question_id, d.baslangic into v_ben_soru, v_ben_bas
      from public.soru_degisimleri d
     where d.mac_tur = '1v1' and d.mac_id = p_mac_id and d.user_id = p_user and d.soru_index = p_index;
    if v_ben_soru is null then return; end if;
    insert into public.soru_degisimleri (mac_tur, mac_id, user_id, soru_index, question_id, baslangic)
    values ('1v1', p_mac_id, v_rakip, p_index, v_ben_soru, v_ben_bas)
    on conflict (mac_tur, mac_id, user_id, soru_index)
      do update set question_id = excluded.question_id, baslangic = excluded.baslangic;

  elsif p_tur = 'zaman_baskisi' then
    -- A.2: yalnız rakibin süresi kısalır. Basanınki aynen sürer.
    v_bas := public.soru_baslangic_coz('1v1', p_mac_id, v_rakip, p_index, m.soru_baslangic);
    v_soru := public.soru_id_coz('1v1', p_mac_id, v_rakip, p_index, m.soru_ids[p_index + 1]);
    v_yeni_bas := least(
      v_bas,
      greatest(v_bas - make_interval(secs => public.ayar_sayi('klasik_zaman_baskisi_sn', 5)),
               now() - make_interval(secs => 15 - public.ayar_sayi('klasik_zaman_baskisi_taban_sn', 3))));
    insert into public.soru_degisimleri (mac_tur, mac_id, user_id, soru_index, question_id, baslangic)
    values ('1v1', p_mac_id, v_rakip, p_index, v_soru, v_yeni_bas)
    on conflict (mac_tur, mac_id, user_id, soru_index)
      do update set baslangic = excluded.baslangic;

  elsif p_tur = 'savunma_kilidi' then
    null;   -- kayıt joker_kullanimlari'nda; joker_hak_kontrol okur
  else
    return;
  end if;

  -- Rakibin ekranı soruyu/sayacı/joker durumunu yeniden okusun (Realtime)
  update public.matches set joker_surum = joker_surum + 1 where id = p_mac_id;
end;
$function$;
revoke all on function public.klasik_joker_etki(uuid, uuid, integer, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- joker_hak_kontrol: + Klasik Savunma Kilidi (A.3). Geri kalanı canlıdakiyle aynı.
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

  -- AYNI JOKER MAÇ BAŞINA BİR KEZ (Paket 27 B.1.5)
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

-- ---------------------------------------------------------------------------
-- joker_kullan: canlı gövde + üç ek (Paket 31 A). Başka satır değişmedi.
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
          or (p_mac_tur = '1v1' and p_tur in ('zaman_baskisi','savunma_kilidi'))) then
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

  -- Paket 27 B: toplam hak + "aynı joker maçta bir kez" tek yerden (joker_hak_kontrol).
  perform public.joker_hak_kontrol(p_mac_tur, p_mac_id, p_tur);

  -- "Soru Değiştir maç başına 1 kez" kuralı artık BÜTÜN türler için geçerli;
  -- yukarıdaki joker_hak_kontrol uyguluyor, ayrı istisnaya gerek kalmadı.

  -- Ücretsiz 50:50 yalnız SERBEST Klasik Mod'da (Paket 27 B.1.2).
  if p_tur = 'elli' then
    v_ucretsiz := public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id);
  end if;

  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', p_mac_tur || ':' || p_mac_id::text);
  end if;

  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, p_mac_tur, p_mac_id, v_aktif_soru, p_tur, v_ucretsiz);

  -- Paket 31 A.2 / A.3: Klasik saldırı jokerleri — etki rakibe (tek yer: klasik_joker_etki)
  if p_mac_tur = '1v1' and p_tur in ('zaman_baskisi','savunma_kilidi') then
    perform public.klasik_joker_etki(p_mac_id, v_me, v_aktif_soru, p_tur);
    return jsonb_build_object('tur', p_tur, 'ucretsiz', false, 'uygulandi', true);
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

-- ---------------------------------------------------------------------------
-- joker_mac_durumu: + rakibin bu sorudaki etkileri (yalnız 1v1, yalnız aktif soru).
--   kilitli     — rakip Savunma Kilidi bastı: arayüz "Rakibin savunma jokerlerini kilitledi."
--   kisaltildi  — rakip Süreyi Kısalt bastı: arayüz sayaç kısaldığını söyler
-- Dönüş tipi değiştiği için drop + create (imza aynı, istemci aynı çağırır).
drop function if exists public.joker_mac_durumu(text, uuid);
create function public.joker_mac_durumu(p_mac_tur text, p_mac_id uuid)
returns table(sinir integer, kullanilan integer, ucretsiz_elli_kaldi boolean,
              kilitli boolean, kisaltildi boolean)
language sql stable security definer set search_path to 'public'
as $function$
  with etki as (
    select k.tur
      from public.matches m
      join public.joker_kullanimlari k
        on k.mac_tur = '1v1' and k.mac_id = m.id and k.soru_index = m.aktif_soru
       and k.user_id <> auth.uid()
     where p_mac_tur = '1v1' and m.id = p_mac_id
       and auth.uid() in (m.oyuncu1, m.oyuncu2)
  )
  select
    public.joker_mac_siniri(p_mac_tur, p_mac_id),
    (select count(*)::int from public.joker_kullanimlari
      where user_id = auth.uid() and mac_tur = p_mac_tur and mac_id = p_mac_id),
    public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id),
    exists (select 1 from etki where tur = 'savunma_kilidi'),
    exists (select 1 from etki where tur = 'zaman_baskisi');
$function$;
revoke all on function public.joker_mac_durumu(text, uuid) from public, anon;
grant execute on function public.joker_mac_durumu(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A.5 BOT SİMETRİSİ — Klasik Mod'da bot da saldırı jokeri basar, aynı sınırlarla:
--   * maç başına en çok duello_joker_hak (4), aynı türden bir kez
--   * insan bu soruda Savunma Kilidi bastıysa bot joker kullanamaz
--   * insan soruyu cevaplamadan önce (etkisi boşa gitmesin)
--   * olasılık klasik_bot_joker_yuzde; karar (maç, soru) için SABİT (bot_rasgele):
--     cron 2 sn'de bir döner, zar her tikte yeniden atılmasın
--   * zaman: sorunun 2.–8. saniyesi arasında, yine sabit tohumla
-- Bot envantere sahip değil (düellodaki gibi): kullanım ucretsiz=true yazılır.
create or replace function public.bot_klasik_joker_tik()
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  r record;
  v_tur text;
begin
  if not pg_try_advisory_xact_lock(hashtext('bot_klasik_joker_tik')) then return; end if;
  for r in
    select m.id, m.aktif_soru as idx, p.id as bot_id,
           case when m.oyuncu1 = p.id then m.oyuncu2 else m.oyuncu1 end as insan_id
      from public.matches m
      join public.profiles p on p.is_bot and p.id in (m.oyuncu1, m.oyuncu2)
     where m.durum = 'aktif' and coalesce(m.senkron, false) and m.basladi
       and m.duraklatildi_at is null
       and m.aktif_soru < coalesce(array_length(m.soru_ids, 1), 0)
       and now() >= m.soru_baslangic + make_interval(secs =>
             2 + 6 * public.bot_rasgele('kjz:' || m.id::text || ':' || m.aktif_soru))
       and now() <= m.soru_baslangic + interval '10 seconds'
       and public.bot_rasgele('kjok:' || m.id::text || ':' || m.aktif_soru) * 100
             < public.ayar_sayi('klasik_bot_joker_yuzde', 15)
     for update of m skip locked
  loop
    -- bu soruda bot zaten joker bastı mı / insan cevapladı mı / insan kilitledi mi
    continue when exists (select 1 from public.joker_kullanimlari k
                           where k.mac_tur = '1v1' and k.mac_id = r.id and k.soru_index = r.idx
                             and k.user_id = r.bot_id);
    continue when exists (select 1 from public.match_answers a
                           where a.match_id = r.id and a.soru_index = r.idx
                             and a.user_id in (r.insan_id, r.bot_id));
    continue when exists (select 1 from public.joker_kullanimlari k
                           where k.mac_tur = '1v1' and k.mac_id = r.id and k.soru_index = r.idx
                             and k.user_id = r.insan_id and k.tur = 'savunma_kilidi');
    continue when (select count(*) from public.joker_kullanimlari k
                    where k.mac_tur = '1v1' and k.mac_id = r.id and k.user_id = r.bot_id)
                  >= public.ayar_sayi('duello_joker_hak', 4);

    select t into v_tur
      from unnest(array['zaman_baskisi', 'savunma_kilidi', 'soru_degistir']) t
     where not exists (select 1 from public.joker_kullanimlari k
                        where k.mac_tur = '1v1' and k.mac_id = r.id
                          and k.user_id = r.bot_id and k.tur = t)
     order by public.bot_rasgele('kjt:' || r.id::text || ':' || r.idx || ':' || t)
     limit 1;
    continue when v_tur is null;

    insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
    values (r.bot_id, '1v1', r.id, r.idx, v_tur, true);

    if v_tur = 'soru_degistir' then
      perform public.mac_soru_degistir('1v1', r.id, r.bot_id, r.idx);
    end if;
    perform public.klasik_joker_etki(r.id, r.bot_id, r.idx, v_tur);
  end loop;
end;
$function$;
revoke all on function public.bot_klasik_joker_tik() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- bot_oyna: canlı gövde + üç ek (joker tiki, kişisel başlangıç, kişisel soru).
CREATE OR REPLACE FUNCTION public.bot_oyna()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  q public.questions%rowtype;
  v_cevap smallint;
  v_dogru boolean;
  v_puan int;
  v_ilk boolean;
  v_bot_index int;
  v_tepkiler text[] := array['👍','😂','😮','🔥','😎','Hadi bakalım!','Bunu biliyordum!','Vay be! 🤯'];
begin
  -- Paket 26 E: aynı işin iki kopyası aynı anda çalışmasın. Ölçüldü (17 Eyl 15:00 UTC):
  -- migration uygulanırken fonksiyon derlemesi kilitlenince 2 saniyelik işler birikti ve
  -- 9 koşu 120 sn'lik ifade zaman aşımına düştü. Kilidi alamayan koşu sessizce atlar.
  if not pg_try_advisory_xact_lock(hashtext('bot_oyna')) then return; end if;
  -- 1) Botlara gelen meydan okumaları kabul et (kategoriye saygılı)
  for r in
    select m.id, m.kategori, m.oyuncu1 from public.matches m
    join public.profiles p on p.id = m.oyuncu2 and p.is_bot
    where m.durum = 'bekliyor'
      -- GİZLİ bot daveti hemen kabul etmez: insan gibi biraz düşünür.
      -- Açık bot (adı "...Bot") anında kabul eder, oyuncu zaten biliyor.
      and public.bot_daveti_kabul_etti_mi(p.id, m.created_at, m.id::text,
                                          coalesce(p.bot_turu, 'acik'))
    for update of m skip locked
  loop
    update public.matches
       set durum = 'aktif',
           soru_ids = public.soru_sec(r.kategori, 20, array[r.oyuncu1]),
           aktif_soru = 0,
           soru_baslangic = now(),
           kabul_at = now()
     where id = r.id;
  end loop;

  -- Paket 31 A.5: Klasik Mod'da bot da saldırı jokeri basar (aynı kurallar)
  perform public.bot_klasik_joker_tik();

  -- 2) Aktif maçlarda cevapla — bot ASLA oyuncunun önüne geçmez.
  --    Bot yalnızca oyuncunun ulaştığı soruyu cevaplar (oyuncunun cevapladığı
  --    en yüksek indeks + 1) ve 2-6 sn arası rastgele gecikmeyle yanıtlar.
  --    (Eski davranış: 3 sn sonra her soruyu cevaplıyordu; 16 sn'lik otomatik
  --     ilerletmeyle birleşince bot 20 soruyu bitirirken oyuncu 2. sorudaydı.)
  for r in
    select m.*, p.id as bot_id, p.bot_isabet,
           case when m.oyuncu1 = p.id then m.oyuncu2 else m.oyuncu1 end as insan_id
    from public.matches m
    join public.profiles p on p.is_bot and p.id in (m.oyuncu1, m.oyuncu2)
    where m.durum = 'aktif'
      -- Botun sira indeksi. SENKRONDA ortak soru (aktif_soru) ile ayni olmali:
      -- bot cevapladiginda kendi indeksi bir ilerler ve sira ortak indeksten
      -- one gecer; boylece ayni soruyu ikinci kez cevaplamaz (cift puan yok).
      and (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)
          < coalesce(array_length(m.soru_ids, 1), 0)
      and (
        not coalesce(m.senkron, false)
        or (m.basladi
            and (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)
                = m.aktif_soru)
      )
      -- Bot, insan oyuncunun ulaştığı sırayı GEÇEMEZ
      and (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)
          <= (case when m.oyuncu1 = p.id then m.oyuncu2_soru else m.oyuncu1_soru end)
      -- 2-6 sn rastgele gecikme (insanın son hamlesinden sonra)
      -- Gecikme artik ZORLUGA BAGLI ve SORU BASINA SABIT (bkz. bot_gecikme_sn).
      -- Paket 31 A: soru değiştiyse / süresi kısaltıldıysa botun KİŞİSEL başlangıcı geçerli
      and (not coalesce(m.senkron, false)
           or now() <= public.soru_baslangic_coz('1v1', m.id, p.id, m.aktif_soru, m.soru_baslangic)
                       + interval '15 seconds')
      and now() >= coalesce(public.soru_baslangic_coz('1v1', m.id, p.id,
                     (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end),
                     m.soru_baslangic), m.created_at)
                   + public.bot_gecikme_sn(
                       p.id,
                       m.id::text || ':' ||
                       (case when m.oyuncu1 = p.id then m.oyuncu1_soru else m.oyuncu2_soru end)::text,
                       p.bot_gecikme_min, p.bot_gecikme_max,
                       public.soru_okuma_yuku(
                         m.soru_ids[(case when m.oyuncu1 = p.id
                                          then m.oyuncu1_soru else m.oyuncu2_soru end) + 1])
                     ) * interval '1 second'
    for update of m skip locked
  loop
    v_bot_index := case when r.oyuncu1 = r.bot_id then r.oyuncu1_soru else r.oyuncu2_soru end;
    -- Paket 31 A.1: soru ortak değiştiyse bot da YENİ soruyu cevaplar
    select * into q from public.questions
     where id = public.soru_id_coz('1v1', r.id, r.bot_id, v_bot_index, r.soru_ids[v_bot_index + 1]);
    if not found then continue; end if;

    if random() < public.bot_kategori_isabet(r.bot_id, q.kategori) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.match_answers (match_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, v_bot_index, v_cevap, v_dogru)
    on conflict do nothing;

    -- HIZ BONUSU YOK: bot da insanla ayni sabit puani alir
    v_puan := case when v_dogru then 10 else 0 end;

    if r.oyuncu1 = r.bot_id then
      update public.matches
         set oyuncu1_skor = oyuncu1_skor + v_puan,
             oyuncu1_soru = v_bot_index + 1,
             oyuncu1_bitti_at = case
               when v_bot_index + 1 >= coalesce(array_length(r.soru_ids,1),0) then now()
               else oyuncu1_bitti_at end,
             aktif_soru = case when coalesce(r.senkron, false)
                               then aktif_soru else greatest(aktif_soru, v_bot_index + 1) end,
             soru_baslangic = case when coalesce(r.senkron, false)
                                   then soru_baslangic else now() end
       where id = r.id;
    else
      update public.matches
         set oyuncu2_skor = oyuncu2_skor + v_puan,
             oyuncu2_soru = v_bot_index + 1,
             oyuncu2_bitti_at = case
               when v_bot_index + 1 >= coalesce(array_length(r.soru_ids,1),0) then now()
               else oyuncu2_bitti_at end,
             aktif_soru = case when coalesce(r.senkron, false)
                               then aktif_soru else greatest(aktif_soru, v_bot_index + 1) end,
             soru_baslangic = case when coalesce(r.senkron, false)
                                   then soru_baslangic else now() end
       where id = r.id;
    end if;

    perform public.advance_match(r.id);

    if random() < 0.15 then
      insert into public.match_messages (match_id, user_id, mesaj)
      values (r.id, r.bot_id, v_tepkiler[1 + floor(random() * array_length(v_tepkiler, 1))::int]);
    end if;
  end loop;

  -- 3) Bot maçlarını ilerlet — oyuncu cevaplamadan 16 sn'de ilerletme.
  --    İki koşuldan biri: (a) her ikisi de cevapladı, (b) süre doldu VE oyuncu
  --    bu soruyu cevapladı. Oyuncu maçı terk ederse 90 sn'lik güvenlik ağı
  --    devreye girer (maç sonsuza kadar aktif kalmasın).
  for r in
    select distinct m.id from public.matches m
    join public.profiles p on p.is_bot and p.id in (m.oyuncu1, m.oyuncu2)
    where m.durum = 'aktif'
      and (not coalesce(m.senkron, false) or m.basladi)
      and (
        2 <= (select count(*) from public.match_answers a
              where a.match_id = m.id and a.soru_index = m.aktif_soru)
        or (now() > m.soru_baslangic + interval '16 seconds'
            and exists (
              select 1 from public.match_answers a
              where a.match_id = m.id and a.soru_index = m.aktif_soru
                and a.user_id = (case when m.oyuncu1 = p.id then m.oyuncu2 else m.oyuncu1 end)
            ))
        or now() > m.soru_baslangic + interval '90 seconds'
      )
  loop
    perform public.advance_match(r.id);
  end loop;

  -- 4) Turnuvada hayatta olan botlar cevaplasın
  for r in
    select t.*, p.id as bot_id, p.bot_isabet
    from public.tournaments t
    join public.tournament_players tp on tp.tournament_id = t.id and not tp.elendi
    join public.profiles p on p.id = tp.user_id and p.is_bot
    where t.durum = 'aktif'
      -- Gecikme BOTA OZEL (bkz. bot_gecikme_sn): acik botlar aninda,
      -- gizli botlar lig seviyelerine uygun gercekci surede cevaplar.
      and now() >= t.soru_baslangic + public.bot_gecikme_sn(
            p.id, t.id::text || ':' || t.aktif_soru::text,
            p.bot_gecikme_min, p.bot_gecikme_max,
            public.soru_okuma_yuku(t.soru_ids[t.aktif_soru + 1])) * interval '1 second'
      and now() <= t.soru_baslangic + interval '15 seconds'
      and not exists (
        select 1 from public.tournament_answers ta
        where ta.tournament_id = t.id and ta.user_id = p.id and ta.soru_index = t.aktif_soru
      )
  loop
    select * into q from public.questions where id = r.soru_ids[r.aktif_soru + 1];
    if not found then continue; end if;

    if random() < public.bot_kategori_isabet(r.bot_id, q.kategori) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.tournament_answers (tournament_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, r.aktif_soru, v_cevap, v_dogru)
    on conflict do nothing;

    if v_dogru then
      update public.tournament_players
         set dogru_sayisi = dogru_sayisi + 1
       where tournament_id = r.id and user_id = r.bot_id;
    end if;
  end loop;

  -- 5) Turnuvaları ilerlet (süre dolduysa veya hayattaki herkes cevapladıysa)
  for r in
    select t.id from public.tournaments t
    where t.durum = 'aktif'
      and (now() > t.soru_baslangic + interval '16 seconds'
        or not exists (
          select 1 from public.tournament_players tp
          where tp.tournament_id = t.id and not tp.elendi
            and not exists (
              select 1 from public.tournament_answers ta
              where ta.tournament_id = t.id
                and ta.user_id = tp.user_id
                and ta.soru_index = t.aktif_soru
            )
        ))
  loop
    perform public.advance_tournament(r.id);
  end loop;

  -- 6) Botlara giden grup davetlerini kabul et
  for r in
    select gmp.group_match_id, gmp.user_id as bot_id
    from public.group_match_players gmp
    join public.profiles p on p.id = gmp.user_id and p.is_bot
    join public.group_matches gm on gm.id = gmp.group_match_id
    where gm.durum = 'bekliyor' and gmp.davet_durumu = 'bekliyor'
      and public.bot_daveti_kabul_etti_mi(p.id, gmp.joined_at, gmp.group_match_id::text,
                                          coalesce(p.bot_turu, 'acik'))
    for update of gmp skip locked
  loop
    update public.group_match_players
       set davet_durumu = 'kabul'
     where group_match_id = r.group_match_id and user_id = r.bot_id;
  end loop;

  -- 7) Herkes kabul ettiyse grup maçını başlat
  for r in
    select gm.id, gm.kategori from public.group_matches gm
    where gm.durum = 'bekliyor'
      and not exists (
        select 1 from public.group_match_players gmp
        where gmp.group_match_id = gm.id and gmp.davet_durumu <> 'kabul'
      )
    for update of gm skip locked
  loop
    update public.group_matches
       set durum = 'aktif',
           soru_ids = public.soru_sec(r.kategori, 20,
                        (select coalesce(array_agg(gmp.user_id), '{}'::uuid[])
                           from public.group_match_players gmp
                          where gmp.group_match_id = r.id)),
           aktif_soru = 0,
           soru_baslangic = now()
     where id = r.id;
  end loop;

  -- 8) Aktif grup maçlarında botlar cevaplasın (ve ara sıra tepki versin)
  for r in
    select gm.*, p.id as bot_id, p.bot_isabet
    from public.group_matches gm
    join public.group_match_players gmp on gmp.group_match_id = gm.id
      and gmp.davet_durumu = 'kabul' and gmp.terk_at is null
    join public.profiles p on p.id = gmp.user_id and p.is_bot
    where gm.durum = 'aktif' and gm.basladi and gm.duraklatildi_at is null
      -- Gecikme BOTA OZEL (1v1 ve turnuvadaki kuralin aynisi)
      and now() >= gm.soru_baslangic + public.bot_gecikme_sn(
            p.id, gm.id::text || ':' || gm.aktif_soru::text,
            p.bot_gecikme_min, p.bot_gecikme_max,
            public.soru_okuma_yuku(gm.soru_ids[gm.aktif_soru + 1])) * interval '1 second'
      and not exists (
        select 1 from public.group_match_answers a
        where a.group_match_id = gm.id and a.user_id = p.id and a.soru_index = gm.aktif_soru
      )
      -- Bot, insan oyuncularin ulastigi soruyu GECEMEZ (1v1'deki kural)
      and gm.aktif_soru <= 1 + coalesce((
        select max(a2.soru_index)
        from public.group_match_answers a2
        join public.profiles p2 on p2.id = a2.user_id
        where a2.group_match_id = gm.id and not coalesce(p2.is_bot, false)
      ), -1)
    for update of gm skip locked
  loop
    select * into q from public.questions where id = r.soru_ids[r.aktif_soru + 1];
    if not found then continue; end if;

    if random() < public.bot_kategori_isabet(r.bot_id, q.kategori) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    insert into public.group_match_answers (group_match_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, r.aktif_soru, v_cevap, v_dogru)
    on conflict do nothing;

    if v_dogru then
      v_puan := 10;
      update public.group_match_players
         set skor = skor + v_puan
       where group_match_id = r.id and user_id = r.bot_id;
    end if;

    if random() < 0.15 then
      insert into public.group_match_messages (group_match_id, user_id, mesaj)
      values (r.id, r.bot_id, v_tepkiler[1 + floor(random() * array_length(v_tepkiler, 1))::int]);
    end if;
  end loop;

  -- 9) Grup maçlarını ilerlet (süre dolduysa veya kabul edenlerin hepsi cevapladıysa)
  for r in
    select gm.id from public.group_matches gm
    where gm.durum = 'aktif' and gm.basladi and gm.duraklatildi_at is null
      and (
        -- herkes cevapladi
        not exists (
          select 1 from public.group_match_players gmp
          where gmp.group_match_id = gm.id and gmp.davet_durumu = 'kabul'
            and gmp.terk_at is null
            and not exists (
              select 1 from public.group_match_answers a
              where a.group_match_id = gm.id and a.user_id = gmp.user_id and a.soru_index = gm.aktif_soru
            )
        )
        -- ya da soru suresi doldu VE en az bir insan bu soruyu fiilen oynadi
        or (now() > gm.soru_baslangic + interval '16 seconds'
            and exists (
              select 1 from public.group_match_answers a3
              join public.profiles p3 on p3.id = a3.user_id
              where a3.group_match_id = gm.id and a3.soru_index = gm.aktif_soru
                and not coalesce(p3.is_bot, false)
            ))
        -- ya da mac terk edildi (guvenlik agi)
        or now() > gm.soru_baslangic + interval '10 minutes'
      )
  loop
    perform public.advance_group_match(r.id);
  end loop;

  -- 10) Botlara giden hızlı maç davetlerini kabul et
  for r in
    select ho.hizli_mac_id, ho.user_id as bot_id
    from public.hizli_oyuncular ho
    join public.profiles p on p.id = ho.user_id and p.is_bot
    join public.hizli_maclar hm on hm.id = ho.hizli_mac_id
    where hm.durum = 'bekliyor' and ho.davet_durumu = 'bekliyor'
      and public.bot_daveti_kabul_etti_mi(p.id, ho.joined_at, ho.hizli_mac_id::text,
                                          coalesce(p.bot_turu, 'acik'))
    for update of ho skip locked
  loop
    update public.hizli_oyuncular
       set davet_durumu = 'kabul'
     where hizli_mac_id = r.hizli_mac_id and user_id = r.bot_id;
  end loop;

  -- 11) Herkes kabul ettiyse hızlı maçı başlat
  for r in
    select hm.id, hm.kategori from public.hizli_maclar hm
    where hm.durum = 'bekliyor'
      and not exists (
        select 1 from public.hizli_oyuncular ho
        where ho.hizli_mac_id = hm.id and ho.davet_durumu <> 'kabul'
      )
    for update of hm skip locked
  loop
    update public.hizli_maclar
       set durum = 'aktif',
           soru_ids = public.soru_sec(r.kategori, 20,
                        (select coalesce(array_agg(ho.user_id), '{}'::uuid[])
                           from public.hizli_oyuncular ho
                          where ho.hizli_mac_id = r.id)),
           aktif_soru = 0,
           soru_baslangic = now()
     where id = r.id;
  end loop;

  -- 12) Aktif hızlı maçlarda botlar cevaplasın (SADECE ilk doğru puan alır)
  --     Yarış durumu: hizli_maclar satırı kilitlenir, ilk doğru kontrolü yapılır.
  for r in
    select hm.*, p.id as bot_id, p.bot_isabet
    from public.hizli_maclar hm
    join public.hizli_oyuncular ho on ho.hizli_mac_id = hm.id
      and ho.davet_durumu = 'kabul' and ho.terk_at is null
    join public.profiles p on p.id = ho.user_id and p.is_bot
    where hm.durum = 'aktif' and hm.basladi and hm.duraklatildi_at is null
      -- Gecikme zorluga bagli ve (mac, soru, bot) icin SABIT: cron her 7 sn'de
      -- calistigi icin random() her tikte yeniden cekiliyordu; bu, dagilimin
      -- alt sinirina yigilmaya (bot hep ~2 sn'de basiyor) yol aciyordu.
      and now() >= hm.soru_baslangic
                   + public.bot_gecikme_sn(
                       p.id, hm.id::text || ':' || hm.aktif_soru::text,
                       p.bot_gecikme_min, p.bot_gecikme_max,
                       public.soru_okuma_yuku(hm.soru_ids[hm.aktif_soru + 1])
                     ) * interval '1 second'
      and not exists (
        select 1 from public.hizli_cevaplar a
        where a.hizli_mac_id = hm.id and a.user_id = p.id and a.soru_index = hm.aktif_soru
      )
      -- Bot, insan oyuncularin ulastigi soruyu GECEMEZ
      and hm.aktif_soru <= 1 + coalesce((
        select max(a2.soru_index)
        from public.hizli_cevaplar a2
        join public.profiles p2 on p2.id = a2.user_id
        where a2.hizli_mac_id = hm.id and not coalesce(p2.is_bot, false)
      ), -1)
    for update of hm skip locked
  loop
    select * into q from public.questions where id = r.soru_ids[r.aktif_soru + 1];
    if not found then continue; end if;

    if random() < public.bot_kategori_isabet(r.bot_id, q.kategori) then
      v_cevap := q.dogru_cevap;
    else
      select x into v_cevap from generate_series(0, 3) x
      where x <> q.dogru_cevap order by random() limit 1;
    end if;
    v_dogru := (v_cevap = q.dogru_cevap);

    v_ilk := false;
    if v_dogru then
      v_ilk := not exists (
        select 1 from public.hizli_cevaplar
        where hizli_mac_id = r.id and soru_index = r.aktif_soru and dogru
      );
    end if;

    insert into public.hizli_cevaplar (hizli_mac_id, user_id, soru_index, cevap, dogru)
    values (r.id, r.bot_id, r.aktif_soru, v_cevap, v_dogru)
    on conflict do nothing;

    if v_ilk then
      update public.hizli_oyuncular
         set skor = skor + 10
       where hizli_mac_id = r.id and user_id = r.bot_id;
    end if;
  end loop;

  -- 13) Hızlı maçları ilerlet (süre dolduysa veya kabul edenlerin hepsi cevapladıysa)
  for r in
    select hm.id from public.hizli_maclar hm
    where hm.durum = 'aktif' and hm.basladi and hm.duraklatildi_at is null
      and (
        not exists (
          select 1 from public.hizli_oyuncular ho
          where ho.hizli_mac_id = hm.id and ho.davet_durumu = 'kabul'
            and ho.terk_at is null
            and not exists (
              select 1 from public.hizli_cevaplar a
              where a.hizli_mac_id = hm.id and a.user_id = ho.user_id and a.soru_index = hm.aktif_soru
            )
        )
        or (now() > hm.soru_baslangic + interval '16 seconds'
            and exists (
              select 1 from public.hizli_cevaplar a3
              join public.profiles p3 on p3.id = a3.user_id
              where a3.hizli_mac_id = hm.id and a3.soru_index = hm.aktif_soru
                and not coalesce(p3.is_bot, false)
            ))
        or now() > hm.soru_baslangic + interval '10 minutes'
      )
  loop
    perform public.advance_hizli_mac(r.id);
  end loop;
end;
$function$

;
