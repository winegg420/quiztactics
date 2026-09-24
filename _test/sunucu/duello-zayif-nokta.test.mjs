// Düello zayıf nokta kuralı + kategori limiti — migration 470 (Ida, 24 Eyl 2026).
//
// NE KORUYOR:
//  1. ZAYIF NOKTA maç başında sabitlenir: ≥ 5 cevaplı kategoriler arasından doğru oranı en düşük;
//     yoksa null (yeni hesap / 4 cevap → zayıf yok). İki tarafın duello_durum'unda görünür.
//  2. KURAL: saldıran savunanın zayıfını seçer + savunan doğru → saldıran 1 can kaybeder (ikisi doğru
//     olsa da); ikisi yanlış → kimse; yalnız saldıran doğru → savunan. Zayıf olmayan kategoride normal.
//  3. LİMİT: kategori maçta en çok 3 kez; maçtaki bir önceki seçim tekrar seçilemez; sunucu reddeder.
//  4. OTOMATİK SEÇİM savunanın zayıfını (başka seçenek varken) seçmez; bot seçimi uygunluğa uyar.
//
// Yalnız migration provasında çalışır:  node oyun/_test/duello2-zayif-db-calistir.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, sunucuOlarak, ayarla, hataVerir, baglantiVarMi, alintila as a } from './yardim.mjs';

const prova = Boolean(process.env.TEST_ONCE_SQL?.endsWith('_duello_zayif_nokta.sql'));
const sec = { skip: !(await baglantiVarMi()) || !prova ? 'yalnız 470 migration provasında çalışır' : false };

const KATLAR = ['bilim', 'cografya', 'edebiyat', 'genel_kultur', 'muzik', 'sanat', 'sinema', 'spor', 'tarih', 'teknoloji'];

async function istatistik(c, u, tablo) {
  for (const [k, [dogru, toplam]] of Object.entries(tablo)) {
    await c.sorgu(`insert into public.kategori_istatistik (user_id, kategori, dogru, toplam)
                   values (${a(u)}, ${a(k)}, ${dogru}, ${toplam})
                   on conflict (user_id, kategori) do update set dogru = excluded.dogru, toplam = excluded.toplam`);
  }
}

const satir = async (c, id) => JSON.parse(await c.tek(`select to_jsonb(d)::text from public.duellolar d where d.id = ${a(id)}`));
const durum = async (c, id, u) => { await olarak(c, u); return JSON.parse(await c.tek(`select public.duello_durum(${a(id)})::text`)); };
const dogruCevap = async (c, id) => Number(await c.tek(`select q.dogru_cevap from public.duellolar d join public.questions q on q.id = d.soru_id where d.id = ${a(id)}`));
const cevapla = async (c, id, u, n) => { await olarak(c, u); return c.sorgu(`select public.duello_cevap(${a(id)}, ${n}::smallint)`); };
const ilerlet = async (c, id) => { await sunucuOlarak(c); await c.sorgu(`select public.duello_ilerlet(${a(id)})`); };
const katSec = async (c, id, u, k) => { await olarak(c, u); return c.sorgu(`select public.duello_kategori_sec(${a(id)}, ${a(k)})`); };

async function kur(c) {
  await ayarla(c, 'duello_surum', 2);
  const x = await oyuncuKur(c, 'zna');
  const y = await oyuncuKur(c, 'znb');
  // x'in zayıfı tarih (%20), y'nin zayıfı bilim (%10); diğerleri güçlü.
  const temel = Object.fromEntries(KATLAR.map((k) => [k, [8, 10]]));
  await istatistik(c, x, { ...temel, tarih: [2, 10], spor: [0, 4] });   // spor 4 cevap: sayılmaz
  await istatistik(c, y, { ...temel, bilim: [1, 10] });
  const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
  const d = await satir(c, id);
  const zayif = { [x]: 'tarih', [y]: 'bilim' };
  return { id, o1: d.oyuncu1, o2: d.oyuncu2, zayif };
}

/** Saldıran k'yi seçer, iki oyuncu verilen doğruluklarla cevaplar, soru çözümlenir. */
async function tur(c, id, saldiran, savunan, k, salDogru, savDogru) {
  await katSec(c, id, saldiran, k);
  const dc = await dogruCevap(c, id);
  await cevapla(c, id, saldiran, salDogru ? dc : (dc + 1) % 4);
  await cevapla(c, id, savunan, savDogru ? dc : (dc + 1) % 4);
  const d = await satir(c, id);
  assert.equal(d.faz, 'sonuc');
  return d;
}
async function sonucuBitir(c, id) {
  await c.sorgu(`update public.duellolar set faz_bitis = now() - interval '1 second' where id = ${a(id)}`);
  await ilerlet(c, id);
}

test('zayıf nokta: yeni hesapta yok, 4 cevaplı kategori sayılmaz, ≥5 cevaplıların en düşüğü', sec, async () => {
  await islem(async (c) => {
    const yeni = await oyuncuKur(c, 'zny');
    assert.equal(await c.tek(`select public.duello2_en_zayif(${a(yeni)})`), null);
    await istatistik(c, yeni, { spor: [0, 4] });
    assert.equal(await c.tek(`select public.duello2_en_zayif(${a(yeni)})`), null, '4 cevap yetmez');
    await istatistik(c, yeni, { spor: [0, 5], tarih: [1, 5] });
    assert.equal(await c.tek(`select public.duello2_en_zayif(${a(yeni)})`), 'spor');

    // Yeni hesapla maç: onun zayıfı null → iki tarafın durumunda da zayıf yok.
    const { id, o1, o2 } = await kur(c);
    const d1 = await durum(c, id, o1);
    const d2 = await durum(c, id, o2);
    for (const ds of [d1, d2]) {
      const z = Object.fromEntries(ds.oyuncular.map((o) => [o.id, o.profil?.zayif ?? null]));
      assert.equal(Object.values(z).sort().join(','), 'bilim,tarih', 'iki taraf da iki zayıfı görür');
    }
    const t = await oyuncuKur(c, 'znt');
    const id2 = await c.tek(`select public.duello_olustur(${a(t)}, ${a(o1)}, true, null)`);
    const ds = await durum(c, id2, o1);
    const tp = ds.oyuncular.find((o) => o.id === t);
    assert.equal(tp.profil.zayif ?? null, null, 'yeni hesapta zayıf kategori yok');
  });
});

test('kural: zayıfa saldırı + savunan doğru → saldıran kaybeder (ikisi doğruyken de); ikisi yanlış → kimse', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2, zayif } = await kur(c);
    const sonuc = [];

    // Tur 1a: o1, o2'nin zayıfına; İKİSİ DE DOĞRU → o1 (saldıran) 1 can kaybeder.
    let d = await tur(c, id, o1, o2, zayif[o2], true, true);
    assert.equal(d.son_hamle.can_kaybeden, o1);
    assert.equal(d.son_hamle.zayif_saldiri, true);
    sonuc.push(['zayıf · ikisi doğru', d.can1, d.can2]);
    await sonucuBitir(c, id);

    // Tur 1b: o2, o1'in zayıfına; İKİSİ DE YANLIŞ → kimse.
    d = await tur(c, id, o2, o1, zayif[o1], false, false);
    assert.equal(d.son_hamle.can_kaybeden, null);
    assert.equal(d.son_hamle.zayif_saldiri, true);
    sonuc.push(['zayıf · ikisi yanlış', d.can1, d.can2]);
    await sonucuBitir(c, id);

    // Tur 2a: o1, o2'nin zayıfına; saldıran yanlış, savunan doğru → o1 kaybeder.
    d = await tur(c, id, o1, o2, zayif[o2], false, true);
    assert.equal(d.son_hamle.can_kaybeden, o1);
    sonuc.push(['zayıf · yalnız savunan doğru', d.can1, d.can2]);
    await sonucuBitir(c, id);

    // Tur 2b: o2, o1'in zayıfına; yalnız saldıran doğru → savunan (o1) kaybeder (normal kural).
    d = await tur(c, id, o2, o1, zayif[o1], true, false);
    assert.equal(d.son_hamle.can_kaybeden, o1);
    sonuc.push(['zayıf · yalnız saldıran doğru', d.can1, d.can2]);
    assert.equal(d.can1, 0);
    assert.equal(d.can2, 3);

    const hamle = await c.sorgu(`select count(*) filter (where riskli) r, count(*) n from public.duello_hamleler where duello_id = ${a(id)}`);
    assert.equal(Number(hamle[0].r), 4);
    console.log('  zayıf nokta turları (can1/can2):', JSON.stringify(sonuc));
  });
});

test('kural: zayıf olmayan kategoride ikisi doğru → nötr', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    const d = await tur(c, id, o1, o2, 'spor', true, true);
    assert.equal(d.son_hamle.can_kaybeden, null);
    assert.equal(d.son_hamle.zayif_saldiri, false);
    assert.equal(d.can1, 3);
    assert.equal(d.can2, 3);
  });
});

test('limit: arka arkaya seçilemez (iki saldıran arasında da), 4. kez seçilemez; durum pasif gösterir', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await tur(c, id, o1, o2, 'muzik', true, true);
    await sonucuBitir(c, id);
    // o2 aynı kategoriyi hemen seçemez.
    const ds = await durum(c, id, o2);
    assert.ok(!ds.uygun_kategoriler.includes('muzik'));
    assert.equal(ds.kategori_max, 3);
    assert.ok(await hataVerir(c, `select public.duello_kategori_sec(${a(id)}, 'muzik')`), 'arka arkaya reddedilmeli');
    await tur(c, id, o2, o1, 'spor', false, false);
    await sonucuBitir(c, id);
    await tur(c, id, o1, o2, 'muzik', false, false);   // 2.
    await sonucuBitir(c, id);
    await tur(c, id, o2, o1, 'sanat', false, false);
    await sonucuBitir(c, id);
    await tur(c, id, o1, o2, 'muzik', false, false);   // 3.
    await sonucuBitir(c, id);
    await tur(c, id, o2, o1, 'sanat', false, false);
    await sonucuBitir(c, id);
    const d3 = await durum(c, id, o1);
    assert.equal(d3.kategori_sayim.muzik, 3);
    assert.ok(!d3.uygun_kategoriler.includes('muzik'), '3 kez geldi → pasif');
    await olarak(c, o1);
    assert.ok(await hataVerir(c, `select public.duello_kategori_sec(${a(id)}, 'muzik')`), '4. kez reddedilmeli');
  });
});

test('otomatik seçim savunanın zayıfını seçmez; bot seçimi uygunluğa uyar', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2, zayif } = await kur(c);
    await sunucuOlarak(c);
    const n = Number(await c.tek(`select count(*) from generate_series(1, 300) g
                                   where public.duello2_otomatik_kategori(${a(id)}) = ${a(zayif[o2])}`));
    assert.equal(n, 0, 'otomatik seçim 300 denemede zayıfı seçmemeli');

    // Süre dolunca: ilerlet uygun + zayıf olmayan bir kategori açar.
    await c.sorgu(`update public.duellolar set faz_bitis = now() - interval '1 second' where id = ${a(id)}`);
    await ilerlet(c, id);
    const d = await satir(c, id);
    assert.equal(d.faz, 'cevap');
    assert.notEqual(d.kategori, zayif[o2]);

    // Bot seçimi: yalnız uygun kategoriler (o1'i saldıran bot gibi çağır).
    await c.sorgu(`update public.duellolar set faz = 'kategori' where id = ${a(id)}`);
    await c.sorgu(`insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, dogru, surum, uzatma)
                   select ${a(id)}, 1, ${a(o1)}, ${a(o2)}, k, (select id from public.questions where aktif limit 1), false, 2, false
                     from unnest(array['bilim','bilim','bilim','spor','spor','spor','tarih']) k`);
    const kotu = Number(await c.tek(`select count(*) from generate_series(1, 200) g
                                      cross join lateral (select public.duello2_bot_kategori(${a(id)}, ${a(o1)}) k) s
                                      where not public.duello2_kategori_uygun_mu(${a(id)}, s.k)`));
    assert.equal(kotu, 0, 'bot 200 denemede uygun olmayan kategori seçmemeli');
  });
});
