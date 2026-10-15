// Hazine giriş sahnesi ışık katmanı → önceden çizilmiş WEBP (Paket A, 14 Eki 2026).
// kasa-efekt.css › .ks-giris-isik eskiden 680 px repeating-conic-gradient + radial mask ile CANLI çiziliyordu; maskeli
// katman scale/rotate animasyonunda telefonda her karede yeniden boyanıyordu. Bu betik AYNI CSS'i Chrome'da bir kez
// çizer (saydam zemin, opaklık 1, animasyonsuz), 1x çözünürlükte (yumuşak, düşük opaklıklı ışık — telefonda fark edilmez) PNG alır ve Chrome'un webp kodlayıcısıyla
// public/hazine/giris-isik.webp yazar. Görünüm aynı kalır; sahne yalnız transform/opacity oynatır.
//   node araclar/hazine-isik-uret.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
try {
  // --m1 (15 Eki 2026 perf): Klasik/Saf Bilgi/Grup/Düello/Turnuva 3-2-1 ışını (m1-mac.css › .m1-sayim-isin) — AYNI CSS (180vmax
  // kare, repeating-conic-gradient + radial mask) 1571 px'te çizilir; maskenin görünür kısmı (yarıçapın %70'i) kırpılır →
  // 1100 px kare WEBP (kalite 1 = kayıpsız, 46 KB; 0,8 kayıplı kenarları tırtıklıyordu): public/mac/sayim-isin.webp. CSS'te öğe 126vmax (= 180 × 0,7), mask yok, yalnız transform döner.
  if (process.argv.includes("--m1")) {
    const S = 1100 / 0.7, C = 1100;
    const s = await tarayici.newPage({ viewport: { width: Math.ceil(S), height: Math.ceil(S) }, deviceScaleFactor: 1 });
    await s.setContent(`<html><body style="margin:0;background:transparent">
      <div id="i" style="width:${S}px;height:${S}px;border-radius:50%;
        background:repeating-conic-gradient(from 0deg, rgb(255 255 255 / 0.55) 0deg 9deg, rgb(255 255 255 / 0) 9deg 22.5deg);
        -webkit-mask-image:radial-gradient(closest-side, #000 8%, transparent 70%);mask-image:radial-gradient(closest-side, #000 8%, transparent 70%)"></div></body></html>`);
    const png = await s.screenshot({ omitBackground: true, clip: { x: (S - C) / 2, y: (S - C) / 2, width: C, height: C } });
    const webp = await s.evaluate(async ([b64, q]) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      return c.toDataURL("image/webp", q).split(",")[1];
    }, [png.toString("base64"), Number(process.argv[3]) || 1]);
    fs.mkdirSync("public/mac", { recursive: true });
    fs.writeFileSync("public/mac/sayim-isin.webp", Buffer.from(webp, "base64"));
    fs.writeFileSync(".tmp/sayim-isin-kaynak.png", png);
    console.log("public/mac/sayim-isin.webp", Math.round(Buffer.from(webp, "base64").length / 1024), "KB");
  } else {
  const OLCEK = Number(process.argv[2]) || 1, KALITE = Number(process.argv[3]) || 0.75;   // 14 Eki ölçümü: 1x/0,75 = 46 KB, eskiyle ort. piksel farkı 0,22 (ışığın kendisi 2,51)
  const s = await tarayici.newPage({ viewport: { width: 700, height: 700 }, deviceScaleFactor: OLCEK });
  await s.setContent(`<html><body style="margin:0;background:transparent">
    <div id="i" style="width:680px;height:680px;border-radius:50%;
      background:repeating-conic-gradient(rgba(224,161,0,.2) 0 8deg, rgba(224,161,0,0) 8deg 22deg);
      -webkit-mask:radial-gradient(closest-side,#000 18%,transparent 100%);mask:radial-gradient(closest-side,#000 18%,transparent 100%)"></div></body></html>`);
  const png = await s.locator("#i").screenshot({ omitBackground: true });
  const webp = await s.evaluate(async ([b64, KALITE]) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", KALITE).split(",")[1];
  }, [png.toString("base64"), KALITE]);
  fs.writeFileSync("public/hazine/giris-isik.webp", Buffer.from(webp, "base64"));
  console.log("public/hazine/giris-isik.webp", Math.round(Buffer.from(webp, "base64").length / 1024), "KB");
  }
} finally { await tarayici.close(); }
