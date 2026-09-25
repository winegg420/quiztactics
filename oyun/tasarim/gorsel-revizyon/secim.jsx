// /gorsel-revizyon ortak seçim altyapısı (tasarim/BRIEF_GORSEL_REVIZYON.md › B1, B2).
// Bölüm dosyaları (a/, b/) YALNIZ bu bileşenleri kullanır; durum sayfada tek yerde, localStorage'da.
//
//  <GrBolum no={6} baslik="Lig çerçeveleri" tur="sec" | "karar" | "dil" ic={4} gosterilen={2} elenen="…">
//    <GrAday bolum={6} kod="set-a" baslik="Set A — Kanatlı" testler={{ siluet: true, kucuk: true, … }}> …görsel… </GrAday>
//  </GrBolum>
//  tur="sec"   → bölümde tek aday seçilir ("Seç").
//  tur="karar" → her aday için ayrı "Girsin / Girmesin" (madde 11, 13).
//  tur="dil"   → "Bu dil tamam / Düzeltme gerekli" (madde 0).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { QtDugme } from "../index.js";

const SAKLA = "qt_gorsel_revizyon_secimler";
const oku = () => { try { return JSON.parse(localStorage.getItem(SAKLA) || "null") || {}; } catch { return {}; } };
const yaz = (v) => { try { localStorage.setItem(SAKLA, JSON.stringify(v)); } catch { /* özel mod: yalnız bu oturum */ } };

const Baglam = createContext(null);
/** Kayıt biçimi: { "b6": { sec: "set-a", not: "…" }, "b13:pc_sakura": { karar: "girsin", not: "…" } } */
export function GrSecimSaglayici({ children }) {
  const [durum, setDurum] = useState(oku);
  const [adaylar, setAdaylar] = useState({});   // kopyalama metni için aday adları: { "b6": [{kod, baslik}] }
  const guncelle = useCallback((anahtar, degisim) => {
    setDurum((eski) => {
      const yeni = { ...eski, [anahtar]: { ...(eski[anahtar] || {}), ...degisim } };
      yaz(yeni);
      return yeni;
    });
  }, []);
  const kaydet = useCallback((bolum, kod, baslik) => {
    setAdaylar((e) => {
      const l = e[bolum] || [];
      if (l.some((a) => a.kod === kod)) return e;
      return { ...e, [bolum]: [...l, { kod, baslik }] };
    });
  }, []);
  const deger = useMemo(() => ({ durum, guncelle, adaylar, kaydet }), [durum, guncelle, adaylar, kaydet]);
  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}
export const useGrSecim = () => useContext(Baglam);

const TEST_ADLARI = [
  ["siluet", "Siluet"], ["kucuk", "Küçük boy"], ["gri", "Gri ton"], ["set", "Set"],
  ["avatar", "Avatar yanında"], ["hedef", "Hedef kalite"], ["mobil", "Mobil hareket"],
];

const BolumTur = createContext({ no: 0, tur: "sec" });

export function GrBolum({ no, baslik, aciklama, tur = "sec", ic, gosterilen, elenen, zayif, children }) {
  const { durum, guncelle } = useGrSecim();
  const k = `b${no}`;
  return (
    <section className="gr-bolum" id={`gr-b${no}`} aria-labelledby={`gr-b${no}-b`}>
      <header className="gr-bolum-bas">
        <h2 id={`gr-b${no}-b`} className="qt-baslik-2"><span className="gr-no">{no}</span> {baslik}</h2>
        {aciklama && <p className="qt-govde gr-aciklama">{aciklama}</p>}
        {(ic != null || gosterilen != null) && (
          <p className="qt-kucuk gr-sayim">İçeride üretilen: <b>{ic ?? "—"}</b> · Gösterilen: <b>{gosterilen ?? "—"}</b>{elenen ? <> · Elenenler: {elenen}</> : null}</p>
        )}
        {zayif && <p className="qt-kucuk gr-zayif">Açık not: {zayif}</p>}
      </header>
      <BolumTur.Provider value={{ no, tur }}>
        <div className="gr-adaylar">{children}</div>
      </BolumTur.Provider>
      {tur === "dil" && (
        <div className="gr-dil">
          <div className="gr-karar" role="group" aria-label="Stil kararı">
            <QtDugme boyut="k" tur={durum[k]?.dil === "tamam" ? "birincil" : "ikincil"} aria-pressed={durum[k]?.dil === "tamam"}
                     onClick={() => guncelle(k, { dil: durum[k]?.dil === "tamam" ? null : "tamam" })}>Bu dil tamam</QtDugme>
            <QtDugme boyut="k" tur={durum[k]?.dil === "duzelt" ? "tehlike" : "ikincil"} aria-pressed={durum[k]?.dil === "duzelt"}
                     onClick={() => guncelle(k, { dil: durum[k]?.dil === "duzelt" ? null : "duzelt" })}>Düzeltme gerekli</QtDugme>
          </div>
          <textarea className="gr-not" rows={2} placeholder="Düzeltme notu" value={durum[k]?.not || ""}
                    onChange={(e) => guncelle(k, { not: e.target.value })} aria-label="Stil rehberi notu" />
        </div>
      )}
      {tur === "sec" && (
        <textarea className="gr-not" rows={2} placeholder={`Bölüm ${no} için not`} value={durum[k]?.not || ""}
                  onChange={(e) => guncelle(k, { not: e.target.value })} aria-label={`Bölüm ${no} notu`} />
      )}
    </section>
  );
}

/** Tek aday kartı: görsel (children) + Seç / Girsin-Girmesin + not + kalite kapısı sonuçları. */
export function GrAday({ kod, baslik, fikir, testler = {}, genis = false, children }) {
  const { no, tur } = useContext(BolumTur);
  const { durum, guncelle, kaydet } = useGrSecim();
  useEffect(() => { kaydet(`b${no}`, kod, baslik); }, [no, kod, baslik, kaydet]);
  const bk = `b${no}`;
  const ak = `b${no}:${kod}`;
  const secili = tur === "sec" ? durum[bk]?.sec === kod : durum[ak]?.karar;
  return (
    <article className={`gr-aday${genis ? " gr-aday--genis" : ""}${tur === "sec" && secili ? " gr-aday--secili" : ""}`}>
      <header className="gr-aday-bas">
        <h3 className="qt-baslik-3">{baslik}</h3>
        {tur === "sec" && secili && <span className="gr-rozet gr-rozet--sec">Seçildi</span>}
        {tur === "karar" && secili === "girsin" && <span className="gr-rozet gr-rozet--sec">Girsin</span>}
        {tur === "karar" && secili === "girmesin" && <span className="gr-rozet gr-rozet--hayir">Girmesin</span>}
      </header>
      {fikir && <p className="qt-kucuk gr-fikir">{fikir}</p>}
      <div className="gr-aday-gorsel">{children}</div>
      <ul className="gr-testler" aria-label="Kalite kapısı">
        {TEST_ADLARI.filter(([t]) => testler[t] !== undefined).map(([t, ad]) => (
          <li key={t} className={testler[t] === true ? "gr-test--gecti" : "gr-test--kaldi"}>{testler[t] === true ? "✓" : "✗"} {ad}{typeof testler[t] === "string" ? `: ${testler[t]}` : ""}</li>
        ))}
      </ul>
      {tur === "sec" && (
        <QtDugme boyut="k" tamGenislik tur={secili ? "birincil" : "ikincil"} ikon={secili ? "tik" : undefined} aria-pressed={!!secili}
                 onClick={() => guncelle(bk, { sec: secili ? null : kod })}>{secili ? "Seçildi" : "Seç"}</QtDugme>
      )}
      {tur === "karar" && (
        <div className="gr-karar" role="group" aria-label={`${baslik} kararı`}>
          <QtDugme boyut="k" tur={secili === "girsin" ? "birincil" : "ikincil"} aria-pressed={secili === "girsin"}
                   onClick={() => guncelle(ak, { karar: secili === "girsin" ? null : "girsin" })}>Girsin</QtDugme>
          <QtDugme boyut="k" tur={secili === "girmesin" ? "tehlike" : "ikincil"} aria-pressed={secili === "girmesin"}
                   onClick={() => guncelle(ak, { karar: secili === "girmesin" ? null : "girmesin" })}>Girmesin</QtDugme>
        </div>
      )}
      {tur !== "dil" && (
        <textarea className="gr-not gr-not--aday" rows={1} placeholder="Kısa not" value={durum[ak]?.not || ""}
                  onChange={(e) => guncelle(ak, { not: e.target.value })} aria-label={`${baslik} notu`} />
      )}
    </article>
  );
}

/** "Seçimlerimi kopyala" metni — bütün bölümler, seçimler, kararlar ve notlar. */
export function kopyaMetni(durum, adaylar, bolumler) {
  const satir = [`Quiz Tactics — Görsel revizyon seçimlerim (${new Date().toLocaleString("tr-TR")})`];
  for (const { no, baslik, tur } of bolumler) {
    const k = `b${no}`;
    const liste = adaylar[k] || [];
    satir.push("", `${no}. ${baslik.toLocaleUpperCase("tr-TR")}`);
    if (tur === "dil") satir.push(`Karar: ${durum[k]?.dil === "tamam" ? "Bu dil tamam" : durum[k]?.dil === "duzelt" ? "Düzeltme gerekli" : "—"}`);
    if (tur === "sec") {
      const s = liste.find((a) => a.kod === durum[k]?.sec);
      satir.push(`Seçim: ${s ? `${s.baslik} (${s.kod})` : "—"}`);
    }
    for (const a of liste) {
      const d = durum[`${k}:${a.kod}`] || {};
      if (tur === "karar") satir.push(`- ${a.baslik}: ${d.karar === "girsin" ? "GİRSİN" : d.karar === "girmesin" ? "GİRMESİN" : "karar yok"}${d.not ? ` — not: ${d.not}` : ""}`);
      else if (d.not) satir.push(`- ${a.baslik} notu: ${d.not}`);
    }
    if (durum[k]?.not) satir.push(`Bölüm notu: ${durum[k].not}`);
  }
  return satir.join("\n");
}
