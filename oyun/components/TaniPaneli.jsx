import { useEffect, useState } from "react";

// ============================================================
// TANI PANELİ — yalnız adres sonunda ?tani=1 varken açılır (normal oyuncu görmez).
//
// Neden: 22 Eyl 2026'da Ida telefonda (Android) Düello'nun ilk sorusunda şıklara
// dokunamadı; masaüstü ve telefon taklidinde üretilemedi. Panel her dokunuşta
// dokunulan noktadaki en üst öğeyi, ekranı kaplayan sabit katmanları ve sayfanın
// bildirdiği oyun durumunu (window.__bdTani — ör. Düello: kilitli / sureBitti /
// secim / calisan / kalanSn) gösterir. Panelin kendisi dokunuşu yakalamaz.
// ============================================================

const ACIK_ANAHTAR = "bd_tani";

function taniAcikMi() {
  try {
    const p = new URLSearchParams(window.location.search).get("tani");
    if (p === "1") { sessionStorage.setItem(ACIK_ANAHTAR, "1"); return true; }
    if (p === "0") { sessionStorage.removeItem(ACIK_ANAHTAR); return false; }
    return sessionStorage.getItem(ACIK_ANAHTAR) === "1";   // SPA içinde sayfa değişince açık kalsın
  } catch {
    return false;
  }
}

function ogeAdi(e) {
  if (!e) return "yok";
  const zincir = [];
  let k = e;
  while (k && k !== document.body && zincir.length < 4) {
    const sinif = typeof k.className === "string" ? k.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    zincir.push(k.tagName.toLowerCase() + (sinif ? "." + sinif : "") + (k.disabled ? "[disabled]" : ""));
    k = k.parentElement;
  }
  return zincir.join(" < ");
}

/** Ekranın yarısından fazlasını kaplayan, görünür, dokunuş yakalayan sabit katmanlar. */
function tamEkranKatmanlar() {
  const alan = window.innerWidth * window.innerHeight;
  const sonuc = [];
  for (const e of document.body.querySelectorAll("*")) {
    const cs = getComputedStyle(e);
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
    const r = e.getBoundingClientRect();
    if (r.width * r.height < alan * 0.5) continue;
    sonuc.push(`${ogeAdi(e).split(" < ")[0]} op=${cs.opacity} pe=${cs.pointerEvents} z=${cs.zIndex}`);
  }
  return sonuc;
}

export default function TaniPaneli() {
  const [acik] = useState(taniAcikMi);
  const [kayitlar, setKayitlar] = useState([]);

  useEffect(() => {
    if (!acik) return undefined;
    const dinle = (ev) => {
      try {
        const x = ev.clientX, y = ev.clientY;
        const ust = document.elementFromPoint(x, y);
        const kayit = {
          t: new Date().toLocaleTimeString("tr-TR"),
          tur: ev.type,
          nokta: `${Math.round(x)},${Math.round(y)}`,
          ust: ogeAdi(ust),
          hedef: ogeAdi(ev.target),
          katman: tamEkranKatmanlar(),
          durum: window.__bdTani ? JSON.stringify(window.__bdTani) : "—",
        };
        console.info("[Bildim tanı]", kayit);
        setKayitlar((k) => [kayit, ...k].slice(0, 5));
      } catch (e) {
        console.error("[Bildim tanı] kayıt alınamadı:", e);
      }
    };
    // Yakalama evresinde: katman olayı yutsa bile kayıt düşer.
    document.addEventListener("pointerdown", dinle, true);
    return () => document.removeEventListener("pointerdown", dinle, true);
  }, [acik]);

  if (!acik) return null;
  return (
    <div className="bd-tani-panel" aria-hidden="true" style={{
      position: "fixed", right: 4, bottom: 4, zIndex: 2147483647, width: "min(96vw, 360px)",
      maxHeight: "45dvh", overflow: "hidden", pointerEvents: "none",
      background: "rgba(10,16,32,.86)", color: "#E8F0FF", font: "10px/1.35 ui-monospace, monospace",
      padding: 6, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all",
    }}>
      <b>TANI (?tani=0 kapatır)</b>
      {kayitlar.length === 0 && <div>Ekrana dokun…</div>}
      {kayitlar.map((k, i) => (
        <div key={i} style={{ borderTop: "1px solid #334", marginTop: 3, paddingTop: 3, opacity: i ? 0.7 : 1 }}>
          {`${k.t} ${k.tur} @${k.nokta}\nüst: ${k.ust}\nhedef: ${k.hedef}\nkatman: ${k.katman.join(" | ") || "yok"}\ndurum: ${k.durum}`}
        </div>
      ))}
    </div>
  );
}
