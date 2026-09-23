import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import KategoriIkon from "./KategoriIkon.jsx";
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import { tt, ttSunucu } from "../lib/dil.js";
import { QtIkon, QtIlerleme, QtKart, QtRozet, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-bilesen.css";

// Tasarım A: ustalık seviyesi → ilerleme çubuğu tonu (token). Veri ve eşikler sunucudan.
const SEVIYE_TON = {
  "Çırak": "lig-gumus",
  "Kalfa": "dogru",
  "Usta": "lig-elmas",
  "Üstat": "mor",
  "Efsane": "coin",
};

/** Profil sayfası: kategori ustalığı, en uzun seri ve skill istatistikleri. */
export default function UstalikIzgarasi() {
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
        else setSeviyeler(u.data ?? []);
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

  const toplamDogru = seviyeler.reduce((t, s) => t + (s.dogru_sayisi ?? 0), 0);
  const kutular = [
    { ikon: "ates", deger: seri?.seri_gun ?? 0, ad: tt("güncel seri") },
    { ikon: "kupa", deger: seri?.seri_en_uzun ?? 0, ad: tt("en uzun seri") },
    { ikon: "yildiz", deger: istatistik?.kullanilan ?? 0, ad: tt("kullanılan skill") },
    { ikon: "oyna", deger: istatistik?.reklam ?? 0, ad: tt("izlenen video") },
  ];

  return (
    <>
      {/* ---------- Seri + skill istatistikleri ---------- */}
      <QtKart as="section" className="qt-dk-ust-kart" aria-labelledby="qt-dk-seri-baslik">
        <h2 id="qt-dk-seri-baslik" className="qt-baslik-3">{tt("Seri ve skiller")}</h2>
        <ul className="qt-dk-sayilar">
          {kutular.map((k) => (
            <li key={k.ad}>
              <QtIkon ad={k.ikon} boyut={20} />
              <b className="qt-sayi">{sayiBicim(Number(k.deger))}</b>
              <span>{k.ad}</span>
            </li>
          ))}
        </ul>
        {envanter.length > 0 && (
          <ul className="qt-dk-envanter" aria-label={tt("Envanterin")}>
            {envanter.map((e) => (
              <li key={e.tur} className="qt-dk-envanter-cip">
                <SkillRozeti tur={e.tur} boyut={22} />
                <span className="qt-sayi">{e.adet}</span>
                <span className="qt-gizli">{JOKER_BILGI[e.tur]?.ad ?? e.tur}</span>
              </li>
            ))}
          </ul>
        )}
      </QtKart>

      {/* ---------- Kategori ustalığı ---------- */}
      <QtKart as="section" className="qt-dk-ust-kart" aria-labelledby="qt-dk-ustalik-baslik">
        <div className="qt-dk-kart-baslik">
          <h2 id="qt-dk-ustalik-baslik" className="qt-baslik-3">{tt("Kategori ustalığı")}</h2>
          <QtRozet ton="dogru" boyut="k" ikon="onay">{tt("{n} doğru", { n: sayiBicim(toplamDogru) })}</QtRozet>
        </div>

        {seviyeler.length === 0 ? (
          <p className="qt-kucuk qt-soluk">{tt("Henüz veri yok — birkaç maç oyna.")}</p>
        ) : (
          <ul className="qt-dk-ustalik">
            {seviyeler.map((s) => (
              <li key={s.kategori} className="qt-dk-ustalik-satir">
                <div className="qt-dk-ustalik-ust">
                  {/* Paket 20 VII: kategori rengi Düello / profil / soru kartıyla aynı (KategoriIkon) */}
                  <span className="qt-dk-ustalik-ad">
                    <KategoriIkon anahtar={s.kategori} boyut={18} plaka /> {tt(kategoriAdi(s.kategori))}
                  </span>
                  <span className="qt-dk-ustalik-seviye">{s.seviye ? ttSunucu(s.seviye) : "—"}</span>
                </div>
                <QtIlerleme
                  deger={Number(s.ilerleme ?? 0)}
                  en={100}
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
    </>
  );
}
