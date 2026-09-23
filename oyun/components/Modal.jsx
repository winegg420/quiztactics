import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/g-modal.css";

/**
 * Tam ekran modal katmanı — HER ZAMAN `document.body`'ye basılır.
 *
 * NEDEN PORTAL: `.sayfa > *` üzerindeki giriş animasyonu (`transform` içeren
 * keyframe + `animation-fill-mode`) o elemanı "containing block" yapıyordu;
 * içindeki `position: fixed` katman viewport'a değil o elemana göre
 * konumlanıyor ve ekranın dışında (ölçüm: top -916px) açılıyordu. Kullanıcı
 * hesabını pratikte silemiyordu. Animasyon da düzeltildi, ama modallerin
 * body'ye basılması bu sınıf hatayı kökten engelliyor.
 */
export default function Modal({ children, onKapat, etiket = tt("İletişim kutusu"), ekSinif = "" }) {
  // Modal açıkken arka planın kaymasını engelle.
  //
  // KAYDIRMA KONUMU KORUNUR. Eskiden yalnız `overflow: hidden` veriliyordu;
  // tarayıcı o anda sayfayı en üste çekiyor ve modal kapanınca oyuncu
  // listenin başına düşüyordu ("maçı iptal ettim, en yukarı attı" şikâyeti).
  // Çözüm: gövdeyi bulunduğu konumda `fixed`leyip aynı kadar yukarı
  // kaydırmak; kapanışta konum geri veriliyor.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const govde = document.body;
    const y = window.scrollY || window.pageYOffset || 0;
    const eski = {
      overflow: govde.style.overflow,
      position: govde.style.position,
      top: govde.style.top,
      width: govde.style.width,
    };
    try {
      govde.style.overflow = "hidden";
      govde.style.position = "fixed";
      govde.style.top = `-${y}px`;
      govde.style.width = "100%";   // fixed olunca genişlik daralmasın
    } catch {
      /* önemli değil */
    }
    return () => {
      try {
        govde.style.overflow = eski.overflow;
        govde.style.position = eski.position;
        govde.style.top = eski.top;
        govde.style.width = eski.width;
        // `fixed` kalkar kalkmaz eski konuma dön (anında, yumuşatmasız)
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      } catch {
        /* sayfa kapanıyor olabilir */
      }
    };
  }, []);

  // Paket 42 C.2: alttan açılan pencere (`bd-alttan`) aşağı sürüklenerek kapanır.
  // Tutamaç "sürükle" vaat ediyordu ama dokunma işleyicisi yoktu. Sürükleme yalnız
  // tutamaçtan ya da pencerenin üst 56 px'inden ve içerik en üstteyken başlar (liste
  // kaydırmasıyla karışmasın); yüksekliğin %25'i (en çok 120 px) aşılırsa kapanır,
  // aşılmazsa yerine döner. Dönüşüm yalnız panelde — sabit katmanda değil (iOS kuralı).
  const katmanRef = useRef(null);
  const kapatRef = useRef(onKapat);
  kapatRef.current = onKapat;
  // Ters bölü bir ara kaybolmuştu (/s+/): sınıflar "s" harfinden bölünüyordu.
  // Ters bölü bir ara kaybolmuştu (/s+/): sınıf listesi "s" harfinden bölünüyordu.
  const alttan = ekSinif.split(/\s+/).includes("bd-alttan");
  useEffect(() => {
    const panel = katmanRef.current?.firstElementChild;
    if (!alttan || !panel) return undefined;
    let basY = null;
    let fark = 0;
    const basla = (y, hedef) => {
      if (!kapatRef.current || panel.scrollTop > 0) return false;
      const ust = y - panel.getBoundingClientRect().top;
      if (!hedef?.closest?.("[class*='tutamac']") && ust > 56) return false;
      basY = y; fark = 0;
      panel.style.transition = "none";
      return true;
    };
    const kay = (y) => {
      if (basY == null) return;
      fark = Math.max(0, y - basY);
      panel.style.transform = fark ? `translateY(${fark}px)` : "";
    };
    const bitir = () => {
      if (basY == null) return;
      basY = null;
      const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      panel.style.transition = azalt ? "none" : "transform .16s ease-out";
      if (fark > Math.min(120, panel.offsetHeight * 0.25)) { kapatRef.current?.(); return; }
      panel.style.transform = "";
      // Sürükleme sonrası parmağın altındaki düğmeye tıklama düşmesin
      if (fark > 8) window.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true });
    };
    const dokunBas = (e) => { basla(e.touches[0].clientY, e.target); };
    const dokunKay = (e) => { if (basY == null) return; kay(e.touches[0].clientY); if (fark > 0) e.preventDefault(); };
    const fareKay = (e) => kay(e.clientY);
    const fareBit = () => { window.removeEventListener("pointermove", fareKay); bitir(); };
    const fareBas = (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || !basla(e.clientY, e.target)) return;
      window.addEventListener("pointermove", fareKay);
      window.addEventListener("pointerup", fareBit, { once: true });
    };
    panel.addEventListener("touchstart", dokunBas, { passive: true });
    panel.addEventListener("touchmove", dokunKay, { passive: false });
    panel.addEventListener("touchend", bitir);
    panel.addEventListener("touchcancel", bitir);
    panel.addEventListener("pointerdown", fareBas);
    return () => {
      panel.removeEventListener("touchstart", dokunBas);
      panel.removeEventListener("touchmove", dokunKay);
      panel.removeEventListener("touchend", bitir);
      panel.removeEventListener("touchcancel", bitir);
      panel.removeEventListener("pointerdown", fareBas);
      window.removeEventListener("pointermove", fareKay);
      window.removeEventListener("pointerup", fareBit);
    };
  }, [alttan]);

  // Esc ile kapat
  useEffect(() => {
    if (!onKapat) return undefined;
    const tus = (e) => {
      if (e.key === "Escape") onKapat();
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [onKapat]);

  const govde = (
    <div
      ref={katmanRef}
      // Tasarım Adım 2: örtü tasarım sisteminin örtüsü (qt-ortu); `bd-modal-katman` test ve
      // içerik kuralları için KORUNUR. Panel görünümü: g-modal.css.
      className={"bd-modal-katman qt-ortu g-modal" + (alttan ? " qt-ortu--altSayfa" : "") + (ekSinif ? " " + ekSinif : "")}
      role="dialog"
      aria-modal="true"
      aria-label={etiket}
      onClick={onKapat ? (e) => e.target === e.currentTarget && onKapat() : undefined}
    >
      {children}
    </div>
  );

  return typeof document === "undefined" ? govde : createPortal(govde, document.body);
}
