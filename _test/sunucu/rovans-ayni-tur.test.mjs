// Rövanş ilk maçla aynı türde açılır — migration "rovans_ayni_tur".
//
// NE KORUYOR:
//   1. Klasik (rovans_iste): serbest maçın rövanşı serbest, dereceli maçınki dereceli;
//      hem gerçek oyuncu (davet) hem açık bot (anında başlar) yolunda. jokersiz korunur.
//   2. Düello (duello_rovans_iste → duello_rovans_yanitla): serbest → serbest, dereceli → dereceli.

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, baglantiVarMi, alintila as a } from './yardim.mjs';

const atla = !(await baglantiVarMi());
const sec = { skip: atla ? 'veritabanı bağlantısı yok (SUPABASE_DB_URL / .env.local)' : false };

// Biten bir Klasik maç kurar; `kaybeden` rövanş ister, yeni maçın türünü döndürür.
async function klasikRovans(c, { dereceli, jokersiz = false, bot = false }) {
  const kaybeden = await oyuncuKur(c, 'rvk');
  const kazanan = await oyuncuKur(c, 'rvz', bot ? { is_bot: true, bot_turu: 'acik' } : {});
  const mac = await c.tek(`insert into public.matches
      (oyuncu1, oyuncu2, durum, kazanan, bitis, dereceli, jokersiz)
    values (${a(kaybeden)}, ${a(kazanan)}, 'bitti', ${a(kazanan)}, now(), ${dereceli}, ${jokersiz})
    returning id`);
  await olarak(c, kaybeden);
  const yeni = await c.tek(`select public.rovans_iste(${a(mac)})`);
  const r = await c.tek(`select json_build_object('dereceli', dereceli, 'jokersiz', jokersiz,
      'rovans', rovans, 'durum', durum) from public.matches where id = ${a(yeni)}`);
  return typeof r === 'string' ? JSON.parse(r) : r;
}

for (const dereceli of [false, true]) {
  const tur = dereceli ? 'dereceli' : 'serbest';

  test(`Klasik rövanş (davet): ${tur} → ${tur}`, sec, async () => {
    await islem(async (c) => {
      const r = await klasikRovans(c, { dereceli });
      assert.equal(r.dereceli, dereceli);
      assert.equal(r.rovans, true);
      assert.equal(r.durum, 'bekliyor');
    });
  });

  test(`Klasik rövanş (açık bot): ${tur} → ${tur}, jokersiz korunur`, sec, async () => {
    await islem(async (c) => {
      const r = await klasikRovans(c, { dereceli, jokersiz: true, bot: true });
      assert.equal(r.dereceli, dereceli);
      assert.equal(r.jokersiz, true);
      assert.equal(r.durum, 'aktif');
    });
  });

  test(`Düello rövanşı: ${tur} → ${tur}`, sec, async () => {
    await islem(async (c) => {
      const x = await oyuncuKur(c, 'rvdx');
      const y = await oyuncuKur(c, 'rvdy');
      const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, ${dereceli}, null)`);
      await c.sorgu(`update public.duellolar set durum = 'bitti', bitis = now() where id = ${a(id)}`);
      await olarak(c, x);
      await c.sorgu(`select public.duello_rovans_iste(${a(id)})`);
      await olarak(c, y);
      const yeni = await c.tek(`select public.duello_rovans_yanitla(${a(id)}, true)`);
      assert.ok(yeni, 'rövanş açılmadı');
      assert.equal(await c.tek(`select dereceli::text from public.duellolar where id = ${a(yeni)}`), String(dereceli));
    });
  });
}
