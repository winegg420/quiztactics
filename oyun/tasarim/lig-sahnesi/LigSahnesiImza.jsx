/**
 * LİG SAHNESİ İMZA ÖĞESİ (8 Eki 2026) — profil kartında avatarın arkasındaki TEK çizim (OyuncuVitrinKarti `sahneImza`).
 * Stil rehberi dili: kalın koyu kontur, düz renk, 3 ton hücre gölgesi, ışık sol üstten, parlama/bulanıklık/parçacık yok.
 *   Bronz  → flama şeridi (bayram/turnuva sancağı: başlangıç ligi, sıcak ve sade)
 *   Gümüş  → perçinli çelik plaka şeridi (metal hissi düz geometriyle; soluk gri değil, çelik mavisi)
 *   Altın  → çizim yok: mevcut ışın deseni (Ida'nın referansı) CSS'te kalır
 *   Elmas  → tek büyük kesme kristal (fasetler 4 ton, sağa doğru koyulaşır)
 *   Efsane → tek büyük yıldız (her kol iki yüz: ışık alan yüz açık, diğeri orta)
 * Koordinat: avatar merkezi (220,130); katman kartla kırpılır (oyuncu-vitrin-karti.css › .qt-ok-sahne). Renkler
 * yalnız CSS değişkeni (tokenlar.css › 7c). Hareket yok → hareketi azalt / yumuşak modda değişen bir şey yok.
 */
const W = 440, H = 300, CX = 220, CY = 130;
const n = (v) => Math.round(v * 10) / 10;
const nokta = (pts) => pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");

// Bronz: ip y(x) = 35 + 180·t(1−t), t = x/W (kenarda üstte, ortada avatarın başının arkasına sarkar)
const ipY = (x) => { const t = x / W; return 35 + 180 * t * (1 - t); };
function Bronz() {
  const flamalar = Array.from({ length: 11 }, (_, k) => {
    const x = 20 + 40 * k, sol = x - 15, sag = x + 15;
    const a = [sol, ipY(sol)], b = [sag, ipY(sag)], uc = [x, ipY(x) + 31];
    const orta = [(a[0] + b[0]) / 2 + 4, (a[1] + b[1]) / 2];
    return { k, ana: nokta([a, b, uc]), golge: nokta([orta, b, uc]), acik: k % 2 === 1 };
  });
  return (
    <>
      <circle className="lsi-zemin2" cx={CX} cy={CY} r="66" />
      {flamalar.map((f) => (
        <g key={f.k}>
          <polygon className={f.acik ? "lsi-acik" : "lsi-orta"} points={f.ana} />
          <polygon className="lsi-golge" points={f.golge} />
          <polygon className="lsi-kontur" points={f.ana} />
        </g>
      ))}
      <path className="lsi-ip" d={`M0 35 Q${CX} 125 ${W} 35`} />
    </>
  );
}

// Gümüş: avatar yüksekliğinde yatay plaka — üstte açık kenar, altta koyu dudak, ek yerinde perçinler
function Gumus() {
  const ust = CY - 34, alt = CY + 34;
  const ekler = [0, 110, 330, 440];
  return (
    <>
      <rect className="lsi-orta" x="-4" y={ust} width={W + 8} height={alt - ust} />
      <rect className="lsi-acik" x="-4" y={ust + 2} width={W + 8} height="7" />
      <rect className="lsi-koyu" x="-4" y={alt - 9} width={W + 8} height="8" />
      {ekler.map((x) => (
        <g key={x}>
          <line className="lsi-cizgi" x1={x} y1={ust} x2={x} y2={alt - 9} />
          <line className="lsi-cizgi-acik" x1={x + 2.5} y1={ust + 9} x2={x + 2.5} y2={alt - 9} />
          {[x - 16, x + 18].map((px) => [ust + 19, alt - 21].map((py) => (
            <g key={`${px}-${py}`}>
              <circle className="lsi-isik lsi-kontur-ince" cx={px} cy={py} r="5" />
              <circle className="lsi-acik" cx={px - 1.5} cy={py - 1.5} r="1.8" />
            </g>
          )))}
        </g>
      ))}
      <line className="lsi-kenar" x1="-4" y1={ust} x2={W + 4} y2={ust} />
      <line className="lsi-kenar" x1="-4" y1={alt} x2={W + 4} y2={alt} />
    </>
  );
}

// Elmas: taç (üst) + köşk (alt) fasetleri; sol üst açık, sağa doğru koyu
function Elmas() {
  const ust = 60, kus = 108, uc = [CX, 200];
  const A = [166, ust], M = [CX, ust], C = [274, ust];
  const g = [124, 166, CX, 274, 316].map((x) => [x, kus]);
  const yuzler = [
    ["lsi-acik", [A, g[0], g[1]]], ["lsi-isik", [A, g[1], g[2], M]], ["lsi-orta", [M, g[2], g[3], C]], ["lsi-koyu", [C, g[3], g[4]]],
    ["lsi-isik", [g[0], g[1], uc]], ["lsi-acik", [g[1], g[2], uc]], ["lsi-orta", [g[2], g[3], uc]], ["lsi-koyu", [g[3], g[4], uc]],
  ];
  return (
    <>
      {yuzler.map(([s, p], i) => <polygon key={i} className={`${s} lsi-faset`} points={nokta(p)} />)}
      <line className="lsi-parlama" x1="150" y1="76" x2="140" y2="90" />
      <polygon className="lsi-kontur" points={nokta([A, C, g[4], uc, g[0]])} />
    </>
  );
}

// Efsane: 5 kollu yıldız; her kol merkezden iki üçgen, ışığa (sol üst) bakan yüz açık
function Efsane() {
  const R = 84, r = 37;
  const p = (aci, yc) => [CX + yc * Math.cos(aci), CY + yc * Math.sin(aci)];
  const rad = (d) => (d * Math.PI) / 180;
  const yuzler = [];
  const dis = [];
  for (let k = 0; k < 5; k++) {
    const a = -90 + 72 * k;
    const uc = p(rad(a), R);
    for (const yon of [-1, 1]) {
      const ic = p(rad(a + 36 * yon), r);
      const nAci = rad(a + 36 * yon);
      const isikta = Math.cos(nAci) * -1 + Math.sin(nAci) * -1 > -0.35;
      yuzler.push([isikta ? "lsi-isik" : "lsi-orta", [[CX, CY], uc, ic]]);
    }
    dis.push(uc, p(rad(a + 36), r));
  }
  return (
    <>
      {yuzler.map(([s, pts], i) => <polygon key={i} className={`${s} lsi-faset`} points={nokta(pts)} />)}
      <polygon className="lsi-kontur" points={nokta(dis)} />
    </>
  );
}

const CIZIM = { bronz: Bronz, gumus: Gumus, elmas: Elmas, efsane: Efsane };

/** Lig imza katmanı. Altın ve bilinmeyen lig → hiçbir şey çizmez (CSS ışın deseni / düz zemin kalır). */
export default function LigSahnesiImza({ lig }) {
  const Cizim = CIZIM[lig];
  if (!Cizim) return null;
  return (
    <span className="qt-ok-sahne" aria-hidden="true">
      <svg className="qt-ok-sahne-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} focusable="false">
        <Cizim />
      </svg>
    </span>
  );
}
