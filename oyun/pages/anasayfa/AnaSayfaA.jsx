// ANA SAYFA (kök rota, 23 Eyl 2026'dan beri; önceki ana sayfa pages/Home.jsx kullanılmıyor).
// Seçenek A — ZENGİN TEK EKRAN (lobi). Kaydırmasız: üstte lig/seri, avatar kartı, altında
// turnuva şeridi, büyük Oyna + Düello ve mod kısayolları.
// Masaüstü: solda modlar sütunu, ortada sahne, sağda seans listesi + görevler + etkinlik.
import { useEffect, useState } from "react";
import { QtIkon } from "../../tasarim/index.js";
import BildirimIzniSor from "../../components/BildirimIzniSor.jsx";
import { BILDIRIM_SONRA_ANAHTAR } from "../../components/MacSonuSahnesi.jsx";
import { tt } from "../../lib/dil.js";
import { useAnaSayfaVerisi, useOyunBaslat } from "./veri.jsx";
import {
  OyuncuAvatari, LigCipi, RutbeCipi, SeriCipi, modListesi, etkinlikler, EtkinlikSatiri,
  TurnuvaSeridi, TurnuvaSeansListesi, GorevListesi, Susleme,
} from "./parcalar.jsx";
import "./anasayfa.css";

export default function AnaSayfaA() {
  const v = useAnaSayfaVerisi();
  const b = useOyunBaslat();
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
  if (!v.profile) return <div className="as-yukleniyor" aria-busy="true" />;
  const modlar = modListesi(v, b);
  const olaylar = etkinlikler(v);
  const acil = olaylar.find((e) => e.ton === "acil") ?? olaylar[0];

  return (
    <div className="as-sayfa as-a">
      <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
      {b.katmanlar}

      <aside className="as-a-sol" aria-label={tt("Modlar")}>
        {modlar.map((m) => (
          <button key={m.anahtar} type="button" className={`as-a-mod as-renk--${m.anahtar}`} onClick={m.git}>
            <span className="as-a-mod-ikon"><QtIkon ad={m.ikon} boyut={26} /></span>
            <span className="as-a-mod-metin"><b>{m.ad}</b><small>{m.alt}</small></span>
            {m.rozet && <span className="as-rozet-nokta" aria-label={m.rozetEtiketi}>{m.rozet}</span>}
          </button>
        ))}
      </aside>

      <section className="as-a-sahne" aria-label={tt("Oyuncu")}>
        {bildirimSor && <BildirimIzniSor />}
        <div className="as-a-ust">
          <LigCipi v={v} />
          <SeriCipi />
        </div>

        <div className="as-a-podyum">
          <Susleme tur="lobi" />
          <span className="as-a-isik" aria-hidden="true" />
          <OyuncuAvatari v={v} boyut={120} />
          <div className="as-a-kimlik">
            <p className="as-a-ad">{v.oyuncu.ad}</p>
            <RutbeCipi v={v} />
          </div>
        </div>

        <TurnuvaSeridi v={v} git={b.git} />

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

      <aside className="as-a-sag" aria-label={tt("Etkinlikler")}>
        {/* Turnuva ortadaki şeritte; burada yalnız günün seans listesi (tekrar yok). */}
        <TurnuvaSeansListesi />
        <div className="as-panel">
          <h2 className="as-panel-baslik"><QtIkon ad="hediye" boyut={20} />{tt("Günlük görevler")}</h2>
          <GorevListesi v={v} sinir={3} />
        </div>
        {olaylar.length > 0 && (
          <div className="as-panel">
            <h2 className="as-panel-baslik"><QtIkon ad="zil" boyut={20} />{tt("Seni bekleyenler")}</h2>
            {olaylar.slice(0, 3).map((e) => <EtkinlikSatiri key={e.id} e={e} />)}
          </div>
        )}
      </aside>
    </div>
  );
}
