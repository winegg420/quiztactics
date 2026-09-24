// Premium önizleme çizim yardımcıları (PremiumCerceve + sanat dosyaları ortak). Birim: kutunun %1'i, merkez 0,0.
export const RAD = Math.PI / 180;
export const f = (n) => Math.round(n * 100) / 100;
/** Kutupsal nokta: a derece, 0 = tepe, saat yönünde. */
export const kutup = (r, a) => [f(r * Math.sin(a * RAD)), f(-r * Math.cos(a * RAD))];
/** Çember yayı (saat yönünde a0 → a1). */
export function yay(r, a0, a1) {
  const [x0, y0] = kutup(r, a0);
  const [x1, y1] = kutup(r, a1);
  const buyuk = ((((a1 - a0) % 360) + 360) % 360) > 180 ? 1 : 0;
  return `M${x0} ${y0}A${r} ${r} 0 ${buyuk} 1 ${x1} ${y1}`;
}
/** Yay boyunca incelen/kalınlaşan şerit (ejder gövdesi, dal). */
export function serit(r, a0, a1, w0, w1, adim = 28, dalga = 0, dalgaSayi = 0) {
  const dis = [];
  const ic = [];
  for (let i = 0; i <= adim; i += 1) {
    const t = i / adim;
    const a = a0 + (a1 - a0) * t;
    const w = w0 + (w1 - w0) * t;
    const rr = r + dalga * Math.sin(t * Math.PI * 2 * dalgaSayi);
    dis.push(kutup(rr + w / 2, a));
    ic.push(kutup(rr - w / 2, a));
  }
  return `M${dis.map((p) => p.join(" ")).join("L")}L${ic.reverse().map((p) => p.join(" ")).join("L")}Z`;
}
/** Tohumlu rastgele (her çizimde aynı dağılım). */
export function tohum(metin) {
  let a = 0;
  for (const c of String(metin)) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const yuzde = (u) => f(((u + 85) / 170) * 100);
const zaman = (s, g) => ({ ...(s ? { animationDuration: `${s}s` } : {}), ...(g != null ? { animationDelay: `${g}s` } : {}) });

/** Kutunun tamamını kaplayan SVG katmanı (−85…85). `a` hareket sınıfı, `o` dönüş/ölçek kökeni (birim). */
export function Katman({ z = "on", a, s, g, o = [0, 0], stil, children }) {
  return (
    <span className={`pc-k pc-k--${z}${a ? ` pc-o pc-a-${a}` : ""}`}
          style={{ transformOrigin: `${yuzde(o[0])}% ${yuzde(o[1])}%`, ...zaman(s, g), ...stil }}>
      <svg viewBox="-85 -85 170 170" aria-hidden="true" focusable="false">{children}</svg>
    </span>
  );
}

/**
 * Küçük hareketli parça: yalnız kendi kutusu kadar katman (GPU'da ucuz). Çizim GENEL birimlerle yapılır
 * (sanki halkanın tepesindeymiş gibi); `aci` bütün parçayı merkez çevresinde döndürür (sabit).
 * kutu = [x0, y0, w, h] (birim) · koken = hareket kökeni (birim, varsayılan alt orta).
 */
export function Oge({ z = "on", aci = 0, kutu, koken, a, s, g, sinif, stil, children }) {
  const [x0, y0, w, h] = kutu;
  const k = koken ?? [x0 + w / 2, y0 + h];
  return (
    <span className={`pc-k pc-k--${z}`} style={aci ? { transform: `rotate(${f(aci)}deg)` } : undefined}>
      <span className={`pc-o${a ? ` pc-a-${a}` : ""}${sinif ? ` ${sinif}` : ""}`}
            style={{
              left: `${yuzde(x0)}%`, top: `${yuzde(y0)}%`, width: `${f(w / 1.7)}%`, height: `${f(h / 1.7)}%`,
              transformOrigin: `${f(((k[0] - x0) / w) * 100)}% ${f(((k[1] - y0) / h) * 100)}%`, ...zaman(s, g), ...stil,
            }}>
        <svg viewBox={`${x0} ${y0} ${w} ${h}`} aria-hidden="true" focusable="false">{children}</svg>
      </span>
    </span>
  );
}

/** Merkez çevresinde dönen grup (yörünge): içindeki Oge'ler onunla döner. */
export function Yorunge({ z = "on", s = 12, ters = false, g, children }) {
  return <span className={`pc-k pc-k--${z} pc-o pc-a-${ters ? "don-ters" : "don"}`} style={zaman(s, g)}>{children}</span>;
}

/** 4 köşeli parıltı yıldızı (birim). */
export function Yildiz4({ x = 0, y = 0, r = 3, fill = "#fff", op = 1 }) {
  const i = r * 0.22;
  return <path d={`M${x} ${y - r}L${x + i} ${y - i}L${x + r} ${y}L${x + i} ${y + i}L${x} ${y + r}L${x - i} ${y + i}L${x - r} ${y}L${x - i} ${y - i}Z`} fill={fill} opacity={op} />;
}

