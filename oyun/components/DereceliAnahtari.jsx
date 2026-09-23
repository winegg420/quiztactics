/**
 * DERECELİ ANAHTARI (Paket 14, 3.1) — mod seçiminin üstünde tek anahtar.
 * Açık: lig puanı + tam coin. Kapalı (Serbest): puan yok, coin yarı.
 * Yön A: QtAnahtar (role="switch", bütün satır dokunulur, 44 px).
 * Prop arayüzü AYNI (Düello girişi, Meydan okumalar, Modlar kullanıyor):
 *   dereceli · onDegistir(yeniDeger) · className
 * Metinler dil sözlüğünde (oyun/lib/dil.js).
 */
import { useDil } from "../lib/dilKanca.js";
import { QtAnahtar, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-ortak.css";

export default function DereceliAnahtari({ dereceli, onDegistir, className = "" }) {
  const { ceviri } = useDil();
  return (
    <QtAnahtar
      acik={Boolean(dereceli)}
      onDegis={onDegistir}
      etiket={ceviri("Dereceli")}
      aciklama={dereceli ? ceviri("Lig puanı + tam coin") : ceviri("Serbest — puan yok, coin yarı")}
      className={sinif("a-dereceli", className)}
    />
  );
}
