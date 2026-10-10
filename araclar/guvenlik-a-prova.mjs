// Güvenlik A (migration 1047) provası: TEK işlem içinde migration'ı uygular, anon /
// authenticated (işlem içinde açılan taklit kullanıcılar) / cron (postgres) rolleriyle
// dener, SONUNDA HER ŞEYİ GERİ ALIR. Canlıda veri kalmaz.
// Kullanım: node araclar/guvenlik-a-prova.mjs <migration.sql> <istemci-rpc-listesi.txt>
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PgIstemci, baglantiDizgisi, alintila } from './pg-mini.mjs';

const [dosya, rpcListe] = process.argv.slice(2);
if (!dosya) throw new Error('Migration dosyası gerekli.');
const istemciRpc = rpcListe ? fs.readFileSync(rpcListe, 'utf8').split(/\s+/).filter(Boolean) : [];

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const sonuc = [];
let sp = 0;

/** Bir denemeyi savepoint içinde koşar. beklenen: 'ok' | 'izin' | 'is' (izin dışı iş hatası) | 'ok|is' | RegExp */
async function dene(ad, rol, kullanici, sql, beklenen) {
  const nokta = `sp${++sp}`;
  await db.sorgu(`savepoint ${nokta}`);
  let durum, ayrinti = '';
  try {
    await db.sorgu(rol === 'postgres' ? 'reset role' : `set local role ${rol}`);
    await db.sorgu(`select set_config('request.jwt.claims', ${alintila(kullanici ? JSON.stringify({ sub: kullanici, role: rol }) : JSON.stringify({ role: rol }))}, true)`);
    const r = await db.sorgu(sql);
    durum = 'ok'; ayrinti = JSON.stringify(r[0] ?? '').slice(0, 120);
  } catch (e) {
    const m = String(e.message);
    durum = /permission denied/i.test(m) ? 'izin' : 'is';
    ayrinti = m.slice(0, 160);
  }
  await db.sorgu(`rollback to savepoint ${nokta}`);
  await db.sorgu('reset role');
  let gecti;
  if (beklenen instanceof RegExp) gecti = beklenen.test(ayrinti);
  else gecti = beklenen.split('|').includes(durum);
  if (durum === 'is' && /does not exist|function .* unknown/i.test(ayrinti)) gecti = false;
  sonuc.push({ gecti, ad, rol, durum, ayrinti });
}

/** Kalıcı (işlem sonuna dek) adım — savepoint'siz, rol ile. */
async function yap(rol, kullanici, sql) {
  await db.sorgu(rol === 'postgres' ? 'reset role' : `set local role ${rol}`);
  await db.sorgu(`select set_config('request.jwt.claims', ${alintila(JSON.stringify({ sub: kullanici, role: rol }))}, true)`);
  try { return await db.sorgu(sql); } finally { await db.sorgu('reset role'); }
}

const A = crypto.randomUUID(), B = crypto.randomUUID(), C = crypto.randomUUID();
const rastgele = crypto.randomUUID();
const fcm = (n) => `https://fcm.googleapis.com/fcm/send/prova-${A.slice(0, 8)}-${n}`;
const push = (u, ep) => `select public.save_push_subscription(${alintila(ep)}, 'BPprovaanahtar', 'provaauth')`;

try {
  await db.sorgu('begin');
  await db.sorgu(`set local lock_timeout = '3s'; set local statement_timeout = '20s'`);
  await db.sorgu(fs.readFileSync(dosya, 'utf8'));

  // Taklit kullanıcılar (profil tetikleyiciyle açılır)
  for (const [id, ad] of [[A, 'a'], [B, 'b'], [C, 'c']]) {
    await db.sorgu(`insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values (${alintila(id)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              ${alintila(`prova-${ad}-${id.slice(0, 8)}@ornek.invalid`)}, '{"provider":"email"}', '{}', now(), now())`);
  }
  await db.sorgu(`insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    values ('fbprova123', ${alintila(A)}, ${alintila(JSON.stringify({ sub: 'fbprova123' }))}, 'facebook', now(), now())`);

  // ---------------- anon
  await dene('anon: ses_secimleri_oyun açık', 'anon', null, `select public.ses_secimleri_oyun(null)`, 'ok');
  for (const f of ['coin_bakiyem()', 'birlesik_siralama()', 'sonraki_turnuva_ani()', 'sonraki_turnuva_bilgi()', 'lig_grubum()', 'izinli_mesajlar()', 'hafta_basi()', 'coin_harca(1,\'x\',null)'])
    await dene(`anon: ${f} kapalı`, 'anon', null, `select public.${f}`, 'izin');
  await dene('anon: get_tournament_question kapalı', 'anon', null, `select * from public.get_tournament_question(${alintila(rastgele)})`, 'izin');
  await dene('anon: facebook_arkadas_onerileri kapalı', 'anon', null, `select * from public.facebook_arkadas_onerileri(array['1'])`, 'izin');
  const anonAcik = await db.sorgu(`select p.oid::regprocedure::text fn from pg_proc p where p.pronamespace='public'::regnamespace and has_function_privilege('anon', p.oid, 'execute') order by 1`);
  sonuc.push({ gecti: anonAcik.length === 1 && anonAcik[0].fn === 'ses_secimleri_oyun(integer)', ad: 'anon: public şemada açık kalan fonksiyonlar', rol: 'katalog', durum: String(anonAcik.length), ayrinti: anonAcik.map((r) => r.fn).join(', ') });

  // ---------------- authenticated: kapatılanlar
  await dene('auth: coin_harca kapalı (A.6)', 'authenticated', A, `select public.coin_harca(1, 'prova', null)`, 'izin');
  await dene('auth: eski_davetleri_temizle kapalı (A.8)', 'authenticated', A, `select public.eski_davetleri_temizle()`, 'izin');
  await dene('auth: mac_oyuncu_indeksi kapalı (A.8)', 'authenticated', A, `select public.mac_oyuncu_indeksi(${alintila(rastgele)}, ${alintila(A)})`, 'izin');

  // ---------------- authenticated: istemcinin çağırdığı bütün RPC'ler hâlâ açık
  if (istemciRpc.length) {
    const kapali = await db.sorgu(`select distinct p.proname from pg_proc p
      where p.pronamespace='public'::regnamespace and p.proname = any(${alintila('{' + istemciRpc.join(',') + '}')}::text[])
        and not has_function_privilege('authenticated', p.oid, 'execute')`);
    sonuc.push({ gecti: kapali.length === 0, ad: `auth: istemci RPC'leri açık (${istemciRpc.length} ad)`, rol: 'katalog', durum: String(kapali.length), ayrinti: kapali.map((r) => r.proname).join(', ') });
  }
  // RLS politikalarında geçen fonksiyonlar authenticated'a açık mı
  const polKapali = await db.sorgu(`select distinct p.proname from pg_policies pol
    join pg_proc p on p.pronamespace='public'::regnamespace and coalesce(pol.qual,'')||coalesce(pol.with_check,'') ~ ('\\m'||p.proname||'\\(')
    where ('authenticated' = any(pol.roles) or 'public' = any(pol.roles)) and not has_function_privilege('authenticated', p.oid, 'execute')`);
  sonuc.push({ gecti: polKapali.length === 0, ad: 'auth: RLS politikası fonksiyonları açık', rol: 'katalog', durum: String(polKapali.length), ayrinti: polKapali.map((r) => r.proname).join(', ') });

  // ---------------- authenticated: ana akışlar (iş hatası kabul, izin hatası değil)
  const akis = [
    ['profilim', `select public.profilim()`],
    ['coin_bakiyem', `select public.coin_bakiyem()`],
    ['maç arama: quick_match', `select public.quick_match(null, false, false)`],
    ['maç arama: kuyruktan_cik', `select public.kuyruktan_cik()`],
    ['maç arama: duello_ara', `select public.duello_ara(false)`],
    ['maç arama: kasa_ara', `select public.kasa_ara(false)`],
    ['Klasik cevap', `select public.submit_match_answer(${alintila(rastgele)}, 0::smallint, 0)`],
    ['Düello v4 cevap', `select public.duello_cevap(${alintila(rastgele)}, 0::smallint)`],
    ['Hazine karar', `select public.kasa_karar(${alintila(rastgele)}, true)`],
    ['satın alma: joker_tek_al', `select public.joker_tek_al('elli_elli')`],
    ['satın alma: avatar_satin_al', `select public.avatar_satin_al('prova_yok')`],
    ['satın alma: esya_satin_al', `select public.esya_satin_al('prova_yok')`],
    ['BP ödül', `select public.bp_odul_al(1, 'ucretsiz')`],
    ['görev ödülü: claim_quest', `select public.claim_quest('prova_yok')`],
    ['görev ödülü: gorev_al', `select public.gorev_al('gunluk', 'prova_yok')`],
    ['lig_grubum', `select public.lig_grubum()`],
    ['sonraki_turnuva_ani', `select public.sonraki_turnuva_ani()`],
    ['mac_nabiz', `select public.mac_nabiz(${alintila(rastgele)}, false)`],
    ['grup_mac_uyesi_mi', `select public.grup_mac_uyesi_mi(${alintila(rastgele)})`],
  ];
  for (const [ad, sql] of akis) await dene(`auth: ${ad}`, 'authenticated', A, sql, 'ok|is');

  // Arkadaşlık + DM
  await dene('auth: arkadaşlık isteği', 'authenticated', A, `select public.send_friend_request(${alintila(B)})`, 'ok');
  await yap('authenticated', A, `select public.send_friend_request(${alintila(B)})`);
  const istek = await db.tek(`select id from public.friendships where requester=${alintila(A)} and addressee=${alintila(B)}`);
  await dene('auth: arkadaşlık kabul', 'authenticated', B, `select public.respond_friend_request(${alintila(istek)}, true)`, 'ok');
  await yap('authenticated', B, `select public.respond_friend_request(${alintila(istek)}, true)`);
  await db.sorgu(`update public.profiles set kosullar_kabul_at = now() where id in (${alintila(A)}, ${alintila(B)})`);
  await dene('auth: DM gönder', 'authenticated', A, `select public.dm_gonder(${alintila(B)}, 'prova mesajı')`, 'ok');

  // ---------------- A.1 push
  await dene('push: geçerli FCM adresi', 'authenticated', A, push(A, fcm(1)), 'ok');
  await dene('push: Mozilla adresi', 'authenticated', A, push(A, 'https://updates.push.services.mozilla.com/wpush/v2/prova'), 'ok');
  await dene('push: Apple adresi', 'authenticated', A, push(A, 'https://web.push.apple.com/prova'), 'ok');
  await dene('push: Windows adresi', 'authenticated', A, push(A, 'https://wns2-par02p.notify.windows.com/w/?token=prova'), 'ok');
  await dene('push: sahte alan adı reddedilir', 'authenticated', A, push(A, 'https://saldirgan.example.com/x'), /Geçersiz bildirim adresi/);
  await dene('push: userinfo hilesi reddedilir', 'authenticated', A, push(A, 'https://fcm.googleapis.com@saldirgan.example.com/x'), /Geçersiz bildirim adresi/);
  await dene('push: http reddedilir', 'authenticated', A, push(A, 'http://fcm.googleapis.com/fcm/send/x'), /Geçersiz bildirim adresi/);
  await dene('push: 1000+ karakter reddedilir', 'authenticated', A, push(A, fcm('x'.repeat(1000))), /Geçersiz bildirim aboneliği/);
  await yap('authenticated', A, push(A, fcm(1)));
  await dene('push: başkasının adresi devralınamaz', 'authenticated', B, push(B, fcm(1)), /başka bir hesaba/);
  const sahip = await db.tek(`select user_id from public.push_subscriptions where endpoint=${alintila(fcm(1))}`);
  sonuc.push({ gecti: sahip === A, ad: 'push: adres A\'da kaldı', rol: 'katalog', durum: sahip === A ? 'ok' : 'hata', ayrinti: '' });
  await dene('push: kendi adresini güncelleyebilir', 'authenticated', A, push(A, fcm(1)), 'ok');
  // Aynı işlemde now() sabit: her yeni kayıttan önce eskileri 1 dk geriye al (en eski = fcm(1)).
  for (let i = 2; i <= 7; i++) {
    await db.sorgu(`update public.push_subscriptions set created_at = created_at - interval '1 minute' where user_id = ${alintila(A)}`);
    await yap('authenticated', A, push(A, fcm(i)));
  }
  const adet = await db.tek(`select count(*) from public.push_subscriptions where user_id=${alintila(A)}`);
  const ilkVar = await db.tek(`select count(*) from public.push_subscriptions where endpoint=${alintila(fcm(1))}`);
  sonuc.push({ gecti: adet === '5' && ilkVar === '0', ad: 'push: kullanıcı başına 5, en eski silinir', rol: 'katalog', durum: `adet=${adet} ilk=${ilkVar}`, ayrinti: '' });
  await dene('auth: remove_push_subscription', 'authenticated', A, `select public.remove_push_subscription(${alintila(fcm(7))})`, 'ok');

  // ---------------- A.7 turnuva
  const soruId = await db.tek(`select id from public.questions limit 1`);
  const turnuva = await db.tek(`insert into public.tournaments (tarih, seans, durum, soru_ids, aktif_soru, soru_baslangic)
    values ('2099-01-01', 'aksam', 'aktif', array[${alintila(soruId)}]::uuid[], 0, now()) returning id`);
  await db.sorgu(`insert into public.tournament_players (tournament_id, user_id, elendi) values
    (${alintila(turnuva)}, ${alintila(A)}, false), (${alintila(turnuva)}, ${alintila(C)}, true)`);
  await dene('turnuva: kayıtlı oyuncu soruyu alır', 'authenticated', A, `select question_id from public.get_tournament_question(${alintila(turnuva)})`, 'ok');
  await dene('turnuva: kayıtsız oyuncu alamaz', 'authenticated', B, `select question_id from public.get_tournament_question(${alintila(turnuva)})`, /soru alamazsın/);
  await dene('turnuva: elenmiş oyuncu alamaz', 'authenticated', C, `select question_id from public.get_tournament_question(${alintila(turnuva)})`, /soru alamazsın/);

  // ---------------- A.4 Facebook
  await yap('authenticated', A, `select public.facebook_kimligi_kaydet('sahte999')`);
  const fbA = await db.tek(`select facebook_id from public.profiles where id=${alintila(A)}`);
  sonuc.push({ gecti: fbA === 'fbprova123', ad: 'facebook: kimlik auth.identities\'ten (sahte istemci değeri yok sayıldı)', rol: 'authenticated', durum: String(fbA), ayrinti: '' });
  await yap('authenticated', B, `select public.facebook_kimligi_kaydet('fbprova123')`);
  const fbB = await db.tek(`select facebook_id from public.profiles where id=${alintila(B)}`);
  sonuc.push({ gecti: fbB === null, ad: 'facebook: FB kimliği olmayan başkasınınkini sahiplenemez', rol: 'authenticated', durum: String(fbB), ayrinti: '' });
  await dene('facebook: öneriler authenticated açık', 'authenticated', C, `select count(*) from public.facebook_arkadas_onerileri(array['fbprova123'])`, 'ok');

  // ---------------- cron (postgres) — kapatılan fonksiyonlar sahibinden çalışıyor
  await dene('cron: eski_davetleri_temizle (postgres)', 'postgres', null, `select public.eski_davetleri_temizle()`, 'ok');
  await dene('cron: coin_harca sahibine açık', 'postgres', null, `select has_function_privilege('postgres','public.coin_harca(bigint,text,text)','execute') and has_function_privilege('service_role','public.coin_harca(bigint,text,text)','execute')`, 'ok');
  const cronKapali = await db.sorgu(`select j.jobname from cron.job j
    where exists (select 1 from pg_proc p where p.pronamespace='public'::regnamespace and j.command ~ ('\\m'||p.proname||'\\(')
                   and not has_function_privilege(j.username, p.oid, 'execute'))`);
  sonuc.push({ gecti: cronKapali.length === 0, ad: 'cron: bütün işlerin fonksiyonları kendi rolüne açık', rol: 'katalog', durum: String(cronKapali.length), ayrinti: cronKapali.map((r) => r.jobname).join(', ') });

  // ---------------- A.9, A.11, A.12 katalog
  const kova = await db.sorgu(`select file_size_limit::text l, allowed_mime_types::text m from storage.buckets where id='avatarlar'`);
  sonuc.push({ gecti: kova[0]?.l === '2097152' && kova[0]?.m === '{image/png,image/jpeg,image/webp}', ad: 'kova: avatarlar 2 MB + png/jpeg/webp', rol: 'katalog', durum: JSON.stringify(kova[0]), ayrinti: '' });
  const vy = await db.tek(`select reloptions::text from pg_class where oid='public.kasa_deneme_ozeti'::regclass`);
  sonuc.push({ gecti: /security_invoker=on|security_invoker=true/.test(vy ?? ''), ad: 'görünüm: kasa_deneme_ozeti security_invoker', rol: 'katalog', durum: String(vy), ayrinti: '' });
  const vars = await db.sorgu(`select defaclobjtype t, defaclnamespace::regnamespace::text s, defaclacl::text a from pg_default_acl where defaclrole='postgres'::regrole and defaclobjtype in ('f','r') and defaclnamespace in (0, 'public'::regnamespace)`);
  sonuc.push({ gecti: true, ad: 'varsayılan yetkiler (bilgi)', rol: 'katalog', durum: '', ayrinti: JSON.stringify(vars) });
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}

let hata = 0;
for (const s of sonuc) {
  if (!s.gecti) hata++;
  console.log(`${s.gecti ? 'GEÇTİ' : 'KALDI'} | ${s.ad} | ${s.rol} | ${s.durum} | ${s.ayrinti}`);
}
console.log(`\n${sonuc.length - hata}/${sonuc.length} geçti. (İşlem geri alındı.)`);
process.exitCode = hata ? 1 : 0;
