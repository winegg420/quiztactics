// Site testi 2. tur (14 Eki 2026) — OYNA penceresi, Dükkân para kuralı, mesaj konuşması, Profil ?sekme=rozetler.
// Oturum ve bütün Supabase istekleri TAKLİT edilir (sahte JWT, paylas-ekran.mjs ile aynı yol): canlıya hiç istek gitmez.
// Genişlikler: 390×844 ve 1440×900. Çıktı: tasarim/site-testi-2/*.png + olcum.json
// Kullanım: npx vite --port 5187 --strictPort · node araclar/site-testi-2-ekran.mjs --adres=http://localhost:5187
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5187";
const CIKTI = path.resolve("tasarim/site-testi-2");
fs.mkdirSync(CIKTI, { recursive: true });

const BEN = "0d0e1100-0000-4000-8000-0000000000aa";
const KISI = "0d0e1100-0000-4000-8000-0000000000bb";
const REF = "etezccrifaetzrgfvawl";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 36000, is_anonymous: true })}.sahte`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "", phone: "", is_anonymous: true,
  app_metadata: { provider: "anonymous", providers: [] }, user_metadata: {}, created_at: "2026-10-01T10:00:00Z" };
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: "sahte", user: KULLANICI };
const PROFIL = { id: BEN, xp: 1240, dil: "tr", lig: "gumus", coin: 1480, puan: 320, seri: 3, ulke: "TR", elmas: 40, level: 7, askida: false, is_bot: false,
  gorunum: null, acik_bot: false, level_xp: 140, seri_gun: 3, takma_ad: "Deniz", username: "oyuncu_test", lig_gizli: false,
  avatar_url: "/avatars/pro/tilki-k04.svg", gorunen_avatar: "/avatars/pro/tilki-k04.svg", gorunen_ad: "Deniz", created_at: "2026-10-01T10:00:00Z",
  davet_kodu: "QT7K2M", toplam_mac: 42, arac_hesabi: true, hile_yetkisi: false, mesaj_kapali: false, avatar_onayli: true, rahatsiz_etme: false,
  dereceli_tercih: true, takma_ad_secildi: true, vitrin_rozetleri: [], kosullar_kabul_at: "2026-10-01T10:00:00Z", level_gereken: 400 };
const KISI_PROFIL = { id: KISI, gorunen_ad: "Ayşe K.", gorunen_avatar: "/avatars/pro2/samuray-y15.svg", gorunum: null };
const MESAJLAR = Array.from({ length: 30 }, (_, i) => ({ id: 9000 + i, gonderen: i % 2 ? BEN : KISI, alici: i % 2 ? KISI : BEN,
  metin: `Mesaj ${30 - i}: bugün akşam bir maç daha?`, created_at: new Date(Date.now() - i * 60000).toISOString(), okundu: true }));

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };
const olcum = {};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const baglamAc = async (dil, w, h) => {
  const b = await tarayici.newContext({ storageState: { cookies: [], origins: [{ origin: kok, localStorage: [
    { name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM) }, { name: "bildim_dil", value: dil }, { name: "bildim_giris_dili", value: dil },
    { name: "bildim_tanitim", value: "1" }] }] }, viewport: { width: w, height: h }, hasTouch: w < 800, serviceWorkers: "block" });
  await b.route(/supabase\.co\//, async (r) => {
    const req = r.request(); const u = req.url();
    const json = (veri, status = 200) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
    if (u.includes("/auth/v1/user")) return json(KULLANICI);
    if (u.includes("/auth/v1/token")) return json(OTURUM);
    if (u.includes("/auth/v1/")) return json({});
    if (u.includes("/rpc/profilim")) return json({ ...PROFIL, dil });
    if (u.includes("/rpc/dm_sohbet")) return json(MESAJLAR);
    if (u.includes("/rpc/iletisim_durumu")) return json({ iletisim: true, engelledim: false, mesaj_kapali: false, kosullar_kabul: true });
    if (u.includes("/rest/v1/profiles") && u.includes(KISI)) return json(nesne ? KISI_PROFIL : [KISI_PROFIL]);
    if (u.includes("/rest/v1/friendships")) return json(nesne ? { id: 1 } : [{ id: 1, durum: "kabul" }]);
    if (u.includes("/rest/v1/rpc/")) return json(null);
    if (u.includes("/rest/v1/")) return json(nesne ? null : []);
    return json({});
  });
  return b;
};

try {
  for (const [w, h] of [[390, 844], [1440, 900]]) {
    console.log(`\n== ${w}×${h}`);
    // ---------- 8: OYNA penceresi ----------
    {
      const b = await baglamAc("tr", w, h); const s = await b.newPage();
      await s.goto(`${ADRES}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const oyna = s.locator(".mobile-core-mode.klasik, .a-ana-modlar .qt-mod--klasik, [aria-haspopup='dialog']:has-text('Klasik')").first();
      await oyna.waitFor({ timeout: 30000 }).catch(async (e) => { await s.screenshot({ path: path.join(CIKTI, "_hata-ana.png") }); console.log((await s.locator("body").innerText()).slice(0, 400)); throw e; });
      await oyna.click();
      await s.locator(".a-modsecim-liste").waitFor({ timeout: 10000 });
      await s.waitForTimeout(900);
      const o = await s.evaluate(() => {
        const kartlar = [...document.querySelectorAll(".a-modsecim-liste .qt-mod")];
        const duello = kartlar.find((k) => k.querySelector(".qt-mod-rozet"));
        const rz = duello?.querySelector(".qt-mod-rozet");
        if (!rz) return { yok: true, adlar: kartlar.map((k) => k.innerText.split("\n")[0]) };
        const r = rz.getBoundingClientRect(); const k = duello.getBoundingClientRect();
        const kcs = getComputedStyle(duello); const bw = parseFloat(kcs.borderTopWidth) || 0; const rad = parseFloat(kcs.borderTopRightRadius) || 0;
        // köşeler: rozetin dört köşesi kartın iç (kenarlık içi) alanında ve kartın yuvarlak köşesinin içinde mi
        const icinde = (x, y) => {
          if (x < k.left + bw - 0.5 || x > k.right - bw + 0.5 || y < k.top + bw - 0.5 || y > k.bottom - bw + 0.5) return false;
          const cx = k.right - rad, cy = k.top + rad;   // sağ üst köşe yayı
          if (x > cx && y < cy) return Math.hypot(x - cx, y - cy) <= rad - bw + 0.5;
          return true;
        };
        const koseler = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]];
        return { rozet: rz.innerText, adlar: kartlar.map((x) => x.querySelector(".qt-mod-ad, .qt-mod-baslik")?.innerText ?? x.innerText.split("\n")[0]),
          kutu: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], kart: [Math.round(k.left), Math.round(k.top), Math.round(k.width)],
          tamIcinde: koseler.every(([x, y]) => icinde(x, y)), tekSatir: r.height < 24 };
      });
      olcum[`oyna-${w}`] = o;
      ok(`${w} OYNA: "Düello" adı (parantezsiz)`, o.adlar?.some((a) => /^Düello$/.test(a.trim())) && !o.adlar.some((a) => /Taktik Maçı/.test(a)), JSON.stringify(o.adlar));
      ok(`${w} OYNA: "En çok ödül" rozeti kart içinde, kesilmiyor`, o.tamIcinde && o.tekSatir, JSON.stringify(o));
      await s.screenshot({ path: path.join(CIKTI, `8-oyna-${w}.png`) });
      await b.close();
    }
    // ---------- 9: Dükkân › Avatar para kuralı ----------
    for (const dil of ["tr", "en"]) {
      const b = await baglamAc(dil, w, h); const s = await b.newPage();
      await s.goto(`${ADRES}/joker?sekme=avatar`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await s.locator(".qt-dk-kural").waitFor({ timeout: 30000 }).catch(() => {});
      await s.waitForTimeout(700);
      const metin = await s.locator(".qt-dk-kural").innerText().catch(() => "");
      olcum[`dukkan-${w}-${dil}`] = metin;
      ok(`${w} ${dil} Dükkân kuralı`, dil === "tr" ? /Coin ile: Joker, Nadir/.test(metin) && /Elmas ile: Epik, Efsanevi/.test(metin)
        : /With coins: Jokers, Rare/.test(metin) && /With gems: Epic, Legendary/.test(metin), JSON.stringify(metin));
      await s.screenshot({ path: path.join(CIKTI, `9-dukkan-${w}-${dil}.png`) });
      await b.close();
    }
    // ---------- 6: mesaj konuşması ----------
    {
      const b = await baglamAc("tr", w, h); const s = await b.newPage();
      await s.goto(`${ADRES}/mesajlar/${KISI}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      const giris = s.locator(".ms-metin");
      await giris.waitFor({ timeout: 30000 });
      await s.waitForTimeout(800);
      const durum = () => s.evaluate(() => {
        const t = document.querySelector(".ms-metin");
        return { overflowY: getComputedStyle(t).overflowY, kaydirmaCubugu: t.offsetWidth - t.clientWidth - (parseFloat(getComputedStyle(t).borderLeftWidth) + parseFloat(getComputedStyle(t).borderRightWidth)),
          html: getComputedStyle(document.documentElement).overflow, body: getComputedStyle(document.body).overflow, scrollY: window.scrollY,
          sayfaUzun: document.documentElement.scrollHeight > innerHeight };
      });
      const bos = await durum();
      await s.screenshot({ path: path.join(CIKTI, `6-mesaj-bos-${w}.png`) });
      // Arka sayfa kaymasın: konuşmanın üst şeridinde ve listede tekerlek
      await s.mouse.move(w / 2, 30); await s.mouse.wheel(0, 600); await s.waitForTimeout(200);
      await s.mouse.move(w / 2, h / 2); await s.mouse.wheel(0, 1200); await s.waitForTimeout(300);
      const kaydirmaSonra = await durum();
      await giris.fill("1\n2\n3\n4\n5\n6\n7");
      await s.waitForTimeout(300);
      const cok = await durum();
      await s.screenshot({ path: path.join(CIKTI, `6-mesaj-cok-satir-${w}.png`) });
      await giris.fill("tek satır");
      await s.waitForTimeout(200);
      const tek = await durum();
      olcum[`mesaj-${w}`] = { bos, kaydirmaSonra, cok, tek };
      ok(`${w} mesaj: boş kutuda kaydırma gizli`, bos.overflowY === "hidden" && bos.kaydirmaCubugu <= 0, JSON.stringify(bos));
      ok(`${w} mesaj: tek satırda kaydırma gizli`, tek.overflowY === "hidden", JSON.stringify(tek));
      ok(`${w} mesaj: çok satırda kaydırma açık`, cok.overflowY === "auto", JSON.stringify(cok));
      ok(`${w} mesaj: arka sayfa kilitli (html+body) ve kaymadı`, bos.html === "hidden" && bos.body === "hidden" && kaydirmaSonra.scrollY === 0, JSON.stringify(kaydirmaSonra));
      await b.close();
    }
    // ---------- 7: Profil ?sekme=rozetler ----------
    for (const k of ["rozetler", "rozet"]) {
      const b = await baglamAc("tr", w, h); const s = await b.newPage();
      await s.goto(`${ADRES}/profil?sekme=${k}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await s.locator("#profil-sekmeler").waitFor({ timeout: 30000 });
      await s.waitForTimeout(900);
      const secili = await s.evaluate(() => {
        const el = document.querySelector("#profil-sekmeler [aria-selected='true'], #profil-sekmeler [aria-current='page'], #profil-sekmeler .qt-sekme--secili");
        return (el?.getAttribute("aria-label") || el?.innerText || "").trim();
      });
      olcum[`profil-${k}-${w}`] = secili;
      ok(`${w} /profil?sekme=${k} → Rozetler sekmesi`, /Rozet/i.test(secili), JSON.stringify(secili));
      await b.close();
    }
  }
} catch (e) {
  kaldi++; console.error("HATA:", e.message);
} finally {
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(olcum, null, 1));
  console.log(`\n${gecti} geçti, ${kaldi} kaldı · çıktı: ${path.relative(process.cwd(), CIKTI)}`);
  process.exitCode = kaldi ? 1 : 0;
}
