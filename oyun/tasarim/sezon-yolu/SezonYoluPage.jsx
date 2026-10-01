// ============================================================
// SEZON YOLU (Battle Pass, 720) — /sezon-yolu tam ekran sayfası.
// Bütün sayılar ve "alınabilir / alındı" kararı SUNUCUDAN gelir (oyun/lib/sezonYolu.js); istemci hesap yapmaz,
// ödül vermez — yalnız RPC çağırır ve cevabı çizer. Sistem kapalıysa (gorunur=false) "Bu bölüm şu an kapalı" +
// ana sayfaya replace. Sahip için kapalı sistemde test sezonu görünür (durum.test) ve test araçları açılır.
// Bu dosya yalnız DURUM + akış (yükle/al/satın al); görünüm parçaları yan dosyalarda:
//   sezonTemalari.jsx (sezon teması) · SezonUst.jsx (hero, seviye, BP düğmesi) · Yol.jsx (yatay yol) · SiradakiOdul.jsx
//   OdulSayfasi.jsx (önizleme) · TasmaSayfasi.jsx (28+) · SatinAlSayfasi.jsx · Kutlama.jsx · SezonUcus.jsx (coin uçuşu)
// Hareketi azalt: patlama/parlama/uçuş sadeleşir (oyun/tasarim/yumusakHareket.js; CSS @media).
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { QtKart, QtDugme, QtRozet, QtIkon, QtBosDurum, QtIskelet, QtIlerleme, sayiBicim } from "../index.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { tt } from "../../lib/dil.js";
import { useDil } from "../../lib/dilKanca.js";
import { hataMesaji } from "../../lib/hata.js";
import { sesCoin, sesRozet, sesSatinAlma } from "../../lib/ses.js";
import { sezonDurumu, bpSatinAl, bpTopluAl, bpBonusGorevAl, sahipSpEkle, sahipTestSifirla } from "../../lib/sezonYolu.js";
import UnvanYazisi from "../../components/UnvanYazisi.jsx";
import BulunamadiPage from "../../pages/BulunamadiPage.jsx";
import { sezonTemasi } from "./sezonTemalari.jsx";
import { SezonHero, SeviyeSatiri, BpDugmesi, FaydaCipleri, Lejant } from "./SezonUst.jsx";
import YolSeridi from "./Yol.jsx";
import SiradakiOdul from "./SiradakiOdul.jsx";
import OdulSayfasi from "./OdulSayfasi.jsx";
import TasmaSayfasi from "./TasmaSayfasi.jsx";
import SatinAlSayfasi from "./SatinAlSayfasi.jsx";
import Kutlama from "./Kutlama.jsx";
import SezonUcus from "./SezonUcus.jsx";
import SezonAcilisPerdesi from "./SezonAcilisPerdesi.jsx";
import { ACILIS_MS, PARLA_MS, azaltMi, hayaletBirak, perdeGerekliMi } from "./acilis.js";
import { anahtar, paraMiktari } from "./OdulGorsel.jsx";
import { OdulKimlik } from "./CerceveOdulGorsel.jsx";
import "./sezon-yolu.css";

const OLAY = "bildim-sezon-degisti";   // sezonYolu.js her işlemden sonra yayar (maç sonu da)
const VURGU_MS = 1600;                 // açılma/dolma vurgusunun süresi

export default function SezonYoluPage() {
  const { user, profile } = useAuth();
  const { dil } = useDil();
  const userId = user?.id ?? profile?.id ?? null;
  const [durum, setDurum] = useState(null);
  const [hata, setHata] = useState(false);
  const [secili, setSecili] = useState(null);          // açık ödül alt sayfası (anahtar)
  const [tasmaKol, setTasmaKol] = useState(null);      // açık taşma alt sayfası ("ucretsiz" | "ucretli")
  const [satinAlAcik, setSatinAlAcik] = useState(false);
  const [kutlama, setKutlama] = useState(null);        // { verilen }
  const [ucus, setUcus] = useState(null);              // { kaynak } — coin uçuşu
  const [yeniAcilan, setYeniAcilan] = useState(() => new Set());
  const [yeniAlinan, setYeniAlinan] = useState(() => new Set());
  const [islem, setIslem] = useState(null);            // "toplu" | "bonus" | "test"
  const [islemHata, setIslemHata] = useState(null);
  const yolRef = useRef(null);
  const topluRef = useRef(null);
  const istek = useRef(0);
  const canli = useRef(true);
  const onceki = useRef(null);
  const kaydirildi = useRef(false);
  const vurguZaman = useRef(null);
  const kabukEl = useRef(null);            // son bilinen sayfa kabuğu (kapanış geçişi için; sökülürken ref null olur)
  const acilisBasladi = useRef(false);
  const kaydirAnimId = useRef(0);
  const parlaZaman = useRef(null);
  const [acilis, setAcilis] = useState("bekle");   // "bekle": veri/perde bekleniyor (görünmez) · "oyna": sayfa kayarak açılır
  const [perde, setPerde] = useState(false);       // sezonun ilk açılışı: tam perde
  const [parla, setParla] = useState(null);        // açılışta parlayan durak (mevcut seviye)
  const kabukRef = useCallback((el) => { if (el) kabukEl.current = el; }, []);

  // Kapanış: sayfa sökülmeden hemen önce kabuğun donmuş kopyası alta kayıp solar (250 ms; hareketi azaltta yok)
  useLayoutEffect(() => () => hayaletBirak(kabukEl.current), []);

  const kaydir = useCallback((seviye, yumusak) => {
    const yol = yolRef.current;
    const el = yol?.querySelector(`[data-durak="${seviye === "tasma" ? "tasma" : Math.max(1, seviye)}"]`);
    if (!yol || !el) return;
    const sol = Math.max(0, el.offsetLeft - (yol.clientWidth - el.offsetWidth) / 2);
    try { yol.scrollTo({ left: sol, behavior: yumusak && !azaltMi() ? "smooth" : "auto" }); } catch { yol.scrollLeft = sol; }
  }, []);

  const yukle = useCallback(async () => {
    const no = ++istek.current;
    try {
      const d = await sezonDurumu();
      if (no !== istek.current || !canli.current) return;
      if (!d || typeof d !== "object") throw new Error("Sezon Yolu verisi boş geldi");
      const onc = onceki.current;
      const alindiSet = new Set((d.oduller ?? []).filter((o) => o.alindi).map(anahtar));
      if (onc) {
        const acilan = new Set();
        for (let n = onc.seviye + 1; n <= d.seviye; n += 1) acilan.add(n);
        const alinan = new Set([...alindiSet].filter((k) => !onc.alindi.has(k)));
        if (acilan.size || alinan.size) {
          setYeniAcilan(acilan);
          setYeniAlinan(alinan);
          clearTimeout(vurguZaman.current);
          vurguZaman.current = setTimeout(() => { setYeniAcilan(new Set()); setYeniAlinan(new Set()); }, VURGU_MS);
        }
        if (acilan.size) requestAnimationFrame(() => kaydir(d.seviye, true));
      }
      onceki.current = { seviye: Number(d.seviye ?? 0), alindi: alindiSet };
      setDurum(d);
      setHata(false);
    } catch (e) {
      console.error("[Bildim] Sezon Yolu yüklenemedi:", e?.message ?? e);
      if (no === istek.current && canli.current) setHata(true);
    }
  }, [kaydir]);

  useEffect(() => {
    canli.current = true;
    yukle();
    // Açılış perdesi / final kartı Ejderha gibi premium çerçeveyi çizer: tembel parça veri beklenirken inmeye başlasın (perde 1,5 sn)
    import("../../components/PremiumAvatarCizim.jsx").catch(() => { /* çizilemezse ödül görseli kendi yedeğine düşer */ });
    const f = () => { yukle(); };
    window.addEventListener(OLAY, f);
    return () => {
      canli.current = false;
      window.removeEventListener(OLAY, f);
      clearTimeout(vurguZaman.current);
      clearTimeout(parlaZaman.current);
      cancelAnimationFrame(kaydirAnimId.current);
    };
  }, [yukle]);

  /** Yolu seviyeye `sure` ms'de kaydırır (kübik yavaşlama; hareketi azaltta anında). Bitince `bitti`. */
  const kaydirAnimli = useCallback((seviye, sure, bitti) => {
    const yol = yolRef.current;
    const el = yol?.querySelector(`[data-durak="${Math.max(1, seviye)}"]`);
    if (!yol || !el) { bitti?.(); return; }
    const hedef = Math.max(0, el.offsetLeft - (yol.clientWidth - el.offsetWidth) / 2);
    const bas = yol.scrollLeft;
    const fark = hedef - bas;
    if (azaltMi() || sure <= 0 || Math.abs(fark) < 2) { yol.scrollLeft = hedef; bitti?.(); return; }
    const t0 = performance.now();
    const adim = (t) => {
      const o = Math.min(1, (t - t0) / sure);
      yol.scrollLeft = bas + fark * (1 - (1 - o) ** 3);
      if (o < 1) kaydirAnimId.current = requestAnimationFrame(adim); else bitti?.();
    };
    kaydirAnimId.current = requestAnimationFrame(adim);
  }, []);

  // Açılış sırası (veri gelince bir kez): sezonun ilk açılışıysa önce tam perde, değilse hemen sayfa kayarak açılır
  useEffect(() => {
    if (!durum || durum.gorunur === false || acilisBasladi.current) return;
    acilisBasladi.current = true;
    if (!durum.test && perdeGerekliMi(userId, durum.sezon?.no)) setPerde(true);
    else setAcilis("oyna");
  }, [durum, userId]);

  // Sayfa açılırken (400 ms) yol mevcut seviyeye kayar; bitince o durak kısa parlar
  useEffect(() => {
    if (!durum || acilis !== "oyna" || kaydirildi.current || !yolRef.current) return;
    kaydirildi.current = true;
    const seviye = Math.max(1, Number(durum.seviye ?? 1));
    requestAnimationFrame(() => kaydirAnimli(seviye, ACILIS_MS, () => {
      if (!canli.current || azaltMi()) return;
      setParla(seviye);
      parlaZaman.current = setTimeout(() => { if (canli.current) setParla(null); }, PARLA_MS);
    }));
  }, [durum, acilis, kaydirAnimli]);

  const calistir = async (ad, fonk, yedek) => {
    if (islem) return;
    setIslem(ad);
    setIslemHata(null);
    try {
      await fonk();
    } catch (e) {
      if (canli.current) setIslemHata(hataMesaji(e, yedek));
    } finally {
      if (canli.current) setIslem(null);
    }
  };

  /** Ödül alındı: coin ise ses + üst çubuktaki coin çipine uçuş; değilse yalnız rozet sesi. Bakiye çipte kendiliğinden sayar. */
  const odulAlindi = (odul, yuvaAnahtar) => {
    const coin = odul?.tur === "coin" ? paraMiktari(odul) : 0;
    try { if (coin > 0) sesCoin(); else sesRozet(); } catch { /* ses yok */ }
    if (coin > 0) {
      const kaynak = document.querySelector(`[data-yuva="${yuvaAnahtar}"]`) ?? topluRef.current;
      setUcus({ kaynak });
    }
  };

  if (durum && durum.gorunur === false) return <BulunamadiPage kapaliMod kapaliOzellik />;

  if (!durum) {
    return (
      <div className="sy-sayfa" aria-busy={!hata}>
        {hata ? (
          <QtKart dolgu="b">
            <QtBosDurum ikon="uyari" ton="yanlis" baslik={tt("Sezon Yolu açılamadı")}
              metin={tt("Bağlantını kontrol edip tekrar dene.")}
              eylem={<QtDugme ikon="yenile" onClick={() => { setHata(false); yukle(); }}>{tt("Tekrar dene")}</QtDugme>} />
          </QtKart>
        ) : (
          <>
            <QtIskelet tur="kart" yukseklik="84px" />
            <QtIskelet tur="kart" yukseklik="72px" />
            <QtIskelet tur="kart" yukseklik="280px" />
          </>
        )}
      </div>
    );
  }

  const d = { ...durum, dil };
  const bpVar = Boolean(durum.bp?.aktif);
  const toplam = Number(durum.seviye_sayisi ?? 28);
  const oduller = Array.isArray(durum.oduller) ? durum.oduller : [];
  const harita = new Map(oduller.map((o) => [anahtar(o), o]));
  const tasma = durum.tasma;
  const alinabilirSayi = oduller.filter((o) => o.alinabilir && !o.alindi).length
    + (Number(tasma?.alinabilir_ucretsiz) || 0) + (Number(tasma?.alinabilir_ucretli) || 0);
  const seciliOdul = secili ? harita.get(secili) : null;
  const bonus = durum.bonus_gorev;
  const final = durum.final_unvan;
  const carpan = Number(durum.bp?.sp_carpan ?? 1).toLocaleString(dil === "en" ? "en-US" : "tr-TR");
  const tema = sezonTemasi(durum.sezon?.no);
  const finalOdul = harita.get(`${toplam}:ucretli`);

  const bpSatinAlOnay = async () => {
    const r = await bpSatinAl(userId);   // hata → sayfa içinde gösterilir (SatinAlSayfasi catch)
    try { sesSatinAlma(); } catch { /* ses yok */ }
    setSatinAlAcik(false);
    setSecili(null);
    setTasmaKol(null);
    setKutlama({ verilen: r?.verilen ?? [] });
  };
  const bpAcilsin = () => { setSecili(null); setTasmaKol(null); setSatinAlAcik(true); };

  const topluAl = () => calistir("toplu", async () => {
    const r = await bpTopluAl(userId);
    const liste = [...(Array.isArray(r?.verilen) ? r.verilen : []), ...(Array.isArray(r?.tasma_verilen) ? r.tasma_verilen : [])];
    const coin = liste.filter((o) => o.tur === "coin").reduce((t, o) => t + paraMiktari(o), 0);
    odulAlindi({ tur: coin > 0 ? "coin" : "diger", miktar: coin }, "toplu");
  }, tt("Ödüller alınamadı. Tekrar dener misin?"));

  return (
    <OdulKimlik.Provider value={{ profile }}>
    <div className={`sy-sayfa${acilis === "oyna" ? " sy-sayfa--ac" : " sy-sayfa--bekle"}`} ref={kabukRef}>
      <SezonHero durum={durum} tema={tema} finalOdul={finalOdul} toplam={toplam} testNotu={Boolean(durum.test)}
        onFinal={(o) => setSecili(anahtar(o))} />

      <QtKart dolgu="o" className="sy-kart-seviye">
        <SeviyeSatiri durum={durum} toplam={toplam} bpVar={bpVar} carpan={carpan} />
      </QtKart>

      <BpDugmesi durum={durum} bpVar={bpVar} onAl={() => setSatinAlAcik(true)} />

      {islemHata && <p className="sy-hata sy-hata--sayfa" role="alert">{islemHata}</p>}

      <section className="sy-yol-kutu" aria-label={tt("Sezon Yolu ödülleri")}>
        <YolSeridi durum={d} toplam={toplam} bpVar={bpVar} harita={harita} yeniAlinan={yeniAlinan} yeniAcilan={yeniAcilan}
          onSec={(o) => setSecili(anahtar(o))} onTasma={setTasmaKol} profile={profile} userId={userId} yolRef={yolRef} parla={parla} />
      </section>

      <div className="sy-yol-arac">
        <QtDugme tur="ikincil" boyut="k" ikon="ileri" onClick={() => kaydir(Math.max(1, durum.seviye), true)}>
          {tt("Seviyem")}
        </QtDugme>
        {alinabilirSayi > 0 && (
          <QtDugme boyut="k" ikon="hediye" className="sy-hepsini" yukleniyor={islem === "toplu"} devreDisi={Boolean(islem)}
            ref={topluRef} onClick={topluAl}>
            {tt("Hepsini al ({n})", { n: alinabilirSayi })}
          </QtDugme>
        )}
      </div>

      <SiradakiOdul durum={durum} toplam={toplam} harita={harita} dil={dil} onGit={(n) => kaydir(n, true)} />
      {!bpVar && <FaydaCipleri carpan={carpan} />}
      <Lejant />

      <div className="sy-notlar">
        <p className="sy-mac-sp qt-soluk">
          {tt("Bugün maçlardan: {n} / {m} SP", { n: sayiBicim(Number(durum.bugun_mac_sp ?? 0)), m: sayiBicim(Number(durum.gunluk_mac_tavan ?? 0)) })}
        </p>
        {bpVar && final?.anahtar && (
          <div className="sy-final">
            <span>{tt("Sezon unvanı")}</span>
            <UnvanYazisi metin={dil === "en" ? (final.ad_en || final.ad_tr) : final.ad_tr} tur="lig" boy="k" />
            <QtRozet boyut="k" ton={final.kazanildi ? "dogru" : "notr"} ikon={final.kazanildi ? "onay" : "kilit"}>
              {final.kazanildi ? tt("Kazanıldı") : tt("{n}. seviyede", { n: toplam })}
            </QtRozet>
          </div>
        )}
      </div>

      {bpVar && bonus && (
        <QtKart dolgu="o" className="sy-bonus">
          <div className="sy-bonus-ust">
            <span className="sy-bonus-ikon" aria-hidden="true"><QtIkon ad="bayrak" boyut={22} /></span>
            <div className="sy-bonus-ic">
              <b>{tt("Günlük bonus görev")}</b>
              <span className="qt-soluk">{tt("Bugün {n} maç oyna", { n: bonus.hedef })} · +{sayiBicim(Number(bonus.sp ?? 0))} SP</span>
            </div>
          </div>
          <QtIlerleme ton="dogru" deger={Math.min(Number(bonus.ilerleme ?? 0), Number(bonus.hedef ?? 1))} en={Math.max(1, Number(bonus.hedef ?? 1))}
            etiket={tt("Günlük görev ilerlemesi")} />
          <div className="sy-bonus-alt">
            <span className="qt-sayi">{Math.min(Number(bonus.ilerleme ?? 0), Number(bonus.hedef ?? 0))} / {bonus.hedef}</span>
            {bonus.alindi ? (
              <QtRozet ton="dogru" ikon="onay">{tt("Alındı")}</QtRozet>
            ) : (
              <QtDugme boyut="k" ikon="hediye" devreDisi={Number(bonus.ilerleme ?? 0) < Number(bonus.hedef ?? 0) || Boolean(islem)}
                yukleniyor={islem === "bonus"}
                onClick={() => calistir("bonus", () => bpBonusGorevAl(), tt("Görev ödülü alınamadı. Tekrar dener misin?"))}>
                {tt("Görevi al")}
              </QtDugme>
            )}
          </div>
        </QtKart>
      )}

      {durum.test && durum.sahip && (
        <QtKart dolgu="o" ton="duz" className="sy-testkutu">
          <b>{tt("Test modu")}</b>
          <p className="qt-soluk">{tt("Yalnız sahip görür; sistem kapalıyken test sezonunu dener.")}</p>
          <div className="sy-test-dugmeler">
            <QtDugme tur="ikincil" boyut="k" devreDisi={Boolean(islem)} onClick={() => calistir("test", () => sahipSpEkle(100), tt("SP eklenemedi."))}>+100 SP</QtDugme>
            <QtDugme tur="ikincil" boyut="k" devreDisi={Boolean(islem)} onClick={() => calistir("test", () => sahipSpEkle(500), tt("SP eklenemedi."))}>+500 SP</QtDugme>
            <QtDugme tur="tehlike" boyut="k" devreDisi={Boolean(islem)} onClick={() => calistir("test", () => sahipTestSifirla(userId), tt("Sıfırlanamadı."))}>{tt("Sıfırla")}</QtDugme>
          </div>
        </QtKart>
      )}

      {seciliOdul && (
        <OdulSayfasi key={secili} odul={seciliOdul} durum={d} dil={dil} userId={userId} profile={profile}
          onKapat={() => setSecili(null)} onBpAl={bpAcilsin} onAlindi={odulAlindi} />
      )}
      {tasmaKol && <TasmaSayfasi key={tasmaKol} kol={tasmaKol} durum={d} userId={userId} onKapat={() => setTasmaKol(null)} onBpAl={bpAcilsin} onAlindi={odulAlindi} />}
      {satinAlAcik && <SatinAlSayfasi durum={d} dil={dil} finalOdul={finalOdul} toplam={toplam} onOnay={bpSatinAlOnay} onKapat={() => setSatinAlAcik(false)} />}
      {kutlama && <Kutlama verilen={kutlama.verilen} profile={profile} userId={userId} onKapat={() => setKutlama(null)} />}
      {ucus && <SezonUcus kaynak={ucus.kaynak} onBitti={() => setUcus(null)} />}
      {perde && (
        <SezonAcilisPerdesi sezonNo={durum.sezon?.no} finalOdul={finalOdul} tema={tema} dil={dil} userId={userId}
          onKapat={() => { setPerde(false); setAcilis("oyna"); }} />
      )}
    </div>
    </OdulKimlik.Provider>
  );
}
