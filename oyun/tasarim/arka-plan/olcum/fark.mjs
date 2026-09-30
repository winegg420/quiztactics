import { chromium } from "playwright-core"; import fs from "node:fs";
const [a, b, i] = process.argv.slice(2);
const br = await chromium.launch(); const p = await br.newPage();
const oku = (f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const r = await p.evaluate(async ([x, y]) => {
  const yukle = async (u) => { const im = await createImageBitmap(await (await fetch(u)).blob()); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
  const A = await yukle(x), B = await yukle(y); if (A.width !== B.width || A.height !== B.height) return "boyut " + A.width + "x" + A.height + " vs " + B.width + "x" + B.height;
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, enBuyuk = 0;
  for (let k = 0; k < A.data.length; k += 4) { const d = Math.max(Math.abs(A.data[k] - B.data[k]), Math.abs(A.data[k + 1] - B.data[k + 1]), Math.abs(A.data[k + 2] - B.data[k + 2])); if (d > 0) { n++; enBuyuk = Math.max(enBuyuk, d); const px = (k / 4) % A.width, py = Math.floor(k / 4 / A.width); x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); } }
  return { farkliPiksel: n, enBuyukFark: enBuyuk, kutu: [x0, y0, x1, y1], boyut: [A.width, A.height] };
}, [oku(`${a}/${i}.png`), oku(`${b}/${i}.png`)]);
console.log(i, JSON.stringify(r)); await br.close();
