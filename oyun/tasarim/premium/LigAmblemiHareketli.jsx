// Lig amblemi — HAREKETLİ hâl (≥ 48 px, üst ligler ışıldar/dönen hâle). ligAmblemi.jsx TEMBEL yükler (ana paket dışı).
import { LigAmblemiB } from "../gorsel-revizyon/a/cizim/lig.jsx";

export default function LigAmblemiHareketli({ lig, boyut }) {
  return <span aria-hidden="true" className="pp-amblem-ic"><LigAmblemiB lig={lig} boyut={boyut} hareketli /></span>;
}
