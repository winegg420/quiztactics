// ============================================================
// GÖREVLER (/gorevler) — günlük (kolay/orta/zor) + haftalık görevler + haftalık sandık.
// Bütün sayılar, "alınabilir/alındı" kararı ve ödüller SUNUCUDAN gelir (oyun/lib/gorevler.js); istemci hesap yapmaz,
// ödül vermez — yalnız RPC çağırır ve cevabı çizer. Animasyonda sunucunun döndüğü GERÇEK coin/SP kullanılır
// (günlük coin tavanı yüzünden coin, ödül çipinden az olabilir; sezon kapalıyken SP null).
// SP çipleri ve alt not yalnız sezon sistemi görünürken (sezon_ozetim.gorunur) çizilir: kapalıyken SP verilmez.
// Hareketi azalt: uçan ödül çipi yerinde kalıp solar (gorevler.css; yumuşak mod: data-yumusak).
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QtIkon, QtDugme, QtIkonDugme, QtIskelet } from "../tasarim/index.js";
import { CoinIkon } from "../components/ParaIkonlari.jsx";
import DurumKutusu from "../components/DurumKutusu.jsx";
import { tt, aktifDil } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji } from "../lib/hata.js";
import { y } from "../lib/yol.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { sesCoin, sesRozet } from "../lib/ses.js";
import { coinTazele } from "../lib/coin.js";
import { sezonTazele, useSezonOzeti } from "../lib/sezonYolu.js";
import { useGorevler, gorevAl, sandikAl, kalanMetni, useKalanSn } from "../lib/gorevler.js";
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
const UCUS_MS = 2200;   // uçan ödül çipinin ekranda kalma süresi

const sayiMetni = (n) => Number(n ?? 0).toLocaleString(aktifDil() === "en" ? "en-US" : "tr-TR");

function OdulCipleri({ odul, sezonAcik }) {
  const coin = Number(odul?.coin) || 0;
  const sp = Number(odul?.sp) || 0;
  return (
    <span className="gv-oduller">
      {coin > 0 && <span className="gv-cip"><CoinIkon boyut={16} /><b>{sayiMetni(coin)}</b><span className="qt-gizli"> coin</span></span>}
      {sezonAcik && sp > 0 && <span className="gv-cip"><QtIkon ad="hizli" boyut={14} /><b>{sayiMetni(sp)} SP</b></span>}
    </span>
  );
}

function Tik({ etiket }) {
  return <span className="gv-tik" role="img" aria-label={etiket}><QtIkon ad="onay" boyut={20} /></span>;
}

function Ucan({ coin, sp, ek }) {
  // Görsel ipucu; ekran okuyucuya üstteki canlı bölge (role=status) söyler.
  return (
    <span className="gv-ucan" aria-hidden="true" data-yumusak>
      {coin > 0 && <span className="gv-ucan-oge"><CoinIkon boyut={16} />+{sayiMetni(coin)}</span>}
      {sp != null && sp > 0 && <span className="gv-ucan-oge"><QtIkon ad="hizli" boyut={14} />+{sayiMetni(sp)} SP</span>}
      {ek && <span className="gv-ucan-oge">{ek}</span>}
      {!(coin > 0) && !(sp > 0) && !ek && <span className="gv-ucan-oge">{tt("Alındı")}</span>}
    </span>
  );
}

function GorevKarti({ g, gunluk, dil, sezonAcik, islemde, mesgul, onAl, ucan }) {
  const durum = g.alindi ? "alindi" : g.alinabilir ? "alinabilir" : "devam";
  const ad = dil === "en" ? (g.ad_en || g.ad_tr) : g.ad_tr;
  const hedef = Math.max(1, Number(g.hedef) || 1);
  const ilerleme = Math.min(Math.max(0, Number(g.ilerleme) || 0), hedef);
  const yuzde = Math.round((ilerleme / hedef) * 100);
  const kategori = g.sayac === "kategori_dogru" && g.parametre?.kategori ? kategoriAdi(g.parametre.kategori) : null;
  return (
    <li className={`gv-kart gv-kart--${durum}`}>
      <span className={`gv-ik ${gunluk ? "gv-ik--gun" : "gv-ik--hft"}`} aria-hidden="true">
        <QtIkon ad={IKON[g.sayac] ?? "hedef"} boyut={22} />
      </span>
      <div className="gv-govde">
        <div className="gv-baslik">
          <b className="gv-ad">{ad}</b>
          {gunluk && g.zorluk && <span className={`gv-zor gv-zor--${g.zorluk}`}>{tt(ZORLUK[g.zorluk] ?? g.zorluk)}</span>}
          {kategori && <span className="gv-kat">{kategori}</span>}
        </div>
        <div className="gv-bar" role="progressbar" aria-label={ad} aria-valuemin={0} aria-valuemax={hedef} aria-valuenow={ilerleme}
             aria-valuetext={tt("{a} / {b}", { a: ilerleme, b: hedef })}>
          <i style={{ width: `${yuzde}%` }} />
        </div>
        <OdulCipleri odul={g.odul} sezonAcik={sezonAcik} />
      </div>
      <div className="gv-sag">
        {durum === "alindi" && <Tik etiket={tt("Alındı")} />}
        {durum === "alinabilir" && (
          <QtDugme boyut="k" className="gv-al" yukleniyor={islemde} devreDisi={mesgul && !islemde}
                   aria-label={tt("{ad} ödülünü al", { ad })} onClick={onAl}>{tt("Al|görev")}</QtDugme>
        )}
        {durum === "devam" && <b className="gv-sayi" aria-hidden="true">{tt("{a} / {b}", { a: ilerleme, b: hedef })}</b>}
      </div>
      {ucan && <Ucan coin={ucan.coin} sp={ucan.sp} />}
    </li>
  );
}

function SandikKarti({ s, sezonAcik, islemde, mesgul, onAc, ucan }) {
  const durum = s.alindi ? "alindi" : s.alinabilir ? "alinabilir" : "kilitli";
  const hedef = Number(s.hedef) || 3;
  const tamam = Math.min(Number(s.tamam) || 0, hedef);
  const jokerAd = SKILL_TANIMLARI[s.joker?.tur]?.ad ?? tt("Joker");
  const jokerAdet = Number(s.joker?.adet) || 0;
  const sp = Number(s.sp) || 0;
  return (
    <li className={`gv-kart gv-sandik gv-sandik--${durum}`}>
      <span className="gv-ik gv-ik--sandik" aria-hidden="true"><QtIkon ad="hediye" boyut={28} /></span>
      <div className="gv-govde">
        <b className="gv-ad">{tt("Haftalık sandık")}</b>
        <span className="gv-alt">{tt("{n} haftalık görevi bitir", { n: hedef })}</span>
        <span className="gv-oduller">
          {sezonAcik && sp > 0 && <span className="gv-cip"><QtIkon ad="hizli" boyut={14} /><b>{sayiMetni(sp)} SP</b></span>}
          {jokerAdet > 0 && <span className="gv-cip"><QtIkon ad="degistir" boyut={14} /><b>{jokerAd} ×{jokerAdet}</b></span>}
        </span>
      </div>
      <div className="gv-sag">
        {durum === "alindi" && <Tik etiket={tt("Alındı")} />}
        {durum === "alinabilir" && (
          <QtDugme boyut="k" className="gv-al" yukleniyor={islemde} devreDisi={mesgul && !islemde} onClick={onAc}>{tt("Sandığı aç")}</QtDugme>
        )}
        {durum === "kilitli" && (
          <span className="gv-cip gv-cip--kilit" role="img" aria-label={tt("Kilitli: {a} / {b} görev alındı", { a: tamam, b: hedef })}>
            <QtIkon ad="kilit" boyut={14} /><b>{tamam} / {hedef}</b>
          </span>
        )}
      </div>
      {ucan && <Ucan coin={0} sp={ucan.sp} ek={ucan.ek} />}
    </li>
  );
}

function Bolum({ id, baslik, ikon, yenilenmeSn, okunma, bitti, children }) {
  const kalan = useKalanSn(yenilenmeSn, okunma, bitti);
  const sure = kalanMetni(kalan);
  return (
    <section className="gv-bolum" aria-labelledby={id}>
      <div className="gv-bolum-ust">
        <h2 id={id} className="gv-h2">{baslik}</h2>
        <span className="gv-cip gv-cip--sure">
          <QtIkon ad={ikon} boyut={14} />
          <span aria-hidden="true">{sure}</span>
          <span className="qt-gizli">{tt("Kalan süre: {s}", { s: sure })}</span>
        </span>
      </div>
      <ul className="gv-liste">{children}</ul>
    </section>
  );
}

export default function GorevlerPage() {
  const navigate = useNavigate();
  const { dil } = useDil();
  const { veri, hata, yukle } = useGorevler();
  const { ozet } = useSezonOzeti();
  const sezonAcik = ozet?.gorunur === true;
  const [islem, setIslem] = useState(null);      // "gunluk:<id>" | "haftalik:<id>" | "sandik"
  const [mesaj, setMesaj] = useState(null);
  const [ucan, setUcan] = useState(null);        // { anahtar, coin, sp, ek }
  const [duyuru, setDuyuru] = useState("");
  const zaman = useRef(null);
  useEffect(() => () => clearTimeout(zaman.current), []);

  const geri = useCallback(() => {
    try {
      if (window.history.length > 1) { navigate(-1); return; }
    } catch { /* geçmiş okunamadı */ }
    navigate(y("/"));
  }, [navigate]);

  const goster = (yeni, duyuruMetni) => {
    clearTimeout(zaman.current);
    setUcan(yeni);
    setDuyuru(duyuruMetni);
    zaman.current = setTimeout(() => setUcan(null), UCUS_MS);
  };

  const gorevAlIslem = async (kapsam, g) => {
    if (islem) return;
    const anahtar = `${kapsam}:${g.quest_id}`;
    setIslem(anahtar);
    setMesaj(null);
    try {
      const r = await gorevAl(kapsam, g.quest_id);
      if (r?.alindi) {
        const coin = Number(r.coin) || 0;
        const sp = r.sp == null ? null : Number(r.sp) || 0;
        try { sesCoin(); } catch { /* ses kritik değil */ }
        coinTazele();
        if (sezonAcik) sezonTazele();
        const parcalar = [];
        if (coin > 0) parcalar.push(tt("{n} coin", { n: sayiMetni(coin) }));
        if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
        goster({ anahtar, coin, sp }, tt("Ödül alındı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
      }
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
      const r = await sandikAl();
      if (r?.alindi) {
        const sp = r.sp == null ? null : Number(r.sp) || 0;
        const adet = Number(r.joker?.adet) || 0;
        const ad = SKILL_TANIMLARI[r.joker?.tur]?.ad ?? tt("Joker");
        const ek = adet > 0 ? `${ad} ×${adet}` : null;
        try { sesRozet(); } catch { /* ses kritik değil */ }
        if (sezonAcik) sezonTazele();
        const parcalar = [];
        if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
        if (ek) parcalar.push(ek);
        goster({ anahtar: "sandik", coin: 0, sp, ek }, tt("Sandık açıldı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
      }
    } catch (e) {
      setMesaj(hataMesaji(e, tt("Sandık açılamadı. Tekrar dener misin?")));
    } finally {
      await yukle();
      setIslem(null);
    }
  };

  const gun = veri?.gunluk;
  const hft = veri?.haftalik;
  const okunma = veri?.okunma;

  return (
    <div className="gv-sayfa">
      <header className="gv-ust">
        <QtIkonDugme ikon="geri" etiket={tt("Geri")} tur="yuzey" onClick={geri} />
        <h1 className="gv-h1">{tt("Görevler")}</h1>
      </header>
      <p className="qt-gizli" role="status" aria-live="polite">{duyuru}</p>

      {!veri && !hata && (
        <div className="gv-yukleniyor" role="status" aria-busy="true">
          <span className="qt-gizli">{tt("Yükleniyor…")}</span>
          <QtIskelet tur="kart" yukseklik="96px" />
          <QtIskelet tur="kart" yukseklik="96px" />
          <QtIskelet tur="kart" yukseklik="96px" />
        </div>
      )}
      {hata && (
        <div className="gv-hata-kutu">
          <DurumKutusu durum="hata" onTekrar={yukle} metin={tt("Görevler alınamadı. Bağlantını kontrol edip tekrar dene.")} />
        </div>
      )}

      {veri && (
        <>
          <Bolum id="gv-gunluk" baslik={tt("Günlük görevler")} ikon="saat" yenilenmeSn={gun.yenilenme_sn} okunma={okunma} bitti={yukle}>
            {gun.gorevler.map((g) => (
              <GorevKarti key={g.quest_id} g={g} gunluk dil={dil} sezonAcik={sezonAcik}
                          islemde={islem === `gunluk:${g.quest_id}`} mesgul={Boolean(islem)}
                          onAl={() => gorevAlIslem("gunluk", g)} ucan={ucan?.anahtar === `gunluk:${g.quest_id}` ? ucan : null} />
            ))}
          </Bolum>

          <Bolum id="gv-haftalik" baslik={tt("Haftalık görevler")} ikon="takvim" yenilenmeSn={hft.yenilenme_sn} okunma={okunma} bitti={yukle}>
            {hft.gorevler.map((g) => (
              <GorevKarti key={g.quest_id} g={g} gunluk={false} dil={dil} sezonAcik={sezonAcik}
                          islemde={islem === `haftalik:${g.quest_id}`} mesgul={Boolean(islem)}
                          onAl={() => gorevAlIslem("haftalik", g)} ucan={ucan?.anahtar === `haftalik:${g.quest_id}` ? ucan : null} />
            ))}
            {hft.sandik && (
              <SandikKarti s={hft.sandik} sezonAcik={sezonAcik} islemde={islem === "sandik"} mesgul={Boolean(islem)}
                           onAc={sandikAc} ucan={ucan?.anahtar === "sandik" ? ucan : null} />
            )}
          </Bolum>
        </>
      )}

      {mesaj && <p className="gv-mesaj" role="alert">{mesaj}</p>}
      {veri && sezonAcik && (
        <p className="gv-not">{tt("Görev SP'leri sezon yoluna işler. Battle Pass sahibinde SP ×1,25.")}</p>
      )}
    </div>
  );
}
