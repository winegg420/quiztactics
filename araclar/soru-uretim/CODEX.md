# Codex soru hattı

Stilin tek kaynağı: docs/SORU_STIL_PROFILI.md. Bu dosya sonraki “CODEX.md'ye göre codex-NN” görevlerinin çalışma sözleşmesidir.

## B) Üretim
- Soruları Codex yazar. Claude API çağrısı, anahtar okuma veya ücretli Claude üretimi/hakemliği yapılmaz. Claude insan tarafından ayrı oturumda son hakem olarak kullanılır.
- Normal net hedef 200; ilk deneme codex-01 net 50. Başlangıç taslağı yaklaşık hedefin 2,5 katıdır; kota açığı varsa ek taslak yazılır.
- Kategoriler: sanat, muzik, teknoloji, spor, tarih, sinema, genel_kultur, edebiyat. Bilim ve coğrafya yok.
- Parti başında havuz toplu, salt okunur sorguyla ölçülür: aktif, zorluk 2 veya 3, sik_ipucu_jev işaretsiz. Ağırlık = en kalabalık kategori + 25 − kategori sayısı; en büyük kalan yöntemiyle kota.
- Önce kategorinin mevcut soruları, cevapları ve kök kavramları .tmp/codex/<parti>/kavramlar.md üzerinden incelenir. Aynı olgu başka ifadeyle tekrarlanmaz.
- Yaklaşık %70 zorluk 2, %30 zorluk 3. Tek olgu, tek kesin doğru; üç yanlış şık aynı tür/biçimde, benzer uzunlukta ve eşit inandırıcıdır. Doğru şık en uzun veya tek farklı biçimli olmaz.
- Genel kavram/işlev/tanım, okuduğunu anlama, mantıkla bulunabilen cevap, güncel rekor/şu anki durum/yaşayan kişinin son durumu ve tartışmalı bilgi yasaktır. Emin olunmayan olgu yazılmaz.
- Yerel Türkiye soruları en çok %10; tarih ve edebiyatta en az %70 global. Her taslakta doğru cevabın bir cümlelik dayanağı olgu zorunludur.
- Yerel TR soruda en:null ve en_neden kullanılır (stil profilinin güncel kararı). Global İngilizce doğal yarışma diliyle yazılır; şıkların sırası ve anlamı TR ile aynıdır. Çevrilemeyen soruda en:null ve açık en_neden kullanılır. Cevabı parantezle ele verme.
- Taslak JSON dizisi: {id,k,yerel,s,d,y:[üç yanlış],z:2|3,en:{s,d,y}|null,en_neden?,olgu}. id parti içinde benzersiz ve değişmezdir.

### Çeşitlilik — codex-02’den itibaren
- Aynı soru kalıbı (ör. X’in evcil hayvanının adı, tabloda figür ne yapıyor/ne giyiyor, oyunun para birimi) parti başına en çok %5. Yeniden ifade etmek yeni kalıp sayılmaz; kalıp olgunun türünü belirtir.
- Teknoloji: video oyunu/maskot en çok %35; gerisi gerçek teknoloji: icatlar ve mucitleri, şirketler ve kurucuları, ürün çıkış yılları, internet tarihi, donanım, yazılım, uzay teknolojisi. Bu açık kullanıcı kararıyla ürün çıkış yılları kullanılabilir.
- Sinema: animasyon en çok %35; gerisi canlı çekim filmler, yönetmenler, oyuncular, ödüller, film müzikleri, Türk sineması.
- Sanat: tablodaki görsel ayrıntı en çok %40; gerisi sanatçı–eser, akım, müze, mimari, heykel, Türk sanatçılar.
- Genel kültür: marka/maskot/çizgi film karakteri en çok %40; gerisi gelenekler, yemekler, icatlar, ünlü yapılar, semboller, günlük hayat bilgisi.
- Her kategoride aynı eser/seri/kişiden en çok 2 soru. Bir seri adı farklı eserlerde de aynı konu kimliğiyle yazılır.
- Taslakta ek alanlar zorunlu: kalip (anlamsal olgu türü), konular (eser/seri/kişi kimlikleri dizisi), alt_tur. Sınırlı alt türler: video_oyunu_maskot, animasyon, tablo_gorsel, marka_maskot_cizgi. Kalan soruların alt türü gerçek içeriği belirtir. Yazar etiketleri içerikle karşılaştırır; etiket sınırı aşmak için değiştirilmez.
- Seçimde oranların tam sayı üst sınırı aşağı yuvarlanır. ozet.json çeşitlilik sayımını ve sınırları taşır; kota/çeşitlilik açığı varsa parti hazır sayılmaz. codex-01 onaylı listesine bu yeni sınırlar geriye dönük uygulanmaz.

## Komutlar ve kapılar
1. node araclar/soru-uretim/codex-kapi.mjs --klasor codex-NN --adet 200 --olc (codex-01 için 50).
2. Kavramları incele; taslakları araclar/soru-uretim/codex-NN/taslaklar.json içine yaz.
3. node araclar/soru-uretim/codex-kapi.mjs --klasor codex-NN --adet 200 --on-denetle: yalnız yerel kapılar ve tekrar taraması, Jev/DB kural çağrısı yok.
4. Aynı komutu --on-denetle olmadan çalıştır; .tmp/codex/<parti>/durum.json kaldığı yerden devam eder. Taslak değişirse içerik özeti değişir ve kapılar yeniden uygulanır. Hizmet hatası geçiş sayılmaz; durur ve başarılı aşamaları korur.

Kapı 1: soru-parti-1000/denetle.mjs kayitDenetle ile biçim, TR/EN şık dengesi ve EN kontrolleri.
Kapı 2: havuz/parti birebir; aynı cevap + kök Jaccard ≥0,3; Jaccard ≥0,6; cevap kökü soru metninde. normalize, kokler, jaccard mevcut modüllerden alınır.
Kapı 3: soru_denetim/kapi.mjs hamKapiSorgusu, soru_kural_isaretleri ağırlık ≥2 yok. Toplu salt okuma.
Kapı 4: aynı modül sikIpucuTesti; soru gizli, doğru şık olasılığı ≤0,75.
Kapı 5: araclar/jev.mjs jevSor/noul, her yanlış şık “bu da doğru olabilir mi?” olasılığı <0,5. Eksik/geçersiz yanıt asla geçmez.
Kapı 6 yok: api-uret.mjs değiştirilmez ve içe aktarılmaz. Claude incelemesi ayrıca beklenir.

## Çıktı ve bekleme
- Kotaya göre geçenlerden sorular.json, ozet.json, okunur-liste.md hazırlanır. Liste başında kategori × zorluk, yerel/global ve elenme sebepleri; sonra her soru TEK satır:
  NN | kategori | z | soru | ✔ doğru | ✗ y1 · y2 · y3 | olgu | EN: soru — doğru (EN yoksa EN: —).
- node araclar/soru-uretim/uret-migration-parti.mjs --parti NN --no TASLAK_NO --klasor codex-NN --ad soru_parti_codex_NN --codex --bekleyen
  yalnız parti içindeki bekleyen.sql'i üretir. Numara taslaktır, ayrılmaz; supabase/migrations/ içine dosya KONMAZ. SQL veritabanına UYGULANMAZ.
- durum.json codex_seri kaydını güncelle. Yalnız parti klasörü, hattın araç dosyaları ve durum.json commit edilir. İlgisiz değişiklikler korunur. Push'tan hemen önce git pull --rebase origin main; ardından git push origin main.
- BURADA DUR: “codex-NN hazır, N soru, Claude incelemesi bekliyor” ve Jev maliyetini bildir. Onay mesajı olmadan migration uygulanmaz.

## Claude incelemesinden sonra — yalnız ayrı onay mesajıyla
- “codex-NN onay: çıkar 3,17,… · düzelt: 5 → …” mesajındaki çıkarılanları sil, düzeltmeleri uygula. Numara okunur-liste.md sırasıdır; eşleştirmeyi koru.
- Onaylı listenin tamamını sabit id ile inceleme-sonrasi.json içine al; düzeltilen kaydın id’si değişmez. node araclar/soru-uretim/codex-kapi.mjs --klasor codex-NN --adet ORİJİNAL_HEDEF --girdi araclar/soru-uretim/codex-NN/inceleme-sonrasi.json --havuzu-yenile --yalniz-kapilar komutu tüm listeyi tekrar tarar; değişen içerik Jev kapılarını da yeniden çalıştırır. Sonuçlar .tmp/codex/<parti>/denetim.json içinde; elenen varsa dur. Bu kip kotadan yeni soru eklemez ve inceleme numaralarını değiştirmez. Geçen onaylı listeyi aynı sırayla sorular.json olarak kaydet. Düzeltilen kayıtlar kapı 1–5'ten yeniden geçer. Havuz yeniden toplu okunur; onaylı soruları yeni üretim kotasıyla yeniden doldurma. Elenen/düzeltilen numaraların izini ozet.json içinde sakla.
- O anda supabase/migrations/ son numarasını bul; +1 ile uret-migration-parti.mjs --codex --onayli komutuyla migration'ı yeniden üret (bu kez --bekleyen kullanılmaz). node araclar/migration-prova.mjs <dosya> → node araclar/migration-uygula.mjs <dosya> → aktif soru sayısının gerçekten arttığını toplu sorguyla doğrula.
- durum.json ve PROGRESS.md kısa kayıt; commit + push. Claude onayı alınmadan hiçbir migration uygulanmaz.

## Sınırlar
- Oyun koduna dokunma; yalnız araclar/soru-uretim/, durum.json, PROGRESS.md ve onaylı migration.
- Canlı Supabase'e ağır yük verme, sorgular toplu; döngüyle yoklama veya canlı test simülasyonu yok.
- Aynı anda en çok dört iş, tarayıcı açma, yeni paket kurma. .env.local ve gizli anahtarlar yazdırılmaz/loglanmaz.
- Kesintide durum dosyasını koru ve aşağıdaki Son durum satırını nerede kalındığıyla güncelle; tamamlanmayan kapılar geçmiş gösterilmez.

Son durum: codex-02 onaylandı; 24/128 çıkarıldı, altı düzeltme kapı 1–5 geçti. Migration 1048 uygulandı; aktif 13028 → 13226 (+198). codex-03 hazırlanacak.
