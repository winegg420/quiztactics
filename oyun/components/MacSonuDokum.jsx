import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "../lib/dil.js";

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
        if (!error && aktif) setTurlar(data ?? []);
      } catch {
        /* migration/RLS engeli — blok sessizce gizlenir */
      }
    })();
    return () => {
      aktif = false;
    };
  }, [macId]);

  if (!turlar || turlar.length === 0) return null;

  const dogruSayisi = turlar.filter((t) => t.dogru).length;

  // P2A: buradaki lig-puanı rütbe çubuğu kalktı — rütbe artık LEVEL'e bağlı ve level/XP
  // ilerlemesi bütün modlarda MacSonuSahnesi › LevelKazanci'de gösteriliyor (çift çubuk olmasın).

  return (
    <div className="bd-sonuc-dokum">
      <div className="bd-dokum-baslik">
        {tt("Turların —")} <b>{dogruSayisi}</b>/{turlar.length} {tt("doğru")}
      </div>
      <div className="bd-dokum-turlar">
        {turlar.map((t) => (
          <span
            key={t.soru_index}
            className={`bd-tur-nokta ${
              t.dogru ? "dogru" : t.cevap === -1 ? "sure" : "yanlis"
            }`}
            title={`${t.soru_index + 1}. soru: ${
              t.dogru ? tt("doğru") : t.cevap === -1 ? tt("süre doldu") : tt("yanlış")
            }`}
          >
            {t.soru_index + 1}
          </span>
        ))}
      </div>
      {/* Nötr noktanın ne demek olduğu yazmıyordu; canlı testte 17 nötr tur
          çıkmış ve oyuncu ne olduğunu anlamamıştı. Üç durum da adlandırıldı. */}
      <div className="bd-dokum-anahtar">
        <span><i className="dogru" />{tt("Doğru")}</span>
        <span><i className="yanlis" />{tt("Yanlış")}</span>
        <span><i className="sure" />{tt("Süre doldu")}</span>
      </div>
    </div>
  );
}
