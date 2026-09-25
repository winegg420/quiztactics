import { useId, useMemo, useRef, useState } from "react";
import { tt } from "../lib/dil.js";
import { sehirAnahtari } from "../lib/konum.js";
import "../tasarim/ekranlar/sehir-arama.css";

const EN_COK = 50;   // listede aynı anda gösterilen en fazla şehir (büyük ülkede yüzlerce var)

/**
 * Aranabilir şehir listesi (serbest metin YOK — değer yalnız listeden seçilir).
 * sehirler: [{ad, nufus}] — nüfusa göre sıralı gelir; arama boşken en kalabalıklar üstte.
 * Harf/aksan/boşluk farkı önemsiz ("istanbul", "ISTANBUL", "Istanbul" → İstanbul).
 * Liste kutunun ALTINDA akışta açılır (modal içinde yüzen katman/konum hesabı yok).
 */
export default function SehirArama({
  sehirler,
  deger,
  onSec,
  devreDisi = false,
  yukleniyor = false,
  etiket,
  sarmalSinif = "",
  etiketSinif = "",
  girdiSinifi = "",
}) {
  const kimlik = useId();
  const girdiRef = useRef(null);
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [aktifSira, setAktifSira] = useState(0);

  const sonuc = useMemo(() => {
    const liste = sehirler ?? [];
    const q = sehirAnahtari(sorgu);
    if (!q) return liste.slice(0, EN_COK);
    const bas = [];
    const ic = [];
    for (const s of liste) {
      const a = sehirAnahtari(s.ad);
      if (a.startsWith(q)) bas.push(s);
      else if (a.includes(q)) ic.push(s);
      if (bas.length >= EN_COK) break;
    }
    return [...bas, ...ic].slice(0, EN_COK);
  }, [sehirler, sorgu]);

  const ac = () => {
    if (devreDisi) return;
    setSorgu("");
    setAktifSira(0);
    setAcik(true);
  };

  const sec = (ad) => {
    onSec?.(ad);
    setAcik(false);
    setSorgu("");
    girdiRef.current?.blur();
  };

  const tus = (e) => {
    if (!acik) {
      if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); ac(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktifSira((i) => Math.min(i + 1, Math.max(sonuc.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktifSira((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (sonuc[aktifSira]) sec(sonuc[aktifSira].ad);
    } else if (e.key === "Escape") {
      setAcik(false);
    }
  };

  const listeId = `${kimlik}-liste`;
  const secenekId = (i) => `${kimlik}-s${i}`;

  return (
    <div className={`sehir-arama ${sarmalSinif}`.trim()}>
      <label htmlFor={`${kimlik}-girdi`} className={etiketSinif}>{etiket ?? tt("Şehir")}</label>
      <input
        ref={girdiRef}
        id={`${kimlik}-girdi`}
        className={girdiSinifi}
        type="search"
        role="combobox"
        aria-expanded={acik}
        aria-controls={listeId}
        aria-autocomplete="list"
        aria-activedescendant={acik && sonuc[aktifSira] ? secenekId(aktifSira) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        placeholder={yukleniyor ? tt("Yükleniyor…") : acik && deger ? deger : tt("Şehrini ara")}
        value={acik ? sorgu : deger ?? ""}
        disabled={devreDisi}
        onFocus={ac}
        onClick={() => { if (!acik) ac(); }}
        onChange={(e) => { setSorgu(e.target.value); setAktifSira(0); if (!acik) setAcik(true); }}
        onKeyDown={tus}
        onBlur={() => setAcik(false)}
      />
      {acik && (
        <ul id={listeId} role="listbox" className="sehir-arama-liste" aria-label={etiket ?? tt("Şehir")}>
          {sonuc.map((s, i) => (
            <li
              key={s.ad}
              id={secenekId(i)}
              role="option"
              aria-selected={s.ad === deger}
              className={
                "sehir-arama-secenek" +
                (i === aktifSira ? " sehir-arama-secenek--aktif" : "") +
                (s.ad === deger ? " sehir-arama-secenek--secili" : "")
              }
              // Girdi odağı kaybetmeden seçilsin (blur listeyi kapatmadan önce)
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => sec(s.ad)}
            >
              {s.ad}
            </li>
          ))}
          {sonuc.length === 0 && (
            <li className="sehir-arama-bos" role="presentation">
              {yukleniyor ? tt("Yükleniyor…") : tt("Bu adla bir şehir bulamadık. Yazımı kontrol et ya da yakınındaki büyük şehri seç.")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
