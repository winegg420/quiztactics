// 1062: maç sonu "Ort. cevap 6,2 sn · rakip 8,1 sn" — Klasik, Saf Bilgi, Ortak Hazine.
// Veri sunucudan (mac_sonu_ozet / kasa_durum › ort_cevap = { ben, rakip } ms, tek ortalama). Soru bazlı süre YOK.
// Veri yoksa (eski maç / kimse cevaplamadı) satır hiç çizilmez; yalnız bir tarafta veri varsa yalnız o taraf yazılır.
import { tt, aktifDil } from "../lib/dil.js";

const sn = (ms) => {
  const metin = (Math.round(Number(ms) / 100) / 10).toFixed(1);
  return aktifDil() === "en" ? metin : metin.replace(".", ",");
};
const gecerli = (ms) => ms != null && Number.isFinite(Number(ms));

/** Satır metni ya da null (veri yok). MacOzetSatiri de aynı metni hap olarak kullanır. */
export function ortCevapMetni(veri) {
  const ben = gecerli(veri?.ben) ? sn(veri.ben) : null;
  const rakip = gecerli(veri?.rakip) ? sn(veri.rakip) : null;
  if (!ben && !rakip) return null;
  return ben && rakip ? tt("Ort. cevap {a} sn · rakip {b} sn", { a: ben, b: rakip })
    : ben ? tt("Ort. cevap {a} sn", { a: ben })
    : tt("Rakip ort. cevap {b} sn", { b: rakip });
}

export default function OrtCevapSatiri({ veri }) {
  const metin = ortCevapMetni(veri);
  if (!metin) return null;
  return <p className="msk-ort-cevap" aria-label={`${tt("Ortalama cevap süresi")}: ${metin}`}>{metin}</p>;
}
