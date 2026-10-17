# RAPOR — Avatar edinme = ilerleme (1039) · 9–10 Eki 2026

## Dağılım (canlı DB, `avatar_nitelikleri`, aktif avatarlar)

| Nadirlik | Edinme | Adet | Avatarlar |
|---|---|---|---|
| Yaygın | ucretsiz | 21 | değişmedi |
| Nadir | level | 6 | Lv 3 Kedili Kız · Lv 10 Viking · Lv 15 Dedektif · Lv 25 Şövalye · Lv 35 Büyücü · Lv 50 Kral |
| Nadir | sezon | 2 | Sezon Yolu ücretsiz kol: Sv 10 Kovboy · Sv 24 Korkuluk |
| Nadir | coin | 9 | Palyaço, Hostes, Pelerinli, Gece, Kahraman, Hayalet, Zombi, Mumya, Kedili Genç — 750 coin (`coin_avatar_nadir`, TEST) |
| Epik | elmas | 20 | 150 elmas |
| Efsanevi | elmas | 10 | 300 elmas |

Epik/Efsanevi hiçbir level ya da ücretsiz kol satırında yok (DB kısıtı `avatar_nitelikleri_edinme_veri_check` + migration sonu güvence).

Sezon Yolu: ücretsiz 10 / 24 (eskiden 5 elmas) → Kovboy / Korkuluk. Ücretli 19 / 22 / 23 (1037: Şövalye / Büyücü / Kral) → Kurt Adam / Balkabağı Adam / Vampir (Epik). 5 Korsan, 14 Samuray, 21 Kristal Uzaylı, 27 Savaş Robotu aynen.

## Değişen fonksiyonlar (migration `20260612001039_avatar_edinme_ilerleme.sql`)

- `avatar_satis_fiyati` — coin dalı (`coin_avatar_<nadirlik>`).
- `avatar_satin_al` — coin dalı (`coin_harca`); yeni fonksiyon/GRANT yok. FOR UPDATE, çift alım reddi, `kozmetik_satis_acik` kapısı aynı.
- `avatar_sahiplik_durumu` — + `edinme, edinme_level, edinme_sezon_seviye, bp_ucretli_seviye`. Dönüş tipi değiştiği için DROP + CREATE; GRANT authenticated aynen (Ida onayı).
- `level_avatar_ver` (YENİ, iç; istemciye kapalı) — level'in avatarını verir, sahipse `level_avatar_sahipse_coin` 200 (referans `level_avatar:<anahtar>` tekil → idempotent).
- `xp_ver` — level döngüsünde `level_avatar_ver`; 20 coin / 5 levelde skill / rütbe 100 coin aynen. `detay.avatarlar`.
- `level_kazancim` — `avatarlar` alanı.
- `bp_odul_uygula` — avatar ödülüne zaten sahipse `bp_avatar_sahipse_coin` 200 coin (`sezon_yolu`, referans `sezon:<s>:<sv>:<kol>:sahip`).
- `bp_odul_ver_ic` — `zaten_sahip` avatar ödülünde `sahip_coin` alanı.
- `koleksiyon_kalemleri` — avatar nadirliği `avatar_nitelikleri`'nden.
- Şema: edinme kontrolü (+coin/level/sezon), 2 kolon, `oyuncu_avatarlari.kaynak` + `level`, 3 ayar (`coin_avatar_nadir` 750, `bp_avatar_sahipse_coin` 200, `level_avatar_sahipse_coin` 200).
- DEĞİŞMEDİ: `avatar_onayla` (sahiplik kapısı `avatar_sahip_mi` = edinme ≠ ücretsiz → kendiliğinden kilitler; botlar çağırmaz).

### "İade yok" davranışı nerede değişti
822'de `bp_odul_ver_ic` sahip olunan avatar/arka plan ödülünü `zaten_sahip` diye işaretliyor, `bp_odul_uygula` ise `on conflict do nothing` ile hiçbir şey vermiyordu (yorum: "çift satır yok, iade yok"). Artık **avatar** ödülünde `bp_odul_uygula` eklenen satır sayısına bakar; 0 ise 200 coin verir (`bp_odul_al`, `bp_toplu_al`, `bp_satin_al` geriye dönük, `sezon_kapat` ve `trg_bp_odul_gercek` aynı yoldan geçer). Arka plan ödülü eski kuralda (iade yok).

### Koleksiyon Puanı
Avatarları SAYMIYORDU: `koleksiyon_kalemleri` `avatar_katalogu.nadirlik` okuyordu (canlıda hepsi boş) ve 31 hazır avatar (Şövalye, Kral…) katalogda yok. Minimal düzeltme: nadirlik `avatar_nitelikleri`'nden (yaygın → sıradan). Yeni puan türü yok. Avatar sahibi hesapların puanı yeniden hesaplandı.

## Geçiş (yalnız insan hesaplar; botlara satır yok)

- Takılı avatarı yeni kurala göre kilitlenen 1 hesaba `hediye` (Kedili Kız, Lv 10 hesap) — takılı avatar düşmedi; kilitli kalan hesap 0.
- Level'ı eşiği geçmiş 2 hesaba 5 `level` sahipliği: Lv 26 → Kedili Kız, Viking, Dedektif, Şövalye · Lv 10 → Viking (Kedili Kız zaten hediye). Geriye dönük verilende coin yok.
- Sezon 1'de ücretsiz kol 10'u önceden almış 1 hesap 5 elmasını aldı; Kovboy'u bu sezon almaz (yuva bir kez alınır). Ücretli 19/22/23'ü alan yoktu.
- Canlı sahiplik satırları: hediye 11 · level 5 · dukkan 1 · etkinlik 1.

## İstemci

- `components/AvatarEdinme.jsx` (YENİ): kilitli avatar kartı — büyük görsel + nadirlik + tek satır ("Lv 25'te açılır · sen Lv 12" / "Sezon Yolu · Ücretsiz kol · Seviye 10" / "750 coin · Al" / "150 elmas · Al" + "ya da Sezon Yolu · Seviye 19"). Alınca "Tak". Dükkân, Profil › avatar, Koleksiyon, Kurulum aynı bileşen.
- `AvatarKilitRozeti` köşe işareti: Lv rakamı (mavi) / Sezon Yolu bayrağı / coin / elmas (prop yoksa eski kilit).
- Dükkân › Avatar ve İsim: coin'li 9 Nadir avatar coin fiyatıyla; level/Sezon Yolu avatarlarının durum satırı "Lv 25" / "Sezon Yolu"; kural şeridi "Jokerler · Nadir avatarlar — coin ile" / "Öteki kozmetikler — elmas ile"; açıklama "Nadir avatarlar coin'le, öteki kozmetikler elmasla." Elmas alımı mevcut D-301 onay penceresinden.
- Profil level alanı: `LevelOdulleri` — sıradaki 3 ödül (avatar · Joker hakkı · rütbe + coin).
- Maç sonu level atlama: `MacSonuKutlama` + `LevelKazanci` "Yeni avatar: X" (sahipse "X zaten sende · +200 coin"); önizleme örneğine eklendi.
- Sezon Yolu: avatar yuvası sahipse "Sahipsin · +200 ●" (alınabilirse "Al · +200 ●"); ödül sayfasında "Bu avatar sende var. Alınca yerine 200 coin alırsın."
- Çeviriler `ceviri/avatar-satis.js`. README avatar satırı, PROJECT_CONTEXT güncel.

## Doğrulama

- SQL (ROLLBACK, geçici hesap): `node araclar/avatar-edinme-1039-sql-testi.mjs` → **45/45** (uygulamadan önce prova + canlıdan sonra `--canli`). Geri alma da ROLLBACK içinde denendi (dağılım 17 nadir/ücretsize döndü, BP tablosu birebir aynı).
- `npm run build` temiz.
- Ekran (`node araclar/avatar-edinme-ekran.mjs`, taklit: level 12, sahiplik yok, Sezon Yolu 10/24 sahip): TR 360+390 **96/96**; EN 360+390 tam geçti
  (dört edinme türünde kart, Dükkân sayımları 6 level / 2 sezon / 9 coin / 39 para işareti, kural şeridi, Profil sıradaki 3 ödül, Sezon Yolu "Sahipsin · +200",
  maç sonu "Yeni avatar"; yatay taşma yok, kartta 44 px altı hedef yok, konsol hatası yok). Görüntüler `tasarim/avatar-edinme/`.
  Not: art arda tam matris koşuları canlı ağ geçidinde Gateway Timeout üretti; betik artık REST yanıtlarını süreç içinde önbelleğe alıyor.
- Push: `d297e325` (DB) + `ccfd603c` (ekranlar) → Vercel success; canlı pakette `AvatarEdinme` parçası ve Dükkân kural metni var, ana sayfa ve Dükkân 200. Satın alma yapılmadı.

## Yapılamayanlar / notlar

- Gerçek iOS kontrolü sahibinin telefonunda.
- Sezon 1'de ücretsiz 10'u zaten alan 1 oyuncu Kovboy'u bu sezon alamaz (yuva tek alımlık); Sezon 2'de alır.
- `coin_avatar_nadir` 750 TEST değeri.
