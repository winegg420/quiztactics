// Ana sayfa: oyuncu AD düğmesi ile Sezon Yolu düğmesi arası bindirme ölçümü (11 Eki 2026).
// CANLIYA HİÇ İSTEK GİTMEZ: oturum taklit (sahte JWT), /auth /rest /functions /storage tarayıcıda yanıtlanır.
// Kullanım: npm run dev -- --port 5193 · node araclar/ana-ad-sezon-ekran.mjs --adres=http://localhost:5193 [--etiket=once]
// Çıktı: tasarim/ana-ad-sezon/<etiket>-<g>x<y>-<dil>.png + <etiket>-olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "http://localhost:5193");
const ETIKET = String(ARG.etiket || "olcum");
const CIKTI = path.resolve("tasarim/ana-ad-sezon");
fs.mkdirSync(CIKTI, { recursive: true });
const env = fs.readFileSync(".env", "utf8");
const SUPA = (env.match(/VITE_SUPABASE_URL=\s*"?([^"\s]+)/) || [])[1];
if (!SUPA) { console.error(".env › VITE_SUPABASE_URL yok"); process.exit(2); }
const DEPO = `sb-${new URL(SUPA).hostname.split(".")[0]}-auth-token`;
const BEN = "0c1a5100-0000-4000-8000-00000000ca15";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const EXP = Math.floor(Date.now() / 1000) + 7 * 86400;
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: EXP, is_anonymous: true })}.taklit`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", is_anonymous: true, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 7 * 86400, expires_at: EXP, refresh_token: "taklit-yenileme", user: KULLANICI };
const PROFIL = (dil) => ({ id: BEN, gorunen_ad: "Deneme", username: "deneme", takma_ad: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", sehir: "İstanbul",
  dil, puan: 100, coin: 50, xp: 0, level: 1, misafir: true, gorunen_avatar: null, gorunum: null });
const json = (r, v) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(v) });
const SEZON = { gorunur: true, sezon: 1, seviye: 9, seviye_sayisi: 28, sp: 940, onceki_esik: 900, sonraki_esik: 1000, bp: false, alinabilir: 0 };

const OLC = () => {
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none"; };
  const ad = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(/\s+/).filter(Boolean).slice(0, 2).join(".")}${e.textContent.trim() ? `("${e.textContent.trim().slice(0, 18)}")` : ""}`;
  const l = [...document.querySelectorAll("#root button, #root a[href]")].filter(gor);
  const binen = [];
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const A = l[i], B = l[j];
    if (A.contains(B) || B.contains(A)) continue;
    const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 0.5 && h > 0.5) binen.push({ a: ad(A), b: ad(B), w: +w.toFixed(1), h: +h.toFixed(1) });
  }
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { ust: +b.top.toFixed(1), alt: +b.bottom.toFixed(1), sol: +b.left.toFixed(1), sag: +b.right.toFixed(1) }; };
  return { binen, adDugme: r(".as-ko-ad button, .as-ko-ad"), sezon: r(".sz-mini"), adBtn: r(".as-ko-ust .ls-ad-dugme"), ko: r(".as-ko"), halka: r(".sz-mini-gorsel"), yatayTasma: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

const t = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = {};
try {
  for (const dil of ["tr", "en"]) for (const [g, y] of [[390, 844], [360, 780]]) {
    const b = await t.newContext({ viewport: { width: g, height: y }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: "block" });
    const s = await b.newPage();
    const hatalar = [];
    s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 160)));
    await s.addInitScript(({ d, depo, oturum }) => {
      try { localStorage.setItem("bildim_dil", d); localStorage.setItem("bildim_tanitim", "1"); localStorage.setItem(depo, JSON.stringify(oturum)); } catch { /* depolama kapalı */ }
    }, { d: dil, depo: DEPO, oturum: OTURUM });
    await s.route(/\/auth\/v1\//, (r) => (/\/user/.test(r.request().url()) ? json(r, KULLANICI) : json(r, OTURUM)));
    await s.route(/\/rest\/v1\//, (r) => {
      const req = r.request(); const yol = req.url().split("/rest/v1/")[1].split("?")[0];
      if (yol === "rpc/profilim") return json(r, PROFIL(dil));
      if (yol === "rpc/sezon_ozetim") return json(r, SEZON);
      if (req.method() !== "GET" && req.method() !== "HEAD") return json(r, []);
      return json(r, /vnd\.pgrst\.object/.test(req.headers()["accept"] || "") ? null : []);
    });
    await s.route(/\/functions\/v1\//, (r) => json(r, {}));
    await s.route(/\/storage\/v1\//, (r) => r.fulfill({ status: 404, body: "" }));
    await s.route(/\/realtime\/|\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await s.waitForSelector(".as-ko", { timeout: 20000 }).catch(() => {});
    await s.waitForTimeout(2000);
    const o = await s.evaluate(OLC); o.hatalar = hatalar;
    sonuc[`${g}x${y}-${dil}`] = o;
    await s.screenshot({ path: path.join(CIKTI, `${ETIKET}-${g}x${y}-${dil}.png`) });
    await b.close();
  }
} finally {
  await t.close();
  fs.writeFileSync(path.join(CIKTI, `${ETIKET}-olcum.json`), JSON.stringify(sonuc, null, 1));
  for (const [k, o] of Object.entries(sonuc)) console.log(k, "taşma", o.yatayTasma, "binen", JSON.stringify(o.binen), "ad", JSON.stringify(o.adBtn), "sezon", JSON.stringify(o.sezon), o.hatalar.length ? "HATA " + o.hatalar : "");
}
