# QUIZ TACTICS — PAKET 39: KALİTE DENETİMİ (YALNIZ RAPOR)

## BU PAKET KOD DEĞİŞTİRMEZ

**Hiçbir şeyi düzeltme.** Ne JSX, ne CSS, ne SQL, ne migration. Tek çıktın bir
rapor dosyası ve ekran görüntüleri. Bulduğun hatayı düzeltme isteği gelirse bile
düzeltme — sadece raporla. Düzeltmeler ayrı pakette, bu raporla birleştirilerek yapılacak.

Tek istisna: raporu ve ekran görüntülerini depoya yazman.

## ROLÜN

**Profesyonel bir oyun tasarımcısı gibi davran.** Yayına çıkmak üzere olan bir mobil
oyunu teslim almışsın ve sahibine "bu oyun hazır mı" diye rapor vereceksin.

Kendine sorman gereken soru **"kod çalışıyor mu" değil**, şunlar:
- Bir oyuncu bu ekranı ilk kez görse ne yapacağını anlar mı?
- Bu ekran para verilip indirilen bir oyuna mı benziyor, yoksa bitmemiş bir web sayfasına mı?
- Burada olması gereken ama olmayan ne var?
- Bir şey ters giderse oyuncu ne görür?

**Eksik olanı bulmak asıl iştir.** Ekranda duran şeyin çirkin olması kolay fark edilir;
olması gerekip hiç olmayan şey (ses kapatma, boş durum metni, hata mesajı, geri düğmesi)
ancak aranırsa bulunur. Aşağıdaki D bölümü bunun için var.

## KAPSAM DIŞI — HİÇ BAKMA

- **Gardırop** (3B kozmetik giydirme ekranı)
- **Meydan** (açık dünya harita / 3B şehir)

İkisi de donduruldu. Bu iki ekrana girme, ekran görüntüsü alma, rapora yazma.
Başka ekranlardan bu ikisine giden düğmeler kapsamda (düğme duruyor mu, doğru yere
gidiyor mu) ama hedef ekranın içine girme.

---

## A — NASIL TEST EDECEKSİN

Playwright + Chromium, sahte Supabase yanıtlarıyla (Paket 36-38'de kullandığın düzenin
aynısı). **Canlı veritabanına hiçbir şey yazma.**

Her ekranı **dört kombinasyonda** aç ve ekran görüntüsü al:

| | Açık tema | Koyu tema |
|---|---|---|
| **390 × 844** (telefon) | ✔ | ✔ |
| **1280 × 800** (masaüstü) | ✔ | ✔ |

**Telefon genişliği önceliklidir.** Bu bir telefon oyunu; 390px'te bozuk olan şey
hatadır, 1280'de bozuk olan şey eksikliktir.

Görüntüleri `denetim/goruntuler/<ekran>-<durum>-<genislik>-<tema>.png` olarak kaydet.

---

## B — DENETLENECEK EKRANLAR

Sırayla git. **Her ekranı bitirince raporu dosyaya yaz ve push et** — hepsini sona
biriktirme, yarıda kalırsa emek kaybolmasın.

1. **Giriş** (`/giris`) — TR/EN değiştirici, üç giriş yolu, misafir, gizlilik/koşullar bağlantıları
2. **Ana Sayfa** — hero, rütbe çubuğu, günlük seri, kategori satırı, Dereceli anahtarı,
   Hemen oyna, turnuva şeridi, mod kartları, bildirim izni kartı, yarım maç uyarısı
3. **Mod seçim penceresi** (Hemen oyna'ya basınca)
4. **Rakip arama** — arama sırasında, bot teklifi, vazgeçme
5. **Maç hazırlık** ("Hazır mısın?") — bekleme, rakip hazır, geri sayım
6. **Maç ekranı (Klasik)** — bu ekran en önemlisi, aşağıdaki C bölümündeki durumların
   hepsini tek tek aç
7. **Maç sonu (Klasik)** — kazandı / kaybetti / berabere, Detay kapalı ve açık
8. **Saf Bilgi** — maç ve sonuç (jokersiz olduğu belli oluyor mu)
9. **Düello** — rakip arama, kategori seçme, saldırı hazırlığı, savunma, joker kullanımı,
   tur geçişi, rövanş penceresi, sonuç ekranı
10. **Grup maçı** — lobi, maç, sonuç, sohbet çubuğu
11. **Hızlı Mod** — dondurulmuş ama rota duruyor; ne gösteriyor, kırık mı
12. **Turnuva** — lobi (katılım öncesi), bekleme, maç, altın soru, sonuç, şampiyon kartı
13. **Meydan okumalar** (`ChallengesPage`) — gelen, gönderilen, boş, geri çekme
14. **Arkadaşlar** — dolu liste, boş liste, gelen istek, davet kodu, arkadaş çıkarma onayı
15. **Mesajlar** — boş liste, dolu liste, sohbet ekranı, emoji seçici, uzun mesaj
16. **Profil kartı** (herhangi bir kullanıcıya dokununca)
17. **Lig** — beş sekme (Ligim/Şehir/Ülke/Dünya/Arkadaş), boş durum, yükselme/düşme çizgisi
18. **Dükkân** — Görünüm / Joker / Coin sekmeleri (Görünüm'deki kartlar kapsamda,
    Gardırop ekranına GİRME)
19. **Profil** — İstatistiklerim / Ayarlar / Rozetler / Davet sekmeleri
20. **Çalışma (Hatalarım)** — seçim ekranı, çalışma turu, tur sonucu, banka boşken
21. **Bildirim zili** — boş, dolu, okunmuş/okunmamış karışık, çok uzun liste
22. **Gizlilik** ve **Kullanım koşulları** sayfaları
23. **Bilinmeyen rota** (ör. `/asdasd`) — 404 var mı, ne gösteriyor

---

## C — HER EKRANDA AÇACAĞIN DURUMLAR

Bir ekranın yalnız "her şey yolunda" hâline bakmak yetmez. Uygulanabilir olan her durumu aç:

- **Boş** — hiç veri yok (boş arkadaş listesi, boş mesaj kutusu, boş bildirim, boş banka)
- **Dolu** — normal veri
- **Taşkın** — çok uzun isim (16 karakter), çok uzun soru metni, çok uzun şık,
  20+ satırlık liste, 4 haneli sayı (9.999 puan, 10.050 coin)
- **Yükleniyor** — veri gelmeden önce ne görünüyor (boş mu, iskelet mi, dönen mi)
- **Hata** — RPC hata dönerse oyuncu ne görüyor, tekrar deneme yolu var mı
- **Kilitli / yetersiz** — coin yetmiyor, joker kalmadı, hak doldu, rozet kilitli
- **Maç ekranında ayrıca:** soru başı, süre yarılanmış, **son 5 saniye**, cevap verdikten
  sonra doğru, cevap verdikten sonra yanlış, süre doldu, joker kullanıldığı an,
  joker satın alma penceresi, rakip joker kullandığında

---

## D — "OLMASI GEREKEN AMA YOK" KONTROL LİSTESİ

Bu bölüm denetimin en önemli kısmı. Her ekran için aşağıdakileri **tek tek sor**,
cevabı "yok" olanı rapora yaz:

**Oyun standardı**
- Sesi kapatma yolu var mı (herhangi bir ekrandan ulaşılabiliyor mu)
- Dili değiştirme yolu var mı (giriş yaptıktan sonra)
- Çıkış yapma yolu bulunabiliyor mu
- Ayarlara ulaşmak kaç dokunuş sürüyor
- Geri dönme yolu var mı (her alt ekranda)
- Oyuncu "şimdi ne yapmalıyım" sorusunu ekrana bakarak cevaplayabiliyor mu

**Boş ve hata durumları**
- Boş listede açıklayıcı metin VE bir eylem düğmesi var mı ("Henüz arkadaşın yok" + "Davet et")
- Hata durumunda okunur bir mesaj var mı, yoksa sessizce boş mu kalıyor
- Yüklenirken bir gösterge var mı

**Telefon kullanılabilirliği (390px)**
- Yatay kaydırma var mı (olmamalı)
- Dokunma hedefleri en az 44×44px mi
- Klavye açılınca yazdığın alan görünür kalıyor mu
- Metin taşıyor/kırpılıyor mu
- Alt sekme çubuğu içeriği örtüyor mu

**Tutarlılık**
- Aynı işi yapan düğmeler her ekranda aynı mı görünüyor
- Başlıklar, ikonlar, boşluklar tutarlı mı
- Birincil eylem her ekranda tek ve belirgin mi
- Çevrilmemiş sabit Türkçe metin var mı (`tt()` içinden geçmeyen)

**Erişilebilirlik**
- Yazı/zemin kontrastı AA (≥4.5:1) geçiyor mu — geçmeyenleri ölç ve oranını yaz
- `prefers-reduced-motion` açıkken rahatsız eden animasyon kalıyor mu

---

## E — RAPOR BİÇİMİ

Tek dosya: **`DENETIM_RAPORU.md`** (depo kökü).

Her ekran için bir bölüm:

```markdown
## 6. Maç ekranı (Klasik)
Görüntüler: denetim/goruntuler/mac-normal-390-acik.png · mac-son5sn-390-acik.png · …

### 🔴 Hata
- [Ne olduğu tek cümle.] Nerede: `dosya.jsx:satır` / `tema.css:satır`.
  Oyuncuya etkisi: [somut]. Kanıt: [ölçüm ya da ekran görüntüsü adı].

### 🟡 Eksik
- …

### 🔵 Kozmetik
- …

### ✅ İyi olan
- …
```

**Önem dereceleri:**
- 🔴 **Hata** — bozuk, yanlış çalışıyor, ekranı engelliyor, veri kaybettiriyor
- 🟡 **Eksik** — çalışıyor ama olması gereken bir şey yok (boş durum metni, ses düğmesi,
  hata mesajı, geri yolu)
- 🔵 **Kozmetik** — çalışıyor ve tam, ama profesyonel durmuyor (hizalama, boşluk, renk,
  tipografi, animasyon, ikon tutarsızlığı)

**Kurallar:**
- Her madde **tek cümlede ne olduğunu** söylesin; roman yazma.
- Yerini yaz (`dosya:satır`) — bulamadıysan "yer bulunamadı" yaz, uydurma.
- "Oyuncuya etkisi" yaz — neden önemli olduğu anlaşılsın.
- Ölçülebilen her şeyi **ölç** (kontrast oranı, piksel, saniye). Tahmin yazma.
- **"İyi olan" bölümünü de doldur** — neyin dokunulmaması gerektiği de bilgidir.
- Emin olamadığın şeyi "şüpheli" diye ayrı yaz, hata diye yazma.

Raporun en sonuna **özet tablo**: ekran başına 🔴/🟡/🔵 sayısı, ve
**"yayına çıkmadan mutlaka düzelmeli"** dediğin maddelerin listesi.

---

## F — DEĞİŞMEZLER

- Kod değiştirme, migration açma, canlı veriye yazma.
- Gardırop ve Meydan ekranlarına girme.
- Bulduğun bir şeyi "küçük" diye atlamayın — kozmetik de raporlanacak.
- Ekran görüntüsü alamadığın ekran olursa sebebini yaz, atlama.
- Her ekrandan sonra commit + push.

## RAPOR SONU

Dosyanın sonunda ayrıca şunları yaz:
1. Hangi ekranlara girebildin, hangilerine giremedin ve neden.
2. Hangi durumları (C bölümü) kuramadın.
3. Denetim sırasında fark ettiğin ama hangi başlığa koyacağını bilemediğin şeyler.
