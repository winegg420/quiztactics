// "Sıradaki büyük ödül" şeridi: bir sonraki kilometre taşının (her 5. seviye + son seviye) ÜCRETLİ ödülü ve kaç seviye kaldığı.
// Dokununca yol o sütuna kayar. Yukarıdaki seviyelerin hepsi geçildiyse (sonraki taş yoksa) hiç çizilmez.
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
      <span className="sy-sirada-yuva" data-nadirlik={odul.nadirlik ?? "siradan"}><OdulGorsel odul={odul} boyut={30} /></span>
      <span className="sy-sirada-metin">
        <small>{tt("Sıradaki büyük ödül")}</small>
        <b>{tt("Seviye {n}", { n })} · {ad}</b>
      </span>
      <span className="sy-cip sy-cip--koyu">{tt("{n} seviye kaldı", { n: kalan })}</span>
    </button>
  );
}
