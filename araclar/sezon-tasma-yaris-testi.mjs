// Sezon Yolu taşma ödülü YARIŞ testi — İKİ AYRI bağlantı aynı anda aynı taşma ödülünü verir (commit gerekir, o yüzden
// ROLLBACK'li değil). Bayrak açılmaz, sahibin hesabına/test sezonuna dokunulmaz: geçici KAPALI bir sezon satırı (no 990001) ve
// insan test hesabı A için geçici SP satırı yaratılır; iç fonksiyon `bp_tasma_ver_ic` doğrudan çağrılır (PK + tekil coin indeksi
// katmanı). Sonunda her şey silinir, A'nın coin bakiyesi ve defteri eski hâline döner.
// Not: `bp_tasma_al` aynı oyuncu-SP-satırı FOR UPDATE kilidini `bp_odul_al` ile aynı düzende alır; onun uçtan uca yarışı yalnız
// bayrak açıkken (ya da sahibin test sezonunda) sınanabilir — ikisi de bu teste sokulmadı.
// Kullanım: node araclar/sezon-tasma-yaris-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
const A = '5b555bd3-9371-4f35-90a5-39289111335e';
const dizgi = await baglantiDizgisi();
const [d1, d2, yon] = [await new PgIstemci(dizgi).baglan(), await new PgIstemci(dizgi).baglan(), await new PgIstemci(dizgi).baglan()];
let gecti = 0, kaldi = 0;
const ok = (ad, k, ek = '') => { if (k) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const dene = async (d, sql) => { try { await d.sorgu('begin'); const r = await d.tek(sql); await d.sorgu('commit'); return { ok: r }; } catch (e) { try { await d.sorgu('rollback'); } catch {} return { hata: e.message }; } };
let sezon = null;
const coinOnce = Number(await yon.tek(`select coin from profiles where id='${A}'`));
const hareketOnce = await yon.tek(`select count(*) from coin_hareketleri where user_id='${A}'`);
try {
  sezon = await yon.tek(`insert into sezonlar (no, test, baslangic, bitis, kapandi_at) values (990001, false, now() - interval '30 days', now() - interval '2 days', now() - interval '1 day') returning id`);
  await yon.sorgu(`insert into oyuncu_sezon_puani (sezon, user_id, sp, seviye) values (${sezon}, '${A}', 3000, 28)`);
  const [a, b] = await Promise.all([dene(d1, `select bp_tasma_ver_ic('${A}', ${sezon}, 1, 'ucretsiz')::text`), dene(d2, `select bp_tasma_ver_ic('${A}', ${sezon}, 1, 'ucretsiz')::text`)]);
  ok('iki bağlantı aynı anda: hata yok', !a.hata && !b.hata, JSON.stringify([a, b]));
  ok('tam biri ödülü verdi, diğeri null', [a, b].filter((x) => x.ok && x.ok !== '').length === 1, JSON.stringify([a, b]));
  ok('tek alım kaydı', await yon.tek(`select count(*) from oyuncu_bp_tasma_alimi where sezon=${sezon} and user_id='${A}'`) === '1');
  ok('coin bir kez eklendi (+25), defterde tek satır', Number(await yon.tek(`select coin from profiles where id='${A}'`)) === coinOnce + 25
     && await yon.tek(`select count(*) from coin_hareketleri where user_id='${A}' and referans='sezon:${sezon}:tasma:1:ucretsiz'`) === '1');
  // dört bağlantı değil ama art arda 6 çift yarış: farklı n ve kol
  let hepsi = true;
  for (let n = 2; n <= 4; n++) for (const kol of ['ucretsiz', 'ucretli']) {
    const r = await Promise.all([dene(d1, `select bp_tasma_ver_ic('${A}', ${sezon}, ${n}, '${kol}')::text`), dene(d2, `select bp_tasma_ver_ic('${A}', ${sezon}, ${n}, '${kol}')::text`)]);
    if (r.filter((x) => x.ok && x.ok !== '').length !== 1) hepsi = false;
  }
  ok('6 çift yarış daha: her seferinde tek ödül', hepsi);
  ok('toplam kayıt 7, coin = 25 + 3×25 + 3×40 = 220', await yon.tek(`select count(*) from oyuncu_bp_tasma_alimi where sezon=${sezon}`) === '7'
     && Number(await yon.tek(`select coin from profiles where id='${A}'`)) === coinOnce + 220);
} finally {
  try {
    await yon.sorgu('begin');
    if (sezon) {
      await yon.sorgu(`delete from coin_hareketleri where user_id='${A}' and tur='sezon_yolu' and referans like 'sezon:${sezon}:%'`);
      await yon.sorgu(`select set_config('app.coin_izin','1',true)`);
      await yon.sorgu(`update profiles set coin = ${coinOnce} where id='${A}'`);
      await yon.sorgu(`delete from sezonlar where id=${sezon}`);          // alım + SP satırları cascade
    }
    await yon.sorgu('commit');
  } catch (e) { console.log('TEMİZLİK HATASI:', e.message); try { await yon.sorgu('rollback'); } catch {} }
  const k = `${Number(await yon.tek(`select coin from profiles where id='${A}'`)) === coinOnce}/${(await yon.tek(`select count(*) from coin_hareketleri where user_id='${A}'`)) === hareketOnce}/${await yon.tek(`select count(*) from sezonlar where no=990001`)}`;
  console.log('temizlik (coin aynı / defter aynı / geçici sezon sayısı):', k);
  ok('temizlik tam', k === 'true/true/0');
  await d1.kapat(); await d2.kapat(); await yon.kapat();
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
