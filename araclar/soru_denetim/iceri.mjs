// npm run soru:iceri -- parti_NN_sonuc.json [--kuru] [--yalniz-kapi] [--zorla]
// --kuru: her satır işlenir ve raporlanır, sonra hepsi geri alınır (hiçbir şey yazılmaz)
// Denetim sonucunu veritabanına işler. Her satır ayrı doğrulanır; bozuk satır atlanır ve raporlanır,
// parti düşmez. Düzeltmede eski hâl soru_surum'a yazılır, çeviri "eskidi" işaretlenir; kaldırma = aktif=false.
import fs from "node:fs";
import path from "node:path";
import { KLASOR, sorgu, jsonSabit } from "./ortak.mjs";
import { duzeltmeKapiSorgusu, sikIpucuSonHalSorgusu, sikIpucuTesti, SIK_IPUCU_ISARET } from "./kapi.mjs";
import { maliyetUsd } from "../jev.mjs";

const kuru = process.argv.includes("--kuru");
const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!arg) {
  console.error("Kullanım: npm run soru:iceri -- parti_NN_sonuc.json");
  process.exit(1);
}
const dosya = fs.existsSync(arg) ? arg : path.join(KLASOR, arg);
if (!fs.existsSync(dosya)) {
  console.error("Dosya bulunamadı:", dosya);
  process.exit(1);
}

let kayitlar;
try {
  const ham = JSON.parse(fs.readFileSync(dosya, "utf8"));
  kayitlar = Array.isArray(ham) ? ham : ham.sonuclar ?? ham.sorular;
  if (!Array.isArray(kayitlar)) throw new Error("dosya bir dizi ya da {sonuclar: [...]} olmalı");
} catch (e) {
  console.error("Sonuç dosyası okunamadı:", e.message);
  process.exit(1);
}

// Yalnız izin verilen alanlar gider (dışa aktarma dosyası yanlışlıkla verilirse fazlalık yok sayılır)
const ALAN = ["id", "karar", "soru", "secenekler", "dogru_cevap", "kaynak", "not"];
const temiz = kayitlar.map((k) => Object.fromEntries(Object.entries(k ?? {}).filter(([a]) => ALAN.includes(a))));
const parti = path.basename(dosya).replace(/_sonuc\.json$|\.json$/, "");

// Paket 25 — kalite kapısı: düzeltilmiş şıklar "doğru şık kendini ele veriyor" kuralına
// takılıyorsa sessizce alınmasın. Kural veritabanında tek yerde tanımlı
// (soru_kural_isaretleri); burada yalnız çağrılır, eşik kopyalanmaz.
// ENGELLER (22 Eyl 2026, Şerit D): eskiden yalnız uyarıydı ve uyarı metni yanlıştı
// ("rekabetçi havuza girmez"): düzeltilen soru 'duzeltildi' olur, soru_sec ise işaretli
// soruyu yalnız denetim_durumu = 'bekliyor' iken dışlar → dengesiz düzeltme doğrudan
// rekabetçi havuza giriyordu. Artık takılan düzeltme yazılmaz; bilerek geçirmek için --zorla.
// Kapı çalıştırılamazsa (bağlantı vb.) hiçbir şey yazılmaz. SQL: kapi.mjs.
// --yalniz-kapi: yalnız kapıyı çalıştırır, veritabanına hiçbir şey yazmaz.
const zorla = process.argv.includes("--zorla");
const yalnizKapi = process.argv.includes("--yalniz-kapi");
const duzeltmeler = temiz.filter((k) => k.karar === "duzelt" && k.id);
const engellenen = new Set();
if (duzeltmeler.length) {
  try {
    const takilan = sorgu(duzeltmeKapiSorgusu(duzeltmeler));
    if (takilan.length) {
      console.warn(`${zorla ? "UYARI (--zorla)" : "ENGELLENDİ"} — ${takilan.length} düzeltme şık denge kapısına takılıyor:`);
      for (const t of takilan) {
        console.warn(`  ${t.id}: ${t.isaretler}`);
        if (!zorla) engellenen.add(t.id);
      }
      console.warn("  Doğru hamle: çeldiricileri doğru şıkla aynı uzunluk/kelime biçimine getir.");
    } else {
      console.log(`Şık denge kapısı: ${duzeltmeler.length} düzeltmenin hepsi geçti.`);
    }
  } catch (e) {
    console.error("[soru:iceri] şık denge kapısı çalıştırılamadı:", e.message.slice(0, 200));
    if (!zorla) {
      console.error("Kapı doğrulanmadan hiçbir şey yazılmaz (bilerek geçirmek için --zorla).");
      process.exit(1);
    }
  }
}
// Şık ipucu kapısı (Jev, soru metni gizli — 23 Eyl 2026, Şerit S1). SQL kuralı uzunluk/kelime
// sayısını yakalar ama "üç çeldirici 'Yalnız X', doğru şık farklı biçim" gibi ipuçlarını yakalamaz.
//   duzelt → yazılacak son şıklar Jev'e (yalnız şıklar, karışık) sorulur; doğruyu > 0,8 ile
//            buluyorsa düzeltme yazılmaz (çeldiriciler yeniden yazılıp tekrar denenir).
//   onayla → soru `sik_ipucu_jev` işaretliyse yazılmaz: onay şıkları değiştirmez ama soruyu
//            'bekliyor'dan çıkarır → ipucuyla rekabetçi havuza girerdi. Önce 'duzelt'.
// Jev çalışamazsa hiçbir şey yazılmaz (--zorla hariç). Aynı --zorla bu kapıyı da geçirir.
const ipucuAdaylari = temiz.filter((k) => k.id && (k.karar === "duzelt" || k.karar === "onayla") && !engellenen.has(k.id));
if (ipucuAdaylari.length) {
  try {
    const sonHal = sorgu(sikIpucuSonHalSorgusu(ipucuAdaylari));
    const takilan = [];
    let jeton = 0;
    for (const s of sonHal) {
      if (s.karar === "onayla") {
        if (s.isaretli === true || s.isaretli === "t" || s.isaretli === "true") takilan.push({ id: s.id, neden: `onay: soru ${SIK_IPUCU_ISARET} işaretli — önce şıkları düzelt` });
        continue;
      }
      const sec = typeof s.secenekler === "string" ? JSON.parse(s.secenekler) : s.secenekler;
      const r = await sikIpucuTesti(sec, sec?.[Number(s.dogru_cevap)], s.id);
      jeton += r.jeton;
      if (r.takildi) takilan.push({ id: s.id, neden: `düzeltme: Jev soru olmadan doğruyu buldu (P=${r.pDogru.toFixed(2)})` });
    }
    if (takilan.length) {
      console.warn(`${zorla ? "UYARI (--zorla)" : "ENGELLENDİ"} — ${takilan.length} satır şık ipucu kapısına takılıyor:`);
      for (const t of takilan) {
        console.warn(`  ${t.id}: ${t.neden}`);
        if (!zorla) engellenen.add(t.id);
      }
      console.warn("  Doğru hamle: çeldiricileri doğru şıkla aynı tür/biçimde, eşit inandırıcı yaz ('Yalnız…', 'İkisi aynı' gibi kalıp yok).");
    } else {
      console.log(`Şık ipucu kapısı (Jev): ${ipucuAdaylari.length} satırın hepsi geçti.`);
    }
    console.log(`  Jev: ${jeton} girdi jetonu ($${maliyetUsd(jeton).toFixed(4)})`);
  } catch (e) {
    console.error("[soru:iceri] şık ipucu kapısı çalıştırılamadı:", String(e.message || e).slice(0, 200));
    if (!zorla) {
      console.error("Kapı doğrulanmadan hiçbir şey yazılmaz (bilerek geçirmek için --zorla).");
      process.exit(1);
    }
  }
}
if (yalnizKapi) {
  console.log(`--yalniz-kapi: veritabanına hiçbir şey yazılmadı · engellenecek satır ${engellenen.size}`);
  process.exit(engellenen.size ? 2 : 0);
}
const islenecek = temiz.filter((k) => !((k.karar === "duzelt" || k.karar === "onayla") && engellenen.has(k.id)));

try {
  const [satir] = sorgu(`select public.soru_denetim_ice_aktar(${jsonSabit(islenecek)}, 'sahip', '${parti.replace(/[^a-zA-Z0-9_-]/g, "")}', ${kuru}) as rapor;`);
  const rapor = satir?.rapor;
  const raporDosya = dosya.replace(/\.json$/, "") + (kuru ? "_kuru_rapor.json" : "_rapor.json");
  fs.writeFileSync(raporDosya, JSON.stringify(rapor, null, 2));
  const i = rapor?.islenen ?? {};
  if (kuru) console.log("KURU ÇALIŞMA — veritabanına hiçbir şey yazılmadı.");
  console.log(`${rapor?.toplam ?? 0} kayıt: onay ${i.onayla ?? 0} · düzeltme ${i.duzelt ?? 0} · kaldırma ${i.kaldir ?? 0} · atlanan ${rapor?.atlanan?.length ?? 0}`);
  for (const a of rapor?.atlanan ?? []) console.log(`  atlandı #${a.sira} ${a.id ?? "-"}: ${a.sebep}`);
  if (engellenen.size) console.log(`  kapılar (şık denge + şık ipucu): ${engellenen.size} satır yazılmadı (liste yukarıda)`);
  console.log("Rapor:", raporDosya);
} catch (e) {
  console.error("[soru:iceri]", e.message);
  process.exit(1);
}
