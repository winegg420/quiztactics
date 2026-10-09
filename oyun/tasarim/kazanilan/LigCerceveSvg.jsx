/**
 * LİG ÇERÇEVESİ SVG (Ida onaylı yeni çizim, 30 Eyl 2026) — Bronz · Gümüş · Altın · Elmas · Efsane.
 * Kaynak: tasarim/lig-cerceveleri/uretici.js → public/lig-cerceveleri/cerceve-<lig>.svg (statik dosya, koda gömülü değil).
 *
 * SVG kuralı: viewBox "-140 -140 280 280", merkez (0,0), avatar deliği yarıçap 56 ve ŞEFFAF → avatar çerçevenin ALTINA
 * konur, çapı çerçeve genişliğinin %40'ı (112/280). Halkanın dış yarıçapı 74 (Elmas 80 — bilinçli, üst lig).
 *
 * `boyut` dış çaptır (halka dahil, taç/kanat/plaka DIŞINDA): kutu boyut × boyut, çizim kutunun dışına taşabilir
 * (overflow visible — kırpma yok). ≤ 48 px (kademe "kucuk") çizim viewBox "-84 -84 168 168" ile kırpılır: yalnız halka kalır,
 * kanat/taç/plaka satır yüksekliğini bozmaz. Hareket yok (statik); `hareketli` yok sayılır.
 * Aura varsa avatarın arkasında (PremiumCerceve halkasız) kalır. iOS: kökte fixed/transform yok.
 */
import { Children, cloneElement, isValidElement } from "react";
import PremiumCerceve from "../premium/PremiumCerceve.jsx";
import { LigCerceveVaryant, ligCerceveVaryantVar } from "../lig-sahnesi/BpCizimler.jsx";

const CIZIM = (lig) => `/lig-cerceveleri/cerceve-${lig}.svg`;
const DELIK = 112;   // avatar çapı (birim) — deliğin çapı
const KUTU = 148;    // tam çizimde kutu = halka dış çapı (2 × 74)
const KIRPIK = 168;  // ≤ 48 px'te kutu = viewBox "-84 -84 168 168"
const CIZIM_GENISLIK = 280;

// 9 Eki: `varyant` (yalnız /lig-sahne-onizleme V1-V3) → Elmas/Efsane yeni çizim (BpCizimler.jsx); null → bugünkü dosya.
export default function LigCerceveSvg({ lig, aura = null, boyut = 64, etiket, className = "", varyant = null, children }) {
  const kucuk = boyut <= 48;
  const kutu = kucuk ? KIRPIK : KUTU;
  const ic = Math.round((boyut * DELIK) / kutu);
  const genislik = (boyut * CIZIM_GENISLIK) / kutu;
  const kayma = -(genislik - boyut) / 2;
  const avatar = Children.map(children, (c) => (isValidElement(c) ? cloneElement(c, { boyut: ic }) : c));

  const konum = { position: "absolute", left: kayma, top: kayma, width: genislik, height: genislik, maxWidth: "none",
                  pointerEvents: "none", userSelect: "none" };
  const cizim = ligCerceveVaryantVar(lig, varyant) ? <LigCerceveVaryant lig={lig} varyant={varyant} style={konum} /> : (
    <img src={CIZIM(lig)} alt="" aria-hidden="true" draggable="false" decoding="async"
         style={{ position: "absolute", left: kayma, top: kayma, width: genislik, height: genislik, maxWidth: "none",
                  pointerEvents: "none", userSelect: "none" }} />
  );

  return (
    <span className={`lcs lcs--${lig}${kucuk ? " lcs--kucuk" : ""} ${className}`.trim()}
          style={{ position: "relative", display: "inline-block", flex: "none", width: boyut, height: boyut, verticalAlign: "middle", isolation: "isolate" }}
          {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      <span style={{ position: "absolute", left: (boyut - ic) / 2, top: (boyut - ic) / 2, width: ic, height: ic,
                     borderRadius: "50%", overflow: "hidden", zIndex: 1 }}>
        {aura ? <PremiumCerceve cerceve={null} aura={aura} boyut={ic} halkasiz>{avatar}</PremiumCerceve> : avatar}
      </span>
      {kucuk
        ? <span style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 2, pointerEvents: "none" }}>{cizim}</span>
        : <span style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>{cizim}</span>}
    </span>
  );
}
