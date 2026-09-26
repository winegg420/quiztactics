// Turnuva saatleri gösterimi (Paket 12, madde 7): sıradaki turnuvanın
// saati ve bugün kalan turnuvalar. Saat geçince etiket kendiliğinden
// ilerlesin diye 30 sn'de bir tazelenir (sayfa yeniden çizilmese de).
import { useEffect, useState } from "react";
import { bugunKalanTurnuvalar, sonrakiTurnuvaSaati, turnuvaSaatleri, turnuvaSaatiGoster, turnuvaSaatleriniGoster } from "../lib/zaman.js";
import { tt } from "../lib/dil.js";

/** Saat listesi ya da oyuncunun ülkesi sonradan gelirse (zaman.js olayı) bileşen yeniden çizilsin. */
export function useSaatAyari() {
  const [, setAyar] = useState(0);
  useEffect(() => {
    const g = () => setAyar((x) => x + 1);
    window.addEventListener("qt-saat-ayar", g);
    return () => window.removeEventListener("qt-saat-ayar", g);
  }, []);
}

function useDakikaTiki() {
  const [, setTik] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTik((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  useSaatAyari();
}

/** "22:00 TURNUVASI" */
export function TurnuvaSaatEtiketi() {
  useDakikaTiki();
  return <>{turnuvaSaatiGoster(sonrakiTurnuvaSaati())} {tt("TURNUVASI")}</>;
}

/** "Bugün kalan: 20:00 · 22:00 · 24:00" (bittiyse yarının ilki). */
export function BugunKalanTurnuvalar({ className = "bd-turnuva-kalanlar" }) {
  useDakikaTiki();
  const kalan = bugunKalanTurnuvalar();
  return (
    <div className={className}>
      {kalan.length ? (
        <>{tt("Bugün kalan turnuvalar:")} <b>{turnuvaSaatleriniGoster(kalan, " · ")}</b></>
      ) : (
        <>{tt("Bugünkü turnuvalar bitti · yarın ilki")} <b>{turnuvaSaatiGoster(turnuvaSaatleri()[0])}</b></>
      )}
    </div>
  );
}
