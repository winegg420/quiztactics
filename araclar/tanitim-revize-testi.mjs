import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const etap=process.argv[2]||'sonra';
const cikti=path.resolve('.tmp/site-revize');fs.mkdirSync(cikti,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const dist=path.resolve('dist');const server=http.createServer((q,s)=>{let file=path.resolve(dist,'.'+decodeURIComponent(new URL(q.url,'http://x').pathname));if(file!==dist&&!file.startsWith(dist+path.sep)){s.writeHead(403);s.end();return;}if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){if(path.extname(file)){s.writeHead(404);s.end();return;}file=path.join(dist,'index.html');}s.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(s);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://qt.test:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--host-resolver-rules=MAP qt.test 127.0.0.1']});
const results=[];
try{for(const dil of ['tr','en'])for(const w of [390,1440]){const ctx=await browser.newContext({viewport:{width:w,height:w===390?844:900},serviceWorkers:'block',reducedMotion:'reduce'});const blocked=[];await ctx.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===origin?r.continue():(blocked.push(u.origin),r.abort());});await ctx.addInitScript(d=>{localStorage.setItem('bildim_dil',d);},dil);const pg=await ctx.newPage();const errors=[],bad=[];pg.on('pageerror',e=>errors.push(e.message));pg.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});await pg.goto(origin,{waitUntil:'networkidle'});await pg.locator('.tn').waitFor();await pg.evaluate(()=>document.fonts.ready);
// Klavyeyle ilk denetime ulaşıldığında görünür odak halkası olmalı.
await pg.keyboard.press('Tab');
const focus = await pg.evaluate(() => { const e=document.activeElement,s=getComputedStyle(e); return { tag:e.tagName, visible:e.matches(':focus-visible') && s.outlineStyle!=='none' && parseFloat(s.outlineWidth)>=2 }; });
await pg.locator('.tn-dil button').filter({hasText:dil==='tr'?'EN':'TR'}).click();
await pg.locator('.tn-dil button').filter({hasText:dil.toUpperCase()}).click();
const language = await pg.locator('h1').innerText();
await pg.locator('.tn').waitFor();await pg.evaluate(()=>document.fonts.ready);
await pg.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}window.scrollTo(0,0);});await pg.waitForTimeout(300);
const file=`${etap}-${w}-${dil}.png`;await pg.screenshot({path:path.join(cikti,file),fullPage:true});
const layout=await pg.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,brokenImages:[...document.querySelectorAll('.tn img')].filter(e=>!e.complete||e.naturalWidth===0).map(e=>e.src),headings:[...document.querySelectorAll('.tn h1,.tn h2')].map(e=>e.textContent)}));
await pg.locator('.tn-kur-dugme').click();await pg.waitForTimeout(100);const cta=await pg.locator('#tn-kur-baslik').evaluate(e=>document.activeElement===e);
const qr=pg.locator('.tn a:has(img[src="/quiztactics-qr.svg"])');let qrClick=null;if(await qr.count()){await qr.first().click();qrClick=new URL(pg.url()).hash==='#tn-kur';}
const links=await pg.locator('.tn a[href]').evaluateAll(a=>a.map(e=>({href:e.getAttribute('href'),text:e.textContent.trim()||e.getAttribute('aria-label')})));
const linkResults=[];for(const a of links){if(a.href.startsWith('#')){linkResults.push({...a,ok:await pg.locator(a.href).count()>0});continue;}if(a.href.startsWith('mailto:')){linkResults.push({...a,ok:a.href==='mailto:info@quiztactics.com',type:'mailto; e-posta gönderilmedi'});continue;}const dest=new URL(a.href,origin);if(dest.origin!==origin){linkResults.push({...a,ok:false,type:'dış bağlantı; gözden geçir'});continue;}const response=await pg.request.get(dest.href.replace("qt.test","127.0.0.1"));linkResults.push({...a,ok:response.ok(),status:response.status()});}
const hit=[];const interactive=pg.locator('.tn button,.tn a[href]');for(let i=0;i<await interactive.count();i++){const el=interactive.nth(i);if(!await el.isVisible())continue;await el.scrollIntoViewIfNeeded();hit.push(await el.evaluate(e=>{const b=e.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{label:e.textContent.trim()||e.getAttribute('aria-label'),ok:e===top||e.contains(top)};}));}
// HTTP 200 tek başına yeterli değil: yasal bağlantıların gerçek sayfalarını aç.
const legal=[];
for (const route of ['/gizlilik','/kosullar','/hesap-sil']) {
  await pg.goto(origin+route,{waitUntil:'networkidle'});
  const headings=await pg.locator('h1,h2').allTextContents();
  legal.push({route,headings,ok:headings.length>0 && await pg.locator('.tn').count()===0});
}
results.push({focus,language,legal,dil,w,file,layout,cta,qrClick,links:linkResults,hit,errors,bad,blocked:[...new Set(blocked)]});await ctx.close();}
}finally{await browser.close();await new Promise(r=>server.close(r));}
fs.writeFileSync(path.join(cikti,`${etap}.json`),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({dil:r.dil,w:r.w,overflow:r.layout.scroll-r.layout.width,images:r.layout.brokenImages,cta:r.cta,qr:r.qrClick,links:r.links,hitErrors:r.hit.filter(x=>!x.ok),errors:r.errors,bad:r.bad})),null,2));if(results.some(r=>!r.focus.visible||r.legal.some(x=>!x.ok)||(etap==='sonra'&&!r.qrClick)||r.layout.scroll>r.layout.width||r.layout.brokenImages.length||!r.cta||r.hit.some(x=>!x.ok)||r.errors.length||r.bad.length||r.links.some(x=>!x.ok)))process.exitCode=1;


