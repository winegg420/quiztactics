// Seçili ses adaylarını işler: tepe −1 dBFS, baştaki sessizlik 20 ms, an başına süre sınırı (sonu fade), kısık sesleri
// ortanca seviyeye çeker. ORİJİNALLERE DOKUNMAZ: sonuç araclar/ses-adaylar-kaynak/<an>-n1.wav (yeni ad) olarak yazılır;
// yüklemeyi araclar/ses-adaylari-yukle.mjs yapar, seçimi çevirmeyi araclar/ses-secim-cevir.mjs.
//
// Kaynak liste: canlı `ses_secimleri` (SALT OKUMA, tek sorgu). Efekt anları işlenir; muzik_* ve "sessiz" atlanır.
// Çözme/işleme tarayıcıda (Chrome WebAudio decodeAudioData: mp3 + wav) — yeni paket kurulmaz; kodlama 16 bit PCM WAV.
//
// Kullanım: node araclar/ses-isle.mjs [--kuru]   (--kuru: dosya yazmaz, yalnız ölçüm tablosu)
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KAYNAK = path.join(KOK, "araclar", "ses-adaylar-kaynak");
const PUBLIC_SES = path.join(KOK, "public", "ses");
const kuru = process.argv.includes("--kuru");

/** an → bugünkü dosya ("mevcut" seçilmişse; oyundaki public/ses dosyası). */
const MEVCUT = { galibiyet: "kazandin.wav", maglubiyet: "kaybettin.wav", geri_sayim_tik: "tik.mp3" };
/** an → en uzun süre (sn). skill_* aşağıda toplu. Listede yoksa süre sınırı yok. */
const SURE_SINIRI = { yanlis: 0.6, vs_ani: 1.8, rakip_bulundu: 1.8, rozet: 1.8, turnuva: 2.5 };
const sureSiniri = (an) => (an.startsWith("skill_") ? 1.2 : SURE_SINIRI[an] ?? null);

const TEPE_DBFS = -1;
const BASTAKI_SESSIZLIK_MS = 20;

async function secimleriOku() {
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
  try { return await db.sorgu("select an, aday from public.ses_secimleri order by an"); } finally { await db.kapat(); }
}

function kaynakYolu(an, aday) {
  if (aday === "mevcut") return MEVCUT[an] ? path.join(PUBLIC_SES, MEVCUT[an]) : null;
  for (const uz of ["wav", "mp3"]) { const y = path.join(KAYNAK, `${aday}.${uz}`); if (fs.existsSync(y)) return y; }
  return null;
}

const secimler = (await secimleriOku()).filter((s) => !s.an.startsWith("muzik_") && s.aday !== "sessiz");
const isler = [];
for (const s of secimler) {
  const yol = kaynakYolu(s.an, s.aday);
  if (!yol) { console.warn(`atlandı (kaynak yok): ${s.an} → ${s.aday}`); continue; }
  isler.push({ an: s.an, aday: s.aday, yol, sinir: sureSiniri(s.an) });
}

// ------------------------------------------------------------ tarayıcıda işleme
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const sayfa = await tarayici.newPage();
await sayfa.goto("about:blank");
await sayfa.evaluate(() => {
  const DB = (x) => 10 ** (x / 20);
  const tepeBul = (out) => { let m = 0; for (const c of out) for (let i = 0; i < c.length; i++) m = Math.max(m, Math.abs(c[i])); return m; };
  // etkin bölge RMS'i: zarfı tepenin −30 dB'sini aşan örnekler
  const rmsBul = (out) => {
    const esik = tepeBul(out) * DB(-30), len = out[0].length;
    let toplam = 0, adet = 0;
    for (let i = 0; i < len; i++) {
      let m = 0; for (const c of out) m = Math.max(m, Math.abs(c[i]));
      if (m >= esik) { for (const c of out) toplam += c[i] * c[i]; adet += out.length; }
    }
    return adet ? Math.sqrt(toplam / adet) : 0;
  };
  window.__isle = async (b64, sinirSn, bastaMs) => {
    const bayt = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ac = new AudioContext();
    const tampon = await ac.decodeAudioData(bayt.buffer);
    await ac.close();
    const sr = tampon.sampleRate, kanal = tampon.numberOfChannels, n = tampon.length;
    const veri = Array.from({ length: kanal }, (_, k) => tampon.getChannelData(k));
    const mutlak = (i) => { let m = 0; for (let k = 0; k < kanal; k++) m = Math.max(m, Math.abs(veri[k][i])); return m; };
    // 1) baştaki (eşik −50 dBFS) / sondaki (−60 dBFS) sessizlik; başta en çok 20 ms kalır
    let ilk = 0; while (ilk < n && mutlak(ilk) < DB(-50)) ilk++;
    let son = n - 1; while (son > ilk && mutlak(son) < DB(-60)) son--;
    if (ilk >= son) return { hata: "sessiz dosya" };
    const bas = Math.max(0, ilk - Math.round((bastaMs / 1000) * sr));
    let bitis = son + 1;
    const sureOnce = (bitis - bas) / sr;
    // 2) süre sınırı
    let kesildi = false;
    if (sinirSn && sureOnce > sinirSn) { bitis = bas + Math.round(sinirSn * sr); kesildi = true; }
    const len = bitis - bas;
    const out = veri.map((v) => Float32Array.from(v.subarray(bas, bitis)));
    // 3) fade: giriş 2 ms (tıklama olmasın), çıkış — kesildiyse 120 ms, doğal bitişse 15 ms
    const fi = Math.round(0.002 * sr), fo = Math.round((kesildi ? 0.12 : 0.015) * sr);
    for (const c of out) {
      for (let i = 0; i < fi && i < len; i++) c[i] *= i / fi;
      for (let i = 0; i < fo && i < len; i++) c[len - 1 - i] *= i / fo;
    }
    return { sr, len, sureOnce, kesildi, kanallar: out.map((c) => Array.from(c)) };
  };
  window.__tepeli = (kanallar, tepeDb) => {
    const out = kanallar.map((c) => Float32Array.from(c));
    const g = DB(tepeDb) / tepeBul(out);
    for (const c of out) for (let i = 0; i < c.length; i++) c[i] *= g;
    return { rms: rmsBul(out) };
  };
  window.__seviye = (kanallar, hedefRms, tepeDb) => {
    const out = kanallar.map((c) => Float32Array.from(c));
    const len = out[0].length, hedefTepe = DB(tepeDb);
    let g = hedefTepe / tepeBul(out);
    for (const c of out) for (let i = 0; i < len; i++) c[i] *= g;
    // kısıksa (etkin RMS hedefin %70'inin altı ≈ 3 dB) +12 dB'ye kadar yükselt; yumuşak sınırlayıcı tepeyi korur
    const r = rmsBul(out);
    let yukseltmeDb = 0;
    if (hedefRms && r < hedefRms * 0.7) {
      const ek = Math.min(hedefRms / r, 4);
      yukseltmeDb = 20 * Math.log10(ek);
      const E = 0.55;
      for (const c of out) for (let i = 0; i < len; i++) {
        let x = c[i] * ek; const a = Math.abs(x);
        if (a > E) x = Math.sign(x) * (E + (1 - E) * Math.tanh((a - E) / (1 - E)));
        c[i] = x;
      }
      g = hedefTepe / tepeBul(out);
      for (const c of out) for (let i = 0; i < len; i++) c[i] *= g;
    }
    return { rms: rmsBul(out), tepe: tepeBul(out), yukseltmeDb, kanallar: out.map((c) => Array.from(c)) };
  };
  window.__wav = (kanallar, sr) => {
    const kanal = kanallar.length, len = kanallar[0].length;
    const b = new ArrayBuffer(44 + len * kanal * 2), v = new DataView(b);
    const yaz = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    yaz(0, "RIFF"); v.setUint32(4, 36 + len * kanal * 2, true); yaz(8, "WAVE"); yaz(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, kanal, true); v.setUint32(24, sr, true); v.setUint32(28, sr * kanal * 2, true);
    v.setUint16(32, kanal * 2, true); v.setUint16(34, 16, true); yaz(36, "data"); v.setUint32(40, len * kanal * 2, true);
    let o = 44;
    for (let i = 0; i < len; i++) for (let k = 0; k < kanal; k++) { const x = Math.max(-1, Math.min(1, kanallar[k][i])); v.setInt16(o, Math.round(x * 32767), true); o += 2; }
    let s = ""; const u = new Uint8Array(b);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  };
});

const dbf = (x) => 20 * Math.log10(x);
const ara = [];
for (const is of isler) {
  const b64 = fs.readFileSync(is.yol).toString("base64");
  const r = await sayfa.evaluate(([b, s, m]) => window.__isle(b, s, m), [b64, is.sinir, BASTAKI_SESSIZLIK_MS]);
  if (r.hata) { console.warn(`${is.an}: ${r.hata}`); continue; }
  const k = await sayfa.evaluate(([c, t]) => window.__tepeli(c, t), [r.kanallar, TEPE_DBFS]);
  ara.push({ ...is, r, rmsTepeli: k.rms });
}
// Hedef RMS: tepesi eşitlenmiş etkin RMS'lerin ortancası — kısıklar buna çekilir.
const sirali = ara.map((a) => a.rmsTepeli).sort((x, y) => x - y);
const hedefRms = sirali[Math.floor(sirali.length / 2)];

console.log(`hedef RMS (ortanca): ${dbf(hedefRms).toFixed(1)} dBFS · ${ara.length} ses · tepe ${TEPE_DBFS} dBFS · baş sessizlik ${BASTAKI_SESSIZLIK_MS} ms`);
console.log("an".padEnd(22), "kaynak".padEnd(24), "süre(sn)".padEnd(13), "tepe".padEnd(6), "RMS dB (önce → sonra)".padEnd(22), "yükseltme");
const rapor = [];
for (const a of ara) {
  const o = await sayfa.evaluate(([c, h, t]) => window.__seviye(c, h, t), [a.r.kanallar, hedefRms, TEPE_DBFS]);
  const sure = a.r.len / a.r.sr;
  const dosya = `${a.an}-n1.wav`;
  if (!kuru) {
    const b64 = await sayfa.evaluate(([c, sr]) => window.__wav(c, sr), [o.kanallar, a.r.sr]);
    fs.writeFileSync(path.join(KAYNAK, dosya), Buffer.from(b64, "base64"));
  }
  rapor.push({ an: a.an, kaynak: a.aday, dosya, sure_once: +a.r.sureOnce.toFixed(2), sure: +sure.toFixed(2), kesildi: a.r.kesildi,
    tepe_dbfs: +dbf(o.tepe).toFixed(2), rms_once_db: +dbf(a.rmsTepeli).toFixed(1), rms_sonra_db: +dbf(o.rms).toFixed(1), yukseltme_db: +o.yukseltmeDb.toFixed(1) });
  console.log(a.an.padEnd(22), a.aday.padEnd(24), `${a.r.sureOnce.toFixed(2)}→${sure.toFixed(2)}${a.r.kesildi ? "✂" : ""}`.padEnd(13),
    dbf(o.tepe).toFixed(1).padEnd(6), `${dbf(a.rmsTepeli).toFixed(1)} → ${dbf(o.rms).toFixed(1)}`.padEnd(22), o.yukseltmeDb ? `+${o.yukseltmeDb.toFixed(1)} dB` : "");
}
if (!kuru) {
  fs.writeFileSync(path.join(KOK, "docs", "ses-isleme-raporu.json"),
    JSON.stringify({ hedef_rms_db: +dbf(hedefRms).toFixed(1), tepe_dbfs: TEPE_DBFS, bastaki_sessizlik_ms: BASTAKI_SESSIZLIK_MS, sesler: rapor }, null, 1));
}
await tarayici.close();
