// Akış izlemesi — kasma özeti (1119, 16 Eki 2026) birim testi. Tarayıcı/ağ yok: akisIzleme.js'in içe aktarmaları taklitle
// değiştirilip bellekte yüklenir. Kullanım: node --test oyun/_test/akis-kasma-test.mjs (npm run test:kurallar içinde).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const gecici = fs.mkdtempSync(path.join(os.tmpdir(), "akis-kasma-"));
const kayitlar = [];
let acilGonderim = 0;
globalThis.__akisTaklit = { akisKaydet: (k) => kayitlar.push(k), gonderAcil: () => { acilGonderim++; } };
fs.writeFileSync(path.join(gecici, "izlemeKaydi.mjs"),
  "export const akisKaydet = (k) => globalThis.__akisTaklit.akisKaydet(k); export const gonderAcil = () => globalThis.__akisTaklit.gonderAcil();");
fs.writeFileSync(path.join(gecici, "uygulamaKipi.mjs"), 'export const acilisKipi = () => "twa";');
fs.writeFileSync(path.join(gecici, "sunucuSaati.mjs"), "export const saatSapmaDinle = () => {}; export const sunucuSimdiMs = () => Date.now();");
const kaynak = fs.readFileSync(path.join(KOK, "oyun/lib/akisIzleme.js"), "utf8")
  .replace('"../../src/lib/izlemeKaydi.js"', '"./izlemeKaydi.mjs"')
  .replace('"../../src/lib/uygulamaKipi.js"', '"./uygulamaKipi.mjs"')
  .replace('"./sunucuSaati.js"', '"./sunucuSaati.mjs"');
fs.writeFileSync(path.join(gecici, "akisIzleme.mjs"), kaynak);

// Tarayıcı taklidi: görünürlük + olay dinleyicileri + Long Animation Frames destekli PerformanceObserver
const dinleyiciler = new Map();
globalThis.window = globalThis;
globalThis.document = {
  visibilityState: "visible",
  addEventListener: (t, f) => dinleyiciler.set(t, f),
  removeEventListener: (t) => dinleyiciler.delete(t),
};
const gozlemciler = [];
globalThis.PerformanceObserver = class {
  static supportedEntryTypes = ["longtask", "long-animation-frame"];
  constructor(f) { this.f = f; gozlemciler.push(this); }
  observe(o) { this.tur = o.type; }
  disconnect() { this.kapali = true; }
};
globalThis.sessionStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };

const A = await import(pathToFileURL(path.join(gecici, "akisIzleme.mjs")).href);
const kare = (sure, t = performance.now()) => { for (const g of gozlemciler) if (g.tur === "long-animation-frame" && !g.kapali) g.f({ getEntries: () => [{ duration: sure, startTime: t }] }); };
const temizle = () => { A._akisSifirla(); kayitlar.length = 0; acilGonderim = 0; document.visibilityState = "visible"; sessionStorage._d = {}; };

test("kasma: aşamaya göre sayılır, tek özet, en çok kasan önce, ms = en uzun kare", () => {
  temizle();
  A.akisMacBaslat("hazine", "m1");
  kare(180);                                                     // faz yok → acilis
  A.akisFazGozle({ anahtar: "1-baslangic", an: "baslangic" }); kare(120); kare(90);   // 90 ms sayılmaz
  A.akisFazGozle({ anahtar: "1-cevap", an: "cevap" }); kare(140); kare(130); kare(101);
  A.akisFazGozle({ anahtar: "1-sonuc", an: "sonuc" }); kare(260);
  A._akisBitirHemen();
  const k = kayitlar.filter((x) => x.tur === "kasma");
  assert.equal(k.length, 1);
  assert.equal(k[0].an, "cevap:3 acilis:1 baslangic:1 sonuc:1");
  assert.equal(k[0].ms, 260);
  assert.equal(k[0].mod, "hazine");
  assert.equal(k[0].kip, "twa");
});

test("kasma: maç bitince 5 sn 'macsonu' penceresi; aynı maç yeniden başlarsa pencere iptal", () => {
  temizle();
  A.akisMacBaslat("klasik", "m2");
  A.akisFazGozle({ anahtar: "s1", an: "soru" }); kare(150);
  A.akisMacBitir("m2");
  assert.equal(A.akisMacAcik(), false, "maç sonu penceresi maç içi sayılmaz (ses sınırları değişmez)");
  kare(200); kare(110);
  assert.equal(kayitlar.length, 0, "özet pencere bitmeden yazılmaz");
  A._akisBitirHemen();
  assert.equal(kayitlar[0].an, "macsonu:2 soru:1");
  assert.equal(kayitlar[0].ms, 200);
});

test("kasma: sayfa gizlenince özet hemen yazılır ve beklemeden gönderilir; gizliyken kare sayılmaz", () => {
  temizle();
  A.akisMacBaslat("duello", "m3");
  A.akisFazGozle({ anahtar: "notr-1", an: "notr" }); kare(300);
  document.visibilityState = "hidden"; dinleyiciler.get("visibilitychange")();
  assert.equal(kayitlar.length, 1);
  assert.equal(kayitlar[0].an, "notr:1");
  assert.equal(acilGonderim, 1);
  kare(500);                                                     // gizliyken
  document.visibilityState = "visible"; dinleyiciler.get("visibilitychange")();
  kare(400);                                                     // görünür olduktan sonraki ilk 1 sn (uyku dönüşü) sayılmaz
  A._akisBitirHemen();
  assert.equal(kayitlar.filter((x) => x.tur === "kasma").length, 1, "yeni kare yoksa ikinci özet yok");
});

test("kasma: an 40 harfi aşmaz; maçta en çok 3 özet", () => {
  temizle();
  A.akisMacBaslat("turnuva", "m4");
  for (const a of ["cevap", "sonuc", "baslangic", "karar", "savunma", "notr", "kart", "son"]) { A.akisFazGozle({ anahtar: a, an: a }); kare(120); }
  for (let i = 0; i < 4; i++) { kare(130, performance.now() + 2000 * (i + 1)); document.visibilityState = "hidden"; dinleyiciler.get("visibilitychange")(); document.visibilityState = "visible"; }
  const k = kayitlar.filter((x) => x.tur === "kasma");
  assert.equal(k.length, 3);
  assert.ok(k.every((x) => x.an.length <= 40), k.map((x) => x.an).join(" / "));
});

test("donma (> 500 ms) eskisi gibi uzun görevden yazılır", () => {
  temizle();
  A.akisMacBaslat("grup", "m5");
  A.akisFazGozle({ anahtar: "s", an: "soru" });
  for (const g of gozlemciler) if (g.tur === "longtask" && !g.kapali) g.f({ getEntries: () => [{ duration: 620, startTime: performance.now() }] });
  assert.equal(kayitlar.filter((x) => x.tur === "donma").length, 1);
  A._akisBitirHemen();
});
