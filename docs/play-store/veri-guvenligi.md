# Veri güvenliği (Data safety) formu — cevap taslağı

Kaynak: `/gizlilik` sayfası (`oyun/pages/GizlilikPage.jsx`), `PROJECT_CONTEXT.md › İzleme ve kayıt`
(migration 1097), `src/lib/hataIzleme.js` (Sentry). 14 Eki 2026 durumu. Veri akışı değişirse
(reklam ağı, Play Faturalandırma, analitik) hem bu taslak hem `/gizlilik` güncellenir.

## Genel sorular

| Soru | Cevap |
|---|---|
| Uygulama, zorunlu kullanıcı veri türlerinden herhangi birini topluyor veya paylaşıyor mu? | **Evet** |
| Toplanan bütün kullanıcı verileri aktarım sırasında şifreleniyor mu? | **Evet** (yalnız HTTPS/WSS; Supabase, Vercel, Sentry) |
| Kullanıcıların verilerinin silinmesini istemesi için bir yol sunuyor musunuz? | **Evet** — uygulama içi Profil › Ayarlar › Hesabımı sil, web: **https://quiztactics.com/hesap-sil**, e-posta: info@quiztactics.com |
| Hesap oluşturma | Kullanıcı adı + e-posta kodu / Google ile giriş; misafir hesap da var |
| Hesap silme URL'si (zorunlu alan) | https://quiztactics.com/hesap-sil |

**"Paylaşım" yok:** Veriler yalnız bizim adımıza işleyen hizmet sağlayıcılara (Supabase, Vercel,
Resend, Sentry, Cloudflare) gider — Play tanımında bu **paylaşım sayılmaz**. Satış, reklam ağı,
veri aracısı yok. Bu yüzden aşağıdaki her satırda "Paylaşılıyor mu?" = **Hayır**.

## Toplanan veri türleri

| Kategori › Tür | Toplanıyor | Zorunlu mu? | Amaç | Not |
|---|---|---|---|---|
| Kişisel bilgiler › **E-posta adresi** | Evet | İsteğe bağlı (misafir hesapta yok) | Hesap yönetimi | Yalnız giriş için; başka oyunculara gösterilmez |
| Kişisel bilgiler › **Ad** | Evet | Zorunlu | Uygulama işlevi, Hesap yönetimi | Oyuncunun seçtiği takma ad (Play "takma ad"ı Ad sayar); diğer oyunculara görünür |
| Kişisel bilgiler › **Kullanıcı kimlikleri** | Evet | Zorunlu | Uygulama işlevi, Hesap yönetimi, Dolandırıcılık önleme/güvenlik | Hesap kimliği (UUID), Google hesap kimliği (Google ile girişte) |
| Kişisel bilgiler › **Diğer bilgiler** | Evet | İsteğe bağlı | Uygulama işlevi | Oyuncunun kendisi seçtiği şehir/ülke (lig ve sıralama için; GPS/IP'den çıkarılmaz) |
| Fotoğraflar ve videolar › **Fotoğraflar** | Evet | İsteğe bağlı | Uygulama işlevi | Profil fotoğrafı (Google fotoğrafı yalnız oyuncu onaylarsa / yüklenen avatar); hazır avatar seçen için yok |
| Mesajlar › **Diğer uygulama içi mesajlar** | Evet | İsteğe bağlı | Uygulama işlevi, Güvenlik (şikâyet incelemesi) | Arkadaş mesajları ve maç içi sohbet; küfür maskelenir |
| Uygulama etkinliği › **Uygulama etkileşimleri** | Evet | Zorunlu | Uygulama işlevi, Analiz, Dolandırıcılık önleme | Maç sonuçları, puan, görülen sorular, kayıt/giriş/kurulum/davet olayları (olay kaydı 30 gün) |
| Uygulama etkinliği › **Kullanıcı tarafından oluşturulan diğer içerik** | Evet | İsteğe bağlı | Güvenlik, Uygulama işlevi | Şikâyetler (açıklama + şikâyet edilen mesajın metni), engelleme listesi |
| Uygulama bilgileri ve performans › **Kilitlenme günlükleri** | Evet | Zorunlu | Analiz (hata ayıklama) | Sentry (Frankfurt; IP/çerez yok, e-posta temizlenir) + kendi `istemci_hata` tablosu (30 gün) |
| Uygulama bilgileri ve performans › **Teşhis** | Evet | Zorunlu | Analiz | Sayfa, sürüm, cihaz türü (hata özetiyle birlikte) |
| Cihaz veya diğer kimlikler › **Cihaz veya diğer kimlikler** | Evet | İsteğe bağlı | Uygulama işlevi (bildirim) | Bildirim açılırsa push abonelik adresi; profilden kapatılır |

**Verilerin geçici işlenip işlenmediği** sorusu: hepsi için **Hayır** (saklanıyor).

## Toplanmayanlar (bilerek "Hayır")

- **Konum** (yaklaşık/kesin): Hayır — cihaz konumu okunmaz.
- **Ses kayıtları:** Hayır — uygulama mikrofon kullanmaz (16 Eki 2026).
- **Finansal bilgiler / Satın alma geçmişi:** şu an Hayır — gerçek parayla satın alma kapalı
  (`elmas_satin_alma_acik = 0`); coin oyun içi para birimidir. **Play Faturalandırma açılınca
  "Satın alma geçmişi = Evet, Uygulama işlevi" eklenir.**
- **Rehber, takvim, SMS, dosyalar, web geçmişi, sağlık, ırk/din vb.:** Hayır.
- **Reklam kimliği:** Hayır — reklam ağı bağlı değil. Ödüllü reklam açılırsa form yeniden doldurulur.

## Güvenlik uygulamaları (formdaki rozetler)

- Aktarımda şifreleme: **Evet**
- Silme talebi: **Evet** (yukarıdaki adresler)
- Bağımsız güvenlik incelemesi (MASA): **Hayır** (isteğe bağlı rozet)
- Play Families politikasına bağlılık: uygulanmaz (hedef kitle 13+)
