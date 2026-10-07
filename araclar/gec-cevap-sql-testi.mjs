// 991 — "süre içinde işaretlenen cevap kabul" SQL provası. TEK transaction, sonunda ROLLBACK (canlıya yazmaz).
// Aynı senaryolar iki kez koşar: ÖNCE (canlıdaki fonksiyonlar = ölçüm) ve SONRA (991 transaction içinde uygulanır).
// Gecikme simülasyonu: transaction içinde now() sabittir; bitiş sütunları now()'a göre geri kaydırılır,
// tıklama anı `x-qt-tik` başlığıyla (request.headers) verilir. "2 sn kala + 4 sn gecikme" = bitiş now()-2, tık now()-4.
// Modlar: Ortak Hazine (cevap, Savunma dışı, Zaman Baskısı, bot, AÇ/DEVAM kararı) · Düello (cevap, Zaman Baskısı
// kişisel bitiş, bot, seçim fazı, kategori) · Klasik/Saf Bilgi (senkron) · Grup · Turnuva · Hatalarım.
// Kullanım: node araclar/gec-cevap-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612000991_cevap_gec_varis_payi.sql', import.meta.url), 'utf8');
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const satir = async (s) => (await db.sorgu(s))[0];
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
let SIMDI_MS = 0;
// tıklama anı: now() + sn (negatif = geçmiş); null = başlık yok (eski istemci)
const tik = (sn) => db.sorgu(`select set_config('request.headers', '${sn == null ? '{}' : JSON.stringify({ 'x-qt-tik': String(SIMDI_MS + Math.round(sn * 1000)) })}', true)`);
async function dene(sql) {
  await db.sorgu('savepoint s');
  try { await db.sorgu(sql); await db.sorgu('release savepoint s'); return 'KABUL'; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return e.message.replace(/^.*?:\s*/, '').slice(0, 60); }
}
const HEDEF = ['kasa_cevap', 'kasa_ilerlet', 'kasa_karar', 'duello2_cevap', 'duello2_ilerlet', 'duello2_kategori_sec',
  'submit_match_answer', 'advance_match', 'submit_group_match_answer', 'advance_group_match', 'submit_tournament_answer',
  'advance_tournament', 'calisma_cevap', 'duello_cevap', 'duello_kategori_sec', 'mac_soruyu_atla'];
const ACL = `select string_agg(p.oid::regprocedure::text || '=' || coalesce(p.proacl::text, '-'), ',' order by p.oid::regprocedure::text)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any(array[${HEDEF.map((x) => `'${x}'`).join(',')}])`;
const IMZA = ACL.replace("'=' || coalesce(p.proacl::text, '-')", "'=' || pg_get_function_result(p.oid)");

let A, B, BOT, SORULAR;
let turnuvaNo = 10;

// ---------------- Ortak Hazine ----------------
const kasaYeni = async (rakip = B) => {
  await ben(A); await tik(null);
  const id = await tek(`select kasa_olustur('${A}', '${rakip}', false, false)`);
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '30 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  return id;
};
const kasa = (id) => satir(`select faz, sahip::text, kasa::text, joker::text, cevaplar::text from kasa_maclari where id = '${id}'`);
const kasaDogru = async (id) => Number(await tek(`select q.dogru_cevap::text from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${id}'`));
const kasaCevap = async (id, u, c, tikSn) => { await ben(u); await tik(tikSn); return dene(`select kasa_cevap('${id}', ${c}::smallint)`); };
// bitiş = now() - (gecikme - kalan); tık = now() - gecikme
async function kasaGec(kalan, gecikme, { baslik = true, rakip = true } = {}) {
  const id = await kasaYeni();
  const dg = await kasaDogru(id);
  if (rakip) await kasaCevap(id, B, (dg + 1) % 4, null);
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - make_interval(secs => ${gecikme - kalan}) where id = '${id}'`);
  const r = await kasaCevap(id, A, dg, baslik ? -gecikme : null);
  const k = await kasa(id);
  const kayit = await tek(`select dogru::text from kasa_cevaplari where kasa_id = '${id}' and user_id = '${A}'`);
  return { r, faz: k.faz, dogru: kayit, sahipBen: k.sahip === A };
}

// ---------------- Düello ----------------
const duello = (id) => satir(`select faz, durum, saldiran::text, oyuncu1::text, oyuncu2::text, sahiplik::text, cevaplar::text, faz_bitis::text from duellolar where id = '${id}'`);
async function duelloFaz(id, hedef) {
  for (let i = 0; i < 60; i++) {
    const d = await duello(id);
    if (d.durum !== 'aktif') throw new Error(`düello bitti (${hedef} beklenirken)`);
    if (d.faz === hedef) return d;
    await db.sorgu(`update duellolar set faz_bitis = now() - interval '30 seconds',
      bitis1 = case when bitis1 is not null then now() - interval '30 seconds' end,
      bitis2 = case when bitis2 is not null then now() - interval '30 seconds' end where id = '${id}'`);
    await db.sorgu(`select duello2_ilerlet('${id}')`);
  }
  throw new Error(`${hedef} fazına gelinmedi`);
}
const duelloYeni = async (rakip = B) => { await ben(A); await tik(null); return tek(`select duello_olustur('${A}', '${rakip}', false, null)`); };
const duelloDogru = async (id) => Number(await tek(`select q.dogru_cevap::text from duellolar d join questions q on q.id = d.soru_id where d.id = '${id}'`));
const duelloCevap = async (id, u, c, tikSn) => { await ben(u); await tik(tikSn); return dene(`select duello_cevap('${id}', ${c}::smallint)`); };
// A'nın kişisel bitişi now() - (gecikme - kalan); rakibinki (bitisRakipSn) ayrı verilebilir (Zaman Baskısı)
async function duelloGec(kalan, gecikme, { rakip = B, rakipCevap = true, bitisRakipSn = null, baslik = true } = {}) {
  const id = await duelloYeni(rakip);
  const d = await duelloFaz(id, 'cevap');
  const dg = await duelloDogru(id);
  if (rakipCevap) {
    if (rakip === BOT) { await db.sorgu(`select duello2_bot_cevap('${id}', '${BOT}', ${(dg + 1) % 4}::smallint)`); }
    else await duelloCevap(id, rakip, (dg + 1) % 4, null);
  }
  const ben1 = d.oyuncu1 === A;
  const bA = `now() - make_interval(secs => ${gecikme - kalan})`;
  const bR = bitisRakipSn == null ? bA : `now() + make_interval(secs => ${bitisRakipSn})`;
  await db.sorgu(`update duellolar set bitis1 = ${ben1 ? bA : bR}, bitis2 = ${ben1 ? bR : bA},
    faz_bitis = greatest(${bA}, ${bR}) where id = '${id}'`);
  const r = await duelloCevap(id, A, dg, baslik ? -gecikme : null);
  const s = await duello(id);
  return { r, faz: s.faz, cevapVar: s.faz === 'cevap' ? JSON.parse(s.cevaplar)[A] != null : null };
}

// ---------------- Klasik (senkron) / Grup / Turnuva / Hatalarım ----------------
const dizi = () => `array[${SORULAR.map((x) => `'${x}'::uuid`).join(',')}]`;
const klasikDogru = async (id) => Number(await tek(`select q.dogru_cevap::text from matches m join questions q on q.id = m.soru_ids[m.aktif_soru + 1] where m.id = '${id}'`));
async function klasikYeni() {
  return tek(`insert into matches (oyuncu1, oyuncu2, durum, soru_ids, aktif_soru, soru_baslangic, senkron, basladi, dereceli, kabul_at)
    values ('${A}', '${B}', 'aktif', ${dizi()}, 0, now() - interval '5 seconds', true, true, false, now()) returning id`);
}
const klasikCevap = async (id, u, c, tikSn) => { await ben(u); await tik(tikSn); return dene(`select * from submit_match_answer('${id}', ${c}::smallint, 0)`); };

async function grupYeni() {
  const id = await tek(`insert into group_matches (kurucu, oyuncu_sayisi, durum, soru_ids, aktif_soru, soru_baslangic, basladi)
    values ('${A}', 3, 'aktif', ${dizi()}, 0, now() - interval '5 seconds', true) returning id`);
  await db.sorgu(`insert into group_match_players (group_match_id, user_id, davet_durumu, hazir, nabiz_at)
    values ('${id}', '${A}', 'kabul', true, now()), ('${id}', '${B}', 'kabul', true, now()), ('${id}', '${BOT}', 'kabul', true, now())`);
  return id;
}
async function turnuvaYeni() {
  const id = await tek(`insert into tournaments (tarih, seans, durum, soru_ids, aktif_soru, soru_baslangic)
    values (current_date + 900, '03:${++turnuvaNo}', 'aktif', ${dizi()}, 0, now() - interval '5 seconds') returning id`);
  await db.sorgu(`insert into tournament_players (tournament_id, user_id) values ('${id}', '${A}'), ('${id}', '${B}'), ('${id}', '${BOT}')`);
  return id;
}
const ilkDogru = async () => Number(await tek(`select dogru_cevap::text from questions where id = '${SORULAR[0]}'`));

// ---------------- Senaryolar ----------------
async function senaryolar() {
  const s = {};
  // Ortak Hazine
  s.kasa_i = await kasaGec(2, 4);                       // (i) 2 sn kala + 4 sn gecikme, rakip zamanında cevapladı
  s.kasa_ii = await kasaGec(-1.5, 0.5);                 // (ii) süre bittikten 1,5 sn sonra tık
  s.kasa_basliksiz = await kasaGec(2, 4, { baslik: false });   // eski istemci (bildirim yok)
  s.kasa_pay_disi = await kasaGec(1, 7);                // pay (5 sn) dışında varış
  {
    const id = await kasaYeni(); const dg = await kasaDogru(id);
    await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
    const ra = await kasaCevap(id, A, dg, -4), rb = await kasaCevap(id, B, dg, -3);
    s.kasa_iii = { ra, rb, faz: (await kasa(id)).faz };   // (iii) ikisi de geç ve aynı anda
  }
  {
    const id = await kasaYeni(); const dg = await kasaDogru(id);
    const ra = await kasaCevap(id, A, dg, -1), rb = await kasaCevap(id, B, (dg + 1) % 4, -1);
    s.kasa_beklemesiz = { ra, rb, faz: (await kasa(id)).faz };   // ikisi zamanında → hemen çözülür
  }
  {
    const id = await kasaYeni(); const dg = await kasaDogru(id);
    await kasaCevap(id, B, dg, null);
    await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
    await db.sorgu(`select kasa_ilerlet('${id}')`); const f2 = (await kasa(id)).faz;
    await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '5.5 seconds' where id = '${id}'`);
    await db.sorgu(`select kasa_ilerlet('${id}')`);
    s.kasa_bekleme = { f2, f55: (await kasa(id)).faz };   // A cevaplamadı: -2 sn'de beklenir, -5,5 sn'de kapanır
  }
  {
    // (iv) Zaman Baskısı: A, B'ye kullanır → B'nin kişisel bitişi erken
    const id = await kasaYeni(); const dg = await kasaDogru(id);
    await ben(A); await tik(null);
    const jr = await dene(`select kasa_joker('${id}', 'zaman_baskisi', false, false)`);
    const fark = Number(await tek(`select coalesce((joker -> '${B}' ->> 'fark')::numeric, 0)::text from kasa_maclari where id = '${id}'`));
    await db.sorgu(`update kasa_maclari set faz_bitis = now() - make_interval(secs => ${2 + fark}) where id = '${id}'`);   // B bitiş = now()-2
    const rGec = await kasaCevap(id, B, dg, 1.5 - 2 + 0);   // tık B bitişinden 1,5 sn SONRA (A'nın bitişi daha var)
    const rKabul = await kasaCevap(id, B, dg, -4);           // 2 sn kala + 4 sn gecikme
    s.kasa_zb = { jr, fark, rGec, rKabul };
  }
  {
    // (iv) bot rakip
    const id = await kasaYeni(BOT); const dg = await kasaDogru(id);
    await db.sorgu(`update kasa_maclari set bot_cevap_at = now() - interval '6 seconds', faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
    const r = await kasaCevap(id, A, dg, -4);
    s.kasa_bot = { r, faz: (await kasa(id)).faz, dogru: await tek(`select dogru::text from kasa_cevaplari where kasa_id = '${id}' and user_id = '${A}'`) };
  }
  {
    // AÇ/DEVAM kararı: süre bitiminden 1 sn sonra varan AÇ (1 sn kala tıklanmış)
    const kar = async (bitisSn, tikSn, ilerletSn = null) => {
      const id = await kasaYeni();
      await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = '${A}', kasa = 20, cevaplar = '{}'::jsonb,
        karar_baslangic = now() - interval '7 seconds', faz_bitis = now() - make_interval(secs => ${bitisSn}) where id = '${id}'`);
      if (ilerletSn != null) { await db.sorgu(`select kasa_ilerlet('${id}')`); return (await kasa(id)).faz; }
      await ben(A); await tik(tikSn);
      const r = await dene(`select kasa_karar('${id}', true)`);
      return { r, faz: (await kasa(id)).faz };
    };
    s.kasa_karar = await kar(1, -2);
    s.kasa_karar_basliksiz = await kar(1, null);
    s.kasa_karar_bekleme = { f1: await kar(1, null, true), f35: await kar(3.5, null, true) };
  }

  // Düello
  s.duello_i = await duelloGec(2, 4);
  s.duello_ii = await duelloGec(-1.5, 0.5);
  s.duello_basliksiz = await duelloGec(2, 4, { baslik: false });
  s.duello_zb = await duelloGec(2, 4, { bitisRakipSn: 5, rakipCevap: false });       // kişisel bitiş (Zaman Baskısı) erken, rakibinki ileride
  s.duello_zb_gec = await duelloGec(-1.5, 0.5, { bitisRakipSn: 5, rakipCevap: false });
  s.duello_bot = await duelloGec(2, 4, { rakip: BOT });
  {
    const id = await duelloYeni(); await duelloFaz(id, 'cevap'); const dg = await duelloDogru(id);
    await db.sorgu(`update duellolar set bitis1 = now() - interval '2 seconds', bitis2 = now() - interval '2 seconds', faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
    const ra = await duelloCevap(id, A, dg, -4), rb = await duelloCevap(id, B, dg, -3);
    s.duello_iii = { ra, rb, faz: (await duello(id)).faz };
  }
  {
    const id = await duelloYeni(); await duelloFaz(id, 'cevap'); const dg = await duelloDogru(id);
    const ra = await duelloCevap(id, A, dg, -1), rb = await duelloCevap(id, B, dg, -1);
    s.duello_beklemesiz = { ra, rb, faz: (await duello(id)).faz };
  }
  {
    const id = await duelloYeni(); await duelloFaz(id, 'cevap'); const dg = await duelloDogru(id);
    await duelloCevap(id, B, dg, null);
    const kay = async (sn) => { await db.sorgu(`update duellolar set bitis1 = now() - make_interval(secs => ${sn}), bitis2 = now() - make_interval(secs => ${sn}), faz_bitis = now() - make_interval(secs => ${sn}) where id = '${id}'`); await db.sorgu(`select duello2_ilerlet('${id}')`); return (await duello(id)).faz; };
    s.duello_bekleme = { f2: await kay(2), f55: await kay(5.5) };
  }
  {
    // seçim fazı: sıradaki oyuncu süre bitiminden 1 sn sonra varan seçim (1 sn kala tıkladı)
    const secim = async (tikSn, ilerletSn = null) => {
      const id = await duelloYeni(); const d = await duelloFaz(id, 'secim');
      const sahip = JSON.parse(d.sahiplik || '{}');
      const havuz = (await db.sorgu(`select unnest(duello2_secim_havuzu('${id}')) k`)).map((x) => x.k).filter((k) => !(k in sahip));
      await db.sorgu(`update duellolar set faz_bitis = now() - make_interval(secs => ${ilerletSn ?? 1}) where id = '${id}'`);
      if (ilerletSn != null) { await db.sorgu(`select duello2_ilerlet('${id}')`); const s2 = await duello(id); return s2.faz === 'secim' && s2.saldiran === d.saldiran && s2.sahiplik === d.sahiplik ? 'bekliyor' : 'otomatik seçildi'; }
      await ben(d.saldiran); await tik(tikSn);
      const r = await dene(`select duello_kategori_sec('${id}', '${havuz[0]}')`);
      const s2 = await duello(id);
      return { r, benimSecim: JSON.parse(s2.sahiplik || '{}')[havuz[0]] === d.saldiran };
    };
    s.duello_secim = await secim(-2);
    s.duello_secim_basliksiz = await secim(null);
    s.duello_secim_bekleme = { f1: await secim(null, 1), f35: await secim(null, 3.5) };
  }
  {
    // kategori seçimi (saldıran)
    const id = await duelloYeni(); const d = await duelloFaz(id, 'kategori');
    const kats = (await db.sorgu(`select k from (select distinct kategori k from questions) x where duello2_kategori_uygun_mu('${id}', k)`)).map((x) => x.k);
    await db.sorgu(`update duellolar set faz_bitis = now() - interval '1 second' where id = '${id}'`);
    await ben(d.saldiran); await tik(-2);
    const r = await dene(`select duello_kategori_sec('${id}', '${kats[0]}')`);
    s.duello_kategori = { r, faz: (await duello(id)).faz, kat: kats[0] ?? null };
  }

  // Klasik / Saf Bilgi (senkron): rakip zamanında cevapladı, rakibin yoklaması advance_match çağırdı, A geç vardı
  const klasik = async (kalan, gecikme, baslik = true) => {
    const id = await klasikYeni(); const dg = await klasikDogru(id);
    await klasikCevap(id, B, (dg + 1) % 4, null);
    await db.sorgu(`update matches set soru_baslangic = now() - make_interval(secs => ${15 + gecikme - kalan}) where id = '${id}'`);
    await ben(B); await tik(null); await db.sorgu(`select advance_match('${id}')`);
    const ilerledi = (await tek(`select aktif_soru::text from matches where id = '${id}'`)) !== '0';
    const r = await klasikCevap(id, A, dg, baslik ? -gecikme : null);
    return { r, rakipYoklamasiIlerletti: ilerledi };
  };
  s.klasik_i = await klasik(2, 5);          // 2 sn kala + 5 sn gecikme (Klasik'in eski toleransı 2 sn)
  s.klasik_ii = await klasik(-2.5, 0.5);    // bitişten 2,5 sn sonra tık
  s.klasik_basliksiz = await klasik(2, 5, false);
  {
    // süresi biten istemci mac_soruyu_atla ile "cevabım yok" dedi → beklemeden ilerler
    const id = await klasikYeni(); const dg = await klasikDogru(id);
    await klasikCevap(id, B, dg, null);
    await db.sorgu(`update matches set soru_baslangic = now() - interval '15.7 seconds' where id = '${id}'`);
    await ben(A); await tik(null); await db.sorgu(`select * from mac_soruyu_atla('${id}')`);
    await db.sorgu(`select advance_match('${id}')`);
    s.klasik_atla = { aktif: await tek(`select aktif_soru::text from matches where id = '${id}'`) };
  }

  // Grup: B ve bot zamanında; rakip yoklaması advance_group_match; A geç
  {
    const id = await grupYeni(); const dg = await ilkDogru();
    for (const u of [B, BOT]) { await ben(u); await tik(null); await dene(`select * from submit_group_match_answer('${id}', ${dg}::smallint, 0)`); }
    await db.sorgu(`update group_matches set soru_baslangic = now() - interval '17 seconds' where id = '${id}'`);
    await ben(B); await db.sorgu(`select advance_group_match('${id}')`);
    const ilerledi = (await tek(`select aktif_soru::text from group_matches where id = '${id}'`)) !== '0';
    await ben(A); await tik(-4);
    const r = await dene(`select * from submit_group_match_answer('${id}', ${dg}::smallint, 0)`);
    s.grup_i = { r, rakipYoklamasiIlerletti: ilerledi };
  }
  // Turnuva: B ve bot zamanında; advance_tournament; A geç (eskiden ELENİYORDU)
  {
    const id = await turnuvaYeni(); const dg = await ilkDogru();
    for (const u of [B, BOT]) { await ben(u); await tik(null); await dene(`select * from submit_tournament_answer('${id}', ${dg}::smallint, 0)`); }
    await db.sorgu(`update tournaments set soru_baslangic = now() - interval '17 seconds' where id = '${id}'`);
    await ben(B); await db.sorgu(`select advance_tournament('${id}')`);
    const ilerledi = (await tek(`select aktif_soru::text from tournaments where id = '${id}'`)) !== '0';
    await ben(A); await tik(-4);
    const r = await dene(`select * from submit_tournament_answer('${id}', ${dg}::smallint, 0)`);
    s.turnuva_i = { r, rakipYoklamasiIlerletti: ilerledi, elendi: await tek(`select elendi::text from tournament_players where tournament_id = '${id}' and user_id = '${A}'`) };
  }
  // Hatalarım (çalışma): 20 sn; geç varan doğru cevap "yanlış" sayılıyordu
  const calisma = async (tikSn) => {
    const id = await tek(`insert into calisma_oturumlari (user_id, soru_ids, banka_ids, aktif_soru, soru_baslangic, durum)
      values ('${A}', ${dizi()}, '{}', 0, now() - interval '22 seconds', 'aktif') returning id`);
    await ben(A); await tik(tikSn);
    const r = await satir(`select dogru::text from calisma_cevap('${id}', 0, ${await ilkDogru()}::smallint)`);
    return r?.dogru;
  };
  s.calisma_i = await calisma(-4);
  s.calisma_ii = await calisma(-0.5);
  return s;
}

try {
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '5s'");
  await db.sorgu("set local statement_timeout = '120s'");
  SIMDI_MS = Number(await tek(`select round(extract(epoch from now()) * 1000)::bigint::text`));
  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id; B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  BOT = await tek(`select id from profiles where is_bot order by created_at limit 1`);
  if (!A || !B || !BOT) throw new Error('test hesapları / bot yok');
  SORULAR = (await db.sorgu(`select id from questions where aktif order by created_at limit 5`)).map((x) => x.id);
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}', '${B}', '${BOT}')`);
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  await db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${A}', 'zaman_baskisi', 9) on conflict (user_id, tur) do update set adet = 9`);

  const canlidaVar = (await tek(`select exists(select 1 from supabase_migrations.schema_migrations where version = '20260612000991')::text`)) === 'true';
  console.log(`1) ÖNCE — canlı fonksiyonlar (ölçüm${canlidaVar ? '; 991 canlıda ZATEN var → bu tur da 991 ile koşar' : ''})`);
  const once = await senaryolar();
  for (const [k, v] of Object.entries(once)) console.log('   ', k.padEnd(24), JSON.stringify(v));

  const aclOnce = await tek(ACL), imzaOnce = await tek(IMZA);
  console.log('\n2) 991 uygulanıyor (transaction içinde, iki kez: tekrar uygulanabilir)');
  await db.sorgu(MIG); await db.sorgu(MIG);
  ok('16 hedef fonksiyonun yetkisi (proacl) birebir aynı', aclOnce === await tek(ACL));
  ok('imzalar / dönüş türleri aynı', imzaOnce === await tek(IMZA));
  ok('iç yardımcılar anon/authenticated için kapalı', (await tek(`select bool_and(not has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute'))::text from pg_proc p where p.proname in ('cevap_tik_ani', 'cevap_gec_kabul')`)) === 'true');
  ok('ayarlar: cevap_gec_varis_sn = 5, secim_gec_varis_sn = 3', (await tek(`select string_agg(anahtar || '=' || (deger #>> '{}'), ',' order by anahtar)
      from oyun_ayarlari where anahtar in ('cevap_gec_varis_sn', 'secim_gec_varis_sn')`)) === 'cevap_gec_varis_sn=5,secim_gec_varis_sn=3');
  await db.sorgu(`select set_config('request.headers', '{"x-qt-tik":"abc"}', true)`);
  ok('bozuk başlık → bildirim yok (null)', (await tek(`select coalesce(cevap_tik_ani()::text, 'null')`)) === 'null');
  await db.sorgu(`select set_config('request.headers', '{"x-qt-tik":"${SIMDI_MS + 60000}"}', true)`);
  ok('gelecekteki tık now()\'a kırpılır', (await tek(`select (cevap_tik_ani() = now())::text`)) === 'true');

  console.log('\n3) SONRA — aynı senaryolar 991 ile');
  const s = await senaryolar();
  for (const [k, v] of Object.entries(s)) console.log('   ', k.padEnd(24), JSON.stringify(v));
  console.log('');
  // Ortak Hazine
  ok('Kasa (i) 2 sn kala + 4 sn gecikme → KABUL, doğru sayıldı, hazine bende', s.kasa_i.r === 'KABUL' && s.kasa_i.dogru === 'true' && s.kasa_i.sahipBen, JSON.stringify(s.kasa_i));
  ok('Kasa (ii) süre bittikten sonra tık → RET', /Süre doldu/.test(s.kasa_ii.r), s.kasa_ii.r);
  ok('Kasa bildirimsiz (eski istemci) geç varış → RET (eski kural)', /Süre doldu/.test(s.kasa_basliksiz.r), s.kasa_basliksiz.r);
  ok('Kasa pay (5 sn) dışı varış → RET', s.kasa_pay_disi.r !== 'KABUL', s.kasa_pay_disi.r);
  ok('Kasa (iii) ikisi de geç ve aynı anda → ikisi KABUL, soru çözüldü', s.kasa_iii.ra === 'KABUL' && s.kasa_iii.rb === 'KABUL' && s.kasa_iii.faz === 'sonuc', JSON.stringify(s.kasa_iii));
  ok('Kasa ikisi zamanında → son cevapla HEMEN çözülür (bekleme yok)', s.kasa_beklemesiz.faz === 'sonuc', JSON.stringify(s.kasa_beklemesiz));
  ok('Kasa cevaplamayan: bitiş+2 sn hâlâ cevap fazı, bitiş+5,5 sn kapandı', s.kasa_bekleme.f2 === 'cevap' && s.kasa_bekleme.f55 === 'sonuc', JSON.stringify(s.kasa_bekleme));
  ok('Kasa (iv) Zaman Baskısı: kişisel bitişten sonra tık RET, 2 sn kala + 4 sn KABUL', s.kasa_zb.jr === 'KABUL' && s.kasa_zb.fark < 0 && /Süre doldu/.test(s.kasa_zb.rGec) && s.kasa_zb.rKabul === 'KABUL', JSON.stringify(s.kasa_zb));
  ok('Kasa (iv) bot rakip: geç varan doğru cevap KABUL', s.kasa_bot.r === 'KABUL' && s.kasa_bot.dogru === 'true', JSON.stringify(s.kasa_bot));
  ok('Kasa AÇ kararı 1 sn kala + gecikme → KABUL (DEVAM\'a çevrilmedi)', s.kasa_karar.r === 'KABUL', JSON.stringify(s.kasa_karar));
  ok('Kasa bildirimsiz geç karar → RET (karar verilemez)', /karar verilemez/.test(s.kasa_karar_basliksiz.r), JSON.stringify(s.kasa_karar_basliksiz));
  ok('Kasa karar süre dolumu: +1 sn bekler, +3,5 sn DEVAM uygulandı', s.kasa_karar_bekleme.f1 === 'karar' && s.kasa_karar_bekleme.f35 !== 'karar', JSON.stringify(s.kasa_karar_bekleme));
  // Düello
  ok('Düello (i) 2 sn kala + 4 sn gecikme → KABUL', s.duello_i.r === 'KABUL', JSON.stringify(s.duello_i));
  ok('Düello (ii) süre bittikten sonra tık → RET', /Süre doldu/.test(s.duello_ii.r), s.duello_ii.r);
  ok('Düello bildirimsiz geç varış → RET', s.duello_basliksiz.r !== 'KABUL', s.duello_basliksiz.r);
  ok('Düello (iv) kişisel bitiş (Zaman Baskısı) + gecikme → KABUL, rakibin süresi beklenir', s.duello_zb.r === 'KABUL' && s.duello_zb.faz === 'cevap' && s.duello_zb.cevapVar, JSON.stringify(s.duello_zb));
  ok('Düello (iv) kişisel bitişten sonra tık → RET (rakibin süresi olsa da)', /Süre doldu/.test(s.duello_zb_gec.r), s.duello_zb_gec.r);
  ok('Düello (iv) bot rakip: geç varan cevap KABUL', s.duello_bot.r === 'KABUL', JSON.stringify(s.duello_bot));
  ok('Düello (iii) ikisi de geç ve aynı anda → ikisi KABUL, çözüldü', s.duello_iii.ra === 'KABUL' && s.duello_iii.rb === 'KABUL' && s.duello_iii.faz !== 'cevap', JSON.stringify(s.duello_iii));
  ok('Düello ikisi zamanında → hemen çözülür (bekleme yok)', s.duello_beklemesiz.faz !== 'cevap', JSON.stringify(s.duello_beklemesiz));
  ok('Düello cevaplamayan: bitiş+2 sn bekler, bitiş+5,5 sn kapandı', s.duello_bekleme.f2 === 'cevap' && s.duello_bekleme.f55 !== 'cevap', JSON.stringify(s.duello_bekleme));
  ok('Düello seçim fazı: 1 sn kala + gecikme → KABUL, seçim benim', s.duello_secim.r === 'KABUL' && s.duello_secim.benimSecim, JSON.stringify(s.duello_secim));
  ok('Düello seçim bildirimsiz geç → RET', s.duello_secim_basliksiz.r !== 'KABUL', JSON.stringify(s.duello_secim_basliksiz));
  ok('Düello seçim süre dolumu: +1 sn bekler, +3,5 sn otomatik', s.duello_secim_bekleme.f1 === 'bekliyor' && s.duello_secim_bekleme.f35 === 'otomatik seçildi', JSON.stringify(s.duello_secim_bekleme));
  ok('Düello kategori seçimi 1 sn kala + gecikme → KABUL, soru açıldı', s.duello_kategori.r === 'KABUL' && s.duello_kategori.faz === 'cevap', JSON.stringify(s.duello_kategori));
  // Klasik / Grup / Turnuva / Hatalarım
  ok('Klasik (i) 2 sn kala + 5 sn gecikme → KABUL, rakip yoklaması soruyu erken geçirmedi', s.klasik_i.r === 'KABUL' && !s.klasik_i.rakipYoklamasiIlerletti, JSON.stringify(s.klasik_i));
  ok('Klasik (ii) süre bittikten sonra tık → RET', s.klasik_ii.r !== 'KABUL', JSON.stringify(s.klasik_ii));
  ok('Klasik bildirimsiz geç varış → RET', s.klasik_basliksiz.r !== 'KABUL', JSON.stringify(s.klasik_basliksiz));
  ok('Klasik süresi biten istemci atladı → beklemeden sonraki soru', s.klasik_atla.aktif === '1', JSON.stringify(s.klasik_atla));
  ok('Grup (i) geç varan cevap KABUL, soru erken geçmedi', s.grup_i.r === 'KABUL' && !s.grup_i.rakipYoklamasiIlerletti, JSON.stringify(s.grup_i));
  ok('Turnuva (i) geç varan doğru cevap KABUL, ELENMEDİ', s.turnuva_i.r === 'KABUL' && !s.turnuva_i.rakipYoklamasiIlerletti && s.turnuva_i.elendi === 'false', JSON.stringify(s.turnuva_i));
  ok('Hatalarım (i) geç varan doğru cevap doğru sayıldı', s.calisma_i === 'true', String(s.calisma_i));
  ok('Hatalarım (ii) süre bittikten sonra tık → yanlış', s.calisma_ii === 'false', String(s.calisma_ii));
  // ölçüm: önce kırmızı olmalıydı (hata gerçekten vardı) — yalnız 991 canlıya uygulanmadan önce anlamlı
  if (canlidaVar) console.log('  · ÖLÇÜM satırları atlandı (991 canlıda; önceki ölçüm PROGRESS.md 2026-10-07 kaydında)');
  else {
  ok('ÖLÇÜM: önce Kasa (i) reddediliyordu', once.kasa_i.r !== 'KABUL', JSON.stringify(once.kasa_i));
  ok('ÖLÇÜM: önce Düello (i) reddediliyordu', once.duello_i.r !== 'KABUL', JSON.stringify(once.duello_i));
  ok('ÖLÇÜM: önce Klasik (i) reddediliyordu', once.klasik_i.r !== 'KABUL', JSON.stringify(once.klasik_i));
  ok('ÖLÇÜM: önce Turnuva (i) reddediliyordu', once.turnuva_i.r !== 'KABUL', JSON.stringify(once.turnuva_i));
  }
} catch (e) {
  kaldi++;
  console.error('HATA:', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* bağlantı düştüyse işlem zaten geri alındı */ }
  console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı (ROLLBACK — canlıya yazılmadı)`);
  process.exit(kaldi ? 1 : 0);
}
