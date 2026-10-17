// ORTAK HAZİNE 1125 (bot joker kullanır) SQL provası — TEK maç, TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
// 1125 migration'ını transaction İÇİNDE uygular ve sınar:
//   · Ayar kasa_bot_joker_yuzde 15; iç fonksiyonlar istemciye kapalı, kasa_joker yetkisi aynı
//   · İnsan yolu (kasa_joker) aynı kurallar: kabul, soru başı reddi
//   · Bot: an gelmeden denemez; an gelince joker yazar (joker_kullanimlari ucretsiz, k.joker.turler) ve
//     kasa_durum › rakip_joker insana bu türü döndürür; aynı soruda ikinci kez denemez
//   · Bot da insanla AYNI sınırlardan geçer (toplam 4, İkinci Şans 1, 50:50 2, Ek Süre 2)
//   · Yüzde 0 / Altın Soru / jokersiz maç / rakip cevapladı / Savunma'da izleyen bot → joker yok
// Kullanım: IZIN_CANLI_TEST=1 node araclar/kasa-bot-joker-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612001125_kasa_bot_joker.sql', import.meta.url), 'utf8');

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
async function hata(sql) {
  await db.sorgu('savepoint s');
  try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; }
}

try {
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '30s'");

  console.log('1) Migration 1125 (transaction içinde)');
  await db.sorgu(MIG);
  ok('ayar kasa_bot_joker_yuzde = 15', (await tek(`select deger::text from oyun_ayarlari where anahtar = 'kasa_bot_joker_yuzde'`)) === '15');
  const yetki = (f, r) => tek(`select has_function_privilege('${r}', '${f}', 'execute')::text`);
  ok('kasa_joker: authenticated var, anon yok',
    (await yetki('public.kasa_joker(uuid,text,boolean,boolean)', 'authenticated')) === 'true'
    && (await yetki('public.kasa_joker(uuid,text,boolean,boolean)', 'anon')) === 'false');
  for (const f of ['public.kasa_joker_ic(uuid,uuid,text,boolean,boolean)', 'public.kasa_bot_joker(uuid)', 'public.kasa_ilerlet(uuid)']) {
    ok(`${f} istemciye kapalı`, (await yetki(f, 'authenticated')) === 'false' && (await yetki(f, 'anon')) === 'false');
  }

  // İnsan taraf: sahip hesabı (CLAUDE.md: test Ida'nın hesabıyla; ROLLBACK → hesapta iz kalmaz)
  const A = await tek(`select deger->>0 from oyun_ayarlari where anahtar = 'sahip_kullanicilar'`);
  const BOT = await tek(`select id::text from profiles where coalesce(is_bot, false) order by id limit 1`);
  if (!A || !BOT) throw new Error('test hesabı / bot yok');
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  for (const t of ['elli', 'sure', 'zaman_baskisi', 'ikinci_sans']) {
    await db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${A}', '${t}', 9) on conflict (user_id, tur) do update set adet = 9`);
  }
  const id = await tek(`select kasa_olustur('${A}', '${BOT}', false, false)::text`);
  await db.sorgu(`update kasa_maclari set jokerli = true, ekran1 = coalesce(ekran1, now()) where id = '${id}'`);
  ok('maçta bot var', (await tek(`select bot::text from kasa_maclari where id = '${id}'`)) === BOT);
  await db.sorgu(`select kasa_ilerlet('${id}')`);   // giriş kapısı → başlangıç fazı kurulur
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  ok('maç soru fazında', (await tek(`select faz from kasa_maclari where id = '${id}'`)) === 'cevap');

  const yuzde = (n) => db.sorgu(`update oyun_ayarlari set deger = '${n}' where anahtar = 'kasa_bot_joker_yuzde'`);
  // Yeni soru taklidi: tur +1, soru başı joker/cevap sıfır; soru "gec" sn önce oynanabilir oldu, bot 5 sn sonra cevaplayacak
  const yeniSoru = (gec = 3) => db.sorgu(`update kasa_maclari set tur = tur + 1, joker = '{}'::jsonb, cevaplar = '{}'::jsonb,
     faz = 'cevap', altin = false, savunma = null, kopuk_at = null,
     soru_baslangic = now() - kasa_gosterim_payi() - make_interval(secs => ${gec}),
     faz_bitis = now() + interval '12 seconds', bot_cevap = 0, bot_cevap_at = now() + interval '5 seconds' where id = '${id}'`);
  const botTurler = async () => JSON.parse(await tek(`select coalesce(joker -> bot::text -> 'turler', '[]')::text from kasa_maclari where id = '${id}'`));
  const botSayi = (t) => tek(`select count(*)::text from joker_kullanimlari where user_id = '${BOT}' and mac_tur = 'kasa' and mac_id = '${id}'${t ? ` and tur = '${t}'` : ''}`).then(Number);
  const ilerlet = () => db.sorgu(`select kasa_ilerlet('${id}')`);

  console.log('2) İnsan yolu (kasa_joker sarmalayıcı) — kurallar aynı');
  await yuzde(0);
  await yeniSoru();
  await ben(A);
  ok('A 50:50 kabul', (await hata(`select kasa_joker('${id}', 'elli', false, false)`)) === null);
  ok('A aynı soruda Ek Süre → soru başı reddi', /Bu soruda/.test(await hata(`select kasa_joker('${id}', 'sure', false, false)`) || ''));
  ok('A envanterden düştü (elli 8)', (await tek(`select adet::text from joker_envanter where user_id = '${A}' and tur = 'elli'`)) === '8');
  ok('yüzde 0 → bot joker yok', (await ilerlet(), (await botTurler()).length === 0 && (await botSayi()) === 0));

  console.log('3) Bot joker (yüzde 100)');
  await yuzde(100);
  await yeniSoru(0);   // soru şimdi açıldı: an (cevaba kadar sürenin %20–60'ı) henüz gelmedi
  await ilerlet();
  ok('an gelmeden denemez', (await botTurler()).length === 0);
  await yeniSoru(4.5);
  await ilerlet();
  const t1 = await botTurler();
  ok('an gelince bot joker yazdı (k.joker.turler)', t1.length === 1, JSON.stringify(t1));
  ok('joker_kullanimlari: bot satırı, ucretsiz', (await tek(`select count(*)::text from joker_kullanimlari where user_id = '${BOT}' and mac_id = '${id}' and ucretsiz`)) === '1');
  await ben(A);
  const d = await json(`select kasa_durum('${id}')::text`);
  ok('kasa_durum › rakip_joker insana bot jokerini döndürür', JSON.stringify(d.rakip_joker) === JSON.stringify(t1), JSON.stringify(d.rakip_joker));
  ok('bot henüz cevaplamadı (joker cevaptan önce)', !(d.cevaplar && d.cevaplar[BOT]) && (await tek(`select (cevaplar ? bot::text)::text from kasa_maclari where id = '${id}'`)) === 'false');
  await ilerlet();
  ok('aynı soruda ikinci kez denemez', (await botTurler()).length === 1 && (await botSayi()) === 1);

  console.log('4) Bot sınırları insanla aynı');
  for (let i = 0; i < 6; i++) { await yeniSoru(4.5); await ilerlet(); }
  const top = await botSayi();
  ok(`bot toplam ≤ 4 (${top})`, top === 4);
  ok('İkinci Şans ≤ 1, 50:50 ≤ 2, Ek Süre ≤ 2, Zaman Baskısı ≤ 3',
    (await botSayi('ikinci_sans')) <= 1 && (await botSayi('elli')) <= 2 && (await botSayi('sure')) <= 2 && (await botSayi('zaman_baskisi')) <= 3);
  await yeniSoru(4.5); await ilerlet();
  ok('hak bitince denemez, bu soruda turler boş', (await botTurler()).length === 0 && (await botSayi()) === 4);

  console.log('5) Joker olmayan durumlar (yeni sayaç için bot kayıtları silinir)');
  await db.sorgu(`delete from joker_kullanimlari where user_id = '${BOT}' and mac_id = '${id}'`);
  await yeniSoru(4.5); await db.sorgu(`update kasa_maclari set altin = true where id = '${id}'`); await ilerlet();
  ok('Altın Soru → yok', (await botSayi()) === 0);
  await yeniSoru(4.5); await db.sorgu(`update kasa_maclari set jokerli = false where id = '${id}'`); await ilerlet();
  ok('jokersiz maç → yok', (await botSayi()) === 0);
  await db.sorgu(`update kasa_maclari set jokerli = true where id = '${id}'`);
  await yeniSoru(4.5);
  await db.sorgu(`update kasa_maclari set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap', 0, 'at', now())) where id = '${id}'`);
  await ilerlet();
  ok('rakip cevapladı → yok', (await botSayi()) === 0);
  await yeniSoru(4.5);
  await db.sorgu(`update kasa_maclari set savunma = jsonb_build_object('durum', 'soru', 'sahip', '${A}', 'rakip', '${BOT}') where id = '${id}'`);
  await ilerlet();
  ok('Savunma Sorusunda izleyen bot → yok', (await botSayi()) === 0);
  await yeniSoru(4.5);
  await db.sorgu(`update kasa_maclari set savunma = jsonb_build_object('durum', 'soru', 'sahip', '${BOT}', 'rakip', '${A}') where id = '${id}'`);
  await ilerlet();
  const sv = await tek(`select string_agg(tur || '@' || soru_index, ',') from joker_kullanimlari where user_id = '${BOT}' and mac_id = '${id}'`);
  const tur = Number(await tek(`select tur::text from kasa_maclari where id = '${id}'`));
  ok('Savunma Sorusunda savunan bot joker kullanır (Zaman Baskısı değil, soru_index = -tur)',
    !!sv && !sv.startsWith('zaman_baskisi') && sv.endsWith('@' + (-tur)), sv);
} catch (e) {
  kaldi++;
  console.log('  ✗ HATA', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* bağlantı düştüyse transaction zaten geri alındı */ }
  const kalan = await tek(`select count(*)::text from oyun_ayarlari where anahtar = 'kasa_bot_joker_yuzde'`).catch(() => '?');
  console.log(`ROLLBACK — canlıda kasa_bot_joker_yuzde satırı: ${kalan} (uygulamadan önce 0 olmalı)`);
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  await db.kapat?.();
  process.exit(kaldi ? 1 : 0);
}
