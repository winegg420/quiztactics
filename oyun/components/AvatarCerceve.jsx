// ============================================================
// ESKİ AD — AvatarCerceve artık CerceveliAvatar'a yönlenir (rozet + çerçeve paketi, 23 Eyl 2026).
// Eski nadirlik halkası (giyilen eşyadan) ve lig çerçevesi, yeni `cerceveler` kataloğuna taşındı;
// takılı çerçeve oyuncu_kartlari'ndan gelir. Yeni kodda doğrudan CerceveliAvatar kullan.
// ============================================================
import CerceveliAvatar from "./CerceveliAvatar.jsx";

/** @param {{profile: object, boyut?: number, userId?: string, hareketli?: boolean}} o */
export default function AvatarCerceve({ profile, boyut = 42, userId, hareketli = false }) {
  return <CerceveliAvatar profile={profile} boyut={boyut} userId={userId} hareketli={hareketli} />;
}
