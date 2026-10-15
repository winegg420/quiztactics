// Ida hesabını 15 Eki 04:10 UTC yedeğinden geri yükler — TEK İŞLEM. Varsayılan: prova (ROLLBACK). --uygula: COMMIT.
// Yalnız kapanıştaki satırlar eklenir (diğer oyuncuların mevcut satırlarına dokunulmaz); set-null olmuş başvurular yalnız
// hâlâ NULL ise eski değerine döner. Tetikleyiciler bu işlemde kapalı (replica) — kayıt/ödül tetikleyicileri yeniden çalışmasın.
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "../pg-mini.mjs";
const [girdi] = process.argv.slice(2);
const UYGULA = process.argv.includes("--uygula");
const IDA = "e4f6006f-d6bb-4ca8-be67-3bdf9efc9708";
const ATLA = new Set(["auth.refresh_tokens", "auth.sessions", "auth.mfa_amr_claims", "auth.one_time_tokens", "public.rpc_sayac"]);
const { tablolar, setNull, fk } = JSON.parse(fs.readFileSync(girdi, "utf8"));
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const s = async (q) => { const r = await db.sorgu(q); return r.satirlar ?? r.rows ?? r; };
const lit = (v) => (v === null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const id = (t) => t.split(".").map((x) => `"${x}"`).join(".");
let hata = 0;
const arr = (x) => Array.isArray(x) ? x : String(x).replace(/[{}]/g, "").split(",");
try {
  await s("begin");
  await s("set local session_replication_role = replica");
  const secilen = tablolar.filter((t) => !ATLA.has(t.tablo));
  let toplam = 0;
  const anahtarlar = new Map();   // tablo -> pk sütunları
  for (const t of secilen) {
    const kol = await s(`select a.attname, format_type(a.atttypid, a.atttypmod) tip, a.attgenerated g, a.attidentity i
      from pg_attribute a where a.attrelid = '${id(t.tablo)}'::regclass and a.attnum > 0 and not a.attisdropped`);
    const tip = new Map(kol.map((k) => [k.attname, k]));
    const cols = t.cols.filter((c) => tip.has(c) && !tip.get(c).g);
    const eksik = t.cols.filter((c) => !tip.has(c));
    if (eksik.length) console.log(`  ! ${t.tablo}: canlıda olmayan sütun atlandı ${eksik}`);
    const ovr = cols.some((c) => tip.get(c).i === "a") ? " overriding system value" : "";
    const pk = (await s(`select array_agg(a.attname order by k.o) c from pg_index i, unnest(i.indkey) with ordinality k(n,o)
      join pg_attribute a on a.attrelid = '${id(t.tablo)}'::regclass and a.attnum = k.n where i.indrelid = '${id(t.tablo)}'::regclass and i.indisprimary`))[0]?.c;
    anahtarlar.set(t.tablo, pk ? arr(pk) : null);
    for (let i = 0; i < t.rows.length; i += 200) {
      const parca = t.rows.slice(i, i + 200).map((r) => "(" + cols.map((c) => `${lit(r[t.cols.indexOf(c)])}::${tip.get(c).tip}`).join(",") + ")");
      await s(`insert into ${id(t.tablo)} (${cols.map((c) => `"${c}"`).join(",")})${ovr} values ${parca.join(",")}`);
    }
    toplam += t.rows.length;
  }
  console.log(`eklendi: ${secilen.length} tablo, ${toplam} satır`);
  // set-null başvurular (kapanışta olmayan satırlar): yalnız hâlâ NULL ise
  const kapanis = new Map(secilen.map((t) => [t.tablo, t]));
  let gunc = 0;
  for (const x of setNull) {
    if (x.tip !== "n") continue;
    const pk = anahtarlar.get(x.tablo) ?? arr((await s(`select array_agg(a.attname order by k.o) c from pg_index i, unnest(i.indkey) with ordinality k(n,o)
      join pg_attribute a on a.attrelid = '${id(x.tablo)}'::regclass and a.attnum = k.n where i.indrelid = '${id(x.tablo)}'::regclass and i.indisprimary`))[0].c);
    const t = kapanis.get(x.tablo);
    if (t && t.rows.some((r) => pk.every((c) => r[t.cols.indexOf(c)] === x.satir[c]))) continue;   // satır zaten eklendi
    const r = await s(`update ${id(x.tablo)} set ${x.cols.map((c) => `"${c}" = ${lit(x.satir[c])}`).join(", ")}
      where ${pk.map((c) => `"${c}"::text = ${lit(x.satir[c])}`).join(" and ")} and ${x.cols.map((c) => `"${c}" is null`).join(" and ")} returning 1`);
    gunc += r.length;
    console.log(`  set-null geri: ${x.tablo}.${x.cols} → ${r.length} satır`);
  }
  // no action (a) başvurular kapanışta olmalı
  const aSay = setNull.filter((x) => x.tip !== "n").filter((x) => { const t = kapanis.get(x.tablo); const pk = anahtarlar.get(x.tablo); return !(t && pk && t.rows.some((r) => pk.every((c) => r[t.cols.indexOf(c)] === x.satir[c]))); }).length;
  console.log(`set-null güncellenen ${gunc} · kapanış dışı no-action başvuru ${aSay}`);
  if (aSay) hata++;
  // FK doğrulaması: geri yüklenen tablolara dokunan her kısıt (tetikleyiciler kapalıyken atlanan denetim)
  const ilgili = new Set(secilen.map((t) => t.tablo));
  let ihlal = 0;
  for (const f of fk.filter((f) => ilgili.has(f.cocuk) || ilgili.has(f.ebeveyn))) {
    const cc = arr(f.ccols), pc = arr(f.pcols);
    const [{ n }] = await s(`select count(*)::int n from ${id(f.cocuk)} c where ${cc.map((c) => `c."${c}" is not null`).join(" and ")}
      and not exists (select 1 from ${id(f.ebeveyn)} p where ${cc.map((c, k) => `p."${pc[k]}" = c."${c}"`).join(" and ")})`);
    if (Number(n)) { ihlal += Number(n); console.log(`  ✗ FK ${f.conname} (${f.cocuk} → ${f.ebeveyn}): ${n} satır`); }
  }
  console.log(`FK ihlali: ${ihlal}`);
  if (ihlal) hata++;
  const [p] = await s(`select p.id, p.takma_ad, p.coin, p.xp, p.level, p.hile_yetkisi, u.email, (select count(*) from auth.identities where user_id = u.id) kimlik,
    (select string_agg(provider, ',') from auth.identities where user_id = u.id) yontem, (select count(*) from friendships where '${IDA}' in (requester::text, addressee::text)) arkadas
    from profiles p join auth.users u on u.id = p.id where p.id = '${IDA}'`);
  console.log("profil:", JSON.stringify(p));
} catch (e) { console.log("HATA", e.message.slice(0, 400)); hata++; }
finally {
  if (UYGULA && !hata) { await s("commit"); console.log("COMMIT — uygulandı"); }
  else { await s("rollback").catch(() => {}); console.log(UYGULA ? "hata var → ROLLBACK" : "prova → ROLLBACK"); }
  await db.kapat?.();
}
process.exit(hata ? 1 : 0);
