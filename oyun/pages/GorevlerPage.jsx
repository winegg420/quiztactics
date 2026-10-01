// ============================================================
// GÖREVLER (/gorevler) — TAM EKRAN OYUN SAHNESİ (QtSahne): günlük (kolay/orta/zor) + haftalık görevler + haftalık sandık.
// Bütün sayılar, "alınabilir/alındı" kararı ve ödüller SUNUCUDAN gelir (oyun/lib/gorevler.js); istemci hesap yapmaz,
// ödül vermez — yalnız RPC çağırır ve cevabı çizer. Animasyonda sunucunun döndüğü GERÇEK coin/SP kullanılır
// (günlük coin tavanı yüzünden coin, ödül çipinden az olabilir; sezon kapalıyken SP null).
// SP yalnız sezon sistemi görünürken (sezon_ozetim.gorunur) çizilir: kapalıyken SP verilmez.
// Sahne düzeni (2 Eki 2026, Ida onaylı gri kutu taslağı): üst şerit [<] Görevler [coin] · SABİT özet (halka 1/3 + yenilenme) ·
// kaydırılan liste (nötr satırlar; yalnız ALINABİLİR satır turuncu) · SABİT alt "Ödülü al (n)" (alınabilir yoksa alan çöker).
// "Ödülü al (n)": yeni toplu RPC YOK — alınabilirleri mevcut gorev_al / haftalik_sandik_al ile TEK TEK, sırayla alır;
// kutlama yalnız sunucu `alindi` cevabından sonra; biri hata verirse durur ve mesajı gösterir.
// Hareketi azalt: uçan ödül çipi yerinde kalıp solar (gorevler.css; yumuşak mod: data-yumusak).
// Oyun hissi: sıralı satır girişi, ilk alınabilir satırda tek nabız, alma anında titreşim + parıltı, sandıkta konfeti.
// `gv-` sınıfları: bu sayfanın yerleşimi/görünümü (gorevler.css) ve ölçüm betiklerinin kancaları.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { QtIkon, QtDugme, QtIskelet, QtIlerleme, QtSahne, QT_SAHNE_COIN_HAPI, ziplat, dokunus, sinif, siraStili, useSiraliGiris } from "../tasarim/index.js";
import { CoinIkon } from "../components/ParaIkonlari.jsx";
import DurumKutusu from "../components/DurumKutusu.jsx";
import OdulAni, { UcanOge, useOdulAni } from "../components/OdulAni.jsx";
import { tt, aktifDil } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji } from "../lib/hata.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { coinTazele } from "../lib/coin.js";
import { sezonTazele, useSezonOzeti } from "../lib/sezonYolu.js";
import { useGorevler, gorevAl, sandikAl, gorevlerimOku, gorevOzeti, kalanMetni, useKalanSn } from "../lib/gorevler.js";
import "./gorevler.css";

// Görev sayacı → ikon (QtIkon adı).
const IKON = {
  mac_oyna: "klasik",
  mac_kazan: "kupa",
  dogru_soru: "soru",
  duello_mac: "duello",
  duello_galibiyet: "duello",
  kategori_dogru: "yildiz",
  farkli_kategori_dogru: "hedef",
};
const ZORLUK = { kolay: "Kolay|görev", orta: "Orta|görev", zor: "Zor|görev" };
const ZORLUK_NOKTA = { kolay: 1, orta: 2, zor: 3 };   // zorluk = 3 nokta (kolay 1 dolu · orta 2 · zor 3); renk yok
const ACIL_SN = 3600;          // yenilenmeye bundan az kaldıysa süre metni kehribara geçer
const TOPLU_ARA_MS = 650;      // "Ödülü al (n)": iki alma arasında, kutlama görünsün diye kısa bekleme

const sayiMetni = (n) => Number(n ?? 0).toLocaleString(aktifDil() === "en" ? "en-US" : "tr-TR");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const alinabilirMi = (g) => Boolean(g?.alinabilir) && !g.alindi;

// Tek satır ödül: "15 · 10 SP" (coin ikonu küçük; SP yalnız sezon açıkken). Ayrı çip yok.
function OdulSatiri({ odul, sezonAcik }) {
  const coin = Number(odul?.coin) || 0;
  const sp = Number(odul?.sp) || 0;
  const spVar = sezonAcik && sp > 0;
  if (!(coin > 0) && !spVar) return null;
  return (
    <span className="gv-odul">
      {coin > 0 && <><CoinIkon boyut={14} /><b>{sayiMetni(coin)}</b><span className="qt-gizli"> coin</span></>}
      {coin > 0 && spVar && <span aria-hidden="true">·</span>}
      {spVar && <b>{sayiMetni(sp)} SP</b>}
    </span>
  );
}

function Tik({ etiket }) {
  return <span className="qt-oyk-tik gv-tik" role="img" aria-label={etiket}><QtIkon ad="onay" boyut={20} /></span>;
}

// Zorluk noktaları (3 nokta, ekran okuyucuya zorluk adı).
function ZorlukNoktalari({ zorluk }) {
  const dolu = ZORLUK_NOKTA[zorluk] ?? 0;
  return (
    <span className={sinif("gv-noktalar", `gv-zor gv-zor--${zorluk}`)} role="img" aria-label={tt(ZORLUK[zorluk] ?? zorluk)}>
      {[0, 1, 2].map((i) => <i key={i} className={sinif("gv-nokta", i < dolu && "gv-nokta--dolu")} />)}
    </span>
  );
}

// Uçan çipin içeriği (OdulAni çizer). Görsel ipucu; ekran okuyucuya canlı bölge (role=status) söyler.
function UcanIcerik({ coin, sp, ek }) {
  return (
    <>
      {coin > 0 && <UcanOge><CoinIkon boyut={16} />+{sayiMetni(coin)}</UcanOge>}
      {sp != null && sp > 0 && <UcanOge><QtIkon ad="hizli" boyut={14} />+{sayiMetni(sp)} SP</UcanOge>}
      {ek && <UcanOge>{ek}</UcanOge>}
      {!(coin > 0) && !(sp > 0) && !ek && <UcanOge>{tt("Alındı")}</UcanOge>}
    </>
  );
}

function GorevSatiri({ g, gunluk, dil, sezonAcik, islemde, mesgul, onAl, ucan, sira, sirali, nabiz }) {
  const durum = g.alindi ? "alindi" : g.alinabilir ? "alinabilir" : "devam";
  const ad = dil === "en" ? (g.ad_en || g.ad_tr) : g.ad_tr;
  const hedef = Math.max(1, Number(g.hedef) || 1);
  const ilerleme = Math.min(Math.max(0, Number(g.ilerleme) || 0), hedef);
  const yuzde = Math.round((ilerleme / hedef) * 100);
  const kategori = g.sayac === "kategori_dogru" && g.parametre?.kategori ? kategoriAdi(g.parametre.kategori) : null;
  const zorluk = gunluk && g.zorluk ? g.zorluk : null;
  return (
    <li className={sinif("gv-kart", `gv-kart--${durum}`, nabiz && "qt-h-nabiz", ucan && "gv-kart--kutla", sirali)} style={siraStili(sira)}>
      <span className="gv-ik" aria-hidden="true"><QtIkon ad={IKON[g.sayac] ?? "hedef"} boyut={20} /></span>
      <div className="gv-govde">
        <div className="gv-ust-satir">
          <b className="gv-ad">{ad}</b>
          <OdulSatiri odul={g.odul} sezonAcik={sezonAcik} />
        </div>
        {(zorluk || kategori) && (
          <div className="gv-meta">
            {zorluk && <ZorlukNoktalari zorluk={zorluk} />}
            {kategori && <span className="gv-kat">{kategori}</span>}
          </div>
        )}
        <div className="gv-alt-satir">
          {/* Dolgu tam yüzdeye yuvarlanır; ekran okuyucu gerçek ilerleme/hedef değerini okur. */}
          <QtIlerleme canli className="gv-bar" ton="vurgu" deger={yuzde} en={100} etiket={ad}
                      aria-valuemax={hedef} aria-valuenow={ilerleme} aria-valuetext={tt("{a} / {b}", { a: ilerleme, b: hedef })} />
          <b className="gv-sayi" aria-hidden="true">{tt("{a} / {b}", { a: ilerleme, b: hedef })}</b>
          {durum === "alindi" && <Tik etiket={tt("Alındı")} />}
          {durum === "alinabilir" && (
            <QtDugme boyut="k" className="qt-oyk-al gv-al" yukleniyor={islemde} devreDisi={mesgul && !islemde}
                     aria-label={tt("{ad} ödülünü al", { ad })} onClick={onAl}>{tt("Al|görev")}</QtDugme>
          )}
        </div>
      </div>
      <OdulAni aktif={Boolean(ucan)} ucanSinif="gv-ucan">{ucan && <UcanIcerik coin={ucan.coin} sp={ucan.sp} />}</OdulAni>
    </li>
  );
}

// Haftalık sandık: sakin, kesikli çerçeveli kart (3 nokta = tamam/hedef). Sandık mantığı ve açılış kutlaması (konfeti) aynen.
function SandikSatiri({ s, sezonAcik, islemde, mesgul, onAc, ucan, sira, sirali, nabiz }) {
  const durum = s.alindi ? "alindi" : s.alinabilir ? "alinabilir" : "kilitli";
  const hedef = Number(s.hedef) || 3;
  const tamam = Math.min(Number(s.tamam) || 0, hedef);
  const jokerAd = SKILL_TANIMLARI[s.joker?.tur]?.ad ?? tt("Joker");
  const jokerAdet = Number(s.joker?.adet) || 0;
  const sp = Number(s.sp) || 0;
  const spVar = sezonAcik && sp > 0;
  return (
    <li className={sinif("gv-kart gv-sandik", `gv-sandik--${durum}`, nabiz && "qt-h-nabiz", ucan && "gv-kart--kutla", sirali)} style={siraStili(sira)}>
      <span className="gv-ik" aria-hidden="true"><QtIkon ad="hediye" boyut={20} /></span>
      <div className="gv-govde">
        <div className="gv-ust-satir">
          <b className="gv-ad">{tt("Haftalık sandık")}</b>
        </div>
        <span className="gv-alt gv-alt-yazi">{tt("{n} haftalık görevi bitir", { n: hedef })}</span>
        {(spVar || jokerAdet > 0) && (
          <span className="gv-odul gv-odul--sol">
            {spVar && <b>{sayiMetni(sp)} SP</b>}
            {spVar && jokerAdet > 0 && <span aria-hidden="true">·</span>}
            {jokerAdet > 0 && <b>{jokerAd} ×{jokerAdet}</b>}
          </span>
        )}
        <div className="gv-alt-satir">
          {/* x/hedef nokta ilerlemesi — sayılar sunucunun `tamam`/`hedef` alanı. */}
          <span className="gv-noktalar gv-noktalar--b" aria-hidden="true">
            {Array.from({ length: hedef }, (_, i) => <i key={i} className={sinif("gv-nokta", i < tamam && "gv-nokta--dolu")} />)}
          </span>
          <span className="gv-bosluk" />
          {durum === "alindi" && <Tik etiket={tt("Alındı")} />}
          {durum === "alinabilir" && (
            <QtDugme boyut="k" className="qt-oyk-al gv-al" yukleniyor={islemde} devreDisi={mesgul && !islemde} onClick={onAc}>{tt("Sandığı aç")}</QtDugme>
          )}
          {durum === "kilitli" && (
            <span className="gv-kilit" role="img" aria-label={tt("Kilitli: {a} / {b} görev alındı", { a: tamam, b: hedef })}>
              <QtIkon ad="kilit" boyut={16} />
            </span>
          )}
        </div>
      </div>
      <OdulAni aktif={Boolean(ucan)} buyuk konfeti ucanSinif="gv-ucan">{ucan && <UcanIcerik coin={0} sp={ucan.sp} ek={ucan.ek} />}</OdulAni>
    </li>
  );
}

// Sabit özet (ekranın TEK odağı): halka ilerleme + "Bugün N görev tamam" + yenilenme süresi (1 saatten azsa kehribar).
function GunOzeti({ ozet, gun, okunma, bitti, gunBitti, tamamAni }) {
  const kalan = useKalanSn(gun.yenilenme_sn, okunma, bitti);
  const sure = kalanMetni(kalan);
  const R = 24;
  const C = 2 * Math.PI * R;
  const oran = ozet.gunToplam > 0 ? Math.min(1, ozet.gunTamam / ozet.gunToplam) : 0;
  return (
    <div className={sinif("gv-ozet", gunBitti && "gv-ozet--tamam")}>
      <span className="gv-halka" aria-hidden="true">
        <svg viewBox="0 0 56 56" width="56" height="56" focusable="false">
          <circle className="gv-halka-iz" cx="28" cy="28" r={R} />
          {oran > 0 && <circle className="gv-halka-dolgu" cx="28" cy="28" r={R} strokeDasharray={`${(oran * C).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 28 28)" />}
        </svg>
        <b className="gv-halka-sayi">{ozet.gunTamam}/{ozet.gunToplam}</b>
      </span>
      <div className="gv-ozet-metin">
        <b className="gv-ozet-ana">
          {gunBitti && <QtIkon ad="onay" boyut={16} />}
          {gunBitti ? tt("Bugünlük tamam") : tt("Bugün {n} görev tamam", { n: ozet.gunTamam })}
        </b>
        <span className={sinif("gv-yenilenme", kalan < ACIL_SN && "gv-yenilenme--acil")}>
          <QtIkon ad="saat" boyut={14} />
          <span aria-hidden="true">{tt("{s} sonra yenilenir", { s: sure })}</span>
          <span className="qt-gizli">{tt("Kalan süre: {s}", { s: sure })}</span>
        </span>
      </div>
      {tamamAni && <span className="qt-h-isilti" style={{ "--isilti-kose": "0px" }} aria-hidden="true" />}
    </div>
  );
}

function Bolum({ id, etiket, children }) {
  return (
    <section className="gv-bolum" aria-labelledby={id}>
      <h2 id={id} className="gv-h2">{etiket}</h2>
      <ul className="gv-liste">{children}</ul>
    </section>
  );
}

// "Haftalık, 4 gün 6 sa" — haftalık yenilenme süresi bölüm etiketinde (günlük süre sabit özette).
function HaftalikBolum({ yenilenmeSn, okunma, bitti, children }) {
  const kalan = useKalanSn(yenilenmeSn, okunma, bitti);
  return <Bolum id="gv-haftalik" etiket={tt("Haftalık, {s}", { s: kalanMetni(kalan) })}>{children}</Bolum>;
}

export default function GorevlerPage() {
  const { dil } = useDil();
  const { veri, hata, yukle } = useGorevler();
  const { ozet: sezonOzeti } = useSezonOzeti();
  const sezonAcik = sezonOzeti?.gorunur === true;
  const [islem, setIslem] = useState(null);      // "gunluk:<id>" | "haftalik:<id>" | "sandik" | "toplu"
  const [mesaj, setMesaj] = useState(null);
  const { kutla, ucan } = useOdulAni();          // ödül anı: ucan(anahtar) → { coin, sp, ek } | null
  const [duyuru, setDuyuru] = useState("");
  const sirali = useSiraliGiris(Boolean(veri));  // sıralı satır girişi yalnız ilk açılışta (veri yenilenince yeniden oynamaz)

  // "Bugünlük tamam": günlük görevlerin hepsi ALINMIŞ (sunucunun `alindi` alanı). Sayfa açıkken tamamlanırsa özette tek seferlik parıltı.
  const gunGorevleri = veri?.gunluk?.gorevler;
  const gunBitti = Boolean(gunGorevleri?.length) && gunGorevleri.every((g) => g.alindi);
  const [tamamAni, setTamamAni] = useState(false);
  const oncekiBitti = useRef(null);
  useEffect(() => {
    if (!veri) return;
    if (oncekiBitti.current === false && gunBitti) setTamamAni(true);
    if (!gunBitti) setTamamAni(false);   // yeni gün: görevler yenilendi
    oncekiBitti.current = gunBitti;
  }, [veri, gunBitti]);

  // Bir görevin ödülünü al; kutlama YALNIZ sunucu `alindi` cevabından sonra. Hata fırlatır (çağıran mesajı gösterir).
  const gorevCek = async (kapsam, g) => {
    const anahtar = `${kapsam}:${g.quest_id}`;
    const r = await gorevAl(kapsam, g.quest_id);
    if (r?.alindi) {
      const coin = Number(r.coin) || 0;
      const sp = r.sp == null ? null : Number(r.sp) || 0;
      coinTazele();
      if (sezonAcik) sezonTazele();
      const parcalar = [];
      if (coin > 0) parcalar.push(tt("{n} coin", { n: sayiMetni(coin) }));
      if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
      // Sahnede uygulama üst çubuğu gizli: coin hapı zıplatması sahnedeki hapa yapılır (coinZipla gizli hapı arar).
      kutla(anahtar, { coin, sp }, { his: "odul", coinZipla: false });
      if (coin > 0) ziplat(QT_SAHNE_COIN_HAPI);
      setDuyuru(tt("Ödül alındı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
    }
    return r;
  };

  // Haftalık sandığı aç (büyük an: konfeti). Hata fırlatır.
  const sandikCek = async () => {
    const r = await sandikAl();
    if (r?.alindi) {
      const sp = r.sp == null ? null : Number(r.sp) || 0;
      const adet = Number(r.joker?.adet) || 0;
      const ad = SKILL_TANIMLARI[r.joker?.tur]?.ad ?? tt("Joker");
      const ek = adet > 0 ? `${ad} ×${adet}` : null;
      if (sezonAcik) sezonTazele();
      const parcalar = [];
      if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
      if (ek) parcalar.push(ek);
      kutla("sandik", { coin: 0, sp, ek }, { his: "buyuk" });
      setDuyuru(tt("Sandık açıldı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
    }
    return r;
  };

  const gorevAlIslem = async (kapsam, g) => {
    if (islem) return;
    setIslem(`${kapsam}:${g.quest_id}`);
    setMesaj(null);
    try {
      await gorevCek(kapsam, g);
    } catch (e) {
      setMesaj(hataMesaji(e, tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      await yukle();
      setIslem(null);
    }
  };

  const sandikAc = async () => {
    if (islem) return;
    setIslem("sandik");
    setMesaj(null);
    try {
      await sandikCek();
    } catch (e) {
      setMesaj(hataMesaji(e, tt("Sandık açılamadı. Tekrar dener misin?")));
    } finally {
      await yukle();
      setIslem(null);
    }
  };

  // "Ödülü al (n)": alınabilir görevleri (günlük → haftalık) mevcut gorev_al ile TEK TEK, sırayla alır; sonra sandık alınabilirse onu açar.
  // Yeni toplu RPC yok; biri hata verirse durur ve hata mesajı gösterilir.
  const topluAl = async () => {
    if (islem) return;
    const sira = [
      ...(veri?.gunluk?.gorevler ?? []).filter(alinabilirMi).map((g) => ["gunluk", g]),
      ...(veri?.haftalik?.gorevler ?? []).filter(alinabilirMi).map((g) => ["haftalik", g]),
    ];
    setIslem("toplu");
    setMesaj(null);
    let asama = "gorev";
    try {
      for (const [kapsam, g] of sira) {
        await gorevCek(kapsam, g);
        await yukle();
        await bekle(TOPLU_ARA_MS);
      }
      asama = "sandik";
      // Haftalık görevlerin sonuncusu alınınca sandık açılabilir hâle gelir: durumu sunucudan taze oku.
      const taze = await gorevlerimOku().catch(() => null);
      const s = taze?.haftalik?.sandik;
      if (s?.alinabilir && !s.alindi) await sandikCek();
    } catch (e) {
      setMesaj(hataMesaji(e, asama === "sandik" ? tt("Sandık açılamadı. Tekrar dener misin?") : tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      await yukle();
      setIslem(null);
    }
  };

  const gun = veri?.gunluk;
  const hft = veri?.haftalik;
  const okunma = veri?.okunma;
  const ozet = veri ? gorevOzeti(veri) : null;   // gün tamam/toplam sunucu alanlarından
  const gunAdet = gun?.gorevler?.length ?? 0;
  // Alınabilir sayısı (sunucunun `alinabilir`/`alindi` bayraklarından): günlük + haftalık görevler + sandık.
  const hazir = veri
    ? gun.gorevler.filter(alinabilirMi).length + hft.gorevler.filter(alinabilirMi).length + (alinabilirMi(hft.sandik) ? 1 : 0)
    : 0;
  // Bir ekranda en çok 1 nabız: yalnız İLK alınabilir satır (günlük → haftalık → sandık sırasıyla).
  const ilkGun = gun?.gorevler?.find(alinabilirMi);
  const ilkHft = hft?.gorevler?.find(alinabilirMi);
  const ilkAlinabilir = ilkGun ? `gunluk:${ilkGun.quest_id}` : ilkHft ? `haftalik:${ilkHft.quest_id}` : alinabilirMi(hft?.sandik) ? "sandik" : null;

  // Alt yuva: hata mesajı (her zaman görünür kalsın) + TEK birincil düğme; ikisi de yoksa alan çöker.
  const alt = hazir > 0 || mesaj ? (
    <>
      {mesaj && <p className="gv-mesaj" role="alert">{mesaj}</p>}
      {hazir > 0 && (
        <QtDugme tamGenislik boyut="o" className="gv-toplu" yukleniyor={islem === "toplu"} devreDisi={Boolean(islem) && islem !== "toplu"}
                 onClick={() => { dokunus(); topluAl(); }}>{tt("Ödülü al ({n})", { n: sayiMetni(hazir) })}</QtDugme>
      )}
    </>
  ) : null;

  return (
    <QtSahne baslik={tt("Görevler")}
             ust={veri ? <GunOzeti ozet={ozet} gun={gun} okunma={okunma} bitti={yukle} gunBitti={gunBitti} tamamAni={tamamAni} /> : null}
             alt={alt}>
      <div className="gv-sayfa">
        <p className="qt-gizli" role="status" aria-live="polite">{duyuru}</p>

        {!veri && !hata && (
          <div className="gv-yukleniyor" role="status" aria-busy="true">
            <span className="qt-gizli">{tt("Yükleniyor…")}</span>
            <QtIskelet tur="kart" yukseklik="92px" />
            <QtIskelet tur="kart" yukseklik="92px" />
            <QtIskelet tur="kart" yukseklik="92px" />
          </div>
        )}
        {hata && (
          <div className="gv-hata-kutu">
            <DurumKutusu durum="hata" onTekrar={yukle} metin={tt("Görevler alınamadı. Bağlantını kontrol edip tekrar dene.")} />
          </div>
        )}

        {veri && (
          <>
            <Bolum id="gv-gunluk" etiket={tt("Günlük|bölüm")}>
              {gun.gorevler.map((g, i) => (
                <GorevSatiri key={g.quest_id} g={g} gunluk dil={dil} sezonAcik={sezonAcik} sira={i} sirali={sirali}
                             islemde={islem === `gunluk:${g.quest_id}`} mesgul={Boolean(islem)}
                             onAl={() => { dokunus(); gorevAlIslem("gunluk", g); }} ucan={ucan(`gunluk:${g.quest_id}`)} nabiz={ilkAlinabilir === `gunluk:${g.quest_id}`} />
              ))}
            </Bolum>

            <HaftalikBolum yenilenmeSn={hft.yenilenme_sn} okunma={okunma} bitti={yukle}>
              {hft.gorevler.map((g, i) => (
                <GorevSatiri key={g.quest_id} g={g} gunluk={false} dil={dil} sezonAcik={sezonAcik} sira={gunAdet + i} sirali={sirali}
                             islemde={islem === `haftalik:${g.quest_id}`} mesgul={Boolean(islem)}
                             onAl={() => { dokunus(); gorevAlIslem("haftalik", g); }} ucan={ucan(`haftalik:${g.quest_id}`)} nabiz={ilkAlinabilir === `haftalik:${g.quest_id}`} />
              ))}
              {hft.sandik && (
                <SandikSatiri s={hft.sandik} sezonAcik={sezonAcik} sira={gunAdet + hft.gorevler.length} sirali={sirali} islemde={islem === "sandik"} mesgul={Boolean(islem)}
                              onAc={() => { dokunus(); sandikAc(); }} ucan={ucan("sandik")} nabiz={ilkAlinabilir === "sandik"} />
              )}
            </HaftalikBolum>
          </>
        )}
      </div>
    </QtSahne>
  );
}
