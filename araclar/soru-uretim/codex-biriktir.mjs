// Canlı bağlantısız başlangıç: yalnız mevcut snapshot ve bekleyen partiler.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {KATEGORI,paylastir,ekHavuzOku} from './codex-kapi.mjs';import {kokler} from '../soru-parti-1000/denetle.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');const arg=(x,d)=>{const i=process.argv.indexOf(x);return i<0?d:process.argv[i+1];};
if(!process.argv.includes('--yerel'))throw Error('--yerel zorunlu; canlı bağlantı yok');
const ad=arg('--klasor'),kaynak=arg('--kaynak','codex-04');if(!/^codex-\d{2}$/.test(ad??'')||!/^codex-\d{2}$/.test(kaynak)||ad===kaynak)throw Error('Yeni parti ve mevcut kaynak gerekli');
const oku=p=>JSON.parse(fs.readFileSync(p,'utf8'));const yaz=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');const ara=path.join(root,'.tmp/codex',ad),girdi=path.join(root,'.tmp/codex',kaynak);const ekAd=arg('--ek-havuz','codex-04');const ek=ekHavuzOku(root,ekAd,ad);
if(fs.existsSync(path.join(ara,'durum.json')))throw Error('Parti zaten var; mevcut durum korunur, kapı komutuyla devam edin');
const havuz=oku(path.join(girdi,'havuz.json')),once=oku(path.join(girdi,'durum.json'));
const say=Object.fromEntries(KATEGORI.map(k=>[k,havuz.filter(t=>t.kategori===k&&t.aktif&&[2,3].includes(Number(t.zorluk))&&!t.ipuculu).length+ek.filter(t=>t.k===k).length]));
const tavan=Math.max(...Object.values(say))+25;const tarih=Math.max(30,paylastir(Object.fromEntries(KATEGORI.map(k=>[k,tavan-say[k]])),200).tarih);const kota={...paylastir(Object.fromEntries(KATEGORI.filter(k=>k!=='tarih').map(k=>[k,tavan-say[k]])),200-tarih),tarih};
const st={surum:1,klasor:ad,adet:200,canli_yasak:true,asama:'taslak yazımı',jev_jeton:0,kayitlar:{},ek_havuz:ekAd.split(','),plan:{olcum_z2_z3:say,kota,z3:paylastir(kota,60),tarih:new Date().toISOString(),tarih_alt_pay:.15,kota_gerekce:'Mevcut yerel snapshot + bekleyen partiler; tarih en az %15; canlı ölçüm/yenileme yapılmadı',snapshot_kaynak:kaynak,snapshot_tarih:once.plan.tarih}};
fs.mkdirSync(ara,{recursive:true});fs.copyFileSync(path.join(girdi,'havuz.json'),path.join(ara,'havuz.json'));yaz(path.join(ara,'durum.json'),st);
fs.writeFileSync(path.join(ara,'kavramlar.md'),KATEGORI.map(k=>'## '+k+'\n'+[...havuz.filter(t=>t.kategori===k).map(t=>t.soru+' → '+t.dogru+' | '+[...kokler(t.soru)].join(' ')),...ek.filter(t=>t.k===k).map(t=>t.s+' → '+t.d+' | '+t.olgu)].join('\n')).join('\n\n'));
fs.mkdirSync(path.join(root,'araclar/soru-uretim',ad),{recursive:true});console.log(JSON.stringify(st.plan));
