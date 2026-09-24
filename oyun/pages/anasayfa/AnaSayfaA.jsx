// ANA SAYFA (kök rota, 23 Eyl 2026'dan beri; önceki ana sayfa pages/Home.jsx kullanılmıyor).
// Seçenek A — TEK EKRAN (lobi), kaydırmasız. Rozet + çerçeve paketiyle yeniden düzenlendi:
// kompakt oyuncu kartı, canlı lig kartı, turnuva şeridi, OYNA + DÜELLO, kısayollar, görev şeridi.
// Masaüstü: solda oyuncu + lig, ortada oyna alanı, sağda turnuva + seanslar + görevler + etkinlik.
import { useEffect, useState } from "react";
import { QtIkon, QtModal } from "../../tasarim/index.js";
import BildirimIzniSor from "../../components/BildirimIzniSor.jsx";
import { BILDIRIM_SONRA_ANAHTAR } from "../../components/MacSonuSahnesi.jsx";
import { tt } from "../../lib/dil.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import DurumKutusu, { useZamanAsimi } from "../../components/DurumKutusu.jsx";
import { useAnaSayfaVerisi, useOyunBaslat } from "./veri.jsx";
import {
  KompaktOyuncu, LigKarti, GorevSeridi, modListesi, etkinlikler, EtkinlikSatiri,
  TurnuvaSeridi, TurnuvaSeansListesi, GorevListesi,
} from "./parcalar.jsx";
import "./anasayfa.css";

export default function AnaSayfaA() {
  const v = useAnaSayfaVerisi();
  const b = useOyunBaslat();
  const [gorevAcik, setGorevAcik] = useState(false);
  // Bildirim izni maç sonucundan ana sayfaya dönünce sorulur (MacSonuSahnesi işaret bırakır).
  const [bildirimSor] = useState(() => {
    try { return sessionStorage.getItem(BILDIRIM_SONRA_ANAHTAR) === "1"; } catch { return false; }
  });
  // Telefonda ana sayfa kaydırılmaz: kabuk görünür yüksekliğe oturur (anasayfa.css › .as-kaydirmasiz).
  useEffect(() => {
    const kok = document.documentElement;
    kok.classList.add("as-kaydirmasiz");
    return () => kok.classList.remove("as-kaydirmasiz");
  }, []);
  // D-205: profil sunucudan gelmezse (hata ya da 12 sn) diğer sayfalar gibi "Yüklenemedi · Tekrar dene";
  // bağlantı gelince kendiliğinden yeniden dener. (Eski pages/Home.jsx ile aynı kalıp.)
  const { user, profilHata, refreshProfile } = useAuth();
  const profilGecikti = useZamanAsimi(!v.profile);
  const profilYok = !v.profile;
  useEffect(() => {
    if (!profilYok) return undefined;
    const tekrar = () => refreshProfile?.(user?.id);
    window.addEventListener("online", tekrar);
    return () => window.removeEventListener("online", tekrar);
  }, [profilYok, refreshProfile, user?.id]);
  if (!v.profile) {
    if (!profilHata && !profilGecikti) return <div className="as-yukleniyor" aria-busy="true" />;
    return (
      <div className="as-sayfa as-hata-kap">
        <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
        <div className="qt-kart qt-kart--yuzey qt-kart--dolgu-o">
          <DurumKutusu durum="hata" satir={4} onTekrar={() => refreshProfile?.(user?.id)} />
        </div>
      </div>
    );
  }
  const modlar = modListesi(v, b);
  const olaylar = etkinlikler(v);
  const acil = olaylar.find((e) => e.ton === "acil") ?? olaylar[0];

  // Rozet + çerçeve paketi (23 Eyl 2026): mor ışınlı dev avatar sahnesi kalktı. Telefonda tek sütun
  // (sıra CSS `order` ile): oyuncu kartı → lig kartı → turnuva → OYNA/DÜELLO → kısayollar → görev şeridi.
  // Masaüstünde (≥1024) üç sütun: solda oyuncu + lig, ortada oyna alanı, sağda turnuva + görevler.
  return (
    <div className="as-sayfa as-a as-a2">
      <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
      {b.katmanlar}

      <section className="as-a2-kol as-a2-kol--sol" aria-label={tt("Oyuncu")}>
        {bildirimSor && <div className="as-a2-bildirim"><BildirimIzniSor /></div>}
        <div className="as-a2-kart"><KompaktOyuncu v={v} /></div>
        <div className="as-a2-lig"><LigKarti v={v} /></div>
      </section>

      <section className="as-a2-kol as-a2-kol--sag" aria-label={tt("Etkinlikler")}>
        <div className="as-a2-turnuva"><TurnuvaSeridi v={v} git={b.git} /></div>
        <div className="as-a2-masaustu"><TurnuvaSeansListesi /></div>
        <div className="as-a2-gorev"><GorevSeridi v={v} onAc={() => setGorevAcik(true)} /></div>
        <div className="as-panel as-a2-masaustu">
          <h2 className="as-panel-baslik"><QtIkon ad="hediye" boyut={20} />{tt("Günlük görevler")}</h2>
          <GorevListesi v={v} sinir={3} />
        </div>
        {olaylar.length > 0 && (
          <div className="as-panel as-a2-masaustu">
            <h2 className="as-panel-baslik"><QtIkon ad="zil" boyut={20} />{tt("Seni bekleyenler")}</h2>
            {olaylar.slice(0, 3).map((e) => <EtkinlikSatiri key={e.id} e={e} />)}
          </div>
        )}
      </section>

      <section className="as-a2-kol as-a2-kol--orta" aria-label={tt("Oyna")}>
        {acil && (
          <a href={acil.yol} className="as-a-acil" onClick={(e) => { e.preventDefault(); b.git(acil.yol); }}>
            <span className="as-canli-nokta" aria-hidden="true" />
            <span>{acil.baslik}</span>
            <QtIkon ad="ileri" boyut={18} />
          </a>
        )}

        <div className="as-a-eylem">
          <button type="button" className="as-buyuk-dugme as-buyuk-dugme--oyna"
                  aria-haspopup="dialog" onClick={b.oyna}>
            <span className="as-buyuk-dugme-ikon"><QtIkon ad="oyna" boyut={30} /></span>
            <span className="as-buyuk-dugme-metin"><b>{tt("OYNA")}</b><small>{tt("Klasik · 20 soru")}</small></span>
          </button>
          <button type="button" className="as-buyuk-dugme as-buyuk-dugme--duello" onClick={() => b.git("/duello")}>
            <span className="as-buyuk-dugme-ikon"><QtIkon ad="duello" boyut={28} /></span>
            <span className="as-buyuk-dugme-metin"><b>{tt("DÜELLO")}</b><small>{tt("3 can")}</small></span>
          </button>
        </div>

        <nav className="as-a-kisayol" aria-label={tt("Diğer modlar")}>
          {modlar.map((m) => (
            <button key={m.anahtar} type="button" className={`as-kisayol as-renk--${m.anahtar}`} onClick={m.git}>
              <span className="as-kisayol-ikon"><QtIkon ad={m.ikon} boyut={24} /></span>
              <span className="as-kisayol-ad">{m.ad}</span>
              {m.rozet && <span className="as-rozet-nokta" aria-label={m.rozetEtiketi}>{m.rozet}</span>}
            </button>
          ))}
        </nav>
        {v.mesaj && <p className="as-hata" role="alert">{v.mesaj}</p>}
      </section>

      {/* Görev şeridine dokununca: görev listesi (ödül alma burada) */}
      <QtModal acik={gorevAcik} onKapat={() => setGorevAcik(false)} tur="altSayfa" baslik={tt("Günlük görevler")}>
        <GorevListesi v={v} sinir={10} />
      </QtModal>
    </div>
  );
}
