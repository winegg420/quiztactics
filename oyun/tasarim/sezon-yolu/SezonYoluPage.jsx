// ============================================================
// SEZON YOLU (Battle Pass, 720) — /sezon-yolu tam ekran sayfası.
// Yatay kaydırılan TEK SIRA yol: üstte ÜCRETSİZ kol, ortada numaralı duraklar, altta ÜCRETLİ (Battle Pass) kol.
// Bütün sayılar ve "alınabilir / alındı" kararı SUNUCUDAN gelir (oyun/lib/sezonYolu.js); istemci hesap yapmaz,
// ödül vermez — yalnız RPC çağırır ve cevabı çizer. Sistem kapalıysa (gorunur=false) "Bu bölüm şu an kapalı" +
// ana sayfaya replace. Sahip için kapalı sistemde test sezonu görünür (durum.test) ve test araçları açılır.
// Hareketi azalt: patlama/parlama kapanır, kalan hareket yumuşar (oyun/tasarim/yumusakHareket.js; CSS @media).
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { QtKart, QtDugme, QtIlerleme, QtRozet, QtModal, QtIkon, QtBosDurum, QtIskelet, sayiBicim } from "../index.js";
import { UnvanSimge } from "../gorsel-revizyon/b/cizim/unvan.jsx";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { tt } from "../../lib/dil.js";
import { useDil } from "../../lib/dilKanca.js";
import { hataMesaji } from "../../lib/hata.js";
import {
  sezonDurumu, bpSatinAl, bpOdulAl, bpTopluAl, bpBonusGorevAl, sahipSpEkle, sahipTestSifirla, odulAdi,
} from "../../lib/sezonYolu.js";
import { KOZMETIK_TANIMLARI, TEPKI_TANIMLARI, tepkiGorseli } from "../../lib/kozmetik.js";
import { CoinIkon, ElmasIkon } from "../../components/ParaIkonlari.jsx";
import SkillRozeti from "../../components/SkillRozeti.jsx";
import UnvanYazisi from "../../components/UnvanYazisi.jsx";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import { AltinIsim } from "../../components/IsimEfekti.jsx";
import BulunamadiPage from "../../pages/BulunamadiPage.jsx";
import "./sezon-yolu.css";

const OLAY = "bildim-sezon-degisti";   // sezonYolu.js her işlemden sonra yayar (maç sonu da)
const VURGU_MS = 1600;                 // açılma/dolma vurgusunun süresi
const anahtar = (o) => `${o.seviye}:${o.kol}`;

const azaltMi = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

/** Sunucu hata mesajı → oyuncunun dilinde (bilinmeyen mesajlar hataMesaji'nda ttSunucu'dan geçer). */
const hataYaz = (e, yedek) => hataMesaji(e, yedek);

/** Ödül görseli: coin/elmas/joker/tepki/unvan için mevcut bileşenler; placeholder'da gerçek görsel YOK, "?". */
function OdulGorsel({ odul, boyut = 36 }) {
  if (!odul) return null;
  const v = odul.veri ?? {};
  if (odul.placeholder) return <span className="sy-soru" style={{ "--sy-b": `${boyut}px` }} aria-hidden="true">?</span>;
  switch (odul.tur) {
    case "coin": return <CoinIkon boyut={boyut} />;
    case "elmas": return <ElmasIkon boyut={boyut} />;
    case "joker": return <SkillRozeti tur={v.tur} boyut={boyut} />;
    case "tepki_paketi": {
      const liste = (KOZMETIK_TANIMLARI[v.anahtar]?.tepkiler ?? []).filter((k) => TEPKI_TANIMLARI[k]).slice(0, 4);
      if (!liste.length) return <QtIkon ad="gulen" boyut={Math.round(boyut * 0.8)} />;
      const k = Math.round(boyut / 2) - 1;
      return (
        <span className="sy-tepkiler" style={{ "--sy-k": `${k}px` }} aria-hidden="true">
          {liste.map((t) => <img key={t} src={tepkiGorseli(t)} alt="" width={k} height={k} loading="lazy" decoding="async" draggable="false" />)}
        </span>
      );
    }
    case "unvan": return <UnvanSimge tur="basari" boyut={Math.round(boyut * 0.9)} />;
    case "avatar": return <QtIkon ad="kisi" boyut={Math.round(boyut * 0.8)} />;
    case "cerceve": return <QtIkon ad="madalya" boyut={Math.round(boyut * 0.8)} />;
    default: return <QtIkon ad="hediye" boyut={Math.round(boyut * 0.8)} />;
  }
}

/** Yuvanın altındaki kısa yazı (sayı ya da tür). */
function kisaYazi(o) {
  const v = o.veri ?? {};
  if (o.placeholder) return tt("Yakında");
  if (o.tur === "coin" || o.tur === "elmas") return sayiBicim(Number(v.miktar ?? 0));
  if (o.tur === "joker") return `×${Number(v.adet ?? 1)}`;
  if (o.tur === "tepki_paketi") return tt("Tepki");
  if (o.tur === "unvan") return tt("Unvan");
  if (o.tur === "avatar") return tt("Avatar");
  if (o.tur === "cerceve") return tt("Çerçeve");
  return "";
}

const NADIR_ADI = { siradan: "Sıradan", nadir: "Nadir", epik: "Epik", efsanevi: "Efsanevi" };

function Yuva({ odul, durum, yeniAlindi, yeniAcildi, bpVar, onSec }) {
  const acik = odul.seviye <= durum.seviye;
  const bpKilit = odul.kol === "ucretli" && !bpVar;
  const s = odul.alindi ? "alindi" : odul.alinabilir ? "alinabilir" : "kilitli";
  const bitis = odul.seviye === durum.seviye_sayisi;
  const d = [
    "sy-yuva", `sy-yuva--${odul.kol}`, `sy-yuva--${s}`,
    acik && "sy-yuva--acik", bpKilit && "sy-yuva--bp-kilit", bitis && "sy-yuva--final",
    yeniAlindi && "sy-yuva--doldu", yeniAcildi && "sy-yuva--acildi",
  ].filter(Boolean).join(" ");
  const kolAdi = odul.kol === "ucretli" ? tt("Battle Pass kolu") : tt("Ücretsiz kol");
  const durumYazi = odul.alindi ? tt("alındı") : odul.alinabilir ? tt("alınabilir") : tt("kilitli");
  return (
    <button type="button" className={d} data-nadirlik={odul.nadirlik ?? undefined}
      aria-label={`${tt("{n}. seviye", { n: odul.seviye })}, ${kolAdi}: ${odul.placeholder ? tt("Yakında") : odulAdi(odul, durum.dil)}, ${durumYazi}`}
      onClick={() => onSec(odul)}>
      <span className="sy-yuva-gorsel"><OdulGorsel odul={odul} boyut={bitis ? 48 : 36} /></span>
      <span className="sy-yuva-yazi">{kisaYazi(odul)}</span>
      {odul.alindi && <span className="sy-yuva-rozet sy-yuva-rozet--alindi" aria-hidden="true"><QtIkon ad="onay" boyut={12} /></span>}
      {!odul.alindi && odul.alinabilir && <span className="sy-yuva-rozet sy-yuva-rozet--al" aria-hidden="true"><QtIkon ad="hediye" boyut={12} /></span>}
      {!odul.alindi && !odul.alinabilir && bpKilit && <span className="sy-yuva-rozet sy-yuva-rozet--kilit" aria-hidden="true"><QtIkon ad="kilit" boyut={12} /></span>}
    </button>
  );
}

/** Ödül alt sayfası: adı/görseli, "Al" (hak edilmiş ve alınmamışsa), kilit nedeni. */
function OdulSayfasi({ odul, durum, dil, userId, onKapat, onBpAl }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const canli = useRef(true);
  useEffect(() => { canli.current = true; return () => { canli.current = false; }; }, []);
  const bpVar = Boolean(durum.bp?.aktif);
  const ucretli = odul.kol === "ucretli";
  const seviyeYok = odul.seviye > durum.seviye;
  const kalanSp = seviyeYok ? Math.max(0, Number(durum.esikler?.[odul.seviye - 1] ?? 0) - Number(durum.sp ?? 0)) : 0;
  const nedenler = [];
  if (!odul.alindi && !odul.alinabilir) {
    if (seviyeYok) nedenler.push(tt("{n}. seviyeye ulaşınca açılır. Kalan: {sp} SP", { n: odul.seviye, sp: sayiBicim(kalanSp) }));
    if (ucretli && !bpVar) nedenler.push(tt("Bu ödül için Battle Pass gerekir."));
  }
  const ad = odulAdi(odul, dil);
  const al = async () => {
    if (calisiyor) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await bpOdulAl(odul.seviye, odul.kol, userId);
      onKapat();
    } catch (e) {
      if (canli.current) setHata(hataYaz(e, tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      if (canli.current) setCalisiyor(false);
    }
  };
  return (
    <QtModal acik tur="altSayfa" onKapat={calisiyor ? undefined : onKapat} ortuKapatir={!calisiyor} baslik={ad}
      aciklama={tt("{n}. seviye · {kol}", { n: odul.seviye, kol: ucretli ? tt("Battle Pass kolu") : tt("Ücretsiz kol") })}
      altlik={
        <div className="sy-alt-dugmeler">
          {odul.alinabilir && !odul.alindi ? (
            <QtDugme tamGenislik boyut="b" ikon="hediye" onClick={al} yukleniyor={calisiyor} devreDisi={calisiyor} data-qt-ilk-odak>
              {calisiyor ? tt("Alınıyor…") : tt("Ödülü al")}
            </QtDugme>
          ) : ucretli && !bpVar ? (
            <QtDugme tamGenislik boyut="b" onClick={onBpAl} data-qt-ilk-odak>
              {tt("Battle Pass Al · {n} elmas", { n: sayiBicim(Number(durum.bp?.fiyat ?? 0)) })}
            </QtDugme>
          ) : (
            <QtDugme tamGenislik tur="ikincil" onClick={onKapat} data-qt-ilk-odak>{tt("Kapat")}</QtDugme>
          )}
        </div>
      }>
      <div className="sy-sayfa-ic">
        <span className={`sy-buyuk sy-buyuk--${odul.kol}`} data-nadirlik={odul.nadirlik ?? undefined}><OdulGorsel odul={odul} boyut={64} /></span>
        <div className="sy-etiketler">
          {odul.placeholder && <QtRozet ton="uyari" ikon="saat">{tt("Yakında")}</QtRozet>}
          {odul.nadirlik && <span className="sy-nadir" data-nadirlik={odul.nadirlik}>{tt(NADIR_ADI[odul.nadirlik] ?? "Sıradan")}</span>}
          {odul.alindi && <QtRozet ton="dogru" ikon="onay">{tt("Alındı")}</QtRozet>}
        </div>
        {odul.placeholder && <p className="sy-not">{tt("Bu ödül yakında eklenecek. Görseli açıklanınca burada görünür.")}</p>}
        {odul.tur === "unvan" && !odul.placeholder && <UnvanYazisi metin={ad} tur="basari" boy="o" />}
        {nedenler.length > 0 && (
          <ul className="sy-neden" role="status">
            {nedenler.map((n) => <li key={n}><QtIkon ad="kilit" boyut={16} /><span>{n}</span></li>)}
          </ul>
        )}
        {hata && <p className="sy-hata" role="alert">{hata}</p>}
      </div>
    </QtModal>
  );
}

const AVANTAJLAR = [
  ["hediye", "Geriye dönük ücretli ödüller: ulaştığın bütün seviyelerin ödülü hemen düşer"],
  ["yildiz", "Sezon boyunca altın isim"],
  ["madalya", "Avatar çerçevende altın halka"],
  ["hizli", "SP ×{c}: seviyeler daha hızlı dolar"],
  ["bayrak", "Günlük bonus görev"],
  ["kupa", "28/28'de sezona özel unvan"],
  ["ates", "Özel zafer efekti"],
];

/** Battle Pass satın alma onayı (alt sayfa). Karar ve bakiye kontrolü sunucuda; burada yalnız gösterilir. */
function SatinAlSayfasi({ durum, dil, onOnay, onKapat }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const canli = useRef(true);
  useEffect(() => { canli.current = true; return () => { canli.current = false; }; }, []);
  const fiyat = Number(durum.bp?.fiyat ?? 0);
  const elmas = durum.elmas == null ? null : Number(durum.elmas);
  const yeterli = elmas == null || elmas >= fiyat;
  const carpan = Number(durum.bp?.sp_carpan ?? 1).toLocaleString(dil === "en" ? "en-US" : "tr-TR");
  const onayla = async () => {
    if (calisiyor || !yeterli) return;
    setCalisiyor(true);
    setHata(null);
    try {
      await onOnay();
    } catch (e) {
      if (canli.current) setHata(hataYaz(e, tt("Battle Pass alınamadı. Tekrar dener misin?")));
    } finally {
      if (canli.current) setCalisiyor(false);
    }
  };
  return (
    <QtModal acik tur="altSayfa" onKapat={calisiyor ? undefined : onKapat} ortuKapatir={!calisiyor}
      baslik={tt("Battle Pass")} aciklama={tt("Sezon {n} boyunca geçerli", { n: durum.sezon?.no ?? "" })}
      altlik={
        <div className="sy-alt-dugmeler sy-alt-dugmeler--iki">
          <QtDugme tur="ikincil" onClick={onKapat} devreDisi={calisiyor}>{tt("Vazgeç")}</QtDugme>
          <QtDugme onClick={onayla} devreDisi={!yeterli || calisiyor} yukleniyor={calisiyor} data-qt-ilk-odak>
            {calisiyor ? tt("Alınıyor…") : tt("Satın al")}
          </QtDugme>
        </div>
      }>
      <div className="sy-sayfa-ic">
        <ul className="sy-avantaj">
          {AVANTAJLAR.map(([ikon, metin]) => (
            <li key={ikon}><span className="sy-avantaj-ikon"><QtIkon ad={ikon} boyut={18} /></span><span>{tt(metin, { c: carpan })}</span></li>
          ))}
        </ul>
        <div className="sy-fiyat">
          <span>{tt("Fiyat")}</span>
          <b className="sy-elmas"><ElmasIkon boyut={22} /> {sayiBicim(fiyat)}</b>
        </div>
        {elmas != null && (
          <div className={`sy-fiyat${yeterli ? "" : " sy-fiyat--yetmez"}`}>
            <span>{tt("Bakiyen")}</span>
            <b className="sy-elmas"><ElmasIkon boyut={22} /> {sayiBicim(elmas)}</b>
          </div>
        )}
        {!yeterli && (
          <p className="sy-hata" role="alert">{tt("Elmasın yetmiyor: {0} gerekli, {1} var", { 0: sayiBicim(fiyat), 1: sayiBicim(elmas) })}</p>
        )}
        {hata && <p className="sy-hata" role="alert">{hata}</p>}
      </div>
    </QtModal>
  );
}

/** Satın alma kutlaması: isim altın olur, avatara altın halka biner (CerceveliAvatar sezonBp), geriye dönük ödüller sırayla düşer. */
function Kutlama({ verilen, profile, userId, onKapat }) {
  const [altin, setAltin] = useState(false);
  const azalt = azaltMi();
  useEffect(() => {
    const t = setTimeout(() => setAltin(true), azalt ? 200 : 650);
    return () => clearTimeout(t);
  }, [azalt]);
  const ad = profile?.gorunen_ad ?? "";
  const liste = (Array.isArray(verilen) ? verilen : []).slice(0, 12);
  const fazla = Math.max(0, (Array.isArray(verilen) ? verilen.length : 0) - liste.length);
  return (
    <QtModal acik baslik={tt("Battle Pass aktif!")} aciklama={tt("Altın isim ve altın halka artık sende.")} onKapat={onKapat}
      altlik={<QtDugme tamGenislik onClick={onKapat} data-qt-ilk-odak>{tt("Harika")}</QtDugme>}>
      <div className="sy-kutlama" data-yumusak>
        <div className="sy-kutlama-sahne">
          <span className="sy-dalga" aria-hidden="true" />
          <CerceveliAvatar profile={profile} userId={userId} boyut={96} hareketli sezonBp />
        </div>
        <div className="sy-kutlama-isim">
          {altin ? <AltinIsim hareketli>{ad}</AltinIsim> : <span>{ad}</span>}
        </div>
        {liste.length > 0 && (
          <>
            <p className="sy-not">{tt("Geriye dönük ödüllerin:")}</p>
            <ul className="sy-dusen" aria-label={tt("Verilen ödüller")}>
              {liste.map((o, i) => (
                <li key={`${o.seviye}:${o.kol}:${i}`} className="sy-dus" style={{ animationDelay: `${i * 110}ms` }}>
                  <OdulGorsel odul={o} boyut={30} />
                  <span>{kisaYazi(o)}</span>
                </li>
              ))}
              {fazla > 0 && <li className="sy-dus sy-dus--fazla" style={{ animationDelay: `${liste.length * 110}ms` }}>+{fazla}</li>}
            </ul>
          </>
        )}
      </div>
    </QtModal>
  );
}

export default function SezonYoluPage() {
  const { user, profile } = useAuth();
  const { dil } = useDil();
  const userId = user?.id ?? profile?.id ?? null;
  const [durum, setDurum] = useState(null);
  const [hata, setHata] = useState(false);
  const [secili, setSecili] = useState(null);          // açık ödül alt sayfası (anahtar)
  const [satinAlAcik, setSatinAlAcik] = useState(false);
  const [kutlama, setKutlama] = useState(null);        // { verilen }
  const [yeniAcilan, setYeniAcilan] = useState(() => new Set());
  const [yeniAlinan, setYeniAlinan] = useState(() => new Set());
  const [islem, setIslem] = useState(null);            // "toplu" | "bonus" | "test"
  const [islemHata, setIslemHata] = useState(null);
  const yolRef = useRef(null);
  const istek = useRef(0);
  const canli = useRef(true);
  const onceki = useRef(null);
  const kaydirildi = useRef(false);
  const vurguZaman = useRef(null);

  const kaydir = useCallback((seviye, yumusak) => {
    const yol = yolRef.current;
    const el = yol?.querySelector(`[data-durak="${Math.max(1, seviye)}"]`);
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
    const f = () => { yukle(); };
    window.addEventListener(OLAY, f);
    return () => {
      canli.current = false;
      window.removeEventListener(OLAY, f);
      clearTimeout(vurguZaman.current);
    };
  }, [yukle]);

  // İlk yüklemede mevcut seviyeye otomatik kaydır
  useEffect(() => {
    if (!durum || kaydirildi.current || !yolRef.current) return;
    kaydirildi.current = true;
    requestAnimationFrame(() => kaydir(Math.max(1, Number(durum.seviye ?? 1)), false));
  }, [durum, kaydir]);

  const calistir = async (ad, fonk, yedek) => {
    if (islem) return;
    setIslem(ad);
    setIslemHata(null);
    try {
      await fonk();
    } catch (e) {
      if (canli.current) setIslemHata(hataYaz(e, yedek));
    } finally {
      if (canli.current) setIslem(null);
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
            <QtIskelet tur="kart" yukseklik="180px" />
            <QtIskelet tur="kart" yukseklik="300px" />
          </>
        )}
      </div>
    );
  }

  const d = { ...durum, dil };
  const bpVar = Boolean(durum.bp?.aktif);
  const toplam = Number(durum.seviye_sayisi ?? 28);
  const son = durum.sonraki_esik == null;
  const oduller = Array.isArray(durum.oduller) ? durum.oduller : [];
  const harita = new Map(oduller.map((o) => [anahtar(o), o]));
  const alinabilirSayi = oduller.filter((o) => o.alinabilir && !o.alindi).length;
  const seciliOdul = secili ? harita.get(secili) : null;
  const ustEsik = Number(durum.onceki_esik ?? 0);
  const ilerDeger = Math.max(0, Number(durum.sp ?? 0) - ustEsik);
  const ilerEn = son ? 1 : Math.max(1, Number(durum.sonraki_esik) - ustEsik);
  const bonus = durum.bonus_gorev;
  const final = durum.final_unvan;
  const carpan = Number(durum.bp?.sp_carpan ?? 1).toLocaleString(dil === "en" ? "en-US" : "tr-TR");
  const kalanGun = Number(durum.sezon?.kalan_gun ?? 0);
  const duraklar = Array.from({ length: toplam }, (_, i) => i + 1);
  const gorunenAd = profile?.gorunen_ad ?? "";

  const bpSatinAlOnay = async () => {
    const r = await bpSatinAl(userId);   // hata → sayfa içinde gösterilir (SatinAlSayfasi catch)
    setSatinAlAcik(false);
    setSecili(null);
    setKutlama({ verilen: r?.verilen ?? [] });
  };

  return (
    <div className="sy-sayfa">
      <QtKart dolgu="o" className="sy-ust">
        <div className="sy-ust-baslik">
          <div className="sy-baslik-blok">
            <h1 className="qt-baslik-1">{tt("Sezon Yolu")}</h1>
            <span className="sy-sezon qt-soluk">{tt("Sezon {n}", { n: durum.sezon?.no ?? "" })}</span>
          </div>
          <QtRozet ton="bilgi" ikon="saat">
            {kalanGun <= 0 ? tt("Bugün bitiyor") : tt("{n} gün kaldı", { n: kalanGun })}
          </QtRozet>
        </div>

        {durum.test && (
          <p className="sy-test-not" role="note">{tt("Test sezonu: yalnız sen görüyorsun, gerçek sezon değil.")}</p>
        )}

        <div className="sy-seviye">
          <span className="sy-seviye-daire" aria-hidden="true">{durum.seviye}</span>
          <div className="sy-seviye-ic">
            <div className="sy-seviye-satir">
              <b>{tt("Seviye {n} / {m}", { n: durum.seviye, m: toplam })}</b>
              <span className="qt-sayi">
                {son ? tt("Son seviye") : `${sayiBicim(Number(durum.sp ?? 0))} / ${sayiBicim(Number(durum.sonraki_esik))} SP`}
              </span>
            </div>
            <QtIlerleme ton="vurgu" boyut="b" deger={ilerDeger} en={ilerEn} etiket={tt("Sonraki seviyeye ilerleme")} />
            {bpVar && <span className="sy-carpan">{tt("Battle Pass: SP ×{c}", { c: carpan })}</span>}
          </div>
        </div>

        {bpVar ? (
          <div className="sy-bp sy-bp--aktif">
            <CerceveliAvatar profile={profile} userId={userId} boyut={48} sezonBp />
            <div className="sy-bp-ad">
              <AltinIsim>{gorunenAd}</AltinIsim>
              <span className="sy-bp-not">{tt("Altın isim · altın halka")}</span>
            </div>
            <QtRozet ton="coin" ikon="onay">{tt("Aktif")}</QtRozet>
          </div>
        ) : (
          <div className="sy-bp">
            <QtDugme tamGenislik boyut="b" ikon="kilit" onClick={() => setSatinAlAcik(true)}>
              {tt("Battle Pass Al · {n} elmas", { n: sayiBicim(Number(durum.bp?.fiyat ?? 0)) })}
            </QtDugme>
          </div>
        )}

        {bpVar && final?.anahtar && (
          <div className="sy-final">
            <span>{tt("Sezon unvanı")}</span>
            <UnvanYazisi metin={dil === "en" ? (final.ad_en || final.ad_tr) : final.ad_tr} tur="lig" boy="k" />
            <QtRozet boyut="k" ton={final.kazanildi ? "dogru" : "notr"} ikon={final.kazanildi ? "onay" : "kilit"}>
              {final.kazanildi ? tt("Kazanıldı") : tt("{n}. seviyede", { n: toplam })}
            </QtRozet>
          </div>
        )}
      </QtKart>

      {islemHata && <p className="sy-hata sy-hata--sayfa" role="alert">{islemHata}</p>}

      <section className="sy-yol-kutu" aria-label={tt("Sezon Yolu ödülleri")}>
        <div className="sy-yol-arac">
          <QtDugme tur="ikincil" boyut="k" ikon="ileri" onClick={() => kaydir(Math.max(1, durum.seviye), true)}>
            {tt("Seviyem")}
          </QtDugme>
          {alinabilirSayi > 1 && (
            <QtDugme boyut="k" ikon="hediye" yukleniyor={islem === "toplu"} devreDisi={Boolean(islem)}
              onClick={() => calistir("toplu", () => bpTopluAl(userId), tt("Ödüller alınamadı. Tekrar dener misin?"))}>
              {tt("Hepsini al ({n})", { n: alinabilirSayi })}
            </QtDugme>
          )}
        </div>
        <div className="sy-yol-kaydirma" ref={yolRef} tabIndex={0} role="region" aria-label={tt("Yatay kaydırılan seviye yolu")}>
          <div className="sy-yol" style={{ gridTemplateColumns: `repeat(${toplam - 1}, var(--sy-kol)) var(--sy-kol-final)` }}>
            <span className="sy-bant sy-bant--ucretsiz" aria-hidden="true" />
            <span className="sy-bant sy-bant--ucretli" aria-hidden="true" />
            <div className="sy-kol-etiket sy-kol-etiket--ucretsiz">
              <QtRozet ton="dogru" ikon="hediye" boyut="k">{tt("Ücretsiz")}</QtRozet>
            </div>
            <div className="sy-kol-etiket sy-kol-etiket--ucretli">
              <QtRozet ton="coin" ikon={bpVar ? "yildiz" : "kilit"} boyut="k">{bpVar ? tt("Battle Pass") : tt("Battle Pass'li")}</QtRozet>
            </div>
            {duraklar.map((n) => {
              const acik = n <= durum.seviye;
              const simdi = n === durum.seviye;
              const finalMi = n === toplam;
              const gecildi = n < durum.seviye;
              const c = [
                "sy-durak", acik && "sy-durak--acik", simdi && "sy-durak--simdi", finalMi && "sy-durak--final",
                gecildi && "sy-durak--gecildi", n === 1 && "sy-durak--ilk", finalMi && "sy-durak--son",
                yeniAcilan.has(n) && "sy-durak--acildi",
              ].filter(Boolean).join(" ");
              return (
                <div key={`d${n}`} className={c} data-durak={n} style={{ gridColumn: n }}>
                  <span className="sy-daire" aria-label={tt("{n}. seviye", { n })} aria-current={simdi ? "step" : undefined}>
                    {finalMi ? <QtIkon ad="kupa" boyut={24} /> : null}
                    <b>{n}</b>
                  </span>
                </div>
              );
            })}
            {duraklar.flatMap((n) => ["ucretsiz", "ucretli"].map((kol) => {
              const o = harita.get(`${n}:${kol}`);
              if (!o) return null;
              return (
                <div key={`${n}:${kol}`} className={`sy-hucre sy-hucre--${kol}${n === toplam ? " sy-hucre--final" : ""}`} style={{ gridColumn: n }}>
                  <Yuva odul={o} durum={d} bpVar={bpVar} yeniAlindi={yeniAlinan.has(`${n}:${kol}`)}
                    yeniAcildi={yeniAcilan.has(n)} onSec={(x) => setSecili(anahtar(x))} />
                </div>
              );
            }))}
          </div>
        </div>
      </section>

      <div className="sy-notlar">
        <p className="sy-mac-sp qt-soluk">
          {tt("Bugün maçlardan: {n} / {m} SP", { n: sayiBicim(Number(durum.bugun_mac_sp ?? 0)), m: sayiBicim(Number(durum.gunluk_mac_tavan ?? 0)) })}
        </p>
        {!bpVar && <p className="sy-bp-ozet">{tt("Altın isim, altın halka, SP ×{c}, geriye dönük ödüller ve daha fazlası.", { c: carpan })}</p>}
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
        <OdulSayfasi key={secili} odul={seciliOdul} durum={d} dil={dil} userId={userId}
          onKapat={() => setSecili(null)} onBpAl={() => { setSecili(null); setSatinAlAcik(true); }} />
      )}
      {satinAlAcik && <SatinAlSayfasi durum={d} dil={dil} onOnay={bpSatinAlOnay} onKapat={() => setSatinAlAcik(false)} />}
      {kutlama && <Kutlama verilen={kutlama.verilen} profile={profile} userId={userId} onKapat={() => setKutlama(null)} />}
    </div>
  );
}
