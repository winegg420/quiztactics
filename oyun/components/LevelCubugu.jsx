import { rutbeBul } from "../lib/ranks.js";
import { tt } from "../lib/dil.js";
import { QtIlerleme, QtIkon, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-bilesen.css";

/**
 * P2A — Kendi level'im: "Level N · Rütbe" + bir sonraki level'e XP çubuğu.
 * Veri `profilim` RPC'sinden (profile.level, level_xp, level_gereken); hesap yok.
 * Tasarım A: QtIlerleme (mor). Rütbe adı ranks.js'ten (Dâhi = eski Efsane).
 */
export default function LevelCubugu({ profile, kompakt = false }) {
  const level = Number(profile?.level) || 1;
  const simdi = Math.max(0, Number(profile?.level_xp) || 0);
  const gereken = Math.max(1, Number(profile?.level_gereken) || 0);
  const gerekenVar = Number(profile?.level_gereken) > 0;
  const rutbe = rutbeBul(level);

  return (
    <div className="qt-dk-level">
      {!kompakt && (
        <div className="qt-dk-level-ust">
          <span className="qt-dk-level-ad">
            <QtIkon ad={rutbe.ikon} boyut={18} />
            {tt("Level {n}", { n: level })} · {rutbe.ad}
          </span>
          {gerekenVar && <span className="qt-dk-level-xp qt-sayi">{sayiBicim(simdi)}/{sayiBicim(gereken)} XP</span>}
        </div>
      )}
      <QtIlerleme deger={gerekenVar ? simdi : 0} en={gereken} ton="mor" etiket={tt("Level ilerlemesi")} />
      {gerekenVar && (
        <span className="qt-dk-level-kalan">{tt("Level {n} için {xp} XP", { n: level + 1, xp: sayiBicim(Math.max(0, gereken - simdi)) })}</span>
      )}
    </div>
  );
}
