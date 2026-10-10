# Basılı tut (3 sn) → doğru şık — mod taraması (10 Eki 2026)

**Temel bulgu:** Özellik herkese açık değil; sunucu `get_match_question` / `get_group_match_question` / `get_tournament_question` içinde `dogru_cevap`ı yalnız `hileli_mi()` (profiles.hile_yetkisi) olan hesaba veriyor. Normal oyuncuda alan `null`, özellik çalışmaz. Güvenlik kuralı gereği başka mod için doğru cevap istemciye taşınmadı, migration yazılmadı.

| Mod | Durum | Neden |
|---|---|---|
| Klasik 1v1 (MatchPage) | Çalışır (QuestionCard) | `dogru_cevap` yetkili hesaba geliyor |
| Turnuva (TournamentPage) | Çalışır (QuestionCard) | aynı |
| Grup maçı (GroupMatchPage) | Çalışır (QuestionCard) | aynı |
| Hızlı Maç (HizliMacPage) | QuestionCard bağlı; sunucu `get_hizli_soru` alanı vermiyor, mod zaten DONDURULMUŞ | yapılamadı, çünkü doğru cevap istemcide yok |
| Hızlı Mod (HizliModPage) | Yapılamadı | doğru cevap istemcide yok (cevaptan sonra `hizli_mod_cevap` veriyor) |
| Çalışma (CalismaPage) | Yapılamadı | doğru cevap istemcide yok (`calisma_cevap` sonrası) |
| Kasa / Ortak Kasa (KasaPage) | Yapılamadı | doğru cevap istemcide yok; `sonuc.dogru_cevap` yalnız sonuç fazında |
| Düello (DuelloPage) | Yapılamadı | doğru cevap istemcide yok (`duello_cevap` sonrası). Rakip bekleyen çok oyunculu modda hile yetkisiyle cevap taşımak adaleti bozar; bu yüzden eklenmedi |

## Yapılan değişiklik
- `QuestionCard.jsx` (4 modun ortak kartı): davranış aynı; ek olarak basılan şıkta 3 sn dolan mavi çizgi, `prefers-reduced-motion` açıksa sade dolgu, uzun basış menüsü/metin seçimi/büyüteç engeli (`touch-action`, `user-select`, `-webkit-touch-callout`, `onContextMenu`). Görsel yalnız `dogru_cevap` gelen hesapta görünür. Aynı soruda ikinci tetikleme `cevapla` içindeki `secim !== null` korumasıyla engelli.
- `bilesenler.css`: `.qt-sik--tutulur`, `.qt-sik--basili`.

## Test
- `npm run build` temiz.
- Tarayıcıda 3 sn / 1 sn testi YAPILMADI: yetkili hesap gerektiriyor ve canlı Supabase'e test yükü gönderme kuralı var (CLAUDE.md). Ekran görüntüsü alınmadı.

---

# Oyun hissi — kalan 3 iş (10 Eki 2026)

## Değişen dosyalar
| Dosya | Ne / neden |
|---|---|
| `oyun/tasarim/sezon-yolu/sezon-yolu.css` | **İŞ 1.** Ejderha hero: yan yana düzen yerine dikey/ortalı (124 px kutu, çizim ×1,4; kısa ekranda 92 px, ×1,05). Ejderha başı/kanadı sol üstteki geri düğmesine biniyordu (hero sola yaslıydı, çizim kutudan taşıyordu). Ortalanınca geri düğmesi ve başlıkla yatayda kesişmiyor, kırpılmıyor. Altında final ödülü + sezon + sıradaki hap, onun altında seviye/ilerleme, sonra ödül yolu. Renk rolleri ve `prefers-reduced-motion` kuralları dokunulmadı (yalnız boyut/konum). |
| `oyun/pages/gorevler/gorevler-oyun.css` | **İŞ 2.** Liste alanının altına boşluk (`.gk-sayfa` padding-bottom 8 px). **İŞ 3 bulgusu:** görev adı `line-clamp` 2 → 3 (EN "Answer 50 questions correctly" "…" ile kırpılıyordu; kart yüksekliği değişmedi). |
| `oyun/pages/anasayfa/anasayfa.css` | **İŞ 3 bulgusu.** 390×700 EN'de ana sayfa kısayol çipleri kelimeyi ortadan kırıyordu ("Challen/ges", "Knowled/ge"). ≤700 px yükseklikte de ikonsuz çip (≤660 kademesindeki kural) + `overflow-wrap: break-word`. |
| `araclar/oyun-hissi-duzeltme-sezon.mjs`, `araclar/oyun-hissi-duzeltme-gorevler.mjs` | Önce/sonra ölçüm betikleri (taklit veri; canlı Supabase'e yazmaz). |
| `tasarim/oyun-hissi-duzeltme/` | Önce (`*-once-*`) / sonra (`*-sonra-*`) görüntüleri, ana sayfa, maç sonu, BP tanıtımı. |

## İŞ 2 — kök sebep notu
Görevler sahnesinde alt eylem alanı **akışta** (kaydırılan bölgenin altında bir kardeş öğe); kartların üstüne binmesi yapısal olarak mümkün değil. 320×568, 360×640, 375×667, 390×600/664/700/844 ölçüldü: son kart ile alt şerit arası ≥ 8 px, AL düğmeleri kaydırılan bölgenin içinde ve tıklanabilir. Bildirilen çakışma bu ölçümlerde **yeniden üretilemedi**; istenen alt boşluk yine de eklendi (boşluk 8 → 16–20 px). Gerçek cihazda hâlâ görülürse cihaz/boyut bilgisi gerekir.

## İŞ 3 — görsel doğrulama (390×700 ve 390×844, TR + EN)
| Ekran | Sonuç |
|---|---|
| Ana sayfa EN | Kısayol çipleri kırılıyordu → düzeltildi. Sezon/Görev kartları ve "Reward ready" etiketi temiz. |
| Maç sonu EN | Temiz (SP şeridi, "Level 13!", "Claim in Season Path"); taşma yok. |
| Görevler TR + EN | EN kart adı "…" ile kırpılıyordu → 3 satıra izin; sonrası temiz, "Claim reward (3)" ekranda. |
| Sezon Yolu TR + EN | Ejderha düzeltildi (İŞ 1); EN metinler çevrili, anahtar adı görünmüyor. |
| "Ödül hazır / Reward ready" altın etiketi | Ana sayfa Sezon kartı ve sezon çubuğunda doğru, taşma/kırpma yok. |

Çeviri eksiği (anahtar adının ekranda görünmesi) bulunmadı.

## Test notları
- `npm run build` temiz (eski iPhone color-mix denetimi TEMİZ).
- Test altyapısı: `.arayuz-denetim-oturum-en.json` geçersizdi; profil önbelleğindeki `dil` "en" yapılarak yeniden üretildi (git'e girmez). Önceki oturumların "EN görüntüler TR metinli" notu buradan gelir.
- Maç sonu önizlemesinde `oyuncu_kartlari ... uuid "onizleme-ben"` konsol uyarısı: önizleme sayfasının sahte kimliği, üretimde yok.
- Aynı hata sınıfı (kısa ekranda kırpılma / alt boşluk) benzer ekranlarda arandı: Sezon "Ödül yolu" alt şeridi ve BP tanıtımı (390×700) temiz.

RAPOR HAZIR — Ida'ya iletilecek.
