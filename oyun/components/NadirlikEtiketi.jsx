// Nadirlik köşe etiketi — TEK kaynak (görsel revizyon, Ida seçimi 25 Eyl 2026:
// tasarim/SECIMLER_GORSEL_REVIZYON.md madde 3, "1 — Köşe etiketi + kalın kenar"). Dükkân (qt-dc-oge),
// koleksiyon (qt-cs-oge) ve satın alma penceresi (JokerSatinAlModal) aynı bileşeni kullanır; kart
// kenarının rengi CSS `:has()` ile bu etiketin `data-nadirlik`'ine göre boyanır
// (oyun/tasarim/ekranlar/dukkan-cerceve.css, cerceve-secici.css). Ayrı dosyada: DukkanAuralar.jsx ↔
// JokerSatinAlModal.jsx birbirini import ettiği için döngü oluşmasın diye.
import { CERCEVE_NADIRLIKLERI } from "../lib/cerceve.js";
import { NADIRLIK_ADI } from "../tasarim/cerceveler/tanimlar.js";
import { tt } from "../lib/dil.js";

export default function NadirlikEtiketi({ nadirlik }) {
  const n = CERCEVE_NADIRLIKLERI.includes(nadirlik) ? nadirlik : "siradan";
  return <span className="qt-dc-nadirlik" data-nadirlik={n}>{tt(NADIRLIK_ADI[n])}</span>;
}
