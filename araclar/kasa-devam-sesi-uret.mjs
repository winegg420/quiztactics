// Hazine DEVAM anının kendi sesi (17 Eki 2026): Ida'nın bugün o anda duyduğu rozet sesinden (/ses-secim › rozet = rozet-n1,
// 1,8 sn) kısa sürüm üretir. Tını ve perde AYNI (yeniden örnekleme / perde kaydırma yok): dosyanın ilk bölümü (ana kabarma +
// pırıltının girişi) alınır, sonuna DOSYAYA İŞLENMİŞ doğal (üstel) sönüm eklenir; çalma anında hiçbir şey kırpılmaz.
// Süre ≤ 900 ms: DEVAM anının en dar normal penceresine (payO 0,75) pay dahil sığar.
//
// Çıktı: public/ses/kasa_devam-<sha256 ilk 10>.wav (ad içerik sürümlü — sw.js › ADAY_YOL deseni; dosya değişirse ad değişir).
// Eski kasa_devam-*.wav dosyaları silinir; yeni ad ses.js › DOSYA.kasa_devam'a elle yazılır (betik adı yazdırır).
// Kullanım: node araclar/kasa-devam-sesi-uret.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KAYNAK = path.join(KOK, "araclar", "ses-adaylar-kaynak", "rozet-n1.wav");
const HEDEF_KLASOR = path.join(KOK, "public", "ses");

const SONUM_BAS_MS = 520;   // ana kabarmanın tepesinden (≈ 450 ms) sonra sönüm başlar; pırıltının girişi (≈ 550 ms) duyulur
const TOPLAM_MS = 880;      // dosyanın toplam süresi
const SONUM_DB = -50;       // TOPLAM_MS'de ulaşılan seviye
const SONUM_US = 1.6;       // sönüm eğrisi (dB cinsinden x^1,6): önce yavaş (pırıltı tınlar), sonra hızlanarak sessizliğe iner
const SON_KUYRUK_MS = 12;   // en sondaki -50 dB artığı sıfıra yumuşak iner (tık olmasın)

function wavOku(dosya) {
  const b = fs.readFileSync(dosya);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error("WAV değil");
  let o = 12, fmt = null, veri = null;
  while (o + 8 <= b.length) {
    const id = b.toString("ascii", o, o + 4), n = b.readUInt32LE(o + 4);
    if (id === "fmt ") fmt = { ses: b.readUInt16LE(o + 8), kanal: b.readUInt16LE(o + 10), oran: b.readUInt32LE(o + 12), bit: b.readUInt16LE(o + 22) };
    if (id === "data") veri = b.subarray(o + 8, o + 8 + n);
    o += 8 + n + (n & 1);
  }
  if (!fmt || !veri || fmt.ses !== 1 || fmt.bit !== 16) throw new Error("yalnız 16 bit PCM WAV");
  return { ...fmt, veri };
}

function wavYaz(kanal, oran, ornekler) {
  const veri = Buffer.alloc(ornekler.length * 2);
  for (let i = 0; i < ornekler.length; i++) veri.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ornekler[i] * 32767))), i * 2);
  const bas = Buffer.alloc(44);
  bas.write("RIFF", 0); bas.writeUInt32LE(36 + veri.length, 4); bas.write("WAVE", 8);
  bas.write("fmt ", 12); bas.writeUInt32LE(16, 16); bas.writeUInt16LE(1, 20); bas.writeUInt16LE(kanal, 22);
  bas.writeUInt32LE(oran, 24); bas.writeUInt32LE(oran * kanal * 2, 28); bas.writeUInt16LE(kanal * 2, 32); bas.writeUInt16LE(16, 34);
  bas.write("data", 36); bas.writeUInt32LE(veri.length, 40);
  return Buffer.concat([bas, veri]);
}

const w = wavOku(KAYNAK);
const kare = Math.round((TOPLAM_MS / 1000) * w.oran);
const sonumBas = Math.round((SONUM_BAS_MS / 1000) * w.oran);
const kuyruk = Math.round((SON_KUYRUK_MS / 1000) * w.oran);
const cikti = new Float32Array(kare * w.kanal);
let tepeKaynak = 0, tepeCikti = 0;
for (let i = 0; i < kare; i++) {
  let g = i < sonumBas ? 1 : 10 ** ((SONUM_DB * ((i - sonumBas) / (kare - sonumBas)) ** SONUM_US) / 20);
  if (i >= kare - kuyruk) g *= 0.5 + 0.5 * Math.cos((Math.PI * (i - (kare - kuyruk))) / kuyruk);
  for (let c = 0; c < w.kanal; c++) {
    const x = w.veri.readInt16LE((i * w.kanal + c) * 2) / 32768;
    tepeKaynak = Math.max(tepeKaynak, Math.abs(x));
    cikti[i * w.kanal + c] = x * g;
    tepeCikti = Math.max(tepeCikti, Math.abs(x * g));
  }
}
const dosya = wavYaz(w.kanal, w.oran, cikti);
const sha = crypto.createHash("sha256").update(dosya).digest("hex").slice(0, 10);
const ad = `kasa_devam-${sha}.wav`;
for (const f of fs.readdirSync(HEDEF_KLASOR)) if (/^kasa_devam-[0-9a-f]{10}\.wav$/.test(f) && f !== ad) fs.unlinkSync(path.join(HEDEF_KLASOR, f));
fs.writeFileSync(path.join(HEDEF_KLASOR, ad), dosya);
console.log(JSON.stringify({ ad, sure_ms: Math.round((kare / w.oran) * 1000), kanal: w.kanal, oran: w.oran, bayt: dosya.length,
  tepe_kaynak_dbfs: +(20 * Math.log10(tepeKaynak)).toFixed(2), tepe_cikti_dbfs: +(20 * Math.log10(tepeCikti)).toFixed(2), sonum_bas_ms: SONUM_BAS_MS, sonum_db: SONUM_DB, sonum_us: SONUM_US }));
