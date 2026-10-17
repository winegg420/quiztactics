// Ses düzeltme işlemleri (17 Eki 2026, ses-bitis) — araclar/ses-duzelt.mjs kullanır. Paket yok; düz JS.
//
//   dogalKuyruk — kaynakta KESİK biten (ya da sonuna zorla söndürme vurulmuş) sesin DOĞAL kuyruğu: sesin kendi son
//                 karesinin tayfı faz sürekliliğiyle (phase vocoder "freeze") sürdürülür ve sesin kendi sönüm eğimiyle
//                 (eğim yoksa verilen sönüm süresiyle) sessizliğe iner. Ses kırpılmaz: kuyruk, kaynağın zorla söndürülmeye
//                 başladığı noktadan (çapa) itibaren kaynağın yerini alır; çapaya kadar her örnek aynen kalır.
//   sikistir    — perdeyi koruyan zaman sıkıştırma (WSOLA): bütün cümle (giriş + gövde) aynı perdede, daha kısa sürede çalar.
//                 Girişin ilk `korunanMs`'i aynen kalır (vuruş yumuşamasın).

// ------------------------------------------------------------------ FFT (yerinde, radix-2)
function fft(re, im, ters = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = ((ters ? 2 : -2) * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (ters) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
const princarg = (p) => p - 2 * Math.PI * Math.round(p / (2 * Math.PI));

function kare(x, bas, N, w) {
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) { const j = bas + i; re[i] = j >= 0 && j < x.length ? x[j] * w[i] : 0; }
  fft(re, im);
  return { re, im };
}

/** 5 ms RMS zarfı (dB). */
export function zarfDb(x, oran, pencereMs = 5) {
  const p = Math.max(1, Math.round((oran * pencereMs) / 1000)), z = [];
  for (let i = 0; i < x.length; i += p) {
    let t = 0; const s = Math.min(x.length, i + p);
    for (let j = i; j < s; j++) t += x[j] * x[j];
    const r = Math.sqrt(t / Math.max(1, s - i));
    z.push(r > 0 ? 20 * Math.log10(r) : -200);
  }
  return z;
}

/**
 * Kaynağın zorla söndürülmeye başladığı nokta (ms): son 400 ms'nin [-400, -120] bölümünden doğrusal (dB) eğim kestirilir;
 * sondan 140 ms içinde seviyenin kestirimden 6 dB'den fazla düştüğü ilk an çapadır. Yoksa dosya sonundan 10 ms önce.
 */
export function capaBul(x, oran) {
  const z = zarfDb(x, oran), P = 5, n = z.length;
  const a = Math.max(0, n - 80), b = Math.max(a + 2, n - 24);
  const xs = [], ys = [];
  for (let i = a; i < b; i++) if (z[i] > -70) { xs.push(i); ys.push(z[i]); }
  let egim = 0, kes = z[Math.max(0, b - 1)] ?? -60;
  if (xs.length >= 4) {
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length;
    let pay = 0, payda = 0;
    for (let i = 0; i < xs.length; i++) { pay += (xs[i] - mx) * (ys[i] - my); payda += (xs[i] - mx) ** 2; }
    egim = payda ? pay / payda : 0; kes = my - egim * mx;
  }
  let capa = n - 2;
  for (let i = Math.max(b, n - 28); i < n; i++) {
    // pencere içi dalgalanma: 3 pencerelik ortalama
    const ort = (z[i] + (z[i + 1] ?? z[i]) + (z[i + 2] ?? z[i])) / 3;
    if (ort < kes + egim * i - 6) { capa = i; break; }
  }
  return { capaMs: capa * P, egimDbMs: Math.min(0, egim / P), seviyeDb: z[Math.max(0, capa - 1)] };
}

/**
 * @param {Float32Array} x
 * @param {number} oran
 * @param {{capaMs?: number, sonumMs?: number, enUzunSonumMs?: number, enKisaSonumMs?: number, gecisMs?: number}} s
 *   sonumMs: 60 dB'lik iniş süresi (verilmezse sesin kendi eğiminden; [enKisaSonumMs, enUzunSonumMs] aralığına sıkıştırılır)
 */
export function dogalKuyruk(x, oran, s = {}) {
  const c = capaBul(x, oran);
  const capaMs = s.capaMs ?? c.capaMs;
  const kendi = c.egimDbMs < -0.02 ? 60 / -c.egimDbMs : Infinity;
  const sonumMs = s.sonumMs ?? Math.min(s.enUzunSonumMs ?? 400, Math.max(s.enKisaSonumMs ?? 120, kendi));
  const N = 2 ** Math.round(Math.log2(oran * 0.046)), H = N / 4, w = hann(N);
  const a = Math.min(x.length, Math.round((capaMs * oran) / 1000));
  const f1 = kare(x, a - N - H, N, w), f2 = kare(x, a - N, N, w);
  const M = new Float64Array(N / 2 + 1), dphi = new Float64Array(N / 2 + 1), phi = new Float64Array(N / 2 + 1);
  for (let k = 0; k <= N / 2; k++) {
    M[k] = Math.hypot(f2.re[k], f2.im[k]);
    const p1 = Math.atan2(f1.im[k], f1.re[k]), p2 = Math.atan2(f2.im[k], f2.re[k]);
    const beklenen = (2 * Math.PI * k * H) / N;
    dphi[k] = beklenen + princarg(p2 - p1 - beklenen);
    phi[k] = p2;
  }
  // kuyruk boyu: -75 dB'ye inene kadar (60 dB / sonumMs eğimiyle)
  const kuyrukMs = (sonumMs * 75) / 60;
  const kuyruk = Math.round((kuyrukMs * oran) / 1000);
  const y = new Float64Array(a + kuyruk + N);
  const norm = 1.5;   // Hann² OLA toplamı (H = N/4)
  for (let m = -3; ; m++) {
    const bas = a - N + m * H;
    if (bas > a + kuyruk) break;
    const merkezMs = ((bas + N / 2 - a) * 1000) / oran;
    const kaz = merkezMs <= 0 ? 1 : 10 ** ((-60 * merkezMs) / sonumMs / 20);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let k = 0; k <= N / 2; k++) {
      const p = phi[k] + m * dphi[k];
      re[k] = M[k] * kaz * Math.cos(p); im[k] = M[k] * kaz * Math.sin(p);
      if (k > 0 && k < N / 2) { re[N - k] = re[k]; im[N - k] = -im[k]; }
    }
    fft(re, im, true);
    for (let i = 0; i < N; i++) { const j = bas + i; if (j >= 0 && j < y.length) y[j] += (re[i] * w[i]) / norm; }
  }
  // çapaya kadar kaynak; çapadan önceki gecisMs içinde kaynaktan kuyruğa eşit güçlü geçiş
  const gecis = Math.round((((s.gecisMs ?? 20)) * oran) / 1000);
  const cikis = new Float32Array(a + kuyruk);
  for (let i = 0; i < cikis.length; i++) {
    if (i < a - gecis) cikis[i] = x[i];
    else if (i < a) { const t = (i - (a - gecis)) / gecis; cikis[i] = x[i] * Math.cos((t * Math.PI) / 2) + y[i] * Math.sin((t * Math.PI) / 2); }
    else cikis[i] = y[i];
  }
  // en sondaki -75 dB artığı: son 5 ms sıfıra (tık olmasın; seviye zaten duyulmaz)
  const son = Math.round(oran * 0.005);
  for (let i = 0; i < son; i++) cikis[cikis.length - 1 - i] *= i / son;
  return { ornek: cikis, capaMs, sonumMs: Math.round(sonumMs), kendiSonumMs: Number.isFinite(kendi) ? Math.round(kendi) : null };
}

/**
 * Darbeli (tık dizisi) ses: zarfın çoğu sessiz, kısa vuruşlar arka arkaya (ör. XP sayacı). Son vuruş dosya bitiminde kesikse
 * freeze kuyruğu vuruşu tona çevirir — bunun yerine bir önceki periyodun aynı noktasından sonrası eklenir (son vuruşun kendi
 * sönümü + vuruşlar arası sessizlik). null → darbeli değil.
 */
export function donguyuTamamla(x, oran) {
  const z = zarfDb(x, oran), P = 5;
  const yuksek = z.filter((v) => v > -30).length / z.length;
  if (yuksek > 0.5) return null;
  const vurus = [];
  for (let i = 1; i < z.length; i++) if (z[i] > -30 && z[i - 1] <= -30) vurus.push(i);
  if (vurus.length < 3) return null;
  const son = vurus[vurus.length - 1], onceki = vurus[vurus.length - 2];
  const periyot = (son - onceki) * P, gecen = (z.length - son) * P;
  if (periyot <= gecen) return null;
  // eklenen bölüm: önceki periyotta son vuruşla aynı noktadan, bir sonraki vuruşun girişinden (-50 dB'yi aştığı an) 5 ms öncesine
  let girisI = son;
  while (girisI > onceki && z[girisI - 1] > -50) girisI--;
  const bas = Math.round(((onceki * P + gecen) * oran) / 1000), bit = Math.round(((onceki * P + (girisI - onceki) * P - 5) * oran) / 1000);
  if (bit <= bas) return null;
  const ek = x.subarray(Math.min(bas, x.length), Math.min(bit, x.length));
  const y = new Float32Array(x.length + ek.length);
  y.set(x); y.set(ek, x.length);
  return y;
}

/** Perdeyi koruyan zaman sıkıştırma (WSOLA). faktor < 1 kısaltır (çıkış ≈ giriş × faktor). */
export function sikistir(x, oran, faktor, { korunanMs = 0 } = {}) {
  if (faktor >= 0.999) return Float32Array.from(x);
  const kor = Math.round((korunanMs * oran) / 1000);
  const N = 2 * Math.round(oran * 0.015), Hs = N / 2, Ha = Hs / faktor, tol = Math.round(oran * 0.008), w = hann(N);
  const govde = x.subarray(kor);
  const uz = Math.ceil(govde.length * faktor) + N;
  const y = new Float64Array(uz), top = new Float64Array(uz);
  let delta = 0;
  for (let k = 0; ; k++) {
    const po = k * Hs, pi = Math.round(k * Ha) + delta;
    if (pi + N >= govde.length || po + N >= uz) {
      // kalan: son parça aynen (sönüm kuyruğu)
      if (pi < govde.length) for (let i = 0; i < N && po + i < uz && pi + i < govde.length; i++) { y[po + i] += govde[pi + i] * w[i]; top[po + i] += w[i]; }
      break;
    }
    for (let i = 0; i < N; i++) { y[po + i] += govde[pi + i] * w[i]; top[po + i] += w[i]; }
    // doğal devam: pi + Hs'den başlayan bölüm; bir sonraki analiz noktası etrafında en benzer bölüm aranır
    const hedef = Math.round((k + 1) * Ha);
    let en = -Infinity, enD = 0;
    for (let d = -tol; d <= tol; d++) {
      const q = hedef + d;
      if (q < 0 || q + N >= govde.length) continue;
      let t = 0;
      for (let i = 0; i < N; i += 2) t += govde[pi + Hs + i] * govde[q + i];
      if (t > en) { en = t; enD = d; }
    }
    delta = enD;
  }
  let son = uz;
  while (son > 0 && top[son - 1] === 0) son--;
  const cikis = new Float32Array(kor + son);
  for (let i = 0; i < kor; i++) cikis[i] = x[i];
  // korunan giriş → sıkıştırılmış gövde: 10 ms geçiş (gövdenin başı zaten aynı örneklerden başlar)
  for (let i = 0; i < son; i++) cikis[kor + i] = top[i] > 1e-6 ? y[i] / top[i] : 0;
  return cikis;
}
