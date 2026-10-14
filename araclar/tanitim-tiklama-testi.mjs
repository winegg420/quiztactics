// Tanıtım sayfası tıklama testi (KALICI) — her buton/bağlantı, merkez noktasında elementFromPoint ile KENDİSİ mi?
// Süs katmanı (.tn-isin, .tn-sahne vb.) bir düğmenin üstüne binerse düğmeye dokunulmaz; bu test onu yakalar.
//   npm run build && node araclar/tanitim-tiklama-testi.mjs
// dist/ test içinde küçük bir statik sunucuyla (SPA yedeği dahil) açılır; vite preview kullanılmaz (qt.test adını
// allowedHosts reddeder). --port=NNNN verilirse o adreste çalışan bir sunucuya (ör. vite dev/preview) bağlanır.
// 390 ve 1440 px, TR ve EN. Supabase'e giden her istek kesilir (canlıya yük gitmez). Her durum bir kez açılır.
// Çıkış kodu: 0 = hepsi geçti, 1 = en az bir düğme başka öğenin altında.
import { chromium } from "playwright-core";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const TIPLER = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
let sunucu = null;
let PORT = Number(ARG.port || 0);
if (!PORT) {
  const dist = path.resolve("dist");
  if (!fs.existsSync(path.join(dist, "index.html"))) { console.error("dist/ yok: önce npm run build"); process.exit(2); }
  sunucu = http.createServer((q, s) => {
    let yol = path.join(dist, decodeURIComponent(new URL(q.url, "http://x").pathname));
    if (!yol.startsWith(dist) || !fs.existsSync(yol) || fs.statSync(yol).isDirectory()) yol = path.join(dist, "index.html");   // SPA yedeği
    s.writeHead(200, { "Content-Type": TIPLER[path.extname(yol)] ?? "application/octet-stream" });
    fs.createReadStream(yol).pipe(s);
  });
  await new Promise((r) => sunucu.listen(0, "127.0.0.1", r));
  PORT = sunucu.address().port;
}
const KOK = `http://qt.test:${PORT}/`;   // localhost kapıdan serbest → tanıtım sayfası için qt.test (uygulama-kapisi-testi ile aynı)
const BOYUTLAR = [{ w: 390, h: 844 }, { w: 1440, h: 900 }];
const DILLER = ["tr", "en"];

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--host-resolver-rules=MAP qt.test 127.0.0.1"] });
let hata = 0;
try {
  for (const dil of DILLER) {
    for (const b of BOYUTLAR) {
      const baglam = await tarayici.newContext({ viewport: { width: b.w, height: b.h }, serviceWorkers: "block" });
      await baglam.route(/supabase\.co/, (r) => r.abort());
      await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
      await baglam.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); } catch { /* yok */ } }, dil);
      const sayfa = await baglam.newPage();
      await sayfa.goto(KOK, { waitUntil: "load" });
      await sayfa.waitForSelector(".tn", { timeout: 15000 });
      await sayfa.evaluate(() => document.fonts?.ready);
      const liste = await sayfa.evaluate(() => {
        const secici = ".tn a[href], .tn button, .tn [role='button']";
        return [...document.querySelectorAll(secici)].map((_, i) => i);
      });
      let sorunlu = 0;
      for (const i of liste) {
        const r = await sayfa.evaluate((i) => {
          const el = [...document.querySelectorAll(".tn a[href], .tn button, .tn [role='button']")][i];
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || el.disabled) return { atla: true };
          el.scrollIntoView({ block: "center", inline: "center" });
          const k = el.getBoundingClientRect();
          if (k.width < 1 || k.height < 1) return { atla: true };
          const x = k.left + k.width / 2, y = k.top + k.height / 2;
          const vurulan = document.elementFromPoint(x, y);
          const tamam = vurulan === el || el.contains(vurulan);
          const ad = (el.textContent || el.getAttribute("aria-label") || el.className || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
          const ustte = vurulan ? `${vurulan.tagName.toLowerCase()}.${String(vurulan.className).split(" ")[0]}` : "yok";
          return { tamam, ad, ustte };
        }, i);
        if (r.atla) continue;
        if (!r.tamam) { sorunlu++; hata++; console.log(`  ✗ [${dil} ${b.w}px] "${r.ad}" başka öğenin altında: ${r.ustte}`); }
      }
      console.log(`${sorunlu ? "✗" : "✓"} ${dil.toUpperCase()} ${b.w}px — ${liste.length} düğme/bağlantı, ${sorunlu} engelli`);
      if (liste.length < 3) { hata++; console.log("  ✗ beklenenden az düğme bulundu (sayfa açılmadı?)"); }
      if (ARG.goruntu) {   // --goruntu: her boyut/dil için ekran görüntüsü (tasarim/tanitim-tiklama/)
        fs.mkdirSync("tasarim/tanitim-tiklama", { recursive: true });
        await sayfa.evaluate(() => window.scrollTo(0, 0));
        await sayfa.screenshot({ path: `tasarim/tanitim-tiklama/${dil}-${b.w}.png` });
      }
      await baglam.close();
    }
  }
} finally {
  await tarayici.close();
  sunucu?.close();
}
process.exit(hata ? 1 : 0);
