import test from 'node:test';
import assert from 'node:assert/strict';
import {
  islem, oyuncuKur, olarak, skillSetiKur, baglantiVarMi,
  hataVerir, alintila as a,
} from './yardim.mjs';

const prova = Boolean(process.env.TEST_ONCE_SQL?.endsWith('20260612000255_skill_hardening.sql'));
const sec = { skip: !(await baglantiVarMi()) || !prova ? 'yalnız 255 migration provasında çalışır' : false };

async function klasikMac(c) {
  const x = await oyuncuKur(c, 'hard_a');
  const y = await oyuncuKur(c, 'hard_b');
  const kategori = await c.tek(`select kategori from public.questions where aktif group by kategori having count(*)>=30 order by kategori limit 1`);
  const id = await c.tek(`insert into public.matches
    (oyuncu1,oyuncu2,durum,dereceli,senkron,basladi,kategori,soru_ids,aktif_soru,soru_baslangic)
    values(${a(x)},${a(y)},'aktif',true,true,true,${a(kategori)},
      public.soru_sec(${a(kategori)},20,array[${a(x)},${a(y)}]::uuid[]),0,now()) returning id`);
  await skillSetiKur(c,x,['elli','sure','soru_degistir']);
  await c.sorgu(`insert into public.joker_envanter(user_id,tur,adet) values
    (${a(x)},'elli',10),(${a(x)},'sure',10),(${a(x)},'soru_degistir',10)
    on conflict(user_id,tur) do update set adet=excluded.adet`);
  return { x,y,id };
}

async function soruyaGec(c,id,index) {
  await c.sorgu(`update public.matches set aktif_soru=${index},soru_baslangic=now() where id=${a(id)}`);
}

test('Klasik ayarları 6/2/1 ve Düello ayarından bağımsızdır', sec, async () => {
  await islem(async (c) => {
    const r = Object.fromEntries((await c.sorgu(`select anahtar,deger#>>'{}' deger from public.oyun_ayarlari
      where anahtar like 'klasik_skill_%'`)).map((x) => [x.anahtar,x.deger]));
    assert.deepEqual(r, {
      klasik_skill_soru_basi_hak:'1', klasik_skill_toplam_hak:'6', klasik_skill_tur_basi_hak:'2',
    });
    const govde = await c.tek(`select pg_get_functiondef('public.joker_hak_kontrol(text,uuid,text)'::regprocedure)`);
    assert.match(govde,/klasik_skill_toplam_hak/);
  });
});

test('aynı soruda yalnız bir skill; reddedilen kullanım envanter düşürmez', sec, async () => {
  await islem(async (c) => {
    const {x,id}=await klasikMac(c); await olarak(c,x);
    await c.sorgu(`select public.joker_kullan('1v1',${a(id)},0,'elli')`);
    const once = await c.tek(`select adet from public.joker_envanter where user_id=${a(x)} and tur='sure'`);
    const hata = await hataVerir(c,`select public.joker_kullan('1v1',${a(id)},0,'sure')`);
    assert.match(hata,/soruda skill hakkını kullandın/i);
    assert.equal(await c.tek(`select adet from public.joker_envanter where user_id=${a(x)} and tur='sure'`),once);
  });
});

test('aynı skill farklı sorularda iki kez kullanılır, üçüncü reddedilir', sec, async () => {
  await islem(async (c) => {
    const {x,id}=await klasikMac(c); await olarak(c,x);
    await c.sorgu(`select public.joker_kullan('1v1',${a(id)},0,'elli')`);
    await soruyaGec(c,id,1); await c.sorgu(`select public.joker_kullan('1v1',${a(id)},1,'elli')`);
    await soruyaGec(c,id,2);
    const once = await c.tek(`select adet from public.joker_envanter where user_id=${a(x)} and tur='elli'`);
    const hata = await hataVerir(c,`select public.joker_kullan('1v1',${a(id)},2,'elli')`);
    assert.match(hata,/skill için maç hakkın doldu/i);
    assert.equal(await c.tek(`select adet from public.joker_envanter where user_id=${a(x)} and tur='elli'`),once);
  });
});

test('toplam altı kullanımdan sonra yedinci kayıt atomik reddedilir', sec, async () => {
  await islem(async (c) => {
    const {x,id}=await klasikMac(c); await olarak(c,x);
    const turler=['elli','sure','soru_degistir','elli','sure','soru_degistir'];
    for(let i=0;i<turler.length;i++){
      await soruyaGec(c,id,i);
      await c.sorgu(`insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
        values(${a(x)},'1v1',${a(id)},${i},${a(turler[i])},false)`);
    }
    await soruyaGec(c,id,6);
    const hata=await hataVerir(c,`insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
      values(${a(x)},'1v1',${a(id)},6,'elli',false)`);
    assert.match(hata,/skill hakkın doldu/i);
    assert.equal(await c.tek(`select count(*) from public.joker_kullanimlari where user_id=${a(x)} and mac_id=${a(id)}`),'6');
  });
});

test('Ek Süre yaklaşık +10 sn yalnız kullanan oyuncuya uygulanır', sec, async () => {
  await islem(async (c) => {
    const {x,y,id}=await klasikMac(c);
    const once=await c.tek(`select extract(epoch from soru_baslangic) from public.matches where id=${a(id)}`);
    await olarak(c,x); await c.sorgu(`select public.joker_kullan('1v1',${a(id)},0,'sure')`);
    const aBas=await c.tek(`select extract(epoch from baslangic) from public.soru_degisimleri
      where mac_tur='1v1' and mac_id=${a(id)} and user_id=${a(x)} and soru_index=0`);
    const bSatir=await c.tek(`select count(*) from public.soru_degisimleri where mac_tur='1v1' and mac_id=${a(id)} and user_id=${a(y)}`);
    assert.ok(Math.abs(Number(aBas)-Number(once)-10)<0.25);
    assert.equal(bSatir,'0');
  });
});

test('Düello saldırısı yalnız Zaman Baskısı; savunmada üç aktif skill vardır', sec, async () => {
  await islem(async (c) => {
    const saldiri=await c.tek(`select pg_get_functiondef('public.duello_saldiri_jokeri(uuid,text)'::regprocedure)`);
    const savunma=await c.tek(`select pg_get_functiondef('public.duello_savunma_jokeri(uuid,text)'::regprocedure)`);
    assert.match(saldiri,/p_tur <> 'zaman_baskisi'/);
    assert.doesNotMatch(saldiri,/saldiri_degistir|savunma_kilidi/);
    assert.match(savunma,/\('elli', 'sure', 'soru_degistir'\)|\('elli','sure','soru_degistir'\)/);
    assert.doesNotMatch(savunma,/savunma_kilidi|saldiri_degistir|sis/);
  });
});

test('eşleştirme gerçek oyuncuyu önce seçer, kendini ve eski kuyruğu dışlar', sec, async () => {
  await islem(async (c) => {
    const govde=await c.tek(`select pg_get_functiondef('public.quick_match(text,boolean,boolean)'::regprocedure)`);
    assert.match(govde,/q\.user_id <> auth\.uid\(\)/);
    assert.match(govde,/created_at < \(now\(\) - '00:01:30'::interval\)|created_at < now\(\) - interval '90 seconds'/);
    assert.ok(govde.indexOf('from public.matchmaking_queue q') < govde.indexOf('v_bot := public.bot_sec'));
  });
});
