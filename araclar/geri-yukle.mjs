// Yedeği YEREL Postgres'e yükler ve manifest ile satır sayılarını karşılaştırır.
// Kullanım: SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node araclar/geri-yukle.mjs <yedek-klasoru>
// Güvenlik: yalnız yerel adrese (127.0.0.1/localhost) bağlanır; canlıya ASLA yazmaz.
// Not: Docker/Postgres bulunmayan makinede çalıştırılamaz (bkz. docs/YEDEK.md).

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { PgIstemci, alintila } from './pg-mini.mjs';

const dizgi = process.env.SUPABASE_DB_URL;
const klasor = process.argv[2];
if (!dizgi || !klasor) { console.error('Kullanım: SUPABASE_DB_URL=<yerel> node araclar/geri-yukle.mjs <yedek-klasoru>'); process.exit(2); }
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(dizgi)) { console.error('Yalnız yerel veritabanına yüklenir; canlıya yazma engellendi.'); process.exit(2); }

const tirnak = (s) => '"' + s.replace(/"/g, '""') + '"';
const PARTI = 200;

async function ana() {
  const c = new PgIstemci(dizgi);
  await c.baglan();
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(klasor, 'manifest.json'), 'utf8'));
    await c.sorgu('set session_replication_role = replica'); // FK/tetikleyici sırası gerekmez
    // Şema: ifade ifade değil, tek blok — dosya "if not exists"/hata yutan bloklarla yazıldı.
    try { await c.sorgu(fs.readFileSync(path.join(klasor, 'sema.sql'), 'utf8')); }
    catch (e) { console.error('sema.sql uygulanırken hata (devam ediliyor):', e.message); }

    const sonuc = {};
    for (const [ad, beklenen] of Object.entries(manifest.tablo_satirlari)) {
      const [sema, tablo] = ad.split('.');
      const hedef = `${tirnak(sema)}.${tirnak(tablo)}`;
      const dosya = path.join(klasor, 'veri', `${ad}.ndjson`);
      if (!fs.existsSync(dosya) || beklenen <= 0) { sonuc[ad] = { beklenen, yuklenen: 0 }; continue; }
      try {
        // Üretilmiş (generated) kolonlara yazılamaz → yalnız attgenerated='' kolonlar yüklenir.
        const kolonlar = (await c.sorgu(`select attname from pg_attribute where attrelid='${hedef.replace(/'/g, "''")}'::regclass and attnum>0 and not attisdropped and attgenerated=''`)).map((r) => r.attname);
        if (!kolonlar.length) throw new Error('hedef tablo yok');
        const liste = kolonlar.map(tirnak).join(', ');
        let parti = [];
        let adet = 0;
        const yaz = async () => {
          if (!parti.length) return;
          const json = alintila('[' + parti.join(',') + ']');
          await c.sorgu(`insert into ${hedef} (${liste}) overriding system value select ${liste} from json_populate_recordset(null::${hedef}, ${json}::json) on conflict do nothing`);
          adet += parti.length;
          parti = [];
        };
        const rl = readline.createInterface({ input: fs.createReadStream(dosya, 'utf8'), crlfDelay: Infinity });
        for await (const satir of rl) { if (satir) { parti.push(satir); if (parti.length >= PARTI) await yaz(); } }
        await yaz();
        sonuc[ad] = { beklenen, yuklenen: adet };
      } catch (e) {
        sonuc[ad] = { beklenen, yuklenen: -1, hata: e.message };
      }
    }

    // Karşılaştırma: gerçekten hedefteki satır sayısı
    let fark = 0;
    for (const ad of Object.keys(sonuc)) {
      const [sema, tablo] = ad.split('.');
      try { sonuc[ad].hedefte = Number(await c.tek(`select count(*) from ${tirnak(sema)}.${tirnak(tablo)}`)); }
      catch { sonuc[ad].hedefte = null; }
      if (sonuc[ad].hedefte !== sonuc[ad].beklenen) { fark++; console.log(`FARK ${ad}: beklenen ${sonuc[ad].beklenen}, hedefte ${sonuc[ad].hedefte}${sonuc[ad].hata ? ' — ' + sonuc[ad].hata : ''}`); }
    }
    const nesne = {
      tablo: `select count(*) from pg_tables where schemaname='public'`,
      fonksiyon: `select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p') and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')`,
      policy: `select count(*) from pg_policies where schemaname in ('public','storage')`,
      tetikleyici: `select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal`,
    };
    for (const [ad, sql] of Object.entries(nesne)) {
      const hedefte = Number(await c.tek(sql));
      const beklenen = manifest.sema[ad];
      if (hedefte !== beklenen) { fark++; console.log(`FARK ${ad}: beklenen ${beklenen}, hedefte ${hedefte}`); }
    }
    console.log(fark === 0 ? 'TÜM SAYILAR EŞLEŞTİ' : `${fark} fark var`);
    process.exitCode = fark === 0 ? 0 : 1;
  } catch (e) {
    console.error('Geri yükleme başarısız:', e.message);
    process.exitCode = 1;
  } finally {
    await c.kapat();
  }
}

ana();
