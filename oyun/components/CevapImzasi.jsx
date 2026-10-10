/**
 * CEVAP İMZASI (1040, Ida onayı 10 Eki 2026) — oyuncu soruyu DOĞRU cevaplayınca doğru şıkkın üstünde ~0,8–1,3 sn oynayan
 * kişisel efekt. Tek ortak bileşen: Klasik / Saf Bilgi / Grup / Turnuva / Hatalarım (QuestionCard), Ortak Hazine (KasaPage),
 * Düello v4 (Duello4Arena) ve Dükkân demosu aynısını kullanır.
 *
 * KURALLAR (Ida): imzayı YALNIZ oyuncunun kendisi görür — sunucuya / Realtime'a hiçbir şey gitmez, takılı imza yalnız
 * kendi profilinden okunur (useTakiliImza). Yeni ses yok. Süre / puan / soru etkilenmez. Tıklamayı engellemez
 * (pointer-events: none), sonucu geciktirmez; `anahtar` değişince ya da bileşen kalkınca efekt ANINDA temizlenir (katman
 * ve canvas kaldırılır → rAF bir sonraki karede durur). "Hareketi azalt" sürümü yok (Ida kararı).
 *
 * GÖRSEL KAYNAK: docs/cevap-imzasi-referans.txt — maketteki kodun birebiri. CSS imzalar cevap-imzasi.css'te; Yanan Kart
 * ve Elektrik Akımı aşağıda canvas ile (renk, süre, parçacık kuralları aynen). Tek uyarlama: canvas'ın şık şekline
 * kırpma yarıçapı maketteki sabit 9 px yerine hedef şıkkın GERÇEK köşe yarıçapı (okunamazsa 9) — kor/kömür şıkkın
 * dışına taşmasın diye; maketin şıkları 9 px idi.
 *
 * Kullanım: <CevapImzasi imza={anahtar} kapRef={ref} secici=".qt-sik-yuva" sira={dogruIndex} anahtar={soruAnahtari} />
 *   imza   — kozmetik anahtarı (imza_neon_tik …); null → hiçbir şey olmaz
 *   kapRef — doğru şıkkı içeren kapsayıcı; secici + sira ile hedef öğe bulunur (position: relative olmalı)
 *   anahtar — oynatma anahtarı: null → oynamaz; her yeni değer bir kez oynatır (Dükkân demosunda "Tekrar oynat")
 */
import { useEffect } from "react";
import "../tasarim/ekranlar/cevap-imzasi.css";

/** Kozmetik anahtarı → maketteki imza kimliği. Bilinmeyen anahtar oynamaz. */
export const IMZA_TURU = {
  imza_neon_tik: "neon",
  imza_yildiz: "yildiz",
  imza_ampul: "ampul",
  imza_elektrik: "elektrik",
  imza_yanan_kart: "yanan",
};
/** Bir imzanın en uzun süresi (ms) — katman bundan sonra kendiliğinden kalkar (Yanan Kart 1350 ms). */
const EN_UZUN_MS = 1400;

// ---------- SVG sabitleri (maket) ----------
const K = "#1d2152";   // ampul konturu (maketteki K; proje laciverti --qt-metin)
const AMPUL = '<svg class="ampul" viewBox="0 0 34 44" aria-hidden="true"><path class="cam" d="M17 2C8.7 2 3 8 3 15.5c0 5.3 3 8.3 5.6 11 1.6 1.7 2.4 3.6 2.4 5.5h12c0-1.9.8-3.8 2.4-5.5 2.6-2.7 5.6-5.7 5.6-11C31 8 25.3 2 17 2z" stroke="' + K + '" stroke-width="2.5"/><rect x="11" y="32" width="12" height="4" rx="1" fill="#c9cfe8" stroke="' + K + '" stroke-width="2"/><rect x="12" y="36" width="10" height="5" rx="2" fill="#9aa3c8" stroke="' + K + '" stroke-width="2"/><path d="M13 20q4 4 8 0" fill="none" stroke="' + K + '" stroke-width="1.8" stroke-linecap="round"/></svg>';
const TIK = '<svg viewBox="0 0 46 46" class="neon-tik" aria-hidden="true"><path d="M10 24l9 9 17-20"/></svg>';

/** CSS imzalarının katman içeriği (maket: imza başına çizim). */
function cssIcerik(tur) {
  let h = "", i, a, r;
  if (tur === "neon") h = '<div class="neon-halka"></div>' + TIK;
  else if (tur === "yildiz") {
    h = '<div class="yildiz-isik"></div>';
    for (i = 0; i < 9; i++) { a = (i / 9) * Math.PI * 2 + 0.3; r = 42 + (i % 3) * 10; h += '<div class="yildiz" style="--x:' + Math.round(Math.cos(a) * r) + 'px;--y:' + Math.round(Math.sin(a) * r * 0.7) + 'px;animation-delay:' + (i % 3) * 40 + 'ms"></div>'; }
  } else if (tur === "ampul") {
    h = AMPUL;
    for (i = 0; i < 7; i++) h += '<i class="isin-cubuk" style="--a:' + (-90 + i * 30 - 90 + 90) + 'deg"></i>';
  }
  return h;
}

// ---------- Tuval (canvas) imzaları — maketten aynen ----------
/** Hedef şıkkın köşe yarıçapı (canvas kırpması şıkla aynı şekilde olsun); okunamazsa maketteki 9. */
function koseYaricapi(hedef) {
  try {
    const el = hedef.querySelector(":scope > .qt-sik") ?? hedef;
    const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
    return Number.isFinite(r) && r > 0 ? Math.min(r, hedef.offsetHeight / 2) : 9;
  } catch {
    return 9;
  }
}
function sikTuval(hedef, pay) {
  var w = hedef.offsetWidth, hh = hedef.offsetHeight, d = Math.min(2, window.devicePixelRatio || 1), c = document.createElement("canvas");
  c.width = (w + pay * 2) * d; c.height = (hh + pay * 2) * d;
  c.style.cssText = "position:absolute;left:" + (-pay) + "px;top:" + (-pay) + "px;width:" + (w + pay * 2) + "px;height:" + (hh + pay * 2) + "px;pointer-events:none;z-index:4";
  c.className = "ci-tuval";
  c.setAttribute("aria-hidden", "true");
  hedef.appendChild(c); var x = c.getContext("2d"); x.scale(d, d);
  return { x: x, c: c, w: w, h: hh, p: pay, r: koseYaricapi(hedef), d: d };
}
function oynatTuval(t, ms, f) {
  var bas = performance.now();
  (function adim(s) { var g = s - bas; if (!t.c.isConnected) return; t.x.clearRect(0, 0, t.w + t.p * 2, t.h + t.p * 2); if (g < ms) { f(g); requestAnimationFrame(adim); } else t.c.remove(); })(bas);
}
function yuvarlakDikdortgen(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
// --- gürültü (fbm): yumuşak, doğal yanma cephesi için ---
function gurultuUret(gx, gy, tohum, olcek = 1) {   // olcek: hücre başına piksel / 2 (maket 2 px) — desen piksel ölçeğinde aynı kalır
  var r = function (i, j) { var s = Math.sin(i * 127.1 + j * 311.7 + tohum * 74.7) * 43758.5453; return s - Math.floor(s); };
  var yum = function (x, y) { var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    var a = r(i, j), b = r(i + 1, j), c = r(i, j + 1), d = r(i + 1, j + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  var o = new Float32Array(gx * gy);
  for (var y = 0; y < gy; y++) for (var x = 0; x < gx; x++) { var X = x * olcek, Y = y * olcek; o[y * gx + x] = yum(X / 9, Y / 9) * .55 + yum(X / 4.5, Y / 4.5) * .3 + yum(X / 2, Y / 2) * .15; }
  return o;
}
// Yanan Kart v2: alt kenardan tutuşur → düzensiz yanma cephesi yukarı yürür (cephede alevler + parlayan kor çizgisi)
// → kömürleşen yüzeyde sönmekte olan kor noktaları + duman → kömür pul pul kül olup kopar, savrulur → yeşil şık geri gelir.
// PERFORMANS (4× CPU ölçümü, RAPOR-cevap-imzasi.md): maketteki hücre başına fillStyle + fillRect (~5.000 çağrı/kare) yerine
// hücre renkleri ızgara boyutunda bir ImageData'ya yazılır ve TEK drawImage ile (yumuşatmasız, A kat büyütülerek) basılır —
// renk, alfa, hücre boyu ve kırpma aynı; görünüm değişmez.
// IZGARA_ADIMI: maket 2 px → 3 px (10 Eki 2026 ölçümü, 4× CPU, 390 px: kaçan kare %15–25 → %7–11; RAPOR-cevap-imzasi.md).
// Görünüm korunur: gürültü deseni piksel ölçeğinde aynı (olcek = A/2), hücre başına olasılıklar alan oranıyla (YOG = (A/2)²)
// büyür → alev / duman / kor / kül yoğunluğu piksel başına maketle aynı; yalnız kor cephesinin pikseli 2 yerine 3 px.
// 2 yapılırsa kurallar maketle birebir aynıdır.
const IZGARA_ADIMI = 3;
const KUL_TON = Array.from({ length: 40 }, (_, i) => "rgb(" + (60 + i) + "," + (54 + i) + "," + (50 + i) + ")");   // kül tonu 60–99 (maket)
function tuvalYanan(hedef) {
  var t = sikTuval(hedef, 46), A = IZGARA_ADIMI, YOG = (A / 2) * (A / 2), KUL_ARA = Math.max(1, Math.round(9 / YOG)),
    gx = Math.ceil(t.w / A), gy = Math.ceil(t.h / A), gr = gurultuUret(gx, gy, Math.random() * 10, A / 2);
  var esik = new Float32Array(gx * gy);
  for (var j = 0; j < gx * gy; j++) { var px = (j % gx) / gx, py = Math.floor(j / gx) / gy;
    esik[j] = (1 - py) * .55 + Math.abs(px - .5) * .25 + gr[j] * .45; }           // alttan ve ortadan başlar
  var alev = [], kul = [], duman = [], kopan = new Uint8Array(gx * gy), YANMA = 560, KUL = 380, TOPLAM = 1350;
  // Hücre katmanı: ızgara boyutunda ara tuval (1 hücre = 1 piksel) → ana tuvale A kat, yumuşatmasız
  var ara = document.createElement("canvas"); ara.width = gx; ara.height = gy;
  var arax = ara.getContext("2d"), img = arax.createImageData(gx, gy), pk = img.data;
  var komur = new Uint8ClampedArray(gx * gy * 3);                       // hücrenin sabit kömür rengi (k = .9 + gürültü × .1)
  for (var q0 = 0; q0 < gx * gy; q0++) { var k0 = .9 + gr[q0] * .1; komur[q0 * 3] = Math.round(34 * k0); komur[q0 * 3 + 1] = Math.round(24 * k0); komur[q0 * 3 + 2] = Math.round(20 * k0); }
  var boya = function (i, r, gg, b, a) { var o = i * 4; pk[o] = r; pk[o + 1] = gg; pk[o + 2] = b; pk[o + 3] = Math.round(a * 255); };
  oynatTuval(t, TOPLAM, function (g) {
    var x = t.x, cephe = Math.min(1, g / YANMA) * 1.25, kulT = Math.max(0, (g - YANMA - 60) / KUL), ox = t.p, oy = t.p;
    // 1) kömür + kor cephesi (şık şekline kırpılı)
    pk.fill(0);
    for (var i = 0; i < esik.length; i++) {
      if (kopan[i]) continue;
      var e = esik[i], cx = ox + (i % gx) * A, cy = oy + Math.floor(i / gx) * A;
      if (e < cephe - .07) {
        // kül evresi: üstten alta değil, gürültüye göre parça parça kopar
        if (kulT > 0 && gr[i] < kulT * 1.15) { kopan[i] = 1;
          if (i % KUL_ARA === 0) kul.push({ x: cx, y: cy, vx: (Math.random() - .3) * .9, vy: -(.5 + Math.random() * 1.1), o: 0, om: 50 + Math.random() * 40, d: Math.random() * 6.28, dv: (Math.random() - .5) * .25, b: 1.6 + Math.random() * 2.4, kor: Math.random() < .08 });
          continue; }
        var kor = (kulT === 0 && Math.random() < .004 * YOG) ? 1 : 0;
        if (kor) boya(i, 255, 120, 40, .9); else boya(i, komur[i * 3], komur[i * 3 + 1], komur[i * 3 + 2], .96);
      } else if (e < cephe) {
        var s = (cephe - e) / .07;                                  // 0 = cephenin önü (sarı-beyaz), 1 = arkası (koyu kırmızı)
        if (s < .35) boya(i, 255, 240, 170, 1); else if (s < .7) boya(i, 255, 150, 40, 1); else boya(i, 170, 40, 15, 1);
        if (g < YANMA && Math.random() < .035 * YOG) alev.push({ x: cx, y: cy, vx: (Math.random() - .5) * .4, vy: -(.9 + Math.random() * 1.4), o: 0, om: 14 + Math.random() * 16, b: 5 + Math.random() * 6 });
        if (g < YANMA + 100 && Math.random() < .006 * YOG) duman.push({ x: cx, y: cy, vx: (Math.random() - .5) * .3, vy: -(.4 + Math.random() * .4), o: 0, om: 50, b: 6 + Math.random() * 6 });
      } else if (e < cephe + .05) {                                 // cephenin hemen önü: kavrulma (kahverengileşme)
        boya(i, 120, 70, 20, (cephe + .05 - e) / .05 * .45);
      }
    }
    arax.putImageData(img, 0, 0);
    x.save(); yuvarlakDikdortgen(x, ox, oy, t.w, t.h, t.r); x.clip();
    x.imageSmoothingEnabled = false; x.drawImage(ara, ox, oy, gx * A, gy * A);
    x.restore();
    // 2) duman (normal karışım, yarı saydam)
    for (var d = duman.length - 1; d >= 0; d--) { var m = duman[d]; m.o++; m.x += m.vx + Math.sin(m.o * .1) * .3; m.y += m.vy; m.b += .25;
      var al = (1 - m.o / m.om) * .22; if (al <= 0) { duman.splice(d, 1); continue; }
      var sg = x.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.b); sg.addColorStop(0, "rgba(110,105,115," + (al * .8) + ")"); sg.addColorStop(1, "rgba(110,105,115,0)"); x.fillStyle = sg; x.beginPath(); x.arc(m.x, m.y, m.b, 0, 6.29); x.fill(); }
    // 3) alevler (ışık toplama)
    x.globalCompositeOperation = "lighter";
    for (var f = alev.length - 1; f >= 0; f--) { var q = alev[f]; q.o++; q.x += q.vx + Math.sin((q.o + f) * .5) * .4; q.y += q.vy; q.vy *= 1.01;
      var u = q.o / q.om; if (u >= 1) { alev.splice(f, 1); continue; }
      var b = q.b * (1 - u * .6), gg = x.createRadialGradient(q.x, q.y, 0, q.x, q.y, b);
      gg.addColorStop(0, "rgba(255," + Math.round(245 - 150 * u) + "," + Math.round(170 - 170 * u) + "," + (.85 * (1 - u)) + ")"); gg.addColorStop(.5, "rgba(255," + Math.round(120 - 80 * u) + ",20," + (.4 * (1 - u)) + ")"); gg.addColorStop(1, "rgba(200,30,0,0)");
      x.fillStyle = gg; x.beginPath(); x.arc(q.x, q.y, b, 0, 6.29); x.fill(); }
    x.globalCompositeOperation = "source-over";
    // 4) kül pulları: kıvrılarak savrulur; bazılarının kenarı hâlâ kor
    // (performans: maketteki save/translate/rotate/scale/restore yerine AYNI matris tek setTransform ile; renk alfası globalAlpha ile
    //  — düz dolguda rgba alfasıyla piksel olarak aynı)
    var D = t.d;
    for (var c = kul.length - 1; c >= 0; c--) { var p = kul[c]; p.o++; p.vx += .02; p.x += p.vx + Math.sin(p.o * .15 + c) * .5; p.y += p.vy; p.vy *= .99; p.d += p.dv;
      var a2 = 1 - p.o / p.om; if (a2 <= 0) { kul.splice(c, 1); continue; }
      var cs = Math.cos(p.d), sn = Math.sin(p.d), sy = .55 + .45 * Math.abs(Math.cos(p.o * .2));
      x.setTransform(D * cs, D * sn, -D * sn * sy, D * cs * sy, D * p.x, D * p.y);   // = scale(D) · translate(p) · rotate(d) · scale(1, sy)
      var ton = 60 + ((c * 37) % 40); x.globalAlpha = a2 * .9; x.fillStyle = KUL_TON[ton - 60]; x.beginPath(); x.moveTo(-p.b, -p.b * .4); x.lineTo(p.b * .7, -p.b * .6); x.lineTo(p.b, p.b * .5); x.lineTo(-p.b * .6, p.b * .6); x.closePath(); x.fill();
      if (p.kor && p.o < 26) { x.fillStyle = "rgb(255,150,50)"; x.fillRect(-.8, -.8, 1.6, 1.6); }
    }
    x.setTransform(D, 0, 0, D, 0, 0); x.globalAlpha = 1;
  });
  return t.c;
}
// Elektrik Akımı v2: şık bir an mavi-beyaz çakar; kenarları elektrik kaplar; arklar köşeler arasında dallanarak sıçrar; kıvılcımlar savrulur
function tuvalElektrik(hedef) {
  var t = sikTuval(hedef, 30), W = t.w, H = t.h, P = 2 * (W + H), kv = [];
  function kn(s) { s = ((s % P) + P) % P; if (s < W) return [t.p + s, t.p]; s -= W; if (s < H) return [t.p + W, t.p + s]; s -= H; if (s < W) return [t.p + W - s, t.p + H]; s -= W; return [t.p, t.p + H - s]; }
  function yol(a, b, sap, d, l) { if (!d) { l.push([a[0], a[1], b[0], b[1]]); return; }
    var m = [(a[0] + b[0]) / 2 + (Math.random() - .5) * sap, (a[1] + b[1]) / 2 + (Math.random() - .5) * sap];
    yol(a, m, sap / 2, d - 1, l); yol(m, b, sap / 2, d - 1, l);
    if (d === 3 && Math.random() < .5) yol(m, [m[0] + (Math.random() - .5) * 30, m[1] + (Math.random() - .5) * 22], sap / 3, 2, l); }
  function ciz(x, l, al, kalin) {
    x.strokeStyle = "rgba(80,170,255," + (.5 * al) + ")"; x.lineWidth = 7 * kalin; x.shadowColor = "#5ab8ff"; x.shadowBlur = 16; x.beginPath(); l.forEach(function (s) { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); }); x.stroke();
    x.shadowBlur = 0; x.strokeStyle = "rgba(235,250,255," + al + ")"; x.lineWidth = 1.8 * kalin; x.beginPath(); l.forEach(function (s) { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); }); x.stroke();
  }
  var arklar = [], son = -100;
  oynatTuval(t, 1000, function (g) {
    var x = t.x, al = g < 800 ? 1 : (1000 - g) / 200; x.lineCap = "round"; x.lineJoin = "round"; x.globalCompositeOperation = "lighter";
    // ilk çakma: şık mavi-beyaz parlar
    if (g < 220) { x.save(); yuvarlakDikdortgen(x, t.p, t.p, W, H, t.r); x.clip(); x.fillStyle = "rgba(170,225,255," + (.75 * (1 - g / 220)) + ")"; x.fillRect(t.p, t.p, W, H); x.restore(); }
    // kenar ışıması
    x.save(); yuvarlakDikdortgen(x, t.p, t.p, W, H, t.r); x.strokeStyle = "rgba(120,200,255," + (.85 * al) + ")"; x.lineWidth = 2.5; x.shadowColor = "#5ab8ff"; x.shadowBlur = 14; x.stroke(); x.restore();
    // kenar boyunca titreşen kısa arklar (her karede yeniden: elektrik hissi)
    for (var b = 0; b < 4; b++) { var bas = Math.random() * P, l = [], q0 = kn(bas), q1 = kn(bas + 24 + Math.random() * 20); yol(q0, q1, 12, 3, l); ciz(x, l, al * (.6 + Math.random() * .4), .8); }
    // köşeden köşeye sıçrayan büyük arklar (~110 ms'de bir yeni)
    if (g - son > 110 && g < 800) { son = g; var c1 = kn(Math.random() * P), c2 = kn(Math.random() * P), l2 = []; yol(c1, c2, 26, 4, l2); arklar.push({ l: l2, o: g });
      for (var s2 = 0; s2 < 5; s2++) kv.push({ x: c2[0], y: c2[1], vx: (Math.random() - .5) * 5, vy: (Math.random() - .8) * 4, o: 0 }); }
    arklar.forEach(function (a) { var d = g - a.o; if (d < 90) ciz(x, a.l, (d < 30 ? 1 : 1 - (d - 30) / 60) * al, 1.1); });
    // kıvılcımlar
    x.shadowBlur = 0;
    for (var k = kv.length - 1; k >= 0; k--) { var p = kv[k]; p.o++; p.x += p.vx; p.y += p.vy; p.vy += .2; var a3 = 1 - p.o / 22; if (a3 <= 0) { kv.splice(k, 1); continue; }
      x.strokeStyle = "rgba(220,245,255," + a3 + ")"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6); x.stroke(); }
    x.globalCompositeOperation = "source-over";
  });
  return t.c;
}

/**
 * İmzayı `hedef` öğede bir kez oynatır; temizleme işlevi döndürür (katman + canvas ANINDA kalkar, rAF durur).
 * Dükkân demosu ve maç ekranları aynı işlevi kullanır.
 */
export function imzaOynat(imza, hedef) {
  const tur = IMZA_TURU[imza];
  if (!tur || !hedef || !hedef.isConnected) return () => {};
  const ogeler = [];
  try {
    if (tur === "yanan") ogeler.push(tuvalYanan(hedef));
    else if (tur === "elektrik") ogeler.push(tuvalElektrik(hedef));
    else {
      const katman = document.createElement("div");
      katman.className = "ci-katman";
      katman.setAttribute("aria-hidden", "true");
      katman.dataset.imza = tur;
      katman.innerHTML = cssIcerik(tur);   // sabit maket şablonu (kullanıcı verisi yok)
      hedef.appendChild(katman);
      ogeler.push(katman);
    }
  } catch (e) {
    console.warn("[Bildim] cevap imzası oynatılamadı:", e?.message ?? e);
  }
  const zaman = setTimeout(() => ogeler.forEach((o) => o.remove()), EN_UZUN_MS);
  return () => { clearTimeout(zaman); ogeler.forEach((o) => o.remove()); };
}

/**
 * Durağan küçük simge (Dükkân listesi, Koleksiyon ızgarası, satın alma onayı): imzanın tek karelik özeti, hareket yok.
 * Asıl görünüm demoda (gerçek bileşen) oynar.
 */
const SIMGE = {
  neon: <path d="M10 24l9 9 17-20" fill="none" stroke="#3dff9e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />,
  yildiz: <polygon points="23,5 27.5,17.6 41,18.3 30.5,26 34,39 23,31.6 12,39 15.5,26 5,18.3 18.5,17.6" fill="#ffc933" />,
  ampul: (
    <g transform="translate(6 2)">
      <path d="M17 2C8.7 2 3 8 3 15.5c0 5.3 3 8.3 5.6 11 1.6 1.7 2.4 3.6 2.4 5.5h12c0-1.9.8-3.8 2.4-5.5 2.6-2.7 5.6-5.7 5.6-11C31 8 25.3 2 17 2z" fill="#fff36b" stroke={K} strokeWidth="2.5" />
      <rect x="11" y="32" width="12" height="4" rx="1" fill="#c9cfe8" stroke={K} strokeWidth="2" />
      <rect x="12" y="36" width="10" height="5" rx="2" fill="#9aa3c8" stroke={K} strokeWidth="2" />
    </g>
  ),
  elektrik: <path d="M26 4L12 26h9l-3 16 15-23h-9l2-15z" fill="#ebfaff" stroke="#5ab8ff" strokeWidth="2.5" strokeLinejoin="round" />,
  yanan: (
    <g>
      <path d="M23 4c2 7 10 11 10 21a10 10 0 0 1-20 0c0-5 3-8 5-10 0 4 2 6 4 6-1-6 0-12 1-17z" fill="#ff9628" />
      <path d="M23 22c1 3 5 5 5 9a5 5 0 0 1-10 0c0-3 2-5 3-6 0 2 1 3 2 3z" fill="#fff0aa" />
    </g>
  ),
};
export function ImzaSimgesi({ anahtar, boyut = 40 }) {
  const tur = IMZA_TURU[anahtar];
  return (
    <span className="ci-simge" data-imza={tur ?? undefined} style={{ width: boyut, height: boyut }} aria-hidden="true">
      <svg viewBox="0 0 46 46" width={Math.round(boyut * 0.78)} height={Math.round(boyut * 0.78)}>{SIMGE[tur] ?? null}</svg>
    </span>
  );
}

/** Hedef ya da atalarında süren SONLU giriş animasyonları (ör. Düello sonuç satırının "damga"sı) — imza onlar bitince başlar. */
function girisAnimasyonlari(hedef) {
  const liste = [];
  try {
    for (let e = hedef; e && e !== document.body; e = e.parentElement) {
      for (const a of e.getAnimations?.() ?? []) {
        const t = a.effect?.getComputedTiming?.();
        if (a.playState === "running" && t && Number.isFinite(t.endTime) && t.iterations !== Infinity) liste.push(a);
      }
    }
  } catch { /* getAnimations yok: hemen oynar */ }
  return liste;
}
const GIRIS_BEKLEME_EN_COK_MS = 800;

export default function CevapImzasi({ imza, kapRef, secici = ".qt-sik-yuva", sira = 0, anahtar = null }) {
  useEffect(() => {
    if (!imza || anahtar == null || !IMZA_TURU[imza]) return undefined;
    const kap = kapRef?.current;
    const hedef = kap ? (kap.matches?.(secici) ? kap : kap.querySelectorAll(secici)[sira ?? 0]) : null;
    // Hedef hâlâ giriş animasyonundaysa (görünmez/ölçeklenmiş) imza onun bitişine kadar bekler — en çok 0,8 sn.
    // Sonucu/sonraki soruyu geciktirmez; yalnız efektin başlangıç anı.
    const anim = hedef ? girisAnimasyonlari(hedef) : [];
    if (anim.length === 0) return imzaOynat(imza, hedef);
    let iptal = false, temizle = null, zaman = null;
    const basla = () => { if (!iptal && !temizle) { clearTimeout(zaman); temizle = imzaOynat(imza, hedef); } };
    zaman = setTimeout(basla, GIRIS_BEKLEME_EN_COK_MS);
    Promise.all(anim.map((a) => a.finished.catch(() => null))).then(basla);
    return () => { iptal = true; clearTimeout(zaman); temizle?.(); };
  }, [imza, anahtar, sira, secici, kapRef]);
  return null;
}
