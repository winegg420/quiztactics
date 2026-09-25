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
 * ekrandayken (IntersectionObserver); hareketi azalt açıkken yumuşak mod (tasarim/yumusakHareket.js).
 * 2. TUR (570, Ida onayı): pc_alev2 / pc_simsek2 / pc_kraliyet2 (580: + pc_ejderha2) → Cerceve2 (tur2/, WebGL efekt; motor ayrı
 * tembel parça, aynı anda en çok 2 hareketli efekt, WebGL yoksa önceki SVG hâli). Oyundaki
 * Altın Lig çerçevesi 2. tur hâliyle (Cerceve2 "altinlig") çizilir — kazanılır, satılmaz.
 * KAZANILAN (görsel revizyon, 25 Eyl): `kazanilan` = lig/level/turnuva çerçeve anahtarı → KazanilanCerceve (Altın Lig
 * dahil; premium aura varsa içinde). Premium çerçeve takılıysa o önce gelir (bugünkü kural).
 */
import Avatar from "../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import PremiumCerceve, { useSeffafAvatar } from "../tasarim/premium/PremiumCerceve.jsx";
import { CERCEVELER } from "../tasarim/premium/sanatCerceveler.jsx";
import { AURALAR } from "../tasarim/premium/sanatAuralar.jsx";
import Cerceve2 from "../tasarim/premium/tur2/Cerceve2.jsx";
import KazanilanCerceve from "../tasarim/kazanilan/KazanilanCerceve.jsx";

/** Premium kalem sanatı → 2. tur çerçeve türü (Cerceve2). */
export const TUR2_SANAT = { alev2: "alev", simsek2: "simsek", kraliyet2: "kraliyet", ejderha2: "ejderha" };
const TUR2_AD = { alev: "Sönmeyen Alev", simsek: "Şimşek", kraliyet: "Kraliyet", ejderha: "Ejderha" };
import { tt } from "../lib/dil.js";

export default function PremiumAvatarCizim({ profile, boyut, hareketli = false, premiumCerceve = null, premiumAura = null,
  cerceveAnahtar = null, cerceveSatir, cerceveVar = false, kazanilan = null, etiket, className = "" }) {
  const t2 = premiumCerceve ? TUR2_SANAT[premiumCerceve] ?? null : null;
  const C = premiumCerceve && CERCEVELER[premiumCerceve] ? premiumCerceve : null;
  const A = premiumAura && AURALAR[premiumAura] ? premiumAura : null;
  const p = profile ?? {};
  const url = p.gorunen_avatar !== undefined ? p.gorunen_avatar : p.avatar_url;
  const seffaf = useSeffafAvatar(url ?? null, Boolean(A));
  const avatarProfil = A && url ? { ...p, gorunen_avatar: seffaf } : p;

  // Kazanılan çerçeve (premium çerçeve yokken): yeni çizim, varsa premium aura içinde
  if (!t2 && !C && kazanilan) {
    const adK = [etiket, A && tt(AURALAR[A]?.ad)].filter(Boolean).join(" · ");
    return (
      <KazanilanCerceve anahtar={kazanilan} aura={A} boyut={boyut} hareketli={hareketli} className={className} etiket={adK || undefined}>
        <Avatar profile={avatarProfil} boyut={boyut} />
      </KazanilanCerceve>
    );
  }

  // 2. tur premium çerçeve: Cerceve2, varsa premium aura içinde
  const t2Tur = t2;
  if (t2Tur) {
    const ad2 = [t2 ? tt(TUR2_AD[t2]) : etiket, A && tt(AURALAR[A]?.ad)].filter(Boolean).join(" · ");
    return (
      <Cerceve2 tur={t2Tur} aura={A} boyut={boyut} hareketli={hareketli} className={className} etiket={ad2 || undefined}>
        <Avatar profile={avatarProfil} boyut={boyut} />
      </Cerceve2>
    );
  }

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
