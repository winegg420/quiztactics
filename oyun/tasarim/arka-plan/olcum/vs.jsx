// Maç başı VS kartları (gerçek VsKarti; iki oyuncu, herkes kendi arka planıyla). ?a=sualti&b=gece
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../../../../src/styles.css";
import "../../../styles/tema.css";
import "../../../styles/koyu.css";
import "../../../styles/yeni.css";
import "../../../styles/mobile-game.css";
import "../../tasarim.css";
import { VsKarti } from "../../../components/AramaSahnesi.jsx";
const q = new URLSearchParams(location.search);
const KART = (level, pa) => ({ level, lig: "altin", cerceve: null, cerceve_nadirlik: null, aura: null, premium_cerceve: null, premium_aura: pa });
const ben = { id: "a", gorunen_ad: "idagg", gorunen_avatar: "/avatars/pro/kedi.svg" };
const rakip = { id: "b", gorunen_ad: "Rakip", gorunen_avatar: "/avatars/pro/kedi.svg" };
ReactDOM.createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <div className="ara qt-sahne-mac" style={{ minHeight: "100dvh" }}><main className="ara-govde"><div className="ara-vs">
      <VsKarti profil={ben} kart={KART(17, "pa_" + (q.get("a") || "sualti"))} taraf="ben" vsKarti={null} isimEfekti={null} adDokunur={false} />
      <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
      <VsKarti profil={rakip} kart={KART(17, "pa_" + (q.get("b") || "gece"))} taraf="rakip" vsKarti={null} isimEfekti={null} adDokunur={false} />
    </div></main></div>
  </MemoryRouter>);
