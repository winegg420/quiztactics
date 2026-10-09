// Kalan `sik_ipucu_jev` işaretli AKTİF sorular (zorluk 1–5): sınıflandır → (a) için şıkları Opus ile yeniden yaz → kapılar → migration.
// sik-ipucu-api.mjs (213 soruluk ilk tur) ile AYNI dört kapı; ortak katman claude-cagri.mjs + soru_denetim/kapi.mjs + jev.mjs.
//
//   Sınıf (a): şıklar yeniden yazılınca düzelir (doğru şık en uzun / tek çok kelimeli / çeldirici zayıf …)
//   Sınıf (b): cevap soru görülmeden de bilinir / şıklardan anlaşılır; şık düzeltmesi işe yaramaz → DOKUNULMAZ, CSV'ye yazılır
//   Sınıf (c): sınırda (ilk turda p 0,70–0,75 diye bilerek bırakılan 67 + sınıflayıcının kararsız bulduğu) → DOKUNULMAZ
//
//   node araclar/soru-temizlik/sik-ipucu-837.mjs --ornek 30        → 30 soruluk örneklem (sınıfla + yaz + kapılar), maliyet raporu
//   node araclar/soru-temizlik/sik-ipucu-837.mjs --tam             → kalan hepsi (aynı durum dosyasından devam eder)
//   node araclar/soru-temizlik/sik-ipucu-837.mjs --uret --no NNN   → migration + docs/sik-ipucu-837-geri-al.sql + CSV (UYGULAMAZ)
//   Ortak: --butce-usd 20
// Durum: .tmp/sik-837/durum.json. Anahtar: .env.local › ANTHROPIC_API_KEY (yazdırılmaz).
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { hamKapiSorgusu, sikIpucuTesti } from '../soru_denetim/kapi.mjs';
import { jevSor, noul, maliyetUsd } from '../jev.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd } from './claude-cagri.mjs';
import { C } from './ceviri-paket.mjs';

const YAZAR = 'claude-opus-5-5';
const HAKEM = 'claude-sonnet-5-5';
const SINIFLAYICI = 'claude-sonnet-5-5';
const DENEME_SAYISI = 3;
const ESIK_P = 0.75;
const SINIR_ALT = 0.70;
const ESZAMANLI = 4;
const PARTI_NO = 100;
const KLASOR = path.join(KOK, '.tmp', 'sik-837');
const DURUM = path.join(KLASOR, 'durum.json');
const CSV_ANA = path.join(KOK, 'araclar', 'soru-temizlik', 'sik-ipucu-duzeltme.csv');
const CSV_RAPOR = path.join(KOK, 'araclar', 'soru-temizlik', 'sik-ipucu-837-rapor.csv');
const ILK_TUR = path.join(KOK, '.tmp', 'sik-ipucu-tam', 'ilerleme.json');
const EN_KURAL = { dil: 'en', ad: 'English', kurallar: '', ondalik: '.', binlik: ',', sozluk: {}, atilacak: ['the', 'a', 'an', 'of'] };

const arg = (ad, v) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : v; };
const ORNEK = process.argv.includes('--ornek') ? Number(arg('--ornek', 30)) : 0;
const TAM = process.argv.includes('--tam');
const URET = process.argv.includes('--uret');
const BUTCE = Number(arg('--butce-usd', 20));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const jev = { jeton: 0 };
const toplamUsd = () => apiUsd() + maliyetUsd(jev.jeton);
let butceAsildi = false;
const butceKontrol = () => { if (toplamUsd() > BUTCE) butceAsildi = true; return butceAsildi; };

async function havuz(ogeler, n, fn) {
  let sira = 0;
  await Promise.all(Array.from({ length: Math.min(n, ogeler.length) }, async () => {
    while (sira < ogeler.length) await fn(ogeler[sira++]);
  }));
}

// ---------------------------------------------------------------- durum
function durumOku() {
  if (!fs.existsSync(DURUM)) return { sorular: {}, harcama: {}, jevJeton: 0 };
  const st = JSON.parse(fs.readFileSync(DURUM, 'utf8'));
  for (const [m, h] of Object.entries(st.harcama ?? {})) harcama[m] = h;
  jev.jeton = st.jevJeton ?? 0;
  return st;
}
function durumYaz(st) {
  st.harcama = JSON.parse(JSON.stringify(harcama));
  st.jevJeton = jev.jeton;
  fs.mkdirSync(KLASOR, { recursive: true });
  fs.writeFileSync(DURUM + '.tmp', JSON.stringify(st));
  fs.renameSync(DURUM + '.tmp', DURUM);
}

function tumSorular() {
  const satirlar = sorgu(`
    select q.id::text id, q.kategori, q.zorluk, q.soru, q.secenekler, q.dogru_cevap,
           coalesce(q.supheli_isaretler, '{}') isaretler,
           t.soru soru_en, t.secenekler secenekler_en
      from public.questions q
      left join public.question_translations t on t.question_id = q.id and t.dil = 'en'
     where q.aktif and 'sik_ipucu_jev' = any(coalesce(q.supheli_isaretler, '{}'))
     order by md5(q.id::text);`);
  // supheli_isaretler CLI çıktısında nesne/dizi gelebilir; yalnız ağır olmayan diğer işaretler bilgi için.
  return satirlar.map((s) => ({ ...s, isaretler: Array.isArray(s.isaretler) ? s.isaretler : (s.isaretler?.Elements ?? []) }));
}

function ilkTurBilgisi() {
  if (!fs.existsSync(ILK_TUR)) return {};
  return JSON.parse(fs.readFileSync(ILK_TUR, 'utf8')).sonuclar ?? {};
}

// ---------------------------------------------------------------- 1) sınıflandırma
const SINIF_SISTEM = `Bir bilgi yarışması soru editörüsün. Bir soru "şık ipucu" testinde takıldı: soru metni gizlenip yalnız dört şık gösterilince model doğru şıkkı yüksek olasılıkla seçti. Görevin sınıflamak:
- "a": ipucu şıkların BİÇİMİNDEN/TÜRÜNDEN geliyor (doğru şık en uzun/en ayrıntılı, tek çok kelimeli ya da tek farklı biçimli şık, çeldiriciler zayıf/alakasız/aynı kalıpta) — aynı türde, eşit uzunlukta, eşit inandırıcı yeni çeldiriciler yazılırsa düzelir; doğru şık ve soru aynen kalır.
- "b": doğru cevap şıklara bakılmadan da biliniyor ya da kavramsal olarak belli (soruyu cevaplayabilecek çok bilinen tek gerçek; ya da kapalı/küçük bir küme: ülke-başkent, ünlü eser-yazar gibi, çeldirici ne yazılırsa yazılsın doğru şık en tanıdık olan kalır). Şık düzeltmesi işe yaramaz.
- "c": sınırda / kararsız (iki yönde de savunulabilir; düzeltme riskli ya da getirisi belirsiz).
Ayrıca önceki turda Claude çeldirici yazıp 3 denemede geçemediyse bu (b) lehine güçlü kanıttır. Yalnız şemaya uygun JSON döndür; "gerekce" tek kısa Türkçe cümle.`;
const SINIF_SEMA = { type: 'object', properties: { sinif: { type: 'string', enum: ['a', 'b', 'c'] }, gerekce: { type: 'string' } }, required: ['sinif', 'gerekce'], additionalProperties: false };

async function siniflandir(anahtar, d, ilk) {
  const onceki = ilk?.geri ? `Önceki turda (Sonnet, 3 deneme) ${ilk.sonuc}: ${String(ilk.geri).slice(0, 160)}` : 'Önceki turda denenmedi.';
  const istem = [
    `Soru: ${d.s.soru}`, `Kategori: ${d.s.kategori} · zorluk ${d.s.zorluk}/5`,
    `Şıklar: ${d.s.secenekler.map((x, i) => `${i}: ${x}`).join(' | ')}`,
    `Doğru: ${d.s.dogru_cevap} ("${d.s.secenekler[d.s.dogru_cevap]}")`,
    `Jev (soru gizli) doğru şıka olasılık: ${d.jev_p_once == null ? '?' : d.jev_p_once.toFixed(2)}`,
    `Diğer kural işaretleri: ${d.s.isaretler.filter((x) => x !== 'sik_ipucu_jev').join(', ') || 'yok'}`,
    onceki,
  ].join('\n');
  const y = await claudeCagir(anahtar, { model: SINIFLAYICI, sistem: SINIF_SISTEM, sema: SINIF_SEMA, istem, maxJeton: 1200 });
  if (!['a', 'b', 'c'].includes(y?.sinif)) throw new Error('sınıf geçersiz');
  return { sinif: y.sinif, gerekce: String(y.gerekce ?? '').slice(0, 200) };
}

// ---------------------------------------------------------------- 2) yeniden yazım
const YAZ_SISTEM = `Bir bilgi yarışması oyununun soru editörüsün. Görevin: verilen sorunun YANLIŞ şıklarını yeniden yazmak.
Kurallar:
- Soru metni ve doğru şık aynen kalır; yalnız 3 yanlış şıkkı yaz (hepsini değiştirmek serbest).
- Sorun şu: soru gizlenince yalnız şıklara bakarak doğru cevap bulunabiliyor. Çeldiriciler doğru şıkla AYNI TÜRDE, AYNI YAZIM KALIBINDA, benzer uzunlukta ve aynı kelime sayısında olsun; doğru şık uzunluk, ayrıntı, ton, tür ya da "tek tanıdık olan" olmakla öne çıkmasın. Doğru şık kadar TANINAN/ÜNLÜ ve soru bağlamına uyan çeldiriciler seç (aynı dönem, aynı alan, aynı coğrafya).
- Her yanlış şık makul ve inandırıcı ama KESİNLİKLE yanlış olsun; soruya ikinci bir doğru cevap çıkmasın (tartışmalı/kısmen doğru şık yazma).
- Yanlış şıklar birbirinden ve doğru şıktan farklı olsun; eski şıkları aynen tekrarlama (eskiden iyi olanı koruyabilirsin ama doğru şıkla aynı türdeyse).
- "tr" dizisi: 4 şık, TR şıklarıyla AYNI indeksler; doğru şık kendi indeksinde AYNEN kalır.
- "en" dizisi: EN şıklar verildiyse 4 şık, doğal İngilizce (düz çeviri değil); her indeks TR'deki karşılığıyla aynı anlamda; doğru şık verilen EN metniyle AYNEN kalır; özel adlar uluslararası yazımıyla. EN şıklar verilmediyse boş dizi [] döndür.
Yalnız şemaya uygun JSON döndür.`;
const YAZ_SEMA = { type: 'object', properties: { tr: { type: 'array', items: { type: 'string' } }, en: { type: 'array', items: { type: 'string' } } }, required: ['tr', 'en'], additionalProperties: false };

const enVar = (s) => Array.isArray(s.secenekler_en) && s.secenekler_en.length === 4 && !!s.soru_en;

function yazIstemi(d) {
  const s = d.s;
  return [
    `Soru (TR): ${s.soru}`, `Kategori: ${s.kategori} · zorluk ${s.zorluk}/5`,
    `TR şıklar: ${s.secenekler.map((x, i) => `${i}: ${x}`).join(' | ')}`,
    `Doğru şık indeksi: ${s.dogru_cevap} ("${s.secenekler[s.dogru_cevap]}")`,
    `Jev'in (soru gizliyken) doğru şıka verdiği olasılık: ${d.jev_p_once == null ? '?' : d.jev_p_once.toFixed(2)} — hedef ≤ ${ESIK_P}`,
    enVar(s) ? `Soru (EN): ${s.soru_en}\nEN şıklar: ${s.secenekler_en.map((x, i) => `${i}: ${x}`).join(' | ')}` : 'EN çeviri yok: "en" = [].',
    d.geri ? `\nÖnceki deneme reddedildi: ${d.geri}\nBu kez farklı ve daha dengeli çeldiriciler yaz.` : '',
  ].filter(Boolean).join('\n');
}

function dogrula(y, s) {
  const h = [];
  const bos = (a) => !Array.isArray(a) || a.length !== 4 || a.some((x) => typeof x !== 'string' || !x.trim());
  if (bos(y?.tr)) return ['tr: 4 dolu şık değil'];
  if (enVar(s) && bos(y?.en)) return ['en: 4 dolu şık değil'];
  if (y.tr[s.dogru_cevap] !== s.secenekler[s.dogru_cevap]) h.push('doğru TR şık değişmiş');
  if (enVar(s) && y.en[s.dogru_cevap] !== s.secenekler_en[s.dogru_cevap]) h.push('doğru EN şık değişmiş');
  if (new Set(y.tr.map((x) => x.trim().toLowerCase())).size !== 4) h.push('TR şıklar yinelenen');
  if (enVar(s) && new Set(y.en.map((x) => x.trim().toLowerCase())).size !== 4) h.push('EN şıklar yinelenen');
  return h;
}

// ---------------------------------------------------------------- 3) kapılar (sik-ipucu-api.mjs ile aynı)
function kuralKapisi(adaylar) {
  const satirlar = sorgu(hamKapiSorgusu(adaylar.map((a) => ({ anahtar: a.id, soru: a.soru, secenekler: a.tr, dogru_cevap: a.dogru }))));
  return new Map(satirlar.map((r) => [r.anahtar, r.agir || '']));
}

/** Havuzda tekrar: aynı kategoride, aynı şık kümesine sahip başka aktif soru var mı? */
function tekrarKapisi(adaylar) {
  const kayit = JSON.stringify(adaylar.map((a) => ({ id: a.id, k: a.kategori, s: [...a.tr].sort() })));
  const e = `$jx$${kayit}$jx$`;
  const satirlar = sorgu(`
    select g.id from jsonb_to_recordset(${e}::jsonb) as g(id uuid, k text, s jsonb)
     where exists (select 1 from public.questions q
                    where q.aktif and q.id <> g.id and q.kategori = g.k
                      and (select jsonb_agg(x order by x) from jsonb_array_elements_text(q.secenekler) x) = g.s);`);
  return new Set(satirlar.map((r) => r.id));
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
const HAKEM_SEMA = { type: 'object', properties: { karar: { type: 'string', enum: ['kesin_yanlis', 'tartismali'] }, gerekce: { type: 'string' } }, required: ['karar', 'gerekce'], additionalProperties: false };

async function hakemKapisi(anahtar, a) {
  const yanlislar = a.tr.filter((_, i) => i !== a.dogru);
  const kararlar = await Promise.all(yanlislar.map(async (sik) => {
    const y = await claudeCagir(anahtar, { model: HAKEM, sistem: HAKEM_SISTEM, sema: HAKEM_SEMA, istem: `Soru: ${a.soru}\nDoğru cevap: ${a.tr[a.dogru]}\nAday yanlış şık: ${sik}`, maxJeton: 1500 });
    if (y?.karar !== 'kesin_yanlis' && y?.karar !== 'tartismali') throw new Error('hakem kararı geçersiz');
    return { sik, karar: y.karar, gerekce: String(y.gerekce ?? '').slice(0, 160) };
  }));
  return kararlar.find((k) => k.karar === 'tartismali') ?? null;
}

/** EN sürümü: makine kontrolleri (benzer şık, sayı) + ayrı Claude'un yalnız EN'den doğru şıkkı bulması. */
async function enKapisi(anahtar, a) {
  if (!a.en?.length) return null;
  if (C.benzerSikCiftleri(a.tr, a.en, 0.9, EN_KURAL.atilacak).length) return 'EN: iki şık aynı/çok benzer';
  const sf = C.sayiFarki([a.soru, ...a.tr].join(' \n '), [a.soru_en, ...a.en].join(' \n '), EN_KURAL);
  if (sf) return `EN: sayı uyuşmuyor ${JSON.stringify(sf)}`;
  const g = C.geriKontrolIstemi(EN_KURAL, [{ no: 0, soru: a.soru_en, secenekler: a.en }]);
  const y = await claudeCagir(anahtar, { model: HAKEM, sistem: g.system, sema: C.geriKontrolSemasi, istem: g.user, maxJeton: 1000 });
  const c = y.cevaplar?.find((x) => x.no === 0);
  if (!c) return 'EN geri kontrol sonucu yok';
  if (c.birden_fazla_dogru) return 'EN geri kontrol: birden fazla doğru';
  if (c.dogru !== a.dogru) return `EN geri kontrol farklı şık seçti (${c.dogru} ≠ ${a.dogru})`;
  return null;
}

async function yazAdaylari(bekleyen, anahtar) {
  const adaylar = [];
  await havuz(bekleyen, ESZAMANLI, async (d) => {
    if (butceKontrol()) return;
    d.deneme += 1;
    try {
      const y = await claudeCagir(anahtar, { model: YAZAR, sistem: YAZ_SISTEM, sema: YAZ_SEMA, istem: yazIstemi(d), maxJeton: 3000, effort: 'medium' });
      const h = dogrula(y, d.s);
      if (h.length) { d.geri = `şema/değişmezlik: ${h.join('; ')}`; return; }
      adaylar.push({ d, id: d.s.id, soru: d.s.soru, soru_en: d.s.soru_en, kategori: d.s.kategori, tr: y.tr, en: enVar(d.s) ? y.en : null, dogru: Number(d.s.dogru_cevap) });
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi: ${e.message.slice(0, 160)}`);
      d.geri = `API hatası: ${String(e.message).slice(0, 120)}`;
    }
  });
  return adaylar;
}

async function kapilar(adaylar, anahtar) {
  if (!adaylar.length) return;
  const kural = kuralKapisi(adaylar);
  const tekrar = tekrarKapisi(adaylar);
  const kalan = [];
  for (const a of adaylar) {
    const agir = kural.get(a.id);
    if (agir === undefined) a.d.geri = 'kural kapısı satır döndürmedi';
    else if (agir) a.d.geri = `kural işareti: ${agir}`;
    else if (tekrar.has(a.id)) a.d.geri = 'havuzda aynı şık kümesine sahip başka soru var';
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
      const en = await enKapisi(anahtar, a);
      if (en) { a.d.geri = en; return; }
      a.d.sonuc = ip.pDogru >= SINIR_ALT ? 'sinirda' : 'gecti';
      a.d.jev_p_sonra = ip.pDogru;
      a.d.yeni = { tr: a.tr, en: a.en };
    } catch (e) {
      if (e.kritik) throw new Error(`Anahtar reddedildi: ${e.message.slice(0, 160)}`);
      a.d.geri = `kapı hatası: ${String(e.message).slice(0, 120)}`;
    }
  });
}

// ---------------------------------------------------------------- çalıştırma
async function calistir() {
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok.');
  const st = durumOku();
  const hepsi = tumSorular();
  const ilk = ilkTurBilgisi();
  const harita = new Map(hepsi.map((s) => [s.id, s]));
  let hedefler = hepsi.filter((s) => !st.sorular[s.id]?.sonuc || ['bekliyor', 'butce_durdu'].includes(st.sorular[s.id].sonuc));
  if (ORNEK) {
    // örneklem: ilk turda sınırda diye bırakılanlar hariç (maliyet ölçümü), zorluk gruplarına dağıtılmış
    const kovalar = new Map();
    for (const s of hedefler.filter((x) => ilk[x.id]?.sonuc !== 'sinirda_cikarildi')) {
      if (!kovalar.has(s.zorluk)) kovalar.set(s.zorluk, []);
      kovalar.get(s.zorluk).push(s);
    }
    const sec = [];
    while (sec.length < ORNEK && [...kovalar.values()].some((k) => k.length)) for (const k of kovalar.values()) if (k.length && sec.length < ORNEK) sec.push(k.shift());
    hedefler = sec;
  }
  console.log(`Aktif işaretli ${hepsi.length} · bu turda işlenecek ${hedefler.length}`);

  // sınıflandırma
  const durum = hedefler.map((s) => ({ s, ...(st.sorular[s.id] ?? {}), sonuc: 'bekliyor', deneme: st.sorular[s.id]?.deneme ?? 0, geri: st.sorular[s.id]?.geri ?? '' }));
  await havuz(durum.filter((d) => !d.sinif), ESZAMANLI, async (d) => {
    if (butceKontrol()) return;
    try {
      if (ilk[d.s.id]?.sonuc === 'sinirda_cikarildi') { d.sinif = 'c'; d.sinif_gerekce = 'ilk turda sınırda (p 0,70–0,75) diye bilerek işaretli bırakıldı'; d.jev_p_once = ilk[d.s.id].jev_p_once ?? null; return; }
      const r = await sikIpucuTesti(d.s.secenekler, d.s.secenekler[d.s.dogru_cevap], d.s.id);
      jev.jeton += r.jeton; d.jev_p_once = r.pDogru;
      Object.assign(d, await siniflandir(anahtar, d, ilk[d.s.id]), {});
      d.sinif_gerekce = d.gerekce; delete d.gerekce;
    } catch (e) {
      if (e.kritik) throw e;
      console.error(`sınıflama hatası ${d.s.id}: ${String(e.message).slice(0, 100)}`);
    }
  });
  for (const d of durum) {
    if (d.sinif === 'b') { d.sonuc = 'dokunulmadi_b'; }
    else if (d.sinif === 'c') { d.sonuc = 'dokunulmadi_c'; }
  }
  const kaydet = () => { for (const d of durum) st.sorular[d.s.id] = { sinif: d.sinif, sinif_gerekce: d.sinif_gerekce, sonuc: d.sonuc, deneme: d.deneme, geri: d.geri, jev_p_once: d.jev_p_once ?? null, jev_p_sonra: d.jev_p_sonra ?? null, yeni: d.yeni ?? null }; durumYaz(st); };
  kaydet();
  console.log(`Sınıflama bitti · $${toplamUsd().toFixed(3)} · ${JSON.stringify(durum.reduce((m, d) => ((m[d.sinif ?? '?'] = (m[d.sinif ?? '?'] || 0) + 1), m), {}))}`);

  // yeniden yazım (yalnız a)
  const a = durum.filter((d) => d.sinif === 'a');
  while (!butceKontrol()) {
    const bekleyen = a.filter((d) => d.sonuc === 'bekliyor' && d.deneme < DENEME_SAYISI);
    if (!bekleyen.length) break;
    try { await kapilar(await yazAdaylari(bekleyen, anahtar), anahtar); } finally { kaydet(); }
    console.log(`  geçen ${a.filter((d) => d.sonuc === 'gecti').length} · sınırda ${a.filter((d) => d.sonuc === 'sinirda').length}/${a.length} · $${toplamUsd().toFixed(3)}`);
  }
  for (const d of a) if (d.sonuc === 'bekliyor') d.sonuc = d.deneme >= DENEME_SAYISI ? 'kaldi' : 'butce_durdu';
  kaydet();

  const say = (f) => durum.filter(f).length;
  const rapor = {
    islenen: durum.length, siniflar: { a: say((d) => d.sinif === 'a'), b: say((d) => d.sinif === 'b'), c: say((d) => d.sinif === 'c') },
    gecti: say((d) => d.sonuc === 'gecti'), sinirda: say((d) => d.sonuc === 'sinirda'), kaldi: say((d) => d.sonuc === 'kaldi'),
    claude_usd: Number(apiUsd().toFixed(3)), jev_usd: Number(maliyetUsd(jev.jeton).toFixed(4)), toplam_usd: Number(toplamUsd().toFixed(3)), butce_asildi: butceAsildi, harcama,
  };
  console.log(JSON.stringify(rapor));
  if (ORNEK) {
    const islenen = durum.filter((d) => d.sinif !== 'c').length || 1;
    console.log(`Soru başına ~$${(toplamUsd() / islenen).toFixed(4)} (sınırda dışı) · ${harita.size} aktif işaretli için tahmin ≈ $${((toplamUsd() / islenen) * (harita.size - 67)).toFixed(2)}`);
    for (const d of durum.filter((x) => x.sonuc === 'gecti').slice(0, 3)) console.log(`ÖRNEK ${d.s.soru}\n  eski ${JSON.stringify(d.s.secenekler)}\n  yeni ${JSON.stringify(d.yeni.tr)}`);
  }
}

// ---------------------------------------------------------------- migration / geri alma / CSV
const sqlAlinti = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sqlJson = (v) => (v == null ? 'null' : `${sqlAlinti(JSON.stringify(v))}::jsonb`);
const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function uret() {
  const no = arg('--no');
  if (!/^\d{14}$/.test(no ?? '')) throw new Error('--no 14 haneli migration sürümü olmalı (ör. 20260612001030)');
  const st = durumOku();
  const hepsi = tumSorular();
  const harita = new Map(hepsi.map((s) => [s.id, s]));
  const secili = Object.entries(st.sorular).filter(([id, x]) => x.sonuc === 'gecti' && harita.has(id)).map(([id, x]) => ({ s: harita.get(id), x }));
  if (!secili.length) throw new Error('Geçen soru yok.');
  const n4 = no.slice(-4);
  const t = new Date();
  const tarih = `${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()}`;
  const satirlar = secili.map(({ s, x }) => `    (${sqlAlinti(s.id)}::uuid, ${Number(s.dogru_cevap)}, ${sqlJson(s.secenekler)}, ${sqlJson(x.yeni.tr)}, ${sqlJson(enVar(s) ? s.secenekler_en : null)}, ${sqlJson(enVar(s) ? x.yeni.en : null)})`).join(',\n');
  const sql = `-- ============================================================
-- ${n4} — Şık ipucu düzeltmesi, kalan işaretli sorular (zorluk 1–5, ${tarih}, Claude API)
--
-- 420–422 ve 997/1001–1006'dan sonra \`sik_ipucu_jev\` işaretli kalan aktif sorular sınıflandı
-- ((a) şık yazımıyla düzelir · (b) cevap şıksız da bilinir · (c) sınırda). Yalnız (a) sınıfından ${secili.length} sorunun
-- YANLIŞ şıkları Claude Opus ile yeniden yazıldı; soru metni, doğru cevap ve doğru şıkkın indeksi DEĞİŞMEDİ.
-- Kapılar: soru_kural_isaretleri (ağır işaret yok) · Jev "soru olmadan" testi (doğru şıkka p <= ${ESIK_P}; ${SINIR_ALT}–${ESIK_P} "sınırda" dışarıda)
-- · Jev tek doğru cevap · şık başına ayrı Claude hakem (kesin_yanlis) · havuzda aynı şık kümesi yok · EN: benzer şık/sayı
-- kontrolü + yalnız EN sürümden doğru şıkkı bulma. TR ve EN şıklar aynı indekslerle birlikte güncellenir.
-- Eski hâl: soru_surum (surum +1), araclar/soru-temizlik/sik-ipucu-duzeltme.csv (parti ${PARTI_NO}) ve docs/sik-ipucu-837-geri-al.sql.
-- Üretici: araclar/soru-temizlik/sik-ipucu-837.mjs --uret
-- ============================================================

select set_config('app.soru_elle_isaret_yaz', 'on', true);

create temp table _j_sik (id uuid primary key, dogru smallint, eski_tr jsonb, yeni_tr jsonb, eski_en jsonb, yeni_en jsonb) on commit drop;
insert into _j_sik values
${satirlar};

do $$
declare v_n int; v_beklenen int := (select count(*) from _j_sik);
begin
  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where q.secenekler = s.eski_tr and q.dogru_cevap = s.dogru and q.aktif;
  if v_n <> v_beklenen then
    raise exception 'Şık ipucu ${n4}: % sorudan % tanesi beklenen eski hâlde', v_beklenen, v_n;
  end if;

  insert into public.soru_surum (question_id, surum, soru, secenekler, dogru_cevap, degisiklik_notu)
  select q.id, q.surum, q.soru, q.secenekler, q.dogru_cevap, 'Şık ipucu düzeltmesi: yanlış şıklar yeniden yazıldı (${n4})'
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
    raise exception 'Şık ipucu ${n4}: EN çeviri % satır güncellendi, beklenen %', v_n, (select count(*) from _j_sik where yeni_en is not null);
  end if;

  select count(*) into v_n from public.questions q join _j_sik s on s.id = q.id
   where 'sik_ipucu_jev' = any(q.supheli_isaretler) or q.supheli_agirlik >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2);
  if v_n > 0 then
    raise exception 'Şık ipucu ${n4}: % soruda işaret/ağırlık kaldı', v_n;
  end if;
end $$;

select set_config('app.soru_elle_isaret_yaz', '', true);
`;
  fs.writeFileSync(path.join(KOK, 'supabase', 'migrations', `${no}_sik_ipucu_kalan_duzeltme.sql`), sql, 'utf8');

  // geri alma SQL'i (eski şıklar açıkça yazılı; işaret geri konur)
  const geri = `-- Şık ipucu düzeltmesi ${n4} GERİ ALMA (${tarih}): eski TR/EN şıkları geri yazılır, sik_ipucu_jev işareti geri konur.
-- Yalnız satır hâlâ yeni şıkları taşıyorsa dokunur. Çalıştırma: node araclar/migration-prova.mjs gibi bir işlemde ya da psql ile.
begin;
select set_config('app.soru_elle_isaret_yaz', 'on', true);
create temp table _geri (id uuid primary key, eski_tr jsonb, yeni_tr jsonb, eski_en jsonb, yeni_en jsonb) on commit drop;
insert into _geri values
${secili.map(({ s, x }) => `    (${sqlAlinti(s.id)}::uuid, ${sqlJson(s.secenekler)}, ${sqlJson(x.yeni.tr)}, ${sqlJson(enVar(s) ? s.secenekler_en : null)}, ${sqlJson(enVar(s) ? x.yeni.en : null)})`).join(',\n')};
insert into public.soru_surum (question_id, surum, soru, secenekler, dogru_cevap, degisiklik_notu)
select q.id, q.surum, q.soru, q.secenekler, q.dogru_cevap, 'Şık ipucu düzeltmesi geri alındı (${n4})'
  from public.questions q join _geri g on g.id = q.id and q.secenekler = g.yeni_tr;
update public.questions q set secenekler = g.eski_tr, supheli_isaretler = array_append(array_remove(q.supheli_isaretler, 'sik_ipucu_jev'), 'sik_ipucu_jev'), surum = q.surum + 1
  from _geri g where q.id = g.id and q.secenekler = g.yeni_tr;
update public.question_translations t set secenekler = g.eski_en
  from _geri g where t.question_id = g.id and t.dil = 'en' and g.eski_en is not null and t.secenekler = g.yeni_en;
select set_config('app.soru_elle_isaret_yaz', '', true);
commit;
`;
  fs.writeFileSync(path.join(KOK, 'docs', 'sik-ipucu-837-geri-al.sql'), geri, 'utf8');

  // CSV: ana dosyaya 'duzeltildi' (geri-al.mjs ile uyumlu) + tam rapor
  const p3 = (v) => (v == null ? '' : Number(v).toFixed(3));
  const mevcut = fs.readFileSync(CSV_ANA, 'utf8');
  const yeniSatir = secili.filter(({ s }) => !mevcut.includes(s.id + `,${PARTI_NO},`)).map(({ s, x }) => [s.id, PARTI_NO, `${no}_sik_ipucu_kalan_duzeltme`, s.kategori, s.zorluk, s.dogru_cevap, JSON.stringify(s.secenekler), JSON.stringify(x.yeni.tr), enVar(s) ? JSON.stringify(s.secenekler_en) : '', enVar(s) ? JSON.stringify(x.yeni.en) : '', p3(x.jev_p_once), p3(x.jev_p_sonra), 'duzeltildi'].map(csvAlan).join(','));
  if (yeniSatir.length) fs.appendFileSync(CSV_ANA, (mevcut.endsWith('\n') ? '' : '\n') + yeniSatir.join('\n') + '\n', 'utf8');
  const baslik = 'id,kategori,zorluk,sinif,sonuc,jev_p_once,jev_p_sonra,neden,soru,dogru,eski_tr,yeni_tr';
  const rows = Object.entries(st.sorular).map(([id, x]) => {
    const s = harita.get(id); if (!s) return null;
    return [id, s.kategori, s.zorluk, x.sinif ?? '', x.sonuc, p3(x.jev_p_once), p3(x.jev_p_sonra), x.sonuc === 'gecti' ? '' : (x.geri || x.sinif_gerekce || ''), s.soru, s.secenekler[s.dogru_cevap], JSON.stringify(s.secenekler), x.yeni ? JSON.stringify(x.yeni.tr) : ''].map(csvAlan).join(',');
  }).filter(Boolean);
  fs.writeFileSync(CSV_RAPOR, baslik + '\n' + rows.join('\n') + '\n', 'utf8');
  console.log(`Migration ${no} · ${secili.length} soru · CSV ana +${yeniSatir.length} · rapor ${rows.length} satır`);
}

(URET ? Promise.resolve().then(uret) : (ORNEK || TAM) ? calistir() : Promise.reject(new Error('--ornek N | --tam | --uret --no NNN')))
  .catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
