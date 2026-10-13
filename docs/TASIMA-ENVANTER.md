# Supabase taşıma — eski proje envanteri (13 Eki 2026)

Eski proje: `zfpnxzybcpkxsotwdsey` (eski hesap, **eski (hub)**). Yalnız okuma ile çıkarıldı.
Ham ölçüm betiği: tek SQL sorgusu (`pg_class`, `pg_proc`, `pg_policies`, `has_function_privilege`, `cron.job`, `storage.objects`) + Management API.

## Genel
- Bölge: **eu-central-1** · Postgres **17.6** (motor 17, 17.6.1.127) · DB boyutu **120 MB** (ücretsiz plan sınırı 500 MB → sığar)
- Eklentiler: pg_cron 1.6.4 (pg_catalog), pg_net 0.20.3 (**public**), pg_stat_statements, pg_trgm, pgcrypto, uuid-ossp (extensions), supabase_vault 0.3.1, plpgsql
- Şemalar: auth, cron, extensions, graphql, graphql_public, net, public, realtime, storage, supabase_migrations, vault
- Özel rol: yok (yalnız platformun `cli_login_postgres`’i). Rol ayarları: anon statement_timeout=3s, authenticated=8s, authenticator=8s.

## Nesne sayıları
| Ölçü | Değer |
|---|---|
| public fonksiyon | 828 (security definer 778) |
| auth / storage / realtime / cron / vault fonksiyon | 4 / 19 / 18 / 7 / 5 |
| tetikleyici public / auth / storage / realtime / cron | 99 / 1 (`on_auth_user_created`) / 7 / 1 / 1 |
| RLS politikası public / storage / realtime / cron | 127 / 6 / 4 / 2 |
| RLS açık public tablo | 172 |
| public indeks / sekans / view | 338 / 23 / 1 |
| tablo GRANT public: anon / authenticated / service_role / postgres | 242 / 265 / 1211 / 1211 |
| tablo GRANT storage: anon / authenticated / service_role / postgres | 25 / 25 / 37 / 14 |
| sütun yetkisi (public) anon SELECT/INSERT/UPDATE | 671 / 315 / 315 |
| sütun yetkisi (public) authenticated SELECT/INSERT/UPDATE | 834 / 315 / 318 |
| EXECUTE (public fonksiyonları): anon / authenticated / service_role | 1 / 318 / 828 (karşılaştırma: imza listesinin md5’i) |
| Migration geçmişi | 563 kayıt, son `20260612001088` |
| Vault kaydı | 0 · Veritabanı webhook’u: 0 |

## Realtime
- Yayın `supabase_realtime`: bildirimler, direkt_mesajlar, duello_davetleri, duello_sinyal, friendships, group_match_messages, group_match_players, group_matches, hizli_maclar, hizli_oyuncular, kasa_davetleri, kasa_sinyal ve devamı (tam liste doğrulama belgesinde karşılaştırılır)
- Ayarlar: presence_enabled=true, max_concurrent_users=200, max_events_per_second=100, max_channels_per_client=100, max_joins_per_second=100, max_presence_events_per_second=20, max_payload_size_in_kb=256

## API (PostgREST)
- Açık şemalar: `public,graphql_public` · ek arama yolu `public, extensions` · max_rows 1000

## Storage
| Kova | Public | Dosya | Bayt | Sınır | MIME |
|---|---|---|---|---|---|
| avatarlar | evet | 95 | 2.077.698 | 2 MB | png/jpeg/webp |
| muzik | evet | 32 | 32.225.171 | 10 MB | audio/aac |
| ses-adaylar | evet | 142 | 8.531.984 | 10 MB | wav/x-wav/mpeg/aac |
Toplam 269 nesne. Proje dosya sınırı 50 MB.

## Edge Function’lar (eski projede)
| Ad | JWT doğrulama | Sürüm |
|---|---|---|
| generate-questions | kapalı | v12 |
| send-push | kapalı | v6 |
| satin_alma_dogrula | açık | v3 |
Repoda ayrıca `satin_alma_iade_tara` var (eski projede dağıtılmamış; config.toml: verify_jwt=false).

Gizli anahtar adları (değer yok): CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, ANTHROPIC_API_KEY (+ platformun SUPABASE_* anahtarları).
DB içi gizli: `public.sunucu_gizli` tablosunda `cron_secret` (Edge Function’ın CRON_SECRET’ı ile aynı olmalı).

## pg_cron işleri (24) — hepsi Quiz Tactics’in
- `bildim-bildirim-temizle` · 20 3 * * * | aktif=true | select public.bildirim_temizle()
- `bildim-bot-arkadaslik` · 25 * * * * | aktif=true | select public.bot_arkadaslik_temizle()
- `bildim-bot-puan-tik` · */10 * * * * | aktif=true | select public.bot_puan_tik()
- `bildim-bot-zorluk-ofset` · 25 4 * * * | aktif=true | select public.bot_zorluk_ofset_hesapla()
- `bildim-cron-kayit-budama` · 17 * * * * | aktif=true | select public.kayit_budama()
- `bildim-dakika-tik` · * * * * * | aktif=true | select public.cron_dakika_tik()
- `bildim-eski-davet-temizle` · 5 * * * * | aktif=true | select public.eski_davetleri_temizle()
- `bildim-hafta-bildir` · 0 6 * * 1 | aktif=true | select public.haftalik_sonuc_bildir()
- `bildim-hafta-kapat` · 0 21,22,23 * * 0 | aktif=true | select public.haftalik_kapanis()
- `bildim-hafta-kapat-pzt` · 0 0,1,2,3 * * 1 | aktif=true | select public.haftalik_kapanis()
- `bildim-ikram-zaman-asimi` · * * * * * | aktif=false | select public.ikram_zaman_asimi()
- `bildim-kotuye-kullanim` · 40 3 * * * | aktif=true | select public.kotuye_kullanim_tara()
- `bildim-seri-hatirlat` · 0 17 * * * | aktif=true | select public.seri_hatirlat()
- `bildim-seri-kontrol` · 5 21 * * * | aktif=true | select public.seri_kontrol()
- `bildim-sezon-tik` · */5 * * * * | aktif=true | select public.cron_sezon_tik()
- `bildim-sikayet-saklama` · 35 3 * * * | aktif=true | select public.sikayet_saklama_temizle()
- `bildim-soru-zorluk` · 10 4 * * * | aktif=true | select public.soru_zorluk_kalibre()
- `bildim-turnuva-giysi-rotasyon` · 5 21 * * 0 | aktif=true | select public.turnuva_giysi_rotasyon()
- `bildim-turnuva-giysi-yedek` · 10 4 * * * | aktif=true | select public.turnuva_giysi_rotasyon()
- `bildim-turnuva-hatirlat` · 15 16 * * * | aktif=true | select public.turnuva_hatirlat('turnuva_gece')
- `bildim-turnuva-hatirlat-sabah` · 15 10 * * * | aktif=true | select public.turnuva_hatirlat('turnuva_ogle')
- `bildim-turnuva-lobi-bot` · */10 * * * * | aktif=true | select public.turnuva_lobi_botlari()
- `bildim-yarim-mac-temizle` · 15 * * * * | aktif=true | select public.hizli_mac_temizle(); select public.grup_mac_temizle(); select public.senkron_mac_temizle();
- `hizli_tik` · 30 seconds | aktif=true | call public.cron_hizli_tik_islem()

Hiçbir cron komutunda eski URL/anahtar yok. **Eski URL içeren fonksiyonlar (5):** `bildirim_yaz`, `notify_new_hizli_davet`, `push_gonder`, `haftalik_sonuc_bildir` (send-push adresi), `avatar3d_portre_kaydet` (kova adresi kontrolü). Veride: `public.profiles` 29 satırda eski Storage adresi.

## Auth (Management API)
- site_url `https://quiztactics.vercel.app` · yönlendirme listesi: localhost:5173, quizador.pages.dev/**, idagg-game-center.vercel.app/**, *.quizador.pages.dev/**, quizador.vercel.app/**, quizsquare.vercel.app/**, quiztactics.vercel.app/**, quiztactics.com/**
- Anonim giriş açık · e-posta açık · Google açık (client id `1011203472462-…apps.googleusercontent.com`) · Facebook kapalı
- JWT süresi 3600 sn · yenileme belirteci döndürme açık (yeniden kullanım 10 sn) · parola en az 6
- Oran sınırları: anonim 30, e-posta 2, sms 30, token yenileme 150, doğrulama 30, otp 30, web3 30 · smtp_max_frequency 60 · captcha yok
- E-posta şablonları varsayılan (özel içerik bayrağı hepsinde false)

## Ağ / SSL
Ağ kısıtı yok (0.0.0.0/0, ::/0) · SSL zorlaması kapalı.

## Güvenlik danışmanı (eski)
rls_enabled_no_policy 73 (INFO) · function_search_path_mutable 27 · extension_in_public 1 · anon_security_definer_function_executable 1 · authenticated_security_definer_function_executable 317 · auth_allow_anonymous_sign_ins 102 · auth_leaked_password_protection 1

## Repoda eski ref / anahtar geçen yerler
Kaynak kod ref’i ortam değişkeninden okur. Ref’i sabit yazan dosyalar: `araclar/pg-mini.mjs`, `araclar/soru_denetim/ortak.mjs`, `oyun/_test/*` (11), `supabase/functions/satin_alma_iade_tara/index.ts`, `scripts/supabase-kurulum.ps1`, belgeler (`GIRIS_SAGLAYICILARI.md`, `YAYIN_KONTROL.md`, `YEDEKLEME.md`), eski migration’lar (tarihçe, dokunulmaz). `.env` (git dışı).

## Tablo satır sayıları
- auth.audit_log_entries: 0
- auth.custom_oauth_providers: 0
- auth.flow_state: 59
- auth.identities: 31
- auth.instances: 0
- auth.mfa_amr_claims: 153
- auth.mfa_challenges: 0
- auth.mfa_factors: 0
- auth.mfa_recovery_code_sets: 0
- auth.mfa_recovery_codes: 0
- auth.oauth_authorizations: 0
- auth.oauth_client_states: 0
- auth.oauth_clients: 0
- auth.oauth_consents: 0
- auth.one_time_tokens: 5
- auth.refresh_tokens: 963
- auth.saml_providers: 0
- auth.saml_relay_states: 0
- auth.schema_migrations: 82
- auth.scim_tokens: 0
- auth.scim_users: 0
- auth.sessions: 153
- auth.sso_domains: 0
- auth.sso_providers: 0
- auth.users: 268
- auth.webauthn_challenges: 0
- auth.webauthn_credentials: 0
- cron.job: 24
- cron.job_run_details: 1705
- net._http_response: 1
- net.http_request_queue: 0
- public.auralar: 12
- public.avatar3d_parcalar: 58
- public.avatar3d_sahip: 1510
- public.avatar_katalogu: 45
- public.avatar_nitelikleri: 76
- public.badges: 17
- public.bildirimler: 159
- public.boks_kariyer: 0
- public.boks_oturumlar: 0
- public.boks_roundlar: 0
- public.boks_rozetler: 0
- public.boks_sezon: 0
- public.boks_skorlar: 0
- public.boks_tercihler: 1
- public.boks_zayifliklar: 0
- public.bot_kategori_sapma: 1600
- public.bot_puan_temposu: 159
- public.bot_tepki_bekleyen: 0
- public.bp_seviye_odulleri: 56
- public.bp_tanitim_gosterimleri: 4
- public.calisma_oturumlari: 53
- public.cerceveler: 24
- public.ceviri_atlanan: 339
- public.ceviri_dil_kurallari: 1
- public.coin_hareketleri: 1010
- public.coin_paketleri: 5
- public.coin_satin_alma_defteri: 0
- public.davetler: 5
- public.dg_customizations: 0
- public.dg_ghosts: 1
- public.dg_profiles: 3
- public.dg_race_results: 2
- public.direkt_mesajlar: 13
- public.duello_davetleri: 15
- public.duello_hamleler: 855
- public.duello_kuyrugu: 0
- public.duello_sinyal: 112
- public.duellolar: 112
- public.elmas_hareketleri: 153
- public.elmas_paketleri: 5
- public.engellemeler: 0
- public.esyalar: 71
- public.friendships: 11
- public.gl_maclar: 0
- public.gl_oda_oyunculari: 0
- public.gl_odalar: 0
- public.gl_profiller: 0
- public.gorev_havuzu: 16
- public.gorulen_sorular: 4787
- public.group_match_answers: 453
- public.group_match_jokers: 0
- public.group_match_messages: 11
- public.group_match_players: 33
- public.group_matches: 11
- public.grup_kuyrugu: 0
- public.gunluk_gorev_secimi: 42
- public.haftalik_gorev_alimi: 14
- public.haftalik_gorev_secimi: 9
- public.hizli_cevaplar: 0
- public.hizli_maclar: 0
- public.hizli_mod_oturumlar: 4
- public.hizli_mod_skorlar: 4
- public.hizli_oyuncular: 0
- public.izinli_kelimeler: 10
- public.joker_envanter: 836
- public.joker_islemleri: 1283
- public.joker_kullanimlari: 564
- public.joker_paketleri: 17
- public.kafatopu_davetler: 2
- public.kafatopu_kuyruk: 0
- public.kafatopu_mac_oyunculari: 12
- public.kafatopu_maclar: 6
- public.kafatopu_oda_oyunculari: 12
- public.kafatopu_odalar: 7
- public.kafatopu_profiller: 12
- public.karakterler: 20
- public.kasa_cevaplari: 1834
- public.kasa_davetleri: 6
- public.kasa_hamleler: 979
- public.kasa_kuyrugu: 0
- public.kasa_maclari: 70
- public.kasa_sinyal: 70
- public.kategori_dogru: 111
- public.kategori_istatistik: 1715
- public.koleksiyon_ek_kalemleri: 0
- public.kotuye_kullanim_isaretleri: 1
- public.kozmetikler: 37
- public.lig_arsiv: 482
- public.lig_cerceveleri: 275
- public.lig_uyelik: 514
- public.match_answers: 5169
- public.match_jokers: 0
- public.match_messages: 253
- public.matches: 182
- public.matchmaking_queue: 0
- public.meydan_bot_nobeti: 2
- public.meydan_ikramlari: 21
- public.meydan_katilim: 0
- public.meyvekes_skorlar: 2
- public.odul_kalemleri: 431
- public.oltalar: 0
- public.oyun_ayarlari: 512
- public.oyuncu_auralari: 0
- public.oyuncu_avatarlari: 22
- public.oyuncu_bp_odul_alimi: 51
- public.oyuncu_bp_sahipligi: 2
- public.oyuncu_bp_tasma_alimi: 0
- public.oyuncu_cerceveleri: 384
- public.oyuncu_cihazlari: 85
- public.oyuncu_esyalari: 4428
- public.oyuncu_istatistik: 174
- public.oyuncu_karakterleri: 1340
- public.oyuncu_kozmetikleri: 16
- public.oyuncu_nabiz: 159
- public.oyuncu_rozetleri: 2405
- public.oyuncu_sezon_puani: 5
- public.oyuncu_skill_kilitleri: 0
- public.oyuncu_skill_setleri: 3
- public.oyuncu_unvanlari: 3
- public.posta: 0
- public.posta_durum: 0
- public.pr_badges: 0
- public.pr_best_times: 0
- public.pr_blocks: 0
- public.pr_character_customizations: 0
- public.pr_character_xp: 0
- public.pr_error_logs: 0
- public.pr_friendships: 0
- public.pr_race_participants: 0
- public.pr_races: 0
- public.pr_rooms: 0
- public.pr_user_badges: 0
- public.pr_users: 1
- public.profiles: 268
- public.push_metinleri: 72
- public.push_subscriptions: 0
- public.quest_progress: 38
- public.question_translations: 15710
- public.question_votes: 60
- public.questions: 19039
- public.reklam_jetonlari: 0
- public.reklam_odulleri: 0
- public.rozet_gruplari: 11
- public.rozet_tanimlari: 108
- public.rpc_sayac: 94
- public.sahip_tasarim_secimleri: 1
- public.satin_almalar: 0
- public.sehirler: 4956
- public.ses_secimleri: 37
- public.sezon_bonus_gorev: 7
- public.sezon_puan_hareketleri: 175
- public.sezonlar: 1
- public.sikayetler: 0
- public.skill_ikinci_sans_denemeleri: 0
- public.skill_katalogu: 12
- public.soru_cevap_kaydi: 471
- public.soru_degisimleri: 148
- public.soru_denetim: 100
- public.soru_surum: 694
- public.sunucu_gizli: 1
- public.tournament_answers: 43141
- public.tournament_players: 8933
- public.tournaments: 169
- public.turnuva_giysi_odulu: 5
- public.ulkeler: 86
- public.unvan_sayaclari: 1
- public.unvan_tanimlari: 17
- public.user_badges: 33
- public.vitrin_kozmetikleri: 13
- public.xp_hareketleri: 236
- public.yanlis_sorular: 1962
- public.yasakli_kelimeler: 80
- realtime.messages: 0
- realtime.messages_2026_10_10: 0
- realtime.messages_2026_10_11: 0
- realtime.messages_2026_10_12: 0
- realtime.messages_2026_10_13: 0
- realtime.messages_2026_10_14: 0
- realtime.messages_2026_10_15: 0
- realtime.messages_2026_10_16: 0
- realtime.schema_migrations: 89
- realtime.subscription: 0
- storage.buckets: 3
- storage.buckets_analytics: 0
- storage.buckets_vectors: 0
- storage.migrations: 73
- storage.objects: 269
- storage.s3_multipart_uploads: 0
- storage.s3_multipart_uploads_parts: 0
- storage.vector_indexes: 0
- supabase_migrations.schema_migrations: 563
- vault.secrets: 0
