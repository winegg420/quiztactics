import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import KategoriIkon, { KATEGORI_RENK } from "./KategoriIkon.jsx";
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import { tt, ttSunucu } from "../lib/dil.js";
import { QtIkon, QtIlerleme, QtKart, QtRozet, sayiBicim, sinif, siraStili } from "../tasarim/index.js";
import { useBirKezSirali } from "./KoleksiyonDokumu.jsx";
import "../tasarim/ekranlar/dukkan-bilesen.css";

// Tasarım A: ustalık seviyesi → ilerleme çubuğu tonu (token). Veri ve eşikler sunucudan.
const SEVIYE_TON = {
  "Çırak": "lig-gumus",
  "Kalfa": "dogru",
  "Usta": "lig-elmas",
  "Üstat": "mor",
  "Efsane": "coin",
};
// Seviye adı etiketi (qt-dk-ustalik-seviye--*): hepsi açık zemin üstünde koyu yazı, ≥ 4,5:1 (dukkan-bilesen.css).
export const SEVIYE_KOD = { "Çırak": "cirak", "Kalfa": "kalfa", "Usta": "usta", "Üstat": "ustat", "Efsane": "efsane" };

/**
 * Profil sayfası: kategori ustalığı, en uzun seri ve skill istatistikleri.
 * `sirali`/`sira`: ilk kartın sıralı girişi (ProfilePage verir). Çubuklar dolarak gelir, yalnız oturumdaki ilk açılışta.
 * Tutarlılık turu 2 (10 Eki 2026): `kategoriYok` → "Kategori ustalığı" kartı çizilmez (Profil'de KategoriProfili ile birleşti);
 * `onSeviyeler` ustalık verisini dışarı verir (ikinci RPC yok). Seri kartı: güncel seri (Ödüllerim'de var) ve izlenen video
 * kalktı; en uzun seri + kullanılan joker Ödüllerim'deki beyaz sayı kartı kalıbında; joker envanteri adlı 2 sütunlu liste.
 */
export default function UstalikIzgarasi({ sirali = "", sira = null, kategoriYok = false, onSeviyeler }) {
  const [seviyeler, setSeviyeler] = useState([]);
  const [seri, setSeri] = useState(null);
  const [envanter, setEnvanter] = useState([]);
  const [istatistik, setIstatistik] = useState(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const [u, s, e] = await Promise.all([
          supabase.rpc("ustalik_seviyelerim"),
          supabase.rpc("seri_durumum"),
          supabase.rpc("envanterim"),
        ]);
        if (!aktif) return;
        if (u.error) console.warn("[Bildim] ustalik_seviyelerim başarısız:", u.error.message);
        else { setSeviyeler(u.data ?? []); onSeviyeler?.(u.data ?? []); }
        if (!s.error) setSeri(Array.isArray(s.data) ? s.data[0] : s.data);
        if (!e.error) setEnvanter(e.data ?? []);
      } catch (e) { console.warn("[Bildim] ustalik_seviyelerim başarısız:", e?.message ?? e);
        /* migration bekliyor olabilir */
      }
      try {
        const { data, error } = await supabase
          .from("joker_islemleri")
          .select("tur, delta, kaynak");
        if (error) throw error;
        if (aktif) {
          const kullanilan = (data ?? [])
            .filter((x) => x.kaynak === "kullanim")
            .reduce((t, x) => t + Math.abs(x.delta), 0);
          const kazanilan = (data ?? [])
            .filter((x) => x.delta > 0)
            .reduce((t, x) => t + x.delta, 0);
          const reklam = (data ?? []).filter((x) => x.kaynak === "reklam").length;
          setIstatistik({ kullanilan, kazanilan, reklam });
        }
      } catch (e) {
        console.warn("[Bildim] skill istatistiği okunamadı:", e?.message ?? e);
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  const giris = useBirKezSirali("ustalik", seviyeler.length > 0);
  const toplamDogru = seviyeler.reduce((t, s) => t + (s.dogru_sayisi ?? 0), 0);
  const kutular = [
    { ikon: "ates", ton: "vurgu", deger: seri?.seri_en_uzun ?? 0, ad: tt("En uzun seri") },
    { ikon: "yildiz", ton: "mor", deger: istatistik?.kullanilan ?? 0, ad: tt("Kullanılan skill") },
  ];

  return (
    <>
      {/* ---------- Seri + skill istatistikleri ---------- */}
      <QtKart as="section" className={sinif("qt-dk-ust-kart", sirali)} style={sira != null ? siraStili(sira) : undefined} aria-labelledby="qt-dk-seri-baslik">
        <h2 id="qt-dk-seri-baslik" className="qt-baslik-3 qt-plaka">{tt("Seri ve skiller")}</h2>
        {/* Ödüllerim'deki sayı kartıyla aynı kalıp (qt-pf-sayi: dukkan-profil.css) */}
        <ul className="qt-dk-sayilar qt-dk-sayilar--iki">
          {kutular.map((k) => (
            <li key={k.ad}>
              <div className={sinif("qt-pf-sayi", k.ton === "vurgu" && "qt-pf-sayi--vurgu")}>
                <span className="qt-pf-sayi-ikon" aria-hidden="true"><QtIkon ad={k.ikon} boyut={20} /></span>
                <b className="qt-sayi">{sayiBicim(Number(k.deger))}</b>
                <span>{k.ad}</span>
              </div>
            </li>
          ))}
        </ul>
        {envanter.length > 0 && (
          <ul className="qt-dk-envanter qt-dk-envanter--liste" aria-label={tt("Envanterin")}>
            {envanter.map((e) => (
              <li key={e.tur} className="qt-dk-envanter-cip">
                <SkillRozeti tur={e.tur} boyut={22} />
                <span className="qt-dk-envanter-ad">{JOKER_BILGI[e.tur]?.ad ?? e.tur}</span>
                <b className="qt-sayi">{e.adet}</b>
              </li>
            ))}
          </ul>
        )}
      </QtKart>

      {!kategoriYok && (<>

      {/* ---------- Kategori ustalığı ---------- */}
      <QtKart as="section" className="qt-dk-ust-kart" aria-labelledby="qt-dk-ustalik-baslik">
        <div className="qt-dk-kart-baslik">
          <h2 id="qt-dk-ustalik-baslik" className="qt-baslik-3 qt-plaka">{tt("Kategori ustalığı")}</h2>
          <QtRozet ton="dogru" boyut="k" ikon="onay">{tt("{n} doğru", { n: sayiBicim(toplamDogru) })}</QtRozet>
        </div>

        {seviyeler.length === 0 ? (
          <p className="qt-kucuk qt-soluk">{tt("Henüz veri yok — birkaç maç oyna.")}</p>
        ) : (
          <ul className="qt-dk-ustalik">
            {seviyeler.map((s) => (
              <li key={s.kategori} className="qt-dk-ustalik-satir" style={{ "--kp-r": KATEGORI_RENK[s.kategori] ?? KATEGORI_RENK.karisik }}>
                <div className="qt-dk-ustalik-ust">
                  {/* Paket 20 VII: kategori rengi Düello / profil / soru kartıyla aynı (KategoriIkon) */}
                  <span className="qt-dk-ustalik-ad">
                    <KategoriIkon anahtar={s.kategori} boyut={18} plaka /> {tt(kategoriAdi(s.kategori))}
                  </span>
                  <span className={sinif("qt-dk-ustalik-seviye", SEVIYE_KOD[s.seviye] && `qt-dk-ustalik-seviye--${SEVIYE_KOD[s.seviye]}`)}>{s.seviye ? ttSunucu(s.seviye) : "—"}</span>
                </div>
                <QtIlerleme
                  deger={Number(s.ilerleme ?? 0)}
                  en={100}
                  canli={Boolean(giris)}
                  konturlu
                  ton={SEVIYE_TON[s.seviye] ?? "mor"}
                  etiket={tt("{0} ustalığı", { 0: tt(kategoriAdi(s.kategori)) })}
                />
                <span className="qt-dk-ustalik-alt">
                  {tt("{n} doğru", { n: s.dogru_sayisi })}
                  {s.sonraki_esik
                    ? tt(" · {0} için {1} kaldı", { 0: ttSunucu(s.sonraki_seviye), 1: s.sonraki_esik - s.dogru_sayisi })
                    : tt(" · en üst seviye")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </QtKart>
      </>)}
    </>
  );
}
