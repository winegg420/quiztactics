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
