-- ============================================================
-- 542 · MAÇ İÇİ TEPKİ (emote) — Klasik · Düello · Antrenman  (Ida onayı, 24 Eyl 2026)
--
-- VERİTABANINA OYUNCU TEPKİSİ YAZILMAZ (Disk IO kuralı): tepki istemciden istemciye Realtime
-- BROADCAST'tir — mevcut maç kanalına (Klasik/Antrenman `mac-<id>`, Düello `duello-<id>`; herkese açık
-- kanal kalıbı, yeni Realtime yetkisi/politikası YOK) "tepki" olayı { id, k, u } ile gider.
-- Sunucu yalnız şunları verir:
--   tepki_durumu(tür, maç) — bu maçta tepki açık mı (mod oyun_ayarlari.tepki_acik_modlar'da mı),
--                             kullanabileceğim tepkiler (bedava 4 + sahip olduğum paketler; SAHİP hepsi),
--                             sınırlar (3 sn'de 1, maçta 10). Yalnız okur.
--   Bot tepkisi — bot mantığı sunucuda çalıştığı için bot tepkisi de sunucudan: realtime.send(..., false)
--                 aynı kanala aynı şekilde yayın (gizli botun tepkisi insanınkinden ayırt edilemez).
--                 realtime.send, Supabase'in günlük bölümlü realtime.messages tablosuna kısa ömürlü bir
--                 satır yazar (Supabase budar); sıklık tepki_bot_olasilik ile sınırlı.
-- Paket sahipliği yayında doğrulanamaz (yayın istemciden): gönderen istemci yalnız sahip olduğu tepkileri
-- gösterir, alıcı yalnız bilinen 12 tepkiyi çizer ve gönderen başına 3 sn / 10 sınırını kendisi uygular.
-- İlk açılış: yalnız Antrenman (açık bot) — Ida onaylayınca tepki_acik_modlar'a 'klasik', 'duello' eklenir.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('tepki_acik_modlar', '["antrenman"]', 'Tepki (emote) açık modlar: antrenman · klasik · duello. İlk açılış yalnız antrenman; Ida onaylayınca diğerleri.'),
  ('tepki_bedava', '["alkis", "havali", "terli", "dusunen"]', 'Herkese bedava tepkiler (👏 😎 😅 🤔).'),
  ('tepki_aralik_sn', '3', 'TEST — Aynı oyuncudan iki tepki arası en az (sn). İstemci + alıcı uygular.'),
  ('tepki_mac_max', '10', 'TEST — Bir oyuncunun maçta en çok tepki sayısı. İstemci + alıcı uygular.'),
  ('tepki_balon_ms', '2000', 'TEST — Tepki balonunun ekranda kalma süresi (ms).'),
  ('tepki_bot_olasilik', '0.3', 'TEST — Bot her cevap/hamle sonucunda tepki verme olasılığı (0–1). 0 = bot tepkisi kapalı.')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

-- Mod tepkiye açık mı (ad: 'antrenman' | 'klasik' | 'duello')
create or replace function public.tepki_mod_acik(p_mod text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select jsonb_typeof(deger) = 'array' and deger ? p_mod
                     from public.oyun_ayarlari where anahtar = 'tepki_acik_modlar'), false);
$$;
revoke all on function public.tepki_mod_acik(text) from public, anon, authenticated;

-- Maçın tepki modu: rakip açık bot → 'antrenman', yoksa maç türü. p_ben katılımcı değilse null.
create or replace function public.tepki_mac_modu(p_mac_tur text, p_mac_id uuid, p_ben uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_o1 uuid; v_o2 uuid; v_rakip uuid;
begin
  if p_mac_tur = 'klasik' then
    select m.oyuncu1, m.oyuncu2 into v_o1, v_o2 from public.matches m where m.id = p_mac_id;
  elsif p_mac_tur = 'duello' then
    select d.oyuncu1, d.oyuncu2 into v_o1, v_o2 from public.duellolar d where d.id = p_mac_id;
  else
    return null;
  end if;
  if p_ben is null or p_ben not in (v_o1, v_o2) then return null; end if;
  v_rakip := case when p_ben = v_o1 then v_o2 else v_o1 end;
  if exists (select 1 from public.profiles p where p.id = v_rakip
               and (public.acik_bot_mu(p.is_bot, p.bot_turu) or coalesce(p.acik_bot, false))) then
    return 'antrenman';
  end if;
  return p_mac_tur;
end;
$$;
revoke all on function public.tepki_mac_modu(text, uuid, uuid) from public, anon, authenticated;

-- Oyuncunun kullanabileceği tepkiler: bedava + sahip olunan paketler; sahip hesabı (test modu) hepsi.
create or replace function public.tepkilerim_liste(p_me uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(distinct t), '[]'::jsonb) from (
    select jsonb_array_elements_text(coalesce((select deger from public.oyun_ayarlari where anahtar = 'tepki_bedava'),
                                              '["alkis","havali","terli","dusunen"]'::jsonb)) t
    union
    select jsonb_array_elements_text(k.icerik -> 'tepkiler')
      from public.kozmetikler k
     where k.tur = 'tepki_paketi' and k.aktif
       and (public.sahip_mi()
            or exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = p_me and o.kozmetik = k.anahtar))
  ) x;
$$;
revoke all on function public.tepkilerim_liste(uuid) from public, anon, authenticated;

-- İstemci maç başında bir kez çağırır (yalnız okur, yazma yok).
create or replace function public.tepki_durumu(p_mac_tur text, p_mac_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_mod text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_mod := public.tepki_mac_modu(p_mac_tur, p_mac_id, v_me);
  if v_mod is null then return jsonb_build_object('acik', false); end if;
  return jsonb_build_object(
    'acik', public.tepki_mod_acik(v_mod),
    'mod', v_mod,
    'tepkiler', public.tepkilerim_liste(v_me),
    'aralik_sn', public.ayar_ondalik('tepki_aralik_sn', 3),
    'mac_max', public.ayar_sayi('tepki_mac_max', 10),
    'balon_ms', public.ayar_sayi('tepki_balon_ms', 2000));
end;
$$;
revoke all on function public.tepki_durumu(text, uuid) from public, anon;
grant execute on function public.tepki_durumu(text, uuid) to authenticated;

-- ---------- Bot tepkisi (sunucu → Realtime yayını) ----------
-- p_olay: 'dogru' (kendi doğrusu / hamleyi kazandı) · 'yanlis' (can kaybetti / yanlış) ·
--         'dusun' (ikisi de bilemedi / yanlış) · 'saygi' (rakip de bildi)
-- Gizli bot satıştaki paketinden de (bot_kozmetik 'tepki_paketi') seçebilir; açık bot yalnız bedava 4.
create or replace function public.bot_tepki_gonder(p_kanal text, p_bot uuid, p_olay text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_gizli boolean;
  v_level int;
  v_paket text;
  v_aday text[];
begin
  if random() >= public.ayar_ondalik('tepki_bot_olasilik', 0.3) then return; end if;
  select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu) and not coalesce(p.acik_bot, false),
         p.level
    into v_gizli, v_level
    from public.profiles p where p.id = p_bot and coalesce(p.is_bot, false);
  if not found then return; end if;

  v_aday := case p_olay when 'dogru' then array['havali'] when 'yanlis' then array['terli']
                        when 'dusun' then array['dusunen'] when 'saygi' then array['alkis'] else array[]::text[] end;
  if v_gizli then
    v_paket := public.bot_kozmetik(p_bot, v_level, 'tepki_paketi');
    if v_paket = 'tepki_eglence' then
      v_aday := v_aday || case p_olay when 'dogru' then array['ates', 'hedef'] when 'yanlis' then array['gulen']
                                      when 'saygi' then array['tac'] else array[]::text[] end;
    elsif v_paket = 'tepki_rekabet' then
      v_aday := v_aday || case p_olay when 'dogru' then array['kas'] when 'yanlis' then array['korku']
                                      when 'saygi' then array['selam', 'rica'] else array[]::text[] end;
    end if;
  end if;
  if cardinality(v_aday) = 0 then return; end if;

  perform realtime.send(
    jsonb_build_object('id', gen_random_uuid(), 'k', v_aday[1 + floor(random() * cardinality(v_aday))::int], 'u', p_bot),
    'tepki', p_kanal, false);
exception when others then
  raise warning 'bot tepkisi gönderilemedi (%): %', p_kanal, sqlerrm;   -- tepki maçı asla bozmaz
end;
$$;
revoke all on function public.bot_tepki_gonder(text, uuid, text) from public, anon, authenticated;

-- Klasik/Antrenman: bot_oyna her bot cevabında çağırır. Dönüş: yeni tepki sistemi bu maçta açık mı
-- (açıksa bot_oyna eski match_messages tepkisini YAZMAZ — iki sistem üst üste binmez).
create or replace function public.bot_tepki_klasik(p_mac uuid, p_bot uuid, p_dogru boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_insan uuid;
  v_mod text;
begin
  select case when m.oyuncu1 = p_bot then m.oyuncu2 else m.oyuncu1 end into v_insan
    from public.matches m where m.id = p_mac;
  v_mod := public.tepki_mac_modu('klasik', p_mac, v_insan);
  if v_mod is null or not public.tepki_mod_acik(v_mod) then return false; end if;
  perform public.bot_tepki_gonder('mac-' || p_mac::text, p_bot,
    case when p_dogru then 'dogru' when random() < 0.5 then 'yanlis' else 'dusun' end);
  return true;
exception when others then
  raise warning 'bot_tepki_klasik (%): %', p_mac, sqlerrm;
  return false;
end;
$$;
revoke all on function public.bot_tepki_klasik(uuid, uuid, boolean) from public, anon, authenticated;

-- Düello: hamle sonucu (son_hamle) yazılınca botlu maçta bot tepkisi. Tetikleyici yalnız son_hamle
-- kolonunu yazan güncellemelerde çalışır; hata maçı asla bozmaz.
create or replace function public.trg_duello_bot_tepki()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot uuid;
  v_insan uuid;
  v_mod text;
  v_kaybeden text;
  v_bot_dogru boolean;
  v_insan_dogru boolean;
begin
  select p.id into v_bot from public.profiles p
   where p.id in (new.oyuncu1, new.oyuncu2) and coalesce(p.is_bot, false) limit 1;
  if v_bot is null then return null; end if;
  v_insan := case when v_bot = new.oyuncu1 then new.oyuncu2 else new.oyuncu1 end;
  v_mod := public.tepki_mac_modu('duello', new.id, v_insan);
  if v_mod is null or not public.tepki_mod_acik(v_mod) then return null; end if;

  v_kaybeden := new.son_hamle ->> 'can_kaybeden';
  v_bot_dogru := coalesce((new.son_hamle -> 'cevaplar' -> v_bot::text ->> 'dogru')::boolean, false);
  v_insan_dogru := coalesce((new.son_hamle -> 'cevaplar' -> v_insan::text ->> 'dogru')::boolean, false);
  perform public.bot_tepki_gonder('duello-' || new.id::text, v_bot,
    case when v_kaybeden = v_bot::text then 'yanlis'
         when v_kaybeden is not null then 'dogru'
         when v_bot_dogru and v_insan_dogru then 'saygi'
         else 'dusun' end);
  return null;
exception when others then
  raise warning 'trg_duello_bot_tepki (%): %', new.id, sqlerrm;
  return null;
end;
$$;
revoke all on function public.trg_duello_bot_tepki() from public, anon, authenticated;

drop trigger if exists trg_duello_bot_tepki on public.duellolar;
create trigger trg_duello_bot_tepki
  after update of son_hamle on public.duellolar
  for each row
  when (new.son_hamle is distinct from old.son_hamle and new.surum = 2 and new.son_hamle is not null)
  execute function public.trg_duello_bot_tepki();

-- bot_oyna: canlı tanımın AYNISI; yalnız Klasik bot cevabındaki eski tepki satırının önüne yeni tepki kapısı.
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
    select m.id, m.kategori, m.oyuncu1, m.dereceli from public.matches m
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
           soru_ids = public.soru_sec(r.kategori, 20, array[r.oyuncu1], p_serbest_klasik => not r.dereceli),
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
      -- Paket 32: insanın Sisi sürerken bot da cevaplamaz (simetri)
      and not exists (
        select 1 from public.joker_kullanimlari k
         where k.mac_tur = '1v1' and k.mac_id = m.id and k.soru_index = m.aktif_soru
           and k.tur = 'sis' and k.user_id <> p.id
           and k.created_at + make_interval(secs => public.ayar_sayi('klasik_sis_sn', 3)) > now())
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

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
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

    -- 542: yeni tepki sistemi bu maçın modunda açıksa bot tepkisi Realtime yayınıyla (DB'ye tepki
    -- yazılmaz) ve eski match_messages tepkisi atlanır; kapalıysa eski davranış aynen.
    if public.bot_tepki_klasik(r.id, r.bot_id, v_dogru) then
      null;
    elsif random() < 0.15 then
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

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
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

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
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

    if random() < public.bot_soru_isabet(r.bot_id, q.kategori, q.id) then
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
$function$;
