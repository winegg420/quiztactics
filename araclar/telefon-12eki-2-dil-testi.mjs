// Telefon denetimi 2 (12 Eki 2026), madde 3 — kozmetik/rozet adı arayüz diline göre (x-arayuz-dil, migration 1079).
// Kayıtlı dili TR olan misafir ARAÇ hesabı; aynı RPC'ler başlıksız (→ kayıtlı dil) ve 'en'/'tr' başlıkla çağrılır.
// Canlı tek seferlik duman (~12 istek), hesap sonunda silinir. Kullanım: node araclar/telefon-12eki-2-dil-testi.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l.includes("="))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
const s = await fetch(`${URL_}/auth/v1/signup`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ data: { dil: "tr", arac: true } }) }).then((r) => r.json());
const T = s.access_token;
const rpc = async (ad, dil) => {
  const h = { apikey: KEY, Authorization: `Bearer ${T}`, "Content-Type": "application/json" };
  if (dil) h["x-arayuz-dil"] = dil;
  const r = await fetch(`${URL_}/rest/v1/rpc/${ad}`, { method: "POST", headers: h, body: "{}" });
  return r.json();
};
let hata = 0;
try {
  const ad = (liste, k) => (Array.isArray(liste) ? liste : []).find((x) => x.anahtar === k)?.ad;
  for (const [fn, k, tr, en] of [["cerceve_katalogu", "lig_bronz", "Bronz Lig", "Bronze League"], ["aura_katalogu", null, null, null], ["kozmetik_katalogu", null, null, null]]) {
    const [yok, e, t] = [await rpc(fn), await rpc(fn, "en"), await rpc(fn, "tr")];
    const anahtar = k ?? (Array.isArray(e) && e.find((x) => x.ad_en && x.ad_tr && x.ad_en !== x.ad_tr)?.anahtar);
    const [a0, a1, a2] = [ad(yok, anahtar), ad(e, anahtar), ad(t, anahtar)];
    const beklenenEn = en ?? e.find((x) => x.anahtar === anahtar)?.ad_en, beklenenTr = tr ?? e.find((x) => x.anahtar === anahtar)?.ad_tr;
    const gecti = a0 === beklenenTr && a1 === beklenenEn && a2 === beklenenTr;
    if (!gecti) hata++;
    console.log(gecti ? "GEÇTİ" : "KALDI", fn, anahtar, "| başlıksız:", a0, "| en:", a1, "| tr:", a2);
  }
  const r0 = await rpc("rozetlerim"), r1 = await rpc("rozetlerim", "en");
  const g = (r1?.rozetler ?? []).find((x) => x.ad);
  const g0 = (r0?.rozetler ?? []).find((x) => x.anahtar === g?.anahtar);
  console.log(g && g0 && g.ad !== g0.ad ? "GEÇTİ" : "BİLGİ", "rozetlerim", g?.anahtar, "| başlıksız:", g0?.ad, "| en:", g?.ad);
} finally {
  console.log("hesap silindi:", (await fetch(`${URL_}/rest/v1/rpc/hesabimi_sil`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${T}`, "Content-Type": "application/json" }, body: "{}" })).ok);
}
process.exit(hata ? 1 : 0);
