/**
 * PREMIUM ÇERÇEVELER (8) — yalnız /premium-onizleme. Elle çizilmiş katmanlı SVG (dış görsel yok).
 * Her çerçeve: { ad, aciklama, Defs, Arka, On } — k = "tam" | "orta" | "kucuk" (PremiumCerceve.jsx).
 * Birim: kutunun %1'i, merkez 0,0; halka bandı 43–50, avatar ≤ 43. Hareketli parçalar Oge/Katman/Yorunge.
 */
import { Katman, Oge, Yildiz4, Yorunge, f, kutup, serit, tohum, yay } from "./cizim.jsx";

// ---------------- ortak ----------------
const LG = ({ id, d, x1 = 0, y1 = 0, x2 = 0, y2 = 1 }) => (
  <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
    {d.map(([o, c, op], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />)}
  </linearGradient>
);
const RG = ({ id, d, cx = 0.5, cy = 0.5, r = 0.5, fx, fy }) => (
  <radialGradient id={id} cx={cx} cy={cy} r={r} {...(fx != null ? { fx, fy } : {})}>
    {d.map(([o, c, op], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={op ?? 1} />)}
  </radialGradient>
);
const u = (id, ad) => `url(#${id}${ad})`;
const ayna = (x, y, w, h) => [-(x + w), y, w, h];

/** Metal halka: dış kontur, degrade bant, üst-sol parlaklık, iç kenar. */
function Halka({ id, bant, dis = "#0b1220", icKenar = "#0b1220", rim, rimG = 1.3, genislik = 7, isik = 0.55 }) {
  return (
    <>
      <circle r="50.4" fill="none" stroke={dis} strokeWidth="1.6" />
      <circle r="46.6" fill="none" stroke={u(id, bant)} strokeWidth={genislik} />
      {rim && <circle r="49.6" fill="none" stroke={u(id, rim)} strokeWidth={rimG} />}
      {rim && <circle r="43.7" fill="none" stroke={u(id, rim)} strokeWidth={rimG * 0.9} />}
      <path d={yay(48.6, 290, 25)} fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity={isik} />
      <path d={yay(44.6, 300, 350)} fill="none" stroke="#fff" strokeWidth=".6" strokeLinecap="round" opacity={isik * 0.6} />
      <path d={yay(48.4, 110, 200)} fill="none" stroke="#000" strokeWidth="1.2" strokeLinecap="round" opacity=".25" />
      <circle r="43.1" fill="none" stroke={icKenar} strokeWidth="1.2" />
    </>
  );
}
/** Halkada dolaşan ışık (dönen katman). */
function Parilti({ s = 6, renk = "#fff", genislik = 7, g }) {
  return (
    <Katman z="on" a="don" s={s} g={g}>
      <circle r="46.6" fill="none" stroke={renk} strokeWidth={genislik} strokeDasharray="26 267" strokeLinecap="round" opacity=".16" />
      <circle r="46.6" fill="none" stroke={renk} strokeWidth={genislik * 0.45} strokeDasharray="10 283" strokeDashoffset="-8" strokeLinecap="round" opacity=".7" />
      <circle r="48.6" fill="none" stroke="#fff" strokeWidth=".7" strokeDasharray="6 299" strokeDashoffset="-10" strokeLinecap="round" opacity=".95" />
    </Katman>
  );
}

// =====================================================================
// 1. EJDERHA
// =====================================================================
const EJ_ON = [[16, 62], [128, 186], [246, 292]];
const EJ_ARKA = [[62, 128], [186, 246]];

function EjderGovde({ id, a0, a1, w = 8, sade = false }) {
  const pullar = [];
  const dikenler = [];
  if (!sade) {
    for (let a = a0 + 3; a < a1 - 1; a += 5) {
      const [x, y] = kutup(52.2, a);
      pullar.push(<path key={a} transform={`translate(${x} ${y}) rotate(${a})`} d="M-2 -.7Q0 1.7 2 -.7" fill="none" stroke="#5a0a0a" strokeWidth=".6" opacity=".85" />);
    }
    for (let a = a0 + 5; a < a1 - 2; a += 11) {
      dikenler.push(<path key={a} d={`M${kutup(54.4, a - 1.9).join(" ")}L${kutup(60.2, a + 0.6).join(" ")}L${kutup(54.4, a + 2.1).join(" ")}Z`} fill={u(id, "e-diken")} stroke="#2a0505" strokeWidth=".5" strokeLinejoin="round" />);
    }
  }
  return (
    <g>
      {dikenler}
      <path d={serit(51, a0, a1, w, w)} fill={u(id, "e-pul")} stroke="#2a0505" strokeWidth=".9" strokeLinejoin="round" />
      <path d={yay(51 - w / 2 + 1.1, a0 + 0.5, a1 - 0.5)} fill="none" stroke={u(id, "e-karin")} strokeWidth={sade ? 1.3 : 2.1} />
      {!sade && <path d={yay(51 - w / 2 + 1.1, a0 + 0.5, a1 - 0.5)} fill="none" stroke="#a8650f" strokeWidth="2.1" strokeDasharray=".35 1.9" />}
      {!sade && <path d={yay(51 + 0.6, a0 + 0.8, a1 - 0.8)} fill="none" stroke="#ffb49a" strokeWidth="1.1" strokeLinecap="round" opacity=".35" />}
      <path d={yay(51 + w / 2 - 1.2, a0 + 1, a1 - 1)} fill="none" stroke="#ff9a78" strokeWidth=".5" opacity=".6" />
      {pullar}
    </g>
  );
}

function EjderKanat({ id }) {
  return (
    <g>
      <path d="M-24 -42L-46 -66L-58 -82Q-63 -70 -76 -72Q-73 -60 -83 -50Q-75 -42 -76 -28Q-58 -34 -40 -30Q-30 -34 -24 -42Z" fill={u(id, "e-zar")} stroke="#2a0406" strokeWidth=".9" strokeLinejoin="round" />
      <path d="M-46 -66Q-60 -70 -70 -66M-46 -66Q-64 -58 -76 -48M-46 -66Q-58 -48 -68 -34" fill="none" stroke="#ff8a5c" strokeWidth=".5" opacity=".45" />
      <path d="M-24 -42L-46 -66" stroke="#3a0708" strokeWidth="3" strokeLinecap="round" />
      <path d="M-46 -66L-58 -82M-46 -66L-76 -72M-46 -66L-83 -50M-46 -66L-76 -28" stroke="#3a0708" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-25 -43L-45 -66M-47 -67L-57 -80" stroke="#ff9a78" strokeWidth=".5" strokeLinecap="round" opacity=".6" />
      <path d="M-46 -66l-2.2 -3.8 3.2 2Z M-58 -82l-.6 -3.2 2 2.2Z M-76 -72l-2.6 -1.4 2.4 -.8Z M-83 -50l-2.4 .6 1.6 -2.2Z" fill="#f3e2c0" stroke="#6b4a26" strokeWidth=".3" />
    </g>
  );
}

function EjderBas({ id }) {
  const yarim = (s) => (
    <g transform={s < 0 ? "scale(-1 1)" : undefined}>
      <path d="M-7 -68C-12 -77 -19 -83 -29 -86C-23 -81 -17 -75 -13 -64Z" fill={u(id, "e-boynuz")} stroke="#3a2410" strokeWidth=".6" />
      <path d="M-11.5 -73.5l2.4 -1.2M-15 -77.5l2.2 -1.6M-19.5 -80.8l2 -1.5" stroke="#6b4a26" strokeWidth=".5" />
      <path d="M-12 -63C-18 -66 -22 -66 -27 -63.5C-21.5 -62 -17 -60 -13 -59Z" fill={u(id, "e-boynuz")} stroke="#3a2410" strokeWidth=".5" />
      <path d="M-14 -60L-27 -66L-24 -60.5L-30.5 -57L-23 -55L-27 -50L-14 -53Z" fill={u(id, "e-zar")} stroke="#3a0708" strokeWidth=".6" strokeLinejoin="round" />
    </g>
  );
  const goz = (s) => (
    <g transform={s < 0 ? "scale(-1 1)" : undefined}>
      <path d="M-13.2 -58.4Q-10 -63.2 -4.6 -59.8Q-8.8 -56.4 -13.2 -58.4Z" fill="#2a0303" />
      <path d="M-12.6 -58.8Q-9.2 -62.6 -4.8 -59.6Q-8.6 -57 -12.6 -58.8Z" fill={u(id, "e-goz")} />
      <ellipse cx="-8.6" cy="-59.5" rx=".75" ry="1.75" fill="#2a0300" />
      <circle cx="-10.4" cy="-60" r=".55" fill="#fff" />
      <path d="M-14.4 -61.4Q-9 -66.4 -3.2 -62.4" fill="none" stroke="#3a0606" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M-9.5 -47C-16 -45 -20 -40 -22 -33" fill="none" stroke={u(id, "e-altin")} strokeWidth=".9" strokeLinecap="round" />
      <ellipse cx="-2.8" cy="-45.7" rx="1.35" ry=".8" transform="rotate(-25 -2.8 -45.7)" fill="#2a0000" />
      <path d="M-5.4 -44L-4.6 -40.1L-3.7 -43.4Z" fill="#fffbe8" stroke="#6b4a26" strokeWidth=".3" />
      <path d="M-13 -55Q-11 -53.6 -9 -54.2M-12 -52Q-10 -50.8 -8 -51.4" fill="none" stroke="#6a0c0c" strokeWidth=".55" />
    </g>
  );
  return (
    <g>
      {yarim(1)}{yarim(-1)}
      <path d="M0 -73C7 -73 13.5 -69 15 -62.5C16.3 -57 13.5 -52.5 10 -49C8 -46 6 -42.5 3.2 -41.5C1.2 -40.8 -1.2 -40.8 -3.2 -41.5C-6 -42.5 -8 -46 -10 -49C-13.5 -52.5 -16.3 -57 -15 -62.5C-13.5 -69 -7 -73 0 -73Z" fill={u(id, "e-bas")} stroke="#2a0505" strokeWidth="1" />
      <path d="M-4.2 -71.2Q0 -73.4 4.2 -71.2L3.1 -66Q0 -65 -3.1 -66Z" fill="#ff8a62" opacity=".55" stroke="#6a0c0c" strokeWidth=".4" />
      <path d="M-3.1 -65.4Q0 -66.5 3.1 -65.4L2.3 -61.3Q0 -60.6 -2.3 -61.3Z" fill="#ff8a62" opacity=".45" stroke="#6a0c0c" strokeWidth=".35" />
      <path d="M-3.5 -60Q0 -61.5 3.5 -60L2.4 -47Q0 -45.8 -2.4 -47Z" fill="#ffb08a" opacity=".32" />
      {goz(1)}{goz(-1)}
      <path d="M-6.8 -44.4Q0 -41.8 6.8 -44.4" fill="none" stroke="#3a0505" strokeWidth=".8" strokeLinecap="round" />
      <path d="M-1.5 -70l1.5 -4.2 1.5 4.2Z" fill={u(id, "e-diken")} stroke="#2a0505" strokeWidth=".4" />
    </g>
  );
}

function AlevDili({ id, ters = false }) {
  return (
    <g transform={ters ? "scale(-1 1)" : undefined}>
      <path d="M-2.8 -45.6C-7 -48.5 -14 -47.4 -21.5 -42.4C-17 -42.6 -13.6 -42 -11 -40.6C-15.4 -38.6 -20.4 -35.4 -25.4 -30.6C-16.2 -32.8 -8 -38 -2.8 -45.6Z" fill={u(id, "e-ates")} />
      <path d="M-3 -45.4C-7 -46.6 -11.5 -45.2 -15 -42.6C-11.6 -42 -9.4 -41.2 -8 -40.2C-10.6 -38.6 -12.8 -37 -15 -34.8C-9.8 -36.6 -5.8 -40 -3 -45.4Z" fill="#fff6c4" opacity=".85" />
    </g>
  );
}

const Ejderha = {
  ad: "Ejderha",
  tepe: true,
  aciklama: "Kızıl pullu ejderha halkaya sarılır: parlayan gözler, çırpan kanatlar, arada burnundan alev. Obsidyen halka, altın kenar.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}e-bant`} d={[[0, "#5a1c14"], [0.42, "#1a0706"], [0.58, "#2c0c09"], [1, "#0d0303"]]} />
      <LG id={`${id}e-altin`} d={[[0, "#fff3b8"], [0.35, "#f5c04a"], [0.62, "#a8650f"], [1, "#f7d27a"]]} />
      <LG id={`${id}e-pul`} d={[[0, "#ff7a52"], [0.45, "#c5261c"], [1, "#5a0a0c"]]} />
      <LG id={`${id}e-bas`} d={[[0, "#ff8a60"], [0.5, "#d2301f"], [1, "#7a0e0e"]]} />
      <LG id={`${id}e-karin`} d={[[0, "#ffe9a3"], [1, "#d98a1e"]]} />
      <LG id={`${id}e-diken`} d={[[0, "#f3e2c0"], [1, "#5a3a1a"]]} />
      <LG id={`${id}e-boynuz`} d={[[0, "#fff5dc"], [0.6, "#c9a36a"], [1, "#6b4a26"]]} />
      <RG id={`${id}e-zar`} cx={0.9} cy={0.85} r={1} d={[[0, "#ff7a45"], [0.45, "#a3161a"], [1, "#3d0508"]]} />
      <RG id={`${id}e-goz`} d={[[0, "#ffffff"], [0.3, "#fff15a"], [0.7, "#ff9d00"], [1, "#c52a00"]]} />
      <RG id={`${id}e-gozhale`} d={[[0, "#ffd23a", 0.95], [0.4, "#ff8a00", 0.5], [1, "#ff5a00", 0]]} />
      <RG id={`${id}e-ates`} cx={0.15} cy={0.25} r={0.95} d={[[0, "#fffbe0"], [0.25, "#ffe066"], [0.55, "#ff8a1f"], [0.85, "#e0321a", 0.85], [1, "#a00000", 0]]} />
      <RG id={`${id}e-hale`} d={[[0, "#ff4a1f", 0.5], [0.62, "#ff2a00", 0.16], [1, "#ff2a00", 0]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={3.2}><circle r="72" fill={u(id, "e-hale")} /></Katman>}
      {k !== "kucuk" && (
        <>
          <Oge z="arka" a="kanat-sol" s={2.4} kutu={[-86, -88, 66, 62]} koken={[-24, -42]}>
            <g transform={k === "orta" ? "translate(-24 -42) scale(.7) translate(24 42)" : undefined}><EjderKanat id={id} /></g>
          </Oge>
          <Oge z="arka" a="kanat-sag" s={2.4} kutu={ayna(-86, -88, 66, 62)} koken={[24, -42]}>
            <g transform={`scale(-1 1)${k === "orta" ? " translate(-24 -42) scale(.7) translate(24 42)" : ""}`}><EjderKanat id={id} /></g>
          </Oge>
        </>
      )}
      <Katman z="arka">
        {EJ_ARKA.map(([a0, a1]) => <EjderGovde key={a0} id={id} a0={a0} a1={a1} w={k === "kucuk" ? 5 : 8} sade={k === "kucuk"} />)}
      </Katman>
    </>
  ),
  On: ({ id, k }) => {
    const kucuk = k === "kucuk";
    const [kx, ky] = kutup(51, 333);
    return (
      <>
        <Katman z="on">
          <Halka id={id} bant="e-bant" rim="e-altin" rimG={1.9} dis="#140404" icKenar="#140404" />
          {EJ_ON.map(([a0, a1]) => <EjderGovde key={a0} id={id} a0={a0} a1={a1} w={kucuk ? 5 : 8} sade={kucuk} />)}
          <path d={serit(51, 292, 331, kucuk ? 5 : 8, 1.2)} fill={u(id, "e-pul")} stroke="#2a0505" strokeWidth=".9" />
          <path transform={`translate(${kx} ${ky}) rotate(${333 + 90})`} d="M0 -4.4L3.6 1.2Q0 .2 -3.6 1.2Z" fill={u(id, "e-diken")} stroke="#2a0505" strokeWidth=".5" />
          <path d={serit(51, 4, 17, kucuk ? 6 : 10, kucuk ? 5 : 8)} fill={u(id, "e-pul")} stroke="#2a0505" strokeWidth=".9" />
          {kucuk && <g transform="translate(0 -50) scale(.46) translate(0 50)"><EjderBas id={id} /></g>}
        </Katman>
        {!kucuk && <Parilti s={7} renk="#ffb347" />}
        {!kucuk && (
          <>
            <Katman z="on" a="bas" s={3.2} o={[0, -45]}><EjderBas id={id} /></Katman>
            <Oge z="on" a="nabiz" s={1.8} kutu={[-17, -67, 34, 16]} koken={[0, -59]}>
              <circle cx="-8.6" cy="-59.5" r="5" fill={u(id, "e-gozhale")} />
              <circle cx="8.6" cy="-59.5" r="5" fill={u(id, "e-gozhale")} />
            </Oge>
            <Oge z="on" a="nefes" s={5.5} g={1.5} kutu={[-28, -50, 26, 21]} koken={[-2.8, -45.6]}><AlevDili id={id} /></Oge>
            <Oge z="on" a="nefes" s={5.5} g={1.5} kutu={[2, -50, 26, 21]} koken={[2.8, -45.6]}><AlevDili id={id} ters /></Oge>
          </>
        )}
      </>
    );
  },
};

// =====================================================================
// 2. SÖNMEYEN ALEV
// =====================================================================
function AlevSekli({ id, L, W, b = -48.5, sade = false }) {
  const d = (l, w) => `M${f(-w)} ${b}C${f(-w)} ${f(b - l * 0.42)} ${f(-w * 0.3)} ${f(b - l * 0.55)} ${f(-w * 0.1)} ${f(b - l)}C${f(w * 0.3)} ${f(b - l * 0.64)} ${f(w * 1.05)} ${f(b - l * 0.42)} ${f(w)} ${b}Q0 ${f(b + w * 0.55)} ${f(-w)} ${b}Z`;
  return (
    <g>
      <path d={d(L, W)} fill={u(id, "a-dis")} />
      {!sade && <path d={d(L * 0.72, W * 0.66)} fill={u(id, "a-orta")} />}
      <path d={d(L * 0.42, W * 0.36)} fill={u(id, "a-cekirdek")} />
    </g>
  );
}
function alevListesi(adet, taban, tohumAdi) {
  const r = tohum(tohumAdi);
  return Array.from({ length: adet }, (_, i) => {
    let a = (i * 360) / adet + (r() - 0.5) * 8;
    if (a > 180) a -= 360;
    const yukari = 0.45 + 0.55 * ((1 + Math.cos(a * (Math.PI / 180))) / 2);
    return { a, L: taban * yukari * (0.8 + r() * 0.45), W: 3 + r() * 1.6, egim: -a * 0.42, s: 0.75 + r() * 0.6, g: -r() * 2, iki: r() > 0.5 };
  });
}
const ALEV_ON = alevListesi(18, 21, "alev-on");
const ALEV_ARKA = alevListesi(12, 26, "alev-arka").map((x) => ({ ...x, a: x.a + 10 }));
const ALEV_KOR = (() => {
  const r = tohum("alev-kor");
  return Array.from({ length: 8 }, () => ({ a: (r() - 0.5) * 150, dx: `${Math.round((r() - 0.5) * 160)}%`, s: 2 + r() * 1.6, g: -r() * 3 }));
})();

function AlevParca({ id, x, z, sade }) {
  return (
    <Oge z={z} aci={x.a} a={sade ? undefined : x.iki ? "titre2" : "titre"} s={x.s} g={x.g}
         kutu={[-x.W * 1.6, -48.5 - x.L * 1.15, x.W * 3.2, x.L * 1.2]} koken={[0, -48.5]}>
      <g transform={`rotate(${f(x.egim)} 0 -48.5)`}><AlevSekli id={id} L={x.L} W={x.W} sade={sade} /></g>
    </Oge>
  );
}

const Alev = {
  ad: "Sönmeyen Alev",
  tepe: true,
  aciklama: "Halkanın çevresinde hiç sönmeyen, yukarı doğru titreyen üç katlı alevler; kor gibi yanan iç kenar, ısı ışıması ve yükselen kıvılcımlar.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}a-bant`} d={[[0, "#6a4232"], [0.45, "#1c1210"], [0.6, "#2a1510"], [1, "#130a08"]]} />
      <LG id={`${id}a-kor`} d={[[0, "#ffe27a"], [0.5, "#ff8a1f"], [1, "#ff4a0a"]]} />
      <LG id={`${id}a-dis`} d={[[0, "#ff2a00", 0], [0.22, "#ff3d0f", 0.85], [0.7, "#ff6a12"], [1, "#ff9a2a"]]} />
      <LG id={`${id}a-orta`} d={[[0, "#ff8a00", 0], [0.3, "#ffa01a", 0.95], [1, "#ffd24a"]]} />
      <LG id={`${id}a-cekirdek`} d={[[0, "#fff3b0", 0], [0.35, "#fff1a0"], [1, "#ffffff"]]} />
      <RG id={`${id}a-hale`} d={[[0, "#ffa13a", 0.6], [0.55, "#ff4a00", 0.24], [1, "#ff2a00", 0]]} />
      <RG id={`${id}a-kivilcim`} d={[[0, "#fff7c8"], [0.45, "#ffb03a"], [1, "#ff5a00", 0]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={1.7}><circle r="74" fill={u(id, "a-hale")} /></Katman>}
      {k === "tam" && ALEV_ARKA.map((x, i) => <AlevParca key={i} id={id} x={{ ...x, L: x.L * 1.05 }} z="arka" />)}
    </>
  ),
  On: ({ id, k }) => {
    const liste = k === "tam" ? ALEV_ON : k === "orta" ? ALEV_ON.filter((_, i) => i % 3 !== 2).map((x) => ({ ...x, L: x.L * 0.8 }))
      : ALEV_ON.filter((_, i) => i % 2 === 0).map((x) => ({ ...x, L: Math.min(6, x.L * 0.3), W: x.W * 0.8 }));
    return (
      <>
        {k !== "kucuk" ? liste.map((x, i) => <AlevParca key={i} id={id} x={x} z="on" />) : null}
        <Katman z="on">
          <Halka id={id} bant="a-bant" dis="#120806" icKenar="#ff7a1a" isik={0.3} />
          <circle r="43.9" fill="none" stroke={u(id, "a-kor")} strokeWidth="1.3" />
          <circle r="49.5" fill="none" stroke="#ff8a2a" strokeWidth=".6" opacity=".7" />
          {[20, 75, 128, 196, 250, 312].map((a) => (
            <path key={a} d={`M${kutup(44.2, a).join(" ")}L${kutup(46.4, a + 3).join(" ")}L${kutup(47.6, a + 1).join(" ")}L${kutup(49.2, a + 5).join(" ")}`} fill="none" stroke="#ffb03a" strokeWidth=".55" opacity=".85" />
          ))}
          {k === "kucuk" && liste.map((x, i) => (
            <g key={i} transform={`rotate(${f(x.a)})`}><g transform={`rotate(${f(x.egim)} 0 -48.5)`}><AlevSekli id={id} L={x.L} W={x.W} sade /></g></g>
          ))}
        </Katman>
        {k !== "kucuk" && <Parilti s={5} renk="#ffcf6a" genislik={6} />}
        {k === "tam" && ALEV_KOR.map((x, i) => (
          <Oge key={i} aci={x.a} a="kor" s={x.s} g={x.g} kutu={[-2, -86, 4, 36]} stil={{ "--dx": x.dx }}>
            <circle cx="0" cy="-52" r="1.1" fill={u(id, "a-kivilcim")} />
          </Oge>
        ))}
      </>
    );
  },
};

// =====================================================================
// 3. SONBAHAR
// =====================================================================
export const AKCAAGAC = "M0 -10L2.1 -5.6L6.3 -7.4L5.2 -2.6L9.6 -1.6L6.6 1.4L7.8 4.6L2.8 3.6L1.2 6.4L.4 6.2L.5 10H-.5L-.4 6.2L-1.2 6.4L-2.8 3.6L-7.8 4.6L-6.6 1.4L-9.6 -1.6L-5.2 -2.6L-6.3 -7.4L-2.1 -5.6Z";
const DAMAR = "M0 8V-8M0 2L5.6 -3.6M0 2L-5.6 -3.6M0 4.6L5.4 3M0 4.6L-5.4 3";
const YAPRAK_RENK = ["s-kirmizi", "s-turuncu", "s-sari", "s-kahve"];
function Yaprak({ id, x = 0, y = 0, s = 1, rot = 0, renk = 0 }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${s})`}>
      <path d={AKCAAGAC} fill={u(id, YAPRAK_RENK[renk % 4])} stroke="#5a1a08" strokeWidth=".45" strokeLinejoin="round" />
      <path d={DAMAR} fill="none" stroke="#5a1a08" strokeWidth=".35" opacity=".55" />
      <path d="M-4 -5L0 -8L3 -6" fill="none" stroke="#fff" strokeWidth=".5" opacity=".35" />
    </g>
  );
}
function YaprakKume({ id, a, r = 54, adet = 4, olcek = 0.42, t = "kume" }) {
  const rr = tohum(`${t}${a}`);
  return (
    <g>
      {Array.from({ length: adet }, (_, i) => {
        const aa = a + (i - (adet - 1) / 2) * 9 + (rr() - 0.5) * 4;
        const [x, y] = kutup(r + (rr() - 0.3) * 5, aa);
        return <Yaprak key={i} id={id} x={x} y={y} s={olcek * (0.8 + rr() * 0.4)} rot={aa + (rr() - 0.5) * 70} renk={i + Math.floor(rr() * 4)} />;
      })}
    </g>
  );
}
const SON_YORUNGE = [0, 72, 144, 216, 288];
const SON_DUSEN = (() => {
  const r = tohum("sonbahar-dus");
  return Array.from({ length: 5 }, (_, i) => ({ x: 18 + r() * 40, g: -r() * 6 - i, s: 4.6 + r() * 2.4, rot: `${Math.round(180 + r() * 220)}deg`, renk: i }));
})();

const Sonbahar = {
  ad: "Sonbahar",
  aciklama: "Bronz-ceviz halkaya sarılan asma; kırmızı, turuncu, altın akçaağaç kümeleri. Halkanın etrafında dolaşan ve salınarak düşen yapraklar.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}s-bant`} d={[[0, "#d89a58"], [0.38, "#8e4c1e"], [0.62, "#6a3414"], [1, "#3a1a08"]]} />
      <LG id={`${id}s-kenar`} d={[[0, "#fff0c0"], [0.45, "#e0a24a"], [1, "#7a4a12"]]} />
      <LG id={`${id}s-kirmizi`} d={[[0, "#ff7a4a"], [1, "#b3190f"]]} />
      <LG id={`${id}s-turuncu`} d={[[0, "#ffc05a"], [1, "#e0621a"]]} />
      <LG id={`${id}s-sari`} d={[[0, "#fff09a"], [1, "#e0a21a"]]} />
      <LG id={`${id}s-kahve`} d={[[0, "#e0934a"], [1, "#8a3f12"]]} />
      <RG id={`${id}s-hale`} d={[[0, "#ffb347", 0.4], [0.6, "#ff7a1a", 0.12], [1, "#ff7a1a", 0]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={4}><circle r="70" fill={u(id, "s-hale")} /></Katman>}
      {k === "tam" && <Katman z="arka"><YaprakKume id={id} a={200} r={56} adet={3} olcek={0.4} t="arka" /></Katman>}
    </>
  ),
  On: ({ id, k }) => {
    const asma = [];
    for (let i = 0; i <= 120; i += 1) {
      const a = i * 3;
      asma.push(kutup(46.6 + 2.5 * Math.sin((a * 9 * Math.PI) / 180), a));
    }
    return (
      <>
        <Katman z="on">
          <Halka id={id} bant="s-bant" rim="s-kenar" dis="#2a1206" icKenar="#2a1206" />
          <path d={`M${asma.map((p) => p.join(" ")).join("L")}`} fill="none" stroke="#3b2410" strokeWidth="1.3" strokeLinejoin="round" />
          <path d={`M${asma.map((p) => p.join(" ")).join("L")}`} fill="none" stroke="#8a6a2a" strokeWidth=".45" opacity=".8" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = i * 30 + 10;
            const [x, y] = kutup(47 + 2.5 * Math.sin((a * 9 * Math.PI) / 180), a);
            return <Yaprak key={i} id={id} x={x} y={y} s={0.16} rot={a + 60} renk={i} />;
          })}
          {k === "kucuk" ? (
            <>
              <YaprakKume id={id} a={322} r={50.5} adet={2} olcek={0.3} />
              <YaprakKume id={id} a={140} r={50.5} adet={2} olcek={0.28} />
            </>
          ) : (
            <>
              <YaprakKume id={id} a={318} r={55} adet={k === "tam" ? 6 : 4} olcek={k === "tam" ? 0.62 : 0.44} />
              <YaprakKume id={id} a={36} r={54} adet={4} olcek={k === "tam" ? 0.55 : 0.4} />
              <YaprakKume id={id} a={150} r={54.5} adet={k === "tam" ? 5 : 3} olcek={k === "tam" ? 0.58 : 0.4} />
              <g>
                {[[322, 57], [150, 57.5]].map(([a, r]) => {
                  const [x, y] = kutup(r, a + 8);
                  return (
                    <g key={a} transform={`translate(${x} ${y}) rotate(${a})`}>
                      <ellipse cx="0" cy="1.2" rx="2" ry="2.6" fill="#b8742a" stroke="#4a2408" strokeWidth=".4" />
                      <path d="M-2.4 -.2Q0 -2.6 2.4 -.2Z" fill="#6a3a14" stroke="#4a2408" strokeWidth=".35" />
                      <path d="M0 -1.4v-1.4" stroke="#4a2408" strokeWidth=".5" />
                    </g>
                  );
                })}
              </g>
            </>
          )}
        </Katman>
        {k !== "kucuk" && <Parilti s={8} renk="#ffe0a0" />}
        {k !== "kucuk" && (
          <Yorunge z="on" s={k === "tam" ? 20 : 26}>
            {(k === "tam" ? SON_YORUNGE : SON_YORUNGE.slice(0, 3)).map((a, i) => {
              const r = i % 2 ? 60 : 56;
              return (
                <Oge key={a} aci={a} a="salin" s={2 + (i % 3) * 0.4} g={-i * 0.7} kutu={[-6.5, -r - 6.5, 13, 13]} koken={[0, -r - 5]}>
                  <Yaprak id={id} x={0} y={-r} s={0.55} rot={i * 50} renk={i} />
                </Oge>
              );
            })}
          </Yorunge>
        )}
        {k === "tam" && SON_DUSEN.map((x, i) => (
          <Oge key={i} a="yaprak-dus" s={x.s} g={x.g} kutu={[x.x - 6, -80, 12, 60]} koken={[x.x, -75]}
               stil={{ "--dx": `${-120 - i * 40}%`, "--rot": x.rot }}>
            <Yaprak id={id} x={x.x} y={-75} s={0.48} rot={i * 40} renk={x.renk} />
          </Oge>
        ))}
      </>
    );
  },
};

// =====================================================================
// 4. BUZ KRİSTALİ
// =====================================================================
function Kristal({ id, L, W = 3.4, b = -47.5 }) {
  return (
    <g>
      <path d={`M${-W} ${b}L${f(-W * 1.12)} ${f(b - L * 0.6)}L0 ${f(b - L)}L0 ${b}Z`} fill={u(id, "b-sol")} />
      <path d={`M${W} ${b}L${f(W * 1.12)} ${f(b - L * 0.6)}L0 ${f(b - L)}L0 ${b}Z`} fill={u(id, "b-sag")} />
      <path d={`M${-W} ${b}L${f(-W * 1.12)} ${f(b - L * 0.6)}L0 ${f(b - L)}L${f(W * 1.12)} ${f(b - L * 0.6)}L${W} ${b}`} fill="none" stroke="#1e5f8f" strokeWidth=".5" strokeLinejoin="round" />
      <path d={`M0 ${b}V${f(b - L * 0.92)}`} stroke="#fff" strokeWidth=".45" opacity=".85" />
      <path d={`M${f(-W * 0.7)} ${f(b - L * 0.2)}L${f(-W * 0.8)} ${f(b - L * 0.55)}`} stroke="#fff" strokeWidth=".6" opacity=".7" strokeLinecap="round" />
    </g>
  );
}
function KristalKume({ id, L, sade }) {
  return (
    <g>
      {!sade && <g transform="rotate(-30 0 -47.5)"><Kristal id={id} L={L * 0.45} W={2} /></g>}
      {!sade && <g transform="rotate(-15 0 -47.5)"><Kristal id={id} L={L * 0.68} W={2.7} /></g>}
      {!sade && <g transform="rotate(26 0 -47.5)"><Kristal id={id} L={L * 0.4} W={1.9} /></g>}
      {!sade && <g transform="rotate(13 0 -47.5)"><Kristal id={id} L={L * 0.62} W={2.6} /></g>}
      <Kristal id={id} L={L} W={sade ? 2.4 : 3.6} />
    </g>
  );
}
const BUZ_KUME = [[0, 31], [-30, 22], [30, 22], [-58, 16], [58, 16], [-88, 12], [88, 12], [-120, 9], [120, 9], [-152, 7], [152, 7], [180, 6]];
const BUZ_PIRILTI = [[0, 76], [-33, 68], [33, 68], [-64, 62], [64, 62], [-100, 58]];

const Buz = {
  ad: "Buz Kristali",
  tepe: true,
  aciklama: "Buzul camı halka; büyüyüp parlayan iki tonlu buz dikenleri, dipte süzülen soğuk buğu ve uçlarda yanıp sönen parıltılar.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}b-bant`} d={[[0, "#f2fdff"], [0.32, "#a8e4fb"], [0.62, "#4fb0e6"], [1, "#d9f5ff"]]} />
      <LG id={`${id}b-kenar`} d={[[0, "#ffffff"], [1, "#6cc3ef"]]} />
      <LG id={`${id}b-sol`} d={[[0, "#ffffff"], [1, "#bfeaff"]]} />
      <LG id={`${id}b-sag`} d={[[0, "#a6e3fb"], [1, "#3f93d0"]]} />
      <RG id={`${id}b-hale`} d={[[0, "#bff3ff", 0.65], [0.6, "#7fd8ff", 0.2], [1, "#7fd8ff", 0]]} />
      <RG id={`${id}b-sis`} d={[[0, "#ffffff", 0.8], [1, "#e6fbff", 0]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={4.2}><circle r="70" fill={u(id, "b-hale")} /></Katman>}
      {k === "tam" && [[-38, 42, 0], [30, 50, -2.3], [0, 60, -4.6]].map(([x, y, g], i) => (
        <Oge key={i} z="arka" a="sis" s={6 + i} g={g} kutu={[x - 22, y - 12, 44, 24]} koken={[x, y]}>
          <ellipse cx={x} cy={y} rx="22" ry="11" fill={u(id, "b-sis")} />
        </Oge>
      ))}
    </>
  ),
  On: ({ id, k }) => {
    const kume = k === "tam" ? BUZ_KUME : k === "orta" ? BUZ_KUME.slice(0, 7).map(([a, L]) => [a, L * 0.72]) : BUZ_KUME.slice(0, 5).map(([a, L]) => [a, Math.min(7, L * 0.3)]);
    return (
      <>
        <Katman z="on">
          <Halka id={id} bant="b-bant" rim="b-kenar" dis="#1e5f8f" icKenar="#1e5f8f" isik={0.9} />
          {Array.from({ length: 30 }, (_, i) => {
            const a = i * 12 + 4;
            return <path key={i} d={`M${kutup(43.8, a).join(" ")}L${kutup(49.4, a + 5).join(" ")}`} stroke="#fff" strokeWidth=".45" opacity=".5" />;
          })}
          {Array.from({ length: 45 }, (_, i) => {
            const [x, y] = kutup(50.2, i * 8);
            return <circle key={`k${i}`} cx={x} cy={y} r={i % 3 ? 1 : 1.5} fill="#f4feff" stroke="#9fd6f2" strokeWidth=".3" />;
          })}
          {k === "kucuk" && kume.map(([a, L]) => <g key={a} transform={`rotate(${a})`}><KristalKume id={id} L={L} sade /></g>)}
        </Katman>
        {k !== "kucuk" && kume.map(([a, L], i) => (
          <Oge key={a} aci={a} a="buyu" s={3 + (i % 3) * 0.5} g={-i * 0.45} kutu={[-L * 0.6, -48 - L, L * 1.2, L + 1]} koken={[0, -47.5]}>
            <KristalKume id={id} L={L} />
          </Oge>
        ))}
        {k !== "kucuk" && <Parilti s={6.5} renk="#ffffff" />}
        {k === "tam" && BUZ_PIRILTI.map(([a, r], i) => {
          const [x, y] = kutup(r, a);
          return (
            <Oge key={i} a="parilti" s={2.6 + (i % 2) * 0.6} g={i * 0.55} kutu={[x - 4, y - 4, 8, 8]} koken={[x, y]}>
              <Yildiz4 x={x} y={y} r={3.6} />
            </Oge>
          );
        })}
      </>
    );
  },
};

// =====================================================================
// 5. ŞİMŞEK
// =====================================================================
function zikzak(tohumAdi, parcalar, r0 = 46.6, genlik = 5.2) {
  const r = tohum(tohumAdi);
  return parcalar.map(([a0, a1]) => {
    const p = [];
    for (let a = a0; a <= a1; a += 3.2) p.push(kutup(r0 + (r() - 0.5) * genlik, a));
    return `M${p.map((x) => x.join(" ")).join("L")}`;
  }).join("");
}
const SIM_A = zikzak("sim-a", [[6, 92], [124, 206], [240, 328]], 46.6, 7.5);
const SIM_B = zikzak("sim-b", [[50, 134], [176, 258], [286, 378]], 46.6, 7.5);
const SIM_C = zikzak("sim-c", [[0, 360]], 46.6, 3.2);
function yildirim(tohumAdi, uzunluk = 22) {
  const r = tohum(tohumAdi);
  const p = [[0, -50]];
  let y = -50;
  let x = 0;
  while (y > -50 - uzunluk) { y -= 3 + r() * 3; x += (r() - 0.5) * 8; p.push([f(x), f(y)]); }
  const ana = `M${p.map((q) => q.join(" ")).join("L")}`;
  const k = p[Math.floor(p.length / 2)];
  const k2 = p[Math.floor(p.length / 3)];
  const dal = `M${k.join(" ")}L${f(k[0] + 4 + r() * 3)} ${f(k[1] - 3)}L${f(k[0] + 5 + r() * 4)} ${f(k[1] - 8)}`;
  const dal2 = `M${k2.join(" ")}L${f(k2[0] - 3 - r() * 3)} ${f(k2[1] - 4)}L${f(k2[0] - 6 - r() * 3)} ${f(k2[1] - 6)}`;
  return ana + dal + dal2;
}
const SIM_DAL = [20, 95, 160, 232, 300, 340].map((a, i) => ({ a, d: yildirim(`sd${i}`, 24 + (i % 2) * 8), g: i * 0.52 }));
/** Halkadan dışa çıkan kısa kıvılcım dikenleri (iki takım, çıtırtıyla sırayla). */
function dikenler(tohumAdi, acilar) {
  const r = tohum(tohumAdi);
  return acilar.map((a) => {
    const p = [kutup(50, a)];
    let rr = 50;
    let aa = a;
    while (rr < 57 + r() * 4) { rr += 2.2 + r() * 1.6; aa += (r() - 0.5) * 7; p.push(kutup(rr, aa)); }
    return `M${p.map((q) => q.join(" ")).join("L")}`;
  }).join("");
}
const SIM_DIKEN_A = dikenler("sda", [10, 55, 100, 145, 190, 235, 280, 325]);
const SIM_DIKEN_B = dikenler("sdb", [32, 78, 122, 168, 212, 258, 302, 348]);

const Simsek = {
  ad: "Şimşek",
  aciklama: "Çelik-lacivert halkanın üstünde çıtırdayarak dönen elektrik, dışarı çakan dallı yıldırımlar ve arada bütün çerçeveyi aydınlatan şimşek.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}m-bant`} d={[[0, "#5a6aa0"], [0.42, "#141a33"], [0.58, "#1d2750"], [1, "#080b18"]]} />
      <LG id={`${id}m-kenar`} d={[[0, "#e6f9ff"], [1, "#38b6ff"]]} />
      <RG id={`${id}m-hale`} d={[[0, "#7fdcff", 0.55], [0.5, "#2a8cff", 0.2], [1, "#1a4aff", 0]]} />
      <RG id={`${id}m-flas`} d={[[0, "#ffffff", 0.95], [0.4, "#bfefff", 0.55], [1, "#5ab8ff", 0]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={1.3}><circle r="68" fill={u(id, "m-hale")} /></Katman>}
      {k === "tam" && <Katman z="arka" a="flas" s={4.6} g={1}><circle r="80" fill={u(id, "m-flas")} /></Katman>}
    </>
  ),
  On: ({ id, k }) => {
    const elektrik = (d, kalin = 1) => (
      <>
        <path d={d} fill="none" stroke="#1f8dff" strokeWidth={5 * kalin} strokeLinejoin="round" strokeLinecap="round" opacity=".32" />
        <path d={d} fill="none" stroke="#8fe3ff" strokeWidth={1.9 * kalin} strokeLinejoin="round" strokeLinecap="round" opacity=".9" />
        <path d={d} fill="none" stroke="#ffffff" strokeWidth={0.8 * kalin} strokeLinejoin="round" strokeLinecap="round" />
      </>
    );
    return (
      <>
        <Katman z="on">
          <Halka id={id} bant="m-bant" rim="m-kenar" dis="#050814" icKenar="#050814" rimG={1.4} />
          <circle r="46.6" fill="none" stroke="#1d6bff" strokeWidth="3.4" opacity=".55" />
          <circle r="46.6" fill="none" stroke="#bff0ff" strokeWidth=".9" opacity=".85" />
          <circle r="49.8" fill="none" stroke="#38b6ff" strokeWidth="3" opacity=".3" />
          <circle r="43.6" fill="none" stroke="#38b6ff" strokeWidth="2.6" opacity=".3" />
          {k !== "kucuk" && <path d={SIM_C} fill="none" stroke="#9fe6ff" strokeWidth=".6" opacity=".55" strokeLinejoin="round" />}
          {[45, 135, 225, 315].map((a) => {
            const [x, y] = kutup(46.6, a);
            return (
              <g key={a}>
                <circle cx={x} cy={y} r="3.4" fill="#38b6ff" opacity=".35" />
                <circle cx={x} cy={y} r="2.1" fill="#0b1433" stroke="#bff0ff" strokeWidth=".7" />
                <circle cx={x} cy={y} r=".9" fill="#fff" />
              </g>
            );
          })}
          <g transform="translate(0 -50)">
            <circle r="8.5" fill="#38b6ff" opacity=".28" />
            <path d="M-4.8 -7.6H4.8L6.8 -2.2L0 7.4L-6.8 -2.2Z" fill="#141a33" stroke={u(id, "m-kenar")} strokeWidth="1.1" strokeLinejoin="round" />
            <path d="M1 -5.8L-2.6 .3H.4L-1.3 5.4L3 -1.3H0L1.7 -5.8Z" fill="#fff6a0" stroke="#ffcf3a" strokeWidth=".35" />
          </g>
          {k === "kucuk" && elektrik(SIM_A, 0.8)}
        </Katman>
        {k !== "kucuk" && (
          <>
            <Katman z="on" a="citir">{elektrik(SIM_DIKEN_A, 0.8)}</Katman>
            <Katman z="on" a="citir2">{elektrik(SIM_DIKEN_B, 0.8)}</Katman>
            <Yorunge z="on" s={k === "tam" ? 3.2 : 4.5}>
              <Katman z="on" a="citir">{elektrik(SIM_A)}</Katman>
              <Katman z="on" a="citir2">{elektrik(SIM_B)}</Katman>
            </Yorunge>
            {[45, 135, 225, 315].map((a, i) => {
              const [x, y] = kutup(46.6, a);
              return (
                <Oge key={a} a="nabiz" s={0.9 + i * 0.15} kutu={[x - 6, y - 6, 12, 12]} koken={[x, y]}>
                  <circle cx={x} cy={y} r="5.6" fill={u(id, "m-flas")} />
                </Oge>
              );
            })}
          </>
        )}
        {k === "tam" && SIM_DAL.map((x) => (
          <Oge key={x.a} aci={x.a} a="cak" s={3.1} g={x.g} kutu={[-14, -86, 28, 38]} koken={[0, -50]}>
            <path d={x.d} fill="none" stroke="#1f8dff" strokeWidth="4" strokeLinejoin="round" opacity=".38" />
            <path d={x.d} fill="none" stroke="#8fe3ff" strokeWidth="1.6" strokeLinejoin="round" />
            <path d={x.d} fill="none" stroke="#ffffff" strokeWidth=".7" strokeLinejoin="round" />
          </Oge>
        ))}
        {k === "tam" && (
          <>
            <Yorunge z="on" s={2.2}>
              {[0, 120, 240].map((a) => <Katman key={a} z="on"><circle cx={kutup(49.6, a)[0]} cy={kutup(49.6, a)[1]} r="1.4" fill="#fff" /><circle cx={kutup(49.6, a)[0]} cy={kutup(49.6, a)[1]} r="3.4" fill="#7fdcff" opacity=".4" /></Katman>)}
            </Yorunge>
            <Yorunge z="on" s={3.1} ters>
              {[60, 240].map((a) => <Katman key={a} z="on"><circle cx={kutup(43.9, a)[0]} cy={kutup(43.9, a)[1]} r="1.1" fill="#e8fbff" /></Katman>)}
            </Yorunge>
          </>
        )}
      </>
    );
  },
};

// =====================================================================
// 6. GALAKSİ
// =====================================================================
const GAL_TOZ1 = (() => { const r = tohum("gal1"); return Array.from({ length: 46 }, () => ({ ...(() => { const [x, y] = kutup(51 + r() * 26, r() * 360); return { x, y }; })(), r: 0.3 + r() * 0.7, op: 0.4 + r() * 0.6 })); })();
const GAL_TOZ2 = (() => { const r = tohum("gal2"); return Array.from({ length: 32 }, () => ({ ...(() => { const [x, y] = kutup(52 + r() * 24, r() * 360); return { x, y }; })(), r: 0.25 + r() * 0.5, op: 0.3 + r() * 0.5 })); })();
const GAL_BANT = (() => { const r = tohum("galb"); return Array.from({ length: 34 }, () => ({ ...(() => { const [x, y] = kutup(44 + r() * 5.2, r() * 360); return { x, y }; })(), r: 0.2 + r() * 0.45 })); })();
const GAL_PIRILTI = [[-60, -40], [58, -30], [-30, 66], [70, 38], [-72, 14]];

const Galaksi = {
  ad: "Galaksi",
  aciklama: "Derin uzay halkası; ardında dönen pembe-mor-camgöbeği nebula, iki katmanda yıldız tozu ve yörüngede dolaşan halkalı küçük gezegen.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}g-bant`} d={[[0, "#9a7bff"], [0.4, "#3a1d8a"], [0.62, "#1a0d4a"], [1, "#5a2aa8"]]} />
      <LG id={`${id}g-kenar`} d={[[0, "#ffffff"], [0.5, "#c9b8ff"], [1, "#7a62d6"]]} />
      <RG id={`${id}g-n1`} d={[[0, "#ff5fd2", 0.75], [0.5, "#b03aff", 0.32], [1, "#6a1aff", 0]]} />
      <RG id={`${id}g-n2`} d={[[0, "#3de0ff", 0.7], [0.5, "#3a7aff", 0.28], [1, "#1a3aff", 0]]} />
      <RG id={`${id}g-n3`} d={[[0, "#ffb86b", 0.55], [1, "#ff5f9e", 0]]} />
      <RG id={`${id}g-gezegen`} cx={0.35} cy={0.3} r={0.75} d={[[0, "#ffe6b8"], [0.45, "#ff8a5c"], [1, "#6a1a5a"]]} />
      <RG id={`${id}g-ay`} cx={0.35} cy={0.3} r={0.8} d={[[0, "#ffffff"], [1, "#8a9ac8"]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && (
        <Yorunge z="arka" s={k === "tam" ? 40 : 60}>
          <Katman z="arka">
            <ellipse cx="-38" cy="-36" rx="34" ry="20" transform="rotate(-30 -38 -36)" fill={u(id, "g-n1")} />
            <ellipse cx="40" cy="32" rx="36" ry="21" transform="rotate(-25 40 32)" fill={u(id, "g-n2")} />
            <ellipse cx="34" cy="-46" rx="22" ry="12" fill={u(id, "g-n3")} />
            <ellipse cx="-46" cy="40" rx="24" ry="14" fill={u(id, "g-n2")} opacity=".7" />
            <path d="M-70 10C-60 -40 -10 -70 40 -60M70 -8C60 42 10 70 -38 62" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".12" strokeLinecap="round" />
          </Katman>
        </Yorunge>
      )}
      {k === "tam" && (
        <>
          <Yorunge z="arka" s={36}><Katman z="arka">{GAL_TOZ1.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.op} />)}</Katman></Yorunge>
          <Yorunge z="arka" s={58} ters><Katman z="arka">{GAL_TOZ2.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dfe8ff" opacity={s.op} />)}</Katman></Yorunge>
          <Katman z="arka"><circle r="62" fill="none" stroke="#c9b8ff" strokeWidth=".4" strokeDasharray="1 2.4" opacity=".6" /></Katman>
        </>
      )}
    </>
  ),
  On: ({ id, k }) => (
    <>
      <Katman z="on">
        <Halka id={id} bant="g-bant" rim="g-kenar" dis="#0d0630" icKenar="#0d0630" />
        {GAL_BANT.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity=".85" />)}
        {k === "kucuk" && (
          <g transform={`translate(${kutup(49, 45).join(" ")})`}>
            <circle r="4" fill={u(id, "g-gezegen")} stroke="#0d0630" strokeWidth=".6" />
            <ellipse rx="6.5" ry="1.8" transform="rotate(-20)" fill="none" stroke="#fff3d0" strokeWidth=".8" />
          </g>
        )}
      </Katman>
      {k !== "kucuk" && <Parilti s={9} renk="#e6dcff" />}
      {k !== "kucuk" && (
        <Yorunge z="on" s={k === "tam" ? 11 : 16}>
          <Oge a="don-ters" s={k === "tam" ? 11 : 16} kutu={[-10, -71, 20, 18]} koken={[0, -62]}>
            <g transform="translate(0 -62)">
              <ellipse rx="9.5" ry="2.8" transform="rotate(-18)" fill="none" stroke="#fff3d0" strokeWidth="1.3" opacity=".55" />
              <circle r="5.6" fill={u(id, "g-gezegen")} stroke="#0d0630" strokeWidth=".7" />
              <path d="M-4.6 -1.6Q0 -3.2 4.8 -1" fill="none" stroke="#ffd0a0" strokeWidth=".7" opacity=".7" />
              <path d="M-9 1.2A9.5 2.8 -18 0 0 9.2 -4.2" transform="rotate(0)" fill="none" stroke="#fff3d0" strokeWidth="1.3" />
            </g>
          </Oge>
        </Yorunge>
      )}
      {k === "tam" && (
        <Yorunge z="on" s={17} ters>
          <Katman z="on"><circle cx={kutup(57, 200)[0]} cy={kutup(57, 200)[1]} r="2" fill={u(id, "g-ay")} /></Katman>
        </Yorunge>
      )}
      {k === "tam" && GAL_PIRILTI.map(([x, y], i) => (
        <Oge key={i} a="parilti" s={2.2 + (i % 3) * 0.5} g={i * 0.6} kutu={[x - 4, y - 4, 8, 8]} koken={[x, y]}>
          <Yildiz4 x={x} y={y} r={3.2} fill="#f3eeff" />
        </Oge>
      ))}
    </>
  ),
};

// =====================================================================
// 7. SAKURA
// =====================================================================
export const TACYAPRAK = "M0 0C-2.4 -1.6 -3 -5.4 -1.2 -7L0 -6.1L1.2 -7C3 -5.4 2.4 -1.6 0 0Z";
function Cicek({ id, x, y, s = 1, rot = 0 }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => <path key={a} d={TACYAPRAK} transform={`rotate(${a})`} fill={u(id, "k-yaprak")} stroke="#d9608a" strokeWidth=".3" />)}
      {[0, 72, 144, 216, 288].map((a) => <path key={`s${a}`} d="M0 0V-3.2" transform={`rotate(${a + 36})`} stroke="#ff5a8a" strokeWidth=".35" />)}
      {[0, 72, 144, 216, 288].map((a) => <circle key={`d${a}`} cx={kutup(3.3, a + 36)[0]} cy={kutup(3.3, a + 36)[1]} r=".45" fill="#ffd84a" />)}
      <circle r="1.2" fill="#ff5a8a" />
    </g>
  );
}
function Dal({ id, a0, a1, r = 55, w0 = 3.2, w1 = 1.1, cicekler = [], tomurcuk = [] }) {
  return (
    <g>
      <path d={serit(r, a0, a1, w0, w1, 30, 1.6, 2)} fill={u(id, "k-dal")} stroke="#2a120c" strokeWidth=".4" />
      {tomurcuk.map(([a, dr], i) => {
        const [x, y] = kutup(r + dr, a);
        return <ellipse key={i} cx={x} cy={y} rx="1.2" ry="1.8" transform={`rotate(${a} ${x} ${y})`} fill="#ff8fb3" stroke="#c2557c" strokeWidth=".3" />;
      })}
      {cicekler.map(([a, dr, s], i) => {
        const [x, y] = kutup(r + dr, a);
        return <Cicek key={i} id={id} x={x} y={y} s={s} rot={a * 1.7} />;
      })}
    </g>
  );
}
const SAK_YORUNGE = [0, 60, 120, 180, 240, 300];
const SAK_SAVRUL = (() => { const r = tohum("sak"); return Array.from({ length: 6 }, (_, i) => ({ x: -70 + r() * 40, y: -70 + r() * 30, s: 5 + r() * 2.5, g: -r() * 7 - i, dx: `${Math.round(500 + r() * 400)}%`, dy: `${Math.round(500 + r() * 500)}%`, rot: `${Math.round(300 + r() * 300)}deg` })); })();

const Sakura = {
  ad: "Sakura",
  aciklama: "Pembe lake halka, gül altını kenar; halkayı saran kiraz dalları ve açmış çiçekler. Rüzgârda dönerek savrulan taç yaprakları.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}k-bant`} d={[[0, "#fff0f5"], [0.35, "#ffb3cc"], [0.65, "#e0739a"], [1, "#ffd1e0"]]} />
      <LG id={`${id}k-kenar`} d={[[0, "#fff2e0"], [0.5, "#e8a37a"], [1, "#a8603c"]]} />
      <RG id={`${id}k-yaprak`} cx={0.5} cy={0.95} r={1} d={[[0, "#ffffff"], [0.45, "#ffd6e4"], [1, "#ff8fb3"]]} />
      <LG id={`${id}k-dal`} d={[[0, "#7a4430"], [1, "#3a1a12"]]} />
      <RG id={`${id}k-hale`} d={[[0, "#ffb3d1", 0.5], [0.6, "#ff7aa8", 0.15], [1, "#ff7aa8", 0]]} />
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={4.4}><circle r="70" fill={u(id, "k-hale")} /></Katman>}
    </>
  ),
  On: ({ id, k }) => (
    <>
      <Katman z="on">
        <Halka id={id} bant="k-bant" rim="k-kenar" dis="#5a1a30" icKenar="#5a1a30" isik={0.8} />
        {Array.from({ length: 24 }, (_, i) => {
          const [x, y] = kutup(46.6, i * 15 + 7.5);
          return <circle key={i} cx={x} cy={y} r=".55" fill="#fff6ea" opacity=".9" />;
        })}
        {k === "kucuk" ? (
          <>
            <Cicek id={id} x={kutup(49.5, 318)[0]} y={kutup(49.5, 318)[1]} s={0.62} />
            <Cicek id={id} x={kutup(49.5, 132)[0]} y={kutup(49.5, 132)[1]} s={0.55} rot={30} />
          </>
        ) : (
          <>
            <Dal id={id} a0={238} a1={352} r={54.5} cicekler={[[258, 2, 0.95], [282, -1, 1.15], [306, 2.5, 0.9], [330, 0, 1.05], [348, 3, 0.7]]} tomurcuk={[[268, 4], [318, 4.5], [342, -2]]} />
            <Dal id={id} a0={92} a1={162} r={54.5} w0={2.8} cicekler={[[108, 1.5, 0.95], [132, -1, 1.1], [154, 2, 0.8]]} tomurcuk={[[120, 4.2], [146, 4]]} />
          </>
        )}
      </Katman>
      {k !== "kucuk" && <Parilti s={8} renk="#fff0f6" />}
      {k !== "kucuk" && (
        <Yorunge z="on" s={k === "tam" ? 13 : 18}>
          {(k === "tam" ? SAK_YORUNGE : SAK_YORUNGE.slice(0, 3)).map((a, i) => {
            const r = i % 2 ? 61 : 57;
            return (
              <Oge key={a} aci={a} a="yuvarlan" s={1.3 + (i % 3) * 0.35} g={-i * 0.5} kutu={[-4, -r - 4, 8, 8]} koken={[0, -r]}>
                <path d={TACYAPRAK} transform={`translate(0 ${-r + 3.5}) scale(.95)`} fill={u(id, "k-yaprak")} stroke="#d9608a" strokeWidth=".3" />
              </Oge>
            );
          })}
        </Yorunge>
      )}
      {k === "tam" && SAK_SAVRUL.map((x, i) => (
        <Oge key={i} a="savrul" s={x.s} g={x.g} kutu={[x.x - 4, x.y - 4, 8, 8]} koken={[x.x, x.y]} stil={{ "--dx": x.dx, "--dy": x.dy, "--rot": x.rot }}>
          <path d={TACYAPRAK} transform={`translate(${x.x} ${x.y + 3.5})`} fill={u(id, "k-yaprak")} stroke="#d9608a" strokeWidth=".3" />
        </Oge>
      ))}
    </>
  ),
};

// =====================================================================
// 8. KRALİYET
// =====================================================================
const TAS_RENK = { yakut: "r-yakut", safir: "r-safir", zumrut: "r-zumrut" };
function Mucevher({ id, x, y, r = 3, tur = "yakut", rot = 0 }) {
  const sekiz = (rr) => Array.from({ length: 8 }, (_, i) => kutup(rr, i * 45 + 22.5).map((v, j) => f(v + (j ? y : x))).join(" ")).join("L");
  return (
    <g transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>
      <circle cx={x} cy={y} r={r + 1.05} fill={u(id, "r-altin")} stroke="#5a3a06" strokeWidth=".45" />
      <path d={`M${sekiz(r)}Z`} fill={u(id, TAS_RENK[tur])} stroke="#1a0a0a" strokeWidth=".35" />
      <path d={`M${sekiz(r * 0.52)}Z`} fill="#fff" opacity=".22" />
      {Array.from({ length: 4 }, (_, i) => {
        const [a, b] = kutup(r, i * 90 + 22.5);
        const [c, d] = kutup(r * 0.52, i * 90 + 22.5);
        return <path key={i} d={`M${f(x + a)} ${f(y + b)}L${f(x + c)} ${f(y + d)}`} stroke="#fff" strokeWidth=".25" opacity=".45" />;
      })}
      <ellipse cx={f(x - r * 0.35)} cy={f(y - r * 0.4)} rx={f(r * 0.32)} ry={f(r * 0.18)} transform={`rotate(-35 ${f(x - r * 0.35)} ${f(y - r * 0.4)})`} fill="#fff" opacity=".85" />
    </g>
  );
}
function Inci({ id, x, y, r = 1.2 }) {
  return <circle cx={x} cy={y} r={r} fill={u(id, "r-inci")} stroke="#8a7a60" strokeWidth=".25" />;
}
function Tac({ id }) {
  return (
    <g>
      <path d="M-18 -58C-19 -75 19 -75 18 -58Z" fill={u(id, "r-kadife")} />
      <path d="M-12 -62Q-8 -70 0 -71" fill="none" stroke="#ff8aa8" strokeWidth=".8" opacity=".5" />
      <path d="M-22.5 -56L-25 -75L-15 -64.5L-9.5 -81L-3 -66.5L0 -85L3 -66.5L9.5 -81L15 -64.5L25 -75L22.5 -56Z" fill={u(id, "r-altin-y")} stroke="#5a3a06" strokeWidth=".8" strokeLinejoin="round" />
      <path d="M-21 -57.5L-22.8 -71L-15.2 -62.8M-8.6 -77L-3.4 -65M0 -81L0 -64M8.6 -77L3.4 -65M15.2 -62.8L22.8 -71L21 -57.5" fill="none" stroke="#fff4c4" strokeWidth=".55" opacity=".8" strokeLinejoin="round" />
      <rect x="-23.5" y="-59" width="47" height="8.5" rx="2.2" fill={u(id, "r-altin")} stroke="#5a3a06" strokeWidth=".8" />
      <path d="M-22 -57.6H22" stroke="#fff4c4" strokeWidth=".6" opacity=".8" />
      <path d="M-22 -52.2H22" stroke="#7a4a06" strokeWidth=".5" opacity=".7" />
      {[-17.5, -6, 6, 17.5].map((x) => <Inci key={x} id={id} x={x} y={-54.8} r={0.95} />)}
      <Mucevher id={id} x={0} y={-54.8} r={3} tur="yakut" />
      <Mucevher id={id} x={-11.8} y={-54.8} r={2.2} tur="safir" />
      <Mucevher id={id} x={11.8} y={-54.8} r={2.2} tur="safir" />
      <Mucevher id={id} x={0} y={-72} r={1.9} tur="yakut" />
      <Mucevher id={id} x={-9.2} y={-68.5} r={1.5} tur="zumrut" />
      <Mucevher id={id} x={9.2} y={-68.5} r={1.5} tur="zumrut" />
      {[[-25, -75], [-9.5, -81], [9.5, -81], [25, -75]].map(([x, y]) => <Inci key={x} id={id} x={x} y={y} r={1.9} />)}
      <circle cx="0" cy="-88" r="3" fill={u(id, "r-altin")} stroke="#5a3a06" strokeWidth=".6" />
      <path d="M0 -91V-96.5M-2.4 -94H2.4" stroke="#5a3a06" strokeWidth="2" strokeLinecap="round" />
      <path d="M0 -91V-96.5M-2.4 -94H2.4" stroke={u(id, "r-altin")} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="-.9" cy="-89" r=".9" fill="#fff" opacity=".8" />
    </g>
  );
}
const KRAL_TAS = [[45, "safir"], [90, "yakut"], [135, "zumrut"], [180, "safir"], [225, "zumrut"], [270, "yakut"], [315, "safir"]];
const KRAL_PIRILTI = [[0, -85], [-9.5, -81], [0, -54.8], [11.8, -54.8], ...KRAL_TAS.filter((_, i) => i % 2 === 0).map(([a]) => kutup(46.6, a))];

const Kraliyet = {
  ad: "Kraliyet",
  tepe: true,
  aciklama: "Dövme altın halkaya kakılmış yakut, safir ve zümrütler; incili, kadife içli ayrıntılı taç. Taçta kayan ışık, taşlarda sırayla çakan ışıltı.",
  Defs: ({ id }) => (
    <>
      <LG id={`${id}r-altin`} d={[[0, "#fff6c9"], [0.25, "#ffd24a"], [0.5, "#c98a12"], [0.75, "#ffe27a"], [1, "#8a5a08"]]} />
      <LG id={`${id}r-altin-y`} x2={1} y2={0.4} d={[[0, "#a86a0c"], [0.3, "#ffe68a"], [0.5, "#f5b82a"], [0.72, "#fff3b0"], [1, "#9a5e08"]]} />
      <LG id={`${id}r-kadife`} d={[[0, "#e0325a"], [1, "#6b0a24"]]} />
      <RG id={`${id}r-yakut`} cx={0.35} cy={0.3} r={0.8} d={[[0, "#ffd0d8"], [0.35, "#ff2a4a"], [1, "#6a0014"]]} />
      <RG id={`${id}r-safir`} cx={0.35} cy={0.3} r={0.8} d={[[0, "#d8ecff"], [0.35, "#2a6aff"], [1, "#0a1a6b"]]} />
      <RG id={`${id}r-zumrut`} cx={0.35} cy={0.3} r={0.8} d={[[0, "#d0ffe6"], [0.35, "#12c97a"], [1, "#045a34"]]} />
      <RG id={`${id}r-inci`} cx={0.35} cy={0.3} r={0.8} d={[[0, "#ffffff"], [0.6, "#f3eee6"], [1, "#b0a28a"]]} />
      <RG id={`${id}r-hale`} d={[[0, "#ffe27a", 0.55], [0.6, "#ffb82a", 0.16], [1, "#ffb82a", 0]]} />
      <LG id={`${id}r-isin`} d={[[0, "#fff3b0", 0], [0.4, "#fff3b0", 0.55], [1, "#fff3b0", 0]]} />
      <clipPath id={`${id}r-tackirp`}>
        <path d="M-22.5 -56L-25 -75L-15 -64.5L-9.5 -81L-3 -66.5L0 -85L3 -66.5L9.5 -81L15 -64.5L25 -75L22.5 -56Z M-23.5 -59H23.5V-50.5H-23.5Z" />
      </clipPath>
    </>
  ),
  Arka: ({ id, k }) => (
    <>
      {k !== "kucuk" && <Katman z="arka" a="nabiz" s={3.6}><circle r="72" fill={u(id, "r-hale")} /></Katman>}
      {k === "tam" && (
        <Yorunge z="arka" s={40}>
          <Katman z="arka">
            {Array.from({ length: 24 }, (_, i) => {
              const a = i * 15;
              return <path key={i} d={`M${kutup(50, a - 2.2).join(" ")}L${kutup(78, a).join(" ")}L${kutup(50, a + 2.2).join(" ")}Z`} fill={u(id, "r-isin")} opacity={i % 2 ? 0.5 : 0.9} />;
            })}
          </Katman>
        </Yorunge>
      )}
    </>
  ),
  On: ({ id, k }) => (
    <>
      <Katman z="on">
        <Halka id={id} bant="r-altin" dis="#4a2e04" icKenar="#4a2e04" genislik={7.6} isik={0.8} />
        <circle r="46.6" fill="none" stroke="#7a4a06" strokeWidth=".5" strokeDasharray="1 1.5" opacity=".75" />
        <circle r="48.9" fill="none" stroke="#fff4c4" strokeWidth=".4" opacity=".7" />
        {Array.from({ length: 16 }, (_, i) => i * 22.5).filter((a) => a % 45 !== 0 && a > 15 && a < 345).map((a) => {
          const [x, y] = kutup(46.6, a);
          return <Inci key={a} id={id} x={x} y={y} r={k === "kucuk" ? 1.3 : 1.15} />;
        })}
        {KRAL_TAS.map(([a, tur]) => {
          const [x, y] = kutup(46.6, a);
          return <Mucevher key={a} id={id} x={x} y={y} r={k === "kucuk" ? 3.2 : 2.9} tur={tur} rot={a} />;
        })}
        {k === "kucuk" ? <g transform="translate(0 -50) scale(.42) translate(0 50)"><Tac id={id} /></g> : (
          <g transform={k === "orta" ? "translate(0 -50) scale(.78) translate(0 50)" : undefined}>
            <Tac id={id} />
            <g clipPath={`url(#${id}r-tackirp)`}>
              <g transform="rotate(20 0 -70)"><rect className="pc-svg-kay" x="-6" y="-100" width="7" height="60" fill="#fff" opacity=".55" /></g>
            </g>
          </g>
        )}
      </Katman>
      {k !== "kucuk" && <Parilti s={5.5} renk="#fff6d0" genislik={7.6} />}
      {k === "tam" && KRAL_PIRILTI.map(([x, y], i) => (
        <Oge key={i} a="parilti" s={3.2} g={i * 0.42} kutu={[x - 4.5, y - 4.5, 9, 9]} koken={[x, y]}>
          <Yildiz4 x={x} y={y} r={4} />
        </Oge>
      ))}
    </>
  ),
};

export const CERCEVELER = {
  ejderha: Ejderha,
  alev: Alev,
  sonbahar: Sonbahar,
  buz: Buz,
  simsek: Simsek,
  galaksi: Galaksi,
  sakura: Sakura,
  kraliyet: Kraliyet,
};
export const CERCEVE_SIRASI = Object.keys(CERCEVELER);
