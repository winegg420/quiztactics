// Premium çerçeve ödülü (ör. Ejderha) OYUNCUNUN KENDİ avatarıyla: yuva, hero final kartı, satın alma sayfası ortak görseli.
// Ağır çizim (PremiumAvatarCizim) TEMBEL yüklenir; inerken iskelet, yüklenemezse çerçeve ikonu. Kimlik (profile) Sezon Yolu
// sayfasındaki OdulKimlik bağlamından gelir (profil henüz gelmediyse avatarsız çerçeve çizilir, gelince avatar oturur).
import { Component, createContext, lazy, Suspense, useContext } from "react";
import { QtIkon } from "../index.js";
import { useDil } from "../../lib/dilKanca.js";
import { odulAdi } from "../../lib/sezonYolu.js";
import { premiumSanat } from "../../lib/kozmetik.js";

const PremiumAvatarCizim = lazy(() => import("../../components/PremiumAvatarCizim.jsx"));

/** Sayfa kökünde: { profile } — ödül görselleri oyuncunun avatarını buradan alır. */
export const OdulKimlik = createContext(null);

/** Bu ödül avatarla çizilecek bir premium çerçeve mi? Döner: sanat anahtarı (ör. "ejderha2") ya da null. */
export function odulCerceveSanati(odul) {
  if (!odul || odul.placeholder || odul.tur !== "cerceve") return null;
  const a = odul.veri?.anahtar;
  return typeof a === "string" && a.startsWith("pc_") ? premiumSanat(a) : null;
}

class Sinir extends Component {
  state = { hata: false };
  static getDerivedStateFromError() { return { hata: true }; }
  componentDidCatch(e) { console.error("[Bildim] çerçeve ödül görseli çizilemedi:", e?.message ?? e); }
  render() { return this.state.hata ? this.props.yedek : this.props.children; }
}

const Yedek = ({ boyut }) => (
  <span className="sy-cerceve-yedek" style={{ "--sy-b": `${boyut}px` }} aria-hidden="true">
    <QtIkon ad="madalya" boyut={Math.round(boyut * 0.5)} />
  </span>
);

const Iskelet = ({ boyut }) => (
  <span className="sy-cerceve-iskelet" style={{ "--sy-b": `${boyut}px` }} aria-hidden="true" />
);

export default function CerceveOdulGorsel({ odul, boyut = 40, hareketli = false }) {
  const kimlik = useContext(OdulKimlik);
  const { dil } = useDil();
  const sanat = odulCerceveSanati(odul);
  if (!sanat) return <Yedek boyut={boyut} />;
  return (
    <span className="sy-cerceve-odul" style={{ "--sy-b": `${boyut}px` }} role="img"
      aria-label={odulAdi(odul, dil)}>
      <Sinir yedek={<Yedek boyut={boyut} />}>
        <Suspense fallback={<Iskelet boyut={boyut} />}>
          <PremiumAvatarCizim profile={kimlik?.profile ?? null} boyut={boyut} hareketli={hareketli} premiumCerceve={sanat} />
        </Suspense>
      </Sinir>
    </span>
  );
}
