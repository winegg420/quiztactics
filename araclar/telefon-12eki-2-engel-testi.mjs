// Telefon denetimi 2 (12 Eki 2026), madde 1 — arkadaşlık isteği + engel, canlı tek seferlik duman testi.
// İki misafir ARAÇ hesabı açar (arac:true → lig_gizli), engel iki yönde istek reddini ve engelsiz isteği ölçer,
// sonunda iki hesabı da hesabimi_sil ile siler. Toplam ~16 istek; döngü/yoklama yok.
// Kullanım: node araclar/telefon-12eki-2-engel-testi.mjs
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l.includes("="))
  .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;

async function misafir() {
  const r = await fetch(`${URL_}/auth/v1/signup`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { dil: "tr", arac: true } }) });
  const j = await r.json();
  if (!j.access_token) throw new Error("misafir açılamadı: " + JSON.stringify(j).slice(0, 200));
  return { id: j.user.id, t: j.access_token };
}
async function rpc(h, ad, govde = {}) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${ad}`, { method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${h.t}`, "Content-Type": "application/json" }, body: JSON.stringify(govde) });
  const metin = await r.text();
  let j = null; try { j = JSON.parse(metin); } catch { /* boş */ }
  return { ok: r.ok, durum: r.status, mesaj: j?.message ?? null, veri: j };
}

const sonuc = [];
const kontrol = (ad, kosul, ayrinti) => { sonuc.push({ ad, gecti: !!kosul, ayrinti }); console.log(kosul ? "GEÇTİ" : "KALDI", "·", ad, "·", JSON.stringify(ayrinti)); };
let A, B;
try {
  A = await misafir(); B = await misafir();
  // A, B'yi engeller
  let r = await rpc(A, "oyuncu_engelle", { p_kisi: B.id });
  kontrol("A B'yi engelledi", r.ok, r.durum);
  r = await rpc(A, "send_friend_request", { p_target: B.id });
  kontrol("engelleyen → engellenen istek reddi", !r.ok && r.mesaj === "İstek gönderilemedi.", r.mesaj);
  r = await rpc(B, "send_friend_request", { p_target: A.id });
  kontrol("engellenen → engelleyen istek reddi", !r.ok && r.mesaj === "İstek gönderilemedi.", r.mesaj);
  kontrol("mesaj engel bilgisini sızdırmıyor", !/engel|iletişim|block/i.test(r.mesaj ?? ""), r.mesaj);
  // davet kodu yolu (B, A'nın koduyla)
  const kod = await rpc(A, "davet_kodum");
  const davetKodu = typeof kod.veri === "string" ? kod.veri : (kod.veri?.kod ?? kod.veri?.davet_kodu ?? kod.veri?.[0]?.kod ?? null);
  if (davetKodu) {
    r = await rpc(B, "arkadas_davet_kodu_ile_ekle", { p_kod: davetKodu });
    kontrol("davet kodu yolu reddi (engellenen → engelleyen)", !r.ok && r.mesaj === "İstek gönderilemedi.", r.mesaj);
  } else kontrol("davet kodu okunamadı", false, kod.veri);
  // engel kalkınca istek normal
  r = await rpc(A, "engel_kaldir", { p_kisi: B.id });
  kontrol("engel kaldırıldı", r.ok, r.durum);
  r = await rpc(A, "send_friend_request", { p_target: B.id });
  kontrol("engelsiz istek gidiyor", r.ok, r.durum);
  const f = await fetch(`${URL_}/rest/v1/friendships?requester=eq.${A.id}&addressee=eq.${B.id}&select=durum`, { headers: { apikey: KEY, Authorization: `Bearer ${B.t}` } }).then((x) => x.json());
  kontrol("B'de bekleyen istek var", f?.[0]?.durum === "bekliyor", f);
} catch (e) {
  kontrol("beklenmeyen hata", false, String(e?.message ?? e));
} finally {
  for (const h of [A, B]) if (h) { const r = await rpc(h, "hesabimi_sil"); console.log("hesap silindi:", h.id.slice(0, 8), r.ok); }
}
const kalan = sonuc.filter((s) => !s.gecti).length;
console.log(`\n${sonuc.length - kalan}/${sonuc.length} geçti`);
process.exit(kalan ? 1 : 0);
