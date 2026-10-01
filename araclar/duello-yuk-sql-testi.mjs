// 830/831 (cron boşta-çık + dinamik aralık) SQL provası — her bölüm `begin … rollback` içinde.
// Canlı veriye yazılmaz: migration'lar, sahte düello satırı ve cron.alter_job değişiklikleri
// transaction geri alınınca kaybolur. Yük testi YOK; yalnız birkaç hafif sorgu.
//
// İKİ BÖLÜM (kasıtlı): A bölümü yalnız fonksiyonları kurar (tablo kilidi almaz; ikinci oturum kilit
// bekleyebilir). B bölümü tetikleyicileri kurar (kısa tablo kilidi) ve ikinci oturum KULLANMAZ —
// ilk sürümde DDL kilidi + ikinci oturumun advisory kilit beklemesi canlı cron işlerini birkaç dakika
// birbirine bekletti. Her işlemde idle_in_transaction / lock_timeout güvenceleri var.
// Kullanım: node araclar/duello-yuk-sql-testi.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const dizgi = await baglantiDizgisi();
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad, ek); } else { kaldi++; console.log("  ✗", ad, ek); } };
const dosya = (n) => fs.readFileSync(new URL(`../supabase/migrations/${n}`, import.meta.url), "utf8");
const M830 = dosya("20260612000830_cron_bosta_cik_dinamik_aralik.sql");
const M831 = dosya("20260612000831_cron_sarmalayicilari_bagla.sql");
const ISARET = "-- ───── 3) Uyandırma tetikleyicileri ─────";
const M830_FONKSIYONLAR = M830.slice(0, M830.indexOf(ISARET));
if (!M830.includes(ISARET)) throw new Error("830'da bölüm işareti bulunamadı");

const db = await new PgIstemci(dizgi).baglan();
const tek = (s) => db.tek(s);
const aralik = (isim) => tek(`select schedule from cron.job where jobname = '${isim}'`);
const komut = (isim) => tek(`select command from cron.job where jobname = '${isim}'`);
const botlar = async () => (await db.sorgu("select id from profiles where is_bot order by id limit 2")).map((r) => r.id);

async function islem(ad, govde) {
  console.log(`\n══ ${ad}`);
  try {
    await db.sorgu("begin");
    await db.sorgu("set local lock_timeout = '5s'");
    await db.sorgu("set local statement_timeout = '30s'");
    await db.sorgu("set local idle_in_transaction_session_timeout = '40s'");
    await govde();
  } catch (e) {
    kaldi++; console.log("  ✗ HATA:", e.message);
  } finally {
    try { await db.sorgu("rollback"); } catch { /* işlem zaten bitmiş olabilir */ }
  }
}

try {
  const canli = await tek(`select (select count(*) from duellolar where durum='aktif') + (select count(*) from matches where durum in ('aktif','bekliyor')) + (select count(*) from tournaments where durum='aktif') + (select count(*) from group_matches where durum in ('bekliyor','aktif')) + (select count(*) from hizli_maclar where durum in ('bekliyor','aktif'))`);
  if (canli !== "0") { console.log("Canlıda aktif iş var (" + canli + ") — prova atlandı."); process.exit(0); }

  // ───────── A: fonksiyonlar + 831 (tablo kilidi yok) ─────────
  await islem("A) Sarmalayıcılar ve 831 bağlaması", async () => {
    {
      await db.sorguCoklu(M830_FONKSIYONLAR);
      await db.sorguCoklu(M831);

      console.log("▶ 831: komutlar bağlandı");
      ok("duello_tik komutu sarmalayıcı", (await komut("duello_tik")) === "select public.cron_duello_tik()");
      ok("bot-oyna komutu sarmalayıcı", (await komut("bildim-bot-oyna")) === "select public.cron_bot_oyna()");
      ok("turnuva-zamanlayici komutu sarmalayıcı", (await komut("bildim-turnuva-zamanlayici")) === "select public.cron_turnuva_zamanlayici_tik()");
      ok("bot-turnuva-tik komutu sarmalayıcı", (await komut("bildim-bot-turnuva-tik")) === "select public.cron_bot_turnuva_katilim_tik()");
      ok("sezon-tik komutu sarmalayıcı", (await komut("bildim-sezon-tik")) === "select public.cron_sezon_tik()");
      ok("zamanlama değişmedi (2 seconds)", (await aralik("duello_tik")) === "2 seconds" && (await aralik("bildim-bot-oyna")) === "2 seconds");

      console.log("▶ Boş durum: hemen çık + aralık 15 sn");
      let t0 = Date.now();
      ok("cron_duello_tik() = 0", (await tek("select public.cron_duello_tik()")) === "0", `(${Date.now() - t0} ms)`);
      ok("duello_tik aralığı 15 seconds", (await aralik("duello_tik")) === "15 seconds");
      await db.sorgu("select public.cron_bot_oyna()");
      ok("bot-oyna aralığı 15 seconds", (await aralik("bildim-bot-oyna")) === "15 seconds");
      ok("turnuva zamanlayıcı boşta 0", (await tek("select public.cron_turnuva_zamanlayici_tik()")) === "0");
      const sezonOnce = await tek("select count(*) from sezonlar");
      await db.sorgu("select public.cron_sezon_tik()");
      ok("sezon tiki hatasız, sezon sayısı aynı", (await tek("select count(*) from sezonlar")) === sezonOnce);

      console.log("▶ Bot turnuva katılımı: çıktı asıl fonksiyonla aynı");
      await db.sorgu("savepoint a");
      const n1 = await tek("select public.cron_bot_turnuva_katilim_tik()");
      await db.sorgu("rollback to a");
      const n2 = await tek("select public.bot_turnuva_katilim_tik()");
      ok("cron_bot_turnuva_katilim_tik() = bot_turnuva_katilim_tik()", n1 === n2, `(${n1} = ${n2})`);
      await db.sorgu("rollback to a");

      console.log("▶ Aktif düello: iş varken asıl fonksiyonla aynı çıktı, aralık 2 sn");
      const [b1, b2] = await botlar();
      const duello = await tek(`insert into duellolar (oyuncu1, oyuncu2, durum) values ('${b1}', '${b2}', 'aktif') returning id`);
      ok("sahte düello eklendi", Boolean(duello));
      await db.sorgu("savepoint b");
      const s1 = await tek("select public.cron_duello_tik()");
      await db.sorgu("rollback to b");
      const s2 = await tek("select public.duello_tik_hepsi()");
      ok("cron_duello_tik() = duello_tik_hepsi()", s1 === s2, `(${s1} = ${s2})`);
      await db.sorgu("rollback to b");
      await db.sorgu("select public.cron_duello_tik()");
      ok("iş varken aralık 2 seconds", (await aralik("duello_tik")) === "2 seconds");

      console.log("▶ Savunma: izinsiz iş adı değişmez, istemci rolü çağıramaz");
      await db.sorgu("select public.cron_aralik_ayarla('bildim-seri-kontrol', '2 seconds')");
      ok("izinsiz iş adı reddedildi", (await tek("select schedule from cron.job where jobname='bildim-seri-kontrol'")) === "5 21 * * *");
      ok("istemci rolü sarmalayıcıyı çağıramaz", (await tek("select has_function_privilege('authenticated','public.cron_aralik_ayarla(text,text)','execute') or has_function_privilege('anon','public.cron_duello_tik()','execute') or has_function_privilege('authenticated','public.cron_duello_tik()','execute')")) === "f");
    }
  });

  // ───────── B: tetikleyiciler (kısa tablo kilidi; ikinci oturum yok) ─────────
  await islem("B) Uyandırma tetikleyicileri", async () => {
    await db.sorguCoklu(M830);
    const [b1, b2] = await botlar();
    ok("başlangıçta 2 seconds", (await aralik("duello_tik")) === "2 seconds");
    await db.sorgu("select public.cron_aralik_ayarla('duello_tik', '15 seconds'), public.cron_aralik_ayarla('bildim-bot-oyna', '15 seconds')");
    ok("elle 15 seconds yapıldı", (await aralik("duello_tik")) === "15 seconds");
    const duello = await tek(`insert into duellolar (oyuncu1, oyuncu2, durum) values ('${b1}', '${b2}', 'aktif') returning id`);
    ok("düello insert → duello_tik 2 seconds", (await aralik("duello_tik")) === "2 seconds");
    ok("düello insert bot-oyna'ya DOKUNMAZ", (await aralik("bildim-bot-oyna")) === "15 seconds");
    await db.sorgu(`update duellolar set durum = 'bitti', bitis = now() where id = '${duello}'`);
    await db.sorgu("select public.cron_aralik_ayarla('duello_tik', '15 seconds')");
    await db.sorgu(`update duellolar set son_hareket = now() where id = '${duello}'`);
    ok("ilgisiz güncelleme aralığı değiştirmez", (await aralik("duello_tik")) === "15 seconds");
    await db.sorgu(`update duellolar set rovans_isteyen = '${b2}', rovans_at = now() where id = '${duello}'`);
    ok("rövanş isteği → duello_tik 2 seconds", (await aralik("duello_tik")) === "2 seconds");

    // Klasik maç: bekliyor satırı doğunca bot-oyna 2 sn'ye döner.
    await db.sorgu("select public.cron_aralik_ayarla('bildim-bot-oyna', '15 seconds')");
    await db.sorgu(`insert into matches (oyuncu1, oyuncu2, durum) values ('${b1}', '${b2}', 'bekliyor')`);
    ok("klasik maç (bekliyor) insert → bot-oyna 2 seconds", (await aralik("bildim-bot-oyna")) === "2 seconds");
  });

  // ───────── C: çakışma (kilitler ÖNCE ikinci oturumda alınır — xact kilidi işlem bitene dek tutulur) ─────────
  await islem("C) Çakışma: ikinci koşu hemen çıkar", async () => {
    const db2 = await new PgIstemci(dizgi).baglan();
    try {
      await db2.sorgu("set lock_timeout = '5s'");
      await db.sorguCoklu(M830_FONKSIYONLAR);
      const [b1, b2] = await botlar();
      await tek(`insert into duellolar (oyuncu1, oyuncu2, durum) values ('${b1}', '${b2}', 'aktif') returning id`);
      await db2.sorgu("select pg_advisory_lock(hashtext('duello_tik_hepsi')), pg_advisory_lock(hashtext('cron_turnuva_zamanlayici_tik')), pg_advisory_lock(hashtext('cron_bot_turnuva_katilim_tik')), pg_advisory_lock(hashtext('quiztactics:sezon_tik'))");
      let t0 = Date.now();
      const kilitli = await tek("select public.cron_duello_tik()");
      ok("duello (aktif düello VAR): kilitliyken 0 ve hızlı", kilitli === "0" && Date.now() - t0 < 1500, `(${Date.now() - t0} ms)`);
      t0 = Date.now();
      const k2 = await tek("select public.cron_turnuva_zamanlayici_tik()");
      const k3 = await tek("select public.cron_bot_turnuva_katilim_tik()");
      await db.sorgu("select public.cron_sezon_tik()");
      ok("turnuva/bot katılım/sezon: kilitliyken hemen çıktı", k2 === "0" && k3 === "0" && Date.now() - t0 < 1500, `(${Date.now() - t0} ms)`);
    } finally {
      try { await db2.sorgu("select pg_advisory_unlock_all()"); } catch { /* bağlantı kapanıyor */ }
      await db2.kapat();
    }
  });
} finally {
  try {
    console.log("\n══ Geri alma doğrulaması (canlıya hiçbir şey yazılmadı)");
    ok("duello_tik zamanlaması değişmedi", (await aralik("duello_tik")) === "2 seconds");
    ok("bot-oyna zamanlaması değişmedi", (await aralik("bildim-bot-oyna")) === "2 seconds");
    ok("duello_tik komutu eski", (await komut("duello_tik")) === "select public.duello_tik_hepsi()");
    ok("sarmalayıcı fonksiyon canlıda YOK", (await tek("select count(*) from pg_proc where proname like 'cron\\_%' and pronamespace = 'public'::regnamespace")) === "0");
    ok("tetikleyici canlıda YOK", (await tek("select count(*) from pg_trigger where tgname like 'trg\\_cron\\_hizlan%'")) === "0");
    ok("sahte düello yok", (await tek("select count(*) from duellolar where created_at > now() - interval '10 minutes'")) === "0");
  } catch (e) { kaldi++; console.log("  ✗ doğrulama hatası:", e.message); }
  await db.kapat();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
}
