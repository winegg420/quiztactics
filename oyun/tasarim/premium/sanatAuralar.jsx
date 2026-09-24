/**
 * PREMIUM AURALAR (6) — avatarın İÇ arka planı (yalnız /premium-onizleme). Çerçevenin içindeki düz renk
 * yerine hareketli sahne; dairenin dışına taşmaz, avatar önde. Derinlik: arka katman küçük, soluk,
 * yumuşak kenarlı ve yavaş; ön katman büyük, net ve hızlı. Parçacık yolları iç daireye göre (cqw/cqh),
 * hareket yalnız transform/opacity. Kademe: tam (hepsi) · orta (yarısı) · kucuk (az, durağan).
 */
import { AKCAAGAC } from "./sanatCerceveler.jsx";
import { f, tohum } from "./cizim.jsx";

const sayi = (k, tam) => (k === "tam" ? tam : k === "orta" ? Math.ceil(tam / 2) : Math.min(3, Math.ceil(tam / 3)));

/** Tohumlu parçacık listesi. */
function parcaciklar(ad, adet, ayar) {
  const r = tohum(ad);
  return Array.from({ length: adet }, (_, i) => ayar(r, i));
}

/**
 * Tek parçacık. tur: "dus" | "yuksel" | "yanip" | "aurora" | "huzme" | "kayan"; ic: iç hareket ("sal" | "don" | "takla" | "kivilcim").
 */
function P({ tur, ic, x, y, w, h = w, s, g, is, ig, stil, icStil, children }) {
  return (
    <span className={`pc-p pc-p--${tur}${ic ? ` pc-p--${ic}` : ""}`}
          style={{ left: `${f(x)}%`, ...(y != null ? { top: `${f(y)}%` } : {}), width: `${f(w)}%`, height: `${f(h)}%`,
                   animationDuration: `${f(s)}s`, animationDelay: `${f(g)}s`, ...stil }}>
      <span style={{ ...(is ? { animationDuration: `${f(is)}s` } : {}), ...(ig != null ? { animationDelay: `${f(ig)}s` } : {}), ...icStil }}>
        {children}
      </span>
    </span>
  );
}
const YaprakSvg = ({ renk, damar = true }) => (
  <svg viewBox="-11 -11 22 22" aria-hidden="true">
    <path d={AKCAAGAC} fill={renk} stroke="#4a1606" strokeWidth=".5" strokeLinejoin="round" />
    {damar && <path d="M0 8V-8M0 2L5.6 -3.6M0 2L-5.6 -3.6" fill="none" stroke="#4a1606" strokeWidth=".45" opacity=".5" />}
  </svg>
);
const KarTanesi = () => (
  <svg viewBox="-10 -10 20 20" aria-hidden="true">
    <g stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((a) => <path key={a} d="M0 -9V9M-2.6 -6.4L0 -4.2L2.6 -6.4M-2.6 6.4L0 4.2L2.6 6.4" transform={`rotate(${a})`} />)}
    </g>
    <circle r="1.6" fill="#fff" />
  </svg>
);
const yumusak = (renk, dis = "transparent") => ({ background: `radial-gradient(circle closest-side, ${renk} 0%, ${renk} 34%, ${dis} 100%)`, borderRadius: "50%" });

// ---------------------------------------------------------------------
const Yaprak = {
  ad: "Düşen Sonbahar Yaprakları",
  aciklama: "Akşam güneşi zemini, uzak tepeler; arkada yumuşak, küçük ve yavaş; önde iri, net ve salınarak düşen akçaağaç yaprakları.",
  Sahne: ({ k }) => {
    const renk = ["#e2451f", "#f08a1f", "#f5c542", "#b8541a", "#d9361a"];
    const arka = parcaciklar("ay-a", sayi(k, 12), (r, i) => ({ x: r() * 92, w: 8 + r() * 4, s: 8 + r() * 4, g: -r() * 12, is: 2 + r(), renk: renk[i % 5], dx: `${f((r() - 0.5) * 30)}cqw` }));
    const on = parcaciklar("ay-o", sayi(k, 7), (r, i) => ({ x: r() * 86, w: 16 + r() * 6, s: 5 + r() * 2.5, g: -r() * 8, is: 1.6 + r() * 0.8, renk: renk[(i + 2) % 5], dx: `${f(-10 - r() * 25)}cqw` }));
    return (
      <span className="pc-sahne" style={{ background: "radial-gradient(circle at 72% 24%, rgba(255,236,170,.95) 0 8%, rgba(255,196,96,.45) 18%, transparent 42%), linear-gradient(180deg,#ffb35c 0%,#f08a3c 36%,#b0462a 68%,#4a1a14 100%)" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 70Q18 58 36 66T70 60T100 64V100H0Z" fill="#8a3420" opacity=".55" />
          <path d="M0 80Q24 70 48 78T100 74V100H0Z" fill="#4a1a12" opacity=".8" />
          <path d="M8 80V62M8 66l-5 -4M8 70l6 -5M88 76V56M88 62l-6 -5M88 66l5 -4" stroke="#3a120a" strokeWidth="1.4" opacity=".7" />
        </svg>
        {arka.map((p, i) => (
          <P key={`a${i}`} tur="dus" ic="sal" x={p.x} w={p.w} s={p.s} g={p.g} is={p.is} ig={-i * 0.4} stil={{ "--dx": p.dx, opacity: 0.5 }} icStil={{ "--sw": "4cqw" }}>
            <YaprakSvg renk={p.renk} damar={false} />
          </P>
        ))}
        {on.map((p, i) => (
          <P key={`o${i}`} tur="dus" ic="takla" x={p.x} w={p.w} s={p.s} g={p.g} is={p.is} ig={-i * 0.3} stil={{ "--dx": p.dx }}>
            <YaprakSvg renk={p.renk} />
          </P>
        ))}
      </span>
    );
  },
};

const Kar = {
  ad: "Yağan Kar",
  aciklama: "Ay ışığı vuran gece mavisi, karlı tepe ve çamlar; arkada yumuşak küçük taneler, önde dönen iri kar kristalleri.",
  Sahne: ({ k }) => {
    const arka = parcaciklar("kr-a", sayi(k, 18), (r) => ({ x: r() * 96, w: 2.6 + r() * 2.6, s: 7 + r() * 4, g: -r() * 11, dx: `${f((r() - 0.5) * 16)}cqw`, is: 2 + r() * 1.5 }));
    const on = parcaciklar("kr-o", sayi(k, 8), (r) => ({ x: r() * 90, w: 9 + r() * 6, s: 4.5 + r() * 2.5, g: -r() * 7, dx: `${f((r() - 0.5) * 22)}cqw`, is: 3 + r() * 3 }));
    return (
      <span className="pc-sahne" style={{ background: "radial-gradient(circle at 28% 20%, rgba(230,242,255,.7) 0 6%, rgba(180,210,255,.25) 16%, transparent 36%), linear-gradient(180deg,#0e1a3a 0%,#1f3a72 55%,#5a7ab8 100%)" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <circle cx="28" cy="20" r="6" fill="#eef5ff" />
          <circle cx="30.5" cy="18.5" r="5.4" fill="#1a2f60" opacity=".35" />
          <path d="M72 78L78 60L84 78ZM80 80L87 57L94 80ZM4 82L10 64L16 82Z" fill="#12264a" opacity=".85" />
          <path d="M0 78Q25 68 50 76T100 72V100H0Z" fill="#dce9ff" />
          <path d="M0 84Q30 78 60 84T100 82V100H0Z" fill="#b8ccef" />
        </svg>
        {arka.map((p, i) => (
          <P key={`a${i}`} tur="dus" ic="sal" x={p.x} w={p.w} s={p.s} g={p.g} is={p.is} stil={{ "--dx": p.dx, opacity: 0.8 }} icStil={{ "--sw": "2cqw", ...yumusak("#ffffff") }} />
        ))}
        {on.map((p, i) => (
          <P key={`o${i}`} tur="dus" ic="don" x={p.x} w={p.w} s={p.s} g={p.g} is={p.is} stil={{ "--dx": p.dx }}>
            <KarTanesi />
          </P>
        ))}
      </span>
    );
  },
};

const Kor = {
  ad: "Yükselen Köz",
  aciklama: "Dipten yanan ateş ışığı; arkada soluk küçük kıvılcımlar, önde parlak, titreyerek yükselen közler.",
  Sahne: ({ k }) => {
    const arka = parcaciklar("ko-a", sayi(k, 20), (r) => ({ x: r() * 96, w: 3 + r() * 2.4, s: 4 + r() * 3, g: -r() * 7, dx: `${f((r() - 0.5) * 30)}cqw` }));
    const on = parcaciklar("ko-o", sayi(k, 22), (r) => ({ x: 4 + r() * 92, w: 6 + r() * 5, s: 2.6 + r() * 1.8, g: -r() * 5, dx: `${f((r() - 0.5) * 36)}cqw`, is: 0.5 + r() * 0.5 }));
    const kor = "radial-gradient(circle closest-side, #ffffff 0%, #fff3b0 16%, #ffc23a 34%, #ff7a12 56%, rgba(255,70,0,.35) 76%, rgba(255,60,0,0) 100%)";
    return (
      <span className="pc-sahne" style={{ background: "radial-gradient(ellipse 95% 62% at 50% 106%, #ffd05a 0%, #ff7a12 22%, #c22a0a 46%, #6a1208 72%, #2e0505 100%)" }}>
        <span className="pc-p pc-p--titrek" style={{ left: "5%", top: "55%", width: "90%", height: "60%", background: "radial-gradient(ellipse at 50% 70%, rgba(255,160,40,.55), transparent 65%)", animationDuration: "1.6s" }} />
        {arka.map((p, i) => (
          <P key={`a${i}`} tur="yuksel" x={p.x} w={p.w} s={p.s} g={p.g} stil={{ "--dx": p.dx, "--op": 0.55 }} icStil={{ background: kor, borderRadius: "50%" }} />
        ))}
        {on.map((p, i) => (
          <P key={`o${i}`} tur="yuksel" ic="kivilcim" x={p.x} w={p.w} s={p.s} g={p.g} is={p.is} stil={{ "--dx": p.dx }} icStil={{ background: kor, borderRadius: "50%" }} />
        ))}
      </span>
    );
  },
};

const Gece = {
  ad: "Yıldızlı Gece",
  aciklama: "Lacivertten mora gece gökyüzü, hilal ve tepeler; yanıp sönen yıldızlar ve arada gökyüzünü çizen kayan yıldız.",
  Sahne: ({ k }) => {
    const yildizlar = parcaciklar("gc", sayi(k, 30), (r) => ({ x: r() * 96, y: r() * 70, w: 1.4 + r() * 2.2, s: 1.4 + r() * 2, g: -r() * 3 }));
    return (
      <span className="pc-sahne" style={{ background: "radial-gradient(ellipse at 70% 30%, rgba(120,110,255,.35), transparent 55%), linear-gradient(180deg,#060a26 0%,#131a55 55%,#3b3f8f 100%)" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <ellipse cx="60" cy="34" rx="70" ry="11" transform="rotate(-28 60 34)" fill="#8fa0ff" opacity=".16" />
          <ellipse cx="60" cy="34" rx="50" ry="5" transform="rotate(-28 60 34)" fill="#dfe4ff" opacity=".14" />
          <path d="M26 14a9 9 0 1 0 9 12a7 7 0 1 1 -9 -12Z" fill="#fff4c8" />
          <path d="M0 76Q20 66 40 74T76 68T100 72V100H0Z" fill="#1a1a4a" />
          <path d="M0 86Q28 78 56 86T100 82V100H0Z" fill="#0c0c2a" />
        </svg>
        {yildizlar.map((p, i) => (
          <P key={i} tur="yanip" x={p.x} y={p.y} w={p.w} s={p.s} g={p.g} icStil={yumusak("#ffffff")} />
        ))}
        {[[62, 16, 4.2], [84, 40, 3.2], [14, 46, 3]].map(([x, y, w], i) => (
          <P key={`b${i}`} tur="yanip" x={x} y={y} w={w} s={1.8 + i * 0.5} g={-i}>
            <svg viewBox="-5 -5 10 10" aria-hidden="true"><path d="M0 -5L1 -1L5 0L1 1L0 5L-1 1L-5 0L-1 -1Z" fill="#fff" /></svg>
          </P>
        ))}
        {k !== "kucuk" && [[88, 4, 0], [70, 22, 3]].map(([x, y, g], i) => (
          <span key={`k${i}`} className="pc-p pc-p--kayan" style={{ left: `${x}%`, top: `${y}%`, width: "34%", height: "2%", animationDelay: `${g + 2}s` }}>
            <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "999px", transform: "rotate(-29deg)", transformOrigin: "0 50%",
                           background: "linear-gradient(90deg, #ffffff 0%, rgba(200,220,255,.8) 12%, rgba(160,190,255,0) 100%)" }} />
          </span>
        ))}
      </span>
    );
  },
};

const Kuzey = {
  ad: "Kuzey Işıkları",
  aciklama: "Karlı dağların üstünde dalgalanan yeşil-camgöbeği ve mor ışık perdeleri; arkada soluk yıldızlar.",
  Sahne: ({ k }) => {
    const yildizlar = parcaciklar("kz", 18, (r) => ({ x: r() * 100, y: r() * 60, r: 0.25 + r() * 0.5 }));
    const bantlar = [
      { top: -2, renk: "rgba(70,255,170,.98), rgba(40,230,200,.5) 45%", s: 9, g: 0 },
      { top: 8, renk: "rgba(150,120,255,.8), rgba(220,90,255,.45) 45%", s: 12, g: -5 },
      { top: 18, renk: "rgba(90,255,215,.85), rgba(40,200,255,.4) 45%", s: 10.5, g: -2.5 },
    ].slice(0, k === "tam" ? 3 : 2);
    return (
      <span className="pc-sahne" style={{ background: "linear-gradient(180deg,#020a18 0%,#062638 52%,#0b3a4a 100%)" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {yildizlar.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity=".7" />)}
        </svg>
        {bantlar.map((b, i) => (
          <span key={i} className="pc-p pc-p--aurora" style={{ left: "-30%", top: `${b.top}%`, width: "160%", height: "62%", animationDuration: `${b.s}s`, animationDelay: `${b.g}s`,
                                                              background: `repeating-linear-gradient(90deg, rgba(255,255,255,.14) 0 1.5%, transparent 1.5% 4.5%), radial-gradient(ellipse 50% 30% at 50% 60%, ${b.renk}, transparent 74%)`, WebkitMaskImage: "radial-gradient(ellipse 50% 34% at 50% 60%, #000 55%, transparent 80%)", maskImage: "radial-gradient(ellipse 50% 34% at 50% 60%, #000 55%, transparent 80%)" }} />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 80L14 62L24 72L38 52L52 70L64 58L78 74L90 60L100 70V100H0Z" fill="#0a1c2a" />
          <path d="M38 52L44 60L41 60L46 66L36 60L40 60ZM14 62L18 67L12 66ZM90 60L94 65L88 65Z" fill="#dff2ff" opacity=".85" />
          <path d="M0 88Q30 82 60 88T100 86V100H0Z" fill="#06121c" />
        </svg>
      </span>
    );
  },
};

const SuAlti = {
  ad: "Su Altı",
  aciklama: "Yüzeyden süzülen, salınan ışık huzmeleri; dipte yosunlar; salınarak yükselen kabarcıklar ve arkada soluk parçacıklar.",
  Sahne: ({ k }) => {
    const huzmeler = [[2, 18, 5.5, 0], [26, 13, 4.2, -2], [50, 20, 6, -1], [74, 14, 4.8, -3]].slice(0, k === "tam" ? 4 : 2);
    const kabarcik = parcaciklar("sa-o", sayi(k, 13), (r) => ({ x: 4 + r() * 92, w: 3.6 + r() * 5.4, s: 3.6 + r() * 2.6, g: -r() * 6, is: 0.9 + r() * 0.8, dx: `${f((r() - 0.5) * 10)}cqw` }));
    const toz = parcaciklar("sa-a", sayi(k, 10), (r) => ({ x: r() * 96, w: 1.2 + r() * 1.2, s: 8 + r() * 5, g: -r() * 12, dx: `${f((r() - 0.5) * 20)}cqw` }));
    return (
      <span className="pc-sahne" style={{ background: "linear-gradient(180deg,#6fe6ff 0%,#1a93d4 32%,#0a528f 68%,#05264f 100%)" }}>
        {huzmeler.map(([x, w, s, g], i) => (
          <span key={i} className="pc-p pc-p--huzme" style={{ left: `${x}%`, top: "-12%", width: `${w}%`, height: "112%", transformOrigin: "50% 0", animationDuration: `${s}s`, animationDelay: `${g}s`,
                                                             clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)", background: "linear-gradient(180deg, rgba(255,255,255,.78), rgba(220,250,255,.18) 55%, rgba(255,255,255,0) 90%)" }} />
        ))}
        {toz.map((p, i) => (
          <P key={`t${i}`} tur="yuksel" x={p.x} w={p.w} s={p.s} g={p.g} stil={{ "--dx": p.dx, "--op": 0.45 }} icStil={yumusak("#d8f6ff")} />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M10 100C6 90 14 84 9 74C5 66 12 60 10 54M16 100C19 92 13 86 17 78M84 100C88 88 80 82 86 70C90 62 84 58 86 50M90 100C93 94 88 90 91 82" fill="none" stroke="#0e6a4a" strokeWidth="2.4" strokeLinecap="round" opacity=".9" />
          <path d="M0 92Q30 86 56 92T100 90V100H0Z" fill="#c9a86a" opacity=".55" />
        </svg>
        {kabarcik.map((p, i) => (
          <P key={`k${i}`} tur="yuksel" ic="sal" x={p.x} w={p.w} s={p.s} g={p.g} is={p.is} stil={{ "--dx": p.dx }} icStil={{ "--sw": "2cqw" }}>
            <svg viewBox="-5 -5 10 10" aria-hidden="true">
              <circle r="4.3" fill="rgba(200,245,255,.15)" stroke="#e8fbff" strokeWidth=".7" />
              <ellipse cx="-1.6" cy="-1.8" rx="1.3" ry=".8" transform="rotate(-35 -1.6 -1.8)" fill="#fff" opacity=".9" />
            </svg>
          </P>
        ))}
      </span>
    );
  },
};

export const AURALAR = { yaprak: Yaprak, kar: Kar, kor: Kor, gece: Gece, kuzey: Kuzey, sualti: SuAlti };
export const AURA_SIRASI = Object.keys(AURALAR);
