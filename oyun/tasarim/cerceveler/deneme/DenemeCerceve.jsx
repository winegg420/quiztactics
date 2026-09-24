/**
 * DENEME ÇERÇEVE — Altın Lig çerçevesinin üç tarz adayı (Ajan B, 24 Eyl 2026). Yalnız /cerceve-onizleme
 * kullanır; oyundaki çerçeveler (CerceveGorseli / tanimlar.js) DEĞİŞMEDİ. Ida tarzı seçince bütün
 * çerçeveler ayrı pakette seçilen tarzda yeniden çizilecek.
 *
 * <DenemeCerceve tarz="cizgi" boyut={64} hareketli>{avatar}</DenemeCerceve>
 *
 *   tarz: "cizgi"    — A: avatarlarla aynı çizim dili (kalın lacivert kontur, düz renk, tek kademe gölge)
 *         "mucevher" — B: degrade metal, kabartma kenar, boncuk dizisi, yüzeyli taşlar, yumuşak gölge
 *         "isik"     — C: A + sıcak hale + arada bir geçen ışık şeridi + kıvılcım (yalnız transform/opacity)
 *
 * Geometri: kutu her zaman boyut × boyut (yerleşim değişmez); koordinat birimi kutunun %1'i, merkez 0,0,
 * halka dış yarıçapı 50. Süsler taşar: üst ≤ %31 (taç), yan ≤ %18 (defne), alt ≤ %12 (plaka).
 * Ayrıntı seviyesi (boyuta göre):
 *   tam  (≥ 56 px): 5 çift yaprak + uç, 3 sivri taç + 3 taş, kurdeleli plaka + yıldız, halkada oluk
 *   orta (40–55 px): 4 iri yaprak, taç tek taşlı, kurdelesiz plaka, kontur 1,4× kalın; kıvılcım yok
 *   kucuk(< 40 px): yalnız halka (kalın, net kontur) — satır içinde taşma yok
 * Katmanlar: arka SVG (hale, defne) → avatar → ön SVG (halka, taç, plaka, ışık).
 */
import { useId } from "react";
import "./deneme-cerceve.css";

const R = 50;
const DAL_R = 55.5;   // defne dalının yarıçapı — halkaya yakın, yana taşma ≤ %18
const rad = (a) => (a * Math.PI) / 180;
/** Kutupsal nokta: θ derece, 0 = tepe, saat yönünde artar. */
const pol = (r, t) => [r * Math.sin(rad(t)), -r * Math.cos(rad(t))];
const f = (n) => Math.round(n * 100) / 100;

export function denemeKademe(boyut) {
  return boyut < 40 ? "kucuk" : boyut < 56 ? "orta" : "tam";
}
/** Halka kalınlığı (birim = kutunun %1'i). */
const KALINLIK = { tam: 9, orta: 10.5, kucuk: 12 };
/** Kontur kalınlığı (birim). Avatar dili: 320 birimde 5 → ~%1,6; küçükte okunur kalsın diye kalınlaşır. */
const KONTUR = { tam: 2.3, orta: 3.2, kucuk: 4.2 };

/** Çerçeve içindeki avatarın çapı (px) — halkanın altına 1 birim girer, arada boşluk kalmaz. */
export function denemeIcBoyut(boyut) {
  const k = KALINLIK[denemeKademe(boyut)];
  return Math.round((boyut * (100 - 2 * k + 2)) / 100);
}

// ——————————————————————— şekiller ———————————————————————
/** Yaprak: tabanı 0,0'da, -y yönüne uzanır. */
function yaprak(L, W) {
  return `M0 0C${f(W * 0.62)} ${f(-L * 0.22)} ${f(W * 0.58)} ${f(-L * 0.72)} 0 ${-L}C${f(-W * 0.58)} ${f(-L * 0.72)} ${f(-W * 0.62)} ${f(-L * 0.22)} 0 0Z`;
}
function yaprakYarim(L, W) {
  return `M0 0C${f(W * 0.62)} ${f(-L * 0.22)} ${f(W * 0.58)} ${f(-L * 0.72)} 0 ${-L}Z`;
}

/** Sol dal yaprakları: [x, y, dönüş, ölçek]. Sağ dal aynası. */
function defneYapraklari(kademe) {
  const r = DAL_R;
  const liste = [];
  if (kademe === "tam") {
    // 5 çift: dış yaprak dışa 27°, iç yaprak halkanın arkasına kıvrılır; uca doğru küçülür
    for (let i = 0; i < 5; i += 1) {
      const t = 213 + i * 17;
      const o = 1 - i * 0.08;
      const [x, y] = pol(r, t);
      liste.push([x, y, t + 63, o, "dis"]);
      const [x2, y2] = pol(r, t + 8);
      liste.push([x2, y2, t + 8 + 122, o * 0.9, "ic"]);
    }
    const [x, y] = pol(r, 297);
    liste.push([x, y, 297 + 84, 0.74, "uc"]);
  } else {
    // 40–55 px: 4 iri yaprak + uç, dışa yalnız 20° (satırda yanındaki yazıya taşmasın)
    [216, 238, 260, 282].forEach((t, i) => {
      const [x, y] = pol(r, t);
      liste.push([x, y, t + 70, 1 - i * 0.07, "dis"]);
    });
    const [x, y] = pol(r, 296);
    liste.push([x, y, 296 + 86, 0.78, "uc"]);
  }
  return liste;
}
function dalYolu(kademe) {
  const [x1, y1] = pol(DAL_R, 200);
  const [x2, y2] = pol(DAL_R, kademe === "tam" ? 300 : 298);
  return `M${f(x1)} ${f(y1)}A${DAL_R} ${DAL_R} 0 0 1 ${f(x2)} ${f(y2)}`;
}

const TAC = "M-24 -46L-29.5 -68.5L-13 -57.5L0 -76.5L13 -57.5L29.5 -68.5L24 -46Q0 -41.5 -24 -46Z";
const TAC_GOLGE = "M1.5 -74.3L13 -57.5L29.5 -68.5L24 -46Q12 -43.4 1.5 -43.2Z";
const TAC_BANT = "M-25.2 -51.5Q0 -56.5 25.2 -51.5L24 -44.2Q0 -48.8 -24 -44.2Z";
const TAC_UCLAR = [[-29.5, -68.5, 3.3], [0, -76.5, 3.8], [29.5, -68.5, 3.3]];

const plakaYolu = (k) => (k === "tam" ? "M-17 45.5h34a4 4 0 0 1 4 4v7.5a4 4 0 0 1 -4 4h-34a4 4 0 0 1 -4 -4v-7.5a4 4 0 0 1 4 -4Z"
  : "M-14.5 45.5h29a3.5 3.5 0 0 1 3.5 3.5v6.5a3.5 3.5 0 0 1 -3.5 3.5h-29a3.5 3.5 0 0 1 -3.5 -3.5v-6.5a3.5 3.5 0 0 1 3.5 -3.5Z");
const KURDELE = "M-16 49L-30.5 51L-26.5 56.2L-31.5 61.5L-15 60Z";

function yildiz(cx, cy, r, ic = 0.45) {
  let d = "";
  for (let i = 0; i < 10; i += 1) {
    const rr = i % 2 ? r * ic : r;
    const [x, y] = pol(rr, i * 36);
    d += `${i ? "L" : "M"}${f(cx + x)} ${f(cy + y)}`;
  }
  return `${d}Z`;
}
/** Dört köşeli kıvılcım (merkez 0,0). */
function kivilcim(r) {
  const q = r * 0.22;
  return `M0 ${-r}Q${q} ${-q} ${r} 0Q${q} ${q} 0 ${r}Q${-q} ${q} ${-r} 0Q${-q} ${-q} 0 ${-r}Z`;
}
const halkaYolu = (ri) => `M0 -50A50 50 0 1 1 0 50A50 50 0 1 1 0 -50ZM0 ${-ri}A${ri} ${ri} 0 1 0 0 ${ri}A${ri} ${ri} 0 1 0 0 ${-ri}Z`;
const yay = (r, t1, t2) => {
  const [x1, y1] = pol(r, t1);
  const [x2, y2] = pol(r, t2);
  return `M${f(x1)} ${f(y1)}A${r} ${r} 0 0 1 ${f(x2)} ${f(y2)}`;
};

// ——————————————————————— renkler ———————————————————————
const C = {
  cizgi: "#0b1220",            // avatarlarla aynı kontur
  altin: "#f6c443", altinAcik: "#ffe38a", altinGolge: "#d8911f", altinKoyu: "#a9660f",
  defne: "#eaa92d", defneGolge: "#c77f15",
  yakut: "#e5484d", yakutAcik: "#ff9ba1", turkuaz: "#35c2c1", turkuazAcik: "#b8f1ef",
  krem: "#fff4d2",
};

// ——————————————————————— A · Çizgi (C'nin tabanı da) ———————————————————————
function CizgiArka({ kademe, sw }) {
  if (kademe === "kucuk") return null;
  const L = kademe === "tam" ? 15.5 : 16.5;
  const W = kademe === "tam" ? 9 : 10;
  const dal = (
    <g>
      <path d={dalYolu(kademe)} fill="none" stroke={C.cizgi} strokeWidth={sw * 2.1} strokeLinecap="round" />
      <path d={dalYolu(kademe)} fill="none" stroke={C.defneGolge} strokeWidth={sw * 0.9} strokeLinecap="round" />
      {defneYapraklari(kademe).map(([x, y, a, o, tur], i) => (
        <g key={i} transform={`translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(o)})`}>
          <path d={yaprak(L, W)} fill={C.defne} stroke={C.cizgi} strokeWidth={sw / o} strokeLinejoin="round" />
          {kademe === "tam" && <path d={yaprakYarim(L, W)} fill={C.defneGolge} />}
          {kademe === "tam" && tur !== "ic" && (
            <path d={`M0 ${-L * 0.14}L0 ${-L * 0.7}`} stroke={C.altinKoyu} strokeWidth={sw * 0.45 / o} strokeLinecap="round" />
          )}
          {kademe === "tam" && <path d={yaprak(L, W)} fill="none" stroke={C.cizgi} strokeWidth={sw / o} strokeLinejoin="round" />}
        </g>
      ))}
    </g>
  );
  return <>{dal}<g transform="scale(-1 1)">{dal}</g></>;
}

function CizgiOn({ kademe, sw, id }) {
  const ri = R - KALINLIK[kademe];
  const tam = kademe === "tam";
  return (
    <>
      <defs>
        <clipPath id={`${id}h`}><path d={halkaYolu(ri)} clipRule="evenodd" /></clipPath>
      </defs>
      {/* Halka: gölge rengi taban + yukarı-sola kaymış açık disk → sağ altta tek kademe gölge (cel) */}
      <g clipPath={`url(#${id}h)`}>
        <rect x="-52" y="-52" width="104" height="104" fill={C.altinGolge} />
        <circle cx="-2.6" cy="-3.4" r="50" fill={C.altin} />
        {tam && <circle r={f((R + ri) / 2)} fill="none" stroke={C.altinKoyu} strokeWidth={sw * 0.5} opacity="0.55" />}
      </g>
      <path d={yay(R - 3.4, 290, 345)} fill="none" stroke={C.altinAcik} strokeWidth={kademe === "kucuk" ? 3 : 2.6} strokeLinecap="round" />
      <circle r={R - sw / 2} fill="none" stroke={C.cizgi} strokeWidth={sw} />
      <circle r={ri} fill="none" stroke={C.cizgi} strokeWidth={sw} />

      {kademe !== "kucuk" && (
        <>
          {/* Taç */}
          <path d={TAC} fill={C.altin} />
          <path d={TAC_GOLGE} fill={C.altinGolge} />
          {tam && <path d="M-25.6 -51.5L-28.4 -64.6" stroke={C.altinAcik} strokeWidth="2" strokeLinecap="round" />}
          <path d={TAC} fill="none" stroke={C.cizgi} strokeWidth={sw} strokeLinejoin="round" />
          <path d={TAC_BANT} fill={C.altinGolge} stroke={C.cizgi} strokeWidth={sw} strokeLinejoin="round" />
          {TAC_UCLAR.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i === 1 ? C.altinAcik : C.altin} stroke={C.cizgi} strokeWidth={sw} />
          ))}
          <ellipse cx="0" cy="-48.6" rx={tam ? 4.4 : 5} ry={tam ? 3.1 : 3.4} fill={C.yakut} stroke={C.cizgi} strokeWidth={sw * 0.8} />
          {tam && <circle cx="-1.4" cy="-49.6" r="1" fill={C.yakutAcik} />}
          {tam && [-13.5, 13.5].map((x) => (
            <circle key={x} cx={x} cy="-47.9" r="2.2" fill={C.turkuaz} stroke={C.cizgi} strokeWidth={sw * 0.6} />
          ))}
          {tam && <path d="M0 -67.5L3 -63L0 -58.5L-3 -63Z" fill={C.turkuaz} stroke={C.cizgi} strokeWidth={sw * 0.6} strokeLinejoin="round" />}

          {/* Plaka */}
          {tam && <path d={KURDELE} fill={C.yakut} stroke={C.cizgi} strokeWidth={sw} strokeLinejoin="round" />}
          {tam && <path d={KURDELE} transform="scale(-1 1)" fill={C.yakut} stroke={C.cizgi} strokeWidth={sw} strokeLinejoin="round" />}
          <path d={plakaYolu(kademe)} fill={C.altin} />
          <path d={tam ? "M-21 53.2h42v3.8a4 4 0 0 1 -4 4h-34a4 4 0 0 1 -4 -4Z" : "M-18 52.5h36v3a3.5 3.5 0 0 1 -3.5 3.5h-29a3.5 3.5 0 0 1 -3.5 -3.5Z"} fill={C.altinGolge} />
          <path d={plakaYolu(kademe)} fill="none" stroke={C.cizgi} strokeWidth={sw} strokeLinejoin="round" />
          <path d={yildiz(0, tam ? 53.2 : 52.4, tam ? 5.2 : 4.6)} fill={C.krem} stroke={C.cizgi} strokeWidth={sw * (tam ? 0.55 : 0.5)} strokeLinejoin="round" />
        </>
      )}
    </>
  );
}

// ——————————————————————— C · Çizgi + Işık ekleri ———————————————————————
function IsikArka({ kademe, id }) {
  if (kademe === "kucuk") return null;
  return (
    <>
      <defs>
        <radialGradient id={`${id}hale`}>
          <stop offset="0.6" stopColor="#ffd45a" stopOpacity="0.7" />
          <stop offset="0.8" stopColor="#ffc53a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffc53a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle r={kademe === "tam" ? 74 : 68} fill={`url(#${id}hale)`} />
    </>
  );
}

function IsikOn({ kademe, id, oynar }) {
  const ri = R - KALINLIK[kademe];
  return (
    <>
      <defs>
        <linearGradient id={`${id}serit`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}isik`}>
          <path d={halkaYolu(ri)} clipRule="evenodd" />
          {kademe !== "kucuk" && <path d={TAC} />}
          {kademe !== "kucuk" && <path d={TAC_BANT} />}
          {kademe !== "kucuk" && <path d={plakaYolu(kademe)} />}
        </clipPath>
      </defs>
      {/* Işık şeridi: halka + taç + plakanın üzerinden geçer (yalnız transform) */}
      <g clipPath={`url(#${id}isik)`}>
        <g className={`dc-serit${oynar ? " dc-serit--oynar" : ""}`}>
          <rect x="-9" y="-95" width={kademe === "tam" ? 18 : 20} height="190" fill={`url(#${id}serit)`} transform="rotate(24)" />
        </g>
      </g>
      {kademe === "tam" && (
        <>
          {/* Konum dış g'de (öznitelik), hareket içteki path'te (CSS transform konumu ezmesin) */}
          <g transform="translate(35 -76)">
            <path className={`dc-kivilcim${oynar ? " dc-kivilcim--oynar" : ""}`} d={kivilcim(6.5)} fill="#fffbe8"
                  stroke={C.cizgi} strokeWidth="1.1" strokeLinejoin="round" />
          </g>
          <g transform="translate(47 -30)">
            <path className={`dc-kivilcim dc-kivilcim--2${oynar ? " dc-kivilcim--oynar" : ""}`} d={kivilcim(5)} fill="#fffbe8"
                  stroke={C.cizgi} strokeWidth="1" strokeLinejoin="round" />
          </g>
        </>
      )}
    </>
  );
}

// ——————————————————————— B · Mücevher ———————————————————————
function MucevherTanim({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}m`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#fff7cf" />
        <stop offset="0.16" stopColor="#ffdd6e" />
        <stop offset="0.42" stopColor="#e3a82a" />
        <stop offset="0.54" stopColor="#b4780f" />
        <stop offset="0.7" stopColor="#f8d25f" />
        <stop offset="0.86" stopColor="#d49520" />
        <stop offset="1" stopColor="#8a560b" />
      </linearGradient>
      <linearGradient id={`${id}mb`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c98d1c" />
        <stop offset="0.5" stopColor="#8f5a0c" />
        <stop offset="1" stopColor="#6b3f06" />
      </linearGradient>
      <linearGradient id={`${id}y`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8a560b" />
        <stop offset="0.42" stopColor="#f7d46a" />
        <stop offset="0.6" stopColor="#fff0b0" />
        <stop offset="1" stopColor="#c98b1c" />
      </linearGradient>
      <radialGradient id={`${id}b`} cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#fffbe6" />
        <stop offset="0.4" stopColor="#f4c24a" />
        <stop offset="1" stopColor="#7a4a08" />
      </radialGradient>
      <radialGradient id={`${id}yk`} cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ffd6da" />
        <stop offset="0.3" stopColor="#ff4f61" />
        <stop offset="0.72" stopColor="#b0122b" />
        <stop offset="1" stopColor="#560612" />
      </radialGradient>
      <radialGradient id={`${id}sf`} cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#dff0ff" />
        <stop offset="0.3" stopColor="#4a97ff" />
        <stop offset="0.72" stopColor="#1638a8" />
        <stop offset="1" stopColor="#0a1a55" />
      </radialGradient>
      <radialGradient id={`${id}in`} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#f5ead0" />
        <stop offset="1" stopColor="#a88a52" />
      </radialGradient>
      <radialGradient id={`${id}pr`}>
        <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <filter id={`${id}g`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="1.4" stdDeviation="1.1" floodColor="#3a2204" floodOpacity="0.45" />
      </filter>
    </defs>
  );
}

function MucevherArka({ kademe, id }) {
  if (kademe === "kucuk") return null;
  const L = kademe === "tam" ? 15.5 : 16.5;
  const W = kademe === "tam" ? 9 : 10;
  const dal = (
    <g>
      <path d={dalYolu(kademe)} fill="none" stroke="#7a4a08" strokeWidth={kademe === "tam" ? 2.4 : 3} strokeLinecap="round" />
      {defneYapraklari(kademe).map(([x, y, a, o], i) => (
        <g key={i} transform={`translate(${f(x)} ${f(y)}) rotate(${f(a)}) scale(${f(o)})`}>
          <path d={yaprak(L, W)} fill={`url(#${id}y)`} stroke="#6b3f06" strokeWidth={0.9 / o} strokeLinejoin="round" />
          <path d={`M0 ${-L * 0.1}L0 ${-L * 0.78}`} stroke="#fff3c0" strokeWidth={0.8 / o} strokeLinecap="round" opacity="0.8" />
        </g>
      ))}
    </g>
  );
  return (
    <>
      <MucevherTanim id={id} />
      <g filter={`url(#${id}g)`}>{dal}<g transform="scale(-1 1)">{dal}</g></g>
    </>
  );
}

function MucevherOn({ kademe, id }) {
  const ri = R - KALINLIK[kademe];
  const tam = kademe === "tam";
  const orta = (R + ri) / 2;
  return (
    <>
      <MucevherTanim id={`${id}o`} />
      <g filter={kademe === "kucuk" ? undefined : `url(#${id}og)`}>
        {/* Halka: degrade metal + kabartma (dış/iç koyu kenar, üst-sol ışık, alt-sağ yansıma) */}
        <path d={halkaYolu(ri)} fillRule="evenodd" fill={`url(#${id}om)`} />
        {tam ? (
          <>
            <circle r={orta} fill="none" stroke="#7a4a08" strokeWidth="4.2" opacity="0.55" />
            {Array.from({ length: 24 }, (_, i) => {
              const [x, y] = pol(orta, i * 15 + 7.5);
              return <circle key={i} cx={f(x)} cy={f(y)} r="1.85" fill={`url(#${id}ob)`} />;
            })}
          </>
        ) : (
          <circle r={orta} fill="none" stroke="#7a4a08" strokeWidth={kademe === "kucuk" ? 1.6 : 1.4} opacity="0.6" />
        )}
        <circle r={R - 0.6} fill="none" stroke="#5e3605" strokeWidth={kademe === "kucuk" ? 2 : 1.2} />
        <circle r={ri + 0.4} fill="none" stroke="#5e3605" strokeWidth={kademe === "kucuk" ? 2 : 1.2} />
        <path d={yay(R - 2, 285, 350)} fill="none" stroke="#fffbe6" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
        <path d={yay(ri + 1.8, 110, 160)} fill="none" stroke="#fff3c0" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />

        {kademe !== "kucuk" && (
          <>
            {/* Taç */}
            <path d={TAC} fill={`url(#${id}om)`} stroke="#5e3605" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M-24.6 -50L-28 -64.5M-11.5 -55.8L-1.4 -70.8" stroke="#fffbe6" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
            <path d={TAC_BANT} fill={`url(#${id}omb)`} stroke="#5e3605" strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M-23.6 -50.2Q0 -54.8 23.6 -50.2" fill="none" stroke="#f8d25f" strokeWidth="0.9" opacity="0.9" />
            {TAC_UCLAR.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} fill={`url(#${id}oin)`} stroke="#6b3f06" strokeWidth="0.7" />
            ))}
            <ellipse cx="0" cy="-48.6" rx={tam ? 4.8 : 5.2} ry={tam ? 3.4 : 3.6} fill={`url(#${id}oyk)`} stroke="#5e3605" strokeWidth="0.8" />
            <path d="M-2.6 -50.1L-0.4 -51.2L0.6 -49.8Z" fill="#fff" opacity="0.9" />
            {tam && [-13.5, 13.5].map((x) => (
              <g key={x}>
                <circle cx={x} cy="-47.9" r="2.4" fill={`url(#${id}osf)`} stroke="#5e3605" strokeWidth="0.6" />
                <circle cx={x - 0.8} cy="-48.7" r="0.7" fill="#fff" opacity="0.9" />
              </g>
            ))}
            {tam && (
              <g>
                <path d="M0 -68L3.3 -63L0 -58L-3.3 -63Z" fill={`url(#${id}osf)`} stroke="#5e3605" strokeWidth="0.6" strokeLinejoin="round" />
                <path d="M0 -68L1 -63L0 -58L-3.3 -63Z" fill="#fff" opacity="0.28" />
              </g>
            )}

            {/* Plaka */}
            {tam && <path d={KURDELE} fill={`url(#${id}oyk)`} stroke="#4a0710" strokeWidth="0.8" strokeLinejoin="round" />}
            {tam && <path d={KURDELE} transform="scale(-1 1)" fill={`url(#${id}oyk)`} stroke="#4a0710" strokeWidth="0.8" strokeLinejoin="round" />}
            <path d={plakaYolu(kademe)} fill={`url(#${id}om)`} stroke="#5e3605" strokeWidth="1.1" strokeLinejoin="round" />
            <path d={tam ? "M-18 47.3h36" : "M-15 47.2h30"} stroke="#fffbe6" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
            <path d={yildiz(0, tam ? 53.6 : 52.6, tam ? 5 : 4.6)} fill={`url(#${id}omb)`} />
            <path d={yildiz(0, tam ? 53.2 : 52.2, tam ? 5 : 4.6)} fill="none" stroke="#fff3c0" strokeWidth="0.6" opacity="0.8" />
          </>
        )}
      </g>
      {/* Parlama noktaları (durağan) */}
      {kademe !== "kucuk" && <circle cx="-30" cy="-36" r={tam ? 5 : 6} fill={`url(#${id}opr)`} />}
      {tam && <path d={kivilcim(3.8)} transform="translate(-30 -36)" fill="#fff" />}
    </>
  );
}

/**
 * @param {object} o
 * @param {"cizgi"|"mucevher"|"isik"} o.tarz
 * @param {number} [o.boyut=64]   dış çap (px) — kutu hep boyut × boyut
 * @param {boolean} [o.hareketli] yalnız "isik": ışık şeridi + kıvılcım oynar (azaltılmış harekette durur)
 */
export default function DenemeCerceve({ tarz = "cizgi", boyut = 64, hareketli = false, etiket, className = "", children }) {
  const hamId = useId();
  const id = `dc${hamId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const kademe = denemeKademe(boyut);
  const sw = KONTUR[kademe];
  const ic = denemeIcBoyut(boyut);
  const oynar = tarz === "isik" && hareketli && kademe !== "kucuk";

  return (
    <span className={`dc dc--${tarz} dc--${kademe} ${className}`.trim()} style={{ "--dc-b": `${boyut}px`, "--dc-ic": `${ic}px` }}
          {...(etiket ? { role: "img", "aria-label": etiket } : {})}>
      <svg className="dc-svg dc-svg--arka" viewBox="-84 -84 168 168" aria-hidden="true" focusable="false">
        {tarz === "isik" && <IsikArka kademe={kademe} id={id} />}
        {tarz === "mucevher" ? <MucevherArka kademe={kademe} id={id} /> : <CizgiArka kademe={kademe} sw={sw} />}
      </svg>
      <span className="dc-ic">{children}</span>
      <svg className="dc-svg dc-svg--on" viewBox="-84 -84 168 168" aria-hidden="true" focusable="false">
        {tarz === "mucevher" ? <MucevherOn kademe={kademe} id={id} /> : <CizgiOn kademe={kademe} sw={sw} id={id} />}
        {tarz === "isik" && <IsikOn kademe={kademe} id={id} oynar={oynar} />}
      </svg>
    </span>
  );
}
