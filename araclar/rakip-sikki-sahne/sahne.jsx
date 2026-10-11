// Rakibin şıkkı + Ort. cevap (1062) test sahnesi — GERÇEK bileşenler taklit veriyle (ağ yok, canlıya istek yok).
// Kullanan: araclar/rakip-sikki-ekran.mjs. ?g=klasik-farkli | klasik-ayni | klasik-yok | kasa | sonu-var | sonu-tek | sonu-yok · ?dil=en
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../../src/context/AuthContext.jsx";
import QuestionCard from "../../oyun/components/QuestionCard.jsx";
import MacSonuKutlama from "../../oyun/components/MacSonuKutlama.jsx";
import OrtCevapSatiri from "../../oyun/components/OrtCevapSatiri.jsx";
import CerceveliAvatar from "../../oyun/components/CerceveliAvatar.jsx";
import { QtSik, QtSikler, QtSoruKarti } from "../../oyun/tasarim/index.js";
import { dilKaydet, sozlukYukle } from "../../oyun/lib/dil.js";
import "../../src/styles.css";
import "../../oyun/styles/tema.css";
import "../../oyun/styles/yeni.css";
import "../../oyun/styles/mobile-game.css";
import "../../oyun/tasarim/tasarim.css";
import "../../oyun/tasarim/ekranlar/m1-mac.css";

const q = new URLSearchParams(location.search);
const G = q.get("g") || "klasik-farkli";
const EN = q.get("dil") === "en";
const SORU = { question_id: "rs-1", soru_index: 4, baslangic: new Date(Date.now() - 1500).toISOString(),
  soru: EN ? "What is the capital of Türkiye?" : "Türkiye'nin başkenti neresidir?",
  secenekler: EN ? ["Istanbul", "Ankara", "Izmir", "Bursa"] : ["İstanbul", "Ankara", "İzmir", "Bursa"], dogru_cevap: null };
const BEN = { id: "00000000-0000-4000-8000-0000000000b1", gorunen_ad: "Sen", gorunen_avatar: "/avatars/pro/tilki-k04.svg" };
const RAKIP = { id: "00000000-0000-4000-8000-0000000000b2", gorunen_ad: "Deniz Yıldırımoğlu", gorunen_avatar: "/avatars/pro2/basortulu-y04.svg" };
const av = (p) => <CerceveliAvatar profile={p} userId={p.id} boyut={24} cerceve={null} />;
const HARF = ["A", "B", "C", "D"];

function Klasik() {
  // Benim seçimim: 0 (yanlış); rakip: farkli → 1 (doğru) · ayni → 0 · yok → işaret yok
  const rakipCevap = G === "klasik-ayni" ? 0 : G === "klasik-yok" ? null : 1;
  const [rs, setRs] = useState(null);
  useEffect(() => {
    // Gerçek akıştaki gibi cevaptan SONRA gelir; tıklama anında sahne kendisi cevaplar.
    const t = setTimeout(() => document.querySelectorAll(".qt-sik")[0]?.click(), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <QuestionCard soru={SORU} kategori="cografya" toplamSoru={20} jokerYok
      rakipSik={rs}
      onCevapla={async () => { setTimeout(() => rakipCevap != null && setRs({ cevap: rakipCevap, rakip: av(RAKIP), ben: av(BEN) }), 200);
        return { dogru: false, dogru_cevap: 1 }; }}
      onSureDoldu={() => {}} />
  );
}

function Kasa() {
  // KasaPage ile aynı şık yerleşimi (faz 'sonuc'): ben 2 (yanlış), rakip 1 (doğru)
  const durum = (i) => (i === 1 ? "dogrusu" : i === 2 ? "yanlis" : "kilitli");
  return (
    <div className="m1-soru">
      <QtSoruKarti kategori="cografya" metin={SORU.soru} />
      <QtSikler etiket="Şıklar">
        {SORU.secenekler.map((s, i) => (
          <QtSik key={i} harf={HARF[i]} metin={s} durum={durum(i)}
            ek={i === 1 ? <span className="qt-sik-ek" role="img" aria-label="Rakibin cevabı">{av(RAKIP)}</span> : null} />
        ))}
      </QtSikler>
    </div>
  );
}

function Sonu() {
  const veri = G === "sonu-var" ? { ben: 6240, rakip: 8110 } : G === "sonu-tek" ? { ben: 5460, rakip: null } : null;
  return (
    <MacSonuKutlama durum="kazandi" mod="klasik" sade ben={{ profil: BEN, skor: 70 }} rakip={{ profil: RAKIP, skor: 50 }}
      oduller={[]} gorevler={[]} rozetler={[]} sezonBp={false}
      modOzet={veri ? <OrtCevapSatiri veri={veri} /> : null} />
  );
}

function Sahne() {
  const icerik = G.startsWith("klasik") ? <Klasik /> : G === "kasa" ? <Kasa /> : <Sonu />;
  return <div className="qt-sahne-mac qt-sahne-gok m1-mac" style={{ minHeight: "100dvh" }}>{icerik}</div>;
}

document.body.classList.add("bd-oyun-modu");
(async () => {
  try { if (EN) { await sozlukYukle("en"); dilKaydet("en"); } else dilKaydet("tr"); } catch { /* Türkçede kal */ }
  ReactDOM.createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Sahne /></AuthProvider></BrowserRouter>);
})();
