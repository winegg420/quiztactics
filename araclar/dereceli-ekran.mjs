// DERECELİ KALDIRMA EKRAN DENETİMİ (16 Eki 2026, migration 1115) — "Serbest | Dereceli" anahtarının olduğu ekranlar.
// Ana sayfa + OYNA penceresi, Modlar, Düello girişi, Meydan Oku, Dükkân › Jokerler: 360×640 ve 390×844, TR ve EN.
// Her ekranda: "Serbest"/"Casual"/"Dereceli|Serbest" anahtarı metni kalmış mı · yatay taşma · konsol hatası · ekran görüntüsü.
// Oturum: araclar/arayuz-denetim.mjs'in KENDİ misafir hesabı (.arayuz-denetim-oturum.json, --sakla ile açılmış). Ida oturumu VERİLMEZ.
// Dil: misafirin profiles.dil'i --dil'e eşitlenir (canlı çekimde dil döngüsü kuralı) — yalnız bu test hesabında.
//   node araclar/dereceli-ekran.mjs --adres=http://localhost:5189 [--dil=tr,en]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5189").replace(/\/$/, "");
const DILLER = String(ARG.dil || "tr,en").split(",");
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/dereceli-1115");
fs.mkdirSync(CIKTI, { recursive: true });
const IDA = "e4f6006f-d6bb-4ca8-be67-3bdf9efc9708";
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const jeton = durum.origins.flatMap((o) => o.localStorage ?? []).find((x) => x.name.includes("-auth-token"));
const KIM = JSON.parse(Buffer.from(JSON.parse(jeton.value).access_token.split(".")[1], "base64url").toString()).sub;
if (KIM === IDA) throw new Error("Bu araç Ida oturumuyla koşmaz");
const EKRANLAR = [
  { ad: "ana-oyna", yol: "/", eylem: async (s) => { await s.locator('button[aria-haspopup="dialog"]').filter({ hasText: /OYNA|PLAY/i }).first().click({ timeout: 8000 }); await s.waitForTimeout(900); } },
  { ad: "modlar", yol: "/modlar" },
  { ad: "duello", yol: "/duello" },
  { ad: "meydan", yol: "/meydan" },
  { ad: "jokerler", yol: "/joker" },
];
const BOYUT = [[360, 640], [390, 844]];
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = [];
try {
  for (const dil of DILLER) {
    await db.sorgu(`update profiles set dil = ${alintila(dil)} where id = ${alintila(KIM)}`);
    for (const [w, h] of BOYUT) {
      const st = structuredClone(durum);
      st.origins = st.origins.map((o) => ({ ...o, origin: new URL(ADRES).origin,
        localStorage: [...(o.localStorage ?? []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)), { name: "bildim_dil", value: dil }, { name: "bildim_tanitim", value: "1" }] }));
      const b = await tarayici.newContext({ storageState: st, viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: dil === "en" ? "en-US" : "tr-TR", serviceWorkers: "block" });
      for (const e of EKRANLAR) {
        const s = await b.newPage();
        const hatalar = [];
        s.on("pageerror", (x) => hatalar.push(String(x).slice(0, 160)));
        s.on("console", (x) => { if (x.type() === "error" && !/status of 40[01]/.test(x.text())) hatalar.push(x.text().slice(0, 160)); });
        let not = "";
        try {
          await s.goto(`${ADRES}${e.yol}`, { waitUntil: "domcontentloaded", timeout: 60000 });
          await s.waitForTimeout(3500);
          if (e.eylem) await e.eylem(s);
        } catch (x) { not = `eylem: ${String(x.message).split("\n")[0].slice(0, 120)}`; }
        const o = await s.evaluate(() => {
          const metin = document.body.innerText;
          const anahtar = [...document.querySelectorAll("[role=switch], [role=radiogroup], .qt-dereceli, [class*=dereceli-anahtar]")].map((x) => x.innerText.trim()).filter(Boolean);
          return { serbest: (metin.match(/\b(Serbest|Casual)\b/g) ?? []).length, anahtar, tasma: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
                   tanimsiz: /\b(undefined|NaN)\b/.test(metin) };
        }).catch(() => ({}));
        const dosya = path.join(CIKTI, `${e.ad}-${w}x${h}-${dil}.png`);
        await s.screenshot({ path: dosya }).catch(() => {});
        const r = { ekran: e.ad, boyut: `${w}×${h}`, dil, ...o, hata: hatalar.length, hatalar: hatalar.slice(0, 3), not };
        sonuc.push(r);
        console.log(`${e.ad.padEnd(9)} ${r.boyut} ${dil}: "Serbest/Casual" ${o.serbest ?? "?"} · anahtar ${JSON.stringify(o.anahtar ?? [])} · taşma ${o.tasma ? "VAR" : "yok"} · undefined/NaN ${o.tanimsiz ? "VAR" : "yok"} · konsol hatası ${hatalar.length}${not ? " · " + not : ""}`);
        await s.close();
      }
      await b.close();
    }
  }
} finally {
  await db.sorgu(`update profiles set dil = 'tr' where id = ${alintila(KIM)}`).catch(() => {});
  await tarayici.close(); await db.kapat?.();
  fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
}
