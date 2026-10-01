// EN arayüzde ülke adı taraması: DB'deki her ülke (ulkeler.kod/ad, Türkçe) için unvan metni ve sunucu bildirimi İngilizce çıkıyor mu?
// Türkçe arayüzde ad aynen kalıyor mu? Şehir adları DEĞİŞMEZ. Kullanım: node araclar/ulke-adi-testi.mjs [--adres=http://localhost:5173]
import { chromium } from 'playwright-core';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const ADRES = (process.argv.find((a) => a.startsWith('--adres=')) ?? '--adres=http://localhost:5173').slice(8);
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const ulkeler = await db.sorgu('select kod, ad from ulkeler order by kod');
await db.kapat();
const b = await chromium.launch({ channel: 'chrome', headless: true });
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ENAD = new Intl.DisplayNames(['en'], { type: 'region' });
const TR_HARF = /[ğĞışİşŞöÖçÇüÜ]/;   // Türkçe'ye özgü harfler (Türkiye hariç: Intl EN "Türkiye" verir)
for (const dil of ['en', 'tr']) {
  const c = await b.newContext({ viewport: { width: 390, height: 800 } });
  await c.addInitScript((d) => { try { localStorage.setItem('qt_dil', d); localStorage.setItem('bildim_dil', d); } catch {} }, dil);
  const p = await c.newPage();
  await p.goto(ADRES + '/gizlilik', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  const sonuc = await p.evaluate(async (liste) => {
    const k = await import('/oyun/lib/konum.js'); const u = await import('/oyun/lib/unvan.js'); const d = await import('/oyun/lib/dil.js');
    return { dil: d.aktifDil(), satirlar: liste.map(({ kod, ad }) => ({
      kod, ad,
      unvanKodlu: u.unvanMetni({ tur: 'ulke', ulke: kod, ad }),
      unvanKodsuz: u.unvanMetni({ tur: 'ulke', ad }),
      bildirim: k.bildirimMetni(`🏆 ${ad} Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.`),
      sehir: u.unvanMetni({ tur: 'sehir', sehir: 'İstanbul', ulke: kod }),
    })) };
  }, ulkeler);
  console.log(`— ${dil.toUpperCase()} arayüz (algılanan: ${sonuc.dil}), ${sonuc.satirlar.length} ülke`);
  if (dil === 'en') {
    ok('arayüz dili EN', sonuc.dil === 'en');
    const kotu = sonuc.satirlar.filter((s) => !s.unvanKodlu.endsWith(' Champion') || s.unvanKodlu !== s.unvanKodsuz);
    ok('unvan: hepsi "… Champion", kodlu ve kodsuz aynı', kotu.length === 0, JSON.stringify(kotu.slice(0, 3)));
    const trKaldi = sonuc.satirlar.filter((s) => (s.unvanKodlu.replace('Türkiye', '') + s.bildirim.replace('Türkiye', '')).match(TR_HARF));
    ok('hiçbir ülke adında Türkçe harf kalmadı (Türkiye hariç)', trKaldi.length === 0, JSON.stringify(trKaldi.slice(0, 5).map((s) => [s.ad, s.unvanKodlu, s.bildirim])));
    const esit = sonuc.satirlar.filter((s) => s.ad !== 'Türkiye' && s.unvanKodlu === `${s.ad} Champion` && s.ad.match(/[a-z]/i) && !['Fransa'].includes(s.ad) && /[ğşıöçü]|lar$|ler$/i.test(s.ad));
    ok('Türkçe ad (…lar/…ler/Türkçe harf) İngilizceye dönmüş', esit.length === 0, JSON.stringify(esit.slice(0, 5).map((s) => s.ad)));
    const bk = sonuc.satirlar.filter((s) => s.bildirim !== `🏆 You are the Champion of ${ENAD.of(s.kod)}! Your title will appear on your profile and in matches this week.`);
    ok('bildirim: cümle İngilizce ve ülke adı çevrildi (86/86 beklenen metin)', bk.length === 0, JSON.stringify(bk.slice(0, 3).map((s) => s.bildirim)));
    ok('şehir adı DEĞİŞMEDİ (İstanbul)', sonuc.satirlar.every((s) => s.sehir === 'İstanbul Champion'), sonuc.satirlar[0].sehir);
    console.log('   örnek:', sonuc.satirlar.filter((s) => ['IT', 'PH', 'TR', 'DE', 'RS', 'VN', 'US'].includes(s.kod)).map((s) => `${s.ad} → ${s.unvanKodlu}`).join(' | '));
  } else {
    ok('arayüz dili TR', sonuc.dil === 'tr');
    ok('TR: unvan aynen "<ad> Şampiyonu"', sonuc.satirlar.every((s) => s.unvanKodlu === `${s.ad} Şampiyonu`), JSON.stringify(sonuc.satirlar.filter((s) => s.unvanKodlu !== `${s.ad} Şampiyonu`).slice(0, 3)));
    ok('TR: bildirim aynen', sonuc.satirlar.every((s) => s.bildirim.includes(`${s.ad} Şampiyonu oldun`)));
  }
  await c.close();
}
await b.close();
console.log(`\n${gecti} geçti, ${kaldi} kaldı.`);
process.exit(kaldi ? 1 : 0);
