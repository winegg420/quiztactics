// İngilizce hesap oturumunda sayfaları gezip EKRANDA kalan Türkçe metni listeler (çalışma zamanı denetimi).
// Statik tarama (araclar/ceviri/tara.mjs) sözlükte anahtarı olan ama çıkışta çevrilmeyen metinleri göremez;
// bu betik gerçek DOM metnine bakar: görünür metin + aria-label/title/placeholder/alt.
//   node araclar/ceviri-ekran-tara.mjs --oturum=.arayuz-denetim-oturum-en.json --adres=http://localhost:5177 [--genislik=390,360] [--sayfa=duello] [--gorsel]
// DB'ye yazmaz. Tıklamalar yalnız sekme/aç-kapa düğmeleridir (satın alma, gönder, sil vb. tıklanmaz).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { TR_TARA, trAnahtarlar } from "./ceviri-dom.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5177";
const OTURUM = path.resolve(typeof ARG.oturum === "string" ? ARG.oturum : ".arayuz-denetim-oturum-en.json");
const GENISLIK = String(ARG.genislik || "390,360").split(",").map(Number);
const SADECE = typeof ARG.sayfa === "string" ? ARG.sayfa : null;
const GORSEL = Boolean(ARG.gorsel);
const TANITIM = Boolean(ARG.tanitim);   // tanıtım/ilk-açılış perdeleri görülmemiş gibi başla (localStorage anahtarları silinir)
const DIZIN = path.resolve("arayuz-denetim-gorseller", "en");

const SAYFALAR = typeof ARG.yol === "string" ? [["ozel", ARG.yol]] : [
  ["ana", "/"], ["modlar", "/modlar"], ["lig", "/siralama"], ["arkadaslar", "/arkadaslar"], ["meydan", "/meydan"],
  ["mesajlar", "/mesajlar"], ["dukkan", "/joker"], ["profil", "/profil"], ["ayarlar", "/profil?sekme=ayarlar"],
  ["turnuva", "/turnuva"], ["duello", "/duello"], ["calisma", "/calisma"], ["gizlilik", "/gizlilik"], ["kosullar", "/kosullar"],
  ["bulunamadi", "/boyle-bir-sayfa-yok"], ["davet", "/davet/ABCDEF"],
];

// Tarama işlevi ve Türkçe anahtar listesi ortak modülde (taklit maç testleri de kullanır)
const BROWSER = TR_TARA;

// Tanıtım perdesi açıksa adım adım ilerler; her adımda metni tarar. Yalnız ileri/atla/anladım düğmelerine basar.
const TANITIM_GEZ = async (sayfa, rapor) => {
  for (let i = 0; i < 12; i++) {
    const kat = sayfa.locator(".bd-tanitim-katman, [role=dialog]:visible").first();
    if (!(await kat.count())) return;
    await rapor("tanitim" + i);
    const ileri = kat.getByRole("button", { name: /^(Next|Continue|Got it|Let's go|Start|OK|Okay|Skip|Close|Done|Play|Understood|Ileri|İleri|Devam|Tamam|Atla|Anladım|Hadi başlayalım)/i }).first();
    if (!(await ileri.count())) return;
    try { await ileri.click({ timeout: 2000 }); } catch { return; }
    await sayfa.waitForTimeout(500);
  }
};

const SEKME_TIK = async (sayfa, rapor) => {
  // Sekme/segment düğmeleri: [role=tab] ve bilinen sekme sınıfları. Yalnız bunlara tıklanır.
  const sec = sayfa.locator('[role="tab"]:visible');
  const adet = Math.min(await sec.count(), 12);
  for (let i = 0; i < adet; i++) {
    try { await sec.nth(i).click({ timeout: 2000 }); await sayfa.waitForTimeout(450); await rapor("sekme" + i); } catch { /* görünmez/örtülü */ }
  }
};

// --tikla: sayfadaki güvenli düğmeleri (pencere/menü/panel açanlar) tek tek açar, her açılışta metni tarar, kapatır.
// Tehlikeli eylem düğmelerine (satın al, sil, gönder, çıkış, kabul/ret, ara/başlat…) BASILMAZ.
const TEHLIKELI = /buy|purchase|get |claim|collect|delete|remove|sign out|log ?out|block|report|send|accept|decline|reject|play|start|find|search|join|create|invite|share|copy|watch|video|reset|unlock|equip|use |confirm|save|submit|add friend|challenge|skip|cancel|leave|quit|exit|mute|unmute|^\d|^[+-]/i;
const TIKLA = async (sayfa, rapor, ad) => {
  const baslangic = sayfa.url();
  const adaylar = await sayfa.evaluate(() =>
    [...document.querySelectorAll("button, [role=button], summary")]
      .filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !e.disabled; })
      .map((e, i) => ({ i, ad: (e.getAttribute("aria-label") || e.innerText || e.title || "").replace(/\s+/g, " ").trim().slice(0, 60) }))
  );
  let tiklanan = 0;
  for (const a of adaylar) {
    if (tiklanan >= 14 || !a.ad || TEHLIKELI.test(a.ad)) continue;
    const dugme = sayfa.locator("button, [role=button], summary").nth(a.i);
    try {
      await dugme.click({ timeout: 1500 });
      tiklanan++;
      await sayfa.waitForTimeout(600);
      await rapor("tik-" + a.ad.replace(/[^\w]+/g, "_").slice(0, 24));
      await sayfa.keyboard.press("Escape");
      await sayfa.waitForTimeout(250);
      if (sayfa.url() !== baslangic) { await sayfa.goto(baslangic, { waitUntil: "domcontentloaded" }); await sayfa.waitForTimeout(1200); return; }
    } catch { /* örtülü ya da kaybolmuş */ }
  }
};

(async () => {
  const TR_ANAHTAR = await trAnahtarlar();
  console.log("Türkçe anahtar sayısı:", TR_ANAHTAR.length);
  const tarayici = await chromium.launch({ channel: "chrome", headless: true });
  let durum = fs.existsSync(OTURUM) ? JSON.parse(fs.readFileSync(OTURUM, "utf8")) : undefined;
  if (durum && TANITIM) for (const o of durum.origins ?? []) o.localStorage = o.localStorage.filter((x) => !/tanitim|ipucu|onboard/i.test(x.name));
  const baglam = await tarayici.newContext(durum ? { storageState: durum } : {});
  const sayfa = await baglam.newPage();
  if (GORSEL) fs.mkdirSync(DIZIN, { recursive: true });
  const tum = new Map();   // metin → sayfalar
  for (const w of GENISLIK) {
    await sayfa.setViewportSize({ width: w, height: w === 360 ? 800 : 844 });
    for (const [ad, yol] of SAYFALAR) {
      if (SADECE && ad !== SADECE) continue;
      const rapor = async (etiket) => {
        const o = await sayfa.evaluate(BROWSER, TR_ANAHTAR);
        for (const t of o.tr) { const s = tum.get(t) ?? new Set(); s.add(`${ad}@${w}`); tum.set(t, s); }
        if (o.tasan.length || o.yatay > 1) console.log(`TAŞMA ${ad}@${w} ${etiket}: yatay=${o.yatay} ${o.tasan.join(" | ")}`);
        if (GORSEL) await sayfa.screenshot({ path: path.join(DIZIN, `${ad}-${w}-${etiket}.png`) });
      };
      try {
        await sayfa.goto(ADRES + yol, { waitUntil: "domcontentloaded", timeout: 20000 });
        await sayfa.waitForTimeout(1200);
        await sayfa.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 9000 }).catch(() => {});
        await rapor("ana");
        if (TANITIM) await TANITIM_GEZ(sayfa, rapor);
        // Sayfayı sonuna kadar kaydır: tembel bölümler çizilsin
        await sayfa.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
        await rapor("alt");
        await sayfa.evaluate(() => window.scrollTo(0, 0));
        await SEKME_TIK(sayfa, rapor);
        if (ARG.tikla) await TIKLA(sayfa, rapor, ad);
      } catch (e) { console.log(`HATA ${ad}@${w}: ${String(e).slice(0, 120)}`); }
    }
  }
  await tarayici.close();
  console.log("\n===== EKRANDA KALAN TÜRKÇE =====");
  for (const [t, s] of [...tum.entries()].sort()) console.log(`${t}   ← ${[...s].slice(0, 4).join(", ")}`);
  console.log(`\nTOPLAM benzersiz: ${tum.size}`);
})();
