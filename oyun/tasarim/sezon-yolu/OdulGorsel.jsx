// Ödül görseli (yuva + önizleme + şerit + final kartı ortak): coin/elmas/joker/tepki/unvan için mevcut bileşenler.
// placeholder'da gerçek görsel YOK, "?". Tür'e göre büyük önizleme OdulSayfasi.jsx'te.
// Premium çerçeve ödülü (cerceve + pc_*) oyuncunun kendi avatarıyla çizilir (CerceveOdulGorsel; kimlik OdulKimlik bağlamından).
import { QtIkon, sayiBicim } from "../index.js";
import { UnvanSimge } from "../gorsel-revizyon/b/cizim/unvan.jsx";
import { tt } from "../../lib/dil.js";
import { KOZMETIK_TANIMLARI, TEPKI_TANIMLARI, tepkiGorseli } from "../../lib/kozmetik.js";
import { CoinIkon, ElmasIkon } from "../../components/ParaIkonlari.jsx";
import SkillRozeti from "../../components/SkillRozeti.jsx";
import CerceveOdulGorsel, { odulCerceveSanati } from "./CerceveOdulGorsel.jsx";
import { NadirlikImg } from "../../components/AvatarNadirlikGoruntu.jsx";
import { KAYIT as ARKA_PLAN_KAYIT } from "../arka-plan/kayit.jsx";
import { NADIRLIK_ADI } from "../cerceveler/tanimlar.js";
import { premiumSanat } from "../../lib/kozmetik.js";
import "./odul-gorsel.css";

/** Avatar ödülünün adresi: veri.url (822) | eski alanlar | veri.anahtar → /avatars/pro/<anahtar>.svg (yoksa null). */
export function odulAvatarAdresi(v) {
  if (v?.url) return v.url;
  if (v?.gorsel) return v.gorsel;
  if (v?.avatar_url) return v.avatar_url;
  if (v?.anahtar) return `/avatars/pro/${v.anahtar}.svg`;
  return null;
}

/** Arka plan ödülünün kayıt satırı (veri.sanat | anahtarın öneksiz hâli); çizimi yoksa null. */
export const odulArkaPlani = (v) => ARKA_PLAN_KAYIT[v?.sanat ?? premiumSanat(v?.anahtar)] ?? null;

/** Arka plan ödülü: arka planın kendisi küçük bir kart olarak (yuvada durağan, önizlemede hareketli). */
export function ArkaPlanOdulGorsel({ odul, boyut = 36, hareketli = false }) {
  const K = odulArkaPlani(odul?.veri);
  if (!K) return <QtIkon ad="gunes" boyut={Math.round(boyut * 0.8)} />;
  return (
    <span className="sy-odul-abp" style={{ "--sy-b": `${boyut}px` }} aria-hidden="true">
      <K.Bilesen hareketli={hareketli} yukseklik={boyut} grup="dukkan" />
    </span>
  );
}

export const anahtar = (o) => `${o.seviye}:${o.kol}`;

export function OdulGorsel({ odul, boyut = 36, hareketli = false }) {
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
    case "avatar": {
      // 822: gerçek avatar (Sahne rengi nadirlikten); adres yoksa eski ikon
      const src = odulAvatarAdresi(v);
      if (!src) return <QtIkon ad="kisi" boyut={Math.round(boyut * 0.8)} />;
      return <NadirlikImg className="sy-odul-avatar" src={src} alt="" width={boyut} height={boyut} loading="lazy" decoding="async" draggable="false" />;
    }
    case "arka_plan": return <ArkaPlanOdulGorsel odul={odul} boyut={boyut} hareketli={hareketli} />;
    case "cerceve":
      // Premium çerçeve (ör. Ejderha): oyuncunun kendi avatarıyla; diğer çerçeveler eski ikon
      if (odulCerceveSanati(odul)) return <CerceveOdulGorsel odul={odul} boyut={boyut} hareketli={hareketli} />;
      return <QtIkon ad="madalya" boyut={Math.round(boyut * 0.8)} />;
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
  // 822: avatar / arka plan yuvasında görsel zaten ödülü anlatır; altındaki yazı NADİRLİK etiketidir
  if (o.tur === "avatar") return NADIRLIK_ADI[o.nadirlik] ? tt(NADIRLIK_ADI[o.nadirlik]) : tt("Avatar");
  if (o.tur === "arka_plan") return NADIRLIK_ADI[o.nadirlik] ? tt(NADIRLIK_ADI[o.nadirlik]) : tt("Arka plan");
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
