/**
 * ÇERÇEVELİ AVATAR — avatar gösterilen HER YERDE bu kullanılır (ana sayfa, üst çubuk, profil, maç
 * şeridi, maç sonu, lig tablosu, arkadaşlar, meydan okumalar, mesajlar). Takılı çerçeve sunucudan
 * (`oyuncu_kartlari`, oyun/lib/cerceve.js — toplu + önbellekli) gelir; görünüm oyun/tasarim/cerceveler/.
 *
 * <CerceveliAvatar profile={p} userId={p.id} boyut={64} hareketli />
 *
 * - `boyut` dış çaptır (çerçeve dahil); avatar içeride.
 * - `cerceve` verilirse sorgu yapılmaz (null = çerçevesiz). Kart elde varsa `kart` ver.
 * - `hareketli`: yalnız tekil/önemli yerlerde (ana sayfa kartı, profil başı, maç şeridi). Listelerde verme.
 * - AURA (481): avatarın arkasındaki tema katmanı da buradan çözülür — çağıran dosya bir şey yapmaz.
 *   `aura` verilirse o; `kart` içinde `aura` alanı varsa o; yoksa oyuncu kartı (toplu + önbellekli
 *   oyuncu_kartlari) okunur. Katman sırası: aura (arkada) → avatar → çerçeve (önde).
 * - ALTIN LİG (Ida, 24 Eyl 2026 — /premium-onizleme 2. tur): Altın Lig çerçevesi (lig_altin) her zaman
 *   2. tur hâliyle çizilir (PremiumAvatarCizim › Cerceve2 "altinlig", tembel; yüklenirken bugünkü çerçeve;
 *   WebGL yoksa önceki "Çizgi" tarzı). Eski dükkân aurası takılıysa bugünkü çerçeve kalır. Önceki kural
 *   (550: /cerceve-onizleme tarzı, DenemeCerceve) bunun yerine geçti; tarz seçimi artık okunmaz.
 * - PREMIUM (560): takılı premium çerçeve / premium aura (oyuncu kartında premium_cerceve / premium_aura)
 *   varsa önizlemedeki sanatla çizilir — PremiumAvatarCizim TEMBEL yüklenir (ana paket büyümez); inerken
 *   bugünkü çizim. Premium çerçeve bugünkü çerçevenin yerine geçer; premium aura avatarın İÇ zeminidir
 *   (bugünkü çerçeve kalır). `premiumCerceve` / `premiumAura` (kalem anahtarı, ör. "pc_galaksi") verilirse
 *   onlar (null = yok). `aura` elle verilirse (eski aura önizlemesi) premium aura karttan okunmaz.
 *   Migration 560 yoksa kartta alan yok → bugünkü çizim.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import Avatar from "../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import { cerceveTanimiBul } from "../tasarim/cerceveler/tanimlar.js";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { tt } from "../lib/dil.js";
import { premiumSanat } from "../lib/kozmetik.js";

const PremiumAvatarCizim = lazy(() => import("./PremiumAvatarCizim.jsx"));

const alanVar = (o, ad) => o != null && Object.prototype.hasOwnProperty.call(o, ad);

export default function CerceveliAvatar({ profile, userId, boyut = 44, cerceve, kart, aura, premiumCerceve, premiumAura,
  hareketli = false, className = "" }) {
  const kimlik = userId ?? profile?.id ?? profile?.user_id ?? null;
  const cerceveVerildi = cerceve !== undefined || kart !== undefined;
  const auraVerildi = aura !== undefined || alanVar(kart, "aura");
  // 560: premium elde mi — elle verildi, kartta alan var ya da çağıran çerçeve + aurayı elle verdi (önizleme)
  const premiumVerildi = premiumCerceve !== undefined || premiumAura !== undefined || alanVar(kart, "premium_cerceve")
    || (cerceve !== undefined && aura !== undefined);
  // Çerçeve ya da aura elde değilse kart okunur (aynı karedeki istekler tek RPC, oturum boyunca önbellek)
  const verildi = cerceveVerildi && auraVerildi && premiumVerildi;
  const [okunan, setOkunan] = useState(null);   // { cerceve, nadirlik, aura, premium_cerceve, premium_aura }
  const [tazele, setTazele] = useState(0);

  useEffect(() => {
    if (verildi || !kimlik) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === kimlik) setTazele((x) => x + 1); });
  }, [verildi, kimlik]);

  useEffect(() => {
    if (verildi || !kimlik) { setOkunan(null); return undefined; }
    let aktif = true;
    oyuncuKarti(kimlik)
      .then((k) => { if (aktif) setOkunan(k ? { cerceve: k.cerceve ?? null, nadirlik: k.cerceve_nadirlik, aura: k.aura ?? null,
                                                premium_cerceve: k.premium_cerceve ?? null, premium_aura: k.premium_aura ?? null } : null); })
      .catch((e) => { console.error("[Bildim] çerçeve okunamadı:", e?.message ?? e); if (aktif) setOkunan(null); });
    return () => { aktif = false; };
  }, [verildi, kimlik, tazele]);

  const anahtar = cerceve !== undefined ? cerceve : kart !== undefined ? (kart?.cerceve ?? null) : (okunan?.cerceve ?? null);
  const nadirlik = kart?.cerceve_nadirlik ?? okunan?.nadirlik;
  const auraAnahtar = aura !== undefined ? aura : auraVerildi ? (kart?.aura ?? null) : (okunan?.aura ?? null);
  const tanim = cerceveTanimiBul(anahtar, { nadirlik });
  const etiket = tanim?.ad ? tt("{ad} çerçevesi", { ad: tt(tanim.ad) }) : undefined;

  // 560: premium kalem → sanat anahtarı (bilinmeyen/yok → null)
  const pcAnahtar = premiumCerceve !== undefined ? premiumCerceve
    : alanVar(kart, "premium_cerceve") ? kart.premium_cerceve
    : (cerceve !== undefined && aura !== undefined) ? null : (okunan?.premium_cerceve ?? null);
  const paAnahtar = premiumAura !== undefined ? premiumAura
    : aura !== undefined ? null
    : alanVar(kart, "premium_aura") ? kart.premium_aura : (okunan?.premium_aura ?? null);
  const pc = premiumSanat(pcAnahtar);
  const pa = premiumSanat(paAnahtar);

  const ligAltin = tanim?.anahtar === "lig_altin" && !auraAnahtar;
  const bugunku = (
    <CerceveGorseli anahtar={anahtar} satir={{ nadirlik }} aura={auraAnahtar} boyut={boyut} hareketli={hareketli}
                    className={className} etiket={etiket}>
      <Avatar profile={profile ?? {}} boyut={icBoyut(boyut, !!tanim)} />
    </CerceveGorseli>
  );
  if (pc || pa || ligAltin) {
    return (
      <Suspense fallback={bugunku}>
        <PremiumAvatarCizim profile={profile} boyut={boyut} hareketli={hareketli} premiumCerceve={pc} premiumAura={pa}
                            cerceveAnahtar={anahtar} cerceveSatir={{ nadirlik }} cerceveVar={!!tanim} ligAltin={ligAltin}
                            etiket={etiket} className={className} />
      </Suspense>
    );
  }
  return bugunku;
}
