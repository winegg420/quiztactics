// Dış bekçi (UptimeRobot) için girişsiz sağlık adresi — Paket 4 (14 Eki 2026, migration 1097).
//   GET https://quiztactics.com/api/saglik → 200 {"durum":"ok","db_ms":N} | 503 {"durum":"hata",...}
// Veritabanında yalnız `select 1` (public.saglik_ping, anon). Yanıt CDN'de 30 sn önbelleklenir:
// adres ne kadar sık çağrılırsa çağrılsın veritabanına en çok ~30 sn'de bir istek gider.
const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  const t0 = Date.now();
  try {
    if (!URL_ || !ANON) throw new Error("yapılandırma eksik");
    const yanit = await fetch(`${URL_}/rest/v1/rpc/saglik_ping`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    const govde = await yanit.text();
    if (!yanit.ok || govde.trim() !== "1") throw new Error(`veritabanı ${yanit.status}`);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.status(200).json({ durum: "ok", db_ms: Date.now() - t0 });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(503).json({ durum: "hata", neden: String(e?.message ?? e).slice(0, 80), db_ms: Date.now() - t0 });
  }
}
