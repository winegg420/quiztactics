// /lig-sahne-onizleme — profil kartı lig sahnesi ESKİ / YENİ karşılaştırması (8 Eki 2026, Ida onayı için).
// Menüde yok; giriş yapmış herkese açık (veri yok, sunucuya istek atmaz); tembel parça. Kartlar OYUNDAKİ gerçek
// OyuncuVitrinKarti + gerçek lig çerçevesi + gerçek avatarla çizilir; "Yeni" = `sahneImza` (LigSahnesiImza.jsx).
import { useEffect, useState } from "react";
import OyuncuVitrinKarti from "../../components/OyuncuVitrinKarti.jsx";
import { LIG_ADLARI } from "../../lib/lig.js";
import { QtSekmeler } from "../index.js";
import { tt } from "../../lib/dil.js";
import "./lig-sahne-onizleme.css";

const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];
const AV = {
  bronz: "/avatars/pro/tilki-k04.svg", gumus: "/avatars/pro2/samuray-y15.svg", altin: "/avatars/pro2/kedili-kiz-y37.svg",
  elmas: "/avatars/pro2/kristal-uzayli-y28.svg", efsane: "/avatars/pro2/savas-robotu-y30.svg",
};
const VITRIN = [
  { anahtar: "duello_250", grup: "duello", kademe: "altin", ikon: "sword" },
  { anahtar: "ustalik_tarih_750", grup: "ustalik", kademe: "elmas", ikon: "kategori:tarih" },
  { anahtar: "seri_30", grup: "seri", kademe: "gumus", ikon: "fire" },
];
const kartYap = (lig, i, bp) => ({
  id: `lso-${lig}`, ad: ["Deniz", "KaraKartal34", "Ada", "Mavi", "Efe"][i], avatar: AV[lig], level: [8, 21, 37, 52, 70][i], lig,
  cerceve: `lig_${lig}`, cerceve_nadirlik: null, vitrin: VITRIN, aura: null, isim_efekti: null,
  premium_cerceve: null, premium_aura: null, unvan: i % 2 ? { tur: "sehir", sehir: "Afyonkarahisar", ulke: "TR" } : null,
  sezon_bp: bp,
});

export default function LigSahneOnizlemePage() {
  const [surum, setSurum] = useState("yeni");
  const [bp, setBp] = useState(false);
  useEffect(() => {
    try { document.title = `Quiz Tactics — ${tt("Lig sahnesi önizleme")}`; } catch { /* başlık kritik değil */ }
  }, []);
  return (
    <div className="qt-sayfa lso-sayfa">
      <main className="qt-sayfa-ic lso-ic">
        <header className="lso-giris">
          <h1 className="qt-baslik-2">{tt("Lig sahnesi önizleme")}</h1>
          <p className="qt-kucuk qt-soluk">{tt("Profil kartında avatarın arkasındaki sahne. Eski ile yeniyi karşılaştır.")}</p>
        </header>
        <div className="lso-arac">
          <QtSekmeler etiket={tt("Sahne sürümü")} aktif={surum} onSec={setSurum}
            sekmeler={[{ kod: "eski", ad: tt("Eski") }, { kod: "yeni", ad: tt("Yeni") }]} />
          <label className="lso-bp">
            <input type="checkbox" checked={bp} onChange={(e) => setBp(e.target.checked)} />
            <span>{tt("Battle Pass çerçevesi")}</span>
          </label>
        </div>
        <div className="lso-izgara">
          {LIGLER.map((lig, i) => (
            <section key={lig} className="lso-hucre" aria-label={tt("{lig} Lig", { lig: tt(LIG_ADLARI[lig] ?? lig) })}>
              <OyuncuVitrinKarti key={`${lig}-${surum}-${bp}`} kart={kartYap(lig, i, bp)} boyut={88} ligSahnesi
                sahneImza={surum === "yeni"} koleksiyonCipi={false} />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
