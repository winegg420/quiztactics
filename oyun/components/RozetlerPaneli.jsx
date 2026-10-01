/**
 * PROFİL › ROZETLER — gruplara ayrılmış madalyon ızgarası, ilerleme, açıklama ve VİTRİN (3 rozet).
 * Veri: rozetlerim() / rozetVitriniSec() (oyun/lib/rozet.js). Kazanma mantığı sunucuda.
 * Listelerde madalyonlar durağandır.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import RozetMadalyonu from "./RozetMadalyonu.jsx";
import DurumKutusu from "./DurumKutusu.jsx";
import { useBirKezSirali } from "./KoleksiyonDokumu.jsx";
import { rozetlerim, rozetVitriniSec } from "../lib/rozet.js";
import { oyuncuKartiUnut } from "../lib/cerceve.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtIlerleme, QtKart, QtModal, QtRozet, dokunus, sayiBicim, sinif, siraStili } from "../tasarim/index.js";
import "../tasarim/ekranlar/rozet-panel.css";

const KADEME_ADI = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas" };
// "Yeni": sunucunun verdiği kazanıldı_at son 24 saat içindeyse (rozetlerim() ayrı bir "görüldü" alanı döndürmez).
const YENI_MS = 24 * 3600 * 1000;
const yeniMi = (r) => {
  const t = r.kazanildi && r.kazanildi_at ? new Date(r.kazanildi_at).getTime() : NaN;
  return Number.isFinite(t) && Date.now() - t >= 0 && Date.now() - t < YENI_MS;
};

function tarih(t) {
  try { return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; }
}

/** Tek rozetin madalyonu (veri satırından). */
export function RozetGorseli({ r, boyut = 56, etiketli = false }) {
  const gizli = r.gizli && !r.kazanildi;
  return (
    <RozetMadalyonu grup={r.grup} kademe={r.kademe} boyut={boyut} kilitli={!r.kazanildi && !gizli} gizli={gizli}
                    anahtar={r.anahtar} ikon={r.ikon}
                    etiket={etiketli ? (gizli ? tt("Gizli rozet") : r.ad) : undefined} />
  );
}

export default function RozetlerPaneli({ userId }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(null);
  const [secili, setSecili] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [vitrinHata, setVitrinHata] = useState(null);
  // Sıralı giriş + yeni rozet parıltısı yalnız oturumdaki ilk açılışta (sekme değişiminde yeniden oynamaz).
  const sirali = useBirKezSirali("rozet", Boolean(veri));
  const ilkAcilis = useRef(sirali !== "").current;

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      setVeri(await rozetlerim());
    } catch (e) {
      setHata(hataMesaji(e, tt("Rozetler yüklenemedi.")));
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (!veri) {
    return (
      <QtKart className="qt-rp-kart">
        <DurumKutusu durum={hata ? "hata" : "yukleniyor"} metin={hata ?? undefined} onTekrar={yukle} satir={3} />
      </QtKart>
    );
  }

  const rozetler = [...(veri.rozetler ?? [])].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  const gruplar = [...(veri.gruplar ?? [])].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  const vitrin = veri.vitrin ?? [];
  const vitrinMax = veri.vitrin_max ?? 3;
  const bul = (k) => rozetler.find((r) => r.anahtar === k);

  const vitrinKaydet = async (yeni) => {
    setKaydediliyor(true);
    setVitrinHata(null);
    try {
      const kayit = await rozetVitriniSec(yeni);
      setVeri((v) => ({ ...v, vitrin: kayit }));
      oyuncuKartiUnut(userId);
    } catch (e) {
      setVitrinHata(hataMesaji(e, tt("Vitrin kaydedilemedi.")));
    } finally {
      setKaydediliyor(false);
    }
  };
  const vitrindeMi = secili ? vitrin.includes(secili.anahtar) : false;
  const sec = (r) => { dokunus(); setSecili(r); };
  const vitrinDegistir = () => {
    if (!secili) return;
    dokunus();
    vitrinKaydet(vitrindeMi ? vitrin.filter((k) => k !== secili.anahtar) : [...vitrin, secili.anahtar].slice(-vitrinMax));
  };

  return (
    <div className="qt-rp">
      <QtKart as="section" className={sinif("qt-rp-kart", sirali)} style={siraStili(0)} aria-labelledby="qt-rp-vitrin">
        <div className="qt-rp-baslik">
          <h2 id="qt-rp-vitrin" className="qt-baslik-3">{tt("Vitrinim")}</h2>
          <QtRozet ton="coin" boyut="k">{sayiBicim(veri.ozet?.kazanilan ?? 0)}/{sayiBicim(veri.ozet?.toplam ?? rozetler.length)}</QtRozet>
        </div>
        <p className="qt-kucuk qt-soluk">{tt("Profilinde ve oyuncu kartında görünen {n} rozet. Kazandığın bir rozete dokun, vitrine ekle.", { n: vitrinMax })}</p>
        <ul className="qt-rp-vitrin">
          {Array.from({ length: vitrinMax }, (_, i) => {
            const r = vitrin[i] ? bul(vitrin[i]) : null;
            return (
              <li key={i}>
                {r ? (
                  <button type="button" className="qt-rp-vitrin-yuva qt-rp-vitrin-yuva--dolu" onClick={() => sec(r)}>
                    <RozetGorseli r={r} boyut={64} />
                    <span className="qt-rp-ad">{r.ad}</span>
                  </button>
                ) : (
                  <span className="qt-rp-vitrin-yuva" aria-label={tt("Boş vitrin yeri")}><span className="qt-rp-bos" aria-hidden="true" /></span>
                )}
              </li>
            );
          })}
        </ul>
        {vitrinHata && !secili && <p className="qt-rp-hata" role="alert">{vitrinHata}</p>}
      </QtKart>

      {gruplar.map((g, gi) => {
        const liste = rozetler.filter((r) => r.grup === g.anahtar);
        if (!liste.length) return null;
        const kazanilan = liste.filter((r) => r.kazanildi).length;
        return (
          <QtKart as="section" key={g.anahtar} className={sinif("qt-rp-kart", sirali)} style={siraStili(gi + 1)} aria-labelledby={`qt-rp-g-${g.anahtar}`}>
            <div className="qt-rp-baslik">
              <h3 id={`qt-rp-g-${g.anahtar}`} className="qt-baslik-3">{g.ad}</h3>
              <span className="qt-kucuk qt-soluk">{kazanilan}/{liste.length}</span>
            </div>
            <ul className="qt-rp-izgara">
              {liste.map((r) => {
                const gizli = r.gizli && !r.kazanildi;
                const ilerliyor = !r.kazanildi && r.hedef > 0;
                const yeni = yeniMi(r);
                return (
                  <li key={r.anahtar}>
                    <button type="button" className={sinif("qt-rp-rozet", !r.kazanildi && "qt-rp-rozet--kilitli", yeni && "qt-rp-rozet--yeni")}
                            onClick={() => sec(r)}
                            aria-label={gizli ? tt("Gizli rozet") : `${r.ad}${r.kazanildi ? "" : ` — ${tt("Kilitli")}`}${yeni ? ` — ${tt("Yeni kazanıldı")}` : ""}`}>
                      <RozetGorseli r={r} boyut={56} />
                      {yeni && <span className="qt-rp-yeni" aria-hidden="true">{tt("Yeni")}</span>}
                      {yeni && ilkAcilis && <span className="qt-rb-parilti" aria-hidden="true" />}
                      <span className="qt-rp-ad">{gizli ? tt("Gizli rozet") : r.ad}</span>
                      {ilerliyor && (
                        <span className="qt-rp-ilerleme">
                          <QtIlerleme deger={r.deger ?? 0} en={r.hedef} ton="mor" etiket={`${r.deger ?? 0}/${r.hedef}`} />
                          <span className="qt-rp-sayi qt-sayi">{sayiBicim(r.deger ?? 0)}/{sayiBicim(r.hedef)}</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </QtKart>
        );
      })}

      <QtModal acik={Boolean(secili)} onKapat={() => { setSecili(null); setVitrinHata(null); }}
               baslik={secili ? (secili.gizli && !secili.kazanildi ? tt("Gizli rozet") : secili.ad) : ""}
               altlik={secili?.kazanildi ? (
                 <QtDugme tur={vitrindeMi ? "ikincil" : "birincil"} tamGenislik yukleniyor={kaydediliyor}
                          ikon={vitrindeMi ? "carpi" : "yildiz"} onClick={vitrinDegistir}>
                   {vitrindeMi ? tt("Vitrinden çıkar") : vitrin.length >= vitrinMax ? tt("Vitrine koy (ilkinin yerine)") : tt("Vitrine koy")}
                 </QtDugme>
               ) : null}>
        {secili && (
          <div className="qt-rp-detay">
            <RozetGorseli r={secili} boyut={120} etiketli />
            {!(secili.gizli && !secili.kazanildi) ? (
              <>
                <div className="qt-rp-detay-etiketler">
                  <span className="qt-rp-kademe" data-kademe={secili.kademe}>{tt(KADEME_ADI[secili.kademe] ?? "")}</span>
                  {secili.coin > 0 && <QtRozet ton="coin" ikon="coin" boyut="k">+{sayiBicim(secili.coin)}</QtRozet>}
                </div>
                {secili.aciklama && <p className="qt-govde">{secili.aciklama}</p>}
                {secili.cerceve && <p className="qt-kucuk qt-soluk">{tt("Bu rozet bir avatar çerçevesi de verir.")}</p>}
              </>
            ) : (
              <p className="qt-govde">{tt("Nasıl kazanılacağı sır. Oynamaya devam et, kazandığında adı ortaya çıkar.")}</p>
            )}
            {secili.kazanildi ? (
              <p className="qt-kucuk qt-soluk">{tt("Kazanıldı: {t}", { t: tarih(secili.kazanildi_at) })}</p>
            ) : secili.hedef > 0 ? (
              <div className="qt-rp-detay-ilerleme">
                <QtIlerleme deger={secili.deger ?? 0} en={secili.hedef} ton="mor" boyut="b" etiket={tt("İlerleme")} />
                <span className="qt-sayi">{sayiBicim(secili.deger ?? 0)}/{sayiBicim(secili.hedef)}</span>
              </div>
            ) : null}
            {vitrinHata && <p className="qt-rp-hata" role="alert">{vitrinHata}</p>}
          </div>
        )}
      </QtModal>
    </div>
  );
}
