// Ödül görseli (yuva + önizleme + şerit + final kartı ortak): coin/elmas/joker/tepki/unvan için mevcut bileşenler.
// placeholder'da gerçek görsel YOK, "?". Tür'e göre büyük önizleme OdulSayfasi.jsx'te.
import { QtIkon, sayiBicim } from "../index.js";
import { UnvanSimge } from "../gorsel-revizyon/b/cizim/unvan.jsx";
import { tt } from "../../lib/dil.js";
import { KOZMETIK_TANIMLARI, TEPKI_TANIMLARI, tepkiGorseli } from "../../lib/kozmetik.js";
import { CoinIkon, ElmasIkon } from "../../components/ParaIkonlari.jsx";
import SkillRozeti from "../../components/SkillRozeti.jsx";

export const anahtar = (o) => `${o.seviye}:${o.kol}`;

export function OdulGorsel({ odul, boyut = 36 }) {
  if (!odul) return null;
  const v = odul.veri ?? {};
  if (odul.placeholder) return <span className="sy-soru" style={{ "--sy-b": `${boyut}px` }} aria-hidden="true">?</span>;
  switch (odul.tur) {
    case "coin": return <CoinIkon boyut={boyut} />;
    case "elmas": return <ElmasIkon boyut={boyut} />;
    case "joker": return <SkillRozeti tur={v.tur} boyut={boyut} />;
    case "tepki_paketi": {
      const liste = (KOZMETIK_TANIMLARI[v.anahtar]?.tepkiler ?? []).filter((k) => TEPKI_TANIMLARI[k]).slice(0, 4);
      if (!liste.length) return <QtIkon ad="gulen" boyut={Math.round(boyut * 0.8)} />;
      const k = Math.round(boyut / 2) - 1;
      return (
        <span className="sy-tepkiler" style={{ "--sy-k": `${k}px` }} aria-hidden="true">
          {liste.map((t) => <img key={t} src={tepkiGorseli(t)} alt="" width={k} height={k} loading="lazy" decoding="async" draggable="false" />)}
        </span>
      );
    }
    case "unvan": return <UnvanSimge tur="basari" boyut={Math.round(boyut * 0.9)} />;
    case "avatar": return <QtIkon ad="kisi" boyut={Math.round(boyut * 0.8)} />;
    case "cerceve": return <QtIkon ad="madalya" boyut={Math.round(boyut * 0.8)} />;
    default: return <QtIkon ad="hediye" boyut={Math.round(boyut * 0.8)} />;
  }
}

/** Yuvanın altındaki kısa yazı (sayı ya da tür). */
export function kisaYazi(o) {
  const v = o.veri ?? {};
  if (o.placeholder) return tt("Yakında");
  if (o.tur === "coin" || o.tur === "elmas") return sayiBicim(Number(v.miktar ?? 0));
  if (o.tur === "joker") return `×${Number(v.adet ?? 1)}`;
  if (o.tur === "tepki_paketi") return tt("Tepki");
  if (o.tur === "unvan") return tt("Unvan");
  if (o.tur === "avatar") return tt("Avatar");
  if (o.tur === "cerceve") return tt("Çerçeve");
  return "";
}

/** Coin/elmas ödülünün miktarı (uçuş animasyonu için); başka tür → 0. */
export function paraMiktari(o) {
  if (!o || (o.tur !== "coin" && o.tur !== "elmas")) return 0;
  return Number(o.miktar ?? o.veri?.miktar ?? 0) || 0;
}

/** Kilometre taşı: her 5. seviye ve son seviye. */
export const tasMi = (n, toplam) => n % 5 === 0 || n === toplam;
