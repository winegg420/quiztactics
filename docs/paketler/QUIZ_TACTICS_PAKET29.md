# PAKET 29 — Dört hata + ses sisteminin dosya tabanına geçişi

Klasör: `C:\Users\ida\Desktop\quiztactics` (YENİ depo — `winegg420/quiztactics`).
Eski `idagggamecenter` klasörüne DOKUNMA.

Bu pakette **görsel/3B hiçbir iş yok**. Harita, karakter, kozmetik modellerine dokunulmayacak.

## DEĞİŞMEZLER (hepsinde geçerli)
1. `vite.config.js › rollupOptions.input` dört girişli kalacak (`oyun`, `atolye`, `meydan`, `gardrop`).
2. `localStorage` anahtarları değişmeyecek (`bildim_dil`, `bildim_ses`, `bildim_tanitim`, …).
3. Migration'lar append-only — mevcut dosya düzenlenmeyecek, yeni dosya eklenecek.
4. Yeni npm paketi YOK.
5. Her API/RPC çağrısında try-catch.
6. Veri silinmeyecek.

---

# A — Turnuva lobisinde avatarlar eziliyor

## Belirti (canlıda doğrulandı, 18 Eyl)
`/turnuva` → "Lobideki Oyuncular" listesinde avatarlar daire değil; sola doğru sivrilen
damla şeklinde eziliyor ve çerçeve halkası avatarın sağında yay olarak taşıyor.
Aynı avatarlar `/arkadaslar` ve `/siralama` sayfalarında düzgün yuvarlak çıkıyor.

## KÖK SEBEP — ölçüldü, tahmin değil
`bildim/styles/tema.css:5337`:

```css
.app .bd-lobi-oyuncu > span:first-of-type { flex: 1; min-width: 0; }
```

Bu kural **isim span'ini** hedefliyor ama `AvatarCerceve` bileşeni de bir `<span>`
döndürüyor (`<span class="bd-cerceve …">`) ve satırdaki İLK span o.
Yani `flex: 1; min-width: 0` avatarın halkasına uygulanıyor → halka esniyor, avatar eziliyor.

`.bd-cerceve` kuralında `flex: none` var (tema.css:5353) ama özgüllüğü daha düşük
(`0,1,0` karşısında `0,2,2`), o yüzden eziliyor.

## YAPILACAK — minimum değişiklik
`.bd-lobi-oyuncu` satırındaki isim span'ine gerçek bir sınıf ver ve CSS'i ona bağla.

1. `bildim/pages/TournamentPage.jsx` ~satır 518-521: avatarın hemen ardından gelen,
   oyuncu adını taşıyan `<span>`'e `className="bd-lobi-ad"` ekle.
2. `bildim/styles/tema.css:5337`'yi değiştir:
   ```css
   .app .bd-lobi-oyuncu > .bd-lobi-ad { flex: 1; min-width: 0; }
   ```
   (`span:first-of-type` seçicisi tamamen kalkacak.)

## AYNI HATA BAŞKA YERDE VAR MI — KONTROL ET
`tema.css` içinde `> span:first-of-type` ve `> span:first-child` geçen BÜTÜN kuralları tara.
`AvatarCerceve` / `Avatar` kullanan bir satırda aynı desen varsa aynı şekilde düzelt.
Hangi kuralları taradığını ve hangilerinin etkilendiğini rapora yaz.

## KABUL
- `/turnuva` lobisinde avatarlar tam daire, halka avatarın etrafında eşit kalınlıkta.
- `/arkadaslar`, `/siralama`, maç üst şeridi ve profil BOZULMAMIŞ (her birini tek tek kontrol et).
- Uzun oyuncu adları hâlâ satırda taşmadan kısalıyor (`min-width: 0` işlevi korunmalı).

---

# B — Düello rakip arama ekranı ölü

## Belirti
`/duello` → "Rakip ara" → bembeyaz bir katman, ortada küçük bir maskot, altında
"Düello rakibi aranıyor… / 8 sn / Vazgeç". Bekleyen oyuncuya hiçbir şey olmuyor gibi geliyor.
Bu, Ida'nın daha önce de söylediği bir sorun.

## MEVCUT KOD
`bildim/pages/DuelloPage.jsx` ~satır 145-156, `bd-arama-katman` / `bd-arama-kutu` /
`bd-arama-halka`. Saniye sayacı `gecen` değişkeninde zaten var.

## YAPILACAK
Ekranı **yalnız sunum düzeyinde** canlandır. Eşleştirme mantığına, sürelere, RPC'lere DOKUNMA.

1. **Nabız halkası**: maskotun çevresinde dışa doğru genişleyip solan iki halka
   (CSS `@keyframes`, 1,8 sn döngü, ikincisi 0,9 sn gecikmeli). Marka turuncusu `--bd-vurgu`.
2. **Dönen ipucu metni**: 3 saniyede bir değişen kısa satırlar. Metinler `dil.js`'e girecek
   (TR + EN), sabit Türkçe yazma. Öneri:
   - "Rakibinin zayıf kategorisini bul, oradan vur."
   - "Aynı kategoriyi üst üste seçemezsin."
   - "Rakip en zayıf kategorisinde bilirse canı SEN kaybedersin."
   - "Saldırı hazırlığında joker kullanabilirsin."
3. **Saniye sayacı görünür kalsın** ama "12 sn" yerine "12 sn · rakip aranıyor" gibi
   bağlamlı olsun.
4. **15 saniyeyi geçerse** bir satır ekle: "Biraz uzadı — botla eşleştireceğiz."
   (Metin `dil.js`'ten; gerçekten botla eşleşiyorsa doğru bilgi, eşleşmiyorsa bu maddeyi ATLA
   ve raporda neden atladığını yaz.)
5. `@media (prefers-reduced-motion: reduce)` içinde bütün animasyonlar kapanacak.

## KABUL
- Arama ekranında sürekli hareket var; 10 saniye beklemek "donmuş" hissi vermiyor.
- Vazgeç düğmesi ilk andan itibaren basılabilir, davranışı değişmedi.
- Eşleşme süresi ve mantığı ölçülebilir şekilde AYNI (öncesi/sonrası birkaç deneme ölç, rapora yaz).

---

# C — "Çerçevesiz" kutusu yanlış anlaşılıyor

## Durum — bu bir HATA DEĞİL, ifade sorunu
`/profil` → "Lig çerçevelerim" bölümünde beş kutu var: **Çerçevesiz · Gümüş · Altın · Elmas · Efsane**.
Bronz'un çerçevesi kasıtlı olarak yok — `bildim/lib/ligCerceve.js:13`'te açıkça yazılı:
`LIG_CERCEVELERI = ["gumus", "altin", "elmas", "efsane"]` · "Bronz'un çerçevesi yok."

Sorun şu: "Çerçevesiz" bir ödül kutusu gibi duruyor ve Bronz ligdeki oyuncu
"benim çerçevem mi eksik kaldı" diye düşünüyor.

## YAPILACAK — yalnız metin
1. Kutunun etiketi "Çerçevesiz" → **"Çerçeve takma"** (dil.js, TR + EN: "No frame").
2. Bölüm açıklamasına tek cümle ekle: **"Bronz ligin çerçevesi yoktur; ilk çerçeve Gümüş'te açılır."**
   (dil.js, TR + EN.)
3. Kod mantığına, `LIG_CERCEVELERI` dizisine, migration'a DOKUNMA.

## KABUL
- Bronz ligdeki bir hesapta bölüm okunduğunda "eksik bir şey var" hissi kalmıyor.
- TR ve EN'de ikisi de doğru görünüyor.

---

# D — Başlangıç jokerleri mevcut oyunculara hiç verilmedi

## KÖK SEBEP — ölçüldü
`supabase/migrations/20260612000238_joker_ekonomisi_paket27.sql`:
- `baslangic_jokerleri_ver(p_user)` yedi joker türünden `baslangic_joker_adet` (2) adet veriyor.
- Yalnız `handle_new_user()` trigger'ından çağrılıyor → **sadece YENİ hesaplar alıyor.**
- İçinde idempotent koruma var: `joker_envanter`'de o kullanıcının SATIRI varsa hiç vermiyor.

Sonuç: Paket 27'den önce açılmış bütün hesaplar (canlıda ~205 hesap) o 2'şer jokeri almadı.
Canlı testte doğrulandı: hesabımda üç saldırı jokerinin de sayısı 0 ve düelloda
"Saldırı jokerleri" bölümü tamamen kilitli görünüyor.

## KARAR GEREKİYOR — Ida onayladıktan sonra uygula
Ida "oyuna ilk girildiğinde her jokerden ikişer tane verilmiş olsun" dedi. Bu kural
mevcut oyuncular için de geçerli mi? **Ida'ya sor, cevabı almadan migration yazma.**

## Ida "evet" derse — YAPILACAK
Yeni migration dosyası (append-only, mevcut 238'i DÜZENLEME):
`supabase/migrations/2026XXXXXXXXXX_baslangic_jokeri_mevcut_oyuncular.sql`

Kurallar:
1. **Botlara verilmeyecek** (`is_bot = true` olanlar atlanacak) — 238'deki kural aynen korunacak.
2. **Bir kez çalışacak**: dağıtım kaydı `joker_hareketleri` içinde `kaynak = 'baslangic'`
   satırıyla izlenir. Bir kullanıcının `kaynak = 'baslangic'` hareketi zaten VARSA tekrar verilmez.
   (238'deki "envanterde satır varsa verme" kuralını KULLANMA — mevcut oyuncuların
   envanterinde zaten satır var, o kural hepsini atlar. Ayrım noktası `kaynak = 'baslangic'`.)
3. Verilecek türler ve adet 238'deki listeyle birebir aynı:
   `elli, sure, soru_degistir, zaman_baskisi, saldiri_degistir, savunma_kilidi, seri_koruma` × `ayar_sayi('baslangic_joker_adet', 2)`.
4. Dağıtım `joker_hareket()` üzerinden yapılacak — envantere doğrudan INSERT/UPDATE YOK.
5. Migration çalışmadan ÖNCE ve SONRA şu sayıları ölç ve rapora yaz:
   - kaç gerçek (bot olmayan) hesap var
   - kaçının `kaynak='baslangic'` hareketi vardı / oldu
   - toplam kaç joker dağıtıldı
6. `aktif = false` / silinmiş / anonim hesaplar varsa nasıl davrandığını rapora yaz.

## KABUL
- Mevcut bir hesapla düelloya girildiğinde saldırı jokerleri 2'şer görünüyor.
- Migration ikinci kez çalıştırılırsa hiçbir şey dağıtmıyor (idempotent) — bunu test et.
- Yeni hesap açılışı bozulmadı: yeni kayıt hâlâ 2'şer alıyor, çift almıyor.

---

# E — SES SİSTEMİ: osilatör tonundan gerçek ses dosyalarına

## MEVCUT DURUM — ölçüldü
`bildim/lib/ses.js` (179 satır) — oyunda **hiç ses dosyası yok**. Dokuz ses de
WebAudio osilatörüyle anlık üretiliyor: `sesTik`, `sesSureDoldu`, `sesDogru`, `sesYanlis`,
`sesDokunus`, `sesKazandin`, `sesKaybettin`, `sesRutbeAtladi`, `sesJoker`.
Hepsi tek notalı saf dalga (sine/square/triangle/sawtooth). Müzik yok.

`public/sounds/` altındaki .wav'lar DriftGP'ye ait, Quiz Tactics onları kullanmıyor — DOKUNMA.

## GELEN DOSYALAR
Ida `ses.zip` dosyasini acip icindeki `ses` klasorunu oldugu gibi `public/` altina koyacak,
yani son hali `public/ses/` olacak. Klasorde 12 mp3 ve `LISANS.txt` var; hepsi hazir,
yeniden adlandirma veya donusturme GEREKMIYOR.

Dosyalar: `dokunus.mp3 · dogru.mp3 · yanlis.mp3 · tik.mp3 · sure_doldu.mp3 · kazandin.mp3 ·
kaybettin.mp3 · rutbe.mp3 · joker.mp3 · rakip_bulundu.mp3 · can_kaybi.mp3 · geri.mp3`
Toplam ~47 KB.

Kaynak: **Kenney Interface Sounds ve UI Audio paketleri, CC0 lisansli** — kisisel, egitim ve
ticari kullanima acik, atif zorunlu degil. Lisans metni klasorun icinde, repoya birlikte girecek.

Ida dosyalari repoya koyduysa bu bolumden devam et; koymadiysa once ondan iste, kendin ses
uretme ve baska yerden indirme.

## YAPILACAK

### E.1 — `ses.js` dosya çalar hâline gelecek, ARAYÜZ AYNI KALACAK
Bu maddenin tamamı **`bildim/lib/ses.js` dosyasının içinde** kalmalı.
`sesDogru()`, `sesYanlis()` gibi dışa açılan fonksiyon adları ve imzaları DEĞİŞMEYECEK —
bu fonksiyonları çağıran 40'tan fazla yer var, hiçbirine dokunulmayacak.

Kurallar:
1. Sesler **tek seferlik yüklenip önbelleğe alınacak** (`Map<string, AudioBuffer>`),
   `AudioContext.decodeAudioData` ile. Her çalışta yeniden indirme YOK.
2. **Tembel yükleme**: uygulama açılışında hiçbir ses indirilmeyecek. Bir ses ilk kez
   istendiğinde indirilecek. İlk çalma gecikirse o sefer atlanabilir (ses kritik değil).
3. **Osilatör yolu YEDEK olarak KALACAK**: dosya indirilemezse / decode edilemezse
   mevcut ton fonksiyonu çalacak. Mevcut ton kodunu SİLME.
4. `sesAcikMi()`, `sesAyarla()`, `sesKilidiAc()` ve `bildim_ses` localStorage anahtarı
   AYNEN kalacak.
5. iOS/Android kuralı korunacak: `AudioContext` yalnız kullanıcı hareketinden sonra açılıyor
   (`navigator.userActivation` kontrolü dahil).
6. Aynı ses üst üste çok hızlı tetiklenirse (ör. hızlı tıklama) üst üste binmeyi engelle:
   aynı rol için son çalmadan bu yana 40 ms geçmediyse atla.
7. Her ses için `hacim` çarpanı olacak; `dokunus` kısık (0,35), `kazandin`/`rutbe` tam (1,0).
   Değerler dosyanın başında tek bir sabit nesnede toplanacak ki elle ayarlanabilsin.

### E.2 — İKİ YENİ SES BAĞLANACAK
1. `sesRakipBulundu()` — düelloda ve klasik maçta **eşleşme bulunduğu an**.
   Çağrı yeri: arama katmanı kapanıp maç ekranı açıldığında.
2. `sesCanKaybi()` — düelloda **bir can eksildiğinde** (hem kendi canın hem rakibinki,
   ama kendi canın giderken daha yüksek hacimle).

Bu ikisi `ses.js`'e eklenecek, karşılık gelen dosyalar `rakip_bulundu.mp3` ve `can_kaybi.mp3`.
Yeni sesin çalacağı yeri bulurken mevcut oyun mantığına dokunma — sadece çağrı ekle.

### E.3 — PWA / önbellek
`public/sw.js` veya kullanılan servis çalışanı ses dosyalarını önbelleğe alıyorsa,
12 dosya toplam ~170 KB. Önbelleğe eklenmesi uygundur ama **ilk açılışta indirilmeyecek**
(tembel yükleme kuralı korunacak). Servis çalışanının mevcut sürüm/etiket mantığını bozma.

### E.4 — ÖLÇÜM (rapora yazılacak)
- 12 dosyanın toplam boyutu (KB)
- İlk açılışta indirilen ses baytı (0 olmalı)
- Bir maç boyunca indirilen toplam ses baytı
- Ses kapalıyken hiç indirme olmadığının doğrulaması

## KABUL
- Ses açıkken: tıklama, doğru, yanlış, geri sayım, süre doldu, kazandın, kaybettin,
  rütbe, joker, rakip bulundu, can kaybı — hepsi gerçek ses dosyasıyla çalıyor.
- Ses kapalıyken hiçbir şey çalmıyor ve hiçbir dosya indirilmiyor.
- Dosya bulunamazsa oyun çalışmaya devam ediyor, o ses için eski ton çalıyor.
- `sesDogru` gibi fonksiyonları çağıran hiçbir dosya değişmedi (joker/can ekleri hariç).
- Mobilde ilk dokunuştan sonra sesler çalışıyor (iOS Safari'de test et).

---

# TESLİM
1. Her bölüm için ayrı commit; commit mesajında bölüm harfi geçsin (`Paket 29 A: …`).
2. `PROGRESS.md`'ye ölçümleri, kararları ve çıkarımları yaz.
3. Bölüm D için Ida'nın cevabını beklemeden migration YAZMA.
4. Değiştirdiğin CSS seçicilerinin başka ekranları bozmadığını tek tek kontrol et ve
   hangilerini kontrol ettiğini rapora yaz.
5. `npm test` geçmeli.
