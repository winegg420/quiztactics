/**
 * SEZONLUK ZAFER ŞERİDİ (Sezon Yolu, 720) — Battle Pass sahibi maçı kazanınca maç sonu sahnesinin ARKASINDA
 * 1,8 sn oynayan altın ışık şeridi + yayılan tek halka. Kaynak: MacSonuKutlama (msk-zemin içinde, z-index -1).
 * Sonucu geciktirmez/örtmez: pointer-events yok, metin ve düğmeler önde. Hareketi azalt: halka kapalı, şerit yumuşakça
 * belirip solar (sezon.css). Yalnız transform/opacity.
 */
import "./sezon.css";

export default function SezonZaferSeridi() {
  return (
    <div className="sz-zafer" aria-hidden="true" data-sezon-zafer="">
      <span className="sz-zafer-serit" />
      <span className="sz-zafer-halka" />
    </div>
  );
}
