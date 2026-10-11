// Yerel taklit ortamı (oyun ekranı turu 2, 11 Eki 2026) — ekran ölçüm betiklerinin ortak kurulumu.
// CANLIYA YAZMAZ: bütün PATCH/DELETE, tabloya POST ve adı yazma kalıbına uyan RPC'ler tarayıcıda kesilir
// (sahte boş yanıt). Okumalar gerçek yanıtla ya da `taklitler` ile verilen sahte JSON ile döner.
// Oturum: .arayuz-denetim-oturum.json (origin yerel adrese çevrilir). Dil: "en" ise profil yanıtı YALNIZ
// tarayıcıda dil = "en" gösterilir.
//
//   import { taklitKur } from "./_taklit-kur.mjs";
//   const { tarayici, baglam, kesilenler } = await taklitKur({ adres, dil: "tr", taklitler: [[/regex/, jsonVeyaFn]] });
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const YAZMA_RPC = /\/rpc\/[a-z0-9_]*(sil|satin|_tak\b|tak$|cikar|gonder|send|create|kaydet|yaz|kalp_at|bildir|onayla|kabul|reddet|iptal|davet|_kur|baslat|ekle|guncelle|ayarla|isaretle|okundu|engelle|sikayet|_al$|odul|harca|kullan|use_|submit|advance|respond)/i;

export async function taklitKur({ adres, dil = "tr", taklitler = [], oturum = ".arayuz-denetim-oturum.json", viewport = { width: 390, height: 844 } }) {
  const st = JSON.parse(fs.readFileSync(path.resolve(oturum), "utf8"));
  const koken = new URL(adres).origin;
  // Aynı hesabın birden çok origin kaydı olabilir: ilkini yerel adrese taşı.
  st.origins = st.origins.slice(0, 1).map((o) => ({ ...o, origin: koken }));
  const tarayici = await chromium.launch({ channel: "chrome" });
  const baglam = await tarayici.newContext({ storageState: st, viewport, deviceScaleFactor: 1 });
  const kesilenler = [];
  await baglam.route(/\.(mp3|ogg|wav|m4a)(\?|$)/, (r) => r.abort());
  await baglam.route(/\/realtime\//, (r) => r.abort());
  await baglam.route(/\/rest\/v1\//, async (r) => {
    const u = r.request().url(); const m = r.request().method();
    try {
      for (const [desen, veri] of taklitler) {
        if (desen.test(u)) {
          const govde = typeof veri === "function" ? await veri(u, r.request()) : veri;
          return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(govde) });
        }
      }
      const rpc = u.includes("/rest/v1/rpc/");
      if (m === "PATCH" || m === "DELETE" || m === "PUT" || (m === "POST" && !rpc) || (rpc && YAZMA_RPC.test(u))) {
        kesilenler.push(`${m} ${u.split("/rest/v1/")[1].split("?")[0]}`);
        return r.fulfill({ status: 200, contentType: "application/json", body: rpc ? "null" : "[]" });
      }
      if (dil === "en" && /\/rpc\/profilim/.test(u)) {
        const y = await r.fetch(); const j = await y.json(); const p = Array.isArray(j) ? j[0] : j;
        if (p && typeof p === "object") p.dil = "en";
        return r.fulfill({ response: y, json: j });
      }
      return r.continue();
    } catch { return r.abort().catch(() => {}); }
  });
  return { tarayici, baglam, kesilenler };
}

/** Sayfada ortak ölçüm: yatay taşma, kesik metin, küçük dokunma hedefi, belge yüksekliği. */
export const OLC = () => {
  const de = document.documentElement;
  const gor = (e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none" && !e.closest(".qt-gizli"); };
  const kesik = [...document.querySelectorAll("body *")].filter((e) => gor(e) && e.children.length === 0 && e.textContent.trim()
    && ((e.scrollWidth > e.clientWidth + 1 && ["hidden", "clip"].includes(getComputedStyle(e).overflowX)) || (e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflowY === "hidden")))
    .map((e) => `${String(e.className).slice(0, 40)}:${e.textContent.trim().slice(0, 30)}`).slice(0, 8);
  const kucuk = [...document.querySelectorAll("button, a[href], [role=button], [role=tab]")].filter(gor)
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; })
    .map((e) => { const r = e.getBoundingClientRect(); return `${String(e.className).slice(0, 40)}:${Math.round(r.width)}x${Math.round(r.height)}`; }).slice(0, 8);
  return { yatay: de.scrollWidth - de.clientWidth, yukseklik: de.scrollHeight, kesik, kucuk };
};
