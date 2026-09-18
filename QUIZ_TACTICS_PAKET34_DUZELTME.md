# PAKET 34 DÜZELTME — "Sınırsız" yanlış anlaşıldı

Paket 34'te yapılan iş **kısmen yanlış**. İstenen şu:

- **Jokerler tükenmesin** → envanter/stok sınırsız, coin harcanmasın. ✅ (bu doğru yapılmış)
- **Maç içi kullanım hakları AYNEN KALSIN** → "bu maçta en fazla N joker" ve
  "aynı jokeri bu maçta bir kez" kuralları **eskisi gibi çalışmaya devam edecek**. ❌ (bu yanlış yapılmış, kaldırılmış)

Yani oyuncunun **cebi** sınırsız; **maç içi hakkı** sınırsız değil.

---

## 1 — SUNUCU: `20260612000251_jokerler_ucretsiz_sinirsiz.sql`

Bu dosyayı **düzenleme** (migration'lar append-only). Yeni bir migration aç:
`20260612000252_joker_mac_haklari_geri.sql`

`20260612000251`'deki gövdeleri kopyala, **sadece aşağıdaki üç yeri** değiştir.
Başka hiçbir satıra dokunma.

### 1.1 — `joker_hak_kontrol()` — "aynı joker maç başına bir kez" geri gelsin

`20260612000251` satır ~70'teki blok şu anda şöyle:

```sql
if not public.jokerler_serbest() and exists (
  select 1 from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
) then
  raise exception 'Bu jokeri bu maçta zaten kullandın';
end if;
```

`jokerler_serbest()` kontrolünü **çıkar**, kural her zaman çalışsın:

```sql
-- Aynı joker maç başına bir kez (Paket 27 B.1.5).
-- Bu kural ücretsiz test modunda DA geçerli: ücretsizlik stokla ilgili, hakla değil.
if exists (
  select 1 from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
) then
  raise exception 'Bu jokeri bu maçta zaten kullandın';
end if;
```

### 1.2 — `joker_hak_kontrol()` — maç başına toplam hak sınırı geri gelsin

`20260612000251` satır ~87'deki şu üç satırı **tamamen sil**:

```sql
-- Paket 34: ücretsiz ve sınırsız mod — maç başına hak sınırı yok
if public.jokerler_serbest() then
  return;
end if;
```

Silince fonksiyon `v_sinir is null` kontrolüne düşer, yani eski davranış aynen döner:
`duello_joker_hak` / `joker_mac_siniri()` ne diyorsa o.

### 1.3 — `joker_kullan()` — "aynı soruda bir kez" bloğunu kaldır

`20260612000251` satır ~233'teki şu blok, 1.1'i telafi etmek için eklenmişti.
1.1 geri geldiği için **gereksiz ve yanıltıcı** oldu (maç başına bir kez kuralı
zaten daha sıkı). Bloğu tamamen sil:

```sql
if public.jokerler_serbest() and exists (
  select 1 from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = p_mac_tur and k.mac_id = p_mac_id
     and k.soru_index = v_aktif_soru and k.tur = p_tur
) then
  raise exception 'Bu jokeri bu soruda zaten kullandın';
end if;
```

### 1.4 — DOKUNMA (bunlar doğru, bunlar kalsın)

Aşağıdaki `jokerler_serbest()` kullanımları **ücretsizlik/stok** ile ilgili,
istenen şey bunlar. Hiçbirini değiştirme:

- satır ~252 → `v_ucretsiz := v_ucretsiz or public.jokerler_serbest();` (envanterden düşmez)
- satır ~367 → `joker_al_ve_kullan` içinde coin harcamayı atlayan koşul
- satır ~429 ve ~488 → düello saldırı/savunma jokerlerinde envanterden düşmeme
- `jokerler_serbest()` fonksiyonunun kendisi ve `jokerler_ucretsiz` ayar anahtarı

Ayrıca `joker_mac_siniri()` ve `duello_joker_hak` ayarına **hiç dokunma** —
sayılar neyse o kalsın.

---

## 2 — ARAYÜZ: `oyun/components/JokerCubugu.jsx`

Burada da `serbestMod` hakları eziyor. Üç yeri düzelt:

### 2.1 — Satır ~110

```js
const sinirDoldu = !serbestMod &&
  durum.sinir !== null && durum.sinir !== undefined && durum.kullanilan >= durum.sinir;
```
→
```js
// Maç içi hak sınırı ücretsiz modda da geçerli (ücretsizlik stokla ilgili).
const sinirDoldu =
  durum.sinir !== null && durum.sinir !== undefined && durum.kullanilan >= durum.sinir;
```

### 2.2 — Satır ~178

```js
const kullanilanlar = serbestMod
  ? new Set(kullandigim)
  : new Set([...(durum.kullanilan_turler ?? []), ...kullandigim]);
```
→
```js
const kullanilanlar = new Set([...(durum.kullanilan_turler ?? []), ...kullandigim]);
```

### 2.3 — Satır ~155, `satinAlinabilir()`

Baştaki `serbestMod ||` kalsın (serbest modda satın alma penceresi açılmıyor,
doğru) **ama** aşağıdaki `kullanilanlar.has(tur)` ve `sinirDoldu` kontrolleri
zaten yukarıdan düzeldiği için ekstra bir şey yapma.

### 2.4 — `serbestMod` değişkeni SİLİNMESİN

Hâlâ lazım: satır ~196'daki `"Jokerin kalmadı"` mesajını bastırıyor
(serbest modda joker hiç bitmiyor, o mesaj yanlış olur). Orada kalsın.

### 2.5 — Rozet

Serbest modda adet rozetinde sayı yerine **∞** göster; hak sınırı yazısı
(`"Bu maçta {0} joker hakkın kaldı"`) **görünmeye devam etsin** — asıl sınır o.
Rozet stili değişmesin, sadece içerik: `serbestMod ? "∞" : adet`.

---

## 3 — TEST (varsayma, gerçekten oyna)

Klasik maçta, `jokerler_ucretsiz = 1` açıkken:

1. Bir jokeri kullan → ikinci kez basınca **"Bu jokeri bu maçta zaten kullandın"** demeli.
2. Maçtaki toplam joker hakkı dolunca → **"Bu maçta joker hakkın doldu (N/N)"** çıkmalı,
   düğmeler pasif olmalı.
3. Coin bakiyesi **hiç düşmemeli**, envanter adedi **azalmamalı**.
4. Düelloda da 1 ve 2 aynı şekilde çalışmalı (`duello_joker_hak` kaç ise o).
5. `update oyun_ayarlari set deger = '0'::jsonb where anahtar = 'jokerler_ucretsiz';`
   → coin tekrar düşmeli, envanter tekrar azalmalı, hak kuralları **aynı** kalmalı.

`npm run build` temiz geçmeli.

---

## RAPOR

Bitince yaz: hangi migration numarasını açtın, `20260612000251`'den hangi üç
bloğu çıkardın, `JokerCubugu.jsx`'te hangi satırları değiştirdin, ve 3. maddedeki
beş testin sonucu.
