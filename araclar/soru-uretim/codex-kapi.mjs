// Codex taslakları → mevcut kapı 1–5. Claude API yok; canlıya yazmaz.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { hamKapiSorgusu, sikIpucuTesti } from '../soru_denetim/kapi.mjs';
import { jevSor, noul, maliyetUsd } from '../jev.mjs';
import { kayitDenetle, kokler, jaccard } from '../soru-parti-1000/denetle.mjs';
import { normalize } from '../soru-parti-1000/kural.mjs';

export const KATEGORI = ['sanat','muzik','teknoloji','spor','tarih','sinema','genel_kultur','edebiyat'];
const ELE_UYARI = /soru uzun|45 karakteri|EN metinde Türkçe|EN soruda TR|EN soru "\?"|soru "\?"|EN kural/;
const ozetHash = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const oku = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function atomik(p, x) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p + '.tmp', JSON.stringify(x, null, 2) + '\n');
  // Windows tarayıcı/antivirüsün anlık dosya kilidinde eski kayıt korunur.
  for (let i=0;;i++) {
    try { fs.renameSync(p + '.tmp', p); break; }
    catch(e) { if(i>=4||!['EPERM','EBUSY','EACCES'].includes(e.code))throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50*(i+1)); }
  }
}
export function paylastir(agirlik, adet) {
  const top = Object.values(agirlik).reduce((a,b) => a+b,0);
  if (!top) return Object.fromEntries(Object.keys(agirlik).map(k=>[k,0]));
  const ham = Object.entries(agirlik).map(([k,v])=>({k,h:adet*v/top}));
  const sonuc = Object.fromEntries(ham.map(({k,h})=>[k,Math.floor(h)]));
  let kalan = adet-Object.values(sonuc).reduce((a,b)=>a+b,0);
  for (const {k} of [...ham].sort((a,b)=>(b.h%1)-(a.h%1))) if (kalan-- > 0) sonuc[k]++;
  return sonuc;
}
function endeks(t) { return {soru:t.s, dogru:t.d, n:normalize(t.s), dn:normalize(t.d), kok:kokler(t.s)}; }
export function yerelKapilar(t, mevcut, parti) {
  if (t.ele_neden) return t.ele_neden;
  if (!KATEGORI.includes(t.k)) return 'biçim: kategori kapsam dışında';
  if (![2,3].includes(t.z)) return 'biçim: z yalnız 2 veya 3';
  if (t.yerel && t.en) return 'biçim: yerel soru stil gereği EN almamalı';
  if (typeof t.yerel !== 'boolean') return 'biçim: yerel boolean olmalı';
  if (typeof t.olgu !== 'string' || !t.olgu.trim()) return 'biçim: olgu eksik';
  if (!t.en && (typeof t.en_neden !== 'string' || !t.en_neden.trim())) return 'biçim: en_neden eksik';
  if (t.en && (typeof t.en.s!=='string'||!t.en.s.trim()||typeof t.en.d!=='string'||!t.en.d.trim()||!Array.isArray(t.en.y)||t.en.y.length!==3||t.en.y.some(x=>typeof x!=='string'||!x.trim()))) return 'biçim: EN bozuk';
  const {hata,uyari} = kayitDenetle({...t,benzerOk:true});
  if (hata.length) return 'biçim/kural: '+hata.join('; ');
  // Stil profilindeki en uzun doğru şık yasağı, modülün ağır işaret eşiğinden daha sıkıdır.
  for (const dil of [t,t.en].filter(Boolean)) if(dil.d.length>Math.max(...dil.y.map(x=>x.length))) return 'şık dengesi: doğru tek en uzun';
  const ele = uyari.filter(u=>ELE_UYARI.test(u));
  if (ele.length) return 'uyarı: '+ele.join('; ');
  if (t.en && t.en.y.some(x=>typeof x!=='string'||!x.trim())) return 'biçim: EN boş/bozuk yanlış şık';
  const e = endeks(t);
  for (const kk of kokler(t.d)) if (kk.length>=4 && e.kok.has(kk)) return 'cevap soruda: '+t.d;
  for (const m of [...mevcut,...parti]) {
    if (m.n===e.n) return 'birebir: '+m.soru;
    const j=jaccard(e.kok,m.kok);
    if ((m.dn===e.dn && j>=0.3)||j>=0.6) return 'benzer ('+j.toFixed(2)+'): '+m.soru+' → '+m.dogru;
  }
  return null;
}
export function tekDogruOlasilik(yanit) {
  const p=[0,1,2].map(i=>yanit.answers?.['sik_'+i]?.noul);
  if (p.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>1)) throw new Error('Jev tek doğru yanıtı eksik/geçersiz; kapı geçmedi');
  return Math.max(...p);
}
export function ipucuGecer(p) { return typeof p==='number' && Number.isFinite(p) && p>=0 && p<=0.75; }

function olcum(adet) {
  // Tek toplu sorgu: tüm tekrar havuzu + kota ölçümü. Veritabanında yazma yok.
  const havuz=sorgu("select soru,kategori,aktif,zorluk,secenekler->>dogru_cevap dogru, ('sik_ipucu_jev'=any(coalesce(supheli_isaretler,'{}'))) ipuculu from public.questions");
  const say=Object.fromEntries(KATEGORI.map(k=>[k,havuz.filter(t=>t.kategori===k&&t.aktif&&[2,3].includes(Number(t.zorluk))&&!t.ipuculu).length]));
  const tavan=Math.max(...Object.values(say))+25;
  const kota=paylastir(Object.fromEntries(KATEGORI.map(k=>[k,tavan-say[k]])),adet);
  return {havuz,plan:{olcum_z2_z3:say,kota,z3:paylastir(kota,Math.round(adet*0.3)),tarih:new Date().toISOString()}};
}
export const ALT_SINIR = {teknoloji:['video_oyunu_maskot',0.35],sinema:['animasyon',0.35],sanat:['tablo_gorsel',0.4],genel_kultur:['marka_maskot_cizgi',0.4]};
export function cesitlilikHata(t) {
  if(typeof t.kalip!=='string'||!t.kalip.trim()||typeof t.alt_tur!=='string'||!t.alt_tur.trim()||!Array.isArray(t.konular)||!t.konular.length||t.konular.some(x=>typeof x!=='string'||!x.trim())||new Set(t.konular).size!==t.konular.length)return 'biçim: çeşitlilik alanları eksik/bozuk';
  const sahip=Object.entries(ALT_SINIR).find(([,v])=>v[0]===t.alt_tur)?.[0];
  if(sahip&&sahip!==t.k)return 'biçim: sınırlı alt tür yanlış kategoride';
  return null;
}
export function cesitlilikSay(secilen, st) {
  const kalip={},konu={},alt={};
  for(const t of secilen){kalip[t.kalip]=(kalip[t.kalip]??0)+1;for(const x of t.konular??[])konu[t.k+':'+x]=(konu[t.k+':'+x]??0)+1;const key=t.k+':'+t.alt_tur;alt[key]=(alt[key]??0)+1;}
  return {kalip,konu,alt_tur:alt,kalip_siniri:Math.floor(st.adet*.05),konu_siniri:2,alt_sinir:Object.fromEntries(Object.entries(ALT_SINIR).map(([k,[a,p]])=>[k+':'+a,Math.floor(st.plan.kota[k]*p)]))};
}
export function sec(st, adaylar) {
  const yeni=Number(st.klasor.slice(-2))>=2;
  const kalip={},konu={},alt={};const secilen=[];let yerel=0;
  // En dar aday kovalari önce: kalıp ortak sınırı geniş kategorinin dar kotayı kapatmasını önler.
  const kovalar=KATEGORI.flatMap(k=>[2,3].map(z=>({k,z,h:z===3?st.plan.z3[k]:st.plan.kota[k]-st.plan.z3[k],a:adaylar.filter(t=>t.k===k&&t.z===z&&t.sonuc==='gecti')})));
  kovalar.sort((a,b)=>(a.a.length/Math.max(1,a.h))-(b.a.length/Math.max(1,b.h)));
  for (const {k,z,h,a} of kovalar) {
    let say=0;
    for(const t of a.sort((a,b)=>a.jev_p-b.jev_p)){
      if(say===h)break;
      if(t.yerel&&(yerel>=Math.floor(st.adet*.1)||(['tarih','edebiyat'].includes(k)&&secilen.filter(x=>x.k===k&&x.yerel).length>=Math.floor(st.plan.kota[k]*.3))))continue;
      const ak=k+':'+t.alt_tur,lim=ALT_SINIR[k];
      if(yeni&&((kalip[t.kalip]??0)>=Math.floor(st.adet*.05)||(t.konular??[]).some(x=>(konu[k+':'+x]??0)>=2)||(lim&&t.alt_tur===lim[0]&&(alt[ak]??0)>=Math.floor(st.plan.kota[k]*lim[1]))))continue;
      secilen.push(t);say++;if(t.yerel)yerel++;
      kalip[t.kalip]=(kalip[t.kalip]??0)+1;alt[ak]=(alt[ak]??0)+1;for(const x of t.konular??[])konu[k+':'+x]=(konu[k+':'+x]??0)+1;
    }
  }
  return secilen.sort((a,b)=>KATEGORI.indexOf(a.k)-KATEGORI.indexOf(b.k)||a.z-b.z||a.id.localeCompare(b.id));
}
function sonYaz(st, adaylar, klasor) {
  const secilen=sec(st,adaylar);
  const eksik={};
  for(const k of KATEGORI) for(const z of [2,3]) {
    const h=z===3?st.plan.z3[k]:st.plan.kota[k]-st.plan.z3[k];
    const n=secilen.filter(t=>t.k===k&&t.z===z).length;
    if(n<h) (eksik[k]??={})['z'+z]=h-n;
  }
  const sebep={};
  for(const t of adaylar.filter(t=>t.sonuc==='elendi')) {
    const ad=t.neden.replace(/[:(].*$/,'').trim();sebep[ad]=(sebep[ad]??0)+1;
  }
  const cikti=secilen.map((t,i)=>({id:st.klasor.replace('codex-','C')+'-'+String(i+1).padStart(2,'0'),taslak_id:t.id,k:t.k,yerel:t.yerel,s:t.s,d:t.d,y:t.y,zorluk:t.z,en:t.en??null,...(!t.en?{en_neden:t.en_neden}:{}),olgu:t.olgu,...(t.kalip?{kalip:t.kalip,konular:t.konular,alt_tur:t.alt_tur}:{}),...(t.kaynak?{kaynak:t.kaynak}:{}),jev_p:t.jev_p,jev_tek_dogru_p:t.tek_dogru_p,kapilar:[1,2,3,4,5],claude_inceleme:'bekliyor'}));
  const sy=path.join(klasor,'sorular.json'), by=path.join(klasor,'bekleyen.sql');
  if(fs.existsSync(by)&&(!fs.existsSync(sy)||ozetHash(oku(sy))!==ozetHash(cikti))) fs.unlinkSync(by);
  const kategori=Object.fromEntries(KATEGORI.map(k=>[k,{z2:cikti.filter(t=>t.k===k&&t.zorluk===2).length,z3:cikti.filter(t=>t.k===k&&t.zorluk===3).length}]));
  const ozet={klasor:st.klasor,tarih:new Date().toISOString(),uretici:'Codex',hakem:'Claude ayrı inceleme — bekliyor',hedef:st.adet,kota_gerekce:'Aktif z2+3, sik_ipucu_jev işaretsiz; az olana çok (tavan+25−sayı)',...st.plan,taslak:adaylar.length,gecen:adaylar.filter(t=>t.sonuc==='gecti').length,secilen:cikti.length,kategori,zorluk:{2:cikti.filter(t=>t.zorluk===2).length,3:cikti.filter(t=>t.zorluk===3).length},yerel:cikti.filter(t=>t.yerel).length,global:cikti.filter(t=>!t.yerel).length,en:cikti.filter(t=>t.en).length,elenen_sebep:sebep,eksik,harcama_usd:{claude:0,jev:maliyetUsd(st.jev_jeton),jev_jeton:st.jev_jeton},...(Number(st.klasor.slice(-2))>=2?{cesitlilik:cesitlilikSay(secilen,st)}:{}),migration:fs.existsSync(by)?'bekleyen.sql — hazır; uygulanmadı':'bekleyen.sql — hazırlanacak; uygulanmaz'};
  atomik(path.join(klasor,'ozet.json'),ozet);
  // Eksik parti eski bir sorular.json'u hazırmış gibi bırakamaz.
  if(Object.keys(eksik).length) {
    for(const ad of ['sorular.json','okunur-liste.md','bekleyen.sql']) if(fs.existsSync(path.join(klasor,ad))) fs.unlinkSync(path.join(klasor,ad));
    console.log(JSON.stringify({gecen:ozet.gecen,secilen:ozet.secilen,eksik,elenen_sebep:sebep,jev_usd:ozet.harcama_usd.jev}));
    return false;
  }
  atomik(path.join(klasor,'sorular.json'),cikti);
  const satir=cikti.map((t,i)=>String(i+1).padStart(2,'0')+' | '+t.k+' | '+t.zorluk+' | '+t.s+' | ✔ '+t.d+' | ✗ '+t.y.join(' · ')+' | '+t.olgu+' | EN: '+(t.en?t.en.s+' — '+t.en.d:'—'));
  const baslik='# '+st.klasor+' — '+cikti.length+' soru; Claude incelemesi bekliyor\n\nKategori × zorluk: '+Object.entries(kategori).map(([k,v])=>k+' '+v.z2+'×z2 / '+v.z3+'×z3').join(' · ')+'\nYerel/global: '+ozet.yerel+'/'+ozet.global+'; yerel %'+(100*ozet.yerel/cikti.length).toFixed(1)+'; EN '+ozet.en+'.\nTaslak '+adaylar.length+'; geçen '+ozet.gecen+'; seçilen '+cikti.length+'. Elenme: '+JSON.stringify(sebep)+'.\nKapı 1–5 geçti. Son doğruluk, stil ve EN hakemliği Claude tarafından yapılacak. Migration uygulanmadı.\n\n';
  fs.writeFileSync(path.join(klasor,'okunur-liste.md'),baslik+satir.join('\n')+'\n');
  console.log(JSON.stringify({hazir:st.klasor,adet:cikti.length,jev_usd:ozet.harcama_usd.jev}));
  return true;
}
export async function main(argv=process.argv) {
  const arg=(ad,v)=>{const i=argv.indexOf(ad);return i>=0?argv[i+1]:v;};
  const ad=arg('--klasor');const adet=Number(arg('--adet',ad==='codex-01'?50:200));
  if(!/^codex-\d{2}$/.test(ad??'')||!Number.isInteger(adet)||adet<1) throw new Error('Kullanım: --klasor codex-NN --adet N [--olc|--on-denetle] [--girdi dosya.json]');
  const ara=path.join(KOK,'.tmp','codex',ad);const dy=path.join(ara,'durum.json');
  const klasor=path.join(KOK,'araclar','soru-uretim',ad);
  fs.mkdirSync(klasor,{recursive:true});
  let st=fs.existsSync(dy)?oku(dy):null;
  if(st&&st.adet!==adet) throw new Error('Parti hedefi değiştirilemez; yeni parti kullan');
  if(!st){const {havuz,plan}=olcum(adet);st={surum:1,klasor:ad,adet,plan,jev_jeton:0,kayitlar:{},asama:'olculdu'};atomik(path.join(ara,'havuz.json'),havuz);atomik(dy,st);
    const kavram=KATEGORI.map(k=>'## '+k+'\n'+havuz.filter(t=>t.kategori===k).map(t=>t.soru+' → '+t.dogru+' | '+[...kokler(t.soru)].join(' ')).join('\n')).join('\n\n');
    fs.writeFileSync(path.join(ara,'kavramlar.md'),kavram);
  }
  if(argv.includes('--olc')){console.log(JSON.stringify(st.plan));return;}
  if(argv.includes('--havuzu-yenile')) {
    const yeni=olcum(adet); atomik(path.join(ara,'havuz.json'),yeni.havuz);
    // Onay sonrası kota korunur; yeni havuz yalnız tekrar denetimi içindir.
    st.havuz_yenileme=new Date().toISOString(); atomik(dy,st);
  }
  const mevcut=oku(path.join(ara,'havuz.json')).map(t=>({...t,...endeks({s:t.soru,d:t.dogru??''})}));
  const girdi=path.resolve(KOK,arg('--girdi',path.join('araclar','soru-uretim',ad,'taslaklar.json')));
  const ham=oku(girdi);
  if(!Array.isArray(ham)||ham.some(t=>typeof t.id!=='string'||!/^[-A-Za-z0-9]+$/.test(t.id)||['constructor','prototype'].includes(t.id))||new Set(ham.map(t=>t.id)).size!==ham.length)throw new Error('Taslak dizisi ve benzersiz id zorunlu');
  const parti=[];const adaylar=[];
  for(const t0 of ham){const t={...t0,z:t0.z??t0.zorluk,en:t0.en??null};const hash=ozetHash(t);const eski=st.kayitlar[t.id];
    const r=eski?.hash===hash?eski:{hash,kapi:0};st.kayitlar[t.id]=r;
    const neden=(Number(ad.slice(-2))>=2?cesitlilikHata(t):null)||yerelKapilar(t,mevcut,parti);
    if(neden){adaylar.push({...t,sonuc:'elendi',neden});continue;}
    parti.push(endeks(t));
    adaylar.push({...t,...r,sonuc:r.sonuc??'bekliyor'});
  }
  const kaydet=()=>{st.girdi_hash=ozetHash(ham);st.guncelleme=new Date().toISOString();atomik(dy,st);};
  if(argv.includes('--on-denetle')){atomik(path.join(ara,'on-denetim.json'),adaylar.map(t=>({id:t.id,k:t.k,z:t.z,s:t.s,sonuc:t.sonuc,neden:t.neden??null})));kaydet();console.log(JSON.stringify({taslak:ham.length,yerel_gecen:adaylar.filter(t=>t.sonuc!=='elendi').length,elenen:adaylar.filter(t=>t.sonuc==='elendi').map(t=>({id:t.id,neden:t.neden}))}));return;}
  const gereken=adaylar.filter(t=>t.sonuc!=='elendi'&&t.kapi<3);
  if(gereken.length){const rows=sorgu(hamKapiSorgusu(gereken.map(t=>({anahtar:t.id,soru:t.s,secenekler:[t.d,...t.y],dogru_cevap:0}))));const map=new Map(rows.map(r=>[r.anahtar,r]));
    for(const t of gereken){const row=map.get(t.id);if(!row)throw new Error('Kural kapısında satır eksik; işlem durdu');const r=st.kayitlar[t.id];r.kapi=3;if(row.agir){r.sonuc='elendi';r.neden='kural işareti: '+row.agir;}Object.assign(t,r);}kaydet();
  }
  // Tek işçi: en fazla dört sınırının altında; her başarılı aşama anında kaydedilir.
  for(const t of adaylar.filter(t=>t.sonuc!=='elendi'&&t.sonuc!=='gecti')){
    const r=st.kayitlar[t.id];
    try{
      if(r.kapi<4){const ip=await sikIpucuTesti([t.d,...t.y],t.d,t.s);st.jev_jeton+=ip.jeton??0;
        if(typeof ip.pDogru!=='number'||!Number.isFinite(ip.pDogru)||ip.pDogru<0||ip.pDogru>1)throw new Error('Jev ipucu yanıtı eksik/geçersiz');
        r.jev_p=ip.pDogru;r.kapi=4;if(!ipucuGecer(ip.pDogru)){r.sonuc='elendi';r.neden='Jev ipucu: p='+ip.pDogru+' > 0.75';}kaydet();
      }
      if(r.sonuc!=='elendi'&&r.kapi<5){const sorular=Object.fromEntries(t.y.map((s,i)=>['sik_'+i,noul('Soruya "'+s+'" cevabı verilirse bu da doğru sayılabilir mi?')]));
        const y=await jevSor({soru:t.s,siklar:[t.d,...t.y],dogru_cevap:t.d},sorular);st.jev_jeton+=y.usage?.input_tokens??0;kaydet();
        r.tek_dogru_p=tekDogruOlasilik(y);r.kapi=5;r.sonuc=r.tek_dogru_p>=0.5?'elendi':'gecti';r.neden=r.sonuc==='elendi'?'yanlış şık da doğru: p='+r.tek_dogru_p:'';kaydet();
      }
      Object.assign(t,r);console.log(t.id+' '+r.sonuc);
     }catch(e){st.asama='işlem durdu; '+t.id+' '+(r.kapi>=5?'durum yazımı':'kapı '+(r.kapi+1));st.son_hata={tur:e.name,kod:e.code??null};kaydet();throw new Error(st.asama+' ('+e.name+(e.code?' '+e.code:'')+'); aynı komutla devam edin. Başarısız kapı geçmiş sayılmadı.');}
  }
  atomik(path.join(ara,'denetim.json'),adaylar);
  if(argv.includes('--yalniz-kapilar')) {st.asama='inceleme sonrası kapılar';kaydet();const elenen=adaylar.filter(t=>t.sonuc!=='gecti');console.log(JSON.stringify({gecen:adaylar.length-elenen.length,elenen:elenen.map(t=>({id:t.id,neden:t.neden}))}));if(elenen.length)process.exitCode=1;return;}
  st.asama=sonYaz(st,adaylar,klasor)?'Claude incelemesi bekliyor':'kota eksiği; ek taslak gerekli';kaydet();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
