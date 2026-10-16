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
import { TANITIM_EN } from "./tanitim-metinler.js";
import "./tanitim-revize.css";

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
  { tur: "duello", ad: "Düello", gorsel: "duello", vaat: "Kontrolü alıp rakibinin kategorisini seç. Rakibin yanılırken doğru cevap ver; serini 3’e taşı ve kazan." },
  { tur: "kasa", ad: "Ortak Hazine", gorsel: "hazine", vaat: "Tek bilen hazinenin sahibi olur. AÇ ile puanına yaz ya da DEVAM ile büyütüp yeniden ortaya bırak." },
  { tur: "turnuva", ad: "Turnuva", gorsel: "turnuva", vaat: "Günde beş seans. Lobiye katıl, ilk üçe gir, ödülü kap." },
  { tur: "lig", ad: "Lig", gorsel: "lig", vaat: "Her hafta yeni bir yarış. Bronz'dan Efsane'ye tırman." },
];

const AVATARLAR = ["tilki-k04", "astronot-k17", "ninja-k18", "dinozor-k10", "kedi-k01", "korsan-k19",
  "robot-k15", "buyucu-k21", "panda-k05", "viking-k25", "ejderha-k11", "dedektif-k22"];

/** Görsel dosyası: İngilizce arayüzde aynı ekranın İngilizce çekimi (-en). */
const tanitimGorseli = (ad, dil) => `/tanitim/${ad}${dil === "en" ? "-en" : ""}.webp`;

/** Telefon çerçevesinde gerçek oyun ekranı. */
function Telefon({ gorsel, dil, alt, oncelikli = false, className = "" }) {
  return (
    <figure className={`tn-telefon ${className}`}>
      <img
        src={tanitimGorseli(gorsel, dil)}
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

/** Oyun ekranı değil: kategori seçimi / hazine kararını simgeleyen çizimler. */
function TaktikSekli({ tur }) {
  return <svg className="tn-taktik-sekil" viewBox="0 0 120 72" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
    {tur === "duello" ? <>
      <rect x="6" y="14" width="32" height="44" rx="7" transform="rotate(-10 22 36)" />
      <rect x="80" y="14" width="32" height="44" rx="7" transform="rotate(10 96 36)" />
      <path d="M44 28h26l-7-7m7 7-7 7M76 47H50l7-7m-7 7 7 7" />
    </> : <>
      <path d="M22 34h76v28H22zM22 34V23a14 14 0 0 1 14-14h48a14 14 0 0 1 14 14v11M38 10v24m44-24v24" />
      <rect x="53" y="28" width="14" height="18" rx="3" /><path d="M60 34v6M104 13h12m-6-6v12M5 47h10m-5-5v10" />
    </>}
  </svg>;
}

export default function TanitimSayfasi() {
  const { dil, ceviri: ortakCeviri, dilDegistir } = useDil();
  const ceviri = (metin, degerler) => dil === "en" && TANITIM_EN[metin] ? TANITIM_EN[metin] : ortakCeviri(metin, degerler);
  const davetKodu = useDavetKodu();
  const kok = useRef(null);
  const [bekliyor, setBekliyor] = useState(false);
  useGirisAnimasyonu(kok);

  // "Hemen kur": tarayıcının kurulum penceresi hazırsa onu açar, değilse kurulum adımlarına iner.
  const hemenKur = async () => {
    if (kurulumDurumu().hazir) {
      setBekliyor(true);
      try {
        if (await kurulumuBaslat() !== "yok") return;
      } catch { /* Kurulum açılamazsa platform adımlarını göster. */ }
      finally { setBekliyor(false); }
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
              {ceviri("Bilgini")} <span className="tn-baslik-vurgu">{ceviri("taktiğe dönüştür.")}</span>
            </h1>
            <p className="tn-giris-metni">
              {ceviri("Rakibinin kategorisini seç, hazineyi ne zaman açacağına karar ver. Düello ve Ortak Hazine’de bilgine bir hamle ekle.")}
            </p>
            <div className="tn-eylem">
              <QtDugme tur="birincil" boyut="b" className="tn-kur-dugme" yukleniyor={bekliyor} onClick={hemenKur}>
                {ceviri("Hemen kur")}
              </QtDugme>
              <p className="tn-eylem-not">{ceviri("Ücretsiz · birkaç saniye · ana ekranında")}</p>
            </div>
            <a className="tn-qr-gecis" href="#tn-kur" aria-label={ceviri("QR kodu ve kurulum adımları")}>
              <img src="/quiztactics-qr.svg" width="80" height="80" alt={ceviri("quiztactics.com için QR kodu")} />
              <span>{ceviri("Telefonunda aç")}<small>{ceviri("Kamerayla okut veya kurulum adımlarına geç.")}</small></span>
            </a>
            {davetKodu && (
              <p className="tn-davet-not">
                {ceviri("Davet kodun hazır:")} <b>{davetKodu}</b>
              </p>
            )}
          </div>

          <div className="tn-sahne" aria-hidden="true">
            <span className="tn-isin" />
            <Telefon gorsel="klasik" dil={dil} alt="" className="tn-sahne-sol" />
            <Telefon gorsel="hazine" dil={dil} alt="" className="tn-sahne-sag" />
            <Telefon gorsel="duello" dil={dil} alt="" className="tn-sahne-orta" oncelikli />
          </div>
        </section>

        {/* Taktik modları: gerçek ekranlar ve kararları anlatan basit şekiller. */}
        <section className="tn-bolum tn-taktik" aria-labelledby="tn-modlar-baslik">
          <div className="tn-bolum-bas" data-tn-gir>
            <p className="tn-etiket">{ceviri("Bilgi + doğru hamle")}</p>
            <h2 id="tn-modlar-baslik" className="tn-h2">{ceviri("Taktik modları")}</h2>
            <p className="tn-bolum-metin">{ceviri("İki farklı mücadele. Seçimlerin maçın yönünü değiştirir.")}</p>
          </div>
          <div className="tn-taktik-izgara">
            {MODLAR.filter(m => ["duello", "kasa"].includes(m.tur)).map(m => (
              <article key={m.tur} className={"tn-taktik-kart tn-taktik-kart--" + m.tur} data-tn-gir>
                <div className="tn-taktik-metin">
                  <TaktikSekli tur={m.tur} />
                  <h3>{modAdi(m)}</h3>
                  <p>{ceviri(m.vaat)}</p>
                  <a className="tn-metin-baglanti" href="#tn-akis">{ceviri("Maçın akışını gör")} <span aria-hidden="true">↗</span></a>
                </div>
                <Telefon gorsel={m.gorsel} dil={dil} alt={ceviri("{mod} ekranı", { mod: modAdi(m) })} />
              </article>
            ))}
          </div>
        </section>

        <section id="tn-akis" className="tn-bolum tn-akis" aria-labelledby="tn-akis-baslik">
          <div className="tn-bolum-bas" data-tn-gir>
            <h2 id="tn-akis-baslik" className="tn-h2">{ceviri("Bir maç nasıl geçer?")}</h2>
            <p className="tn-bolum-metin">{ceviri("Soruyu bil. Fırsatı gör. Hamleni yap.")}</p>
          </div>
          <ol className="tn-adimlar">
            {[
              ["Modunu seç", "Uygulamada Düello veya Ortak Hazine’ye gir."],
              ["Soruyu cevapla", "Rakibinle karşılaş, bilgini göster."],
              ["Hamleni yap", "Düello’da kategori seç; Hazine’de AÇ ya da DEVAM de."],
              ["Sonucu gör", "Maç sonunda puanlarını ve kazandığın ödülleri gör."],
            ].map(([ad, metin], i) => (
              <li key={ad} data-tn-gir><span className="tn-adim-no" aria-hidden="true">0{i + 1}</span><h3>{ceviri(ad)}</h3><p>{ceviri(metin)}</p></li>
            ))}
          </ol>
        </section>

        <section className="tn-bolum tn-diger" aria-labelledby="tn-diger-baslik">
          <h2 id="tn-diger-baslik" className="tn-h2">{ceviri("Rekabetin başka yolları da var")}</h2>
          <ul className="tn-diger-serit">
            {MODLAR.filter(m => !["duello", "kasa"].includes(m.tur)).map(m => (
              <li key={m.tur}><h3>{modAdi(m)}</h3><p>{ceviri(m.vaat)}</p></li>
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
              <img src={tanitimGorseli("podyum", dil)} alt={ceviri("Lig çerçeveli avatarlarla haftanın ilk üçü")}
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
                <h3>{ceviri("30+ avatar")}</h3>
                <p>{ceviri("Tilkiden astronota, ninjadan dinozora. Level atladıkça yenileri açılır.")}</p>
              </div>
            </article>

            <article className="tn-parca tn-parca--davet" data-tn-gir>
              <img src={tanitimGorseli("davet", dil)} alt={ceviri("Sen ve rakibin, aynı soruda")}
                width="640" height="216" loading="lazy" decoding="async" />
              <div className="tn-parca-metin">
                <h3>{ceviri("Arkadaşınla oyna")}</h3>
                <p>{ceviri("Davet bağlantını paylaş, meydan oku ya da grup maçı kur. Arkadaşın gelince ikiniz de ödül kazanırsınız.")}</p>
              </div>
            </article>

            <article className="tn-parca tn-parca--sampiyon" data-tn-gir>
              <img src={tanitimGorseli("sampiyon", dil)} alt={ceviri("Şehir, ülke ve dünya sıralamaları")}
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
