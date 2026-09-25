// NADİRLİK KART KENARI — görsel revizyon Bölüm 3 (A7). Renk eşyaya değil kartın KENARINA ve ETİKETİNE:
// Sıradan gri · Nadir mavi + "NADİR" · Epik mor + hafif parıltı + "EPİK" · Efsanevi altın + kenarda dolaşan ışık + "EFSANEVİ".
// Gerçek kart sınıflarının (qt-dc-oge dükkân, qt-cs-oge koleksiyon) üstüne ek sınıf + iki süs katmanı koyar.
// Stil "kose": kalın renkli kenar + sol üst köşe etiketi. Stil "bant": ince kenar + altta renkli bant, etiket bantta.
// Hareket: yalnız transform/opacity; kap ekrandayken (Hareket, data-gorunur) ve "hareketi azalt"ta 0,4 hız.
import { NADIRLIK } from "../../palet.js";
import "./nadirlik.css";

export const NADIRLIK_SIRA = ["siradan", "nadir", "epik", "efsanevi"];

/** Kartın içine (ilk çocuk olarak) konan süs katmanları + etiket. */
export function NadirlikSusu({ nadirlik, stil }) {
  const n = NADIRLIK[nadirlik] ?? NADIRLIK.siradan;
  return (
    <>
      {nadirlik === "efsanevi" && <span className="ga-nd-isik" aria-hidden="true"><i /></span>}
      <span className="ga-nd-zemin" aria-hidden="true" />
      {nadirlik === "epik" && <span className="ga-nd-parilti" aria-hidden="true"><i /></span>}
      {(nadirlik !== "siradan" || stil === "bant") && <span className="ga-nd-etiket">{n.ad}</span>}
    </>
  );
}
/** Kart sınıfına eklenecek ad + CSS değişkenleri. */
export const nadirlikSinifi = (nadirlik, stil) => `ga-nd ga-nd--${stil} ga-nd--${nadirlik}`;
export const nadirlikStili = (nadirlik) => {
  const n = NADIRLIK[nadirlik] ?? NADIRLIK.siradan;
  return { "--nd-r": n.renk, "--nd-k": n.koyu, "--nd-a": n.acik };
};
