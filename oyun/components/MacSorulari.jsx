import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "../lib/dil.js";
import { QtIkon, QtRozet } from "../tasarim/index.js";
import SoruBildir from "./SoruBildir.jsx";
import "../tasarim/ekranlar/m1-sonuc.css";

const HARFLER = ["A", "B", "C", "D"];

/**
 * Paket 20 II.1 — maç sonu "Maçın soruları": her soru, doğru cevabı (ve verdiğin cevap) + "Soruyu bildir".
 * kaynak ("mac:<id>" · "duello:<id>" · "hizli:<id>" · "grup:<id>" · "turnuva:<id>") verilirse sunucudan
 * (`mac_sorulari`) okunur; Hatalarım gibi listeyi kendisi tutan ekran `sorular` verir.
 * Varsayılan kapalı: sonuç ekranını kalabalıklaştırmaz.
 * Tasarım A (Şerit M1): açılır kart (details/summary korunur — klavye ve ekran okuyucu yerleşik).
 */
export default function MacSorulari({ kaynak, sorular: verilen, baslik, acikBasla = false }) {
  const [sorular, setSorular] = useState(verilen ?? null);

  useEffect(() => {
    if (verilen) { setSorular(verilen); return; }
    if (!kaynak) return;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("mac_sorulari", { p_kaynak: kaynak });
        if (error) throw error;
        if (aktif) setSorular(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[Bildim] mac_sorulari başarısız:", e);
      }
    })();
    return () => { aktif = false; };
  }, [kaynak, verilen]);

  if (!sorular?.length) return null;

  return (
    <details className="m1-sorular" open={acikBasla}>
      <summary className="m1-sorular-baslik">
        <span>{baslik ?? tt("Maçın soruları ({n})", { n: sorular.length })}</span>
        <QtIkon ad="asagi" boyut={20} />
      </summary>
      <ol className="m1-sorular-liste">
        {sorular.map((s, n) => {
          const secenekler = Array.isArray(s.secenekler) ? s.secenekler : JSON.parse(s.secenekler ?? "[]");
          const yanlis = s.ben_cevapladim && s.benim_cevap != null && s.benim_cevap >= 0 && s.benim_cevap !== s.dogru_cevap;
          return (
            <li key={`${s.question_id}-${n}`} className="m1-soru-ozet">
              {s.tur != null && (
                <div className="m1-soru-ozet-etiket">
                  {tt("Tur {tur}", { tur: s.tur })} · {s.ben_saldirdim ? tt("sen sordun") : tt("sen savundun")}
                  {s.riskli && <b> · {tt("riskli kategori")}</b>}
                </div>
              )}
              <p className="m1-soru-ozet-metin">{s.soru}</p>
              <ul className="m1-soru-ozet-siklar">
                {secenekler.map((m, i) => {
                  const dogru = i === s.dogru_cevap;
                  const benimYanlis = yanlis && i === s.benim_cevap;
                  return (
                    <li key={i} className={dogru ? "m1-oz-dogru" : benimYanlis ? "m1-oz-yanlis" : ""}>
                      <b className="m1-oz-harf">{HARFLER[i]}</b>
                      <span className="m1-oz-metin">{m}</span>
                      {dogru && <QtRozet ton="dogru" boyut="k" ikon="onay">{tt("doğru cevap")}</QtRozet>}
                      {benimYanlis && <QtRozet ton="yanlis" boyut="k" ikon="carpi">{tt("senin cevabın")}</QtRozet>}
                    </li>
                  );
                })}
              </ul>
              {s.ben_cevapladim && (s.benim_cevap == null || s.benim_cevap < 0) && (
                <QtRozet ton="uyari" boyut="k" ikon="saat">{tt("Süre doldu")}</QtRozet>
              )}
              <SoruBildir questionId={s.question_id} bildirildi={Boolean(s.bildirdim)} />
            </li>
          );
        })}
      </ol>
    </details>
  );
}
