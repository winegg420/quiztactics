// /ses-secim — Ida'nın kulağıyla ses seçimi (Ajan F, 23 Eyl 2026).
// Menüde yok; yalnız sahip hesabıyla açılır (sunucu: sahip_mi(), migration 380).
// Adaylar public/ses/adaylar/ altında ve YALNIZ ▶ Çal'a basınca indirilir (ana pakete girmez).
// Seçim oyuna ŞİMDİ bağlanmaz: oyun/lib/ses.js ve oyundaki sesler değişmedi.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../src/lib/supabase.js";
import { aktifDil, tt } from "../../lib/dil.js";
import EN from "../../lib/ceviri/ses-secim.js";
import { QtAnahtar, QtBosDurum, QtDugme, QtIlerleme, QtIskelet, QtKart, QtRozet } from "../index.js";
import { EFEKTLER, KENNEY, MUZIKLER, TUM_ANLAR } from "./adaylar.js";
import "./ses-secim.css";

/** Sayfa-içi çeviri: İngilizcesi ceviri/ses-secim.js'te (dil.js'e katılmaz → ana paket büyümez). */
function ts(anahtar, degerler) {
  const metin = aktifDil() === "en" && EN[anahtar] ? EN[anahtar] : tt(anahtar);
  if (!degerler) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad) => (ad in degerler ? String(degerler[ad] ?? "") : tam));
}
const en = () => aktifDil() === "en";

// ——————————————————————— çalar (Web Audio: iOS'ta da ses seviyesi ayarlanır) ———————————————————————
let ctx = null;
const tamponlar = new Map();   // url → Promise<AudioBuffer>
let aktif = null;              // { kaynak, kazanc }

function baglam() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Web Audio yok");
  ctx = new AC();
  return ctx;
}

function tampon(c, url) {
  let s = tamponlar.get(url);
  if (s) return s;
  s = (async () => {
    const y = await fetch(url);
    if (!y.ok) throw new Error(`HTTP ${y.status}`);
    const veri = await y.arrayBuffer();
    // Eski Safari decodeAudioData'yı yalnız geri çağırma biçimiyle destekler.
    return new Promise((coz, reddet) => {
      try {
        const p = c.decodeAudioData(veri, coz, reddet);
        if (p && typeof p.then === "function") p.then(coz, reddet);
      } catch (e) {
        reddet(e);
      }
    });
  })();
  s.catch(() => tamponlar.delete(url));
  tamponlar.set(url, s);
  return s;
}

function durdur() {
  if (!aktif) return;
  try {
    aktif.kaynak.onended = null;
    aktif.kaynak.stop();
  } catch { /* zaten bitti */ }
  aktif = null;
}

/** Çalar; bitince `bitti()` çağrılır. Hata atarsa çağıran yakalar. */
async function cal(url, { seviye = 0.8, dongu = false, bitti }) {
  const c = baglam();
  if (c.state === "suspended") c.resume();   // iOS: dokunuşla aynı işleyicide
  durdur();
  const b = await tampon(c, url);
  durdur();
  const kaynak = c.createBufferSource();
  kaynak.buffer = b;
  kaynak.loop = dongu;
  const kazanc = c.createGain();
  kazanc.gain.value = seviye;
  kaynak.connect(kazanc).connect(c.destination);
  const kayit = { kaynak, kazanc };
  kaynak.onended = () => {
    if (aktif === kayit) aktif = null;
    bitti?.();
  };
  aktif = kayit;
  kaynak.start();
}

function seviyeAyarla(seviye) {
  try {
    if (aktif && ctx) aktif.kazanc.gain.setTargetAtTime(seviye, ctx.currentTime, 0.02);
  } catch { /* çalan yok */ }
}

// ——————————————————————— kart ———————————————————————
function secenekler(an) {
  const ilk = an.mevcut
    ? { id: "mevcut", ad: ts("Mevcut"), dosya: an.mevcut, alt: `public/ses/${an.mevcut.split("/").pop()}` }
    : { id: "sessiz", ad: ts("Sessiz kalsın"), sessiz: true, alt: ts("Bu anda bugün ses çalmıyor.") };
  if (an.tur === "muzik") return an.adaylar.map((a, i) => ({ id: a.id, ad: ts("Aday {n}", { n: i + 1 }), dosya: a.dosya, alt: `${a.kaynak} · ${a.baslik} · ${a.yazar}` }));
  return [ilk, ...an.adaylar.map((a, i) => ({ id: a.id, ad: ts("Aday {n}", { n: i + 1 }), dosya: a.dosya, alt: `${a.kaynak} · ${a.baslik}` }))];
}

function SesKarti({ an, secili, kaydediliyor, calanId, onCal, onSec }) {
  const liste = useMemo(() => secenekler(an), [an]);
  const baslikId = `ss-an-${an.an}`;
  return (
    <QtKart as="section" className="ss-kart" aria-labelledby={baslikId}>
      <header className="ss-kart-bas">
        <div className="ss-kart-metin">
          <h3 id={baslikId} className="ss-kart-ad">{en() ? an.adEn : an.ad}</h3>
          <p className="ss-kart-yer">{en() ? an.yerEn : an.yer}</p>
        </div>
        {secili ? (
          <QtRozet ton="dogru" ikon="onay" boyut="k">{ts("Seçildi")}</QtRozet>
        ) : (
          <QtRozet ton="notr" boyut="k">{ts("Seçilmedi")}</QtRozet>
        )}
      </header>
      <ul className="ss-adaylar">
        {liste.map((s) => {
          const calan = calanId === `${an.an}:${s.id}`;
          const benim = secili === s.id;
          return (
            <li key={s.id} className={`ss-aday${benim ? " ss-aday--secili" : ""}`}>
              {s.sessiz ? (
                <div className="ss-sessiz" aria-hidden="true">{ts("Şu an sessiz")}</div>
              ) : (
                <QtDugme
                  tur={calan ? "mor" : "ikincil"}
                  boyut="b"
                  ikon={calan ? "kapat" : "oyna"}
                  tamGenislik
                  className="ss-cal"
                  aria-label={ts(calan ? "{ad} durdur" : "{ad} çal", { ad: `${en() ? an.adEn : an.ad} — ${s.ad}` })}
                  onClick={() => onCal(an, s)}
                >
                  {s.ad}
                </QtDugme>
              )}
              <p className="ss-aday-alt">{s.alt}</p>
              <QtDugme
                tur={benim ? "mor" : "hayalet"}
                boyut="k"
                ikon={benim ? "onay" : undefined}
                tamGenislik
                yukleniyor={kaydediliyor === s.id}
                aria-pressed={benim}
                onClick={() => onSec(an.an, benim ? null : s.id)}
              >
                {benim ? ts("Seçildi") : ts("Bunu seç")}
              </QtDugme>
            </li>
          );
        })}
      </ul>
    </QtKart>
  );
}

// ——————————————————————— sayfa ———————————————————————
export default function SesSecimPage() {
  const [durum, setDurum] = useState("yukleniyor");   // yukleniyor · sahip-degil · hata · hazir
  const [secimler, setSecimler] = useState({});
  const [kaydediliyor, setKaydediliyor] = useState({}); // an → aday id
  const [calanId, setCalanId] = useState(null);
  const [uyari, setUyari] = useState("");
  const [muzikSeviye, setMuzikSeviye] = useState(0.6);
  const [dongu, setDongu] = useState(true);
  const secimRef = useRef(secimler);
  secimRef.current = secimler;

  const yukle = useCallback(async () => {
    setDurum("yukleniyor");
    try {
      const { data: sahip, error: e1 } = await supabase.rpc("sahip_mi");
      if (e1) throw e1;
      if (!sahip) { setDurum("sahip-degil"); return; }
      const { data, error: e2 } = await supabase.rpc("ses_secimlerim");
      if (e2) throw e2;
      const harita = {};
      for (const r of data ?? []) harita[r.an] = r.aday;
      setSecimler(harita);
      setDurum("hazir");
    } catch (e) {
      console.error("ses-secim yükleme:", e);
      setDurum("hata");
    }
  }, []);

  useEffect(() => {
    yukle();
    return () => durdur();
  }, [yukle]);

  const onCal = useCallback(async (an, s) => {
    const id = `${an.an}:${s.id}`;
    if (calanId === id) { durdur(); setCalanId(null); return; }
    setCalanId(id);
    setUyari("");
    try {
      const muzik = an.tur === "muzik";
      await cal(s.dosya, {
        seviye: muzik ? muzikSeviye : 0.8,
        dongu: muzik && dongu,
        bitti: () => setCalanId((simdi) => (simdi === id ? null : simdi)),
      });
    } catch (e) {
      console.error("ses-secim çalma:", s.dosya, e);
      setCalanId((simdi) => (simdi === id ? null : simdi));
      setUyari(ts("Ses çalınamadı"));
    }
  }, [calanId, muzikSeviye, dongu]);

  const onSec = useCallback(async (an, aday) => {
    const onceki = secimRef.current[an];
    setSecimler((s) => { const y = { ...s }; if (aday) y[an] = aday; else delete y[an]; return y; });
    setKaydediliyor((k) => ({ ...k, [an]: aday ?? onceki }));
    setUyari("");
    try {
      const { error } = await supabase.rpc("ses_secimi_kaydet", { p_an: an, p_aday: aday });
      if (error) throw error;
    } catch (e) {
      console.error("ses-secim kaydet:", e);
      setSecimler((s) => { const y = { ...s }; if (onceki) y[an] = onceki; else delete y[an]; return y; });
      setUyari(ts("Kaydedilemedi: {hata}", { hata: e?.message ?? "" }));
    } finally {
      setKaydediliyor((k) => { const y = { ...k }; delete y[an]; return y; });
    }
  }, []);

  const seviyeDegis = (v) => {
    setMuzikSeviye(v);
    if (calanId?.startsWith("muzik_")) seviyeAyarla(v);
  };
  const donguDegis = (v) => {
    setDongu(v);
    try { if (aktif && calanId?.startsWith("muzik_")) aktif.kaynak.loop = v; } catch { /* çalan yok */ }
  };

  const toplam = TUM_ANLAR.length;
  const secilen = TUM_ANLAR.filter((a) => secimler[a.an]).length;

  if (durum === "yukleniyor") {
    return (
      <div className="qt-sayfa ss-sayfa">
        <div className="qt-sayfa-ic ss-ic" aria-busy="true">
          <QtIskelet tur="metin" adet={2} />
          <QtIskelet tur="kart" adet={3} />
        </div>
      </div>
    );
  }
  if (durum === "sahip-degil" || durum === "hata") {
    const sahipDegil = durum === "sahip-degil";
    return (
      <div className="qt-sayfa ss-sayfa">
        <div className="qt-sayfa-ic ss-ic">
          <QtKart>
            <QtBosDurum
              ikon={sahipDegil ? "kilit" : "uyari"}
              ton={sahipDegil ? "mor" : "yanlis"}
              baslik={sahipDegil ? ts("Bu sayfa yalnız sahibe açık") : ts("Seçimler yüklenemedi")}
              metin={sahipDegil ? ts("Ses seçimini yalnız oyunun sahibi yapabilir.") : undefined}
              eylem={sahipDegil
                ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{ts("Ana sayfaya dön")}</QtDugme>
                : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{ts("Tekrar dene")}</QtDugme>}
            />
          </QtKart>
        </div>
      </div>
    );
  }

  const kartlar = (liste) => liste.map((an) => (
    <SesKarti
      key={an.an}
      an={an}
      secili={secimler[an.an]}
      kaydediliyor={kaydediliyor[an.an]}
      calanId={calanId}
      onCal={onCal}
      onSec={onSec}
    />
  ));

  const pixabay = TUM_ANLAR.flatMap((an) => an.adaylar.filter((a) => a.kaynak === "Pixabay").map((a) => ({ ...a, anAd: en() ? an.adEn : an.ad })));

  return (
    <div className="qt-sayfa ss-sayfa">
      <div className="qt-sayfa-ic ss-ic">
        <header className="ss-giris">
          <h1 className="qt-baslik-1 ss-baslik">{ts("Ses seçimi")}</h1>
          <p className="qt-govde qt-soluk-zemin">
            {ts("Her an için adayları dinle, beğendiğini seç. Seçimler sunucuda saklanır; oyuna Ida onaylayınca ayrı adımda bağlanır.")}
          </p>
        </header>

        <div className="ss-ilerleme" role="status">
          <strong className="ss-ilerleme-sayi qt-sayi">{ts("{n} / {t} seçildi", { n: secilen, t: toplam })}</strong>
          <QtIlerleme deger={secilen} en={toplam} ton="dogru" etiket={ts("Seçim ilerlemesi")} />
          {uyari && <p className="ss-uyari">{uyari}</p>}
        </div>

        <section className="ss-bolum" aria-labelledby="ss-efektler">
          <h2 id="ss-efektler" className="qt-baslik-2 ss-bolum-baslik">{ts("Efektler")} · {EFEKTLER.length}</h2>
          {kartlar(EFEKTLER)}
        </section>

        <section className="ss-bolum" aria-labelledby="ss-muzik">
          <h2 id="ss-muzik" className="qt-baslik-2 ss-bolum-baslik">{ts("Müzik")} · {MUZIKLER.length}</h2>
          <QtKart className="ss-muzik-ayar">
            <label className="ss-seviye">
              <span className="ss-seviye-ad">{ts("Ses seviyesi")}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muzikSeviye}
                onChange={(e) => seviyeDegis(Number(e.target.value))}
              />
              <span className="ss-seviye-deger qt-sayi">{Math.round(muzikSeviye * 100)}</span>
            </label>
            <QtAnahtar
              acik={dongu}
              onDegis={donguDegis}
              etiket={ts("Döngü önizlemesi")}
              aciklama={ts("Parça bitince baştan çalar (30 sn'lik önizleme).")}
            />
          </QtKart>
          {kartlar(MUZIKLER)}
        </section>

        <section className="ss-bolum" aria-labelledby="ss-kaynaklar">
          <h2 id="ss-kaynaklar" className="qt-baslik-2 ss-bolum-baslik">{ts("Kaynaklar ve lisanslar")}</h2>
          <QtKart className="ss-kaynaklar">
            <p className="qt-kucuk qt-soluk">
              {ts("Kenney sesleri CC0 (kamu malı). Pixabay sesleri ve müzikleri Pixabay İçerik Lisansı: ticari kullanım serbest, atıf gerekmez, dosyayı tek başına yeniden dağıtmak/satmak yasak.")}
            </p>
            <ul className="ss-kaynak-liste">
              {Object.values(KENNEY).map((k) => (
                <li key={k.url}>
                  <a className="ss-kaynak" href={k.url} target="_blank" rel="noreferrer">Kenney · {k.ad} · CC0</a>
                </li>
              ))}
              {pixabay.map((a) => (
                <li key={a.id}>
                  <a className="ss-kaynak" href={a.url} target="_blank" rel="noreferrer">
                    {a.anAd} · {a.baslik} · {a.yazar}
                  </a>
                </li>
              ))}
            </ul>
          </QtKart>
        </section>
      </div>
    </div>
  );
}
