# Kozmetik aktivasyonu + 7 karar (24 Eyl 2026)

**Dal:** `bulut/kozmetik-aktivasyon` (main'e push edilmedi)

## Migration'lar — UYGULANMADI

Bu bulut ortamında canlı Supabase'e erişim yoktu (`.env` / veritabanı bağlantısı yok). İki dosya yazıldı,
**canlıya uygulanmadı**. Uygulama: `npx supabase db push` (sıra: 550 → 551).

| Dosya | İş |
|---|---|
| `20260612000550_kozmetik_aktivasyon.sql` | A1–A4: aktif/pasif kuralı, 27 avatar ücretsiz, bot avatarları, satış bayrağı, çerçeve tarzı |
| `20260612000551_tepki_ozel_kanal.sql` | B4 + B5: bot tepkisi %12 ve yalnız anlamlı anlarda; tepki özel Realtime kanalında |

İkisi de yerel bir Postgres 16 taslağında (Supabase'in ilgili tabloları + 520/530/540/541/542) **iki kez**
uygulandı — ikinci çalıştırma aynı sonucu verdi, hata yok. Yıkıcı değişiklik yok (satır silinmez, kolon
düşmez). Kod migration'dan önce dağıtılırsa eski davranış sürer (yeni alan/fonksiyon yoksa istemci eski yolu kullanır).

## Uygulanınca aktif olacaklar (kural — liste kodda değil)

Bu ortamdan Ida'nın canlıdaki seçimleri okunamadı. Migration listeyi koda gömmez, seçim tablosuna bakar:

- **Elmas kozmetikleri:** `kozmetikler.onay = 'girsin'` olanlar (`/kozmetik-onizleme` › "Satışa girsin").
- **Auralar (Ida: aura da aynı kural):** dükkân auralarından `auralar.onay = 'girsin'` olanlar. Etkinlik auraları önizlemede olmadığı için kural dışı.
- **Çerçeve tarzı:** `/cerceve-onizleme`'de seçilen tarz (`sahip_tasarim_secimleri.cerceve_tarzi`) → Altın Lig çerçevesi oyunda o tarzda. Seçim yoksa bugünkü çerçeve.
- **Pasif** (işaretsiz ya da "Girmesin"): dükkânda, koleksiyonda, oyunda ve botlarda görünmez; satın alınamaz, takılamaz. Satın alınmış/takılı kayıtlar **silinmez**, yalnız görünmez.
- Kural dinamiktir: Ida sonradan önizlemede seçimi değiştirirse yeni migration gerekmez.
- Migration uygulanırken günlüğe listeyi yazar: `550 aktif kozmetikler: …`, `550 aktif auralar: …`, `550 çerçeve tarzı: …`.
- Kontrol sorgusu: `select anahtar from kozmetikler where aktif and onay = 'girsin';` ve `select anahtar from auralar where kaynak = 'dukkan' and aktif and onay = 'girsin';`

## A. Kozmetik aktivasyonu

1. **Aktif/pasif** — yukarıdaki kural. Sahip test modu yalnız aktif kalemlerde sürer.
2. **27 yeni avatar ücretsiz** — 13 günlük + 14 kostümlü, herkes profilde, kurulumda, Dükkân › Avatar'da ve Koleksiyon'da seçer. Kostümlü elmas fiyatı kalktı (`avatar_fiyati` = 0). `/avatar-onizleme` seçimleri bu karar için dikkate alınmaz.
3. **Gizli botlar** — 461'deki kural aynen (profesyonel avatarlı gizli botlar id sırasıyla döngüsel), liste 31 + 27 = 58 avatar. Açık botlar ve avatarsız botlar değişmez. Not: depoda "bot adından" seçim kuralı yok; var olan kural kimlik (id) sırası — o genişletildi.
4. **`kozmetik_satis_acik`** — Ida'nın cevabıyla `true` yapılır; yalnız aktif kalemlerin satışını açar. Pasifler bayraktan bağımsız gizli.

## B. 7 karar

1. **Maç sonu taç çakışması** — kazananın çerçevesinde (ya da aurasında) taç varsa sahnenin taç emojisi gizlenir, yoksa kalır. Ölçüm: Altın Lig / Turnuva Şampiyonu / Alev Kanatları / yeni tarzlar → gizli; Level 75, Level 100, Gümüş → görünür.
2. **Plaka isim etiketine biniyor** — ölçüm: yeni tarz Altın Lig plakası ile isim hapı arası **0,2 px** (gölgeyle üst üste). Plakalı çerçevede iki tarafın avatar yuvası birlikte açılır → **10,2–18,6 px**. 1440 · 850 · 560 · 390 · 360 px'te aynı, yatay taşma yok.
3. **Tepkiler** — yalnız Antrenman'da kalır (`tepki_acik_modlar` değişmedi). Kodda not: Klasik/Düello'ya açılınca DB'ye yazan eski 6 emoji kaldırılacak.
4. **Bot tepki oranı** — %30 → **%12** (`oyun_ayarlari.tepki_bot_olasilik`); yalnız doğru cevap serisi (`tepki_bot_seri` = 3), maç sonu ve rakip hatasında.
5. **Tepki güvenliği (Ida onayladı)**
   - **Önce:** tepki maçın herkese açık kanalında (`mac-<id>` / `duello-<id>`) broadcast'ti; `realtime.messages`'ta politika yoktu. Maç kimliğini bilen her giriş yapmış hesap kanala katılıp tepki gönderebiliyordu.
   - **Sonra:** tepki ayrı **özel** kanalda (`tepki-mac-<id>` / `tepki-duello-<id>`, `private: true`). `realtime.messages` RLS: okuma ve gönderme yalnız `authenticated` rolünde ve yalnız o maçın `oyuncu1`/`oyuncu2`'si. İstemci özel kanal açıkken eski kanaldaki "tepki"yi yok sayar. Oyun kanalı (postgres_changes) değişmedi.
   - Bot tepkisi sunucudan `realtime.send(..., private => true)` ile aynı özel kanala → botlu Antrenman bozulmaz.
   - Yerel test: oyuncu kendi maçına gönderir ✔ · yabancı hesap gönderemez (RLS hatası) ✔, okuyamaz (0 satır) ✔ · oturumsuz gönderemez ✔ · yabancıya `tepki_durumu` kapalı ✔.
6. **Kurulum ekranı** — 31 hazır avatar + 27 yeni avatar (hepsi ücretsiz) sunucu kataloğundan.
7. **Dükkân sekme çubuğu** — seçili sekme çubuğun kendi yatay kaydırmasıyla görünür alana alınır (ortak `QtSekmeler`, bütün sekme çubukları). 390 px taşan çubukta 4 seçimin 4'ü tam görünür; sayfa dikey kaymaz.

## Test

- `npm run build` temiz.
- Ana paket (`oyun-*.js`): **387.970 → 391.407 B** (gzip 125.511 → 126.714). Yeni tarz çerçeve ayrı tembel parça (15 KB, gzip 3,8 KB).
- Canlı testler (normal hesap aktif kalemler, 27 avatar seçimi, kurulum, Antrenman tepki, başka hesabın tepki gönderememesi, Klasik maç) **yapılamadı** — canlı erişim yok. Aynı senaryolar yerel Postgres taslağında sunucu tarafında doğrulandı; arayüz ölçümleri sunucusuz önizleme sayfalarında yapıldı.

## Uygulandıktan sonra kontrol

1. `npx supabase db push` → günlükte `550 aktif …` satırları.
2. `node araclar/oyuncu-testi.mjs --adres=https://quiztactics.vercel.app` (Klasik + Antrenman).
3. Antrenman'da tepki gönder; başka hesapla `tepki-mac-<o maç id>` özel kanalına katılmayı dene → reddedilmeli.

## Premium kozmetik — migration 560 (24 Eyl 2026, dal `bulut/premium-aktivasyon`, UYGULANMADI)

Ida'nın `/premium-onizleme`'de onayladığı 9 kalem + lig amblemi oyuna alındı.

| Anahtar | Tür | Test fiyatı |
|---|---|---|
| `pc_sonbahar`, `pc_galaksi`, `pc_sakura` | premium_cerceve | 500 elmas (`elmas_premium_cerceve`) |
| `pa_yaprak`, `pa_kar`, `pa_kor`, `pa_gece`, `pa_kuzey`, `pa_sualti` | premium_aura (iç zemin) | 300 elmas (`elmas_premium_aura`) |

- `onay = 'girsin'`, `kozmetik_satis_acik` kuralına uyar; `profiles.takili_premium_cerceve / takili_premium_aura`;
  `oyuncu_kartlari` + `lig_grubum_ozet` yeni alanlar; gizli bot null; sahip test modu; `kozmetik_ver` (istemciye kapalı).
- Yerel Postgres'te iki kez uygulandı; normal/sahip/bot/satın alma/tak senaryoları geçti. Uygulama: `npx supabase db push`.
