// Codex maçlı tarama düzeltmeleri (15 Eki 2026) — önce/sonra ekran + ölçüm (390 ve 360 px, TR + EN).
// Ida hesabı (admin magic link, bellekte; diske yazılmaz), sunucuya YAZMAZ: profil dili yalnız yanıtta taklit edilir.
// Her sayfa/görünüm/dil için en fazla BİR kez açılır. Maç sonu ekranları sahip sayfası /mac-sonu-onizleme'den (sunucusuz).
// Kullanım: node araclar/duzeltme-codex-15eki-ekran.mjs --etiket=once --adres=https://quiztactics.com
//           node araclar/duzeltme-codex-15eki-ekran.mjs --etiket=sonra --adres=http://localhost:5199 [--yalniz=turnuva,grup-1]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5199").replace(/\/$/, "");
const ETIKET = ARG.etiket || "sonra";
const YALNIZ = typeof ARG.yalniz === "string" ? new Set(ARG.yalniz.split(",")) : null;
const CIKTI = path.resolve("tasarim/duzeltme-codex-15eki");
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

// Derece yazısı ↔ çerçeve: avatar kutusunun görünür alt sınırı (alt öğeler dahil) ile "N." yazısının üstü arasındaki boşluk
const DERECE = () => {
  const d = document.querySelector(".msk-derece"); const sayi = d?.querySelector(".msk-derece-sayi");
  if (!d || !sayi) return null;
  const av = d.firstElementChild;
  let alt = av.getBoundingClientRect().bottom;
  for (const e of av.querySelectorAll("*")) { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); if (r.width && r.height && st.visibility !== "hidden" && st.opacity !== "0") alt = Math.max(alt, r.bottom); }
  // yazının gerçek mürekkep üstü: satır kutusu yerine yazı tipi yüksekliğinin üst boşluğu düşülür (≈ %18)
  const sr = sayi.getBoundingClientRect();
  return { kutu_alt: Math.round(av.getBoundingClientRect().bottom), avatar_alt: Math.round(alt), sayi_ust: Math.round(sr.top), murekkep_ust: Math.round(sr.top + sr.height * 0.18), bosluk: Math.round(sr.top + sr.height * 0.18 - alt), metin: sayi.innerText };
};
const OLCUM = {
  turnuva: () => ({ baslik: document.querySelector(".m1-tv-sahne-baslik")?.innerText ?? null, yirmidort: /24:00/.test(document.body.innerText) }),
  grup: DERECE,
  paylas: () => ({ paylas: [...document.querySelectorAll(".qt-paylas .qt-dugme")].map((b) => b.innerText.trim()) }),
};
const SAYFALAR = [
  ["turnuva", "/turnuva", "turnuva"],
  ...["grup-1", "grup", "grup-son"].flatMap((h) => [
    [`${h}-cerceveli`, `/mac-sonu-onizleme?hal=${h}&arac=0&detay=0&cerceve=dukkan_anka`, "grup"],
    [`${h}-cercevesiz`, `/mac-sonu-onizleme?hal=${h}&arac=0&detay=0&cerceve=lig_bronz`, "grup"],
  ]),
  // Klasik sonuç + Paylaş: dokunuş kart hazır olmadan (0,8 sn) — "Paylaşılamadı" çıkmamalı (tarayıcı izni hariç)
  ["klasik-paylas", "/mac-sonu-onizleme?hal=normal&arac=0", "paylas", async (s) => {
    const d = s.locator(".qt-paylas .qt-dugme").first();
    if (!(await d.count())) return { tik: "düğme yok" };
    await d.click({ timeout: 2000 }).catch(() => {});
    await s.waitForTimeout(600);
    return { tik: await s.locator(".qt-paylas-bilgi").first().innerText({ timeout: 300 }).catch(() => "(mesaj yok)") };
  }, 800],
];
const GORUNUM = [{ ad: "390", w: 390, h: 844 }, { ad: "360", w: 360, h: 740 }];
const sonuc = {};
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
try {
  for (const g of GORUNUM) for (const dil of ["tr", "en"]) {
    const b = await tarayici.newContext({ viewport: { width: g.w, height: g.h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: dil === "en" ? "en-US" : "tr-TR", serviceWorkers: "block" });
    // Paylaş: masaüstü otomasyonunda sistem menüsü yok — paylaşımı kaydeden taklit (dokunuş etkileşimi sürüyor mu?)
    await b.addInitScript(([a, dil]) => {
      try { localStorage.setItem(a.name, a.value); localStorage.setItem("bildim_dil", dil); localStorage.setItem("bildim_tanitim", "1"); sessionStorage.setItem("qt_dev_gecis", "1"); } catch { /* yok */ }
      window.__paylasim = [];
      Object.defineProperty(navigator, "share", { configurable: true, value: async (v) => {
        const aktif = navigator.userActivation?.isActive ?? true;
        window.__paylasim.push({ dosya: Boolean(v?.files?.length), aktif });
        if (!aktif) throw new DOMException("etkileşim yok", "NotAllowedError");
      } });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    }, [AUTH, dil]);
    for (const [ad, yol, olcAd, eylem, bekle] of SAYFALAR) {
      if (YALNIZ && ![...YALNIZ].some((y) => ad.startsWith(y))) continue;
      const s = await b.newPage();
      await s.route("**/rest/v1/rpc/profilim*", async (r) => {
        try { const y = await r.fetch(); const j = await y.json(); const p = Array.isArray(j) ? j[0] : j; if (p) p.dil = dil; await r.fulfill({ response: y, json: j }); } catch { await r.continue().catch(() => {}); }
      });
      const hatalar = [];
      s.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text().slice(0, 140)); });
      try {
        await s.goto(ADRES + yol, { waitUntil: "domcontentloaded" });
        await s.waitForTimeout(bekle ?? 4200);
        const ek = eylem ? await eylem(s) : null;
        if (eylem) await s.waitForTimeout(3600);
        const olcum = await s.evaluate(OLCUM[olcAd]);
        const paylasim = await s.evaluate(() => window.__paylasim);
        const tasma = await s.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        await s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${ad}-${g.ad}-${dil}.png`) });
        sonuc[`${ad}-${g.ad}-${dil}`] = { olcum, ...(ek ? { ek, paylasim } : {}), tasma, konsol: hatalar.length, ...(hatalar.length ? { hatalar } : {}) };
      } catch (e) { sonuc[`${ad}-${g.ad}-${dil}`] = { hata: String(e.message).slice(0, 120) }; }
      await s.close();
    }
    await b.close();
  }
} finally { await tarayici.close(); }
fs.writeFileSync(path.join(CIKTI, `olcum-${ETIKET}.json`), JSON.stringify(sonuc, null, 1));
for (const [k, v] of Object.entries(sonuc)) console.log(k, JSON.stringify(v).slice(0, 300));
