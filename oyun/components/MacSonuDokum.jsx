import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "../lib/dil.js";
import { QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-sonuc.css";

/**
 * Maç sonu ekranındaki döküm bloğu:
 *  - tur tur doğru/yanlış noktaları
 *  - (P2A) rütbe/level ilerlemesi artık LevelKazanci'de (MacSonuSahnesi)
 *
 * NOT: match_answers RLS'i yalnız KENDİ cevaplarını gösteriyor (bkz.
 * match_answers_select_own), bu yüzden döküm oyuncunun kendi turlarıdır.
 * Rakibin tur dökümü için ayrı bir RPC gerekirdi; bu görev arayüz işi
 * olduğu için sunucu tarafına dokunulmadı.
 */
// kazanilanPuan: KULLANIM DIŞI (P2A) — çağıran yer bozulmasın diye imzada kaldı.
// eslint-disable-next-line no-unused-vars
export default function MacSonuDokum({ macId, kazanilanPuan = 0 }) {
  const [turlar, setTurlar] = useState(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("match_answers")
          .select("soru_index, dogru, cevap")
          .eq("match_id", macId)
          .order("soru_index");
        if (error) throw error;
        if (aktif) setTurlar(data ?? []);
      } catch (e) {
        console.warn("[Bildim] maç turları okunamadı:", e?.message ?? e);
        /* migration/RLS engeli — blok sessizce gizlenir */
      }
    })();
    return () => {
      aktif = false;
    };
  }, [macId]);

  if (!turlar || turlar.length === 0) return null;

  const dogruSayisi = turlar.filter((t) => t.dogru).length;
  const durumu = (t) => (t.dogru ? "dogru" : t.cevap === -1 ? "sure" : "yanlis");
  const durumAdi = { dogru: tt("doğru"), sure: tt("süre doldu"), yanlis: tt("yanlış") };

  // P2A: buradaki lig-puanı rütbe çubuğu kalktı — rütbe artık LEVEL'e bağlı ve level/XP
  // ilerlemesi bütün modlarda MacSonuSahnesi › LevelKazanci'de gösteriliyor (çift çubuk olmasın).

  return (
    <QtKart dolgu="k" className="m1-dokum">
      <p className="m1-dokum-baslik">
        {tt("Turların: {d}/{t} doğru", { d: dogruSayisi, t: turlar.length })}
      </p>
      <ol className="m1-dokum-turlar">
        {turlar.map((t) => (
          <li
            key={t.soru_index}
            className={`m1-tur m1-tur--${durumu(t)}`}
            aria-label={tt("{n}. soru: {durum}", { n: t.soru_index + 1, durum: durumAdi[durumu(t)] })}
          >
            {t.soru_index + 1}
          </li>
        ))}
      </ol>
      {/* Nötr noktanın ne demek olduğu yazmıyordu; canlı testte 17 nötr tur
          çıkmış ve oyuncu ne olduğunu anlamamıştı. Üç durum da adlandırıldı. */}
      <div className="m1-dokum-anahtar" aria-hidden="true">
        <span><i className="m1-tur--dogru" />{tt("Doğru")}</span>
        <span><i className="m1-tur--yanlis" />{tt("Yanlış")}</span>
        <span><i className="m1-tur--sure" />{tt("Süre doldu")}</span>
      </div>
    </QtKart>
  );
}
