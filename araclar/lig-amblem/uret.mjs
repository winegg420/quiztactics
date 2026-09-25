// Lig amblemi statik SVG'lerini üretir → public/lig-amblem/<lig>-<boy>.svg  (boy: k = ≤ 28 px küçük çizim, b = normal)
// Kaynak çizim: oyun/tasarim/gorsel-revizyon/a/cizim/lig.jsx › LigAmblemiB (tek kaynak). Ana pakette çizim kodu
// yerine bu küçük dosyalar <img> ile yüklenir (Ida, 25 Eyl 2026: lig amblemi çizimleri ana paketten çıksın).
// Kullanım: node araclar/lig-amblem/uret.mjs   (LigAmblemiB çizimi değişince yeniden çalıştır)
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";

const kok = path.resolve(import.meta.dirname, "..", "..");
const gecici = path.join(os.tmpdir(), "lig-amblem-uret.mjs");
await build({
  stdin: {
    contents: `import { createElement } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { LigAmblemiB } from "./oyun/tasarim/gorsel-revizyon/a/cizim/lig.jsx";
      export const ciz = (lig, boyut) => renderToStaticMarkup(createElement(LigAmblemiB, { lig, boyut }));`,
    resolveDir: kok, loader: "jsx",
  },
  bundle: true, platform: "node", format: "esm", outfile: gecici, jsx: "automatic",
  loader: { ".css": "empty" }, external: [], logLevel: "error",
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  absWorkingDir: kok,
});
const { ciz } = await import(pathToFileURL(gecici).href);
const hedef = path.join(kok, "public", "lig-amblem");
fs.mkdirSync(hedef, { recursive: true });
for (const lig of ["bronz", "gumus", "altin", "elmas", "efsane"]) {
  for (const [ek, boyut] of [["k", 20], ["b", 64]]) {
    const html = ciz(lig, boyut);
    const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
    if (!svg) throw new Error(`svg bulunamadı: ${lig}`);
    const temiz = svg
      .replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"')
      .replace(/ focusable="false"/, "").replace(/ data-ad="[^"]*"/, "")
      .replace(/ style="[^"]*"/g, "");
    fs.writeFileSync(path.join(hedef, `${lig}-${ek}.svg`), temiz);
  }
}
console.log("üretildi:", fs.readdirSync(hedef).join(" "));
