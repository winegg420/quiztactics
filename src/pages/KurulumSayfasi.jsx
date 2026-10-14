import { useEffect } from "react";
import { QtMarka, QtCip, QtKart } from "../../oyun/tasarim/index.js";
import "../../oyun/tasarim/ekranlar/g-ortak.css";
import "../../oyun/tasarim/ekranlar/g-giris.css";
import { ModFiguru } from "../../oyun/components/ModFiguru.jsx";
import { useDil } from "../../oyun/lib/dilKanca.js";
import { DILLER } from "../../oyun/lib/dil.js";

// ============================================================
// KURULUM SAYFASI — quiztactics.com tarayıcıda yalnız tanıtım + kurulum.
//
// Oyun yalnız kurulu uygulamada açılır (src/lib/uygulamaKipi.js › oyunAcilabilir).
// Tarayıcı sekmesinde oyun rotalarından herhangi biri bu sayfayı gösterir.
// Düzen giriş ekranıyla aynı (g-giris): solda vitrin, sağda kurulum kartı.
// ============================================================

const MODLAR = [
  { tur: "klasik", ad: "Klasik", vaat: "Hızlı sorular, en çok bilen kazanır" },
  { tur: "duello", ad: "Düello", vaat: "Kontrolü al, 3/3 yap" },
  { tur: "kasa", ad: "Ortak Hazine", vaat: "Doğru anda aç" },
];

const DAVET_KODU_ANAHTAR = "bildim_davet_kodu";   // DavetPage + AuthContext ile aynı anahtar

export default function KurulumSayfasi() {
  const { dil, ceviri, dilDegistir } = useDil();

  // /davet/:kod ile gelindiyse kodu sakla: uygulama aynı depoyu paylaşıyorsa (Android, masaüstü)
  // girişten sonra arkadaşlık isteği kendiliğinden gider (AuthContext › davetKoduUygula).
  useEffect(() => {
    try {
      const m = /^\/davet\/([A-Za-z0-9]{8})\/?$/.exec(window.location.pathname);
      if (m) window.localStorage.setItem(DAVET_KODU_ANAHTAR, m[1].toUpperCase());
    } catch { /* özel mod: kod elle girilir */ }
  }, []);

  return (
    <div className="qt-sayfa g-giris g-kurulum">
      <div className="g-giris-ic">
        <header className="g-giris-ust">
          <QtMarka boyut="b" />
          <div className="g-giris-dil" role="group" aria-label={ceviri("Dil")}>
            {DILLER.map((d) => (
              <QtCip key={d} secili={dil === d} onClick={() => dilDegistir(d)}>
                {d.toUpperCase()}
              </QtCip>
            ))}
          </div>
        </header>

        <main className="g-giris-izgara">
          <section className="g-giris-vitrin">
            <span className="g-giris-avatarlar" aria-hidden="true">
              {["/avatars/pro/tilki-k04.svg", "/avatars/pro/kedi-k01.svg", "/avatars/pro/robot-k15.svg"].map((src) => (
                <img key={src} src={src} alt="" width="64" height="64" decoding="async" draggable="false" />
              ))}
            </span>
            <h1 className="g-giris-baslik">
              {ceviri("Bilgini oyuna")} <span className="g-giris-baslik-vurgu">{ceviri("dönüştür.")}</span>
            </h1>
          </section>

          <section className="g-giris-panel" aria-labelledby="g-kurulum-baslik">
            <QtKart dolgu="b" className="g-giris-kart g-kurulum-kart">
              <h2 id="g-kurulum-baslik" className="qt-baslik-2">{ceviri("Quiz Tactics bir uygulama")}</h2>
              <p className="qt-kucuk qt-soluk g-giris-alt">
                {ceviri("Oyun yalnız ana ekrana eklenen uygulamada açılır. Kurulum ücretsiz, birkaç saniye sürer.")}
              </p>
            </QtKart>

            <section className="g-giris-modlar" aria-labelledby="g-kurulum-modlar-baslik">
              <h2 id="g-kurulum-modlar-baslik" className="g-giris-modlar-baslik">{ceviri("Seni neler bekliyor")}</h2>
              <ul className="g-giris-mod-liste">
                {MODLAR.map((m) => (
                  <li key={m.tur} className={`g-giris-mod g-giris-mod--${m.tur} qt-isin-sahne`}>
                    <span className="g-giris-mod-metin"><b>{ceviri(m.ad)}</b><small>{ceviri(m.vaat)}</small></span>
                    <ModFiguru tur={m.tur} className="g-giris-mod-figur" />
                  </li>
                ))}
              </ul>
            </section>

            <nav className="g-giris-yasal" aria-label={ceviri("Yasal metinler")}>
              <a href="/gizlilik">{ceviri("Gizlilik politikası")}</a>
              <span aria-hidden="true">·</span>
              <a href="/kosullar">{ceviri("Kullanım koşulları")}</a>
              <span aria-hidden="true">·</span>
              <a href="/hesap-sil">{ceviri("Hesap silme")}</a>
            </nav>
          </section>
        </main>
      </div>
    </div>
  );
}
