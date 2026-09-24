/**
 * YENİ ROZET BİLDİRİMİ — kısa tost: madalyon + rozet adı + coin, hafif parıltı.
 * rozet_bildirimlerim() görülmemiş rozetleri bir kez döndürür (sunucu "görüldü" işaretler).
 * Maç ekranında sorulmaz (body.bd-oyun-modu); maçtan çıkınca / sayfa değişince en çok 20 sn'de bir sorulur.
 * Maç sonu ekranına büyük sahne KONMAZ (ayrı iş) — yalnız bu tost.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import RozetMadalyonu, { rozetSembolu } from "./RozetMadalyonu.jsx";
import { rozetBildirimlerim } from "../lib/rozet.js";
import { oyuncuKartiUnut } from "../lib/cerceve.js";
import { tt } from "../lib/dil.js";
import { sesRozet } from "../lib/ses.js";
import { QtIkonDugme, QtToastYuvasi, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/rozet-panel.css";

const ARALIK_MS = 20000;
const GOSTERIM_MS = 4200;

export default function RozetBildirimi() {
  const { pathname } = useLocation();
  const [kuyruk, setKuyruk] = useState([]);
  const sonSorgu = useRef(0);

  useEffect(() => {
    if (typeof document !== "undefined" && document.body.classList.contains("bd-oyun-modu")) return undefined;
    const simdi = Date.now();
    if (simdi - sonSorgu.current < ARALIK_MS) return undefined;
    sonSorgu.current = simdi;

    rozetBildirimlerim()
      .then((liste) => {
        // Sunucu bunları "görüldü" işaretledi: sayfa değişse de kuyruğa alınır (kaybolmasın).
        if (!liste?.length) return;
        // A.3: maç sonu sahnesinin zaten gösterdiği rozetler tost olarak ikinci kez çıkmaz.
        let sahnede = [];
        try { sahnede = JSON.parse(localStorage.getItem("bildim_sahne_rozetleri") || "[]"); } catch { /* özel mod */ }
        const yeni = liste.filter((r) => !sahnede.includes(r.anahtar));
        if (!yeni.length) return;
        setKuyruk((k) => [...k, ...yeni]);
        if (liste.some((r) => r.cerceve)) oyuncuKartiUnut();
      })
      .catch((e) => {
        // Bildirim atlanır, sonraki sayfa değişiminde yeniden denenir.
        console.warn("[Bildim] rozet bildirimi alınamadı:", e?.message ?? e);
        sonSorgu.current = 0;
      });
    return undefined;
  }, [pathname]);

  const ilk = kuyruk[0];
  useEffect(() => {
    if (!ilk) return undefined;
    // Ajan H: yeni rozet kartı açıldığı an (kart başına bir kez). A.3: maç sonu sahnesi açıkken sesi
    // sahne çalar — tost sesi üst üste binmesin.
    if (!document.querySelector(".msk")) sesRozet();
    const t = setTimeout(() => setKuyruk((k) => k.slice(1)), GOSTERIM_MS);
    return () => clearTimeout(t);
  }, [ilk]);

  if (!ilk) return null;
  return (
    <QtToastYuvasi konum="ust">
      <div key={ilk.anahtar} className="qt-toast qt-toast--coin qt-rb" role="status">
        <span className="qt-rb-madalyon" aria-hidden="true">
          <RozetMadalyonu grup={ilk.grup} kademe={ilk.kademe} boyut={48} sembol={rozetSembolu(ilk.ikon)} />
          <span className="qt-rb-parilti" />
        </span>
        <span className="qt-toast-metin">
          <b className="qt-toast-baslik">{tt("Yeni rozet: {ad}", { ad: ilk.ad ?? tt("Gizli rozet") })}</b>
          <span className="qt-toast-alt">
            {ilk.coin > 0 ? tt("+{n} coin", { n: sayiBicim(ilk.coin) }) : null}
            {ilk.cerceve ? `${ilk.coin > 0 ? " · " : ""}${tt("Yeni çerçeve kazandın")}` : null}
          </span>
        </span>
        <QtIkonDugme ikon="carpi" etiket={tt("Kapat")} tur="saydam" onClick={() => setKuyruk((k) => k.slice(1))} className="qt-toast-kapat" />
      </div>
    </QtToastYuvasi>
  );
}
