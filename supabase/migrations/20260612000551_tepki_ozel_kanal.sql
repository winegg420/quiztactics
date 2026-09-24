-- ============================================================
-- 551 · TEPKİ GÜVENLİĞİ + BOT TEPKİ SIKLIĞI (Ida, 24 Eyl 2026)
--
-- B5 (Ida onayladı) — tepki yalnız o maçın iki oyuncusuna açık ÖZEL Realtime kanalında:
--   ÖNCE : tepki maçın herkese açık kanalında (Klasik/Antrenman `mac-<id>`, Düello `duello-<id>`)
--          broadcast'ti. Realtime yetkisi yoktu (realtime.messages'ta politika yok, kanal public):
--          maç kimliğini bilen her giriş yapmış hesap kanala katılıp "tepki" yayını gönderebiliyordu
--          (alıcı yalnız 12 bilinen tepkiyi, rakibin kimliğiyle ve 3 sn / 10 sınırıyla çiziyordu).
--   SONRA: tepki ayrı ÖZEL kanalda (`tepki-mac-<id>` / `tepki-duello-<id>`, istemci private: true).
--          realtime.messages RLS: bu konulara katılma/okuma (SELECT) ve gönderme (INSERT) yalnız
--          authenticated rolünde ve yalnız o maçın oyuncu1/oyuncu2'si için (tepki_kanal_uyesi_mi).
--          Başka hesap kanala katılamaz, gönderemez. Özel ve herkese açık konular Realtime'da ayrıdır:
--          herkese açık `mac-<id>`'e sahte "tepki" atılsa da özel kanal dinleyicisine ulaşmaz; istemci
--          özel kanal açıkken eski kanaldaki "tepki" olayını ayrıca yok sayar.
--          Maçın oyun kanalı (`mac-<id>` / `duello-<id>`: postgres_changes, tablo RLS'iyle korunur)
--          DEĞİŞMEDİ — oyun akışı bu migration'dan etkilenmez.
--   Bot tepkisi sunucudan realtime.send(..., private => true) ile özel kanala (tanımlayıcı rol RLS'e
--   takılmaz; alıcı insan oyuncu okuma politikasından geçer) → botlu Antrenman bozulmaz.
--   Eski istemci (güncellenmemiş PWA) uyumu: tepki_durumu yeni `kanal` alanını döndürür; alan yoksa
--   istemci eski kanalı kullanır (migration'dan önce dağıtılan kod canlıyı bozmaz).
--
-- B4 — bot tepkisi %30 → %12 (tepki_bot_olasilik) ve YALNIZ anlamlı anlarda:
--   doğru cevap serisi (botun son tepki_bot_seri cevabı doğru) · maç sonu (son soru / can bitti) ·
--   rakip hatası (insan bu soruda/hamlede yanıldı ya da cevapsız kaldı). Başka anda bot tepki vermez.
-- B3 — tepki_acik_modlar DEĞİŞMEDİ (yalnız antrenman). Klasik/Düello'ya açılınca eski DB'ye yazan
--   6 emoji (match_messages) kaldırılacak — not: bot_oyna içindeki eski tepki kolu ve MatchPage.
--
-- Tekrar çalıştırılabilir; yalnız bu migration'ın kendi politikaları drop/create edilir.
-- ============================================================

-- ---------- 1. Ayarlar ----------
update public.oyun_ayarlari
   set deger = '0.12'::jsonb,
       aciklama = 'Bot tepki olasılığı (0–1), YALNIZ anlamlı anlarda: doğru serisi, maç sonu, rakip hatası (551). 0 = bot tepkisi kapalı.'
 where anahtar = 'tepki_bot_olasilik'
   and deger is distinct from '0.12'::jsonb;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('tepki_bot_olasilik', '0.12', 'Bot tepki olasılığı (0–1), YALNIZ anlamlı anlarda: doğru serisi, maç sonu, rakip hatası (551). 0 = bot tepkisi kapalı.'),
  ('tepki_bot_seri', '3', 'Bot tepkisi için "doğru serisi": botun art arda en az bu kadar doğrusu (551).')
on conflict (anahtar) do nothing;

-- ---------- 2. Özel tepki kanalı: kimler üye ----------
-- Konu: 'tepki-mac-<uuid>' (Klasik/Antrenman, matches) · 'tepki-duello-<uuid>' (Düello, duellolar).
create or replace function public.tepki_kanal_uyesi_mi(p_konu text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_parca text[];
  v_id uuid;
begin
  if v_me is null or p_konu is null then return false; end if;
  v_parca := regexp_match(p_konu, '^tepki-(mac|duello)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
  if v_parca is null then return false; end if;
  v_id := v_parca[2]::uuid;
  if v_parca[1] = 'mac' then
    return exists (select 1 from public.matches m where m.id = v_id and v_me in (m.oyuncu1, m.oyuncu2));
  end if;
  return exists (select 1 from public.duellolar d where d.id = v_id and v_me in (d.oyuncu1, d.oyuncu2));
end;
$$;
-- Politika authenticated rolüyle değerlendirilir → yürütme izni gerekir. Yalnız kendi katılımını söyler.
revoke all on function public.tepki_kanal_uyesi_mi(text) from public, anon;
grant execute on function public.tepki_kanal_uyesi_mi(text) to authenticated;

-- ---------- 3. Realtime yetkisi (yalnız tepki- konuları; başka kanala dokunmaz) ----------
do $$
begin
  if to_regclass('realtime.messages') is null then
    raise notice '551: realtime.messages yok — politika atlandı (yerel test ortamı)';
    return;
  end if;
  -- RLS Supabase'de realtime.messages'ta zaten açık (tablo sahibi realtime; burada değiştirilmez).
  execute 'drop policy if exists "tepki_kanal_oku" on realtime.messages';
  execute $p$create policy "tepki_kanal_oku" on realtime.messages
             for select to authenticated
             using (realtime.messages.extension = 'broadcast'
                    and public.tepki_kanal_uyesi_mi((select realtime.topic())))$p$;
  execute 'drop policy if exists "tepki_kanal_yaz" on realtime.messages';
  execute $p$create policy "tepki_kanal_yaz" on realtime.messages
             for insert to authenticated
             with check (realtime.messages.extension = 'broadcast'
                         and public.tepki_kanal_uyesi_mi((select realtime.topic())))$p$;
end $$;

-- ---------- 4. tepki_durumu: özel kanal adı ----------
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
    'kanal', 'tepki-' || case when p_mac_tur = 'duello' then 'duello' else 'mac' end || '-' || p_mac_id::text,
    'tepkiler', public.tepkilerim_liste(v_me),
    'aralik_sn', public.ayar_ondalik('tepki_aralik_sn', 3),
    'mac_max', public.ayar_sayi('tepki_mac_max', 10),
    'balon_ms', public.ayar_sayi('tepki_balon_ms', 2000));
end;
$$;
revoke all on function public.tepki_durumu(text, uuid) from public, anon;
grant execute on function public.tepki_durumu(text, uuid) to authenticated;

-- ---------- 5. Bot tepkisi: özel kanala, %12 ----------
-- p_kanal: 'tepki-mac-<id>' | 'tepki-duello-<id>'. p_olay: 'dogru' · 'yanlis' · 'dusun' · 'saygi'.
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
  if random() >= public.ayar_ondalik('tepki_bot_olasilik', 0.12) then return; end if;
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
    'tepki', p_kanal, true);
exception when others then
  raise warning 'bot tepkisi gönderilemedi (%): %', p_kanal, sqlerrm;   -- tepki maçı asla bozmaz
end;
$$;
revoke all on function public.bot_tepki_gonder(text, uuid, text) from public, anon, authenticated;

-- Klasik/Antrenman: bot_oyna her bot cevabından sonra çağırır (imza aynı). Dönüş: yeni tepki sistemi bu
-- maçta açık mı (açıksa bot_oyna eski match_messages tepkisini YAZMAZ). Tepki yalnız anlamlı anda.
create or replace function public.bot_tepki_klasik(p_mac uuid, p_bot uuid, p_dogru boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  m record;
  v_insan uuid;
  v_mod text;
  v_n int;
  v_idx int;
  v_insan_dogru boolean;
  v_seri int;
  v_bot_skor int;
  v_insan_skor int;
  v_olay text;
begin
  select * into m from public.matches where id = p_mac;
  if not found then return false; end if;
  v_insan := case when m.oyuncu1 = p_bot then m.oyuncu2 else m.oyuncu1 end;
  v_mod := public.tepki_mac_modu('klasik', p_mac, v_insan);
  if v_mod is null or not public.tepki_mod_acik(v_mod) then return false; end if;

  v_n := coalesce(array_length(m.soru_ids, 1), 0);
  select max(a.soru_index) into v_idx from public.match_answers a where a.match_id = p_mac and a.user_id = p_bot;
  if v_idx is null then return true; end if;
  select a.dogru into v_insan_dogru from public.match_answers a
   where a.match_id = p_mac and a.user_id = v_insan and a.soru_index = v_idx;
  v_seri := greatest(2, public.ayar_sayi('tepki_bot_seri', 3)::int);

  if m.durum = 'bitti' or v_idx + 1 >= v_n then
    -- maç sonu: skora göre
    v_bot_skor := case when m.oyuncu1 = p_bot then m.oyuncu1_skor else m.oyuncu2_skor end;
    v_insan_skor := case when m.oyuncu1 = p_bot then m.oyuncu2_skor else m.oyuncu1_skor end;
    v_olay := case when v_bot_skor > v_insan_skor then 'dogru' when v_bot_skor < v_insan_skor then 'saygi' else 'dusun' end;
  elsif v_insan_dogru is false then
    -- rakip hatası
    v_olay := case when p_dogru then 'dogru' else 'dusun' end;
  elsif p_dogru and (select count(*) from public.match_answers a
                      where a.match_id = p_mac and a.user_id = p_bot and a.dogru
                        and a.soru_index > v_idx - v_seri and a.soru_index <= v_idx) >= v_seri then
    -- doğru cevap serisi
    v_olay := 'dogru';
  else
    return true;   -- açık ama anlamlı an değil: tepki yok (eski tepki de yazılmaz)
  end if;

  perform public.bot_tepki_gonder('tepki-mac-' || p_mac::text, p_bot, v_olay);
  return true;
exception when others then
  raise warning 'bot_tepki_klasik (%): %', p_mac, sqlerrm;
  return false;
end;
$$;
revoke all on function public.bot_tepki_klasik(uuid, uuid, boolean) from public, anon, authenticated;

-- Düello: hamle sonucu yazılınca (tetikleyici 542'deki gibi, yalnız son_hamle yazan güncellemede).
-- Bu anda hamle henüz duello_hamleler'e yazılmadı → seri = bu hamle + önceki (seri − 1) hamle.
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
  v_seri int;
  v_onceki int;
  v_bot_can int;
  v_insan_can int;
  v_olay text;
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
  v_bot_can := case when v_bot = new.oyuncu1 then new.can1 else new.can2 end;
  v_insan_can := case when v_bot = new.oyuncu1 then new.can2 else new.can1 end;
  v_seri := greatest(2, public.ayar_sayi('tepki_bot_seri', 3)::int);

  if least(coalesce(v_bot_can, 1), coalesce(v_insan_can, 1)) <= 0 or new.durum = 'bitti' then
    -- maç sonu
    v_olay := case when coalesce(v_insan_can, 1) <= 0 and coalesce(v_bot_can, 1) > 0 then 'dogru'
                   when coalesce(v_bot_can, 1) <= 0 and coalesce(v_insan_can, 1) > 0 then 'saygi'
                   else 'dusun' end;
  elsif not v_insan_dogru then
    -- rakip hatası (yanlış ya da cevapsız)
    v_olay := case when v_kaybeden = v_bot::text then 'yanlis' when v_bot_dogru then 'dogru' else 'dusun' end;
  elsif v_bot_dogru then
    select count(*) into v_onceki from (
      select (h.saldiran = v_bot and coalesce(h.dogru_saldiran, false)) or (h.savunan = v_bot and h.dogru) as bd
        from public.duello_hamleler h
       where h.duello_id = new.id
       order by h.id desc
       limit v_seri - 1) x
     where x.bd;
    if v_onceki < v_seri - 1 then return null; end if;
    v_olay := 'dogru';   -- doğru cevap serisi
  else
    return null;   -- anlamlı an değil
  end if;

  perform public.bot_tepki_gonder('tepki-duello-' || new.id::text, v_bot, v_olay);
  return null;
exception when others then
  raise warning 'trg_duello_bot_tepki (%): %', new.id, sqlerrm;
  return null;
end;
$$;
revoke all on function public.trg_duello_bot_tepki() from public, anon, authenticated;
-- Tetikleyici (542) aynı fonksiyonu çağırır; yeniden kurulmaz.
