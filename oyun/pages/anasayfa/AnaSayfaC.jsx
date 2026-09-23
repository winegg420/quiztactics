// Ana sayfa seçeneği C — MERKEZ DÜZEN. Oyuncu ortada; modlar etrafında yörüngede
// simgeler. Mobilde kendi alt sekme çubuğu (Oyna · Görevler · Lig); masaüstünde üç
// panel yan yana (görevler | yörünge | lig + etkinlik), sekme çubuğu gizli.
import { useState } from "react";
import { createPortal } from "react-dom";
import { QtIkon } from "../../tasarim/index.js";
import { tt } from "../../lib/dil.js";
import { LIG_ADLARI } from "../../lib/lig.js";
import { useAnaSayfaVerisi, useOyunBaslat } from "./veri.jsx";
import {
  OyuncuAvatari, XpSatiri, LigCipi, SeriCipi, modListesi, etkinlikler, EtkinlikSatiri,
  TurnuvaKarti, GorevListesi, Susleme,
} from "./parcalar.jsx";
import "./anasayfa.css";

export default function AnaSayfaC() {
  const v = useAnaSayfaVerisi();
  const b = useOyunBaslat();
  const [sekme, setSekme] = useState("oyna");
  if (!v.profile) return <div className="as-yukleniyor" aria-busy="true" />;
  const olaylar = etkinlikler(v);
  // Yörünge: saat yönünde 6 uydu (Klasik ve Düello büyük, üstte ve altta).
  const uydular = [
    { anahtar: "klasik", ad: tt("Klasik"), ikon: "klasik", git: b.oyna, buyuk: true },
    ...modListesi(v, b).slice(0, 2),
    { anahtar: "duello", ad: tt("Düello"), ikon: "duello", git: () => b.git("/duello"), buyuk: true },
    ...modListesi(v, b).slice(2),
  ];
  const sekmeler = [
    { id: "oyna", ad: tt("Oyna"), ikon: "oyunKolu" },
    { id: "gorev", ad: tt("Görevler"), ikon: "hediye", rozet: v.bekleyenOdul || null },
    { id: "lig", ad: tt("Lig"), ikon: "lig", rozet: olaylar.length || null },
  ];
  const lig = v.lig?.lig ?? "bronz";

  return (
    <div className="as-sayfa as-c" data-sekme={sekme}>
      <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
      {b.katmanlar}

      <section className="as-c-panel as-c-panel--gorev" aria-label={tt("Günlük görevler")}>
        <h2 className="as-panel-baslik"><QtIkon ad="hediye" boyut={20} />{tt("Günlük görevler")}</h2>
        <GorevListesi v={v} sinir={5} />
        <TurnuvaKarti v={v} />
      </section>

      <section className="as-c-merkez" aria-label={tt("Oyna")}>
        <div className="as-c-ust"><LigCipi v={v} /><SeriCipi /></div>
        <div className="as-c-yorunge">
          <Susleme tur="yorunge" />
          <span className="as-c-yorunge-cember" aria-hidden="true" />
          <div className="as-c-cekirdek">
            <OyuncuAvatari v={v} boyut={138} />
            <p className="as-c-ad">{v.oyuncu.ad}</p>
            <p className="as-c-rutbe">{v.oyuncu.rutbe.ad}</p>
          </div>
          {uydular.map((u, i) => (
            <button key={u.anahtar} type="button" onClick={u.git} style={{ "--as-i": i }}
                    className={`as-c-uydu as-renk--${u.anahtar} ${u.buyuk ? "as-c-uydu--buyuk" : ""}`}>
              <span className="as-c-uydu-ikon"><QtIkon ad={u.ikon} boyut={u.buyuk ? 30 : 24} /></span>
              <span className="as-c-uydu-ad">{u.ad}</span>
              {u.rozet && <span className="as-rozet-nokta">{u.rozet}</span>}
            </button>
          ))}
        </div>
        <XpSatiri v={v} />
      </section>

      <section className="as-c-panel as-c-panel--lig" aria-label={tt("Lig")}>
        <a href="/siralama" className={`as-b-lig as-lig-kart--${lig}`} onClick={(e) => { e.preventDefault(); b.git("/siralama"); }}>
          <span className="as-b-lig-kalkan" aria-hidden="true"><QtIkon ad="kalkan" boyut={36} /></span>
          <span className="as-b-lig-metin">
            <small>{tt("Bu haftaki lig")}</small>
            <b>{LIG_ADLARI[lig] ?? lig}</b>
            <span>{v.lig?.sira ? tt("Grupta {n}. sıradasın", { n: v.lig.sira }) : tt("Maç oyna, sıralamaya gir")}</span>
          </span>
        </a>
        <h2 className="as-panel-baslik"><QtIkon ad="zil" boyut={20} />{tt("Seni bekleyenler")}</h2>
        {olaylar.length
          ? olaylar.slice(0, 4).map((e) => <EtkinlikSatiri key={e.id} e={e} />)
          : <p className="as-bos">{tt("Şimdilik bekleyen maç yok. Bir arkadaşına meydan oku!")}</p>}
        {v.mesaj && <p className="as-hata" role="alert">{v.mesaj}</p>}
      </section>

      {createPortal(
      <nav className="as-c-sekmeler" aria-label={tt("Ana sayfa bölümleri")}>
        {sekmeler.map((s) => (
          <button key={s.id} type="button" aria-pressed={sekme === s.id} onClick={() => setSekme(s.id)}
                  className={`as-c-sekme ${sekme === s.id ? "as-c-sekme--aktif" : ""}`}>
            <QtIkon ad={s.ikon} boyut={22} />
            <span>{s.ad}</span>
            {s.rozet ? <span className="as-rozet-nokta">{s.rozet}</span> : null}
          </button>
        ))}
      </nav>, document.body)}
    </div>
  );
}
