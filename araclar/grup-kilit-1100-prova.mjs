// 1100 provası — TEK grup maçı, TEK transaction, sonda ROLLBACK (canlıya kalıcı yazı yok; toplu deneme değil).
// 1) Akış: aynı senaryo önce ESKİ fonksiyonlarla (savepoint), sonra migration 1100 ile koşulur, gözlemler birebir
//    karşılaştırılır: lobi başı → hazır → başlama → 1. insan cevabı (bot adımı YOK) → son insan cevabı (bot hemen
//    cevaplar, soru ilerler) → kopukluk duraklatması → dönüş → devam → 45 sn sonra terk.
// 2) Kilit: ikinci bağlantı bitmiş bir grup maçının satırını FOR UPDATE tutarken üyesi nabız atar — eski gövde
//    lock_timeout (2 sn) bekler, yeni gövde (geçiş yok) beklemez. 3) Geri alma dosyası denenir.
//   node araclar/grup-kilit-1100-prova.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const dizgi = await baglantiDizgisi();
const db = await new PgIstemci(dizgi).baglan();
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const ben = (id) => q(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
const yonetici = () => q(`select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)`);
const MIG = fs.readFileSync("supabase/migrations/20260612001100_grup_kilit.sql", "utf8");

async function senaryo(A, B, BOT, sorular) {
  const g = [];
  const not = (ad, v) => g.push(`${ad}: ${JSON.stringify(v)}`);
  await yonetici();
  const [m] = await q(`insert into public.group_matches (kurucu, oyuncu_sayisi, durum, soru_ids, aktif_soru)
    values (${alintila(A)}, 3, 'aktif', array[${sorular.map(alintila).join(",")}]::uuid[], -1) returning id`);
  const id = m.id;
  await q(`insert into public.group_match_players (group_match_id, user_id, davet_durumu, joined_at) values
    (${alintila(id)}, ${alintila(A)}, 'kabul', now()), (${alintila(id)}, ${alintila(B)}, 'kabul', now()),
    (${alintila(id)}, ${alintila(BOT)}, 'kabul', now() - interval '1 hour')`);
  const durum = async () => { await yonetici(); const [r] = await q(`select durum, basladi, aktif_soru, (lobi_bas is not null) lobi, (duraklatildi_at is not null) durak,
      (select count(*)::int from public.group_match_answers where group_match_id = ${alintila(id)}) cevap,
      (select count(*)::int from public.group_match_players where group_match_id = ${alintila(id)} and terk_at is not null) terk
      from public.group_matches where id = ${alintila(id)}`); return r; };
  const nabiz = async (kim, hazir) => { await ben(kim); const [r] = await q(`select durum, basladi, ben_hazir, hazir_sayisi, toplam_oyuncu, bekleyenler, duraklatildi
      from public.grup_mac_nabiz(${alintila(id)}, ${hazir})`); return r; };
  const cevap = async (kim) => { await ben(kim); const [r] = await q(`select dogru from public.submit_group_match_answer(${alintila(id)}, 0::smallint, 0)`); return r; };

  not("A nabız (hazır)", await nabiz(A, true)); not("durum", await durum());
  not("B nabız (hazır değil)", await nabiz(B, false)); not("durum", await durum());
  not("B nabız (hazır)", await nabiz(B, true)); not("durum (başladı)", await durum());
  not("A nabız (geçiş yok)", await nabiz(A, false)); not("durum", await durum());
  // 1092: ilk soru şimdi + 3-2-1 + pay'da başlar; transaction içinde zaman donuk → başlangıç 1 sn geriye çekilir
  await yonetici(); await q(`update public.group_matches set soru_baslangic = now() - interval '1 second' where id = ${alintila(id)}`);
  await cevap(A); not("A cevapladı → bot adımı yok", await durum());
  await cevap(B); not("B (son insan) cevapladı → bot + ilerleme", await durum());
  await yonetici(); await q(`update public.group_match_players set nabiz_at = now() - interval '20 seconds' where group_match_id = ${alintila(id)} and user_id = ${alintila(B)}`);
  not("A nabız (B kopuk)", await nabiz(A, false)); not("durum (duraklama)", await durum());
  not("B nabız (döndü)", await nabiz(B, false)); not("durum (devam)", await durum());
  await yonetici(); await q(`update public.group_match_players set nabiz_at = now() - interval '20 seconds' where group_match_id = ${alintila(id)} and user_id = ${alintila(B)}`);
  not("A nabız (B yine kopuk)", await nabiz(A, false));
  await yonetici(); await q(`update public.group_matches set duraklatildi_at = now() - interval '50 seconds' where id = ${alintila(id)}`);
  not("A nabız (45 sn doldu → terk)", await nabiz(A, false)); not("durum (terk)", await durum());
  await yonetici();
  return g;
}

async function kilitOlc(etiket, mac, uye) {
  const L = await new PgIstemci(dizgi).baglan();
  try {
    await L.sorgu("begin");
    await L.sorgu(`select 1 from public.group_matches where id = ${alintila(mac)} for update`);
    await ben(uye);
    const t = Date.now();
    await q("savepoint k");
    try { await q(`select * from public.grup_mac_nabiz(${alintila(mac)}, false)`); } finally { await q("rollback to savepoint k"); }
    const ms = Date.now() - t;
    console.log(`  kilitli satırda nabız (${etiket}): ${ms} ms`);
    return ms;
  } finally { try { await L.sorgu("rollback"); } finally { await L.kapat?.(); await yonetici(); } }
}

try {
  await q("set statement_timeout = '30s'");
  await q("begin");
  const [a, b] = await q("select id from public.profiles where not coalesce(is_bot,false) order by last_seen desc nulls last limit 2");
  const [bot] = await q("select id from public.profiles where is_bot and bot_turu = 'gizli' limit 1");
  const sorular = (await q("select id from public.questions where aktif and kapsam = 'global' order by id limit 20")).map((r) => r.id);
  const [bitmis] = await q(`select gm.id, gp.user_id from public.group_matches gm join public.group_match_players gp on gp.group_match_id = gm.id
    join public.profiles p on p.id = gp.user_id and not coalesce(p.is_bot,false) where gm.durum = 'bitti' order by gm.created_at desc limit 1`);

  const kilitOnce = bitmis ? await kilitOlc("eski", bitmis.id, bitmis.user_id) : NaN;
  await q("savepoint eski");
  const once = await senaryo(a.id, b.id, bot.id, sorular);
  await q("rollback to savepoint eski");

  await q(MIG);
  sonuc("migration çalıştı", true);
  const kilitSonra = bitmis ? await kilitOlc("yeni", bitmis.id, bitmis.user_id) : NaN;
  await q("savepoint yeni");
  const sonra = await senaryo(a.id, b.id, bot.id, sorular);
  await q("rollback to savepoint yeni");

  for (let i = 0; i < Math.max(once.length, sonra.length); i++) {
    const ayni = once[i] === sonra[i];
    sonuc(`adım ${String(i + 1).padStart(2)} aynı`, ayni, ayni ? sonra[i] : `\n    eski: ${once[i]}\n    yeni: ${sonra[i]}`);
  }
  const s = (k) => sonra.find((x) => x.startsWith(k)) ?? "";
  sonuc("1. insan cevabında bot cevaplamadı", /"cevap":"?1"?[,}]/.test(s("A cevapladı")) && /"aktif_soru":"?0"?[,}]/.test(s("A cevapladı")));
  sonuc("son insan cevabında bot cevapladı ve soru ilerledi", /"cevap":"?3"?[,}]/.test(s("B (son insan)")) && /"aktif_soru":"?1"?[,}]/.test(s("B (son insan)")));
  sonuc("kilitli satırda nabız beklemiyor", kilitSonra < 1000 && kilitOnce >= 1800, `eski ${kilitOnce} ms → yeni ${kilitSonra} ms`);

  await q("savepoint geri");
  await q(fs.readFileSync("docs/grup-kilit-1100-geri-al.sql", "utf8"));
  const geri = await senaryo(a.id, b.id, bot.id, sorular);
  sonuc("geri alma sonrası eski davranış", JSON.stringify(geri) === JSON.stringify(once));
  await q("rollback to savepoint geri");
} catch (e) {
  hata++;
  console.log("✗ beklenmeyen hata:", e.message);
} finally {
  try { await q("rollback"); } finally { await db.kapat?.(); }
  console.log(hata ? `\n${hata} HATA` : "\nPROVA TEMİZ (ROLLBACK)");
  process.exit(hata ? 1 : 0);
}
