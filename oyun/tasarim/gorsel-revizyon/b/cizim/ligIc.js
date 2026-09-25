// İÇ (elenen) lig set yönleri — yalnız ?ic=1 ile görünür, Ida'ya gösterilmez. Eleme gerekçesi bölüm notunda.
// C "Yıldız Madalyon": halkanın tepesinde 1→5 yıldız. D "Arma Kalkanı": avatarın arkasında kalkan + kademeli süs.
import { METAL, TAS, cz, svg, halkaDuz, yildiz, yerlestir, tas } from "./araclar.js";

const SIRA = ["bronz", "gumus", "altin", "elmas", "efsane"];

function yildizMadalyon(lig, k) {
  const m = METAL[lig];
  const n = SIRA.indexOf(lig) + 1;
  const kucuk = k === "kucuk";
  let g = halkaDuz({ m, ic: kucuk ? 41 : 43, dis: kucuk ? 49.5 : 51, kw: kucuk ? 2.8 : 2.4 });
  const aci = 22;
  for (let i = 0; i < n; i += 1) {
    const a = (i - (n - 1) / 2) * aci;
    g += yerlestir(a, kucuk ? 44 : 55, yildiz(0, 0, kucuk ? 5 : 7.5, METAL.altin, 1.2));
  }
  return svg(g);
}

function kalkan(lig, k) {
  const m = METAL[lig];
  const n = SIRA.indexOf(lig);
  const kucuk = k === "kucuk";
  const s = kucuk ? 0.86 : 1;
  const govde = `M0 -60L50 -46V6C50 36 28 56 0 66C-28 56 -50 36 -50 6V-46Z`;
  let g = `<g transform="scale(${s})"><path d="${govde}" fill="${m.orta}"/><path d="M0 -60L-50 -46V6C-50 36 -28 56 0 66Z" fill="${m.acik}"/><path d="${govde}" fill="none" ${cz(2.6)}/></g>`;
  g += halkaDuz({ m, ic: 43, dis: 48, kw: 2.2 });
  if (n >= 2) g += tas(0, kucuk ? -46 : -52, 3.6, TAS.yakut, TAS.yakutKoyu, 1);
  if (n >= 3) g += tas(-30, -40, 2.6, TAS.safir, TAS.safirKoyu) + tas(30, -40, 2.6, TAS.safir, TAS.safirKoyu);
  if (n >= 4 && !kucuk) g += yerlestir(0, 66, yildiz(0, 0, 8, METAL.altin, 1.2));
  return svg(g);
}

export const LIG_C = Object.fromEntries(SIRA.map((l) => [l, (k) => yildizMadalyon(l, k)]));
export const LIG_D = Object.fromEntries(SIRA.map((l) => [l, (k) => kalkan(l, k)]));
