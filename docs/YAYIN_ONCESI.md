# Yayın öncesi yapılacaklar

Yayından (Play Store'a çıkış) önce elle yapılacak işler. Her madde yapıldığında tarihiyle işaretlenir.
Satın alma altyapısının ayrıntılı denetimi: `docs/SATIN_ALMA_DENETIMI.md`.

## Play Console — coin paketleri

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
