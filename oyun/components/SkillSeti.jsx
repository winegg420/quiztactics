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
  skillSetiTemizle,
  skillSlotSayisi,
  skillLoadoutKapali,
} from "../lib/jokerler.js";
import { tt } from "../lib/dil.js";
import { hataMesaji } from "../lib/hata.js";

/**
 * Maç akışının içinde kalan, hafif skill seti seçimi.
 *
 * Paket 2 B3: loadout kapalıyken (yuva sayısı >= aktif skill sayısı) seçim ekranı HİÇ
 * çizilmez; sunucunun döndürdüğü tam set (bütün açık skill'ler) yerel kayda yazılır ki
 * maç çubuğu hepsini göstersin. Karar bilinmeden de çizilmez (kapalıyken bir an görünmesin).
 */
export default function SkillSeti({ macTur = "1v1" }) {
  const [kapali, setKapali] = useState(null);   // null: henüz bilinmiyor
  const [slot, setSlot] = useState(SKILL_SLOT_VARSAYILAN);
  const [secili, setSecili] = useState(() => skillSetiOku());
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const uygunlar = AKTIF_MAC_SKILLERI.filter((id) => SKILL_TANIMLARI[id].allowedModes?.includes(macTur));

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const [a, sonuc] = await Promise.all([ayarlar(), supabase.rpc("skill_setim")]);
        if (sonuc.error) throw sonuc.error;
        const n = skillSlotSayisi(a);
        const uzak = Array.isArray(sonuc.data) ? sonuc.data : sonuc.data?.skiller;
        if (skillLoadoutKapali(a)) {
          if (!aktif) return;
          skillSetiKaydet(Array.isArray(uzak) ? uzak : [], n);
          setKapali(true);
          return;
        }
        const ilk = skillSetiTemizle(
          Array.isArray(uzak) && uzak.length ? uzak : skillSetiOku(n), n
        );
        // RPC varsayılan döndürmüş olsa bile gerçek sunucu satırını oluştur.
        const kayit = await supabase.rpc("skill_setimi_kaydet", { p_skiller: ilk });
        if (kayit.error) throw kayit.error;
        if (!aktif) return;
        setSlot(n);
        setSecili(skillSetiKaydet(ilk, n));
        setKapali(false);
      } catch (e) {
        if (aktif) setKapali(false);
        if (aktif) setHata(hataMesaji(e, tt("Skill setin yüklenemedi. Tekrar dene.")));
      }
    })();
    return () => { aktif = false; };
  }, []);

  const degistir = async (id) => {
    let yeni;
    if (secili.includes(id)) yeni = secili.filter((x) => x !== id);
    else if (secili.length < slot) yeni = [...secili, id];
    else yeni = [...secili.slice(1), id];
    yeni = skillSetiTemizle(yeni, slot);
    const onceki = secili;
    setSecili(yeni);
    setHata(null);
    setKaydediliyor(true);
    try {
      const { data, error } = await supabase.rpc("skill_setimi_kaydet", { p_skiller: yeni });
      if (error) throw error;
      setSecili(skillSetiKaydet(Array.isArray(data) ? data : yeni, slot));
    } catch (e) {
      setSecili(onceki);
      setHata(hataMesaji(e, tt("Skill setin kaydedilemedi; önceki seçim geri yüklendi.")));
    } finally {
      setKaydediliyor(false);
    }
  };

  if (kapali !== false) return null;

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
      {hata && <div className="hata-kutu" role="alert">{hata}</div>}
      {acik && (
        <div className="bd-skill-secim-listesi">
          {uygunlar.map((id) => {
            const s = SKILL_TANIMLARI[id];
            const aktif = secili.includes(id);
            return (
              <button type="button" key={id} className={aktif ? "secili" : ""} disabled={kaydediliyor}
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
