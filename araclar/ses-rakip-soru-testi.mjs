// Site testi 3. tur · madde 2: rakip_cevapladi, 300 ms içinde soru_geldi gelecekse çalmaz (ses.js, bütün modlar ortak).
// Yerel, taklitsiz birim ölçümü: gerçek ses.js'i tarayıcıda içe aktarır, bd_ses_tani kaydını (window.__sesKayit) okur.
// Kullanım: npm run dev (başka kabukta) → node araclar/ses-rakip-soru-testi.mjs [--adres=http://localhost:5173]
import { chromium } from 'playwright-core';
const adres = (process.argv.find((a) => a.startsWith('--adres=')) ?? '--adres=http://localhost:5173').slice(8);
const tarayici = await chromium.launch({ channel: 'chrome', headless: true });
const sayfa = await tarayici.newPage();
await sayfa.addInitScript(() => sessionStorage.setItem('bd_ses_tani', '1'));
let kaldi = 0;
const ok = (ad, k, ek = '') => { console.log(k ? '  ✓' : '  ✗', ad, ek); if (!k) kaldi++; };
try {
  await sayfa.goto(adres + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const sonuc = await sayfa.evaluate(async () => {
    const m = await import('/oyun/lib/ses.js');
    const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
    const al = () => (window.__sesKayit || []).map((x) => x.rol);
    const sonuclar = {};
    // A) rakip cevapladı → 150 ms sonra yeni soru: rakip sesi ÇALMAZ
    window.__sesKayit = [];
    m.sesRakipCevapladi(); await bekle(150); m.sesSoruGeldi(); await bekle(500);
    sonuclar.yakin = al();
    // B) rakip cevapladı, soru gelmedi: 300 ms sonra çalar (tek kez)
    window.__sesKayit = [];
    m.sesRakipCevapladi(); await bekle(600);
    sonuclar.yalniz = al();
    // C) soru önce, rakip sonra (arada > 300 ms): ikisi de çalar
    window.__sesKayit = [];
    m.sesSoruGeldi(); await bekle(400); m.sesRakipCevapladi(); await bekle(500);
    sonuclar.sirali = al();
    return sonuclar;
  });
  ok('300 ms içinde soru geldi → rakip_cevapladi çalmadı', JSON.stringify(sonuc.yakin) === '["soru_geldi"]', JSON.stringify(sonuc.yakin));
  ok('soru gelmediyse rakip_cevapladi tek kez çaldı', JSON.stringify(sonuc.yalniz) === '["rakip_cevapladi"]', JSON.stringify(sonuc.yalniz));
  ok('soru sonra, rakip ayrı zamanda → ikisi de çaldı', JSON.stringify(sonuc.sirali) === '["soru_geldi","rakip_cevapladi"]', JSON.stringify(sonuc.sirali));
} catch (e) { console.error('HATA:', e.message); kaldi++; }
finally { await tarayici.close(); }
console.log(kaldi ? `${kaldi} KALDI` : 'HEPSİ GEÇTİ');
process.exit(kaldi ? 1 : 0);
