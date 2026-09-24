// /tasarim-onizleme — tasarım ADAYLARI (yalnız sahip; menüde yok, yalnız adresle, tembel parça).
// İki bölüm: altın isim adayları (altin/) ve rakip arama ekranı adayları (arama/). Oyunda hiçbir şeyi
// değiştirmez; seçimler yalnız bu tarayıcıda (localStorage) ve "Seçimlerimi kopyala" düz liste verir — migration yok.
// Sahip kontrolü diğer önizlemelerle aynı: sunucu sahip_mi() (migration 380).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseHazir } from "../../../src/lib/supabase.js";
import { QtBosDurum, QtDugme, QtIskelet, QtKart } from "../index.js";
import { tt } from "../../lib/dil.js";
import AltinIsimAdaylari, { ADAYLAR as ALTIN } from "./altin/AltinIsimAdaylari.jsx";
import AramaAdaylari, { ADAYLAR as ARAMA } from "./arama/AramaAdaylari.jsx";
import "./tasarim-onizleme.css";

// Yerel geliştirme (npm run dev, .env yok): sahip kontrolü atlanır ki sayfa ölçülebilsin.
const YEREL = import.meta.env.DEV && !supabaseHazir;
const SAKLA = "qt_tasarim_onizleme_secimler";

function oku(anahtar, yedek) {
  try { return JSON.parse(localStorage.getItem(anahtar) || "null") || yedek; } catch { return yedek; }
}
function yaz(anahtar, v) {
  try { localStorage.setItem(anahtar, JSON.stringify(v)); } catch { /* özel mod: yalnız bu oturum */ }
}

export default function TasarimOnizlemePage() {
  const [durum, setDurum] = useState(YEREL ? "hazir" : "yukleniyor");
  const [secimler, setSecimler] = useState(() => oku(SAKLA, {}));
  const [kopyaNot, setKopyaNot] = useState("");
  const [kopyaMetni, setKopyaMetni] = useState("");

  useEffect(() => { document.title = "Quiz Tactics — " + tt("Tasarım önizleme"); }, []);

  const yukle = useCallback(async () => {
    if (YEREL) { setDurum("hazir"); return; }
    setDurum("yukleniyor");
    try {
      const { data, error } = await supabase.rpc("sahip_mi");
      if (error) throw error;
      setDurum(data ? "hazir" : "sahip-degil");
    } catch (e) {
      console.error("tasarim-onizleme sahip kontrolü:", e?.message ?? e);
      setDurum("hata");
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const sec = useCallback((kod, deger) => {
    setSecimler((eski) => {
      const yeni = { ...eski };
      if (deger) yeni[kod] = deger; else delete yeni[kod];
      yaz(SAKLA, yeni);
      return yeni;
    });
  }, []);

  const bolumler = useMemo(() => [["Altın isim", ALTIN], ["Rakip arama ekranı", ARAMA]].map(([ad, liste]) => {
    const grup = (d) => liste.filter((a) => (secimler[a.kod] ?? null) === d).map((a) => `${a.baslik} (${a.kod})`);
    return { ad, girsin: grup("girsin"), girmesin: grup("girmesin"), bekliyor: grup(null) };
  }), [secimler]);

  const kopyala = async () => {
    const tarih = new Date().toLocaleString("tr-TR");
    const metin = [`Quiz Tactics — Tasarım seçimlerim (${tarih})`];
    for (const b of bolumler) {
      metin.push("", `${b.ad.toLocaleUpperCase("tr-TR")}`,
        `GİRSİN (${b.girsin.length}): ${b.girsin.join(", ") || "—"}`,
        `GİRMESİN (${b.girmesin.length}): ${b.girmesin.join(", ") || "—"}`,
        `KARAR VERİLMEDİ (${b.bekliyor.length}): ${b.bekliyor.join(", ") || "—"}`);
    }
    const s = metin.join("\n");
    setKopyaMetni(s);
    try {
      await navigator.clipboard.writeText(s);
      setKopyaNot(tt("Kopyalandı — bana yapıştırabilirsin."));
    } catch (e) {
      console.warn("[Bildim] pano yazılamadı:", e?.message ?? e);
      setKopyaNot(tt("Pano izin vermedi — aşağıdaki metni seçip kopyala."));
    }
  };

  if (durum === "yukleniyor") {
    return <div className="qt-sayfa to-sayfa"><div className="qt-sayfa-ic to-ic" aria-busy="true"><QtIskelet tur="metin" adet={2} /><QtIskelet tur="kart" adet={2} /></div></div>;
  }
  if (durum !== "hazir") {
    const sahipDegil = durum === "sahip-degil";
    return (
      <div className="qt-sayfa to-sayfa"><div className="qt-sayfa-ic to-ic"><QtKart>
        <QtBosDurum ikon={sahipDegil ? "kilit" : "uyari"} ton={sahipDegil ? "mor" : "yanlis"}
                    baslik={sahipDegil ? tt("Bu sayfa yalnız sahibe açık") : tt("Sayfa yüklenemedi")}
                    eylem={sahipDegil ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{tt("Ana sayfaya dön")}</QtDugme>
                      : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{tt("Tekrar dene")}</QtDugme>} />
      </QtKart></div></div>
    );
  }

  return (
    <div className="qt-sayfa to-sayfa">
      <main className="qt-sayfa-ic to-ic">
        <header className="to-giris">
          <h1 className="qt-baslik-1">{tt("Tasarım önizleme")}</h1>
          <p className="qt-govde">{tt("Altın isim ve rakip arama ekranı adayları. Oyunda hiçbir şey değişmedi; seçimlerin yalnız bu tarayıcıda durur.")}</p>
          <nav className="to-atla">
            <a href="#to-altin">{tt("Altın isim")}</a> · <a href="#to-arama">{tt("Rakip arama ekranı")}</a> · <a href="#to-secimler">{tt("Seçimlerim")}</a>
          </nav>
        </header>

        <section id="to-altin" className="to-bolum"><AltinIsimAdaylari secimler={secimler} onSec={sec} /></section>
        <section id="to-arama" className="to-bolum"><AramaAdaylari secimler={secimler} onSec={sec} /></section>

        <section id="to-secimler" className="to-bolum" aria-labelledby="to-secimler-b">
          <h2 id="to-secimler-b" className="qt-baslik-2">{tt("Seçimlerim")}</h2>
          <QtKart className="to-ozet-kart">
            {bolumler.map((b) => (
              <div key={b.ad} className="to-ozet-grup">
                <h3 className="qt-baslik-3">{tt(b.ad)}</h3>
                <p><b>{tt("Girsin")} ({b.girsin.length}):</b> {b.girsin.join(", ") || "—"}</p>
                <p><b>{tt("Girmesin")} ({b.girmesin.length}):</b> {b.girmesin.join(", ") || "—"}</p>
                <p className="qt-soluk"><b>{tt("Karar verilmedi")} ({b.bekliyor.length}):</b> {b.bekliyor.join(", ") || "—"}</p>
              </div>
            ))}
            <QtDugme tamGenislik ikon="kopyala" onClick={kopyala}>{tt("Seçimlerimi kopyala")}</QtDugme>
            <p className="to-kopya-not" role="status" aria-live="polite">{kopyaNot}</p>
            {kopyaMetni && <textarea className="to-kopya-metin" readOnly value={kopyaMetni} rows={9} onFocus={(e) => e.target.select()} aria-label={tt("Kopyalanacak metin")} />}
          </QtKart>
        </section>
      </main>
    </div>
  );
}
