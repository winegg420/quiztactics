/**
 * DERECELİ ANAHTARI (Paket 14, 3.1) — mod seçiminin üstünde tek anahtar.
 * Dereceli: lig puanı + tam coin. Serbest: puan yok, coin yarı.
 * 23 Eyl 2026 (Ida): iki seçenekli "Serbest | Dereceli" anahtar — hangisinde olduğun her an
 * görünür. Düello girişi, OYNA/Saf Bilgi penceresi, Meydan okumalar, Modlar AYNI bileşen.
 * Görünüm Yön A sekme hapı (qt-sekme); her seçenek 44 px, role="radio".
 * Prop arayüzü AYNI: dereceli · onDegistir(yeniDeger) · className
 * Metinler dil sözlüğünde (oyun/lib/dil.js).
 */
import { useDil } from "../lib/dilKanca.js";
import { sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-ortak.css";

export default function DereceliAnahtari({ dereceli, onDegistir, className = "" }) {
  const { ceviri } = useDil();
  const secenekler = [
    { deger: false, ad: ceviri("Serbest") },
    { deger: true, ad: ceviri("Dereceli") },
  ];
  const tus = (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    onDegistir?.(!dereceli);
  };
  return (
    <div className={sinif("a-dereceli", className)}>
      <div className="qt-sekmeler a-dereceli-secim" role="radiogroup" aria-label={ceviri("Maç türü")}>
        {secenekler.map((s) => {
          const secili = Boolean(dereceli) === s.deger;
          return (
            <button key={String(s.deger)} type="button" role="radio" aria-checked={secili}
                    tabIndex={secili ? 0 : -1} data-dereceli={s.deger ? "1" : "0"}
                    className={sinif("qt-sekme", secili && "qt-sekme--secili")}
                    onClick={() => onDegistir?.(s.deger)} onKeyDown={tus}>
              <span>{s.ad}</span>
            </button>
          );
        })}
      </div>
      <p className="a-dereceli-aciklama">
        {dereceli ? ceviri("Lig puanı + tam coin") : ceviri("Serbest — puan yok, coin yarı")}
      </p>
    </div>
  );
}
