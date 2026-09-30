import { chromium } from "playwright-core";
const [w,h,ad]=[+process.argv[2],+process.argv[3],process.argv[4]];
const t=await chromium.launch({channel:"chrome",headless:true});
const c=await t.newContext({storageState:".arayuz-denetim-oturum.json",viewport:{width:w,height:h},deviceScaleFactor:2});
const s=await c.newPage();
await s.goto("http://localhost:5173/",{waitUntil:"domcontentloaded"});
await s.waitForTimeout(4000);
if(process.argv[5]==="en"){await s.evaluate(()=>localStorage.setItem("bildim_dil","en"));await s.reload({waitUntil:"domcontentloaded"});await s.waitForTimeout(3000);}
const tm=s.getByRole("button",{name:/^(Tamam|OK|Done)$/});if(await tm.count()){await tm.first().click();await s.waitForTimeout(600);}
const o=await s.evaluate(()=>{const r=q=>{const e=document.querySelector(q);if(!e)return null;const b=e.getBoundingClientRect();return [Math.round(b.top),Math.round(b.bottom),Math.round(b.height)]};
return {kart:r(".as-a2-kart"),lig:r(".as-a2-lig"),turnuva:r(".as-a2-turnuva"),oyna:r(".as-buyuk-dugme--oyna"),duello:r(".as-buyuk-dugme--duello"),gorev:r(".as-a2-gorev"),tasma:document.documentElement.scrollWidth-document.documentElement.clientWidth,
duelloBg:getComputedStyle(document.querySelector(".as-buyuk-dugme--duello")).backgroundColor,tab:[...document.querySelectorAll(".a-altmenu a, .a-altmenu button, nav[aria-label] a")].slice(0,6).map(e=>e.textContent.trim())}});
console.log(JSON.stringify(o));
await s.screenshot({path:`tasarim/ana-sayfa-ss/${ad}.png`});
await t.close();
