import { rutbeBul } from "../lib/ranks.js";
import { tt } from "../lib/dil.js";
import { QtIlerleme, QtIkon, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-bilesen.css";

/**
 * P2A — Kendi level'im: "Level N · Rütbe" + bir sonraki level'e XP çubuğu.
 * Veri `profilim` RPC'sinden (profile.level, level_xp, level_gereken); hesap yok.
 * Tasarım A: QtIlerleme (mor). Rütbe adı ranks.js'ten (Dâhi = eski Efsane).
 * `xpSatiri` (Profil kimliği, 10 Eki 2026): XP tek satır "47/130 XP → Lv 28"; alttaki "Level N için X XP" satırı yazılmaz (tekrardı).
 * `canli`: çubuk ilk çizimde dolarak gelir; level'e ≤ %10 kala dolu kısımda parıltı kayar (oyun hissi; yalnız görsel).
 */
export default function LevelCubugu({ profile, kompakt = false, canli = false, levelYok = false, xpSatiri = false }) {
  const level = Number(profile?.level) || 1;
  const simdi = Math.max(0, Number(profile?.level_xp) || 0);
  const gereken = Math.max(1, Number(profile?.level_gereken) || 0);
  const gerekenVar = Number(profile?.level_gereken) > 0;
  const rutbe = rutbeBul(level);
  const yakin = canli && gerekenVar && simdi < gereken && (gereken - simdi) / gereken <= 0.1;

  return (
    <div className="qt-dk-level">
      {!kompakt && (
        <div className="qt-dk-level-ust">
          <span className="qt-dk-level-ad">
            <QtIkon ad={rutbe.ikon} boyut={18} />
            {!levelYok && <>{tt("Level {n}", { n: level })} · </>}{rutbe.ad}
          </span>
          {gerekenVar && (
            <span className="qt-dk-level-xp qt-sayi">
              {xpSatiri ? tt("{xp} XP → Lv {n}", { xp: `${sayiBicim(simdi)}/${sayiBicim(gereken)}`, n: level + 1 }) : <>{sayiBicim(simdi)}/{sayiBicim(gereken)} XP</>}
            </span>
          )}
        </div>
      )}
      <QtIlerleme konturlu={canli} canli={canli} parilti={yakin} deger={gerekenVar ? simdi : 0} en={gereken} ton="mor" etiket={tt("Level ilerlemesi")} />
      {gerekenVar && !xpSatiri && (
        <span className="qt-dk-level-kalan">{tt("Level {n} için {xp} XP", { n: level + 1, xp: sayiBicim(Math.max(0, gereken - simdi)) })}</span>
      )}
    </div>
  );
}
