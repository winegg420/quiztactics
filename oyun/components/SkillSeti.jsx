import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import Ikon from "./Ikon.jsx";
import { ayarlar } from "../lib/ayarlar.js";
import {
  AKTIF_MAC_SKILLERI,
  SKILL_SLOT_VARSAYILAN,
  SKILL_TANIMLARI,
  skillSetiKaydet,
  skillSetiOku,
  skillSlotSayisi,
} from "../lib/jokerler.js";
import { tt } from "../lib/dil.js";

/** Maç akışının içinde kalan, hafif skill seti seçimi. */
export default function SkillSeti({ macTur = "1v1" }) {
  const [slot, setSlot] = useState(SKILL_SLOT_VARSAYILAN);
  const [secili, setSecili] = useState(() => skillSetiOku());
  const [acik, setAcik] = useState(false);
  const uygunlar = AKTIF_MAC_SKILLERI.filter((id) => SKILL_TANIMLARI[id].allowedModes?.includes(macTur));

  useEffect(() => {
    let aktif = true;
    Promise.all([
      ayarlar(),
      supabase.rpc("skill_setim"),
    ]).then(([a, sonuc]) => {
      if (!aktif) return;
      const n = skillSlotSayisi(a);
      setSlot(n);
      const uzak = Array.isArray(sonuc?.data) ? sonuc.data : sonuc?.data?.skiller;
      const ilk = Array.isArray(uzak) && uzak.length ? uzak : skillSetiOku(n);
      setSecili(skillSetiKaydet(ilk, n));
    }).catch(() => {});
    return () => { aktif = false; };
  }, []);

  const degistir = async (id) => {
    let yeni;
    if (secili.includes(id)) yeni = secili.filter((x) => x !== id);
    else if (secili.length < slot) yeni = [...secili, id];
    else yeni = [...secili.slice(1), id];
    yeni = skillSetiKaydet(yeni, slot);
    setSecili(yeni);
    await supabase.rpc("skill_setimi_kaydet", { p_skiller: yeni }).catch(() => {});
  };

  return (
    <section className="bd-skill-seti" aria-label={tt("Maç Skillerin")}>
      <div className="bd-skill-seti-baslik">
        <div>
          <b>{tt("Maç Skillerin")}</b>
          <span>{tt("Maça götüreceğin {0} skill", { 0: slot })}</span>
        </div>
        <button type="button" className="btn kucuk ikincil" onClick={() => setAcik((v) => !v)}>
          {acik ? tt("Bitti") : tt("Değiştir")}
        </button>
      </div>
      <div className="bd-skill-slotlar" style={{ "--skill-slot": slot }}>
        {Array.from({ length: slot }).map((_, i) => {
          const s = SKILL_TANIMLARI[secili[i]];
          return (
            <div className={`bd-skill-slot ${s ? "dolu" : "bos"}`} key={s?.id ?? `bos-${i}`}>
              {s ? <><Ikon ad={s.ikon} boyut={19} /><span>{s.ad}</span></> : <span>+</span>}
            </div>
          );
        })}
      </div>
      {acik && (
        <div className="bd-skill-secim-listesi">
          {uygunlar.map((id) => {
            const s = SKILL_TANIMLARI[id];
            const aktif = secili.includes(id);
            return (
              <button type="button" key={id} className={aktif ? "secili" : ""}
                      aria-pressed={aktif} onClick={() => degistir(id)}>
                <Ikon ad={s.ikon} boyut={18} />
                <span><b>{s.ad}</b><small>{s.aciklama}</small></span>
                {aktif && <Ikon ad="onay" boyut={15} />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
