// ORTAK HAZİNE 987 (DEVAM ödülü = Savunma Hakkı) SQL provası — TEK transaction, sonunda ROLLBACK.
// 987 migration'ını transaction İÇİNDE uygular (canlıda zaten varsa yeniden uygular), kuralları sınar, geri alır.
//   · bilerek DEVAM hak verir (en fazla 1), süre dolumu vermez; 954 ücretsiz 50:50 yeni maçta yok
//   · tetik: hak sahibi yanlış + rakip tek doğru → sahipsiz + Savunma Sorusu (farklı kategori, orta, tur aynı)
//   · yalnız savunan cevaplar / joker kullanır; Zaman Baskısı yok; soru başı sınırı ayrı (soru_index = -tur)
//   · doğru → sahipsiz devam · yanlış / süre / kopma → rakip karar · tek kullanım · AÇ hakları siler
//   · açılmaz: son tur, tavan, Altın Soru · bot savunan · Klasik/Düello fonksiyon + ayarları değişmez
// Kullanım: node araclar/kasa-savunma-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const MIG = fs.readFileSync(new URL('../supabase/migrations/20260612000987_kasa_savunma_hakki.sql', import.meta.url), 'utf8');
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
const OZET = `select string_agg(md5(pg_get_functiondef(p.oid)), ',' order by p.oid::regprocedure::text)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and (p.proname like 'duello%' or p.proname like 'klasik%'
   or p.proname in ('joker_kullan', 'joker_hak_kontrol', 'joker_mac_siniri', 'joker_mac_durumu', 'skill_kullanim_kapisi'))`;
const AYAR = `select string_agg(anahtar || '=' || deger::text, ',' order by anahtar) from oyun_ayarlari
 where anahtar like 'klasik%' or anahtar like 'duello%' or anahtar like 'kasa_joker_%' or anahtar like 'joker%'`;

try {
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '60s'");
  const ozetOnce = await tek(OZET), ayarOnce = await tek(AYAR);

  console.log('1) Migration 987 (transaction içinde)');
  await db.sorgu(MIG);
  ok('Klasik + Düello + ortak joker fonksiyonları birebir (md5)', ozetOnce === await tek(OZET));
  ok('Klasik / Düello / 985 joker ayarları aynı', ayarOnce === await tek(AYAR));
  ok('kasa_savunma_acik = 1', (await tek(`select deger::text from oyun_ayarlari where anahtar = 'kasa_savunma_acik'`)) === '1');
  ok('yeni iç fonksiyonlar authenticated/anon için kapalı', (await tek(`select bool_and(not has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute'))::text from pg_proc p where p.proname like 'kasa_savunma%'`)) === 'true');
  ok('kasa_cevap / kasa_joker / kasa_durum / kasa_joker_durumu yetkisi aynı', (await tek(`select bool_and(has_function_privilege('authenticated', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute'))::text from pg_proc p where p.proname in ('kasa_cevap','kasa_joker','kasa_durum','kasa_joker_durumu')`)) === 'true');

  const H = await db.sorgu(`select id, takma_ad from profiles where takma_ad in ('ArayuzDenetim890', 'ArayuzDenetim648')`);
  const A = H.find((x) => x.takma_ad === 'ArayuzDenetim890')?.id, B = H.find((x) => x.takma_ad === 'ArayuzDenetim648')?.id;
  const BOT = await tek(`select id from profiles where is_bot order by created_at limit 1`);
  if (!A || !B || !BOT) throw new Error('test hesapları / bot yok');
  await db.sorgu(`update profiles set last_seen = now() where id in ('${A}', '${B}')`);
  await db.sorgu(`update oyun_ayarlari set deger = '0' where anahtar = 'jokerler_ucretsiz'`);
  for (const u of [A, B]) for (const t of ['elli', 'sure', 'zaman_baskisi', 'ikinci_sans']) {
    await db.sorgu(`insert into joker_envanter (user_id, tur, adet) values ('${u}', '${t}', 9) on conflict (user_id, tur) do update set adet = 9`);
  }

  // --- yardımcılar ---
  let id;
  const m = () => json(`select row_to_json(k)::text from kasa_maclari k where id = '${id}'`);
  const dogru = async () => Number(await tek(`select q.dogru_cevap::text from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${id}'`));
  const cevap = async (u, c) => { await ben(u); return hata(`select kasa_cevap('${id}', ${c}::smallint)`); };
  const ilerlet = async () => { await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '5 seconds' where id = '${id}' and faz <> 'cevap'`); await db.sorgu(`select kasa_ilerlet('${id}')`); };
  const devam = (sahip, sure = false) => db.sorgu(`update kasa_maclari set faz = 'karar', sahip = '${sahip}', kasa = 10, karar_baslangic = now() where id = '${id}';
     select kasa_karar_uygula('${id}', false, ${sure})`);
  // Normal soruda tetik: h yanlış, r doğru
  const tetikle = async (h, r) => {
    const dg = await dogru();
    await cevap(h, (dg + 1) % 4); await cevap(r, dg);
  };

  console.log('2) Yeni maç kuralları');
  id = await tek(`select kasa_olustur('${A}', '${B}', true, false)`);
  let k = await m();
  const [P, Q] = [k.oyuncu1, k.oyuncu2];
  ok('savunma_acik = true, devam_elli = false (954 ücretsiz 50:50 yok)', k.savunma_acik === true && k.devam_elli === false);
  await ilerlet();
  ok('ilk soru açık', (await m()).faz === 'cevap');
  await db.sorgu(`update kasa_maclari set kasa = 10 where id = '${id}'`);
  await devam(P);
  k = await m();
  ok('bilerek DEVAM → P hakkı, sahip null, kasa ×2', k.savunma_hak.length === 1 && k.savunma_hak[0] === P && k.sahip === null && k.kasa === 20);
  ok('DEVAM 954 _hak / bedava vermedi', !(k.joker?._hak) && !(k.joker?.[P]?.bedava));
  await devam(P);
  ok('ikinci DEVAM → hâlâ tek hak (en fazla 1)', (await m()).savunma_hak.length === 1);
  await devam(Q, true);
  ok('süre dolumu DEVAM hak vermez', !(await m()).savunma_hak.includes(Q));
  const turOnce = (await m()).tur;
  const katTetik = await tek(`select q.kategori from kasa_maclari k join questions q on q.id = k.soru_id where k.id = '${id}'`);

  console.log('3) Tetik + başarılı savunma');
  const kasaOnce = (await m()).kasa;
  await tetikle(P, Q);
  k = await m();
  ok('tetik: sonuç fazı, sahip null, savunma bekliyor', k.faz === 'sonuc' && k.sahip === null && k.savunma?.durum === 'bekliyor' && k.savunma?.sahip === P && k.savunma?.rakip === Q);
  ok('tetikleyen soru kasaya +2 ekledi', k.kasa === kasaOnce + 2, `${kasaOnce}→${k.kasa}`);
  ok('son_tur.savunma var, sahip_sonra null', k.son_tur?.savunma?.sahip === P && k.son_tur?.sahip_sonra === null);
  await ilerlet();
  k = await m();
  const sKat = await tek(`select q.kategori || '|' || q.zorluk from questions q where q.id = '${k.soru_id}'`);
  ok('Savunma Sorusu açıldı (faz cevap, durum soru)', k.faz === 'cevap' && k.savunma?.durum === 'soru');
  ok('tur sayısı değişmedi', k.tur === turOnce, `${turOnce}/${k.tur}`);
  ok('farklı kategori + orta zorluk', sKat.split('|')[0] !== katTetik && sKat.split('|')[1] === '3', `${katTetik} → ${sKat}`);
  ok('hak tüketildi (soru açılınca)', !k.savunma_hak.includes(P));
  ok('süre = normal soru süresi (15 sn + pay)', Math.abs((new Date(k.faz_bitis) - new Date(k.soru_baslangic)) / 1000 - (k.soru_sn + 2)) < 0.01);
  ok('rakip cevaplayamaz', /yalnız hak sahibi/.test(await cevap(Q, 0) || ''));
  await ben(Q);
  ok('rakip joker kullanamaz', /yalnız hak sahibi/.test(await hata(`select kasa_joker('${id}', 'elli', false, false)`) || ''));
  ok('rakibin joker durumu kilitli', (await json(`select kasa_joker_durumu('${id}')::text`)).kilitli === true);
  await ben(P);
  ok('savunan Zaman Baskısı kullanamaz', /Zaman Baskısı/.test(await hata(`select kasa_joker('${id}', 'zaman_baskisi', false, false)`) || ''));
  const jd = await json(`select kasa_joker_durumu('${id}')::text`);
  ok('savunan joker durumu: kilitsiz, yasak_turler zaman_baskisi', jd.kilitli === false && jd.yasak_turler?.[0] === 'zaman_baskisi' && jd.savunma === true);
  ok('savunan 50:50 kullanır', (await hata(`select kasa_joker('${id}', 'elli', false, false)`)) === null);
  ok('joker soru_index = -tur (ayrı soru)', (await tek(`select soru_index::text from joker_kullanimlari where mac_id = '${id}' and user_id = '${P}' order by id desc limit 1`)) === String(-turOnce));
  ok('aynı Savunma Sorusunda ikinci joker reddi (soru başı 1)', /Bu soruda/.test(await hata(`select kasa_joker('${id}', 'sure', false, false)`) || ''));
  const dQ = await json(`select kasa_durum('${id}')::text`);
  ok('kasa_durum: savunma + hak alanları rakipte de görünür', dQ.savunma?.durum === 'soru' && Array.isArray(dQ.savunma_hak) && dQ.savunma_acik === true);
  const kasaS = (await m()).kasa;
  await cevap(P, await dogru());
  k = await m();
  ok('doğru → başarılı, sahipsiz, kasa değişmedi', k.faz === 'sonuc' && k.savunma?.durum === 'basarili' && k.sahip === null && k.kasa === kasaS);
  ok('son_tur.savunma basarili, artis 0', k.son_tur?.savunma?.durum === 'basarili' && k.son_tur?.artis === 0);
  ok('kasa_hamleler.savunma yazıldı', (await tek(`select savunma ->> 'durum' from kasa_hamleler where kasa_id = '${id}' and tur = ${turOnce}`)) === 'basarili');
  await ilerlet();
  k = await m();
  ok('sonra: savunma temiz, yeni tur sahipsiz soru (karar yok)', k.savunma === null && k.tur === turOnce + 1 && k.faz === 'cevap');

  console.log('4) Başarısız savunma (yanlış) → rakip karar');
  await devam(P);
  await tetikle(P, Q); await ilerlet();
  ok('savunma açık', (await m()).savunma?.durum === 'soru');
  await cevap(P, ((await dogru()) + 1) % 4);
  k = await m();
  ok('yanlış → başarısız, sahip rakip', k.savunma?.durum === 'basarisiz' && k.savunma?.neden === 'yanlis' && k.sahip === Q);
  await ilerlet();
  k = await m();
  ok('rakip karar fazında', k.faz === 'karar' && k.sahip === Q && k.savunma === null);
  ok('hak tek kullanımlık (P hakkı yok)', !k.savunma_hak.includes(P));

  console.log('5) Süre dolumu ve bağlantı kopması');
  await devam(Q);                                   // Q hak alır, soru açılır
  await tetikle(Q, P); await ilerlet();
  ok('Q savunuyor', (await m()).savunma?.sahip === Q);
  await db.sorgu(`update kasa_maclari set faz_bitis = now() - interval '3 seconds' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await m();
  ok('süre doldu → başarısız (neden sure), sahip P', k.savunma?.durum === 'basarisiz' && k.savunma?.neden === 'sure' && k.sahip === P);
  await ilerlet();                                   // P karar
  await devam(P); ok('P hak aldı', (await m()).savunma_hak.includes(P));
  await tetikle(P, Q); await ilerlet();
  await db.sorgu(`update profiles set last_seen = now() - interval '5 minutes' where id = '${P}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await m();
  ok('kopma → başarısız (neden kopuk), sahip Q', k.savunma?.durum === 'basarisiz' && k.savunma?.neden === 'kopuk' && k.sahip === Q);
  await db.sorgu(`update profiles set last_seen = now() where id = '${P}'`);
  await db.sorgu(`update kasa_maclari set kopuk_at = null, kopuk_kalan = null where id = '${id}'`);
  await ilerlet();

  console.log('6) AÇ hakları siler · açılmayan durumlar');
  await db.sorgu(`update kasa_maclari set savunma_hak = array['${P}','${Q}']::uuid[], faz = 'karar', sahip = '${Q}', kasa = 6, karar_baslangic = now() where id = '${id}'`);
  await db.sorgu(`select kasa_karar_uygula('${id}', true, false)`);
  k = await m();
  ok('AÇ → bütün haklar silindi', k.savunma_hak.length === 0 && k.faz === 'cevap');
  // Tavan: kasa 79 + 2 = 80 → açılmaz, hak kalır
  await db.sorgu(`update kasa_maclari set savunma_hak = array['${P}']::uuid[], kasa = 79 where id = '${id}'`);
  await tetikle(P, Q);
  k = await m();
  ok('tavan/hedef doldu → savunma yok, rakip sahip, hak duruyor', k.savunma === null && k.sahip === Q && k.kasa === 80 && k.savunma_hak.includes(P));
  await ilerlet();                                   // Q karar
  await devam(Q);                                    // kasa 80 kalır (tavan), soru açılır
  // Son tur
  await db.sorgu(`update kasa_maclari set kasa = 10, tur = max_tur where id = '${id}'`);
  await tetikle(P, Q);
  k = await m();
  ok('son tur → savunma yok', k.savunma === null && k.sahip === Q);
  // Altın Soru: doğrudan kasa_cozumle (altin dalı)
  await db.sorgu(`update kasa_maclari set faz = 'cevap', altin = true, tur = max_tur + 1, cevaplar = '{}'::jsonb, faz_bitis = now() + interval '20 seconds' where id = '${id}'`);
  await tetikle(P, Q);
  k = await m();
  ok('Altın Soru → savunma yok', k.savunma === null);

  console.log('7) Bot savunan');
  id = await tek(`select kasa_olustur('${A}', '${BOT}', true, false)`);
  k = await m();
  const insan = k.oyuncu1 === BOT ? k.oyuncu2 : k.oyuncu1;
  await ilerlet();
  await db.sorgu(`update kasa_maclari set kasa = 10 where id = '${id}'`);
  await devam(BOT);
  ok('bot bilerek DEVAM → hak', (await m()).savunma_hak.includes(BOT));
  const dg = await dogru();
  await db.sorgu(`update kasa_maclari set bot_cevap = ${(dg + 1) % 4}, bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await cevap(insan, dg);
  k = await m();
  ok('bot yanlış + insan doğru → tetik', k.savunma?.sahip === BOT && k.faz === 'sonuc');
  await ilerlet();
  k = await m();
  ok('bot savunmada cevap zamanlandı', k.savunma?.durum === 'soru' && k.bot_cevap !== null && k.bot_cevap_at !== null);
  await db.sorgu(`update kasa_maclari set bot_cevap_at = now() - interval '1 second' where id = '${id}'`);
  await db.sorgu(`select kasa_ilerlet('${id}')`);
  k = await m();
  ok('bot cevapladı → savunma çözüldü', ['basarili', 'basarisiz'].includes(k.savunma?.durum) && k.faz === 'sonuc');

  console.log('8) Eski kural maçı (savunma_acik false) değişmedi');
  await db.sorgu(`update kasa_maclari set savunma_acik = false, devam_elli = true, savunma = null, faz = 'sonuc' where id = '${id}'`);
  await ilerlet();
  await db.sorgu(`update kasa_maclari set kasa = 10 where id = '${id}'`);
  await devam(insan);
  k = await m();
  ok('954 maçı: DEVAM _hak verir, savunma hakkı vermez', (k.joker?._hak ?? []).includes(insan) && k.savunma_hak.length === 0);
} catch (e) {
  kaldi++;
  console.log('  ✗ HATA', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* bağlantı düşmüş olabilir */ }
  try {
    const kalan = await tek(`select count(*)::text from information_schema.columns where table_name = 'kasa_maclari' and column_name = 'savunma_hak'`);
    console.log(`ROLLBACK sonrası canlıda savunma_hak kolonu: ${kalan}`);
  } catch { /* yok */ }
  await db.kapat?.();
  console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
