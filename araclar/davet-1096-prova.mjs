// 1096 provası: migration + senaryolar TEK transaction'da, sonunda ROLLBACK (canlıya kalıcı hiçbir şey yazılmaz).
// Sahte IP (203.0.113.x, belgelendirme bloğu) request.headers ile verilir; auth.uid() request.jwt.claims ile.
//   node araclar/davet-1096-prova.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };
const q = (s) => db.sorgu(s);
const hataMi = async (s) => {
  await q("savepoint s");
  try { await q(s); await q("release savepoint s"); return null; } catch (e) { await q("rollback to savepoint s"); return String(e?.message ?? e); }
};
const ip = (x) => q(`select set_config('request.headers', '{"cf-connecting-ip":"${x}"}', true)`);
const ben = (id) => q(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
const anon = () => q(`select set_config('request.jwt.claims', '{"role":"anon"}', true), set_config('role', 'anon', true)`);
const yonetici = () => q(`select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)`);

try {
  await q("begin");
  await q(fs.readFileSync("supabase/migrations/20260612001096_bekleyen_davet.sql", "utf8"));
  sonuc("migration çalıştı", true);
  const [a, b] = await q(`select id, davet_kodu from public.profiles where davet_kodu ~ '^[A-Z0-9]{8}$' and not coalesce(is_bot,false) order by created_at limit 2`);
  const [yeni] = await q(`select id from public.profiles where not coalesce(is_bot,false) and id not in ('${a.id}','${b.id}') order by created_at desc limit 1`);

  // Yetki
  await ben(yeni.id);
  sonuc("authenticated tabloyu okuyamaz", /permission denied/.test((await hataMi("select * from public.bekleyen_davet")) ?? ""));
  sonuc("iç yardımcı kapalı", /permission denied/.test((await hataMi("select public.davet_ip_ozet_ic()")) ?? ""));
  await anon();
  sonuc("anon bul çağıramaz", /permission denied/.test((await hataMi(`select * from public.davet_bekleyen_bul('ios')`)) ?? ""));
  sonuc("anon cevapla çağıramaz", /permission denied/.test((await hataMi(`select * from public.davet_bekleyen_cevapla(gen_random_uuid(), true)`)) ?? ""));
  sonuc("anon tabloyu okuyamaz", /permission denied/.test((await hataMi("select * from public.bekleyen_davet")) ?? ""));

  // Anon kayıt
  await q(`select set_config('request.headers', '{}', true)`);
  await q(`select public.davet_bekle_kaydet('arkadas', '${a.davet_kodu}', 'ios')`);           // başlık yok → yazmaz
  await ip("203.0.113.5");
  await q(`select public.davet_bekle_kaydet('arkadas', '${a.davet_kodu.toLowerCase()}', 'ios')`);
  await q(`select public.davet_bekle_kaydet('arkadas', '${a.davet_kodu}', 'ios')`);           // tekrar → yenileme
  await q(`select public.davet_bekle_kaydet('arkadas', 'YOKKOD99', 'ios')`);                   // bilinmeyen → sessiz
  await q(`select public.davet_bekle_kaydet('referans', 'uuid-degil', 'ios')`);                // bozuk → sessiz
  await yonetici();
  const satir = await q("select ip_ozet, cihaz, tur, kod from public.bekleyen_davet");
  sonuc("başlıksız/bilinmeyen/bozuk yazılmadı, tekrar tek satır", satir.length === 1, `satır=${satir.length}`);
  sonuc("ham IP yok (64 hex özet)", /^[0-9a-f]{64}$/.test(satir[0]?.ip_ozet ?? "") && !JSON.stringify(satir).includes("203.0.113"));

  // Girişli yeni hesap
  await ben(yeni.id); await ip("203.0.113.5");
  const bul = await q(`select * from public.davet_bekleyen_bul('ios')`);
  sonuc("aynı IP+cihaz → tek davet bulundu", bul.length === 1 && bul[0].tur === "arkadas");
  sonuc("başka cihaz tipi → yok", (await q(`select * from public.davet_bekleyen_bul('android')`)).length === 0);
  await ip("203.0.113.6");
  sonuc("başka IP → yok", (await q(`select * from public.davet_bekleyen_bul('ios')`)).length === 0);
  sonuc("başka IP ile cevaplanamaz", /bulunamadı/.test((await hataMi(`select * from public.davet_bekleyen_cevapla('${bul[0]?.id}', true)`)) ?? ""));

  // Davet eden kendisi
  await ben(a.id); await ip("203.0.113.5");
  sonuc("davet eden kendi davetini görmez", (await q(`select * from public.davet_bekleyen_bul('ios')`)).length === 0);

  // Paylaşılan IP: ikinci bekleyen → eşleştirme yok
  await anon();
  await q(`select public.davet_bekle_kaydet('referans', '${b.id}', 'ios')`);
  await ben(yeni.id);
  sonuc("aynı IP+cihazda 2 bekleyen → eşleştirme yok", (await q(`select * from public.davet_bekleyen_bul('ios')`)).length === 0);
  await yonetici();
  await q("delete from public.bekleyen_davet where tur = 'referans'");

  // Ret → tüketilir
  await ben(yeni.id); await ip("203.0.113.5");
  const ret = await q(`select * from public.davet_bekleyen_cevapla('${bul[0].id}', false)`);
  sonuc("ret → reddedildi", ret[0]?.durum === "reddedildi");
  sonuc("tüketilen davet tekrar cevaplanamaz", /bulunamadı/.test((await hataMi(`select * from public.davet_bekleyen_cevapla('${bul[0].id}', true)`)) ?? ""));
  sonuc("tüketilen davet artık bulunmaz", (await q(`select * from public.davet_bekleyen_bul('ios')`)).length === 0);

  // Kabul → mevcut arkadaşlık RPC'si
  await anon();
  await q(`select public.davet_bekle_kaydet('arkadas', '${a.davet_kodu}', 'ios')`);
  await ben(yeni.id);
  const bul2 = await q(`select * from public.davet_bekleyen_bul('ios')`);
  const kabulHata = await hataMi(`create temp table _k on commit drop as select * from public.davet_bekleyen_cevapla('${bul2[0]?.id}', true)`);
  const kabul = kabulHata ?? JSON.stringify(await q("select * from _k"));
  sonuc("kabul → arkadas_davet_kodu_ile_ekle sonucu döndü", /istek_gonderildi|arkadas_oldu|zaten_arkadas|gönderilemedi/.test(kabul), kabul.slice(0, 120));

  // Referans kabul → claim_referral
  await yonetici(); await q("delete from public.bekleyen_davet");
  await anon(); await q(`select public.davet_bekle_kaydet('referans', '${b.id}', 'ios')`);
  await ben(yeni.id);
  const bul3 = await q(`select * from public.davet_bekleyen_bul('ios')`);
  const refHata = await hataMi(`create temp table _r on commit drop as select * from public.davet_bekleyen_cevapla('${bul3[0]?.id}', true)`);
  const ref = refHata ?? JSON.stringify(await q("select * from _r"));
  sonuc("referans kabul → claim_referral sonucu döndü", /baglandi|baglanamadi/.test(ref), ref.slice(0, 120));

  // Hız sınırı (anon kayıt): saatte 10
  await yonetici(); await q("delete from public.bekleyen_davet");
  await ip("203.0.113.7");
  await q(`insert into public.bekleyen_davet (ip_ozet, cihaz, tur, davet_eden, kod) select public.davet_ip_ozet_ic(), 'android', 'arkadas', '${a.id}', 'X' from generate_series(1,10)`);
  await anon();
  sonuc("anon kayıt hız sınırı (10/saat)", /Çok fazla/.test((await hataMi(`select public.davet_bekle_kaydet('arkadas', '${a.davet_kodu}', 'ios')`)) ?? ""));
} catch (e) {
  hata++;
  console.error("✗ beklenmeyen:", e?.message ?? e);
} finally {
  try { await q("rollback"); } finally { await db.kapat(); }
}
console.log(hata ? `\n${hata} HATA (ROLLBACK edildi)` : "\nTÜMÜ GEÇTİ (ROLLBACK edildi)");
process.exit(hata ? 1 : 0);
