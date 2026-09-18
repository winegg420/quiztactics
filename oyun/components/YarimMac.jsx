import { useState } from "react";
import Modal from "./Modal.jsx";
import Ikon from "./Ikon.jsx";
import { supabase } from "../../src/lib/supabase.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";

/**
 * "Hemen oyna"ya basıldığında yarım kalmış maç varsa önce sorar (Paket 32 D).
 *
 * ÖLÇÜLDÜ: kuyruga_gir / quick_match aktif bir maç görünce oyuncuyu SESSİZCE o maça
 * sokuyordu; eşleşme ekranı hiç açılmıyordu ("eşleşme ekranı yapılmamış" sanıldı).
 *
 * "Yeni maç" mevcut maçı `mac_iptal` ile kapatır. Sunucunun kuralı (ölçüldü):
 *   rakip gerçek oyuncu VE maçta en az bir cevap varsa → hükmen yenilgi (rakip kazanır);
 *   aksi hâlde maç sonuçsuz iptal. Kaybedenden lig puanı ya da coin DÜŞÜLMEZ
 *   (coin_mac_maglubiyet = 0, mac_sonuclandir kaybedene kesinti yapmaz).
 * Metin iki durumu AYIRMAZ: ayırırsa gizli botun bot olduğu anlaşılır (is_bot sızmaz kuralı).
 * Bu yüzden en kötü sonuç söylenir: "yenilgi sayılabilir".
 *
 * @param {object} o
 * @param {object} o.mac       { id, rakipAd, soru, toplam }
 * @param {() => void} o.onDevam
 * @param {() => void} o.onYeni    maç kapatıldıktan sonra çağrılır
 * @param {() => void} o.onKapat
 */
export default function YarimMacPenceresi({ mac, onDevam, onYeni, onKapat }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);

  const yeniMac = async () => {
    setCalisiyor(true);
    setHata(null);
    try {
      const { error } = await supabase.rpc("mac_iptal", { p_match_id: mac.id });
      if (error) throw error;
      onYeni();
    } catch (e) {
      setHata(hataMesaji(e, tt("Maç kapatılamadı. Kaldığın yerden devam edebilirsin.")));
      setCalisiyor(false);
    }
  };

  return (
    <Modal onKapat={calisiyor ? undefined : onKapat} etiket={tt("Devam eden maçın var")}>
      <div className="bd-modal bd-yarim-mac">
        <div className="bd-yarim-mac-ikon" aria-hidden="true"><Ikon ad="saat" boyut={26} /></div>
        <h2 className="bd-modal-baslik">{tt("Devam eden maçın var")}</h2>
        <p className="bd-modal-metin">
          {mac.rakipAd
            ? tt("{ad} ile oynadığın maç {soru}. soruda kaldı ({toplam} sorudan).",
                 { ad: mac.rakipAd, soru: mac.soru, toplam: mac.toplam })
            : tt("Yarım kalan maçın {soru}. soruda ({toplam} sorudan).", { soru: mac.soru, toplam: mac.toplam })}
        </p>
        <button type="button" className="btn" onClick={onDevam} disabled={calisiyor} autoFocus>
          {tt("Kaldığın yerden devam et")}
        </button>
        <button type="button" className="btn ikincil" onClick={yeniMac} disabled={calisiyor}>
          {calisiyor ? tt("Maç kapatılıyor…") : tt("Yeni maç")}
        </button>
        <p className="bd-yarim-mac-not">
          {tt("Yeni maça geçersen bu maç biter ve yenilgi sayılabilir. Lig puanı ya da coin kaybetmezsin.")}
        </p>
        {hata && <div className="hata-kutu" role="alert">{hata}</div>}
      </div>
    </Modal>
  );
}
