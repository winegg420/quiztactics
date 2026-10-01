// Sezon finali: seviye 28 ücretli ödül = Ejderha çerçevesi (780) — tek transaction, sonunda ROLLBACK (canlıya yazılmaz).
// Sınar: migration mevcut alım/sahiplik/takılı kayıtlarını bozmaz · BP'siz seviye 28 ücretli alınamaz · bp_odul_al, bp_toplu_al,
// bp_satin_al (geriye dönük) ve sezon_kapat çerçeveyi kozmetik sahipliğine idempotent işler · çift alım reddi · Ejderha dükkânda
// satın alınamaz (satis_pasif) ve diğer kalemlerin satış durumu değişmez.
// Kullanım: node araclar/sezon-finali-sql-testi.mjs [migration.sql]   (varsayılan: 780)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = process.argv[2] ?? 'supabase/migrations/20260612000780_sezon_finali_ejderha.sql';
const A = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil)
const EJ = 'pc_ejderha2';
let sezon;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
const tek = (s) => db.tek(s);
const dene = async (s) => {
  await db.sorgu('savepoint d');
  try { const r = await db.tek(s); await db.sorgu('release savepoint d'); return { r }; }
  catch (e) { await db.sorgu('rollback to savepoint d'); return { hata: e.message }; }
};
const sahiplik = (u) => tek(`select count(*) from oyuncu_kozmetikleri where user_id='${u}' and kozmetik='${EJ}'`);
const alimVar = (u, kol = 'ucretli') => tek(`select count(*) from oyuncu_bp_odul_alimi where user_id='${u}' and seviye=28 and kol='${kol}' and sezon=${sezon}`);
try {
  await db.sorgu('begin');
  console.log('— migration öncesi/sonrası anlık görüntü');
  const gor = async () => [
    await tek(`select count(*) from oyuncu_bp_odul_alimi`),
    await tek(`select count(*) from oyuncu_kozmetikleri where kozmetik='${EJ}'`),
    await tek(`select count(*) from profiles where takili_premium_cerceve='${EJ}'`),
    await tek(`select aktif::text||onay||coalesce(icerik::text,'') from kozmetikler where anahtar='${EJ}'`),
    await tek(`select md5(string_agg(to_jsonb(o)::text, '|' order by seviye, kol)) from bp_seviye_odulleri o where not (seviye=28 and kol='ucretli')`),
  ].join('#');
  const satisOnce = await tek(`select string_agg(anahtar, ',' order by anahtar) from kozmetikler where anahtar <> '${EJ}' and kozmetik_satista(anahtar)`);
  const once = await gor();
  await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  const sonra = await gor();
  ok('alım kayıtları, Ejderha sahipleri, takılılar, kozmetik kaydı ve diğer 55 ödül satırı migration sonrası AYNI', sonra === once, `${once} → ${sonra}`);
  ok('seviye 28 ücretli: gerçek ödül, cerceve, pc_ejderha2, efsanevi, ad TR/EN',
    await tek(`select (not placeholder and tur='cerceve' and veri->>'anahtar'='${EJ}' and nadirlik='efsanevi' and ad_tr='Ejderha çerçevesi' and ad_en='Dragon frame') from bp_seviye_odulleri where seviye=28 and kol='ucretli'`) === 't');
  await db.sorgu(fs.readFileSync(MIG, 'utf8'));
  ok('migration tekrar çalıştırılınca değişen yok (idempotent)', (await gor()) === sonra);
  ok('Ejderha dükkânda satılmıyor (kozmetik_satista false)', await tek(`select kozmetik_satista('${EJ}')`) === 'f');
  ok('diğer kalemlerin satış durumu değişmedi', await tek(`select string_agg(anahtar, ',' order by anahtar) from kozmetikler where anahtar <> '${EJ}' and kozmetik_satista(anahtar)`) === satisOnce);

  sezon = await tek(`select id from sezonlar where kapandi_at is null and not test`);
  ok('açık gerçek sezon var', Boolean(sezon));
  // Test hesabı: temiz başla (yalnız bu transaction içinde)
  const sifirla = async () => {
    await db.sorgu(`delete from oyuncu_bp_odul_alimi where user_id='${A}' and sezon=${sezon}`);
    await db.sorgu(`delete from oyuncu_bp_sahipligi where user_id='${A}' and sezon=${sezon}`);
    await db.sorgu(`delete from oyuncu_kozmetikleri where user_id='${A}' and kozmetik='${EJ}'`);
    await db.sorgu(`update profiles set takili_premium_cerceve=null, elmas=2000 where id='${A}'`);
    await db.sorgu(`delete from oyuncu_sezon_puani where user_id='${A}' and sezon=${sezon}`);
    await tek(`select sezon_puani_ekle('${A}', 'turnuva', 'final:${Math.random()}', 1)`);
  };
  const spYap = (sp) => db.sorgu(`update oyuncu_sezon_puani set sp=${sp}, seviye=sezon_seviye(${sp}) where user_id='${A}' and sezon=${sezon}`);

  console.log("— BP'siz: ücretli seviye 28 alınamaz");
  await sifirla(); await spYap(2800);
  await ben(A);
  ok('A seviye 28', await tek(`select seviye from oyuncu_sezon_puani where user_id='${A}' and sezon=${sezon}`) === '28');
  let d = await dene(`select bp_odul_al(28, 'ucretli')`);
  ok("BP'siz bp_odul_al(28, ücretli) reddedilir", Boolean(d.hata) && (await sahiplik(A)) === '0', JSON.stringify(d));
  await dene(`select bp_toplu_al()`);
  ok("BP'siz bp_toplu_al çerçeveyi VERMEZ", (await sahiplik(A)) === '0' && (await alimVar(A)) === '0');

  console.log('— bp_satin_al: hak edilen seviye 28 geriye dönük verilir');
  await tek('select bp_satin_al()');
  ok('A çerçeveye sahip (kozmetik, kaynak etkinlik)', await tek(`select count(*) from oyuncu_kozmetikleri where user_id='${A}' and kozmetik='${EJ}' and kaynak='etkinlik'`) === '1');
  ok('alım kaydı verildi=true', await tek(`select verildi from oyuncu_bp_odul_alimi where user_id='${A}' and seviye=28 and kol='ucretli'`) === 't');
  d = await dene(`select bp_odul_al(28, 'ucretli')`);
  ok('çift alma reddedilir', Boolean(d.hata), JSON.stringify(d));
  await tek(`select bp_toplu_al()`);
  ok('bp_toplu_al tekrarı çift vermez (1 sahiplik, 1 alım)', (await sahiplik(A)) === '1' && (await alimVar(A)) === '1');
  ok('takılı çerçeve kendiliğinden DEĞİŞMEDİ', await tek(`select takili_premium_cerceve is null from profiles where id='${A}'`) === 't');
  const kat = await dene(`select (select sahip from kozmetik_katalogu() where anahtar='${EJ}' limit 1)::text||':'||(select satilik from kozmetik_katalogu() where anahtar='${EJ}' limit 1)::text`);
  ok('sahibin katalogunda Ejderha görünür: sahip, satılık değil', kat.r === 'true:false', JSON.stringify(kat));
  d = await dene(`select kozmetik_tak('premium_cerceve', '${EJ}')`);
  ok('sahip Ejderhayı takabilir', !d.hata && await tek(`select takili_premium_cerceve from profiles where id='${A}'`) === EJ, JSON.stringify(d));

  console.log('— bp_odul_al (tek tek): BP sonradan, sonra seviye 28');
  await sifirla(); await spYap(300);
  await tek('select bp_satin_al()');
  ok("seviye 3'te BP alındı, çerçeve henüz yok", (await sahiplik(A)) === '0');
  await spYap(2800);
  d = await dene(`select bp_odul_al(28, 'ucretli')`);
  ok('bp_odul_al(28, ücretli) çerçeveyi verir', !d.hata && (await sahiplik(A)) === '1', JSON.stringify(d));
  d = await dene(`select bp_odul_al(28, 'ucretli')`);
  ok('ikinci alma reddedilir, sahiplik 1', Boolean(d.hata) && (await sahiplik(A)) === '1');

  console.log('— bp_toplu_al');
  await sifirla(); await spYap(300);
  await tek('select bp_satin_al()');
  await spYap(2800);
  await tek(`select bp_toplu_al()`);
  ok('bp_toplu_al seviye 28 ücretliyi de verir', (await sahiplik(A)) === '1' && (await alimVar(A)) === '1');

  console.log('— zaten sahip olan (ör. eski dükkân alımı): çift satır açılmaz, kaynak korunur');
  await sifirla(); await spYap(300);
  await tek('select bp_satin_al()');
  await db.sorgu(`insert into oyuncu_kozmetikleri (user_id, kozmetik, kaynak) values ('${A}', '${EJ}', 'dukkan')`);
  await spYap(2800);
  await tek(`select bp_odul_al(28, 'ucretli')`);
  ok('alım kaydı var, sahiplik hâlâ 1 ve kaynak dukkan kaldı', (await alimVar(A)) === '1' && (await sahiplik(A)) === '1'
    && await tek(`select kaynak from oyuncu_kozmetikleri where user_id='${A}' and kozmetik='${EJ}'`) === 'dukkan');

  console.log('— sezon_kapat: alınmamış hak otomatik verilir');
  await sifirla(); await spYap(300);
  await tek('select bp_satin_al()');
  await spYap(2800);
  await db.sorgu(`update sezonlar set bitis = now() - interval '1 minute', baslangic = now() - interval '28 days' where id=${sezon}`);
  await tek('select sezon_tik()');
  ok('sezon kapandı', await tek(`select kapandi_at is not null from sezonlar where id=${sezon}`) === 't');
  ok("BP'li seviye 28 oyuncuya çerçeve otomatik verildi", (await sahiplik(A)) === '1' && (await alimVar(A)) === '1');
  await tek('select sezon_tik()'); await tek(`select sezon_kapat(${sezon})`);
  ok('ikinci kapanış çift vermez', (await sahiplik(A)) === '1' && (await alimVar(A)) === '1');

  console.log("— sezon_kapat: BP'siz seviye 28 oyuncu çerçeve almaz");
  sezon = await tek(`select id from sezonlar where kapandi_at is null and not test`);   // kapanış yenisini açtı
  await sifirla(); await spYap(2800);
  await db.sorgu(`update sezonlar set bitis = now() - interval '1 minute', baslangic = now() - interval '28 days' where id=${sezon}`);
  await tek(`select sezon_kapat(${sezon})`);
  ok("BP'siz: çerçeve yok, ücretli alım kaydı yok", (await sahiplik(A)) === '0' && (await alimVar(A)) === '0');

  console.log('— dükkân: Ejderha satın alınamaz');
  await sifirla();
  await ben(A);
  d = await dene(`select kozmetik_satin_al('${EJ}')`);
  ok('kozmetik_satin_al reddedilir ("satılmıyor")', Boolean(d.hata) && /satılmıyor/.test(d.hata) && (await sahiplik(A)) === '0', JSON.stringify(d));
  ok('bakiye düşmedi', await tek(`select elmas from profiles where id='${A}'`) === '2000');
  ok('sahibi olmayanın katalogunda Ejderha yok', await tek(`select count(*) from kozmetik_katalogu() where anahtar='${EJ}'`) === '0');
  ok('başka premium çerçeve hâlâ satın alınabilir durumda', Number(await tek(`select count(*) from kozmetikler where tur='premium_cerceve' and anahtar<>'${EJ}' and aktif and kozmetik_satista(anahtar)`)) > 0);
  ok('gizli bot seçimi Ejderhayı içermez (bot_min_level 999)', await tek(`select bot_min_level from kozmetikler where anahtar='${EJ}'`) === '999');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
