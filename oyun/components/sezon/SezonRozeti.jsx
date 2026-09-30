/**
 * SEZON YOLU ROZETİ + SEVİYE ATLAMA BİLDİRİMİ (720) — üst çubukta coin hapının yanı (Layout › sag).
 * - Rozet: ~36 px yuvarlak, içinde seviye numarası, çevresinde sonraki seviyeye ince ilerleme halkası; dokunma alanı 44 px.
 *   Dokununca `/sezon-yolu`. Yalnız `ozet.gorunur` iken çizilir (sunucu: sistem kapalıyken yalnız sahibe true).
 *   Bekleyen ödül (`alinabilir > 0`) → küçük sessiz nokta. Battle Pass sahibinde halka altın.
 * - Bildirim: seviye atlayınca sessiz QtToast ("Sezon Yolu · Seviye N!" + varsa "Ödülün hazır"); dokununca sayfaya gider.
 *   Son görülen seviye localStorage'da (kullanıcı + sezon başına; try/catch). İlk açılışta (kayıt yok) bildirim YOK.
 *   Maç sırasında / maç sonu sahnesi açıkken bekler, sahne kapanınca gösterir. Uygulama odağa gelince özet tazelenir (30 sn'de bir).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { QtToast, QtToastYuvasi, QtDugme } from "../../tasarim/index.js";
import { seviyeOrani, sezonTazele, useSezonOzeti } from "../../lib/sezonYolu.js";
import { tt } from "../../lib/dil.js";
import { y } from "../../lib/yol.js";
import "./sezon.css";

const R = 16;
const CEVRE = 2 * Math.PI * R;
const TOAST_MS = 6000;
const ODAK_ARALIK_MS = 30000;

const depoAnahtari = (kullanici, sezon) => `bildim_sezon_seviye:${kullanici ?? "-"}:${sezon ?? "-"}`;
function depoOku(anahtar) {
  try {
    const v = localStorage.getItem(anahtar);
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}
function depoYaz(anahtar, seviye) {
  try { localStorage.setItem(anahtar, String(seviye)); } catch { /* özel mod */ }
}
const sahneAcikMi = () => document.body.classList.contains("bd-oyun-modu") || document.documentElement.classList.contains("msk-acik");

export default function SezonRozeti() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ozet } = useSezonOzeti();
  const [bekleyen, setBekleyen] = useState(null);   // { seviye, odul, anahtar } — gösterilmeyi bekleyen
  const [toast, setToast] = useState(null);
  const sonTazeleRef = useRef(0);

  // Uygulama odağa gelince özet tazelenir (başka cihazda/sekmede kazanılan SP, maç sonu).
  useEffect(() => {
    if (!user) return undefined;
    const tazele = () => {
      if (document.visibilityState === "hidden") return;
      const simdi = Date.now();
      if (simdi - sonTazeleRef.current < ODAK_ARALIK_MS) return;
      sonTazeleRef.current = simdi;
      sezonTazele();
    };
    document.addEventListener("visibilitychange", tazele);
    window.addEventListener("focus", tazele);
    return () => { document.removeEventListener("visibilitychange", tazele); window.removeEventListener("focus", tazele); };
  }, [user?.id]);

  // Yeni seviye > son görülen → bekleyen bildirim. Kayıt yoksa yalnız kaydeder (ilk açılışta bildirim yok).
  useEffect(() => {
    if (!user || !ozet?.gorunur) return;
    const yeni = Number(ozet.seviye);
    if (!Number.isFinite(yeni)) return;
    const anahtar = depoAnahtari(user.id, ozet.sezon);
    const eski = depoOku(anahtar);
    if (eski === null || yeni < eski) { depoYaz(anahtar, yeni); return; }
    if (yeni > eski) setBekleyen({ seviye: yeni, odul: Number(ozet.alinabilir) > 0, anahtar });
  }, [user?.id, ozet?.gorunur, ozet?.sezon, ozet?.seviye, ozet?.alinabilir]);

  // Maç/maç sonu sahnesi açıkken bekle; sahne kapanınca göster ve seviyeyi kaydet.
  useEffect(() => {
    if (!bekleyen) return undefined;
    const dene = () => {
      if (sahneAcikMi() || document.visibilityState === "hidden") return false;
      depoYaz(bekleyen.anahtar, bekleyen.seviye);
      setToast(bekleyen);
      setBekleyen(null);
      return true;
    };
    if (dene()) return undefined;
    const t = window.setInterval(() => { if (dene()) window.clearInterval(t); }, 600);
    return () => window.clearInterval(t);
  }, [bekleyen]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const git = useCallback(() => { setToast(null); navigate(y("/sezon-yolu")); }, [navigate]);

  if (!ozet?.gorunur) return null;
  const seviye = Number(ozet.seviye) || 1;
  const oran = seviyeOrani(ozet);
  const odulVar = Number(ozet.alinabilir) > 0;
  const etiket = odulVar
    ? tt("Sezon Yolu, seviye {n} — ödül hazır", { n: seviye })
    : tt("Sezon Yolu, seviye {n}", { n: seviye });

  return (
    <>
      <Link to={y("/sezon-yolu")} className={`sz-rozet${ozet.bp ? " sz-rozet--bp" : ""}`} aria-label={etiket}>
        <span className="sz-rozet-gorsel" aria-hidden="true">
          <svg className="sz-rozet-halka" viewBox="0 0 36 36" width="36" height="36" focusable="false">
            <circle className="sz-rozet-iz" cx="18" cy="18" r={R} fill="none" strokeWidth="3" />
            <circle className="sz-rozet-doluluk" cx="18" cy="18" r={R} fill="none" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(CEVRE * oran).toFixed(2)} ${CEVRE.toFixed(2)}`} />
          </svg>
          <span className="sz-rozet-sayi">{seviye}</span>
        </span>
        {odulVar && <span className="sz-rozet-nokta" aria-hidden="true" />}
      </Link>
      {toast && (
        <QtToastYuvasi konum="ust">
          <div className="sz-seviye-sarmal" onClick={git}>
            <QtToast
              key={toast.seviye}
              className="sz-seviye-toast"
              ton="coin"
              ikon="kupa"
              baslik={tt("Sezon Yolu · Seviye {n}!", { n: toast.seviye })}
              metin={toast.odul ? tt("Ödülün hazır") : undefined}
              eylem={<QtDugme tur="ikincil" boyut="k" onClick={(e) => { e.stopPropagation(); git(); }}>{tt("Göster")}</QtDugme>}
              onKapat={() => setToast(null)}
            />
          </div>
        </QtToastYuvasi>
      )}
    </>
  );
}
