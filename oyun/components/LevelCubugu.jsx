import { rutbeBul } from "../lib/ranks.js";
import { tt } from "../lib/dil.js";
import "./level.css";

/**
 * P2A — Kendi level'im: "Level N · Rütbe" + bir sonraki level'e XP çubuğu.
 * Veri `profilim` RPC'sinden (profile.level, level_xp, level_gereken); hesap yok.
 * Profil ve ana sayfa hero paneli kullanır.
 */
export default function LevelCubugu({ profile, kompakt = false }) {
  const level = Number(profile?.level) || 1;
  const simdi = Math.max(0, Number(profile?.level_xp) || 0);
  const gereken = Math.max(1, Number(profile?.level_gereken) || 0);
  const gerekenVar = Number(profile?.level_gereken) > 0;
  const rutbe = rutbeBul(level);
  const yuzde = Math.max(0, Math.min(100, (simdi / gereken) * 100));

  return (
    <div className="bd-level-cubuk" style={{ "--rutbe": rutbe.renk, "--rutbe-metin": rutbe.metinRenk }}>
      {!kompakt && (
        <div className="bd-level-ust">
          <span className="bd-level-ad">{tt("Level {n}", { n: level })} · {rutbe.ad}</span>
          {gerekenVar && <span className="bd-level-kalan">{simdi}/{gereken} XP</span>}
        </div>
      )}
      <div className="bd-sonuc-rutbe-bar" role="progressbar" aria-label={tt("Level ilerlemesi")}
           aria-valuemin={0} aria-valuemax={gereken} aria-valuenow={simdi}>
        <div className="dolgu" style={{ width: `${gerekenVar ? yuzde : 0}%` }} />
      </div>
      {gerekenVar && (
        <span className="bd-level-kalan">{tt("Level {n} için {xp} XP", { n: level + 1, xp: Math.max(0, gereken - simdi) })}</span>
      )}
    </div>
  );
}
