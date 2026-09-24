/**
 * PREMIUM AVATAR ÇİZİMİ (560) — CerceveliAvatar'ın TEMBEL parçası (React.lazy). Ana paket büyümesin diye
 * premium sanat (oyun/tasarim/premium/) yalnız takılı premium çerçeve/aura görününce iner; inerken
 * CerceveliAvatar bugünkü çizimi gösterir (fallback).
 *
 * Önizlemedeki (/premium-onizleme › PremiumAvatar) sanatın AYNISI:
 *   · premium çerçeve (varsa) → PremiumCerceve (çerçeve + varsa premium aura)
 *   · yalnız premium aura + lig/level çerçevesi → bugünkü çerçeve (CerceveGorseli) içinde, avatarın
 *     düz zemini yerine aura sahnesi (PremiumCerceve halkasiz)
 *   · yalnız premium aura, çerçeve yok → PremiumCerceve ince halka + aura
 * Aura İÇ arka plandır: resmî avatar SVG'sinin 320×320 düz zemini ayıklanır (useSeffafAvatar; dosya
 * değişmez). https/Google fotoğrafında ayıklanamaz → aura yine arkada, fotoğraf önde.
 * Hareket kuralı PremiumCerceve'de: ≤ 48 px sade + hareketsiz; yalnız `hareketli` verilen yerde,
 * ekrandayken (IntersectionObserver) ve prefers-reduced-motion yokken.
 */
import Avatar from "../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import PremiumCerceve, { useSeffafAvatar } from "../tasarim/premium/PremiumCerceve.jsx";
import { CERCEVELER } from "../tasarim/premium/sanatCerceveler.jsx";
import { AURALAR } from "../tasarim/premium/sanatAuralar.jsx";
import { tt } from "../lib/dil.js";

export default function PremiumAvatarCizim({ profile, boyut, hareketli = false, premiumCerceve = null, premiumAura = null,
  cerceveAnahtar = null, cerceveSatir, cerceveVar = false, etiket, className = "" }) {
  const C = premiumCerceve && CERCEVELER[premiumCerceve] ? premiumCerceve : null;
  const A = premiumAura && AURALAR[premiumAura] ? premiumAura : null;
  const p = profile ?? {};
  const url = p.gorunen_avatar !== undefined ? p.gorunen_avatar : p.avatar_url;
  const seffaf = useSeffafAvatar(url ?? null, Boolean(A));
  const avatarProfil = A && url ? { ...p, gorunen_avatar: seffaf } : p;

  // Sanatı bilinmeyen kalem (istemci eski) → bugünkü çizim
  if (!C && !A) {
    return (
      <CerceveGorseli anahtar={cerceveAnahtar} satir={cerceveSatir} boyut={boyut} hareketli={hareketli} className={className} etiket={etiket}>
        <Avatar profile={p} boyut={icBoyut(boyut, cerceveVar)} />
      </CerceveGorseli>
    );
  }
  const ad = [C && CERCEVELER[C]?.ad, A && AURALAR[A]?.ad].filter(Boolean).map((x) => tt(x)).join(" · ");

  // Premium aura + bugünkü (lig/level/turnuva) çerçeve: çerçeve aynı, içinde aura sahnesi
  if (!C && cerceveVar) {
    const ic = icBoyut(boyut, true);
    return (
      <CerceveGorseli anahtar={cerceveAnahtar} satir={cerceveSatir} boyut={boyut} hareketli={hareketli} className={className}
                      etiket={[etiket, ad].filter(Boolean).join(" · ")}>
        <PremiumCerceve aura={A} boyut={ic} hareketli={hareketli} halkasiz>
          <Avatar profile={avatarProfil} boyut={ic} />
        </PremiumCerceve>
      </CerceveGorseli>
    );
  }
  return (
    <PremiumCerceve cerceve={C} aura={A} boyut={boyut} hareketli={hareketli} className={className}
                    etiket={ad}>
      <Avatar profile={avatarProfil} boyut={boyut} />
    </PremiumCerceve>
  );
}
