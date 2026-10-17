// SES ÇIKIŞ İZİ (17 Eki 2026, ses bitiş kuralı) — sayfaya enjekte edilen GERÇEK çıktı dinleyicisi + ölçüleri. Ortak:
// araclar/ses-cikis-olcum.mjs (çizelge, bütün modlar) ve araclar/hazine-akis-olcum.mjs (gerçek Hazine sayfası, taklit sunucu).
// AudioContext.destination'a bağlanan her ses zincirine AudioWorklet dinleyicisi takılır (ses iş parçacığında, 128 örnekte bir
// RMS); sesin başlangıcı start() çağrısının sayfa saati, bitişi sinyalin -45 dBFS altına son indiği an (ses saatinde süre).
import { AN, BINME, TIK_ROLLERI, VARSAYILAN_DOSYA } from "../oyun/lib/sesKurali.js";

// ---------------- dosya → rol ----------------
const anRol = Object.fromEntries(Object.entries(AN).map(([r, a]) => [a, r]));
const varsayilanRol = Object.fromEntries(Object.entries(VARSAYILAN_DOSYA).filter(([r]) => r !== "sis").map(([r, d]) => [d.replace(/\.\w+$/, ""), r]));
export function dosyaRolu(url) {
  if (!url) return null;
  const ad = decodeURIComponent(url.split("/").pop()).replace(/\.\w+$/, "").replace(/-[0-9a-f]{10}$/, "");
  if (ad === "kasa_devam") return "kasa_devam";
  const an = ad.replace(/-(?:[kpn]\d)(?:-(?:ac|devam))?$/, "");
  if (anRol[an]) return anRol[an];
  return varsayilanRol[ad] ?? ad;
}
export const anlamliMi = (rol) => BINME.has(rol) || rol === "kasa_devam";

// ---------------- sayfa izi (sürümden bağımsız; gerçek çıktı) ----------------
export function iz() {
  try { sessionStorage.setItem("bd_ses_tani", "1"); } catch { /* yok */ }
  const O = (window.__cikis = { zincir: [], saat: [], olay: [] });
  const abUrl = new WeakMap(), tamponUrl = new WeakMap();
  const ab0 = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = async function () { const b = await ab0.call(this); abUrl.set(b, this.url); return b; };
  const dec = BaseAudioContext.prototype.decodeAudioData;
  BaseAudioContext.prototype.decodeAudioData = function (ab, ok, err) {
    const u = abUrl.get(ab);
    const p = dec.call(this, ab, (b) => { if (u) tamponUrl.set(b, u); ok?.(b); }, err);
    return p?.then ? p.then((b) => { if (u) tamponUrl.set(b, u); return b; }) : p;
  };
  const MOD = `class D extends AudioWorkletProcessor{constructor(){super();this.b=[];this.port.onmessage=()=>{this.port.postMessage(this.b);this.b=[]}}
process(i){const c=i[0];let t=0,k=0;if(c&&c.length){for(const x of c){for(let j=0;j<x.length;j++)t+=x[j]*x[j];k+=x.length}}
this.b.push(currentTime,k?Math.sqrt(t/k):0);if(this.b.length>=96){this.port.postMessage(this.b);this.b=[]}return true}}registerProcessor("qt-dinle",D);`;
  const AC = window.AudioContext;
  window.AudioContext = class extends AC {
    constructor(...a) {
      super(...a);
      O.ctx = this;
      this.__hazir = this.audioWorklet.addModule(URL.createObjectURL(new Blob([MOD], { type: "text/javascript" }))).then(() => { this.__ok = true; });
      // saat eşlemesi: ses.js'in de kullandığı işleme saati (currentTime) — çıkış gecikmesi (getOutputTimestamp) karışmasın
      setInterval(() => { O.saat.push([performance.now(), this.currentTime]); }, 100);
    }
  };
  window.webkitAudioContext = window.AudioContext;
  for (const K of [AudioBufferSourceNode, OscillatorNode, AudioScheduledSourceNode]) {
    if (!Object.prototype.hasOwnProperty.call(K.prototype, "start")) continue;
    const bas0 = K.prototype.start;
    K.prototype.start = function (when = 0, ...r) {
      if (this.__basla == null) { this.__basla = Math.max(when || 0, this.context.currentTime); this.__an = window.__anEtiket ?? null; this.__perf = performance.now(); }
      return bas0.call(this, when, ...r);
    };
  }
  const con = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (hedef, ...r) {
    if (hedef instanceof AudioNode && !(hedef instanceof AudioDestinationNode)) {
      if (this instanceof AudioScheduledSourceNode) hedef.__kaynak = this; else if (this.__kaynak) hedef.__kaynak = this.__kaynak;
    }
    if (hedef instanceof AudioDestinationNode && !this.__dinle && this.__kaynak) {
      const ctx = this.context, z = { kaynak: this.__kaynak, dugum: this, kaz0: this.gain?.value ?? 1, bloklar: [] };
      O.zincir.push(z);
      if (ctx.__ok) {
        const d = new AudioWorkletNode(ctx, "qt-dinle", { numberOfOutputs: 0 });
        d.port.onmessage = (e) => { for (const v of e.data) z.bloklar.push(v); };
        z.dinle = d;
        con.call(this, d);
      }
    }
    return con.call(this, hedef, ...r);
  };
  // özet: her zincir için gerçek sinyal + dosyanın beklenen doğal eğrisi (× kazanç)
  window.__cikisOzet = async () => {
    for (const z of O.zincir) try { z.dinle?.port.postMessage(1); } catch { /* yok */ }
    await new Promise((c) => setTimeout(c, 400));
    const E = 10 ** (-45 / 20);
    return O.zincir.map((z) => {
      // kazanç: zincir kurulurken (sonradan kurulan söndürme rampası beklenen eğriyi değiştirmez)
      const k = z.kaynak, b = k.buffer ?? null, hiz = k.playbackRate?.value ?? 1, kaz = z.kaz0;
      let beklenen = null, dosya = null;
      if (b) {
        dosya = b.duration / hiz;
        const n = b.length, p = Math.round(b.sampleRate * 0.005), ch = Array.from({ length: b.numberOfChannels }, (_, i) => b.getChannelData(i));
        beklenen = 0;
        for (let s = Math.floor((n - 1) / p) * p; s >= 0; s -= p) {
          let t = 0; const e = Math.min(n, s + p);
          for (const c of ch) for (let j = s; j < e; j++) t += c[j] * c[j];
          if (Math.sqrt(t / ((e - s) * ch.length)) * kaz > E) { beklenen = e / b.sampleRate / hiz; break; }
        }
      }
      let ilk = null, son = null, tepe = 0;
      for (let i = 0; i < z.bloklar.length; i += 2) {
        const t = z.bloklar[i], v = z.bloklar[i + 1];
        tepe = Math.max(tepe, v);
        if (v > E) { if (ilk == null) ilk = t; son = t + 128 / (k.context.sampleRate || 48000); }
      }
      return { url: b ? tamponUrl.get(b) ?? null : null, tur: b ? "dosya" : "ton", an: k.__an, basla: k.__basla ?? null, perf: k.__perf ?? null,
        hiz, kazanc: +kaz.toFixed(3), beklenenSn: beklenen, dosyaSn: dosya, ilk, son, tepeDb: tepe > 0 ? +(20 * Math.log10(tepe)).toFixed(1) : null,
        blok: z.bloklar.length / 2, dinlendi: Boolean(z.dinle) };
    });
  };
}


/**
 * @param {object[]} zincir  window.__cikisOzet() çıktısı
 * @param {{t:number, ad:string}[]} ekranlar  görünür ekran değişimleri (aynı saat tabanında, t0 çıkarılmış)
 * @param {number} t0  zincirlerin perf saatinden çıkarılacak taban
 * @param {object[]} [kayit]  ses.js tanı kaydı (__sesKayit) — çalmayan anlamlı sesler ve nedenleri
 */
export function cikisOlc(zincir, ekranlar, t0, kayit = []) {
  const sesler = zincir.filter((z) => z.tur === "dosya").map((z) => {
    const rol = dosyaRolu(z.url);
    const bas = z.perf != null ? z.perf - t0 : null;
    const gercekSon = bas != null && z.son != null && z.basla != null ? bas + (z.son - z.basla) * 1000 : null;
    const beklenenSon = bas != null && z.beklenenSn != null ? bas + z.beklenenSn * 1000 : null;
    return { rol, an: z.an, dosya: z.url ? decodeURIComponent(z.url.split("/").pop()) : null, bas, gercekSon, beklenenSon,
      dogalMs: z.beklenenSn != null ? Math.round(z.beklenenSn * 1000) : null, dosyaMs: z.dosyaSn != null ? Math.round(z.dosyaSn * 1000) : null,
      kesilenMs: gercekSon != null && beklenenSon != null ? Math.max(0, Math.round(beklenenSon - gercekSon)) : null, tepeDb: z.tepeDb, dinlendi: z.dinlendi };
  });
  const tonlar = zincir.filter((z) => z.tur === "ton").length;
  const anlamli = sesler.filter((s) => s.rol && anlamliMi(s.rol) && !TIK_ROLLERI.has(s.rol) && s.bas != null && s.gercekSon != null);
  for (const s of anlamli) {
    s.kesildi = s.kesilenMs > 30;
    // ses bitmeden ekran geçti: ses başladıktan sonra gelen ilk yeni ekran, sinyal -45 dB'ye inmeden > 50 ms önce
    const e = ekranlar.find((x) => x.t > s.bas + 5 && x.t < s.gercekSon);
    s.ekranGecti = e && s.gercekSon - e.t > 50 ? { ad: e.ad, kalanMs: Math.round(s.gercekSon - e.t) } : null;
    const sonrakiEkran = ekranlar.find((x) => x.t > s.bas + 5);
    const sonrakiSes = anlamli.filter((o) => o !== s && o.bas > s.bas + 5).sort((a, b) => a.bas - b.bas)[0];
    const pen = Math.min(sonrakiEkran ? sonrakiEkran.t : Infinity, sonrakiSes ? sonrakiSes.bas : Infinity);
    s.pencereMs = Number.isFinite(pen) ? Math.round(pen - s.bas) : null;
    s.binme = [];
  }
  for (let i = 0; i < anlamli.length; i++) for (let j = 0; j < anlamli.length; j++) {
    const a = anlamli[i], b = anlamli[j];
    if (a === b || b.bas < a.bas || (b.bas === a.bas && j < i)) continue;
    const ust = Math.min(a.gercekSon, b.gercekSon) - b.bas;
    if (ust > 50) a.binme.push({ ile: b.rol, ms: Math.round(ust) });
  }
  const calmayan = kayit.filter((k) => anlamliMi(k.rol) && k.sonuc && k.sonuc !== "calindi" && k.sonuc !== "yukleniyor").map((k) => ({ rol: k.rol, neden: k.sonuc }));
  const sayac = {
    ekranGecti: anlamli.filter((s) => s.ekranGecti).length,
    binme: anlamli.filter((s) => s.binme.length).length,
    kesildi: anlamli.filter((s) => s.kesildi).length,
    calan: anlamli.length, tonlar, calmayan: calmayan.length, dinlenmeyen: sesler.filter((s) => !s.dinlendi).length,
  };
  return { sayac, calmayan, sesler: anlamli.map((s) => ({ ...s, bas: Math.round(s.bas), gercekSon: Math.round(s.gercekSon), beklenenSon: s.beklenenSon != null ? Math.round(s.beklenenSon) : null })) };
}
