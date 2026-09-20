# Quiz Tactics — Paket 43: Kalan maddeler

Paket 40/41/42 sonrası canlıda yapılan kontrolde bulunan 4 eksik + verilen kararlar.
Küçük bir paket; hepsi tek tek ölçülebilir.

## Değişmeyen kurallar
- Mevcut kodu silme. Minimal değişiklik. Dosya silme/yeniden yazma yok.
- Yeni npm paketi yok. `vite.config.js › rollupOptions.input` dosyasına dokunma.
- localStorage anahtarlarını, item id'lerini, soket adlarını değiştirme.
- Migration'lar append-only. Veri silme yok. **Canlı `oyun_ayarlari` değerlerine dokunma.**
- Düzeltme bütün modlara uygulanır (Düello dahil), sorma.
- Her adımdan sonra `npm run build` + ölçüm. Bitince rapor.

---

## A. Kontrast — 3 yer (canlıda ölçüldü, hepsi AA altında)

| # | Yer | Metin | Ölçülen | Eşik | Dosya |
|---|---|---|---|---|---|
| A.1 | Ana sayfa seri kartı | seri sayısı (22 px, kalın) | **2,31:1** | 3 | `tema.css:2368` → `.app .bd-seri.isi-sicak .bd-seri-sayi { color:#FF8A6B }` |
| A.2 | Profil ustalık ızgarası | "Çırak" (12 px) | **3,01:1** | 4,5 | `UstalikIzgarasi.jsx:117` — renk satır içi `style={{color: renk}}` ile geliyor |
| A.3 | Gizlilik / Koşullar | metin içi bağlantılar | **2,68:1** | 4,5 | `tema.css:2083` → `.app .bd-metin-sayfa a { color: var(--bd-baglanti) }` |

**Yapılacak.**
- A.1: `#FF8A6B` yerine beyazda ≥ 3:1 veren bir ton seç. Bu sınıfın öteki "ısı" durumlarını da
  (`isi-yok`, varsa `isi-*` başka değerler) ölç; hepsi eşiği geçsin.
- A.2: `UstalikIzgarasi.jsx`'teki renk listesini bul. **Bütün seviyelerin** rengini beyaz/krem kart
  zemininde ölç (Çırak, Kalfa, Usta… hangi seviyeler varsa). ≥ 4,5:1 olmayanları koyulaştır.
  Seviyeler arası ayırt edilebilirlik korunsun — hepsini aynı renge çevirme.
- A.3: `--bd-baglanti` değişkenini metin içi bağlantı için ≥ 4,5:1 yap.
  Bu değişken başka nerede kullanılıyor `grep` ile bul; **her kullanım yerini ayrı ayrı ölç**
  (bazıları renkli zeminde olabilir, tek değer hepsini çözmeyebilir).

Her satır için düzeltme sonrası ölçülen değeri rapora yaz.

---

## B. Turnuva lobisindeki kılıç düğmeleri 34×34

**Nerede.** `TournamentPage.jsx:631` — `<span className="bd-lobi-kilic" role="button" …>`.
Lobide her oyuncu satırında bir tane; canlıda **42 adet** ölçüldü, hepsi 34×34 px.

**Neden kaçtı.** Paket 41 J ve Paket 42 L yalnız `.bd-ikon-btn` sınıfını düzeltti; bu ayrı bir sınıf.

**Yapılacak.**
1. `.bd-lobi-kilic` dokunma alanını **≥ 44×44** yap (görsel ikon 15 px kalabilir — alanı
   `padding` ya da görünmez `::after` ile büyüt, satır yüksekliğini bozma).
2. Görünümünü Paket 42 L.2'deki lig kılıcıyla **aynı** yap: zeminsiz, ince kenar, gri ikon,
   üstüne gelince/odakta turuncu. Lobide 20+ turuncu kılıç gürültü yapıyor.
3. `role="button"` yerine gerçek `<button type="button">` kullan — klavye ve ekran okuyucu
   davranışı kendiliğinden doğru olur, `tabIndex`/`onKeyDown` elle kurulumuna gerek kalmaz.
   `e.stopPropagation()` korunsun (satıra basınca kart açılıyor).
4. **Aynı deseni başka yerde de ara:** `grep -rn 'role="button"' oyun/ src/` — bulduğun her yerde
   hem dokunma hedefini ölç hem de gerçek `<button>`'a çevirilebilir mi bak. Listesini rapora yaz.

---

## C. Turnuva maçından çıkışa onay penceresi

**Karar (Ida).** Turnuvada maçtan çıkmak **elenmek** demek, geri dönüşü yok.
Yanlışlıkla X'e basan oyuncu turnuvayı kaybediyor. Bu yüzden:

| Mod | Çıkışta onay |
|---|---|
| Klasik | **yok** (değişmiyor) |
| Saf Bilgi | **yok** (değişmiyor) |
| Grup | **yok** (değişmiyor) |
| **Turnuva** | **VAR — bu pakette ekleniyor** |
| Düello | zaten var (değişmiyor) |
| Çalışma | yok ("Turu bitir" zaten sonucu gösteriyor) |

**Yapılacak.** `TournamentPage.jsx` içindeki `MacUstSerit` çıkışına onay penceresi bağla:
- Başlık/metin: "Turnuvadan çıkarsan elenirsin. Bu turnuvaya geri dönemezsin."
- Düğmeler: **Vazgeç** (ikincil) · **Çık ve elen** (tehlike)
- Düello'daki `terkOnay` kalıbını kullan — yeni desen uydurma, mevcut `Modal` bileşeni.
- Onay penceresinde tehlike düğmesi **dolu kırmızı** olsun (Paket 42 A kuralı: dolu kırmızı
  yalnız onay penceresinde).
- Vazgeç'e basınca maça geri dönsün, soru sayacı akmaya devam etsin (duraklatma yok).

---

## D. CLAUDE.md ve AGENTS.md — turnuva saatleri

**Karar (Ida): 7 seans kalıyor.** Canlı `oyun_ayarlari.turnuva_saatleri` ve kod varsayılanı
(`oyun/lib/zaman.js:15`) zaten doğru: `10:00 · 12:30 · 15:00 · 18:00 · 20:00 · 22:00 · 24:00`.

Yanlış olan **belgeler**. `CLAUDE.md` ve `AGENTS.md`'deki "13:00 ve 21:50, sabit" ifadelerini
canlıyla aynı yap. **Kodu ve canlı ayarı değiştirme**, yalnız iki belgeyi düzelt.
Eski `turnuva_saat_sabah` / `turnuva_saat_aksam` ayarları kullanılmıyorsa belgeye not düş,
ama **veritabanından silme**.

---

## Bu pakette YAPILMAYACAKLAR
- Facebook düğmesi — karar bekliyor, dokunma.
- İletişim e-posta adresi — yeni adres gelmedi, dokunma.
- Masaüstü düzeni (1024+ yan menü) — karar bekliyor.
- Ülke bayrağı (Windows "TR" harfleri), zil "tümünü okundu say",
  son 5 sn filigranının opaklığı — karar bekliyor.
- Koyu tema, Gardırop, Meydan 3B haritası, ekonomi/joker fiyatları, İngilizce soru bankası.

## Bitince rapor
`PAKET43_RAPOR.md` yaz: her madde için dosya:satır, ölçüm öncesi/sonrası değerler,
B.4'teki `role="button"` taramasının listesi. Kendi kendine test et, benden kontrol isteme.
Emin olmadığın yerde tahmin etme, sor.
