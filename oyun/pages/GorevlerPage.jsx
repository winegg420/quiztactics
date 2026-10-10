// ============================================================
// GÖREVLER (/gorevler) — hareketli OYUN EKRANI (QtSahne): koyu mavi sahne · Günlük/Haftalık sekmeleri (kalan süre) ·
// sandık sahnesi (süzülen sandık + dönen ışınlar) · YILDIZ YOLU · yan yana 3 oyun kartı (AL → flip → TAMAM) · sandık açılış perdesi.
// Mantık/RPC/ödül DEĞİŞMEDİ: bütün sayılar, "alınabilir/alındı" kararı ve ödüller SUNUCUDAN gelir (oyun/lib/gorevler.js);
// istemci hesap yapmaz, ödül uydurmaz — yalnız RPC çağırır (gorevlerim · gorev_al · haftalik_sandik_al) ve cevabı çizer.
// Günlük sandık: sunucuda günlük sandık ödülü YOK → günlük sandık yalnız görsel ilerlemedir (ödül sözü verilmez, açılış yok).
// Haftalık sandık: 3 görev alınınca `haftalik_sandik_al` (SP + joker); perde, sunucunun döndüğü GERÇEK ödülleri gösterir.
// SP yalnız sezon sistemi görünürken (sezon_ozetim.gorunur). Veri önbellekten anında gelir (lib/gorevler.js), arka planda yenilenir.
// Süreler sunucunun `yenilenme_sn` alanından (okunma anından geriye sayım, useKalanSn); istemci saati gün/hafta sınırı hesaplamaz.
// Hareket yalnız transform/opacity; hareketi azalt'ta anında son hâl. Parçalar: oyun/pages/gorevler/*, stil: gorevler/gorevler-oyun.css.
// `gk-` = bu ekranın sınıfları (ölçüm betiklerinin kancaları). Eski liste görünümünün `gv-` kuralları gorevler.css'te durur.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { QtDugme, QtIskelet, QtSahne, dokunus, sinif } from "../tasarim/index.js";
import { odulPatlat, kisaKonfeti, hareketAzaltildi } from "../tasarim/sahne/OdulPatlamasi.jsx";
import { odulHissi } from "../tasarim/hareket.js";
import DurumKutusu from "../components/DurumKutusu.jsx";
import { tt } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji } from "../lib/hata.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { coinTazele } from "../lib/coin.js";
import { sezonTazele, useSezonOzeti } from "../lib/sezonYolu.js";
import { useGorevler, gorevAl, sandikAl, gorevlerimOku, kalanMetni, useKalanSn } from "../lib/gorevler.js";
import GorevKarti, { sayiMetni } from "./gorevler/GorevKarti.jsx";
import YildizYolu, { yolMetni } from "./gorevler/YildizYolu.jsx";
import Sandik from "./gorevler/Sandik.jsx";
import SandikAcilis from "./gorevler/SandikAcilis.jsx";
import "./gorevler.css";
import "./gorevler/gorevler-oyun.css";

const TOPLU_ARA_MS = 350;      // "Ödülü al (n)": iki alma arasında kısa bekleme (animasyonlar sırayla ve kısa)
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const alinabilirMi = (g) => Boolean(g?.alinabilir) && !g.alindi;

export default function GorevlerPage() {
  const { dil } = useDil();
  const { veri, hata, yukle } = useGorevler();
  const { ozet: sezonOzeti } = useSezonOzeti();
  const sezonAcik = sezonOzeti?.gorunur === true;
  const [sekme, setSekme] = useState("gunluk");           // "gunluk" | "haftalik"
  const [islem, setIslem] = useState(null);               // "gunluk:<id>" | "haftalik:<id>" | "sandik" | "toplu"
  const [mesaj, setMesaj] = useState(null);
  const [duyuru, setDuyuru] = useState("");
  const [alinan, setAlinan] = useState(() => new Set());  // sunucu cevabı gelen, veri henüz yenilenmemiş alımlar (flip + yıldız hemen)
  const [salla, setSalla] = useState(0);                  // sandık sallanma sayacı (her alımda)
  const [sallaAktif, setSallaAktif] = useState(false);    // sallanma yalnız alım anında (sekme değişince/açılışta sallanmaz)
  const [acilis, setAcilis] = useState(null);             // { faz: "bekle"|"ac", oduller } | null
  const sandikRef = useRef(null);
  const canli = useRef(true);
  useEffect(() => { canli.current = true; return () => { canli.current = false; }; }, []);

  const gun = veri?.gunluk;
  const hft = veri?.haftalik;
  const okunma = veri?.okunma;
  const kalanGun = useKalanSn(gun?.yenilenme_sn, okunma, yukle);
  const kalanHft = useKalanSn(hft?.yenilenme_sn, okunma, yukle);

  const sallaZaman = useRef(0);
  const sandikSalla = () => {
    setSalla((n) => n + 1);
    setSallaAktif(true);
    clearTimeout(sallaZaman.current);
    sallaZaman.current = setTimeout(() => { if (canli.current) setSallaAktif(false); }, 700);
  };
  useEffect(() => () => clearTimeout(sallaZaman.current), []);

  const efAlindi = (kapsam, g) => Boolean(g.alindi) || alinan.has(`${kapsam}:${g.quest_id}`);
  const anahtarKaldir = (anahtar) => setAlinan((s) => { if (!s.has(anahtar)) return s; const n = new Set(s); n.delete(anahtar); return n; });

  // Bir görevin ödülünü al; flip + yıldız + ödül uçuşu YALNIZ sunucu `alindi` cevabından sonra. Hata fırlatır.
  const gorevCek = async (kapsam, g, kisa = false) => {
    const anahtar = `${kapsam}:${g.quest_id}`;
    const r = await gorevAl(kapsam, g.quest_id);
    if (r?.alindi) {
      const coin = Number(r.coin) || 0;
      const sp = r.sp == null ? null : Number(r.sp) || 0;
      coinTazele();
      if (sezonAcik) sezonTazele();
      setAlinan((s) => new Set(s).add(anahtar));
      sandikSalla();
      const parcalar = [];
      if (coin > 0) parcalar.push(tt("{n} coin", { n: sayiMetni(coin) }));
      if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
      setDuyuru(tt("Ödül alındı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
      if (!hareketAzaltildi()) await bekle(280);   // önce kart dönsün
      let el = null;
      try { el = document.querySelector(`[data-gk-anahtar="${anahtar}"]`) ?? sandikRef.current; } catch { /* yok */ }
      if (coin > 0) await odulPatlat({ kaynak: el, tur: "coin", kisa });
      if (sp != null && sp > 0) await odulPatlat({ kaynak: el, tur: "sp", kisa: true });
    }
    return { r, anahtar };
  };

  const gorevAlIslem = async (kapsam, g) => {
    if (islem) return;
    setIslem(`${kapsam}:${g.quest_id}`);
    setMesaj(null);
    let anahtar = null;
    try {
      ({ anahtar } = await gorevCek(kapsam, g));
    } catch (e) {
      setMesaj(hataMesaji(e, tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      await yukle();
      if (anahtar) anahtarKaldir(anahtar);
      if (canli.current) setIslem(null);
    }
  };

  // Haftalık sandığı aç: perde hemen açılır (sandık sallanır), RPC cevabı gelince kapak açılır ve GERÇEK ödüller çıkar. Hata fırlatır.
  const sandikAcIc = async () => {
    setAcilis({ faz: "bekle", oduller: [] });
    try {
      const [r] = await Promise.all([sandikAl(), bekle(hareketAzaltildi() ? 0 : 900)]);
      if (!r?.alindi) { setAcilis(null); return r; }   // başka cihazda zaten açılmış: perde yok, veri yenilenir
      const sp = r.sp == null ? null : Number(r.sp) || 0;
      const adet = Number(r.joker?.adet) || 0;
      const jokerAd = SKILL_TANIMLARI[r.joker?.tur]?.ad ?? tt("Joker");
      const oduller = [];
      if (sp != null && sp > 0) oduller.push({ anahtar: "sp", tur: "sp", metin: `+${sayiMetni(sp)} SP` });
      if (adet > 0) oduller.push({ anahtar: "joker", tur: "joker", metin: `${jokerAd} ×${adet}` });
      if (!oduller.length) oduller.push({ anahtar: "alindi", tur: "joker", metin: tt("Alındı") });
      if (sezonAcik) sezonTazele();
      setAcilis({ faz: "ac", oduller, sp });
      odulHissi("buyuk");
      setTimeout(() => kisaKonfeti({ x: 0.5, y: 0.38 }, 60), hareketAzaltildi() ? 0 : 250);
      setDuyuru(tt("Sandık açıldı: {o}", { o: oduller.map((o) => o.metin).join(", ") }));
      return r;
    } catch (e) {
      setAcilis(null);
      throw e;
    }
  };

  const sandikAc = async () => {
    if (islem) return;
    setIslem("sandik");
    setMesaj(null);
    let perde = false;
    try {
      const r = await sandikAcIc();
      perde = Boolean(r?.alindi);
    } catch (e) {
      setMesaj(hataMesaji(e, tt("Sandık açılamadı. Tekrar dener misin?")));
    } finally {
      // Perde açıksa `islem` Topla'dan sonra (perdeKapandi) temizlenir.
      if (!perde) { await yukle(); if (canli.current) setIslem(null); }
    }
  };

  // "Topla": ödüller (SP) bakiye hapına uçar, veri yenilenir (sandık sahnede açık hâlde kalır), perde kapanır.
  const topla = async () => {
    try {
      if (acilis?.sp > 0) await odulPatlat({ kaynak: sandikRef.current, tur: "sp" });
    } catch { /* animasyon kritik değil */ }
    await yukle();
  };
  const perdeKapandi = () => { setAcilis(null); setIslem(null); };

  // "Ödülü al (n)": alınabilir görevleri (günlük → haftalık) mevcut gorev_al ile TEK TEK, sırayla alır; sandık hazırsa perdeyi açar.
  // Yeni toplu RPC yok; biri hata verirse durur ve hata mesajı gösterilir.
  const topluAl = async () => {
    if (islem) return;
    const sira = [
      ...(gun?.gorevler ?? []).filter(alinabilirMi).map((g) => ["gunluk", g]),
      ...(hft?.gorevler ?? []).filter(alinabilirMi).map((g) => ["haftalik", g]),
    ];
    setIslem("toplu");
    setMesaj(null);
    let asama = "gorev";
    let perdeAcildi = false;
    try {
      for (const [kapsam, g] of sira) {
        const { anahtar } = await gorevCek(kapsam, g, true);
        await yukle();
        anahtarKaldir(anahtar);
        await bekle(TOPLU_ARA_MS);
      }
      asama = "sandik";
      const taze = await gorevlerimOku().catch(() => null);   // son haftalık alınınca sandık açılabilir olur: sunucudan taze oku
      const s = taze?.haftalik?.sandik;
      if (s?.alinabilir && !s.alindi) {
        if (sekme !== "haftalik") setSekme("haftalik");
        const r = await sandikAcIc();
        perdeAcildi = Boolean(r?.alindi);
      }
    } catch (e) {
      setMesaj(hataMesaji(e, asama === "sandik" ? tt("Sandık açılamadı. Tekrar dener misin?") : tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      await yukle();
      if (canli.current && !perdeAcildi) setIslem(null);   // perde açıksa işlem Topla'da biter
    }
  };

  const sandik = hft?.sandik;
  const sayiHazir = (kapsam) => (kapsam === "gunluk" ? gun : hft)?.gorevler?.filter(alinabilirMi).length ?? 0;
  const hazir = veri ? sayiHazir("gunluk") + sayiHazir("haftalik") + (alinabilirMi(sandik) ? 1 : 0) : 0;

  const gunluk = sekme === "gunluk";
  const kapsam = gunluk ? "gunluk" : "haftalik";
  const liste = (gunluk ? gun : hft)?.gorevler ?? [];
  const toplam = liste.length;
  const yanan = liste.filter((g) => efAlindi(kapsam, g)).length;
  const tumuTamam = toplam > 0 && yanan >= toplam;
  const sandikAlindi = !gunluk && Boolean(sandik?.alindi);
  const sandikHazir = !gunluk && alinabilirMi(sandik);
  const sandikYanik = gunluk ? tumuTamam : sandikHazir || sandikAlindi;
  const sandikAcik = gunluk ? tumuTamam : sandikAlindi;
  const kalanSn = gunluk ? kalanGun : kalanHft;
  const yolYazisi = gunluk
    ? (tumuTamam ? tt("Yarın yeni sandık · {s}", { s: kalanMetni(kalanSn) }) : yolMetni(toplam - yanan))
    : sandikAlindi ? tt("Sandık alındı") : sandikHazir ? tt("Sandık hazır!") : yolMetni(Math.max(0, (sandik?.hedef || toplam) - yanan));
  // Hazır kartlardan yalnız ilki nabız atar (ekranda tek nabız).
  const ilkHazir = liste.find((g) => alinabilirMi(g) && !alinan.has(`${kapsam}:${g.quest_id}`));

  const sandikaDokun = () => {
    dokunus();
    if (sandikHazir) sandikAc();
    else sandikSalla();
  };

  const sekmeDugmesi = (id, etiket, sn) => {
    const digerHazir = id !== sekme ? sayiHazir(id) : 0;
    return (
      <button type="button" role="tab" id={`gk-sekme-${id}`} aria-selected={sekme === id} aria-controls="gk-panel" tabIndex={sekme === id ? 0 : -1}
              className={sinif("gk-sekme", sekme === id && "gk-sekme--aktif")} onClick={() => { if (sekme !== id) { dokunus(); setSekme(id); } }}>
        <span className="gk-sekme-ad">{etiket}</span>
        <span className="gk-sekme-sure" aria-hidden="true">· {veri ? kalanMetni(sn) : "…"}</span>
        <span className="qt-gizli">{tt("Kalan süre: {s}", { s: veri ? kalanMetni(sn) : "…" })}</span>
        {digerHazir > 0 && <i className="gk-sekme-nokta" aria-hidden="true" />}
        {digerHazir > 0 && <span className="qt-gizli">{tt(digerHazir === 1 ? "{n} ödül hazır" : "{n} ödül hazır|çoğul", { n: digerHazir })}</span>}
      </button>
    );
  };
  const sekmeler = (
    <div className="gk-sekmeler" role="tablist" aria-label={tt("Görevler")}
         onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setSekme((s) => (s === "gunluk" ? "haftalik" : "gunluk")); } }}>
      {sekmeDugmesi("gunluk", tt("Günlük|bölüm"), kalanGun)}
      {sekmeDugmesi("haftalik", tt("Haftalık|bölüm"), kalanHft)}
    </div>
  );

  // Alt yuva: hata mesajı (her zaman görünür) + TEK birincil düğme; ikisi de yoksa alan çöker.
  const alt = hazir > 0 || mesaj ? (
    <>
      {mesaj && <p className="gv-mesaj gk-mesaj" role="alert">{mesaj}</p>}
      {hazir > 0 && (
        <QtDugme tur="birincil" tamGenislik boyut="o" className="gv-toplu" yukleniyor={islem === "toplu"} devreDisi={Boolean(islem) && islem !== "toplu"}
                 onClick={() => { dokunus(); topluAl(); }}>{tt("Ödülü al ({n})", { n: sayiMetni(hazir) })}</QtDugme>
      )}
    </>
  ) : null;

  return (
    <QtSahne baslik={tt("Görevler")} ust={veri ? sekmeler : null} alt={alt} className="gk-sahne">
      <div className="gv-sayfa gk-sayfa">
        <p className="qt-gizli" role="status" aria-live="polite">{duyuru}</p>

        {!veri && !hata && (
          <div className="gv-yukleniyor gk-iskelet" role="status" aria-busy="true">
            <span className="qt-gizli">{tt("Yükleniyor…")}</span>
            <QtIskelet tur="kart" yukseklik="150px" />
            <QtIskelet tur="kart" yukseklik="56px" />
            <div className="gk-iskelet-sira"><QtIskelet tur="kart" yukseklik="180px" /><QtIskelet tur="kart" yukseklik="180px" /><QtIskelet tur="kart" yukseklik="180px" /></div>
          </div>
        )}
        {hata && (
          <div className="gv-hata-kutu">
            <DurumKutusu durum="hata" onTekrar={yukle} metin={tt("Görevler alınamadı. Bağlantını kontrol edip tekrar dene.")} />
          </div>
        )}

        {veri && (
          <div className="gk-panel" id="gk-panel" role="tabpanel" aria-labelledby={`gk-sekme-${sekme}`} key={sekme}>
            <section className={sinif("gk-sahne-alan", sandikYanik && "gk-sahne-alan--parlak")} aria-label={gunluk ? tt("Günlük görevler") : tt("Haftalık sandık")}>
              <span className="gk-isin" aria-hidden="true" />
              <button type="button" className="gk-sandik-dugme" ref={sandikRef} onClick={sandikaDokun}
                      aria-label={sandikHazir ? tt("Sandığı aç") : gunluk ? tt("Günlük görevler") : tt("Haftalık sandık")}>
                <span className="gk-kaide" aria-hidden="true" />
                <span className={sinif("gk-yuzer", sandikHazir && "gk-yuzer--hazir")}>
                  <span className={sinif("gk-sar", sallaAktif && "gk-sar--salla")} key={salla}><Sandik acik={sandikAcik} /></span>
                </span>
              </button>
              {sandikHazir && (
                <QtDugme tur="birincil" boyut="k" className="gk-ac-dugme" yukleniyor={islem === "sandik"} devreDisi={Boolean(islem) && islem !== "sandik"}
                         onClick={() => { dokunus(); sandikAc(); }}>{tt("Aç|sandık")}</QtDugme>
              )}
            </section>

            <YildizYolu toplam={toplam} yanan={yanan} sandikYanik={sandikYanik} sandikAcik={sandikAcik} metin={yolYazisi} />

            <ul className="gk-kartlar">
              {liste.map((g, i) => (
                <GorevKarti key={g.quest_id} g={g} gunluk={gunluk} dil={dil} sezonAcik={sezonAcik} sira={i}
                            anahtar={`${kapsam}:${g.quest_id}`} alindi={efAlindi(kapsam, g)}
                            islemde={islem === `${kapsam}:${g.quest_id}`} mesgul={Boolean(islem)}
                            nabiz={ilkHazir?.quest_id === g.quest_id}
                            onAl={() => { dokunus(); gorevAlIslem(kapsam, g); }} />
              ))}
            </ul>
          </div>
        )}
      </div>
      {acilis && <SandikAcilis faz={acilis.faz} oduller={acilis.oduller} onTopla={topla} onKapan={perdeKapandi} />}
    </QtSahne>
  );
}
