// Düello botu — boş kategori yeni kuralı (890) SQL provası — tek transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Sınar: bot saldırırken boş kategori değeri p_s − (1 − p_s)·p_d (benzer isabette boş, rakibin kategorisinden önce) ·
// ayar 0 iken eski formül · bot savunurken saldıranın en kazançlı kategorisini banlar (boş dahil, yeni formül) ·
// ardışık aynı ban yasağı · kritikte yuva kapatma · yetkiler ve duello2_bot_tik (cevap/süre) değişmedi.
// Kullanım: node araclar/duello-bot-bos-kural-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
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
  const tikOnce = await tek(`select md5(prosrc) from pg_proc where oid = 'public.duello2_bot_tik(uuid)'::regprocedure`);
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  // En isabetli gizli bot: "boş kategori öne geçer" koşulu p_s > 0,5 ister.
  const B = await tek(`select p.id from profiles p where p.is_bot and p.bot_turu = 'gizli' and coalesce(p.bot_aktif, true)
    order by (case when coalesce(p.bot_isabet, 0.6) > 1 then p.bot_isabet / 100.0 else coalesce(p.bot_isabet, 0.6) end) desc, p.id limit 1`);
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='duello_ban_acik'`);   // faz elle kurulur
  await db.sorgu(`update oyun_ayarlari set deger='1' where anahtar='duello_bos_ikisi_dogru_saldiran'`);
  const K = await json(`select to_json(duello_kategorileri())::text`);
  const bp = await json(`select json_object_agg(k, bot_kategori_isabet('${B}', k))::text from unnest(duello_kategorileri()) k`);
  const PEK = Number(await tek(`select ayar_ondalik('duello_bot_pekistir_agirlik', 0.5)`));

  // Hamle değeri: ps = saldıranın, pd = savunanın isabeti; tur = saldırana göre 'bos' | 'rakip' | 'kendi'.
  const yeni = (ps, pd, tur) => tur === 'bos' ? ps - (1 - ps) * pd : ps * (1 - pd) * (tur === 'kendi' ? PEK : 1);
  const eski = (ps, pd, tur) => ps * (1 - pd) * (tur === 'kendi' ? PEK : 1);
  const en = (dizi, f) => [...dizi].sort((a, b) => f(b) - f(a) || (a < b ? -1 : 1))[0];
  const yuzde = (c, k, n) => (c[k] ?? 0) / n * 100;

  const id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
  await db.sorgu(`update duellolar set oyuncu1=oyuncu2, oyuncu2=oyuncu1, profil1=profil2, profil2=profil1 where id='${id}' and oyuncu1<>'${A}'`);
  // Bot = oyuncu2. kur(): tahta + A'nın (rakibin) kategori oranları + kim saldırıyor.
  const kur = async ({ sahip = {}, kilit = {}, oran, saldiran = 'B', faz = 'kategori', sonBan = null }) => {
    const s = Object.fromEntries(Object.entries(sahip).map(([k, v]) => [k, v === 'A' ? A : B]));
    const y1 = Object.values(s).filter((v) => v === A).length, y2 = Object.values(s).filter((v) => v === B).length;
    await db.sorgu(`update duellolar set sahiplik='${JSON.stringify(s)}'::jsonb, kilitler='${JSON.stringify(kilit)}'::jsonb,
      profil1 = jsonb_set(coalesce(profil1,'{}'::jsonb),'{oranlar}','${JSON.stringify(oran)}'::jsonb),
      yuva1=${y1}, yuva2=${y2}, tur=3, saldiran='${saldiran === 'A' ? A : B}', saldiri_sirasi=1, faz='${faz}', ban_kategori=null,
      son_ban1=null, son_ban2=${sonBan ? `'${sonBan}'` : 'null'}, durum='aktif', kazanan=null, uzatma=false, hakimiyet=true,
      faz_bitis=clock_timestamp()+interval '15 seconds' where id='${id}'`);
  };
  const cek = async (fn, n) => {
    const s = await db.sorgu(`select k, count(*)::int n from (select ${fn}('${id}','${B}') k from generate_series(1,${n})) x group by k`);
    return Object.fromEntries(s.map((r) => [r.k, Number(r.n)]));
  };
  const turSal = (sahip) => (k) => sahip[k] === undefined ? 'bos' : sahip[k] === 'B' ? 'kendi' : 'rakip';   // bot saldırır
  const turBan = (sahip) => (k) => sahip[k] === undefined ? 'bos' : sahip[k] === 'A' ? 'kendi' : 'rakip';   // A saldırır
  const [k1, k2, k3, k4] = K;
  ok('10 kategori, bot isabetleri okundu', K.length === 10 && K.every((k) => bp[k] > 0 && bp[k] < 1), JSON.stringify(bp));

  console.log('1) Bot saldırırken: tam tahtada en iyi = yeni formül (300 çekiliş)');
  const oran1 = Object.fromEntries(K.map((k, i) => [k, 10 + i * 8]));
  let sahip = { [k1]: 'A', [k2]: 'B', [k3]: 'A' };
  await kur({ sahip, oran: oran1 });
  let c = await cek('duello2_bot_kategori', 300);
  let bekl = en(K, (k) => yeni(bp[k], oran1[k] / 100, turSal(sahip)(k)));
  ok(`en iyi (${bekl}, ${turSal(sahip)(bekl)}) %${yuzde(c, bekl, 300).toFixed(1)} — %60–%80`, yuzde(c, bekl, 300) >= 60 && yuzde(c, bekl, 300) <= 80, JSON.stringify(c));
  ok('en iyi dışındakiler de seçiliyor (~%30)', Object.keys(c).length > 1);

  console.log('2) Benzer isabette boş kategori, rakibin kategorisinden önce (rakip oranı ikisinde de %50)');
  const oran50 = Object.fromEntries(K.map((k) => [k, 50]));
  let cift = null;
  for (const x of K) for (const y of K) {
    if (x >= y || bp[x] === bp[y] || Math.min(bp[x], bp[y]) <= 0.5) continue;
    if (yeni(Math.min(bp[x], bp[y]), 0.5, 'bos') <= eski(Math.max(bp[x], bp[y]), 0.5, 'rakip')) continue;
    if (!cift || Math.abs(bp[x] - bp[y]) < Math.abs(bp[cift[0]] - bp[cift[1]])) cift = [x, y];
  }
  ok('isabeti benzer (> 0,5) iki kategori bulundu', cift !== null, JSON.stringify(bp));
  const [X, Y] = cift;
  const guclu = bp[X] > bp[Y] ? X : Y, zayif = guclu === X ? Y : X;
  const kilit8 = Object.fromEntries(K.filter((k) => k !== X && k !== Y).map((k) => [k, 99]));
  await kur({ sahip: { [guclu]: 'A' }, kilit: kilit8, oran: oran50 });   // boş = zayıf olan; eski formül güçlüyü (rakibinkini) seçerdi
  c = await cek('duello2_bot_kategori', 300);
  ok(`boş (${zayif}, p=${bp[zayif]}) > rakibin (${guclu}, p=${bp[guclu]}): %${yuzde(c, zayif, 300).toFixed(1)}`, yuzde(c, zayif, 300) >= 60, JSON.stringify(c));
  ok('kilitli 8 kategori hiç seçilmedi', Object.keys(c).every((k) => k === X || k === Y), JSON.stringify(c));
  await kur({ sahip: { [zayif]: 'A' }, kilit: kilit8, oran: oran50 });   // roller değişti: boş = güçlü olan
  c = await cek('duello2_bot_kategori', 300);
  ok(`tersine: boş (${guclu}) yine önde: %${yuzde(c, guclu, 300).toFixed(1)}`, yuzde(c, guclu, 300) >= 60, JSON.stringify(c));

  console.log('3) Ayar duello_bos_ikisi_dogru_saldiran = 0: eski formül (boş = rakip değeri)');
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='duello_bos_ikisi_dogru_saldiran'`);
  await kur({ sahip: { [guclu]: 'A' }, kilit: kilit8, oran: oran50 });
  c = await cek('duello2_bot_kategori', 300);
  ok(`eski kuralda isabeti yüksek olan (${guclu}, rakibin) seçilir: %${yuzde(c, guclu, 300).toFixed(1)}`, yuzde(c, guclu, 300) >= 60, JSON.stringify(c));
  await db.sorgu(`update oyun_ayarlari set deger='1' where anahtar='duello_bos_ikisi_dogru_saldiran'`);

  console.log('4) Bot savunurken: tam tahtada en çok banlanan = saldıranın en kazançlı kategorisi (300 çekiliş)');
  sahip = { [k1]: 'A', [k2]: 'B', [k3]: 'B', [k4]: 'A' };
  await kur({ sahip, oran: oran1, saldiran: 'A', faz: 'ban' });
  c = await cek('duello2_bot_ban_kategori', 300);
  bekl = en(K, (k) => yeni(oran1[k] / 100, bp[k], turBan(sahip)(k)));
  ok(`en kazançlı (${bekl}, ${turBan(sahip)(bekl)}) %${yuzde(c, bekl, 300).toFixed(1)} — %60–%80`, yuzde(c, bekl, 300) >= 60 && yuzde(c, bekl, 300) <= 80, JSON.stringify(c));

  console.log('5) Ban: boş kategori yeni formülle öne geçer (eski formül botun kategorisini banlardı)');
  let bc = null;
  for (const x of K) for (const y of K) {
    if (x === y || bc) continue;
    if (yeni(0.7, bp[x], 'bos') > eski(0.8, bp[y], 'rakip') && eski(0.8, bp[y], 'rakip') > eski(0.7, bp[x], 'bos')) bc = [x, y];
  }
  ok('eski ↔ yeni formülün ayrıştığı çift bulundu', bc !== null, JSON.stringify(bp));
  const [BX, BY] = bc;
  const oran5 = { ...Object.fromEntries(K.map((k) => [k, 5])), [BX]: 70, [BY]: 80 };
  sahip = { [BY]: 'B' };
  await kur({ sahip, oran: oran5, saldiran: 'A', faz: 'ban' });
  c = await cek('duello2_bot_ban_kategori', 300);
  ok(`boş ${BX} (kazanç ${yeni(0.7, bp[BX], 'bos').toFixed(2)}) banlanır, botun ${BY} (${eski(0.8, bp[BY], 'rakip').toFixed(2)}) değil: %${yuzde(c, BX, 300).toFixed(1)}`,
    yuzde(c, BX, 300) >= 60 && yuzde(c, BX, 300) <= 80, JSON.stringify(c));

  console.log('6) Ardışık aynı ban yasağı');
  await kur({ sahip, oran: oran5, saldiran: 'A', faz: 'ban', sonBan: BX });
  c = await cek('duello2_bot_ban_kategori', 300);
  ok(`önceki banı (${BX}) hiç seçilmez`, !c[BX] && Object.values(c).reduce((a, b) => a + b, 0) === 300, JSON.stringify(c));
  ok(`sıradaki en kazançlı (${BY}) banlanır: %${yuzde(c, BY, 300).toFixed(1)}`, yuzde(c, BY, 300) >= 60, JSON.stringify(c));
  ok('kural kapısı: önceki ban uygun değil', (await tek(`select duello2_ban_uygun_mu('${id}','${B}','${BX}')::text`)) === 'false');

  console.log('7) Kritik (saldıran eşik−1): yuva getirecek en kazançlı kategori, rastgelelik yok');
  const esik = Number(await tek(`select coalesce(hakimiyet_esik, 4) from duellolar where id='${id}'`));
  sahip = Object.fromEntries(K.slice(0, esik - 1).map((k) => [k, 'A']));
  await kur({ sahip, oran: oran1, saldiran: 'A', faz: 'ban' });
  c = await cek('duello2_bot_ban_kategori', 100);
  bekl = en(K.slice(esik - 1), (k) => yeni(oran1[k] / 100, bp[k], 'bos'));
  ok(`tek ve kararlı seçim: ${bekl}`, c[bekl] === 100 && Object.keys(c).length === 1, JSON.stringify(c));

  console.log('8) Dokunulmayanlar');
  const yetki = (rol, fn) => tek(`select has_function_privilege('${rol}', 'public.${fn}', 'execute')::text`);
  ok('bot fonksiyonları istemciye kapalı (yetki aynı)', (await yetki('authenticated', 'duello2_bot_kategori(uuid,uuid)')) === 'false'
    && (await yetki('anon', 'duello2_bot_kategori(uuid,uuid)')) === 'false'
    && (await yetki('authenticated', 'duello2_bot_ban_kategori(uuid,uuid)')) === 'false'
    && (await yetki('anon', 'duello2_bot_ban_kategori(uuid,uuid)')) === 'false');
  ok('duello2_bot_tik (cevap davranışı / süreler) değişmedi',
    (await tek(`select md5(prosrc) from pg_proc where oid = 'public.duello2_bot_tik(uuid)'::regprocedure`)) === tikOnce);

  console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (transaction geri alındı)`);
} catch (e) {
  kaldi++;
  console.log('HATA', e.message);
} finally { await db.sorgu('rollback').catch(() => {}); await db.kapat(); }
process.exit(kaldi ? 1 : 0);
