// "Sıradaki büyük ödül" şeridi (sahnenin alt yuvasında, ince): bir sonraki kilometre taşının (her 5. seviye + son seviye) ÜCRETLİ ödülü
// ve kaç seviye kaldığı — "Sıradaki büyük ödül: Seviye N, <ad> · K seviye". Dokununca yol o satıra kayar.
// Yukarıdaki seviyelerin hepsi geçildiyse (sonraki taş yoksa) hiç çizilmez.
import { tt } from "../../lib/dil.js";
import { odulAdi } from "../../lib/sezonYolu.js";
import { OdulGorsel, tasMi } from "./OdulGorsel.jsx";

/** Sonraki kilometre taşı seviyesi (yoksa null). */
export function sonrakiTas(seviye, toplam) {
  for (let n = Number(seviye) + 1; n <= toplam; n += 1) if (tasMi(n, toplam)) return n;
  return null;
}

export default function SiradakiOdul({ durum, toplam, harita, dil, onGit }) {
  const n = sonrakiTas(durum.seviye, toplam);
  if (n == null) return null;
  const odul = harita.get(`${n}:ucretli`) ?? harita.get(`${n}:ucretsiz`);
  if (!odul) return null;
  const kalan = n - Number(durum.seviye);
  const ad = odul.placeholder ? tt("Yakında") : odulAdi(odul, dil);
  return (
    <button type="button" className="sy-sirada" onClick={() => onGit(n)}
      aria-label={`${tt("Sıradaki büyük ödül")}: ${tt("{n}. seviye", { n })}, ${ad}. ${tt("{n} seviye kaldı", { n: kalan })}`}>
      <span className="sy-sirada-yuva" data-nadirlik={odul.nadirlik ?? "siradan"}><OdulGorsel odul={odul} boyut={22} /></span>
      <span className="sy-sirada-metin">
        <span className="sy-sirada-etiket">{tt("Sıradaki büyük ödül")}:</span>{" "}
        <b>{tt("Seviye {n}", { n })}, {ad}</b>{" "}
        <span className="sy-sirada-kalan">· {tt(kalan === 1 ? "1 seviye" : "{n} seviye", { n: kalan })}</span>
      </span>
    </button>
  );
}
