import { useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { hataMesaji } from "../lib/hata.js";
import { QtCip, QtDugme, QtIkon } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-sonuc.css";

/**
 * Paket 20 II.1 — "Soruyu bildir". Mevcut vote_question (adil=false + sebep) kullanılır.
 * Yeterli sayıda gerçek oyuncu bildirirse soru sunucuda karantinaya alınır (oyun_ayarlari.soru_bildirim_esigi).
 * Tasarım A (Şerit M1): hayalet düğme → sebep çipleri.
 */
export const SEBEPLER = [
  ["cevap_yanlis", "Cevap yanlış"],
  ["anlasilmiyor", "Soru anlaşılmıyor"],
  ["birden_fazla_dogru", "Birden fazla doğru şık"],
  ["yazim_hatasi", "Yazım hatası"],
  ["guncel_degil", "Güncelliğini yitirmiş"],
];

export default function SoruBildir({ questionId, bildirildi = false }) {
  const [acik, setAcik] = useState(false);
  const [gonderildi, setGonderildi] = useState(bildirildi);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);

  if (!questionId) return null;
  if (gonderildi) {
    return (
      <p className="m1-bildir-tamam" role="status">
        <QtIkon ad="onay" boyut={16} /> {tt("Bildirildi — teşekkürler, inceleyeceğiz.")}
      </p>
    );
  }

  const gonder = async (sebep) => {
    setCalisiyor(true);
    setHata(null);
    try {
      const { error } = await supabase.rpc("vote_question", { p_question_id: questionId, p_adil: false, p_sebep: sebep });
      if (error) throw error;
      setGonderildi(true);
    } catch (e) {
      console.error("[Bildim] soru bildirilemedi:", e);
      setHata(hataMesaji(e, tt("Bildirim gönderilemedi. Tekrar dene.")));
    } finally {
      setCalisiyor(false);
    }
  };

  return (
    <div className="m1-bildir">
      {!acik ? (
        <QtDugme tur="hayalet" boyut="k" ikon="bayrak" onClick={() => setAcik(true)}>
          {tt("Soruyu bildir")}
        </QtDugme>
      ) : (
        <div className="m1-bildir-sebepler" role="group" aria-label={tt("Neden bildiriyorsun?")}>
          <span className="m1-bildir-soru">{tt("Neden bildiriyorsun?")}</span>
          {SEBEPLER.map(([k, ad]) => (
            <QtCip key={k} aria-pressed={undefined} disabled={calisiyor} onClick={() => gonder(k)}>
              {tt(ad)}
            </QtCip>
          ))}
          <QtDugme tur="hayalet" boyut="k" devreDisi={calisiyor} onClick={() => setAcik(false)}>
            {tt("Vazgeç")}
          </QtDugme>
        </div>
      )}
      {hata && <p className="m1-bildir-hata" role="alert">{hata}</p>}
    </div>
  );
}
