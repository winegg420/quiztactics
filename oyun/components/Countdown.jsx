import { useEffect, useState } from "react";
import { sonrakiTurnuvaZamani, geriSayim } from "../lib/zaman.js";
import { tt } from "../lib/dil.js";

// `bicim="prototip"` (Arayüz Yenileme, 20 Eyl 2026): turnuva kartındaki
// `.countdown` işaretlemesi. Sayaç mantığı aynı — yalnız kabuk değişir.
export default function Countdown({ onSifir, bicim = "klasik" }) {
  const [kalan, setKalan] = useState(() => geriSayim(sonrakiTurnuvaZamani()));

  useEffect(() => {
    const id = setInterval(() => {
      const k = geriSayim(sonrakiTurnuvaZamani());
      setKalan(k);
      if (k.toplamSn === 0 && onSifir) onSifir();
    }, 1000);
    return () => clearInterval(id);
  }, [onSifir]);

  const pad = (n) => String(n).padStart(2, "0");

  if (bicim === "prototip") {
    return (
      <div className="countdown" aria-label={tt("Turnuvaya kalan süre")}>
        <div><b>{pad(kalan.saat)}</b><small>{tt("SAAT")}</small></div>
        <span>:</span>
        <div><b>{pad(kalan.dakika)}</b><small>{tt("DAKİKA")}</small></div>
        <span>:</span>
        <div><b>{pad(kalan.saniye)}</b><small>{tt("SANİYE")}</small></div>
      </div>
    );
  }

  return (
    <div className="geri-sayim-rakamlar">
      <div className="gs-kutu">
        <div className="deger">{pad(kalan.saat)}</div>
        <div className="etiket">{tt("SAAT")}</div>
      </div>
      <div className="gs-kutu">
        <div className="deger">{pad(kalan.dakika)}</div>
        <div className="etiket">{tt("DAKİKA")}</div>
      </div>
      <div className="gs-kutu">
        <div className="deger">{pad(kalan.saniye)}</div>
        <div className="etiket">{tt("SANİYE")}</div>
      </div>
    </div>
  );
}
