// public/sw.js müzik önbelleği birim testi — taklit `caches` + `fetch`; ağa/DB'ye istek GİTMEZ.
// Kullanım: node oyun/_test/sw-muzik-testi.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const KOK = "https://proje.supabase.co/storage/v1/object/public/muzik/";
const A = `${KOK}muzik_menu-1-00b7cbbffc.aac`;
const B = `${KOK}muzik_mac-5-8258198fe7.aac`;

/** Service worker'ı taklit ortamda kurar. */
function kur({ agHatasi = false, durum = 200 } = {}) {
  const depolar = new Map();   // ad → Map(adres → {govde, tur})
  const agIstekleri = [];      // {adres, range, mod}
  const dinleyiciler = {};
  const dosya = (adres) => Buffer.from(`ICERIK:${adres}:` + "x".repeat(1000));
  const caches = {
    async open(ad) {
      if (!depolar.has(ad)) depolar.set(ad, new Map());
      const d = depolar.get(ad);
      return {
        async match(k) { const v = d.get(typeof k === "string" ? k : k.url); return v ? new Response(v.govde, { headers: { "content-type": v.tur } }) : undefined; },
        async put(k, cevap) { d.set(typeof k === "string" ? k : k.url, { govde: Buffer.from(await cevap.arrayBuffer()), tur: cevap.headers.get("content-type") }); },
        async keys() { return [...d.keys()]; },
        async delete(k) { return d.delete(k); },
      };
    },
    async keys() { return [...depolar.keys()]; },
    async delete(ad) { return depolar.delete(ad); },
    async match() { return undefined; },
  };
  const fetch = async (girdi, secenek) => {
    const adres = typeof girdi === "string" ? girdi : girdi.url;
    const range = typeof girdi === "string" ? null : girdi.headers.get("range");
    agIstekleri.push({ adres, range, mod: secenek?.mode ?? null });
    await new Promise((c) => setTimeout(c, 5));
    if (agHatasi) throw new TypeError("ağ yok");
    if (durum !== 200) return new Response("yok", { status: durum });
    if (range) return new Response("AGDAN-RANGE", { status: 206, headers: { "content-type": "audio/aac" } });
    return new Response(dosya(adres), { status: 200, headers: { "content-type": "audio/aac" } });
  };
  const self = {
    location: { origin: "https://quiztactics.vercel.app" },
    addEventListener: (ad, f) => { dinleyiciler[ad] = f; },
    skipWaiting: async () => {}, clients: { claim: async () => {} }, registration: {},
  };
  vm.runInNewContext(fs.readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"),
    { self, caches, fetch, Response, Request, Headers, URL, Map, Promise, console, setTimeout });
  /** fetch olayı gönderir; SW cevaplamazsa null döner. */
  const iste = async (adres, { range, mode = "cors" } = {}) => {
    let cevap = null;
    const istek = { url: adres, method: "GET", mode, headers: new Headers(range ? { range } : {}) };
    dinleyiciler.fetch({ request: istek, respondWith: (p) => { cevap = p; } });
    return cevap ? await cevap : null;
  };
  return { iste, agIstekleri, depolar, dinleyiciler, dosya };
}

let gecti = 0;
const ok = async (ad, f) => { await f(); gecti++; console.log("  ✓", ad); };
const metin = async (c) => Buffer.from(await c.arrayBuffer()).toString();

await ok("ilk istek (Range: bytes=0-): ağdan TEK tam indirme (Range'siz), cevap 206 tam aralık", async () => {
  const s = kur();
  const c = await s.iste(A, { range: "bytes=0-" });
  const boy = s.dosya(A).length;
  assert.equal(c.status, 206);
  assert.equal(c.headers.get("content-range"), `bytes 0-${boy - 1}/${boy}`);
  assert.equal(c.headers.get("content-length"), String(boy));
  assert.equal(await metin(c), s.dosya(A).toString());
  assert.deepEqual(s.agIstekleri, [{ adres: A, range: null, mod: "cors" }]);
});

await ok("ikinci ve sonraki istekler önbellekten: ağ isteği YOK (oda değişimi, yeniden çalma)", async () => {
  const s = kur();
  await s.iste(A, { range: "bytes=0-" });
  for (let i = 0; i < 5; i++) assert.equal((await s.iste(A, { range: "bytes=0-" })).status, 206);
  assert.equal(s.agIstekleri.length, 1);
});

await ok("aynı parça aynı anda iki kez istenirse tek indirme", async () => {
  const s = kur();
  const [c1, c2] = await Promise.all([s.iste(A, { range: "bytes=0-1" }), s.iste(A, { range: "bytes=0-" })]);
  assert.equal(c1.status, 206);
  assert.equal(c2.status, 206);
  assert.equal(s.agIstekleri.length, 1);
});

await ok("Range dilimleri: bytes=0-1 (Safari yoklaması), orta aralık, son N bayt, taşan son", async () => {
  const s = kur();
  const tam = s.dosya(A);
  const boy = tam.length;
  let c = await s.iste(A, { range: "bytes=0-1" });
  assert.equal(c.headers.get("content-range"), `bytes 0-1/${boy}`);
  assert.equal(await metin(c), tam.subarray(0, 2).toString());
  c = await s.iste(A, { range: "bytes=10-19" });
  assert.equal(c.headers.get("content-length"), "10");
  assert.equal(await metin(c), tam.subarray(10, 20).toString());
  c = await s.iste(A, { range: "bytes=-7" });
  assert.equal(c.headers.get("content-range"), `bytes ${boy - 7}-${boy - 1}/${boy}`);
  assert.equal(await metin(c), tam.subarray(boy - 7).toString());
  c = await s.iste(A, { range: `bytes=5-${boy + 500}` });
  assert.equal(c.headers.get("content-range"), `bytes 5-${boy - 1}/${boy}`);
  assert.equal(s.agIstekleri.length, 1);
});

await ok("geçersiz aralık → 416; Range'siz istek → 200 tam dosya", async () => {
  const s = kur();
  const boy = s.dosya(A).length;
  assert.equal((await s.iste(A, { range: `bytes=${boy}-` })).status, 416);
  assert.equal((await s.iste(A, { range: "bytes=abc" })).status, 416);
  const c = await s.iste(A);
  assert.equal(c.status, 200);
  assert.equal(c.headers.get("content-length"), String(boy));
});

await ok("anahtar dosya adıdır: seçim değişince (yeni ad) yeni parça iner, eski parça yeni adın yerine çalmaz", async () => {
  const s = kur();
  await s.iste(A, { range: "bytes=0-" });
  const c = await s.iste(B, { range: "bytes=0-" });
  assert.equal(await metin(c), s.dosya(B).toString());
  assert.deepEqual(s.agIstekleri.map((x) => x.adres), [A, B]);
  assert.deepEqual([...s.depolar.get("qt-muzik-v1").keys()], [A, B]);
});

await ok("sınır (14) aşılınca en eski parça önbellekten silinir; silinen yeniden istenirse yeniden iner", async () => {
  const s = kur();
  const adres = (i) => `${KOK}muzik_x-${i}-${String(i).padStart(10, "0")}.aac`;
  for (let i = 0; i < 16; i++) await s.iste(adres(i), { range: "bytes=0-" });
  const anahtarlar = [...s.depolar.get("qt-muzik-v1").keys()];
  assert.equal(anahtarlar.length, 14);
  assert.equal(anahtarlar.includes(adres(0)), false);
  assert.equal(anahtarlar.includes(adres(1)), false);
  assert.equal(anahtarlar.includes(adres(15)), true);
  await s.iste(adres(0), { range: "bytes=0-" });
  assert.equal(s.agIstekleri.length, 17);
});

await ok("ağ hatası / 404 → istek olduğu gibi ağa gider (eski davranış), önbelleğe yazılmaz", async () => {
  const s = kur({ durum: 404 });
  const c = await s.iste(A, { range: "bytes=0-" });
  assert.equal(c.status, 404);
  assert.equal(s.agIstekleri.length, 2);
  assert.equal(s.agIstekleri[1].range, "bytes=0-");
  assert.equal(s.depolar.get("qt-muzik-v1")?.size ?? 0, 0);
  const h = kur({ agHatasi: true });
  await assert.rejects(h.iste(A, { range: "bytes=0-" }));
});

await ok("kapsam dışı: içerik özeti olmayan ad, başka kökenden no-cors, müzik olmayan istek → SW dokunmaz", async () => {
  const s = kur();
  assert.equal(await s.iste(`${KOK}muzik_menu-1.aac`, { range: "bytes=0-" }), null);
  assert.equal(await s.iste(A, { range: "bytes=0-", mode: "no-cors" }), null);
  assert.equal(await s.iste("https://quiztactics.vercel.app/ses/adaylar/muzik_menu-1.aac", { range: "bytes=0-", mode: "no-cors" }), null);
  assert.equal(await s.iste("https://proje.supabase.co/rest/v1/rpc/kalp_at"), null);
  assert.equal(s.agIstekleri.length, 0);
});

await ok("aynı kökenli /muzik/ (ileride Vercel) ve onizleme/ alt klasörü de önbelleğe girer", async () => {
  const s = kur();
  assert.equal((await s.iste("https://quiztactics.vercel.app/muzik/muzik_menu-1-00b7cbbffc.aac", { range: "bytes=0-", mode: "no-cors" })).status, 206);
  assert.equal((await s.iste(`${KOK}onizleme/muzik_menu-5-0c5857b973.aac`, { range: "bytes=0-" })).status, 206);
  assert.equal(s.agIstekleri.length, 2);
});

await ok("activate: eski kabuk/varlık önbellekleri silinir, müzik önbelleği KALIR", async () => {
  const s = kur();
  await s.iste(A, { range: "bytes=0-" });
  s.depolar.set("qt-kabuk-v1", new Map());
  s.depolar.set("qt-varlik-v1", new Map());
  let is = null;
  s.dinleyiciler.activate({ waitUntil: (p) => { is = p; } });
  await is;
  assert.equal(s.depolar.has("qt-muzik-v1"), true);
  assert.equal(s.depolar.has("qt-kabuk-v1"), false);
  assert.equal(s.depolar.has("qt-varlik-v1"), false);
});

console.log(`\nsw müzik önbelleği: ${gecti} test geçti`);
