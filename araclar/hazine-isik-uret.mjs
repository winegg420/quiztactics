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
} finally { await tarayici.close(); }
