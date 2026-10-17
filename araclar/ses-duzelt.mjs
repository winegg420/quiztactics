// SES BİTİŞ KURALI — düzeltilmiş ses dosyalarının üreticisi (17 Eki 2026, ses-bitis).
//
// Oyunda çalabilecek her anlamlı ses dosyası (public/ses varsayılanları + Ida'nın /ses-secim seçimleri) ölçülür
// (araclar/ses-analiz.mjs). Dosya kaynakta KESİKSE ya da rolünün en dar penceresine (oyun/lib/sesKurali.js › SINIR_MS)
// doğal hâliyle sığmıyorsa düzeltilmiş kopyası üretilir:
//   · sığmıyorsa: perdeyi koruyan zaman sıkıştırma (WSOLA; bütün cümle — giriş + gövde + sönüm — aynı perdede daha kısa)
//   · kesikse  : sesin kendi son karesinden DOĞAL kuyruk (tayf sürdürülür, sesin kendi sönüm eğimiyle sessizliğe iner)
//   Başından kırpıp sonuna söndürme EKLENMEZ (yasak — 63f4dc0'nun yaptığı buydu).
// Çıktı: public/ses/<kaynak>-<sha10>.wav (16 bit PCM mono, kaynağın örnekleme hızı, tepe kaynakla aynı; ad içerik sürümlü —
// sw.js › ADAY_YOL önbelleği) + oyun/lib/sesDuzeltme.js (ÜRETİLİR: kaynak → düzeltilmiş dosya, an varyantları, seçim anlık görüntüsü).
// Ida'nın sunucudaki seçimi (ses_secimleri) DEĞİŞMEZ: seçili aday kodda düzeltilmiş dosyayla eşlenir.
//
// Kullanım: node araclar/ses-duzelt.mjs [--secim=.tmp/hazine-akis-ses/secimler.json]
//   Seçim dosyası canlıdan tek seferlik salt okumayla alınır (ses_secimleri_oyun, anon RPC) — betik canlıya istek atmaz.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { dosyaOlc, olc, wavYaz, tarayiciKapat } from "./ses-analiz.mjs";
import { dogalKuyruk, sikistir, donguyuTamamla } from "./ses-dsp.mjs";
import { AN, TIK_ROLLERI, SINIR_MS, VARYANT_SINIR_MS, VARSAYILAN_DOSYA, CALMA_HIZI } from "../oyun/lib/sesKurali.js";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const SECIM = JSON.parse(fs.readFileSync(path.resolve(KOK, typeof ARG.secim === "string" ? ARG.secim : ".tmp/hazine-akis-ses/secimler.json"), "utf8"));
const SES = path.join(KOK, "public", "ses");
const ADAY = path.join(KOK, "araclar", "ses-adaylar-kaynak");
const CIKTI_JS = path.join(KOK, "oyun", "lib", "sesDuzeltme.js");

// varsayılanlar ve çalma hızları: oyun/lib/sesKurali.js (ses.js › DOSYA ile aynı)
const VARSAYILAN = VARSAYILAN_DOSYA, HIZ = CALMA_HIZI;

const anRol = Object.fromEntries(Object.entries(AN).map(([r, a]) => [a, r]));
const isler = [];   // { anahtar, rol, varyant?, kaynak (yol), sinir }
// aynı varsayılan dosyayı birden çok rol çalabilir (joker.mp3: joker + sis 0,7×): TEK kopya, en dar sınırla (dosya ölçüsünde)
const varsayilanGrup = new Map();
for (const [rol, dosya] of Object.entries(VARSAYILAN)) (varsayilanGrup.get(dosya) ?? varsayilanGrup.set(dosya, []).get(dosya)).push(rol);
for (const [dosya, roller] of varsayilanGrup) isler.push({ anahtar: dosya, tur: "varsayilan", rol: roller.join("+"), kaynak: path.join(SES, dosya),
  sinirOzel: Math.min(...roller.map((rl) => (SINIR_MS[rl] ?? 3000) * (HIZ[rl] ?? 1))) });
for (const [an, id] of Object.entries(SECIM.secimler ?? {})) {
  const rol = anRol[an];
  if (!rol || TIK_ROLLERI.has(rol) || !id || id === "mevcut" || id === "sessiz") continue;
  const yol = ["wav", "mp3"].map((u) => path.join(ADAY, `${id}.${u}`)).find((y) => fs.existsSync(y));
  if (!yol) { console.warn(`! ${an} → ${id}: kaynak dosya yok (araclar/ses-adaylar-kaynak)`); continue; }
  isler.push({ anahtar: id, tur: "aday", rol, kaynak: yol });
  for (const [v, s] of Object.entries(VARYANT_SINIR_MS[rol] ?? {})) isler.push({ anahtar: id, tur: "varyant", varyant: v, rol, kaynak: yol, sinirOzel: s });
}

/** Doğal süre sınırına (ms) sığdır + kesikse doğal kuyruk. Dönüş: örnekler + ölçü + yapılan işler. */
function duzelt(r, sinir, hiz) {
  const islem = [];
  let x = r.ornek;
  const hedef = sinir * hiz - 15;   // dosya ölçüsünde (çalma hızı hesaba katılır), 15 ms ek pay
  // tepe kaynakla aynı — ölçü de eşitlenmiş hâlden (eşitleme kuyruğu yükseltip doğal süreyi uzatabilir)
  let kaynakTepe = 0;
  for (const v of x) kaynakTepe = Math.max(kaynakTepe, Math.abs(v));
  const esitle = (y) => { let t = 0; for (const v of y) t = Math.max(t, Math.abs(v)); const k = t > 0 ? Math.min(kaynakTepe, 0.97) / t : 1; return Float32Array.from(y, (v) => v * k); };
  const sonuc = (y) => olc(esitle(y), r.oran);
  // kesikse: darbeli seste son periyot tamamlanır, sürekli seste doğal (freeze) kuyruk
  // sonumMs: freeze kuyruğunun en uzun 60 dB inişi (sığmayan seste kısalır — elektronik vızıltı/zil kendi bırakışıyla ~150 ms'de söner)
  const kuyrukla = (y, sonumMs = 380) => { const m = sonuc(y); if (!m.kesik) return y; const d = donguyuTamamla(y, r.oran); return d && !sonuc(d).kesik ? d : dogalKuyruk(y, r.oran, { enUzunSonumMs: sonumMs }).ornek; };
  let y = kuyrukla(x), m = sonuc(y);
  if (m.dogalMs > hedef) {
    // ikili arama: sıkıştırma çarpanı — sıkıştır, gerekirse kuyruk ekle, doğal süreyi ölç
    let alt = 0.15, ust = 1, en = null;
    for (const sonumMs of [380, 250, 160]) {
      alt = 0.15; ust = 1;
      for (let i = 0; i < 14; i++) {
        const f = (alt + ust) / 2;
        const yy = kuyrukla(sikistir(x, r.oran, f, { korunanMs: 12 }), sonumMs);
        const mm = sonuc(yy);
        if (mm.dogalMs <= hedef && !mm.kesik) { en = { f, yy, mm, sonumMs }; alt = f; } else ust = f;
      }
      if (en) break;
    }
    if (!en) throw new Error(`sığdırılamadı (sınır ${sinir} ms)`);
    islem.push(`perdeyi koruyan sıkıştırma ×${en.f.toFixed(2)}${r.kesik && en.sonumMs !== 380 ? ` (kuyruk inişi ${en.sonumMs} ms)` : ""}`);
    y = en.yy; m = en.mm;
  }
  if (r.kesik) islem.push(donguyuTamamla(x, r.oran) && !sonuc(donguyuTamamla(x, r.oran)).kesik ? "son vuruş periyodu tamamlandı (kaynak kesik)" : "doğal kuyruk (kaynak kesik)");
  y = esitle(y);
  return { ornek: y, olcu: olc(y, r.oran), islem };
}

const eskiHarita = fs.existsSync(CIKTI_JS) ? fs.readFileSync(CIKTI_JS, "utf8") : "";
const DUZ_ADAY = {}, DUZ_VARSAYILAN = {}, VARYANT = {}, TABLO = [];
const uretilen = new Set();
for (const is of isler) {
  const r = await dosyaOlc(is.kaynak);
  if (r.hata) { console.warn(`! ${is.anahtar}: ${r.hata}`); continue; }
  const hiz = HIZ[is.rol] ?? 1;
  const sinir = is.sinirOzel ?? SINIR_MS[is.rol] ?? 3000;
  const sigar = Math.round(r.dogalMs / hiz) <= sinir;
  const gerek = r.kesik || !sigar || !r.baslikGecerli || is.tur === "varyant";
  const satir = { anahtar: is.anahtar + (is.varyant ? `:${is.varyant}` : ""), rol: is.rol, kaynakSure: r.sureMs, kaynakDogal: r.dogalMs,
    kaynakSon20: r.son20Db, kaynakKesik: r.kesik, sinir, islem: [], dosya: null, dogal: null, son20: null };
  if (!gerek) { TABLO.push({ ...satir, dosya: path.basename(is.kaynak), dogal: r.dogalMs, son20: r.son20Db }); continue; }
  let d;
  try { d = duzelt(r, sinir, hiz); } catch (e) { console.warn(`! ${satir.anahtar}: ${e.message}`); TABLO.push({ ...satir, islem: [`HATA ${e.message}`] }); continue; }
  if (!r.baslikGecerli) d.islem.push("WAV başlığı yeniden yazıldı");
  const bayt = wavYaz(d.ornek, r.oran);
  const sha = crypto.createHash("sha256").update(bayt).digest("hex").slice(0, 10);
  const taban = is.tur === "varsayilan" ? is.anahtar.replace(/\.\w+$/, "") : is.anahtar;
  const ad = `${taban}${is.varyant ? `-${is.varyant}` : ""}-${sha}.wav`;
  fs.writeFileSync(path.join(SES, ad), bayt);
  uretilen.add(ad);
  if (is.tur === "varsayilan") DUZ_VARSAYILAN[is.anahtar] = ad;
  else if (is.tur === "aday") DUZ_ADAY[is.anahtar] = ad;
  else (VARYANT[is.anahtar] ||= {})[is.varyant] = ad;
  TABLO.push({ ...satir, islem: d.islem, dosya: ad, dogal: d.olcu.dogalMs, sure: d.olcu.sureMs, son20: d.olcu.son20Db });
}
await tarayiciKapat();

// önceki üretimden kalan, artık başvurulmayan düzeltilmiş dosyalar silinir (yalnız eski haritada adı geçenler)
for (const ad of eskiHarita.match(/"[^"]+-[0-9a-f]{10}\.wav"/g) ?? []) {
  const f = ad.slice(1, -1);
  if (!uretilen.has(f) && fs.existsSync(path.join(SES, f))) { fs.unlinkSync(path.join(SES, f)); console.log(`- silindi: ${f}`); }
}

const js = `// ÜRETİLDİ — araclar/ses-duzelt.mjs (${new Date().toISOString().slice(0, 10)}). ELLE DÜZENLEME; aracı yeniden çalıştır.
// SES BİTİŞ KURALI (oyun/lib/sesKurali.js): kaynakta kesik ya da rolünün en dar penceresine doğal hâliyle sığmayan dosyaların
// düzeltilmiş kopyaları (public/ses/, ad içerik sürümlü). Ida'nın /ses-secim seçimi değişmez; seçili aday burada eşlenir.

/** /ses-secim aday id'si → düzeltilmiş dosya (public/ses). */
export const DUZELTILMIS_ADAY = ${JSON.stringify(DUZ_ADAY, null, 2)};
/** Varsayılan dosya (seçim yok / "mevcut") → düzeltilmiş dosya (public/ses). */
export const DUZELTILMIS_VARSAYILAN = ${JSON.stringify(DUZ_VARSAYILAN, null, 2)};
/** Aday id'si → an varyantları (ör. Hazine AÇ / DEVAM anının kısa rozeti). */
export const AN_VARYANT = ${JSON.stringify(VARYANT, null, 2)};
/** Üretimde kullanılan seçim (ses_secimleri_oyun, sürüm ${SECIM.surum}) — test bu seçimin her dosyasına bakar. */
export const SECIM_ANLIK = ${JSON.stringify({ surum: SECIM.surum, secimler: SECIM.secimler })};
`;
fs.writeFileSync(CIKTI_JS, js);
fs.mkdirSync(path.join(KOK, ".tmp"), { recursive: true });
fs.writeFileSync(path.join(KOK, ".tmp", "ses-duzelt-tablo.json"), JSON.stringify(TABLO, null, 1));
for (const t of TABLO) console.log(`${t.anahtar.padEnd(28)} ${t.rol.padEnd(20)} kaynak ${String(t.kaynakSure).padStart(5)}/${String(t.kaynakDogal).padStart(5)} ms${t.kaynakKesik ? " KESİK" : "      "} sınır ${String(t.sinir).padStart(4)} → ${t.dosya ?? "-"} doğal ${t.dogal} son20 ${t.son20} ${t.islem.join(" + ")}`);
