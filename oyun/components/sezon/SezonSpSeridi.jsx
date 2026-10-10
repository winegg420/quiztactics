/**
 * MAÇ SONU SP ŞERİDİ + SEVİYE ATLAMA (Sezon Yolu) — "+20 SP", Sezon seviye çubuğu kazanılan SP kadar dolar,
 * altında "Sv 13'e 59 kaldı". Seviye atlanırsa çubuk sona dolar, "Seviye 13!" + kısa konfeti + o seviyenin ücretsiz ödülü,
 * çubuk yeni seviyede sıfırdan dolmaya devam eder (toplam < 2 sn). Bütün değerler SUNUCUDAN (sezon_mac_sp_ozetim);
 * istemcide SP/seviye hesabı yok, yalnız çubuk oranı için sunucunun verdiği eşikler bölünür.
 * SP trigger'la maç bitince yazıldığından en çok 3 denemeyle okunur (döngü yok). SP 0 / sezon kapalı → hiçbir şey çizilmez.
 * Animasyon yalnız transform/opacity; hareketi azalt ve dokunma (atla) → anında son hâl. Aynı maç için bir kez oynar.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../src/lib/supabase.js";
import { tt } from "../../lib/dil.js";
import { useDil } from "../../lib/dilKanca.js";
import { odulAdi } from "../../lib/sezonYolu.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { QtIkon } from "../../tasarim/index.js";
import { OdulGorsel } from "../../tasarim/sezon-yolu/OdulGorsel.jsx";
import { OdulKimlik } from "../../tasarim/sezon-yolu/CerceveOdulGorsel.jsx";
import { kisaKonfeti, titret, hareketAzaltildi } from "../../tasarim/sahne/OdulPatlamasi.jsx";
import "./sezon-sp.css";

const DENEME_GECIKME = [700, 1500];   // ilk okuma hemen; sonra +0,7 sn ve +1,5 sn (toplam en çok 3 çağrı)
const oynadi = new Set();             // aynı maç için animasyon bir kez (sayfaya dönünce yeniden oynamaz)
const onbellek = new Map();           // maç → sunucu cevabı

async function oku(macRef) {
  try {
    const { data, error } = await supabase.rpc("sezon_mac_sp_ozetim", { p_ref: String(macRef) });
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    console.warn("[Bildim] maç sonu SP özeti okunamadı:", e?.message ?? e);
    return null;
  }
}

const oran = (v, alt, ust) => (ust == null ? 1 : ust > alt ? Math.min(1, Math.max(0, (v - alt) / (ust - alt))) : 1);

export default function SezonSpSeridi({ macRef, atla = false }) {
  const { dil } = useDil();
  const { profile } = useAuth();
  const [veri, setVeri] = useState(() => onbellek.get(String(macRef)) ?? null);
  const [dolgu, setDolgu] = useState(0);      // 0..1
  const [gecis, setGecis] = useState(false);  // çubuk geçişi açık mı
  const [atladi, setAtladi] = useState(false);
  const [son, setSon] = useState(false);
  const zamanlar = useRef([]);

  // Sunucudan okuma: en çok 3 deneme
  useEffect(() => {
    if (!macRef) return undefined;
    const kimlik = String(macRef);
    if (onbellek.has(kimlik)) return undefined;
    let iptal = false;
    const zm = [];
    const dene = async (i) => {
      const d = await oku(kimlik);
      if (iptal) return;
      if (d && d.kazanilan > 0) { onbellek.set(kimlik, d); setVeri(d); return; }
      if (d && d.gorunur === false) return;   // sezon kapalı: tekrar deneme
      if (i < DENEME_GECIKME.length) zm.push(setTimeout(() => dene(i + 1), DENEME_GECIKME[i]));
    };
    dene(0);
    return () => { iptal = true; zm.forEach(clearTimeout); };
  }, [macRef]);

  const sonaOturt = (d) => {
    zamanlar.current.forEach(clearTimeout);
    zamanlar.current = [];
    setGecis(false);
    setDolgu(oran(d.sp_sonra, d.sonra_alt, d.sonra_ust));
    setAtladi(Boolean(d.atlandi));
    setSon(true);
  };

  // Animasyon: veri gelince bir kez
  useEffect(() => {
    if (!veri || veri.kazanilan <= 0) return undefined;
    const kimlik = String(macRef);
    if (oynadi.has(kimlik) || atla || hareketAzaltildi()) { oynadi.add(kimlik); sonaOturt(veri); return undefined; }
    oynadi.add(kimlik);
    const z = (f, ms) => zamanlar.current.push(setTimeout(f, ms));
    setGecis(false);
    setDolgu(oran(veri.sp_once, veri.once_alt, veri.once_ust));
    z(() => {
      setGecis(true);
      setDolgu(veri.atlandi ? 1 : oran(veri.sp_sonra, veri.sonra_alt, veri.sonra_ust));
    }, 60);
    if (veri.atlandi) {
      z(() => { setAtladi(true); titret(40); kisaKonfeti({ x: 0.5, y: 0.55 }, 36); }, 520);
      z(() => { setGecis(false); setDolgu(0); }, 800);
      z(() => { setGecis(true); setDolgu(oran(veri.sp_sonra, veri.sonra_alt, veri.sonra_ust)); }, 860);
      z(() => setSon(true), 1500);
    } else {
      z(() => setSon(true), 800);
    }
    return () => { zamanlar.current.forEach(clearTimeout); zamanlar.current = []; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veri]);

  // Dokununca (Kutlama atla) hemen son hâl
  useEffect(() => { if (atla && veri && veri.kazanilan > 0) sonaOturt(veri); }, [atla]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!veri || !(veri.kazanilan > 0)) return null;
  const sv = veri.seviye_sonra;
  const odul = Array.isArray(veri.oduller) ? veri.oduller : [];
  const kalanYazi = veri.kalan == null ? tt("Sezon yolu tamam") : tt("Sv {n}'e {k} kaldı", { n: sv + 1, k: veri.kalan });
  return (
    <section className={`ssp${atladi ? " ssp--atladi" : ""}`} aria-label={tt("Sezon Yolu ilerlemesi")} data-sezon-sp="">
      <div className="ssp-ust">
        <b className="ssp-kazanc qt-sayi">{tt("+{n} SP", { n: veri.kazanilan })}</b>
        <span className="ssp-seviye">{atladi ? tt("Seviye {n}!", { n: sv }) : tt("Sezon Sv {n}", { n: sv })}</span>
      </div>
      <div className="ssp-ray" role="progressbar" aria-label={tt("Sezon seviye ilerlemesi")}
           aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(dolgu * 100)}>
        <span className={`ssp-dolgu${gecis ? " ssp-dolgu--gecis" : ""}`} style={{ transform: `scaleX(${dolgu})` }} />
      </div>
      <span className="ssp-kalan" aria-live="polite">{son || !veri.atlandi ? kalanYazi : " "}</span>
      {atladi && odul.length > 0 && (
        <OdulKimlik.Provider value={{ profile }}>
          <div className="ssp-oduller" role="status">
            {odul.slice(0, 2).map((o) => (
              <span key={`${o.seviye}:${o.kol}`} className="ssp-odul">
                <OdulGorsel odul={o} boyut={32} />
                <span className="ssp-odul-yazi">
                  <small>{tt("Sv {n} ödülü", { n: o.seviye })}</small>
                  <b>{odulAdi(o, dil)}</b>
                </span>
              </span>
            ))}
            <span className="ssp-odul-not"><QtIkon ad="hediye" boyut={14} />{tt("Sezon Yolu'nda al")}</span>
          </div>
        </OdulKimlik.Provider>
      )}
    </section>
  );
}
