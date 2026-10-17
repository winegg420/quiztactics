// Ses dosyası çözümleme çekirdeği (17 Eki 2026, ses-bitis) — araclar/ses-dosya-sonu.mjs ve ses üreticileri ortak kullanır.
// WAV: Node'da çözülür (PCM 8/16/24/32, float 32, WAVE_FORMAT_EXTENSIBLE; akışla yazılmış 0xFFFFFFFF veri boyutu da okunur ama
// başlık GEÇERSİZ sayılır). MP3/AAC: Chrome'un kendi çözücüsüyle (playwright-core, decodeAudioData) — oyunda çalan da odur.
//
// Ölçüler (dBFS, tam ölçeğe göre; kanallar ortalanır):
//   dogalMs   — sesin DOĞAL süresi: 5 ms pencereli RMS seviyesinin -45 dB'nin üstünde olduğu son an (pencerenin sonu)
//   son20Db   — son 20 ms'nin tepe seviyesi (≤ -45 olmalı)
//   basamak   — son 150 ms'de SÜREN ses (≥ 30 ms -30 dB üstü) -25 dB üstünden 25 ms içinde -45 dB altına iniyor (kesilip sessizlik eklenmiş)
//   kesik     — son20Db > -45 ya da basamak
import fs from "node:fs";

export const ESIK_DB = -45;
const PENCERE_MS = 5;

export function wavCoz(b) {
  const sorun = [];
  if (b.length < 12 || b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") return { hata: "RIFF/WAVE değil" };
  const riff = b.readUInt32LE(4);
  if (riff !== b.length - 8 && riff !== b.length - 9) sorun.push(`RIFF boyutu ${riff === 0xffffffff ? "0xFFFFFFFF" : riff} ≠ ${b.length - 8}`);
  let o = 12, fmt = null, veri = null;
  while (o + 8 <= b.length) {
    const id = b.toString("ascii", o, o + 4), n = b.readUInt32LE(o + 4);
    if (id === "fmt ") {
      fmt = { tur: b.readUInt16LE(o + 8), kanal: b.readUInt16LE(o + 10), oran: b.readUInt32LE(o + 12), bit: b.readUInt16LE(o + 22) };
      if (fmt.tur === 0xfffe && n >= 40) fmt.tur = b.readUInt16LE(o + 8 + 24);
    }
    if (id === "data") {
      const kalan = b.length - (o + 8);
      if (n === 0xffffffff || n > kalan) { sorun.push(`data boyutu ${n === 0xffffffff ? "0xFFFFFFFF" : n} (dosyada ${kalan})`); veri = b.subarray(o + 8); break; }
      veri = b.subarray(o + 8, o + 8 + n);
    }
    if (n === 0xffffffff) break;
    o += 8 + n + (n & 1);
  }
  if (!fmt) return { hata: "fmt yok" };
  if (!veri) return { hata: "data yok" };
  const { tur, kanal, oran, bit } = fmt;
  const bayt = bit / 8, kare = Math.floor(veri.length / (bayt * kanal));
  const ornek = new Float32Array(kare);
  for (let i = 0; i < kare; i++) {
    let t = 0;
    for (let k = 0; k < kanal; k++) {
      const p = (i * kanal + k) * bayt;
      let v;
      if (tur === 3 && bit === 32) v = veri.readFloatLE(p);
      else if (tur === 1 && bit === 16) v = veri.readInt16LE(p) / 32768;
      else if (tur === 1 && bit === 24) v = veri.readIntLE(p, 3) / 8388608;
      else if (tur === 1 && bit === 32) v = veri.readInt32LE(p) / 2147483648;
      else if (tur === 1 && bit === 8) v = (veri[p] - 128) / 128;
      else return { hata: `desteklenmeyen biçim tur=${tur} bit=${bit}` };
      t += v;
    }
    ornek[i] = t / kanal;
  }
  return { oran, kanal, bit, tur, ornek, baslikGecerli: sorun.length === 0, baslikSorun: sorun };
}

let tarayici = null, sayfa = null;
/** WAV dışı biçimler: Chrome decodeAudioData (oyunun çözücüsü). */
export async function tarayiciCoz(b) {
  if (!sayfa) {
    const { chromium } = await import("playwright-core");
    tarayici = await chromium.launch({ channel: "chrome", headless: true });
    sayfa = await tarayici.newPage();
    await sayfa.goto("about:blank");
  }
  const s = await sayfa.evaluate(async (b64) => {
    const bayt = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ctx = new OfflineAudioContext(1, 1, 48000);
    const tampon = await ctx.decodeAudioData(bayt.buffer);
    const n = tampon.length, k = tampon.numberOfChannels, ort = new Float32Array(n);
    for (let c = 0; c < k; c++) { const d = tampon.getChannelData(c); for (let i = 0; i < n; i++) ort[i] += d[i] / k; }
    const u8 = new Uint8Array(ort.buffer);
    let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return { oran: tampon.sampleRate, kanal: k, b64: btoa(s) };
  }, b.toString("base64"));
  const ham = Buffer.from(s.b64, "base64");
  return { oran: s.oran, kanal: s.kanal, ornek: new Float32Array(ham.buffer, ham.byteOffset, ham.byteLength / 4), baslikGecerli: true, baslikSorun: [] };
}
export async function tarayiciKapat() { try { await tarayici?.close(); } catch { /* kapalı */ } tarayici = null; sayfa = null; }

const db = (x) => (x > 0 ? 20 * Math.log10(x) : -200);

/** Örnekler → zarf (5 ms RMS, dB) + ölçüler. */
export function olc(ornek, oran) {
  const p = Math.max(1, Math.round((oran * PENCERE_MS) / 1000));
  const zarf = [];
  for (let i = 0; i < ornek.length; i += p) {
    let t = 0; const son = Math.min(ornek.length, i + p);
    for (let j = i; j < son; j++) t += ornek[j] * ornek[j];
    zarf.push(db(Math.sqrt(t / Math.max(1, son - i))));
  }
  const sureMs = (ornek.length / oran) * 1000;
  let sonUst = -1;
  for (let i = zarf.length - 1; i >= 0; i--) if (zarf[i] > ESIK_DB) { sonUst = i; break; }
  let ilkUst = zarf.findIndex((z) => z > ESIK_DB);
  const dogalMs = sonUst < 0 ? 0 : Math.min(sureMs, (sonUst + 1) * PENCERE_MS);
  let tepe = 0;
  for (let i = 0; i < ornek.length; i++) tepe = Math.max(tepe, Math.abs(ornek[i]));
  let son20 = 0;
  for (let i = Math.max(0, ornek.length - Math.round(oran * 0.02)); i < ornek.length; i++) son20 = Math.max(son20, Math.abs(ornek[i]));
  // basamak: son 150 ms içinde SÜREN bir ses (≥ 30 ms boyunca -30 dB üstü) -25 dB üstünden 25 ms içinde -45 dB altına
  // iniyor mu — kesilip arkasına sessizlik eklenmiş ya da zorla söndürülmüş ses. Tık/vuruş (sürmeyen) doğal olarak hızlı söner.
  const n150 = Math.ceil(150 / PENCERE_MS);
  const bas = Math.max(0, zarf.length - n150);
  let enBuyukDusus = 0, dususAni = null, basamakVar = false;
  for (let i = bas; i < zarf.length; i++) {
    if (i > 0) { const d = zarf[i - 1] - zarf[i]; if (zarf[i - 1] > -40 && d > enBuyukDusus) { enBuyukDusus = d; dususAni = Math.round(i * PENCERE_MS); } }
    if (zarf[i] <= -25 || i < 6) continue;
    let suren = true;
    for (let j = i - 6; j < i; j++) if (zarf[j] <= -30) { suren = false; break; }
    if (!suren) continue;
    for (let j = i + 1; j <= i + 5 && j < zarf.length; j++) if (zarf[j] < ESIK_DB) { basamakVar = true; dususAni = Math.round(j * PENCERE_MS); break; }
  }
  const seviye150 = zarf[bas] ?? -200;
  const basamak = sureMs >= 20 && basamakVar;
  const son20Db = db(son20);
  return {
    sureMs: Math.round(sureMs), dogalMs: Math.round(dogalMs), girisMs: ilkUst < 0 ? null : ilkUst * PENCERE_MS,
    tepeDb: +db(tepe).toFixed(1), son20Db: +son20Db.toFixed(1), seviye150Db: +seviye150.toFixed(1),
    enBuyukDususDb: +enBuyukDusus.toFixed(1), dususAni, basamak, kesik: sureMs >= 20 && (son20Db > ESIK_DB || basamak), zarf,
  };
}

export async function dosyaOlc(yol) {
  const b = fs.readFileSync(yol);
  const wav = /\.wav$/i.test(yol);
  const c = wav ? wavCoz(b) : await tarayiciCoz(b);
  if (c.hata) return { hata: c.hata };
  return { bicim: wav ? "wav" : yol.split(".").pop().toLowerCase(), oran: c.oran, kanal: c.kanal, baslikGecerli: c.baslikGecerli,
    baslikSorun: c.baslikSorun, ...olc(c.ornek, c.oran), ornek: c.ornek };
}

/** 16 bit PCM mono WAV yazar (geçerli başlık). */
export function wavYaz(ornek, oran) {
  const veri = Buffer.alloc(ornek.length * 2);
  for (let i = 0; i < ornek.length; i++) veri.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ornek[i] * 32767))), i * 2);
  const b = Buffer.alloc(44);
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(36 + veri.length, 4); b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii"); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(oran, 24); b.writeUInt32LE(oran * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36, "ascii"); b.writeUInt32LE(veri.length, 40);
  return Buffer.concat([b, veri]);
}
