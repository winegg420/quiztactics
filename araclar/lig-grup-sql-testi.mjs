// Lig grubu 25 kişi (750) SQL provası — tek transaction, sonunda ROLLBACK (canlıya hiçbir şey yazılmaz). Yük/yarış testi DEĞİL.
// HAFİF senaryo: grup boyu transaction içinde 5'e çekilir, 12 hesapla denenir (mantık 25 ile aynı; kilit yüzeyi küçük, lock_timeout 5 sn).
// Sınar: boya kadar dolum · sonraki oyuncu yeni grup · uygun olmayan (kurulumu bitmemiş) hesabın grup 0'a düşüp sayıya GİRMEMESİ ·
// kurulumu bitirince bekleme grubundan çıkış · lig_grubum boyu = grubun gerçek üye sayısı, sıra 1..boy, benzersiz · bekleme hesabı yalnız kendini görür ·
// haftalık karma (lig_gruplarini_kur) hiçbir grubu boyun üstüne çıkarmaz, uygun olmayanlar grup 0 · lig_gruplari_dengele taşanı dağıtır, satır kaybetmez ·
// yetkiler. Hafta kapanışı (lig_haftayi_kapat) ağır/kilitli olduğundan bu testte ÇALIŞTIRILMAZ (yalnız kaynak incelemesi).
// Kullanım: node araclar/lig-grup-sql-testi.mjs [migration.sql ...]  (verilenler önce uygulanır)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';
const MIGLER = process.argv.slice(2);
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = '') => { if (kosul) { gecti++; console.log('  ✓', ad); } else { kaldi++; console.log('  ✗', ad, ek); } };
const tek = (s) => db.tek(s);
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', '${u}', true), set_config('request.jwt.claims', '{"sub":"${u}","role":"authenticated"}', true)`);
const grupSayilari = async (hafta, lig) => Object.fromEntries((await db.sorgu(`select u.grup_no, count(*)::int n from lig_uyelik u join profiles p on p.id=u.user_id
  where u.hafta='${hafta}' and u.lig='${lig}' and not public.acik_bot_mu(p.is_bot,p.bot_turu) group by 1 order by 1`)).map((r) => [r.grup_no, Number(r.n)]));
const B = 5, N = 12;
try {
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '5s'"); await db.sorgu("set local statement_timeout = '20s'");
  for (const m of MIGLER) await db.sorgu(fs.readFileSync(m, 'utf8'));
  await db.sorgu(`update oyun_ayarlari set deger = '${B}'::jsonb where anahtar='lig_grup_boyu'`);
  await db.sorgu(`update oyun_ayarlari set deger = '2'::jsonb where anahtar='lig_kucuk_esik'`);
  const hafta = await tek('select public.hafta_basi()');
  const LIG = 'efsane';   // bu hafta boş → sentetik senaryo gerçek veriyle karışmaz; hepsi transaction içinde

  const uygun = (await db.sorgu(`select id from profiles where not coalesce(is_bot,false) and takma_ad_secildi and avatar_onayli and not coalesce(lig_gizli,false) order by coalesce(toplam_mac,0), created_at limit ${N}`)).map((r) => r.id);
  const junk = (await db.sorgu(`select id from profiles where not coalesce(is_bot,false) and not coalesce(takma_ad_secildi,false) order by created_at limit 3`)).map((r) => r.id);
  ok(`${N} uygun + 3 kurulumu bitmemiş insan hesabı bulundu`, uygun.length === N && junk.length === 3, `${uygun.length}/${junk.length}`);
  const liste = [...uygun, ...junk].map((x) => `'${x}'`).join(',');
  await db.sorgu(`delete from lig_uyelik where hafta='${hafta}' and user_id in (${liste})`);
  await db.sorgu(`update profiles set lig='${LIG}' where id in (${liste})`);
  ok('efsane ligi bu hafta boş (senaryo temiz)', await tek(`select count(*) from lig_uyelik where hafta='${hafta}' and lig='${LIG}'`) === '0');

  console.log(`— ${B}'e kadar dolum, sonraki oyuncu yeni grup`);
  for (let i = 0; i < B; i++) await db.sorgu(`select public.lig_uyeligim_kur('${uygun[i]}')`);
  let s = await grupSayilari(hafta, LIG);
  ok(`ilk ${B} oyuncu grup 1'de`, s[1] === B && Object.keys(s).length === 1, JSON.stringify(s));
  await db.sorgu(`select public.lig_uyeligim_kur('${uygun[B]}')`);
  s = await grupSayilari(hafta, LIG);
  ok(`${B + 1}. oyuncu yeni grupta (grup 2), grup 1 hâlâ ${B}`, s[1] === B && s[2] === 1, JSON.stringify(s));
  for (let i = B + 1; i < N; i++) await db.sorgu(`select public.lig_uyeligim_kur('${uygun[i]}')`);
  s = await grupSayilari(hafta, LIG);
  ok(`${N} oyuncu: ${B} + ${B} + ${N - 2 * B}, hiçbir grup ${B}'i geçmiyor`, s[1] === B && s[2] === B && s[3] === N - 2 * B && Math.max(...Object.values(s)) <= B, JSON.stringify(s));
  await db.sorgu(`select public.lig_uyeligim_kur('${uygun[0]}')`);
  ok('aynı oyuncu için tekrar kurulum: sayılar değişmedi', JSON.stringify(await grupSayilari(hafta, LIG)) === JSON.stringify(s));

  console.log('— uygun olmayan (kurulumu bitmemiş) hesap: grup 0, sayıya girmez');
  for (const j of junk) await db.sorgu(`select public.lig_uyeligim_kur('${j}')`);
  ok('3 bekleme satırı grup 0\'da', await tek(`select count(*) from lig_uyelik where hafta='${hafta}' and lig='${LIG}' and grup_no=0`) === '3');
  const g2 = await grupSayilari(hafta, LIG);
  ok('gerçek grup sayıları aynı (bekleme satırları sayıya girmedi)', g2[1] === B && g2[2] === B && g2[3] === N - 2 * B, JSON.stringify(g2));

  console.log('— lig_grubum: boy = gerçek üye sayısı, sıra tutarlı');
  await ben(uygun[3]);   // grup 1
  const satir = await db.sorgu(`select sira, grup_boyu, ben from public.lig_grubum() order by sira`);
  const boy = Number(satir[0]?.grup_boyu);
  ok(`grup_boyu ${B} (bekleme satırları dahil değil)`, boy === B, `${boy}`);
  ok('sıralar 1..boy içinde ve benzersiz', satir.length > 0 && new Set(satir.map((r) => r.sira)).size === satir.length && Math.max(...satir.map((r) => Number(r.sira))) <= boy);
  ok('kendi satırım var ve sıram ≤ boy', satir.some((r) => r.ben && Number(r.sira) <= boy));
  ok('gösterilen boy = grubun gerçek (açık bot hariç) üye sayısı', boy === (await grupSayilari(hafta, LIG))[1]);
  await ben(uygun[N - 1]);  // grup 3
  ok(`grup 3 oyuncusu boy ${N - 2 * B} görür`, Number((await db.sorgu(`select grup_boyu from public.lig_grubum() limit 1`))[0]?.grup_boyu) === N - 2 * B);
  await ben(junk[0]);
  const bek = await db.sorgu(`select sira, grup_boyu, ben from public.lig_grubum()`);
  ok('bekleme hesabı yalnız kendini görür (boy 1, sıra 1)', bek.length === 1 && Number(bek[0].grup_boyu) === 1 && Number(bek[0].sira) === 1 && bek[0].ben === 't', JSON.stringify(bek));
  ok('lig_grubum çağrısı bekleme satırını değiştirmedi', await tek(`select grup_no from lig_uyelik where hafta='${hafta}' and user_id='${junk[0]}'`) === '0');

  console.log('— kurulumu bitiren hesap bekleme grubundan çıkar');
  await db.sorgu(`update profiles set takma_ad_secildi=true, avatar_onayli=true where id='${junk[0]}'`);
  await ben(junk[0]);
  const yeni = await db.sorgu(`select grup_boyu from public.lig_grubum() limit 1`);
  const g0 = await tek(`select grup_no from lig_uyelik where hafta='${hafta}' and user_id='${junk[0]}'`);
  ok('grup 0\'dan yeri olan gruba (grup 3) geçti, boy 3 görür', g0 === '3' && Number(yeni[0]?.grup_boyu) === N - 2 * B + 1, `${g0} ${JSON.stringify(yeni)}`);

  console.log('— haftalık karma: hiçbir grup boyu geçmez, uygun olmayanlar grup 0');
  const gelecek = await tek(`select ('${hafta}'::date + 7)::text`);
  await db.sorgu(`select public.lig_gruplarini_kur('${gelecek}'::date)`);
  const tas = await db.sorgu(`select u.lig, u.grup_no, count(*)::int n from lig_uyelik u join profiles p on p.id=u.user_id
    where u.hafta='${gelecek}' and u.grup_no>=1 and u.lig='${LIG}' and not public.acik_bot_mu(p.is_bot,p.bot_turu) group by 1,2 having count(*) > ${B}`);
  ok(`gelecek hafta (efsane): ${B}'ten büyük grup yok`, tas.length === 0, JSON.stringify(tas));
  const bronz = await db.sorgu(`select u.grup_no, count(*)::int n from lig_uyelik u join profiles p on p.id=u.user_id
    where u.hafta='${gelecek}' and u.grup_no>=1 and u.lig='bronz' and not public.acik_bot_mu(p.is_bot,p.bot_turu) group by 1 having count(*) > ${B}`);
  ok(`gelecek hafta (bronz): ${B}'ten büyük grup yok`, bronz.length === 0, JSON.stringify(bronz));
  const sizan = await tek(`select count(*) from lig_uyelik u join profiles p on p.id=u.user_id where u.hafta='${gelecek}' and u.grup_no>=1
    and not public.lig_gorunur_mu(p.is_bot,p.takma_ad_secildi,p.avatar_onayli,p.lig_gizli) and not public.acik_bot_mu(p.is_bot,p.bot_turu)`);
  ok('gelecek hafta: uygun olmayan hesap gerçek grupta yok', sizan === '0', sizan);
  ok('gelecek hafta: uygun olmayan hesaplar grup 0\'da', Number(await tek(`select count(*) from lig_uyelik u where u.hafta='${gelecek}' and u.grup_no=0`)) >= 1);
  await db.sorgu(`delete from lig_uyelik where hafta='${gelecek}'`);

  console.log('— lig_gruplari_dengele: taşanı dağıtır, satır kaybetmez');
  const once = await tek(`select count(*) from lig_uyelik where hafta='${hafta}'`);
  await db.sorgu(`update lig_uyelik set grup_no=1 where hafta='${hafta}' and lig='${LIG}' and grup_no>=1`);
  const topl = (await grupSayilari(hafta, LIG))[1];
  ok(`önkoşul: ${topl} kişilik taşan grup`, topl > B);
  const tasinan = await tek(`select public.lig_gruplari_dengele('${hafta}'::date)`);
  s = await grupSayilari(hafta, LIG);
  ok(`fazla üyeler taşındı (boy 5'e çekildiği için diğer ligler de dengelenir), efsane'de hiçbir grup ${B}'i geçmiyor`, Number(tasinan) >= topl - B && Math.max(...Object.entries(s).filter(([k]) => k !== '0').map(([, v]) => v)) <= B, `${tasinan} ${JSON.stringify(s)}`);
  ok('satır sayısı değişmedi (veri silinmedi)', await tek(`select count(*) from lig_uyelik where hafta='${hafta}'`) === once);
  ok('ikinci çalıştırma bir şey taşımaz (tekrar çalıştırılabilir)', await tek(`select public.lig_gruplari_dengele('${hafta}'::date)`) === '0');

  console.log('— yetkiler');
  const yetki = await db.sorgu(`select has_function_privilege('authenticated','public.lig_gruplari_dengele(date)','execute') a, has_function_privilege('anon','public.lig_gruplari_dengele(date)','execute') b,
    has_function_privilege('authenticated','public.lig_grubum()','execute') c, has_function_privilege('authenticated','public.lig_uyeligim_kur(uuid)','execute') d`);
  ok('lig_gruplari_dengele istemciye kapalı', yetki[0].a === 'f' && yetki[0].b === 'f', JSON.stringify(yetki[0]));
  ok('mevcut yetkiler değişmedi: lig_grubum açık, lig_uyeligim_kur kapalı', yetki[0].c === 't' && yetki[0].d === 'f', JSON.stringify(yetki[0]));
  const sd = await tek(`select string_agg(proname||'='||prosecdef::text, ',' order by proname) from pg_proc where proname in ('lig_uyeligim_kur','lig_grubum','lig_gruplarini_kur','lig_haftayi_kapat','lig_gruplari_dengele')`);
  ok('hepsi security definer', sd.split(',').every((x) => x.endsWith('=true')), sd);
} catch (e) {
  kaldi++; console.log('  ✗ HATA', e.message);
  if (/57014|timeout|lock/i.test(e.message)) console.log('  !! ZAMAN AŞIMI / KİLİT — DURULDU');
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(`\n${gecti} geçti, ${kaldi} kaldı (transaction geri alındı).`);
process.exit(kaldi ? 1 : 0);
