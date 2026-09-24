// Düello 1.0 (surum = 2) sunucu kuralları — migration 268.
//
// NE KORUYOR:
//  1. BAYRAK: duello_surum varsayılan 1; bayrak 1 iken maçlar eski akışta açılır.
//  2. AYNI SORU AYNI ANDA: soru iki oyuncuya birlikte açılır, saldıran önceden görmez;
//     rakibin CEVAPLADIĞI görünür, NE cevapladığı görünmez.
//  3. SİMETRİK CAN TABLOSU: yalnız biri doğruysa öteki 1 can kaybeder; ikisi doğru ya da
//     ikisi yanlış nötr. Süre dolan "Yanıtsız" olur ve doğru sayılmaz.
//  4. MAÇ YAPISI: kategori maçta en çok 2 kez; tur çift hâlinde biter; can eşitse uzatma,
//     uzatmada kategori sınırı yok; biri doğru öteki yanlış yapınca maç biter.
//  5. SKILL: maçta 4, aynı skill 2, aynı soruda 1; Sigorta/2X yok; uzatmada hak yenilenmez;
//     Soru Değiştir rakip o soruda skill kullandıysa ya da cevap verildiyse kilitli.
//  6. YARIŞ: her eylem satırı FOR UPDATE ile kilitler; soru bir kez çözümlenir, ikinci
//     cevap / geç cevap / çözümden sonra cevap reddedilir.
//
// Yalnız migration provasında çalışır:  npm run test:duello2

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, sunucuOlarak, skillSetiKur, hataVerir, ayarla, baglantiVarMi, alintila as a } from './yardim.mjs';

const prova = Boolean(process.env.TEST_ONCE_SQL?.endsWith('20260612000268_duello_v2_sunucu.sql'));
const sec = { skip: !(await baglantiVarMi()) || !prova ? 'yalnız 268 migration provasında çalışır (npm run test:duello2)' : false };

const SET = ['elli', 'sure', 'zaman_baskisi'];

async function kur(c, { skiller = SET } = {}) {
  await ayarla(c, 'duello_surum', 2);
  const x = await oyuncuKur(c, 'd2a');
  const y = await oyuncuKur(c, 'd2b');
  for (const u of [x, y]) {
    await skillSetiKur(c, u, skiller);
    for (const t of ['elli', 'sure', 'zaman_baskisi', 'soru_degistir', 'ikinci_sans']) {
      await c.sorgu(`insert into public.joker_envanter (user_id, tur, adet) values (${a(u)}, ${a(t)}, 9)
                     on conflict (user_id, tur) do update set adet = excluded.adet`);
    }
  }
  const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
  const d = await satir(c, id);
  return { id, o1: d.oyuncu1, o2: d.oyuncu2 };   // o1 = ilk turun saldıranı
}

// to_jsonb: pg-mini metin döndürür; boolean/jsonb kolonlar tipli gelsin.
const satir = async (c, id) => JSON.parse(await c.tek(`select to_jsonb(d)::text from public.duellolar d where d.id = ${a(id)}`));
const durum = async (c, id, u) => { await olarak(c, u); return JSON.parse(await c.tek(`select public.duello_durum(${a(id)})::text`)); };
const dogruCevap = async (c, id) => Number(await c.tek(`select q.dogru_cevap from public.duellolar d join public.questions q on q.id = d.soru_id where d.id = ${a(id)}`));
const cevapla = async (c, id, u, n) => { await olarak(c, u); return c.sorgu(`select public.duello_cevap(${a(id)}, ${n}::smallint)`); };
const ilerlet = async (c, id) => { await sunucuOlarak(c); await c.sorgu(`select public.duello_ilerlet(${a(id)})`); };
const hamleSayisi = async (c, id) => Number(await c.tek(`select count(*) from public.duello_hamleler where duello_id = ${a(id)}`));
const skill = async (c, id, u, tur) => { await olarak(c, u); return c.sorgu(`select public.duello_savunma_jokeri(${a(id)}, ${a(tur)})`); };
const skillHata = async (c, id, u, tur) => { await olarak(c, u); return hataVerir(c, `select public.duello_savunma_jokeri(${a(id)}, ${a(tur)})`); };

/** Saldıran uygun ilk kategoriyi seçer; soru iki oyuncuya açılır. */
async function soruAc(c, id) {
  const d = await satir(c, id);
  const ds = await durum(c, id, d.saldiran);
  const kat = ds.uygun_kategoriler[0];
  await olarak(c, d.saldiran);
  await c.sorgu(`select public.duello_kategori_sec(${a(id)}, ${a(kat)})`);
  return kat;
}

/** Sonuç fazının süresini bitirip bir sonraki adıma geçirir. */
async function sonucuBitir(c, id) {
  await c.sorgu(`update public.duellolar set faz_bitis = now() - interval '1 second' where id = ${a(id)}`);
  await ilerlet(c, id);
}

/** Skill testleri için: aynı maçta verilen indeksteki soruyu doğrudan açık hâle getirir. */
async function soruyaGec(c, id, tur, sira) {
  await c.sorgu(`update public.duellolar set tur = ${tur}, saldiri_sirasi = ${sira}, faz = 'cevap', cevaplar = '{}'::jsonb,
                   bitis1 = now() + interval '15 seconds', bitis2 = now() + interval '15 seconds',
                   faz_bitis = now() + interval '15 seconds', elli1 = null, elli2 = null
                 where id = ${a(id)}`);
}

// ---------------------------------------------------------------- bayrak

test('bayrak varsayılan 1: yeni düello eski akışta açılır', sec, async () => {
  await islem(async (c) => {
    assert.equal(Number(await c.tek(`select public.ayar_sayi('duello_surum', 0)`)), 1);
    const x = await oyuncuKur(c, 'eski1');
    const y = await oyuncuKur(c, 'eski2');
    const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
    const d = await satir(c, id);
    assert.equal(Number(d.surum), 1);
    assert.equal(d.saldiran, x, 'eski akışta ilk saldıran davet eden');
    const kat = await c.tek(`select k from unnest(public.duello_kategorileri()) k limit 1`);
    await olarak(c, x);
    await c.sorgu(`select public.duello_kategori_sec(${a(id)}, ${a(kat)})`);
    assert.equal((await satir(c, id)).faz, 'hazirlik', 'eski akış Saldırı Hazırlığı fazına geçer');
  });
});

test('surum 2: ilk saldıran rastgele, kategori süresi 8 sn', sec, async () => {
  await islem(async (c) => {
    await ayarla(c, 'duello_surum', 2);
    const x = await oyuncuKur(c, 'r1');
    const y = await oyuncuKur(c, 'r2');
    const ilkler = new Set();
    for (let i = 0; i < 24; i++) {
      const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
      const d = await satir(c, id);
      assert.equal(Number(d.surum), 2);
      assert.equal(d.faz, 'kategori');
      assert.equal(Number(await c.tek(`select extract(epoch from faz_bitis - now())::int from public.duellolar where id = ${a(id)}`)), 8);
      ilkler.add(d.saldiran);
      await c.sorgu(`update public.duellolar set durum = 'iptal' where id = ${a(id)}`);
    }
    assert.equal(ilkler.size, 2, '24 maçta iki oyuncu da en az bir kez ilk saldıran olmalı');
  });
});

// ---------------------------------------------------------------- aynı soru aynı anda

test('soru iki oyuncuya aynı anda açılır; saldıran önceden görmez', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    assert.equal((await durum(c, id, o1)).soru, null, 'kategori fazında saldıran soruyu görmez');
    await soruAc(c, id);
    const d = await satir(c, id);
    assert.equal(d.faz, 'cevap', 'hazırlık fazı yok: doğrudan cevap');
    assert.equal(String(d.bitis1), String(d.bitis2), 'süre ikisi için aynı anda başlar');
    const s1 = await durum(c, id, o1);
    const s2 = await durum(c, id, o2);
    assert.ok(s1.soru?.soru);
    assert.equal(s1.soru.soru, s2.soru.soru, 'aynı soru');
    assert.equal(s1.sureler.cevap, 15);
  });
});

test('rakibin cevapladığı görünür, ne cevapladığı görünmez', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await soruAc(c, id);
    await cevapla(c, id, o1, await dogruCevap(c, id));
    const s2 = await durum(c, id, o2);
    assert.equal(s2.cevap.rakip_cevapladi, true);
    assert.equal(s2.cevap.ben_cevapladim, false);
    assert.equal(s2.cevap.benim_cevabim, null);
    assert.equal('cevaplar' in s2, false, 'ham cevap tablosu istemciye gitmez');
    assert.equal(s2.son_hamle, null, 'çözümlenmeden sonuç yok');
    const s1 = await durum(c, id, o1);
    assert.equal(s1.cevap.ben_cevapladim, true);
  });
});

// ---------------------------------------------------------------- simetrik can tablosu

for (const [ad, salDogru, savDogru, kaybeden] of [
  ['saldıran doğru / savunan yanlış → savunan −1', true, false, 'o2'],
  ['saldıran yanlış / savunan doğru → saldıran −1', false, true, 'o1'],
  ['ikisi doğru → nötr', true, true, null],
  ['ikisi yanlış → nötr', false, false, null],
]) {
  test(`can tablosu: ${ad}`, sec, async () => {
    await islem(async (c) => {
      const k = await kur(c);
      const { id, o1, o2 } = k;
      await soruAc(c, id);
      const dc = await dogruCevap(c, id);
      await cevapla(c, id, o1, salDogru ? dc : (dc + 1) % 4);
      await cevapla(c, id, o2, savDogru ? dc : (dc + 1) % 4);
      const d = await satir(c, id);
      assert.equal(d.faz, 'sonuc', 'iki cevap gelince soru hemen çözümlenir');
      assert.equal(Number(d.can1), kaybeden === 'o1' ? 2 : 3);
      assert.equal(Number(d.can2), kaybeden === 'o2' ? 2 : 3);
      const sh = JSON.parse(JSON.stringify(d.son_hamle));
      assert.equal(sh.can_kaybeden, kaybeden ? k[kaybeden] : null);
      assert.equal(sh.cevaplar[o1].dogru, salDogru);
      assert.equal(sh.cevaplar[o2].dogru, savDogru);
    });
  });
}

test('Yanıtsız: süre dolunca doğru sayılmaz, etiket ayrı; maç sonunda doğru cevapla gelir', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await soruAc(c, id);
    const dc = await dogruCevap(c, id);
    await cevapla(c, id, o1, dc);
    await ilerlet(c, id);
    assert.equal((await satir(c, id)).faz, 'cevap', 'süre dolmadan çözümlenmez');

    await c.sorgu(`update public.duellolar set bitis2 = now() - interval '2 seconds' where id = ${a(id)}`);
    await ilerlet(c, id);
    const d = await satir(c, id);
    assert.equal(d.faz, 'sonuc');
    const sh = d.son_hamle;
    assert.equal(sh.cevaplar[o2].yanitsiz, true);
    assert.equal(sh.cevaplar[o2].dogru, false);
    assert.equal(sh.cevaplar[o1].yanitsiz, false);
    assert.equal(sh.can_kaybeden, o2, 'Yanıtsız can tablosunda "doğru değil" sayılır');

    await c.sorgu(`select public.duello_bitir(${a(id)}, ${a(o1)})`);
    const son = await durum(c, id, o2);
    assert.equal(son.gecmis.length, 1);
    assert.equal(son.gecmis[0].ben_yanitsiz, true, '"şık işaretlenmedi" bilgisi');
    assert.equal(son.gecmis[0].benim_cevabim, null);
    assert.equal(son.gecmis[0].dogru_cevap, dc);
  });
});

test('ikisi de yanıtsız → nötr', sec, async () => {
  await islem(async (c) => {
    const { id } = await kur(c);
    await soruAc(c, id);
    await c.sorgu(`update public.duellolar set bitis1 = now() - interval '2 seconds', bitis2 = now() - interval '2 seconds' where id = ${a(id)}`);
    await ilerlet(c, id);
    const d = await satir(c, id);
    assert.equal(d.faz, 'sonuc');
    assert.equal(d.son_hamle.can_kaybeden, null);
    assert.equal(Number(d.can1) + Number(d.can2), 6);
  });
});

// ---------------------------------------------------------------- kategori ve maç yapısı

test('kategori maçta en çok 2 kez (iki oyuncu birlikte), üst üste gelmez', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await ayarla(c, 'duello_kategori_max', 2);   // 470'ten beri canlıda 3; bu test 268 kuralını (2) sınar
    const [k1, k2] = (await c.sorgu(`select k from unnest(public.duello_kategorileri()) k limit 2`)).map((r) => r.k);
    const uygun = async (k) => (await c.tek(`select public.duello2_kategori_uygun_mu(${a(id)}, ${a(k)})`)) === 't';
    const hamle = (sal, sav, k) => c.sorgu(`insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, dogru, surum)
                                             values (${a(id)}, 1, ${a(sal)}, ${a(sav)}, ${a(k)}, true, 2)`);
    await hamle(o1, o2, k1);
    assert.equal(await uygun(k1), false, 'üst üste gelmez');
    await hamle(o2, o1, k2);
    assert.equal(await uygun(k1), true, 'bir kez kullanıldı, araya başka girdi');
    await hamle(o2, o1, k1);   // bu kez ÖTEKİ oyuncu saldırdı
    await hamle(o1, o2, k2);
    assert.equal(await uygun(k1), false, 'k1 maçta 2 kez kullanıldı — kim saldırdıysa');
    await olarak(c, o1);
    const hata = await hataVerir(c, `select public.duello_kategori_sec(${a(id)}, ${a(k1)})`);
    assert.match(hata, /seçilemez/);
  });
});

test('tur çift hâlinde tamamlanır; can eşitse uzatma açılır', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await c.sorgu(`update public.duellolar set can1 = 1, can2 = 1 where id = ${a(id)}`);
    await soruAc(c, id);
    let dc = await dogruCevap(c, id);
    await cevapla(c, id, o1, dc);
    await cevapla(c, id, o2, (dc + 1) % 4);
    assert.equal(Number((await satir(c, id)).can2), 0);
    await sonucuBitir(c, id);
    let d = await satir(c, id);
    assert.equal(d.durum, 'aktif', 'ilk saldırıdan sonra can bitse de çiftin ikinci saldırısı oynanır');
    assert.equal(d.faz, 'kategori');
    assert.equal(d.saldiran, o2);

    await soruAc(c, id);
    dc = await dogruCevap(c, id);
    await cevapla(c, id, o2, dc);
    await cevapla(c, id, o1, (dc + 1) % 4);
    await sonucuBitir(c, id);
    d = await satir(c, id);
    assert.equal(d.durum, 'aktif', 'can 0-0 eşit: beraberlik yok');
    assert.equal(d.uzatma, true);
    assert.equal(d.faz, 'cevap', 'uzatmada kategori fazı yok, soru doğrudan açılır');
  });
});

test('son turda can farklıysa uzatmasız biter', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await c.sorgu(`update public.duellolar set tur = public.ayar_sayi('duello_max_tur', 10), saldiri_sirasi = 1,
                     saldiran = oyuncu2, can1 = 3, can2 = 2 where id = ${a(id)}`);
    await soruAc(c, id);
    const dc = await dogruCevap(c, id);
    await cevapla(c, id, o1, dc);
    await cevapla(c, id, o2, dc);
    await sonucuBitir(c, id);
    const d = await satir(c, id);
    assert.equal(d.durum, 'bitti');
    assert.equal(d.kazanan, o1);
    assert.equal(d.uzatma, false);
  });
});

test('uzatma: kategori 2 kez sınırı uygulanmaz; biri doğru öteki yanlış yapana kadar sürer', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    // Bütün kategoriler 2 kez kullanılmış: normal turda hiçbiri seçilemez.
    await c.sorgu(`insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, dogru, surum)
                   select ${a(id)}, 1, ${a(o1)}, ${a(o2)}, k, true, 2
                     from unnest(public.duello_kategorileri()) k, generate_series(1, 2)`);
    assert.equal(Number(await c.tek(`select count(*) from unnest(public.duello_kategorileri()) k
                                       where public.duello2_kategori_uygun_mu(${a(id)}, k)`)), 0);
    await c.sorgu(`update public.duellolar set tur = public.ayar_sayi('duello_max_tur', 10), saldiri_sirasi = 1,
                     saldiran = oyuncu2, can1 = 2, can2 = 2, faz = 'sonuc', faz_bitis = now() - interval '1 second',
                     son_hamle = '{}'::jsonb where id = ${a(id)}`);
    await ilerlet(c, id);
    let d = await satir(c, id);
    assert.equal(d.uzatma, true);
    assert.equal(d.faz, 'cevap');
    assert.ok(d.soru_id, 'kategori sınırı dolu olsa da uzatma sorusu açılır');

    // İkisi de doğru → maç sürer
    let dc = await dogruCevap(c, id);
    await cevapla(c, id, o1, dc);
    await cevapla(c, id, o2, dc);
    await sonucuBitir(c, id);
    d = await satir(c, id);
    assert.equal(d.durum, 'aktif');
    assert.equal(d.faz, 'cevap', 'yeni uzatma sorusu');

    // Biri doğru, öteki yanlış → biter
    dc = await dogruCevap(c, id);
    await cevapla(c, id, o1, (dc + 1) % 4);
    await cevapla(c, id, o2, dc);
    await sonucuBitir(c, id);
    d = await satir(c, id);
    assert.equal(d.durum, 'bitti');
    assert.equal(d.kazanan, o2);
  });
});

// ---------------------------------------------------------------- skill sınırları

test('skill: aynı soruda en fazla 1', sec, async () => {
  await islem(async (c) => {
    const { id, o1 } = await kur(c);
    await soruAc(c, id);
    await skill(c, id, o1, 'elli');
    assert.match(await skillHata(c, id, o1, 'sure'), /Bu soruda skill/);
    const s = await durum(c, id, o1);
    assert.equal(s.cevap.elli_kapali.length, 2, '50:50 kendi ekranında iki şık kapatır');
  });
});

test('skill: aynı skill en fazla 2, maçta toplam 4', sec, async () => {
  await islem(async (c) => {
    const { id, o1 } = await kur(c);
    await soruyaGec(c, id, 1, 0); await skill(c, id, o1, 'elli');
    await soruyaGec(c, id, 1, 1); await skill(c, id, o1, 'elli');
    await soruyaGec(c, id, 2, 0);
    assert.match(await skillHata(c, id, o1, 'elli'), /maç hakkın doldu/);
    await skill(c, id, o1, 'sure');
    await soruyaGec(c, id, 2, 1); await skill(c, id, o1, 'sure');
    await soruyaGec(c, id, 3, 0);
    assert.match(await skillHata(c, id, o1, 'zaman_baskisi'), /en fazla 4 skill/);
  });
});

test('skill: Sigorta ve 2X Düello\'da kullanılamaz', sec, async () => {
  await islem(async (c) => {
    const { id, o1 } = await kur(c, { skiller: ['sigorta', 'cifte_puan', 'elli'] });
    await soruAc(c, id);
    await olarak(c, o1);
    assert.match(await hataVerir(c, `select public.skill_hazirla('duello', ${a(id)}, null, 'sigorta')`), /Düello modunda kullanılamaz/);
    assert.match(await hataVerir(c, `select public.skill_al_ve_hazirla('duello', ${a(id)}, null, 'cifte_puan')`), /Düello modunda kullanılamaz/);
  });
});

test('skill: uzatmada hak yenilenmez, kalan hak kullanılabilir', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    for (const [t, s, sk] of [[1, 0, 'elli'], [1, 1, 'elli'], [2, 0, 'sure'], [2, 1, 'sure']]) {
      await soruyaGec(c, id, t, s); await skill(c, id, o1, sk);
    }
    await c.sorgu(`update public.duellolar set uzatma = true where id = ${a(id)}`);
    await soruyaGec(c, id, 11, 0);
    assert.match(await skillHata(c, id, o1, 'zaman_baskisi'), /en fazla 4 skill/, 'o1 dört hakkını bitirdi');
    await skill(c, id, o2, 'elli');   // o2'nin hakkı duruyor
  });
});

test('Ek Süre kendi süreni, Zaman Baskısı rakibin süresini değiştirir', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await soruAc(c, id);
    const fark = async () => (await c.sorgu(`select extract(epoch from bitis1 - now())::int b1, extract(epoch from bitis2 - now())::int b2
                                             from public.duellolar where id = ${a(id)}`))[0];
    await skill(c, id, o1, 'sure');
    assert.deepEqual(await fark(), { b1: '20', b2: '15' });
    await skill(c, id, o2, 'zaman_baskisi');
    assert.deepEqual(await fark(), { b1: '15', b2: '15' }, 'rakibin süresinden 5 sn düşer');
  });
});

test('Zaman Baskısı rakip cevapladıktan sonra kullanılamaz', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await soruAc(c, id);
    await cevapla(c, id, o2, 0);
    assert.match(await skillHata(c, id, o1, 'zaman_baskisi'), /Rakibin bu soruyu zaten cevapladı/);
  });
});

// ---------------------------------------------------------------- Soru Değiştir

test('Soru Değiştir: kategori aynı, yeni soruyu ikisi de görür, süre ikisi için baştan', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c, { skiller: ['soru_degistir', 'elli', 'sure'] });
    await soruAc(c, id);
    await c.sorgu(`update public.duellolar set bitis1 = now() + interval '4 seconds', bitis2 = now() + interval '4 seconds' where id = ${a(id)}`);
    const once = await satir(c, id);
    await skill(c, id, o1, 'soru_degistir');
    const sonra = await satir(c, id);
    assert.notEqual(sonra.soru_id, once.soru_id);
    assert.equal(sonra.kategori, once.kategori);
    assert.equal(Number(await c.tek(`select extract(epoch from bitis2 - now())::int from public.duellolar where id = ${a(id)}`)), 15);
    const s1 = await durum(c, id, o1);
    const s2 = await durum(c, id, o2);
    assert.equal(s1.soru.soru, s2.soru.soru);
  });
});

test('Soru Değiştir: rakip o soruda skill kullandıysa kilitli ve sebebi açıklanır', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c, { skiller: ['soru_degistir', 'elli', 'sure'] });
    await soruAc(c, id);
    await skill(c, id, o2, 'elli');
    const metin = 'Rakibin bu soruda skill kullandı, soru değiştirilemez';
    assert.equal((await durum(c, id, o1)).skill.soru_degistir_kilit, metin);
    const envanter = async () => Number(await c.tek(`select adet from public.joker_envanter where user_id = ${a(o1)} and tur = 'soru_degistir'`));
    const once = await envanter();
    assert.equal(await skillHata(c, id, o1, 'soru_degistir'), metin);
    assert.equal(await envanter(), once, 'reddedilen skill envanterden düşmez');
  });
});

test('Soru Değiştir: bir oyuncu cevapladıktan sonra kilitli', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c, { skiller: ['soru_degistir', 'elli', 'sure'] });
    await soruAc(c, id);
    await cevapla(c, id, o2, 0);
    assert.match(await skillHata(c, id, o1, 'soru_degistir'), /Cevap verildikten sonra/);
  });
});

// ---------------------------------------------------------------- yarış durumları

test('yarış: aynı oyuncu iki kez cevaplayamaz, soru tek kez çözümlenir, geç cevap reddedilir', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await soruAc(c, id);
    await cevapla(c, id, o1, 0);
    await olarak(c, o1);
    assert.match(await hataVerir(c, `select public.duello_cevap(${a(id)}, 1::smallint)`), /zaten cevapladın/);

    await cevapla(c, id, o2, 0);
    for (let i = 0; i < 3; i++) await ilerlet(c, id);
    await durum(c, id, o1);
    await durum(c, id, o2);
    assert.equal(await hamleSayisi(c, id), 1, 'iki cevap + tekrar eden ilerletmeler: tek çözümleme');
    await olarak(c, o2);
    assert.match(await hataVerir(c, `select public.duello_cevap(${a(id)}, 1::smallint)`), /Şu an cevap verilemez/);
    assert.match(await skillHata(c, id, o2, 'elli'), /soru açıkken/, 'çözümden sonra skill yok');
  });
});

test('yarış: süresi biten oyuncunun cevabı reddedilir, rakibinki kabul edilir', sec, async () => {
  await islem(async (c) => {
    const { id, o1, o2 } = await kur(c);
    await soruAc(c, id);
    await c.sorgu(`update public.duellolar set bitis1 = now() - interval '2 seconds' where id = ${a(id)}`);
    await olarak(c, o1);
    assert.match(await hataVerir(c, `select public.duello_cevap(${a(id)}, 0::smallint)`), /Süre doldu/);
    await cevapla(c, id, o2, 0);
    assert.equal((await satir(c, id)).faz, 'sonuc', 'süresi dolan + cevaplayan → çözümlenir');
  });
});

test('yarış: eski çözümleyici (eski bot yolu) surum 2 maça dokunmaz', sec, async () => {
  await islem(async (c) => {
    const { id } = await kur(c);
    await soruAc(c, id);
    await sunucuOlarak(c);
    await c.sorgu(`select public.duello_cozumle(${a(id)}, 0::smallint)`);
    assert.equal((await satir(c, id)).faz, 'cevap');
    assert.equal(await hamleSayisi(c, id), 0);
  });
});
