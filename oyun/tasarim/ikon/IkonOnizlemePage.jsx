// /ikon-onizleme — uygulama ikonu ADAYLARI (yalnız sahip; menüde yok, yalnız adresle).
// Sahip kontrolü diğer önizlemelerle aynı: sunucu sahip_mi() (migration 380). Oyunda hiçbir şeyi
// değiştirmez: oyunun ikonu, manifest ve index.html aynen; seçimler yalnız bu tarayıcıda (localStorage)
// ve "Seçimlerimi kopyala" düz liste verir — migration yok.
// Adaylar public/ikon-aday/<ad>/ altında (üretici: ./ikon-uret.mjs). Her aday Android ana ekran taklidinde
// (başka uygulamalar arasında), daire / squircle / yuvarlak kare maskeyle, koyu ve açık duvar kağıdında,
// 48 / 72 / 192 px'te ve maskable güvenli alan kılavuzuyla gösterilir.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, supabaseHazir } from "../../../src/lib/supabase.js";
import { QtBosDurum, QtDugme, QtIkon, QtIskelet, QtKart } from "../index.js";
import { tt } from "../../lib/dil.js";
import "./ikon-onizleme.css";

// Yerel geliştirme (npm run dev, .env yok): sahip kontrolü atlanır ki sayfa ölçülebilsin.
// Üretim derlemesinde import.meta.env.DEV false → bu dal derlemeye girmez.
const YEREL = import.meta.env.DEV && !supabaseHazir;
const SAKLA = "qt_ikon_onizleme_secimler";
const AYAR = "qt_ikon_onizleme_ayar";

const ADAYLAR = [
  { ad: "q-nabiz", baslik: "Q Nabız", fikir: "Resmi logonun Q'su (lacivert gövde, turuncu kuyruk) açık gökyüzü zeminde. Logoya en sadık; sitenin tema rengiyle aynı aile." },
  { ad: "seker-q", baslik: "Şeker Q", fikir: "Turuncu zeminde kabarık beyaz Q, lacivert kontur ve dudak — oyunun şeker kutusu düğmeleriyle aynı dil. Sarı kuyruk, küçük parıltı." },
  { ad: "soru-balonu", baslik: "Soru Balonu", fikir: "Mor zeminde beyaz konuşma balonu ve turuncu soru işareti: \"soru-cevap\" fikri harfsiz, her dilde okunur." },
  { ad: "dort-sik", baslik: "Dört Şık", fikir: "Lacivert zeminde mod renklerinde 2×2 cevap karesi, yeşil olanda tik. Bilgi yarışmasının şık ekranı tek bakışta." },
];
const SIMDIKI = "/quiztactics-wordmark-maskable-512.png?v=20260922-compact";
const tamYol = (ad) => `/ikon-aday/${ad}/ikon-tam.svg`;
const pngYol = (ad) => `/ikon-aday/${ad}/maskable-512.png`;

// Ana ekrandaki diğer (sahte, markasız) uygulamalar
const DIGER = [
  { ad: "Takvim", ikon: "liste", renk: "#3b91e8" }, { ad: "Mesajlar", ikon: "mesaj", renk: "#2fd27a" },
  { ad: "Galeri", ikon: "gunes", renk: "#ff6f91" }, { ad: "Müzik", ikon: "muzik", renk: "#ff5a6a" },
  { ad: "Harita", ikon: "dunya", renk: "#1f9a61" }, { ad: "Saat", ikon: "saat", renk: "#46507f" },
  { ad: "Notlar", ikon: "kalem", renk: "#ffb020" }, { ad: "Kitaplar", ikon: "kitap", renk: "#c24a0c" },
  { ad: "Hava", ikon: "ay", renk: "#5ab8ff" }, { ad: "Ayarlar", ikon: "ayar", renk: "#8ea3c2" },
  { ad: "Arama", ikon: "arama", renk: "#6a48f5" },
];
const DOK = [{ ikon: "mesaj", renk: "#2fd27a" }, { ikon: "sohbet", renk: "#3b91e8" }, { ikon: "dunya", renk: "#ff7a2e" }, { ikon: "arama", renk: "#46507f" }];

const MASKELER = [["daire", "Daire"], ["squircle", "Squircle"], ["kare", "Yuvarlak kare"]];

function oku(anahtar, yedek) {
  try { return JSON.parse(localStorage.getItem(anahtar) || "null") || yedek; } catch { return yedek; }
}
function yaz(anahtar, v) {
  try { localStorage.setItem(anahtar, JSON.stringify(v)); } catch { /* özel mod: yalnız bu oturum */ }
}

/** Maskeli ikon: src tam kare görsel, maske sınıfla; kılavuz = merkez %80 güvenli daire. */
function Maskeli({ src, boyut, maske, kilavuz, alt = "" }) {
  return (
    <span className={`io-maske io-maske--${maske}`} style={{ width: boyut, height: boyut }}>
      <img src={src} alt={alt} width={boyut} height={boyut} draggable="false" />
      {kilavuz && <span className="io-kilavuz" aria-hidden="true" />}
    </span>
  );
}

function SahteUygulama({ u, boyut, maske }) {
  return (
    <span className={`io-maske io-maske--${maske} io-sahte`} style={{ width: boyut, height: boyut, background: u.renk }}>
      <QtIkon ad={u.ikon} boyut={Math.round(boyut * 0.5)} />
    </span>
  );
}

/** Android ana ekran taklidi: saat çubuğu, arama çubuğu, 4 sütun uygulama, altta dok. */
function AnaEkran({ aday, maske, duvar, kilavuz }) {
  const hucreler = [...DIGER.slice(0, 5), { aday: true }, ...DIGER.slice(5)];
  return (
    <div className={`io-telefon io-duvar--${duvar}`} role="img" aria-label={`${tt("Android ana ekranı")}: ${aday.baslik}`}>
      <div className="io-durum" aria-hidden="true"><span>12:30</span><span className="io-durum-sag">5G ▮▮▮ 84%</span></div>
      <div className="io-izgara">
        {hucreler.map((h, i) => (
          <span key={i} className={`io-hucre${h.aday ? " io-hucre--aday" : ""}`}>
            {h.aday ? <Maskeli src={tamYol(aday.ad)} boyut={52} maske={maske} kilavuz={kilavuz} alt={aday.baslik} />
              : <SahteUygulama u={h} boyut={52} maske={maske} />}
            <span className="io-etiket">{h.aday ? "Quiz Tactics" : h.ad}</span>
          </span>
        ))}
      </div>
      <div className="io-arama" aria-hidden="true"><QtIkon ad="arama" boyut={18} /></div>
      <div className="io-dok" aria-hidden="true">
        {DOK.map((u, i) => <SahteUygulama key={i} u={u} boyut={48} maske={maske} />)}
      </div>
    </div>
  );
}

function Cip({ secili, onClick, children }) {
  return <button type="button" className={`io-cip${secili ? " io-cip--secili" : ""}`} aria-pressed={secili} onClick={onClick}>{children}</button>;
}

function SecimDugmeleri({ kod, secimler, onSec }) {
  const d = secimler[kod];
  return (
    <div className="io-karar" role="group" aria-label={tt("Karar")}>
      <QtDugme boyut="k" tur={d === "girsin" ? "birincil" : "ikincil"} ikon={d === "girsin" ? "tik" : undefined}
               aria-pressed={d === "girsin"} onClick={() => onSec(kod, d === "girsin" ? null : "girsin")}>{tt("Girsin")}</QtDugme>
      <QtDugme boyut="k" tur={d === "girmesin" ? "tehlike" : "ikincil"} aria-pressed={d === "girmesin"}
               onClick={() => onSec(kod, d === "girmesin" ? null : "girmesin")}>{tt("Girmesin")}</QtDugme>
    </div>
  );
}

export default function IkonOnizlemePage() {
  const [durum, setDurum] = useState(YEREL ? "hazir" : "yukleniyor");
  const [ayar, setAyar] = useState(() => ({ maske: "daire", duvar: "koyu", kilavuz: false, ...oku(AYAR, {}) }));
  const [secimler, setSecimler] = useState(() => oku(SAKLA, {}));
  const [kopyaNot, setKopyaNot] = useState("");
  const [kopyaMetni, setKopyaMetni] = useState("");

  useEffect(() => { document.title = "Quiz Tactics — " + tt("İkon önizleme"); }, []);

  const yukle = useCallback(async () => {
    if (YEREL) { setDurum("hazir"); return; }
    setDurum("yukleniyor");
    try {
      const { data, error } = await supabase.rpc("sahip_mi");
      if (error) throw error;
      setDurum(data ? "hazir" : "sahip-degil");
    } catch (e) {
      console.error("ikon-onizleme sahip kontrolü:", e?.message ?? e);
      setDurum("hata");
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const ayarla = (degisim) => setAyar((eski) => { const yeni = { ...eski, ...degisim }; yaz(AYAR, yeni); return yeni; });

  const sec = useCallback((kod, deger) => {
    setSecimler((eski) => {
      const yeni = { ...eski };
      if (deger) yeni[kod] = deger; else delete yeni[kod];
      yaz(SAKLA, yeni);
      return yeni;
    });
  }, []);

  const liste = useMemo(() => {
    const grup = (d) => ADAYLAR.filter((a) => (secimler[a.ad] ?? null) === d).map((a) => `${a.baslik} (${a.ad})`);
    return { girsin: grup("girsin"), girmesin: grup("girmesin"), bekliyor: grup(null) };
  }, [secimler]);

  const kopyala = async () => {
    const tarih = new Date().toLocaleString("tr-TR");
    const metin = [
      `Quiz Tactics — Uygulama ikonu seçimlerim (${tarih})`,
      `GİRSİN (${liste.girsin.length}): ${liste.girsin.join(", ") || "—"}`,
      `GİRMESİN (${liste.girmesin.length}): ${liste.girmesin.join(", ") || "—"}`,
      `KARAR VERİLMEDİ (${liste.bekliyor.length}): ${liste.bekliyor.join(", ") || "—"}`,
    ].join("\n");
    setKopyaMetni(metin);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaNot(tt("Kopyalandı — bana yapıştırabilirsin."));
    } catch (e) {
      console.warn("[Bildim] pano yazılamadı:", e?.message ?? e);
      setKopyaNot(tt("Pano izin vermedi — aşağıdaki metni seçip kopyala."));
    }
  };

  if (durum === "yukleniyor") {
    return <div className="qt-sayfa io-sayfa"><div className="qt-sayfa-ic io-ic" aria-busy="true"><QtIskelet tur="metin" adet={2} /><QtIskelet tur="kart" adet={2} /></div></div>;
  }
  if (durum !== "hazir") {
    const sahipDegil = durum === "sahip-degil";
    return (
      <div className="qt-sayfa io-sayfa"><div className="qt-sayfa-ic io-ic"><QtKart>
        <QtBosDurum ikon={sahipDegil ? "kilit" : "uyari"} ton={sahipDegil ? "mor" : "yanlis"}
                    baslik={sahipDegil ? tt("Bu sayfa yalnız sahibe açık") : tt("Sayfa yüklenemedi")}
                    eylem={sahipDegil ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{tt("Ana sayfaya dön")}</QtDugme>
                      : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{tt("Tekrar dene")}</QtDugme>} />
      </QtKart></div></div>
    );
  }

  const { maske, duvar, kilavuz } = ayar;

  return (
    <div className="qt-sayfa io-sayfa">
      <svg className="io-svg-tanim" aria-hidden="true" focusable="false">
        <clipPath id="io-squircle" clipPathUnits="objectBoundingBox">
          <path d="M.5 0C.88 0 1 .12 1 .5S.88 1 .5 1 0 .88 0 .5.12 0 .5 0Z" />
        </clipPath>
      </svg>
      <main className="qt-sayfa-ic io-ic">
        <header className="io-giris">
          <h1 className="qt-baslik-1">{tt("Uygulama ikonu önizleme")}</h1>
          <p className="qt-govde io-ozet">{tt("4 aday ikon, telefonun ana ekranında başka uygulamaların arasında. Oyunun ikonu değişmedi; seçimlerin yalnız bu tarayıcıda durur.")}</p>
        </header>

        {/* ---------------- Ayarlar (bütün adaylara uygulanır) ---------------- */}
        <QtKart className="io-ayarlar">
          <div className="io-ayar-sira">
            <span className="io-ayar-ad">{tt("Maske")}</span>
            <div className="io-cipler">
              {MASKELER.map(([k, ad]) => <Cip key={k} secili={maske === k} onClick={() => ayarla({ maske: k })}>{tt(ad)}</Cip>)}
            </div>
          </div>
          <div className="io-ayar-sira">
            <span className="io-ayar-ad">{tt("Duvar kağıdı")}</span>
            <div className="io-cipler">
              <Cip secili={duvar === "koyu"} onClick={() => ayarla({ duvar: "koyu" })}><QtIkon ad="ay" boyut={18} />{tt("Koyu")}</Cip>
              <Cip secili={duvar === "acik"} onClick={() => ayarla({ duvar: "acik" })}><QtIkon ad="gunes" boyut={18} />{tt("Açık")}</Cip>
            </div>
          </div>
          <div className="io-ayar-sira">
            <span className="io-ayar-ad">{tt("Güvenli alan")}</span>
            <div className="io-cipler">
              <Cip secili={kilavuz} onClick={() => ayarla({ kilavuz: !kilavuz })}>{kilavuz ? tt("Kılavuz açık") : tt("Kılavuz kapalı")}</Cip>
            </div>
          </div>
          <p className="qt-kucuk qt-soluk io-ayar-not">{tt("Kılavuz: kesikli daire, maskable ikonun merkez %80 güvenli alanı. Android hangi şekli keserse kessin bu dairenin içi görünür.")}</p>
        </QtKart>

        {/* ---------------- Yan yana, 48 px ---------------- */}
        <section className="io-bolum" aria-labelledby="io-yanyana">
          <h2 id="io-yanyana" className="qt-baslik-2">{tt("Yan yana")} <span className="io-px">48 px</span></h2>
          <div className={`io-yanyana io-duvar--${duvar}`}>
            <span className="io-hucre">
              <Maskeli src={SIMDIKI} boyut={48} maske={maske} kilavuz={kilavuz} alt={tt("Şimdiki ikon")} />
              <span className="io-etiket">{tt("Şimdiki")}</span>
            </span>
            {ADAYLAR.map((a) => (
              <span key={a.ad} className="io-hucre">
                <Maskeli src={pngYol(a.ad)} boyut={48} maske={maske} kilavuz={kilavuz} alt={a.baslik} />
                <span className="io-etiket">{a.baslik}</span>
              </span>
            ))}
          </div>
        </section>

        {/* ---------------- Adaylar ---------------- */}
        <section className="io-bolum" aria-labelledby="io-adaylar">
          <h2 id="io-adaylar" className="qt-baslik-2">{tt("Adaylar")} <span className="io-px">4</span></h2>
          <div className="io-adaylar">
            {ADAYLAR.map((a, i) => (
              <QtKart key={a.ad} className="io-aday">
                <div className="io-aday-bas">
                  <h3 className="qt-baslik-3">{i + 1}. {a.baslik}</h3>
                  {secimler[a.ad] === "girsin" && <span className="io-rozet io-rozet--girsin">{tt("Girsin")}</span>}
                  {secimler[a.ad] === "girmesin" && <span className="io-rozet io-rozet--girmesin">{tt("Girmesin")}</span>}
                </div>
                <p className="qt-kucuk io-fikir">{tt(a.fikir)}</p>
                <AnaEkran aday={a} maske={maske} duvar={duvar} kilavuz={kilavuz} />
                <div className={`io-boylar io-duvar--${duvar}`}>
                  {[48, 72, 192].map((b) => (
                    <figure key={b} className="io-boy">
                      <Maskeli src={pngYol(a.ad)} boyut={b} maske={maske} kilavuz={kilavuz} alt={`${a.baslik} ${b} px`} />
                      <figcaption className="io-px">{b} px</figcaption>
                    </figure>
                  ))}
                </div>
                <SecimDugmeleri kod={a.ad} secimler={secimler} onSec={sec} />
              </QtKart>
            ))}
          </div>
        </section>

        {/* ---------------- Seçimler ---------------- */}
        <section className="io-bolum" aria-labelledby="io-secimler">
          <h2 id="io-secimler" className="qt-baslik-2">{tt("Seçimlerim")}</h2>
          <QtKart className="io-ozet-kart">
            <p><b>{tt("Girsin")} ({liste.girsin.length}):</b> {liste.girsin.join(", ") || "—"}</p>
            <p><b>{tt("Girmesin")} ({liste.girmesin.length}):</b> {liste.girmesin.join(", ") || "—"}</p>
            <p className="qt-soluk"><b>{tt("Karar verilmedi")} ({liste.bekliyor.length}):</b> {liste.bekliyor.join(", ") || "—"}</p>
            <QtDugme tamGenislik ikon="kopyala" onClick={kopyala}>{tt("Seçimlerimi kopyala")}</QtDugme>
            <p className="io-kopya-not" role="status" aria-live="polite">{kopyaNot}</p>
            {kopyaMetni && <textarea className="io-kopya-metin" readOnly value={kopyaMetni} rows={5} onFocus={(e) => e.target.select()} aria-label={tt("Kopyalanacak metin")} />}
          </QtKart>
        </section>

        {/* ---------------- Onaydan sonra bağlama notu ---------------- */}
        <details className="io-kurulum">
          <summary>{tt("Onaydan sonra: hangi dosya nereye (geliştirici notu)")}</summary>
          <ol className="qt-kucuk">
            <li><code>public/ikon-aday/&lt;ad&gt;/</code> → <code>public/</code>: <code>icon-192.png</code> → <code>qt-ikon-192.png</code>, <code>icon-512.png</code> → <code>qt-ikon-512.png</code>, <code>maskable-512.png</code> → <code>qt-ikon-maskable-512.png</code>, <code>apple-touch-icon.png</code> → <code>apple-touch-icon.png</code>, <code>favicon.svg</code> → <code>favicon.svg</code>. Eski <code>quiztactics-wordmark-*</code> ve <code>bildim-icon-*</code> dosyaları silinmez (yüklü uygulamaların geri dönüşü).</li>
            <li><code>public/bildim.webmanifest</code> › <code>icons</code>: üç <code>src</code> satırı yeni dosyalara, sürüm <code>?v=&lt;tarih&gt;</code>.</li>
            <li><code>index.html</code>: <code>rel="manifest"</code> sürümü; <code>rel="icon"</code> → <code>/favicon.svg</code> (svg) + PNG yedeği <code>/qt-ikon-192.png</code>; <code>rel="apple-touch-icon"</code> → <code>/apple-touch-icon.png</code>. <code>theme-color</code> aynı kalır. <code>og:image</code>/<code>twitter:image</code> paylaşım kartıdır, ayrı karar.</li>
            <li>İsteğe bağlı: <code>oyun/components/AnaEkranaEkle.jsx</code> (ikon görseli) ve <code>public/sw.js</code> (bildirim <code>icon</code>/<code>badge</code>) yeni 192'ye.</li>
          </ol>
        </details>
      </main>
    </div>
  );
}
