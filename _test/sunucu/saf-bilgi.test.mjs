// Saf Bilgi (jokersiz Klasik Mod) — Paket 31 B (migration 248).
//
// NE KORUYOR:
//   1. Jokersiz maçta sunucu HER jokeri reddeder (yeni ve eski yol).
//   2. Kuyrukta jokerli ve jokersiz oyuncu birbirine eşleşmez; aynı bayraklılar eşleşir.
//   3. Meydan okuma / bot maçı bayrağı taşır; eski istemci (bayraksız) Klasik açar.
//   4. Tek imza: eski 2/3 parametreli imzalar kalmadı (HTTP 300 tekrarlanmasın).

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, hataVerir, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

test('jokersiz maçta her joker reddedilir', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'sb1');
    const y = await oyuncuKur(c, 'sb2');
    const id = await c.tek(
      `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, senkron, basladi, jokersiz,
                                   soru_ids, aktif_soru, soru_baslangic)
       values (${a(x)}, ${a(y)}, 'aktif', true, true, true, true,
               public.soru_sec(null, 20, array[${a(x)}]::uuid[]), 0, now())
       returning id`
    );
    await olarak(c, x);
    for (const tur of ['elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'savunma_kilidi']) {
      const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, ${a(tur)})`);
      assert.match(hata, /bu modda joker kullanılamaz/i, tur);
    }
    const eski = await hataVerir(c, `select public.use_joker(${a(id)}, 'elli')`);
    assert.match(eski, /bu modda joker kullanılamaz/i, 'eski use_joker yolu da kapalı');
  });
});

test('kuyruk: jokerli ve jokersiz oyuncu eşleşmez, aynı bayraklılar eşleşir', sec, async () => {
  await islem(async (c) => {
    const [x, y, z] = [await oyuncuKur(c, 'sbk1'), await oyuncuKur(c, 'sbk2'), await oyuncuKur(c, 'sbk3')];
    // Aynı seviye ve kategori: yalnız jokersiz bayrağı ayırsın
    await c.sorgu(`update public.profiles set puan = 0, tercih_kategori = null where id in (${a(x)}, ${a(y)}, ${a(z)})`);
    await olarak(c, x);
    assert.equal(await c.tek(`select public.kuyruga_gir(null, true, true)`), null, 'x jokersiz kuyrukta bekler');
    await olarak(c, y);
    assert.equal(await c.tek(`select public.kuyruga_gir(null, true, false)`), null, 'jokerli y, jokersiz x ile eşleşmemeli');
    await olarak(c, z);
    const mac = await c.tek(`select public.kuyruga_gir(null, true, true)`);
    assert.ok(mac, 'jokersiz z, jokersiz x ile eşleşmeli');
    assert.equal(await c.tek(`select jokersiz from public.matches where id = ${a(mac)}`), 't');
    assert.equal(await c.tek(`select ${a(x)} in (oyuncu1, oyuncu2) from public.matches where id = ${a(mac)}`), 't');
  });
});

test('meydan okuma bayrağı taşır; bayraksız çağrı Klasik açar', sec, async () => {
  await islem(async (c) => {
    const [x, y] = [await oyuncuKur(c, 'sbc1'), await oyuncuKur(c, 'sbc2')];
    await c.sorgu(`insert into public.friendships (requester, addressee, durum) values (${a(x)}, ${a(y)}, 'arkadas')`);
    await olarak(c, x);
    const m1 = await c.tek(`select public.create_challenge(p_rakip => ${a(y)}, p_jokersiz => true)`);
    assert.equal(await c.tek(`select jokersiz from public.matches where id = ${a(m1)}`), 't');
    await c.sorgu(`update public.matches set durum = 'bitti' where id = ${a(m1)}`);
    const m2 = await c.tek(`select public.create_challenge(p_rakip => ${a(y)})`);
    assert.equal(await c.tek(`select jokersiz from public.matches where id = ${a(m2)}`), 'f');
  });
});

test('eşleştirme RPC\'lerinde tek imza kaldı', sec, async () => {
  await islem(async (c) => {
    const r = await c.sorgu(
      `select p.proname, count(*)::int n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public'
          and p.proname in ('kuyruga_gir','quick_match','hemen_bot_mac','hemen_bot_mac_sec','create_challenge')
        group by 1`
    );
    for (const s of r) assert.equal(Number(s.n), 1, `${s.proname} tek imza olmalı`);
    assert.equal(r.length, 5);
  });
});
