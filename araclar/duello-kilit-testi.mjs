// Düello yeni oyuncu kilidi (666) — arayüz + sunucu, gerçek misafir hesaplarıyla.
// Her durum için AYRI yeni misafir hesap açılır, kurulum bitirilir, hesaba bota karşı bitmiş sahte Klasik maçlar yazılır
// (0 · 4 · 5), sonra /duello BİR KEZ yüklenir ve kontrol edilir:
//   0 → kilit kartı "5 maç daha", "Rakip ara" yok, sunucu duello_ara'yı reddeder
//   4 → kilit kartı "1 maç daha", "Rakip ara" yok
//   5 → kilit kartı yok, "Rakip ara" var, sunucu aramayı kabul eder (kuyruğa girer, hemen çıkarılır)
// Her hesabın sahte maçları ve kendisi sonunda silinir (hesabimi_sil). Veritabanına yalnız bu test hesaplarının satırları yazılır.
// Not: bu makinedeki başsız Chrome, kurulumu bitmiş yeni hesapta /duello'yu ikinci kez yükleyince sekmeyi ~5 sn sonra
// ("AudioContext … audio device" hatasıyla) çökertiyor — canlıdaki eski sürümde de aynı; bu yüzden her hesapta tek yükleme.
// Kullanım: npm run dev (başka kabukta) · node araclar/duello-kilit-testi.mjs [--adres=http://localhost:5173] [--gorsel]
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5173").replace(/\/$/, "");
const GORSEL = Boolean(ARG.gorsel);
const DIZIN = path.resolve("oyuncu-testi-gorseller");
const ENV = Object.fromEntries(fs.readFileSync(path.resolve(".env"), "utf8").split(/\r?\n/)
  .filter((x) => /^[A-Z_]+=/.test(x)).map((x) => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1).trim()]));

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad, ek); } else { kaldi++; console.log("  ✗", ad, ek); } };
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const bot = await db.tek(`select id from profiles where is_bot and bot_turu = 'gizli' limit 1`);

async function rpc(token, ad, govde = {}) {
  const r = await fetch(`${ENV.VITE_SUPABASE_URL}/rest/v1/rpc/${ad}`, {
    method: "POST", headers: { apikey: ENV.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  return { ok: r.ok, veri: await r.json().catch(() => null) };
}

// Kurulum sihirbazı (takma ad → avatar → şehir) ve tanıtımlar.
async function kurulum(s) {
  for (let i = 0; i < 10; i++) {
    const alan = s.locator(".bd-modal-katman input").first();
    if (await alan.count() && await alan.isVisible()) { await alan.fill("KilitTest" + Math.floor(Math.random() * 900 + 100)); await s.getByRole("button", { name: /^Devam$/ }).first().click().catch(() => {}); await s.waitForTimeout(1500); continue; }
    const ikon = s.locator(".bd-modal-katman img[src*='/avatars/']").first();
    if (await ikon.count()) { await ikon.click().catch(() => {}); await s.getByRole("button", { name: /Bu avatarı kullan/i }).first().click().catch(() => {}); await s.waitForTimeout(1500); continue; }
    const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
    if (await sehir.count()) { await sehir.click(); await s.locator(".bd-modal-katman [role=option]").first().click({ timeout: 8000 }).catch(() => {}); await s.getByRole("button", { name: /Oyuna başla/i }).first().click().catch(() => {}); await s.waitForTimeout(2000); continue; }
    const atla = s.getByRole("button", { name: /^(Atla|Hadi başlayalım|Geç|Kapat)$/i });
    if (await atla.count()) { await atla.first().click().catch(() => {}); await s.waitForTimeout(500); continue; }
    break;
  }
}

async function durumSina(macSayisi) {
  console.log(`\n▶ ${macSayisi} bitmiş Klasik maç`);
  const baglam = await tarayici.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 } });
  const s = await baglam.newPage();
  let ben = null; let token = null;
  try {
    await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
    await s.getByRole("button", { name: /Misafir olarak dene/i }).first().click({ timeout: 15000 });
    await s.waitForTimeout(3000);
    await kurulum(s);
    const oturum = await s.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.includes("auth-token")) return JSON.parse(localStorage.getItem(k)); } return null; });
    ben = oturum?.user?.id; token = oturum?.access_token;
    if (!ben) throw new Error("misafir hesap açılamadı");
    for (let i = 0; i < macSayisi; i++) {
      await db.sorgu(`insert into matches (oyuncu1, oyuncu2, durum, kazanan, bitis, basladi, dereceli)
        values (${alintila(ben)}, ${alintila(bot)}, 'bitti', ${alintila(bot)}, now(), true, false)`);
    }
    // Lobi: uygulama içinden (sayfa yenilemeden) /duello
    await s.evaluate(() => { history.pushState({}, "", "/duello"); dispatchEvent(new PopStateEvent("popstate")); });
    await s.locator(".m2-giris").waitFor({ timeout: 15000 }).catch(() => {});
    for (let i = 0; i < 20 && !(await s.locator(".m2-kilit, .m2-giris-eylem .qt-dugme--b, .m2-giris-eylem button").count()); i++) await s.waitForTimeout(250);
    await s.waitForTimeout(1500);
    if (GORSEL) { fs.mkdirSync(DIZIN, { recursive: true }); await s.screenshot({ path: path.join(DIZIN, `duello-kilit-${macSayisi}.png`) }); }
    const kilit = await s.locator(".m2-kilit").count();
    const metin = ((await s.locator(".m2-kilit-yazi b").first().textContent({ timeout: 500 }).catch(() => "")) ?? "").trim();
    const ara = await s.getByRole("button", { name: /Rakip ara/i }).count();
    const kalan = 5 - macSayisi;
    if (kalan > 0) {
      ok(`kilit kartı: "${kalan} maç daha"`, kilit === 1 && metin.includes(`${kalan} maç daha`), metin);
      ok("'Rakip ara' yok", ara === 0);
      const r = await rpc(token, "duello_ara", { p_dereceli: false });
      ok("sunucu aramayı reddeder", !r.ok && /maç daha oyna/.test(r.veri?.message ?? ""), r.veri?.message);
      const d = await rpc(token, "duello_acilis_benim");
      ok(`durum RPC: kalan ${kalan}`, d.ok && d.veri?.kalan === kalan && d.veri?.acik === false, JSON.stringify(d.veri));
    } else {
      ok("kilit kartı yok, 'Rakip ara' var", kilit === 0 && ara === 1);
      const r = await rpc(token, "duello_ara", { p_dereceli: false });
      ok("sunucu aramayı kabul eder (kuyruk)", r.ok, JSON.stringify(r.veri));
      await rpc(token, "duello_aramadan_cik");
    }
  } catch (e) { kaldi++; console.log("  BEKLENMEYEN HATA:", e.message.split("\n")[0]); }
  finally {
    if (ben) {
      try {
        await db.sorgu(`delete from duello_kuyrugu where user_id = ${alintila(ben)}`);
        await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and ${alintila(ben)} in (oyuncu1, oyuncu2)`);
        await db.sorgu(`delete from matches where ${alintila(ben)} in (oyuncu1, oyuncu2)`);
        const r = await rpc(token, "hesabimi_sil");
        const kalan = await db.tek(`select count(*) from auth.users where id = ${alintila(ben)}`);
        console.log(`  · temizlik: hesap ${ben.slice(0, 8)} ${r.ok ? "silindi" : "SİLİNEMEDİ " + JSON.stringify(r.veri)} (auth kalan ${kalan})`);
        if (kalan !== "0") kaldi++;
      } catch (e) { kaldi++; console.log("  temizlik hatası:", e.message); }
    }
    await baglam.close().catch(() => {});
  }
}

try {
  for (const n of [0, 4, 5]) await durumSina(n);
} finally { await tarayici.close(); await db.kapat(); }
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı`);
process.exitCode = kaldi ? 1 : 0;
