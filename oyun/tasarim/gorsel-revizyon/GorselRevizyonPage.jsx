// /gorsel-revizyon — görsel revizyon ADAYLARI (tasarim/BRIEF_GORSEL_REVIZYON.md › Bölüm B).
// Giriş yapmış kullanıcıya açık, menüde yok, tembel parça. Oyundaki görsellere, dükkâna ve veritabanına
// DOKUNMAZ; migration yok. Seçimler yalnız bu tarayıcıda (localStorage); "Seçimlerimi kopyala" düz metin verir.
import { useEffect, useMemo, useState } from "react";
import { QtDugme, QtKart } from "../index.js";
import { GrSecimSaglayici, kopyaMetni, useGrSecim } from "./secim.jsx";
import { BOLUMLER as A } from "./a/index.jsx";
import { BOLUMLER as B } from "./b/index.jsx";
import "./palet.css";
import "./gorsel-revizyon.css";

function Icerik() {
  const { durum, adaylar } = useGrSecim();
  const bolumler = useMemo(() => [...A, ...B].sort((x, y) => x.no - y.no), []);
  const [kopyaNot, setKopyaNot] = useState("");
  const [metin, setMetin] = useState("");
  useEffect(() => { document.title = "Quiz Tactics — Görsel revizyon"; }, []);

  const kopyala = async () => {
    const s = kopyaMetni(durum, adaylar, bolumler);
    setMetin(s);
    try {
      await navigator.clipboard.writeText(s);
      setKopyaNot("Kopyalandı — bana yapıştırabilirsin.");
    } catch (e) {
      console.warn("[Bildim] pano yazılamadı:", e?.message ?? e);
      setKopyaNot("Pano izin vermedi — aşağıdaki metni seçip kopyala.");
    }
  };

  return (
    <div className="qt-sayfa gr-sayfa">
      <main className="qt-sayfa-ic gr-ic">
        <header className="gr-giris">
          <h1 className="qt-baslik-1">Görsel revizyon</h1>
          <p className="qt-govde">Her bölümde adaylar büyük boyda ve oyundaki gerçek yerinde. Beğendiğini "Seç", ya da "Girsin / Girmesin" ile işaretle; en altta "Seçimlerimi kopyala". Oyunda hiçbir şey değişmedi.</p>
          <nav className="gr-icindekiler" aria-label="Bölümler">
            {bolumler.map((b) => <a key={b.no} href={`#gr-b${b.no}`}>{b.no}. {b.baslik}</a>)}
          </nav>
        </header>

        {bolumler.map(({ no, Bilesen }) => <Bilesen key={no} />)}

        <section className="gr-bolum" aria-labelledby="gr-kopya-b">
          <h2 id="gr-kopya-b" className="qt-baslik-2">Seçimlerim</h2>
          <QtKart className="gr-kopya">
            <QtDugme tamGenislik ikon="kopyala" onClick={kopyala}>Seçimlerimi kopyala</QtDugme>
            <p className="gr-kopya-not" role="status" aria-live="polite">{kopyaNot}</p>
            {metin && <textarea className="gr-kopya-metin" readOnly rows={12} value={metin} onFocus={(e) => e.target.select()} aria-label="Kopyalanacak metin" />}
          </QtKart>
        </section>
      </main>
    </div>
  );
}

export default function GorselRevizyonPage() {
  return <GrSecimSaglayici><Icerik /></GrSecimSaglayici>;
}
