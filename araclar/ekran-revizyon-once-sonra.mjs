// Ekran revizyonu Aşama 1 — canlı ekranlar değişmedi mi? Önce/sonra 390 px TR görüntüsü + sahip kapısı kontrolü.
// Sunucuya YAZMAZ; misafir oturumu (.arayuz-denetim-oturum.json, arayuz-denetim açar) hedef adrese taşınır. Her sayfa BİR kez açılır.
// Kullanım: node araclar/ekran-revizyon-once-sonra.mjs --etiket=once|sonra [--adres=https://quiztactics.com]
// Çıktı: tasarim/ekran-revizyon/<etiket>-<sayfa>.png ; sonra'da once ile piksel karşılaştırması yazılır.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, "").split("="); return [k, v.length ? v.join("=") : true]; }));
const ADRES = String(ARG.adres || "https://quiztactics.com").replace(/\/$/, "");
const ETIKET = ARG.etiket || "once";
const CIKTI = path.resolve("tasarim/ekran-revizyon");
fs.mkdirSync(CIKTI, { recursive: true });
const kayit = JSON.parse(fs.readFileSync(".arayuz-denetim-oturum.json", "utf8"));
const depo = (kayit.origins ?? []).flatMap((o) => o.localStorage ?? []).filter((k) => /auth-token|bd_cihaz_id/.test(k.name));
if (!depo.length) { console.error("Oturumda auth-token yok"); process.exit(1); }

const SAYFALAR = [["calisma", "/calisma"], ["profil", "/profil"], ["mesajlar", "/mesajlar"], ["arkadaslar", "/arkadaslar"], ["404", "/bu-adres-yok-er"], ["onizleme-misafir", "/ekran-revizyon-onizleme"]];
const tarayici = await chromium.launch({ channel: "chrome" });
try {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await baglam.addInitScript((depo) => {
    try {
      for (const k of depo) localStorage.setItem(k.name, k.value);
      localStorage.setItem("bildim_dil", "tr"); localStorage.setItem("bildim_tanitim", "1");
    } catch { /* yut */ }
  }, depo);
  const s = await baglam.newPage();
  for (const [ad, yol] of SAYFALAR) {
    const hatalar = [];
    const dinle = (e) => hatalar.push(String(e).slice(0, 160));
    s.on("pageerror", dinle);
    try {
      await s.goto(ADRES + yol, { waitUntil: "networkidle", timeout: 45000 });
    } catch (e) { hatalar.push("goto: " + e.message.slice(0, 120)); }
    await s.waitForTimeout(2500);
    // Sabit hareketli parçalar (sayaç, parıltı) karşılaştırmayı bozmasın
    await s.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" }).catch(() => {});
    const dosya = path.join(CIKTI, `${ETIKET}-${ad}.png`);
    await s.screenshot({ path: dosya });
    const metin = (await s.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 140);
    let fark = "";
    const once = path.join(CIKTI, `once-${ad}.png`);
    if (ETIKET !== "once" && fs.existsSync(once)) {
      fark = await s.evaluate(async ([a, b]) => {
        const yukle = (src) => new Promise((r, h) => { const i = new Image(); i.onload = () => r(i); i.onerror = h; i.src = src; });
        const [x, y] = await Promise.all([yukle(a), yukle(b)]);
        const c = (i) => { const k = document.createElement("canvas"); k.width = i.width; k.height = i.height; const g = k.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
        if (x.width !== y.width || x.height !== y.height) return "boyut farklı";
        const p = c(x), q = c(y); let n = 0;
        for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 30) n++;
        return `farklı piksel %${((n / (p.length / 4)) * 100).toFixed(2)}`;
      }, ["data:image/png;base64," + fs.readFileSync(once).toString("base64"), "data:image/png;base64," + fs.readFileSync(dosya).toString("base64")]);
    }
    console.log(`${ad.padEnd(17)} ${fark.padEnd(24)} hata:${hatalar.length} · ${metin}`);
    s.off("pageerror", dinle);
  }
} finally {
  await tarayici.close();
}
