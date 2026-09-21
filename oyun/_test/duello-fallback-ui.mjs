import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const adres = process.env.UI_ADRES ?? "http://127.0.0.1:5173";
const oturum = fileURLToPath(new URL("../../.arayuz-denetim-oturum.json", import.meta.url));
if (!existsSync(oturum)) throw new Error("Önce arayüz denetimiyle test oturumu oluşturulmalı");

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ storageState: oturum, viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem("bildim_duello_tanitim_v1", "1"));
  const page = await context.newPage();
  const konsol = [];
  page.on("console", (m) => { if (m.type() === "error") konsol.push(m.text()); });
  await page.goto(`${adres}/duello`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  if (/\/duello\/[0-9a-f-]{20,}/.test(page.url())) {
    console.log(JSON.stringify({ basarili: true, mevcut_maca_yonlendirildi: true, adres: page.url(), konsol_hatasi: konsol }, null, 2));
    process.exitCode = 0;
    await context.close();
    await browser.close();
    process.exit();
  }
  const rakipAra=page.getByRole("button", { name: /Rakip ara/i });
  if (!(await rakipAra.count())) {
    console.log(JSON.stringify({ basarili:false, adres:page.url(), ekran:(await page.locator("body").innerText()).slice(0,1200), konsol_hatasi:konsol },null,2));
    throw new Error("Düello giriş düğmesi bulunamadı");
  }
  await rakipAra.waitFor({ state: "visible", timeout: 10000 });
  const baslangic = Date.now();
  await rakipAra.click();
  await page.waitForURL(/\/duello\/[0-9a-f-]{20,}/, { timeout: 25000 });
  await page.locator(".bd-duello").waitFor({ state: "visible", timeout: 10000 });
  const ms = Date.now() - baslangic;
  console.log(JSON.stringify({ basarili: true, eslesme_ms: ms, adres: page.url(), konsol_hatasi: konsol }, null, 2));
} finally {
  await browser.close();
}
