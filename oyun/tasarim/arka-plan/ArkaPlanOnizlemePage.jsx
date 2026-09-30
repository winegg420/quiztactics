// /arka-plan-onizleme — kart arka planı ÖNİZLEMESİ (yalnız sahip; menüde yok, yalnız adresle; SahipKapisi).
// Su Altı · Yağan Kar · Düşen Sonbahar Yaprakları — her biri için hareketli kart (~100 px), sabit kart, lig satırı (~42 px).
// Oyuna bağlanmadı; katalog/DB'ye dokunmaz. Seçimler yalnız bu tarayıcıda (localStorage), "Seçimlerimi kopyala" düz liste verir.
// Onaydan sonra (ayrı iş): oyuncu kartına bağlama, katalog/DB, avatar arkasındaki eski arka planın kaldırılması.
import { useEffect, useMemo, useState } from "react";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import { QtDugme } from "../index.js";
import { tt } from "../../lib/dil.js";
import KartArkaPlan, { ARKA_PLANLAR } from "./KartArkaPlan.jsx";
import "./arka-plan-onizleme.css";

const SAKLA = "qt_arka_plan_onizleme_secimler";
const SIRA = ["su", "kar", "yaprak"];
const PROFIL = { id: "abp-ornek", gorunen_ad: "idagg", gorunen_avatar: "/avatars/pro/kedi-k01.svg" };

function secimOku() {
  try { return JSON.parse(localStorage.getItem(SAKLA) || "{}") || {}; } catch { return {}; }
}
function secimYaz(v) {
  try { localStorage.setItem(SAKLA, JSON.stringify(v)); } catch { /* özel mod: yalnız bu oturum */ }
}

/** Örnek oyuncu kartı: avatar (çerçeveli), ad, Lv · rütbe, XP çubuğu. */
function KartIcerik() {
  return (
    <>
      <CerceveliAvatar profile={PROFIL} boyut={72} cerceve="lig_altin" aura={null} premiumCerceve={null} premiumAura={null} />
      <div className="abpo-metin">
        <b className="abpo-ad">idagg</b>
        <span className="abpo-lv">Lv 17 · Bilge</span>
        <span className="abpo-xp" role="progressbar" aria-valuenow={64} aria-valuemin={0} aria-valuemax={100} aria-label="XP"><i style={{ width: "64%" }} /></span>
      </div>
    </>
  );
}
/** Lig sıralaması satırı (yalnız kendi satırın, sabit). */
function SatirIcerik() {
  return (
    <>
      <b className="abpo-sira">8</b>
      <CerceveliAvatar profile={PROFIL} boyut={34} cerceve="lig_altin" aura={null} premiumCerceve={null} premiumAura={null} />
      <b className="abpo-ad abpo-ad--k">idagg</b>
      <span className="abpo-puan">186 <small>puan</small></span>
    </>
  );
}

export default function ArkaPlanOnizlemePage() {
  const [genislik, setGenislik] = useState(390);
  const [secimler, setSecimler] = useState(secimOku);
  const [kopyaNot, setKopyaNot] = useState("");
  const [kopyaMetni, setKopyaMetni] = useState("");

  useEffect(() => { document.title = "Quiz Tactics — " + tt("Arka plan önizleme"); }, []);

  const sec = (tur, deger) => {
    setSecimler((eski) => {
      const yeni = { ...eski };
      if (deger) yeni[tur] = deger; else delete yeni[tur];
      secimYaz(yeni);
      return yeni;
    });
  };
  const liste = useMemo(() => {
    const grup = (d) => SIRA.filter((t) => (secimler[t] ?? null) === d).map((t) => ARKA_PLANLAR[t].ad);
    return { girsin: grup("girsin"), girmesin: grup("girmesin"), bekliyor: grup(null) };
  }, [secimler]);

  const kopyala = async () => {
    const metin = [
      "KART ARKA PLANI SEÇİMİM (/arka-plan-onizleme)",
      `GİRSİN (${liste.girsin.length}): ${liste.girsin.join(", ") || "—"}`,
      `GİRMESİN (${liste.girmesin.length}): ${liste.girmesin.join(", ") || "—"}`,
      `BEKLİYOR (${liste.bekliyor.length}): ${liste.bekliyor.join(", ") || "—"}`,
    ].join("\n");
    setKopyaMetni(metin);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaNot(tt("Kopyalandı — bana yapıştırabilirsin."));
    } catch (e) {
      console.warn("arka-plan-onizleme pano:", e?.message ?? e);
      setKopyaNot(tt("Pano izin vermedi — aşağıdaki metni seçip kopyala."));
    }
  };

  return (
    <div className="qt-sayfa abpo-sayfa">
      <div className="qt-sayfa-ic abpo-ic">
        <h1 className="abpo-baslik">{tt("Kart arka planları — önizleme")}</h1>
        <p className="abpo-not">
          {tt("Arka plan avatarın arkasından kalkıp oyuncu kartının arkasına geçer. Hareketli ve sabit hâl aynı kompozisyon; hareketi azalt açıksa kart sabit kalır. Oyuna bağlı değil.")}
        </p>
        <div className="abpo-genislik" role="group" aria-label={tt("Kart genişliği")}>
          {[360, 390].map((g) => (
            <QtDugme key={g} boyut="k" tur={genislik === g ? "birincil" : "ikincil"} aria-pressed={genislik === g} onClick={() => setGenislik(g - 32)}>{g} px</QtDugme>
          ))}
        </div>

        {SIRA.map((tur) => {
          const d = secimler[tur] ?? null;
          return (
            <section key={tur} className="abpo-bolum" style={{ "--abpo-g": `${genislik}px` }}>
              <div className="abpo-bolum-ust">
                <h2>{tt(ARKA_PLANLAR[tur].ad)}</h2>
                <div className="abpo-secim">
                  <QtDugme boyut="k" tur={d === "girsin" ? "birincil" : "ikincil"} ikon={d === "girsin" ? "tik" : undefined}
                           aria-pressed={d === "girsin"} onClick={() => sec(tur, d === "girsin" ? null : "girsin")}>{tt("Girsin")}</QtDugme>
                  <QtDugme boyut="k" tur={d === "girmesin" ? "birincil" : "ikincil"}
                           aria-pressed={d === "girmesin"} onClick={() => sec(tur, d === "girmesin" ? null : "girmesin")}>{tt("Girmesin")}</QtDugme>
                </div>
              </div>
              <p className="abpo-etiket">{tt("Hareketli kart · ana sayfa / profil / maç başı")}</p>
              <div className="abpo-kart"><KartArkaPlan tur={tur} hareketli yukseklik={100}><KartIcerik /></KartArkaPlan></div>
              <p className="abpo-etiket">{tt("Sabit kart (aynı kompozisyon)")}</p>
              <div className="abpo-kart"><KartArkaPlan tur={tur} yukseklik={100}><KartIcerik /></KartArkaPlan></div>
              <p className="abpo-etiket">{tt("Lig sıralaması — yalnız kendi satırın (sabit)")}</p>
              <div className="abpo-kart"><KartArkaPlan tur={tur} yukseklik={42}><SatirIcerik /></KartArkaPlan></div>
            </section>
          );
        })}

        <section className="abpo-bolum abpo-ozet">
          <p><b>{tt("Girsin")} ({liste.girsin.length}):</b> {liste.girsin.join(", ") || "—"}</p>
          <p><b>{tt("Girmesin")} ({liste.girmesin.length}):</b> {liste.girmesin.join(", ") || "—"}</p>
          <p><b>{tt("Bekliyor")} ({liste.bekliyor.length}):</b> {liste.bekliyor.join(", ") || "—"}</p>
          <QtDugme tamGenislik ikon="kopyala" onClick={kopyala}>{tt("Seçimlerimi kopyala")}</QtDugme>
          {kopyaNot && <p className="abpo-not" role="status">{kopyaNot}</p>}
          {kopyaMetni && <textarea className="abpo-kopya" readOnly value={kopyaMetni} rows={5} onFocus={(e) => e.target.select()} aria-label={tt("Kopyalanacak metin")} />}
        </section>
      </div>
    </div>
  );
}
