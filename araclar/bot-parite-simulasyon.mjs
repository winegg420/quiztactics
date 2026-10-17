// Bot paritesi 1126 — maç sonucu simülasyonu (YEREL, bellekte; veritabanına gitmez — CLAUDE.md simülasyon kuralı).
// Girdiler canlı ölçümden (17 Eki 2026, son 30 gün, salt okuma — docs/raporlar/RAPOR-bot-parite.md):
//   Klasik: bot doğru %56,3 · insan %42,7 · bot joker ~1,1/maç (eski: yalnız Zaman Baskısı / Soru Değiştir) · insan joker ~0,8/maç
//   Düello v4: bot doğru %64,1 · insan %48,4 (yanıtsız dahil) · bot joker 0 (eski)
// Model: Zaman Baskısı / Soru Değiştir / Ek Süre isabeti değiştirmez sayılır (iki tarafta da aynı; ölçülemiyor).
// 50:50 → yanlışsa %50 doğruya döner; İkinci Şans → yanlışsa kalan 3 şıktan biri; Çifte Puan → doğru 20; Sigorta → yanlış 5.
// Kullanım: node araclar/bot-parite-simulasyon.mjs [mac_sayisi]
const N = Number(process.argv[2] || 200000);
let tohum = 20261017;
const rnd = () => { tohum = (tohum * 1664525 + 1013904223) >>> 0; return tohum / 2 ** 32; };
const normal = (o, s) => { const u = Math.max(rnd(), 1e-9), v = rnd(); return o + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const sinirla = (x) => Math.min(0.98, Math.max(0.05, x));

// Joker seçimi: soru başı q olasılıkla, türler eşit, tür başı ≤ turMax, maçta ≤ topMax
function jokerSec(sayac, turler, q, turMax, topMax) {
  if (rnd() >= q || sayac.top >= topMax) return null;
  const aday = turler.filter((t) => (sayac[t] ?? 0) < turMax);
  if (!aday.length) return null;
  const t = aday[Math.floor(rnd() * aday.length)];
  sayac[t] = (sayac[t] ?? 0) + 1; sayac.top++;
  return t;
}
function cevap(p, joker) {
  let d = rnd() < p;
  if (!d && joker === 'elli' && rnd() < 0.5) d = true;
  if (!d && joker === 'ikinci_sans' && rnd() < 1 / 3) d = true;
  return d;
}
const puan = (d, j) => (d ? (j === 'cifte_puan' ? 20 : 10) : (j === 'sigorta' ? 5 : 0));

// İnsan jokeri: canlı Klasik dağılımı (elli 58, soru_degistir 21, cifte 16, sure 13, ikinci 10, zb 3, sigorta 1 → ~0,8/maç)
const INSAN_K = ['elli', 'elli', 'elli', 'elli', 'soru_degistir', 'cifte_puan', 'sure', 'ikinci_sans'];
function klasik(yeni) {
  const pb = sinirla(normal(0.563, 0.08)), ph = sinirla(normal(0.427, 0.12));
  let sb = 0, sh = 0;
  const jb = { top: 0 }, jh = { top: 0 };
  const botTurler = yeni ? ['elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'sigorta', 'cifte_puan', 'ikinci_sans'] : ['zaman_baskisi', 'soru_degistir'];
  for (let i = 0; i < 20; i++) {
    const b = jokerSec(jb, botTurler, 1.12 / 20, 2, 6);
    const h = jokerSec(jh, INSAN_K, 0.8 / 20, 2, 6);
    const db = cevap(pb, b), dh = cevap(ph, h);
    sb += puan(db, b); sh += puan(dh, h);
  }
  return sb > sh ? 1 : sb < sh ? -1 : 0;
}
// Düello v4 (sadeleştirilmiş kurallar: nötr — tek bilen kontrol alır; saldırı — kontrol bilir/rakip bilemez seri+1, ters → el değişir
// (seri 1); seri 3 kazanır; 20 soruda biterse Son Düello: tek bilen kazanır, 10 soruda çıkmazsa berabere; Son Düello jokersiz)
function duello(yeni) {
  const pb = sinirla(normal(0.641, 0.08)), ph = sinirla(normal(0.484, 0.12));
  let kontrol = null, seri = 0;
  const jb = { top: 0 };
  const turler = ['elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans'];
  for (let i = 0; i < 20; i++) {
    const b = yeni ? jokerSec(jb, turler, 0.15 * 0.8, 2, 4) : null;   // %15 soru başı, ~%80'i an içinde kabul
    const db = cevap(pb, b), dh = cevap(ph, null);
    if (kontrol === null) { if (db !== dh) { kontrol = db ? 'b' : 'h'; seri = 0; } continue; }
    const dk = kontrol === 'b' ? db : dh, dr = kontrol === 'b' ? dh : db;
    if (dk && !dr) { seri++; if (seri >= 3) return kontrol === 'b' ? 1 : -1; }
    else if (dr && !dk) { kontrol = kontrol === 'b' ? 'h' : 'b'; seri = 1; }
  }
  for (let i = 0; i < 10; i++) { const db = rnd() < pb, dh = rnd() < ph; if (db !== dh) return db ? 1 : -1; }
  return 0;
}
function oran(f, yeni) {
  let g = 0, b = 0, m = 0;
  for (let i = 0; i < N; i++) { const r = f(yeni); if (r > 0) g++; else if (r < 0) m++; else b++; }
  return { bot: (100 * g / N).toFixed(1), berabere: (100 * b / N).toFixed(1), insan: (100 * m / N).toFixed(1) };
}
tohum = 1; const k0 = oran(klasik, false); tohum = 1; const k1 = oran(klasik, true);
tohum = 1; const d0 = oran(duello, false); tohum = 1; const d1 = oran(duello, true);
console.log(`${N} maç / mod (yerel simülasyon)`);
console.log(`Klasik    önce: bot %${k0.bot} · berabere %${k0.berabere} · insan %${k0.insan}   sonra: bot %${k1.bot} · berabere %${k1.berabere} · insan %${k1.insan}`);
console.log(`Düello v4 önce: bot %${d0.bot} · berabere %${d0.berabere} · insan %${d0.insan}   sonra: bot %${d1.bot} · berabere %${d1.berabere} · insan %${d1.insan}`);
