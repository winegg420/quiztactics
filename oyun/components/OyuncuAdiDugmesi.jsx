// ============================================================
// OYUNCU ADI DÜĞMESİ (Ajan C, 24 Eyl 2026) — AvatarDugmesi'nin AD sürümü.
// Oyuncu adının göründüğü her yerde ada dokununca aynı profil kartı (OyuncuKarti)
// açılır. Kendi adın için de açılır (kendi kartın). Gizli botlar gerçek oyuncu gibi:
// kart yalnız herkese açık alanları okur, `is_bot` sızmaz.
//
// Görünüm DEĞİŞMEZ: düğme sıfırlanır (:where → sıfır özgüllük, sayfanın sınıfları
// kazanır); asıl ad öğesi (`oge` + `className`) aynen içeride çizilir, üç nokta
// (ellipsis) ve IsimEfekti o öğede kalır. Dokunma alanı görünmez bir katmanla en az
// 44 px'e genişler (l-kart.css › .ls-ad-dugme).
//
// Satırın kendisi zaten tıklanırsa (ör. lig satırı kartı açar) bu bileşen KULLANILMAZ
// — iç içe düğme olmaz. Tıklanabilir bir kabın içindeyse dokunuş yukarı taşmaz
// (stopPropagation); kartın içindeki dokunuşlar da (portal, React ağacında kabarcık)
// sayfaya taşmaz. Klavye olayları DURDURULMAZ: QtModal Esc'i document'ta dinler.
// ============================================================
import { useState } from "react";
import OyuncuKarti from "./OyuncuKarti.jsx";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/l-kart.css";

const durdur = (e) => e.stopPropagation();

// Ön izlemeden `is_bot`/`bot` ayıklanır: kart yüklenirken bile gizli bot işaretlenmesin.
function onIzlemeYap(userId, profil) {
  if (!profil) return null;
  const { is_bot: _gizli, bot: _bot, ...temiz } = profil;
  return { id: userId, ...temiz };
}

/**
 * @param {object} o
 * @param {string} o.userId          kartı açılacak oyuncu (yoksa düz ad çizilir)
 * @param {object} [o.profil]        elde olan bilgi (kart boş açılmasın): gorunen_ad, gorunen_avatar…
 * @param {string} [o.ad]            ekran okuyucu için ad (verilmezse profil.gorunen_ad)
 * @param {string} [o.oge]           asıl ad öğesinin etiketi (span, b, div…)
 * @param {string} [o.className]     asıl ad öğesinin sınıfı (görünüm buradan gelir)
 * @param {string} [o.dugmeSinifi]   düğmeye ek sınıf (yerleşim ayarı gerekirse)
 * @param {object} [o.kartOzellikleri] OyuncuKarti'na ek eylemler (onMeydanOku, onMesaj…)
 * @param {boolean} [o.odaklanmaz]  sekmeyle odak almaz (ör. aria-hidden bir özetin içinde; aynı kart
 *                                   klavyeyle başka yoldan açılıyorsa)
 * @param {() => void} [o.onAc]      verilirse kendi kartını açmaz, bunu çağırır (sayfanın zaten bir kartı
 *                                   varsa — lobi/arkadaş listesi — aynı eylemli kart açılsın)
 */
export default function OyuncuAdiDugmesi({
  userId, profil = null, ad, oge: Oge = "span", className, dugmeSinifi, kartOzellikleri, onAc, odaklanmaz = false, children, ...rest
}) {
  const [acik, setAcik] = useState(false);
  if (!userId) return <Oge className={className || undefined} {...rest}>{children}</Oge>;
  const gorunen = ad ?? profil?.gorunen_ad ?? tt("Oyuncu");
  return (
    <>
      <button
        type="button"
        tabIndex={odaklanmaz ? -1 : undefined}
        className={dugmeSinifi ? `ls-ad-dugme ${dugmeSinifi}` : "ls-ad-dugme"}
        aria-label={tt("{0} — kartını aç", { 0: gorunen })}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onAc) onAc(); else setAcik(true); }}
        onPointerDown={durdur}
        onMouseDown={durdur}
        onTouchStart={durdur}
      >
        <Oge className={className || undefined} {...rest}>{children}</Oge>
      </button>
      {acik && (
        <span className="ls-ad-kart" onClick={durdur} onPointerDown={durdur}
              onMouseDown={durdur} onTouchStart={durdur}>
          <OyuncuKarti userId={userId} onIzleme={onIzlemeYap(userId, profil)}
                       onKapat={() => setAcik(false)} {...(kartOzellikleri ?? {})} />
        </span>
      )}
    </>
  );
}
