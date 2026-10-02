// Düello savunma banı (853) SQL provası — tek transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// Sınar: maç başı ban fazı · ban sırası (yalnız savunan) · banlı kategori seçilemez · arka arkaya aynı ban yasağı ·
// süre dolunca atlama · kilitli kategori banlanamaz · bot (ban seçer, banlıyı seçmez, kritikte yuva kapatır) ·
// Altın Soru'da ban yok · nakavt · kopukluk dondurması · bayrak 0 (eski akış) · durum() şekli · yetkiler.
// Kullanım: node araclar/duello-ban-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (ArayuzDenetim890)
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let B;
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) { await db.sorgu('savepoint s'); try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; } catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; } }
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
try {
  await db.sorgu('begin');
  await db.sorgu("set local statement_timeout = '60s'");
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  B = await tek(`select p.id from profiles p where p.is_bot and p.bot_turu = 'gizli' and coalesce(p.bot_aktif, true)
    order by p.bot_seviye_puan nulls last, p.id limit 1`);
  await db.sorgu(`update duellolar set durum='iptal' where durum='aktif' and (oyuncu1 in ('${A}','${B}') or oyuncu2 in ('${A}','${B}'))`);
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);
  await db.sorgu(`update oyun_ayarlari set deger='1' where anahtar='duello_ban_acik'`);
  const K = await json(`select to_json(duello_kategorileri())::text`);
  const [k1, k2, k3, k4, k5] = K;
  const satir = (id) => json(`select row_to_json(x)::text from duellolar x where id='${id}'`);
  const kalanSn = (id) => tek(`select round(extract(epoch from (faz_bitis - now())))::int::text from duellolar where id='${id}'`).then(Number);
  const yeniMac = async () => {
    const id = await tek(`select duello_olustur('${A}','${B}',false,null)`);
    await db.sorgu(`update duellolar set oyuncu1=oyuncu2, oyuncu2=oyuncu1, profil1=profil2, profil2=profil1, saldiran=oyuncu2 where id='${id}' and oyuncu1<>'${A}'`);
    return id;
  };
  // Sonuç fazını bitir → sonraki tura geç (gerçek geçiş: duello2_ilerlet → duello2_sonraki → duello2_ban_baslat).
  const turGec = async (id) => {
    await db.sorgu(`update duellolar set faz='sonuc', faz_bitis=now() - interval '1 second' where id='${id}'`);
    await db.sorgu(`select duello2_ilerlet('${id}')`);
    return satir(id);
  };
  const sureDoldur = async (id) => {
    await db.sorgu(`update duellolar set faz_bitis=now() - interval '1 second' where id='${id}'`);
    await db.sorgu(`select duello2_ilerlet('${id}')`);
    return satir(id);
  };
  await ben(A);

  console.log('1) Maç başı: 1. tur ban fazıyla açılır');
  let id = await yeniMac();
  let d = await satir(id);
  ok('faz ban, ban boş, tur 1, saldıran oyuncu1 (A)', d.faz === 'ban' && d.ban_kategori === null && d.tur === 1 && d.saldiran === A, JSON.stringify([d.faz, d.tur]));
  let sn = await kalanSn(id);
  ok('1. tur süresi = 5 + 3 (açılış payı) + gösterim payı', sn >= 9 && sn <= 10, String(sn));

  console.log('2) Ban sırası: yalnız savunan');
  let h = await hata(`select duello_ban_sec('${id}','${k1}')`);
  ok('saldıran (A) banlayamaz', h && /ban sırası sende değil/.test(h), h);
  h = await hata(`select duello_kategori_sec('${id}','${k2}')`);
  ok('ban fazında saldıran kategori seçemez', h && /sırası sende değil/.test(h), h);
  await db.sorgu(`select duello2_ban_bitir('${id}','${k1}')`);   // savunan bot B'nin banı
  d = await satir(id);
  ok('ban sonrası faz kategori, ban_kategori yazıldı, B\'nin son banı yazıldı', d.faz === 'kategori' && d.ban_kategori === k1 && d.son_ban2 === k1 && d.son_ban1 === null, JSON.stringify([d.faz, d.ban_kategori, d.son_ban1, d.son_ban2]));
  sn = await kalanSn(id);
  ok('kategori süresi baştan (15 + pay + 880 ban açıklama payı 1,2 sn)', sn >= 17 && sn <= 19, String(sn));

  console.log('3) Banlı kategori seçilemez');
  ok('duello2_kategori_uygun_mu(banlı) = false', (await tek(`select duello2_kategori_uygun_mu('${id}','${k1}')::text`)) === 'false');
  let dur = await json(`select duello_durum('${id}')::text`);
  ok('durum: ban.kategori + uygun listesinde yok', dur.ban.kategori === k1 && dur.ban.acik === true && !dur.uygun_kategoriler.includes(k1) && dur.uygun_kategoriler.length === K.length - 1, JSON.stringify(dur.ban));
  h = await hata(`select duello_kategori_sec('${id}','${k1}')`);
  ok('saldıran banlıyı RPC ile seçemez', h && /seçilemez/.test(h), h);
  let oto = new Set();
  for (let i = 0; i < 40; i++) oto.add(await tek(`select duello2_otomatik_kategori('${id}')`));
  ok('süre dolunca rastgele seçim banlıyı vermez', !oto.has(k1), [...oto].join(','));
  h = await hata(`select duello_kategori_sec('${id}','${k2}')`);
  d = await satir(id);
  ok('başka kategori seçilir → cevap fazı; ban tur boyunca durur', h === null && d.faz === 'cevap' && d.kategori === k2 && d.ban_kategori === k1, h ?? JSON.stringify([d.faz, d.kategori]));

  console.log('4) Sonraki tur: roller değişir, ban temizlenir, savunan A banlar');
  d = await turGec(id);
  ok('tur 2, saldıran B, faz ban, ban boş', d.tur === 2 && d.saldiran === B && d.faz === 'ban' && d.ban_kategori === null, JSON.stringify([d.tur, d.faz, d.ban_kategori]));
  sn = await kalanSn(id);
  ok('normal tur süresi = 5 + gösterim payı', sn >= 6 && sn <= 7, String(sn));
  dur = await json(`select duello_durum('${id}')::text`);
  ok('durum (savunan): ban.uygun 10 kategori, onceki boş, sureler.ban 5, sayaç başlangıcı var',
    dur.faz === 'ban' && dur.ban.uygun.length === K.length && dur.ban.onceki === null && dur.ban.kategori === null
    && Number(dur.sureler.ban) === 5 && Boolean(dur.sureler.gosterim_bas), JSON.stringify([dur.ban, dur.sureler.ban, dur.sureler.gosterim_bas]));
  h = await hata(`select duello_ban_sec('${id}','yok_boyle')`);
  ok('geçersiz kategori banlanamaz', h && /banlanamaz/.test(h), h);
  h = await hata(`select duello_ban_sec('${id}','${k3}')`);
  d = await satir(id);
  ok('savunan A banladı → kategori fazı, son_ban1 yazıldı, B\'nin son banı korunur', h === null && d.faz === 'kategori' && d.ban_kategori === k3 && d.son_ban1 === k3 && d.son_ban2 === k1, h ?? JSON.stringify(d.son_ban1));
  h = await hata(`select duello_ban_sec('${id}','${k4}')`);
  ok('ikinci ban reddedilir (faz geçti)', h && /ban sırası sende değil/.test(h), h);
  let botSec = new Set();
  for (let i = 0; i < 40; i++) botSec.add(await tek(`select duello2_bot_kategori('${id}','${B}')`));
  ok('bot saldırırken banlıyı seçmez', !botSec.has(k3) && botSec.size >= 1, [...botSec].join(','));

  console.log('5) Arka arkaya aynı ban yasağı (A: tur 2 → tur 4 → tur 6)');
  d = await turGec(id);   // tur 3: A saldırır, B savunur
  ok('tur 3: faz ban, savunan B', d.tur === 3 && d.faz === 'ban' && d.saldiran === A);
  ok('B için önceki banı (k1) uygun değil, başkası uygun', (await tek(`select duello2_ban_uygun_mu('${id}','${B}','${k1}')::text`)) === 'false'
    && (await tek(`select duello2_ban_uygun_mu('${id}','${B}','${k2}')::text`)) === 'true');
  d = await sureDoldur(id);
  ok('süre doldu: ban yok, faz kategori, B\'nin son banı boşaldı, A\'nınki durur', d.faz === 'kategori' && d.ban_kategori === null && d.son_ban2 === null && d.son_ban1 === k3, JSON.stringify([d.faz, d.ban_kategori, d.son_ban1, d.son_ban2]));
  dur = await json(`select duello_durum('${id}')::text`);
  ok('süre dolunca bütün kategoriler seçilebilir', dur.uygun_kategoriler.length === K.length && dur.ban.kategori === null, JSON.stringify(dur.uygun_kategoriler));
  d = await turGec(id);   // tur 4: B saldırır, A savunur
  dur = await json(`select duello_durum('${id}')::text`);
  ok('tur 4: durum ban.onceki = k3, uygun listesinde yok', d.tur === 4 && d.faz === 'ban' && dur.ban.onceki === k3 && !dur.ban.uygun.includes(k3) && dur.ban.uygun.length === K.length - 1, JSON.stringify(dur.ban));
  h = await hata(`select duello_ban_sec('${id}','${k3}')`);
  ok('aynı kategori arka arkaya banlanamaz', h && /arka arkaya/.test(h), h);
  h = await hata(`select duello_ban_sec('${id}','${k4}')`);
  ok('başka kategori banlanır', h === null, h);
  await turGec(id);       // tur 5
  await sureDoldur(id);
  d = await turGec(id);   // tur 6: A yine savunur
  h = await hata(`select duello_ban_sec('${id}','${k3}')`);
  ok('bir savunma arayla aynı kategori yeniden banlanabilir', d.tur === 6 && h === null, h);
  h = await hata(`select duello_ban_sec('${id}','${k3}')`);
  ok('aynı tur ikinci kez banlanamaz', h !== null, h);

  console.log('6) Kilitli kategori banlanamaz');
  await db.sorgu(`update duellolar set kilitler=jsonb_build_object('${k2}', tur + 3) where id='${id}'`);
  d = await turGec(id);   // tur 7
  await sureDoldur(id);
  d = await turGec(id);   // tur 8: A savunur
  h = await hata(`select duello_ban_sec('${id}','${k2}')`);
  ok('kilitli (zaten seçilemeyen) kategori banlanamaz', d.tur === 8 && h && /banlanamaz/.test(h), h);
  await db.sorgu(`update duellolar set kilitler='{}'::jsonb where id='${id}'`);

  console.log('7) Bot savunurken ban seçer');
  id = await yeniMac();   // tur 1: A saldırır, bot B savunur, faz ban
  ok('bot süresi gelmeden banlamaz', (await db.sorgu(`select duello2_bot_tik('${id}')`), (await satir(id)).faz === 'ban'));
  await db.sorgu(`update duellolar set faz_bitis=now() + interval '2 seconds' where id='${id}'`);
  await db.sorgu(`select duello2_bot_tik('${id}')`);
  d = await satir(id);
  ok('bot banladı → kategori fazı, ban geçerli kategori', d.faz === 'kategori' && K.includes(d.ban_kategori) && d.son_ban2 === d.ban_kategori, JSON.stringify([d.faz, d.ban_kategori]));
  let botBan = new Set();
  await db.sorgu(`update duellolar set faz='ban', ban_kategori=null, son_ban2='${k1}' where id='${id}'`);
  for (let i = 0; i < 60; i++) botBan.add(await tek(`select duello2_bot_ban_kategori('${id}','${B}')`));
  ok('bot kendi önceki banını yinelemez', !botBan.has(k1) && botBan.size >= 1, [...botBan].join(','));
  // Kritik: saldıran A eşik−1'de (4 yuva; 870: eşik 5) → bot yuva getirecek (A'nın olmayan) bir kategoriyi kapatır.
  await db.sorgu(`update duellolar set son_ban2=null, yuva1=4, yuva2=0,
    sahiplik=jsonb_build_object('${k1}','${A}','${k2}','${A}','${k3}','${A}','${k4}','${A}') where id='${id}'`);
  botBan = new Set();
  for (let i = 0; i < 30; i++) botBan.add(await tek(`select duello2_bot_ban_kategori('${id}','${B}')`));
  ok('kritikte bot A\'nın kendi kategorisini banlamaz (tek ve kararlı seçim)', botBan.size === 1 && ![k1, k2, k3, k4].some((k) => botBan.has(k)), [...botBan].join(','));

  console.log('8) Kopukluk: ban fazı donar, dönünce sürer');
  id = await yeniMac();
  await db.sorgu(`update profiles set last_seen=now() - interval '40 seconds' where id='${A}'`);
  await db.sorgu(`update duellolar set faz_bitis=now() - interval '1 second' where id='${id}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('kopukken süre dolsa da faz ban kalır', d.faz === 'ban' && d.kopuk_at !== null, JSON.stringify([d.faz, d.kopuk_at]));
  await db.sorgu(`update profiles set last_seen=now() where id='${A}'`);
  await db.sorgu(`select duello2_ilerlet('${id}')`);
  d = await satir(id);
  ok('dönünce ban fazı kalan süreyle sürer', d.faz === 'ban' && d.kopuk_at === null && (await kalanSn(id)) >= 3, JSON.stringify([d.faz, d.kopuk_at]));

  console.log('9) Nakavt ve Altın Soru: ban yok');
  await db.sorgu(`update duellolar set faz='kategori', yuva1=5, sahiplik=jsonb_build_object('${k1}','${A}','${k2}','${A}','${k3}','${A}','${k4}','${A}','${k5}','${A}') where id='${id}'`);
  d = await turGec(id);
  ok('eşiğe ulaşan kazanır (ban fazı açılmaz)', d.durum === 'bitti' && d.kazanan === A, JSON.stringify([d.durum, d.faz]));
  id = await yeniMac();
  await db.sorgu(`update duellolar set tur=(select deger::text::int from oyun_ayarlari where anahtar='duello_max_tur'), ban_kategori='${k1}', yuva1=1, yuva2=1,
    sahiplik=jsonb_build_object('${k1}','${A}','${k2}','${B}') where id='${id}'`);
  d = await turGec(id);
  dur = await json(`select duello_durum('${id}')::text`);
  ok('son tur eşit → Altın Soru doğrudan cevap fazı, ban gösterilmez', d.uzatma === true && d.faz === 'cevap' && dur.ban.kategori === null, JSON.stringify([d.uzatma, d.faz, dur.ban]));
  h = await hata(`select duello_ban_sec('${id}','${k2}')`);
  ok('Altın Soru\'da ban RPC\'si reddeder', h && /ban sırası sende değil/.test(h), h);

  console.log('10) Bayrak 0: eski akış aynen');
  await db.sorgu(`update oyun_ayarlari set deger='0' where anahtar='duello_ban_acik'`);
  id = await yeniMac();
  d = await satir(id);
  ok('maç başı faz kategori (ban yok)', d.faz === 'kategori' && d.ban_kategori === null, d.faz);
  sn = await kalanSn(id);
  ok('kategori süresi eskisi gibi (15 + pay)', sn >= 16 && sn <= 17, String(sn));
  d = await turGec(id);
  ok('sonuç → doğrudan kategori (tur 2, saldıran B)', d.faz === 'kategori' && d.tur === 2 && d.saldiran === B && d.ban_kategori === null, JSON.stringify([d.faz, d.tur]));
  dur = await json(`select duello_durum('${id}')::text`);
  ok('durum: ban.acik false, bütün kategoriler uygun', dur.ban.acik === false && dur.ban.kategori === null && dur.uygun_kategoriler.length === K.length, JSON.stringify(dur.ban));
  h = await hata(`select duello_ban_sec('${id}','${k1}')`);
  ok('bayrak 0 iken ban RPC\'si reddeder', h && /ban sırası sende değil/.test(h), h);
  // Bayrak maç ortasında kapanırsa: açık ban fazı süresi dolunca kapanır, önceki turun banı takılı kalmaz.
  await db.sorgu(`update duellolar set faz='ban', ban_kategori=null where id='${id}'`);
  d = await sureDoldur(id);
  ok('bayrak kapanınca açık ban fazı kategoriye düşer', d.faz === 'kategori');
  await db.sorgu(`update duellolar set ban_kategori='${k1}' where id='${id}'`);
  d = await turGec(id);
  ok('bayrak 0: önceki turun banı yeni turda temizlenir', d.faz === 'kategori' && d.ban_kategori === null, JSON.stringify(d.ban_kategori));

  console.log('11) Yetkiler');
  const yetki = (rol, fn) => tek(`select has_function_privilege('${rol}', 'public.${fn}', 'execute')::text`);
  ok('duello_ban_sec: authenticated evet, anon hayır', (await yetki('authenticated', 'duello_ban_sec(uuid,text)')) === 'true' && (await yetki('anon', 'duello_ban_sec(uuid,text)')) === 'false');
  ok('iç yardımcılar istemciye kapalı', (await yetki('authenticated', 'duello2_ban_bitir(uuid,text)')) === 'false'
    && (await yetki('authenticated', 'duello2_ban_baslat(uuid)')) === 'false'
    && (await yetki('authenticated', 'duello2_bot_ban_kategori(uuid,uuid)')) === 'false'
    && (await yetki('anon', 'duello2_ban_uygun_mu(uuid,uuid,text)')) === 'false');
  ok('mevcut yetkiler aynı (kategori_sec authenticated, ilerlet kapalı)', (await yetki('authenticated', 'duello_kategori_sec(uuid,text)')) === 'true'
    && (await yetki('authenticated', 'duello2_ilerlet(uuid)')) === 'false' && (await yetki('authenticated', 'duello2_kategori_uygun_mu(uuid,text)')) === 'false');

  console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı`);
} catch (e) {
  kaldi++;
  console.log('HATA', e.message);
} finally { await db.sorgu('rollback').catch(() => {}); await db.kapat(); }
process.exit(kaldi ? 1 : 0);
