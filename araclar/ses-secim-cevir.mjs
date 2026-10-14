// /ses-secim seçimlerini işlenmiş kopyalara çevirir (araclar/ses-isle.mjs → docs/ses-isleme-raporu.json).
// Yalnız seçim HÂLÂ rapordaki kaynak adayda ise çevirir (Ida bu arada başka aday seçtiyse dokunmaz); orijinal aday silinmez,
// sayfada listede durur (Aday listesinin sonunda "Normalize edilmiş kopya" olarak yeni aday görünür).
// SIRA: kopyalar kovaya yüklenmiş (ses-adaylari-yukle.mjs) VE eşlemeyi taşıyan sürüm canlıda olmalı — eski istemci
// bilmediği adayı osilatör yedeğiyle çalar. Tek UPDATE (tetikleyici ses_secim_surumu'nu bir artırır).
//
// Kullanım: node araclar/ses-secim-cevir.mjs [--kuru] [--geri]   (--geri: kopyalardan kaynağa döner)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rapor = JSON.parse(fs.readFileSync(path.join(KOK, "docs", "ses-isleme-raporu.json"), "utf8"));
const kuru = process.argv.includes("--kuru");
const geri = process.argv.includes("--geri");

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  const simdi = await db.sorgu("select an, aday from public.ses_secimleri");
  const adi = Object.fromEntries(simdi.map((s) => [s.an, s.aday]));
  const degisecek = [];
  for (const s of rapor.sesler) {
    const kopya = s.dosya.replace(/\.wav$/, "");   // <an>-n1
    const [eski, yeni] = geri ? [kopya, s.kaynak] : [s.kaynak, kopya];
    if (adi[s.an] === eski) degisecek.push({ an: s.an, eski, yeni });
    else console.log(`atlandı: ${s.an} (şu an "${adi[s.an]}", beklenen "${eski}")`);
  }
  for (const d of degisecek) console.log(`${d.an}: ${d.eski} → ${d.yeni}`);
  if (kuru || !degisecek.length) { console.log(kuru ? "--kuru: yazılmadı." : "değişecek seçim yok."); }
  else {
    // Tek deyim = tek sürüm artışı. `where aday = eski` yarış durumunda başkasının seçimini ezmez.
    const degerler = degisecek.map((d) => `(${alintila(d.an)}, ${alintila(d.eski)}, ${alintila(d.yeni)})`).join(", ");
    await db.sorgu(`update public.ses_secimleri s set aday = v.yeni, guncellendi = now()
                      from (values ${degerler}) as v(an, eski, yeni)
                     where s.an = v.an and s.aday = v.eski`);
    const son = await db.sorgu("select count(*)::int as n from public.ses_secimleri where aday ~ '-n[0-9]+$'");
    console.log(`güncellendi: ${degisecek.length} seçim (kopyaya çevrilmiş toplam ${son[0].n}).`);
  }
} finally {
  await db.kapat();
}
