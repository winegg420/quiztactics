# KASA modu (deneysel) — rapor

Dal: `kasa-onizleme` (main'e gönderilmedi). Migration 950 canlıya **UYGULANMADI**.

## Kural (sunucuda, migration 950)

- 2 oyuncu, aynı soru aynı anda (15 sn). Ortada kasa 0'dan başlar.
- Her soru sonrası kasa +2; ikisi de doğruysa toplam +6.
- Soruyu tek başına bilen kasanın sahibi olur; ikisi de bilir/bilmezse sahip değişmez.
- Tur başında sahip AÇ ya da DEVAM der (8 sn; süre dolarsa DEVAM). AÇ: kasa sahibine puan, kasa 0, sahip yok; soru aynı turda yine oynanır.
- 20 puana ilk ulaşan kazanır (AÇ sonrası kontrol). 24 tur dolarsa sahip kasayı alır, çok puanlı kazanır; eşitlikte Altın Soru.
- Joker / skill / hız bonusu yok. Bütün sayılar `oyun_ayarlari.kasa_*` (25 anahtar), maç açılırken maç satırına sabitlenir.

## Sunucu

- **Tablolar:** `kasa_maclari`, `kasa_hamleler` (tur başına: karar, açılan değer, doğru/yanlış, kasa), `kasa_cevaplari`, `kasa_kuyrugu`, `kasa_davetleri`, `kasa_sinyal`; görünüm `kasa_deneme_ozeti` (ayar denemesi için, istemciye kapalı).
- **İstemci RPC'leri (yalnız authenticated):** `kasa_ara`, `kasa_aramadan_cik`, `kasa_aktif_benim`, `kasa_giris`, `kasa_durum`, `kasa_cevap`, `kasa_karar`, `kasa_terk`, `kasa_davet_et`, `kasa_davet_cevap`, `kasa_davet_iptal`.
- **İlerleme:** idempotent `kasa_ilerlet` (her okuma ve eylem çağırır, FOR UPDATE) + emniyet için `kasa_tik` cron'u (10 sn).
- **Güvenlik (Ida onayı):** ana tablolarda RLS açık ve politika yok (yalnız RPC); `_select_own` yalnız `kasa_sinyal` ve `kasa_davetleri`'nde. Engelleme: mevcut `trg_iletisim_engel`'e `kasa_davetleri` dalı.
- **Sızıntı:** `kasa_durum` doğru cevabı yalnız soru çözüldükten sonra (sonuç fazı) ve maç bitince verir. Rakibin şıkkı, botun cevabı/kararı/tarzı, soru listesi hiç dönmez.
- **Bot:** doğruluk `bot_soru_isabet`; cevap 2–6 sn; karar 1–3 sn, sunucuda. Tarz bot adından deterministik: Temkinli (kasa ≥ 4), Dengeli (≥ 8), Açgözlü (≥ 12), her kararda eşik −2/0/+2. Kasa hedefe ulaştırıyorsa her zaman AÇ.
- **Eşleşme:** Düello ile aynı (lig ±1, engelli çift eşleşmez, gerçek rakip yoksa üçgen dağılımlı sürede gizli bot). Antrenman açık bota davetle, her zaman serbest. Düello yeni oyuncu kilidi uygulanmaz.

## Ödül

- Klasik'in yardımcılarıyla aynı yol: `coin_mac_odulu`, `xp_mac_odulu`, `lig_mac_galibiyet` / `lig_mac_beraberlik`, `gunluk_seri_bonusu`, `mac_sayaci_arttir`, `istatistikli_mac_arttir`, `award_badge`.
- Çarpan: Klasik çarpanı (aynı çift günlük sınırı, aynı cihaz/IP, serbest, açık bot — "en düşüğü") × `kasa_odul_carpani`; `kasa_odul_acik = 0` ya da çarpan 0 ise ödülsüz.
- Sezon Puanı: kaynak `mac`, referans `kasa:<id>` (seçenek A; `sezon_puani_ekle` değişmedi, günlük maç SP tavanı ve Battle Pass çarpanı Klasik ile aynı).
- Rozet: Klasik ile aynı davranış — `ilk_galibiyet` koşulsuz, `mac_10` yalnız Dereceli (sayım Klasik + Kasa galibiyetleri). Beraberlikte bota bot yüzdesi.
- Görev: yeni görev türü yok; Kasa maçı mevcut "maç oyna / kazan / doğru" sayımına girer (ödülsüz maç girmez).
- **Ortak fonksiyonlara yalnız `kasa` dalı (9):** `cift_odul_carpani`, `xp_mac_odulu`, `gorev_olcum`, `gorev_dogru_satirlari`, `gorev_sayaci`, `odul_dokumu`, `level_kazancim`, `mac_sonu_ozet`, `trg_iletisim_engel`. Mevcut dallar aynen.

## Testler

### SQL testi — `node araclar/kasa-sql-testi.mjs`

Canlı veritabanında tek işlem + ROLLBACK (yerelde Docker yok), `lock_timeout` 3 sn, `statement_timeout` 30 sn; cron ve realtime adımları hariç. Ön kontrol: 30 dk içinde turnuva seansı ya da aktif maç varsa çalışmaz.

- Son koşu 3 Eki 2026 23:14 TSİ: **86 geçti, 0 kaldı**.
- **Regresyon:** Klasik ve Düello için 44 değer (`cift_odul_carpani`, `xp_mac_odulu` 4 varyant, `sezon_puani_ekle`, `mac_sonu_ozet`, `odul_dokumu`, `level_kazancim`, `gorev_olcum` 4 sayaç × hariç/haricsiz, `gorev_sayaci` 3) migration öncesi ve sonrası **birebir aynı**. `sezon_puani_ekle` md5'i migration sonrası canlıyla aynı.
- **ROLLBACK sonrası:** 12 imzanın md5'i önceki tanımla aynı; `kasa_maclari` yok; kasa ayarı yok.
- **Ödül dökümü (kanıt):** galibiyet kalemi 30 coin + 25 lig; ek +5 coin ve +3 lig = günlük `seri` kalemi (Klasik'te de aynı). Bakiye farkı = coin hareketleri = ödül kalemleri.
- **Rozet:** 9 Dereceli galibiyetten sonra 10. galibiyet — Serbest: Klasik ve Kasa ikisi de yalnız `ilk_galibiyet`; Dereceli: ikisi de `ilk_galibiyet` + `mac_10`.
- Önceki koşularda bulunan ve düzeltilenler: Sezon Puanı kısıt hatası (gerçek hata; seçenek A ile çözüldü), test beklenti hataları (seri bonusu, 3B görünümdeki ayakkabı "bot" değeri, `coin_hareketleri.olusturuldu` kolon adı, kaynak metin araması yerine davranış testi).

### Ekran testi — `node araclar/kasa-ekran.mjs`

**Taklit veriyle** (Kasa RPC'leri ve ayarları tarayıcıda taklit; sunucuya yazmaz). Gerçek iki hesapla test YAPILMADI, çünkü RPC'ler canlıda yok.

- 360×640 ve 390×844, Türkçe ve İngilizce: **280 geçti, 0 kaldı**.
- Ölçülenler: yatay taşma, maç ekranının kaydırmasız sığması, ≥ 44 px dokunma hedefi, kontrast ≥ 4,5 (büyük ≥ 3), kesik metin, konsol hatası, beklenen metinler.
- Ekranlar: ana sayfa kısayolu, Modlar kartı, giriş, 3-2-1, karar (ben / rakip), soru (kısa / uzun), sonuç, Altın Soru, maç sonu, kapalı mod.
- `npm run build` temiz; Kasa ayrı tembel parça (8,6 kB gzip).

## Arayüz

- `oyun/pages/KasaPage.jsx` (giriş + arama + maç), `oyun/components/KasaParcalari.jsx`, `oyun/styles/kasa.css`; rota `/kasa`, `/kasa/:id`.
- Kasa kadranı (halka + büyük sayı + sahip), SEN/RAKİP skor çubukları (hedef 20, kasa açılırsa ulaşılacak yer soluk), AÇ/DEVAM ekranı, "Rakip karar veriyor…", sonuç bandı ("İkiniz de bildiniz +6", "Tek başına bildin: kasa sende"…), 3-2-1, kopukluk bantları, maç sonu (rövanş yok, "Yeni Kasa maçı").
- Ana sayfa 5. kısayol ("Deneysel" etiketi, tek satır), Modlar kartı (kapalıyken kilitli + "Bu mod şu an kapalı."), Antrenman düğmesi, devam eden maç kartı.
- Mod rengi `--qt-mod-kasa` #0b6f68 (beyaz yazı 6,0:1). İngilizce `oyun/lib/ceviri/kasa.js` (mod adı "Vault").
- İstemci `kasa_modu_acik` ayar satırını bulamazsa modu kapalı sayar: migration uygulanmadan canlıda olmayan RPC'ler çağrılmaz.

## Canlıya uygulama hazırlığı

- Canlıda bekleyen tek migration: `20260612000950_kasa_modu.sql`.
- Yönerge: `docs/kasa-canliya-uygulama.md` (Ida için adım adım).
- Doğrulama: `node araclar/kasa-dogrula.mjs` (salt okunur).
- Geri alma: `docs/kasa-geri-alma-950.sql` (9 fonksiyonun canlı tanımı + kasa nesneleri). **Çalıştırılmadı, denenmedi.**
- Cron ölçümü: `duello_tik` boşta 15 sn (saatte 240, ort. 5,7 ms); cron log 6 saatten eskisi saatlik siliniyor (5.257 satır, 1,8 MB). `kasa_tik` 10 sn ile 6 saatte +2.160 satır. **Öneri (onay bekliyor):** 30 sn + aktif maç yoksa hemen çıkış.

## Ida kararları (3 Eki 2026)

Ana tablolar yalnız RPC · Serbest|Dereceli var · rozet yalnız genel · ilk sürümde rövanş yok · Sezon Puanı seçeneği A · 4 küçük fark kalsın (bot hedef kuralı, `mac_10` Klasik + Kasa sayımı, ödül kapalıyken seri durur, Kasa'nın kendi gösterim payı) · üç rozet/beraberlik sapması Klasik'e uyduruldu.

## Kalan işler

1. 950'yi canlıya uygulamak (Ida, yönergeyle), ardından iki gerçek hesapla canlı test.
2. Cron önerisinin kararı.
3. Geri alma dosyasının tek işlem + ROLLBACK ile denenmesi.
4. Arkadaşa Kasa daveti arayüzü (sunucu `kasa_davet_et` hazır; Meydan'dan davet ekranı ve bildirimdeki `kasa_daveti` türü yok).
5. Masaüstü (1440 px) görünümü ölçülmedi; gerçek iPhone kontrolü telefonda.

## Commit'ler (bu dalda)

`9edb66bc` migration 950 · `f322dd00` SP seçeneği A + rozet/beraberlik + SQL testi · `a8a8f07b` canlıya hazırlık · `52ba553d` arayüz · `9aa69f5c` kartlar · `618c63a5` İngilizce metinler · `08833907` ekran ölçümü · `f5e462f8` PROGRESS + PROJECT_CONTEXT · ardından bu rapor.
