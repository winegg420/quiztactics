# Product

<!-- impeccable:product-schema 1 -->

> Kaynak: sahibinin (Ida) 23 Eyl 2026 tarihli brifi + `PROJECT_CONTEXT.md`. Init röportajı
> yapılmadı (sahibinin çalışma kuralı: adım adım soru yok); **(çıkarım)** etiketli satırlar
> depodan çıkarıldı, sahibi onaylamadı.

## Platform

web

(Mobil web + PWA; Google Play'e TWA olarak çıkacak — tasarım dili web'dir, native değil.)

## Users

- Geniş kitle: hem casual hem rekabetçi bilgi yarışması oyuncuları; telefonda, kısa
  oturumlarla oynar (360–430 px öncelik).
- Bir kısmı oyunu yalnız arkadaşlarıyla maç yapmak için oynar — arkadaş akışı birinci sınıf
  vatandaştır, hiçbir limit onu cezalandırmaz.
- Türkçe (ana) ve İngilizce konuşan oyuncular.

## Product Purpose

Gerçek zamanlı 1v1 ve grup bilgi yarışması: Klasik Mod (20 soru), Düello (taktik maçı:
kategori seçimi, aynı soru aynı anda, 3 can, uzatma), günde 7 seanslık turnuva, grup maçı
(3–5 kişi, ödülsüz), haftalık lig (Bronz → Efsane), skill'ler ve coin ekonomisi.
Başarı: oyuncunun maça hızla girip adil, gergin, eğlenceli bir yarış yaşaması ve geri gelmesi.

## Positioning

Bilgi yarışmasına taktik katmanı: Düello'da rakibin zayıf kategorisini hedefleme, maç içi
skill'ler (50:50, Ek Süre, Soru Değiştir, Zaman Baskısı, Sigorta, 2X, İkinci Şans), dereceli
lig. Hız bonusu yok — süre içinde doğru cevaplayan herkes aynı puanı alır.

## Operating Context

- Maçlar senkron ve sunucu yetkili (Supabase RPC + realtime); istemci yalnız çizer.
- Botlar eşleşme açığını kapatır; gizli botun bot olduğu arayüzde asla sızmaz.
- Turnuva seans saatleri: 10:00 · 12:30 · 15:00 · 18:00 · 20:00 · 22:00 · 24:00 (TSİ).

## Capabilities and Constraints

- React 19 + Vite 7, düz CSS + CSS değişkenleri; yeni UI kütüphanesi/framework yasak.
- iOS Safari: `position:fixed` ile `transform` aynı öğede/atada yok; `100dvh`.
- Dokunma hedefi ≥ 44 px; her soruda şıklar dokunulabilir olmalı (oyuncu testi kuralı).
- Oyun mantığı, RPC imzaları, puan/coin kuralları tasarım işinde değişmez.
- Dondurulmuş: 3B meydan/harita, gardırop, karakter vitrini.
- Açık: logo (yeni logo ayrı iş, bekliyor); müzik (eklenmeyecek, ayrı karar).

## Brand Commitments

- Ad her dilde "Quiz Tactics", çevrilmez; başlıkta "QUIZ TACTICS" + mevcut Q işareti.
- Görsel yön (sahibi seçti, 23 Eyl 2026): **Yön A "Şeker Kutusu"** — parlak, yuvarlak,
  oyuncak gibi kabarık düğmeler (`oyun/tasarim-yonleri/`, `docs/tasarim-yonleri/yon-a-*.png`).
- Kullanıcıya görünen ad "Skill" (veritabanında `joker_*` kalır).
- Başka oyunlardan logo/karakter/görsel kopyalanmaz. Sesler yalnız Kenney (CC0).

## Evidence on Hand

- Soru havuzu ~12.000 aktif soru (TR, çoğu EN çevirili); gerçek kullanıcı yorumu, basın,
  metrik YOK — uydurulmaz.
- Profil avatarları: `oyun/components/AvatarProIllustrations.jsx` (31 karakter).

## Product Principles

1. Adalet önce: sunucu yetkili, hız bonusu yok, botlar gerçekçi ama görünmez.
2. Maç ekranı kutsal: her soruda dokunabilmek ve anı hissetmek (doğru/yanlış, son saniyeler,
   skill anı) her süslemeden önce gelir.
3. Arkadaşla oynamak birinci sınıf.
4. İki dil eşit: Türkçe ve İngilizce metinler oyun dilinde, düz çeviri değil.

## Accessibility & Inclusion

- Kontrast ≥ 4,5:1 (büyük yazı ≥ 3); `prefers-reduced-motion` sade sürüm; renk tek başına
  anlam taşımaz (doğru/yanlış yanında ikon/metin). **(çıkarım: depodaki mevcut kurallar)**
