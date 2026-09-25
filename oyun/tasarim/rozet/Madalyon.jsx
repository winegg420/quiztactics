/**
 * MADALYON ROZET (Ida seçimi 25 Eyl 2026 — tasarim/SECIMLER_GORSEL_REVIZYON.md › 10 "1 — Madalyon").
 * KURAL: rozet = TEMEL AMBLEM (ne için; kendi zemin rengi + sembolü) × SEVİYE (kademe: 1 bronz · 2 gümüş · 3 altın ·
 * 4 elmas). Seviye yalnız kenar metalini değil SİLUETİ de değiştirir: 1 yalın · 2 + kurdele kuyrukları · 3 + defne
 * dalları · 4 + taç, kenar taşları, ışıltı (≥ 48 px ve `hareketli` ise ekrandayken oynar; hareketi azalt → yavaş).
 * Aynı grup + kademe + amblemde birden çok rozet varsa (Level 5 / 10 / 15 …) madalyonun altında EŞİK RAKAMI durur
 * → birbirine benzeyen rozet kalmaz. ≤ 28 px küçük çizim (kalın kontur, rakam yok).
 * Rozet anahtarları ve kazanım kuralları DEĞİŞMEDİ; yalnız görünüm. Madalyon çizimi önizlemedeki adayın aynısı
 * (gorsel-revizyon/a/cizim/rozet.jsx › Madalyon), amblem seti burada genişletildi (amblemler.jsx).
 */
import { useId } from "react";
import { METAL, TAS, KREM, SAHNE } from "../gorsel-revizyon/palet.js";
import { Hareket, Isiltilar } from "../gorsel-revizyon/a/cizim/ortak.jsx";
import { AMBLEMLER, kategoriAmblemi } from "./amblemler.jsx";
import "./madalyon.css";

const K = "#0b1220";
const RAD = Math.PI / 180;
const f = (n) => Math.round(n * 100) / 100;
const kutup = (r, a, cx = 0, cy = 0) => [f(cx + r * Math.sin(a * RAD)), f(cy - r * Math.cos(a * RAD))];
const yay = (r, a0, a1, cx, cy) => { const [x0, y0] = kutup(r, a0, cx, cy); const [x1, y1] = kutup(r, a1, cx, cy); return `M${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}`; };
const cz = (w) => ({ stroke: K, strokeWidth: w, strokeLinejoin: "round", strokeLinecap: "round" });

export const KADEMELER = ["bronz", "gumus", "altin", "elmas"];
const SEVIYE = { bronz: 1, gumus: 2, altin: 3, elmas: 4 };
const SEVIYE_METAL = [null, "bronz", "gumus", "altin", "elmas"];

/** Sunucunun ikon önerisi → amblem. */
const IKON_AMBLEM = {
  star: "yildiz", trophy: "kupa", sword: "kiliclar", fire: "alev", flame: "alev", crown: "tac", "crown-simple": "tac",
  ticket: "bilet", medal: "madalya", "medal-military": "madalya", "shield-star": "ligYildiz", target: "hedef",
  "heart-half": "kalp", "arrow-bend-up-left": "donus", brain: "ampul", lightning: "simsek", "user-plus": "kisiArti",
  "users-three": "kisiler", gift: "hediye", handshake: "kalpler", "arrows-clockwise": "rovans", "hourglass-high": "kumSaati",
  compass: "pusula", "chat-circle-dots": "balon", "calendar-check": "takvim", question: "soru",
};
/** İkon yoksa grup → amblem. */
const GRUP_AMBLEM = {
  level: "yildiz", klasik: "kupa", duello: "kiliclar", seri: "alev", turnuva: "tac", lig: "ligYildiz", ozel: "simsek",
  sosyal: "kisiler", gizli: "soru",
};
/** Anahtara özel amblem (aynı ikonu paylaşıp ayrışması gerekenler). */
const ANAHTAR_AMBLEM = { lig_efsane_bir: "tacEfsane", lig_sehir_sampiyonu: "sehirTac" };
/** Lig çıkış rozetleri: yıldız, ÇIKILAN ligin metalinde. */
const LIG_HEDEF = { lig_cikis_gumus: "gumus", lig_cikis_altin: "altin", lig_cikis_elmas: "elmas", lig_cikis_efsane: "efsane" };
/** Eşik rakamı taşıyanlar (aynı grup + kademe + amblemde kardeşi olanlar). */
const RAKAMLI = /^(level_|klasik_|duello_|seri_|ozel_saf_|ozel_seri_|sosyal_davet_|sosyal_arkadas_\d|turnuva_sampiyon_\d)/;

/** Rozet satırı → { amblem, seviye, metal, sayi }. Bilinmeyen rozet grup sembolüne düşer. */
export function rozetGorunumu({ anahtar, grup, kademe, ikon, gizli = false }) {
  const sv = SEVIYE[kademe] ?? 1;
  if (gizli) return { a: AMBLEMLER.soru, sv: 1, metal: null, sayi: null, gizli: true };
  let a = null;
  if (typeof ikon === "string" && ikon.startsWith("kategori:")) a = kategoriAmblemi(ikon.slice(9));
  else a = AMBLEMLER[ANAHTAR_AMBLEM[anahtar] ?? IKON_AMBLEM[ikon] ?? GRUP_AMBLEM[grup]] ?? AMBLEMLER.yildiz;
  const hedef = LIG_HEDEF[anahtar];
  const sayi = anahtar && RAKAMLI.test(anahtar) ? (anahtar.match(/_(\d+)$/)?.[1] ?? null) : null;
  return { a, sv, metal: hedef ? METAL[hedef] : null, sayi, gizli: false };
}

// ---------------------------------------------------------------- seviye süsleri (64 birimlik kutu)
function Kurdele({ zemin, w }) {
  const kuyruk = (
    <>
      <path d="M33 40L39 60L43 54.6L48.6 57.4L43.4 37Z" fill={zemin} {...cz(w)} />
      <path d="M36.4 42L41.2 56" stroke={K} strokeWidth="1.2" opacity=".22" strokeLinecap="round" />
    </>
  );
  return <g>{kuyruk}<g transform="translate(64 0) scale(-1 1)">{kuyruk}</g></g>;
}
function Defne({ m, w, cx, cy, r, kucuk }) {
  const y = [];
  const adet = kucuk ? 3 : 5;
  const adim = kucuk ? 26 : 17;
  for (const yon of [-1, 1]) {
    for (let i = 0; i < adet; i += 1) {
      const a = yon > 0 ? 152 - i * adim : 208 + i * adim;
      const [x, yy] = kutup(r, a, cx, cy);
      y.push(<ellipse key={`${yon}${i}`} cx={x} cy={yy} rx={kucuk ? 3.2 : 2.5} ry={kucuk ? 5.8 : 4.8}
                      transform={`rotate(${a + 90 - yon * 35} ${x} ${yy})`} fill={i % 2 ? m.orta : m.acik} {...cz(w)} />);
    }
  }
  return <g>{y}</g>;
}
function Tac({ x, y, m, w, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-9 4L-10 -6L-4.6 -1.6L0 -9L4.6 -1.6L10 -6L9 4Z" fill={m.orta} {...cz(w / s)} />
      <path d="M-9 4L-10 -6L-4.6 -1.6L0 -9V4Z" fill={m.acik} />
      <path d="M-9 4L-10 -6L-4.6 -1.6L0 -9L4.6 -1.6L10 -6L9 4Z" fill="none" {...cz(w / s)} />
      <circle cx="0" cy="-1" r="1.9" fill={TAS.yakut} stroke={K} strokeWidth={f(1.1 / s)} />
    </g>
  );
}

/** Madalyonun SVG içi (viewBox 0 0 64 64). */
function MadalyonCizim({ g, k, kimlik }) {
  const { a, sv, metal, sayi, gizli } = g;
  const m = gizli ? METAL.gumus : METAL[SEVIYE_METAL[sv]];
  const w = k ? 4 : 2.6;
  const cx = 32;
  const cy = sv >= 4 ? 32 : 30;
  const R = sv >= 3 ? 16.5 : 18;
  const r = R - (k ? 4.4 : 5);
  const S = a.Sembol;
  const rakamGen = sayi ? sayi.length * 4.8 + 5.4 : 0;
  const kirp = `${kimlik}k`;
  return (
    <>
      {sv >= 2 && <Kurdele zemin={a.zemin} w={w * 0.8} />}
      {sv >= 3 && <Defne m={m} w={w * 0.55} cx={cx} cy={cy} r={R + 4.2} kucuk={k} />}
      <circle cx={cx} cy={cy} r={R} fill={m.orta} />
      <path d={`M${kutup(R, 250, cx, cy).join(" ")}A${R} ${R} 0 0 1 ${kutup(R, 20, cx, cy).join(" ")}L${kutup(r, 20, cx, cy).join(" ")}A${r} ${r} 0 0 0 ${kutup(r, 250, cx, cy).join(" ")}Z`} fill={m.acik} />
      <path d={`M${kutup(R, 70, cx, cy).join(" ")}A${R} ${R} 0 0 1 ${kutup(R, 200, cx, cy).join(" ")}L${kutup(r, 200, cx, cy).join(" ")}A${r} ${r} 0 0 0 ${kutup(r, 70, cx, cy).join(" ")}Z`} fill={m.koyu} />
      <circle cx={cx} cy={cy} r={r} fill={a.zemin} stroke={m.kenar} strokeWidth={k ? 1.6 : 1.4} />
      <clipPath id={kirp}><circle cx={cx} cy={cy} r={r} /></clipPath>
      <path d={`M${kutup(r, 250, cx, cy).join(" ")}A${r} ${r} 0 0 1 ${kutup(r, 20, cx, cy).join(" ")}A${r * 1.2} ${r * 1.2} 0 0 0 ${kutup(r, 250, cx, cy).join(" ")}Z`} fill={K} opacity=".18" />
      <g clipPath={`url(#${kirp})`}>
        <g transform={`translate(${cx} ${cy}) scale(${f((r / 14.5) * (k ? 1.02 : 0.95))})`}><S metal={metal ?? undefined} /></g>
      </g>
      {sv >= 4 && [45, 135, 225, 315].map((d) => { const [x, y] = kutup((R + r) / 2, d, cx, cy); return <circle key={d} cx={x} cy={y} r={k ? 2 : 1.7} fill={TAS.yakut} stroke={K} strokeWidth="1" />; })}
      <path d={yay(R - 2.2, 292, 334, cx, cy)} fill="none" stroke="#fff" strokeWidth={k ? 2.6 : 2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={R} fill="none" {...cz(w)} />
      {sv >= 4 && <Tac x={cx} y={cy - R - 3} m={m} w={w * 0.8} s={k ? 1.05 : 0.9} />}
      {sayi && !k && (
        <g>
          <rect x={f(cx - rakamGen / 2)} y={cy + R - 4.6} width={f(rakamGen)} height="9.6" rx="3.2" fill={SAHNE.lacivert} {...cz(1.5)} />
          <text x={cx} y={cy + R + 2.7} textAnchor="middle" fontSize="8.2" fontWeight="900" fill={KREM}
                fontFamily="'Baloo 2', Nunito, system-ui, sans-serif">{sayi}</text>
        </g>
      )}
    </>
  );
}

/**
 * @param {object} o
 * @param {string} [o.anahtar]  rozet anahtarı (amblem + eşik rakamı buradan)
 * @param {string} o.grup
 * @param {string} [o.kademe]   bronz|gumus|altin|elmas
 * @param {string} [o.ikon]     sunucunun ikon önerisi (kategori:<k> dahil)
 * @param {number} [o.boyut=48]
 * @param {boolean} [o.kilitli] henüz kazanılmadı (soluk)
 * @param {boolean} [o.gizli]   gizli ve kazanılmadı → "?" madalyonu, kademe gizli
 * @param {boolean} [o.hareketli] elmas seviyede ışıltı (≥ 48 px, ekrandayken)
 * @param {string} [o.etiket]   erişilebilir ad; yoksa süs
 */
export default function Madalyon({ anahtar, grup, kademe = "bronz", ikon, boyut = 48, kilitli = false, gizli = false,
  hareketli = false, etiket, className = "" }) {
  const ham = useId();
  const kimlik = `rm${ham.replace(/[^a-zA-Z0-9]/g, "")}`;
  const g = rozetGorunumu({ anahtar, grup, kademe, ikon, gizli });
  const k = boyut <= 28;
  const oynar = hareketli && !kilitli && !gizli && boyut >= 48 && g.sv >= 4;
  return (
    <Hareket className={`qt-rm${kilitli ? " qt-rm--kilitli" : ""}${gizli ? " qt-rm--gizli" : ""} ${className}`.trim()}
             style={{ width: boyut, height: boyut }}
             {...(etiket ? { role: "img", "aria-label": etiket } : { "aria-hidden": "true" })}>
      <svg viewBox="0 0 64 64" focusable="false"><MadalyonCizim g={g} k={k} kimlik={kimlik} /></svg>
      {oynar && <Isiltilar noktalar={[[53, 12, 5, 0], [12, 50, 3.6, 1.2]]} />}
    </Hareket>
  );
}
