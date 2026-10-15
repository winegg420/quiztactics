// Bildirim küçük simgesi (badge / Android status-bar small icon): tek renk (beyaz), şeffaf zeminli Q.
// Android yalnız alfa kanalını kullanır; renk önemsizdir. Q = halka + L kuyruk + ok ucu (marka Q'su, favicon ile aynı geometri).
//   node araclar/bildirim-rozet-uret.mjs
// Çıktı: public/quiztactics-q-rozet-96.png (web badge) + android/app/src/main/res/drawable-*/ic_notification_icon.png
import fs from "node:fs";
import zlib from "node:zlib";

const crcTablosu = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = crcTablosu[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const parca = (tur, veri) => {
  const t = Buffer.from(tur);
  const u = Buffer.alloc(4); u.writeUInt32BE(veri.length);
  const k = Buffer.alloc(4); k.writeUInt32BE(crc(Buffer.concat([t, veri])));
  return Buffer.concat([u, t, veri, k]);
};
function png(g, y, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(g, 0); ihdr.writeUInt32BE(y, 4); ihdr[8] = 8; ihdr[9] = 6;
  const ham = Buffer.alloc((g * 4 + 1) * y);
  for (let r = 0; r < y; r++) { ham[r * (g * 4 + 1)] = 0; rgba.copy(ham, r * (g * 4 + 1) + 1, r * g * 4, (r + 1) * g * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), parca("IHDR", ihdr), parca("IDAT", zlib.deflateSync(ham, { level: 9 })), parca("IEND", Buffer.alloc(0))]);
}

// 120×120 tasarım uzayı (favicon): halka merkez (50,50) r=34; kuyruk (72,72)→(72,100)→(94,100); ok ucu.
const segMesafe = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const ucgenIcinde = (px, py, [a, b, c]) => {
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const d1 = s([px, py], a, b), d2 = s([px, py], b, c), d3 = s([px, py], c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const OK = [[117, 100], [94, 82], [94, 118]];
function icinde(x, y) {
  if (Math.abs(Math.hypot(x - 50, y - 50) - 34) <= 11) return true;
  if (segMesafe(x, y, 72, 72, 72, 100) <= 9 || segMesafe(x, y, 72, 100, 94, 100) <= 9) return true;
  return ucgenIcinde(x, y, OK);
}
function uret(boyut) {
  const pay = 0.06, alan = 120 + 6;           // çizim ~[-3..120]; kenar payı
  const buf = Buffer.alloc(boyut * boyut * 4);
  const SS = 4;
  for (let j = 0; j < boyut; j++) for (let i = 0; i < boyut; i++) {
    let say = 0;
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
      const u = (i + (si + 0.5) / SS) / boyut, v = (j + (sj + 0.5) / SS) / boyut;
      const x = (u * (1 + 2 * pay) - pay) * alan - 3, y = (v * (1 + 2 * pay) - pay) * alan - 3;
      if (icinde(x, y)) say++;
    }
    const o = (j * boyut + i) * 4;
    buf[o] = buf[o + 1] = buf[o + 2] = 255;
    buf[o + 3] = Math.round((say / (SS * SS)) * 255);
  }
  return png(boyut, boyut, buf);
}

fs.writeFileSync("public/quiztactics-q-rozet-96.png", uret(96));
const AND = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [d, b] of Object.entries(AND)) fs.writeFileSync(`android/app/src/main/res/drawable-${d}/ic_notification_icon.png`, uret(b));
console.log("rozet simgeleri üretildi");
