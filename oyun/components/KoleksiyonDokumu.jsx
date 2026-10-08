/**
 * KOLEKSİYON DÖKÜMÜ (646) — profilde "42 rozet · 3 unvan · Koleksiyon 1.240" + kategori ve nadirlik dağılımı.
 * Oyun avantajı YOK, yalnız statü. Nadirliği henüz tanımsız kalemler (unvan, kozmetik, avatar) puana girmez; adedi
 * "puanı henüz yok" olarak sayılır. Veri: koleksiyonDokum() (oyun/lib/koleksiyon.js).
 * <KoleksiyonDokumu />          — özet satırı + nadirlik çubuğu
 * <KoleksiyonDokumu tam />      — + kategori listesi
 */
import { useEffect, useRef, useState } from "react";
import { koleksiyonDokum, koleksiyonSayi } from "../lib/koleksiyon.js";
import { tt } from "../lib/dil.js";
import { QtBosDurum, QtIkon, QtKart, sinif, siraStili, useSiraliGiris } from "../tasarim/index.js";
import "../tasarim/ekranlar/koleksiyon-puani.css";

const KATEGORI_AD = { rozet: "Rozet", cerceve: "Çerçeve", aura: "Arka Plan", unvan: "Unvan", kozmetik: "Kozmetik", avatar: "Avatar" };
const KATEGORI_IKON = { rozet: "madalya", cerceve: "palet", aura: "elmas", unvan: "kupa", kozmetik: "yildiz", avatar: "kisi" };
const NADIR = [["siradan", "Sıradan"], ["nadir", "Nadir"], ["epik", "Epik"], ["efsanevi", "Efsanevi"]];

// Profil sekmeleri açılıp kapanınca bileşen yeniden kurulur: sıralı giriş oturum başına BİR kez oynar (sekme değişiminde tekrar etmez).
const OYNANAN = new Set();
/** Profil alt panelleri (Rozetler, Koleksiyon) için: `anahtar` ilk kez açılıyorsa sıralı giriş sınıfı, sonra "". */
export function useBirKezSirali(anahtar, hazir) {
  const ilk = useRef(!OYNANAN.has(anahtar)).current;
  const sirali = useSiraliGiris(hazir);
  useEffect(() => { if (hazir) OYNANAN.add(anahtar); }, [hazir, anahtar]);
  return ilk ? sirali : "";
}

export default function KoleksiyonDokumu({ tam = false, sirali = "", sira = null }) {
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
  // Boş koleksiyon: gri çubuk + "0 rozet · 0 unvan" yerine tek satır hedef (özet kartında; döküm sekmesinde sayılar durur).
  const bos = !tam && rozet === 0 && unvan === 0;
  return (
    <QtKart as="section" className={sinif("qt-kp", sirali)} style={sira != null ? siraStili(sira) : undefined} aria-labelledby="qt-kp-b">
      <h2 id="qt-kp-b" className="qt-baslik-3 qt-kp-baslik qt-plaka"><QtIkon ad="yildiz" boyut={20} /> {tt("Koleksiyon")}</h2>
      {bos ? (
        <QtBosDurum boyut="k" ikon="madalya" ton="mor" baslik={tt("İlk rozetin için maç oyna")} />
      ) : (
        <>
          <p className="qt-kp-ozet">
            <span>{tt("{n} rozet", { n: rozet })}</span> · <span>{tt("{n} unvan", { n: unvan })}</span> ·{" "}
            <b className="qt-kp-puan qt-sayi">{tt("{n} puan", { n: koleksiyonSayi(d.puan) })}</b>
          </p>
          <div className="qt-kp-cubuk" role="img" aria-label={tt("Nadirliğe göre dağılım")}>
            {NADIR.map(([a]) => (
              <span key={a} className={`qt-kp-dilim qt-kp-dilim--${a}`} style={{ flexGrow: Math.max(d.nadirlik?.[a]?.puan ?? 0, 0) / toplam * 100 || 0 }} />
            ))}
          </div>
          {/* Çubuğun lejandı (2 Eki 2026): özet kartında da (Profil ilk ekranı dahil) nokta renkleri çubukla aynı. */}
          <ul className="qt-kp-nadir">
            {NADIR.map(([a, ad]) => (
              <li key={a}><i className={`qt-kp-nokta qt-kp-nokta--${a}`} />{tt(ad)} <b>{d.nadirlik?.[a]?.adet ?? 0}</b></li>
            ))}
          </ul>
        </>
      )}
      {tam && (
        <ul className="qt-kp-liste">
          {Object.entries(KATEGORI_AD).filter(([a]) => k[a]).map(([a, ad]) => (
            <li key={a} className={`qt-kp-kat qt-kp-kat--${a}`}>
              <span className="qt-kp-kat-ik" aria-hidden="true"><QtIkon ad={KATEGORI_IKON[a] ?? "yildiz"} boyut={18} /></span>
              <span className="qt-kp-kat-ad">{tt(ad)}</span>
              <span className="qt-kp-kat-adet">{tt("{n} adet", { n: k[a].adet })}</span>
              <b className="qt-kp-kat-puan qt-sayi">{koleksiyonSayi(k[a].puan)}</b>
            </li>
          ))}
          {(d.nadirlik?.tanimsiz?.adet ?? 0) > 0 && (
            <li className="qt-kp-not">{tt("Puana girmeyen {n} kalem var.", { n: d.nadirlik.tanimsiz.adet })}</li>
          )}
          <li className="qt-kp-not">{tt("Sıradan {a} · Nadir {b} · Epik {c} · Efsanevi {e} puan", { a: d.agirliklar?.siradan, b: d.agirliklar?.nadir, c: d.agirliklar?.epik, e: d.agirliklar?.efsanevi })}</li>
        </ul>
      )}
    </QtKart>
  );
}
