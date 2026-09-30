// /arka-plan-onizleme — kart arka planı ÖNİZLEMESİ (yalnız sahip; menüde yok, yalnız adresle; SahipKapisi).
// Su Altı · Yağan Kar · Düşen Sonbahar Yaprakları · Yıldızlı Gece — her biri için hareketli kart (~100 px), özel sabit kart, özel lig satırı (~42 px).
// Üstte anahtar: "Yeni (yazının arkasında, tam görünür)" | "Eski (oyundaki şu anki)". Köz ve Kuzey Işıkları bu sayfada GÖSTERİLMEZ (Ida: girmesin; dosyalar durur).
// Oyuna bağlanmadı; katalog/DB'ye dokunmaz. Seçimler yalnız bu tarayıcıda (localStorage), "Seçimlerimi kopyala" düz liste verir.
// Onaydan sonra (ayrı iş): oyuncu kartına bağlama, katalog/DB, avatar arkasındaki eski arka planın kaldırılması.
import { useEffect, useMemo, useState } from "react";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import { QtDugme } from "../index.js";
import { tt } from "../../lib/dil.js";
import KartArkaPlan, { ARKA_PLANLAR } from "./KartArkaPlan.jsx";
// Köz ve Kuzey Işıkları: Ida "girmesin" dedi → önizlemede yok (dosyalar silinmedi):
// import KozArkaPlan, { AD as KOZ_AD } from "./KozArkaPlan.jsx";
// import KuzeyIsiklariArkaPlan, { AD as KUZEY_AD } from "./KuzeyIsiklariArkaPlan.jsx";
import YildizliGeceArkaPlan, { AD as GECE_AD } from "./YildizliGeceArkaPlan.jsx";
import "./arka-plan-onizleme.css";

const SAKLA = "qt_arka_plan_onizleme_secimler";
const SAKLA_TAM = "qt_arka_plan_onizleme_tam";   // { mod: "yeni" | "eski" }
const SIRA = ["su", "kar", "yaprak"];
// Yıldızlı Gece (oyuna girecek, onay bekliyor) — ARKA_PLANLAR'a yazılmaz; aynı localStorage seçimini paylaşır.
const YENI = [
  { tur: "gece", ad: GECE_AD, Bilesen: YildizliGeceArkaPlan },
];
// Önizlemedeki dört arka plan (sıra: oyundaki üçü, sonra Yıldızlı Gece). Bilesen = aynı props'u alan çizim bileşeni.
const TUMU = [
  ...SIRA.map((t) => ({ tur: t, ad: ARKA_PLANLAR[t].ad, Bilesen: KartArkaPlan })),
  ...YENI,
];
const PROFIL = { id: "abp-ornek", gorunen_ad: "idagg", gorunen_avatar: "/avatars/pro/kedi-k01.svg" };

function secimOku() {
  try { return JSON.parse(localStorage.getItem(SAKLA) || "{}") || {}; } catch { return {}; }
}
function tamOku() {
  try { const v = JSON.parse(localStorage.getItem(SAKLA_TAM) || "{}") || {}; return { mod: v.mod === "eski" ? "eski" : "yeni" }; } catch { return { mod: "yeni" }; }
}
function tamYaz(v) {
  try { localStorage.setItem(SAKLA_TAM, JSON.stringify(v)); } catch { /* özel mod: yalnız bu oturum */ }
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
  const [tam, setTam] = useState(tamOku);   // mod: yeni = yazının arkasında, tam görünür · eski = oyundaki şu anki
  const tamGorunur = tam.mod === "yeni";
  const tamAyarla = (kismi) => setTam((e) => { const y = { ...e, ...kismi }; tamYaz(y); return y; });

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
    const hepsi = TUMU.map((x) => [x.tur, x.ad]);
    const grup = (d) => hepsi.filter(([t]) => (secimler[t] ?? null) === d).map(([, ad]) => ad);
    return { girsin: grup("girsin"), girmesin: grup("girmesin"), begenmedim: grup("begenmedim"), bekliyor: grup(null) };
  }, [secimler]);

  const kopyala = async () => {
    const metin = [
      "KART ARKA PLANI SEÇİMİM (/arka-plan-onizleme)",
      `GÖRÜNÜM: ${tamGorunur ? "YENİ (yazının arkasında, tam görünür)" : "ESKİ (oyundaki şu anki)"}`,
      `GİRSİN (${liste.girsin.length}): ${liste.girsin.join(", ") || "—"}`,
      `GİRMESİN (${liste.girmesin.length}): ${liste.girmesin.join(", ") || "—"}`,
      `BEĞENMEDİM (${liste.begenmedim.length}): ${liste.begenmedim.join(", ") || "—"}`,
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
        <div className="abpo-mod" role="group" aria-label={tt("Görünüm modu")}>
          <QtDugme boyut="k" tur={tamGorunur ? "birincil" : "ikincil"} aria-pressed={tamGorunur} onClick={() => tamAyarla({ mod: "yeni" })}>{tt("Yeni (yazının arkasında, tam görünür)")}</QtDugme>
          <QtDugme boyut="k" tur={!tamGorunur ? "birincil" : "ikincil"} aria-pressed={!tamGorunur} onClick={() => tamAyarla({ mod: "eski" })}>{tt("Eski (oyundaki şu anki)")}</QtDugme>
        </div>
        <div className="abpo-genislik" role="group" aria-label={tt("Kart genişliği")}>
          {[360, 390].map((g) => (
            <QtDugme key={g} boyut="k" tur={genislik === g ? "birincil" : "ikincil"} aria-pressed={genislik === g} onClick={() => setGenislik(g - 32)}>{g} px</QtDugme>
          ))}
        </div>

        {TUMU.map(({ tur, ad, Bilesen }) => {
          const d = secimler[tur] ?? null;
          const dugme = (deger, etiket, ikon) => (
            <QtDugme boyut="k" tur={d === deger ? "birincil" : "ikincil"} ikon={d === deger ? ikon : undefined}
                     aria-pressed={d === deger} onClick={() => sec(tur, d === deger ? null : deger)}>{tt(etiket)}</QtDugme>
          );
          return (
            <section key={tur} className="abpo-bolum" style={{ "--abpo-g": `${genislik}px` }} data-bolum={tur}>
              <div className="abpo-bolum-ust">
                <h2>{tt(ad)}</h2>
                <div className="abpo-secim">{dugme("girsin", "Girsin", "tik")}{dugme("girmesin", "Girmesin")}{dugme("begenmedim", "Beğenmedim")}</div>
              </div>
              <p className="abpo-etiket">{tt("Hareketli kart · ana sayfa / profil / maç başı")}</p>
              <div className="abpo-kart"><Bilesen tur={tur} tamGorunur={tamGorunur} hareketli yukseklik={100}><KartIcerik /></Bilesen></div>
              <p className="abpo-etiket">{tt(tamGorunur ? "Özel sabit kart (hareketi azalt · sabit kart)" : "Sabit kart (hareketli hâlin ilk karesi)")}</p>
              <div className="abpo-kart"><Bilesen tur={tur} tamGorunur={tamGorunur} yukseklik={100}><KartIcerik /></Bilesen></div>
              <p className="abpo-etiket">{tt(tamGorunur ? "Özel lig satırı — yalnız kendi satırın (sabit)" : "Lig sıralaması — yalnız kendi satırın (sabit)")}</p>
              <div className="abpo-kart"><Bilesen tur={tur} tamGorunur={tamGorunur} yukseklik={42}><SatirIcerik /></Bilesen></div>
            </section>
          );
        })}

        <section className="abpo-bolum abpo-ozet">
          <p><b>{tt("Girsin")} ({liste.girsin.length}):</b> {liste.girsin.join(", ") || "—"}</p>
          <p><b>{tt("Girmesin")} ({liste.girmesin.length}):</b> {liste.girmesin.join(", ") || "—"}</p>
          <p><b>{tt("Beğenmedim")} ({liste.begenmedim.length}):</b> {liste.begenmedim.join(", ") || "—"}</p>
          <p><b>{tt("Bekliyor")} ({liste.bekliyor.length}):</b> {liste.bekliyor.join(", ") || "—"}</p>
          <QtDugme tamGenislik ikon="kopyala" onClick={() => kopyala()}>{tt("Seçimlerimi kopyala")}</QtDugme>
          {kopyaNot && <p className="abpo-not" role="status">{kopyaNot}</p>}
          {kopyaMetni && <textarea className="abpo-kopya" readOnly value={kopyaMetni} rows={5} onFocus={(e) => e.target.select()} aria-label={tt("Kopyalanacak metin")} />}
        </section>
      </div>
    </div>
  );
}
