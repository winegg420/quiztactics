/**
 * ÇERÇEVE GÖRSELİ — yalnız çizim (durumsuz, veri çekmez). Avatar `children` olarak gelir.
 * Çerçeveyi oyuncuya bağlayan bileşen `oyun/components/CerceveliAvatar.jsx`; ekranlar onu kullanır.
 *
 * <CerceveGorseli anahtar="dukkan_anka" boyut={64} hareketli>{avatar}</CerceveGorseli>
 *
 * Kurallar: 24–160 px her boyutta düzgün · kutu her zaman `boyut` × `boyut` (yerleşim değişmez);
 * süsler kutunun dışına taşar ama sınırlı: üst ≤ %32, yan ≤ %26, alt ≤ %16 (tam kademe) ·
 * 40–55 px yalnız `ana` süsler, merkeze biraz yaklaştırılmış · 40 px altında yalnız renkli halka ·
 * hareket yalnız transform/opacity, ekranda en çok 3 (hareketHakki.js), prefers-reduced-motion'da durağan.
 */
import { cerceveTanimiBul, hareketIster, SUSLER } from "./tanimlar.js";
import { useHareketHakki } from "./hareketHakki.js";
import "./cerceveler.css";

const KUCUK_SINIR = 40;
const ORTA_SINIR = 56;
const KIVILCIMLAR = [[-62, 0], [118, 1.7], [236, 3.1]];
const PIRILTILAR = [[-38, 0], [142, 1.8]];
const TAS_TONLARI = ["pembe", "turkuaz"];

/** Halka kalınlığı (px): çerçevesiz ince, küçükte kalın-yalın, büyükte orantılı. */
export function halkaKalinligi(boyut, cerceveVar) {
  if (!cerceveVar) return Math.max(2, Math.round(boyut * 0.04));
  if (boyut < KUCUK_SINIR) return Math.max(2, Math.round(boyut * 0.1));
  return Math.max(4, Math.round(boyut * 0.085));
}

/** Çerçeve içindeki avatarın çapı (px). */
export function icBoyut(boyut, cerceveVar = true) {
  return Math.max(8, boyut - 2 * halkaKalinligi(boyut, cerceveVar));
}

/** Serbest süsün tek kopyası (x/y merkez, w genişlik — % dış çap). */
function serbestStil(s, sag, orta) {
  const f = orta ? 0.88 : 1;            // orta kademede merkeze yaklaştır + küçült
  let x = sag ? 100 - s.x : s.x;
  let y = s.y;
  x = 50 + (x - 50) * f;
  y = 50 + (y - 50) * f;
  const w = s.w * (orta ? 0.86 : 1);
  const r = (s.r ?? 0) * (sag ? -1 : 1);
  const ayna = sag ? !s.ayna : !!s.ayna;
  return {
    left: `${x - w / 2}%`, top: `${y - w / 2}%`, width: `${w}%`,
    transform: `rotate(${r}deg)${ayna ? " scaleX(-1)" : ""}`,
  };
}

function Sus({ ad, orta }) {
  const s = SUSLER[ad];
  if (!s) return null;
  if (s.aci) {
    const d = orta ? 50 + (s.d - 50) * 0.9 : s.d;
    const w = s.w * (orta ? 0.86 : 1);
    return s.aci.map((a, i) => {
      const yer = { "--_a": `${a}deg`, "--_d": d, "--_w": w, "--_h": (s.boy ?? s.w) * (orta ? 0.86 : 1) };
      if (s.kod === "tas") {
        return (
          <span key={`${ad}${i}`} className="qt-cerceve-yer" style={{ "--_a": `${a}deg` }}>
            <span className="qt-cerceve-tas" data-ton={s.tonlar?.[i] ?? TAS_TONLARI[i % 2]} />
          </span>
        );
      }
      return (
        <span key={`${ad}${i}`} className="qt-cerceve-yer qt-cerceve-yer--d" style={yer}>
          {s.kod === "kristal" && <span className="qt-cerceve-kristal" data-ton={s.ton} />}
          {s.kod === "alev" && (
            <span className="qt-cerceve-alev" style={{ "--_g": `${(i * 0.37) % 1.1}s` }}>
              <img src="/kozmetik/alev.webp" alt="" draggable="false" decoding="async" data-ton={s.ton} />
            </span>
          )}
          {s.kod === "yildiz" && (
            <img className="qt-cerceve-yildiz" src="/kozmetik/yildiz.webp" alt="" draggable="false" decoding="async" />
          )}
        </span>
      );
    });
  }
  const img = (sag) => (
    <img key={sag ? "s" : "l"} src={s.src} alt="" draggable="false" decoding="async"
         className="qt-cerceve-sus" data-ton={s.ton} style={serbestStil(s, sag, orta)} />
  );
  return s.cift ? <>{img(false)}{img(true)}</> : img(false);
}

/**
 * @param {object} o
 * @param {string|null} [o.anahtar]  çerçeve anahtarı (yoksa çerçevesiz ince halka)
 * @param {object} [o.satir]         katalog satırı (nadirlik/kaynak) — tanımsız anahtar için
 * @param {number} [o.boyut=64]      dış çap (px); avatar içeride icBoyut() kadar
 * @param {boolean} [o.hareketli]    animasyon iste (ekranda en çok 3; listelerde verme)
 * @param {boolean} [o.sinirsiz]     3 sınırını atla — YALNIZ önizleme sayfası
 * @param {string} [o.etiket]        erişilebilir ad (ör. "Kraliyet çerçevesi")
 */
export default function CerceveGorseli({ anahtar, satir, boyut = 64, hareketli = false, sinirsiz = false,
  etiket, className = "", children }) {
  const tanim = cerceveTanimiBul(anahtar, satir);
  const kucuk = boyut < KUCUK_SINIR;
  const orta = !kucuk && boyut < ORTA_SINIR;
  const kademe = kucuk ? "kucuk" : orta ? "orta" : "tam";
  const istek = !!(hareketli && hareketIster(tanim) && !kucuk);
  const hak = useHareketHakki(istek && !sinirsiz);
  const oynar = istek && (sinirsiz || hak);
  const k = halkaKalinligi(boyut, !!tanim);
  const susler = kucuk || !tanim?.sus ? [] : tanim.sus.filter((s) => SUSLER[s] && (!orta || SUSLER[s].ana));
  const arka = susler.filter((s) => SUSLER[s].arka);
  const on = susler.filter((s) => !SUSLER[s].arka);
  const efekt = !kucuk ? tanim?.efekt : null;

  return (
    <span className={`qt-cerceve${tanim ? "" : " qt-cerceve--yok"}${kucuk ? " qt-cerceve--kucuk" : ""}${oynar ? " qt-cerceve--oynar" : ""} ${className}`.trim()}
          data-tur={tanim?.tur} data-malzeme={tanim?.malzeme} data-tema={tanim?.tema}
          data-desen={tanim?.desen} data-kademe={kademe}
          style={{ "--_b": `${boyut}px`, "--_k": `${k}px` }}
          {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      {efekt === "aura" && <span className="qt-cerceve-aura" aria-hidden="true" />}
      {efekt === "kozmik" && (
        <span className="qt-cerceve-kozmik" aria-hidden="true"><span className="qt-cerceve-kozmik-toz" /></span>
      )}
      {efekt === "alev" && <span className="qt-cerceve-kor" aria-hidden="true" />}
      {!kucuk && tanim?.yorunge && <span className="qt-cerceve-yorunge" aria-hidden="true" />}
      {arka.length > 0 && <span className="qt-cerceve-arkasus" aria-hidden="true">{arka.map((s) => <Sus key={s} ad={s} orta={orta} />)}</span>}
      <span className="qt-cerceve-halka" aria-hidden="true" />
      <span className="qt-cerceve-ic">{children}</span>
      {!kucuk && tanim?.parilti && <span className="qt-cerceve-parilti" aria-hidden="true" />}
      {!kucuk && tanim?.yorunge && <span className="qt-cerceve-yorunge qt-cerceve-yorunge--on" aria-hidden="true" />}
      {on.length > 0 && <span className="qt-cerceve-onsus" aria-hidden="true">{on.map((s) => <Sus key={s} ad={s} orta={orta} />)}</span>}
      {!kucuk && tanim?.plaka && (
        <span className="qt-cerceve-plaka" aria-hidden="true"><span>{tanim.plaka}</span></span>
      )}
      {kademe === "tam" && tanim?.pirilti && (
        <span className="qt-cerceve-kivilcimlar" aria-hidden="true">
          {PIRILTILAR.map(([a, g], i) => (
            <span key={i} className="qt-cerceve-yer" style={{ "--_a": `${a}deg` }}>
              <span className="qt-cerceve-isik" style={{ "--_g": `${g}s` }} />
            </span>
          ))}
        </span>
      )}
      {kademe === "tam" && tanim?.kivilcim && (
        <span className="qt-cerceve-kivilcimlar" aria-hidden="true">
          {KIVILCIMLAR.map(([a, g], i) => (
            <span key={i} className="qt-cerceve-yer qt-cerceve-yer--dis" style={{ "--_a": `${a}deg` }}>
              <span className="qt-cerceve-kivilcim" style={{ "--_g": `${g}s` }} />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
