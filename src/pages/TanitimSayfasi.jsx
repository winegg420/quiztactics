import { useEffect, useRef, useState } from "react";
import { QtMarka, QtCip, QtKart, QtDugme } from "../../oyun/tasarim/index.js";
import "../../oyun/tasarim/ekranlar/g-ortak.css";
import "../../oyun/tasarim/ekranlar/g-ekle.css";
import "../../oyun/tasarim/ekranlar/g-kurulum.css";
import "../../oyun/tasarim/ekranlar/g-tanitim.css";
import { KurulumKarti, DavetKoduKarti, useDavetKodu } from "./KurulumSayfasi.jsx";
import { kurulumDurumu, kurulumuBaslat } from "../lib/uygulamaKipi.js";
import { useDil } from "../../oyun/lib/dilKanca.js";
import { DILLER } from "../../oyun/lib/dil.js";

// ============================================================
// TANITIM SAYFASI — quiztactics.com tarayıcıda: oyunu tanıtır, kurulumu yaptırır.
//
// Kurulum mantığı KurulumSayfasi.jsx'teki bileşenlerin AYNISI (KurulumKarti, DavetKoduKarti,
// useDavetKodu); burada yalnız sunum var. Görseller canlı oyundan alınır:
// araclar/tanitim-ekran.mjs → araclar/tanitim-webp.mjs → public/tanitim/*.webp.
// iOS kuralı: fixed öğe yok; hareket yalnız transform/opacity, prefers-reduced-motion'da kapalı.
// ============================================================

const MODLAR = [
  { tur: "klasik", ad: "Klasik", gorsel: "klasik", vaat: "Aynı 20 soru, aynı anda. En çok bilen kazanır." },
  { tur: "duello", ad: "Düello", gorsel: "duello", vaat: "Tek bilen kontrolü alır. Kontrolü al, üst üste 3 doğru yap." },
  { tur: "kasa", ad: "Ortak Hazine", gorsel: "hazine", vaat: "Hazine büyür; tek bilen alır. Doğru anda aç." },
  { tur: "turnuva", ad: "Turnuva", gorsel: "turnuva", vaat: "Günde beş seans. Lobiye katıl, ilk üçe gir, ödülü kap." },
  { tur: "lig", ad: "Lig", gorsel: "lig", vaat: "Her hafta yeni bir yarış. Bronz'dan Efsane'ye tırman." },
];

const AVATARLAR = ["tilki-k04", "astronot-k17", "ninja-k18", "dinozor-k10", "kedi-k01", "korsan-k19",
  "robot-k15", "buyucu-k21", "panda-k05", "viking-k25", "ejderha-k11", "dedektif-k22"];

/** Telefon çerçevesinde gerçek oyun ekranı. */
function Telefon({ gorsel, alt, oncelikli = false, className = "" }) {
  return (
    <figure className={`tn-telefon ${className}`}>
      <img
        src={`/tanitim/${gorsel}.webp`}
        alt={alt}
        width="585"
        height="1266"
        loading={oncelikli ? "eager" : "lazy"}
        fetchPriority={oncelikli ? "high" : undefined}
        decoding="async"
        draggable="false"
      />
    </figure>
  );
}

/** Kaydırınca giriş: görünür olan [data-tn-gir] öğesine sınıf eklenir. Hareket azaltılmışsa hiç kurulmaz. */
function useGirisAnimasyonu(kok) {
  useEffect(() => {
    const el = kok.current;
    if (!el) return undefined;
    let azalt = false;
    try { azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* eski tarayıcı */ }
    if (azalt || typeof IntersectionObserver === "undefined") return undefined;
    el.classList.add("tn-hareket");
    const gozcu = new IntersectionObserver((kayitlar) => {
      for (const k of kayitlar) {
        if (!k.isIntersecting) continue;
        k.target.classList.add("tn-gorundu");
        gozcu.unobserve(k.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    el.querySelectorAll("[data-tn-gir]").forEach((o) => gozcu.observe(o));
    return () => gozcu.disconnect();
  }, [kok]);
}

export default function TanitimSayfasi() {
  const { dil, ceviri, dilDegistir } = useDil();
  const davetKodu = useDavetKodu();
  const kok = useRef(null);
  const [bekliyor, setBekliyor] = useState(false);
  useGirisAnimasyonu(kok);

  // "Hemen kur": tarayıcının kurulum penceresi hazırsa onu açar, değilse kurulum adımlarına iner.
  const hemenKur = async () => {
    if (kurulumDurumu().hazir) {
      setBekliyor(true);
      try { await kurulumuBaslat(); } finally { setBekliyor(false); }
      return;
    }
    const hedef = document.getElementById("tn-kur");
    if (!hedef) return;
    let azalt = false;
    try { azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* yok */ }
    hedef.scrollIntoView({ behavior: azalt ? "auto" : "smooth", block: "start" });
    hedef.querySelector("h2")?.focus({ preventScroll: true });
  };

  const modAdi = (m) => ceviri(m.ad);

  return (
    <div className="tn" ref={kok}>
      <header className="tn-ust">
        <QtMarka boyut="b" />
        <div className="tn-dil" role="group" aria-label={ceviri("Dil")}>
          {DILLER.map((d) => (
            <QtCip key={d} secili={dil === d} onClick={() => dilDegistir(d)}>
              {d.toUpperCase()}
            </QtCip>
          ))}
        </div>
      </header>

      <main>
        {/* 1 · Açılış */}
        <section className="tn-acilis" aria-labelledby="tn-baslik">
          <div className="tn-acilis-metin">
            <h1 id="tn-baslik" className="tn-baslik">
              {ceviri("Bilgini oyuna")} <span className="tn-baslik-vurgu">{ceviri("dönüştür.")}</span>
            </h1>
            <p className="tn-giris-metni">
              {ceviri("Canlı 1v1 bilgi yarışması. Aynı soru, aynı an, aynı süre: hız bonusu yok, bilen kazanır.")}
            </p>
            <div className="tn-eylem">
              <QtDugme tur="birincil" boyut="b" className="tn-kur-dugme" yukleniyor={bekliyor} onClick={hemenKur}>
                {ceviri("Hemen kur")}
              </QtDugme>
              <p className="tn-eylem-not">{ceviri("Ücretsiz · birkaç saniye · ana ekranında")}</p>
            </div>
            {davetKodu && (
              <p className="tn-davet-not">
                {ceviri("Davet kodun hazır:")} <b>{davetKodu}</b>
              </p>
            )}
          </div>

          <div className="tn-sahne" aria-hidden="true">
            <span className="tn-isin" />
            <Telefon gorsel="klasik" alt="" className="tn-sahne-sol" />
            <Telefon gorsel="hazine" alt="" className="tn-sahne-sag" />
            <Telefon gorsel="duello" alt="" className="tn-sahne-orta" oncelikli />
          </div>
        </section>

        {/* 2 · Modlar vitrini */}
        <section className="tn-bolum tn-modlar" aria-labelledby="tn-modlar-baslik">
          <div className="tn-bolum-bas" data-tn-gir>
            <h2 id="tn-modlar-baslik" className="tn-h2">{ceviri("Beş mod, tek hesap")}</h2>
            <p className="tn-bolum-metin">{ceviri("Hepsi aynı oyunda: bir maç at, düelloya gir, akşam turnuvasına yetiş.")}</p>
          </div>
          <ul className="tn-mod-ray">
            {MODLAR.map((m, i) => (
              <li key={m.tur} className={`tn-mod tn-mod--${m.tur}`} style={{ "--tn-sira": i }} data-tn-gir>
                <Telefon gorsel={m.gorsel} alt={ceviri("{mod} ekranı", { mod: modAdi(m) })} />
                <h3 className="tn-mod-ad">{modAdi(m)}</h3>
                <p className="tn-mod-vaat">{ceviri(m.vaat)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 3 · Öne çıkanlar */}
        <section className="tn-bolum tn-one" aria-labelledby="tn-one-baslik">
          <div className="tn-bolum-bas" data-tn-gir>
            <h2 id="tn-one-baslik" className="tn-h2">{ceviri("Oynadıkça senin olur")}</h2>
          </div>
          <div className="tn-izgara">
            <article className="tn-parca tn-parca--cerceve" data-tn-gir>
              <img src="/tanitim/podyum.webp" alt={ceviri("Lig çerçeveli avatarlarla haftanın ilk üçü")}
                width="640" height="418" loading="lazy" decoding="async" />
              <div className="tn-parca-metin">
                <h3>{ceviri("Lig çerçeveleri")}</h3>
                <p>{ceviri("Avatarının çerçevesi ligini gösterir. Yükseldikçe çerçeve de yükselir.")}</p>
              </div>
            </article>

            <article className="tn-parca tn-parca--avatar" data-tn-gir>
              <ul className="tn-avatarlar" aria-hidden="true">
                {AVATARLAR.map((a, i) => (
                  <li key={a} style={{ "--tn-sira": i }}>
                    <img src={`/avatars/pro/${a}.svg`} alt="" width="72" height="72" loading="lazy" decoding="async" draggable="false" />
                  </li>
                ))}
              </ul>
              <div className="tn-parca-metin">
                <h3>{ceviri("31 avatar")}</h3>
                <p>{ceviri("Tilkiden astronota, ninjadan dinozora. Level atladıkça yenileri açılır.")}</p>
              </div>
            </article>

            <article className="tn-parca tn-parca--davet" data-tn-gir>
              <img src="/tanitim/davet.webp" alt={ceviri("Arkadaş davet kartı")}
                width="600" height="311" loading="lazy" decoding="async" />
              <div className="tn-parca-metin">
                <h3>{ceviri("Arkadaşınla oyna")}</h3>
                <p>{ceviri("Davet bağlantını paylaş, meydan oku ya da grup maçı kur. Arkadaşın gelince ikiniz de coin kazanırsınız.")}</p>
              </div>
            </article>

            <article className="tn-parca tn-parca--sampiyon" data-tn-gir>
              <img src="/tanitim/sampiyon.webp" alt={ceviri("Şehir, ülke ve dünya sıralamaları")}
                width="640" height="279" loading="lazy" decoding="async" />
              <div className="tn-parca-metin">
                <h3>{ceviri("Şehrinin şampiyonu ol")}</h3>
                <p>{ceviri("Her hafta şehir, ülke ve dünya sıralaması. İlk üçe giren rozeti alır.")}</p>
              </div>
            </article>
          </div>
        </section>

        {/* 4 · Kurulum */}
        <section id="tn-kur" className="tn-bolum tn-kur" aria-labelledby="tn-kur-baslik">
          <div className="tn-kur-ic">
            <div className="tn-kur-bas" data-tn-gir>
              <h2 id="tn-kur-baslik" className="tn-h2" tabIndex={-1}>{ceviri("Hemen kur, ilk maçına gir")}</h2>
              <p className="tn-bolum-metin">
                {ceviri("Oyun yalnız ana ekrana eklenen uygulamada açılır. Kurulum ücretsiz, birkaç saniye sürer.")}
              </p>
            </div>
            <QtKart dolgu="b" className="tn-kur-kart" data-tn-gir>
              <KurulumKarti ceviri={ceviri} />
              {davetKodu && <DavetKoduKarti kod={davetKodu} ceviri={ceviri} />}
            </QtKart>
          </div>
        </section>
      </main>

      {/* 5 · Alt bilgi */}
      <footer className="tn-alt">
        <QtMarka />
        <nav className="tn-alt-baglantilar" aria-label={ceviri("Yasal metinler")}>
          <a href="/gizlilik">{ceviri("Gizlilik politikası")}</a>
          <a href="/kosullar">{ceviri("Kullanım koşulları")}</a>
          <a href="/hesap-sil">{ceviri("Hesap silme")}</a>
          <a href="mailto:info@quiztactics.com">info@quiztactics.com</a>
        </nav>
        <p className="tn-alt-not">© 2026 Quiz Tactics</p>
      </footer>
    </div>
  );
}
