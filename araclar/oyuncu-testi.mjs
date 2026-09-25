// ============================================================
// OYUNCU TESTİ — "her soruda dokunabiliyor muyum?" (23 Eylül 2026)
//
// Neden: eski uçtan uca betik "açık şık varsa dokun" diyordu. Açık şık
// yoksa sessizce bekledi, soru "Yanıtsız" kapandı, maç sürdü ve test GEÇTİ.
// Düello'da saldıranın şıkları kapalıyken hata bu yüzden saatlerce kaçtı.
//
// Kural (PROJECT_CONTEXT.md › Test kuralı):
//   · Oyuncunun cevap vermesi gereken HER soruda şıklar dokunulabilir olmalı.
//     Değilse test ANINDA başarısız — sebep ve tanı bilgisi yazılır.
//   · Her dokunuştan sonra cevabın SUNUCUYA ulaştığı veritabanından doğrulanır.
//   · Düello: test hesabı en az 3 kez saldıran (kategoriyi seçen), 3 kez savunan
//     olur; canlar eşit tutularak mümkünse uzatmaya kadar oynanır.
//   · Her yeni ekranda 360 ve 390 px ölçülür: dokunulabilir öğelerin kutuları
//     birbirine biniyorsa başarısız. Maç öncesi ekran ve maç içi skill çubuğu dahil.
//   · Telefon taklidi (dokunuş, mobil), gerçek akış, bota karşı.
//
// Kullanım:
//   npm run dev                                   (yerel için, başka kabukta)
//   node araclar/oyuncu-testi.mjs [--adres=https://quiztactics.vercel.app]
//        [--mod=duello,klasik,turnuva] [--gorsel] [--mac=2] [--genislik=390,360,1280]
//   --gorsel : her ekranın 360/390 görüntüsü oyuncu-testi-gorseller/ altına
//   --mac    : Düello'da kapsam (3 saldıran + 3 savunan) dolmazsa en çok kaç maç
//   --sifir  : "ERKEN SIFIR" ölçümü için bir soruyu BİLEREK yanıtsız bırakır (süre dolar): gösterilen sayacın 0'a
//              düştüğü an ile sunucu bitişi arasındaki fark ölçülür (> 300 ms = başarısız). Düello: 2. turdan sonraki
//              ilk cevap fazı; Klasik: 2. soru, sonra test biter (yanıtsız soru bu bayrakla başarısız sayılmaz).
//
// Oturum: `.arayuz-denetim-oturum.json` (araclar/arayuz-denetim.mjs yazar). Başka
// bir adres verilirse o oturumun localStorage'ı yeni adrese taşınır.
// Veritabanı: araclar/pg-mini.mjs + .env.local (yalnız SELECT).
// Çıkış kodu: 0 = geçti, 1 = başarısız.
// ============================================================
import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const ADRES = String(ARG.adres || "http://127.0.0.1:5173").replace(/\/$/, "");
const MODLAR = String(ARG.mod || "duello,klasik,turnuva").split(",");
const GORSEL = Boolean(ARG.gorsel);
const SIFIR_OLC = Boolean(ARG.sifir);

const EN_COK_MAC = Number(ARG.mac || 2);
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const GORSEL_DIZIN = path.resolve("oyuncu-testi-gorseller");
// --genislik=390,360,1280 ile masaüstü de ölçülür (ilk değer maçın oynandığı genişlik).
const GENISLIKLER = String(ARG.genislik || "390,360").split(",").map(Number);
const YUKSEKLIK = 800;

const hatalar = [];     // başarısız maddeler
const notlar = [];      // bilgi
let gorselNo = 0;

function basarisiz(neden, ek) {
  hatalar.push(ek ? `${neden} — ${JSON.stringify(ek)}` : neden);
  console.log("  ✗ BAŞARISIZ:", neden, ek ? JSON.stringify(ek) : "");
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- veritabanı
const db = new PgIstemci(await baglantiDizgisi());
await db.baglan();
async function sorgu(sql) {
  try { const r = await db.sorgu(sql); return Array.isArray(r) ? r : (r?.rows ?? []); }
  catch (e) { throw new Error(`Veritabanı sorgusu başarısız: ${e.message}`); }
}

// ---------------------------------------------------------------- tarayıcı
if (!fs.existsSync(OTURUM)) {
  console.error("Oturum dosyası yok:", OTURUM, "— önce `node araclar/arayuz-denetim.mjs` çalıştır.");
  process.exit(1);
}
const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
const yerel = durum.origins?.[0]?.localStorage ?? [];
const tokenKaydi = yerel.find((x) => x.name.includes("auth-token"));
const BEN = tokenKaydi ? JSON.parse(tokenKaydi.value).user?.id : null;
if (!BEN) { console.error("Oturumda kullanıcı yok."); process.exit(1); }

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const baglam = await tarayici.newContext({
  ...devices["Pixel 7"],
  viewport: { width: GENISLIKLER[0], height: YUKSEKLIK },
  // Oturum başka bir adrese taşınır (önizleme / canlı): localStorage ilk yüklemeden önce yazılır.
  ...(new URL(ADRES).origin === durum.origins?.[0]?.origin ? { storageState: OTURUM } : {}),
});
if (new URL(ADRES).origin !== durum.origins?.[0]?.origin) {
  await baglam.addInitScript((kayitlar) => {
    if (sessionStorage.getItem("__oyuncuTestiYuklendi")) return;
    for (const k of kayitlar) localStorage.setItem(k.name, k.value);
    sessionStorage.setItem("__oyuncuTestiYuklendi", "1");
  }, yerel);
}
// Sayaç kaydı: ekrandaki geri sayım rakamı her değiştiğinde zaman + tanı (faz, sunucu bitişi,
// saat farkı) yazılır. Düello sonunda "ilk 3 saniye gerçek zamanla aynı hızda mı" ölçülür.
await baglam.addInitScript(() => {
  window.__sayacKayit = [];
  let son = "";
  const tik = () => {
    const el = document.querySelector(".qt-sayac .qt-sayac-sayi, .bd-duello-sayac");
    const t = window.__bdTani ?? null;
    if (el && t) {
      const sayi = Number(el.textContent.trim());
      const anahtar = `${t.faz}|${sayi}|${t.hedefBitis}`;
      if (anahtar !== son) {
        son = anahtar;
        window.__sayacKayit.push({ an: Date.now(), sayi, faz: t.faz, soru: t.soru ?? null, hedef: t.hedefBitis, fark: t.farkMs,
          kilitli: Boolean(t.kilitli), sureler: t.sureler ?? null, mod: t.mod ?? null });
      }
    }
    requestAnimationFrame(tik);
  };
  requestAnimationFrame(tik);
});
const s = await baglam.newPage();

// Sayaç kaydını fazlara ayırıp çözümler: gecikme = ilk görünüş (sunucu saatine çevrilmiş) −
// fazın sunucudaki başlangıcı; adımlar = ilk 3 saniyedeki rakam düşüşleri arası süre.
async function sayacRaporu(etiket) {
  const kayit = await s.evaluate(() => { const k = window.__sayacKayit ?? []; window.__sayacKayit = []; return k; }).catch(() => []);
  if (ARG.sayacdebug) console.log(`  [sayaç ham kayıt ${etiket}] ` + JSON.stringify(kayit.map((k) => [k.an - (kayit[0]?.an ?? 0), k.sayi, k.faz, k.kilitli ? 1 : 0])));
  const parcalar = [];
  let p = null;
  for (const k of kayit) {
    // Aynı faz içinde rakamın ARTMASI yeni faz değildir: Ek Süre (+sn) ya da Soru Değiştir — sayaç
    // saniyenin ortasından yeniden başlar, ilk adımı doğal olarak kısadır. Bu parçalar ölçülmez.
    // Klasik'te her soru aynı "cevap" fazındadır: soru numarası değişince yeni parça (Ek Süre sıçraması DEĞİL).
    if (!p || k.faz !== p.faz || k.soru !== p.ilk.soru || k.sayi > p.son.sayi) {
      p = { faz: k.faz, ilk: k, satirlar: [], son: k, skillSicramasi: Boolean(p && k.faz === p.faz && k.soru === p.ilk.soru) };
      parcalar.push(p);
    }
    p.satirlar.push(k); p.son = k;
  }
  const sonuc = [];
  for (const q of parcalar) {
    if (!["kategori", "cevap"].includes(q.faz) || !q.ilk.hedef || q.ilk.kilitli || q.skillSicramasi) continue;
    const tam = Number(q.faz === "kategori" ? q.ilk.sureler?.kategori ?? 8 : q.ilk.sureler?.cevap ?? 15);
    const pay = Number(q.ilk.sureler?.gosterim_payi_ms ?? 0);
    const baslangic = new Date(q.ilk.hedef).getTime() - tam * 1000 - pay;
    const gecikme = q.ilk.an + Number(q.ilk.fark || 0) - baslangic;
    const ilk3 = q.satirlar.filter((x) => x.an - q.ilk.an <= 3200);
    const adimlar = ilk3.slice(1).map((x, i) => x.an - ilk3[i].an);
    // ERKEN SIFIR: gösterilen sayaç 0'a düştüğü an, sunucu bitişinden (hedef, istemci saatine çevrilmiş) kaç ms ÖNCE.
    // Pozitif = erken sıfır. Yalnız süresi gerçekten dolan (kilitlenmemiş) fazlarda görülür.
    const sifir = q.satirlar.find((x) => x.sayi === 0 && !x.kilitli && x.hedef);
    const sifirErken = sifir ? Math.round(new Date(sifir.hedef).getTime() - Number(sifir.fark || 0) - sifir.an) : null;
    sonuc.push({ faz: q.faz, ilkRakam: q.ilk.sayi, tam, gecikme: Math.round(gecikme), adimlar, sifirErken });
  }
  for (const r of sonuc) {
    const hizli = r.adimlar.filter((a) => a < 900);
    const sifirMetni = r.sifirErken === null ? "" : `, sıfır gerçek bitişten ${r.sifirErken} ms ${r.sifirErken > 300 ? "önce  ← ERKEN SIFIR" : "önce/sonra (tamam)"}`;
    console.log(`  ⏱ ${etiket} ${r.faz}: ilk görünüş ${r.gecikme} ms sonra, ilk rakam ${r.ilkRakam}/${r.tam}, ilk 3 sn adımlar ${r.adimlar.join(" · ")} ms${hizli.length ? "  ← HIZLI" : ""}${sifirMetni}`);
  }
  return sonuc;
}
const konsol = [];
s.on("console", (m) => { if (m.type() === "error") konsol.push(m.text().slice(0, 200)); });
s.on("pageerror", (e) => konsol.push("pageerror: " + String(e).slice(0, 200)));

// ---------------------------------------------------------------- ölçüm: kutu kesişimi
// Görünür ve dokunulabilir öğeler; biri ötekinin atası/torunu değilse kutuları
// 4 px²'den fazla kesişmemeli. Kırpılmış (overflow ile gizli) kısım hesaba katılmaz.
async function kesisimOlc() {
  return s.evaluate(() => {
    const SECICI = "button, a[href], [role=button], [role=switch], input:not([type=hidden]), select, textarea, summary";
    const gorunur = (el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05 || cs.pointerEvents === "none") return null;
      let r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      // Atalardaki overflow kırpması
      let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.display === "none" || ac.visibility === "hidden" || Number(ac.opacity) < 0.05) return null;
        if (/(hidden|clip|auto|scroll)/.test(ac.overflow + ac.overflowX + ac.overflowY)) {
          const ar = a.getBoundingClientRect();
          x1 = Math.max(x1, ar.left); y1 = Math.max(y1, ar.top); x2 = Math.min(x2, ar.right); y2 = Math.min(y2, ar.bottom);
        }
      }
      if (x2 - x1 < 1 || y2 - y1 < 1) return null;
      return { x1, y1, x2, y2 };
    };
    const ad = (el) => {
      const t = (el.getAttribute("aria-label") || el.innerText || el.value || "").trim().replace(/\s+/g, " ").slice(0, 30);
      return `${el.tagName.toLowerCase()}.${String(el.className || "").split(" ")[0]}「${t}」`;
    };
    const sabitMi = (el) => { for (let a = el; a; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
    // Ortasında başka bir katman (ör. açık pencerenin arka perdesi) duran öğe o an dokunulamaz:
    // ölçüme girmez. Ortasını BAŞKA bir dokunulabilir öğe örtüyorsa bu bir çakışmadır.
    const ortulen = [];
    const ustteMi = (el, k) => {
      const cx = (k.x1 + k.x2) / 2, cy = (k.y1 + k.y2) / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return true;   // ekran dışı: kaydırınca görünür
      const ust = document.elementFromPoint(cx, cy);
      if (!ust || el === ust || el.contains(ust) || ust.contains(el)) return true;
      const ustDok = ust.closest(SECICI);
      if (ustDok && !ustDok.contains(el) && !el.contains(ustDok)) {
        ortulen.push({ metin: ad(el) + " ortası " + ad(ustDok) + " altında", sabitFark: sabitMi(el) !== sabitMi(ustDok) });
      }
      return false;
    };
    // Açık modal pencere varsa arkası dokunulamaz: yalnız pencerenin içi ölçülür.
    const modallar = [...document.querySelectorAll("[aria-modal=true], dialog[open]")].filter((m) => gorunur(m) || m.getBoundingClientRect().height > 0);
    const kapsam = modallar.length ? modallar[modallar.length - 1] : document;
    const liste = [...kapsam.querySelectorAll(SECICI)].map((el) => ({ el, k: gorunur(el), sabit: sabitMi(el) }))
      .filter((x) => x.k && ustteMi(x.el, x.k));
    const cakisan = [];
    const sabitle = [];   // akıştaki öğe × sabit katman (menü): kaydırınca açılabilir
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const A = liste[i], B = liste[j];
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
        const w = Math.min(A.k.x2, B.k.x2) - Math.max(A.k.x1, B.k.x1);
        const h = Math.min(A.k.y2, B.k.y2) - Math.max(A.k.y1, B.k.y1);
        if (w > 2 && h > 2 && w * h > 4) (A.sabit !== B.sabit ? sabitle : cakisan).push(`${ad(A.el)} × ${ad(B.el)} (${Math.round(w)}×${Math.round(h)} px)`);
      }
    }
    const tasma = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    // Sabit katmanın (menü) örttüğü öğe kaydırınca açılabilir → ayrı kontrol (sabitle).
    for (const o of ortulen) (o.sabitFark ? sabitle : cakisan).push(o.metin);
    return { cakisan: cakisan.slice(0, 8), sabitle, tasma };
  });
}

// Ekranı iki genişlikte ölç (ve istenirse görüntüsünü al). Ölçüm maç akışını
// durdurmasın diye kısa tutulur; genişlik sonunda 390'a döner.
async function ekranOlc(etiket) {
  for (const w of GENISLIKLER) {
    await s.setViewportSize({ width: w, height: YUKSEKLIK });
    await s.waitForTimeout(120);
    const o = await kesisimOlc();
    if (o.sabitle.length) {
      // Sabit menünün altında kalan öğe: sayfa en üstte ve en altta da örtülüyse ulaşılamaz.
      const y0 = await s.evaluate(() => window.scrollY);
      await s.evaluate(() => window.scrollTo(0, 0)); await s.waitForTimeout(80);
      const ust = (await kesisimOlc()).sabitle;
      await s.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await s.waitForTimeout(80);
      const alt = (await kesisimOlc()).sabitle;
      await s.evaluate((y) => window.scrollTo(0, y), y0);
      const kalici = ust.filter((x) => alt.includes(x));
      if (kalici.length) basarisiz(`${etiket} @${w}px: öğe sabit katmanın altında kalıyor, kaydırınca da açılmıyor`, kalici.slice(0, 6));
    }
    if (o.cakisan.length) basarisiz(`${etiket} @${w}px: dokunulabilir öğeler üst üste biniyor`, o.cakisan);
    if (o.tasma) basarisiz(`${etiket} @${w}px: yatay taşma`);
    if (GORSEL) {
      fs.mkdirSync(GORSEL_DIZIN, { recursive: true });
      const dosya = `${String(++gorselNo).padStart(3, "0")}-${etiket.replace(/[^a-z0-9ğüşıöç-]+/gi, "_")}-${w}.png`;
      await s.screenshot({ path: path.join(GORSEL_DIZIN, dosya) });
    }
  }
  await s.setViewportSize({ width: GENISLIKLER[0], height: YUKSEKLIK });
}

async function tanitimlariGec() {
  for (let i = 0; i < 6; i++) {
    const b = s.getByRole("button", { name: /^(Geç|Anladım|Tamam|Kapat)$/ });
    if (!(await b.count())) return;
    await b.last().tap().catch(() => {});
    await s.waitForTimeout(500);
  }
}

// Seçiciler eski (.bd-*) ve Yön A (.qt-sik, .m2-kat, .qt-soru-metin) sınıflarını birlikte tanır.
// Açık (disabled olmayan, elenmemiş) şık sayısı; süre içinde en az 2 olmalı.
async function acikSiklar() {
  return s.locator(":is(.bd-secenek, .qt-sik):not([disabled]):not(.elendi):not(.qt-sik--elendi)").count();
}

// ================================================================ DÜELLO
async function duelloMaci(kapsam) {
  await s.goto(ADRES + "/duello", { waitUntil: "domcontentloaded" });
  await s.waitForTimeout(2500);
  await tanitimlariGec();
  await ekranOlc("duello-lobi");
  const macMi = () => /\/duello\/[0-9a-f-]{36}/.test(s.url());
  for (let i = 0; i < 10 && !macMi(); i++) {
    const gec = s.getByRole("button", { name: /^(Geç|İleri)$/ });
    if (await gec.count()) { await gec.last().tap().catch(() => {}); await s.waitForTimeout(600); continue; }
    const ara = s.getByRole("button", { name: /Rakip ara/i });
    if (await ara.count()) await ara.first().tap().catch(() => {});
    await s.waitForTimeout(3000);
  }
  try { await s.waitForURL(/\/duello\/[0-9a-f-]{36}/, { timeout: 45000 }); }
  catch { basarisiz("Düello: rakip bulunamadı / maça girilemedi"); return "kritik"; }
  const id = s.url().match(/duello\/([0-9a-f-]{36})/)[1];
  // Yarım kalmış bir maça katılındıysa (sunucu aktif maça yönlendirir) önceki turlar bu testin değildir.
  const [giris] = await sorgu(`select coalesce(max(id), 0) m from duello_hamleler where duello_id = ${alintila(id)}`);
  const girisHamle = Number(giris?.m ?? 0);
  if (girisHamle > 0) console.log(`  (yarım maça katılındı — ${girisHamle} numaralı hamleye kadar olanlar sayılmaz)`);
  const [m] = await sorgu(`select surum from duellolar where id = ${alintila(id)}`);
  console.log(`  maç ${id} (sürüm ${m?.surum})`);
  if (Number(m?.surum) !== 2) { basarisiz("Düello: maç sürüm 2 değil", { surum: m?.surum }); }

  let sonEkran = "";
  let sonCevapAnahtar = "";
  let skillSirasi = 0;
  let sifirTur = null;   // --sifir: bilerek yanıtsız bırakılan turun numarası
  const bas = Date.now();
  let turBas = Date.now();
  let sonAdim = "başlangıç";
  while (Date.now() - bas < 15 * 60 * 1000) {
    // Döngü bir turda 4 sn'den uzun sürerse testin kendisi soru kaçırabilir: adımı yaz.
    if (Date.now() - turBas > 4000) console.log(`  ! test döngüsü ${((Date.now() - turBas) / 1000).toFixed(1)} sn takıldı (son adım: ${sonAdim})`);
    turBas = Date.now();
    sonAdim = "durum okuma";
    const t = await s.evaluate(() => window.__bdTani ?? null);
    const [d] = await sorgu(`select durum, faz, tur, saldiran, uzatma, soru_id, cevaplar, oyuncu1, can1, can2,
                               (select dogru_cevap from questions q where q.id = soru_id) dogru
                              from duellolar where id = ${alintila(id)}`);
    if (!d) { basarisiz("Düello: maç satırı okunamadı"); return "kritik"; }
    if (d.durum !== "aktif") {
      await s.waitForTimeout(2500);
      await ekranOlc("duello-mac-sonu");
      console.log(`  maç bitti (${d.durum})`);
      const sayac = await sayacRaporu("Düello");
      kapsam.sayac.push(...sayac);
      // Son güvence: test hesabının yanıtsız kaldığı HER soru başarısızlıktır — test
      // akışı bir yerde takılsa bile yanıtsız soru sessizce geçemez.
      const yanitsiz = await sorgu(`select h.tur, h.uzatma, h.saldiran = ${alintila(BEN)} ben_saldiran from duello_hamleler h
          where h.duello_id = ${alintila(id)} and h.id > ${girisHamle} and ((h.saldiran = ${alintila(BEN)} and h.yanitsiz_saldiran)
            or (h.saldiran is distinct from ${alintila(BEN)} and h.yanitsiz_savunan)) order by h.id`);
      for (const y of yanitsiz) {
        if (SIFIR_OLC && sifirTur !== null && Number(y.tur) === sifirTur && !(y.uzatma === true || y.uzatma === "t")) continue;   // bilerek
        const rol = y.ben_saldiran === true || y.ben_saldiran === "t" ? "saldıran" : "savunan";
        basarisiz(`Düello: ${rol} · tur ${y.tur}${y.uzatma === true || y.uzatma === "t" ? " (uzatma)" : ""} — soru YANITSIZ kapandı`);
      }
      if (yanitsiz.some((y) => !(SIFIR_OLC && sifirTur !== null && Number(y.tur) === sifirTur && !(y.uzatma === true || y.uzatma === "t")))) return "kritik";
      return;
    }
    const benSaldiran = d.saldiran === BEN;
    const ekranAnahtar = `${d.tur}-${d.faz}-${d.saldiran}-${d.soru_id}`;
    if (ekranAnahtar !== sonEkran) {
      sonEkran = ekranAnahtar;
      await s.waitForTimeout(250);
      // Ölçüm her fazdan bir örnekle (kategori/cevap/sonuç) — maç akarken tüm fazlar sayılmaz, türler sayılır.
      const tur = `${d.faz}-${benSaldiran ? "saldiran" : "savunan"}`;
      if (!kapsam.olculen.has(tur)) {
        kapsam.olculen.add(tur);
        const t0 = Date.now();
        sonAdim = "ekran ölçümü";
        await ekranOlc(`duello-${tur}`);
        console.log(`  · ekran ölçüldü: ${tur} (${((Date.now() - t0) / 1000).toFixed(1)} sn)`);
        continue;   // ölçüm sürerken faz değişmiş olabilir: durumu yeniden oku
      }
    }

    // Kategori: seçme sırası bendeyse seçilebilir kategori OLMALI.
    if (d.faz === "kategori" && benSaldiran) {
      // Kategori isteği yoldaysa (calisan = "kategori") düğmeler bilerek kilitli: bekle, süreyi ölç.
      const yolda = async () => (await s.evaluate(() => window.__bdTani?.calisan ?? null)) === "kategori";
      if (await yolda()) {
        const y0 = Date.now();
        while (await yolda() && Date.now() - y0 < 12000) await s.waitForTimeout(200);
        const sn = (Date.now() - y0) / 1000;
        if (sn > 3) console.log(`  ! kategori isteği ${sn.toFixed(1)} sn yolda kaldı (sunucu yavaş)`);
        continue;
      }
      let n = 0;
      for (let i = 0; i < 8 && !n; i++) { n = await s.locator(":is(.bd-duello-kat, button.m2-kat):not([disabled])").count(); if (!n) await s.waitForTimeout(200); }
      if (!n) { basarisiz("Düello: kategori sırası bende ama seçilebilir kategori yok", { tani: t }); return "kritik"; }
      const k0 = Date.now();
      sonAdim = "kategori dokunuşu";
        await s.locator(":is(.bd-duello-kat, button.m2-kat):not([disabled])").first().tap({ timeout: 3000 })
        .catch((e) => basarisiz(`Düello: kategoriye dokunulamadı (${Date.now() - k0} ms) — ${String(e.message).split(String.fromCharCode(10))[0]}`));
      await s.waitForTimeout(600);
      continue;
    }

    // Cevap: bu soruyu henüz cevaplamadıysam şıklar AÇIK olmalı.
    const cevaplar = typeof d.cevaplar === "string" ? JSON.parse(d.cevaplar || "{}") : (d.cevaplar ?? {});
    const cevapladim = Object.prototype.hasOwnProperty.call(cevaplar, BEN);
    const cevapAnahtar = `${d.tur}-${d.saldiran}-${d.uzatma}`;
    if (d.faz === "cevap" && !cevapladim && cevapAnahtar !== sonCevapAnahtar) {
      sonCevapAnahtar = cevapAnahtar;
      const rol = benSaldiran ? "saldıran" : "savunan";
      const asama = d.uzatma === true || d.uzatma === "t" ? "uzatma" : Number(d.tur) === 1 ? "ilk tur" : "sonraki tur";
      let acik = 0;
      // İstemci yeni fazı veritabanından biraz geç görebilir (ağ; gösterim payı 1,5 sn): 3 sn beklenir.
      for (let i = 0; i < 20 && acik < 2; i++) { acik = await acikSiklar(); if (acik < 2) await s.waitForTimeout(150); }
      if (acik < 2) {
        const tani = await s.evaluate(() => window.__bdTani ?? null);
        // Yanlış alarm olmasın: hâlâ cevap fazı, cevabım yok ve süre var mı?
        const [h] = await sorgu(`select faz, (cevaplar ? ${alintila(BEN)}) c,
            extract(epoch from (case when oyuncu1 = ${alintila(BEN)} then bitis1 else bitis2 end) - now()) kalan
            from duellolar where id = ${alintila(id)}`);
        if (h?.faz !== "cevap" || h?.c === true || h?.c === "t" || Number(h?.kalan) < 1) { sonCevapAnahtar = ""; continue; }
        await s.screenshot({ path: path.resolve(`oyuncu-testi-hata-${Date.now()}.png`) }).catch(() => {});
        basarisiz(`Düello: ${rol} · ${asama} — cevap vermesi gerekirken şıklar kapalı`, { tani, faz: d.faz });
        kapsam.durumlar[`${rol} · ${asama} · —`] = "kaldı";
        return "kritik";
      }
      // --sifir: bu sorunun süresi DOLSUN (ERKEN SIFIR ölçümü). Şıklar açık olduğu doğrulandı; dokunma.
      if (SIFIR_OLC && sifirTur === null && Number(d.tur) >= 2 && !(d.uzatma === true || d.uzatma === "t")) {
        sifirTur = Number(d.tur);
        console.log(`  · --sifir: ${rol} · tur ${sifirTur} bilerek yanıtsız bırakıldı (süre dolacak)`);
        await haleOlc();
        await s.waitForTimeout(300);
        continue;
      }
      // Skill: her üç sorudan birinde, açık bir skill varsa kullan (Soru Değiştir ve
      // İkinci Şans hariç: akışı değiştirirler; kalanlar şıkların açık kalmasını dener).
      let skillKullandim = false;
      if (skillSirasi++ % 3 === 1) {
        const sk = s.locator(".bd-d2-skill button:not([disabled])").filter({ hasNotText: /Soru Değiştir|İkinci Şans/ });
        if (await sk.count()) {
          sonAdim = "skill dokunuşu";
        await sk.first().tap({ timeout: 3000 }).catch(() => {});
          await s.waitForTimeout(900);
          // Hak yoksa satın alma penceresi açılır: coin yetiyorsa "Al ve kullan", yetmiyorsa "Vazgeç".
          const pencere = s.getByRole("dialog", { name: /(Skill|Joker) satın al/ });
          if (await pencere.count()) {
            const al = pencere.getByRole("button", { name: /Al ve kullan/ });
            let alindi = false;
            if (await al.count() && await al.isEnabled()) { await al.tap({ timeout: 3000 }).catch(() => {}); alindi = true; }
            else await pencere.getByRole("button", { name: /Vazgeç/ }).tap({ timeout: 3000 }).catch(() => {});
            sonAdim = "satın alma penceresi";
            const pt0 = Date.now();
        for (let i = 0; i < 25 && await pencere.count(); i++) await s.waitForTimeout(200);
            // Kapanış süresi kaydı: "Alınıyor…" takılması (RPC ya da ardından gelen yenileme yavaş/asılı) bu satırla görünür.
            if (alindi) { const kapanis = Date.now() - pt0; kapsam.satinAlma.push(kapanis); console.log(`  · joker satın alma penceresi ${await pencere.count() ? "5 sn'de KAPANMADI" : kapanis + " ms'de kapandı"}`); }
            if (await pencere.count()) {
              const metin = (await pencere.innerText().catch(() => "")).replace(/s+/g, " ").slice(0, 160);
              basarisiz("Düello: skill satın alma penceresi 5 sn içinde kapanmadı", { metin });
              await pencere.getByRole("button", { name: /Vazgeç/ }).tap({ timeout: 2000 }).catch(() => {});
            }
          }
          skillKullandim = true;
          acik = await acikSiklar();
          if (acik < 2) {
            basarisiz(`Düello: ${rol} · ${asama} — skill kullandıktan sonra şıklar kapandı`, { tani: await s.evaluate(() => window.__bdTani ?? null) });
            kapsam.durumlar[`${rol} · ${asama} · skill var`] = "kaldı";
            return "kritik";
          }
        }
      }
      // Canlar eşit kalsın (maç uzasın, uzatmaya gitsin): öndeysem yanlış, gerideysem doğru.
      const [g] = await sorgu(`select can1, can2, oyuncu1, (select dogru_cevap from questions q where q.id = soru_id) dogru
                                 from duellolar where id = ${alintila(id)}`);
      const benimCan = g.oyuncu1 === BEN ? Number(g.can1) : Number(g.can2);
      const rakipCan = g.oyuncu1 === BEN ? Number(g.can2) : Number(g.can1);
      const dogru = Number(g.dogru);
      const hedef = benimCan > rakipCan ? (dogru + 1) % 4 : dogru;
      let sik = s.locator(":is(.bd-secenek, .qt-sik)").nth(hedef);
      if (await sik.isDisabled()) sik = s.locator(":is(.bd-secenek, .qt-sik):not([disabled]):not(.elendi):not(.qt-sik--elendi)").first();
      await sik.tap({ timeout: 4000 }).catch((e) => basarisiz(`Düello: şıka dokunulamadı — ${String(e.message).split(String.fromCharCode(10))[0]}`));
      // Sunucuya ulaştı mı: cevaplar'da benim anahtarım ya da bu turun hamlesinde benim cevabım.
      sonAdim = "cevap sunucu kontrolü";
        let ulasti = false;
      for (let i = 0; i < 20 && !ulasti; i++) {
        await bekle(250);
        const [r] = await sorgu(`select (cevaplar ? ${alintila(BEN)}) c,
            exists (select 1 from duello_hamleler h where h.duello_id = d.id and h.created_at > now() - interval '20 seconds'
                     and ((h.saldiran = ${alintila(BEN)} and h.cevap_saldiran is not null)
                       or (h.saldiran <> ${alintila(BEN)} and h.cevap is not null))) h
            from duellolar d where id = ${alintila(id)}`);
        ulasti = r?.c === true || r?.c === "t" || r?.h === true || r?.h === "t";
      }
      const anahtar = `${rol} · ${asama} · ${skillKullandim ? "skill var" : "skill yok"}`;
      if (!ulasti) {
        basarisiz(`Düello: ${anahtar} — şıka dokunuldu ama cevap sunucuya ulaşmadı`);
        kapsam.durumlar[anahtar] = "kaldı";
        return "kritik";
      }
      kapsam.durumlar[anahtar] = kapsam.durumlar[anahtar] === "kaldı" ? "kaldı" : "geçti";
      kapsam[benSaldiran ? "saldiran" : "savunan"]++;
      console.log(`  ✓ ${anahtar} — dokunuldu, sunucuya ulaştı`);
      continue;
    }
    await s.waitForTimeout(250);
  }
  basarisiz("Düello: maç 15 dakikada bitmedi");
}

// Son 5 saniyenin kırmızı kenar nabzı (v2: `.qt-h-gerilim::after`; v1 halesi `.bd-duello-hale.kritik` artık çizilmiyor):
// 4 px kenar çizgisi pikseli ile iç zemin arasındaki kontrast oranı. Süresi dolan (--sifir) fazda gerilim başlayınca
// birkaç kare alınır, nabzın tepe/dip değeri yazılır.
async function haleOlc() {
  try {
    const SEL = ".qt-h-gerilim, .bd-duello-hale.kritik";
    for (let i = 0; i < 90 && !(await s.locator(SEL).count()); i++) await s.waitForTimeout(250);
    if (!(await s.locator(SEL).count())) { console.log("  · hale ölçümü: son-5-sn kenar nabzı görülmedi"); return; }
    const oranlar = [];
    for (let i = 0; i < 6; i++) {
      const b64 = (await s.screenshot()).toString("base64");
      oranlar.push(await s.evaluate(async (b64) => {
        const img = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob());
        const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext("2d"); x.drawImage(img, 0, 0);
        const k = img.width / window.innerWidth;
        const kap = (document.querySelector(".qt-h-gerilim") ?? document.body).getBoundingClientRect();
        const x0 = Math.max(0, kap.left);
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const oran = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
        const r = [];
        for (let f = 0.3; f <= 0.71; f += 0.1) {
          const y = Math.round(img.height * f);
          r.push(oran(x.getImageData(Math.round((x0 + 2) * k), y, 1, 1).data, x.getImageData(Math.round((x0 + 90) * k), y, 1, 1).data));
        }
        return r.reduce((t, v) => t + v, 0) / r.length;
      }, b64));
      await s.waitForTimeout(150);
    }
    console.log(`  · son-5-sn kenar nabzı kontrastı (kenar / iç zemin): en yüksek ${Math.max(...oranlar).toFixed(2)}:1, en düşük ${Math.min(...oranlar).toFixed(2)}:1`);
  } catch (e) { console.log("  · hale ölçümü başarısız: " + String(e.message).split(String.fromCharCode(10))[0]); }
}

async function duelloTesti() {
  console.log("\n▶ Düello");
  const kapsam = { saldiran: 0, savunan: 0, durumlar: {}, olculen: new Set(), sayac: [], satinAlma: [] };
  for (let i = 0; i < EN_COK_MAC; i++) {
    if (await duelloMaci(kapsam) === "kritik") break;
    if (kapsam.saldiran >= 3 && kapsam.savunan >= 3 && Object.keys(kapsam.durumlar).some((k) => k.includes("uzatma"))) break;
    if (kapsam.saldiran >= 3 && kapsam.savunan >= 3 && i >= 0 && !ARG.uzatma) break;
  }
  if (kapsam.saldiran < 3 || kapsam.savunan < 3) basarisiz("Düello: kapsam eksik (en az 3 saldıran + 3 savunan)", { saldiran: kapsam.saldiran, savunan: kapsam.savunan });
  const tum = [];
  for (const rol of ["saldıran", "savunan"]) for (const a of ["ilk tur", "sonraki tur", "uzatma"]) for (const sk of ["skill yok", "skill var"]) {
    const k = `${rol} · ${a} · ${sk}`;
    tum.push(`${k}: ${kapsam.durumlar[k] ?? "oluşmadı"}`);
  }
  notlar.push(`Düello: saldıran ${kapsam.saldiran}, savunan ${kapsam.savunan}`, ...tum.map((x) => "  " + x));
  // Sayaç: ilk 3 saniyede 900 ms'den kısa rakam adımı = sayaç hızlanarak yetişmeye çalışıyor.
  const hizli = kapsam.sayac.filter((r) => r.adimlar.some((a) => a < 900));
  const gecikmeler = kapsam.sayac.map((r) => r.gecikme).sort((a, b) => a - b);
  if (gecikmeler.length) notlar.push(`Düello sayacı: ${kapsam.sayac.length} faz, ilk görünüş gecikmesi medyan ${gecikmeler[Math.floor(gecikmeler.length / 2)]} ms / en çok ${gecikmeler.at(-1)} ms, hızlı adımlı faz ${hizli.length}`);
  if (hizli.length) basarisiz("Düello: sayaç ilk 3 saniyede hızlı akıyor", hizli.slice(0, 4));
  if (kapsam.satinAlma.length) notlar.push(`Düello joker satın alma penceresi kapanışı: ${kapsam.satinAlma.length} alım, ${kapsam.satinAlma.join(", ")} ms`);
  // Gösterilen sayaç 0'a gerçek bitişten 300 ms'den fazla önce düşmemeli (yalnız süresi dolan fazlarda gözlenir).
  const sifirlar = kapsam.sayac.filter((r) => r.sifirErken !== null);
  const erkenSifir = sifirlar.filter((r) => r.sifirErken > 300);
  notlar.push(`Düello sıfır anı: ${sifirlar.length} fazda gözlendi${sifirlar.length ? ` (gerçek bitişe göre ${sifirlar.map((r) => r.sifirErken).join(", ")} ms)` : SIFIR_OLC ? " — BEKLENEN gözlem oluşmadı" : " (süresi dolan faz yok; --sifir ile ölçülür)"}`);
  if (SIFIR_OLC && !sifirlar.length) basarisiz("Düello: --sifir istendi ama sayacın 0'a düştüğü faz gözlenmedi");
  if (erkenSifir.length) basarisiz("Düello: sayaç 0'a gerçek bitişten önce düştü (← ERKEN SIFIR)", erkenSifir.slice(0, 4));
}

// ================================================================ KLASİK
async function klasikTesti() {
  console.log("\n▶ Klasik");
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForTimeout(2500);
  await tanitimlariGec();
  await ekranOlc("ana-sayfa");
  // Yarım kalmış maça DÖNÜLMEZ: rakip yokken sunucu soruyu 90 sn'de bir ilerletir, dönülen soru
  // süresi dolmuş gelir (şıklar doğru olarak kapalı) — test yanlış alarm verirdi. Pencerede "Yeni maç".
  {
    // Ana sayfa A (23 Eyl 2026): OYNA düğmesi; eski ana sayfanın sınıfı da yedek seçici.
    await s.locator(".as-buyuk-dugme--oyna, .mobile-core-mode.klasik").first().tap({ timeout: 4000 }).catch(() => {});
    await s.waitForTimeout(900);
    await ekranOlc("klasik-mod-secimi");
    const klasik = s.getByRole("button", { name: /^Klasik/ }).last();
    if (await klasik.count()) await klasik.tap({ timeout: 4000 }).catch(() => {});
  }
  // Yarım maç sorusu çıkarsa devam et
  await s.waitForTimeout(1500);
  const yeni = s.getByRole("button", { name: /^Yeni maç$/ });
  if (await yeni.count()) { await yeni.first().tap().catch(() => {}); await s.waitForTimeout(1500); }
  // Beklemek yerine açık botla eşleş (akış aynı, süre kısa)
  for (let i = 0; i < 20 && !/\/mac\/[0-9a-f-]{36}/.test(s.url()); i++) {
    const bot = s.getByRole("button", { name: /Beklemeden bot|bot ile oyna/i });
    if (await bot.count()) { await bot.first().tap().catch(() => {}); await s.waitForTimeout(1200); }
    const sec = s.locator(".bd-bot-secim button, [class*='bot-sec'] button").first();
    if (await sec.count()) await sec.tap().catch(() => {});
    await s.waitForTimeout(1500);
  }
  try { await s.waitForURL(/\/mac\/[0-9a-f-]{36}/, { timeout: 40000 }); }
  catch { basarisiz("Klasik: maça girilemedi"); return; }
  const id = s.url().match(/mac\/([0-9a-f-]{36})/)[1];
  console.log(`  maç ${id}`);
  await s.waitForTimeout(1500);
  await ekranOlc("klasik-hazir-kapisi");
  // Eş zamanlı maç "Hazır mısın?" kapısıyla başlar: oyuncu gibi Hazırım'a dokun.
  const hazir = s.getByRole("button", { name: /Hazırım/ });
  if (await hazir.count()) await hazir.first().tap({ timeout: 4000 }).catch((e) => basarisiz("Klasik: Hazırım'a dokunulamadı — " + String(e.message).split(String.fromCharCode(10))[0]));
  await soruDongusu("Klasik", async (index) => {
    const [r] = await sorgu(`select count(*)::int n from match_answers where match_id = ${alintila(id)}
                               and user_id = ${alintila(BEN)} and soru_index = ${Number(index)}`);
    return Number(r?.n) > 0;
  }, async () => {
    const [m] = await sorgu(`select durum from matches where id = ${alintila(id)}`);
    return m?.durum && !["aktif", "devam", "oynaniyor", "bekliyor"].includes(m.durum);
  }, async () => {
    const [r] = await sorgu(`select coalesce(max(soru_index), -1)::int i from match_answers where match_id = ${alintila(id)} and user_id = ${alintila(BEN)}`);
    return Number(r?.i) + 1;
  });
  await ekranOlc("klasik-mac-sonu");
  const sayac = await sayacRaporu("Klasik");
  const hizli = sayac.filter((r) => r.adimlar.some((x) => x < 900));
  const klasikSifir = sayac.filter((r) => r.sifirErken !== null);
  if (SIFIR_OLC) {
    notlar.push(`Klasik sıfır anı: ${klasikSifir.length} soruda gözlendi (gerçek bitişe göre ${klasikSifir.map((r) => r.sifirErken).join(", ")} ms)`);
    if (!klasikSifir.length) basarisiz("Klasik: --sifir istendi ama sayacın 0'a düştüğü soru gözlenmedi");
  }
  if (klasikSifir.some((r) => r.sifirErken > 300)) basarisiz("Klasik: sayaç 0'a gerçek bitişten önce düştü (← ERKEN SIFIR)", klasikSifir.filter((r) => r.sifirErken > 300).slice(0, 4));
  if (sayac.length) notlar.push(`Klasik sayacı: ${sayac.length} soru, ilk görünüş gecikmesi medyan ${sayac.map((r) => r.gecikme).sort((x, y) => x - y)[Math.floor(sayac.length / 2)]} ms, hızlı adımlı soru ${hizli.length}`);
}

// Soru kartı modları (Klasik, turnuva): her yeni soruda şıklar açılmalı, dokunuş
// sunucuya ulaşmalı. İlk sorudaki 3-2-1 sayımı için 5 sn pay var.
async function soruDongusu(ad, ulastiMi, bittiMi, siradakiIndex, enCokSoru = 25, dogruSik = null) {
  let n = 0;
  let sonMetin = "";
  const bas = Date.now();
  while (n < enCokSoru && Date.now() - bas < 12 * 60 * 1000) {
    if (await bittiMi()) break;
    const metin = await s.locator(":is(.bd-soru-metin, .qt-soru-metin)").first().innerText().catch(() => "");
    if (!metin || metin === sonMetin) { await s.waitForTimeout(300); continue; }
    sonMetin = metin;
    const index = await siradakiIndex();
    let acik = 0;
    const sinir = n === 0 ? 5500 : 2000;
    const t0 = Date.now();
    while (Date.now() - t0 < sinir && acik < 2) { acik = await acikSiklar(); if (acik < 2) await s.waitForTimeout(150); }
    if (acik < 2) {
      basarisiz(`${ad}: ${n + 1}. soruda şıklar kapalı`, { soru: metin.slice(0, 50), tani: await s.evaluate(() => window.__bdTani ?? null) });
      return;
    }
    if (n === 1) await ekranOlc(`${ad.toLowerCase()}-soru`);
    // --sifir: 2. sorunun süresi DOLSUN (ERKEN SIFIR ölçümü), sonra test biter.
    if (SIFIR_OLC && n === 1 && ad === "Klasik") {
      console.log(`  · --sifir: ${ad} 2. soru bilerek yanıtsız bırakıldı (süre dolacak)`);
      const t1 = Date.now();
      while (Date.now() - t1 < 26000 && (await s.locator(":is(.bd-soru-metin, .qt-soru-metin)").first().innerText().catch(() => "")) === metin) await s.waitForTimeout(150);
      await s.waitForTimeout(600);
      break;
    }
    const hedef = dogruSik ? await dogruSik() : null;
    const hedefSik = hedef !== null && hedef !== undefined ? s.locator(":is(.bd-secenek, .qt-sik)").nth(hedef) : null;
    const sik = hedefSik && await hedefSik.isEnabled().catch(() => false) ? hedefSik : s.locator(":is(.bd-secenek, .qt-sik):not([disabled]):not(.elendi):not(.qt-sik--elendi)").first();
    await sik.tap({ timeout: 4000 }).catch((e) => basarisiz(`${ad}: şıka dokunulamadı — ${String(e.message).split(String.fromCharCode(10))[0]}`));
    let ulasti = false;
    for (let i = 0; i < 20 && !ulasti; i++) { await bekle(250); ulasti = await ulastiMi(index); }
    if (!ulasti) { basarisiz(`${ad}: ${n + 1}. soruda dokunuldu ama cevap sunucuya ulaşmadı`, { index }); return; }
    n++;
    console.log(`  ✓ ${ad} soru ${n} — dokunuldu, sunucuya ulaştı`);
  }
  notlar.push(`${ad}: ${n} soru dokunuldu, hepsi sunucuya ulaştı`);
  if (n === 0) basarisiz(`${ad}: hiç soru cevaplanamadı`);
}

// ================================================================ TURNUVA
async function turnuvaTesti() {
  console.log("\n▶ Turnuva");
  await s.goto(ADRES + "/turnuva", { waitUntil: "domcontentloaded" });
  await s.waitForTimeout(3000);
  await tanitimlariGec();
  await ekranOlc("turnuva");
  // Sıradaki seansın lobi satırı saatler önce açılır: yalnız başlamış ya da 10 dk içinde
  // başlayacak seans sayılır (seans saati TSİ).
  const [t] = await sorgu(`select id, durum from tournaments
                            where durum <> 'bitti'
                              and (durum <> 'lobi' or ((tarih + seans::time) at time zone 'Europe/Istanbul') <= now() + interval '10 minutes')
                            order by created_at desc limit 1`).catch(() => [null]);
  if (!t) { notlar.push("Turnuva: şu an açık seans yok — soru testi ATLANDI (lobi ekranı ölçüldü)"); return; }
  const katil = s.getByRole("button", { name: /Lobiye katıl/i });
  if (await katil.count()) {
    await katil.first().tap({ timeout: 4000 }).catch((e) => basarisiz("Turnuva: Lobiye katıl'a dokunulamadı — " + String(e.message).split(String.fromCharCode(10))[0]));
    await s.waitForTimeout(1500);
    await ekranOlc("turnuva-lobi-katildi");
  }
  const sayi = async () => {
    const [r] = await sorgu(`select count(*)::int n from tournament_answers where tournament_id = ${alintila(t.id)} and user_id = ${alintila(BEN)}`);
    return Number(r?.n);
  };
  let onceki = await sayi();
  // Turnuvada yanlış cevap eler: test doğru şıkkı işaretler ki sonraki sorular da denensin.
  await soruDongusu("Turnuva", async () => (await sayi()) > onceki,
    async () => {
      const [r] = await sorgu(`select t.durum, coalesce(p.elendi, false) elendi from tournaments t
          left join tournament_players p on p.tournament_id = t.id and p.user_id = ${alintila(BEN)}
          where t.id = ${alintila(t.id)}`);
      if (r?.elendi === true || r?.elendi === "t") { notlar.push("Turnuva: test hesabı elendi — sonraki sorular denenmedi"); return true; }
      return r?.durum === "bitti";
    },
    async () => { onceki = await sayi(); return onceki; }, 5,
    async () => {
      const [r] = await sorgu(`select q.dogru_cevap from tournaments t join questions q on q.id = t.soru_ids[t.aktif_soru + 1]
                                where t.id = ${alintila(t.id)}`).catch(() => [null]);
      return r ? Number(r.dogru_cevap) : null;
    });
}

// ================================================================ çalıştır
console.log(`Oyuncu testi — ${ADRES} · kullanıcı ${BEN.slice(0, 8)} · modlar: ${MODLAR.join(", ")}`);
try {
  await s.goto(ADRES + "/", { waitUntil: "domcontentloaded" });
  await s.waitForTimeout(2000);
  if (await s.getByRole("button", { name: /Misafir olarak dene/i }).count()) {
    basarisiz("Oturum açılmadı (giriş ekranı göründü) — oturum dosyasını yenile");
  } else {
    if (MODLAR.includes("duello")) await duelloTesti();
    if (MODLAR.includes("klasik")) await klasikTesti();
    if (MODLAR.includes("turnuva")) await turnuvaTesti();
  }
} catch (e) {
  basarisiz("Beklenmeyen hata: " + (e?.message ?? e));
} finally {
  await tarayici.close();
  await db.kapat();
}

console.log("\n==== SONUÇ ====");
for (const n of notlar) console.log("·", n);
const konsolHata = konsol.filter((k) => !/Failed to load resource: the server responded with a status of 400/.test(k));
if (konsolHata.length) console.log("· konsol hataları:", konsolHata.slice(0, 5));
if (hatalar.length) {
  console.log(`\nBAŞARISIZ (${hatalar.length}):`);
  for (const h of hatalar) console.log("  ✗", h);
  process.exit(1);
}
console.log("\nGEÇTİ");
process.exit(0);
