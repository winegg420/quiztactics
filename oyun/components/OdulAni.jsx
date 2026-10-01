// ============================================================
// ÖDÜL ANI — ortak "kazandın" anı (docs/OYUN_HISSI_DENETIMI.md §5 P2; Görevler'den ortaklaştı, 1 Eki 2026).
// Tek çağrı: parıltı bandı + ikon zıplaması + altın halka + uçan çip (+ isteğe bağlı konfeti) + ses + titreşim.
//
//   const { kutla, ucan } = useOdulAni();
//   // sunucu "verildi" deyince (istemci ödül vermez; sayılar sunucu cevabından):
//   kutla(`gorev:${id}`, { coin: r.coin }, { his: "odul", coinZipla: r.coin > 0 });
//   // kartta:
//   const u = ucan(`gorev:${id}`);
//   <li className={`qt-oyk${u ? " qt-oyk--kutla" : ""}`}>
//     <span className="qt-oyk-ik">…</span> …
//     <OdulAni aktif={Boolean(u)}>{u && <UcanOge><CoinIkon boyut={16} />+{u.coin}</UcanOge>}</OdulAni>
//   </li>
//
// Kurallar: kart `position: relative` olmalı (.qt-oyk öyledir); uçan çip kartın içinde absolute (fixed yok).
// Konfeti yalnız nadir anlarda (sandık, kozmetik, lig yükselişi) — her satın almada değil. Ekran okuyucuya anı sayfanın
// kendi canlı bölgesi (role="status") söyler; buradaki her şey aria-hidden görsel ipucudur.
// Hareketi azalt: parıltı ve konfeti çizilmez, çip yerinde kalıp solar, titreşim çalmaz (tek kapı: tasarim/hareket.js).
// Stil: oyun/tasarim/oyun-hissi.css §5 + hareket.css (qt-h-isilti, qt-konfeti).
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import Konfeti from "./Konfeti.jsx";
import { odulHissi, ziplat, QT_COIN_HAPI } from "../tasarim/hareket.js";

/** Uçan çipin ekranda kalma süresi (ms) — oyun-hissi.css › .qt-oyk-ucan animasyonuyla eş. */
export const ODUL_ANI_MS = 2200;

/**
 * Ödül anı kancası.
 *   kutla(anahtar, veri, { his, coinZipla }) — anı başlatır. his: "odul" · "buyuk" · "satinAlma" · false (ses/titreşim yok).
 *     coinZipla: üst çubuktaki coin hapı bir kez zıplar (coin kazanıldıysa).
 *   ucan(anahtar) — o anahtarın anı sürüyorsa `veri`, değilse null. Aynı anda tek an yaşar (yenisi eskisini bitirir).
 */
export function useOdulAni({ sure = ODUL_ANI_MS } = {}) {
  const [an, setAn] = useState(null);   // { anahtar, veri }
  const zaman = useRef(null);
  useEffect(() => () => clearTimeout(zaman.current), []);

  const kutla = useCallback((anahtar, veri = {}, { his = "odul", coinZipla = false } = {}) => {
    clearTimeout(zaman.current);
    if (his) odulHissi(his);
    if (coinZipla) ziplat(QT_COIN_HAPI);
    setAn({ anahtar, veri });
    zaman.current = setTimeout(() => setAn(null), sure);
  }, [sure]);

  const ucan = useCallback((anahtar) => (an && an.anahtar === anahtar ? an.veri : null), [an]);
  return { kutla, ucan };
}

/** Uçan çipin tek parçası: <UcanOge><CoinIkon boyut={16} />+15</UcanOge> */
export function UcanOge({ children }) {
  return <span className="qt-oyk-ucan-oge">{children}</span>;
}

/** Uçan ödül çipi (kartın içinde). buyuk: sandık / kozmetik gibi büyük an — çip büyür ve ortalanır. */
export function UcanOdul({ buyuk = false, className, children }) {
  return (
    <span className={`qt-oyk-ucan${buyuk ? " qt-oyk-ucan--buyuk" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true" data-yumusak>
      {children}
    </span>
  );
}

/**
 * Kartın içine konur (kartın son çocukları). aktif olunca parıltı bandı + uçan çip çizer; `konfeti` verilirse patlama da.
 * children: UcanOge'ler (boşsa çip çizilmez). İkon zıplaması + altın halka için karta `qt-oyk--kutla` sınıfını ver.
 */
export default function OdulAni({ aktif = false, buyuk = false, konfeti = false, konfetiAdet = 28, ucanSinif, children }) {
  return (
    <>
      {aktif && <span className="qt-h-isilti" aria-hidden="true" />}
      {konfeti && <Konfeti aktif={Boolean(aktif)} adet={konfetiAdet} tur="patlama" />}
      {aktif && children != null && children !== false && <UcanOdul buyuk={buyuk} className={ucanSinif}>{children}</UcanOdul>}
    </>
  );
}
