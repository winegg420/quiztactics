/**
 * BATTLE PASS TANITIM PENCERESİ — yalnız BP'si OLMAYAN oyuncuya, ana sayfa açılışında günde en çok 1 kez.
 * "Günde bir" kaydı SUNUCUDA hesaba bağlı (bp_tanitim_gosterilsin_mi: atomik; sezon kapalı / BP sahibi / bugün gösterildi → false).
 * Sayılar (ücretli ödül sayısı, elmas fiyatı, SP çarpanı) sunucudan gelir. Oturum başına bir kez sorulur.
 * Çakışma: açık bir pencere (role=dialog / aria-modal), süren maç ya da başka açılış katmanı varken RPC HİÇ çağrılmaz
 * (çağrı günü tüketir); bir kez daha denenir, yine doluysa o gün çıkmaz.
 * "Battle Pass al" → /sezon-yolu (state.bpSatinAl) ve oradaki mevcut satın alma sayfası kendiliğinden açılır.
 * iOS: kaplama fixed + transform'suz; kart (ayrı öğe) animasyonlu. Animasyon yalnız transform/opacity; hareketi azalt → durağan.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../src/lib/supabase.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { tt, aktifDil } from "../../lib/dil.js";
import { y } from "../../lib/yol.js";
import { QtDugme } from "../../tasarim/index.js";
import { sezonOzeti } from "../../lib/sezonYolu.js";
import CerceveOdulGorsel, { OdulKimlik } from "../../tasarim/sezon-yolu/CerceveOdulGorsel.jsx";
import "./bp-tanitim.css";

const ILK_GECIKME_MS = 3200;   // ana sayfa otursun; iOS "ana ekrana ekle" (2,5 sn) ve benzeri açılış katmanları önce çıksın
const TEKRAR_MS = 4000;
const denendi = new Set();     // bu oturumda sorulan kullanıcılar (RPC en çok bir kez)
const EJDERHA = { tur: "cerceve", veri: { anahtar: "pc_ejderha2" } };

const acikPencereVar = () => {
  try { return Boolean(document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')); } catch { return false; }
};

export default function BpTanitimPenceresi({ engel = false }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [veri, setVeri] = useState(null);
  const engelRef = useRef(engel);
  engelRef.current = engel;
  const kullanici = user?.id ?? null;

  useEffect(() => {
    if (!kullanici || denendi.has(kullanici)) return undefined;
    let iptal = false;
    let zm = 0;
    const dene = async (sonDeneme) => {
      if (iptal) return;
      const mesgul = engelRef.current || acikPencereVar() || document.visibilityState === "hidden";
      if (mesgul) {
        if (!sonDeneme) zm = setTimeout(() => dene(true), TEKRAR_MS);
        else denendi.add(kullanici);   // yine doluysa bugün çıkmaz
        return;
      }
      denendi.add(kullanici);
      try {
        const ozet = await sezonOzeti();
        if (iptal || !ozet?.gorunur || ozet.bp === true) return;   // sezon yok / BP var: sunucu günü tüketmesin
        const { data, error } = await supabase.rpc("bp_tanitim_gosterilsin_mi");
        if (error) throw error;
        if (iptal || !data?.goster || acikPencereVar()) return;
        setVeri(data);
      } catch (e) {
        console.warn("[Bildim] BP tanıtımı okunamadı:", e?.message ?? e);
      }
    };
    zm = setTimeout(() => dene(false), ILK_GECIKME_MS);
    return () => { iptal = true; clearTimeout(zm); };
  }, [kullanici]);

  useEffect(() => {
    if (!veri) return undefined;
    const tus = (e) => { if (e.key === "Escape") setVeri(null); };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [veri]);

  if (!veri) return null;
  const kisaEkran = typeof window !== "undefined" && window.innerHeight < 700;
  const kapat = () => setVeri(null);
  const al = () => { setVeri(null); navigate(y("/sezon-yolu"), { state: { bpSatinAl: true } }); };
  const carpan = Number(veri.sp_carpan).toLocaleString(aktifDil() === "en" ? "en-US" : "tr-TR");
  return createPortal(
    <div className="bpt-kap" onClick={kapat}>
      <div className="bpt-kart" role="dialog" aria-modal="true" aria-labelledby="bpt-baslik" onClick={(e) => e.stopPropagation()}>
        <div className="bpt-hero" aria-hidden="false">
          <span className="bpt-nabiz">
            <OdulKimlik.Provider value={{ profile }}>
              <CerceveOdulGorsel odul={EJDERHA} boyut={kisaEkran ? 100 : 132} hareketli />
            </OdulKimlik.Provider>
          </span>
        </div>
        <h2 id="bpt-baslik" className="bpt-baslik">{tt("Ejderha çerçevesi seni bekliyor")}</h2>
        <p className="bpt-fayda">
          <span>{tt("{n} ücretli ödül", { n: veri.ucretli_odul_sayisi })}</span>
          <i aria-hidden="true">·</i>
          <span>{tt("altın isim")}</span>
          <i aria-hidden="true">·</i>
          <span>{tt("daha hızlı SP ×{c}", { c: carpan })}</span>
        </p>
        <QtDugme tamGenislik onClick={al}>
          {tt("Battle Pass al · {f} elmas", { f: veri.fiyat })}
        </QtDugme>
        <button type="button" className="bpt-sonra" onClick={kapat}>{tt("Sonra")}</button>
      </div>
    </div>,
    document.body
  );
}
