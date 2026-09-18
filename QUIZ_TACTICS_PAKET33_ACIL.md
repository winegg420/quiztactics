# PAKET 33 — ACİL: maç içi joker satın alma penceresi oyunu çökertiyor

Klasör: `C:\Users\ida\Desktop\quiztactics`. **Bu paket tek bir hata düzeltmesi.**
Önce bunu yap, başka işe geçme.

## BELİRTİ (canlıda doğrulandı, 18 Eyl)
Klasik maçta envanterde olmayan bir jokerin düğmesine basıldığında (satın alma penceresi
açılırken) **sayfa tamamen beyaza düşüyor.** Maç ekranı, joker çubuğu, her şey kayboluyor.
Sayfa yenilenene kadar geri gelmiyor.

Test adımı: Klasik maçta adedi 0 olan bir jokere bas (ör. Sis).

## KÖK SEBEP — ölçüldü, tahmin değil
Tarayıcı konsolu:
```
Error: Minified React error #31
args[] = object with keys {bakiye, hareketler}
```
React #31 = "bir nesne JSX içine metin gibi basıldı".

Zincir:
1. `coin_bakiyem` RPC'si **tablo** döndürüyor:
   `supabase/migrations/20260612000131_coin_ekonomisi.sql:209`
   → `returns table(bakiye bigint, hareketler jsonb)`
   PostgREST bunu `[{ bakiye, hareketler }]` dizisi olarak veriyor.
2. `oyun/components/JokerCubugu.jsx:88`:
   ```js
   if (!bak.error) setCoin(Array.isArray(bak.data) ? bak.data[0] : bak.data);
   ```
   `bak.data[0]` = `{ bakiye: 979, hareketler: [...] }` → **nesne**, sayı değil.
   `coin` state'i nesne oluyor.
3. `oyun/components/JokerSatinAlModal.jsx:73`:
   ```jsx
   <Ikon ad="coin" boyut={15} /> {coin ?? 0}
   ```
   Nesne doğrudan render ediliyor → React çöküyor, ağaç düşüyor, ekran beyaz.

Ayrıca aynı nesne satır 30'da `Number(coin ?? 0)` ile sayıya çevrilmeye çalışılıyor;
`Number({...})` = `NaN`, yani "yeterli coin" kontrolü de yanlış çalışıyordu.

## DÜZELTME — tek satır
`oyun/components/JokerCubugu.jsx:88` satırında **sayı** alınacak:

```js
if (!bak.error) {
  const satir = Array.isArray(bak.data) ? bak.data[0] : bak.data;
  setCoin(typeof satir === "number" ? satir : (satir?.bakiye ?? null));
}
```

- `coin` state'i bundan sonra **her zaman sayı ya da null** olacak.
- `JokerSatinAlModal`'a sayı gidecek; modalın kendi kodu DEĞİŞMEYECEK.
- Başka hiçbir davranışa dokunma.

## AYNI HATA BAŞKA YERDE Mİ VAR — KONTROL ET
`coin_bakiyem` çağıran BÜTÜN yerleri tara. Her birinde dönüşün `{bakiye, hareketler}`
satırı olduğu, düz sayı OLMADIĞI varsayılmalı. Yanlış kullanan başka yer varsa
aynı şekilde düzelt ve rapora yaz.

Ayrıca genel bir tarama yap: bir RPC dönüşünün doğrudan JSX'e basıldığı başka yer var mı?
(`{data}`, `{sonuc}`, `{bak.data}` gibi). Bulduklarını raporla, hepsini düzeltme.

## KABUL
- Klasik maçta adedi 0 olan jokere basınca satın alma penceresi açılıyor, sayfa çökmüyor.
- Pencerede coin bakiyesi **sayı** olarak doğru görünüyor.
- "Yetersiz coin" kontrolü doğru çalışıyor (bakiye < fiyat ise onay pasif).
- Satın alma tamamlanınca joker geliyor ve coin düşüyor.
- Düelloda aynı akış da çalışıyor (orada da test et).
- `npm test` geçiyor.

## TESLİM
Tek commit: `Paket 33: maç içi joker satın alma cokmesi - coin_bakiyem satirindan bakiye alinacak`.
`PROGRESS.md`'ye ölçümü ve düzeltmeyi yaz.
