-- ============================================================
-- 1047 — Güvenlik denetimi A bölümü (docs/GUVENLIK-DENETIMI-2026-10-10.md)
-- Onay: Ida, 10 Eki 2026 14:48 — A.1, A.4–A.12 (A.2 captcha ve A.3 yan oyun tabloları bu işte YOK).
-- Geri alma: docs/guvenlik-a-geri-al.sql
--
-- A.10 (net.http_*) burada YOK: fonksiyonların ve `net` şemasının sahibi supabase_admin;
-- postgres rolü bu yetkiyi geri alamıyor (REVOKE sessizce etkisiz). Ayrıntı raporda.
-- ============================================================

-- ------------------------------------------------------------
-- A.1 Push aboneliği: alan adı izin listesi, uzunluk, kullanıcı başına 5, devralma yok
-- ------------------------------------------------------------
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_sunucu text;
  v_n int;
begin
  perform public.hiz_siniri('save_push_subscription', 10, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  if p_endpoint is null or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 1 and 200
     or coalesce(length(p_auth), 0) not between 1 and 100 then
    raise exception 'Geçersiz bildirim aboneliği';
  end if;

  -- Yalnız tarayıcıların push servisleri: send-push rastgele adrese istek atmasın.
  v_sunucu := lower(substring(p_endpoint from '^https://([^/?#]+)/'));
  if v_sunucu is null or v_sunucu !~ (
       '^(fcm\.googleapis\.com'
    || '|([a-z0-9-]+\.)+push\.services\.mozilla\.com'
    || '|([a-z0-9-]+\.)+push\.apple\.com'
    || '|([a-z0-9-]+\.)+notify\.windows\.com)$') then
    raise exception 'Geçersiz bildirim adresi';
  end if;

  -- Adres başka hesabındaysa devralınmaz (yalnız kendi satırı güncellenir).
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, v_me, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth
    where push_subscriptions.user_id = excluded.user_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Bu bildirim adresi başka bir hesaba kayıtlı.';
  end if;

  -- Kullanıcı başına en çok 5 abonelik: fazlası en eskiden silinir.
  delete from public.push_subscriptions s
   where s.user_id = v_me
     and s.endpoint not in (
       select x.endpoint from public.push_subscriptions x
        where x.user_id = v_me
        order by x.created_at desc, x.endpoint
        limit 5);
end;
$function$;

-- ------------------------------------------------------------
-- A.4 Facebook kimliği Auth'un doğruladığı kayıttan okunur
-- ------------------------------------------------------------
create or replace function public.facebook_kimligi_kaydet(p_fb_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_temiz text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  -- p_fb_id yalnız geriye uyum için alınır, KULLANILMAZ: istemcinin yolladığı
  -- kimliğe güvenilmez, Supabase Auth'un bağladığı Facebook kimliği okunur.
  select nullif(btrim(i.provider_id), '') into v_temiz
    from auth.identities i
   where i.user_id = v_me and i.provider = 'facebook'
   order by i.created_at
   limit 1;
  if v_temiz is null or length(v_temiz) > 64 then return; end if;

  -- Başka bir hesapta kayıtlıysa dokunma: hesap birleştirme Auth tarafının
  -- işi (aynı e-posta ile kimlik bağlama), burada ikinci sahip yaratmayız.
  if exists (select 1 from public.profiles
              where facebook_id = v_temiz and id <> v_me) then
    return;
  end if;

  update public.profiles set facebook_id = v_temiz where id = v_me;
end;
$function$;

-- ------------------------------------------------------------
-- A.7 Turnuva sorusu yalnız kayıtlı ve elenmemiş oyuncuya
-- ------------------------------------------------------------
create or replace function public.get_tournament_question(p_tournament_id uuid)
returns table(question_id uuid, soru text, secenekler jsonb, soru_index integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, dogru_cevap smallint, altin boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  t public.tournaments%rowtype;
  v_soru_id uuid;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into t from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'Turnuva bulunamadı'; end if;
  if not exists (select 1 from public.tournament_players tp
                  where tp.tournament_id = p_tournament_id
                    and tp.user_id = auth.uid()
                    and not coalesce(tp.elendi, false)) then
    raise exception 'Bu turnuvada soru alamazsın';
  end if;
  if t.durum <> 'aktif' or t.aktif_soru < 0 then raise exception 'Turnuva aktif değil'; end if;

  v_soru_id := t.soru_ids[t.aktif_soru + 1];
  perform public.gorulen_kaydet(v_soru_id);

  return query
    select v_soru_id, sd.soru, sd.secenekler, t.aktif_soru, t.soru_baslangic, now(),
           case when public.hileli_mi() then sd.dogru_cevap else null end,
           coalesce(t.altin_soru, false)
    from public.soru_dilinde(v_soru_id, public.oyuncu_dili()) sd;
end;
$function$;

-- ------------------------------------------------------------
-- A.5 PUBLIC/anon EXECUTE temizliği
-- Giriş yapılmadan (anon) çağrılan tek RPC: ses_secimleri_oyun (giriş ekranında
-- müzik seçimleri, oyun/lib/sesArkaPlan.js) — ona dokunulmaz.
-- ------------------------------------------------------------

-- a) İstemcinin girişli çağırdığı (ya da RLS politikasında geçen) fonksiyonlar:
--    anon/PUBLIC kapanır, authenticated + service_role açık kalır.
revoke execute on function
  public.avatar3d_gorunum_kaydet(jsonb),
  public.avatar3d_katalogum(),
  public.avatar3d_portre_kaydet(text),
  public.avatar3d_satin_al(text),
  public.calisma_baslat(text,integer),
  public.calisma_bitir(uuid),
  public.calisma_cevap(uuid,integer,smallint),
  public.calisma_soru(uuid),
  public.cift_mac_durumu(uuid),
  public.cihaz_bildir(text),
  public.coin_bakiyem(),
  public.esya_katalogum(),
  public.esya_satin_al(text),
  public.facebook_arkadas_onerileri(text[]),
  public.facebook_kimligi_kaydet(text),
  public.get_group_match_question(uuid),
  public.get_tournament_question(uuid),
  public.gorunum_kaydet(jsonb),
  public.grup_mac_nabiz(uuid,boolean),
  public.grup_mac_uyesi_mi(uuid),
  public.hizli_mac_nabiz(uuid,boolean),
  public.ikram_yanitla(uuid,boolean),
  public.ikramlarim(),
  public.joker_coin_ile_al(text),
  public.joker_tek_al(text),
  public.karakter_katalogum(),
  public.karakter_satin_al(text),
  public.lig_grubum(),
  public.lig_siralama(text,text),
  public.mac_asenkrona_gec(uuid),
  public.mac_nabiz(uuid,boolean),
  public.mac_yanlis_sayim(text,uuid),
  public.meydan_turnuva_damgasi(),
  public.rahatsiz_etme_ayarla(boolean),
  public.sonraki_turnuva_ani()
from public, anon;

grant execute on function
  public.avatar3d_gorunum_kaydet(jsonb),
  public.avatar3d_katalogum(),
  public.avatar3d_portre_kaydet(text),
  public.avatar3d_satin_al(text),
  public.calisma_baslat(text,integer),
  public.calisma_bitir(uuid),
  public.calisma_cevap(uuid,integer,smallint),
  public.calisma_soru(uuid),
  public.cift_mac_durumu(uuid),
  public.cihaz_bildir(text),
  public.coin_bakiyem(),
  public.esya_katalogum(),
  public.esya_satin_al(text),
  public.facebook_arkadas_onerileri(text[]),
  public.facebook_kimligi_kaydet(text),
  public.get_group_match_question(uuid),
  public.get_tournament_question(uuid),
  public.gorunum_kaydet(jsonb),
  public.grup_mac_nabiz(uuid,boolean),
  public.grup_mac_uyesi_mi(uuid),
  public.hizli_mac_nabiz(uuid,boolean),
  public.ikram_yanitla(uuid,boolean),
  public.ikramlarim(),
  public.joker_coin_ile_al(text),
  public.joker_tek_al(text),
  public.karakter_katalogum(),
  public.karakter_satin_al(text),
  public.lig_grubum(),
  public.lig_siralama(text,text),
  public.mac_asenkrona_gec(uuid),
  public.mac_nabiz(uuid,boolean),
  public.mac_yanlis_sayim(text,uuid),
  public.meydan_turnuva_damgasi(),
  public.rahatsiz_etme_ayarla(boolean),
  public.sonraki_turnuva_ani()
to authenticated, service_role;

-- b) İç yardımcılar, tetikleyici fonksiyonları ve A.6 coin_harca: istemci çağırmıyor,
--    RLS politikasında/görünümde geçmiyor; yalnız sahibi (postgres: cron ve
--    security definer fonksiyonlar) + service_role çağırır.
revoke execute on function
  public.avatar3d_rastgele_baslangic(),
  public.ayar_ondalik(text,numeric),
  public.ayar_sayi(text,bigint),
  public.birlesik_siralama(),
  public.coin_harca(bigint,text,text),
  public.duello_ban_bayragi_sabitle(),
  public.duello2_gosterim_payi(),
  public.duello2_izinli_skiller(),
  public.gorev_tanimlari(),
  public.hafta_basi(),
  public.izinli_mesajlar(),
  public.kategori_adi(text),
  public.level_rutbe_sira(integer),
  public.level_rutbe(integer),
  public.lig_adi(integer),
  public.lig_sezon_bitisi(),
  public.lig_sirasi(text),
  public.pr_apply_race_result(integer,boolean,date),
  public.rutbe(integer),
  public.sehir_anahtar(text),
  public.seviye_basamagi(integer),
  public.skill_duello_eski_etki_kapisi(),
  public.skill_kullanim_kapisi(),
  public.sonraki_turnuva_bilgi(),
  public.sonraki_turnuva_tarihi(),
  public.soru_gosterim_payi(),
  public.tr_yonelme_eki(integer),
  public.turnuva_saati(text),
  public.ustalik_seviye(integer),
  public.yanlis_kaydet(uuid),
  -- A.8 cron işi ve iç yardımcı
  public.eski_davetleri_temizle(),
  public.mac_oyuncu_indeksi(uuid,uuid)
from public, anon, authenticated;

grant execute on function
  public.avatar3d_rastgele_baslangic(),
  public.ayar_ondalik(text,numeric),
  public.ayar_sayi(text,bigint),
  public.birlesik_siralama(),
  public.coin_harca(bigint,text,text),
  public.duello_ban_bayragi_sabitle(),
  public.duello2_gosterim_payi(),
  public.duello2_izinli_skiller(),
  public.gorev_tanimlari(),
  public.hafta_basi(),
  public.izinli_mesajlar(),
  public.kategori_adi(text),
  public.level_rutbe_sira(integer),
  public.level_rutbe(integer),
  public.lig_adi(integer),
  public.lig_sezon_bitisi(),
  public.lig_sirasi(text),
  public.pr_apply_race_result(integer,boolean,date),
  public.rutbe(integer),
  public.sehir_anahtar(text),
  public.seviye_basamagi(integer),
  public.skill_duello_eski_etki_kapisi(),
  public.skill_kullanim_kapisi(),
  public.sonraki_turnuva_bilgi(),
  public.sonraki_turnuva_tarihi(),
  public.soru_gosterim_payi(),
  public.tr_yonelme_eki(integer),
  public.turnuva_saati(text),
  public.ustalik_seviye(integer),
  public.yanlis_kaydet(uuid),
  public.eski_davetleri_temizle(),
  public.mac_oyuncu_indeksi(uuid,uuid)
to service_role;

-- c) Bundan sonra postgres'in açtığı fonksiyonlar PUBLIC/anon'a kendiliğinden açılmasın.
--    Not: şema düzeyindeki varsayılan genel (global) PUBLIC yetkisini geri alamaz
--    (PostgreSQL kuralı), bu yüzden PUBLIC satırı genel; authenticated + service_role
--    şema varsayılanından gelmeye devam eder (yeni RPC'ler girişli oyuncuya açık doğar).
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- ------------------------------------------------------------
-- A.9 avatarlar kovası: 2 MB, yalnız png/jpeg/webp (mevcut 95 dosya: hepsi png, en büyüğü 68 KB)
-- ------------------------------------------------------------
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'avatarlar';

-- ------------------------------------------------------------
-- A.11 Yeni tablolarda anon'a yazma yetkisi kendiliğinden gelmesin
-- ------------------------------------------------------------
alter default privileges for role postgres in schema public revoke insert, update, delete on tables from anon;

-- ------------------------------------------------------------
-- A.12 kasa_deneme_ozeti çağıranın yetkisiyle çalışsın
-- ------------------------------------------------------------
alter view public.kasa_deneme_ozeti set (security_invoker = on);
