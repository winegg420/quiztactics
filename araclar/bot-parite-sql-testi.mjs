// BOT PARİTESİ 1126 SQL provası — TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz; test hesabı açılmaz).
// 1126 migration'ını transaction İÇİNDE uygular (canlıda zaten varsa yeniden uygular — create or replace) ve sınar:
//   · Yetki: iç fonksiyonlar/tablo istemciye kapalı; insan RPC'lerinin yetkisi değişmedi; rakip_jokerleri = joker_mac_durumu yetkisi
//   · Klasik: insan yolu aynı (joker_kullan / skill_hazirla); bot yeni türleri insanla aynı iç fonksiyondan kullanır, ücretsiz,
//     rakip_jokerleri insana gösterir; maç/tür/soru sınırı; jokersiz maç, rakip cevapladı, yüzde 0 → yok; Çifte Puan/Sigorta puanı
//   · Düello v4: insan yolu aynı; bot joker → duello_durum › skill.rakip_turler; Son Düello, 4 sınırı, rakip cevapladı, yüzde 0 → yok
//   · Tepki: 3 sn'de 1 ve maçta en çok 10 (bot_tepki_gonder); Düello v4 ve Hazine botu anlamlı anda tepki kuyruklar
//   · Hazine: bot cevap anı bot_gecikme_sn profilinden (profil 0 → eski 2–6 sn)
//   · Grup (1127): bot eski emoji sohbet mesajı yerine 4 bedava tepkiyi grup-mac-<id> kanalına kuyruklar
// Kullanım: IZIN_CANLI_TEST=1 node araclar/bot-parite-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

if (process.env.IZIN_CANLI_TEST !== '1') { console.log('IZIN_CANLI_TEST=1 gerekli (tek maç, tek işlem, ROLLBACK)'); process.exit(2); }
const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612001126_bot_parite.sql', import.meta.url), 'utf8');
const MIG2 = fs.readFileSync(new URL('../supabase/migrations/20260612001127_bot_grup_tepki.sql', import.meta.url), 'utf8');

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const json = async (s) => JSON.parse(await tek(s));
const ben = (u) => db.sorgu(u
  ? `select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`
  : `select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true)`);
async function hata(sql) {
  await db.sorgu('savepoint s');
  try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return null; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return e.message; }
}
const ayar = (a, v) => db.sorgu(`update oyun_ayarlari set deger = '${v}'::jsonb where anahtar = '${a}'`);
const acl = (imza) => tek(`select coalesce(proacl::text, '') from pg_proc where oid = 'public.${imza}'::regprocedure`);
const sayi = async (s) => Number(await tek(s));

const zamanAsimi = setTimeout(async () => {
  console.error('⏱ süre aşıldı — ROLLBACK'); try { await db.sorgu('rollback'); } catch { /* */ } await db.kapat(); process.exit(3);
}, 5 * 60 * 1000);

try {
  const INSAN_RPC = ['joker_kullan(text,uuid,integer,text)', 'skill_hazirla(text,uuid,integer,text)', 'joker_hak_kontrol(text,uuid,text)',
    'duello4_joker(uuid,text)', 'duello_durum(uuid)', 'duello4_durum(uuid)', 'submit_match_answer(uuid,smallint,integer)',
    'bot_tepki_gonder(text,uuid,text)', 'kasa_soru_ac(uuid,uuid)', 'kasa_savunma_ac(uuid)', 'bot_oyna()', 'duello4_bot_tik(uuid)'];
  const onceAcl = {};
  for (const f of INSAN_RPC) onceAcl[f] = await acl(f).catch(() => '?');

  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '30s'");

  console.log('1) Migration 1126 (transaction içinde) + yetkiler');
  await db.sorgu(MIG);
  await db.sorgu(MIG2);
  for (const f of INSAN_RPC) ok(`${f} yetkisi aynı`, (await acl(f)) === onceAcl[f], `${onceAcl[f]} → ${await acl(f)}`);
  for (const f of ['joker_hak_kontrol_ic(uuid,text,uuid,text)', 'joker_kullan_ic(uuid,text,uuid,integer,text)',
    'skill_hazirla_ic(uuid,text,uuid,integer,text)', 'bot_klasik_cevap(uuid,uuid,integer,uuid)', 'duello4_joker_ic(uuid,uuid,text)',
    'duello4_bot_joker(uuid,uuid)', 'trg_kasa_bot_tepki()', 'bot_tepki_grup(uuid,uuid,boolean)']) {
    ok(`${f} istemciye kapalı`, !/(anon|authenticated)=/.test(await acl(f)) && (await acl(f)) !== '', await acl(f));
  }
  ok('rakip_jokerleri yetkisi = joker_mac_durumu yetkisi', (await acl('rakip_jokerleri(text,uuid)')) === (await acl('joker_mac_durumu(text,uuid)')));
  ok('bot_tepki_gecmisi: RLS açık, yetki bot_tepki_bekleyen ile aynı',
    (await tek(`select (a.relrowsecurity and coalesce(a.relacl::text,'') = coalesce(b.relacl::text,''))::text from pg_class a, pg_class b
                where a.oid = 'public.bot_tepki_gecmisi'::regclass and b.oid = 'public.bot_tepki_bekleyen'::regclass`)) === 'true');
  ok('ayar kasa_bot_gecikme_profili = 1', (await tek(`select deger::text from oyun_ayarlari where anahtar = 'kasa_bot_gecikme_profili'`)) === '1');

  // Test hesabı: Ida (sahip) — CLAUDE.md; ROLLBACK → hesapta iz kalmaz. Rakip: gizli bot.
  const A = await tek(`select deger->>0 from oyun_ayarlari where anahtar = 'sahip_kullanicilar'`);
  const BOT = await tek(`select id::text from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by id limit 1`);
  if (!A || !BOT) throw new Error('hesap / bot yok');
  await ayar('jokerler_ucretsiz', '0');
  for (const t of ['elli', 'sure', 'ikinci_sans', 'soru_degistir', 'zaman_baskisi']) {
    await db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${A}', '${t}', 9) on conflict (user_id, tur) do update set adet = 9`);
  }
  await hata(`delete from rpc_sayac where user_id = '${A}'`);

  // ------------------------------------------------------------------ KLASİK
  console.log('2) Klasik — insan yolu aynı kurallar');
  const K = await tek(`insert into matches (oyuncu1, oyuncu2, durum, soru_ids, aktif_soru, soru_baslangic, senkron, basladi, dereceli,
      oyuncu1_soru, oyuncu2_soru, kategori, oyuncu1_hazir_at, oyuncu2_hazir_at)
    select '${A}', '${BOT}', 'aktif', array_agg(id), 0, now() - interval '9 seconds', true, true, true, 0, 0, null, now(), now()
      from (select id from questions order by id limit 20) q returning id::text`);
  const soruAc = (i, gec = 9) => db.sorgu(`update matches set aktif_soru = ${i}, oyuncu1_soru = ${i}, oyuncu2_soru = ${i},
      soru_baslangic = now() - make_interval(secs => ${gec}) where id = '${K}'`);
  const botK = (t) => sayi(`select count(*) from joker_kullanimlari where mac_tur = '1v1' and mac_id = '${K}' and user_id = '${BOT}'${t ? ` and tur = '${t}'` : ''}`);
  await ben(A);
  const surum0 = await sayi(`select joker_surum from matches where id = '${K}'`);
  ok('A 50:50 (joker_kullan) kabul', (await hata(`select joker_kullan('1v1', '${K}', 0, 'elli')`)) === null);
  ok('A aynı soruda İkinci Şans (skill_hazirla) → soru başı reddi', /Bu soruda/.test(await hata(`select skill_hazirla('1v1', '${K}', 0, 'ikinci_sans')`) || ''));
  ok('A envanterden düştü (elli 8)', (await tek(`select adet::text from joker_envanter where user_id = '${A}' and tur = 'elli'`)) === '8');
  ok('joker_surum arttı (rakip görsün)', (await sayi(`select joker_surum from matches where id = '${K}'`)) > surum0);
  await soruAc(1);
  ok('A İkinci Şans (skill_hazirla) yeni soruda kabul', (await hata(`select skill_hazirla('1v1', '${K}', 1, 'ikinci_sans')`)) === null);

  console.log('3) Klasik — bot bütün türleri insanla aynı fonksiyondan kullanır');
  await ben(null);
  await ayar('klasik_bot_joker_yuzde', '0');
  await soruAc(2);
  await db.sorgu('select bot_klasik_joker_tik()');
  ok('yüzde 0 → bot joker yok', (await botK()) === 0);
  await ayar('klasik_bot_joker_yuzde', '100');
  await soruAc(2, 1);
  await db.sorgu('select bot_klasik_joker_tik()');
  ok('an (2–8 sn) gelmeden denemez', (await botK()) === 0);
  await soruAc(2, 9);
  await db.sorgu('select bot_klasik_joker_tik()');
  ok('an gelince bot joker yazdı, ücretsiz', (await botK()) === 1
    && (await tek(`select bool_and(ucretsiz)::text from joker_kullanimlari where mac_id = '${K}' and user_id = '${BOT}'`)) === 'true');
  await ben(A);
  const rj = await tek(`select rakip_jokerleri('1v1', '${K}')::text`);
  const botTur = await tek(`select tur from joker_kullanimlari where mac_id = '${K}' and user_id = '${BOT}'`);
  ok(`rakip_jokerleri insana bot jokerini döndürür (${botTur})`, rj === `{${botTur}}`, rj);
  ok('rakip_jokerleri kendi jokerimi döndürmez (soru 1)', (await tek(`select rakip_jokerleri('1v1', '${K}')::text`)) === `{${botTur}}`);
  ok('maçta olmayan için boş', (await ben(BOT), await tek(`select rakip_jokerleri('1v1', '${K}')::text`)) === '{}');
  await ben(null);
  await db.sorgu('select bot_klasik_joker_tik()');
  ok('aynı soruda ikinci kez denemez', (await botK()) === 1);
  const turler = new Set([botTur]);
  for (let i = 3; i < 12; i++) {
    await soruAc(i, 9);
    await db.sorgu('select bot_klasik_joker_tik()');
    const t = await tek(`select tur from joker_kullanimlari where mac_id = '${K}' and user_id = '${BOT}' and soru_index = ${i}`);
    if (t) turler.add(t);
  }
  const top = await botK();
  const sinir = await sayi(`select deger::int from oyun_ayarlari where anahtar = 'klasik_skill_toplam_hak'`);
  ok(`bot maç sınırı (${top} = klasik_skill_toplam_hak ${sinir})`, top === sinir);
  const turMax = await sayi(`select max(n) from (select count(*) n from joker_kullanimlari where mac_id = '${K}' and user_id = '${BOT}' group by tur) x`);
  ok(`tür başı ≤ 2 (en çok ${turMax})`, turMax <= 2);
  ok(`yeni türler de kullanıldı: ${[...turler].join(', ')}`, [...turler].some((t) => !['zaman_baskisi', 'soru_degistir'].includes(t)));
  ok('pasif skill (Sis) denenmedi', (await botK('sis')) === 0);
  await db.sorgu(`delete from joker_kullanimlari where mac_id = '${K}' and user_id = '${BOT}'`);
  await soruAc(12, 9);
  await db.sorgu(`insert into match_answers (match_id, user_id, soru_index, cevap, dogru) values ('${K}', '${A}', 12, 0, false)`);
  await db.sorgu('select bot_klasik_joker_tik()');
  ok('rakip cevapladı → yok', (await botK()) === 0);
  await soruAc(13, 9);
  await db.sorgu(`update matches set jokersiz = true where id = '${K}'`);
  await db.sorgu('select bot_klasik_joker_tik()');
  ok('jokersiz maç (Saf Bilgi) → yok', (await botK()) === 0);
  ok('jokersiz maçta iç fonksiyon da reddeder', /kullanılamaz/.test(await hata(`select joker_kullan_ic('${BOT}', '1v1', '${K}', 13, 'elli')`) || ''));
  await db.sorgu(`update matches set jokersiz = false where id = '${K}'`);

  console.log('4) Klasik — botun jokeri puanına insanla aynı yansır');
  await soruAc(14, 9);
  await db.sorgu(`insert into joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz) values ('${BOT}', '1v1', '${K}', 14, 'cifte_puan', true)`);
  const q14 = await tek(`select soru_ids[15]::text from matches where id = '${K}'`);
  let r = (await db.sorgu(`select cevap::text c, puan::text p, (cevap = (select dogru_cevap from questions where id = '${q14}'))::text d
    from bot_klasik_cevap('${K}', '${BOT}', 14, '${q14}')`))[0];
  ok(`Çifte Puan: doğruysa 20, yanlışsa 0 (${r.d}/${r.p})`, (r.d === 'true' && r.p === '20') || (r.d === 'false' && r.p === '0'));
  await soruAc(15, 9);
  await db.sorgu(`insert into joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz) values ('${BOT}', '1v1', '${K}', 15, 'sigorta', true)`);
  const q15 = await tek(`select soru_ids[16]::text from matches where id = '${K}'`);
  r = (await db.sorgu(`select puan::text p, (cevap = (select dogru_cevap from questions where id = '${q15}'))::text d
    from bot_klasik_cevap('${K}', '${BOT}', 15, '${q15}')`))[0];
  ok(`Sigorta: doğruysa 10, yanlışsa 5 (${r.d}/${r.p})`, (r.d === 'true' && r.p === '10') || (r.d === 'false' && r.p === '5'));
  // submit_match_answer → bot hemen cevaplar (1088) ve puanı bot_klasik_cevap'tan
  await soruAc(16, 3);
  await db.sorgu(`insert into joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz) values ('${BOT}', '1v1', '${K}', 16, 'cifte_puan', true)`);
  const skor0 = await sayi(`select oyuncu2_skor from matches where id = '${K}'`);
  await ben(A);
  await hata(`delete from rpc_sayac where user_id = '${A}'`);
  const e1 = await hata(`select * from submit_match_answer('${K}', 0::smallint, 16)`);
  const bc = (await db.sorgu(`select dogru::text d from match_answers where match_id = '${K}' and user_id = '${BOT}' and soru_index = 16`))[0];
  const skor1 = await sayi(`select oyuncu2_skor from matches where id = '${K}'`);
  ok(`insan cevaplayınca bot hemen cevapladı, Çifte Puan puanı (${bc?.d} → +${skor1 - skor0})`,
    e1 === null && bc && ((bc.d === 'true' && skor1 - skor0 === 20) || (bc.d === 'false' && skor1 - skor0 === 0)), e1 || (db.uyarilar ?? []).slice(-3).join(' | '));
  await ben(null);

  // ------------------------------------------------------------------ DÜELLO v4
  console.log('5) Düello v4 — insan yolu ve bot jokeri');
  await db.sorgu(`update duellolar set durum = 'iptal' where durum = 'aktif' and (oyuncu1 in ('${A}','${BOT}') or oyuncu2 in ('${A}','${BOT}'))`);
  await db.sorgu(`update oyun_ayarlari set deger = '"acik"'::jsonb where anahtar = 'duello_v4_acik'`);
  const Dm = await tek(`select duello_olustur('${A}', '${BOT}', false)::text`);
  ok('Düello v4 açıldı', (await tek(`select surum::text from duellolar where id = '${Dm}'`)) === '4');
  const dSoru = (gec = 3) => db.sorgu(`update duellolar set faz = 'notr', soru_id = coalesce(soru_id, (select id from questions order by id limit 1)),
      soru_id1 = coalesce(soru_id1, soru_id, (select id from questions order by id limit 1)), soru_id2 = coalesce(soru_id2, soru_id, (select id from questions order by id limit 1)),
      giris1 = coalesce(giris1, now()), giris2 = coalesce(giris2, now()), v4_son = false, kopuk_at = null, cevaplar = '{}'::jsonb,
      soru_baslangic = now() - make_interval(secs => ${gec}), bitis1 = now() + interval '12 seconds', bitis2 = now() + interval '12 seconds',
      faz_bitis = now() + interval '12 seconds', elli1 = null, elli2 = null where id = '${Dm}'`);
  const botD = () => sayi(`select count(*) from joker_kullanimlari where mac_tur = 'duello' and mac_id = '${Dm}' and user_id = '${BOT}'`);
  await dSoru();
  await ben(A);
  ok('A 50:50 (duello4_joker) kabul', (await hata(`select duello4_joker('${Dm}', 'elli')`)) === null);
  ok('A aynı soruda ikinci joker → soru başı reddi', /Bu soruda/.test(await hata(`select duello4_joker('${Dm}', 'ikinci_sans')`) || ''));
  await ben(null);
  await db.sorgu(`update duellolar set v4_soru_no = v4_soru_no + 1 where id = '${Dm}'`);
  await ayar('duello_bot_joker_yuzde', '0'); await dSoru(20);
  ok('yüzde 0 → bot joker yok', (await tek(`select duello4_bot_joker('${Dm}', '${BOT}')::text`)) === 'false' && (await botD()) === 0);
  await ayar('duello_bot_joker_yuzde', '100'); await dSoru(0);
  ok('an gelmeden denemez', (await tek(`select duello4_bot_joker('${Dm}', '${BOT}')::text`)) === 'false');
  await dSoru(20);
  ok('an gelince bot joker yazdı', (await tek(`select duello4_bot_joker('${Dm}', '${BOT}')::text`)) === 'true' && (await botD()) === 1);
  const dTur = await tek(`select tur from joker_kullanimlari where mac_id = '${Dm}' and user_id = '${BOT}'`);
  await ben(A);
  const dd = await json(`select duello_durum('${Dm}')::text`);
  ok(`duello_durum › skill.rakip_turler insana bot jokerini döndürür (${dTur})`, JSON.stringify(dd.skill?.rakip_turler) === JSON.stringify([dTur]), JSON.stringify(dd.skill?.rakip_turler));
  await ben(null);
  ok('aynı soruda ikinci kez denemez', (await tek(`select duello4_bot_joker('${Dm}', '${BOT}')::text`)) === 'false' && (await botD()) === 1);
  for (let i = 0; i < 6; i++) {
    await db.sorgu(`update duellolar set v4_soru_no = v4_soru_no + 1 where id = '${Dm}'`); await dSoru(20);
    await db.sorgu(`select duello4_bot_joker('${Dm}', '${BOT}')`);
  }
  const dTop = await botD();
  ok(`bot maç sınırı 4 (${dTop})`, dTop === Number(await tek(`select deger::text from oyun_ayarlari where anahtar = 'duello2_skill_toplam_hak'`)));
  await db.sorgu(`delete from joker_kullanimlari where mac_id = '${Dm}' and user_id = '${BOT}'`);
  await db.sorgu(`update duellolar set v4_soru_no = v4_soru_no + 1 where id = '${Dm}'`); await dSoru(20);
  await db.sorgu(`update duellolar set v4_son = true, faz = 'son' where id = '${Dm}'`);
  ok('Son Düello → yok (insan kuralı: jokersiz)', (await tek(`select duello4_bot_joker('${Dm}', '${BOT}')::text`)) === 'false' && (await botD()) === 0);
  await dSoru(20);
  await db.sorgu(`update duellolar set cevaplar = jsonb_build_object('${A}', jsonb_build_object('cevap', 0, 'at', now())) where id = '${Dm}'`);
  ok('rakip cevapladı → yok', (await tek(`select duello4_bot_joker('${Dm}', '${BOT}')::text`)) === 'false');
  // Bot tik: joker + cevap aynı tikte; elli kullandıysa cevabı kapalı şık olamaz
  await db.sorgu(`update duellolar set v4_soru_no = v4_soru_no + 1 where id = '${Dm}'`); await dSoru(20);
  await db.sorgu(`select duello4_bot_tik('${Dm}')`);
  ok('duello4_bot_tik: bot joker kullandı ve cevapladı', (await botD()) === 1);

  // ------------------------------------------------------------------ TEPKİ
  console.log('6) Tepki sınırları (3 sn / maçta 10) ve Düello v4 + Hazine botu');
  await ayar('tepki_bot_olasilik', '1');
  const kanal = `tepki-test-${Date.now()}`;
  const bek = (k) => sayi(`select count(*) from bot_tepki_bekleyen where kanal = '${k}'`);
  await db.sorgu(`select bot_tepki_gonder('${kanal}', '${BOT}', 'dogru')`);
  await db.sorgu(`select bot_tepki_gonder('${kanal}', '${BOT}', 'dogru')`);
  ok('3 sn içinde ikinci tepki gitmez', (await bek(kanal)) === 1);
  await db.sorgu(`insert into bot_tepki_gecmisi (kanal, bot, zaman) select '${kanal}', '${BOT}', now() - make_interval(secs => 10 * g) from generate_series(1, 9) g`);
  await db.sorgu(`update bot_tepki_gecmisi set zaman = now() - interval '200 seconds' where kanal = '${kanal}' and zaman > now() - interval '1 second'`);
  await db.sorgu(`select bot_tepki_gonder('${kanal}', '${BOT}', 'dogru')`);
  ok('maçta 10 tepkiden sonra gitmez', (await bek(kanal)) === 1 && (await sayi(`select count(*) from bot_tepki_gecmisi where kanal = '${kanal}'`)) === 10);
  ok('tepki 4 ücretsizden (gizli botta paket ekleri olabilir)', /^(havali|ates|hedef|kas)$/.test(await tek(`select icerik from bot_tepki_bekleyen where kanal = '${kanal}'`)));
  // Düello v4: rakip hatası (son_hamle.oyuncular) → bot tepkisi
  const dk = `tepki-duello-${Dm}`;
  await db.sorgu(`update duellolar set son_hamle = jsonb_build_object('surum', 4, 'no', 99, 'oyuncular', jsonb_build_object(
      '${A}', jsonb_build_object('dogru', false), '${BOT}', jsonb_build_object('dogru', true))) where id = '${Dm}'`);
  ok('Düello v4: rakip hatası → bot tepkisi kuyrukta', (await bek(dk)) === 1);
  await db.sorgu(`update bot_tepki_gecmisi set zaman = now() - interval '60 seconds' where kanal = '${dk}'`);
  await db.sorgu(`update duellolar set durum = 'bitti', kazanan = '${BOT}' where id = '${Dm}'`);
  ok('Düello v4: maç sonu → bot tepkisi', (await bek(dk)) === 2);

  // ------------------------------------------------------------------ HAZİNE
  console.log('7) Hazine — tepki ve bot cevap süresi');
  const H = await tek(`select kasa_olustur('${A}', '${BOT}', false, false)::text`);
  await db.sorgu(`update kasa_maclari set ekran1 = coalesce(ekran1, now()) where id = '${H}'`);
  await db.sorgu(`select kasa_ilerlet('${H}')`);
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${H}'`);
  await db.sorgu(`select kasa_ilerlet('${H}')`);
  const h = (await db.sorgu(`select k.faz, k.tur::text, k.soru_id::text, extract(epoch from k.bot_cevap_at - k.soru_baslangic - kasa_gosterim_payi())::float8::text g,
      bot_gecikme_sn(k.bot, k.id::text || ':' || k.tur || ':' || k.soru_id::text, p.bot_gecikme_min, p.bot_gecikme_max, soru_okuma_yuku(k.soru_id))::text b,
      k.soru_sn::text sn from kasa_maclari k join profiles p on p.id = k.bot where k.id = '${H}'`))[0];
  ok(`bot cevap anı bot_gecikme_sn profilinden (${Number(h.g).toFixed(2)} sn = ${Number(h.b).toFixed(2)} sn)`, h.faz === 'cevap'
    && Math.abs(Number(h.g) - Math.min(Number(h.b), Number(h.sn) - 1)) < 0.05, JSON.stringify(h));
  await ayar('kasa_bot_gecikme_profili', '0');
  await db.sorgu(`select kasa_soru_ac('${H}')`);
  const g0 = Number(await tek(`select extract(epoch from bot_cevap_at - soru_baslangic - kasa_gosterim_payi())::float8::text from kasa_maclari where id = '${H}'`));
  ok(`profil 0 → eski 2–6 sn (${g0.toFixed(2)})`, g0 >= 2 && g0 <= 6);
  const hk = `tepki-kasa-${H}`;
  const htur = await tek(`select tur::text from kasa_maclari where id = '${H}'`);
  const ben1 = (await tek(`select (oyuncu1 = '${A}')::text from kasa_maclari where id = '${H}'`)) === 'true';
  await db.sorgu(`insert into kasa_hamleler (kasa_id, tur) select '${H}', ${htur} where not exists (select 1 from kasa_hamleler where kasa_id = '${H}' and tur = ${htur})`);
  await db.sorgu(`update kasa_hamleler set dogru1 = ${ben1 ? 'false' : 'true'}, dogru2 = ${ben1 ? 'true' : 'false'} where kasa_id = '${H}' and tur = ${htur}`);
  ok('Hazine: rakip hatası → bot tepkisi kuyrukta', (await bek(hk)) === 1);
  await db.sorgu(`update bot_tepki_gecmisi set zaman = now() - interval '60 seconds' where kanal = '${hk}'`);
  await db.sorgu(`update kasa_maclari set durum = 'bitti', kazanan = '${A}', bitis = now() where id = '${H}'`);
  ok('Hazine: maç sonu → bot tepkisi (saygı)', (await bek(hk)) === 2 && /^(alkis|tac|selam|rica)$/.test(
    await tek(`select icerik from bot_tepki_bekleyen where kanal = '${hk}' order by id desc limit 1`)));
  // ------------------------------------------------------------------ GRUP (1127)
  console.log('8) Grup — bot 4 bedava tepkiyi maç kanalına yollar (eski emoji sohbeti yok)');
  const G = await tek(`insert into group_matches (kurucu, oyuncu_sayisi, durum, soru_ids, aktif_soru, soru_baslangic, basladi)
    select '${A}', 3, 'aktif', array_agg(id), 3, now() - interval '20 seconds', true from (select id from questions order by id limit 20) q returning id::text`);
  await db.sorgu(`insert into group_match_players (group_match_id, user_id, davet_durumu, hazir, nabiz_at) values
    ('${G}', '${A}', 'kabul', true, now()), ('${G}', '${BOT}', 'kabul', true, now())`);
  await db.sorgu(`insert into group_match_answers (group_match_id, user_id, soru_index, cevap, dogru) values ('${G}', '${A}', 3, 0, false)`);
  const mesaj0 = await sayi(`select count(*) from group_match_messages where group_match_id = '${G}'`);
  await db.sorgu(`select bot_grup_adimlari('${G}')`);
  ok('Grup: bot cevapladı', (await sayi(`select count(*) from group_match_answers where group_match_id = '${G}' and user_id = '${BOT}'`)) === 1);
  ok('Grup: rakip hatası → yeni tepki grup-mac kanalında', (await bek(`grup-mac-${G}`)) === 1
    && /^(havali|terli|dusunen|alkis|ates|hedef|kas|gulen|korku)$/.test(await tek(`select icerik from bot_tepki_bekleyen where kanal = 'grup-mac-${G}'`)));
  ok('Grup: eski emoji sohbet mesajı yazılmadı', (await sayi(`select count(*) from group_match_messages where group_match_id = '${G}'`)) === mesaj0
    && (await sayi(`select count(*) from bot_tepki_bekleyen where tur = 'grup_mesaj' and hedef_id = '${G}'`)) === 0);
  ok('bot_oyna: tepki-* özel, grup-mac açık kanal',
    (await tek(`select pg_get_functiondef('public.bot_oyna'::regproc)`)).includes("'tepki', r.kanal, r.kanal like 'tepki-%')"));
  await ayar('tepki_bot_olasilik', '0');
  await db.sorgu(`select bot_tepki_gonder('tepki-test-0', '${BOT}', 'dogru')`);
  ok('tepki_bot_olasilik 0 → hiç yok', (await bek('tepki-test-0')) === 0);
} catch (e) {
  kaldi++;
  console.log('  ✗ HATA', e.message);
} finally {
  clearTimeout(zamanAsimi);
  try { await db.sorgu('rollback'); } catch { /* bağlantı düştüyse işlem zaten geri alındı */ }
  const kalan = await tek(`select count(*)::text from oyun_ayarlari where anahtar = 'kasa_bot_gecikme_profili'`).catch(() => '?');
  console.log(`ROLLBACK — canlıda kasa_bot_gecikme_profili satırı: ${kalan} (uygulamadan önce 0)`);
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  await db.kapat?.();
  process.exit(kaldi ? 1 : 0);
}
