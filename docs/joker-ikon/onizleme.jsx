// Yalnız `npm run dev` ile açılır (derlemeye girmez, Supabase istemez): 9 joker × 5 boyut, üretim rozeti + önizleme diski.
import { createRoot } from "react-dom/client";
import "../../oyun/tasarim/tasarim.css";
import SkillRozeti from "../../oyun/components/SkillRozeti.jsx";
import { JokerIkon } from "../../oyun/tasarim/gorsel-revizyon/a/cizim/joker.jsx";

const TURLER = ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans", "sigorta", "cifte_puan", "baskin", "kalkan"];
const BOYUTLAR = [16, 24, 32, 48, 64];

function Izgara({ baslik, Bil, arka }) {
  return (
    <section style={{ background: arka, padding: 12, margin: 6, borderRadius: 8 }}>
      <h3 style={{ margin: "0 0 8px", font: "700 13px sans-serif", color: arka === "#fff" ? "#222" : "#eee" }}>{baslik}</h3>
      {BOYUTLAR.map((b) => (
        <div key={b} style={{ display: "flex", gap: 14, alignItems: "center", margin: "6px 0" }}>
          <code style={{ width: 40, color: "#888", font: "11px monospace" }}>{b}px</code>
          {TURLER.map((t) => <Bil key={t} tur={t} boyut={b} />)}
        </div>
      ))}
    </section>
  );
}

createRoot(document.getElementById("kok")).render(
  <div id="onizleme" style={{ display: "flex", flexWrap: "wrap", fontFamily: "sans-serif" }}>
    <Izgara baslik="Oyundaki SkillRozeti (açık)" Bil={SkillRozeti} arka="#fff" />
    <Izgara baslik="Oyundaki SkillRozeti (koyu)" Bil={SkillRozeti} arka="#121a2e" />
    <Izgara baslik="JokerIkon (stil rehberi diski)" Bil={JokerIkon} arka="#fff" />
  </div>,
);
