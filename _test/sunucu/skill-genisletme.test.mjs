import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur, olarak, skillSetiKur, baglantiVarMi, alintila as a } from './yardim.mjs';

const prova=Boolean(process.env.TEST_ONCE_SQL?.endsWith('20260612000266_skill_mobil_deneyim.sql'));
const sec={skip:!(await baglantiVarMi())||!prova?'yalnız 266 migration provasında çalışır':false};

async function macKur(c,skill){
  const x=await oyuncuKur(c,'genis_a'); const y=await oyuncuKur(c,'genis_b');
  const kategori=await c.tek(`select kategori from public.questions where aktif group by kategori having count(*)>=3 order by kategori limit 1`);
  const sorular=(await c.sorgu(`select id,dogru_cevap from public.questions where aktif and kategori=${a(kategori)} order by id limit 3`));
  const dizi=`array[${sorular.map(s=>a(s.id)).join(',')}]::uuid[]`;
  const id=await c.tek(`insert into public.matches
    (oyuncu1,oyuncu2,durum,dereceli,senkron,basladi,kategori,soru_ids,aktif_soru,soru_baslangic)
    values(${a(x)},${a(y)},'aktif',true,true,true,${a(kategori)},${dizi},0,now()) returning id`);
  await skillSetiKur(c,x,[skill,'elli','sure']);
  await c.sorgu(`insert into public.joker_envanter(user_id,tur,adet) values(${a(x)},${a(skill)},3)
    on conflict(user_id,tur) do update set adet=excluded.adet`);
  await olarak(c,x);
  return {x,y,id,dogru:Number(sorular[0].dogru_cevap)};
}

async function cevap(c,id,cevap){
  return (await c.sorgu(`select * from public.submit_match_answer(${a(id)},${cevap}::smallint)`))[0];
}

test('Sigorta yanlışta 5, doğru cevapta normal 10 puan verir',sec,async()=>{
  await islem(async c=>{
    const {id,dogru}=await macKur(c,'sigorta');
    await c.sorgu(`select public.skill_hazirla('1v1',${a(id)},0,'sigorta')`);
    const r=await cevap(c,id,(dogru+1)%4);
    assert.equal(Number(r.puan),5); assert.equal(r.dogru,'f');
  });
});

test('2X yalnız doğru cevapta 20 puan verir',sec,async()=>{
  await islem(async c=>{
    const {id,dogru}=await macKur(c,'cifte_puan');
    await c.sorgu(`select public.skill_hazirla('1v1',${a(id)},0,'cifte_puan')`);
    const r=await cevap(c,id,dogru);
    assert.equal(Number(r.puan),20); assert.equal(r.dogru,'t');
  });
});

test('İkinci Şans ilk yanlışı finalleştirmez, aynı sayaçta ikinci cevabı kabul eder',sec,async()=>{
  await islem(async c=>{
    const {x,id,dogru}=await macKur(c,'ikinci_sans'); const yanlis=(dogru+1)%4;
    await c.sorgu(`select public.skill_hazirla('1v1',${a(id)},0,'ikinci_sans')`);
    const ilk=await cevap(c,id,yanlis);
    assert.equal(ilk.tekrar_hakki,'t');
    assert.equal(await c.tek(`select count(*) from public.match_answers where match_id=${a(id)} and user_id=${a(x)}`),'0');
    const ikinci=await cevap(c,id,dogru);
    assert.equal(ikinci.tekrar_hakki,'f'); assert.equal(Number(ikinci.puan),10);
  });
});

test('ödül ayarları eşitlenir ve Saf Bilgi yüzde 50 kalır',sec,async()=>{
  await islem(async c=>{
    const ayar=Object.fromEntries((await c.sorgu(`select anahtar,deger#>>'{}' deger from public.oyun_ayarlari
      where anahtar in('lig_mac_galibiyet','lig_duello_galibiyet','coin_mac_galibiyet','coin_duello_galibiyet','saf_bilgi_odul_carpani')`))
      .map(x=>[x.anahtar,x.deger]));
    assert.equal(ayar.lig_duello_galibiyet,ayar.lig_mac_galibiyet);
    assert.equal(ayar.coin_duello_galibiyet,ayar.coin_mac_galibiyet);
    assert.equal(ayar.saf_bilgi_odul_carpani,'0.5');
  });
});

test('Düello yalnız İkinci Şans kabul eder ve rövanş iptali sunucudadır',sec,async()=>{
  await islem(async c=>{
    const hazir=await c.tek(`select pg_get_functiondef('public.skill_hazirla(text,uuid,integer,text)'::regprocedure)`);
    const sav=await c.tek(`select pg_get_functiondef('public.duello_savunma_jokeri(uuid,text)'::regprocedure)`);
    assert.match(hazir,/p_tur<>'ikinci_sans'/); assert.match(sav,/ikinci_sans/);
    assert.equal(await c.tek(`select to_regprocedure('public.duello_rovans_iptal(uuid)') is not null`),'t');
    const x=await oyuncuKur(c,'rovans_a'); const y=await oyuncuKur(c,'rovans_b');
    const id=await c.tek(`select public.duello_olustur(${a(x)},${a(y)},true,null)`);
    await c.sorgu(`update public.duellolar set durum='bitti',bitis=now(),kazanan=${a(x)} where id=${a(id)}`);
    await olarak(c,x); await c.sorgu(`select public.duello_rovans_iste(${a(id)})`);
    assert.equal(await c.tek(`select rovans_isteyen=${a(x)} from public.duellolar where id=${a(id)}`),'t');
    await c.sorgu(`select public.duello_rovans_iptal(${a(id)})`);
    assert.equal(await c.tek(`select rovans_isteyen is null and rovans_at is null from public.duellolar where id=${a(id)}`),'t');
  });
});
