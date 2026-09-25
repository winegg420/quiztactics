// Bölüm 13 — Premium çerçeve + arka plan hizalaması (tur "karar"): mevcut 7 premium çerçeve ve 6 arka plan,
// ÖNCE = oyundaki gerçek bileşen (PremiumCerceve / Cerceve2), SONRA = stil rehberine hizalanmış hâl.
// Oyundaki dosyalar DEĞİŞMEZ: hizalama burada sarmalayıcıyla yapılır.
//  · Sonbahar, Galaksi, Sakura (SVG + CSS): kalın #0b1220 dış/iç kontur + tek beyaz parlama (avatar kontur oranı);
//    48 px ve altında kaybolan kimlik için tek imza süsü (yaprak / gezegen / çiçek).
//  · Ejderha, Sönmeyen Alev, Şimşek, Kraliyet (WebGL): çizim ve karakter AYNEN; efekt tuvali tam çözünürlükte
//    (ölçek 0,7–0,85 → 1): Sönmeyen Alev'in pikselli alev kenarı bundan geliyordu.
//  · 6 arka plan: küçük boyda (≤ 71 px) parçacıklar 1,45× iri, sahne doygunluğu/kontrastı hafif yüksek, iç kenarda
//    ince koyu kontur — 40–64 px'te ne olduğu okunur. Büyük boyda (≥ 72) aynen.
import Avatar from "../../../../src/components/Avatar.jsx";
import PremiumCerceve, { useSeffafAvatar } from "../../premium/PremiumCerceve.jsx";
import { CERCEVELER } from "../../premium/sanatCerceveler.jsx";
import { AURALAR, AURA_SIRASI } from "../../premium/sanatAuralar.jsx";
import Cerceve2, { TUR2 } from "../../premium/tur2/Cerceve2.jsx";
import { sanatAdresi } from "../../premium/tur2/sanat.js";
import { GrBolum, GrAday } from "../secim.jsx";
import GrCerceve, { kademeBul } from "./GrCerceve.jsx";
import { kutup, K, cz, METAL, TAS, yayYol } from "./cizim/araclar.js";
import { profil } from "./ortak.jsx";

const CSS_CERCEVE = ["sonbahar", "galaksi", "sakura"];
const T2_CERCEVE = ["ejderha", "alev", "simsek", "kraliyet"];

// ---------------------------------------------------------------- imza süsleri (48 px ve altı)
const PEMBE = { acik: "#ffd6f0", orta: "#ff7ab8", koyu: "#e0729a" };
function imza(cerceve) {
  const [x, y] = kutup(47, 318);
  if (cerceve === "sakura") {
    const yap = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5.2" rx="3.6" ry="5.2" transform="rotate(${a})" fill="${PEMBE.orta}" ${cz(1.3)}/>`).join("");
    return `<g transform="translate(${x} ${y}) scale(1.05)">${yap}<circle r="2.6" fill="${METAL.altin.orta}" ${cz(1)}/><circle cx="-1.8" cy="-6.4" r="1" fill="#fff"/></g>`;
  }
  if (cerceve === "sonbahar") {
    const yol = "M0 -10L2.6 -5L6.8 -6.4L5.4 -1.8L9.2 0.4L4.4 2.4L5 6.4L0.8 4.4L0 9L-0.8 4.4L-5 6.4L-4.4 2.4L-9.2 0.4L-5.4 -1.8L-6.8 -6.4L-2.6 -5Z";
    return `<g transform="translate(${x} ${y}) rotate(-20)"><path d="${yol}" fill="${METAL.bronz.orta}" ${cz(1.3)}/><path d="M0 9V-6" stroke="${METAL.bronz.kenar}" stroke-width="1"/><path d="M-3 -4L-1 -7" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></g>`;
  }
  // galaksi: halkalı gezegen
  return `<g transform="translate(${x} ${y})"><circle r="6.4" fill="${TAS.ametist}" ${cz(1.3)}/><path d="M-6.4 0A6.4 6.4 0 0 0 5 4" fill="none" stroke="${TAS.ametistKoyu}" stroke-width="2.4"/>`
    + `<ellipse rx="11" ry="3.2" transform="rotate(-20)" fill="none" stroke="${K}" stroke-width="3.2"/><ellipse rx="11" ry="3.2" transform="rotate(-20)" fill="none" stroke="${METAL.altin.orta}" stroke-width="1.4"/>`
    + `<circle cx="-2.2" cy="-2.4" r="1.4" fill="#fff"/></g>`;
}

/** SVG + CSS premium çerçeve, hizalanmış: gerçek PremiumCerceve + üstte kontur/parlama/imza katmanı. */
function HizaliCss({ cerceve, boyut, hareketli, children }) {
  const k = kademeBul(boyut);
  const kw = k === "kucuk" ? 3 : 2.4;
  const kat = `<circle r="50.6" fill="none" ${cz(kw)}/><circle r="43.2" fill="none" ${cz(kw * 0.85)}/>`
    + `<path d="${yayYol(48.4, 300, 324)}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`
    + (k === "kucuk" ? imza(cerceve) : "");
  return (
    <span className="grb-hiza" style={{ "--b": `${boyut}px` }}>
      <PremiumCerceve cerceve={cerceve} boyut={boyut} hareketli={hareketli}>{children}</PremiumCerceve>
      <span className="grb-hiza-kat" aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<svg viewBox="-85 -85 170 170">${kat}</svg>` }} />
    </span>
  );
}

/** WebGL premium çerçeve, hizalanmış: aynı çizim + aynı gölgelendirici, efekt tuvali tam çözünürlükte. */
function HizaliT2({ tur, boyut, hareketli, children }) {
  const T = TUR2[tur];
  return (
    <GrCerceve sanatUrl={(k) => sanatAdresi(tur, k)} anahtar={`hiza:${tur}`} boyut={boyut} hareketli={hareketli}
               efekt={{ ad: T.efekt, a: T.a, n: T.n(), olcek: 1, durgunT: T.durgunT }} etiket={`${T.ad} (hizalı)`}>
      {children}
    </GrCerceve>
  );
}

function Cerceve({ ad, sonra, boyut, hareketli = false, i = 0 }) {
  const av = <Avatar profile={profil(i)} boyut={boyut} />;
  if (CSS_CERCEVE.includes(ad)) {
    return sonra ? <HizaliCss cerceve={ad} boyut={boyut} hareketli={hareketli}>{av}</HizaliCss>
      : <PremiumCerceve cerceve={ad} boyut={boyut} hareketli={hareketli}>{av}</PremiumCerceve>;
  }
  return sonra ? <HizaliT2 tur={ad} boyut={boyut} hareketli={hareketli}>{av}</HizaliT2>
    : <Cerceve2 tur={ad} boyut={boyut} hareketli={hareketli}>{av}</Cerceve2>;
}

function ArkaPlan({ ad, sonra, boyut, hareketli = false, i = 0 }) {
  const p = profil(i);
  const seffaf = useSeffafAvatar(p.gorunen_avatar, true);
  const ic = (
    <PremiumCerceve aura={ad} boyut={boyut} hareketli={hareketli}>
      <Avatar profile={{ ...p, gorunen_avatar: seffaf }} boyut={boyut} />
    </PremiumCerceve>
  );
  return sonra ? <span className="grb-hiza-ap">{ic}</span> : ic;
}

function OnceSonra({ Bilesen, ad }) {
  const taraf = (sonra) => (
    <figure className="grb-os-taraf">
      <figcaption className={`grb-os-etiket${sonra ? " grb-os-etiket--sonra" : ""}`}>{sonra ? "SONRA" : "ÖNCE (oyundaki)"}</figcaption>
      <div className="grb-os-buyuk"><Bilesen ad={ad} sonra={sonra} boyut={112} hareketli i={0} /></div>
      <div className="grb-os-kucukler">
        {[64, 48, 40].map((b) => <span key={b} className="grb-boy"><span className="grb-boy-g"><Bilesen ad={ad} sonra={sonra} boyut={b} i={0} /></span><span className="grb-boy-e">{b}</span></span>)}
      </div>
    </figure>
  );
  return <div className="grb-os">{taraf(false)}{taraf(true)}</div>;
}

const CERCEVE_NOT = {
  sonbahar: "Kalın lacivert dış/iç kontur + tek parlama; 48 px ve altında imza yaprağı (önce düz kahve halka görünüyordu).",
  galaksi: "Kalın kontur + parlama; küçük boyda imza gezegeni (önce mor halkadan ibaretti).",
  sakura: "Kalın kontur + parlama; küçük boyda imza kiraz çiçeği (önce pembe halkadan ibaretti).",
  ejderha: "Karakter aynen korundu; yalnız efekt tuvali tam çözünürlükte (göz/alev ışığı daha keskin).",
  alev: "Pikselli kenar düzeldi: alev tuvali 0,7 yerine tam çözünürlükte çiziliyor; çizim aynen.",
  simsek: "Çizim aynen; yıldırım tuvali tam çözünürlükte (dallar daha ince ve keskin).",
  kraliyet: "Karakter aynen korundu; altın yansıması tuvali tam çözünürlükte.",
};

export default function B13Hizalama() {
  return (
    <GrBolum no={13} baslik="Premium çerçeve + arka plan hizalaması" tur="karar"
             aciklama="Oyundaki 7 premium çerçeve ve 6 arka plan: solda oyundaki hâli (gerçek bileşen), sağda stil rehberine hizalanmış hâli; büyük boy hareketli, 64 · 48 · 40 durağan. Kraliyet ve Ejderha'nın karakteri korunur. Her biri için ayrı Girsin / Girmesin."
             ic={2} gosterilen={1}
             elenen="Çerçevelerde 'baştan çizim' yönü denenmedi (brief: yalnız hizalama). Arka planda 'küçük boyda parçacık sayısını azaltma' yönü elendi: 40 px'te sahne boş göründü; iri parçacık + kontrast yönü gösteriliyor."
             zayif="Ejderha, Kraliyet ve Şimşek'te fark yalnız efekt keskinliği — gözle ince; karakteri korumak için çizime dokunulmadı. Sonbahar/Galaksi/Sakura'nın degradeli bantları duruyor (yalnız kontur ve imza eklendi); tam düz hücre gölgeye çevirmek baştan çizim demek. Arka planlarda önce/sonra farkı küçük: 40–48 px'te avatar sahnenin çoğunu örttüğü için okunurluk kazancı sınırlı.">
      {[...CSS_CERCEVE, ...T2_CERCEVE].map((ad) => (
        <GrAday key={ad} kod={`c-${ad}`} baslik={`${CSS_CERCEVE.includes(ad) ? CERCEVELER[ad].ad : TUR2[ad].ad} — çerçeve`} fikir={CERCEVE_NOT[ad]} genis
                testler={{ kucuk: true, avatar: true, hedef: true, mobil: true }}>
          <OnceSonra Bilesen={Cerceve} ad={ad} />
        </GrAday>
      ))}
      {AURA_SIRASI.map((ad) => (
        <GrAday key={ad} kod={`a-${ad}`} baslik={`${AURALAR[ad].ad} — arka plan`} genis
                fikir="Küçük boyda (≤ 71 px) parçacıklar 1,45× iri, sahne biraz daha doygun ve kontrastlı, iç kenarda ince koyu kontur. 72 px ve üstü aynen."
                testler={{ kucuk: true, avatar: true, mobil: true }}>
          <OnceSonra Bilesen={ArkaPlan} ad={ad} />
        </GrAday>
      ))}
    </GrBolum>
  );
}

