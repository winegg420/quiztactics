/**
 * ROZET MADALYONU — kademe malzemesinde madalyon (bronz · gümüş · altın · elmas) + ortada grup sembolü.
 * Skill rozetiyle aynı aile (kabarık, parlak, kenarlı). Kademe yalnız renkle anlatılmaz: kenardaki
 * nokta sayısı (1–4) ve süsleme (gümüş iç hat, altın boncuk kenar, elmas faset + ışıltı) de değişir.
 * Gizli rozet kazanılana kadar "?" silüeti; kilitli rozet soluk.
 *
 * <RozetMadalyonu grup="duello" kademe="altin" boyut={64} />
 * <RozetMadalyonu grup="gizli" gizli boyut={40} />
 */
import { ROZET_SEMBOLLERI } from "./rozetSembolleri.jsx";
import "../tasarim/ekranlar/rozet-madalyon.css";

export const KADEMELER = ["bronz", "gumus", "altin", "elmas"];
const PIP = { bronz: 1, gumus: 2, altin: 3, elmas: 4 };

/** Grup anahtarı → sembol anahtarı (sözleşmedeki grup adları farklıysa burada eşlenir). */
const GRUP_SEMBOL = {
  level: "level", klasik: "klasik", klasik_galibiyet: "klasik", duello: "duello", duello_galibiyet: "duello",
  seri: "seri", gunluk_seri: "seri", kategori: "kategori", ustalik: "kategori", kategori_ustaligi: "kategori",
  turnuva: "turnuva", lig: "lig", ozel: "ozel", ozel_an: "ozel", sosyal: "sosyal", gizli: "gizli",
};

/**
 * @param {object} o
 * @param {string} o.grup          rozet grubu (sembolü seçer)
 * @param {string} [o.kademe]      bronz|gumus|altin|elmas
 * @param {number} [o.boyut=48]
 * @param {boolean} [o.kilitli]    henüz kazanılmadı (soluk)
 * @param {boolean} [o.gizli]      gizli ve kazanılmadı → "?" silüeti
 * @param {string} [o.etiket]      erişilebilir ad; yoksa süs (aria-hidden)
 * @param {import("react").ReactNode} [o.sembol] grup sembolü yerine özel sembol (ör. kategori ikonu)
 */
export default function RozetMadalyonu({ grup, kademe = "bronz", boyut = 48, kilitli = false, gizli = false,
  etiket, sembol, className = "" }) {
  const k = KADEMELER.includes(kademe) ? kademe : "bronz";
  const silik = gizli;   // gizli + kazanılmamış → madalyon kademesi de gizlenir
  const Sembol = ROZET_SEMBOLLERI[silik ? "gizli" : (GRUP_SEMBOL[grup] ?? grup)] ?? ROZET_SEMBOLLERI.level;
  const kucuk = boyut < 40;
  return (
    <span className={`qt-madalyon${kucuk ? " qt-madalyon--kucuk" : ""} ${className}`.trim()}
          data-kademe={silik ? "gizli" : k}
          data-durum={silik ? "gizli" : kilitli ? "kilitli" : "kazanildi"}
          style={{ "--_b": `${boyut}px` }}
          {...(etiket ? { role: "img", "aria-label": etiket } : { "aria-hidden": "true" })}>
      <span className="qt-madalyon-yuz">
        <span className="qt-madalyon-sembol">{!silik && sembol ? sembol : <Sembol />}</span>
      </span>
      {!kucuk && !silik && (
        <span className="qt-madalyon-pipler">
          {Array.from({ length: PIP[k] }, (_, i) => <span key={i} />)}
        </span>
      )}
      {!kucuk && !silik && k === "elmas" && <span className="qt-madalyon-isilti" />}
    </span>
  );
}
