// Düello v4 · Son Düello sınırı + beraberlik (1102) — SQL provası. TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// İki maç (tek seferlik duman testi; döngü/yük yok): iki oyuncu HEP DOĞRU, sonra HEP YANLIŞ cevaplar → kontrol hiç el
// değiştirmez, nötr döngüsü 20. soruda Son Düello'ya döner, 10 Son Düello sorusunda da tek bilen çıkmaz → maç 29. soruda
// BERABERE biter (sonsuz döngü yok). Ödül: iki oyuncu galibiyet ödülünün yarısını alır (coin, XP, SP, dereceli lig).
// Oyuncular işlem içinde açılan geçici hesaplardır (auth.users → profiles tetikleyicisi); cevaplar satıra doğrudan yazılır,
// fazlar sunucunun kendi fonksiyonlarıyla (duello4_cozumle / duello4_sonraki) ilerler.
// Migration canlıda değilse işlem içinde uygulanır.
// Kullanım: IZIN_CANLI_TEST=1 node araclar/duello-son-beraberlik-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';

const MIG = new URL('../supabase/migrations/20260612001102_duello_son_sinir_beraberlik.sql', import.meta.url);
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tek = (s) => db.tek(s);
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const bekci = setTimeout(async () => {
  console.error('⏱ süre aşıldı — ROLLBACK + kapat');
  try { await db.sorgu('rollback'); } catch { /* */ }
  await db.kapat(); process.exit(3);
}, 5 * 60 * 1000);

async function oyuncu(ad) {
  const id = crypto.randomUUID();
  await db.sorgu(`insert into auth.users (id) values ('${id}')`);
  await db.sorgu(`update profiles set username = 'sb_${ad}_${id.slice(0, 6)}', takma_ad = 'sb_${ad}_${id.slice(0, 6)}' where id = '${id}'`);
  return id;
}

async function mac(ad, dogru) {
  console.log(`\n${ad}`);
  const A = await oyuncu('a'), B = await oyuncu('b');
  const id = await tek(`select duello_olustur('${A}', '${B}', true, null)`);
  ok('maç v4 açıldı', (await tek(`select surum::text from duellolar where id = '${id}'`)) === '4');
  ok('Son Düello sınırı maça sabitlendi (10)', (await tek(`select v4_son_max::text from duellolar where id = '${id}'`)) === '10');
  await db.sorgu(`update duellolar set ekran1 = now(), ekran2 = now() where id = '${id}'`);
  await db.sorgu(`select duello4_ilerlet('${id}')`);
  let adim = 0, ilkSon = null;
  for (; adim < 60; adim++) {
    const s = (await db.sorgu(`select durum, faz, v4_soru_no::int no, v4_son::text son, soru_id1, soru_id2 from duellolar where id = '${id}'`))[0];
    if (s.durum !== 'aktif') break;
    if (s.faz === 'sonuc') { await db.sorgu(`select duello4_sonraki('${id}')`); continue; }
    if (!['notr', 'son'].includes(s.faz)) { ok('beklenmeyen faz', false, s.faz); break; }
    if (s.faz === 'son' && ilkSon === null) ilkSon = Number(s.no);
    const dc1 = Number(await tek(`select dogru_cevap from questions where id = '${s.soru_id1}'`));
    const dc2 = Number(await tek(`select dogru_cevap from questions where id = '${s.soru_id2}'`));
    const c1 = dogru ? dc1 : (dc1 + 1) % 4, c2 = dogru ? dc2 : (dc2 + 1) % 4;
    await db.sorgu(`update duellolar set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap', ${c1}), '${B}', jsonb_build_object('cevap', ${c2})) where id = '${id}'`);
    await db.sorgu(`select duello4_cozumle('${id}')`);
  }
  const s = (await db.sorgu(`select durum, kazanan, v4_berabere::text berabere, v4_soru_no::int no,
      (select count(*) from duello_hamleler h where h.duello_id = d.id)::int hamle,
      (select count(*) from duello_hamleler h where h.duello_id = d.id and h.uzatma)::int son
    from duellolar d where id = '${id}'`))[0];
  ok('maç bitti (sonsuz döngü yok)', s.durum === 'bitti', `durum=${s.durum} adım=${adim}`);
  ok('kazanan yok, berabere', s.kazanan === null && s.berabere === 'true', `kazanan=${s.kazanan} berabere=${s.berabere}`);
  ok('Son Düello 20. soruda başladı', ilkSon === 20, `ilk=${ilkSon}`);
  ok('son soru 29 (10 Son Düello sorusu), 30. soru açılmadı', Number(s.no) === 29 && Number(s.son) === 10 && Number(s.hamle) === 29,
    `no=${s.no} son=${s.son} hamle=${s.hamle}`);
  for (const [ad2, u] of [['A', A], ['B', B]]) {
    const coin = Number(await tek(`select coalesce(sum(miktar), 0)::text from coin_hareketleri where user_id = '${u}' and tur = 'mac' and referans = 'duello:${id}'`));
    const xp = Number(await tek(`select coalesce(sum(xp), 0)::text from xp_hareketleri where user_id = '${u}' and kaynak = 'duello:${id}'`));
    const sp = Number(await tek(`select coalesce(sum(miktar), 0)::text from sezon_puan_hareketleri where user_id = '${u}' and referans = 'duello:${id}'`));
    const lig = Number(await tek(`select coalesce(sum(lig), 0)::text from odul_kalemleri where user_id = '${u}' and kaynak = 'duello:${id}' and kalem = 'beraberlik'`));
    const sezonAcik = (await tek(`select count(*)::text from sezon_puan_hareketleri where referans = 'duello:${id}'`)) !== '0';
    console.log(`    ${ad2}: coin ${coin} · XP ${xp} · SP ${sp}${sezonAcik ? '' : ' (sezon kapalı → SP yok)'} · lig ${lig}`);
    ok(`${ad2} coin = galibiyetin yarısı (22)`, coin === 22, coin);
    ok(`${ad2} XP = galibiyetin yarısı (22)`, xp === 22, xp);
    ok(`${ad2} lig = galibiyetin yarısı (12)`, lig === 12, lig);
    if (sezonAcik) ok(`${ad2} SP = galibiyetin yarısı (10)`, sp === 10, sp);
  }
  // durum() berabere + lig bilgisini istemciye verir
  await db.sorgu(`select set_config('request.jwt.claim.sub', '${A}', true), set_config('request.jwt.claims', '{"sub":"${A}","role":"authenticated"}', true)`);
  const d = JSON.parse(await tek(`select duello4_durum('${id}')::text`));
  ok('durum: v4.berabere + son_max + odul.lig_puan', d.v4?.berabere === true && d.v4?.son_max === 10 && d.odul?.lig_puan === 12,
    JSON.stringify({ b: d.v4?.berabere, m: d.v4?.son_max, o: d.odul }));
}

try {
  await db.sorgu("set application_name = 'duello-son-beraberlik-sql-testi'");
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '60s'");
  const canli = (await tek(`select count(*)::text from information_schema.columns where table_name = 'duellolar' and column_name = 'v4_berabere'`)) === '1';
  console.log(`1102 canlıda: ${canli ? 'EVET' : 'hayır (işlem içinde uygulanıyor)'}`);
  if (!canli) await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  await mac('1) İki oyuncu HEP DOĞRU', true);
  await mac('2) İki oyuncu HEP YANLIŞ', false);
} catch (e) {
  kaldi++; console.error('HATA:', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* */ }
  clearTimeout(bekci);
  await db.kapat();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı (ROLLBACK)`);
  process.exitCode = kaldi ? 1 : 0;
}
