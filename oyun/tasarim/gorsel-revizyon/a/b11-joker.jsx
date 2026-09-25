// Bölüm 11 — Joker ikonları: stil rehberine HİZALAMA (yeni set değil). Önce (oyundaki SkillRozeti) / sonra
// (cizim/joker.jsx); her joker için Girsin / Girmesin.
import { GrAday, GrBolum } from "../secim.jsx";
import SkillRozeti from "../../../components/SkillRozeti.jsx";
import { JOKER_AD, JokerIkon } from "./cizim/joker.jsx";

const TURLER = ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans", "sigorta", "cifte_puan"];

function OnceSonra({ tur }) {
  return (
    <div className="ga-kutu">
      <div className="ga-oncesonra">
        <span><small>Önce</small><SkillRozeti tur={tur} boyut={56} /><SkillRozeti tur={tur} boyut={32} /></span>
        <span><small>Sonra</small><JokerIkon tur={tur} boyut={56} /><JokerIkon tur={tur} boyut={32} /></span>
      </div>
      <div className="ga-joker-set" aria-label="Setin geri kalanıyla">
        {TURLER.map((t) => <span key={t} className={t === tur ? "ga-joker-bu" : undefined}><JokerIkon tur={t} boyut={32} /></span>)}
      </div>
    </div>
  );
}

export default function B11Joker() {
  return (
    <GrBolum no={11} baslik="Joker ikonları — hizalama" tur="karar"
      aciklama="Yeni set yok: her jokerin rengi ve sembolü aynı. Değişen dil: degrade + cam hilali + plastik parlaklık yerine düz renk + hücre gölgesi, disk ve sembolde kalın lacivert kontur, tek beyaz parlama, altta koyu dudak. Her biri için Girsin / Girmesin."
      ic={4} gosterilen={1}
      elenen="Metal kenarlı disk (rozetlerle karıştı) · yuvarlatılmış kare karo (avatar karolarıyla karıştı) · diskisiz yalnız sembol (maç zemininde renk kimliği kayboldu, 32 px'te zayıf)"
      zayif="Semboller oyundakiyle aynı (Phosphor, MIT); yeniden çizilmedi — yalnız kontur ve gölge dili değişti. 2X yazısının konturu küçük boyda kalın.">
      {TURLER.map((t) => (
        <GrAday key={t} kod={`joker-${t}`} baslik={JOKER_AD[t]} testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true }}>
          <OnceSonra tur={t} />
        </GrAday>
      ))}
    </GrBolum>
  );
}
