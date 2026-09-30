// Oyun içi kartlar (ana sayfa, profil, lig satırı, dükkân) — 4 arka plan, yeni mod varsayılan. Test hesabı: oturum dosyası.
// Kullanım: ADRES=http://localhost:5175 node oyun/tasarim/arka-plan/olcum/oyun-ekran.mjs [genislik] [dil]
import { chromium } from "playwright-core"; import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "../../../../araclar/pg-mini.mjs";
const ADRES = process.env.ADRES || "http://localhost:5175";
const GEN = Number(process.argv[2] || 390); const DIL = process.argv[3] || "tr";
const dizin = "tasarim/arka-plan-varsayilan"; fs.mkdirSync(dizin, { recursive: true });
const oturum = JSON.parse(fs.readFileSync(".arka-plan-oturum.json", "utf8"));
const kayit = oturum.origins[0].localStorage.find((x) => x.name.includes("auth-token"));
const UID = JSON.parse(kayit.value).user.id;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const Q = (s) => db.sorgu(s);
const hamS = await Q(`select takili_premium_aura from public.profiles where id='${UID}'`);
const onceki = hamS[0]?.takili_premium_aura ?? null;
for (const k of ["pa_sualti", "pa_kar", "pa_yaprak", "pa_gece"]) await Q(`insert into public.oyuncu_kozmetikleri(user_id,kozmetik,kaynak) values ('${UID}','${k}','hediye') on conflict do nothing`);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: GEN, height: 800 }, deviceScaleFactor: 2, reducedMotion: process.env.AZALT ? "reduce" : "no-preference", storageState: { cookies: [], origins: [{ origin: ADRES, localStorage: [...oturum.origins[0].localStorage.filter((x) => x.name !== "qt_dil"), { name: "qt_dil", value: DIL }] }] } });
const p = await c.newPage(); const hata = [];
p.on("pageerror", (e) => hata.push(e.message.slice(0, 140))); p.on("console", (m) => { if (m.type() === "error") hata.push("K:" + m.text().slice(0, 140)); });
const gor = process.argv[4] ? process.argv[4].split(",") : ["/", "/profil", "/siralama"];
try {
  for (const tur of ["pa_sualti", "pa_kar", "pa_yaprak", "pa_gece"]) {
    await Q(`update public.profiles set takili_premium_aura='${tur}' where id='${UID}'`);
    for (const yol of gor) {
      await p.goto(ADRES + yol, { waitUntil: "domcontentloaded" }); await p.waitForSelector(".abp--tam", { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1800);
      const ad = (yol === "/" ? "ana" : yol.slice(1).replace(/\//g, "-")) + `-${tur.slice(3)}-${GEN}-${DIL}${process.env.AZALT ? "-azalt" : ""}`;
      if (yol === "/siralama") { }
      await p.screenshot({ path: `${dizin}/${ad}.png`, fullPage: false });
      if (yol === "/siralama") { const satir = p.locator(".lg-ben.abp-sahip").first(); try { await satir.scrollIntoViewIfNeeded({ timeout: 4000 }); await p.waitForTimeout(600); const kr = await satir.boundingBox(); if (kr) await p.screenshot({ path: `${dizin}/lig-satiri-${tur.slice(3)}-${GEN}-${DIL}${process.env.AZALT ? "-azalt" : ""}.png`, clip: { x: 0, y: Math.max(0, kr.y - 10), width: GEN, height: kr.height + 20 } }); } catch { console.log("  lig satırı bulunamadı"); } }
      const olcum = await p.evaluate(() => {
        const hareketli = document.querySelectorAll(".abp--oynar, .abp--yumusak").length;
        let kesisen = 0, statik = 0; const detay = [];
        for (const kart of document.querySelectorAll(".abp-sahip")) {
          const ogeler = [...kart.querySelectorAll(".abp-st, .abp-gece-yildiz")].filter((e) => !e.classList.contains("abp-st-tepe")); if (!ogeler.length) continue; statik++;
          const kr = kart.getBoundingClientRect(); const r = [];
          const w = document.createTreeWalker(kart, NodeFilter.SHOW_TEXT);
          while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim() || n.parentElement.closest(".abp") || getComputedStyle(n.parentElement).visibility === "hidden") continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 2) r.push(q); }
          for (const e of ogeler) { const q = e.getBoundingClientRect(); if (q.right <= kr.left || q.left >= kr.right || q.bottom <= kr.top || q.top >= kr.bottom) continue; if (r.some((t) => q.left < t.right + 1 && q.right > t.left - 1 && q.top < t.bottom + 1 && q.bottom > t.top - 1)) { kesisen++; detay.push(Math.round(kr.width) + "x" + Math.round(kr.height) + " " + e.className.slice(0,14) + " x" + Math.round(q.left - kr.left) + "-" + Math.round(q.right - kr.left) + " y" + Math.round(q.top - kr.top) + "-" + Math.round(q.bottom - kr.top)); } }
        }
        return { hareketli, statik, kesisen, detay };
      });
      console.log("  ölçüm", JSON.stringify(process.env.DETAY ? olcum : { ...olcum, detay: undefined }));
      const tas = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const n = await p.evaluate(() => document.querySelectorAll(".abp--tam").length);
      console.log(ad, "taşma", tas, "tam-kart", n);
    }
  }
} finally {
  await Q(onceki ? `update public.profiles set takili_premium_aura='${onceki}' where id='${UID}'` : `update public.profiles set takili_premium_aura=null where id='${UID}'`);
  await Q(`delete from public.oyuncu_kozmetikleri where user_id='${UID}' and kaynak='hediye' and kozmetik in ('pa_sualti','pa_kar','pa_yaprak','pa_gece')`);
  try { fs.writeFileSync(".arka-plan-oturum.json", JSON.stringify(await c.storageState())); } catch {}
  await db.kapat(); await b.close();
}
console.log("hatalar", [...new Set(hata)].slice(0, 6));
