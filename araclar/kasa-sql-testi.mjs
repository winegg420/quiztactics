// KASA modu (950 + 951 + 952 + 953 + 954) SQL provası — TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
//
// Sıra:
//   0) Ön kontrol (salt okunur): turnuva saatleri + aktif maç/düello/grup/turnuva. Önümüzdeki 30 dk'da
//      seans ya da aktif oyun varsa test ÇALIŞMAZ (çıkış kodu 2).
//   1) BEGIN, kısa lock_timeout/statement_timeout.
//   2) REGRESYON (önce): Klasik + Düello gerçek maçlarıyla cift_odul_carpani, xp_mac_odulu,
//      sezon_puani_ekle, mac_sonu_ozet çıktıları (yan etkiler savepoint ile geri alınır).
//   3) Migration'lar: 950 canlıda değilse önce o (">>> TEST DIŞI" sonrası — cron + realtime — çalıştırılmaz),
//      sonra 951 (uzunluk 50/36, kasa_acma_min, joker), 952 (giriş sahnesi), 953 (DEVAM ödülü), 954 (DEVAM bırakır + ücretsiz 50:50). 950 canlıdaysa 951–954.
//   4) REGRESYON (sonra): aynı girdiler, çıktılar birebir aynı olmalı. Fark varsa durur. Ortak joker
//      fonksiyonları (joker_kullan, skill_kullanim_kapisi, joker_hareket …) migration'dan sonra da aynı md5.
//   5) KASA kuralları (951: hedef 50 · 36 tur · AÇ alt sınırı 10), ödül, sızıntı, bot, kopukluk, kapalı mod,
//      JOKER (50:50 · Ek Süre · Zaman Baskısı · İkinci Şans, sınırlar, envanter, al-ve-kullan, sızıntı),
//      953 DEVAM ödülü (ihtimal + bag, süre dolumu, alt sınır, ücretsiz joker envanter/coin/sınır, gizlilik, bot — süren 953 maçı olarak),
//      954 DEVAM bırakır (tek bilen / ikisi bilir / ikisi yanlış, süre dolumu, kasa < 10, AÇ hak bitişi, maç sonu sahipsiz,
//      ücretsiz 50:50 her soruda, gizlilik, bot), yetkiler.
//   6) ROLLBACK + ortak fonksiyonların tanımı (md5) migration öncesiyle aynı mı, şema/ayarlar eski hâlinde mi.
//
// Kullanım: node araclar/kasa-sql-testi.mjs [--zorla]   (--zorla: ön kontrol uyarısını atlar)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = new URL('../supabase/migrations/20260612000950_kasa_modu.sql', import.meta.url);
const MIG951 = new URL('../supabase/migrations/20260612000951_kasa_uzunluk_joker.sql', import.meta.url);
const MIG952 = new URL('../supabase/migrations/20260612000952_kasa_baslangic_giris_sahnesi.sql', import.meta.url);
const MIG953 = new URL('../supabase/migrations/20260612000953_kasa_devam_odulu.sql', import.meta.url);
const MIG954 = new URL('../supabase/migrations/20260612000954_kasa_devam_birakir.sql', import.meta.url);
const ZORLA = process.argv.includes('--zorla');
const ORTAK = ['cift_odul_carpani', 'xp_mac_odulu', 'sezon_puani_ekle', 'gorev_olcum', 'gorev_dogru_satirlari',
  'gorev_sayaci', 'odul_dokumu', 'level_kazancim', 'mac_sonu_ozet', 'trg_iletisim_engel',
  // 951: Klasik joker sistemi — Kasa bunları ÇAĞIRIR, değiştirmez
  'joker_kullan', 'joker_hak_kontrol', 'joker_mac_siniri', 'skill_kullanim_kapisi', 'joker_hareket',
  'joker_mac_durumu', 'joker_al_ve_kullan', 'skill_hazirla', 'skill_al_ve_hazirla', 'jokerler_serbest',
  'coin_harca', 'joker_fiyati', 'joker_ucretsiz_elli_hakki'];

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
const ortakMd5 = () => db.sorgu(`select p.oid::regprocedure::text imza, md5(pg_get_functiondef(p.oid)) h
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = any(array[${ORTAK.map((x) => `'${x}'`).join(',')}]) order by 1`);

try {
  // ---------------------------------------------------------------- 0) ön kontrol
  console.log('0) Ön kontrol (salt okunur)');
  const on = (await db.sorgu(`select
      (select deger::text from oyun_ayarlari where anahtar = 'turnuva_saatleri') saatler,
      (now() at time zone 'Europe/Istanbul')::text tsi,
      (select count(*) from matches where durum = 'aktif')::text mac,
      (select count(*) from duellolar where durum = 'aktif')::text duello,
      (select count(*) from group_matches where durum = 'aktif')::text grup,
      (select count(*) from tournaments where durum not in ('bitti', 'iptal'))::text turnuva_acik,
      (select string_agg(durum || ':' || n, ', ') from (select durum, count(*) n from tournaments
         where coalesce(baslangic, created_at) > now() - interval '1 day' group by durum) x) turnuva_durumlari,
      (select string_agg(to_char(baslangic at time zone 'Europe/Istanbul', 'HH24:MI'), ', ')
         from tournaments where baslangic between now() - interval '30 minutes' and now() + interval '30 minutes') yakin_seans`))[0];
  console.log('  ', JSON.stringify(on));
  const tsi = new Date(on.tsi.replace(' ', 'T') + 'Z');   // TSİ duvar saati (UTC gibi okunur)
  const dk = tsi.getUTCHours() * 60 + tsi.getUTCMinutes();
  const saatler = (JSON.parse(on.saatler || '[]') || []).map(String);
  const yakin = saatler.filter((s) => {
    const [h, m] = s.split(':').map(Number);
    const hedef = ((h % 24) * 60 + (m || 0));
    const fark = (hedef - dk + 1440) % 1440;
    return fark <= 30 || fark >= 1440 - 5;   // önümüzdeki 30 dk ya da 5 dk önce başlamış
  });
  const aktifVar = Number(on.mac) + Number(on.duello) + Number(on.grup) > 0 || !!on.yakin_seans;
  if ((yakin.length || aktifVar) && !ZORLA) {
    console.log(`  ⏸ BEKLE: yakın seans [${yakin.join(', ')}] · aktif maç ${on.mac} · düello ${on.duello} · grup ${on.grup} · yakın turnuva ${on.yakin_seans ?? '-'}`);
    process.exitCode = 2;
    throw new Error('ön kontrol: bekle');
  }
  console.log(`  tamam: yakın seans yok (${saatler.join(', ')}), aktif oyun yok`);

  const md5Once = await ortakMd5();

  // ---------------------------------------------------------------- 1) işlem
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '30s'");

  // Test hesapları (misafir test hesapları) + gizli bot + açık bot
  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648') order by takma_ad`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id;
  const B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  if (!A || !B) throw new Error('test hesapları bulunamadı');
  const BOT = await tek(`select id from profiles where is_bot and bot_turu = 'gizli' and coalesce(bot_aktif, true) order by id limit 1`);
  const ACIK = await tek(`select id from profiles where is_bot and coalesce(acik_bot, false) and coalesce(bot_aktif, true) order by id limit 1`);
  console.log(`  A=${A} B=${B} gizliBot=${BOT} açıkBot=${ACIK}`);

  // ---------------------------------------------------------------- 2) regresyon girdileri
  const KM = (await db.sorgu(`select m.id, m.oyuncu1, m.oyuncu2, m.kazanan from matches m
      join profiles p on p.id = m.oyuncu1 and not coalesce(p.is_bot, false)
     where m.durum = 'bitti' and m.oyuncu2 is not null order by m.bitis desc nulls last limit 1`))[0];
  const DM = (await db.sorgu(`select d.id, d.oyuncu1, d.oyuncu2, d.kazanan from duellolar d
      join profiles p on p.id = d.oyuncu1 and not coalesce(p.is_bot, false)
     where d.durum = 'bitti' order by d.bitis desc nulls last limit 1`))[0];
  console.log(`  Klasik örnek ${KM.id} · Düello örnek ${DM.id}`);

  async function olc() {
    const s = {};
    for (const [ad, m] of [['klasik', KM], ['duello', DM]]) {
      s[`cift_${ad}`] = await tek(`select cift_odul_carpani('${m.oyuncu1}', '${m.oyuncu2}', null)::text`);
      s[`cift_${ad}_haric`] = await tek(`select cift_odul_carpani('${m.oyuncu1}', '${m.oyuncu2}', '${m.id}')::text`);
      const mod = ad === 'klasik' ? 'mac' : 'duello';
      const kaynak = `${mod}:${m.id}`;
      for (const [cift, bot] of [[1, false], [0.5, false], [1, true], [0, false]]) {
        await db.sorgu('savepoint x');
        await db.sorgu(`delete from xp_hareketleri where kaynak = '${kaynak}'`);
        await db.sorgu(`select xp_mac_odulu('${kaynak}', '${mod}', ${m.kazanan ? `'${m.kazanan}'` : 'null'}, array['${m.oyuncu1}', '${m.oyuncu2}']::uuid[], ${cift}, ${bot})`);
        s[`xp_${ad}_${cift}_${bot}`] = await tek(`select coalesce(json_agg(json_build_object('u', user_id, 'xp', xp, 'detay', detay) order by user_id)::text, '[]')
          from xp_hareketleri where kaynak = '${kaynak}'`);
        await db.sorgu('rollback to savepoint x');
      }
      await db.sorgu('savepoint x');
      s[`sp_${ad}`] = await tek(`select coalesce(sezon_puani_ekle('${m.oyuncu1}', '${mod}', 'regresyon:${m.id}', 20)::text, 'null')`);
      s[`sp_${ad}_satir`] = await tek(`select coalesce(json_agg(json_build_object('k', kaynak, 't', taban, 'm', miktar))::text, '[]')
        from sezon_puan_hareketleri where referans = 'regresyon:${m.id}'`);
      await db.sorgu('rollback to savepoint x');
      await ben(m.oyuncu1);
      s[`ozet_${ad}`] = await tek(`select mac_sonu_ozet('${kaynak}')::text`);
      s[`dokum_${ad}`] = await tek(`select odul_dokumu('${kaynak}')::text`);
      if (mod !== 'grup') s[`level_${ad}`] = await tek(`select level_kazancim('${kaynak}')::text`);
      const u = m.oyuncu1;
      for (const sayac of ['mac_oyna', 'mac_kazan', 'dogru_soru', 'duello_mac']) {
        s[`gorev_${ad}_${sayac}`] = await tek(`select gorev_olcum('${u}', '${sayac}', '{}'::jsonb, now() - interval '7 days', now() + interval '1 minute')::text`);
        s[`gorev_${ad}_${sayac}_haric`] = await tek(`select gorev_olcum('${u}', '${sayac}', '{}'::jsonb, now() - interval '7 days', now() + interval '1 minute', '${mod}', '${m.id}')::text`);
      }
      for (const q of ['mac_oyna_3', 'mac_kazan_5', 'dogru_25']) {
        s[`gsayac_${ad}_${q}`] = await tek(`select gorev_sayaci('${q}', '${u}', (now() at time zone 'Europe/Istanbul')::date)::text`);
      }
    }
    return s;
  }

  console.log('2) Regresyon — migration ÖNCESİ');
  const once = await olc();
  console.log(`  ${Object.keys(once).length} değer ölçüldü`);

  // ---------------------------------------------------------------- 3) migration (test dışı bölüm hariç)
  const canli950 = (await tek(`select coalesce(to_regclass('public.kasa_maclari')::text, 'yok')`)) !== 'yok';
  const canli951 = canli950 && (await tek(`select count(*)::text from information_schema.columns where table_name = 'kasa_maclari' and column_name = 'jokerli'`)) === '1';
  const olusturOnce = await tek(`select coalesce(md5(pg_get_functiondef(to_regprocedure('public.kasa_olustur(uuid,uuid,boolean,boolean)'))), 'yok')`);
  // Bütün kasa_* fonksiyonları (imza + md5): ROLLBACK sonrası birebir dönmeli
  const kasaFnSorgu = `select coalesce(string_agg(p.oid::regprocedure::text || '=' || md5(pg_get_functiondef(p.oid)), ',' order by 1), '')
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'kasa\_%'`;
  const kasaFnOnce = await tek(kasaFnSorgu);
  const kasaKolonOnce = await tek(`select coalesce(string_agg(column_name, ',' order by column_name), '') from information_schema.columns where table_name = 'kasa_maclari'`);
  const ayarOnce = await tek(`select coalesce(string_agg(anahtar || '=' || deger::text, ',' order by anahtar), '') from oyun_ayarlari where anahtar like 'kasa\\_%'`);
  if (!canli950) {
    console.log('3) Migration 950 (cron + realtime hariç)');
    const tam = fs.readFileSync(MIG, 'utf8');
    const kes = tam.indexOf('-- >>> TEST DIŞI');
    if (kes < 0) throw new Error('TEST DIŞI işareti bulunamadı');
    await db.sorgu(tam.slice(0, kes));
    ok('migration 950 hatasız derlendi', true);
  } else {
    console.log('3) 950 canlıda — yalnız 951');
  }
  await db.sorgu(fs.readFileSync(MIG951, 'utf8'));
  ok('migration 951 hatasız derlendi', true);
  await db.sorgu(fs.readFileSync(MIG952, 'utf8'));
  ok('migration 952 hatasız derlendi', true);
  await db.sorgu(fs.readFileSync(MIG953, 'utf8'));
  ok('migration 953 hatasız derlendi', true);
  await db.sorgu(fs.readFileSync(MIG954, 'utf8'));
  ok('migration 954 hatasız derlendi', true);
  ok('953: kasa_joker tek imza (uuid,text,boolean,boolean)', (await tek(`select string_agg(oid::regprocedure::text, ',') from pg_proc where proname = 'kasa_joker'`)) === 'kasa_joker(uuid,text,boolean,boolean)');
  const md5Mig = await ortakMd5();
  const degisen = md5Once.filter((x) => md5Mig.find((y) => y.imza === x.imza)?.h !== x.h).map((x) => x.imza);
  const jokerOrtak = md5Once.filter((x) => /^(joker|skill|coin_harca)/.test(x.imza)).length;
  ok(`ortak joker fonksiyonları migration sonrası birebir (${jokerOrtak} imza)`, !degisen.some((x) => /^(joker|skill|coin_harca)/.test(x)), degisen.join(', '));
  if (canli950) ok('950 canlıyken 951–954 hiçbir ortak fonksiyonu değiştirmedi', degisen.length === 0, degisen.join(', '));

  // ---------------------------------------------------------------- 4) regresyon sonrası
  console.log('4) Regresyon — migration SONRASI (aynı girdiler)');
  const sonra = await olc();
  const farklar = Object.keys(once).filter((k) => once[k] !== sonra[k]);
  ok(`Klasik + Düello çıktıları birebir aynı (${Object.keys(once).length} değer)`, farklar.length === 0,
    farklar.map((k) => `\n      ${k}:\n        önce : ${String(once[k]).slice(0, 400)}\n        sonra: ${String(sonra[k]).slice(0, 400)}`).join(''));
  if (farklar.length) throw new Error('REGRESYON FARKI — durdu');
  const spMd5Once = md5Once.find((x) => x.imza.startsWith('sezon_puani_ekle('))?.h;
  const spMd5Sonra = await tek(`select md5(pg_get_functiondef('public.sezon_puani_ekle(uuid,text,text,integer)'::regprocedure))`);
  ok(`sezon_puani_ekle migration sonrası canlıyla birebir (md5 ${spMd5Sonra})`, !!spMd5Once && spMd5Once === spMd5Sonra, `${spMd5Once} vs ${spMd5Sonra}`);
  db.uyarilar = [];

  // ---------------------------------------------------------------- 5) KASA
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}', '${B}')`);
  // 5a–5k 950–953 kurallarını sınar: 954 bayrakları yeni maçlarda kapalı (5l açar)
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar in ('kasa_devam_birakir', 'kasa_devam_joker_acik')`);
  const satir = (id) => json(`select row_to_json(x)::text from kasa_maclari x where id = '${id}'`);
  const dogruCevap = (id) => tek(`select q.dogru_cevap::text from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${id}'`).then(Number);
  const sureDoldur = async (id) => {
    await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
    await db.sorgu(`select kasa_ilerlet('${id}')`);
    return satir(id);
  };
  const cevapla = async (id, u, dogru) => {
    const dc = await dogruCevap(id);
    await ben(u);
    return hata(`select kasa_cevap('${id}', ${dogru ? dc : (dc + 1) % 4}::smallint)`);
  };
  const p = (k, u) => (k.oyuncu1 === u ? k.puan1 : k.puan2);
  const setPuan = (id, k, u, v) => db.sorgu(`update kasa_maclari set ${k.oyuncu1 === u ? 'puan1' : 'puan2'} = ${v} where id = '${id}'`);

  console.log('5a) Kural akışı (insan-insan, Dereceli) — 951: hedef 50, 36 tur, AÇ alt sınırı 10');
  let id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  let k = await satir(id);
  ok('maç başlangıç fazında, kural değerleri sabitlendi (2/6/50/36/15/8, acma_min 10, jokerli)', k.faz === 'baslangic' && k.artis === 2 && k.ikisi_artis === 6 && k.hedef === 50 && k.max_tur === 36 && k.soru_sn === 15 && k.karar_sn === 8 && k.acma_min === 10 && k.jokerli === true, JSON.stringify([k.faz, k.artis, k.ikisi_artis, k.hedef, k.max_tur, k.soru_sn, k.karar_sn, k.acma_min, k.jokerli]));
  const basSn = Number(await tek(`select extract(epoch from (faz_bitis - created_at))::text from kasa_maclari where id = '${id}'`));
  ok('952: başlangıç fazı 3-2-1 + pay + giriş sahnesi = 8 sn', Math.abs(basSn - 8) < 0.5, String(basSn));
  ok('36+ soru önceden seçildi', (k.soru_ids || []).length >= 36, String((k.soru_ids || []).length));
  k = await sureDoldur(id);
  ok('3-2-1 bitince tur 1: sahip yok → doğrudan soru', k.tur === 1 && k.faz === 'cevap' && k.soru_id, JSON.stringify([k.tur, k.faz]));
  ok('A doğru cevaplar', (await cevapla(id, A, true)) === null);
  ok('A ikinci kez cevaplayamaz', /zaten/.test(await cevapla(id, A, true) || ''));
  ok('B yanlış cevaplar', (await cevapla(id, B, false)) === null);
  let bDogru = 0;
  k = await satir(id);
  ok('ikisi cevaplayınca hemen sonuç: K = 2, tek bilen A sahip', k.faz === 'sonuc' && k.kasa === 2 && k.sahip === A, JSON.stringify([k.faz, k.kasa, k.sahip]));
  await ben(A);
  let du = await json(`select kasa_durum('${id}')::text`);
  ok('durum (sonuç): ben_dogru true, rakip_dogru false, artış 2, acma_min 10', du.sonuc?.ben_dogru === true && du.sonuc?.rakip_dogru === false && du.sonuc?.artis === 2 && du.acma_min === 10, JSON.stringify([du.sonuc, du.acma_min]));
  k = await sureDoldur(id);
  ok('tur 2: sahip A ama K = 2 < 10 → karar fazı YOK, doğrudan soru', k.tur === 2 && k.faz === 'cevap', JSON.stringify([k.tur, k.faz]));
  await cevapla(id, A, true); await cevapla(id, B, true); bDogru++;
  k = await satir(id);
  ok('ikisi de doğru → K = 2 + 6 = 8, sahip değişmez (A)', k.kasa === 8 && k.sahip === A, JSON.stringify([k.kasa, k.sahip]));
  k = await sureDoldur(id);
  ok('tur 3: K = 8 < 10 → yine karar yok', k.tur === 3 && k.faz === 'cevap', JSON.stringify([k.tur, k.faz]));
  await cevapla(id, A, false); await cevapla(id, B, false);
  k = await satir(id);
  ok('ikisi de yanlış → K = 10, sahip A kalır', k.kasa === 10 && k.sahip === A, JSON.stringify([k.kasa, k.sahip]));
  k = await sureDoldur(id);
  ok('tur 4: K = 10 ≥ 10 → karar fazı (8 sn + pay)', k.tur === 4 && k.faz === 'karar', JSON.stringify([k.tur, k.faz]));
  await ben(B);
  ok('B (sahip değil) karar veremez', /sahibinde/.test(await hata(`select kasa_karar('${id}', true)`) || ''));
  du = await json(`select kasa_durum('${id}')::text`);
  ok('rakip karar fazını görür: karar.veren = A (istemci "Rakip karar veriyor…")', du.karar?.veren === A && du.soru == null, JSON.stringify(du.karar));
  await ben(A);
  ok('A DEVAM der', (await hata(`select kasa_karar('${id}', false)`)) === null);
  k = await satir(id);
  ok('DEVAM → soru açıldı, son_karar devam', k.faz === 'cevap' && k.son_karar?.ac === false, JSON.stringify([k.faz, k.son_karar]));
  await cevapla(id, A, true); await cevapla(id, B, true); bDogru++;
  k = await satir(id);
  ok('ikisi de doğru → K = 16, sahip A', k.kasa === 16 && k.sahip === A, JSON.stringify([k.kasa, k.sahip]));
  k = await sureDoldur(id);
  await ben(A);
  ok('tur 5: A AÇ der', k.faz === 'karar' && (await hata(`select kasa_karar('${id}', true)`)) === null);
  k = await satir(id);
  ok('AÇ → A puanı 16, K = 0, sahip yok, soru aynı turda açıldı', p(k, A) === 16 && k.kasa === 0 && k.sahip === null && k.faz === 'cevap' && k.tur === 5, JSON.stringify([p(k, A), k.kasa, k.sahip, k.faz, k.tur]));
  const h5 = await json(`select row_to_json(h)::text from kasa_hamleler h where kasa_id = '${id}' and tur = 5`);
  ok('hamle kaydı: karar ac, açılan 16, karar veren A', h5.karar === 'ac' && h5.acilan_deger === 16 && h5.karar_veren === A, JSON.stringify(h5));
  await cevapla(id, A, false); await cevapla(id, B, true); bDogru++;
  k = await satir(id);
  ok('B tek bilen → sahip B, K = 2', k.sahip === B && k.kasa === 2, JSON.stringify([k.sahip, k.kasa]));
  // AÇ alt sınırı sunucuda: karar fazına zorla sokulsa bile K < 10 iken AÇ reddedilir
  await db.sorgu(`update kasa_maclari set faz = 'karar', tur = tur + 1, karar_baslangic = now(), faz_bitis = now() + interval '9 seconds', kasa = 6 where id = '${id}'`);
  await ben(B);
  const acRed = await hata(`select kasa_karar('${id}', true)`);
  ok(`K = 6 < 10 iken AÇ reddedilir ("${acRed}")`, /en az 10/i.test(acRed || ''));
  k = await satir(id);
  ok('reddedilen AÇ puan/kasa değiştirmedi', k.kasa === 6 && p(k, B) === 0 && k.faz === 'karar', JSON.stringify([k.kasa, p(k, B), k.faz]));
  ok('DEVAM yine serbest', (await hata(`select kasa_karar('${id}', false)`)) === null);
  k = await satir(id);
  ok('DEVAM → soru açıldı', k.faz === 'cevap' && k.son_karar?.ac === false, JSON.stringify([k.faz, k.son_karar]));
  // Yanıtsız: süre dolunca yanlış
  k = await sureDoldur(id);   // cevap süresi + tolerans doldu
  ok('ikisi de yanıtsız → çözümlendi, K += 2 = 8, sahip B', k.faz === 'sonuc' && k.kasa === 8 && k.sahip === B, JSON.stringify([k.faz, k.kasa, k.sahip]));
  const yanitsiz = await tek(`select count(*)::text from kasa_cevaplari where kasa_id = '${id}' and tur = ${k.tur} and cevap is null and not dogru`);
  ok('yanıtsız cevaplar null + yanlış olarak kaydedildi', yanitsiz === '2', yanitsiz);
  // Süre dolumu = DEVAM (K ≥ 10)
  await db.sorgu(`update kasa_maclari set kasa = 12 where id = '${id}'`);
  k = await sureDoldur(id);
  ok('sonraki tur karar fazı (sahip B, K = 12)', k.faz === 'karar', JSON.stringify([k.tur, k.faz]));
  k = await sureDoldur(id);
  ok('karar süresi doldu → DEVAM (sure_doldu), soru açıldı', k.faz === 'cevap' && k.son_karar?.sure_doldu === true, JSON.stringify(k.son_karar));
  await cevapla(id, A, false); await cevapla(id, B, true); bDogru++;
  k = await satir(id);
  ok('B tek bilen → K = 14, sahip B', k.kasa === 14 && k.sahip === B, JSON.stringify([k.kasa, k.sahip]));
  // Hedef: B 40 puan + K 14 → AÇ → 54 ≥ 50
  await setPuan(id, k, B, 40);
  const coinOnce = Number(await tek(`select coin::text from profiles where id = '${B}'`));
  const ligOnce = Number(await tek(`select puan::text from profiles where id = '${B}'`));
  k = await sureDoldur(id);
  await ben(B);
  ok('B AÇ (K 14)', k.faz === 'karar' && (await hata(`select kasa_karar('${id}', true)`)) === null);
  k = await satir(id);
  ok('AÇ sonrası 54 ≥ 50 → maç bitti, kazanan B, neden hedef', k.durum === 'bitti' && k.kazanan === B && k.sonuc_neden === 'hedef' && p(k, B) === 54, JSON.stringify([k.durum, k.kazanan, k.sonuc_neden, p(k, B)]));
  const turSayisi = Number(await tek(`select count(*)::text from kasa_hamleler where kasa_id = '${id}'`));
  await ben(A);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('bitmiş maçta son_karar (maç sonu açılış sahnesi için): veren B, ac, değer 14', du.son_karar?.veren === B && du.son_karar?.ac === true && du.son_karar?.deger === 14, JSON.stringify(du.son_karar));

  console.log('5b) Ödül (Klasik yolu)');
  const carpan = Number(k.odul_carpan);
  const beklenenCift = Number(await tek(`select cift_odul_carpani('${A}', '${B}', '${id}')::text`));
  ok(`odul_carpan = çift çarpanı × kasa çarpanı (${carpan})`, carpan === beklenenCift * 1, `${carpan} vs ${beklenenCift}`);
  ok('odul_acik true', k.odul_acik === true);
  const coinSonra = Number(await tek(`select coin::text from profiles where id = '${B}'`));
  const ligSonra = Number(await tek(`select puan::text from profiles where id = '${B}'`));
  const coinBek = Math.floor(Number(await tek(`select ayar_sayi('coin_mac_galibiyet', 25)::text`)) * Math.min(carpan, 1));
  const ligBek = Math.floor(Number(await tek(`select ayar_sayi('lig_mac_galibiyet', 25)::text`)) * carpan);
  // Döküm: bu maçın ödül kalemleri (kaynak kasa:id) + B'nin bu işlemdeki bütün coin hareketleri
  const kalemler = await db.sorgu(`select kalem, coin::text coin, lig::text lig, detay::text detay
     from odul_kalemleri where user_id = '${B}' and kaynak = 'kasa:${id}' order by id`);
  const hareketler = await db.sorgu(`select tur, referans, miktar::text miktar from coin_hareketleri
     where user_id = '${B}' and olusturuldu = now() order by id`);
  console.log('     B ödül kalemleri (kasa:id):', JSON.stringify(kalemler));
  console.log('     B coin hareketleri (bu işlem):', JSON.stringify(hareketler));
  const kalemCoin = (ad) => kalemler.filter((x) => x.kalem === ad).reduce((t, x) => t + Number(x.coin), 0);
  const kalemLig = (ad) => kalemler.filter((x) => x.kalem === ad).reduce((t, x) => t + Number(x.lig), 0);
  const topKalemCoin = kalemler.reduce((t, x) => t + Number(x.coin), 0);
  const topKalemLig = kalemler.reduce((t, x) => t + Number(x.lig), 0);
  const topHareket = hareketler.reduce((t, x) => t + Number(x.miktar), 0);
  ok(`galibiyet kalemi coin = coin_mac_galibiyet × çarpan (${kalemCoin('galibiyet')} = ${coinBek})`, kalemCoin('galibiyet') === coinBek);
  ok(`galibiyet kalemi lig = lig_mac_galibiyet × çarpan (${kalemLig('galibiyet')} = ${ligBek})`, kalemLig('galibiyet') === ligBek);
  ok(`coin farkının TAMAMI dökümde: bakiye +${coinSonra - coinOnce} = hareketler ${topHareket} = kalemler ${topKalemCoin}`,
    coinSonra - coinOnce === topHareket && topHareket === topKalemCoin);
  ok(`lig farkının TAMAMI dökümde: puan +${ligSonra - ligOnce} = kalemler ${topKalemLig} (galibiyet ${kalemLig('galibiyet')} + seri ${kalemLig('seri')} + diğer)`,
    ligSonra - ligOnce === topKalemLig);
  const xpSay = Number(await tek(`select count(*)::text from xp_hareketleri where kaynak = 'kasa:${id}'`));
  ok('XP iki oyuncuya yazıldı (xp_hareketleri kaynak kasa:id)', xpSay === 2, String(xpSay));
  const xpA = await json(`select row_to_json(x)::text from xp_hareketleri x where kaynak = 'kasa:${id}' and user_id = '${A}'`);
  const xpMag = Number(await tek(`select ayar_sayi('xp_mac_maglubiyet', 10)::text`));
  ok(`kaybeden XP Klasik değeri (xp_mac_maglubiyet ${xpMag} × çarpan)`, xpA.xp === Math.floor(xpMag * Math.min(carpan, 1)), JSON.stringify(xpA));
  const kalem = Number(await tek(`select count(*)::text from odul_kalemleri where kaynak = 'kasa:${id}'`));
  ok('ödül dökümü kalemleri yazıldı', kalem > 0, String(kalem));
  await ben(B);
  const oz = await json(`select mac_sonu_ozet('kasa:${id}')::text`);
  ok('mac_sonu_ozet("kasa:id"): bitti, hazır, kazanan B', oz.bitti === true && oz.hazir === true && oz.kazanan === B, JSON.stringify([oz.bitti, oz.hazir, oz.kazanan]));
  const sezon = await tek(`select sezon_gecerli('${B}')::text`);
  const spSatir = await db.sorgu(`select user_id, kaynak, referans, taban::text taban, miktar::text miktar
     from sezon_puan_hareketleri where referans like 'kasa:%' and referans = 'kasa:${id}' order by user_id`);
  console.log(`     SP satırları (sezon ${sezon}):`, JSON.stringify(spSatir));
  const spB = spSatir.find((x) => x.user_id === B);
  ok('Sezon Puanı: B satırı var, miktar > 0, referans kasa:<id>, kaynak mac (A)',
    !!sezon && !!spB && Number(spB.miktar) > 0 && spB.referans === `kasa:${id}` && spB.kaynak === 'mac', JSON.stringify(spB));
  const uyariSp = (db.uyarilar || []).filter((u) => /sezon|kasa/i.test(u));
  ok('maç bitişinde WARNING yok (sezon_kasa_sp dahil)', uyariSp.length === 0, uyariSp.join(' | '));
  const gOnce = Number(await tek(`select gorev_olcum('${B}', 'mac_kazan', '{}'::jsonb, now() - interval '1 day', now() + interval '1 minute', 'kasa', '${id}')::text`));
  const gSonra = Number(await tek(`select gorev_olcum('${B}', 'mac_kazan', '{}'::jsonb, now() - interval '1 day', now() + interval '1 minute')::text`));
  ok('görev "maç kazan" Kasa maçını sayar (+1)', gSonra - gOnce === 1, `${gOnce} → ${gSonra}`);
  const dOnce = Number(await tek(`select gorev_olcum('${B}', 'dogru_soru', '{}'::jsonb, now() - interval '1 day', now() + interval '1 minute', 'kasa', '${id}')::text`));
  const dSonra = Number(await tek(`select gorev_olcum('${B}', 'dogru_soru', '{}'::jsonb, now() - interval '1 day', now() + interval '1 minute')::text`));
  ok(`görev "doğru soru" Kasa doğrularını sayar (B: ${bDogru})`, dSonra - dOnce === bDogru, `${dOnce} → ${dSonra}`);
  await ben(A);
  const bitDu = await json(`select kasa_durum('${id}')::text`);
  ok(`bitmiş maçta geçmiş ${turSayisi} tur, doğru cevap ancak şimdi`, Array.isArray(bitDu.gecmis) && bitDu.gecmis.length === turSayisi && bitDu.gecmis[0].dogru_cevap != null, String(bitDu.gecmis?.length));

  console.log('5c) Tur sınırı (36) + Altın Soru');
  id = await tek(`select kasa_olustur('${A}', '${B}', false, true)`);
  k = await satir(id);
  await db.sorgu(`update kasa_maclari set tur = 36, faz = 'sonuc', faz_bitis = now() - interval '1 second',
     puan1 = 30, puan2 = 22, sahip = oyuncu2, kasa = 4 where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('36. tur sonu: sahip (o2) kasayı alır (K 4 < 10 da olsa) 26–30 → o1 kazanır, neden tur_siniri', k.durum === 'bitti' && k.kazanan === k.oyuncu1 && k.sonuc_neden === 'tur_siniri' && k.puan2 === 26, JSON.stringify([k.durum, k.kazanan === k.oyuncu1, k.sonuc_neden, k.puan1, k.puan2]));
  id = await tek(`select kasa_olustur('${A}', '${B}', false, true)`);
  await db.sorgu(`update kasa_maclari set tur = 35, faz = 'sonuc', faz_bitis = now() - interval '1 second',
     puan1 = 30, puan2 = 22, sahip = oyuncu2, kasa = 4 where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('35. tur sonu maç sürer (tur 36 açıldı)', k.durum === 'aktif' && k.tur === 36, JSON.stringify([k.durum, k.tur]));
  id = await tek(`select kasa_olustur('${A}', '${B}', false, true)`);
  await db.sorgu(`update kasa_maclari set tur = 36, faz = 'sonuc', faz_bitis = now() - interval '1 second',
     puan1 = 30, puan2 = 26, sahip = oyuncu2, kasa = 4 where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('eşitlik 30–30 → Altın Soru (altin, tur 37, cevap fazı)', k.durum === 'aktif' && k.altin && k.tur === 37 && k.faz === 'cevap' && k.puan2 === 30, JSON.stringify([k.durum, k.altin, k.tur, k.faz]));
  await ben(A);
  ok('Altın Soru\'da joker reddedilir', /Altın Soru/.test(await hata(`select kasa_joker('${id}', 'elli', false)`) || ''));
  await cevapla(id, A, false); await cevapla(id, B, false);
  k = await sureDoldur(id);
  ok('Altın Soru: ikisi de yanlış → yeni Altın Soru (tur 38)', k.durum === 'aktif' && k.altin && k.tur === 38 && k.faz === 'cevap', JSON.stringify([k.durum, k.tur, k.faz]));
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await sureDoldur(id);
  ok('Altın Soru: yalnız A bildi → A kazanır, neden altin', k.durum === 'bitti' && k.kazanan === A && k.sonuc_neden === 'altin', JSON.stringify([k.durum, k.kazanan === A, k.sonuc_neden]));
  ok('davetli (serbest) maçta lig yok: dereceli false', k.dereceli === false);

  console.log('5c2) Süren (951 öncesi) maç korunur: acma_min 0, jokersiz');
  id = await tek(`select kasa_olustur('${A}', '${B}', false, true)`);
  await db.sorgu(`update kasa_maclari set acma_min = 0, jokerli = false, hedef = 20, max_tur = 24 where id = '${id}'`);
  k = await sureDoldur(id);
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await sureDoldur(id);
  ok('eski maç: K = 2 iken karar fazı açılır (950 davranışı)', k.faz === 'karar' && k.kasa === 2, JSON.stringify([k.faz, k.kasa]));
  await ben(A);
  ok('eski maç: K = 2 AÇ kabul', (await hata(`select kasa_karar('${id}', true)`)) === null);
  k = await satir(id);
  ok('eski maç: A puanı 2, hedef 20 sabit kaldı', p(k, A) === 2 && k.hedef === 20 && k.max_tur === 24, JSON.stringify([p(k, A), k.hedef, k.max_tur]));
  ok('eski maç: joker reddedilir', /joker yok/.test(await hata(`select kasa_joker('${id}', 'elli', false)`) || ''));
  du = await json(`select kasa_durum('${id}')::text`);
  ok('eski maç durumunda joker alanı yok', du.jokerli === false && du.joker == null && du.rakip_joker == null, JSON.stringify([du.jokerli, du.joker]));

  console.log('5d) Sızıntı: kasa_durum alanları');
  id = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  k = await sureDoldur(id);
  ok('bot maçı: bot + tarz atandı', k.bot === BOT && ['temkinli', 'dengeli', 'acgozlu'].includes(k.bot_tarz), JSON.stringify([k.bot, k.bot_tarz]));
  const gec = Number(await tek(`select extract(epoch from (bot_cevap_at - soru_baslangic))::text from kasa_maclari where id = '${id}'`));
  ok(`bot cevap zamanı 2–6 sn + gösterim payı 1,5 (${gec.toFixed(2)} sn)`, gec >= 3.5 && gec <= 7.5);
  await ben(A);
  du = await json(`select kasa_durum('${id}')::text`);
  // Yalnız JSON ANAHTARLARI taranır (değerler değil: ör. 3B görünümde ayakkabı "bot")
  const anahtarlar = (o, yol = '', acc = []) => {
    if (o && typeof o === 'object') for (const [a, v] of Object.entries(o)) { if (!Array.isArray(o)) acc.push(a); anahtarlar(v, yol + '.' + a, acc); }
    return acc;
  };
  const yasak = ['dogru_cevap', 'bot', 'bot_cevap', 'bot_cevap_at', 'bot_tarz', 'bot_karar', 'bot_karar_at', 'cevaplar',
    'soru_ids', 'kullanilan_sorular', 'is_bot', 'bot_turu', 'rakip_cevap', 'ilk', 'fark', 'ikinci'];
  const bulunan = [...new Set(anahtarlar(du))].filter((a) => yasak.includes(a));
  ok('cevap fazında durum JSON anahtarlarında gizli alan yok', bulunan.length === 0, bulunan.join(','));
  ok('alanlar: soru metni + şıklar var, sonuç yok', du.soru?.soru && Array.isArray(du.soru?.secenekler) && du.sonuc == null);
  await db.sorgu(`update kasa_maclari set bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await ben(A);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('bot cevapladı → rakip_cevapladi true, şıkkı GÖRÜNMEZ', du.cevap?.rakip_cevapladi === true && !JSON.stringify(du.cevap).includes('"rakip_cevap"'), JSON.stringify(du.cevap));
  console.log('     kasa_durum anahtarları:', Object.keys(du).join(', '));

  console.log('5e) Bot kararı (eşikler 8 / 14 / 20, AÇ alt sınırı 10)');
  await cevapla(id, A, false);
  await db.sorgu(`update kasa_maclari set sahip = bot, kasa = 12, faz = 'sonuc', faz_bitis = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  const kg = Number(await tek(`select extract(epoch from (bot_karar_at - karar_baslangic))::text from kasa_maclari where id = '${id}'`));
  ok(`bot sahip → karar fazı, karar sunucuda verildi, 1–3 sn + pay (${kg.toFixed(2)} sn)`, k.faz === 'karar' && k.bot_karar !== null && kg >= 2.5 && kg <= 4.5);
  await db.sorgu(`update kasa_maclari set bot_karar_at = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('bot kararı uygulandı (son_karar veren bot)', k.son_karar?.veren === BOT && k.faz === 'cevap', JSON.stringify(k.son_karar));
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = bot, kasa = 10,
     puan1 = case when oyuncu1 = bot then 45 else puan1 end, puan2 = case when oyuncu2 = bot then 45 else puan2 end where id = '${id}'`);
  ok('bot: kasa hedefe ulaştırıyorsa (45 + 10) her zaman AÇ', (await tek(`select kasa_bot_karar('${id}')::text`)) === 'true');
  await db.sorgu(`update kasa_maclari set kasa = 6 where id = '${id}'`);
  ok('bot: K = 6 < 10 iken hedefe ulaştırsa da (45 + 6) AÇMAZ', (await tek(`select bool_or(kasa_bot_karar('${id}'))::text from generate_series(1, 20)`)) === 'false');
  const tarz = await db.sorgu(`select kasa_bot_tarz(id) t, count(*)::text n from profiles where is_bot group by 1 order by 1`);
  ok(`tarz dağılımı üç tarzı da içerir (${tarz.map((x) => `${x.t}:${x.n}`).join(' ')})`, tarz.length === 3);
  const deneme = await tek(`with t as (select kasa_bot_tarz(id) tz, id from profiles where is_bot)
     select (select tz from t where id = '${BOT}') = (select kasa_bot_tarz('${BOT}'))`);
  ok('tarz deterministik (aynı bot → aynı tarz)', deneme === 't');
  // Eşik: dengeli 14 ± 2 → K=11 asla, K=17 her zaman, K=14 kimi zaman
  await db.sorgu(`update kasa_maclari set bot_tarz = 'dengeli', puan1 = 0, puan2 = 0, kasa = 11 where id = '${id}'`);
  const e11 = await tek(`select bool_or(kasa_bot_karar('${id}'))::text from generate_series(1, 40)`);
  await db.sorgu(`update kasa_maclari set kasa = 17 where id = '${id}'`);
  const e17 = await tek(`select bool_and(kasa_bot_karar('${id}'))::text from generate_series(1, 40)`);
  await db.sorgu(`update kasa_maclari set kasa = 14 where id = '${id}'`);
  const e14 = await tek(`select (count(*) filter (where kasa_bot_karar('${id}')))::text from generate_series(1, 300)`);
  ok(`Dengeli: K=11 hiç açmaz, K=17 hep açar, K=14 kimi zaman (${e14}/300)`, e11 === 'false' && e17 === 'true' && Number(e14) > 100 && Number(e14) < 300);
  await db.sorgu(`update kasa_maclari set bot_tarz = 'temkinli', kasa = 9 where id = '${id}'`);
  const t9 = await tek(`select bool_or(kasa_bot_karar('${id}'))::text from generate_series(1, 60)`);
  await db.sorgu(`update kasa_maclari set kasa = 10 where id = '${id}'`);
  const t10 = await tek(`select (count(*) filter (where kasa_bot_karar('${id}')))::text from generate_series(1, 60)`);
  ok(`Temkinli (8 ± 2): K=9 hiç açmaz (alt sınır 10), K=10 açar (${t10}/60)`, t9 === 'false' && Number(t10) === 60);
  await db.sorgu(`update kasa_maclari set bot_tarz = 'acgozlu', kasa = 17 where id = '${id}'`);
  const a17 = await tek(`select bool_or(kasa_bot_karar('${id}'))::text from generate_series(1, 40)`);
  await db.sorgu(`update kasa_maclari set kasa = 23 where id = '${id}'`);
  const a23 = await tek(`select bool_and(kasa_bot_karar('${id}'))::text from generate_series(1, 40)`);
  ok('Açgözlü (20 ± 2): K=17 hiç açmaz, K=23 hep açar', a17 === 'false' && a23 === 'true');
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${id}'`);

  console.log('5j) JOKER (Klasik envanteri + Klasik sınırları)');
  const env = async (u, t) => Number(await tek(`select coalesce((select adet from joker_envanter where user_id = '${u}' and tur = '${t}'), 0)::text`));
  const envYaz = (u, t, n) => db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${u}', '${t}', ${n})
     on conflict (user_id, tur) do update set adet = excluded.adet`);
  for (const t of ['elli', 'sure', 'zaman_baskisi', 'ikinci_sans', 'sigorta', 'cifte_puan', 'soru_degistir']) { await envYaz(A, t, 3); await envYaz(B, t, 3); }
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  await ben(A);
  ok('3-2-1 sırasında joker reddedilir', /soru açıkken/.test(await hata(`select kasa_joker('${id}', 'elli', false)`) || ''));
  k = await sureDoldur(id);
  for (const t of ['soru_degistir', 'sigorta', 'cifte_puan', 'baskin']) {
    ok(`Kasa'da olmayan joker reddedilir: ${t}`, /Kasa modunda kullanılamaz/.test(await hata(`select kasa_joker('${id}', '${t}', false)`) || ''));
  }
  // 50:50
  const dc1 = await dogruCevap(id);
  const elliA0 = await env(A, 'elli');
  await ben(A);
  const r50 = await json(`select kasa_joker('${id}', 'elli', false)::text`);
  ok(`50:50: iki kapalı şık, ikisi de yanlış (${JSON.stringify(r50.kapali)}; doğru ${dc1})`, Array.isArray(r50.kapali) && r50.kapali.length === 2 && !r50.kapali.includes(dc1) && r50.kapali[0] !== r50.kapali[1]);
  ok('50:50 envanterden düştü (−1)', (await env(A, 'elli')) === elliA0 - 1);
  ok('kullanım kaydı joker_kullanimlari (mac_tur kasa, soru_index = tur)', (await tek(`select count(*)::text from joker_kullanimlari where user_id = '${A}' and mac_tur = 'kasa' and mac_id = '${id}' and soru_index = ${k.tur} and tur = 'elli'`)) === '1');
  const islem = await tek(`select count(*)::text from joker_islemleri where user_id = '${A}' and tur = 'elli' and delta = -1 and kaynak = 'kullanim' and ref = 'kasa:${id}'`);
  ok('envanter hareketi joker_islemleri (kullanim, kasa:<id>)', islem === '1', islem);
  ok('aynı soruda ikinci joker reddedilir (soruda 1)', /Bu soruda/.test(await hata(`select kasa_joker('${id}', 'sure', false)`) || ''));
  let duA = await json(`select kasa_durum('${id}')::text`);
  ok('A durumu: joker.kapali aynı iki şık, turler [elli]', JSON.stringify(duA.joker?.kapali) === JSON.stringify(r50.kapali) && JSON.stringify(duA.joker?.turler) === '["elli"]', JSON.stringify(duA.joker));
  let jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('kasa_joker_durumu (A): sinir 6, kullanilan 1, soruda_kullanildi, elli sayısı 1', jd.sinir === 6 && jd.kullanilan === 1 && jd.soruda_kullanildi === true && jd.kullanim_sayilari?.elli === 1, JSON.stringify(jd));
  await ben(B);
  let duB = await json(`select kasa_durum('${id}')::text`);
  const bMetin = JSON.stringify(duB);
  ok('B durumu: rakip_joker ["elli"], A\'nın kapalı şıkları YOK, B\'nin kendi kapalısı boş',
    JSON.stringify(duB.rakip_joker) === '["elli"]' && JSON.stringify(duB.joker?.kapali) === '[]' && !bMetin.includes('"kapali":[' + r50.kapali.join(',') + ']'), JSON.stringify([duB.rakip_joker, duB.joker]));
  ok('B durum anahtarlarında gizli alan yok (joker sonrası)', [...new Set(anahtarlar(duB))].filter((a) => yasak.includes(a)).length === 0);
  // Zaman Baskısı (B → A)
  const bitA0 = new Date((await json(`select json_build_object('b', kasa_oyuncu_bitis(k, '${A}'))::text from kasa_maclari k where id = '${id}'`)).b).getTime();
  await ben(B);
  const rzb = await json(`select kasa_joker('${id}', 'zaman_baskisi', false)::text`);
  const bitA1 = new Date((await json(`select json_build_object('b', kasa_oyuncu_bitis(k, '${A}'))::text from kasa_maclari k where id = '${id}'`)).b).getTime();
  ok(`Zaman Baskısı: A'nın kişisel bitişi 5 sn kısaldı (${((bitA0 - bitA1) / 1000).toFixed(2)} sn)`, Math.abs(bitA0 - bitA1 - 5000) < 50 && rzb.azaltildi_sn === 5, JSON.stringify(rzb));
  await ben(A);
  duA = await json(`select kasa_durum('${id}')::text`);
  jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('A: joker.kisaltildi + kasa_joker_durumu.kisaltildi + rakip_joker [zaman_baskisi] + benim_bitis kısaldı',
    duA.joker?.kisaltildi === true && jd.kisaltildi === true && JSON.stringify(duA.rakip_joker) === '["zaman_baskisi"]' &&
    Math.abs(new Date(duA.sureler.benim_bitis).getTime() - bitA1) < 5, JSON.stringify([duA.joker, duA.rakip_joker, duA.sureler]));
  ok('B ortak bitişi değişmedi (faz_son = faz_bitis)', new Date(duA.sureler.faz_son).getTime() === new Date(duA.faz_bitis).getTime());
  // A cevaplar → B'nin Zaman Baskısı artık "rakip cevapladı" ile reddedilir (yeni soruda deneyeceğiz)
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await satir(id);
  ok('jokerli soru normal çözümlendi (A tek bilen, K 2)', k.faz === 'sonuc' && k.sahip === A && k.kasa === 2, JSON.stringify([k.faz, k.sahip, k.kasa]));
  k = await sureDoldur(id);
  ok('yeni soruda joker durumu sıfırlandı', JSON.stringify(k.joker) === '{}', JSON.stringify(k.joker));
  // Ek Süre (A): A'nın bitişi +10; ortak süre dolunca B yanıtsız, A hâlâ cevaplayabilir
  await ben(A);
  const rsure = await json(`select kasa_joker('${id}', 'sure', false)::text`);
  ok('Ek Süre: eklenen 10 sn (skill_ek_sure_sn)', rsure.eklenen_sn === 10 && rsure.uzatildi === true, JSON.stringify(rsure));
  duA = await json(`select kasa_durum('${id}')::text`);
  ok('A benim_bitis = faz_bitis + 10, faz_son = A bitişi', new Date(duA.sureler.benim_bitis).getTime() - new Date(duA.faz_bitis).getTime() === 10000 &&
    duA.sureler.faz_son === duA.sureler.benim_bitis, JSON.stringify(duA.sureler));
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '2 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('ortak süre doldu ama A\'nın Ek Süresi sürüyor → faz çözülmedi', k.faz === 'cevap', k.faz);
  await ben(B);
  ok('B\'nin süresi doldu → cevabı reddedilir', /Süre doldu/.test(await hata(`select kasa_cevap('${id}', 0::smallint)`) || ''));
  ok('B\'nin süresi dolunca joker de kullanılamaz', /Süre doldu/.test(await hata(`select kasa_joker('${id}', 'zaman_baskisi', false)`) || ''));
  ok('A Ek Süre içinde cevaplar', (await cevapla(id, A, true)) === null);
  k = await satir(id);
  ok('A cevaplayınca (B yanıtsız) çözümlendi: A tek bilen, K 4', k.faz === 'sonuc' && k.sahip === A && k.kasa === 4, JSON.stringify([k.faz, k.sahip, k.kasa]));
  k = await sureDoldur(id);
  // İkinci Şans (A)
  const dc3 = await dogruCevap(id);
  await ben(A);
  ok('İkinci Şans kullanıldı', (await hata(`select kasa_joker('${id}', 'ikinci_sans', false)`)) === null);
  const ilk = await json(`select kasa_cevap('${id}', ${(dc3 + 1) % 4}::smallint)::text`);
  ok('İkinci Şans: ilk yanlış sayılmadı (cevaplandi false, elenen döndü)', ilk.cevaplandi === false && ilk.ikinci_sans === true && ilk.elenen === (dc3 + 1) % 4, JSON.stringify(ilk));
  k = await satir(id);
  ok('ilk yanlış cevaplara yazılmadı, faz sürüyor', !k.cevaplar[A] && k.faz === 'cevap', JSON.stringify(k.cevaplar));
  duA = await json(`select kasa_durum('${id}')::text`);
  ok('A durumu: elenen şık görünür, ben_cevapladim false', duA.joker?.elenen === (dc3 + 1) % 4 && duA.cevap?.ben_cevapladim === false, JSON.stringify([duA.joker, duA.cevap]));
  ok('aynı yanlış ikinci kez seçilemez', /Başka bir cevap/.test(await hata(`select kasa_cevap('${id}', ${(dc3 + 1) % 4}::smallint)`) || ''));
  await ben(B);
  duB = await json(`select kasa_durum('${id}')::text`);
  ok('B, A\'nın ilk cevabını/elenen şıkkını GÖRMEZ (yalnız ad)', JSON.stringify(duB.rakip_joker) === '["ikinci_sans"]' && duB.joker?.elenen == null && duB.cevap?.rakip_cevapladi === false, JSON.stringify([duB.rakip_joker, duB.joker, duB.cevap]));
  await ben(B);
  ok('B: rakip henüz cevaplamadı → Zaman Baskısı kullanılabilir', (await hata(`select kasa_joker('${id}', 'zaman_baskisi', false)`)) === null);
  ok('A ikinci denemede doğru', (await cevapla(id, A, true)) === null);
  await cevapla(id, B, false);
  k = await satir(id);
  ok('İkinci Şans sonrası doğru sayıldı: A tek bilen, K 6', k.faz === 'sonuc' && k.sahip === A && k.kasa === 6, JSON.stringify([k.faz, k.sahip, k.kasa]));
  k = await sureDoldur(id);
  // Rakip cevapladıktan sonra Zaman Baskısı reddi
  await cevapla(id, B, true);
  await ben(A);
  ok('rakip cevapladıysa Zaman Baskısı reddedilir', /zaten cevapladı/.test(await hata(`select kasa_joker('${id}', 'zaman_baskisi', false)`) || ''));
  await cevapla(id, A, true);
  // Tür başı 2 sınırı: B iki Zaman Baskısı kullandı → üçüncü reddedilir (yeni soruda)
  k = await sureDoldur(id);
  if (k.faz === 'karar') { await ben(k.sahip); await hata(`select kasa_karar('${id}', false)`); }
  await ben(B);
  ok('aynı jokerden maçta en çok 2 (klasik_skill_tur_basi_hak)', /maç hakkın doldu/.test(await hata(`select kasa_joker('${id}', 'zaman_baskisi', false)`) || ''));
  // Envanter 0 → reddedilir; al-ve-kullan coin düşer
  await envYaz(B, 'sure', 0);
  ok('envanterde yoksa reddedilir (Yetersiz joker)', /Yetersiz joker/.test(await hata(`select kasa_joker('${id}', 'sure', false)`) || ''));
  const coinB0 = Number(await tek(`select coin::text from profiles where id = '${B}'`));
  const fiyat = Number(await tek(`select joker_fiyati('sure')::text`));
  const ral = await json(`select kasa_joker('${id}', 'sure', true)::text`);
  const coinB1 = Number(await tek(`select coin::text from profiles where id = '${B}'`));
  ok(`al ve kullan: coin −${fiyat}, envanter yine 0, satin_alindi`, ral.satin_alindi === true && coinB0 - coinB1 === fiyat && (await env(B, 'sure')) === 0, JSON.stringify([ral, coinB0, coinB1]));
  // Toplam sınır (ayar düşürülerek)
  await db.sorgu(`update oyun_ayarlari set deger = '3' where anahtar = 'klasik_skill_toplam_hak'`);
  await cevapla(id, A, false); await cevapla(id, B, false);
  k = await sureDoldur(id);
  if (k.faz === 'karar') { await ben(k.sahip); await hata(`select kasa_karar('${id}', false)`); }
  await ben(B);
  ok('toplam sınır (klasik_skill_toplam_hak) uygulanır', /en fazla 3/.test(await hata(`select kasa_joker('${id}', 'elli', false)`) || ''));
  await db.sorgu(`update oyun_ayarlari set deger = '6' where anahtar = 'klasik_skill_toplam_hak'`);
  // Zaman Baskısı bota: bot geç cevap verecekse yanıtsız kalır
  const idb = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  await sureDoldur(idb);
  await db.sorgu(`update kasa_maclari set bot_cevap_at = faz_bitis - interval '1 second' where id = '${idb}'`);
  await ben(A);
  ok('Zaman Baskısı bota kullanılır', (await hata(`select kasa_joker('${idb}', 'zaman_baskisi', false)`)) === null);
  const kb = await satir(idb);
  ok('bot kısalan sürede cevaplayamıyor → bot cevabı iptal (yanıtsız)', kb.bot_cevap_at === null && kb.bot_cevap === null, JSON.stringify([kb.bot_cevap_at, kb.bot_cevap]));
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id in ('${idb}', '${id}')`);

  console.log('5f) Ödül kapalı (kasa_odul_carpani = 0) + terk');
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'kasa_odul_carpani'`);
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  k = await sureDoldur(id);
  await cevapla(id, B, true);
  const gB = Number(await tek(`select gorev_olcum('${B}', 'mac_oyna', '{}'::jsonb, now() - interval '1 day', now() + interval '1 minute')::text`));
  await ben(A);
  ok('A terk eder', (await hata(`select kasa_terk('${id}')`)) === null);
  k = await satir(id);
  ok('terk: kazanan B, terk_eden A, neden terk, çarpan 0, ödül kapalı', k.kazanan === B && k.terk_eden === A && k.sonuc_neden === 'terk' && Number(k.odul_carpan) === 0 && k.odul_acik === false, JSON.stringify([k.kazanan === B, k.terk_eden === A, k.sonuc_neden, k.odul_carpan, k.odul_acik]));
  ok('ödülsüz maçta coin hareketi yok', (await tek(`select count(*)::text from coin_hareketleri where referans = 'kasa:${id}' and miktar > 0`)) === '0');
  ok('terk edene XP satırı yok', (await tek(`select count(*)::text from xp_hareketleri where kaynak = 'kasa:${id}' and user_id = '${A}'`)) === '0');
  const gB2 = Number(await tek(`select gorev_olcum('${B}', 'mac_oyna', '{}'::jsonb, now() - interval '1 day', now() + interval '1 minute')::text`));
  ok('ödülsüz maç görev sayımına girmez', gB2 === gB, `${gB} → ${gB2}`);
  await db.sorgu(`update oyun_ayarlari set deger = '1' where anahtar = 'kasa_odul_carpani'`);

  console.log('5f2) Beraberlik (Klasik gibi: bota bot yüzdesi) — iki taraf terksiz, kazanansız bitiş');
  id = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  const pA0 = Number(await tek(`select puan::text from profiles where id = '${A}'`));
  const pBot0 = Number(await tek(`select puan::text from profiles where id = '${BOT}'`));
  await db.sorgu(`select kasa_bitir('${id}', null, null)`);
  const pA1 = Number(await tek(`select puan::text from profiles where id = '${A}'`));
  const pBot1 = Number(await tek(`select puan::text from profiles where id = '${BOT}'`));
  const ber = Number(await tek(`select ayar_sayi('lig_mac_beraberlik', 10)::text`));
  const yuzde = Number(await tek(`select ayar_sayi('lig_bot_puan_yuzde', 40)::text`));
  ok(`beraberlik: insan +${pA1 - pA0} (= ${ber}), bot +${pBot1 - pBot0} (= ${Math.floor(ber * yuzde / 100)})`,
    pA1 - pA0 === ber && pBot1 - pBot0 === Math.floor(ber * yuzde / 100));
  // Rozet DAVRANIŞI: A'nın 9 Dereceli galibiyeti varken 10. galibiyet (Serbest / Dereceli) —
  // Klasik bitiş yolu (mac_sonuclandir) ile Kasa (kasa_bitir) aynı durumda aynı rozetleri vermeli.
  const rozetDene = async (yol, dereceli) => {
    await db.sorgu('savepoint rz');
    await db.sorgu(`update matches set kazanan = null where kazanan = '${A}'`);
    await db.sorgu(`update kasa_maclari set kazanan = null where kazanan = '${A}'`);
    await db.sorgu(`insert into matches (oyuncu1, oyuncu2, durum, kazanan, dereceli, bitis)
       select '${A}', '${BOT}', 'bitti', '${A}', true, now() from generate_series(1, 9)`);
    await db.sorgu(`delete from user_badges where user_id = '${A}' and badge_id in ('mac_10', 'ilk_galibiyet')`);
    const say = await tek(`select (select count(*) from matches where kazanan = '${A}' and durum = 'bitti')::text || '+' ||
       (select count(*) from kasa_maclari where kazanan = '${A}' and durum = 'bitti')::text`);
    if (yol === 'klasik') {
      const mid = await tek(`insert into matches (oyuncu1, oyuncu2, durum, dereceli) values ('${A}', '${BOT}', 'aktif', ${dereceli}) returning id`);
      await db.sorgu(`select mac_sonuclandir('${mid}', '${A}', '${BOT}')`);
    } else {
      const kid = await tek(`select kasa_olustur('${A}', '${BOT}', ${dereceli}, true)`);
      await db.sorgu(`select kasa_bitir('${kid}', '${A}', 'hedef')`);
    }
    const r = await tek(`select coalesce(string_agg(badge_id, ',' order by badge_id), '-') from user_badges
       where user_id = '${A}' and badge_id in ('mac_10', 'ilk_galibiyet')`);
    await db.sorgu('rollback to savepoint rz');
    return { say, r };
  };
  for (const dereceli of [false, true]) {
    const kl = await rozetDene('klasik', dereceli);
    const ka = await rozetDene('kasa', dereceli);
    console.log(`     10. galibiyet ${dereceli ? 'Dereceli' : 'Serbest'}: Klasik [önce matches+kasa ${kl.say}] → ${kl.r} · Kasa [önce ${ka.say}] → ${ka.r}`);
    ok(`rozet davranışı Klasik ile aynı (10. galibiyet ${dereceli ? 'Dereceli' : 'Serbest'}): ${ka.r}`, kl.r === ka.r, `Klasik ${kl.r} vs Kasa ${ka.r}`);
  }

  console.log('5g) Kopukluk + bağlanmama iptali');
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  await sureDoldur(id);
  await db.sorgu(`update profiles set last_seen = now() - interval '60 seconds' where id = '${A}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('A nabızsız → faz dondu (kopuk_at)', k.kopuk_at !== null && k.durum === 'aktif');
  await db.sorgu(`update kasa_maclari set kopuk_at = now() - interval '50 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('45 sn dolunca terk sayılır: kazanan B, neden kopuk, terk_eden A', k.durum === 'bitti' && k.kazanan === B && k.sonuc_neden === 'kopuk' && k.terk_eden === A, JSON.stringify([k.durum, k.sonuc_neden]));
  await db.sorgu(`update profiles set last_seen = now() where id = '${A}'`);
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  await db.sorgu(`update kasa_maclari set created_at = now() - interval '20 seconds' where id = '${id}'`);
  await ben(A);
  const gr = await json(`select kasa_giris('${id}')::text`);
  ok('aramayla kurulan maçta rakip gelmedi → cezasız iptal', gr.durum === 'iptal' && (await satir(id)).kazanan === null, JSON.stringify(gr));

  console.log('5h) Eşleşme (bot yedeği), antrenman, kapalı mod');
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where durum = 'aktif' and '${A}' in (oyuncu1, oyuncu2)`);
  await ben(A);
  ok('kasa_ara ilk çağrı: kuyruğa girer (null)', (await tek(`select kasa_ara(true)::text`)) === null);
  await db.sorgu(`update kasa_kuyrugu set created_at = now() - interval '30 seconds' where user_id = '${A}'`);
  const araId = await tek(`select kasa_ara(true)::text`);
  k = araId ? await satir(araId) : {};
  ok('süre dolunca gizli bot (lig ±1) ile maç kuruldu', !!araId && !!k.bot && !k.davetli, JSON.stringify([araId, k.bot_tarz]));
  ok('aktif maç varken kasa_ara aynı maça döner', (await tek(`select kasa_ara(true)::text`)) === araId);
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${araId}'`);
  if (ACIK) {
    const dv = await json(`select kasa_davet_et('${ACIK}', true)::text`);
    k = dv.kasa_id ? await satir(dv.kasa_id) : {};
    ok('Antrenman: açık bota davet → maç hemen, her zaman serbest', !!dv.kasa_id && k.dereceli === false && k.davetli === true, JSON.stringify(dv));
    await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${dv.kasa_id}'`);
  }
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'kasa_modu_acik'`);
  ok('kasa_modu_acik = 0 → arama reddedilir', /kapalı/.test(await hata(`select kasa_ara(true)`) || ''));
  if (ACIK) ok('kasa_modu_acik = 0 → davet reddedilir', /kapalı/.test(await hata(`select kasa_davet_et('${ACIK}', true)`) || ''));
  await db.sorgu(`update oyun_ayarlari set deger = '1' where anahtar = 'kasa_modu_acik'`);
  ok('Düello yeni oyuncu kilidi uygulanmaz (kod yolunda duello_acilis_kontrol yok)',
    !(await tek(`select string_agg(pg_get_functiondef(oid), '') from pg_proc where proname in ('kasa_ara', 'kasa_davet_et', 'kasa_davet_cevap')`)).includes('duello_acilis'));

  console.log('5k) 953 DEVAM ödülü (bilerek DEVAM → %50 ücretsiz joker; 2 kaçırmadan sonra garanti)');
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  k = await satir(id);
  ok('954: yeni maçta 953 şansı kapalı (devam_sans 0, devam_garanti 0 — sans/garanti ayarı okunmuyor)', k.devam_sans === 0 && k.devam_garanti === 0, JSON.stringify([k.devam_sans, k.devam_garanti]));
  // Süren 953 maçı taklidi: kural satırda sabit (devam_sans 50, garanti 2, 954 bayrakları kapalı)
  await db.sorgu(`update kasa_maclari set devam_sans = 50, devam_garanti = 2, devam_birakir = false, devam_elli = false where id = '${id}'`);
  k = await sureDoldur(id);   // tur 1 soru
  const devamA = async (mid) => json(`select coalesce((joker -> '${A}' -> 'devam')::text, 'null') from kasa_maclari where id = '${mid}'`);
  const kacA = async (mid) => Number(await tek(`select coalesce(joker -> '_devam' ->> '${A}', '0') from kasa_maclari where id = '${mid}'`));
  const kararaSok = (mid, sahip, kasa = 12) => db.sorgu(`update kasa_maclari set faz = 'karar', sahip = ${sahip}, kasa = ${kasa}, tur = 1,
     kullanilan_sorular = '{}', karar_baslangic = now(), faz_bitis = now() + interval '9 seconds' where id = '${mid}'`);
  // İstemci yolu: kasa_karar (DEVAM) — üç kez art arda
  let kazanc = 0;
  for (let i = 0; i < 3; i++) {
    await kararaSok(id, `'${A}'`);
    await ben(A);
    ok(`kasa_karar DEVAM #${i + 1} kabul`, (await hata(`select kasa_karar('${id}', false)`)) === null);
    const dv = await devamA(id);
    if (dv?.kazandi) kazanc++;
    if (i === 0) ok('gerçek DEVAM → ödül denendi (devam kaydı: tur + kazandi)', dv && typeof dv.kazandi === 'boolean' && dv.tur === 1, JSON.stringify(dv));
  }
  ok(`3 ardışık DEVAM'da en az 1 kazanç (bag: 2 kaçırmadan sonra garanti) (${kazanc}/3)`, kazanc >= 1);
  // İhtimal + bag: sunucu tarafı döngü (kasa_karar_uygula = kasa_karar'ın DEVAM dalı; hız sınırı yok)
  await db.sorgu(`update kasa_maclari set joker = '{}'::jsonb where id = '${id}'`);
  await db.sorgu(`create temp table _dv (i int, kac int, kazandi boolean, joker text, bedava text) on commit drop`);
  const N = 600;
  await db.sorgu(`do $$ declare i int; v jsonb; c int; begin
    for i in 1..${N} loop
      update kasa_maclari set faz = 'karar', sahip = '${A}', kasa = 12, tur = 1, kullanilan_sorular = '{}',
             karar_baslangic = now(), faz_bitis = now() + interval '9 seconds' where id = '${id}';
      select coalesce((joker -> '_devam' ->> '${A}')::int, 0) into c from kasa_maclari where id = '${id}';
      perform kasa_karar_uygula('${id}', false, false);
      select joker -> '${A}' into v from kasa_maclari where id = '${id}';
      insert into _dv values (i, c, (v -> 'devam' ->> 'kazandi')::boolean, v -> 'devam' ->> 'joker', v ->> 'bedava');
    end loop; end $$`);
const sayiyaCevir = (o) => Object.fromEntries(Object.entries(o).map(([a, v]) => [a, v != null && v !== '' && !isNaN(Number(v)) ? Number(v) : v]));
  const st = (await db.sorgu(`select count(*)::int n,
      count(*) filter (where kazandi)::int kaz,
      count(*) filter (where kac < 2)::int serbest_n, count(*) filter (where kac < 2 and kazandi)::int serbest_kaz,
      count(*) filter (where kac >= 2)::int garanti_n, count(*) filter (where kac >= 2 and kazandi)::int garanti_kaz,
      max(kac)::int maxkac, count(*) filter (where kazandi and joker = 'elli')::int elli, count(*) filter (where kazandi and joker = 'sure')::int sure,
      count(*) filter (where kazandi and (bedava is distinct from joker))::int bedava_uyumsuz,
      count(*) filter (where not kazandi and (joker is not null or bedava is not null))::int kayip_jokerli from _dv`)).map(sayiyaCevir)[0];
  console.log('     DEVAM döngüsü:', JSON.stringify(st));
  const oran = st.serbest_kaz / st.serbest_n;
  ok(`serbest denemelerde kazanma oranı ≈ %50 (${(oran * 100).toFixed(1)}%, ${st.serbest_n} deneme)`, oran > 0.42 && oran < 0.58);
  ok(`2 kaçırmadan sonraki DEVAM HER ZAMAN kazanır (${st.garanti_kaz}/${st.garanti_n})`, st.garanti_n > 30 && st.garanti_kaz === st.garanti_n);
  ok(`art arda en çok 2 kaçırma (max sayaç ${st.maxkac})`, st.maxkac === 2);
  ok(`joker türü yalnız 50:50 / Ek Süre, ikisi de ≈ yarı (${st.elli} / ${st.sure})`, st.elli + st.sure === st.kaz && st.elli > st.kaz * 0.38 && st.sure > st.kaz * 0.38);
  ok('kazanınca bedava = kazanılan tür; kaybedince joker/bedava yok', st.bedava_uyumsuz === 0 && st.kayip_jokerli === 0);
  // Süre dolumu: VERİLMEZ, sayaç değişmez
  await db.sorgu(`update kasa_maclari set joker = jsonb_build_object('_devam', jsonb_build_object('${A}', 2)) where id = '${id}'`);
  await kararaSok(id, `'${A}'`);
  k = await sureDoldur(id);
  ok('karar süresi doldu → DEVAM (sure_doldu) ama ödül YOK, garanti hakkı olsa bile', k.son_karar?.sure_doldu === true && k.faz === 'cevap' && (await devamA(id)) === null && (await kacA(id)) === 2, JSON.stringify([k.son_karar, k.joker]));
  // Alt sınırın altında: karar fazı yok → verilmez; iç yolla zorlansa da verilmez
  await db.sorgu(`update kasa_maclari set faz = 'sonuc', faz_bitis = now() - interval '1 second', sahip = '${A}', kasa = 6 where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('K = 6 < 10: karar fazı açılmadı, soru doğrudan geldi, ödül yok', k.faz === 'cevap' && (await devamA(id)) === null, JSON.stringify([k.faz, k.joker]));
  await kararaSok(id, `'${A}'`, 6);
  await db.sorgu(`select kasa_karar_uygula('${id}', false, false)`);
  ok('K = 6 iken karar fazı zorlansa bile DEVAM ödül vermez', (await devamA(id)) === null && (await kacA(id)) === 2);
  // AÇ ödül vermez
  await kararaSok(id, `'${A}'`);
  await ben(A);
  await hata(`select kasa_karar('${id}', true)`);
  ok('AÇ → ödül yok', (await devamA(id)) === null);
  await db.sorgu(`update kasa_maclari set puan1 = 0, puan2 = 0 where id = '${id}'`);

  // Ücretsiz joker kullanımı: garanti (sayaç 2) ile kazan
  await db.sorgu(`update kasa_maclari set joker = jsonb_build_object('_devam', jsonb_build_object('${A}', 2)) where id = '${id}'`);
  await kararaSok(id, `'${A}'`);
  await ben(A);
  await hata(`select kasa_karar('${id}', false)`);
  const bt = (await devamA(id))?.joker;
  const diger = bt === 'elli' ? 'sure' : 'elli';
  ok(`garanti DEVAM → ücretsiz ${bt}`, ['elli', 'sure'].includes(bt));
  await ben(A);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('sahip: kasa_durum.bedava_joker = tür, devam_odul.kazandi, devam_sans 50', du.bedava_joker === bt && du.devam_odul?.kazandi === true && du.devam_odul?.joker === bt && du.devam_sans === 50, JSON.stringify([du.bedava_joker, du.devam_odul, du.devam_sans]));
  jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('sahip: kasa_joker_durumu.bedava = tür, soruda_kullanildi false', jd.bedava === bt && jd.soruda_kullanildi === false, JSON.stringify(jd));
  // Gizlilik (rakip)
  await ben(B);
  const duR = await json(`select kasa_durum('${id}')::text`);
  const duRMetin = JSON.stringify(duR);
  ok('rakip: bedava_joker / devam_odul YOK, son_karar yalnız DEVAM', duR.bedava_joker == null && duR.devam_odul == null && duR.son_karar?.ac === false && !('kazandi' in (duR.son_karar ?? {})), JSON.stringify([duR.bedava_joker, duR.devam_odul, duR.son_karar]));
  ok('rakip: yanıtta _devam / kazandi / bedava değeri yok, rakip_joker boş (kullanılmadı)', !/_devam|kazandi|"bedava"/.test(duRMetin) && Array.isArray(duR.rakip_joker) && duR.rakip_joker.length === 0, duRMetin.slice(0, 300));
  const jdR = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('rakip: kasa_joker_durumu.bedava null', jdR.bedava == null);
  const yasak2 = [...yasak, '_devam', 'kacirma'];
  const bulunan2 = [...new Set([...anahtarlar(duR), ...anahtarlar(du)])].filter((a) => yasak2.includes(a));
  ok('sahip + rakip durum anahtarlarında gizli alan (doğru cevap, sayaç) yok', bulunan2.length === 0, bulunan2.join(','));
  // Envanter / coin / sınır: dokunulmaz, sayılmaz
  await envYaz(A, bt, 0);
  await envYaz(A, diger, 2);
  const coinA0 = Number(await tek(`select coin::text from profiles where id = '${A}'`));
  const kulA0 = Number(await tek(`select count(*)::text from joker_kullanimlari where user_id = '${A}' and mac_id = '${id}'`));
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'klasik_skill_toplam_hak'`);
  await ben(A);
  ok('yanlış türle ücretsiz kullanım reddedilir', /Ücretsiz jokerin yok/.test(await hata(`select kasa_joker('${id}', '${diger}', false, true)`) || ''));
  const rb = await json(`select kasa_joker('${id}', '${bt}', false, true)::text`);
  ok(`ücretsiz ${bt} kullanıldı (toplam sınır 0 iken bile — sınıra sayılmaz)`, rb.tur === bt && rb.bedava === true && rb.satin_alindi === false && rb.odenen === 0, JSON.stringify(rb));
  await db.sorgu(`update oyun_ayarlari set deger = '6' where anahtar = 'klasik_skill_toplam_hak'`);
  const coinA1 = Number(await tek(`select coin::text from profiles where id = '${A}'`));
  const kulA1 = Number(await tek(`select count(*)::text from joker_kullanimlari where user_id = '${A}' and mac_id = '${id}'`));
  ok(`envanter ${bt} 0 kaldı, coin aynı (${coinA0} → ${coinA1}), joker_kullanimlari'na yazılmadı`, (await env(A, bt)) === 0 && coinA0 === coinA1 && kulA0 === kulA1, JSON.stringify([await env(A, bt), coinA0, coinA1, kulA0, kulA1]));
  du = await json(`select kasa_durum('${id}')::text`);
  ok('kullanınca: bedava silindi, joker.turler içinde, etki uygulandı', du.bedava_joker == null && du.joker?.turler?.includes(bt) && (bt === 'elli' ? du.joker.kapali.length === 2 : new Date(du.sureler.benim_bitis) > new Date(du.faz_bitis)), JSON.stringify([du.bedava_joker, du.joker, du.sureler?.benim_bitis, du.faz_bitis]));
  ok('ücretsiz ikinci kez kullanılamaz', /zaten kullanıldı|Ücretsiz jokerin yok/.test(await hata(`select kasa_joker('${id}', '${bt}', false, true)`) || ''));
  ok('aynı soruda aynı tür ücretli de kullanılamaz', /bu soruda zaten kullanıldı/.test(await hata(`select kasa_joker('${id}', '${bt}', true)`) || ''));
  jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('kasa_joker_durumu: kullanilan 0, soruda_kullanildi false, soru_turleri [tür]', jd.kullanilan === 0 && jd.soruda_kullanildi === false && jd.soru_turleri?.includes(bt) && jd.bedava == null, JSON.stringify(jd));
  ok(`aynı soruda başka tür (${diger}) ücretli kullanılabilir (soru hakkı tüketilmedi)`, (await hata(`select kasa_joker('${id}', '${diger}', false)`)) === null);
  ok(`envanter ${diger} 2 → 1 (ücretli yol değişmedi)`, (await env(A, diger)) === 1);
  await ben(B);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('rakip: kullanılan ücretsiz joker yalnız ADIYLA görünür (rakip_joker)', du.rakip_joker?.includes(bt) && du.bedava_joker == null && du.joker?.kapali?.length === 0, JSON.stringify([du.rakip_joker, du.joker]));
  // Kullanılmazsa kaybolur
  await db.sorgu(`update kasa_maclari set joker = jsonb_build_object('_devam', jsonb_build_object('${A}', 2)) where id = '${id}'`);
  await kararaSok(id, `'${A}'`);
  await ben(A);
  await hata(`select kasa_karar('${id}', false)`);
  const bt2 = (await devamA(id))?.joker;
  ok('yeni ücretsiz joker kazanıldı', !!bt2);
  await db.sorgu(`update kasa_maclari set faz = 'sonuc', faz_bitis = now() - interval '1 second', sahip = null, kasa = 0 where id = '${id}'`);
  k = await sureDoldur(id);
  await ben(A);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('kullanılmayan ücretsiz joker sonraki soruda YOK (sessizce kayboldu), sayaç korunuyor', k.faz === 'cevap' && du.bedava_joker == null && du.devam_odul == null && (await kacA(id)) === 0, JSON.stringify([k.faz, du.bedava_joker, k.joker]));
  ok('kaybolan ücretsiz joker kullanılamaz', /Ücretsiz jokerin yok/.test(await hata(`select kasa_joker('${id}', '${bt2}', false, true)`) || ''));
  // Süren (953 öncesi) maç: devam_sans 0 → ödül yok
  await db.sorgu(`update kasa_maclari set devam_sans = 0, devam_garanti = 0, joker = jsonb_build_object('_devam', jsonb_build_object('${A}', 5)) where id = '${id}'`);
  await kararaSok(id, `'${A}'`);
  await ben(A);
  await hata(`select kasa_karar('${id}', false)`);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('eski maç (devam_sans 0): DEVAM ödül vermez, durum devam_sans 0', (await devamA(id)) === null && du.devam_sans === 0 && du.bedava_joker == null);
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${id}'`);
  // Kapalı ayar → yeni maç kapalı
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'kasa_devam_joker_acik'`);
  const idk = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  ok('kasa_devam_joker_acik = 0 → yeni maçta devam_sans 0, devam_elli false', (await satir(idk)).devam_sans === 0 && (await satir(idk)).devam_elli === false);
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${idk}'`);

  // Bot yolu: aynı kural sunucuda, kazanırsa hemen kullanır
  const idb2 = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  await db.sorgu(`update kasa_maclari set devam_sans = 50, devam_garanti = 2, devam_birakir = false, devam_elli = false where id = '${idb2}'`);
  await sureDoldur(idb2);
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = bot, kasa = 12, karar_baslangic = now(), faz_bitis = now() + interval '9 seconds',
     bot_karar = false, bot_karar_at = now() - interval '1 second', joker = jsonb_build_object('_devam', jsonb_build_object(bot::text, 2)) where id = '${idb2}'`);
  await db.sorgu(`select kasa_ilerlet('${idb2}')`);
  let kb2 = await satir(idb2);
  const bj = kb2.joker?.[BOT] ?? {};
  ok('bot DEVAM (garanti) → jokeri hemen kullandı, bedava kalmadı', kb2.faz === 'cevap' && kb2.son_karar?.veren === BOT && bj.devam?.kazandi === true && (bj.turler ?? []).includes(bj.devam?.joker) && bj.bedava == null, JSON.stringify(kb2.joker));
  await ben(A);
  du = await json(`select kasa_durum('${idb2}')::text`);
  ok('insan: botun jokerini yalnız ADIYLA görür; kazandı bilgisi/sayaç yok', du.rakip_joker?.includes(bj.devam?.joker) && du.bedava_joker == null && du.devam_odul == null && !/_devam|kazandi/.test(JSON.stringify(du)), JSON.stringify([du.rakip_joker, du.devam_odul]));
  // Bot süre dolumu: VERİLMEZ
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = bot, kasa = 12, karar_baslangic = now(), faz_bitis = now() - interval '2 seconds',
     bot_karar = false, bot_karar_at = now() + interval '30 seconds', joker = jsonb_build_object('_devam', jsonb_build_object(bot::text, 2)) where id = '${idb2}'`);
  await db.sorgu(`select kasa_ilerlet('${idb2}')`);
  kb2 = await satir(idb2);
  ok('bot süre dolumu → ödül yok', kb2.son_karar?.sure_doldu === true && kb2.joker?.[BOT]?.devam == null, JSON.stringify(kb2.joker));
  // Bot isabeti: 50:50 → kalan iki şık; Ek Süre → kişisel süre
  await db.sorgu(`create temp table _bt (tur text, dogru int, cevap int, kapali int[], fark numeric) on commit drop`);
  await db.sorgu(`do $$ declare i int; k kasa_maclari; begin
    for i in 1..400 loop
      update kasa_maclari set faz = 'karar', sahip = bot, kasa = 12, tur = 1, kullanilan_sorular = '{}', karar_baslangic = now(),
             faz_bitis = now() + interval '9 seconds', joker = jsonb_build_object('_devam', jsonb_build_object(bot::text, 2)) where id = '${idb2}';
      perform kasa_karar_uygula('${idb2}', false, false);
      select * into k from kasa_maclari where id = '${idb2}';
      insert into _bt select k.joker -> k.bot::text -> 'devam' ->> 'joker', q.dogru_cevap, k.bot_cevap,
             array(select jsonb_array_elements_text(coalesce(k.joker -> k.bot::text -> 'kapali', '[]'))::int),
             (k.joker -> k.bot::text ->> 'fark')::numeric
        from questions q where q.id = k.soru_id;
    end loop; end $$`);
  const bs = (await db.sorgu(`select tur, count(*)::int n, avg((cevap = dogru)::int)::float isabet,
      count(*) filter (where cevap = any(kapali))::int kapaliya, count(*) filter (where dogru = any(kapali))::int dogru_kapali,
      count(*) filter (where tur = 'elli' and coalesce(array_length(kapali, 1), 0) <> 2)::int kapali_eksik,
      min(fark)::float fark_min, max(fark)::float fark_max from _bt group by tur order by tur`)).map(sayiyaCevir);
  console.log('     bot DEVAM ödülü:', JSON.stringify(bs));
  const be = bs.find((x) => x.tur === 'elli'), bsu = bs.find((x) => x.tur === 'sure');
  const ekSure = Number(await tek(`select ayar_sayi('skill_ek_sure_sn', 10)::text`));
  ok('bot 50:50: hiç elenen şıkkı seçmez, doğru şık elenmez, 2 şık kapalı', be && be.kapaliya === 0 && be.dogru_kapali === 0 && be.kapali_eksik === 0, JSON.stringify(be));
  ok(`bot 50:50 isabeti Ek Süre'li turlardan düşük değil (${(be?.isabet * 100).toFixed(0)}% ≥ ${(bsu?.isabet * 100).toFixed(0)}%)`, be && bsu && be.isabet >= bsu.isabet);
  ok(`bot Ek Süre: kişisel süre +${ekSure} sn`, bsu && bsu.fark_min === ekSure && bsu.fark_max === ekSure, JSON.stringify(bsu));
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${idb2}'`);

  console.log('5l) 954 DEVAM bırakır + garanti ücretsiz 50:50');
  await db.sorgu(`update oyun_ayarlari set deger = '1' where anahtar in ('kasa_devam_birakir', 'kasa_devam_joker_acik')`);
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  k = await satir(id);
  ok('yeni maça 954 kuralı sabitlendi (devam_birakir, devam_elli; devam_sans/garanti 0)', k.devam_birakir === true && k.devam_elli === true && k.devam_sans === 0 && k.devam_garanti === 0, JSON.stringify([k.devam_birakir, k.devam_elli, k.devam_sans, k.devam_garanti]));
  const hakVar = async (mid, u) => (await tek(`select (coalesce(joker -> '_hak', '[]'::jsonb) ? '${u}')::text from kasa_maclari where id = '${mid}'`)) === 'true';
  const bedavaU = async (mid, u) => (await tek(`select coalesce(joker -> '${u}' ->> 'bedava', '') from kasa_maclari where id = '${mid}'`)) || null;
  const sonrakiTur = async (mid, kasa = null, sahip = undefined) => {
    await db.sorgu(`update kasa_maclari set faz = 'sonuc', faz_bitis = now() - interval '1 second'
       ${kasa != null ? `, kasa = ${kasa}` : ''}${sahip !== undefined ? `, sahip = ${sahip ? `'${sahip}'` : 'null'}` : ''} where id = '${mid}'`);
    await db.sorgu(`select kasa_ilerlet('${mid}')`);
    return satir(mid);
  };
  k = await sureDoldur(id);   // tur 1 soru
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await satir(id);
  ok('tur 1: tek bilen A → sahip A', k.sahip === A && k.kasa === 2, JSON.stringify([k.sahip, k.kasa]));
  k = await sonrakiTur(id, 12);
  ok('kasa 12, sahip A → karar fazı', k.faz === 'karar' && k.sahip === A, JSON.stringify([k.faz, k.sahip]));
  await ben(A);
  ok('A bilerek DEVAM', (await hata(`select kasa_karar('${id}', false)`)) === null);
  k = await satir(id);
  ok('DEVAM → sahip null, kasa 12 KORUNDU, soru açıldı, son_karar.birakti', k.sahip === null && k.kasa === 12 && k.faz === 'cevap' && k.son_karar?.birakti === true && k.son_karar?.ac === false, JSON.stringify([k.sahip, k.kasa, k.faz, k.son_karar]));
  ok('DEVAM → A kalıcı hak (_hak) + bu soruda ücretsiz 50:50; B hak yok', (await hakVar(id, A)) && (await bedavaU(id, A)) === 'elli' && !(await hakVar(id, B)) && (await bedavaU(id, B)) === null, JSON.stringify(k.joker));
  du = await json(`select kasa_durum('${id}')::text`);
  ok('A: bedava_joker elli, devam_odul elli, devam_birakir/devam_elli true', du.bedava_joker === 'elli' && du.devam_odul?.joker === 'elli' && du.devam_odul?.kazandi === true && du.devam_birakir === true && du.devam_elli === true && du.sahip === null, JSON.stringify([du.bedava_joker, du.devam_odul, du.devam_birakir, du.devam_elli]));
  jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('A: kasa_joker_durumu.bedava = elli', jd.bedava === 'elli', JSON.stringify(jd));
  await ben(B);
  const du954R = await json(`select kasa_durum('${id}')::text`);
  ok('B (rakip): bedava_joker / devam_odul yok, _hak sızmıyor, rakip_joker boş', du954R.bedava_joker == null && du954R.devam_odul == null && !/_hak|"bedava"/.test(JSON.stringify(du954R)) && (du954R.rakip_joker ?? []).length === 0, JSON.stringify([du954R.bedava_joker, du954R.devam_odul, du954R.rakip_joker]));
  ok('B: kasa_joker_durumu.bedava null', (await json(`select kasa_joker_durumu('${id}')::text`)).bedava == null);
  // İkisi de bilir → sahipsiz kalır, +6
  await cevapla(id, A, true); await cevapla(id, B, true);
  k = await satir(id);
  ok('sahipsiz + ikisi de bilir → kasa 18, sahip null', k.kasa === 18 && k.sahip === null, JSON.stringify([k.kasa, k.sahip]));
  k = await sonrakiTur(id);
  ok('sahipsiz → karar fazı YOK, doğrudan soru', k.faz === 'cevap' && k.sahip === null, JSON.stringify([k.faz, k.sahip]));
  ok('sonraki soruda A ücretsiz 50:50 yeniden verildi (kasa açılmadı)', (await bedavaU(id, A)) === 'elli' && (await bedavaU(id, B)) === null);
  // Ücretsiz 50:50: sınır 0 iken bile, envanter/coin dokunmaz
  await envYaz(A, 'elli', 0);
  const coin954 = Number(await tek(`select coin::text from profiles where id = '${A}'`));
  const kul954 = Number(await tek(`select count(*)::text from joker_kullanimlari where user_id = '${A}' and mac_id = '${id}'`));
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'klasik_skill_toplam_hak'`);
  await ben(A);
  ok('ücretsiz Ek Süre YOK (yalnız 50:50)', /Ücretsiz jokerin yok/.test(await hata(`select kasa_joker('${id}', 'sure', false, true)`) || ''));
  const r954 = await json(`select kasa_joker('${id}', 'elli', false, true)::text`);
  ok('ücretsiz 50:50 kullanıldı (toplam sınır 0 iken — sınıra sayılmaz)', r954.tur === 'elli' && r954.bedava === true && r954.kapali?.length === 2 && r954.odenen === 0, JSON.stringify(r954));
  await db.sorgu(`update oyun_ayarlari set deger = '6' where anahtar = 'klasik_skill_toplam_hak'`);
  ok('envanter 0, coin aynı, joker_kullanimlari yazılmadı', (await env(A, 'elli')) === 0 && Number(await tek(`select coin::text from profiles where id = '${A}'`)) === coin954 && Number(await tek(`select count(*)::text from joker_kullanimlari where user_id = '${A}' and mac_id = '${id}'`)) === kul954);
  ok('aynı soruda ikinci ücretsiz 50:50 yok', /Ücretsiz jokerin yok|zaten kullanıldı/.test(await hata(`select kasa_joker('${id}', 'elli', false, true)`) || ''));
  await ben(B);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('B: A kullanınca yalnız ADINI görür (rakip_joker elli), kapalı şıklar görünmez', du.rakip_joker?.includes('elli') && (du.joker?.kapali ?? []).length === 0, JSON.stringify([du.rakip_joker, du.joker]));
  // İkisi de yanlış → sahipsiz kalır, +2
  await cevapla(id, A, false); await cevapla(id, B, false);
  k = await satir(id);
  ok('sahipsiz + ikisi de yanlış → kasa 20, sahip null', k.kasa === 20 && k.sahip === null, JSON.stringify([k.kasa, k.sahip]));
  k = await sonrakiTur(id);
  ok('kullanılan hak sonraki soruda yeniden verildi', k.faz === 'cevap' && (await bedavaU(id, A)) === 'elli');
  // Tek bilen B → yeni sahip B
  await cevapla(id, A, false); await cevapla(id, B, true);
  k = await satir(id);
  ok('sahipsiz + tek bilen B → sahip B, kasa 22', k.sahip === B && k.kasa === 22, JSON.stringify([k.sahip, k.kasa]));
  k = await sonrakiTur(id);
  ok('sahip B, kasa 22 → karar fazı', k.faz === 'karar' && k.sahip === B);
  // Süre dolumu: sahipliği bırakır, hak VERMEZ; A'nın hakkı sürer
  k = await sureDoldur(id);
  ok('B süre doldu → DEVAM: sahip null, kasa 22, sure_doldu + birakti', k.faz === 'cevap' && k.sahip === null && k.kasa === 22 && k.son_karar?.sure_doldu === true && k.son_karar?.birakti === true, JSON.stringify([k.sahip, k.kasa, k.son_karar]));
  ok("süre dolumu B'ye hak vermedi; A'nın hakkı sürüyor", !(await hakVar(id, B)) && (await bedavaU(id, B)) === null && (await bedavaU(id, A)) === 'elli');
  // B de bilerek DEVAM → iki oyuncu hak sahibi
  await cevapla(id, A, false); await cevapla(id, B, true);
  k = await sonrakiTur(id);
  ok('B yine sahip → karar', k.faz === 'karar' && k.sahip === B, JSON.stringify([k.faz, k.sahip]));
  await ben(B);
  await hata(`select kasa_karar('${id}', false)`);
  ok("B bilerek DEVAM → ikisinin de ücretsiz 50:50'si var", (await bedavaU(id, A)) === 'elli' && (await bedavaU(id, B)) === 'elli' && (await satir(id)).sahip === null);
  // Kasa < 10: karar yok (sahip kalır, DEVAM yok)
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await sonrakiTur(id, 6, A);
  ok('kasa 6 < 10, sahip A → karar YOK, sahip A kalır (DEVAM olmadığı için bırakmaz)', k.faz === 'cevap' && k.sahip === A && k.kasa === 6, JSON.stringify([k.faz, k.sahip, k.kasa]));
  // AÇ: iki oyuncunun da hakkı biter
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await sonrakiTur(id, 14, A);
  await ben(A);
  ok('A AÇ (kasa 14)', k.faz === 'karar' && (await hata(`select kasa_karar('${id}', true)`)) === null);
  k = await satir(id);
  ok('AÇ → A puanı +14, kasa 0, sahip null', p(k, A) === 14 && k.kasa === 0 && k.sahip === null && k.faz === 'cevap', JSON.stringify([p(k, A), k.kasa, k.sahip]));
  ok('AÇ → iki oyuncunun hakkı bitti (_hak boş, bu soruda ücretsiz 50:50 yok)', !(await hakVar(id, A)) && !(await hakVar(id, B)) && (await bedavaU(id, A)) === null && (await bedavaU(id, B)) === null, JSON.stringify(k.joker));
  k = await sonrakiTur(id);
  ok('AÇ sonrası sonraki soruda da hak yok', (await bedavaU(id, A)) === null && (await bedavaU(id, B)) === null);
  // Maç sonu: sahipsiz kasa kimseye gitmez
  await db.sorgu(`update kasa_maclari set faz = 'sonuc', faz_bitis = now() - interval '1 second', tur = max_tur, sahip = null, kasa = 30,
     ${k.oyuncu1 === A ? 'puan1 = 20, puan2 = 10' : 'puan1 = 10, puan2 = 20'} where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('tur sınırı, sahip yok, kasa 30 → kasa kimseye gitmez (A 20, B 10), A kazanır', k.durum === 'bitti' && p(k, A) === 20 && p(k, B) === 10 && k.kazanan === A && k.sonuc_neden === 'tur_siniri', JSON.stringify([k.durum, p(k, A), p(k, B), k.kazanan, k.sonuc_neden]));
  // Süren 953 maçı: eski kural (sahip kalır, şanslı ödül)
  const id953 = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  await sureDoldur(id953);
  await db.sorgu(`update kasa_maclari set devam_sans = 50, devam_garanti = 2, devam_birakir = false, devam_elli = false,
     joker = jsonb_build_object('_devam', jsonb_build_object('${A}', 2)), faz = 'karar', sahip = '${A}', kasa = 12,
     karar_baslangic = now(), faz_bitis = now() + interval '9 seconds' where id = '${id953}'`);
  await ben(A);
  await hata(`select kasa_karar('${id953}', false)`);
  k = await satir(id953);
  ok('süren 953 maçı: DEVAM sahipliği bırakmaz, _hak yok, 953 garanti ödülü (50:50/Ek Süre) çalışır', k.sahip === A && !k.son_karar?.birakti && !(await hakVar(id953, A)) && k.joker?.[A]?.devam?.kazandi === true && ['elli', 'sure'].includes(k.joker?.[A]?.bedava), JSON.stringify([k.sahip, k.son_karar, k.joker]));
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${id953}'`);
  // Ayarlar kapalı → yeni maçta 954 kapalı
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar in ('kasa_devam_birakir', 'kasa_devam_joker_acik')`);
  const id954k = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  const k954k = await satir(id954k);
  ok('kasa_devam_birakir = 0 / kasa_devam_joker_acik = 0 → yeni maçta bayraklar false', k954k.devam_birakir === false && k954k.devam_elli === false && k954k.devam_sans === 0);
  await sureDoldur(id954k);
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = '${A}', kasa = 12, karar_baslangic = now(), faz_bitis = now() + interval '9 seconds' where id = '${id954k}'`);
  await ben(A);
  await hata(`select kasa_karar('${id954k}', false)`);
  k = await satir(id954k);
  ok('kapalıyken DEVAM: sahip kalır, hak/ücretsiz joker yok', k.sahip === A && !(await hakVar(id954k, A)) && (await bedavaU(id954k, A)) === null, JSON.stringify([k.sahip, k.joker]));
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${id954k}'`);
  await db.sorgu(`update oyun_ayarlari set deger = '1' where anahtar in ('kasa_devam_birakir', 'kasa_devam_joker_acik')`);
  // Bot
  const idb4 = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  await sureDoldur(idb4);
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = bot, kasa = 12, karar_baslangic = now(), faz_bitis = now() + interval '9 seconds',
     bot_karar = false, bot_karar_at = now() - interval '1 second' where id = '${idb4}'`);
  await db.sorgu(`select kasa_ilerlet('${idb4}')`);
  let kb4 = await satir(idb4);
  let bj4 = kb4.joker?.[BOT] ?? {};
  const dc4 = await dogruCevap(idb4);
  ok("bot DEVAM → sahip null, 50:50'yi bu soruda hemen kullandı (2 kapalı, doğru açık), bedava kalmadı", kb4.faz === 'cevap' && kb4.sahip === null && (bj4.turler ?? []).includes('elli') && bj4.kapali?.length === 2 && !bj4.kapali.includes(dc4) && bj4.bedava == null && !bj4.kapali.includes(kb4.bot_cevap), JSON.stringify([kb4.sahip, bj4, kb4.bot_cevap, dc4]));
  await ben(A);
  du = await json(`select kasa_durum('${idb4}')::text`);
  ok("insan: botun 50:50'sini yalnız ADIYLA görür; _hak/devam yok", du.rakip_joker?.includes('elli') && du.bedava_joker == null && du.devam_odul == null && !/_hak|kazandi/.test(JSON.stringify(du)), JSON.stringify([du.rakip_joker, du.devam_odul]));
  kb4 = await sonrakiTur(idb4);
  bj4 = kb4.joker?.[BOT] ?? {};
  ok('bot: sonraki soruda da 50:50 kullandı (kasa açılmadı)', kb4.faz === 'cevap' && (bj4.turler ?? []).includes('elli') && bj4.kapali?.length === 2, JSON.stringify(bj4));
  // Bot isabeti (sunucu döngüsü): hiç elenen şıkkı seçmez
  await db.sorgu(`create temp table _b4 (dogru int, cevap int, kapali int[]) on commit drop`);
  await db.sorgu(`do $$ declare i int; k kasa_maclari; begin
    for i in 1..300 loop
      update kasa_maclari set faz = 'karar', sahip = bot, kasa = 12, tur = 1, kullanilan_sorular = '{}', karar_baslangic = now(),
             faz_bitis = now() + interval '9 seconds', joker = '{}'::jsonb where id = '${idb4}';
      perform kasa_karar_uygula('${idb4}', false, false);
      select * into k from kasa_maclari where id = '${idb4}';
      insert into _b4 select q.dogru_cevap, k.bot_cevap,
             array(select jsonb_array_elements_text(coalesce(k.joker -> k.bot::text -> 'kapali', '[]'))::int)
        from questions q where q.id = k.soru_id;
    end loop; end $$`);
  const b4 = (await db.sorgu(`select count(*)::int n, avg((cevap = dogru)::int)::float isabet,
      count(*) filter (where cevap = any(kapali))::int kapaliya, count(*) filter (where dogru = any(kapali))::int dogru_kapali,
      count(*) filter (where coalesce(array_length(kapali, 1), 0) <> 2)::int kapali_eksik from _b4`)).map(sayiyaCevir)[0];
  console.log('     bot 954 50:50:', JSON.stringify(b4));
  ok('bot 50:50 (300): elenen şıkkı hiç seçmez, doğru şık elenmez, hep 2 kapalı', b4.n === 300 && b4.kapaliya === 0 && b4.dogru_kapali === 0 && b4.kapali_eksik === 0, JSON.stringify(b4));
  // Bot süre dolumu: bırakır ama hak yok
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = bot, kasa = 12, karar_baslangic = now(), faz_bitis = now() - interval '2 seconds',
     bot_karar = false, bot_karar_at = now() + interval '30 seconds', joker = '{}'::jsonb where id = '${idb4}'`);
  await db.sorgu(`select kasa_ilerlet('${idb4}')`);
  kb4 = await satir(idb4);
  ok('bot süre dolumu → sahip null, 50:50 yok', kb4.son_karar?.sure_doldu === true && kb4.sahip === null && !((kb4.joker?.[BOT]?.turler ?? []).includes('elli')), JSON.stringify(kb4.joker));
  await db.sorgu(`update kasa_maclari set durum = 'iptal' where id = '${idb4}'`);

  console.log('5i) Yetkiler');
  await ben(A);
  await db.sorgu('savepoint r');
  await db.sorgu('set local role authenticated');
  const y1 = await hata(`select count(*) from kasa_maclari`);
  const y2 = await hata(`select count(*) from kasa_hamleler`);
  const y3 = await hata(`select count(*) from kasa_cevaplari`);
  const y4 = await hata(`select kasa_bitir('${id}', null, null)`);
  const y5 = await hata(`select kasa_ilerlet('${id}')`);
  const y6 = await hata(`select count(*) from kasa_deneme_ozeti`);
  const y7 = await hata(`insert into kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values ('${id}', '${A}', '${B}')`);
  const y8 = await hata(`select count(*) from kasa_sinyal`);
  const y9 = await hata(`select kasa_aktif_benim()`);
  const y11 = await hata(`select kasa_joker_durumu('${id}')`);
  const y12 = await hata(`select kasa_oyuncu_bitis(null::kasa_maclari, '${A}')`);
  const y13 = await hata(`select kasa_joker('00000000-0000-0000-0000-000000000000', 'elli', false)`);
  const y15 = await hata(`select kasa_devam_odulu('${id}', '${A}')`);
  const y16 = await hata(`select kasa_joker('00000000-0000-0000-0000-000000000000', 'elli', false, true)`);
  const y17 = await hata(`select kasa_devam_hak_ver('${id}')`);
  await db.sorgu('rollback to savepoint r');
  ok('authenticated: kasa_joker_durumu / kasa_joker çağrılır (izin hatası yok), kasa_oyuncu_bitis kapalı',
    y11 === null && !/permission denied/.test(y13 || '') && /permission denied/.test(y12 || ''), [y11, y12, y13].join(' | '));
  ok('authenticated: kasa_devam_odulu (iç) çağrılamaz, kasa_joker bedava bayrağıyla çağrılır', /permission denied/.test(y15 || '') && !/permission denied/.test(y16 || ''), [y15, y16].join(' | '));
  ok('authenticated: kasa_devam_hak_ver (954 iç) çağrılamaz', /permission denied/.test(y17 || ''), y17);
  ok('authenticated: kasa_maclari / hamleler / cevaplari okunamaz', [y1, y2, y3].every((x) => /permission denied/.test(x || '')), [y1, y2, y3].join(' | '));
  ok('authenticated: iç fonksiyonlar (kasa_bitir, kasa_ilerlet) çağrılamaz', [y4, y5].every((x) => /permission denied/.test(x || '')), [y4, y5].join(' | '));
  ok('authenticated: deneme özeti görünümü kapalı, sinyale yazamaz', /permission denied/.test(y6 || '') && /permission denied/.test(y7 || ''), [y6, y7].join(' | '));
  ok('authenticated: sinyal okunur (kendi satırı), istemci RPC çağrılır', y8 === null && y9 === null, [y8, y9].join(' | '));
  await db.sorgu('savepoint r');
  await db.sorgu('set local role anon');
  const y10 = await hata(`select kasa_durum('${id}')`);
  const y14 = await hata(`select kasa_joker('${id}', 'elli', false)`);
  await db.sorgu('rollback to savepoint r');
  ok('anon: kasa_durum / kasa_joker çağrılamaz', /permission denied/.test(y10 || '') && /permission denied/.test(y14 || ''), [y10, y14].join(' | '));

  // ---------------------------------------------------------------- 6) geri al + doğrula
  await db.sorgu('rollback');
  console.log('6) ROLLBACK sonrası');
  const md5Sonra = await ortakMd5();
  ok(`ortak fonksiyonlar (${md5Once.length} imza) eski tanımda`, JSON.stringify(md5Once) === JSON.stringify(md5Sonra));
  if (!canli950) {
    ok('kasa_maclari tablosu yok', (await tek(`select coalesce(to_regclass('public.kasa_maclari')::text, 'yok')`)) === 'yok');
  } else if (canli951) {
    // 951 canlıda: geri alınan yalnız 952 (kasa_olustur tanımı + kasa_giris_sahne_ms ayarı — ayar karşılaştırması aşağıda)
    ok('kasa_olustur migration öncesi tanımda (952 geri alındı)', (await tek(`select coalesce(md5(pg_get_functiondef(to_regprocedure('public.kasa_olustur(uuid,uuid,boolean,boolean)'))), 'yok')`)) === olusturOnce);
  } else {
    ok('951 kolonları (acma_min, jokerli, joker) yok', (await tek(`select count(*)::text from information_schema.columns where table_name = 'kasa_maclari' and column_name in ('acma_min', 'jokerli', 'joker')`)) === '0');
    ok('kasa_joker / kasa_joker_durumu / kasa_oyuncu_bitis yok', (await tek(`select count(*)::text from pg_proc where proname in ('kasa_joker', 'kasa_joker_durumu', 'kasa_oyuncu_bitis')`)) === '0');
    ok("joker_kullanimlari kısıtında 'kasa' yok", !(await tek(`select pg_get_constraintdef(oid) from pg_constraint where conname = 'joker_kullanimlari_mac_tur_check'`)).includes('kasa'));
  }
  ok('bütün kasa_* fonksiyonları (imza + md5) migration öncesiyle aynı', (await tek(kasaFnSorgu)) === kasaFnOnce);
  ok('kasa_maclari kolonları migration öncesiyle aynı', (await tek(`select coalesce(string_agg(column_name, ',' order by column_name), '') from information_schema.columns where table_name = 'kasa_maclari'`)) === kasaKolonOnce);
  ok('kasa ayarları migration öncesiyle aynı', (await tek(`select coalesce(string_agg(anahtar || '=' || deger::text, ',' order by anahtar), '') from oyun_ayarlari where anahtar like 'kasa\\_%'`)) === ayarOnce);
} catch (e) {
  if (e.message !== 'ön kontrol: bekle') { kaldi++; console.log('  ✗ HATA:', e.message); }
  try { await db.sorgu('rollback'); } catch { /* işlem yok */ }
} finally {
  if (gecti + kaldi) console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı`);
  await db.kapat();
  if (kaldi) process.exitCode = 1;
}
