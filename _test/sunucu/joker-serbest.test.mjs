// Jokerler ücretsiz ve sınırsız modu — Paket 34 (migration 251).
//
// NE KORUYOR:
//   1. Anahtar açıkken stok gerekmez, envanterden düşülmez, coin düşmez.
//   2. Paket 35 A.3: maç içi HAK kuralları anahtardan bağımsız — açıkken de maç başına 4 hak
//      ve "aynı joker maçta bir kez" geçerli. "Aynı soruda tek joker" kuralı YOK.
//   3. Düelloda da aynı; savunmadaki Soru Değiştir ikinci kez "maçta zaten kullandın" der.
//   4. Anahtar kapanınca eski ekonomi aynen döner (diğer test dosyaları normal modu koruyor).

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, hataVerir, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

async function serbest(c, acik = true) {
  await c.sorgu(`update public.oyun_ayarlari set deger = ${a(acik ? '1' : '0')}::jsonb where anahtar = 'jokerler_ucretsiz'`);
}

async function klasikMac(c) {
  const x = await oyuncuKur(c, 'js1');
  const y = await oyuncuKur(c, 'js2');
  const id = await c.tek(
    `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, senkron, basladi,
                                 soru_ids, aktif_soru, soru_baslangic)
     values (${a(x)}, ${a(y)}, 'aktif', true, true, true,
             public.soru_sec(null, 20, array[${a(x)}, ${a(y)}]::uuid[]), 0, now())
     returning id`
  );
  return { x, y, id };
}

const adet = async (c, u, tur) =>
  Number(await c.tek(`select coalesce((select adet from public.joker_envanter where user_id = ${a(u)} and tur = ${a(tur)}), 0)`));

test('ücretsiz mod: stok yokken joker kullanılır, envanter ve coin değişmez', sec, async () => {
  await islem(async (c) => {
    await serbest(c);
    const { x, id } = await klasikMac(c);
    await c.sorgu(`update public.joker_envanter set adet = 0 where user_id = ${a(x)}`);
    const coin = await c.tek(`select coin from public.profiles where id = ${a(x)}`);
    await olarak(c, x);
    await c.sorgu(`select public.joker_kullan('1v1', ${a(id)}, 0, 'elli')`);
    await c.sorgu(`select public.joker_al_ve_kullan('1v1', ${a(id)}, 0, 'sure')`);
    assert.equal(await adet(c, x, 'elli'), 0, 'envanterden düşmemeli (eksiye de inmemeli)');
    assert.equal(await adet(c, x, 'sure'), 0, 'satın alma yapılmamalı');
    assert.equal(await c.tek(`select coin from public.profiles where id = ${a(x)}`), coin, 'coin düşmemeli');
  });
});

test('ücretsiz modda da hak kuralları: 4 farklı joker tek soruda, 5. ve tekrar reddedilir', sec, async () => {
  await islem(async (c) => {
    await serbest(c);
    const { x, id } = await klasikMac(c);
    await olarak(c, x);
    // Paket 35 A.3: aynı soruda dört FARKLI joker arka arkaya kullanılabilir
    for (const tur of ['elli', 'sure', 'zaman_baskisi', 'sis']) {
      await c.sorgu(`select public.joker_kullan('1v1', ${a(id)}, 0, ${a(tur)})`);
    }
    const hata5 = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'soru_degistir')`);
    assert.match(hata5, /en fazla 4 joker/i);
    // Sonraki soruda aynı joker: maçta bir kez
    await c.sorgu(`update public.matches set aktif_soru = 1, soru_baslangic = now() where id = ${a(id)}`);
    const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 1, 'sure')`);
    assert.match(hata, /bu maçta zaten kullandın/i);
  });
});

test('ücretsiz mod düello: stoktan düşmez; savunmada Soru Değiştir maçta bir kez', sec, async () => {
  await islem(async (c) => {
    await serbest(c);
    const x = await oyuncuKur(c, 'jsd1');
    const y = await oyuncuKur(c, 'jsd2');
    const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
    const kategori = await c.tek(`select k from unnest(public.duello_kategorileri()) k limit 1`);
    await olarak(c, x);
    await c.sorgu(`select public.duello_kategori_sec(${a(id)}, ${a(kategori)})`);
    await c.sorgu(`update public.joker_envanter set adet = 0 where user_id in (${a(x)}, ${a(y)})`);
    await c.sorgu(`select public.duello_saldiri_jokeri(${a(id)}, 'zaman_baskisi')`);
    // savunma fazına geç
    await c.sorgu(`update public.duellolar set faz = 'cevap', faz_bitis = now() + interval '15 seconds' where id = ${a(id)}`);
    await olarak(c, y);
    await c.sorgu(`select public.duello_savunma_jokeri(${a(id)}, 'soru_degistir')`);
    const hata = await hataVerir(c, `select public.duello_savunma_jokeri(${a(id)}, 'soru_degistir')`);
    assert.match(hata, /bu maçta zaten kullandın/i);
    assert.equal(await adet(c, x, 'zaman_baskisi'), 0);
    assert.equal(await adet(c, y, 'soru_degistir'), 0);
  });
});

test('anahtar kapalıyken eski ekonomi: stok yoksa joker kullanılamaz', sec, async () => {
  await islem(async (c) => {
    await serbest(c, false);
    const { x, id } = await klasikMac(c);
    await c.sorgu(`update public.joker_envanter set adet = 0 where user_id = ${a(x)} and tur = 'sure'`);
    await olarak(c, x);
    const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'sure')`);
    assert.match(hata, /yetersiz joker/i);
  });
});
