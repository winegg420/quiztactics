// Jev ikinci geçiş (23 Eyl 2026): ilk taramanın bayrakladığı çoklu doğru / eskiyebilir / hassas
// sorulara odaklı tek konulu soru + kategori uyuşmazlığına güvenli kategori. DB'ye YAZMAZ.
// Kullanım: node araclar/soru-temizlik/jev-ikinci-gecis.mjs [--say]  (kaldığı yerden devam eder)
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from '../pg-mini.mjs';
import { jevSor, choice, noul, maliyetUsd } from '../jev.mjs';
const HAM = new URL('../jev-tarama/ham.jsonl', import.meta.url);
const CIKTI = new URL('./jev-ikinci-gecis.jsonl', import.meta.url);
const BUTCE = 0.3, ESZ = 5;
const KATEGORILER = {
  genel_kultur: 'Genel kültür: gündelik bilgi, kurumlar, semboller, karışık konular',
  bilim: 'Bilim: fizik, kimya, biyoloji, matematik, astronomi, tıp',
  tarih: 'Tarih: dönemler, savaşlar, devletler, tarihî kişiler',
  cografya: 'Coğrafya: ülkeler, başkentler, dağlar, nehirler, iklim',
  edebiyat: 'Edebiyat: yazarlar, şairler, romanlar, şiirler, akımlar',
  spor: 'Spor: futbol, olimpiyatlar, sporcular, kurallar, takımlar',
  sanat: 'Sanat: resim, heykel, mimari, ressamlar, akımlar',
  sinema: 'Sinema: filmler, yönetmenler, oyuncular, ödüller',
  muzik: 'Müzik: besteciler, şarkıcılar, çalgılar, türler, albümler',
  teknoloji: 'Teknoloji: bilgisayar, yazılım, internet, mühendislik, şirketler',
};
const ham = fs.readFileSync(HAM, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const is = [];
for (const o of ham) {
  const f = [];
  if (o.siklar.some((s, i) => s !== o.bizimCevap && o.siklarDogru[i] > 0.5)) f.push('coklu');
  if (o.eskiyebilir > 0.5) f.push('eski');
  if (o.hassas > 0.5) f.push('hassas');
  if (o.jevKategori !== o.bizimKategori && !(o.bizimKategori === 'cografya' && o.jevKategori === 'bilim')) f.push('kat');
  if (f.length) is.push({ id: o.id, f });
}
const c = await new PgIstemci(await baglantiDizgisi()).baglan();
const rows = await c.sorgu(`select id::text, soru, secenekler::text, dogru_cevap, kategori from questions where aktif and id = any('{${is.map(x => x.id).join(',')}}'::uuid[])`);
await c.kapat?.();
const db = new Map((rows.rows ?? rows).map(r => [r.id, r]));
const yapildi = new Set(fs.existsSync(CIKTI) ? fs.readFileSync(CIKTI, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);
const kuyruk = is.filter(x => db.has(x.id) && !yapildi.has(x.id));
console.log({ toplam: is.length, aktif: is.filter(x => db.has(x.id)).length, kalan: kuyruk.length,
  coklu: is.filter(x => db.has(x.id) && x.f.includes('coklu')).length, eski: is.filter(x => db.has(x.id) && x.f.includes('eski')).length,
  hassas: is.filter(x => db.has(x.id) && x.f.includes('hassas')).length, kat: is.filter(x => db.has(x.id) && x.f.includes('kat')).length });
if (process.argv.includes('--say')) process.exit(0);
let jeton = 0;
async function sor(x) {
  const r = db.get(x.id); const sik = JSON.parse(r.secenekler); const dogru = sik[r.dogru_cevap];
  const q = {};
  if (x.f.includes('coklu')) q.coklu = noul(`Soru yazarının doğru cevabı "${dogru}". Diğer şıklardan en az biri de bu soruya doğru cevap olarak kabul edilebilir mi?`);
  if (x.f.includes('eski')) q.eski = noul('Bu sorunun doğru cevabı önümüzdeki 2 yıl içinde değişebilir mi (güncel rekor, unvan, görevdeki kişi, sıralama, istatistik gibi)?');
  if (x.f.includes('hassas')) q.hassas = noul('Bu soru bir oyuncuyu incitebilecek ya da siyasi, dini veya etnik açıdan hassas ve tartışmalı bir konu mu?');
  if (x.f.includes('kat')) q.kat = choice('Bu bilgi yarışması sorusu en çok hangi bilgi alanına girer?', KATEGORILER);
  const y = await jevSor({ soru: r.soru, siklar: sik, dogru_cevap: dogru }, q);
  const a = y.answers; jeton += y.usage?.input_tokens ?? 0;
  const o = { id: x.id, f: x.f, kategori: r.kategori, soru: r.soru, dogru };
  if (a.coklu) o.coklu = a.coklu.noul; if (a.eski) o.eski = a.eski.noul; if (a.hassas) o.hassas = a.hassas.noul;
  if (a.kat) { o.jevKat = a.kat.choice; o.katGuven = a.kat.confidence; }
  o.jeton = y.usage?.input_tokens ?? 0;
  fs.appendFileSync(CIKTI, JSON.stringify(o) + '\n');
}
let i = 0, hata = 0;
await Promise.all(Array.from({ length: ESZ }, async () => {
  while (i < kuyruk.length) { if (maliyetUsd(jeton) > BUTCE) return; const x = kuyruk[i++];
    try { await sor(x); } catch (e) { hata++; console.error(x.id, e.message); } }
}));
console.log({ bitti: true, hata, jeton, usd: maliyetUsd(jeton).toFixed(4) });
