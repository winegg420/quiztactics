// SES ÇIKIŞ ÖLÇÜMÜ (17 Eki 2026, ses bitiş kuralı) — maçtaki ses yolunun GERÇEK çıktısı, iç kayıtlara güvenmeden.
//
// Ne yapar: oturumsuz bir sayfada (/gizlilik) GERÇEK ses.js (seçilen sürüm) ve gerçek dosyalar (public/ses + Ida'nın /ses-secim
// adayları, yerel kopyadan) yüklenir; her modun maç ÇİZELGESİ (sayfaların ses çağrı sırası ve zamanları — kaynak: KasaPage,
// Duello4Arena, MatchPage/QuestionCard, GroupMatchPage, TournamentPage, RakipAra/AramaSahnesi, MacSonuKutlama, RankUpOverlay;
// her sürümün KENDİ sayfa davranışıyla) oynatılır. AudioContext.destination'a bağlanan her zincirin sinyali AudioWorklet
// dinleyicisiyle (128 örnekte bir RMS, ses iş parçacığında) ayrı ayrı kaydedilir. Ölçüler bu GERÇEK sinyalden:
//   · kesildi      — sinyal, dosyanın (× kazanç) DOĞAL eğrisinin -45 dB'ye indiği andan > 30 ms önce -45 dB altına düştü
//   · binme        — iki anlamlı sesin (-45 dB üstü) aralıkları > 50 ms üst üste
//   · ekran geçti  — anlamlı ses -45 dB'ye inmeden > 50 ms önce yeni ekran (faz değişimi / yeni soru / maç sonu ekranı) geldi
//   · çalmadı      — istenip hiç çıkış vermeyen anlamlı ses (neden: ses.js tanı kaydı)
// Sürümler: yeni (çalışma ağacı) · once (908c2619, işten önce) · ekim10 (efd76df3, 10 Eki). Sayfalar o sürümün davranışıyla
// (ör. 10 Eki Hazine DEVAM: soru sesi anın başında + rozet m(60) + coin m(560); önce: kasa_devam m(60), soru sesi an sonunda).
// Senaryolar: normal · gec_veri · dalgali · yavas_sunucu · cpu6 (CPU 6x yavaş) · sekme (1,5 sn arka plan) · azalt (hareket azaltma)
// Sunucuya / hesaba / veritabanına HİÇ istek gitmez (Supabase istekleri kesilir, aday dosyaları yerelden verilir).
//
// Kullanım: npm run dev -- --port 5189 --strictPort   (başka kabukta)
//   node araclar/ses-cikis-olcum.mjs [--adres=http://localhost:5189] [--surum=yeni,once,ekim10] [--mod=klasik,...]
//        [--senaryo=normal,...] [--boyut=390x844,360x640] [--dil=tr,en] [--etiket=x] [--paralel=2]
//   → tasarim/ses-cikis/<etiket>.json + .md
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { iz, cikisOlc } from "./ses-cikis-iz.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5189").replace(/\/$/, "");
const SURUMLER = String(ARG.surum || "yeni,once,ekim10").split(",");
const MODLAR = String(ARG.mod || "klasik,saf_bilgi,duello,hazine,grup,turnuva").split(",");
const SENARYOLAR = String(ARG.senaryo || "normal,gec_veri,dalgali,yavas_sunucu,cpu6,sekme,azalt").split(",");
const BOYUTLAR = String(ARG.boyut || "390x844").split(",").map((b) => b.split("x").map(Number));
const DILLER = String(ARG.dil || "tr").split(",");
const ETIKET = typeof ARG.etiket === "string" ? ARG.etiket : "olcum";
const PARALEL = Number(ARG.paralel || 1);
const CIKTI = path.resolve("tasarim/ses-cikis");
fs.mkdirSync(CIKTI, { recursive: true });

// ---------------- sürümler: ses.js kaynağı + seçimler ----------------
const SECIM_BUGUN = JSON.parse(fs.readFileSync(path.resolve(".tmp/hazine-akis-ses/secimler.json"), "utf8")).secimler;
// 10 Eki'de -n1 işlenmiş adaylar yoktu (15 Eki, araclar/ses-isle.mjs): seçimler kaynak adaylarıydı (docs/ses-isleme-raporu.json)
const N1_KAYNAK = Object.fromEntries(JSON.parse(fs.readFileSync(path.resolve("docs/ses-isleme-raporu.json"), "utf8")).sesler.map((x) => [x.dosya.replace(/\.\w+$/, ""), x.kaynak]));
const SECIM_EKIM10 = Object.fromEntries(Object.entries(SECIM_BUGUN).map(([an, id]) => [an, N1_KAYNAK[id] ?? id]));
const SURUM = {
  yeni: { modul: "/oyun/lib/ses.js", secim: SECIM_BUGUN },
  once: { git: "908c2619", secim: SECIM_BUGUN },
  ekim10: { git: "efd76df3", secim: SECIM_EKIM10 },
};
for (const [ad, s] of Object.entries(SURUM)) {
  if (!s.git || !SURUMLER.includes(ad)) continue;
  const kaynak = execSync(`git show ${s.git}:oyun/lib/ses.js`, { encoding: "utf8" })
    .replace('from "./sesAdayKova.js"', 'from "/oyun/lib/sesAdayKova.js"').replace('from "./akisIzleme.js"', 'from "/oyun/lib/akisIzleme.js"');
  const klasor = path.resolve(`.tmp/ses-surum/${ad}`);
  fs.mkdirSync(klasor, { recursive: true });
  fs.writeFileSync(path.join(klasor, "ses.js"), kaynak);
  s.modul = `/.tmp/ses-surum/${ad}/ses.js`;
}
// işten önceki kasa_devam dosyası (çalışma ağacından silindi) — once sürümü için git'ten
const ESKI_DOSYA = path.resolve(".tmp/ses-surum/kasa_devam-e18d695314.wav");
fs.mkdirSync(path.dirname(ESKI_DOSYA), { recursive: true });
if (!fs.existsSync(ESKI_DOSYA)) fs.writeFileSync(ESKI_DOSYA, execSync("git show 908c2619:public/ses/kasa_devam-e18d695314.wav"));


// ---------------- çizelgeler ----------------
// Eylem: [t, ad, ...arg] — ad: ses.js fonksiyonu ya da "ekran" (ses çağrısız yeni ekran) / "gizle" (sekme arka plana, ms) / "an" (etiket)
// P: senaryo parametreleri. s: sürüm (sayfa davranışı farkları).
const rnd = (a, b, r) => a + (b - a) * r();
function rastgele(tohum) { let x = tohum >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
function senaryo(ad, tohum = 7) {
  const r = rastgele(tohum);
  const P = { ad, rtt: () => 150, gec: () => 0, jokerCevap: () => 700, payO: () => 1, sekme: false };
  if (ad === "gec_veri") Object.assign(P, { gec: () => 600, payO: () => 0.78, jokerCevap: () => 650 });
  if (ad === "dalgali") Object.assign(P, { rtt: () => rnd(60, 1400, r), gec: () => rnd(0, 1400, r), jokerCevap: () => rnd(350, 1400, r), payO: () => rnd(0.78, 1, r) });
  if (ad === "yavas_sunucu") Object.assign(P, { rtt: () => rnd(1700, 4200, r), gec: () => rnd(300, 1500, r), payO: () => 0.78 });
  if (ad === "sekme") P.sekme = true;
  return P;
}

// Arama → rakip bulundu → VS → maç ekranı (RakipAra / AramaSahnesi; ortak_arama_gecis 2850, VS 450)
function arama(c, t, s) {
  c.push([t, "an", "arama"], [t, "sesRakipBulundu", s === "ekim10" ? undefined : 2850], [t + 450, "sesVsAni"]);
  c.push([t + 2850, "ekran", "mac"]);
  return t + 2850;
}
// Maç sonu ekranı (MacSonuKutlama): kutlama 700 / sade 300, coin 1000→1520, xp 1400, rozet 2750; kapanınca sesMacSonuKapat
function macSonu(c, t, s, { sonuc = "kazandin", coin = true, xp = true, rozet = true, rutbe = false } = {}) {
  // RankUpOverlay: maç bitince profil tazelenir (son cevaptan ~0,3 sn sonra), 3,5 sn'lik geçici ÜST KATMAN — ekranı değiştirmez
  // (altındaki ekran sürer); sesi çalan sesin ardından sıraya girer
  c.push([t, "an", "mac_sonu"], [t, "sesFazDegisti", "mac_sonu"], [t, "ekran", "mac_sonu"]);
  if (rutbe) c.push([t - 1500, "an", "rutbe"], [t - 1500, "sesRutbeAtladi"]);
  c.push([t + (sonuc === "kazandin" ? 700 : 300), "sesMacSonu", sonuc]);
  if (coin) c.push([t + 1520, "sesMacSonu", "coin"]);
  if (xp) c.push([t + 1400, "sesMacSonu", "xp_dolma"]);
  if (rozet) c.push([t + 2750, "sesMacSonu", "rozet"]);
  c.push([t + 6000, "an", "kapanis"], [t + 6000, "sesMacSonuKapat"], [t + 6000, "sesFazDegisti"], [t + 6000, "ekran", "kapanis"]);
  return t + 6000;
}
// Klasik / Saf Bilgi / Grup / Turnuva — QuestionCard + sayfa. GB = cevap → sonraki soru 1000 ms (geri bildirim penceresi).
function klasikBenzeri(P, s, { tur = "klasik" } = {}) {
  const c = [], joker = tur === "klasik", grupMu = tur === "grup" || tur === "turnuva";
  let t = 0;
  if (tur === "turnuva") { c.push([t, "an", "turnuva_basla"], [t, "sesTurnuvaBasladi"], [t, "ekran", "sayim"]); }
  else t = arama(c, t, s);
  // 3-2-1 (sessiz); kart sayımın altında takılır — önce/10 Eki: soru sesi kart takılınca, yeni: sayım bitip soru görününce
  const takil = t + 300, gorun = t + (tur === "turnuva" ? 5000 : 3000);
  const soru = (ts, ad, ilk = false) => {
    c.push([ts, "an", ad]);
    if (ilk && s !== "yeni") { c.push([takil, "an", ad], [takil, "sesSoruGeldi"], [ts, "ekran", "soru"]); return; }
    c.push([ts, "sesSoruGeldi"]);
  };
  const cevap = (ts, sonuc) => { const r = P.rtt(); c.push([ts, "sesDokunus"], [ts + r, "an", `sonuc_${sonuc}`], [ts + r, sonuc === "dogru" ? "sesDogru" : "sesYanlis"]); return ts + r; };
  // S1: joker → (rakip cevapladı) → doğru
  t = gorun; soru(t, "s1_soru", true);
  if (!grupMu) c.push([t + 900, "sesRakipCevapladi"]);
  let x = t + 1500;
  if (joker) { c.push([t + 1500, "an", "joker_elli"], [t + 1500, "sesSkill", "elli"]); x = t + 1500 + P.jokerCevap(); }
  let son = cevap(x, "dogru");
  // S2: süre doldu (son saniyeler + tikler) → sonraki soru (Klasik: 1 sn + ilerleme ≈ 2 sn; Grup/Turnuva: herkes cevaplamışsa ~2 RTT)
  t = son + 1000 + P.gec(); soru(t, "s2_soru");
  if (!grupMu) c.push([t + 3000, "sesRakipCevapladi"]);
  c.push([t + 10000, "sesSonSaniyeler"], [t + 10000, "sesTik", 5], [t + 11000, "sesTik", 4], [t + 12000, "sesTik", 3], [t + 13000, "sesTik", 2], [t + 14000, "sesTik", 1]);
  c.push([t + 15600, "an", "sure_doldu"], [t + 15600, "sesSureDoldu"]);
  son = t + 15600;
  // S3: ek süre jokeri → yanlış
  t = son + (grupMu ? Math.max(300, 2 * P.rtt()) : 2000 + 2 * P.rtt()) + P.gec(); soru(t, "s3_soru");
  x = t + 1800;
  if (joker) { c.push([t + 1200, "an", "joker_sure"], [t + 1200, "sesSkill", "sure"]); x = t + 1200 + P.jokerCevap(); }
  son = cevap(x, "yanlis");
  // S4: soru değiştir (Klasik) — kart 200 ms sonra değişir. önce/10 Eki: yeni kartın soru sesi; yeni: tek ses (joker)
  t = son + 1000 + P.gec(); soru(t, "s4_soru");
  x = t + 2200;
  if (joker) {
    c.push([t + 1500, "an", "joker_soru_degistir"], [t + 1500, "sesSkill", "soru_degistir"]);
    c.push([t + 1700, "an", "soru_degisti"], [t + 1700, "sesSoruGeldi"]);   // yeni: joker sesi yok, yalnız bu
    x = t + 1700 + 1500;
  }
  son = cevap(x, "dogru");
  // S5 (son soru): Klasik'te rakibin Sisi (iniş + 3 sn sonra kalkış), hemen cevap → maç sonu
  t = son + 1000 + P.gec(); soru(t, "s5_soru");
  x = t + 2500;
  if (joker) { c.push([t + 500, "an", "sis"], [t + 500, "sesSis", false], [t + 3500, "sesSis", true]); x = t + 3700; }
  son = cevap(x, "dogru");
  // maç sonu: Klasik sonuç 1000 + perde 800 → kutlama; Grup perde 800; Turnuva özet ~RTT
  const kutlama = son + (tur === "klasik" || tur === "saf_bilgi" ? 1800 : tur === "grup" ? 800 : 300 + P.rtt());
  const sonuc = tur === "grup" ? "beraberlik" : tur === "turnuva" ? "kazandin" : "kazandin";
  const bit = macSonu(c, kutlama, s, { sonuc, coin: !grupMu, xp: !grupMu, rozet: true, rutbe: tur === "klasik" });
  // rövanş (Klasik): yeni arama → maç ekranı
  if (tur === "klasik") { const r2 = arama(c, bit + 500, s); c.push([r2 + 3000, "an", "rovans_soru"], [r2 + 3000, "sesSoruGeldi"]); return { cizelge: c, son: r2 + 5000 }; }
  return { cizelge: c, son: bit + 1500 };
}
// Düello v4 — Duello4Arena (sesFazDegisti her faz/soru), sonuç 3 sn, el değişince 1075 ms sonra tur geçişi / can kaybı
function duello(P, s) {
  const c = [];
  let t = arama(c, 0, s);
  const faz = (ts, ad) => c.push([ts, "an", ad], [ts, "sesFazDegisti", ad]);
  // nötr soru (3-2-1 sessiz) → doğru → kontrol aldı
  t += 3000; c.push([t, "an", "notr_soru"], [t, "sesSoruGeldi"], [t + 900, "sesRakipCevapladi"]);
  let r = P.rtt(); c.push([t + 2400, "sesDokunus"]); t += 2400 + r;
  faz(t, "sonuc"); c.push([t + 10, "an", "sonuc_dogru"], [t + 10, "sesDogru"], [t + 1075, "an", "kontrol_aldi"], [t + 1075, "sesTurGecis"]);
  t += 3000 + P.gec();
  // kart fazı (kontrol bende): tur geçişi, son 3 sn sayım, rakip ilk kartı seçti
  faz(t, "kart"); c.push([t + 10, "sesTurGecis"], [t + 7900, "sesKategoriGeriSayim", 3], [t + 8900, "sesKategoriGeriSayim", 2], [t + 9900, "sesKategoriGeriSayim", 1]);
  t += 10900 + P.gec();
  // saldırı sorusu açılışı: kategori seçildi, panel kalkınca (2 sn − gecikme, en az 300 ms) soru sesi
  faz(t, "cevap"); const panel = Math.max(300, 2000 - P.gec());
  c.push([t + 10, "an", "acilis_kategori"], [t + 10, "sesKategoriSecildi"], [t + 10 + panel, "an", "saldiri_soru"], [t + 10 + panel, "sesSoruGeldi"]);
  t += 10 + panel;
  // rakibin zaman baskısı → tik → yanlış → can kaybı (el rakibe)
  c.push([t + 1200, "an", "rakip_zaman_baskisi"], [t + 1200, "sesSkill", "zaman_baskisi"], [t + 1800 + P.jokerCevap(), "sesDokunus"]);
  r = P.rtt(); t += 1800 + P.jokerCevap() + r;
  faz(t, "sonuc"); c.push([t + 10, "an", "sonuc_yanlis"], [t + 10, "sesYanlis"], [t + 1075, "an", "can_kaybi"], [t + 1075, "sesCanKaybi"]);
  t += 3000 + P.gec();
  // nötr → kendi jokerim (bilinmeyen tür → genel joker sesi) → doğru, SON BASKI (816 ms son saniyeler)
  faz(t, "notr"); c.push([t, "an", "notr2_soru"], [t, "sesSoruGeldi"], [t + 1200, "an", "kendi_joker"], [t + 1200, "sesJoker"]);
  r = P.rtt(); c.push([t + 1200 + P.jokerCevap(), "sesDokunus"]); t += 1200 + P.jokerCevap() + r;
  faz(t, "sonuc"); c.push([t + 10, "an", "sonuc_dogru2"], [t + 10, "sesDogru"], [t + 816, "an", "son_baski"], [t + 816, "sesSonSaniyeler"]);
  t += 3000 + P.gec();
  // düello kazanıldı → maç sonu (kutlama) → rövanş (arena yeniden açılır)
  faz(t, "bitti");
  const bit = macSonu(c, t + 400, s, { sonuc: "kazandin" });
  const r2 = arama(c, bit + 500, s);
  c.push([r2, "sesFazDegisti"], [r2 + 3000, "an", "rovans_soru"], [r2 + 3000, "sesSoruGeldi"]);
  return { cizelge: c, son: r2 + 5000 };
}
// Ortak Hazine — KasaPage (sürüme göre)
function hazine(P, s) {
  const c = [];
  let t = arama(c, 0, s);
  const ekim = s === "ekim10";
  const faz = (ts, ad, ekran = true) => c.push([ts, "an", ad], [ts, "sesFazDegisti", ad, { ekran }], ...(ekran ? [] : []));
  // giriş sahnesi 4000 ms: düşüş tur geçişi, 10 Eki: coin 650 + rozet 1300; sonra: rozet 1300; 3-2-1; ilk soru sahne sürerken
  const G = 4000 - P.gec();
  c.push([t, "an", "giris"], [t, "sesPencere", G, "giris"], [t, "sesTurGecis"]);
  if (ekim) c.push([t + 650, "sesCoin"]);
  if (s !== "yeni") c.push([t + 1300, "an", "giris_rozet"], [t + 1300, "sesRozet"]);   // yeni: giriş rozeti kalktı (3-2-1 ile binerdi)
  c.push([t + 1000, "an", "giris_sayim"], [t + 1000, "sesTik", 3], [t + 2000, "sesTik", 2], [t + 3000, "sesTik", 1]);
  faz(t + 2000, "cevap", false);
  t += G; c.push([t, "an", "ilk_soru"], [t, "sesSoruGeldi"]);
  // S1: rakip jokeri (işaret) → cevap → sonuç doğru (+ rakip yanlış: 480 ms can kaybı)
  c.push([t + 1800, "an", "rakip_joker"], [t + 1800, "sesJoker"]);
  let r = P.rtt(); c.push([t + 1800 + P.jokerCevap(), "sesDokunus"]); t += 1800 + P.jokerCevap() + r;
  faz(t, "sonuc"); c.push([t, "sesPencere", 3000, "sonuc"], [t + 10, "an", "sonuc_dogru"], [t + 10, "sesDogru"], [t + 490, "an", "rakip_can"], [t + 490, "sesCanKaybi", false]);
  if (ekim) c.push([t + 950, "sesCoin"]);
  t += 3000 + P.gec();
  // karar (ben) → AÇ anı. önce: rozet m(340) + coin m(980), soru m(1820); yeni: kısa rozet, coin yok; 10 Eki: AÇ 1280 ms
  faz(t, "karar"); c.push([t + 10, "an", "karar"], [t + 10, "sesTurGecis"]);
  const acMs = ekim ? 1280 : 1820, acO = ekim ? 1 : (1820 / 1280);
  const ac = t + 1500; const m = (ms) => Math.round(ms * acO);
  c.push([ac, "sesDokunus"], [ac, "sesPencere", m(1280), "an:ac"], [ac + m(340), "an", "ac_rozet"]);
  c.push([ac + m(340), "sesRozet", ...(s === "yeni" ? ["ac"] : [])]);
  if (s !== "yeni") c.push([ac + m(980), "an", "ac_coin"], [ac + m(980), "sesCoin"]);
  t = ac + m(1280); faz(t, "cevap", false); c.push([t, "an", "ac_soru"], [t, "sesSoruGeldi"]);
  // S2: yanlış → rakip yanlış (can kaybı 480; yeni kuralda yanlış sesi sürerken çalmaz)
  r = P.rtt(); c.push([t + 2500, "sesDokunus"]); t += 2500 + r;
  faz(t, "sonuc"); c.push([t, "sesPencere", 3000, "sonuc"], [t + 10, "an", "sonuc_yanlis"], [t + 10, "sesYanlis"], [t + 490, "sesCanKaybi", false]);
  t += 3000 + P.gec();
  // karar (rakip) → DEVAM: kart 700 ms kapalı, an ölçeği payO (rakipte her zaman taban ~0,78)
  faz(t, "karar"); c.push([t + 10, "sesTurGecis"]);
  const kararSure = 2500 + P.gec(); t += kararSure;
  faz(t, "cevap");   // soru fazı geldi (DEVAM)
  if (ekim) c.push([t, "an", "devam_soru"], [t, "sesSoruGeldi"]);
  const devamMs = ekim ? 1400 : 1770, payO = ekim ? 1 : 0.7797, kapali = ekim ? 300 : 700;
  const dO = ekim ? 1 : payO * (1770 / 1400), md = (ms) => Math.round(ms * dO);
  const an = t + kapali;
  c.push([an, "sesPencere", md(1400), "an:devam"], [an + md(60), "an", "devam_ses"]);
  if (s === "yeni") c.push([an + md(60), "sesRozet", "devam"]);
  else if (s === "once") c.push([an + md(60), "sesKasaDevam"]);
  else c.push([an + md(60), "sesRozet"], [an + md(560), "an", "devam_coin"], [an + md(560), "sesCoin"]);
  if (!ekim) { c.push([an + md(1400), "an", "devam_an_sonu_soru"], [an + md(1400), "sesSoruGeldi"]); }
  else c.push([an + md(devamMs), "ekran", "devam_an_sonu"]);
  t = an + md(1400);
  // S3: kendi jokerim (2x) → doğru, büyük artış: xp + anahtar el değişti (tur geçişi)
  c.push([t + 1500, "an", "kendi_joker"], [t + 1500, "sesSkill", "cifte_puan"]);
  r = P.rtt(); c.push([t + 1500 + P.jokerCevap(), "sesDokunus"]); t += 1500 + P.jokerCevap() + r;
  faz(t, "sonuc"); c.push([t, "sesPencere", 3000, "sonuc"], [t + 10, "an", "sonuc_dogru3"], [t + 10, "sesDogru"]);
  const su = (ms) => Math.round(ms * 1.1192);
  c.push([t, "sesPencere", su(2600), "an:sonuc"], [t + su(1180), "an", "sonuc_xp"], [t + su(1180), "sesXpDolma"], [t + su(1900), "an", "anahtar"], [t + su(1900), "sesTurGecis"]);
  t += 3000 + P.gec();
  // final sahnesi (kazandım): tur geçişi 150, rozet 1150, xp 2450 (maç sonu); 4300 ms sonra kutlama
  c.push([t, "an", "final"], [t, "sesFazDegisti", "mac_sonu"], [t, "ekran", "final"], [t + 150, "sesTurGecis"], [t + 1150, "an", "final_rozet"], [t + 1150, "sesRozet"], [t + 2450, "sesMacSonu", "xp_dolma"]);
  const bit = macSonu(c, t + 4300, s, { sonuc: "kazandin", rozet: false });
  return { cizelge: c, son: bit + 1500 };
}
const CIZELGE = {
  klasik: (P, s) => klasikBenzeri(P, s, { tur: "klasik" }), saf_bilgi: (P, s) => klasikBenzeri(P, s, { tur: "saf_bilgi" }),
  grup: (P, s) => klasikBenzeri(P, s, { tur: "grup" }), turnuva: (P, s) => klasikBenzeri(P, s, { tur: "turnuva" }),
  duello, hazine,
};

// ---------------- koşu ----------------
async function kos(tarayici, { surum, mod, sen, boyut, dil, tohum }) {
  const P = senaryo(sen, tohum);
  const { cizelge, son } = CIZELGE[mod](P, surum);
  const baglam = await tarayici.newContext({ viewport: { width: boyut[0], height: boyut[1] }, serviceWorkers: "block",
    reducedMotion: sen === "azalt" ? "reduce" : "no-preference", locale: dil === "en" ? "en-US" : "tr-TR" });
  const KAYNAK = path.resolve("araclar/ses-adaylar-kaynak");
  await baglam.route(/\/storage\/v1\/object\/public\/ses-adaylar\/([^/?]+)/, async (r) => {
    const ad = decodeURIComponent(new URL(r.request().url()).pathname.split("/").pop());
    const id = ad.replace(/-[0-9a-f]{10}(\.\w+)$/, "$1");
    const yol = path.join(KAYNAK, id);
    if (!fs.existsSync(yol)) return r.fulfill({ status: 404, body: "" });
    return r.fulfill({ status: 200, body: fs.readFileSync(yol), headers: { "content-type": id.endsWith(".mp3") ? "audio/mpeg" : "audio/wav", "access-control-allow-origin": "*" } });
  });
  await baglam.route(/\/ses\/kasa_devam-e18d695314\.wav$/, (r) => r.fulfill({ status: 200, body: fs.readFileSync(ESKI_DOSYA), headers: { "content-type": "audio/wav" } }));
  await baglam.route(/supabase\.co\/(rest|auth|realtime|functions)/, (r) => r.abort());
  await baglam.addInitScript(({ secim, dil }) => {
    try { localStorage.setItem("bildim_ses_secim", JSON.stringify({ secimler: secim })); localStorage.setItem("bildim_dil", dil); } catch { /* yok */ }
  }, { secim: SURUM[surum].secim, dil });
  await baglam.addInitScript(iz);
  const sayfa = await baglam.newPage();
  const cdp = await baglam.newCDPSession(sayfa);
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(String(e.message).slice(0, 200)));
  await sayfa.goto(`${ADRES}/gizlilik`, { waitUntil: "domcontentloaded" });
  await sayfa.mouse.click(5, 5);
  await sayfa.evaluate(async (modul) => {
    window.__ses = await import(modul);
    window.__ses.sesKilidiAc?.();
  }, SURUM[surum].modul);
  await sayfa.mouse.click(5, 5);
  // bağlamı aç + dinleyici modülü hazır + bütün sesler ön yüklü (inmemiş dosyanın 250 ms kuralı ölçümü bozmasın)
  await sayfa.evaluate(async () => {
    const c = window.__ses.sesBaglami();
    await c.resume?.();
    await c.__hazir;
    window.__ses.sesOnYukle("hepsi");
    window.__ses.sesOnYukle(["rozet:ac", "rozet:devam", "sis", "kasa_devam"]);
  });
  await sayfa.waitForTimeout(3500);
  if (sen === "cpu6") await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  // çizelge sayfa içinde zamanlayıcıyla (gerçek sayfa gibi CPU yavaşlamasından etkilenir)
  const gizle = P.sekme ? [[Math.round(son * 0.45), 1500]] : [];
  await sayfa.evaluate(({ c, gizle }) => {
    const O = window.__cikis, t0 = performance.now();
    O.t0 = t0;
    const ekran = (ad) => O.olay.push({ t: performance.now(), tur: "ekran", ad });
    for (const [t, ad, ...arg] of c) {
      setTimeout(() => {
        if (ad === "an") { window.__anEtiket = arg[0]; return; }
        if (ad === "ekran") { ekran(arg[0]); return; }
        O.olay.push({ t: performance.now(), tur: "cagri", ad, arg: arg.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)), an: window.__anEtiket ?? null });
        if (ad === "sesSoruGeldi") ekran("soru");
        if (ad === "sesFazDegisti" && !(arg[1] && arg[1].ekran === false)) ekran(arg[0] ?? "faz");
        const f = window.__ses[ad];
        try { if (typeof f === "function") f(...arg.filter((x) => x !== undefined)); } catch (e) { O.olay.push({ t: performance.now(), tur: "hata", ad, e: String(e) }); }
      }, t);
    }
    for (const [t, ms] of gizle) setTimeout(() => {
      const gizli = (v) => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v }); Object.defineProperty(document, "hidden", { configurable: true, get: () => v === "hidden" }); document.dispatchEvent(new Event("visibilitychange")); };
      O.olay.push({ t: performance.now(), tur: "gizle", ms }); gizli("hidden"); setTimeout(() => gizli("visible"), ms);
    }, t);
  }, { c: cizelge, gizle });
  await sayfa.waitForTimeout(son + 2500);
  if (sen === "cpu6") await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const zincir = await sayfa.evaluate(() => window.__cikisOzet());
  const ham = await sayfa.evaluate(() => ({ olay: window.__cikis.olay, saat: window.__cikis.saat, t0: window.__cikis.t0, kayit: (window.__sesKayit || []).map((k) => ({ rol: k.rol, t: k.t, sonuc: k.sonuc })) }));
  await baglam.close();
  return ozetle({ surum, mod, sen, boyut: boyut.join("x"), dil }, zincir, ham, hatalar);
}

function ozetle(kim, zincir, ham, hatalar) {
  const ekranlar = ham.olay.filter((o) => o.tur === "ekran").map((o) => ({ t: o.t - ham.t0, ad: o.ad }));
  const r = cikisOlc(zincir, ekranlar, ham.t0, ham.kayit);
  if (process.env.SES_CIKIS_HAM) kim.ham = zincir.slice(0, 6);
  return { ...kim, ...r, hatalar };
}

// ---------------- ana ----------------
const isler = [];
let tohum = 11;
for (const surum of SURUMLER) for (const mod of MODLAR) for (const sen of SENARYOLAR) for (const boyut of BOYUTLAR) for (const dil of DILLER) isler.push({ surum, mod, sen, boyut, dil, tohum: tohum++ });
console.log(`${isler.length} koşu (${SURUMLER.join("/")} × ${MODLAR.length} mod × ${SENARYOLAR.length} senaryo × ${BOYUTLAR.length} boyut × ${DILLER.length} dil), paralel ${PARALEL}`);
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const sonuclar = [];
try {
  let i = 0;
  const isci = async () => {
    while (i < isler.length) {
      const is = isler[i++];
      try {
        const r = await kos(tarayici, is);
        sonuclar.push(r);
        console.log(`${r.surum.padEnd(6)} ${r.mod.padEnd(9)} ${r.sen.padEnd(12)} ${r.boyut} ${r.dil} · çalan ${r.sayac.calan} · ekran geçti ${r.sayac.ekranGecti} · binme ${r.sayac.binme} · kesildi ${r.sayac.kesildi} · çalmayan ${r.sayac.calmayan}${r.hatalar.length ? ` · HATA ${r.hatalar[0]}` : ""}`);
      } catch (e) { console.log(`✗ ${is.surum} ${is.mod} ${is.sen}: ${e.message}`); sonuclar.push({ ...is, boyut: is.boyut.join("x"), hata: e.message }); }
      fs.writeFileSync(path.join(CIKTI, `${ETIKET}.json`), JSON.stringify(sonuclar, null, 1));
    }
  };
  await Promise.all(Array.from({ length: PARALEL }, isci));
} finally { await tarayici.close(); }
fs.writeFileSync(path.join(CIKTI, `${ETIKET}.json`), JSON.stringify(sonuclar, null, 1));

// özet tablo
const md = [`# Ses çıkış ölçümü — ${ETIKET} (${new Date().toISOString()})`, "", "| sürüm | mod | senaryo | boyut | dil | çalan | ses bitmeden ekran geçti | binme > 50 ms | kesildi | çalmayan |", "|---|---|---|---|---|---|---|---|---|---|"];
for (const r of sonuclar) md.push(r.hata ? `| ${r.surum} | ${r.mod} | ${r.sen} | ${r.boyut} | ${r.dil} | HATA ${r.hata} |||||` : `| ${r.surum} | ${r.mod} | ${r.sen} | ${r.boyut} | ${r.dil} | ${r.sayac.calan} | ${r.sayac.ekranGecti} | ${r.sayac.binme} | ${r.sayac.kesildi} | ${r.sayac.calmayan} |`);
md.push("", "## Ayrıntı (ihlaller)");
for (const r of sonuclar) for (const s of r.sesler ?? []) if (s.ekranGecti || s.binme.length || s.kesildi)
  md.push(`- ${r.surum} · ${r.mod} · ${r.sen} · **${s.an ?? "?"}** ${s.rol} (${s.dosya}, doğal ${s.dogalMs} ms, pencere ${s.pencereMs ?? "—"} ms)${s.ekranGecti ? ` · ekran geçti (${s.ekranGecti.ad}, kalan ${s.ekranGecti.kalanMs} ms)` : ""}${s.binme.length ? ` · binme ${s.binme.map((b) => `${b.ile} ${b.ms} ms`).join(", ")}` : ""}${s.kesildi ? ` · kesildi ${s.kesilenMs} ms` : ""}`);
fs.writeFileSync(path.join(CIKTI, `${ETIKET}.md`), md.join("\n"));
console.log(`→ ${path.relative(process.cwd(), path.join(CIKTI, `${ETIKET}.md`))}`);
