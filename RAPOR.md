# Tepki paketi — maç içi tepki bütün gerçek maç modlarında (17 Eki 2026)

> Klasör `quiztactics-isler/tepki`, dal `tepki-paketi`, migration aralığı 1120–1124 (yalnız **1120** kullanıldı).
> Yetki/RLS/GRANT değişikliği YOK. Ekonomi değerlerine (coin, elmas, plan) dokunulmadı. Jev kullanılmadı (kapalı).

## Ne değişti

**Sunucu — migration `20260612001120_tepki_paketi_tum_modlar.sql` (prova + canlıya uygulandı)**
- `oyun_ayarlari.tepki_acik_modlar`: `["antrenman"]` → `["antrenman","klasik","duello","kasa"]`.
  Saf Bilgi Klasik ailesinde (`matches`) olduğu için `tepki_mac_modu` "klasik" döner; açık bot → "antrenman"; gizli bot maçı gerçek maç gibi "klasik".
- Eski 6 emoji kolu kalktı — gövdeler CANLI `pg_get_functiondef` çıktısının üstüne kuruldu, yalnız eski kol satırları değişti:
  - `bot_oyna`: `if bot_tepki_klasik … else bot_eski_tepki_kuyrukla('mac_mesaj')` → yalnız `perform bot_tepki_klasik(...)`.
  - `submit_match_answer` (bot hemen cevap kolu): aynı değişiklik.
  - `bot_eski_tepki_kuyrukla`: `p_tur <> 'grup_mesaj'` ise hemen döner (yalnız Grup Maçı sohbeti kullanır).
  - Kuyrukta bekleyen eski 1v1 satırları silindi (`bot_tepki_bekleyen where tur='mac_mesaj'`).
- Değişmeyen: sınırlar `tepki_aralik_sn` 3, `tepki_mac_max` 10 (istemci + alıcı uygular), bedava liste `tepki_bedava`
  (alkis 👏, havali 😎, terli 😅, dusunen 🤔), özel kanal + RLS (`tepki-mac/duello/kasa-<id>`, yalnız iki oyuncu, engelli çiftte kapalı).
- Geri alma: `docs/tepki-1120-geri-al.sql` (canlı tanımların uygulama öncesi hâli + bayrak `["antrenman"]`).

**Canlı doğrulama (salt okuma):** bayrak yeni değerde; `bot_oyna` ve `submit_match_answer` içinde `bot_eski_tepki_kuyrukla` yok,
`bot_grup_adimlari` hâlâ çağırıyor (Grup); `tepki_mod_acik('klasik')` = true.

**Dükkân / Sezon Yolu (doğrulandı, değişiklik gerekmedi):** `tepki_eglence` ve `tepki_rekabet` `satis_pasif = true`,
`kozmetik_satista()` false → Dükkân'da satılmıyor. `bp_seviye_odulleri`: seviye 3 ücretli `tepki_eglence`, seviye 12 ücretli
`tepki_rekabet` — migration 721 ile **uyuşuyor**. Paket sahibi maçta paketin tepkilerini de kullanır (`tepkilerim_liste`).

**İstemci**
- `oyun/lib/tepkiler.js` → `oyun/lib/grupTepkileri.js` (git mv). 1v1 maçlardan kalktı; **yalnız Grup Maçı** (`group_match_messages`)
  kullanıyor. Karar gerekçesi: görev listesindeki modlar arasında Grup yok ve yeni tepki sistemi 1v1 (tek rakip) — Grup'tan
  sohbet tepkisini kaldırmak istenmeyen kapsam olurdu. Grup'tan da kaldırılması istenirse: GroupMatchPage'deki `TEPKILER` şeridi +
  `bot_grup_adimlari` çağrısı.
- `MatchPage.jsx` (Klasik/Saf Bilgi/Antrenman): maç içi ve maç sonu 6 emoji düğmesi kalktı; sohbet düğmesi doğrudan hazır
  cümleleri açar (ara panel kalktı). Yeni tepki düğmesi (`TepkiCubugu`) aynen.
- **Düello v4'te tepki hiç yoktu** (yalnız v2 ekranına bağlıydı): `DuelloPage` tepki kancasını v4'te de etkinleştirir;
  `Duello4Arena` üst şeritte ses düğmesinin solunda tepki düğmesi (44 px, absolute — fixed/transform yok), avatarda balon.
  İlk denemede düğme oyuncu hücresindeydi, 360 px'te "Sen" adını "S…" diye kesiyordu → üst şeride taşındı.
- Hazine (`KasaPage` ~383/~957 kablolaması) olduğu gibi kaldı; bayrak açıldığı için artık her Hazine maçında çalışıyor.
- "Rakip tepkilerini gizle": Profil › Ayarlar'da zaten vardı (cihazda, yalnız kendi ekranında gizler) — değişmedi.
- README maç içi tepki satırı güncellendi.

**Ses kuralı:** tepki SESSİZDİR (balon yalnız görsel; yeni ses eklenmedi) → hiçbir sesin üstüne binmez. `npm run test:kurallar` yeşil
(57 ses dosyası doğal sonuna iniyor).

**Senkron güvenliği:** tepki ayrı özel Realtime kanalında; gönderim ateşle-unut (`ch.send` try + `.catch`), `tepki_durumu` okuması
try-catch'li (hata → kapalı), alım try içinde. Soru akışı/süre/sonuç tepkiye hiç beklemez. Sunucuda bot tepkisi kuyruğu
`exception when others` ile yutulur (eskisi gibi).

## Testler
- `npm run build` ✓ · `npm run test:kurallar` ✓.
- Düello v4 ekran ölçümü (taklit veri, **canlıya istek yok**: Supabase REST/auth/Realtime tamamı taklit, sahte oturum — hesap
  açılmadı): 390×844 + 360×640, TR + EN, 360 hareket azaltma → tepki adımları hepsi ✓: düğme üst şeritte ≥ 44 px, panel 4 bedava
  tepki + "10" kalan, panel ekranda (yatay taşma yok), gönderince balon avatarımda, panel kapanır, 3 sn dolmadan seçimler pasif,
  kalan 9, konsol hatası yok; nötr soru tek ekran (360×640 alt 624/640), 44 px hedefler ✓. Toplam 105 ✓ / 10 ✗ — 10 ✗'in hepsi
  `00-giris` (3-2-1 katmanı) adımında ve **değişikliksiz kodda da aynen çıkıyor** (taklit ortam; tepkiyle ilgisiz).
- BAKILAMADI: Klasik/Hazine ekranının tarayıcı ölçümü (taklit maç verisi aracı yok; `arayuz-denetim` misafir girişi artık yok —
  giriş ekranında "Misafir olarak dene" düğmesi bulunmuyor, hesap açılamadı). Klasik değişikliği yalnız düğme kaldırma; Hazine kodu
  değişmedi. Gerçek iOS/telefon. Canlıda iki kişilik tepki alışverişi (canlı DB'ye test yükü kuralı; tek maçlık duman yapılmadı).
- Tam kapsam testi koşulmadı: maç akışı/senkron koduna dokunulmadı (tepki ayrı kanal, yalnız arayüz + bot tepki kolu).

## PROGRESS.md'ye eklenecek kayıt (paralel iş — dosyaya yazılmadı)

```
## 2026-10-17 — Tepki paketi: tepki bütün gerçek maç modlarında (migration 1120 — uygulandı)
- Ida kararı: 4 bedava tepki (👏😎😅🤔) Klasik, Saf Bilgi, Düello, Hazine, açık bot; 3 sn'de 1, maçta 10; "Rakip tepkilerini gizle" cihazda.
- 1120: tepki_acik_modlar = antrenman, klasik, duello, kasa. Eski 1v1 emoji kolu kalktı (bot_oyna, submit_match_answer; bot_eski_tepki_kuyrukla
  yalnız grup_mesaj) — canlı pg_get_functiondef üstüne. Geri alma docs/tepki-1120-geri-al.sql.
- İstemci: lib/tepkiler.js → lib/grupTepkileri.js (yalnız Grup Maçı); MatchPage 6 emoji kalktı; Düello v4'e tepki düğmesi (üst şerit) + balon.
- Doğrulandı: tepki paketleri satis_pasif, Sezon Yolu ücretli 3/12 (721 ile aynı). Tepki sessiz (ses kuralı). build + test:kurallar ✓,
  Düello v4 taklit ekran ölçümü tepki adımları ✓.
```

## PROJECT_CONTEXT.md'de değişecek satır (paralel iş — dosyaya yazılmadı)

"Maç içi tepki (542/551)" maddesi şöyle olmalı (eski "Ida onaylayana dek yalnız antrenman … eski 6 emoji kaldırılacak … eski DB'ye
yazan emojiler gizli" cümleleri silinir):

```
- **Maç içi tepki (542/551/1120):** oyuncu tepkisi DB'ye yazılmaz; Realtime yayını yalnız o maçın iki oyuncusuna açık ÖZEL kanalda
  (`tepki-mac-<id>` / `tepki-duello-<id>` / `tepki-kasa-<id>`, `realtime.messages` RLS). 3 sn'de 1, maçta 10 (gönderen + alıcı); bedava
  👏😎😅🤔, paket tepkileri sahibine. Açık modlar `tepki_acik_modlar` = antrenman, klasik (Saf Bilgi dahil), duello (v2 + v4), kasa
  (1120, Ida 17 Eki 2026). Eski 1v1 6 emoji (match_messages) kalktı; Grup Maçı sohbet tepkileri `lib/grupTepkileri.js`'te ayrı.
  Bot tepkisi sunucudan %3 (`tepki_bot_olasilik`), yalnız anlamlı anda (Klasik + Düello v2; v4 ve Hazine'de bot tepkisi yok).
  Tepki sessiz. "Rakip tepkilerini gizle" cihazda (Profil › Ayarlar).
```

## Açık / öneri
- Düello v4 ve Hazine'de **bot tepkisi yok** (sunucu tetikleyicisi yalnız Düello v2 + Klasik). İstenirse ayrı iş.
- Grup Maçı'ndaki eski 6 emoji: kalsın mı, kalksın mı — Ida kararı.
