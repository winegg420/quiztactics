import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import {
  AKTIF_MAC_SKILLERI,
  LOADOUT_MODLARI,
  SKILL_SLOT_VARSAYILAN,
  SKILL_TANIMLARI,
  skillSetiKaydet,
  skillSetiOku,
  skillSetiTemizle,
} from "../lib/jokerler.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";
import { hataMesaji } from "../lib/hata.js";
import { QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
import SkillRozeti from "./SkillRozeti.jsx";
import "../tasarim/ekranlar/dukkan-bilesen.css";

/**
 * LOADOUT — maç öncesi skill seti (327: 3 yuva, Klasik ve Düello).
 *
 * Set moda göre ayrıdır ("1v1" Klasik · "duello"); Düello'da yalnız Düello'ya uygun skill'ler
 * seçilebilir (Sigorta ve 2X yalnız Klasik). Son set sunucuda (oyuncu_skill_setleri) ve yerelde
 * hatırlanır; ekran açıldığında son set hazırdır — "aynısıyla oyna" tek dokunuş.
 * Envanterde hakkı olmayan skill seçilebilir, "Hakkın yok — Dükkân" diye işaretlenir (maçta
 * "al ve kullan" akışı kalır). Kilitli skill seçilemez (sunucu da reddeder).
 * Grup/Turnuva'da loadout yok: bileşen hiçbir şey çizmez. Loadout kapalıysa (yuva ≥ aktif
 * skill sayısı) de çizilmez; karar bilinmeden de çizilmez (bir an görünüp kaybolmasın).
 *
 * @param {"1v1"|"duello"} macTur
 * @param {boolean} [acikBaslar] seçim listesi açık başlasın (Klasik pencere adımı)
 */
export default function SkillSeti({ macTur = "1v1", acikBaslar = false }) {
  const loadoutModu = LOADOUT_MODLARI.includes(macTur);
  const [kapali, setKapali] = useState(null);   // null: henüz bilinmiyor
  const [slot, setSlot] = useState(SKILL_SLOT_VARSAYILAN);
  const [secili, setSecili] = useState(() => skillSetiOku(undefined, macTur));
  const [bilgi, setBilgi] = useState({});      // tur → { adet, acik }
  const [acik, setAcik] = useState(acikBaslar);
  const [hata, setHata] = useState(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const uygunlar = AKTIF_MAC_SKILLERI.filter((id) => SKILL_TANIMLARI[id].allowedModes?.includes(macTur));

  useEffect(() => {
    if (!loadoutModu) return undefined;
    let aktif = true;
    (async () => {
      try {
        const [dukkan, sonuc] = await Promise.all([
          supabase.rpc("skill_dukkani"),
          supabase.rpc("skill_setim", { p_mod: macTur }),
        ]);
        if (dukkan.error) throw dukkan.error;
        if (sonuc.error) throw sonuc.error;
        const d = dukkan.data ?? {};
        const n = Number(d.yuva) > 0 ? Number(d.yuva) : SKILL_SLOT_VARSAYILAN;
        const uzak = Array.isArray(sonuc.data) ? sonuc.data : [];
        if (!aktif) return;
        setBilgi(Object.fromEntries((d.skiller ?? []).map((s) => [s.tur, { adet: Number(s.adet) || 0, acik: s.acik !== false }])));
        if (!d.loadout_acik) {
          skillSetiKaydet(uzak, uzak.length || n, macTur);
          setKapali(true);
          return;
        }
        setSlot(n);
        setSecili(skillSetiKaydet(skillSetiTemizle(uzak.length ? uzak : skillSetiOku(n, macTur), n, macTur), n, macTur));
        setKapali(false);
      } catch (e) {
        if (!aktif) return;
        setKapali(false);
        setHata(hataMesaji(e, tt("Skill setin yüklenemedi. Tekrar dene.")));
      }
    })();
    return () => { aktif = false; };
  }, [loadoutModu, macTur]);

  const degistir = async (id) => {
    let yeni;
    if (secili.includes(id)) yeni = secili.filter((x) => x !== id);
    else if (secili.length < slot) yeni = [...secili, id];
    else yeni = [...secili.slice(1), id];
    yeni = skillSetiTemizle(yeni, slot, macTur);
    if (!yeni.length) return;   // set boş kalamaz (sunucu da reddeder)
    const onceki = secili;
    setSecili(yeni);
    setHata(null);
    setKaydediliyor(true);
    try {
      const { data, error } = await supabase.rpc("skill_setimi_kaydet", { p_skiller: yeni, p_mod: macTur });
      if (error) throw error;
      setSecili(skillSetiKaydet(Array.isArray(data) ? data : yeni, slot, macTur));
    } catch (e) {
      setSecili(onceki);
      setHata(hataMesaji(e, tt("Skill setin kaydedilemedi; önceki seçim geri yüklendi.")));
    } finally {
      setKaydediliyor(false);
    }
  };

  if (!loadoutModu || kapali !== false) return null;
  const adet = (id) => bilgi[id]?.adet ?? 0;

  return (
    <QtKart as="section" dolgu="k" className="qt-dk-seti" aria-label={tt("Maç Skillerin")}>
      <div className="qt-dk-seti-baslik">
        <div>
          <h2 className="qt-baslik-3">{tt("Maç Skillerin")}</h2>
          <p className="qt-kucuk qt-soluk">{tt("Maça götüreceğin {0} skill", { 0: slot })}</p>
        </div>
        <QtDugme tur="ikincil" boyut="k" aria-expanded={acik} onClick={() => setAcik((v) => !v)}>
          {acik ? tt("Bitti") : tt("Değiştir")}
        </QtDugme>
      </div>
      <ul className="qt-dk-seti-yuvalar" style={{ "--_sutun": Math.min(slot, 4) }}>
        {Array.from({ length: slot }).map((_, i) => {
          const s = SKILL_TANIMLARI[secili[i]];
          return (
            <li className={`qt-dk-seti-yuva${s ? " qt-dk-seti-yuva--dolu" : ""}`} key={s?.id ?? `bos-${i}`}>
              {s
                ? <>
                    <SkillRozeti tur={s.id} boyut={40} />
                    <span>{s.ad}</span>
                    <small className={adet(s.id) > 0 ? "qt-dk-seti-adet" : "qt-dk-seti-adet qt-dk-seti-adet--yok"}>
                      {adet(s.id) > 0 ? `×${adet(s.id)}` : tt("Hakkın yok")}
                    </small>
                  </>
                : <><QtIkon ad="arti" boyut={20} /><span className="qt-gizli">{tt("Boş yuva")}</span></>}
            </li>
          );
        })}
      </ul>
      {secili.some((id) => adet(id) <= 0) && (
        <p className="qt-dk-seti-not qt-kucuk">
          {tt("Hakkın olmayan skill'i maçta coin'le alıp kullanabilirsin.")}{" "}
          <Link to={y("/joker")}>{tt("Dükkân")}</Link>
        </p>
      )}
      {hata && <p className="qt-dk-seti-hata qt-kucuk" role="alert">{hata}</p>}
      {acik && (
        <div className="qt-dk-seti-secim">
          {uygunlar.map((id) => {
            const s = SKILL_TANIMLARI[id];
            const aktif = secili.includes(id);
            const kilitli = bilgi[id]?.acik === false;
            return (
              <button type="button" key={id} className={"qt-dk-seti-sec" + (aktif ? " qt-dk-seti-sec--secili" : "")}
                      disabled={kaydediliyor || kilitli} aria-pressed={aktif} onClick={() => degistir(id)}>
                <SkillRozeti tur={id} boyut={36} />
                <span>
                  <b>{s.ad}</b>
                  <small>{s.aciklama}</small>
                  <small className={adet(id) > 0 ? "qt-dk-seti-adet" : "qt-dk-seti-adet qt-dk-seti-adet--yok"}>
                    {kilitli ? tt("Kilitli") : adet(id) > 0 ? tt("{0} hak", { 0: adet(id) }) : tt("Hakkın yok — Dükkân")}
                  </small>
                </span>
                {aktif && <QtIkon ad="onay" boyut={20} />}
              </button>
            );
          })}
        </div>
      )}
    </QtKart>
  );
}
