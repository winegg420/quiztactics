// Basılı tut (1052) test sahnesi — GERÇEK QuestionCard (Klasik/Turnuva/Grup/Hızlı Maç ortak kartı) taklit veriyle.
// Kullanan: araclar/basili-tut-ekran.mjs. ?yetkili=1 → soru dogru_cevap taşır (sunucu yalnız hileli_mi() hesabına verir).
// onCevapla çağrıları window.__cevaplar'a yazılır (araç okur).
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

const yetkili = new URLSearchParams(location.search).get("yetkili") === "1";
const SORU = { question_id: "bt-test-1", soru_index: 4, baslangic: new Date(Date.now() - 1500).toISOString(), soru: "Türkiye'nin başkenti neresidir?",
  secenekler: ["İstanbul", "Ankara", "İzmir", "Bursa"], ...(yetkili ? { dogru_cevap: 1 } : { dogru_cevap: null }) };
window.__cevaplar = [];

function Sahne() {
  return (
    <div className="qt-sahne-mac qt-sahne-gok m1-mac" style={{ minHeight: "100dvh" }}>
      <QuestionCard soru={SORU} kategori="cografya" toplamSoru={20} jokerYok
                    onCevapla={async (i) => { window.__cevaplar.push(i); return { dogru: i === 1, dogru_cevap: 1 }; }} onSureDoldu={() => {}} />
    </div>
  );
}

document.body.classList.add("bd-oyun-modu");
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter><AuthProvider><Sahne /></AuthProvider></BrowserRouter>,
);
