// Telefon denetimi 2 (12 Eki 2026), madde 2 — bildirim metinlerinde emoji yok. Canlı tek seferlik duman:
// iki misafir ARAÇ hesabı; B, A'nın davet koduyla gelir → A'ya sunucu bildirimi (bildirim_anahtarla) üretilir.
// A'nın bildirim satırı + push şablonlarının (push_metni, iki dil) çıktısı emoji için taranır. Hesaplar silinir.
// Kullanım: node araclar/telefon-12eki-2-bildirim-testi.mjs
import fs from "node:fs";
import { PgIstemci, baglantiDizgisi } from "./pg-mini.mjs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l.includes("="))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}]/u;

async function misafir() {
  const r = await fetch(`${URL_}/auth/v1/signup`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { dil: "tr", arac: true } }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("misafir açılamadı");
  return { id: j.user.id, t: j.access_token };
}
async function rpc(h, ad, govde = {}) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${ad}`, { method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${h.t}`, "Content-Type": "application/json" }, body: JSON.stringify(govde) });
  const m = await r.text(); try { return { ok: r.ok, veri: JSON.parse(m) }; } catch { return { ok: r.ok, veri: null }; }
}
let A, B, hata = 0;
try {
  A = await misafir(); B = await misafir();
  const kod = (await rpc(A, "davet_kodum")).veri;
  const k = typeof kod === "string" ? kod : kod?.kod ?? kod?.davet_kodu;
  const r = await rpc(B, "arkadas_davet_kodu_ile_ekle", { p_kod: k });
  console.log("davet kodu ile ekle:", r.ok, JSON.stringify(r.veri));
  const b = await fetch(`${URL_}/rest/v1/bildirimler?user_id=eq.${A.id}&select=tip,metin`, { headers: { apikey: KEY, Authorization: `Bearer ${A.t}` } }).then((x) => x.json());
  console.log("A'nın bildirimleri:", JSON.stringify(b));
  if (!Array.isArray(b) || !b.length) { console.log("KALDI · bildirim üretilmedi"); hata++; }
  for (const x of b ?? []) if (EMOJI.test(x.metin)) { console.log("KALDI · emoji:", x.metin); hata++; }
  // Bütün push şablonlarının işlenmiş çıktısı (başlık + gövde, tr/en) — salt okuma
  const dizgi = await baglantiDizgisi();
  if (!dizgi) { console.log("push şablon taraması atlandı (canlı test kilidi; IZIN_CANLI_TEST=1 ile tek sefer)"); throw null; }
  const db = await new PgIstemci(dizgi).baglan();
  const sablon = await db.sorgu(`select m.anahtar, d.dil, (public.push_metni(m.anahtar, d.dil, '["Ada","3","7","5"]'::jsonb)).* from (select distinct anahtar from public.push_metinleri where anahtar not like 'terim:%') m cross join (values ('tr'),('en')) d(dil)`);
  const emojili = sablon.filter((s) => EMOJI.test(s.baslik ?? "") || EMOJI.test(s.govde ?? ""));
  console.log(`push şablonu: ${sablon.length} çıktı, emojili ${emojili.length}`, emojili.slice(0, 3));
  console.log("örnek:", sablon.filter((s) => ["seri_koruma", "davet_katildi"].includes(s.anahtar)).map((s) => `${s.dil}: ${s.baslik} | ${s.govde}`).join("\n  "));
  hata += emojili.length;
  await db.kapat();
} catch (e) { if (e) throw e; } finally {
  for (const h of [A, B]) if (h) console.log("hesap silindi:", (await rpc(h, "hesabimi_sil")).ok);
}
console.log(hata ? `KALDI (${hata})` : "GEÇTİ");
process.exit(hata ? 1 : 0);
