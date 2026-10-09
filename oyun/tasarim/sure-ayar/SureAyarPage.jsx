// /sure-ayar — Düello + Ortak Hazine sunum sürelerinin ince ayarı (9 Eki 2026, Ida).
// Menüde yok; yalnız doğrudan adresle açılır, arama motorlarına kapalı (noindex + robots.txt).
// Seçimler YALNIZ BU TARAYICIDA (localStorage, lib/sureler.js); diğer oyuncular etkilenmez. "Seçimlerimi kopyala" tek JSON verir.
// "Bu süreyi dene": sahnenin gerçek bileşeni (varsa) seçili süreyle oynar; yoksa süre çubuğu gösterilir.
import { useEffect, useMemo, useRef, useState } from "react";
import { tt } from "../../lib/dil.js";
import { SURELER, sure, sureAyarla, sureleriSifirla, sureSecimleri, sureDinle, sureDeposuAcik, sureOlcek } from "../../lib/sureler.js";
import { KasaAcAni, KasaRakipKarar, KasaFinalSahnesi, KasaCifteBandi, KasaSavunmaAni } from "../../components/KasaEfekt.jsx";
import { BanGirisAni, BanAciklama } from "../../components/DuelloBanAni.jsx";
import { HakimiyetBasliyor } from "../../components/DuelloSecim.jsx";
import { CalmaAni } from "../../components/DuelloTahta.jsx";
import { QtDugme, QtKart, sinif } from "../index.js";
import "../../styles/kasa.css";
import "../../styles/duello-tahta.css";
import "./sure-ayar.css";

const c = (a, d) => tt(a, d);
const MODLAR = [["duello", "Düello"], ["kasa", "Ortak Hazine"]];
const snYaz = (ms) => `${(ms / 1000).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sn`;
const adim = (s) => (s.max - s.min > 2000 ? 50 : 10);

// Önizleme: anahtar → { sure (toplam ms), ciz(gecen ms, n) }
function onizleme(s) {
  const n = Date.now();
  switch (s.dene) {
    case "kasaAc": return { sure: sure("kasa_ac_an"), ciz: () => <KasaAcAni deger={12} benim seviye="dolu" olcek={sureOlcek("kasa_ac_an")} c={c} /> };
    case "kasaRakipKarar": {
      const kapali = sure("kasa_kapali_karar");
      return { sure: kapali + sure("kasa_devam_vurus"),
        ciz: (g) => <KasaRakipKarar asama={g < kapali ? "kapali" : "acik"} ac={false} deger={14} carpan="×2" c={c} /> };
    }
    case "kasaFinal": return { sure: sure("kasa_final_sahne"), ciz: () => <KasaFinalSahnesi kazandim puanOnce={66} puanSonra={80} hedef={80} deger={14} c={c} /> };
    case "kasaKapanis": return { sure: sure("kasa_final_kapanis"), ciz: () => <KasaFinalSahnesi kazandim={false} puanOnce={31} puanSonra={31} hedef={80} deger={14} c={c} /> };
    case "kasaCifte": return { sure: sure("kasa_cifte"), ciz: () => <div className="sa-ks-mac"><KasaCifteBandi artis={6} c={c} /></div> };
    case "kasaSavunma": return { sure: sure("kasa_savunma"), ciz: () => <div className="sa-ks-mac"><KasaSavunmaAni tip="tetik" benim c={c} /></div> };
    case "banGiris": return { sure: sure("duello_ban_giris"), ciz: () => <BanGirisAni anahtar={`sa-${n}`} tur={3} maxTur={10} c={c} /> };
    case "banAciklama": case "banSira":
      return { sure: sure("duello_ban_aciklama") + sure("duello_ban_sira"), ciz: () => <BanAciklama anahtar={`sa-${n}`} benSaldiran kategori="tarih" c={c} /> };
    case "banOnay": return { sure: sure("duello_ban_onay"), ciz: () => <BanAciklama anahtar={`sa-${n}`} benSaldiran={false} kategori="tarih" c={c} /> };
    case "banBilgi": return { sure: sure("duello_ban_bilgi"), ciz: () => <BanAciklama anahtar={`sa-${n}`} benSaldiran={false} kategori={null} c={c} /> };
    case "banSiraBilgi": return { sure: sure("duello_ban_sira_bilgi"), ciz: () => <BanAciklama anahtar={`sa-${n}`} benSaldiran kategori={null} c={c} /> };
    case "hakimiyet": return { sure: sure("duello_hakimiyet_gecis"), ciz: () => <HakimiyetBasliyor hk={{ benY: 5, rakipY: 5, puan: true, hedef: 12, yol: 4 }} c={c} /> };
    case "calma": {
      const inis = Math.round(820 * sureOlcek("duello_calma"));
      return { sure: sure("duello_calma"), ciz: (g) => <CalmaAni kat="tarih" once="rakip" sonra="ben" inis={g >= inis} c={c} /> };
    }
    default: return { sure: sure(s.anahtar), genel: true, ciz: () => <div className="sa-genel"><b>{s.baslik}</b><span>{snYaz(sure(s.anahtar))}</span></div> };
  }
}

function Sahne({ deneme, bitti }) {
  const [gecen, setGecen] = useState(0);
  const t0 = useRef(performance.now());
  useEffect(() => {
    let r = 0;
    const tur = () => {
      const g = performance.now() - t0.current;
      setGecen(g);
      if (g >= deneme.sure) { bitti(Math.round(g)); return; }
      r = requestAnimationFrame(tur);
    };
    r = requestAnimationFrame(tur);
    return () => cancelAnimationFrame(r);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="sa-sahne" role="status" aria-live="polite" onClick={() => bitti(Math.round(gecen), true)}>
      <div className="sa-sahne-ic">{deneme.ciz(gecen)}</div>
      <div className="sa-sahne-alt">
        <span>{deneme.baslik}</span>
        <i className="sa-cubuk"><i style={{ width: `${Math.min(100, (gecen / deneme.sure) * 100)}%` }} /></i>
        <small>{snYaz(Math.min(gecen, deneme.sure))} / {snYaz(deneme.sure)}{deneme.genel ? " · süre çubuğu" : ""}</small>
      </div>
    </div>
  );
}

export default function SureAyarPage() {
  const [mod, setMod] = useState("duello");
  const [, yenile] = useState(0);
  const [deneme, setDeneme] = useState(null);
  const [son, setSon] = useState(null);   // son denemenin ölçülen süresi
  const [kopyaDurum, setKopyaDurum] = useState(null);
  const depoAcik = useMemo(() => sureDeposuAcik(), []);

  useEffect(() => sureDinle(() => yenile((x) => x + 1)), []);
  // Arama motorlarına kapalı (robots.txt'e ek olarak)
  useEffect(() => {
    let m = null;
    try {
      m = document.createElement("meta");
      m.name = "robots";
      m.content = "noindex, nofollow";
      document.head.appendChild(m);
    } catch { /* yalnız sunum */ }
    const eskiBaslik = document.title;
    document.title = "Süre ayarı";
    return () => { try { m?.remove(); document.title = eskiBaslik; } catch { /* yok */ } };
  }, []);

  const secimler = sureSecimleri();
  const liste = SURELER.filter((s) => s.mod === mod || s.mod === "ortak");
  const degisenSayi = Object.keys(secimler).length;

  const dene = (s) => { setSon(null); setDeneme({ ...onizleme(s), baslik: s.baslik, anahtar: s.anahtar, id: Date.now() }); };
  const kopyala = async () => {
    const metin = JSON.stringify({ sure_ayar: secimler, tarih: new Date().toISOString().slice(0, 10) }, null, 1);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaDurum("ok");
    } catch {
      setKopyaDurum(metin);   // pano kapalı: metni seçilebilir göster
    }
  };

  return (
    <main className="sa-sayfa">
      <header className="sa-bas">
        <h1>Süre ayarı</h1>
        <p>Düello ve Ortak Hazine geçiş/animasyon süreleri. Seçimler <b>yalnız bu tarayıcıda</b> geçerli; diğer oyuncular etkilenmez.</p>
        {!depoAcik && <p className="sa-uyari" role="alert">Tarayıcı depolaması kapalı: seçimler yalnız bu sekme açıkken geçerli, sayfayı yenileyince bugünkü değerlere döner.</p>}
        <div className="sa-eylem">
          <QtDugme tur="birincil" ikon="kopyala" onClick={kopyala}>Seçimlerimi kopyala{degisenSayi ? ` (${degisenSayi})` : ""}</QtDugme>
          <QtDugme tur="hayalet" devreDisi={!degisenSayi} onClick={() => { sureleriSifirla(); setKopyaDurum(null); }}>Hepsini sıfırla</QtDugme>
        </div>
        {kopyaDurum === "ok" && <p className="sa-not" role="status">Kopyalandı — sohbete yapıştırabilirsin.</p>}
        {kopyaDurum && kopyaDurum !== "ok" && <textarea className="sa-json" readOnly value={kopyaDurum} onFocus={(e) => e.target.select()} aria-label="Seçimler (JSON)" />}
        <div className="sa-sekme" role="tablist">
          {MODLAR.map(([k, ad]) => (
            <button key={k} type="button" role="tab" aria-selected={mod === k} className={sinif("sa-sekme-d", mod === k && "sa-sekme-d--acik")} onClick={() => setMod(k)}>{ad}</button>
          ))}
        </div>
      </header>

      <ul className="sa-liste">
        {liste.map((s) => {
          const deger = sure(s.anahtar);
          const degisti = deger !== s.varsayilan;
          return (
            <li key={s.anahtar}>
              <QtKart dolgu="o" className={sinif("sa-kart", degisti && "sa-kart--degisti")}>
                <div className="sa-kart-bas">
                  <h2>{s.baslik}{s.mod === "ortak" && <small> · ortak</small>}</h2>
                  <output className="sa-deger qt-sayi" htmlFor={`sa-${s.anahtar}`}>{snYaz(deger)}<small>{deger} ms</small></output>
                </div>
                <p className="sa-aciklama">{s.aciklama}</p>
                {s.not && <p className="sa-sinir">{s.not}</p>}
                <input id={`sa-${s.anahtar}`} className="sa-kaydirici" type="range" min={s.min} max={s.max} step={adim(s)} value={deger}
                       aria-label={`${s.baslik} (ms)`} onChange={(e) => sureAyarla(s.anahtar, Number(e.target.value))} />
                <div className="sa-olcek"><span>{snYaz(s.min)}</span><span>bugünkü {snYaz(s.varsayilan)}</span><span>{snYaz(s.max)}</span></div>
                <div className="sa-kart-eylem">
                  <QtDugme tur="ikincil" boyut="k" devreDisi={!degisti} onClick={() => sureAyarla(s.anahtar, null)}>Bugünkü değere dön</QtDugme>
                  <QtDugme tur="mavi" boyut="k" ikon="oyna" onClick={() => dene(s)}>Bu süreyi dene</QtDugme>
                </div>
                {son?.anahtar === s.anahtar && <p className="sa-not" role="status">Ölçülen: {snYaz(son.ms)}{son.erken ? " (dokunarak kesildi)" : ""}</p>}
              </QtKart>
            </li>
          );
        })}
      </ul>

      {deneme && <Sahne key={deneme.id} deneme={deneme} bitti={(ms, erken) => { setSon({ anahtar: deneme.anahtar, ms, erken }); setDeneme(null); }} />}
    </main>
  );
}
