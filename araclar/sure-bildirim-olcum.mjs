// SÜRE DOLUMU BİLDİRİMİ ölçümü (16 Eki 2026) — BELLEKTE, canlı veritabanına HİÇ istek gitmez.
//
// Ne ölçer: Düello v4 nötr / cevap sorusu ve Hazine cevap / karar fazında, dokunmadan süresi dolan oyuncunun istemcisi
// sunucuya "cevabım yok" der (duello_cevap / kasa_cevap -1, kasa_karar null — 1063/1114). Sunucu yalnız kendi saatiyle süre
// dolduysa kabul eder ('Süre dolmadı'). Bu araç gerçek oyun/lib/sunucuSaati.js modülünü SANAL SAATLE çalıştırır:
//   · telefonun saati sunucudan ±5 sn kayık, ağ gidiş/dönüş ayrı ayrı dalgalı (yavaş 4G 75 ms + 0–600 ms kuyruk),
//     sunucu işlem süresi ara sıra 1–3,5 sn (16 Eki 14:04–14:05 UTC canlı yavaşlaması gibi; sunucu_zamani yanıtın sonunda)
//   · maç başında 3 yoklama, soru boyunca 4 sn'de bir + bitişe yakın 500 ms'de bir (sayfaların yoklama düzeni)
//   · ESKİ: bildirim sayaç saatine göre (bitiş − sayacSimdiMs + 150), red → 600 ms sonra yeniden
//   · YENİ: sureBildirimMs (sayaç saati / en iyi saat — GEÇ olanı) + red → sureBildirimTekrarMs
// Çıktı: sayaç 0'da kalma (sayaç 0'ı gösterdiği an → sonuç yanıtı + durum okuması istemciye vardı), red oranı, erken
// gönderim (sayaç hâlâ > 0 iken giden bildirim — oyuncunun dokunma hakkını keser; YENİ'de 0 olmalı).
//
// Kullanım: node araclar/sure-bildirim-olcum.mjs [--tur=4000] [--tohum=7]

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const TUR = Number(ARG.tur) || 4000;
let tohum = Number(ARG.tohum) || 7;
const r = () => ((tohum = (tohum * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// ---- sanal saat: performance.now = T, Date.now = T + telefon kayması ----
let T = 0, telefon = 0;
Object.defineProperty(globalThis, "performance", { value: { now: () => T, timeOrigin: 0 }, configurable: true });
Date.now = () => Math.round(T + telefon);
const S = await import("../oyun/lib/sunucuSaati.js");

const SUNUCU_FARK = 0;   // sunucu saati = T (tekdüze); telefon kayması ayrıca
const sunucu = (t) => t + SUNUCU_FARK;

function agBacagi(dalgali) { return 75 + (dalgali ? Math.pow(r(), 2) * 600 : r() * 40); }
function islem(yavas) { return yavas && r() < 0.5 ? 1000 + r() * 2500 : 40 + r() * 80; }

/** Bir istek: gönderim t0 (sanal T) → sunucu işlemi → yanıt. Saat örneği sayfadaki gibi eklenir. */
function istek(t0, dalgali, yavas) {
  const git = agBacagi(dalgali), p = islem(yavas), don = agBacagi(dalgali);
  const varis = t0 + git, bitti = varis + p, alindi = bitti + don;
  return { t0, varis, bitti, alindi, sz: sunucu(bitti) };
}
function ornekle(q) {
  const t = T; T = q.t0; const g = Date.now(); T = q.alindi; const a = Date.now();
  S.saatOrnegiEkle(g, a, q.sz);
  T = t;
}

function tek(yeni, senaryo) {
  S._saatOrnekleriniSifirla(); S._sayacSaatiniSifirla();
  T = 1_000_000 + r() * 1000; telefon = (r() - 0.5) * 10000;
  const dalgali = senaryo === "dalgali" || senaryo === "yavas_sunucu", yavas = senaryo === "yavas_sunucu";
  // maç açılışı: 3 okuma (ilki çoğu kez yavaş — sayfa açılırken bekleyen istek)
  let t = T;
  // ilk_yavas: açılıştaki 3 okumanın hepsi yavaş (sunucu 1,2–1,7 sn; damga yanıtın sonunda → en iyi örnek ~+700 ms önde);
  // soru sırasında normal yanıtlar gelince en iyi örnek düzelir, sayaç saati saniyede 100 ms kayar (16 Eki 14:15 Düello kaydı)
  for (let i = 0; i < 3; i++) { const q = senaryo === "ilk_yavas" ? (() => { const g = 75, pp = 1200 + r() * 500; return { t0: t, varis: t + g, bitti: t + g + pp, alindi: t + 2 * g + pp, sz: sunucu(t + g + pp) }; })() : istek(t, dalgali, yavas || i === 0); ornekle(q); t = q.alindi + 50; }
  T = t; S.sayacSaatiHizala();
  // soru: gösterim + 15 sn; bitiş sunucu saatiyle
  const bitis = sunucu(T) + 2000 + 15000;
  // soru boyunca yoklama (4 sn; bitişe 1,5 sn kala 500 ms) — her yanıt saat örneği; sayaç saati her 100 ms'de okunur
  let sonrakiYok = T + 4000, sayac0 = null, bildirimT = null, deneme = 0, kabulAlindi = null, red = 0, erken = false;
  const adim = 20;
  const bekleyen = [];
  let sonBildirimKur = null;
  const kur = (msSonra) => { sonBildirimKur = T + Math.max(0, msSonra); };
  // bildirim zamanlaması (sayfanın effect'i: faz başında bir kez)
  kur(yeni ? S.sureBildirimMs(bitis) : bitis - S.sayacSimdiMs() + 150);
  while (T < bitis + 15000 && kabulAlindi == null) {
    T += adim;
    // yoklama
    const kalan = bitis - S.sayacSimdiMs();
    if (T >= sonrakiYok) { const q = istek(T, dalgali, yavas); bekleyen.push(q); sonrakiYok = T + (kalan <= 1500 ? 500 : 4000); }
    for (let i = bekleyen.length - 1; i >= 0; i--) if (bekleyen[i].alindi <= T) { ornekle(bekleyen[i]); bekleyen.splice(i, 1); }
    if (sayac0 == null && S.sayacSimdiMs() >= bitis) sayac0 = T;
    // bildirim
    if (sonBildirimKur != null && T >= sonBildirimKur) {
      sonBildirimKur = null;
      // YENİ: gönderim anında yeniden bakılır (sayfadaki gibi) — erkense yeniden kurulur
      if (yeni) { const e = S.sureBildirimMs(bitis); if (e > 40) { kur(e); continue; } }
      if (S.sayacSimdiMs() < bitis - 50) erken = true;
      const q = istek(T, dalgali, yavas);
      bildirimT = T;
      if (sunucu(q.varis) < bitis) {   // 'Süre dolmadı' (sunucu tx başında now() < bitiş)
        red++;
        const yanit = q.alindi;
        // yanıt gelince yeniden deneme kurulur
        const bekle = yeni ? null : 600;
        const tYanit = yanit;
        // yanıt anına kadar ilerle, sonra kur
        while (T < tYanit) { T += adim; if (sayac0 == null && S.sayacSimdiMs() >= bitis) sayac0 = T; }
        for (let i = bekleyen.length - 1; i >= 0; i--) if (bekleyen[i].alindi <= T) { ornekle(bekleyen[i]); bekleyen.splice(i, 1); }
        if (deneme++ < 3) kur(bekle ?? S.sureBildirimTekrarMs(bitis));
      } else {
        // kabul → sayfa yukle() (durum okuması) → yeni faz istemcide
        const d = istek(q.alindi, dalgali, yavas);
        kabulAlindi = d.alindi;
      }
    }
  }
  if (sayac0 == null) sayac0 = kabulAlindi ?? T;
  return { sifirMs: Math.max(0, (kabulAlindi ?? T) - sayac0), red, erken, gecGonderim: bildirimT != null ? sunucu(bildirimT) - bitis : null };
}

const yuzde = (a, p) => { const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]); };
const sonuc = {};
for (const senaryo of ["normal", "ilk_yavas", "dalgali", "yavas_sunucu"]) {
  for (const yeni of [false, true]) {
    const k = [];
    const t0 = tohum;
    for (let i = 0; i < TUR; i++) k.push(tek(yeni, senaryo));
    tohum = t0;   // iki sürüm aynı rastgele dizinin aynı koşullarıyla
    const s = k.map((x) => x.sifirMs);
    sonuc[`${senaryo}·${yeni ? "yeni" : "eski"}`] = {
      sifir_ort: Math.round(s.reduce((a, b) => a + b, 0) / s.length), sifir_p50: yuzde(s, 0.5), sifir_p95: yuzde(s, 0.95),
      sifir_1sn_ustu: `${(100 * s.filter((x) => x > 1000).length / s.length).toFixed(1)}%`,
      red_orani: `${(100 * k.filter((x) => x.red > 0).length / k.length).toFixed(1)}%`,
      erken_gonderim: k.filter((x) => x.erken).length,
    };
  }
  tohum += 1000;
}
console.table(sonuc);
