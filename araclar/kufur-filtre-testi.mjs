// Küfür filtresi testi (620/621): canlı kufur_maskele / kufur_ad_uygun fonksiyonlarını masum ve küfürlü örneklerle
// dener (yalnız okur). Yeni kelime ya da izinli kelime eklendikten sonra çalıştır: node araclar/kufur-filtre-testi.mjs
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const MESAJ = [
  // [metin, maskelenmeli mi]
  ["Bugün çok sıkıldım ya", false], ["SIKILDIM valla", false], ["Şikâyet ettim onu", false], ["şikayetçiyim", false],
  ["Maçta şike var sanki", false], ["Eski sikke koleksiyonum", false], ["Ağır siklette boks", false],
  ["Kemal ve Cemal geldi", false], ["Mal varlığı sorusu zordu", false], ["Top oynayalım", false], ["bot gibi oynadın :)", false],
  ["I got it, thanks", false], ["Amin, inşallah kazanırız", false], ["Dickens'ı severim", false], ["Işık hızı sorusu", false],
  ["amcam geldi", false], ["kaşık düştü", false], ["Salatayı unuttum", false], ["Scunthorpe United", false], ["salak, git", true],
  ["siktir git", true], ["S1KT1R", true], ["s.i.k.t.i.r", true], ["o r o s p u", true], ["orospu çocuğu", true],
  ["0r0spu", true], ["amk ya", true], ["aq ne oldu", true], ["siiiiktir", true], ["şerefsiz herif", true],
  ["serefsizsin", true], ["piç", true], ["fuck you", true], ["F*U*C*K", true], ["you are a bitch", true],
  ["motherfucker", true], ["salak mısın", true], ["salaklar", true], ["gerizekalı", true], ["yavşak", true],
  ["@mk", true], ["$ik", true], ["ibne", true], ["pezevenk", true],
  // 653: tamamı BÜYÜK yazım (I hem ı hem i okunur); ı'lı okuması yaygın kelime olanlar masum kalır
  ["SIKTIR", true], ["SIKTIR GIT", true], ["SIKEYIM", true], ["GERIZEKALI", true], ["IBNE", true], ["AMCIK", true],
  ["SIKINTI", false], ["SIKISTIM", false], ["SIK SIK", false], ["ISIK", false], ["SIKKE", false], ["SISTEM", false],
];
// [metin, dil, maskelenmeli mi] — 653: İngilizce hesapta çıplak "pic" (picture) masum; piç/p1c/p i c hep maske
const MESAJ_DIL = [
  ["send me a pic", "en", false], ["nice PIC!", "en", false], ["picture", "en", false], ["pic", "tr", true], ["PIC", "tr", true],
  ["send me a pic", null, true], ["piç", "en", true], ["PİÇ", "en", true], ["PIÇ", "en", true], ["p1c", "en", true], ["p i c", "en", true],
];
const AD = [
  ["Kemal", true], ["Cemal_34", true], ["Robot123", true], ["Topcu", true], ["Sikkeci", true], ["Isik", true],
  ["Scunthorpe", true], ["Assassin", true], ["Dickens", true],
  ["orospu", false], ["0r0spu_34", false], ["benorospu", false], ["s1k", false], ["fuck_you", false], ["admin", false],
  ["Admin_1", false], ["bot", false], ["mal", false], ["amk", false], ["Serefsiz", false], ["xXsiktirXx", false],
  ["SIKTIR", false], ["XSIKTIRX", false], ["SIKTIR_GIT", false], ["IBNE", false], ["ISIK", true], ["SIKINTI", true], ["KEMAL", true], ["MISIRLI", true],
];
try {
  let hata = 0;
  console.log("— MESAJ (maskeleme)");
  for (const [m, beklenen] of MESAJ) {
    const [r] = await db.sorgu(`select public.kufur_maskele(${alintila(m)}) as s`);
    const maskeli = r.s !== m;
    const ok = maskeli === beklenen; if (!ok) hata++;
    console.log(`${ok ? "  ✓" : "  ✗"} ${beklenen ? "MASKE " : "MASUM "} "${m}" → "${r.s}"`);
  }
  console.log("— MESAJ (dile göre pic)");
  for (const [m, dil, beklenen] of MESAJ_DIL) {
    const [r] = await db.sorgu(`select public.kufur_maskele_dil(${alintila(m)}, ${dil ? alintila(dil) : "null"}) as s`);
    const maskeli = r.s !== m;
    const ok = maskeli === beklenen; if (!ok) hata++;
    console.log(`${ok ? "  ✓" : "  ✗"} ${beklenen ? "MASKE " : "MASUM "} [${dil ?? "-"}] "${m}" → "${r.s}"`);
  }
  console.log("— TAKMA AD");
  for (const [a, uygun] of AD) {
    const [r] = await db.sorgu(`select public.kufur_ad_uygun(${alintila(a)}) as u`);
    const ok = (r.u === "t") === uygun; if (!ok) hata++;
    console.log(`${ok ? "  ✓" : "  ✗"} ${uygun ? "UYGUN " : "RED   "} "${a}" → ${r.u === "t" ? "uygun" : "reddedildi"}`);
  }
  console.log(`\nhatalı: ${hata} / ${MESAJ.length + AD.length}`);
} catch (e) { console.log("HATA:", e.message); }
finally { await db.kapat(); }
