// Cevap İmzası test sahnesi (1040) — Klasik maç kartını (GERÇEK QuestionCard) taklit veriyle çizer.
// Kullanan: araclar/cevap-imzasi-ekran.mjs. Takılı imza GERÇEK yoldan gelir: AuthProvider › profilim() (araç taklit eder).
// ?rakip=1 → "rakibin ekranı": bu istemcide imza takılı değil (profilim taklidi null döndürür).
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/context/AuthContext.jsx";
import QuestionCard from "../../oyun/components/QuestionCard.jsx";
import "../../src/styles.css";
import "../../oyun/styles/tema.css";
import "../../oyun/styles/yeni.css";
import "../../oyun/styles/mobile-game.css";
import "../../oyun/tasarim/tasarim.css";
import "../../oyun/tasarim/ekranlar/m1-mac.css";

const SORU = { question_id: "ci-test-1", soru_index: 4, baslangic: new Date(Date.now() - 1500).toISOString(), soru: "Türkiye'nin başkenti neresidir?", secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"] };

function Sahne() {
  return (
    <div className="qt-sahne-mac qt-sahne-gok m1-mac" style={{ minHeight: "100dvh" }}>
      <QuestionCard soru={SORU} kategori="cografya" toplamSoru={20} jokerYok
                    onCevapla={async (i) => ({ dogru: i === 1, dogru_cevap: 1 })} onSureDoldu={() => {}} />
    </div>
  );
}

document.body.classList.add("bd-oyun-modu");
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter><AuthProvider><Sahne /></AuthProvider></BrowserRouter>,
);
