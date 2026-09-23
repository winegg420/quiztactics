/**
 * SKILL ROZETİ — her yerde aynı rozet: dükkân, loadout, maç içi skill düğmesi, level ödülü.
 * Kabarık, parlak, yuvarlak rozet (degrade + üst parlama + iç gölge + dış gölge + kenar) ve
 * ortasında tek sembol. Renk skill'in kimliği: `--qt-skill-<tur>` token'ları (tokenlar.css).
 * Semboller: skillSembolleri.jsx (lisans: docs/VARLIK_LISANSLARI.md).
 * <SkillRozeti tur="elli" boyut={40} />
 */
import { SKILL_SEMBOLLERI } from "./skillSembolleri.jsx";
import { QtIkon } from "../tasarim/index.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import "../tasarim/ekranlar/skill-rozet.css";

export default function SkillRozeti({ tur, boyut = 40, className = "", soluk = false }) {
  const Sembol = SKILL_SEMBOLLERI[tur];
  return (
    <span className={`qt-srozet${soluk ? " qt-srozet--soluk" : ""} ${className}`.trim()}
          data-tur={tur} style={{ "--_boyut": `${boyut}px` }} aria-hidden="true">
      <span className="qt-srozet-sembol">
        {Sembol ? <Sembol /> : <QtIkon ad={SKILL_TANIMLARI[tur]?.ikon ?? "soru"} boyut={Math.round(boyut * 0.5)} />}
      </span>
    </span>
  );
}
