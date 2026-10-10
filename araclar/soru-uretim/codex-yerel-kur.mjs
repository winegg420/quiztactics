// Bağımsız yerel PostgreSQL kümesi; hiçbir canlı bağlantı/ayar kullanmaz.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const r=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),bin='C:/Program Files/PostgreSQL/17/bin/',cluster=path.join(r,'.tmp/codex/yerel-postgres');
const run=(exe,args,input)=>execFileSync(bin+exe+'.exe',args,{input,encoding:'utf8',windowsHide:true,maxBuffer:16e6,env:{...process.env,PGCLIENTENCODING:'UTF8'}});
if(process.argv.includes('--durdur')){run('pg_ctl',['-D',cluster,'-m','fast','-w','stop']);console.log('Yalnız yerel Codex kümesi durduruldu.');process.exit(0);}
const klasor=process.argv[process.argv.indexOf('--klasor')+1];if(!/^codex-\d{2}$/.test(klasor??''))throw Error('--klasor codex-NN gerekli');
const ara=path.join(r,'.tmp/codex',klasor),hp=path.join(ara,'havuz.json'),sp=path.join(ara,'durum.json');
if(!fs.existsSync(hp)||!fs.existsSync(sp))throw Error('Mevcut havuz ve durum kopyası gerekli; canlıdan alınmaz');
if(!fs.existsSync(path.join(cluster,'PG_VERSION'))){fs.mkdirSync(path.dirname(cluster),{recursive:true});run('initdb',['-D',cluster,'-U','codex','--auth=trust','--encoding=UTF8','--locale=C']);}
let running=false;try{run('pg_ctl',['-D',cluster,'status']);running=true;}catch(e){if(e.status!==3)throw e;}
if(!running)run('pg_ctl',['-D',cluster,'-l',path.join(r,'.tmp/codex/yerel-postgres.log'),'-o',"-h 127.0.0.1 -p 15439 -c shared_buffers=8MB -c max_connections=10",'-w','start']);
let sql="create or replace function public.ayar_ondalik(p text,d numeric) returns numeric language sql immutable as $$select d$$;\ncreate or replace function public.ayar_sayi(p text,d integer) returns integer language sql immutable as $$select d$$;\n";
const files=[['20260612000222_soru_kalite.sql',['soru_normalize','soru_kelimeler']],['20260612000227_soru_sik_denge_kurali.sql',['soru_kelime_sayisi','soru_isaret_agirligi','soru_kural_isaretleri']],['20260612000298_sik_ipucu_jev_isareti.sql',['soru_isaret_agirligi']]];
for(const [f,names]of files){const src=fs.readFileSync(path.join(r,'supabase/migrations',f),'utf8');for(const n of names){const match=src.match(new RegExp('create or replace function public\\.'+n+'\\([\\s\\S]*?\\$\\$;'));if(!match)throw Error('SQL kaynak fonksiyonu yok: '+n);sql+=match[0]+'\n';}}
const hpData=JSON.parse(fs.readFileSync(hp,'utf8'));sql+='create table if not exists public.questions(soru text primary key);\n';
// Sadece bu bağımsız yerel fixture tablosu yenilenir; üretim tablosu değildir.
sql+='drop table if exists public.codex_havuz_yeni; create table public.codex_havuz_yeni(soru text primary key);\n';
sql+='insert into public.codex_havuz_yeni(soru) values '+hpData.map(t=>"('"+t.soru.replaceAll("'","''")+"')").join(',')+' on conflict do nothing;\n';
sql+='drop table public.questions; alter table public.codex_havuz_yeni rename to questions;';
run('psql',['-X','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','15439','-U','codex','-d','postgres'],sql);
const st=JSON.parse(fs.readFileSync(sp,'utf8'));st.canli_yasak=true;st.yerel_kurulum={surum:17,adres:'127.0.0.1:15439',havuz:hpData.length,sql_kaynak:files.map(x=>x[0]),esik:'repo varsayılanları 1.4/3/2; canlı ayarlar okunmadı'};fs.writeFileSync(sp,JSON.stringify(st,null,2)+'\n');
console.log('Yerel kural kapısı hazır; canlı bağlantı açılmadı.');
