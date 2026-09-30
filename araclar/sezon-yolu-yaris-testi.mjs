// Sezon Yolu yarış durumu testi — İKİ AYRI bağlantı aynı anda: çift BP satın alma, çift ödül alımı, aynı SP kaynağı.
// Sahibin test sezonunda çalışır (sistem kapalıyken tek geçerli yol; yetki değişikliği yok). Sonunda
// sezon_sahip_test_sifirla ile BP elması iade edilir, test sezonu kayıtları silinir. Kalan tek iz: L1 ücretsiz ödülü (50 coin).
// Kullanım: node araclar/sezon-yolu-yaris-testi.mjs
// TEST_KULLANICI=<uuid> verilirse SAHİP DEĞİL, o test hesabıyla ve GERÇEK (açık) sezonda çalışır; sezon_sahip_* yerine
// sunucu içi sezon_puani_ekle kullanılır, sahip hesaba dokunulmaz. Hesabı ve izlerini çağıran siler.
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const TEST = process.env.TEST_KULLANICI;
const SAHIP = TEST || 'e4f6006f-d6bb-4ca8-be67-3bdf9efc9708';
const dizgi = await baglantiDizgisi();
const [d1, d2] = [await new PgIstemci(dizgi).baglan(), await new PgIstemci(dizgi).baglan()];
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = '') => { if (k) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const kimlik = (d) => d.sorgu(`select set_config('request.jwt.claim.sub','${SAHIP}',false), set_config('request.jwt.claims','{"sub":"${SAHIP}","role":"authenticated"}',false)`);
const dene = async (d, sql) => { try { await d.sorgu('begin'); const r = await d.tek(sql); await d.sorgu('commit'); return { ok: r }; } catch (e) { try { await d.sorgu('rollback'); } catch {} return { hata: e.message }; } };
try {
  await kimlik(d1); await kimlik(d2);
  if (!TEST) await dene(d1, 'select sezon_sahip_test_sifirla()');
  const elmas0 = Number(await d1.tek(`select elmas from profiles where id='${SAHIP}'`));
  const coin0 = Number(await d1.tek(`select coin from profiles where id='${SAHIP}'`));
  const [a, b] = await Promise.all([dene(d1, 'select bp_satin_al()'), dene(d2, 'select bp_satin_al()')]);
  const basari = [a, b].filter((x) => x.ok).length;
  ok('aynı anda iki satın alma: tam biri başarılı', basari === 1, JSON.stringify([a, b]).slice(0, 300));
  ok('diğeri "zaten sende"', [a, b].some((x) => /zaten sende/.test(x.hata ?? '')));
  ok('elmas bir kez düştü (−500)', Number(await d1.tek(`select elmas from profiles where id='${SAHIP}'`)) === elmas0 - 500);
  const sezon = await d1.tek(`select id from sezonlar where test = ${TEST ? 'false' : 'true'} and kapandi_at is null`);
  ok('tek sahiplik satırı', await d1.tek(`select count(*) from oyuncu_bp_sahipligi where user_id='${SAHIP}' and sezon=${sezon}`) === '1');
  await dene(d1, TEST ? `select sezon_puani_ekle('${SAHIP}','gorev','yaris:hazirlik',100)` : 'select sezon_sahip_sp_ekle(100)');
  const [c, e] = await Promise.all([dene(d1, "select bp_odul_al(1,'ucretsiz')"), dene(d2, "select bp_odul_al(1,'ucretsiz')")]);
  ok('aynı anda iki ödül alımı: tam biri başarılı', [c, e].filter((x) => x.ok).length === 1, JSON.stringify([c, e]).slice(0, 300));
  ok('coin bir kez eklendi (+50)', Number(await d1.tek(`select coin from profiles where id='${SAHIP}'`)) === coin0 + 50);
  const [f, g] = await Promise.all([
    dene(d1, `select sezon_puani_ekle('${SAHIP}','turnuva','yaris:1',15)`),
    dene(d2, `select sezon_puani_ekle('${SAHIP}','turnuva','yaris:1',15)`)]);
  ok('aynı SP kaynağı aynı anda: bir kez sayıldı', await d1.tek(`select count(*) from sezon_puan_hareketleri where user_id='${SAHIP}' and referans='yaris:1'`) === '1'
     && [f, g].filter((x) => x.ok && x.ok !== null).length === 1, JSON.stringify([f, g]));
} finally {
  const r = TEST ? { ok: 'test hesabı dışarıdan silinecek' } : await dene(d1, 'select sezon_sahip_test_sifirla()');
  console.log('temizlik:', r.ok ?? r.hata);
  await d1.kapat(); await d2.kapat();
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
