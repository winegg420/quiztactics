// Avatar edinme = ilerleme (1039) — tek transaction, sonunda ROLLBACK (canlıya HİÇBİR ŞEY yazılmaz).
// Sınar: nadirlik × edinme dağılımı · Epik/Efsanevi level/ücretsiz kolda yok · geçişte takılı avatar kilitlenmedi ·
// level eşiği geçilince avatar 1 kez, sahipse 200 coin · Sezon Yolu ücretsiz kol 10/24 avatar, sahipse coin ·
// coin ile satın alma (yetersiz coin, çift alım, satılmayan) · kilitli avatar avatar_onayla'da reddedilir ·
// avatar_sahiplik_durumu yeni kolonlar · Koleksiyon avatarı nadirliğe göre sayar · botlar · yetkiler.
// Kullanım: node araclar/avatar-edinme-1039-sql-testi.mjs  (migration canlıdaysa --canli: yeniden uygulamaz)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIG = 'supabase/migrations/20260612001039_avatar_edinme_ilerleme.sql';
const CANLI = process.argv.includes('--canli');
let B = '';   // transaction içinde açılan geçici insan hesabı (ROLLBACK ile gider)

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
const hizSifirla = () => db.sorgu(`delete from rpc_sayac where uc_adi in ('avatar_onayla','avatar_satin_al')`);
const coin = async () => Number(await tek(`select coin from profiles where id='${B}'`));
const sahip = (a) => tek(`select coalesce(max(kaynak),'') from oyuncu_avatarlari where user_id='${B}' and avatar='${a}'`);
const uuid = () => tek(`select gen_random_uuid()::text`);

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '5s'`);
  await db.sorgu(`set local statement_timeout = '60s'`);
  B = await tek('select gen_random_uuid()::text');
  await db.sorgu(`insert into auth.users (id) values ('${B}')`);
  await db.sorgu(`update profiles set username = 'test_1039_${B.slice(0, 8)}' where id = '${B}'`);
  await db.sorgu(`select set_config('app.coin_izin', '1', true)`);
  ok('test hesabı insan', (await tek(`select count(*) from profiles where id='${B}' and not coalesce(is_bot,false)`)) === '1');
  const takiliOnce = await tek(`select md5(string_agg(id::text||coalesce(avatar_url,''), '|' order by id)) from profiles`);
  if (!CANLI) await db.sorgu(fs.readFileSync(MIG, 'utf8'));

  console.log('— dağılım');
  const dagilim = await tek(`select string_agg(nadirlik||'/'||edinme||' '||n, ' · ' order by nadirlik, edinme) from (select n.nadirlik, n.edinme, count(*) n from avatar_nitelikleri n where not exists (select 1 from avatar_katalogu k where k.url=n.url and not k.aktif) group by 1,2) t`);
  ok('nadirlik × edinme = efsanevi/elmas 10 · epik/elmas 20 · nadir/coin 9 · nadir/level 6 · nadir/sezon 2 · yaygin/ucretsiz 21',
    dagilim === 'efsanevi/elmas 10 · epik/elmas 20 · nadir/coin 9 · nadir/level 6 · nadir/sezon 2 · yaygin/ucretsiz 21', dagilim);
  ok('Epik/Efsanevi hiçbir level / ücretsiz kol satırında yok',
    await tek(`select (select count(*) from avatar_nitelikleri where edinme in ('level','sezon') and nadirlik in ('epik','efsanevi')) + (select count(*) from bp_seviye_odulleri b join avatar_nitelikleri n on n.anahtar=b.veri->>'anahtar' where b.kol='ucretsiz' and n.nadirlik in ('epik','efsanevi'))`) === '0');
  ok('level eşikleri 3/10/15/25/35/50', await tek(`select string_agg(anahtar||':'||edinme_level, ',' order by edinme_level) from avatar_nitelikleri where edinme='level'`)
    === 'kedili-kiz-y37:3,viking-k25:10,dedektif-k22:15,sovalye-k20:25,buyucu-k21:35,kral-k31:50');
  const bpAvatar = await tek(`select string_agg(seviye||kol||':'||(veri->>'anahtar'), ',' order by kol desc, seviye) from bp_seviye_odulleri where tur='avatar'`);
  ok('Sezon Yolu ücretsiz 10 kovboy · 24 korkuluk; ücretli 19 kurt-adam · 22 balkabağı · 23 vampir; 5/14/21/27 aynen',
    bpAvatar ==='10ucretsiz:kovboy-y40,24ucretsiz:korkuluk-y41,5ucretli:korsan-k19,14ucretli:samuray-y15,19ucretli:kurt-adam-y42,21ucretli:kristal-uzayli-y28,22ucretli:balkabagi-adam-y43,23ucretli:vampir-y19,27ucretli:savas-robotu-y30', bpAvatar);
  ok('yuva adları katalogdan doldu (Kovboy avatarı / nadir)', await tek(`select ad_tr||'/'||nadirlik from bp_seviye_odulleri where seviye=10 and kol='ucretsiz'`) === 'Kovboy avatarı/nadir');

  console.log('— geçiş');
  ok('takılı avatarlar değişmedi', takiliOnce === await tek(`select md5(string_agg(id::text||coalesce(avatar_url,''), '|' order by id)) from profiles`));
  ok('takılı avatarı kilitli kalan insan hesap yok', await tek(`select count(*) from profiles p join avatar_nitelikleri n on n.url=p.avatar_url where not coalesce(p.is_bot,false) and not public.avatar_sahip_mi(p.id, p.avatar_url)`) === '0');
  ok('eşiği geçen insan hesaplarda level avatarları var', await tek(`select count(*) from profiles p join avatar_nitelikleri n on n.edinme='level' and p.level>=n.edinme_level where not coalesce(p.is_bot,false) and not exists (select 1 from oyuncu_avatarlari o where o.user_id=p.id and o.avatar=n.anahtar)`) === '0');
  ok('botlara sahiplik satırı yok', await tek(`select count(*) from oyuncu_avatarlari o join profiles p on p.id=o.user_id where coalesce(p.is_bot,false)`) === '0');

  console.log('— level avatarı');
  await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}' and avatar in ('kedili-kiz-y37','viking-k25')`);
  await db.sorgu(`delete from coin_hareketleri where user_id='${B}' and tur='seviye' and referans in ('seviye:3','level_avatar:kedili-kiz-y37')`);
  await db.sorgu(`update profiles set level=2, level_xp=0 where id='${B}'`);
  let c0 = await coin();
  const k1 = `mac:${await uuid()}`;
  await db.sorgu(`select public.xp_ver('${B}', public.level_gereken_xp(2), '${k1}')`);
  ok('Lv 2 → 3: Kedili Kız verildi (kaynak level)', await sahip('kedili-kiz-y37') === 'level');
  ok('Lv 3 level coin 20 aynen (avatar coin yok)', (await coin()) - c0 === 20, `${(await coin()) - c0}`);
  await ben(B);
  const lk = JSON.parse(await tek(`select public.level_kazancim('${k1}')::text`));
  ok('level_kazancim avatarlar[0] = kedili-kiz, sahipti false', lk.avatarlar?.[0]?.anahtar === 'kedili-kiz-y37' && lk.avatarlar[0].sahipti === false, JSON.stringify(lk.avatarlar));
  await kimse();
  // aynı level ikinci kez (sahip) → 200 coin, tekrar → yok
  await db.sorgu(`update profiles set level=2, level_xp=0 where id='${B}'`);
  await db.sorgu(`delete from coin_hareketleri where user_id='${B}' and tur='seviye' and referans='seviye:3'`);
  c0 = await coin();
  await db.sorgu(`select public.xp_ver('${B}', public.level_gereken_xp(2), 'mac:${await uuid()}')`);
  ok('sahipken: +200 coin (20 level + 200)', (await coin()) - c0 === 220, `${(await coin()) - c0}`);
  ok('sahiplik satırı tek', await tek(`select count(*) from oyuncu_avatarlari where user_id='${B}' and avatar='kedili-kiz-y37'`) === '1');
  await db.sorgu(`update profiles set level=2, level_xp=0 where id='${B}'`);
  await db.sorgu(`delete from coin_hareketleri where user_id='${B}' and tur='seviye' and referans='seviye:3'`);
  c0 = await coin();
  await db.sorgu(`select public.xp_ver('${B}', public.level_gereken_xp(2), 'mac:${await uuid()}')`);
  ok('üçüncü kez: sahip coini tekrar verilmez (idempotent)', (await coin()) - c0 === 20, `${(await coin()) - c0}`);
  // çok level birden: 9 → 11 Viking
  await db.sorgu(`update profiles set level=9, level_xp=0 where id='${B}'`);
  await db.sorgu(`select public.xp_ver('${B}', public.level_gereken_xp(9) + public.level_gereken_xp(10), 'mac:${await uuid()}')`);
  ok('Lv 9 → 11 tek maçta: Viking verildi', await sahip('viking-k25') === 'level');
  ok('bot level atlamaz / avatar almaz', await tek(`select public.level_avatar_ver((select id from profiles where coalesce(is_bot,false) limit 1), 3)::text`) === '[]');

  console.log('— Sezon Yolu ücretsiz kol');
  await ben(B);
  const S = await tek(`select public.sezon_gorunen_ic()`);
  await kimse();
  if (!S) { ok('görünür sezon var', false); } else {
    await db.sorgu(`delete from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${S} and seviye in (10,24) and kol='ucretsiz'`);
    await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}' and avatar in ('kovboy-y40','korkuluk-y41')`);
    await db.sorgu(`delete from coin_hareketleri where user_id='${B}' and tur='sezon_yolu' and referans like 'sezon:${S}:10:ucretsiz%'`);
    const o1 = JSON.parse(await tek(`select public.bp_odul_ver_ic('${B}', ${S}, 10, 'ucretsiz')::text`));
    ok('seviye 10 ücretsiz: Kovboy verildi', o1?.tur === 'avatar' && await sahip('kovboy-y40') === 'etkinlik');
    await db.sorgu(`delete from oyuncu_bp_odul_alimi where user_id='${B}' and sezon=${S} and seviye=10 and kol='ucretsiz'`);
    c0 = await coin();
    const o2 = JSON.parse(await tek(`select public.bp_odul_ver_ic('${B}', ${S}, 10, 'ucretsiz')::text`));
    ok('sahipken: zaten_sahip + sahip_coin 200, +200 coin', o2?.zaten_sahip === true && o2?.sahip_coin === 200 && (await coin()) - c0 === 200, `${JSON.stringify(o2)} ${(await coin()) - c0}`);
    await db.sorgu(`insert into oyuncu_avatarlari (user_id, avatar, kaynak) values ('${B}','korkuluk-y41','hediye')`);
    c0 = await coin();
    await db.sorgu(`select public.bp_odul_ver_ic('${B}', ${S}, 24, 'ucretsiz')`);
    ok('seviye 24 sahipken +200 coin', (await coin()) - c0 === 200, `${(await coin()) - c0}`);
    await ben(B);
    const dur = JSON.parse(await tek(`select public.sezon_yolu_durumum()::text`));
    const y10 = dur.oduller.find((o) => o.seviye === 10 && o.kol === 'ucretsiz');
    ok('sezon_yolu_durumum: seviye 10 sahip=true', y10?.sahip === true);
    await kimse();
  }

  console.log('— coin ile satın alma');
  ok('kozmetik satışı açık', await tek(`select public.kozmetik_satis_acik_mi()::text`) === 'true');
  await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}' and avatar in ('palyaco-k30','hayalet-k26')`);
  await hizSifirla();
  await ben(B);
  await db.sorgu(`update profiles set coin=100 where id='${B}'`);
  let r = await dene(`select public.avatar_satin_al('palyaco-k30')::text`);
  ok('yetersiz coin → "Yetersiz coin"', /Yetersiz coin/.test(r.hata ?? ''), r.hata ?? r.r);
  await db.sorgu(`update profiles set coin=1000 where id='${B}'`);
  r = await dene(`select public.avatar_satin_al('palyaco-k30')::text`);
  ok('750 coin ile Palyaço alındı, bakiye 250', !r.hata && JSON.parse(r.r).bakiye === 250 && JSON.parse(r.r).para === 'coin', r.hata ?? r.r);
  ok('sahiplik dukkan + coin defteri -750', await sahip('palyaco-k30') === 'dukkan'
    && await tek(`select miktar from coin_hareketleri where user_id='${B}' and tur='avatar' and referans='palyaco-k30' order by id desc limit 1`) === '-750');
  r = await dene(`select public.avatar_satin_al('palyaco-k30')::text`);
  ok('çift alım reddi', /zaten sende/.test(r.hata ?? ''), r.hata ?? r.r);
  r = await dene(`select public.avatar_satin_al('sovalye-k20')::text`);
  ok('level avatarı satılmaz', /satılmıyor/.test(r.hata ?? ''), r.hata ?? r.r);
  r = await dene(`select public.avatar_satin_al('kovboy-y40')::text`);
  ok('sezon avatarı satılmaz', /satılmıyor|zaten sende/.test(r.hata ?? ''), r.hata ?? r.r);
  ok('Epik hâlâ elmasla (fiyat 150)', await tek(`select fiyat from public.avatar_sahiplik_durumu() where anahtar='vampir-y19'`) === '150');

  console.log('— avatar_onayla');
  await db.sorgu(`update profiles set avatar_url='/avatars/pro/kedi-k01.svg' where id='${B}'`);
  await db.sorgu(`delete from oyuncu_avatarlari where user_id='${B}' and avatar in ('hayalet-k26','kral-k31','korkuluk-y41')`);
  for (const [a, ad] of [['/avatars/pro/hayalet-k26.svg', 'coin avatarı'], ['/avatars/pro/kral-k31.svg', 'level avatarı'], ['/avatars/pro2/korkuluk-y41.svg', 'sezon avatarı']]) {
    await hizSifirla();
    r = await dene(`select public.avatar_onayla('${a}')::text`);
    ok(`kilitli ${ad} seçilemez`, /sende yok/.test(r.hata ?? ''), r.hata ?? 'kabul edildi');
  }
  await hizSifirla();
  r = await dene(`select public.avatar_onayla('/avatars/pro/palyaco-k30.svg')::text`);
  ok('sahip olunan coin avatarı seçilir', !r.hata, r.hata);
  await hizSifirla();
  r = await dene(`select public.avatar_onayla('/avatars/pro/kedi-k01.svg')::text`);
  ok('Yaygın ücretsiz seçilir', !r.hata, r.hata);

  console.log('— istemci durumu');
  const d = JSON.parse(await tek(`select json_agg(x)::text from public.avatar_sahiplik_durumu() x`));
  const bul = (a) => d.find((x) => x.anahtar === a) ?? {};
  ok('kovboy: sezon / 10', bul('kovboy-y40').edinme === 'sezon' && bul('kovboy-y40').edinme_sezon_seviye === 10);
  ok('dedektif: level / 15, satılık değil', bul('dedektif-k22').edinme === 'level' && bul('dedektif-k22').edinme_level === 15 && !bul('dedektif-k22').satilik);
  ok('mumya: coin 750 satılık', bul('mumya-k28').edinme === 'coin' && bul('mumya-k28').fiyat === 750 && bul('mumya-k28').satilik);
  ok('kurt adam: elmas + ücretli SY 19', bul('kurt-adam-y42').edinme === 'elmas' && bul('kurt-adam-y42').bp_ucretli_seviye === 19);
  ok('yaygın listede yok', !d.some((x) => x.nadirlik === 'yaygin'));
  await kimse();

  console.log('— Koleksiyon');
  ok('koleksiyon_kalemleri avatar nadirliği dolu (Palyaço nadir)', await tek(`select nadirlik from public.koleksiyon_kalemleri('${B}') where tur='avatar' and anahtar='palyaco-k30'`) === 'nadir');
  ok('avatar kalemlerinde boş nadirlik yok', await tek(`select count(*) from profiles p, public.koleksiyon_kalemleri(p.id) k where k.tur='avatar' and k.nadirlik is null`) === '0');

  console.log('— yetkiler');
  const yetki = (f, rol) => tek(`select has_function_privilege('${rol}', '${f}', 'execute')::text`);
  ok('avatar_sahiplik_durumu: authenticated evet, anon hayır', await yetki('public.avatar_sahiplik_durumu()', 'authenticated') === 'true' && await yetki('public.avatar_sahiplik_durumu()', 'anon') === 'false');
  ok('avatar_satin_al: authenticated evet, anon hayır', await yetki('public.avatar_satin_al(text)', 'authenticated') === 'true' && await yetki('public.avatar_satin_al(text)', 'anon') === 'false');
  ok('level_avatar_ver istemciye kapalı', await yetki('public.level_avatar_ver(uuid,int)', 'authenticated') === 'false' && await yetki('public.level_avatar_ver(uuid,int)', 'anon') === 'false');
} catch (e) {
  kaldi++; console.log('  ✗ BEKLENMEYEN HATA', e.message);
} finally {
  try { await db.sorgu('rollback'); } catch {}
  await db.kapat?.();
  console.log(`\n${gecti} geçti · ${kaldi} kaldı (ROLLBACK — canlıya yazılmadı)`);
  process.exit(kaldi ? 1 : 0);
}
