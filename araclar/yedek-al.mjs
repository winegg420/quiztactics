// Canlı Supabase yedeği — YALNIZ OKUMA. Tek komut: node araclar/yedek-al.mjs
//
// Neden bu yolla: Windows'ta `pg_dump` ve Docker yok; `supabase db dump` Docker ister.
// Bu araç pg-mini ile (yeni paket yok) tek bir salt-okunur, tutarlı-görüntü (snapshot)
// işleminde şemayı katalogdan, veriyi satır satır NDJSON olarak alır.
//
// Çıktı (repo DIŞI): C:\Users\ida\Desktop\quiztactics-yedek\YYYY-MM-DD\
//   sema.sql            public şeması: tipler, tablolar, kısıtlar, indeksler, görünümler,
//                       fonksiyonlar, tetikleyiciler, RLS + policy'ler (public + storage), yetkiler, cron
//   veri/<sema.tablo>.ndjson   public, auth, storage (meta), cron, supabase_migrations verisi
//   storage/<kova>/<yol>       Storage dosyaları
//   manifest.json       sayılar (tablo satırı, fonksiyon, policy…) — geri yükleme karşılaştırması için
//
// İçerik loga YAZILMAZ; yalnız sayılar ve süreler. Yedek dosyaları kullanıcı verisi içerir.
// Parola: SUPABASE_DB_PASSWORD (.env.local) ya da SUPABASE_DB_URL ortam değişkeni.
// Storage'ın özel kovaları için isteğe bağlı SUPABASE_SERVICE_ROLE_KEY (.env.local / ortam).

import fs from 'node:fs';
import path from 'node:path';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const PROJE = 'etezccrifaetzrgfvawl';
const BUGUN = new Date().toISOString().slice(0, 10);
const KOK = process.env.YEDEK_KOK || 'C:\\Users\\ida\\Desktop\\quiztactics-yedek';
const HEDEF = path.join(KOK, BUGUN);
const VERI_SEMALARI = ['public', 'auth', 'storage', 'cron', 'supabase_migrations'];
const SAYFA = 2000;

const baslangic = Date.now();
const sn = () => ((Date.now() - baslangic) / 1000).toFixed(1) + ' sn';
const tirnak = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const sabit = (s) => (s === null || s === undefined ? 'null' : "'" + String(s).replace(/'/g, "''") + "'");
const kim = (sema, ad) => `${tirnak(sema)}.${tirnak(ad)}`;
const dizi = (t) => (t ? t.replace(/^\{|\}$/g, '').split(',').filter(Boolean) : []);

function envOku(anahtar) {
  if (process.env[anahtar]) return process.env[anahtar];
  for (const dosya of ['.env.local', '.env']) {
    try {
      const m = fs.readFileSync(new URL(`../${dosya}`, import.meta.url), 'utf8').match(new RegExp(`^${anahtar}=(.*)$`, 'm'));
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* dosya yok */ }
  }
  return null;
}

async function semaYaz(c, yaz) {
  const sayim = {};
  const bolum = (b) => yaz(`\n-- ===== ${b} =====\n`);

  yaz(`-- Quiz Tactics yedeği ${BUGUN} — proje ${PROJE} — yalnız public şeması + policy/cron.\n`);
  yaz('-- Geri yükleme: araclar/geri-yukle.mjs (bkz. docs/YEDEK.md).\n');

  bolum('Eklentiler');
  const ekl = await c.sorgu("select extname from pg_extension where extname not in ('plpgsql') order by 1");
  ekl.forEach((e) => yaz(`create extension if not exists ${tirnak(e.extname)};\n`));
  sayim.eklenti = ekl.length;

  bolum('Enum tipleri');
  const enumlar = await c.sorgu(`select t.typname, e.enumlabel from pg_type t join pg_enum e on e.enumtypid=t.oid
    join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' order by t.typname, e.enumsortorder`);
  const grup = new Map();
  enumlar.forEach((e) => grup.set(e.typname, [...(grup.get(e.typname) || []), e.enumlabel]));
  for (const [ad, etiket] of grup) {
    yaz(`do $$ begin create type public.${tirnak(ad)} as enum (${etiket.map(sabit).join(', ')}); exception when duplicate_object then null; end $$;\n`);
  }
  sayim.enum = grup.size;

  bolum('Dizilimler (sequence)');
  const diz = await c.sorgu("select sequencename, data_type from pg_sequences where schemaname='public' order by 1");
  diz.forEach((d) => yaz(`create sequence if not exists public.${tirnak(d.sequencename)} as ${d.data_type};\n`));
  sayim.dizilim = diz.length;

  bolum('Tablolar');
  const tablolar = await c.sorgu(`select c.oid::text oid, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not c.relispartition order by c.relname`);
  const kolonlar = await c.sorgu(`select a.attrelid::text oid, a.attname, format_type(a.atttypid,a.atttypmod) tip, a.attnotnull nn,
      a.attgenerated gen, a.attidentity kim, pg_get_expr(d.adbin,d.adrelid) varsayilan
    from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where n.nspname='public' and c.relkind in ('r','p') and a.attnum>0 and not a.attisdropped order by a.attrelid, a.attnum`);
  const kolonGrup = new Map();
  kolonlar.forEach((k) => kolonGrup.set(k.oid, [...(kolonGrup.get(k.oid) || []), k]));
  for (const t of tablolar) {
    const satirlar = (kolonGrup.get(t.oid) || []).map((k) => {
      let s = `  ${tirnak(k.attname)} ${k.tip}`;
      if (k.gen === 's') s += ` generated always as (${k.varsayilan}) stored`;
      else {
        if (k.kim === 'a') s += ' generated always as identity';
        else if (k.kim === 'd') s += ' generated by default as identity';
        else if (k.varsayilan !== null) s += ` default ${k.varsayilan}`;
        if (k.nn === 't') s += ' not null';
      }
      return s;
    });
    yaz(`create table if not exists ${kim('public', t.relname)} (\n${satirlar.join(',\n')}\n);\n`);
  }
  sayim.tablo = tablolar.length;

  bolum('Kısıtlar (birincil/benzersiz/kontrol; yabancı anahtarlar en sonda)');
  const kisit = await c.sorgu(`select c.relname, k.conname, k.contype, pg_get_constraintdef(k.oid) tanim
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and k.contype in ('p','u','c','x','f') and c.relkind in ('r','p') order by k.contype='f', c.relname, k.conname`);
  const fk = [];
  for (const k of kisit) {
    const sql = `alter table ${kim('public', k.relname)} add constraint ${tirnak(k.conname)} ${k.tanim};\n`;
    if (k.contype === 'f') fk.push(sql);
    else yaz(`do $$ begin ${sql.trim()} exception when duplicate_object or duplicate_table then null; end $$;\n`);
  }
  bolum('Yabancı anahtarlar');
  fk.forEach((s) => yaz(`do $$ begin ${s.trim()} exception when duplicate_object then null; end $$;\n`));
  sayim.kisit = kisit.length;

  bolum('İndeksler (kısıtlardan gelmeyenler)');
  const idx = await c.sorgu(`select i.indexdef from pg_indexes i
    where i.schemaname='public' and not exists (select 1 from pg_constraint k where k.conname=i.indexname) order by i.indexname`);
  idx.forEach((i) => yaz(i.indexdef.replace(/^CREATE (UNIQUE )?INDEX/, 'CREATE $1INDEX IF NOT EXISTS') + ';\n'));
  sayim.indeks = idx.length;

  bolum('Fonksiyonlar');
  const fon = await c.sorgu(`select pg_get_functiondef(p.oid) tanim from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind in ('f','p')
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') order by p.proname, p.oid`);
  fon.forEach((f) => yaz(f.tanim + ';\n\n'));
  sayim.fonksiyon = fon.length;

  bolum('Görünümler');
  const gor = await c.sorgu(`select c.relname, c.relkind, pg_get_viewdef(c.oid) tanim from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m') order by c.relname`);
  gor.forEach((g) => yaz(`create or replace ${g.relkind === 'm' ? 'materialized view' : 'view'} ${kim('public', g.relname)} as ${g.tanim}\n`));
  sayim.gorunum = gor.length;

  bolum('Tetikleyiciler');
  const tet = await c.sorgu(`select pg_get_triggerdef(t.oid) tanim from pg_trigger t join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname, t.tgname`);
  tet.forEach((t) => yaz(t.tanim.replace(/^CREATE (CONSTRAINT )?TRIGGER/, 'CREATE $1TRIGGER') + ';\n'));
  sayim.tetikleyici = tet.length;

  bolum('RLS');
  const rls = await c.sorgu(`select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c
    join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage') and c.relkind in ('r','p') and c.relrowsecurity`);
  rls.forEach((r) => {
    yaz(`alter table ${kim(r.nspname, r.relname)} enable row level security;\n`);
    if (r.relforcerowsecurity === 't') yaz(`alter table ${kim(r.nspname, r.relname)} force row level security;\n`);
  });
  sayim.rls_tablo = rls.length;

  bolum('Policy (public + storage)');
  const pol = await c.sorgu(`select schemaname, tablename, policyname, permissive, roles::text roller, cmd, qual, with_check
    from pg_policies where schemaname in ('public','storage') order by schemaname, tablename, policyname`);
  pol.forEach((p) => {
    let s = `drop policy if exists ${tirnak(p.policyname)} on ${kim(p.schemaname, p.tablename)};\n`;
    s += `create policy ${tirnak(p.policyname)} on ${kim(p.schemaname, p.tablename)} as ${p.permissive.toLowerCase()} for ${p.cmd.toLowerCase()}`;
    const roller = dizi(p.roller);
    if (roller.length) s += ` to ${roller.join(', ')}`;
    if (p.qual) s += ` using (${p.qual})`;
    if (p.with_check) s += ` with check (${p.with_check})`;
    yaz(s + ';\n');
  });
  sayim.policy = pol.length;

  bolum('Yetkiler (anon / authenticated / service_role)');
  const yet = await c.sorgu(`select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) y
    from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role')
    group by table_name, grantee order by 1,2`);
  yet.forEach((y) => yaz(`grant ${y.y} on ${kim('public', y.table_name)} to ${y.grantee};\n`));
  const fyet = await c.sorgu(`select routine_name, specific_name, grantee from information_schema.routine_privileges
    where routine_schema='public' and grantee in ('anon','authenticated','service_role') and privilege_type='EXECUTE' order by 1,3`);
  // Aşırı yüklü fonksiyonlarda adı tek başına vermek belirsiz olabilir; geri yükleme araçları hatayı yutar ve sayar.
  fyet.forEach((y) => yaz(`do $$ begin execute 'grant execute on function public.${tirnak(y.routine_name)} to ${y.grantee}'; exception when others then null; end $$;\n`));
  sayim.yetki = yet.length + fyet.length;

  bolum('Cron işleri');
  const cron = await c.sorgu('select jobname, schedule, command, active from cron.job order by jobid');
  cron.forEach((j) => {
    const ad = j.jobname ? sabit(j.jobname) : 'null';
    yaz(`select cron.schedule(${ad}, ${sabit(j.schedule)}, $cmd$${j.command}$cmd$);${j.active === 'f' ? ` -- pasif: cron.alter_job ile kapat` : ''}\n`);
  });
  sayim.cron = cron.length;

  bolum('Dizilim değerleri');
  const sv = await c.sorgu("select sequencename, last_value from pg_sequences where schemaname='public' and last_value is not null order by 1");
  sv.forEach((s) => yaz(`select setval('public.${tirnak(s.sequencename)}', ${Number(s.last_value)}, true);\n`));

  return sayim;
}

async function veriAl(c, klasor) {
  const tablolar = await c.sorgu(`select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in (${VERI_SEMALARI.map(sabit).join(',')}) and c.relkind in ('r','p') and not c.relispartition
    order by 1,2`);
  const satirSayilari = {};
  for (const t of tablolar) {
    const ad = `${t.nspname}.${t.relname}`;
    const dosya = fs.createWriteStream(path.join(klasor, `${ad}.ndjson`));
    let adet = 0;
    try {
      await c.sorgu(`declare yedek_imlec no scroll cursor for select row_to_json(t)::text as j from ${kim(t.nspname, t.relname)} t`);
      for (;;) {
        const r = await c.sorgu(`fetch ${SAYFA} from yedek_imlec`);
        if (!r.length) break;
        dosya.write(r.map((x) => x.j).join('\n') + '\n');
        adet += r.length;
      }
    } catch (e) {
      console.error(`  ! ${ad} alınamadı: ${e.message}`);
      satirSayilari[ad] = -1;
      await c.sorgu('close yedek_imlec').catch(() => {});
      await new Promise((r) => dosya.end(r));
      continue;
    }
    await c.sorgu('close yedek_imlec');
    await new Promise((r) => dosya.end(r));
    satirSayilari[ad] = adet;
  }
  return satirSayilari;
}

async function storageAl(c, klasor) {
  const kovalar = await c.sorgu('select id, public from storage.buckets order by id');
  const anahtar = envOku('SUPABASE_SERVICE_ROLE_KEY');
  const nesneler = await c.sorgu('select bucket_id, name from storage.objects where name is not null order by 1,2');
  const sonuc = { kova: kovalar.length, nesne: nesneler.length, indirilen: 0, atlanan_ozel: 0, hata: 0, bayt: 0 };
  const herkeseAcik = new Set(kovalar.filter((k) => k.public === 't').map((k) => k.id));
  const taban = `https://${PROJE}.supabase.co/storage/v1/object`;

  const indir = async (n) => {
    const acik = herkeseAcik.has(n.bucket_id);
    if (!acik && !anahtar) { sonuc.atlanan_ozel++; return; }
    const yol = n.name.split('/').map(encodeURIComponent).join('/');
    const url = acik ? `${taban}/public/${encodeURIComponent(n.bucket_id)}/${yol}` : `${taban}/${encodeURIComponent(n.bucket_id)}/${yol}`;
    try {
      const yanit = await fetch(url, acik ? {} : { headers: { Authorization: `Bearer ${anahtar}`, apikey: anahtar } });
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
      const veri = Buffer.from(await yanit.arrayBuffer());
      const hedef = path.join(klasor, n.bucket_id, ...n.name.split('/'));
      fs.mkdirSync(path.dirname(hedef), { recursive: true });
      fs.writeFileSync(hedef, veri);
      sonuc.indirilen++;
      sonuc.bayt += veri.length;
    } catch (e) {
      sonuc.hata++;
      console.error(`  ! storage ${n.bucket_id}: ${e.message}`);
    }
  };
  // Storage uç noktası veritabanına yük bindirmez; yine de 4'lü paralel ile sınırlı.
  const kuyruk = [...nesneler];
  await Promise.all(Array.from({ length: 4 }, async () => { for (let n; (n = kuyruk.shift());) await indir(n); }));
  return sonuc;
}

function boyut(klasor) {
  let t = 0;
  for (const e of fs.readdirSync(klasor, { withFileTypes: true })) {
    const p = path.join(klasor, e.name);
    t += e.isDirectory() ? boyut(p) : fs.statSync(p).size;
  }
  return t;
}

async function ana() {
  const dizgi = await baglantiDizgisi();
  if (!dizgi) {
    console.error('Veritabanı parolası bulunamadı: .env.local içine SUPABASE_DB_PASSWORD ekle (ya da SUPABASE_DB_URL ver). Parola dosyaya/loga yazılmaz.');
    process.exit(2);
  }
  if (!dizgi.includes(PROJE) && !/127\.0\.0\.1|localhost/.test(dizgi)) {
    console.error(`Bağlantı ${PROJE} projesini göstermiyor — durduruldu.`);
    process.exit(2);
  }
  fs.mkdirSync(path.join(HEDEF, 'veri'), { recursive: true });
  const c = new PgIstemci(dizgi);
  await c.baglan();
  try {
    await c.sorgu('begin isolation level repeatable read read only');
    const semaDosya = fs.createWriteStream(path.join(HEDEF, 'sema.sql'));
    const sayim = await semaYaz(c, (s) => semaDosya.write(s));
    await new Promise((r) => semaDosya.end(r));
    console.log(`şema tamam (${sn()})`);

    const satirlar = await veriAl(c, path.join(HEDEF, 'veri'));
    await c.sorgu('commit');
    console.log(`veri tamam: ${Object.keys(satirlar).length} tablo (${sn()})`);

    const storage = await storageAl(c, path.join(HEDEF, 'storage'));
    console.log(`storage: ${storage.indirilen}/${storage.nesne} dosya, özel kova nedeniyle atlanan ${storage.atlanan_ozel}, hata ${storage.hata}`);

    const toplam = boyut(HEDEF);
    const manifest = { tarih: new Date().toISOString(), proje: PROJE, sure_sn: Math.round((Date.now() - baslangic) / 1000), bayt: toplam, sema: sayim, tablo_satirlari: satirlar, storage };
    fs.writeFileSync(path.join(HEDEF, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`bitti: ${(toplam / 1048576).toFixed(1)} MB, ${sn()} → ${HEDEF}`);
    if (Object.values(satirlar).includes(-1) || storage.hata) process.exitCode = 1;
  } catch (e) {
    console.error('Yedek alınamadı:', e.message);
    process.exitCode = 1;
  } finally {
    await c.kapat();
  }
}

ana();
