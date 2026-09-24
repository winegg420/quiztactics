# Yayın öncesi yapılacaklar

Yayından (Play Store'a çıkış) önce elle yapılacak işler. Her madde yapıldığında tarihiyle işaretlenir.
Satın alma altyapısının ayrıntılı denetimi: `docs/SATIN_ALMA_DENETIMI.md`.

## Play Console — ELMAS paketleri (24 Eyl 2026, migration 480 — coin paketlerinin yerine)

**Karar (Ida):** coin artık parayla SATILMAZ (yalnız oynayarak kazanılır, jokerler yalnız coin'le);
gerçek parayla yalnız **elmas** satılır, elmas yalnız kozmetik (aura) alır. Aşağıdaki coin paketi
bölümü tarihçe olarak durur; `coin_paketleri` satırları pasif (`aktif = false`), sunucu coin satmaz.

- [ ] **Play Console'da 5 tüketilebilir ürün aç** (kimlikler `elmas_paketleri.urun_id`). TL fiyatları ve
  sıra eski coin paketleriyle aynı kalır (Avuç … Define aynı fiyat basamağı):

  | urun_id | Ad (TR / EN) | Taban elmas (TEST) | Bonus | Toplam | Fiyat |
  |---|---|---|---|---|---|
  | `elmas_100` | Avuç / Handful | 100 | — | 100 | eski `coin_500` fiyatı |
  | `elmas_220` | Kese / Pouch | 220 | %10 (22) | 242 | eski `coin_1200` fiyatı |
  | `elmas_500` | Sandık / Chest | 500 | %15 (75) | 575 | eski `coin_3000` fiyatı |
  | `elmas_1100` | Hazine / Treasure | 1.100 | %20 (220) | 1.320 | eski `coin_8000` fiyatı |
  | `elmas_2400` | Define / Hoard | 2.400 | %30 (720) | 3.120 | eski `coin_16000` fiyatı |

- [ ] **`satin_alma_dogrula` Edge Function'ı elmas ürünlerini işleyecek şekilde güncelle:** `elmas_*` ürününde
  `elmas_paketleri`'nden (elmas + bonus) okuyup `elmas_ekle(user, miktar, 'satin_alma', purchaseToken)` yaz
  (`elmas_hareketleri_satin_alma_tek` jetonu hesaptan bağımsız tekil tutar); tüketim/iade akışı coin'dekiyle aynı.
- [ ] Ürünler tanımlanıp doğrulama hazır olunca: `update oyun_ayarlari set deger = '1' where anahtar = 'elmas_satin_alma_acik';`
  (o zamana kadar Dükkân › Elmas'ta paketler "Yakında", Play'e fiyat sorulmaz).

## Play Console — coin paketleri (TARİHÇE — 480'den beri satılmıyor)

- [ ] **Play Console'daki ürün adlarını (Avuç, Kese, Sandık, Hazine, Define) ve yeni Define ürününü güncelle.**
  Ürün kimlikleri `coin_paketleri.urun_id`'den gelir; hepsi **tüketilebilir** ürün:

  | urun_id | Ad (TR / EN) | Taban coin | Bonus | Toplam | Fiyat kuralı |
  |---|---|---|---|---|---|
  | `coin_500` | Avuç / Handful | 500 | — | 500 | Play'de belirlenir |
  | `coin_1200` | Kese / Pouch | 1.200 | %10 (120) | 1.320 | Play'de belirlenir |
  | `coin_3000` | Sandık / Chest | 3.000 | %15 (450) | 3.450 | Play'de belirlenir |
  | `coin_8000` | Hazine / Treasure | 8.000 | %20 (1.600) | 9.600 | Play'de belirlenir |
  | `coin_16000` | **Define / Hoard** (yeni, migration 336) | 16.000 | %30 (4.800) | 20.800 | **Hazine × 2**, mağaza kalıbına yuvarla |

- **Define fiyatı nasıl hesaplanır:** veritabanında ve depoda hiçbir para birimi için gerçek fiyat
  **yok** (bilerek: fiyatı Play Console belirler, istemci Digital Goods API'den okur). Bu yüzden Define
  fiyatı bugünden sabitlenemedi; kural şu: her para biriminde **Hazine'nin Play fiyatı × 2**, sonra o
  para biriminin mağaza kalıbına yuvarla — `x,99` ile biten en yakın basamak (ör. Hazine ₺249,99 →
  Define ₺499,99; Hazine $4.99 → Define $9.99). Taban coin de 2 katı (16.000) olduğu için coin başına
  fiyat Hazine ile aynı kalır; farkı %30 bonus yaratır ("En iyi değer").
- Play'in "şablon fiyat" (pricing template) özelliği kullanılırsa Define için Hazine şablonunun 2
  katı yeni bir şablon açılır; ülke bazlı otomatik dönüşüm yine `x,99` kalıbına iner.
- Satın alma bugün kapalı; Play'de ürün tanımlanana kadar Define dükkânda görünür ama fiyat
  gösterilmez (diğer 4 paketle aynı).
