// Şık ipucu düzeltmesi — Claude API ile (deneme hattı). MİGRATION ÜRETMEZ, veritabanına YAZMAZ.
// sik_ipucu_jev işaretli sorunun YANLIŞ şıklarını (TR + EN, aynı indekslerle) yeniden yazdırır;
// soru metni, doğru cevap ve doğru şıkkın indeksi değişmez.
//
// Kapılar (420–422 ile aynı):
//   1) public.soru_kural_isaretleri — ağırlık >= 2 işaret yok  (kapi.mjs › hamKapiSorgusu)
//   2) Jev "soru olmadan" testi — doğru şıkka p <= 0,75        (kapi.mjs › sikIpucuTesti; eşik burada ESIK_P)
//      p 0,70–0,75 arası geçenler "sinirda" diye işaretlenir.
//   3) Tek doğru cevap — Jev: yeni yanlış şıklardan hiçbiri "bu da doğru" olmamalı
//   4) Hakem kapısı — her yeni yanlış şık için AYRI bir Claude çağrısı: kesin_yanlis | tartismali
// Geçemeyene en çok 3 deneme; yine geçmezse dokunulmaz.
//
// DENEME : node araclar/soru-temizlik/sik-ipucu-api.mjs [--adet 20] [--kuru] [--butce-usd 5]
//   --kuru : yalnız soru seçimini yapıp listeler; API'ye ve Jev'e çağrı yok.
//   Çıktı: .tmp/sik-ipucu-deneme/rapor.json + rapor.md
// TAM    : node araclar/soru-temizlik/sik-ipucu-api.mjs --tam [--butce-usd 12] [--parti-boyut 100]
//   Zorluk 1–3 işaretli soruları 100'erlik partilere böler; her tur sonunda
//   .tmp/sik-ipucu-tam/ilerleme.json'a yazar (yarıda kalırsa aynı komut kaldığı yerden devam eder).
//   Biten her parti için yeni numaralı migration dosyası + CSV satırları üretir; CANLIYA UYGULAMAZ.
//   Çıktı: .tmp/sik-ipucu-tam/rapor.md
// Anahtar: .env.local › ANTHROPIC_API_KEY (hiçbir yere yazdırılmaz/loglanmaz).
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, jsonSabit, KOK } from '../soru_denetim/ortak.mjs';
import { hamKapiSorgusu, sikIpucuTesti } from '../soru_denetim/kapi.mjs';
import { jevSor, noul, maliyetUsd } from '../jev.mjs';

const MODEL = 'claude-sonnet-5-5';
// Claude Sonnet 5.5 fiyatı ($ / 1M jeton) — claude-api becerisindeki tablo, 6 Eki 2026.
const GIRDI_USD = 2;
const CIKTI_USD = 10;
const DENEME_SAYISI = 3;
const TOPLAM_SORU_SAYISI = 1085; // 422 sonrası işaretli soru sayısı (tahmin ölçeği)
const ESIK_P = 0.75;      // yeni şıklarla doğru şıkka Jev olasılığı bundan büyükse geçmez
const SINIR_ALT = 0.70;   // [SINIR_ALT, ESIK_P] aralığı "sinirda"
const ESZAMANLI = 4;
const CIKTI_KLASOR = path.join(KOK, '.tmp', 'sik-ipucu-deneme');
const TAM_KLASOR = path.join(KOK, '.tmp', 'sik-ipucu-tam');
const MIGRASYON_KLASOR = path.join(KOK, 'supabase', 'migrations');
const CSV_YOLU = new URL('./sik-ipucu-duzeltme.csv', import.meta.url);

// ---- Parametreler ----
const arg = (ad, varsayilan) => {
  const i = process.argv.indexOf(ad);
  return i > 0 ? process.argv[i + 1] : varsayilan;
};
const ADET = Number(arg('--adet', 20));
const TAM = process.argv.includes('--tam');
const BUTCE = Number(arg('--butce-usd', TAM ? 12 : 5));
const PARTI_BOYUT = Number(arg('--parti-boyut', 100));
const KURU = process.argv.includes('--kuru');
if (!Number.isInteger(ADET) || ADET < 1 || !(BUTCE > 0) || !Number.isInteger(PARTI_BOYUT) || PARTI_BOYUT < 1) throw new Error('Geçersiz --adet / --butce-usd / --parti-boyut');

// ---- Anahtar (.env.local) ----
function anahtarOku() {
  const dosya = path.join(KOK, '.env.local');
  if (!fs.existsSync(dosya)) return null;
  const satir = fs.readFileSync(dosya, 'utf8').split(/\r?\n/).find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  return satir?.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^["']|["']$/g, '') || null;
}

// ---- Soru seçimi ----
function csvIdleri() {
  const dosya = new URL('./sik-ipucu-duzeltme.csv', import.meta.url);
  const idler = new Set();
  for (const l of fs.readFileSync(dosya, 'utf8').split(/\r?\n/).slice(1)) {
    const m = l.match(/^([0-9a-f-]{36}),/);
    if (m) idler.add(m[1]);
  }
  return idler;
}

/** İşaretli, aktif, zorluk 1–3 soruları çeker; kategorilere round-robin dağıtıp `adet` kadarını seçer. */
function sorulariSec(adet = ADET) {
  const haric = csvIdleri();
  const satirlar = sorgu(`
    select q.id::text id, q.kategori, q.zorluk, q.soru, q.secenekler, q.dogru_cevap,
           t.soru soru_en, t.secenekler secenekler_en
      from public.questions q
      left join public.question_translations t on t.question_id = q.id and t.dil = 'en'
     where q.aktif and q.zorluk between 1 and 3
       and 'sik_ipucu_jev' = any(coalesce(q.supheli_isaretler, '{}'))
     order by md5(q.id::text);`);
  const adaylar = satirlar.filter((r) => !haric.has(r.id));
  const kovalar = new Map();
  for (const r of adaylar) {
    if (!kovalar.has(r.kategori)) kovalar.set(r.kategori, []);
    kovalar.get(r.kategori).push(r);
  }
  const secilen = [];
  while (secilen.length < adet && [...kovalar.values()].some((k) => k.length)) {
    for (const k of kovalar.values()) {
      if (secilen.length >= adet) break;
      if (k.length) secilen.push(k.shift());
    }
  }
  return { secilen, aday: adaylar.length };
}

// ---- Claude API ----
const harcama = { girdi: 0, cikti: 0, cagri: 0 };
const apiUsd = () => (harcama.girdi / 1e6) * GIRDI_USD + (harcama.cikti / 1e6) * CIKTI_USD;
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const SEMA = {
  type: 'object',
  properties: {
    tr: { type: 'array', items: { type: 'string' } },
    en: { type: 'array', items: { type: 'string' } },
  },
  required: ['tr', 'en'],
  additionalProperties: false,
};

const SISTEM = `Bir bilgi yarışması oyununun soru editörüsün. Görevin: verilen sorunun YANLIŞ şıklarını yeniden yazmak.
Kurallar:
- Soru metni ve doğru şık aynen kalır; yalnız 3 yanlış şıkkı yaz.
- Yanlış şıklar doğru şıkla AYNI TÜRDE ve biçimde olsun (aynı kategori, benzer uzunluk, aynı yazım kalıbı); doğru şık uzunluk, ayrıntı, ton ya da türüyle öne çıkmasın.
- Her yanlış şık makul ve inandırıcı ama KESİNLİKLE yanlış olsun; soruya ikinci bir doğru cevap çıkmasın (tartışmalı/kısmen doğru şık yazma).
- Yanlış şıklar birbirinden ve doğru şıktan farklı olsun; eski şıkları aynen tekrarlama.
- Şıklar soru metnine bakmadan elenebilecek kadar absürt ya da soruyla alakasız olmasın.
- "tr" dizisi: 4 şık, TR şıklarıyla AYNI indeksler; doğru şık kendi indeksinde AYNEN kalır.
- "en" dizisi: 4 şık, İngilizce; her indeks TR'deki karşılığının çevirisi; doğru şık verilen EN metniyle AYNEN kalır.
Yalnız şemaya uygun JSON döndür.`;

function istemYaz(s, ipucuGeri) {
  const dogruTr = s.secenekler[s.dogru_cevap];
  const enVar = Array.isArray(s.secenekler_en) && s.secenekler_en.length === 4;
  return [
    `Soru (TR): ${s.soru}`,
    `Kategori: ${s.kategori} · zorluk ${s.zorluk}/5`,
    `TR şıklar (indeks: şık): ${s.secenekler.map((x, i) => `${i}: ${x}`).join(' | ')}`,
    `Doğru şık indeksi: ${s.dogru_cevap} ("${dogruTr}")`,
    enVar ? `Soru (EN): ${s.soru_en}\nEN şıklar: ${s.secenekler_en.map((x, i) => `${i}: ${x}`).join(' | ')}` : 'EN çeviri yok: "en" dizisini TR şıkların doğrudan İngilizce çevirisiyle doldur.',
    ipucuGeri ? `\nÖnceki deneme reddedildi: ${ipucuGeri}\nBu kez farklı ve daha dengeli çeldiriciler yaz.` : '',
  ].filter(Boolean).join('\n');
}

/** Tek Messages API çağrısı; 429/5xx'te en çok 3 deneme. Dönüş: ayrıştırılmış JSON. */
async function claudeCagir(anahtar, istem, sec = {}) {
  let sonHata;
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const yanit = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anahtar, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: sec.maxJeton ?? 2000,
          system: sec.sistem ?? SISTEM,
          output_config: { effort: 'medium', format: { type: 'json_schema', schema: sec.sema ?? SEMA } },
          messages: [{ role: 'user', content: istem }],
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (yanit.ok) {
        const g = await yanit.json();
        harcama.girdi += (g.usage?.input_tokens ?? 0) + (g.usage?.cache_creation_input_tokens ?? 0) + (g.usage?.cache_read_input_tokens ?? 0);
        harcama.cikti += g.usage?.output_tokens ?? 0;
        harcama.cagri += 1;
        if (g.stop_reason === 'refusal') throw new Error('Claude reddetti (refusal)');
        const metin = g.content?.find((b) => b.type === 'text')?.text;
        if (!metin) throw new Error(`Metin bloğu yok (stop_reason=${g.stop_reason})`);
        return JSON.parse(metin);
      }
      const govde = (await yanit.text()).slice(0, 300).replace(anahtar, '***');
      sonHata = new Error(`Claude HTTP ${yanit.status}: ${govde}`);
      if (yanit.status === 401 || yanit.status === 403) { sonHata.kritik = true; throw sonHata; }
      if (yanit.status !== 429 && yanit.status < 500) throw sonHata;
      const ra = Number(yanit.headers.get('retry-after'));
      if (deneme < 2) await bekle(ra > 0 ? ra * 1000 : 1000 * 2 ** deneme);
    } catch (e) {
      if (e === sonHata && !/HTTP (429|5\d\d)/.test(e.message)) throw e;
      sonHata = e;
      if (deneme < 2) await bekle(1000 * 2 ** deneme);
    }
  }
  throw sonHata ?? new Error('Claude çağrısı başarısız');
}

/** Şema doğrulaması: 4'er şık, boş/yinelenen yok, doğru şık aynen, eski yanlışlar tekrarlanmaz. */
function dogrula(y, s) {
  const hatalar = [];
  const yok = (a) => !Array.isArray(a) || a.length !== 4 || a.some((x) => typeof x !== 'string' || !x.trim());
  if (yok(y?.tr)) hatalar.push('tr: 4 dolu şık değil');
  if (yok(y?.en)) hatalar.push('en: 4 dolu şık değil');
  if (hatalar.length) return hatalar;
  if (y.tr[s.dogru_cevap] !== s.secenekler[s.dogru_cevap]) hatalar.push('doğru TR şık değişmiş');
  if (Array.isArray(s.secenekler_en) && s.secenekler_en.length === 4 && y.en[s.dogru_cevap] !== s.secenekler_en[s.dogru_cevap]) hatalar.push('doğru EN şık değişmiş');
  if (new Set(y.tr.map((x) => x.trim().toLowerCase())).size !== 4) hatalar.push('TR şıklar yinelenen');
  if (new Set(y.en.map((x) => x.trim().toLowerCase())).size !== 4) hatalar.push('EN şıklar yinelenen');
  return hatalar;
}


// ---- Ortak durum / yardımcılar ----
const jev = { jeton: 0 };
const jevUsd = () => maliyetUsd(jev.jeton);
const toplamUsd = () => apiUsd() + jevUsd();
let butceAsildi = false;
const butceKontrol = () => { if (toplamUsd() > BUTCE) butceAsildi = true; return butceAsildi; };

/** Eşzamanlılık sınırlı havuz: ogeler üzerinde fn'i en çok n paralel çalıştırır. */
async function havuz(ogeler, n, fn) {
  let sira = 0;
  await Promise.all(Array.from({ length: Math.min(n, ogeler.length) }, async () => {
    while (sira < ogeler.length) await fn(ogeler[sira++]);
  }));
}

// ---- Kapılar ----
function kuralKapisi(adaylar) {
  if (!adaylar.length) return new Map();
  const satirlar = sorgu(hamKapiSorgusu(adaylar.map((a) => ({ anahtar: a.id, soru: a.soru, secenekler: a.tr, dogru_cevap: a.dogru }))));
  return new Map(satirlar.map((r) => [r.anahtar, r.agir || '']));
}

async function tekDogruKapisi(a) {
  const yanlislar = a.tr.map((s, i) => ({ s, i })).filter((x) => x.i !== a.dogru);
  const sorular = Object.fromEntries(yanlislar.map(({ s, i }) => [`sik_${i}`, noul(`Soruya "${s}" cevabı verilirse bu da doğru sayılabilir mi?`)]));
  const y = await jevSor({ soru: a.soru, siklar: a.tr, dogru_cevap: a.tr[a.dogru] }, sorular);
  const p = Object.fromEntries(yanlislar.map(({ i }) => [i, Number(y.answers?.[`sik_${i}`]?.noul ?? 0)]));
  return { en_yuksek: Math.max(...Object.values(p)), jeton: y.usage?.input_tokens ?? 0 };
}

const HAKEM_SISTEM = `Bir bilgi yarışması için titiz bir hakem editörüsün. Sana bir soru, doğru cevap ve doğru olmadığı iddia edilen bir aday şık verilir.
Soru: aday şık cevap olarak verilirse bir oyuncu haklı olarak itiraz edebilir mi?
- Aday şık doğru kabul edilebiliyorsa, kısmen doğruysa, soru metninin makul bir okumasına göre doğruysa, tanıma/kaynağa göre değişiyorsa ya da tartışmalıysa: "tartismali".
- Yalnız tartışmasız ve açıkça yanlışsa: "kesin_yanlis".
- Şüphedeysen "tartismali" de.
"gerekce": tek kısa Türkçe cümle. Yalnız şemaya uygun JSON döndür.`;
const HAKEM_SEMA = {
  type: 'object',
  properties: { karar: { type: 'string', enum: ['kesin_yanlis', 'tartismali'] }, gerekce: { type: 'string' } },
  required: ['karar', 'gerekce'],
  additionalProperties: false,
};

/** 4. kapı: her yeni yanlış şık için AYRI Claude çağrısı. Tartışmalı ilk şıkkı döner, yoksa null. */
async function hakemKapisi(anahtar, a) {
  const yanlislar = a.tr.filter((_, i) => i !== a.dogru);
  const kararlar = await Promise.all(yanlislar.map(async (sik) => {
    const istem = `Soru: ${a.soru}\nDoğru cevap: ${a.tr[a.dogru]}\nAday yanlış şık: ${sik}`;
    const y = await claudeCagir(anahtar, istem, { sistem: HAKEM_SISTEM, sema: HAKEM_SEMA, maxJeton: 1500 });
    if (y?.karar !== 'kesin_yanlis' && y?.karar !== 'tartismali') throw new Error('hakem kararı geçersiz');
    return { sik, karar: y.karar, gerekce: String(y.gerekce ?? '').slice(0, 160) };
  }));
  return kararlar.find((k) => k.karar === 'tartismali') ?? null;
}

/** Bekleyen sorular için Claude'a yeni yanlış şık yazdırır; şemadan geçenleri aday olarak döner. */
async function yazAdaylari(bekleyen, anahtar) {
  const adaylar = [];
  await havuz(bekleyen, ESZAMANLI, async (d) => {
    if (butceKontrol()) return;
    d.deneme += 1;
    try {
      const y = await claudeCagir(anahtar, istemYaz(d.s, d.geri));
      const h = dogrula(y, d.s);
      if (h.length) { d.geri = `şema/değişmezlik: ${h.join('; ')}`; return; }
      adaylar.push({ d, id: d.s.id, soru: d.s.soru, tr: y.tr, en: y.en, dogru: Number(d.s.dogru_cevap) });
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi, durduruldu: ${e.message.slice(0, 160)}`);
      d.geri = `API hatası: ${String(e.message).slice(0, 120)}`;
      console.error(`Claude hata ${d.s.id}: ${d.geri}`);
    }
  });
  return adaylar;
}

/** Dört kapı: kural işareti → Jev ipucu (≤ ESIK_P) → Jev tek doğru → hakem. Geçen aday d üzerinde 'gecti' olur. */
async function kapilar(adaylar, anahtar) {
  let kural;
  try { kural = kuralKapisi(adaylar); } catch (e) { throw new Error(`Kural kapısı çalışmadı: ${String(e.message).slice(0, 200)}`); }
  const kalan = [];
  for (const a of adaylar) {
    const agir = kural.get(a.id);
    if (agir === undefined) a.d.geri = 'kural kapısı satır döndürmedi';
    else if (agir) a.d.geri = `kural işareti: ${agir}`;
    else kalan.push(a);
  }
  await havuz(kalan, ESZAMANLI, async (a) => {
    if (butceKontrol()) { a.d.deneme -= 1; a.d.geri = 'bütçe durdurdu'; return; }
    try {
      const ip = await sikIpucuTesti(a.tr, a.tr[a.dogru], a.id);
      jev.jeton += ip.jeton;
      if (ip.pDogru == null) { a.d.geri = `Jev ipucu testi atlandı: ${ip.atlandi ?? '?'}`; return; }
      if (ip.pDogru > ESIK_P) { a.d.geri = `Jev ipucu p=${ip.pDogru.toFixed(2)} > ${ESIK_P} (seçim: "${ip.secim}")`; return; }
      const td = await tekDogruKapisi(a);
      jev.jeton += td.jeton;
      if (td.en_yuksek >= 0.5) { a.d.geri = `yanlış şık da doğru olabilir (Jev p=${td.en_yuksek.toFixed(2)})`; return; }
      const hk = await hakemKapisi(anahtar, a);
      if (hk) { a.d.geri = `hakem: "${hk.sik}" tartışmalı — ${hk.gerekce}`; return; }
      a.d.sonuc = 'gecti'; a.d.jev_p_sonra = ip.pDogru; a.d.sinirda = ip.pDogru >= SINIR_ALT; a.d.yeni = { tr: a.tr, en: a.en };
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi, durduruldu: ${e.message.slice(0, 160)}`);
      a.d.geri = `kapı hatası: ${String(e.message).slice(0, 120)}`;
      console.error(`Kapı hata ${a.id}: ${a.d.geri}`);
    }
  });
}

const bosSonuc = () => ({ sonuc: 'bekliyor', deneme: 0, geri: '', jev_p_once: null, jev_p_sonra: null, yeni: null, sinirda: false, once_denendi: false });

async function jevOnce(durum) {
  await havuz(durum.filter((d) => d.jev_p_once == null && !d.once_denendi), ESZAMANLI, async (d) => {
    d.once_denendi = true;
    try {
      const r = await sikIpucuTesti(d.s.secenekler, d.s.secenekler[d.s.dogru_cevap], d.s.id);
      d.jev_p_once = r.pDogru; jev.jeton += r.jeton;
    } catch (e) { console.error(`Jev (önce) hata ${d.s.id}: ${String(e.message).slice(0, 120)}`); }
  });
}

// ---- DENEME ----
async function deneme() {
  const anahtar = KURU ? null : anahtarOku();
  if (!KURU && !anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok — Ida eklemeli.');

  const { secilen, aday } = sorulariSec();
  const dagilim = secilen.reduce((m, r) => ((m[r.kategori] = (m[r.kategori] || 0) + 1), m), {});
  console.log(`Aday ${aday} · seçilen ${secilen.length} · kategori dağılımı ${JSON.stringify(dagilim)}`);
  if (KURU) {
    secilen.forEach((s) => console.log(`- ${s.id} [${s.kategori} z${s.zorluk}] ${s.soru.slice(0, 70)}`));
    return;
  }

  const durum = secilen.map((s) => ({ s, ...bosSonuc() }));
  await jevOnce(durum);
  while (!butceKontrol()) {
    const bekleyen = durum.filter((d) => d.sonuc === 'bekliyor' && d.deneme < DENEME_SAYISI);
    if (!bekleyen.length) break;
    await kapilar(await yazAdaylari(bekleyen, anahtar), anahtar);
    console.log(`Geçen ${durum.filter((d) => d.sonuc === 'gecti').length}/${durum.length} · API $${apiUsd().toFixed(4)} · Jev $${jevUsd().toFixed(4)}`);
  }
  for (const d of durum) if (d.sonuc === 'bekliyor') d.sonuc = d.deneme >= DENEME_SAYISI ? 'kaldi' : 'butce_durdu';

  const gecen = durum.filter((d) => d.sonuc === 'gecti');
  const api = apiUsd(), jevU = jevUsd();
  const soruBasi = durum.length ? (api + jevU) / durum.length : 0;
  const rapor = {
    tarih: new Date().toISOString(), model: MODEL, esik_p: ESIK_P, adet: durum.length, gecen: gecen.length, kalan: durum.length - gecen.length,
    sinirda: gecen.filter((d) => d.sinirda).length, butce_usd: BUTCE, butce_asildi: butceAsildi,
    api_harcama_usd: Number(api.toFixed(4)), api_jeton: { girdi: harcama.girdi, cikti: harcama.cikti, cagri: harcama.cagri },
    jev_harcama_usd: Number(jevU.toFixed(4)),
    tahmini_toplam_usd: { soru_sayisi: TOPLAM_SORU_SAYISI, soru_basina: Number(soruBasi.toFixed(5)), toplam: Number((soruBasi * TOPLAM_SORU_SAYISI).toFixed(2)) },
    sorular: durum.map((d) => ({ id: d.s.id, kategori: d.s.kategori, zorluk: d.s.zorluk, sonuc: d.sonuc, deneme: d.deneme, sinirda: d.sinirda, son_ret: d.sonuc === 'gecti' ? null : d.geri, jev_p_once: d.jev_p_once, jev_p_sonra: d.jev_p_sonra, soru: d.s.soru, dogru_sik: d.s.secenekler[d.s.dogru_cevap], eski_tr: d.s.secenekler, yeni_tr: d.yeni?.tr ?? null, eski_en: d.s.secenekler_en ?? null, yeni_en: d.yeni?.en ?? null })),
  };
  fs.mkdirSync(CIKTI_KLASOR, { recursive: true });
  fs.writeFileSync(path.join(CIKTI_KLASOR, 'rapor.json'), JSON.stringify(rapor, null, 2));
  const f = (v) => (v == null ? '—' : v.toFixed(2));
  const ornek = gecen.slice(0, 5).map((d) => `- **${d.s.soru}** (doğru: ${d.s.secenekler[d.s.dogru_cevap]}) · p ${f(d.jev_p_once)} → ${f(d.jev_p_sonra)}${d.sinirda ? ' · SINIRDA' : ''}\n  - eski: ${JSON.stringify(d.s.secenekler)}\n  - yeni: ${JSON.stringify(d.yeni.tr)}\n  - yeni EN: ${JSON.stringify(d.yeni.en)}`).join('\n');
  const kalanlar = durum.filter((d) => d.sonuc !== 'gecti').map((d) => `- ${d.s.id} (${d.s.kategori}): ${d.sonuc} — ${d.geri}`).join('\n') || '—';
  fs.writeFileSync(path.join(CIKTI_KLASOR, 'rapor.md'), `# Şık ipucu API denemesi\n\nModel ${MODEL} · eşik ${ESIK_P} · ${rapor.tarih}\n\n- Geçen **${rapor.gecen}** / ${rapor.adet} · kalan ${rapor.kalan} · sınırda ${rapor.sinirda}\n- Claude API harcaması: **$${rapor.api_harcama_usd}** (${harcama.cagri} çağrı)\n- Jev harcaması: **$${rapor.jev_harcama_usd}**\n- ${TOPLAM_SORU_SAYISI} soru için tahmini toplam: **~$${rapor.tahmini_toplam_usd.toplam}**\n\n## Eski → yeni (ilk 5 geçen)\n${ornek || '—'}\n\n## Geçemeyen / durdurulan\n${kalanlar}\n`);
  console.log(`Bitti · geçen ${gecen.length}/${durum.length} · API $${api.toFixed(4)} · Jev $${jevU.toFixed(4)} · ${CIKTI_KLASOR}`);
}

// ---- TAM ÇALIŞTIRMA: partiler, ilerleme dosyası, migration + CSV üretimi ----
const ILERLEME = path.join(TAM_KLASOR, 'ilerleme.json');
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function sonPartiNo() {
  let en = 0;
  for (const l of fs.readFileSync(CSV_YOLU, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^[0-9a-f-]{36},(\d+),/);
    if (m) en = Math.max(en, Number(m[1]));
  }
  return en;
}
const sonrakiMigrasyonNo = () => String(Math.max(...fs.readdirSync(MIGRASYON_KLASOR).map((f) => Number(f.slice(0, 14))).filter(Number.isFinite)) + 1);

function ilerlemeKaydet(st, durum) {
  if (durum) for (const d of durum) st.sonuclar[d.s.id] = { sonuc: d.sonuc, deneme: d.deneme, geri: d.geri, jev_p_once: d.jev_p_once, jev_p_sonra: d.jev_p_sonra, yeni: d.yeni, sinirda: d.sinirda, once_denendi: d.once_denendi };
  st.harcama = { ...harcama };
  st.jevJeton = jev.jeton;
  fs.mkdirSync(TAM_KLASOR, { recursive: true });
  const gecici = ILERLEME + '.tmp';
  fs.writeFileSync(gecici, JSON.stringify(st));
  fs.renameSync(gecici, ILERLEME);
}

function planKur() {
  const { secilen } = sorulariSec(Infinity);
  const isaretli = Number(sorgu(`select count(*)::int n from public.questions where 'sik_ipucu_jev' = any(coalesce(supheli_isaretler, '{}'))`)[0]?.n);
  const ilk = sonPartiNo() + 1;
  const planlar = [];
  for (let i = 0; i < secilen.length; i += PARTI_BOYUT) planlar.push({ parti: ilk + planlar.length, sorular: secilen.slice(i, i + PARTI_BOYUT), bitti: false, migration: null, baslangic: null, maliyet: null });
  return { olusturuldu: new Date().toISOString(), esik_p: ESIK_P, isaretli_toplam: isaretli, planlar, sonuclar: {}, harcama: { girdi: 0, cikti: 0, cagri: 0 }, jevJeton: 0 };
}

const sqlAlinti = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sqlJson = (v) => (v == null ? 'null' : `${sqlAlinti(JSON.stringify(v))}::jsonb`);
const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));

function migrasyonMetni(parti, no, gecenler) {
  const n3 = no.slice(-3);
  const t = new Date();
  const tarih = `${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()}`;
  const satirlar = gecenler.map((d) => {
    const enVar = Array.isArray(d.s.secenekler_en) && d.s.secenekler_en.length === 4;
    return `    (${sqlAlinti(d.s.id)}::uuid, ${Number(d.s.dogru_cevap)}, ${sqlJson(d.s.secenekler)}, ${sqlJson(d.yeni.tr)}, ${sqlJson(enVar ? d.s.secenekler_en : null)}, ${sqlJson(enVar ? d.yeni.en : null)})`;
  }).join(',\n');
  return `-- ============================================================
-- ${n3} — Şık ipucu düzeltmesi, parti ${parti} (${tarih}, Claude API)
--
-- 298'de Jev'in soru metnini görmeden doğru şıkkı > 0,8 güvenle bulduğu sorular
-- \`sik_ipucu_jev\` ile işaretlenip rekabetçi havuzdan çıkarılmıştı. Bu partide işaretli kolay/orta
-- (zorluk 1–3) sorulardan ${gecenler.length} tanesinin YANLIŞ şıkları Claude API (${MODEL}) ile yeniden yazıldı;
-- soru metni, doğru cevap ve doğru şıkkın indeksi DEĞİŞMEDİ (match_answers.cevap indeksle tutulur, şık sırası karışmaz).
-- Yeni şıklar dört kapıdan geçti: soru_kural_isaretleri (ağırlık >= 2 işaret yok), Jev "soru olmadan"
-- testi (soru_denetim/kapi.mjs › sikIpucuTesti, doğru şıkka <= ${ESIK_P}), Jev tek doğru cevap kontrolü ve
-- yanlış şık başına ayrı Claude hakem çağrısı (kesin_yanlis). Geçemeyen sorulara dokunulmadı, işaretli kalır.
-- EN çeviri: aynı indekslerle güncellenir (EN çevirisi olmayan soruda yalnız TR). Üretici: araclar/soru-temizlik/sik-ipucu-api.mjs --tam
-- Eski hâl: soru_surum (surum +1) ve araclar/soru-temizlik/sik-ipucu-duzeltme.csv.
-- Geri alma: node araclar/soru-temizlik/sik-ipucu-geri-al.mjs --parti ${parti}   (önce prova)
-- ============================================================

-- Elle işaret (sik_ipucu_jev) tetikleyicide korunur; bilerek kaldırmak için (298):
select set_config('app.soru_elle_isaret_yaz', 'on', true);

create temp table _j_sik (id uuid primary key, dogru smallint, eski_tr jsonb, yeni_tr jsonb, eski_en jsonb, yeni_en jsonb) on commit drop;
insert into _j_sik values
${satirlar};

do $$
declare v_n int; v_beklenen int := (select count(*) from _j_sik);
begin
  -- Yalnız hâlâ eski şıkları taşıyan satırlar (araya başka düzeltme girdiyse dur)
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where q.secenekler = s.eski_tr and q.dogru_cevap = s.dogru;
  if v_n <> v_beklenen then
    raise exception 'Şık ipucu parti ${parti}: % sorudan % tanesi beklenen eski hâlde', v_beklenen, v_n;
  end if;

  insert into public.soru_surum (question_id, surum, soru, secenekler, dogru_cevap, degisiklik_notu)
  select q.id, q.surum, q.soru, q.secenekler, q.dogru_cevap, 'Şık ipucu düzeltmesi parti ${parti}: yanlış şıklar yeniden yazıldı (${n3})'
    from public.questions q join _j_sik s on s.id = q.id;

  update public.questions q
     set secenekler = s.yeni_tr,
         supheli_isaretler = array_remove(q.supheli_isaretler, 'sik_ipucu_jev'),
         surum = q.surum + 1
    from _j_sik s
   where q.id = s.id;

  update public.question_translations t
     set secenekler = s.yeni_en
    from _j_sik s
   where t.question_id = s.id and t.dil = 'en' and s.yeni_en is not null and t.secenekler = s.eski_en;
  get diagnostics v_n = row_count;
  if v_n <> (select count(*) from _j_sik where yeni_en is not null) then
    raise exception 'Şık ipucu parti ${parti}: EN çeviri % satır güncellendi, beklenen %', v_n, (select count(*) from _j_sik where yeni_en is not null);
  end if;

  -- Sonuç: yazılanlarda sik_ipucu_jev kalmamalı, ağır kural işareti olmamalı
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where 'sik_ipucu_jev' = any(q.supheli_isaretler) or q.supheli_agirlik >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2);
  if v_n > 0 then
    raise exception 'Şık ipucu parti ${parti}: % soruda işaret/ağırlık kaldı', v_n;
  end if;
end $$;

select set_config('app.soru_elle_isaret_yaz', '', true);
`;
}

function csvEkle(parti, migrasyon, durum) {
  const mevcut = fs.readFileSync(CSV_YOLU, 'utf8');
  const p3 = (v) => (v == null ? '' : v.toFixed(3));
  const yeni = durum.filter((d) => !mevcut.includes(d.s.id)).map((d) => {
    const gecti = d.sonuc === 'gecti';
    const enVar = Array.isArray(d.s.secenekler_en) && d.s.secenekler_en.length === 4;
    return [d.s.id, parti, gecti ? migrasyon : '', d.s.kategori, d.s.zorluk, d.s.dogru_cevap, JSON.stringify(d.s.secenekler), gecti ? JSON.stringify(d.yeni.tr) : '',
      enVar ? JSON.stringify(d.s.secenekler_en) : '', gecti && enVar ? JSON.stringify(d.yeni.en) : '', p3(d.jev_p_once), gecti ? p3(d.jev_p_sonra) : '', gecti ? 'duzeltildi' : 'isaretli_kaldi'].map(csvAlan).join(',');
  });
  if (yeni.length) fs.appendFileSync(CSV_YOLU, (mevcut.endsWith('\n') ? '' : '\n') + yeni.join('\n') + '\n', 'utf8');
  return yeni.length;
}

const nedenTuru = (g) => (/^kural/.test(g) ? 'kural işareti' : /^Jev ipucu/.test(g) ? `Jev ipucu p>${ESIK_P}` : /^yanlış şık da/.test(g) ? 'Jev tek-doğru' : /^hakem/.test(g) ? 'hakem: tartışmalı şık' : /^API|^kapı hatası/.test(g) ? 'API/kapı hatası' : /^şema/.test(g) ? 'şema/değişmezlik' : 'diğer');

function raporTam(st) {
  const satir = [], neden = {}, sinirdaListe = [], kalanListe = [];
  let gecen = 0, kalan = 0, sinirda = 0, bekleyen = 0;
  for (const p of st.planlar) {
    const r = p.sorular.map((s) => ({ s, ...bosSonuc(), ...(st.sonuclar[s.id] ?? {}) }));
    const g = r.filter((x) => x.sonuc === 'gecti'), k = r.filter((x) => x.sonuc === 'kaldi'), b = r.filter((x) => x.sonuc === 'bekliyor');
    const sn = g.filter((x) => x.sinirda);
    gecen += g.length; kalan += k.length; sinirda += sn.length; bekleyen += b.length;
    for (const x of k) { const t = nedenTuru(x.geri); neden[t] = (neden[t] || 0) + 1; kalanListe.push(`- p${p.parti} ${x.s.id} (${x.s.kategori}): ${x.geri}`); }
    for (const x of sn) sinirdaListe.push(`- p${p.parti} ${x.s.id} (${x.s.kategori}): p ${x.jev_p_once?.toFixed(2) ?? '—'} → ${x.jev_p_sonra.toFixed(2)}`);
    satir.push(`| ${p.parti} | ${p.migration ?? (p.bitti ? '—' : 'bitmedi')} | ${r.length} | ${g.length} | ${k.length}${b.length ? ` (+${b.length} bekliyor)` : ''} | ${sn.length} | ${p.maliyet ? `$${p.maliyet.api.toFixed(3)}` : '—'} | ${p.maliyet ? `$${p.maliyet.jev.toFixed(4)}` : '—'} |`);
  }
  const md = `# Şık ipucu — tam çalıştırma (Claude API)

Model ${MODEL} · Jev eşiği ≤ ${ESIK_P} · güncelleme ${new Date().toISOString()}

- Geçen **${gecen}** · kalan (3 denemede geçemedi) **${kalan}** · bekleyen ${bekleyen} · sınırda (p ${SINIR_ALT}–${ESIK_P}) **${sinirda}**
- Harcama: Claude **$${apiUsd().toFixed(3)}** (${harcama.cagri} çağrı) + Jev **$${jevUsd().toFixed(4)}** = **$${toplamUsd().toFixed(3)}** / bütçe $${BUTCE}${butceAsildi ? ' — BÜTÇE AŞILDI, durdu' : ''}
- İşaretli soru (tüm zorluklar, plan anı): ${st.isaretli_toplam}. Migration'lar uygulanırsa kalan işaretli: **${st.isaretli_toplam - gecen}** (zorluk 4–5 dahil; bu iş kapsamı dışı). Migration'lar CANLIYA UYGULANMADI.

## Partiler
| parti | migration | soru | geçen | kalan | sınırda | Claude | Jev |
|---|---|---|---|---|---|---|---|
${satir.join('\n')}

## Geçemeyen nedenleri (son ret, tür bazında)
${Object.entries(neden).sort((a, b) => b[1] - a[1]).map(([t, n]) => `- ${t}: ${n}`).join('\n') || '—'}

## Sınırda geçenler (elle göz atılması önerilir)
${sinirdaListe.join('\n') || '—'}

## Geçemeyen sorular
${kalanListe.join('\n') || '—'}
`;
  fs.mkdirSync(TAM_KLASOR, { recursive: true });
  fs.writeFileSync(path.join(TAM_KLASOR, 'rapor.md'), md);
  return { gecen, kalan, bekleyen, sinirda };
}

async function tam() {
  if (KURU) {
    const { secilen, aday } = sorulariSec(Infinity);
    console.log(`Aday ${aday} · plan ${Math.ceil(secilen.length / PARTI_BOYUT)} parti × ${PARTI_BOYUT} · ilk parti no ${sonPartiNo() + 1} · ilk migration no ${sonrakiMigrasyonNo()}`);
    return;
  }
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok — Ida eklemeli.');
  let st;
  if (fs.existsSync(ILERLEME)) {
    st = JSON.parse(fs.readFileSync(ILERLEME, 'utf8'));
    Object.assign(harcama, st.harcama); jev.jeton = st.jevJeton;
    console.log(`Kaldığı yerden devam · harcanan $${toplamUsd().toFixed(3)}`);
  } else {
    st = planKur();
    ilerlemeKaydet(st);
    console.log(`Plan: ${st.planlar.length} parti, ${st.planlar.reduce((t, p) => t + p.sorular.length, 0)} soru · işaretli toplam ${st.isaretli_toplam}`);
  }
  try {
    for (const p of st.planlar) {
      if (p.bitti) continue;
      if (butceKontrol()) break;
      if (!p.baslangic) p.baslangic = { api: apiUsd(), jev: jevUsd() };
      const durum = p.sorular.map((s) => ({ s, ...bosSonuc(), ...(st.sonuclar[s.id] ?? {}) }));
      console.log(`Parti ${p.parti} (${durum.length} soru)`);
      await jevOnce(durum);
      ilerlemeKaydet(st, durum);
      while (!butceKontrol()) {
        const bekleyen = durum.filter((d) => d.sonuc === 'bekliyor' && d.deneme < DENEME_SAYISI);
        if (!bekleyen.length) break;
        try {
          await kapilar(await yazAdaylari(bekleyen, anahtar), anahtar);
        } finally {
          ilerlemeKaydet(st, durum);
        }
        console.log(`  geçen ${durum.filter((d) => d.sonuc === 'gecti').length}/${durum.length} · toplam $${toplamUsd().toFixed(3)}`);
      }
      for (const d of durum) if (d.sonuc === 'bekliyor' && d.deneme >= DENEME_SAYISI) d.sonuc = 'kaldi';
      ilerlemeKaydet(st, durum);
      if (durum.some((d) => d.sonuc === 'bekliyor')) { console.log(`Parti ${p.parti} bitmedi (bütçe) — durdu`); break; }

      const gecenler = durum.filter((d) => d.sonuc === 'gecti');
      const onceki = fs.readdirSync(MIGRASYON_KLASOR).find((f) => f.endsWith(`_sik_ipucu_duzeltme_parti_${p.parti}.sql`));
      let ad = onceki ? onceki.replace(/\.sql$/, '') : null;
      if (!ad && gecenler.length) {
        ad = `${sonrakiMigrasyonNo()}_sik_ipucu_duzeltme_parti_${p.parti}`;
        fs.writeFileSync(path.join(MIGRASYON_KLASOR, `${ad}.sql`), migrasyonMetni(p.parti, ad.slice(0, 14), gecenler), 'utf8');
      }
      const csvN = csvEkle(p.parti, ad ?? '', durum);
      p.migration = ad; p.bitti = true;
      p.maliyet = { api: apiUsd() - p.baslangic.api, jev: jevUsd() - p.baslangic.jev };
      ilerlemeKaydet(st, durum);
      raporTam(st);
      console.log(`Parti ${p.parti} bitti · geçen ${gecenler.length}/${durum.length} · migration ${ad ?? '—'} · CSV +${csvN}`);
    }
  } finally {
    ilerlemeKaydet(st);
    const o = raporTam(st);
    console.log(`Özet · geçen ${o.gecen} · kalan ${o.kalan} · bekleyen ${o.bekleyen} · sınırda ${o.sinirda} · Claude $${apiUsd().toFixed(3)} + Jev $${jevUsd().toFixed(4)} · ${path.join(TAM_KLASOR, 'rapor.md')}`);
  }
}

(TAM ? tam() : deneme()).catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
