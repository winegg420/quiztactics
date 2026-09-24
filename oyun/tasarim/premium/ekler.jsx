/**
 * PREMIUM EKLER (yalnız /premium-onizleme):
 *   AltinIsimPlakasi — ad gerçek metal altın gibi (koyu → parlak altın, ince koyu kenar, arada geçen parıltı),
 *                      altın çerçeveli koyu plakanın içinde. Görünüm: premium.css › pp-plaka.
 *   LigAmblemi       — isim yanında duran küçük lig rozeti (Bronz · Gümüş · Altın · Elmas · Efsane);
 *                      çerçeveden bağımsız: lig çerçevesi takmayan oyuncunun da ligi okunur.
 */
// LigAmblemi 560'tan beri ayrı dosyada (oyun ana paketi yalnız onu alır); buradan aynı adlarla dışa verilir.
export { LIGLER, LIG_ADI, LigAmblemi } from "./ligAmblemi.jsx";

export function AltinIsimPlakasi({ children, boyut = "o", hareketli = true, className = "" }) {
  const ad = typeof children === "string" ? children : "";
  return (
    <span className={`pp-plaka pp-plaka--${boyut}${hareketli ? " pp-plaka--oynar" : ""} ${className}`.trim()}>
      <span className="pp-plaka-uc" aria-hidden="true" />
      <span className="pp-altin" data-ad={ad}>{children}</span>
      <span className="pp-plaka-uc" aria-hidden="true" />
    </span>
  );
}
