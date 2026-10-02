// Düello Hâkimiyet bot kategori seçimi (681) provası — tek transaction, sonunda ROLLBACK.
// Kullanım: node araclar/duello-hakimiyet-bot-testi.mjs supabase/migrations/20260612000681_duello_hakimiyet_bot.sql
// Sınar: kilit · nakavt önceliği · kritik geri alma · normal %70 dağılımı · eski maç dalı · duello2_bot_tik.
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
try {
  await db.sorgu('begin');
  await db.sorgu("set local statement_timeout = '120s'");
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  const B = await tek(`select p.id from profiles p where p.is_bot and p.bot_turu = 'gizli' and coalesce(p.bot_aktif, true)
    order by p.bot_seviye_puan nulls last, p.id limit 1`);
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='jokerler_serbest'`);
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='duello_ban_acik'`);   // 853: ban ayrı sınanır (duello-ban-sql-testi); burada eski akış
  const K = await json(`select to_json(duello_kategorileri())::text`);
  ok('10 kategori', K.length === 10);
  ok('ayarlar eklendi (70 / 0.5)', (await tek(`select ayar_sayi('duello_bot_hamle_en_iyi_yuzde',0)||'/'||ayar_ondalik('duello_bot_pekistir_agirlik',0)`)) === '70/0.5');

  // Rakip (A) oranları: kategori başına farklı → beraberlik yok.
  const oran = Object.fromEntries(K.map((k, i) => [k, 10 + i * 8]));
  const bp = Object.fromEntries(await Promise.all(K.map(async (k) => [k, Number(await tek(`select bot_kategori_isabet('${B}','${k}')`))])));
  // 890: boş kategori (sahip yok) → p − (1 − p)·rakip; rakibin ('A') → p·(1 − rakip); kendi ('B') → × 0.5.
  const deger = (k, sahip) => sahip === undefined ? bp[k] - (1 - bp[k]) * oran[k] / 100
    : bp[k] * (1 - oran[k] / 100) * (sahip === 'B' ? 0.5 : 1);

  const yeniMac = async () => {
    const id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
    await db.sorgu(`update duellolar set oyuncu1=oyuncu2, oyuncu2=oyuncu1, profil1=profil2, profil2=profil1 where id='${id}' and oyuncu1<>'${A}'`);
    // Bot = oyuncu2 (A oyuncu1). Rakip (A) profil oranları sabitlenir.
    await db.sorgu(`update duellolar set profil1 = jsonb_set(coalesce(profil1,'{}'::jsonb),'{oranlar}','${JSON.stringify(oran)}'::jsonb),
      saldiran=oyuncu2, saldiri_sirasi=1, faz='kategori', tur=2, uzatma=false, faz_bitis=clock_timestamp()+interval '15 seconds' where id='${id}'`);
    return id;
  };
  const kur = async (id, { sahip = {}, kilit = {}, tur = 2 } = {}) => {
    const s = Object.fromEntries(Object.entries(sahip).map(([k, v]) => [k, v === 'A' ? A : B]));
    const y1 = Object.values(s).filter((v) => v === A).length, y2 = Object.values(s).filter((v) => v === B).length;
    await db.sorgu(`update duellolar set sahiplik='${JSON.stringify(s)}'::jsonb, kilitler='${JSON.stringify(kilit)}'::jsonb,
      yuva1=${y1}, yuva2=${y2}, tur=${tur}, saldiran='${B}', saldiri_sirasi=1, faz='kategori', durum='aktif', kazanan=null, uzatma=false where id='${id}'`);
  };
  const cek = async (id, n) => {
    const s = await db.sorgu(`select k, count(*)::int n from (select duello2_bot_kategori('${id}','${B}') k from generate_series(1,${n})) x group by k`);
    return Object.fromEntries(s.map((r) => [r.k, Number(r.n)]));
  };
  const en = (dizi, f) => [...dizi].sort((a, b) => f(b) - f(a) || (a < b ? -1 : 1))[0];

  const id = await yeniMac();
  const d0 = await json(`select row_to_json(x)::text from duellolar x where id='${id}'`);
  ok('yeni maç hakimiyet=true, bot oyuncu2', d0.hakimiyet === true && d0.oyuncu2 === B);
  const [k1, k2, k3, k4, k5, k6, k7] = K;

  console.log('a) Kilitli kategori hiç seçilmez (200 çekiliş)');
  await kur(id, { kilit: { [k1]: 9, [k2]: 9, [k3]: 9 }, tur: 3 });
  let c = await cek(id, 200);
  ok('kilitli 3 kategori 0 kez', !c[k1] && !c[k2] && !c[k3], JSON.stringify(c));
  ok('uygun kategoriler seçildi', Object.values(c).reduce((a, b) => a + b, 0) === 200);

  console.log('b) Bot 4/5 (870: eşik 5): yalnız boş/rakip kategorisi, en iyisi (pekiştir hariç)');
  await kur(id, { sahip: { [k1]: 'B', [k2]: 'B', [k3]: 'B', [K[6]]: 'B', [k4]: 'A', [k5]: 'A' }, tur: 5 });
  c = await cek(id, 200);
  const adayB = K.filter((k) => k !== k1 && k !== k2 && k !== k3 && k !== K[6]);
  const beklB = en(adayB, (k) => deger(k, [k4, k5].includes(k) ? 'A' : undefined));
  ok('yalnız beklenen en iyi, rastgelelik yok', Object.keys(c).length === 1 && c[beklB] === 200, `${JSON.stringify(c)} bekl=${beklB}`);
  ok('pekiştir (kendi) seçilmedi', !c[k1] && !c[k2] && !c[k3] && !c[K[6]]);

  console.log('c) Rakip 4/5: rakibin kategorisi seçilir');
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k3]: 'A', [K[6]]: 'A', [k4]: 'B' }, tur: 5 });
  c = await cek(id, 200);
  const beklC = en([k1, k2, k3, K[6]], (k) => deger(k, 'A'));
  ok('rakibin en iyi kategorisi 200/200', c[beklC] === 200 && Object.keys(c).length === 1, `${JSON.stringify(c)} bekl=${beklC}`);
  // Bot 4/5 ve rakip 4/5 birlikte: nakavt öncelikli (boş/rakip)
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k3]: 'A', [K[6]]: 'A', [k4]: 'B', [k5]: 'B', [k6]: 'B', [K[7]]: 'B' }, tur: 6 });
  c = await cek(id, 100);
  const beklN = en(K.filter((k) => ![k4, k5, k6, K[7]].includes(k)), (k) => deger(k, [k1, k2, k3, K[6]].includes(k) ? 'A' : undefined));
  ok('ikisi de 4/5: nakavt öncelikli', c[beklN] === 100, `${JSON.stringify(c)} bekl=${beklN}`);
  // Rakip 4/5 ama rakip kategorileri kilitli → normal seçime düşer, hata yok
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'A', [k3]: 'A', [K[6]]: 'A' }, kilit: { [k1]: 9, [k2]: 9, [k3]: 9, [K[6]]: 9 }, tur: 5 });
  c = await cek(id, 50);
  ok('uygun rakip kategorisi yoksa normal seçim', !c[k1] && !c[k2] && !c[k3] && !c[K[6]] && Object.values(c).reduce((a, b) => a + b, 0) === 50, JSON.stringify(c));

  console.log('d) Normal durum: en iyi oranı %60–%80 (300 çekiliş)');
  await kur(id, { sahip: { [k1]: 'A', [k2]: 'B' }, tur: 3 });
  c = await cek(id, 300);
  const beklD = en(K, (k) => deger(k, k === k2 ? 'B' : k === k1 ? 'A' : undefined));
  const oranEn = (c[beklD] ?? 0) / 300 * 100;
  ok(`en iyi (${beklD}) %${oranEn.toFixed(1)}`, oranEn >= 60 && oranEn <= 80, JSON.stringify(c));
  ok('en iyi dışındakiler de seçiliyor (çeşitlilik)', Object.keys(c).length > 1);

  console.log('e) Eski (hakimiyet=false) maç: hatasız kategori');
  await db.sorgu(`update duellolar set hakimiyet=false where id='${id}'`);
  await db.sorgu(`update duellolar set puan1=0, puan2=0, yildiz1='{}'::jsonb, yildiz2='{}'::jsonb, sahiplik='{}'::jsonb, kilitler='{}'::jsonb where id='${id}'`);
  c = await cek(id, 60);
  ok('60 çekiliş, hepsi geçerli kategori', Object.values(c).reduce((a, b) => a + b, 0) === 60 && Object.keys(c).every((k) => K.includes(k)), JSON.stringify(c));
  await db.sorgu(`update duellolar set hakimiyet=true where id='${id}'`);

  console.log('f) duello2_bot_tik: bot saldırırken kategori seçip soruyu açar');
  await kur(id, { sahip: { [k1]: 'A' }, kilit: { [k2]: 9 }, tur: 3 });
  await db.sorgu(`update duellolar set faz_bitis=now() where id='${id}'`);   // now() sabit → "süre geldi"
  const n = Number(await tek(`select duello2_bot_tik('${id}')`));
  let d = await json(`select json_build_object('faz',faz,'kat',kategori,'soru',soru_id,'durum',durum,'tur',tur)::text from duellolar where id='${id}'`);
  ok('faz cevap, kategori + soru seçildi', d.faz === 'cevap' && d.kat && d.soru && d.durum === 'aktif', JSON.stringify([n, d]));
  ok('seçilen kategori kilitli değil', d.kat !== k2);
  // Cevap aşaması: zaman geçmiş gibi; bot cevaplar, Baskın/Kalkan kullanmaz.
  await db.sorgu(`update duellolar set soru_baslangic=now()-interval '60 seconds', bitis1=now()+interval '20 seconds', bitis2=now()+interval '20 seconds', faz_bitis=now()+interval '20 seconds' where id='${id}'`);
  for (let i = 0; i < 3; i++) await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await json(`select json_build_object('cevaplar',cevaplar,'faz',faz)::text from duellolar where id='${id}'`);
  ok('bot cevabını verdi (ya da maç çözümlendi)', d.cevaplar[B] !== undefined || d.faz !== 'cevap', JSON.stringify(d));
  const jk = await db.sorgu(`select tur from joker_kullanimlari where mac_id='${id}' and user_id='${B}'`);
  ok('bot Baskın/Kalkan kullanmadı', jk.every((r) => !['baskin', 'kalkan'].includes(r.tur)), JSON.stringify(jk));
  // Birçok kez tik: hatasız, Baskın/Kalkan asla
  let hatasiz = true;
  try {
    for (let i = 0; i < 10; i++) {
      await kur(id, { tur: 3 + (i % 5) });
      await db.sorgu(`update duellolar set faz_bitis=now() where id='${id}'`);
      await db.sorgu(`select duello2_bot_tik('${id}')`);
    }
  } catch (e) { hatasiz = false; console.log('   hata:', e.message); }
  ok('10 ardışık tik hatasız', hatasiz);
} catch (e) { kaldi++; console.log('BEKLENMEYEN HATA:', e.message); }
finally { await db.sorgu('rollback').catch(() => {}); await db.kapat(); }
console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (transaction geri alındı)`);
process.exitCode = kaldi ? 1 : 0;
