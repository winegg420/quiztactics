// İngilizcesi eksik aktif sorular: evrensel (kapsam='global') olanları claude-opus-5-5 ile çevirir; yerel (Türkiye'ye özgü) olanlara EN yapılmaz.
// Hat = supabase/functions/generate-questions/ceviri.ts (istem, şema, makine kontrolleri, karar) — ceviri-paket.mjs ile aynen kullanılır;
// model yerel çalışır (Edge Function sırları gerekmez). Geri kontrol: yalnız EN sürümden doğru şıkkı bulma (Sonnet) + ayrı anlam/akıcılık hakemi (Sonnet).
//
//   node araclar/soru-temizlik/en-eksik-ceviri.mjs --ornek 30        → 30 soruluk örneklem, maliyet raporu
//   node araclar/soru-temizlik/en-eksik-ceviri.mjs --tam             → kalan hepsi (durum dosyasından devam eder)
//   node araclar/soru-temizlik/en-eksik-ceviri.mjs --uret --no NNN   → migration + docs/en-ceviri-eksik-geri-al.sql + CSV (UYGULAMAZ)
//   Ortak: --butce-usd 20
// Durum: .tmp/en-ceviri/durum.json. Anahtar: .env.local › ANTHROPIC_API_KEY (yazdırılmaz).
import fs from 'node:fs';
import path from 'node:path';
import { sorgu, KOK } from '../soru_denetim/ortak.mjs';
import { anahtarOku, claudeCagir, harcama, apiUsd } from './claude-cagri.mjs';
import { C } from './ceviri-paket.mjs';

const CEVIRMEN = 'claude-opus-5-5';
const HAKEM = 'claude-sonnet-5-5';
const PARTI = 6;
const ESZAMANLI = 3;
const KLASOR = path.join(KOK, '.tmp', 'en-ceviri');
const DURUM = path.join(KLASOR, 'durum.json');
const CSV = path.join(KOK, 'araclar', 'soru-temizlik', 'en-eksik-ceviri-rapor.csv');

const arg = (ad, v) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : v; };
const ORNEK = process.argv.includes('--ornek') ? Number(arg('--ornek', 30)) : 0;
const TAM = process.argv.includes('--tam');
const URET = process.argv.includes('--uret');
const BUTCE = Number(arg('--butce-usd', 20));
let butceAsildi = false;
const butceKontrol = () => { if (apiUsd() > BUTCE) butceAsildi = true; return butceAsildi; };

async function havuz(ogeler, n, fn) {
  let sira = 0;
  await Promise.all(Array.from({ length: Math.min(n, ogeler.length) }, async () => {
    while (sira < ogeler.length) await fn(ogeler[sira++]);
  }));
}

function durumOku() {
  if (!fs.existsSync(DURUM)) return { sonuclar: {}, harcama: {} };
  const st = JSON.parse(fs.readFileSync(DURUM, 'utf8'));
  for (const [m, h] of Object.entries(st.harcama ?? {})) harcama[m] = h;
  return st;
}
function durumYaz(st) {
  st.harcama = JSON.parse(JSON.stringify(harcama));
  fs.mkdirSync(KLASOR, { recursive: true });
  fs.writeFileSync(DURUM + '.tmp', JSON.stringify(st));
  fs.renameSync(DURUM + '.tmp', DURUM);
}

/** EN'i olmayan aktif sorular; ceviri_atlanan'da kaydı olanlar (önceki karar) yeniden denenmez. */
function eksikSorular() {
  return sorgu(`
    select q.id::text id, q.kategori, q.kapsam, q.soru, q.secenekler, q.dogru_cevap::int dogru_cevap,
           exists (select 1 from public.ceviri_atlanan a where a.question_id = q.id and a.dil = 'en') atlanan
      from public.questions q
     where q.aktif
       and not exists (select 1 from public.question_translations t where t.question_id = q.id and t.dil = 'en')
     order by md5(q.id::text);`);
}
function enKurali() {
  const r = sorgu(`select dil, ad, kurallar, ondalik, binlik, sozluk, atilacak from public.ceviri_dil_kurallari where dil = 'en' and aktif`)[0];
  if (!r) throw new Error('ceviri_dil_kurallari en satırı yok');
  return r;
}
function esik() { return Number(sorgu(`select deger from public.oyun_ayarlari where anahtar = 'ceviri_benzerlik_esigi'`)[0]?.deger ?? 0.9); }

const HAKEM_SISTEM = `You are a bilingual (Turkish/English) quiz editor. You get a Turkish trivia question with its options and correct index, and its English translation.
Judge whether the English version is a faithful, natural question: same meaning, same facts, the SAME option is correct at the SAME index, no option became a second valid answer,
natural idiomatic English (not word-for-word), no hint added/removed (e.g. the answer is not given away by parentheses). Be strict about meaning shifts and wrong terminology.
karar "ok" or "sorunlu"; sorun: one short Turkish sentence (empty if ok). JSON only.`;
const HAKEM_SEMA = { type: 'object', properties: { karar: { type: 'string', enum: ['ok', 'sorunlu'] }, sorun: { type: 'string' } }, required: ['karar', 'sorun'], additionalProperties: false };

async function hakem(anahtar, q, soru, secenekler) {
  const istem = JSON.stringify({ tr: { soru: q.soru, secenekler: q.secenekler, dogru_indeks: q.dogru_cevap, kategori: q.kategori }, en: { soru, secenekler } });
  const y = await claudeCagir(anahtar, { model: HAKEM, sistem: HAKEM_SISTEM, sema: HAKEM_SEMA, istem, maxJeton: 800 });
  return y?.karar === 'ok' ? null : String(y?.sorun || 'hakem: sorunlu').slice(0, 200);
}

async function parcaIsle(anahtar, grup, kural, esikDeger, st) {
  let ceviriler = [], cevaplar = [];
  try {
    const ist = C.ceviriIstemi(kural, grup);
    const y = await claudeCagir(anahtar, { model: CEVIRMEN, sistem: ist.system, sema: C.ceviriSemasi, istem: ist.user, maxJeton: 12000, effort: 'medium' });
    ceviriler = y.ceviriler ?? [];
    const aday = ceviriler.filter((c) => c.cevrilebilir && Array.isArray(c.secenekler) && c.secenekler.length)
      .map((c) => ({ no: c.no, soru: c.soru, secenekler: c.secenekler.map((s) => s.metin) }));
    if (aday.length) {
      const g = C.geriKontrolIstemi(kural, aday);
      cevaplar = (await claudeCagir(anahtar, { model: HAKEM, sistem: g.system, sema: C.geriKontrolSemasi, istem: g.user, maxJeton: 4000 })).cevaplar ?? [];
    }
  } catch (e) {
    if (e.kritik) throw e;
    console.error(`parça hatası: ${String(e.message).slice(0, 120)} (sonra yeniden denenir)`);
    return;
  }
  for (let no = 0; no < grup.length; no++) {
    const q = grup[no];
    const k = C.karar(q, ceviriler.find((x) => x.no === no), cevaplar.find((x) => x.no === no), kural, esikDeger);
    if (k.tamam) {
      try {
        const sorun = await hakem(anahtar, q, k.soru, k.secenekler);
        if (sorun) { st.sonuclar[q.id] = { tamam: false, kod: 'hakem', neden: sorun, soru: k.soru, secenekler: k.secenekler }; continue; }
      } catch (e) { if (e.kritik) throw e; console.error(`hakem hatası ${q.id}`); continue; }
      st.sonuclar[q.id] = { tamam: true, soru: k.soru, secenekler: k.secenekler };
    } else {
      st.sonuclar[q.id] = { tamam: false, kod: k.kod, neden: String(k.neden).slice(0, 300) };
    }
  }
}

async function calistir() {
  const anahtar = anahtarOku();
  if (!anahtar) throw new Error('ANTHROPIC_API_KEY .env.local içinde yok.');
  const st = durumOku();
  const eksik = eksikSorular();
  const yerel = eksik.filter((s) => s.kapsam === 'yerel');
  const atlananGlobal = eksik.filter((s) => s.kapsam !== 'yerel' && s.atlanan);
  let adaylar = eksik.filter((s) => s.kapsam !== 'yerel' && !s.atlanan && !st.sonuclar[s.id]);
  console.log(`EN eksik ${eksik.length} · yerel (çevrilmez) ${yerel.length} · önceden atlanmış evrensel ${atlananGlobal.length} · çevrilecek aday ${adaylar.length}`);
  if (ORNEK) {
    const kovalar = new Map();
    for (const s of adaylar) { if (!kovalar.has(s.kategori)) kovalar.set(s.kategori, []); kovalar.get(s.kategori).push(s); }
    const sec = [];
    while (sec.length < ORNEK && [...kovalar.values()].some((k) => k.length)) for (const k of kovalar.values()) if (k.length && sec.length < ORNEK) sec.push(k.shift());
    adaylar = sec;
  }
  const kural = enKurali(); const e = esik();
  const parcalar = [];
  for (let i = 0; i < adaylar.length; i += PARTI) parcalar.push(adaylar.slice(i, i + PARTI));
  await havuz(parcalar, ESZAMANLI, async (g) => {
    if (butceKontrol()) return;
    await parcaIsle(anahtar, g, kural, e, st);
    durumYaz(st);
  });
  durumYaz(st);
  const islenen = adaylar.filter((s) => st.sonuclar[s.id]);
  const gecen = islenen.filter((s) => st.sonuclar[s.id].tamam);
  const nedenler = {};
  for (const s of islenen.filter((x) => !st.sonuclar[x.id].tamam)) nedenler[st.sonuclar[s.id].kod] = (nedenler[st.sonuclar[s.id].kod] || 0) + 1;
  console.log(JSON.stringify({ aday: adaylar.length, islenen: islenen.length, gecen: gecen.length, kalan: islenen.length - gecen.length, nedenler, usd: Number(apiUsd().toFixed(3)), butce_asildi: butceAsildi, harcama }));
  if (ORNEK && islenen.length) {
    const sb = apiUsd() / islenen.length;
    const toplamAday = eksik.filter((s) => s.kapsam !== 'yerel' && !s.atlanan).length;
    console.log(`Soru başına ~$${sb.toFixed(4)} · ${toplamAday} soru için tahmin ≈ $${(sb * toplamAday).toFixed(2)}`);
    for (const s of gecen.slice(0, 3)) console.log(`ÖRNEK ${s.soru}\n  ${JSON.stringify(s.secenekler)} (doğru ${s.dogru_cevap})\n  → ${st.sonuclar[s.id].soru}\n  → ${JSON.stringify(st.sonuclar[s.id].secenekler)}`);
  }
}

// ---------------------------------------------------------------- migration / geri alma / CSV
const sqlAlinti = (v) => `'${String(v).replace(/'/g, "''")}'`;
const sqlJson = (v) => `${sqlAlinti(JSON.stringify(v))}::jsonb`;
const csvAlan = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function uret() {
  const no = arg('--no');
  if (!/^\d{14}$/.test(no ?? '')) throw new Error('--no 14 haneli migration sürümü olmalı');
  const st = durumOku();
  const eksik = eksikSorular();
  const harita = new Map(eksik.map((s) => [s.id, s]));
  const gecen = Object.entries(st.sonuclar).filter(([id, x]) => x.tamam && harita.has(id));
  const kalan = Object.entries(st.sonuclar).filter(([id, x]) => !x.tamam && harita.has(id));
  const yerelAtlanmamis = eksik.filter((s) => s.kapsam === 'yerel' && !s.atlanan);
  if (!gecen.length) throw new Error('Geçen çeviri yok.');
  const n4 = no.slice(-4);
  const t = new Date();
  const tarih = `${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()}`;
  const ceviriSatir = gecen.map(([id, x]) => `    (${sqlAlinti(id)}::uuid, ${sqlAlinti(x.soru)}, ${sqlJson(x.secenekler)})`).join(',\n');
  const atlananSatir = [
    ...kalan.map(([id, x]) => `    (${sqlAlinti(id)}::uuid, ${sqlAlinti(['hakem'].includes(x.kod) ? 'geri_kontrol_farkli' : x.kod)}, ${sqlAlinti(x.neden.slice(0, 280))})`),
    ...yerelAtlanmamis.map((s) => `    (${sqlAlinti(s.id)}::uuid, 'cevrilemez', ${sqlAlinti("kapsam=yerel (Türkiye'ye özgü): yabancı oyuncu için EN çeviri yapılmadı")})`),
  ].join(',\n');
  const sql = `-- ============================================================
-- ${n4} — Eksik İngilizce çeviriler (${tarih}, Claude API)
--
-- İngilizcesi olmayan aktif sorulardan ${gecen.length} evrensel (kapsam='global') soru claude-opus-5-5 ile çevrildi
-- (ceviri.ts hattı: bağlamla çeviri → makine kontrolleri → yalnız EN'den geri kontrol → ayrı anlam hakemi).
-- Şık sırası/indeksi kaynakla aynıdır, doğru şık TR ile birebir eşleşir; TR soru satırlarına DOKUNULMAZ
-- (oyunda şıklar sonradan TR ve EN aynı permütasyonla karışır). kapsam='yerel' sorulara EN yapılmadı
-- (${yerelAtlanmamis.length} soru ceviri_atlanan'a 'cevrilemez' olarak yazıldı). Çevrilemeyen/geçemeyen ${kalan.length} soru ceviri_atlanan'a yazıldı.
-- Üretici: araclar/soru-temizlik/en-eksik-ceviri.mjs --uret · rapor: araclar/soru-temizlik/en-eksik-ceviri-rapor.csv
-- Geri alma: docs/en-ceviri-eksik-geri-al.sql
-- ============================================================

create temp table _en_yeni (id uuid primary key, soru text not null, secenekler jsonb not null) on commit drop;
insert into _en_yeni values
${ceviriSatir};

do $$
declare v_n int; v_beklenen int := (select count(*) from _en_yeni);
begin
  -- Yalnız hâlâ aktif ve çevirisiz sorulara yaz
  select count(*) into v_n from public.questions q join _en_yeni y on y.id = q.id
   where q.aktif and q.kapsam = 'global'
     and not exists (select 1 from public.question_translations t where t.question_id = q.id and t.dil = 'en');
  if v_n <> v_beklenen then
    raise exception 'EN çeviri ${n4}: % sorudan % tanesi uygun (aktif, global, çevirisiz)', v_beklenen, v_n;
  end if;

  insert into public.question_translations (question_id, dil, soru, secenekler)
  select id, 'en', soru, secenekler from _en_yeni;
  get diagnostics v_n = row_count;
  if v_n <> v_beklenen then raise exception 'EN çeviri ${n4}: % satır eklendi, beklenen %', v_n, v_beklenen; end if;
end $$;

${atlananSatir ? `insert into public.ceviri_atlanan (question_id, dil, kod, neden)
select a.id, 'en', a.kod, a.neden
  from (values
${atlananSatir}
  ) as a(id, kod, neden)
 where exists (select 1 from public.questions q where q.id = a.id and q.aktif)
   and not exists (select 1 from public.question_translations t where t.question_id = a.id and t.dil = 'en')
on conflict (question_id, dil) do nothing;` : '-- atlanan yok'}
`;
  fs.writeFileSync(path.join(KOK, 'supabase', 'migrations', `${no}_en_eksik_ceviriler.sql`), sql, 'utf8');
  const geri = `-- Eksik EN çeviriler ${n4} GERİ ALMA (${tarih}): eklenen ${gecen.length} EN çeviri satırı ve yazılan ceviri_atlanan kayıtları kaldırılır.
-- (Satırlar bu migration ile eklenmişti; başka bir şey eklenmediği için yalnız bu id'ler silinir.)
begin;
delete from public.question_translations where dil = 'en' and question_id in (
${gecen.map(([id]) => `  ${sqlAlinti(id)}::uuid`).join(',\n')}
);
delete from public.ceviri_atlanan where dil = 'en' and kod in ('cevrilemez','geri_kontrol_farkli','geri_kontrol_coklu','benzer_sik','ozel_isim','sayi','bicim','sik_sayisi','sik_sirasi') and question_id in (
${[...kalan.map(([id]) => id), ...yerelAtlanmamis.map((s) => s.id)].map((id) => `  ${sqlAlinti(id)}::uuid`).join(',\n')}
) and created_at >= '${t.toISOString().slice(0, 10)}'::date;
commit;
`;
  fs.writeFileSync(path.join(KOK, 'docs', 'en-ceviri-eksik-geri-al.sql'), geri, 'utf8');
  const baslik = 'id,kategori,kapsam,sonuc,kod,neden,soru_tr,dogru_tr,soru_en,secenekler_en';
  const rows = [
    ...gecen.map(([id, x]) => { const s = harita.get(id); return [id, s.kategori, s.kapsam, 'eklendi', '', '', s.soru, s.secenekler[s.dogru_cevap], x.soru, JSON.stringify(x.secenekler)]; }),
    ...kalan.map(([id, x]) => { const s = harita.get(id); return [id, s.kategori, s.kapsam, 'gecemedi', x.kod, x.neden, s.soru, s.secenekler[s.dogru_cevap], x.soru ?? '', x.secenekler ? JSON.stringify(x.secenekler) : '']; }),
    ...eksik.filter((s) => s.kapsam === 'yerel').map((s) => [s.id, s.kategori, s.kapsam, 'yerel_cevrilmedi', '', "kapsam=yerel (Türkiye'ye özgü)", s.soru, s.secenekler[s.dogru_cevap], '', '']),
  ].map((r) => r.map(csvAlan).join(','));
  fs.writeFileSync(CSV, baslik + '\n' + rows.join('\n') + '\n', 'utf8');
  console.log(`Migration ${no} · eklenecek ${gecen.length} · geçemeyen ${kalan.length} · yerel ${eksik.filter((s) => s.kapsam === 'yerel').length} · rapor ${rows.length} satır`);
}

(URET ? Promise.resolve().then(uret) : (ORNEK || TAM) ? calistir() : Promise.reject(new Error('--ornek N | --tam | --uret --no NNN')))
  .catch((e) => { console.error('HATA:', String(e.message).slice(0, 500)); process.exit(1); });
