// Sezon Yolu AÇILIŞ / KAPANIŞ geçişleri (1 Eki 2026) — yardımcılar. Yalnız transform + opacity (kar/su arka planı performansını bozmaz).
//   · Açılış (400 ms): sayfa alttan kayar (CSS .sy-sayfa--ac), yol mevcut seviyeye kayar, o durak kısa parlar.
//   · Sezonun İLK açılışında önce tam perde (1,5 sn, dokununca atlanır): "Sezon N" + sezon sonu ödülü. Gördü bilgisi
//     sezon numarasıyla localStorage'da (kullanıcı başına); kayıt yoksa gösterilir. Depolama yoksa/bozuksa GÖSTERİLMEZ (her açılışta tekrarlamasın).
//   · Kapanış (250 ms): sayfa sökülürken kabuğun donmuş bir kopyası (hayalet) alta kayıp solar. React'ta sökülen sayfayı geciktirmek yerine
//     kopya, hareketsiz fixed kabın İÇİNDE oynar (iOS: fixed + transform aynı öğede değil).
// "Hareketi azalt" açıkken hiçbiri oynamaz: sayfa anında açılır/kapanır, perde hareketsiz görünür.

export const ACILIS_MS = 400;      // sayfa kayışı + yolun seviyeye kayışı (CSS .sy-sayfa--ac ile aynı)
export const PARLA_MS = 700;       // mevcut durağın parlaması (CSS sy-halka)
export const KAPANIS_MS = 250;     // ters geçiş (CSS sy-hayalet ile aynı)
export const PERDE_MS = 1500;      // tam perde toplam süresi (son 250 ms solma)
export const PERDE_SOLMA_MS = 250;

export const azaltMi = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

const perdeAnahtari = (userId, sezonNo) => `bildim_sezon_perde:${userId ?? "-"}:${sezonNo}`;

/** Bu oyuncu bu sezonun açılış perdesini daha görmedi mi? (depolama okunamazsa false) */
export function perdeGerekliMi(userId, sezonNo) {
  if (sezonNo == null) return false;
  try { return localStorage.getItem(perdeAnahtari(userId, sezonNo)) == null; } catch { return false; }
}

/** Perde gösterildi: sezon numarasıyla yaz. */
export function perdeGorduYaz(userId, sezonNo) {
  if (sezonNo == null) return;
  try { localStorage.setItem(perdeAnahtari(userId, sezonNo), "1"); } catch { /* özel mod */ }
}

/**
 * Kapanış geçişi: `el` (sayfa kabuğu) sökülmeden hemen önce çağrılır; görünür bölgenin (üst blok ile alt menü arası)
 * donmuş kopyasını alta kayıp solan bir katman olarak bırakır. Hata → sessizce geçişsiz kapanır.
 */
export function hayaletBirak(el) {
  try {
    if (!el || !el.isConnected || azaltMi() || !el.classList.contains("sy-sayfa--ac")) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const ust = document.querySelector(".bd-ust-blok")?.getBoundingClientRect();
    const alt = document.querySelector(".mobile-nav")?.getBoundingClientRect();
    const gorTop = Math.max(r.top, ust ? ust.bottom : 0, 0);
    const altSinir = alt && alt.height > 0 && alt.top > r.top ? alt.top : window.innerHeight;
    const gorBot = Math.min(r.bottom, altSinir, window.innerHeight);
    if (gorBot - gorTop < 8) return;

    const kap = document.createElement("div");
    kap.className = "sy-hayalet";
    kap.setAttribute("aria-hidden", "true");
    Object.assign(kap.style, { top: `${gorTop}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${gorBot - gorTop}px` });
    const ic = document.createElement("div");
    ic.className = "sy-hayalet-ic";
    ic.style.top = `${r.top - gorTop}px`;
    const kopya = el.cloneNode(true);
    kopya.classList.remove("sy-sayfa--ac");
    kopya.removeAttribute("id");
    kopya.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    kopya.querySelectorAll("[tabindex]").forEach((e) => e.setAttribute("tabindex", "-1"));
    kopya.style.width = `${r.width}px`;
    ic.appendChild(kopya);
    kap.appendChild(ic);
    document.body.appendChild(kap);
    setTimeout(() => { try { kap.remove(); } catch { /* zaten yok */ } }, KAPANIS_MS + 60);
  } catch (e) {
    console.error("[Bildim] Sezon Yolu kapanış geçişi kurulamadı:", e?.message ?? e);
  }
}
