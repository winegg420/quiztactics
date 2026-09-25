QUIZ TACTICS — ŞEHİR ŞAMPİYONU (ARKA PLAN): TASARIM BELGESİ + GÖREV (PC)
Depo: winegg420/quiztactics. Türkçe kod/yorum/commit. Minimal değişiklik; mevcut çalışan akışları (Klasik, Düello, Grup, lig, haftalık kapanış, bot gizliliği, rozet motoru, oyuncu kartı) bozma. Supabase çağrılarında try-catch.
İLK ADIM
Bu dosyayı değiştirmeden `tasarim/BRIEF_SEHIR_SAMPIYONU.md` olarak depoya ekle ve commit et. Sonra `git pull --rebase`, PROJECT_CONTEXT.md, PROGRESS.md (son 15 girdi), AGENTS.md ve `docs/SOZLESME_ROZET_CERCEVE.md`'yi oku. Jev iş akışını kullan (dosya seçimi, hata ayıklama, commit öncesi kontrol).
Paralel çalışma
Bulut şu an yalnız `/gorsel-revizyon` önizleme sayfasını hazırlıyor (yeni dosyalar, oyuna dokunmuyor). Çakışma beklenmiyor; yine de her push öncesi `git pull --rebase`, çakışmada bulutun değişikliğini koru.
---
BÖLÜM A — TASARIM BELGESİ
A1. Ürün
Şehir Şampiyonu (EN: City Champion / görünür cümlede "Champion of {city}"). "Belediye Başkanı", "Mayor", "Muhtar" kullanılmaz.
Bir önceki tamamlanmış haftayı kendi şehrinde 1. bitiren oyuncu, sonraki hafta boyunca o şehrin Şehir Şampiyonu unvanını taşır. Örnek: 1–7 Eylül'ü Balıkesir'de 1. bitiren, 8–14 Eylül boyunca "Balıkesir Şampiyonu" olarak görünür. Sonraki kapanışta unvan kendiliğinden yeni şampiyona geçer.
Amaç: yerel gurur, sosyal statü ve pazarlama ("Şehrinin şampiyonu ol", "Bu hafta Balıkesir'in #1'i kim?"). Pay-to-win değil.
A2. Ödül
Bir hafta süren görünür Şehir Şampiyonu unvanı (geçici).
Bir kez kazanılan kalıcı "Şehir Şampiyonu" rozeti (`lig_sehir_sampiyonu`, grup `lig`, kademe `altin`, ikon mevcut sembollerden uygunsa `crown`, `olcut = 'olay'`, coin 0).
Ekstra coin, elmas, skill, puan, maç avantajı YOK. Mevcut çerçeve/arka plan/isim efekti değiştirilmez; otomatik çerçeve takılmaz.
Rozet metinleri — TR: "Şehir Şampiyonu" / "Bir haftayı şehrinde 1. bitir" · EN: "City Champion" / "Finish a week ranked #1 in your city".
A3. Mevcut altyapı (sıfırdan şehir ligi KURMA — önce güncel tanımları kontrol et)
`profiles.ulke`, `profiles.sehir`, `profiles.puan_hafta`, `lig_siralama('sehir','hafta')`, `sehir_lig_sirasi()`, `lig_arsiv` (user_id, hafta, puan, sehir, ulke, sira_sehir, sira_ulke, sira_global), `haftalik_kapanis()`, `haftayi_kapat(p_hafta)`, `lig_haftayi_kapat(p_hafta)`, `profil_konum_kaydet(p_ulke, p_sehir)`, `oyuncu_kartlari(uuid[])` + `oyun/lib/cerceve.js`, `LeaderboardPage.jsx`. Eski badge sistemi: `badges.id = 'sehir_krali'` ve `haftayi_kapat()` içinde `award_badge(user,'sehir_krali')`. Güncel rozet sistemi: `rozet_tanimlari`, `oyuncu_rozetleri`, `rozet_ver`, `rozetlerim`, `rozet_vitrini_sec`.
Güncel canlı fonksiyon gövdelerini oku; eski migration gövdesini körlemesine kopyalayıp sonradan gelen düzeltmeleri geri alma.
A4. Ida'nın kararları (ChatGPT'nin ilk taslağından farkları dahil)
Gizli botlar ele verilmeyecek. Gizli botlar şehir sıralamasında görünüyor; bu yüzden şampiyon her zaman şehir listesinde görünen 1. kişiyle aynı olmalı. Gerekiyorsa gizli bot da şampiyon olur (oyunun başında botlara ihtiyaç var). ChatGPT'nin "botlar asla şampiyon olamaz" kuralı GEÇERSİZ. Açık botlar (adında "bot" geçen) şehir sıralamasında yoksa öyle kalsın; varsa raporla. İstemciye `is_bot` bilgisi asla sızmasın.
Tek şampiyon: aynı puanda tek kişi. Sıralama: `puan_hafta DESC → puan DESC → gorunen_ad ASC → id ASC`, `row_number()`. Canlı lig ekranının şehir sıralaması da birebir aynı sırayı kullanmalı (yoksa listede 1. görünen ile şampiyon farklı çıkar ve gizli bot ele verilir). Ülke/global arşiv sıralarına gereksiz anlam değişikliği yapma.
Asgari şart: Bir şehirde o hafta en az 3 oyuncu (botlar dahil, `puan_hafta > 0`) olmalı ve 1. sıradaki oyuncu o hafta en az 1 maç kazanmış olmalı. Şart sağlanmazsa o hafta o şehirde şampiyon yok (arşiv sırası yine yazılır, yalnız şampiyonluk/rozet/unvan verilmez). Haftalık galibiyet sayısını mevcut maç verisinden hesapla; hazır alan yoksa en ucuz doğru yolu seç ve raporla. Botların galibiyetleri de sayılır.
Şehir listeden seçilir, serbest metin değil.
Türkiye: 81 il (resmi adlarıyla, Türkçe karakterli).
Diğer ülkeler: açık lisanslı bir şehir veri seti (ör. GeoNames, nüfusu 100.000+ şehirler; lisans gereği atıf Hakkında/Lisanslar sayfasına). Kullanacağın kaynağı ve lisansını raporla.
Liste veritabanında tablo olsun (koda gömülmesin).
Mevcut serbest kayıtları normalleştir (büyük/küçük harf, Türkçe karakter, boşluk, yaygın yazım farkları) ve listeye eşle; eşleşmeyenleri şehirsiz bırak ve raporla. Oyun yayında değil, gerçek oyuncu yok; test verisi serbestçe düzeltilebilir.
Gizli botların şehirleri de geçerli listeden olsun; bugünkü dağılımı raporla (hangi şehirde kaç bot). Bot dağılımını gerçekçi tut (büyük şehirlerde daha çok).
Şehirsiz oyuncu: şehir seçmeden maç yapabilir. Şehir seçtiği an o şehre dahil olur; o haftaki puanı o şehrin sıralamasına sayılır. İlk şehir seçimi haftalık kilide takılmaz.
Şehir değiştirme kilidi: mevcut validasyonları ve 24 saat kuralını KORU. Ek olarak şehri olan oyuncu `puan_hafta > 0` ise yeni hafta başlayana kadar şehir/ülke değiştiremez. Mesaj — TR: "Bu hafta puan kazandığın için şehrini yeni hafta başlayana kadar değiştiremezsin." EN: "You have already earned points this week. You can change your city when the new week begins." Aynı konumu tekrar göndermek hatasız dönsün. Yeni tablo/bekleyen-şehir sistemi kurma.
Aktif unvanın kaynağı `lig_arsiv`: profile kalıcı boolean yazılmaz. Aktif şampiyon = `hafta = public.hafta_basi() - 7` ve şampiyon işaretli satır. Böylece unvan kendiliğinden biter; oyuncu sonradan şehir değiştirse bile kazandığı şehir arşivden doğru gelir. Asgari şart (madde 3) nedeniyle `sira_sehir = 1` tek başına yetmez; şampiyonluğu ayrıca işaretle (ör. `lig_arsiv.sehir_sampiyonu boolean` ya da eşdeğeri) ve bunu tek doğru kaynak yap.
Görünüm bu pakette YOK. Unvan, oyuncu kartı, VS, profil ve Lig → Şehir kartı gibi görünüm işleri Görsel Paket 2'de, yeni tek oyuncu kartı ve unvan sistemi ile birlikte yapılacak (Şehir Şampiyonu, unvan sisteminin ilk unvanı olacak). Ayrı bir `SehirSampiyonuUnvani.jsx` bileşeni YAZMA. Bu pakette yalnız veri ve sunucu tarafı; istemci tarafında yalnız konum seçme ekranının listeye geçmesi ve kilit mesajı.
A5. Kapsam dışı
Şehir sohbeti, klan, şehir savaşı, yeni mod, yeni para birimi, satın alma, skill, oyun bonusu, yeni npm paketi, harita/3B meydan.
---
BÖLÜM B — GÖREV (yalnız arka plan)
Şehir listesi: tablo + veri + normalleştirme/eşleme migration'ı + rapor (A4.4). Konum seçme ekranı (profil/ayarlar ve varsa ilk açılış) serbest metin yerine aranabilir liste; TR/EN. Kilit açıklaması gerçek kurallarla uyumlu (A4.5–6).
`profil_konum_kaydet`: A4.5 ve A4.6 kuralları sunucuda.
Haftalık kapanış: güncel `haftayi_kapat` / `lig_haftayi_kapat` gövdesini oku; şehir sırası A4.2 sıralamasıyla `row_number()`; A4.3 asgari şartına göre şampiyonu işaretle; şampiyona `rozet_ver(user_id,'lig_sehir_sampiyonu', …)` (coin yok, ikinci kez verilmez). Canlı şehir sıralaması (`lig_siralama`/`sehir_lig_sirasi`) aynı sırayı kullansın.
Eski `sehir_krali`: `award_badge` ve eski badge kullanım yerlerini tara. Çift ödül/çift bildirim yaratıyorsa kullanıcıya görünen tek kaynak yeni rozet olsun; eski tarihsel kayıtları SİLME. Ne yaptığını açıkça yaz.
Geriye dönük rozet: `lig_arsiv` geçmişinde şehir 1. olmuş oyunculara (A4.3 şartı geçmiş haftalar için hesaplanabiliyorsa uygula, hesaplanamıyorsa `sira_sehir = 1` yeterli; hangisini yaptığını yaz) `rozet_ver(..., p_coin=false, p_geriye=true)`: coin yok, popup yok, görülmüş sayılır.
Veri alanları (görünüm için hazırlık):
`oyuncu_kartlari(uuid[])` dönüşüne `sehir_sampiyonu jsonb` (null ya da `{"sehir","ulke","hafta"}`), toplu okumada N+1 yok; gerekirse `lig_arsiv` indeksi. `cerceve.js` sözleşme yorumu ve `docs/SOZLESME_ROZET_CERCEVE.md` güncellensin; mevcut kullananlar kırılmasın.
`sehir_sampiyonu()` RPC: çağıranın şehri için geçen haftanın şampiyonu (user_id, sehir, ulke, hafta, puan) ya da null. Şampiyonun bot olup olmadığını döndürme.
Bildirim: mevcut haftalık sonuç bildirimini bozma. Temiz yoldan yapılabiliyorsa şampiyona anahtarlı çeviriyle TR: "🏆 Balıkesir Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek." EN: "🏆 You are the Champion of Balıkesir! Your title will appear on your profile and in matches this week." SQL'e düz Türkçe metin gömme; push/Edge Function'a gerekmedikçe dokunma. Görünüm Paket 2'de geleceği için metin "görünecek" dese de sorun değil; istersen görünüm gelene kadar bildirimi kapalı bayrakla bırak ve raporla.
Testler (transaction + rollback ile hedefli prova, bir kez düzgün; ağır `npm test`'i art arda çalıştırma)
Aynı şehirde iki insan, farklı haftalık puan → yüksek puanlı şampiyon.
Eşit haftalık puan → toplam puan, sonra ad, sonra id ile tek şampiyon; canlı şehir listesinin 1.'siyle aynı kişi.
Gizli bot şehirde 1. ise şampiyon odur ve listede 1. görünenle aynıdır; istemciye bot bilgisi sızmaz.
Şehirde 2 oyuncu → şampiyon yok. 3 oyuncu ama 1.'nin o hafta galibiyeti yok → şampiyon yok.
Konum: şehirsiz oyuncu puan kazandıktan sonra ilk şehrini seçebilir ve puanı o şehre sayılır; şehri olan `puan_hafta > 0` oyuncu değiştiremez; `puan_hafta = 0` ise 24 saat kuralıyla değiştirebilir; aynı konum hatasız döner.
Süre: geçen haftanın şampiyonu bu hafta aktif; iki hafta önceki (geçen hafta kazanmamışsa) aktif değil.
Rozet: ilk şampiyonlukta gelir; ikincide tekrar/coin yok; geriye dönük verme coin ve popup üretmez.
`lig_arsiv` eski verisi kaybolmaz; eski şehir kayıtlarının eşlenmesi raporlanır.
Konum seçme ekranı 390 ve 360 px'te, TR ve EN; `npm run build` temiz.
Migration
Yeni numaralı dosyalar; önce deneme modunda, sonra canlıya uygula.
Kapanış
PROJECT_CONTEXT.md ve PROGRESS.md'yi güncelle, commit, push. Kısa Türkçe rapor:
Yapılanlar · 2. Değişen dosyalar/RPC'ler · 3. Migration ve canlı durumu · 4. Test sonuçları · 5. `sehir_krali` ↔ `lig_sehir_sampiyonu` son hâli · 6. Şehir listesi kaynağı/lisansı ve eşlenemeyen kayıtlar · 7. Bot şehir dağılımı · 8. Commit SHA · 9. Açık kalan gerçek sorun.
