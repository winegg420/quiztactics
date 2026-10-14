// Ortak Hazine giriş sahnesi (sandık + 3-2-1) kare ölçümü — TAKLİT VERİYLE, canlıya YAZMAZ (maç açılmaz).
// kasa_* RPC'leri tarayıcıda taklit edilir; zaman çizelgesi canlıdakiyle aynı: başlangıç fazı (faz_bitis = t0 + 7 sn),
// sahne bitişi = faz_bitis + gösterim payı (2 sn); faz_bitis geçince yoklama 'cevap' fazını ve soruyu döndürür (canlıda da
// soru 3-2-1'in "2"sinde gelir). Diğer istekler (profil vb.) gerçek oturumla OKUNUR.
// Taklit cihaz: CPU 6x · 390×844 · Android UA. Her adres --tekrar kez açılır; kare aralıkları, >50/>100 ms takılmalar.
//   npx vite preview --port 5199 (yeni) · npx vite preview --port 5197 --outDir <eski derleme>
//   node araclar/hazine-giris-kare-taklit.mjs --oturum=<dosya> --adres=http://localhost:5197,http://localhost:5199 [--tekrar=5]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRESLER = String(ARG.adres || "http://localhost:5199").split(",").map((x) => x.replace(/\/$/, ""));
const OTURUM = path.resolve(String(ARG.oturum || ".arayuz-denetim-oturum.json"));
const TEKRAR = Math.max(1, Number(ARG.tekrar) || 5);
const KASA_ID = "0b6f6800-0000-4000-8000-00000000c0de";
const RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const AYARLAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6, kasa_hedef_puan: 80,
  kasa_max_tur: 36, kasa_soru_sn: 15, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 80, kasa_devam_carpan: 2, kasa_acma_min: 0, kasa_giris_sahne_ms: 4000 };
const SORU = { soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], kategori: "cografya" };

function durum(t0, ben) {
  const simdi = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const fazBitis = t0 + 7000, gosterim = fazBitis + 2000;
  const oyuncu = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan: 0, acma: 0 });
  const temel = { id: KASA_ID, durum: "aktif", dereceli: true, sunucu_zamani: iso(simdi), ben, max_tur: 36, hedef: 80, altin: false, artis: 2, ikisi_artis: 6,
    kasa: 0, sahip: null, tavan: 80, devam_carpan: 2, oyuncular: [oyuncu(ben, "Sen"), oyuncu(RAKIP, "Deniz Yıldırımoğlu")], karar: null, son_karar: null,
    sonuc: null, kopuk: null, kazanan: null, sonuc_neden: null, terk: null, baglanmayan: null, gecmis: null };
  if (simdi < fazBitis) return { ...temel, faz: "baslangic", tur: 0, faz_bitis: iso(fazBitis), soru: null, cevap: null,
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 15, gosterim_payi_ms: 2000, gosterim_bas: null } };
  return { ...temel, faz: "cevap", tur: 1, faz_bitis: iso(gosterim + 15000), soru: SORU, cevap: { ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false },
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 15, gosterim_payi_ms: 2000, gosterim_bas: iso(gosterim) } };
}

const IZCI = () => {
  const o = (window.__kare = { kareler: [], bas: null, bit: null, takilma: [] });
  let onceki = null;
  const dongu = (t) => {
    const sahne = document.querySelector(".ks-giris-an");
    if (sahne) {
      if (o.bas == null) o.bas = t;
      if (onceki != null) { o.kareler.push(t - onceki); if (t - onceki > 50) o.takilma.push([Math.round(onceki - o.bas), Math.round(t - onceki)]); }
      onceki = t;
    } else { if (o.bas != null && o.bit == null) o.bit = t; onceki = null; }
    requestAnimationFrame(dongu);
  };
  requestAnimationFrame(dongu);
  // DOM sayımı (tanı): .ks-mac çocukları başına öğe sayısı, değiştikçe
  o.dom = []; let sonDom = "";
  setInterval(() => { const k = document.querySelector(".ks-mac"); if (!k) return; const d = [...k.children].map((c) => (c.className || c.tagName).toString().split(" ")[0] + ":" + c.querySelectorAll("*").length).join(" "); if (d !== sonDom) { o.dom.push([Math.round(performance.now() - (o.bas ?? 0)), d]); sonDom = d; } }, 100);
};

const ham = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = {};
try {
  for (let tur = 0; tur < TEKRAR; tur++) {
    for (const ADRES of ADRESLER) {   // sırayla dönüşümlü: makine yükü iki sürüme eşit dağılsın
      const durumDosya = { ...ham, origins: (ham.origins ?? []).map((x) => ({ ...x, origin: new URL(ADRES).origin })) };
      const b = await tarayici.newContext({ storageState: durumDosya, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
        userAgent: "Mozilla/5.0 (Linux; Android 11; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", locale: "tr-TR", serviceWorkers: "block" });
      await b.addInitScript(IZCI);
      const s = await b.newPage();
      let t0 = null;
      const sub = (req) => { try { return JSON.parse(Buffer.from((req.headers().authorization || "").split(" ")[1].split(".")[1], "base64url").toString()).sub; } catch { return null; } };
      await s.route(/\/rest\/v1\/(oyun_ayarlari|rpc\/kasa_|rpc\/mac_sonu_ozet)/, async (r) => {
        const req = r.request(); const u = req.url();
        const json = (v, st = 200) => r.fulfill({ status: st, contentType: "application/json", body: JSON.stringify(v) });
        try {
          if (u.includes("/rpc/kasa_durum")) { t0 ??= Date.now(); return json(durum(t0, sub(req))); }
          if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
          if (u.includes("/rpc/kasa_joker_durumu")) return json({ envanter: {}, kullanilan: [], hak: {}, savunma: null, yasak_turler: [] });
          if (u.includes("/rpc/kasa_aktif_benim")) return json([]);
          if (u.includes("/rpc/kasa_") || u.includes("/rpc/mac_sonu_ozet")) return json({ message: "taklit: yazma kapalı" }, 400);
          const y = await r.fetch({ timeout: 20000 }).catch(() => null);
          const liste = y && y.ok() ? JSON.parse(await y.text()).filter((x) => !String(x.anahtar).startsWith("kasa_")) : [];
          for (const [anahtar, deger] of Object.entries(AYARLAR)) liste.push({ anahtar, deger });
          return json(liste);
        } catch { try { await r.continue(); } catch { /* kapandı */ } }
      });
      const cdp = await b.newCDPSession(s);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
      if (typeof ARG.iz === "string") await tarayici.startTracing(s, { categories: ["devtools.timeline", "v8.execute", "disabled-by-default-devtools.timeline"] });   // --iz=dosya (yalnız --tekrar=1)
      await s.goto(`${ADRES}/kasa/${KASA_ID}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      for (let i = 0; i < 100; i++) { const v = await s.evaluate(() => window.__kare.bit).catch(() => null); if (v != null) break; await s.waitForTimeout(250); }
      const o = await s.evaluate(() => window.__kare);
      if (typeof ARG.iz === "string") fs.writeFileSync(ARG.iz, (await tarayici.stopTracing()).toString());
      const soru = await s.locator(".qt-soru-metin").first().isVisible().catch(() => false);
      const k = [...o.kareler].sort((a, b) => a - b);
      const r = { sahne_ms: Math.round((o.bit ?? NaN) - (o.bas ?? NaN)), kare: k.length, p95: Math.round(k[Math.floor(k.length * 0.95)] ?? NaN),
        maks: Math.round(k.at(-1) ?? NaN), t50: k.filter((x) => x > 50).length, t100: k.filter((x) => x > 100).length, soru, takilma: o.takilma, dom: o.dom };
      // 3-2-1 penceresi: sahnenin son ~3 sn'si (oyuncunun gördüğü sayım)
      const sayim = o.takilma.filter(([t]) => t >= r.sahne_ms - 3100);
      r.sayim_t50 = sayim.length; r.sayim_maks = Math.max(0, ...sayim.map((x) => x[1])); r.sayim_toplam = sayim.reduce((a, x) => a + x[1], 0);
      (sonuc[ADRES] ??= []).push(r);
      console.log(`${ADRES} #${tur + 1}: sahne ${r.sahne_ms} ms · kare ${r.kare} · p95 ${r.p95} · maks ${r.maks} · >50 ${r.t50} · >100 ${r.t100} · 3-2-1: >50 ${r.sayim_t50}, maks ${r.sayim_maks}, toplam ${r.sayim_toplam} ms · soru ${soru ? "göründü" : "YOK"} · ${JSON.stringify(r.takilma)}`);
      if (ARG.dom) for (const x of r.dom) console.log("   dom", x[0], x[1]);
      await b.close();
    }
  }
  console.log("\n== ÖZET (ortanca / toplam)");
  for (const [a, l] of Object.entries(sonuc)) {
    const ort = (f) => { const v = l.map(f).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
    console.log(`${a}: maks ortanca ${ort((x) => x.maks)} ms · p95 ortanca ${ort((x) => x.p95)} ms · >50 ms toplam ${l.reduce((s, x) => s + x.t50, 0)} · >100 ms toplam ${l.reduce((s, x) => s + x.t100, 0)} · 3-2-1 penceresi: takılma toplam ${l.reduce((s, x) => s + x.sayim_t50, 0)}, en kötü kare ortanca ${ort((x) => x.sayim_maks)} ms, takılan süre ortanca ${ort((x) => x.sayim_toplam)} ms · soru göründü ${l.filter((x) => x.soru).length}/${l.length}`);
  }
  if (ARG.cikti) fs.writeFileSync(String(ARG.cikti), JSON.stringify(sonuc, null, 2));
} finally { await tarayici.close(); }
