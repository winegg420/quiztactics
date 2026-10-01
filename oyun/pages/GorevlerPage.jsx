// ============================================================
// GÖREVLER (/gorevler) — günlük (kolay/orta/zor) + haftalık görevler + haftalık sandık.
// Bütün sayılar, "alınabilir/alındı" kararı ve ödüller SUNUCUDAN gelir (oyun/lib/gorevler.js); istemci hesap yapmaz,
// ödül vermez — yalnız RPC çağırır ve cevabı çizer. Animasyonda sunucunun döndüğü GERÇEK coin/SP kullanılır
// (günlük coin tavanı yüzünden coin, ödül çipinden az olabilir; sezon kapalıyken SP null).
// SP çipleri ve alt not yalnız sezon sistemi görünürken (sezon_ozetim.gorunur) çizilir: kapalıyken SP verilmez.
// Hareketi azalt: uçan ödül çipi yerinde kalıp solar (gorevler.css; yumuşak mod: data-yumusak).
// Oyun hissi (1 Eki 2026): sıralı kart girişi, alınabilir nabzı, alma anında titreşim + parıltı, sandıkta konfeti, zorluk şeridi,
// özet şerit. Hepsi yalnız GÖRSEL: gösterilen her sayı yine sunucudan gelen alanlardan okunur.
// Ortak parçalar (1 Eki 2026, Aşama 0): görünüm `qt-oyk-*` (tasarim/oyun-hissi.css) + `qt-h-*` (hareket.css) + OdulAni'den gelir;
// bu sayfada yalnız yerleşim kalır. `gv-` sınıfları stil taşımaz: ölçüm betiğinin (araclar/gorevler-ekran.mjs) kancalarıdır.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QtIkon, QtDugme, QtIkonDugme, QtIskelet, QtIlerleme, QtAfis, sinif, siraStili, useSiraliGiris } from "../tasarim/index.js";
import { CoinIkon } from "../components/ParaIkonlari.jsx";
import DurumKutusu from "../components/DurumKutusu.jsx";
import OdulAni, { UcanOge, useOdulAni } from "../components/OdulAni.jsx";
import { tt, aktifDil } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji } from "../lib/hata.js";
import { y } from "../lib/yol.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { coinTazele } from "../lib/coin.js";
import { sezonTazele, useSezonOzeti } from "../lib/sezonYolu.js";
import { useGorevler, gorevAl, sandikAl, gorevOzeti, kalanMetni, useKalanSn } from "../lib/gorevler.js";
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
// Kart ağırlığı (şerit + ikon rengi + kabartma): zorluk ekseni — kolay yeşil · orta kehribar · zor MOR (kırmızı rakip/Düello rengidir).
const ZORLUK_KART = { kolay: "qt-oyk--ton-dogru qt-oyk--hafif", orta: "qt-oyk--ton-uyari", zor: "qt-oyk--ton-mor qt-oyk--agir" };
const ZORLUK_ETIKET = { kolay: "dogru", orta: "uyari", zor: "mor" };
const HAFTALIK_KART = "qt-oyk--ton-coin qt-oyk--agir";
const DURUM_KART = { alindi: "qt-oyk--tamam", alinabilir: "qt-oyk--alinabilir" };
const ACIL_SN = 3600;   // yenilenmeye bundan az kaldıysa süre çipi aciliyet rengine geçer

const sayiMetni = (n) => Number(n ?? 0).toLocaleString(aktifDil() === "en" ? "en-US" : "tr-TR");

function OdulCipleri({ odul, sezonAcik }) {
  const coin = Number(odul?.coin) || 0;
  const sp = Number(odul?.sp) || 0;
  return (
    <span className="qt-oyk-oduller">
      {coin > 0 && <span className="qt-oyk-cip gv-cip"><CoinIkon boyut={16} /><b>{sayiMetni(coin)}</b><span className="qt-gizli"> coin</span></span>}
      {sezonAcik && sp > 0 && <span className="qt-oyk-cip gv-cip"><QtIkon ad="hizli" boyut={14} /><b>{sayiMetni(sp)} SP</b></span>}
    </span>
  );
}

function Tik({ etiket }) {
  return <span className="qt-oyk-tik gv-tik" role="img" aria-label={etiket}><QtIkon ad="onay" boyut={20} /></span>;
}

// Uçan çipin içeriği (OdulAni çizer). Görsel ipucu; ekran okuyucuya üstteki canlı bölge (role=status) söyler.
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

function GorevKarti({ g, gunluk, dil, sezonAcik, islemde, mesgul, onAl, ucan, sira, sirali, nabiz }) {
  const durum = g.alindi ? "alindi" : g.alinabilir ? "alinabilir" : "devam";
  const ad = dil === "en" ? (g.ad_en || g.ad_tr) : g.ad_tr;
  const hedef = Math.max(1, Number(g.hedef) || 1);
  const ilerleme = Math.min(Math.max(0, Number(g.ilerleme) || 0), hedef);
  const yuzde = Math.round((ilerleme / hedef) * 100);
  const kategori = g.sayac === "kategori_dogru" && g.parametre?.kategori ? kategoriAdi(g.parametre.kategori) : null;
  // Kart ağırlığı: günlükte zorluğa göre şerit/ikon rengi, haftalıkta altın.
  const agirlik = gunluk ? ZORLUK_KART[g.zorluk] : HAFTALIK_KART;
  return (
    <li className={sinif("qt-oyk", agirlik, DURUM_KART[durum], nabiz && "qt-h-nabiz", ucan && "qt-oyk--kutla", sirali,
                         "gv-kart", `gv-kart--${durum}`)} style={siraStili(sira)}>
      <span className="qt-oyk-ik" aria-hidden="true">
        <QtIkon ad={IKON[g.sayac] ?? "hedef"} boyut={22} />
      </span>
      <div className="qt-oyk-govde">
        <div className="qt-oyk-baslik">
          <b className="qt-oyk-ad gv-ad">{ad}</b>
          {gunluk && g.zorluk && (
            <span className={sinif("qt-oyk-etiket", ZORLUK_ETIKET[g.zorluk] && `qt-oyk-etiket--${ZORLUK_ETIKET[g.zorluk]}`, `gv-zor gv-zor--${g.zorluk}`)}>
              {tt(ZORLUK[g.zorluk] ?? g.zorluk)}
            </span>
          )}
          {kategori && <span className="qt-oyk-etiket qt-oyk-etiket--bilgi gv-kat">{kategori}</span>}
        </div>
        {/* Dolgu tam yüzdeye yuvarlanır (önceki görünümle aynı); ekran okuyucu gerçek ilerleme/hedef değerini okur. */}
        <QtIlerleme konturlu canli parilti={durum === "alinabilir"} ton={durum === "alindi" ? "dogru" : "vurgu"} deger={yuzde} en={100} etiket={ad}
                    aria-valuemax={hedef} aria-valuenow={ilerleme} aria-valuetext={tt("{a} / {b}", { a: ilerleme, b: hedef })} />
        <OdulCipleri odul={g.odul} sezonAcik={sezonAcik} />
      </div>
      <div className={sinif("qt-oyk-sag", nabiz && "qt-h-hop")}>
        {durum === "alindi" && <Tik etiket={tt("Alındı")} />}
        {durum === "alinabilir" && (
          <QtDugme boyut="k" className="qt-oyk-al gv-al" yukleniyor={islemde} devreDisi={mesgul && !islemde}
                   aria-label={tt("{ad} ödülünü al", { ad })} onClick={onAl}>{tt("Al|görev")}</QtDugme>
        )}
        {durum === "devam" && <b className="qt-oyk-sayi gv-sayi" aria-hidden="true">{tt("{a} / {b}", { a: ilerleme, b: hedef })}</b>}
      </div>
      <OdulAni aktif={Boolean(ucan)} ucanSinif="gv-ucan">{ucan && <UcanIcerik coin={ucan.coin} sp={ucan.sp} />}</OdulAni>
    </li>
  );
}

function SandikKarti({ s, sezonAcik, islemde, mesgul, onAc, ucan, sira, sirali, nabiz }) {
  const durum = s.alindi ? "alindi" : s.alinabilir ? "alinabilir" : "kilitli";
  const hedef = Number(s.hedef) || 3;
  const tamam = Math.min(Number(s.tamam) || 0, hedef);
  const jokerAd = SKILL_TANIMLARI[s.joker?.tur]?.ad ?? tt("Joker");
  const jokerAdet = Number(s.joker?.adet) || 0;
  const sp = Number(s.sp) || 0;
  return (
    <li className={sinif("qt-oyk qt-oyk--altin", DURUM_KART[durum], nabiz && "qt-h-nabiz", ucan && "qt-oyk--kutla", sirali,
                         "gv-kart gv-sandik", `gv-sandik--${durum}`)} style={siraStili(sira)}>
      <span className={sinif("qt-oyk-ik qt-oyk-ik--b", durum === "alinabilir" && "qt-h-salla-ara")} aria-hidden="true"><QtIkon ad="hediye" boyut={28} /></span>
      <div className="qt-oyk-govde">
        <b className="qt-oyk-ad gv-ad">{tt("Haftalık sandık")}</b>
        <span className="qt-oyk-alt gv-alt">{tt("{n} haftalık görevi bitir", { n: hedef })}</span>
        {/* x/hedef nokta ilerlemesi — sayılar sunucunun `tamam`/`hedef` alanı; ekran okuyucu sağdaki kilit çipini okur. */}
        <span className="qt-oyk-noktalar" aria-hidden="true">
          {Array.from({ length: hedef }, (_, i) => <i key={i} className={sinif("qt-oyk-nokta", i < tamam && "qt-oyk-nokta--dolu")} />)}
        </span>
        <span className="qt-oyk-oduller">
          {sezonAcik && sp > 0 && <span className="qt-oyk-cip gv-cip"><QtIkon ad="hizli" boyut={14} /><b>{sayiMetni(sp)} SP</b></span>}
          {jokerAdet > 0 && <span className="qt-oyk-cip gv-cip"><QtIkon ad="degistir" boyut={14} /><b>{jokerAd} ×{jokerAdet}</b></span>}
        </span>
      </div>
      <div className={sinif("qt-oyk-sag", nabiz && "qt-h-hop")}>
        {durum === "alindi" && <Tik etiket={tt("Alındı")} />}
        {durum === "alinabilir" && (
          <QtDugme boyut="k" className="qt-oyk-al gv-al" yukleniyor={islemde} devreDisi={mesgul && !islemde} onClick={onAc}>{tt("Sandığı aç")}</QtDugme>
        )}
        {durum === "kilitli" && (
          <span className="qt-oyk-cip qt-oyk-cip--kilit gv-cip" role="img" aria-label={tt("Kilitli: {a} / {b} görev alındı", { a: tamam, b: hedef })}>
            <QtIkon ad="kilit" boyut={14} /><b>{tamam} / {hedef}</b>
          </span>
        )}
      </div>
      {durum === "alinabilir" && !ucan && <span className="qt-h-isilti qt-h-isilti--dongu" aria-hidden="true" />}
      <OdulAni aktif={Boolean(ucan)} buyuk konfeti ucanSinif="gv-ucan">{ucan && <UcanIcerik coin={0} sp={ucan.sp} ek={ucan.ek} />}</OdulAni>
    </li>
  );
}

function Bolum({ id, baslik, ikon, tur, baslikIkon, yenilenmeSn, okunma, bitti, children }) {
  const kalan = useKalanSn(yenilenmeSn, okunma, bitti);
  const sure = kalanMetni(kalan);
  return (
    <section className="qt-oyk-bolum" aria-labelledby={id}>
      <div className="qt-oyk-bolum-ust">
        <h2 id={id} className="qt-oyk-bolum-baslik gv-h2">
          <span className={sinif("qt-oyk-bolum-ik", tur === "hft" && "qt-oyk-bolum-ik--altin")} aria-hidden="true"><QtIkon ad={baslikIkon} boyut={14} /></span>
          {baslik}
        </h2>
        <span className={sinif("qt-oyk-cip qt-oyk-cip--sure gv-cip", kalan < ACIL_SN && "qt-oyk-cip--acil")}>
          <QtIkon ad={ikon} boyut={14} />
          <span aria-hidden="true">{sure}</span>
          <span className="qt-gizli">{tt("Kalan süre: {s}", { s: sure })}</span>
        </span>
      </div>
      <ul className="qt-oyk-liste">{children}</ul>
    </section>
  );
}

export default function GorevlerPage() {
  const navigate = useNavigate();
  const { dil } = useDil();
  const { veri, hata, yukle } = useGorevler();
  const { ozet: sezonOzeti } = useSezonOzeti();
  const sezonAcik = sezonOzeti?.gorunur === true;
  const [islem, setIslem] = useState(null);      // "gunluk:<id>" | "haftalik:<id>" | "sandik"
  const [mesaj, setMesaj] = useState(null);
  const { kutla, ucan } = useOdulAni();          // ödül anı: ucan(anahtar) → { coin, sp, ek } | null
  const [duyuru, setDuyuru] = useState("");
  const sirali = useSiraliGiris(Boolean(veri));  // sıralı kart girişi yalnız ilk açılışta (veri yenilenince yeniden oynamaz)

  // "Bugünlük tamam": günlük görevlerin hepsi ALINMIŞ (sunucunun `alindi` alanı). Sayfa açıkken tamamlanırsa şeritte tek seferlik parıltı.
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

  const geri = useCallback(() => {
    try {
      if (window.history.length > 1) { navigate(-1); return; }
    } catch { /* geçmiş okunamadı */ }
    navigate(y("/"));
  }, [navigate]);

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
        coinTazele();
        if (sezonAcik) sezonTazele();
        const parcalar = [];
        if (coin > 0) parcalar.push(tt("{n} coin", { n: sayiMetni(coin) }));
        if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
        kutla(anahtar, { coin, sp }, { his: "odul", coinZipla: coin > 0 });   // üst çubuktaki coin hapı da bir kez zıplar
        setDuyuru(tt("Ödül alındı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
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
        if (sezonAcik) sezonTazele();
        const parcalar = [];
        if (sp != null && sp > 0) parcalar.push(tt("{n} SP", { n: sayiMetni(sp) }));
        if (ek) parcalar.push(ek);
        kutla("sandik", { coin: 0, sp, ek }, { his: "buyuk" });
        setDuyuru(tt("Sandık açıldı: {o}", { o: parcalar.join(", ") || tt("Alındı") }));
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
  const ozet = veri ? gorevOzeti(veri) : null;   // sayılar sunucu alanlarından (alinabilir = alinabilir_sayi)
  const gunAdet = gun?.gorevler?.length ?? 0;
  // Bir ekranda en çok 1 nabız: yalnız İLK alınabilir kart (günlük → haftalık → sandık sırasıyla) nabız + zıplama alır.
  const alinabilirMi = (g) => Boolean(g?.alinabilir) && !g.alindi;
  const ilkGun = gun?.gorevler?.find(alinabilirMi);
  const ilkHft = hft?.gorevler?.find(alinabilirMi);
  const ilkAlinabilir = ilkGun ? `gunluk:${ilkGun.quest_id}` : ilkHft ? `haftalik:${ilkHft.quest_id}` : alinabilirMi(hft?.sandik) ? "sandik" : null;

  return (
    <div className="gv-sayfa">
      {/* Afiş: geri + ikon diski + başlık; altında özet şerit (sayılar sunucudan). Günlüklerin hepsi alınınca "Bugünlük tamam". */}
      <QtAfis ikon="gorevListesi" baslik={tt("Görevler")} seritSinif={gunBitti ? "qt-oyk-ozet--tamam" : undefined}
              bas={<QtIkonDugme ikon="geri" etiket={tt("Geri")} tur="yuzey" onClick={geri} />}>
        {veri && (
          <>
            <span className="qt-oyk-ozet-metin">
              {gunBitti && <QtIkon ad="onay" boyut={16} />}
              {gunBitti ? tt("Bugünlük tamam") : tt("Bugün {a}/{b} tamam", { a: ozet.gunTamam, b: ozet.gunToplam })}
              {ozet.alinabilir > 0 && ` · ${tt(ozet.alinabilir === 1 ? "{n} ödül hazır" : "{n} ödül hazır|çoğul", { n: sayiMetni(ozet.alinabilir) })}`}
            </span>
            {ozet.alinabilir > 0 && (
              <span className="qt-oyk-ozet-hazir qt-h-hop" style={{ "--hop-gecikme": "900ms" }} aria-hidden="true">
                <QtIkon ad="hediye" boyut={14} />
              </span>
            )}
            {tamamAni && <span className="qt-h-isilti" style={{ "--isilti-kose": "0px" }} aria-hidden="true" />}
          </>
        )}
      </QtAfis>
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
          <Bolum id="gv-gunluk" tur="gun" baslikIkon="hedef" baslik={tt("Günlük görevler")} ikon="saat" yenilenmeSn={gun.yenilenme_sn} okunma={okunma} bitti={yukle}>
            {gun.gorevler.map((g, i) => (
              <GorevKarti key={g.quest_id} g={g} gunluk dil={dil} sezonAcik={sezonAcik} sira={i} sirali={sirali}
                          islemde={islem === `gunluk:${g.quest_id}`} mesgul={Boolean(islem)}
                          onAl={() => gorevAlIslem("gunluk", g)} ucan={ucan(`gunluk:${g.quest_id}`)} nabiz={ilkAlinabilir === `gunluk:${g.quest_id}`} />
            ))}
          </Bolum>

          <Bolum id="gv-haftalik" tur="hft" baslikIkon="yildiz" baslik={tt("Haftalık görevler")} ikon="takvim" yenilenmeSn={hft.yenilenme_sn} okunma={okunma} bitti={yukle}>
            {hft.gorevler.map((g, i) => (
              <GorevKarti key={g.quest_id} g={g} gunluk={false} dil={dil} sezonAcik={sezonAcik} sira={gunAdet + i} sirali={sirali}
                          islemde={islem === `haftalik:${g.quest_id}`} mesgul={Boolean(islem)}
                          onAl={() => gorevAlIslem("haftalik", g)} ucan={ucan(`haftalik:${g.quest_id}`)} nabiz={ilkAlinabilir === `haftalik:${g.quest_id}`} />
            ))}
            {hft.sandik && (
              <SandikKarti s={hft.sandik} sezonAcik={sezonAcik} sira={gunAdet + hft.gorevler.length} sirali={sirali} islemde={islem === "sandik"} mesgul={Boolean(islem)}
                           onAc={sandikAc} ucan={ucan("sandik")} nabiz={ilkAlinabilir === "sandik"} />
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
