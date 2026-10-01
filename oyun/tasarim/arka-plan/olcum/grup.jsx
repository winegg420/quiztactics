// Dükkân › Arka Plan örnek kartları (gerçek KozmetikSimge + KozmetikBuyukOnizleme) — grup kotası (en çok 2 tam, kalanı hafif) doğrulaması. DB'siz.
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../../../../src/styles.css";
import "../../../styles/tema.css";
import "../../../styles/koyu.css";
import "../../../styles/yeni.css";
import "../../../styles/mobile-game.css";
import "../../tasarim.css";
import { KozmetikSimge, KozmetikBuyukOnizleme } from "../../../components/DukkanKozmetik.jsx";
const profil = { id: "x", gorunen_ad: "Kalite7890", gorunen_avatar: "/avatars/pro/kedi-k01.svg" };
const KALEMLER = ["pa_sualti", "pa_kar", "pa_yaprak", "pa_gece"].map((a) => ({ tur: "premium_aura", anahtar: a }));
const q = new URLSearchParams(location.search);
ReactDOM.createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <div style={{ padding: 16, display: "grid", gap: 12, background: "#eaf3ff", minHeight: "100dvh" }}>
      <KozmetikBuyukOnizleme kalem={KALEMLER[Number(q.get("s") || 0)]} profile={profil} userId="x" />
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {KALEMLER.map((k) => <li key={k.anahtar}><KozmetikSimge kalem={k} profile={profil} hareketli /></li>)}
      </ul>
    </div>
  </MemoryRouter>);
