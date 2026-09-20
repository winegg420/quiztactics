// Klasik Mod saldırı jokerleri — Paket 31 A (migration 247).
//
// NE KORUYOR:
//   1. Soru Değiştir Klasik'te ORTAK: iki oyuncu da aynı yeni soruyu, aynı başlangıçla alır.
//   2. Süreyi Kısalt yalnız rakibin süresini kısaltır; basanın süresi aynı kalır.
//   3. Kaldırılan Sis ve Savunma Kilidi sunucuda reddedilir.
//   4. Maç başına 6, tür başına 2, soru başına 1 skill geçerlidir.
//   5. Düello saldırı jokeri ('saldiri_degistir') Klasik'te kabul edilmez.
// Kırılırsa Klasik taktiği ya sahte olur (etki yok) ya da tek taraflı bozulur.

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, skillSetiKur, baglantiVarMi, hataVerir, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

/** Aktif, senkron Klasik maç. */
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

async function joker(c, id, kim, tur, index = 0) {
  await olarak(c, kim);
  return c.tek(`select public.joker_kullan('1v1', ${a(id)}, ${index}, ${a(tur)})::text`);
}

test('Klasik Soru Değiştir yalnız kullananın sorusunu değiştirir', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    await skillSetiKur(c, x, ['soru_degistir']);
    const once = await soru(c, id, y);
    await joker(c, id, x, 'soru_degistir');
    const sx = await soru(c, id, x);
    const sy = await soru(c, id, y);
    assert.notEqual(sx.question_id, once.question_id, 'basanın sorusu değişmeli');
    assert.equal(sy.question_id, once.question_id, 'rakibin sorusu değişmemeli');
    assert.notEqual(sy.question_id, sx.question_id, 'kişisel yeni soru rakibe taşmamalı');
    const surum = Number(await c.tek(`select joker_surum from public.matches where id = ${a(id)}`));
    assert.equal(surum, 0, 'rakibe gereksiz joker sinyali gitmemeli');
  });
});

test('Süreyi Kısalt yalnız rakibin süresini kısaltır', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    await skillSetiKur(c, x, ['zaman_baskisi']);
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

test('Kaldırılan Sis skilli sunucu tarafından reddedilir', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await olarak(c, x);
    const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'sis')`);
    assert.match(hata, /artık aktif değil|maç içinde kullanılamaz/i);
  });
});

test("Klasik'te Savunma Kilidi artık yok; düello türü olarak envanterde duruyor", sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await olarak(c, x);
    const hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'savunma_kilidi')`);
    assert.match(hata, /maç içinde kullanılamaz/i);
    assert.equal(Number(await c.tek(`select adet from public.joker_envanter where user_id = ${a(x)} and tur = 'savunma_kilidi'`)) > 0, true);
  });
});

test('Aktif skill son saniyelerde de kendi sunucu kuralına göre kullanılabilir', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await skillSetiKur(c, x, ['sure']);
    await c.sorgu(`update public.matches set soru_baslangic = now() - interval '10 seconds' where id = ${a(id)}`);
    await joker(c, id, x, 'sure');
  });
});

test('Sis başlangıç stoğu: yeni hesap alır, toplu dağıtım ikinci kez vermez', sec, async () => {
  await islem(async (c) => {
    const adet = Number(await c.tek(`select public.ayar_sayi('baslangic_joker_adet', 2)`));
    const o = await oyuncuKur(c, 'sisyeni');
    assert.equal(Number(await c.tek(`select adet from public.joker_envanter where user_id = ${a(o)} and tur = 'sis'`)), adet);
    await c.sorgu(`select * from public.sis_baslangic_dagit()`);
    const ikinci = (await c.sorgu(`select * from public.sis_baslangic_dagit()`))[0];
    assert.equal(Number(ikinci.oyuncu), 0, 'ikinci çalıştırma kimseye vermemeli');
    assert.equal(Number(await c.tek(`select adet from public.joker_envanter where user_id = ${a(o)} and tur = 'sis'`)), adet, 'yeni hesap çift almamalı');
  });
});

test('Klasik: seçili skiller farklı sorularda çalışır; seçilmeyen ve kaldırılan tür reddedilir', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await skillSetiKur(c, x, ['elli', 'sure', 'zaman_baskisi']);
    await joker(c, id, x, 'elli');
    let hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'sure')`);
    assert.match(hata, /soruda skill hakkını kullandın/i);
    hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 0, 'saldiri_degistir')`);
    assert.match(hata, /artık aktif değil|maç içinde kullanılamaz/i);
    await c.sorgu(`update public.matches set aktif_soru=1,soru_baslangic=now() where id=${a(id)}`);
    await joker(c, id, x, 'sure', 1);
    await c.sorgu(`update public.matches set aktif_soru=2,soru_baslangic=now() where id=${a(id)}`);
    await joker(c, id, x, 'zaman_baskisi', 2);
    await c.sorgu(`update public.matches set aktif_soru=3,soru_baslangic=now() where id=${a(id)}`);
    hata = await hataVerir(c, `select public.joker_kullan('1v1', ${a(id)}, 3, 'soru_degistir')`);
    assert.match(hata, /maç setinde değil/i);
  });
});

test('Rakip cevapladıktan sonra Süreyi Kısalt reddedilir (boşa harcanmaz)', sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    await skillSetiKur(c, x, ['zaman_baskisi']);
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
    assert.ok(['zaman_baskisi', 'soru_degistir'].includes(tur), `bot skill basmalı (${tur})`);
    assert.equal(Number(await c.tek(`select joker_surum from public.matches where id = ${a(id)}`)), tur === 'zaman_baskisi' ? 1 : 0);
    // İkinci tik aynı soruda ikinci joker basmaz
    await c.sorgu(`select public.bot_klasik_joker_tik()`);
    assert.equal(Number(await c.tek(`select count(*) from public.joker_kullanimlari
                                      where mac_id = ${a(id)} and user_id = ${a(bot)}`)), 1);
  });
});
