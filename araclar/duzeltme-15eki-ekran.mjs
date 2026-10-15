// 15 Eki 2026 tam tur sonrası düzeltme paketi — önce/sonra ekran + ölçüm (390 ve 360 px, TR + EN).
// Ida hesabı (admin magic link, bellekte; diske yazılmaz), sunucuya YAZMAZ: profil dili yalnız yanıtta taklit edilir.
// Her sayfa/viewport/dil için en fazla BİR kez açılır.
// Kullanım: node araclar/duzeltme-15eki-ekran.mjs --etiket=once --adres=https://quiztactics.com
//           node araclar/duzeltme-15eki-ekran.mjs --etiket=sonra --adres=http://localhost:5199
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5199").replace(/\/$/, "");
const ETIKET = ARG.etiket || "sonra";
const CIKTI = path.resolve("tasarim/duzeltme-15eki");
fs.mkdirSync(CIKTI, { recursive: true });

const E = {};
for (const d of [".env.local", ".env"]) { try { for (const m of fs.readFileSync(d, "utf8").matchAll(/^([A-Z_]+)=(.*)$/gm)) if (!(m[1] in E)) E[m[1]] = m[2].trim(); } catch { /* yok */ } }
const URL_ = E.SUPABASE_YENI_URL || E.VITE_SUPABASE_URL, SERVIS = E.SUPABASE_YENI_SERVICE_ROLE_KEY, ANON = E.VITE_SUPABASE_ANON_KEY;
const istek = async (yol, govde, anahtar) => {
  const r = await fetch(URL_ + yol, { method: "POST", headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}`, "Content-Type": "application/json" }, body: JSON.stringify(govde) });
  const m = await r.text(); if (!r.ok) throw new Error(`${yol} → ${r.status}`); return JSON.parse(m);
};
const link = await istek("/auth/v1/admin/generate_link", { type: "magiclink", email: "idagureli@gmail.com" }, SERVIS);
const o = await istek("/auth/v1/verify", { type: "magiclink", token_hash: link?.properties?.hashed_token ?? link?.hashed_token }, ANON);
const kayit = { access_token: o.access_token, refresh_token: o.refresh_token, expires_in: o.expires_in, expires_at: o.expires_at ?? Math.floor(Date.now() / 1000) + Number(o.expires_in ?? 3600), token_type: "bearer", user: o.user };
const ref = new URL(URL_).hostname.split(".")[0];
const AUTH = { name: `sb-${ref}-auth-token`, value: JSON.stringify(kayit) };

// Sayfa başına ölçüm (sayfa içinde çalışır)
const OLCUM = {
  hesap_sil: () => { const u = document.querySelector(".g-yasal-ust"); return u ? [...u.children].map((c) => ({ s: c.className.toString().slice(0, 24), top: Math.round(c.getBoundingClientRect().top), w: Math.round(c.getBoundingClientRect().width) })) : null; },
  arkadaslar: () => [...document.querySelectorAll(".qt-paylas-ikili .qt-dugme")].map((b) => ({ t: b.innerText.trim().slice(0, 24), h: Math.round(b.getBoundingClientRect().height) })),
  meydan: () => ({ baslik: document.title, adlar: [...document.querySelectorAll(".a-meydan .ls-ad-dugme")].slice(0, 6).map((b) => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim().slice(0, 14), w: Math.round(r.width), h: Math.round(r.height) }; }) }),
  turnuva: () => ({ kalan: (document.body.innerText.match(/(Bugün kalan|Tournaments left)[^\n]*\n?[^\n]*/) || [""])[0], yirmidort: /24:00/.test(document.body.innerText) }),
  ana: () => ({ kalan: (document.body.innerText.match(/(Bugün kalan|Tournaments left)[^\n]*\n?[^\n]*/) || [""])[0], yirmidort: /24:00/.test(document.body.innerText), meydan: /Meydan Okumalar|Challenges\b/.test(document.body.innerText) }),
  profil: () => ({ bankada: [...document.querySelectorAll("a")].filter((a) => /Bankada|In (your )?bank/.test(a.innerText)).map((a) => ({ t: a.innerText.replace(/\n/g, " | "), h: Math.round(a.getBoundingClientRect().height) })), baskin: /Baskın|Kalkan|Ambush|Shield/.test(document.body.innerText) }),
  calisma: () => { const h = document.querySelector(".m1-cal-hero"); return h ? { h: Math.round(h.getBoundingClientRect().height), baslik: Math.round(h.querySelector(".m1-cal-hero-baslik").getBoundingClientRect().height), kural: Math.round(h.querySelector(".m1-cal-hero-kural").getBoundingClientRect().height) } : null; },
  joker: () => ({ rozetler: [...new Set([...document.querySelectorAll(".qt-dk-modrozet")].map((r) => r.innerText.trim() + "|" + Math.round(r.getBoundingClientRect().height)))].slice(0, 6), ikiNokta: document.querySelectorAll(".qt-dk-modnokta").length }),
  efekt: () => ({ tak: [...document.querySelectorAll("button")].filter((b) => /^(Tak|Equip|Wear)$/.test(b.innerText.trim())).map((b) => ({ t: b.innerText.trim(), svg: b.querySelectorAll("svg").length })).slice(0, 6) }),
  koleksiyon: () => { const u = document.querySelector(".qt-cs-izgara--cerceve, .qt-cs-izgara"); return u ? { sutun: getComputedStyle(u).gridTemplateColumns.split(" ").length } : null; },
  modlar: () => ({ saf: (document.body.innerText.match(/Saf Bilgi[\s\S]{0,60}/) || [""])[0].replace(/\n/g, " | ") }),
};
const SAYFALAR = [
  ["hesap_sil", "/hesap-sil"], ["arkadaslar", "/arkadaslar"], ["meydan", "/meydan"], ["turnuva", "/turnuva"], ["ana", "/"],
  ["profil", "/profil"], ["calisma", "/calisma"], ["joker", "/joker"], ["efekt", "/joker?sekme=efekt"], ["koleksiyon", "/profil?sekme=koleksiyon", async (s) => {
    const b = s.getByRole("tab", { name: /Çerçeve|Frame/ }); if (await b.count()) { await b.first().click(); await s.waitForTimeout(800); } }],
  ["modlar", "/modlar"],
];
const GORUNUM = [{ ad: "390", w: 390, h: 844 }, { ad: "360", w: 360, h: 740 }];
const sonuc = {};
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
try {
  for (const g of GORUNUM) for (const dil of ["tr", "en"]) {
    const b = await tarayici.newContext({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: dil === "en" ? "en-US" : "tr-TR", serviceWorkers: "block" });
    await b.addInitScript(([a, dil]) => { try { localStorage.setItem(a.name, a.value); localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1"); sessionStorage.setItem("qt_dev_gecis", "1"); } catch { /* yok */ } }, [AUTH, dil]);
    for (const [ad, yol, hazir] of SAYFALAR) {
      const s = await b.newPage();
      await s.route("**/rest/v1/rpc/profilim*", async (r) => {
        try { const y = await r.fetch(); const j = await y.json(); const p = Array.isArray(j) ? j[0] : j; if (p) p.dil = dil; await r.fulfill({ response: y, json: j }); } catch { await r.continue().catch(() => {}); }
      });
      const hatalar = [];
      s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 140)); });
      try {
        await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
        await s.waitForTimeout(3800);
        if (hazir) await hazir(s);
        const olcum = await s.evaluate(OLCUM[ad]);
        const tasma = await s.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        await s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${ad}-${g.ad}-${dil}.png`) });
        sonuc[`${ad}-${g.ad}-${dil}`] = { olcum, tasma, konsol: hatalar.length };
      } catch (e) { sonuc[`${ad}-${g.ad}-${dil}`] = { hata: String(e.message).slice(0, 120) }; }
      await s.close();
    }
    await b.close();
  }
} finally { await tarayici.close(); }
fs.writeFileSync(path.join(CIKTI, `olcum-${ETIKET}.json`), JSON.stringify(sonuc, null, 1));
console.log(JSON.stringify(sonuc, null, 1).slice(0, 6000));
