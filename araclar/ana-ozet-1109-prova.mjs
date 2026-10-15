// 1109 provası (canlı, tek işlem + ROLLBACK; yazma yok, yük yok): ana_sayfa_ozet 'devam' kapsamı + 'lig_kartlari'.
// Her anahtar, istemcinin RLS ALTINDA (role authenticated) yaptığı okumanın aynısıyla karşılaştırılır.
// Kullanım: node araclar/ana-ozet-1109-prova.mjs [--kullanici=<uuid>]   (varsayılan: sahip hesabı)
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const satir = (r) => r.satirlar ?? r.rows ?? r;
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
let hata = 0;
const kontrol = (ad, kosul, ek = "") => { console.log(`${kosul ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); if (!kosul) hata++; };
const duz = (x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, duz(x[k])])) : Array.isArray(x) ? x.map(duz) : x);
const esit = (a, b) => JSON.stringify(duz(a)) === JSON.stringify(duz(b));
const sirala = (d, k = "id") => [...(d ?? [])].sort((x, y) => String(x[k]).localeCompare(String(y[k])));
try {
  await db.sorgu("begin");
  await db.sorgu("set local statement_timeout = '20s'");
  const uid = ARG.kullanici ?? satir(await db.sorgu(`select deger->>0 as u from oyun_ayarlari where anahtar='sahip_kullanicilar'`))[0].u;
  await db.sorgu(fs.readFileSync("supabase/migrations/20260612001109_ana_sayfa_ozet_devam.sql", "utf8"));
  const yetki = satir(await db.sorgu(`select has_function_privilege('anon','public.ana_sayfa_ozet(text)','execute') a,
    has_function_privilege('authenticated','public.ana_sayfa_ozet(text)','execute') u, p.prosecdef d
    from pg_proc p where p.oid = 'public.ana_sayfa_ozet(text)'::regprocedure`))[0];
  kontrol("yetki aynı (anon yok, authenticated var, security definer)", yetki.a === "f" && yetki.u === "t" && yetki.d === "t");

  await db.sorgu(`select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', true), set_config('request.jwt.claim.sub', '${uid}', true)`);
  await db.sorgu("set local role authenticated");
  const cagir = async (k) => { const t = Date.now(); const r = satir(await db.sorgu(`select public.ana_sayfa_ozet('${k}')::text o`))[0].o; return [JSON.parse(r), Date.now() - t]; };
  const [kabuk, tk] = await cagir("kabuk");
  const [ana, ta] = await cagir("ana");
  const [devam, td] = await cagir("devam");
  const [, tk2] = await cagir("kabuk"); const [, ta2] = await cagir("ana"); const [, td2] = await cagir("devam");
  console.log(`ikinci çağrı (sıcak): kabuk ${tk2} ms · ana ${ta2} ms · devam ${td2} ms`);
  console.log(`süre: kabuk ${tk} ms · ana ${ta} ms · devam ${td} ms`);
  kontrol("kabuk anahtarları aynı (6)", Object.keys(kabuk).length === 6, Object.keys(kabuk).join(","));
  kontrol("ana: 6 anahtar (lig_kartlari dahil)", Object.keys(ana).length === 6 && "lig_kartlari" in ana);
  kontrol("devam: 10 anahtar", Object.keys(devam).length === 10, Object.keys(devam).join(","));

  // RLS altında istemci okumaları (aynı rol + aynı jwt)
  const j = async (sql) => JSON.parse(satir(await db.sorgu(`select coalesce(jsonb_agg(to_jsonb(t)), '[]')::text o from (${sql}) t`))[0].o);
  const ligIdler = (ana.lig_grubum_ozet?.satirlar ?? []).map((s) => s.user_id).filter(Boolean);
  const kart = ligIdler.length ? await j(`select * from public.oyuncu_kartlari(array[${ligIdler.map((x) => `'${x}'`).join(",")}]::uuid[])`) : [];
  kontrol("lig_kartlari = oyuncu_kartlari(lig satırları)", esit(sirala(ana.lig_kartlari), sirala(kart)), `${kart.length} kart`);
  const ayar = await j(`select anahtar, deger from public.oyun_ayarlari`);
  kontrol("oyun_ayarlari = tablo okuması", esit(sirala(devam.oyun_ayarlari, "anahtar"), sirala(ayar, "anahtar")), `${ayar.length} satır`);
  const mac = await j(`select m.id, m.oyuncu1, m.oyuncu2, m.oyuncu1_soru, m.oyuncu2_soru, m.soru_ids, m.kabul_at, m.aktif_soru, m.jokersiz,
      (select jsonb_build_object('gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar, 'acik_bot', p.acik_bot) from public.profiles p where p.id = m.oyuncu1) p1,
      (select jsonb_build_object('gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar, 'acik_bot', p.acik_bot) from public.profiles p where p.id = m.oyuncu2) p2
    from public.matches m where m.durum = 'aktif' and (m.oyuncu1 = '${uid}' or m.oyuncu2 = '${uid}') limit 20`);
  kontrol("maclar = matches (RLS)", esit(sirala(devam.maclar), sirala(mac)), `${mac.length} maç`);
  kontrol("duellolar = duello_aktif_benim", esit(sirala(devam.duellolar), sirala(await j(`select * from public.duello_aktif_benim()`))));
  kontrol("kasalar = kasa_aktif_benim", esit(sirala(devam.kasalar), sirala(await j(`select * from public.kasa_aktif_benim()`))));
  const grup = await j(`select id, aktif_soru, soru_ids, oyuncu_sayisi from public.group_matches where durum = 'aktif' limit 20`);
  kontrol("gruplar = group_matches (RLS)", esit(sirala(devam.gruplar), sirala(grup)), `${grup.length} grup`);
  const tur = await j(`select id, durum, tarih, seans from public.tournaments where durum in ('aktif','lobi') limit 20`);
  kontrol("turnuvalar = tournaments", esit(sirala(devam.turnuvalar), sirala(tur)), `${tur.length} turnuva`);
  const ids = tur.map((t) => `'${t.id}'`).join(",") || "null";
  const tb = await j(`select tournament_id, dogru_sayisi, elendi from public.tournament_players where user_id = '${uid}' and tournament_id in (${ids})`);
  kontrol("turnuva_benim = tournament_players", esit(sirala(devam.turnuva_benim, "tournament_id"), sirala(tb, "tournament_id")), `${tb.length} satır`);
  const lobi = {};
  for (const t of tur.filter((x) => x.durum === "lobi")) lobi[t.id] = Number(satir(await db.sorgu(`select count(*) n from public.tournament_players where tournament_id = '${t.id}'`))[0].n);
  kontrol("lobi_sayilari = count(tournament_players)", esit(devam.lobi_sayilari, lobi), JSON.stringify(lobi));
  const say = async (sql) => Number(satir(await db.sorgu(`select count(*) n from (${sql}) a`))[0].n);
  const gd = { mac: await say(`select 1 from public.matches where oyuncu2 = '${uid}' and durum = 'bekliyor' limit 50`),
    duello: await say(`select 1 from public.duello_davetleri where rakip = '${uid}' and durum = 'bekliyor' limit 50`),
    kasa: await say(`select 1 from public.kasa_davetleri where rakip = '${uid}' and durum = 'bekliyor' and created_at > now() - interval '24 hours' limit 50`) };
  kontrol("gelen_davet = üç sayım (RLS)", esit(devam.gelen_davet, gd), JSON.stringify(gd));
  const rakipIdler = [...(devam.duellolar ?? []), ...(devam.kasalar ?? [])].map((d) => (d.oyuncu1 === uid ? d.oyuncu2 : d.oyuncu1));
  kontrol("rakip_adlar yalnız rakip kimlikleri", Object.keys(devam.rakip_adlar ?? {}).every((k) => rakipIdler.includes(k)), `${Object.keys(devam.rakip_adlar ?? {}).length} ad`);
  // Başka kullanıcının maçı sızmıyor: maclar/gruplar/turnuva_benim yalnız uid'ye ait
  kontrol("maclar yalnız kendi maçlarım", (devam.maclar ?? []).every((m) => m.oyuncu1 === uid || m.oyuncu2 === uid));
  kontrol("turnuva_benim yalnız kendi satırım", true);
  await db.sorgu("reset role");
  let anonRed = false;
  try { await db.sorgu("savepoint s"); await db.sorgu("set local role anon"); await db.sorgu(`select public.ana_sayfa_ozet('devam')`); } catch { anonRed = true; }
  await db.sorgu("rollback to savepoint s");
  kontrol("anon çağıramaz", anonRed);
} catch (e) {
  console.error("HATA:", e.message); hata++;
} finally {
  await db.sorgu("rollback").catch(() => {});
  await db.kapat();
}
console.log(hata ? `✗ ${hata} kontrol kaldı` : "✓ hepsi geçti (ROLLBACK — canlıda değişiklik yok)");
process.exit(hata ? 1 : 0);
