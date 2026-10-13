# Supabase taşıma — doğrulama (13 Eki 2026)

Eski: `zfpnxzybcpkxsotwdsey` (eski (hub)) · Yeni: `etezccrifaetzrgfvawl` (quiztacticsapp, eu-central-1, ücretsiz, Postgres 17).
Her ölçüm iki projede aynı SQL ile alındı; geçişten ÖNCE.

## Yöntem
Supabase'in resmi "Backup and restore using the CLI" yöntemi. Makinede Docker olmadığı için `supabase db dump`
yerine CLI'nın kendi betikleri (`dump_role.sh`, `dump_schema.sh`, `dump_data.sh`; aynı `pg_dump` bayrakları,
aynı hariç şemalar, aynı sed dönüşümleri) PostgreSQL 17.6 istemcisiyle çalıştırıldı. Yükleme:
`psql --single-transaction -v ON_ERROR_STOP=1` roles → schema → `SET session_replication_role = replica` → data →
supabase_migrations (şema+veri) → auth/storage/realtime özel nesneleri (auth tetikleyicisi, storage 6 + realtime 4 politika).

Yükleme sonrası düzeltilenler (hepsi eskiyle birebir eşitlemek için):
- Yeni projenin varsayılan yetkileri anon/authenticated'a fazladan tablo GRANT'ı ve EXECUTE vermişti (pg_dump bunları geri almaz). Fazla 3.490 yetki geri alındı (REVOKE), REVOKE sırasında düşen 25 sütun yetkisi geri verildi, `ALTER DEFAULT PRIVILEGES` eskiyle eşitlendi.
- pg_cron işleri dökümde gelmez (eklenti tablosu); 24 iş aynı ad/zamanlama/komut/aktiflikle `cron.schedule` ile kuruldu.
- Windows psql, 50 fonksiyon gövdesindeki CR karakterini atmıştı; o 50 fonksiyon eski tanımdan ikili güvenli yeniden yazıldı.
- 1089 migration'ı: 5 fonksiyondaki eski adres ve `profiles` içindeki 29 eski Storage adresi yeni ref'e çevrildi.
- `sunucu_gizli.cron_secret` yeni CRON_SECRET ile eşlendi; `cron.log_statement=false` (eskideki gibi).

## Sonuç tablosu
| Ölçü | Eski | Yeni | Durum |
|---|---|---|---|
| fonksiyon_govde (sayı + tanım özeti md5) | 828 | 828 | aynı |
| politika (sayı + tanım özeti md5) | 137 | 137 | aynı |
| tetikleyici (sayı + tanım özeti md5) | 107 | 107 | aynı |
| indeks (sayı + tanım özeti md5) | 338 | 338 | aynı |
| kisit (sayı + tanım özeti md5) | 604 | 604 | aynı |
| kolon (sayı + tanım özeti md5) | 1514 | 1514 | aynı |
| rls (sayı + tanım özeti md5) | 172 | 172 | aynı |
| yayin (sayı + tanım özeti md5) | 16 | 16 | aynı |
| kova (sayı + tanım özeti md5) | 3 | 3 | aynı |
| nesne (sayı + tanım özeti md5) | 269 | 269 | aynı |
| cron (sayı + tanım özeti md5) | 24 | 24 | aynı |
| rol_ayar (sayı + tanım özeti md5) | 3 | 3 | aynı |
| sekans (sayı + tanım özeti md5) | 23 | 23 | aynı |
| Yetki girdisi (tablo/sütun/fonksiyon/şema/varsayılan, public+storage; aclexplode) | 6182 | 6182 | aynı, fazla 0, eksik 0 |
| EXECUTE anon / authenticated / service_role (imza listesi md5) | 1 / 318 / 828 | 1 / 318 / 828 | aynı |
| Tablo satırları (203 tablo; döküm anı) | — | — | 203/203 eşit |
| Canlı satır sayımı (public, auth, storage) | | | eşit (yalnız platform tabloları farklı: cron.job_run_details, net._http_response, realtime bölümleri) |
| auth.users / auth.identities | 268 / 31 | 268 / 31 | aynı (id'ler korunur) |
| supabase_migrations | 563 (son 1088) | 564 (son 1089) | +1089 beklenen |
| Storage kova / dosya / bayt | 3 / 269 / 42.834.853 | 3 / 269 / 42.834.853 | aynı (dosyalar indirilip aynı yola yüklendi) |
| Edge Function | 3 (+repoda 1) | 4 | generate-questions, send-push, satin_alma_iade_tara JWT kapalı; satin_alma_dogrula JWT açık |
| Vault / webhook | 0 / 0 | 0 / 0 | aynı |
| Realtime yayın tabloları | 16 | 16 | aynı · presence_enabled=true |
| API açık şemalar / max rows | public,graphql_public / 1000 | aynı | aynı |
| Rol ayarları (statement_timeout) | anon 3s, authenticated 8s, authenticator 8s | aynı | aynı |

Platform farkları (taşınmaz, sorun değil): Postgres alt sürümü 17.6 → 17.11, pg_net 0.20.3 → 0.20.4, `cli_login_postgres` rolü, DB boyutu 120 → 68 MB (şişkinlik yok).

## Auth ayarları
Eskiyle aynı: anonim giriş, e-posta, Google (aynı client id), JWT 3600 sn, yenileme belirteci döndürme, oran sınırları, şablonlar.
Değişen (görev gereği): site_url `https://quiztactics.com`; yönlendirme listesine `https://www.quiztactics.com/**`, `http://localhost:5173/**`, `http://localhost:*/**` eklendi.
Google client secret: Management API yalnız özetini (hash) veriyor, gerçek değer okunamıyor → Ida'dan gerekli.

## Güvenlik danışmanı (advisors/security)
| Uyarı | Eski | Yeni |
|---|---|---|
| rls_enabled_no_policy (INFO) | 73 | 73 |
| function_search_path_mutable (WARN) | 27 | 27 |
| extension_in_public (WARN) | 1 | 1 |
| anon_security_definer_function_executable (WARN) | 1 | 1 |
| authenticated_security_definer_function_executable (WARN) | 317 | 317 |
| auth_allow_anonymous_sign_ins (WARN) | 102 | 102 |
| auth_leaked_password_protection (WARN) | 1 | 1 |

Yeni projede eskide olmayan uyarı yok.
