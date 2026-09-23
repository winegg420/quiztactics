# Mobil bilgi yarışması ve casual/rekabetçi oyun arayüz dili — ilke özeti

Hazırlanma: 23 Eylül 2026 · Şerit T, Tasarım Adım 1. Bu belge yalnız **ilke**
çıkarır; hiçbir oyunun logosu, karakteri, ikonu ya da görseli kopyalanmaz.
Somut uygulama: `/tasarim-yonleri` sayfası (üç yön).

## 1. Renk
- **Zemin tek bir iş yapar:** ya parlak/açık (oyuncak hissi, gün içi hızlı oyun) ya koyu (maç anı, odak, rekabet). Maç ekranları çoğu oyunda koyuya geçer; menüler açık kalabilir. Quiz Tactics bunu zaten yapıyor (`bd-oyun-modu`).
- **Kategori/mod başına bir renk** ve o renk her yerde aynı anlamı taşır. Kart zemini doygun, üzerindeki yazı koyu mürekkep ya da kalın beyaz — soluk gri asla.
- **Doğru/yanlış renkleri evrenseldir:** yeşil = doğru, kırmızı/pembe-kırmızı = yanlış. Renk körlüğü için yalnız renge yaslanılmaz: ikon (tik/çarpı) + hareket (zıplama/sallanma) birlikte gelir.
- Altın/sarı **ödül ve prestij** rengidir (coin, rütbe, 1.lik); başka işe harcanmaz.

## 2. Yazı
- Başlıklar kalın, yuvarlak ya da dar (condensed) — küçük ekranda "tıknaz" yazı daha iyi okunur. İnce ağırlık kullanılmaz.
- **Sayılar ayrı bir roldür:** skor, sayaç, coin, level her zaman *tabular* (eş genişlikli) rakam; sayı değişirken titremez. Sayaç en büyük sayıdır.
- El cihazında en küçük okunur metin ~14 px; ikincil etiketler bile 12 px altına inmez. Yazıya dış çizgi/gölge *yazı tipinin üstüne* bir katman olarak eklenir.
- Türkçe karakterler (ğ ü ş ı ö ç İ) seçilen her yazı tipinde bulunmalı; aksi halde sistem fontuna düşüp satır yüksekliği bozulur.

## 3. Düğmeler
- Oyunda düğme **fiziksel bir nesnedir:** alt dudak (lip) ya da gölgeyle kalınlık verilir, basınca o kalınlık kadar aşağı iner (`translateY`) ve dudak kaybolur. Basma geri bildirimi 100–160 ms, bırakma daha da hızlı.
- Ana eylem düğmesi ekranda tektir ve en doygun renktir; ikincil düğmeler daha sakin.
- Dokunma alanı ≥ 44 px; şıklar tam genişlik, başparmak bölgesinde (ekranın alt yarısı).
- Dokunmatikte hover yoktur: hover efektleri `(hover: hover) and (pointer: fine)` ile kapılanır.

## 4. Maç ekranı
- Dikey hiyerarşi: **üstte iki oyuncu + skor/can**, ortada **soru kartı ve sayaç**, altta **4 şık**, en altta **skill çubuğu**. Göz yukarıdan aşağı akar, başparmak aşağıda kalır.
- Sayaç hem sayı hem de azalan halka/çubuk olarak gösterilir; son saniyelerde renk + ritim değişir (gerilim). Bazı yarışma uygulamaları son saniyelerde her saniye titreşim verir.
- Sen solda/altta, rakip sağda/üstte — sabit yer, maç boyunca değişmez. Can kalp gibi sayılabilir işaretlerle, skor büyük rakamla.
- Skill'ler ikonla, adı dokununca ya da uzun basınca görünür; kullanılan skill gri + "kullanıldı" durumu alır.

## 5. Hareket
- **Doğru anı:** kısa büyüme-zıplama (scale ~1.04–1.08, 200–350 ms), yeşil dolgu, küçük parçacık/ışıltı. **Yanlış anı:** yatay sallanma (0.1–0.3 sn), kırmızı; hemen ardından doğru şık gösterilir (öğretici).
- **Ödül/kazanma anı** nadir olduğu için daha uzun ve gösterişli olabilir (konfeti, sayı sayma); sık tekrarlanan etkileşimler (düğme, şık) kısa kalır — arayüz animasyonu 300 ms altında.
- Giriş hareketi ease-out; hiçbir şey `scale(0)`'dan doğmaz (0.9–0.95 + opaklık). Yalnız `transform` ve `opacity` canlandırılır.
- `prefers-reduced-motion`: konum/ölçek hareketleri kalkar, renk ve opaklık değişimi kalır (anlam kaybolmaz).

## 6. Ses (not)
- Her dokunuşa kısa, yumuşak "tık"; tekrar tekrar duyulduğu için yorucu olmamalı.
- Doğru = parlak, yükselen iki nota; yanlış = boğuk, alçak tek vuruş (sert buzzer değil).
- Son 5 saniye: tik-tak hızlanır/perdesi yükselir; skill kullanımı her skill'e özgü kısa bir imza sesi.
- Ses hiyerarşisi: sonuç sesi > sayaç > düğme tıkı. Titreşim (haptik) sesin eşi olarak düşünülür.

## Kaynaklar
- [HQ Trivia — Big Human vaka çalışması](https://www.bighuman.com/work/hq-trivia) (sayaç odaklı sade maç ekranı, saniye başı titreşim, parlak yalın şekiller)
- [Making a Game Feel "Juicy" with Simple Effects — itch.io](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects) (sıkıştır-uzat, kısa sallanma 0.1–0.3 sn, anlık donma)
- [Game UI Type Systems: HUD to Handheld — Sidebearings](https://www.sidebearings.com/game-ui-type-system/) (el cihazında 14–16 px taban, tabular rakam, gölge/kontur katmanı)
- [Gaming Typography — FontAlternatives](https://fontalternatives.com/blog/gaming-fonts-hud-esports-branding/) (rakam ayırt ediciliği, yüksek x-yüksekliği)
- [Best Practices for Game UI Sounds — SFX Engine](https://sfxengine.com/blog/best-practices-for-game-ui-sounds) ve [Audiokinetic — UI Audio](https://www.audiokinetic.com/en/blog/approaching-ui-audio-ui-design-perspective-1/) (ses hiyerarşisi, yorucu olmayan tekrar sesleri, başarı/başarısızlık tınısı)
- [Supercent — Hyper-casual oyunlarda UI](https://medium.com/supercent-blog/designing-ui-of-hyper-casual-games-for-effective-user-experience-dd7c858bec82) (yüksek kontrastlı, dokunmaya uygun büyük düğmeler; küçük ödül animasyonları)
- Proje içi: `.claude/skills/emil-design-eng` (süre ve eğri kuralları), `.claude/skills/impeccable/reference/craft-floor.md` (kontrast, "AI slop" kalıpları), `.claude/skills/mobile-native` (dokunma, `dvh`, hover kapısı).
