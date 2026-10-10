// Eşikler, eksik Jev yanıtı ve EN-null istisnası: API/DB çağrısız testler.
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../soru-parti-1000/kural.mjs';
import {kokler} from '../soru-parti-1000/denetle.mjs';
import {ipucuGecer,tekDogruOlasilik,paylastir,yerelKapilar} from './codex-kapi.mjs';
const soru={id:'test',k:'sinema',yerel:false,z:2,s:'Örnek filmin kahramanı kimdir?',d:'Arda',y:['Kemal','Selim','Deniz'],en:null,en_neden:'Dil oyunu çevrilemez',olgu:'Örnek filmin kahramanı Arda’dır.'};
test('ipucu sınırı 0,75 dahil, üstü ve eksik yanıt geçmez',()=>{assert.equal(ipucuGecer(0.75),true);for(const p of [0.751,null,NaN,-1,Infinity])assert.equal(ipucuGecer(p),false);});
test('tek doğru: 0,5 yanlış şık eşiği, eksik/bozuk cevap hata',()=>{assert.equal(tekDogruOlasilik({answers:{sik_0:{noul:.1},sik_1:{noul:.5},sik_2:{noul:.2}}}),.5);for(const y of [{},{answers:{sik_0:{noul:0},sik_1:{noul:0},sik_2:{noul:'0'}}}])assert.throws(()=>tekDogruOlasilik(y));});
test('kota toplamı ve az sayıdaki kategoriye büyük pay',()=>{const p=paylastir({az:30,cok:10},50);assert.equal(p.az+p.cok,50);assert.ok(p.az>p.cok);});
test('global çevrilemeyen soru açık nedenle geçebilir, EN bozuksa engellenir',()=>{assert.equal(yerelKapilar(soru,[],[]),null);assert.match(yerelKapilar({...soru,en_neden:''},[],[]),/en_neden/);assert.match(yerelKapilar({...soru,en:{s:'Question?',d:'Right',y:[null,'X','Y']}},[],[]),/EN bozuk/);assert.match(yerelKapilar({...soru,en:{s:'Question?',d:'',y:['X','Y','Z']}},[],[]),/EN bozuk/);});
test('cevap kökü, havuz ve parti birebir tekrarı engellenir',()=>{assert.match(yerelKapilar({...soru,s:'Arda karakterinin adı nedir?'},[],[]),/cevap/);const m={soru:soru.s,dogru:soru.d,n:normalize(soru.s),dn:normalize(soru.d),kok:kokler(soru.s)};assert.match(yerelKapilar(soru,[m],[]),/birebir/);assert.match(yerelKapilar(soru,[],[m]),/birebir/);});
test('en uzun doğru şık TR ve EN tarafında engellenir',()=>{assert.match(yerelKapilar({...soru,d:'Ardali'},[],[]),/şık dengesi/);assert.match(yerelKapilar({...soru,en:{s:'Who stars in the example movie?',d:'Alexandros',y:['Arda','Deniz','Selim']}},[],[]),/şık dengesi/);});

import {sec,cesitlilikHata,cesitlilikSay} from './codex-kapi.mjs';
test('çeşitlilik: kalıp, kategori alt türü ve aynı konu sınırları birlikte korunur',()=>{
const kota=Object.fromEntries(['sanat','muzik','teknoloji','spor','tarih','sinema','genel_kultur','edebiyat'].map(k=>[k,k==='teknoloji'?10:0]));
const st={klasor:'codex-02',adet:200,plan:{kota,z3:Object.fromEntries(Object.keys(kota).map(k=>[k,0]))}};
const a=Array.from({length:20},(_,i)=>({id:String(i),k:'teknoloji',z:2,yerel:false,kalip:'p'+(i%3),konular:[i<5?'ortak':'konu'+i],alt_tur:i<8?'video_oyunu_maskot':'donanim',sonuc:'gecti',jev_p:i/100}));
const b=sec(st,a),c=cesitlilikSay(b,st);assert.equal(b.length,10);assert.ok((c.alt_tur['teknoloji:video_oyunu_maskot']??0)<=3);assert.ok(c.konu['teknoloji:ortak']<=2);assert.ok(Math.max(...Object.values(c.kalip))<=10);
assert.match(cesitlilikHata({}),/çeşitlilik/);assert.match(cesitlilikHata({...a[0],k:'spor'}),/kategori/);
});

test('aynı anlamsal kalıp kategoriler arasında da toplam yüzde 5 ile sınırlıdır',()=>{
const kota=Object.fromEntries(['sanat','muzik','teknoloji','spor','tarih','sinema','genel_kultur','edebiyat'].map(k=>[k,['sanat','muzik'].includes(k)?8:0]));
const st={klasor:'codex-02',adet:200,plan:{kota,z3:Object.fromEntries(Object.keys(kota).map(k=>[k,0]))}};
const a=['sanat','muzik'].flatMap(k=>Array.from({length:8},(_,i)=>({id:k+i,k,z:2,yerel:false,kalip:'ayni-anlamsal-kalip',alt_tur:'eser',konular:['eser'+i],sonuc:'gecti',jev_p:0.2})));
assert.equal(sec(st,a).length,10);assert.equal(sec({...st,klasor:'codex-01'},a).length,16);
});

import {kalipSiniri,yanlisUclu} from './codex-kapi.mjs';
test('codex03 dört kalıbı ve sıra bağımsız iki yanlış üçlüyü TR/EN korur; codex02 değişmez',()=>{
const ks=['sanat','muzik','teknoloji','spor','tarih','sinema','genel_kultur','edebiyat'];
const kota=Object.fromEntries(ks.map(k=>[k,k==='muzik'?12:0]));
const st={klasor:'codex-03',adet:200,plan:{kota,z3:Object.fromEntries(ks.map(k=>[k,0]))}};
const a=Array.from({length:12},(_,i)=>({id:String(i),k:'muzik',z:2,yerel:false,kalip:'p'+Math.floor(i/6),konular:['konu'+i],alt_tur:'album',y:i<6?['Do','Re','Mi']:['La','Si','Fa'],en:{y:i<6?['Doh','Ray','Me']:['Lah','See','Fah']},sonuc:'gecti',jev_p:i/100}));
assert.equal(kalipSiniri(st),4);assert.equal(kalipSiniri({...st,klasor:'codex-02'}),10);
assert.equal(yanlisUclu(a[0]),yanlisUclu({...a[0],y:['Mi','Do','Re']}));
assert.equal(sec(st,a).length,4);assert.equal(sec({...st,klasor:'codex-02'},a).length,12);
const c=cesitlilikSay(sec(st,a),st);assert.ok(Math.max(...Object.values(c.kalip))<=4);assert.ok(Math.max(...Object.values(c.yanlis_uclu.tr))<=2);assert.ok(Math.max(...Object.values(c.yanlis_uclu.en))<=2);
const b=a.map((t,i)=>({...t,kalip:'ortak',y:['bir'+i,'iki'+i,'uc'+i],en:{y:['one'+i,'two'+i,'three'+i]}}));assert.equal(sec(st,b).length,4);
});

import {karsilikliCevap,main} from './codex-kapi.mjs';
test('codex04 karşılıklı cevap TR/EN ve genel kültür ülke sınırı',()=>{
 const ks=['sanat','muzik','teknoloji','spor','tarih','sinema','genel_kultur','edebiyat'];
 const st={klasor:'codex-04',adet:200,plan:{kota:Object.fromEntries(ks.map(k=>[k,k==='genel_kultur'?10:0])),z3:Object.fromEntries(ks.map(k=>[k,0]))}};
 const a=Array.from({length:10},(_,i)=>({id:String(i),k:'genel_kultur',z:2,yerel:false,kalip:'p'+i,konular:['konu'+i],alt_tur:'gelenek',ulke_odak:'JP',d:'d'+i,y:['a'+i,'b'+i,'c'+i],sonuc:'gecti',jev_p:.1}));
 assert.equal(sec(st,a).length,3);assert.equal(sec(st,a.map(t=>({...t,ulke_odak:'global'}))).length,10);
 assert.equal(sec(st,a.map(t=>({...t,ulke_odak:undefined}))).length,0);
 const x={d:'Paris',y:['London','Rome','Berlin']},y={d:'London',y:['PARIS','Athens','Lima']};
 assert.equal(karsilikliCevap(x,y),true);assert.equal(karsilikliCevap(x,{...y,y:['Athens','Lima','Oslo']}),false);
 assert.equal(karsilikliCevap({d:'A',y:['B'],en:x},{d:'C',y:['D'],en:y}),true);
 const b=a.map((t,i)=>({...t,ulke_odak:'global',...(i===0?x:i===1?y:{})}));assert.equal(sec(st,b).length,9);
 assert.equal(cesitlilikSay(sec(st,b),st).karsilikli_cift,0);
});
test('yerel kip yeni parti için canlı ölçüme düşmez',async()=>{await assert.rejects(main(['node','test','--klasor','codex-99','--adet','200','--yerel','--olc']),/Yerel kipte/);});

test('kalıcı parti kaydı canlı bağlantıyı engeller',async()=>{await assert.rejects(main(['node','test','--klasor','codex-04','--adet','200','--olc']),/canlı bağlantıya kapalı/);});
