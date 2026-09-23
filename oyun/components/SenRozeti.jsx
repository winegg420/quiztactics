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
export default function SenRozeti({ metin }) {
  return (
    <QtRozet ton="mor" boyut="k" className="ls-sen" title={tt("bu satır sensin")}>
      {metin ?? tt("sen")}
    </QtRozet>
  );
}
