// KASA modu (950) SQL provası — TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
//
// Sıra:
//   0) Ön kontrol (salt okunur): turnuva saatleri + aktif maç/düello/grup/turnuva. Önümüzdeki 30 dk'da
//      seans ya da aktif oyun varsa test ÇALIŞMAZ (çıkış kodu 2).
//   1) BEGIN, kısa lock_timeout/statement_timeout.
//   2) REGRESYON (önce): Klasik + Düello gerçek maçlarıyla cift_odul_carpani, xp_mac_odulu,
//      sezon_puani_ekle, mac_sonu_ozet çıktıları (yan etkiler savepoint ile geri alınır).
//   3) Migration 950 (">>> TEST DIŞI" işaretinden sonrası — cron + realtime — çalıştırılmaz).
//   4) REGRESYON (sonra): aynı girdiler, çıktılar birebir aynı olmalı. Fark varsa durur.
//   5) KASA kuralları, ödül, sızıntı, bot, kopukluk, kapalı mod, yetkiler.
//   6) ROLLBACK + ortak fonksiyonların tanımı (md5) migration öncesiyle aynı mı, kasa_maclari yok mu.
//
// Kullanım: node araclar/kasa-sql-testi.mjs [--zorla]   (--zorla: ön kontrol uyarısını atlar)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = new URL('../supabase/migrations/20260612000950_kasa_modu.sql', import.meta.url);
const ZORLA = process.argv.includes('--zorla');
const ORTAK = ['cift_odul_carpani', 'xp_mac_odulu', 'sezon_puani_ekle', 'gorev_olcum', 'gorev_dogru_satirlari',
  'gorev_sayaci', 'odul_dokumu', 'level_kazancim', 'mac_sonu_ozet', 'trg_iletisim_engel'];

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
  console.log('3) Migration 950 (cron + realtime hariç)');
  const tam = fs.readFileSync(MIG, 'utf8');
  const kes = tam.indexOf('-- >>> TEST DIŞI');
  if (kes < 0) throw new Error('TEST DIŞI işareti bulunamadı');
  await db.sorgu(tam.slice(0, kes));
  ok('migration hatasız derlendi', true);

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

  console.log('5a) Kural akışı (insan-insan, Dereceli)');
  let id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  let k = await satir(id);
  ok('maç başlangıç fazında, kural değerleri sabitlendi (2/6/20/24/15/8)', k.faz === 'baslangic' && k.artis === 2 && k.ikisi_artis === 6 && k.hedef === 20 && k.max_tur === 24 && k.soru_sn === 15 && k.karar_sn === 8, JSON.stringify([k.faz, k.artis, k.ikisi_artis, k.hedef, k.max_tur, k.soru_sn, k.karar_sn]));
  ok('24+ soru önceden seçildi', (k.soru_ids || []).length >= 24, String((k.soru_ids || []).length));
  k = await sureDoldur(id);
  ok('3-2-1 bitince tur 1: sahip yok → doğrudan soru', k.tur === 1 && k.faz === 'cevap' && k.soru_id, JSON.stringify([k.tur, k.faz]));
  ok('A doğru cevaplar', (await cevapla(id, A, true)) === null);
  ok('A ikinci kez cevaplayamaz', /zaten/.test(await cevapla(id, A, true) || ''));
  ok('B yanlış cevaplar', (await cevapla(id, B, false)) === null);
  k = await satir(id);
  ok('ikisi cevaplayınca hemen sonuç: K = 2, tek bilen A sahip', k.faz === 'sonuc' && k.kasa === 2 && k.sahip === A, JSON.stringify([k.faz, k.kasa, k.sahip]));
  await ben(A);
  let du = await json(`select kasa_durum('${id}')::text`);
  ok('durum (sonuç): ben_dogru true, rakip_dogru false, artış 2', du.sonuc?.ben_dogru === true && du.sonuc?.rakip_dogru === false && du.sonuc?.artis === 2, JSON.stringify(du.sonuc));
  k = await sureDoldur(id);
  ok('tur 2: sahip A → karar fazı (8 sn + pay)', k.tur === 2 && k.faz === 'karar', JSON.stringify([k.tur, k.faz]));
  await ben(B);
  ok('B (sahip değil) karar veremez', /sahibinde/.test(await hata(`select kasa_karar('${id}', true)`) || ''));
  await ben(B);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('rakip karar fazını görür: karar.veren = A (istemci "Rakip karar veriyor…")', du.karar?.veren === A && du.soru == null, JSON.stringify(du.karar));
  await ben(A);
  ok('A DEVAM der', (await hata(`select kasa_karar('${id}', false)`)) === null);
  k = await satir(id);
  ok('DEVAM → soru açıldı, son_karar devam', k.faz === 'cevap' && k.son_karar?.ac === false, JSON.stringify([k.faz, k.son_karar]));
  await cevapla(id, A, true); await cevapla(id, B, true);
  k = await satir(id);
  ok('ikisi de doğru → K = 2 + 6 = 8, sahip değişmez (A)', k.kasa === 8 && k.sahip === A, JSON.stringify([k.kasa, k.sahip]));
  k = await sureDoldur(id);
  await ben(A);
  ok('tur 3: A AÇ der', k.faz === 'karar' && (await hata(`select kasa_karar('${id}', true)`)) === null);
  k = await satir(id);
  ok('AÇ → A puanı 8, K = 0, sahip yok, soru aynı turda açıldı', p(k, A) === 8 && k.kasa === 0 && k.sahip === null && k.faz === 'cevap' && k.tur === 3, JSON.stringify([p(k, A), k.kasa, k.sahip, k.faz, k.tur]));
  const h3 = await json(`select row_to_json(h)::text from kasa_hamleler h where kasa_id = '${id}' and tur = 3`);
  ok('hamle kaydı: karar ac, açılan 8, karar veren A', h3.karar === 'ac' && h3.acilan_deger === 8 && h3.karar_veren === A, JSON.stringify(h3));
  await cevapla(id, A, false); await cevapla(id, B, false);
  k = await satir(id);
  ok('ikisi de yanlış → K = 2, sahip yok kalır', k.kasa === 2 && k.sahip === null, JSON.stringify([k.kasa, k.sahip]));
  k = await sureDoldur(id);
  ok('tur 4: sahip yok → karar yok, doğrudan soru', k.tur === 4 && k.faz === 'cevap', JSON.stringify([k.tur, k.faz]));
  await cevapla(id, A, false); await cevapla(id, B, true);
  k = await satir(id);
  ok('B tek bilen → sahip B, K = 4', k.sahip === B && k.kasa === 4, JSON.stringify([k.sahip, k.kasa]));
  // Süre dolumu = DEVAM
  k = await sureDoldur(id);
  ok('tur 5 karar fazı (sahip B)', k.faz === 'karar' && k.tur === 5);
  k = await sureDoldur(id);
  ok('karar süresi doldu → DEVAM (sure_doldu), soru açıldı', k.faz === 'cevap' && k.son_karar?.sure_doldu === true, JSON.stringify(k.son_karar));
  // Yanıtsız: süre dolunca yanlış
  k = await sureDoldur(id);   // cevap süresi + tolerans doldu
  ok('ikisi de yanıtsız → çözümlendi, K += 2 = 6, sahip B', k.faz === 'sonuc' && k.kasa === 6 && k.sahip === B, JSON.stringify([k.faz, k.kasa, k.sahip]));
  const yanitsiz = await tek(`select count(*)::text from kasa_cevaplari where kasa_id = '${id}' and tur = 5 and cevap is null and not dogru`);
  ok('yanıtsız cevaplar null + yanlış olarak kaydedildi', yanitsiz === '2', yanitsiz);
  // Hedef: B 15 puan + K 6 → AÇ → 21
  k = await satir(id);
  await setPuan(id, k, B, 15);
  const coinOnce = Number(await tek(`select coin::text from profiles where id = '${B}'`));
  const ligOnce = Number(await tek(`select puan::text from profiles where id = '${B}'`));
  k = await sureDoldur(id);
  await ben(B);
  ok('tur 6: B AÇ', k.faz === 'karar' && (await hata(`select kasa_karar('${id}', true)`)) === null);
  k = await satir(id);
  ok('AÇ sonrası 21 ≥ 20 → maç bitti, kazanan B, neden hedef', k.durum === 'bitti' && k.kazanan === B && k.sonuc_neden === 'hedef' && p(k, B) === 21, JSON.stringify([k.durum, k.kazanan, k.sonuc_neden, p(k, B)]));

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
  ok('görev "doğru soru" Kasa doğrularını sayar (B: 2)', dSonra - dOnce === 2, `${dOnce} → ${dSonra}`);
  await ben(A);
  const bitDu = await json(`select kasa_durum('${id}')::text`);
  ok('bitmiş maçta geçmiş 6 tur, doğru cevap ancak şimdi', Array.isArray(bitDu.gecmis) && bitDu.gecmis.length === 6 && bitDu.gecmis[0].dogru_cevap != null, String(bitDu.gecmis?.length));

  console.log('5c) Tur sınırı + Altın Soru');
  id = await tek(`select kasa_olustur('${A}', '${B}', false, true)`);
  k = await satir(id);
  await db.sorgu(`update kasa_maclari set tur = 24, faz = 'sonuc', faz_bitis = now() - interval '1 second',
     puan1 = 12, puan2 = 6, sahip = oyuncu2, kasa = 4 where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('24. tur sonu: sahip (o2) kasayı alır 10–12 → o1 kazanır, neden tur_siniri', k.durum === 'bitti' && k.kazanan === k.oyuncu1 && k.sonuc_neden === 'tur_siniri' && k.puan2 === 10, JSON.stringify([k.durum, k.kazanan === k.oyuncu1, k.sonuc_neden, k.puan1, k.puan2]));
  id = await tek(`select kasa_olustur('${A}', '${B}', false, true)`);
  await db.sorgu(`update kasa_maclari set tur = 24, faz = 'sonuc', faz_bitis = now() - interval '1 second',
     puan1 = 10, puan2 = 6, sahip = oyuncu2, kasa = 4 where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await satir(id);
  ok('eşitlik 10–10 → Altın Soru (altin, tur 25, cevap fazı)', k.durum === 'aktif' && k.altin && k.tur === 25 && k.faz === 'cevap' && k.puan2 === 10, JSON.stringify([k.durum, k.altin, k.tur, k.faz]));
  await cevapla(id, A, false); await cevapla(id, B, false);
  k = await sureDoldur(id);
  ok('Altın Soru: ikisi de yanlış → yeni Altın Soru (tur 26)', k.durum === 'aktif' && k.altin && k.tur === 26 && k.faz === 'cevap', JSON.stringify([k.durum, k.tur, k.faz]));
  await cevapla(id, A, true); await cevapla(id, B, false);
  k = await sureDoldur(id);
  ok('Altın Soru: yalnız A bildi → A kazanır, neden altin', k.durum === 'bitti' && k.kazanan === A && k.sonuc_neden === 'altin', JSON.stringify([k.durum, k.kazanan === A, k.sonuc_neden]));
  ok('davetli (serbest) maçta lig yok: dereceli false', k.dereceli === false);

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
    'soru_ids', 'kullanilan_sorular', 'is_bot', 'bot_turu', 'rakip_cevap'];
  const bulunan = [...new Set(anahtarlar(du))].filter((a) => yasak.includes(a));
  ok('cevap fazında durum JSON anahtarlarında gizli alan yok', bulunan.length === 0, bulunan.join(','));
  ok('alanlar: soru metni + şıklar var, sonuç yok', du.soru?.soru && Array.isArray(du.soru?.secenekler) && du.sonuc == null);
  await db.sorgu(`update kasa_maclari set bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await ben(A);
  du = await json(`select kasa_durum('${id}')::text`);
  ok('bot cevapladı → rakip_cevapladi true, şıkkı GÖRÜNMEZ', du.cevap?.rakip_cevapladi === true && !JSON.stringify(du.cevap).includes('"rakip_cevap"'), JSON.stringify(du.cevap));
  console.log('     kasa_durum anahtarları:', Object.keys(du).join(', '));

  console.log('5e) Bot kararı');
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
  await db.sorgu(`update kasa_maclari set faz = 'karar', sahip = bot, kasa = 5,
     puan1 = case when oyuncu1 = bot then 15 else puan1 end, puan2 = case when oyuncu2 = bot then 15 else puan2 end where id = '${id}'`);
  ok('bot: kasa hedefe ulaştırıyorsa her zaman AÇ', (await tek(`select kasa_bot_karar('${id}')::text`)) === 'true');
  const tarz = await db.sorgu(`select kasa_bot_tarz(id) t, count(*)::text n from profiles where is_bot group by 1 order by 1`);
  ok(`tarz dağılımı üç tarzı da içerir (${tarz.map((x) => `${x.t}:${x.n}`).join(' ')})`, tarz.length === 3);
  const deneme = await tek(`with t as (select kasa_bot_tarz(id) tz, id from profiles where is_bot)
     select (select tz from t where id = '${BOT}') = (select kasa_bot_tarz('${BOT}'))`);
  ok('tarz deterministik (aynı bot → aynı tarz)', deneme === 't');
  // Eşik: dengeli 8 ± 2 → K=5 asla, K=11 her zaman
  await db.sorgu(`update kasa_maclari set bot_tarz = 'dengeli', puan1 = 0, puan2 = 0 where id = '${id}'`);
  const e5 = await tek(`select bool_or(kasa_bot_karar('${id}'))::text from generate_series(1, 40)`);
  await db.sorgu(`update kasa_maclari set kasa = 11 where id = '${id}'`);
  const e11 = await tek(`select bool_and(kasa_bot_karar('${id}'))::text from generate_series(1, 40)`);
  await db.sorgu(`update kasa_maclari set kasa = 8 where id = '${id}'`);
  const e8 = await tek(`select (count(*) filter (where kasa_bot_karar('${id}')))::text from generate_series(1, 300)`);
  ok(`Dengeli: K=5 hiç açmaz, K=11 hep açar, K=8 kimi zaman (${e8}/300)`, e5 === 'false' && e11 === 'true' && Number(e8) > 100 && Number(e8) < 300);

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
  await db.sorgu('rollback to savepoint r');
  ok('authenticated: kasa_maclari / hamleler / cevaplari okunamaz', [y1, y2, y3].every((x) => /permission denied/.test(x || '')), [y1, y2, y3].join(' | '));
  ok('authenticated: iç fonksiyonlar (kasa_bitir, kasa_ilerlet) çağrılamaz', [y4, y5].every((x) => /permission denied/.test(x || '')), [y4, y5].join(' | '));
  ok('authenticated: deneme özeti görünümü kapalı, sinyale yazamaz', /permission denied/.test(y6 || '') && /permission denied/.test(y7 || ''), [y6, y7].join(' | '));
  ok('authenticated: sinyal okunur (kendi satırı), istemci RPC çağrılır', y8 === null && y9 === null, [y8, y9].join(' | '));
  await db.sorgu('savepoint r');
  await db.sorgu('set local role anon');
  const y10 = await hata(`select kasa_durum('${id}')`);
  await db.sorgu('rollback to savepoint r');
  ok('anon: kasa_durum çağrılamaz', /permission denied/.test(y10 || ''), y10);

  // ---------------------------------------------------------------- 6) geri al + doğrula
  await db.sorgu('rollback');
  console.log('6) ROLLBACK sonrası');
  const md5Sonra = await ortakMd5();
  ok(`ortak fonksiyonlar (${md5Once.length} imza, 9 değişen + sezon_puani_ekle) eski tanımda`, JSON.stringify(md5Once) === JSON.stringify(md5Sonra));
  ok('kasa_maclari tablosu yok', (await tek(`select coalesce(to_regclass('public.kasa_maclari')::text, 'yok')`)) === 'yok');
  ok('kasa ayarları yok', (await tek(`select count(*)::text from oyun_ayarlari where anahtar like 'kasa\\_%'`)) === '0');
} catch (e) {
  if (e.message !== 'ön kontrol: bekle') { kaldi++; console.log('  ✗ HATA:', e.message); }
  try { await db.sorgu('rollback'); } catch { /* işlem yok */ }
} finally {
  if (gecti + kaldi) console.log(`\nSonuç: ${gecti} geçti, ${kaldi} kaldı`);
  await db.kapat();
  if (kaldi) process.exitCode = 1;
}
