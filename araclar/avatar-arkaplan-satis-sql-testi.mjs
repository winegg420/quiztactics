// Avatar + arka plan satışı ve Sezon Yolu avatar/arka plan ödülleri (820–822) — tek transaction, sonunda ROLLBACK
// (canlıya HİÇBİR ŞEY yazılmaz; migration'lar da yalnız bu transaction içinde uygulanır).
// Sınar: nadirlik/edinme dağılımı · Koleksiyon Puanı ve bot avatarları değişmez · takılı ücretli avatar korunur ·
// ücretsiz seçilir, ücretli sahiplik ister · satın alma (yetersiz bakiye, defter satırı, çift alım reddi) · arka plan
// nadirlik fiyatı + giyme doğrulaması · BP avatar/arka plan ödülü, "zaten sahip", tek satırlık yuva güncellemesi,
// geriye dönük verme · yetkiler. En sonda (ayrı, yine ROLLBACK) eşzamanlılık: satın alma profil satırını kilitler.
// GÜNCEL ÜRÜN (canlıda 847–849 uygulanmış): arka planlar dondurulmuş (848: pa_* pasif) ve Battle Pass 8. / 17. ücretli yuvalar
// ELMAS (849: 25 / 30). 820–822 yalnız `placeholder` yuvaları doldurduğundan 8/17 elmas kalır. Arka plan SATIN ALMA / GİYME
// mekanizması (821) yine sınanır: pa_* kayıtları yalnız bu transaction içinde geri aktif edilir (ROLLBACK ile gider).
// Kullanım: node araclar/avatar-arkaplan-satis-sql-testi.mjs
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = ['820_avatar_satis', '821_arka_plan_satis', '822_bp_avatar_arka_plan_odulleri']
  .map((a) => `supabase/migrations/20260612000${a}.sql`);
const B = '5b555bd3-9371-4f35-90a5-39289111335e';   // insan test hesabı (sahip değil)
const u = (anahtar) => `/avatars/${/-k\d+$/.test(anahtar) ? 'pro' : 'pro2'}/${anahtar}.svg`;

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const ben = (id) => db.sorgu(`select set_config('request.jwt.claim.sub', '${id}', true), set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true)`);
const kimse = () => db.sorgu(`select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true)`);
const tek = (s) => db.tek(s);
const dene = async (s) => {
  await db.sorgu('savepoint d');
  try { const r = await db.tek(s); await db.sorgu('release savepoint d'); return { r }; }
  catch (e) { await db.sorgu('rollback to savepoint d'); return { hata: e.message }; }
};
const hizSifirla = () => db.sorgu(`delete from rpc_sayac where uc_adi in ('avatar_onayla','avatar_satin_al','kozmetik_satin_al','kozmetik_tak','bp_odul_al','bp_toplu_al','bp_satin_al')`);
const elmas = (id) => tek(`select elmas from profiles where id='${id}'`);
const avatarSahip = (id, a) => tek(`select count(*) from oyuncu_avatarlari where user_id='${id}' and avatar='${a}'`);
const kozSahip = (id, k) => tek(`select count(*) from oyuncu_kozmetikleri where user_id='${id}' and kozmetik='${k}'`);

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(`set local statement_timeout = '30s'`);
  const SAHIP = await tek(`select id from profiles where public.sahip_kullanici_mi(id) limit 1`);
  ok('sahip hesabı ve test hesabı bulundu', Boolean(SAHIP) && (await tek(`select count(*) from profiles where id='${B}' and not coalesce(is_bot,false)`)) === '1');

  // ---------------------------------------------------------------- migration öncesi / sonrası
  console.log('— migration: değişmemesi gerekenler');
  const gor = async () => ({
    nadirlik: await tek(`select string_agg(nadirlik||' '||n, ' · ' order by nadirlik) from (select n.nadirlik, count(*) n from avatar_nitelikleri n left join avatar_katalogu k on k.url=n.url where coalesce(k.aktif,true) group by 1) t`),
    kedili: await tek(`select nadirlik from avatar_nitelikleri where anahtar='kedili-genc-y36'`),
    pasif: await tek(`select md5(string_agg(n.anahtar||n.nadirlik||n.edinme, '|' order by n.anahtar)) from avatar_nitelikleri n join avatar_katalogu k on k.url=n.url where not k.aktif`),
    botAvatar: await tek(`select md5(string_agg(id::text||coalesce(avatar_url,'')||avatar_onayli::text, '|' order by id)) from profiles where coalesce(is_bot,false)`),
    insanAvatar: await tek(`select md5(string_agg(id::text||coalesce(avatar_url,'')||avatar_onayli::text, '|' order by id)) from profiles where not coalesce(is_bot,false)`),
    koleksiyon: await tek(`select md5(string_agg(id::text||koleksiyon_puani, '|' order by id)) from profiles`),
    koleksiyonFn: await tek(`select md5(prosrc) from pg_proc where proname='koleksiyon_kalemleri'`),
    kozNadirlik: await tek(`select md5(string_agg(anahtar||coalesce(nadirlik,'')||aktif::text||onay||satis_pasif::text, '|' order by anahtar)) from kozmetikler`),
    arkaSahip: await tek(`select md5(string_agg(o.user_id::text||o.kozmetik||o.kaynak, '|' order by o.user_id, o.kozmetik)) from oyuncu_kozmetikleri o`),
    takili: await tek(`select md5(string_agg(id::text||coalesce(takili_premium_aura,'')||coalesce(takili_premium_cerceve,''), '|' order by id)) from profiles`),
    elmas: await tek(`select md5(string_agg(id::text||elmas, '|' order by id)) from profiles`),
    bpDiger: await tek(`select md5(string_agg(to_jsonb(o)::text, '|' order by seviye, kol)) from bp_seviye_odulleri o where not (kol='ucretli' and seviye in (5,8,14,17,21,27))`),
    alim: await tek(`select count(*) from oyuncu_bp_odul_alimi`),
    digerFiyat: await tek(`select md5(string_agg(anahtar||coalesce(public.kozmetik_fiyati(tur, fiyat_elmas)::text,'-')||public.kozmetik_satista(anahtar)::text, '|' order by anahtar)) from kozmetikler where tur <> 'premium_aura'`),
  });
  const once = await gor();
  const takiliUcretli = await tek(`select count(*) from profiles p join avatar_nitelikleri n on n.url=p.avatar_url where n.nadirlik in ('epik','efsanevi') and not coalesce(p.is_bot,false)`);
  const botUcretli = await tek(`select count(*) from profiles p join avatar_nitelikleri n on n.url=p.avatar_url where n.nadirlik in ('epik','efsanevi') and coalesce(p.is_bot,false)`);
  const geriyeDonuk = await tek(`select count(distinct user_id) from oyuncu_bp_odul_alimi where kol='ucretli' and seviye in (5,8,14,17,21,27)`);
  console.log(`    (canlı: takılı Epik/Efsanevi avatarlı insan ${takiliUcretli}, bot ${botUcretli}; altı yuvada alım kaydı olan hesap ${geriyeDonuk}; arka plan sahiplik satırı ${await tek(`select count(*) from oyuncu_kozmetikleri o join kozmetikler k on k.anahtar=o.kozmetik where k.tur='premium_aura'`)})`);
  for (const m of MIG) await db.sorgu(fs.readFileSync(m, 'utf8'));
  const sonra = await gor();
  for (const [k, ad] of [['nadirlik', 'aktif nadirlik dağılımı (21/15/18/8)'], ['kedili', 'Kedili Genç nadirliği'], ['pasif', 'pasif avatarlar (nadirlik + edinme)'],
    ['botAvatar', 'bot avatarları (155 gizli + açık botlar)'], ['insanAvatar', 'insan hesapların takılı avatarı'], ['koleksiyon', 'herkesin Koleksiyon Puanı'],
    ['koleksiyonFn', 'koleksiyon_kalemleri gövdesi'], ['kozNadirlik', 'kozmetikler.nadirlik / aktif / onay / satis_pasif'], ['arkaSahip', 'kozmetik (arka plan dahil) sahiplik satırları'],
    ['takili', 'takılı arka plan ve çerçeveler'], ['elmas', 'elmas bakiyeleri'], ['bpDiger', 'diğer 50 BP yuvası (19, 22, 23, 28 dahil)'], ['alim', 'BP alım kayıtları'],
    ['digerFiyat', 'arka plan dışı kozmetiklerin fiyatı ve satış durumu']]) {
    ok(`${ad} AYNI`, once[k] === sonra[k], `${once[k]} → ${sonra[k]}`);
  }
  ok('nadirlik dağılımı efsanevi 8 · epik 18 · nadir 15 · yaygin 21', sonra.nadirlik === 'efsanevi 8 · epik 18 · nadir 15 · yaygin 21', sonra.nadirlik);
  ok('Kedili Genç nadir ve ücretsiz', await tek(`select nadirlik||'/'||edinme from avatar_nitelikleri where anahtar='kedili-genc-y36'`) === 'nadir/ucretsiz');
  ok('edinme: aktif Epik + Efsanevi 26 avatar elmas, Yaygın + Nadir hepsi ücretsiz',
    await tek(`select count(*) filter (where n.edinme='elmas' and n.nadirlik in ('epik','efsanevi'))||'/'||count(*) filter (where n.edinme<>'ucretsiz' and n.nadirlik in ('yaygin','nadir'))||'/'||count(*) filter (where n.edinme='ucretsiz' and n.nadirlik in ('epik','efsanevi')) from avatar_nitelikleri n left join avatar_katalogu k on k.url=n.url where coalesce(k.aktif,true)`) === '26/0/0');
  ok(`takılı ücretli avatarı olan ${takiliUcretli} insan hesabın hepsine sahiplik yazıldı (hediye)`,
    await tek(`select count(*) from oyuncu_avatarlari o join profiles p on p.id=o.user_id join avatar_nitelikleri n on n.anahtar=o.avatar and n.url=p.avatar_url where o.kaynak='hediye'`) === takiliUcretli);
  ok('botlara sahiplik satırı yazılmadı', await tek(`select count(*) from oyuncu_avatarlari o join profiles p on p.id=o.user_id where coalesce(p.is_bot,false)`) === '0');
  ok('fiyatlar ayardan: Epik 150 · Efsanevi 300 · arka plan Nadir 100 / Epik 200 / Efsanevi 300',
    await tek(`select string_agg(deger #>> '{}', ',' order by anahtar) from oyun_ayarlari where anahtar in ('elmas_avatar_epik','elmas_avatar_efsanevi','elmas_arka_plan_nadir','elmas_arka_plan_epik','elmas_arka_plan_efsanevi')`) === '300,200,100,300,150');
  ok('arka plan: Yıldızlı Gece nadir 100 · Sonbahar / Su Altı / Yağan Kar epik 200',
    await tek(`select string_agg(anahtar||':'||dukkan_nadirlik||':'||public.kozmetik_fiyati(tur, fiyat_elmas, dukkan_nadirlik), ',' order by anahtar) from kozmetikler where tur='premium_aura' and anahtar in ('pa_gece','pa_kar','pa_sualti','pa_yaprak')`) === 'pa_gece:nadir:100,pa_kar:epik:200,pa_sualti:epik:200,pa_yaprak:epik:200');
  ok('pasif arka planlar (Köz, Kuzey) dokunulmadı: nadirlik boş, pasif', await tek(`select string_agg(anahtar||':'||coalesce(dukkan_nadirlik,'-')||':'||aktif::text, ',' order by anahtar) from kozmetikler where anahtar in ('pa_kor','pa_kuzey')`) === 'pa_kor:-:false,pa_kuzey:-:false');
  const ara = await gor();
  for (const m of MIG) await db.sorgu(fs.readFileSync(m, 'utf8'));
  const tekrar = await gor();
  ok('migration’lar tekrar çalıştırılınca değişen yok (idempotent)', JSON.stringify(ara) === JSON.stringify(tekrar)
    && await tek(`select count(*) from oyuncu_avatarlari`) === takiliUcretli);

  console.log('— yetkiler');
  const yetki = (f) => tek(`select has_function_privilege('anon', '${f}', 'execute')::text||'/'||has_function_privilege('authenticated', '${f}', 'execute')::text`);
  for (const f of ['public.avatar_satin_al(text)', 'public.avatar_sahiplik_durumu()', 'public.avatar_onayla(text)', 'public.kozmetik_satin_al(text)', 'public.kozmetik_katalogu()', 'public.sezon_yolu_durumum()']) {
    ok(`${f}: anon kapalı, authenticated açık`, await yetki(f) === 'false/true');
  }
  for (const f of ['public.avatar_satis_fiyati(text, text)', 'public.avatar_sahip_mi(uuid, text)', 'public.kozmetik_fiyati(text, integer, text)', 'public.bp_odul_sahip_mi(uuid, text, jsonb)',
    'public.bp_odul_uygula(uuid, bigint, integer, text, jsonb)', 'public.bp_odul_ver_ic(uuid, bigint, integer, text)', 'public.trg_bp_odul_doldur()', 'public.kozmetik_satista(text)']) {
    ok(`${f}: istemciye kapalı`, await yetki(f) === 'false/false');
  }
  ok('sahiplik tablolarına istemci yazamaz (tablo yetkisi yok)',
    await tek(`select count(*) from information_schema.table_privileges where table_name in ('oyuncu_avatarlari','avatar_nitelikleri','oyuncu_kozmetikleri') and grantee in ('anon','authenticated')`) === '0');
  await kimse();
  let d = await dene(`select public.avatar_satin_al('korsan-k19')`);
  ok('oturumsuz satın alma reddedilir', /Giriş gerekli/.test(d.hata ?? ''), JSON.stringify(d));

  // ---------------------------------------------------------------- avatar (sahip kimliğiyle; sahibe ayrıcalık yok)
  console.log('— avatar: ücretsiz seçilir, ücretli sahiplik ister (sahip kimliği)');
  const sahipAvatar = await tek(`select avatar_url from profiles where id='${SAHIP}'`);
  await db.sorgu(`delete from oyuncu_avatarlari where user_id='${SAHIP}' and kaynak <> 'hediye'`);
  await ben(SAHIP);
  d = await dene(`select public.avatar_onayla('${u('kedi-k01')}')`);
  ok('Yaygın avatar (Kedi) seçilir', !d.hata && await tek(`select avatar_url from profiles where id='${SAHIP}'`) === u('kedi-k01'), JSON.stringify(d));
  d = await dene(`select public.avatar_onayla('${u('sovalye-k20')}')`);
  ok('Nadir avatar (Şövalye) seçilir', !d.hata && await tek(`select avatar_url from profiles where id='${SAHIP}'`) === u('sovalye-k20'), JSON.stringify(d));
  d = await dene(`select public.avatar_onayla('${u('kedili-genc-y36')}')`);
  ok('Kedili Genç (nadir) seçilir', !d.hata, JSON.stringify(d));
  d = await dene(`select public.avatar_onayla('${u('korsan-k19')}')`);
  ok('Epik avatar (Korsan) sahiplik yokken SEÇİLEMEZ — sahip hesap dahil', /sende yok/.test(d.hata ?? '') && await tek(`select avatar_url from profiles where id='${SAHIP}'`) === u('kedili-genc-y36'), JSON.stringify(d));
  d = await dene(`select public.avatar_onayla('${u('savas-robotu-y30')}')`);
  ok('Efsanevi avatar (Savaş Robotu) sahiplik yokken SEÇİLEMEZ', /sende yok/.test(d.hata ?? ''), JSON.stringify(d));
  if (sahipAvatar && (await tek(`select count(*) from avatar_nitelikleri where url='${sahipAvatar}' and edinme='elmas'`)) === '1') {
    d = await dene(`select public.avatar_onayla('${sahipAvatar}')`);
    ok('eskiden takılı ücretli avatar (geriye uyumluluk sahipliği) başka avatara geçtikten sonra da yeniden seçilir', !d.hata && await tek(`select avatar_url from profiles where id='${SAHIP}'`) === sahipAvatar, JSON.stringify(d));
  }
  await hizSifirla();

  console.log('— avatar satın alma');
  await db.sorgu(`update profiles set elmas = 100 where id='${SAHIP}'`);
  const hareketOnce = await tek(`select count(*) from elmas_hareketleri where user_id='${SAHIP}'`);
  d = await dene(`select public.avatar_satin_al('korsan-k19')`);
  ok('yetersiz elmas → "Yetersiz elmas"', /Yetersiz elmas/.test(d.hata ?? ''), JSON.stringify(d));
  ok('bakiye değişmedi, sahiplik ve defter satırı yok', await elmas(SAHIP) === '100' && await avatarSahip(SAHIP, 'korsan-k19') === '0'
    && await tek(`select count(*) from elmas_hareketleri where user_id='${SAHIP}'`) === hareketOnce);
  await db.sorgu(`update profiles set elmas = 1000 where id='${SAHIP}'`);
  d = await dene(`select public.avatar_satin_al('korsan-k19')`);
  ok('yeterli elmas → alındı, bakiye 1000 → 850', !d.hata && await elmas(SAHIP) === '850', JSON.stringify(d));
  ok('defter satırı: −150, tur avatar, referans korsan-k19, bakiye_sonra 850',
    await tek(`select miktar||'/'||tur||'/'||referans||'/'||bakiye_sonra from elmas_hareketleri where user_id='${SAHIP}' order by id desc limit 1`) === '-150/avatar/korsan-k19/850');
  ok('sahiplik satırı: kaynak dukkan', await tek(`select kaynak from oyuncu_avatarlari where user_id='${SAHIP}' and avatar='korsan-k19'`) === 'dukkan');
  d = await dene(`select public.avatar_satin_al('korsan-k19')`);
  ok('ikinci satın alma reddedilir ("zaten sende"), bakiye 850, tek sahiplik, tek defter satırı', /zaten sende/.test(d.hata ?? '') && await elmas(SAHIP) === '850'
    && await avatarSahip(SAHIP, 'korsan-k19') === '1' && await tek(`select count(*) from elmas_hareketleri where user_id='${SAHIP}' and tur='avatar' and referans='korsan-k19'`) === '1', JSON.stringify(d));
  d = await dene(`select public.avatar_onayla('${u('korsan-k19')}')`);
  ok('satın alınca seçilir', !d.hata && await tek(`select avatar_url from profiles where id='${SAHIP}'`) === u('korsan-k19'), JSON.stringify(d));
  d = await dene(`select public.avatar_satin_al('${u('savas-robotu-y30')}')`);
  ok('Efsanevi 300 elmas (adresle de alınır): 850 → 550', !d.hata && await elmas(SAHIP) === '550', JSON.stringify(d));
  d = await dene(`select public.avatar_satin_al('kedi-k01')`);
  ok('ücretsiz avatar satın alınmaz', /bedava/.test(d.hata ?? '') && await elmas(SAHIP) === '550', JSON.stringify(d));
  d = await dene(`select public.avatar_satin_al('android-y32')`);
  ok('pasif avatar satın alınmaz', /Böyle bir avatar yok/.test(d.hata ?? ''), JSON.stringify(d));
  d = await dene(`select public.avatar_satin_al('yok-boyle')`);
  ok('bilinmeyen avatar reddedilir', /Böyle bir avatar yok/.test(d.hata ?? ''), JSON.stringify(d));
  await db.sorgu(`update oyun_ayarlari set deger = '175' where anahtar = 'elmas_avatar_epik'`);
  ok('fiyat ayardan okunur (ayar 175 → durum 175)', await tek(`select fiyat from public.avatar_sahiplik_durumu() where anahtar='samuray-y15'`) === '175');
  await db.sorgu(`update oyun_ayarlari set deger = '150' where anahtar = 'elmas_avatar_epik'`);
  await db.sorgu(`update oyun_ayarlari set deger = 'false' where anahtar = 'kozmetik_satis_acik'`);
  d = await dene(`select public.avatar_satin_al('samuray-y15')`);
  ok('satış kapalıyken (kozmetik_satis_acik) alınamaz', /satılmıyor/.test(d.hata ?? '') && await elmas(SAHIP) === '550', JSON.stringify(d));
  await db.sorgu(`update oyun_ayarlari set deger = 'true' where anahtar = 'kozmetik_satis_acik'`);
  ok('durum listesi: 26 ücretli avatar; ücretsizler listede yok; Korsan sahibim, Samuray değil ve satılık',
    await tek(`select count(*)||'/'||count(*) filter (where nadirlik in ('yaygin','nadir'))||'/'||bool_or(sahibim) filter (where anahtar='korsan-k19')||'/'||bool_or(sahibim or not satilik) filter (where anahtar='samuray-y15') from public.avatar_sahiplik_durumu()`) === '26/0/true/false');
  await hizSifirla();

  // ---------------------------------------------------------------- arka plan (sahip olmayan hesapla: sahip test modu kozmetik_tak'ta duruyor)
  console.log('— arka plan: satın alma ve giyme (sahip OLMAYAN hesap)');
  // 848 pa_* kayıtlarını pasifledi (arka planlar dondurulmuş); 821'in satın alma / giyme mekanizmasını sınamak için yalnız bu transaction'da geri aç
  await db.sorgu(`update kozmetikler set aktif = true where tur = 'premium_aura' and anahtar in ('pa_gece','pa_sualti','pa_yaprak','pa_kar')`);
  await db.sorgu(`delete from oyuncu_kozmetikleri where user_id='${B}'`);
  await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}'`);
  await db.sorgu(`update profiles set takili_premium_aura = null, avatar_url = '${u('kedi-k01')}', avatar_onayli = true, elmas = 50 where id='${B}'`);
  await ben(B);
  d = await dene(`select public.kozmetik_tak('premium_aura', 'pa_gece')`);
  ok('sahip olunmayan arka plan giyilemez', /sende yok/.test(d.hata ?? '') && await tek(`select takili_premium_aura is null from profiles where id='${B}'`) === 't', JSON.stringify(d));
  ok('hiçbiri giyili değil → oyuncu kartında arka plan BOŞ (istemci lig arka planına düşer), lig alanı dolu',
    await tek(`select (premium_aura is null)::text||'/'||(lig is not null)::text from public.oyuncu_kartlari(array['${B}'::uuid])`) === 'true/true');
  d = await dene(`select public.kozmetik_satin_al('pa_gece')`);
  ok('yetersiz elmas (50 < 100) → hata, bakiye 50', /Yetersiz elmas/.test(d.hata ?? '') && await elmas(B) === '50', JSON.stringify(d));
  await db.sorgu(`update profiles set elmas = 1000 where id='${B}'`);
  d = await dene(`select public.kozmetik_satin_al('pa_gece')`);
  ok('Yıldızlı Gece 100 elmas: 1000 → 900, defter satırı premium_aura/pa_gece', !d.hata && await elmas(B) === '900'
    && await tek(`select miktar||'/'||tur||'/'||referans from elmas_hareketleri where user_id='${B}' order by id desc limit 1`) === '-100/premium_aura/pa_gece', JSON.stringify(d));
  d = await dene(`select public.kozmetik_satin_al('pa_gece')`);
  ok('ikinci satın alma reddedilir, bakiye 900, tek sahiplik', /zaten sende/.test(d.hata ?? '') && await elmas(B) === '900' && await kozSahip(B, 'pa_gece') === '1', JSON.stringify(d));
  d = await dene(`select public.kozmetik_satin_al('pa_kar')`);
  ok('Yağan Kar (epik) 200 elmas: 900 → 700', !d.hata && await elmas(B) === '700', JSON.stringify(d));
  d = await dene(`select public.kozmetik_tak('premium_aura', 'pa_gece')`);
  ok('satın alınan arka plan giyilir ve kartta görünür', !d.hata && await tek(`select premium_aura from public.oyuncu_kartlari(array['${B}'::uuid])`) === 'pa_gece', JSON.stringify(d));
  d = await dene(`select public.kozmetik_tak('premium_aura', 'pa_sualti')`);
  ok('sahip olunmayan başka arka plana geçilemez; takılı aynı kalır', /sende yok/.test(d.hata ?? '') && await tek(`select takili_premium_aura from profiles where id='${B}'`) === 'pa_gece', JSON.stringify(d));
  d = await dene(`select public.kozmetik_tak('premium_aura', null)`);
  ok('çıkarınca kart yine arka plansız', !d.hata && await tek(`select (premium_aura is null)::text from public.oyuncu_kartlari(array['${B}'::uuid])`) === 'true', JSON.stringify(d));
  ok('katalog: nadirlik içerikte, fiyat nadirlikten (gece nadir 100 · sualti epik 200), satılık',
    await tek(`select string_agg(anahtar||':'||(icerik->>'nadirlik')||':'||fiyat||':'||satilik::text, ',' order by anahtar) from public.kozmetik_katalogu() where anahtar in ('pa_gece','pa_sualti')`) === 'pa_gece:nadir:100:true,pa_sualti:epik:200:true');
  ok('katalog: sanat anahtarı içerikte duruyor', await tek(`select icerik->>'sanat' from public.kozmetik_katalogu() where anahtar='pa_gece'`) === 'gece');
  await hizSifirla();

  // ---------------------------------------------------------------- Battle Pass
  console.log('— Sezon Yolu: yuvalar');
  ok('5 Korsan (epik) · 14 Samuray (epik) · 21 Kristal Uzaylı (efsanevi) · 27 Savaş Robotu (efsanevi)',
    await tek(`select string_agg(seviye||':'||tur||':'||(veri->>'anahtar')||':'||nadirlik||':'||(veri->>'url'), ',' order by seviye) from bp_seviye_odulleri where kol='ucretli' and seviye in (5,14,21,27) and not placeholder`)
      === `5:avatar:korsan-k19:epik:${u('korsan-k19')},14:avatar:samuray-y15:epik:${u('samuray-y15')},21:avatar:kristal-uzayli-y28:efsanevi:${u('kristal-uzayli-y28')},27:avatar:savas-robotu-y30:efsanevi:${u('savas-robotu-y30')}`);
  ok('8 = 25 elmas · 17 = 30 elmas (849: arka plan yuvaları elmasa çevrildi; arka plan ödülü YOK)',
    await tek(`select string_agg(seviye||':'||tur||':'||(veri->>'miktar'), ',' order by seviye) from bp_seviye_odulleri where kol='ucretli' and seviye in (8,17) and not placeholder`) === '8:elmas:25,17:elmas:30'
    && await tek(`select count(*) from bp_seviye_odulleri where tur='arka_plan'`) === '0');
  ok('adlar katalogdan (TR/EN)', await tek(`select string_agg(ad_tr||'|'||ad_en, ';' order by seviye) from bp_seviye_odulleri where kol='ucretli' and seviye in (5,8)`) === 'Korsan avatarı|Pirate avatar;25 elmas|25 gems');
  ok('19, 22, 23 hâlâ "?" · 28 Ejderha çerçevesi', await tek(`select string_agg(seviye||':'||tur||':'||placeholder::text, ',' order by seviye) from bp_seviye_odulleri where kol='ucretli' and seviye in (19,22,23,28)`) === '19:cerceve:true,22:tepki_paketi:true,23:cerceve:true,28:cerceve:false');

  const sezon = await tek(`select id from sezonlar where kapandi_at is null and not test`);
  ok('açık gerçek sezon var', Boolean(sezon));
  const sifirla = async () => {
    await kimse();
    await db.sorgu(`delete from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${sezon}`);
    await db.sorgu(`delete from oyuncu_bp_sahipligi where user_id='${B}' and sezon=${sezon}`);
    await db.sorgu(`delete from oyuncu_kozmetikleri where user_id='${B}'`);
    await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}'`);
    await db.sorgu(`update profiles set takili_premium_aura=null, elmas=2000 where id='${B}'`);
    await db.sorgu(`delete from oyuncu_sezon_puani where user_id='${B}' and sezon=${sezon}`);
    await db.sorgu(`delete from elmas_hareketleri where user_id='${B}' and tur='sezon_yolu'`);   // elmas ödülü yeniden verilebilsin (tekil referans)
    await tek(`select sezon_puani_ekle('${B}', 'turnuva', 'satis:${Math.random()}', 1)`);
    await hizSifirla();
  };
  const spYap = (sp) => db.sorgu(`update oyuncu_sezon_puani set sp=${sp}, seviye=sezon_seviye(${sp}) where user_id='${B}' and sezon=${sezon}`);

  console.log('— Sezon Yolu: ödül sahiplik satırı oluşturur');
  await sifirla(); await spYap(2800); await ben(B);
  d = await dene(`select public.bp_odul_al(5, 'ucretli')`);
  ok("BP'siz ücretli avatar ödülü alınamaz", Boolean(d.hata) && await avatarSahip(B, 'korsan-k19') === '0', JSON.stringify(d));
  await tek(`select public.bp_satin_al()`);
  ok('bp_satin_al (geriye dönük): dört avatar sahipliği (kaynak etkinlik)', await tek(`select string_agg(avatar, ',' order by avatar) from oyuncu_avatarlari where user_id='${B}' and kaynak='etkinlik'`) === 'korsan-k19,kristal-uzayli-y28,samuray-y15,savas-robotu-y30');
  ok('8 / 17 elmas yuvası: arka plan sahipliği YAZILMAZ (849)', await tek(`select count(*) from oyuncu_kozmetikleri where user_id='${B}' and kaynak='etkinlik' and kozmetik like 'pa_%'`) === '0');
  ok('alım kayıtları verildi=true, zaten_sahip işareti yok', await tek(`select count(*) filter (where verildi)||'/'||count(*) filter (where odul ? 'zaten_sahip') from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${sezon} and kol='ucretli' and seviye in (5,8,14,17,21,27)`) === '6/0');
  d = await dene(`select public.avatar_onayla('${u('samuray-y15')}')`);
  ok('ödül avatarı seçilir', !d.hata && await tek(`select avatar_url from profiles where id='${B}'`) === u('samuray-y15'), JSON.stringify(d));
  d = await dene(`select public.kozmetik_tak('premium_aura', 'pa_sualti')`);
  ok('8 / 17 artık elmas: Su Altı arka planı ödülle gelmedi, giyilemez', /sende yok/.test(d.hata ?? '') && await tek(`select takili_premium_aura is null from profiles where id='${B}'`) === 't', JSON.stringify(d));
  d = await dene(`select public.avatar_satin_al('korsan-k19')`);
  ok("BP'den alınan avatar dükkândan ikinci kez alınamaz", /zaten sende/.test(d.hata ?? ''), JSON.stringify(d));
  d = await dene(`select public.bp_odul_al(5, 'ucretli')`);
  ok('aynı ödül ikinci kez alınamaz', Boolean(d.hata) && await avatarSahip(B, 'korsan-k19') === '1', JSON.stringify(d));
  await tek(`select public.bp_toplu_al()`);
  ok('bp_toplu_al tekrarı çift sahiplik yazmaz', await tek(`select count(*) from oyuncu_avatarlari where user_id='${B}'`) === '4' && await tek(`select count(*) from oyuncu_kozmetikleri where user_id='${B}' and kozmetik like 'pa_%'`) === '0');
  await ben(SAHIP);
  ok("BP'deki avatar ve arka plan dükkânda satılmaya devam eder (başka oyuncu için satılık)",
    await tek(`select bool_and(satilik)::text from public.avatar_sahiplik_durumu() where anahtar in ('samuray-y15','kristal-uzayli-y28')`) === 'true'
    && await tek(`select bool_and(satilik)::text from public.kozmetik_katalogu() where anahtar in ('pa_gece','pa_sualti')`) === 'true');

  console.log('— Sezon Yolu: zaten sahipse çift kayıt yok, iade yok');
  await sifirla(); await spYap(900); await ben(B);
  await tek(`select public.avatar_satin_al('korsan-k19')`);      // 2000 → 1850
  await tek(`select public.kozmetik_satin_al('pa_gece')`);       // 1850 → 1750
  ok('dükkândan Korsan + Yıldızlı Gece alındı (1750 elmas)', await elmas(B) === '1750');
  ok('durum: 5 "sahip" işaretli; 8 (elmas yuvası) ve 14 değil', await tek(`select string_agg((o->>'seviye')||':'||(o->>'sahip'), ',' order by (o->>'seviye')::int) from jsonb_array_elements(public.sezon_yolu_durumum()->'oduller') o where o->>'kol'='ucretli' and (o->>'seviye')::int in (5,8,14)`) === '5:true,8:false,14:false');
  await tek(`select public.bp_satin_al()`);                      // 1750 → 1250; seviye 9'a kadar geriye dönük (1. / 7. / 8. seviyenin elmasları dahil)
  ok('BP alındı (500), ödül iadesi/dönüşümü yok: 1250 + seviye ≤ 9 elmas yuvaları (1: 20, 7: 20, 8: 25)',
    Number(await elmas(B)) === 1750 - 500 + Number(await tek(`select coalesce(sum((veri->>'miktar')::int),0) from bp_seviye_odulleri where kol='ucretli' and tur='elmas' and seviye <= 9`)));
  ok('Korsan sahipliği tek satır ve kaynağı hâlâ dükkân', await avatarSahip(B, 'korsan-k19') === '1' && await tek(`select kaynak from oyuncu_avatarlari where user_id='${B}' and avatar='korsan-k19'`) === 'dukkan');
  ok('Yıldızlı Gece sahipliği tek satır ve kaynağı hâlâ dükkân', await kozSahip(B, 'pa_gece') === '1' && await tek(`select kaynak from oyuncu_kozmetikleri where user_id='${B}' and kozmetik='pa_gece'`) === 'dukkan');
  ok('ödüller: 5 alım kaydı verildi=true + zaten_sahip=true; 8 (elmas) verildi=true, zaten_sahip yok', await tek(`select string_agg(seviye||':'||verildi::text||':'||coalesce(odul->>'zaten_sahip','-'), ',' order by seviye) from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${sezon} and kol='ucretli' and seviye in (5,8)`) === '5:true:true,8:true:-');
  await spYap(1400);
  d = await dene(`select public.bp_odul_al(14, 'ucretli')`);
  ok('sahip olmadığı Samuray: bp_odul_al verir, zaten_sahip yok', !d.hata && !/zaten_sahip/.test(d.r ?? '') && await avatarSahip(B, 'samuray-y15') === '1', JSON.stringify(d));
  await kimse();
  await db.sorgu(`insert into oyuncu_avatarlari (user_id, avatar, kaynak) values ('${B}', 'kristal-uzayli-y28', 'hediye')`);
  await spYap(2100); await ben(B);
  d = await dene(`select public.bp_odul_al(21, 'ucretli')`);
  ok('zaten sahip olduğu Kristal Uzaylı: bp_odul_al cevabında zaten_sahip=true, tek satır', !d.hata && /"zaten_sahip": ?true/.test(d.r ?? '') && await avatarSahip(B, 'kristal-uzayli-y28') === '1', JSON.stringify(d));

  console.log('— Sezon Yolu: yuva eşlemesi tek satır veri güncellemesi');
  await kimse();
  await sifirla(); await spYap(1900); await ben(B);
  await tek(`select public.bp_satin_al()`);
  ok('"?" yuva (19) alındı ama ödül bekliyor (verildi=false)', await tek(`select verildi::text from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${sezon} and seviye=19 and kol='ucretli'`) === 'false' && await avatarSahip(B, 'vampir-y19') === '0');
  await kimse();
  await db.sorgu(`update bp_seviye_odulleri set tur='avatar', veri='{"anahtar":"vampir-y19"}', placeholder=false where seviye=19 and kol='ucretli'`);
  ok('tek satır güncelleme: ad, nadirlik ve adres kendiliğinden doldu', await tek(`select ad_tr||'|'||ad_en||'|'||nadirlik||'|'||(veri->>'url') from bp_seviye_odulleri where seviye=19 and kol='ucretli'`) === `Vampir avatarı|Vampire avatar|epik|${u('vampir-y19')}`);
  ok('daha önce o yuvayı almış BP sahibine ödül kendiliğinden verildi (geriye dönük)', await avatarSahip(B, 'vampir-y19') === '1' && await tek(`select verildi::text from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${sezon} and seviye=19 and kol='ucretli'`) === 'true');
  await db.sorgu(`update bp_seviye_odulleri set tur='arka_plan', veri='{"anahtar":"pa_kar"}' where seviye=19 and kol='ucretli'`);
  ok('aynı yuva arka plana çevrilebilir (sonraki sezon): ad ve nadirlik yeniden doldu', await tek(`select ad_tr||'|'||nadirlik||'|'||(veri->>'sanat') from bp_seviye_odulleri where seviye=19 and kol='ucretli'`) === 'Yağan Kar arka planı|epik|kar');
  d = await dene(`update bp_seviye_odulleri set tur='avatar', veri='{"anahtar":"yok-boyle"}', placeholder=false where seviye=23 and kol='ucretli'`);
  ok('katalogda olmayan anahtar güncellemeyi reddeder', /böyle bir avatar yok/.test(d.hata ?? ''), JSON.stringify(d));
  d = await dene(`update bp_seviye_odulleri set tur='arka_plan', veri='{"anahtar":"pc_ejderha2"}', placeholder=false where seviye=23 and kol='ucretli'`);
  ok('arka plan olmayan kozmetik arka plan ödülü yapılamaz', /böyle bir arka plan yok/.test(d.hata ?? ''), JSON.stringify(d));
} catch (e) {
  kaldi++;
  console.log('  ✗ BEKLENMEYEN HATA:', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch { /* bağlantı kopmuş olabilir */ }
}

// ---------------------------------------------------------------- eşzamanlılık (iki bağlantı; ikisi de ROLLBACK)
// Migration canlıda olmadığından ikinci bağlantı yeni işlevi göremez; bu yüzden ikinci "satın alma"nın İLK adımı
// (profil satırını FOR UPDATE ile kilitlemek) doğrudan denenir. Birinci satın alma bitmeden ikinci ilerleyemez;
// bitince sahiplik satırını görür ve yukarıda sınanan "zaten sende" reddine düşer → yalnız biri geçer.
console.log('— eşzamanlılık: satın alma profil satırını kilitler (iki bağlantı, ikisi de geri alınır)');
const db2 = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(fs.readFileSync(MIG[0], 'utf8'));
  await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}'`);
  await db.sorgu(`update profiles set elmas = 1000 where id='${B}'`);
  await ben(B);
  await tek(`select public.avatar_satin_al('korsan-k19')`);
  await db2.sorgu('begin');
  await db2.sorgu(`set local lock_timeout = '1500ms'`);
  let bekledi = null;
  const t0 = Date.now();
  try { await db2.sorgu(`select 1 from profiles where id='${B}' for update`); } catch (e) { bekledi = e.message; }
  const ms = Date.now() - t0;
  ok(`birinci satın alma sürerken ikinci işlem profil kilidinde bekler (${ms} ms sonra kilit zaman aşımı)`, Boolean(bekledi) && /lock timeout|kilit/i.test(bekledi) && ms >= 1200, String(bekledi));
} catch (e) {
  kaldi++;
  console.log('  ✗ BEKLENMEYEN HATA:', e.message);
} finally {
  try { await db2.sorgu('rollback'); } catch { /* yok */ }
  try { await db.sorgu('rollback'); } catch { /* yok */ }
  await db2.kapat();
  await db.kapat();
}
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı — hepsi ROLLBACK (canlıya yazılmadı)`);
process.exit(kaldi ? 1 : 0);
