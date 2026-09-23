// Paket 3 — bir partinin sorular.json'unu TEK migration dosyasına yazar.
// araclar/soru-parti-1000/uret-migration.mjs ile aynı mantık (o dosya DEĞİŞTİRİLMEZ):
//   on conflict (soru) do nothing · zorluk yazılır · EN question_translations ·
//   çevrilmeyenler ceviri_atlanan ('cevrilemez') · sonda YALNIZ bu işlemin satırları
//   (created_at >= transaction_timestamp()) TR+EN aynı permütasyonla karışır.
// Veritabanına YAZMAZ; salt-okuma kapı kontrolü yapar.
//
// Kapılar (biri takılırsa dosya YAZILMAZ):
//   1) Biçim + şık denge, JS aynası (kural.mjs)
//   2) KESİN kapı: veritabanındaki soru_kural_isaretleri() (soru_denetim/kapi.mjs)
//   3) Havuzda birebir aynı soru metni (UNIQUE) → partiden çıkarılır ve raporlanır
//
// Kullanım: node araclar/soru-uretim/uret-migration-parti.mjs --parti 1 --no 291 [--kontrol]
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from '../pg-mini.mjs';
import { hamKapiSorgusu } from '../soru_denetim/kapi.mjs';
import { kuralIsaretleri, agirIsaretler } from '../soru-parti-1000/kural.mjs';
import { KATEGORILER } from '../soru-parti-1000/denetle.mjs';

const arg = (ad) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : null; };
const parti = Number(arg('--parti'));
const no = Number(arg('--no'));
const kontrol = process.argv.includes('--kontrol');
if (!Number.isInteger(parti) || !Number.isInteger(no)) {
  console.error('Kullanım: uret-migration-parti.mjs --parti N --no NNN [--kontrol]');
  process.exit(1);
}
const pp = String(parti).padStart(2, '0');
const GIRDI = new URL(`./parti-${pp}/sorular.json`, import.meta.url);
const DOSYA = `2026061200${String(no).padStart(4, '0')}_soru_uretim_parti_${pp}.sql`;
const HEDEF = new URL(`../../supabase/migrations/${DOSYA}`, import.meta.url);

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const jsonLit = (a) => `${lit(JSON.stringify(a))}::jsonb`;

function bicimHatasi(t, i) {
  const h = [];
  if (!KATEGORILER.includes(t.k)) h.push('kategori');
  if (typeof t.s !== 'string' || !t.s.trim()) h.push('soru');
  if (!Array.isArray(t.y) || t.y.length !== 3) h.push('şık sayısı');
  if (!(Number.isInteger(t.zorluk) && t.zorluk >= 1 && t.zorluk <= 5)) h.push('zorluk');
  if (t.en && (!t.en.s || !t.en.d || t.en.y?.length !== 3)) h.push('en biçimi');
  if (!t.en && !t.en_neden) h.push('en_neden');
  const agir = agirIsaretler(kuralIsaretleri(t.s, [t.d, ...(t.y ?? [])], 0));
  if (agir.length) h.push(`kural:${agir.join(',')}`);
  return h.length ? `#${i} ${t.s} → ${h.join(' · ')}` : null;
}

function sql(kayitlar) {
  const say = {};
  for (const t of kayitlar) say[t.k] = (say[t.k] || 0) + 1;
  const yerel = kayitlar.filter((t) => t.yerel).length;
  const cevrilmez = kayitlar.filter((t) => !t.en);
  const ceviri = kayitlar.filter((t) => t.en);
  const zd = [1, 2, 3, 4, 5].map((z) => kayitlar.filter((t) => t.zorluk === z).length);
  const satir = (t) => `(${lit(t.s)}, ${jsonLit([t.d, ...t.y])}, 0, ${lit(t.k)}, ${t.yerel ? "'yerel', 'TR'" : "'global', null"}, ${t.zorluk})`;
  return `-- ============================================================
-- ${String(no).padStart(3, '0')} — Paket 3 soru üretimi, parti ${parti}: ${kayitlar.length} soru · ${new Date().toISOString().slice(0, 10)}
--
-- Kategori: ${Object.entries(say).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}
-- Yerel (kapsam='yerel', ulke='TR'): ${yerel} · zorluk 1–5: ${zd.join('/')}
-- İngilizce çeviri: ${ceviri.length} · çevrilmeyen (ceviri_atlanan, kod 'cevrilemez'): ${cevrilmez.length}
--
-- Kalite: her soru Jev kapısından geçti (doğru cevap verilmeden, şıklar karıştırılarak;
-- Jev >0,9 güvenle başka şık diyen soru elendi ya da düzeltilip yeniden soruldu), şık
-- denge kapısı (soru_kural_isaretleri, ağırlık ≥ 2) veritabanında doğrulandı, havuzla
-- birebir ve anlamca tekrar tarandı. Zorluk: yazar etiketi; Jev puanıyla açık çelişkide
-- düzeltildi (araclar/soru-uretim/birlestir-parti.mjs). İngilizce taraf da Jev'den geçti.
--
-- Sıra: sorular doğru şık 0'da eklenir, çeviriler aynı sırayla yazılır, sonunda YALNIZ
-- bu işlemde eklenen satırların şıkları karıştırılır — TR ve EN AYNI permütasyonla
-- (dogru_cevap indeksi ortak olduğu için şart). \`created_at >= transaction_timestamp()\`
-- koşulu ZORUNLUDUR; onsuz tüm havuz karışır ve oynanan maçlarda indeks kayar.
-- Üretici: node araclar/soru-uretim/uret-migration-parti.mjs --parti ${parti} --no ${no}
-- ============================================================

insert into public.questions (soru, secenekler, dogru_cevap, kategori, kapsam, ulke, zorluk) values
${kayitlar.map(satir).join(',\n')}
on conflict (soru) do nothing;

-- ---------------------------------------------------- İngilizce çeviri
insert into public.question_translations (question_id, dil, soru, secenekler)
select q.id, 'en', v.en_soru, v.en_secenekler
  from (values
${ceviri.map((t) => `  (${lit(t.s)}, ${lit(t.en.s)}, ${jsonLit([t.en.d, ...t.en.y])})`).join(',\n')}
  ) v(soru, en_soru, en_secenekler)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;
${cevrilmez.length ? `
-- ---------------------------------------------------- Çevrilmeyenler
insert into public.ceviri_atlanan (question_id, dil, neden, kod)
select q.id, 'en', v.neden, 'cevrilemez'
  from (values
${cevrilmez.map((t) => `  (${lit(t.s)}, ${lit(t.en_neden)})`).join(',\n')}
  ) v(soru, neden)
  join public.questions q on q.soru = v.soru and q.created_at >= transaction_timestamp()
on conflict (question_id, dil) do nothing;
` : ''}
-- ---------------------------------------------------- Karıştırma (TR + EN aynı permütasyon)
drop table if exists pg_temp._parti_karistir;
create temp table _parti_karistir as
select q.id, array_agg(s.idx order by s.rnd) as perm
  from public.questions q
  cross join lateral (
    select (ordinality - 1)::int as idx, random() as rnd
      from jsonb_array_elements(q.secenekler) with ordinality
  ) s
 where q.created_at >= transaction_timestamp()
 group by q.id;

update public.questions q
   set secenekler = (select jsonb_agg(q.secenekler -> u.p order by u.o)
                       from unnest(k.perm) with ordinality u(p, o)),
       dogru_cevap = (array_position(k.perm, q.dogru_cevap::int) - 1)::smallint
  from _parti_karistir k
 where q.id = k.id;

update public.question_translations t
   set secenekler = (select jsonb_agg(t.secenekler -> u.p order by u.o)
                       from unnest(k.perm) with ordinality u(p, o))
  from _parti_karistir k
 where t.question_id = k.id;

drop table if exists pg_temp._parti_karistir;
`;
}

async function main() {
  const sorular = JSON.parse(fs.readFileSync(GIRDI, 'utf8'));
  const bicim = sorular.map(bicimHatasi).filter(Boolean);
  if (bicim.length) {
    console.error(`KAPI 1 (biçim/kural) — ${bicim.length} soru takıldı:\n` + bicim.join('\n'));
    process.exit(1);
  }
  const db = await new PgIstemci(await baglantiDizgisi()).baglan();
  let takilan, cakisan;
  try {
    const kayit = sorular.map((t, i) => ({ anahtar: String(i), soru: t.s, secenekler: [t.d, ...t.y], dogru_cevap: 0 }));
    takilan = (await db.sorgu(hamKapiSorgusu(kayit))).filter((r) => r.agir);
    const metinler = `array[${sorular.map((t) => lit(t.s)).join(',')}]::text[]`;
    cakisan = (await db.sorgu(`select soru from public.questions where soru = any(${metinler})`)).map((r) => r.soru);
  } finally {
    await db.kapat();
  }
  if (takilan.length) {
    console.error(`KAPI 2 (veritabanı soru_kural_isaretleri) — ${takilan.length} soru takıldı:`);
    for (const r of takilan) console.error(`  #${r.anahtar} ${sorular[+r.anahtar].s} → ${r.agir}`);
    process.exit(1);
  }
  console.log(`Kapı 1 + 2: ${sorular.length} sorunun hepsi geçti · havuzla birebir çakışma: ${cakisan.length}`);
  for (const c of cakisan) console.log(`  çakışma: ${c}`);
  if (kontrol) return;
  const temiz = sorular.filter((t) => !cakisan.includes(t.s));
  fs.writeFileSync(HEDEF, sql(temiz));
  console.log(`Yazıldı: supabase/migrations/${DOSYA} (${temiz.length} soru)`);
}

main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
