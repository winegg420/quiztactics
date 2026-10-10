// Cevap İmzası (1040) — tek transaction, sonunda ROLLBACK (canlıya HİÇBİR ŞEY yazılmaz).
// Sınar: 5 kalem + nadirlik/para · fiyat ayardan · satış kapalıyken normal oyuncu alamaz/göremez · coin ile Nadir alım
// (yetersiz coin, çift alım reddi, coin_hareketleri) · elmas ile Epik/Efsanevi alım (yetersiz elmas) · takma/çıkarma
// (sahip olmayan takamaz, yanlış tür) · katalog takılı işareti · Koleksiyon Puanı nadirliğe göre · öteki türler bozulmadı
// · takılı imza başkasına açık değil (kolon yetkisi, oyuncu_kartlari) · yetkiler aynı.
// Kullanım: node araclar/cevap-imzasi-sql-testi.mjs  (migration canlıdaysa --canli: yeniden uygulamaz)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = 'supabase/migrations/20260612001040_cevap_imzasi.sql';
const CANLI = process.argv.includes('--canli');
let B = '', C = '';   // transaction içinde açılan geçici insan hesapları (ROLLBACK ile gider)

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (id) => db.sorgu(`select set_config('request.jwt.claim.sub', '${id}', true), set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true)`);
const kimse = () => db.sorgu(`select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true)`);
const tek = (s) => db.tek(s);
const dene = async (s) => {
  await db.sorgu('savepoint d');
  try { let r = await db.tek(s); await db.sorgu('release savepoint d'); if (typeof r === 'string' && r.startsWith('{')) r = JSON.parse(r); return { r }; }
  catch (e) { await db.sorgu('rollback to savepoint d'); return { hata: e.message }; }
};
const hizSifirla = () => db.sorgu(`delete from rpc_sayac where uc_adi in ('kozmetik_satin_al','kozmetik_tak')`);
const coin = async (u = B) => Number(await tek(`select coin from profiles where id='${u}'`));
const elmas = async (u = B) => Number(await tek(`select elmas from profiles where id='${u}'`));
const satis = (v) => db.sorgu(`update oyun_ayarlari set deger='${v}'::jsonb where anahtar='cevap_imzasi_satis_acik'`);
const para = async (u, c, e) => { await db.sorgu(`select set_config('app.coin_izin','1',true)`); await db.sorgu(`update profiles set coin=${c}, elmas=${e} where id='${u}'`); };
const sahip = (u, k) => tek(`select count(*) from oyuncu_kozmetikleri where user_id='${u}' and kozmetik='${k}'`);
const KALEMLER = ['imza_neon_tik', 'imza_yildiz', 'imza_ampul', 'imza_elektrik', 'imza_yanan_kart'];

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(`set local statement_timeout = '60s'`);
  const yetkiOnce = await tek(`select md5(string_agg(p.proname||coalesce(p.proacl::text,''), '|' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                               where n.nspname='public' and p.proname in ('kozmetik_satin_al','kozmetik_tak','kozmetik_katalogu','kozmetik_satista','kozmetik_fiyati')`);
  const zaferFiyatOnce = await tek(`select public.kozmetik_fiyati('zafer_efekti', null, null)`);
  const arkaFiyatOnce = await tek(`select public.kozmetik_fiyati('premium_aura', null, 'epik')`);
  if (!CANLI) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  for (const [deg, i] of [[B = await tek('select gen_random_uuid()::text'), 0], [C = await tek('select gen_random_uuid()::text'), 1]]) {
    await db.sorgu(`insert into auth.users (id) values ('${deg}')`);
    await db.sorgu(`update profiles set username = 'test_1040_${i}_${deg.slice(0, 8)}' where id = '${deg}'`);
  }
  ok('test hesapları insan + sahip değil', (await tek(`select count(*) from profiles where id in ('${B}','${C}') and not coalesce(is_bot,false)`)) === '2');

  console.log('— katalog ve fiyat');
  const satir = await db.sorgu(`select anahtar, nadirlik, dukkan_nadirlik, icerik->>'para' para, aktif, onay from kozmetikler where tur='cevap_imzasi' order by sira`);
  ok('5 kalem, sırayla', satir.map((x) => x.anahtar).join(',') === KALEMLER.join(','), JSON.stringify(satir));
  ok('nadirlik/para: nadir·coin ×2, epik·elmas ×2, efsanevi·elmas', satir.map((x) => `${x.nadirlik}/${x.dukkan_nadirlik}/${x.para}`).join(' ') ===
     'nadir/nadir/coin nadir/nadir/coin epik/epik/elmas epik/epik/elmas efsanevi/efsanevi/elmas');
  ok('hepsi aktif + girsin', satir.every((x) => x.aktif === 't' && x.onay === 'girsin'));
  const f = async (k) => Number(await tek(`select public.kozmetik_fiyati(tur, fiyat_elmas, dukkan_nadirlik) from kozmetikler where anahtar='${k}'`));
  ok('fiyat ayardan: 750 / 150 / 300', (await f('imza_yildiz')) === 750 && (await f('imza_elektrik')) === 150 && (await f('imza_yanan_kart')) === 300);
  await db.sorgu(`update oyun_ayarlari set deger='900'::jsonb where anahtar='coin_cevap_imzasi_nadir'`);
  ok('ayar değişince fiyat değişir (900)', (await f('imza_neon_tik')) === 900);
  await db.sorgu(`update oyun_ayarlari set deger='750'::jsonb where anahtar='coin_cevap_imzasi_nadir'`);
  ok('öteki türlerin fiyatı aynı (zafer, arka plan epik)', (await tek(`select public.kozmetik_fiyati('zafer_efekti', null, null)`)) === zaferFiyatOnce
     && (await tek(`select public.kozmetik_fiyati('premium_aura', null, 'epik')`)) === arkaFiyatOnce);

  console.log('— satış kapalı (varsayılan)');
  ok('bayrak varsayılan false', (await tek(`select deger::text from oyun_ayarlari where anahtar='cevap_imzasi_satis_acik'`)) === 'false');
  ok('kozmetik_satista false', (await tek(`select bool_or(public.kozmetik_satista(anahtar))::text from kozmetikler where tur='cevap_imzasi'`)) === 'false');
  await para(B, 10000, 10000);
  await ben(B);
  ok('normal oyuncunun kataloğunda imza yok', (await tek(`select count(*) from public.kozmetik_katalogu() where tur='cevap_imzasi'`)) === '0');
  let r = await dene(`select public.kozmetik_satin_al('imza_neon_tik')`);
  ok('kapalıyken alamaz: Bu kozmetik satılmıyor', /satılmıyor/.test(r.hata ?? ''), r.hata);
  r = await dene(`select public.kozmetik_tak('cevap_imzasi','imza_ampul')`);
  ok('sahip olmadığını takamaz', /sende yok/.test(r.hata ?? ''), r.hata);
  ok('kapalıyken coin düşmedi', (await coin()) === 10000);

  console.log('— satış açık: coin ile Nadir');
  await kimse(); await satis('true'); await hizSifirla();
  await para(B, 100, 0);
  await ben(B);
  ok('katalogda 5 imza, satilik', (await tek(`select count(*) from public.kozmetik_katalogu() where tur='cevap_imzasi' and satilik and not sahip`)) === '5');
  ok('katalog fiyat + para', (await tek(`select string_agg(fiyat::text||(icerik->>'para'), ',' order by sira) from public.kozmetik_katalogu() where tur='cevap_imzasi'`)) === '750coin,750coin,150elmas,150elmas,300elmas');
  r = await dene(`select public.kozmetik_satin_al('imza_neon_tik')`);
  ok('yetersiz coin hatası', /Yetersiz coin/.test(r.hata ?? ''), r.hata);
  ok('yetersizde sahiplik yok, coin aynı', (await sahip(B, 'imza_neon_tik')) === '0' && (await coin()) === 100);
  await kimse(); await para(B, 1000, 0); await ben(B);
  r = await dene(`select public.kozmetik_satin_al('imza_neon_tik')`);
  ok('coin ile alındı (para coin, fiyat 750, bakiye 250)', r.r?.para === 'coin' && r.r?.fiyat === 750 && Number(r.r?.bakiye) === 250, JSON.stringify(r));
  ok('coin 1000 → 250, elmas 0 aynı', (await coin()) === 250 && (await elmas()) === 0);
  ok('coin_hareketleri −750 · cevap_imzasi · imza_neon_tik', (await tek(`select count(*) from coin_hareketleri where user_id='${B}' and miktar=-750 and tur='cevap_imzasi' and referans='imza_neon_tik'`)) === '1');
  ok('sahiplik kaynak dukkan', (await tek(`select kaynak from oyuncu_kozmetikleri where user_id='${B}' and kozmetik='imza_neon_tik'`)) === 'dukkan');
  r = await dene(`select public.kozmetik_satin_al('imza_neon_tik')`);
  ok('çift alım reddi', /zaten sende/.test(r.hata ?? ''), r.hata);
  ok('çift alımda coin düşmedi', (await coin()) === 250);

  console.log('— elmas ile Epik / Efsanevi');
  await kimse(); await para(B, 5000, 100); await ben(B);
  r = await dene(`select public.kozmetik_satin_al('imza_ampul')`);
  ok('yetersiz elmas hatası (coin çok olsa da)', /Yetersiz elmas/.test(r.hata ?? ''), r.hata);
  ok('coin dokunulmadı', (await coin()) === 5000);
  await kimse(); await para(B, 5000, 500); await ben(B);
  r = await dene(`select public.kozmetik_satin_al('imza_ampul')`);
  ok('Epik elmasla (150)', r.r?.para === 'elmas' && r.r?.fiyat === 150 && Number(r.r?.bakiye) === 350, JSON.stringify(r));
  r = await dene(`select public.kozmetik_satin_al('imza_yanan_kart')`);
  ok('Efsanevi elmasla (300)', r.r?.para === 'elmas' && r.r?.fiyat === 300 && Number(r.r?.bakiye) === 50, JSON.stringify(r));
  ok('elmas_hareketleri 2 satır cevap_imzasi', (await tek(`select count(*) from elmas_hareketleri where user_id='${B}' and tur='cevap_imzasi'`)) === '2');
  ok('coin hâlâ 5000', (await coin()) === 5000);

  console.log('— takma / çıkarma');
  r = await dene(`select public.kozmetik_tak('cevap_imzasi','imza_ampul')`);
  ok('tak', r.r?.takili === 'imza_ampul', JSON.stringify(r));
  ok('profiles.takili_cevap_imzasi = imza_ampul', (await tek(`select takili_cevap_imzasi from profiles where id='${B}'`)) === 'imza_ampul');
  ok('profilim() takılıyı döndürür (yalnız kendi istemcim)', (await tek(`select public.profilim()->>'takili_cevap_imzasi'`)) === 'imza_ampul');
  ok('katalogda tek takılı', (await tek(`select string_agg(anahtar, ',') from public.kozmetik_katalogu() where tur='cevap_imzasi' and takili`)) === 'imza_ampul');
  r = await dene(`select public.kozmetik_tak('cevap_imzasi','imza_elektrik')`);
  ok('sahip olunmayan takılamaz', /sende yok/.test(r.hata ?? ''), r.hata);
  r = await dene(`select public.kozmetik_tak('zafer_efekti','imza_ampul')`);
  ok('yanlış tür reddi', /Böyle bir kozmetik yok/.test(r.hata ?? ''), r.hata);
  r = await dene(`select public.kozmetik_tak('cevap_imzasi','imza_yanan_kart')`);
  ok('başkasıyla değiştir', (await tek(`select takili_cevap_imzasi from profiles where id='${B}'`)) === 'imza_yanan_kart', r.hata);
  ok('öteki yuvalar etkilenmedi', (await tek(`select coalesce(takili_zafer_efekti,'')||coalesce(takili_premium_cerceve,'') from profiles where id='${B}'`)) === '');
  r = await dene(`select public.kozmetik_tak('cevap_imzasi', null)`);
  ok('çıkar', (await tek(`select coalesce(takili_cevap_imzasi,'YOK') from profiles where id='${B}'`)) === 'YOK', r.hata);
  await dene(`select public.kozmetik_tak('cevap_imzasi','imza_neon_tik')`);

  console.log('— rakip görmez');
  ok('takili_cevap_imzasi kolonu authenticated/anon için SEÇİLEMEZ', (await tek(`select count(*) from information_schema.column_privileges where table_name='profiles' and column_name='takili_cevap_imzasi' and grantee in ('anon','authenticated')`)) === '0');
  await ben(C);
  const kart = JSON.stringify(await db.sorgu(`select * from public.oyuncu_kartlari(array['${B}']::uuid[])`).catch((e) => ({ hata: e.message })));
  ok('oyuncu_kartlari (C bakar) imza içermez', !/imza_/.test(kart) && !/cevap_imzasi/.test(kart), kart.slice(0, 200));
  ok('C\'nin profilim()\'i kendi (null) imzasını döndürür', (await tek(`select coalesce(public.profilim()->>'takili_cevap_imzasi','YOK')`)) === 'YOK');

  console.log('— satış tekrar kapanınca');
  await kimse(); await satis('false'); await hizSifirla(); await ben(B);
  ok('sahip olunanlar katalogda kalır (2 + 1), satılmayan görünmez', (await tek(`select string_agg(anahtar, ',' order by sira) from public.kozmetik_katalogu() where tur='cevap_imzasi'`)) === 'imza_neon_tik,imza_ampul,imza_yanan_kart');
  ok('takılı kalır', (await tek(`select takili_cevap_imzasi from profiles where id='${B}'`)) === 'imza_neon_tik');
  r = await dene(`select public.kozmetik_satin_al('imza_yildiz')`);
  ok('kapalıyken yeni alım reddi', /satılmıyor/.test(r.hata ?? ''), r.hata);

  console.log('— Koleksiyon Puanı');
  await kimse();
  const ag = async (n) => Number(await tek(`select public.koleksiyon_agirlik('${n}')`));
  const beklenen = (await ag('nadir')) + (await ag('epik')) + (await ag('efsanevi'));
  const kalemPuan = Number(await tek(`select coalesce(sum(public.koleksiyon_agirlik(k.nadirlik)),0) from public.koleksiyon_kalemleri('${B}') k where k.anahtar like 'imza_%'`));
  ok(`imzalar nadirliğe göre sayılır (nadir+epik+efsanevi = ${beklenen})`, kalemPuan === beklenen && beklenen > 0, String(kalemPuan));
  const kayit = await tek(`select koleksiyon_puani from profiles where id='${B}'`);
  ok('tetikleyici profiles.koleksiyon_puani yazdı', Number(kayit) === Number(await tek(`select public.koleksiyon_puani_hesapla('${B}')`)), String(kayit));

  console.log('— yetkiler');
  const yetkiSonra = await tek(`select md5(string_agg(p.proname||coalesce(p.proacl::text,''), '|' order by p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                                where n.nspname='public' and p.proname in ('kozmetik_satin_al','kozmetik_tak','kozmetik_katalogu','kozmetik_satista','kozmetik_fiyati')`);
  ok('fonksiyon yetkileri değişmedi', yetkiOnce === yetkiSonra);
} catch (e) {
  kaldi++;
  console.error('HATA:', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch {}
  console.log(`\n${gecti} geçti · ${kaldi} kaldı (ROLLBACK — canlıya yazılmadı)`);
  process.exit(kaldi ? 1 : 0);
}
