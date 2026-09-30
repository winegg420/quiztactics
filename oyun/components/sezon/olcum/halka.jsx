// Ölçüm sayfası (yalnız araclar/sezon-parca-ekran.mjs kullanır): CerceveliAvatar boyut × çerçeve ızgarası.
// ?bp=1 → sezonBp verilir · ?kart=1 → kart.sezon_bp=true · ?bp=0 → sezonBp={false} · (hiçbiri) → prop yok, kart alanı yok.
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "../../../../src/styles.css";
import "../../../styles/tema.css";
import "../../../styles/koyu.css";
import "../../../styles/yeni.css";
import "../../../styles/mobile-game.css";
import "../../../tasarim/tasarim.css";
import CerceveliAvatar from "../../CerceveliAvatar.jsx";
import IsimEfekti from "../../IsimEfekti.jsx";

const q = new URLSearchParams(location.search);
const BOYUTLAR = [36, 48, 72, 120, 200];
const CERCEVELER = [["yok", null, null], ["lig_altin", "lig_altin", null], ["level_50", "level_50", null], ["turnuva", "turnuva_sampiyon", null], ["premium", null, "pc_galaksi"]];
const profil = { id: "onizleme-ben", gorunen_ad: "idagg", gorunen_avatar: q.get("av") === "1" ? "/avatars/pro/ari-k14.svg" : "/avatars/pro/kedi.svg" };
const bpProp = q.get("bp") === "1" ? { sezonBp: true } : q.get("bp") === "0" ? { sezonBp: false } : {};
const kartBp = q.get("kart") === "1";
const hareketli = q.get("hareketli") === "1";

ReactDOM.createRoot(document.getElementById("root")).render(
  <MemoryRouter>
    <div id="izgara" style={{ background: "#fff", padding: 12, display: "grid", gap: 10, width: "max-content" }}>
      {CERCEVELER.map(([ad, cerceve, premium]) => (
        <div key={ad} data-satir={ad} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {BOYUTLAR.map((b) => (
            <span key={b} data-boyut={b} style={{ display: "inline-flex" }}>
              <CerceveliAvatar profile={profil} boyut={b} hareketli={hareketli} {...bpProp}
                kart={{ cerceve, cerceve_nadirlik: null, aura: null, premium_cerceve: premium, premium_aura: null, ...(kartBp ? { sezon_bp: true } : {}) }} />
            </span>
          ))}
        </div>
      ))}
      <div data-isim style={{ display: "flex", gap: 16, fontSize: 20, fontWeight: 800 }}>
        <IsimEfekti kart={{ isim_efekti: null, ...(kartBp ? { sezon_bp: true } : {}) }} {...bpProp}>idagg</IsimEfekti>
        <IsimEfekti ef={null} {...bpProp}>idagg</IsimEfekti>
        <IsimEfekti ef="isim_altin" {...bpProp}>idagg</IsimEfekti>
      </div>
    </div>
  </MemoryRouter>);
