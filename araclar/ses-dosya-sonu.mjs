// SES DOSYA SONU DENETİMİ (17 Eki 2026, ses bitiş kuralı) — `npm run test:kurallar` içinde. Canlıya istek atmaz.
//
// Oyunda çalabilecek HER anlamlı ses dosyası — public/ses varsayılanları, Ida'nın /ses-secim seçimleri (oyun/lib/sesDuzeltme.js ›
// SECIM_ANLIK) ve an varyantları — oyunun gerçekten çalacağı dosyaya çözülür (ses.js › dosyaAdi ile aynı eşleme: düzeltilmiş kopya
// varsa o) ve dosyanın KENDİSİ ölçülür (araclar/ses-analiz.mjs; WAV Node'da, MP3 Chrome'un çözücüsüyle):
//   · WAV başlığı geçerli (RIFF/data boyutu dosyayla tutarlı; akışla yazılmış 0xFFFFFFFF yok)
//   · son 20 ms -45 dBFS altında (ses dosya bitmeden doğal sonuna inmiş)
//   · son 150 ms'de basamak yok (süren ses 25 ms içinde sessizliğe düşmüyor — kesilip sessizlik eklenmemiş)
//   · doğal süre (-45 dB) rolün en dar penceresine sığıyor (sesKurali.js › SINIR_MS / VARYANT_SINIR_MS)
//   · başvurulan her düzeltilmiş dosya var; public/ses'te başvurulmayan düzeltilmiş dosya yok
// Tık rolleri (dokunuş, tik, sayım tiki; < 25 ms) kapsam dışı. Kesik / sığmayan dosya varsa çıkış kodu 1 (test kırmızı).
// Seçim değişince: canlıdan seçimleri al (ses_secimleri_oyun, tek salt okuma) → node araclar/ses-duzelt.mjs → bu test.
// Kullanım: node araclar/ses-dosya-sonu.mjs [--hepsi]   (--hepsi: seçilmemiş adayları da bilgi olarak listeler; sonuca etki etmez)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dosyaOlc, tarayiciKapat } from "./ses-analiz.mjs";
import { AN, TIK_ROLLERI, SINIR_MS, VARYANT_SINIR_MS, VARSAYILAN_DOSYA, CALMA_HIZI } from "../oyun/lib/sesKurali.js";
import { DUZELTILMIS_ADAY, DUZELTILMIS_VARSAYILAN, AN_VARYANT, SECIM_ANLIK } from "../oyun/lib/sesDuzeltme.js";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SES = path.join(KOK, "public", "ses");
const ADAY = path.join(KOK, "araclar", "ses-adaylar-kaynak");
const HEPSI = process.argv.includes("--hepsi");

const anRol = Object.fromEntries(Object.entries(AN).map(([r, a]) => [a, r]));
const adayYolu = (id) => ["wav", "mp3"].map((u) => path.join(ADAY, `${id}.${u}`)).find((y) => fs.existsSync(y));
const denetim = [];   // { ad, rol, yol, sinir }
for (const [rol, d] of Object.entries(VARSAYILAN_DOSYA)) {
  const f = DUZELTILMIS_VARSAYILAN[d] ?? d;
  denetim.push({ ad: `varsayılan ${rol}`, rol, yol: path.join(SES, f), sinir: SINIR_MS[rol] });
}
for (const [an, id] of Object.entries(SECIM_ANLIK.secimler ?? {})) {
  const rol = anRol[an];
  if (!rol || TIK_ROLLERI.has(rol) || !id || id === "mevcut" || id === "sessiz") continue;
  const yol = DUZELTILMIS_ADAY[id] ? path.join(SES, DUZELTILMIS_ADAY[id]) : adayYolu(id);
  denetim.push({ ad: `seçim ${an}=${id}`, rol, yol, sinir: SINIR_MS[rol] });
  for (const [v, s] of Object.entries(VARYANT_SINIR_MS[rol] ?? {})) {
    const vf = AN_VARYANT[id]?.[v];
    denetim.push({ ad: `seçim ${an}=${id} · ${v} anı`, rol, yol: vf ? path.join(SES, vf) : null, sinir: s });
  }
}

let hata = 0;
const satir = (tamam, metin) => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${metin}`); };
for (const d of denetim) {
  if (!d.yol || !fs.existsSync(d.yol)) { satir(false, `${d.ad}: dosya yok (${d.yol ? path.relative(KOK, d.yol) : "varyant üretilmemiş — node araclar/ses-duzelt.mjs"})`); continue; }
  const r = await dosyaOlc(d.yol);
  if (r.hata) { satir(false, `${d.ad}: çözülemedi (${r.hata})`); continue; }
  const hiz = CALMA_HIZI[d.rol] ?? 1, dogal = Math.round(r.dogalMs / hiz);
  const sorun = [];
  if (!r.baslikGecerli) sorun.push(`WAV başlığı geçersiz (${r.baslikSorun.join("; ")})`);
  if (r.son20Db > -45) sorun.push(`son 20 ms ${r.son20Db} dB (> -45: dosya ses bitmeden bitiyor)`);
  if (r.basamak) sorun.push(`son 150 ms'de basamak (${r.dususAni} ms)`);
  if (d.sinir != null && dogal > d.sinir) sorun.push(`doğal süre ${dogal} ms > pencere sınırı ${d.sinir} ms`);
  satir(!sorun.length, `${d.ad} → ${path.basename(d.yol)} · doğal ${dogal} ms${d.sinir ? ` / ${d.sinir}` : ""} · son 20 ms ${r.son20Db} dB${sorun.length ? ` — ${sorun.join(" · ")}` : ""}`);
}
// düzeltilmiş dosya kümesi: başvurulan ↔ diskte olan
const basvurulan = new Set([...Object.values(DUZELTILMIS_ADAY), ...Object.values(DUZELTILMIS_VARSAYILAN), ...Object.values(AN_VARYANT).flatMap(Object.values)]);
for (const f of basvurulan) if (!fs.existsSync(path.join(SES, f))) satir(false, `başvurulan düzeltilmiş dosya yok: ${f}`);
for (const f of fs.readdirSync(SES)) if (/-[0-9a-f]{10}\.wav$/.test(f) && !basvurulan.has(f)) satir(false, `public/ses/${f} hiçbir yerde başvurulmuyor (eski üretim — sil ya da üreticiyi çalıştır)`);

if (HEPSI) {
  console.log("\n— seçilmemiş adaylar (bilgi; Ida seçerse üretici düzeltilmiş kopyasını üretir):");
  for (const f of fs.readdirSync(ADAY).filter((x) => /\.(wav|mp3)$/.test(x) && !/^muzik_/.test(x))) {
    const r = await dosyaOlc(path.join(ADAY, f));
    if (!r.hata && r.kesik) console.log(`  · ${f}: KESİK (son 20 ms ${r.son20Db} dB${r.basamak ? ", basamak" : ""})`);
  }
}
await tarayiciKapat();
console.log(`\n${hata ? `✗ ${hata} sorun` : `✓ ${denetim.length} dosya: hepsi doğal sonuna iniyor ve penceresine sığıyor`}`);
process.exit(hata ? 1 : 0);
