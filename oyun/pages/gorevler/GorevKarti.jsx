// Görev OYUN KARTI (3'lü yan yana). Ön yüz: büyük ikon kutusu · ad (en çok 2 satır) · zorluk yıldızları · ilerleme · ödül · hazırsa yeşil "AL".
// Arka yüz: altın-krem "TAMAM" kartı. Alınmış görev HEP arka yüzle (altın kenarlı) görünür; AL'a basınca kart rotateY ile döner.
// Kart rengi görev türünden: maç oyna / kazan → mavi · Düello → kırmızı · doğru cevap → yeşil. Mor ve gri yok.
import { QtIkon, QtDugme, QtIlerleme, sinif } from "../../tasarim/index.js";
import { CoinIkon } from "../../components/ParaIkonlari.jsx";
import { tt, aktifDil } from "../../lib/dil.js";
import { kategoriAdi } from "../../lib/kategoriler.js";

// Görev sayacı (quest tipi) → ikon. "maç oyna" için oynat/maç ikonu (konuşma balonu değil).
export const GOREV_IKON = {
  mac_oyna: "oyna",
  mac_kazan: "kupa",
  dogru_soru: "onay",
  duello_mac: "duello",
  duello_galibiyet: "duello",
  kategori_dogru: "hedef",
  farkli_kategori_dogru: "dunya",
};
// Görev sayacı → kart rengi (renk rolleri: mavi = ben/ilerleme · kırmızı = Düello · yeşil = doğru cevap).
export function gorevTonu(sayac) {
  const k = String(sayac ?? "");
  if (k.includes("duello")) return "kirmizi";
  if (k.includes("dogru") || k.includes("soru")) return "yesil";
  if (k.includes("kazan") || k.includes("galibiyet")) return "mavi-koyu";
  return "mavi";
}
const ZORLUK = { kolay: "Kolay|görev", orta: "Orta|görev", zor: "Zor|görev" };
const ZORLUK_YILDIZ = { kolay: 1, orta: 2, zor: 3 };

export const sayiMetni = (n) => Number(n ?? 0).toLocaleString(aktifDil() === "en" ? "en-US" : "tr-TR");
const coinBirimi = (n) => " " + tt("{n} coin", { n: Number(n) || 0 }).replace(/^\S+\s*/, "");

/** Tek satır ödül: "15 · 10 SP" (SP yalnız sezon görünürken). */
export function OdulSatiri({ odul, sezonAcik }) {
  const coin = Number(odul?.coin) || 0;
  const sp = Number(odul?.sp) || 0;
  const spVar = sezonAcik && sp > 0;
  if (!(coin > 0) && !spVar) return null;
  return (
    <span className="gk-odul">
      {coin > 0 && <><CoinIkon boyut={14} /><b>{sayiMetni(coin)}</b><span className="qt-gizli">{coinBirimi(coin)}</span></>}
      {coin > 0 && spVar && <span aria-hidden="true">·</span>}
      {spVar && <b>{sayiMetni(sp)} SP</b>}
    </span>
  );
}

function KucukYildiz({ dolu }) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" focusable="false" aria-hidden="true" className={sinif("gk-zy", dolu && "gk-zy--dolu")}>
      <path d="M12 2.8l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.4l-5.8 3.2 1.3-6.5L2.7 9.6l6.5-.8Z" fill={dolu ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function gorevAdi(g, dil) {
  const ad = dil === "en" ? (g.ad_en || g.ad_tr) : g.ad_tr;
  // Kategori görevi: uzun cümle yerine kısa biçim ("Spor: 10 doğru") — kartta en çok 2 satıra sığsın.
  if (g.sayac === "kategori_dogru" && g.parametre?.kategori) {
    return tt("{k}: {n} doğru", { k: kategoriAdi(g.parametre.kategori), n: Math.max(1, Number(g.hedef) || 1) });
  }
  // "5 farklı kategoride doğru cevap": 3 satıra taşıyor → kısa biçim (tam metin ekran okuyucuda: QtIlerleme etiketi + title).
  if (g.sayac === "farkli_kategori_dogru") return tt("{n} farklı kategori", { n: Math.max(1, Number(g.hedef) || 1) });
  return ad;
}

export default function GorevKarti({ g, gunluk, dil, sezonAcik, alindi, islemde, mesgul, onAl, nabiz, anahtar, sira }) {
  const ad = gorevAdi(g, dil);
  const tamAd = dil === "en" ? (g.ad_en || g.ad_tr) : g.ad_tr;
  const hedef = Math.max(1, Number(g.hedef) || 1);
  const ilerleme = Math.min(Math.max(0, Number(g.ilerleme) || 0), hedef);
  const yuzde = Math.round((ilerleme / hedef) * 100);
  const hazir = Boolean(g.alinabilir) && !alindi;
  const zorluk = gunluk && g.zorluk ? g.zorluk : null;
  const dolu = ZORLUK_YILDIZ[zorluk] ?? 0;
  const sayi = tt("{a} / {b}", { a: alindi ? hedef : ilerleme, b: hedef });
  return (
    <li
      className={sinif("gk-kart", `gk-ton--${gorevTonu(g.sayac)}`, hazir && "gk-kart--hazir", alindi && "gk-kart--cevrik", hazir && nabiz && "qt-h-nabiz")}
      data-gk-anahtar={anahtar}
      style={{ "--gk-sira": sira }}
    >
      <div className="gk-yuzler">
        <div className="gk-yuz gk-on" inert={alindi || undefined} aria-hidden={alindi || undefined}>
          <span className="gk-ik" aria-hidden="true"><QtIkon ad={GOREV_IKON[g.sayac] ?? "hedef"} boyut={30} /></span>
          <b className="gk-ad" title={tamAd}>{ad}</b>
          <span className="gk-zorluk">
            {zorluk && (
              <span className="gk-zy-sira" role="img" aria-label={tt(ZORLUK[zorluk])}>
                {[0, 1, 2].map((i) => <KucukYildiz key={i} dolu={i < dolu} />)}
              </span>
            )}
          </span>
          <span className="gk-ilerle">
            <QtIlerleme canli className="gk-bar" ton="vurgu" deger={yuzde} en={100} etiket={tamAd}
                        aria-valuemax={hedef} aria-valuenow={ilerleme} aria-valuetext={sayi} />
            <b className="gk-sayi" aria-hidden="true">{sayi}</b>
          </span>
          <OdulSatiri odul={g.odul} sezonAcik={sezonAcik} />
          {hazir && (
            <QtDugme tur="dogru" boyut="k" className="gk-al" yukleniyor={islemde} devreDisi={mesgul && !islemde}
                     aria-label={tt("{ad} ödülünü al", { ad })} onClick={onAl}>{tt("Al|görev")}</QtDugme>
          )}
        </div>
        <div className="gk-yuz gk-arka" aria-hidden={!alindi || undefined}>
          <span className="gk-tik" aria-hidden="true"><QtIkon ad="onay" boyut={30} /></span>
          <b className="gk-tamam">{tt("TAMAM")}</b>
          <span className="gk-arka-ad">{ad}</span>
          <OdulSatiri odul={g.odul} sezonAcik={sezonAcik} />
        </div>
      </div>
    </li>
  );
}
