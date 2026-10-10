// ============================================================
// SEZON YOLU (Battle Pass, 720) — /sezon-yolu tam ekran sayfası.
// Bütün sayılar ve "alınabilir / alındı" kararı SUNUCUDAN gelir (oyun/lib/sezonYolu.js); istemci hesap yapmaz,
// ödül vermez — yalnız RPC çağırır ve cevabı çizer. Sistem kapalıysa (gorunur=false) "Bu bölüm şu an kapalı" +
// ana sayfaya replace. Sahip için kapalı sistemde test sezonu görünür (durum.test) ve test araçları açılır.
// Bu dosya yalnız DURUM + akış (yükle/al/satın al); görünüm parçaları yan dosyalarda:
//   SezonUst.jsx (seviye çubuğu, bonus satırı, BP düğmesi) · Yol.jsx (dikey iki şeritli yol) · SiradakiOdul.jsx
//   OdulSayfasi.jsx (önizleme) · TasmaSayfasi.jsx (28+) · SatinAlSayfasi.jsx · Kutlama.jsx · SezonUcus.jsx (coin uçuşu)
// SAHNE (1 Eki 2026): sayfa bir "web sayfası" değil TAM EKRAN OYUN SAHNESİ (QtSahne): uygulama üst çubuğu + alt menü gizli, ekran kilitli;
//   üst şerit "Sezon Yolu" · sabit üst: sezon afişi ("Sezon N · X gün kaldı" + sezon sonu ödülü) + seviye + SP çubuğu + iki sütun başlığı · tek kaydırılan odak: DİKEY yol ·
//   sabit alt: sıradaki büyük ödül kartı + (BP) günlük bonus + tek büyük düğme (alınabilir ödül → "Ödülleri al (n)"; yoksa ve BP yoksa altın "Battle Pass al"). Sezon teması arka plan çizmez (zemin düz); tema yalnız ilk açılış perdesinde.
// Hareketi azalt: patlama/parlama/uçuş sadeleşir (oyun/tasarim/yumusakHareket.js; CSS @media); yol mevcut seviyeye anında gelir.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { QtKart, QtDugme, QtIkon, QtBosDurum, QtIskelet, QtSahne, dokunus, sayiBicim } from "../index.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { tt } from "../../lib/dil.js";
import { useDil } from "../../lib/dilKanca.js";
import { hataMesaji } from "../../lib/hata.js";
import { sesCoin, sesRozet, sesSatinAlma } from "../../lib/ses.js";
import { sezonDurumu, bpSatinAl, bpOdulAl, bpTopluAl, bpBonusGorevAl, sahipSpEkle, sahipTestSifirla } from "../../lib/sezonYolu.js";
import UnvanYazisi from "../../components/UnvanYazisi.jsx";
import BulunamadiPage from "../../pages/BulunamadiPage.jsx";
import { sezonTemasi } from "./sezonTemalari.jsx";
import { SeviyeUst, BonusSatiri, BpAlDugmesi } from "./SezonUst.jsx";
import DikeyYol from "./Yol.jsx";
import SiradakiOdul from "./SiradakiOdul.jsx";
import OdulSayfasi from "./OdulSayfasi.jsx";
import TasmaSayfasi from "./TasmaSayfasi.jsx";
import SatinAlSayfasi from "./SatinAlSayfasi.jsx";
import Kutlama from "./Kutlama.jsx";
import SezonUcus from "./SezonUcus.jsx";
import { odulPatlat, kisaKonfeti, titret } from "../sahne/OdulPatlamasi.jsx";
import SezonAcilisPerdesi from "./SezonAcilisPerdesi.jsx";
import { ACILIS_MS, PARLA_MS, azaltMi, perdeGerekliMi } from "./acilis.js";
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
  // BP tanıtım penceresi (ana sayfa) "Battle Pass al" ile gelirse satın alma sayfası bir kez kendiliğinden açılır
  const konumBp = useLocation().state?.bpSatinAl === true;
  const bpOtoRef = useRef(false);
  useEffect(() => {
    if (konumBp && !bpOtoRef.current && durum?.gorunur && !durum?.bp?.aktif) { bpOtoRef.current = true; setSatinAlAcik(true); }
  }, [konumBp, durum]);
  const [kutlama, setKutlama] = useState(null);        // { verilen }
  const [ucus, setUcus] = useState(null);              // { kaynak } — coin uçuşu
  const [yeniAcilan, setYeniAcilan] = useState(() => new Set());
  const [yeniAlinan, setYeniAlinan] = useState(() => new Set());
  const [islem, setIslem] = useState(null);            // "toplu" | "bonus" | "test" | "tek:<seviye>:<kol>"
  const [islemHata, setIslemHata] = useState(null);
  const yolRef = useRef(null);
  const topluRef = useRef(null);
  const istek = useRef(0);
  const canli = useRef(true);
  const onceki = useRef(null);
  const kaydirildi = useRef(false);
  const vurguZaman = useRef(null);
  const acilisBasladi = useRef(false);
  const kaydirAnimId = useRef(0);
  const parlaZaman = useRef(null);
  const [acilis, setAcilis] = useState("bekle");   // "bekle": veri/perde bekleniyor · "oyna": yol mevcut seviyeye kayar (sahnenin girişi QtSahne'de)
  const [perde, setPerde] = useState(false);       // sezonun ilk açılışı: tam perde
  const [parla, setParla] = useState(null);        // açılışta parlayan durak (mevcut seviye)

  /** Satırı (seviye) kaydırılan bölgenin ORTASINA getiren scrollTop (yol = QtSahne'nin kaydırılan bölgesi). */
  const ortaHedef = (yol, el) => {
    const yr = yol.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const azami = Math.max(0, yol.scrollHeight - yol.clientHeight);
    return Math.min(azami, Math.max(0, yol.scrollTop + (er.top - yr.top) - (yol.clientHeight - er.height) / 2));
  };

  const kaydir = useCallback((seviye, yumusak) => {
    const yol = yolRef.current;
    const el = yol?.querySelector(`[data-durak="${seviye === "tasma" ? "tasma" : Math.max(1, seviye)}"]`);
    if (!yol || !el) return;
    const ust = ortaHedef(yol, el);
    try { yol.scrollTo({ top: ust, behavior: yumusak && !azaltMi() ? "smooth" : "auto" }); } catch { yol.scrollTop = ust; }
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
    const hedef = ortaHedef(yol, el);
    const bas = yol.scrollTop;
    const fark = hedef - bas;
    if (azaltMi() || sure <= 0 || Math.abs(fark) < 2) { yol.scrollTop = hedef; bitti?.(); return; }
    const t0 = performance.now();
    const adim = (t) => {
      const o = Math.min(1, (t - t0) / sure);
      yol.scrollTop = bas + fark * (1 - (1 - o) ** 3);
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

  // Sahne açılırken (400 ms) yol mevcut seviyeyi ekranın ORTASINA getirir (hareketi azaltta anında); bitince o düğüm kısa parlar
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

  /** Ödül alındı (10 Eki 2026, ortak ödül anı): coin/elmas ise kutudan sahnedeki coin hapına 7 ikon uçar + kısa konfeti + titreşim;
   *  diğer ödüllerde kutunun üstünde kısa konfeti + titreşim. Bakiye hapta eski değerden yeniye sayar (coinTazele, sezonYolu.js). */
  const odulAlindi = (odul, yuvaAnahtar, kisa = false) => {
    const para = (odul?.tur === "coin" || odul?.tur === "elmas") ? paraMiktari(odul) : 0;
    try { if (para > 0) sesCoin(); else sesRozet(); } catch { /* ses yok */ }
    const kaynak = document.querySelector(`[data-yuva="${yuvaAnahtar}"]`) ?? topluRef.current;
    if (para > 0) return odulPatlat({ kaynak, tur: odul.tur, kisa });
    const r = kaynak?.getBoundingClientRect?.();
    if (r) kisaKonfeti({ x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }, kisa ? 18 : 30);
    titret(30);
    return Promise.resolve();
  };

  if (durum && durum.gorunur === false) return <BulunamadiPage kapaliMod kapaliOzellik />;

  if (!durum) {
    // Ağaç biçimi yüklü hâlle AYNI (Provider › QtSahne): veri gelince sahne yeniden kurulmaz, giriş geçişi ikinci kez oynamaz
    return (
      <OdulKimlik.Provider value={{ profile }}>
      <QtSahne baslik={tt("Sezon Yolu")} className="sy-sahne" aria-busy={!hata}>
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
      </QtSahne>
      </OdulKimlik.Provider>
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
  const tema = sezonTemasi(durum.sezon?.no);
  const finalOdul = harita.get(`${toplam}:ucretli`);
  // "Sıradaki ödül ne zaman": sunucunun eşiklerinden (yalnız gösterim) — bir sonraki seviye ve ona kalan SP
  const sonrakiOdulSeviye = durum.sonraki_esik == null ? null : Number(durum.seviye ?? 0) + 1;
  const sonrakiOdulSp = Math.max(0, Number(durum.sonraki_esik ?? 0) - Number(durum.sp ?? 0));

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
    dokunus();
    const r = await bpTopluAl(userId);
    const liste = [...(Array.isArray(r?.verilen) ? r.verilen : []), ...(Array.isArray(r?.tasma_verilen) ? r.tasma_verilen : [])];
    // Birden çok ödül: kutudan kutuya SIRAYLA ve kısa (en çok 6 an); bakiye zaten sunucudaki tek doğru değere sayar
    const anlar = liste.slice(0, 6);
    for (const o of anlar) {
      const yuva = o.seviye != null && o.kol ? `${o.seviye}:${o.kol}` : "toplu";
      await odulAlindi(o, yuva, anlar.length > 1);
    }
  }, tt("Ödüller alınamadı. Tekrar dener misin?"));

  /** Yoldaki alınabilir kutuya tek dokunuş: mevcut bp_odul_al. Ses/uçuş yalnız sunucu başarı cevabından sonra (hata → kutlama yok). */
  const tekAl = (odul) => calistir(`tek:${anahtar(odul)}`, async () => {
    dokunus();
    const r = await bpOdulAl(odul.seviye, odul.kol, userId);
    odulAlindi(r?.odul ?? odul, anahtar(odul));
  }, tt("Ödül alınamadı. Tekrar dener misin?"));

  const bonusAl = () => calistir("bonus", async () => {
    dokunus();
    await bpBonusGorevAl();
    try { sesRozet(); } catch { /* ses yok */ }
  }, tt("Görev ödülü alınamadı. Tekrar dener misin?"));

  // 28. seviye satırının (özel geniş kutu) içindeki sezon unvanı — ayrı satır/şerit değil
  const finalUnvan = final?.anahtar ? (
    <div className="sy-final-unvan">
      <span className="sy-final-unvan-etiket">{tt("Sezon unvanı")}</span>
      <UnvanYazisi metin={dil === "en" ? (final.ad_en || final.ad_tr) : final.ad_tr} tur="lig" boy="k" />
      {final.kazanildi
        ? <span className="sy-final-unvan-durum"><QtIkon ad="onay" boyut={12} />{tt("Kazanıldı")}</span>
        : !bpVar && <span className="sy-final-unvan-durum" role="img" aria-label={tt("Bu ödül için Battle Pass gerekir.")}><QtIkon ad="kilit" boyut={12} /></span>}
    </div>
  ) : null;

  return (
    <OdulKimlik.Provider value={{ profile }}>
      <QtSahne className="sy-sahne" govdeRef={yolRef}
        baslik={tt("Sezon Yolu")}
        ust={<SeviyeUst durum={durum} finalOdul={finalOdul} dil={dil} onFinal={(o) => setSecili(anahtar(o))}
          sirada={<SiradakiOdul kompakt durum={durum} toplam={toplam} harita={harita} dil={dil} onGit={(n) => kaydir(n, true)} />} />}
        alt={(
          <>
            {islemHata && <p className="sy-hata sy-hata--sayfa" role="alert">{islemHata}</p>}
            {bpVar && bonus && <BonusSatiri bonus={bonus} islemde={islem === "bonus"} mesgul={Boolean(islem)} onAl={bonusAl} />}
            {/* Tek büyük düğme (10 Eki 2026): alınabilir ödül varsa TURUNCU nabızlı "Ödülleri al (n)"; yoksa sade bilgi şeridi "sıradaki ödül ne zaman"
                (silik/devre dışı düğme değil); BP yoksa altın "Battle Pass al". Sıradaki büyük ödül hero'ya taşındı. */}
            {alinabilirSayi > 0 ? (
              <QtDugme tamGenislik ikon="hediye" className="sy-hepsini sy-hepsini--nabiz" yukleniyor={islem === "toplu"} devreDisi={Boolean(islem)}
                ref={topluRef} onClick={topluAl}>
                {tt("Ödülleri al ({n})", { n: alinabilirSayi })}
              </QtDugme>
            ) : bpVar && (
              <p className="sy-sonraki-bilgi" role="status" ref={topluRef}>
                <QtIkon ad="hediye" boyut={16} />
                {sonrakiOdulSeviye == null ? tt("Bütün ödüller alındı")
                  : tt("Sıradaki ödül: Sv {n} · {sp} SP kaldı", { n: sonrakiOdulSeviye, sp: sayiBicim(sonrakiOdulSp) })}
              </p>
            )}
            {!bpVar && <BpAlDugmesi durum={durum} onAl={bpAcilsin} />}
          </>
        )}>
        <DikeyYol durum={d} toplam={toplam} bpVar={bpVar} harita={harita} yeniAlinan={yeniAlinan} yeniAcilan={yeniAcilan}
          mesgul={Boolean(islem)} onSec={(o) => setSecili(anahtar(o))} onAl={tekAl} onTasma={setTasmaKol} parla={parla} finalUnvan={finalUnvan} />

        {/* Sahibin test araçları: yalnız sahipte (test sezonu), yolun sonunda küçük katlanır alan — sahnenin sabit yuvalarına girmez */}
        {durum.test && durum.sahip && (
          <details className="sy-test">
            <summary>{tt("Test modu")}</summary>
            <p className="qt-soluk-zemin">{tt("Test sezonu · yalnız sen görüyorsun")}</p>
            <div className="sy-test-dugmeler">
              <QtDugme tur="ikincil" boyut="k" devreDisi={Boolean(islem)} onClick={() => calistir("test", () => sahipSpEkle(100), tt("SP eklenemedi."))}>+100 SP</QtDugme>
              <QtDugme tur="ikincil" boyut="k" devreDisi={Boolean(islem)} onClick={() => calistir("test", () => sahipSpEkle(500), tt("SP eklenemedi."))}>+500 SP</QtDugme>
              <QtDugme tur="tehlike" boyut="k" devreDisi={Boolean(islem)} onClick={() => calistir("test", () => sahipTestSifirla(userId), tt("Sıfırlanamadı."))}>{tt("Sıfırla")}</QtDugme>
            </div>
          </details>
        )}
      </QtSahne>

      {/* Alt sayfalar, kutlama, coin uçuşu ve ilk açılış perdesi sahnenin DIŞINDA: sabit katmanlar hareketli atanın içine girmez (iOS) */}
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
    </OdulKimlik.Provider>
  );
}
