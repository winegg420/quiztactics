import { tt } from "../lib/dil.js";
import { QtRozet } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-kart.css";
/**
 * Kendi satırını işaretleyen rozet.
 *
 * Neden ayrı bileşen: sıralama/liste ekranlarında ad ile "sen" metin olarak
 * birleştiriliyordu ("idagg sen"), bazı yerlerde de "(sen)" yazılıyordu.
 * Tek bileşene indirildi; ad ile rozet artık ayrı düğümler.
 * Tasarım A: küçük mor QtRozet. Ekran okuyucu "sen" metnini okur; ek açıklama title'da.
 *
 * Kullanım: {benMi && <SenRozeti />}
 */
export function senAdiMi(ad) {
  return typeof ad === "string" && ad.trim().toLocaleLowerCase("tr") === tt("Sen").toLocaleLowerCase("tr");
}

/** `ad` verilirse ve ad zaten "Sen" ise rozet çizilmez (aynı şey iki kez görünmesin). */
export default function SenRozeti({ metin, ad }) {
  if (senAdiMi(ad)) return null;
  return (
    <QtRozet ton="mor" boyut="k" className="ls-sen" title={tt("bu satır sensin")}>
      {metin ?? tt("sen")}
    </QtRozet>
  );
}
