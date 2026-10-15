# Tek hesabı yedekten geri yükleme (16 Eki 2026)

Kullanıldığı olay: `arayuz-denetim.mjs`'e Ida oturumu verildi, araç iş sonunda `hesabimi_sil` çağırdı
(auth.users → bütün oyun verisi kaskadla silindi). Geri yükleme yalnız o hesabın satırlarıyla yapıldı.

1. Önce canlının yeni yedeği: `node araclar/yedek-al.mjs`
2. Gece yedeğini indir: `gh run download <run-id> -D <scratchpad>/yedek` (Actions › Veritabanı Yedeği, 14 gün)
3. `pg_restore --data-only -f veri.sql yedek.dump` (Windows'ta PostgreSQL 17 ikili zip'i scratchpad'e; projeye girmez)
4. Kapanış (salt okuma): `node araclar/hesap-geri-yukle/kapanis.mjs veri.sql satirlar.json` — canlı FK grafiğiyle
   auth.users satırından kaskad (c) kapanışı + set-null başvurular. `IDA` sabitini değiştir.
5. Prova: `IZIN_CANLI_TEST=1 node araclar/hesap-geri-yukle/geri-yukle.mjs satirlar.json` (tek işlem, ROLLBACK)
6. Uygula: aynı komut `--uygula` (hata yoksa COMMIT). Tetikleyiciler bu işlemde kapalı (replica); FK'ler elle
   doğrulanır. Oturum/yenileme belirteçleri ve rpc_sayac geri yüklenmez. Yalnız NULL kalmış başvurular geri döner.

16 Eki sonucu: 77 tablo, 12.713 satır; 3 oyuncunun `davet_eden`i geri döndü; FK ihlali 0; 15 Eki 04:10 UTC sonrası veri yok.
