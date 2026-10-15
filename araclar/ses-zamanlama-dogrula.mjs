// Ses zamanlaması doğrulaması (B2 · B3) — GERÇEK ses.js, gerçek ses dosyaları, tarayıcıda; kayıt = bd_ses_tani=1 (window.__sesKayit)
// + AudioParam/AudioBufferSourceNode çağrı izi. Oyun akışına, sunucuya, hesaba dokunmaz (oturumsuz yasal sayfada çalışır).
//   npm run dev -- --port 5189   (başka kabukta)   →   node araclar/ses-zamanlama-dogrula.mjs [--adres=http://localhost:5189]
// B2: soru_geldi çalarken hâlâ çalan yanlis/dogru sesi kısa fade ile kısılıp durur (kesme yok, süre ≤ ~150 ms).
// B3: maç sonunda xp_dolma, kazandin/kaybettin sesi BİTİNCE başlar (başlangıç ≥ sonuç başlangıcı + sonuç süresi).
// B1 (cevap sonrası son_saniyeler/sayim_son çalmaz) bileşen mantığıdır: araclar/klasik-mac-ekran.mjs akışında kayıttan bakılır
// (aşağıdaki --b1 bayrağı değil; ayrı bölüm: bu dosyanın sonundaki not).
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5189").replace(/\/$/, "");
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };

try {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await baglam.route(/supabase\.co\/(rest|auth|realtime|functions)/, (r) => r.abort());
  await baglam.addInitScript(() => {
    try {
      sessionStorage.setItem("bd_ses_tani", "1");
      // Bugünkü dosyalar ("mevcut"); xp_dolma (bugün dosyası yok) ve yanlis (bugünkü dosya 139 ms — fade görülmez) için kayıtlı aday
      localStorage.setItem("bildim_ses_secim", JSON.stringify({ secimler: {
        galibiyet: "mevcut", maglubiyet: "mevcut", dogru: "mevcut", yanlis: "yanlis-p1", soru_geldi: "mevcut", xp_dolma: "xp_dolma-k3",
      } }));
    } catch { /* yok */ }
    // Çağrı izi: kaynak.stop(t) ve gain.linearRampToValueAtTime(0, t)
    window.__iz = [];
    const bas = AudioBufferSourceNode.prototype.start, dur = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...a) { this.__t0 = performance.now(); return bas.apply(this, a); };
    AudioBufferSourceNode.prototype.stop = function (t) { window.__iz.push({ tur: "stop", t: Math.round(performance.now()), sonra: Math.round(performance.now() - (this.__t0 ?? 0)) }); return dur.call(this, t); };
    const lin = AudioParam.prototype.linearRampToValueAtTime;
    AudioParam.prototype.linearRampToValueAtTime = function (d, t) { window.__iz.push({ tur: "rampa", deger: d, t: Math.round(performance.now()) }); return lin.call(this, d, t); };
  });
  const sayfa = await baglam.newPage();
  await sayfa.goto(`${ADRES}/gizlilik`, { waitUntil: "domcontentloaded" });
  await sayfa.mouse.click(20, 20);   // kullanıcı hareketi (calabilir())
  await sayfa.waitForTimeout(400);

  const ses = await sayfa.evaluateHandle(() => import("/oyun/lib/ses.js"));
  const bekle = (ms) => sayfa.waitForTimeout(ms);

  // Önce dosyaları indir + çöz (ilk çalışta 250 ms sınırı atlamasın)
  await sayfa.evaluate((s) => { s.sesKilidiAc(); s.sesOnYukle(["dogru", "yanlis", "soru_geldi", "kazandin", "kaybettin", "xp_dolma"]); }, ses);
  await bekle(2500);

  // ---- B2: yanlis çalıyor → 250 ms sonra soru_geldi
  await sayfa.evaluate(() => { window.__sesKayit = []; window.__iz = []; });
  await sayfa.evaluate((s) => s.sesYanlis(), ses);
  await bekle(250);
  await sayfa.evaluate((s) => s.sesSoruGeldi(), ses);
  await bekle(500);
  const b2 = await sayfa.evaluate(() => ({ kayit: window.__sesKayit, iz: window.__iz }));
  const yanlis = b2.kayit.find((k) => k.rol === "yanlis"), soru = b2.kayit.find((k) => k.rol === "soru_geldi");
  sonuc("B2 yanlis ve soru_geldi çaldı", Boolean(yanlis && soru), `yanlis@${yanlis?.t} soru_geldi@${soru?.t}`);
  const rampa = b2.iz.find((i) => i.tur === "rampa" && i.deger === 0);
  const durdu = b2.iz.find((i) => i.tur === "stop");
  sonuc("B2 yanlis sesi 0'a rampayla kısıldı (fade)", Boolean(rampa), rampa ? `rampa@${rampa.t} (soru_geldi'den ${rampa.t - soru.t} ms sonra)` : "rampa yok");
  sonuc("B2 yanlis kopyası fade sonunda durduruldu", Boolean(durdu));
  sonuc("B2 yanlis süresi tamamlanmadan kısıldı", Boolean(yanlis && yanlis.sureMs && soru.t - yanlis.t < yanlis.sureMs), `yanlis süresi ${yanlis?.sureMs} ms, kısılma ${soru ? soru.t - yanlis.t : "?"} ms`);

  // ---- B3: kazandin çalıyor → hemen xp_dolma (sunum sırası: sonuç sesi, hemen ardından XP çubuğu)
  await bekle(1800);   // B2'den kalan sesler bitsin
  await sayfa.evaluate(() => { window.__sesKayit = []; window.__iz = []; });
  await sayfa.evaluate((s) => { s.sesMacSonu("kazandin"); }, ses);
  await bekle(150);
  await sayfa.evaluate((s) => { s.sesMacSonu("xp_dolma"); }, ses);
  await bekle(3500);
  const b3 = await sayfa.evaluate(() => window.__sesKayit);
  const kz = b3.find((k) => k.rol === "kazandin"), xp = b3.find((k) => k.rol === "xp_dolma");
  sonuc("B3 kazandin ve xp_dolma kaydedildi", Boolean(kz && xp), `kazandin@${kz?.t} (${kz?.sureMs} ms) xp_dolma@${xp?.t}`);
  if (kz && xp) sonuc("B3 xp_dolma, kazandin bitince başladı", xp.t >= kz.t + (kz.sureMs ?? 0) - 30, `fark ${xp.t - kz.t} ms ≥ sonuç süresi ${kz.sureMs} ms`);

  // ---- B3 karşı örnek: sonuç sesi bittikten sonra xp_dolma ertelenmez
  await sayfa.evaluate(() => { window.__sesKayit = []; });
  await sayfa.evaluate((s) => s.sesMacSonu("xp_dolma"), ses);
  await bekle(120);
  const b3b = await sayfa.evaluate(() => window.__sesKayit);
  sonuc("B3 sonuç sesi yokken xp_dolma anında çalar", b3b.some((k) => k.rol === "xp_dolma"));

  // ---- B4 (15 Eki 2026): maç sonu ekranının sesi KENDİ penceresinde — ertelenen xp_dolma, maç sayfasının faz değişiminde
  // (sesFazDegisti) düşmez; ekran kapanınca (sesMacSonuKapat) düşer. Maç içi ses (sesXpDolma) eski kuralda: faz değişince düşer.
  const b4 = async (ad, xp, araIslem) => {
    await bekle(1900);
    await sayfa.evaluate(() => { window.__sesKayit = []; });
    await sayfa.evaluate((s) => s.sesMacSonu("kazandin"), ses);
    await bekle(150);
    await sayfa.evaluate(([s, xp]) => (xp === "mac_sonu" ? s.sesMacSonu("xp_dolma") : s.sesXpDolma()), [ses, xp]);
    await bekle(300);
    await sayfa.evaluate(([s, f]) => s[f](), [ses, araIslem]);
    await bekle(2200);
    return (await sayfa.evaluate(() => window.__sesKayit)).some((k) => k.rol === "xp_dolma");
  };
  sonuc("B4 maç sonu xp_dolma (ertelenmiş) faz değişince ÇALAR", await b4("faz", "mac_sonu", "sesFazDegisti"));
  sonuc("B4 maç sonu xp_dolma (ertelenmiş) ekran kapanınca DÜŞER", !(await b4("kapat", "mac_sonu", "sesMacSonuKapat")));
  sonuc("B4 maç içi xp_dolma (ertelenmiş) faz değişince DÜŞER", !(await b4("ic", "mac_ici", "sesFazDegisti")));
  await baglam.close();
} finally {
  await tarayici.close();
}
process.exit(hata ? 1 : 0);
