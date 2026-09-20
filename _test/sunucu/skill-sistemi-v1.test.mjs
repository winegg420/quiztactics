import test from "node:test";
import assert from "node:assert/strict";
import { islem, oyuncuKur, olarak, baglantiVarMi, hataVerir, alintila as a } from "./yardim.mjs";

const migrationProvası = Boolean(process.env.TEST_ONCE_SQL?.endsWith("20260612000254_skill_sistemi_v1.sql"));
const atla = !(await baglantiVarMi()) || !migrationProvası;
const sec = { skip: atla ? "skill migration provası yalnız test:skill-db ile çalışır" : false };

async function klasikMac(c) {
  const x = await oyuncuKur(c, "skill_a");
  const y = await oyuncuKur(c, "skill_b");
  const kategori = await c.tek(`select kategori from public.questions where aktif group by kategori having count(*) >= 30 order by kategori limit 1`);
  const id = await c.tek(`
    insert into public.matches(oyuncu1,oyuncu2,durum,dereceli,senkron,basladi,kategori,soru_ids,aktif_soru,soru_baslangic)
    values(${a(x)},${a(y)},'aktif',true,true,true,${a(kategori)},
      public.soru_sec(${a(kategori)},20,array[${a(x)},${a(y)}]::uuid[]),0,now()) returning id`);
  return { x, y, id, kategori };
}

async function soru(c, id, user) {
  await olarak(c, user);
  return (await c.sorgu(`select question_id,extract(epoch from baslangic)::float8 bas
    from public.get_match_question(${a(id)})`))[0];
}

test("Skill v1 migration SQL'i transaction içinde uygulanır", sec, async () => {
  await islem(async (c) => {
    assert.equal(await c.tek(`select public.skill_aktif('elli')`), "t");
    assert.equal(await c.tek(`select public.skill_aktif('sis')`), "f");
    assert.equal(await c.tek(`select public.joker_fiyati('savunma_kilidi') is null`), "t");
  });
});

test("Klasik Soru Değiştir yalnız A'nın sorusunu, aynı kategoride değiştirir", sec, async () => {
  await islem(async (c) => {
    const { x, y, id, kategori } = await klasikMac(c);
    const onceA = await soru(c, id, x);
    const onceB = await soru(c, id, y);
    await olarak(c, x);
    await c.sorgu(`select public.joker_kullan('1v1',${a(id)},0,'soru_degistir')`);
    const sonraA = await soru(c, id, x);
    const sonraB = await soru(c, id, y);
    assert.notEqual(sonraA.question_id, onceA.question_id, "A yeni soru almalı");
    assert.equal(sonraB.question_id, onceB.question_id, "B'nin sorusu değişmemeli");
    assert.equal(await c.tek(`select kategori from public.questions where id=${a(sonraA.question_id)}`), kategori);
    assert.equal(Number(await c.tek(`select joker_surum from public.matches where id=${a(id)}`)), 0, "rakibe gereksiz sinyal gitmemeli");
  });
});

test("Ek Süre Klasik'te yalnız kullananın kişisel sayacını uzatır", sec, async () => {
  await islem(async (c) => {
    const { x, y, id } = await klasikMac(c);
    const onceA = await soru(c, id, x);
    const onceB = await soru(c, id, y);
    await olarak(c, x);
    await c.sorgu(`select public.joker_kullan('1v1',${a(id)},0,'sure')`);
    const sonraA = await soru(c, id, x);
    const sonraB = await soru(c, id, y);
    assert.equal(Math.round(sonraA.bas - onceA.bas), 10);
    assert.equal(sonraB.bas, onceB.bas);
  });
});

test("Seçilmeyen ve kaldırılan skill server tarafından reddedilir", sec, async () => {
  await islem(async (c) => {
    const { x, id } = await klasikMac(c);
    await olarak(c, x);
    await c.sorgu(`select public.skill_setimi_kaydet(array['elli','sure','soru_degistir']::text[])`);
    let hata = await hataVerir(c, `select public.joker_kullan('1v1',${a(id)},0,'zaman_baskisi')`);
    assert.match(hata, /maç setinde değil/i);
    hata = await hataVerir(c, `select public.joker_kullan('1v1',${a(id)},0,'sis')`);
    assert.match(hata, /artık aktif değil/i);
  });
});
