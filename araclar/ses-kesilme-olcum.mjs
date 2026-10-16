// SES KESİLMESİ ÇİZELGE ÖLÇÜMÜ (16 Eki 2026 — docs/TEST-KAPSAMI.md › 4) — GERÇEK ses.js + Ida'nın /ses-secim dosyaları, tarayıcıda.
//
// Her mod için bir maçlık SES ÇİZELGESİ (sayfaların ses çağrı sırası ve süreleri — kaynak dosyalar aşağıda) oynatılır ve her
// çalan dosyanın ÖMRÜ ölçülür: istendi / başladı (gecikme), dosya ve planlanan süre, gerçek çalma, kesildi mi + kesen (aynı
// rolün yeni kopyası · soru sesi · yeni ekran · başka), fade süresi (< 80 ms = ANİ), çalarken yeni ekran geldi mi + kalan ms,
// çakıştığı ses, hiç çalmadıysa neden. Ölçüm sürümden bağımsızdır (AudioBufferSourceNode start/stop/ended izi) → eski ses.js
// (git HEAD) ile yeni ses.js aynı çizelgede karşılaştırılır. Sunucuya / hesaba / veritabanına dokunmaz (oturumsuz /gizlilik).
//
// Kullanım: npm run dev -- --port 5189  (başka kabukta)
//           node araclar/ses-kesilme-olcum.mjs [--adres=http://localhost:5189] [--surum=yeni,eski] [--cpu=1,6] [--mod=klasik,...]
//           [--eski_kaynak=<git nesnesi, varsayılan HEAD>] [--etiket=x]   → tasarim/ses-kesilme/<etiket>.json + .md
// Modlar: klasik · saf_bilgi · duello (arama/VS + v4) · grup · turnuva · hazine (giriş + AÇ/DEVAM + rakip jokeri; sayfanın
// gerçek ölçümü araclar/hazine-akis-olcum.mjs'tedir).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5189").replace(/\/$/, "");
const SURUMLER = String(ARG.surum || "eski,yeni").split(",");
const CPULAR = String(ARG.cpu || "1,6").split(",").map(Number);
const ETIKET = typeof ARG.etiket === "string" ? ARG.etiket : "olcum";
const ONBELLEK = path.resolve(".tmp/hazine-akis-ses");   // hazine-akis-olcum ile ortak ses dosyası önbelleği
const CIKTI = path.resolve("tasarim/ses-kesilme");
fs.mkdirSync(ONBELLEK, { recursive: true });
fs.mkdirSync(CIKTI, { recursive: true });
const SECIMLER = JSON.parse(fs.readFileSync(path.join(ONBELLEK, "secimler.json"), "utf8"));

// Eski ses.js (karşılaştırma): git nesnesinden .tmp/ses-once/ses.js — içe aktarmalar aynı modüllere (mutlak yol) bağlanır
if (SURUMLER.includes("eski")) {
  const kaynak = execSync(`git show ${ARG.eski_kaynak || "HEAD"}:oyun/lib/ses.js`, { encoding: "utf8" })
    .replace('from "./sesAdayKova.js"', 'from "/oyun/lib/sesAdayKova.js"').replace('from "./akisIzleme.js"', 'from "/oyun/lib/akisIzleme.js"');
  fs.mkdirSync(path.resolve(".tmp/ses-once"), { recursive: true });
  fs.writeFileSync(path.resolve(".tmp/ses-once/ses.js"), kaynak);
}
const MODUL = { yeni: "/oyun/lib/ses.js", eski: "/.tmp/ses-once/ses.js" };

// ---------------- çizelgeler (ms, eylem) — kaynak: QuestionCard/MatchPage, Duello4Arena, RakipAra/AramaSahnesi, KasaPage ----
// Eylem: [ad, ...arg]. Ekran değişimi = sesSoruGeldi · sesFazDegisti (ekran:false hariç) · "ekran" işareti.
const SORU = 15000, GERI = 2000;   // soru süresi · Klasik/Grup/Turnuva geri bildirim → sonraki soru (soru_gosterim_payi_ms)
function klasik({ joker = true, turnuva = false } = {}) {
  const c = [];
  let t = 0;
  if (turnuva) { c.push([t, "sesTurnuvaBasladi"]); t += 2000; }
  c.push([t, "sesTik", 3], [t + 1000, "sesTik", 2], [t + 2000, "sesTik", 1]); t += 3000;
  // S1: joker → rakip cevapladı → cevap (doğru) → geri bildirim
  c.push([t, "sesSoruGeldi"]);
  if (joker) c.push([t + 800, "sesSkill", "elli"]);
  c.push([t + 1600, "sesRakipCevapladi"], [t + 2200, "sesDokunus"], [t + 2250, "sesDogru"]); t += 2250 + GERI;
  // S2: süre doldu (son 3 sn tikleri) → geri bildirim
  c.push([t, "sesSoruGeldi"], [t + 3000, "sesRakipCevapladi"], [t + 12000, "sesTik", 3], [t + 13000, "sesTik", 2], [t + 14000, "sesTik", 1], [t + SORU, "sesSureDoldu"]); t += SORU + GERI;
  // S3: ek süre jokeri → yanlış
  c.push([t, "sesSoruGeldi"]);
  if (joker) c.push([t + 700, "sesSkill", "sure"]);
  c.push([t + 1500, "sesDokunus"], [t + 1550, "sesYanlis"]); t += 1550 + GERI;
  // S4: rakip son anda cevapladı, hemen yeni soru (rakip sesi 300 ms bekler → düşmeli) · sonra doğru → maç sonu
  c.push([t - 200, "sesRakipCevapladi"], [t, "sesSoruGeldi"], [t + 900, "sesDokunus"], [t + 950, "sesDogru"]); t += 950 + 1200;
  // maç sonu ekranı (MacSonuKutlama): faz değişimi + sonuç + XP + seviye
  c.push([t, "sesFazDegisti", "mac_sonu"], [t + 10, "sesMacSonu", "kazandin"], [t + 20, "sesMacSonu", "xp_dolma"], [t + 2600, "sesMacSonu", "level"]);
  return { cizelge: c, son: t + 6000 };
}
function duello() {
  const c = [], AC = 2000, SONUC = 3000, GECIS = 2850;
  let t = 0;
  // arama → rakip bulundu → VS → maç ekranı (RakipAra / AramaSahnesi)
  c.push([t, "sesRakipBulundu", GECIS], [t + 450, "sesVsAni"]); t += GECIS;
  c.push([t, "sesFazDegisti", "notr"], [t, "sesTik", 3], [t + 1000, "sesTik", 2], [t + 2000, "sesTik", 1]); t += 3000;
  // nötr soru → doğru → kontrol aldı (650 ms sonra tur geçişi)
  c.push([t, "sesSoruGeldi"], [t + 2400, "sesDokunus"], [t + 2600, "sesFazDegisti", "sonuc"], [t + 2600, "sesPencere", SONUC, "sonuc"], [t + 2610, "sesDogru"], [t + 3250, "sesTurGecis"]);
  t += 2600 + SONUC;
  // kart fazı → rakip kart seçti → saldırı sorusu açılışı (kategori sesi, 2 sn sonra soru)
  c.push([t, "sesFazDegisti", "kart"], [t + 10, "sesTurGecis"], [t + 1500, "sesKategoriSecildi"]); t += 4000;
  c.push([t, "sesFazDegisti", "cevap"], [t + 10, "sesKategoriSecildi"], [t + AC, "sesSoruGeldi"]); t += AC;
  // rakip zaman baskısı jokeri → yanlış → can kaybı
  c.push([t + 1200, "sesSkill", "zaman_baskisi"], [t + 1900, "sesDokunus"], [t + 2000, "sesFazDegisti", "sonuc"], [t + 2000, "sesPencere", SONUC, "sonuc"], [t + 2010, "sesYanlis"], [t + 2650, "sesCanKaybi"]);
  t += 2000 + SONUC;
  c.push([t, "sesFazDegisti", "mac_sonu"], [t + 10, "sesMacSonu", "kaybettin"], [t + 20, "sesMacSonu", "xp_dolma"]);
  return { cizelge: c, son: t + 5000 };
}
function hazine() {
  const c = [], GIRIS = 4000, SONUC = 3000;
  let t = 0;
  // giriş sahnesi (KasaPage): pencere = sahne sonu; düşüş → 1300 ms rozet; 3-2-1; ilk sorunun açılışı sahne sürerken (ekran aynı)
  c.push([t, "sesPencere", GIRIS, "giris"], [t, "sesTurGecis"], [t + 1000, "sesTik", 3], [t + 1300, "sesRozet"], [t + 2000, "sesTik", 2],
    [t + 2000, "sesFazDegisti", "cevap", { ekran: false }], [t + 3000, "sesTik", 1]); t += GIRIS;
  // S1: rakip 2x jokeri → oyuncu 600 ms sonra cevaplar → sonuç (Ida'nın örneği)
  c.push([t, "sesSoruGeldi"], [t + 1800, "sesJoker"], [t + 2400, "sesDokunus"], [t + 2500, "sesFazDegisti", "sonuc"], [t + 2500, "sesPencere", SONUC, "sonuc"], [t + 2510, "sesDogru"]);
  t += 2500 + SONUC;
  // karar (ben) → AÇ anı (1820 ms): rozet 340, coin 980, soru sesi an bitince
  c.push([t, "sesFazDegisti", "karar"], [t + 10, "sesTurGecis"], [t + 1500, "sesDokunus"], [t + 1500, "sesPencere", 1820, "an:ac"], [t + 1840, "sesRozet"], [t + 2480, "sesCoin"], [t + 3320, "sesSoruGeldi"]);
  t += 3320;
  c.push([t + 2000, "sesDokunus"], [t + 2100, "sesFazDegisti", "sonuc"], [t + 2100, "sesPencere", SONUC, "sonuc"], [t + 2110, "sesYanlis"], [t + 2590, "sesCanKaybi", false]);
  t += 2100 + SONUC;
  c.push([t, "sesFazDegisti", "mac_sonu"], [t + 10, "sesMacSonu", "kazandin"], [t + 20, "sesMacSonu", "xp_dolma"]);
  return { cizelge: c, son: t + 5000 };
}
const MODLAR = {
  klasik: () => klasik(), saf_bilgi: () => klasik({ joker: false }), duello, grup: () => klasik({ joker: false }),
  turnuva: () => klasik({ joker: false, turnuva: true }), hazine,
};
const SECILEN = typeof ARG.mod === "string" ? ARG.mod.split(",") : Object.keys(MODLAR);

// ---------------- sayfa izi (sürümden bağımsız) ----------------
function iz() {
  const O = (window.__iz = { ses: [], cizelge: [] });
  sessionStorage.setItem("bd_ses_tani", "1");
  const urlTampon = new WeakMap(), tamponUrl = new WeakMap();
  const of = window.fetch;
  window.fetch = async function (...a) {
    const u = String(a[0]?.url ?? a[0]);
    const r = await of.apply(this, a);
    if (/\.(mp3|wav)(\?|$)/.test(u)) { const ab = r.arrayBuffer.bind(r); r.arrayBuffer = async () => { const b = await ab(); urlTampon.set(b, u); return b; }; }
    return r;
  };
  const BAC = window.BaseAudioContext || window.AudioContext;
  const od = BAC.prototype.decodeAudioData;
  BAC.prototype.decodeAudioData = function (buf, ok, err) {
    const u = urlTampon.get(buf);
    const p = od.call(this, buf, (b) => { if (u) tamponUrl.set(b, u); ok?.(b); }, err);
    p?.then?.((b) => { if (u) tamponUrl.set(b, u); }, () => {});
    return p;
  };
  const os = AudioBufferSourceNode.prototype.start, ost = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (when = 0, ...r) {
    const u = tamponUrl.get(this.buffer);
    if (u) {
      const k = { t: performance.now(), dosya: decodeURIComponent(u.split("/").pop().split("?")[0]), sure: Math.round(((this.buffer?.duration || 0) * 1000) / (this.playbackRate?.value || 1)) };
      O.ses.push(k); this.__k = k;
      this.addEventListener("ended", () => { k.bitti = performance.now(); });
    }
    return os.call(this, when, ...r);
  };
  AudioBufferSourceNode.prototype.stop = function (when = 0, ...r) {
    const k = this.__k;
    if (k) (k.stoplar ||= []).push({ t: performance.now(), once: Math.round(Math.max(0, (when || 0) - this.context.currentTime) * 1000) });
    return ost.call(this, when, ...r);
  };
}

const AN_ROL = { skill: "joker", galibiyet: "kazandin", maglubiyet: "kaybettin", lig_atlama: "rutbe", geri_sayim_tik: "tik", son_3_saniye: "sayim_son" };
const dosyadanRol = (d) => { const an = String(d || "").replace(/\.(wav|mp3)$/, "").replace(/-[0-9a-f]{10}$/, "").replace(/-[a-z]?\d+$/, ""); return AN_ROL[an] ?? an; };
const ANLAMLI = new Set(["joker", "skill_elli", "skill_ek_sure", "skill_soru_degistir", "skill_zaman_baskisi", "skill_sigorta", "skill_2x",
  "skill_ikinci_sans", "sis", "rakip_bulundu", "vs_ani", "dogru", "yanlis", "sure_doldu", "kategori_secildi", "tur_gecis", "kazandin", "kaybettin",
  "beraberlik", "xp_dolma", "level", "rutbe", "rozet", "coin", "turnuva", "can_kaybi", "rakip_cevapladi"]);
const MAC_SONU = new Set(["kazandin", "kaybettin", "beraberlik", "xp_dolma", "level", "rutbe"]);

function coz({ ses, cizelge, kayit }) {
  const ekranlar = cizelge.filter((e) => e.ad === "sesSoruGeldi" || (e.ad === "sesFazDegisti" && e.arg?.[1]?.ekran !== false))
    .map((e) => ({ t: e.t, ad: e.ad === "sesSoruGeldi" ? "yeni soru" : `faz ${e.arg?.[0] ?? ""}` }));
  const t0 = cizelge[0]?.t ?? 0;
  const liste = ses.map((k0) => {
    const rol = dosyadanRol(k0.dosya);
    let plan = k0.sure, planli = false;
    // başlangıçtaki stop = ses.js'in pencereye kısaltması (plan); sonraki stop = kesme
    const stoplar = k0.stoplar ?? [];
    const planStop = stoplar.find((x) => x.t - k0.t < 30 && x.once <= k0.sure + 25);
    if (planStop) { plan = planStop.once; planli = true; }
    const k = { ...k0, stop: stoplar.find((x) => x !== planStop) ?? null };
    const planBitis = k.t + plan, stopBitis = k.stop ? k.stop.t + k.stop.once : null;
    const bitis = Math.min(planBitis, stopBitis ?? Infinity, k.bitti ?? Infinity);
    const kesildi = stopBitis != null && stopBitis < planBitis - 40;
    const fade = kesildi ? Math.max(0, k.stop.once - 20) : null;
    const yeni = ekranlar.find((e) => e.t > k.t + 30 && e.t < bitis - 20);
    const cakisan = ses.filter((o) => o !== k && o.t > k.t + 20 && o.t < bitis - 50).map((o) => dosyadanRol(o.dosya)).filter((r) => !/^(dokunus|tik|sayim_tik)$/.test(r));
    return { rol, anlamli: ANLAMLI.has(rol) && !(MAC_SONU.has(rol) && ekranlar.some((e) => e.ad === "faz mac_sonu" && e.t <= k.t + 30)), t: Math.round(k.t - t0),
      dosyaMs: k.sure, planMs: Math.round(plan), planli, calmaMs: Math.round(bitis - k.t), kesildi, ani: kesildi && fade < 80, fadeMs: fade,
      kesen: !kesildi ? null : fade < 80 ? "aynı rolün yeni kopyası (ES_ZAMANLI, ~30 ms)" : "yumuşak fade (yeni ekran / aynı ses / soru sesi)",
      yeniEkran: yeni ? { ad: yeni.ad, kalanMs: Math.round(planBitis - yeni.t) } : null, cakisan: [...new Set(cakisan)] };
  });
  const anl = liste.filter((x) => x.anlamli);
  const calmayan = (kayit ?? []).filter((x) => x.sonuc && !/^calindi|^yukleniyor/.test(x.sonuc) && ANLAMLI.has(x.rol)).map((x) => `${x.rol}: ${x.sonuc}`);
  return { liste, anlamli: anl.length, ani: anl.filter((x) => x.ani).length, yumusak: anl.filter((x) => x.kesildi && !x.ani).length,
    calarkenEkran: anl.filter((x) => x.yeniEkran && x.yeniEkran.kalanMs > 150 && !x.kesildi).length,
    kisaltilan: anl.filter((x) => x.planli).length, calmayan };
}

const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
const sonuc = [];
try {
  for (const surum of SURUMLER) for (const cpu of CPULAR) for (const mod of SECILEN) {
    const b = await tarayici.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await b.addInitScript((s) => { try { localStorage.setItem("bildim_ses_secim", JSON.stringify(s)); localStorage.setItem("bildim_ses", "1"); } catch { /* yok */ } }, SECIMLER);
    await b.addInitScript(iz);
    await b.route(/supabase\.co\/storage\/v1\/object\/public\/ses-adaylar\//, async (r) => {
      const u = r.request().url();
      const ad = crypto.createHash("sha1").update(u).digest("hex").slice(0, 16) + path.extname(new URL(u).pathname);
      const yol = path.join(ONBELLEK, ad);
      try {
        if (!fs.existsSync(yol)) { const y = await fetch(u); if (!y.ok) throw new Error(String(y.status)); fs.writeFileSync(yol, Buffer.from(await y.arrayBuffer())); }
        await r.fulfill({ status: 200, body: fs.readFileSync(yol), headers: { "content-type": "audio/wav", "access-control-allow-origin": "*" } });
      } catch { await r.fulfill({ status: 404, body: "" }).catch(() => {}); }
    });
    await b.route(/supabase\.co\/(rest|auth|realtime|functions)/, (r) => r.abort());
    const s = await b.newPage();
    const hatalar = [];
    s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 160)));
    if (cpu > 1) { const cdp = await b.newCDPSession(s); await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu }); }
    await s.goto(`${ADRES}/gizlilik`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await s.mouse.click(20, 20);   // kullanıcı hareketi (AudioContext)
    const { cizelge, son } = MODLAR[mod]();
    // modülü yükle, bütün sesleri ön yükle (maçta MAC_ILK_SESLER + gruplar indirilmiş olur), çizelgeyi oynat
    await s.evaluate(async ({ modul, mod }) => {
      const ses = await import(modul);
      const akis = await import("/oyun/lib/akisIzleme.js");
      window.__ses = ses;
      akis.akisMacBaslat(mod === "saf_bilgi" ? "saf_bilgi" : mod, "00000000-0000-4000-8000-00000000c1ze");
      ses.sesOnYukle("hepsi");
    }, { modul: MODUL[surum], mod });
    await s.waitForTimeout(4000);
    await s.evaluate((c) => new Promise((coz) => {
      const bas = performance.now();
      for (const [ms, ad, ...arg] of c) setTimeout(() => {
        window.__iz.cizelge.push({ t: performance.now(), ad, arg });
        const f = window.__ses[ad];
        if (typeof f === "function") { try { f(...arg); } catch (e) { window.__iz.cizelge.push({ t: performance.now(), ad: "HATA", arg: [String(e)] }); } }
      }, ms);
      setTimeout(coz, Math.max(...c.map(([ms]) => ms)) + 50 - (performance.now() - bas));
    }), cizelge);
    await s.waitForTimeout(Math.max(3000, son - Math.max(...cizelge.map(([ms]) => ms))));
    const veri = await s.evaluate(() => ({ ses: window.__iz.ses, cizelge: window.__iz.cizelge, kayit: window.__sesKayit ?? [], omur: window.__sesOmur ?? null }));
    const c = coz(veri);
    sonuc.push({ surum, cpu, mod, ...c, hatalar, omur: veri.omur });
    console.log(`${surum.padEnd(4)} cpu${cpu} ${mod.padEnd(9)} anlamlı ${c.anlamli} · ANİ kesilen ${c.ani} · yumuşak biten ${c.yumusak} · çalarken yeni ekran (>150 ms) ${c.calarkenEkran} · kısaltılan ${c.kisaltilan} · çalmayan ${c.calmayan.length}${hatalar.length ? " · HATA " + hatalar.join(" | ") : ""}`);
    for (const x of c.liste.filter((y) => y.anlamli && (y.kesildi || (y.yeniEkran && y.yeniEkran.kalanMs > 150)))) {
      console.log(`      · ${x.rol} @${x.t}: plan ${x.planMs}/${x.dosyaMs} · çaldı ${x.calmaMs} ms${x.kesildi ? ` · KESİLDİ (${x.ani ? "ANİ" : `fade ${x.fadeMs} ms`})` : ""}${x.yeniEkran ? ` · çalarken ${x.yeniEkran.ad}, kalan ${x.yeniEkran.kalanMs} ms` : ""}${x.cakisan.length ? " · çakışan " + x.cakisan.join(",") : ""}`);
    }
    if (c.calmayan.length) console.log(`      çalmayan: ${c.calmayan.join(" · ")}`);
    await b.close();
  }
} finally {
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, `${ETIKET}.json`), JSON.stringify(sonuc, null, 1));
  const satir = sonuc.map((x) => `| ${x.mod} | ${x.surum} | ${x.cpu}x | ${x.anlamli} | ${x.ani} | ${x.yumusak} | ${x.calarkenEkran} | ${x.kisaltilan} | ${x.calmayan.length} |`);
  const ayrinti = sonuc.flatMap((x) => x.liste.filter((y) => y.anlamli && (y.kesildi || (y.yeniEkran && y.yeniEkran.kalanMs > 150)))
    .map((y) => `| ${x.mod} | ${x.surum} | ${x.cpu}x | ${y.rol} | ${y.planMs}/${y.dosyaMs} | ${y.calmaMs} | ${y.kesildi ? (y.ani ? "ANİ" : `fade ${y.fadeMs}`) : "—"} | ${y.yeniEkran ? `${y.yeniEkran.ad} · kalan ${y.yeniEkran.kalanMs}` : "—"} | ${y.cakisan.join(", ") || "—"} |`));
  fs.writeFileSync(path.join(CIKTI, `${ETIKET}.md`), `# Ses kesilmesi çizelge ölçümü — ${ETIKET}\n\n| mod | ses.js | CPU | anlamlı | ANİ kesilen | yumuşak biten | çalarken yeni ekran (>150 ms) | pencereye kısaltılan | çalmayan |\n|---|---|---|---|---|---|---|---|---|\n${satir.join("\n")}\n\n## Ayrıntı\n\n| mod | ses.js | CPU | rol | plan/dosya ms | çaldı ms | kesildi | yeni ekran | çakışan |\n|---|---|---|---|---|---|---|---|---|\n${ayrinti.join("\n")}\n`);
  console.log("→", path.join(CIKTI, `${ETIKET}.md`));
}
