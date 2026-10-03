# KASA modu — migration 950'yi canlıya uygulama (Ida için)

Bu adımlar veritabanını değiştirir. Hepsi bilgisayarda, proje klasöründe, terminalde yapılır.
Her komutu tek tek yapıştır, Enter'a bas, çıktıyı bekle.

## Ne zaman

- Oyunda maç yokken ve turnuva seansına en az 30 dakika varken (seanslar: 10:00 · 14:00 · 18:00 · 20:00 · 24:00).
- Uygulama tek işlemde olur: ya hepsi girer ya hiçbiri. Yarım kalmaz.

## Adımlar

**1. Proje klasörüne geç ve güncel kodu al**

```bash
cd C:\Users\ida\Desktop\quiztactics
git pull
```

Beklenen: `Already up to date.` ya da indirilen dosyaların listesi. Hata görürsen dur, bana gönder.

**2. Bekleyen migration'ı gör**

```bash
node araclar/kasa-sql-testi.mjs
```

Bu, değişikliği deneyip GERİ ALIR (hiçbir şey kalmaz). Beklenen son satır:

```
Sonuç: 86 geçti, 0 kaldı
```

- `⏸ BEKLE` yazarsa: oyunda maç var ya da seans yakın. 30 dakika sonra tekrar dene.
- `✗` ile başlayan satır varsa: dur, çıktıyı bana gönder. 3. adıma GEÇME.

**3. Migration'ı uygula**

```bash
node araclar/migration-uygula.mjs supabase/migrations/20260612000950_kasa_modu.sql
```

Beklenen tek satır:

```
Uygulandı: 20260612000950_kasa_modu
```

- `Zaten uygulanmış: 20260612000950` → daha önce uygulanmış, bir şey yapma.
- Kırmızı hata (ör. `lock timeout`, `canceling statement`) → hiçbir şey değişmedi (işlem geri alındı).
  5 dakika bekle, 3. adımı bir kez daha dene. İkinci kez de olursa dur, hatayı bana gönder.

**4. Doğrula**

```bash
node araclar/kasa-dogrula.mjs
```

Beklenen:

```
ayar 25/25 · tablo true · cron 1/1 · realtime 1/1 · defter 1/1
KASA kurulumu TAMAM
```

`EKSİK` yazarsa çıktıyı bana gönder.

## Bundan sonra

- Mod, istemci (sayfa) dağıtılana kadar oyunda görünmez; sunucu yalnız hazır bekler.
- Modu kapatmak gerekirse (kodsuz): `oyun_ayarlari` → `kasa_modu_acik` = `0`.
- Ödülleri kapatmak gerekirse: `kasa_odul_carpani` = `0` (ya da `kasa_odul_acik` = `0`).

## Geri almak gerekirse

`docs/kasa-geri-alma-950.sql` dosyası 9 ortak fonksiyonu eski hâline döndürür ve Kasa tablolarını
(maç kayıtlarıyla birlikte) siler. Oyunculara verilmiş ödüller geri alınmaz.
Bunu kendin çalıştırma; önce bana yaz, birlikte karar verelim.
