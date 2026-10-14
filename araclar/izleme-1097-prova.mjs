// 1097 provası: migration + senaryolar TEK transaction'da, sonunda ROLLBACK (canlıya kalıcı hiçbir şey yazılmaz).
// E-posta gönderilmez: izleme_uyari_kontrol yalnız eşik altında (erken dönüş) çağrılır.
//   node araclar/izleme-1097-prova.mjs
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
const ben = (id) => q(`select set_config('request.jwt.claims', '{"sub":"${id}","role":"authenticated"}', true), set_config('role', 'authenticated', true)`);
const anon = () => q(`select set_config('request.jwt.claims', '{"role":"anon"}', true), set_config('role', 'anon', true)`);
const yonetici = () => q(`select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)`);
const OT = "11111111-2222-4333-8444-555555555555";
const yaz = (hatalar, olaylar = []) =>
  q(`select public.istemci_kayit_yaz('${OT}', 'prova', 'ios', '${JSON.stringify(hatalar).replace(/'/g, "''")}'::jsonb, '${JSON.stringify(olaylar)}'::jsonb)`);

try {
  await q("begin");
  await q(fs.readFileSync("supabase/migrations/20260612001097_izleme_kaydi.sql", "utf8"));
  sonuc("migration çalıştı", true);

  const [sahip] = await q(`select (jsonb_array_elements_text(deger))::uuid as id from public.oyun_ayarlari where anahtar = 'sahip_kullanicilar' limit 1`);
  const [kisi] = await q(`select id from public.profiles where not coalesce(is_bot,false) and id <> '${sahip.id}' order by created_at desc limit 1`);

  // Yetki
  await anon();
  sonuc("anon yazamaz", /permission denied/.test((await hataMi(`select public.istemci_kayit_yaz('${OT}', null, null, '[]', '[]')`)) ?? ""));
  sonuc("anon tabloyu okuyamaz", /permission denied/.test((await hataMi("select * from public.istemci_hata")) ?? ""));
  sonuc("anon özet çağıramaz", /permission denied/.test((await hataMi("select public.izleme_ozeti()")) ?? ""));
  sonuc("anon saglik_ping = 1", (await q("select public.saglik_ping() as v"))[0]?.v === "1");
  await ben(kisi.id);
  sonuc("oyuncu doğrudan insert edemez", /permission denied/.test((await hataMi(`insert into public.istemci_hata (oturum_id, imza, tur, sayfa, mesaj) values ('${OT}','x','js','/','x')`)) ?? ""));
  sonuc("oyuncu uyarı kontrolünü çağıramaz", /permission denied/.test((await hataMi("select public.izleme_uyari_kontrol(true)")) ?? ""));
  sonuc("oyuncu özet çağıramaz", /yalnız sahibe/.test((await hataMi("select public.izleme_ozeti()")) ?? ""));

  // Yazma: tekrar ayıklama, temizlik, kota
  await yaz([
    { tur: "js", sayfa: "/duello?davet=ABC", mesaj: "TypeError: x is undefined a@b.com 1b4e28ba-2fa1-11d2-883f-0016d3cca427" },
    { tur: "js", sayfa: "/duello?davet=ABC", mesaj: "TypeError: x is undefined a@b.com 1b4e28ba-2fa1-11d2-883f-0016d3cca427" },
    { tur: "rpc", sayfa: "/kasa", mesaj: "kasa_karar 400" },
    { tur: "gecersiz", sayfa: "/", mesaj: "atılmalı" },
  ], [{ olay: "giris", anahtar: OT }, { olay: "kayit" }, { olay: "kurulum", anahtar: "c1" }]);
  await yaz([{ tur: "rpc", sayfa: "/kasa", mesaj: "kasa_karar 400" }]);   // aynı oturum aynı hata → yazılmaz
  await yonetici();
  let satir = await q(`select tur, sayfa, mesaj, cihaz, surum from public.istemci_hata where oturum_id = '${OT}' order by id`);
  sonuc("tekrar/geçersiz elendi (2 satır)", satir.length === 2, `satır=${satir.length}`);
  sonuc("sorgu dizgisi atıldı", satir[0]?.sayfa === "/duello", satir[0]?.sayfa);
  sonuc("e-posta ve UUID temizlendi", /\[e-posta\]/.test(satir[0]?.mesaj) && /\[kimlik\]/.test(satir[0]?.mesaj) && !/a@b\.com/.test(satir[0]?.mesaj));
  const olay = await q(`select olay from public.olay_kaydi where kullanici_id = '${kisi.id}' and olay <> 'kayit' order by olay`);
  sonuc("istemci 'kayit' yazamaz, giris+kurulum yazıldı", olay.map((o) => o.olay).join(",") === "giris,kurulum", olay.map((o) => o.olay).join(","));

  await ben(kisi.id);
  await yaz(Array.from({ length: 10 }, (_, i) => ({ tur: "js", sayfa: "/x", mesaj: `hata ${i}` })));
  await yonetici();
  const [{ n }] = await q(`select count(*) as n from public.istemci_hata where kullanici_id = '${kisi.id}'`);
  sonuc("dakikada en çok 5 hata", n === "5", `n=${n}`);

  // Kayıt tetikleyicisi (sahte auth kullanıcısı yok → profil ekleme yerine fonksiyonu doğrudan sına)
  const [kayitVar] = await q(`select count(*) as n from public.olay_kaydi where olay = 'kayit'`);
  sonuc("kayit tetikleyicisi kurulu", (await q(`select 1 from pg_trigger where tgname = 'trg_profiles_izleme_kayit'`)).length === 1, `mevcut kayit=${kayitVar.n}`);

  // Uyarı: eşik altında erken döner (e-posta yok)
  const [u] = await q(`select public.izleme_uyari_kontrol() as r`);
  sonuc("uyarı eşik altında gönderilmedi", JSON.parse(u.r).gonderildi === false, u.r);
  sonuc("cron işi kuruldu", (await q(`select 1 from cron.job where jobname = 'bildim-izleme-uyari' and schedule = '*/5 * * * *'`)).length === 1);

  // Sahip özeti
  await ben(sahip.id);
  const [oz] = await q(`select public.izleme_ozeti() as r`);
  const ozet = JSON.parse(oz.r);
  sonuc("sahip özeti okur", ozet.hata_24s >= 5 && Array.isArray(ozet.en_sik) && ozet.maclar.length === 5, `hata_24s=${ozet.hata_24s} sunucu_ms=${ozet.sunucu_ms}`);
  sonuc("sahip tabloyu okur (RLS)", (await q(`select count(*) as n from public.istemci_hata`))[0].n >= "1");
  await ben(kisi.id);
  sonuc("oyuncu RLS ile 0 satır görür", (await q(`select count(*) as n from public.istemci_hata`))[0].n === "0");

  // Budama
  await yonetici();
  const [b] = await q(`select public.kayit_budama() as r`);
  sonuc("kayit_budama yeni alanları döner", "istemci_hata" in JSON.parse(b.r), b.r);
} catch (e) {
  hata++;
  console.error("✗ prova durdu:", e?.message ?? e);
} finally {
  try { await q("rollback"); } finally { await db.kapat(); }
}
console.log(hata ? `\n${hata} başarısız` : "\nHepsi geçti (ROLLBACK edildi)");
process.exit(hata ? 1 : 0);
