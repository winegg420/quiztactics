# Soru denetim hattı (Paket 20 · II.5)

Sunucuda otomatik AI taraması **yok** (ANTHROPIC_API_KEY Supabase'e eklenmez). Denetimi sahibi kendi Claude oturumunda yapar; bu iki komut yalnız soruları dışarı verir ve kararları geri işler.

## 1. Parti al
```
npm run soru:disari                # 100 soru (oyun_ayarlari.soru_parti_boyutu)
npm run soru:disari -- --adet 50
npm run soru:disari -- --kuru      # yalnız bak: parti_deneme.json, veritabanında işaret konmaz
```
Çıktı: `.tmp/soru_denetim/parti_NN.json`. Sıra: karantinadakiler → istatistik şüphelileri / oyuncu bildirimleri → kural şüphelileri → denetlenmemişler. Her kayıtta soru, şıklar, doğru cevabın **indeksi ve metni**, kategori, şüphe işaretleri, istatistik, bildirim sayısı + sebepleri, İngilizce çeviri.

Aktarılan sorular "dışa aktarıldı" diye işaretlenir; sonraki parti aynılarını vermez.

## 2. Denetlet
Dosyayı Claude oturumuna ver; dosyanın `talimat` alanı yeterli. Sonuç **dizi** olarak `parti_NN_sonuc.json`:
```json
[
  { "id": "…", "karar": "onayla", "kaynak": "TDK / Britannica maddesi", "not": "doğru" },
  { "id": "…", "karar": "duzelt", "dogru_cevap": 2, "kaynak": "…", "not": "anahtar ters" },
  { "id": "…", "karar": "duzelt", "soru": "…", "secenekler": ["…","…","…","…"], "dogru_cevap": 0 },
  { "id": "…", "karar": "kaldir", "not": "tartışmalı" }
]
```
`dogru_cevap` 0'dan sayılır (A=0 … D=3). `duzelt`'te yalnız değişen alanı yazmak yeter.

## 3. Geri işle
```
npm run soru:iceri -- parti_NN_sonuc.json --kuru   # önce dene: hiçbir şey yazılmaz, rapor çıkar
npm run soru:iceri -- parti_NN_sonuc.json
```
- **Şık denge kapısı** (`soru_kural_isaretleri`, ağırlık ≥ 2: doğru şık uzun / çok kelimeli, cevap sızması, hepsi-hiçbiri, aynı şık): kapıya takılan `duzelt` satırı **yazılmaz** ve listelenir. Bilerek geçirmek için `--zorla`. Kapı çalışamazsa hiçbir şey yazılmaz. Yalnız kapıyı denemek (salt okuma): `--yalniz-kapi` (takılan varsa çıkış kodu 2). SQL tek yerde: `kapi.mjs`. (Eskiden yalnız uyarıydı; ama düzeltilen soru `duzeltildi` olduğu için `soru_sec`'in "işaretli soru rekabetçi havuza girmez" dışlaması — yalnız `bekliyor` durumuna bakar — işlemiyordu.)
- **Şık ipucu kapısı (Jev, soru metni gizli — 23 Eyl 2026)**: şık denge kapısından geçen her `duzelt` satırının yazılacak son şıkları Jev'e **soru metni verilmeden**, karışık sırada sorulur; Jev doğru şıkkı seçip ona > 0,8 olasılık veriyorsa düzeltme **yazılmaz** (çeldiricileri doğru şıkla aynı tür/biçimde, eşit inandırıcı yazıp yeniden dene). `onayla` satırı, soru `sik_ipucu_jev` işaretliyse **yazılmaz**: onay şıkları değiştirmez ama soruyu `bekliyor`'dan çıkarıp ipucuyla rekabetçi havuza sokardı — önce `duzelt`. Jev çalışamazsa hiçbir şey yazılmaz; `--zorla` ve `--yalniz-kapi` bu kapıda da geçerli. Anahtar `.env › TYPESAFE_API_KEY`; maliyet ~0,00005 $/satır. Kod: `kapi.mjs › sikIpucuTesti`, `sikIpucuSonHalSorgusu`.
- **`sik_ipucu_jev` işareti** (migration 298, ağırlık 2): havuz taramasında (`araclar/jev-tarama/sik-ipucu.md`) takılan 1.310 soru. Kuraldan türemeyen "elle" işarettir (`soru_elle_isaret_mi`); tetikleyici soru/şık değişince ve `supheli_isaretler` doğrudan yazılınca onu korur. Bilerek kaldırmak için aynı transaction'da `select set_config('app.soru_elle_isaret_yaz','on',true);` sonra `array_remove`.
- Bozuk satır (bilinmeyen id, 4'ten farklı şık, 0-3 dışı indeks, bilinmeyen karar) **atlanır ve raporlanır**, parti düşmez.
- `duzelt`: eski hâl `soru_surum`'a yazılır, `surum` artar, İngilizce çeviri **eskidi** işaretlenir (yeniden çevrilene kadar o dilde sorulmaz).
- `kaldir`: `aktif = false` — satır silinmez.
- Karantinadaki soru onaylanır/düzeltilirse yeniden aktif olur.

Rapor: `parti_NN_sonuc_rapor.json`. Bağlantı `.env.local › SUPABASE_DB_PASSWORD` ile, Supabase CLI (devDependency) üzerinden.

## Ayarlar (`oyun_ayarlari`)
`soru_bildirim_esigi` (3) · `soru_istatistik_asgari` (20) · `soru_supheli_oran` (0.15) · `soru_ters_anahtar_pay` (0.7) · `soru_uzun_sik_oran` (1.6) · `soru_benzerlik_esigi` (0.75) · `soru_celiski_benzerlik` (0.9) · `soru_kategori_carpik_pay` (0.4) · `soru_supheli_rekabetci_haric` (true) · `soru_rekabetci_haric_agirlik` (2) · `soru_parti_boyutu` (100)
