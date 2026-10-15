// Uygulamanın kendi akış günlüğünden (lib/akisGunlugu.js → window.__akis, ?tani=1 / bd_ses_tani=1) çakışma özeti (15 Eki 2026).
// Girdi: araclar/yavas-android-olcum.mjs --mac çıktısı (maclar.<mod>.akis). Canlıya istek atmaz — yalnız dosya okur.
// Ölçü: FAZ TAŞMASI (ses istendiği fazdan sonraki fazda çaldı) · GEÇ (istekten > 250 ms sonra; maç sonu hariç) ·
// EŞZAMANLI (iki ayrı ses < 150 ms arayla çaldı; dokunuş hariç) · sonuç anı (an:basladi → an:bitti, yarıda sökülen yok mu).
// Kullanım: node araclar/akis-cakisma.mjs <olcum.json> [<olcum2.json> …]
import fs from "node:fs";

for (const dosya of process.argv.slice(2)) {
  const veri = JSON.parse(fs.readFileSync(dosya, "utf8"));
  for (const [mod, m] of Object.entries(veri.maclar ?? {})) {
    const akis = m.akis ?? [];
    if (!akis.length) { console.log(`${dosya} · ${mod}: akış günlüğü yok`); continue; }
    const fazlar = akis.filter((a) => a.olay === "faz" || a.olay === "final");
    const fazi = (t) => { let f = "önce"; for (const x of fazlar) if (x.t <= t) f = x.anahtar ?? "final"; return f; };
    const finalT = akis.find((a) => a.olay === "final")?.t ?? Infinity;
    const bekleyen = new Map();
    const calan = [], tasma = [], gec = [];
    for (const a of akis) {
      if (a.olay === "ses:istendi") { (bekleyen.get(a.rol) ?? bekleyen.set(a.rol, []).get(a.rol)).push(a.t); continue; }
      // çalmadan biten istek (iptal / geç indi / sessiz / atlandı …) kuyruktan düşer — sonraki eşleşmeler kaymasın
      if (/^ses:(iptal \(faz değişti\)$|gec-yuklendi|yuklenemedi|sessiz|calinamaz|arka-arkaya|atland|audiocontext)/.test(a.olay)) { bekleyen.get(a.rol)?.shift(); continue; }
      if (a.olay !== "ses:caldi" && !String(a.olay).startsWith("ses:yedek-ton")) continue;
      const ist = bekleyen.get(a.rol)?.shift();
      calan.push({ t: a.t, rol: a.rol });
      if (ist == null || a.t >= finalT) continue;
      if (fazi(ist) !== fazi(a.t)) tasma.push(`${a.rol} ${fazi(ist)}→${fazi(a.t)} +${a.t - ist} ms`);
      if (a.t - ist > 250) gec.push(`${a.rol} +${a.t - ist} ms`);
    }
    const eszaman = [];
    for (let i = 0; i < calan.length; i++) for (let j = i + 1; j < calan.length && calan[j].t - calan[i].t < 150; j++) {
      if ([calan[i].rol, calan[j].rol].includes("dokunus")) continue;
      eszaman.push(`${calan[i].rol} + ${calan[j].rol} (${calan[j].t - calan[i].t} ms, ${fazi(calan[j].t)})`);
    }
    const anlar = akis.filter((a) => a.olay === "an:basladi").length, biten = akis.filter((a) => a.olay === "an:bitti").length;
    const sayac = akis.filter((a) => a.olay === "sayac:basladi" && a.faz === "cevap").map((a) => a.sn);
    const sayim = akis.filter((a) => a.olay === "giris:sayi").map((a, i, l) => (i ? a.t - l[i - 1].t : null)).filter((x) => x != null);
    console.log(`${dosya} · ${mod}: faz ${fazlar.length} · çalan ses ${calan.length} · taşma ${tasma.length} · geç ${gec.length} · eşzamanlı ${eszaman.length}`
      + ` · an ${anlar} (bitti ${biten}) · soru sayacı ilk ${JSON.stringify(sayac)} · 3-2-1 aralık ${JSON.stringify(sayim)}`);
    for (const x of [...tasma.map((y) => `  taşma: ${y}`), ...gec.map((y) => `  geç: ${y}`), ...eszaman.map((y) => `  eşzamanlı: ${y}`)]) console.log(x);
  }
}
