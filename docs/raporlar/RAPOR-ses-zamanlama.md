# Ses ↔ görsel zamanlaması — rapor (9 Eki 2026)

## Kök neden (ölçüldü, hipotez doğru)
Düello v4 saldırı sorusunda "kim neyi aldı" paneli SUNUCU saatine göre kalkıyor (`gosterim_bas − pay + duello4_acilis`), soru sesi ise faz bilgisinin cihaza geldiği andan sabit 2000 ms sonra çalıyordu. Faz Realtime/yoklama ile geç gelirse panel zamanında kalkıyor, ses o gecikme kadar geç çalıyordu. Ek olarak panel, 200 ms'lik saat tikini beklediği için hedeften 65–143 ms sonra kalkıyordu.

## Ölçüm (taklit veri, 390×844, `araclar/ses-zamanlama-olcum.mjs`)
Fark = ses çağrı anı − panelin kalktığı an (ms; + ses geç).

| An | Faz gecikmesi | Önce: fark | Önce: panel hedeften | Sonra: fark | Sonra: panel hedeften |
|---|---|---|---|---|---|
| v4 açılış → soru | 0 | −72 | +105 | −8 | +19 |
| v4 açılış → soru | 300 | **+251** | +65 | −7 | +23 |
| v4 açılış → soru | 800 | **+674** | +143 | −6 | +6 |
| v4 açılış → soru | 3000 | ses 2 sn sonra, sonraki nötr soruda patladı; panel görünmeden kategori sesi çaldı | — | ses yok, kategori sesi yok | — |
| v4 nötr soru | 0 / 300 / 800 | +6 / +5 / +3 | — | +3 / +4 / +4 | — |

### İlk çalma (`ILK_CALMA_SINIRI_MS` = 250)
| İndirme gecikmesi | Ön yükleme | Önce | Sonra |
|---|---|---|---|
| 100 ms | yok | çaldı | çaldı |
| 400 ms | yok | **sessiz** | sessiz (ön yükleme olmayan yerde beklenen) |
| 800 ms | yok | **sessiz** | sessiz |
| 800 ms | var (ilk ziyaret) | **sessiz** | çaldı |

Evet, sınır aşılınca ilk ses hiç çalmıyor. Gizli neden: ön yükleme `/ses-secim` seçimleri sunucudan gelmeden çalışıyor ve eski dosyayı indiriyordu; seçim gelince rol kova adayına dönüyor, o dosya 250 ms'de inmeyince ilk soru sessiz kalıyordu. Hazine ise hiç ön yükleme yapmıyordu.

## Mod tablosu
| Mod / an | Ses neye bağlı | Görselle fark | İşlem |
|---|---|---|---|
| Düello v4 saldırı soru_geldi | önce istemci zamanlayıcı (faz gelişi + 2000) → **sunucu saati** | 251–674 → ≤ 8 ms | düzeltildi |
| Düello v4 kategori_secildi | faz gelişi (panel aynı karede) | 0; panel hiç görünmediyse artık çalmaz | düzeltildi |
| Düello v4 nötr / Son Düello soru_geldi | faz gelişi = soru çizimi | ≤ 6 ms | dokunulmadı |
| Düello v4 tur_gecis (kart), tik, sayim_son, rakip_cevapladi | render efekti (sayaç / veri ile aynı kare) | ~0 | dokunulmadı |
| Klasik / Saf Bilgi / Grup / Turnuva (QuestionCard) soru_geldi, tik, sure_doldu | render efekti / sayaç tiki ile aynı tik | ~0 | dokunulmadı (ön yükleme zaten var) |
| MatchPage rakip_cevapladi, SureDolduGecis | render efekti | ~0 | dokunulmadı |
| Hazine soru_geldi | üç kaynak: giriş sahnesi kalkışı / faz gelişi / AÇ anı bitişi (her biri görselin çıktığı an) | ~0 | tek `soruSesi` (anahtar `soru:<tur>`, birKez) |
| Hazine tur_gecis, tik, rakip_cevapladi | faz olayı / sayaç efekti | ~0 | dokunulmadı; ön yükleme eklendi |
| Eski Düello (surum 2) soru_geldi | faz gelişi + 300 ms (kasıtlı; tur geçiş sesiyle binmesin) | 300 | dokunulmadı: v4 herkese açık, yeni surum 2 maçı açılmıyor |
| Çalışma | render efekti (istemci saati) | ~0 | dokunulmadı (ön yükleme var) |

## Değişen dosyalar
- `oyun/components/duello4/Duello4Arena.jsx` — soru sesi sunucu anına zamanlı, o an yeniden çizim; > 500 ms geride → sessiz.
- `oyun/pages/KasaPage.jsx` — `soruSesi` tek kaynak; `sesOnYukle` (mac, skill, coin/rozet/xp_dolma).
- `oyun/lib/ses.js` — seçimler gelince istenmiş ön yüklemeler yeniden iner.
- `araclar/ses-zamanlama-olcum.mjs` — yeni ölçüm aracı (taklit).
- Ses dosyası/seçimi/hacmi, `/sure-ayar` anahtarları, 980 gizli sekme kuralı, birKez: değişmedi.

## Doğrulama
- `npm run build` temiz. Konsol hatası yok (ölçüm aracı).
- `duello-v4-ekran.mjs`: 105 geçti / 5 kaldı. Bu 5 hata değişiklikten ÖNCE de aynı (eski kodla TR koşusu 63/3, aynı `.d4-kart` dblclick zaman aşımı) — bu işle ilgisi yok.
- `kasa-ekran.mjs`: 292 / 0.
- 390 px görsel: yalnız ses zamanlaması ve panelin kalkış karesi değişti; düzen değişmedi.
- Test için açılan 2 misafir hesap silindi.

## Ölçülemeyenler
- `kasa-canli-testi.mjs` taklit kipi yok (gerçek canlı maç oynatır) — canlıya yük bindirmemek için koşulmadı.
- Gerçek iki oyunculu telefon testi yapılamadı: **Ida telefonda bakacak** (Düello v4 saldırı sorusu açılışı, Hazine ilk soru sesi).
- iOS'ta AudioContext gecikmesi (çıkış gecikmesi) ölçülemedi.
