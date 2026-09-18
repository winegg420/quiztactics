// Klasik Mod saldırı jokerleri — Paket 31 A (migration 247).
//
// NE KORUYOR:
//   1. Soru Değiştir Klasik'te ORTAK: iki oyuncu da aynı yeni soruyu, aynı başlangıçla alır.
//   2. Süreyi Kısalt yalnız rakibin süresini kısaltır; basanın süresi aynı kalır.
//   3. Savunma Kilidi: rakip o soruda hiçbir joker kullanamaz, sunucu açık mesaj verir.
//   4. Maç başına 4 joker ve aynı jokerden bir kez (Paket 27) Klasik'te de geçerli.
//   5. Düello saldırı jokeri ('saldiri_degistir') Klasik'te kabul edilmez.
// Kırılırsa Klasik taktiği ya sahte olur (etki yok) ya da tek taraflı bozulur.

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, hataVerir, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

/** Aktif, senkron Klasik maç (arkadaş DEĞİL → sınır 4). */
async function klasikMac(c) {
  const x = await oyuncuKur(c, 'kj1');
  const y = await oyuncuKur(c, 'kj2');
  const id = await c.tek(
    `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, senkron, basladi,
                                 soru_ids, aktif_soru, soru_baslangic)
     values (${a(x)}, ${a(y)}, 'aktif', true, true, true,
             public.soru_sec(null, 20, array[${a(x)}, ${a(y)}]::uuid[]), 0, now())
     returning id`
  );
  return { x, y, id };
}

async function soru(c, id, kim) {
  await olarak(c, kim);
  return (await c.sorgu(`select question_id, extract(epoch from baslangic)::float8 bas
                           from public.get_match_question(${a(id)})`))[0];
}

async function joker(c, id, kim, tur) {
  await olarak(c, kim);
  return c.tek(`select public.joker_kullan('1v1', ${a(id)}, 0, ${a(tur)})::text`);
}

test('Klasik Soru Değiştir iki oyuncuda da aynı yeni soruyu açar', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    const once = await soru(c, id, y);
    await joker(c, id, x, 'soru_degistir');
    const sx = await soru(c, id, x);
    const sy = await soru(c, id, y);
    assert.notEqual(sx.question_id, once.question_id, 'basanın sorusu değişmeli');
    assert.equal(sy.question_id, sx.question_id, 'rakip AYNI yeni soruyu almalı');
    assert.equal(sy.bas, sx.bas, 'başlangıç ikisinde de aynı olmalı');
    const surum = Number(await c.tek(`select joker_surum from public.matches where id = ${a(id)}`));
    assert.ok(surum >= 1, 'rakibin ekranı için joker_surum artmalı');
  });
});

test('Süreyi Kısalt yalnız rakibin süresini kısaltır', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    const kisalt = Number(await c.tek(`select public.ayar_sayi('klasik_zaman_baskisi_sn', 5)`));
    const bx = (await soru(c, id, x)).bas;
    const by = (await soru(c, id, y)).bas;
    await joker(c, id, x, 'zaman_baskisi');
    assert.equal((await soru(c, id, x)).bas, bx, 'basanın süresi değişmemeli');
    assert.equal(Math.round(by - (await soru(c, id, y)).bas), kisalt, `rakibin başlangıcı ${kisalt} sn geri çekilmeli`);
    await olarak(c, y);
    const d = (await c.sorgu(`select * from public.joker_mac_durumu('1v1', ${a(id)})`))[0];
    assert.equal(d.kisaltildi, 't', 'rakip arayüzü kısaltmayı görmeli');
  });
});

test('Savunma Kilidi: rakip o soruda joker kullanamaz ve açık mesaj alır', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    await joker(c, id, x, 'savunma_kilidi');
    await olarak(c, y);
    const d = (await c.sorgu(`select * from public.joker_mac_durumu('1v1', ${a(id)})`))[0];
    assert.equal(d.kilitli, 't');
    const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'elli')`);
    assert.match(hata, /savunma jokerlerini kilitledi/i);
    // Kilidi basan kendisi etkilenmez
    await olarak(c, x);
    await c.sorgu(`select public.joker_kullan('1v1', ${a(id)}, 0, 'elli')`);
  });
});

test('Klasik: maç başına 4 joker, aynı jokerden bir kez; saldiri_degistir yok', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await joker(c, id, x, 'elli');
    let hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'elli')`);
    assert.match(hata, /zaten kullandın/i);
    hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'saldiri_degistir')`);
    assert.match(hata, /maç içinde kullanılamaz/i);
    await joker(c, id, x, 'sure');
    await joker(c, id, x, 'zaman_baskisi');
    await joker(c, id, x, 'savunma_kilidi');
    hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'soru_degistir')`);
    assert.match(hata, /en fazla 4 joker/i);
  });
});

test('Rakip cevapladıktan sonra Süreyi Kısalt reddedilir (boşa harcanmaz)', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    await olarak(c, y);
    await c.sorgu(`select * from public.submit_match_answer(${a(id)}, 0::smallint)`);
    await olarak(c, x);
    const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'zaman_baskisi')`);
    assert.match(hata, /zaten cevapladı/i);
  });
});

test('Bot simetrisi: Klasik maçta bot da saldırı jokeri basar, insanı etkiler', sec, async () => {
  await islem(async (c) => {
    const insan = await oyuncuKur(c, 'kjinsan');
    const bot = await oyuncuKur(c, 'kjbot', { is_bot: true, bot_turu: 'gizli' });
    await c.sorgu(`update public.oyun_ayarlari set deger = '100'::jsonb where anahtar = 'klasik_bot_joker_yuzde'`);
    // Sorunun 9.5. saniyesi: botun joker penceresi (2–8 sn arası sabit an, 10 sn'ye kadar) açık
    const id = await c.tek(
      `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, senkron, basladi,
                                   soru_ids, aktif_soru, soru_baslangic)
       values (${a(insan)}, ${a(bot)}, 'aktif', true, true, true,
               public.soru_sec(null, 20, array[${a(insan)}]::uuid[]), 0, now() - interval '9.5 seconds')
       returning id`
    );
    await c.sorgu(`select public.bot_klasik_joker_tik()`);
    const tur = await c.tek(`select tur from public.joker_kullanimlari
                              where mac_tur = '1v1' and mac_id = ${a(id)} and user_id = ${a(bot)}`);
    assert.ok(['zaman_baskisi', 'savunma_kilidi', 'soru_degistir'].includes(tur), `bot joker basmalı (${tur})`);
    assert.equal(Number(await c.tek(`select joker_surum from public.matches where id = ${a(id)}`)), 1);
    // İkinci tik aynı soruda ikinci joker basmaz
    await c.sorgu(`select public.bot_klasik_joker_tik()`);
    assert.equal(Number(await c.tek(`select count(*) from public.joker_kullanimlari
                                      where mac_id = ${a(id)} and user_id = ${a(bot)}`)), 1);
  });
});
