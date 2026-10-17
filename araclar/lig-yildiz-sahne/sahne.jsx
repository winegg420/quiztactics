// Lig yıldızı (lig amblemi) kesilme ölçüm sahnesi — YALNIZ yerel, gerçek bileşenler + sahte veri; sunucuya istek atmaz.
// Adres: /araclar/lig-yildiz-sahne/index.html?dil=tr|en&lig=bronz|gumus|altin|elmas|efsane&yer=kasa|duello|klasik|coklu
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { dilKaydet, sozlukYukle } from "../../oyun/lib/dil.js";

const q = new URLSearchParams(location.search);
const dil = q.get("dil") === "en" ? "en" : "tr";
const lig = q.get("lig") || "altin";
const yer = q.get("yer") || "kasa";
dilKaydet(dil);
document.documentElement.lang = dil;
try { localStorage.setItem("bildim_ses", "0"); } catch { /* yoksay */ }

async function ac() {
  if (dil === "en") await sozlukYukle("en");
  await import("../../src/styles.css");
  await import("../../oyun/styles/tema.css");
  await import("../../oyun/styles/koyu.css");
  await import("../../oyun/styles/yeni.css");
  await import("../../oyun/styles/mobile-game.css");
  await import("../../oyun/tasarim/tasarim.css");
  await import("../../oyun/tasarim/ekranlar/m1-mac.css");
  await import("../../oyun/pages/DuelloPage.a.css");
  await import("../../oyun/styles/kasa.css");
  await import("../../oyun/styles/duello-tahta.css");
  const { KasaUst } = await import("../../oyun/components/KasaParcalari.jsx");
  const { V2Ust } = await import("../../oyun/components/DuelloV2.jsx");
  const { SeviyeEtiketi } = await import("../../oyun/components/MacUstSerit.jsx");
  const MacUstSerit = (await import("../../oyun/components/MacUstSerit.jsx")).default;
  const { QtMacUst } = await import("../../oyun/tasarim/index.js");

  const BEN = "00000000-0000-4000-8000-000000000001", RAK = "00000000-0000-4000-8000-000000000002";
  const ben = { id: BEN, gorunen_ad: "Ida", gorunen_avatar: null };
  const rakip = { id: RAK, gorunen_ad: q.get("ad") || "Deniz Yıldırımoğlu", gorunen_avatar: "/avatars/pro2/basortulu-y04.svg" };
  const seviyeler = {
    [BEN]: { level: Number(q.get("benlv")) || 24, lig, ulke: "TR" },
    [RAK]: { level: Number(q.get("lv")) || 112, lig, ulke: q.get("ulke") || "DE" },
  };
  const c = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => p?.[k] ?? "");
  const sayac = <span className="qt-sayac" style={{ font: "900 22px/1 system-ui" }}>12</span>;
  const dK = { tur: 7, max_tur: 24, altin: q.get("altin") === "1", faz: "cevap" };
  const dD = { tur: 7, max_tur: 16, uzatma: false, faz: "cevap", saldiran: BEN };

  let govde;
  if (yer === "kasa") govde = <KasaUst d={dK} ben={ben} rakip={rakip} c={c} seviyeler={seviyeler} sayac={sayac} />;
  else if (yer === "duello") govde = <V2Ust d={dD} ben={ben} rakip={rakip} c={c} seviyeler={seviyeler} sayac={sayac} oran={0.6} />;
  else if (yer === "klasik") govde = (
    <QtMacUst skor={(q.get("skor") || "120:95").split(":").map(Number)}
      sen={{ ad: "Ida", alt: <SeviyeEtiketi {...seviyeler[BEN]} /> }}
      rakip={{ ad: q.get("ad") || "Deniz Yıldırımoğlu", alt: <SeviyeEtiketi {...seviyeler[RAK]} /> }} />
  );
  else if (yer === "vs") {
    const { VsKarti } = await import("../../oyun/components/AramaSahnesi.jsx");
    const kk = (id, ad, lv, ul) => ({ id, gorunen_ad: ad, gorunen_avatar: null, level: lv, lig, ulke: ul });
    govde = <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <VsKarti profil={kk(BEN, "Ida", 24, "TR")} kart={{ level: 24, lig, ulke: "TR" }} taraf="ben" />
      <VsKarti profil={kk(RAK, "Deniz Yıldırımoğlu", 112, "DE")} kart={{ level: 112, lig, ulke: "DE" }} taraf="rakip" />
    </div>;
  } else if (yer === "vitrin") {
    const OyuncuVitrinKarti = (await import("../../oyun/components/OyuncuVitrinKarti.jsx")).default;
    govde = <OyuncuVitrinKarti userId={RAK} profile={rakip} kart={{ lig, level: 112, ulke: "DE" }} />;
  } else if (yer === "liste") {
    await import("../../oyun/pages/lig-a.css");
    const OyuncuLigAmblemi = (await import("../../oyun/components/OyuncuLigAmblemi.jsx")).default;
    govde = <div className="lg-liste">{["Ida", "Deniz Yıldırımoğlu"].map((ad, i) => (
      <div className="lg-satir-kap" key={ad}><div className="lg-satir"><button type="button" className="lg-satir-ac">
        <span className="lg-sira qt-sayi">{i + 4}</span>
        <span className="lg-bilgi"><span className="lg-ad"><span className="lg-ad-metin">{ad}</span><OyuncuLigAmblemi lig={lig} boyut={20} /></span>
          <span className="lg-detay lg-detay--tek">Lv {i ? 112 : 24}</span></span>
        <span className="lg-puan"><b className="qt-sayi">{i ? 12345 : 987}</b></span>
      </button></div></div>))}</div>;
  } else if (yer === "sonu") {
    await import("../../oyun/tasarim/ekranlar/mac-sonu-kutlama.css");
    const OyuncuLigAmblemi = (await import("../../oyun/components/OyuncuLigAmblemi.jsx")).default;
    const st = document.createElement("style"); st.textContent = ".msk-a, .msk-avatar, .msk-isim { animation: none !important; opacity: 1 !important; }"; document.head.appendChild(st);
    const taraf = (ad, yan, rol) => (
      <div className={`msk-taraf msk-taraf--${yan} msk-taraf--${rol}`}>
        <div className="msk-avatar msk-a"><span style={{ width: 76, height: 76, borderRadius: "50%", background: "#fff", display: "block" }} />
          <OyuncuLigAmblemi lig={lig} boyut={22} className="msk-amblem-rozet" /></div>
        <div className={`msk-isim msk-a${ad.length <= 8 ? " msk-isim--kisa" : ""}`}><button type="button" className="msk-isim-dugme"><span className="msk-isim-metin">{ad}</span></button>
          <OyuncuLigAmblemi lig={lig} boyut={20} className="msk-amblem" /></div>
      </div>);
    govde = <div><div className="msk-karsilasma">{taraf("Ida", "sol", "kazanan")}{taraf("Deniz Yıldırımoğlu", "sag", "kaybeden")}</div></div>;
  } else govde = <MacUstSerit oyuncu={{ id: BEN, ad: "Ida", level: 24, lig, ulke: "TR" }} sayi="12/40" rozet="Turnuva" />;

  createRoot(document.getElementById("kok")).render(
    <BrowserRouter>
      {/* Gerçek kabuk (Layout.jsx + KasaPage kökü): kenar boşlukları maç ekranıyla aynı olsun */}
      <div className="app qt-sayfa a-kabuk"><main className="shell a-icerik qt-altmenu-payi">
        <div className="m2-mac ks-mac qt-sahne-mac qt-sahne-gok" id="sahne" style={{ minHeight: 0 }}>{govde}</div>
      </main></div>
    </BrowserRouter>
  );
  document.documentElement.dataset.hazir = "1";
}
ac().catch((e) => { document.body.textContent = "SAHNE HATASI: " + (e?.message ?? e); console.error(e); });
