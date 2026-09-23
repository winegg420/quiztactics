// Paket 2 · Şerit B — Skill ekonomisi (migration 281–284).
//
// NE KORUYOR:
//  1. FİYAT: tek hak ve 10'lu paket fiyatları oyun_ayarlari'ndan; coin tam düşer, envanter artar.
//  2. HAK İLKESİ: envanterde hak yoksa skill kullanılamaz; her kullanım bir hak düşer.
//  3. KİLİT: kilitli skill kullanım kapısında reddedilir (bot hariç); kilit açma sunucuda
//     level + coin denetler; level şartı coin ile atlanamaz.
//  4. LOADOUT: skill_seti_slot >= aktif skill sayısı → set kontrolü yok, skill_setim() hepsini
//     döndürür; yuva sayısı düşünce set kapısı yine çalışır.
//  5. SINIRLAR: Klasik 6/2/1, Düello 1.0 4/2/1 — envanterde 20 hak olsa bile.
//
// Yalnız 281–284 uygulanmış veritabanında (canlı ya da prova) çalışır:
//   node oyun/_test/skill-ekonomisi-db-calistir.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { islem, oyuncuKur, olarak, sunucuOlarak, skillSetiKur, hataVerir, ayarla, baglantiVarMi, alintila as a } from './yardim.mjs';
import { PgIstemci, baglantiDizgisi } from '../../araclar/pg-mini.mjs';

async function hazirMi() {
  if (!(await baglantiVarMi())) return false;
  const once = process.env.TEST_ONCE_SQL ? fs.readFileSync(process.env.TEST_ONCE_SQL, 'utf8') : '';
  if (once.includes('create table if not exists public.skill_katalogu')) return true;
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
  try { return (await db.tek(`select to_regclass('public.skill_katalogu') is not null`)) === 't'; }
  finally { await db.kapat(); }
}
const sec = { skip: (await hazirMi()) ? false : 'skill_katalogu yok — 281–284 provasıyla çalıştır (oyun/_test/skill-ekonomisi-db-calistir.mjs)' };

const coinYaz = async (c, u, n) => {
  await c.sorgu(`select set_config('app.coin_izin', '1', true)`);
  await c.sorgu(`update public.profiles set coin = ${n} where id = ${a(u)}`);
};
const coin = async (c, u) => Number(await c.tek(`select coin from public.profiles where id = ${a(u)}`));
const adet = async (c, u, t) => Number(await c.tek(`select coalesce((select adet from public.joker_envanter where user_id = ${a(u)} and tur = ${a(t)}), 0)`));
const envanterYaz = async (c, u, t, n) => c.sorgu(
  `insert into public.joker_envanter (user_id, tur, adet) values (${a(u)}, ${a(t)}, ${n})
   on conflict (user_id, tur) do update set adet = excluded.adet`);

/** Aktif, senkron, dereceli Klasik maç (8 soru). */
async function klasikMac(c) {
  const x = await oyuncuKur(c, 'se1');
  const y = await oyuncuKur(c, 'se2');
  const id = await c.tek(
    `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, senkron, basladi, soru_ids, aktif_soru, soru_baslangic)
     values (${a(x)}, ${a(y)}, 'aktif', true, true, true, public.soru_sec(null, 20, array[${a(x)}, ${a(y)}]::uuid[]), 0, now())
     returning id`);
  return { x, y, id };
}
const soruyaGit = (c, id, i) => c.sorgu(`update public.matches set aktif_soru = ${i}, soru_baslangic = now() where id = ${a(id)}`);
const YENI = ['sigorta', 'cifte_puan', 'ikinci_sans'];
const klasikSql = (id, i, t) => YENI.includes(t)
  ? `select public.skill_hazirla('1v1', ${a(id)}, ${i}, ${a(t)})`
  : `select public.joker_kullan('1v1', ${a(id)}, ${i}, ${a(t)})`;
const klasikKullan = async (c, id, u, i, t) => { await olarak(c, u); return c.sorgu(klasikSql(id, i, t)); };
const klasikHata = async (c, id, u, i, t) => { await olarak(c, u); return hataVerir(c, klasikSql(id, i, t)); };

/** Düello 1.0 maçı; iki oyuncuya da her skill'den `hak` adet. */
async function duello(c, { hak = 20, set = ['elli', 'sure', 'zaman_baskisi'] } = {}) {
  await ayarla(c, 'duello_surum', 2);
  const x = await oyuncuKur(c, 'sd1');
  const y = await oyuncuKur(c, 'sd2');
  for (const u of [x, y]) {
    await skillSetiKur(c, u, set);
    for (const t of ['elli', 'sure', 'zaman_baskisi', 'soru_degistir', 'ikinci_sans']) await envanterYaz(c, u, t, hak);
  }
  const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
  const d = JSON.parse(await c.tek(`select to_jsonb(d)::text from public.duellolar d where d.id = ${a(id)}`));
  return { id, o1: d.oyuncu1, o2: d.oyuncu2 };
}
const duelloSoru = (c, id, tur, sira) => c.sorgu(
  `update public.duellolar set tur = ${tur}, saldiri_sirasi = ${sira}, faz = 'cevap', cevaplar = '{}'::jsonb,
     bitis1 = now() + interval '15 seconds', bitis2 = now() + interval '15 seconds',
     faz_bitis = now() + interval '15 seconds', elli1 = null, elli2 = null where id = ${a(id)}`);
const dSql = (id, t) => t === 'ikinci_sans'
  ? `select public.skill_hazirla('duello', ${a(id)}, null, 'ikinci_sans')`
  : `select public.duello_savunma_jokeri(${a(id)}, ${a(t)})`;
const dKullan = async (c, id, u, t) => { await olarak(c, u); return c.sorgu(dSql(id, t)); };
const dHata = async (c, id, u, t) => { await olarak(c, u); return hataVerir(c, dSql(id, t)); };

/** Testte oyuncu_level'i sabit bir değere çevirir (rollback ile geri gelir). A'nın dönüş türü korunur. */
async function levelYap(c, n) {
  const tur = await c.tek(`select pg_get_function_result('public.oyuncu_level(uuid)'::regprocedure)`);
  await c.sorgu(`create or replace function public.oyuncu_level(p_user uuid) returns ${tur}
                 language sql stable security definer set search_path to 'public' as $$ select ${n}::${tur} $$`);
}

// ---------------------------------------------------------------- 1. fiyat

test('fiyatlar oyun_ayarlari\'nda: tek 20/20/30/30/30, 10\'lu 170/170/255/255/255', sec, async () => {
  await islem(async (c) => {
    const f = JSON.parse(await c.tek(`select public.joker_fiyatlari()::text`));
    assert.deepEqual({ elli: f.elli, sure: f.sure, soru_degistir: f.soru_degistir, zaman_baskisi: f.zaman_baskisi, ikinci_sans: f.ikinci_sans },
      { elli: 20, sure: 20, soru_degistir: 30, zaman_baskisi: 30, ikinci_sans: 30 });
    // Karar 23 Eyl (307): Sigorta 30, 2X 40; 10'lu paket %15 indirimli.
    assert.deepEqual({ sigorta: f.sigorta, cifte_puan: f.cifte_puan }, { sigorta: 30, cifte_puan: 40 });
    const paket = Object.fromEntries((await c.sorgu(
      `select urun_id, public.joker_paket_fiyati(urun_id) f from public.joker_paketleri where fiyat_anahtari is not null`)).map((r) => [r.urun_id, Number(r.f)]));
    assert.deepEqual(paket, { skill_elli_10: 170, skill_sure_10: 170, skill_soru_degistir_10: 255, skill_zaman_baskisi_10: 255, skill_ikinci_sans_10: 255,
      skill_sigorta_10: 255, skill_cifte_puan_10: 340 });
    const aciklamasiz = await c.tek(`select count(*) from public.oyun_ayarlari where anahtar like 'coin_joker_%' and anahtar not in
      ('coin_joker_sis','coin_joker_savunma_kilidi','coin_joker_saldiri_degistir') and coalesce(aciklama,'') = ''`);
    assert.equal(aciklamasiz, '0', 'her fiyat ayarının açıklaması olmalı');
  });
});

test('tek hak: coin fiyat kadar düşer, envanter 1 artar', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'tek');
    await coinYaz(c, x, 1000);
    await olarak(c, x);
    for (const [t, f] of [['elli', 20], ['sure', 20], ['soru_degistir', 30], ['zaman_baskisi', 30], ['ikinci_sans', 30]]) {
      const c0 = await coin(c, x); const e0 = await adet(c, x, t);
      await c.sorgu(`select * from public.joker_tek_al(${a(t)})`);
      assert.equal(await coin(c, x), c0 - f, `${t} tek fiyatı`);
      assert.equal(await adet(c, x, t), e0 + 1, `${t} envanteri`);
    }
  });
});

test('10\'lu paket: coin paket fiyatı kadar düşer, envanter 10 artar; fiyat ayardan okunur', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'paket');
    await coinYaz(c, x, 5000);
    await olarak(c, x);
    for (const [t, f] of [['elli', 170], ['sure', 170], ['soru_degistir', 255], ['zaman_baskisi', 255], ['ikinci_sans', 255]]) {
      const c0 = await coin(c, x); const e0 = await adet(c, x, t);
      await c.sorgu(`select * from public.joker_coin_ile_al(${a(`skill_${t}_10`)})`);
      assert.equal(await coin(c, x), c0 - f, `${t} 10'lu fiyatı`);
      assert.equal(await adet(c, x, t), e0 + 10, `${t} 10'lu envanteri`);
    }
    await ayarla(c, 'coin_joker_elli_10', 99);
    const c0 = await coin(c, x);
    await c.sorgu(`select * from public.joker_coin_ile_al('skill_elli_10')`);
    assert.equal(await coin(c, x), c0 - 99, 'paket fiyatı oyun_ayarlari\'ndan (koda gömülü değil)');
  });
});

test('dükkân: skill_dukkani 7 aktif skill, fiyat + 10\'lu paket + kilit; envanterim bütün aktif skill\'leri döndürür', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'dukkan');
    await envanterYaz(c, x, 'ikinci_sans', 4);
    await olarak(c, x);
    const d = JSON.parse(await c.tek(`select public.skill_dukkani()::text`));
    assert.equal(d.skiller.length, 7);
    assert.equal(d.loadout_acik, false);
    const is = d.skiller.find((s) => s.tur === 'ikinci_sans');
    assert.deepEqual({ fiyat: is.fiyat, adet: is.adet, acik: is.acik, paket: is.paket },
      { fiyat: 30, adet: 4, acik: true, paket: { urun_id: 'skill_ikinci_sans_10', adet: 10, fiyat: 255 } });
    // 307'den beri Sigorta'nın da 10'lu paketi var (255).
    assert.equal(d.skiller.find((s) => s.tur === 'sigorta').paket?.fiyat, 255, 'Sigorta 10\'lu paketi 255');
    const env = await c.sorgu(`select tur, adet from public.envanterim()`);
    assert.equal(env.length, 8, '7 aktif skill + seri_koruma');
    assert.equal(env.find((r) => r.tur === 'ikinci_sans').adet, '4');
  });
});

// ---------------------------------------------------------------- 2. hak ilkesi

test('hak yoksa kullanım reddedilir; kullanımda envanterden bir hak düşer', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await envanterYaz(c, x, 'elli', 0);
    assert.match(await klasikHata(c, id, x, 0, 'elli'), /Yetersiz joker/);
    await envanterYaz(c, x, 'elli', 2);
    await klasikKullan(c, id, x, 0, 'elli');
    assert.equal(await adet(c, x, 'elli'), 1);
    await envanterYaz(c, x, 'sigorta', 0);
    await soruyaGit(c, id, 1);
    assert.match(await klasikHata(c, id, x, 1, 'sigorta'), /Yetersiz joker/);

    const d = await duello(c, { hak: 0 });
    await duelloSoru(c, d.id, 1, 0);
    assert.match(await dHata(c, d.id, d.o1, 'elli'), /Yetersiz joker/);
    await envanterYaz(c, d.o1, 'elli', 3);
    await dKullan(c, d.id, d.o1, 'elli');
    assert.equal(await adet(c, d.o1, 'elli'), 2);
  });
});

test('maç içi al-ve-kullan yeni tek fiyatı öder (onaylı pencere akışı korunur)', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await coinYaz(c, x, 500);
    await envanterYaz(c, x, 'sure', 0);
    await olarak(c, x);
    const r = JSON.parse(await c.tek(`select public.joker_al_ve_kullan('1v1', ${a(id)}, 0, 'sure')::text`));
    assert.equal(r.satin_alindi, true);
    assert.equal(r.odenen, 20);
    assert.equal(await coin(c, x), 480);
    assert.equal(await adet(c, x, 'sure'), 0, 'alınan hak aynı işlemde kullanıldı');
  });
});

// ---------------------------------------------------------------- 3. kilit

test('kilitli skill kapıda reddedilir, satın alınamaz, sete giremez; bot istisnası sürer', sec, async () => {
  await islem(async (c) => {
    await c.sorgu(`update public.skill_katalogu set kilit_fiyati = 100 where tur = 'sigorta'`);
    const { x, y, id } = await klasikMac(c);
    await envanterYaz(c, x, 'sigorta', 5);
    await coinYaz(c, x, 1000);
    assert.match(await klasikHata(c, id, x, 0, 'sigorta'), /Bu skill kilitli/);
    assert.equal(await adet(c, x, 'sigorta'), 5, 'reddedilen kullanım hak düşürmez');
    assert.match(await hataVerir(c, `select * from public.joker_tek_al('sigorta')`), /kilitli/);
    assert.equal(await coin(c, x), 1000);
    const set = await c.tek(`select public.skill_setim()::text`);
    assert.ok(!set.includes('sigorta'), 'loadout kapalıyken kilitli skill sette görünmez');
    await ayarla(c, 'skill_seti_slot', 3);
    assert.match(await hataVerir(c, `select public.skill_setimi_kaydet(array['sigorta','elli'])`), /kilitli/);

    // Bot: mevcut desen — botta set ve kilit kontrolü yok.
    await c.sorgu(`update public.profiles set is_bot = true where id = ${a(y)}`);
    await sunucuOlarak(c);
    await c.sorgu(`insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
                   values (${a(y)}, '1v1', ${a(id)}, 0, 'sigorta', true)`);
    assert.equal(await c.tek(`select count(*) from public.joker_kullanimlari where user_id = ${a(y)} and mac_id = ${a(id)}`), '1');
  });
});

test('kilit açma: coin yetersiz reddedilir; başarılıysa coin bir kez düşer ve skill kullanılabilir', sec, async () => {
  await islem(async (c) => {
    await c.sorgu(`update public.skill_katalogu set kilit_fiyati = 100, gereken_level = 1 where tur = 'sigorta'`);
    const { x, id } = await klasikMac(c);
    await envanterYaz(c, x, 'sigorta', 2);
    await coinYaz(c, x, 50);
    await olarak(c, x);
    assert.match(await hataVerir(c, `select public.skill_kilidi_ac('sigorta')`), /Yetersiz coin/);
    assert.equal(await coin(c, x), 50);
    assert.equal(await c.tek(`select count(*) from public.oyuncu_skill_kilitleri where user_id = ${a(x)}`), '0');

    await coinYaz(c, x, 500);
    const r = JSON.parse(await c.tek(`select public.skill_kilidi_ac('sigorta')::text`));
    assert.equal(r.odenen, 100);
    assert.equal(await coin(c, x), 400);
    const r2 = JSON.parse(await c.tek(`select public.skill_kilidi_ac('sigorta')::text`));
    assert.equal(r2.odenen, 0, 'açık kilit ikinci kez ödenmez');
    assert.equal(await coin(c, x), 400);
    await klasikKullan(c, id, x, 0, 'sigorta');
    assert.equal(await adet(c, x, 'sigorta'), 1);
  });
});

test('level şartı coin ile atlanamaz; level yetince açılır, bedelsiz skill kendiliğinden açılır', sec, async () => {
  await islem(async (c) => {
    await c.sorgu(`update public.skill_katalogu set kilit_fiyati = 100, gereken_level = 5 where tur = 'cifte_puan'`);
    await c.sorgu(`update public.skill_katalogu set kilit_fiyati = 0, gereken_level = 3 where tur = 'ikinci_sans'`);
    const x = await oyuncuKur(c, 'level');
    await coinYaz(c, x, 10000);
    await levelYap(c, 1);
    await olarak(c, x);
    assert.match(await hataVerir(c, `select public.skill_kilidi_ac('cifte_puan')`), /Level 5 gerekir/);
    assert.equal(await coin(c, x), 10000, 'level yetmezken coin düşmez');
    const d1 = JSON.parse(await c.tek(`select public.skill_dukkani()::text`));
    assert.equal(d1.skiller.find((s) => s.tur === 'ikinci_sans').acik, false, 'bedelsiz ama level şartlı skill kilitli');
    assert.equal(d1.skiller.find((s) => s.tur === 'cifte_puan').gereken_level, 5);

    await levelYap(c, 5);
    await c.sorgu(`select public.skill_kilidi_ac('cifte_puan')`);
    assert.equal(await coin(c, x), 9900);
    const d2 = JSON.parse(await c.tek(`select public.skill_dukkani()::text`));
    assert.equal(d2.skiller.find((s) => s.tur === 'ikinci_sans').acik, true, 'level yetince bedelsiz skill kendiliğinden açık');
    assert.equal(d2.skiller.find((s) => s.tur === 'cifte_puan').acik, true);
  });
});

test('oyuncu_level tanımlı ve bugün herkes için en az 1', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'lv');
    assert.ok(Number(await c.tek(`select public.oyuncu_level(${a(x)})`)) >= 1);
    assert.equal(await c.tek(`select count(*) from public.skill_katalogu where aktif and (kilit_fiyati <> 0 or gereken_level <> 1)`), '0',
      'bugün bütün aktif skill\'ler fiyat 0, level 1');
  });
});

// ---------------------------------------------------------------- 4. loadout

test('loadout kapalı: set dışı skill kabul, skill_setim hepsini döndürür; yuva düşünce set kapısı çalışır', sec, async () => {
  await islem(async (c) => {
    assert.equal(await c.tek(`select public.skill_loadout_acik()`), 'f', 'canlı ayarla loadout kapalı');
    const { x, id } = await klasikMac(c);
    await skillSetiKur(c, x, ['elli', 'sure', 'soru_degistir']);
    for (const t of ['sigorta', 'cifte_puan']) await envanterYaz(c, x, t, 5);
    await olarak(c, x);
    const set = await c.tek(`select array_to_string(public.skill_setim(), ',')`);
    assert.equal(set, 'elli,sure,soru_degistir,zaman_baskisi,sigorta,cifte_puan,ikinci_sans');
    await klasikKullan(c, id, x, 0, 'sigorta');

    await ayarla(c, 'skill_seti_slot', 3);
    assert.equal(await c.tek(`select public.skill_loadout_acik()`), 't');
    assert.equal(await c.tek(`select array_to_string(public.skill_setim(), ',')`), 'elli,sure,soru_degistir');
    await soruyaGit(c, id, 1);
    assert.match(await klasikHata(c, id, x, 1, 'cifte_puan'), /maç setinde değil/);
  });
});

test('Düello 1.0: loadout kapalıyken arayüz seti bütün skill\'ler, set dışı skill kabul; açıkken red', sec, async () => {
  await islem(async (c) => {
    const { id, o1 } = await duello(c, { set: ['elli', 'sure', 'zaman_baskisi'] });
    await olarak(c, o1);
    const d = JSON.parse(await c.tek(`select public.duello_durum(${a(id)})::text`));
    const liste = d.skill.set.filter((t) => d.skill.izinli.includes(t));
    assert.deepEqual(liste, ['elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans']);
    await duelloSoru(c, id, 1, 0);
    await dKullan(c, id, o1, 'ikinci_sans');
    await ayarla(c, 'skill_seti_slot', 3);
    await duelloSoru(c, id, 1, 1);
    assert.match(await dHata(c, id, o1, 'ikinci_sans'), /maç setinde değil/);
  });
});

// ---------------------------------------------------------------- 5. sınırlar

test('Klasik 6 / aynı skill 2 / soru başına 1 — envanterde 20 hak olsa bile', sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    for (const t of ['elli', 'sure', 'sigorta', 'cifte_puan', 'ikinci_sans']) await envanterYaz(c, x, t, 20);
    await klasikKullan(c, id, x, 0, 'elli');
    assert.match(await klasikHata(c, id, x, 0, 'sure'), /Bu soruda skill hakkını kullandın/);
    await soruyaGit(c, id, 1); await klasikKullan(c, id, x, 1, 'elli');
    await soruyaGit(c, id, 2);
    assert.match(await klasikHata(c, id, x, 2, 'elli'), /maç hakkın doldu/);
    await klasikKullan(c, id, x, 2, 'sure');
    await soruyaGit(c, id, 3); await klasikKullan(c, id, x, 3, 'sure');
    await soruyaGit(c, id, 4); await klasikKullan(c, id, x, 4, 'sigorta');
    await soruyaGit(c, id, 5); await klasikKullan(c, id, x, 5, 'cifte_puan');
    await soruyaGit(c, id, 6);
    assert.match(await klasikHata(c, id, x, 6, 'ikinci_sans'), /en fazla 6 skill|hakkın doldu/);
    assert.equal(await c.tek(`select count(*) from public.joker_kullanimlari where user_id = ${a(x)} and mac_id = ${a(id)}`), '6');
    assert.equal(await adet(c, x, 'elli'), 18);
    assert.equal(await adet(c, x, 'ikinci_sans'), 20, 'reddedilen kullanım hak düşürmez');
  });
});

test('Düello 1.0: 4 / aynı skill 2 / soru başına 1 — envanterde 20 hak olsa bile', sec, async () => {
  await islem(async (c) => {
    const { id, o1 } = await duello(c, { hak: 20 });
    await duelloSoru(c, id, 1, 0); await dKullan(c, id, o1, 'elli');
    assert.match(await dHata(c, id, o1, 'sure'), /Bu soruda skill/);
    await duelloSoru(c, id, 1, 1); await dKullan(c, id, o1, 'elli');
    await duelloSoru(c, id, 2, 0);
    assert.match(await dHata(c, id, o1, 'elli'), /maç hakkın doldu/);
    await dKullan(c, id, o1, 'sure');
    await duelloSoru(c, id, 2, 1); await dKullan(c, id, o1, 'ikinci_sans');
    await duelloSoru(c, id, 3, 0);
    assert.match(await dHata(c, id, o1, 'sure'), /en fazla 4 skill/);
    assert.equal(await adet(c, o1, 'elli'), 18);
    assert.equal(await adet(c, o1, 'sure'), 19);
  });
});
