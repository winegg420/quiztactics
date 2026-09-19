// ============================================================
// MAÇ ÜST ŞERİDİ (Paket 41 B + E + H) — bütün maç ekranlarında aynı yer, aynı görünüm:
//   sol: maçtan çık (X)   ·   orta: mod rozeti   ·   sağ: ses aç/kapa
// Klasik, Saf Bilgi, Düello, Grup, Turnuva ve Çalışma turu bunu kullanır.
// Dokunma hedefleri 44×44 (Paket 41 J). Ses tercihi bildim_ses (Profil › Ayarlar ile ortak).
// ============================================================
import Ikon from "./Ikon.jsx";
import SesDugmesi from "./SesDugmesi.jsx";
import { tt } from "../lib/dil.js";

export default function MacUstSerit({ onCik, cikisEtiketi, rozet }) {
  return (
    <div className="bd-mac-ust-serit">
      {onCik ? (
        <button type="button" className="bd-mac-cikis" aria-label={cikisEtiketi ?? tt("Maçtan çık")} onClick={onCik}>
          <Ikon ad="carpi" boyut={18} />
        </button>
      ) : (
        <span className="bd-mac-ust-bosluk" aria-hidden="true" />
      )}
      {rozet ? <span className="bd-mac-mod-rozet">{rozet}</span> : <span />}
      <SesDugmesi className="bd-mac-ses" />
    </div>
  );
}
