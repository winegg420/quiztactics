// 1058 provası — TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz). Toplu deneme/simülasyon değil: tek maç satırı.
// Bitmiş bir Düello v4 satırı işlem içinde kart fazına alınır; işlem içinde now() sabittir, "süre doldu" faz_bitis
// geriye çekilerek taklit edilir.
// Sınar: 1. adım kendi süresiyle 2. adımı açar (tam duello4_kart_sn) · 1. adım süresi dolunca yalnız rakibe giden kart
// otomatik, 2. adım yeni süreyle açılır · 2. adım dolunca yalnız kendi kartı otomatik · elle iki adım → oto yok ·
// duello_durum › v4.oto_gonder / oto_sec · rpc_sayac UNLOGGED + hız sınırı sayıyor + aşımda hata · yetkiler (fonksiyon
// ACL'leri ve tablo yetkileri önce/sonra aynı) · kayit_budama() · cron işi aynı jobid.
// Kullanım: node araclar/mac-duzeltme-1058-prova.mjs [--migsiz]   (--migsiz: migration canlıdaysa uygulamadan sınar)
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const MIG = "supabase/migrations/20260612001058_mac_duzeltme_kart_sayac_budama.sql";
const MIGSIZ = process.argv.includes("--migsiz");
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const q = async (s) => { const r = await db.sorgu(s); return r.rows ?? r; };
const bir = async (s) => (await q(s))[0];
let gecen = 0, kalan = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) gecen++; else kalan++; console.log(`${kosul ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const bekci = setTimeout(() => { console.error("bekçi: 90 sn aşıldı"); process.exit(2); }, 90000);

const ACL_FN = ["duello4_kart_ac(uuid)", "duello4_kart_uygula(uuid,text,text,boolean)", "duello4_kart_oto(uuid)", "duello4_durum(uuid)",
  "hiz_siniri(text,integer,interval)", "hiz_siniri_mesajli(text,integer,interval,text)", "duello_kategori_sec(uuid,text)", "duello_durum(uuid)"];
const aclOku = async () => Object.fromEntries((await q(`select p.oid::regprocedure::text ad, coalesce(p.proacl::text,'') acl
  from pg_proc p where p.oid::regprocedure::text = any(array[${ACL_FN.map((f) => `'${f}'`).join(",")}])`)).map((r) => [r.ad, r.acl]));
const tabloYetki = async () => (await q(`select coalesce(relacl::text,'') a, relrowsecurity::text r from pg_class where oid='public.rpc_sayac'::regclass`))[0];

try {
  await q("begin");
  await q("set local lock_timeout = '3s'; set local statement_timeout = '30s'; set local idle_in_transaction_session_timeout = '60s'");
  const aclOnce = await aclOku();
  const tabloOnce = await tabloYetki();
  const jobOnce = await bir(`select jobid from cron.job where jobname='bildim-cron-kayit-budama'`);
  if (!MIGSIZ) await q(fs.readFileSync(MIG, "utf8"));

  // ---------------- yetkiler aynı
  const aclSonra = await aclOku();
  ok("fonksiyon yetkileri önce/sonra aynı", ACL_FN.every((f) => aclOnce[f] === aclSonra[f]), JSON.stringify(ACL_FN.filter((f) => aclOnce[f] !== aclSonra[f])));
  const tabloSonra = await tabloYetki();
  ok("rpc_sayac tablo yetkileri + RLS aynı", tabloOnce.a === tabloSonra.a && tabloOnce.r === tabloSonra.r);
  ok("rpc_sayac UNLOGGED", (await bir(`select relpersistence p from pg_class where oid='public.rpc_sayac'::regclass`)).p === "u");
  const kb = await bir(`select coalesce(proacl::text,'') a from pg_proc where proname='kayit_budama'`);
  ok("kayit_budama istemciye kapalı", !/authenticated=|anon=|^=X|,=X/.test(kb.a), kb.a);

  // ---------------- Düello v4 kart adımları
  const m = await bir(`select id, oyuncu1, oyuncu2 from public.duellolar where surum = 4 and durum = 'bitti'
                        and oyuncu1 is not null and oyuncu2 is not null order by created_at desc limit 1`);
  if (!m) throw new Error("bitmiş v4 maçı yok");
  const kart = (kontrol, gonderilen = null) => q(`update public.duellolar set durum='aktif', faz='kart', v4_kontrol='${kontrol}', saldiran='${kontrol}',
      v4_kartlar=array['tarih','sinema','muzik','bilim'], v4_gonderilen=${gonderilen ? `'${gonderilen}'` : "null"}, v4_secilen=null,
      v4_kart_oto=false, v4_oto_gonder=false, v4_oto_sec=false, kopuk_at=null,
      v4_duyuru_bitis=now() + interval '0.9 seconds', faz_bitis=now() + interval '10.9 seconds', son_hareket=now() where id='${m.id}'`);
  const satir = () => bir(`select faz, v4_gonderilen, v4_secilen, v4_kart_oto::text oto, v4_oto_gonder::text og, v4_oto_sec::text os,
      round(extract(epoch from faz_bitis - now())::numeric, 2) kalan, round(extract(epoch from v4_duyuru_bitis - now())::numeric, 2) duyuru
      from public.duellolar where id='${m.id}'`);
  const kartSn = Number((await bir(`select public.ayar_sayi('duello4_kart_sn', 7) n`)).n);
  const duyuruSn = Number((await bir(`select public.ayar_sayi('duello4_kart_duyuru_ms', 900) n`)).n) / 1000;

  // a) elle 1. adım, süre neredeyse bitmişken → 2. adım TAM süre
  await kart(m.oyuncu1);
  await q(`update public.duellolar set faz_bitis = now() + interval '1 second' where id='${m.id}'`);
  await q(`select public.duello4_kart_uygula('${m.id}', 'tarih', null, false)`);
  let s = await satir();
  ok("elle 1. adım → 2. adım kendi süresiyle (kart_sn + duyuru)", s.faz === "kart" && Math.abs(Number(s.kalan) - (kartSn + duyuruSn)) < 0.05 && s.og === "false",
    `kalan ${s.kalan} sn (beklenen ${kartSn + duyuruSn})`);
  // b) 2. adım süresi dolunca yalnız kendi kartı otomatik
  await q(`update public.duellolar set faz_bitis = now() - interval '5 seconds' where id='${m.id}'`);
  await q(`select public.duello4_kart_oto('${m.id}')`);
  s = await satir();
  ok("2. adım dolunca: kendi kartı otomatik, gönderilen elle kalır", s.faz === "cevap" && s.v4_gonderilen === "tarih" && s.v4_secilen && s.v4_secilen !== "tarih"
    && s.og === "false" && s.os === "true" && s.oto === "true", JSON.stringify(s));
  // durum çıktısı (kontrol sahibi + rakip gözüyle)
  const durum = async (uid) => {
    await q(`select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
    const r = await bir(`select public.duello_durum('${m.id}') d`);
    await q(`reset role`);
    return typeof r.d === "string" ? JSON.parse(r.d) : r.d;
  };
  let d1 = await durum(m.oyuncu1);
  ok("duello_durum › v4.oto_gonder / oto_sec (sahip)", d1?.v4?.oto_gonder === false && d1?.v4?.oto_sec === true, JSON.stringify({ og: d1?.v4?.oto_gonder, os: d1?.v4?.oto_sec, oto: d1?.v4?.oto }));
  let d2 = await durum(m.oyuncu2);
  ok("duello_durum › rakip de aynı adım bilgisini görür", d2?.v4?.oto_gonder === false && d2?.v4?.oto_sec === true);

  // c) 1. adım süresi dolunca: yalnız rakibe giden kart otomatik, 2. adım yeni süreyle açık kalır
  await kart(m.oyuncu2);
  await q(`update public.duellolar set faz_bitis = now() - interval '5 seconds' where id='${m.id}'`);
  await q(`select public.duello4_kart_oto('${m.id}')`);
  s = await satir();
  ok("1. adım dolunca: yalnız gönderilen otomatik, 2. adım açık + tam süre", s.faz === "kart" && s.v4_gonderilen && !s.v4_secilen && s.og === "true" && s.os === "false"
    && Math.abs(Number(s.kalan) - (kartSn + duyuruSn)) < 0.05 && Math.abs(Number(s.duyuru) - duyuruSn) < 0.05, JSON.stringify(s));
  // 2. adım elle (istemci yolu: duello_kategori_sec, kontrol sahibi)
  const kalanKart = (await bir(`select k from unnest(array['tarih','sinema','muzik','bilim']) k where k <> (select v4_gonderilen from public.duellolar where id='${m.id}') limit 1`)).k;
  await q(`select set_config('request.jwt.claims', '{"sub":"${m.oyuncu2}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
  await q(`select public.duello_kategori_sec('${m.id}', '${kalanKart}')`);
  await q(`reset role`);
  s = await satir();
  ok("2. adım elle → yalnız gönderilen otomatik işaretli", s.faz === "cevap" && s.v4_secilen === kalanKart && s.og === "true" && s.os === "false", JSON.stringify(s));

  // d) iki adım elle → oto yok; kart_ac bayrakları sıfırlar
  await kart(m.oyuncu1);
  await q(`update public.duellolar set v4_oto_gonder = true, v4_oto_sec = true where id='${m.id}'`);
  await q(`select public.duello4_kart_ac('${m.id}')`);
  s = await satir();
  ok("kart_ac oto bayraklarını sıfırlar", s.og === "false" && s.os === "false" && s.oto === "false");
  const kartlar = (await bir(`select v4_kartlar k from public.duellolar where id='${m.id}'`)).k;
  await q(`select set_config('request.jwt.claims', '{"sub":"${m.oyuncu1}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
  const liste = Array.isArray(kartlar) ? kartlar : String(kartlar).replace(/[{}]/g, "").split(",");
  await q(`select public.duello_kategori_sec('${m.id}', '${liste[0]}')`);
  await q(`select public.duello_kategori_sec('${m.id}', '${liste[1]}')`);
  await q(`reset role`);
  s = await satir();
  ok("iki adım elle → oto yok", s.faz === "cevap" && s.oto === "false" && s.og === "false" && s.os === "false", JSON.stringify(s));

  // ---------------- hız sınırı aynı davranış (UNLOGGED tabloda)
  await q(`select set_config('request.jwt.claims', '{"sub":"${m.oyuncu1}","role":"authenticated"}', true)`);
  await q(`select public.hiz_siniri('prova_1058', 2, interval '60 seconds')`);
  await q(`select public.hiz_siniri('prova_1058', 2, interval '60 seconds')`);
  const sayi = await bir(`select sayi from public.rpc_sayac where user_id='${m.oyuncu1}' and uc_adi='prova_1058'`);
  ok("hiz_siniri sayıyor", Number(sayi?.sayi) === 2);
  let hata = null;
  try { await q(`savepoint s1; select public.hiz_siniri('prova_1058', 2, interval '60 seconds')`); } catch (e) { hata = e.message; await q("rollback to savepoint s1"); }
  ok("sınır aşımında aynı hata", /Çok hızlı işlem yapıyorsun/.test(hata ?? ""), hata ?? "hata yok");

  // ---------------- budama + cron
  const once = await bir(`select count(*) n from cron.job_run_details`);
  const kb2 = await bir(`select public.kayit_budama() r`);
  const sonra = await bir(`select count(*) n, count(*) filter (where end_time < now() - interval '6 hours') eski from cron.job_run_details`);
  ok("kayit_budama çalışır, 6 sa'ten eski kayıt kalmaz", Number(sonra.eski) === 0, `${once.n} → ${sonra.n} · ${JSON.stringify(kb2.r)}`);
  const jobSonra = await bir(`select jobid, command from cron.job where jobname='bildim-cron-kayit-budama'`);
  ok("budama işi aynı jobid, yeni komut", String(jobSonra.jobid) === String(jobOnce.jobid) && /kayit_budama/.test(jobSonra.command), JSON.stringify(jobSonra));
} catch (e) {
  kalan++;
  console.error("HATA:", e.message);
} finally {
  try { await q("rollback"); } catch { /* bağlantı düştüyse işlem zaten geri alındı */ }
  clearTimeout(bekci);
  await db.kapat?.();
}
console.log(`\n${gecen} geçti · ${kalan} kaldı (ROLLBACK)`);
process.exit(kalan ? 1 : 0);
