// Güvenlik C (migration 1053) provası: TEK işlem içinde migration'ı uygular, taklit kullanıcılarla
// görünmez karakter temizliği, spam tavanı, hız sınırı, satın alma kilidi ve tercih_kategori kısıtını dener,
// SONUNDA HER ŞEYİ GERİ ALIR. Canlıda veri kalmaz.
// Kullanım: node araclar/guvenlik-c-prova.mjs <migration.sql>  (canlıda uygulanmışsa: boş bir .sql ver → yalnız test)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PgIstemci, baglantiDizgisi, alintila } from './pg-mini.mjs';

const dosya = process.argv[2];
if (!dosya) throw new Error('Migration dosyası gerekli.');
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const sonuc = [];
let sp = 0;

async function rolAyarla(rol, kullanici) {
  await db.sorgu(rol === 'postgres' ? 'reset role' : `set local role ${rol}`);
  await db.sorgu(`select set_config('request.jwt.claims', ${alintila(JSON.stringify(kullanici ? { sub: kullanici, role: rol } : { role: rol }))}, true)`);
}

/** Savepoint içinde dener, geri alır. beklenen: 'ok' | 'izin' | 'is' | RegExp (sonuç/hata metnine) */
async function dene(ad, rol, kullanici, sql, beklenen) {
  const nokta = `sp${++sp}`;
  await db.sorgu(`savepoint ${nokta}`);
  let durum, ayrinti = '';
  try {
    await rolAyarla(rol, kullanici);
    const r = await db.sorgu(sql);
    durum = 'ok'; ayrinti = JSON.stringify(r[0] ?? '');
  } catch (e) {
    const m = String(e.message);
    durum = /permission denied/i.test(m) ? 'izin' : 'is';
    ayrinti = m.slice(0, 200);
  }
  await db.sorgu(`rollback to savepoint ${nokta}`);
  await db.sorgu('reset role');
  const gecti = beklenen instanceof RegExp ? beklenen.test(ayrinti) : beklenen.split('|').includes(durum);
  sonuc.push({ gecti, ad, durum, ayrinti: ayrinti.slice(0, 140) });
}

/** Kalıcı (işlem sonuna dek) adım. */
async function yap(rol, kullanici, sql) {
  await rolAyarla(rol, kullanici);
  try { return await db.sorgu(sql); } finally { await db.sorgu('reset role'); }
}

const A = crypto.randomUUID(), B = crypto.randomUUID(), C = crypto.randomUUID();
const ZW = '​', RLO = '‮', BEL = '\u0007', BOM = '﻿', ZWJ = '‍';
const turkce = 'Merhaba dünya! ĞÜŞİÖÇ ğüşıöç — “tırnak” 123';
const emoji = 'Selam 😀 👍🏽 👨‍👩‍👧 ❤️‍🔥 🏳️‍🌈 🇹🇷';

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '3s'; set local statement_timeout = '20s'`);
  await db.sorgu(fs.readFileSync(dosya, 'utf8'));

  for (const [id, ad] of [[A, 'a'], [B, 'b'], [C, 'c']]) {
    await db.sorgu(`insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values (${alintila(id)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              ${alintila(`prova-c-${ad}-${id.slice(0, 8)}@ornek.invalid`)}, '{"provider":"email"}', '{}', now(), now())`);
  }
  await db.sorgu(`update public.profiles set kosullar_kabul_at = now(), coin = 0 where id in (${alintila(A)}, ${alintila(B)}, ${alintila(C)})`);
  await db.sorgu(`insert into public.friendships (requester, addressee, durum) values (${alintila(A)}, ${alintila(B)}, 'arkadas')`);

  // ---------------- 1. görünmez karakter
  const temiz = async (girdi) => (await db.sorgu(`select public.gorunmez_temizle(${alintila(girdi)}) t`))[0].t;
  for (const [ad, girdi, beklenen] of [
    ['Türkçe karakter + noktalama aynen', turkce, turkce],
    ['emoji (ten rengi, ZWJ aile, bayrak) aynen', emoji, emoji],
    ['boşluk, sekme, satır sonu aynen', 'a b\tc\nd  e', 'a b\tc\nd  e'],
    ['sıfır genişlik + RLO + BEL + BOM silinir', `k${ZW}ü${RLO}f${BEL}ü${BOM}r`, 'küfür'],
    ['harf arası ZWJ silinir', `sa${ZWJ}lak`, 'salak'],
    ['bidi isolate / word-joiner silinir', 'a⁦b⁩c⁠d‏e', 'abcde'],
  ]) {
    const t = await temiz(girdi);
    sonuc.push({ gecti: t === beklenen, ad: `temizle: ${ad}`, durum: 'ok', ayrinti: JSON.stringify(t) });
  }

  const dm = (metin) => `select public.dm_gonder(${alintila(B)}, ${alintila(metin)})->>'metin' m`;
  await dene('DM: normal Türkçe mesaj gider, değişmez', 'authenticated', A, dm(turkce), new RegExp(JSON.stringify(turkce).slice(1, -1)));
  await dene('DM: emoji mesaj gider, değişmez', 'authenticated', A, dm(emoji), new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  await dene('DM: görünmez karakterler temizlenir', 'authenticated', A, dm(`Mer${ZW}ha${RLO}ba${BOM}`), /"Merhaba"/);
  await dene('DM: yalnız görünmez karakter → Mesaj boş olamaz', 'authenticated', A, dm(`${ZW}${RLO}${BOM}`), /Mesaj boş olamaz/);
  await dene('DM: ZW ile bölünmüş kelime maskeleme öncesi birleşir', 'authenticated', A,
    `select public.dm_gonder(${alintila(B)}, ${alintila(`s${ZW}a${ZW}lak`)})->>'metin' m`, /"m":"(?!s​)/);
  const sk = await yap('authenticated', A, `select public.sikayet_et(${alintila(C)}, 'spam', ${alintila(`ka${ZW}ba${RLO} söz 😀`)})->>'id' id`);
  const skMetin = (await db.sorgu(`select aciklama from public.sikayetler where id = ${Number(sk[0].id)}`))[0].aciklama;
  sonuc.push({ gecti: skMetin === 'kaba söz 😀', ad: 'Şikâyet: açıklama temizlenir, emoji kalır', durum: 'ok', ayrinti: JSON.stringify(skMetin) });

  // ---------------- 2. spam tavanı
  const istek = `select public.send_friend_request(${alintila(C)})`;
  await dene('Arkadaşlık: ilk istek gider', 'authenticated', A, istek, 'ok');
  await yap('authenticated', A, istek);
  await db.sorgu(`delete from public.friendships where requester = ${alintila(A)} and addressee = ${alintila(C)}`); // reddedilmiş gibi
  await dene('Arkadaşlık: aynı kişiye 60 sn içinde tekrar → bekleme', 'authenticated', A, istek, /Bu oyuncuya az önce istek gönderdin/);
  await db.sorgu(`insert into public.rpc_sayac (user_id, uc_adi, pencere_baslangic, sayi) values (${alintila(B)}, 'arkadas_istek_gunluk', now(), 100)
                  on conflict (user_id, uc_adi) do update set sayi = 100, pencere_baslangic = now()`);
  await dene('Arkadaşlık: günlük 100 aşılınca doğru hata', 'authenticated', B, istek, /Bugün çok fazla arkadaşlık isteği gönderdin/);
  await db.sorgu(`insert into public.rpc_sayac (user_id, uc_adi, pencere_baslangic, sayi) values (${alintila(C)}, 'arkadas_istek_gunluk', now(), 99)`);
  await dene('Arkadaşlık: 100. istek hâlâ gider', 'authenticated', C, `select public.send_friend_request(${alintila(B)})`, 'ok');
  const kodC = (await db.sorgu(`select davet_kodu from public.profiles where id = ${alintila(C)}`))[0].davet_kodu;
  await db.sorgu(`update public.profiles set created_at = now() - interval '30 days' where id = ${alintila(B)}`); // davet bağlama penceresi dışı
  await dene('Davet kodu ile ekleme: günlük tavan', 'authenticated', B,
    `select * from public.arkadas_davet_kodu_ile_ekle(${alintila(kodC ?? '')})`, /Bugün çok fazla arkadaşlık isteği/);

  const kasa = `select public.kasa_davet_et(${alintila(B)}, false)`;
  await dene('Kasa daveti: ilk davet gider', 'authenticated', A, kasa, 'ok|is');
  const kasaIlk = sonuc.at(-1);
  if (kasaIlk.durum === 'ok') {
    await yap('authenticated', A, kasa);
    await db.sorgu(`update public.kasa_davetleri set durum = 'red' where kuran = ${alintila(A)} and rakip = ${alintila(B)}`);
    await dene('Kasa daveti: reddedildikten hemen sonra tekrar → bekleme', 'authenticated', A, kasa, /Bu oyuncuya az önce davet gönderdin/);
    await db.sorgu(`update public.kasa_davetleri set created_at = now() - interval '2 minutes' where kuran = ${alintila(A)}`);
    await db.sorgu(`insert into public.rpc_sayac (user_id, uc_adi, pencere_baslangic, sayi) values (${alintila(A)}, 'davet_gunluk', now(), 100)
                    on conflict (user_id, uc_adi) do update set sayi = 100`);
    await dene('Kasa daveti: günlük 100 aşılınca doğru hata', 'authenticated', A, kasa, /Bugün çok fazla davet gönderdin/);
  }
  // Düello: yeni hesap açılış kilidi (5 maç) tavandan önce durur → kasa ile aynı blok katalogdan doğrulanır
  const dg = (await db.sorgu(`select pg_get_functiondef('public.duello_davet_et(uuid,boolean)'::regprocedure) d`))[0].d;
  sonuc.push({ gecti: dg.includes("'davet_gunluk', 100") && dg.includes('Bu oyuncuya az önce davet gönderdin'), ad: 'Düello daveti: aynı tavan + bekleme bloğu (katalog)', durum: 'katalog', ayrinti: '' });

  // ---------------- 3. hız sınırı
  for (const [uc, limit, sql] of [
    ['cihaz_bildir', 10, `select public.cihaz_bildir('prova-cihaz')`],
    ['claim_referral', 10, `select public.claim_referral(${alintila(C)})`],
    ['kalp_at', 60, `select public.kalp_at()`],
    ['ikram_yanitla', 30, `select public.ikram_yanitla(${alintila(crypto.randomUUID())}, true)`],
    ['arkadas_davet_kodu_ile_ekle', 10, `select * from public.arkadas_davet_kodu_ile_ekle('XXXXXXXX')`],
  ]) {
    await dene(`${uc}: sınır altında çalışır`, 'authenticated', C, sql, uc === 'ikram_yanitla' ? /Teklif bulunamadı/ : uc === 'arkadas_davet_kodu_ile_ekle' ? /Böyle bir davet kodu yok/ : 'ok');
    await db.sorgu(`insert into public.rpc_sayac (user_id, uc_adi, pencere_baslangic, sayi) values (${alintila(C)}, ${alintila(uc)}, now(), ${limit})
                    on conflict (user_id, uc_adi) do update set sayi = ${limit}, pencere_baslangic = now()`);
    // 1054: cihaz_bildir ve kalp_at arka plan çağrısı → sınırda hata atmaz, yazmadan sessizce döner
    if (uc === 'cihaz_bildir' || uc === 'kalp_at') await dene(`${uc}: ${limit}/dk aşılınca sessizce atlar`, 'authenticated', C, sql, 'ok');
    else await dene(`${uc}: ${limit}/dk aşılınca durur`, 'authenticated', C, sql, /Çok hızlı işlem yapıyorsun/);
  }

  // ---------------- 4. satın alma kilidi (gövde + davranış)
  const govde = await db.sorgu(`select proname, pg_get_functiondef(oid) ~ 'from public\\.profiles where id = v_me for update' k from pg_proc where proname in ('esya_satin_al','karakter_satin_al','avatar3d_satin_al') and pronamespace = 'public'::regnamespace`);
  for (const g of govde) sonuc.push({ gecti: g.k === 't' || g.k === true, ad: `${g.proname}: profil kilidi var`, durum: 'katalog', ayrinti: String(g.k) });
  await dene('esya_satin_al: coin yokken iş hatası (kilit akışı bozmuyor)', 'authenticated', A,
    `select * from public.esya_satin_al((select kod from public.esyalar where aktif and coin_fiyat > 0 limit 1))`, /coin|Eşya bulunamadı|zaten/i);

  // ---------------- 5. tercih_kategori
  await dene('tercih_kategori: geçerli anahtar yazılır', 'authenticated', A, `update public.profiles set tercih_kategori = 'genel_kultur' where id = ${alintila(A)}`, 'ok');
  await dene('tercih_kategori: null yazılır', 'authenticated', A, `update public.profiles set tercih_kategori = null where id = ${alintila(A)}`, 'ok');
  await dene('tercih_kategori: çöp değer reddedilir', 'authenticated', A, `update public.profiles set tercih_kategori = '<script>x</script>' where id = ${alintila(A)}`, /check constraint/);
  await dene('tercih_kategori_kaydet RPC çalışır', 'authenticated', A, `select public.tercih_kategori_kaydet('genel_kultur')`, 'ok');

  // ---------------- 6. yetki
  for (const f of [`dm_gonder(${alintila(B)}, 'x')`, `send_friend_request(${alintila(B)})`, `kasa_davet_et(${alintila(B)}, false)`, `duello_davet_et(${alintila(B)}, false)`,
    `cihaz_bildir('x')`, `claim_referral(${alintila(B)})`, 'kalp_at()', `ikram_yanitla(${alintila(B)}, true)`, `esya_satin_al('x')`, `karakter_satin_al('x')`, `avatar3d_satin_al('x')`,
    `sikayet_et(${alintila(B)}, 'spam')`, `gorunmez_temizle('x')`, `hiz_siniri_mesajli('x', 1, '1 minute', 'x')`])
    await dene(`anon: ${f.split('(')[0]} kapalı`, 'anon', null, `select public.${f}`, 'izin');
  await dene('authenticated: gorunmez_temizle kapalı', 'authenticated', A, `select public.gorunmez_temizle('x')`, 'izin');
  await dene('authenticated: hiz_siniri_mesajli kapalı', 'authenticated', A, `select public.hiz_siniri_mesajli('x', 1, '1 minute', 'x')`, 'izin');
  const anonAcik = await db.sorgu(`select p.oid::regprocedure::text fn from pg_proc p where p.pronamespace='public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')`);
  sonuc.push({ gecti: anonAcik.length === 1 && anonAcik[0].fn === 'ses_secimleri_oyun(integer)', ad: 'anon: açık fonksiyon yalnız ses_secimleri_oyun', durum: String(anonAcik.length), ayrinti: anonAcik.map((r) => r.fn).join(', ') });
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}

let gecen = 0;
for (const s of sonuc) {
  if (s.gecti) gecen++;
  console.log(`${s.gecti ? 'GEÇTİ ' : 'KALDI '} ${s.ad} [${s.durum}] ${s.gecti ? '' : s.ayrinti}`);
}
console.log(`\n${gecen}/${sonuc.length} — işlem geri alındı.`);
if (gecen !== sonuc.length) process.exitCode = 1;
