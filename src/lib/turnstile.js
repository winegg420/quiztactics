import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile (captcha). Supabase Auth'ta CAPTCHA açık: signInAnonymously ve
// signInWithOtp `options.captchaToken` ister. Site anahtarı HERKESE AÇIKTIR (gizli anahtar
// yalnız Supabase'dedir); env yoksa sabit yedek kullanılır, Vercel'e değişken eklemek gerekmez.
const SITE_ANAHTARI = import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAFWd9O7c2bsLJbp3";
// Cloudflare'ın her zaman geçen test anahtarı (yalnız yerel geliştirme)
const TEST_ANAHTARI = "1x00000000000000000000AA";
const BETIK = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function anahtarSec() {
  try {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return TEST_ANAHTARI;
  } catch { /* pencere yoksa canlı anahtar */ }
  return SITE_ANAHTARI;
}

let betikSozu = null;
function betigiYukle() {
  if (typeof window === "undefined") return Promise.reject(new Error("pencere yok"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!betikSozu) {
    betikSozu = new Promise((coz, red) => {
      const s = document.createElement("script");
      s.src = BETIK;
      s.async = true;
      s.defer = true;
      s.onload = () => (window.turnstile ? coz(window.turnstile) : red(new Error("turnstile yok")));
      s.onerror = () => { betikSozu = null; red(new Error("turnstile betiği yüklenemedi")); };
      document.head.appendChild(s);
    });
  }
  return betikSozu;
}

/**
 * Turnstile kutusu. `kutuRef`'i bir öğeye ver; `token` doluyken auth çağrısı yapılabilir.
 * Token tek kullanımlıktır: her auth çağrısından (başarılı ya da başarısız) sonra `sifirla()`.
 * `durum`: "yukleniyor" | "hazir" | "hata"  — "hata"da kullanıcıya mesaj gösterilir.
 */
export function useTurnstile(dil = "tr") {
  const kutuRef = useRef(null);
  const widgetRef = useRef(null);
  const [token, setToken] = useState(null);
  const [durum, setDurum] = useState("yukleniyor");

  useEffect(() => {
    let iptal = false;
    setToken(null);
    setDurum("yukleniyor");
    betigiYukle()
      .then((ts) => {
        if (iptal || !kutuRef.current) return;
        try {
          widgetRef.current = ts.render(kutuRef.current, {
            sitekey: anahtarSec(),
            language: dil === "en" ? "en" : "tr",
            theme: "light",
            appearance: "always",   // Managed: Cloudflare gerekirse etkileşim ister
            callback: (t) => { setToken(t); setDurum("hazir"); },
            "expired-callback": () => setToken(null),
            "timeout-callback": () => setToken(null),
            "error-callback": () => { setToken(null); setDurum("hata"); return true; },
          });
        } catch (e) {
          console.error("[Turnstile] kutu kurulamadı:", e);
          setDurum("hata");
        }
      })
      .catch((e) => {
        console.error("[Turnstile] betik yüklenemedi:", e);
        if (!iptal) setDurum("hata");
      });
    return () => {
      iptal = true;
      try { if (widgetRef.current != null) window.turnstile?.remove(widgetRef.current); } catch { /* kutu zaten yok */ }
      widgetRef.current = null;
    };
  }, [dil]);

  const sifirla = useCallback(() => {
    setToken(null);
    try { if (widgetRef.current != null) window.turnstile?.reset(widgetRef.current); } catch { /* kutu yok */ }
  }, []);

  return { kutuRef, token, durum, sifirla };
}
