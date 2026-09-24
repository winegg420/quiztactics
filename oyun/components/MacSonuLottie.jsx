// ============================================================
// MAÇ SONU LOTTIE KATMANI — /mac-sonu-onizleme (MacSonuKutlama) için
//
// Oynatıcı (`lottie-web` › lottie_light, SVG) ve animasyon dosyaları
// (public/lottie/mac-sonu/*.json) TEMBEL yüklenir: yalnız bu bileşen
// takıldığında dinamik import() + fetch. Ana giriş paketine girmez.
//
// Yüklenemezse (ağ, eski tarayıcı) bileşen hiçbir şey çizmez; sahne
// Lottie'siz, bozulmadan çalışır.
//
// Komutlar (ref): oynat() · sonaGit() · gizle()
//  - kalici: son kare ekranda kalır (kupa, level); değilse biter bitmez
//    solar (coin, yıldız patlaması).
//  - Komut, dosya henüz inmeden gelirse bekletilir. Kalıcı animasyon (kupa, level)
//    GEC_KALICI_MS'e kadar geç de olsa BAŞTAN oynar; geçici olan (coin, yıldız)
//    GEC_SINIR_MS'e kadar oynar, daha geç kalırsa atlanır.
//
// KÖK SEBEP (A.4, 24 Eyl 2026 — "maç sonunda hiç canlı hareket yok"): oynatıcı ve
// dosyalar yalnız sahne takılınca inmeye başlıyordu; kupa 150 ms'de oynat komutu alıp
// 450 ms'lik sınırı aşınca son karede DONUK açılıyor, coin/yıldız patlaması hiç
// oynamıyor, konfeti 700 ms'ye yetişmezse hiç atılmıyordu. Önizleme yerelde hızlı
// indiği için oynuyordu; telefonda (soğuk önbellek, hücresel ağ) ölçüm: 300 ms gecikme
// + 1,6 Mbit/sn'de oynatıcı 651 ms'de iniyor → kupa donuk. Düzeltme: indirme maç
// biter bitmez (macSonuOzet.js › useMacSonuOzet) ve maç sayfası açıkken boşta başlar;
// geç kalan animasyon atlanmak yerine geç oynar; konfeti komutu bekletilir.
//
// iOS: kapsayıcıda transform yok; tam ekran konfeti (canvas) `position: fixed`
// katmanı da transform'suz (bkz. mac-sonu-kutlama.css).
// ============================================================
import { useEffect, useImperativeHandle, useRef, useState } from "react";

const KLASOR = "/lottie/mac-sonu/";
const GEC_SINIR_MS = 1200;    // geçici animasyon (coin, yıldız patlaması)
const GEC_KALICI_MS = 3000;   // kalıcı animasyon (kupa, level): geç de olsa baştan oynar
const KONFETI_GEC_MS = 2200;  // konfeti komutu parça inene dek bu kadar bekler

let oynaticiSozu = null;
const metinSozleri = new Map();

/** lottie-web (hafif SVG sürümü) — bir kez indirilir. */
export function lottieOynaticiYukle() {
  if (!oynaticiSozu) {
    oynaticiSozu = import("lottie-web/build/player/lottie_light.js")
      .then((m) => m.default ?? m)
      .catch((e) => {
        oynaticiSozu = null;   // bir sonraki denemede yeniden indirilsin
        throw e;
      });
  }
  return oynaticiSozu;
}

/** Animasyon dosyasını METİN olarak önbellekler (lottie veriyi değiştirdiği için her örnek taze ayrıştırır). */
function lottieMetni(ad) {
  let s = metinSozleri.get(ad);
  if (!s) {
    // force-cache: dosya adresi sabit (Vercel her istekte yeniden doğrulatıyor → her maçta bir gidiş-dönüş)
    s = fetch(`${KLASOR}${ad}.json`, { cache: "force-cache" }).then((y) => {
      if (!y.ok) throw new Error(`lottie ${ad}: HTTP ${y.status}`);
      return y.text();
    });
    s.catch(() => metinSozleri.delete(ad));
    metinSozleri.set(ad, s);
  }
  return s;
}

/** Sayfa açılır açılmaz çağrılır: oynatıcı + dosyalar ısınır, ilk olay (0,15 sn) beklemez. */
export function lottieOnYukle(adlar) {
  lottieOynaticiYukle().catch(() => {});
  for (const ad of adlar) lottieMetni(ad).catch(() => {});
}

/** A.4: maç sonu sahnesinin bütün parçaları (oynatıcı, 4 animasyon, konfeti) — sahne takılmadan ÖNCE ısıtılır. */
export function macSonuOnYukle() {
  lottieOnYukle(["kupa", "coin", "level", "yildiz"]);
  konfetiYukle().catch(() => {});
}

// ------------------------------------------------------------------ konfeti
// Tam ekran konfeti Lottie DEĞİL, canvas-confetti (MIT): Lottie konfetisi tam ekran SVG
// boyamasıyla 4× CPU kısıtlamasında p95 kareyi 67 ms'ye çıkarıyordu. canvas-confetti
// OffscreenCanvas varsa iş parçacığında çizer (ana iş parçacığı boş kalır), yoksa ana
// iş parçacığına düşer. O da tembel yüklenir.
let konfetiSozu = null;
export function konfetiYukle() {
  if (!konfetiSozu) {
    konfetiSozu = import("canvas-confetti").then((m) => m.default ?? m).catch((e) => { konfetiSozu = null; throw e; });
  }
  return konfetiSozu;
}

/** Renkler tasarım token'larından (Yön A): coin altını, vurgu turuncusu, mor, yeşil, mavi, pembe. */
function konfetiRenkleri() {
  try {
    const s = getComputedStyle(document.documentElement);
    const r = ["--qt-coin", "--qt-vurgu", "--qt-ikinci", "--qt-dogru", "--qt-mod-saf", "--qt-mod-duello"]
      .map((t) => s.getPropertyValue(t).trim()).filter(Boolean);
    return r.length ? r : undefined;
  } catch {
    return undefined;
  }
}

/** Üç atış: ortadan + iki yandan. */
function konfetiAt(ates) {
  const ortak = { colors: konfetiRenkleri(), shapes: ["square", "circle"], scalar: 1.1, ticks: 220, gravity: 1.1 };
  try {
    ates({ ...ortak, particleCount: 110, spread: 100, startVelocity: 48, origin: { x: 0.5, y: 0.34 } });
    ates({ ...ortak, particleCount: 45, angle: 60, spread: 60, startVelocity: 58, origin: { x: 0, y: 0.62 } });
    ates({ ...ortak, particleCount: 45, angle: 120, spread: 60, startVelocity: 58, origin: { x: 1, y: 0.62 } });
  } catch { /* konfeti çizilemedi: sahne sürer */ }
}

// iOS'ta (bütün iOS tarayıcıları WebKit) ve Safari'de iş parçacığı (OffscreenCanvas) kullanılmaz:
// tuval devredildikten sonra çizim sessizce başarısız olursa konfeti hiç görünmez ve bunu ana iş
// parçacığından anlamanın yolu yok. iPhone'da ana iş parçacığı bu yükü rahat taşır.
function isciKullan() {
  try {
    const ua = navigator.userAgent || "";
    const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const safari = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
    return !ios && !safari;
  } catch {
    return false;
  }
}

/** Tam ekran konfeti katmanı. ref: oynat() · gizle() */
export function KonfetiKatmani({ ref }) {
  const tuvalRef = useRef(null);
  const atesRef = useRef(null);
  const bekleyenRef = useRef(0);   // parça inmeden gelen oynat komutunun zamanı (0 = yok)

  useEffect(() => {
    let aktif = true;
    konfetiYukle()
      .then((confetti) => {
        if (!aktif || !tuvalRef.current) return;
        // Tuval iş parçacığına bir kez devredilir (ikinci devir hata verir; StrictMode iki kez takar).
        const tuval = tuvalRef.current;
        tuval.__msAtes ??= confetti.create(tuval, { resize: true, useWorker: isciKullan(), disableForReducedMotion: true });
        atesRef.current = tuval.__msAtes;
        // Komut parça inmeden geldiyse: sınır içindeyse şimdi at (geç de olsa kutlama görünsün)
        const b = bekleyenRef.current;
        bekleyenRef.current = 0;
        if (b && performance.now() - b <= KONFETI_GEC_MS) konfetiAt(atesRef.current);
      })
      .catch((e) => console.warn("[Bildim] konfeti yüklenemedi:", e?.message ?? e));
    return () => {
      aktif = false;
      try { atesRef.current?.reset(); } catch { /* zaten durmuş */ }
      atesRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    oynat: () => {
      const ates = atesRef.current;
      if (!ates) { bekleyenRef.current = performance.now(); return; }   // inince atılır (KONFETI_GEC_MS)
      konfetiAt(ates);
    },
    gizle: () => { bekleyenRef.current = 0; try { atesRef.current?.reset(); } catch { /* yok */ } },
  }), []);

  return <canvas ref={tuvalRef} className="msk-konfeti" aria-hidden="true" />;
}

/**
 * @param {string} ad          public/lottie/mac-sonu/<ad>.json
 * @param {boolean} kalici     son kare ekranda kalsın mı
 * @param {number} hiz         oynatma hızı (1 = dosyanın kendi süresi)
 * @param {number} sonKare    kalıcı animasyonun duracağı kare (0–1; dosyanın son karesi solgunsa daha erken)
 * @param {string} oran        preserveAspectRatio
 * @param {number} hazirlaMs  örnek bu kadar sonra kurulur: dört Lottie aynı karede kurulunca açılışta
 *                            uzun bir kare oluşuyordu; her biri kendi anından önce, ayrı karede kurulur
 * @param {boolean} sonda     takıldığı anda sahne zaten atlanmışsa (dokunuş) kalıcı animasyon kurulunca son karede açılır
 */
export default function MacSonuLottie({ ref, ad, kalici = false, sonKare = 1, hiz = 1, oran = "xMidYMid meet", hazirlaMs = 0, sonda = false, className = "" }) {
  const kutuRef = useRef(null);
  const animRef = useRef(null);
  const bekleyenRef = useRef(sonda ? { komut: "son", zaman: 0 } : null);   // { komut, zaman }
  const [durum, setDurum] = useState("gizli");   // gizli | acik | soluk

  const uygula = (komut, zaman) => {
    const a = animRef.current;
    if (!a) { bekleyenRef.current = { komut, zaman }; return; }
    const son = Math.max(0, Math.round((a.totalFrames - 1) * sonKare));
    if (komut === "oynat") {
      const gec = performance.now() - zaman;
      if (gec > (kalici ? GEC_KALICI_MS : GEC_SINIR_MS)) {
        if (kalici) { a.goToAndStop(son, true); setDurum("acik"); }
        return;
      }
      a.goToAndPlay(0, true);
      setDurum("acik");
    } else if (komut === "son") {
      if (kalici) { a.goToAndStop(son, true); setDurum("acik"); }
      else { a.stop(); setDurum("gizli"); }
    } else if (komut === "gizle") {
      a.stop();
      setDurum("gizli");
    }
  };
  const uygulaRef = useRef(uygula);
  uygulaRef.current = uygula;

  useImperativeHandle(ref, () => ({
    oynat: () => uygulaRef.current("oynat", performance.now()),
    sonaGit: () => uygulaRef.current("son", performance.now()),
    gizle: () => uygulaRef.current("gizle", performance.now()),
  }), []);

  useEffect(() => {
    let aktif = true;
    let anim = null;
    let bekleme = null;
    const kur = async () => {
      try {
        const [lottie, metin] = await Promise.all([lottieOynaticiYukle(), lottieMetni(ad)]);
        if (!aktif || !kutuRef.current) return;
        anim = lottie.loadAnimation({
          container: kutuRef.current,
          renderer: "svg",
          loop: false,
          autoplay: false,
          animationData: JSON.parse(metin),
          assetsPath: KLASOR,
          rendererSettings: { preserveAspectRatio: oran, progressiveLoad: false },
        });
        anim.setSpeed(hiz);
        anim.addEventListener("complete", () => {
          if (!kalici) setDurum("soluk");
          else if (sonKare < 1) anim.goToAndStop(Math.round((anim.totalFrames - 1) * sonKare), true);
        });
        const hazir = () => {
          if (!aktif) return;
          animRef.current = anim;
          const b = bekleyenRef.current;
          bekleyenRef.current = null;
          if (b) uygulaRef.current(b.komut, b.zaman);
        };
        if (anim.isLoaded) hazir();
        else anim.addEventListener("DOMLoaded", hazir);
      } catch (e) {
        // Lottie yüklenemedi: sahne onsuz sürer (brif G.6).
        console.warn("[Bildim] Lottie yüklenemedi:", ad, e?.message ?? e);
      }
    };
    // hazirlaMs yoksa (kupa) kurulum sahnenin İLK KARESİNDEN SONRAYA kalır: aynı görevde
    // loadAnimation + SVG ağacı, takılma işine ~8 ms JS ve ek stil hesabı ekliyordu
    // (4× CPU izi, açılıştaki 84 ms'lik görev). rAF → setTimeout: ilk kare boyandıktan sonra.
    let kare = 0;
    if (hazirlaMs > 0) bekleme = setTimeout(kur, hazirlaMs);
    else kare = requestAnimationFrame(() => { bekleme = setTimeout(kur, 0); });
    return () => {
      aktif = false;
      cancelAnimationFrame(kare);
      clearTimeout(bekleme);
      animRef.current = null;
      try { anim?.destroy(); } catch { /* zaten sökülmüş */ }
    };
  }, [ad, hiz, kalici, oran, sonKare, hazirlaMs]);

  return <div ref={kutuRef} className={`msk-lottie msk-lottie--${durum} ${className}`} aria-hidden="true" />;
}
