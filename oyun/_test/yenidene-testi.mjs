// yenidene.js birim testi — taklit hatalarla; ağ/DB'ye istek GİTMEZ.
// Kullanım: node oyun/_test/yenidene-testi.mjs
import assert from "node:assert/strict";
import { zamanAsimindaYenidenDene, zamanAsimiMi } from "../lib/yenidene.js";

let gecti = 0;
const ok = async (ad, f) => { await f(); gecti++; console.log("  ✓", ad); };
const beklemeler = [];
const bekle = async (ms) => { beklemeler.push(ms); };
const dene = (cagrilar, opts = {}) => zamanAsimindaYenidenDene(cagrilar, { bekle, ...opts });
const zamanAsimi = { error: { code: "57014", message: "canceling statement due to statement timeout" } };

await ok("hata türleri: 57014, AbortError, timed out, gateway timeout", () => {
  assert.equal(zamanAsimiMi({ code: "57014" }), true);
  assert.equal(zamanAsimiMi({ name: "AbortError", message: "aborted" }), true);
  assert.equal(zamanAsimiMi({ message: "The request timed out" }), true);
  assert.equal(zamanAsimiMi({ message: "504 Gateway Timeout" }), true);
  assert.equal(zamanAsimiMi({ message: "Rövanş süresi doldu" }), false);
  assert.equal(zamanAsimiMi(null), false);
});

await ok("57014 → 2 deneme sonra başarı (1 sn, sonra 2 sn bekler)", async () => {
  beklemeler.length = 0;
  let n = 0;
  const s = await dene(async () => (++n <= 2 ? zamanAsimi : { error: null }));
  assert.equal(n, 3);
  assert.equal(s.error, null);
  assert.deepEqual(beklemeler, [1000, 2000]);
});

await ok("3 hata → vazgeçer, son hata döner (toplam 3 çağrı)", async () => {
  beklemeler.length = 0;
  let n = 0;
  const s = await dene(async () => { n++; return zamanAsimi; });
  assert.equal(n, 3);
  assert.equal(s.error.code, "57014");
});

await ok("fırlatılan AbortError da yeniden denenir", async () => {
  let n = 0;
  const s = await dene(async () => { if (++n === 1) { const e = new Error("aborted"); e.name = "AbortError"; throw e; } return { error: null }; });
  assert.equal(n, 2);
  assert.equal(s.error, null);
});

await ok("iş kuralı hatası yeniden DENENMEZ", async () => {
  let n = 0;
  const s = await dene(async () => { n++; return { error: { message: "Rövanş süresi doldu" } }; });
  assert.equal(n, 1);
  assert.equal(s.error.message, "Rövanş süresi doldu");
});

await ok("tur ilerledi / maç bitti (vazgec=true) → denemeyi bırakır", async () => {
  let n = 0;
  const s = await dene(async () => { n++; return zamanAsimi; }, { vazgec: () => true });
  assert.equal(n, 1);
  assert.equal(s.error.code, "57014");
});

await ok("başarıda hiç beklemez", async () => {
  beklemeler.length = 0;
  const s = await dene(async () => ({ error: null }));
  assert.equal(s.error, null);
  assert.deepEqual(beklemeler, []);
});

console.log(`\n${gecti} geçti`);
