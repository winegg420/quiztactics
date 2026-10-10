// Grup maçı kilit testi (1056): A bağlantısı maç satırını N sn kilitli tutar; B aynı anda
// grup_mac_nabiz / advance_group_match (ve klasik için mac_nabiz / advance_match) çağırır.
// B'nin süresi ölçülür. Her şey B'nin işleminde ROLLBACK edilir; canlıya kalıcı yazı yok.
// Kullanım: node araclar/grup-kilit-testi.mjs <grup_mac_id> <oyuncu_id> [klasik_mac_id klasik_oyuncu] [--sn=6]
import { PgIstemci, baglantiDizgisi, alintila } from "./pg-mini.mjs";

const arg = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const sn = Number((process.argv.find((x) => x.startsWith("--sn=")) || "--sn=6").slice(5));
const [grupId, grupOyuncu, klasikId, klasikOyuncu] = arg;
const dizgi = await baglantiDizgisi();

async function olc(tablo, id, oyuncu, cagri) {
  const A = await new PgIstemci(dizgi).baglan();
  const B = await new PgIstemci(dizgi).baglan();
  try {
    await A.sorgu("begin");
    await A.sorgu(`select 1 from public.${tablo} where id = ${alintila(id)} for update`);
    const birak = new Promise((r) => setTimeout(async () => { await A.sorgu("rollback"); r(); }, sn * 1000));
    await B.sorgu("begin");
    await B.sorgu("set local role authenticated");
    await B.sorgu("set local statement_timeout = '8s'");
    await B.sorgu(`select set_config('request.jwt.claims', ${alintila(JSON.stringify({ sub: oyuncu, role: "authenticated" }))}, true)`);
    const t0 = Date.now();
    let sonuc;
    try { const r = await B.sorgu(cagri); sonuc = "200 " + JSON.stringify((r.rows ?? r)[0] ?? {}).slice(0, 80); }
    catch (e) { sonuc = "HATA " + e.message.slice(0, 80); }
    const ms = Date.now() - t0;
    await B.sorgu("rollback").catch(() => {});
    await birak;
    console.log(`${cagri.slice(7, 60).padEnd(54)} ${String(ms).padStart(5)} ms  ${sonuc}`);
  } finally { await A.kapat?.(); await B.kapat?.(); }
}

console.log(`Satır ${sn} sn kilitli tutulurken B çağrısının süresi:`);
await olc("group_matches", grupId, grupOyuncu, `select durum, basladi from public.grup_mac_nabiz(${alintila(grupId)}, false)`);
await olc("group_matches", grupId, grupOyuncu, `select public.advance_group_match(${alintila(grupId)})`);
if (klasikId) {
  await olc("matches", klasikId, klasikOyuncu, `select durum, basladi from public.mac_nabiz(${alintila(klasikId)}, false)`);
  await olc("matches", klasikId, klasikOyuncu, `select public.advance_match(${alintila(klasikId)})`);
}
process.exit(0);
