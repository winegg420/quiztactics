// Ekonomi testi dönemi — Paket 35 A (migration 252).
//
// NE KORUYOR:
//   1. Yeni hesap baslangic_coin (10.000) ile açılır.
//   2. Normal ekonomi: stok yokken joker coin ile alınır, coin düşer.
//   3. Aynı soruda üç FARKLI joker kullanılabilir ("aynı soruda tek joker" kuralı yok).
//   4. Aynı joker maçta ikinci kez: "Bu jokeri bu maçta zaten kullandın".
//   5. Düelloda aynı iki kural (saldırı ve savunma).

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, hataVerir, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

const coin = async (c, u) => Number(await c.tek(`select coin from public.profiles where id = ${a(u)}`));
const fiyat = async (c, tur) => Number(await c.tek(`select public.joker_fiyati(${a(tur)})`));

test('yeni hesap baslangic_coin ile açılır', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'ek0');
    const beklenen = Number(await c.tek(`select public.ayar_sayi('baslangic_coin', 10000)`));
    assert.equal(await coin(c, x), beklenen);
  });
});

test('klasik: stok yokken üç farklı joker aynı soruda alınır, coin düşer; tekrar reddedilir', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'ek1');
    const y = await oyuncuKur(c, 'ek2');
    const id = await c.tek(
      `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, senkron, basladi,
                                   soru_ids, aktif_soru, soru_baslangic)
       values (${a(x)}, ${a(y)}, 'aktif', true, true, true,
               public.soru_sec(null, 20, array[${a(x)}, ${a(y)}]::uuid[]), 0, now())
       returning id`
    );
    await c.sorgu(`update public.joker_envanter set adet = 0 where user_id = ${a(x)}`);
    const once = await coin(c, x);
    const turler = ['elli', 'sure', 'zaman_baskisi'];
    let toplam = 0;
    for (const t of turler) toplam += await fiyat(c, t);
    await olarak(c, x);
    for (const t of turler) {
      await c.sorgu(`select public.joker_al_ve_kullan('1v1', ${a(id)}, 0, ${a(t)})`);
    }
    assert.equal(await coin(c, x), once - toplam, 'üç jokerin fiyatı düşmeli');
    const hata = await hataVerir(c, `select public.joker_al_ve_kullan('1v1', ${a(id)}, 0, 'elli')`);
    assert.match(hata, /bu maçta zaten kullandın/i);
    assert.equal(await coin(c, x), once - toplam, 'reddedilen alımda coin düşmemeli');
  });
});

test('düello: saldırıda ve savunmada farklı jokerler aynı soruda; aynı joker ikinci kez reddedilir', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'ekd1');
    const y = await oyuncuKur(c, 'ekd2');
    const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
    const kategori = await c.tek(`select k from unnest(public.duello_kategorileri()) k limit 1`);
    await olarak(c, x);
    await c.sorgu(`select public.duello_kategori_sec(${a(id)}, ${a(kategori)})`);
    await c.sorgu(`update public.joker_envanter set adet = 0 where user_id in (${a(x)}, ${a(y)})`);
    const onceX = await coin(c, x);
    await c.sorgu(`select public.joker_al_ve_kullan('duello', ${a(id)}, null, 'zaman_baskisi')`);
    await c.sorgu(`select public.joker_al_ve_kullan('duello', ${a(id)}, null, 'saldiri_degistir')`);
    assert.equal(await coin(c, x), onceX - (await fiyat(c, 'zaman_baskisi')) - (await fiyat(c, 'saldiri_degistir')));
    // savunma fazına geç
    await c.sorgu(`update public.duellolar set faz = 'cevap', faz_bitis = now() + interval '15 seconds' where id = ${a(id)}`);
    await olarak(c, y);
    await c.sorgu(`select public.joker_al_ve_kullan('duello', ${a(id)}, null, 'elli')`);
    await c.sorgu(`select public.joker_al_ve_kullan('duello', ${a(id)}, null, 'sure')`);
    const hata = await hataVerir(c, `select public.joker_al_ve_kullan('duello', ${a(id)}, null, 'elli')`);
    assert.match(hata, /bu maçta zaten kullandın/i);
  });
});
