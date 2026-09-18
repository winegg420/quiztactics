// Direkt mesajlar — Paket 35 E (migration 253).
//
// NE KORUYOR:
//   1. Karşılıklı arkadaşlar mesajlaşır; sohbet listesi son mesajı ve okunmamışı verir.
//   2. Arkadaş olmayana (istek bekleyen dahil) mesaj REDDEDİLİR — kontrol sunucuda.
//   3. Arkadaşlıktan çıkınca yeni mesaj reddedilir, eski mesajlar okunabilir kalır.
//   4. Boş / 500 karakterden uzun mesaj okunur bir hatayla reddedilir; kendine mesaj yok.
//   5. Okunmamış sayısı mesajla artar, dm_okundu ile sıfırlanır.
//   6. Tabloya doğrudan yazma kapalı (authenticated rolünün insert yetkisi yok).

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, hataVerir, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

async function arkadasYap(c, x, y) {
  await c.sorgu(`insert into public.friendships (requester, addressee, durum) values (${a(x)}, ${a(y)}, 'arkadas')`);
}

test('arkadaşlar mesajlaşır; liste, sayfalama ve okunmamış sayımı', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'dm1');
    const y = await oyuncuKur(c, 'dm2');
    await arkadasYap(c, x, y);
    await olarak(c, x);
    await c.sorgu(`select public.dm_gonder(${a(y)}, '  Merhaba 👋  ')`);
    // Tek işlemde now() sabit: sıralama sınanabilsin diye ilk mesaj 1 sn geriye alınır
    await c.sorgu(`update public.direkt_mesajlar set created_at = now() - interval '1 second' where gonderen_id = ${a(x)}`);
    await c.sorgu(`select public.dm_gonder(${a(y)}, 'İkinci')`);
    await olarak(c, y);
    assert.equal(Number(await c.tek(`select public.dm_okunmamis_sayim()`)), 2);
    const liste = await c.sorgu(`select * from public.dm_sohbetlerim()`);
    assert.equal(liste.length, 1);
    assert.equal(liste[0].kisi_id, x);
    assert.equal(liste[0].son_metin, 'İkinci');
    assert.equal(Number(liste[0].okunmamis), 2);
    assert.equal(liste[0].arkadas, 't');
    const mesajlar = await c.sorgu(`select metin from public.dm_sohbet(${a(x)}, 50, null)`);
    assert.deepEqual(mesajlar.map((m) => m.metin), ['İkinci', 'Merhaba 👋'], 'yeniden eskiye, kırpılmış');
    const once = await c.sorgu(`select metin from public.dm_sohbet(${a(x)}, 1, null)`);
    assert.equal(once.length, 1);
    assert.equal(Number(await c.tek(`select public.dm_okundu(${a(x)})`)), 2);
    assert.equal(Number(await c.tek(`select public.dm_okunmamis_sayim()`)), 0);
  });
});

test('arkadaş olmayana mesaj reddedilir (bekleyen istek de arkadaşlık değildir)', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'dm3');
    const y = await oyuncuKur(c, 'dm4');
    await olarak(c, x);
    assert.match(await hataVerir(c, `select public.dm_gonder(${a(y)}, 'selam')`), /Yalnız arkadaşlarına/);
    await c.sorgu(`insert into public.friendships (requester, addressee) values (${a(x)}, ${a(y)})`);
    assert.match(await hataVerir(c, `select public.dm_gonder(${a(y)}, 'selam')`), /Yalnız arkadaşlarına/);
    assert.match(await hataVerir(c, `select public.dm_gonder(${a(x)}, 'selam')`), /Kendine mesaj/);
  });
});

test('uzun ve boş mesaj okunur hatayla reddedilir; arkadaşlıktan çıkınca yeni mesaj yok, eskisi okunur', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'dm5');
    const y = await oyuncuKur(c, 'dm6');
    await arkadasYap(c, x, y);
    await olarak(c, x);
    assert.match(await hataVerir(c, `select public.dm_gonder(${a(y)}, ${a('a'.repeat(501))})`), /en fazla 500/);
    assert.match(await hataVerir(c, `select public.dm_gonder(${a(y)}, '   ')`), /boş olamaz/);
    await c.sorgu(`select public.dm_gonder(${a(y)}, ${a('b'.repeat(500))})`);
    await c.sorgu(`delete from public.friendships where requester = ${a(x)} and addressee = ${a(y)}`);
    assert.match(await hataVerir(c, `select public.dm_gonder(${a(y)}, 'hâlâ?')`), /Yalnız arkadaşlarına/);
    await olarak(c, y);
    assert.equal((await c.sorgu(`select id from public.dm_sohbet(${a(x)}, 50, null)`)).length, 1);
    const liste = await c.sorgu(`select arkadas from public.dm_sohbetlerim()`);
    assert.equal(liste[0].arkadas, 'f');
  });
});

test('istemci rolü tabloya doğrudan yazamaz; yalnız kendi sohbetini görür', sec, async () => {
  await islem(async (c) => {
    assert.equal(await c.tek(`select has_table_privilege('authenticated', 'public.direkt_mesajlar', 'insert')`), 'f');
    assert.equal(await c.tek(`select has_table_privilege('authenticated', 'public.direkt_mesajlar', 'update')`), 'f');
    assert.equal(await c.tek(`select has_table_privilege('authenticated', 'public.direkt_mesajlar', 'delete')`), 'f');
    const x = await oyuncuKur(c, 'dm7');
    const y = await oyuncuKur(c, 'dm8');
    const z = await oyuncuKur(c, 'dm9');
    await arkadasYap(c, x, y);
    await olarak(c, x);
    await c.sorgu(`select public.dm_gonder(${a(y)}, 'gizli')`);
    await olarak(c, z);
    assert.equal((await c.sorgu(`select id from public.dm_sohbet(${a(x)}, 50, null)`)).length, 0);
    assert.equal((await c.sorgu(`select * from public.dm_sohbetlerim()`)).length, 0);
  });
});
