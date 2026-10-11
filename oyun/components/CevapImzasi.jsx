/**
 * CEVAP İMZASI (1040, Ida onayı 10 Eki 2026) — oyuncu soruyu DOĞRU cevaplayınca doğru şıkkın üstünde ~0,8–1,3 sn oynayan
 * kişisel efekt. Tek ortak bileşen: Klasik / Saf Bilgi / Grup / Turnuva / Hatalarım (QuestionCard), Ortak Hazine (KasaPage),
 * ve Dükkân demosu aynısını kullanır. Düello v4'te OYNAMAZ (Ida, 10 Eki 2026: sonuç penceresinde güzel durmuyor).
 *
 * KURALLAR (Ida): imzayı YALNIZ oyuncunun kendisi görür — sunucuya / Realtime'a hiçbir şey gitmez, takılı imza yalnız
 * kendi profilinden okunur (useTakiliImza). Yeni ses yok. Süre / puan / soru etkilenmez. Tıklamayı engellemez
 * (pointer-events: none), sonucu geciktirmez; `anahtar` değişince ya da bileşen kalkınca efekt ANINDA temizlenir (katman
 * ve canvas kaldırılır → rAF bir sonraki karede durur). "Hareketi azalt" sürümü yok (Ida kararı).
 *
 * GÖRSEL KAYNAK: docs/cevap-imzasi-referans.txt — maketteki kodun birebiri. Neon Tik CSS (cevap-imzasi.css); Elektrik Akımı
 * canvas (renk, süre, parçacık kuralları aynen). Yıldız Patlaması ve Bilgi Ampulü v3 (11 Eki 2026): canvas, kaynak
 * docs/cevap-imzasi-v3-maket.html. Yanan Kart DONDURULDU (11 Eki 2026) — kod durur, oynamaz. Tek uyarlama: canvas'ın şık şekline
 * kırpma yarıçapı maketteki sabit 9 px yerine hedef şıkkın GERÇEK köşe yarıçapı (okunamazsa 9) — kor/kömür şıkkın
 * dışına taşmasın diye; maketin şıkları 9 px idi.
 *
 * Kullanım: <CevapImzasi imza={anahtar} kapRef={ref} secici=".qt-sik-yuva" sira={dogruIndex} anahtar={soruAnahtari} />
 *   imza   — kozmetik anahtarı (imza_neon_tik …); null → hiçbir şey olmaz
 *   kapRef — doğru şıkkı içeren kapsayıcı; secici + sira ile hedef öğe bulunur (position: relative olmalı)
 *   anahtar — oynatma anahtarı: null → oynamaz; her yeni değer bir kez oynatır (Dükkân demosunda "Tekrar oynat")
 */
import { useEffect, useLayoutEffect } from "react";
import "../tasarim/ekranlar/cevap-imzasi.css";

/** Kozmetik anahtarı → maketteki imza kimliği. Bilinmeyen anahtar oynamaz. */
export const IMZA_TURU = {
  imza_neon_tik: "neon",
  imza_yildiz: "yildiz",
  imza_ampul: "ampul",
  imza_elektrik: "elektrik",
  imza_yanan_kart: "yanan",
};
/** DONDURULMUŞ imzalar (oynamaz, satılmaz — sunucuda kalem kapalı). Yanan Kart: 11 Eki 2026, Ida ("alevi iptal et, dondur"). */
const DONDURULAN = new Set(["yanan"]);
/** Bir imzanın en uzun süresi (ms) — Bilgi Ampulü v3 1400 ms. Canvas imzaları bitince kendileri kalkar; güvenlik
 *  zamanlayıcısı buna küçük bir pay ekler (yavaş cihazda kare süresi 50 ms'de kırpıldığı için animasyon saatten geri kalabilir). */
const EN_UZUN_MS = 1400;
const GUVENLIK_PAYI_MS = 400;

// ---------- SVG sabitleri (maket) ----------
const K = "#1d2152";   // ampul konturu (maketteki K; proje laciverti --qt-metin)
const TIK = '<svg viewBox="0 0 46 46" class="neon-tik" aria-hidden="true"><path d="M10 24l9 9 17-20"/></svg>';

/** CSS imzalarının katman içeriği (yalnız Neon Tik; Yıldız ve Ampul v3'ten beri canvas). */
function cssIcerik(tur) {
  return tur === "neon" ? '<div class="neon-halka"></div>' + TIK : "";
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
/* ============================================================
   DONDURULMUŞ — Yanan Kart (imza_yanan_kart), 11 Eki 2026 · Cevap İmzası v3 · Ida: "alevi iptal et, dondur".
   Oynamaz: imzaOynat DONDURULAN'ı atlar, useTakiliImza null döndürür. Satılmaz / takılmaz: kalem kapalı
   (kozmetikler.aktif = false, satis_pasif = true; migration 1067), takılı olanlar null'a çekildi. Sahiplik kayıtları DURUR.
   Geri açma: kalemi aktif + satis_pasif = false yap (yeni migration), DONDURULAN'dan "yanan"ı çıkar,
   lib/cevapImzasi.js › DONDURULAN_IMZALAR'dan anahtarı çıkar. Kod aşağıda olduğu gibi duruyor.
   ============================================================ */
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

// ================= CEVAP İMZASI v3 (Ida onayı 11 Eki 2026) — Yıldız Patlaması · Bilgi Ampulü =================
// GÖRSEL KAYNAK: docs/cevap-imzasi-v3-maket.html › yildizV3 / ampulV3 ve yardımcıları (hap, rnd, geriYay, cikis, yildizYol,
// piril, CAM / TEL / telCiz). Renk, süre, parçacık sayısı, hareket ve katman sırası BİREBİR. Uyarlamalar (görünüm aynı):
// - Maket tek sahne canvas'ı kullanır; burada hedef şıkkın (.qt-sik-yuva) etrafına taşma paylı canvas açılır ve koordinatlar
//   maketteki kutu(R) mantığıyla şıkka göre çevrilir. Pay ekran kenarıyla sınırlı (maketteki sahne kırpması gibi) → yatay
//   kaydırma / sayfa uzaması olmaz.
// - Maketteki "hiz" (yavaşlatma) taşınmadı (hiz = 1). Şık kırpma yarıçapı şıkkın gerçek köşe yarıçapı (maket: min(30, h/2)).
/** Canvas'ın taşabileceği alan: ekran ∩ overflow'u görünür olmayan ataların kutusu (eksen eksen). Pay bununla sınırlanır →
 *  kırpan ata canvas'ı kesmez, kaydırma kabında taşma (kaydırma çubuğu / sayfa uzaması) oluşmaz. */
function kirpmaSiniri(hedef) {
  const s = { l: 0, t: 0, r: document.documentElement.clientWidth || window.innerWidth, b: window.innerHeight };
  for (let e = hedef.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
    const a = e.getBoundingClientRect();
    if (cs.overflowX !== "visible") { s.l = Math.max(s.l, a.left); s.r = Math.min(s.r, a.right); }
    if (cs.overflowY !== "visible") { s.t = Math.max(s.t, a.top); s.b = Math.min(s.b, a.bottom); }
  }
  return s;
}
function v3Tuval(hedef, pay) {
  const sik = hedef.querySelector(":scope > .qt-sik") ?? hedef;
  const d = Math.min(2, window.devicePixelRatio || 1);
  const hr = hedef.getBoundingClientRect(), sr = sik.getBoundingClientRect();
  const s = kirpmaSiniri(hedef);
  const sol = Math.max(0, Math.min(pay.yan, Math.floor(hr.left - s.l))), sag = Math.max(0, Math.min(pay.yan, Math.floor(s.r - hr.right)));
  const ust = Math.max(0, Math.min(pay.ust, Math.floor(hr.top - s.t))), alt = Math.max(0, Math.min(pay.alt, Math.floor(s.b - hr.bottom)));
  const w = hedef.offsetWidth + sol + sag, h = hedef.offsetHeight + ust + alt;
  const c = document.createElement("canvas");
  c.width = Math.round(w * d); c.height = Math.round(h * d);
  c.style.cssText = "position:absolute;left:" + (-sol) + "px;top:" + (-ust) + "px;width:" + w + "px;height:" + h + "px;pointer-events:none;z-index:4";
  c.className = "ci-tuval";
  c.setAttribute("aria-hidden", "true");
  hedef.appendChild(c);
  const sw = sik.offsetWidth || sr.width, sh = sik.offsetHeight || sr.height;
  // şıkkın konumu (giriş "pop" ölçeğinden bağımsız: merkezden, ölçeksiz boyutla)
  const R = { x: sol + (sr.left + sr.width / 2 - hr.left) - sw / 2, y: ust + (sr.top + sr.height / 2 - hr.top) - sh / 2, w: sw, h: sh, r: koseYaricapi(hedef) };
  return { c: c, x: c.getContext("2d"), w: w, h: h, d: d, R: R };
}
/** Maketteki calistir (hiz = 1): kare süresi 50 ms'de kırpılır, dt 60 fps'e göre ölçeklenir. Bitince canvas kalkar. */
function calistirV3(T, sure, kare) {
  var bas = null, onceki = null, g = 0, D = T.d;
  function adim(t) {
    if (!T.c.isConnected) return;
    if (bas === null) { bas = t; onceki = t; }
    var dt = Math.min(50, t - onceki); onceki = t; g += dt;
    T.x.setTransform(D, 0, 0, D, 0, 0); T.x.clearRect(0, 0, T.w, T.h);
    if (g < sure) { kare(T.x, g, dt / 16.667); requestAnimationFrame(adim); }
    else T.c.remove();
  }
  requestAnimationFrame(adim);
}
function rnd(a, b) { return a + Math.random() * (b - a); }
function geriYay(p) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
function cikis(p) { return 1 - Math.pow(1 - p, 3); }
function hap(x, R) { yuvarlakDikdortgen(x, R.x, R.y, R.w, R.h, R.r); }
function yildizYol(x, R, ic, kose) { kose = kose || 5; x.beginPath(); for (var i = 0; i < kose * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / kose, r = i % 2 ? R * ic : R; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
function piril(x, px, py, boy, al, renk) {   // dört köşeli pırıltı (✦)
  x.save(); x.translate(px, py); x.globalAlpha = al;
  var g = x.createRadialGradient(0, 0, 0, 0, 0, boy * 1.6); g.addColorStop(0, renk); g.addColorStop(1, "rgba(255,230,140,0)");
  x.fillStyle = g; x.beginPath(); x.arc(0, 0, boy * 1.6, 0, 6.283); x.fill();
  x.fillStyle = "#fff"; x.beginPath();
  x.moveTo(0, -boy); x.quadraticCurveTo(boy * .12, -boy * .12, boy, 0); x.quadraticCurveTo(boy * .12, boy * .12, 0, boy);
  x.quadraticCurveTo(-boy * .12, boy * .12, -boy, 0); x.quadraticCurveTo(-boy * .12, -boy * .12, 0, -boy); x.fill();
  x.restore();
}

// ---- YILDIZ PATLAMASI v3 (Nadir) — 1150 ms ----
const YILDIZ_PAY = { ust: 130, alt: 130, yan: 130 };
// PERFORMANS (4× CPU ölçümü, RAPOR-cevap-imzasi-v3.md): maket her yıldız ve pırıltı için her karede radyal gradyan kurar
// (16 yıldız × 2 + pırıltılar). Burada aynı çizimler 1 px boy adımlarıyla BİR KEZ küçük tuvallere çizilir ve kesin boya
// ölçeklenerek basılır. Maketteki her katman AYRI resimdir (gövde dolgusu · kontur · parlak nokta · hale; pırıltıda ışıma ·
// beyaz yıldızcık) ve aynı sırayla, aynı saydamlık ve karışımla basılır → üst üste binme ve "lighter" toplaması maketle aynı.
const SPRITE = new Map();
function sprite(anahtar, yaricap, d, ciz) {
  var s = SPRITE.get(anahtar);
  if (s) return s;
  var n = Math.ceil((yaricap + 2) * 2 * d), c = document.createElement("canvas"); c.width = n; c.height = n;
  var x = c.getContext("2d"); x.setTransform(d, 0, 0, d, n / 2, n / 2); ciz(x);
  s = { c: c, r: n / (2 * d) };
  SPRITE.set(anahtar, s);
  return s;
}
/** Resmi (0,0) merkezli basar; k: kesin boy / resim boyu. */
function spriteBas(x, s, k) { x.drawImage(s.c, -s.r * k, -s.r * k, s.r * 2 * k, s.r * 2 * k); }
function yildizKatmanlari(B, d) {   // B: tam sayı boy (px) — maketteki gövde çizimi, katman katman
  return {
    dolgu: sprite("yd" + B + "@" + d, B, d, function (x) { var gg = x.createRadialGradient(-B * .2, -B * .3, 0, 0, 0, B); gg.addColorStop(0, "#fffbe6"); gg.addColorStop(.38, "#ffd84a"); gg.addColorStop(1, "#e89400"); yildizYol(x, B, .46); x.fillStyle = gg; x.fill(); }),
    kontur: sprite("yk" + B + "@" + d, B + 1, d, function (x) { yildizYol(x, B, .46); x.lineWidth = Math.max(1, B * .11); x.strokeStyle = "#a35f00"; x.stroke(); }),
    nokta: sprite("yn" + B + "@" + d, B, d, function (x) { x.fillStyle = "#fff"; x.beginPath(); x.ellipse(-B * .22, -B * .32, B * .16, B * .09, -.6, 0, 6.283); x.fill(); }),
    hale: sprite("yh" + B + "@" + d, B * 2.3, d, function (x) { var hg = x.createRadialGradient(0, 0, 0, 0, 0, B * 2.3); hg.addColorStop(0, "rgba(255,220,110,.5)"); hg.addColorStop(1, "rgba(255,170,30,0)"); x.fillStyle = hg; x.beginPath(); x.arc(0, 0, B * 2.3, 0, 6.283); x.fill(); }),
  };
}
function pirilKatmanlari(b, d, renk) {   // b: tam sayı boy (px) — maketteki piril(), katman katman (globalAlpha hariç)
  return {
    isik: sprite("pi" + b + renk + "@" + d, b * 1.6, d, function (x) { var g = x.createRadialGradient(0, 0, 0, 0, 0, b * 1.6); g.addColorStop(0, renk); g.addColorStop(1, "rgba(255,230,140,0)"); x.fillStyle = g; x.beginPath(); x.arc(0, 0, b * 1.6, 0, 6.283); x.fill(); }),
    yildiz: sprite("pb" + b + "@" + d, b, d, function (x) { x.fillStyle = "#fff"; x.beginPath();
      x.moveTo(0, -b); x.quadraticCurveTo(b * .12, -b * .12, b, 0); x.quadraticCurveTo(b * .12, b * .12, 0, b);
      x.quadraticCurveTo(-b * .12, b * .12, -b, 0); x.quadraticCurveTo(-b * .12, -b * .12, 0, -b); x.fill(); }),
  };
}
/** piril() ile aynı çizim, önbellekli katmanlardan (x, D: tuvalin ölçeği). */
function pirilHizli(x, D, px, py, boy, al, renk) {
  if (!(boy > 0) || !(al > 0)) return;
  var bq = Math.max(1, Math.round(boy)), k = boy / bq, P = pirilKatmanlari(bq, D, renk);
  x.setTransform(D, 0, 0, D, D * px, D * py); x.globalAlpha = al;
  spriteBas(x, P.isik, k); spriteBas(x, P.yildiz, k);
  x.setTransform(D, 0, 0, D, 0, 0); x.globalAlpha = 1;
}
function tuvalYildiz(hedef) {
  var T = v3Tuval(hedef, YILDIZ_PAY), R = T.R, D = T.d, cx = R.x + R.w * .5, cy = R.y + R.h * .5;
  var yildizlar = [], toz = [], piriltilar = [], i, a, v;
  for (i = 0; i < 16; i++) {
    a = (i / 16) * 6.283 + rnd(-.18, .18); v = rnd(4.2, 8.2);
    yildizlar.push({ x: cx + Math.cos(a) * 8, y: cy + Math.sin(a) * 4, vx: Math.cos(a) * v * 1.55, vy: Math.sin(a) * v * .9 - 1.2,
      b: rnd(7, 15), d: rnd(0, 6.28), dv: rnd(-.18, .18), om: rnd(640, 980), gec: rnd(0, 70), tw: rnd(0, 6.28) });
  }
  for (i = 0; i < 44; i++) { a = rnd(0, 6.283); v = rnd(2.5, 9.5);
    toz.push({ x: cx, y: cy, vx: Math.cos(a) * v * 1.5, vy: Math.sin(a) * v * .85 - .8, b: rnd(1, 2.2), om: rnd(280, 640), sari: Math.random() < .6 }); }
  for (i = 0; i < 9; i++) {
    var k = Math.random() < .5 ? R.y + rnd(-14, -2) : R.y + R.h + rnd(4, 18);
    piriltilar.push({ x: R.x + rnd(.05, .95) * R.w, y: Math.random() < .3 ? cy + rnd(-10, 10) : k, bas: 240 + i * 75, om: rnd(380, 520), b: rnd(5, 9) });
  }
  // önbelleği ilk karelerden önce doldur (oturumda bir kez): yıldız boyu en çok 15 × geriYay tepe (~1,1), pırıltı en çok 9
  for (i = 1; i <= 17; i++) yildizKatmanlari(i, D);
  for (i = 1; i <= 9; i++) pirilKatmanlari(i, D, "rgba(255,226,120,.9)");
  calistirV3(T, 1150, function (x, g, dt) {
    // 1) şık parlaması + üstünden süzülen ışık bandı (şık şekline kırpılı)
    x.save(); hap(x, R); x.clip(); x.globalCompositeOperation = "lighter";
    if (g < 240) { x.fillStyle = "rgba(255,248,210," + (.55 * (1 - g / 240)) + ")"; x.fillRect(R.x, R.y, R.w, R.h); }
    if (g < 460) { var p = cikis(g / 460), bx = R.x - 70 + (R.w + 140) * p;
      var sg = x.createLinearGradient(bx - 40, 0, bx + 40, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(.5, "rgba(255,255,255,.75)"); sg.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = sg; x.setTransform(D, 0, -D * .35, D, D * .35 * cy, 0); x.fillRect(bx - 40, R.y - 10, 80, R.h + 20); }
    x.restore();
    x.globalCompositeOperation = "lighter";
    // 2) merkez ışıma
    if (g < 320) { var fp = g / 320, fr = 18 + cikis(fp) * 95, fa = Math.pow(1 - fp, 1.4);
      var fg = x.createRadialGradient(cx, cy, 0, cx, cy, fr); fg.addColorStop(0, "rgba(255,255,245," + fa + ")"); fg.addColorStop(.3, "rgba(255,214,90," + fa * .7 + ")"); fg.addColorStop(1, "rgba(255,170,30,0)");
      x.fillStyle = fg; x.beginPath(); x.arc(cx, cy, fr, 0, 6.283); x.fill(); }
    // 3) altın şok halkası (şık enine basık)
    if (g < 520) { var hp = cikis(g / 520), hr = 14 + hp * 125, ha = 1 - g / 520;
      x.lineWidth = 6 * ha + .8; x.strokeStyle = "rgba(255,206,70," + ha * .9 + ")"; x.beginPath(); x.ellipse(cx, cy, hr * 1.3, hr * .62, 0, 0, 6.283); x.stroke();
      x.lineWidth = 1.6; x.strokeStyle = "rgba(255,255,255," + ha * .8 + ")"; x.beginPath(); x.ellipse(cx, cy, hr * 1.22, hr * .56, 0, 0, 6.283); x.stroke(); }
    // 4) parıltı tozu (iz çizgili)
    for (var t = 0; t < toz.length; t++) { var q = toz[t]; var u = g / q.om; if (u >= 1) continue;
      q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(.92, dt); q.vy = q.vy * Math.pow(.92, dt) + .08 * dt;
      var al = 1 - u; x.strokeStyle = q.sari ? "rgba(255,210,80," + al + ")" : "rgba(255,255,255," + al + ")"; x.lineWidth = q.b; x.lineCap = "round";
      x.beginPath(); x.moveTo(q.x, q.y); x.lineTo(q.x - q.vx * 2.2, q.y - q.vy * 2.2); x.stroke(); }
    // 5) hacimli yıldızlar
    for (var s = 0; s < yildizlar.length; s++) { var y = yildizlar[s]; if (g < y.gec) continue;
      var yu = (g - y.gec) / y.om; if (yu >= 1) continue;
      y.x += y.vx * dt; y.y += y.vy * dt; y.vx *= Math.pow(.925, dt); y.vy = y.vy * Math.pow(.925, dt) + .11 * dt; y.d += y.dv * dt;
      var olc = yu < .14 ? geriYay(yu / .14) : 1 - Math.pow((yu - .14) / .86, 2) * .75, ya = yu < .65 ? 1 : 1 - (yu - .65) / .35;
      ya *= .82 + .18 * Math.sin(g * .045 + y.tw);
      var B = y.b * olc;
      if (!(B > 0)) continue;
      // iz
      x.globalCompositeOperation = "lighter"; x.strokeStyle = "rgba(255,190,50," + ya * .45 + ")"; x.lineWidth = B * .5; x.lineCap = "round";
      x.beginPath(); x.moveTo(y.x, y.y); x.lineTo(y.x - y.vx * 3.2, y.y - y.vy * 3.2); x.stroke();
      // hale (önbellekli: merkez alfası .5 × ya = globalAlpha ya)
      var Bq = Math.max(1, Math.round(B)), kB = B / Bq, Y = yildizKatmanlari(Bq, D), cs = Math.cos(y.d), sn = Math.sin(y.d);
      x.setTransform(D, 0, 0, D, D * y.x, D * y.y); x.globalAlpha = ya; spriteBas(x, Y.hale, kB);
      // gövde (normal karışım: dolu, okunur) — dolgu, kontur, parlak nokta; maketteki sıra ve alfa
      x.globalCompositeOperation = "source-over"; x.setTransform(D * cs, D * sn, -D * sn, D * cs, D * y.x, D * y.y);   // = translate · rotate(d)
      spriteBas(x, Y.dolgu, kB); spriteBas(x, Y.kontur, kB);
      x.globalAlpha = ya * .9; spriteBas(x, Y.nokta, kB);
      x.setTransform(D, 0, 0, D, 0, 0); x.globalAlpha = 1; }
    // 6) sönen pırıltılar
    x.globalCompositeOperation = "lighter";
    for (var p2 = 0; p2 < piriltilar.length; p2++) { var pr = piriltilar[p2]; var pu = (g - pr.bas) / pr.om; if (pu < 0 || pu >= 1) continue;
      pirilHizli(x, D, pr.x, pr.y, pr.b * Math.sin(pu * Math.PI), Math.sin(pu * Math.PI), "rgba(255,226,120,.9)"); }
    x.globalCompositeOperation = "source-over";
  });
  return T.c;
}

// ---- BİLGİ AMPULÜ v3 (Epik) — 1400 ms ----
const AMPUL_PAY = { ust: 160, alt: 80, yan: 130 };
const CAM_YOL = "M17 2C8.7 2 3 8 3 15.5c0 5.3 3 8.3 5.6 11 1.6 1.7 2.4 3.6 2.4 5.5h12c0-1.9.8-3.8 2.4-5.5 2.6-2.7 5.6-5.7 5.6-11C31 8 25.3 2 17 2z";
let CAM = null;   // Path2D — ilk kullanımda (sunucu tarafı / eski tarayıcıda modül yüklenirken patlamasın)
const TEL = [[13.2, 32], [13.2, 24], [14.4, 20.5], [15.6, 23.5], [17, 20.2], [18.4, 23.5], [19.6, 20.5], [20.8, 24], [20.8, 32]];
function telCiz(x, oran) { var top = 0, uz = [], i; for (i = 1; i < TEL.length; i++) { var d = Math.hypot(TEL[i][0] - TEL[i - 1][0], TEL[i][1] - TEL[i - 1][1]); uz.push(d); top += d; }
  var kalan = top * oran; x.beginPath(); x.moveTo(TEL[0][0], TEL[0][1]);
  for (i = 1; i < TEL.length && kalan > 0; i++) { var f = Math.min(1, kalan / uz[i - 1]); x.lineTo(TEL[i - 1][0] + (TEL[i][0] - TEL[i - 1][0]) * f, TEL[i - 1][1] + (TEL[i][1] - TEL[i - 1][1]) * f); kalan -= uz[i - 1]; } x.stroke(); }
function tuvalAmpul(hedef) {
  CAM = CAM ?? new Path2D(CAM_YOL);
  var T = v3Tuval(hedef, AMPUL_PAY), R = T.R, S = 1.4, BH = 44 * S;
  var hedefX = R.x + R.w * .74, hedefY = R.y - BH * .62, baslaY = R.y + R.h * .5 - BH * .5;
  var YAN = 400, BIT = 1400;
  var piriltilar = [], zerre = [], i;
  for (i = 0; i < 8; i++) { var a = -Math.PI / 2 + (i - 3.5) * .42; piriltilar.push({ a: a, r: rnd(44, 66), bas: YAN + 40 + i * 55, om: rnd(360, 460), b: rnd(5, 8.5) }); }
  for (i = 0; i < 14; i++) zerre.push({ x: rnd(-14, 14), y: rnd(-4, 10), vy: rnd(-1.1, -.5), vx: rnd(-.35, .35), bas: YAN + 60 + i * 35, om: rnd(500, 750), b: rnd(1.3, 2.6) });
  calistirV3(T, BIT, function (x, g, dt) {
    var cik = g < 330 ? geriYay(g / 330) : 1, olc = .35 + .65 * Math.min(1, cik);
    var son = g > 1080 ? (g - 1080) / (BIT - 1080) : 0, gAl = 1 - son;
    var by = baslaY + (hedefY - baslaY) * cik - son * 12;
    var merkX = hedefX, merkY = by + 16 * S * olc;          // camın ışık merkezi
    var yandi = g >= YAN, yp = yandi ? (g - YAN) : 0;
    // A) şıkka vuran sıcak ışık (kırpılı)
    if (yandi && yp < 620) { var k = yp < 80 ? yp / 80 : 1 - (yp - 80) / 540;
      x.save(); hap(x, R); x.clip(); x.globalCompositeOperation = "lighter";
      var lg = x.createRadialGradient(merkX, R.y - 6, 4, merkX, R.y - 6, R.w * .55); lg.addColorStop(0, "rgba(255,236,150," + .32 * k + ")"); lg.addColorStop(1, "rgba(255,200,60,0)");
      x.fillStyle = lg; x.fillRect(R.x, R.y, R.w, R.h); x.restore(); }
    x.globalCompositeOperation = "lighter";
    // B) dönen ışık huzmeleri
    if (yandi) { var ra = (yp < 90 ? yp / 90 : 1) * gAl * (g > 980 ? Math.max(0, 1 - (g - 980) / 420) : 1);
      x.save(); x.translate(merkX, merkY); x.rotate(yp * .00055);
      var rg = x.createRadialGradient(0, 0, 8, 0, 0, 120); rg.addColorStop(0, "rgba(255,240,160," + .55 * ra + ")"); rg.addColorStop(1, "rgba(255,210,80,0)");
      x.fillStyle = rg; x.beginPath();
      for (var r = 0; r < 12; r++) { var aa = r * Math.PI / 6, gen = r % 2 ? .07 : .11, boy = r % 2 ? 92 : 122; x.moveTo(0, 0); x.lineTo(Math.cos(aa - gen) * boy, Math.sin(aa - gen) * boy); x.lineTo(Math.cos(aa + gen) * boy, Math.sin(aa + gen) * boy); x.closePath(); }
      x.fill(); x.restore();
      // hale
      var hg = x.createRadialGradient(merkX, merkY, 0, merkX, merkY, 50); hg.addColorStop(0, "rgba(255,236,140," + .6 * gAl + ")"); hg.addColorStop(1, "rgba(255,200,60,0)");
      x.fillStyle = hg; x.beginPath(); x.arc(merkX, merkY, 50, 0, 6.283); x.fill(); }
    // C) "tık" parlaması
    if (yandi && yp < 340) { var fp = yp / 340, fr = 30 + cikis(fp) * 120, fa = Math.pow(1 - fp, 1.6);
      var fg = x.createRadialGradient(merkX, merkY, 0, merkX, merkY, fr); fg.addColorStop(0, "rgba(255,255,255," + fa + ")"); fg.addColorStop(.35, "rgba(255,240,170," + fa * .6 + ")"); fg.addColorStop(1, "rgba(255,220,100,0)");
      x.fillStyle = fg; x.beginPath(); x.arc(merkX, merkY, fr, 0, 6.283); x.fill(); }
    x.globalCompositeOperation = "source-over";
    // D) ampul gövdesi
    x.save(); x.globalAlpha = gAl; x.translate(hedefX, by + BH * .5 * (1 - olc)); x.scale(S * olc, S * olc); x.translate(-17, 0);
    var cg;
    if (yandi) { cg = x.createRadialGradient(17, 15, 1, 17, 16, 17); cg.addColorStop(0, "#ffffff"); cg.addColorStop(.35, "#fff6a8"); cg.addColorStop(.8, "#ffd23f"); cg.addColorStop(1, "#ffb300"); }
    else { cg = x.createLinearGradient(5, 2, 29, 30); cg.addColorStop(0, "#ffffff"); cg.addColorStop(1, "#d9e6fb"); }
    x.fillStyle = cg; x.fill(CAM); x.lineWidth = 2.4; x.strokeStyle = K; x.lineJoin = "round"; x.stroke(CAM);
    // tel
    x.lineCap = "round"; x.lineJoin = "round";
    if (g > 200) { var to = Math.min(1, (g - 200) / 180);
      if (yandi) { x.save(); x.globalCompositeOperation = "lighter"; x.lineWidth = 3.4; x.strokeStyle = "rgba(255,170,40,.75)"; telCiz(x, 1); x.restore(); x.lineWidth = 1.5; x.strokeStyle = "#fffbe0"; telCiz(x, 1); }
      else { x.lineWidth = 1.5; x.strokeStyle = "rgba(255," + Math.round(90 + 110 * to) + ",40," + (.5 + .5 * to) + ")"; telCiz(x, to); } }
    // cam parlaklığı
    x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 2.2; x.beginPath(); x.arc(17, 15.5, 9.5, Math.PI * 1.08, Math.PI * 1.42); x.stroke();
    // duy (metal)
    var mg = x.createLinearGradient(11, 0, 23, 0); mg.addColorStop(0, "#8f98bf"); mg.addColorStop(.45, "#eef1fb"); mg.addColorStop(1, "#7c86b0");
    x.fillStyle = mg; x.lineWidth = 2; x.strokeStyle = K;
    x.beginPath(); if (x.roundRect) x.roundRect(11, 32, 12, 4, 1); else x.rect(11, 32, 12, 4); x.fill(); x.stroke();
    x.beginPath(); if (x.roundRect) x.roundRect(12, 36, 10, 5, 2); else x.rect(12, 36, 10, 5); x.fill(); x.stroke();
    x.restore();
    // E) pırıltılar + yükselen fikir zerreleri
    x.globalCompositeOperation = "lighter";
    for (var p = 0; p < piriltilar.length; p++) { var pr = piriltilar[p], pu = (g - pr.bas) / pr.om; if (pu < 0 || pu >= 1) continue;
      piril(x, merkX + Math.cos(pr.a) * pr.r * 1.15, merkY + Math.sin(pr.a) * pr.r * .85, pr.b * Math.sin(pu * Math.PI), Math.sin(pu * Math.PI) * gAl, "rgba(255,230,130,.85)"); }
    for (var z = 0; z < zerre.length; z++) { var q = zerre[z], zu = (g - q.bas) / q.om; if (zu < 0 || zu >= 1) continue;
      q.x += q.vx * dt; q.y += q.vy * dt; var za = Math.sin(zu * Math.PI) * gAl;
      var zg = x.createRadialGradient(merkX + q.x, merkY + q.y, 0, merkX + q.x, merkY + q.y, q.b * 3); zg.addColorStop(0, "rgba(255,245,190," + za + ")"); zg.addColorStop(1, "rgba(255,200,60,0)");
      x.fillStyle = zg; x.beginPath(); x.arc(merkX + q.x, merkY + q.y, q.b * 3, 0, 6.283); x.fill(); }
    x.globalCompositeOperation = "source-over";
  });
  return T.c;
}

/**
 * İmzayı `hedef` öğede bir kez oynatır; temizleme işlevi döndürür (katman + canvas ANINDA kalkar, rAF durur).
 * Dükkân demosu ve maç ekranları aynı işlevi kullanır.
 */
export function imzaOynat(imza, hedef) {
  const tur = IMZA_TURU[imza];
  if (!tur || DONDURULAN.has(tur) || !hedef || !hedef.isConnected) return () => {};
  const ogeler = [];
  try {
    if (tur === "yildiz") ogeler.push(tuvalYildiz(hedef));
    else if (tur === "ampul") ogeler.push(tuvalAmpul(hedef));
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
  const zaman = setTimeout(() => ogeler.forEach((o) => o.remove()), EN_UZUN_MS + GUVENLIK_PAYI_MS);
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

function hedefBul(kapRef, secici, sira) {
  const kap = kapRef?.current;
  return kap ? (kap.matches?.(secici) ? kap : kap.querySelectorAll(secici)[sira ?? 0]) : null;
}

export default function CevapImzasi({ imza, kapRef, secici = ".qt-sik-yuva", sira = 0, anahtar = null }) {
  // Neon Tik kendi tikini çizer → o şıkkın normal tik işareti (.qt-sik-isaret) gizlenir (visibility: hidden — yer korunur,
  // rakip avatarı ve şık düzeni kaymaz; cevap-imzasi.css). Boyamadan ÖNCE (layout effect) konur ki iki tik bir kare bile
  // üst üste görünmesin; soru değişince / bileşen kalkınca kalkar. Diğer imzalarda ve imzasız oyuncuda normal tik aynen.
  useLayoutEffect(() => {
    if (IMZA_TURU[imza] !== "neon" || anahtar == null) return undefined;
    const hedef = hedefBul(kapRef, secici, sira);
    if (!hedef) return undefined;
    hedef.setAttribute("data-ci-tik-gizli", "");
    return () => hedef.removeAttribute("data-ci-tik-gizli");
  }, [imza, anahtar, sira, secici, kapRef]);
  useEffect(() => {
    if (!imza || anahtar == null || !IMZA_TURU[imza]) return undefined;
    const hedef = hedefBul(kapRef, secici, sira);
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
