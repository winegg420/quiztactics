// Düello v4 · Son Düello kuralı — CANLI tek bot maçı (1093). Tek seferlik; maç başına bir kez çalıştır.
// Geçici misafir test hesabı (SonDuelloA###; işin sonunda SİLİNİR) açık bota karşı GERÇEK maç oynar ve kontrolü HİÇ ALMAMAYA çalışır: her soruda botun cevabını
// (DB'den, bot cevaplayınca) okur ve aynı doğrulukta cevap verir → sorular nötr kalır. Böylece:
//   · 1093 öncesi kural: art arda 5 nötr → 6. soru Son Düello,
//   · 1093 sonrası kural: art arda nötr Son Düello tetiklemez; Son Düello toplam 20. soruda (nötr döngüsü sonsuz değil).
// Son Düello'da botun tersini cevaplar (maç hemen biter). Sonuç duello_hamleler'den okunur.
// Kullanım: npm run dev -- --port 5188 · node araclar/duello-son-duello-testi.mjs [--adres=http://localhost:5188] [--beklenen=6|20]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5188";
const BOT = ARG.bot || "b0b00000-0000-4000-8000-000000000004";
const BEKLENEN = Number(ARG.beklenen || 20);
const CIKTI = path.resolve("tasarim/duello-v4");
const SURE_MS = 15 * 60 * 1000;
fs.mkdirSync(CIKTI, { recursive: true });

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
await db.sorgu("set application_name = 'duello-son-duello-testi'");
const tek = (s) => db.tek(s);
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

let A = null, BEN = null, jeton = null;
console.log(`A=(misafir) bot=${BOT} beklenen Son Düello sorusu=${BEKLENEN}`);

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block", locale: "tr-TR" });
await baglam.addInitScript(() => { try { localStorage.setItem("bildim_tanitim", "1"); } catch { /* yok */ } });
const b = baglam;

async function tanitimlariGec(s) {
  for (let i = 0; i < 4; i++) {
    const b = s.getByRole("button", { name: /^(Geç|Atla|Anladım|Tamam|Kapat|İleri|Başla)$/ });
    if (!(await b.count())) return;
    await b.last().click({ timeout: 1500 }).catch(() => {});
    await s.waitForTimeout(500);
  }
}

async function hesapAc() {
  const s = await baglam.newPage();
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  const dugme = s.getByRole("button", { name: /Misafir olarak dene/i });
  await dugme.waitFor({ timeout: 20000 });
  await dugme.click();
  await s.waitForFunction(() => !/Giriş yapılıyor/.test(document.body.innerText) && !document.body.innerText.includes("Misafir olarak dene"), null, { timeout: 60000 }).catch(() => {});
  await s.waitForTimeout(2500);
  await tanitimlariGec(s);
  const alan = s.locator(".bd-modal-katman input").first();
  await alan.waitFor({ timeout: 10000 }).catch(() => {});
  if (await alan.count()) {
    await alan.fill("SonDuelloA" + Math.floor(Math.random() * 900 + 100));
    await s.getByRole("button", { name: /^(Devam|Continue)$/ }).first().click();
    await s.waitForTimeout(1800);
  }
  const ikon = s.locator(".bd-modal-katman .g-avatar-sec:not(.qt-av-kilitli)").first();
  if (await ikon.count()) { await ikon.click(); await s.waitForTimeout(400); }
  const kullan = s.getByRole("button", { name: /Bu avatarı kullan/i });
  const avatarsiz = s.getByRole("button", { name: /Avatarsız devam et/i });
  if (await kullan.count() && await kullan.first().isEnabled()) { await kullan.first().click(); await s.waitForTimeout(1800); }
  else if (await avatarsiz.count()) { await avatarsiz.first().click(); await s.waitForTimeout(1800); }
  const sehir = s.locator(".bd-modal-katman [role=combobox]").first();
  if (await sehir.count()) {
    await sehir.click();
    await s.locator(".bd-modal-katman [role=option]").first().waitFor({ timeout: 8000 }).catch(() => {});
    const secenek = s.locator(".bd-modal-katman [role=option]").first();
    if (await secenek.count()) await secenek.click();
    await s.getByRole("button", { name: /Oyuna başla/i }).first().click().catch(() => {});
    await s.waitForTimeout(2500);
  }
  await tanitimlariGec(s);
  const kayit = await s.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k)) return { ad: k, deger: localStorage.getItem(k) };
    }
    return null;
  });
  if (!kayit) throw new Error("misafir oturumu açılmadı");
  jeton = { ref: kayit.ad.replace(/^sb-/, "").replace(/-auth-token$/, ""), access: JSON.parse(kayit.deger).access_token };
  BEN = JSON.parse(Buffer.from(jeton.access.split(".")[1], "base64url").toString()).sub;
  await s.close();
}

function anonAnahtar() {
  for (const d of [".env.local", ".env"]) {
    try { const m = fs.readFileSync(d, "utf8").match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m); if (m) return m[1].trim(); } catch { /* yok */ }
  }
  return null;
}

async function hesabiSil() {
  if (!jeton) return "hesap yok";
  try {
    const apikey = anonAnahtar();
    // Belirteç süresi dolmuş olabilir: en güncel belirteç bağlamdan okunur.
    const durum = await baglam.storageState().catch(() => null);
    const kayit = (durum?.origins ?? []).flatMap((o) => o.localStorage ?? []).find((x) => /^sb-.+-auth-token$/.test(x.name));
    const access = kayit ? JSON.parse(kayit.value).access_token : jeton.access;
    const r = await fetch(`https://${jeton.ref}.supabase.co/rest/v1/rpc/hesabimi_sil`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}`, apikey }, body: "{}" });
    return r.ok ? "silindi" : `SİLİNEMEDİ (${r.status} ${(await r.text()).slice(0, 100)})`;
  } catch (e) { return "SİLİNEMEDİ: " + String(e?.message ?? e).slice(0, 100); }
}


const s = await b.newPage();
const konsol = [];
s.on("console", (m) => { if (m.type() === "error" && !/status of 400|Failed to load resource/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));

const DOM = () => {
  const a = document.querySelector(".d4-arena");
  const faz = a ? ([...a.classList].find((c) => /^d4-arena--(notr|cevap|son|kart|sonuc)$/.test(c)) ?? "").replace("d4-arena--", "") : null;
  return {
    faz, son: Boolean(a?.classList.contains("d4-arena--sonduello")),
    benKontrol: Boolean(document.querySelector(".d4-oy--ben.d4-oy--kontrol")),
    sikAcik: document.querySelectorAll(".d4-arena .qt-sik:not(:disabled):not([aria-disabled=true])").length,
    soru: document.querySelector(".d4-soru")?.innerText?.slice(0, 120) ?? "",
    macSonu: !a && Boolean(document.querySelector(".msk-avatar")),
  };
};
async function dogruIndeks() {
  const soru = await s.evaluate(() => document.querySelector(".d4-soru .qt-soru-kart")?.innerText?.trim() ?? document.querySelector(".d4-soru")?.innerText ?? "");
  const siklar = await s.evaluate(() => [...document.querySelectorAll(".d4-arena .qt-sik")].map((e) => e.innerText.replace(/^[A-D]\s*/, "").trim()));
  const r = await db.sorgu(`select q.dogru_cevap::text dc, q.secenekler::text s from questions q where ${alintila(soru)} like '%' || q.soru || '%'
     union all select q.dogru_cevap::text, t.secenekler::text from question_translations t join questions q on q.id = t.question_id
      where not t.eskidi and ${alintila(soru)} like '%' || t.soru || '%' limit 1`);
  if (!r.length) return null;
  const sec = JSON.parse(r[0].s); const dogruMetin = String(sec[Number(r[0].dc)]).trim();
  const i = siklar.findIndex((x) => x === dogruMetin);
  return i >= 0 ? i : null;
}
const cevapla = async (dogru) => {
  const i = await dogruIndeks();
  const n = await s.locator(".d4-arena .qt-sik").count();
  const hedef = i == null ? 0 : dogru ? i : (i + 1) % n;
  await s.locator(".d4-arena .qt-sik").nth(hedef).click({ timeout: 3000 }).catch(() => {});
};
// Botun bu sorudaki cevabı (bot cevaplayana kadar en çok ~13 sn; 900 ms aralık, yalnız bu maç satırı).
async function botDogruMu(id) {
  const son = Date.now() + 13000;
  while (Date.now() < son) {
    const r = (await db.sorgu(`select (d.cevaplar ? ${alintila(BOT)})::text var,
        ((d.cevaplar -> ${alintila(BOT)} ->> 'cevap')::smallint = q.dogru_cevap)::text dogru
        from duellolar d left join questions q on q.id = case when d.oyuncu2 = ${alintila(BOT)} then d.soru_id2 else d.soru_id1 end
       where d.id = ${alintila(id)}`))[0];
    if (r?.var === "true") return r.dogru === "true";
    await s.waitForTimeout(900);
  }
  return false;   // bot cevaplamadı → süre dolumu yanlış sayılır
}

let id = null, hesapDurumu = "açılmadı";
try {
  await hesapAc(); A = BEN; console.log("  test hesabı:", A);
  id = await tek(`select duello_olustur(${alintila(A)}, ${alintila(BOT)}, false)::text`);
  ok("v4 maçı açıldı", (await tek(`select surum::text from duellolar where id = ${alintila(id)}`)) === "4");
  await s.goto(`${ADRES}/duello/${id}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await s.waitForSelector(".d4-arena", { timeout: 30000 });
  const bas = Date.now();
  let sonCevaplanan = null, bitti = false;
  while (Date.now() - bas < SURE_MS) {
    await s.waitForTimeout(400);
    const d = await s.evaluate(DOM);
    if (d.macSonu) { bitti = true; break; }
    if (d.faz === "kart" && d.benKontrol) { await s.locator(".d4-kart:not(:disabled)").first().click({ timeout: 2000 }).catch(() => {}); continue; }
    if (!["notr", "cevap", "son"].includes(d.faz) || d.sikAcik < 2) continue;
    const no = await tek(`select v4_soru_no::text from duellolar where id = ${alintila(id)}`);
    const anahtar = `${no}:${d.soru}`;
    if (anahtar === sonCevaplanan) continue;
    sonCevaplanan = anahtar;
    if (d.son) await s.screenshot({ path: path.join(CIKTI, `son-duello-${BEKLENEN}-390x844-tr.png`) }).catch(() => {});
    const botDogru = await botDogruMu(id);
    await cevapla(d.son ? !botDogru : botDogru);
    console.log(`  · soru ${no} (${d.son ? "SON DÜELLO" : d.faz}): bot ${botDogru ? "doğru" : "yanlış"} → ben ${(d.son ? !botDogru : botDogru) ? "doğru" : "yanlış"}`);
  }
  ok("maç bitti (zaman aşımı yok)", bitti);
  const h = await db.sorgu(`select (v4 ->> 'no')::int no, v4 ->> 'tip' tip, v4 ->> 'sonuc' sonuc from duello_hamleler
     where duello_id = ${alintila(id)} and v4 is not null order by (v4 ->> 'no')::int`);
  console.log("  hamleler:", h.map((x) => `${x.no}:${x.tip}/${x.sonuc}`).join(" "));
  const ilkSon = h.find((x) => x.tip === "son");
  let notrSeri = 0, enUzunNotr = 0;
  for (const x of h) { if (x.tip !== "notr") break; if (x.sonuc === "kontrol_aldi") break; notrSeri++; enUzunNotr = Math.max(enUzunNotr, notrSeri); }
  console.log(`  baştan art arda nötr (kontrol alınmadan): ${enUzunNotr} · ilk Son Düello sorusu: ${ilkSon?.no ?? "yok"}`);
  ok(`Son Düello ${BEKLENEN}. soruda başladı`, Number(ilkSon?.no) === BEKLENEN, JSON.stringify(ilkSon));
  ok(`${BEKLENEN}. sorudan önce Son Düello yok`, h.every((x) => x.tip !== "son" || Number(x.no) >= BEKLENEN));
  if (BEKLENEN > 6) ok("art arda 5+ nötr Son Düello tetiklemedi", enUzunNotr >= 5 || h.filter((x) => x.no < BEKLENEN).length >= BEKLENEN - 1, `nötr seri ${enUzunNotr}`);
  const mac = (await db.sorgu(`select durum, v4_son::text son, kazanan::text k from duellolar where id = ${alintila(id)}`))[0];
  ok("maç Son Düello ile bitti, kazanan belli", mac.durum === "bitti" && ["t", "true"].includes(mac.son) && mac.k, JSON.stringify(mac));
  // 1093 rehber: yeni hesabın ilk Düellosu → profiles.duello_rehber_mac = bu maç (1093 öncesi kolon yok → atlanır)
  const rehber = await db.sorgu(`select (duello_rehber_mac = ${alintila(id)})::text r from profiles where id = ${alintila(A)}`).catch(() => null);
  if (rehber) ok("ilk Düello rehberi bayrağı bu maça yazıldı (hesapta kalıcı)", rehber[0]?.r === "true", JSON.stringify(rehber));
  ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
} catch (e) {
  kaldi++; console.log("  ✗ HATA", e.message.slice(0, 300));
  await s.screenshot({ path: path.join(CIKTI, "son-duello-hata-390x844-tr.png") }).catch(() => {});
} finally {
  if (A) await db.sorgu(`update duellolar set durum = 'iptal', bitis = now() where durum = 'aktif' and ${alintila(A)} in (oyuncu1, oyuncu2)`).catch(() => {});
  hesapDurumu = await hesabiSil(); console.log("  test hesabı:", hesapDurumu);
  await b.close(); await tarayici.close(); await db.kapat();
}
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
