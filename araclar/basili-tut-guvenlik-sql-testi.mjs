// Basılı tut (1052) güvenlik provası — TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
//
// Her yeni/değişen soru RPC'sinde:
//   · yetkili hesap (profiles.hile_yetkisi) → dogru_cevap DOLU ve doğru
//   · yetkisiz hesap → dogru_cevap null / alan yok
//   · anon → EXECUTE yetkisi yok (çağrı reddedilir)
//   · Kasa/Düello: cevap verdikten sonra, sıra/faz cevap değilken yetkili hesaba da yok
// Oturum/maç satırları transaction içinde kurulur ya da eski bitmiş satır geçici açılır.
//
// Kullanım: IZIN_CANLI_TEST=1 node araclar/basili-tut-guvenlik-sql-testi.mjs   (tek sefer; canlıya yük bindirmez)
import { PgIstemci, baglantiDizgisi, alintila } from './pg-mini.mjs';

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tek = async (sql) => { const r = await db.sorgu(sql); return (r.satirlar ?? r.rows ?? r)[0]; };
const sonuc = [];
let hataVar = false;
const kontrol = (ad, kosul, ayrinti = '') => {
  sonuc.push(`${kosul ? 'GEÇTİ' : 'KALDI'} · ${ad}${ayrinti ? ' · ' + ayrinti : ''}`);
  if (!kosul) hataVar = true;
};
const ben = (u) => db.sorgu(`select set_config('request.jwt.claim.sub', ${alintila(u)}, true),
  set_config('request.jwt.claims', ${alintila(JSON.stringify({ sub: u, role: 'authenticated' }))}, true)`);
const rol = (r) => db.sorgu(`set local role ${r}`);
const denetle = async (sql) => {   // hata metni ya da null
  await db.sorgu('savepoint s');
  try { const r = await tek(sql); await db.sorgu('release savepoint s'); return { r }; }
  catch (e) { await db.sorgu('rollback to savepoint s'); return { hata: e.message }; }
};

try {
  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '20s'");

  const H = (await tek(`select id from public.profiles where hile_yetkisi order by created_at limit 1`)).id;
  const U = (await tek(`select id from public.profiles where not coalesce(hile_yetkisi, false) and id <> ${alintila(H)}
                        and coalesce(is_bot, false) = false order by created_at limit 1`)).id;
  const q = await tek(`select id, dogru_cevap from public.questions where aktif is not false order by created_at desc limit 1`);
  const Q = q.id, DC = Number(q.dogru_cevap);

  // ---------- anon: EXECUTE yok ----------
  for (const f of ['calisma_soru', 'hizli_mod_soru', 'get_hizli_soru', 'kasa_durum', 'duello_durum']) {
    await rol('anon');
    const x = await denetle(`select public.${f}('00000000-0000-0000-0000-000000000000'::uuid)`);
    await db.sorgu('reset role');
    kontrol(`anon ${f}`, /permission denied/i.test(x.hata ?? ''), x.hata ?? 'çağrı geçti!');
  }

  // ---------- Çalışma + Hızlı Mod (oturum satırı kurulur) ----------
  await db.sorgu(`update public.oyun_ayarlari set deger = 'true'::jsonb where anahtar = 'hizli_mod_acik'`);
  for (const u of [H, U]) {
    await db.sorgu(`insert into public.calisma_oturumlari (id, user_id, soru_ids, banka_ids, aktif_soru, durum)
      values (md5(${alintila('c' + u)})::uuid, ${alintila(u)}, array[${alintila(Q)}]::uuid[], array[]::uuid[], 0, 'aktif')`);
    await db.sorgu(`insert into public.hizli_mod_oturumlar (id, user_id, soru_ids, aktif_soru, soru_baslangic, baslangic, durum)
      values (md5(${alintila('h' + u)})::uuid, ${alintila(u)}, array[${alintila(Q)}]::uuid[], 0, now(), now(), 'aktif')`);
  }
  for (const [u, ad, bekle] of [[H, 'yetkili', DC], [U, 'yetkisiz', null]]) {
    await ben(u); await rol('authenticated');
    const c = await denetle(`select dogru_cevap from public.calisma_soru(md5(${alintila('c' + u)})::uuid)`);
    const h = await denetle(`select dogru_cevap from public.hizli_mod_soru(md5(${alintila('h' + u)})::uuid)`);
    await db.sorgu('reset role');
    kontrol(`Çalışma ${ad}`, !c.hata && (c.r.dogru_cevap == null ? null : Number(c.r.dogru_cevap)) === bekle, c.hata ?? `dogru_cevap=${c.r.dogru_cevap}`);
    kontrol(`Hızlı Mod ${ad}`, !h.hata && (h.r.dogru_cevap == null ? null : Number(h.r.dogru_cevap)) === bekle, h.hata ?? `dogru_cevap=${h.r.dogru_cevap}`);
  }

  // ---------- Hızlı Maç (dondurulmuş; maç satırı kurulur) ----------
  await db.sorgu(`update public.oyun_ayarlari set deger = 'true'::jsonb where anahtar = 'hizli_mac_acik'`);
  const HM = (await tek(`select md5('bt-hizli-mac')::uuid id`)).id;
  await db.sorgu(`insert into public.hizli_maclar (id, kurucu, durum, aktif_soru, soru_ids, soru_baslangic)
    values (${alintila(HM)}, ${alintila(H)}, 'aktif', 0, array[${alintila(Q)}]::uuid[], now())`);
  await db.sorgu(`insert into public.hizli_oyuncular (hizli_mac_id, user_id, davet_durumu)
    values (${alintila(HM)}, ${alintila(H)}, 'kabul'), (${alintila(HM)}, ${alintila(U)}, 'kabul')`);
  for (const [u, ad, bekle] of [[H, 'yetkili', DC], [U, 'yetkisiz', null]]) {
    await ben(u); await rol('authenticated');
    const x = await denetle(`select dogru_cevap from public.get_hizli_soru(${alintila(HM)})`);
    await db.sorgu('reset role');
    kontrol(`Hızlı Maç ${ad}`, !x.hata && (x.r.dogru_cevap == null ? null : Number(x.r.dogru_cevap)) === bekle, x.hata ?? `dogru_cevap=${x.r.dogru_cevap}`);
  }

  // ---------- Kasa (H'nin bitmiş maçı geçici açılır, U rakip yerine) ----------
  const K = (await tek(`select id from public.kasa_maclari where ${alintila(H)} in (oyuncu1, oyuncu2) order by created_at desc limit 1`)).id;
  await db.sorgu(`update public.kasa_maclari set oyuncu1 = ${alintila(H)}, oyuncu2 = ${alintila(U)}, durum = 'aktif', faz = 'cevap',
      soru_id = ${alintila(Q)}, cevaplar = '{}'::jsonb, soru_baslangic = now(), faz_bitis = now() + interval '2 minutes',
      kopuk_at = null, kazanan = null where id = ${alintila(K)}`);
  const kasa = async (u) => {
    await ben(u); await rol('authenticated');
    const x = await denetle(`select public.kasa_durum(${alintila(K)}) j`);
    await db.sorgu('reset role');
    if (x.r) x.r.j = JSON.parse(x.r.j);   // pg-mini metin döndürür
    return x;
  };
  let x = await kasa(H);
  kontrol('Kasa yetkili (cevap fazı)', !x.hata && Number(x.r.j?.soru?.dogru_cevap) === DC && x.r.j?.soru?.dogru_cevap != null, x.hata ?? `faz=${x.r.j?.faz} dogru_cevap=${x.r.j?.soru?.dogru_cevap}`);
  x = await kasa(U);
  kontrol('Kasa yetkisiz', !x.hata && x.r.j?.soru && !('dogru_cevap' in x.r.j.soru), x.hata ?? `faz=${x.r.j?.faz} soru=${JSON.stringify(x.r.j?.soru)?.slice(0, 60)}`);
  await db.sorgu(`update public.kasa_maclari set cevaplar = jsonb_build_object(${alintila(H)}, jsonb_build_object('cevap', 0)) where id = ${alintila(K)}`);
  x = await kasa(H);
  kontrol('Kasa yetkili, cevap verdikten sonra yok', !x.hata && !('dogru_cevap' in (x.r.j?.soru ?? {})), x.hata ?? `dogru_cevap=${x.r.j?.soru?.dogru_cevap}`);

  // ---------- Düello v4 ----------
  const D4 = (await tek(`select id from public.duellolar where surum = 4 and ${alintila(H)} in (oyuncu1, oyuncu2) order by created_at desc limit 1`)).id;
  await db.sorgu(`update public.duellolar set oyuncu1 = ${alintila(H)}, oyuncu2 = ${alintila(U)}, durum = 'aktif', faz = 'cevap',
      soru_id1 = ${alintila(Q)}, soru_id2 = ${alintila(Q)}, cevaplar = '{}'::jsonb, soru_baslangic = now() - interval '1 second',
      faz_bitis = now() + interval '2 minutes', bitis1 = now() + interval '2 minutes', bitis2 = now() + interval '2 minutes',
      kopuk_at = null, kazanan = null, son_hareket = now() where id = ${alintila(D4)}`);
  const duello = async (u, id) => {
    await ben(u); await rol('authenticated');
    const y = await denetle(`select public.duello_durum(${alintila(id)}) j`);
    await db.sorgu('reset role');
    if (y.r) y.r.j = JSON.parse(y.r.j);
    return y;
  };
  x = await duello(H, D4);
  kontrol('Düello v4 yetkili (cevap hakkı var)', !x.hata && x.r.j?.soru?.dogru_cevap != null && Number(x.r.j.soru.dogru_cevap) === DC, x.hata ?? `faz=${x.r.j?.faz} dogru_cevap=${x.r.j?.soru?.dogru_cevap}`);
  x = await duello(U, D4);
  kontrol('Düello v4 yetkisiz', !x.hata && x.r.j?.soru && !('dogru_cevap' in x.r.j.soru), x.hata ?? `faz=${x.r.j?.faz}`);
  await db.sorgu(`update public.duellolar set cevaplar = jsonb_build_object(${alintila(H)}, jsonb_build_object('cevap', 0, 'at', now())) where id = ${alintila(D4)}`);
  x = await duello(H, D4);
  kontrol('Düello v4 yetkili, cevap verdikten sonra yok', !x.hata && !('dogru_cevap' in (x.r.j?.soru ?? {})), x.hata ?? `dogru_cevap=${x.r.j?.soru?.dogru_cevap}`);
  await db.sorgu(`update public.duellolar set cevaplar = '{}'::jsonb, faz = 'kart' where id = ${alintila(D4)}`);
  x = await duello(H, D4);
  kontrol('Düello v4 yetkili, kart fazında (sıra/soru yok) yok', !x.hata && !('dogru_cevap' in (x.r.j?.soru ?? {})), x.hata ?? `faz=${x.r.j?.faz}`);

  // ---------- Düello v2 ----------
  const D2 = (await tek(`select id from public.duellolar where surum = 2 order by created_at desc limit 1`)).id;
  await db.sorgu(`update public.duellolar set oyuncu1 = ${alintila(H)}, oyuncu2 = ${alintila(U)}, durum = 'aktif', faz = 'cevap',
      soru_id = ${alintila(Q)}, cevaplar = '{}'::jsonb, faz_bitis = now() + interval '2 minutes',
      bitis1 = now() + interval '2 minutes', bitis2 = now() + interval '2 minutes', kopuk_at = null, kazanan = null, son_hareket = now() where id = ${alintila(D2)}`);
  x = await duello(H, D2);
  kontrol('Düello v2 yetkili', !x.hata && x.r.j?.soru?.dogru_cevap != null && Number(x.r.j.soru.dogru_cevap) === DC, x.hata ?? `faz=${x.r.j?.faz} dogru_cevap=${x.r.j?.soru?.dogru_cevap}`);
  x = await duello(U, D2);
  kontrol('Düello v2 yetkisiz', !x.hata && x.r.j?.soru && !('dogru_cevap' in x.r.j.soru), x.hata ?? `faz=${x.r.j?.faz}`);

  // ---------- Klasik (değişmedi, regresyon): yetkisiz için get_match_question kapısı yerinde ----------
  const tanim = (await tek(`select pg_get_functiondef('public.get_match_question(uuid)'::regprocedure) d`)).d;
  kontrol('Klasik get_match_question kapısı yerinde', tanim.includes('case when public.hileli_mi() then sd.dogru_cevap else null end'));
} catch (e) {
  hataVar = true;
  sonuc.push('HATA · ' + e.message);
} finally {
  try { await db.sorgu('rollback'); } finally { await db.kapat(); }
}
console.log(sonuc.join('\n'));
console.log(hataVar ? '\nSONUÇ: KALDI' : '\nSONUÇ: hepsi geçti (ROLLBACK, canlıda iz yok)');
process.exit(hataVar ? 1 : 0);
