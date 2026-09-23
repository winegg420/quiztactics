# public/ses — kullanım tarifi (Şerit M için)

Motor: `oyun/lib/ses.js`. Bütün fonksiyonlar **hata atmaz**, ses kapalıyken hiçbir şey
indirmez/çalmaz, dosya yoksa eski osilatör tonuna düşer. Kaynak ve lisans: `LISANS.txt`.

## Genel kurallar

- Uygulama girişinde bir kez `sesKilidiAc()` (zaten çağrılıyor). iOS/Android'de ilk
  dokunuştan önce ses çalmaz — bu bilerek.
- Ekran açılırken **ön yükle**: `useEffect(() => { sesOnYukle("mac"); sesOnYukle("skill"); }, [])`.
  Gruplar: `mac` · `skill` · `sonuc` · `duello` · `turnuva` · `hepsi`, ya da rol dizisi.
  Ön yüklenmemiş bir ses ilk çağrıda 250 ms içinde hazır olmazsa O SEFER çalmaz.
- Aynı ses 40 ms'den sık çalmaz; bir sesin aynı anda en fazla 2 kopyası (sonuç jingle'ları,
  soru geldi, tur geçişi: 1) çalar. React StrictMode çift efekti bu yüzden çift ses vermez,
  ama yine de sesi bir **ref korumasıyla** (ör. `sonTikRef`) bir kez tetikle.
- Görselle eşzamanlama: sesi animasyonun **başladığı** karede çağır (setState ile aynı
  işleyicide), `setTimeout` ile geciktirme. Geçiş sesleri kısa (≤0.4 sn) olduğu için
  animasyonun 200–400 ms'lik giriş eğrisine oturur.

## /ses-secim anları → fonksiyon (Ajan H, 23 Eyl 2026)

Ida'nın `/ses-secim` seçimleri sunucudan okunur (`ses_secimleri_oyun()`, sürümlü yerel
önbellek) ve aşağıdaki fonksiyonlar seçilen dosyayı çalar. "Mevcut" → aşağıdaki eski
tablodaki dosya; "Sessiz kalsın" → çalmaz; dosya bozuksa osilatör yedeği. Çağıran kod
hiçbir şey bilmez — yalnız fonksiyonu çağırır.

| An (`/ses-secim`) | Fonksiyon |
|---|---|
| dokunus | `sesDokunus()` |
| sayfa_gecis | `sesSayfaGecis()` — alt menüden sekme değişince |
| rakip_bulundu | `sesRakipBulundu()` |
| vs_ani | `sesVsAni()` — VS kartının geldiği kare |
| soru_geldi | `sesSoruGeldi()` (müziği kısar) |
| geri_sayim_tik | `sesTik(kalanSn)` kalan 5–4 (aday seçilmişse 3–1 son_3_saniye çalar) |
| son_3_saniye | `sesTik(3..1)` + `sesKategoriGeriSayim(3..1)` |
| sure_doldu | `sesSureDoldu()` (müziği açar) |
| dogru / yanlis | `sesDogru()` / `sesYanlis()` (müziği açar) |
| skill | `sesSkill(tur)` / `sesJoker()` — aday seçilmişse bütün skill'ler bunu çalar |
| can_kaybi | `sesCanKaybi(kendi)` |
| kategori_secildi | `sesKategoriSecildi()` |
| tur_gecis | `sesTurGecis()` |
| rakip_cevapladi | `sesRakipCevapladi()` — soru başına bir kez |
| galibiyet / maglubiyet / beraberlik | `sesKazandin()` / `sesKaybettin()` / `sesBeraberlik()` |
| coin | `sesCoin()` |
| satin_alma | `sesSatinAlma()` |
| xp_dolma | `sesXpDolma()` — XP çubuğu dolmaya başlarken bir kez |
| level | `sesLevel()` |
| rozet | `sesRozet()` |
| lig_atlama | `sesRutbeAtladi()` |
| turnuva | `sesTurnuvaBasladi()` |
| bildirim | `sesBildirim()` |
| hata_uyari | `sesHataUyari()` |
| muzik_menu / muzik_mac / muzik_turnuva | çağrı yok — `oyun/lib/sesArkaPlan.js` rotaya göre çalar |

Tercihler: efekt = `sesAcikMi()/sesAyarla()` (eski `bildim_ses` anahtarı), müzik =
`muzikAcikMi()/muzikAyarla()` (`bildim_muzik`). Tanı: `?tani=1` oturumunda her çağrı
`window.__sesKayit`'a `{rol, dosya, t}` olarak yazılır.

## Hangi an → hangi fonksiyon (eski dosyalar)

| An | Fonksiyon | Dosya / süre | Görsel eş |
|---|---|---|---|
| Buton dokunuşu | `sesDokunus()` | dokunus.mp3 | basma durumu |
| Doğru cevap | `sesDogru()` | dogru.mp3 | yeşil vurgu |
| Yanlış cevap | `sesYanlis()` | yanlis.mp3 | kırmızı sarsıntı |
| Soru süresi doldu | `sesSureDoldu()` | sure_doldu.mp3 | süre çubuğu sıfır |
| Soru son 5 sn, her saniye | `sesTik(kalanSn)` (5→1 tizleşir) | tik.mp3 | sayaç titreşimi |
| Son saniyelere girildi (tek sefer, ör. kalan=5) | `sesSonSaniyeler()` | son_saniyeler.wav 0.15 sn | sayaç kırmızıya döner |
| **Yeni soru geldi** | `sesSoruGeldi()` | soru_geldi.wav 0.33 sn | soru kartı görünür olduğu kare |
| **Soru/tur geçişi** | `sesTurGecis()` | tur_gecis.wav 0.37 sn | geçiş animasyonu başladığı an |
| **Kategori seçimi geri sayımı** | `sesKategoriGeriSayim(kalanSn)` | sayim_tik.wav / sayim_son.wav | her saniye rakam değişince |
| Skill kullanıldı | `sesSkill(tur)` | skill_*.wav | skill rozeti patlaması |
| Genel joker (türü bilinmiyor) | `sesJoker()` | joker.mp3 | — |
| Rakip bulundu | `sesRakipBulundu()` | rakip_bulundu.mp3 | arama katmanı kapanırken |
| Can kaybı | `sesCanKaybi(kendi)` | can_kaybi.mp3 | kalp söner (cevap sesinden ~220 ms sonra) |
| Maç kazandın | `sesKazandin()` | kazandin.wav 1.39 sn | sonuç kartı + konfeti |
| Maç kaybettin | `sesKaybettin()` | kaybettin.wav 1.32 sn | sonuç kartı |
| Level atlama (XP) | `sesLevel()` | level.wav 0.79 sn | level rozeti büyür |
| Rütbe atlama | `sesRutbeAtladi()` | rutbe.mp3 | RankUpOverlay |
| Coin kazanma | `sesCoin()` | coin.wav 0.33 sn | coin sayacı artmaya başlar (bir kez, her +1'de değil) |
| Turnuva başladı | `sesTurnuvaBasladi()` | turnuva.wav 0.91 sn | turnuva başlangıç ekranı |
| Sis iner/kalkar | `sesSis(kalkis)` | joker.mp3 (hız 0.7/1.25) | Sis katmanı |

### `sesSkill(tur)` türleri (jokerler.js id'leri)

| Skill | `tur` | Dosya |
|---|---|---|
| 50:50 | `elli` (`"50:50"` da olur) | skill_elli.wav — aşağı süzülen "iki şık gitti" |
| Ek Süre | `sure` (`ek_sure`) | skill_ek_sure.wav — yükselen onay |
| Soru Değiştir | `soru_degistir` | skill_soru_degistir.wav — karıştırma |
| Zaman Baskısı | `zaman_baskisi` | skill_zaman_baskisi.wav — yumruk (rakibe) |
| Sigorta | `sigorta` | skill_sigorta.wav — metal kalkan |
| Seri Koruma | `seri_koruma` | skill_sigorta.wav (1.15× tiz) |
| 2X | `cifte_puan` (`2x`) | skill_2x.wav — 8-bit güç artışı |
| İkinci Şans | `ikinci_sans` | skill_ikinci_sans.wav — iniş-çıkış |

Bilinmeyen tür → `sesJoker()`. Mevcut `sesJoker()` çağrıları `sesSkill(tur)` ile
değiştirilebilir (JokerCubugu.jsx:179, DuelloPage.jsx:651/1095/1128).

## Düello — Ida'nın isteği (hazır)

1. **Kategori seçimi geri sayımı her saniye duyulsun, son 3 sn belirgin (351):**
   ```js
   const sonSayimRef = useRef(null);
   // saniye her değiştiğinde (kalan = ekranda yazan sayı):
   if (kalan > 0 && sonSayimRef.current !== kalan) {
     sonSayimRef.current = kalan;
     sesKategoriGeriSayim(kalan);   // >3: kısa tik · 3–2: "bong" · 1: daha tiz + yüksek "bong"
   }
   ```
   Görsel: son 2 saniyede rakamı büyüt/kırmızıya çek — ses aynı karede.
   Ekran açılınca `sesOnYukle("duello")`.
2. **Soru geldiğinde belirgin ses:** soru kartı DOM'a girdiği/göründüğü karede
   `sesSoruGeldi()` (soru id'si değişince bir kez; ref ile koru).
3. **Soru/tur geçerken belirgin ses:** geçiş animasyonu başlarken `sesTurGecis()`;
   hemen ardından yeni soru görünür olunca `sesSoruGeldi()`. İkisi arasında en az
   ~250 ms bırak (geçiş sesi 0.37 sn) — üst üste binmesinler.

Müzik VAR (Ida kararı, 23 Eyl 2026): çağrı gerekmez — `oyun/lib/sesArkaPlan.js` rotaya göre
çalar; soru gelince `sesSoruGeldi()` kısar, `sesDogru/sesYanlis/sesSureDoldu/sonuç` sesleri açar.
Turnuva sayfası maç sürerken `muzikTurnuvaMacta(true)` der (maç döngüsü).
