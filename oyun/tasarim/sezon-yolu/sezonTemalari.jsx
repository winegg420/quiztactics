// ============================================================
// SEZON TEMALARI — her sezonun kendi teması (hero bandı). Oyuncunun seçtiği kart arka planıyla ASLA ilgisi yok.
// YENİ SEZON = aşağıdaki kayda BİR SATIR. Kayıt anahtarı sezon no'dur (test sezonu 0 dahil); kayıtta yoksa Sezon 1 teması (o da yoksa VARSAYILAN).
//   { anahtar, ad_tr, ad_en, sanat (bileşen | null, tembel yüklenir), renkler: { zemin, zemin2, yazi, soluk } }
// Renkler hero bandının CSS değişkenlerine yazılır (--sy-t-*). Yazı/zemin çifti ≥ 4,5:1 olmalı (ölçüm betiği gerçek pikselle bakar).
// ============================================================
import { lazy, Suspense } from "react";
import { tt } from "../../lib/dil.js";

const YildizliGeceSanat = lazy(() => import("./sanat/YildizliGeceSanat.jsx"));

const YILDIZLI_GECE = {
  anahtar: "yildizli_gece", ad_tr: "Yıldızlı Gece", ad_en: "Starry Night", sanat: YildizliGeceSanat,
  renkler: { zemin: "#0E1440", zemin2: "#232C7A", yazi: "#FFFFFF", soluk: "#FFFFFF" },
};

/** Son çare (Sezon 1 kaydı da yoksa): oyunun mavisi, sanatsız. */
export const VARSAYILAN_TEMA = {
  anahtar: "varsayilan", ad_tr: "Sezon", ad_en: "Season", sanat: null,
  renkler: { zemin: "var(--qt-bilgi-koyu)", zemin2: "var(--qt-bilgi-koyu)", yazi: "var(--qt-yuzey)", soluk: "var(--qt-yuzey)" },
};

export const SEZON_TEMALARI = {
  0: YILDIZLI_GECE,   // test sezonu (yalnız sahip) — 1. sezonun görünümünü önceden gösterir
  1: YILDIZLI_GECE,   // SEZON 1 GEÇİCİ TEMASI
};

export function sezonTemasi(no) {
  const n = Number(no);
  // Kayıtta olmayan sezon (2, 3, …) Sezon 1 temasını aynen tekrar kullanır (Ida kararı, 9 Eki 2026).
  return (Number.isFinite(n) && SEZON_TEMALARI[n]) || SEZON_TEMALARI[1] || VARSAYILAN_TEMA;
}

/** Hero bandı: tema rengi + (varsa) tembel sanat katmanı; çocuklar sanatın ÖNÜNDE. */
export function SezonBandi({ tema, className = "", alt = null, children }) {
  const Sanat = tema.sanat;
  const r = tema.renkler;
  return (
    <div className={`sy-hero ${className}`} data-tema={tema.anahtar}
         style={{ "--sy-t-zemin": r.zemin, "--sy-t-zemin2": r.zemin2, "--sy-t-yazi": r.yazi, "--sy-t-soluk": r.soluk }}>
      {Sanat && <Suspense fallback={null}><Sanat /></Suspense>}
      <div className="sy-hero-ic">{children}</div>
      {alt}
    </div>
  );
}

/** Tema adı (dile göre). */
export const temaAdi = (tema, dil) => (dil === "en" ? tema.ad_en : tema.ad_tr) || tt("Sezon");
