// E-posta kodu ile giriş (Aşama 3) — taklit Supabase ile, canlıya HİÇ istek gitmez.
//
//   npm run build && npx vite preview --port 4173     # başka bir kabukta
//   node araclar/eposta-kod-testi.mjs [--port=4173]
//
// localhost kapıdan serbest (uygulamaKipi.js). Turnstile taklit edilir. Auth uçları (otp, verify, user)
// taklit cevap döner; diğer Supabase istekleri boş cevaplanır. Her akış bir kez koşar.
import { chromium } from "playwright-core";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const KOK = `http://localhost:${Number(ARG.port || 4173)}`;
const DOGRU_KOD = "12345678";
const KULLANICI = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "deneme@ornek.com", app_metadata: { provider: "email" }, user_metadata: {}, is_anonymous: false, created_at: "2026-10-14T00:00:00Z" };
const oturum = (user) => ({ access_token: "sahte.jwt.belirtec", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "sahte-yenileme", user });

let hata = 0;
const sonuc = (ad, tamam, ek = "") => { if (!tamam) hata++; console.log(`${tamam ? "✓" : "✗"} ${ad}${ek ? " — " + ek : ""}`); };

const turnstileTaklit = () => {
  window.turnstile = { render(_el, o) { setTimeout(() => o.callback("sahte-captcha"), 30); return 1; }, reset() {}, remove() {} };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });

async function kur({ istekler, kur: ek, dil } = {}) {
  const baglam = await tarayici.newContext({ viewport: { width: 390, height: 844 } });
  await baglam.addInitScript(turnstileTaklit);
  if (dil) await baglam.addInitScript((d) => { try { localStorage.setItem("bildim_dil", d); } catch { /* yok */ } }, dil);
  if (ek) await baglam.addInitScript(ek.fn, ek.arg);
  await baglam.route(/challenges\.cloudflare\.com/, (r) => r.abort());
  await baglam.route(/supabase\.co/, async (r) => {
    const u = new URL(r.request().url());
    const yol = u.pathname;
    let govde = null;
    try { govde = r.request().postDataJSON(); } catch { /* gövde yok */ }
    istekler?.push({ yol, yontem: r.request().method(), govde, ara: u.searchParams.get("redirect_to") });
    const json = (status, veri) => r.fulfill({ status, contentType: "application/json", body: JSON.stringify(veri) });
    if (yol.endsWith("/auth/v1/otp")) return json(200, {});
    if (yol.endsWith("/auth/v1/verify")) {
      if (govde?.token === DOGRU_KOD) {
        const user = govde.type === "email_change" ? { ...KULLANICI, is_anonymous: false } : KULLANICI;
        return json(200, oturum(user));
      }
      return json(403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
    }
    if (yol.endsWith("/auth/v1/user")) {
      if (r.request().method() === "PUT") return json(200, { ...KULLANICI, email: "", new_email: govde?.email, is_anonymous: true });
      return json(200, ek?.kullanici ?? KULLANICI);
    }
    if (yol.endsWith("/auth/v1/settings")) return json(200, { external: { email: true, google: true, anonymous_users: true } });
    if (yol.endsWith("/rest/v1/rpc/profilim")) return json(200, { id: KULLANICI.id, username: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", coin: 0, xp: 0, dil: "tr" });
    if (yol.includes("/rest/v1/rpc/")) return json(200, null);
    if (yol.endsWith("/rest/v1/profiles")) {
      // Kurulumu bitmiş profil (yoksa Layout tanıtım/kurulum akışını açar)
      const pr = { id: KULLANICI.id, username: "Deneme", takma_ad_secildi: true, avatar_onayli: true, ulke: "TR", coin: 0, xp: 0, dil: "tr" };
      const tek = /object/.test(r.request().headers()["accept"] ?? "");
      return json(200, tek ? pr : [pr]);
    }
    if (yol.includes("/rest/v1/")) return json(200, []);
    return r.abort();
  });
  const sayfa = await baglam.newPage();
  const konsol = [];
  sayfa.on("pageerror", (e) => konsol.push(e.message));
  return { baglam, sayfa, konsol };
}

// 1) Giriş ekranı: e-posta → kod → yanlış kod → doğru kod
for (const dil of ["tr", "en"]) {
  const istekler = [];
  const { baglam, sayfa, konsol } = await kur({ istekler, dil });
  await sayfa.goto(KOK + "/", { waitUntil: "domcontentloaded" });
  await sayfa.waitForSelector("#g-giris-eposta", { timeout: 20000 });
  await sayfa.fill("#g-giris-eposta", "deneme@ornek.com");
  const gonder = sayfa.locator("form.g-giris-form button[type=submit]");
  await sayfa.waitForFunction(() => !document.querySelector("form.g-giris-form button[type=submit]")?.disabled, null, { timeout: 5000 }).catch(() => {});
  const dugmeMetni = (await gonder.textContent())?.trim();
  sonuc(`[${dil}] e-posta düğmesi kod diyor`, dil === "tr" ? /giriş kodu al/i.test(dugmeMetni) : /sign-in code/i.test(dugmeMetni), dugmeMetni);
  await gonder.click();
  await sayfa.waitForSelector("#g-giris-kod", { timeout: 5000 }).catch(() => {});
  const otp = istekler.find((i) => i.yol.endsWith("/auth/v1/otp"));
  sonuc(`[${dil}] /otp isteği (e-posta + captcha)`, otp?.govde?.email === "deneme@ornek.com" && otp?.govde?.gotrue_meta_security?.captcha_token === "sahte-captcha");
  sonuc(`[${dil}] e-posta dili adreste (redirect_to ?dil=${dil})`, (otp?.ara ?? "").endsWith(`/?dil=${dil}`), otp?.ara);
  const kodAlani = sayfa.locator("#g-giris-kod");
  sonuc(`[${dil}] kod alanı açıldı (one-time-code, numeric)`, (await kodAlani.count()) === 1
    && (await kodAlani.getAttribute("autocomplete")) === "one-time-code" && (await kodAlani.getAttribute("inputmode")) === "numeric");

  const kodDugme = sayfa.locator("form.g-giris-kod button[type=submit]");
  await kodAlani.fill("12a34");
  sonuc(`[${dil}] rakam dışı süzülür, 4 hanede düğme pasif`, (await kodAlani.inputValue()) === "1234" && await kodDugme.isDisabled());
  const kutu = await kodDugme.boundingBox();
  sonuc(`[${dil}] kod düğmesi ≥44 px`, kutu?.height >= 44, `h=${kutu?.height}`);

  await kodAlani.fill("87654321");
  await kodDugme.click();
  await sayfa.waitForSelector(".g-giris-not", { timeout: 5000 }).catch(() => {});
  const hataMetni = (await sayfa.locator(".g-giris-not").first().textContent().catch(() => "")) ?? "";
  sonuc(`[${dil}] yanlış kod → anlaşılır hata`, dil === "tr" ? /Kod yanlış ya da süresi dolmuş/.test(hataMetni) : /wrong or has expired/.test(hataMetni), hataMetni.trim());

  await kodAlani.fill(DOGRU_KOD);
  await kodDugme.click();
  const verify = istekler.filter((i) => i.yol.endsWith("/auth/v1/verify")).pop();
  sonuc(`[${dil}] /verify gövdesi (email, token, type=email)`, verify?.govde?.email === "deneme@ornek.com" && verify?.govde?.token === DOGRU_KOD && verify?.govde?.type === "email");
  const girdi = await sayfa.waitForSelector(".g-giris-kart", { state: "detached", timeout: 8000 }).then(() => true).catch(() => false);
  const depo = await sayfa.evaluate(() => Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k)));
  sonuc(`[${dil}] doğru kod → oturum açıldı, giriş ekranı kalktı`, girdi && depo);
  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  sonuc(`[${dil}] konsol hatası yok, taşma yok`, !konsol.length && tasma <= 0, konsol.join(" | "));
  await baglam.close();
}

// 2) Misafir hesabı güvenceye alma: e-posta → kod (type=email_change)
{
  const istekler = [];
  const anonim = { ...KULLANICI, email: "", is_anonymous: true, app_metadata: { provider: "anonymous" } };
  const ek = {
    kullanici: anonim,
    fn: ([u, s]) => {
      const ref = "etezccrifaetzrgfvawl";
      try { localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ ...s, user: u })); } catch { /* yok */ }
    },
  };
  ek.arg = [anonim, oturum(anonim)];
  const { baglam, sayfa, konsol } = await kur({ istekler, kur: ek });
  await sayfa.goto(KOK + "/profil?sekme=ayarlar", { waitUntil: "domcontentloaded" });
  const kart = await sayfa.waitForSelector(".qt-pf-guvence-eposta input[type=email]", { timeout: 20000 }).then(() => true).catch(() => false);
  if (!kart && ARG.gorsel) await sayfa.screenshot({ path: ARG.gorsel + "/misafir-profil.png" });
  sonuc("misafir: Profil'de e-posta bağlama formu", kart);
  if (kart) {
    await sayfa.fill(".qt-pf-guvence-eposta input[type=email]", "deneme@ornek.com");
    await sayfa.click(".qt-pf-guvence-eposta button[type=submit]");
    const kodAlani = sayfa.locator(".qt-pf-guvence-eposta input[autocomplete=one-time-code]");
    await kodAlani.waitFor({ timeout: 5000 }).catch(() => {});
    sonuc("misafir: kod alanı açıldı", (await kodAlani.count()) === 1);
    await kodAlani.fill("11112222");
    await sayfa.click(".qt-pf-guvence-eposta button[type=submit]");
    await sayfa.waitForSelector(".qt-pf-hata", { timeout: 5000 }).catch(() => {});
    sonuc("misafir: yanlış kod → hata", /Kod yanlış ya da süresi dolmuş/.test((await sayfa.locator(".qt-pf-hata").first().textContent().catch(() => "")) ?? ""));
    await kodAlani.fill(DOGRU_KOD);
    await sayfa.click(".qt-pf-guvence-eposta button[type=submit]");
    const put = istekler.find((i) => i.yol.endsWith("/auth/v1/user") && i.yontem === "PUT");
    sonuc("misafir: e-posta dili adreste (?dil=tr)", (put?.ara ?? "").endsWith("/?dil=tr"), put?.ara);
    const v = istekler.filter((i) => i.yol.endsWith("/auth/v1/verify")).pop();
    sonuc("misafir: /verify type=email_change, yeni adres", v?.govde?.type === "email_change" && v?.govde?.email === "deneme@ornek.com" && v?.govde?.token === DOGRU_KOD);
    const tamam = await sayfa.getByText("Hesabın artık kalıcı").first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    sonuc("misafir: doğru kod → 'Hesabın artık kalıcı'", tamam);
  }
  sonuc("misafir: konsol hatası yok", !konsol.length, konsol.join(" | "));
  await baglam.close();
}

await tarayici.close();
console.log(hata ? `\n${hata} HATA` : "\nTÜMÜ GEÇTİ");
process.exit(hata ? 1 : 0);
