// Hareket yönü ölçümü: yeni modda dış parçacık öğelerinin konumu (kare kare) → yukarı adım, yatay sapma.
import { chromium } from "playwright-core";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 } });
await c.addInitScript(() => { localStorage.setItem("qt_arka_plan_onizleme_tam", JSON.stringify({ mod: "yeni" })); });
const p = await c.newPage();
await p.goto(""+(process.env.ADRES||"http://localhost:5173")+"/oyun/tasarim/arka-plan/olcum/index.html"); await p.waitForTimeout(1200);
for (const t of ["kar", "yaprak", "su", "gece"]) {
  const bolum = p.locator(`section[data-bolum="${t}"]`); await bolum.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  const sonuc = await p.evaluate(async (t) => {
    const kok = document.querySelector(`section[data-bolum="${t}"] .abp`);
    const sinif = kok.className;
    const ogeler = [...kok.querySelectorAll(t === "gece" ? ".abp-gece-yildiz" : ".abp-y")];
    const kr = kok.getBoundingClientRect();
    const iz = ogeler.map(() => []);
    const bas = performance.now();
    await new Promise((res) => { const f = () => { const z = performance.now() - bas; ogeler.forEach((o, i) => { const r = o.getBoundingClientRect(); iz[i].push([z, r.left - kr.left, r.top - kr.top, getComputedStyle(o).opacity]); }); if (z < 9000) requestAnimationFrame(f); else res(); }; f(); });
    return { sinif, n: ogeler.length, iz, kh: kr.height };
  }, t);
  if (t === "gece") { console.log(t, "sınıf:", sonuc.sinif.replace(/\s+/g, " "), "yıldız öğesi:", sonuc.n); continue; }
  let yukari = 0, atlama = 0, yerinde = 0, maxYatayHiz = 0, toplamYatay = 0, yonler = {};
  const hareketler = [];
  sonuc.iz.forEach((dizi) => {
    let ust = 0, yer = 0; let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
    for (let i = 1; i < dizi.length; i++) {
      const dt = (dizi[i][0] - dizi[i - 1][0]) / 1000; if (dt <= 0) continue;
      const dy = dizi[i][2] - dizi[i - 1][2]; const dx = dizi[i][1] - dizi[i - 1][1];
      if (Math.abs(dy) > 30) { atlama++; continue; }
      if (t !== "su" && dy < -0.02) ust++;
      if (Math.abs(dy) < 0.001) yer++;
      maxYatayHiz = Math.max(maxYatayHiz, Math.abs(dx) / dt);
    }
    dizi.forEach((d) => { xmin = Math.min(xmin, d[1]); xmax = Math.max(xmax, d[1]); ymin = Math.min(ymin, d[2]); ymax = Math.max(ymax, d[2]); });
    yukari += ust; yerinde += yer; hareketler.push({ yatay: +(xmax - xmin).toFixed(1), dikey: +(ymax - ymin).toFixed(0) });
  });
  const yatayler = hareketler.map((h) => h.yatay);
  console.log(t, "sınıf:", sonuc.sinif.replace(/\s+/g, " ").slice(0, 60), "| öğe:", sonuc.n, "| yukarı-adım:", yukari, "| dikiş atlaması(toplam):", atlama, "| durgun kare:", yerinde, "| en büyük yatay hız px/sn:", maxYatayHiz.toFixed(1), "| yatay genlik en çok:", Math.max(...yatayler), "px");
  if (t === "su") {
    // baloncuk: dağılım — başlangıç x'lerinin aralığı, belirme (opaklık 0→>0) ve alttan giriş sayısı
    const xs = sonuc.iz.map((d) => d[0][1]).sort((a, b) => a - b);
    const araliklar = xs.slice(1).map((v, i) => v - xs[i]);
    const yuk = sonuc.iz.filter((d) => d[d.length - 1][2] < d[0][2] - 5 || true).length;
    let asagi = 0; sonuc.iz.forEach((d) => { for (let i = 1; i < d.length; i++) { const dy = d[i][2] - d[i - 1][2]; if (Math.abs(dy) < 30 && dy > 0.3) asagi++; } });
    console.log("  su: x aralığı", xs[0].toFixed(0), "-", xs[xs.length - 1].toFixed(0), "| en küçük komşu aralığı", Math.min(...araliklar).toFixed(1), "| aşağı adım (sallanma gürültüsü dışında):", asagi);
    // belirme: opaklığı 0'dan >0.3'e geçen baloncuk (kart içinde), alttan girenler (başlangıç y>kartın altı)
    let belir = 0, gir = 0;
    sonuc.iz.forEach((d) => { for (let i = 1; i < d.length; i++) { if (+d[i - 1][3] < 0.05 && +d[i][3] > 0.05 && d[i][2] < sonuc.kh - 10) { belir++; break; } } });
    console.log("  su: 9 sn'de kartın içinde beliren baloncuk:", belir);
  }
}
await b.close();
