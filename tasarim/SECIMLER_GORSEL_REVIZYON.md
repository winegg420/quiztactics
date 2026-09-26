# QUIZ TACTICS — GÖRSEL REVİZYON ENTEGRASYONU (seçimler + iki görev)

Bu dosya iki parçalı: **GÖREV A buluta** (küçük, kredi 21 $), **GÖREV B bilgisayardaki Claude Code'a** (büyük). Aynı dosyanın tamamını ikisine de yapıştır; her biri yalnız kendi görevini yapar.

## Ortak ilk adım (hangisi önce başlarsa o yapar; diğeri `git pull` ile görür)
Bu dosyanın tamamını `tasarim/SECIMLER_GORSEL_REVIZYON.md` olarak depoya ekle (yoksa), commit, push. `tasarim/BRIEF_GORSEL_REVIZYON.md` (stil rehberi, kalite kapısı, boyutlar, hareket kuralları) geçerli ve bağlayıcıdır; önce onu oku. Adaylar `/gorsel-revizyon` sayfasındaki kodda duruyor; seçilenleri oradan al, yeniden çizme (aşağıdaki düzeltmeler hariç).

Her push öncesi `git pull --rebase`; çakışmada diğer tarafın değişikliğini koru. Türkçe kod/yorum/commit. Minimal değişiklik; oyun mantığına dokunma. Oyun yayında değil, gerçek oyuncu yok.

---

## BÖLÜM 1 — IDA'NIN SEÇİMLERİ (25.09.2026) — KESİN

| # | Konu | Seçim |
|---|---|---|
| 0 | Stil rehberi | **Onaylandı** |
| 1 | Coin ikonu | C — Dönen Sikke (yandan) `coin-egik` | — **26.09.2026 GÜNCELLEME (Ida): A — Q Sikke (önden) `coin-q` seçildi, canlı ikon değişti**
| 2 | Elmas ikonu | A — Pırlanta (paket ailesi) `elmas-pirlanta` |
| 3 | Nadirlik kart kenarı | 1 — Köşe etiketi + kalın kenar `nadir-kose` — **renkler değişti:** Sıradan gri · **Nadir YEŞİL** · **Epik KESKİN MOR** · Efsanevi altın |
| 4 | Tek oyuncu kartı | A — Vitrin kartı (dikey) `kart-a` |
| 5 | Unvan görünümü | Stil 1 — Kurdele `kurdele`; sayfadaki 21 unvanlık liste kullanılır |
| 6 | Lig çerçeveleri | Set A — Defne ve Taç (Altın Lig ailesi) `set-a` |
| 7 | Level çerçeveleri | Set A — Altıgen Madalya `set-a` |
| 8 | Turnuva Şampiyonu | A — Kupa Tepesi `kupa-tepesi` |
| 9 | Lig amblemleri | B — Fasetli Yıldız `lig-yildiz` |
| 10 | Rozet sistemi | 1 — Madalyon `rozet-madalyon` |
| 11 | Joker ikonları hizalama | 7 jokerin hepsi GİRSİN |
| 12 | Logo | A — Şeker Q harfli yazı `logo-seker-harf` |
| 13 | Premium çerçeve + arka plan hizalama | 7 çerçeve + 6 arka planın hepsi GİRSİN |

## BÖLÜM 2 — ZORUNLU DÜZELTMELER (bulutun kendi zayıf notları; oyuna alırken giderilecek)
1. **Lig Set A:** tek renkte Bronz ile Gümüş birbirine yakın → Bronz'a (ya da Gümüş'e) ayırt edici bir SİLUET süsü ekle; 40 px'te kademe renkten bağımsız okunmalı.
2. **Level Set A:** 48 px ve altında Lv25/50/75'in dış hatları aynı → her kademeye ayrı siluet (ör. köşe sayısı/süs); Lv100'ün 40 px'te 2 px taşması düzelsin.
3. **Turnuva Kupa Tepesi:** 40 px'te kupa küçük → büyüt, okunur olsun.
4. **Oyuncu kartı:** vitrindeki rozetler yeni Madalyon rozetleri olacak.
5. **Coin C (yandan):** 16 px'te ince çizgiye dönmesin; gerekirse küçük boylar için eğim azaltılmış bir varyant kullan (aynı çizim ailesi).
6. **Nadirlik:** yeni renklerle renksiz (gri ton) testte dört kademe ayrışmalı.
Her düzeltmeyi `tasarim/BRIEF_GORSEL_REVIZYON.md` A10 kalite kapısıyla doğrula.

---

## GÖREV A — BULUT (Model: **Sonnet 5**, TEK ajan, kredi sınırlı)

**Kapsam (yalnız bunlar):**
1. **Coin ve elmas ikonu** (seçim 1, 2 + düzeltme 5): oyundaki bütün coin/elmas gösterimleri tek bileşenden yeni ikonları kullansın (üst çubuk, dükkân fiyatları, ödüller, maç sonu, satın alma penceresi, elmas eksik mesajı). Eski iki farklı çizim kalksın.
2. **Logo** (seçim 12): giriş ekranı, üst çubuk ve logo geçen her yer.
3. **Joker ikonları** (seçim 11): 7 jokerin hizalanmış hâli; maçtaki joker çubuğu, Hazır mısın? ekranı, dükkân.
4. **Nadirlik kart kenarı** (seçim 3, yeni renklerle + düzeltme 6): dükkân, koleksiyon, satın alma penceresi, maç sonu ödül kartı. Nadirlik bilgisi kalemin mevcut alanından gelsin; yoksa GÖREV B'ye not bırak, uydurma.

**Kredi kuralları (yarıda kalmasın):**
- Sıra: 1 → 2 → 3 → 4. **Her madde bitince HEMEN commit + push** ve PROGRESS.md'ye "Görsel entegrasyon A — biten/kalan" satırı.
- Ekran görüntüsünü yalnız her maddenin sonunda 390 px'te bir kez al.
- Kapsam dışına çıkma; çerçeve, rozet, oyuncu kartı, unvan, premium hizalama GÖREV B'nin. Bunlara ait dosyalara (`cerceve.js`, çerçeve/rozet/kart bileşenleri) dokunma.
- Kredi biterse kalan maddeler PROGRESS'te yazılı olsun; GÖREV B tamamlar.

**Teslim:** madde → commit → telefonda bakılacak tek şey.

---

## GÖREV B — BİLGİSAYAR (Model: **Opus 5.5**)

Önce `git pull`. GÖREV A bulutta çalışıyor olabilir; onun dosyalarına (coin/elmas bileşeni, logo, joker ikonları, nadirlik kenarı) dokunma. PROGRESS'te A'dan kalan madde varsa en sonda onları da tamamla.

**Kapsam:**
1. **Lig çerçeveleri** (seçim 6 + düzeltme 1): 5 lig, hareket kuralları brief A8'e göre; mevcut lig çerçevesi gösterimlerinin hepsi yenisini kullansın. Onaylı WebGL Altın Lig bu setin Altın'ı.
2. **Level çerçeveleri** (seçim 7 + düzeltme 2).
3. **Turnuva Şampiyonu çerçevesi** (seçim 8 + düzeltme 3).
4. **Lig amblemleri** (seçim 9): isim yanında her yerde.
5. **Premium çerçeve + arka plan hizalaması** (seçim 13): 7 çerçeve + 6 arka planın hizalanmış hâlleri oyundakilerin yerine; kimlikler (id) ve sahiplikler değişmez.
6. **Rozet sistemi** (seçim 10): Madalyon stiliyle ~15 temel amblem + seviye süsü kuralı; mevcut **bütün rozetler** bu sistemle yeniden üretilsin (rozet id'leri ve kazanım kuralları DEĞİŞMEZ, yalnız görsel). Birbirine benzeyen/soluk rozet kalmasın; A10 kalite kapısı.
7. **Unvan sistemi** (seçim 5): veri modeli (unvan tanımları, oyuncunun kazandığı unvanlar, takılı unvan), 21 unvanlık listeden kazanım kuralı net olanları bağla (belirsiz olanı rapora yaz, uydurma), profilden unvan seçme, **Kurdele** görünümü. **Şehir Şampiyonu** unvanı `oyuncu_kartlari.sehir_sampiyonu` alanından otomatik gelsin (haftalık, geçici); şampiyonluk bildirim ayarını aç.
8. **Tek oyuncu kartı** (seçim 4 + düzeltme 4): avatar + çerçeve + arka plan + isim (altın isim dahil) + unvan + 3 vitrin rozeti + lig amblemi + level bir arada; profil kartı, VS/rakip bulundu, maç şeridi (küçük hâli), lig tablosu satırı (küçük hâli) aynı kaynaktan. Uzun isim/"Afyonkarahisar Şampiyonu" 360 px'te taşmasın. Merkezi veri `oyuncu_kartlari` + `cerceve.js`; N+1 istek yok.
9. **Stil rehberi sayfası:** `/gorsel-revizyon` 0. bölümünü kalıcı, menüde görünmeyen `/stil-rehberi` sayfası yap (kurallar + palet + örnekler).
10. **Temizlik:** yeni sistemle değişen eski çerçeve/rozet/amblem görselleri kullanılmıyorsa kaldır (id'ler veritabanında korunur). `/gorsel-revizyon` önizleme sayfası kalsın.

**Kurallar:** migration gerekiyorsa önce deneme modunda, sonra canlıya. Her büyük madde ayrı commit + push. Brief A10 kalite kapısı + 390/360 px + "hareketi azalt" + mobilde hareket kontrolü. `npm run build` temiz; ana paket boyutu önce/sonra. Jev iş akışını kullan.

**Teslim (kısa, Türkçe):** madde → ne yapıldı → commit · migration durumu · unvan listesinde kazanım kuralı belirsiz kalanlar · telefonda bakılacaklar.
