// Serbest Klasik'te 'sik_ipucu_jev' işaretli sorular — migration 309.
//
// NE KORUYOR:
//   1. soru_sec(..., p_serbest_klasik => true): 'sik_ipucu_jev' işaretli sorular havuza girer;
//      başka bir işareti eşiği (ağırlık ≥ 2) aşan soru yine dışarıda kalır.
//   2. Varsayılan (dereceli Klasik, Düello): 'sik_ipucu_jev' işaretli soru hiç gelmez.
//   3. Turnuva havuzu (turnuva_soru_sec) işaretli soru vermez.
//   4. Gerçek akış: hemen_bot_mac serbestte işaretli soru verebilir, derecelide vermez.

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

// Rekabetçi dışlamaya giren (denetlenmemiş) işaretli sorular.
const JEV = `select q.id from public.questions q
  where q.aktif and q.denetim_durumu = 'bekliyor' and 'sik_ipucu_jev' = any(q.supheli_isaretler)`;
const DIGER = `select q.id from public.questions q
  where q.aktif and q.denetim_durumu = 'bekliyor'
    and exists (select 1 from unnest(q.supheli_isaretler) i
                 where i <> 'sik_ipucu_jev'
                   and public.soru_isaret_agirligi(i) >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int)`;

const kesisim = (c, havuz, kume) =>
  c.tek(`select count(*)::int from unnest(${havuz}) h(id) where h.id in (${kume})`).then(Number);

test('soru_sec havuzu: serbest Klasik jev işaretlilere açık, diğer işaretler kapalı', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'skj1');
    assert.ok(Number(await c.tek(`select count(*) from (${JEV}) s`)) > 0, 'jev işaretli aday soru yok');
    const serbest = `public.soru_sec(null, 100000, array[${a(x)}]::uuid[], null, null, true)`;
    const dereceli = `public.soru_sec(null, 100000, array[${a(x)}]::uuid[])`;
    assert.ok((await kesisim(c, serbest, JEV)) > 0, 'serbest havuzda jev işaretli soru yok');
    assert.equal(await kesisim(c, dereceli, JEV), 0, 'dereceli havuzda jev işaretli soru var');
    assert.equal(await kesisim(c, serbest, DIGER), 0, 'serbest havuzda başka işaretli soru var');
    assert.equal(await kesisim(c, dereceli, DIGER), 0, 'dereceli havuzda başka işaretli soru var');
  });
});

test('turnuva havuzu ve düello jev işaretli soru vermez', sec, async () => {
  await islem(async (c) => {
    assert.equal(await kesisim(c, `public.turnuva_soru_sec(100000, 'tr')`, JEV), 0);
    const tanim = await c.tek(`select pg_get_functiondef('public.duello_soru_bul(uuid,text,uuid[],uuid[])'::regprocedure)`);
    assert.ok(!/p_serbest_klasik/.test(tanim), 'düello serbest havuz kullanmamalı');
  });
});

test('hemen_bot_mac: serbestte jev işaretli soru gelebilir, derecelide gelmez', sec, async () => {
  await islem(async (c) => {
    const x = await oyuncuKur(c, 'skj2');
    await olarak(c, x);
    async function topla(dereceli, tur) {
      let n = 0;
      for (let i = 0; i < tur; i++) {
        await c.sorgu('savepoint mac');
        const id = await c.tek(`select public.hemen_bot_mac(null, ${dereceli}, false)`);
        const ids = await c.tek(`select soru_ids::text from public.matches where id = ${a(id)}`);
        assert.equal(await c.tek(`select dereceli::text from public.matches where id = ${a(id)}`), String(dereceli));
        n += await kesisim(c, `${a(ids)}::uuid[]`, JEV);
        await c.sorgu('rollback to savepoint mac');
      }
      return n;
    }
    assert.ok((await topla(false, 15)) > 0, 'serbest maçlarda (15×20 soru) jev işaretli soru hiç gelmedi');
    assert.equal(await topla(true, 15), 0, 'dereceli maçta jev işaretli soru geldi');
  });
});
