/**
 * DÜKKÂN › EFEKT — Cevap İmzası (1040, Ida 10 Eki 2026). Beş ürün: Neon Tik · Yıldız Patlaması (Nadir, coin) · Bilgi Ampulü ·
 * Elektrik Akımı (Epik, elmas) · Yanan Kart (Efsanevi, elmas). Fiyat ve para sunucudan (kozmetik_katalogu: fiyat, icerik.para);
 * koda fiyat gömülmez.
 *
 * Her kart: ad, nadirlik rengi, fiyat, "Al" / "Sahipsin" + "Tak" / "Takılı · Çıkar". Karta dokununca KARTIN İÇİNDE küçük demo
 * açılır: mini soru kartı (4 şık), doğru şık yeşil olur ve imza GERÇEK bileşenle (CevapImzasi) oynar; "Tekrar oynat". Demo
 * herkese ücretsiz, ayrı sayfa yok.
 * Satış kapısı SUNUCUDA (kozmetik_satis_acik + cevap_imzasi_satis_acik): kapalıyken normal oyuncunun kataloğunda imza yok →
 * sekme hiç görünmez; sahip hesap hepsini görür ve satın almadan takar (mevcut sahip test modu, kozmetik_tak).
 * Satın alma anı mevcut kutlama (OdulAni) — YALNIZ sunucu başarı dönünce.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import CevapImzasi, { ImzaSimgesi } from "./CevapImzasi.jsx";
import JokerSatinAlModal from "./JokerSatinAlModal.jsx";
import { CoinFiyat, ElmasFiyat } from "./DukkanAuralar.jsx";
import NadirlikEtiketi from "./NadirlikEtiketi.jsx";
import OdulAni, { UcanOge, useOdulAni } from "./OdulAni.jsx";
import { dukkanNadirligi, kozmetikAdi } from "./DukkanKozmetik.jsx";
import { etiketNadirligi } from "./AvatarNadirlikGoruntu.jsx";
import { kozmetikHatasi, kozmetikParasi, kozmetikSatinAl, kozmetikTak } from "../lib/kozmetik.js";
import { CEVAP_IMZASI_TURU } from "../lib/cevapImzasi.js";
import { coinTazele } from "../lib/coin.js";
import { elmasTazele } from "../lib/elmas.js";
import { sesHataUyari } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";
import { QtBosDurum, QtDugme, QtIkon, QtSik, QtSikler, dokunus, siraStili } from "../tasarim/index.js";
import "../tasarim/ekranlar/cevap-imzasi.css";

const HARFLER = ["A", "B", "C", "D"];
const DEMO_DOGRU = 1;
const DEMO_SECIM_MS = 450;   // "seçildi" → "doğru" geçişi (maçtaki sonuç anı gibi)

/** Kalemin parası + fiyat rozeti. */
export function ImzaFiyat({ kalem, boyut = 16 }) {
  if (kalem?.fiyat == null) return null;
  return kozmetikParasi(kalem) === "coin" ? <CoinFiyat fiyat={kalem.fiyat} boyut={boyut} /> : <ElmasFiyat fiyat={kalem.fiyat} boyut={boyut} />;
}

/** Kartın içindeki demo: mini soru kartı + gerçek imza. `tekrar` her artışta yeniden oynar. */
function ImzaDemosu({ anahtar }) {
  const kapRef = useRef(null);
  const [tekrar, setTekrar] = useState(0);
  const [dogruGoster, setDogruGoster] = useState(false);
  useEffect(() => {
    setDogruGoster(false);
    const t = setTimeout(() => setDogruGoster(true), DEMO_SECIM_MS);
    return () => clearTimeout(t);
  }, [tekrar]);
  const siklar = [tt("İstanbul"), tt("Ankara"), tt("İzmir"), tt("Bursa")];
  const durum = (i) => (i === DEMO_DOGRU ? (dogruGoster ? "dogru" : "secili") : dogruGoster ? "solgun" : "kilitli");
  return (
    <div className="ci-dk-demo">
      <div ref={kapRef} aria-hidden="true" inert>
        <p className="ci-dk-demo-soru">{tt("Türkiye'nin başkenti neresidir?")}</p>
        <QtSikler etiket={tt("Şıklar")}>
          {siklar.map((s, i) => <QtSik key={i} harf={HARFLER[i]} metin={s} durum={durum(i)} />)}
        </QtSikler>
      </div>
      <CevapImzasi imza={anahtar} kapRef={kapRef} sira={DEMO_DOGRU} anahtar={dogruGoster ? `demo-${tekrar}` : null} />
      <QtDugme tur="ikincil" ikon="yenile" onClick={() => { dokunus(); setTekrar((n) => n + 1); }}>{tt("Tekrar oynat")}</QtDugme>
      <p className="ci-dk-demo-not">{tt("Doğru cevapladığında doğru şıkta oynar. Yalnız sen görürsün.")}</p>
    </div>
  );
}

export default function DukkanCevapImzasi({ katalog, sahipHesap = false, yenile, elmasYetmedi, coinYetmedi, onBilgi, onHata, elmasBakiye, coinBakiye, sirali }) {
  const { user } = useAuth();
  const liste = (katalog ?? []).filter((x) => x.tur === CEVAP_IMZASI_TURU).sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  const [acik, setAcik] = useState(() => liste.find((x) => x.takili)?.anahtar ?? null);   // demosu açık kart
  const [onay, setOnay] = useState(null);     // satın alma onayındaki kalem
  const [islem, setIslem] = useState(null);   // "tak:<anahtar>" | null
  const { kutla, ucan } = useOdulAni();

  if (liste.length === 0) {
    return <QtBosDurum boyut="k" ikon="dukkan" ton="mor" baslik={tt("Bu bölümde şu an satışta bir şey yok.")} />;
  }

  const satinAl = async (c) => {
    try {
      await kozmetikSatinAl(c.anahtar);
    } catch (e) {
      sesHataUyari();
      throw e;   // onay penceresi hatayı kendi içinde gösterir (kozmetikHatasi)
    }
    if (kozmetikParasi(c) === "coin") coinTazele(); else elmasTazele();
    onBilgi?.(tt("{ad} senin. Şimdi takabilirsin.", { ad: kozmetikAdi(c) }));
    await yenile?.();
    kutla(c.anahtar, {}, { his: "buyuk" });   // sunucu onayladı + katalog tazelendi → an
  };
  const tak = async (anahtar) => {
    if (islem) return;
    setIslem(`tak:${anahtar ?? "yok"}`);
    try {
      await kozmetikTak(CEVAP_IMZASI_TURU, anahtar, user?.id);
      onBilgi?.(anahtar ? tt("Takıldı.") : tt("Çıkarıldı."));
      await yenile?.();
    } catch (e) {
      onHata?.(kozmetikHatasi(e));
    } finally {
      setIslem(null);
    }
  };

  return (
    <div className="ci-dk">
      <ul className="ci-dk-liste">
        {liste.map((c, j) => {
          const n = etiketNadirligi(dukkanNadirligi(c));
          const testModu = sahipHesap && c.kapali && !c.sahip;
          const demoAcik = acik === c.anahtar;
          return (
            <li key={c.anahtar} className={sinifSirali(sirali, j)} style={siraStili(j)}>
              <div className="ci-dk-kart" data-nadirlik={n ?? undefined} data-acik={demoAcik || undefined}>
                {n && <NadirlikEtiketi nadirlik={n} />}
                <button type="button" className="ci-dk-ust" aria-expanded={demoAcik} aria-controls={`ci-dk-demo-${c.anahtar}`}
                        onClick={() => { dokunus(); setAcik(demoAcik ? null : c.anahtar); }}>
                  <ImzaSimgesi anahtar={c.anahtar} boyut={48} />
                  <span className="ci-dk-bilgi">
                    <b>{kozmetikAdi(c)}</b>
                    <small>{demoAcik ? tt("Önizlemeyi kapat") : tt("Dokun · önizle")}</small>
                  </span>
                  <span className="ci-dk-sag">
                    {c.takili ? <span className="ci-dk-durum">{tt("Takılı")}</span>
                      : c.sahip ? <span className="ci-dk-durum">{tt("Sahipsin")}</span>
                      : c.satilik ? <ImzaFiyat kalem={c} boyut={18} />
                      : <span className="ci-dk-kapali"><QtIkon ad="kilit" boyut={12} /> {tt("Kapalı")}</span>}
                    <QtIkon ad="asagi" boyut={18} className="ci-dk-ok" />
                  </span>
                </button>
                {demoAcik && <div id={`ci-dk-demo-${c.anahtar}`}><ImzaDemosu anahtar={c.anahtar} /></div>}
                {testModu && <span className="qt-kz-kapali"><QtIkon ad="kilit" boyut={12} /> {tt("Satışta değil — yalnız sen görüyorsun")}</span>}
                <div className="ci-dk-eylem">
                  {c.takili ? (
                    <QtDugme tur="ikincil" tamGenislik yukleniyor={islem === "tak:yok"} devreDisi={Boolean(islem)}
                             onClick={() => { dokunus(); tak(null); }}>{tt("Takılı · Çıkar")}</QtDugme>
                  ) : c.sahip || testModu ? (
                    <QtDugme tamGenislik ikon="onay" yukleniyor={islem === `tak:${c.anahtar}`} devreDisi={Boolean(islem)}
                             onClick={() => { dokunus(); tak(c.anahtar); }}>{testModu ? tt("Test için tak") : tt("Tak")}</QtDugme>
                  ) : c.satilik && c.fiyat != null ? (
                    <QtDugme tur="dogru" tamGenislik aria-haspopup="dialog" onClick={() => { dokunus(); setOnay(c); }}
                             aria-label={kozmetikParasi(c) === "coin" ? tt("{ad} al — {n} coin", { ad: kozmetikAdi(c), n: c.fiyat }) : tt("{ad} al — {n} elmas", { ad: kozmetikAdi(c), n: c.fiyat })}>
                      <span className="qt-dc-fiyat">{tt("Al")} <ImzaFiyat kalem={c} boyut={18} /></span>
                    </QtDugme>
                  ) : (
                    <QtDugme tur="ikincil" tamGenislik devreDisi ikon="kilit">{tt("Satılmıyor")}</QtDugme>
                  )}
                </div>
                <OdulAni aktif={Boolean(ucan(c.anahtar))} buyuk konfeti ucanSinif="qt-dc-ucan">
                  {ucan(c.anahtar) && <UcanOge><QtIkon ad="onay" boyut={16} />{tt("Senin!|ürün")}</UcanOge>}
                </OdulAni>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="qt-kucuk qt-soluk-zemin qt-dc-not">
        {tt("Aldıkların Profil › Koleksiyon'da; oradan takıp çıkarabilirsin.")}{" "}
        <Link to={y("/profil?sekme=koleksiyon")}>{tt("Koleksiyonuna bak")}</Link>
      </p>
      {onay && (
        <JokerSatinAlModal
          para={kozmetikParasi(onay)}
          kalanGoster
          yalnizAl
          onayMetni={tt("Al")}
          coin={kozmetikParasi(onay) === "coin" ? coinBakiye : elmasBakiye}
          baslik={kozmetikAdi(onay)}
          aciklama={tt("Doğru cevapladığında doğru şıkta oynar. Yalnız sen görürsün.")}
          gorsel={<ImzaSimgesi anahtar={onay.anahtar} boyut={64} />}
          nadirlik={etiketNadirligi(dukkanNadirligi(onay)) ?? undefined}
          fiyat={onay.fiyat}
          hataCevir={kozmetikHatasi}
          yetersizEylem={() => { setOnay(null); if (kozmetikParasi(onay) === "coin") coinYetmedi?.(); else elmasYetmedi?.(); }}
          onOnay={() => satinAl(onay)}
          onKapat={() => setOnay(null)}
        />
      )}
    </div>
  );
}

/** Sıralı giriş yalnız ilk 8 kartta (Dükkân deseni). */
const sinifSirali = (sirali, j) => (j < 8 ? sirali : undefined);
