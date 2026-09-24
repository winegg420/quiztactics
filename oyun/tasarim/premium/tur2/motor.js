/**
 * TUR 2 EFEKT MOTORU — tek paylaşılan WebGL bağlamı (yalnız /premium-onizleme; tembel parça).
 *
 * Neden tek bağlam: telefonda her çerçeveye ayrı WebGL bağlamı açmak bellek ve sınır (iOS ~8–16) sorunudur.
 * Burada TEK görünmez (DOM'a eklenmeyen) WebGL tuvali var; her kare görünür her yuva sırayla bu tuvalin
 * sol-alt köşesine kendi boyutunda çizilir (viewport) ve hemen yuvanın kendi 2D tuvaline drawImage ile
 * kopyalanır. Böylece yüzlerce yuva olsa da bağlam bir, program her efekt için bir.
 *
 * Kurallar:
 *  - Yalnız oynayan (ekranda + hareketli + hareket azaltılmamış; en büyük 2 tanesi) yuva her karede çizilir; öteki yuvalar
 *    yalnız bir kez (ilk kare / boyut değişimi) çizilir ve durur.
 *  - Sekme gizliyken döngü durur (requestAnimationFrame zaten durur; visibilitychange ile de kesilir).
 *  - En çok ~60 fps (120 Hz ekranda kare atlanır). Kareler yavaşsa çözünürlük kendiliğinden düşer
 *    (kalite 1 → 0,5), hızlanınca geri çıkar.
 *  - Bağlam kaybolursa (arka plan, bellek) yeniden kurulunca programlar ve dokular tazelenir.
 */
import { KOSE, PARCALAR } from "./golgelendiriciler.js";

const VS = "attribute vec2 a;varying vec2 v;void main(){v=a;gl_Position=vec4(a,0.,1.);}";
const DOKU_PX = 512;
const N_SAY = 10;
const MAKS_OYNAYAN = 2;   // telefonda aynı anda en çok iki hareketli efekt

let tekil;   // undefined: denenmedi · false: WebGL yok · Motor

/** Motoru döndürür; WebGL yoksa null. */
export function motorAl() {
  if (tekil === undefined) {
    try {
      tekil = new Motor();
    } catch (e) {
      console.warn("[Bildim] WebGL efekt motoru açılamadı, SVG yedeğe dönülüyor:", e?.message ?? e);
      tekil = false;
    }
  }
  return tekil || null;
}

function derle(gl, tur, kaynak) {
  const s = gl.createShader(tur);
  gl.shaderSource(s, kaynak);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const hata = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`gölgelendirici derlenemedi: ${hata}`);
  }
  return s;
}

class Motor {
  constructor() {
    const kanvas = document.createElement("canvas");
    kanvas.width = 256;
    kanvas.height = 256;
    const gl = kanvas.getContext("webgl", {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      preserveDrawingBuffer: false, powerPreference: "low-power",
    });
    if (!gl) throw new Error("WebGL bağlamı yok");
    this.kanvas = kanvas;
    this.gl = gl;
    this.yuvalar = new Set();
    this.programlar = new Map();
    this.dokular = new Map();      // anahtar → { doku, hazir, soz }
    this.kalite = 1;
    this.cizimMs = 0;
    this.aralik = 15;              // kareler arası en az ms (60 fps); yavaş cihazda 31 (30 fps)
    this.ort = 16.7;               // kare süresi ortalaması (ms)
    this.sayac = 0;
    this.son = 0;
    this.raf = 0;
    this.kayip = false;
    this.azalt = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.kareB = (z) => this.kare(z);
    this.kur();

    kanvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.kayip = true;
      this.dur();
    });
    kanvas.addEventListener("webglcontextrestored", () => {
      this.kayip = false;
      this.programlar.clear();
      const eski = [...this.dokular.entries()];
      this.dokular.clear();
      this.kur();
      eski.forEach(([anahtar, k]) => { if (k.kaynaklar) this.dokuAl(anahtar, k.kaynaklar); });
      this.yuvalar.forEach((y) => { y.kirli = true; });
      this.baslat();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.dur(); else this.baslat();
    });
    if (typeof matchMedia === "function") {
      const mq = matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener?.("change", () => {
        this.azalt = mq.matches;
        this.yuvalar.forEach((y) => { y.kirli = true; });
        this.baslat();
      });
    }
  }

  kur() {
    const gl = this.gl;
    this.tampon = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tampon);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.bosDoku = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.bosDoku);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  program(efekt) {
    let p = this.programlar.get(efekt);
    if (p) return p;
    const gl = this.gl;
    const fs = PARCALAR[efekt];
    if (!fs) throw new Error(`bilinmeyen efekt: ${efekt}`);
    const pr = gl.createProgram();
    gl.attachShader(pr, derle(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, derle(gl, gl.FRAGMENT_SHADER, KOSE + fs));
    gl.bindAttribLocation(pr, 0, "a");
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(pr));
    const u = (ad) => gl.getUniformLocation(pr, ad);
    p = { pr, t: u("u_t"), px: u("u_px"), doku: u("u_doku"), dokuVar: u("u_dokuVar"), a: u("u_a"), n: u("u_n"), nSay: u("u_nSay") };
    this.programlar.set(efekt, p);
    return p;
  }

  /**
   * Sanat dokusu (maske/ışık için): kaynaklar = [{ url, kutu: [x, y, w, h] (birim, −85…85) }] tek 512 px
   * tuvale üst üste çizilir. Aynı anahtar tek kez yüklenir.
   */
  dokuAl(anahtar, kaynaklar) {
    let k = this.dokular.get(anahtar);
    if (k) return k;
    k = { doku: null, hazir: false, kaynaklar };
    this.dokular.set(anahtar, k);
    const yukle = (url) => new Promise((coz, red) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => coz(img);
      img.onerror = () => red(new Error(`görsel yüklenemedi: ${url}`));
      img.src = url;
    });
    k.soz = Promise.all(kaynaklar.map((s) => yukle(s.url))).then((gorseller) => {
      if (this.kayip) return;
      const c = document.createElement("canvas");
      c.width = DOKU_PX;
      c.height = DOKU_PX;
      const x = c.getContext("2d");
      const o = DOKU_PX / 170;
      gorseller.forEach((img, i) => {
        const [bx, by, bw, bh] = kaynaklar[i].kutu ?? [-85, -85, 170, 170];
        x.drawImage(img, (bx + 85) * o, (by + 85) * o, bw * o, bh * o);
      });
      const gl = this.gl;
      const d = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, d);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
      k.doku = d;
      k.hazir = true;
      this.yuvalar.forEach((y) => { if (y.dokuAnahtar === anahtar) y.kirli = true; });
      this.baslat();
    }).catch((e) => console.warn("[Bildim] efekt dokusu:", e?.message ?? e));
    return k;
  }

  /**
   * Yuva ekler. hedef: görünür <canvas> (kutunun %170'i). ayar: { efekt, olcek, a:[4], n:[[x,y,s,f]…],
   * doku: { anahtar, kaynaklar } }. Dönen nesne: { oynat(bool), boyutla(cssPx), guncelle(ayar), birak() }.
   */
  ekle(hedef, ayar) {
    const y = {
      hedef, ctx: hedef.getContext("2d"), ayar, oynar: false, kirli: true, css: 0,
      t0: Math.random() * 40, dokuAnahtar: ayar.doku?.anahtar ?? null,
      n: new Float32Array(N_SAY * 4), nSay: 0,
    };
    this.ayarla(y, ayar);
    if (ayar.doku) this.dokuAl(ayar.doku.anahtar, ayar.doku.kaynaklar);
    this.yuvalar.add(y);
    const m = this;
    return {
      oynat(v) { if (y.oynar !== v) { y.oynar = v; y.kirli = true; m.baslat(); } },
      boyutla(css) { if (y.css !== css) { y.css = css; y.kirli = true; m.baslat(); } },
      guncelle(yeni) {
        m.ayarla(y, yeni);
        if (yeni.doku) { y.dokuAnahtar = yeni.doku.anahtar; m.dokuAl(yeni.doku.anahtar, yeni.doku.kaynaklar); }
        y.kirli = true;
        m.baslat();
      },
      birak() { m.yuvalar.delete(y); },
    };
  }

  ayarla(y, ayar) {
    y.ayar = ayar;
    y.n.fill(0);
    const liste = (ayar.n ?? []).slice(0, N_SAY);
    liste.forEach((q, i) => { for (let j = 0; j < 4; j += 1) y.n[i * 4 + j] = q[j] ?? 0; });
    y.nSay = liste.length;
  }

  baslat() {
    if (this.raf || this.kayip || document.hidden) return;
    this.raf = requestAnimationFrame(this.kareB);
  }

  dur() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  kare(simdi) {
    this.raf = 0;
    if (this.kayip || document.hidden) return;
    const oynayan = [];
    const kirli = [];
    const aday = [];
    this.yuvalar.forEach((y) => {
      if (!y.css || !y.hedef.isConnected) return;
      if (y.oynar && !this.azalt) aday.push(y); else if (y.kirli) kirli.push(y);
    });
    // Aynı anda en çok MAKS_OYNAYAN (en büyük) yuva hareket eder; ötekiler tek durağan karede kalır.
    aday.sort((a, b) => b.css - a.css);
    aday.forEach((y, i) => {
      if (i < MAKS_OYNAYAN) { oynayan.push(y); y.bekler = false; }
      else if (!y.bekler || y.kirli) { kirli.push(y); y.bekler = true; }
    });
    if (!oynayan.length && !kirli.length) return;
    const dt = simdi - this.son;
    if (oynayan.length && dt < this.aralik && !kirli.length) { this.raf = requestAnimationFrame(this.kareB); return; }
    if (oynayan.length && this.son && dt < 200) this.uyarla(dt);
    this.son = simdi;
    const t0 = performance.now();
    try {
      oynayan.forEach((y) => this.ciz(y, simdi / 1000 + y.t0));
      // durağan kare: sabit, efektin dolu göründüğü an (ör. alev nefesinin ortası)
      kirli.forEach((y) => this.ciz(y, y.ayar.durgunT ?? 1.3));
    } catch (e) {
      console.warn("[Bildim] efekt çizilemedi:", e?.message ?? e);
      return;
    }
    this.cizimMs = this.cizimMs * 0.9 + (performance.now() - t0) * 0.1;
    if (typeof window !== "undefined") window.__p2 = { oynayan: oynayan.length, yuva: this.yuvalar.size, kalite: this.kalite, aralik: this.aralik, ms: this.cizimMs };
    if (oynayan.length) this.raf = requestAnimationFrame(this.kareB);
  }

  /** Kareler yavaşsa çözünürlüğü düşür, hızlıysa geri çıkar. */
  uyarla(dt) {
    this.ort = this.ort * 0.92 + dt * 0.08;
    this.sayac += 1;
    if (this.sayac < 30) return;
    if (this.ort > 24) {
      // önce çözünürlük, en altta kare hızı (30 fps) düşer
      if (this.kalite > 0.6) this.kalite = Math.max(0.5, this.kalite - 0.15);
      else if (this.aralik < 31) { this.aralik = 31; this.ort = 33; }
      this.sayac = 0;
    } else if (this.sayac > 120 && this.ort < (this.aralik > 20 ? 34 : 17.5)) {
      if (this.aralik > 20 && this.ort < 34) { /* 30 fps'te kararlı: bırak */ }
      else if (this.kalite < 1) this.kalite = Math.min(1, this.kalite + 0.1);
      this.sayac = 0;
    }
  }

  ciz(y, t) {
    const gl = this.gl;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);   // efektler yumuşak: 1,5× yeter, dolgu maliyeti yarıya iner
    // küçük yuvalar ucuz: kalite düşse de en az ~0,8× piksel (dükkân kartında bulanık görünmesin)
    const px = Math.max(24, Math.min(720, Math.round(Math.max(y.css * dpr * (y.ayar.olcek ?? 0.75) * this.kalite, Math.min(y.css * dpr * 0.8, 170)))));
    if (y.hedef.width !== px) { y.hedef.width = px; y.hedef.height = px; }
    if (this.kanvas.width < px) {
      const b = Math.min(1024, Math.ceil(px / 128) * 128);
      this.kanvas.width = b;
      this.kanvas.height = b;
    }
    const p = this.program(y.ayar.efekt);
    gl.viewport(0, 0, px, px);
    gl.useProgram(p.pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tampon);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const k = y.dokuAnahtar ? this.dokular.get(y.dokuAnahtar) : null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, k?.hazir ? k.doku : this.bosDoku);
    gl.uniform1i(p.doku, 0);
    gl.uniform1f(p.dokuVar, k?.hazir ? 1 : 0);
    gl.uniform1f(p.t, t % 3600);
    gl.uniform1f(p.px, px);
    gl.uniform4fv(p.a, y.ayar.a ?? [0, 0, 0, 0]);
    gl.uniform4fv(p.n, y.n);
    gl.uniform1f(p.nSay, y.nSay);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    y.ctx.clearRect(0, 0, px, px);
    y.ctx.drawImage(this.kanvas, 0, this.kanvas.height - px, px, px, 0, 0, px, px);
    y.kirli = false;
  }
}
