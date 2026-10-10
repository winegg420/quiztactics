// Kolay seri — Claude API ile soru üretimi (üretim claude-opus-5-5, hakem claude-sonnet-5-5). VERİTABANINA YAZMAZ.
// Stil: docs/SORU_STIL_PROFILI.md + kolay-01 (Ida onaylı). Karışım ~%70 zorluk 2 / ~%30 zorluk 3 (Ida, 9 Eki 2026).
// Kategori: sanat, müzik, teknoloji, spor, tarih, sinema — kota, aktif zorluk 2 sayısı AZ olana ÇOK (ölçüm koşuda yazılır).
//
// Kapılar (sırayla; biri takılırsa taslak elenir):
//   1) Biçim + şık denge JS aynası + EN kontrolleri (soru-parti-1000/denetle.mjs › kayitDenetle)
//   2) Yinelenen: havuzla / partiyle birebir · aynı cevap + kök-kelime Jaccard ≥ 0,3 · Jaccard ≥ 0,6 · cevap soru metninde
//   3) public.soru_kural_isaretleri — ağırlık ≥ 2 işaret yok (soru_denetim/kapi.mjs › hamKapiSorgusu)
//   4) Jev "soru olmadan" şık ipucu testi — doğru şıkka p ≤ 0,75 (kapi.mjs › sikIpucuTesti)
//   5) Jev tek doğru — hiçbir yanlış şık "bu da doğru" (p ≥ 0,5) olmamalı
//   6) Claude hakem (Sonnet): doğru şık kesin_dogru, her yanlış şık kesin_yanlis (tartismali → elenir),
//      EK: yasak tip yok (genel kavram / tanımlama / okuduğunu anlama / mantıkla bulunur), tek olgu,
//      eskimez, EN uygun, zorluk tahmini etiketle uyumlu.
//
// DENEME : node araclar/soru-uretim/api-uret.mjs --klasor kolay-03 --adet 20 [--kuru] [--butce-usd 5]
//          → .tmp/api-uret/<klasor>-deneme/ (git'e girmez)
// TAM    : node araclar/soru-uretim/api-uret.mjs --klasor kolay-03 --adet 50 --butce-usd 5
//          → araclar/soru-uretim/<klasor>/sorular.json + liste.md + ozet.json (ara durum .tmp/api-uret/<klasor>/)
//          Yarıda kalırsa aynı komut kaldığı yerden devam eder.
// ÇIKAR  : node araclar/soru-uretim/api-uret.mjs --klasor kolay-03 --cikar 3,17   (API yok; Ida'nın çıkardığı numaralar)
// Migration (UYGULANMAZ): node araclar/soru-uretim/uret-migration-parti.mjs --parti 3 --no NNNN --klasor kolay-03 --ad soru_parti_kolay_03 --api
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { hamKapiSorgusu, sikIpucuTesti } from '../soru_denetim/kapi.mjs';
import { jevSor, noul, maliyetUsd } from '../jev.mjs';
import { kayitDenetle, kokler, jaccard } from '../soru-parti-1000/denetle.mjs';
import { normalize } from '../soru-parti-1000/kural.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd, havuz } from '../soru-temizlik/claude-cagri.mjs';

const URETICI = 'claude-opus-5-5';
const HAKEM = 'claude-sonnet-5-5';
const KATEGORI = ['sanat', 'muzik', 'teknoloji', 'spor', 'tarih', 'sinema', 'genel_kultur', 'edebiyat'];
const Z3_PAY = 0.3;
const YEREL_PAY = 0.1;
const ESIK_P = 0.75;
const TUR_SAYISI = 3;
const ESZAMANLI = 4;

const arg = (ad, v) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : v; };
const KLASOR_AD = arg('--klasor');
const ADET = Number(arg('--adet', 50));
const BUTCE = Number(arg('--butce-usd', 5));
const KURU = process.argv.includes('--kuru');
const CIKAR = arg('--cikar');
if (!/^[a-z0-9-]+$/.test(KLASOR_AD ?? '') || !Number.isInteger(ADET) || ADET < 6 || !(BUTCE > 0)) {
  throw new Error('Kullanım: api-uret.mjs --klasor kolay-03 [--adet 50] [--butce-usd 5] [--kuru] | --cikar 3,17');
}
const DENEME = ADET < 50 && !CIKAR;
const CIKTI = DENEME ? path.join(KOK, '.tmp', 'api-uret', `${KLASOR_AD}-deneme`) : path.join(KOK, 'araclar', 'soru-uretim', KLASOR_AD);
const ARA = DENEME ? CIKTI : path.join(KOK, '.tmp', 'api-uret', KLASOR_AD);
const DURUM = path.join(ARA, 'durum.json');
const ON_EK = KLASOR_AD.replace(/^kolay-/, 'K');

// ---- Maliyet ----
const jev = { jeton: 0 };
const toplamUsd = () => apiUsd() + maliyetUsd(jev.jeton);
const butceDoldu = () => toplamUsd() > BUTCE;

// ---- Kota: aktif zorluk 2 sayısı az olana çok ----
function kotaHesapla() {
  const satir = sorgu(`select kategori, count(*)::int n from public.questions where aktif and zorluk in (2, 3) and not ('sik_ipucu_jev' = any(coalesce(supheli_isaretler, '{}'))) and kategori = any(array[${KATEGORI.map((k) => `'${k}'`).join(',')}]) group by kategori`);
  const z2 = Object.fromEntries(KATEGORI.map((k) => [k, Number(satir.find((r) => r.kategori === k)?.n ?? 0)]));
  const tavan = Math.max(...Object.values(z2)) + 25; // en kalabalık kategori de pay alsın
  const agirlik = Object.fromEntries(KATEGORI.map((k) => [k, tavan - z2[k]]));
  const top = Object.values(agirlik).reduce((a, b) => a + b, 0);
  const ham = KATEGORI.map((k) => ({ k, h: (ADET * agirlik[k]) / top }));
  const kota = Object.fromEntries(ham.map((x) => [x.k, Math.floor(x.h)]));
  let kalan = ADET - Object.values(kota).reduce((a, b) => a + b, 0);
  for (const x of [...ham].sort((a, b) => (b.h % 1) - (a.h % 1))) if (kalan-- > 0) kota[x.k]++;
  const z3 = Object.fromEntries(KATEGORI.map((k) => [k, Math.round(kota[k] * Z3_PAY)]));
  return { z2_olcum: z2, kota, z3 };
}

// ---- Havuz ----
function havuzCek() {
  const r = sorgu(`select soru, kategori, aktif, secenekler->>dogru_cevap dogru from public.questions`);
  return r.map((x) => ({ ...x, n: normalize(x.soru), kok: kokler(x.soru), dn: normalize(x.dogru ?? '') }));
}

// ---- Stil örnekleri ----
const ONAYLI = [
  ["'Für Elise' adıyla bilinen ünlü piyano parçasının bestecisi kimdir?", 'Beethoven', ['Mozart', 'Chopin', 'Schubert']],
  ["ABBA şarkılarıyla kurulu 'Mamma Mia!' (2008) filmi hangi ülkenin bir adasında geçer?", 'Yunanistan', ['İtalya', 'İspanya', 'Hırvatistan']],
  ["2004'te Chelsea'ye geldiğinde kendini 'Special One' olarak tanıtan teknik direktör kimdir?", 'José Mourinho', ['Carlo Ancelotti', 'Claudio Ranieri', 'Rafael Benítez']],
  ["Windows'ta kopyalanan içeriği yapıştırmak için kullanılan klavye kısayolu hangisidir?", 'Ctrl+V', ['Ctrl+C', 'Ctrl+X', 'Ctrl+Z']],
  ["Spielberg'in 'E.T.' filminde uzaylıyı evinde saklayan çocuğun adı nedir?", 'Elliott', ['Mikey', 'Brody', 'Sean']],
  ["'Harry Potter' serisinde Harry'nin kar beyazı baykuşunun adı nedir?", 'Hedwig', ['Errol', 'Pigwidgeon', 'Fawkes']],
  ["Çin'in ilk imparatorunun mezarını bekleyen binlerce asker heykeli hangi malzemeden yapılmıştır?", 'Pişmiş toprak', ['Dökme bronz', 'Yeşim taşı', 'Beyaz mermer']],
];
function stilOrnekleri(k) {
  const kolay01 = JSON.parse(fs.readFileSync(path.join(KOK, 'araclar', 'soru-uretim', 'kolay-01', 'sorular.json'), 'utf8'));
  const kat = kolay01.filter((t) => t.k === k).slice(0, 6).map((t) => [t.s, t.d, t.y]);
  return [...ONAYLI, ...kat].map(([s, d, y]) => `- ${s} → **${d}** | ${y.join(' | ')}`).join('\n');
}

const GEN_SISTEM = `Bir bilgi yarışması oyunu için soru yazarısın. Sorular Türkçe yazılır; dünyaya açık sorular İngilizce de oynanır.

HEDEF TARZ (oyunun sahibinin beğendiği): kısa, TEK ve DOĞRULANABİLİR bir olguyu soran, bilinen kültürden soru.
"Biliyorsan hemen bilirsin; bilmiyorsan mantıkla bulamazsın."

ZORLUK
- 2: geniş kitlenin duyduğu ünlü eser / kişi / olay / ürünün bilinen bir ayrıntısı.
- 3: bir tık daha zor — yine bilinen kültür, ama herkesin değil meraklı bir izleyici/okurun/dinleyicinin bileceği ayrıntı
  (ünlü eserin ikinci derece ayrıntısı, tanınmış ama ilk akla gelmeyen kişi/yer/ad). Uzmanlık bilgisi DEĞİL.

YASAK TİPLER (yazarsan elenir):
(a) Genel kavram: "X'in amacı/işlevi nedir", "X ne işe yarar", "X neyi sağlar", "X'te ne yapılır".
(b) Tanımlama: bir terimin anlamını soran ("X ne demektir?", "X nedir?"). Bir şeyin ÖZEL ADINI sormak serbesttir
    ("Kâğıdı kesmeden katlayarak şekil yapma sanatına ne ad verilir?" → Origami) — ama ad sorudaki sözcüklerden türetilebiliyorsa yasak.
(c) Okuduğunu anlama: cevap ya da cevabın kökü soru metninde geçiyor ya da metinden çıkarılabiliyor.
(d) Mantıkla/sağduyuyla bulunan: doğru şık en genel / en makul olan, çeldiriciler saçma ya da konu dışı.
Ayrıca YOK: uzmanlık bilgisi · cevabı yıl/tarih olan soru · büyük sayı/ölçüm ezberi · çok kişi adı karıştıran uzun soru ·
zamanla değişebilecek bilgi ("en çok", "şu anki", rekor, süren kariyer istatistiği) · kaynağa göre değişen/tartışmalı olgu.

ŞIKLAR: 1 doğru + 3 yanlış; dördü AYNI TÜRDE (dördü de şehir, dördü de ressam...), benzer uzunluk ve biçim. Doğru şık en uzun
olmasın; tek çok kelimeli şık doğru şık olmasın. Çeldiriciler inandırıcı ama KESİNLİKLE yanlış. Şık en çok ~30 karakter.
SORU en çok ~110 karakter, "?" ile biter, cevabı parantezle ya da ipucuyla ele vermez.

KAPSAM: "global" (dünyada bilinen) ağırlıklı. "yerel" yalnız Türkiye'ye özgü konu (Türk dizisi/sanatçısı, Türkiye tarihi);
partinin en çok %${Math.round(YEREL_PAY * 100)}'u.

İNGİLİZCE (yalnız global): en_s, en_d, en_y. Düz çeviri değil — anadili İngilizce bir yarışma sunucusunun soracağı doğal cümle.
Şıklar Türkçe ile AYNI SIRADA ve aynı anlamda (en_d = d'nin karşılığı, en_y[i] = y[i]'nin karşılığı). Eser adları İngilizce
bilinen/orijinal adıyla ("Kuzuların Sessizliği" → "The Silence of the Lambs"). İngilizce metinde Türkçe harf olmasın (özel ad hariç).
Cevabı ele veren ek bilgi/parantez ekleme. Kapsam yerel ise en_s ve en_d boş dize, en_y boş dizi.

olgu: sorunun dayandığı tek olguyu bir cümleyle yaz (doğrulama için).
Havuzda zaten sorulmuş olguları TEKRAR SORMA. Yalnız şemaya uygun JSON döndür.`;

const GEN_SEMA = {
  type: 'object',
  properties: {
    sorular: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          s: { type: 'string' }, d: { type: 'string' }, y: { type: 'array', items: { type: 'string' } },
          zorluk: { type: 'integer', enum: [2, 3] }, kapsam: { type: 'string', enum: ['global', 'yerel'] }, olgu: { type: 'string' },
          en_s: { type: 'string' }, en_d: { type: 'string' }, en_y: { type: 'array', items: { type: 'string' } },
        },
        required: ['s', 'd', 'y', 'zorluk', 'kapsam', 'olgu', 'en_s', 'en_d', 'en_y'],
        additionalProperties: false,
      },
    },
  },
  required: ['sorular'],
  additionalProperties: false,
};

/** Sabit blok (kategori + stil + havuz cevapları) önbelleğe alınır; turlar arasında yalnız ikinci blok değişir. */
function genIstem(k, z2, z3, havuzCevap, onceki) {
  const sabit = [
    `Kategori: ${k}.`,
    `\nStil referansı (onaylı; aynen kullanma, ilk şık doğru):\n${stilOrnekleri(k)}`,
    `\nBu kategoride havuzdaki soruların doğru cevapları (bu olguları tekrar sorma; aynı cevabı BAŞKA bir olguyla sormak ancak gerçekten farklıysa):\n${havuzCevap.join(' · ')}`,
  ].join('\n');
  const degisen = [
    `${z2 + z3} soru yaz: ${z2} tanesi zorluk 2, ${z3} tanesi zorluk 3.`,
    onceki.length ? `\nBu partide zaten yazılanlar (tekrar etme):\n${onceki.map((s) => `- ${s}`).join('\n')}` : '',
  ].join('\n');
  return [{ type: 'text', text: sabit, cache_control: { type: 'ephemeral' } }, { type: 'text', text: degisen }];
}

const HAKEM_SISTEM = `Bir bilgi yarışması için titiz bir hakem editörsün. Sana bir soru, doğru cevabı, üç yanlış şıkkı ve (varsa) İngilizcesi verilir.
Değerlendir:
1. dogru_sik: verilen doğru cevap tartışmasız doğru mu? kesin_dogru | tartismali | yanlis.
2. yanlis_siklar: her yanlış şık için — cevap olarak verilirse oyuncu haklı itiraz edebilir mi? Kısmen doğru, tanıma/kaynağa göre doğru
   ya da tartışmalıysa "tartismali"; yalnız açıkça yanlışsa "kesin_yanlis". Şüphedeysen "tartismali".
3. yasak_tip: yok | genel_kavram ("X'in amacı/işlevi", "ne işe yarar") | tanimlama ("X ne demektir", terimin anlamı) |
   okudugunu_anlama (cevap soru metninden çıkıyor) | mantikla_bulunur (doğru şık en genel/makul olan). Ölçüt: konuyu HİÇ bilmeyen
   ama zeki biri yalnız soru ve şıklara bakarak doğruyu güvenle bulabiliyorsa yasak tiptir.
4. tek_olgu: soru tek, doğrulanabilir bir olguya mı dayanıyor?
5. eskiyebilir: cevap zamanla değişebilir mi?
6. zorluk_tahmin (1-5): 1 herkes bilir / aşırı basit · 2 genel kültürü olan çoğu kişi bilir · 3 meraklı izleyici/okur bilir ·
   4 konuyla ilgilenen bilir · 5 uzman.
7. en_uygun: İngilizce soru ve şıklar Türkçeyle aynı anlamda, AYNI SIRADA, doğal ve doğru mu? İngilizce yoksa true.
gerekce: tek kısa Türkçe cümle (sorun varsa sorunu yaz). Yalnız şemaya uygun JSON.`;

const HAKEM_SEMA = {
  type: 'object',
  properties: {
    dogru_sik: { type: 'string', enum: ['kesin_dogru', 'tartismali', 'yanlis'] },
    yanlis_siklar: { type: 'array', items: { type: 'object', properties: { sik: { type: 'string' }, karar: { type: 'string', enum: ['kesin_yanlis', 'tartismali'] } }, required: ['sik', 'karar'], additionalProperties: false } },
    yasak_tip: { type: 'string', enum: ['yok', 'genel_kavram', 'tanimlama', 'okudugunu_anlama', 'mantikla_bulunur'] },
    tek_olgu: { type: 'boolean' }, eskiyebilir: { type: 'boolean' },
    zorluk_tahmin: { type: 'integer' }, en_uygun: { type: 'boolean' }, gerekce: { type: 'string' },
  },
  required: ['dogru_sik', 'yanlis_siklar', 'yasak_tip', 'tek_olgu', 'eskiyebilir', 'zorluk_tahmin', 'en_uygun', 'gerekce'],
  additionalProperties: false,
};

const hakemIstem = (t) => [
  `Soru: ${t.s}`, `Doğru cevap: ${t.d}`, `Yanlış şıklar: ${t.y.join(' | ')}`, `Yazarın zorluk etiketi: ${t.zorluk}`,
  t.en ? `EN soru: ${t.en.s}\nEN doğru: ${t.en.d}\nEN yanlış: ${t.en.y.join(' | ')}` : 'İngilizce yok (yerel soru).',
].join('\n');

// ---- Kapılar ----
function taslakKur(k, r) {
  const yerel = r.kapsam === 'yerel';
  const enVar = !yerel && r.en_s && r.en_d && Array.isArray(r.en_y) && r.en_y.length === 3;
  return {
    k, yerel, s: String(r.s).trim(), d: String(r.d).trim(), y: (r.y ?? []).map((x) => String(x).trim()), zorluk: r.zorluk, z: r.zorluk,
    en: enVar ? { s: r.en_s.trim(), d: r.en_d.trim(), y: r.en_y.map((x) => String(x).trim()) } : null,
    en_neden: yerel ? 'Yerel TR sorusu (kapsam=yerel); İngilizce oyuncu için anlamsız' : enVar ? undefined : 'Üretici İngilizce vermedi',
    olgu: String(r.olgu ?? ''), sonuc: 'bekliyor', neden: '',
  };
}

const ELE_UYARI = /soru uzun|45 karakteri|EN metinde Türkçe|EN soruda TR|EN soru "\?"|soru "\?"|EN kural/;

function yerelKapilar(t, havuzu, parti) {
  if (!t.yerel && !t.en) return 'global ama İngilizce yok';
  const { hata, uyari } = kayitDenetle({ ...t, benzerOk: true });
  if (hata.length) return `biçim/kural: ${hata.join('; ')}`;
  const ele = uyari.filter((u) => ELE_UYARI.test(u));
  if (ele.length) return `uyarı: ${ele.join('; ')}`;
  const n = normalize(t.s), dn = normalize(t.d), kok = kokler(t.s);
  for (const kk of kokler(t.d)) if (kk.length >= 4 && kok.has(kk)) return `cevap soruda ("${t.d}")`;
  for (const m of [...havuzu, ...parti]) {
    if (m.n === n) return `birebir var: "${m.soru}"`;
    const j = jaccard(kok, m.kok);
    if ((m.dn === dn && j >= 0.3) || j >= 0.6) return `benzer (${j.toFixed(2)}): "${m.soru}" → ${m.dogru}`;
  }
  return null;
}

async function tekDogru(t) {
  const tr = [t.d, ...t.y];
  const sorular = Object.fromEntries(t.y.map((s, i) => [`sik_${i}`, noul(`Soruya "${s}" cevabı verilirse bu da doğru sayılabilir mi?`)]));
  const y = await jevSor({ soru: t.s, siklar: tr, dogru_cevap: t.d }, sorular);
  jev.jeton += y.usage?.input_tokens ?? 0;
  return Math.max(...t.y.map((_, i) => Number(y.answers?.[`sik_${i}`]?.noul ?? 0)));
}

async function kapilar(adaylar, anahtar) {
  let kural;
  try {
    const satir = sorgu(hamKapiSorgusu(adaylar.map((t, i) => ({ anahtar: String(i), soru: t.s, secenekler: [t.d, ...t.y], dogru_cevap: 0 }))));
    kural = new Map(satir.map((r) => [Number(r.anahtar), r.agir || '']));
  } catch (e) { throw new Error(`Kural kapısı çalışmadı: ${String(e.message).slice(0, 200)}`); }
  adaylar.forEach((t, i) => {
    const a = kural.get(i);
    if (a === undefined) { t.sonuc = 'elendi'; t.neden = 'kural kapısı satır döndürmedi'; } else if (a) { t.sonuc = 'elendi'; t.neden = `kural işareti: ${a}`; }
  });
  await havuz(adaylar.filter((t) => t.sonuc === 'bekliyor'), ESZAMANLI, async (t) => {
    if (butceDoldu()) { t.neden = 'bütçe durdurdu'; return; }
    try {
      const ip = await sikIpucuTesti([t.d, ...t.y], t.d, t.s);
      jev.jeton += ip.jeton;
      t.jev_p = ip.pDogru;
      if (ip.pDogru == null) { t.sonuc = 'elendi'; t.neden = `Jev ipucu atlandı: ${ip.atlandi}`; return; }
      if (ip.pDogru > ESIK_P) { t.sonuc = 'elendi'; t.neden = `Jev ipucu p=${ip.pDogru.toFixed(2)} > ${ESIK_P}`; return; }
      const td = await tekDogru(t);
      if (td >= 0.5) { t.sonuc = 'elendi'; t.neden = `yanlış şık da doğru olabilir (Jev p=${td.toFixed(2)})`; return; }
      const h = await claudeCagir(anahtar, { model: HAKEM, sistem: HAKEM_SISTEM, sema: HAKEM_SEMA, istem: hakemIstem(t), maxJeton: 6000, effort: 'medium' });
      t.hakem = { dogru: h.dogru_sik, yasak: h.yasak_tip, tahmin: h.zorluk_tahmin, gerekce: String(h.gerekce ?? '').slice(0, 200) };
      const tart = (h.yanlis_siklar ?? []).find((x) => x.karar !== 'kesin_yanlis');
      const sorun = h.dogru_sik !== 'kesin_dogru' ? `hakem: doğru şık ${h.dogru_sik}`
        : tart ? `hakem: "${tart.sik}" tartışmalı`
        : (h.yanlis_siklar ?? []).length !== 3 ? 'hakem: 3 yanlış şık değerlendirmedi'
        : h.yasak_tip !== 'yok' ? `hakem: yasak tip ${h.yasak_tip}`
        : !h.tek_olgu ? 'hakem: tek olgu değil'
        : h.eskiyebilir ? 'hakem: eskiyebilir'
        : !h.en_uygun ? 'hakem: EN uygun değil'
        : h.zorluk_tahmin < 2 ? `hakem: aşırı kolay (tahmin ${h.zorluk_tahmin})`
        : h.zorluk_tahmin > t.zorluk + 1 ? `hakem: etiketten zor (tahmin ${h.zorluk_tahmin})` : null;
      if (sorun) { t.sonuc = 'elendi'; t.neden = `${sorun} — ${t.hakem.gerekce}`; return; }
      t.sonuc = 'gecti';
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi, durduruldu: ${e.message.slice(0, 160)}`);
      t.sonuc = 'elendi'; t.neden = `kapı hatası: ${String(e.message).slice(0, 120)}`;
      console.error(`Kapı hata: ${t.neden}`);
    }
  });
}

// ---- Durum ----
function durumOku() {
  if (!fs.existsSync(DURUM)) return null;
  const st = JSON.parse(fs.readFileSync(DURUM, 'utf8'));
  for (const [m, h] of Object.entries(st.harcama ?? {})) harcama[m] = { ...h };
  jev.jeton = st.jevJeton ?? 0;
  return st;
}
function durumYaz(st) {
  st.harcama = harcama; st.jevJeton = jev.jeton;
  fs.mkdirSync(ARA, { recursive: true });
  fs.writeFileSync(DURUM + '.tmp', JSON.stringify(st, null, 1));
  fs.renameSync(DURUM + '.tmp', DURUM);
}

// ---- Seçim + çıktı ----
function sec(st) {
  const secilen = [];
  for (const k of KATEGORI) {
    const g = st.taslaklar.filter((t) => t.k === k && t.sonuc === 'gecti').sort((a, b) => a.jev_p - b.jev_p);
    const z3 = g.filter((t) => t.zorluk === 3).slice(0, st.plan.z3[k]);
    const z2 = g.filter((t) => t.zorluk === 2).slice(0, st.plan.kota[k] - z3.length);
    const ek = g.filter((t) => !z3.includes(t) && !z2.includes(t)).slice(0, st.plan.kota[k] - z3.length - z2.length);
    secilen.push(...z2, ...z3, ...ek);
  }
  // Yerel tavanı
  const tavan = Math.max(1, Math.round(ADET * YEREL_PAY));
  const yerel = secilen.filter((t) => t.yerel);
  return yerel.length > tavan ? secilen.filter((t) => !t.yerel || yerel.indexOf(t) < tavan) : secilen;
}

const eksikler = (st, secilen) => Object.fromEntries(KATEGORI.map((k) => {
  const g = secilen.filter((t) => t.k === k);
  return [k, { z2: Math.max(0, st.plan.kota[k] - st.plan.z3[k] - g.filter((t) => t.zorluk === 2).length), z3: Math.max(0, st.plan.z3[k] - g.filter((t) => t.zorluk === 3).length) }];
}).filter(([, e]) => e.z2 + e.z3 > 0));

function yaz(st, secilen) {
  const sirali = [...secilen].sort((a, b) => KATEGORI.indexOf(a.k) - KATEGORI.indexOf(b.k) || a.zorluk - b.zorluk);
  const cikti = sirali.map((t, i) => ({
    id: `${ON_EK}-${String(i + 1).padStart(2, '0')}`, k: t.k, yerel: t.yerel, s: t.s, d: t.d, y: t.y, zorluk: t.zorluk,
    en: t.en, ...(t.en ? {} : { en_neden: t.en_neden }), olgu: t.olgu, jev_p: Number(t.jev_p.toFixed(3)), hakem_tahmin: t.hakem.tahmin,
  }));
  fs.mkdirSync(CIKTI, { recursive: true });
  fs.writeFileSync(path.join(CIKTI, 'sorular.json'), JSON.stringify(cikti, null, 1) + '\n');
  const liste = cikti.map((t) => `${t.id.slice(-2)}. **[${t.id}]** ${t.k} · zorluk ${t.zorluk}${t.yerel ? ' · YEREL (EN yok)' : ''}\n    TR: ${t.s} → **${t.d}** | ${t.y.join(' | ')}\n    ${t.en ? `EN: ${t.en.s} → **${t.en.d}** | ${t.en.y.join(' | ')}` : `EN: — (${t.en_neden})`}`).join('\n');
  fs.writeFileSync(path.join(CIKTI, 'liste.md'), `# ${KLASOR_AD} — ${cikti.length} soru (Claude API üretimi, ${new Date().toISOString().slice(0, 10)})\n\nÜretim ${URETICI} · hakem ${HAKEM} · Jev ipucu ≤ ${ESIK_P}. İlk şık doğru (migration'da karıştırılır).\nÇıkarmak için: \`node araclar/soru-uretim/api-uret.mjs --klasor ${KLASOR_AD} --cikar 3,17\`\n\n${liste}\n`);
  const neden = {};
  for (const t of st.taslaklar.filter((x) => x.sonuc === 'elendi')) {
    const tur = t.neden.startsWith('hakem:') ? t.neden.replace(/^hakem: ("[^"]*" )?/, 'hakem: ').replace(/ \(tahmin.*| —.*$/, '').trim()
      : t.neden.replace(/ p=.*$/, '').replace(/[:(—"].*$/, '').trim();
    neden[tur] = (neden[tur] || 0) + 1;
  }
  const say = (f) => cikti.reduce((m, t) => ((m[f(t)] = (m[f(t)] || 0) + 1), m), {});
  const ozet = {
    klasor: KLASOR_AD, tarih: new Date().toISOString().slice(0, 10), uretici: URETICI, hakem: HAKEM,
    kota_gerekce: 'Aktif zorluk 2 sayısı az olan kategoriye çok (ağırlık = en kalabalık + 25 − kategori)',
    z2_olcum: st.plan.z2_olcum, kota: st.plan.kota, z3_hedef: st.plan.z3,
    taslak: st.taslaklar.length, gecen: st.taslaklar.filter((t) => t.sonuc === 'gecti').length, secilen: cikti.length,
    kategori: say((t) => t.k), zorluk: say((t) => t.zorluk), yerel: cikti.filter((t) => t.yerel).length, en: cikti.filter((t) => t.en).length,
    eksik: eksikler(st, secilen), elenen_sebep: neden,
    harcama_usd: { claude: Number(apiUsd().toFixed(3)), jev: Number(maliyetUsd(jev.jeton).toFixed(4)), toplam: Number(toplamUsd().toFixed(3)), jeton: harcama },
  };
  fs.writeFileSync(path.join(CIKTI, 'ozet.json'), JSON.stringify(ozet, null, 2) + '\n');
  fs.writeFileSync(path.join(ARA, 'elenen.json'), JSON.stringify(st.taslaklar.filter((t) => t.sonuc !== 'gecti'), null, 1));
  return ozet;
}

// ---- Çalıştır ----
async function uret() {
  let st = durumOku();
  if (!st) {
    const plan = kotaHesapla();
    st = { plan, taslaklar: [], tur: 0 };
    // Tam koşu, aynı klasörün deneme taslaklarını ve harcamasını devralır (bütçe tavanı ikisini birlikte kapsar)
    const deneme = path.join(KOK, '.tmp', 'api-uret', `${KLASOR_AD}-deneme`, 'durum.json');
    if (!DENEME && !KURU && fs.existsSync(deneme)) {
      const d = JSON.parse(fs.readFileSync(deneme, 'utf8'));
      st.taslaklar = d.taslaklar;
      for (const [m, h] of Object.entries(d.harcama ?? {})) harcama[m] = { ...h };
      jev.jeton = d.jevJeton ?? 0;
      console.log(`Deneme devralındı: ${d.taslaklar.length} taslak (${d.taslaklar.filter((t) => t.sonuc === 'gecti').length} geçen) · $${toplamUsd().toFixed(3)}`);
    }
  }
  console.log(`Ölçüm (aktif zorluk 2): ${JSON.stringify(st.plan.z2_olcum)}`);
  console.log(`Kota: ${JSON.stringify(st.plan.kota)} · zorluk 3: ${JSON.stringify(st.plan.z3)} · çıktı ${path.relative(KOK, CIKTI)}`);
  if (KURU) { console.log(`Kuru: API çağrısı yok. Stil örneği (sanat):\n${stilOrnekleri('sanat')}`); return; }
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok — Ida eklemeli.');
  const havuzu = havuzCek();
  console.log(`Havuz ${havuzu.length} soru (aktif + pasif)`);

  while (st.tur < TUR_SAYISI && !butceDoldu()) {
    const eksik = eksikler(st, sec(st));
    if (!Object.keys(eksik).length) break;
    st.tur += 1;
    console.log(`Tur ${st.tur} · eksik ${JSON.stringify(eksik)}`);
    const yeni = [];
    await havuz(Object.entries(eksik), 3, async ([k, e]) => {
      if (toplamUsd() + 0.4 > BUTCE) return; // bir üretim çağrısı ~$0,1–0,3; paralel çağrılar tavanı aşmasın
      const fazla = st.tur === 1 ? 2.5 : 3; // elenme payı (20'lik denemede geçen %41)
      const z2 = Math.ceil(e.z2 * fazla), z3 = Math.ceil(e.z3 * fazla);
      const havuzCevap = [...new Set(havuzu.filter((m) => m.kategori === k && m.aktif && m.dogru).map((m) => m.dogru))];
      const onceki = st.taslaklar.filter((t) => t.k === k).map((t) => t.s);
      try {
        const y = await claudeCagir(anahtar, { model: URETICI, sistem: GEN_SISTEM, sema: GEN_SEMA, istem: genIstem(k, z2, z3, havuzCevap, onceki), maxJeton: 32000, effort: 'medium' });
        const gelen = (y.sorular ?? []).map((r) => taslakKur(k, r));
        console.log(`  ${k}: ${gelen.length} taslak (istenen ${z2 + z3}) · $${toplamUsd().toFixed(3)}`);
        yeni.push(...gelen);
      } catch (e2) {
        if (e2.kritik) throw new Error(`Anahtar reddedildi, durduruldu: ${e2.message.slice(0, 160)}`);
        console.error(`  ${k}: üretim hatası ${String(e2.message).slice(0, 160)}`);
      }
    });
    // Yerel kapılar (partiyle tekrar dahil)
    const parti = st.taslaklar.filter((t) => t.sonuc !== 'elendi').map((t) => ({ soru: t.s, dogru: t.d, n: normalize(t.s), kok: kokler(t.s), dn: normalize(t.d) }));
    for (const t of yeni) {
      const n = yerelKapilar(t, havuzu, parti);
      if (n) { t.sonuc = 'elendi'; t.neden = n; } else parti.push({ soru: t.s, dogru: t.d, n: normalize(t.s), kok: kokler(t.s), dn: normalize(t.d) });
    }
    st.taslaklar.push(...yeni);
    durumYaz(st);
    const bekleyen = yeni.filter((t) => t.sonuc === 'bekliyor');
    if (bekleyen.length) await kapilar(bekleyen, anahtar);
    for (const t of bekleyen) if (t.sonuc === 'bekliyor') t.sonuc = 'elendi';
    durumYaz(st);
    console.log(`  geçen toplam ${st.taslaklar.filter((t) => t.sonuc === 'gecti').length}/${st.taslaklar.length} · $${toplamUsd().toFixed(3)}`);
  }
  const o = yaz(st, sec(st));
  console.log(`Bitti · taslak ${o.taslak} · geçen ${o.gecen} · seçilen ${o.secilen}/${ADET} · zorluk ${JSON.stringify(o.zorluk)} · yerel ${o.yerel} · EN ${o.en}`);
  console.log(`Elenen: ${JSON.stringify(o.elenen_sebep)}`);
  if (Object.keys(o.eksik).length) console.log(`EKSİK: ${JSON.stringify(o.eksik)}`);
  console.log(`Harcama: Claude $${o.harcama_usd.claude} + Jev $${o.harcama_usd.jev} = $${o.harcama_usd.toplam}${butceDoldu() ? ' — BÜTÇE DOLDU' : ''}`);
}

function cikar() {
  const dosya = path.join(CIKTI, 'sorular.json');
  const sorular = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const nolar = new Set(CIKAR.split(',').map((x) => x.trim()).filter(Boolean).map((x) => `${ON_EK}-${x.replace(/^.*-/, '').padStart(2, '0')}`));
  const bilinmeyen = [...nolar].filter((id) => !sorular.some((t) => t.id === id));
  if (bilinmeyen.length) throw new Error(`Listede yok: ${bilinmeyen.join(', ')}`);
  const cikan = sorular.filter((t) => nolar.has(t.id));
  const cikDosya = path.join(CIKTI, 'cikarilan.json');
  const onceki = fs.existsSync(cikDosya) ? JSON.parse(fs.readFileSync(cikDosya, 'utf8')) : [];
  fs.writeFileSync(cikDosya, JSON.stringify([...onceki, ...cikan.map((t) => ({ ...t, cikarildi: new Date().toISOString().slice(0, 10) }))], null, 1) + '\n');
  fs.writeFileSync(dosya, JSON.stringify(sorular.filter((t) => !nolar.has(t.id)), null, 1) + '\n');
  console.log(`Çıkarıldı ${cikan.length}: ${cikan.map((t) => t.id).join(', ')} · kalan ${sorular.length - cikan.length}. Migration'ı yeniden üret (uret-migration-parti.mjs).`);
}

(CIKAR ? Promise.resolve().then(cikar) : uret()).catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
