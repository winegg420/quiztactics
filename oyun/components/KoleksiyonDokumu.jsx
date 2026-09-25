/**
 * KOLEKSİYON DÖKÜMÜ (646) — profilde "42 rozet · 3 unvan · Koleksiyon 1.240" + kategori ve nadirlik dağılımı.
 * Oyun avantajı YOK, yalnız statü. Nadirliği henüz tanımsız kalemler (unvan, kozmetik, avatar) puana girmez; adedi
 * "puanı henüz yok" olarak sayılır. Veri: koleksiyonDokum() (oyun/lib/koleksiyon.js).
 * <KoleksiyonDokumu />          — özet satırı + nadirlik çubuğu
 * <KoleksiyonDokumu tam />      — + kategori listesi
 */
import { useEffect, useState } from "react";
import { koleksiyonDokum, koleksiyonSayi } from "../lib/koleksiyon.js";
import { tt } from "../lib/dil.js";
import { QtIkon, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/koleksiyon-puani.css";

const KATEGORI_AD = { rozet: "Rozet", cerceve: "Çerçeve", aura: "Arka Plan", unvan: "Unvan", kozmetik: "Kozmetik", avatar: "Avatar" };
const NADIR = [["siradan", "Sıradan"], ["nadir", "Nadir"], ["epik", "Epik"], ["efsanevi", "Efsanevi"]];

export default function KoleksiyonDokumu({ tam = false }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    let aktif = true;
    koleksiyonDokum().then((v) => { if (aktif) setD(v); }).catch(() => { if (aktif) setD(null); });
    return () => { aktif = false; };
  }, []);
  if (!d) return null;
  const k = d.kategoriler ?? {};
  const rozet = k.rozet?.adet ?? 0;
  const unvan = k.unvan?.adet ?? 0;
  const toplam = NADIR.reduce((t, [a]) => t + (d.nadirlik?.[a]?.puan ?? 0), 0) || 1;
  return (
    <QtKart as="section" className="qt-kp" aria-labelledby="qt-kp-b">
      <h2 id="qt-kp-b" className="qt-baslik-3 qt-kp-baslik"><QtIkon ad="yildiz" boyut={20} /> {tt("Koleksiyon")}</h2>
      <p className="qt-kp-ozet">
        <span>{tt("{n} rozet", { n: rozet })}</span> · <span>{tt("{n} unvan", { n: unvan })}</span> ·{" "}
        <b className="qt-kp-puan qt-sayi">{tt("Koleksiyon {n}", { n: koleksiyonSayi(d.puan) })}</b>
      </p>
      <div className="qt-kp-cubuk" role="img" aria-label={tt("Nadirliğe göre dağılım")}>
        {NADIR.map(([a]) => (
          <span key={a} className={`qt-kp-dilim qt-kp-dilim--${a}`} style={{ flexGrow: Math.max(d.nadirlik?.[a]?.puan ?? 0, 0) / toplam * 100 || 0 }} />
        ))}
      </div>
      <ul className="qt-kp-nadir">
        {NADIR.map(([a, ad]) => (
          <li key={a}><i className={`qt-kp-nokta qt-kp-nokta--${a}`} />{tt(ad)} <b>{d.nadirlik?.[a]?.adet ?? 0}</b></li>
        ))}
      </ul>
      {tam && (
        <ul className="qt-kp-liste">
          {Object.entries(KATEGORI_AD).filter(([a]) => k[a]).map(([a, ad]) => (
            <li key={a}><span>{tt(ad)}</span><span>{tt("{n} adet", { n: k[a].adet })}</span><b className="qt-sayi">{koleksiyonSayi(k[a].puan)}</b></li>
          ))}
          {(d.nadirlik?.tanimsiz?.adet ?? 0) > 0 && (
            <li className="qt-kp-not">{tt("{n} kalemin nadirliği henüz belirlenmedi; puana girmiyor.", { n: d.nadirlik.tanimsiz.adet })}</li>
          )}
          <li className="qt-kp-not">{tt("Sıradan {a} · Nadir {b} · Epik {c} · Efsanevi {e} puan", { a: d.agirliklar?.siradan, b: d.agirliklar?.nadir, c: d.agirliklar?.epik, e: d.agirliklar?.efsanevi })}</li>
        </ul>
      )}
    </QtKart>
  );
}
