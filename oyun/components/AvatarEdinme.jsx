// ============================================================
// 1039 · AVATAR EDİNME — kilitli avatara dokununca açılan kısa kart (bütün avatar ızgaralarında AYNI bileşen:
// Dükkân › Avatar, Profil › avatar değiştir, Koleksiyon, kurulum).
// Edinme bilgisi tek kaynaktan: sunucu `avatar_sahiplik_durumu` satırı (s) — { edinme, edinme_level, edinme_sezon_seviye,
// bp_ucretli_seviye, fiyat, satilik, sahibim, nadirlik }. Karar sunucuda (avatar_onayla / avatar_satin_al); burası gösterge.
// Yazı kısa, tek satır: "Lv 25'te açılır · sen Lv 12" · "Sezon Yolu · Ücretsiz kol · Seviye 10" · "750 coin · Al" · "150 elmas · Al".
// ============================================================
import { useState } from "react";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { avatarSatinAl } from "../lib/avatarKatalogu.js";
import { coinTazele } from "../lib/coin.js";
import { elmasTazele } from "../lib/elmas.js";
import { kozmetikHatasi } from "../lib/kozmetik.js";
import { sesHataUyari } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtModal, dokunus, odulHissi } from "../tasarim/index.js";
import { NadirlikImg, etiketNadirligi } from "./AvatarNadirlikGoruntu.jsx";
import { CoinIkon, ElmasIkon } from "./ParaIkonlari.jsx";
import NadirlikEtiketi from "./NadirlikEtiketi.jsx";

// Türkçe bulunma eki: "Lv 25'te", "Lv 10'da", "Lv 50'de" (sayının okunuşunun son ünlüsüne göre)
const BIRLER = ["", "de", "de", "te", "te", "te", "da", "de", "de", "da"];
const ONLAR = ["", "da", "de", "da", "ta", "de", "ta", "te", "de", "da"];
export function bulunmaEki(n) {
  const x = Math.abs(Math.trunc(Number(n) || 0));
  if (x % 1000 === 0 && x > 0) return "de";
  if (x % 100 === 0 && x > 0) return "de";
  if (x % 10) return BIRLER[x % 10];
  return ONLAR[Math.floor(x / 10) % 10] || "de";
}

/** Sunucu satırından tek satırlık "nasıl açılır" metni (Al düğmesi olanlarda null). */
export function edinmeMetni(s, level) {
  if (!s) return null;
  if (s.edinme === "level" && s.edinme_level) {
    return tt("Lv {n}'{ek} açılır · sen Lv {m}", { n: s.edinme_level, ek: bulunmaEki(s.edinme_level), m: Number(level) || 1 });
  }
  if (s.edinme === "sezon" && s.edinme_sezon_seviye) return tt("Sezon Yolu · Ücretsiz kol · Seviye {n}", { n: s.edinme_sezon_seviye });
  return null;
}

/** Ödenen para birimi (coin | elmas) — yalnız Dükkân'da satılan avatarlar. */
export const edinmeParasi = (s) => (s?.edinme === "coin" || s?.edinme === "elmas" ? s.edinme : null);

/**
 * Kilitli avatar kartı.
 * @param {string} url, ad      avatar adresi ve görünen adı
 * @param {object} s            avatar_sahiplik_durumu satırı
 * @param {Function} onKapat
 * @param {Function} [onTak]    satın alındıktan sonra "Tak" (verilmezse yalnız Kapat)
 * @param {Function} [onElmasAl] elmas alımını üst bileşen kendi onay penceresiyle yapsın (Dükkân); verilmezse burada alınır
 * @param {Function} [onAlindi] satın alma sunucuda onaylanınca
 */
export function AvatarEdinmeKarti({ url, ad, s, onKapat, onTak, onElmasAl, onAlindi }) {
  const { profile } = useAuth();
  const [islem, setIslem] = useState(null);
  const [hata, setHata] = useState(null);
  const [alindi, setAlindi] = useState(false);
  const para = edinmeParasi(s);
  const satilik = Boolean(para && s?.satilik && Number(s?.fiyat) > 0);
  const metin = edinmeMetni(s, profile?.level);
  const nadirlik = etiketNadirligi(s?.nadirlik);
  const sahip = alindi || Boolean(s?.sahibim);

  const al = async () => {
    if (islem || !satilik) return;
    if (para === "elmas" && onElmasAl) { onElmasAl(); return; }
    setIslem("al");
    setHata(null);
    try {
      await avatarSatinAl(s.anahtar ?? url);   // sahiplik durumunu da tazeler
      if (para === "coin") coinTazele(); else elmasTazele();
      setAlindi(true);
      odulHissi?.();
      onAlindi?.(url);
    } catch (e) {
      const m = String(e?.message ?? "").includes("Yetersiz coin") ? tt("Coin yetmiyor") : kozmetikHatasi(e);
      sesHataUyari();
      setHata(m);
    } finally {
      setIslem(null);
    }
  };

  const ParaIkonu = para === "coin" ? CoinIkon : ElmasIkon;
  return (
    <QtModal acik tur="altSayfa" onKapat={onKapat} baslik={ad}
             altlik={(
               <div className="m1-sat-dugmeler">
                 <QtDugme tur="ikincil" onClick={onKapat}>{tt("Kapat")}</QtDugme>
                 {sahip ? (
                   onTak ? <QtDugme ikon="onay" yukleniyor={islem === "tak"} onClick={() => { dokunus(); onTak(url); }} data-qt-ilk-odak>{tt("Tak")}</QtDugme> : null
                 ) : satilik ? (
                   <QtDugme tur="dogru" yukleniyor={islem === "al"} devreDisi={Boolean(islem)} onClick={() => { dokunus(); al(); }} data-qt-ilk-odak>
                     <span className="qt-av-edinme-fiyat"><ParaIkonu boyut={18} />
                       {para === "coin" ? tt("{n} coin · Al", { n: s.fiyat }) : tt("{n} elmas · Al", { n: s.fiyat })}</span>
                   </QtDugme>
                 ) : null}
               </div>
             )}>
      <div className="m1-sat qt-av-edinme">
        <span className="m1-sat-ikon qt-sat-gorsel" aria-hidden="true">
          <NadirlikImg src={url} alt="" width="96" height="96" decoding="async" />
        </span>
        {nadirlik && <NadirlikEtiketi nadirlik={nadirlik} />}
        {sahip ? (
          <p className="qt-av-edinme-satir" role="status">{tt("{ad} senin.", { ad })}</p>
        ) : metin ? (
          <p className="qt-av-edinme-satir">{metin}</p>
        ) : para && !satilik ? (
          <p className="qt-av-edinme-satir">{tt("Şu an satışta değil")}</p>
        ) : null}
        {!sahip && para === "elmas" && s?.bp_ucretli_seviye ? (
          <p className="qt-av-edinme-satir qt-av-edinme-satir--ek">{tt("ya da Sezon Yolu · Seviye {n}", { n: s.bp_ucretli_seviye })}</p>
        ) : null}
        {hata && <div className="m1-bant m1-bant--hata" role="alert"><span>{hata}</span></div>}
      </div>
    </QtModal>
  );
}
