-- ============================================================
-- GERİ ALMA — migration 20260612001047_guvenlik_a_yetki_temizligi.sql
-- Her maddeyi 10 Eki 2026 (uygulama öncesi) hâline döndürür. Canlı katalogdan üretildi.
-- Uygulama: tek işlemde çalıştır (begin; ... commit;). Gerekmedikçe ÇALIŞTIRMA.
-- ============================================================
begin;

-- A.1 / A.4 / A.7 — fonksiyonların eski gövdeleri
CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.hiz_siniri('save_push_subscription', 10, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth;
end;
$function$;

CREATE OR REPLACE FUNCTION public.facebook_kimligi_kaydet(p_fb_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_temiz text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_temiz := nullif(btrim(coalesce(p_fb_id, '')), '');
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

CREATE OR REPLACE FUNCTION public.get_tournament_question(p_tournament_id uuid)
 RETURNS TABLE(question_id uuid, soru text, secenekler jsonb, soru_index integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, dogru_cevap smallint, altin boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  t public.tournaments%rowtype;
  v_soru_id uuid;
begin
  select * into t from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'Turnuva bulunamadı'; end if;
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

-- A.5 / A.6 / A.8 — fonksiyon EXECUTE yetkileri eski ACL'lerine
revoke all on function public.avatar3d_gorunum_kaydet(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.avatar3d_gorunum_kaydet(jsonb) to public, anon, authenticated, service_role;
revoke all on function public.avatar3d_katalogum() from public, anon, authenticated, service_role;
grant execute on function public.avatar3d_katalogum() to public, anon, authenticated, service_role;
revoke all on function public.avatar3d_portre_kaydet(text) from public, anon, authenticated, service_role;
grant execute on function public.avatar3d_portre_kaydet(text) to public, anon, authenticated, service_role;
revoke all on function public.avatar3d_rastgele_baslangic() from public, anon, authenticated, service_role;
grant execute on function public.avatar3d_rastgele_baslangic() to public, anon, authenticated, service_role;
revoke all on function public.avatar3d_satin_al(text) from public, anon, authenticated, service_role;
grant execute on function public.avatar3d_satin_al(text) to public, anon, authenticated, service_role;
revoke all on function public.ayar_ondalik(text,numeric) from public, anon, authenticated, service_role;
grant execute on function public.ayar_ondalik(text,numeric) to public, anon, authenticated, service_role;
revoke all on function public.ayar_sayi(text,bigint) from public, anon, authenticated, service_role;
grant execute on function public.ayar_sayi(text,bigint) to public, anon, authenticated, service_role;
revoke all on function public.birlesik_siralama() from public, anon, authenticated, service_role;
grant execute on function public.birlesik_siralama() to anon, authenticated, service_role;
revoke all on function public.calisma_baslat(text,integer) from public, anon, authenticated, service_role;
grant execute on function public.calisma_baslat(text,integer) to anon, authenticated, service_role;
revoke all on function public.calisma_bitir(uuid) from public, anon, authenticated, service_role;
grant execute on function public.calisma_bitir(uuid) to anon, authenticated, service_role;
revoke all on function public.calisma_cevap(uuid,integer,smallint) from public, anon, authenticated, service_role;
grant execute on function public.calisma_cevap(uuid,integer,smallint) to anon, authenticated, service_role;
revoke all on function public.calisma_soru(uuid) from public, anon, authenticated, service_role;
grant execute on function public.calisma_soru(uuid) to anon, authenticated, service_role;
revoke all on function public.cift_mac_durumu(uuid) from public, anon, authenticated, service_role;
grant execute on function public.cift_mac_durumu(uuid) to public, anon, authenticated, service_role;
revoke all on function public.cihaz_bildir(text) from public, anon, authenticated, service_role;
grant execute on function public.cihaz_bildir(text) to public, anon, authenticated, service_role;
revoke all on function public.coin_bakiyem() from public, anon, authenticated, service_role;
grant execute on function public.coin_bakiyem() to public, anon, authenticated, service_role;
revoke all on function public.coin_harca(bigint,text,text) from public, anon, authenticated, service_role;
grant execute on function public.coin_harca(bigint,text,text) to public, anon, authenticated, service_role;
revoke all on function public.duello2_gosterim_payi() from public, anon, authenticated, service_role;
grant execute on function public.duello2_gosterim_payi() to public, anon, authenticated, service_role;
revoke all on function public.duello2_izinli_skiller() from public, anon, authenticated, service_role;
grant execute on function public.duello2_izinli_skiller() to public, anon, authenticated, service_role;
revoke all on function public.duello_ban_bayragi_sabitle() from public, anon, authenticated, service_role;
grant execute on function public.duello_ban_bayragi_sabitle() to public, anon, authenticated, service_role;
revoke all on function public.eski_davetleri_temizle() from public, anon, authenticated, service_role;
grant execute on function public.eski_davetleri_temizle() to authenticated, service_role;
revoke all on function public.esya_katalogum() from public, anon, authenticated, service_role;
grant execute on function public.esya_katalogum() to public, anon, authenticated, service_role;
revoke all on function public.esya_satin_al(text) from public, anon, authenticated, service_role;
grant execute on function public.esya_satin_al(text) to public, anon, authenticated, service_role;
revoke all on function public.facebook_arkadas_onerileri(text[]) from public, anon, authenticated, service_role;
grant execute on function public.facebook_arkadas_onerileri(text[]) to public, anon, authenticated, service_role;
revoke all on function public.facebook_kimligi_kaydet(text) from public, anon, authenticated, service_role;
grant execute on function public.facebook_kimligi_kaydet(text) to public, anon, authenticated, service_role;
revoke all on function public.get_group_match_question(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_group_match_question(uuid) to public, anon, authenticated, service_role;
revoke all on function public.get_tournament_question(uuid) from public, anon, authenticated, service_role;
grant execute on function public.get_tournament_question(uuid) to public, anon, authenticated, service_role;
revoke all on function public.gorev_tanimlari() from public, anon, authenticated, service_role;
grant execute on function public.gorev_tanimlari() to public, anon, authenticated, service_role;
revoke all on function public.gorunum_kaydet(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.gorunum_kaydet(jsonb) to public, anon, authenticated, service_role;
revoke all on function public.grup_mac_nabiz(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.grup_mac_nabiz(uuid,boolean) to public, anon, authenticated, service_role;
revoke all on function public.grup_mac_uyesi_mi(uuid) from public, anon, authenticated, service_role;
grant execute on function public.grup_mac_uyesi_mi(uuid) to authenticated, service_role, anon;
revoke all on function public.hafta_basi() from public, anon, authenticated, service_role;
grant execute on function public.hafta_basi() to public, anon, authenticated, service_role;
revoke all on function public.hizli_mac_nabiz(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.hizli_mac_nabiz(uuid,boolean) to public, anon, authenticated, service_role;
revoke all on function public.ikram_yanitla(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.ikram_yanitla(uuid,boolean) to public, anon, authenticated, service_role;
revoke all on function public.ikramlarim() from public, anon, authenticated, service_role;
grant execute on function public.ikramlarim() to public, anon, authenticated, service_role;
revoke all on function public.izinli_mesajlar() from public, anon, authenticated, service_role;
grant execute on function public.izinli_mesajlar() to public, anon, authenticated, service_role;
revoke all on function public.joker_coin_ile_al(text) from public, anon, authenticated, service_role;
grant execute on function public.joker_coin_ile_al(text) to public, anon, authenticated, service_role;
revoke all on function public.joker_tek_al(text) from public, anon, authenticated, service_role;
grant execute on function public.joker_tek_al(text) to public, anon, authenticated, service_role;
revoke all on function public.karakter_katalogum() from public, anon, authenticated, service_role;
grant execute on function public.karakter_katalogum() to public, anon, authenticated, service_role;
revoke all on function public.karakter_satin_al(text) from public, anon, authenticated, service_role;
grant execute on function public.karakter_satin_al(text) to public, anon, authenticated, service_role;
revoke all on function public.kategori_adi(text) from public, anon, authenticated, service_role;
grant execute on function public.kategori_adi(text) to public, anon, authenticated, service_role;
revoke all on function public.level_rutbe(integer) from public, anon, authenticated, service_role;
grant execute on function public.level_rutbe(integer) to public, anon, authenticated, service_role;
revoke all on function public.level_rutbe_sira(integer) from public, anon, authenticated, service_role;
grant execute on function public.level_rutbe_sira(integer) to public, anon, authenticated, service_role;
revoke all on function public.lig_adi(integer) from public, anon, authenticated, service_role;
grant execute on function public.lig_adi(integer) to public, anon, authenticated, service_role;
revoke all on function public.lig_grubum() from public, anon, authenticated, service_role;
grant execute on function public.lig_grubum() to public, anon, authenticated, service_role;
revoke all on function public.lig_sezon_bitisi() from public, anon, authenticated, service_role;
grant execute on function public.lig_sezon_bitisi() to public, anon, authenticated, service_role;
revoke all on function public.lig_siralama(text,text) from public, anon, authenticated, service_role;
grant execute on function public.lig_siralama(text,text) to public, anon, authenticated, service_role;
revoke all on function public.lig_sirasi(text) from public, anon, authenticated, service_role;
grant execute on function public.lig_sirasi(text) to public, anon, authenticated, service_role;
revoke all on function public.mac_asenkrona_gec(uuid) from public, anon, authenticated, service_role;
grant execute on function public.mac_asenkrona_gec(uuid) to public, anon, authenticated, service_role;
revoke all on function public.mac_nabiz(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.mac_nabiz(uuid,boolean) to public, anon, authenticated, service_role;
revoke all on function public.mac_oyuncu_indeksi(uuid,uuid) from public, anon, authenticated, service_role;
grant execute on function public.mac_oyuncu_indeksi(uuid,uuid) to authenticated, service_role;
revoke all on function public.mac_yanlis_sayim(text,uuid) from public, anon, authenticated, service_role;
grant execute on function public.mac_yanlis_sayim(text,uuid) to anon, authenticated, service_role;
revoke all on function public.meydan_turnuva_damgasi() from public, anon, authenticated, service_role;
grant execute on function public.meydan_turnuva_damgasi() to public, anon, authenticated, service_role;
revoke all on function public.pr_apply_race_result(integer,boolean,date) from public, anon, authenticated, service_role;
grant execute on function public.pr_apply_race_result(integer,boolean,date) to public, anon, authenticated, service_role;
revoke all on function public.rahatsiz_etme_ayarla(boolean) from public, anon, authenticated, service_role;
grant execute on function public.rahatsiz_etme_ayarla(boolean) to public, anon, authenticated, service_role;
revoke all on function public.rutbe(integer) from public, anon, authenticated, service_role;
grant execute on function public.rutbe(integer) to public, anon, authenticated, service_role;
revoke all on function public.save_push_subscription(text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.save_push_subscription(text,text,text) to authenticated, service_role;
revoke all on function public.sehir_anahtar(text) from public, anon, authenticated, service_role;
grant execute on function public.sehir_anahtar(text) to public, anon, authenticated, service_role;
revoke all on function public.seviye_basamagi(integer) from public, anon, authenticated, service_role;
grant execute on function public.seviye_basamagi(integer) to public, anon, authenticated, service_role;
revoke all on function public.skill_duello_eski_etki_kapisi() from public, anon, authenticated, service_role;
grant execute on function public.skill_duello_eski_etki_kapisi() to public, anon, authenticated, service_role;
revoke all on function public.skill_kullanim_kapisi() from public, anon, authenticated, service_role;
grant execute on function public.skill_kullanim_kapisi() to public, anon, authenticated, service_role;
revoke all on function public.sonraki_turnuva_ani() from public, anon, authenticated, service_role;
grant execute on function public.sonraki_turnuva_ani() to public, anon, authenticated, service_role;
revoke all on function public.sonraki_turnuva_bilgi() from public, anon, authenticated, service_role;
grant execute on function public.sonraki_turnuva_bilgi() to public, anon, authenticated, service_role;
revoke all on function public.sonraki_turnuva_tarihi() from public, anon, authenticated, service_role;
grant execute on function public.sonraki_turnuva_tarihi() to public, anon, authenticated, service_role;
revoke all on function public.soru_gosterim_payi() from public, anon, authenticated, service_role;
grant execute on function public.soru_gosterim_payi() to public, anon, authenticated, service_role;
revoke all on function public.tr_yonelme_eki(integer) from public, anon, authenticated, service_role;
grant execute on function public.tr_yonelme_eki(integer) to public, anon, authenticated, service_role;
revoke all on function public.turnuva_saati(text) from public, anon, authenticated, service_role;
grant execute on function public.turnuva_saati(text) to public, anon, authenticated, service_role;
revoke all on function public.ustalik_seviye(integer) from public, anon, authenticated, service_role;
grant execute on function public.ustalik_seviye(integer) to public, anon, authenticated, service_role;
revoke all on function public.yanlis_kaydet(uuid) from public, anon, authenticated, service_role;
grant execute on function public.yanlis_kaydet(uuid) to anon, authenticated, service_role;

-- A.5 c) / A.11 — varsayılan yetkiler
alter default privileges for role postgres grant execute on functions to public;
alter default privileges for role postgres in schema public grant execute on functions to anon;
alter default privileges for role postgres in schema public grant insert, update, delete on tables to anon;

-- A.9 — avatarlar kovası sınırsız
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'avatarlar';

-- A.12 — görünüm definer
alter view public.kasa_deneme_ozeti reset (security_invoker);

commit;
-- İstemci tarafı (geri alınırsa isteğe bağlı): oyun/pages/ChallengesPage.jsx eski_davetleri_temizle çağrısı
-- git geçmişinden geri getirilebilir; TournamentPage soruHakkim koşulu ve push.js yeniden abone olma zararsızdır.
