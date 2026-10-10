// "Sıradaki büyük ödül" KARTI (sahnenin alt yuvasında; 2 Eki 2026: ince şerit → kart): bir sonraki kilometre taşının (her 5. seviye + son seviye)
// ÜCRETLİ ödülü — nadirlik çerçeveli büyük görsel (48 px) + "Sv N: <ad>" + "K seviye kaldı"; altın-krem iç. Dokununca yol o satıra kayar.
// Yukarıdaki seviyelerin hepsi geçildiyse (sonraki taş yoksa) hiç çizilmez.
import { tt } from "../../lib/dil.js";
import { odulAdi } from "../../lib/sezonYolu.js";
import { OdulGorsel, tasMi } from "./OdulGorsel.jsx";
import { odulCerceveSanati } from "./CerceveOdulGorsel.jsx";

/** Sonraki kilometre taşı seviyesi (yoksa null). */
export function sonrakiTas(seviye, toplam) {
  for (let n = Number(seviye) + 1; n <= toplam; n += 1) if (tasMi(n, toplam)) return n;
  return null;
}

export default function SiradakiOdul({ durum, toplam, harita, dil, onGit, kompakt = false }) {
  const n = sonrakiTas(durum.seviye, toplam);
  if (n == null) return null;
  const odul = harita.get(`${n}:ucretli`) ?? harita.get(`${n}:ucretsiz`);
  if (!odul) return null;
  const kalan = n - Number(durum.seviye);
  const ad = odul.placeholder ? tt("Yakında") : odulAdi(odul, dil);
  // 10 Eki 2026: hero'nun içinde tek satır hap (alt yuvadaki kart kalktı; sıkışıklık giderildi)
  if (kompakt) {
    return (
      <button type="button" className="sy-sirada-hap" onClick={() => onGit(n)}
        aria-label={`${tt("Sıradaki büyük ödül")}: ${tt("{n}. seviye", { n })}, ${ad}. ${tt("{n} seviye kaldı", { n: kalan })}`}>
        <span className="sy-sirada-hap-yuva" data-tur={odul.placeholder ? "yakinda" : odul.tur} data-nadirlik={odul.nadirlik ?? "siradan"}>
          <OdulGorsel odul={odul} boyut={odulCerceveSanati(odul) ? 26 : 20} />
        </span>
        <span className="sy-sirada-hap-metin"><b>{tt("Sv {n}: {ad}", { n, ad })}</b> · {tt("{n} seviye kaldı", { n: kalan })}</span>
      </button>
    );
  }
  return (
    <button type="button" className="sy-sirada sy-sirada--kart" onClick={() => onGit(n)}
      aria-label={`${tt("Sıradaki büyük ödül")}: ${tt("{n}. seviye", { n })}, ${ad}. ${tt("{n} seviye kaldı", { n: kalan })}`}>
      <span className="sy-sirada-yuva" data-tur={odul.placeholder ? "yakinda" : odul.tur} data-nadirlik={odul.nadirlik ?? "siradan"}><OdulGorsel odul={odul} boyut={odulCerceveSanati(odul) ? 40 : 32} /></span>
      <span className="sy-sirada-metin">
        <span className="sy-sirada-etiket">{tt("Sıradaki büyük ödül")}</span>
        <b>{tt("Sv {n}: {ad}", { n, ad })}</b>
        <span className="sy-sirada-kalan">{tt("{n} seviye kaldı", { n: kalan })}</span>
      </span>
    </button>
  );
}
