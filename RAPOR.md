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

RAPOR HAZIR — Ida'ya iletilecek.
